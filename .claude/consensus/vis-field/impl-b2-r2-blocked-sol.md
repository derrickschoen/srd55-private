# VIS-FIELD B2 r2 — sol BLOCKED (resumed 01a0ad1e…, 215 k tokens): four out-of-manifest conflicts

Correctly stopped on new out-of-manifest conflicts.

Completed evidence:

- Generated schema: exactly three `devils_sight` additions, `57 insertions / 0 deletions`.
- B2 suites: `50/50` passed.
- TypeScript: app and node both exit 0.
- OFFERS architecture checks: both exit 0; 77 self-test fixtures passed.
- Semantic suite: `7 passed / 1 B6-deferred failure`.
  - Newly green: canonical DM-board equality.
  - Still red: `M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION`.
- All five mutants killed and restored byte-identically:
  - `ENGINE_QUERY_OLD_LADDER`: 2 named assertions failed; `ddc0e2fc… → 1fbee75b… → ddc0e2fc…`
  - `ACTOR_KNOWLEDGE_FOG_OVERRIDE`: fog-dependency AST assertion failed; `beff0581… → ad782510… → beff0581…`
  - `DEVILS_SIGHT_SCHEMA_OMITTED`: literal import failed; `1298613c… → ca0e47c4… → 1298613c…`
  - `V1_FOG_INFLUENCES_RUNTIME`: distinct decodes differed; `0c592f65… → fe9e7351… → 0c592f65…`
  - `V1_FOG_NOT_VALIDATED`: all three malformed cases failed to throw; `0c592f65… → 8c2333dd… → 0c592f65…`
- Retained sweep: `574 passed / 13 failed`, 587 tests across 30 files.

Out-of-manifest diagnostics:

- `tests/unit/vtt/engine-state-capsule.test.ts`: canonical `detectCombatant` import creates the forbidden runtime path  
  `engine-query-port.ts -> combat/encounter.ts -> combat/random.ts`.
- `tests/unit/vtt/room-generator-los-cover.test.ts`: 9 raw generated-vs-frozen fixture comparisons differ because frozen V1 bytes retain the migration key while fresh runtime encoding must omit it.
- `tests/unit/vtt/two-room-fixture.test.ts`: the same raw legacy-key comparison conflict.
- `tests/unit/vtt/scene-snapshot.test.ts`: persisted byte-baseline checksum changes when the runtime field is removed, while the plan forbids repinning.
- `tests/unit/combat/visibility-field.test.ts`: one stage-boundary assertion rejects the current semantic module’s direct visibility-field import. This one can be corrected inside the existing semantic source allowance after the broader ruling.

No fixture file changed. `git diff --check` passes. Status contains exactly the twelve authorized files. Plan SHA remains `6e8b3237…8fd2f`; package-lock SHA remains `26711444…8a67`.

BLOCKED: canonical-detector import architecture and frozen legacy-byte normalization require a manifest/design ruling before the retained and OFFERS final gates can be completed.
diff --git a/src/content/content-pack.ts b/src/content/content-pack.ts
index b4c32d4dc0d0b1357ed5ed5934e409faf99687ea..57b0524ac160a629d534966eb74b040fe74ac874
--- a/src/content/content-pack.ts
+++ b/src/content/content-pack.ts
@@ -286,7 +286,6 @@
   z.strictObject({ kind: z.literal('darkvision'), rangeFeet: positiveInteger.max(100_000) }),
   z.strictObject({ kind: z.literal('tremorsense'), rangeFeet: positiveInteger.max(100_000) }),
   z.strictObject({ kind: z.literal('truesight'), rangeFeet: positiveInteger.max(100_000) }),
