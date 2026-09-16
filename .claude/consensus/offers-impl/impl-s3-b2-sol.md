# OFFERS-IMPL-S3-BUILDER B2 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b2.log. Supervisor verification .tmp/runs/verify-s3-b2.log.

Implemented B2 across exactly the ten allowed files. No tests, pins, package files, frozen files, or other paths changed.

## File summary and hashes

| File | Pristine SHA | Final SHA | Change |
|---|---|---|---|
| `src/vtt/challenge-feasibility.ts` | `e8f7b5e28399309cb0a1cd5cecc2912e1413bbead30450c17b908ecdb36ebb23` | `33fc1e104c05d81ab38e8fecc2f7d3c831d6e5432ae16b2fa61ee03ab689632a` | Builds explicit legacy environments at public roots and threads them through internal offer generation/resolution. |
| `src/vtt/encounter-projections.ts` | `16fd63226e512ade90ef08a5c50811dbd16d5e6a39958846ed015ff1d6931110` | `281dfa9a820b41c5b20388cee01d5358847858f3adb2aeb6cc9e39fdfba98510` | Adds optional projector environment input, DM-only `offerEnvironmentDigest`, and temporary legacy fallback. |
| `src/vtt/engine-query-port.ts` | `fe50bf5637c277b732befbf071554e76075351865d72e0b90dade5502b7adff9` | `00bcf3aa60cae0a96f552578d5fd249935f37c9b9568720fcd21eee1fd959ab6` | Adds the compatible fifth allocation environment argument and uses it for offers and resolution. |
| `src/vtt/mcp/engine-server.ts` | `f9b62a56229bf22433c813b6a69474363bfdf5c5078d64c1e51e2d331b0e1c7c` | `4bd20ca9fbf6a59ea084a113b75594b63783e1273baf852cc9e8dd2b2c2e1a6f` | Derives `turnProposals` internally and forwards the application environment into blind resolution. |
| `src/vtt/mcp/entrypoint.ts` | `bc8699fd882cc501ecfecf7f50b34ddfc46abaab2facbf55b8d3f15f9f947555` | `47a4b9945be2f19fb3d2df42ba3337529d8f5fabdc39fc6de870f344d6c889a8` | Uses the builder for fallback/raw/launcher reconstruction, strengthens launcher classification, forwards environment queries, and adds compatible handler forms. |
| `tools/ai-dm-arena.ts` | `2fcd8d845c5248775aa34a034d1487857d664c5bec46f7511ef18f8f6ac130ed` | `2dc060816e162008ed3fd1b864ce4c9c52e1761d14fc73185edf0cfe112caf0d` | Adds optional root input, populates legacy configuration in parsing, and forwards it unchanged to conversation runs. |
| `tools/ai-dm-conversation.ts` | `860ae96d012af412ab01406ace65a32ffc93a89d7d3a4b31819d96eae10178c5` | `0e7ab470a4da6de4264041b05c8dbf41d02512516915616006af9c764166bbb8` | Builds the run environment, reconstructs snapshots through the builder, and threads it through authoritative divergence checks. |
| `tools/engine-mcp-dry-client.ts` | `fe81c27178b1f5904bc83f4b645eed8a0298fc2e7a9967dc91a9e9614561d03f` | `6f3e888b4f3b3becc73b663bf312b561cb7afd6bbe610dae2bd4acd718a1935a` | Adds explicit discriminated fixture/launcher inputs while retaining old string callers. |
| `src/vtt/arena-legality.ts` | `b0d44fce034fabef3a3564823d1082aa45c9a93ebf10e053917c74a6c55ff02a` | `57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6` | Adds forwarded query arguments and the compatible old/new `validateArenaPlan` overloads. |
| `src/vtt/blind-intent-resolver.ts` | `517e6bc82ffd1a96b35413d88d347554153180b78cd1f2ce012b78a0b33b6b0a` | `fa011ea68733cdd24186933cd422707579d1124565a561db4954c7d5c0f96fa7` | Adds optional `offerEnvironment`, prioritizes its queries, and derives the default resolver from it. |

Diff total: `10 files changed, 227 insertions(+), 94 deletions(-)`.

## Transitional seams

B13 removal targets:

- `src/vtt/encounter-projections.ts:413,488`: optional projector environment and legacy fallback.
- `src/vtt/mcp/entrypoint.ts:435-436,451`: optional runtime environment and builder legacy fallback.
- `src/vtt/mcp/entrypoint.ts:654-681`: legacy handler overload and optional request environment.
- `src/vtt/mcp/entrypoint.ts:701,715`: defaulted server/line options.
- `tools/ai-dm-arena.ts:107`: optional arena root configuration.
- `tools/ai-dm-conversation.ts:283,4263`: optional conversation root configuration and legacy fallback.
- `tools/ai-dm-conversation.ts:4010-4014`: optional divergence environment and singleton fallback.
- Structural environment imports in the projector and entrypoint remain until B13’s branded-type switch.

B14 removal targets:

- `src/vtt/engine-query-port.ts:1712-1714`: optional allocation environment and canonical fallback.
- `src/vtt/blind-intent-resolver.ts:55-68`: old query-port callback/dependency declarations.

B18 removal targets:

- `src/vtt/arena-legality.ts:24,32,41,50,61,186-200`: default query arguments and old `validateArenaPlan` form.
- `src/vtt/blind-intent-resolver.ts:56,78,778-783`: optional environment, `dependencies.queries`, and missing-environment fallback.
- `src/vtt/mcp/engine-server.ts:2285-2286`: transitional query/proposal dependency forwarding into blind resolution.

Dry-client compatibility:

- `tools/engine-mcp-dry-client.ts:44-49`: old string/scenario construction remains accepted alongside the explicit launcher/fixture union, because B2 must keep existing test callers compiling.

The launcher construction type remains optional at `src/vtt/mcp/entrypoint.ts:335`, while the strict decoder still requires and validates the binding.

## Mutation evidence

| Mutation | Mutant SHA | Killing command/result | Restored SHA |
|---|---|---|---|
| `MALFORMED_BINDING` actual child launcher fixture | `17edd999cecc9fd1ed228dec3c8a5c238b8e7c780f46094d3ba7a46b4ab9f3ed` | `node node_modules/vite-node/vite-node.mjs tools/engine-mcp-server.ts /tmp/s3-b2-launcher.json < /dev/null` → exit 1, `TypeError: engine option environment binding has an invalid shape.` | `024ed50a2a7d8805a0b21d56a973fced7ed73467b8c19c2a16c1635e413e1b1d` |
| Malformed-launcher fallback regression | `9befadacf6e5c28140472208c5e2156445b880f0b38fe365cc23a0ae3b44a6ae` | Boundary suite red: `2 failed, 6 passed`; named no-fallback test reported “expected function to throw, but it didn't.” | `47a4b9945be2f19fb3d2df42ba3337529d8f5fabdc39fc6de870f344d6c889a8` |
| Policy/catalog digest-input mutation | `c4fa4f1f7dafdfd82e407a6b49790901d607078c211ef374bd74002871473847` | Three environment suites red: `3 failed, 12 passed`; policy pin expected `a1572528…`, received `e2a1f80b…`. | `87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51` |
| Catalog-only digest-input mutation | `b02d976f7700c61c9459c574e1fc5b27b980748d733dd6a28ea06e0e26bfe28a` | Three environment suites red: `3 failed, 12 passed`; catalog pin expected `31cec41a…`, received `0a892f9a…`. | `87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51` |

