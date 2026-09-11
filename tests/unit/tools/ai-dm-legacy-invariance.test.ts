import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import type { AgentInvocation } from '../../../src/vtt/agent-session';
import { KB_SUBJECTS } from '../../../src/vtt/knowledge-base-contract';
import {
  captureLegacyAdviceProtocolSurface,
  LEGACY_ADVICE_ARENA_FIXTURE,
  type LegacyAdviceProtocolSurface,
} from '../../helpers/legacy-advice-surface';
import {
  authorizedRoundProposalHashInput,
  parseConversationArgs,
  runConversation,
  serializeConversationRow,
  type ConversationBoardSnapshotService,
  type ConversationRowPersisted,
} from '../../../tools/ai-dm-conversation';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { RoundTurnProposalEnvelope } from '../../../src/vtt/engine-envelopes';
import {
  DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
  SCRIPTED_PARTY_PLAN_FORMAT,
  SCRIPTED_PARTY_POLICY_VERSION,
} from '../../../src/vtt/scripted-party-round';
import {
  EncounterSessionJournal,
  importSavedSession,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import {
  captureLegacyRunnerComponents,
  type LegacyRunnerCapture,
} from '../../../tools/ai-dm-legacy-oracle-capture';
import type { BoardImageArtifact, BoardSnapshotCapture } from '../../../tools/ai-dm-board-snapshot';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { declareTestInputs } from '../../helpers/test-inputs';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  writeFileSync,
} from '../../helpers/test-filesystem';
import { readFile, readdir } from '../../helpers/test-filesystem-promises';

const legacyFixturePath = 'tests/fixtures/ai-dm-legacy/implicit-advice-v1.json' as const;
const runnerOraclePath = 'tests/fixtures/ai-dm-legacy/runner-oracle-main.json' as const;
const arenaFixturePath = 'tests/fixtures/arena-basis/seed-3943001.json' as const;
const legacyKbPaths = [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  ...KB_SUBJECTS.map((subject) => `tests/fixtures/ai-dm-kb/${subject}.md` as const),
] as const;
const inputs = declareTestInputs({
  fixtures: [
    legacyFixturePath,
    runnerOraclePath,
    arenaFixturePath,
    LEGACY_ADVICE_ARENA_FIXTURE,
    ...legacyKbPaths,
  ],
});

const APPROVED_COMMIT = '493121dd902e5033197d72f0050a1b8b8e32ae7c';
const APPROVED_TREE = '87de2ce5776d6194413d61f94b6a0debe2640707';
const CAPTURE_TOOL_PATH = 'tools/ai-dm-legacy-oracle-capture.ts';
const LEGACY_TIMING_FIELDS = [
  'endToEndWall',
  'timeToFirstAction',
  'wallPerCreature',
] as const satisfies readonly (keyof ConversationRowPersisted)[];
const testDirectory = mkdtempSync(join(tmpdir(), 'dnd-legacy-runner-invariance-'));

interface LockedBytes {
  readonly byteCount: number;
  readonly sha256: string;
  readonly base64: string;
}

interface LegacyRunnerOracle {
  readonly version: 'legacy-runner-oracle-v1';
  readonly provenance: {
    readonly repoCommit: typeof APPROVED_COMMIT;
    readonly tree: typeof APPROVED_TREE;
    readonly commandLine: readonly string[];
    readonly capturedAt: string;
    readonly nodeVersion: string;
    readonly checkoutRoot: string;
    readonly captureToolSha256: string;
    readonly trackedStatus: '';
    readonly untrackedAllowlist: readonly [typeof CAPTURE_TOOL_PATH];
    readonly timingFields: typeof LEGACY_TIMING_FIELDS;
  };
  readonly runs: {
    readonly primary: LegacyRunnerCapture;
    readonly correction: LegacyRunnerCapture;
  };
}

type Mutable<T> = { -readonly [Key in keyof T]: T[Key] };

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function mutableRecord(value: unknown, label: string): Record<string, unknown> {
  return record(value, label) as Record<string, unknown>;
}

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function lockedBytes(value: unknown, label: string): LockedBytes {
  const component = record(value, label);
  if (typeof component['byteCount'] !== 'number' || !Number.isSafeInteger(component['byteCount']) ||
    component['byteCount'] < 0 || typeof component['sha256'] !== 'string' ||
    typeof component['base64'] !== 'string') {
    throw new TypeError(`${label} is malformed.`);
  }
  const bytes = Buffer.from(component['base64'], 'base64');
  if (bytes.byteLength !== component['byteCount']) throw new TypeError(`${label} byte count differs.`);
  if (sha256(bytes) !== component['sha256']) throw new TypeError(`${label} digest differs.`);
  return {
    byteCount: component['byteCount'],
    sha256: component['sha256'],
    base64: component['base64'],
  };
}

function lockedText(value: unknown, label: string): string {
  return Buffer.from(lockedBytes(value, label).base64, 'base64').toString('utf8');
}

function validateCapture(value: unknown, label: string): LegacyRunnerCapture {
  const capture = record(value, label);
  lockedBytes(capture['rowJsonl'], `${label}.rowJsonl`);
  lockedBytes(capture['protectedPrimaryInvocation'], `${label}.protectedPrimaryInvocation`);
  const launchers = record(capture['launchers'], `${label}.launchers`);
  const expectedNames = [
    'room-1-round-1-correction-launcher-full.json',
    'room-1-round-1-correction-launcher.json',
    'room-1-round-1-initial-launcher-full.json',
    'room-1-round-1-initial-launcher.json',
  ];
  if (JSON.stringify(Object.keys(launchers).sort()) !== JSON.stringify(expectedNames)) {
    throw new TypeError(`${label} launcher inventory differs.`);
  }
  for (const name of expectedNames) lockedBytes(launchers[name], `${label}.launchers.${name}`);
  return capture as unknown as LegacyRunnerCapture;
}

function currentHead(): string {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: process.cwd(),
    encoding: 'utf8',
  }).trim();
}

function captureToolDigest(): string {
  return sha256(readFileSync(resolve(process.cwd(), CAPTURE_TOOL_PATH)));
}

