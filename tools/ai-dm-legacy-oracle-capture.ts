import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, readdir, realpath, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AgentInstructionSource, AgentInvocation } from '../src/vtt/agent-session';
import {
  parseConversationArgs,
  runConversation,
  type ConversationConfig,
  type ConversationRunOptions,
} from './ai-dm-conversation';

const APPROVED_COMMIT = '493121dd902e5033197d72f0050a1b8b8e32ae7c';
const APPROVED_TREE = '87de2ce5776d6194413d61f94b6a0debe2640707';
const ARTIFACTS_ROOT_LITERAL = '$ARTIFACTS_ROOT';
const CHECKOUT_ROOT_LITERAL = '$CHECKOUT_ROOT';
const PROVISIONAL_OUTPUT = '.tmp/runner-oracle-provisional.json';
const SUBJECTS = [
  'actions',
  'conditions',
  'movement',
  'protocol',
  'reactions',
  'spells',
  'targeting',
] as const;
const MANIFEST_NAMES = [
  'room-1-round-1-correction-launcher-full.json',
  'room-1-round-1-correction-launcher.json',
  'room-1-round-1-initial-launcher-full.json',
  'room-1-round-1-initial-launcher.json',
] as const;
const ARTIFACT_MANIFEST_FIELDS = [
  'fixturePath',
  'kbReadSpoolPath',
  'proposalSpoolPath',
  'turnContextSpoolPath',
] as const;

export interface LockedBytes {
  readonly byteCount: number;
  readonly sha256: string;
  readonly base64: string;
}

export interface LegacyRunnerCapture {
  readonly rowJsonl: LockedBytes;
  readonly launchers: Readonly<Record<string, LockedBytes>>;
  readonly protectedPrimaryInvocation: LockedBytes;
}

export type ProtectedPrimaryInvocation = AgentInstructionSource & Readonly<Pick<
  AgentInvocation,
  | 'runId' | 'prompt' | 'instructions' | 'freshSessionContext'
  | 'model' | 'reasoningEffort' | 'sessionProfile' | 'callPhase' | 'output'
  | 'launcherToken' | 'recoveryLauncherToken' | 'timeoutMs'
>>;

interface RootEncodingEvidence {
  readonly artifactRoot: string;
  readonly checkoutRoot: string;
  readonly artifactCount: number;
  readonly checkoutCount: number;
  readonly artifactPaths: readonly string[];
  readonly checkoutPaths: readonly string[];
  readonly persistedSha256: string;
  readonly encodedSha256: string;
  readonly inverseSha256: string;
  readonly instructionFields?: Readonly<Record<string, InstructionFieldEvidence>>;
}

interface InstructionFieldEvidence {
  readonly artifactCount: number;
  readonly checkoutCount: number;
  readonly originalSha256: string;
  readonly encodedSha256: string;
  readonly inverseSha256: string;
}

interface CaptureEvidence {
  readonly artifactRoot: string;
  readonly checkoutRoot: string;
  readonly row: Readonly<Pick<LockedBytes, 'byteCount' | 'sha256'>>;
  readonly correctionCalls: number;
  readonly launchers: Readonly<Record<string, RootEncodingEvidence>>;
  readonly protectedPrimaryInvocation: RootEncodingEvidence;
}

interface CapturedComponents {
  readonly capture: LegacyRunnerCapture;
  readonly evidence: CaptureEvidence;
}

