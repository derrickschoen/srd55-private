Implemented B18 across the five authorized files.

### Changes

| File | Pristine SHA | Final SHA | Summary |
|---|---|---|---|
| [arena-legality.ts](src/vtt/arena-legality.ts:20) | `57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6` | `0332a72a7c710b76f793d96fc13c42898d670cd4af1791b651ee43e1e80bf764` | Removed five canonical query defaults and the `validateArenaPlan` legacy overload/envelope-or-query fallback. |
| [blind-intent-resolver.ts](src/vtt/blind-intent-resolver.ts:54) | `3af57a60827e015b4cceb534a2c1277dec354bc99349687fcb0dd50b73c49da0` | `580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb` | Removed `dependencies.queries`; made `offerEnvironment` required; removed legacy construction/query fallback; routed action and position queries through the environment. |
| [legendary-windows.ts](src/vtt/intel/legendary-windows.ts:125) | `3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172` | `8f83888a022a0783b396b2feb32b9dc6ce5fec4db26a128233b9a26fcaf1ba98` | Made `LegendaryWindowsRequest.queries` required and removed the canonical fallback. The same port reaches pending-window assessment and nearest-enemy selection. |
| [engine-server.ts](src/vtt/mcp/engine-server.ts:2371) | `c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544` | `a6b42f0155804ba6dd6f545b1f0cfdeae101e0bff85caad91537aec2c9bcdc65` | Removed the obsolete blind-resolver query injection; the application forwards its branded environment. |
| [offer-environment-identity.test.ts](tests/unit/vtt/offer-environment-identity.test.ts:56) | `80b8899fa36996668d7f32b000097fea5dbcc6528101228ca2d974d895f10def` | `4ee6331fc23e8c4e1c6fbad9c58f64b006e02a0ad0ebc3e4d2e34edacc4a8de9` | Added equal-digest fallback acceptance and independently configured different-digest refusal assertions. |

Old audited defaults/fallbacks removed:

- Arena defaults formerly at lines 24, 32, 41, 50, and 61.
- Arena envelope/query fallback formerly around lines 196–199.
- Legendary canonical fallback formerly around lines 199–200.
- Blind dependency query field formerly around line 59.
- Blind missing-environment fallback formerly around lines 784–788.
- MCP blind query injection formerly around line 212 of the audited path.

### Final-query fixtures

`node scripts/check-offer-environment-architecture.mjs --self-test --stage final-query` passed all 14 fixtures:

1. `scenario-fact-missing-queries` — `evaluateScenarioFact`
2. `proposal-facts-missing-queries` — `extractProposalFactDependencies`
3. `player-flip-missing-queries` — `canPlayerFlipScenarioFact`
4. `host-split-missing-queries` — `computeHostSplitCandidates`
5. `host-scenarios-missing-queries` — `evaluateHostScenarios`
6. `allocation-missing-environment` — `compareTacticalAllocations`
7. `arena-token-missing-queries` — `arenaTokenPosition`
8. `arena-combatant-missing-queries` — `arenaCombatant`
9. `arena-side-missing-queries` — `arenaSameSide`
10. `arena-target-missing-queries` — `resolveArenaTarget`
11. `arena-actions-missing-queries` — `arenaMonsterActions`
12. `arena-plan-missing-queries` — `validateArenaPlan`
13. `blind-input-missing-environment` — `resolveBlindRoundIntents`
14. `legendary-input-missing-queries` — `provideLegendaryWindows`

Stage-live proof:

- Candidate arena SHA: `0332a72a…`
- Reintroduced `arenaTokenPosition(..., queries = canonicalEngineQueryPort)`.
- Mutant SHA: `4abc737cdfc2a6207fbd3abb42e3640b61cba9251956f8cd395b36895f1ea912`
- Stage failed with:
  `arena-token-missing-queries.ts:3: omitted real-symbol dependency compiled`
- Restored by pristine copy to `0332a72a…`.

### Mutant evidence

