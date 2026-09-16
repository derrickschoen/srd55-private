# M-2 plan round 5 lane report (sol resume 01a0a0e3…), harvested 2026-09-14 14:35

Revised plan: [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md)

### Final audit

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
649 35288 .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
c572d65e4d02e34f874322b08c466e858f74886e191e63a846dd1ff9bf52cfe9

maximum line width: 116
lines over 120 columns: 0
```

| Finding | Plan sections |
|---|---|
| PR4-F1 | 3.2–3.5, 5 |
| PR4-F2 | 3.4, 4, 5, 8 |
| PR4-F3 | 3.2, 3.5, 5, 8 |
| PR4-F4 | 5 |
| PR4-F5 | 7 |
| PR4-F6 | 3.2, 3.5, 5 |
| PR4-F7 | 4–6, 8 |
| PR4-F8 | 3.2, 3.5, 5, 8 |
| PR4-F9 | 1, 3.3, 5, 10 |
| PR4-F10 | 5 |

### Probe results

The exact Node and shell heredocs are reproduced in plan section 8.

```text
git ls-files -s -z | tr '\0' '\n' | wc -l
11504

git status --porcelain=v1 -z --untracked-files=all | wc -c
0

git ls-files -z --others --ignored --exclude-standard -- public | tr '\0' '\n' | wc -l
0
```

Full clean-key probe:

```text
index_records=11504
index_bytes=1657692
status_bytes=0
ignored_public_records=0
declared_env=LANG=C.UTF-8,LC_ALL=C.UTF-8,NODE_ENV=production
key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
key_compute_ms=69.556
wall_seconds=0.09
```

Batched hash probe over 85 tracked files totaling 259,981 bytes:

```text
trial  sequential_ms  batch_ms  identical
1      145.889        3.452     true
2      143.106        3.182     true
3      143.451        3.177     true
```

Hidden-lock comparison:

```text
rootLockfileVersion=3
hiddenLockfileVersion=3
platformFilteredOut=103
eligibleRootPackages=273
hiddenPackages=273
missing=0
extra=0
versionMismatches=0
resolvedMismatches=0
integrityMismatches=0
classification=matching
```

Additional controls:

```text
core.autocrlf: unset, command exit 1
tracked .gitattributes: 0
indexed symlinks: 0
submodules: 0

.env: absent-nonignored
.env.local: absent-nonignored
.env.production: absent-nonignored
.env.production.local: absent-nonignored
```

The locale control reproduced distinct output under `da_DK.UTF-8`; forcing `C.UTF-8` reproduced the stable en-US result. Installed npm source confirmed that `node-options` recreates `NODE_OPTIONS`; the plan therefore selects direct-child option (b), for which the required `npm_config_*`/`NODE_*` child-variable list is empty.

```text
$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

```text
$ git status --short --untracked-files=all
[no output]
```

PLAN M2 R5 DONE
diff --git a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
index 11e1202dd24d5f300f4625058d8c4e66de897a42..91abc1e2a51e7161fda990d93db415db5aa2569c
--- a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
+++ b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
@@ -5,12 +5,12 @@
 
 ### Goal
 
-- Cache one complete, validated `dist/` generation under an automatic SHA-256 key.
+- Cache one complete, validated `dist/` generation under a contract-scoped automatic SHA-256 key.
 - Make every tracked file and every nonignored untracked worktree file an input.
 - Hash Vite configuration as ordinary tracked bytes, with no interpretation of its syntax.
 - Include dirty tracked content without modifying the real Git index.
 - Include the commit because Vite writes it into the artifact.
-- Include the installed dependency identity and bypass when the installation is stale.
+- Require immutable npm-managed dependencies and bypass when their install metadata is stale.
 - Expose only a declared environment to the build child.
 - Preserve verified, atomic, cross-worktree restoration and publication.
 - Recheck the complete key after a miss build and never store unstable inputs.
@@ -21,7 +21,7 @@
 - Do not cache individual Rollup chunks or perform an incremental production build.
 - Do not add a walker, import resolver, closure computation, AST grammar, or fingerprint constant.
 - Do not exclude `tests/**`, `.claude/**`, `docs/**`, Markdown, or any other Git-visible class.
-- Do not hash ignored files except the four explicit root Vite production environment files.
+- Do not hash ignored files except root Vite env files and ignored files below Vite's copied `public/`.
 - Do not hash timestamps, traversal order, checkout root, or the ambient environment.
 - Do not change `vite.config.ts`, either direct cache caller, or the frozen VTT contract.
 - Do not use or create `tools/dist-build-inputs.mjs`.
@@ -58,13 +58,16 @@
 Use a 64 MiB `maxBuffer` for every captured Git command.
 The local 1,657,692-byte index stream exceeds Node's default 1 MiB child-process buffer.
 Set `GIT_OPTIONAL_LOCKS=0` on Git probes and treat any spawn error or nonzero exit as `git-failure`.
+The buffer bounds captured output, while untracked traversal cost is bounded only by Git ignore rules.
 ### 3.2 Precondition verdicts
 
-
 - `invalid-head` when trimmed `git rev-parse HEAD` is not exactly 40 lowercase hex bytes.
 - `git-failure` when any Git command fails or emits malformed required machine output.
 - `special-index` for any assume-unchanged or skip-worktree entry.
 - `submodule` for any index record whose mode is `160000`.
+- `symlink` for index mode `120000` or a dirty, untracked, or ignored-public symlink.
+- `unsupported-path` when a path sent to newline-delimited `--stdin-paths` contains LF.
+- `normalization` for active `core.autocrlf` or any tracked `.gitattributes`.
 - `stale-install` for an absent, malformed, or mismatched hidden npm lock.
 `git ls-files -v -z` is parsed as NUL records.
 Any record whose one-byte tag is lowercase or `S` causes `special-index`.
