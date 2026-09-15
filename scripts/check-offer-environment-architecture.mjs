#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const ROOT = process.cwd();
const BUILDER_PATH = 'src/vtt/offers/build-offer-environment.ts';
const QUERY_PORT_PATH = 'src/vtt/engine-query-port.ts';
const ENVIRONMENT_PROPERTIES = [
  'queries',
  'familyPolicy',
  'partyThreatCatalog',
  'binding',
  'digest',
];
const TRANSITIONAL_RUNTIME_EXPORTS = new Set([
  `${BUILDER_PATH}:buildOfferEnvironment`,
  'src/vtt/offers/offer-environment.ts:createEngineOptionEnvironment',
  'src/vtt/offers/offer-environment.ts:createLegacyEngineOptionEnvironment',
  'src/vtt/offers/offer-environment.ts:createRevisionBoundEngineOptionEnvironment',
  'src/vtt/offers/offer-environment.ts:engineOptionEnvironmentFromBinding',
  'src/vtt/mcp/entrypoint.ts:reconstructLauncherOfferEnvironment',
]);
const ACTIVE_CJS_ORIGIN_FIXTURES = [
  'canonical-require-direct.cts',
  'canonical-require-destructured.cts',
  'canonical-create-require-computed.mts',
  'canonical-require-computed.cts',
  'canonical-import-equals.cts',
  'canonical-commonjs-reexport.cts',
  'canonical-commonjs-named-reexport.cts',
  'canonical-dynamic-import.mts',
  'canonical-star-export.mts',
];
const STAGED_REAL_SYMBOL_FIXTURES = Object.freeze({
  'required-surfaces': [
    constructorFixture(
      'round-session-missing-environment.ts',
      'src/vtt/engine-round-session',
      'EngineRoundSession',
      'args[0], args[1], args[2]',
    ),
    constructorOptionsFixture(
      'dm-host-missing-environment.ts',
      'src/vtt/dm-encounter-host',
      'DmEncounterHost',
      2,
      'args[0], args[1], withoutEnvironment',
    ),
    callFixture(
      'human-options-missing-environment.ts',
      'src/vtt/encounter-board-projection',
      'projectHumanEngineOptions',
      'args[0], args[1], args[2]',
    ),
    propertyFixture(
      'dm-projector-missing-environment.ts',
      'src/vtt/encounter-projections',
      'projectDmBoard',
      0,
      'withoutEnvironment',
    ),
    callFixture(
      'offered-actors-missing-environment.ts',
      'src/vtt/offered-option-paths',
      'offeredOptionActorsForState',
      'args[0], args[1]',
    ),
    callFixture(
      'offered-paths-missing-environment.ts',
      'src/vtt/offered-option-paths',
      'offeredOptionPaths',
      'args[0], args[1]',
    ),
    propertyFixture(
      'mcp-runtime-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'createEngineMcpRuntime',
      1,
      'args[0], withoutEnvironment',
    ),
    callFixture(
      'mcp-handler-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'createEngineMcpHandler',
      'args[0]',
    ),
    callFixture(
      'mcp-request-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'handleMcpRequest',
      'args[0], args[1]',
    ),
    callFixture(
      'mcp-server-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'runEngineMcpServer',
      'args[0]',
    ),
    callFixture(
      'mcp-lines-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'runEngineMcpLines',
      'args[0], args[1]',
    ),
  ],
  resolver: [
    callFixture(
      'available-options-missing-environment.ts',
      'src/vtt/intent-resolver',
      'availableEngineActorOptions',
      'args[0], args[1]',
    ),
    callFixture(
      'resolver-factory-missing-environment.ts',
      'src/vtt/intent-resolver',
      'createPureTurnProposalResolver',
      '',
    ),
    propertyFixture(
      'materiality-context-missing-environment.ts',
      'src/vtt/plan-materiality',
      'createPlanRelevanceRecord',
      0,
      'withoutEnvironment',
    ),
    callFixture(
      'scenario-menu-missing-environment.ts',
      'src/vtt/speculative-planning',
      'buildHostScenarioMenu',
      'args[0], args[1], args[2]',
    ),
    methodFixture(
      'baseline-planner-missing-environment.ts',
      'src/vtt/speculative-planning',
      'hostBaselineProposalPlanner',
      'plan',
      'args[0], args[1]',
    ),
    callFixture(
      'team-score-missing-environment.ts',
      'src/vtt/intel/team-scorer',
      'scoreTeamPlans',
      'args[0], args[1]',
    ),
  ],
  'final-query': [
    callFixture(
      'scenario-fact-missing-queries.ts',
      'src/vtt/speculative-planning',
      'evaluateScenarioFact',
      'args[0], args[1]',
    ),
    callFixture(
      'proposal-facts-missing-queries.ts',
      'src/vtt/speculative-planning',
      'extractProposalFactDependencies',
      'args[0], args[1]',
    ),
    callFixture(
      'player-flip-missing-queries.ts',
      'src/vtt/speculative-planning',
      'canPlayerFlipScenarioFact',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'host-split-missing-queries.ts',
      'src/vtt/speculative-planning',
      'computeHostSplitCandidates',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'host-scenarios-missing-queries.ts',
      'src/vtt/speculative-planning',
      'evaluateHostScenarios',
      'args[0], args[1]',
    ),
    callFixture(
      'allocation-missing-environment.ts',
      'src/vtt/engine-query-port',
      'compareTacticalAllocations',
      'args[0], args[1], args[2], args[3]',
    ),
    callFixture(
      'arena-token-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaTokenPosition',
      'args[0], args[1]',
    ),
    callFixture(
      'arena-combatant-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaCombatant',
      'args[0], args[1]',
    ),
    callFixture(
      'arena-side-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaSameSide',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'arena-target-missing-queries.ts',
      'src/vtt/arena-legality',
      'resolveArenaTarget',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'arena-actions-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaMonsterActions',
      'args[0], args[1]',
    ),
    callFixture(
      'arena-plan-missing-queries.ts',
      'src/vtt/arena-legality',
      'validateArenaPlan',
      'args[0], args[1]',
    ),
    propertyFixture(
      'blind-input-missing-environment.ts',
      'src/vtt/blind-intent-resolver',
      'resolveBlindRoundIntents',
      0,
      'withoutEnvironment',
    ),
    propertyFixture(
      'legendary-input-missing-queries.ts',
      'src/vtt/intel/legendary-windows',
      'provideLegendaryWindows',
      0,
      'withoutEnvironment',
      'queries',
    ),
  ],
});
const STAGED_FORMAT_FIXTURES = Object.freeze({
  'offers-format-env-retyped.ts':
    "export type Retyped = 'engine-option-environment-v1'; // RETYPED\n",
  'offers-format-policy-retyped.ts':
    "export type Retyped = 'engine-offer-family-policy-v1'; // RETYPED\n",
  'offers-format-catalog-retyped.ts':
    "export type Retyped = 'party-threat-catalog-v1'; // RETYPED\n",
  'offers-format-imported.ts':
    "import { ENGINE_OFFER_FAMILY_POLICY_FORMAT, ENGINE_OPTION_ENVIRONMENT_FORMAT, " +
    "PARTY_THREAT_CATALOG_FORMAT } from '../src/vtt/offers/offer-codec-primitives';\n" +
    'void ENGINE_OFFER_FAMILY_POLICY_FORMAT;\n' +
    'void ENGINE_OPTION_ENVIRONMENT_FORMAT;\n' +
    'void PARTY_THREAT_CATALOG_FORMAT;\n',
});

