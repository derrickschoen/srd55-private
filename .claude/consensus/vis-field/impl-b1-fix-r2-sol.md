Implemented Fix Round r2 in four allowed manifest files:

- `src/combat/visibility-field.ts`
- `src/combat/encounter.ts`
- `src/combat/cover.ts`
- `tests/unit/combat/visibility-field.test.ts`

No git writes, timeout changes, or out-of-manifest edits.

### Findings addressed

F1 — independent light obscurement:

- Light obscurement is now applied after resolving the seeing sense.
- Only Blindsight bypasses it.
- Truesight in patchy fog now returns `seen_dim`.
- Devil’s Sight defeating overlapping magical darkness still returns `seen_dim` when light obscurement remains.

RED-first:

```text
× LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
Expected: "seen_dim"
Received: "seen"

× DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
Expected grade: "seen_dim"
Received grade: "seen"
```

Both probes are now green.

F2 — sight-impossible Perception:

- `perceptionMode` now returns `RollMode | null`.
- `null` encodes a sight check that cannot occur.
- Active sight-based Search receiving `null` does not roll and emits `not_found`, total `0`.
- `passivePerceptionAgainst` returns `number | null`; blocked/heavily obscured sight returns `null`, and `processHide` excludes it from the passive comparison.
- Hearing remains `normal`.
- Retained general passive awareness in mere darkness continues to support nonvisual cues, preserving the existing darkness tests.

Baseline retained failure:

```text
tests/unit/vtt/detection-reactions.test.ts
15 passed, 1 failed

passive_five_shift
Expected outcome: hidden
Received outcome: passively_detected
```

Final result:

```text
16 passed, 16 total
```

No retained expectation was edited.

F3 — behavioral Perception coverage:

Added `PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR`, with the hand-authored 5-foot oracle:

```text
bright:       12
dim:           7
heavy fog:  null
Keen Sight:   17
```

Added `UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING`, proving a supplied natural 20 cannot find an adjacent heavily obscured target by sight.

Exact mutant:

```text
sight.grade === 'seen_dim'
→
sight.grade === 'seen'
```

Result:

```text
× PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR

Expected: [12, 7, null, 17]
Received: [7, 12, null, 12]
```

Mutation hashes:

```text
Pristine encounter.ts:
6d83b79c41de20daac491b38f234b057e52feb1a2c961604dabb2bc2e94e48b1

Mutated encounter.ts:
85a569b61e56d1bdb57016476069fc226a98752289cfec02c17103540e97245e

Restored encounter.ts:
6d83b79c41de20daac491b38f234b057e52feb1a2c961604dabb2bc2e94e48b1

Visibility-field during mutation, unchanged:
d545ba325bf3cf5143db766e53468ce5d8e77145313a01aef50b5b08d1fb7501
```

F4 — pairwise performance:

- `sightToCreature` now evaluates only subject footprint cells.
- State/observer evaluation contexts and pair results are cached independently of full fields.
- Full `visibilityField`, transpose, and derived-fog work remain lazy.
- Obscurement context construction iterates actual regions instead of every board cell.
- Empty optical-blocker traces avoid unnecessary option processing.
- Cover tracing reuses one blocker-key set per trace and skips redundant candidate deduplication when the optical set is empty.
- Single-cell subjects use a direct evaluation path.

Before:

```text
npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts

4 failed, 31 passed
ELAPSED=69.56
EXIT=1
```

After:

```text
npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts

35 passed, 35 total
ELAPSED=36.77
EXIT=0
```

That is 9.4% over the cited main baseline of 33.6 seconds, within the required 10%.

No timeout was raised. The formerly timing-out room test completed in 4.75 seconds.

### Final suites

```text
visibility-field.test.ts       32/32
senses.test.ts                 10/10
terrain.test.ts                13/13
creature-cover.test.ts          5/5
Batch 1 total                  60/60
```

Three tests were added this round.

```text
npx vitest run tests/unit/combat

44 files passed
1,872/1,872 tests passed
```

Retained F4 suites:

```text
replay.test.ts + detection-reactions.test.ts    35/35
engine-round-session.test.ts                    21/21
room-generator-los-cover.test.ts               111/111
arena-basis-brutal-b.test.ts                    47/47
js-round-plan-integration.test.ts               35/35
soak-runner.test.ts                              7/7
```

