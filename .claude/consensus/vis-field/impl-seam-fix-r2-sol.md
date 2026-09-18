# VIS-FIELD SEAM fix r2 — sol report (resumed 01a0ab3f…, exit 0)

Implemented the D635.3 normalization in [scene-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts:227). The fog assertion and negative mutation control remain unchanged.

Clean-copy D569 proof used `/tmp/vis-field-seam-r2.kxJe0g`:

```bash
git archive HEAD | tar -x -C /tmp/vis-field-seam-r2.kxJe0g
ln -s /home/vagrant/PhpstormProjects/dnd-wt-vis-field/node_modules /tmp/vis-field-seam-r2.kxJe0g/node_modules
```

Pre-seam reproduction:

- `cover.ts` SHA-256: `f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764`
- Command: `npx vitest run --configLoader runner tests/unit/vtt/scene-snapshot.test.ts`
- Result: 1 file passed, 8/8 tests passed; tests 95 ms, duration 4.72 s.

Canonical JSON field diff, pre-seam → seam:

- Pending request:
  - `visibleState.concealedCells`: added `(7,4),(8,4),(9,4)`
  - `visibleState.cells`: removed those same three cells
- Coordinator: only the corresponding fields under `pendingRequest.visibleState`
- Revision body: only the corresponding fields under `coordinatorState.pendingRequest.visibleState`
- No other field changed.

Normalized hashes:

- `pendingRequestHash`: `78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049`
- `coordinatorHash`: `f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66`
- `revisionChecksum`: `cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767`

The comment now hand-derives all corner-ray groups for `(7,4),(8,4),(9,4)`, explains why `(7,3),(8,3)` remain visible, and retains the complete pre-D635 hashes.

Clean-copy proof:

```bash
npx vitest run --configLoader runner tests/unit/vtt/scene-snapshot.test.ts
```

With seam `cover.ts` SHA `c8852c9767b1b8bbc9a7772eb8e65efe908bb8da7ae6e492814bf265d83b1662`:

- 1 file passed
- 8/8 tests passed
- Tests 96 ms; duration 3.41 s

With pre-seam SHA `f1a89e61b505787be7e8742a0af3894030a19d79f4ff276f1e9fd923ca102764`:

- 1 file failed
- 1 failed, 7 passed
- Tests 95 ms; duration 3.55 s
- Failure: old module returned only `{(4,3)}`, rejecting the new four-cell pin.

Typechecks:

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

- Clean copy app: exit 0
- Clean copy node: exit 0
- Worktree app: exit 0
- Worktree node: exit 2, expected B4-owned error:
  `tests/unit/vtt/regret.test.ts(39,24): TS2339: Property 'foggedCells' does not exist...`

Final checks:

```bash
git diff --check
```

Exit 0.

`git status --short` contains exactly the 12 protected B4 files plus the authorized test:

```text
 M src/vtt/d365-sample-dungeon.ts
 M src/vtt/generated-encounter-fixtures.ts
 M src/vtt/handoff/fixtures/two-room.ts
 M src/vtt/reference-encounter.ts
 M src/vtt/stored-character-encounter.ts
 M src/vtt/test-approved-first-skirmish.ts
 M src/vtt/vane-warren.ts
 M tests/unit/vtt/generated-encounter-fixtures.test.ts
 M tests/unit/vtt/handoff-examples.test.ts
 M tests/unit/vtt/scene-snapshot.test.ts
 M tests/unit/vtt/two-room-fixture.test.ts
 M tests/unit/vtt/vane-warren.test.ts
 M tools/vtt-soak.ts
```

SEAM FIX R2 DONE
diff --git a//tmp/vis-field-seam-r2.kxJe0g/tests/unit/vtt/scene-snapshot.test.ts b//tmp/vis-field-seam-r2.kxJe0g/tests/unit/vtt/scene-snapshot.test.ts
index 64acd0d235ab0634919dd1973a0dfc509bf09f3f..4647d5df759e7955a793d308c7bdb3cb6a3eda5c
--- a//tmp/vis-field-seam-r2.kxJe0g/tests/unit/vtt/scene-snapshot.test.ts
+++ b//tmp/vis-field-seam-r2.kxJe0g/tests/unit/vtt/scene-snapshot.test.ts
@@ -224,16 +224,29 @@
       tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
     });
     const after = persistedByteBaseline(state, coordinator);
-    // Fighter (2,3) sees every cell except ordinary-darkness target (4,3); authored fog was (8,1),(8,2).
-    // Clear rays: (3,3)->(7,3), (3,3)->(8,3), and (3,4)->(8,4) graze no blocker interior.
+    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
+    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
+    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
+    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
+    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
+    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
+    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
+    // Ordinary darkness still conceals (4,3); authored fog remains exactly (8,1),(8,2).
     expect(state.foggedCells).toEqual([{ column: 8, row: 1 }, { column: 8, row: 2 }]);
-    expect(view.concealedCells).toEqual([{ column: 4, row: 3 }]);
-    // B3 derived concealment (D626.8/D626.9): a0e19e…d44a -> fdaf87…fa6e; concealed = {(4,3)}.
-    // Coordinator: 336fc5…4f22 -> c31c02…b0d. Revision: 519a01…1d3d -> 15ba35…1dc.
+    expect(view.concealedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 7, row: 4 },
+      { column: 8, row: 4 },
+      { column: 9, row: 4 },
+    ]);
+    // Pre-D635 concealed={(4,3)} and hashes were:
+    // pendingRequest=fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e;
+    // coordinator=c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d;
+    // revision=15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc.
     expect(before).toEqual({
-      pendingRequestHash: 'fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e',
-      coordinatorHash: 'c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d',
-      revisionChecksum: '15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc',
+      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
+      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
+      revisionChecksum: 'cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767',
     });
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 64acd0d235ab0634919dd1973a0dfc509bf09f3f..4647d5df759e7955a793d308c7bdb3cb6a3eda5c
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -224,16 +224,29 @@
       tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
     });
     const after = persistedByteBaseline(state, coordinator);
-    // Fighter (2,3) sees every cell except ordinary-darkness target (4,3); authored fog was (8,1),(8,2).
-    // Clear rays: (3,3)->(7,3), (3,3)->(8,3), and (3,4)->(8,4) graze no blocker interior.
+    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
+    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
+    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
+    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
+    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
+    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
+    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
+    // Ordinary darkness still conceals (4,3); authored fog remains exactly (8,1),(8,2).
     expect(state.foggedCells).toEqual([{ column: 8, row: 1 }, { column: 8, row: 2 }]);
-    expect(view.concealedCells).toEqual([{ column: 4, row: 3 }]);
-    // B3 derived concealment (D626.8/D626.9): a0e19e…d44a -> fdaf87…fa6e; concealed = {(4,3)}.
-    // Coordinator: 336fc5…4f22 -> c31c02…b0d. Revision: 519a01…1d3d -> 15ba35…1dc.
+    expect(view.concealedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 7, row: 4 },
+      { column: 8, row: 4 },
+      { column: 9, row: 4 },
+    ]);
+    // Pre-D635 concealed={(4,3)} and hashes were:
+    // pendingRequest=fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e;
+    // coordinator=c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d;
+    // revision=15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc.
     expect(before).toEqual({
-      pendingRequestHash: 'fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e',
-      coordinatorHash: 'c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d',
-      revisionChecksum: '15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc',
+      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
+      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
+      revisionChecksum: 'cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767',
     });
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
