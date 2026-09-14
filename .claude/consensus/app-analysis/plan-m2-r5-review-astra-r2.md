# M-2 plan r5 review r2 (astra resume 01a0a102…) on plan sha c572d65e…, harvested 2026-09-14 14:50

**REJECT PLAN M2 R5.** Most r1 corrections are incorporated, but three blocking issues remain.

Verified with `wc -l -c`, `sha256sum`, `git rev-parse HEAD`, and `git status --short --untracked-files=all`:

- Plan: **649 lines, 35,288 bytes**, SHA-256 `c572d65e4d02e34f874322b08c466e858f74886e191e63a846dd1ff9bf52cfe9`.
- HEAD: `fdcd0c445525caf82619fab04f3037e416c2e3b1`.
- Frozen contract hash unchanged.
- Working tree clean. No writes, builds, test runs, agents, or port access.

**PR5-F1 — P1 — Raw batch input can hash the wrong file.**  
[Plan:133–135](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:133)

LF rejection does not fully account for `--stdin-paths` parsing.

Exact probes:

```sh
printf '"package.json"\n' | git hash-object --no-filters --stdin-paths
printf 'package.json\r\n' | git hash-object --no-filters --stdin-paths
git hash-object --no-filters -- package.json
```

All three returned:

```text
151844f8b27eb5fa917d1065b1afa7197f9234ce
```

Neither the literal filename `"package.json"` nor `package.json` followed by CR exists. Git interpreted the former as a quoted path and stripped the latter’s CR.

If such a literal file exists, `lstat` checks that file, but the batch hashes ordinary `package.json`. Editing the literal file can therefore leave the key unchanged. Hash-count and syntax checks do not detect this.

**Minimal change:** encode paths using Git-compatible quoted syntax, or additionally BYPASS leading-quote and trailing-CR paths. Add controls where the literal file and Git’s interpreted alternative both exist with different contents.

**PR5-F2 — P1 — The outer production guard retains the host locale.**  
[Plan:187–188](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:187), [Plan:299](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:299)

The module forces the locale for its children, but the public script subsequently executes:

```text
node tools/assert-dist-clean.mjs
```

under the original npm environment.

Probe:

```sh
rg -n 'localeCompare|appShellFiles' tools/assert-dist-clean.mjs
```

The guard sorts shell filenames with default-locale `localeCompare()` at **:357**, then recomputes the service-worker hash at **:359–377**.

Replaying the plan’s actual `appShellVersion()` control produced:

| Environment | Hash |
|---|---|
| en_US.UTF-8 | `1ed55b4e6ef4a643` |
| da_DK.UTF-8 | `456c40d44eed648a` |
| C.UTF-8 | `1ed55b4e6ef4a643` |

Thus a valid fixed-locale build can fail its final public guard on a different host locale. This affects both MISS and HIT paths; it is not fixed by scrubbing the three inner steps.

**Minimal change:** run the outer guard under the same forced locale. Update the script-equivalence assertion and add a public-build locale control, not only a direct-child control.

**PR5-F3 — P1 — The normalization gate misses effective Git attributes.**  
[Plan:139–141](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:139)

Checking only tracked `.gitattributes` and `core.autocrlf` does not establish the stated normalization boundary.

Probe:

```sh
GIT_PAGER=cat MANPAGER=cat git help attributes | col -b
```

Installed Git documentation identifies these additional sources:

- Worktree `.gitattributes`, without requiring it to be tracked.
- `$GIT_DIR/info/attributes`.
- `core.attributesFile`.
- Default `$HOME/.config/git/attributes`.
- System attributes.

Read-only demonstration:

```sh
printf '*.txt text\n' |
  git -c core.attributesFile=/dev/stdin \
    check-attr text -- docs/srd/source/feats.txt
```

Output:

```text
docs/srd/source/feats.txt: text: set
```

Both planned normalization checks can pass while this attribute is active. An untracked `.gitattributes` can likewise remain constant in the overlay while LF/CRLF changes to a tracked raw input normalize to an unchanged clean index identity.

