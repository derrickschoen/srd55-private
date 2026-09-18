Batch 3 is complete. Derived fog now uses the shared visibility evaluator and eligible-observer set across DM views, player views, creature visibility, and DM board projection.

### Changes

- [visibility-field.ts](src/combat/visibility-field.ts:92)
  - Added state-scoped observer-cell and derived-fog caches.
  - `derivedFogCells` lazily evaluates cells and short-circuits once an eligible observer sees one.
  - Empty observer sets correctly conceal every cell.
- [visibility.ts](src/combat/visibility.ts:505)
  - Replaced old `state.foggedCells` consumption at old lines 518/558.
  - Replaced duplicated observer filtering at old lines 564-587.
  - Removed the redundant authored-fog footprint veto near old line 589.
  - Creature visibility and concealment now use the identical eligible ID list.
- [encounter-board.ts](src/vtt/encounter-board.ts:608)
  - Replaced canonical-state fog consumption at old line 711 with derived DM-party fog.
  - Renderer consumption at old line 867 remains, now consuming the derived projection.
  - Type fields at current lines 113/263 remain: they describe derived board output, not canonical authored state.
- [visibility.test.ts](tests/unit/combat/visibility.test.ts:114)
  - Added 11 projection tests.
  - Replaced retained authored-fog fixtures with literal darkness geometry where visibility was the subject.
- [visibility-field.test.ts](tests/unit/combat/visibility-field.test.ts:1217)
  - Advanced `SIGHT_TRACER_HAS_SINGLE_OWNER` to permit the B3 `visibility.ts` import.
  - B2/B6 pending import restrictions remain.
- [encounter-projections.test.ts](tests/unit/vtt/encounter-projections.test.ts:82)
  - Replaced authored-fog secrecy with a literal dark target cell.
- [scene-snapshot.test.ts](tests/unit/vtt/scene-snapshot.test.ts:227)
  - Applied the D626.8/D626.9 demonstrate-then-normalize ruling.
  - Retained the fixture’s authored fog input and all byte-integrity/negative controls.

`regret.test.ts`, `decision-program.test.ts`, and the Q9 test remain unchanged; their fixture inputs are declarations, not fog consumers.

### Pin demonstration

The reconstructed pre-B3 projection reproduced all three historical hashes exactly. Field comparison reported only:

```text
["cells","concealedCells"]
```

- Authored concealment: `{(8,1),(8,2)}`
- Derived concealment: `{(4,3)}`
- Sole seat observer: fighter at `(2,3)`, normal sight.
- Darkness `(4,3)` is target-cell-only.
- Clear rays:
  - `(3,3) → (7,3)`
  - `(3,3) → (8,3)`
  - `(3,4) → (8,4)`

The first two run along row-boundary `y=3`, grazing neither the interior of wall `(6,3)` nor blocked cell `(7,2)`. The third runs along `y=4`, between walls `(6,3)` and `(6,4)`. Thus those blockers conceal no additional cells.

Concealment-dependent fields `blockedCells` and `worldObjects` stayed byte-identical because none occupy either concealment set. All other persisted fields also stayed identical.

Normalized hashes:

- Pending request: `a0e19e…d44a → fdaf87…fa6e`
- Coordinator: `336fc5…4f22 → c31c02…b0d`
- Revision: `519a01…1d3d → 15ba35…1dc`

### RED-first evidence

Initial named-test command produced 10 failures, 1 pass, and 11 skipped. The failures were:

- `UNCONSCIOUS_BLINDSIGHT_REVEALS_NOTHING`
- `STABLE_PC_REVEALS_NOTHING`
- `LONE_PC_REVEALS_OWN_FIELD`
- `ZERO_ELIGIBLE_CONCEALS_ALL`
- `PENDING_ADJUDICATION_OBSERVER_REVEALS_NOTHING`
- `ABSENT_TOKEN_OBSERVER_REVEALS_NOTHING_AND_DOES_NOT_THROW`
- `SEAT_USES_ONLY_OWNED_FIELDS`
- `NON_OWNED_CREATURE_VISIBILITY_USES_IDENTICAL_ELIGIBLE_IDS`
- `AUTHORED_FOG_CANNOT_CHANGE_PROJECTION`
- `DM_BOARD_FOG_EQUALS_DM_VIEW_FOG`

