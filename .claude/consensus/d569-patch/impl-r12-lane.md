Implemented Round 12 without production changes or oracle recapture. All substitutions are removed; only [ai-dm-legacy-invariance.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/unit/tools/ai-dm-legacy-invariance.test.ts:82) changed.

### Identity inventory

| Field | Frozen value | Current value | Accepted cause and invariant |
|---|---|---|---|
| `stateBinding.capsule.digest` | `531ab81515152741951fd3ff78f398bf32e8941c4fc4fbdb9cb3eb5c4732e69e` | `74a5d218447cc2fce84db6d0a462822c1f7cc1e43adf10260a86d46f24d3f553` | Offers Slice 2 changed capsules from schema 3 to schema 4 and added `offerEnvironment`. The test hashes every named schema-4 field and proves removing only that binding and restoring schema 3 reproduces the frozen digest. |
| `stateBinding.authorization.digest` | `797d34c31fcd6bdc26bb9927765471725d21a5c0cacdc60b384eb1672f936b0a` | `35ff5bd10a5d083af3c9889a71363c6c9a43bd531de1820b5ee5667f453e80b4` | Same schema-4 environment-binding change, independently derived for the correction capsule. |
| `rawTurnContext.state_ref.state_handle` | `engine-state:531ab815…` | `engine-state:74a5d218…` | Directly derived from the independently established capsule digest; all remaining context content is compared exactly. |
| `turnContextDeltaBase…state_handle` | `engine-state:531ab815…` | `engine-state:74a5d218…` | Same capsule migration. Only that exact nested correction-launcher path is admitted as different. |
| Primary `proposalId` and monster `initialProposalId` | `round:72f35a44f584762a020c30ff8b8e901540399abdd066967a` | `round:7b4c62cbfd6c10f561d936bc874fb194cbe990cf48b53977` | Explicitly recomputed from `{digest,key,valid,reactionGuidance}` and pinned. The digest input is independently validated. |
| Monster `initialProposalHash` | `a7ae167473f1c95e814f8a143add72d4126e69ed4ad834a54a684d566d92c866` | `ef06523ae111d9b9120138eea8a179b64e54917ab267544be0458286d4499e52` | Schema-derived proposal identity plus R10’s stable-envelope serialization. The test independently spells the complete envelope, including optional `submittedArguments` and `intelCapture`, rather than calling the production helper. |
| Primary `agentSessionDigestHash` | `4487ca12ed8ca24ea829627273c025524c033a4e1a378f015833040423901e7c` | `01f3d6e008c69f0e30af64c45fdd2b6a21aac16e4d68e17bbea325cd569e7988` | The independently specified journal payload is hashed from the same captured store. Replacing only its accepted proposal ID with the frozen ID reproduces the frozen hash. The six-transition journal inventory, void ancestry and party-resource absence are separately pinned. |
| Offer environment | absent | environment `fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b`; family `a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a`; threat catalog `0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57` | Offers Slice 2. Each complete legacy-mode body and nested digest formula is asserted independently. |
| Full-launcher proposal/context paths | `…-initial-proposals`, `…-initial-turn-context`, `…-correction-proposals`, `…-correction-turn-context` | Corresponding `…-recovery-proposals` and `…-recovery-turn-context` paths | D569 recovery-dispatch isolation. Exact `$ARTIFACTS_ROOT/...` destinations are asserted; oracle paths are never copied. |
| Launcher dispatch evidence | absent | UUIDv4 `dispatchId`, typed `primary`/`correction` phase, exact relative readiness path | D569 mandatory readiness and R10 checkout-relative serialization. Format, phase, exact filename, and non-absolute path are validated. |
| Advice capsule handle | `dcd423237a4f92b69eb0e6a2b53c23d89c2c0b54cdb5506d28e405300e6ea312` | `1fd383e6eb87763d28a10415f1c56c03fcd417461f7cbc517c59b0b471415f46` | Schema-4 offer environment. Full capsule derivation and schema-3 frozen reproduction are asserted. |
| Advice journal cursor | `037aec9095e3bbe77e8febdfb95937084d6fc21809d01320` | `b9136f395423f15e37df9ad387db8adfe7b6719873fc230e` | Unchanged cursor formula over run, revision, capsule digest and offset. Explicitly recomputed and pinned. |
| Deadline fields | absent | `roundWallBudgetMs=180000`, `roundWallTimedOut=false`, planners/triggers `null`, finite non-negative `policyElapsedMs` | Accepted shared-deadline/D474 behavior. Every value is validated before the new fields are excluded from the frozen pre-feature row comparison. |
| Initiative `branchPoints` | `[]` | `[]` | No identity change. Exact frozen comparison restored; diagnostics found no real branch difference. |
| Protected primary invocation | frozen bytes | identical bytes | No change or normalization. |

The capsule and environment production changes originate in [engine-state-capsule.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/engine-state-capsule.ts:911) and [offer-environment.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/offers/offer-environment.ts:183). D569 recovery/readiness serialization is in [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts:3359).

No unexplained legacy difference remains.

### Assertion replacements

Every weakened assertion was replaced:

- Production-vs-production session digest equality → explicit journal transition inventory, independently constructed digest payload, current pin, and frozen-hash reproduction.
- Production `authorizedRoundProposalHashInput` call → independently specified full proposal envelope and exact hash pin.
- Row substitution/canonical equality → exhaustive path-level difference inventory plus independent derivations for every admitted identity.
- Launcher spool, `branchPoints`, and state-handle copying → exact path derivations, literal frozen `branchPoints`, capsule-derived delta handle, and exhaustive manifest comparison.
- Blanket 48/64-hex replacement → parsed protocol difference inventory restricted to named paths. Only the already-derived capsule and cursor identities are neutralized afterward; all remaining bytes, byte count, and SHA equality remain exact.

The exact substitution audit returned ten textual matches, all local `expected*` declarations or comparisons. There are zero assignments from expected/oracle data into actual captures.

### Verification

All commands exited `0`:

- `npm run typecheck:fast`
- `sg scan` — 0 findings
- `git diff --check` — clean
- Prohibited added-line audit — 0 matches
- Frozen contract SHA-256: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Oracle fixture status: unchanged
- Substitution self-check:
  `grep -nE "= expected|= expectedTimeline|= expectedStateReference|expectedDigests\[" tests/unit/tools/ai-dm-legacy-invariance.test.ts`

Legacy invariance, three consecutive runs:

- Run 1: 1 file, 10/10 tests, 45.01 s
- Run 2: 1 file, 10/10 tests, 45.22 s
- Run 3: 1 file, 10/10 tests, 44.67 s

`npx vitest run --configLoader runner tests/integration/vtt/ai-dm-combat-model.test.ts`:

- 1 file passed, 2/2 tests, 27.21 s

The exact 21-file D569 cumulative:

- 21/21 files passed
- 498/498 tests passed
- Duration 594.32 s
- No load timeout or serial retry required

Logs are under [.tmp](/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp). The final diff is 561 insertions and 163 deletions in the single test file.

