# M-2 plan round 7 lane report (sol resume 01a0a0e3…; owner-authorised two-item edit D623.9), harvested 2026-09-14 15:35

Revised plan: [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md)

### Audit

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
701 39974 .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
a63d3e903439487b6e2898a37411c7634bb1454b9966f9454d2670b4e560c279

maximum line width: 117
lines over 120 columns: 0
```

Whole-path quote probe:

```sh
printf '"tools/assert-dist-clean.mjs"\n' |
  git hash-object --no-filters --stdin-paths
git hash-object --no-filters -- tools/assert-dist-clean.mjs
```

Both returned:

```text
138c76f1a272166b6972b7ff2d7a02ba7308c1a8
```

### Changed plan lines

```text
70  - `unsupported-path` when a path has LF/CR, or its first byte or basename's first byte is `"`.
137 Reject LF, CR, or ASCII `"` as either the path's first byte or the basename's first byte.

234 The first deliberate rewrite replaces the old test `preserves every other parent variable`.
241 The second rewrite replaces scraper line 80 and asserts build contains `node tools/dist-build-cache.mjs`.
242 The third rewrite replaces AI-bridge line 109 and asserts build contains `node tools/dist-build-cache.mjs`.
243 Both import descriptors and assert HIT guard and MISS/BYPASS leaf invoke `tools/assert-dist-clean.mjs`.
244 Both retain `build:dist:validated` containing `node tools/assert-dist-clean.mjs`.
245 These rewrites preserve the public-build guard subject; they neither delete nor weaken it.

288 - `UNSUPPORTED_BATCH_PATH_BYPASS` parameterizes LF, CR, and whole-path/basename leading `"`.
289 - Its quote arm creates ordinary `package.json` and literal `"package.json"` with different bytes.
290 - Its whole-path arm pairs `tools/x.mjs` with literal `"tools/x.mjs"`, also with different bytes.
291 - It must bypass before batch hashing, so Git can never substitute the ordinary file's object ID.

334 - `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts`, guard-route assertion rewrite only.
335 - `tests/unit/ai-bridge/build-boundary.test.ts`, guard-route assertion rewrite only.

346 npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts \
347   tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
348   tests/unit/ai-bridge/build-boundary.test.ts

557 if (path[0] === 34 || basename[0] === 34 || path.includes(10) || path.includes(13)) {
558   throw Error('unsupported-path');
559 }
```

The obsolete statement forbidding modifications to the two boundary tests was removed.

```text
$ git status --short --untracked-files=all
[no output]

$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

PLAN M2 R7 DONE
diff --git a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
index a9952201bd380d98490766fd0c123104e91107b5..827d5ed7b2929fcc55d426db8cb2778b1e1b9fcb
--- a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
+++ b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
@@ -67,7 +67,7 @@
 - `special-index` for any assume-unchanged or skip-worktree entry.
 - `submodule` for any index record whose mode is `160000`.
 - `symlink` for index mode `120000` or a dirty, untracked, or ignored-public symlink.
-- `unsupported-path` when any overlay/public path has LF or CR, or its basename starts with `"`.
+- `unsupported-path` when a path has LF/CR, or its first byte or basename's first byte is `"`.
 - `normalization` for active `core.autocrlf`, a tracked `.gitattributes`, or an effective content attribute.
 - `stale-install` for an absent, malformed, or mismatched hidden npm lock.
 `git ls-files -v -z` is parsed as NUL records.
@@ -134,7 +134,7 @@
 Bypass before hashing when `lstat` identifies a symlink.
 Keep every parsed path as a `Buffer`; do not round-trip path bytes through a JavaScript string.
 Validate every old/new overlay path slot and ignored-public path, including deletions, before `lstat`.
-Reject LF, CR, or a basename whose first byte is ASCII `"`.
+Reject LF, CR, or ASCII `"` as either the path's first byte or the basename's first byte.
 Bytewise sort the remaining extant paths with `Buffer.compare`.
 Send their raw path bytes plus LF to one `git hash-object --no-filters --stdin-paths` process.
 Map its one-hash-per-line output back to the sorted paths and reject a count or syntax mismatch.
@@ -231,13 +231,18 @@
 
 - `overrides an inherited NODE_ENV with production`.
 - `sets NODE_ENV to production when the parent leaves it unset`.
-Deliberately replace the old test `preserves every other parent variable`.
+The first deliberate rewrite replaces the old test `preserves every other parent variable`.
 Name its replacement `drops undeclared parent variables and keeps only execution allowlist values`.
 The replacement must assert that `PATH`, `HOME`, `TMPDIR`, and `TZ` survive.
 It must assert that parent locale values become fixed `LANG=C.UTF-8` and `LC_ALL=C.UTF-8`.
 The replacement must assert that a custom name, `VITE_*`, `NODE_OPTIONS`, and `npm_config_*` do not survive.
 Retain `expect(childEnv).not.toBe(parentEnv)`.
 Retain `expect(parentEnv.NODE_ENV).toBe('development')`.
+The second rewrite replaces scraper line 80 and asserts build contains `node tools/dist-build-cache.mjs`.
+The third rewrite replaces AI-bridge line 109 and asserts build contains `node tools/dist-build-cache.mjs`.
+Both import descriptors and assert HIT guard and MISS/BYPASS leaf invoke `tools/assert-dist-clean.mjs`.
+Both retain `build:dist:validated` containing `node tools/assert-dist-clean.mjs`.
+These rewrites preserve the public-build guard subject; they neither delete nor weaken it.
 Required behavior cases:
 
 - `TRACKED_SRC_CONTENT_MISS` edits tracked source bytes while restoring its original mtime and mode.
