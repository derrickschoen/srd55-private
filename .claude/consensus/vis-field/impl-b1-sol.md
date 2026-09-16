Batch 1 is complete across the amended eleven-file manifest.

## Implementation summary

- [visibility-field.ts](src/combat/visibility-field.ts:26) adds exhaustive grades/outcomes, one shared evaluator, actual fields, creature aggregation, reverse cell eligibility, eligible observers, derived fog, and state-scoped caching.
- [cover.ts](src/combat/cover.ts:163) accepts optical blockers without changing physical cover. Physical and optical corner selections are independent at lines 358–398 and 491–503; blocker signatures enter all three caches at lines 439–442, 532–537, and 563–568.
- [statblock.ts](src/combat/statblock.ts:31) and [effects.ts](src/combat/effects.ts:642) add `devils_sight`.
- [combat-rules.ts](src/combat/combat-rules.ts:43) now merges targeted Darkvision/Devil’s Sight effects by maximum range.
- [encounter.ts](src/combat/encounter.ts:2185) delegates detection to `sightToCreature`; tremorsense/web sense and Hidden/Invisible overlays remain. Perception consumes `seen_dim` at lines 4784–4798.
- [world-objects.ts](src/combat/world-objects.ts:87) clarifies that obscurement regions are cell facts interpreted by the field.
- [content-pack-operation-schema.ts](src/content/content-pack-operation-schema.ts:84) updates the exhaustive payload inventory and strict form-sense schema at line 600.
- [option-outcome.ts](src/vtt/intel/option-outcome.ts:314) received the separately authorized one-record delta:

```text
1 insertion, 0 deletions
devils_sight: 'unsupported'
```

This mirrors `darkvision`: both are persistent perception grants and do not independently resolve an option outcome.
- [visibility-field.test.ts](tests/unit/combat/visibility-field.test.ts:188) adds 26 tests.
- [senses.test.ts](tests/unit/vtt/senses.test.ts:114) adds two tests: actual ally-cast Darkvision and strict form Devil’s Sight validation.

No `foggedCells` declaration or consumer was removed.

## Hand-authored test oracles

The tests state their geometry inline:

- 3×1 bright/dim/dark fields, including RAW Darkvision upgrades.
- Bright `(4,2)` across a full-height ordinary-dark column remains visible under D626.3; an unlit target remains unseen.
- D576 wall strip blocks every corner ray.
- Concrete heavy and magical `obscured_area` screens cross every ray.
- Normal, Darkvision, Devil’s Sight, Truesight, and Blindsight magical-darkness matrix.
- Heavy fog defeats Truesight at both target and intervening cells.
- Darkvision 60/65-foot and Devil’s Sight 120/125-foot boundaries.
- Large observer: nearest occupied cell is 15 feet away and clears the fog screen; anchor-only tracing does not.
- Blinded field, Blindsight-through-fog, and Blinded Tremorsense `located`.
- Large subject visible through one bright footprint cell.
- Invisible subject retains all three reverse-eligibility origins while detection remains `invisible`.
- Every ordered fixture pair agrees between field and `detectCombatant`.
- State-scoped cache changes after movement, light change, obscurement ending, and sense-effect removal.
- Empty optical blockers preserve exact traces for all four cover tiers and Large footprints.
- Sight-only blockers preserve physical cover even when the preferred optical corner differs.

## RED-first evidence

Initial command:

```text
npx vitest run tests/unit/combat/visibility-field.test.ts tests/unit/vtt/senses.test.ts
```

Result:

```text
Test Files  2 failed (2)
Tests       27 failed | 9 passed (36)
```

The named failures covered light grades, ordinary darkness, walls, Fog Cloud, magical Darkness, heavy fog, range edges, Large footprints, Blinded/Blindsight/Tremorsense, transpose, agreement, active senses, caches, cover separation, single-owner architecture, and Perception integration.

## Mutants

Pristine source hashes used before and restored after every mutation:

```text
VF = 7a289247c83105a196c60b77b8934b44616d7d4b01222de3b0cbe13be846b17c
CV = b7db5da3d8d8c7bf03c1d8dc64f28644435daf4578f241f5fcd6c7f077035ffe
CR = 8b6c2494e22d2dd9f4a9791919e1d0c5115322a548fe2315936657225a154401
EN = f8c9f575ba51d089daad1d9af44651820b8b394552826ed5ac49f09adac8100d
```