function validateRunnerOracle(text: string | null): LegacyRunnerOracle {
  if (text === null) throw new TypeError('missing runner-oracle-main.json');
  const parsed = record(JSON.parse(text) as unknown, 'runner oracle');
  if (parsed['version'] !== 'legacy-runner-oracle-v1') {
    throw new TypeError('runner oracle is provisional or has an unsupported version');
  }
  const provenance = record(parsed['provenance'], 'runner oracle provenance');
  if (provenance['repoCommit'] !== APPROVED_COMMIT) throw new TypeError('runner oracle commit differs');
  if (provenance['tree'] !== APPROVED_TREE) throw new TypeError('runner oracle tree differs');
  if (provenance['repoCommit'] === currentHead()) throw new TypeError('runner oracle commit equals current HEAD');
  if (provenance['captureToolSha256'] !== captureToolDigest()) {
    throw new TypeError('runner oracle capture tool digest differs');
  }
  if (provenance['trackedStatus'] !== '') throw new TypeError('runner oracle tracked status is dirty');
  if (JSON.stringify(provenance['untrackedAllowlist']) !== JSON.stringify([CAPTURE_TOOL_PATH])) {
    throw new TypeError('runner oracle untracked allowlist differs');
  }
  if (JSON.stringify(provenance['timingFields']) !== JSON.stringify(LEGACY_TIMING_FIELDS)) {
    throw new TypeError('runner oracle timing fields differ');
  }
  if (!Array.isArray(provenance['commandLine']) ||
    !provenance['commandLine'].every((entry) => typeof entry === 'string') ||
    !provenance['commandLine'].includes('--expected-commit') ||
    !provenance['commandLine'].includes(APPROVED_COMMIT) ||
    provenance['commandLine'].includes('--provisional')) {
    throw new TypeError('runner oracle command line differs');
  }
  if (typeof provenance['capturedAt'] !== 'string' ||
    Number.isNaN(Date.parse(provenance['capturedAt']))) {
    throw new TypeError('runner oracle capture date is invalid');
  }
  if (typeof provenance['nodeVersion'] !== 'string' || !provenance['nodeVersion'].startsWith('v')) {
    throw new TypeError('runner oracle Node version is invalid');
  }
  if (typeof provenance['checkoutRoot'] !== 'string' || provenance['checkoutRoot'].length === 0) {
    throw new TypeError('runner oracle checkout root is invalid');
  }
  const runs = record(parsed['runs'], 'runner oracle runs');
  validateCapture(runs['primary'], 'runner oracle primary');
  validateCapture(runs['correction'], 'runner oracle correction');
  return parsed as unknown as LegacyRunnerOracle;
}

function runnerOracleText(): string {
  try {
    return inputs.fixtures.readText(runnerOraclePath);
  } catch {
    throw new TypeError('missing runner-oracle-main.json');
  }
}

function runnerOracle(): LegacyRunnerOracle {
  return validateRunnerOracle(runnerOracleText());
}

function legacyConfig(outPath: string, extra: readonly string[] = []) {
  return parseConversationArgs([
    '--fixtures', 'tests/fixtures/arena-basis',
    '--rooms', '1',
    '--rounds', '1',
    '--out', outPath,
    '--dry-run',
    ...extra,
  ]);
}

function explicitIncumbentArgs(): readonly string[] {
  return [
    '--cli', 'codex',
    '--model', 'gpt-5.6-sol',
    '--effort', 'medium',
    '--timeout-ms', '120000',
    '--transport', 'mcp_minimal',
    '--instruction-source', 'none',
    '--combat-model', 'initiative_segments_v1',
    '--initiative-profile', 'derived_v1',
    '--intel-mode', 'full',
    '--override-policy', 'typed_reason',
    '--renderer-profile', JSON.stringify(DEFAULT_RENDERER_PROFILE),
    '--board-image', 'off',
  ];
}

interface PrimaryEvidence {
  readonly capture: LegacyRunnerCapture;
  readonly invocation: AgentInvocation;
}

let primaryEvidencePromise: Promise<PrimaryEvidence> | null = null;
function primaryEvidence(): Promise<PrimaryEvidence> {
  primaryEvidencePromise ??= (async () => {
    const invocations: AgentInvocation[] = [];
    const capture = await captureLegacyRunnerComponents(
      legacyConfig(join(testDirectory, 'implicit.jsonl')),
      {
        repoCommit: APPROVED_COMMIT,
        clock: () => 0,
        onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
      },
    );
    const invocation = invocations[0];
    if (invocations.length !== 1 || invocation === undefined) {
      throw new TypeError(`Expected one primary invocation; received ${String(invocations.length)}.`);
    }
    return { capture, invocation };
  })();
  return primaryEvidencePromise;
}

let correctionCapturePromise: Promise<PrimaryEvidence> | null = null;
function correctionCapture(): Promise<PrimaryEvidence> {
  correctionCapturePromise ??= (async () => {
    const invocations: AgentInvocation[] = [];
    const capture = await captureLegacyRunnerComponents(
      legacyConfig(join(testDirectory, 'correction.jsonl')),
      {
        repoCommit: APPROVED_COMMIT,
        clock: () => 0,
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
        onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
      },
    );
    const invocation = invocations[0];
    if (invocations.length !== 1 || invocation === undefined) {
      throw new TypeError(`Expected one correction-run primary invocation; received ${String(invocations.length)}.`);
    }
    return { capture, invocation };
  })();
  return correctionCapturePromise;
}

let explicitIncumbentCapturePromise: Promise<LegacyRunnerCapture> | null = null;
function explicitIncumbentCapture(): Promise<LegacyRunnerCapture> {
  explicitIncumbentCapturePromise ??= captureLegacyRunnerComponents(
    legacyConfig(join(testDirectory, 'explicit.jsonl'), explicitIncumbentArgs()),
    { repoCommit: APPROVED_COMMIT, clock: () => 0 },
  );
  return explicitIncumbentCapturePromise;
}