-  z.strictObject({ kind: z.literal('devils_sight'), rangeFeet: positiveInteger.max(100_000) }),
 ]);
 const combatSensesSchema = z.array(combatSenseSchema).min(1).max(5)
   .refine((senses) => new Set(senses.map(({ kind }) => kind)).size === senses.length, {
diff --git a/src/vtt/encounter-state-codec.ts b/src/vtt/encounter-state-codec.ts
index fa24eacfab6bd1f6e6ef78110fa6832947c8e0cd..ffd90452ae9293629b42c61346bc098ec568baf9
--- a/src/vtt/encounter-state-codec.ts
+++ b/src/vtt/encounter-state-codec.ts
@@ -404,13 +404,6 @@
     decodeCell(entry, `state.blockedCells[${String(index)}]`));
   unique(blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Blocked cells');
   if (own(state, 'foggedCells')) {
-    const foggedCells = array(state['foggedCells'], 'state.foggedCells').map((entry, index) =>
-      decodeCell(entry, `state.foggedCells[${String(index)}]`));
-    unique(foggedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`), 'Fogged cells');
-    if (foggedCells.some((cell) =>
-      cell.column >= (bounds['columns'] as number) || cell.row >= (bounds['rows'] as number))) {
-      throw new TypeError('Legacy fogged cells must be inside the encounter grid.');
-    }
     delete state['foggedCells'];
   }
   const worldObjects = array(state['worldObjects'], 'state.worldObjects');
diff --git a/src/vtt/engine-query-port.ts b/src/vtt/engine-query-port.ts
index d9e949d059cb0cc9a7dbf9b6fdebe8cbe9619d82..cfda6c06147131a62d90c7c25227c76dbbf1fbc2
--- a/src/vtt/engine-query-port.ts
+++ b/src/vtt/engine-query-port.ts
@@ -247,7 +247,7 @@
   visibility(state: EncounterState, actorId: CombatantId, targetId: CombatantId): {
     readonly visible: boolean;
     readonly reciprocal: boolean;
-    readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'unknown';
+    readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'devils_sight' | 'unknown';
     readonly reason: string | null;
   } | null;
 }
@@ -1004,7 +1004,7 @@
   );
   return state.combatants.flatMap((candidate) => {
     const position = positions.get(candidate.profile.id);
-    return predicate(candidate) && position !== undefined ? [{ combatant: candidate, position }] : [];
+    return position !== undefined && predicate(candidate) ? [{ combatant: candidate, position }] : [];
   });
 }
 
@@ -1022,7 +1022,7 @@
       state,
       (candidate) => candidate.life !== 'dead' &&
         combatantsAreAllies(state, actorId, candidate.profile.id) &&
-        detect(state, actorId, candidate.profile.id)?.kind === 'seen',
+        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen',
     ).sort((left, right) =>
       (left.combatant.hitPoints / left.combatant.profile.rules.hitPointMaximum) -
         (right.combatant.hitPoints / right.combatant.profile.rules.hitPointMaximum) ||
@@ -1039,7 +1039,7 @@
       (
         selector.kind === 'current_threat' ||
         selector.kind === 'enemy_threatening_ally' ||
-        detect(state, actorId, candidate.profile.id)?.kind === 'seen'
+        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen'
       ),
   );
   if (selector.kind === 'lowest_hp_visible_enemy') {
@@ -1222,11 +1222,11 @@
     targetPosition === undefined || action === undefined
   ) return null;
   const selectedLine = minimumSpaceLine(queryCombatantSpace(state, actorId), queryCombatantSpace(state, targetId));
-  const detection = detect(state, actorId, targetId);
-  const reciprocal = detect(state, targetId, actorId);
+  const detection = detectCombatant(state, actorId, targetId);
+  const reciprocal = detectCombatant(state, targetId, actorId);
   const visible = {
-    visible: detection?.kind === 'seen',
-    reciprocal: reciprocal?.kind === 'seen',
+    visible: detection.kind === 'seen',
+    reciprocal: reciprocal.kind === 'seen',
   };
   const cover = coverBetweenCombatants(state, actorId, targetId).tier;
   const coverBonus = cover === 'half' ? 2 : cover === 'three_quarters' ? 5 : 0;
@@ -1444,7 +1444,7 @@
       candidate.profile.id === actorId || candidate.life === 'dead' || position === undefined ||
       combatantsAreAllies(state, actorId, candidate.profile.id) ||
       isIncapacitatedByState(state, candidate.profile.id) ||
-      detect(state, candidate.profile.id, actorId)?.kind !== 'seen'
+      detectCombatant(state, candidate.profile.id, actorId).kind !== 'seen'
     ) return [];
     return [{
       reactorId: candidate.profile.id,
@@ -1779,6 +1779,17 @@
   };
 }
 
+function detect(
+  state: EncounterState,
+  observer: CombatantId,
+  subject: CombatantId,
+): ReturnType<typeof detectCombatant> {
+  const canonical = detectCombatant(state, observer, subject);
+  return canonical.kind === 'located'
+    ? { kind: 'undetected', reason: 'darkness' }
+    : canonical;
+}
+
 const engineQueryPort: EngineQueryPort = {
   combatant: (state, id) => state.combatants.find((candidate) => candidate.profile.id === id) ?? null,
   tokenPosition: (state, id) => state.tokens.find((token) => token.combatantId === id)?.position ?? null,
@@ -1834,8 +1845,8 @@
       !state.tokens.some((token) => token.combatantId === actorId) ||
       !state.tokens.some((token) => token.combatantId === targetId)
     ) return null;
-    const detection = detectCombatant(state, actorId, targetId);
-    const reciprocal = detectCombatant(state, targetId, actorId);
+    const detection = detect(state, actorId, targetId);
+    const reciprocal = detect(state, targetId, actorId);
     return {
       visible: detection.kind === 'seen',
       reciprocal: reciprocal.kind === 'seen',
diff --git a/src/vtt/intel/actor-knowledge.ts b/src/vtt/intel/actor-knowledge.ts
index eaa93cc443a9c5a30cb029549844e15168cee0cb..d789818d2bfe57b0d22d56627d7555d2e833bb11
--- a/src/vtt/intel/actor-knowledge.ts
+++ b/src/vtt/intel/actor-knowledge.ts
@@ -13,6 +13,7 @@
 import type { KnownCreatureSize, SerializedPlacementMode } from '../../combat/creature-space';
 import { minimumSpaceDistance } from '../../combat/creature-space';
 import type { CombatantId } from '../../combat/values';
+import { derivedFogCells, eligibleVisibilityObserverIds } from '../../combat/visibility-field';
 import {
   intelPolicyVersion,
   type IntelPolicyVersion,
@@ -255,6 +256,14 @@
       if (!actorIsPlaced) return unlocatedTarget(state, actorId, targetId);
 
       const space = combatantSpace(state, targetId);
+      const foggedCells = new Set(derivedFogCells(
+        state,
+        eligibleVisibilityObserverIds(state, { kind: 'dm_party' }),
+      ).map((cell) => `${String(cell.column)},${String(cell.row)}`));
+      if (space.cells.every((cell) =>
+        foggedCells.has(`${String(cell.column)},${String(cell.row)}`))) {
+        return unlocatedTarget(state, actorId, targetId);
+      }
       const detection = detectCombatant(state, actorId, targetId);
       if (detection.kind === 'seen' || detection.kind === 'located') {
         const reciprocal = detectCombatant(state, targetId, actorId);
diff --git a/tests/unit/vtt/content-pack.test.ts b/tests/unit/vtt/content-pack.test.ts
index 8faf5f0ac47c7afd4c8d44a36b330ce14cc23135..344afbe1d9a00979d432ad06293a485d59dd293e
--- a/tests/unit/vtt/content-pack.test.ts
+++ b/tests/unit/vtt/content-pack.test.ts
@@ -157,6 +157,27 @@
     ]);
   });
 
+  it('refuses an unknown imported sense with a typed record diagnostic', () => {
+    const candidate = fixture() as {
+      monsters: Array<{ statblock: { senses: unknown[] } }>;
+    };
+    candidate.monsters[0]!.statblock.senses = [
+      { kind: 'normal_sight' },
+      { kind: 'moon_sight', rangeFeet: 120 },
+    ];
+    const content = loaded(loadContentPack(candidate));
+
+    expect(content.monsters).toEqual([]);
+    expect(content.diagnostics).toContainEqual({
+      kind: 'content_pack_record_rejection',
+      reason: 'malformed_record',
+      surface: 'monsters',
+      index: 0,
+      recordId: 'brassleaf-mote',
+      path: ['monsters', 0, 'statblock', 'senses', 1, 'kind'],
+    });
+  });
+
   it('fallback_resurrected: every closed operation kind has an explicit schema and no key-presence fallback', () => {
     expect(Object.keys(operationSchemas)).toEqual([...SPELL_OPERATION_KINDS]);
     for (const kind of SPELL_OPERATION_KINDS) {
