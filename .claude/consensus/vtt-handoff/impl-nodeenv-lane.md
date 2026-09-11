Implemented the scoped fix:

- Added `productionBuildEnv()` and used it for the build child in [dist-build-cache.mjs](/home/vagrant/PhpstormProjects/dnd-wt-nodeenv/tools/dist-build-cache.mjs:132).
- Added 3 unit tests in [dist-build-cache.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-nodeenv/tests/unit/tools/dist-build-cache.test.ts:1).
- `serve.mjs` unchanged because it delegates all building to `dist-build-cache.mjs`.
- No help/dry path exists, so no dry-path regression was added.

Validation:

- `npm run typecheck:fast` — exit 0
- `sg scan` — exit 0
- `git diff --check` — exit 0
- `npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts` — 1 file, 3 tests passed
- `NODE_ENV=test node tools/dist-build-cache.mjs` — exit 0; cache hit `4ce398bd...e4da8e`
- Frozen contract hash remains `0f0e1d8f...f18e1`
- No `tests/unit/tools/serve*.test.ts` specs exist; the new dist-build-cache spec is the only matching spec.
- `grep -c __SRD55_BROWSER_CAPABILITY_PROBE_FAILURE__ dist/assets/*.js` — all 12 chunks printed `0` (grep exit 1 because there were no matches).

One required gate cannot pass within the permitted diff:

- `NODE_ENV=test npm run build` — exit 1
- Vite emitted the seam in `assets/index-L1szxz7-.js`; `assert-dist-clean` rejected it.
- This command invokes `tsc`, Vite, and `assert-dist-clean` directly; it never loads `dist-build-cache.mjs`. Making it pass requires changing `package.json`, Vite configuration, or another prohibited file.

BLOCKED: `NODE_ENV=test npm run build` bypasses the only file authorized to override the build-child environment and still exits 1.
diff --git a/tests/unit/tools/dist-build-cache.test.ts b/tests/unit/tools/dist-build-cache.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..a54a09b68ac464847fca2f8b88555b4ed68194c1
--- /dev/null
+++ b/tests/unit/tools/dist-build-cache.test.ts
@@ -0,0 +1,51 @@
+import { describe, expect, it } from 'vitest';
+
+type ProductionBuildEnv = (
+  parentEnv: Readonly<Record<string, string | undefined>>,
+) => Record<string, string | undefined>;
+
+function exposesProductionBuildEnv(
+  value: unknown,
+): value is { productionBuildEnv: ProductionBuildEnv } {
+  return typeof value === 'object' && value !== null &&
+    'productionBuildEnv' in value &&
+    typeof value.productionBuildEnv === 'function';
+}
+
+const buildCacheModule: unknown = await import(
+  new URL('../../../tools/dist-build-cache.mjs', import.meta.url).href
+);
+if (!exposesProductionBuildEnv(buildCacheModule)) {
+  throw new TypeError('dist-build-cache.mjs does not export productionBuildEnv.');
+}
+const { productionBuildEnv } = buildCacheModule;
+
+describe('productionBuildEnv', () => {
+  it('overrides an inherited NODE_ENV with production', () => {
+    expect(productionBuildEnv({ NODE_ENV: 'test' })).toEqual({
+      NODE_ENV: 'production',
+    });
+  });
+
+  it('sets NODE_ENV to production when the parent leaves it unset', () => {
+    expect(productionBuildEnv({})).toEqual({ NODE_ENV: 'production' });
+  });
+
+  it('preserves every other parent variable', () => {
+    const parentEnv = {
+      NODE_ENV: 'development',
+      PATH: '/example/bin',
+      CUSTOM_BUILD_SETTING: 'kept',
+    };
+
+    const childEnv = productionBuildEnv(parentEnv);
+
+    expect(childEnv).not.toBe(parentEnv);
+    expect(parentEnv.NODE_ENV).toBe('development');
+    expect(childEnv).toEqual({
+      NODE_ENV: 'production',
+      PATH: '/example/bin',
+      CUSTOM_BUILD_SETTING: 'kept',
+    });
+  });
+});
diff --git a/tools/dist-build-cache.mjs b/tools/dist-build-cache.mjs
index 345250bf484f0d4e70239031e2fda1e86fb3edb1..c3624cab56ee234826ffce44cd6ba837c4e473a8
--- a/tools/dist-build-cache.mjs
+++ b/tools/dist-build-cache.mjs
@@ -129,6 +129,13 @@
   return `${String(process.pid)}.${randomBytes(8).toString('hex')}`;
 }
 
+export function productionBuildEnv(parentEnv) {
+  return {
+    ...parentEnv,
+    NODE_ENV: 'production',
+  };
+}
+
 function cachePointer(inputDigest) {
   return join(CACHE_ROOT, `${inputDigest}.json`);
 }
@@ -185,7 +192,7 @@
   process.stdout.write('dist cache miss: running npm run build\n');
   const result = spawnSync('npm', ['run', 'build'], {
     cwd: root,
-    env: process.env,
+    env: productionBuildEnv(process.env),
     stdio: 'inherit',
   });
   if (result.error !== undefined) throw result.error;