function firstDifference(expected: unknown, actual: unknown, path: string): string | null {
  if (Object.is(expected, actual)) return null;
  if (Array.isArray(expected) && Array.isArray(actual)) {
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      const difference = firstDifference(expected[index], actual[index], `${path}[${String(index)}]`);
      if (difference !== null) return difference;
    }
    return null;
  }
  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) &&
    typeof actual === 'object' && actual !== null && !Array.isArray(actual)) {
    const expectedObject = expected as Readonly<Record<string, unknown>>;
    const actualObject = actual as Readonly<Record<string, unknown>>;
    const expectedKeys = Object.keys(expectedObject);
    const actualKeys = Object.keys(actualObject);
    const unexpected = actualKeys.filter((key) => !Object.hasOwn(expectedObject, key)).sort()[0];
    if (unexpected !== undefined) return `${path}.${unexpected}`;
    const missing = expectedKeys.filter((key) => !Object.hasOwn(actualObject, key)).sort()[0];
    if (missing !== undefined) return `${path}.${missing}`;
    const keys = expectedKeys.sort();
    for (const key of keys) {
      const difference = firstDifference(expectedObject[key], actualObject[key], `${path}.${key}`);
      if (difference !== null) return difference;
    }
    return null;
  }
  return path;
}

function expectExactJson(expectedText: string, actualText: string, path: string): void {
  if (expectedText === actualText) return;
  const expected = JSON.parse(expectedText) as unknown;
  const actual = JSON.parse(actualText) as unknown;
  throw new Error(`${firstDifference(expected, actual, path) ?? path} differs`);
}

function assertNoProperty(value: unknown, property: string, label: string, path = '$'): void {
  if (Array.isArray(value)) {
    for (const [index, entry] of value.entries()) {
      assertNoProperty(entry, property, label, `${path}[${String(index)}]`);
    }
    return;
  }
  if (typeof value !== 'object' || value === null) return;
  for (const [key, entry] of Object.entries(value)) {
    if (key === property) throw new Error(`${label} ${path}.${key}`);
    assertNoProperty(entry, property, label, `${path}.${key}`);
  }
}

function normalizeOracleRow(bytes: LockedBytes, label: string): string {
  const original = lockedText(bytes, label);
  if (!original.endsWith('\n') || original.includes('\r') || original.split('\n').length !== 2) {
    throw new TypeError(`${label} is not canonical one-row JSONL.`);
  }
  const expected = JSON.parse(original.slice(0, -1)) as Mutable<ConversationRowPersisted>;
  for (const field of LEGACY_TIMING_FIELDS) {
    const value = expected[field];
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      throw new TypeError(`${label} ${field} is not finite and non-negative.`);
    }
  }
  if (expected.endToEndWall <= 0 || expected.timeToFirstAction <= 0) {
    throw new TypeError(`${label} approved-main primary timing values must be positive.`);
  }
  expected.endToEndWall = 0;
  expected.timeToFirstAction = 0;
  expected.wallPerCreature = 0;
  return normalizeAcceptedIdentityFields(`${JSON.stringify(expected)}\n`, label);
}

function normalizeAcceptedIdentityFields(source: string, label: string): string {
  const row = mutableRecord(JSON.parse(source.slice(0, -1)) as unknown, label);
  const contextText = row['rawTurnContext'];
  if (typeof contextText !== 'string') throw new TypeError(`${label} rawTurnContext is absent.`);
  const context = mutableRecord(JSON.parse(contextText) as unknown, `${label} rawTurnContext`);
  const stateReference = mutableRecord(context['state_ref'], `${label} rawTurnContext.state_ref`);
  stateReference['state_handle'] = 'engine-state:<accepted-state-capsule-digest>';
  row['rawTurnContext'] = JSON.stringify(context);
  row['proposalId'] = '<independently-verified-proposal-id>';
  row['agentSessionDigestHash'] = '<independently-recomputed-agent-session-digest>';
  const stateBinding = mutableRecord(row['stateBinding'], `${label} stateBinding`);
  const capsuleBinding = mutableRecord(stateBinding['capsule'], `${label} stateBinding.capsule`);
  capsuleBinding['digest'] = '<accepted-state-capsule-digest>';
  const authorizationBinding = stateBinding['authorization'];
  if (authorizationBinding !== null) {
    mutableRecord(authorizationBinding, `${label} stateBinding.authorization`)['digest'] =
      '<accepted-authorization-capsule-digest>';
  }
  const teamPlans = mutableRecord(row['teamPlans'], `${label} teamPlans`);
  const monsters = teamPlans['monsters'];
  if (monsters !== null) {
    const monsterPlans = mutableRecord(monsters, `${label} teamPlans.monsters`);
    monsterPlans['initialProposalId'] = '<independently-verified-proposal-id>';
    monsterPlans['initialProposalHash'] = '<independently-recomputed-proposal-hash>';
  }
  return `${JSON.stringify(row)}\n`;
}

function normalizedCurrentRow(actualText: string, label: string): string {
  if (!actualText.endsWith('\n') || actualText.includes('\r') || actualText.split('\n').length !== 2) {
    throw new TypeError(`${label} is not canonical one-row JSONL.`);
  }
  const actual = mutableRecord(JSON.parse(actualText.slice(0, -1)) as unknown, `${label} actual`);
  for (const field of LEGACY_TIMING_FIELDS) actual[field] = 0;
  if (typeof actual['policyElapsedMs'] !== 'number' || !Number.isFinite(actual['policyElapsedMs']) ||
    actual['policyElapsedMs'] < 0) {
    throw new TypeError(`${label} policyElapsedMs is not finite and non-negative.`);
  }
  if (actual['roundWallBudgetMs'] !== 180_000 || actual['roundWallTimedOut'] !== false ||
    actual['speculationPlanner'] !== null || actual['escalationTrigger'] !== null) {
    throw new TypeError(`${label} accepted deadline/planner attribution differs.`);
  }
  const proposalId = actual['proposalId'];
  if (typeof proposalId !== 'string' ||
    !/^(?:round:[a-f0-9]{48}|engine-default:request:room-\d+-round-\d+)$/u.test(proposalId)) {
    throw new TypeError(`${label} proposalId is invalid.`);
  }
  const rawTurnContext = actual['rawTurnContext'];
  if (typeof rawTurnContext !== 'string' || record(
    JSON.parse(rawTurnContext) as unknown,
    `${label} rawTurnContext`,
  )['granularity'] !== 'full') {
    throw new TypeError(`${label} rawTurnContext is invalid.`);
  }
  for (const field of [
    'roundWallBudgetMs', 'roundWallTimedOut', 'policyElapsedMs', 'speculationPlanner', 'escalationTrigger',
  ] as const) delete actual[field];
  // These identity-bearing leaves are normalized only after the test independently
  // recomputes their producer contracts from proposal, context, plan, and journal evidence.
  return normalizeAcceptedIdentityFields(`${JSON.stringify(actual)}\n`, label);
}

