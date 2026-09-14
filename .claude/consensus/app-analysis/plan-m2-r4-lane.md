# M-2 plan round 4 lane report (sol 01a0a0e3-f2f1-73c2-8284-5bc3b5606882), harvested 2026-09-14 13:34

Created [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md).

Final report:

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
591 28909

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
6098a2130a93e810e0f6f92980fef496567c7fa53152fe54def2cc8a1a44edb8
```

```text
$ git status --short --untracked-files=all
[no output]
```

Required probes:

```text
$ git ls-files -s -z | tr '\0' '\n' | wc -l
11504

$ git status --porcelain=v1 -z --untracked-files=all | wc -c
0
```

```text
.env absent-nonignored
.env.local absent-nonignored
.env.production absent-nonignored
.env.production.local absent-nonignored
```

Hidden-lock comparison:

```text
lockfileVersion: 3 == 3
eligible root packages: 273
hidden-lock packages: 273
missing: 0
extra: 0
version mismatches: 0
classification: matching
hidden SHA-256: 105f6967c08bcab6df88805b0cea2184f8a46fefb0161d1cf880b20f238cfbc9
```

Full-key probe:

```text
index_bytes=1657692
key=f3c2f5e00c493e36e1e46c5ee3369946aa2950b5477f5b9a790b2cd13e566b37
key_compute_ms=478.797
wall_seconds=0.50
```

The scrubbed `npm run env` probe exited 0 and produced `NODE`, forced `NODE_ENV`, and 11 npm-created `npm_config_*` variables. No inherited npm or arbitrary Node variables were required. Exact command and output are included in the plan.

Frozen contract:

```text
$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

No build, test run, install, Git write, model call, or port access occurred.

