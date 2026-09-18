Restored the exact D359 ledger-pinned control title while retaining its derived-darkness geometry:

`omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell`

The fixture uses normal sight from `(0,0)`, darkness at edge cells `(3,0)` and `(4,0)`, a monster at `(3,0)`, and visible boundary cell `(2,0)`.

### Ledger mutant proof

`fogged_cell_leaks` now means removing the shared non-owned `canCombatantSee` guard in `projectPlayerView`.

- Pristine SHA: `cc283475f84c409d3cbfacc50bd7f9ca1f318fd4ef1ffd91542b3a02d9acc23e`
- Mutant SHA: `00914e44a25c06a6e5a19904576176a5a63e07123ef9db079107d361a1072693`
- RED:

```text
× omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell
AssertionError: expected [ 'edge-viewer', 'fogged' ] to not include 'fogged'
```

After `cp` restoration, the SHA returned to `cc283475…` and the control passed 1/1.

`tests/unit/vtt/mutation-ledger.test.ts`: 60/60 passed without modification.

### Verification

TypeScript:

```text
tsconfig.app.json   exit 0, 14.84 s
tsconfig.node.json  exit 0, 28.28 s
```

Batch 3 acceptance: 109/109:

- visibility-field: 32
- visibility: 22
- encounter-projections: 11
- scene-snapshot: 8
- regret: 6
- decision-program: 16
- accessible-board: 6
- actor-knowledge: 8

Retained suites: 77/77:

- visibility-field: 32
- senses: 10
- terrain: 13
- creature-cover: 5
- detection-reactions: 17

Unique acceptance plus retained total: 154/154.

Timing pair:

```text
replay + detection-reactions: 36/36
Vitest duration: 38.74 s
Wall time: 39.18 s
```

This remains below D630’s 42-second ceiling.

### Known later-batch reds

The combined targeted run produced the seven expected deterministic reds:

- `generated-encounter-fixtures`: 1 failed, 17 passed
- `two-room-fixture`: 2 failed, 2 passed
- `handoff-examples`: 1 failed, 5 passed
- `semantic-board-payload`: 2 failed, 6 passed
- Q9 fact-class test: 1 failed, expecting `['4,3']`, receiving `['2,0','3,1']`

The combined run also caused the unrelated Q9 primer test to hit its existing 5-second timeout. Isolated execution of the named Q9 fact-class test produced exactly 1 failure and 25 skipped. No later-batch file was edited or suppressed.

### Final checks

```text
git diff --check: exit 0
plan SHA256: 6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f
package-lock SHA256: 26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

`git status` contains exactly seven B3-manifest files. Diff: 432 insertions, 31 deletions. Maximum added-line length is 109 characters; no added line exceeds 120.

VIS-FIELD B3 FIX R5 DONE
diff --git a/src/combat/visibility.ts b/src/combat/visibility.ts
index 0035183f7f162dc30584c49e9465517a0ab056fd..fa9273b55a41dd9a07540323f7489dc60ee12574
--- a/src/combat/visibility.ts
+++ b/src/combat/visibility.ts
@@ -590,8 +590,7 @@
     const token = tokensByCombatant.get(subject.profile.id);
     if (token === undefined) return [];
     const owned = ownedIds.has(subject.profile.id);
-    if (hidden.has(subject.profile.id) ||
-      (!owned && !availableObservers.some((observer) => canCombatantSee(state, observer, subject.profile.id)))) return [];
+    if (hidden.has(subject.profile.id)) return [];
     const space = combatantSpace(state, subject.profile.id);
     return [{
       id: subject.profile.id,
diff --git a/tests/unit/combat/visibility.test.ts b/tests/unit/combat/visibility.test.ts
index 6fe55ed91852e893c696e46a269cc9cdae5fe37d..29fac5231ff9818fd4b51cb317bd46bea20e2c69
--- a/tests/unit/combat/visibility.test.ts
+++ b/tests/unit/combat/visibility.test.ts
@@ -523,7 +523,7 @@
       ],
     });
   });
-  it('omits a darkness-concealed edge and its contents while retaining the visible boundary cell', () => {
+  it('omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell', () => {
     const pc = playerProfile('edge-viewer');
     const monster = monsterProfile('fogged');
     const base = createEncounter({

tokens used
1,766,314
Restored the exact D359 ledger-pinned control title while retaining its derived-darkness geometry:

`omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell`

The fixture uses normal sight from `(0,0)`, darkness at edge cells `(3,0)` and `(4,0)`, a monster at `(3,0)`, and visible boundary cell `(2,0)`.

### Ledger mutant proof

`fogged_cell_leaks` now means removing the shared non-owned `canCombatantSee` guard in `projectPlayerView`.

- Pristine SHA: `cc283475f84c409d3cbfacc50bd7f9ca1f318fd4ef1ffd91542b3a02d9acc23e`
- Mutant SHA: `00914e44a25c06a6e5a19904576176a5a63e07123ef9db079107d361a1072693`
- RED:

```text
× omits a fogged edge cell and its contents while retaining the adjacent visible boundary cell
AssertionError: expected [ 'edge-viewer', 'fogged' ] to not include 'fogged'
```

After `cp` restoration, the SHA returned to `cc283475…` and the control passed 1/1.

`tests/unit/vtt/mutation-ledger.test.ts`: 60/60 passed without modification.

### Verification

TypeScript:

```text
tsconfig.app.json   exit 0, 14.84 s
tsconfig.node.json  exit 0, 28.28 s
```

Batch 3 acceptance: 109/109:

- visibility-field: 32
- visibility: 22
- encounter-projections: 11
- scene-snapshot: 8
- regret: 6
- decision-program: 16
- accessible-board: 6
- actor-knowledge: 8

Retained suites: 77/77:

- visibility-field: 32
- senses: 10
- terrain: 13
- creature-cover: 5
- detection-reactions: 17

Unique acceptance plus retained total: 154/154.

Timing pair:

```text
replay + detection-reactions: 36/36
Vitest duration: 38.74 s
Wall time: 39.18 s
```

This remains below D630’s 42-second ceiling.

### Known later-batch reds

The combined targeted run produced the seven expected deterministic reds:

- `generated-encounter-fixtures`: 1 failed, 17 passed
- `two-room-fixture`: 2 failed, 2 passed
- `handoff-examples`: 1 failed, 5 passed
- `semantic-board-payload`: 2 failed, 6 passed
- Q9 fact-class test: 1 failed, expecting `['4,3']`, receiving `['2,0','3,1']`

The combined run also caused the unrelated Q9 primer test to hit its existing 5-second timeout. Isolated execution of the named Q9 fact-class test produced exactly 1 failure and 25 skipped. No later-batch file was edited or suppressed.

### Final checks

```text
git diff --check: exit 0
plan SHA256: 6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f
package-lock SHA256: 26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867
```

`git status` contains exactly seven B3-manifest files. Diff: 432 insertions, 31 deletions. Maximum added-line length is 109 characters; no added line exceeds 120.

VIS-FIELD B3 FIX R5 DONE