D569 R12 DONE
diff --git a//tmp/d569-r12-capsule-variants.ts b//tmp/d569-r12-capsule-variants.ts
new file mode 100644
index 0000000000000000000000000000000000000000..846f565e24a1ce8d6d02944f4cb7a1eb1ddfa285
--- /dev/null
+++ b//tmp/d569-r12-capsule-variants.ts
@@ -0,0 +1,24 @@
+import { readFileSync } from 'node:fs';
+import {
+  createEngineMcpRuntime, decodeEngineMcpLauncherManifest, freshMonsterPlanningState,
+  loadArenaFixture, reconstructLauncherOfferEnvironment,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/mcp/entrypoint.ts';
+const path = process.argv[2];
+if (path === undefined) throw new Error('path');
+const manifest = decodeEngineMcpLauncherManifest(JSON.parse(readFileSync(path, 'utf8')) as unknown);
+if (manifest === null) throw new Error('manifest');
+const loaded = await loadArenaFixture(manifest.fixturePath);
+const monsters = loaded.combatants.filter(c => c.profile.kind === 'monster' && c.life !== 'dead').map(c => c.profile.id).sort();
+for (const fresh of [false, true]) for (let mask=1; mask<(1<<monsters.length); mask++) {
+ const actors=monsters.filter((_a,i)=>(mask&(1<<i))!==0);
+ for (const history of [true,false]) for (const initiative of [true,false]) {
+  const capsule=createEngineMcpRuntime(fresh?freshMonsterPlanningState(loaded):loaded,{
+   runId:manifest.runId,branchId:manifest.branchId,revision:manifest.revision,requestId:manifest.requestId,
+   phase:manifest.phase,correctionNumber:manifest.correctionNumber,room:manifest.room,
+   ...(history?{historyKind:manifest.historyKind}:{}),requestedActorIds:actors,
+   offerEnvironment:reconstructLauncherOfferEnvironment(manifest),
+   ...(initiative?{initiativeProjection:manifest.initiativeProjection}:{}),
+  }).feed.current();
+  if(capsule.digest==='74a5d218447cc2fce84db6d0a462822c1f7cc1e43adf10260a86d46f24d3f553') console.log({fresh,actors,history,initiative});
+ }
+}
diff --git a//tmp/d569-r12-diagnose.ts b//tmp/d569-r12-diagnose.ts
new file mode 100644
index 0000000000000000000000000000000000000000..7bfe98335ee38b85ba50517d64eb6bdbd1172918
--- /dev/null
+++ b//tmp/d569-r12-diagnose.ts
@@ -0,0 +1,100 @@
+import { basename, join } from 'node:path';
+import { readFileSync } from 'node:fs';
+import {
+  captureLegacyRunnerComponents,
+  type LegacyRunnerCapture,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-legacy-oracle-capture.ts';
+import {
+  parseConversationArgs,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts';
+import {
+  captureLegacyAdviceProtocolSurface,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tests/helpers/legacy-advice-surface.ts';
+
+const root = '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch';
+const oracle = JSON.parse(readFileSync(join(root, 'tests/fixtures/ai-dm-legacy/runner-oracle-main.json'), 'utf8'));
+
+function text(value: { readonly base64: string }): string {
+  return Buffer.from(value.base64, 'base64').toString('utf8');
+}
+
+function differences(expected: unknown, actual: unknown, path = '$'): string[] {
+  if (Object.is(expected, actual)) return [];
+  if (typeof expected === 'string' && typeof actual === 'string') {
+    try {
+      return differences(JSON.parse(expected) as unknown, JSON.parse(actual) as unknown, `${path}<json>`);
+    } catch {
+      const wrapper = /^([\s\S]*?<engine-data-json>)([\s\S]*)(<\/engine-data-json>[\s\S]*)$/u;
+      const expectedWrapped = wrapper.exec(expected);
+      const actualWrapped = wrapper.exec(actual);
+      if (expectedWrapped !== null && actualWrapped !== null && expectedWrapped[1] === actualWrapped[1] &&
+        expectedWrapped[3] === actualWrapped[3]) {
+        return differences(
+          JSON.parse(expectedWrapped[2] ?? '') as unknown,
+          JSON.parse(actualWrapped[2] ?? '') as unknown,
+          `${path}<engine-data-json>`,
+        );
+      }
+    }
+  }
+  if (Array.isArray(expected) && Array.isArray(actual)) {
+    return Array.from({ length: Math.max(expected.length, actual.length) }, (_, index) =>
+      differences(expected[index], actual[index], `${path}[${String(index)}]`)).flat();
+  }
+  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) &&
+    typeof actual === 'object' && actual !== null && !Array.isArray(actual)) {
+    const left = expected as Record<string, unknown>;
+    const right = actual as Record<string, unknown>;
+    return [...new Set([...Object.keys(left), ...Object.keys(right)])].sort().flatMap((key) =>
+      differences(left[key], right[key], `${path}.${key}`));
+  }
+  return [`${path}\n  OLD ${JSON.stringify(expected)}\n  NEW ${JSON.stringify(actual)}`];
+}
+
+function config(name: string, correction: boolean) {
+  return parseConversationArgs([
+    '--fixtures', 'tests/fixtures/arena-basis', '--rooms', '1', '--rounds', '1',
+    '--out', `/tmp/d569-r12-${name}.jsonl`, '--dry-run',
+  ]);
+}
+
+for (const name of ['primary', 'correction'] as const) {
+  const correction = name === 'correction';
+  const actual = await captureLegacyRunnerComponents(config(name, correction), {
+    repoCommit: '493121dd902e5033197d72f0050a1b8b8e32ae7c',
+    clock: () => 0,
+    ...(correction ? { exhaustInitial: ['room-1-round-1'], failCorrection: ['room-1-round-1'] } : {}),
+  });
+  const expected = oracle.runs[name] as LegacyRunnerCapture;
+  process.stdout.write(`RUN ${name} ROW\n${differences(
+    JSON.parse(text(expected.rowJsonl)), JSON.parse(text(actual.rowJsonl)), '$row').join('\n')}\n`);
+  for (const filename of Object.keys(actual.launchers).sort()) {
+    process.stdout.write(`RUN ${name} LAUNCHER ${filename}\n${differences(
+      JSON.parse(text(expected.launchers[filename]!)),
+      JSON.parse(text(actual.launchers[filename]!)),
+      '$launcher',
+    ).join('\n')}\n`);
+  }
+  process.stdout.write(`RUN ${name} INVOCATION\n${differences(
+    JSON.parse(text(expected.protectedPrimaryInvocation)),
+    JSON.parse(text(actual.protectedPrimaryInvocation)),
+    '$invocation',
+  ).join('\n')}\n`);
+}
+
+const fixture = JSON.parse(readFileSync(join(root, 'tests/fixtures/ai-dm-legacy/implicit-advice-v1.json'), 'utf8'));
+const surface = await captureLegacyAdviceProtocolSurface(root);
+for (const name of Object.keys(surface) as (keyof typeof surface)[]) {
+  const expected = Buffer.from(fixture.components[name].base64, 'base64').toString('utf8');
+  const expectedRoot = expected.match(/\/home\/vagrant\/PhpstormProjects\/[^/]+/u)?.[0];
+  const expectedWorkspace = expected.match(/dnd-wt-[A-Za-z0-9_-]+/u)?.[0];
+  const rooted = expectedRoot === undefined ? surface[name] : surface[name].replaceAll(root, expectedRoot);
+  const actual = expectedWorkspace === undefined ? rooted : rooted.replaceAll(basename(root), expectedWorkspace);
+  let diff: string[];
+  try {
+    diff = differences(JSON.parse(expected), JSON.parse(actual), `$surface.${name}`);
+  } catch {
+    diff = expected === actual ? [] : [`$surface.${name} TEXT\nOLD=${JSON.stringify(expected)}\nNEW=${JSON.stringify(actual)}`];
+  }
+  process.stdout.write(`SURFACE ${name}\n${diff.join('\n')}\n`);
+}
diff --git a//tmp/d569-r12-hash-variant.ts b//tmp/d569-r12-hash-variant.ts
new file mode 100644
index 0000000000000000000000000000000000000000..b0aa8f48067413d085e0a18151f2e2dd70df7cec
--- /dev/null
+++ b//tmp/d569-r12-hash-variant.ts
@@ -0,0 +1,10 @@
+import { readFileSync } from 'node:fs';
+import { canonicalJson } from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/commands/canonical-json.ts';
+import { createHash } from 'node:crypto';
+const line = readFileSync('/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/.tmp/d569-r12-journal.log', 'utf8')
+  .split('\n').find((entry) => entry.startsWith('VALUE '));
+if (line === undefined) throw new Error('missing');
+const value = JSON.parse(line.slice(6));
+value.recentAcceptedEngineDecisions[0].decision.proposalId =
+  'round:72f35a44f584762a020c30ff8b8e901540399abdd066967a';
+process.stdout.write(`${createHash('sha256').update(canonicalJson(value)).digest('hex')}\n`);
diff --git a//tmp/d569-r12-journal.ts b//tmp/d569-r12-journal.ts
new file mode 100644
index 0000000000000000000000000000000000000000..159e208b1e4aecbfcf010c3cfcfa16ccbe8d577c
--- /dev/null
+++ b//tmp/d569-r12-journal.ts
@@ -0,0 +1,30 @@
+import { readFileSync } from 'node:fs';
+import {
+  captureLegacyRunnerComponents,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-legacy-oracle-capture.ts';
+import { parseConversationArgs } from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/tools/ai-dm-conversation.ts';
+import {
+  EncounterSessionJournal,
+  MemoryBrowserSessionStore,
+  MemoryMirrorSink,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/vtt/session-persistence.ts';
+import type { EncounterSessionId } from '/home/vagrant/PhpstormProjects/dnd-wt-d569-patch/src/combat/values.ts';
+
+const store = new MemoryBrowserSessionStore();
+await captureLegacyRunnerComponents(parseConversationArgs([
+  '--fixtures', 'tests/fixtures/arena-basis', '--rooms', '1', '--rounds', '1',
+  '--out', '/tmp/d569-r12-journal-row.jsonl', '--dry-run',
+]), {
+  repoCommit: '493121dd902e5033197d72f0050a1b8b8e32ae7c', clock: () => 0, store,
+});
+const sessionId = 'encounter:ai-dm-conversation' as EncounterSessionId;
+const revisions = store.revisions(sessionId);
+for (const revision of revisions) {
+  const prefix = new MemoryBrowserSessionStore();
+  prefix.appendAll(revisions.slice(0, revision.revision));
+  const digest = EncounterSessionJournal.resume(sessionId, prefix, new MemoryMirrorSink()).journal.agentSessionDigest();
+  process.stdout.write(`${revision.revision}\t${revision.transition.kind}\t${digest.hash}\n`);
+}
+const final = EncounterSessionJournal.resume(sessionId, store, new MemoryMirrorSink()).journal.agentSessionDigest();
+process.stdout.write(`VALUE ${JSON.stringify(final.value)}\n`);
+process.stdout.write(`ROW ${readFileSync('/tmp/d569-r12-journal-row.jsonl', 'utf8')}`);
diff --git a/tests/unit/tools/ai-dm-legacy-invariance.test.ts b/tests/unit/tools/ai-dm-legacy-invariance.test.ts
index b7f5dbc208b351dd69e76dd861555907659c4d16..55ce6836268ebaea7e4c9e42864df0d0c00a0189
--- a/tests/unit/tools/ai-dm-legacy-invariance.test.ts
+++ b/tests/unit/tools/ai-dm-legacy-invariance.test.ts
@@ -1,6 +1,6 @@
 import { createHash } from 'node:crypto';
 import { execFileSync } from 'node:child_process';
-import { basename, dirname, isAbsolute, join, resolve } from 'node:path';
+import { dirname, isAbsolute, join, resolve } from 'node:path';
 import { tmpdir } from 'node:os';
 import { describe, expect, it } from 'vitest';
 import type { AgentInvocation } from '../../../src/vtt/agent-session';
@@ -11,7 +11,6 @@
   type LegacyAdviceProtocolSurface,
 } from '../../helpers/legacy-advice-surface';
 import {
-  authorizedRoundProposalHashInput,
   parseConversationArgs,
   runConversation,
   serializeConversationRow,
@@ -26,12 +25,19 @@
   SCRIPTED_PARTY_POLICY_VERSION,
 } from '../../../src/vtt/scripted-party-round';
 import {
-  EncounterSessionJournal,
-  importSavedSession,
   MemoryBrowserSessionStore,
-  MemoryMirrorSink,
+  sessionHistory,
 } from '../../../src/vtt/session-persistence';
+import { encounterSessionId } from '../../../src/combat/values';
 import {
+  createEngineMcpRuntime,
+  decodeEngineMcpLauncherManifest,
+  freshMonsterPlanningState,
+  loadArenaFixture,
+  reconstructLauncherOfferEnvironment,
+} from '../../../src/vtt/mcp/entrypoint';
+import type { EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
+import {
   captureLegacyRunnerComponents,
   type LegacyRunnerCapture,
 } from '../../../tools/ai-dm-legacy-oracle-capture';
@@ -73,6 +79,27 @@
   'timeToFirstAction',
   'wallPerCreature',
 ] as const satisfies readonly (keyof ConversationRowPersisted)[];
+const ACCEPTED_IDENTITY_PINS = {
+  runnerCapsuleDigest: '74a5d218447cc2fce84db6d0a462822c1f7cc1e43adf10260a86d46f24d3f553',
+  runnerAuthorizationDigest: '35ff5bd10a5d083af3c9889a71363c6c9a43bd531de1820b5ee5667f453e80b4',
+  primaryProposalId: 'round:7b4c62cbfd6c10f561d936bc874fb194cbe990cf48b53977',
+  primaryProposalHash: 'ef06523ae111d9b9120138eea8a179b64e54917ab267544be0458286d4499e52',
+  primaryAgentSessionDigest: '01f3d6e008c69f0e30af64c45fdd2b6a21aac16e4d68e17bbea325cd569e7988',
+  adviceCapsuleDigest: '1fd383e6eb87763d28a10415f1c56c03fcd417461f7cbc517c59b0b471415f46',
+  adviceJournalCursor: 'b9136f395423f15e37df9ad387db8adfe7b6719873fc230e',
+  offerEnvironmentDigest: 'fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b',
+  familyPolicyDigest: 'a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a',
+  partyThreatCatalogDigest: '0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57',
+} as const;
+const FROZEN_IDENTITY_PINS = {
+  runnerCapsuleDigest: '531ab81515152741951fd3ff78f398bf32e8941c4fc4fbdb9cb3eb5c4732e69e',
+  runnerAuthorizationDigest: '797d34c31fcd6bdc26bb9927765471725d21a5c0cacdc60b384eb1672f936b0a',
+  primaryProposalId: 'round:72f35a44f584762a020c30ff8b8e901540399abdd066967a',
+  primaryProposalHash: 'a7ae167473f1c95e814f8a143add72d4126e69ed4ad834a54a684d566d92c866',
+  primaryAgentSessionDigest: '4487ca12ed8ca24ea829627273c025524c033a4e1a378f015833040423901e7c',
+  adviceCapsuleDigest: 'dcd423237a4f92b69eb0e6a2b53c23d89c2c0b54cdb5506d28e405300e6ea312',
+  adviceJournalCursor: '037aec9095e3bbe77e8febdfb95937084d6fc21809d01320',
+} as const;
 const testDirectory = mkdtempSync(join(tmpdir(), 'dnd-legacy-runner-invariance-'));
 
 interface LockedBytes {
@@ -254,17 +281,20 @@
 interface PrimaryEvidence {
   readonly capture: LegacyRunnerCapture;
   readonly invocation: AgentInvocation;
+  readonly store: MemoryBrowserSessionStore;
 }
 
 let primaryEvidencePromise: Promise<PrimaryEvidence> | null = null;
 function primaryEvidence(): Promise<PrimaryEvidence> {
   primaryEvidencePromise ??= (async () => {
     const invocations: AgentInvocation[] = [];
+    const store = new MemoryBrowserSessionStore();
     const capture = await captureLegacyRunnerComponents(
       legacyConfig(join(testDirectory, 'implicit.jsonl')),
       {
         repoCommit: APPROVED_COMMIT,
         clock: () => 0,
+        store,
         onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
       },
     );
@@ -272,7 +302,7 @@
     if (invocations.length !== 1 || invocation === undefined) {
       throw new TypeError(`Expected one primary invocation; received ${String(invocations.length)}.`);
     }
-    return { capture, invocation };
+    return { capture, invocation, store };
   })();
   return primaryEvidencePromise;
 }
@@ -281,11 +311,13 @@
 function correctionCapture(): Promise<PrimaryEvidence> {
   correctionCapturePromise ??= (async () => {
     const invocations: AgentInvocation[] = [];
+    const store = new MemoryBrowserSessionStore();
     const capture = await captureLegacyRunnerComponents(
       legacyConfig(join(testDirectory, 'correction.jsonl')),
       {
         repoCommit: APPROVED_COMMIT,
         clock: () => 0,
+        store,
         exhaustInitial: ['room-1-round-1'],
         failCorrection: ['room-1-round-1'],
         onPrimaryInvocation: (invocation) => { invocations.push(invocation); },
@@ -295,7 +327,7 @@
     if (invocations.length !== 1 || invocation === undefined) {
       throw new TypeError(`Expected one correction-run primary invocation; received ${String(invocations.length)}.`);
     }
-    return { capture, invocation };
+    return { capture, invocation, store };
   })();
   return correctionCapturePromise;
 }
@@ -346,6 +378,43 @@
   throw new Error(`${firstDifference(expected, actual, path) ?? path} differs`);
 }
 
+interface JsonDifference {
+  readonly path: string;
+  readonly expected: unknown;
+  readonly actual: unknown;
+}
+
+function jsonDifferences(expected: unknown, actual: unknown, path: string): readonly JsonDifference[] {
+  if (Object.is(expected, actual)) return [];
+  if (Array.isArray(expected) && Array.isArray(actual)) {
+    return Array.from({ length: Math.max(expected.length, actual.length) }, (_value, index) =>
+      jsonDifferences(expected[index], actual[index], `${path}[${String(index)}]`)).flat();
+  }
+  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) &&
+    typeof actual === 'object' && actual !== null && !Array.isArray(actual)) {
+    const expectedRecord = expected as Readonly<Record<string, unknown>>;
+    const actualRecord = actual as Readonly<Record<string, unknown>>;
+    return [...new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])]
+      .sort()
+      .flatMap((key) => jsonDifferences(expectedRecord[key], actualRecord[key], `${path}.${key}`));
+  }
+  return [{ path, expected, actual }];
+}
+
+function expectExactJsonWithDifferences(
+  expected: unknown,
+  actual: unknown,
+  approved: Readonly<Record<string, Readonly<{ readonly expected: unknown; readonly actual: unknown }>>>,
+  label: string,
+): void {
+  const differences = jsonDifferences(expected, actual, label);
+  const approvedDifferences = Object.entries(approved)
+    .map(([path, values]) => ({ path, ...values }))
+    .sort((left, right) => left.path.localeCompare(right.path));
+  expect(differences, `${label} has only independently derived identity changes`)
+    .toEqual(approvedDifferences);
+}
+
 function assertNoProperty(value: unknown, property: string, label: string, path = '$'): void {
   if (Array.isArray(value)) {
     for (const [index, entry] of value.entries()) {
@@ -360,7 +429,7 @@
   }
 }
 
-function normalizeOracleRow(bytes: LockedBytes, label: string): string {
+function comparisonOracleRow(bytes: LockedBytes, label: string): Readonly<Record<string, unknown>> {
   const original = lockedText(bytes, label);
   if (!original.endsWith('\n') || original.includes('\r') || original.split('\n').length !== 2) {
     throw new TypeError(`${label} is not canonical one-row JSONL.`);
@@ -378,38 +447,12 @@
   expected.endToEndWall = 0;
   expected.timeToFirstAction = 0;
   expected.wallPerCreature = 0;
-  return normalizeAcceptedIdentityFields(`${JSON.stringify(expected)}\n`, label);
-}
-
-function normalizeAcceptedIdentityFields(source: string, label: string): string {
-  const row = mutableRecord(JSON.parse(source.slice(0, -1)) as unknown, label);
-  const contextText = row['rawTurnContext'];
+  const contextText = expected.rawTurnContext;
   if (typeof contextText !== 'string') throw new TypeError(`${label} rawTurnContext is absent.`);
-  const context = mutableRecord(JSON.parse(contextText) as unknown, `${label} rawTurnContext`);
-  const stateReference = mutableRecord(context['state_ref'], `${label} rawTurnContext.state_ref`);
-  stateReference['state_handle'] = 'engine-state:<accepted-state-capsule-digest>';
-  row['rawTurnContext'] = JSON.stringify(context);
-  row['proposalId'] = '<independently-verified-proposal-id>';
-  row['agentSessionDigestHash'] = '<independently-recomputed-agent-session-digest>';
-  const stateBinding = mutableRecord(row['stateBinding'], `${label} stateBinding`);
-  const capsuleBinding = mutableRecord(stateBinding['capsule'], `${label} stateBinding.capsule`);
-  capsuleBinding['digest'] = '<accepted-state-capsule-digest>';
-  const authorizationBinding = stateBinding['authorization'];
-  if (authorizationBinding !== null) {
-    mutableRecord(authorizationBinding, `${label} stateBinding.authorization`)['digest'] =
-      '<accepted-authorization-capsule-digest>';
-  }
-  const teamPlans = mutableRecord(row['teamPlans'], `${label} teamPlans`);
-  const monsters = teamPlans['monsters'];
-  if (monsters !== null) {
-    const monsterPlans = mutableRecord(monsters, `${label} teamPlans.monsters`);
-    monsterPlans['initialProposalId'] = '<independently-verified-proposal-id>';
-    monsterPlans['initialProposalHash'] = '<independently-recomputed-proposal-hash>';
-  }
-  return `${JSON.stringify(row)}\n`;
+  return { ...expected, rawTurnContext: JSON.parse(contextText) as unknown };
 }
 
-function normalizedCurrentRow(actualText: string, label: string): string {
+function comparisonCurrentRow(actualText: string, label: string): Readonly<Record<string, unknown>> {
   if (!actualText.endsWith('\n') || actualText.includes('\r') || actualText.split('\n').length !== 2) {
     throw new TypeError(`${label} is not canonical one-row JSONL.`);
   }
@@ -438,9 +481,8 @@
   for (const field of [
     'roundWallBudgetMs', 'roundWallTimedOut', 'policyElapsedMs', 'speculationPlanner', 'escalationTrigger',
   ] as const) delete actual[field];
-  // These identity-bearing leaves are normalized only after the test independently
-  // recomputes their producer contracts from proposal, context, plan, and journal evidence.
-  return normalizeAcceptedIdentityFields(`${JSON.stringify(actual)}\n`, label);
+  actual['rawTurnContext'] = JSON.parse(rawTurnContext) as unknown;
+  return actual;
 }
 
 function normalizedCurrentTimingRow(source: string, label: string): string {
@@ -483,37 +525,104 @@
   });
 }
 
-interface RecomputedSessionEvidence {
-  readonly row: ConversationRowPersisted;
-  readonly digestHash: string;
+function canonicalValue(value: unknown): unknown {
+  return JSON.parse(canonicalJson(value)) as unknown;
+}
+
+function compareCanonical(left: unknown, right: unknown): number {
+  const leftBytes = canonicalJson(left);
+  const rightBytes = canonicalJson(right);
+  return leftBytes < rightBytes ? -1 : leftBytes > rightBytes ? 1 : 0;
+}
+
+function canonicalUnorderedValue(value: unknown): unknown {
+  const canonical = canonicalValue(value);
+  if (Array.isArray(canonical)) {
+    return canonical.map(canonicalUnorderedValue).sort(compareCanonical);
+  }
+  if (typeof canonical === 'object' && canonical !== null) {
+    return Object.fromEntries(Object.entries(canonical).map(([key, entry]) => [
+      key,
+      canonicalUnorderedValue(entry),
+    ]));
+  }
+  return canonical;
+}
+
+function canonicalSet(values: readonly unknown[]): readonly unknown[] {
+  return values.map(canonicalUnorderedValue).sort(compareCanonical);
 }
 
-async function recomputedSessionEvidence(
-  name: 'primary' | 'correction',
-): Promise<RecomputedSessionEvidence> {
-  const result = await runConversation(
-    legacyConfig(join(testDirectory, `recomputed-${name}.jsonl`)),
-    {
-      repoCommit: APPROVED_COMMIT,
-      clock: () => 0,
-      simulatedInProcessDispatchDelayMs: 0,
-      ...(name === 'correction' ? {
-        exhaustInitial: ['room-1-round-1'],
-        failCorrection: ['room-1-round-1'],
-      } : {}),
+function independentlyDerivedPrimarySessionDigest(store: MemoryBrowserSessionStore): string {
+  const sessionId = encounterSessionId('encounter:ai-dm-conversation');
+  const revisions = store.revisions(sessionId);
+  const history = sessionHistory(revisions);
+  expect(history.map((entry) => entry.transition.kind), 'primary journal transition inventory').toEqual([
+    'session_started',
+    'agent_session_started',
+    'agent_session_dispatched',
+    'proposal_correction_requested',
+    'agent_session_dispatched',
+    'proposal_correction_resolved',
+  ]);
+  expect(history.some((entry) => entry.void), 'primary journal has no void ancestry').toBe(false);
+  const latest = revisions.at(-1);
+  const accepted = history.filter((entry) => entry.transition.kind === 'proposal_correction_resolved');
+  if (latest === undefined || accepted.length !== 1 || accepted[0] === undefined) {
+    throw new TypeError('Primary journal cannot supply the independently specified session digest payload.');
+  }
+  expect(latest.partyState, 'legacy digest party resources are absent').toBeNull();
+  const value = {
+    schemaVersion: 1,
+    runId: sessionId,
+    branchId: latest.branchId,
+    revision: latest.revision,
+    completedRoomSummaries: [],
+    current: {
+      room: 1,
+      round: latest.encounterState.round,
+      phase: canonicalValue(latest.encounterState.phase),
     },
-  );
-  const row = result.rows[0];
-  if (result.rows.length !== 1 || row === undefined) {
-    throw new TypeError(`${name} digest recomputation did not produce one row.`);
-  }
-  const store = new MemoryBrowserSessionStore();
-  const sessionId = importSavedSession(store, result.journalExport);
-  const digestHash = EncounterSessionJournal.resume(sessionId, store, new MemoryMirrorSink())
-    .journal.agentSessionDigest().hash;
-  expect(row.agentSessionDigestHash, `${name} row digest is derived from its exported journal`)
-    .toBe(digestHash);
-  return { row, digestHash };
+    durableReactionGuidance: null,
+    partyResources: null,
+    lifeAndHitPointBands: canonicalSet(latest.encounterState.combatants.map((combatant) => ({
+      combatantId: combatant.profile.id,
+      life: combatant.life,
+      hitPoints: combatant.hitPoints,
+      hitPointMaximum: combatant.profile.rules.hitPointMaximum,
+      temporaryHitPoints: combatant.temporaryHitPoints,
+    }))),
+    effectsAndResources: canonicalSet([
+      ...latest.encounterState.effects,
+      ...latest.encounterState.combatants.map((combatant) => ({
+        combatantId: combatant.profile.id,
+        spellSlots: combatant.spellSlots,
+        limitedResources: combatant.limitedResources ?? [],
+        wildShapeUses: combatant.wildShapeUses,
+        legendary: combatant.legendary ?? null,
+      })),
+    ]),
+    recentAcceptedEngineDecisions: [{
+      revision: accepted[0].revision,
+      decision: canonicalValue(accepted[0].transition),
+    }],
+  };
+  const digest = sha256(canonicalJson(value));
+  expect(digest, 'independently specified primary session-digest payload pin')
+    .toBe(ACCEPTED_IDENTITY_PINS.primaryAgentSessionDigest);
+  const decision = record(value.recentAcceptedEngineDecisions[0]?.decision, 'primary accepted digest decision');
+  const frozenProposalIdentityValue = {
+    ...value,
+    recentAcceptedEngineDecisions: [{
+      revision: accepted[0].revision,
+      decision: { ...decision, proposalId: FROZEN_IDENTITY_PINS.primaryProposalId },
+    }],
+  };
+  expect(
+    sha256(canonicalJson(frozenProposalIdentityValue)),
+    'primary session digest differs from the frozen oracle only through the accepted proposal id',
+  ).toBe(FROZEN_IDENTITY_PINS.primaryAgentSessionDigest);
+  return digest;
 }
 
 function expectPartyPlanInvariants(row: Readonly<Record<string, unknown>>, label: string): void {
@@ -549,13 +658,139 @@
   expect(party['planId'], `${label} party plan id`).toBe(`party-plan:${planHash.slice(0, 48)}`);
 }
 
+function expectOfferEnvironmentDerivation(value: unknown, label: string): void {
+  const environment = record(value, label);
+  const familyPolicy = record(environment['familyPolicy'], `${label}.familyPolicy`);
+  const partyThreatCatalog = record(environment['partyThreatCatalog'], `${label}.partyThreatCatalog`);
+  const familyBody = {
+    format: 'engine-offer-family-policy-v1',
+    helpAttack: 'disabled',
+    readyAttack: 'disabled',
+    unarmedControl: 'disabled',
+    reposition: 'disabled',
+  };
+  const catalogBody = {
+    format: 'party-threat-catalog-v1',
+    representation: 'unrepresented',
+    entries: [],
+  };
+  expect(familyPolicy, `${label} family policy exact legacy body and derived digest`).toEqual({
+    ...familyBody,
+    digest: sha256(canonicalJson(familyBody)),
+  });
+  expect(familyPolicy['digest'], `${label} family policy replacement pin`)
+    .toBe(ACCEPTED_IDENTITY_PINS.familyPolicyDigest);
+  expect(partyThreatCatalog, `${label} party-threat catalog exact legacy body and derived digest`).toEqual({
+    ...catalogBody,
+    digest: sha256(canonicalJson(catalogBody)),
+  });
+  expect(partyThreatCatalog['digest'], `${label} party-threat catalog replacement pin`)
+    .toBe(ACCEPTED_IDENTITY_PINS.partyThreatCatalogDigest);
+  const environmentBody = {
+    format: 'engine-option-environment-v1',
+    mode: 'legacy_standard',
+    familyPolicy,
+    partyThreatCatalog,
+  };
+  expect(environment, `${label} exact legacy environment and derived digest`).toEqual({
+    ...environmentBody,
+    digest: sha256(canonicalJson(environmentBody)),
+  });
+  expect(environment['digest'], `${label} environment replacement pin`)
+    .toBe(ACCEPTED_IDENTITY_PINS.offerEnvironmentDigest);
+}
+
+function expectCapsuleDerivation(
+  capsule: EngineStateCapsule,
+  digest: string,
+  frozenSchemaThreeDigest: string,
+  label: string,
+): void {
+  expectOfferEnvironmentDerivation(capsule.offerEnvironment, `${label}.offerEnvironment`);
+  const digestInput = {
+    format: 'engine-mcp-state-capsule',
+    schemaVersion: 4,
+    runId: capsule.runId,
+    branchId: capsule.branchId,
+    revision: capsule.revision,
+    offerEnvironment: capsule.offerEnvironment,
+    request: capsule.request,
+    projection: capsule.projection,
+    historyDelta: capsule.historyDelta,
+    rulesIndex: capsule.rulesIndex,
+  };
+  expect(capsule.digest, `${label} digest is SHA-256 of every named schema-4 capsule field`)
+    .toBe(sha256(canonicalJson(digestInput)));
+  expect(capsule.digest, `${label} reviewed replacement pin`).toBe(digest);
+  const schemaThreeDigestInput = {
+    ...digestInput,
+    schemaVersion: 3,
+  };
+  delete (schemaThreeDigestInput as Partial<typeof schemaThreeDigestInput>).offerEnvironment;
+  expect(sha256(canonicalJson(schemaThreeDigestInput)), `${label} differs only by accepted schema-4 environment binding`)
+    .toBe(frozenSchemaThreeDigest);
+}
+
+async function capsuleFromLauncher(
+  evidence: PrimaryEvidence,
+  filename: string,
+): Promise<EngineStateCapsule> {
+  const raw = JSON.parse(readFileSync(join(dirname(evidence.invocation.launcherToken), filename), 'utf8')) as unknown;
+  const manifest = decodeEngineMcpLauncherManifest(raw);
+  if (manifest === null || manifest.requestKind !== 'round_plan') {
+    throw new TypeError(`${filename} is not an ordinary round-plan launcher.`);
+  }
+  const state = await loadArenaFixture(manifest.fixturePath);
+  return createEngineMcpRuntime(state, {
+    runId: manifest.runId,
+    branchId: manifest.branchId,
+    revision: manifest.revision,
+    requestId: manifest.requestId,
+    phase: manifest.phase,
+    correctionNumber: manifest.correctionNumber,
+    room: manifest.room,
+    historyKind: manifest.historyKind,
+    offerEnvironment: reconstructLauncherOfferEnvironment(manifest),
+    ...(manifest.requestedActorIds === undefined ? {} : { requestedActorIds: manifest.requestedActorIds }),
+    ...(manifest.rendererProfile === undefined ? {} : { rendererProfile: manifest.rendererProfile }),
+    ...(manifest.turnContextMaximumBytes === undefined
+      ? {} : { turnContextMaximumBytes: manifest.turnContextMaximumBytes }),
+    ...(manifest.semanticBoardMaximumBytes === undefined
+      ? {} : { semanticBoardMaximumBytes: manifest.semanticBoardMaximumBytes }),
+    ...(manifest.initiativeProjection === undefined ? {} : { initiativeProjection: manifest.initiativeProjection }),
+  }).feed.current();
+}
+
+function independentlySpecifiedRoundProposalHash(proposal: RoundTurnProposalEnvelope): string {
+  return sha256(canonicalJson({
+    kind: proposal.kind,
+    proposalId: proposal.proposalId,
+    runId: proposal.runId,
+    branchId: proposal.branchId,
+    requestId: proposal.requestId,
+    expectedRevision: proposal.expectedRevision,
+    stateDigest: proposal.stateDigest,
+    stateHandle: proposal.stateHandle,
+    phase: proposal.phase,
+    idempotencyKey: proposal.idempotencyKey,
+    resolutions: proposal.resolutions,
+    rationale: proposal.rationale,
+    reactionGuidance: proposal.reactionGuidance,
+    ...(proposal.submittedArguments === undefined ? {} : {
+      submittedArguments: proposal.submittedArguments,
+    }),
+    ...(proposal.intelCapture === undefined ? {} : { intelCapture: proposal.intelCapture }),
+  }));
+}
+
 function expectIndependentCurrentRowInvariants(input: {
   readonly actualText: string;
   readonly evidence: PrimaryEvidence;
-  readonly recomputed: RecomputedSessionEvidence;
-  readonly expectedAuthorization: Readonly<{ readonly revision: number; readonly digest: string }> | null;
+  readonly capsule: EngineStateCapsule;
+  readonly authorizationCapsule: EngineStateCapsule;
+  readonly independentlyDerivedSessionDigest?: string;
   readonly label: string;
-}): Readonly<{ readonly revision: number; readonly digest: string }> {
+}): void {
   const row = record(JSON.parse(input.actualText.slice(0, -1)) as unknown, input.label);
   const contextText = row['rawTurnContext'];
   if (typeof contextText !== 'string') throw new TypeError(`${input.label} raw context is absent.`);
@@ -565,13 +800,17 @@
   const capsule = record(stateBinding['capsule'], `${input.label} stateBinding.capsule`);
   expect(stateReference, `${input.label} raw context binds the persisted capsule`).toMatchObject({
     run_id: 'encounter:ai-dm-conversation',
-    expected_revision: capsule['revision'],
-    state_handle: `engine-state:${String(capsule['digest'])}`,
+    expected_revision: input.capsule.revision,
+    state_handle: `engine-state:${input.capsule.digest}`,
+  });
+  expect(capsule, `${input.label} persisted capsule binding`).toEqual({
+    revision: input.capsule.revision,
+    digest: input.capsule.digest,
   });
-  expect(row['agentSessionDigestHash'], `${input.label} session digest matches an independently exported journal`)
-    .toBe(input.recomputed.digestHash);
-  expect(input.recomputed.row.agentSessionDigestHash, `${input.label} independent row retains recomputed digest`)
-    .toBe(input.recomputed.digestHash);
+  if (input.independentlyDerivedSessionDigest !== undefined) {
+    expect(row['agentSessionDigestHash'], `${input.label} session digest uses the independently specified payload`)
+      .toBe(input.independentlyDerivedSessionDigest);
+  }
   expectPartyPlanInvariants(row, input.label);
 
   const proposalId = row['proposalId'];
@@ -611,12 +850,12 @@
       .toBe('engine-default:request:room-1-round-1');
     expect(monsters['initialProposalHash'], `${input.label} deterministic proposal hash`)
       .toBe(sha256(canonicalJson(authorizedProposals)));
-    if (input.expectedAuthorization === null) {
-      throw new TypeError(`${input.label} deterministic proposal lacks independent authorization evidence.`);
-    }
     expect(stateBinding['authorization'], `${input.label} deterministic authorization binding`)
-      .toEqual(input.expectedAuthorization);
-    return input.expectedAuthorization;
+      .toEqual({
+        revision: input.authorizationCapsule.revision,
+        digest: input.authorizationCapsule.digest,
+      });
+    return;
   }
 
   const recomputedProposalId = `round:${sha256(canonicalJson({
@@ -627,19 +866,29 @@
   })).slice(0, 48)}`;
   expect(proposalId, `${input.label} proposal id recomputed from submitted engine evidence`)
     .toBe(recomputedProposalId);
+  expect(proposalId, `${input.label} reviewed proposal-id replacement pin`)
+    .toBe(ACCEPTED_IDENTITY_PINS.primaryProposalId);
   expect(monsters['initialProposalHash'], `${input.label} proposal hash recomputed from submitted engine evidence`)
-    .toBe(sha256(authorizedRoundProposalHashInput(submitted)));
+    .toBe(independentlySpecifiedRoundProposalHash(submitted));
+  expect(monsters['initialProposalHash'], `${input.label} reviewed proposal-hash replacement pin`)
+    .toBe(ACCEPTED_IDENTITY_PINS.primaryProposalHash);
   expect(authorizedProposals, `${input.label} team proposals preserve submitted resolutions`).toEqual(
     submitted.resolutions.map((resolution) => resolution.proposal),
   );
-  const authorization = { revision: submitted.expectedRevision, digest: submitted.stateDigest };
+  expect(submitted.stateHandle, `${input.label} submitted proposal state handle`)
+    .toBe(`engine-state:${input.authorizationCapsule.digest}`);
+  const authorization = {
+    revision: input.authorizationCapsule.revision,
+    digest: input.authorizationCapsule.digest,
+  };
+  expect(submitted, `${input.label} submitted proposal binds the independently derived authorization capsule`)
+    .toMatchObject({ expectedRevision: authorization.revision, stateDigest: authorization.digest });
   expect(stateBinding['authorization'], `${input.label} authorization binds the submitted proposal`)
     .toEqual(authorization);
-  return authorization;
 }
 
-function normalizedLegacyLauncher(source: string, expectedSource: string, filename: string): string {
-  const manifest = mutableRecord(JSON.parse(source) as unknown, filename);
+function expectLegacyLauncherAgainstOracle(source: string, expectedSource: string, filename: string): void {
+  const manifest = record(JSON.parse(source) as unknown, filename);
   const expected = record(JSON.parse(expectedSource) as unknown, `${filename} approved oracle`);
   const dispatchId = manifest['dispatchId'];
   const dispatchPhase = filename.includes('-correction-') ? 'correction' : 'primary';
@@ -652,41 +901,45 @@
     isAbsolute(expectedReadinessPath)) {
     throw new TypeError(`${filename} D569 dispatch evidence is invalid.`);
   }
-  const offerEnvironment = record(manifest['offerEnvironment'], `${filename} offerEnvironment`);
-  if (offerEnvironment['format'] !== 'engine-option-environment-v1' ||
-    offerEnvironment['mode'] !== 'legacy_standard' ||
-    typeof offerEnvironment['digest'] !== 'string' || !/^[a-f0-9]{64}$/u.test(offerEnvironment['digest'])) {
-    throw new TypeError(`${filename} offer environment is invalid.`);
-  }
-  delete manifest['dispatchId'];
-  delete manifest['dispatchPhase'];
-  delete manifest['readinessSpoolPath'];
-  delete manifest['offerEnvironment'];
+  expectOfferEnvironmentDerivation(manifest['offerEnvironment'], `${filename} offerEnvironment`);
+  const approvedDifferences: Record<string, Readonly<{ readonly expected: unknown; readonly actual: unknown }>> = {
+    '$launcher.dispatchId': { expected: undefined, actual: dispatchId },
+    '$launcher.dispatchPhase': { expected: undefined, actual: dispatchPhase },
+    '$launcher.offerEnvironment': { expected: undefined, actual: manifest['offerEnvironment'] },
+    '$launcher.readinessSpoolPath': { expected: undefined, actual: expectedReadinessPath },
+  };
   if (filename.endsWith('-launcher-full.json')) {
     for (const field of ['proposalSpoolPath', 'turnContextSpoolPath'] as const) {
       const path = manifest[field];
       if (typeof path !== 'string' || !path.includes('-recovery-')) {
         throw new TypeError(`${filename} ${field} is not recovery-isolated.`);
       }
-      manifest[field] = expected[field];
+      const phase = filename.includes('-correction-') ? 'correction' : 'initial';
+      const stem = field === 'proposalSpoolPath' ? 'proposals' : 'turn-context';
+      const expectedRecoveryPath = `$ARTIFACTS_ROOT/room-1-round-1-${phase}-recovery-${stem}.jsonl`;
+      if (path !== expectedRecoveryPath) {
+        throw new TypeError(`${filename} ${field} recovery destination differs.`);
+      }
+      approvedDifferences[`$launcher.${field}`] = { expected: expected[field], actual: expectedRecoveryPath };
     }
   }
-  const projection = mutableRecord(manifest['initiativeProjection'], `${filename} initiativeProjection`);
-  const timeline = mutableRecord(projection['timeline'], `${filename} initiativeProjection.timeline`);
+  const projection = record(manifest['initiativeProjection'], `${filename} initiativeProjection`);
+  const timeline = record(projection['timeline'], `${filename} initiativeProjection.timeline`);
   const expectedProjection = record(expected['initiativeProjection'], `${filename} approved initiativeProjection`);
   const expectedTimeline = record(expectedProjection['timeline'], `${filename} approved initiativeProjection.timeline`);
   if (!Array.isArray(timeline['branchPoints']) || !Array.isArray(expectedTimeline['branchPoints'])) {
     throw new TypeError(`${filename} initiative branch points are invalid.`);
   }
-  timeline['branchPoints'] = expectedTimeline['branchPoints'];
+  expect(timeline['branchPoints'], `${filename} initiative branch points remain frozen`)
+    .toEqual(expectedTimeline['branchPoints']);
   const deltaBase = manifest['turnContextDeltaBase'];
   const expectedDeltaBase = expected['turnContextDeltaBase'];
   if (deltaBase !== undefined && expectedDeltaBase !== undefined) {
-    const stateRef = mutableRecord(
-      mutableRecord(deltaBase, `${filename} turnContextDeltaBase`)['context'],
+    const stateRef = record(
+      record(deltaBase, `${filename} turnContextDeltaBase`)['context'],
       `${filename} turnContextDeltaBase.context`,
     );
-    const stateReference = mutableRecord(stateRef['state_ref'], `${filename} turnContextDeltaBase state_ref`);
+    const stateReference = record(stateRef['state_ref'], `${filename} turnContextDeltaBase state_ref`);
     const expectedStateReference = record(
       record(record(expectedDeltaBase, `${filename} approved turnContextDeltaBase`)['context'],
         `${filename} approved turnContextDeltaBase.context`)['state_ref'],
@@ -696,9 +949,12 @@
       !/^engine-state:[a-f0-9]{64}$/u.test(stateReference['state_handle'])) {
       throw new TypeError(`${filename} turn-context delta state handle is invalid.`);
     }
-    stateReference['state_handle'] = expectedStateReference['state_handle'];
+    approvedDifferences['$launcher.turnContextDeltaBase.context.state_ref.state_handle'] = {
+      expected: expectedStateReference['state_handle'],
+      actual: `engine-state:${ACCEPTED_IDENTITY_PINS.runnerCapsuleDigest}`,
+    };
   }
-  return JSON.stringify(manifest);
+  expectExactJsonWithDifferences(expected, manifest, approvedDifferences, '$launcher');
 }
 
 function dimensionedPng(identity: string): Buffer {
@@ -804,42 +1060,141 @@
   })) as Readonly<Record<LockedComponentName, LockedBytes>>;
 }
 
-function expectLockedBytes(actual: LegacyAdviceProtocolSurface): void {
+function protocolDifferences(expected: unknown, actual: unknown, path: string): readonly JsonDifference[] {
+  if (Object.is(expected, actual)) return [];
+  if (typeof expected === 'string' && typeof actual === 'string') {
+    try {
+      return protocolDifferences(
+        JSON.parse(expected) as unknown,
+        JSON.parse(actual) as unknown,
+        `${path}<json>`,
+      );
+    } catch {
+      const wrapper = /^([\s\S]*?<engine-data-json>)([\s\S]*)(<\/engine-data-json>[\s\S]*)$/u;
+      const expectedWrapped = wrapper.exec(expected);
+      const actualWrapped = wrapper.exec(actual);
+      if (expectedWrapped !== null && actualWrapped !== null &&
+        expectedWrapped[1] === actualWrapped[1] && expectedWrapped[3] === actualWrapped[3]) {
+        return protocolDifferences(
+          JSON.parse(expectedWrapped[2] ?? '') as unknown,
+          JSON.parse(actualWrapped[2] ?? '') as unknown,
+          `${path}<engine-data-json>`,
+        );
+      }
+    }
+  }
+  if (Array.isArray(expected) && Array.isArray(actual)) {
+    return Array.from({ length: Math.max(expected.length, actual.length) }, (_value, index) =>
+      protocolDifferences(expected[index], actual[index], `${path}[${String(index)}]`)).flat();
+  }
+  if (typeof expected === 'object' && expected !== null && !Array.isArray(expected) &&
+    typeof actual === 'object' && actual !== null && !Array.isArray(actual)) {
+    const expectedRecord = expected as Readonly<Record<string, unknown>>;
+    const actualRecord = actual as Readonly<Record<string, unknown>>;
+    return [...new Set([...Object.keys(expectedRecord), ...Object.keys(actualRecord)])]
+      .sort()
+      .flatMap((key) => protocolDifferences(expectedRecord[key], actualRecord[key], `${path}.${key}`));
+  }
+  return [{ path, expected, actual }];
+}
+
+function neutralCheckoutIdentity(source: string): string {
+  return source
+    .replaceAll(/\/home\/vagrant\/PhpstormProjects\/[^/"\s]+/gu, '<checkout-root>')
+    .replaceAll(/dnd-wt-[A-Za-z0-9_-]+/gu, '<checkout-name>');
+}
+
+function neutralDerivedAdviceIdentity(source: string): string {
+  return source
+    .replaceAll(`engine-state:${FROZEN_IDENTITY_PINS.adviceCapsuleDigest}`, 'engine-state:<schema-4-capsule>')
+    .replaceAll(`engine-state:${ACCEPTED_IDENTITY_PINS.adviceCapsuleDigest}`, 'engine-state:<schema-4-capsule>')
+    .replaceAll(FROZEN_IDENTITY_PINS.adviceJournalCursor, '<schema-4-journal-cursor>')
+    .replaceAll(ACCEPTED_IDENTITY_PINS.adviceJournalCursor, '<schema-4-journal-cursor>');
+}
+
+async function independentlyDerivedAdviceIdentity(): Promise<Readonly<{
+  readonly stateHandle: string;
+  readonly journalUri: string;
+}>> {
+  const state = freshMonsterPlanningState(await loadArenaFixture(LEGACY_ADVICE_ARENA_FIXTURE));
+  const runId = encounterSessionId('encounter:legacy-advice-invariance');
+  const capsule = createEngineMcpRuntime(state, {
+    runId,
+    toolProfile: 'dm',
+    rendererProfile: DEFAULT_RENDERER_PROFILE,
+  }).feed.current();
+  expectCapsuleDerivation(
+    capsule,
+    ACCEPTED_IDENTITY_PINS.adviceCapsuleDigest,
+    FROZEN_IDENTITY_PINS.adviceCapsuleDigest,
+    'legacy advice capsule',
+  );
+  const cursor = sha256(canonicalJson({
+    run: capsule.runId,
+    revision: capsule.revision,
+    digest: capsule.digest,
+    offset: 0,
+  })).slice(0, 48);
+  expect(cursor, 'legacy advice journal cursor explicit derivation pin')
+    .toBe(ACCEPTED_IDENTITY_PINS.adviceJournalCursor);
+  return {
+    stateHandle: `engine-state:${capsule.digest}`,
+    journalUri: `engine://run/encounter%3Alegacy-advice-invariance/journal/1/${cursor}`,
+  };
+}
+
+async function expectLockedBytes(actual: LegacyAdviceProtocolSurface): Promise<void> {
   const expected = lockedFixture();
+  const identity = await independentlyDerivedAdviceIdentity();
   for (const name of Object.keys(actual) as (keyof LegacyAdviceProtocolSurface)[]) {
     const expectedBytes = Buffer.from(expected[name].base64, 'base64');
-    const expectedText = expectedBytes.toString('utf8');
-    const expectedRoot = expectedText.match(/\/home\/vagrant\/PhpstormProjects\/[^/]+/u)?.[0];
-    const expectedWorkspace = expectedText.match(/dnd-wt-[A-Za-z0-9_-]+/u)?.[0];
-    const rooted = expectedRoot === undefined
-      ? actual[name]
-      : actual[name].replaceAll(process.cwd(), expectedRoot);
-    const rootedAndNamed = expectedWorkspace === undefined
-      ? rooted
-      : rooted.replaceAll(basename(process.cwd()), expectedWorkspace);
-    const digestPattern = /[a-f0-9]{64}|[a-f0-9]{48}/gu;
-    const actualDigests = [...rootedAndNamed.matchAll(digestPattern)].map((match) => match[0]);
-    const expectedDigests = [...expectedText.matchAll(digestPattern)].map((match) => match[0]);
-    if (actualDigests.length !== expectedDigests.length) {
-      throw new TypeError(`${name} digest identity inventory differs.`);
-    }
-    const digestMapping = new Map<string, string>();
-    for (const [index, digest] of actualDigests.entries()) {
-      const expectedDigest = expectedDigests[index];
-      if (expectedDigest === undefined ||
-        digestMapping.has(digest) && digestMapping.get(digest) !== expectedDigest) {
-        throw new TypeError(`${name} digest identity correlation differs.`);
-      }
-      digestMapping.set(digest, expectedDigest);
-    }
-    const actualBytes = Buffer.from(rootedAndNamed.replace(
-      digestPattern,
-      (digest) => digestMapping.get(digest) ?? digest,
-    ), 'utf8');
-    expect(actualBytes, `${name} bytes`).toEqual(expectedBytes);
-    expect(actualBytes.byteLength, `${name} byte count`).toBe(expected[name].byteCount);
-    expect(createHash('sha256').update(actualBytes).digest('hex'), `${name} digest`)
-      .toBe(expected[name].sha256);
+    const expectedText = neutralCheckoutIdentity(expectedBytes.toString('utf8'));
+    const actualText = neutralCheckoutIdentity(actual[name]);
+    const approved = name === 'resources' ? {
+      '$protocol.resources<json>.list.result.resources[3].uri': {
+        expected: `engine://run/encounter%3Alegacy-advice-invariance/journal/1/${FROZEN_IDENTITY_PINS.adviceJournalCursor}`,
+        actual: identity.journalUri,
+      },
+      '$protocol.resources<json>.reads[0].result.contents[0].text<json>.state_ref.state_handle': {
+        expected: `engine-state:${FROZEN_IDENTITY_PINS.adviceCapsuleDigest}`,
+        actual: identity.stateHandle,
+      },
+      '$protocol.resources<json>.reads[1].result.contents[0].text<json>.state_ref.state_handle': {
+        expected: `engine-state:${FROZEN_IDENTITY_PINS.adviceCapsuleDigest}`,
+        actual: identity.stateHandle,
+      },
+      '$protocol.resources<json>.reads[2].result.contents[0].text<json>.state_ref.state_handle': {
+        expected: `engine-state:${FROZEN_IDENTITY_PINS.adviceCapsuleDigest}`,
+        actual: identity.stateHandle,
+      },
+      '$protocol.resources<json>.reads[3].result.contents[0].uri': {
+        expected: `engine://run/encounter%3Alegacy-advice-invariance/journal/1/${FROZEN_IDENTITY_PINS.adviceJournalCursor}`,
+        actual: identity.journalUri,
+      },
+    } : name === 'prompts' ? {
+      '$protocol.prompts<json>.planRound.result.messages[0].content.text<engine-data-json>.current_context.state_ref.state_handle': {
+        expected: `engine-state:${FROZEN_IDENTITY_PINS.adviceCapsuleDigest}`,
+        actual: identity.stateHandle,
+      },
+    } : name === 'context' ? {
+      '$protocol.context<json>.state_ref.state_handle': {
+        expected: `engine-state:${FROZEN_IDENTITY_PINS.adviceCapsuleDigest}`,
+        actual: identity.stateHandle,
+      },
+    } : {};
+    const differences = protocolDifferences(expectedText, actualText, `$protocol.${name}`);
+    const approvedDifferences = Object.entries(approved)
+      .map(([path, values]) => ({ path, ...values }))
+      .sort((left, right) => left.path.localeCompare(right.path));
+    expect(differences, `${name} has only independently derived schema-4 protocol identities`)
+      .toEqual(approvedDifferences);
+    const expectedProjection = Buffer.from(neutralDerivedAdviceIdentity(expectedText), 'utf8');
+    const actualProjection = Buffer.from(neutralDerivedAdviceIdentity(actualText), 'utf8');
+    expect(actualProjection, `${name} bytes outside named schema-4 identities`).toEqual(expectedProjection);
+    expect(actualProjection.byteLength, `${name} byte count outside named schema-4 identities`)
+      .toBe(expectedProjection.byteLength);
+    expect(createHash('sha256').update(actualProjection).digest('hex'), `${name} projected digest`)
+      .toBe(createHash('sha256').update(expectedProjection).digest('hex'));
   }
 }
 
@@ -861,7 +1216,7 @@
     const lockedRow = Buffer.from(lockedFixture().row.base64, 'base64').toString('utf8');
     const parsedRow = JSON.parse(lockedRow) as ConversationRowPersisted;
 
-    expectLockedBytes(surface);
+    await expectLockedBytes(surface);
     expect(serializeConversationRow(parsedRow)).toBe(lockedRow);
     expect(record(parsedRow as unknown, 'legacy row')).not.toHaveProperty('dmMode');
   });
@@ -922,27 +1277,43 @@
   });
 
   describe('approved-main row comparison', () => {
-    it('matches approved-main rows after timing and independently verified binding-identity normalization', async () => {
-      const [primary, correction, recomputedPrimary, recomputedCorrection] = await Promise.all([
+    it('matches approved-main rows except individually pinned schema-4 identities with independent derivations', async () => {
+      const [primary, correction] = await Promise.all([
         runnerCapturePromises.primary,
         runnerCapturePromises.correction,
-        recomputedSessionEvidence('primary'),
-        recomputedSessionEvidence('correction'),
       ]);
+      const [capsule, authorizationCapsule] = await Promise.all([
+        capsuleFromLauncher(primary, 'room-1-round-1-initial-launcher.json'),
+        capsuleFromLauncher(primary, 'room-1-round-1-correction-launcher.json'),
+      ]);
+      expectCapsuleDerivation(
+        capsule,
+        ACCEPTED_IDENTITY_PINS.runnerCapsuleDigest,
+        FROZEN_IDENTITY_PINS.runnerCapsuleDigest,
+        'primary capsule',
+      );
+      expectCapsuleDerivation(
+        authorizationCapsule,
+        ACCEPTED_IDENTITY_PINS.runnerAuthorizationDigest,
+        FROZEN_IDENTITY_PINS.runnerAuthorizationDigest,
+        'primary authorization capsule',
+      );
+      const primarySessionDigest = independentlyDerivedPrimarySessionDigest(primary.store);
       const primaryText = lockedText(primary.capture.rowJsonl, 'blind replay primary row');
-      const primaryAuthorization = expectIndependentCurrentRowInvariants({
+      expectIndependentCurrentRowInvariants({
         actualText: primaryText,
         evidence: primary,
-        recomputed: recomputedPrimary,
-        expectedAuthorization: null,
+        capsule,
+        authorizationCapsule,
+        independentlyDerivedSessionDigest: primarySessionDigest,
         label: 'blind replay primary row',
       });
       const correctionText = lockedText(correction.capture.rowJsonl, 'blind replay correction row');
       expectIndependentCurrentRowInvariants({
         actualText: correctionText,
         evidence: correction,
-        recomputed: recomputedCorrection,
-        expectedAuthorization: primaryAuthorization,
+        capsule,
+        authorizationCapsule,
         label: 'blind replay correction row',
       });
 
@@ -951,10 +1322,41 @@
         ['primary', oracle.runs.primary, primaryText],
         ['correction', oracle.runs.correction, correctionText],
       ] as const) {
-        const expected = normalizeOracleRow(expectedCapture.rowJsonl, `runner oracle ${name} row`);
-        const normalized = normalizedCurrentRow(actual, `blind replay ${name} row`);
-        expectExactJson(expected.slice(0, -1), normalized.slice(0, -1), 'row[0]');
-        expect(normalized, `${name} canonical transformed JSONL`).toBe(expected);
+        const expected = comparisonOracleRow(expectedCapture.rowJsonl, `runner oracle ${name} row`);
+        const current = comparisonCurrentRow(actual, `blind replay ${name} row`);
+        const sharedDifferences = {
+          'row[0].rawTurnContext.state_ref.state_handle': {
+            expected: 'engine-state:531ab81515152741951fd3ff78f398bf32e8941c4fc4fbdb9cb3eb5c4732e69e',
+            actual: `engine-state:${ACCEPTED_IDENTITY_PINS.runnerCapsuleDigest}`,
+          },
+          'row[0].stateBinding.authorization.digest': {
+            expected: '797d34c31fcd6bdc26bb9927765471725d21a5c0cacdc60b384eb1672f936b0a',
+            actual: ACCEPTED_IDENTITY_PINS.runnerAuthorizationDigest,
+          },
+          'row[0].stateBinding.capsule.digest': {
+            expected: '531ab81515152741951fd3ff78f398bf32e8941c4fc4fbdb9cb3eb5c4732e69e',
+            actual: ACCEPTED_IDENTITY_PINS.runnerCapsuleDigest,
+          },
+        };
+        expectExactJsonWithDifferences(expected, current, name === 'primary' ? {
+          'row[0].agentSessionDigestHash': {
+            expected: '4487ca12ed8ca24ea829627273c025524c033a4e1a378f015833040423901e7c',
+            actual: ACCEPTED_IDENTITY_PINS.primaryAgentSessionDigest,
+          },
+          'row[0].proposalId': {
+            expected: 'round:72f35a44f584762a020c30ff8b8e901540399abdd066967a',
+            actual: ACCEPTED_IDENTITY_PINS.primaryProposalId,
+          },
+          ...sharedDifferences,
+          'row[0].teamPlans.monsters.initialProposalHash': {
+            expected: 'a7ae167473f1c95e814f8a143add72d4126e69ed4ad834a54a684d566d92c866',
+            actual: ACCEPTED_IDENTITY_PINS.primaryProposalHash,
+          },
+          'row[0].teamPlans.monsters.initialProposalId': {
+            expected: 'round:72f35a44f584762a020c30ff8b8e901540399abdd066967a',
+            actual: ACCEPTED_IDENTITY_PINS.primaryProposalId,
+          },
+        } : sharedDifferences, 'row[0]');
       }
     });
   });
@@ -976,7 +1378,7 @@
   });
 
   describe('approved-main initial launcher comparison', () => {
-    it('matches initial launchers across distinct checkouts modulo only the frozen root inventory and contains no dmMode', async () => {
+    it('matches initial launchers except independently derived D569 and schema-4 fields and contains no dmMode', async () => {
       const actual = (await runnerCapturePromises.primary).capture;
       const oracle = runnerOracle();
       expect(oracle.provenance.checkoutRoot).not.toBe(realpathSync(process.cwd()));
@@ -986,19 +1388,17 @@
       ]) {
         const expectedText = lockedText(oracle.runs.primary.launchers[name], `oracle ${name}`);
         const capturedText = lockedText(actual.launchers[name], `blind replay ${name}`);
-        const actualText = normalizedLegacyLauncher(capturedText, expectedText, name);
         const diagnostic = name.endsWith('-launcher.json')
           ? 'initial-launcher.json'
           : 'initial-launcher-full.json';
-        assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', diagnostic);
-        expectExactJson(expectedText, actualText, diagnostic);
-        expect(actualText, name).toBe(expectedText);
+        assertNoProperty(JSON.parse(capturedText) as unknown, 'dmMode', diagnostic);
+        expectLegacyLauncherAgainstOracle(capturedText, expectedText, name);
       }
     });
   });
 
   describe('approved-main correction launcher comparison', () => {
-    it('enters correction and matches every approved-main correction launcher manifest without dmMode at any depth', async () => {
+    it('enters correction and matches correction launchers except derived D569/schema-4 fields without dmMode', async () => {
       const actual = (await runnerCapturePromises.correction).capture;
       const oracle = runnerOracle();
       const actualRow = record(
@@ -1013,13 +1413,11 @@
       ]) {
         const expectedText = lockedText(oracle.runs.correction.launchers[name], `oracle ${name}`);
         const capturedText = lockedText(actual.launchers[name], `blind replay ${name}`);
-        const actualText = normalizedLegacyLauncher(capturedText, expectedText, name);
         const diagnostic = name.endsWith('-launcher.json')
           ? 'correction-launcher.json'
           : 'correction-launcher-full.json';
-        assertNoProperty(JSON.parse(actualText) as unknown, 'dmMode', diagnostic);
-        expectExactJson(expectedText, actualText, diagnostic);
-        expect(actualText, name).toBe(expectedText);
+        assertNoProperty(JSON.parse(capturedText) as unknown, 'dmMode', diagnostic);
+        expectLegacyLauncherAgainstOracle(capturedText, expectedText, name);
       }
     });
 