@@ -78,8 +81,10 @@
 Filter `os` and `cpu` arrays using npm's positive and `!negative` platform/architecture semantics.
 Require the hidden lock package paths to equal that eligible set exactly after bytewise sorting.
 Require equal `version` values for every matched package path.
+Compare `resolved` and `integrity` whenever both lock entries carry the field.
 If future lock entries use a `libc` qualifier, bypass until the comparison explicitly supports it.
 Absence, JSON failure, set mismatch, version mismatch, or qualifier uncertainty is `stale-install`.
+This metadata check assumes npm-installed package bytes remain immutable after installation.
 ### 3.4 Key composition
 
 Feed fields into one SHA-256 instance in this exact order:
@@ -93,24 +98,26 @@
 8. Frame each declared `name=value` environment record in bytewise name order.
 9. Frame every raw, terminal-NUL index record in Git's emitted order.
 10. Frame every canonical dirty-overlay record in bytewise path order.
-11. Frame each of the four explicit root Vite environment-file probes in fixed order.
-The declared environment records are always `NODE_ENV=production` and, when set, the exact
-`STATIC_APP_CACHE_DIR=<value>` record.
+11. Frame each ignored-public record as path then raw-content object ID in bytewise path order.
+12. Frame each of the four explicit root Vite environment-file probes in fixed order.
+The declared records always include `LANG=C.UTF-8`, `LC_ALL=C.UTF-8`, and `NODE_ENV=production`.
+When set, the exact `STATIC_APP_CACHE_DIR=<value>` record follows bytewise sorting.
 The fixed environment-file order is `.env`, `.env.local`, `.env.production`, then
 `.env.production.local`.
 For each environment-file probe, frame its path and `absent`, or its path, `present`, and SHA-256.
 ### 3.5 Exact Git commands
 
 Run these commands from the requested repository root:
-
 ```sh
 git rev-parse HEAD
 git ls-files -s -z
 git ls-files -v -z
+git config --get core.autocrlf
+git ls-files -- .gitattributes '**/.gitattributes'
 git status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none
-git hash-object --no-filters -- <dirty-or-untracked-path>
+git ls-files -z --others --ignored --exclude-standard -- public
+git hash-object --no-filters --stdin-paths
 ```
-
 The index command returns `mode SP object-id SP stage TAB path NUL` records.
 Preserve each complete index record, including its terminal NUL, as the framed key field.
 The status command returns `XY SP path NUL` for ordinary records.
@@ -121,10 +128,17 @@
 For each overlay record, frame status, old path, and new path in that order.
 For old and new path slots, frame the slot name and `none`, `deleted`, or `present`.
 For each extant slot, frame Git-style current mode and raw-content object ID.
-Derive modes with `lstat`: regular non-executable `100644`, executable `100755`, symlink `120000`.
-Obtain each extant path's object ID with `git hash-object --no-filters -- <path>`.
+Derive regular modes with `lstat` as non-executable `100644` or executable `100755`.
+Bypass before hashing when `lstat` identifies a symlink.
+Collect all extant overlay and ignored-public paths, reject LF, and bytewise sort them.
+Send their raw path bytes plus LF to one `git hash-object --no-filters --stdin-paths` process.
+Map its one-hash-per-line output back to the sorted paths and reject a count or syntax mismatch.
+Hash ignored-public paths and content IDs even though the general rule excludes ignored files.
 Tracked files remain in `git ls-files -s` even when a current ignore rule names them.
-There is no additional exclusion predicate.
+Index blob IDs describe Git-normalized bytes, not necessarily raw worktree bytes.
+Accept `core.autocrlf` only when unset or exactly `false`, case-insensitively.
+Treat exit 1 from the single `git config --get` query as the supported unset result.
+Any tracked root or nested `.gitattributes` makes the verdict `normalization`.
 ### 3.6 Lookup, restore, build, and store
 
 Compute the complete verdict before reading a pointer.
@@ -136,7 +150,7 @@
 Parse the copied `dist/vtt-handoff-artifact.json` and require `commit === expected HEAD`.
 Only then atomically replace the worktree's `dist/` and print `dist cache hit: <key>`.
 Treat a missing, malformed, corrupt, or wrong-HEAD generation as a miss, never as a hit.
-Spawn `npm run build:dist:validated` under the scrubbed environment on miss or bypass.
+Run the three scrubbed direct validated-build steps from section 4 on miss or bypass.
 After a successful child, parse the live artifact and require its `commit` to equal pre-build HEAD.
 On bypass, return the validated live `dist/` without any store attempt.
 On miss, recompute the entire key after validation.
@@ -146,7 +160,6 @@
 ### 3.7 Required print sites
 
 The module must emit these exact prefixes:
-
 ```text
 dist cache miss: <key>
 dist cache hit: <key>
@@ -154,17 +167,16 @@
 dist cache bypass: <reason>
 dist cache unstable-inputs
 ```
-
 The validated build and outer public guard retain this existing output:
-
 ```text
 dist clean: N files scanned
 ```
-
 ### 3.8 Size contract
 
 Keep the complete key/verdict computation at or below 150 physical lines.
-Keep the whole rewritten module at or below 230 physical lines.
+Target 240 lines and hard-cap the whole rewritten module at 245 physical lines.
+The cap budgets 150 key/verdict lines and 95 restore, build, store, and CLI lines.
+It is at least 22 lines and 8.2% smaller than the 267-line HEAD module; 230 remains unproved.
 Do not add a module unless actual implementation exceeds 400 lines and a new plan proves why.
 ## 4. Environment allowlist
 
@@ -172,22 +184,31 @@
 Hash and pass:
 
 - `NODE_ENV=production`, forced even when the parent supplies another value or no value.
+- `LANG=C.UTF-8`, forced.
+- `LC_ALL=C.UTF-8`, forced.
 - `STATIC_APP_CACHE_DIR`, only when it is present in the parent environment.
 Pass through only when present, but do not hash:
 
 - `PATH`.
 - `HOME`.
 - `TMPDIR`.