function sourceImport(modulePath, symbol) {
  return `import { ${symbol} } from '../${modulePath}';\n`;
}

function callFixture(name, modulePath, symbol, omittedArguments) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: Parameters<typeof ${symbol}>;\n` +
      `${symbol}(${omittedArguments}); // OMITTED\n` +
      `${symbol}(...args); // SUPPLIED\n`,
  };
}

function constructorFixture(name, modulePath, symbol, omittedArguments) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: ConstructorParameters<typeof ${symbol}>;\n` +
      `new ${symbol}(${omittedArguments}); // OMITTED\n` +
      `new ${symbol}(...args); // SUPPLIED\n`,
  };
}

function propertyFixture(
  name,
  modulePath,
  symbol,
  parameterIndex,
  omittedArguments,
  property = 'offerEnvironment',
) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: Parameters<typeof ${symbol}>;\n` +
      `const { ${property}: omitted, ...withoutEnvironment } = args[${String(parameterIndex)}];\n` +
      'void omitted;\n' +
      `${symbol}(${omittedArguments}); // OMITTED\n` +
      `${symbol}(...args); // SUPPLIED\n`,
  };
}

function constructorOptionsFixture(
  name,
  modulePath,
  symbol,
  parameterIndex,
  omittedArguments,
) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: ConstructorParameters<typeof ${symbol}>;\n` +
      `const { offerEnvironment: omitted, ...withoutEnvironment } = args[${String(parameterIndex)}];\n` +
      'void omitted;\n' +
      `new ${symbol}(${omittedArguments}); // OMITTED\n` +
      `new ${symbol}(...args); // SUPPLIED\n`,
  };
}

function methodFixture(name, modulePath, symbol, method, omittedArguments) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: Parameters<typeof ${symbol}.${method}>;\n` +
      `${symbol}.${method}(${omittedArguments}); // OMITTED\n` +
      `${symbol}.${method}(...args); // SUPPLIED\n`,
  };
}

function relative(fileName) {
  return path.relative(ROOT, fileName).split(path.sep).join('/');
}

function compilerOptions(configName) {
  const configPath = path.join(ROOT, configName);
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
  }
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, ROOT);
  return {
    ...parsed.options,
    incremental: false,
    noEmit: true,
  };
}

function productionFiles() {
  return ts.sys.readDirectory(
    ROOT,
    ['.ts', '.tsx', '.cts', '.mts'],
    ['node_modules', '.git'],
    ['src/**/*', 'tools/**/*', 'tests/**/*'],
  );
}

function createProgram(rootNames, options, virtualSources = new Map()) {
  const normalized = new Map(
    [...virtualSources].map(([fileName, source]) => [path.resolve(fileName), source]),
  );
  const host = ts.createCompilerHost(options);
  const baseFileExists = host.fileExists.bind(host);
  const baseReadFile = host.readFile.bind(host);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => normalized.has(path.resolve(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) => normalized.get(path.resolve(fileName)) ?? baseReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = normalized.get(path.resolve(fileName));
    if (source !== undefined) {
      return ts.createSourceFile(fileName, source, languageVersion, true);
    }
    return baseGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  return ts.createProgram({
    rootNames,
    options,
    host,
  });
}

function isEnvironmentType(checker, type) {
  return ENVIRONMENT_PROPERTIES.every((name) => checker.getPropertyOfType(type, name) !== undefined);
}

function exportedValueType(checker, symbol, sourceFile) {
  let target = symbol;
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    target = checker.getAliasedSymbol(symbol);
  }
  const declaration = target.valueDeclaration ?? target.declarations?.[0] ?? sourceFile;
  return checker.getTypeOfSymbolAtLocation(target, declaration);
}

function typeExposesEnvironmentConstructor(checker, type, seen = new Set()) {
  if (seen.has(type) || seen.size > 100) return false;
  seen.add(type);
  const signatures = [
    ...checker.getSignaturesOfType(type, ts.SignatureKind.Call),
    ...checker.getSignaturesOfType(type, ts.SignatureKind.Construct),
  ];
  if (isEnvironmentType(checker, type) ||
    signatures.some((signature) => isEnvironmentType(checker, signature.getReturnType()))) {
    return true;
  }
  return checker.getPropertiesOfType(type).some((property) => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    if (declaration === undefined) return false;
    const propertyType = checker.getTypeOfSymbolAtLocation(property, declaration);
    return typeExposesEnvironmentConstructor(checker, propertyType, seen);
  });
}

