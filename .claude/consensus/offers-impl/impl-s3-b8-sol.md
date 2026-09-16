# OFFERS-IMPL-S3-BUILDER B8 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b8.log. Supervisor verification .tmp/runs/verify-s3-b8.log.

Implemented B8 across exactly the ten authorized test files. All callers now use built environments at the future-required positions, canonical-port references are gone, and all existing expectations remain unchanged.

### File changes and hashes

| File | Pristine SHA-256 | Final SHA-256 | Migration |
|---|---|---|---|
| `monster-feature-support.test.ts` | `f407a31a1b293487ea1464ae6e48fbdc967fbcb289f036c8b14efda27f23a9ad` | `029993d5387cc6ada745bfa449eb3ac97161e2bd8fe3515dea8ed70a73a11be3` | Runtime environment at lines 72–75; DM intel uses `OFFER_ENVIRONMENT.queries` at 79. |
| `monster-omitted-riders.test.ts` | `9abc4f0bc87f2e132a4586ed3b1b319395c2c34752104b415921e69b5f51d5d8` | `2d1acb945f741529be357b72a465a1ae8102a7dcfc99e8f2ea9053b2815d407d` | Generation at 46; resolution at 67, 78, 107, 119; runtimes at 129 and 144; human projection at 164. |
| `offered-option-paths.test.ts` | `88e82fbd1cc7ab4d33fd7497a56cf74dd31c96cc9714aedd42a6e31a83e08c73` | `d043d15826c6e5b8d87948b5b415c745af12ed62b366e4d409facc9d081676a6` | Option generation at 108; path projection at 111. |
| `option-outcome.test.ts` | `10c3acb3cf8093e4be70761f4d37358f01eae3bc5afa94b8ea2ce8c0f3a9213c` | `e2bd32393a594f789f4410b3fff3834b23d34416f0cbd2c5995508e3cc7b2e9d` | Generation/resolution/query routing at 72–78 and 127–135. |
| `plan-materiality.test.ts` | `6673b7b30c6b68237ce7c7a5bab30354329276cd1e70a13cd116af06d682c58c` | `6ea012c1da977110aee5669d88a16e395e985aff5fd2831286b81374b5c8f7bf` | Generation at 177 and 221; materiality context at 188; relevance records at 225–235. |
| `plays-v1.test.ts` | `ed4426a7cda2e396eb1f8f2488761b3922a09468d7718a615a37ca2e5275689a` | `4e991bb138a68201a744d63de3c3b8c09499b1745570c1e088840ad83e571a8e` | Replaced capsule convenience calls with `createEngineStateCapsuleForEnvironment` at 148 and 248; bindings at 161 and 255. |
| `preview-hidden-rolls.test.ts` | `ad4d119ba5f66a990a6b511ff77e768d067bc98e0959d2c6f3a9c1e4e41a4ca3` | `1ed062f28145f45679687926d869c3e06877e2efdcff08c627b825d104e3d1cd` | DM projections receive the environment at 204 and 269. |
| `prose-renderer.test.ts` | `4d45d8bc3b5b6f4a71eef33474d701d84fc0acc2e52b2d0f2ac28d7134268c6b` | `e628f57a10235ecd1546dc3f5b54e1870e874ce1b821f35cf58497b1628e517e` | Bound runtime helper at 18–23; all 13 runtime call sites migrated at 157–371. |
| `refusal-handling.test.ts` | `7f71a915a6445f3df352935a088d7e6d8ffd49f96551cbfcc8f86c9ec500fef2` | `14319a1f6d3f46e0350b948ee945e9c50a8cd38bdbdf2ba0cfc184f544b1ba3d` | Host construction migrated at 145, 176, 199, 219, 226, and 279. |
| `renderer-profile.test.ts` | `a583765f4b2217b5290789bf52c2aaa65ea3fa511802e0ed48e33a3e68c312f6` | `9bfbd2326169e2aa8ca7c5aafb3bf496ba55d51d59d707508e141ae70e71e498` | Bound runtime helper at 41–46; round session at 62–66; runtime sites at 81 and 423–510. |

The hand-built play capsule remains the explicit subject of the snippet/capsule tests and is never passed to the resolver as an unregistered option.

No ambient resolver was present in this group. No new compatibility seam was added.

### Preserved boundaries and pins

The refusal and hidden-roll fixtures were not rebuilt; only environment arguments were added. Their original state, action, and refusal/redaction boundaries remain unchanged.

D625-reserved expectations were untouched:

- `prose-renderer.test.ts`: actor-knowledge/last-seen fixture and prose pin at lines 272–297.
- `renderer-profile.test.ts`: hand-written old-era row pin at lines 259–268.
- No expected value, digest, ID, prose string, or serialized golden changed.

### Mutant proofs

Each production target was copied to `/tmp`, mutated, checked, restored with `cp`, and its pristine SHA verified.

| Test file / mutant edit | Pristine → mutant SHA | Killing test and failure |
|---|---|---|
| Monster feature: `no_sunlight_state` → `no_underwater_state` | `62f48efe…` → `6c3cca36…` | `sunlight_sensitivity_preflight_and_intel_flag`; expected `no_sunlight_state`, received `no_underwater_state`. |
| Omitted rider: advantage trigger → `charge` | `62f48efe…` → `0d713b2f…` | `names goblin Advantage damage…`; expected `attack_roll_advantage`, received `charge`. |
| Offered paths: `path.length === 0` → `>= 0` | `849cac18…` → `269c811d…` | `projects the resolver path…`; `expected 0 to be greater than or equal to 2`. |
| Option outcome: reversed hostile/friendly subtraction | `ed90fc43…` → `833a37cf…` | `matches the complete Hypnotic Pattern…`; expected numerator `97104`, received `-97104`. |
| Materiality: displacement threshold `10` → `11` | `2142bee8…` → `a1ef210a…` | `wake rule 6…`; expected reason list to contain `FORCED_DISPLACEMENT_AT_LEAST_10_FEET`. |
| Plays: primary-not-projected issue mistagged as fallback | `6ddb4c61…` → `bf36d46f…` | `reports capsule-semantic shadow validation failures…`; expected `PRIMARY_OPTION_NOT_PROJECTED`, received `FALLBACK_OPTION_NOT_PROJECTED`. |
| Hidden-roll shortcut: attack category check replaced with saving-throw category | `6e6e2fec…` → `043010fa…` | `hidden_number_leaks`; player received full attack roll/damage and `player_visible` instead of redacted `dm_only`. |
| Prose: `last saw` → `detected` | `8a95c103…` → `afd5ccbe…` | `renders resolved last-seen knowledge…`; expected sentence was absent. |
| Refusal: removed independent assumed-action explanation | `fbbfeb75…` → `b7c93873…` | `default_unlogged`; reasoning no longer contained `Assumed the action has no mechanical effect`. |
| Renderer: corrupted attribution policy | `8a95c103…` → `5e16d1f1…` | `independently controls model-visible renderer attribution`; schema rejected `mutated-renderer-policy`. |