-- `LANG`.
-- `LC_ALL`.
 - `TZ`.
 Drop `SHELL`, every ambient `VITE_*`, every ambient `npm_config_*`, `NODE_OPTIONS`, and all other names.
-The cache module starts npm with no inherited `npm_config_*`, `NODE`, `NODE_OPTIONS`, or other `NODE_*`.
-npm itself then created exactly `NODE` plus these 11 `npm_config_*` variables:
+No `npm_config_*` or `NODE_*` variable is required by the direct child; that required-variable list is empty.
+The former 11-name npm pass-through is deliberately deleted because direct-child option (b) removes npm.
+`tools/pwa/service-worker.ts:19` uses default-locale `localeCompare`, so the fixed locale is output policy.
+No inspected production output depends on `TZ`, so it remains execution-only and unhashed.
+Do not invoke npm from the cache module.
+Spawn these validated steps sequentially with `process.execPath` and the same scrubbed environment:
 
-The exact names and values appear in the verified probe output in section 8.
+- `node_modules/typescript/bin/tsc -b`.
+- `node_modules/vite/bin/vite.js build --configLoader runner`.
+- `tools/assert-dist-clean.mjs`.
+This direct leaf prevents user or global npm configuration from recreating `NODE_OPTIONS`.
+Keep the three npm scripts in section 6 as the human-facing equivalent.
+Test their exact strings and the module's exported direct-step descriptors against the same expanded sequence.
 Add an integration fixture named `vite.config.mjs` that reads an undeclared test variable.
-Run the fixture only through the cache module's scrubbed `npm run build:dist:validated` child.
+Run the fixture only through the cache module's scrubbed direct-build child.
 Assert that the config records `undefined`, while setting the variable also leaves the key unchanged.
 ## 5. Test matrix and mutation contract
 
@@ -198,8 +219,11 @@
 - `sets NODE_ENV to production when the parent leaves it unset`.
 Deliberately replace the old test `preserves every other parent variable`.
 Name its replacement `drops undeclared parent variables and keeps only execution allowlist values`.