The explicit dry-client launcher probe also passed:

```text
node node_modules/vite-node/vite-node.mjs /tmp/s3-b2-dry-launcher-probe.ts
response=jsonrpc-2.0
exit=0
```

## Final green

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

```text
bash scripts/check-command-outcomes.sh
exit 0
ast-grep: 1 passed, 0 failed
architecture self-test: 39 active fixtures passed
production architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

No new transitional runtime export was added.

```text
npx vitest run --configLoader runner tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts

Test Files  3 passed (3)
Tests       15 passed (15)
```

Legacy-ID and launch-validation controls identified from §6/§7:

```text
npx vitest run --configLoader runner tests/unit/tools/ai-dm-legacy-invariance.test.ts tests/unit/tools/engine-mcp-boundary.test.ts

Test Files  2 passed (2)
Tests       18 passed (18)
```

Individual membership: legacy invariance `10`; engine MCP boundary `8`.

Additional focused implementation check:

```text
npx vitest run --configLoader runner tests/unit/vtt/challenge-feasibility.test.ts tests/unit/vtt/blind-intent-resolver.test.ts

Test Files  2 passed (2)
Tests       42 passed (42)
```

```text
npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b2-after.json
exit 0
rows=643
newSpecs=0

git diff --check
exit 0
```

Frozen and unchanged hashes:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  frozen plan
87414b77c4254b6411171c7c22865b9028b4a92634ea957482ac9cc344ee2a51  accepted B1 builder
```

## Line audit

Existing accepted files already contain over-120 lines; no newly added line exceeds 120 characters.

| File | Whole file max / >120 | Baseline max / >120 | Added max / >120 |
|---|---:|---:|---:|
| `challenge-feasibility.ts` | `150 / 9` | `150 / 9` | `108 / 0` |
| `encounter-projections.ts` | `354 / 3` | `354 / 3` | `115 / 0` |
| `engine-query-port.ts` | `147 / 4` | `147 / 4` | `83 / 0` |
| `engine-server.ts` | `707 / 156` | `707 / 157` | `73 / 0` |
| `entrypoint.ts` | `194 / 8` | `194 / 8` | `107 / 0` |
| `ai-dm-arena.ts` | `136 / 7` | `136 / 7` | `100 / 0` |
| `ai-dm-conversation.ts` | `348 / 37` | `348 / 37` | `114 / 0` |
| `engine-mcp-dry-client.ts` | `162 / 13` | `162 / 13` | `106 / 0` |
| `arena-legality.ts` | `121 / 1` | `121 / 1` | `109 / 0` |
| `blind-intent-resolver.ts` | `140 / 3` | `140 / 3` | `109 / 0` |

Final status:

```text
 M src/vtt/arena-legality.ts
 M src/vtt/blind-intent-resolver.ts
 M src/vtt/challenge-feasibility.ts
 M src/vtt/encounter-projections.ts
 M src/vtt/engine-query-port.ts
 M src/vtt/mcp/engine-server.ts
 M src/vtt/mcp/entrypoint.ts
 M tools/ai-dm-arena.ts
 M tools/ai-dm-conversation.ts
 M tools/engine-mcp-dry-client.ts
```

S3 B2 DONE
diff --git a//tmp/s3-b2-dry-launcher-probe.ts b//tmp/s3-b2-dry-launcher-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..9ae781ff7c8cfb46768e66bfebf38c916ecf796d
--- /dev/null
+++ b//tmp/s3-b2-dry-launcher-probe.ts
@@ -0,0 +1,10 @@
+import { EngineMcpStdioClient } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/engine-mcp-dry-client';
+
+const client = new EngineMcpStdioClient({
+  kind: 'launcher',
+  launcherPath: '/tmp/s3-b2-launcher.json',
+});
+const response = await client.request('server/discover');
+const exitCode = await client.close();
+console.log(`response=${response['jsonrpc'] === '2.0' ? 'jsonrpc-2.0' : 'invalid'}`);
+console.log(`exit=${String(exitCode)}`);
diff --git a//tmp/s3-b2-launcher.json b//tmp/s3-b2-launcher.json
new file mode 100644
index 0000000000000000000000000000000000000000..7923cb356b36f28d70fb81028840be9df25ac14b
--- /dev/null
+++ b//tmp/s3-b2-launcher.json
@@ -0,0 +1,26 @@
+{
+  "format": "engine-mcp-launcher-v1",
+  "fixturePath": "tests/fixtures/arena-basis/seed-3943006.json",
+  "proposalSpoolPath": "/tmp/s3-b2-proposals.jsonl",
+  "runId": "encounter:s3-b2",
+  "branchId": "branch:s3-b2",
+  "revision": 1,
+  "requestId": "request:s3-b2",
+  "phase": "initial",
+  "correctionNumber": 0,
+  "offerEnvironment": {
+    "format": "engine-option-environment-v1",
+    "mode": "legacy_standard",
+    "familyPolicy": {
+      "format": "engine-offer-family-policy-v1",
+      "helpAttack": "disabled",
+      "readyAttack": "disabled",
+      "unarmedControl": "disabled",
+      "reposition": "disabled",
+      "digest": "a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a"
+    },
+    "digest": "fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b"
+  },
+  "room": 1,
+  "historyKind": "s3_b2_mutant"
+}
diff --git a/src/vtt/arena-legality.ts b/src/vtt/arena-legality.ts
index 10be0be2368a6d8607ead3d2265c9f7499ee8ba2..5f641c66615705253c9a27c0b58c57edffacdd0b
--- a/src/vtt/arena-legality.ts
+++ b/src/vtt/arena-legality.ts
@@ -8,6 +8,7 @@
   canonicalEngineQueryPort,
   engineActionRangeFeet,
   engineAttackRangeFeet,
+  type EngineQueryPort,
   type EngineTargetSelector,
 } from './engine-query-port';
 import type {
@@ -17,34 +18,49 @@
   TargetSelector,
 } from './dm-bridge/round-plan-contract';
 