**Minimal change:** inspect effective normalization attributes for tracked inputs, covering `text`, `eol`, `filter`, `ident`, and `working-tree-encoding`, and BYPASS unsupported settings. This needs Git attribute evaluation, not a custom parser.

Current-checkout control:

```sh
git ls-files -z |
  git check-attr -z --stdin text eol filter ident working-tree-encoding
```

Parsing the triples yielded **57,520 checks, zero active attributes**. The broader check would not disable this checkout’s cache.

**PR5-F4 — P2 — The revised four-build proof weakens two assertions.**  
[Plan:374–380](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:374)

This command requires a clean message in only **one** log:

```sh
grep -q 'dist clean: [0-9][0-9]* files scanned' "$proof_tmp"/build-*.log
```

Exact read-only control:

```bash
grep -q 'dist clean: [0-9][0-9]* files scanned' \
  <(printf 'dist clean: 123 files scanned\n') \
  <(printf '') <(printf '') <(printf '')
echo "$?"
```

Output: **0**.

Also, the revised proof checks that STORED contains *a* 64-hex key but no longer compares it with that build’s MISS key. Both assertions existed in r4.

**Minimal change:** check each log independently and compare each STORED key with its corresponding MISS key.

The other proof corrections are sound:

- The selected Markdown is imported at `src/ui/screens/player-guide/screen.ts:1`.
- The marker check examines emitted bytes.
- `pipefail` propagates build failures through `tee`.
- The EXIT trap restores the source.
- Unique `TMPDIR` isolates the proof cache.
- Build 4 correctly supplies ambient `FOO=bar`.

**PR5-F5 — P2 — The “full clean-key” probe omits verdict work and contains a latent sorting error.**  
[Plan:455–490](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:455)

The timing probe does not execute the hidden-lock comparison, special-index check, normalization checks, or symlink verdict. Its timing establishes clean-key framing cost, not complete key-and-verdict cost.

Additionally, `split()` returns strings, but :474 calls `.sort(Buffer.compare)`.

Probe:

```js
['public/b.tsbuildinfo', 'public/a.tsbuildinfo'].sort(Buffer.compare)
```

Output:

```text
ERR_INVALID_ARG_TYPE:
The "buf1" argument must be an instance of Buffer or Uint8Array.
```

Zero ignored-public records conceal this error.

**Minimal change:** preserve Buffer paths consistently and time the complete verdict computation. Include at least two ignored-public records in the eventual fixture coverage.

**PR5-F6 — P2 — The locale mutant’s named killing test is underspecified.**  
[Plan:239](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:239), :282

`PASS_PARENT_LOCALE` says removing either forced locale assignment makes `FIXED_LOCALE_OUTPUT` fail. Removing only forced `LANG` can leave output unchanged because forced `LC_ALL` still controls the locale.

The exact environment-helper assertions elsewhere can kill that mutation, but the named output test alone need not.

**Minimal change:** have the fixture assert both child environment values, or name the environment-helper test as the killing control.

The requested probe results reproduce as follows:

| Probe | This review |
|---|---:|
| Index records | 11,504 |
| Index bytes | 1,657,692 |
| Status bytes | 0 |
| Ignored-public bytes/records | 0 / 0 |
| Indexed symlinks / submodules | 0 / 0 |
| Eligible / hidden packages | 273 / 273 |
| Platform-filtered packages | 103 |
| Missing / extra packages | 0 / 0 |
| Version / resolved / integrity mismatches | 0 / 0 / 0 |
| Clean-key probe | **69.460 ms** |

The reproduced key is:

```text
a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
```

I executed the plan’s clean-key heredoc with the same sandbox adaptation as r1: Git subprocess `stdio: ['ignore','pipe','inherit']`.

For batching, I used the plan’s first **85** tracked `art/requests` paths, totaling **259,981 bytes**:

