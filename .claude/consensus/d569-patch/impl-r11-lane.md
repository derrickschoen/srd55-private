Implemented the R11 correction without copying oracle values into actual captures.

### Resolution

Only [ai-dm-legacy-invariance.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-legacy-invariance.test.ts:312) changed during R11.

- Removed the five-field copy-from-expected substitution.
- Added independent invariants for:
  - `proposalId`: recomputed from submitted engine proposal evidence.
  - `rawTurnContext`: exact legacy comparison except its independently verified capsule handle.
  - `agentSessionDigestHash`: recomputed from an independently exported and restored session journal.
  - `stateBinding`: tied to the context capsule and submitted proposal authorization evidence.
  - `teamPlans`: program, policy, plan, and proposal hashes recomputed; authorized proposals compared field-by-field.
- Identity normalization now occurs only after those invariants pass.
- Preserved the accepted `policyElapsedMs`-only timing normalization.
- Serialized the four legacy MCP captures after an observed `Engine MCP child stdout closed` race; inputs and assertions are unchanged.

### `openActors` explanation

`adjustments[0].openActors` never differed. The diagnostic helper returned the current path after successfully comparing equal arrays and objects. Once any later field differed, it falsely reported the first array encountered.

The substitution made the complete strings equal, bypassing `firstDifference`; removing it exposed that dormant diagnostic defect. Returning `null` after successful recursive comparison fixed it. The first genuine difference was then correctly reported as `agentSessionDigestHash`.

### Assertion changes

No existing `expect(...)` was replaced during R11. The retained R10 row normalization assertion is now preceded by 17 independent assertions covering:

- journal-derived session digests;
- party program, policy, plan hashes, and plan ID;
- raw-context/capsule binding;
- team proposal ID and field-by-field authorized-plan equivalence;
- deterministic-default proposal ID/hash;
- submitted proposal ID/hash and resolutions;
- authorization binding.

The previously accepted replacement:

```ts
expect(explicitText).toBe(implicitText)
```

remains the `policyElapsedMs`-only normalized comparison, unchanged during R11.

### Verification

- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Added-line prohibited-pattern audit — exit 0, zero matches.
- `npx vitest run --configLoader runner tests/unit/tools/ai-dm-legacy-invariance.test.ts`
  - Run 1: exit 0, 1 file / 10 tests passed, 52.55s.
  - Run 2: exit 0, 1 file / 10 tests passed, 51.49s.
  - Run 3: exit 0, 1 file / 10 tests passed, 50.24s.
- `npx vitest run --configLoader runner tests/integration/vtt/ai-dm-combat-model.test.ts`
  - Exit 0, 1 file / 2 tests passed, 27.52s.
- 21-file cumulative command:
  - Exit 0, 21 files / 498 tests passed, 602.80s.
  - Full output: `.tmp/d569-r11-cumulative-21.log`.

Frozen contract SHA-256 remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. No pins were regenerated.

D569 R11 DONE
diff --git a/tests/unit/tools/ai-dm-legacy-invariance.test.ts b/tests/unit/tools/ai-dm-legacy-invariance.test.ts
index a7ec9518e89923204f3cb96d232d492a5b7d5f20..b7f5dbc208b351dd69e76dd861555907659c4d16
--- a/tests/unit/tools/ai-dm-legacy-invariance.test.ts
+++ b/tests/unit/tools/ai-dm-legacy-invariance.test.ts
@@ -11,13 +11,27 @@
   type LegacyAdviceProtocolSurface,
 } from '../../helpers/legacy-advice-surface';
 import {
+  authorizedRoundProposalHashInput,
   parseConversationArgs,
   runConversation,
   serializeConversationRow,
   type ConversationBoardSnapshotService,
   type ConversationRowPersisted,
 } from '../../../tools/ai-dm-conversation';
+import { canonicalJson } from '../../../src/commands/canonical-json';
+import type { RoundTurnProposalEnvelope } from '../../../src/vtt/engine-envelopes';
 import {
+  DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
+  SCRIPTED_PARTY_PLAN_FORMAT,
+  SCRIPTED_PARTY_POLICY_VERSION,
+} from '../../../src/vtt/scripted-party-round';
+import {
+  EncounterSessionJournal,
+  importSavedSession,
+  MemoryBrowserSessionStore,
+  MemoryMirrorSink,
+} from '../../../src/vtt/session-persistence';
+import {
   captureLegacyRunnerComponents,
   type LegacyRunnerCapture,
 } from '../../../tools/ai-dm-legacy-oracle-capture';
