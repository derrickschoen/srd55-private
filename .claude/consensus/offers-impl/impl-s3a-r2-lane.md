Implemented both reviewer fixes.

Changed production files:

- [encounter-projections.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/encounter-projections.ts:399) creates one transitional environment and threads it through human options, offered actors, and path projection.
- [offered-option-paths.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offered-option-paths.ts:54) reuses one transitional default and throws `OfferedOptionEnvironmentMismatchError` for identity mismatches instead of silently dropping paths.

Added committed specs:

- [offer-environment-identity.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/offer-environment-identity.test.ts:42)
- [offer-environment-board-sequence.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/offer-environment-board-sequence.test.ts:19)

Plan hash verified: `911a10f1e7bf27214740d71e3650c26f5117c4b1f1546fec3e1c06ff289417e0`.

Production regression proof:

```sh
npx vitest run --configLoader runner tests/unit/vtt/offer-environment-board-sequence.test.ts
```

Before the fix: 1/1 failed, exit 1, 3.55s. Production returned `[]` instead of six moving option IDs. After the fix, the two new specs pass 4/4 tests.

Committed mutation coverage:

- Resolver fallback → legacy environment: 1/1 red; restored 1/1 green. Pre/post SHA `31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217`.
- Board resolver → equal-query/different-policy environment: 1/1 red with `OfferedOptionEnvironmentMismatchError`; restored 1/1 green. Pre/post SHA `18fb4f9f470ce6f508202b8286ae07fede10b64c30820353ddd77d80c9e1c41e`.
- Team scorer → explicit legacy environment: 1/1 red; restored 1/1 green. Pre/post SHA `2dbee43bb57d070b9924633cbf9582956a2fceca26f00266d9d2e275a749212a`.

Gates:

- `npm run typecheck:fast` — exit 0, 7.68s.
- `sg scan` — exit 0, zero findings, 0.37s.
- Targeted seven-spec command — 7/7 files, 76/76 tests, exit 0, 8.93s.
- Slice 3A focused 14-spec command — 14/14 files, 280/280 tests, exit 0, 114.94s.
- Allowed serial retry:

```sh
npx vitest run --configLoader runner --maxWorkers=1 tests/unit/vtt/room-generator-los-cover.test.ts tests/unit/tools/rl-generate-data.test.ts tests/unit/tools/ai-dm-arena.test.ts
```

Result: 3/3 files, 161/161 tests, exit 0, 393.59s.

The required cumulative command:

```sh
npx vitest run --configLoader runner $(tr '\n' ' ' < .tmp/offers-s2.specs)
```

encountered 16 fixed-wall failures across 11 files and stranded after its workers exited; wrapper exit 130. Five failures were in the permitted retry files and passed serially. Eleven failures across eight non-permitted files cannot be rerun under the stated restriction: replay, D583 inventory, arena-interleave, board-delivery, experiment-orchestrator, soak-runner, JS round integration, and screenshot-probe.

`git diff --check` passed for tracked files. Both new files separately produced zero `git diff --no-index --check` diagnostics. The requested `git add -N` and reset could not acquire the worktree index lock because `.git/worktrees/...` is read-only.

Changed `expect(` calls—all additions, none modified or weakened:

- Identity spec: fallback selection; matching-environment paths; mismatch typed error; capsule digest; evaluation defined; no `option_illegal`.
- Board sequence: at least two moving options; exact option-ID preservation; exact path projection; every path nonempty; exact OA/difficult-terrain hazard set.

Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. No documentation, pins, registered D545 literals, timeouts, or existing assertions changed.

BLOCKED: the 172-spec cumulative gate produced non-permitted load-wall failures that cannot be rerun under the supplied retry restriction.
diff --git a/src/vtt/encounter-projections.ts b/src/vtt/encounter-projections.ts
index e96cfde43d3ee22566dc5e5553d390a6c640bc82..81111060eaaea0f010b9438d0f6887f325c1ae6e
--- a/src/vtt/encounter-projections.ts
+++ b/src/vtt/encounter-projections.ts
@@ -55,6 +55,8 @@
   projectHumanEngineOptions,
   type HumanEngineActorOptions,
 } from './encounter-board-projection';
