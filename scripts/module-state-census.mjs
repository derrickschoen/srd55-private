#!/usr/bin/env node

import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const REPORT_VERSION = 1;
const DEFAULT_REPORT = 'reports/module-state-census.json';
const MODULE_ROOTS = ['src', 'tests/helpers', 'db'];
const TEST_SUFFIXES = ['.test.ts', '.live-test.ts'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.mts', '.cts', '.js', '.mjs', '.cjs'];
const RESOURCE_EXTENSIONS = new Set([
  '.css',
  '.html',
  '.json',
  '.md',
  '.sql',
  '.svg',
  '.txt',
]);

const root = resolve(option('--root') ?? process.cwd());
const reportPath = resolve(root, option('--report') ?? DEFAULT_REPORT);

function option(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} requires a value`);
  }
  return value;
}

function posixPath(path) {
  return path.split(sep).join('/');
}

function repositoryPath(path) {
  return posixPath(relative(root, path));
}

function sha256(content) {
  return createHash('sha256').update(content).digest('hex');
}

function filesBelow(directory) {
  if (!existsSync(directory)) return [];
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...filesBelow(path));
    else if (entry.isFile()) files.push(path);
  }
  return files;
}

function isTestFile(path) {
  return TEST_SUFFIXES.some((suffix) => path.endsWith(suffix));
}

function isCensusedModule(path) {
  const name = repositoryPath(path);
  return MODULE_ROOTS.some((moduleRoot) =>
    name === moduleRoot || name.startsWith(`${moduleRoot}/`));
}

function scriptKind(path) {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function sourceFile(path, content) {
  return ts.createSourceFile(
    path,
    content,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(path),
  );
}

function runtimeSpecifiers(source) {
  const specifiers = [];
  let hasUnclassifiableImport = false;
  const add = (node) => {
    if (ts.isStringLiteralLike(node)) specifiers.push(node.text);
    else hasUnclassifiableImport = true;
  };

  const visit = (node) => {
    if (ts.isImportDeclaration(node)) {
      const clause = node.importClause;
      const allNamedBindingsAreTypes =
        clause?.namedBindings !== undefined &&
        ts.isNamedImports(clause.namedBindings) &&
        clause.namedBindings.elements.length > 0 &&
        clause.namedBindings.elements.every((element) => element.isTypeOnly);
      if (clause?.isTypeOnly !== true && !allNamedBindingsAreTypes) {
        add(node.moduleSpecifier);
      }
    } else if (ts.isExportDeclaration(node)) {
      if (!node.isTypeOnly && node.moduleSpecifier !== undefined) {
        add(node.moduleSpecifier);
      }
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments.length === 1
    ) {
      add(node.arguments[0]);
    } else if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === 'glob' &&
      ts.isPropertyAccessExpression(node.expression.expression) &&
      ts.isMetaProperty(node.expression.expression.expression)
    ) {
      // A glob expands to modules not represented by an ordinary import edge.
      // Treat the owning graph as unknown instead of attempting to duplicate
      // Vite's glob semantics here.
      hasUnclassifiableImport = true;
    } else if (
      ts.isNewExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === 'URL' &&
      node.arguments?.length === 2 &&
      ts.isStringLiteralLike(node.arguments[0])
    ) {
      add(node.arguments[0]);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return { specifiers: [...new Set(specifiers)], hasUnclassifiableImport };
}

function resolvedLocalModule(importer, rawSpecifier) {
  if (!rawSpecifier.startsWith('.')) return { kind: 'external' };
  const specifier = rawSpecifier.split('?')[0].split('#')[0];
  if (specifier === '') return { kind: 'unresolved' };
  const initial = resolve(dirname(importer), specifier);
  const extension = extname(initial);
  if (RESOURCE_EXTENSIONS.has(extension)) return { kind: 'resource' };

  const candidates = [];
  if (SOURCE_EXTENSIONS.includes(extension)) {
    candidates.push(initial);
    if (extension === '.js' || extension === '.mjs' || extension === '.cjs') {
      candidates.push(initial.slice(0, -extension.length) + '.ts');
      candidates.push(initial.slice(0, -extension.length) + '.tsx');
    }
  } else {
    for (const candidateExtension of SOURCE_EXTENSIONS) {
      candidates.push(initial + candidateExtension);
    }
    for (const candidateExtension of SOURCE_EXTENSIONS) {
      candidates.push(resolve(initial, `index${candidateExtension}`));
    }
  }
  const found = candidates.find((candidate) =>
    existsSync(candidate) && statSync(candidate).isFile());
  return found === undefined
    ? { kind: 'unresolved' }
    : { kind: 'module', path: found };
}

function unwrap(expression) {
  let current = expression;
  while (
    ts.isAsExpression(current) ||
    ts.isTypeAssertionExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isNonNullExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function isPrimitiveExpression(expression) {
  const node = unwrap(expression);
  if (
    ts.isStringLiteralLike(node) ||
    ts.isNumericLiteral(node) ||
    ts.isBigIntLiteral(node) ||
    node.kind === ts.SyntaxKind.TrueKeyword ||
    node.kind === ts.SyntaxKind.FalseKeyword ||
    node.kind === ts.SyntaxKind.NullKeyword
  ) return true;
  if (ts.isIdentifier(node)) {
    return ['undefined', 'NaN', 'Infinity'].includes(node.text);
  }
  if (ts.isPrefixUnaryExpression(node)) {
    return isPrimitiveExpression(node.operand);
  }
  if (ts.isBinaryExpression(node)) {
    return isPrimitiveExpression(node.left) && isPrimitiveExpression(node.right);
  }
  if (ts.isConditionalExpression(node)) {
    return isPrimitiveExpression(node.whenTrue) &&
      isPrimitiveExpression(node.whenFalse) &&
      isPrimitiveExpression(node.condition);
  }
  if (ts.isTemplateExpression(node)) {
    return node.templateSpans.every((span) => isPrimitiveExpression(span.expression));
  }
  if (
    ts.isPropertyAccessExpression(node) &&
    ts.isIdentifier(node.expression) &&
    node.expression.text === 'Math'
  ) return true;
  return false;
}

function isDeeplyFreezable(expression) {
  const node = unwrap(expression);
  if (isPrimitiveExpression(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) {
    return true;
  }
  if (ts.isArrayLiteralExpression(node)) {
    return node.elements.every((element) =>
      !ts.isSpreadElement(element) && isDeeplyFreezable(element));
  }
  if (ts.isObjectLiteralExpression(node)) {
    return node.properties.every((property) => {
      if (ts.isPropertyAssignment(property)) {
        return isDeeplyFreezable(property.initializer);
      }
      return ts.isMethodDeclaration(property) ||
        ts.isGetAccessorDeclaration(property) ||
        ts.isSetAccessorDeclaration(property);
    });
  }
  return isFrozenExpression(node);
}

function isFrozenExpression(expression) {
  const node = unwrap(expression);
  return ts.isCallExpression(node) &&
    ts.isPropertyAccessExpression(node.expression) &&
    ts.isIdentifier(node.expression.expression) &&
    node.expression.expression.text === 'Object' &&
    node.expression.name.text === 'freeze' &&
    node.arguments.length === 1 &&
    isDeeplyFreezable(node.arguments[0]);
}

function isSafeConstInitializer(expression) {
  const node = unwrap(expression);
  return isPrimitiveExpression(node) ||
    ts.isArrowFunction(node) ||
    ts.isFunctionExpression(node) ||
    ts.isClassExpression(node) ||
    isFrozenExpression(node);
}

function declarationIsExported(statement) {
  return statement.modifiers?.some((modifier) =>
    modifier.kind === ts.SyntaxKind.ExportKeyword) === true;
}

function topLevelBindingNames(declaration) {
  return ts.isIdentifier(declaration.name) ? [declaration.name.text] : [];
}

function referencesFor(source, name, declarationName) {
  const references = [];
  const visit = (node) => {
    if (ts.isIdentifier(node) && node.text === name && node !== declarationName) {
      references.push(node);
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return references;
}

function nearestFunction(node) {
  let current = node.parent;
  while (current !== undefined && !ts.isSourceFile(current)) {
    if (ts.isFunctionLike(current)) return current;
    current = current.parent;
  }
  return undefined;
}

function collectionCacheCandidate(source, statement, declaration, initializer) {
  const node = unwrap(initializer);
  if (
    !ts.isIdentifier(declaration.name) ||
    declarationIsExported(statement) ||
    !ts.isNewExpression(node) ||
    !ts.isIdentifier(node.expression) ||
    !['Map', 'WeakMap'].includes(node.expression.text)
  ) return false;

  const references = referencesFor(source, declaration.name.text, declaration.name);
  let writes = 0;
  const cacheOnlyReferences = references.every((reference) => {
    const access = reference.parent;
    if (!ts.isPropertyAccessExpression(access) || access.expression !== reference) return false;
    if (!['get', 'has', 'set'].includes(access.name.text)) return false;
    const call = access.parent;
    if (!ts.isCallExpression(call) || call.expression !== access) return false;
    if (access.name.text === 'set') {
      writes += 1;
      return call.arguments.length === 2 && nearestFunction(call) !== undefined;
    }
    return call.arguments.length === 1;
  });
  return cacheOnlyReferences &&
    (writes === 0 || /(?:cache|cached|memo)/iu.test(declaration.name.text));
}

function lazyMemoCandidate(source, statement, declaration) {
  if (
    !ts.isIdentifier(declaration.name) ||
    declarationIsExported(statement) ||
    !/(?:cache|cached|memo)/iu.test(declaration.name.text) ||
    (declaration.initializer !== undefined &&
      !['undefined', 'null'].includes(unwrap(declaration.initializer).getText(source)))
  ) return false;

  const references = referencesFor(source, declaration.name.text, declaration.name);
  let writes = 0;
  for (const reference of references) {
    const parent = reference.parent;
    if (
      ts.isBinaryExpression(parent) &&
      parent.left === reference &&
      parent.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      if (nearestFunction(parent) === undefined) return false;
      writes += 1;
      continue;
    }
    if (
      ts.isPrefixUnaryExpression(parent) ||
      ts.isPostfixUnaryExpression(parent) ||
      (ts.isBinaryExpression(parent) && parent.left === reference)
    ) return false;
  }
  return writes > 0;
}

function classHasMutableStaticField(statement) {
  return statement.members.some((member) => {
    const isStatic = member.modifiers?.some((modifier) =>
      modifier.kind === ts.SyntaxKind.StaticKeyword) === true;
    if (!isStatic) return false;
    if (ts.isMethodDeclaration(member) || ts.isGetAccessorDeclaration(member)) return false;
    if (ts.isPropertyDeclaration(member)) {
      const isReadonly = member.modifiers?.some((modifier) =>
        modifier.kind === ts.SyntaxKind.ReadonlyKeyword) === true;
      return !isReadonly ||
        (member.initializer !== undefined && !isSafeConstInitializer(member.initializer));
    }
    return true;
  });
}

function mutatingTopLevelExpression(statement) {
  if (!ts.isExpressionStatement(statement)) return false;
  const expression = unwrap(statement.expression);
  if (
    ts.isBinaryExpression(expression) ||
    ts.isPrefixUnaryExpression(expression) ||
    ts.isPostfixUnaryExpression(expression)
  ) return true;
  if (!ts.isCallExpression(expression)) return false;
  const called = expression.expression;
  const name = ts.isIdentifier(called)
    ? called.text
    : ts.isPropertyAccessExpression(called)
      ? called.name.text
      : '';
  return /^(?:addEventListener|on|once|register|subscribe)$/u.test(name);
}

function classify(path, content) {
  const source = sourceFile(path, content);
  let sawCache = false;
  let sawUnknown = false;
  let sawStateful = false;

  for (const statement of source.statements) {
    if (
      ts.isImportDeclaration(statement) ||
      ts.isExportDeclaration(statement) ||
      ts.isImportEqualsDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isFunctionDeclaration(statement) ||
      ts.isEmptyStatement(statement)
    ) continue;

    if (ts.isClassDeclaration(statement)) {
      if (classHasMutableStaticField(statement)) sawStateful = true;
      continue;
    }

    if (ts.isVariableStatement(statement)) {
      const isConst = (statement.declarationList.flags & ts.NodeFlags.Const) !== 0;
      for (const declaration of statement.declarationList.declarations) {
        const names = topLevelBindingNames(declaration);
        if (names.length === 0) {
          sawUnknown = true;
          continue;
        }
        if (
          declaration.initializer !== undefined &&
          collectionCacheCandidate(source, statement, declaration, declaration.initializer)
        ) {
          sawCache = true;
          continue;
        }
        if (!isConst && lazyMemoCandidate(source, statement, declaration)) {
          sawCache = true;
          continue;
        }
        if (!isConst) {
          sawStateful = true;
          continue;
        }
        if (
          declaration.initializer !== undefined &&
          isSafeConstInitializer(declaration.initializer)
        ) continue;

        const initializer = declaration.initializer === undefined
          ? undefined
          : unwrap(declaration.initializer);
        if (initializer !== undefined && ts.isNewExpression(initializer)) {
          sawStateful = true;
        } else {
          sawUnknown = true;
        }
      }
      continue;
    }

    if (mutatingTopLevelExpression(statement)) {
      sawStateful = true;
      continue;
    }

    // Enums, namespaces, top-level calls, assignments, and syntax the census
    // does not prove immutable are deliberately fail-closed.
    sawUnknown = true;
  }

  if (sawStateful) return 'STATEFUL';
  if (sawUnknown) return 'UNKNOWN';
  if (sawCache) return 'IDEMPOTENT-CACHE';
  return 'PURE';
}

const testFiles = filesBelow(resolve(root, 'tests'))
  .filter(isTestFile)
  .sort((left, right) => repositoryPath(left).localeCompare(repositoryPath(right)));
const modules = new Map();
const tests = {};

function readModule(path) {
  const existing = modules.get(path);
  if (existing !== undefined) return existing;
  const content = readFileSync(path, 'utf8');
  const record = {
    content,
    dependencies: [],
    unresolved: [],
  };
  modules.set(path, record);
  const source = sourceFile(path, content);
  const imports = runtimeSpecifiers(source);
  if (imports.hasUnclassifiableImport) record.unresolved.push('<dynamic import>');
  for (const specifier of imports.specifiers) {
    const resolved = resolvedLocalModule(path, specifier);
    if (resolved.kind === 'module') record.dependencies.push(resolved.path);
    else if (resolved.kind === 'unresolved') record.unresolved.push(specifier);
  }
  record.dependencies.sort((left, right) =>
    repositoryPath(left).localeCompare(repositoryPath(right)));
  return record;
}

for (const testFile of testFiles) {
  const testContent = readFileSync(testFile, 'utf8');
  const testSource = sourceFile(testFile, testContent);
  const pending = [];
  const unsafeDependencies = [];
  const unresolved = [];
  const testImports = runtimeSpecifiers(testSource);
  if (testImports.hasUnclassifiableImport) {
    unresolved.push(`${repositoryPath(testFile)} -> <dynamic import>`);
  }
  for (const specifier of testImports.specifiers) {
    const resolved = resolvedLocalModule(testFile, specifier);
    if (resolved.kind === 'module') pending.push(resolved.path);
    else if (resolved.kind === 'unresolved') {
      unresolved.push(`${repositoryPath(testFile)} -> ${specifier}`);
    }
  }

  const visited = new Set();
  while (pending.length > 0) {
    const modulePath = pending.pop();
    if (visited.has(modulePath)) continue;
    visited.add(modulePath);
    const record = readModule(modulePath);
    if (!isCensusedModule(modulePath)) {
      unsafeDependencies.push(repositoryPath(modulePath));
    }
    for (const specifier of record.unresolved) {
      unresolved.push(`${repositoryPath(modulePath)} -> ${specifier}`);
    }
    pending.push(...record.dependencies);
  }

  tests[repositoryPath(testFile)] = {
    sha256: sha256(testContent),
    modules: [...visited]
      .filter(isCensusedModule)
      .map(repositoryPath)
      .sort(),
    unsafeDependencies: [...new Set(unsafeDependencies)].sort(),
    unresolved: [...new Set(unresolved)].sort(),
  };
}

const moduleReport = {};
for (const [path, record] of [...modules.entries()]
  .filter(([path]) => isCensusedModule(path))
  .sort(([left], [right]) => repositoryPath(left).localeCompare(repositoryPath(right)))) {
  moduleReport[repositoryPath(path)] = {
    class: classify(path, record.content),
    sha256: sha256(record.content),
  };
}

const report = {
  version: REPORT_VERSION,
  moduleRoots: MODULE_ROOTS,
  modules: moduleReport,
  tests,
};
mkdirSync(dirname(reportPath), { recursive: true });
const temporary = `${reportPath}.${process.pid}.partial`;
writeFileSync(temporary, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
renameSync(temporary, reportPath);

const counts = Object.values(moduleReport).reduce((totals, module) => {
  totals[module.class] += 1;
  return totals;
}, { PURE: 0, 'IDEMPOTENT-CACHE': 0, STATEFUL: 0, UNKNOWN: 0 });
console.log(
  `[module-state-census] ${Object.keys(moduleReport).length} modules; ` +
  `PURE=${counts.PURE} IDEMPOTENT-CACHE=${counts['IDEMPOTENT-CACHE']} ` +
  `STATEFUL=${counts.STATEFUL} UNKNOWN=${counts.UNKNOWN}`,
);
console.log(`[module-state-census] wrote ${repositoryPath(reportPath)}`);