-export function arenaTokenPosition(state: EncounterState, id: CombatantId): GridCell | null {
-  return canonicalEngineQueryPort.tokenPosition(state, id);
+export function arenaTokenPosition(
+  state: EncounterState,
+  id: CombatantId,
+  queries: EngineQueryPort = canonicalEngineQueryPort,
+): GridCell | null {
+  return queries.tokenPosition(state, id);
 }
 
-export function arenaCombatant(state: EncounterState, id: CombatantId) {
-  return canonicalEngineQueryPort.combatant(state, id);
+export function arenaCombatant(
+  state: EncounterState,
+  id: CombatantId,
+  queries: EngineQueryPort = canonicalEngineQueryPort,
+) {
+  return queries.combatant(state, id);
 }
 
-export function arenaSameSide(state: EncounterState, left: CombatantId, right: CombatantId): boolean {
-  return canonicalEngineQueryPort.sameSide(state, left, right);
+export function arenaSameSide(
+  state: EncounterState,
+  left: CombatantId,
+  right: CombatantId,
+  queries: EngineQueryPort = canonicalEngineQueryPort,
+): boolean {
+  return queries.sameSide(state, left, right);
 }
 
 export function resolveArenaTarget(
   state: EncounterState,
   actor: CombatantId,
   selector: TargetSelector,
+  queries: EngineQueryPort = canonicalEngineQueryPort,
 ): CombatantId | null {
   const engineSelector: EngineTargetSelector = selector.kind === 'combatant'
     ? { kind: 'combatant', combatantId: selector.combatantId }
     : { kind: 'nearest_visible_enemy' };
-  return canonicalEngineQueryPort.resolveTarget(state, actor, engineSelector);
+  return queries.resolveTarget(state, actor, engineSelector);
 }
 
 export function arenaMonsterActions(
   state: EncounterState,
   actor: CombatantId,
+  queries: EngineQueryPort = canonicalEngineQueryPort,
 ): readonly MonsterAction[] {
-  return canonicalEngineQueryPort.actions(state, actor);
+  return queries.actions(state, actor);
 }
 
 export function arenaAttackRange(action: MonsterAttackAction): number {
@@ -55,8 +71,9 @@
   state: EncounterState,
   actor: CombatantId,
   destination: GridCell,
+  queries: EngineQueryPort,
 ): number | null {
-  const result = canonicalEngineQueryPort.path(state, {
+  const result = queries.path(state, {
     actorId: actor,
     destination,
     movement: 'normal',
@@ -76,16 +93,17 @@
   action: PlanAction,
   actor: CombatantId,
   state: EncounterState,
+  queries: EngineQueryPort,
 ): readonly string[] {
-  const acting = arenaCombatant(state, actor);
-  const origin = arenaTokenPosition(state, actor);
+  const acting = arenaCombatant(state, actor, queries);
+  const origin = arenaTokenPosition(state, actor, queries);
   if (acting?.profile.kind !== 'monster' || origin === null) return [`${actor}: actor is not a placed monster`];
-  const actions = arenaMonsterActions(state, actor);
+  const actions = arenaMonsterActions(state, actor, queries);
   const refusals: string[] = [];
   if (action.kind === 'retreat_toward') {
     const budget = action.maximumFeet ?? acting.profile.rules.speed;
     if (budget > acting.profile.rules.speed) refusals.push(`${actor}: movement exceeds speed`);
-    const cost = arenaMovementCost(state, actor, action.destination);
+    const cost = arenaMovementCost(state, actor, action.destination, queries);
     if (cost === null) refusals.push(`${actor}: destination is blocked, occupied, or unreachable`);
     else if (cost > budget) refusals.push(`${actor}: route costs ${String(cost)} feet including difficult terrain`);
     return refusals;
@@ -101,14 +119,14 @@
     if (!available) refusals.push(`${actor}: Action Surge is absent from the combatant profile`);
   }
   if (!('target' in action) || action.target === null) return refusals;
-  const target = resolveArenaTarget(state, actor, action.target);
-  if (target === null || arenaCombatant(state, target) === null) {
+  const target = resolveArenaTarget(state, actor, action.target, queries);
+  if (target === null || arenaCombatant(state, target, queries) === null) {
     return [...refusals, `${actor}: target is absent`];
   }
-  if (arenaSameSide(state, actor, target)) refusals.push(`${actor}: target is on the actor's side`);
-  const targetPosition = arenaTokenPosition(state, target);
+  if (arenaSameSide(state, actor, target, queries)) refusals.push(`${actor}: target is on the actor's side`);
+  const targetPosition = arenaTokenPosition(state, target, queries);
   if (targetPosition === null) return [...refusals, `${actor}: target has no token`];
-  const distance = canonicalEngineQueryPort.spaceDistance(state, actor, target);
+  const distance = queries.spaceDistance(state, actor, target);
   if (distance === null) return [...refusals, `${actor}: target separation is unavailable`];
   if (action.kind === 'attack' || action.kind === 'bonus_attack') {
     const selected = action.kind === 'attack' && action.attackId !== undefined
@@ -165,7 +183,21 @@
   plan: RoundPlan,
   state: EncounterState,
   envelope?: ArenaPromptEnvelope,
+): readonly string[];
+export function validateArenaPlan(
+  plan: RoundPlan,
+  state: EncounterState,
+  queries: EngineQueryPort,
+  envelope?: ArenaPromptEnvelope,
+): readonly string[];
+export function validateArenaPlan(
+  plan: RoundPlan,
+  state: EncounterState,
+  queriesOrEnvelope: EngineQueryPort | ArenaPromptEnvelope = canonicalEngineQueryPort,
+  suppliedEnvelope?: ArenaPromptEnvelope,
 ): readonly string[] {
+  const queries = 'tokenPosition' in queriesOrEnvelope ? queriesOrEnvelope : canonicalEngineQueryPort;
+  const envelope = 'tokenPosition' in queriesOrEnvelope ? suppliedEnvelope : queriesOrEnvelope;
   const refusals: string[] = [];
   if (envelope !== undefined && (
     plan.encounterId !== envelope.encounterId ||
@@ -184,7 +216,7 @@
     if (!expected.includes(entry.monsterId)) refusals.push(`${entry.monsterId}: actor is not a living monster`);
     if (maximumSlotActions(entry.program) > 1) refusals.push(`${entry.monsterId}: program can spend more than one slot`);
     for (const action of programActions(entry.program)) {
-      refusals.push(...actionRefusals(action, entry.monsterId, state));
+      refusals.push(...actionRefusals(action, entry.monsterId, state, queries));
     }
   }
   return refusals;
diff --git a/src/vtt/blind-intent-resolver.ts b/src/vtt/blind-intent-resolver.ts
index b3987d8880484ce4bc8772fd40142116e6820bab..f3b3995ea3c48b8267f570938e7a80e87f093463
--- a/src/vtt/blind-intent-resolver.ts
+++ b/src/vtt/blind-intent-resolver.ts
@@ -31,6 +31,7 @@
   createPureTurnProposalResolver,
   resolveEngineActorOption,
 } from './intent-resolver';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 import { spellDefinition } from '../combat/spells/definitions';
 import type {
   EngineActionSlotUse,
@@ -74,6 +75,7 @@
   readonly envelope: unknown;
   readonly attempt: number;
   readonly repairArm: BlindRepairArm;
+  readonly offerEnvironment?: EngineOptionEnvironment;
   readonly dependencies?: BlindResolverDependencies;
 }
 
@@ -773,12 +775,13 @@
   if (actors.length !== expected.size || actors.some((actor) => !expected.has(actor.id))) {
     return rejected(input.attempt, input.repairArm, ['INTENT_SET_INCOMPLETE']);
   }
-  const queries = input.dependencies?.queries ?? canonicalEngineQueryPort;
+  const queries = input.offerEnvironment?.queries ?? input.dependencies?.queries ?? canonicalEngineQueryPort;
   const dependencies = {
     queries,
     availableOptions: input.dependencies?.availableOptions ?? availableEngineActorOptions,
     resolveOption: input.dependencies?.resolveOption ?? resolveEngineActorOption,
-    proposalResolver: input.dependencies?.proposalResolver ?? createPureTurnProposalResolver(queries),
+    proposalResolver: input.dependencies?.proposalResolver ??
+      createPureTurnProposalResolver(input.offerEnvironment ?? queries),
   };
   const resolved: BlindResolvedActorIntent[] = [];
   for (const [index, entry] of bound.entries()) {
diff --git a/src/vtt/challenge-feasibility.ts b/src/vtt/challenge-feasibility.ts
index b336742837cddd6e49fb80515f8d8ae4fc3d3c39..cf63df1a5e408d2dfae689a1a7dae4fa7a3e181f
--- a/src/vtt/challenge-feasibility.ts
+++ b/src/vtt/challenge-feasibility.ts
@@ -32,6 +32,10 @@
 import { monsterActions, monsterBonusActions } from './engine-query-port';
 import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
 import type { EngineOptionId } from './intent-resolver';
+import {
+  buildOfferEnvironment,
+  type EngineOptionEnvironment,
+} from './offers/build-offer-environment';
 import { ARENA_REACTION_OFFER_POLICY } from './reaction-offer-host-policy';
 import { regretTurnLegalActions } from './regret/legal-actions';
 
@@ -430,17 +434,18 @@
   offeredRevision: number;
   command: EncounterCommand;
 }> {
+  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
   if (state.activeCombatant !== D_GUARD) {
     throw new Error('Room D bounded policy requires the Guard to be active.');
   }
-  const matches = availableEngineActorOptions(state, D_GUARD, undefined, state.revision)
+  const matches = availableEngineActorOptions(state, D_GUARD, offerEnvironment, state.revision)
     .filter((option) => option.revision === state.revision && optionMatchesRoomDPolicy(option, policy));
   if (matches.length !== 1) {
     throw new Error(`Room D bounded policy ${policy} requires exactly one current offered option.`);
   }
   const option = matches[0];
   if (option === undefined) throw new Error('Room D bounded policy option disappeared.');
-  const resolution = resolveEngineActorOption(state, option);
+  const resolution = resolveEngineActorOption(state, option, offerEnvironment);
   if (!resolution.valid || resolution.mechanics.movementCostFeet !== 0 || resolution.mechanics.path.length !== 0) {
     throw new Error(`Room D bounded policy ${policy} did not resolve as a hold option.`);
   }
@@ -960,7 +965,10 @@
   return runCommandBoundaryTransaction(state, command, rng, ARENA_REACTION_OFFER_POLICY, null);
 }
 
-function roomAProvenance(state: EncounterState): Readonly<{
+function roomAProvenance(
+  state: EncounterState,
+  offerEnvironment: EngineOptionEnvironment,
+): Readonly<{
   records: readonly DrawRecord[];
   healing: ChallengeProvenanceMigrationEvidenceV1['healing'];
 }> {
@@ -978,10 +986,10 @@
   );
   records.push(...capped.dieRolls);
 
-  const offer = availableEngineActorOptions(state, A_PRIEST).find((candidate) =>
+  const offer = availableEngineActorOptions(state, A_PRIEST, offerEnvironment).find((candidate) =>
     candidate.label === 'Mace + Mace -> combatant:wizard');
   if (offer === undefined) throw new Error('Room A two-Mace option is absent.');
-  const resolved = resolveEngineActorOption(state, offer);
+  const resolved = resolveEngineActorOption(state, offer, offerEnvironment);
   if (!resolved.valid) throw new Error(`Room A two-Mace option failed re-resolution: ${resolved.code}`);
   let current = state;
   const rng = maximumEvidenceRng();
@@ -1027,7 +1035,8 @@
   roomA: EncounterState,
   roomD: EncounterState,
 ): ChallengeProvenanceMigrationEvidenceV1 {
-  const roomAEvidence = roomAProvenance(roomA);
+  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+  const roomAEvidence = roomAProvenance(roomA, offerEnvironment);
   const provenanceManifest = [...roomAEvidence.records];
   const potionState: EncounterState = {
     ...replaceHitPoints(roomA, A_PRIEST, 6),
@@ -1105,13 +1114,13 @@
   };
 }
 
-function greatclubSequence(state: EncounterState): Scenario {
-  const offer = availableEngineActorOptions(state, C_OGRE).find((candidate) =>
+function greatclubSequence(state: EncounterState, offerEnvironment: EngineOptionEnvironment): Scenario {
+  const offer = availableEngineActorOptions(state, C_OGRE, offerEnvironment).find((candidate) =>
     candidate.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'attack' && slot.use.actionId === 'greatclub'));
   if (offer === undefined) throw new FeasibilityStop({
     kind: 'invariant_failure', counter: 'greatclub_offer', observed: 'absent', limit: 'present',
   });
-  const resolved = resolveEngineActorOption(state, offer);
+  const resolved = resolveEngineActorOption(state, offer, offerEnvironment);
   if (!resolved.valid) throw new FeasibilityStop({
     kind: 'invariant_failure', counter: 'greatclub_reresolution', observed: resolved.code, limit: 'valid',
   });
@@ -1127,13 +1136,16 @@
   };
 }
 
-function priestApproach(state: EncounterState): readonly ((state: EncounterState) => EncounterCommand)[] {
-  const offer = availableEngineActorOptions(state, A_PRIEST).find((candidate) =>
+function priestApproach(
+  state: EncounterState,
+  offerEnvironment: EngineOptionEnvironment,
+): readonly ((state: EncounterState) => EncounterCommand)[] {
+  const offer = availableEngineActorOptions(state, A_PRIEST, offerEnvironment).find((candidate) =>
     candidate.label === 'Mace + Mace -> combatant:wizard');
   if (offer === undefined) throw new FeasibilityStop({
     kind: 'invariant_failure', counter: 'priest_mace_offer', observed: 'absent', limit: 'present',
   });
-  const resolved = resolveEngineActorOption(state, offer);
+  const resolved = resolveEngineActorOption(state, offer, offerEnvironment);
   if (!resolved.valid) throw new FeasibilityStop({
     kind: 'invariant_failure', counter: 'priest_mace_reresolution', observed: resolved.code, limit: 'valid',
   });
@@ -1143,7 +1155,11 @@
   })];
 }
 
-function scenarios(room: 'B' | 'C' | 'A', state: EncounterState): readonly Scenario[] {
+function scenarios(
+  room: 'B' | 'C' | 'A',
+  state: EncounterState,
+  offerEnvironment: EngineOptionEnvironment,
+): readonly Scenario[] {
   switch (room) {
     case 'B': return [
       { name: 'javelin-fighter', commands: [(current) => attack(current, B_OGRE, 'javelin', FIGHTER)] },
@@ -1151,10 +1167,10 @@
     ];
     case 'C': return [
       { name: 'javelin-hold', commands: [(current) => attack(current, C_OGRE, 'javelin', WIZARD)] },
-      greatclubSequence(state),
+      greatclubSequence(state, offerEnvironment),
     ];
     case 'A': {
-      const approach = priestApproach(state);
+      const approach = priestApproach(state, offerEnvironment);
       return [
       {
         name: 'same-attacks-with-healing-word',
@@ -1270,6 +1286,7 @@
   counters: MutableCounters,
   runtime: FeasibilityRuntime,
   invocationStarted: number,
+  offerEnvironment: EngineOptionEnvironment,
 ): ChallengeReducerVariantReportV1 {
   const before = copyCounters(counters);
   const scope: VariantScope = {
@@ -1278,7 +1295,7 @@
   };
   sampleResources(counters, scope, runtime, invocationStarted, 0);
   const finalNodes: WeightedState[] = [];
-  for (const scenario of scenarios(room, state)) {
+  for (const scenario of scenarios(room, state, offerEnvironment)) {
     try {
       const scenarioNodes = runScenario(
         state, scenario, counters, scope, runtime, invocationStarted, finalNodes.length,
@@ -1305,7 +1322,7 @@
   const mass = finalNodes.reduce<ExactFraction>(
     (sum, node) => addFractions(sum, node.weight), exactWeight(0n, 1n),
   );
-  const expectedScenarioMass = BigInt(scenarios(room, state).length);
+  const expectedScenarioMass = BigInt(scenarios(room, state, offerEnvironment).length);
   if (mass.numerator !== expectedScenarioMass || mass.denominator !== 1n) throw new FeasibilityStop({
     kind: 'invariant_failure', counter: 'probability_mass', observed: `${String(mass.numerator)}/${String(mass.denominator)}`,
     limit: `${String(expectedScenarioMass)}/1`,
@@ -1533,6 +1550,7 @@
   loadFixtureText: (seed: 5831001 | 5831002 | 5831003) => Promise<string>,
   runtime: FeasibilityRuntime = PRODUCTION_RUNTIME,
 ): Promise<ChallengeReducerFeasibilityReportV1> {
+  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
   const started = runtime.now();
   const initialHeapUsed = runtime.heapUsed();
   const counters: MutableCounters = {
@@ -1548,9 +1566,9 @@
       const decoded = decodeArenaBasisEnvelopeV1(JSON.parse(await loadFixtureText(seed)) as unknown, {
         mode: 'challenge',
       }).encounter.state;
-      const base = runVariant('base', true, roomId, decoded, counters, runtime, started);
+      const base = runVariant('base', true, roomId, decoded, counters, runtime, started, offerEnvironment);
       const variantReports = variants(roomId, decoded).map((variant) =>
-        runVariant(variant.id, false, roomId, variant.state, counters, runtime, started));
+        runVariant(variant.id, false, roomId, variant.state, counters, runtime, started, offerEnvironment));
       rooms.push({ roomId, base, variants: variantReports });
     }
     if (rooms.length !== 3 || rooms.some((room) => room.variants.length !== 18)) throw new FeasibilityStop({
diff --git a/src/vtt/encounter-projections.ts b/src/vtt/encounter-projections.ts
index 2c08079f6bb906469f5d2a720ce0069b48ecbb30..2587c136fff4788269644b519ebf6d6a76a06568
--- a/src/vtt/encounter-projections.ts
+++ b/src/vtt/encounter-projections.ts
@@ -56,8 +56,11 @@
   type HumanEngineActorOptions,
 } from './encounter-board-projection';
 import { canonicalEngineQueryPort } from './engine-query-port';
-import { createLegacyEngineOptionEnvironment } from './offers/offer-environment';
 import {
+  createLegacyEngineOptionEnvironment,
+  type EngineOptionEnvironment,
+} from './offers/offer-environment';
+import {
   offeredOptionActorsForState,
   offeredOptionPaths as projectOfferedOptionPaths,
   type OfferedOptionPath,
@@ -137,6 +140,7 @@
 export interface DmBoardProjection {
   readonly audience: 'dm';
   readonly stateDigest: string;
+  readonly offerEnvironmentDigest: string;
   readonly encounter: DmVisibleEncounterState;
   readonly board: DmEncounterBoardModel;
   readonly coordinator: PersistedCoordinatorState;
@@ -406,6 +410,7 @@
   readonly actionRefusal?: NonBoundaryActionRefusal | null;
   readonly adjudicationPrompts?: readonly Extract<PendingDecision, { readonly kind: 'adjudication_prompt' }>[];
   readonly engineAdjudications?: readonly AdjudicationEnvelope[];
+  readonly offerEnvironment?: EngineOptionEnvironment;
 }): DmBoardProjection {
   const targets = adjudicatedTargets(input.view.state.eventLog, input.coordinator.pause);
   const pending = input.coordinator.pendingRequest;
@@ -480,11 +485,12 @@
       combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
       interactive: true as const,
     }));
-  const offerEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+  const offerEnvironment = input.offerEnvironment ?? createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
   const offeredActors = offeredOptionActorsForState(input.view.state, undefined, offerEnvironment);
   return {
     audience: 'dm',
     stateDigest: sha256(canonicalJson(input.view.state)),
+    offerEnvironmentDigest: offerEnvironment.digest,
     encounter: dmVisibleEncounter(input.view),
     board: projectEncounterBoard(input.view, input.coordinator.pendingRequest, targets),
     coordinator: input.coordinator,
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index e8d3abbca6248085e4f6a525b730ed173b8a0836..88ae4012c18699412f36c2a863405f0d0c7eeaec
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -1709,7 +1709,9 @@
   targetId: CombatantId,
   candidates: readonly TacticalAllocationCandidate[],
   initiativeOrder: readonly CombatantId[],
+  environment?: EngineOptionEnvironment,
 ): TacticalAllocationComparison {
+  const offerEnvironment = environment ?? canonicalEngineQueryPort;
   const orderIndex = new Map(initiativeOrder.map((actorId, index) => [actorId, index] as const));
   const target = combatant(state, targetId);
   const allocations = candidates.map((candidate): TacticalAllocationResult => {
@@ -1730,7 +1732,7 @@
       };
     }
     const options = ordered.map((choice) => availableEngineActorOptions(
-      state, choice.actorId, canonicalEngineQueryPort,
+      state, choice.actorId, offerEnvironment,
     ).find((option) => option.optionId === choice.optionId));
     if (options.some((option) => option === undefined)) {
       return {
@@ -1785,7 +1787,7 @@
         : [];
       const actionIds = optionAttackActionIds(option, targetId);
       if (modifiers.length > 0 && actionIds.length > 0) modifierApplied = true;
-      const resolution = resolveEngineActorOption(state, option, canonicalEngineQueryPort);
+      const resolution = resolveEngineActorOption(state, option, offerEnvironment);
       const attackState = resolution.valid ? {
         ...state,
         tokens: state.tokens.map((token) => token.combatantId === choice.actorId
diff --git a/src/vtt/mcp/engine-server.ts b/src/vtt/mcp/engine-server.ts
index ad5f21b97ccfb595c6c7ddd68da545d661956741..ca9d66e7c5f21b7b9f9938b811221ce7c67db680
--- a/src/vtt/mcp/engine-server.ts
+++ b/src/vtt/mcp/engine-server.ts
@@ -31,7 +31,13 @@
 } from '../engine-state-capsule';
 import type { EngineQueryPort, EngineTargetSelector } from '../engine-query-port';
 import type { EngineOptionEnvironment } from '../offers/offer-environment';
-import { resolveEngineActorOption, type EngineMovementPreference, type EngineTurnProposal, type PureTurnProposalResolver } from '../intent-resolver';
+import {
+  createPureTurnProposalResolver,
+  resolveEngineActorOption,
+  type EngineMovementPreference,
+  type EngineTurnProposal,
+  type PureTurnProposalResolver,
+} from '../intent-resolver';
 import { decisionReasonProblem } from '../decision-reason';
 import {
   engineOptionId,
@@ -315,7 +321,6 @@
   readonly state: EncounterState;
   readonly stateSource: EngineCapsuleFeed;
   readonly offerEnvironment: EngineOptionEnvironment;
-  readonly turnProposals: PureTurnProposalResolver;
   readonly proposals: ProposalSink;
   readonly speculativePlans: SpeculativePlanSink;
   readonly narration: NarrationSink;
@@ -1448,7 +1453,8 @@
     throw new RangeError('maximumResourceBytes cannot exceed the 128 KiB hard limit.');
   }
   const { state, stateSource: feed, proposals, speculativePlans, narration, adjudications, rules } = dependencies;
-  const { offerEnvironment, turnProposals } = dependencies;
+  const { offerEnvironment } = dependencies;
+  const turnProposals = createPureTurnProposalResolver(offerEnvironment);
   const queries = offerEnvironment.queries;
   const launchCapsule = feed.current();
   if (launchCapsule.offerEnvironment.digest !== offerEnvironment.digest) {
@@ -2276,6 +2282,7 @@
         envelope,
         attempt: blindIntentAttempt,
         repairArm: blindRepairArm,
+        offerEnvironment,
         dependencies: { queries, proposalResolver: turnProposals },
       });
       const recordResolution = (recorded: BlindResolutionResult): void => {
diff --git a/src/vtt/mcp/entrypoint.ts b/src/vtt/mcp/entrypoint.ts
index f4c7135e16c47184001cceb61bee6d57a451d0a2..14756e2dcacc1477db2e69a21505098d4381ae4e
--- a/src/vtt/mcp/entrypoint.ts
+++ b/src/vtt/mcp/entrypoint.ts
@@ -26,15 +26,13 @@
   type EnginePlanAdjustmentMetadata,
   type RuleReference,
 } from '../engine-state-capsule';
-import { canonicalEngineQueryPort, engineActionRegistryForEnvironment } from '../engine-query-port';
-import { createPureTurnProposalResolver } from '../intent-resolver';
+import { engineActionRegistryForEnvironment } from '../engine-query-port';
 import {
-  createLegacyEngineOptionEnvironment,
   decodeEngineOptionEnvironmentBinding,
-  engineOptionEnvironmentFromBinding,
   type EngineOptionEnvironment,
   type EngineOptionEnvironmentBinding,
 } from '../offers/offer-environment';
+import { buildOfferEnvironment } from '../offers/build-offer-environment';
 import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../monster-planning-state';
 import {
   rendererProfileSchema,
@@ -450,7 +448,10 @@
     options.turnContextMaximumBytes !== BLIND_TURN_CONTEXT_MAX_BYTES) {
     throw new RangeError(`Blind context base cap must be ${String(BLIND_TURN_CONTEXT_MAX_BYTES)} bytes.`);
   }
-  const offerEnvironment = options.offerEnvironment ?? createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+  const offerEnvironment = options.offerEnvironment ?? buildOfferEnvironment({
+    kind: 'configuration',
+    mode: 'legacy_standard',
+  });
   const candidates = state.combatants
     .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
     .map((candidate) => candidate.profile.id)
@@ -542,7 +543,7 @@
   });
   const feed = new MutableEngineCapsuleFeed(capsule);
   const blindTurnProjection = options.dmMode === 'blind' || options.toolProfile === 'blind'
-    ? projectEngineBlindTurn(planningState, capsule, canonicalEngineQueryPort)
+    ? projectEngineBlindTurn(planningState, capsule, offerEnvironment.queries)
     : null;
   const proposals: EngineProposalEnvelope[] = [];
   const speculativePlans: QueuedSpeculativePlanEnvelope[] = [];
@@ -554,7 +555,6 @@
     state: planningState,
     stateSource: feed,
     offerEnvironment,
-    turnProposals: createPureTurnProposalResolver(offerEnvironment),
     proposals: {
       append: (envelope) => {
         proposals.push(envelope);
@@ -651,12 +651,35 @@
   };
 }
 
-export function createEngineMcpHandler(state: EncounterState, maximumToolResultBytes?: number): McpHandler {
-  return createEngineMcpRuntime(state, maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes }).handler;
+export function createEngineMcpHandler(state: EncounterState, maximumToolResultBytes?: number): McpHandler;
+export function createEngineMcpHandler(
+  state: EncounterState,
+  offerEnvironment: EngineOptionEnvironment,
+  maximumToolResultBytes?: number,
+): McpHandler;
+export function createEngineMcpHandler(
+  state: EncounterState,
+  environmentOrMaximum?: EngineOptionEnvironment | number,
+  maximumToolResultBytes?: number,
+): McpHandler {
+  const options = typeof environmentOrMaximum === 'number'
+    ? { maximumToolResultBytes: environmentOrMaximum }
+    : {
+        ...(environmentOrMaximum === undefined ? {} : { offerEnvironment: environmentOrMaximum }),
+        ...(maximumToolResultBytes === undefined ? {} : { maximumToolResultBytes }),
+      };
+  return createEngineMcpRuntime(state, options).handler;
 }
 
-export function handleMcpRequest(state: EncounterState, message: unknown): JsonRpcResponse | null {
-  return createEngineMcpHandler(state).handle(message);
+export function handleMcpRequest(
+  state: EncounterState,
+  message: unknown,
+  offerEnvironment?: EngineOptionEnvironment,
+): JsonRpcResponse | null {
+  const handler = offerEnvironment === undefined
+    ? createEngineMcpHandler(state)
+    : createEngineMcpHandler(state, offerEnvironment);
+  return handler.handle(message);
 }
 
 export function decodeArenaFixture(decoded: unknown): EncounterState {
@@ -1034,9 +1057,14 @@
 };
 
 export function decodeEngineMcpLauncherManifest(value: unknown): DecodedEngineMcpLauncherManifest | null {
-  if (typeof value !== 'object' || value === null || Array.isArray(value) ||
-    (value as Readonly<Record<string, unknown>>)['format'] !== ENGINE_MCP_LAUNCHER_FORMAT) return null;
+  if (typeof value !== 'object' || value === null || Array.isArray(value)) return null;
   const claimedLauncher = value as Readonly<Record<string, unknown>>;
+  if (claimedLauncher['format'] !== ENGINE_MCP_LAUNCHER_FORMAT) {
+    const launcherShaped = ['format', 'fixturePath', 'proposalSpoolPath', 'offerEnvironment']
+      .some((key) => Object.hasOwn(claimedLauncher, key));
+    if (launcherShaped) throw new TypeError('Engine MCP launcher manifest structure is invalid.');
+    return null;
+  }
   if (!Object.hasOwn(claimedLauncher, 'offerEnvironment') || claimedLauncher['offerEnvironment'] === undefined) {
     throw new TypeError('Engine MCP launcher requires an explicit offer environment binding.');
   }
@@ -1056,15 +1084,20 @@
   value: unknown,
   decodeFixture: (fixture: unknown) => EncounterState,
 ): DecodedEngineMcpLauncherManifest | null {
-  const manifest = decodeEngineMcpLauncherManifest(value);
-  if (manifest === null) decodeFixture(value);
-  return manifest;
+  try {
+    const manifest = decodeEngineMcpLauncherManifest(value);
+    if (manifest === null) decodeFixture(value);
+    return manifest;
+  } catch {
+    decodeFixture(value);
+    return null;
+  }
 }
 
 export function reconstructLauncherOfferEnvironment(
   manifest: DecodedEngineMcpLauncherManifest,
 ): EngineOptionEnvironment {
-  return engineOptionEnvironmentFromBinding(canonicalEngineQueryPort, manifest.offerEnvironment);
+  return buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
 }
 
 async function launcherManifest(path: string): Promise<DecodedEngineMcpLauncherManifest | null> {
@@ -1253,5 +1286,8 @@
   if (scenario !== undefined && scenario !== '--correction' && scenario !== '--room-transition') {
     throw new TypeError('Unknown engine MCP fixture scenario.');
   }
-  await runEngineMcpServer(fixturePath, options, true);
+  await runEngineMcpServer(fixturePath, {
+    ...options,
+    offerEnvironment: buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' }),
+  }, true);
 }
diff --git a/src/vtt/offers/build-offer-environment.ts b/src/vtt/offers/build-offer-environment.ts
index cb3994d118274f8b8155d9e815cc53126c43a41c..55d238b6d59ba65fb90e90b3d3c75ab97c2ab60a
--- a/src/vtt/offers/build-offer-environment.ts
+++ b/src/vtt/offers/build-offer-environment.ts
@@ -9,6 +9,7 @@
   type EngineOptionEnvironmentBinding,
 } from './offer-environment';
 import {
+  createUnrepresentedPartyThreatCatalog,
   decodePartyThreatCatalog,
   type PartyThreatCatalog,
 } from './party-threat-catalog';
@@ -74,7 +75,8 @@
     throw new TypeError('Offer environment configuration has an invalid shape.');
   }
   const familyPolicy = decodeEngineOfferFamilyPolicy(input.familyPolicy);
-  const partyThreatCatalog = decodePartyThreatCatalog(input.partyThreatCatalog);
+  decodePartyThreatCatalog(input.partyThreatCatalog);
+  const partyThreatCatalog = createUnrepresentedPartyThreatCatalog();
   const binding = createEngineOptionEnvironmentBinding({
     format: 'engine-option-environment-v1',
     mode: 'revision_bound',
diff --git a/tools/ai-dm-arena.ts b/tools/ai-dm-arena.ts
index 6e5b4f691271d78f0b9938d6dc786a7a0d13f46b..1abf66bdd2dcc962239a809977dda8684802c58a
--- a/tools/ai-dm-arena.ts
+++ b/tools/ai-dm-arena.ts
@@ -67,6 +67,7 @@
 } from '../src/vtt/blind-dm-contract';
 import { BLIND_TURN_CONTEXT_MAX_BYTES } from '../src/vtt/blind-turn-context';
 import { BLIND_STATE_PRIMER_VERSION } from './ai-dm-board-snapshot';
+import type { OfferEnvironmentInput } from '../src/vtt/offers/build-offer-environment';
 
 export const ARENA_BASES = ['standard', 'hard', 'brutal', 'brutal-b', 'scenario', 'challenge'] as const;
 export type ArenaBasis = (typeof ARENA_BASES)[number];
@@ -103,6 +104,7 @@
 }
 
 interface ArenaConfigBase {
+  readonly offerEnvironment?: OfferEnvironmentInput;
   readonly dmMode: DmMode;
   readonly dmModeExplicit: boolean;
   readonly blindRepairArm: BlindRepairArm;
@@ -642,6 +644,7 @@
     if (generateMissingRooms) throw new TypeError('--generate-missing-rooms is unavailable for the closed challenge basis.');
   }
   return {
+    offerEnvironment: { kind: 'configuration', mode: 'legacy_standard' },
     dmMode: dmMode as DmMode,
     dmModeExplicit,
     blindRepairArm: blindRepairArm as BlindRepairArm,
@@ -854,6 +857,7 @@
   const instructionSource: AgentInstructionSource = overrides.instruction ?? config;
   return {
     ...instructionSource,
+    ...(config.offerEnvironment === undefined ? {} : { offerEnvironment: config.offerEnvironment }),
     dmMode: config.dmMode,
     dmModeExplicit: config.dmModeExplicit,
     blindRepairArm: config.blindRepairArm,
diff --git a/tools/ai-dm-conversation.ts b/tools/ai-dm-conversation.ts
index 5c28091d9c35787fb6dab8f74aecdc1292992d5f..45b5e057fd61c13114bb4fc7ddb965d759eef6c5
--- a/tools/ai-dm-conversation.ts
+++ b/tools/ai-dm-conversation.ts
@@ -65,11 +65,12 @@
 } from '../src/vtt/engine-round-session';
 import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
 import {
-  createLegacyEngineOptionEnvironment,
-  engineOptionEnvironmentFromBinding,
-} from '../src/vtt/offers/offer-environment';
+  buildOfferEnvironment,
+  type EngineOptionEnvironment,
+  type OfferEnvironmentInput,
+} from '../src/vtt/offers/build-offer-environment';
 import {
-  availableEngineActorOptions, pureTurnProposalResolver,
+  availableEngineActorOptions, createPureTurnProposalResolver, pureTurnProposalResolver,
   type EngineOfferableOption, type EngineTurnProposal, type ResolvedTurnMechanics,
 } from '../src/vtt/intent-resolver';
 import {
@@ -279,6 +280,7 @@
 }
 
 interface ConversationConfigBase {
+  readonly offerEnvironment?: OfferEnvironmentInput;
   readonly dmMode: DmMode;
   readonly dmModeExplicit: boolean;
   readonly blindRepairArm: BlindRepairArm;
@@ -1205,6 +1207,7 @@
     throw new TypeError('Explicit D569 DM modes require the shared D570 knowledge bundle.');
   }
   return {
+    offerEnvironment: { kind: 'configuration', mode: 'legacy_standard' },
     dmMode: dmMode as DmMode,
     dmModeExplicit,
     blindRepairArm: blindRepairArm as BlindRepairArm,
@@ -2280,10 +2283,10 @@
   }
   let rendering: CapturedTurnContext['rendering'];
   const runtime = createEngineMcpRuntime(state, {
-    offerEnvironment: engineOptionEnvironmentFromBinding(
-      canonicalEngineQueryPort,
-      snapshot.capsule.offerEnvironment,
-    ),
+    offerEnvironment: buildOfferEnvironment({
+      kind: 'binding',
+      binding: snapshot.capsule.offerEnvironment,
+    }),
     runId: capsule.runId,
     branchId: capsule.branchId,
     revision: capsule.revision,
@@ -3610,10 +3613,10 @@
     throw new Error('Turn-context base requires an ordinary pending request.');
   }
   const runtime = createEngineMcpRuntime(state, {
-    offerEnvironment: engineOptionEnvironmentFromBinding(
-      canonicalEngineQueryPort,
-      snapshot.capsule.offerEnvironment,
-    ),
+    offerEnvironment: buildOfferEnvironment({
+      kind: 'binding',
+      binding: snapshot.capsule.offerEnvironment,
+    }),
     runId: capsule.runId,
     branchId: capsule.branchId,
     revision: capsule.revision,
@@ -3683,10 +3686,10 @@
     throw new Error('Local OpenAI tool session requires an ordinary pending request.');
   }
   const runtime = createEngineMcpRuntime(input.state, {
-    offerEnvironment: engineOptionEnvironmentFromBinding(
-      canonicalEngineQueryPort,
-      input.snapshot.capsule.offerEnvironment,
-    ),
+    offerEnvironment: buildOfferEnvironment({
+      kind: 'binding',
+      binding: input.snapshot.capsule.offerEnvironment,
+    }),
     runId: capsule.runId,
     branchId: capsule.branchId,
     revision: capsule.revision,
@@ -3947,10 +3950,10 @@
     throw new Error('Speculative tool session requires a speculative pending request.');
   }
   const runtime = createEngineMcpRuntime(input.state, {
-    offerEnvironment: engineOptionEnvironmentFromBinding(
-      canonicalEngineQueryPort,
-      input.snapshot.capsule.offerEnvironment,
-    ),
+    offerEnvironment: buildOfferEnvironment({
+      kind: 'binding',
+      binding: input.snapshot.capsule.offerEnvironment,
+    }),
     runId: capsule.runId,
     branchId: capsule.branchId,
     revision: capsule.revision,
@@ -4004,8 +4007,12 @@
 export function proposalResolutionDivergence(
   state: EncounterState,
   entry: ProposedTurnResolution,
+  offerEnvironment?: EngineOptionEnvironment,
 ): readonly string[] {
-  const checked = pureTurnProposalResolver.resolve(state, entry.proposal);
+  const resolver = offerEnvironment === undefined
+    ? pureTurnProposalResolver
+    : createPureTurnProposalResolver(offerEnvironment);
+  const checked = resolver.resolve(state, entry.proposal);
   if (!checked.valid) {
     return [`${entry.proposal.actorId}: proposal-time resolution was valid, but authoritative resolution refused it: ${checked.refusals.map((refusal) => refusal.summary).join('; ')}`];
   }
@@ -4018,7 +4025,11 @@
     : [`${entry.proposal.actorId}: resolved action sequence, targets, or movement cost diverged; proposal was "${entry.summary}" and authoritative resolution was "${checked.summary}".`];
 }
 
-function authorizedMechanics(state: EncounterState, proposal: RoundTurnProposalEnvelope): {
+function authorizedMechanics(
+  state: EncounterState,
+  proposal: RoundTurnProposalEnvelope,
+  offerEnvironment: EngineOptionEnvironment,
+): {
   readonly entries: readonly {
     readonly proposal: EngineTurnProposal;
     readonly option: EngineOfferableOption;
@@ -4040,7 +4051,7 @@
     proposal.resolutions.map((entry) => entry.proposal.actorId),
   );
   const divergences = proposal.resolutions.flatMap<ConversationChainAttemptEvidence>((entry) => {
-    const reasons = proposalResolutionDivergence(planningState, entry);
+    const reasons = proposalResolutionDivergence(planningState, entry, offerEnvironment);
     return reasons.length === 0 ? [] : [{
       attempt: proposal.phase === 'correction' ? 'correction' : 'primary',
       actorId: entry.proposal.actorId,
@@ -4050,7 +4061,7 @@
   });
   if (divergences.length > 0) return { entries: null, divergences };
   const resolved = proposal.resolutions.map((entry) => {
-    const checked = pureTurnProposalResolver.resolve(planningState, entry.proposal);
+    const checked = createPureTurnProposalResolver(offerEnvironment).resolve(planningState, entry.proposal);
     if (!checked.valid) return null;
     return {
       proposal: structuredClone(entry.proposal),
@@ -4249,7 +4260,10 @@
   const adapter = new ModelCallBookkeepingAdapter(selectedAdapter);
   const rows: ConversationRow[] = [];
   let capsuleRevision = 1;
-  const offerEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+  const offerEnvironment = buildOfferEnvironment(config.offerEnvironment ?? {
+    kind: 'configuration',
+    mode: 'legacy_standard',
+  });
   const engineSession = new EngineRoundSession(
     states[0]!,
     mulberry32(8_274_113),
@@ -5902,7 +5916,7 @@
                     ? PLAN_MATERIALITY_POLICY_HASH
                     : null,
                 });
-            const checkedProposal = authorizedMechanics(engineSession.currentState(), proposal);
+            const checkedProposal = authorizedMechanics(engineSession.currentState(), proposal, offerEnvironment);
             if (checkedProposal.entries === null) {
               failedAttempts.push(...(checkedProposal.divergences.length > 0
                 ? checkedProposal.divergences
@@ -6861,7 +6875,7 @@
                         recalculated = acceptSpeculationRecalculationBeforeDeadline(
                           roundDeadline,
                           () => {
-                            const checked = authorizedMechanics(state, proposal);
+                            const checked = authorizedMechanics(state, proposal, offerEnvironment);
                             if (checked.entries === null || !sameCombatantSet(
                               checked.entries.map((entry) => entry.proposal.actorId),
                               segmentActors,
diff --git a/tools/engine-mcp-dry-client.ts b/tools/engine-mcp-dry-client.ts
index b3fda7a3010244c5c558cf4b6714fb47aae1b99b..21b64bca3acc37ec8d20062511b61ee574918b3e
--- a/tools/engine-mcp-dry-client.ts
+++ b/tools/engine-mcp-dry-client.ts
@@ -24,6 +24,14 @@
   readonly response: string;
 }
 
+export type EngineMcpStdioLaunchInput =
+  | {
+      readonly kind: 'fixture';
+      readonly fixturePath: string;
+      readonly scenario?: '--correction' | '--room-transition';
+    }
+  | { readonly kind: 'launcher'; readonly launcherPath: string };
+
 export class EngineMcpStdioClient {
   readonly #child: ChildProcessWithoutNullStreams;
   readonly #lines: Interface;
@@ -32,11 +40,19 @@
   #id = 0;
   #stderr = '';
 
-  constructor(fixturePath: string, scenario?: '--correction' | '--room-transition') {
+  constructor(
+    input: EngineMcpStdioLaunchInput | string,
+    legacyScenario?: '--correction' | '--room-transition',
+  ) {
+    const launch = typeof input === 'string'
+      ? { kind: 'fixture' as const, fixturePath: input, scenario: legacyScenario }
+      : input;
+    const targetPath = launch.kind === 'launcher' ? launch.launcherPath : launch.fixturePath;
+    const scenario = launch.kind === 'fixture' ? launch.scenario : undefined;
     this.#child = spawn(process.execPath, [
       resolve('node_modules/vite-node/vite-node.mjs'),
       resolve('tools/engine-mcp-server.ts'),
-      resolve(fixturePath),
+      resolve(targetPath),
       ...(scenario === undefined ? [] : [scenario]),
     ], { cwd: process.cwd(), stdio: ['pipe', 'pipe', 'pipe'] });
     this.#child.stderr.setEncoding('utf8');
@@ -152,7 +168,7 @@
 }
 
 export async function runEngineMcpDryClient(fixturePath: string): Promise<EngineMcpDryRunReport> {
-  const initial = new EngineMcpStdioClient(fixturePath);
+  const initial = new EngineMcpStdioClient({ kind: 'fixture', fixturePath });
   await initial.request('server/discover');
   await initial.request('tools/list');
   await initial.request('resources/list');
@@ -225,7 +241,7 @@
   });
   if (await initial.close() !== 0) throw new Error(`Initial dry server failed: ${initial.stderr}`);
 
-  const correction = new EngineMcpStdioClient(fixturePath, '--correction');
+  const correction = new EngineMcpStdioClient({ kind: 'fixture', fixturePath, scenario: '--correction' });
   const correctionContext = structured(await correction.tool('engine.get_turn_context', {
     run_id: 'encounter:engine-mcp', expected_revision: 2, scope: 'round',
   }));
@@ -242,7 +258,7 @@
   });
   if (await correction.close() !== 0) throw new Error(`Correction dry server failed: ${correction.stderr}`);
 
-  const room = new EngineMcpStdioClient(fixturePath, '--room-transition');
+  const room = new EngineMcpStdioClient({ kind: 'fixture', fixturePath, scenario: '--room-transition' });
   await room.request('server/discover');
   const roomContext = structured(await room.tool('engine.get_turn_context', {
     run_id: 'encounter:engine-mcp', expected_revision: 3, scope: 'round',
