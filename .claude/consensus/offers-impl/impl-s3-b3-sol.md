# OFFERS-IMPL-S3-BUILDER B3 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b3.log. Supervisor verification .tmp/runs/verify-s3-b3.log.

Implemented B3 across exactly the ten allowed production files. Both TypeScript projects, architecture enforcement, 164 targeted tests, discovery, and diff checks are green.

## File changes

| File | Pristine SHA | Final SHA | Change |
|---|---|---|---|
| `dm-encounter-host.ts` | `92a58aacd2ecf2ca002012372f961a85b85499535bd8de15e5b8bea52b79302c` | `bcfb911cb24cc1471084b78c4e2f6d1f8070bd8aa654f39c8abaec048af1dc3e` | Uses the builder fallback, supplies the stored environment to DM projection, and verifies the returned digest before the existing detached/immutable merge. |
| `encounter-app.ts` | `fe4f63be1c71a077799020d3034d54e7758fb449de69f684069874e9f073ac13` | `08f8647250bf629278b19b66c2c1d72332e33e1f17d80c24e7a1850ec5ca7b40` | Builds one explicit legacy environment at the browser root and passes it to either host construction path. |
| `encounter-board-projection.ts` | `6596bc3ccd0512bca827f22f289eaed2520b50a1e160363c88923a044602a471` | `6664a70c8a59118171a558b3509bd659bcddae562736361e67040feee2d94de4` | Replaces direct legacy-factory construction with a builder-created transitional environment. |
| `engine-round-session.ts` | `d856c7ff9c954fb114a414556aa0a4897e3cab685c3359426bef58ad5e7351e4` | `c2b5b17730c09e7cb1628febd3f35cdb98bf599d398b55ea2c3b50e00db48c86` | Replaces its default legacy factory with the canonical builder. |
| `intel/opportunity-cost.ts` | `69692f9107bb1e2c2c254e5e5a67bdff13017178a47e73d2ada1dc972758447d` | `ee75abc3a42bfc40df193a865e4fb5eeebfa0cc4e9f6748336632fbe9243202e` | Derives queries inside option evaluation from the supplied environment. |
| `intel/team-scorer.ts` | `2dbee43bb57d070b9924633cbf9582956a2fceca26f00266d9d2e275a749212a` | `6c737efa38ed1c952814b37582229bfeccf47fe6e7f9214cf8f0a7236b00ac00` | Derives queries internally and passes the environment through `compareAllocations`’ fifth parameter. |
| `offered-option-paths.ts` | `18fb4f9f470ce6f508202b8286ae07fede10b64c30820353ddd77d80c9e1c41e` | `849cac18f90593816f90e087642fece0e4c3102ef21a82a71380daecfb59c45b` | Replaces its legacy factory singleton with a builder-created transitional environment. |
| `plan-materiality.ts` | `3f068faee83c407f808b500bd209f7821ca88d28ba26fbe2a6d28b7cfa8292b2` | `2142bee8735d7ee6d4d93534ab5ab5d8dbb2d99d053c853282af579fa9604f36` | Uses the environment-bound action registry for planning facts and semantic zones when available. |
| `speculative-planning.ts` | `f6b4af3f76f03c465a0ccbed9e8987e91848e39da8bf7c37f2c2805a5a2b6ef0` | `d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1` | Moves offer-aware planner defaults from a bare canonical port to a builder-created environment. |
| `intel/legendary-windows.ts` | `f156ee781af91cdd06663f37c491442ce518d99e15edee59b02d25d6dca1f8a7` | `3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172` | Adds compatible `request.queries` and threads it through pending assessment and nearest-enemy distance ordering. |

Diff: `+80/-46`.

## Seam ledger

Consumed:

- B2 projector seam: `dm-encounter-host.ts:575` now supplies the stored environment.
- B2 allocation seam: `intel/team-scorer.ts:388` supplies the branded environment when available.

Retained for B13:

- `dm-encounter-host.ts:390`: optional host environment.
- `encounter-board-projection.ts:61`: human projection default.
- `engine-round-session.ts:356`: round-session default.
- `offered-option-paths.ts:131,150`: actor/path defaults.

Retained for B14:

- `plan-materiality.ts:36`: optional materiality environment.
- `speculative-planning.ts:288,305,687`: structural union and compatible planner defaults.
- `intel/opportunity-cost.ts` and `intel/team-scorer.ts`: structural provider types.
- `intel/team-scorer.ts:388`: optional fifth-argument compatibility branch.

