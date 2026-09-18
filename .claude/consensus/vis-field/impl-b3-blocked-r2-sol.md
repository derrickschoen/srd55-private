BLOCKED: Restoring the unchanged scene-snapshot pin and fixture inputs leaves the required pin red.

Command:

```text
npx vitest run tests/unit/vtt/scene-snapshot.test.ts \
  -t 'preserves full persisted request/coordinator bytes and the actual revision checksum'
```

Result: 1 failed, 7 skipped.

`projectPlayerView` now derives concealment instead of consuming `state.foggedCells`, changing the persisted `visibleState` embedded in the pending request:

- `pendingRequestHash`: expected `a0e19e…d44a`, received `fdaf87…fa6e`
- `coordinatorHash`: expected `336fc5…4f22`, received `c31c02…b0d`
- `revisionChecksum`: expected `519a01…1d3d`, received `15ba35…1dc`

The hard-coded pin at `tests/unit/vtt/scene-snapshot.test.ts:227-231` and both removed fixture inputs were restored. Per D626.7, I stopped without deleting, normalizing, or repinning the hashes.
diff --git a/tests/unit/bridge/decision-program.test.ts b/tests/unit/bridge/decision-program.test.ts
index ff4be3b44ba21af734687221ca305c3901a2058a..59d7f98e7ebbf0b0972c3e4b57b623207d1b6544
--- a/tests/unit/bridge/decision-program.test.ts
+++ b/tests/unit/bridge/decision-program.test.ts
@@ -55,6 +55,7 @@
       placedToken(playerA, 3),
       placedToken(playerB, 7),
     ],
+    foggedCells: [{ column: 1, row: 0 }],
     dmNotes: ['hidden bridge tactic sentinel'],
   });
   const state: EncounterState = {
diff --git a/tests/unit/vtt/regret.test.ts b/tests/unit/vtt/regret.test.ts
index 07b5ce9daba721c877c7859ed5e0f03e73989ba9..4bd5ab4b0cf16ecbb2ac0097d3227f29c77de559
--- a/tests/unit/vtt/regret.test.ts
+++ b/tests/unit/vtt/regret.test.ts
@@ -36,6 +36,7 @@
     config: { initiativeMode: 'per_combatant' },
     bounds: setup.bounds,
     blockedCells: setup.blockedCells,
+    foggedCells: setup.foggedCells,
     dmNotes: setup.dmNotes,
     combatants: setup.combatants,
     tokens: setup.tokens,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 2a6a2289212d724a4f79bef3fb58d873fb2efd45..184e83ef41def2d50d7668fa391561ec424d7a3d
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -224,6 +224,11 @@
       tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
     });
     const after = persistedByteBaseline(state, coordinator);
+    expect(before).toEqual({
+      pendingRequestHash: 'a0e19e534b070ffc1a82b2f303588573578852bc75720abd780af7e749e0d44a',
+      coordinatorHash: '336fc59733a7f90a51b0cb1dbe95ce690a411ef0dab428fc5ef3c9f1e5344f22',
+      revisionChecksum: '519a01b4fdcc4f02bf8f8c925c8ec70acd09443924944bac454dcb293a751d3d',
+    });
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',

tokens used
1,655,630
BLOCKED: Restoring the unchanged scene-snapshot pin and fixture inputs leaves the required pin red.

Command:

```text
npx vitest run tests/unit/vtt/scene-snapshot.test.ts \
  -t 'preserves full persisted request/coordinator bytes and the actual revision checksum'
```

Result: 1 failed, 7 skipped.

`projectPlayerView` now derives concealment instead of consuming `state.foggedCells`, changing the persisted `visibleState` embedded in the pending request:

- `pendingRequestHash`: expected `a0e19e…d44a`, received `fdaf87…fa6e`
- `coordinatorHash`: expected `336fc5…4f22`, received `c31c02…b0d`
- `revisionChecksum`: expected `519a01…1d3d`, received `15ba35…1dc`

The hard-coded pin at `tests/unit/vtt/scene-snapshot.test.ts:227-231` and both removed fixture inputs were restored. Per D626.7, I stopped without deleting, normalizing, or repinning the hashes.
