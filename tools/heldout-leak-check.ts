import { execFileSync } from 'node:child_process';
import { canonicalJson } from '../src/commands/canonical-json';
import type { HeldoutSlice } from '../src/vtt/heldout-evaluation';
import ts from 'typescript';

export interface HeldoutChangedText {
  readonly path: string;
  readonly addedText: string;
  /** Complete candidate source, when available, so imports are parsed as a file rather than a diff fragment. */
  readonly sourceText?: string;
}

export interface HeldoutLeakFinding {
  readonly path: string;
  readonly kind: 'reserve_reference' | 'protocol_import';
  readonly detail: string;
}

export interface HeldoutLeakReport {
  readonly protocol: 'heldout-ordinary-v1';
  readonly slice: HeldoutSlice;
  readonly reserveDigests: readonly string[];
  readonly resultPaths: readonly string[];
  readonly checkedFiles: number;
  readonly findings: readonly HeldoutLeakFinding[];
}

export interface HeldoutLeakBindings {
  readonly reserveDigests: readonly string[];
  readonly resultPaths: readonly string[];
}

const EVALUATION_FILES = new Set([
  'src/vtt/heldout-evaluation.ts',
  'src/vtt/room-generator.ts',
  'tools/generate-heldout-party-basis.ts',
  'tools/generate-arena-basis.ts',
  'tools/ai-dm-arena.ts',
  'tools/ai-dm-heldout-report.ts',
  'tools/ai-dm-heldout-judge-prompt.ts',
  'tools/heldout-leak-check.ts',
  'tools/ai-dm-rerun-packet.ts',
]);

function normalizedDigits(text: string): readonly number[] {
  return [...text.matchAll(/\b[0-9][0-9_,]{5,}\b/gu)].map((match) =>
    Number((match[0] ?? '').replaceAll('_', '').replaceAll(',', '')))
    .filter((value) => Number.isSafeInteger(value));
}

const RESERVE_RESULT_PATH = /(?:\/home\/vagrant\/dnd-slim-runs\/)?heldout-[a-f]-(?:encounters|rounds|packet|key|judge|report)[a-z0-9._/-]*/iu;

function scriptKind(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (path.endsWith('.js') || path.endsWith('.mjs') || path.endsWith('.cjs')) {
    return ts.ScriptKind.JS;
  }
  return ts.ScriptKind.TS;
}

function isTypeScriptOrJavaScript(path: string): boolean {
  return ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']
    .some((extension) => path.endsWith(extension));
}

function literalModuleSpecifier(expression: ts.Expression | undefined): string | null {
  if (expression === undefined) return null;
  return ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)
    ? expression.text
    : null;
}

/**
 * Enumerates statically named module edges from TypeScript syntax. Comments and
 * whitespace are trivia, so they cannot split a token sequence past this wall.
 */
export function moduleSpecifiers(path: string, source: string): readonly string[] {
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.Latest,
      jsx: ts.JsxEmit.Preserve,
    },
    fileName: path,
    reportDiagnostics: true,
  });
  const parseErrors = (transpiled.diagnostics ?? []).filter((diagnostic) =>
    diagnostic.category === ts.DiagnosticCategory.Error);
  if (parseErrors.length > 0) {
    const detail = parseErrors.map((diagnostic) =>
      ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')).join('; ');
    throw new TypeError(`Held-out leak inspection could not parse ${path}: ${detail}`);
  }

  const sourceFile = ts.createSourceFile(
    path,
    source,
    ts.ScriptTarget.Latest,
    true,
    scriptKind(path),
  );
  const result = new Set<string>();
  const add = (specifier: string | null): void => {
    if (specifier !== null) result.add(specifier);
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      add(literalModuleSpecifier(node.moduleSpecifier));
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference)
    ) {
      add(literalModuleSpecifier(node.moduleReference.expression));
    } else if (ts.isImportTypeNode(node)) {
      add(ts.isLiteralTypeNode(node.argument)
        ? literalModuleSpecifier(node.argument.literal)
        : null);
    } else if (ts.isCallExpression(node) && node.arguments.length === 1) {
      const argument = literalModuleSpecifier(node.arguments[0]);
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) add(argument);
      if (ts.isIdentifier(node.expression) && node.expression.text === 'require') add(argument);
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return [...result].sort();
}

function isHeldoutProtocolSpecifier(specifier: string): boolean {
  return specifier === 'heldout-evaluation' ||
    specifier.endsWith('/heldout-evaluation') ||
    specifier.endsWith('/heldout-evaluation.js') ||
    specifier.endsWith('/heldout-evaluation.ts');
}

function reserveReference(text: string, bindings: HeldoutLeakBindings): string | null {
  if (text.includes('heldout-ordinary-v1') || text.includes('heldout-ordinary-v1-basis')) {
    return 'held-out reserve protocol or path';
  }
  const resultPath = bindings.resultPaths.find((path) => text.includes(path));
  if (resultPath !== undefined) return `bound reserve result path ${resultPath}`;
  const conventionalResultPath = text.match(RESERVE_RESULT_PATH)?.[0];
  if (conventionalResultPath !== undefined) {
    return `held-out reserve result path ${conventionalResultPath}`;
  }
  const normalizedText = text.toLowerCase();
  const reserveDigest = bindings.reserveDigests.find((digest) =>
    normalizedText.includes(digest.toLowerCase()));
  if (reserveDigest !== undefined) return `bound reserve digest ${reserveDigest}`;
  for (const value of normalizedDigits(text)) {
    if (value >= 7_860_001 && value <= 7_860_144) return `reserve room seed ${String(value)}`;
    if (value >= 8_860_001 && value <= 8_860_432) return `reserve combat seed ${String(value)}`;
    if (value >= 7_861_101 && value <= 7_861_106) return `reserve shuffle seed ${String(value)}`;
    if (value >= 7_862_101 && value <= 7_862_106) return `reserve bootstrap seed ${String(value)}`;
  }
  return null;
}