+import { canonicalEngineQueryPort } from './engine-query-port';
+import { createLegacyEngineOptionEnvironment } from './offers/offer-environment';
 import {
   offeredOptionActorsForState,
   offeredOptionPaths as projectOfferedOptionPaths,
@@ -394,7 +396,8 @@
       combatantName: names.get(request.actorId as CombatantId) ?? request.actorId,
       interactive: true as const,
     }));
-  const offeredActors = offeredOptionActorsForState(input.view.state);
+  const offerEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+  const offeredActors = offeredOptionActorsForState(input.view.state, undefined, offerEnvironment);
   return {
     audience: 'dm',
     stateDigest: sha256(canonicalJson(input.view.state)),
@@ -403,12 +406,12 @@
     coordinator: input.coordinator,
     pendingRequest: input.coordinator.pendingRequest,
     humanCommandActions,
-    humanEngineOptions: projectHumanEngineOptions(input.view.state),
+    humanEngineOptions: projectHumanEngineOptions(input.view.state, undefined, undefined, offerEnvironment),
     movementPreviews: humanCommandActions.flatMap((action): readonly DmMovementPathPreview[] =>
       action.type === 'move'
         ? [{ commandKey: canonicalJson(action), ...previewMovementPathDangers(input.view.state, action) }]
         : []),
-    offeredOptionPaths: projectOfferedOptionPaths(input.view.state, offeredActors),
+    offeredOptionPaths: projectOfferedOptionPaths(input.view.state, offeredActors, offerEnvironment),
     controllers: input.controllers,
     history: input.history,
     adjudicatedTargets: targets,
diff --git a/src/vtt/offered-option-paths.ts b/src/vtt/offered-option-paths.ts
index 464e966a0a747da779c0e500e6bb86466a8ccc11..0a96b2d5c7be7d11a5c80b9c5530f487a09e01d5
--- a/src/vtt/offered-option-paths.ts
+++ b/src/vtt/offered-option-paths.ts
@@ -51,6 +51,17 @@
   }[];
 }
 