function environmentReturningExport(checker, symbol, sourceFile) {
  return typeExposesEnvironmentConstructor(checker, exportedValueType(checker, symbol, sourceFile));
}

function builderModuleSpecifier(node) {
  return ts.isStringLiteral(node) && /(?:^|\/)build-offer-environment(?:\.js|\.ts)?$/u.test(node.text);
}

function queryModuleSpecifier(node) {
  return ts.isStringLiteral(node) && /(?:^|\/)engine-query-port(?:\.js|\.ts)?$/u.test(node.text);
}

function exportedEnvironmentDiagnostics(program, sourceFiles, allowlist) {
  const checker = program.getTypeChecker();
  const diagnostics = [];
  for (const sourceFile of sourceFiles) {
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol !== undefined) {
      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        if (!environmentReturningExport(checker, symbol, sourceFile)) continue;
        const key = `${relative(sourceFile.fileName)}:${symbol.getName()}`;
        if (!allowlist.has(key)) {
          diagnostics.push(`${key}: exported runtime environment constructor is forbidden`);
        }
      }
    }
    for (const statement of sourceFile.statements) {
      if (ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== undefined &&
        builderModuleSpecifier(statement.moduleSpecifier) &&
        relative(sourceFile.fileName) !== BUILDER_PATH) {
        diagnostics.push(`${relative(sourceFile.fileName)}: re-exporting the environment builder is forbidden`);
      }
    }
  }
  return diagnostics;
}