function normalizedCurrentTimingRow(source: string, label: string): string {
  if (!source.endsWith('\n') || source.includes('\r') || source.split('\n').length !== 2) {
    throw new TypeError(`${label} is not canonical one-row JSONL.`);
  }
  const row = mutableRecord(JSON.parse(source.slice(0, -1)) as unknown, label);
  if (typeof row['policyElapsedMs'] !== 'number' || !Number.isFinite(row['policyElapsedMs']) ||
    row['policyElapsedMs'] < 0) {
    throw new TypeError(`${label} policyElapsedMs is not finite and non-negative.`);
  }
  row['policyElapsedMs'] = 0;
  return `${JSON.stringify(row)}\n`;
}

function roundProposal(value: unknown, label: string): RoundTurnProposalEnvelope {
  const proposal = record(value, label);
  if (proposal['kind'] !== 'round_turn_proposal' || typeof proposal['proposalId'] !== 'string' ||
    typeof proposal['stateDigest'] !== 'string' || typeof proposal['stateHandle'] !== 'string' ||
    typeof proposal['idempotencyKey'] !== 'string' || !Array.isArray(proposal['resolutions']) ||
    (proposal['phase'] !== 'initial' && proposal['phase'] !== 'correction')) {
    throw new TypeError(`${label} is not a round proposal.`);
  }
  return value as RoundTurnProposalEnvelope;
}

function submittedRoundProposals(evidence: PrimaryEvidence): readonly RoundTurnProposalEnvelope[] {
  const artifactRoot = dirname(evidence.invocation.launcherToken);
  return ['initial', 'correction'].flatMap((phase) => {
    const text = readFileSync(join(
      artifactRoot,
      `room-1-round-1-${phase}-proposals.jsonl`,
    ), 'utf8').trim();
    return text.length === 0
      ? []
      : text.split('\n').map((line, index) => roundProposal(
          JSON.parse(line) as unknown,
          `${phase} proposal ${String(index + 1)}`,
        ));
  });
}

interface RecomputedSessionEvidence {
  readonly row: ConversationRowPersisted;
  readonly digestHash: string;
}

async function recomputedSessionEvidence(
  name: 'primary' | 'correction',
): Promise<RecomputedSessionEvidence> {
  const result = await runConversation(
    legacyConfig(join(testDirectory, `recomputed-${name}.jsonl`)),
    {
      repoCommit: APPROVED_COMMIT,
      clock: () => 0,
      simulatedInProcessDispatchDelayMs: 0,
      ...(name === 'correction' ? {
        exhaustInitial: ['room-1-round-1'],
        failCorrection: ['room-1-round-1'],
      } : {}),
    },
  );
  const row = result.rows[0];
  if (result.rows.length !== 1 || row === undefined) {
    throw new TypeError(`${name} digest recomputation did not produce one row.`);
  }
  const store = new MemoryBrowserSessionStore();
  const sessionId = importSavedSession(store, result.journalExport);
  const digestHash = EncounterSessionJournal.resume(sessionId, store, new MemoryMirrorSink())
    .journal.agentSessionDigest().hash;
  expect(row.agentSessionDigestHash, `${name} row digest is derived from its exported journal`)
    .toBe(digestHash);
  return { row, digestHash };
}

function expectPartyPlanInvariants(row: Readonly<Record<string, unknown>>, label: string): void {
  const teamPlans = record(row['teamPlans'], `${label} teamPlans`);
  const party = record(teamPlans['party'], `${label} teamPlans.party`);
  const programsValue = party['programs'];
  if (!Array.isArray(programsValue) || typeof party['sharedObjective'] !== 'string') {
    throw new TypeError(`${label} party plan is malformed.`);
  }
  for (const [index, value] of programsValue.entries()) {
    const program = record(value, `${label} teamPlans.party.programs[${String(index)}]`);
    expect(program['programHash'], `${label} party program ${String(index)} hash`)
      .toBe(sha256(canonicalJson(program['program'])));
  }
  const policyHash = sha256(canonicalJson({
    version: SCRIPTED_PARTY_POLICY_VERSION,
    decisionPolicy: DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
    controller: 'symmetric-pc-evaluator-v1',
    legalActionsProviderId: 'regret-turn-legal-actions-v1',
    sharedObjective: party['sharedObjective'],
  }));
  expect(row['partyPolicyHash'], `${label} party policy hash`).toBe(policyHash);
  const planHash = sha256(canonicalJson({
    format: SCRIPTED_PARTY_PLAN_FORMAT,
    policyVersion: SCRIPTED_PARTY_POLICY_VERSION,
    decisionPolicy: DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
    round: row['round'],
    sharedObjective: party['sharedObjective'],
    policyHash,
    programs: programsValue,
  }));
  expect(party['planHash'], `${label} party plan hash`).toBe(planHash);
  expect(party['planId'], `${label} party plan id`).toBe(`party-plan:${planHash.slice(0, 48)}`);
}

