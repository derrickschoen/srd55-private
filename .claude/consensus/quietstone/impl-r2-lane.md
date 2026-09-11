Updated the provenance digest consistently in:

- [bundled-license-files.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/licenses/bundled-license-files.ts)
- [assert-dist-clean.mjs](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/assert-dist-clean.mjs)
- [starter-art.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/starter-art.test.ts)

New digest in the file, declaration, and guard:

```text
39cb7a57256a68c3cbee01fb4efa799b1f4615f144883439d7f18e237a36ae66
```

M52 now checks both `LICENSE-ART` and `ART-PROVENANCE.md`: source digest equals declaration, emitted bytes equal source bytes, and the guard contains the filename and digest.

Gates:

```text
npx vitest run --configLoader runner tests/unit/assets/starter-art.test.ts
1 file passed, 12 tests passed

npm run typecheck:fast
exit 0

sg scan
exit 0

git diff --check
exit 0
```

The exact `npm run build` compiled successfully but exited 1 in the later bundled-content verifier because bare `vite-node` attempted to write under the sandbox’s read-only `node_modules/.vite-temp`. The original provenance license failure is gone.

The dist guard and verifier were proven separately:

```text
npm run build -- dist
exit 0
dist clean: 120 files scanned, control OK, migration control OK, 117 PWA shell files transcribed, 6 licence texts bundled

npx vite-node -c /tmp/quietstone-vite.config.mjs scripts/verify-bundled-content-digest.ts
exit 0
bundled digest clean: 444 aggregates, df17e8173291e3042464a8ffdc8aa8d84530067b60acba9f479b3233d37bb384
```

Frozen contracts remain unchanged at `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

BLOCKED: exact `npm run build` cannot exit 0 in this sandbox because its bare vite-node child writes to read-only node_modules/.vite-temp; the dist license guard and bundled-content verifier independently pass.
diff --git a//tmp/quietstone-vite.config.cjs b//tmp/quietstone-vite.config.cjs
new file mode 100644
index 0000000000000000000000000000000000000000..f053ebf7976e3726d11f3c03fade2170903889a5
--- /dev/null
+++ b//tmp/quietstone-vite.config.cjs
@@ -0,0 +1 @@
+module.exports = {};
diff --git a/tests/unit/assets/starter-art.test.ts b/tests/unit/assets/starter-art.test.ts
index 54fd2bb5ccf03fce90e19e9628bb85954c208dd3..3aec399c2d21797a2ab08711bac16a2c4e3b588b
--- a/tests/unit/assets/starter-art.test.ts
+++ b/tests/unit/assets/starter-art.test.ts
@@ -233,19 +233,21 @@
     expect(text('NOTICE.md')).toContain('[LICENSE-ART](LICENSE-ART)');
     expect(renderLegalPage()).toContain(STARTER_ART_ATTRIBUTION);
 
-    const declaration = BUNDLED_LICENSE_FILES.find(
-      (entry) => entry.fileName === 'LICENSE-ART',
-    );
-    expect(declaration?.sha256).toBe(sha256(bytes('LICENSE-ART')));
-    const emitted = bundledLicenseAssets(repositoryRoot).find(
-      (entry) => entry.fileName === 'LICENSE-ART',
-    );
-    expect(Buffer.from(emitted?.source ?? []).toString('utf8')).toBe(
-      text('LICENSE-ART'),
-    );
     const guard = text('tools/assert-dist-clean.mjs');
-    expect(guard).toContain('LICENSE-ART');
-    expect(guard).toContain(declaration?.sha256);
+    for (const fileName of ['LICENSE-ART', 'ART-PROVENANCE.md'] as const) {
+      const declaration = BUNDLED_LICENSE_FILES.find(
+        (entry) => entry.fileName === fileName,
+      );
+      expect(declaration?.sha256, fileName).toBe(sha256(bytes(fileName)));
+      const emitted = bundledLicenseAssets(repositoryRoot).find(
+        (entry) => entry.fileName === fileName,
+      );
+      expect(Buffer.from(emitted?.source ?? []).toString('utf8'), fileName).toBe(
+        text(fileName),
+      );
+      expect(guard, fileName).toContain(`'${fileName}'`);
+      expect(guard, fileName).toContain(declaration?.sha256);
+    }
   });
 
   it('contains only the procedural and authored source union with unchanged contributors', () => {
diff --git a/tools/assert-dist-clean.mjs b/tools/assert-dist-clean.mjs
index 138c76f1a272166b6972b7ff2d7a02ba7308c1a8..c52649bfb6f2c1407f2dc461f613f6ce05958930
--- a/tools/assert-dist-clean.mjs
+++ b/tools/assert-dist-clean.mjs
@@ -137,7 +137,7 @@
   ],
   [
     'ART-PROVENANCE.md',
-    '2f59edbec2577cab34827a115bb1dc53f07391983e7b4a1933371c74d70d3de2',
+    '39cb7a57256a68c3cbee01fb4efa799b1f4615f144883439d7f18e237a36ae66',
   ],
   [
     'licenses/SRD-5.1-ATTRIBUTION.txt',
diff --git a/tools/licenses/bundled-license-files.ts b/tools/licenses/bundled-license-files.ts
index 0cb57395eba3e21b27c755961e4077c91f3955e1..0703469f115739892ff603d74d3190bbfc915376
--- a/tools/licenses/bundled-license-files.ts
+++ b/tools/licenses/bundled-license-files.ts
@@ -86,7 +86,7 @@
       sourcePath: 'ART-PROVENANCE.md',
       literal: 'clean-room process',
       sha256:
-        '2f59edbec2577cab34827a115bb1dc53f07391983e7b4a1933371c74d70d3de2',
+        '39cb7a57256a68c3cbee01fb4efa799b1f4615f144883439d7f18e237a36ae66',
     }),
     Object.freeze({
       fileName: 'licenses/SRD-5.1-ATTRIBUTION.txt',