function builderContractDiagnostics(program, sourceFile) {
  const checker = program.getTypeChecker();
  const diagnostics = [];
  const classes = sourceFile.statements.filter((statement) =>
    ts.isClassDeclaration(statement) && statement.name?.text === 'RuntimeOfferEnvironment');
  const builders = sourceFile.statements.filter((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'buildOfferEnvironment');
  if (classes.length !== 1) {
    diagnostics.push(`${BUILDER_PATH}: expected one module-private RuntimeOfferEnvironment class`);
    return diagnostics;
  }
  const runtimeClass = classes[0];
  if (runtimeClass === undefined) return diagnostics;
  const classIsExported = runtimeClass.modifiers?.some((modifier) =>
    modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  if (classIsExported) {
    diagnostics.push(`${BUILDER_PATH}: RuntimeOfferEnvironment must not be exported`);
  }
  const brand = runtimeClass.members.find((member) =>
    ts.isPropertyDeclaration(member) && ts.isPrivateIdentifier(member.name) && member.name.text === '#brand');
  if (brand === undefined) {
    diagnostics.push(`${BUILDER_PATH}: RuntimeOfferEnvironment requires a real #brand private field`);
  }
  if (builders.length !== 1) {
    diagnostics.push(`${BUILDER_PATH}: expected exactly one buildOfferEnvironment declaration`);
  }
  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  const runtimeExports = moduleSymbol === undefined
    ? []
    : checker.getExportsOfModule(moduleSymbol).filter((symbol) => {
        const target = (symbol.flags & ts.SymbolFlags.Alias) === 0
          ? symbol
          : checker.getAliasedSymbol(symbol);
        return (target.flags & ts.SymbolFlags.Value) !== 0;
      });
  if (runtimeExports.length !== 1 || runtimeExports[0]?.getName() !== 'buildOfferEnvironment') {
    const names = runtimeExports.map((symbol) => symbol.getName()).sort().join(', ');
    diagnostics.push(`${BUILDER_PATH}: runtime exports must be exactly buildOfferEnvironment; received ${names}`);
  }
  const builder = builders[0];
  if (builder !== undefined) {
    const exported = builder.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!exported || builder.parameters.length !== 1 || builder.parameters[0]?.questionToken !== undefined ||
      builder.parameters[0]?.initializer !== undefined) {
      diagnostics.push(`${BUILDER_PATH}: builder must export one required input parameter`);
    }
  }
  let canonicalImports = 0;
  let runtimeConstructions = 0;
  function visit(node) {
    if (ts.isImportDeclaration(node) && queryModuleSpecifier(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        canonicalImports += bindings.elements.filter((element) =>
          (element.propertyName ?? element.name).text === 'canonicalEngineQueryPort' && !element.isTypeOnly).length;
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === 'RuntimeOfferEnvironment') {
      runtimeConstructions += 1;
      if (builder === undefined || node.pos < builder.pos || node.end > builder.end) {
        diagnostics.push(`${BUILDER_PATH}: only buildOfferEnvironment may instantiate the runtime class`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (canonicalImports !== 1) {
    diagnostics.push(`${BUILDER_PATH}: builder must import the one canonical query port exactly once`);
  }
  if (runtimeConstructions !== 3) {
    diagnostics.push(`${BUILDER_PATH}: each validated builder branch must construct the runtime class directly`);
  }
  return diagnostics;
}

function symbolAt(checker, node) {
  return checker.getSymbolAtLocation(node);
}

function setOrigin(origins, symbol, origin) {
  if (symbol === undefined || origins.get(symbol) === origin) return false;
  origins.set(symbol, origin);
  return true;
}

function stringOrigin(value) {
  return `string:${value}`;
}

function stringFromOrigin(origin) {
  return origin?.startsWith('string:') === true ? origin.slice('string:'.length) : undefined;
}

function resolvesToQueryPort(program, sourceFile, specifier) {
  const resolved = ts.resolveModuleName(
    specifier,
    sourceFile.fileName,
    program.getCompilerOptions(),
    ts.sys,
  ).resolvedModule;
  return resolved !== undefined && relative(resolved.resolvedFileName) === QUERY_PORT_PATH;
}

function expressionOrigin(program, checker, sourceFile, origins, expression) {
  if (ts.isParenthesizedExpression(expression) || ts.isAsExpression(expression) ||
    ts.isTypeAssertionExpression(expression) || ts.isNonNullExpression(expression)) {
    return expressionOrigin(program, checker, sourceFile, origins, expression.expression);
  }
  if (ts.isStringLiteralLike(expression)) return stringOrigin(expression.text);
  if (ts.isIdentifier(expression)) {
    if (expression.text === 'require') return 'loader';
    return origins.get(symbolAt(checker, expression));
  }
  if (ts.isCallExpression(expression)) {
    if (expression.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const specifier = expression.arguments[0];
      const origin = specifier === undefined
        ? undefined
        : stringFromOrigin(expressionOrigin(program, checker, sourceFile, origins, specifier));
      return origin !== undefined && resolvesToQueryPort(program, sourceFile, origin) ? 'module' : undefined;
    }
    const callee = expressionOrigin(program, checker, sourceFile, origins, expression.expression);
    if (callee === 'create-require') return 'loader';
    const first = expression.arguments[0];
    const specifier = first === undefined
      ? undefined
      : stringFromOrigin(expressionOrigin(program, checker, sourceFile, origins, first));
    return callee === 'loader' && specifier !== undefined && resolvesToQueryPort(program, sourceFile, specifier)
      ? 'module'
      : undefined;
  }
  if (ts.isPropertyAccessExpression(expression)) {
    const base = expressionOrigin(program, checker, sourceFile, origins, expression.expression);
    if (base === 'module' && expression.name.text === 'canonicalEngineQueryPort') return 'canonical';
    return undefined;
  }
  if (ts.isElementAccessExpression(expression) && expression.argumentExpression !== undefined) {
    const base = expressionOrigin(program, checker, sourceFile, origins, expression.expression);
    const key = stringFromOrigin(
      expressionOrigin(program, checker, sourceFile, origins, expression.argumentExpression),
    );
    if (base === 'module' && key === 'canonicalEngineQueryPort') return 'canonical';
  }
  return undefined;
}

function collectCanonicalOrigins(program, sourceFile) {
  const checker = program.getTypeChecker();
  const origins = new Map();
  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && resolvesToQueryPort(program, sourceFile, statement.moduleSpecifier.text)) {
      const bindings = statement.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
        setOrigin(origins, symbolAt(checker, bindings.name), 'module');
      }
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if ((element.propertyName ?? element.name).text === 'canonicalEngineQueryPort') {
            setOrigin(origins, symbolAt(checker, element.name), 'canonical');
          }
        }
      }
    }
    if (ts.isImportDeclaration(statement) && statement.moduleSpecifier.text === 'node:module') {
      const bindings = statement.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if ((element.propertyName ?? element.name).text === 'createRequire') {
            setOrigin(origins, symbolAt(checker, element.name), 'create-require');
          }
        }
      }
    }
    if (ts.isImportEqualsDeclaration(statement) && ts.isExternalModuleReference(statement.moduleReference)) {
      const specifier = statement.moduleReference.expression;
      if (specifier !== undefined && ts.isStringLiteralLike(specifier) &&
        resolvesToQueryPort(program, sourceFile, specifier.text)) {
        setOrigin(origins, symbolAt(checker, statement.name), 'module');
      }
    }
  }
  for (let pass = 0; pass < 10; pass += 1) {
    let changed = false;
    function visit(node) {
      if (ts.isVariableDeclaration(node) && node.initializer !== undefined) {
        const origin = expressionOrigin(program, checker, sourceFile, origins, node.initializer);
        if (origin !== undefined && ts.isIdentifier(node.name)) {
          changed = setOrigin(origins, symbolAt(checker, node.name), origin) || changed;
        }
        if (origin === 'module' && ts.isObjectBindingPattern(node.name)) {
          for (const element of node.name.elements) {
            const property = element.propertyName ?? element.name;
            if (ts.isIdentifier(property) && property.text === 'canonicalEngineQueryPort' &&
              ts.isIdentifier(element.name)) {
              changed = setOrigin(origins, symbolAt(checker, element.name), 'canonical') || changed;
            }
          }
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
    if (!changed) break;
  }
  return origins;
}

function canonicalOriginDiagnostics(program, sourceFile, enforcePathAllowances = true) {
  const fileName = relative(sourceFile.fileName);
  if (enforcePathAllowances && (fileName === BUILDER_PATH || fileName === QUERY_PORT_PATH)) return [];
  const checker = program.getTypeChecker();
  const origins = collectCanonicalOrigins(program, sourceFile);
  const diagnostics = [];
  const reported = new Set();
  function report(node, message) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    const diagnostic = `${fileName}:${position.line + 1}: ${message}`;
    if (reported.has(diagnostic)) return;
    reported.add(diagnostic);
    diagnostics.push(diagnostic);
  }
  function exportSpecifierOrigin(element) {
    const target = checker.getExportSpecifierLocalTargetSymbol(element);
    const targetOrigin = origins.get(target);
    if (targetOrigin !== undefined || target === undefined || !(target.flags & ts.SymbolFlags.Alias)) {
      return targetOrigin;
    }
    return origins.get(checker.getAliasedSymbol(target));
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) && resolvesToQueryPort(program, sourceFile, node.moduleSpecifier.text)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        for (const element of bindings.elements) {
          if (origins.get(symbolAt(checker, element.name)) === 'canonical') {
            report(element, 'canonical query-port import is forbidden here');
          }
        }
      }
    }
    if (ts.isExportDeclaration(node)) {
      if (node.moduleSpecifier !== undefined &&
        resolvesToQueryPort(program, sourceFile, node.moduleSpecifier.text)) {
        if (node.exportClause === undefined) {
          report(node, 'whole engine-query-port re-export is forbidden');
        } else if (ts.isNamespaceExport(node.exportClause)) {
          report(node.exportClause, 'engine-query-port namespace re-export is forbidden');
        } else if (ts.isNamedExports(node.exportClause)) {
          for (const element of node.exportClause.elements) {
            if ((element.propertyName ?? element.name).text === 'canonicalEngineQueryPort') {
              report(element, 'canonical query-port re-export is forbidden');
            }
          }
        }
      }
      if (node.moduleSpecifier === undefined && node.exportClause !== undefined &&
        ts.isNamedExports(node.exportClause)) {
        for (const element of node.exportClause.elements) {
          const origin = exportSpecifierOrigin(element);
          if (origin === 'module' || origin === 'canonical') {
            report(element, 'exported binding exposes the canonical query port');
          }
        }
      }
    }
    if (ts.isImportTypeNode(node) && node.isTypeOf && ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteralLike(node.argument.literal) &&
      resolvesToQueryPort(program, sourceFile, node.argument.literal.text) &&
      node.qualifier?.getText(sourceFile).endsWith('canonicalEngineQueryPort') === true) {
      report(node, 'type-of-value alias exposes the canonical query port');
    }
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const specifier = node.arguments[0];
      if (specifier !== undefined && ts.isStringLiteralLike(specifier) &&
        resolvesToQueryPort(program, sourceFile, specifier.text)) {
        report(node, 'dynamic import exposes the canonical query port');
      }
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      if (expressionOrigin(program, checker, sourceFile, origins, node) === 'canonical') {
        report(node, 'canonical query-port member access is forbidden here');
      }
    }
    if (ts.isIdentifier(node) && origins.get(symbolAt(checker, node)) === 'canonical' &&
      !ts.isImportSpecifier(node.parent) && !identifierIsTypePosition(node)) {
      report(node, 'canonical query-port value reference is forbidden here');
    }
    if (ts.isExportAssignment(node)) {
      const origin = expressionOrigin(program, checker, sourceFile, origins, node.expression);
      if (origin === 'module' || origin === 'canonical') {
        report(node, 'CommonJS export exposes the canonical query port');
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const left = node.left.getText(sourceFile);
      const commonJsExport = left === 'module.exports' || left.startsWith('module.exports.') ||
        left === 'exports' || left.startsWith('exports.');
      const origin = expressionOrigin(program, checker, sourceFile, origins, node.right);
      if (commonJsExport && (origin === 'module' || origin === 'canonical')) {
        report(node, 'CommonJS export exposes the canonical query port');
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return diagnostics;
}

function identifierIsTypePosition(node) {
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (ts.isTypeNode(current)) return true;
    if (ts.isStatement(current) || ts.isExpression(current)) return false;
  }
  return false;
}

function compileFixtureProgram(name, source) {
  const fileName = path.join(ROOT, '.architecture-fixtures', name);
  const program = createProgram(
    [fileName],
    compilerOptions('tsconfig.app.json'),
    new Map([[fileName, source]]),
  );
  return { fileName, program };
}

function compileFixture(name, source) {
  const { fileName, program } = compileFixtureProgram(name, source);
  return ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.file !== undefined &&
    path.resolve(diagnostic.file.fileName) === path.resolve(fileName));
}