```bash
mapfile -d '' review_hash_paths < <(git ls-files -z -- art/requests)
review_hash_paths=("${review_hash_paths[@]:0:85}")

time for p in "${review_hash_paths[@]}"; do
  git hash-object --no-filters -- "$p" > /dev/null
done
time printf '%s\n' "${review_hash_paths[@]}" |
  git hash-object --no-filters --stdin-paths > /dev/null
```

Three repetitions measured **115/103/103 ms sequentially**, versus **2/2/2 ms batched**. Both hash streams had SHA-256:

```text
2de5e52dfd867349a33260010beabce7b541121fea8b483c9f60f61778e94f08
```

The remaining contract and feasibility assessment:

| Area | Assessment |
|---|---|
| Direct spawning | The three binaries exist. `process.execPath` avoids npm configuration and PATH-based Node selection. |
| Human scripts | `build:dist:validated` is retained, and :209 explicitly requires descriptor/script equivalence tests. Good. |
| Fixture seam | Feasible with tiny files at the fixture’s `node_modules/typescript/bin/tsc`, `node_modules/vite/bin/vite.js`, and guard paths. A `package.json` stand-in alone is insufficient. The public-npm injection test additionally exercises the outer script. No real compiler/build is needed. |
| HOME | Node’s CommonJS loader retains HOME-based fallback module paths. With the stipulated complete, immutable local dependency installation, no current build dependency on those fallbacks was found. This is not arbitrary filesystem isolation. |
| NODE variables | `NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`, `NODE_REPL_*`, and compile-cache overrides are excluded by the allowlist. These invocations do not enter a REPL. |
| Vite config cache | The runner creates a fresh environment with `configFile:false`, `envDir:false`, and closes it after loading. Its server-consumer optimizer is disabled by default. No persistent config-output cache dependency was found. |
| Vite optimizer cache | Production resolution does not use the development dependency optimizer. `STATIC_APP_CACHE_DIR` remains conservatively hashed. |
| Node compile cache | Both tool entrypoints enable Node’s compile cache. This is compiled-code reuse, not a stored Vite configuration result or dist generation. No stale-output route was established from normal cache operation. |
| cwd / external configuration | Vite’s workspace-root probe returned this worktree. Current PostCSS search stops there. Root package/tsconfigs are tracked; PostCSS/Browserslist files remain absent. Git’s external attributes remain the demonstrated exception in PR5-F3. |
| Other output influences | No new current TZ, time, randomness, network, or HOME-derived production-output use was found. Future arbitrary external config/plugin reads remain outside the stated input contract. |
| Normal-use bypasses | Fresh install matches; normalization/symlink checks are presently clear. LF-path bypass is explicitly accepted. Unignored scratch-tree traversal still has no fixed time bound. |
| Size | The 245-line cap is honestly stated: 22 lines, **8.2%**, below HEAD. The 150+95 allocation remains an implementation target, not demonstrated code size. No additional module is justified. |

Disposition of r1 findings: **F1, F4, F5, F6, F9, F10 are incorporated; F3’s batching needs PR5-F1; F2’s fixed locale needs PR5-F2; F8’s normalization check needs PR5-F3. F7’s direct-spawn approach is sound within the stated trusted-process/dependency contract.**

| Dimension | Verdict |
|---|---|
| Soundness | **FAIL** — batch path interpretation and incomplete normalization |
| Dirty overlay / performance | **PARTIAL** — batching verified; encoding needs correction |
| Environment contract | **FAIL** — outer guard locale differs |
| Test matrix / feasibility | **FEASIBLE WITH CORRECTIONS** |
| Size and simplicity | **CONDITIONAL PASS** — enforce the stated implementation budget |
| Four-build proof | **PARTIAL** — correct raw input; restore weakened assertions |
| Supervisor reconciliation | **MOSTLY CONFORMS** — remaining locally proved corrections above |

**REJECT PLAN M2 R5 — blocking: PR5-F1, PR5-F2, PR5-F3.**

