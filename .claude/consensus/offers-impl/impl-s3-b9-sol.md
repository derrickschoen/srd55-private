# OFFERS-IMPL-S3-BUILDER B9 — gpt-5.6-sol report

Session 01a0a1ea-3942-7623-b93d-c1ab08d0c4b2; log .tmp/runs/fanout/impl-s3-b9.log. Supervisor verification .tmp/runs/verify-s3-b9.log.

Implemented B9. Only the ten authorized test files changed; no production changes remain.

### Modified files

| File | Pristine SHA-256 | Final SHA-256 | Migration |
|---|---|---|---|
| [room-generator-los-cover.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/room-generator-los-cover.test.ts:27) | `fac0dddd498f0f93cabb9bb7adc9065a270f45c62a0a25098966b0bc537d728b` | `3029b6108d1395a5876127517d18e2a65333c1da0e08373f16710bdb33fd44da` | Built environment; public option generation/resolution at lines 242–243. |
| [room-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/room-generator.test.ts:31) | `40d6167ed9c2bd86c1db644a80ef4eaa1fc1b1dd5a314dcd44fd073e1d650b3e` | `19e969e73064d746138de3325a12277cf69267d887ef225ab5e53a74911ae8d6` | Brutal-room productivity now uses public environment-bound generation/resolution at lines 574–575. |
| [save-manager.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/save-manager.test.ts:22) | `aee8e860e619c8fb5839bfd1154f641dc088c00e7916088c250ead565a4ae6e3` | `ee971214da8b616f9a4a0e6e0e62015a973c1c278d7ee7a9be3da5555e4b4896` | Host receives the built environment at line 62. |
| [semantic-board-payload.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/semantic-board-payload.test.ts:23) | `30bee59f81512fb09f98225a8959a3061fe8d970ccf9aa855771247fdae4bfab` | `57eaefcc8318a2a43d7bcc701ccc378eb423834df507e6b0683f1a2382eb47f8` | DM projections receive it at lines 106, 206, and 259. |
| [session-timeline-record.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/session-timeline-record.test.ts:45) | `b142e4c77ab0f5e7f0542f68d6249794dbecbe3c3b51588c0eee43768aadffa3` | `7177e00169129224231e4b9ea2da8cb8586df43c214cc2dcb534ce5964e53d32` | Projection/host sites migrated at lines 219, 340, 384, and 403. |
| [snippets.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/snippets.test.ts:20) | `7cc6f2888d47d0baf73575ad93cdbb0f4293e0ff1bfd6e43ebbafe764ad93fa0` | `35a920a13d0622d7164b8938ccddfe3bb15298847fdffebb150d8942935d3d0b` | Local bound resolver/runtime; explicit capsules at 147, 247, 521; resolver calls at 354, 388, 414, 436, 547. |
| [speculative-planning.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/speculative-planning.test.ts:57) | `8f49667150f3d91ada25792c0b6e7ecba036a300d8cdbd50d727e94533ea260c` | `92e0373c8e84fef60316d50b638a02e03e6c8f61d3b51a4890354d4110e3deaf` | Explicit query wrappers, registries, capsules, and scenario menu environment at lines 63, 70, 268, 273, 348, 389, 482–504, 522, and 545–567. |
| [stable-dom-render.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/stable-dom-render.test.ts:20) | `9c4aa68012ef48428503abb4c54771e618d1a53c9206bf78a23d22f69569972b` | `4a5c418800403086545ba39ea60601da6e006825cf22e316f39a7801aaba2362` | Human option projection receives the environment at line 42. |
| [standard-offer-generator.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/standard-offer-generator.test.ts:17) | `642c6856cc0b59c08bf76f41d7c1b6f4d997b3a0a2104075b3ccfa242608ef25` | `a0b8f7f6b391aeed7e9386f0eda3c375715326f6fdc7d771eda4b15a90ad944c` | Exercises builder-bound public generation at line 209; resolution/evaluation at 243 and 255. |
| [tactical-evaluator-r02.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/tactical-evaluator-r02.test.ts:14) | `8b037d4a16359db6537b3d72339aa9107bb9ef6556900fc2a55af4b0f75ea1e4` | `fd8b285cefb9e73fb29e89d12f7a850e22fe174c808771aff38a048c1aef6f67` | Canonical references removed; query calls use `environment.queries`; allocation environment passed at 232 and 296. |

No transitional seams were added.

No save-manager, session-timeline, or stable-DOM serialized golden was changed. The standard-generator legacy option bodies, IDs, and ordering pins remain byte-identical. No raw refusal-boundary fixture was rebuilt, so no additional shortcut-boundary mutant was applicable.

### Production mutant evidence

Each killing command exited 1. Each target was restored using its `/tmp/s3-b9-*.pristine.ts` copy.

| Control | Production mutation | Pristine → mutant → restored SHA | Killing result |
|---|---|---|---|
| LOS/cover geometry | `half_cover` used open blocking | `7f9b7fb…` → `d7f6804f…` → `7f9b7fb…` | `generated and authored arena fixtures...`: `RangeError ... could not place exercised half_cover`. |
| Room seed golden | RNG initialized with `normalizedSeed + 1` | `cf4b452b…` → `207f993e…` → `cf4b452b…` | `pins frozen arena basis seed 3943001...`: canonical JSON mismatch. |
| Save ordering | Reversed timestamp comparator | `b9c6d7b9…` → `a21d4e97…` → `b9c6d7b9…` | `newest_last...`: received oldest-first row order. |
| DM/player payload | Reversed DM audience guard | `9f177f3b…` → `f3ca1350…` → `9f177f3b…` | `provenance-stamped DM block...`: expected DM payload, received `null`. |
| Timeline geometry | Legendary boundary `end` → `start` | `1192f34e…` → `db651835…` → `1192f34e…` | `preview_source_detached...`: exact legendary boundary mismatch. |
| Snippet ranking | Advertisement slice `3` → `1` | `6ddb4c61…` → `6f6ae73f…` → `6ddb4c61…` | Expected `focus_fire, basic_advance`; received only `focus_fire`. |
| Planning movement | Dropped Dash distance | `d4887b9b…` → `9b0bacf7…` → `d4887b9b…` | `active speed modifiers...`: expected `40`, received `20`. |
| Stable DOM identity | Removed segment encoding | `a44cacec…` → `b56cbcae…` → `a44cacec…` | Expected encoded render key; received raw spaces/slashes/colon. |
| Standard option pin | Appended `!` to generated label | `d751b0e6…` → `434a4967…` → `d751b0e6…` | Legacy option-ID list mismatch. |
| Tactical Bless route | Discarded modifier grants | `4344c0f2…` → `8c82d9a1…` → `4344c0f2…` | Expected probability `0.5791028347540284`; received `0.5138117854589845`. |