function privateBrandAssertionLines(program, sourceFiles) {
  const checker = program.getTypeChecker();
  const lines = [];
  for (const sourceFile of sourceFiles) {
    function visit(node) {
      if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
        const target = checker.getTypeAtLocation(node.type);
        const hasPrivateBrand = checker.getPropertiesOfType(target).some((property) =>
          property.declarations?.some((declaration) =>
            'name' in declaration &&
            declaration.name !== undefined &&
            ts.isPrivateIdentifier(declaration.name)) ?? false);
        if (isEnvironmentType(checker, target) && hasPrivateBrand) {
          lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return lines;
}

function diagnosticLine(diagnostic) {
  if (diagnostic.file === undefined || diagnostic.start === undefined) return 0;
  return diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
}

function markerLine(source, marker) {
  const index = source.split('\n').findIndex((line) => line.includes(`// ${marker}`));
  if (index < 0) throw new Error(`Missing fixture marker ${marker}.`);
  return index + 1;
}

function privateBrandSelfTest() {
  const source = `
import {
  buildOfferEnvironment,
  type EngineOptionEnvironment,
} from '../src/vtt/offers/build-offer-environment';

const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const objectLiteral: EngineOptionEnvironment = { // OBJECT_LITERAL
  queries: environment.queries,
  familyPolicy: environment.familyPolicy,
  partyThreatCatalog: environment.partyThreatCatalog,
  binding: environment.binding,
  digest: environment.digest,
};
const spread: EngineOptionEnvironment = { ...environment }; // SPREAD
const cast = { ...environment } as EngineOptionEnvironment; // CAST
class OutsideRuntimeOfferEnvironment implements EngineOptionEnvironment { // EXTERNAL_NEW
  readonly queries = environment.queries;
  readonly familyPolicy = environment.familyPolicy;
  readonly partyThreatCatalog = environment.partyThreatCatalog;
  readonly binding = environment.binding;
  readonly digest = environment.digest;
}
const outside = new OutsideRuntimeOfferEnvironment();
void objectLiteral;
void spread;
void cast;
void outside;
`;
  const fixture = compileFixtureProgram('private-brand-negative.ts', source);
  const diagnostics = ts.getPreEmitDiagnostics(fixture.program).filter((diagnostic) =>
    diagnostic.file !== undefined && path.resolve(diagnostic.file.fileName) === path.resolve(fixture.fileName));
  const fixtureSource = fixture.program.getSourceFile(fixture.fileName);
  const assertionLines = fixtureSource === undefined
    ? []
    : privateBrandAssertionLines(fixture.program, [fixtureSource]);
  const failures = [];
  for (const marker of ['OBJECT_LITERAL', 'SPREAD', 'CAST', 'EXTERNAL_NEW']) {
    const line = markerLine(source, marker);
    const rejectedByCompiler = diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === line);
    const rejectedAssertion = marker === 'CAST' && assertionLines.includes(line);
    if (!rejectedByCompiler && !rejectedAssertion) {
      failures.push(`private-brand-negative.ts:${line}: ${marker} unexpectedly compiled`);
    }
  }
  const validSource = `
import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
const first = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const second = buildOfferEnvironment({ kind: 'binding', binding: first.binding });
void first.queries;
void second.binding;
`;
  const validDiagnostics = compileFixture('private-brand-positive.ts', validSource);
  if (validDiagnostics.length !== 0) {
    failures.push('private-brand-positive.ts: real builder calls did not compile');
  }
  return failures;
}

function virtualProgram(sources) {
  const virtualSources = new Map();
  for (const [name, source] of Object.entries(sources)) {
    virtualSources.set(path.join(ROOT, '.architecture-fixtures', name), source);
  }
  return createProgram(
    [...virtualSources.keys()],
    compilerOptions('tsconfig.app.json'),
    virtualSources,
  );
}

function alternativeExportSelfTest() {
  const importLine = "import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';";
  const sources = {
    'same-builder-positive.ts': `${importLine}\nexport function runRoot(): void {\n` +
      "  const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
      '  void environment.queries;\n}\n',
    'exported-wrapper.ts': `${importLine}\nexport function secondBuilder() {\n` +
      "  return buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n}\n",
    'exported-alias.ts': `${importLine}\nexport const secondBuilder = buildOfferEnvironment;\n`,
    'exported-computed.ts': "import * as offers from '../src/vtt/offers/build-offer-environment';\n" +
      "export const secondBuilder = offers['buildOfferEnvironment'];\n",
    'exported-member.ts': `${importLine}\n` +
      'export const secondOfferEnvironmentBuilder = { build: buildOfferEnvironment };\n',
    'exported-namespace-binding.ts':
      "import * as builders from '../src/vtt/offers/build-offer-environment';\nexport { builders };\n",
    'builder-named-reexport.ts':
      "export { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';\n",
    'builder-star-reexport.ts': "export * from '../src/vtt/offers/build-offer-environment';\n",
    'builder-namespace-reexport.ts':
      "export * as offerEnvironment from '../src/vtt/offers/build-offer-environment';\n",
  };
  const program = virtualProgram(sources);
  const sourceFiles = program.getSourceFiles().filter((sourceFile) =>
    relative(sourceFile.fileName).startsWith('.architecture-fixtures/'));
  const diagnostics = exportedEnvironmentDiagnostics(program, sourceFiles, new Set());
  const failures = [];
  if (diagnostics.some((diagnostic) => diagnostic.includes('same-builder-positive.ts'))) {
    failures.push('same-builder-positive.ts: lifecycle-root builder use was rejected');
  }
  for (const name of Object.keys(sources).filter((name) => name !== 'same-builder-positive.ts')) {
    if (!diagnostics.some((diagnostic) => diagnostic.includes(name))) {
      failures.push(`${name}: alternative exported builder was not rejected`);
    }
  }
  return failures;
}

function builderRuntimeInventorySelfTest() {
  const builderPath = path.join(ROOT, BUILDER_PATH);
  const pristine = ts.sys.readFile(builderPath);
  if (pristine === undefined) return [`${BUILDER_PATH}: unable to read builder inventory fixture`];
  const source = `${pristine}\nexport function unrelatedRuntimeExport(): number { return 1; }\n`;
  const program = createProgram(
    [builderPath],
    compilerOptions('tsconfig.app.json'),
    new Map([[builderPath, source]]),
  );
  const builder = program.getSourceFile(builderPath);
  if (builder === undefined) return [`${BUILDER_PATH}: builder inventory fixture did not load`];
  const diagnostics = builderContractDiagnostics(program, builder);
  if (!diagnostics.some((diagnostic) => diagnostic.includes('runtime exports must be exactly'))) {
    return ['builder-extra-runtime-export.ts: additional runtime export was not rejected'];
  }
  return [];
}

function originFixtureCompilerOptions(name) {
  const options = compilerOptions('tsconfig.node.json');
  if (name.endsWith('.cts') || name.endsWith('.mts')) {
    return {
      ...options,
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      verbatimModuleSyntax: false,
    };
  }
  return options;
}

function originFixtureAnalyses(sources) {
  const queryPortFile = path.join(ROOT, QUERY_PORT_PATH);
  const groups = new Map();
  for (const [name, source] of Object.entries(sources)) {
    const extension = name.endsWith('.cts') ? '.cts' : name.endsWith('.mts') ? '.mts' : '.ts';
    const group = groups.get(extension) ?? [];
    group.push({ name, source });
    groups.set(extension, group);
  }
  const results = new Map();
  for (const fixtures of groups.values()) {
    const virtualSources = new Map(fixtures.map(({ name, source }) => [
      path.join(ROOT, '.architecture-fixtures', name),
      source,
    ]));
    const program = createProgram(
      [...virtualSources.keys(), queryPortFile],
      originFixtureCompilerOptions(fixtures[0]?.name ?? 'fixture.ts'),
      virtualSources,
    );
    for (const { name, source } of fixtures) {
      const fileName = path.join(ROOT, '.architecture-fixtures', name);
      const sourceFile = program.getSourceFile(fileName);
      if (sourceFile === undefined) {
        results.set(name, { architecture: [], compiler: [], resolved: false });
        continue;
      }
      const specifier = source.match(/['"](\.\.\/src\/vtt\/engine-query-port(?:\.js)?)['"]/u)?.[1];
      const mentionsQueryPort = source.includes('engine-query-port');
      const resolvesRealModule = !mentionsQueryPort ||
        (specifier !== undefined && resolvesToQueryPort(program, sourceFile, specifier));
      const architecture = resolvesRealModule ? canonicalOriginDiagnostics(program, sourceFile, false) : [];
      const compiler = [
        ...program.getSyntacticDiagnostics(sourceFile),
        ...program.getSemanticDiagnostics(sourceFile),
      ];
      results.set(name, { architecture, compiler, resolved: resolvesRealModule });
    }
  }
  return results;
}

function canonicalOriginSelfTest() {
  const invalidSources = {
    'canonical-named-import.ts': {
      source: "import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';\n" +
        'void canonicalEngineQueryPort;\n',
      minimum: 1,
    },
    'canonical-aliased-import.ts': {
      source: "import { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\n" +
        'void queries;\n',
      minimum: 1,
    },
    'canonical-namespace-access.ts': {
      source: "import * as queryPort from '../src/vtt/engine-query-port';\n" +
        'void queryPort.canonicalEngineQueryPort;\n',
      minimum: 1,
    },
    'canonical-namespace-alias-computed.ts': {
      source: "import * as queryPort from '../src/vtt/engine-query-port';\n" +
        "const alias = queryPort;\nconst key = 'canonicalEngineQueryPort';\nvoid alias[key];\n",
      minimum: 1,
    },
    'canonical-namespace-destructured.ts': {
      source: "import * as queryPort from '../src/vtt/engine-query-port';\n" +
        'const { canonicalEngineQueryPort: queries } = queryPort;\nvoid queries;\n',
      minimum: 1,
    },
    'canonical-named-reexport.ts': {
      source: "export { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\n",
      minimum: 1,
    },
    'canonical-namespace-reexport.ts': {
      source: "export * as queries from '../src/vtt/engine-query-port';\n",
      minimum: 1,
    },
    'canonical-imported-namespace-reexport.ts': {
      source: "import * as queries from '../src/vtt/engine-query-port';\nexport { queries };\n",
      minimum: 1,
    },
    'canonical-require-direct.cts': {
      source: "const queries = require('../src/vtt/engine-query-port').canonicalEngineQueryPort;\n" +
        'void queries;\n',
      minimum: 1,
    },
    'canonical-require-destructured.cts': {
      source: "const { canonicalEngineQueryPort: queries } = require('../src/vtt/engine-query-port');\n" +
        'void queries;\n',
      minimum: 1,
    },
    'canonical-create-require-computed.mts': {
      source: "import { createRequire as load } from 'node:module';\n" +
        'const requireModule = load(import.meta.url);\n' +
        "const moduleValue = requireModule('../src/vtt/engine-query-port.js');\n" +
        "const key = 'canonicalEngineQueryPort';\nvoid moduleValue[key];\n",
      minimum: 1,
    },
    'canonical-require-computed.cts': {
      source: "const moduleValue = require('../src/vtt/engine-query-port');\n" +
        "const key = 'canonicalEngineQueryPort';\nvoid moduleValue[key];\n",
      minimum: 1,
    },
    'canonical-require-indirect.cts': {
      source: "const p = '../src/vtt/engine-query-port';\n" +
        'const load = require;\nconst m = load(p);\n' +
        "const k = 'canonicalEngineQueryPort';\nvoid m[k];\n",
      minimum: 1,
    },
    'canonical-import-equals.cts': {
      source: "import m = require('../src/vtt/engine-query-port');\n" +
        'void m.canonicalEngineQueryPort;\nexport = m;\n',
      minimum: 2,
    },
    'canonical-commonjs-reexport.cts': {
      source: "module.exports = require('../src/vtt/engine-query-port');\n" +
        "const moduleAlias = require('../src/vtt/engine-query-port');\n" +
        'module.exports = moduleAlias;\n',
      minimum: 2,
    },
    'canonical-commonjs-named-reexport.cts': {
      source: "exports.queries = require('../src/vtt/engine-query-port');\n",
      minimum: 1,
    },
    'canonical-dynamic-import.mts': {
      source: "const queryPort = await import('../src/vtt/engine-query-port.js');\n" +
        "const key = 'canonicalEngineQueryPort';\nvoid queryPort[key];\n",
      minimum: 1,
    },
    'canonical-star-export.mts': {
      source: "export * from '../src/vtt/engine-query-port.js';\n",
      minimum: 1,
    },
    'canonical-type-of-value.ts': {
      source: "type Q = typeof import('../src/vtt/engine-query-port').canonicalEngineQueryPort;\n" +
        'declare const queries: Q;\nvoid queries;\n',
      minimum: 1,
    },
  };
  const validSources = {
    'allowed-helper-import.ts':
      "import { compareTacticalAllocations } from '../src/vtt/engine-query-port';\n" +
      'void compareTacticalAllocations;\n',
    'allowed-unrelated-namespace-reexport.ts':
      "export * as offers from '../src/vtt/offers/build-offer-environment';\n",
    'environment-queries.ts':
      'declare const environment: { readonly queries: unknown };\nvoid environment.queries;\n',
    'query-port-type.ts':
      "import type { EngineQueryPort } from '../src/vtt/engine-query-port';\n" +
      'declare const queries: EngineQueryPort;\nvoid queries;\n',
    'binding-codec.ts':
      "import { decodeEngineOptionEnvironmentBinding } from '../src/vtt/offers/offer-environment';\n" +
      'declare const binding: unknown;\nvoid decodeEngineOptionEnvironmentBinding(binding);\n',
  };
  const failures = [];
  const counts = new Map();
  const allSources = {
    ...Object.fromEntries(Object.entries(invalidSources).map(([name, fixture]) => [name, fixture.source])),
    ...validSources,
  };
  const results = originFixtureAnalyses(allSources);
  for (const [name, fixture] of Object.entries(invalidSources)) {
    const result = results.get(name) ?? { architecture: [], compiler: [], resolved: false };
    counts.set(name, result.architecture.length);
    if (!result.resolved) {
      failures.push(`${name}: fixture did not resolve the real ${QUERY_PORT_PATH}`);
    }
    if (result.architecture.length < fixture.minimum) {
      failures.push(`${name}: expected at least ${String(fixture.minimum)} architecture diagnostic(s), received ` +
        String(result.architecture.length));
    }
  }
  for (const [name, source] of Object.entries(validSources)) {
    void source;
    const result = results.get(name) ?? { architecture: [], compiler: [], resolved: false };
    counts.set(name, result.architecture.length);
    if (!result.resolved) {
      failures.push(`${name}: fixture did not resolve the real ${QUERY_PORT_PATH}`);
    }
    if (result.architecture.length !== 0) {
      failures.push(
        `${name}: valid production-symbol use received ${String(result.architecture.length)} diagnostic(s)`,
      );
    }
    if (result.compiler.length !== 0) {
      failures.push(
        `${name}: valid production-symbol use received ${String(result.compiler.length)} compile diagnostic(s)`,
      );
    }
  }
  return { failures, counts, fixtureCount: Object.keys(invalidSources).length + Object.keys(validSources).length };
}

function stagedRealSymbolSelfTest(fixtures) {
  const failures = [];
  for (const fixture of fixtures) {
    const diagnostics = compileFixture(fixture.name, fixture.source);
    const omittedLine = markerLine(fixture.source, 'OMITTED');
    const suppliedLine = markerLine(fixture.source, 'SUPPLIED');
    if (!diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === omittedLine)) {
      failures.push(`${fixture.name}:${omittedLine}: omitted real-symbol dependency compiled`);
    }
    if (diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === suppliedLine)) {
      failures.push(`${fixture.name}:${suppliedLine}: valid real-symbol dependency was rejected`);
    }
    const unrelated = diagnostics.filter((diagnostic) => {
      const line = diagnosticLine(diagnostic);
      return line !== omittedLine && line !== suppliedLine;
    });
    if (unrelated.length > 0) {
      failures.push(`${fixture.name}: ${String(unrelated.length)} unrelated compile diagnostic(s)`);
    }
  }
  return failures;
}

function runSelfTest(stage) {
  const canonical = canonicalOriginSelfTest();
  const diagnostics = [
    ...privateBrandSelfTest(),
    ...alternativeExportSelfTest(),
    ...builderRuntimeInventorySelfTest(),
    ...canonical.failures,
  ];
  if (stage !== undefined) {
    const staged = STAGED_REAL_SYMBOL_FIXTURES[stage];
    if (staged === undefined) {
      diagnostics.push(`Unknown architecture fixture stage: ${stage}`);
    } else {
      diagnostics.push(...stagedRealSymbolSelfTest(staged));
    }
  }
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(diagnostic);
    process.exitCode = 1;
    return;
  }
  const activeFixtureCount = 15 + canonical.fixtureCount;
  console.log(`offer-environment architecture self-test: ${String(activeFixtureCount)} active fixtures passed`);
  console.log('IB1-F1 probes: ' +
    `allowed-helper=${String(canonical.counts.get('allowed-helper-import.ts'))}, ` +
    `indirect-canonical=${String(canonical.counts.get('canonical-require-indirect.cts'))}, ` +
    `type-of-value=${String(canonical.counts.get('canonical-type-of-value.ts'))}`);
  console.log('IB2-F1 probes: ' +
    `namespace-export=${String(canonical.counts.get('canonical-namespace-reexport.ts'))}, ` +
    'imported-namespace-export=' +
    `${String(canonical.counts.get('canonical-imported-namespace-reexport.ts'))}, ` +
    'unrelated-namespace-export=' +
    String(canonical.counts.get('allowed-unrelated-namespace-reexport.ts')));
  console.log(`active CommonJS/ESM origin fixtures: ${ACTIVE_CJS_ORIGIN_FIXTURES.join(', ')}`);
  const stagedCounts = Object.entries(STAGED_REAL_SYMBOL_FIXTURES)
    .map(([name, fixtures]) => `${name}:${String(fixtures.length)}`)
    .join(', ');
  console.log(`staged real-symbol fixture groups: ${stagedCounts}`);
  console.log(`staged format fixtures: ${Object.keys(STAGED_FORMAT_FIXTURES).join(', ')}`);
}

function runProductionCheck() {
  const files = productionFiles();
  const program = createProgram(files, compilerOptions('tsconfig.node.json'));
  const sourceFiles = program.getSourceFiles().filter((sourceFile) => {
    const fileName = relative(sourceFile.fileName);
    return fileName.startsWith('src/') || fileName.startsWith('tools/') || fileName.startsWith('tests/');
  });
  const builder = sourceFiles.find((sourceFile) => relative(sourceFile.fileName) === BUILDER_PATH);
  const diagnostics = builder === undefined
    ? [`${BUILDER_PATH}: builder module is missing`]
    : builderContractDiagnostics(program, builder);
  diagnostics.push(...exportedEnvironmentDiagnostics(program, sourceFiles, TRANSITIONAL_RUNTIME_EXPORTS));
  const assertionDiagnostics = privateBrandAssertionLines(program, sourceFiles);
  if (assertionDiagnostics.length > 0) {
    diagnostics.push(`forbidden assertions to EngineOptionEnvironment at ${assertionDiagnostics.join(', ')}`);
  }
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(diagnostic);
    process.exitCode = 1;
    return;
  }
  console.log(`offer-environment architecture: ${sourceFiles.length} TypeScript files checked`);
  console.log('runtime export allowlist: builder plus exactly five transitional factories/wrappers');
}

const args = process.argv.slice(2);
const selfTest = args.includes('--self-test');
const stageIndex = args.indexOf('--stage');
const stage = stageIndex < 0 ? undefined : args[stageIndex + 1];
const knownArguments = new Set(['--self-test', '--stage', stage]);
const unknownArguments = args.filter((argument) => !knownArguments.has(argument));
if (unknownArguments.length > 0 || (stageIndex >= 0 && stage === undefined)) {
  console.error(`Unknown or incomplete arguments: ${args.join(' ')}`);
  process.exitCode = 1;
} else if (selfTest) {
  runSelfTest(stage);
} else if (stage !== undefined) {
  console.error('--stage requires --self-test.');
  process.exitCode = 1;
} else {
  runProductionCheck();
}