function expectIndependentCurrentRowInvariants(input: {
  readonly actualText: string;
  readonly evidence: PrimaryEvidence;
  readonly recomputed: RecomputedSessionEvidence;
  readonly expectedAuthorization: Readonly<{ readonly revision: number; readonly digest: string }> | null;
  readonly label: string;
}): Readonly<{ readonly revision: number; readonly digest: string }> {
  const row = record(JSON.parse(input.actualText.slice(0, -1)) as unknown, input.label);
  const contextText = row['rawTurnContext'];
  if (typeof contextText !== 'string') throw new TypeError(`${input.label} raw context is absent.`);
  const context = record(JSON.parse(contextText) as unknown, `${input.label} raw context`);
  const stateReference = record(context['state_ref'], `${input.label} raw context state_ref`);
  const stateBinding = record(row['stateBinding'], `${input.label} stateBinding`);
  const capsule = record(stateBinding['capsule'], `${input.label} stateBinding.capsule`);
  expect(stateReference, `${input.label} raw context binds the persisted capsule`).toMatchObject({
    run_id: 'encounter:ai-dm-conversation',
    expected_revision: capsule['revision'],
    state_handle: `engine-state:${String(capsule['digest'])}`,
  });
  expect(row['agentSessionDigestHash'], `${input.label} session digest matches an independently exported journal`)
    .toBe(input.recomputed.digestHash);
  expect(input.recomputed.row.agentSessionDigestHash, `${input.label} independent row retains recomputed digest`)
    .toBe(input.recomputed.digestHash);
  expectPartyPlanInvariants(row, input.label);

  const proposalId = row['proposalId'];
  if (typeof proposalId !== 'string') throw new TypeError(`${input.label} proposal id is absent.`);
  const teamPlans = record(row['teamPlans'], `${input.label} teamPlans`);
  const monsters = record(teamPlans['monsters'], `${input.label} teamPlans.monsters`);
  const authorizedProposals = monsters['authorizedProposals'];
  const authorizedPlan = row['authorizedPlan'];
  if (!Array.isArray(authorizedProposals) || !Array.isArray(authorizedPlan)) {
    throw new TypeError(`${input.label} authorized monster plan is malformed.`);
  }
  expect(monsters['initialProposalId'], `${input.label} team proposal id`).toBe(proposalId);
  expect(authorizedProposals, `${input.label} team proposals match the persisted authorized plan`).toEqual(
    authorizedPlan.map((value, index) => {
      const plan = record(value, `${input.label} authorizedPlan[${String(index)}]`);
      const accepted = record(
        plan['acceptedProposal'],
        `${input.label} authorizedPlan[${String(index)}].acceptedProposal`,
      );
      return {
        actorId: accepted['actor_id'],
        expectedRevision: accepted['expected_revision'],
        primaryOptionId: accepted['primary_option_id'],
        fallbackOptionId: accepted['fallback_option_id'],
        reason: accepted['reason'],
        ...(row['planner'] === 'engine_default'
          ? { activationChoice: accepted['activation_choice'] ?? null }
          : {}),
        overrideJustification: accepted['override_justification'],
      };
    }),
  );
  const submitted = submittedRoundProposals(input.evidence).find((proposal) =>
    proposal.proposalId === proposalId);
  if (submitted === undefined) {
    expect(proposalId, `${input.label} deterministic proposal id`)
      .toBe('engine-default:request:room-1-round-1');
    expect(monsters['initialProposalHash'], `${input.label} deterministic proposal hash`)
      .toBe(sha256(canonicalJson(authorizedProposals)));
    if (input.expectedAuthorization === null) {
      throw new TypeError(`${input.label} deterministic proposal lacks independent authorization evidence.`);
    }
    expect(stateBinding['authorization'], `${input.label} deterministic authorization binding`)
      .toEqual(input.expectedAuthorization);
    return input.expectedAuthorization;
  }

  const recomputedProposalId = `round:${sha256(canonicalJson({
    digest: submitted.stateDigest,
    key: submitted.idempotencyKey,
    valid: submitted.resolutions,
    reactionGuidance: submitted.reactionGuidance,
  })).slice(0, 48)}`;
  expect(proposalId, `${input.label} proposal id recomputed from submitted engine evidence`)
    .toBe(recomputedProposalId);
  expect(monsters['initialProposalHash'], `${input.label} proposal hash recomputed from submitted engine evidence`)
    .toBe(sha256(authorizedRoundProposalHashInput(submitted)));
  expect(authorizedProposals, `${input.label} team proposals preserve submitted resolutions`).toEqual(
    submitted.resolutions.map((resolution) => resolution.proposal),
  );
  const authorization = { revision: submitted.expectedRevision, digest: submitted.stateDigest };
  expect(stateBinding['authorization'], `${input.label} authorization binds the submitted proposal`)
    .toEqual(authorization);
  return authorization;
}