-The replacement must assert that `PATH`, `HOME`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ` survive.
+The replacement must assert that `PATH`, `HOME`, `TMPDIR`, and `TZ` survive.
+It must assert that parent locale values become fixed `LANG=C.UTF-8` and `LC_ALL=C.UTF-8`.
 The replacement must assert that a custom name, `VITE_*`, `NODE_OPTIONS`, and `npm_config_*` do not survive.
+Retain `expect(childEnv).not.toBe(parentEnv)`.
+Retain `expect(parentEnv.NODE_ENV).toBe('development')`.
 Required behavior cases:
 
 - `TRACKED_SRC_CONTENT_MISS` edits tracked source bytes while restoring its original mtime and mode.
@@ -210,18 +234,27 @@
 - `DRIZZLE_RAW_CONTENT_MISS` edits a tracked `drizzle/*.sql` file and must miss.
 - `DOCS_RAW_CONTENT_MISS` edits a tracked `docs/**` raw-import fixture and must miss.
 - `TEST_FILE_CONTENT_MISS` edits `tests/**` and must positively assert a miss.
+- `IGNORED_PUBLIC_FILE_MISS` creates an already-ignored regular file below `public/` and must miss.
 - `DECLARED_STATIC_CACHE_DIR_MISS` changes `STATIC_APP_CACHE_DIR` and must miss.
+- `FIXED_LOCALE_OUTPUT` starts under en-US and da-DK and observes identical fixed-locale fixture output.
 - `UNDECLARED_ENV_IS_HERMETIC` sets an undeclared variable and must keep the key equal.
 - `UNDECLARED_ENV_IS_HERMETIC` must also observe `undefined` from the fixture config.
+- `HOST_NPM_CONFIG_IS_INERT` runs the public npm script with HOME pointing at a user `.npmrc` injection.
+- Its preload sets a sentinel variable and records PIDs, proving npm loaded it into the outer cache process.
+- The direct Vite child must not record that PID or receive the sentinel; its config must observe `undefined`.
 - `VITE_ENV_FILE_MISS` creates `.env.production` and must miss when it is nonignored.
 - Parameterize `VITE_ENV_FILE_MISS` with a pre-existing ignore rule and require the same miss.
 - `HEAD_ONLY_CHANGE_MISS` creates a new commit with an identical tree and must miss.
+- It must directly assert `keyBefore !== keyAfter` before exercising artifact restoration.
 - Its next invocation must hit and restore an artifact whose `commit` equals the new HEAD.
 - `HIDDEN_LOCK_STALE_BYPASS` removes `ws` or the analogous direct fixture package from the hidden lock.
+- Mutating matched `resolved` or `integrity` alone must also produce `stale-install`.
 - It must print exactly `dist cache bypass: stale-install` and never read or write a pointer.
 - `ASSUME_UNCHANGED_BYPASS` marks a fixture entry assume-unchanged and must bypass `special-index`.
 - Add the same assertion for a skip-worktree fixture entry.
 - `SUBMODULE_BYPASS` presents an index mode `160000` and must bypass `submodule`.
+- `INDEXED_SYMLINK_BYPASS` and `UNTRACKED_SYMLINK_BYPASS` require reason `symlink`.
+- `AUTOCRLF_BYPASS` and `TRACKED_ATTRIBUTES_BYPASS` require reason `normalization`.
 - `GIT_FAILURE_BYPASS` and `INVALID_HEAD_BYPASS` require their exact bounded reasons.
 - `INPUT_CHANGED_DURING_BUILD_NOT_STORED` makes the fixture child edit a tracked input.
 - It must print `dist cache unstable-inputs` and leave no pointer for either key.
@@ -229,7 +262,8 @@
 - `DIST_OUTPUT_IS_IGNORED` edits only ignored `dist/` bytes and must keep the key unchanged.
 - `TRACKED_DELETION_MISS` deletes a tracked input and must miss through an explicit deletion record.
 - `OVERLAY_ORDER_IS_CANONICAL` hashes equivalent synthetic NUL records in opposite orders equally.
-- `PATH_BYTES_ARE_NUL_PARSED` covers spaces, tabs, and newlines without line-based parsing.
+- `PATH_BYTES_ARE_NUL_PARSED` covers spaces and tabs without line-based status parsing.
+- `NEWLINE_PATH_BYPASS` requires `unsupported-path` before newline-delimited batch hashing.
 - `WRONG_ARTIFACT_HEAD_NEVER_HITS` forges a digest-consistent generation with the wrong commit.
 - It must rebuild and must never print `dist cache hit`.
 - `MISS_WRONG_ARTIFACT_HEAD_FAILS` makes the build emit the wrong commit and must return nonzero.
@@ -244,26 +278,28 @@
 - `ACCEPT_STALE_INSTALL`: force the hidden-lock comparison true; the stale-install bypass test turns red.
 - `IGNORE_DELETIONS`: discard status records whose worktree path is absent; the deletion test turns red.
 - `UNSORTED_OVERLAY`: remove the bytewise canonical sort; the reversed synthetic overlay test turns red.
+- `DROP_IGNORED_PUBLIC`: omit its Git enumeration; `IGNORED_PUBLIC_FILE_MISS` turns red.
+- `PASS_PARENT_LOCALE`: stop forcing either locale variable; `FIXED_LOCALE_OUTPUT` turns red.
+- `ALLOW_SYMLINK` and `ALLOW_NORMALIZATION`: remove each bypass; their named cases turn red.
+- `SPAWN_NPM`: replace the direct leaf with npm; `HOST_NPM_CONFIG_IS_INERT` turns red.
 ## 6. Implementation order and allowed files
 
-1. Rewrite key computation in `tools/dist-build-cache.mjs` around the five Git commands.
-2. Add strict HEAD, special-index, submodule, and hidden-install verdicts.
+1. Rewrite key computation in `tools/dist-build-cache.mjs` around the Git commands in section 3.
+2. Add HEAD, index, symlink, normalization, path, and hidden-install verdicts.
 3. Replace parent spreading with the exact hashed and execution-only allowlists.
 4. Retain and compact directory digest, generation containment, atomic copy, and pointer publication.
 5. Add artifact-HEAD validation on restored, newly built, and bypass-built output.
 6. Add the post-build full-key recomputation and unstable-inputs no-store verdict.
-7. Replace recursive `npm run build` with scrubbed `npm run build:dist:validated`.
+7. Replace recursive `npm run build` with the three scrubbed direct Node steps.
 8. Change `package.json` to the exact three-script wiring below.
 9. Rewrite the focused cache test with the behavior and mutant matrix.
 10. Check physical line budgets before running verification.
 The exact scripts must be:
-
 ```json
 "build": "tsc -b && node tools/dist-build-cache.mjs && node tools/assert-dist-clean.mjs",
 "build:dist": "vite build --configLoader runner",
 "build:dist:validated": "tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs"
 ```
-
 The complete implementation allowlist is:
 
 - `tools/dist-build-cache.mjs`, rewritten.
@@ -271,18 +307,15 @@
 - `package.json`, script entries only.
 `tools/serve.mjs:63` and `tools/ai-dm-board-snapshot.ts:306` keep working unchanged.
 The following import probe returned no output with exit 1:
-
 ```sh
 rg -n 'dist-build-cache|productionBuildEnv|distBuildInputDigest' \
   tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
   tests/unit/ai-bridge/build-boundary.test.ts
 ```
 Neither test imports the module, so neither is authorized for modification.
-
 ## 7. Verification contract
 
 Then run, in order:
-
 ```sh
 npx tsc -b --force
 sg scan
@@ -292,94 +325,74 @@
   tests/unit/ai-bridge/build-boundary.test.ts
 wc -l tools/dist-build-cache.mjs
 ```
-
 ### Discovery proof
 
 Run the files-only discovery command and compare its normalized file set to the 641-file main baseline:
-
 ```sh
 npx vitest list --configLoader runner --filesOnly --json
 ```
-
 Run the bare JSON discovery command last, exactly as requested:
-
 ```sh
 npx vitest list --configLoader runner --json
 ```
 
 ### Supervisor four-build proof
-
 
 ```sh
 set -euo pipefail
 proof_tmp=$(mktemp -d)
-proof_file=docs/srd/SOURCE.md
-proof_backup="$proof_tmp/SOURCE.md.backup"
+proof_file=docs/guides/player-build-and-share.md
+proof_backup="$proof_tmp/player-build-and-share.md.backup"
+proof_marker=dist-cache-raw-proof-2026-09-14
 cp -- "$proof_file" "$proof_backup"
 trap 'cp -- "$proof_backup" "$proof_file"; rm -rf -- "$proof_tmp"' EXIT
-
+head=$(git rev-parse HEAD)
 check_artifact() {
   node -e '
-    const fs = require("node:fs");
-    const cp = require("node:child_process");
-    const artifact = JSON.parse(
-      fs.readFileSync("dist/vtt-handoff-artifact.json", "utf8"),
-    );
-    const head = cp.execFileSync("git", ["rev-parse", "HEAD"], {
-      encoding: "utf8",
-    }).trim();
-    if (artifact.commit !== head) throw new Error(`${artifact.commit} != ${head}`);
-    console.log(`artifact commit == HEAD: ${head}`);
-  '
+    const a = JSON.parse(require("node:fs").readFileSync(process.argv[1]));
+    if (a.commit !== process.argv[2]) throw new Error(`${a.commit} != ${process.argv[2]}`);
+    console.log(`artifact commit == HEAD: ${a.commit}`);
+  ' dist/vtt-handoff-artifact.json "$head"
 }
-
 run_build() {
   proof_label=$1
   shift
   env TMPDIR="$proof_tmp" "$@" npm run build 2>&1 | tee "$proof_tmp/$proof_label.log"
   check_artifact
 }
-
 run_build build-1
-printf '\n<!-- dist-cache-input-proof -->\n' >> "$proof_file"
+printf '\n<!-- %s -->\n' "$proof_marker" >> "$proof_file"
 run_build build-2
+marker_files=$(grep -rl -- "$proof_marker" dist | wc -l)
+test "$marker_files" -ge 1
+printf 'marker files after build-2=%s\n' "$marker_files"
 run_build build-3
 run_build build-4 FOO=bar
-
-node - "$proof_tmp" <<'NODE'
-const fs = require('node:fs');
-const root = process.argv[2];
-const read = (name) => fs.readFileSync(`${root}/${name}.log`, 'utf8');
-const logs = [1, 2, 3, 4].map((n) => read(`build-${n}`));
-const take = (pattern, text, label) => {
-  const found = pattern.exec(text);
-  if (found === null) throw new Error(`missing ${label}`);
-  return found[1];
-};
-const miss = /dist cache miss: ([0-9a-f]{64})/u;
-const hit = /dist cache hit: ([0-9a-f]{64})/u;
-const stored = /dist cache stored: ([0-9a-f]{64})/u;
-const first = take(miss, logs[0], 'build-1 MISS');
-const second = take(miss, logs[1], 'build-2 MISS');
-const third = take(hit, logs[2], 'build-3 HIT');
-const fourth = take(hit, logs[3], 'build-4 HIT');
-if (take(stored, logs[0], 'build-1 STORE') !== first) throw new Error('bad first store');
-if (take(stored, logs[1], 'build-2 STORE') !== second) throw new Error('bad second store');
-if (first === second) throw new Error('docs edit did not change the key');
-if (second !== third || third !== fourth) throw new Error('warm/ambient keys differ');
-for (const [index, log] of logs.entries()) {
-  if (!/dist clean: \d+ files scanned/u.test(log)) {
-    throw new Error(`build ${index + 1} omitted assert-dist-clean`);
-  }
-}
-console.log(`MISS ${first}; MISS ${second}; HIT ${third}; ambient HIT ${fourth}`);
-NODE
+miss='dist cache miss: [0-9a-f]\{64\}'
+hit='dist cache hit: [0-9a-f]\{64\}'
+stored='dist cache stored: [0-9a-f]\{64\}'
+grep -q "$miss" "$proof_tmp/build-1.log"
+grep -q "$stored" "$proof_tmp/build-1.log"
+grep -q "$miss" "$proof_tmp/build-2.log"
+grep -q "$stored" "$proof_tmp/build-2.log"
+grep -q "$hit" "$proof_tmp/build-3.log"
+grep -q "$hit" "$proof_tmp/build-4.log"
+grep -q 'dist clean: [0-9][0-9]* files scanned' "$proof_tmp"/build-*.log
+k1=$(sed -n 's/^dist cache miss: //p' "$proof_tmp/build-1.log")
+k2=$(sed -n 's/^dist cache miss: //p' "$proof_tmp/build-2.log")
+k3=$(sed -n 's/^dist cache hit: //p' "$proof_tmp/build-3.log")
+k4=$(sed -n 's/^dist cache hit: //p' "$proof_tmp/build-4.log")
+test "$k1" != "$k2"
+test "$k2" = "$k3"
+test "$k3" = "$k4"
+printf 'MISS %s; MISS %s; HIT %s; ambient HIT %s\n' "$k1" "$k2" "$k3" "$k4"
 ```
 
 Expected proof sequence:
 
 - Build 1 prints MISS and STORED for `K1`, prints a clean scan, and stamps HEAD.
-- The docs edit leaves HEAD fixed; build 2 prints MISS and STORED for distinct `K2`, clean, with HEAD.
+- The real `?raw` docs edit makes build 2 MISS/STORE distinct `K2`, clean, with HEAD.
+- Build 2's `grep -r` count is at least one, proving the marker reached emitted `dist/` bytes.
 - Build 3 prints HIT for `K2`, prints a clean scan, and restores an artifact stamped with HEAD.
 - Build 4 with ambient `FOO=bar` prints the same HIT for `K2`, clean, and artifact HEAD.
 ## 8. Assumptions verified read-only in this round
@@ -392,23 +405,12 @@
 $ git status --short --untracked-files=all
 [no output]
 ```
-
 ```text
-$ rg -n '^## D623.7' .claude/decisions.md
-22534:## D623.7 — M-2 BUILD-CACHE-01: owner rejects both the AST grammar and the checked-in fingerprint; ...
-$ wc -l -c research-build-cache-sol.md research-build-cache-opus.md
-  403 44152 research-build-cache-sol.md
-  494 29996 research-build-cache-opus.md
-  897 74148 total
-```
-
-```text
 $ git ls-files -s -z | tr '\0' '\n' | wc -l
 11504
 $ git status --porcelain=v1 -z --untracked-files=all | wc -c
 0
 ```
-
 ```text
 $ for cache_env_file in .env .env.local .env.production .env.production.local; do
 >   test -e "$cache_env_file" && echo "$cache_env_file present" && continue
@@ -420,120 +422,159 @@
 .env.production absent-nonignored
 .env.production.local absent-nonignored
 ```
-
 ```json
 {
   "rootLockfileVersion": 3,
   "hiddenLockfileVersion": 3,
+  "platformFilteredOut": 103,
   "eligibleRootPackages": 273,
   "hiddenPackages": 273,
   "missing": 0,
   "extra": 0,
   "versionMismatches": 0,
+  "resolvedMismatches": 0,
+  "integrityMismatches": 0,
   "classification": "matching",
   "hiddenSha256": "105f6967c08bcab6df88805b0cea2184f8a46fefb0161d1cf880b20f238cfbc9"
 }
 ```
-
-
 ```text
 $ git ls-files -s -- package-lock.json
 100644 d603b3d9950111d3df31acc01e31f54c26623eaf 0 package-lock.json
 $ node -p 'JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})'
 {"version":"v24.13.0","platform":"linux","arch":"x64"}
 ```
-
+The exact clean-tree key timing command was:
 ```sh
-/usr/bin/time -f 'wall_seconds=%e' node -e '
-const cp=require("node:child_process"),fs=require("node:fs"),C=require("node:crypto");
-const t=performance.now(),h=C.createHash("sha256");
-const F=x=>{
-  x=Buffer.isBuffer(x)?x:Buffer.from(x);
-  const n=Buffer.alloc(8);
-  n.writeBigUInt64BE(BigInt(x.length));
-  h.update(n);
-  h.update(x);
+/usr/bin/time -f 'wall_seconds=%e' node <<'NODE'
+const cp = require('node:child_process');
+const crypto = require('node:crypto');
+const fs = require('node:fs');
+const { performance } = require('node:perf_hooks');
+const started = performance.now();
+const git = (...args) => cp.execFileSync('git', args, {
+  env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
+  maxBuffer: 64 * 1024 * 1024,
+});
+const frame = (hash, value) => {
+  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
+  const size = Buffer.alloc(8);
+  size.writeBigUInt64BE(BigInt(bytes.length));
+  hash.update(size).update(bytes);
 };
-const G=a=>cp.execFileSync("git",a,{
-  maxBuffer:64*1024*1024,
-  env:{...process.env,GIT_OPTIONAL_LOCKS:"0"},
-});
-const Z=b=>(b.toString("latin1").match(/[^\0]*\0/g)??[])
-  .map(x=>Buffer.from(x,"latin1"));
-F("dnd-dist-build-cache-v2");
-const head=G(["rev-parse","HEAD"]).toString().trim();
-if(!/^[0-9a-f]{40}$/.test(head))throw Error("invalid-head");
-for(const x of [head,process.version,process.platform,process.arch])F(x);
-const index=G(["ls-files","-s","-z"]),rows=Z(index);
-const lock=rows.find(x=>x.toString("latin1").endsWith("\tpackage-lock.json\0"));
-F(/^\d+ ([0-9a-f]{40}) 0\t/.exec(lock?.toString("latin1")??"")[1]);
-const hiddenBytes=fs.readFileSync("node_modules/.package-lock.json");
-F(C.createHash("sha256").update(hiddenBytes).digest("hex"));
-const root=JSON.parse(fs.readFileSync("package-lock.json"));
-const hidden=JSON.parse(hiddenBytes);
-const allows=(v,c)=>!Array.isArray(v)||
-  (!v.includes("!"+c)&&(v.every(x=>x.startsWith("!"))||v.includes(c)));
-const expected=Object.keys(root.packages).filter(p=>p&&
-  allows(root.packages[p].os,process.platform)&&
-  allows(root.packages[p].cpu,process.arch)).sort();
-const actual=Object.keys(hidden.packages).sort();
-if(root.lockfileVersion!==hidden.lockfileVersion||expected.length!==actual.length||
-  expected.some((p,i)=>p!==actual[i]||
-  root.packages[p].version!==hidden.packages[p].version))throw Error("stale-install");
-const env={NODE_ENV:"production"};
-if(process.env.STATIC_APP_CACHE_DIR!==undefined){
-  env.STATIC_APP_CACHE_DIR=process.env.STATIC_APP_CACHE_DIR;
+const split = (bytes) => bytes.length === 0 ? [] : bytes.subarray(0, -1).toString().split('\0');
+const index = git('ls-files', '-s', '-z');
+const records = split(index);
+const lock = records.find((record) => record.endsWith('\tpackage-lock.json'));
+const hidden = fs.readFileSync('node_modules/.package-lock.json');
+const status = git('status', '--porcelain=v1', '-z', '--untracked-files=all', '--ignore-submodules=none');
+if (status.length !== 0) throw new Error('probe expected clean tree');
+const publicPaths = split(
+  git('ls-files', '-z', '--others', '--ignored', '--exclude-standard', '--', 'public'),
+).sort(Buffer.compare);
+const hash = crypto.createHash('sha256');
+for (const value of ['dnd-dist-build-cache-v2', git('rev-parse', 'HEAD').toString().trim(),
+  process.version, process.platform, process.arch, lock.split(' ')[1],
+  crypto.createHash('sha256').update(hidden).digest('hex')]) frame(hash, value);
+for (const value of ['LANG=C.UTF-8', 'LC_ALL=C.UTF-8', 'NODE_ENV=production']) frame(hash, value);
+for (const record of records) frame(hash, Buffer.from(record + '\0'));
+if (publicPaths.length !== 0) throw new Error('probe expected no ignored public files');
+for (const path of ['.env', '.env.local', '.env.production', '.env.production.local']) {
+  frame(hash, path);
+  frame(hash, fs.existsSync(path) ? 'present' : 'absent');
+  if (fs.existsSync(path)) frame(hash, crypto.createHash('sha256').update(fs.readFileSync(path)).digest('hex'));
 }
-for(const [k,v] of Object.entries(env).sort(([a],[b])=>a.localeCompare(b)))F(k+"="+v);
-for(const row of rows)F(row);
-const tags=Z(G(["ls-files","-v","-z"]));
-if(tags.some(x=>/[a-zS]/.test(String.fromCharCode(x[0]))))throw Error("special-index");
-if(rows.some(x=>x.subarray(0,6).toString()==="160000"))throw Error("submodule");
-const status=G(["status","--porcelain=v1","-z","--untracked-files=all",
-  "--ignore-submodules=none"]);
-if(status.length)throw Error("not-clean");
-for(const p of [".env",".env.local",".env.production",".env.production.local"]){
-  F(p);
-  if(!fs.existsSync(p)){F("absent");continue}
-  F("present");
-  F(C.createHash("sha256").update(fs.readFileSync(p)).digest("hex"));
-}
-console.log("index_bytes="+index.length);
-console.log("key="+h.digest("hex"));
-console.log("key_compute_ms="+(performance.now()-t).toFixed(3));
-'
+console.log(`index_records=${records.length}\nindex_bytes=${index.length}\nstatus_bytes=${status.length}`);
+console.log(`ignored_public_records=${publicPaths.length}`);
+console.log('declared_env=LANG=C.UTF-8,LC_ALL=C.UTF-8,NODE_ENV=production');
+console.log(`key=${hash.digest('hex')}\nkey_compute_ms=${(performance.now() - started).toFixed(3)}`);
+NODE
 ```
-
 ```text
+index_records=11504
 index_bytes=1657692
-key=f3c2f5e00c493e36e1e46c5ee3369946aa2950b5477f5b9a790b2cd13e566b37
-key_compute_ms=478.797
-wall_seconds=0.50
+status_bytes=0
+ignored_public_records=0
+declared_env=LANG=C.UTF-8,LC_ALL=C.UTF-8,NODE_ENV=production
+key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
+key_compute_ms=69.556
+wall_seconds=0.09
 ```
-
+```text
+$ git config --get core.autocrlf; printf 'autocrlf_exit=%s\\n' "$?"
+autocrlf_exit=1
+$ git ls-files -- .gitattributes '**/.gitattributes'
+[no output]
+$ git ls-files -s -z | tr '\\0' '\\n' | awk '$1 == "120000" {print}' | wc -l
+0
+$ git ls-files -z --others --ignored --exclude-standard -- public | tr '\\0' '\\n' | wc -l
+0
+```
+The `core.autocrlf` exit 1 is the supported unset result.
 ```sh