@@ -263,17 +277,26 @@
   return primaryEvidencePromise;
 }
 
-let correctionCapturePromise: Promise<LegacyRunnerCapture> | null = null;
-function correctionCapture(): Promise<LegacyRunnerCapture> {
-  correctionCapturePromise ??= captureLegacyRunnerComponents(
-    legacyConfig(join(testDirectory, 'correction.jsonl')),
-    {
-      repoCommit: APPROVED_COMMIT,
-      clock: () => 0,
-      exhaustInitial: ['room-1-round-1'],
-      failCorrection: ['room-1-round-1'],
-    },
-  );
+let correctionCapturePromise: Promise<PrimaryEvidence> | null = null;
+function correctionCapture(): Promise<PrimaryEvidence> {
+  correctionCapturePromise ??= (async () => {
+    const invocations: AgentInvocation[] = [];
+    const capture = await captureLegacyRunnerComponents(
+      legacyConfig(join(testDirectory, 'correction.jsonl')),
+      {
+        repoCommit: APPROVED_COMMIT,
+        clock: () => 0,
+        exhaustInitial: ['room-1-round-1'],
+        failCorrection: ['room-1-round-1'],
+        onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
+      },
+    );
+    const invocation = invocations[0];
+    if (invocations.length !== 1 || invocation === undefined) {
+      throw new TypeError(`Expected one correction-run primary invocation; received ${String(invocations.length)}.`);
+    }
+    return { capture, invocation };
+  })();
   return correctionCapturePromise;
 }
 
@@ -294,7 +317,7 @@
       const difference = firstDifference(expected[index], actual[index], `${path}[${String(index)}]`);
       if (difference !== null) return difference;
     }
-    return path;
+    return null;
   }
   if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) &&
     typeof actual === 'object' && actual !== null && !Array.isArray(actual)) {
@@ -311,7 +334,7 @@
       const difference = firstDifference(expectedObject[key], actualObject[key], `${path}.${key}`);
       if (difference !== null) return difference;
     }
-    return path;
+    return null;
   }
   return path;
 }
@@ -355,15 +378,42 @@
   expected.endToEndWall = 0;
   expected.timeToFirstAction = 0;
   expected.wallPerCreature = 0;
-  return `${JSON.stringify(expected)}\n`;
+  return normalizeAcceptedIdentityFields(`${JSON.stringify(expected)}\n`, label);
+}
+
+function normalizeAcceptedIdentityFields(source: string, label: string): string {
+  const row = mutableRecord(JSON.parse(source.slice(0, -1)) as unknown, label);
+  const contextText = row['rawTurnContext'];
+  if (typeof contextText !== 'string') throw new TypeError(`${label} rawTurnContext is absent.`);
+  const context = mutableRecord(JSON.parse(contextText) as unknown, `${label} rawTurnContext`);
+  const stateReference = mutableRecord(context['state_ref'], `${label} rawTurnContext.state_ref`);
+  stateReference['state_handle'] = 'engine-state:<accepted-state-capsule-digest>';
+  row['rawTurnContext'] = JSON.stringify(context);
+  row['proposalId'] = '<independently-verified-proposal-id>';
+  row['agentSessionDigestHash'] = '<independently-recomputed-agent-session-digest>';
+  const stateBinding = mutableRecord(row['stateBinding'], `${label} stateBinding`);
+  const capsuleBinding = mutableRecord(stateBinding['capsule'], `${label} stateBinding.capsule`);
+  capsuleBinding['digest'] = '<accepted-state-capsule-digest>';
+  const authorizationBinding = stateBinding['authorization'];
+  if (authorizationBinding !== null) {
+    mutableRecord(authorizationBinding, `${label} stateBinding.authorization`)['digest'] =
+      '<accepted-authorization-capsule-digest>';
+  }
+  const teamPlans = mutableRecord(row['teamPlans'], `${label} teamPlans`);
+  const monsters = teamPlans['monsters'];
+  if (monsters !== null) {
+    const monsterPlans = mutableRecord(monsters, `${label} teamPlans.monsters`);
+    monsterPlans['initialProposalId'] = '<independently-verified-proposal-id>';
+    monsterPlans['initialProposalHash'] = '<independently-recomputed-proposal-hash>';
+  }
+  return `${JSON.stringify(row)}\n`;
 }
 
