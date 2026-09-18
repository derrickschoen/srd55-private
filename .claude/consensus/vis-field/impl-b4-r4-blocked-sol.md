# VIS-FIELD B4 r4 — sol BLOCKED (resumed 01a0abb8…): revision checksum changes after authored-fog removal

Blocked by the explicit D635.8 stop condition.

The required scene-snapshot change was applied at `tests/unit/vtt/scene-snapshot.test.ts:235`: derived DM fog is hand-pinned to `[{ column: 4, row: 3 }]`.

Running:

```text
npx vitest run --configLoader runner tests/unit/vtt/scene-snapshot.test.ts \
  -t 'preserves full persisted request/coordinator bytes and the actual revision checksum'
```

produced:

```text
Test Files  1 failed (1)
Tests       1 failed | 7 skipped (8)

expected revisionChecksum:
cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767

received revisionChecksum:
df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee
```

The failure is at `tests/unit/vtt/scene-snapshot.test.ts:248`. The pending-request and coordinator hashes remained unchanged.

Before stopping, I reconfirmed the D569 base using `75c2f44a`:

```text
npx vite-node tools/vtt-handoff/generate-fixtures.ts --check
```

Exit `0`, 4.22 seconds. Before/after hashes were identical:

```text
6c481b2b98984c81b2d7b8c62d303a1241d2d5f0d9ebf640384d3ebb899d3dd6  fixtures/scenes/two-room.v1.json
3c2b7623771c12e19f79a90863ab239b7687c97f8803e62ad38ab0d096991d09  fixtures/scenes/two-room.snapshots.v1.json
9fc9a587d6be9899168e06846e114f14e5dba93c8bcd032f69c5d1ef2d99480d  fixtures/protocol/examples.v1.json
```

The protocol producer equality test also passed: `1 passed | 5 skipped`, duration 5.20 seconds.

No fixture regeneration, hash update, mutants, or remaining implementation was performed after detecting the forbidden checksum change.

BLOCKED: scene-snapshot revision checksum changed after authored fog removal
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 4647d5df759e7955a793d308c7bdb3cb6a3eda5c..1fb79ca3b081524ab9df4944a158eed4d3bf6bec
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -231,8 +231,10 @@
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
     // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
     // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Ordinary darkness still conceals (4,3); authored fog remains exactly (8,1),(8,2).
-    expect(state.foggedCells).toEqual([{ column: 8, row: 1 }, { column: 8, row: 2 }]);
+    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
+    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
+    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
+    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
     expect(view.concealedCells).toEqual([
       { column: 4, row: 3 },
       { column: 7, row: 4 },