PLAN M2 R4 DONE
diff --git a/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
new file mode 100644
index 0000000000000000000000000000000000000000..11e1202dd24d5f300f4625058d8c4e66de897a42
--- /dev/null
+++ b/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
@@ -0,0 +1,591 @@
+# M-2 BUILD-CACHE-01 redesign: automatic Git-content key
+
+Planning base: `fdcd0c445525caf82619fab04f3037e416c2e3b1`
+## 1. Goal and non-goals
+
+### Goal
+
+- Cache one complete, validated `dist/` generation under an automatic SHA-256 key.
+- Make every tracked file and every nonignored untracked worktree file an input.
+- Hash Vite configuration as ordinary tracked bytes, with no interpretation of its syntax.
+- Include dirty tracked content without modifying the real Git index.
+- Include the commit because Vite writes it into the artifact.
+- Include the installed dependency identity and bypass when the installation is stale.
+- Expose only a declared environment to the build child.
+- Preserve verified, atomic, cross-worktree restoration and publication.
+- Recheck the complete key after a miss build and never store unstable inputs.
+- Keep TypeScript and `assert-dist-clean` on every public `npm run build` path.
+
+### Non-goals
+
+- Do not cache individual Rollup chunks or perform an incremental production build.
+- Do not add a walker, import resolver, closure computation, AST grammar, or fingerprint constant.
+- Do not exclude `tests/**`, `.claude/**`, `docs/**`, Markdown, or any other Git-visible class.
+- Do not hash ignored files except the four explicit root Vite production environment files.
+- Do not hash timestamps, traversal order, checkout root, or the ambient environment.
+- Do not change `vite.config.ts`, either direct cache caller, or the frozen VTT contract.
+- Do not use or create `tools/dist-build-inputs.mjs`.
+- Do not migrate bundlers or invent a persistent Rollup cache.
+Vite 7.3.6 and Rollup 4.62.2 have no persistent incremental production cache.
+The complete coherent `dist/` directory is therefore the cache unit.
+Git trees already provide the recursive content fingerprint requested by the owner.
+## 2. Current behavior at HEAD
+
+- `tools/dist-build-cache.mjs:18-19` names format v1 and stores it below `os.tmpdir()`.
+- `tools/dist-build-cache.mjs:26-46` declares seven hand-maintained input classes.
+- `tools/dist-build-cache.mjs:48-57` discovers only root Vite and TypeScript configuration names.
+- `tools/dist-build-cache.mjs:59-80` recursively walks declared filesystem paths.
+- `tools/dist-build-cache.mjs:82-87` supplies the reusable 8-byte big-endian framing helper.
+- `tools/dist-build-cache.mjs:106-114` hashes format, relative path, and file bytes.
+- `tools/dist-build-cache.mjs:106-114` omits HEAD, dirty Git state, install state, and environment.
+- `tools/dist-build-cache.mjs:132-137` spreads the entire parent environment into the build child.
+- `tools/dist-build-cache.mjs:155-189` verifies source and copied directory digests before restore.
+- `tools/dist-build-cache.mjs:155-189` does not verify the restored artifact's commit.
+- `tools/dist-build-cache.mjs:191-202` reports an unkeyed miss and recursively runs `npm run build`.
+- `tools/dist-build-cache.mjs:204-234` publishes a generation before atomically replacing its pointer.
+- `tools/serve.mjs:59-73` invokes `node tools/dist-build-cache.mjs` before serving.
+- `tools/ai-dm-board-snapshot.ts:304-320` invokes the same cache module before capture.
+- `vite.config.ts:114-125` writes `git rev-parse HEAD` into `vtt-handoff-artifact.json`.
+- `vite.config.ts:167-183` derives and emits the service worker after enumerating deployable assets.
+- `vite.config.ts:267` reads `STATIC_APP_CACHE_DIR` from the process environment.
+- `package.json:10` currently runs `tsc -b`, Vite, and `assert-dist-clean` directly.
+## 3. Exact cache-key and verdict design
+
+### 3.1 Framing
+
+Reuse `framed(hash, bytes)` from `tools/dist-build-cache.mjs:82-87`.
+Each field gets an unsigned 8-byte big-endian byte length followed by its exact bytes.
+Use a 64 MiB `maxBuffer` for every captured Git command.
+The local 1,657,692-byte index stream exceeds Node's default 1 MiB child-process buffer.
+Set `GIT_OPTIONAL_LOCKS=0` on Git probes and treat any spawn error or nonzero exit as `git-failure`.
+### 3.2 Precondition verdicts
+
+
+- `invalid-head` when trimmed `git rev-parse HEAD` is not exactly 40 lowercase hex bytes.
+- `git-failure` when any Git command fails or emits malformed required machine output.
+- `special-index` for any assume-unchanged or skip-worktree entry.
+- `submodule` for any index record whose mode is `160000`.
+- `stale-install` for an absent, malformed, or mismatched hidden npm lock.
+`git ls-files -v -z` is parsed as NUL records.
+Any record whose one-byte tag is lowercase or `S` causes `special-index`.
+A bypass performs no cache pointer read and no cache write.
+### 3.3 Dependency-install comparison
+
+Read the `package-lock.json` stage-0 blob ID from the full index stream.
+Read and SHA-256 hash `node_modules/.package-lock.json` as raw bytes.
+Require equal `lockfileVersion` values.
+Build the expected package-path set from root-lock `packages`, excluding the root `""` entry.
+Filter `os` and `cpu` arrays using npm's positive and `!negative` platform/architecture semantics.
+Require the hidden lock package paths to equal that eligible set exactly after bytewise sorting.
+Require equal `version` values for every matched package path.
+If future lock entries use a `libc` qualifier, bypass until the comparison explicitly supports it.
+Absence, JSON failure, set mismatch, version mismatch, or qualifier uncertainty is `stale-install`.
+### 3.4 Key composition
+
+Feed fields into one SHA-256 instance in this exact order:
+1. Frame the literal `dnd-dist-build-cache-v2`.
+2. Frame trimmed output from `git rev-parse HEAD`.
+3. Frame `process.version`.
+4. Frame `process.platform`.
+5. Frame `process.arch`.
+6. Frame the stage-0 `package-lock.json` object ID from the index stream.
+7. Frame SHA-256 hex of raw `node_modules/.package-lock.json` bytes.
+8. Frame each declared `name=value` environment record in bytewise name order.
+9. Frame every raw, terminal-NUL index record in Git's emitted order.
+10. Frame every canonical dirty-overlay record in bytewise path order.
+11. Frame each of the four explicit root Vite environment-file probes in fixed order.
+The declared environment records are always `NODE_ENV=production` and, when set, the exact
+`STATIC_APP_CACHE_DIR=<value>` record.
+The fixed environment-file order is `.env`, `.env.local`, `.env.production`, then
+`.env.production.local`.
+For each environment-file probe, frame its path and `absent`, or its path, `present`, and SHA-256.
+### 3.5 Exact Git commands
+
+Run these commands from the requested repository root:
+
+```sh
+git rev-parse HEAD
+git ls-files -s -z
+git ls-files -v -z
+git status --porcelain=v1 -z --untracked-files=all --ignore-submodules=none
+git hash-object --no-filters -- <dirty-or-untracked-path>
+```
+
+The index command returns `mode SP object-id SP stage TAB path NUL` records.
+Preserve each complete index record, including its terminal NUL, as the framed key field.
+The status command returns `XY SP path NUL` for ordinary records.
+With `-z`, a rename or copy returns the new path in that record and the old path in the next NUL field.
+Do not split Git output on lines, whitespace, arrows, tabs inside paths, or quoted-path syntax.
+Parse the two status bytes and separator by fixed offsets and preserve path bytes after byte 3.
+Sort overlay records bytewise by new/current path, then old path, then status.
+For each overlay record, frame status, old path, and new path in that order.
+For old and new path slots, frame the slot name and `none`, `deleted`, or `present`.
+For each extant slot, frame Git-style current mode and raw-content object ID.
+Derive modes with `lstat`: regular non-executable `100644`, executable `100755`, symlink `120000`.
+Obtain each extant path's object ID with `git hash-object --no-filters -- <path>`.
+Tracked files remain in `git ls-files -s` even when a current ignore rule names them.
+There is no additional exclusion predicate.
+### 3.6 Lookup, restore, build, and store
+
+Compute the complete verdict before reading a pointer.
+Use `os.tmpdir()/dnd-dist-build-cache-v2` so compatible worktrees can share generations.
+Keep immutable unique generations and atomic complete-generation-before-pointer publication.
+On a cacheable verdict, verify a pointer's format, key, HEAD, generation containment, and digest.
+Verify the cached generation's directory digest before copying it.
+Copy into a worktree-local partial directory and verify its directory digest again.
+Parse the copied `dist/vtt-handoff-artifact.json` and require `commit === expected HEAD`.
+Only then atomically replace the worktree's `dist/` and print `dist cache hit: <key>`.
+Treat a missing, malformed, corrupt, or wrong-HEAD generation as a miss, never as a hit.
+Spawn `npm run build:dist:validated` under the scrubbed environment on miss or bypass.
+After a successful child, parse the live artifact and require its `commit` to equal pre-build HEAD.
+On bypass, return the validated live `dist/` without any store attempt.
+On miss, recompute the entire key after validation.
+If the second verdict is not cacheable or its key or HEAD differs, print `dist cache unstable-inputs`.
+Leave the successful live `dist/` in place but do not publish a generation for unstable inputs.
+If the keys match, copy and digest `dist/`, publish atomically, then print `dist cache stored: <key>`.
+### 3.7 Required print sites
+
+The module must emit these exact prefixes:
+
+```text
+dist cache miss: <key>
+dist cache hit: <key>
+dist cache stored: <key>
+dist cache bypass: <reason>
+dist cache unstable-inputs
+```
+
+The validated build and outer public guard retain this existing output:
+
+```text
+dist clean: N files scanned
+```
+
+### 3.8 Size contract
+
+Keep the complete key/verdict computation at or below 150 physical lines.
+Keep the whole rewritten module at or below 230 physical lines.
+Do not add a module unless actual implementation exceeds 400 lines and a new plan proves why.
+## 4. Environment allowlist
+
+Construct the child environment from a new empty object.
+Hash and pass:
+
+- `NODE_ENV=production`, forced even when the parent supplies another value or no value.
+- `STATIC_APP_CACHE_DIR`, only when it is present in the parent environment.
+Pass through only when present, but do not hash:
+
+- `PATH`.
+- `HOME`.
+- `TMPDIR`.
+- `LANG`.
+- `LC_ALL`.
+- `TZ`.
+Drop `SHELL`, every ambient `VITE_*`, every ambient `npm_config_*`, `NODE_OPTIONS`, and all other names.
+The cache module starts npm with no inherited `npm_config_*`, `NODE`, `NODE_OPTIONS`, or other `NODE_*`.
+npm itself then created exactly `NODE` plus these 11 `npm_config_*` variables:
+
+The exact names and values appear in the verified probe output in section 8.
+Add an integration fixture named `vite.config.mjs` that reads an undeclared test variable.
+Run the fixture only through the cache module's scrubbed `npm run build:dist:validated` child.
+Assert that the config records `undefined`, while setting the variable also leaves the key unchanged.
+## 5. Test matrix and mutation contract
+
+Rewrite `tests/unit/tools/dist-build-cache.test.ts` around isolated temporary Git repositories.
+Retain these two existing test names and strengthen their expected complete allowlist output:
+
+- `overrides an inherited NODE_ENV with production`.
+- `sets NODE_ENV to production when the parent leaves it unset`.
+Deliberately replace the old test `preserves every other parent variable`.
+Name its replacement `drops undeclared parent variables and keeps only execution allowlist values`.
+The replacement must assert that `PATH`, `HOME`, `TMPDIR`, `LANG`, `LC_ALL`, and `TZ` survive.
+The replacement must assert that a custom name, `VITE_*`, `NODE_OPTIONS`, and `npm_config_*` do not survive.
+Required behavior cases:
+
+- `TRACKED_SRC_CONTENT_MISS` edits tracked source bytes while restoring its original mtime and mode.
+- It must miss through status plus `hash-object`, not timestamps.
+- `DIRTY_BYTES_BEAT_MTIME` compares two dirty byte states with identical path, mode, status, and mtime.
+- The two dirty states must have different keys.
+- `UNTRACKED_GLOB_FILE_MISS` adds `src/worker/handlers/new-handler.ts` and must miss.
+- `DRIZZLE_RAW_CONTENT_MISS` edits a tracked `drizzle/*.sql` file and must miss.
+- `DOCS_RAW_CONTENT_MISS` edits a tracked `docs/**` raw-import fixture and must miss.
+- `TEST_FILE_CONTENT_MISS` edits `tests/**` and must positively assert a miss.
+- `DECLARED_STATIC_CACHE_DIR_MISS` changes `STATIC_APP_CACHE_DIR` and must miss.
+- `UNDECLARED_ENV_IS_HERMETIC` sets an undeclared variable and must keep the key equal.
+- `UNDECLARED_ENV_IS_HERMETIC` must also observe `undefined` from the fixture config.
+- `VITE_ENV_FILE_MISS` creates `.env.production` and must miss when it is nonignored.
+- Parameterize `VITE_ENV_FILE_MISS` with a pre-existing ignore rule and require the same miss.
+- `HEAD_ONLY_CHANGE_MISS` creates a new commit with an identical tree and must miss.
+- Its next invocation must hit and restore an artifact whose `commit` equals the new HEAD.
+- `HIDDEN_LOCK_STALE_BYPASS` removes `ws` or the analogous direct fixture package from the hidden lock.
+- It must print exactly `dist cache bypass: stale-install` and never read or write a pointer.
+- `ASSUME_UNCHANGED_BYPASS` marks a fixture entry assume-unchanged and must bypass `special-index`.
+- Add the same assertion for a skip-worktree fixture entry.
+- `SUBMODULE_BYPASS` presents an index mode `160000` and must bypass `submodule`.
+- `GIT_FAILURE_BYPASS` and `INVALID_HEAD_BYPASS` require their exact bounded reasons.
+- `INPUT_CHANGED_DURING_BUILD_NOT_STORED` makes the fixture child edit a tracked input.
+- It must print `dist cache unstable-inputs` and leave no pointer for either key.
+- `CORRUPTED_GENERATION_REBUILDS` mutates cached generation bytes and must miss and rebuild.
+- `DIST_OUTPUT_IS_IGNORED` edits only ignored `dist/` bytes and must keep the key unchanged.
+- `TRACKED_DELETION_MISS` deletes a tracked input and must miss through an explicit deletion record.
+- `OVERLAY_ORDER_IS_CANONICAL` hashes equivalent synthetic NUL records in opposite orders equally.
+- `PATH_BYTES_ARE_NUL_PARSED` covers spaces, tabs, and newlines without line-based parsing.
+- `WRONG_ARTIFACT_HEAD_NEVER_HITS` forges a digest-consistent generation with the wrong commit.
+- It must rebuild and must never print `dist cache hit`.
+- `MISS_WRONG_ARTIFACT_HEAD_FAILS` makes the build emit the wrong commit and must return nonzero.
+Required named mutants and the exact code changes that must make the focused suite red:
+
+- `DROP_HEAD`: remove `frame(head)`; `HEAD_ONLY_CHANGE_MISS` turns red.
+- `DROP_STATUS_OVERLAY`: skip all parsed status records; `TRACKED_SRC_CONTENT_MISS` turns red.
+- `DROP_HASH_OBJECT`: replace the object ID with `lstat().mtimeMs`; `DIRTY_BYTES_BEAT_MTIME` turns red.
+- `DROP_ENV_PROBES`: remove the four-file loop; the ignored `VITE_ENV_FILE_MISS` arm turns red.
+- `SPREAD_PARENT_ENV`: initialize with `{ ...parentEnv }`; the deliberate environment rewrite turns red.
+- `SKIP_POST_BUILD_RECHECK`: store under the pre-build key directly; the race test turns red.
+- `ACCEPT_STALE_INSTALL`: force the hidden-lock comparison true; the stale-install bypass test turns red.
+- `IGNORE_DELETIONS`: discard status records whose worktree path is absent; the deletion test turns red.
+- `UNSORTED_OVERLAY`: remove the bytewise canonical sort; the reversed synthetic overlay test turns red.
+## 6. Implementation order and allowed files
+
+1. Rewrite key computation in `tools/dist-build-cache.mjs` around the five Git commands.
+2. Add strict HEAD, special-index, submodule, and hidden-install verdicts.
+3. Replace parent spreading with the exact hashed and execution-only allowlists.
+4. Retain and compact directory digest, generation containment, atomic copy, and pointer publication.
+5. Add artifact-HEAD validation on restored, newly built, and bypass-built output.
+6. Add the post-build full-key recomputation and unstable-inputs no-store verdict.
+7. Replace recursive `npm run build` with scrubbed `npm run build:dist:validated`.
+8. Change `package.json` to the exact three-script wiring below.
+9. Rewrite the focused cache test with the behavior and mutant matrix.
+10. Check physical line budgets before running verification.
+The exact scripts must be:
+
+```json
+"build": "tsc -b && node tools/dist-build-cache.mjs && node tools/assert-dist-clean.mjs",
+"build:dist": "vite build --configLoader runner",
+"build:dist:validated": "tsc -b && npm run build:dist && node tools/assert-dist-clean.mjs"
+```
+
+The complete implementation allowlist is:
+
+- `tools/dist-build-cache.mjs`, rewritten.
+- `tests/unit/tools/dist-build-cache.test.ts`, rewritten.
+- `package.json`, script entries only.
+`tools/serve.mjs:63` and `tools/ai-dm-board-snapshot.ts:306` keep working unchanged.
+The following import probe returned no output with exit 1:
+
+```sh
+rg -n 'dist-build-cache|productionBuildEnv|distBuildInputDigest' \
+  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
+  tests/unit/ai-bridge/build-boundary.test.ts
+```
+Neither test imports the module, so neither is authorized for modification.
+
+## 7. Verification contract
+
+Then run, in order:
+
+```sh
+npx tsc -b --force
+sg scan
+node --check tools/dist-build-cache.mjs
+npx vitest run --configLoader runner tests/unit/tools/dist-build-cache.test.ts \
+  tests/unit/tools/scraper-is-never-in-the-bundle.test.ts \
+  tests/unit/ai-bridge/build-boundary.test.ts
+wc -l tools/dist-build-cache.mjs
+```
+
+### Discovery proof
+
+Run the files-only discovery command and compare its normalized file set to the 641-file main baseline:
+
+```sh
+npx vitest list --configLoader runner --filesOnly --json
+```
+
+Run the bare JSON discovery command last, exactly as requested:
+
+```sh
+npx vitest list --configLoader runner --json
+```
+
+### Supervisor four-build proof
+
+
+```sh
+set -euo pipefail
+proof_tmp=$(mktemp -d)
+proof_file=docs/srd/SOURCE.md
+proof_backup="$proof_tmp/SOURCE.md.backup"
+cp -- "$proof_file" "$proof_backup"
+trap 'cp -- "$proof_backup" "$proof_file"; rm -rf -- "$proof_tmp"' EXIT
+
+check_artifact() {
+  node -e '
+    const fs = require("node:fs");
+    const cp = require("node:child_process");
+    const artifact = JSON.parse(
+      fs.readFileSync("dist/vtt-handoff-artifact.json", "utf8"),
+    );
+    const head = cp.execFileSync("git", ["rev-parse", "HEAD"], {
+      encoding: "utf8",
+    }).trim();
+    if (artifact.commit !== head) throw new Error(`${artifact.commit} != ${head}`);
+    console.log(`artifact commit == HEAD: ${head}`);
+  '
+}
+
+run_build() {
+  proof_label=$1
+  shift
+  env TMPDIR="$proof_tmp" "$@" npm run build 2>&1 | tee "$proof_tmp/$proof_label.log"
+  check_artifact
+}
+
+run_build build-1
+printf '\n<!-- dist-cache-input-proof -->\n' >> "$proof_file"
+run_build build-2
+run_build build-3
+run_build build-4 FOO=bar
+
+node - "$proof_tmp" <<'NODE'
+const fs = require('node:fs');
+const root = process.argv[2];
+const read = (name) => fs.readFileSync(`${root}/${name}.log`, 'utf8');
+const logs = [1, 2, 3, 4].map((n) => read(`build-${n}`));
+const take = (pattern, text, label) => {
+  const found = pattern.exec(text);
+  if (found === null) throw new Error(`missing ${label}`);
+  return found[1];
+};
+const miss = /dist cache miss: ([0-9a-f]{64})/u;
+const hit = /dist cache hit: ([0-9a-f]{64})/u;
+const stored = /dist cache stored: ([0-9a-f]{64})/u;
+const first = take(miss, logs[0], 'build-1 MISS');
+const second = take(miss, logs[1], 'build-2 MISS');
+const third = take(hit, logs[2], 'build-3 HIT');
+const fourth = take(hit, logs[3], 'build-4 HIT');
+if (take(stored, logs[0], 'build-1 STORE') !== first) throw new Error('bad first store');
+if (take(stored, logs[1], 'build-2 STORE') !== second) throw new Error('bad second store');
+if (first === second) throw new Error('docs edit did not change the key');
+if (second !== third || third !== fourth) throw new Error('warm/ambient keys differ');
+for (const [index, log] of logs.entries()) {
+  if (!/dist clean: \d+ files scanned/u.test(log)) {
+    throw new Error(`build ${index + 1} omitted assert-dist-clean`);
+  }
+}
+console.log(`MISS ${first}; MISS ${second}; HIT ${third}; ambient HIT ${fourth}`);
+NODE
+```
+
+Expected proof sequence:
+
+- Build 1 prints MISS and STORED for `K1`, prints a clean scan, and stamps HEAD.
+- The docs edit leaves HEAD fixed; build 2 prints MISS and STORED for distinct `K2`, clean, with HEAD.
+- Build 3 prints HIT for `K2`, prints a clean scan, and restores an artifact stamped with HEAD.
+- Build 4 with ambient `FOO=bar` prints the same HIT for `K2`, clean, and artifact HEAD.
+## 8. Assumptions verified read-only in this round
+
+```text
+$ git rev-parse HEAD
+fdcd0c445525caf82619fab04f3037e416c2e3b1
+$ git branch --show-current
+claude/build-cache
+$ git status --short --untracked-files=all
+[no output]
+```
+
+```text
+$ rg -n '^## D623.7' .claude/decisions.md
+22534:## D623.7 — M-2 BUILD-CACHE-01: owner rejects both the AST grammar and the checked-in fingerprint; ...
+$ wc -l -c research-build-cache-sol.md research-build-cache-opus.md
+  403 44152 research-build-cache-sol.md
+  494 29996 research-build-cache-opus.md
+  897 74148 total
+```
+
+```text
+$ git ls-files -s -z | tr '\0' '\n' | wc -l
+11504
+$ git status --porcelain=v1 -z --untracked-files=all | wc -c
+0
+```
+
+```text
+$ for cache_env_file in .env .env.local .env.production .env.production.local; do
+>   test -e "$cache_env_file" && echo "$cache_env_file present" && continue
+>   git check-ignore -q -- "$cache_env_file" && echo "$cache_env_file absent-ignored" && continue
+>   echo "$cache_env_file absent-nonignored"
+> done
+.env absent-nonignored
+.env.local absent-nonignored
+.env.production absent-nonignored
+.env.production.local absent-nonignored
+```
+
+```json
+{
+  "rootLockfileVersion": 3,
+  "hiddenLockfileVersion": 3,
+  "eligibleRootPackages": 273,
+  "hiddenPackages": 273,
+  "missing": 0,
+  "extra": 0,
+  "versionMismatches": 0,
+  "classification": "matching",
+  "hiddenSha256": "105f6967c08bcab6df88805b0cea2184f8a46fefb0161d1cf880b20f238cfbc9"
+}
+```
+
+
+```text
+$ git ls-files -s -- package-lock.json
+100644 d603b3d9950111d3df31acc01e31f54c26623eaf 0 package-lock.json
+$ node -p 'JSON.stringify({version:process.version,platform:process.platform,arch:process.arch})'
+{"version":"v24.13.0","platform":"linux","arch":"x64"}
+```
+
+```sh
+/usr/bin/time -f 'wall_seconds=%e' node -e '
+const cp=require("node:child_process"),fs=require("node:fs"),C=require("node:crypto");
+const t=performance.now(),h=C.createHash("sha256");
+const F=x=>{
+  x=Buffer.isBuffer(x)?x:Buffer.from(x);
+  const n=Buffer.alloc(8);
+  n.writeBigUInt64BE(BigInt(x.length));
+  h.update(n);
+  h.update(x);
+};
+const G=a=>cp.execFileSync("git",a,{
+  maxBuffer:64*1024*1024,
+  env:{...process.env,GIT_OPTIONAL_LOCKS:"0"},
+});
+const Z=b=>(b.toString("latin1").match(/[^\0]*\0/g)??[])
+  .map(x=>Buffer.from(x,"latin1"));
+F("dnd-dist-build-cache-v2");
+const head=G(["rev-parse","HEAD"]).toString().trim();
+if(!/^[0-9a-f]{40}$/.test(head))throw Error("invalid-head");
+for(const x of [head,process.version,process.platform,process.arch])F(x);
+const index=G(["ls-files","-s","-z"]),rows=Z(index);
+const lock=rows.find(x=>x.toString("latin1").endsWith("\tpackage-lock.json\0"));
+F(/^\d+ ([0-9a-f]{40}) 0\t/.exec(lock?.toString("latin1")??"")[1]);
+const hiddenBytes=fs.readFileSync("node_modules/.package-lock.json");
+F(C.createHash("sha256").update(hiddenBytes).digest("hex"));
+const root=JSON.parse(fs.readFileSync("package-lock.json"));
+const hidden=JSON.parse(hiddenBytes);
+const allows=(v,c)=>!Array.isArray(v)||
+  (!v.includes("!"+c)&&(v.every(x=>x.startsWith("!"))||v.includes(c)));
+const expected=Object.keys(root.packages).filter(p=>p&&
+  allows(root.packages[p].os,process.platform)&&
+  allows(root.packages[p].cpu,process.arch)).sort();
+const actual=Object.keys(hidden.packages).sort();
+if(root.lockfileVersion!==hidden.lockfileVersion||expected.length!==actual.length||
+  expected.some((p,i)=>p!==actual[i]||
+  root.packages[p].version!==hidden.packages[p].version))throw Error("stale-install");
+const env={NODE_ENV:"production"};
+if(process.env.STATIC_APP_CACHE_DIR!==undefined){
+  env.STATIC_APP_CACHE_DIR=process.env.STATIC_APP_CACHE_DIR;
+}
+for(const [k,v] of Object.entries(env).sort(([a],[b])=>a.localeCompare(b)))F(k+"="+v);
+for(const row of rows)F(row);
+const tags=Z(G(["ls-files","-v","-z"]));
+if(tags.some(x=>/[a-zS]/.test(String.fromCharCode(x[0]))))throw Error("special-index");
+if(rows.some(x=>x.subarray(0,6).toString()==="160000"))throw Error("submodule");
+const status=G(["status","--porcelain=v1","-z","--untracked-files=all",
+  "--ignore-submodules=none"]);
+if(status.length)throw Error("not-clean");
+for(const p of [".env",".env.local",".env.production",".env.production.local"]){
+  F(p);
+  if(!fs.existsSync(p)){F("absent");continue}
+  F("present");
+  F(C.createHash("sha256").update(fs.readFileSync(p)).digest("hex"));
+}
+console.log("index_bytes="+index.length);
+console.log("key="+h.digest("hex"));
+console.log("key_compute_ms="+(performance.now()-t).toFixed(3));
+'
+```
+
+```text
+index_bytes=1657692
+key=f3c2f5e00c493e36e1e46c5ee3369946aa2950b5477f5b9a790b2cd13e566b37
+key_compute_ms=478.797
+wall_seconds=0.50
+```
+
+```sh
+env -i PATH="$PATH" HOME="$HOME" TMPDIR="${TMPDIR-}" LANG="${LANG-}" \
+  LC_ALL="${LC_ALL-}" TZ="${TZ-}" NODE_ENV=production npm run env 2>/dev/null |
+  awk '/^(NODE(|_.*)|npm_config_.*)=/' | sort
+```
+
+```text
+NODE=/home/vagrant/.nvm/versions/node/v24.13.0/bin/node
+NODE_ENV=production
+npm_config_cache=/home/vagrant/.npm
+npm_config_global_prefix=/home/vagrant/.nvm/versions/node/v24.13.0
+npm_config_globalconfig=/home/vagrant/.nvm/versions/node/v24.13.0/etc/npmrc
+npm_config_init_module=/home/vagrant/.npm-init.js
+npm_config_local_prefix=/home/vagrant/PhpstormProjects/dnd-wt-build-cache
+npm_config_node_gyp=/home/vagrant/.nvm/versions/node/v24.13.0/lib/node_modules/npm/node_modules/node-gyp/bin/node-gyp.js
+npm_config_noproxy=
+npm_config_npm_version=11.6.2
+npm_config_prefix=/home/vagrant/.nvm/versions/node/v24.13.0
+npm_config_user_agent=npm/11.6.2 node/v24.13.0 linux x64 workspaces/false
+npm_config_userconfig=/home/vagrant/.npmrc
+```
+
+```text
+$ git ls-files -v -z | tr '\0' '\n' | awk 'substr($0,1,1) ~ /[a-zS]/ {print}' | wc -l
+0
+$ git ls-files -s -z | tr '\0' '\n' | awk '$1 == "160000" {print}' | wc -l
+0
+$ git ls-files -ci --exclude-standard
+orchestration/wave-state
+reports/mutation/mutation.json
+reports/perf/fullsuite-sql/sql-profile.json
+```
+
+```text
+$ grep -rl PhpstormProjects /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/dist | wc -l
+0
+```
+
+```text
+$ npx vitest list --configLoader runner --filesOnly --json | <JSON counter>
+{"shape":"array","fileCount":641,...}
+$ sha256sum src/vtt/intel/contracts.ts
+0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
+```
+
+No build, Vitest run, Playwright run, install, Git write, model call, or port access occurred.
+## 9. Risks and accepted trade-offs
+
+### Coarse invalidation and hit rate
+
+The Opus report classified 244 of 300 commits, or 81.3%, as touching only its narrow non-build set.
+The Sol report used a broader build-capable set and found 221 of 282 nonempty commits, or 78.4%, non-build-only.
+Because HEAD is in the key, neither figure predicts cross-commit hits in this design.
+For this design they mainly warn that dirty edits to tests, plans, docs, or `.claude` cause intentional misses.
+D3 accepts that hit-rate cost in exchange for the owner's automatic “any Git-visible contents change” rule.
+### Tracked-but-ignored files
+
+An empty temporary index plus `git add -A` would silently drop them.
+The raw real-index stream includes them, so this design neither writes nor synthesizes an index.
+Changes to `orchestration/wave-state` and the two tracked report files therefore still invalidate the key.
+### Cross-worktree cache sharing
+
+Worktrees with the same HEAD, platform, runtime, install identity, environment, and content can share a pointer.
+Unique immutable generations plus atomic pointer replacement tolerate simultaneous equivalent builders.
+The owner checkout's current `dist/` contains zero occurrences of its absolute checkout-path prefix.
+`TMPDIR` remains execution-only and selects which `os.tmpdir()` namespace is used, not artifact identity.
+### Owner checkout's stale installation
+
+The owner checkout's hidden lock predates its root lock and lacks `ws`, as supplied in the ruling.
+The comparison will classify that checkout as `stale-install` and run a validated uncached build.
+It will not restore or publish a cache entry from that uncertain dependency installation.
+After the owner runs a fresh `npm ci`, the automatically matching hidden lock makes caching available.
+The failure mode is a slower correct build, never a hit built from the wrong dependency set.
+### Operational bounds
+
+Any Git failure, special index state, submodule, or uncertain install bypasses instead of guessing.
+The pre/post key comparison prevents normal mid-build edits from being published under an old key.
+The already built and validated live `dist/` remains usable when inputs are unstable or a store fails.

