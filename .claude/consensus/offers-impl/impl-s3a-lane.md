Implemented Slice 3A exactly within the ten-file cap.

Changed files:

- [intent-resolver.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intent-resolver.ts:73)
- [engine-round-session.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/engine-round-session.ts:568)
- [offered-option-paths.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offered-option-paths.ts:117)
- [encounter-board-projection.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/encounter-board-projection.ts:54)
- [plan-materiality.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/plan-materiality.ts:98)
- [speculative-planning.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/speculative-planning.ts:279)
- [opportunity-cost.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intel/opportunity-cost.ts:270)
- [team-scorer.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intel/team-scorer.ts:466)
- [engine-server.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/engine-server.ts:263)
- [entrypoint.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:417)

Offer generation and resolution now preserve the exact bound environment instance. Round execution, paths, projections, planning, intel scoring, and MCP handling propagate that environment rather than extracting the legacy query-only surface. The transitional entrypoint default and compatibility call surfaces remain intact for 3C. Registration remains standard-only.

Verification:

- Plan SHA-256: `911a10f1e7bf27214740d71e3650c26f5117c4b1f1546fec3e1c06ff289417e0`
- `npm run typecheck:fast` — exit 0, 7.57s
- `sg scan` — exit 0, zero findings, 0.30s
- `git diff --check` — exit 0
- Focused command:

```sh
npx vitest run --configLoader runner tests/unit/vtt/composite-turn-proposals.test.ts tests/unit/vtt/engine-round-session.test.ts tests/unit/vtt/offered-option-paths.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/plan-materiality.test.ts tests/unit/vtt/speculative-planning.test.ts tests/unit/vtt/engine-opportunity-movement-intel.test.ts tests/unit/vtt/team-scorer.test.ts tests/unit/tools/engine-mcp-handler.test.ts tests/unit/tools/engine-mcp-boundary.test.ts tests/unit/tools/ai-dm-board-delivery.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/engine-state-capsule.test.ts tests/unit/combat/creature-space.test.ts
```

Result: 14/14 files, 280/280 tests, exit 0, 113.71s.

Cumulative command:

```sh
npx vitest run --configLoader runner $(tr '\n' ' ' < .tmp/offers-s2.specs)
```

The parallel run encountered load-related timeouts in 12 files/21 tests and was terminated after becoming stranded, exit 130. The permitted serial rerun was:

```sh
npx vitest run --configLoader runner --maxWorkers=1 $(tr '\n' ' ' < .tmp/offers-s2.specs)
```

Result: 172/172 files, 3216/3216 tests, exit 0, 1778.22s. The copied list matches the source SHA-256: `64c0fb3d4eea84f4a5c462d7764cdec78423074e65513f77c588d21e6589f663`.

Mutation verification:

- Resolver fallback → legacy environment: red 1/1; restored green 1/1. Pre/post SHA: `31fb0d823e50cafd74e485b799831e6f3be28ae624d03db3309ab36615e7c217`.
- Board path → equal-query/different-policy environment: red 1/1; restored green 1/1. Pre/post SHA: `47e6767e61dbe2bffac351182f08f8c5b92dddfaf19cedf6fe5fc3c2a3cb3764`.
- Team scorer migrated call → explicit legacy environment: red 1/1; restored green 1/1. Pre/post SHA: `2dbee43bb57d070b9924633cbf9582956a2fceca26f00266d9d2e275a749212a`.

Final identity harness: 3/3 passing. Logs and the AST-sorted inventory are under [.tmp](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp/offers-s3a-consumers.txt). Inventory counts: 10 producers, 80 direct consumers, 172 production/tool closure entries, 180 runtime-test closure entries, and the first ten Slice 3B tests identified.