-env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR-}" LANG="${LANG-}" \
-  LC_ALL="${LC_ALL-}" TZ="${TZ-}" NODE_ENV=production npm run env 2>/dev/null |
-  awk '/^(NODE(|_.*)|npm_config_.*)=/' | sort
+node <<'NODE'
+const cp = require('node:child_process');
+const { performance } = require('node:perf_hooks');
+const paths = cp.execFileSync('git', ['ls-files', '-z', '--', 'art/requests'])
+  .toString().split('\0').filter(Boolean).slice(0, 85);
+const sequential = () => Buffer.concat(paths.map((path) =>
+  cp.execFileSync('git', ['hash-object', '--no-filters', '--', path])));
+const batched = () => cp.execFileSync('git', ['hash-object', '--no-filters', '--stdin-paths'], {
+  input: paths.join('\n') + '\n',
+});
+const bytes = paths.reduce((sum, path) => sum + require('node:fs').statSync(path).size, 0);
+console.log(`paths=${paths.length} bytes=${bytes}`);
+for (let trial = 1; trial <= 3; trial++) {
+  const start = performance.now();
+  const expected = sequential();
+  const split = performance.now();
+  const actual = batched();
+  console.log(`${trial} ${(split - start).toFixed(3)} ` +
+    `${(performance.now() - split).toFixed(3)} ${expected.equals(actual)}`);
+}
+NODE
 ```
-
 ```text
