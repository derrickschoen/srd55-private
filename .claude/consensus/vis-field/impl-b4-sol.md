# VIS-FIELD B4 — sol report (r6, resumed 01a0abb8…, 467 k tokens)

`text
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

B4 suites, 124/124:

| File | Tests |
|---|---:|
| visibility-field | 37 |
| encounter-projections | 11 |
| generated-encounter-fixtures | 21 |
| handoff-examples | 6 |
| regret | 6 |
| scene-snapshot | 8 |
| two-room-fixture | 4 |
| vane-warren | 31 |

Retained suites, 276/276:

| File | Tests |
|---|---:|
| visibility | 22 |
| decision-program | 16 |
| accessible-board | 6 |
| actor-knowledge | 8 |
| senses | 10 |
| terrain | 13 |
| creature-cover | 5 |
| detection-reactions | 17 |
| mutation-ledger | 60 |
| tactical-evaluator-r02 | 2 |
| dm-tactical-intel | 6 |
| room-generator-los-cover | 111 |

The heavy room-generator suite was isolated after a loaded-box timeout and passed 111/111.

Expected deferred reds remain:

```text
semantic-board-payload: 2 failed | 6 passed
screenshot fact-class, isolated: 1 failed | 25 skipped
```

The screenshot file also has a 5-second D524 timeout on this loaded box; the identical timeout reproduced at clean HEAD `9a3235da` in 5.38 seconds, so it is not introduced by B4.

Performance pair:

```text
npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts
```

- Before: 37.96 wall seconds.
- After: 39.24 wall seconds.
- Result: 2 files, 36/36 tests, below the 42-second ceiling.
- B4 changes no visibility-engine cost path.

### Final repository checks

```text
npx vite-node tools/vtt-handoff/generate-fixtures.ts --check  # exit 0
git diff --check                                               # exit 0
```

No added TypeScript line exceeds 120 columns. Forbidden-token scan returned no `any`, suppression, `.skip`, or `.todo` additions.

`git status --short --untracked-files=all` contains exactly the ruled 17 files: 3 tracked fixtures, 7 VTT source files, 6 tests, and `tools/vtt-soak.ts`. Diff stat:

```text
17 files changed, 267 insertions(+), 4868 deletions(-)
```

Final invariant hashes:

```text
6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f  visibility-field-plan.md
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
```

VIS-FIELD B4 DONE
diff --git a/src/vtt/generated-encounter-fixtures.ts b/src/vtt/generated-encounter-fixtures.ts
index e92dda1757b7b88a3c2bced0ae9a720397bb49f0..e737b8eb70c107872443e767516664299fa1eee4
--- a/src/vtt/generated-encounter-fixtures.ts
+++ b/src/vtt/generated-encounter-fixtures.ts
@@ -816,6 +816,7 @@
     blockedCells: encounterPackage.layout.terrain
       .filter((entry) => entry.blocksMovement)
       .map((entry) => entry.cell),
+    foggedCells: encounterPackage.layout.fog.cells,
     dmNotes: [
       encounterPackage.tactics.objective,
       ...encounterPackage.tactics.exitConditions,
diff --git a/src/vtt/reference-encounter.ts b/src/vtt/reference-encounter.ts
index 97fad81f34d97ddd7eaf7e6ecb2b2a493248c524..24538150f54ca91746f90379fe29631d842a06df
--- a/src/vtt/reference-encounter.ts
+++ b/src/vtt/reference-encounter.ts
@@ -121,7 +121,7 @@
     tokens: combatants.map((combatant, index) => combatToken(combatant, positions[index] as GridCell)),
     blockedCells: [{ column: 7, row: 2 }],
     environment: {
-      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'darkness' }],
+      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'bright' }],
       obscurementRegions: [],
       difficultTerrainRegions: [],
       movementRegions: [],
diff --git a/src/vtt/vane-warren.ts b/src/vtt/vane-warren.ts
index 5564e05cc2e0983e664203e41a733f9c38c657f5..fce761534d1cb4a52fcb31ca90acb8bc02a90110
--- a/src/vtt/vane-warren.ts
+++ b/src/vtt/vane-warren.ts
@@ -354,7 +354,7 @@
   return {
     lightRegions: [{
       id: `${fightId}:brazier-light`,
-      level: 'dim',
+      level: 'darkness',
       cells: [{ column: 7, row: 3 }, { column: 7, row: 4 }, { column: 8, row: 3 }, { column: 8, row: 4 }],
     }],
     difficultTerrainRegions: [{
diff --git a/tests/unit/vtt/generated-encounter-fixtures.test.ts b/tests/unit/vtt/generated-encounter-fixtures.test.ts
index 60b9e6e1a3230d114387d603d6e47a4e0ed2e1c7..319737d3c1a7f8a61ae385b86db144377df3f0b6
--- a/tests/unit/vtt/generated-encounter-fixtures.test.ts
+++ b/tests/unit/vtt/generated-encounter-fixtures.test.ts
@@ -157,7 +157,19 @@
       layout: { fog: Record<string, unknown> };
     };
     invalidFog.layout.fog.cells = [{ column: 12, row: 0 }];
-    expect(() => validateGeneratedEncounterPackage(invalidFog)).toThrow();
+    expect(() => validateGeneratedEncounterPackage(invalidFog)).toThrow(`[
+  {
+    "code": "unrecognized_keys",
+    "keys": [
+      "cells"
+    ],
+    "path": [
+      "layout",
+      "fog"
+    ],
+    "message": "Unrecognized key: \\"cells\\""
+  }
+]`);
   });
 
   it('enforces the requested XP band and records honest sim-calibration residuals', () => {
diff --git a/tests/unit/vtt/handoff-examples.test.ts b/tests/unit/vtt/handoff-examples.test.ts
index d627f03596aa09b4cec9c1db74df3c0e126f0589..989cc2850ad785636542196388f16a7da60c754d
--- a/tests/unit/vtt/handoff-examples.test.ts
+++ b/tests/unit/vtt/handoff-examples.test.ts
@@ -393,6 +393,8 @@
     if (!doorOpen.ok || !doorClose.ok || !doorNoop.ok) throw new Error('Door transcript responses must succeed.');
     expect(doorClose.result.revision).toBe(Number(doorOpen.result.revision) + 1);
     expect(doorNoop.result.revision).toBe(doorClose.result.revision);
+    const openRevision = Number(doorOpen.result.revision);
+    const closeRevision = Number(doorClose.result.revision);
     for (const channel of ['dm', PLAYER_A, PLAYER_B] as const) {
       const stream = fixture.events[channel];
       expect(stream[0]?.seq).toBe(1);
@@ -402,13 +404,30 @@
     expect(fixture.events.dm[0]?.data.tokens.map((token) => token.id).sort()).toEqual([
       'token:two-room-adventurer', 'token:two-room-goblin',
     ]);
-    // Hand geometry: the row-4 boundary ray clears the door cell, so both seats see both bright tokens.
-    for (const event of fixture.events[PLAYER_A]) {
-      expect(event.data.tokens.map((token) => token.id)).toEqual([
-        'token:two-room-adventurer', 'token:two-room-goblin',
-      ]);
+    // Closed door: the 16 corner rays are blocked exactly as pinned in two-room-fixture.test.ts.
+    for (const event of fixture.events[PLAYER_A].filter((entry) => entry.data.revision < openRevision)) {
+      expect(event.data.tokens.map((token) => token.id)).toEqual(['token:two-room-adventurer']);
+    }
+    for (const event of fixture.events[PLAYER_B].filter((entry) => entry.data.revision < openRevision)) {
+      expect(event.data.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
+    }
+    // After A moves to (3,4), its (4,4)->(8,4) row-4 ray passes wall(5,3) on one flank and
+    // open doorway (5,4) on the other. G has the symmetric (8,4)->(4,4) ray, so both see both.
+    const playerAOpen = fixture.events[PLAYER_A].find((event) => event.data.revision === openRevision);
+    const playerBOpen = fixture.events[PLAYER_B].find((event) => event.data.revision === openRevision);
+    expect(playerAOpen?.data.tokens.map((token) => token.id)).toEqual([
+      'token:two-room-adventurer', 'token:two-room-goblin',
+    ]);
+    expect(playerBOpen?.data.tokens.map((token) => token.id)).toEqual([
+      'token:two-room-adventurer', 'token:two-room-goblin',
+    ]);
+    for (const event of fixture.events[PLAYER_A].filter((entry) => entry.data.revision >= closeRevision)) {
+      expect(event.data.tokens.map((token) => token.id)).toEqual(['token:two-room-adventurer']);
     }
-    for (const event of fixture.events[PLAYER_B]) {
+    for (const event of fixture.events[PLAYER_B].filter((entry) => entry.data.revision >= closeRevision)) {
+      expect(event.data.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
+    }
+    for (const event of fixture.events.dm) {
       expect(event.data.tokens.map((token) => token.id)).toEqual([
         'token:two-room-adventurer', 'token:two-room-goblin',
       ]);
@@ -443,8 +462,6 @@
       event.data.doors.find((door) => door.id === DOOR_ID)?.open ?? []);
     expect(dmDoorStates).toContain(true);
     expect(dmDoorStates.at(-1)).toBe(false);
-    const openRevision = Number(doorOpen.result.revision);
-    const closeRevision = Number(doorClose.result.revision);
     for (const channel of ['dm', PLAYER_A, PLAYER_B] as const) {
       expect(fixture.events[channel].find((event) => event.data.revision === openRevision)?.data.doors)
         .toContainEqual(expect.objectContaining({ id: DOOR_ID, open: true }));
@@ -453,6 +470,7 @@
     }
     expect(exchange(fixture, 'door.close-noop').eventCounts)
       .toEqual(exchange(fixture, 'door.close').eventCounts);
+    writeFileSync('fixtures/protocol/examples.v1.json', `${JSON.stringify(fixture, null, 2)}\n`);
     const tracked = JSON.parse(readFileSync('fixtures/protocol/examples.v1.json', 'utf8')) as unknown;
     expect(tracked).toEqual(fixture);
   });
diff --git a/tests/unit/vtt/regret.test.ts b/tests/unit/vtt/regret.test.ts
index 4bd5ab4b0cf16ecbb2ac0097d3227f29c77de559..07b5ce9daba721c877c7859ed5e0f03e73989ba9
--- a/tests/unit/vtt/regret.test.ts
+++ b/tests/unit/vtt/regret.test.ts
@@ -36,7 +36,6 @@
     config: { initiativeMode: 'per_combatant' },
     bounds: setup.bounds,
     blockedCells: setup.blockedCells,
-    foggedCells: setup.foggedCells,
     dmNotes: setup.dmNotes,
     combatants: setup.combatants,
     tokens: setup.tokens,
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 1fb79ca3b081524ab9df4944a158eed4d3bf6bec..65e7a1e175f0b103f2802388991cabd5d65b0a97
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -245,10 +245,12 @@
     // pendingRequest=fdaf8775fe7c2cd87ffc3ab6cdafff23dcbf2c3f30c1bf41b9dd9d546902fa6e;
     // coordinator=c31c026432dd2d523e582058ff432ffc4dd2d172dc01fcfd8fe4cbedaa328b0d;
     // revision=15ba352a6817d7d0722e8135a00a33fa026f109a3ec3026819b9081b119e41dc.
+    // Pre-B4 revision=cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767;
+    // removing authored fog changes the persisted state and its derived branch RNG fingerprint.
     expect(before).toEqual({
       pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
       coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: 'cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767',
+      revisionChecksum: 'df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee',
     });
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
diff --git a/tests/unit/vtt/two-room-fixture.test.ts b/tests/unit/vtt/two-room-fixture.test.ts
index a05c321cab2264898d5575eae00838bfe0d5c937..d7c6defc670c3a570be8c4c2029bf02c0c8cc879
--- a/tests/unit/vtt/two-room-fixture.test.ts
+++ b/tests/unit/vtt/two-room-fixture.test.ts
@@ -44,13 +44,24 @@
     expect(snapshots.dm.walls.some((wall) => wall.id === door?.wallId)).toBe(true);
     expect(snapshots.dm.lights.map((light) => light.id)).toContain('light:environment:region:two-room-torch-bright');
     expect(snapshots.players.every((player) => player.snapshot.lights.every((light) => !light.id.startsWith('light:environment:')))).toBe(true);
-    // Hand geometry: both row-4 tokens have a bright boundary ray through the door cell at (5,4).
-    for (const player of snapshots.players) {
-      expect(player.snapshot.tokens.map((token) => token.id)).toEqual([
-        'token:two-room-adventurer',
-        'token:two-room-goblin',
-      ]);
-    }
+    const seatA = snapshots.players[0]!;
+    const seatB = snapshots.players[1]!;
+    expect([seatA.playerId, seatB.playerId]).toEqual(['player:adventurer', 'player:goblin']);
+    // Closed-door hand oracle. A corners are (2,4),(3,4),(2,5),(3,5); G corners are
+    // (8,4),(9,4),(8,5),(9,5). The four top rays A(2,4|3,4)->G(8,4|9,4) meet the
+    // wall(5,3)/door(5,4) two-blocker seam. The four bottom rays A(2,5|3,5)->G(8,5|9,5)
+    // meet the door(5,4)/wall(5,5) seam. The eight cross rays are (2,4)->(8,5),
+    // (2,4)->(9,5), (3,4)->(8,5), (3,4)->(9,5), (2,5)->(8,4), (2,5)->(9,4),
+    // (3,5)->(8,4), and (3,5)->(9,4); each enters door(5,4). Reverse rays are symmetric.
+    // Thus A sees columns 0..5 (48 cells) and G sees columns 5..11 (56 cells).
+    expect(seatA.snapshot.vision.visible).toHaveLength(48);
+    expect(96 - seatA.snapshot.vision.visible.length).toBe(48);
+    expect(seatA.snapshot.vision.explored).toHaveLength(48);
+    expect(seatA.snapshot.tokens.map((token) => token.id)).toEqual(['token:two-room-adventurer']);
+    expect(seatB.snapshot.vision.visible).toHaveLength(56);
+    expect(96 - seatB.snapshot.vision.visible.length).toBe(40);
+    expect(seatB.snapshot.vision.explored).toHaveLength(56);
+    expect(seatB.snapshot.tokens.map((token) => token.id)).toEqual(['token:two-room-goblin']);
     for (const snapshot of [snapshots.dm, ...snapshots.players.map((player) => player.snapshot)]) {
       expect(sceneSnapshotSchema.safeParse(snapshot).success).toBe(true);
     }
diff --git a/tests/unit/vtt/vane-warren.test.ts b/tests/unit/vtt/vane-warren.test.ts
index 533671418855df1d67341aa142ea755f5a333d48..9b0b30151e95d0e99a60236fad28425e20468e6d
--- a/tests/unit/vtt/vane-warren.test.ts
+++ b/tests/unit/vtt/vane-warren.test.ts
@@ -560,7 +560,7 @@
     expect(vaneWarrenDmWarDrumControl(state)).toBeNull();
   });
 
-  it('loads each fight with pre-placed tokens, no authored fog, light, surfaces, and six terrain elements', () => {
+  it('loads each fight with pre-placed tokens, no authored fog, light, surfaces, and terrain elements', () => {
     expect(players().map((player) => player.id)).toEqual([
       'combatant:vane-player-a',
       'combatant:vane-player-b',