The frozen contract retains SHA-256 `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. No protected docs, registered D545 literals, expectation pins, tests, timeouts, or git state were changed.

OFFERS-S3A DONE
diff --git a/.tmp/offers-s3a-consumer-inventory.ts b/.tmp/offers-s3a-consumer-inventory.ts
new file mode 100644
index 0000000000000000000000000000000000000000..3f0367d03e0865ec880db1796e4533c83624b7d4
--- /dev/null
+++ b/.tmp/offers-s3a-consumer-inventory.ts
@@ -0,0 +1,46 @@
+import { execFileSync } from 'node:child_process';
+
+process.env['VITEST'] = '1';
+
+const { buildImportGraph, reverseConsumerClosure, reverseTestClosure } =
+  await import('../tools/d584-contract-inventory');
+
+const root = process.cwd();
+const producers = [
+  'src/vtt/encounter-board-projection.ts',
+  'src/vtt/engine-round-session.ts',
+  'src/vtt/intel/opportunity-cost.ts',
+  'src/vtt/intel/team-scorer.ts',
+  'src/vtt/intent-resolver.ts',
+  'src/vtt/mcp/engine-server.ts',
+  'src/vtt/mcp/entrypoint.ts',
+  'src/vtt/offered-option-paths.ts',
+  'src/vtt/plan-materiality.ts',
+  'src/vtt/speculative-planning.ts',
+] as const;
+const files = execFileSync('rg', ['--files', 'src', 'tools', 'tests'], {
+  cwd: root,
+  encoding: 'utf8',
+}).split(/\r?\n/u).filter((path) => /\.(?:ts|tsx|mts|mjs)$/u.test(path)).sort();
+const graph = await buildImportGraph(root, files);
+const directConsumers = [...new Set(producers.flatMap((producer) =>
+  graph.consumersByProducer[producer] ?? []))].sort();
+const closure = reverseConsumerClosure(graph, producers);
+const runtimeTests = reverseTestClosure(graph, producers);
+const productionAndToolConsumers = closure.filter((path) =>
+  path.startsWith('src/') || path.startsWith('tools/'));
+const directTestConsumers = directConsumers.filter((path) =>
+  path.startsWith('tests/') && path.endsWith('.test.ts'));
+
+const sections: readonly [string, readonly string[]][] = [
+  ['producers', producers],
+  ['direct_consumers', directConsumers],
+  ['slice_3b_first_ten_tests', directTestConsumers.slice(0, 10)],
+  ['production_and_tool_consumer_closure', productionAndToolConsumers],
+  ['runtime_test_consumer_closure', runtimeTests],
+];
+process.stdout.write('format=offers-s3a-ast-consumers-v1\n');
+for (const [name, paths] of sections) {
+  process.stdout.write(`${name}_count=${String(paths.length)}\n`);
+  for (const path of paths) process.stdout.write(`${name}\t${path}\n`);
+}
diff --git a/.tmp/offers-s3a-environment-identity.test.ts b/.tmp/offers-s3a-environment-identity.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5eadc2964be4a99819921906649b497f2ce977c6
--- /dev/null
+++ b/.tmp/offers-s3a-environment-identity.test.ts
@@ -0,0 +1,121 @@
+import { describe, expect, it } from 'vitest';
+import { monsterCombatantProfile } from '../src/combat/combatant';
+import { createEncounter } from '../src/combat/encounter';
+import { mulberry32 } from '../src/combat/random';
+import { BANDIT } from '../src/combat/statblocks/mercenary-company';
+import { encounterBranchId, encounterSessionId } from '../src/combat/values';
+import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';
+import { EngineRoundSession } from '../src/vtt/engine-round-session';
+import {
+  availableEngineActorOptions,
+  createPureTurnProposalResolver,
+} from '../src/vtt/intent-resolver';
+import { scoreTeamPlans } from '../src/vtt/intel/team-scorer';
+import { freshMonsterPlanningState } from '../src/vtt/monster-planning-state';
+import {
+  createEngineOfferFamilyPolicy,
+  createEngineOptionEnvironment,
+  createRevisionBoundEngineOptionEnvironment,
+} from '../src/vtt/offers/offer-environment';
+import { createUnrepresentedPartyThreatCatalog } from '../src/vtt/offers/party-threat-catalog';
+import {
+  offeredOptionActorsForState,
+  offeredOptionPaths,
+} from '../src/vtt/offered-option-paths';
+import { engineOptionId } from '../src/vtt/turn-proposal';
+import { placedToken, playerProfile } from '../tests/unit/combat/fixtures';
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
+    expect(offeredOptionPaths(state, actors, environment).length).toBeGreaterThan(0);
+    expect(offeredOptionPaths(state, actors, differentPolicyEnvironment)).toEqual([]);
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
+    expect(evaluation).toBeDefined();
+    if (evaluation?.status === 'unresolved') {
+      expect(evaluation.reasons).not.toContain('option_illegal');
+    }
+  });
+});
diff --git a//tmp/offers-s3a-vitest.config.ts b//tmp/offers-s3a-vitest.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5defaa035018905184b29d41eeb07ba5e069b0bb
--- /dev/null
+++ b//tmp/offers-s3a-vitest.config.ts
@@ -0,0 +1,6 @@
+export default {
+  root: '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help',
+  test: {
+    include: ['.tmp/offers-s3a-environment-identity.test.ts'],
+  },
+};
diff --git a/src/vtt/encounter-board-projection.ts b/src/vtt/encounter-board-projection.ts
index d81fc3a682ffc3ed382f77c13e7d03b2a974fa59..eadc28f4dd1723f41d30db0d9ceffd281ebf888d
--- a/src/vtt/encounter-board-projection.ts
+++ b/src/vtt/encounter-board-projection.ts
@@ -6,8 +6,13 @@
   EngineOptionCandidate,
 } from './option-modeling';
 import { renderNoModeledEffectReason, renderOmittedRider } from './renderer-profile';
-import { engineActorOptions } from './turn-option-registry';
+import { canonicalEngineQueryPort } from './engine-query-port';
+import { engineActorOptionsForEnvironment } from './intent-resolver';
 import { projectFutureMonsterTurns } from './monster-planning-state';
+import {
+  createLegacyEngineOptionEnvironment,
+  type EngineOptionEnvironment,
+} from './offers/offer-environment';
 
 export type HumanEngineOptionPresentation =
   | {
@@ -51,6 +56,7 @@
   actorIds: readonly CombatantId[] = state.combatants.flatMap((combatant) =>
     combatant.profile.kind === 'monster' && combatant.life !== 'dead' ? [combatant.profile.id] : []),
   revision = state.revision,
+  offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
 ): readonly HumanEngineActorOptions[] {
   const requested = new Set(actorIds);
   const optionState = projectFutureMonsterTurns(state, [...requested]);
@@ -58,7 +64,12 @@
     .filter((combatant) => requested.has(combatant.profile.id) && combatant.profile.kind === 'monster')
     .sort((left, right) => left.profile.id.localeCompare(right.profile.id))
     .map((combatant) => {
-      const candidates = engineActorOptions(optionState, combatant.profile.id, revision).candidates;
+      const candidates = engineActorOptionsForEnvironment(
+        optionState,
+        combatant.profile.id,
+        offerEnvironment,
+        revision,
+      ).candidates;
       const presented = candidates.map((candidate, existingOrder) => ({
         existingOrder,
         presentation: presentOption(candidate),
diff --git a/src/vtt/engine-round-session.ts b/src/vtt/engine-round-session.ts
index 1dc3a2de7eb6a3302e82862c3bc141bd0c3df339..ca2781e70ac1c009fe2a3cd83ccb78153f1f7fbb
--- a/src/vtt/engine-round-session.ts
+++ b/src/vtt/engine-round-session.ts
@@ -565,10 +565,10 @@
         commands.apply(command);
       for (const entry of entries) {
         state = advanceToActor(state, entry.proposal.actorId, reduce);
-        const primary = resolveEngineActorOption(state, entry.primaryOption, this.offerEnvironment.queries);
+        const primary = resolveEngineActorOption(state, entry.primaryOption, this.offerEnvironment);
         const fallback = primary.valid || entry.fallbackOption === null
           ? null
-          : resolveEngineActorOption(state, entry.fallbackOption, this.offerEnvironment.queries);
+          : resolveEngineActorOption(state, entry.fallbackOption, this.offerEnvironment);
         let mechanics: ResolvedTurnMechanics;
         let appliedBranch: EngineAppliedProposalBranch;
         let refusalCodes: string[];
@@ -585,11 +585,11 @@
           const dodgeOption = availableEngineActorOptions(
             state,
             entry.proposal.actorId,
-            this.offerEnvironment.queries,
+            this.offerEnvironment,
           ).find((option) =>
             option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
           if (dodgeOption === null) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
-          const dodge = resolveEngineActorOption(state, dodgeOption, this.offerEnvironment.queries);
+          const dodge = resolveEngineActorOption(state, dodgeOption, this.offerEnvironment);
           if (!dodge.valid) throw new Error(`Could not apply deterministic Dodge for ${entry.proposal.actorId}.`);
           mechanics = dodge.mechanics;
           appliedBranch = 'dodge';
diff --git a/src/vtt/intel/opportunity-cost.ts b/src/vtt/intel/opportunity-cost.ts
index c162fa78ae7d5e53f3dd00874d00f1d2dba64f19..f1df26d4dd364652990f3f4aaf80310b836d0ce3
--- a/src/vtt/intel/opportunity-cost.ts
+++ b/src/vtt/intel/opportunity-cost.ts
@@ -4,6 +4,7 @@
 import type { PlanMaterialityReasonCode } from '../plan-materiality';
 import type { EngineQueryPort } from '../engine-query-port';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../intent-resolver';
+import type { EngineOptionEnvironment } from '../offers/offer-environment';
 import type { EngineOfferableOption, EngineOptionId, EngineOptionMetric } from '../turn-proposal';
 import {
   compareDominanceVectors,
@@ -150,9 +151,10 @@
 function evaluateOption(
   state: EncounterState,
   option: EngineOfferableOption,
+  environment: EngineOptionEnvironment | EngineQueryPort,
   queries: EngineQueryPort,
 ): OpportunityOptionEvaluation | null {
-  const resolution = resolveEngineActorOption(state, option, queries);
+  const resolution = resolveEngineActorOption(state, option, environment);
   if (!resolution.valid) return null;
   const attacks = targetedAttacks(option);
   const approachFeet = resolution.mechanics.movementCostFeet;
@@ -268,13 +270,14 @@
 export function actorOpportunityReport(
   state: EncounterState,
   actorId: CombatantId,
-  queries: EngineQueryPort,
+  environment: EngineOptionEnvironment | EngineQueryPort,
   revision = state.revision,
 ): ActorOpportunityReport {
-  const available = availableEngineActorOptions(state, actorId, queries, revision);
+  const queries = 'binding' in environment ? environment.queries : environment;
+  const available = availableEngineActorOptions(state, actorId, environment, revision);
   const options = available
     .flatMap((option) => {
-      const evaluated = evaluateOption(state, option, queries);
+      const evaluated = evaluateOption(state, option, environment, queries);
       return evaluated === null ? [] : [evaluated];
     });
   const offensiveOrApproach = options.filter((option) =>
diff --git a/src/vtt/intel/team-scorer.ts b/src/vtt/intel/team-scorer.ts
index ab778506282a6be99ad442e94cf0d19f696ee095..6387aacc071a9bf36de459d6eee343fc58b05d3f
--- a/src/vtt/intel/team-scorer.ts
+++ b/src/vtt/intel/team-scorer.ts
@@ -2,6 +2,7 @@
 import type { CombatantId } from '../../combat/values';
 import type { EngineQueryPort, TacticalAllocationChoice } from '../engine-query-port';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../intent-resolver';
+import type { EngineOptionEnvironment } from '../offers/offer-environment';
 import type {
   EngineOfferableOption,
   EngineOptionId,
@@ -202,12 +203,17 @@
 function resolvedChoice(
   state: EncounterState,
   proposal: EngineTurnProposal,
-  queries: EngineQueryPort,
+  environment: EngineOptionEnvironment | EngineQueryPort,
 ): ResolvedChoice | TeamPlanUnresolvedReason {
-  const offered = availableEngineActorOptions(state, proposal.actorId, queries, proposal.expectedRevision);
+  const offered = availableEngineActorOptions(
+    state,
+    proposal.actorId,
+    environment,
+    proposal.expectedRevision,
+  );
   const primary = offered.find((option) => option.optionId === proposal.primaryOptionId);
   if (primary === undefined) return 'option_not_offered';
-  const primaryResolution = resolveEngineActorOption(state, primary, queries);
+  const primaryResolution = resolveEngineActorOption(state, primary, environment);
   if (primaryResolution.valid) {
     return { option: primary, mechanics: primaryResolution.mechanics };
   }
@@ -215,7 +221,7 @@
     ? undefined
     : offered.find((option) => option.optionId === proposal.fallbackOptionId);
   if (fallback === undefined) return 'option_illegal';
-  const fallbackResolution = resolveEngineActorOption(state, fallback, queries);
+  const fallbackResolution = resolveEngineActorOption(state, fallback, environment);
   return fallbackResolution.valid
     ? { option: fallback, mechanics: fallbackResolution.mechanics }
     : 'option_illegal';
@@ -270,6 +276,7 @@
 function wastedTurnMarker(
   state: EncounterState,
   choice: ResolvedChoice,
+  environment: EngineOptionEnvironment | EngineQueryPort,
   queries: EngineQueryPort,
 ): WastedTurnMarker | null {
   const reason = intrinsicWastedReason(choice.option, choice.mechanics.movementCostFeet);
@@ -277,11 +284,11 @@
   const hasAlternative = availableEngineActorOptions(
     state,
     choice.option.actorId,
-    queries,
+    environment,
     choice.option.revision,
   ).some((alternative) => {
     if (alternative.optionId === choice.option.optionId) return false;
-    const resolution = resolveEngineActorOption(state, alternative, queries);
+    const resolution = resolveEngineActorOption(state, alternative, environment);
     return resolution.valid && hasConcreteEffect({ option: alternative, mechanics: resolution.mechanics });
   });
   return classifyWastedTurn(choice.option, choice.mechanics.movementCostFeet, hasAlternative);
@@ -312,6 +319,7 @@
 function evaluateTeamPlan(
   state: EncounterState,
   candidate: TeamPlanCandidate,
+  environment: EngineOptionEnvironment | EngineQueryPort,
   queries: EngineQueryPort,
 ): TeamPlanEvaluation {
   const actorIds = candidate.proposals.map((proposal) => proposal.actorId);
@@ -322,7 +330,7 @@
       reasons: ['duplicate_actor'],
     };
   }
-  const results = candidate.proposals.map((proposal) => resolvedChoice(state, proposal, queries));
+  const results = candidate.proposals.map((proposal) => resolvedChoice(state, proposal, environment));
   const resolutionReasons = results.filter(
     (result): result is TeamPlanUnresolvedReason => typeof result === 'string',
   );
@@ -400,7 +408,7 @@
   }
 
   const markers = choices.flatMap((choice) => {
-    const marker = wastedTurnMarker(state, choice, queries);
+    const marker = wastedTurnMarker(state, choice, environment, queries);
     return marker === null ? [] : [marker];
   });
   const lethality = allocations.reduce((sum, allocation) =>
@@ -458,10 +466,11 @@
 export function scoreTeamPlans(
   state: EncounterState,
   candidates: readonly TeamPlanCandidate[],
-  queries: EngineQueryPort,
+  environment: EngineOptionEnvironment | EngineQueryPort,
 ): TeamPlanFrontierReport {
+  const queries = 'binding' in environment ? environment.queries : environment;
   return scoreTeamPlanEvaluations(candidates.map((candidate) =>
-    evaluateTeamPlan(state, candidate, queries)));
+    evaluateTeamPlan(state, candidate, environment, queries)));
 }
 
 function renderVector(vector: TeamPlanVector): Readonly<Record<TeamPlanMetric, unknown>> {
diff --git a/src/vtt/intent-resolver.ts b/src/vtt/intent-resolver.ts
index 0833f370531132c509962e0bdd51219ed78e703d..acc26a145cdf3f059d349d60d99652f0bedb59c4
--- a/src/vtt/intent-resolver.ts
+++ b/src/vtt/intent-resolver.ts
@@ -22,6 +22,7 @@
   type EngineTargetSelector,
 } from './engine-query-port';
 import { engineActorOptions } from './turn-option-registry';
+import type { EngineActorOptionPartition } from './turn-option-registry';
 import {
   engineActionId,
   engineSpellId,
@@ -41,6 +42,7 @@
 } from './turn-proposal';
 import type { EngineOmittedRider } from './option-modeling';
 import { legalMultiattackCombinations } from './offers/offer-declarations';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 
 export type {
   EngineActionId,
@@ -68,6 +70,39 @@
   return { valid: false, code, summary };
 }
 
+export type EngineOfferApiEnvironment = EngineOptionEnvironment | EngineQueryPort;
+
+const optionEnvironmentBindings = new WeakMap<EngineOfferableOption, EngineOptionEnvironment>();
+
+function isEngineOptionEnvironment(
+  environment: EngineOfferApiEnvironment,
+): environment is EngineOptionEnvironment {
+  return 'binding' in environment;
+}
+
+export function offerApiQueries(environment: EngineOfferApiEnvironment): EngineQueryPort {
+  return isEngineOptionEnvironment(environment) ? environment.queries : environment;
+}
+
+function bindOptionEnvironment(
+  option: EngineOfferableOption,
+  environment: EngineOfferApiEnvironment,
+): EngineOfferableOption {
+  if (isEngineOptionEnvironment(environment)) optionEnvironmentBindings.set(option, environment);
+  return option;
+}
+
+export function engineActorOptionsForEnvironment(
+  state: EncounterState,
+  actorId: CombatantId,
+  environment: EngineOfferApiEnvironment,
+  revision = state.revision,
+): EngineActorOptionPartition {
+  const partition = engineActorOptions(state, actorId, revision);
+  for (const option of partition.offerable) bindOptionEnvironment(option, environment);
+  return partition;
+}
+
 function resolveSelector(
   state: EncounterState,
   actorId: CombatantId,
@@ -510,8 +545,17 @@
 export function resolveEngineActorOption(
   state: EncounterState,
   option: EngineOfferableOption,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  environment: EngineOfferApiEnvironment = canonicalEngineQueryPort,
 ): OptionResolution {
+  const boundEnvironment = optionEnvironmentBindings.get(option);
+  if (boundEnvironment !== undefined &&
+    (!isEngineOptionEnvironment(environment) || boundEnvironment !== environment)) {
+    return refused(
+      'OFFER_ENVIRONMENT_MISMATCH',
+      `${option.actorId}: option was not created by the bound offer environment`,
+    );
+  }
+  const queries = offerApiQueries(environment);
   const actor = queries.combatant(state, option.actorId);
   if (actor?.profile.kind !== 'monster' || actor.life !== 'living') {
     return refused('ACTOR_NOT_LIVING_MONSTER', `${option.actorId}: actor is not a living monster`);
@@ -605,11 +649,11 @@
 export function availableEngineActorOptions(
   state: EncounterState,
   actorId: CombatantId,
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  environment: EngineOfferApiEnvironment = canonicalEngineQueryPort,
   revision = state.revision,
 ): readonly EngineOfferableOption[] {
-  return engineActorOptions(state, actorId, revision).offerable
-    .filter((option) => resolveEngineActorOption(state, option, queries).valid);
+  return engineActorOptionsForEnvironment(state, actorId, environment, revision).offerable
+    .filter((option) => resolveEngineActorOption(state, option, environment).valid);
 }
 
 function accepted(
@@ -635,14 +679,19 @@
 }
 
 export function createPureTurnProposalResolver(
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  environment: EngineOfferApiEnvironment = canonicalEngineQueryPort,
 ): PureTurnProposalResolver {
   return Object.freeze({
     resolve(state: EncounterState, proposal: EngineTurnProposal): EngineProposalResolution {
-      const options = availableEngineActorOptions(state, proposal.actorId, queries, proposal.expectedRevision);
+      const options = availableEngineActorOptions(
+        state,
+        proposal.actorId,
+        environment,
+        proposal.expectedRevision,
+      );
       const primary = options.find((option) => option.optionId === proposal.primaryOptionId);
       if (primary !== undefined) {
-        const resolution = resolveEngineActorOption(state, primary, queries);
+        const resolution = resolveEngineActorOption(state, primary, environment);
         if (resolution.valid) {
           const fallback = proposal.fallbackOptionId === null
             ? null
@@ -667,7 +716,7 @@
           refusals: [primaryRefusal, { branch: 'fallback', code: 'OPTION_NOT_OFFERED', summary: `${proposal.actorId}: fallback option was not offered at revision ${String(proposal.expectedRevision)}` }],
         };
       }
-      const resolution = resolveEngineActorOption(state, fallback, queries);
+      const resolution = resolveEngineActorOption(state, fallback, environment);
       return resolution.valid
         ? choiceFitsOption(fallback, proposal.activationChoice)
           ? accepted('fallback', fallback, mechanicsWithChoice(resolution.mechanics, proposal.activationChoice, fallback), primary ?? fallback, fallback, [primaryRefusal])
diff --git a/src/vtt/mcp/engine-server.ts b/src/vtt/mcp/engine-server.ts
index 4b1c0d6ebfe47c89886749221942ceb16a94470c..8af9d83547d2438aff30e84c456b2bcd3c7a19ff
--- a/src/vtt/mcp/engine-server.ts
+++ b/src/vtt/mcp/engine-server.ts
@@ -30,6 +30,7 @@
   type RuleReference,
 } from '../engine-state-capsule';
 import type { EngineQueryPort, EngineTargetSelector } from '../engine-query-port';
+import type { EngineOptionEnvironment } from '../offers/offer-environment';
 import { resolveEngineActorOption, type EngineMovementPreference, type EngineTurnProposal, type PureTurnProposalResolver } from '../intent-resolver';
 import { decisionReasonProblem } from '../decision-reason';
 import {
@@ -262,7 +263,7 @@
 interface EngineMcpDependencies {
   readonly state: EncounterState;
   readonly stateSource: EngineCapsuleFeed;
-  readonly queries: EngineQueryPort;
+  readonly offerEnvironment: EngineOptionEnvironment;
   readonly turnProposals: PureTurnProposalResolver;
   readonly proposals: ProposalSink;
   readonly speculativePlans: SpeculativePlanSink;
@@ -806,7 +807,14 @@
             'actionId' in use && rider.sourceActionId === use.actionId),
   };
 }
-function tacticalOptions(state: EncounterState, queries: EngineQueryPort, capsule: EngineStateCapsule, actorId: CombatantId, includeExpectations: boolean): readonly Readonly<Record<string, unknown>>[] {
+function tacticalOptions(
+  state: EncounterState,
+  offerEnvironment: EngineOptionEnvironment,
+  capsule: EngineStateCapsule,
+  actorId: CombatantId,
+  includeExpectations: boolean,
+): readonly Readonly<Record<string, unknown>>[] {
+  const queries = offerEnvironment.queries;
   const projected = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
   if (projected === undefined) return [];
   // The byte-cap pruner removes from the tail. Keep immediately usable,
@@ -849,7 +857,7 @@
           ? firstUse.targets[0] ?? null
           : null;
     const targetId = firstTarget === null ? null : queries.resolveTarget(state, actorId, firstTarget);
-    const resolution = resolveEngineActorOption(state, option, queries);
+    const resolution = resolveEngineActorOption(state, option, offerEnvironment);
     const movementFeet = resolution.valid ? resolution.mechanics.movementCostFeet : null;
     const attacks = firstUse.kind === 'attack'
       ? targetId === null ? [] : [{ actionId: String(firstUse.actionId), targetId }]
@@ -1320,8 +1328,12 @@
     throw new RangeError('maximumResourceBytes cannot exceed the 128 KiB hard limit.');
   }
   const { state, stateSource: feed, proposals, speculativePlans, narration, adjudications, rules } = dependencies;
-  const { queries, turnProposals } = dependencies;
+  const { offerEnvironment, turnProposals } = dependencies;
+  const queries = offerEnvironment.queries;
   const launchCapsule = feed.current();
+  if (launchCapsule.offerEnvironment.digest !== offerEnvironment.digest) {
+    throw new TypeError('Engine MCP application offer environment does not match its launch capsule.');
+  }
   const launchRequest = launchCapsule.request;
   const launcherRoundBinding: LauncherRoundSubmissionBinding | null =
     launchRequest !== null && launchRequest.phase !== 'speculative' && launchRequest.kind !== 'plan_adjustment'
@@ -1383,7 +1395,7 @@
     const key = `${capsule.digest}:${actorId}`;
     const prior = opportunityReports.get(key);
     if (prior !== undefined) return prior;
-    const report = actorOpportunityReport(state, actorId, queries, capsule.revision);
+    const report = actorOpportunityReport(state, actorId, offerEnvironment, capsule.revision);
     opportunityReports.set(key, report);
     return report;
   }
@@ -1399,7 +1411,7 @@
       candidateId: play.name,
       label: play.description,
       proposals: SNIPPET_REGISTRY.expand(play.name, capsule).proposals,
-    })), queries);
+    })), offerEnvironment);
     teamPlanReports.set(key, report);
     return report;
   }
@@ -1607,7 +1619,7 @@
       const actors = [...required].sort().map((actorId) => {
         const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
         if (actor === undefined) throw new RangeError(`ACTOR_ABSENT:${actorId}`);
-        const all = tacticalOptions(state, queries, capsule, actorId, false);
+        const all = tacticalOptions(state, offerEnvironment, capsule, actorId, false);
         return {
           actor_id: actorId,
           status: actorStatus(actor),
@@ -1766,7 +1778,7 @@
     const actors = [...required].sort().map((actorId) => {
       const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
       if (actor === undefined) throw new RangeError(`ACTOR_ABSENT:${actorId}`);
-      const all = tacticalOptions(state, queries, capsule, actorId, includeExpectations);
+      const all = tacticalOptions(state, offerEnvironment, capsule, actorId, includeExpectations);
       const intelRows = topDmActorIntelRows(exactIntel, actorId);
       const unresolvedFindings = exactIntel.filter((row) =>
         row.actorId === actorId && !isInformativeDmIntelRow(row)).map((row) => ({
@@ -2722,7 +2734,9 @@
             effective_size: actor.effectiveSize,
             placement_mode: actor.placementMode,
             footprint: actor.footprint,
-            options: granularity === 'combatant_detail' ? tacticalOptions(state, queries, capsule, actor.id, true) : [],
+            options: granularity === 'combatant_detail'
+              ? tacticalOptions(state, offerEnvironment, capsule, actor.id, true)
+              : [],
             threats: granularity === 'turn_minimal' || granularity === 'combatant_detail' ? threats(state, queries, actor.id) : [],
           }
         : {
@@ -2744,7 +2758,7 @@
       const actorId = combatantId(stringField(input, 'actor_id'));
       const actor = capsule.projection.combatants.find((candidate) => candidate.id === actorId);
       if (actor === undefined) throw new RangeError('ACTOR_ABSENT');
-      const all = tacticalOptions(state, queries, capsule, actorId, true);
+      const all = tacticalOptions(state, offerEnvironment, capsule, actorId, true);
       const paged = applicationPage(capsule, canonicalJson({ actorId }), all, input['page']);
       return { state_ref: externalStateRef(capsule), actor_id: actorId, status: actorStatus(actor), options: paged.values, truncated: paged.truncated, next_cursor: paged.next };
     }
diff --git a/src/vtt/mcp/entrypoint.ts b/src/vtt/mcp/entrypoint.ts
index c664d9d0bd107573ac94782f4fed60ea9bb959fc..8a4bcb743fa30acde0094c4b7eeb1a639106d7d7
--- a/src/vtt/mcp/entrypoint.ts
+++ b/src/vtt/mcp/entrypoint.ts
@@ -417,8 +417,8 @@
   const application = createEngineMcpApplication({
     state: planningState,
     stateSource: feed,
-    queries: offerEnvironment.queries,
-    turnProposals: createPureTurnProposalResolver(offerEnvironment.queries),
+    offerEnvironment,
+    turnProposals: createPureTurnProposalResolver(offerEnvironment),
     proposals: {
       append: (envelope) => {
         proposals.push(envelope);
diff --git a/src/vtt/offered-option-paths.ts b/src/vtt/offered-option-paths.ts
index f06dd89fa7ecf6ac513c135735b2d1cf325660f3..464e966a0a747da779c0e500e6bb86466a8ccc11
--- a/src/vtt/offered-option-paths.ts
+++ b/src/vtt/offered-option-paths.ts
@@ -6,7 +6,12 @@
 import type { GridCell } from '../combat/grid';
 import { feet, type CombatantId } from '../combat/values';
 import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
+import { canonicalEngineQueryPort } from './engine-query-port';
 import { projectFutureMonsterTurns } from './monster-planning-state';
+import {
+  createLegacyEngineOptionEnvironment,
+  type EngineOptionEnvironment,
+} from './offers/offer-environment';
 import type { EngineMainActionUse, EngineOfferableOption, EngineOptionId } from './turn-proposal';
 
 declare const offeredOptionOrdinalBrand: unique symbol;
@@ -112,11 +117,14 @@
 export function offeredOptionActorsForState(
   state: EncounterState,
   actorIds: readonly CombatantId[] = actingMonsterIds(state),
+  offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
 ): readonly OfferedOptionActor[] {
   const planningState = projectFutureMonsterTurns(state, actorIds);
   return actorIds.map((actorId) => ({
     actorId,
-    options: orderOptionsAsTurnContext(availableEngineActorOptions(planningState, actorId)),
+    options: orderOptionsAsTurnContext(
+      availableEngineActorOptions(planningState, actorId, offerEnvironment),
+    ),
   }));
 }
 
@@ -128,6 +136,7 @@
 export function offeredOptionPaths(
   state: EncounterState,
   actors: readonly OfferedOptionActor[],
+  offerEnvironment: EngineOptionEnvironment = createLegacyEngineOptionEnvironment(canonicalEngineQueryPort),
 ): readonly OfferedOptionPath[] {
   const actorIds = actors.map((actor) => actor.actorId);
   const planningState = projectFutureMonsterTurns(state, actorIds);
@@ -140,7 +149,7 @@
       if (option.actorId !== actor.actorId) {
         throw new TypeError(`Option ${option.optionId} belongs to a different actor.`);
       }
-      const resolution = resolveEngineActorOption(planningState, option);
+      const resolution = resolveEngineActorOption(planningState, option, offerEnvironment);
       if (!resolution.valid || resolution.mechanics.path.length === 0) return [];
       const command = {
         type: 'move' as const,
diff --git a/src/vtt/plan-materiality.ts b/src/vtt/plan-materiality.ts
index 2bc54cff6d0738912210e2d6aae70d3e672e27cb..6f7b7d5de72f0f380edb3b9f347a9249a5196ad3
--- a/src/vtt/plan-materiality.ts
+++ b/src/vtt/plan-materiality.ts
@@ -6,6 +6,7 @@
 import { enginePlanningCombatantFacts, enginePlanningSemanticZones } from './engine-query-port';
 import { resolveEngineActorOption, type EngineOfferableOption } from './intent-resolver';
 import { projectFutureMonsterTurns } from './monster-planning-state';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 import type { GuardConditionIdentity } from './speculative-plan-types';
 
 export const PLAN_RELEVANCE_POLICY_VERSION = 'plan-relevance-v2-composite' as const;
@@ -31,6 +32,8 @@
 
 export interface PlanRelevanceContext {
   readonly state: EncounterState;
+  /** Transitional optionality remains until every caller is migrated in Slice 3C. */
+  readonly offerEnvironment?: EngineOptionEnvironment;
   readonly openMonsterActorIds: readonly CombatantId[];
   readonly remainingOptions: readonly EngineOfferableOption[];
   readonly explicitEngagementAnchors?: readonly PlanRelevanceAnchor[];
@@ -95,8 +98,14 @@
   return [...conditions].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
 }
 
-function proposalRecord(state: EncounterState, option: EngineOfferableOption): PlanRelevanceProposalRecord {
-  const resolution = resolveEngineActorOption(state, option);
+function proposalRecord(
+  state: EncounterState,
+  option: EngineOfferableOption,
+  offerEnvironment: EngineOptionEnvironment | undefined,
+): PlanRelevanceProposalRecord {
+  const resolution = offerEnvironment === undefined
+    ? resolveEngineActorOption(state, option)
+    : resolveEngineActorOption(state, option, offerEnvironment);
   return resolution.valid
     ? {
         actorId: option.actorId,
@@ -134,7 +143,8 @@
   const open = new Set(openMonsterActorIds);
   const remaining = context.remainingOptions.filter((option) => open.has(option.actorId))
     .sort((left, right) => left.actorId.localeCompare(right.actorId));
-  const proposals = remaining.map((option) => proposalRecord(planningState, option));
+  const proposals = remaining.map((option) =>
+    proposalRecord(planningState, option, context.offerEnvironment));
   const configuredAnchors = context.explicitEngagementAnchors ?? [];
   const relevantIds = uniqueSorted([
     ...openMonsterActorIds,
diff --git a/src/vtt/speculative-planning.ts b/src/vtt/speculative-planning.ts
index 6230bcff984628b1c794096858720023767efc11..d09d143a1477c3967857c17b436828b3e9011eb4
--- a/src/vtt/speculative-planning.ts
+++ b/src/vtt/speculative-planning.ts
@@ -21,6 +21,7 @@
 } from './engine-query-port';
 import { availableEngineActorOptions, type EngineOfferableOption, type EngineTurnProposal } from './intent-resolver';
 import { projectFutureMonsterTurns } from './monster-planning-state';
+import type { EngineOptionEnvironment } from './offers/offer-environment';
 import type {
   EngineSelectorRef,
   GuardConditionIdentity,
@@ -278,10 +279,14 @@
   plan(
     state: EncounterState,
     actors: readonly CombatantId[],
-    queries?: EngineQueryPort,
+    environment?: EngineOptionEnvironment | EngineQueryPort,
   ): readonly EngineTurnProposal[];
 }
 
+function offerQueries(environment: EngineOptionEnvironment | EngineQueryPort): EngineQueryPort {
+  return 'binding' in environment ? environment.queries : environment;
+}
+
 function optionIsOffensive(option: EngineOfferableOption): boolean {
   return option.actionSlots.some((slot) => slot.slot === 'main' &&
     (slot.use.kind === 'attack' || slot.use.kind === 'multiattack' || slot.use.kind === 'saving_throw'));
@@ -291,11 +296,12 @@
   plan(
     state: EncounterState,
     actors: readonly CombatantId[],
-    queries: EngineQueryPort = canonicalEngineQueryPort,
+    environment: EngineOptionEnvironment | EngineQueryPort = canonicalEngineQueryPort,
   ): readonly EngineTurnProposal[] {
+    const queries = offerQueries(environment);
     const planningState = projectFutureMonsterTurns(state, actors);
     return actors.flatMap((actorId) => {
-      const options = availableEngineActorOptions(planningState, actorId, queries);
+      const options = availableEngineActorOptions(planningState, actorId, environment);
       const primary = options.find(optionIsOffensive) ?? options[0];
       if (primary === undefined) return [];
       const fallback = options.find((option) => option.actionSlots.some((slot) =>
@@ -672,16 +678,17 @@
   state: EncounterState,
   actors: readonly CombatantId[],
   unactedPlayerIds: readonly CombatantId[],
-  queries: EngineQueryPort = canonicalEngineQueryPort,
+  environment: EngineOptionEnvironment | EngineQueryPort = canonicalEngineQueryPort,
 ): {
   readonly baselineProposals: readonly EngineTurnProposal[];
   readonly scenarioMenu: readonly HostSplitCandidate[];
   readonly scenarios: readonly HostScenario[];
 } {
+  const queries = offerQueries(environment);
   const planningState = projectFutureMonsterTurns(state, actors);
-  const baselineProposals = hostBaselineProposalPlanner.plan(planningState, actors, queries);
+  const baselineProposals = hostBaselineProposalPlanner.plan(planningState, actors, environment);
   const baselineOptions = baselineProposals.flatMap((proposal) =>
-    availableEngineActorOptions(planningState, proposal.actorId, queries).filter((option) =>
+    availableEngineActorOptions(planningState, proposal.actorId, environment).filter((option) =>
       option.optionId === proposal.primaryOptionId));
   const scenarioMenu = computeHostSplitCandidates(
     state,
