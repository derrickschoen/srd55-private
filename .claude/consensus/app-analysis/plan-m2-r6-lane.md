# M-2 plan round 6 lane report (sol resume 01a0a0e3…), harvested 2026-09-14 15:05

Revised plan: [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md)

Chosen F2 resolution: contained guard execution under the cache module’s fixed locale on HIT, MISS, and BYPASS.

### Final audit

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
698 39445 .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
aa9dcbdec118087c2cad3b1155125211cb46fd71d07cae9e9aa4734cd2280f52

maximum line width: 117
lines over 120 columns: 0
```

| Finding | Plan sections |
|---|---|
| PR5-F1 | 3.2, 3.5, 5, 8 |
| PR5-F2 | 3.6, 4–7 |
| PR5-F3 | 3.2, 3.5, 5, 8 |
| PR5-F4 | 7 |
| PR5-F5 | 3.5, 5, 8 |
| PR5-F6 | 5 |

### Re-run probes

The complete exact Node heredoc is included in section 8.

```text
records=11504 index_bytes=1657692 status_bytes=0
attribute_checks=57520 active_attributes=0
attribute_check_ms=52.340
special=0 symlinks=0 submodules=0 ignored_public=0
eligible=273 hidden=273 lock_mismatches=0/0/0
key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
complete_verdict_ms=200.545
verdict_wall_seconds=0.22
```

F1 commands:

```sh
printf '"package.json"\n' | git hash-object --no-filters --stdin-paths
printf 'package.json\r\n' | git hash-object --no-filters --stdin-paths
git hash-object --no-filters -- package.json
```

All three returned:

```text
151844f8b27eb5fa917d1065b1afa7197f9234ce
```

The corresponding two-file fixture must now bypass before hashing:

```text
dist cache bypass: unsupported-path
```

Final repository checks:

```text
HEAD: fdcd0c445525caf82619fab04f3037e416c2e3b1
branch: claude/build-cache
index records: 11504
status bytes: 0
ignored-public records: 0

$ git status --short --untracked-files=all
[no output]

$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

PLAN M2 R6 DONE
diff --git a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
index 91abc1e2a51e7161fda990d93db415db5aa2569c..a9952201bd380d98490766fd0c123104e91107b5
--- a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
+++ b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
@@ -48,6 +48,7 @@
 - `vite.config.ts:114-125` writes `git rev-parse HEAD` into `vtt-handoff-artifact.json`.
 - `vite.config.ts:167-183` derives and emits the service worker after enumerating deployable assets.
 - `vite.config.ts:267` reads `STATIC_APP_CACHE_DIR` from the process environment.
+- `tools/assert-dist-clean.mjs:355-377` recomputes the shell hash with host-locale sorting.
 - `package.json:10` currently runs `tsc -b`, Vite, and `assert-dist-clean` directly.
 ## 3. Exact cache-key and verdict design
 
@@ -66,8 +67,8 @@
 - `special-index` for any assume-unchanged or skip-worktree entry.
 - `submodule` for any index record whose mode is `160000`.
 - `symlink` for index mode `120000` or a dirty, untracked, or ignored-public symlink.
-- `unsupported-path` when a path sent to newline-delimited `--stdin-paths` contains LF.
-- `normalization` for active `core.autocrlf` or any tracked `.gitattributes`.
+- `unsupported-path` when any overlay/public path has LF or CR, or its basename starts with `"`.
+- `normalization` for active `core.autocrlf`, a tracked `.gitattributes`, or an effective content attribute.
 - `stale-install` for an absent, malformed, or mismatched hidden npm lock.
 `git ls-files -v -z` is parsed as NUL records.
 Any record whose one-byte tag is lowercase or `S` causes `special-index`.
@@ -114,6 +115,7 @@
 git ls-files -v -z
 git config --get core.autocrlf
 git ls-files -- .gitattributes '**/.gitattributes'
+git ls-files -z | git check-attr -z --stdin text eol filter ident working-tree-encoding
 git status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none
 git ls-files -z --others --ignored --exclude-standard -- public
 git hash-object --no-filters --stdin-paths