+export class OfferedOptionEnvironmentMismatchError extends TypeError {
+  readonly code = 'OFFER_ENVIRONMENT_MISMATCH' as const;
+
+  constructor(summary: string) {
+    super(summary);
+    this.name = 'OfferedOptionEnvironmentMismatchError';
+  }
+}
+
+const transitionalLegacyOfferEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+
 function optionOrdinal(value: number): OfferedOptionOrdinal {
   if (!Number.isSafeInteger(value) || value < 0) {
     throw new RangeError('An offered-option ordinal must be a non-negative safe integer.');
@@ -117,7 +128,7 @@
 export function offeredOptionActorsForState(
   state: EncounterState,
   actorIds: readonly CombatantId[] = actingMonsterIds(state),
-  offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
+  offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,
 ): readonly OfferedOptionActor[] {
   const planningState = projectFutureMonsterTurns(state, actorIds);
   return actorIds.map((actorId) => ({
@@ -136,7 +147,7 @@
 export function offeredOptionPaths(
   state: EncounterState,
   actors: readonly OfferedOptionActor[],
-  offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
+  offerEnvironment: EngineOptionEnvironment = transitionalLegacyOfferEnvironment,
 ): readonly OfferedOptionPath[] {
   const actorIds = actors.map((actor) => actor.actorId);
   const planningState = projectFutureMonsterTurns(state, actorIds);
@@ -150,7 +161,13 @@
         throw new TypeError(`Option ${option.optionId} belongs to a different actor.`);
       }
       const resolution = resolveEngineActorOption(planningState, option, offerEnvironment);
-      if (!resolution.valid || resolution.mechanics.path.length === 0) return [];
+      if (!resolution.valid) {
+        if (resolution.code === 'OFFER_ENVIRONMENT_MISMATCH') {
+          throw new OfferedOptionEnvironmentMismatchError(resolution.summary);
+        }
+        return [];
+      }
+      if (resolution.mechanics.path.length === 0) return [];
       const command = {
         type: 'move' as const,
         actor: actor.actorId,
diff --git a/tests/unit/vtt/offer-environment-board-sequence.test.ts b/tests/unit/vtt/offer-environment-board-sequence.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d4ec505751957cac93e56d214eb5a6e6121044e3
--- /dev/null
+++ b/tests/unit/vtt/offer-environment-board-sequence.test.ts
@@ -0,0 +1,46 @@
+import { describe, expect, it } from 'vitest';
+import { projectDmView } from '../../../src/combat/visibility';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { projectDmBoard } from '../../../src/vtt/encounter-projections';
+import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import { createLegacyEngineOptionEnvironment } from '../../../src/vtt/offers/offer-environment';
+import {
+  offeredOptionActorsForState,
+  offeredOptionPaths,
+} from '../../../src/vtt/offered-option-paths';
+import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';
+
+const IDLE = {
+  requestSequence: 1,
+  pendingRequest: null,
+  pendingCommand: null,
+  continuation: { kind: 'idle' as const },
+  pause: null,
+};
+
+describe('Slice 3A production board offer environment', () => {
+  it('production board keeps every moving offered-option path and its hazard overlays', () => {
+    const state = createOptionPathFixtureEncounter();
+    const environment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort);
+    const offeredActors = offeredOptionActorsForState(state, undefined, environment);
+    const movingOptionIds = offeredActors.flatMap((actor) => actor.options.flatMap((option) => {
+      const resolution = resolveEngineActorOption(state, option, environment);
+      return resolution.valid && resolution.mechanics.path.length > 0 ? [option.optionId] : [];
+    }));
+    const expectedPaths = offeredOptionPaths(state, offeredActors, environment);
+    const projection = projectDmBoard({
+      view: projectDmView(state),
+      coordinator: IDLE,
+      controllers: [],
+      history: [],
+    });
+
+    expect(movingOptionIds.length).toBeGreaterThanOrEqual(2);
+    expect(projection.offeredOptionPaths.map((path) => path.optionId)).toEqual(movingOptionIds);
+    expect(projection.offeredOptionPaths).toEqual(expectedPaths);
+    expect(projection.offeredOptionPaths.every((path) => path.path.length > 0)).toBe(true);
+    expect(new Set(projection.offeredOptionPaths.flatMap((path) =>
+      path.annotations.flatMap((annotation) => annotation.dangers))))
+      .toEqual(new Set(['opportunity_attack', 'difficult_terrain']));
+  });
+});
diff --git a/tests/unit/vtt/offer-environment-identity.test.ts b/tests/unit/vtt/offer-environment-identity.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..c74efa510126956b3764657f1fc7ecd47bd03211
--- /dev/null
+++ b/tests/unit/vtt/offer-environment-identity.test.ts
@@ -0,0 +1,127 @@
+import { describe, expect, it } from 'vitest';
+import { monsterCombatantProfile } from '../../../src/combat/combatant';
+import { createEncounter } from '../../../src/combat/encounter';
+import { mulberry32 } from '../../../src/combat/random';
+import { BANDIT } from '../../../src/combat/statblocks/mercenary-company';
+import { encounterBranchId, encounterSessionId } from '../../../src/combat/values';
+import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
+import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
+import {
+  availableEngineActorOptions,
+  createPureTurnProposalResolver,
+} from '../../../src/vtt/intent-resolver';
+import { scoreTeamPlans } from '../../../src/vtt/intel/team-scorer';
+import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
+import {
+  createEngineOfferFamilyPolicy,
+  createEngineOptionEnvironment,
+  createRevisionBoundEngineOptionEnvironment,
+} from '../../../src/vtt/offers/offer-environment';
+import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
+import {
+  OfferedOptionEnvironmentMismatchError,
+  offeredOptionActorsForState,
+  offeredOptionPaths,
+} from '../../../src/vtt/offered-option-paths';
+import { engineOptionId } from '../../../src/vtt/turn-proposal';
+import { placedToken, playerProfile } from '../combat/fixtures';
+
+function fixture() {
+  const actor = monsterCombatantProfile(BANDIT, {
+    combatantId: 'combatant:offers-s3a-bandit',
+    tokenId: 'token:offers-s3a-bandit',
+  });
+  const target = playerProfile('offers-s3a-target', { hitPoints: 80 });
+  const state = freshMonsterPlanningState(createEncounter({
+    bounds: { columns: 12, rows: 3 },
+    combatants: [actor, target],
+    tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],
+  }));
+  return { actor, state };
+}
+
+describe('Slice 3A bound offer environments', () => {
+  it('resolver fallback reuses the primary environment instance', () => {
+    const { actor, state } = fixture();
+    const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+    const options = availableEngineActorOptions(state, actor.id, environment);
+    const fallback = options.find((option) =>
+      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge'));
+    if (fallback === undefined) throw new Error('Dodge fallback fixture is absent.');
+    const result = createPureTurnProposalResolver(environment).resolve(state, {
+      actorId: actor.id,
+      expectedRevision: state.revision,
+      primaryOptionId: engineOptionId('option:not-offered'),
+      fallbackOptionId: fallback.optionId,
+      reason: 'Use the bound fallback.',
+      overrideJustification: null,
+    });
+
+    expect(result).toMatchObject({ valid: true, selectedBranch: 'fallback' });
+  });
+
+  it('board path and round execution share environment digest', () => {
+    const { actor, state } = fixture();
+    const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+    const differentPolicyEnvironment = createEngineOptionEnvironment({
+      queries: canonicalEngineQueryPort,
+      mode: 'revision_bound',
+      familyPolicy: createEngineOfferFamilyPolicy({
+        format: 'engine-offer-family-policy-v1',
+        helpAttack: 'enabled',
+        readyAttack: 'disabled',
+        unarmedControl: 'disabled',
+        reposition: 'disabled',
+      }),
+      partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
+    });
+    const actors = offeredOptionActorsForState(state, [actor.id], environment);
+
+    expect(offeredOptionPaths(state, actors, environment).length).toBeGreaterThan(0);
+    expect(() => offeredOptionPaths(state, actors, differentPolicyEnvironment))
+      .toThrowError(OfferedOptionEnvironmentMismatchError);
+
+    const capsule = new EngineRoundSession(
+      state,
+      mulberry32(3_000_001),
+      { kind: 'unattended', askDefault: 'decline' },
+      environment,
+    ).authorizationCapsule({
+      runId: encounterSessionId('encounter:offers-s3a'),
+      branchId: encounterBranchId('branch:offers-s3a'),
+      revision: 1,
+      requestId: 'request:offers-s3a',
+      phase: 'initial',
+      room: 1,
+      historyKind: 'offers_s3a_environment_identity',
+    });
+    expect(capsule.offerEnvironment.digest).toBe(environment.digest);
+  });
+
+  it('all offer API consumers use their bound environment', () => {
+    const { actor, state } = fixture();
+    const environment = createRevisionBoundEngineOptionEnvironment(canonicalEngineQueryPort);
+    const primary = availableEngineActorOptions(state, actor.id, environment)
+      .find((option) => option.actionSlots.some((slot) =>
+        slot.slot === 'main' && slot.use.kind === 'attack'));
+    if (primary === undefined) throw new Error('Attack option fixture is absent.');
+    const report = scoreTeamPlans(state, [{
+      candidateId: 'candidate:offers-s3a',
+      label: 'Bound attack',
+      proposals: [{
+        actorId: actor.id,
+        expectedRevision: state.revision,
+        primaryOptionId: primary.optionId,
+        fallbackOptionId: null,
+        reason: 'Use the bound attack.',
+        overrideJustification: null,
+      }],
+    }], environment);
+    const evaluation = report.evaluations[0];
+
+    expect(evaluation).toBeDefined();
+    if (evaluation?.status === 'unresolved') {
+      expect(evaluation.reasons).not.toContain('option_illegal');
+    }
+  });
+});