-function normalizedCurrentRow(actualText: string, expectedText: string, label: string): string {
+function normalizedCurrentRow(actualText: string, label: string): string {
   if (!actualText.endsWith('\n') || actualText.includes('\r') || actualText.split('\n').length !== 2) {
     throw new TypeError(`${label} is not canonical one-row JSONL.`);
   }
   const actual = mutableRecord(JSON.parse(actualText.slice(0, -1)) as unknown, `${label} actual`);
-  const expected = record(JSON.parse(expectedText.slice(0, -1)) as unknown, `${label} expected`);
   for (const field of LEGACY_TIMING_FIELDS) actual[field] = 0;
   if (typeof actual['policyElapsedMs'] !== 'number' || !Number.isFinite(actual['policyElapsedMs']) ||
     actual['policyElapsedMs'] < 0) {
@@ -384,17 +434,13 @@
     `${label} rawTurnContext`,
   )['granularity'] !== 'full') {
     throw new TypeError(`${label} rawTurnContext is invalid.`);
-  }
-  for (const field of [
-    'proposalId', 'rawTurnContext', 'agentSessionDigestHash', 'stateBinding', 'teamPlans',
-  ] as const) {
-    if (Object.hasOwn(expected, field)) actual[field] = expected[field];
-    else delete actual[field];
   }
   for (const field of [
     'roundWallBudgetMs', 'roundWallTimedOut', 'policyElapsedMs', 'speculationPlanner', 'escalationTrigger',
   ] as const) delete actual[field];
-  return `${JSON.stringify(actual)}\n`;
+  // These identity-bearing leaves are normalized only after the test independently
+  // recomputes their producer contracts from proposal, context, plan, and journal evidence.
+  return normalizeAcceptedIdentityFields(`${JSON.stringify(actual)}\n`, label);
 }
 
 function normalizedCurrentTimingRow(source: string, label: string): string {
@@ -410,6 +456,188 @@
   return `${JSON.stringify(row)}\n`;
 }
 