@@ -130,7 +132,10 @@
 For each extant slot, frame Git-style current mode and raw-content object ID.
 Derive regular modes with `lstat` as non-executable `100644` or executable `100755`.
 Bypass before hashing when `lstat` identifies a symlink.
-Collect all extant overlay and ignored-public paths, reject LF, and bytewise sort them.
+Keep every parsed path as a `Buffer`; do not round-trip path bytes through a JavaScript string.
+Validate every old/new overlay path slot and ignored-public path, including deletions, before `lstat`.
+Reject LF, CR, or a basename whose first byte is ASCII `"`.
+Bytewise sort the remaining extant paths with `Buffer.compare`.
 Send their raw path bytes plus LF to one `git hash-object --no-filters --stdin-paths` process.
 Map its one-hash-per-line output back to the sorted paths and reject a count or syntax mismatch.
 Hash ignored-public paths and content IDs even though the general rule excludes ignored files.
@@ -139,6 +144,11 @@
 Accept `core.autocrlf` only when unset or exactly `false`, case-insensitively.
 Treat exit 1 from the single `git config --get` query as the supported unset result.
 Any tracked root or nested `.gitattributes` makes the verdict `normalization`.
+Feed the raw NUL-delimited tracked-path stream into the exact `git check-attr` command above.
+Parse its output as NUL triples of path, attribute name, and value.
+Require exactly five triples per tracked path and require every value to be `unspecified`.
+Treat `set`, `unset`, or any string value as specified and bypass with `normalization`.
+This evaluates worktree, info, configured user/global, default user, and system attribute sources.
 ### 3.6 Lookup, restore, build, and store
 
 Compute the complete verdict before reading a pointer.
@@ -148,7 +158,9 @@
 Verify the cached generation's directory digest before copying it.
 Copy into a worktree-local partial directory and verify its directory digest again.
 Parse the copied `dist/vtt-handoff-artifact.json` and require `commit === expected HEAD`.
-Only then atomically replace the worktree's `dist/` and print `dist cache hit: <key>`.
+Only then atomically replace the worktree's `dist/`.
+Run `tools/assert-dist-clean.mjs` under the same scrubbed fixed-locale environment on every hit.
+Print `dist cache hit: <key>` only after that guard succeeds.
 Treat a missing, malformed, corrupt, or wrong-HEAD generation as a miss, never as a hit.
 Run the three scrubbed direct validated-build steps from section 4 on miss or bypass.
 After a successful child, parse the live artifact and require its `commit` to equal pre-build HEAD.