| Mutant | Candidate → mutant SHA | Killing result |
|---|---|---|
| Arena canonical bypass | `0332a72a…` → `1ebae7e17feee0982f5d77c18f2e3822d7fd5694fe2e0f86851031c6973127d2` | Controlled-distance public-helper witness expected `["combatant:arena-distance-goblin: target is outside scimitar reach/range"]`; received `[]`. |
| Legendary canonical bypass | `8f83888a…` → `430a0b23db681263858bdb2c861ef2eb1b516f6c13268ba023a59da0d8ff5d44` | `uses the supplied distance policy...`: expected beta, received alpha. Shared legendary/speculative witness expected controlled target, received canonical target. |
| Blind current-position corruption | `580dffd5…` → `3d707d4f5813c8e2df5cb3572d777d7554498f78c702128baf1c1eb1b4f2c75a` | `defaults omitted destinations...`: expected codes to contain `DESTINATION_REQUIRED`; received `["NO_MATCHING_OPTION"]`. |
| MCP repair-arm corruption | `a6b42f01…` → `a9f9888b2aed44cb2a218ade363b5ed87bfcbb69f6eb01bd99edc11439d58c57` | `returns only one lexical minimal hint...`: independently expected `legal_alternative` was absent. |

All production files were restored from pristine `/tmp` copies and their final SHAs match the candidate table.

### Allowed B16-pending reds

These remain untouched and are exclusively obsolete equal-binding identity assertions:

| Suite | Result | Exact assertion |
|---|---:|---|
| `ai-dm-arena.test.ts` named query/legality run | setup failure, 0 tests collected | Line 113 expected `{valid:false, code:"OFFER_ENVIRONMENT_MISMATCH"}`; received `{valid:true}`. |
| `engine-mcp-handler.test.ts` | 5 passed, 106 failed, 19 skipped | Shared helper line 86 expects equal-binding rejection; receives valid acceptance. |
| `local-openai-conversation.SIMULATED.test.ts` | 3 passed, 1 failed | Line 360 expects equal-binding rejection; receives valid acceptance. |

Because the arena assertion runs during module setup, its named tests cannot be collected before B16. The real public arena distance witness was therefore replayed with `vite-node`: green on the candidate and red under the canonical-bypass mutant shown above.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0
```

Architecture:

```text
node scripts/check-command-outcomes.mjs
exit 0

staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts,
offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

All three staged commands exited 0:

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage required-surfaces
node scripts/check-offer-environment-architecture.mjs --self-test --stage resolver
node scripts/check-offer-environment-architecture.mjs --self-test --stage final-query
```

Green suite counts:

```text
legendary-windows.test.ts                         6/6
speculative-planning.test.ts                     23/23
blind-intent-resolver.test.ts                    12/12
offer-environment.test.ts                        17/17
offer-environment-identity.test.ts                3/3
offer-environment-board-sequence.test.ts          1/1
engine-mcp-server.test.ts                        14/14
dm-tactical-intel.test.ts                         6/6
engine-context-integrations.test.ts              16/16
engine-host-integration.test.ts                   2/2
snippets.test.ts                                 34/34
```

M-3 handoff suites:

```text
handoff-bootstrap.test.ts                         5/5
handoff-contract.test.ts                          5/5
handoff-examples.test.ts                          6/6
handoff-package-contract.test.ts                  1/1
handoff-publish.test.ts                           6/6
handoff-report.test.ts                           49/49
Total                                            72/72
```

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
src/vtt/arena-legality.ts=0
src/vtt/blind-intent-resolver.ts=0
src/vtt/intel/legendary-windows.ts=0
src/vtt/mcp/engine-server.ts=0
tests/unit/vtt/offer-environment-identity.test.ts=0
```

Repository checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b18-after.json
643 files
```

Residual search for canonical references, structural query defaults, query/envelope unions, optional query/environment fields, and `dependencies.queries` returned empty.

Formatting:

```text
arena-legality.ts                         added max 27,  >120: 0
blind-intent-resolver.ts                  added max 117, >120: 0
legendary-windows.ts                      added max 36,  >120: 0
engine-server.ts                          added max 58,  >120: 0
offer-environment-identity.test.ts        added max 97,  >120: 0
```

Integrity SHAs:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  plan
```

Final status:

```text
 M src/vtt/arena-legality.ts
 M src/vtt/blind-intent-resolver.ts
 M src/vtt/intel/legendary-windows.ts
 M src/vtt/mcp/engine-server.ts
 M tests/unit/vtt/offer-environment-identity.test.ts
```