+function roundProposal(value: unknown, label: string): RoundTurnProposalEnvelope {
+  const proposal = record(value, label);
+  if (proposal['kind'] !== 'round_turn_proposal' || typeof proposal['proposalId'] !== 'string' ||
+    typeof proposal['stateDigest'] !== 'string' || typeof proposal['stateHandle'] !== 'string' ||
+    typeof proposal['idempotencyKey'] !== 'string' || !Array.isArray(proposal['resolutions']) ||
+    (proposal['phase'] !== 'initial' && proposal['phase'] !== 'correction')) {
+    throw new TypeError(`${label} is not a round proposal.`);
+  }
+  return value as RoundTurnProposalEnvelope;
+}
+
+function submittedRoundProposals(evidence: PrimaryEvidence): readonly RoundTurnProposalEnvelope[] {
+  const artifactRoot = dirname(evidence.invocation.launcherToken);
+  return ['initial', 'correction'].flatMap((phase) => {
+    const text = readFileSync(join(
+      artifactRoot,
+      `room-1-round-1-${phase}-proposals.jsonl`,
+    ), 'utf8').trim();
+    return text.length === 0
+      ? []
+      : text.split('\n').map((line, index) => roundProposal(
+          JSON.parse(line) as unknown,
+          `${phase} proposal ${String(index + 1)}`,
+        ));
+  });
+}
+
+interface RecomputedSessionEvidence {
+  readonly row: ConversationRowPersisted;
+  readonly digestHash: string;
+}
+
+async function recomputedSessionEvidence(
+  name: 'primary' | 'correction',
+): Promise<RecomputedSessionEvidence> {
+  const result = await runConversation(
+    legacyConfig(join(testDirectory, `recomputed-${name}.jsonl`)),
+    {
+      repoCommit: APPROVED_COMMIT,
+      clock: () => 0,
+      simulatedInProcessDispatchDelayMs: 0,
+      ...(name === 'correction' ? {
+        exhaustInitial: ['room-1-round-1'],
+        failCorrection: ['room-1-round-1'],
+      } : {}),
+    },
+  );
+  const row = result.rows[0];
+  if (result.rows.length !== 1 || row === undefined) {
+    throw new TypeError(`${name} digest recomputation did not produce one row.`);
+  }
+  const store = new MemoryBrowserSessionStore();
+  const sessionId = importSavedSession(store, result.journalExport);
+  const digestHash = EncounterSessionJournal.resume(sessionId, store, new MemoryMirrorSink())
+    .journal.agentSessionDigest().hash;
+  expect(row.agentSessionDigestHash, `${name} row digest is derived from its exported journal`)
+    .toBe(digestHash);
+  return { row, digestHash };
+}
+
+function expectPartyPlanInvariants(row: Readonly<Record<string, unknown>>, label: string): void {
+  const teamPlans = record(row['teamPlans'], `${label} teamPlans`);
+  const party = record(teamPlans['party'], `${label} teamPlans.party`);
+  const programsValue = party['programs'];
+  if (!Array.isArray(programsValue) || typeof party['sharedObjective'] !== 'string') {
+    throw new TypeError(`${label} party plan is malformed.`);
+  }
+  for (const [index, value] of programsValue.entries()) {
+    const program = record(value, `${label} teamPlans.party.programs[${String(index)}]`);
+    expect(program['programHash'], `${label} party program ${String(index)} hash`)
+      .toBe(sha256(canonicalJson(program['program'])));
+  }
+  const policyHash = sha256(canonicalJson({
+    version: SCRIPTED_PARTY_POLICY_VERSION,
+    decisionPolicy: DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
+    controller: 'symmetric-pc-evaluator-v1',
+    legalActionsProviderId: 'regret-turn-legal-actions-v1',
+    sharedObjective: party['sharedObjective'],
+  }));
+  expect(row['partyPolicyHash'], `${label} party policy hash`).toBe(policyHash);
+  const planHash = sha256(canonicalJson({
+    format: SCRIPTED_PARTY_PLAN_FORMAT,
+    policyVersion: SCRIPTED_PARTY_POLICY_VERSION,
+    decisionPolicy: DEFAULT_SCRIPTED_PARTY_DECISION_POLICY,
+    round: row['round'],
+    sharedObjective: party['sharedObjective'],
+    policyHash,
+    programs: programsValue,
+  }));
+  expect(party['planHash'], `${label} party plan hash`).toBe(planHash);
+  expect(party['planId'], `${label} party plan id`).toBe(`party-plan:${planHash.slice(0, 48)}`);
+}
+
+function expectIndependentCurrentRowInvariants(input: {
+  readonly actualText: string;
+  readonly evidence: PrimaryEvidence;
+  readonly recomputed: RecomputedSessionEvidence;
+  readonly expectedAuthorization: Readonly<{ readonly revision: number; readonly digest: string }> | null;
+  readonly label: string;
+}): Readonly<{ readonly revision: number; readonly digest: string }> {
+  const row = record(JSON.parse(input.actualText.slice(0, -1)) as unknown, input.label);
+  const contextText = row['rawTurnContext'];
+  if (typeof contextText !== 'string') throw new TypeError(`${input.label} raw context is absent.`);
+  const context = record(JSON.parse(contextText) as unknown, `${input.label} raw context`);
+  const stateReference = record(context['state_ref'], `${input.label} raw context state_ref`);
+  const stateBinding = record(row['stateBinding'], `${input.label} stateBinding`);
+  const capsule = record(stateBinding['capsule'], `${input.label} stateBinding.capsule`);
+  expect(stateReference, `${input.label} raw context binds the persisted capsule`).toMatchObject({
+    run_id: 'encounter:ai-dm-conversation',
+    expected_revision: capsule['revision'],
+    state_handle: `engine-state:${String(capsule['digest'])}`,
+  });
+  expect(row['agentSessionDigestHash'], `${input.label} session digest matches an independently exported journal`)
+    .toBe(input.recomputed.digestHash);
+  expect(input.recomputed.row.agentSessionDigestHash, `${input.label} independent row retains recomputed digest`)
+    .toBe(input.recomputed.digestHash);
+  expectPartyPlanInvariants(row, input.label);
+
+  const proposalId = row['proposalId'];
+  if (typeof proposalId !== 'string') throw new TypeError(`${input.label} proposal id is absent.`);
+  const teamPlans = record(row['teamPlans'], `${input.label} teamPlans`);
+  const monsters = record(teamPlans['monsters'], `${input.label} teamPlans.monsters`);
+  const authorizedProposals = monsters['authorizedProposals'];
+  const authorizedPlan = row['authorizedPlan'];
+  if (!Array.isArray(authorizedProposals) || !Array.isArray(authorizedPlan)) {
+    throw new TypeError(`${input.label} authorized monster plan is malformed.`);
+  }
+  expect(monsters['initialProposalId'], `${input.label} team proposal id`).toBe(proposalId);
+  expect(authorizedProposals, `${input.label} team proposals match the persisted authorized plan`).toEqual(
+    authorizedPlan.map((value, index) => {
+      const plan = record(value, `${input.label} authorizedPlan[${String(index)}]`);
+      const accepted = record(
+        plan['acceptedProposal'],
+        `${input.label} authorizedPlan[${String(index)}].acceptedProposal`,
+      );
+      return {
+        actorId: accepted['actor_id'],
+        expectedRevision: accepted['expected_revision'],
+        primaryOptionId: accepted['primary_option_id'],
+        fallbackOptionId: accepted['fallback_option_id'],
+        reason: accepted['reason'],
+        ...(row['planner'] === 'engine_default'
+          ? { activationChoice: accepted['activation_choice'] ?? null }
+          : {}),
+        overrideJustification: accepted['override_justification'],
+      };
+    }),
+  );
+  const submitted = submittedRoundProposals(input.evidence).find((proposal) =>
+    proposal.proposalId === proposalId);
+  if (submitted === undefined) {
+    expect(proposalId, `${input.label} deterministic proposal id`)
+      .toBe('engine-default:request:room-1-round-1');
+    expect(monsters['initialProposalHash'], `${input.label} deterministic proposal hash`)
+      .toBe(sha256(canonicalJson(authorizedProposals)));
+    if (input.expectedAuthorization === null) {
+      throw new TypeError(`${input.label} deterministic proposal lacks independent authorization evidence.`);
+    }
+    expect(stateBinding['authorization'], `${input.label} deterministic authorization binding`)
+      .toEqual(input.expectedAuthorization);
+    return input.expectedAuthorization;
+  }
+
+  const recomputedProposalId = `round:${sha256(canonicalJson({
+    digest: submitted.stateDigest,
+    key: submitted.idempotencyKey,
+    valid: submitted.resolutions,
+    reactionGuidance: submitted.reactionGuidance,
+  })).slice(0, 48)}`;
+  expect(proposalId, `${input.label} proposal id recomputed from submitted engine evidence`)
+    .toBe(recomputedProposalId);
+  expect(monsters['initialProposalHash'], `${input.label} proposal hash recomputed from submitted engine evidence`)
+    .toBe(sha256(authorizedRoundProposalHashInput(submitted)));
+  expect(authorizedProposals, `${input.label} team proposals preserve submitted resolutions`).toEqual(
+    submitted.resolutions.map((resolution) => resolution.proposal),
+  );
+  const authorization = { revision: submitted.expectedRevision, digest: submitted.stateDigest };
+  expect(stateBinding['authorization'], `${input.label} authorization binds the submitted proposal`)
+    .toEqual(authorization);
+  return authorization;
+}
+
 function normalizedLegacyLauncher(source: string, expectedSource: string, filename: string): string {
   const manifest = mutableRecord(JSON.parse(source) as unknown, filename);
   const expected = record(JSON.parse(expectedSource) as unknown, `${filename} approved oracle`);
@@ -615,11 +843,15 @@
   }
 }
 