@@ -167,17 +179,17 @@
 dist cache bypass: <reason>
 dist cache unstable-inputs
 ```
-The validated build and outer public guard retain this existing output:
+The validated miss/bypass leaf and module-owned hit guard retain this existing output:
 ```text
 dist clean: N files scanned
 ```
 ### 3.8 Size contract
 
 Keep the complete key/verdict computation at or below 150 physical lines.
-Target 240 lines and hard-cap the whole rewritten module at 245 physical lines.
-The cap budgets 150 key/verdict lines and 95 restore, build, store, and CLI lines.
-It is at least 22 lines and 8.2% smaller than the 267-line HEAD module; 230 remains unproved.
-Do not add a module unless actual implementation exceeds 400 lines and a new plan proves why.
+Target 245 lines and hard-cap the whole rewritten module at 250 physical lines.
+The cap budgets 150 key/verdict lines and 100 restore, guarded-hit, build, store, and CLI lines.
+It remains 17 lines and 6.4% smaller than the 267-line HEAD module; 230 remains unproved.
+Treat 250 as a gate; add no module unless actual implementation exceeds 400 lines and a new plan proves why.
 ## 4. Environment allowlist
 
 Construct the child environment from a new empty object.
@@ -204,6 +216,8 @@
 - `node_modules/typescript/bin/tsc -b`.
 - `node_modules/vite/bin/vite.js build --configLoader runner`.
 - `tools/assert-dist-clean.mjs`.
+On a hit, spawn only the third descriptor after restoration under that same environment.
+Choose containment because every guard invocation then shares one fixed environment without digest changes.
 This direct leaf prevents user or global npm configuration from recreating `NODE_OPTIONS`.
 Keep the three npm scripts in section 6 as the human-facing equivalent.
 Test their exact strings and the module's exported direct-step descriptors against the same expanded sequence.
@@ -234,9 +248,11 @@
 - `DRIZZLE_RAW_CONTENT_MISS` edits a tracked `drizzle/*.sql` file and must miss.
 - `DOCS_RAW_CONTENT_MISS` edits a tracked `docs/**` raw-import fixture and must miss.
 - `TEST_FILE_CONTENT_MISS` edits `tests/**` and must positively assert a miss.
-- `IGNORED_PUBLIC_FILE_MISS` creates an already-ignored regular file below `public/` and must miss.
+- `IGNORED_PUBLIC_FILE_MISS` creates two already-ignored regular files below `public/` and must miss.
+- It must exercise reverse discovery order and assert bytewise Buffer ordering plus both content IDs.
 - `DECLARED_STATIC_CACHE_DIR_MISS` changes `STATIC_APP_CACHE_DIR` and must miss.
-- `FIXED_LOCALE_OUTPUT` starts under en-US and da-DK and observes identical fixed-locale fixture output.
+- `FIXED_LOCALE_OUTPUT` runs `npm run build` under en-US and da-DK on MISS and HIT.
+- Every run must succeed, print `dist clean`, and observe identical fixed-locale fixture output.
 - `UNDECLARED_ENV_IS_HERMETIC` sets an undeclared variable and must keep the key equal.
 - `UNDECLARED_ENV_IS_HERMETIC` must also observe `undefined` from the fixture config.
 - `HOST_NPM_CONFIG_IS_INERT` runs the public npm script with HOME pointing at a user `.npmrc` injection.
@@ -255,6 +271,7 @@
 - `SUBMODULE_BYPASS` presents an index mode `160000` and must bypass `submodule`.
 - `INDEXED_SYMLINK_BYPASS` and `UNTRACKED_SYMLINK_BYPASS` require reason `symlink`.
 - `AUTOCRLF_BYPASS` and `TRACKED_ATTRIBUTES_BYPASS` require reason `normalization`.
+- `EFFECTIVE_ATTRIBUTES_BYPASS` covers untracked, info, configured, default-user, and system sources.
 - `GIT_FAILURE_BYPASS` and `INVALID_HEAD_BYPASS` require their exact bounded reasons.
 - `INPUT_CHANGED_DURING_BUILD_NOT_STORED` makes the fixture child edit a tracked input.
 - It must print `dist cache unstable-inputs` and leave no pointer for either key.
@@ -263,7 +280,9 @@
 - `TRACKED_DELETION_MISS` deletes a tracked input and must miss through an explicit deletion record.
 - `OVERLAY_ORDER_IS_CANONICAL` hashes equivalent synthetic NUL records in opposite orders equally.
 - `PATH_BYTES_ARE_NUL_PARSED` covers spaces and tabs without line-based status parsing.
-- `NEWLINE_PATH_BYPASS` requires `unsupported-path` before newline-delimited batch hashing.
+- `UNSUPPORTED_BATCH_PATH_BYPASS` parameterizes LF, CR, and a basename starting with `"`.
+- Its quote arm creates ordinary `package.json` and literal `"package.json"` with different bytes.
+- It must bypass before batch hashing, so Git can never substitute the ordinary file's object ID.
 - `WRONG_ARTIFACT_HEAD_NEVER_HITS` forges a digest-consistent generation with the wrong commit.
 - It must rebuild and must never print `dist cache hit`.
 - `MISS_WRONG_ARTIFACT_HEAD_FAILS` makes the build emit the wrong commit and must return nonzero.
@@ -279,7 +298,9 @@
 - `IGNORE_DELETIONS`: discard status records whose worktree path is absent; the deletion test turns red.
 - `UNSORTED_OVERLAY`: remove the bytewise canonical sort; the reversed synthetic overlay test turns red.
 - `DROP_IGNORED_PUBLIC`: omit its Git enumeration; `IGNORED_PUBLIC_FILE_MISS` turns red.
-- `PASS_PARENT_LOCALE`: stop forcing either locale variable; `FIXED_LOCALE_OUTPUT` turns red.
+- `PASS_PARENT_LOCALE`: stop forcing either variable; the helper's LANG and LC_ALL assertions turn red.
+- `DROP_HIT_GUARD`: omit the restored-hit guard; the da-DK public HIT control turns red.
+- `DROP_EFFECTIVE_ATTRS`: omit `check-attr`; `EFFECTIVE_ATTRIBUTES_BYPASS` turns red.
 - `ALLOW_SYMLINK` and `ALLOW_NORMALIZATION`: remove each bypass; their named cases turn red.
 - `SPAWN_NPM`: replace the direct leaf with npm; `HOST_NPM_CONFIG_IS_INERT` turns red.
 ## 6. Implementation order and allowed files
@@ -290,13 +311,13 @@
 4. Retain and compact directory digest, generation containment, atomic copy, and pointer publication.
 5. Add artifact-HEAD validation on restored, newly built, and bypass-built output.
 6. Add the post-build full-key recomputation and unstable-inputs no-store verdict.
-7. Replace recursive `npm run build` with the three scrubbed direct Node steps.
-8. Change `package.json` to the exact three-script wiring below.
+7. Replace recursive npm with direct steps and add the fixed-environment guard on restored hits.
+8. Remove the redundant host-environment guard from `build` using the exact wiring below.
 9. Rewrite the focused cache test with the behavior and mutant matrix.
 10. Check physical line budgets before running verification.
 The exact scripts must be:
 ```json
-"build": "tsc -b && node tools/dist-build-cache.mjs && node tools/assert-dist-clean.mjs",
+"build": "tsc -b && node tools/dist-build-cache.mjs",
 "build:dist": "vite build --configLoader runner",
 "build:dist:validated": "tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs"
 ```
@@ -305,6 +326,7 @@
 - `tools/dist-build-cache.mjs`, rewritten.
 - `tests/unit/tools/dist-build-cache.test.ts`, rewritten.
 - `package.json`, script entries only.
+Containment keeps `tools/assert-dist-clean.mjs` and `tools/pwa/service-worker.ts` read-only.
 `tools/serve.mjs:63` and `tools/ai-dm-board-snapshot.ts:306` keep working unchanged.
 The following import probe returned no output with exit 1:
 ```sh
@@ -377,12 +399,18 @@
 grep -q "$stored" "$proof_tmp/build-2.log"
 grep -q "$hit" "$proof_tmp/build-3.log"
 grep -q "$hit" "$proof_tmp/build-4.log"
-grep -q 'dist clean: [0-9][0-9]* files scanned' "$proof_tmp"/build-*.log
+for proof_number in 1 2 3 4; do
+  grep -q 'dist clean: [0-9][0-9]* files scanned' "$proof_tmp/build-$proof_number.log"
+done
 k1=$(sed -n 's/^dist cache miss: //p' "$proof_tmp/build-1.log")
 k2=$(sed -n 's/^dist cache miss: //p' "$proof_tmp/build-2.log")
 k3=$(sed -n 's/^dist cache hit: //p' "$proof_tmp/build-3.log")
 k4=$(sed -n 's/^dist cache hit: //p' "$proof_tmp/build-4.log")
+s1=$(sed -n 's/^dist cache stored: //p' "$proof_tmp/build-1.log")
+s2=$(sed -n 's/^dist cache stored: //p' "$proof_tmp/build-2.log")
 test "$k1" != "$k2"
+test "$s1" = "$k1"
+test "$s2" = "$k2"
 test "$k2" = "$k3"
 test "$k3" = "$k4"
 printf 'MISS %s; MISS %s; HIT %s; ambient HIT %s\n' "$k1" "$k2" "$k3" "$k4"
@@ -444,61 +472,127 @@
 $ node -p 'JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})'
 {"version":"v24.13.0","platform":"linux","arch":"x64"}
 ```
-The exact clean-tree key timing command was:
+```text
+$ printf '"package.json"\n' | git hash-object --no-filters --stdin-paths
+$ printf 'package.json\r\n' | git hash-object --no-filters --stdin-paths
+$ git hash-object --no-filters -- package.json
+151844f8b27eb5fa917d1065b1afa7197f9234ce  # each command
+```
+The two-file fixture must return `dist cache bypass: unsupported-path` before hashing either path.
+The exact complete-verdict timing command was:
 ```sh
-/usr/bin/time -f 'wall_seconds=%e' node <<'NODE'
+/usr/bin/time -f 'verdict_wall_seconds=%e' node <<'NODE'
 const cp = require('node:child_process');
 const crypto = require('node:crypto');
 const fs = require('node:fs');
-const { performance } = require('node:perf_hooks');
 const started = performance.now();
-const git = (...args) => cp.execFileSync('git', args, {
+const git = (args, options = {}) => cp.execFileSync('git', args, {
+  ...options,
   env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
   maxBuffer: 64 * 1024 * 1024,
+  stdio: ['pipe', 'pipe', 'inherit'],
+});
+const splitNul = (bytes) => {
+  const result = [];
+  let start = 0;
+  for (let end = bytes.indexOf(0); end >= 0; end = bytes.indexOf(0, start)) {
+    result.push(bytes.subarray(start, end));
+    start = end + 1;
+    if (start === bytes.length) break;
+  }
+  return result;
+};
+const index = git(['ls-files', '-s', '-z']);
+const records = splitNul(index);
+const entries = records.map((record) => {
+  const tab = record.indexOf(9);
+  const [mode, oid, stage] = record.subarray(0, tab).toString().split(' ');
+  return { mode, oid, stage, path: record.subarray(tab + 1) };
 });
-const frame = (hash, value) => {
+if (entries.some(({ mode }) => mode === '120000')) throw Error('symlink');
+if (entries.some(({ mode }) => mode === '160000')) throw Error('submodule');
+if (splitNul(git(['ls-files', '-v', '-z'])).some((record) =>
+  /[a-zS]/u.test(String.fromCharCode(record[0])))) throw Error('special-index');
+const autocrlf = cp.spawnSync('git', ['config', '--get', 'core.autocrlf'], { encoding: 'utf8' });
+if (![0, 1].includes(autocrlf.status)) throw Error('git-failure');
+if (autocrlf.status === 0 && autocrlf.stdout.trim().toLowerCase() !== 'false') throw Error('normalization');
+if (git(['ls-files', '--', '.gitattributes', '**/.gitattributes']).length) throw Error('normalization');
+const paths = Buffer.concat(entries.map(({ path }) => Buffer.concat([path, Buffer.of(0)])));
+const attributeStarted = performance.now();
+const attributes = git(
+  ['check-attr', '-z', '--stdin', 'text', 'eol', 'filter', 'ident', 'working-tree-encoding'],
+  { input: paths },
+);
+const attributeMs = performance.now() - attributeStarted;
+const attributeFields = splitNul(attributes);
+if (attributeFields.length !== entries.length * 15) throw Error('attribute grammar');
+if (attributeFields.some((value, index) =>
+  index % 3 === 2 && !value.equals(Buffer.from('unspecified')))) throw Error('normalization');
+const root = JSON.parse(fs.readFileSync('package-lock.json'));
+const hiddenBytes = fs.readFileSync('node_modules/.package-lock.json');
+const hidden = JSON.parse(hiddenBytes);
+const allows = (list, value) => !list || (!list.includes('!' + value) &&
+  (list.every((item) => item.startsWith('!')) || list.includes(value)));
+const expected = Object.entries(root.packages).filter(([path, pkg]) =>
+  path && allows(pkg.os, process.platform) && allows(pkg.cpu, process.arch));
+if (expected.some(([, pkg]) => pkg.libc !== undefined)) throw Error('stale-install');
+const actual = new Map(Object.entries(hidden.packages).filter(([path]) => path));
+if (root.lockfileVersion !== hidden.lockfileVersion || expected.length !== actual.size) throw Error('stale-install');
+for (const [path, wanted] of expected) {
+  const got = actual.get(path);
+  if (!got || wanted.version !== got.version) throw Error('stale-install');
+  if (wanted.resolved !== undefined && got.resolved !== undefined &&
+      wanted.resolved !== got.resolved) throw Error('stale-install');
+  if (wanted.integrity !== undefined && got.integrity !== undefined &&
+      wanted.integrity !== got.integrity) throw Error('stale-install');
+}
+const status = git(['status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none']);
+if (status.length) throw Error('probe expected clean tree');
+const publicPaths = splitNul(
+  git(['ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'public']),
+).sort(Buffer.compare);
+for (const path of publicPaths) {
+  const basename = path.subarray(path.lastIndexOf(47) + 1);
+  if (path.includes(10) || path.includes(13) || basename[0] === 34) throw Error('unsupported-path');
+  if (fs.lstatSync(path).isSymbolicLink()) throw Error('symlink');
+}
+const hash = crypto.createHash('sha256');
+const frame = (value) => {
   const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
   const size = Buffer.alloc(8);
   size.writeBigUInt64BE(BigInt(bytes.length));
   hash.update(size).update(bytes);
 };
-const split = (bytes) => bytes.length === 0 ? [] : bytes.subarray(0, -1).toString().split('\0');
-const index = git('ls-files', '-s', '-z');
-const records = split(index);
-const lock = records.find((record) => record.endsWith('\tpackage-lock.json'));
-const hidden = fs.readFileSync('node_modules/.package-lock.json');
-const status = git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none');
-if (status.length !== 0) throw new Error('probe expected clean tree');
-const publicPaths = split(
-  git('ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'public'),
-).sort(Buffer.compare);
-const hash = crypto.createHash('sha256');
-for (const value of ['dnd-dist-build-cache-v2', git('rev-parse', 'HEAD').toString().trim(),
-  process.version, process.platform, process.arch, lock.split(' ')[1],
-  crypto.createHash('sha256').update(hidden).digest('hex')]) frame(hash, value);
-for (const value of ['LANG=C.UTF-8', 'LC_ALL=C.UTF-8', 'NODE_ENV=production']) frame(hash, value);
-for (const record of records) frame(hash, Buffer.from(record + '\0'));
-if (publicPaths.length !== 0) throw new Error('probe expected no ignored public files');
+const lock = entries.find(({ path, stage }) =>
+  stage === '0' && path.equals(Buffer.from('package-lock.json')));
+for (const value of ['dnd-dist-build-cache-v2', git(['rev-parse', 'HEAD']).toString().trim(),
+  process.version, process.platform, process.arch, lock.oid,
+  crypto.createHash('sha256').update(hiddenBytes).digest('hex'),
+  'LANG=C.UTF-8', 'LC_ALL=C.UTF-8', 'NODE_ENV=production']) frame(value);
+for (const record of records) frame(Buffer.concat([record, Buffer.of(0)]));
 for (const path of ['.env', '.env.local', '.env.production', '.env.production.local']) {
-  frame(hash, path);
-  frame(hash, fs.existsSync(path) ? 'present' : 'absent');
-  if (fs.existsSync(path)) frame(hash, crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'));
+  frame(path);
+  frame(fs.existsSync(path) ? 'present' : 'absent');
+  if (fs.existsSync(path)) frame(crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'));
 }
-console.log(`index_records=${records.length}\nindex_bytes=${index.length}\nstatus_bytes=${status.length}`);
-console.log(`ignored_public_records=${publicPaths.length}`);
-console.log('declared_env=LANG=C.UTF-8,LC_ALL=C.UTF-8,NODE_ENV=production');
-console.log(`key=${hash.digest('hex')}\nkey_compute_ms=${(performance.now() - started).toFixed(3)}`);
+console.log(`records=${entries.length} index_bytes=${index.length} status_bytes=${status.length}`);
+console.log(`attribute_checks=${attributeFields.length / 3} active_attributes=0`);
+console.log(`attribute_check_ms=${attributeMs.toFixed(3)}`);
+console.log(`special=0 symlinks=0 submodules=0 ignored_public=${publicPaths.length}`);
+console.log(`eligible=${expected.length} hidden=${actual.size} lock_mismatches=0/0/0`);
+console.log(`key=${hash.digest('hex')}`);
+console.log(`complete_verdict_ms=${(performance.now() - started).toFixed(3)}`);
 NODE
 ```
 ```text
-index_records=11504
-index_bytes=1657692
-status_bytes=0
-ignored_public_records=0
-declared_env=LANG=C.UTF-8,LC_ALL=C.UTF-8,NODE_ENV=production
+records=11504 index_bytes=1657692 status_bytes=0
+attribute_checks=57520 active_attributes=0
+attribute_check_ms=52.340
+special=0 symlinks=0 submodules=0 ignored_public=0
+eligible=273 hidden=273 lock_mismatches=0/0/0
 key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
-key_compute_ms=69.556
-wall_seconds=0.09
+complete_verdict_ms=200.545
+verdict_wall_seconds=0.22
 ```
 ```text
 $ git config --get core.autocrlf; printf 'autocrlf_exit=%s\\n' "$?"
@@ -511,49 +605,9 @@
 0
 ```
 The `core.autocrlf` exit 1 is the supported unset result.
-```sh
-node <<'NODE'
-const cp = require('node:child_process');
-const { performance } = require('node:perf_hooks');
-const paths = cp.execFileSync('git', ['ls-files', '-z', '--', 'art/requests'])
-  .toString().split('\0').filter(Boolean).slice(0, 85);
-const sequential = () => Buffer.concat(paths.map((path) =>
-  cp.execFileSync('git', ['hash-object', '--no-filters', '--', path])));
-const batched = () => cp.execFileSync('git', ['hash-object', '--no-filters', '--stdin-paths'], {
-  input: paths.join('\n') + '\n',
-});
-const bytes = paths.reduce((sum, path) => sum + require('node:fs').statSync(path).size, 0);
-console.log(`paths=${paths.length} bytes=${bytes}`);
-for (let trial = 1; trial <= 3; trial++) {
-  const start = performance.now();
-  const expected = sequential();
-  const split = performance.now();
-  const actual = batched();
-  console.log(`${trial} ${(split - start).toFixed(3)} ` +
-    `${(performance.now() - split).toFixed(3)} ${expected.equals(actual)}`);
-}
-NODE
-```
-```text
-paths=85 bytes=259981
-1 145.889 3.452 true
-2 143.106 3.182 true
-3 143.451 3.177 true
-```
-```sh
-for cache_locale in en_US.UTF-8 da_DK.UTF-8 C.UTF-8; do
-  LANG="$cache_locale" LC_ALL="$cache_locale" \
-    node --no-warnings --experimental-strip-types --input-type=module <<'NODE'
-import { appShellVersion } from './tools/pwa/service-worker.ts';
-const assets = [
-  { fileName: 'assets/index-aaa.js', source: 'a' },
-  { fileName: 'assets/index-az.js', source: 'z' },
-];
-const names = assets.map((asset) => asset.fileName).sort((a, b) => a.localeCompare(b));
-console.log(Intl.DateTimeFormat().resolvedOptions().locale, names.join(','), appShellVersion(assets));
-NODE
-done
-```
+The r5 batch control hashed 85 files and 259,981 bytes with identical sequential and batch output.
+Its three sequential/batch timings were 145.889/3.452, 143.106/3.182, and 143.451/3.177 ms.
+The actual `appShellVersion` locale control was also rerun unchanged:
 ```text
 en-US assets/index-aaa.js,assets/index-az.js 1ed55b4e6ef4a643
 da-DK assets/index-az.js,assets/index-aaa.js 456c40d44eed648a
@@ -589,26 +643,21 @@
 0
 ```
 ```text
-$ npx vitest list --configLoader runner --filesOnly --json | <JSON counter>
-{"shape":"array","fileCount":641,...}
+Prior `npx vitest list --configLoader runner --filesOnly --json` normalized file count: 641.
 $ sha256sum src/vtt/intel/contracts.ts
 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
 ```
 No build, Vitest run, Playwright run, install, Git write, model call, or port access occurred.
-## 9. PR4 findings disposition
+## 9. PR5 findings disposition
 
 | Finding | Resolution in this plan |
 |---|---|
-| PR4-F1 | Sections 3.2-3.5 and 5 add ignored-public hashing and its regression. |
-| PR4-F2 | Sections 3.4, 4, 5, and 8 force, hash, and test the locale. |
-| PR4-F3 | Sections 3.2, 3.5, 5, and 8 batch hashes and reject LF paths. |
-| PR4-F4 | Section 5 directly compares keys across identical-tree commits. |
-| PR4-F5 | Section 7 edits and proves emission of the imported Markdown. |
-| PR4-F6 | Sections 3.2, 3.5, and 5 bypass and test all symlinks. |
-| PR4-F7 | Sections 4-6 and 8 replace npm with tested direct steps. |
-| PR4-F8 | Sections 3.2, 3.5, 5, and 8 enforce normalization limits. |
-| PR4-F9 | Sections 1, 3.3, 5, and 10 state and test the dependency contract. |
-| PR4-F10 | Section 5 retains both independent nonmutation assertions. |
+| PR5-F1 | Sections 3.2, 3.5, 5, and 8 reject ambiguous batch paths. |
+| PR5-F2 | Sections 3.6, 4-7 contain every guard invocation under the fixed locale. |
+| PR5-F3 | Sections 3.2, 3.5, 5, and 8 inspect effective attributes. |
+| PR5-F4 | Section 7 independently checks clean output and MISS/STORE key equality. |
+| PR5-F5 | Sections 3.5, 5, and 8 retain Buffer paths and time the complete verdict. |
+| PR5-F6 | Section 5 names both locale-helper assertions as the mutant killer. |
 ## 10. Risks and accepted trade-offs
 
 ### Coarse invalidation and hit rate
@@ -640,8 +689,8 @@
 ### Additional correctness costs
 
 Ignored regular files under `public/` are the sole ignored-content exception because Vite copies them.
-Symlinks and Git normalization rules bypass because neither is represented safely by raw blob identity here.
-The direct leaf duplicates the human script definition; exact descriptor/script expansion tests prevent drift.
+Symlinks, ambiguous batch paths, and effective Git normalization bypass rather than risk wrong blob identity.
+The direct leaf duplicates human wiring and adds one guarded-hit process; equivalence tests prevent drift.
 ### Operational bounds
 
 Any Git failure, special index state, submodule, or uncertain install bypasses instead of guessing.

tokens used
636,878
Revised plan: [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md)

Chosen F2 resolution: contained guard execution under the cache module’s fixed locale on HIT, MISS, and BYPASS.

### Final audit

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
698 39445 .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
aa9dcbdec118087c2cad3b1155125211cb46fd71d07cae9e9aa4734cd2280f52

maximum line width: 117
lines over 120 columns: 0
```

| Finding | Plan sections |
|---|---|
| PR5-F1 | 3.2, 3.5, 5, 8 |
| PR5-F2 | 3.6, 4–7 |
| PR5-F3 | 3.2, 3.5, 5, 8 |
| PR5-F4 | 7 |
| PR5-F5 | 3.5, 5, 8 |
| PR5-F6 | 5 |

### Re-run probes

The complete exact Node heredoc is included in section 8.

```text
records=11504 index_bytes=1657692 status_bytes=0
attribute_checks=57520 active_attributes=0
attribute_check_ms=52.340
special=0 symlinks=0 submodules=0 ignored_public=0
eligible=273 hidden=273 lock_mismatches=0/0/0
key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
complete_verdict_ms=200.545
verdict_wall_seconds=0.22
```

F1 commands:

```sh
printf '"package.json"\n' | git hash-object --no-filters --stdin-paths
printf 'package.json\r\n' | git hash-object --no-filters --stdin-paths
git hash-object --no-filters -- package.json
```

All three returned:

```text
151844f8b27eb5fa917d1065b1afa7197f9234ce
```

The corresponding two-file fixture must now bypass before hashing:

```text
dist cache bypass: unsupported-path
```

Final repository checks:

```text
HEAD: fdcd0c445525caf82619fab04f3037e416c2e3b1
branch: claude/build-cache
index records: 11504
status bytes: 0
ignored-public records: 0

$ git status --short --untracked-files=all
[no output]

$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

PLAN M2 R6 DONE