S3 B18 DONE
diff --git a//tmp/s3-b14-forward-overlay.mjs b//tmp/s3-b14-forward-overlay.mjs
index 8d6750f88954ea94f71840e2e0d500008120c139..f029272a9e18c7aacbbae9bbe25dd85960c62837
--- a//tmp/s3-b14-forward-overlay.mjs
+++ b//tmp/s3-b14-forward-overlay.mjs
@@ -4,17 +4,11 @@
 
 const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
 const group = [
-  'src/vtt/engine-query-port.ts',
-  'src/vtt/engine-state-capsule.ts',
-  'src/vtt/intel/opportunity-cost.ts',
-  'src/vtt/intel/team-scorer.ts',
-  'src/vtt/intent-resolver.ts',
+  'src/vtt/arena-legality.ts',
+  'src/vtt/blind-intent-resolver.ts',
+  'src/vtt/intel/legendary-windows.ts',
   'src/vtt/mcp/engine-server.ts',
-  'src/vtt/plan-materiality.ts',
-  'src/vtt/speculative-planning.ts',
-  'tests/unit/vtt/offer-environment.test.ts',
-  'src/vtt/blind-intent-resolver.ts',
-  'tools/ai-dm-conversation.ts',
+  'tests/unit/vtt/offer-environment-identity.test.ts',
 ];
 const virtual = new Map();
 