### Final verification

```text
npx tsc -p tsconfig.app.json --noEmit
FINAL T-app exit=0

npx tsc -p tsconfig.node.json --noEmit
FINAL T-node exit=0

git diff --check
exit=0
```

Final production hashes:

```text
encounter.ts
87e4068cc05c29cc9c77e6fe2ee856311b460db244943b0ce2a1dd7aa941d735

visibility-field.ts
cb0eb30ebb498f6608e1e48ad269f1f099b68bed6b8c85dcab2fd7c9c066ed04

cover.ts
f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764
```

Round-start hashes were:

```text
encounter.ts
f8c9f575ba51d089daad1d9af44651820b8b394552826ed5ac49f09adac8100d

visibility-field.ts
7a289247c83105a196c60b77b8934b44616d7d4b01222de3b0cbe13be846b17c
```

Final status contains only four allowed manifest files:

```text
 M src/combat/cover.ts
 M src/combat/encounter.ts
 M src/combat/visibility-field.ts
 M tests/unit/combat/visibility-field.test.ts
```

Maximum added-line length: 106 characters. Added lines over 120 characters: 0.

VIS-FIELD B1 FIX R2 DONE
diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index 7b72cdec0fd93f840b368c127b222f93fbffee4b..c6ef04e6bf5665430357c9b1a610ffe3b547c564
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -465,14 +465,18 @@
   const maximumColumn = Math.max(...cornerColumns);
   const minimumRow = Math.min(...cornerRows);
   const maximumRow = Math.max(...cornerRows);
-  const candidates = [...new Map([
-    ...indexedSources.values(),
-    ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),
-  ].map((entry) => [cellKey(entry.cell), entry] as const)).values()]
+  const candidateEntries = sightBlockingCells.length === 0
+    ? [...indexedSources.values()]
+    : [...new Map([
+        ...indexedSources.values(),
+        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),
+      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];
+  const candidates = candidateEntries
     .filter((entry) => !exclusions.has(cellKey(entry.cell)) &&
       entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
       entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
     .map((entry) => entry.cell);
+  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));
   const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
     sourceCorner,
     targetCorners.map((targetCorner) => traceCornerLine(
@@ -480,7 +484,7 @@
       targetCorner,
       candidates,
       (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
-      new Set(sightBlockingCells.map(cellKey)),
+      sightBlockingKeys,
     )),
     nearest.sourceCell,
     nearest.targetCell,
diff --git a/src/combat/encounter.ts b/src/combat/encounter.ts
index 5993a077ecca1e44e2726f425889b84796b2cdde..1812f14bef5d785a82e0c90b2f782e3d25119b04
--- a/src/combat/encounter.ts
+++ b/src/combat/encounter.ts
@@ -40,7 +40,7 @@
   effectiveCreatureSize,
 } from './combat-rules';
 import { EncounterRuleError } from './encounter-rule-error';
-import { sightToCreature } from './visibility-field';
+import { sightToCreature, type SightOutcome } from './visibility-field';
 import {
   coverBetweenCombatants,
   coverTierBetweenObjects as coverTierBetweenWorldObjects,
@@ -4781,31 +4781,51 @@
   });
 }
 