@@ -280,8 +285,9 @@
 - `TRACKED_DELETION_MISS` deletes a tracked input and must miss through an explicit deletion record.
 - `OVERLAY_ORDER_IS_CANONICAL` hashes equivalent synthetic NUL records in opposite orders equally.
 - `PATH_BYTES_ARE_NUL_PARSED` covers spaces and tabs without line-based status parsing.
-- `UNSUPPORTED_BATCH_PATH_BYPASS` parameterizes LF, CR, and a basename starting with `"`.
+- `UNSUPPORTED_BATCH_PATH_BYPASS` parameterizes LF, CR, and whole-path/basename leading `"`.
 - Its quote arm creates ordinary `package.json` and literal `"package.json"` with different bytes.
+- Its whole-path arm pairs `tools/x.mjs` with literal `"tools/x.mjs"`, also with different bytes.
 - It must bypass before batch hashing, so Git can never substitute the ordinary file's object ID.
 - `WRONG_ARTIFACT_HEAD_NEVER_HITS` forges a digest-consistent generation with the wrong commit.
 - It must rebuild and must never print `dist cache hit`.
@@ -325,16 +331,11 @@
 
 - `tools/dist-build-cache.mjs`, rewritten.
 - `tests/unit/tools/dist-build-cache.test.ts`, rewritten.
+- `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts`, guard-route assertion rewrite only.
+- `tests/unit/ai-bridge/build-boundary.test.ts`, guard-route assertion rewrite only.
 - `package.json`, script entries only.
 Containment keeps `tools/assert-dist-clean.mjs` and `tools/pwa/service-worker.ts` read-only.
 `tools/serve.mjs:63` and `tools/ai-dm-board-snapshot.ts:306` keep working unchanged.
-The following import probe returned no output with exit 1:
-```sh
-rg -n 'dist-build-cache|productionBuildEnv|distBuildInputDigest' \
-  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
-  tests/unit/ai-bridge/build-boundary.test.ts
-```
-Neither test imports the module, so neither is authorized for modification.
 ## 7. Verification contract
 
 Then run, in order:
@@ -553,7 +554,9 @@
 ).sort(Buffer.compare);
 for (const path of publicPaths) {
   const basename = path.subarray(path.lastIndexOf(47) + 1);
-  if (path.includes(10) || path.includes(13) || basename[0] === 34) throw Error('unsupported-path');
+  if (path[0] === 34 || basename[0] === 34 || path.includes(10) || path.includes(13)) {
+    throw Error('unsupported-path');
+  }
   if (fs.lstatSync(path).isSymbolicLink()) throw Error('symlink');
 }
 const hash = crypto.createHash('sha256');

tokens used
678,735
Revised plan: [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md)

### Audit

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
701 39974 .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
a63d3e903439487b6e2898a37411c7634bb1454b9966f9454d2670b4e560c279

maximum line width: 117
lines over 120 columns: 0
```

Whole-path quote probe:

```sh
printf '"tools/assert-dist-clean.mjs"\n' |
  git hash-object --no-filters --stdin-paths
git hash-object --no-filters -- tools/assert-dist-clean.mjs
```

Both returned:

```text
138c76f1a272166b6972b7ff2d7a02ba7308c1a8
```

### Changed plan lines

```text
70  - `unsupported-path` when a path has LF/CR, or its first byte or basename's first byte is `"`.
137 Reject LF, CR, or ASCII `"` as either the path's first byte or the basename's first byte.

234 The first deliberate rewrite replaces the old test `preserves every other parent variable`.
241 The second rewrite replaces scraper line 80 and asserts build contains `node tools/dist-build-cache.mjs`.
242 The third rewrite replaces AI-bridge line 109 and asserts build contains `node tools/dist-build-cache.mjs`.
243 Both import descriptors and assert HIT guard and MISS/BYPASS leaf invoke `tools/assert-dist-clean.mjs`.
244 Both retain `build:dist:validated` containing `node tools/assert-dist-clean.mjs`.
245 These rewrites preserve the public-build guard subject; they neither delete nor weaken it.

288 - `UNSUPPORTED_BATCH_PATH_BYPASS` parameterizes LF, CR, and whole-path/basename leading `"`.
289 - Its quote arm creates ordinary `package.json` and literal `"package.json"` with different bytes.
290 - Its whole-path arm pairs `tools/x.mjs` with literal `"tools/x.mjs"`, also with different bytes.
291 - It must bypass before batch hashing, so Git can never substitute the ordinary file's object ID.

334 - `tests/unit/tools/scraper-is-never-in-the-bundle.test.ts`, guard-route assertion rewrite only.
335 - `tests/unit/ai-bridge/build-boundary.test.ts`, guard-route assertion rewrite only.

346 npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts \
347   tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
348   tests/unit/ai-bridge/build-boundary.test.ts

557 if (path[0] === 34 || basename[0] === 34 || path.includes(10) || path.includes(13)) {
558   throw Error('unsupported-path');
559 }
```

The obsolete statement forbidding modifications to the two boundary tests was removed.

```text
$ git status --short --untracked-files=all
[no output]

$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

PLAN M2 R7 DONE