| Mutant | Before → mutant SHA | Killing assertion |
|---|---|---|
| `RANGE_IGNORED` | VF → `a8189c876c47201b160979a6ae5532b156bdca76c3ade29d1149d8b8fb4dca60` | expected `[seen_dim, unseen]`, received `[seen_dim, seen_dim]` |
| `INTERVENING_OBSCUREMENT_IGNORED` | VF → `fe16200c6c8b590ddb1fda5738a248da8d3e59fa5bc01e56ef9f6805c327b3f3` | expected `unseen/blocked`, received visible |
| `DEVILS_SIGHT_IGNORED` | VF → `82df381fe10f071f67defd05eaedcf7887d788908c11a27f44207df57572840c` | Devil’s Sight expected visible, received `unseen/darkness` |
| `DIM_TREATED_AS_DARK` | VF → `5344c1aeca37fa35c18aa1d811bec72de095e5619f0c68e9abf691763f15c01d` | expected `1,0:seen_dim`, received `1,0:unseen` |
| `ORDINARY_DARKNESS_MADE_INTERVENING` | VF → `85bdb7b12bb4a5ec9aec00141b3db212af6fde4b15b4554ac44494deb470258a` | expected `seen`, received `unseen` |
| `TRUESIGHT_DEFEATS_FOG` | VF → `54ee961060f97fb329642da22c232832b234a3f88dc5163de8f957907ad03ba6` | expected `unseen/obscured`, received visible |
| `BLINDED_PHYSICAL_SIGHT_ALLOWED` | VF → `62f99ecb93d95c9916b80a994655e455da27fdb2c31e472e73098958152bf386` | expected three unseen cells, received three seen cells |
| `BLINDSIGHT_IGNORED` | VF → `d869a8787da6e64665b0b48f52864d22ef65b317a17e49e984deb1c53cd2a693` | expected `blindsight`, received `normal_sight` |
| `BEST_FOOTPRINT_CORNER_IGNORED` | CV → `507c8b42edfd583217b1b3517c72d1aa3a3818273ea1d26277d5db1c40a27c9f` | expected `seen_dim`, received `unseen` |
| `SIGHT_BLOCKER_BECOMES_TOTAL_COVER` | CV → `20639724cec99243e973f13e509094482a2708ad5217435b30f4a45462f9200d` | expected corner `(1,0)`, no cover; received `(0,0)`, Total Cover |
| `OPTICAL_BLOCKER_CHANGES_COVER_CORNER` | CV → `5235e5c2dc4d94aacd36ee192964125185d108ce39d679b9a949bd7ee37f121d` | expected corner `(1,0)`, no cover; received `(0,0)`, Half Cover |
| `SIGHT_BLOCKER_CACHE_KEY_OMITTED` | CV → `31075af4e9f4076ecf3b73269339798aea5fb698e6df0820832920cfd659a989` | expected empty middle trace `blocksSight=false`, received `true` |
| `SENSE_EFFECT_REQUIRES_SELF_SOURCE` | CR → `e66431223f121b0d504a190b91e190c5ffd4376e8788bd6bada4915c22b77d6d` | expected ally-touched observer visible, received false |
| `SENSE_MERGE_TAKES_FIRST` | CR → `a662fb40e6c788b149e108938f8a8c0305330f8540ada4c1e4d4db76a0a7b71a` | expected `seen_dim`, received `unseen` |
| `FIELD_DETECT_DIVERGES` | EN → `fcacc1951dbafb2fa4bb5bbb712b4597e0b5260e4593def5f78c1c31a99033e5` | agreement pair expected false, received true |

Each mutant exited 1; each named baseline rerun exited 0 after `cp` restoration.

## Final green

TypeScript:

```text
npx tsc -p tsconfig.app.json --noEmit   → exit 0
npx tsc -p tsconfig.node.json --noEmit  → exit 0
```

Suites:

```text
visibility-field.test.ts  26/26
senses.test.ts            10/10
terrain.test.ts           13/13
creature-cover.test.ts     5/5
Total                     54/54
Tests added               28
```

Final checks:

```text
git diff --check → exit 0
git status --short --untracked-files=all → exactly 11 amended-manifest files
```

Maximum added-line lengths by file were 30–112 columns; no added line exceeds 120.

Hashes:

```text
Plan:
6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f

package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

VIS-FIELD B1 DONE
diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index 80e2f570f65eb0d7e4fa526dd055d1ce867cca53..7b72cdec0fd93f840b368c127b222f93fbffee4b
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -544,7 +544,9 @@
     sourceId,
     targetId,
     includeCreatures: true,
-    additionalSightBlockingCells: options.additionalSightBlockingCells,
+    ...(options.additionalSightBlockingCells === undefined
+      ? {}
+      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
   });
   const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
   stateTraces.set(traceKey, trace);
@@ -561,9 +563,9 @@
   const blockerSignature = sightBlockingSignature(
     normalizedSightBlockingCells(options.additionalSightBlockingCells),
   );
-  const traceKey = `${String(sourceId)}->cells:${targetCells.map(cellKey).join(';')}@${options.sourceAnchor === undefined
-    ? 'current'
-    : cellKey(options.sourceAnchor)}#sight:${blockerSignature}`;
+  const targetSignature = targetCells.map(cellKey).join(';');
+  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);
+  const traceKey = `${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;
   const cached = combatantLineTraces.get(state)?.get(traceKey);
   if (cached !== undefined) return cached;
   const source = options.sourceAnchor === undefined
@@ -572,7 +574,9 @@
   const trace = traceSpaces(state, source.cells, targetCells, {
     sourceId,
     includeCreatures: true,
-    additionalSightBlockingCells: options.additionalSightBlockingCells,
+    ...(options.additionalSightBlockingCells === undefined
+      ? {}
+      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
   });
   const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
   stateTraces.set(traceKey, trace);
@@ -603,13 +607,15 @@
         objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
           ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
           : []),
+      new Set<string>(),
     )),
     sourceCell,
     targetCell,
   ));
   const first = traces[0];
   if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
-  return traces.reduce((best, candidate) => compareCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
+  return traces.reduce((best, candidate) =>
+    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
 }
 
 export type CreatureCoverOptions = CreatureLineOptions;
diff --git a/src/combat/visibility-field.ts b/src/combat/visibility-field.ts
index 1f04bf754d65c66941e1d7fa14411339a38485e9..3e6dd513f1465edb7ec61951cc4ed91ab7ea748d
--- a/src/combat/visibility-field.ts
+++ b/src/combat/visibility-field.ts
@@ -8,7 +8,11 @@
   traceCombatantLineToCells,
   traceTerrainLine,
 } from './cover';
-import { minimumSpaceDistanceToCells, type CreatureSpace } from './creature-space';
+import {
+  minimumSpaceDistanceToCells,
+  type CreatureSpace,
+  type KnownCreatureSize,
+} from './creature-space';
 import type { EncounterState } from './encounter';
 import type { GridCell } from './grid';
 import { affectedCells } from './templates';
@@ -53,7 +57,7 @@
 interface ActualObserver {
   readonly kind: 'actual';
   readonly id: CombatantId;
-  readonly space: CreatureSpace;
+  readonly space: CreatureSpace<KnownCreatureSize>;
   readonly senses: readonly CombatSense[];
   readonly blinded: boolean;
 }
@@ -160,8 +164,11 @@
 
 function obscurementCells(state: EncounterState): ReadonlyMap<string, CellObscurement> {
   const obscuredCells = new Map<string, CellObscurement>();
-  for (const region of state.environment.obscurementRegions) {
-    for (const cell of region.cells) addObscurement(obscuredCells, cell, region.obscurement);
+  for (const cell of allCells(state)) {
+    const environmentObscurement = environmentObscurementAt(state.environment, cell);
+    if (environmentObscurement !== null) {
+      addObscurement(obscuredCells, cell, environmentObscurement);
+    }
   }
   for (const effect of state.effects) {
     if (effect.payload.kind !== 'obscured_area' || effect.payload.placement === 'selected_when_cast') {
@@ -181,6 +188,7 @@
   observer: CellObserver,
   obscuredCells: ReadonlyMap<string, CellObscurement>,
 ): readonly GridCell[] {
+  // D626.3: ordinary darkness is target-cell illumination, never intervening opacity.
   return allCells(state).filter((cell) => {
     const obscurement = obscuredCells.get(cellKey(cell));
     if (obscurement === undefined) return false;
diff --git a/src/combat/world-objects.ts b/src/combat/world-objects.ts
index 975f059ea33c3e2ed5bc9221546007343b764ac5..0483bdf644e500efdac843a400960a953da40b71
--- a/src/combat/world-objects.ts
+++ b/src/combat/world-objects.ts
@@ -84,7 +84,7 @@
   /** Later entries take precedence when light regions overlap. */
   readonly lightRegions: readonly LightRegion[];
   readonly difficultTerrainRegions: readonly EnvironmentRegion[];
-  /** Subject-cell visibility regions; ray-intersection geometry is deliberately absent. */
+  /** Cell membership facts; the visibility field decides target and ray-intersection effects. */
   readonly obscurementRegions: readonly ObscurementRegion[];
   /** Authored apertures only; never inferred from terrain or blockers. */
   readonly narrowOpeningRegions: readonly NarrowOpeningRegion[];
diff --git a/src/vtt/intel/option-outcome.ts b/src/vtt/intel/option-outcome.ts
index d30b6caabeabe2f667e5e75040112c23d921041d..e9cd33d3975f5c207457bd5f68ef2e6a0bc1115e
--- a/src/vtt/intel/option-outcome.ts
+++ b/src/vtt/intel/option-outcome.ts
@@ -311,6 +311,7 @@
   damage_resistances: 'unsupported',
   damage_rider: 'unsupported',
   darkvision: 'unsupported',
+  devils_sight: 'unsupported',
   daylight_area: 'unsupported',
   death_ward: 'unsupported',
   detect_thoughts: 'unsupported',
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index df39f97ef373f386af2cc7fee7c7a90595ef0f57..33bb310667257ce74145c776ea9b8ae51f433582
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -18,7 +18,6 @@
 import type { CombatSense } from '../../../src/combat/statblock';
 import { feetPoint } from '../../../src/combat/templates';
 import {
-  combatantId,
   effectStackingIdentity,
   encounterEffectId,
   feet,
@@ -65,7 +64,7 @@
     bounds: options.bounds ?? { columns: 5, rows: 3 },
     combatants: options.combatants ?? [observer],
     tokens: options.tokens ?? [combatToken(observer, options.position ?? { column: 0, row: 0 })],
-    blockedCells: options.blockedCells,
+    ...(options.blockedCells === undefined ? {} : { blockedCells: options.blockedCells }),
     environment: options.environment ?? EMPTY_ENVIRONMENT,
   });
 }
@@ -205,6 +204,21 @@
       '1,0:seen_dim',
       '2,0:unseen',
     ]);
+
+    const darkvision = withSenses(normalProfile('raw-light-darkvision'), [
+      { kind: 'normal_sight' },
+      { kind: 'darkvision', rangeFeet: 60 },
+    ]);
+    const darkvisionState = fieldState(darkvision, {
+      bounds: { columns: 3, rows: 1 },
+      environment: state.environment,
+    });
+    // Hand oracle: Darkvision upgrades the same dim cell to seen and dark cell to seen_dim.
+    expect(gradeRows(visibilityField(darkvisionState, darkvision.id))).toEqual([
+      '0,0:seen',
+      '1,0:seen',
+      '2,0:seen_dim',
+    ]);
   });
 
   it('LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible', () => {
@@ -226,22 +240,32 @@
       '0,0:seen',
       '1,0:seen_dim',
     ]);
+
+    const truth = withSenses(normalProfile('light-obscurement-truth'), [
+      { kind: 'normal_sight' },
+      { kind: 'truesight', rangeFeet: 30 },
+    ]);
+    const truthState = fieldState(truth, {
+      bounds: { columns: 2, rows: 1 },
+      environment: state.environment,
+    });
+    // Hand distance: Truesight reaches the lightly obscured target at 5 feet.
+    expect(gradeAt(truthState, truth, 1)).toBe('seen');
   });
 
   it('LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE', () => {
     const observer = normalProfile('ordinary-darkness-ray-observer');
-    const darkCells = [0, 1, 2].flatMap((row) => [1, 2].map((column) => ({ column, row })));
+    const darkCells = [0, 1, 2, 3, 4, 5].map((row) => ({ column: 1, row }));
     const state = fieldState(observer, {
-      bounds: { columns: 4, rows: 3 },
-      position: { column: 0, row: 1 },
+      bounds: { columns: 6, rows: 6 },
       environment: {
         ...EMPTY_ENVIRONMENT,
         lightRegions: [{ id: 'dark-air', cells: darkCells, level: 'darkness' }],
       },
     });
 
-    // Hand geometry: columns 1-2 are unlit, but the bright target at (3,1) remains visible.
-    expect(gradeAt(state, observer, 3, 1)).toBe('seen');
+    // Hand geometry: all rays to bright (4,2) cross unlit column 1, which D626.3 keeps transparent.
+    expect(gradeAt(state, observer, 4, 2)).toBe('seen');
   });
 
   it('UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN', () => {
@@ -308,22 +332,27 @@
       { kind: 'normal_sight' },
       { kind: 'truesight', rangeFeet: 60 },
     ]);
+    const blind = withSenses(normalProfile('magic-dark-blind'), [
+      { kind: 'normal_sight' },
+      { kind: 'blindsight', rangeFeet: 60 },
+    ]);
     const subject = normalProfile('magic-dark-subject');
     const state = createEncounter({
-      bounds: { columns: 8, rows: 5 },
-      combatants: [normal, darkvision, devil, truth, subject],
+      bounds: { columns: 8, rows: 6 },
+      combatants: [normal, darkvision, devil, truth, blind, subject],
       tokens: [
         placedToken(normal, 0, 0),
         placedToken(darkvision, 0, 1),
         placedToken(devil, 0, 2),
         placedToken(truth, 0, 3),
-        placedToken(subject, 4, 2),
+        placedToken(blind, 0, 4),
+        placedToken(subject, 4, 3),
       ],
       environment: {
         ...EMPTY_ENVIRONMENT,
         obscurementRegions: [{
           id: 'spell-darkness',
-          cells: [{ column: 4, row: 2 }],
+          cells: [{ column: 4, row: 3 }],
           obscurement: 'magical_darkness',
         }],
       },
@@ -335,12 +364,31 @@
       sightToCreature(state, darkvision.id, subject.id),
       sightToCreature(state, devil.id, subject.id),
       sightToCreature(state, truth.id, subject.id),
+      sightToCreature(state, blind.id, subject.id),
     ]).toEqual([
       { kind: 'unseen', reason: 'darkness' },
       { kind: 'unseen', reason: 'darkness' },
       { kind: 'visible', grade: 'seen', sense: 'devils_sight' },
       { kind: 'visible', grade: 'seen', sense: 'truesight' },
+      { kind: 'visible', grade: 'seen', sense: 'blindsight' },
     ]);
+
+    const screenedFor = (observer: CombatantProfile): EncounterState => {
+      const clear = fieldState(observer, {
+        bounds: { columns: 6, rows: 6 },
+        combatants: [observer, subject],
+        tokens: [placedToken(observer, 0, 0), placedToken(subject, 4, 2)],
+      });
+      return applyEffect(clear, observer, obscuredAreaEffect('magical_darkness'));
+    };
+    // Hand geometry: the effect's 10-foot-wide vertical screen crosses every corner ray.
+    expect([
+      sightToCreature(screenedFor(normal), normal.id, subject.id).kind,
+      sightToCreature(screenedFor(darkvision), darkvision.id, subject.id).kind,
+      sightToCreature(screenedFor(devil), devil.id, subject.id).kind,
+      sightToCreature(screenedFor(truth), truth.id, subject.id).kind,
+      sightToCreature(screenedFor(blind), blind.id, subject.id).kind,
+    ]).toEqual(['unseen', 'unseen', 'visible', 'visible', 'visible']);
   });
 
   it('HEAVY_FOG_BLOCKS_TRUESIGHT at the target and on intervening rays', () => {
@@ -429,22 +477,28 @@
       rules: { ...base.rules, sizeCategory: 'Large' },
     }, [
       { kind: 'normal_sight' },
-      { kind: 'darkvision', rangeFeet: 10 },
+      { kind: 'darkvision', rangeFeet: 15 },
     ]);
     const state = fieldState(observer, {
-      bounds: { columns: 4, rows: 2 },
+      bounds: { columns: 6, rows: 4 },
       environment: {
         ...EMPTY_ENVIRONMENT,
         lightRegions: [{
           id: 'large-edge',
-          cells: [{ column: 3, row: 0 }],
+          cells: [{ column: 4, row: 2 }],
           level: 'darkness',
         }],
+        obscurementRegions: [{
+          id: 'large-best-cell-fog',
+          cells: [0, 1, 2, 3].map((row) => ({ column: 2, row })),
+          obscurement: 'heavy',
+        }],
       },
     });
 
-    // Hand distance: nearest occupied cell (1,0) to target (3,0) is 10 feet; anchor distance is 15.
-    expect(gradeAt(state, observer, 3)).toBe('seen_dim');
+    // Hand geometry: nearest occupied cell (1,1) is 15 feet away and its right edge clears fog column 2.
+    // The first occupied cell (0,0) alone has all four rays to (4,2) screened by that full-height column.
+    expect(gradeAt(state, observer, 4, 2)).toBe('seen_dim');
   });
 
   it('BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog', () => {
@@ -756,7 +810,7 @@
     expect(sightToCreature(obscured, observer.id, subject.id).kind).toBe('unseen');
   });
 
-  it('CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL', () => {
+  it('CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL and EFFECT_EXPIRY_REMOVAL', () => {
     const source = normalProfile('cache-sense-source');
     const observer = normalProfile('cache-sense-observer');
     const clear = fieldState(observer, {
@@ -790,25 +844,41 @@
   it('EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint', () => {
     const actor = normalProfile('empty-blocker-actor');
     const coverCases = [
-      { blockedCells: [] as readonly GridCell[], expected: 'none' },
-      { blockedCells: [{ column: 2, row: 0 }], expected: 'half' },
-      { blockedCells: [{ column: 2, row: 0 }, { column: 1, row: 1 }], expected: 'three_quarters' },
       {
+        bounds: { columns: 6, rows: 6 },
+        to: { column: 4, row: 2 },
+        blockedCells: [] as readonly GridCell[],
+        expected: 'none',
+      },
+      {
+        bounds: { columns: 6, rows: 2 },
+        to: { column: 4, row: 0 },
+        blockedCells: [{ column: 2, row: 0 }],
+        expected: 'half',
+      },
+      {
+        bounds: { columns: 6, rows: 4 },
+        to: { column: 4, row: 2 },
+        blockedCells: [{ column: 2, row: 0 }, { column: 1, row: 1 }],
+        expected: 'three_quarters',
+      },
+      {
+        bounds: { columns: 6, rows: 6 },
+        to: { column: 4, row: 2 },
         blockedCells: [0, 1, 2, 3, 4, 5].map((row) => ({ column: 1, row })),
         expected: 'total',
       },
     ] as const;
     for (const entry of coverCases) {
       const state = fieldState(actor, {
-        bounds: { columns: 6, rows: 6 },
-        position: { column: 5, row: 5 },
+        bounds: entry.bounds,
         blockedCells: entry.blockedCells,
       });
-      const omitted = traceTerrainLine(state, { column: 0, row: 0 }, { column: 4, row: 2 });
+      const omitted = traceTerrainLine(state, { column: 0, row: 0 }, entry.to);
       const empty = traceTerrainLine(
         state,
         { column: 0, row: 0 },
-        { column: 4, row: 2 },
+        entry.to,
         { additionalSightBlockingCells: [] },
       );
       expect(omitted.tier).toBe(entry.expected);
@@ -921,20 +991,23 @@
       files.field.indexOf('export function cellsThatCanSee'),
       files.field.indexOf('export function eligibleVisibilityObserverIds'),
     );
+    const detectionPath = files.encounter.slice(
+      files.encounter.indexOf('export function detectCombatant('),
+      files.encounter.indexOf('export function canCombatantSee('),
+    );
 
     expect(actualPath).toContain('evaluateCell(');
     expect(virtualPath).toContain('evaluateCell(');
-    expect(files.encounter).toContain('sightToCreature(state, observer, subject)');
+    expect(detectionPath).toContain('sightToCreature(state, observer, subject)');
+    expect(detectionPath).not.toContain('traceCombatantLine(');
+    expect(detectionPath).not.toContain('environmentLightAt(');
+    expect(detectionPath).not.toContain('environmentObscurementAt(');
     expect(files.visibility).not.toContain("from './visibility-field'");
-    expect(files.engineQuery).toContain('traceTerrainLine(');
+    expect(files.engineQuery).toContain('traceCombatantLine(');
     expect(files.actorKnowledge).toContain('detectCombatant(');
     expect(files.semantic).not.toContain("from '../combat/visibility-field'");
-    expect([
-      'src/combat/visibility.ts: pending B3',
-      'src/vtt/engine-query-port.ts: pending B2; physical cover callers remain legitimate',
-      'src/vtt/intel/actor-knowledge.ts: pending B2',
-      'src/vtt/semantic-board-payload.ts: pending B6',
-    ]).toHaveLength(4);
+    // Pending migrations: visibility.ts in B3; engine-query-port.ts and actor-knowledge.ts in B2;
+    // semantic-board-payload.ts in B6. Engine query's physical-cover trace callers stay legitimate.
   });
 
   it('PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE', () => {
@@ -947,11 +1020,5 @@
     expect(body).toContain('sightToCreature(state, observer, subject)');
     expect(body).not.toContain('environmentLightAt(');
     expect(body).not.toContain('environmentObscurementAt(');
-  });
-});
-
-describe('VIS-FIELD-01 cache fixture ids remain branded and deterministic', () => {
-  it('uses a concrete non-observer id only as a type-level fixture sanity check', () => {
-    expect(combatantId('combatant:visibility-field-sanity')).toBe('combatant:visibility-field-sanity');
   });
 });
diff --git a/tests/unit/vtt/senses.test.ts b/tests/unit/vtt/senses.test.ts
index 69e85fb8ece99a9a100ccad749beb59bf367d730..ad4620d1f339a83701de0145dd1fbb3f8040077f
--- a/tests/unit/vtt/senses.test.ts
+++ b/tests/unit/vtt/senses.test.ts
@@ -15,6 +15,8 @@
   type LoadedContentPack,
   type LoadedContentMonster,
 } from '../../../src/content/content-pack';
+import { contentPackOperationJsonSchema } from '../../../src/content/content-pack-operation-schema';
+import { FORM_REPLACEMENT_RETAINED_STATISTICS } from '../../../src/combat/spells/types';
 import { placedToken, playerProfile } from '../combat/fixtures';
 
 const FIXTURE_PATH = 'tests/fixtures/content-pack-v1-homebrew.json';
@@ -109,6 +111,129 @@
 }
 
 describe('D348.1 imported combat senses and subject-cell obscurement', () => {
+  it('ALLY_CAST_DARKVISION_APPLIES to the touched observer rather than the caster', () => {
+    const caster = playerProfile('ally-darkvision-caster', {
+      initiativeBonus: 30,
+      spellSlots: [{ level: 2, maximum: 1 }],
+    });
+    const observer = playerProfile('ally-darkvision-observer', { initiativeBonus: 20 });
+    const subject = playerProfile('ally-darkvision-subject', { initiativeBonus: -20 });
+    let state = createEncounter({
+      bounds: { columns: 14, rows: 2 },
+      combatants: [caster, observer, subject],
+      tokens: [
+        placedToken(caster, 0, 1),
+        placedToken(observer, 0, 0),
+        placedToken(subject, 12, 0),
+      ],
+      environment: {
+        lightRegions: [{
+          id: 'ally-darkvision-dark-target',
+          cells: [{ column: 12, row: 0 }],
+          level: 'darkness',
+        }],
+        difficultTerrainRegions: [],
+        movementRegions: [],
+        narrowOpeningRegions: [],
+        obscurementRegions: [],
+      },
+    });
+    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
+    state = reduceEncounter(state, {
+      type: 'cast_spell',
+      actor: caster.id,
+      spellId: 'darkvision',
+      slotLevel: 2,
+      castAsRitual: false,
+      casterLevel: 3,
+      attackBonus: 5,
+      saveDc: 13,
+      spellcastingModifier: 3,
+      targets: [observer.id],
+      area: null,
+      weaponAttack: null,
+      selectedOption: null,
+    }, () => 0.5).state;
+
+    // Hand distance: observer-to-subject is 60 feet, within the sourced 150-foot spell grant.
+    expect(state.effects).toContainEqual(expect.objectContaining({
+      source: caster.id,
+      targets: [observer.id],
+      payload: { kind: 'darkvision', rangeFeet: 150 },
+    }));
+    expect(canCombatantSee(state, observer.id, subject.id)).toBe(true);
+  });
+
+  it('FORM_DEVILS_SIGHT_SCHEMA_IS_STRICT', () => {
+    const operation = {
+      kind: 'form_replacement',
+      form: {
+        kind: 'stat_override',
+        stats: {
+          id: 'night-hound',
+          name: 'Night Hound',
+          sizeCategory: 'Medium',
+          armorClass: 13,
+          hitPointMaximum: 7,
+          speedFeet: 40,
+          initiativeBonus: 2,
+          savingThrowBonuses: {
+            strength: 2,
+            dexterity: 2,
+            constitution: 1,
+            intelligence: -2,
+            wisdom: 1,
+            charisma: -1,
+          },
+          attacksPerAction: 1,
+          reachFeet: 5,
+          damageResponses: [],
+          conditionImmunities: [],
+          senses: [
+            { kind: 'normal_sight' },
+            { kind: 'devils_sight', rangeFeet: 120 },
+          ],
+          actions: [{
+            kind: 'attack',
+            id: 'night-bite',
+            name: 'Night Bite',
+            attackBonus: 4,
+            delivery: { kind: 'melee', reachFeet: 5 },
+            damage: [{
+              average: 4,
+              dice: { count: 1, sides: 6, modifier: 1 },
+              type: 'Necrotic',
+              trigger: { kind: 'always' },
+            }],
+            attackRollAdvantage: null,
+            onHit: [],
+          }],
+        },
+      },
+      retainedStatistics: FORM_REPLACEMENT_RETAINED_STATISTICS,
+      hitPoints: 'temporary_form_pool',
+      equipmentDisposition: 'merged_into_form',
+      actionAccess: 'form_statblock_only',
+      spellcasting: 'prohibited',
+      lifecycle: {
+        concentration: true,
+        durationRounds: 10,
+        expiresAt: 'source_start',
+      },
+    } as const;
+    const malformed = structuredClone(operation) as unknown as {
+      form: { stats: { senses: Array<Record<string, unknown>> } };
+    };
+    malformed.form.stats.senses[1] = {
+      kind: 'devils_sight',
+      rangeFeet: 120,
+      ignoresFog: true,
+    };
+
+    expect(contentPackOperationJsonSchema.safeParse(operation).success).toBe(true);
+    expect(contentPackOperationJsonSchema.safeParse(malformed).success).toBe(false);
+  });
+
   it('blindsight_ignores_range and blindsight_range_boundary: sees at exactly 30 feet and not one 5-foot cell beyond', () => {
     // Blindsight: docs/srd/full/srd-5.2.1.txt:11356-11362.
     const observer = importedSightProfile('boundary-blindsight', [

tokens used
1,215,986
Batch 1 is complete across the amended eleven-file manifest.

## Implementation summary

- [visibility-field.ts](src/combat/visibility-field.ts:26) adds exhaustive grades/outcomes, one shared evaluator, actual fields, creature aggregation, reverse cell eligibility, eligible observers, derived fog, and state-scoped caching.
- [cover.ts](src/combat/cover.ts:163) accepts optical blockers without changing physical cover. Physical and optical corner selections are independent at lines 358–398 and 491–503; blocker signatures enter all three caches at lines 439–442, 532–537, and 563–568.
- [statblock.ts](src/combat/statblock.ts:31) and [effects.ts](src/combat/effects.ts:642) add `devils_sight`.
- [combat-rules.ts](src/combat/combat-rules.ts:43) now merges targeted Darkvision/Devil’s Sight effects by maximum range.
- [encounter.ts](src/combat/encounter.ts:2185) delegates detection to `sightToCreature`; tremorsense/web sense and Hidden/Invisible overlays remain. Perception consumes `seen_dim` at lines 4784–4798.
- [world-objects.ts](src/combat/world-objects.ts:87) clarifies that obscurement regions are cell facts interpreted by the field.
- [content-pack-operation-schema.ts](src/content/content-pack-operation-schema.ts:84) updates the exhaustive payload inventory and strict form-sense schema at line 600.
- [option-outcome.ts](src/vtt/intel/option-outcome.ts:314) received the separately authorized one-record delta:

```text
1 insertion, 0 deletions
devils_sight: 'unsupported'
```

This mirrors `darkvision`: both are persistent perception grants and do not independently resolve an option outcome.
- [visibility-field.test.ts](tests/unit/combat/visibility-field.test.ts:188) adds 26 tests.
- [senses.test.ts](tests/unit/vtt/senses.test.ts:114) adds two tests: actual ally-cast Darkvision and strict form Devil’s Sight validation.

No `foggedCells` declaration or consumer was removed.

## Hand-authored test oracles

The tests state their geometry inline:

- 3×1 bright/dim/dark fields, including RAW Darkvision upgrades.
- Bright `(4,2)` across a full-height ordinary-dark column remains visible under D626.3; an unlit target remains unseen.
- D576 wall strip blocks every corner ray.
- Concrete heavy and magical `obscured_area` screens cross every ray.
- Normal, Darkvision, Devil’s Sight, Truesight, and Blindsight magical-darkness matrix.
- Heavy fog defeats Truesight at both target and intervening cells.
- Darkvision 60/65-foot and Devil’s Sight 120/125-foot boundaries.
- Large observer: nearest occupied cell is 15 feet away and clears the fog screen; anchor-only tracing does not.
- Blinded field, Blindsight-through-fog, and Blinded Tremorsense `located`.
- Large subject visible through one bright footprint cell.
- Invisible subject retains all three reverse-eligibility origins while detection remains `invisible`.
- Every ordered fixture pair agrees between field and `detectCombatant`.
- State-scoped cache changes after movement, light change, obscurement ending, and sense-effect removal.
- Empty optical blockers preserve exact traces for all four cover tiers and Large footprints.
- Sight-only blockers preserve physical cover even when the preferred optical corner differs.

## RED-first evidence

Initial command:

```text
npx vitest run tests/unit/combat/visibility-field.test.ts tests/unit/vtt/senses.test.ts
```

Result:

```text
Test Files  2 failed (2)
Tests       27 failed | 9 passed (36)
```

The named failures covered light grades, ordinary darkness, walls, Fog Cloud, magical Darkness, heavy fog, range edges, Large footprints, Blinded/Blindsight/Tremorsense, transpose, agreement, active senses, caches, cover separation, single-owner architecture, and Perception integration.

## Mutants

Pristine source hashes used before and restored after every mutation:

```text
VF = 7a289247c83105a196c60b77b8934b44616d7d4b01222de3b0cbe13be846b17c
CV = b7db5da3d8d8c7bf03c1d8dc64f28644435daf4578f241f5fcd6c7f077035ffe
CR = 8b6c2494e22d2dd9f4a9791919e1d0c5115322a548fe2315936657225a154401
EN = f8c9f575ba51d089daad1d9af44651820b8b394552826ed5ac49f09adac8100d
```

| Mutant | Before → mutant SHA | Killing assertion |
|---|---|---|
| `RANGE_IGNORED` | VF → `a8189c876c47201b160979a6ae5532b156bdca76c3ade29d1149d8b8fb4dca60` | expected `[seen_dim, unseen]`, received `[seen_dim, seen_dim]` |
| `INTERVENING_OBSCUREMENT_IGNORED` | VF → `fe16200c6c8b590ddb1fda5738a248da8d3e59fa5bc01e56ef9f6805c327b3f3` | expected `unseen/blocked`, received visible |
| `DEVILS_SIGHT_IGNORED` | VF → `82df381fe10f071f67defd05eaedcf7887d788908c11a27f44207df57572840c` | Devil’s Sight expected visible, received `unseen/darkness` |
| `DIM_TREATED_AS_DARK` | VF → `5344c1aeca37fa35c18aa1d811bec72de095e5619f0c68e9abf691763f15c01d` | expected `1,0:seen_dim`, received `1,0:unseen` |
| `ORDINARY_DARKNESS_MADE_INTERVENING` | VF → `85bdb7b12bb4a5ec9aec00141b3db212af6fde4b15b4554ac44494deb470258a` | expected `seen`, received `unseen` |
| `TRUESIGHT_DEFEATS_FOG` | VF → `54ee961060f97fb329642da22c232832b234a3f88dc5163de8f957907ad03ba6` | expected `unseen/obscured`, received visible |
| `BLINDED_PHYSICAL_SIGHT_ALLOWED` | VF → `62f99ecb93d95c9916b80a994655e455da27fdb2c31e472e73098958152bf386` | expected three unseen cells, received three seen cells |
| `BLINDSIGHT_IGNORED` | VF → `d869a8787da6e64665b0b48f52864d22ef65b317a17e49e984deb1c53cd2a693` | expected `blindsight`, received `normal_sight` |
| `BEST_FOOTPRINT_CORNER_IGNORED` | CV → `507c8b42edfd583217b1b3517c72d1aa3a3818273ea1d26277d5db1c40a27c9f` | expected `seen_dim`, received `unseen` |
| `SIGHT_BLOCKER_BECOMES_TOTAL_COVER` | CV → `20639724cec99243e973f13e509094482a2708ad5217435b30f4a45462f9200d` | expected corner `(1,0)`, no cover; received `(0,0)`, Total Cover |
| `OPTICAL_BLOCKER_CHANGES_COVER_CORNER` | CV → `5235e5c2dc4d94aacd36ee192964125185d108ce39d679b9a949bd7ee37f121d` | expected corner `(1,0)`, no cover; received `(0,0)`, Half Cover |
| `SIGHT_BLOCKER_CACHE_KEY_OMITTED` | CV → `31075af4e9f4076ecf3b73269339798aea5fb698e6df0820832920cfd659a989` | expected empty middle trace `blocksSight=false`, received `true` |
| `SENSE_EFFECT_REQUIRES_SELF_SOURCE` | CR → `e66431223f121b0d504a190b91e190c5ffd4376e8788bd6bada4915c22b77d6d` | expected ally-touched observer visible, received false |
| `SENSE_MERGE_TAKES_FIRST` | CR → `a662fb40e6c788b149e108938f8a8c0305330f8540ada4c1e4d4db76a0a7b71a` | expected `seen_dim`, received `unseen` |
| `FIELD_DETECT_DIVERGES` | EN → `fcacc1951dbafb2fa4bb5bbb712b4597e0b5260e4593def5f78c1c31a99033e5` | agreement pair expected false, received true |

Each mutant exited 1; each named baseline rerun exited 0 after `cp` restoration.

## Final green

TypeScript:

```text
npx tsc -p tsconfig.app.json --noEmit   → exit 0
npx tsc -p tsconfig.node.json --noEmit  → exit 0
```

Suites:

```text
visibility-field.test.ts  26/26
senses.test.ts            10/10
terrain.test.ts           13/13
creature-cover.test.ts     5/5
Total                     54/54
Tests added               28
```

Final checks:

```text
git diff --check → exit 0
git status --short --untracked-files=all → exactly 11 amended-manifest files
```

Maximum added-line lengths by file were 30–112 columns; no added line exceeds 120.

Hashes:

```text
Plan:
6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f

package-lock.json:
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

VIS-FIELD B1 DONE