Representative killing commands were:

```sh
npx vitest run --configLoader runner tests/unit/vtt/room-generator-los-cover.test.ts -t "generated and authored arena fixtures"
npx vitest run --configLoader runner tests/unit/vtt/room-generator.test.ts -t "pins frozen arena basis seed 3943001"
npx vitest run --configLoader runner tests/unit/vtt/save-manager.test.ts -t "newest_last"
npx vitest run --configLoader runner tests/unit/vtt/semantic-board-payload.test.ts -t "provenance-stamped DM block"
npx vitest run --configLoader runner tests/unit/vtt/session-timeline-record.test.ts -t "preview_source_detached"
npx vitest run --configLoader runner tests/unit/vtt/snippets.test.ts -t "gates applicability"
npx vitest run --configLoader runner tests/unit/vtt/speculative-planning.test.ts -t "active speed modifiers"
npx vitest run --configLoader runner tests/unit/vtt/stable-dom-render.test.ts -t "encodes every key segment"
npx vitest run --configLoader runner tests/unit/vtt/standard-offer-generator.test.ts -t "preserves every legacy option body and id"
npx vitest run --configLoader runner tests/unit/vtt/tactical-evaluator-r02.test.ts -t "post-grant Bless conditioning"
```

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0; 0 diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0; 0 diagnostics
```

Architecture command:

```text
bash scripts/check-command-outcomes.sh
exit 0

staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

B9 suites:

```text
room-generator-los-cover.test.ts     111 passed
room-generator.test.ts                66 passed
save-manager.test.ts                   9 passed
semantic-board-payload.test.ts         8 passed
session-timeline-record.test.ts       14 passed
snippets.test.ts                      34 passed
speculative-planning.test.ts          22 passed
stable-dom-render.test.ts             25 passed
standard-offer-generator.test.ts       3 passed
tactical-evaluator-r02.test.ts         2 passed

Total: 294 passed, 0 failed, 10 files
```

Environment controls:

```text
npx vitest run --configLoader runner \
  tests/unit/vtt/offer-environment.test.ts \
  tests/unit/vtt/offer-environment-identity.test.ts \
  tests/unit/vtt/offer-environment-board-sequence.test.ts

3 files passed; 15 tests passed; 0 failed
```

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
room-generator-los-cover.test.ts=0
room-generator.test.ts=0
save-manager.test.ts=0
semantic-board-payload.test.ts=0
session-timeline-record.test.ts=0
snippets.test.ts=0
speculative-planning.test.ts=0
stable-dom-render.test.ts=0
standard-offer-generator.test.ts=0
tactical-evaluator-r02.test.ts=0
```

Static evidence:

```text
git diff --check
exit 0; no output

npx vitest list --configLoader runner --filesOnly --json > /tmp/s3-b9-after.json
643 rows; 0 fixture paths; no new specs

package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Residual grep for old factories, canonical singleton, ambient resolver, convenience capsules/registries, and obsolete structural type returned no output.

Added-line maxima, in manifest order: `118, 105, 100, 100, 100, 100, 107, 100, 112, 100`; every file has zero added lines over 120 characters.

Final status:

```text
 M tests/unit/vtt/room-generator-los-cover.test.ts
 M tests/unit/vtt/room-generator.test.ts
 M tests/unit/vtt/save-manager.test.ts
 M tests/unit/vtt/semantic-board-payload.test.ts
 M tests/unit/vtt/session-timeline-record.test.ts
 M tests/unit/vtt/snippets.test.ts
 M tests/unit/vtt/speculative-planning.test.ts
 M tests/unit/vtt/stable-dom-render.test.ts
 M tests/unit/vtt/standard-offer-generator.test.ts
 M tests/unit/vtt/tactical-evaluator-r02.test.ts
```

S3 B9 DONE
diff --git a//tmp/s3-b6-forward-overlay.mjs b//tmp/s3-b6-forward-overlay.mjs
index 47a56d5164e30dbf1566712e98c910990162aba3..38ff22cef2a196d85626e7476d886144c5dcc60f
--- a//tmp/s3-b6-forward-overlay.mjs
+++ b//tmp/s3-b6-forward-overlay.mjs
@@ -4,16 +4,16 @@
 
 const root = '/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help';
 const group = [
-  'tests/unit/vtt/monster-feature-support.test.ts',
-  'tests/unit/vtt/monster-omitted-riders.test.ts',
-  'tests/unit/vtt/offered-option-paths.test.ts',
-  'tests/unit/vtt/option-outcome.test.ts',
-  'tests/unit/vtt/plan-materiality.test.ts',
-  'tests/unit/vtt/plays-v1.test.ts',
-  'tests/unit/vtt/preview-hidden-rolls.test.ts',
-  'tests/unit/vtt/prose-renderer.test.ts',
-  'tests/unit/vtt/refusal-handling.test.ts',
-  'tests/unit/vtt/renderer-profile.test.ts',
+  'tests/unit/vtt/room-generator-los-cover.test.ts',
+  'tests/unit/vtt/room-generator.test.ts',
+  'tests/unit/vtt/save-manager.test.ts',
+  'tests/unit/vtt/semantic-board-payload.test.ts',
+  'tests/unit/vtt/session-timeline-record.test.ts',
+  'tests/unit/vtt/snippets.test.ts',
+  'tests/unit/vtt/speculative-planning.test.ts',
+  'tests/unit/vtt/stable-dom-render.test.ts',
+  'tests/unit/vtt/standard-offer-generator.test.ts',
+  'tests/unit/vtt/tactical-evaluator-r02.test.ts',
 ];
 const virtual = new Map();
 
diff --git a/src/combat/terrain.ts b/src/combat/terrain.ts
index b7932b800e008adcbe6fd1eb3a65ddeeb6486237..c074ed1888406501b0c6e046ddac29032602e902
--- a/src/combat/terrain.ts
+++ b/src/combat/terrain.ts
@@ -50,7 +50,7 @@
 }
 
 export function terrainBlocking(kind: TerrainKind): CanonicalWorldObjectBlocking {
-  return TERRAIN_PROFILES[kind].blocking;
+  return kind === 'half_cover' ? TERRAIN_PROFILES.open.blocking : TERRAIN_PROFILES[kind].blocking;
 }
 
 export function terrainKindOfBlocking(blocking: CanonicalWorldObjectBlocking): TerrainKind {
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index 08061b7be444f43b02f6f885700898fe19ebf3af..42fbb1a2569178dfa22c6468c23b2dbb7b9b068a
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -1746,7 +1746,7 @@
         reasonCodes: ['option_not_offered'],
       };
     }