-function perceptionMode(
-  state: EncounterState,
-  observer: CombatantId,
-  subject: CombatantId,
-  reliance: 'sight' | 'hearing',
-): RollMode {
-  if (reliance === 'hearing') return 'normal';
+function keenSightMode(state: EncounterState, observer: CombatantId): RollMode {
   const modes: RollMode[] = ['normal'];
   if (effectiveCombatRules(state, observer).detectionTraits.includes('keen_sight')) {
     modes.push('advantage');
   }
-  const sight = sightToCreature(state, observer, subject);
+  return combineRollModes(modes);
+}
+
+function visibleSightPerceptionMode(
+  state: EncounterState,
+  observer: CombatantId,
+  sight: Extract<SightOutcome, { readonly kind: 'visible' }>,
+): RollMode {
+  const modes: RollMode[] = [keenSightMode(state, observer)];
   // Lightly Obscured sight checks have Disadvantage: docs/srd/full/srd-5.2.1.txt:656-660.
   // Dim Light creates Light Obscurement: docs/srd/full/srd-5.2.1.txt:673-678.
-  if (sight.kind === 'visible' && sight.grade === 'seen_dim') modes.push('disadvantage');
+  if (sight.grade === 'seen_dim') modes.push('disadvantage');
   return combineRollModes(modes);
 }
 
-function passivePerceptionAgainst(
+export function perceptionMode(
+  state: EncounterState,
+  observer: CombatantId,
+  subject: CombatantId,
+  reliance: 'sight' | 'hearing',
+): RollMode | null {
+  if (reliance === 'hearing') return 'normal';
+  const sight = sightToCreature(state, observer, subject);
+  if (sight.kind === 'unseen') return null;
+  return visibleSightPerceptionMode(state, observer, sight);
+}
+
+export function passivePerceptionAgainst(
   state: EncounterState,
   observer: CombatantId,
   subject: CombatantId,
-): number {
+): number | null {
   const rules = effectiveCombatRules(state, observer);
-  const mode = perceptionMode(state, observer, subject, 'sight');
+  const sight = sightToCreature(state, observer, subject);
+  if (sight.kind === 'unseen') {
+    // Retained Hide passive awareness can still use nonvisual cues in mere darkness.
+    if (sight.reason === 'blocked' || sight.reason === 'obscured') return null;
+    return rules.passivePerception + (keenSightMode(state, observer) === 'advantage' ? 5 : 0);
+  }
+  const mode = visibleSightPerceptionMode(state, observer, sight);
   // Passive +/-5: docs/srd/full/srd-5.2.1.txt:11965-11979 (2024) and
   // docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:4470-4488 (2014).
   return rules.passivePerception + (mode === 'advantage' ? 5 : mode === 'disadvantage' ? -5 : 0);
@@ -4863,9 +4883,9 @@
   };
   const finder = enemies.find((enemy) => {
     const detection = detectCombatant(context.state, enemy.profile.id, actor);
-    return detection.kind === 'located' || passivePerceptionAgainst(
-      context.state, enemy.profile.id, actor,
-    ) >= total;
+    const passivePerception = passivePerceptionAgainst(context.state, enemy.profile.id, actor);
+    return detection.kind === 'located' ||
+      (passivePerception !== null && passivePerception >= total);
   });
   if (finder !== undefined) {
     context.state = {
@@ -4899,9 +4919,24 @@
     });
     return;
   }
-  const roll = rollD20(context.rng, perceptionMode(
-    context.state, command.actor, command.target, command.reliance,
-  ), { kind: 'ability_check', source: `search:${command.reliance}`, actor: command.actor, target: command.target });
+  const mode = perceptionMode(context.state, command.actor, command.target, command.reliance);
+  if (mode === null) {
+    emit(context, {
+      type: 'search_resolved', combatant: command.actor, target: command.target,
+      total: 0, outcome: 'not_found',
+    });
+    return;
+  }
+  const roll = rollD20(
+    context.rng,
+    mode,
+    {
+      kind: 'ability_check',
+      source: `search:${command.reliance}`,
+      actor: command.actor,
+      target: command.target,
+    },
+  );
   const total = roll.chosen + (effectiveCombatRules(context.state, command.actor).skillBonuses?.perception ?? 0);
   const found = total >= hidden.stealthTotal;
   emit(context, {
diff --git a/src/combat/visibility-field.ts b/src/combat/visibility-field.ts
index 3e6dd513f1465edb7ec61951cc4ed91ab7ea748d..c98002c27c1c8d603f18b80c172a9d4fb44f514c
--- a/src/combat/visibility-field.ts
+++ b/src/combat/visibility-field.ts
@@ -18,10 +18,7 @@
 import { affectedCells } from './templates';
 import { terrainWallCells } from './terrain';
 import type { CombatantId } from './values';
-import {
-  environmentLightAt,
-  environmentObscurementAt,
-} from './world-objects';
+import { environmentLightAt } from './world-objects';
 
 export type VisibilityGrade = 'seen' | 'seen_dim' | 'unseen';
 export type SightSense =
@@ -70,6 +67,7 @@
 type CellObserver = ActualObserver | VirtualObserver;
 
 interface CellObscurement {
+  readonly cell: GridCell;
   readonly light: boolean;
   readonly heavy: boolean;
   readonly magicalDarkness: boolean;
@@ -90,6 +88,10 @@
   EncounterState,
   Map<CombatantId, readonly DetailedVisibilityFieldCell[]>
 >();
+const observerContexts = new WeakMap<EncounterState, Map<CombatantId, EvaluationContext>>();
+const obscurementByState = new WeakMap<EncounterState, ReadonlyMap<string, CellObscurement>>();
+const virtualOpaqueByState = new WeakMap<EncounterState, readonly GridCell[]>();
+const pairOutcomes = new WeakMap<EncounterState, Map<string, SightOutcome>>();
 
 function cellKey(cell: GridCell): string {
   return `${String(cell.column)},${String(cell.row)}`;
@@ -151,11 +153,13 @@
 ): void {
   const key = cellKey(cell);
   const previous = obscuredCells.get(key) ?? {
+    cell,
     light: false,
     heavy: false,
     magicalDarkness: false,
   };
   obscuredCells.set(key, {
+    cell: previous.cell,
     light: previous.light || kind === 'light',
     heavy: previous.heavy || kind === 'heavy',
     magicalDarkness: previous.magicalDarkness || kind === 'magical_darkness',
@@ -163,13 +167,26 @@
 }
 
 function obscurementCells(state: EncounterState): ReadonlyMap<string, CellObscurement> {
+  const cached = obscurementByState.get(state);
+  if (cached !== undefined) return cached;
   const obscuredCells = new Map<string, CellObscurement>();
-  for (const cell of allCells(state)) {
-    const environmentObscurement = environmentObscurementAt(state.environment, cell);
-    if (environmentObscurement !== null) {
-      addObscurement(obscuredCells, cell, environmentObscurement);
+  const environmentCells = new Map<
+    string,
+    { readonly cell: GridCell; readonly kind: 'light' | 'heavy' | 'magical_darkness' }
+  >();
+  for (const region of state.environment.obscurementRegions) {
+    for (const cell of region.cells) {
+      if (
+        cell.column >= 0 &&
+        cell.column < state.bounds.columns &&
+        cell.row >= 0 &&
+        cell.row < state.bounds.rows
+      ) {
+        environmentCells.set(cellKey(cell), { cell, kind: region.obscurement });
+      }
     }
   }
+  for (const { cell, kind } of environmentCells.values()) addObscurement(obscuredCells, cell, kind);
   for (const effect of state.effects) {
     if (effect.payload.kind !== 'obscured_area' || effect.payload.placement === 'selected_when_cast') {
       continue;
@@ -180,6 +197,7 @@
     }, effect.payload.placement);
     for (const cell of cells) addObscurement(obscuredCells, cell, effect.payload.obscurement);
   }
+  obscurementByState.set(state, obscuredCells);
   return obscuredCells;
 }
 
@@ -189,15 +207,14 @@
   obscuredCells: ReadonlyMap<string, CellObscurement>,
 ): readonly GridCell[] {
   // D626.3: ordinary darkness is target-cell illumination, never intervening opacity.
-  return allCells(state).filter((cell) => {
-    const obscurement = obscuredCells.get(cellKey(cell));
-    if (obscurement === undefined) return false;
+  return [...obscuredCells.values()].flatMap((obscurement) => {
+    const cell = obscurement.cell;
     const blindsight = senseInRange(observer, 'blindsight', cell);
-    if (obscurement.heavy && !blindsight) return true;
+    if (obscurement.heavy && !blindsight) return [cell];
     const magicalDarknessDefeated = blindsight ||
       physicalSenseInRange(observer, 'truesight', cell) ||
       physicalSenseInRange(observer, 'devils_sight', cell);
-    return obscurement.magicalDarkness && !magicalDarknessDefeated;
+    return obscurement.magicalDarkness && !magicalDarknessDefeated ? [cell] : [];
   });
 }
 
@@ -211,12 +228,37 @@
   };
 }
 
+function actualObserverContext(state: EncounterState, observerId: CombatantId): EvaluationContext {
+  const stateContexts = observerContexts.get(state) ?? new Map<CombatantId, EvaluationContext>();
+  const cached = stateContexts.get(observerId);
+  if (cached !== undefined) return cached;
+  const context = evaluationContext(state, observerForCombatant(state, observerId));
+  stateContexts.set(observerId, context);
+  if (!observerContexts.has(state)) observerContexts.set(state, stateContexts);
+  return context;
+}
+
+function virtualEvaluationContext(state: EncounterState, cell: GridCell): EvaluationContext {
+  const observer: VirtualObserver = { kind: 'virtual', cell };
+  const obscuredCells = obscurementCells(state);
+  const cachedOpaque = virtualOpaqueByState.get(state);
+  const opaqueCells = cachedOpaque ?? opaqueCellsForObserver(state, observer, obscuredCells);
+  if (cachedOpaque === undefined) virtualOpaqueByState.set(state, opaqueCells);
+  return { state, observer, obscuredCells, opaqueCells };
+}
+
 function traceToCell(context: EvaluationContext, target: GridCell) {
   if (context.observer.kind === 'virtual') {
+    if (context.opaqueCells.length === 0) {
+      return traceTerrainLine(context.state, context.observer.cell, target);
+    }
     return traceTerrainLine(context.state, context.observer.cell, target, {
       additionalSightBlockingCells: context.opaqueCells,
     });
   }
+  if (context.opaqueCells.length === 0) {
+    return traceCombatantLineToCells(context.state, context.observer.id, [target]);
+  }
   return traceCombatantLineToCells(context.state, context.observer.id, [target], {
     additionalSightBlockingCells: context.opaqueCells,
   });
@@ -240,8 +282,7 @@
   if (
     outcome.kind === 'unseen' ||
     !obscurement?.light ||
-    outcome.sense === 'blindsight' ||
-    outcome.sense === 'truesight'
+    outcome.sense === 'blindsight'
   ) return outcome;
   return visible('seen_dim', outcome.sense);
 }
@@ -258,11 +299,11 @@
   const obscured = context.obscuredCells.get(cellKey(target));
   if (obscured?.heavy) return { kind: 'unseen', reason: 'obscured' };
   const truesight = physicalSenseInRange(observer, 'truesight', target);
-  if (truesight) return visible('seen', 'truesight');
+  if (truesight) return withLightObscurement(visible('seen', 'truesight'), obscured);
   const devilsSight = physicalSenseInRange(observer, 'devils_sight', target);
   if (obscured?.magicalDarkness) {
     return devilsSight
-      ? visible('seen', 'devils_sight')
+      ? withLightObscurement(visible('seen', 'devils_sight'), obscured)
       : { kind: 'unseen', reason: 'darkness' };
   }
 
@@ -300,7 +341,7 @@
   >();
   const cached = stateFields.get(observerId);
   if (cached !== undefined) return cached;
-  const context = evaluationContext(state, observerForCombatant(state, observerId));
+  const context = actualObserverContext(state, observerId);
   const field = Object.freeze(allCells(state).map((cell) => {
     const frozenCell = Object.freeze({ ...cell });
     const outcome = Object.freeze(evaluateCell(context, frozenCell));
@@ -329,16 +370,30 @@
   observerId: CombatantId,
   subjectId: CombatantId,
 ): SightOutcome {
-  const byKey = new Map(actualObserverField(state, observerId).map((entry) => [cellKey(entry.cell), entry]));
-  const entries = combatantSpace(state, subjectId).cells
-    .map((cell) => byKey.get(cellKey(cell)))
-    .filter((entry): entry is DetailedVisibilityFieldCell => entry !== undefined);
-  const seen = entries.find((entry) =>
-    entry.outcome.kind === 'visible' && entry.outcome.grade === 'seen');
-  if (seen?.outcome.kind === 'visible') return seen.outcome;
-  const dim = entries.find((entry) => entry.outcome.kind === 'visible');
-  if (dim?.outcome.kind === 'visible') return dim.outcome;
-  return entries[0]?.outcome ?? { kind: 'unseen', reason: 'blocked' };
+  const stateOutcomes = pairOutcomes.get(state) ?? new Map<string, SightOutcome>();
+  const key = `${String(observerId)}\u0000${String(subjectId)}`;
+  const cached = stateOutcomes.get(key);
+  if (cached !== undefined) return cached;
+  const context = actualObserverContext(state, observerId);
+  const subjectCells = combatantSpace(state, subjectId).cells;
+  const onlyCell = subjectCells.length === 1 ? subjectCells[0] : undefined;
+  let outcome: SightOutcome;
+  if (onlyCell !== undefined) {
+    outcome = evaluateCell(context, onlyCell);
+  } else {
+    const outcomes = subjectCells.map((cell) => evaluateCell(context, cell));
+    const seen = outcomes.find((candidate) => candidate.kind === 'visible' && candidate.grade === 'seen');
+    const dim = outcomes.find((candidate) => candidate.kind === 'visible');
+    outcome = seen?.kind === 'visible'
+      ? seen
+      : dim?.kind === 'visible'
+        ? dim
+        : outcomes[0] ?? { kind: 'unseen', reason: 'blocked' };
+  }
+  const frozen = Object.freeze(outcome);
+  stateOutcomes.set(key, frozen);
+  if (!pairOutcomes.has(state)) pairOutcomes.set(state, stateOutcomes);
+  return frozen;
 }
 
 export function cellsThatCanSee(
@@ -347,7 +402,7 @@
 ): readonly GridCell[] {
   const subjectCells = combatantSpace(state, subjectId).cells;
   return Object.freeze(allCells(state).filter((origin) => {
-    const context = evaluationContext(state, { kind: 'virtual', cell: origin });
+    const context = virtualEvaluationContext(state, origin);
     return subjectCells.some((target) => evaluateCell(context, target).kind === 'visible');
   }).map((cell) => Object.freeze({ ...cell })));
 }
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index e399722db876fb7dac87a60afb86842d01047f63..6c034ce2d995d27aea57247e78c4b9711145dca3
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -11,6 +11,8 @@
   canCombatantSee,
   createEncounter,
   detectCombatant,
+  passivePerceptionAgainst,
+  reduceEncounter,
   type EncounterState,
 } from '../../../src/combat/encounter';
 import type { EffectApplication } from '../../../src/combat/effects';
@@ -249,10 +251,39 @@
       bounds: { columns: 2, rows: 1 },
       environment: state.environment,
     });
-    // Hand distance: Truesight reaches the lightly obscured target at 5 feet.
-    expect(gradeAt(truthState, truth, 1)).toBe('seen');
+    // Hand distance: Truesight reaches the lightly obscured target at 5 feet but does not defeat fog.
+    expect(gradeAt(truthState, truth, 1)).toBe('seen_dim');
   });
 
+  it('DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT', () => {
+    const observer = withSenses(normalProfile('overlap-devils-sight'), [
+      { kind: 'normal_sight' },
+      { kind: 'devils_sight', rangeFeet: 120 },
+    ]);
+    const subject = normalProfile('overlap-devils-subject');
+    const clear = fieldState(observer, {
+      bounds: { columns: 6, rows: 6 },
+      combatants: [observer, subject],
+      tokens: [placedToken(observer, 0, 0), placedToken(subject, 2, 1)],
+      environment: {
+        ...EMPTY_ENVIRONMENT,
+        obscurementRegions: [{
+          id: 'overlap-patchy-fog',
+          cells: [{ column: 2, row: 1 }],
+          obscurement: 'light',
+        }],
+      },
+    });
+    const overlapping = applyEffect(clear, observer, obscuredAreaEffect('magical_darkness'));
+
+    // Hand geometry: the effect line and patchy fog overlap at (2,1), 10 feet from the observer.
+    expect(sightToCreature(overlapping, observer.id, subject.id)).toEqual({
+      kind: 'visible',
+      grade: 'seen_dim',
+      sense: 'devils_sight',
+    });
+  });
+
   it('LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE', () => {
     const observer = normalProfile('ordinary-darkness-ray-observer');
     const darkCells = [0, 1, 2, 3, 4, 5].map((row) => ({ column: 1, row }));
@@ -1067,6 +1098,100 @@
 });
 
 describe('VIS-FIELD-01 shared evaluator boundary', () => {
+  it('PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR', () => {
+    const baseObserver = normalProfile('perception-grade-observer');
+    const observer: CombatantProfile = {
+      ...baseObserver,
+      rules: { ...baseObserver.rules, passivePerception: 12 },
+    };
+    const subject = normalProfile('perception-grade-subject');
+    const stateWith = (environment: EncounterState['environment']): EncounterState =>
+      fieldState(observer, {
+        bounds: { columns: 2, rows: 1 },
+        combatants: [observer, subject],
+        tokens: [placedToken(observer, 0), placedToken(subject, 1)],
+        environment,
+      });
+    const bright = stateWith(EMPTY_ENVIRONMENT);
+    const dim = stateWith({
+      ...EMPTY_ENVIRONMENT,
+      lightRegions: [{
+        id: 'perception-dim',
+        cells: [{ column: 1, row: 0 }],
+        level: 'dim',
+      }],
+    });
+    const heavy = stateWith({
+      ...EMPTY_ENVIRONMENT,
+      obscurementRegions: [{
+        id: 'perception-heavy',
+        cells: [{ column: 1, row: 0 }],
+        obscurement: 'heavy',
+      }],
+    });
+    const keenProfile: CombatantProfile = {
+      ...observer,
+      rules: { ...observer.rules, detectionTraits: ['keen_sight'] },
+    };
+    const keen = fieldState(keenProfile, {
+      bounds: { columns: 2, rows: 1 },
+      combatants: [keenProfile, subject],
+      tokens: [placedToken(keenProfile, 0), placedToken(subject, 1)],
+    });
+
+    // Hand oracle at 5 feet: bright 12, dim 12-5, heavy cannot use sight, Keen Sight 12+5.
+    expect([
+      passivePerceptionAgainst(bright, observer.id, subject.id),
+      passivePerceptionAgainst(dim, observer.id, subject.id),
+      passivePerceptionAgainst(heavy, observer.id, subject.id),
+      passivePerceptionAgainst(keen, keenProfile.id, subject.id),
+    ]).toEqual([12, 7, null, 17]);
+  });
+
+  it('UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING', () => {
+    const observer = normalProfile('search-obscured-observer');
+    const subject = normalProfile('search-obscured-subject');
+    const initial = createEncounter({
+      bounds: { columns: 2, rows: 1 },
+      combatants: [observer, subject],
+      tokens: [placedToken(observer, 0), placedToken(subject, 1)],
+      environment: {
+        ...EMPTY_ENVIRONMENT,
+        obscurementRegions: [{
+          id: 'search-heavy',
+          cells: [{ column: 1, row: 0 }],
+          obscurement: 'heavy',
+        }],
+      },
+    });
+    const started = reduceEncounter(
+      initial,
+      { type: 'roll_initiative' },
+      () => (10 - 0.5) / 20,
+    ).state;
+    const hidden: EncounterState = {
+      ...started,
+      hiddenCombatants: [{ combatant: subject.id, stealthTotal: 1, edition: '2024' }],
+    };
+    const searched = reduceEncounter(hidden, {
+      type: 'search',
+      actor: observer.id,
+      target: subject.id,
+      reliance: 'sight',
+    }, () => (20 - 0.5) / 20);
+
+    // Hand geometry: heavy obscurement covers the adjacent target, so even a natural 20 cannot see it.
+    expect(searched.events).toContainEqual(expect.objectContaining({
+      type: 'search_resolved',
+      total: 0,
+      outcome: 'not_found',
+    }));
+    expect(searched.state.hiddenCombatants).toContainEqual(expect.objectContaining({
+      combatant: subject.id,
+      stealthTotal: 1,
+    }));
+  });
+
   it('SIGHT_TRACER_HAS_SINGLE_OWNER at the Batch 1 migration stage', () => {
     const files = {
       field: readFileSync('src/combat/visibility-field.ts', 'utf8'),

tokens used
1,432,382
Implemented Fix Round r2 in four allowed manifest files:

- `src/combat/visibility-field.ts`
- `src/combat/encounter.ts`
- `src/combat/cover.ts`
- `tests/unit/combat/visibility-field.test.ts`

No git writes, timeout changes, or out-of-manifest edits.

### Findings addressed

F1 — independent light obscurement:

- Light obscurement is now applied after resolving the seeing sense.
- Only Blindsight bypasses it.
- Truesight in patchy fog now returns `seen_dim`.
- Devil’s Sight defeating overlapping magical darkness still returns `seen_dim` when light obscurement remains.

RED-first:

```text
× LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
Expected: "seen_dim"
Received: "seen"

× DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
Expected grade: "seen_dim"
Received grade: "seen"
```

Both probes are now green.

F2 — sight-impossible Perception:

- `perceptionMode` now returns `RollMode | null`.
- `null` encodes a sight check that cannot occur.
- Active sight-based Search receiving `null` does not roll and emits `not_found`, total `0`.
- `passivePerceptionAgainst` returns `number | null`; blocked/heavily obscured sight returns `null`, and `processHide` excludes it from the passive comparison.
- Hearing remains `normal`.
- Retained general passive awareness in mere darkness continues to support nonvisual cues, preserving the existing darkness tests.

Baseline retained failure:

```text
tests/unit/vtt/detection-reactions.test.ts
15 passed, 1 failed

passive_five_shift
Expected outcome: hidden
Received outcome: passively_detected
```

Final result:

```text
16 passed, 16 total
```

No retained expectation was edited.

F3 — behavioral Perception coverage:

Added `PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR`, with the hand-authored 5-foot oracle:

```text
bright:       12
dim:           7
heavy fog:  null
Keen Sight:   17
```

Added `UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING`, proving a supplied natural 20 cannot find an adjacent heavily obscured target by sight.

Exact mutant:

```text
sight.grade === 'seen_dim'
→
sight.grade === 'seen'
```

Result:

```text
× PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR

Expected: [12, 7, null, 17]
Received: [7, 12, null, 12]
```

Mutation hashes:

```text
Pristine encounter.ts:
6d83b79c41de20daac491b38f234b057e52feb1a2c961604dabb2bc2e94e48b1

Mutated encounter.ts:
85a569b61e56d1bdb57016476069fc226a98752289cfec02c17103540e97245e

Restored encounter.ts:
6d83b79c41de20daac491b38f234b057e52feb1a2c961604dabb2bc2e94e48b1

Visibility-field during mutation, unchanged:
d545ba325bf3cf5143db766e53468ce5d8e77145313a01aef50b5b08d1fb7501
```

F4 — pairwise performance:

- `sightToCreature` now evaluates only subject footprint cells.
- State/observer evaluation contexts and pair results are cached independently of full fields.
- Full `visibilityField`, transpose, and derived-fog work remain lazy.
- Obscurement context construction iterates actual regions instead of every board cell.
- Empty optical-blocker traces avoid unnecessary option processing.
- Cover tracing reuses one blocker-key set per trace and skips redundant candidate deduplication when the optical set is empty.
- Single-cell subjects use a direct evaluation path.

Before:

```text
npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts

4 failed, 31 passed
ELAPSED=69.56
EXIT=1
```

After:

```text
npx vitest run tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts

35 passed, 35 total
ELAPSED=36.77
EXIT=0
```

That is 9.4% over the cited main baseline of 33.6 seconds, within the required 10%.

No timeout was raised. The formerly timing-out room test completed in 4.75 seconds.

### Final suites

```text
visibility-field.test.ts       32/32
senses.test.ts                 10/10
terrain.test.ts                13/13
creature-cover.test.ts          5/5
Batch 1 total                  60/60
```

Three tests were added this round.

```text
npx vitest run tests/unit/combat

44 files passed
1,872/1,872 tests passed
```

Retained F4 suites:

```text
replay.test.ts + detection-reactions.test.ts    35/35
engine-round-session.test.ts                    21/21
room-generator-los-cover.test.ts               111/111
arena-basis-brutal-b.test.ts                    47/47
js-round-plan-integration.test.ts               35/35
soak-runner.test.ts                              7/7
```

### Final verification

```text
npx tsc -p tsconfig.app.json --noEmit
FINAL T-app exit=0

npx tsc -p tsconfig.node.json --noEmit
FINAL T-node exit=0

git diff --check
exit=0
```

Final production hashes:

```text
encounter.ts
87e4068cc05c29cc9c77e6fe2ee856311b460db244943b0ce2a1dd7aa941d735

visibility-field.ts
cb0eb30ebb498f6608e1e48ad269f1f099b68bed6b8c85dcab2fd7c9c066ed04

cover.ts
f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764
```

Round-start hashes were:

```text
encounter.ts
f8c9f575ba51d089daad1d9af44651820b8b394552826ed5ac49f09adac8100d

visibility-field.ts
7a289247c83105a196c60b77b8934b44616d7d4b01222de3b0cbe13be846b17c
```

Final status contains only four allowed manifest files:

```text
 M src/combat/cover.ts
 M src/combat/encounter.ts
 M src/combat/visibility-field.ts
 M tests/unit/combat/visibility-field.test.ts
```

Maximum added-line length: 106 characters. Added lines over 120 characters: 0.

VIS-FIELD B1 FIX R2 DONE
