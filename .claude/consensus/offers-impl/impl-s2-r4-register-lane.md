Updated only [creature-space.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/combat/creature-space.test.ts:409):

```diff
-      engineCapsuleSchema: '3',
+      // Offers Slice 2 capsule schema 4 (D586.186).
+      engineCapsuleSchema: '4',
```

`PRE_EDIT_POLICY_LITERALS.engineCapsuleSchema` remains `'2'`; no other register or file changed.

Verification:

- `npx vitest run --configLoader runner tests/unit/combat/creature-space.test.ts` — 1 file, 15/15 passed, exit 0. The byte-identical-surfaces test passed.
- `npm run typecheck:fast` — exit 0.
- `sg scan` — exit 0.
- `git diff --check` — exit 0.
- Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Final diff: one hunk, one file, 2 insertions and 1 deletion.

OFFERS-S2 R4 REGISTER DONE
diff --git a/tests/unit/combat/creature-space.test.ts b/tests/unit/combat/creature-space.test.ts
index ddc98f54a2e3142082f755615a61ee88b53533e2..d9ffc2fce77bff0820bc5e12375694a6e14871e1
--- a/tests/unit/combat/creature-space.test.ts
+++ b/tests/unit/combat/creature-space.test.ts
@@ -406,7 +406,8 @@
       dmCapture: 'dm-intel-capture-v2-creature-space',
       renderer: 'turn-context-renderer-v4-creature-space',
       engineActorKnowledge: 'actor-knowledge-v3-last-seen',
-      engineCapsuleSchema: '3',
+      // Offers Slice 2 capsule schema 4 (D586.186).
+      engineCapsuleSchema: '4',
     });
   });
 
