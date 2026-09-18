# VIS-FIELD B4 r5 — sol BLOCKED (resumed 01a0abb8…): branchRngStateFingerprint also changes

D635.9’s field-diff gate failed, so I stopped before normalization or further implementation.

Using clean HEAD `9a3235da` and the B4 worktree, I captured the first canonical persisted revision body created by the scene-snapshot test. The semantic diff was:

```text
$.encounterState.foggedCells
  HEAD=[{"column":8,"row":1},{"column":8,"row":2}]
  B4=[]
```

The key remains present as `[]`; it is not removed or replaced by derived fog. That matches the B4/B5 split.

However, one additional persisted-body path changed:

```text
$.branchRngStateFingerprint
  HEAD="8651c9282c685fb9fd5650c5df5e5e456e6c2f2a521c30c5c56a945fbaef7dc7"
  B4="163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b"
```

D635.9 explicitly limits the diff to `encounterState.foggedCells` and makes any other path a hard stop.

The required independent hashes remained byte-identical:

```text
pendingRequestHash:
78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049

coordinatorHash:
f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66
```

The revision checksum remains:

```text
HEAD: cd99e1c872f75ec7167c396e27088715990287458d39981b73b376d9e6284767
B4:   df6f2cceaa19f66115b0bcd387212064b02ae288fc63c47b4db8f71a835fa4ee
```

The probe instrumentation was restored with `cp`; `git diff --check` exits `0`. No checksum expectation, fixtures, mutants, or additional implementation were changed after the hard stop.

BLOCKED: persisted revision body also changes branchRngStateFingerprint, outside D635.9’s permitted foggedCells-only diff
diff --git a//tmp/vis-field-b4-revision-head-ayMFPF/tests/unit/vtt/scene-snapshot.test.ts b//tmp/vis-field-b4-revision-head-ayMFPF/tests/unit/vtt/scene-snapshot.test.ts
index 4647d5df759e7955a793d308c7bdb3cb6a3eda5c..c576c57276d7fcfa4fb3a401e49d7b804008b68c
--- a//tmp/vis-field-b4-revision-head-ayMFPF/tests/unit/vtt/scene-snapshot.test.ts
+++ b//tmp/vis-field-b4-revision-head-ayMFPF/tests/unit/vtt/scene-snapshot.test.ts
@@ -1,4 +1,5 @@
 import { describe, expect, it } from 'vitest';
+import { writeFileSync } from '../../helpers/test-filesystem';
 import { combatToken } from '../../../src/combat/combatant';
 import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
 import { createEncounter } from '../../../src/combat/encounter';
@@ -88,6 +89,8 @@
   readonly revisionChecksum: string;
 }
 
+let revisionBodyCaptured = false;
+
 function persistedRevisionChecksum(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
@@ -106,6 +109,11 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
+  if (!revisionBodyCaptured) {
+    const { checksum: _checksum, ...body } = revision;
+    writeFileSync('/tmp/vis-field-b4-revision-head.json', canonicalJson(body));
+    revisionBodyCaptured = true;
+  }
   return revision.checksum;
 }
 
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 1fb79ca3b081524ab9df4944a158eed4d3bf6bec..563b4de1ff754d4420fffca2b4a287d261e0df76
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -1,4 +1,5 @@
 import { describe, expect, it } from 'vitest';
+import { writeFileSync } from '../../helpers/test-filesystem';
 import { combatToken } from '../../../src/combat/combatant';
 import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
 import { createEncounter } from '../../../src/combat/encounter';
@@ -88,6 +89,8 @@
   readonly revisionChecksum: string;
 }
 
+let revisionBodyCaptured = false;
+
 function persistedRevisionChecksum(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
@@ -106,6 +109,11 @@
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
+  if (!revisionBodyCaptured) {
+    const { checksum: _checksum, ...body } = revision;
+    writeFileSync('/tmp/vis-field-b4-revision-worktree.json', canonicalJson(body));
+    revisionBodyCaptured = true;
+  }
   return revision.checksum;
 }
 