function isTestOrFixture(path: string): boolean {
  return path.startsWith('tests/');
}

function semanticInputPath(path: string): boolean {
  return /(ranking|opportunity-cost|prompt|tuning|challenge|play|score)/iu.test(path);
}

export function inspectHeldoutLeakChanges(
  changes: readonly HeldoutChangedText[],
  slice: HeldoutSlice,
  bindings: HeldoutLeakBindings,
): HeldoutLeakReport {
  if (bindings.reserveDigests.length === 0 || bindings.resultPaths.length === 0) {
    throw new TypeError('Held-out leak inspection requires reserve digest and result path bindings.');
  }
  if (bindings.reserveDigests.some((digest) => !/^[a-f0-9]{64}$/iu.test(digest))) {
    throw new TypeError('Held-out reserve digests must be SHA-256 values.');
  }
  if (bindings.resultPaths.some((path) =>
    !path.startsWith('/home/vagrant/dnd-slim-runs/heldout-'))) {
    throw new TypeError('Held-out reserve result paths must use the registered result root.');
  }
  const findings: HeldoutLeakFinding[] = [];
  for (const change of changes) {
    const reference = reserveReference(change.addedText, bindings);
    if (reference !== null && (
      semanticInputPath(change.path) ||
      (!EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path))
    )) {
      findings.push({ path: change.path, kind: 'reserve_reference', detail: reference });
    }
    const imports = isTypeScriptOrJavaScript(change.path)
      ? moduleSpecifiers(change.path, change.sourceText ?? change.addedText)
      : [];
    if (imports.some(isHeldoutProtocolSpecifier) &&
      !EVALUATION_FILES.has(change.path) && !isTestOrFixture(change.path)) {
      findings.push({
        path: change.path,
        kind: 'protocol_import',
        detail: 'held-out protocol imported outside evaluation tooling',
      });
    }
  }
  return {
    protocol: 'heldout-ordinary-v1',
    slice,
    reserveDigests: [...bindings.reserveDigests],
    resultPaths: [...bindings.resultPaths],
    checkedFiles: changes.length,
    findings,
  };
}

function addedChanges(base: string, candidate: string): readonly HeldoutChangedText[] {
  const diff = execFileSync(
    'git',
    ['diff', '--no-ext-diff', '--unified=0', base, candidate, '--', 'src', 'tools', 'tests'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );
  const byPath = new Map<string, string[]>();
  let path: string | null = null;
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++ b/')) {
      path = line.slice('+++ b/'.length);
      if (!byPath.has(path)) byPath.set(path, []);
      continue;
    }
    if (path !== null && line.startsWith('+') && !line.startsWith('+++')) {
      const lines = byPath.get(path) ?? [];
      lines.push(line.slice(1));
      byPath.set(path, lines);
    }
  }
  return [...byPath].map(([changedPath, lines]) => ({
    path: changedPath,
    addedText: lines.join('\n'),
    sourceText: execFileSync('git', ['show', `${candidate}:${changedPath}`], {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
    }),
  }));
}

function parseArgs(argv: readonly string[]): {
  readonly base: string;
  readonly candidate: string;
  readonly slice: HeldoutSlice;
  readonly bindings: HeldoutLeakBindings;
} {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const values = new Map<string, string>();
  const reserveDigests: string[] = [];
  const resultPaths: string[] = [];
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (option === undefined || ![
      '--base', '--candidate', '--protocol', '--slice', '--reserve-digest', '--result-path',
    ].includes(option)) {
      throw new TypeError(`Unknown held-out leak option ${option ?? '<missing>'}.`);
    }
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
    if (option === '--reserve-digest') reserveDigests.push(value);
    else if (option === '--result-path') resultPaths.push(value);
    else values.set(option, value);
  }
  if (values.get('--protocol') !== 'heldout-ordinary-v1') {
    throw new TypeError('--protocol must be heldout-ordinary-v1.');
  }
  const base = values.get('--base');
  const candidate = values.get('--candidate');
  const slice = values.get('--slice');
  if (base === undefined || candidate === undefined ||
    !['A', 'B', 'C', 'D', 'E', 'F'].includes(slice ?? '')) {
    throw new TypeError('--base, --candidate, and --slice A-F are required.');
  }
  if (reserveDigests.length === 0 || resultPaths.length === 0) {
    throw new TypeError('At least one --reserve-digest and --result-path are required.');
  }
  return {
    base,
    candidate,
    slice: slice as HeldoutSlice,
    bindings: { reserveDigests, resultPaths },
  };
}

function main(argv: readonly string[]): void {
  const config = parseArgs(argv);
  const report = inspectHeldoutLeakChanges(
    addedChanges(config.base, config.candidate),
    config.slice,
    config.bindings,
  );
  process.stdout.write(`${canonicalJson(report)}\n`);
  if (report.findings.length > 0) process.exitCode = 1;
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('/heldout-leak-check.ts') || argument.endsWith('\\heldout-leak-check.ts'));
if (scriptIndex >= 0) main(process.argv.slice(scriptIndex + 1));
else if (process.argv.includes('--base') && process.argv.includes('--candidate')) main(process.argv.slice(2));