M2 PLAN R5 REVIEW DONE
tokens used
175,961
**REJECT PLAN M2 R5.** Most r1 corrections are incorporated, but three blocking issues remain.

Verified with `wc -l -c`, `sha256sum`, `git rev-parse HEAD`, and `git status --short --untracked-files=all`:

- Plan: **649 lines, 35,288 bytes**, SHA-256 `c572d65e4d02e34f874322b08c466e858f74886e191e63a846dd1ff9bf52cfe9`.
- HEAD: `fdcd0c445525caf82619fab04f3037e416c2e3b1`.
- Frozen contract hash unchanged.
- Working tree clean. No writes, builds, test runs, agents, or port access.

**PR5-F1 — P1 — Raw batch input can hash the wrong file.**  
[Plan:133–135](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:133)

LF rejection does not fully account for `--stdin-paths` parsing.

Exact probes:

```sh
printf '"package.json"\n' | git hash-object --no-filters --stdin-paths
printf 'package.json\r\n' | git hash-object --no-filters --stdin-paths
git hash-object --no-filters -- package.json
```

All three returned:

```text
151844f8b27eb5fa917d1065b1afa7197f9234ce
```

Neither the literal filename `"package.json"` nor `package.json` followed by CR exists. Git interpreted the former as a quoted path and stripped the latter’s CR.

If such a literal file exists, `lstat` checks that file, but the batch hashes ordinary `package.json`. Editing the literal file can therefore leave the key unchanged. Hash-count and syntax checks do not detect this.

**Minimal change:** encode paths using Git-compatible quoted syntax, or additionally BYPASS leading-quote and trailing-CR paths. Add controls where the literal file and Git’s interpreted alternative both exist with different contents.

**PR5-F2 — P1 — The outer production guard retains the host locale.**  
[Plan:187–188](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:187), [Plan:299](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:299)

The module forces the locale for its children, but the public script subsequently executes:

```text
node tools/assert-dist-clean.mjs
```

under the original npm environment.

Probe:

```sh
rg -n 'localeCompare|appShellFiles' tools/assert-dist-clean.mjs
```

The guard sorts shell filenames with default-locale `localeCompare()` at **:357**, then recomputes the service-worker hash at **:359–377**.

Replaying the plan’s actual `appShellVersion()` control produced:

| Environment | Hash |
|---|---|
| en_US.UTF-8 | `1ed55b4e6ef4a643` |
| da_DK.UTF-8 | `456c40d44eed648a` |
| C.UTF-8 | `1ed55b4e6ef4a643` |

Thus a valid fixed-locale build can fail its final public guard on a different host locale. This affects both MISS and HIT paths; it is not fixed by scrubbing the three inner steps.

**Minimal change:** run the outer guard under the same forced locale. Update the script-equivalence assertion and add a public-build locale control, not only a direct-child control.

**PR5-F3 — P1 — The normalization gate misses effective Git attributes.**  
[Plan:139–141](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:139)

Checking only tracked `.gitattributes` and `core.autocrlf` does not establish the stated normalization boundary.

Probe:

```sh
GIT_PAGER=cat MANPAGER=cat git help attributes | col -b
```

Installed Git documentation identifies these additional sources:

- Worktree `.gitattributes`, without requiring it to be tracked.
- `$GIT_DIR/info/attributes`.
- `core.attributesFile`.
- Default `$HOME/.config/git/attributes`.
- System attributes.

Read-only demonstration:

```sh
printf '*.txt text\n' |
  git -c core.attributesFile=/dev/stdin \
    check-attr text -- docs/srd/source/feats.txt
```

Output:

```text
docs/srd/source/feats.txt: text: set
```

Both planned normalization checks can pass while this attribute is active. An untracked `.gitattributes` can likewise remain constant in the overlay while LF/CRLF changes to a tracked raw input normalize to an unchanged clean index identity.

**Minimal change:** inspect effective normalization attributes for tracked inputs, covering `text`, `eol`, `filter`, `ident`, and `working-tree-encoding`, and BYPASS unsupported settings. This needs Git attribute evaluation, not a custom parser.