-NODE=/home/vagrant/.nvm/versions/node/v24.13.0/bin/node
-NODE_ENV=production
-npm_config_cache=/home/vagrant/.npm
-npm_config_global_prefix=/home/vagrant/.nvm/versions/node/v24.13.0
-npm_config_globalconfig=/home/vagrant/.nvm/versions/node/v24.13.0/etc/npmrc
-npm_config_init_module=/home/vagrant/.npm-init.js
-npm_config_local_prefix=/home/vagrant/PhpstormProjects/dnd-wt-build-cache
-npm_config_node_gyp=/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js
-npm_config_noproxy=
-npm_config_npm_version=11.6.2
-npm_config_prefix=/home/vagrant/.nvm/versions/node/v24.13.0
-npm_config_user_agent=npm/11.6.2 node/v24.13.0 linux x64 workspaces/false
-npm_config_userconfig=/home/vagrant/.npmrc
+paths=85 bytes=259981
+1 145.889 3.452 true
+2 143.106 3.182 true
+3 143.451 3.177 true
 ```
-
+```sh
+for cache_locale in en_US.UTF-8 da_DK.UTF-8 C.UTF-8; do
+  LANG="$cache_locale" LC_ALL="$cache_locale" \
+    node --no-warnings --experimental-strip-types --input-type=module <<'NODE'
+import { appShellVersion } from './tools/pwa/service-worker.ts';
+const assets = [
+  { fileName: 'assets/index-aaa.js', source: 'a' },
+  { fileName: 'assets/index-az.js', source: 'z' },
+];
+const names = assets.map((asset) => asset.fileName).sort((a, b) => a.localeCompare(b));
+console.log(Intl.DateTimeFormat().resolvedOptions().locale, names.join(','), appShellVersion(assets));
+NODE
+done
+```
+```text
+en-US assets/index-aaa.js,assets/index-az.js 1ed55b4e6ef4a643
+da-DK assets/index-az.js,assets/index-aaa.js 456c40d44eed648a
+en-US assets/index-aaa.js,assets/index-az.js 1ed55b4e6ef4a643
+```
 ```text