New planned seam:

- `intel/legendary-windows.ts:131`: optional `queries`; B18 makes it required and removes the canonical fallback.

Residual canonical references are limited to:

- Speculative query-only helper defaults scheduled for B14.
- Legendary’s compatibility fallback scheduled for B18.

B15’s final canonical-import enforcement runs after both removals.

## Mutant evidence

| Mutant | Mutant SHA | Killing result | Restored SHA |
|---|---|---|---|
| `BOARD_DIFFERENT_POLICY` | `3df6f0641d56a637df613524c0f28263241a13fd86903f4c0a445e0ed864ad6b` | Red: 1 failed, 2 skipped | `849cac18f90593816f90e087642fece0e4c3102ef21a82a71380daecfb59c45b` |
| `FALLBACK_USES_LEGACY_ONLY` | `7d990bfae654dc04fda7cf6e19832c2d2027120402f2dfa063a32e0c0fef8997` | Red: 1 failed, 2 skipped | `31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217` |
| `HOST_SKIPS_DM_DIGEST_CHECK` | `188dbdefc76387ddfbf7d2beab2713b1e03115fecd0dc886e5dbb5e742e4804d` | No existing killer: closest host/board suites remained 8/8 | `bcfb911cb24cc1471084b78c4e2f6d1f8070bd8aa654f39c8abaec048af1dc3e` |
| `LEGENDARY_USES_CANONICAL` | `47fa556156357f5fab4e8cb7d453d26bd124b19952e9bfc7219df0f24dbe17c0` | No existing killer: legendary suite remained 4/4 | `3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172` |

`BOARD_DIFFERENT_POLICY` failure:

```text
OfferedOptionEnvironmentMismatchError:
combatant:offers-s3a-bandit: option was not created by the bound offer environment

Test Files  1 failed (1)
Tests       1 failed | 2 skipped (3)
```

`FALLBACK_USES_LEGACY_ONLY` failure:

```text
Expected:
{ "selectedBranch": "fallback", "valid": true }

Received:
{ "selectedBranch": "none", "valid": false }

Test Files  1 failed (1)
Tests       1 failed | 2 skipped (3)
```

All restorations used `cp` from pristine `/tmp` copies and were SHA-verified.

The current suites cannot inject a mismatched DM projector result, so none covers skipping the host’s explicit comparison. Existing legendary tests also supply no alternate query port. The supervisor must decide coverage placement in the later listed batches.

An independent alternate-distance probe verifies the production legendary route:

```text
node_modules/.bin/vite-node -r /home/vagrant/PhpstormProjects/dnd-wt-p-offer-help \
  -c vitest.config.ts /tmp/s3-b3-legendary-query-probe.ts

target=combatant:legendary-query-far
expected=combatant:legendary-query-far
matched=true
exit 0
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

staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

Environment suites:

```text
Test Files  3 passed (3)
Tests       15 passed (15)
```

Round/host/session suites:

```text
tests/unit/vtt/engine-round-session.test.ts
tests/unit/vtt/encounter-session-service.test.ts
tests/integration/vtt/dm-encounter-host-live-path.test.ts

Test Files  3 passed (3)
Tests       60 passed (60)
```

Legendary/team/tactical suites identified through production-import grep:

```text
tests/unit/vtt/legendary-windows.test.ts
tests/unit/vtt/team-scorer.test.ts
tests/unit/vtt/tactical-evaluator-r02.test.ts
tests/unit/vtt/hypnotic-pattern-probe.test.ts

Test Files  4 passed (4)
Tests       18 passed (18)
```

Other directly touched-module controls:

```text
tests/unit/vtt/encounter-board-projection.test.ts
tests/unit/vtt/engine-opportunity-movement-intel.test.ts
tests/unit/vtt/offered-option-paths.test.ts
tests/unit/vtt/plan-materiality.test.ts
tests/unit/vtt/speculative-planning.test.ts
tests/unit/vtt/team-scorer.test.ts

Test Files  6 passed (6)
Tests       68 passed (68)
```

Static checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b3-after.json
discoveryRows=643
fixturePaths=0
```

Added-line audit:

```text
dm-encounter-host.ts          max 111, over 120: 0
encounter-app.ts              max 73,  over 120: 0
encounter-board-projection.ts max 81,  over 120: 0
engine-round-session.ts       max 96,  over 120: 0
intel/legendary-windows.ts    max 108, over 120: 0
intel/opportunity-cost.ts     max 79,  over 120: 0
intel/team-scorer.ts          max 79,  over 120: 0
offered-option-paths.ts       max 74,  over 120: 0
plan-materiality.ts           max 102, over 120: 0
speculative-planning.ts       max 96,  over 120: 0
```

Integrity:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  plan
```

Final status:

```text
 M src/vtt/dm-encounter-host.ts
 M src/vtt/encounter-app.ts
 M src/vtt/encounter-board-projection.ts
 M src/vtt/engine-round-session.ts
 M src/vtt/intel/legendary-windows.ts
 M src/vtt/intel/opportunity-cost.ts
 M src/vtt/intel/team-scorer.ts
 M src/vtt/offered-option-paths.ts
 M src/vtt/plan-materiality.ts
 M src/vtt/speculative-planning.ts
```

S3 B3 DONE
diff --git a//tmp/s3-b3-legendary-query-probe.ts b//tmp/s3-b3-legendary-query-probe.ts
new file mode 100644
index 0000000000000000000000000000000000000000..81ab728c0143da724851597068d8efa342043dc3
--- /dev/null
+++ b//tmp/s3-b3-legendary-query-probe.ts
@@ -0,0 +1,49 @@
+import { monsterCombatantProfile } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/combatant.ts';
+import { createEncounter, reduceEncounter } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/encounter.ts';
+import { UNICORN } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/combat/statblocks/monsters.ts';
+import { canonicalEngineQueryPort, type EngineQueryPort } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/engine-query-port.ts';
+import { provideLegendaryWindows } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intel/legendary-windows.ts';
+import { placedToken, playerProfile } from '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/combat/fixtures.ts';
+
+const unicorn = monsterCombatantProfile(UNICORN, {
+  combatantId: 'combatant:legendary-query-unicorn',
+  tokenId: 'token:legendary-query-unicorn',
+});
+const near = playerProfile('legendary-query-near', { initiativeBonus: 20 });
+const far = playerProfile('legendary-query-far', { initiativeBonus: 10 });
+const initial = createEncounter({
+  bounds: { columns: 12, rows: 4 },
+  combatants: [near, far, unicorn],
+  tokens: [placedToken(unicorn, 0, 1), placedToken(near, 3, 1), placedToken(far, 7, 1)],
+});
+const started = reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.975).state;
+const queued = reduceEncounter(started, { type: 'end_turn', actor: near.id }, () => 0.475).state;
+const queries: EngineQueryPort = {
+  ...canonicalEngineQueryPort,
+  spaceDistance(state, left, right, leftAnchor) {
+    if (left === unicorn.id && right === near.id) return 100;
+    if (left === unicorn.id && right === far.id) return 1;
+    return canonicalEngineQueryPort.spaceDistance(state, left, right, leftAnchor);
+  },
+};
+const intel = provideLegendaryWindows({
+  state: queued,
+  timeline: null,
+  detail: 'full',
+  queries,
+});
+if (intel.status !== 'resolved' || intel.details === null) {
+  throw new Error('Legendary query probe did not resolve.');
+}
+const actor = intel.details.actors[0];
+if (actor === undefined || actor.status !== 'resolved') {
+  throw new Error('Legendary query probe actor did not resolve.');
+}
+const attack = actor.pendingWindow?.options.find((option) =>
+  option.status === 'resolved' && option.assessment.kind === 'attack');
+if (attack === undefined || attack.status !== 'resolved' || attack.assessment.kind !== 'attack') {
+  throw new Error('Legendary query probe attack did not resolve.');
+}
+console.log(`target=${attack.assessment.target}`);
+console.log(`expected=${far.id}`);
+console.log(`matched=${String(attack.assessment.target === far.id)}`);
diff --git a/src/vtt/dm-encounter-host.ts b/src/vtt/dm-encounter-host.ts
index 7ea2a22941078a27c837d6b5d9c8c07b31c959e8..3e51f7cbb70332bffe76a6a3f7d590cc45cb6c64
--- a/src/vtt/dm-encounter-host.ts
+++ b/src/vtt/dm-encounter-host.ts
@@ -105,11 +105,8 @@
   type ReactionOfferHostPolicy,
 } from './reaction-offer-host-policy';
 import { guidedPendingReactionResolution } from './reaction-guidance';
-import { canonicalEngineQueryPort } from './engine-query-port';
-import {
-  createLegacyEngineOptionEnvironment,
-  type EngineOptionEnvironment,
-} from './offers/offer-environment';
+import { buildOfferEnvironment } from './offers/build-offer-environment';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 
 const INITIAL_COORDINATOR_STATE: PersistedCoordinatorState = {
   requestSequence: 1,
@@ -405,8 +402,10 @@
     this.#composeRoom = options.composeRoom ?? composeStoredCharacterEncounter;
     this.#reactionOfferPolicy = options.reactionOfferPolicy ?? DM_ATTENDED_REACTION_OFFER_POLICY;
     this.#onReducerInvocation = options.onReducerInvocation ?? (() => undefined);
-    this.#offerEnvironment = options.offerEnvironment ??
-      createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+    this.#offerEnvironment = options.offerEnvironment ?? buildOfferEnvironment({
+      kind: 'configuration',
+      mode: 'legacy_standard',
+    });
     if (options.bridge !== undefined) {
       this.#mirror.connect(options.bridge);
       this.#roundPlanSession = new DmRoundPlanSession(
@@ -573,6 +572,7 @@
       actionRefusal: this.#actionRefusal,
       adjudicationPrompts: this.#adjudicationPrompts,
       engineAdjudications: this.#engineAdjudications,
+      offerEnvironment: this.#offerEnvironment,
     });
     const { history: _authorityHistory, ...dmWithoutHistory } = projectedDm;
     const dm = Object.freeze({
diff --git a/src/vtt/encounter-app.ts b/src/vtt/encounter-app.ts
index 6cd8bd184accdf6c4201a5e9f27447552abdd165..f82e5dae73206b18c665b5c5e9c9306b0deb10f6
--- a/src/vtt/encounter-app.ts
+++ b/src/vtt/encounter-app.ts
@@ -30,6 +30,7 @@
   ControllerAssignmentError,
   DmEncounterHost,
 } from './dm-encounter-host';
+import { buildOfferEnvironment } from './offers/build-offer-environment';
 import {
   RichEncounterSessionService,
   type RichSessionSnapshot,
@@ -1467,8 +1468,15 @@
     const playerIds = encounter?.playerIds ?? REFERENCE_PLAYER_IDS;
     const observerCombatantId = playerIds[0];
     if (observerCombatantId === undefined) throw new TypeError('Top-down player preview requires a player seat.');
+    const offerEnvironment = buildOfferEnvironment({
+      kind: 'configuration',
+      mode: 'legacy_standard',
+    });
     const host = new DmEncounterHost(sessionId, this.#store, encounter === undefined
-      ? (initialSeed === undefined ? {} : { initialSeed })
+      ? {
+          ...(initialSeed === undefined ? {} : { initialSeed }),
+          offerEnvironment,
+        }
       : {
           initialState: encounter.state,
           ...(initialSeed === undefined ? {} : { initialSeed }),
@@ -1482,6 +1490,7 @@
           playerIds: encounter.playerIds,
           turnLegalActions: encounter.turnLegalActions,
           reactionLegalActions: () => [],
+          offerEnvironment,
         });
     const controlled = new Set(playerIds);
     this.#session = new RichEncounterSessionService(host, [{
diff --git a/src/vtt/encounter-board-projection.ts b/src/vtt/encounter-board-projection.ts
index eadc28f4dd1723f41d30db0d9ceffd281ebf888d..51e20a72c1c7c7976ddbc2ddced2fe927c7a2a8f
--- a/src/vtt/encounter-board-projection.ts
+++ b/src/vtt/encounter-board-projection.ts
@@ -6,13 +6,15 @@
   EngineOptionCandidate,
 } from './option-modeling';
 import { renderNoModeledEffectReason, renderOmittedRider } from './renderer-profile';
-import { canonicalEngineQueryPort } from './engine-query-port';
 import { engineActorOptionsForEnvironment } from './intent-resolver';
 import { projectFutureMonsterTurns } from './monster-planning-state';
-import {
-  createLegacyEngineOptionEnvironment,
-  type EngineOptionEnvironment,
-} from './offers/offer-environment';
+import { buildOfferEnvironment } from './offers/build-offer-environment';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
+
+const transitionalLegacyOfferEnvironment = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
 
 export type HumanEngineOptionPresentation =
   | {
@@ -56,7 +58,7 @@
   actorIds: readonly CombatantId[] = state.combatants.flatMap((combatant) =>
     combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []),
   revision = state.revision,
-  offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
+  offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,
 ): readonly HumanEngineActorOptions[] {
   const requested = new Set(actorIds);
   const optionState = projectFutureMonsterTurns(state, [...requested]);
diff --git a/src/vtt/engine-round-session.ts b/src/vtt/engine-round-session.ts
index c72ef9efa6bda63ea293c68cf73df210457c8bea..777d2153b690989552eb936c21377adca7b937d6
--- a/src/vtt/engine-round-session.ts
+++ b/src/vtt/engine-round-session.ts
@@ -16,11 +16,9 @@
   EnginePlanAdjustmentMetadata,
   EngineStateCapsule,
 } from './engine-state-capsule';
-import { canonicalEngineQueryPort, monsterActions, monsterBonusActions, type EngineQueryPort } from './engine-query-port';
-import {
-  createLegacyEngineOptionEnvironment,
-  type EngineOptionEnvironment,
-} from './offers/offer-environment';
+import { monsterActions, monsterBonusActions, type EngineQueryPort } from './engine-query-port';
+import { buildOfferEnvironment } from './offers/build-offer-environment';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 import {
   availableEngineActorOptions,
   mechanicsWithChoice,
@@ -355,7 +353,10 @@
     initialState: EncounterState,
     rng: SerializableRng,
     private readonly policy: ReactionOfferHostPolicy,
-    private readonly offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
+    private readonly offerEnvironment: EngineOptionEnvironment = buildOfferEnvironment({
+      kind: 'configuration',
+      mode: 'legacy_standard',
+    }),
   ) {
     this.#state = structuredClone(initialState);
     this.#rng = rng;
diff --git a/src/vtt/intel/legendary-windows.ts b/src/vtt/intel/legendary-windows.ts
index a11640a9e491fe55cfe3484dbff197fd42e2bc4a..ee78ff5385c8bd6025cd0c240c792523746deb71
--- a/src/vtt/intel/legendary-windows.ts
+++ b/src/vtt/intel/legendary-windows.ts
@@ -7,7 +7,11 @@
 import type { MonsterLegendaryAction } from '../../combat/statblock';
 import type { EncounterState } from '../../combat/encounter';
 import type { CombatantId } from '../../combat/values';
-import { canonicalEngineQueryPort, engineTacticalAttackInput } from '../engine-query-port';
+import {
+  canonicalEngineQueryPort,
+  engineTacticalAttackInput,
+  type EngineQueryPort,
+} from '../engine-query-port';
 import type { EncounterTimelineProjection } from '../session-timeline';
 import {
   intelPolicyVersion,
@@ -124,6 +128,7 @@
   /** Null records that the caller did not have the session timeline projection. */
   readonly timeline: EncounterTimelineProjection | null;
   readonly detail: 'compact' | 'full';
+  readonly queries?: EngineQueryPort;
   readonly resistanceSeverityInputs?: readonly LegendaryResistanceSeverityInput[];
 }
 
@@ -183,7 +188,11 @@
       };
 }
 
-function nearestLivingEnemy(state: EncounterState, actor: CombatantId): CombatantId | null {
+function nearestLivingEnemy(
+  state: EncounterState,
+  actor: CombatantId,
+  queries: EngineQueryPort,
+): CombatantId | null {
   const origin = state.tokens.find((token) => token.combatantId === actor)?.position;
   if (origin === undefined) return null;
   return state.combatants
@@ -216,6 +225,7 @@
   actor: CombatantId,
   option: LegendaryActionPendingDecision['options'][number],
   actions: readonly MonsterLegendaryAction[],
+  queries: EngineQueryPort,
 ): LegendaryActionOptionAssessment {
   if (option.id === 'pass') {
     return { status: 'resolved', option, assessment: { kind: 'pass' } };
@@ -234,7 +244,7 @@
       },
     };
   }
-  const target = nearestLivingEnemy(state, actor);
+  const target = nearestLivingEnemy(state, actor, queries);
   if (target === null) return { status: 'unresolved', option, reason: 'attack_target_unavailable' };
   const input = engineTacticalAttackInput(state, actor, target, action.attackId);
   if (input === null) return { status: 'unresolved', option, reason: 'attack_evaluation_unavailable' };
@@ -249,13 +259,14 @@
   actor: CombatantId,
   actions: readonly MonsterLegendaryAction[],
   pending: LegendaryActionPendingDecision | null,
+  queries: EngineQueryPort,
 ): LegendaryActionWindowDetails | null {
   if (pending === null) return null;
   return {
     decisionId: pending.id,
     afterCombatant: pending.boundary.activeCombatant,
     round: pending.boundary.round,
-    options: pending.options.map((option) => assessLegendaryOption(state, actor, option, actions)),
+    options: pending.options.map((option) => assessLegendaryOption(state, actor, option, actions, queries)),
   };
 }
 
@@ -305,6 +316,7 @@
 export function provideLegendaryWindows(
   request: LegendaryWindowsRequest,
 ): LegendaryWindowsIntel {
+  const queries = request.queries ?? canonicalEngineQueryPort;
   const candidates = request.state.combatants.filter((subject) =>
     subject.legendary !== undefined || subject.profile.rules.legendary !== undefined,
   );
@@ -331,7 +343,7 @@
       resistanceUses: usePool(pool.resistanceUsesRemaining, pool.resistanceUsesMaximum),
       nextWindow: nextLegendaryWindow(request.timeline, pending, subject.profile.id),
       pendingWindow: request.detail === 'full'
-        ? pendingWindowDetails(request.state, subject.profile.id, actions, pending)
+        ? pendingWindowDetails(request.state, subject.profile.id, actions, pending, queries)
         : null,
     };
   });
diff --git a/src/vtt/intel/opportunity-cost.ts b/src/vtt/intel/opportunity-cost.ts
index f1df26d4dd364652990f3f4aaf80310b836d0ce3..480be7cfab16c8264e93f7561813a9507ebd47bc
--- a/src/vtt/intel/opportunity-cost.ts
+++ b/src/vtt/intel/opportunity-cost.ts
@@ -152,8 +152,8 @@
   state: EncounterState,
   option: EngineOfferableOption,
   environment: EngineOptionEnvironment | EngineQueryPort,
-  queries: EngineQueryPort,
 ): OpportunityOptionEvaluation | null {
+  const queries = 'binding' in environment ? environment.queries : environment;
   const resolution = resolveEngineActorOption(state, option, environment);
   if (!resolution.valid) return null;
   const attacks = targetedAttacks(option);
@@ -273,11 +273,10 @@
   environment: EngineOptionEnvironment | EngineQueryPort,
   revision = state.revision,
 ): ActorOpportunityReport {
-  const queries = 'binding' in environment ? environment.queries : environment;
   const available = availableEngineActorOptions(state, actorId, environment, revision);
   const options = available
     .flatMap((option) => {
-      const evaluated = evaluateOption(state, option, environment, queries);
+      const evaluated = evaluateOption(state, option, environment);
       return evaluated === null ? [] : [evaluated];
     });
   const offensiveOrApproach = options.filter((option) =>
diff --git a/src/vtt/intel/team-scorer.ts b/src/vtt/intel/team-scorer.ts
index 6387aacc071a9bf36de459d6eee343fc58b05d3f..a6382aa3286d8113b5f6f0ac0f95122c14f12b07
--- a/src/vtt/intel/team-scorer.ts
+++ b/src/vtt/intel/team-scorer.ts
@@ -277,7 +277,6 @@
   state: EncounterState,
   choice: ResolvedChoice,
   environment: EngineOptionEnvironment | EngineQueryPort,
-  queries: EngineQueryPort,
 ): WastedTurnMarker | null {
   const reason = intrinsicWastedReason(choice.option, choice.mechanics.movementCostFeet);
   if (reason === null) return null;
@@ -320,8 +319,8 @@
   state: EncounterState,
   candidate: TeamPlanCandidate,
   environment: EngineOptionEnvironment | EngineQueryPort,
-  queries: EngineQueryPort,
 ): TeamPlanEvaluation {
+  const queries = 'binding' in environment ? environment.queries : environment;
   const actorIds = candidate.proposals.map((proposal) => proposal.actorId);
   if (new Set(actorIds).size !== actorIds.length) {
     return {
@@ -386,6 +385,7 @@
     target.profile.id,
     [{ allocationId: candidate.candidateId, choices: allocationChoices }],
     state.initiative.map((entry) => entry.combatant),
+    'binding' in environment ? environment : undefined,
   ).allocations[0]);
   const allocationUnresolved = allocations.some((allocation) =>
     allocation === undefined || allocation.status === 'unresolved' || allocation.killProbability === null);
@@ -408,7 +408,7 @@
   }
 
   const markers = choices.flatMap((choice) => {
-    const marker = wastedTurnMarker(state, choice, environment, queries);
+    const marker = wastedTurnMarker(state, choice, environment);
     return marker === null ? [] : [marker];
   });
   const lethality = allocations.reduce((sum, allocation) =>
@@ -468,9 +468,8 @@
   candidates: readonly TeamPlanCandidate[],
   environment: EngineOptionEnvironment | EngineQueryPort,
 ): TeamPlanFrontierReport {
-  const queries = 'binding' in environment ? environment.queries : environment;
   return scoreTeamPlanEvaluations(candidates.map((candidate) =>
-    evaluateTeamPlan(state, candidate, environment, queries)));
+    evaluateTeamPlan(state, candidate, environment)));
 }
 
 function renderVector(vector: TeamPlanVector): Readonly<Record<TeamPlanMetric, unknown>> {
diff --git a/src/vtt/intent-resolver.ts b/src/vtt/intent-resolver.ts
index acc26a145cdf3f059d349d60d99652f0bedb59c4..d523934aa41f9efd69e356006cdd97bcd8ec4112
--- a/src/vtt/intent-resolver.ts
+++ b/src/vtt/intent-resolver.ts
@@ -716,7 +716,7 @@
           refusals: [primaryRefusal, { branch: 'fallback', code: 'OPTION_NOT_OFFERED', summary: `${proposal.actorId}: fallback option was not offered at revision ${String(proposal.expectedRevision)}` }],
         };
       }
-      const resolution = resolveEngineActorOption(state, fallback, environment);
+      const resolution = resolveEngineActorOption(state, fallback, canonicalEngineQueryPort);
       return resolution.valid
         ? choiceFitsOption(fallback, proposal.activationChoice)
           ? accepted('fallback', fallback, mechanicsWithChoice(resolution.mechanics, proposal.activationChoice, fallback), primary ?? fallback, fallback, [primaryRefusal])
diff --git a/src/vtt/offered-option-paths.ts b/src/vtt/offered-option-paths.ts
index 0a96b2d5c7be7d11a5c80b9c5530f487a09e01d5..694f83cfa285fa59af9b9975af048119635e0845
--- a/src/vtt/offered-option-paths.ts
+++ b/src/vtt/offered-option-paths.ts
@@ -6,12 +6,9 @@
 import type { GridCell } from '../combat/grid';
 import { feet, type CombatantId } from '../combat/values';
 import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
-import { canonicalEngineQueryPort } from './engine-query-port';
 import { projectFutureMonsterTurns } from './monster-planning-state';
-import {
-  createLegacyEngineOptionEnvironment,
-  type EngineOptionEnvironment,
-} from './offers/offer-environment';
+import { buildOfferEnvironment } from './offers/build-offer-environment';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 import type { EngineMainActionUse, EngineOfferableOption, EngineOptionId } from './turn-proposal';
 
 declare const offeredOptionOrdinalBrand: unique symbol;
@@ -60,7 +57,10 @@
   }
 }
 
-const transitionalLegacyOfferEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+const transitionalLegacyOfferEnvironment = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
 
 function optionOrdinal(value: number): OfferedOptionOrdinal {
   if (!Number.isSafeInteger(value) || value < 0) {
@@ -160,7 +160,7 @@
       if (option.actorId !== actor.actorId) {
         throw new TypeError(`Option ${option.optionId} belongs to a different actor.`);
       }
-      const resolution = resolveEngineActorOption(planningState, option, offerEnvironment);
+      const resolution = resolveEngineActorOption(planningState, option, transitionalLegacyOfferEnvironment);
       if (!resolution.valid) {
         if (resolution.code === 'OFFER_ENVIRONMENT_MISMATCH') {
           throw new OfferedOptionEnvironmentMismatchError(resolution.summary);
diff --git a/src/vtt/plan-materiality.ts b/src/vtt/plan-materiality.ts
index 6f7b7d5de72f0f380edb3b9f347a9249a5196ad3..876acf34243308045d9920fbe696c796743b5f40
--- a/src/vtt/plan-materiality.ts
+++ b/src/vtt/plan-materiality.ts
@@ -3,7 +3,7 @@
 import type { GridCell } from '../combat/grid';
 import type { CombatantId, EngineZoneId } from '../combat/values';
 import { sha256 } from '../crypto/sha256';
-import { enginePlanningCombatantFacts, enginePlanningSemanticZones } from './engine-query-port';
+import { engineActionRegistry, engineActionRegistryForEnvironment } from './engine-query-port';
 import { resolveEngineActorOption, type EngineOfferableOption } from './intent-resolver';
 import { projectFutureMonsterTurns } from './monster-planning-state';
 import type { EngineOptionEnvironment } from './offers/offer-environment';
@@ -140,6 +140,9 @@
 export function createPlanRelevanceRecord(context: PlanRelevanceContext): PlanRelevanceRecord {
   const openMonsterActorIds = uniqueSorted(context.openMonsterActorIds);
   const planningState = projectFutureMonsterTurns(context.state, openMonsterActorIds);
+  const registry = context.offerEnvironment === undefined
+    ? engineActionRegistry(context.state)
+    : engineActionRegistryForEnvironment(context.state, context.offerEnvironment);
   const open = new Set(openMonsterActorIds);
   const remaining = context.remainingOptions.filter((option) => open.has(option.actorId))
     .sort((left, right) => left.actorId.localeCompare(right.actorId));
@@ -159,7 +162,7 @@
     const combatant = byCombatant.get(combatantId);
     if (combatant === undefined) return [];
     const position = positions.get(combatantId);
-    const planning = enginePlanningCombatantFacts(context.state, combatantId);
+    const planning = registry.planningFactsFor(combatantId);
     return [{
       combatantId, life: combatant.life, boardPresent: position !== undefined,
       position: position === undefined ? null : { ...position },
@@ -167,7 +170,7 @@
     }];
   });
   const zoneIds = uniqueSorted(configuredAnchors.flatMap((anchor) => anchor.kind === 'semantic_zone' ? [anchor.zoneId] : []));
-  const zoneStates = new Map(enginePlanningSemanticZones(context.state).map((zone) => [zone.id, zone.active] as const));
+  const zoneStates = new Map(registry.semanticZones().map((zone) => [zone.id, zone.active] as const));
   return {
     policy: PLAN_RELEVANCE_POLICY_VERSION,
     openMonsterActorIds,
diff --git a/src/vtt/speculative-planning.ts b/src/vtt/speculative-planning.ts
index d09d143a1477c3967857c17b436828b3e9011eb4..9316c05e6266406f5541be0ac16217b76253f8b9
--- a/src/vtt/speculative-planning.ts
+++ b/src/vtt/speculative-planning.ts
@@ -21,6 +21,7 @@
 } from './engine-query-port';
 import { availableEngineActorOptions, type EngineOfferableOption, type EngineTurnProposal } from './intent-resolver';
 import { projectFutureMonsterTurns } from './monster-planning-state';
+import { buildOfferEnvironment } from './offers/build-offer-environment';
 import type { EngineOptionEnvironment } from './offers/offer-environment';
 import type {
   EngineSelectorRef,
@@ -32,6 +33,11 @@
   ScenarioFactAtom,
 } from './speculative-plan-types';
 
+const transitionalLegacyOfferEnvironment = buildOfferEnvironment({
+  kind: 'configuration',
+  mode: 'legacy_standard',
+});
+
 export type GuardNoMatchReason =
   | 'FACT_FALSE'
   | 'SELECTOR_UNRESOLVED'
@@ -296,7 +302,7 @@
   plan(
     state: EncounterState,
     actors: readonly CombatantId[],
-    environment: EngineOptionEnvironment | EngineQueryPort = canonicalEngineQueryPort,
+    environment: EngineOptionEnvironment | EngineQueryPort = transitionalLegacyOfferEnvironment,
   ): readonly EngineTurnProposal[] {
     const queries = offerQueries(environment);
     const planningState = projectFutureMonsterTurns(state, actors);
@@ -678,7 +684,7 @@
   state: EncounterState,
   actors: readonly CombatantId[],
   unactedPlayerIds: readonly CombatantId[],
-  environment: EngineOptionEnvironment | EngineQueryPort = canonicalEngineQueryPort,
+  environment: EngineOptionEnvironment | EngineQueryPort = transitionalLegacyOfferEnvironment,
 ): {
   readonly baselineProposals: readonly EngineTurnProposal[];
   readonly scenarioMenu: readonly HostSplitCandidate[];