function normalizedLegacyLauncher(source: string, expectedSource: string, filename: string): string {
  const manifest = mutableRecord(JSON.parse(source) as unknown, filename);
  const expected = record(JSON.parse(expectedSource) as unknown, `${filename} approved oracle`);
  const dispatchId = manifest['dispatchId'];
  const dispatchPhase = filename.includes('-correction-') ? 'correction' : 'primary';
  const expectedReadinessPath = filename.endsWith('-launcher-full.json')
    ? filename.replace('-launcher-full.json', '-recovery-engine-readiness.jsonl')
    : filename.replace('-launcher.json', '-engine-readiness.jsonl');
  if (typeof dispatchId !== 'string' ||
    !/^engine-dispatch:[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(dispatchId) ||
    manifest['dispatchPhase'] !== dispatchPhase || manifest['readinessSpoolPath'] !== expectedReadinessPath ||
    isAbsolute(expectedReadinessPath)) {
    throw new TypeError(`${filename} D569 dispatch evidence is invalid.`);
  }
  const offerEnvironment = record(manifest['offerEnvironment'], `${filename} offerEnvironment`);
  if (offerEnvironment['format'] !== 'engine-option-environment-v1' ||
    offerEnvironment['mode'] !== 'legacy_standard' ||
    typeof offerEnvironment['digest'] !== 'string' || !/^[a-f0-9]{64}$/u.test(offerEnvironment['digest'])) {
    throw new TypeError(`${filename} offer environment is invalid.`);
  }
  delete manifest['dispatchId'];
  delete manifest['dispatchPhase'];
  delete manifest['readinessSpoolPath'];
  delete manifest['offerEnvironment'];
  if (filename.endsWith('-launcher-full.json')) {
    for (const field of ['proposalSpoolPath', 'turnContextSpoolPath'] as const) {
      const path = manifest[field];
      if (typeof path !== 'string' || !path.includes('-recovery-')) {
        throw new TypeError(`${filename} ${field} is not recovery-isolated.`);
      }
      manifest[field] = expected[field];
    }
  }
  const projection = mutableRecord(manifest['initiativeProjection'], `${filename} initiativeProjection`);
  const timeline = mutableRecord(projection['timeline'], `${filename} initiativeProjection.timeline`);
  const expectedProjection = record(expected['initiativeProjection'], `${filename} approved initiativeProjection`);
  const expectedTimeline = record(expectedProjection['timeline'], `${filename} approved initiativeProjection.timeline`);
  if (!Array.isArray(timeline['branchPoints']) || !Array.isArray(expectedTimeline['branchPoints'])) {
    throw new TypeError(`${filename} initiative branch points are invalid.`);
  }
  timeline['branchPoints'] = expectedTimeline['branchPoints'];
  const deltaBase = manifest['turnContextDeltaBase'];
  const expectedDeltaBase = expected['turnContextDeltaBase'];
  if (deltaBase !== undefined && expectedDeltaBase !== undefined) {
    const stateRef = mutableRecord(
      mutableRecord(deltaBase, `${filename} turnContextDeltaBase`)['context'],
      `${filename} turnContextDeltaBase.context`,
    );
    const stateReference = mutableRecord(stateRef['state_ref'], `${filename} turnContextDeltaBase state_ref`);
    const expectedStateReference = record(
      record(record(expectedDeltaBase, `${filename} approved turnContextDeltaBase`)['context'],
        `${filename} approved turnContextDeltaBase.context`)['state_ref'],
      `${filename} approved turnContextDeltaBase state_ref`,
    );
    if (typeof stateReference['state_handle'] !== 'string' ||
      !/^engine-state:[a-f0-9]{64}$/u.test(stateReference['state_handle'])) {
      throw new TypeError(`${filename} turn-context delta state handle is invalid.`);
    }
    stateReference['state_handle'] = expectedStateReference['state_handle'];
  }
  return JSON.stringify(manifest);
}

function dimensionedPng(identity: string): Buffer {
  const png = Buffer.alloc(96);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(png);
  png.writeUInt32BE(1, 16);
  png.writeUInt32BE(1, 20);
  Buffer.from(identity, 'utf8').subarray(0, 72).copy(png, 24);
  return png;
}

class FakeAdviceSnapshotService implements ConversationBoardSnapshotService {
  readonly outputDirectory = mkdtempSync(join(tmpdir(), 'legacy-advice-images-'));

  async capture(input: BoardSnapshotCapture): Promise<BoardImageArtifact> {
    const png = dimensionedPng(input.source.stateDigest);
    const digest = sha256(png);
    const relativePath = `board-images/${digest}.png` as const;
    mkdirSync(join(this.outputDirectory, 'board-images'), { recursive: true });
    writeFileSync(join(this.outputDirectory, relativePath), png);
    const html = Buffer.from('<!doctype html><html lang="en"><body>legacy advice</body></html>\n');
    const htmlDigest = sha256(html);
    const htmlRelativePath = `board-html/${htmlDigest}/board.html` as const;
    mkdirSync(join(this.outputDirectory, 'board-html', htmlDigest), { recursive: true });
    writeFileSync(join(this.outputDirectory, htmlRelativePath), html);
    return {
      version: 'arena-board-image-v1',
      audience: 'dm',
      mimeType: 'image/png',
      relativePath,
      sha256: digest,
      bytes: png.byteLength,
      width: 1,
      height: 1,
      capturedAtUnixMs: Date.now(),
      captureMs: 1,
      source: { ...input.source },
      chromiumVersion: 'SIMULATED Chromium',
      html: { relativePath: htmlRelativePath, sha256: htmlDigest, bytes: html.byteLength },
    };
  }

  async close(): Promise<void> {}
}

interface ExplicitAdviceEvidence {
  readonly row: ConversationRowPersisted;
  readonly launcherTexts: readonly string[];
}

let explicitAdviceEvidencePromise: Promise<ExplicitAdviceEvidence> | null = null;
function explicitAdviceEvidence(): Promise<ExplicitAdviceEvidence> {
  explicitAdviceEvidencePromise ??= (async () => {
    const service = new FakeAdviceSnapshotService();
    const invocations: AgentInvocation[] = [];
    const result = await runConversation(
      legacyConfig(join(testDirectory, 'explicit-advice.jsonl'), ['--dm-mode', 'advice']),
      {
        repoCommit: APPROVED_COMMIT,
        clock: () => 0,
        boardSnapshotService: service,
        onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
      },
    );
    const invocation = invocations[0];
    const row = result.rows[0];
    if (invocations.length !== 1 || invocation === undefined || row === undefined) {
      throw new TypeError('Explicit advice runner did not produce one invocation and one row.');
    }
    const artifactRoot = dirname(invocation.launcherToken);
    const launcherNames = (await readdir(artifactRoot))
      .filter((name) => name.includes('-launcher') && name.endsWith('.json'))
      .sort();
    const launcherTexts = await Promise.all(launcherNames.map((name) =>
      readFile(join(artifactRoot, name), 'utf8')));
    return { row, launcherTexts };
  })();
  return explicitAdviceEvidencePromise;
}

type LockedComponentName = keyof LegacyAdviceProtocolSurface | 'row';

function lockedFixture(): Readonly<Record<LockedComponentName, LockedBytes>> {
  const root = record(JSON.parse(inputs.fixtures.readText(legacyFixturePath)) as unknown, 'legacy fixture');
  if (root['version'] !== 'legacy-implicit-advice-v1') {
    throw new TypeError('Legacy advice fixture has an unsupported version.');
  }
  const components = record(root['components'], 'legacy fixture components');
  const names = [
    'startupInstructions', 'initialPrompt', 'tools', 'resources', 'prompts', 'context', 'row',
  ] as const satisfies readonly LockedComponentName[];
  return Object.fromEntries(names.map((name) => {
    const component = record(components[name], `legacy fixture ${name}`);
    if (typeof component['byteCount'] !== 'number' || typeof component['sha256'] !== 'string' ||
      typeof component['base64'] !== 'string') {
      throw new TypeError(`Legacy fixture ${name} is malformed.`);
    }
    return [name, {
      byteCount: component['byteCount'],
      sha256: component['sha256'],
      base64: component['base64'],
    }];
  })) as Readonly<Record<LockedComponentName, LockedBytes>>;
}

function expectLockedBytes(actual: LegacyAdviceProtocolSurface): void {
  const expected = lockedFixture();
  for (const name of Object.keys(actual) as (keyof LegacyAdviceProtocolSurface)[]) {
    const expectedBytes = Buffer.from(expected[name].base64, 'base64');
    const expectedText = expectedBytes.toString('utf8');
    const expectedRoot = expectedText.match(/\/home\/vagrant\/PhpstormProjects\/[^/]+/u)?.[0];
    const expectedWorkspace = expectedText.match(/dnd-wt-[A-Za-z0-9_-]+/u)?.[0];
    const rooted = expectedRoot === undefined
      ? actual[name]
      : actual[name].replaceAll(process.cwd(), expectedRoot);
    const rootedAndNamed = expectedWorkspace === undefined
      ? rooted
      : rooted.replaceAll(basename(process.cwd()), expectedWorkspace);
    const digestPattern = /[a-f0-9]{64}|[a-f0-9]{48}/gu;
    const actualDigests = [...rootedAndNamed.matchAll(digestPattern)].map((match) => match[0]);
    const expectedDigests = [...expectedText.matchAll(digestPattern)].map((match) => match[0]);
    if (actualDigests.length !== expectedDigests.length) {
      throw new TypeError(`${name} digest identity inventory differs.`);
    }
    const digestMapping = new Map<string, string>();
    for (const [index, digest] of actualDigests.entries()) {
      const expectedDigest = expectedDigests[index];
      if (expectedDigest === undefined ||
        digestMapping.has(digest) && digestMapping.get(digest) !== expectedDigest) {
        throw new TypeError(`${name} digest identity correlation differs.`);
      }
      digestMapping.set(digest, expectedDigest);
    }
    const actualBytes = Buffer.from(rootedAndNamed.replace(
      digestPattern,
      (digest) => digestMapping.get(digest) ?? digest,
    ), 'utf8');
    expect(actualBytes, `${name} bytes`).toEqual(expectedBytes);
    expect(actualBytes.byteLength, `${name} byte count`).toBe(expected[name].byteCount);
    expect(createHash('sha256').update(actualBytes).digest('hex'), `${name} digest`)
      .toBe(expected[name].sha256);
  }
}

const primaryRunnerCapture = primaryEvidence();
const correctionRunnerCapture = primaryRunnerCapture.then(async () => correctionCapture());
const explicitIncumbentRunnerCapture = correctionRunnerCapture.then(async () => explicitIncumbentCapture());
const explicitAdviceRunnerCapture = explicitIncumbentRunnerCapture.then(async () => explicitAdviceEvidence());
const runnerCapturePromises = {
  primary: primaryRunnerCapture,
  correction: correctionRunnerCapture,
  explicitIncumbent: explicitIncumbentRunnerCapture,
  explicitAdvice: explicitAdviceRunnerCapture,
} as const;
await Promise.all(Object.values(runnerCapturePromises));

describe('D569 implicit advice legacy invariance', () => {
  it('locks the no-flag startup, prompt, tool, resource, context, and row bytes', async () => {
    const surface = await captureLegacyAdviceProtocolSurface(process.cwd());
    const lockedRow = Buffer.from(lockedFixture().row.base64, 'base64').toString('utf8');
    const parsedRow = JSON.parse(lockedRow) as ConversationRowPersisted;

    expectLockedBytes(surface);
    expect(serializeConversationRow(parsedRow)).toBe(lockedRow);
    expect(record(parsedRow as unknown, 'legacy row')).not.toHaveProperty('dmMode');
  });

  it('keeps implicit and explicit incumbent configs equal except outPath while retaining internal advice mode metadata', () => {
    const directory = mkdtempSync(join(tmpdir(), 'dnd-legacy-advice-explicit-'));
    const implicit = parseConversationArgs([
      '--out', join(directory, 'implicit.jsonl'),
      '--dry-run',
    ]);
    const explicit = parseConversationArgs([
      '--out', join(directory, 'explicit.jsonl'),
      '--dry-run',
      ...explicitIncumbentArgs(),
    ]);
    const normalizeOutput = <T extends { readonly outPath: string }>(config: T): T => ({
      ...config,
      outPath: '<legacy-output>',
    });

    expect(normalizeOutput(implicit)).toEqual(normalizeOutput(explicit));
    expect(implicit.dmMode).toBe('advice');
    expect(implicit.dmModeExplicit).toBe(false);
    expect(explicit.dmMode).toBe('advice');
    expect(explicit.dmModeExplicit).toBe(false);
  });

  it('refuses every runner oracle except the clean approved main 493121dd capture', () => {
    const text = runnerOracleText();
    expect(() => validateRunnerOracle(null)).toThrow('missing runner-oracle-main.json');
    const approved = validateRunnerOracle(text);
    const source = JSON.parse(text) as unknown;
    const clone = (): Record<string, unknown> =>
      mutableRecord(JSON.parse(JSON.stringify(source)) as unknown, 'runner oracle clone');
    const withProvenance = (
      mutation: Readonly<Record<string, unknown>>,
    ): string => {
      const candidate = clone();
      candidate['provenance'] = {
        ...record(candidate['provenance'], 'runner oracle clone provenance'),
        ...mutation,
      };
      return JSON.stringify(candidate);
    };
    const provisional = clone();
    provisional['version'] = 'legacy-runner-oracle-provisional-v1';

    expect(() => validateRunnerOracle(JSON.stringify(provisional))).toThrow('provisional');
    expect(() => validateRunnerOracle(withProvenance({ repoCommit: '0000000000000000000000000000000000000000' })))
      .toThrow('commit differs');
    expect(() => validateRunnerOracle(withProvenance({ tree: '0000000000000000000000000000000000000000' })))
      .toThrow('tree differs');
    expect(() => validateRunnerOracle(withProvenance({ captureToolSha256: '0'.repeat(64) })))
      .toThrow('capture tool digest differs');
    expect(() => validateRunnerOracle(withProvenance({ repoCommit: currentHead() })))
      .toThrow('commit differs');
    expect(approved.provenance.repoCommit).not.toBe(currentHead());
  });

  describe('approved-main row comparison', () => {
    it('matches approved-main rows after timing and independently verified binding-identity normalization', async () => {
      const [primary, correction, recomputedPrimary, recomputedCorrection] = await Promise.all([
        runnerCapturePromises.primary,
        runnerCapturePromises.correction,
        recomputedSessionEvidence('primary'),
        recomputedSessionEvidence('correction'),
      ]);
      const primaryText = lockedText(primary.capture.rowJsonl, 'blind replay primary row');
      const primaryAuthorization = expectIndependentCurrentRowInvariants({
        actualText: primaryText,
        evidence: primary,
        recomputed: recomputedPrimary,
        expectedAuthorization: null,
        label: 'blind replay primary row',
      });
      const correctionText = lockedText(correction.capture.rowJsonl, 'blind replay correction row');
      expectIndependentCurrentRowInvariants({
        actualText: correctionText,
        evidence: correction,
        recomputed: recomputedCorrection,
        expectedAuthorization: primaryAuthorization,
        label: 'blind replay correction row',
      });

      const oracle = runnerOracle();
      for (const [name, expectedCapture, actual] of [
        ['primary', oracle.runs.primary, primaryText],
        ['correction', oracle.runs.correction, correctionText],
      ] as const) {
        const expected = normalizeOracleRow(expectedCapture.rowJsonl, `runner oracle ${name} row`);
        const normalized = normalizedCurrentRow(actual, `blind replay ${name} row`);
        expectExactJson(expected.slice(0, -1), normalized.slice(0, -1), 'row[0]');
        expect(normalized, `${name} canonical transformed JSONL`).toBe(expected);
      }
    });
  });

  describe('literal incumbent-default runner comparison', () => {
    it('keeps explicit incumbent-default persisted JSONL literally identical to no-flag JSONL', async () => {
      const [implicit, explicit] = await Promise.all([
        runnerCapturePromises.primary,
        runnerCapturePromises.explicitIncumbent,
      ]);
      const implicitText = lockedText(implicit.capture.rowJsonl, 'implicit row');
      const explicitText = lockedText(explicit.rowJsonl, 'explicit incumbent-default row');

      expect(normalizedCurrentTimingRow(explicitText, 'explicit incumbent-default row'))
        .toBe(normalizedCurrentTimingRow(implicitText, 'implicit incumbent-default row'));
      expect(explicitText.endsWith('\n')).toBe(true);
      expect(explicitText.split('\n')).toHaveLength(2);
    });
  });

  describe('approved-main initial launcher comparison', () => {
    it('matches initial launchers across distinct checkouts modulo only the frozen root inventory and contains no dmMode', async () => {
      const actual = (await runnerCapturePromises.primary).capture;
      const oracle = runnerOracle();
      expect(oracle.provenance.checkoutRoot).not.toBe(realpathSync(process.cwd()));
      for (const name of [
        'room-1-round-1-initial-launcher.json',
        'room-1-round-1-initial-launcher-full.json',
      ]) {
        const expectedText = lockedText(oracle.runs.primary.launchers[name], `oracle ${name}`);
        const capturedText = lockedText(actual.launchers[name], `blind replay ${name}`);
        const actualText = normalizedLegacyLauncher(capturedText, expectedText, name);
        const diagnostic = name.endsWith('-launcher.json')
          ? 'initial-launcher.json'
          : 'initial-launcher-full.json';
        assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', diagnostic);
        expectExactJson(expectedText, actualText, diagnostic);
        expect(actualText, name).toBe(expectedText);
      }
    });
  });

  describe('approved-main correction launcher comparison', () => {
    it('enters correction and matches every approved-main correction launcher manifest without dmMode at any depth', async () => {
      const actual = (await runnerCapturePromises.correction).capture;
      const oracle = runnerOracle();
      const actualRow = record(
        JSON.parse(lockedText(actual.rowJsonl, 'blind correction row').slice(0, -1)) as unknown,
        'blind correction row',
      );
      const roundTotals = record(actualRow['roundTotals'], 'blind correction round totals');
      expect(roundTotals['correctionCalls']).toBe(1);
      for (const name of [
        'room-1-round-1-correction-launcher.json',
        'room-1-round-1-correction-launcher-full.json',
      ]) {
        const expectedText = lockedText(oracle.runs.correction.launchers[name], `oracle ${name}`);
        const capturedText = lockedText(actual.launchers[name], `blind replay ${name}`);
        const actualText = normalizedLegacyLauncher(capturedText, expectedText, name);
        const diagnostic = name.endsWith('-launcher.json')
          ? 'correction-launcher.json'
          : 'correction-launcher-full.json';
        assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', diagnostic);
        expectExactJson(expectedText, actualText, diagnostic);
        expect(actualText, name).toBe(expectedText);
      }
    });

    it('keeps correction readiness evidence launcher-relative with no captured absolute root', async () => {
      const actual = (await runnerCapturePromises.correction).capture;
      for (const [name, expectedPath] of [
        ['room-1-round-1-correction-launcher.json', 'room-1-round-1-correction-engine-readiness.jsonl'],
        ['room-1-round-1-correction-launcher-full.json', 'room-1-round-1-correction-recovery-engine-readiness.jsonl'],
      ] as const) {
        const manifest = record(JSON.parse(lockedText(actual.launchers[name], name)) as unknown, name);
        expect(manifest['readinessSpoolPath']).toBe(expectedPath);
        expect(isAbsolute(String(manifest['readinessSpoolPath']))).toBe(false);
      }
    });
  });

  describe('approved-main protected invocation comparison', () => {
    it('matches protected primary invocation across checkouts modulo exact KB instruction roots and emits no undeclared config keys', async () => {
      const actual = await runnerCapturePromises.primary;
      const oracle = runnerOracle();
      expect(oracle.provenance.checkoutRoot).not.toBe(realpathSync(process.cwd()));
      const expectedText = lockedText(
        oracle.runs.primary.protectedPrimaryInvocation,
        'oracle protected primary invocation',
      );
      const actualText = lockedText(
        actual.capture.protectedPrimaryInvocation,
        'blind protected primary invocation',
      );
      expectExactJson(expectedText, actualText, 'protectedPrimaryInvocation');
      expect(actualText).toBe(expectedText);
      expect(Object.keys(actual.invocation).sort()).toEqual([
        'callPhase',
        'engineDispatchId',
        'freshSessionContext',
        'instructionSource',
        'instructions',
        'launcherToken',
        'model',
        'output',
        'prompt',
        'reasoningEffort',
        'recoveryEngineDispatchId',
        'recoveryLauncherToken',
        'runId',
        'sessionProfile',
        'skill',
        'timeoutMs',
      ]);
      assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', 'protectedPrimaryInvocation');
    });
  });

  describe('explicit advice runner capture', () => {
    it('threads dmMode advice only when the mode flag is explicit', async () => {
      const evidence = await runnerCapturePromises.explicitAdvice;
      expect(evidence.row.dmMode).toBe('advice');
      const { launcherTexts } = evidence;
      expect(launcherTexts).toHaveLength(4);
      for (const [index, text] of launcherTexts.entries()) {
        const launcher = record(JSON.parse(text) as unknown, `explicit advice launcher ${String(index)}`);
        expect(launcher['dmMode'], `explicit advice launcher ${String(index)}`).toBe('advice');
      }
    });
  });
});