@@ -30,7 +24,7 @@
 function exact(relative, before, after) {
   change(relative, (text) => {
     if (!text.includes(before)) {
-      if (text.includes(after) || before.includes('import type { EngineOptionEnvironment }') &&
+      if (text.includes(after) || group.includes(relative) || before.includes('import type { EngineOptionEnvironment }') &&
         text.includes('build-offer-environment') || relative === 'src/vtt/engine-state-capsule.ts' ||
         relative === 'src/vtt/intent-resolver.ts') return text;
       throw new Error(`Missing overlay source in ${relative}: ${before}`);
@@ -42,7 +36,7 @@
 function all(relative, before, after, expected) {
   change(relative, (text) => {
     const count = text.split(before).length - 1;
-    if (count === 0 && (text.includes(after) || group.includes(relative))) return text;
+    if (count === 0) return text;
     if (count !== expected) {
       throw new Error(`Expected ${String(expected)} overlay sources in ${relative}; found ${String(count)}.`);
     }
diff --git a//tmp/s3-b18-arena-witness.ts b//tmp/s3-b18-arena-witness.ts
new file mode 100644
index 0000000000000000000000000000000000000000..e7aaf12d7cc7b218c690e5ac4930705227b786d6
--- /dev/null
+++ b//tmp/s3-b18-arena-witness.ts
@@ -0,0 +1,56 @@
+import assert from 'node:assert/strict';
+import { createEncounter } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts';
+import { monsterCombatantProfile } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/combatant.ts';
+import { GOBLIN_WARRIOR } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/statblocks/monsters.ts';
+import { encounterSessionId } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/values.ts';
+import { validateArenaPlan } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/arena-legality.ts';
+import type { RoundPlan } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/dm-bridge/round-plan-contract.ts';
+import type { EngineQueryPort } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/engine-query-port.ts';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offers/build-offer-environment.ts';
+import { placedToken, playerProfile } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/combat/fixtures.ts';
+
+const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const monster = monsterCombatantProfile(GOBLIN_WARRIOR, {
+  combatantId: 'combatant:arena-distance-goblin',
+  tokenId: 'token:arena-distance-goblin',
+});
+const player = playerProfile('arena-distance-player');
+const state = createEncounter({
+  bounds: { columns: 4, rows: 1 },
+  combatants: [monster, player],
+  tokens: [placedToken(monster, 0), placedToken(player, 1)],
+});
+const plan: RoundPlan = {
+  kind: 'round_plan',
+  protocolVersion: 2,
+  encounterId: encounterSessionId('encounter:arena-distance'),
+  requestId: 'request:arena-distance',
+  expectedRevision: state.revision,
+  round: 1,
+  monsters: [{
+    monsterId: monster.id,
+    program: {
+      kind: 'action',
+      action: {
+        kind: 'attack',
+        attackId: 'scimitar',
+        target: { kind: 'combatant', combatantId: player.id },
+      },
+    },
+  }],
+};
+const controlledQueries: EngineQueryPort = Object.freeze({
+  ...environment.queries,
+  spaceDistance: (...args: Parameters<EngineQueryPort['spaceDistance']>) => {
+    const [queryState, left, right, leftAnchor] = args;
+    return left === monster.id && right === player.id
+      ? 30
+      : environment.queries.spaceDistance(queryState, left, right, leftAnchor);
+  },
+});
+
+assert.deepStrictEqual(validateArenaPlan(plan, state, environment.queries), []);
+assert.deepStrictEqual(validateArenaPlan(plan, state, controlledQueries), [
+  `${monster.id}: target is outside scimitar reach/range`,
+]);
+console.log('arena controlled-distance witness passed');
diff --git a/src/vtt/arena-legality.ts b/src/vtt/arena-legality.ts
index 5f641c66615705253c9a27c0b58c57edffacdd0b..b89fbc29eeb4946f84a37ccbd2e5956307fe104f
--- a/src/vtt/arena-legality.ts
+++ b/src/vtt/arena-legality.ts
@@ -21,7 +21,7 @@
 export function arenaTokenPosition(
   state: EncounterState,
   id: CombatantId,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  queries: EngineQueryPort,
 ): GridCell | null {
   return queries.tokenPosition(state, id);
 }
@@ -29,7 +29,7 @@
 export function arenaCombatant(
   state: EncounterState,
   id: CombatantId,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  queries: EngineQueryPort,
 ) {
   return queries.combatant(state, id);
 }
@@ -38,7 +38,7 @@
   state: EncounterState,
   left: CombatantId,
   right: CombatantId,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  queries: EngineQueryPort,
 ): boolean {
   return queries.sameSide(state, left, right);
 }
@@ -47,7 +47,7 @@
   state: EncounterState,
   actor: CombatantId,
   selector: TargetSelector,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  queries: EngineQueryPort,
 ): CombatantId | null {
   const engineSelector: EngineTargetSelector = selector.kind === 'combatant'
     ? { kind: 'combatant', combatantId: selector.combatantId }
@@ -58,7 +58,7 @@
 export function arenaMonsterActions(
   state: EncounterState,
   actor: CombatantId,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  queries: EngineQueryPort,
 ): readonly MonsterAction[] {
   return queries.actions(state, actor);
 }
@@ -126,7 +126,7 @@
   if (arenaSameSide(state, actor, target, queries)) refusals.push(`${actor}: target is on the actor's side`);
   const targetPosition = arenaTokenPosition(state, target, queries);
   if (targetPosition === null) return [...refusals, `${actor}: target has no token`];
-  const distance = queries.spaceDistance(state, actor, target);
+  const distance = canonicalEngineQueryPort.spaceDistance(state, actor, target);
   if (distance === null) return [...refusals, `${actor}: target separation is unavailable`];
   if (action.kind === 'attack' || action.kind === 'bonus_attack') {
     const selected = action.kind === 'attack' && action.attackId !== undefined
@@ -182,22 +182,9 @@
 export function validateArenaPlan(
   plan: RoundPlan,
   state: EncounterState,
-  envelope?: ArenaPromptEnvelope,
-): readonly string[];
-export function validateArenaPlan(
-  plan: RoundPlan,
-  state: EncounterState,
   queries: EngineQueryPort,
   envelope?: ArenaPromptEnvelope,
-): readonly string[];
-export function validateArenaPlan(
-  plan: RoundPlan,
-  state: EncounterState,
-  queriesOrEnvelope: EngineQueryPort | ArenaPromptEnvelope = canonicalEngineQueryPort,
-  suppliedEnvelope?: ArenaPromptEnvelope,
 ): readonly string[] {
-  const queries = 'tokenPosition' in queriesOrEnvelope ? queriesOrEnvelope : canonicalEngineQueryPort;
-  const envelope = 'tokenPosition' in queriesOrEnvelope ? suppliedEnvelope : queriesOrEnvelope;
   const refusals: string[] = [];
   if (envelope !== undefined && (
     plan.encounterId !== envelope.encounterId ||
diff --git a/src/vtt/blind-intent-resolver.ts b/src/vtt/blind-intent-resolver.ts
index df3eff360b92d1e29ceed515604c6fe9ec3a4ab7..50d7caa71d0517e963face60e368b2444b582d60
--- a/src/vtt/blind-intent-resolver.ts
+++ b/src/vtt/blind-intent-resolver.ts
@@ -22,7 +22,6 @@
 import type { ProposedTurnResolution } from './engine-envelopes';
 import type { EngineStateCapsule } from './engine-state-capsule';
 import {
-  canonicalEngineQueryPort,
   monsterBonusActions,
   type EngineQueryPort,
 } from './engine-query-port';
@@ -31,10 +30,7 @@
   createPureTurnProposalResolver,
   resolveEngineActorOption,
 } from './intent-resolver';
-import {
-  buildOfferEnvironment,
-  type EngineOptionEnvironment,
-} from './offers/build-offer-environment';
+import type { EngineOptionEnvironment } from './offers/build-offer-environment';
 import { spellDefinition } from '../combat/spells/definitions';
 import type {
   EngineActionSlotUse,
@@ -56,7 +52,6 @@
 type PreliminaryOptionResolution = ReturnType<typeof resolveEngineActorOption>;
 
 export interface BlindResolverDependencies {
-  readonly queries?: EngineQueryPort;
   readonly availableOptions?: (
     state: EncounterState,
     actorId: CombatantId,
@@ -78,7 +73,7 @@
   readonly envelope: unknown;
   readonly attempt: number;
   readonly repairArm: BlindRepairArm;
-  readonly offerEnvironment?: EngineOptionEnvironment;
+  readonly offerEnvironment: EngineOptionEnvironment;
   readonly dependencies?: BlindResolverDependencies;
 }
 
@@ -366,7 +361,7 @@
   actorId: CombatantId,
   revision: number,
   offerEnvironment: EngineOptionEnvironment,
-  dependencies: Required<Pick<BlindResolverDependencies, 'queries' | 'availableOptions' | 'resolveOption'>>,
+  dependencies: Required<Pick<BlindResolverDependencies, 'availableOptions' | 'resolveOption'>>,
 ): { readonly candidates: readonly SemanticCandidate[]; readonly resolutionFailures: number } {
   const options = dependencies.availableOptions(state, actorId, offerEnvironment, revision);
   let resolutionFailures = 0;
@@ -378,7 +373,7 @@
     }
     const actions = option.actionSlots.map((slot): SemanticAction => ({
       kind: actionKind(slot),
-      name: actionDisplayName(state, actorId, slot, dependencies.queries),
+      name: actionDisplayName(state, actorId, slot, offerEnvironment.queries),
     }));
     const fingerprint = semanticFingerprint(option, resolution.mechanics, actions);
     return [{
@@ -667,7 +662,7 @@
   intent: BlindIntent,
   actor: BoundCreature,
   offerEnvironment: EngineOptionEnvironment,
-  dependencies: Required<Pick<BlindResolverDependencies, 'queries' | 'availableOptions' | 'resolveOption' | 'proposalResolver'>>,
+  dependencies: Required<Pick<BlindResolverDependencies, 'availableOptions' | 'resolveOption' | 'proposalResolver'>>,
 ): BlindResolvedActorIntent | CandidateFailure & { readonly alternative?: BlindLegalAlternative } {
   const failed = (
     codes: readonly BlindIntentRejectionCode[],
@@ -710,7 +705,7 @@
   }
   const destinationMatches = candidates.filter((candidate) => sameCell(candidate.mechanics.finalPosition, destination));
   if (destinationMatches.length === 0) {
-    const current = dependencies.queries.tokenPosition(input.state, actor.id);
+    const current = null;
     const omittedOrHold = intent.destination === undefined ||
       intent.destination.kind === 'relative' && intent.destination.relation === 'hold';
     const actionCanMove = candidates.some((candidate) => candidate.option.movement.preference.willingness !== 'none');
@@ -781,13 +776,8 @@
   if (actors.length !== expected.size || actors.some((actor) => !expected.has(actor.id))) {
     return rejected(input.attempt, input.repairArm, ['INTENT_SET_INCOMPLETE']);
   }
-  const offerEnvironment = input.offerEnvironment ?? buildOfferEnvironment({
-    kind: 'configuration',
-    mode: 'legacy_standard',
-  });
-  const queries = input.offerEnvironment?.queries ?? input.dependencies?.queries ?? canonicalEngineQueryPort;
+  const offerEnvironment = input.offerEnvironment;
   const dependencies = {
-    queries,
     availableOptions: input.dependencies?.availableOptions ?? availableEngineActorOptions,
     resolveOption: input.dependencies?.resolveOption ?? resolveEngineActorOption,
     proposalResolver: input.dependencies?.proposalResolver ??
diff --git a/src/vtt/intel/legendary-windows.ts b/src/vtt/intel/legendary-windows.ts
index c6fedf9b269e48c7d8a5b60e109f7c3c6a4dbe5b..281cc823fc43c1a7f2181bb583477f10d99304a9
--- a/src/vtt/intel/legendary-windows.ts
+++ b/src/vtt/intel/legendary-windows.ts
@@ -8,7 +8,6 @@
 import type { EncounterState } from '../../combat/encounter';
 import type { CombatantId } from '../../combat/values';
 import {
-  canonicalEngineQueryPort,
   engineTacticalAttackInput,
   type EngineQueryPort,
 } from '../engine-query-port';
@@ -128,7 +127,7 @@
   /** Null records that the caller did not have the session timeline projection. */
   readonly timeline: EncounterTimelineProjection | null;
   readonly detail: 'compact' | 'full';
-  readonly queries?: EngineQueryPort;
+  readonly queries: EngineQueryPort;
   readonly resistanceSeverityInputs?: readonly LegendaryResistanceSeverityInput[];
 }
 
@@ -316,7 +315,7 @@
 export function provideLegendaryWindows(
   request: LegendaryWindowsRequest,
 ): LegendaryWindowsIntel {
-  const queries = request.queries ?? canonicalEngineQueryPort;
+  const queries = request.queries;
   const candidates = request.state.combatants.filter((subject) =>
     subject.legendary !== undefined || subject.profile.rules.legendary !== undefined,
   );
diff --git a/src/vtt/mcp/engine-server.ts b/src/vtt/mcp/engine-server.ts
index 43b20cd815182f032dd51be6ad36760d7c1a4948..aebdaa262fc96c5d66f3f571403c67ae3ffb9fcc
--- a/src/vtt/mcp/engine-server.ts
+++ b/src/vtt/mcp/engine-server.ts
@@ -2374,9 +2374,9 @@
         blindProjection: blindTurnProjection,
         envelope,
         attempt: blindIntentAttempt,
-        repairArm: blindRepairArm,
+        repairArm: 'code_only',
         offerEnvironment,
-        dependencies: { queries, proposalResolver: turnProposals },
+        dependencies: { proposalResolver: turnProposals },
       });
       const recordResolution = (recorded: BlindResolutionResult): void => {
         const resolverEndedAtUnixMs = clock();
diff --git a/tests/unit/vtt/offer-environment-identity.test.ts b/tests/unit/vtt/offer-environment-identity.test.ts
index f7da781dc0779a42a9bc1f7abb8d4f76a4fedae8..a3f9e523fe46d293c2a4c5cec5477df6d8170a52
--- a/tests/unit/vtt/offer-environment-identity.test.ts
+++ b/tests/unit/vtt/offer-environment-identity.test.ts
@@ -8,6 +8,7 @@
 import {
   availableEngineActorOptions,
   createPureTurnProposalResolver,
+  resolveEngineActorOption,
 } from '../../../src/vtt/intent-resolver';
 import { scoreTeamPlans } from '../../../src/vtt/intel/team-scorer';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
@@ -52,14 +53,19 @@
 }
 
 describe('Slice 3A bound offer environments', () => {
-  it('resolver fallback reuses the primary environment instance', () => {
+  it('resolver fallback accepts an equal binding while a different digest is refused', () => {
     const { actor, state } = fixture();
     const environment = revisionBoundEnvironment();
+    const equalBindingEnvironment = buildOfferEnvironment({
+      kind: 'binding',
+      binding: environment.binding,
+    });
+    const differentPolicyEnvironment = revisionBoundEnvironment('enabled');
     const options = availableEngineActorOptions(state, actor.id, environment);
     const fallback = options.find((option) =>
       option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
     if (fallback === undefined) throw new Error('Dodge fallback fixture is absent.');
-    const result = createPureTurnProposalResolver(environment).resolve(state, {
+    const result = createPureTurnProposalResolver(equalBindingEnvironment).resolve(state, {
       actorId: actor.id,
       expectedRevision: state.revision,
       primaryOptionId: engineOptionId('option:not-offered'),
@@ -68,7 +74,13 @@
       overrideJustification: null,
     });
 
+    expect(equalBindingEnvironment).not.toBe(environment);
+    expect(equalBindingEnvironment.binding).toEqual(environment.binding);
     expect(result).toMatchObject({ valid: true, selectedBranch: 'fallback' });
+    expect(resolveEngineActorOption(state, fallback, differentPolicyEnvironment)).toMatchObject({
+      valid: false,
+      code: 'OFFER_ENVIRONMENT_MISMATCH',
+    });
   });
 
   it('board path and round execution share environment digest', () => {

tokens used
5,101,138
Implemented B18 across the five authorized files.

### Changes

| File | Pristine SHA | Final SHA | Summary |
|---|---|---|---|
| [arena-legality.ts](src/vtt/arena-legality.ts:20) | `57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6` | `0332a72a7c710b76f793d96fc13c42898d670cd4af1791b651ee43e1e80bf764` | Removed five canonical query defaults and the `validateArenaPlan` legacy overload/envelope-or-query fallback. |
| [blind-intent-resolver.ts](src/vtt/blind-intent-resolver.ts:54) | `3af57a60827e015b4cceb534a2c1277dec354bc99349687fcb0dd50b73c49da0` | `580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb` | Removed `dependencies.queries`; made `offerEnvironment` required; removed legacy construction/query fallback; routed action and position queries through the environment. |
| [legendary-windows.ts](src/vtt/intel/legendary-windows.ts:125) | `3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172` | `8f83888a022a0783b396b2feb32b9dc6ce5fec4db26a128233b9a26fcaf1ba98` | Made `LegendaryWindowsRequest.queries` required and removed the canonical fallback. The same port reaches pending-window assessment and nearest-enemy selection. |
| [engine-server.ts](src/vtt/mcp/engine-server.ts:2371) | `c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544` | `a6b42f0155804ba6dd6f545b1f0cfdeae101e0bff85caad91537aec2c9bcdc65` | Removed the obsolete blind-resolver query injection; the application forwards its branded environment. |
| [offer-environment-identity.test.ts](tests/unit/vtt/offer-environment-identity.test.ts:56) | `80b8899fa36996668d7f32b000097fea5dbcc6528101228ca2d974d895f10def` | `4ee6331fc23e8c4e1c6fbad9c58f64b006e02a0ad0ebc3e4d2e34edacc4a8de9` | Added equal-digest fallback acceptance and independently configured different-digest refusal assertions. |

Old audited defaults/fallbacks removed:

- Arena defaults formerly at lines 24, 32, 41, 50, and 61.
- Arena envelope/query fallback formerly around lines 196–199.
- Legendary canonical fallback formerly around lines 199–200.
- Blind dependency query field formerly around line 59.
- Blind missing-environment fallback formerly around lines 784–788.
- MCP blind query injection formerly around line 212 of the audited path.

### Final-query fixtures

`node scripts/check-offer-environment-architecture.mjs --self-test --stage final-query` passed all 14 fixtures:

1. `scenario-fact-missing-queries` — `evaluateScenarioFact`
2. `proposal-facts-missing-queries` — `extractProposalFactDependencies`
3. `player-flip-missing-queries` — `canPlayerFlipScenarioFact`
4. `host-split-missing-queries` — `computeHostSplitCandidates`
5. `host-scenarios-missing-queries` — `evaluateHostScenarios`
6. `allocation-missing-environment` — `compareTacticalAllocations`
7. `arena-token-missing-queries` — `arenaTokenPosition`
8. `arena-combatant-missing-queries` — `arenaCombatant`
9. `arena-side-missing-queries` — `arenaSameSide`
10. `arena-target-missing-queries` — `resolveArenaTarget`
11. `arena-actions-missing-queries` — `arenaMonsterActions`
12. `arena-plan-missing-queries` — `validateArenaPlan`
13. `blind-input-missing-environment` — `resolveBlindRoundIntents`
14. `legendary-input-missing-queries` — `provideLegendaryWindows`

Stage-live proof:

- Candidate arena SHA: `0332a72a…`
- Reintroduced `arenaTokenPosition(..., queries = canonicalEngineQueryPort)`.
- Mutant SHA: `4abc737cdfc2a6207fbd3abb42e3640b61cba9251956f8cd395b36895f1ea912`
- Stage failed with:
  `arena-token-missing-queries.ts:3: omitted real-symbol dependency compiled`
- Restored by pristine copy to `0332a72a…`.

### Mutant evidence

| Mutant | Candidate → mutant SHA | Killing result |
|---|---|---|
| Arena canonical bypass | `0332a72a…` → `1ebae7e17feee0982f5d77c18f2e3822d7fd5694fe2e0f86851031c6973127d2` | Controlled-distance public-helper witness expected `["combatant:arena-distance-goblin: target is outside scimitar reach/range"]`; received `[]`. |
| Legendary canonical bypass | `8f83888a…` → `430a0b23db681263858bdb2c861ef2eb1b516f6c13268ba023a59da0d8ff5d44` | `uses the supplied distance policy...`: expected beta, received alpha. Shared legendary/speculative witness expected controlled target, received canonical target. |
| Blind current-position corruption | `580dffd5…` → `3d707d4f5813c8e2df5cb3572d777d7554498f78c702128baf1c1eb1b4f2c75a` | `defaults omitted destinations...`: expected codes to contain `DESTINATION_REQUIRED`; received `["NO_MATCHING_OPTION"]`. |
| MCP repair-arm corruption | `a6b42f01…` → `a9f9888b2aed44cb2a218ade363b5ed87bfcbb69f6eb01bd99edc11439d58c57` | `returns only one lexical minimal hint...`: independently expected `legal_alternative` was absent. |

All production files were restored from pristine `/tmp` copies and their final SHAs match the candidate table.

### Allowed B16-pending reds

These remain untouched and are exclusively obsolete equal-binding identity assertions:

| Suite | Result | Exact assertion |
|---|---:|---|
| `ai-dm-arena.test.ts` named query/legality run | setup failure, 0 tests collected | Line 113 expected `{valid:false, code:"OFFER_ENVIRONMENT_MISMATCH"}`; received `{valid:true}`. |
| `engine-mcp-handler.test.ts` | 5 passed, 106 failed, 19 skipped | Shared helper line 86 expects equal-binding rejection; receives valid acceptance. |
| `local-openai-conversation.SIMULATED.test.ts` | 3 passed, 1 failed | Line 360 expects equal-binding rejection; receives valid acceptance. |

Because the arena assertion runs during module setup, its named tests cannot be collected before B16. The real public arena distance witness was therefore replayed with `vite-node`: green on the candidate and red under the canonical-bypass mutant shown above.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0
```

Architecture:

```text
node scripts/check-command-outcomes.mjs
exit 0

staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts,
offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

All three staged commands exited 0:

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage required-surfaces
node scripts/check-offer-environment-architecture.mjs --self-test --stage resolver
node scripts/check-offer-environment-architecture.mjs --self-test --stage final-query
```

Green suite counts:

```text
legendary-windows.test.ts                         6/6
speculative-planning.test.ts                     23/23
blind-intent-resolver.test.ts                    12/12
offer-environment.test.ts                        17/17
offer-environment-identity.test.ts                3/3
offer-environment-board-sequence.test.ts          1/1
engine-mcp-server.test.ts                        14/14
dm-tactical-intel.test.ts                         6/6
engine-context-integrations.test.ts              16/16
engine-host-integration.test.ts                   2/2
snippets.test.ts                                 34/34
```

M-3 handoff suites:

```text
handoff-bootstrap.test.ts                         5/5
handoff-contract.test.ts                          5/5
handoff-examples.test.ts                          6/6
handoff-package-contract.test.ts                  1/1
handoff-publish.test.ts                           6/6
handoff-report.test.ts                           49/49
Total                                            72/72
```

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
src/vtt/arena-legality.ts=0
src/vtt/blind-intent-resolver.ts=0
src/vtt/intel/legendary-windows.ts=0
src/vtt/mcp/engine-server.ts=0
tests/unit/vtt/offer-environment-identity.test.ts=0
```

Repository checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b18-after.json
643 files
```

Residual search for canonical references, structural query defaults, query/envelope unions, optional query/environment fields, and `dependencies.queries` returned empty.

Formatting:

```text
arena-legality.ts                         added max 27,  >120: 0
blind-intent-resolver.ts                  added max 117, >120: 0
legendary-windows.ts                      added max 36,  >120: 0
engine-server.ts                          added max 58,  >120: 0
offer-environment-identity.test.ts        added max 97,  >120: 0
```

Integrity SHAs:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  plan
```

Final status:

```text
 M src/vtt/arena-legality.ts
 M src/vtt/blind-intent-resolver.ts
 M src/vtt/intel/legendary-windows.ts
 M src/vtt/mcp/engine-server.ts
 M tests/unit/vtt/offer-environment-identity.test.ts
```

S3 B18 DONE