function object(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function stringField(value: unknown, label: string): string {
  if (typeof value !== 'string') throw new TypeError(`${label} must be a string.`);
  return value;
}

function numberField(value: unknown, label: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
  return value;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function lock(bytes: Buffer): LockedBytes {
  return {
    byteCount: bytes.byteLength,
    sha256: sha256(bytes),
    base64: bytes.toString('base64'),
  };
}

function slashPath(path: string): string {
  return path.split(sep).join('/');
}

function rootedSuffix(path: string, root: string, label: string): string {
  if (!path.startsWith(`${root}${sep}`)) {
    throw new TypeError(`${label} is outside its approved root: ${path}`);
  }
  return path.slice(root.length);
}

function replaceExactJsonString(
  source: string,
  original: string,
  replacement: string,
  label: string,
): string {
  const originalJson = JSON.stringify(original);
  const replacementJson = JSON.stringify(replacement);
  const first = source.indexOf(originalJson);
  if (first < 0 || source.indexOf(originalJson, first + originalJson.length) >= 0) {
    throw new TypeError(`${label} must occur exactly once in persisted bytes.`);
  }
  return `${source.slice(0, first)}${replacementJson}${source.slice(first + originalJson.length)}`;
}

function replaceSerializedStringField(
  source: string,
  field: string,
  original: string,
  replacement: string,
  label: string,
): string {
  const key = `${JSON.stringify(field)}:`;
  const originalToken = `${key}${JSON.stringify(original)}`;
  const replacementToken = `${key}${JSON.stringify(replacement)}`;
  const first = source.indexOf(originalToken);
  if (first < 0 || source.indexOf(originalToken, first + originalToken.length) >= 0) {
    throw new TypeError(`${label} must have exactly one field-addressed serialized token.`);
  }
  return `${source.slice(0, first)}${replacementToken}${source.slice(first + originalToken.length)}`;
}

function occurrenceCount(source: string, value: string): number {
  if (value.length === 0) throw new TypeError('Occurrence inventory cannot use an empty value.');
  let count = 0;
  let offset = 0;
  while (true) {
    const next = source.indexOf(value, offset);
    if (next < 0) return count;
    count += 1;
    offset = next + value.length;
  }
}

function encodeInstructionField(
  source: string,
  artifactRoot: string,
  checkoutRoot: string,
  approvedCheckoutPaths: readonly string[],
  label: string,
): { readonly encoded: string; readonly evidence: InstructionFieldEvidence } {
  assertNoReservedLiteral(source, label);
  const artifactCount = occurrenceCount(source, artifactRoot);
  const checkoutCount = occurrenceCount(source, checkoutRoot);
  if (artifactCount !== 0) {
    throw new TypeError(`${label} must contain zero artifact-root occurrences; received ${String(artifactCount)}.`);
  }
  if (checkoutCount !== SUBJECTS.length) {
    throw new TypeError(
      `${label} must contain ${String(SUBJECTS.length)} checkout-root occurrences; received ${String(checkoutCount)}.`,
    );
  }
  let encoded = source;
  for (const approvedPath of approvedCheckoutPaths) {
    if (occurrenceCount(encoded, approvedPath) !== 1) {
      throw new TypeError(`${label} must contain approved checkout path exactly once: ${approvedPath}`);
    }
    const suffix = rootedSuffix(approvedPath, checkoutRoot, `${label} approved checkout path`);
    encoded = encoded.replace(approvedPath, `${CHECKOUT_ROOT_LITERAL}${suffix}`);
  }
  if (encoded.includes(checkoutRoot) || encoded.includes(artifactRoot)) {
    throw new TypeError(`${label} contains an unapproved residual root occurrence.`);
  }
  let inverse = encoded;
  for (const approvedPath of approvedCheckoutPaths) {
    const suffix = rootedSuffix(approvedPath, checkoutRoot, `${label} inverse checkout path`);
    const encodedPath = `${CHECKOUT_ROOT_LITERAL}${suffix}`;
    if (occurrenceCount(inverse, encodedPath) !== 1) {
      throw new TypeError(`${label} encoded checkout path must occur exactly once: ${encodedPath}`);
    }
    inverse = inverse.replace(encodedPath, approvedPath);
  }
  if (inverse !== source) throw new TypeError(`${label} checkout-root encoding is not exactly reversible.`);
  return {
    encoded,
    evidence: {
      artifactCount,
      checkoutCount,
      originalSha256: sha256(source),
      encodedSha256: sha256(encoded),
      inverseSha256: sha256(inverse),
    },
  };
}

function assertNoReservedLiteral(source: string, label: string): void {
  if (source.includes(ARTIFACTS_ROOT_LITERAL) || source.includes(CHECKOUT_ROOT_LITERAL)) {
    throw new TypeError(`${label} contains a reserved root literal.`);
  }
}

function assertNoUnapprovedRoot(
  source: string,
  artifactRoot: string,
  checkoutRoot: string,
  label: string,
): void {
  if (source.includes(artifactRoot)) {
    throw new TypeError(`${label} contains an unapproved artifact-root occurrence.`);
  }
  if (source.includes(checkoutRoot)) {
    const index = source.indexOf(checkoutRoot);
    throw new TypeError(
      `${label} contains an unapproved checkout-root occurrence near ${JSON.stringify(source.slice(Math.max(0, index - 80), index + checkoutRoot.length + 80))}.`,
    );
  }
}

async function encodeManifest(
  persisted: Buffer,
  artifactRoot: string,
  checkoutRoot: string,
  filename: string,
): Promise<{ readonly bytes: Buffer; readonly evidence: RootEncodingEvidence }> {
  const source = persisted.toString('utf8');
  assertNoReservedLiteral(source, filename);
  const manifest = object(JSON.parse(source) as unknown, filename);
  let encoded = source;
  const artifactPaths: string[] = [];
  for (const field of ARTIFACT_MANIFEST_FIELDS) {
    const value = stringField(manifest[field], `${filename} $.${field}`);
    const suffix = rootedSuffix(value, artifactRoot, `${filename} $.${field}`);
    encoded = replaceExactJsonString(
      encoded,
      value,
      `${ARTIFACTS_ROOT_LITERAL}${suffix}`,
      `${filename} $.${field}`,
    );
    artifactPaths.push(`$.${field}`);
  }

  const subjectSources = object(manifest['kbSubjectSources'], `${filename} $.kbSubjectSources`);
  const checkoutPaths: string[] = [];
  for (const subject of SUBJECTS) {
    const sourceEntry = object(subjectSources[subject], `${filename} $.kbSubjectSources.${subject}`);
    const absolutePath = stringField(
      sourceEntry['absolutePath'],
      `${filename} $.kbSubjectSources.${subject}.absolutePath`,
    );
    const target = await realpath(absolutePath);
    const suffix = rootedSuffix(target, checkoutRoot, `${filename} KB subject ${subject}`);
    if (absolutePath !== target) {
      throw new TypeError(`${filename} KB subject ${subject} absolutePath is not its realpath target.`);
    }
    const expectedRelative = slashPath(relative(checkoutRoot, target));
    if (stringField(sourceEntry['repoRelativePath'], `${filename} ${subject} repoRelativePath`) !== expectedRelative) {
      throw new TypeError(`${filename} KB subject ${subject} repoRelativePath does not match its realpath target.`);
    }
    const targetBytes = await readFile(target);
    if (numberField(sourceEntry['byteCount'], `${filename} ${subject} byteCount`) !== targetBytes.byteLength) {
      throw new TypeError(`${filename} KB subject ${subject} byteCount does not match its realpath target.`);
    }
    if (stringField(sourceEntry['sha256'], `${filename} ${subject} sha256`) !== sha256(targetBytes)) {
      throw new TypeError(`${filename} KB subject ${subject} sha256 does not match its realpath target.`);
    }
    encoded = replaceExactJsonString(
      encoded,
      absolutePath,
      `${CHECKOUT_ROOT_LITERAL}${suffix}`,
      `${filename} $.kbSubjectSources.${subject}.absolutePath`,
    );
    checkoutPaths.push(`$.kbSubjectSources.${subject}.absolutePath`);
  }
  assertNoUnapprovedRoot(encoded, artifactRoot, checkoutRoot, filename);
  const inverse = encoded
    .replaceAll(ARTIFACTS_ROOT_LITERAL, artifactRoot)
    .replaceAll(CHECKOUT_ROOT_LITERAL, checkoutRoot);
  if (inverse !== source) throw new TypeError(`${filename} root encoding is not exactly reversible.`);
  const encodedBytes = Buffer.from(encoded, 'utf8');
  const inverseBytes = Buffer.from(inverse, 'utf8');
  return {
    bytes: encodedBytes,
    evidence: {
      artifactRoot,
      checkoutRoot,
      artifactCount: artifactPaths.length,
      checkoutCount: checkoutPaths.length,
      artifactPaths,
      checkoutPaths,
      persistedSha256: sha256(persisted),
      encodedSha256: sha256(encodedBytes),
      inverseSha256: sha256(inverseBytes),
    },
  };
}

function encodeInvocation(
  invocation: ProtectedPrimaryInvocation,
  artifactRoot: string,
  checkoutRoot: string,
  approvedCheckoutPaths: readonly string[],
): { readonly bytes: Buffer; readonly evidence: RootEncodingEvidence } {
  const source = JSON.stringify(invocation);
  assertNoReservedLiteral(source, 'protected primary invocation');
  if (typeof invocation.instructions !== 'string') {
    throw new TypeError('protected primary invocation $.instructions must be a string.');
  }
  const freshSessionContext = invocation.freshSessionContext;
  if (freshSessionContext === undefined) {
    throw new TypeError('protected primary invocation $.freshSessionContext must be present.');
  }
  const instructions = encodeInstructionField(
    invocation.instructions,
    artifactRoot,
    checkoutRoot,
    approvedCheckoutPaths,
    '$.instructions',
  );
  const startupInstructions = encodeInstructionField(
    freshSessionContext.startupInstructions,
    artifactRoot,
    checkoutRoot,
    approvedCheckoutPaths,
    '$.freshSessionContext.startupInstructions',
  );
  let encoded = source;
  encoded = replaceSerializedStringField(
    encoded,
    'instructions',
    invocation.instructions,
    instructions.encoded,
    '$.instructions',
  );
  encoded = replaceSerializedStringField(
    encoded,
    'startupInstructions',
    freshSessionContext.startupInstructions,
    startupInstructions.encoded,
    '$.freshSessionContext.startupInstructions',
  );
  const paths = ['$.launcherToken', '$.recoveryLauncherToken'] as const;
  for (const [field, path] of [
    ['launcherToken', paths[0]],
    ['recoveryLauncherToken', paths[1]],
  ] as const) {
    const value = invocation[field];
    if (typeof value !== 'string') throw new TypeError(`protected primary invocation ${path} is absent.`);
    const suffix = rootedSuffix(value, artifactRoot, `protected primary invocation ${path}`);
    encoded = replaceExactJsonString(
      encoded,
      value,
      `${ARTIFACTS_ROOT_LITERAL}${suffix}`,
      `protected primary invocation ${path}`,
    );
  }
  assertNoUnapprovedRoot(encoded, artifactRoot, checkoutRoot, 'protected primary invocation');
  let inverse = encoded;
  for (const [field, path] of [
    ['launcherToken', paths[0]],
    ['recoveryLauncherToken', paths[1]],
  ] as const) {
    const original = invocation[field];
    if (typeof original !== 'string') throw new TypeError(`protected primary invocation ${path} is absent.`);
    const suffix = rootedSuffix(original, artifactRoot, `protected primary invocation inverse ${path}`);
    inverse = replaceExactJsonString(
      inverse,
      `${ARTIFACTS_ROOT_LITERAL}${suffix}`,
      original,
      `protected primary invocation inverse ${path}`,
    );
  }
  inverse = replaceSerializedStringField(
    inverse,
    'instructions',
    instructions.encoded,
    invocation.instructions,
    '$.instructions inverse',
  );
  inverse = replaceSerializedStringField(
    inverse,
    'startupInstructions',
    startupInstructions.encoded,
    freshSessionContext.startupInstructions,
    '$.freshSessionContext.startupInstructions inverse',
  );
  if (inverse !== source) throw new TypeError('Protected primary invocation root encoding is not exactly reversible.');
  const bytes = Buffer.from(encoded, 'utf8');
  return {
    bytes,
    evidence: {
      artifactRoot,
      checkoutRoot,
      artifactCount: paths.length,
      checkoutCount: instructions.evidence.checkoutCount + startupInstructions.evidence.checkoutCount,
      artifactPaths: paths,
      checkoutPaths: ['$.instructions', '$.freshSessionContext.startupInstructions'],
      persistedSha256: sha256(source),
      encodedSha256: sha256(bytes),
      inverseSha256: sha256(inverse),
      instructionFields: {
        '$.instructions': instructions.evidence,
        '$.freshSessionContext.startupInstructions': startupInstructions.evidence,
      },
    },
  };
}

export function protectedPrimaryInvocation(
  invocation: AgentInvocation,
  artifactsDirectory: string,
): ProtectedPrimaryInvocation {
  rootedSuffix(invocation.launcherToken, artifactsDirectory, 'primary invocation launcherToken');
  if (invocation.recoveryLauncherToken !== undefined) {
    rootedSuffix(
      invocation.recoveryLauncherToken,
      artifactsDirectory,
      'primary invocation recoveryLauncherToken',
    );
  }
  if (invocation.toolSession !== undefined) {
    throw new TypeError('Legacy runner oracle requires a serializable primary invocation without toolSession.');
  }
  if (invocation.bootstrap !== undefined) {
    throw new TypeError('Legacy runner oracle captures the primary invocation before lifecycle bootstrap.');
  }
  const fields = {
    runId: invocation.runId,
    prompt: invocation.prompt,
    ...(invocation.instructions === undefined ? {} : { instructions: invocation.instructions }),
    ...(invocation.freshSessionContext === undefined
      ? {}
      : { freshSessionContext: invocation.freshSessionContext }),
    model: invocation.model,
    reasoningEffort: invocation.reasoningEffort,
    ...(invocation.sessionProfile === undefined ? {} : { sessionProfile: invocation.sessionProfile }),
    callPhase: invocation.callPhase,
    output: invocation.output,
    launcherToken: invocation.launcherToken,
    ...(invocation.recoveryLauncherToken === undefined
      ? {}
      : { recoveryLauncherToken: invocation.recoveryLauncherToken }),
    timeoutMs: invocation.timeoutMs,
  };
  switch (invocation.instructionSource) {
    case 'none':
      return { instructionSource: 'none', skill: null, ...fields };
    case 'kb':
      return { instructionSource: 'kb', skill: null, kbPath: invocation.kbPath, ...fields };
    case 'skill':
      return { instructionSource: 'skill', skill: invocation.skill, kbPath: null, ...fields };
  }
}

async function captureLegacyRunnerComponentsWithEvidence(
  config: ConversationConfig,
  options: ConversationRunOptions = {},
): Promise<CapturedComponents> {
  const primaryInvocations: AgentInvocation[] = [];
  const result = await runConversation(config, {
    ...options,
    onPrimaryInvocation: (invocation) => {
      primaryInvocations.push(invocation);
      options.onPrimaryInvocation?.(invocation);
    },
  });
  const primaryInvocation = primaryInvocations[0];
  if (primaryInvocations.length !== 1 || primaryInvocation === undefined) {
    throw new TypeError(
      `Legacy runner capture requires exactly one primary invocation; received ${String(primaryInvocations.length)}.`,
    );
  }
  if (result.rows.length !== 1) {
    throw new TypeError(`Legacy runner capture requires exactly one row; received ${String(result.rows.length)}.`);
  }
  const rowBytes = await readFile(config.outPath);
  const rowText = rowBytes.toString('utf8');
  if (rowBytes.byteLength === 0 || rowText.includes('\r') || !rowText.endsWith('\n') ||
    rowText.split('\n').length !== 2 || rowText.slice(0, -1).length === 0) {
    throw new TypeError('Legacy runner JSONL must contain one nonempty record, one terminal LF, and no CR.');
  }
  const parsedRow = object(JSON.parse(rowText.slice(0, -1)) as unknown, 'legacy runner row');
  const roundTotals = object(parsedRow['roundTotals'], 'legacy runner row roundTotals');
  const correctionCalls = numberField(roundTotals['correctionCalls'], 'legacy runner correctionCalls');
  const artifactRoot = dirname(primaryInvocation.launcherToken);
  const checkoutRoot = await realpath(config.cwd);
  const files = (await readdir(artifactRoot))
    .filter((name) => name.includes('-launcher') && name.endsWith('.json'))
    .sort();
  if (JSON.stringify(files) !== JSON.stringify(MANIFEST_NAMES)) {
    throw new TypeError(`Legacy runner launcher inventory differs: ${JSON.stringify(files)}`);
  }
  const launchers: Record<string, LockedBytes> = {};
  const launcherEvidence: Record<string, RootEncodingEvidence> = {};
  let approvedCheckoutPaths: readonly string[] | null = null;
  for (const name of MANIFEST_NAMES) {
    const persisted = await readFile(resolve(artifactRoot, name));
    const encoded = await encodeManifest(persisted, artifactRoot, checkoutRoot, name);
    launchers[name] = lock(encoded.bytes);
    launcherEvidence[name] = encoded.evidence;
    const manifest = object(JSON.parse(persisted.toString('utf8')) as unknown, name);
    const sources = object(manifest['kbSubjectSources'], `${name} $.kbSubjectSources`);
    const paths = SUBJECTS.map((subject) => stringField(
      object(sources[subject], `${name} $.kbSubjectSources.${subject}`)['absolutePath'],
      `${name} $.kbSubjectSources.${subject}.absolutePath`,
    ));
    if (approvedCheckoutPaths === null) approvedCheckoutPaths = paths;
    else if (JSON.stringify(paths) !== JSON.stringify(approvedCheckoutPaths)) {
      throw new TypeError(`${name} KB subject absolute-path inventory differs from the other launchers.`);
    }
  }
  if (approvedCheckoutPaths === null) throw new TypeError('Legacy runner capture has no KB subject paths.');
  const projected = protectedPrimaryInvocation(primaryInvocation, artifactRoot);
  const encodedInvocation = encodeInvocation(
    projected,
    artifactRoot,
    checkoutRoot,
    approvedCheckoutPaths,
  );
  const rowJsonl = lock(rowBytes);
  return {
    capture: {
      rowJsonl,
      launchers,
      protectedPrimaryInvocation: lock(encodedInvocation.bytes),
    },
    evidence: {
      artifactRoot,
      checkoutRoot,
      row: { byteCount: rowJsonl.byteCount, sha256: rowJsonl.sha256 },
      correctionCalls,
      launchers: launcherEvidence,
      protectedPrimaryInvocation: encodedInvocation.evidence,
    },
  };
}

export async function captureLegacyRunnerComponents(
  config: ConversationConfig,
  options: ConversationRunOptions = {},
): Promise<LegacyRunnerCapture> {
  return (await captureLegacyRunnerComponentsWithEvidence(config, options)).capture;
}

const execFileAsync = promisify(execFile);

async function git(cwd: string, args: readonly string[]): Promise<string> {
  const result = await execFileAsync('git', [...args], { cwd, encoding: 'utf8' });
  return result.stdout.trim();
}

function commandArgs(argv: readonly string[]): {
  readonly outPath: string;
  readonly expectedCommit: string;
  readonly provisional: boolean;
} {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  let outPath: string | null = null;
  let expectedCommit: string | null = null;
  let provisional = false;
  for (let index = 0; index < args.length; index += 1) {
    const option = args[index];
    if (option === '--provisional') {
      provisional = true;
      continue;
    }
    if (option !== '--out' && option !== '--expected-commit') {
      throw new TypeError(`Unknown capture option ${option ?? '<missing>'}.`);
    }
    const value = args[index + 1];
    if (value === undefined || value.startsWith('--')) {
      throw new TypeError(`${option} requires a value.`);
    }
    if (option === '--out') outPath = value;
    else expectedCommit = value;
    index += 1;
  }
  if (outPath === null) throw new TypeError('--out is required.');
  if (expectedCommit === null) throw new TypeError('--expected-commit is required.');
  return { outPath: resolve(outPath), expectedCommit, provisional };
}

async function main(): Promise<void> {
  const cli = commandArgs(process.argv.slice(2));
  if (cli.expectedCommit !== APPROVED_COMMIT) {
    throw new TypeError(`--expected-commit must be the approved main commit ${APPROVED_COMMIT}.`);
  }
  const checkoutRoot = await realpath(process.cwd());
  const toolPath = await realpath(fileURLToPath(import.meta.url));
  const toolRelativePath = slashPath(relative(checkoutRoot, toolPath));
  if (toolRelativePath !== 'tools/ai-dm-legacy-oracle-capture.ts') {
    throw new TypeError(`Capture tool must run from the checkout tools directory; received ${toolRelativePath}.`);
  }
  const head = await git(checkoutRoot, ['rev-parse', 'HEAD']);
  const tree = await git(checkoutRoot, ['rev-parse', 'HEAD^{tree}']);
  const expectedTree = await git(checkoutRoot, ['rev-parse', `${cli.expectedCommit}^{tree}`]);
  if (expectedTree !== APPROVED_TREE) {
    throw new TypeError(`Approved commit tree differs: expected ${APPROVED_TREE}, received ${expectedTree}.`);
  }
  const trackedStatus = await git(checkoutRoot, ['diff', '--name-only']);
  const indexStatus = await git(checkoutRoot, ['diff', '--cached', '--name-only']);
  const untrackedStatus = (await git(checkoutRoot, ['ls-files', '--others', '--exclude-standard']))
    .split('\n').filter((path) => path.length > 0);
  const unexpectedUntracked = untrackedStatus.filter((path) => path !== toolRelativePath);
  if (unexpectedUntracked.length > 0 || !untrackedStatus.includes(toolRelativePath)) {
    throw new TypeError(
      `Capture checkout untracked files must contain only ${toolRelativePath}; received ${JSON.stringify(untrackedStatus)}.`,
    );
  }
  if (indexStatus !== '') throw new TypeError(`Capture checkout index is dirty: ${indexStatus}`);
  if (!cli.provisional && (head !== cli.expectedCommit || tree !== APPROVED_TREE || trackedStatus !== '')) {
    throw new TypeError('Approved runner oracle requires the clean approved main HEAD and tree.');
  }
  if (cli.provisional) {
    if (head === cli.expectedCommit) {
      throw new TypeError('--provisional is permitted only when HEAD is not the approved commit.');
    }
    if (cli.outPath !== resolve(checkoutRoot, PROVISIONAL_OUTPUT)) {
      throw new TypeError(`--provisional may write only ${PROVISIONAL_OUTPUT}.`);
    }
  } else {
    const outputRelative = relative(checkoutRoot, cli.outPath);
    if (outputRelative === '' || (!outputRelative.startsWith(`..${sep}`) && outputRelative !== '..')) {
      throw new TypeError('Approved runner oracle output must be outside the checkout.');
    }
  }

  const primaryConfig = parseConversationArgs([
    '--fixtures', 'tests/fixtures/arena-basis',
    '--rooms', '1',
    '--rounds', '1',
    '--out', resolve('/tmp', `dnd-legacy-oracle-${String(process.pid)}-primary.jsonl`),
    '--dry-run',
  ], checkoutRoot);
  const correctionConfig = parseConversationArgs([
    '--fixtures', 'tests/fixtures/arena-basis',
    '--rooms', '1',
    '--rounds', '1',
    '--out', resolve('/tmp', `dnd-legacy-oracle-${String(process.pid)}-correction.jsonl`),
    '--dry-run',
  ], checkoutRoot);
  const primary = await captureLegacyRunnerComponentsWithEvidence(primaryConfig);
  const correction = await captureLegacyRunnerComponentsWithEvidence(correctionConfig, {
    exhaustInitial: ['room-1-round-1'],
    failCorrection: ['room-1-round-1'],
  });
  if (correction.evidence.correctionCalls !== 1) {
    throw new TypeError(
      `Correction capture correctionCalls must be 1; received ${String(correction.evidence.correctionCalls)}.`,
    );
  }
  const toolBytes = await readFile(toolPath);
  const oracle = {
    version: 'legacy-runner-oracle-v1' as const,
    provenance: {
      repoCommit: head,
      tree,
      commandLine: process.argv.slice(2),
      capturedAt: new Date().toISOString(),
      nodeVersion: process.version,
      checkoutRoot,
      captureToolSha256: sha256(toolBytes),
      trackedStatus,
      untrackedAllowlist: [toolRelativePath],
      timingFields: ['endToEndWall', 'timeToFirstAction', 'wallPerCreature'],
    },
    runs: { primary: primary.capture, correction: correction.capture },
  };
  await writeFile(cli.outPath, `${JSON.stringify(oracle, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({
    output: cli.outPath,
    provenance: oracle.provenance,
    cases: { primary: primary.evidence, correction: correction.evidence },
  }, null, 2));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-legacy-oracle-capture.ts') ||
  invokedPath.endsWith('\\ai-dm-legacy-oracle-capture.ts') ||
  ((invokedPath.endsWith('/vite-node') || invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') || invokedPath.endsWith('\\vite-node.mjs')) &&
    process.argv.includes('--expected-commit'))
)) {
  await main();
}