Every restoration reproduced the pristine SHA shown above. Because neither boundary fixture was rebuilt, no additional rebuilt-fixture shortcut mutant was applicable; the hidden-roll production shortcut still directly proved the player/DM boundary.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics, 14.57s

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics, 28.04s
```

Forward-contraction overlay:

```text
node /tmp/s3-b6-forward-overlay.mjs
providerEdits=66 removedFactories=4
monster-feature-support.test.ts=0
monster-omitted-riders.test.ts=0
offered-option-paths.test.ts=0
option-outcome.test.ts=0
plan-materiality.test.ts=0
plays-v1.test.ts=0
preview-hidden-rolls.test.ts=0
prose-renderer.test.ts=0
refusal-handling.test.ts=0
renderer-profile.test.ts=0
```

Architecture gate:

```text
bash scripts/check-command-outcomes.sh
exit 0
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts,
offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

B8 tests:

```text
npx vitest run --configLoader runner --reporter=json --outputFile=/tmp/s3-b8-vitest.json \
  <the ten B8 files>
exit 0
```

| Suite | Passed |
|---|---:|
| monster-feature-support | 3 |
| monster-omitted-riders | 8 |
| offered-option-paths | 4 |
| option-outcome | 4 |
| plan-materiality | 18 |
| plays-v1 | 13 |
| preview-hidden-rolls | 7 |
| prose-renderer | 15 |
| refusal-handling | 11 |
| renderer-profile | 112 |
| Total | 195 |

Environment controls:

```text
npx vitest run --configLoader runner \
  tests/unit/vtt/offer-environment.test.ts \
  tests/unit/vtt/offer-environment-identity.test.ts \
  tests/unit/vtt/offer-environment-board-sequence.test.ts

Test Files  3 passed (3)
Tests       15 passed (15)
exit 0
```

Discovery:

```text
npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b8-after.json
rows=643
fixturePaths=0
```

Static checks:

```text
git diff --check
exit 0
```

Residual search included old factories, `canonicalEngineQueryPort`, ambient resolver, convenience registry/capsule calls, and the obsolete structural type:

```text
rg -n "createLegacyEngineOptionEnvironment|createRevisionBoundEngineOptionEnvironment|\
engineOptionEnvironmentFromBinding|canonicalEngineQueryPort|\bpureTurnProposalResolver\b|\
\bengineActionRegistry\(|\bengineActorOptions\(|\bcreateEngineStateCapsule\(|EngineOptionEnvironment" \
  <the ten B8 files>
```

Output: empty (`rg` exit 1).

Added-line audit:

| File | Maximum added line | Added lines >120 |
|---|---:|---:|
| monster-feature-support | 100 | 0 |
| monster-omitted-riders | 100 | 0 |
| offered-option-paths | 109 | 0 |
| option-outcome | 106 | 0 |
| plan-materiality | 100 | 0 |
| plays-v1 | 100 | 0 |
| preview-hidden-rolls | 100 | 0 |
| prose-renderer | 100 | 0 |
| refusal-handling | 100 | 0 |
| renderer-profile | 100 | 0 |

Integrity:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
```

Final `git status --short --untracked-files=all`:

```text
 M tests/unit/vtt/monster-feature-support.test.ts
 M tests/unit/vtt/monster-omitted-riders.test.ts
 M tests/unit/vtt/offered-option-paths.test.ts
 M tests/unit/vtt/option-outcome.test.ts
 M tests/unit/vtt/plan-materiality.test.ts
 M tests/unit/vtt/plays-v1.test.ts
 M tests/unit/vtt/preview-hidden-rolls.test.ts
 M tests/unit/vtt/prose-renderer.test.ts
 M tests/unit/vtt/refusal-handling.test.ts
 M tests/unit/vtt/renderer-profile.test.ts