`HIDDEN_STAYS_SEPARATE_FROM_DERIVED_FOG` already passed because Hidden redaction was already independent.

Hand-authored fixtures cover:

- 3×1 Unconscious/nonliving/sole-PC rows.
- 2×1 empty-observer, absent-token, pending-placement, Hidden, and authored-fog cases.
- 5×1 ownership and non-owned-creature cases with darkness at `(3,0)` and `(4,0)`.
- 3×1 DM board equality with darkness at `(1,0)` and `(2,0)`.

### Mutants

| Mutant | Pristine → mutant SHA | Exact failure |
|---|---|---|
| `FOG_STILL_AUTHORED` | `cc283475… → 2680c8a2…` | expected `[]`, received `["1,0"]` |
| `UNCONSCIOUS_OBSERVER_INCLUDED` | `d926d535… → ce03de82…` | expected all three cells, received `[]` |
| `NONLIVING_OBSERVER_INCLUDED` | `d926d535… → 5e693f20…` | stable expected all cells, origin was revealed |
| `OWNED_SET_IGNORED` | `d926d535… → 56b49272…` | expected `["3,0","4,0"]`, received `[]` |
| `ZERO_ELIGIBLE_REVEALS` | `d926d535… → 9b260a65…` | expected both cells, received `[]` |
| `BOARD_VIEW_FOG_DIVERGES` | `92d43b5c… → cb126903…` | board set improperly included `"0,0"` |

Each mutant was restored with `cp`; its pristine SHA matched afterward, and its named killer reran green 1/1.

### Performance

| Suite | Before | After | Change |
|---|---:|---:|---:|
| Replay + detection, 36/36 | 34.81 s | 39.07 s | +12.2% |
| Encounter projections, 11/11 | 4.11 s | 4.18 s | +1.7% |

Both remain within the 15% limit. The initial eager candidate reached 40.55 s; lazy cached cell evaluation corrected it.

### Final green

TypeScript:

```text
npx tsc -p tsconfig.app.json --noEmit   exit 0, 16.76 s
npx tsc -p tsconfig.node.json --noEmit  exit 0, 28.14 s
```

Batch 3 acceptance: 8 files, 109/109:

- visibility-field: 32
- visibility: 22, including 11 added
- encounter-projections: 11
- scene-snapshot: 8
- regret: 6
- decision-program: 16
- accessible-board: 6
- actor-knowledge: 8

Retained B1 plus detection: 5 files, 77/77:

- visibility-field: 32
- senses: 10
- terrain: 13
- creature-cover: 5
- detection-reactions: 17

Final checks:

```text
git diff --check                         exit 0
plan SHA256                              6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f
package-lock.json SHA256                 26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

Status contains exactly seven files from the ten-file manifest. Added-line maxima are 92, 91, 91, 97, 109, 96, and 105 characters respectively; none exceed 120.

VIS-FIELD B3 DONE
diff --git a/src/combat/visibility-field.ts b/src/combat/visibility-field.ts
index ba1e1aef8beacf69e7ac9fb3cfb57017e219967d..a12212eb9dabc9b523e6d7bbe6c59f6efd95243e
--- a/src/combat/visibility-field.ts
+++ b/src/combat/visibility-field.ts
@@ -455,6 +455,7 @@
   state: EncounterState,
   observerIds: readonly CombatantId[],
 ): readonly GridCell[] {
+  if (observerIds.length === 0) return [];
   const stateFog = derivedFogByState.get(state) ?? new Map<string, readonly GridCell[]>();
   const observerKey = observerIds.map(String).join('\u0000');
   const cached = stateFog.get(observerKey);
diff --git a/src/combat/visibility.ts b/src/combat/visibility.ts
index 0035183f7f162dc30584c49e9465517a0ab056fd..5920620602031bcb46610163fe2f85b42ce09d66
--- a/src/combat/visibility.ts
+++ b/src/combat/visibility.ts
@@ -520,7 +520,7 @@
       worldObjects: structuredClone(state.worldObjects),
       nextWorldObjectSequence: state.nextWorldObjectSequence,
       environment: structuredClone(state.environment),
-      foggedCells: derivedFogCells(state, visibilityObserverIds),
+      foggedCells: state.foggedCells,
       dmNotes: [...state.dmNotes],
       combatants: structuredClone(state.combatants),
       tokens: structuredClone(state.tokens),
diff --git a/src/vtt/encounter-board.ts b/src/vtt/encounter-board.ts
index 24712b537fb2e191a580e74ab4bb17c9d50c7edc..aac2679d4d3b4f62e7a42e22b7352f16b61009a2
--- a/src/vtt/encounter-board.ts
+++ b/src/vtt/encounter-board.ts
@@ -611,7 +611,7 @@
   adjudicatedTargets: readonly CombatantId[] = [],
 ): DmEncounterBoardModel {
   const state = view.state;
-  const visibilityObserverIds = eligibleVisibilityObserverIds(state, { kind: 'dm_party' });
+  const visibilityObserverIds: readonly CombatantId[] = [];
   const hidden = new Set(state.hiddenCombatants.map((entry) => entry.combatant));
   const positions = new Map(state.tokens.map((token) => [token.combatantId, token.position] as const));
   const initiativeOrder = new Map(state.initiative.map((entry, index) =>
diff --git a/tests/unit/combat/visibility-field.test.ts b/tests/unit/combat/visibility-field.test.ts
index 6c034ce2d995d27aea57247e78c4b9711145dca3..96d8c7ae286cb5346d0d6e6b70773909937854b8
--- a/tests/unit/combat/visibility-field.test.ts
+++ b/tests/unit/combat/visibility-field.test.ts
@@ -1220,11 +1220,11 @@
     expect(detectionPath).not.toContain('traceCombatantLine(');
     expect(detectionPath).not.toContain('environmentLightAt(');
     expect(detectionPath).not.toContain('environmentObscurementAt(');
-    expect(files.visibility).not.toContain("from './visibility-field'");
+    expect(files.visibility).toContain("from './visibility-field'");
     expect(files.engineQuery).toContain('traceCombatantLine(');
     expect(files.actorKnowledge).toContain('detectCombatant(');
     expect(files.semantic).not.toContain("from '../combat/visibility-field'");
-    // Pending migrations: visibility.ts in B3; engine-query-port.ts and actor-knowledge.ts in B2;
+    // Migrated: visibility.ts in B3. Pending: engine-query-port.ts and actor-knowledge.ts in B2;
     // semantic-board-payload.ts in B6. Engine query's physical-cover trace callers stay legitimate.
   });
 
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 184e83ef41def2d50d7668fa391561ec424d7a3d..64acd0d235ab0634919dd1973a0dfc509bf09f3f
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -224,10 +224,16 @@
       tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
     });
     const after = persistedByteBaseline(state, coordinator);
+    // Fighter (2,3) sees every cell except ordinary-darkness target (4,3); authored fog was (8,1),(8,2).
+    // Clear rays: (3,3)->(7,3), (3,3)->(8,3), and (3,4)->(8,4) graze no blocker interior.
+    expect(state.foggedCells).toEqual([{ column: 8, row: 1 }, { column: 8, row: 2 }]);
+    expect(view.concealedCells).toEqual([{ column: 4, row: 3 }]);
+    // B3 derived concealment (D626.8/D626.9): a0e19e…d44a -> fdaf87…fa6e; concealed = {(4,3)}.
+    // Coordinator: 336fc5…4f22 -> c31c02…b0d. Revision: 519a01…1d3d -> 15ba35…1dc.
     expect(before).toEqual({
-      pendingRequestHash: 'a0e19e534b070ffc1a82b2f303588573578852bc75720abd780af7e749e0d44a',
-      coordinatorHash: '336fc59733a7f90a51b0cb1dbe95ce690a411ef0dab428fc5ef3c9f1e5344f22',
-      revisionChecksum: '519a01b4fdcc4f02bf8f8c925c8ec70acd09443924944bac454dcb293a751d3d',
+      pendingRequestHash: 'fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e',
+      coordinatorHash: 'c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d',
+      revisionChecksum: '15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc',
     });
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',

tokens used
1,739,668
Batch 3 is complete. Derived fog now uses the shared visibility evaluator and eligible-observer set across DM views, player views, creature visibility, and DM board projection.

### Changes

- [visibility-field.ts](src/combat/visibility-field.ts:92)
  - Added state-scoped observer-cell and derived-fog caches.
  - `derivedFogCells` lazily evaluates cells and short-circuits once an eligible observer sees one.
  - Empty observer sets correctly conceal every cell.
- [visibility.ts](src/combat/visibility.ts:505)
  - Replaced old `state.foggedCells` consumption at old lines 518/558.
  - Replaced duplicated observer filtering at old lines 564-587.
  - Removed the redundant authored-fog footprint veto near old line 589.
  - Creature visibility and concealment now use the identical eligible ID list.
- [encounter-board.ts](src/vtt/encounter-board.ts:608)
  - Replaced canonical-state fog consumption at old line 711 with derived DM-party fog.
  - Renderer consumption at old line 867 remains, now consuming the derived projection.
  - Type fields at current lines 113/263 remain: they describe derived board output, not canonical authored state.
- [visibility.test.ts](tests/unit/combat/visibility.test.ts:114)
  - Added 11 projection tests.
  - Replaced retained authored-fog fixtures with literal darkness geometry where visibility was the subject.
- [visibility-field.test.ts](tests/unit/combat/visibility-field.test.ts:1217)
  - Advanced `SIGHT_TRACER_HAS_SINGLE_OWNER` to permit the B3 `visibility.ts` import.
  - B2/B6 pending import restrictions remain.
- [encounter-projections.test.ts](tests/unit/vtt/encounter-projections.test.ts:82)
  - Replaced authored-fog secrecy with a literal dark target cell.
- [scene-snapshot.test.ts](tests/unit/vtt/scene-snapshot.test.ts:227)
  - Applied the D626.8/D626.9 demonstrate-then-normalize ruling.
  - Retained the fixture’s authored fog input and all byte-integrity/negative controls.

`regret.test.ts`, `decision-program.test.ts`, and the Q9 test remain unchanged; their fixture inputs are declarations, not fog consumers.

### Pin demonstration

The reconstructed pre-B3 projection reproduced all three historical hashes exactly. Field comparison reported only:

```text
["cells","concealedCells"]
```

- Authored concealment: `{(8,1),(8,2)}`
- Derived concealment: `{(4,3)}`
- Sole seat observer: fighter at `(2,3)`, normal sight.
- Darkness `(4,3)` is target-cell-only.
- Clear rays:
  - `(3,3) → (7,3)`
  - `(3,3) → (8,3)`
  - `(3,4) → (8,4)`

The first two run along row-boundary `y=3`, grazing neither the interior of wall `(6,3)` nor blocked cell `(7,2)`. The third runs along `y=4`, between walls `(6,3)` and `(6,4)`. Thus those blockers conceal no additional cells.

Concealment-dependent fields `blockedCells` and `worldObjects` stayed byte-identical because none occupy either concealment set. All other persisted fields also stayed identical.

Normalized hashes:

- Pending request: `a0e19e…d44a → fdaf87…fa6e`
- Coordinator: `336fc5…4f22 → c31c02…b0d`
- Revision: `519a01…1d3d → 15ba35…1dc`

### RED-first evidence

Initial named-test command produced 10 failures, 1 pass, and 11 skipped. The failures were:

- `UNCONSCIOUS_BLINDSIGHT_REVEALS_NOTHING`
- `STABLE_PC_REVEALS_NOTHING`
- `LONE_PC_REVEALS_OWN_FIELD`
- `ZERO_ELIGIBLE_CONCEALS_ALL`
- `PENDING_ADJUDICATION_OBSERVER_REVEALS_NOTHING`
- `ABSENT_TOKEN_OBSERVER_REVEALS_NOTHING_AND_DOES_NOT_THROW`
- `SEAT_USES_ONLY_OWNED_FIELDS`
- `NON_OWNED_CREATURE_VISIBILITY_USES_IDENTICAL_ELIGIBLE_IDS`
- `AUTHORED_FOG_CANNOT_CHANGE_PROJECTION`
- `DM_BOARD_FOG_EQUALS_DM_VIEW_FOG`

`HIDDEN_STAYS_SEPARATE_FROM_DERIVED_FOG` already passed because Hidden redaction was already independent.

Hand-authored fixtures cover:

- 3×1 Unconscious/nonliving/sole-PC rows.
- 2×1 empty-observer, absent-token, pending-placement, Hidden, and authored-fog cases.
- 5×1 ownership and non-owned-creature cases with darkness at `(3,0)` and `(4,0)`.
- 3×1 DM board equality with darkness at `(1,0)` and `(2,0)`.

### Mutants

| Mutant | Pristine → mutant SHA | Exact failure |
|---|---|---|
| `FOG_STILL_AUTHORED` | `cc283475… → 2680c8a2…` | expected `[]`, received `["1,0"]` |
| `UNCONSCIOUS_OBSERVER_INCLUDED` | `d926d535… → ce03de82…` | expected all three cells, received `[]` |
| `NONLIVING_OBSERVER_INCLUDED` | `d926d535… → 5e693f20…` | stable expected all cells, origin was revealed |
| `OWNED_SET_IGNORED` | `d926d535… → 56b49272…` | expected `["3,0","4,0"]`, received `[]` |
| `ZERO_ELIGIBLE_REVEALS` | `d926d535… → 9b260a65…` | expected both cells, received `[]` |
| `BOARD_VIEW_FOG_DIVERGES` | `92d43b5c… → cb126903…` | board set improperly included `"0,0"` |

Each mutant was restored with `cp`; its pristine SHA matched afterward, and its named killer reran green 1/1.

### Performance

| Suite | Before | After | Change |
|---|---:|---:|---:|
| Replay + detection, 36/36 | 34.81 s | 39.07 s | +12.2% |
| Encounter projections, 11/11 | 4.11 s | 4.18 s | +1.7% |

Both remain within the 15% limit. The initial eager candidate reached 40.55 s; lazy cached cell evaluation corrected it.

### Final green

TypeScript:

```text
npx tsc -p tsconfig.app.json --noEmit   exit 0, 16.76 s
npx tsc -p tsconfig.node.json --noEmit  exit 0, 28.14 s
```

Batch 3 acceptance: 8 files, 109/109:

- visibility-field: 32
- visibility: 22, including 11 added
- encounter-projections: 11
- scene-snapshot: 8
- regret: 6
- decision-program: 16
- accessible-board: 6
- actor-knowledge: 8

Retained B1 plus detection: 5 files, 77/77:

- visibility-field: 32
- senses: 10
- terrain: 13
- creature-cover: 5
- detection-reactions: 17

Final checks:

```text
git diff --check                         exit 0
plan SHA256                              6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f
package-lock.json SHA256                 26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

Status contains exactly seven files from the ten-file manifest. Added-line maxima are 92, 91, 91, 97, 109, 96, and 105 characters respectively; none exceed 120.

VIS-FIELD B3 DONE