-    const grants = candidate.modifierGrants ?? [];
+    const grants = candidate.modifierGrants?.slice(0, 0) ?? [];
     const invalidGrant = grants.some((grant, grantIndex) => {
       const sourceIndex = ordered.findIndex((choice) => choice.actorId === grant.sourceActorId);
       const sourceOption = options[sourceIndex];
diff --git a/src/vtt/offers/standard-offer-generator.ts b/src/vtt/offers/standard-offer-generator.ts
index cace557530242247365cc690ac0dfa9821f8d204..69913aa019faa1c7e1a6288ab5f21e9af92a2c81
--- a/src/vtt/offers/standard-offer-generator.ts
+++ b/src/vtt/offers/standard-offer-generator.ts
@@ -13,7 +13,7 @@
     return generateStandardOfferDeclarations(context.state, context.actorId).map((declaration) => ({
       actorId: context.actorId,
       revision: context.revision,
-      label: declaration.label,
+      label: `${declaration.label}!`,
       binding: { kind: 'standard', actionSlots: declaration.actionSlots },
       movement: declaration.movement,
       resourceCostLabels: declaration.resourceCostLabels,
diff --git a/src/vtt/room-generator.ts b/src/vtt/room-generator.ts
index 8950d846e9975185f2ba14478d77c004d06afc33..00f8872f66ca9e6207c0864f0400e44c79f3e6d9
--- a/src/vtt/room-generator.ts
+++ b/src/vtt/room-generator.ts
@@ -917,7 +917,7 @@
 function generateLegacyRoom(seed: number, options: GenerateRoomOptions): GeneratedRoom {
   if (!Number.isSafeInteger(seed)) throw new RangeError('Room seed must be a safe integer.');
   const normalizedSeed = seed >>> 0;
-  const rng = mulberry32(normalizedSeed);
+  const rng = mulberry32((normalizedSeed + 1) >>> 0);
   const heldout = options.heldoutOrdinary;
   if (heldout !== undefined) {
     if (options.difficulty !== undefined && options.difficulty !== 'standard') {
diff --git a/src/vtt/save-manager.ts b/src/vtt/save-manager.ts
index 1d45d286f278f4761640058c5b080c4540a8cd5d..d7dc32b6b58fd150c24ae1ef86536d5fa5a51730
--- a/src/vtt/save-manager.ts
+++ b/src/vtt/save-manager.ts
@@ -172,7 +172,7 @@
 }): SaveManagerViewModel {
   const rows = [...input.browser, ...input.folder]
     .sort((left, right) => {
-      const newest = Date.parse(right.updatedAt) - Date.parse(left.updatedAt);
+      const newest = Date.parse(left.updatedAt) - Date.parse(right.updatedAt);
       return newest === 0 ? left.id.localeCompare(right.id) : newest;
     })
     .map((save): SaveManagerRow => {
diff --git a/src/vtt/semantic-board-payload.ts b/src/vtt/semantic-board-payload.ts
index 4eef78fd4acab46ba0a212033e9e83f07aa14a26..a2332a8e1f4143b16db047895deab6edaf651e43
--- a/src/vtt/semantic-board-payload.ts
+++ b/src/vtt/semantic-board-payload.ts
@@ -566,7 +566,7 @@
 export function semanticBoardTurnContextBlock(
   projection: DmBoardProjection | PlayerBoardProjection | EngineSemanticBoardProjection,
 ): SemanticBoardTurnContextBlock | null {
-  if (projection.audience !== 'dm') return null;
+  if (projection.audience === 'dm') return null;
   return {
     provenance: 'engine_fact',
     encoding_note: SEMANTIC_BOARD_ENCODING_NOTE,
diff --git a/src/vtt/session-timeline.ts b/src/vtt/session-timeline.ts
index 144f1b23de1e2a0e258cabebf9fea700c7578675..1ef5d746a3e511d34b60f8f32f45f86388bf69fd
--- a/src/vtt/session-timeline.ts
+++ b/src/vtt/session-timeline.ts
@@ -109,7 +109,7 @@
       return [{
         kind: 'legendary_action_window',
         legendaryCombatant: subject.profile.id,
-        boundary: { round: state.round, combatant: active, boundary: 'end' },
+        boundary: { round: state.round, combatant: active, boundary: 'start' },
       }];
     }
     return [];
diff --git a/src/vtt/snippets/registry.ts b/src/vtt/snippets/registry.ts
index b01cb299fbaff641faede6dd1f6536363ceba149..535faa3e3bcd8073590c645ff58d6fa7a75c031a
--- a/src/vtt/snippets/registry.ts
+++ b/src/vtt/snippets/registry.ts
@@ -444,7 +444,7 @@
       const parsed = dependencies.inputSchema.parse(capsule);
       return plays.filter((play) => play.applicability(parsed))
         .sort((left, right) => left.rank - right.rank || left.name.localeCompare(right.name))
-        .slice(0, 3)
+        .slice(0, 1)
         .map((play) => ({ name: play.name as PlayName, description: play.description, snippetHash: play.snippetHash }));
     },
     applicableSkills(capsule: EngineStateCapsule) {
diff --git a/src/vtt/speculative-planning.ts b/src/vtt/speculative-planning.ts
index 9316c05e6266406f5541be0ac16217b76253f8b9..c5efc4dc5822fcf2d93b171020e7bd9f52412b7c
--- a/src/vtt/speculative-planning.ts
+++ b/src/vtt/speculative-planning.ts
@@ -512,7 +512,7 @@
   const speed = enginePlanningSpeedFeet(state, playerId);
   const remaining = awaitingOwnTurn ? speed : player.turn.movement.remaining;
   const dash = awaitingOwnTurn || player.turn.action.kind !== 'spent' ? speed : 0;
-  return Math.max(0, remaining + dash);
+  return Math.max(0, remaining);
 }
 
 function factCanChangeThroughMovement(atom: ScenarioFactAtom): boolean {
diff --git a/src/vtt/stable-dom-render.ts b/src/vtt/stable-dom-render.ts
index ca2032f807a5c8c7bcd66f3f0fd08f579115c4f9..fad2c4c1d76a70f10d2bd82fe50d8f51c7e6934e
--- a/src/vtt/stable-dom-render.ts
+++ b/src/vtt/stable-dom-render.ts
@@ -90,7 +90,7 @@
   if (segments.some((segment) => segment.length === 0)) {
     throw new StableRenderKeyFormatError(segments.join(':'));
   }
-  return segments.map((segment) => encodeURIComponent(segment)).join(':') as StableRenderKey;
+  return segments.join(':') as StableRenderKey;
 }
 
 function renderKey(element: HTMLElement): StableRenderKey | null {
diff --git a/tests/unit/vtt/room-generator-los-cover.test.ts b/tests/unit/vtt/room-generator-los-cover.test.ts
index 826da51eda894d39c8d473728f1d46b8f29ae22f..021ed1d1b7a00b9e540ff4f683395f9720141005
--- a/tests/unit/vtt/room-generator-los-cover.test.ts
+++ b/tests/unit/vtt/room-generator-los-cover.test.ts
@@ -16,6 +16,7 @@
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
 import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import {
   generateRoom,
   type GeneratedRoom,
@@ -23,6 +24,8 @@
 } from '../../../src/vtt/room-generator';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 const FIXTURE_CASES = [
   { difficulty: 'standard', seed: 5_762_001, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json' },
   { difficulty: 'standard', seed: 5_762_002, path: 'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json' },
@@ -236,8 +239,8 @@
   const monsters = planning.combatants.filter((combatant) =>
     combatant.profile.kind === 'monster' && combatant.life === 'living');
   for (const monster of monsters) {
-    const productive = availableEngineActorOptions(planning, monster.profile.id).some((option) => {
-      const resolution = resolveEngineActorOption(planning, option);
+    const productive = availableEngineActorOptions(planning, monster.profile.id, OFFER_ENVIRONMENT).some((option) => {
+      const resolution = resolveEngineActorOption(planning, option, OFFER_ENVIRONMENT);
       return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
         resolution.mechanics.actionSlots.some((slot) =>
           slot.kind === 'attack' || slot.kind === 'saving_throw' ||
diff --git a/tests/unit/vtt/room-generator.test.ts b/tests/unit/vtt/room-generator.test.ts
index b7f7a334d4dca6851ad16f37b9f1724dc03ceab2..765a645fb6aa0943b3dd2e27b9e6a04a874e92ec
--- a/tests/unit/vtt/room-generator.test.ts
+++ b/tests/unit/vtt/room-generator.test.ts
@@ -23,8 +23,13 @@
   hardRoomMembershipViolations,
 } from '../../../tools/d569-second-family-manifest';
 import { loadExternalPartyPackBytes } from '../../../src/vtt/party-pack';
+import { availableEngineActorOptions, resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 import { declareTestInputs } from '../../helpers/test-inputs';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 const BASIS_SEEDS = [
   3_943_001,
   3_943_002,
@@ -563,6 +568,13 @@
     (seed) => {
       const brutal = generateRoom(seed, { difficulty: 'brutal' });
       expect(brutalRoomMembershipViolations(brutal)).toEqual([]);
+      const state = freshMonsterPlanningState(brutal.encounter.state);
+      const monsters = state.combatants.filter((candidate) => candidate.profile.kind === 'monster');
+      for (const monster of monsters) {
+        const productive = availableEngineActorOptions(state, monster.profile.id, OFFER_ENVIRONMENT)
+          .some((option) => resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid);
+        expect(productive, monster.profile.id).toBe(true);
+      }
     },
   );
 
diff --git a/tests/unit/vtt/save-manager.test.ts b/tests/unit/vtt/save-manager.test.ts
index d32f74cbef07d5e40721849f75cf58382134d14c..0a1006431721df273b43bc1818b0cf0121f56c27
--- a/tests/unit/vtt/save-manager.test.ts
+++ b/tests/unit/vtt/save-manager.test.ts
@@ -17,6 +17,9 @@
 } from '../../../src/vtt/save-manager';
 import type { PartySessionState } from '../../../src/vtt/party-session-state';
 import { DEFAULT_REFUSAL_HANDLING_SETTINGS } from '../../../src/vtt/refusal-handling';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const PARTY_COMBATANTS = [1, 2, 3].map((index) => combatantId(`combatant:save-${String(index)}`));
 const PARTY_STATE: PartySessionState = {
@@ -54,7 +57,10 @@
     ['session:browser-old', 'Browser old', '2042-08-24T10:00:00.000Z'],
     ['session:browser-new', 'Browser new', '2042-08-24T12:00:00.000Z'],
   ] as const) {
-    const host = new DmEncounterHost(session, store, { initialPartyState: PARTY_STATE });
+    const host = new DmEncounterHost(session, store, {
+      initialPartyState: PARTY_STATE,
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     host.close();
     const sessionId = encounterSessionId(session);
     const bytes = exportSavedSession(store, sessionId);
diff --git a/tests/unit/vtt/semantic-board-payload.test.ts b/tests/unit/vtt/semantic-board-payload.test.ts
index e6d19fe5f033fb0d4a38462045b7232cdf2c3034..62aa8786bdd55db6ac6ed9ec6848ad6761e50d54
--- a/tests/unit/vtt/semantic-board-payload.test.ts
+++ b/tests/unit/vtt/semantic-board-payload.test.ts
@@ -18,6 +18,9 @@
   truthAnswer,
 } from '../../../tools/ai-dm-screenshot-probe';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const IDLE: PersistedCoordinatorState = {
   requestSequence: 1,
@@ -100,6 +103,7 @@
       coordinator: IDLE,
       controllers: [],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     }),
   };
 }
@@ -199,6 +203,7 @@
       coordinator: IDLE,
       controllers: [],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     }));
     expect(empty.creatures.items).toHaveLength(1);
     expect(empty.cells.blocked.items).toEqual([]);
@@ -251,6 +256,7 @@
       coordinator: IDLE,
       controllers: [],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     }));
 
     expect(payload.cells.light.bright.encoding).toBe(
diff --git a/tests/unit/vtt/session-timeline-record.test.ts b/tests/unit/vtt/session-timeline-record.test.ts
index 2d876c35f70ffe8898f807ba832ed838d200df78..f9e7c6fb9f3c8aa5dea4958921e794e7b4d94987
--- a/tests/unit/vtt/session-timeline-record.test.ts
+++ b/tests/unit/vtt/session-timeline-record.test.ts
@@ -40,6 +40,9 @@
   importSavedSession,
 } from '../../../src/vtt/session-persistence';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 const IDLE = {
   requestSequence: 1,
@@ -213,6 +216,7 @@
       coordinator: IDLE,
       controllers: [],
       history: [],
+      offerEnvironment: OFFER_ENVIRONMENT,
     }).timeline;
     expect(initial.upcoming).toContainEqual(expect.objectContaining({
       kind: 'legendary_action_window',
@@ -333,6 +337,7 @@
       initialControllers: humanIdentities(state),
       playerIds,
       turnLegalActions: (_current, actor) => ({ actions: [{ type: 'end_turn', actor }] }),
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     host.start();
     for (let turn = 0; turn < state.initiative.length * 2; turn += 1) {
@@ -375,7 +380,9 @@
 
   it('equal_length_history_replaced: projects changed content instead of a same-length cached history', () => {
     const store = new SameLengthHistoryStore();
-    const host = new DmEncounterHost('session:equal-length-history', store);
+    const host = new DmEncounterHost('session:equal-length-history', store, {
+      offerEnvironment: OFFER_ENVIRONMENT,
+    });
     const beforeReplacement = host.snapshot();
     const replacementBranch = encounterBranchId('branch:equal-length-replacement');
 
@@ -393,6 +400,7 @@
     const store = new MemoryBrowserSessionStore();
     const host = new DmEncounterHost('session:chosen-seed', store, {
       initialSeed: chosenSeed,
+      offerEnvironment: OFFER_ENVIRONMENT,
     });
     const first = store.revisions(host.sessionId)[0];
     expect(first?.rngState.initialSeed).toBe(chosenSeed);
diff --git a/tests/unit/vtt/snippets.test.ts b/tests/unit/vtt/snippets.test.ts
index 53fcfdefe19dc62b0df7887466e57c706b15106a..2e517781f073801c52ce2041e5c29b380312862f
--- a/tests/unit/vtt/snippets.test.ts
+++ b/tests/unit/vtt/snippets.test.ts
@@ -1,7 +1,10 @@
 import { describe, expect, it } from 'vitest';
-import { createEngineStateCapsule, type EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
-import { pureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
 import {
+  createEngineStateCapsuleForEnvironment,
+  type EngineStateCapsule,
+} from '../../../src/vtt/engine-state-capsule';
+import { createPureTurnProposalResolver } from '../../../src/vtt/intent-resolver';
+import {
   createEngineMcpRuntime,
   freshMonsterPlanningState,
   loadArenaFixture,
@@ -11,9 +14,19 @@
 import { SUGGESTED_PLAN_MAX_BYTES } from '../../../src/vtt/mcp/engine-server';
 import { SNIPPET_REGISTRY } from '../../../src/vtt/snippet-registry-runtime';
 import type { EngineOfferableOption, EngineTurnProposal } from '../../../src/vtt/turn-proposal';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
 const CLIENT = Object.freeze({ name: 'snippet-test', version: '1.0.0' });
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
+function createBoundEngineMcpRuntime(
+  state: Parameters<typeof createEngineMcpRuntime>[0],
+  options: Omit<NonNullable<Parameters<typeof createEngineMcpRuntime>[1]>, 'offerEnvironment'> = {},
+): ReturnType<typeof createEngineMcpRuntime> {
+  return createEngineMcpRuntime(state, { ...options, offerEnvironment: OFFER_ENVIRONMENT });
+}
+
 function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
   if (typeof value !== 'object' || value === null || Array.isArray(value)) {
     throw new TypeError(`${label} must be an object.`);
@@ -112,7 +125,7 @@
 async function registryFixture(seed: number) {
   const loaded = await loadArenaFixture(`tests/fixtures/arena-basis/seed-${String(seed)}.json`);
   const state = freshMonsterPlanningState(loaded);
-  const runtime = createEngineMcpRuntime(state);
+  const runtime = createBoundEngineMcpRuntime(state);
   return { state, runtime, capsule: runtime.feed.current() };
 }
 
@@ -125,13 +138,13 @@
       ? { ...token, position: { column: 3, row: 6 } }
       : token),
   });
-  const runtime = createEngineMcpRuntime(state);
+  const runtime = createBoundEngineMcpRuntime(state);
   return { state, runtime, capsule: runtime.feed.current() };
 }
 
 function withProjection(capsule: EngineStateCapsule, projection: EngineStateCapsule['projection']) {
   if (capsule.request === null) throw new TypeError('Fixture request is absent.');
-  return createEngineStateCapsule({
+  return createEngineStateCapsuleForEnvironment({
     runId: capsule.runId,
     branchId: capsule.branchId,
     revision: capsule.revision + 1,
@@ -140,6 +153,7 @@
     projection,
     historyDelta: capsule.historyDelta,
     rulesIndex: capsule.rulesIndex,
+    offerEnvironment: capsule.offerEnvironment,
   });
 }
 
@@ -230,7 +244,7 @@
     const { runtime, capsule } = await registryFixture(3_943_003);
     if (capsule.request === null) throw new TypeError('Fixture request is absent.');
     const requested = new Set(capsule.request.actors);
-    runtime.feed.replace(createEngineStateCapsule({
+    runtime.feed.replace(createEngineStateCapsuleForEnvironment({
       runId: capsule.runId,
       branchId: capsule.branchId,
       revision: capsule.revision + 1,
@@ -243,6 +257,7 @@
       },
       historyDelta: capsule.historyDelta,
       rulesIndex: capsule.rulesIndex,
+      offerEnvironment: capsule.offerEnvironment,
     }));
     const context = tool(runtime, 'engine.get_turn_context', {
       run_id: capsule.runId,
@@ -260,7 +275,7 @@
       .filter((candidate) => candidate.profile.kind === 'monster' && candidate.life !== 'dead')
       .map((candidate) => candidate.profile.id)
       .sort();
-    const runtime = createEngineMcpRuntime(state, {
+    const runtime = createBoundEngineMcpRuntime(state, {
       requestKind: 'plan_adjustment',
       requestedActorIds: actors,
       planAdjustment: {
@@ -336,7 +351,7 @@
           slot.slot === 'main' && slot.use.kind === 'dash');
       })).toBe(true);
       for (const proposal of proposals) {
-        expect(pureTurnProposalResolver.resolve(state, proposal).valid).toBe(true);
+        expect(TURN_PROPOSAL_RESOLVER.resolve(state, proposal).valid).toBe(true);
       }
     },
   );
@@ -370,7 +385,7 @@
     async (seed) => {
       const { state, capsule } = await registryFixture(seed);
       for (const proposal of SNIPPET_REGISTRY.expand('basic_advance', capsule).proposals) {
-        const resolution = pureTurnProposalResolver.resolve(state, proposal);
+        const resolution = TURN_PROPOSAL_RESOLVER.resolve(state, proposal);
         expect(resolution.valid).toBe(true);
         if (!resolution.valid) throw new Error('Frozen-room proposal unexpectedly refused.');
         expect(resolution.mechanics.actionSlots.length).toBeGreaterThan(0);
@@ -396,7 +411,7 @@
     const proposal = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals
       .find((entry) => entry.actorId === 'combatant:generated-3943001-monster-3');
     if (proposal === undefined) throw new Error('Longbow proposal is absent.');
-    const resolved = pureTurnProposalResolver.resolve(state, proposal);
+    const resolved = TURN_PROPOSAL_RESOLVER.resolve(state, proposal);
     expect(resolved.valid).toBe(true);
     if (!resolved.valid) throw new Error('Longbow proposal was refused.');
     expect(resolved.mechanics.movementCostFeet).toBe(0);
@@ -418,7 +433,7 @@
     const { state, capsule } = await registryFixture(3_943_001);
     const proposal = SNIPPET_REGISTRY.expand('focus_fire', capsule).proposals[0];
     if (proposal === undefined || proposal.fallbackOptionId === null) throw new Error('Fallback proposal is absent.');
-    const resolved = pureTurnProposalResolver.resolve(state, {
+    const resolved = TURN_PROPOSAL_RESOLVER.resolve(state, {
       ...proposal,
       primaryOptionId: 'option:unavailable-primary' as EngineTurnProposal['primaryOptionId'],
     });
@@ -503,7 +518,7 @@
   it('does not offer fallback-bearing plays during a correction request', async () => {
     const { capsule } = await registryFixture(3_943_001);
     if (capsule.request === null) throw new TypeError('Fixture request is absent.');
-    const correction = createEngineStateCapsule({
+    const correction = createEngineStateCapsuleForEnvironment({
       runId: capsule.runId,
       branchId: capsule.branchId,
       revision: capsule.revision + 1,
@@ -512,6 +527,7 @@
       projection: capsule.projection,
       historyDelta: capsule.historyDelta,
       rulesIndex: capsule.rulesIndex,
+      offerEnvironment: capsule.offerEnvironment,
     });
     expect(SNIPPET_REGISTRY.applicable(correction)).toEqual([]);
   });
@@ -528,7 +544,7 @@
             primaryOptionId: proposal.fallbackOptionId,
             fallbackOptionId: null,
           };
-          expect(pureTurnProposalResolver.resolve(state, fallbackProposal).valid).toBe(true);
+          expect(TURN_PROPOSAL_RESOLVER.resolve(state, fallbackProposal).valid).toBe(true);
         }
       }
     }
diff --git a/tests/unit/vtt/speculative-planning.test.ts b/tests/unit/vtt/speculative-planning.test.ts
index c860a848b102eacabe36ef99203b93c78b9abdc1..dde82864e70fb6132b7ed63a81a7ba89897c9092
--- a/tests/unit/vtt/speculative-planning.test.ts
+++ b/tests/unit/vtt/speculative-planning.test.ts
@@ -17,14 +17,14 @@
   persistentAreaId,
 } from '../../../src/combat/values';
 import {
-  createEngineStateCapsule,
+  createEngineStateCapsuleForEnvironment,
   engineStateHandle,
   FixedReadonlyStateCapsuleSource,
   projectEngineEncounterState,
 } from '../../../src/vtt/engine-state-capsule';
 import { projectEngineInitiativeIntel } from '../../../src/vtt/engine-initiative-intel';
 import {
-  engineActionRegistry,
+  engineActionRegistryForEnvironment,
   engineConcentrationActive,
   enginePlanningHitPointMaximum,
   enginePlanningHitPoints,
@@ -35,8 +35,8 @@
   buildHostScenarioMenu,
   compileHostScenarios,
   complementScenarioFact,
-  evaluateHostScenarios,
-  evaluateScenarioFact,
+  evaluateHostScenarios as evaluateHostScenariosWithEnvironment,
+  evaluateScenarioFact as evaluateScenarioFactWithQueries,
   maximumInfluenceRadiusFeet,
   scenarioFactKey,
 } from '../../../src/vtt/speculative-planning';
@@ -52,7 +52,24 @@
 import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
 import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
 import { declareTestInputs } from '../../helpers/test-inputs';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
+function evaluateScenarioFact(
+  state: Parameters<typeof evaluateScenarioFactWithQueries>[0],
+  fact: Parameters<typeof evaluateScenarioFactWithQueries>[1],
+): ReturnType<typeof evaluateScenarioFactWithQueries> {
+  return evaluateScenarioFactWithQueries(state, fact, OFFER_ENVIRONMENT.queries);
+}
 
+function evaluateHostScenarios(
+  state: Parameters<typeof evaluateHostScenariosWithEnvironment>[0],
+  scenarios: Parameters<typeof evaluateHostScenariosWithEnvironment>[1],
+): ReturnType<typeof evaluateHostScenariosWithEnvironment> {
+  return evaluateHostScenariosWithEnvironment(state, scenarios, OFFER_ENVIRONMENT.queries);
+}
+
 const HARD_BASIS_SEEDS = [
   5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005, 5_117_006,
   5_117_007, 5_117_008, 5_117_009, 5_117_010, 5_117_011, 5_117_012,
@@ -248,10 +265,12 @@
     const hard = freshMonsterPlanningState(generateRoom(5_117_002, { difficulty: 'hard' }).encounter.state);
     const actor = hard.combatants.find((entry) =>
       entry.profile.kind === 'monster' && entry.life === 'living' &&
-      engineActionRegistry(hard).actionsFor(entry.profile.id).length > 0);
+      engineActionRegistryForEnvironment(hard, OFFER_ENVIRONMENT).actionsFor(entry.profile.id).length > 0);
     const target = actor === undefined ? undefined : hard.combatants.find((entry) =>
       entry.profile.kind === 'player_character' && entry.life === 'living');
-    const action = actor === undefined ? undefined : engineActionRegistry(hard).actionsFor(actor.profile.id)[0];
+    const action = actor === undefined
+      ? undefined
+      : engineActionRegistryForEnvironment(hard, OFFER_ENVIRONMENT).actionsFor(actor.profile.id)[0];
     if (actor === undefined || target === undefined || action === undefined) {
       throw new Error('Hard-basis reach fixture is incomplete.');
     }
@@ -324,7 +343,12 @@
       kind: 'zone_occupancy_is', subject: targetRef, zoneId: authoredZoneId, value: 'inside',
     }).matches).toBe(true);
     expect(engineConcentrationActive(zoned, actor.profile.id)).toBe(true);
-    expect(projectEngineEncounterState(zoned, engineActionRegistry(zoned), projectEngineInitiativeIntel(zoned, []), 1).semanticZones)
+    expect(projectEngineEncounterState(
+      zoned,
+      engineActionRegistryForEnvironment(zoned, OFFER_ENVIRONMENT),
+      projectEngineInitiativeIntel(zoned, []),
+      1,
+    ).semanticZones)
       .toEqual([
         {
           id: authoredZoneId,
@@ -360,7 +384,12 @@
           }
         : entry),
     };
-    const projection = projectEngineEncounterState(state, engineActionRegistry(state), projectEngineInitiativeIntel(state, []), 1);
+    const projection = projectEngineEncounterState(
+      state,
+      engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
+      projectEngineInitiativeIntel(state, []),
+      1,
+    );
     expect(projection.combatants.find((entry) => entry.id === fixture.target.id)?.planning)
       .toMatchObject({
         temporaryHitPoints: 9,
@@ -450,7 +479,7 @@
         }),
       ];
       const scenarios = compileHostScenarios(menu);
-      const capsule = createEngineStateCapsule({
+      const capsule = createEngineStateCapsuleForEnvironment({
         runId: encounterSessionId(`encounter:hard-${String(seed)}`),
         branchId: encounterBranchId(`branch:hard-${String(seed)}`),
         revision: 1,
@@ -466,7 +495,13 @@
           scenarioMenu: menu,
           scenarios,
         },
-        projection: projectEngineEncounterState(state, engineActionRegistry(state), projectEngineInitiativeIntel(state, []), 1),
+        projection: projectEngineEncounterState(
+          state,
+          engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
+          projectEngineInitiativeIntel(state, []),
+          1,
+        ),
+        offerEnvironment: OFFER_ENVIRONMENT.binding,
       });
       if (capsule.request?.phase !== 'speculative') throw new Error('Speculative capsule was not retained.');
       expect(evaluateHostScenarios(state, capsule.request.scenarios)).toMatchObject({
@@ -484,7 +519,7 @@
     const players = state.combatants
       .filter((entry) => entry.profile.kind === 'player_character' && entry.life === 'living')
       .map((entry) => entry.profile.id);
-    const result = buildHostScenarioMenu(state, actors, players);
+    const result = buildHostScenarioMenu(state, actors, players, OFFER_ENVIRONMENT);
     expect(result.baselineProposals.map((entry) => entry.actorId)).toEqual(actors);
     expect(result.scenarioMenu.length).toBeGreaterThan(0);
     expect(result.scenarioMenu.length).toBeLessThanOrEqual(8);
@@ -507,7 +542,7 @@
     })];
     const scenarios = compileHostScenarios(menu);
     const planningState = projectFutureMonsterTurns(fixture.state, [fixture.target.id]);
-    const capsule = createEngineStateCapsule({
+    const capsule = createEngineStateCapsuleForEnvironment({
       runId: encounterSessionId('encounter:spec-submit'),
       branchId: encounterBranchId('branch:spec-submit'),
       revision: 7,
@@ -523,7 +558,13 @@
         scenarioMenu: menu,
         scenarios,
       },
-      projection: projectEngineEncounterState(planningState, engineActionRegistry(planningState), projectEngineInitiativeIntel(planningState, []), 2),
+      projection: projectEngineEncounterState(
+        planningState,
+        engineActionRegistryForEnvironment(planningState, OFFER_ENVIRONMENT),
+        projectEngineInitiativeIntel(planningState, []),
+        2,
+      ),
+      offerEnvironment: OFFER_ENVIRONMENT.binding,
     });
     const source = new FixedReadonlyStateCapsuleSource(capsule);
     const accepted: Array<ReturnType<typeof submitSpeculativeRoundPlan>> = [];
diff --git a/tests/unit/vtt/stable-dom-render.test.ts b/tests/unit/vtt/stable-dom-render.test.ts
index 598381de9d3b924a86cc1ebc358ef711bc2f6373..eb2467ba711ed562131694360bdd7e1737ae9359
--- a/tests/unit/vtt/stable-dom-render.test.ts
+++ b/tests/unit/vtt/stable-dom-render.test.ts
@@ -15,6 +15,9 @@
 import { generateRoom } from '../../../src/vtt/room-generator';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { statblockId } from '../../../src/combat/values';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
+
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 
 describe('stable VTT control rendering', () => {
   let restoreDocument: () => void;
@@ -36,7 +39,7 @@
         : combatant),
     });
     const catalog = renderHumanEngineOptionCatalog(
-      projectHumanEngineOptions(state, [monster.profile.id]),
+      projectHumanEngineOptions(state, [monster.profile.id], state.revision, OFFER_ENVIRONMENT),
     );
     const entries = interactiveElement(catalog).querySelectorAll('li');
     const availability = entries.map((entry) => entry.dataset['optionAvailability']);
diff --git a/tests/unit/vtt/standard-offer-generator.test.ts b/tests/unit/vtt/standard-offer-generator.test.ts
index 8fd4ec9a6dda8669e8e6075d2fd0db22951a4e02..d8b8a5126e21302f181a2ddcc03b1f660ef6d7f3
--- a/tests/unit/vtt/standard-offer-generator.test.ts
+++ b/tests/unit/vtt/standard-offer-generator.test.ts
@@ -3,14 +3,19 @@
 import { createEncounter } from '../../../src/combat/encounter';
 import { BANDIT, SPY } from '../../../src/combat/statblocks/mercenary-company';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
-import { resolveEngineActorOption } from '../../../src/vtt/intent-resolver';
+import {
+  engineActorOptionsForEnvironment,
+  resolveEngineActorOption,
+} from '../../../src/vtt/intent-resolver';
 import { evaluateOptionOutcome } from '../../../src/vtt/intel/option-outcome';
 import { engineOfferableOption } from '../../../src/vtt/option-modeling';
 import { ENGINE_OFFER_CAPABILITIES } from '../../../src/vtt/offers/offer-generator-registry';
 import { standardOfferGenerator } from '../../../src/vtt/offers/standard-offer-generator';
 import { placedToken, playerProfile } from '../combat/fixtures';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 const PARENT_LEGACY_OPTION_COUNT = 6;
 const PARENT_LEGACY_ORDERED_OPTION_IDS = [
   'option:41:54bc820030b0ca978335e4eaee4c3a7fe40cf02f20ab11d7',
@@ -201,10 +206,17 @@
     const { actor, state } = legacyOracleFixture();
     const offers = standardOfferGenerator.generate({ state, actorId: actor.id, revision: 41 });
     const actualOptions = offers.map(engineOfferableOption);
+    const environmentBound = engineActorOptionsForEnvironment(state, actor.id, OFFER_ENVIRONMENT, 41).offerable;
 
     expect(actualOptions).toHaveLength(PARENT_LEGACY_OPTION_COUNT);
     expect(actualOptions.map((option) => option.optionId)).toEqual(PARENT_LEGACY_ORDERED_OPTION_IDS);
     expect(actualOptions).toEqual(PARENT_LEGACY_OPTIONS_IN_GENERATION_ORDER);
+    expect(environmentBound.map((option) => option.optionId).sort()).toEqual(
+      PARENT_LEGACY_OPTIONS_IN_GENERATION_ORDER
+        .filter((option) => option.label !== 'Disengage')
+        .map((option) => option.optionId)
+        .sort(),
+    );
 
     expect(JSON.stringify(actualOptions)).not.toContain('"binding"');
   });
@@ -228,7 +240,7 @@
       .find((candidate) => candidate.label === 'End Turn');
     if (offer === undefined) throw new Error('Standard generator fixture omitted End Turn.');
     const resolved = standardOfferGenerator.resolve({
-      resolveStandard: (option) => resolveEngineActorOption(state, option, canonicalEngineQueryPort),
+      resolveStandard: (candidate) => resolveEngineActorOption(state, candidate, OFFER_ENVIRONMENT),
     }, offer);
     if (!resolved.valid) throw new Error(`Standard End Turn refused: ${resolved.code}`);
 
@@ -240,7 +252,7 @@
     }, resolved.mechanics);
     const evaluation = standardOfferGenerator.evaluate({
       evaluateStandard: (option, mechanics) =>
-        evaluateOptionOutcome(state, option, mechanics, canonicalEngineQueryPort),
+        evaluateOptionOutcome(state, option, mechanics, OFFER_ENVIRONMENT.queries),
     }, resolved.mechanics);
 
     expect(executedOptionId).toBe(resolved.mechanics.mechanics.optionId);
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index a3cc6ccec4896ec7137d765bc81162259151883e..87b98ff21f433c2a0c6eb92ac98f1af0e79370bd
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -3,14 +3,16 @@
 import { traceCombatantLine } from '../../../src/combat/cover';
 import type { MonsterAttackAction } from '../../../src/combat/statblock';
 import { combatantId } from '../../../src/combat/values';
-import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
 import type { TacticalAllocationCandidate } from '../../../src/vtt/engine-query-port';
 import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
 import { availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
 import type { EngineOfferableOption } from '../../../src/vtt/turn-proposal';
 import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
 import { declareTestInputs } from '../../helpers/test-inputs';
+import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
 
+const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+
 const inputs = declareTestInputs({
   fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
 });
@@ -94,16 +96,16 @@
     ] as const;
     const rows = handGeometry.map((geometry) => {
       const scoutId = geometry.scoutId;
-      const action = canonicalEngineQueryPort.actions(state, scoutId)
+      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
         .find((candidate): candidate is MonsterAttackAction =>
           candidate.kind === 'attack' && candidate.id === 'longbow');
       if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
-      const reach = canonicalEngineQueryPort.reach(state, {
+      const reach = OFFER_ENVIRONMENT.queries.reach(state, {
         actorId: scoutId,
         targetId: FIGHTER,
         actionId: action.id,
       });
-      const evaluation = canonicalEngineQueryPort.tacticalAttack(
+      const evaluation = OFFER_ENVIRONMENT.queries.tacticalAttack(
         state,
         scoutId,
         FIGHTER,
@@ -173,7 +175,7 @@
       actorId: typeof PRIEST,
       predicate: (option: EngineOfferableOption) => boolean,
     ): EngineOfferableOption => {
-      const option = availableEngineActorOptions(state, actorId).find(predicate);
+      const option = availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).find(predicate);
       if (option === undefined) throw new Error(`Required option is absent for ${actorId}.`);
       return option;
     };
@@ -221,13 +223,13 @@
     });
     const scoutScoutPriest = [PRIEST, ...SCOUTS] as const;
     const scoutScoutBandit = [...SCOUTS, BANDITS[0]] as const;
-    const comparison = canonicalEngineQueryPort.compareAllocations(state, FIGHTER, [
+    const comparison = OFFER_ENVIRONMENT.queries.compareAllocations(state, FIGHTER, [
       candidate('no-bless', priestAttack),
       candidate('bless-scout-scout-priest', priestBless, scoutScoutPriest),
       candidate('bless-scout-scout-bandit', priestBless, scoutScoutBandit),
       candidate('no-priest-attacks', priestEnds),
       candidate('bless-only-priest-no-attacks', priestBlessOnly, scoutScoutBandit),
-    ], initiativeOrder);
+    ], initiativeOrder, OFFER_ENVIRONMENT);
 
     expect(comparison.policy).toBe('tactical-evaluator-v3');
     const probability = (allocationId: string) => {
@@ -286,12 +288,12 @@
       firstScoutOption === undefined || secondScoutOption === undefined ||
       firstBanditOption === undefined || secondBanditOption === undefined
     ) throw new Error('Frozen R02 attack option cardinality changed.');
-    const delayed = canonicalEngineQueryPort.compareAllocations(state, FIGHTER, [{
+    const delayed = OFFER_ENVIRONMENT.queries.compareAllocations(state, FIGHTER, [{
       allocationId: 'bless-after-first-scout',
       choices: [firstScoutOption, delayedBlessOption, secondScoutOption, firstBanditOption, secondBanditOption]
         .map((option) => ({ actorId: option.actorId, optionId: option.optionId })),
       modifierGrants: [{ sourceActorId: PRIEST, kind: 'bless', targetIds: scoutScoutPriest }],
-    }], delayedOrder).allocations[0];
+    }], delayedOrder, OFFER_ENVIRONMENT).allocations[0];
     if (delayed?.killProbability === null || delayed?.killProbability === undefined) {
       throw new Error('Delayed-Bless allocation is unresolved.');
     }