```

S3 B8 DONE
diff --git a//tmp/s3-b6-forward-overlay.mjs b//tmp/s3-b6-forward-overlay.mjs
index f52b32c71c2f9561ebaa6cd5d939a5bb8e6f2c2e..47a56d5164e30dbf1566712e98c910990162aba3
--- a//tmp/s3-b6-forward-overlay.mjs
+++ b//tmp/s3-b6-forward-overlay.mjs
@@ -4,16 +4,16 @@
 
 const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
 const group = [
-  'tests/unit/vtt/engine-query-port.test.ts',
-  'tests/unit/vtt/engine-round-session.test.ts',
-  'tests/unit/vtt/engine-state-capsule.test.ts',
-  'tests/unit/vtt/footprint-increment-four.test.ts',
-  'tests/unit/vtt/footprint-increment-three.test.ts',
-  'tests/unit/vtt/hidden-option-boundary.test.ts',
-  'tests/unit/vtt/hypnotic-pattern-probe.test.ts',
-  'tests/unit/vtt/last-seen.test.ts',
-  'tests/unit/vtt/local-session-store.test.ts',
-  'tests/unit/vtt/mixed-kind-multiattack.test.ts',
+  'tests/unit/vtt/monster-feature-support.test.ts',
+  'tests/unit/vtt/monster-omitted-riders.test.ts',
+  'tests/unit/vtt/offered-option-paths.test.ts',
+  'tests/unit/vtt/option-outcome.test.ts',
+  'tests/unit/vtt/plan-materiality.test.ts',
+  'tests/unit/vtt/plays-v1.test.ts',
+  'tests/unit/vtt/preview-hidden-rolls.test.ts',
+  'tests/unit/vtt/prose-renderer.test.ts',
+  'tests/unit/vtt/refusal-handling.test.ts',
+  'tests/unit/vtt/renderer-profile.test.ts',
 ];
 const virtual = new Map();
 
diff --git a/src/combat/visibility.ts b/src/combat/visibility.ts
index dd011d750bee53b90e6be41349359e1fc70256e9..0d4a59e10447e11b7049be6f983969105f04b8b0
--- a/src/combat/visibility.ts
+++ b/src/combat/visibility.ts
@@ -447,7 +447,7 @@
     }
     if (event.type === 'attack_resolved') {
       if (!eventCombatants(event).every((id) => visibleIds.has(id))) return [];
-      return hiddenRolls.has('monster_attack_rolls') && monsterIds.has(event.actor)
+      return hiddenRolls.has('monster_saving_throws') && monsterIds.has(event.actor)
         ? [{
             sequence: event.sequence,
             type: event.type,
diff --git a/src/vtt/intel/option-outcome.ts b/src/vtt/intel/option-outcome.ts
index d30b6caabeabe2f667e5e75040112c23d921041d..f28db0ffa88d3ec5775d8dbaa8a057681f142fa3
--- a/src/vtt/intel/option-outcome.ts
+++ b/src/vtt/intel/option-outcome.ts
@@ -1222,7 +1222,7 @@
       expectedInitiallyAffected: expectedAffectedCount(toExact(hostileBurden.expectedInitial)),
       expectedDisabledTurns: expectedDisabledTurns(toExact(hostileBurden.disabled)),
       expectedWakeActions: expectedWakeActions(toExact(hostileBurden.wake)),
-      expectedControlBurden: actionEquivalents(toExact(subtract(hostileTotal, friendlyTotal))),
+      expectedControlBurden: actionEquivalents(toExact(subtract(friendlyTotal, hostileTotal))),
       horizon: controlHorizonRounds(horizon),
       wakeReachability: hostileReachability,
       concentrationExposure: concentration.exposure,
diff --git a/src/vtt/monster-feature-support.ts b/src/vtt/monster-feature-support.ts
index 9a7bb9b958823ebfe699bdc2d91860d151099d1e..1dfff733518246c2b4e82430824ce15a568c8469
--- a/src/vtt/monster-feature-support.ts
+++ b/src/vtt/monster-feature-support.ts
@@ -174,7 +174,7 @@
       case 'always': return [];
       case 'attack_roll_advantage':
       case 'replaces_base_when_target_bloodied': return [{
-        ...identity, kind: 'conditional_damage_trigger', trigger: term.trigger.kind,
+        ...identity, kind: 'conditional_damage_trigger', trigger: 'charge',
       }];
       case 'charge': return [{ ...identity, kind: 'conditional_damage_trigger', trigger: 'charge' }];
     }
diff --git a/src/vtt/offered-option-paths.ts b/src/vtt/offered-option-paths.ts
index 0890609ac3ffc78f6f76c444558f4796d403715f..2c0496b107ab9efc61206f810d353eefacd9d4a2
--- a/src/vtt/offered-option-paths.ts
+++ b/src/vtt/offered-option-paths.ts
@@ -167,7 +167,7 @@
         }
         return [];
       }
-      if (resolution.mechanics.path.length === 0) return [];
+      if (resolution.mechanics.path.length >= 0) return [];
       const command = {
         type: 'move' as const,
         actor: actor.actorId,
diff --git a/src/vtt/plan-materiality.ts b/src/vtt/plan-materiality.ts
index 876acf34243308045d9920fbe696c796743b5f40..519bad07171776f1785e0b2f9007032046eb77b9
--- a/src/vtt/plan-materiality.ts
+++ b/src/vtt/plan-materiality.ts
@@ -230,7 +230,7 @@
   if (after.record.relevantTurnEvents.some((event) => event.kind === 'concentration_broken')) reasons.push('CONCENTRATION_BROKEN');
   const relevantIds = new Set([...beforeCombatants.keys(), ...afterCombatants.keys()]);
   if (after.record.relevantTurnEvents.some((event) => event.kind === 'forced_displacement' &&
-    event.distanceFeet >= 10 && relevantIds.has(event.combatantId))) reasons.push('FORCED_DISPLACEMENT_AT_LEAST_10_FEET');
+    event.distanceFeet >= 11 && relevantIds.has(event.combatantId))) reasons.push('FORCED_DISPLACEMENT_AT_LEAST_10_FEET');
   if ([...beforeCombatants].some(([id, combatant]) => combatant.boardPresent &&
     afterCombatants.get(id)?.boardPresent !== true)) reasons.push('RELEVANT_COMBATANT_DISAPPEARED');
   const afterZones = new Map(after.record.referencedSemanticZones.map((zone) => [zone.zoneId, zone.active] as const));
diff --git a/src/vtt/refusal-handling.ts b/src/vtt/refusal-handling.ts
index 959f22df234cd0383dec9b2d4706fd220f66d335..2e048b0c812d6aa01e76d765b99012d9342bb571
--- a/src/vtt/refusal-handling.ts
+++ b/src/vtt/refusal-handling.ts
@@ -30,7 +30,7 @@
 export const REFUSAL_CATEGORY_DEFINITIONS = {
   rule_gap: {
     defaultResolution: {
-      documentation: 'Assumed the action has no mechanical effect because the required rule is not modeled.',
+      documentation: 'The action has no mechanical effect.',
       outcome: { kind: 'no_effect' },
     },
   },
diff --git a/src/vtt/renderer-profile.ts b/src/vtt/renderer-profile.ts
index 59f309bfdab16ad3fa187ca5c86516cb169e79c1..79e24c24d84cebfcbc88ec6df2913bbe253fa3c9
--- a/src/vtt/renderer-profile.ts
+++ b/src/vtt/renderer-profile.ts
@@ -760,7 +760,7 @@
   }
   if (profile.attribution === 'stamped') {
     context['renderer_attribution'] = rendererAttributionSchema.parse({
-      policy_version: RENDERER_POLICY_VERSION,
+      policy_version: 'mutated-renderer-policy',
     });
   } else {
     delete context['renderer_attribution'];
diff --git a/src/vtt/snippets/registry.ts b/src/vtt/snippets/registry.ts
index b01cb299fbaff641faede6dd1f6536363ceba149..849b31d2d4127bb5be4fb155ca058b5897001802
--- a/src/vtt/snippets/registry.ts
+++ b/src/vtt/snippets/registry.ts
@@ -355,7 +355,7 @@
     }
     if (actor.life === 'dead') issues.push('ACTOR_NOT_LIVING');
     const primary = actor.options.find((option) => option.optionId === proposal.primaryOptionId);
-    if (primary === undefined) issues.push('PRIMARY_OPTION_NOT_PROJECTED');
+    if (primary === undefined) issues.push('FALLBACK_OPTION_NOT_PROJECTED');
     else if (primary.revision !== proposal.expectedRevision) issues.push('PRIMARY_REVISION_MISMATCH');
     if (proposal.fallbackOptionId === proposal.primaryOptionId) issues.push('FALLBACK_EQUALS_PRIMARY');
     if (proposal.fallbackOptionId !== null) {
diff --git a/tests/unit/vtt/monster-feature-support.test.ts b/tests/unit/vtt/monster-feature-support.test.ts
index 54ba35db094a52656296e8246ea09a1b5f67b6fc..50c6a04440987ca0f2a390d3fd4a0d16259fa863
--- a/tests/unit/vtt/monster-feature-support.test.ts
+++ b/tests/unit/vtt/monster-feature-support.test.ts
@@ -8,7 +8,6 @@
   exactDmIntelMatrix,
   renderDmIntelRow,
 } from '../../../src/vtt/dm-tactical-intel';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import {
   monsterTraitSupportRows,
   monsterTraitSupportDisposition,
@@ -21,8 +20,11 @@
   loadArenaFixture,
 } from '../../../src/vtt/mcp/entrypoint';
 import { generateRoom } from '../../../src/vtt/room-generator';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { placedToken, playerProfile } from '../combat/fixtures';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 const DISPOSITIONS = [
   'modeled',
   'offered_with_omission',
@@ -67,11 +69,14 @@
       disposition: { kind: 'encounter_not_applicable', reason: 'no_sunlight_state' },
     });
 
-    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [wight.id] });
+    const runtime = createEngineMcpRuntime(state, {
+      requestedActorIds: [wight.id],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const intel = exactDmIntelMatrix(
       state,
       runtime.feed.current(),
-      canonicalEngineQueryPort,
+      OFFER_ENVIRONMENT.queries,
       [wight.id],
     );
     expect(intel.length).toBeGreaterThan(0);
diff --git a/tests/unit/vtt/monster-omitted-riders.test.ts b/tests/unit/vtt/monster-omitted-riders.test.ts
index 0ce63e2d39c91e5d28f109a940abb7321fad92b6..96b18299154c7f20b4b399505239e49025d372e9
--- a/tests/unit/vtt/monster-omitted-riders.test.ts
+++ b/tests/unit/vtt/monster-omitted-riders.test.ts
@@ -11,9 +11,12 @@
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
 import { placedToken, playerProfile } from '../combat/fixtures';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 function record(value: unknown): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
     throw new TypeError('Expected an object.');
@@ -40,7 +43,7 @@
 function optionUsing(state: EncounterState, actionId: string): EngineOfferableOption {
   const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
   if (actorId === undefined) throw new Error('Rider fixture omitted its monster.');
-  const option = availableEngineActorOptions(state, actorId).find((candidate) =>
+  const option = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).find((candidate) =>
     candidate.actionSlots.some((slot) => slot.use.kind === 'attack'
       ? slot.use.actionId === actionId
       : slot.use.kind === 'saving_throw'
@@ -61,7 +64,7 @@
       componentActionId: 'scimitar',
       trigger: 'attack_roll_advantage',
     }]);
-    expect(resolveEngineActorOption(state, option).valid).toBe(true);
+    expect(resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid).toBe(true);
   });
 
   it.each([
@@ -72,7 +75,7 @@
     const state = encounter(statblock);
     const option = optionUsing(state, actionId);
     expect(new Set(option.omittedRiders.map((rider) => rider.kind))).toEqual(new Set(requiredKinds));
-    expect(resolveEngineActorOption(state, option).valid).toBe(true);
+    expect(resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid).toBe(true);
   });
 
   it('flags homebrew crest and raking charge riders from their typed declarations', () => {
@@ -101,7 +104,7 @@
         relatedActionId: 'unsettling-visage',
       }),
     ]));
-    expect(resolveEngineActorOption(state, option).valid).toBe(true);
+    expect(resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid).toBe(true);
   });
 
   it('omits delayed Zombie creation while preserving Life Drain damage and maximum-HP reduction', () => {
@@ -113,7 +116,7 @@
       targetKind: 'Humanoid',
       delayHours: 24,
     }));
-    const resolution = resolveEngineActorOption(state, option);
+    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
     expect(resolution.valid).toBe(true);
     if (!resolution.valid) throw new Error('Life Drain base effect did not resolve.');
     expect(resolution.mechanics.omittedRiders).toEqual(option.omittedRiders);
@@ -123,7 +126,10 @@
     const state = encounter(GOBLIN_WARRIOR);
     const actorId = state.combatants.find((candidate) => candidate.profile.kind === 'monster')?.profile.id;
     if (actorId === undefined) throw new Error('Rider surface fixture omitted its actor.');
-    const runtime = createEngineMcpRuntime(state, { requestedActorIds: [actorId] });
+    const runtime = createEngineMcpRuntime(state, {
+      requestedActorIds: [actorId],
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const capsule = runtime.feed.current();
     const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
       run_id: capsule.runId,
@@ -144,6 +150,7 @@
         rare: 'always', misc: 'separate', shortlist: 'all', optionDetail: 'full', nullFields: 'explicit',
         attribution: 'off',
       },
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const proseCapsule = proseRuntime.feed.current();
     const prose = record(proseRuntime.toolSurface.execute('engine.get_turn_context', {
@@ -154,7 +161,7 @@
     }));
     expect(String(prose['document'])).toContain('Omitted rider beside scimitar: conditional damage trigger');
 
-    const human = projectHumanEngineOptions(state, [actorId])[0];
+    const human = projectHumanEngineOptions(state, [actorId], state.revision, OFFER_ENVIRONMENT)[0];
     expect(human?.options.find((entry) => entry.option.label.startsWith('Scimitar'))?.label)
       .toContain('scimitar: conditional attack roll advantage damage is not executed');
   });
diff --git a/tests/unit/vtt/offered-option-paths.test.ts b/tests/unit/vtt/offered-option-paths.test.ts
index f4ff97f5485cd50d15ff1367daa5d3ef5121dae3..a98787cb5a318b8e065ebd34188cff5f86237794
--- a/tests/unit/vtt/offered-option-paths.test.ts
+++ b/tests/unit/vtt/offered-option-paths.test.ts
@@ -14,6 +14,7 @@
 import { projectEncounterBoard } from '../../../src/vtt/encounter-board';
 import { renderBoard } from '../../../src/vtt/encounter-app';
 import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   boardPathSummary,
   offeredOptionPaths,
@@ -29,6 +30,8 @@
 import { createOptionPathFixtureEncounter } from '../../fixtures/vtt-option-path-encounter';
 import { placedToken, playerProfile } from '../combat/fixtures';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 function face(value: number): () => number {
   return () => (value - 0.5) / 20;
 }
@@ -102,10 +105,10 @@
     persistentAreas: [damagingArea(actor.id)],
     nextPersistentAreaSequence: 2,
   };
-  const options = orderOptionsAsTurnContext(availableEngineActorOptions(state, actor.id));
+  const options = orderOptionsAsTurnContext(availableEngineActorOptions(state, actor.id, OFFER_ENVIRONMENT));
   return {
     state,
-    paths: offeredOptionPaths(state, [{ actorId: actor.id, options }]),
+    paths: offeredOptionPaths(state, [{ actorId: actor.id, options }], OFFER_ENVIRONMENT),
     actorId: actor.id,
     reactorId: reactor.id,
   };
diff --git a/tests/unit/vtt/option-outcome.test.ts b/tests/unit/vtt/option-outcome.test.ts
index 1757189631ecabf50ef406b908e5f16865768092..e223da21199bb4e150089a6748bb9f8cee728da0
--- a/tests/unit/vtt/option-outcome.test.ts
+++ b/tests/unit/vtt/option-outcome.test.ts
@@ -1,7 +1,6 @@
 import { describe, expect, it } from 'vitest';
 import { combatantId, difficultyClass } from '../../../src/combat/values';
 import { savingThrowOutcomeWeights } from '../../../src/combat/resolution';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
 import {
   evaluateOptionOutcome,
@@ -11,9 +10,11 @@
   type DamageOutcomeEvidence,
 } from '../../../src/vtt/intel/option-outcome';
 import { freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const FIXTURE = 'tests/fixtures/arena-scenarios/hypnotic-pattern-cc.json';
 const CASTER = combatantId('combatant:d432-incubus');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 describe('D436 exact option outcome evaluator', () => {
   it('uses canonical normal, advantage, and disadvantage save-face weights', () => {
@@ -68,13 +69,13 @@
 
   it('matches the complete Hypnotic Pattern control oracle exactly', async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const option = availableEngineActorOptions(state, CASTER).find((candidate) =>
+    const option = availableEngineActorOptions(state, CASTER, OFFER_ENVIRONMENT).find((candidate) =>
       candidate.actionSlots.some((slot) => slot.use.kind === 'cast_spell' && slot.use.spellId === 'hypnotic-pattern'));
     if (option === undefined) throw new Error('Hypnotic Pattern option is absent.');
-    const resolution = resolveEngineActorOption(state, option);
+    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
     if (!resolution.valid) throw new Error(resolution.summary);
 
-    const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, canonicalEngineQueryPort);
+    const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, OFFER_ENVIRONMENT.queries);
 
     expect(outcome).toMatchObject({
       status: 'resolved',
@@ -123,15 +124,15 @@
 
   it('uses the exact full-sequence damage distribution for Restless Touch pressure', async () => {
     const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
-    const option = availableEngineActorOptions(state, CASTER).find((candidate) =>
+    const option = availableEngineActorOptions(state, CASTER, OFFER_ENVIRONMENT).find((candidate) =>
       candidate.actionSlots.some((slot) => slot.use.kind === 'multiattack' &&
         slot.use.components.every((component) => component.actionId === 'restless-touch' &&
           component.target.kind === 'combatant' && component.target.combatantId === 'combatant:d432-wizard')));
     if (option === undefined) throw new Error('Restless Touch option is absent.');
-    const resolution = resolveEngineActorOption(state, option);
+    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
     if (!resolution.valid) throw new Error(resolution.summary);
 
-    const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, canonicalEngineQueryPort);
+    const outcome = evaluateOptionOutcome(state, option, resolution.mechanics, OFFER_ENVIRONMENT.queries);
 
     expect(outcome).toMatchObject({
       status: 'resolved',
diff --git a/tests/unit/vtt/plan-materiality.test.ts b/tests/unit/vtt/plan-materiality.test.ts
index 814840fd359efdc144ce4dff8bd1202351a61752..e6b17dc6bdd001bb905c87026f8c93e6bd54b7da
--- a/tests/unit/vtt/plan-materiality.test.ts
+++ b/tests/unit/vtt/plan-materiality.test.ts
@@ -3,6 +3,7 @@
 import { combatantId, engineZoneId } from '../../../src/combat/values';
 import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
 import { freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   comparePlanRelevanceSnapshots,
   createPlanRelevanceRecord,
@@ -17,6 +18,7 @@
 const player = combatantId('combatant:materiality-player');
 const other = combatantId('combatant:materiality-other');
 const zone = engineZoneId('zone:materiality-anchor');
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 function record(): PlanRelevanceRecord {
   return {
@@ -172,7 +174,7 @@
     const actor = beforeState.combatants.find((candidate) => candidate.profile.kind === 'monster');
     const target = beforeState.combatants.find((candidate) => candidate.profile.kind === 'player_character');
     if (actor === undefined || target === undefined) throw new Error('Fixture lacks materiality actors.');
-    const option = availableEngineActorOptions(beforeState, actor.profile.id)
+    const option = availableEngineActorOptions(beforeState, actor.profile.id, OFFER_ENVIRONMENT)
       .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
     if (option === undefined) throw new Error('Fixture lacks a Dodge option.');
     const afterState: EncounterState = {
@@ -183,6 +185,7 @@
           : combatant),
     };
     const context = {
+      offerEnvironment: OFFER_ENVIRONMENT,
       openMonsterActorIds: [actor.profile.id],
       remainingOptions: [option],
       explicitEngagementAnchors: [{ kind: 'combatant', combatantId: target.profile.id }],
@@ -215,17 +218,19 @@
     const state = freshMonsterPlanningState(await loadArenaFixture('tests/fixtures/arena-basis/seed-3943001.json'));
     const actor = state.combatants.find((candidate) => candidate.profile.kind === 'monster');
     if (actor === undefined) throw new Error('Fixture lacks a monster.');
-    const option = availableEngineActorOptions(state, actor.profile.id)
+    const option = availableEngineActorOptions(state, actor.profile.id, OFFER_ENVIRONMENT)
       .find((candidate) => candidate.actionSlots.some((slot) => slot.use.kind === 'dodge'));
     if (option === undefined) throw new Error('Fixture lacks a Dodge option.');
 
     const first = createPlanRelevanceRecord({
       state,
+      offerEnvironment: OFFER_ENVIRONMENT,
       openMonsterActorIds: [actor.profile.id, actor.profile.id],
       remainingOptions: [option],
     });
     const second = createPlanRelevanceRecord({
       state,
+      offerEnvironment: OFFER_ENVIRONMENT,
       openMonsterActorIds: [actor.profile.id],
       remainingOptions: [option],
     });
diff --git a/tests/unit/vtt/plays-v1.test.ts b/tests/unit/vtt/plays-v1.test.ts
index 25e4e50a2b3e4c25fbbedfadfd177d834eb5bdc9..50b1d48d64b1b4930dad35ee70232514bb3b1fe1
--- a/tests/unit/vtt/plays-v1.test.ts
+++ b/tests/unit/vtt/plays-v1.test.ts
@@ -8,7 +8,7 @@
   type CombatantId,
 } from '../../../src/combat/values';
 import {
-  createEngineStateCapsule,
+  createEngineStateCapsuleForEnvironment,
   type EngineDmProjection,
   type EngineProjectionCombatant,
   type EngineStateCapsule,
@@ -25,6 +25,9 @@
   type EngineOfferableOption,
   type EngineTurnProposal,
 } from '../../../src/vtt/turn-proposal';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const BRUTE = combatantId('combatant:brute');
 const ARCHER = combatantId('combatant:archer');
@@ -142,7 +145,7 @@
     ],
     semanticZones: [],
   };
-  return createEngineStateCapsule({
+  return createEngineStateCapsuleForEnvironment({
     runId: encounterSessionId('session:plays-v1'),
     branchId: encounterBranchId('branch:plays-v1'),
     revision: 7,
@@ -155,6 +158,7 @@
       actors: [BRUTE, ARCHER],
     },
     projection,
+    offerEnvironment: OFFER_ENVIRONMENT.binding,
   });
 }
 
@@ -241,13 +245,14 @@
   it('keeps the core skill always on and rejects situation skills when their plays do not apply', () => {
     const capsule = handBuiltCapsule();
     if (capsule.request === null) throw new TypeError('Hand-built request is absent.');
-    const correction = createEngineStateCapsule({
+    const correction = createEngineStateCapsuleForEnvironment({
       runId: capsule.runId,
       branchId: capsule.branchId,
       revision: capsule.revision + 1,
       generatedAt: capsule.generatedAt,
       request: { ...capsule.request, phase: 'correction', correctionNumber: 1 },
       projection: capsule.projection,
+      offerEnvironment: capsule.offerEnvironment,
     });
     expect(SNIPPET_REGISTRY.applicableSkills(correction).map((skill) => skill.name))
       .toEqual(['core_tactics']);
diff --git a/tests/unit/vtt/preview-hidden-rolls.test.ts b/tests/unit/vtt/preview-hidden-rolls.test.ts
index 3ecbf304ecaf8315be20f52f1fea4f1743e339c6..8b6216af6213f75dab6a6c99697387fac950d437
--- a/tests/unit/vtt/preview-hidden-rolls.test.ts
+++ b/tests/unit/vtt/preview-hidden-rolls.test.ts
@@ -35,6 +35,9 @@
   MemoryBrowserSessionStore,
   MemoryMirrorSink,
 } from '../../../src/vtt/session-persistence';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const IDLE: PersistedCoordinatorState = {
   requestSequence: 1,
@@ -198,6 +201,7 @@
         generation: 0,
       }],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const player = projectPlayerBoard(projectPlayerView(fixture.state, {
       seatId: 'seat:movement-danger',
@@ -262,6 +266,7 @@
       coordinator: IDLE,
       controllers: [],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const playerAttack = player.events.find((event) => event.type === 'attack_resolved');
     const dmAttack = dm.encounter.recentEvents.find((event) => event.type === 'attack_resolved');
diff --git a/tests/unit/vtt/prose-renderer.test.ts b/tests/unit/vtt/prose-renderer.test.ts
index 21b549a663ca47a979e2f12eb3a83f0ef8a1c799..f338dbee83edae8ae10331ceacbbb430e00ec9de
--- a/tests/unit/vtt/prose-renderer.test.ts
+++ b/tests/unit/vtt/prose-renderer.test.ts
@@ -2,6 +2,7 @@
 import { encounterSessionId } from '../../../src/combat/values';
 import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
 import { ENGINE_TOOL_SPECS, schemaViolations } from '../../../src/vtt/mcp/schemas';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   DEFAULT_RENDERER_PROFILE,
   PLANNED_COMBINED_RENDERER_PROFILES,
@@ -12,6 +13,14 @@
 
 const FIXTURE = 'tests/fixtures/arena-basis-brutal/seed-6203001.json';
 const PROSE_FORMATS = ['caveman_prose', 'regular_prose'] as const;
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function createBoundEngineMcpRuntime(
+  state: Parameters<typeof createEngineMcpRuntime>[0],
+  options: Omit<NonNullable<Parameters<typeof createEngineMcpRuntime>[1]>, 'offerEnvironment'> = {},
+): ReturnType<typeof createEngineMcpRuntime> {
+  return createEngineMcpRuntime(state, { ...options, offerEnvironment: OFFER_ENVIRONMENT });
+}
 
 function object(value: unknown, label = 'value'): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
@@ -145,8 +154,8 @@
     const loaded = await loadArenaFixture(FIXTURE);
     const state = freshMonsterPlanningState(loaded);
     const runId = encounterSessionId('encounter:prose-default-proof');
-    const incumbent = turnContext(createEngineMcpRuntime(state, { runId, revision: 1 }));
-    const explicit = turnContext(createEngineMcpRuntime(state, {
+    const incumbent = turnContext(createBoundEngineMcpRuntime(state, { runId, revision: 1 }));
+    const explicit = turnContext(createBoundEngineMcpRuntime(state, {
       runId, revision: 1, rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
     }));
     expect(JSON.stringify(explicit)).toBe(JSON.stringify(incumbent));
@@ -159,11 +168,11 @@
     const loaded = await loadArenaFixture(FIXTURE);
     const state = freshMonsterPlanningState(loaded);
     const runId = encounterSessionId(`encounter:prose-round-trip:${format}`);
-    const structured = turnContext(createEngineMcpRuntime(state, {
+    const structured = turnContext(createBoundEngineMcpRuntime(state, {
       runId, revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
     }));
-    const proseRuntime = createEngineMcpRuntime(state, {
+    const proseRuntime = createBoundEngineMcpRuntime(state, {
       runId, revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
     });
@@ -226,7 +235,7 @@
     const loaded = await loadArenaFixture(FIXTURE);
     const state = freshMonsterPlanningState(loaded);
     const runId = encounterSessionId(`encounter:prose-completeness:${format}`);
-    const structured = turnContext(createEngineMcpRuntime(state, {
+    const structured = turnContext(createBoundEngineMcpRuntime(state, {
       runId, revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
       turnContextMaximumBytes: 10 * 1024 * 1024,
@@ -246,7 +255,7 @@
     const state = freshMonsterPlanningState(loaded);
     const runId = encounterSessionId(`encounter:prose-compose:${format}`);
     const filtered = renderTurnContextProfile(
-      turnContext(createEngineMcpRuntime(state, { runId, revision: 1 })),
+      turnContext(createBoundEngineMcpRuntime(state, { runId, revision: 1 })),
       { ...PLANNED_COMBINED_RENDERER_PROFILES.compact, format: 'structured' },
     );
     const expectedIds = new Set(filtered.optionRefs.values());
@@ -262,7 +271,7 @@
 
   it('renders resolved last-seen knowledge as one plain sentence', async () => {
     const loaded = await loadArenaFixture(FIXTURE);
-    const structured = turnContext(createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
+    const structured = turnContext(createBoundEngineMcpRuntime(freshMonsterPlanningState(loaded), {
       runId: encounterSessionId('encounter:prose-last-seen'), revision: 1,
     }));
     const filtered = renderTurnContextProfile(structured, {
@@ -291,7 +300,7 @@
   it.each(PROSE_FORMATS)('%s trims by relevance, preserves the K-set floor, and remains schema-valid', async (format) => {
     const loaded = await loadArenaFixture(FIXTURE);
     let evidence: { readonly preTrimBytes: number; readonly postTrimBytes: number } | undefined;
-    const runtime = createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
+    const runtime = createBoundEngineMcpRuntime(freshMonsterPlanningState(loaded), {
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
       turnContextMaximumBytes: 4 * 1024,
       onTurnContextRendered: (value) => { evidence = value; },
@@ -302,7 +311,7 @@
     expect(context['context_trimmed']).toBe(true);
     expect(context['truncated']).toBe(true);
     expect(evidence?.preTrimBytes).toBeGreaterThan(evidence?.postTrimBytes ?? 0);
-    const fullRuntime = createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
+    const fullRuntime = createBoundEngineMcpRuntime(freshMonsterPlanningState(loaded), {
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format: 'structured' },
     });
     const full = turnContext(fullRuntime);
@@ -331,11 +340,11 @@
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
       turnContextMaximumBytes: 32 * 1024,
     } as const;
-    const first = turnContext(createEngineMcpRuntime(state, {
+    const first = turnContext(createBoundEngineMcpRuntime(state, {
       ...options,
       onTurnContextRendered: (value) => { firstEvidence = value; },
     }));
-    const second = turnContext(createEngineMcpRuntime(state, options));
+    const second = turnContext(createBoundEngineMcpRuntime(state, options));
     expect(JSON.stringify(second)).toBe(JSON.stringify(first));
     const documentBytes = new TextEncoder().encode(String(first['document'])).byteLength;
     expect(firstEvidence?.preTrimBytes).toBeGreaterThanOrEqual(documentBytes);
@@ -345,7 +354,7 @@
   it('keeps both prose registers distinct while using the same content pipeline', async () => {
     const loaded = await loadArenaFixture(FIXTURE);
     const state = freshMonsterPlanningState(loaded);
-    const render = (format: ProseRendererFormat) => turnContext(createEngineMcpRuntime(state, {
+    const render = (format: ProseRendererFormat) => turnContext(createBoundEngineMcpRuntime(state, {
       runId: encounterSessionId('encounter:prose-registers'), revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
       turnContextMaximumBytes: 32 * 1024,
@@ -359,7 +368,7 @@
 
   it.each(PROSE_FORMATS)('%s opens tactically, keeps bookkeeping in the footer, and has clean sentences', async (format) => {
     const loaded = await loadArenaFixture(FIXTURE);
-    const context = turnContext(createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
+    const context = turnContext(createBoundEngineMcpRuntime(freshMonsterPlanningState(loaded), {
       runId: encounterSessionId(`encounter:prose-style:${format}`),
       revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
diff --git a/tests/unit/vtt/refusal-handling.test.ts b/tests/unit/vtt/refusal-handling.test.ts
index 3f8450298d49c50a1bfb98dde900ae9468c0fc0a..27f5f6265e7eeb154ca10e6c103e2d429cc7ce30
--- a/tests/unit/vtt/refusal-handling.test.ts
+++ b/tests/unit/vtt/refusal-handling.test.ts
@@ -23,6 +23,9 @@
   referenceEncounterSetup,
 } from '../../../src/vtt/reference-encounter';
 import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 function party(settings: RefusalHandlingSettings = DEFAULT_REFUSAL_HANDLING_SETTINGS): PartySessionState {
   const hitPoints = [67, 52, 38] as const;
@@ -143,6 +146,7 @@
       initialState: initiativeState(),
       initialPartyState: party({ ...DEFAULT_REFUSAL_HANDLING_SETTINGS, rule_gap: 'tray_fiat_prompt' }),
       turnLegalActions: () => ({ actions: [action] }),
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     try {
       await submitOnlyAction(host, action);
@@ -173,6 +177,7 @@
       initialState: initiativeState(),
       initialPartyState: party(),
       turnLegalActions: () => ({ actions: [action] }),
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     try {
       await submitOnlyAction(host, action);
@@ -195,6 +200,7 @@
       initialState: initiativeState(),
       initialPartyState: party({ ...DEFAULT_REFUSAL_HANDLING_SETTINGS, rule_gap: 'default_and_log' }),
       turnLegalActions: () => ({ actions: [action] }),
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     try {
       await submitOnlyAction(host, action);
@@ -210,11 +216,16 @@
 
   it('setting_not_persisted: per-category settings survive host resume', async () => {
     const store = new MemoryBrowserSessionStore();
-    const first = new DmEncounterHost('session:refusal-persist', store, { initialPartyState: party() });
+    const first = new DmEncounterHost('session:refusal-persist', store, {
+      initialPartyState: party(),
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     await first.setRefusalHandling('rule_gap', 'tray_fiat_prompt');
     await first.setRefusalHandling('unmodeled_interaction', 'default_and_log');
     first.close();
-    const resumed = new DmEncounterHost('session:refusal-persist', store);
+    const resumed = new DmEncounterHost('session:refusal-persist', store, {
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     expect(resumed.snapshot().dm.partySession?.state.refusalHandling).toEqual({
       rule_gap: 'tray_fiat_prompt',
       unmodeled_interaction: 'default_and_log',
@@ -269,6 +280,7 @@
       initialState: blocked,
       initialPartyState: party(allTray),
       turnLegalActions: () => ({ actions: [action] }),
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     try {
       await submitOnlyAction(host, action);
diff --git a/tests/unit/vtt/renderer-profile.test.ts b/tests/unit/vtt/renderer-profile.test.ts
index 304fb3a4f91f763f07a193e544fa184b9e069752..7e7ef7e8f21cb0eac15dde982767755f9cca58c3
--- a/tests/unit/vtt/renderer-profile.test.ts
+++ b/tests/unit/vtt/renderer-profile.test.ts
@@ -28,14 +28,23 @@
 import { engineSchemaInternals } from '../../../src/vtt/mcp/schemas';
 import { applyRoomInitiativeProfile } from '../../../src/vtt/room-generator';
 import { renderTurnContextForDmMode } from '../../../src/vtt/blind-turn-context';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const actorId = combatantId('combatant:renderer-actor');
 const targetId = combatantId('combatant:renderer-target');
 const HARD_FIXTURE_SEEDS = Array.from({ length: 13 }, (_unused, index) => 5_117_001 + index);
 const TURN_CONTEXT_CAPS_KIB = [4, 8, 16, 24, 32, 48, 64] as const;
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 const HARD_FIXTURE_CAP_CASES = HARD_FIXTURE_SEEDS.flatMap((seed) =>
   TURN_CONTEXT_CAPS_KIB.map((capKib) => [seed, capKib] as const));
 
+function createBoundEngineMcpRuntime(
+  state: Parameters<typeof createEngineMcpRuntime>[0],
+  options: Omit<NonNullable<Parameters<typeof createEngineMcpRuntime>[1]>, 'offerEnvironment'> = {},
+): ReturnType<typeof createEngineMcpRuntime> {
+  return createEngineMcpRuntime(state, { ...options, offerEnvironment: OFFER_ENVIRONMENT });
+}
+
 function undefinedValuePaths(value: unknown, path = '$'): readonly string[] {
   if (value === undefined) return [path];
   if (Array.isArray(value)) {
@@ -54,6 +63,7 @@
     applyRoomInitiativeProfile(loaded, 'derived_v1'),
     mulberry32(seed),
     { kind: 'unattended', askDefault: 'decline' },
+    OFFER_ENVIRONMENT,
   );
   const prepared = session.beginRoundWithoutSkipping({
     runId: encounterSessionId(`encounter:renderer-cap-${String(seed)}`),
@@ -68,7 +78,7 @@
   if (request === null || request.phase === 'speculative') {
     throw new Error(`Hard fixture seed ${String(seed)} did not produce an ordinary request.`);
   }
-  const runtime = createEngineMcpRuntime(session.currentState(), {
+  const runtime = createBoundEngineMcpRuntime(session.currentState(), {
     toolProfile: 'dm',
     runId: prepared.snapshot.capsule.runId,
     branchId: prepared.snapshot.capsule.branchId,
@@ -410,7 +420,7 @@
       'tests/fixtures/arena-basis-brutal/seed-6203001.json',
     ));
     const runId = encounterSessionId('encounter:renderer-delta-guard');
-    const baseRuntime = createEngineMcpRuntime(state, {
+    const baseRuntime = createBoundEngineMcpRuntime(state, {
       runId,
       revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, delta: 'guarded' },
@@ -423,7 +433,7 @@
       throw new Error('Delta base is not an object.');
     }
     const oversizedBase = { ...baseValue, actors: [] };
-    const guardedRuntime = createEngineMcpRuntime(state, {
+    const guardedRuntime = createBoundEngineMcpRuntime(state, {
       runId: baseCapsule.runId,
       revision: 2,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, delta: 'guarded' },
@@ -435,7 +445,7 @@
     }) as Readonly<Record<string, unknown>>;
     expect(guarded['granularity']).toBe('full');
 
-    const hashBaseRuntime = createEngineMcpRuntime(state, {
+    const hashBaseRuntime = createBoundEngineMcpRuntime(state, {
       runId: baseCapsule.runId,
       revision: 1,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, anchor: 'hash_only' },
@@ -444,7 +454,7 @@
     const hashBase = hashBaseRuntime.toolSurface.execute('engine.get_turn_context', {
       run_id: hashBaseCapsule.runId, expected_revision: 1, scope: 'round', granularity: 'full',
     }) as Readonly<Record<string, unknown>>;
-    const hashRuntime = createEngineMcpRuntime(state, {
+    const hashRuntime = createBoundEngineMcpRuntime(state, {
       runId: hashBaseCapsule.runId,
       revision: 2,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, anchor: 'hash_only' },
@@ -457,7 +467,7 @@
     expect(hashDelta['granularity']).toBe('turn_delta');
     expect(hashDelta['anchor']).not.toHaveProperty('state_ref');
 
-    const offRuntime = createEngineMcpRuntime(state, {
+    const offRuntime = createBoundEngineMcpRuntime(state, {
       runId: hashBaseCapsule.runId,
       revision: 2,
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, delta: 'off' },
@@ -474,7 +484,7 @@
     const state = freshMonsterPlanningState(await loadArenaFixture(
       'tests/fixtures/arena-basis-brutal/seed-6203004.json',
     ));
-    const runtime = createEngineMcpRuntime(state, {
+    const runtime = createBoundEngineMcpRuntime(state, {
       rendererProfile: { ...DEFAULT_RENDERER_PROFILE, shortlist: 'k2' },
       turnContextMaximumBytes: 4 * 1024,
     });
@@ -497,7 +507,7 @@
   it('matches the hand-computed brutal-room circumstance oracle', async () => {
     const loaded = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json');
     const state = freshMonsterPlanningState(loaded);
-    const runtime = createEngineMcpRuntime(state);
+    const runtime = createBoundEngineMcpRuntime(state);
     const capsule = runtime.feed.current();
     const features = extractCircumstanceFeatures({
       state,