tokens used
232,943
Created [2026-09-14-dist-build-cache-git-key-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md).

Final report:

```text
$ wc -l -c .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
591 28909

$ sha256sum .tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md
6098a2130a93e810e0f6f92980fef496567c7fa53152fe54def2cc8a1a44edb8
```

```text
$ git status --short --untracked-files=all
[no output]
```

Required probes:

```text
$ git ls-files -s -z | tr '\0' '\n' | wc -l
11504

$ git status --porcelain=v1 -z --untracked-files=all | wc -c
0
```

```text
.env absent-nonignored
.env.local absent-nonignored
.env.production absent-nonignored
.env.production.local absent-nonignored
```

Hidden-lock comparison:

```text
lockfileVersion: 3 == 3
eligible root packages: 273
hidden-lock packages: 273
missing: 0
extra: 0
version mismatches: 0
classification: matching
hidden SHA-256: 105f6967c08bcab6df88805b0cea2184f8a46fefb0161d1cf880b20f238cfbc9
```

Full-key probe:

```text
index_bytes=1657692
key=f3c2f5e00c493e36e1e46c5ee3369946aa2950b5477f5b9a790b2cd13e566b37
key_compute_ms=478.797
wall_seconds=0.50
```

The scrubbed `npm run env` probe exited 0 and produced `NODE`, forced `NODE_ENV`, and 11 npm-created `npm_config_*` variables. No inherited npm or arbitrary Node variables were required. Exact command and output are included in the plan.

Frozen contract:

```text
$ sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
```

No build, test run, install, Git write, model call, or port access occurred.

PLAN M2 R4 DONE