+$ git ls-files -- .npmrc
+[no output]
+$ test -e .npmrc
+exit 1
+$ rg -n 'NODE_OPTIONS|node-options' scripts tools package.json
+[no output]
+$ rg -n 'NODE_OPTIONS|node-options' \
+> /home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/npm/node_modules/@npmcli/config/lib/set-envs.js
+102:  if (cliConf['node-options']) {
+103:    env.NODE_OPTIONS = cliConf['node-options']
+$ rg -n 'player-build-and-share\.md\?raw' src/ui/screens/player-guide/screen.ts
+1:import playerGuideMarkdown from '../../../../docs/guides/player-build-and-share.md?raw';
+```
+The local TypeScript and Vite package bins are present at the direct paths named in section 4.
+```text
 $ git ls-files -v -z | tr '\0' '\n' | awk 'substr($0,1,1) ~ /[a-zS]/ {print}' | wc -l
 0
 $ git ls-files -s -z | tr '\0' '\n' | awk '$1 == "160000" {print}' | wc -l
@@ -543,21 +584,32 @@
 reports/mutation/mutation.json
 reports/perf/fullsuite-sql/sql-profile.json
 ```
-
 ```text
 $ grep -rl PhpstormProjects /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/dist | wc -l
 0
 ```
-
 ```text
 $ npx vitest list --configLoader runner --filesOnly --json | <JSON counter>
 {"shape":"array","fileCount":641,...}
 $ sha256sum src/vtt/intel/contracts.ts
 0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
 ```
+No build, Vitest run, Playwright run, install, Git write, model call, or port access occurred.
+## 9. PR4 findings disposition
 
-No build, Vitest run, Playwright run, install, Git write, model call, or port access occurred.
-## 9. Risks and accepted trade-offs
+| Finding | Resolution in this plan |
+|---|---|
+| PR4-F1 | Sections 3.2-3.5 and 5 add ignored-public hashing and its regression. |
+| PR4-F2 | Sections 3.4, 4, 5, and 8 force, hash, and test the locale. |
+| PR4-F3 | Sections 3.2, 3.5, 5, and 8 batch hashes and reject LF paths. |
+| PR4-F4 | Section 5 directly compares keys across identical-tree commits. |
+| PR4-F5 | Section 7 edits and proves emission of the imported Markdown. |
+| PR4-F6 | Sections 3.2, 3.5, and 5 bypass and test all symlinks. |
+| PR4-F7 | Sections 4-6 and 8 replace npm with tested direct steps. |
+| PR4-F8 | Sections 3.2, 3.5, 5, and 8 enforce normalization limits. |
+| PR4-F9 | Sections 1, 3.3, 5, and 10 state and test the dependency contract. |
+| PR4-F10 | Section 5 retains both independent nonmutation assertions. |
+## 10. Risks and accepted trade-offs
 
 ### Coarse invalidation and hit rate
 
@@ -583,7 +635,13 @@
 The comparison will classify that checkout as `stale-install` and run a validated uncached build.
 It will not restore or publish a cache entry from that uncertain dependency installation.
 After the owner runs a fresh `npm ci`, the automatically matching hidden lock makes caching available.
-The failure mode is a slower correct build, never a hit built from the wrong dependency set.
+Subject to immutable npm-managed package bytes, this failure mode is a slower correct build rather than a wrong hit.
+Manual edits below `node_modules/` without hidden-lock changes violate that explicit prerequisite.
+### Additional correctness costs
+
+Ignored regular files under `public/` are the sole ignored-content exception because Vite copies them.
+Symlinks and Git normalization rules bypass because neither is represented safely by raw blob identity here.
+The direct leaf duplicates the human script definition; exact descriptor/script expansion tests prevent drift.
 ### Operational bounds
 
 Any Git failure, special index state, submodule, or uncertain install bypasses instead of guessing.

tokens used
552,414
Revised plan: [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md)

### Final audit

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
649 35288 .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
c572d65e4d02e34f874322b08c466e858f74886e191e63a846dd1ff9bf52cfe9

maximum line width: 116
lines over 120 columns: 0
```

| Finding | Plan sections |
|---|---|
| PR4-F1 | 3.2–3.5, 5 |
| PR4-F2 | 3.4, 4, 5, 8 |
| PR4-F3 | 3.2, 3.5, 5, 8 |
| PR4-F4 | 5 |
| PR4-F5 | 7 |
| PR4-F6 | 3.2, 3.5, 5 |
| PR4-F7 | 4–6, 8 |
| PR4-F8 | 3.2, 3.5, 5, 8 |
| PR4-F9 | 1, 3.3, 5, 10 |
| PR4-F10 | 5 |

### Probe results

The exact Node and shell heredocs are reproduced in plan section 8.

```text
git ls-files -s -z | tr '\0' '\n' | wc -l
11504

git status --porcelain=v1 -z --untracked-files=all | wc -c
0

git ls-files -z --others --ignored --exclude-standard -- public | tr '\0' '\n' | wc -l
0
```

Full clean-key probe:

```text
index_records=11504
index_bytes=1657692
status_bytes=0
ignored_public_records=0
declared_env=LANG=C.UTF-8,LC_ALL=C.UTF-8,NODE_ENV=production
key=a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
key_compute_ms=69.556
wall_seconds=0.09
```

Batched hash probe over 85 tracked files totaling 259,981 bytes:

```text
trial  sequential_ms  batch_ms  identical
1      145.889        3.452     true
2      143.106        3.182     true
3      143.451        3.177     true
```

Hidden-lock comparison:

```text
rootLockfileVersion=3
hiddenLockfileVersion=3
platformFilteredOut=103
eligibleRootPackages=273
hiddenPackages=273
missing=0
extra=0
versionMismatches=0
resolvedMismatches=0
integrityMismatches=0
classification=matching
```

Additional controls:

```text
core.autocrlf: unset, command exit 1
tracked .gitattributes: 0
indexed symlinks: 0
submodules: 0

.env: absent-nonignored
.env.local: absent-nonignored
.env.production: absent-nonignored
.env.production.local: absent-nonignored
```

The locale control reproduced distinct output under `da_DK.UTF-8`; forcing `C.UTF-8` reproduced the stable en-US result. Installed npm source confirmed that `node-options` recreates `NODE_OPTIONS`; the plan therefore selects direct-child option (b), for which the required `npm_config_*`/`NODE_*` child-variable list is empty.

```text
$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

```text
$ git status --short --untracked-files=all
[no output]
```

PLAN M2 R5 DONE