Current-checkout control:

```sh
git ls-files -z |
  git check-attr -z --stdin text eol filter ident working-tree-encoding
```

Parsing the triples yielded **57,520 checks, zero active attributes**. The broader check would not disable this checkout’s cache.

**PR5-F4 — P2 — The revised four-build proof weakens two assertions.**  
[Plan:374–380](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:374)

This command requires a clean message in only **one** log:

```sh
grep -q 'dist clean: [0-9][0-9]* files scanned' "$proof_tmp"/build-*.log
```

Exact read-only control:

```bash
grep -q 'dist clean: [0-9][0-9]* files scanned' \
  <(printf 'dist clean: 123 files scanned\n') \
  <(printf '') <(printf '') <(printf '')
echo "$?"
```

Output: **0**.

Also, the revised proof checks that STORED contains *a* 64-hex key but no longer compares it with that build’s MISS key. Both assertions existed in r4.

**Minimal change:** check each log independently and compare each STORED key with its corresponding MISS key.

The other proof corrections are sound:

- The selected Markdown is imported at `src/ui/screens/player-guide/screen.ts:1`.
- The marker check examines emitted bytes.
- `pipefail` propagates build failures through `tee`.
- The EXIT trap restores the source.
- Unique `TMPDIR` isolates the proof cache.
- Build 4 correctly supplies ambient `FOO=bar`.

**PR5-F5 — P2 — The “full clean-key” probe omits verdict work and contains a latent sorting error.**  
[Plan:455–490](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:455)

The timing probe does not execute the hidden-lock comparison, special-index check, normalization checks, or symlink verdict. Its timing establishes clean-key framing cost, not complete key-and-verdict cost.

Additionally, `split()` returns strings, but :474 calls `.sort(Buffer.compare)`.

Probe:

```js
['public/b.tsbuildinfo', 'public/a.tsbuildinfo'].sort(Buffer.compare)
```

Output:

```text
ERR_INVALID_ARG_TYPE:
The "buf1" argument must be an instance of Buffer or Uint8Array.
```

Zero ignored-public records conceal this error.

**Minimal change:** preserve Buffer paths consistently and time the complete verdict computation. Include at least two ignored-public records in the eventual fixture coverage.

**PR5-F6 — P2 — The locale mutant’s named killing test is underspecified.**  
[Plan:239](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/.tmp-plans/2026-09-14-dist-build-cache-git-key-plan.md:239), :282

`PASS_PARENT_LOCALE` says removing either forced locale assignment makes `FIXED_LOCALE_OUTPUT` fail. Removing only forced `LANG` can leave output unchanged because forced `LC_ALL` still controls the locale.

The exact environment-helper assertions elsewhere can kill that mutation, but the named output test alone need not.

**Minimal change:** have the fixture assert both child environment values, or name the environment-helper test as the killing control.

The requested probe results reproduce as follows:

| Probe | This review |
|---|---:|
| Index records | 11,504 |
| Index bytes | 1,657,692 |
| Status bytes | 0 |
| Ignored-public bytes/records | 0 / 0 |
| Indexed symlinks / submodules | 0 / 0 |
| Eligible / hidden packages | 273 / 273 |
| Platform-filtered packages | 103 |
| Missing / extra packages | 0 / 0 |
| Version / resolved / integrity mismatches | 0 / 0 / 0 |
| Clean-key probe | **69.460 ms** |

The reproduced key is:

```text
a4230c52a442be2e30d5d2bdd8cfec2ef28e63e73d43cafd81bf644599e5c22e
```

I executed the plan’s clean-key heredoc with the same sandbox adaptation as r1: Git subprocess `stdio: ['ignore','pipe','inherit']`.

For batching, I used the plan’s first **85** tracked `art/requests` paths, totaling **259,981 bytes**:

```bash
mapfile -d '' review_hash_paths < <(git ls-files -z -- art/requests)
review_hash_paths=("${review_hash_paths[@]:0:85}")

time for p in "${review_hash_paths[@]}"; do
  git hash-object --no-filters -- "$p" > /dev/null
done
time printf '%s\n' "${review_hash_paths[@]}" |
  git hash-object --no-filters --stdin-paths > /dev/null
```

Three repetitions measured **115/103/103 ms sequentially**, versus **2/2/2 ms batched**. Both hash streams had SHA-256:

```text
2de5e52dfd867349a33260010beabce7b541121fea8b483c9f60f61778e94f08
```

The remaining contract and feasibility assessment:

| Area | Assessment |
|---|---|
| Direct spawning | The three binaries exist. `process.execPath` avoids npm configuration and PATH-based Node selection. |
| Human scripts | `build:dist:validated` is retained, and :209 explicitly requires descriptor/script equivalence tests. Good. |
| Fixture seam | Feasible with tiny files at the fixture’s `node_modules/typescript/bin/tsc`, `node_modules/vite/bin/vite.js`, and guard paths. A `package.json` stand-in alone is insufficient. The public-npm injection test additionally exercises the outer script. No real compiler/build is needed. |
| HOME | Node’s CommonJS loader retains HOME-based fallback module paths. With the stipulated complete, immutable local dependency installation, no current build dependency on those fallbacks was found. This is not arbitrary filesystem isolation. |
| NODE variables | `NODE_OPTIONS`, `NODE_PATH`, `NODE_EXTRA_CA_CERTS`, `NODE_REPL_*`, and compile-cache overrides are excluded by the allowlist. These invocations do not enter a REPL. |
| Vite config cache | The runner creates a fresh environment with `configFile:false`, `envDir:false`, and closes it after loading. Its server-consumer optimizer is disabled by default. No persistent config-output cache dependency was found. |
| Vite optimizer cache | Production resolution does not use the development dependency optimizer. `STATIC_APP_CACHE_DIR` remains conservatively hashed. |
| Node compile cache | Both tool entrypoints enable Node’s compile cache. This is compiled-code reuse, not a stored Vite configuration result or dist generation. No stale-output route was established from normal cache operation. |
| cwd / external configuration | Vite’s workspace-root probe returned this worktree. Current PostCSS search stops there. Root package/tsconfigs are tracked; PostCSS/Browserslist files remain absent. Git’s external attributes remain the demonstrated exception in PR5-F3. |
| Other output influences | No new current TZ, time, randomness, network, or HOME-derived production-output use was found. Future arbitrary external config/plugin reads remain outside the stated input contract. |
| Normal-use bypasses | Fresh install matches; normalization/symlink checks are presently clear. LF-path bypass is explicitly accepted. Unignored scratch-tree traversal still has no fixed time bound. |
| Size | The 245-line cap is honestly stated: 22 lines, **8.2%**, below HEAD. The 150+95 allocation remains an implementation target, not demonstrated code size. No additional module is justified. |

Disposition of r1 findings: **F1, F4, F5, F6, F9, F10 are incorporated; F3’s batching needs PR5-F1; F2’s fixed locale needs PR5-F2; F8’s normalization check needs PR5-F3. F7’s direct-spawn approach is sound within the stated trusted-process/dependency contract.**

| Dimension | Verdict |
|---|---|
| Soundness | **FAIL** — batch path interpretation and incomplete normalization |
| Dirty overlay / performance | **PARTIAL** — batching verified; encoding needs correction |
| Environment contract | **FAIL** — outer guard locale differs |
| Test matrix / feasibility | **FEASIBLE WITH CORRECTIONS** |
| Size and simplicity | **CONDITIONAL PASS** — enforce the stated implementation budget |
| Four-build proof | **PARTIAL** — correct raw input; restore weakened assertions |
| Supervisor reconciliation | **MOSTLY CONFORMS** — remaining locally proved corrections above |

**REJECT PLAN M2 R5 — blocking: PR5-F1, PR5-F2, PR5-F3.**

M2 PLAN R5 REVIEW DONE