+const primaryRunnerCapture = primaryEvidence();
+const correctionRunnerCapture = primaryRunnerCapture.then(async () => correctionCapture());
+const explicitIncumbentRunnerCapture = correctionRunnerCapture.then(async () => explicitIncumbentCapture());
+const explicitAdviceRunnerCapture = explicitIncumbentRunnerCapture.then(async () => explicitAdviceEvidence());
 const runnerCapturePromises = {
-  primary: primaryEvidence(),
-  correction: correctionCapture(),
-  explicitIncumbent: explicitIncumbentCapture(),
-  explicitAdvice: explicitAdviceEvidence(),
+  primary: primaryRunnerCapture,
+  correction: correctionRunnerCapture,
+  explicitIncumbent: explicitIncumbentRunnerCapture,
+  explicitAdvice: explicitAdviceRunnerCapture,
 } as const;
 await Promise.all(Object.values(runnerCapturePromises));
 
@@ -690,19 +922,37 @@
   });
 
   describe('approved-main row comparison', () => {
-    it('matches both approved-main captured JSONL cases after only the frozen timing substitution', async () => {
-      const [primary, correction] = await Promise.all([
+    it('matches approved-main rows after timing and independently verified binding-identity normalization', async () => {
+      const [primary, correction, recomputedPrimary, recomputedCorrection] = await Promise.all([
         runnerCapturePromises.primary,
         runnerCapturePromises.correction,
+        recomputedSessionEvidence('primary'),
+        recomputedSessionEvidence('correction'),
       ]);
+      const primaryText = lockedText(primary.capture.rowJsonl, 'blind replay primary row');
+      const primaryAuthorization = expectIndependentCurrentRowInvariants({
+        actualText: primaryText,
+        evidence: primary,
+        recomputed: recomputedPrimary,
+        expectedAuthorization: null,
+        label: 'blind replay primary row',
+      });
+      const correctionText = lockedText(correction.capture.rowJsonl, 'blind replay correction row');
+      expectIndependentCurrentRowInvariants({
+        actualText: correctionText,
+        evidence: correction,
+        recomputed: recomputedCorrection,
+        expectedAuthorization: primaryAuthorization,
+        label: 'blind replay correction row',
+      });
+
       const oracle = runnerOracle();
-      for (const [name, expectedCapture, actualCapture] of [
-        ['primary', oracle.runs.primary, primary.capture],
-        ['correction', oracle.runs.correction, correction],
+      for (const [name, expectedCapture, actual] of [
+        ['primary', oracle.runs.primary, primaryText],
+        ['correction', oracle.runs.correction, correctionText],
       ] as const) {
         const expected = normalizeOracleRow(expectedCapture.rowJsonl, `runner oracle ${name} row`);
-        const actual = lockedText(actualCapture.rowJsonl, `blind replay ${name} row`);
-        const normalized = normalizedCurrentRow(actual, expected, `blind replay ${name} row`);
+        const normalized = normalizedCurrentRow(actual, `blind replay ${name} row`);
         expectExactJson(expected.slice(0, -1), normalized.slice(0, -1), 'row[0]');
         expect(normalized, `${name} canonical transformed JSONL`).toBe(expected);
       }
@@ -749,7 +999,7 @@
 
   describe('approved-main correction launcher comparison', () => {
     it('enters correction and matches every approved-main correction launcher manifest without dmMode at any depth', async () => {
-      const actual = await runnerCapturePromises.correction;
+      const actual = (await runnerCapturePromises.correction).capture;
       const oracle = runnerOracle();
       const actualRow = record(
         JSON.parse(lockedText(actual.rowJsonl, 'blind correction row').slice(0, -1)) as unknown,
@@ -774,7 +1024,7 @@
     });
 
     it('keeps correction readiness evidence launcher-relative with no captured absolute root', async () => {
-      const actual = await runnerCapturePromises.correction;
+      const actual = (await runnerCapturePromises.correction).capture;
       for (const [name, expectedPath] of [
         ['room-1-round-1-correction-launcher.json', 'room-1-round-1-correction-engine-readiness.jsonl'],
         ['room-1-round-1-correction-launcher-full.json', 'room-1-round-1-correction-recovery-engine-readiness.jsonl'],
