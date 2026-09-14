# M-2 plan review r1 (astra 01a09e5c-242c-7a80-88a4-f4099f29aac0), harvested 2026-09-14 01:34

The plan addresses the original 97 omissions and selects the correct HEAD rule, but its closure contract, public-build behavior, and acceptance proof need revision.

Read-only verification reproduced **840 inventory files, 120 unique special-import targets, and 97 omissions: 67 drizzle + 30 docs**. The plan’s SHA-256 matches. No prohibited runs or writes occurred; the tree remains clean.

**PB1-F1 — P1 blocks; blocks: yes — The proposed enumeration contract is not transitively complete.**  
Plan lines **18–38, 66–74, 132–164**.

The AST approach is acceptable as a conservative inventory; it need not enumerate exactly the entry graph that Rollup retains. However:

- Recursive discovery is explicit for config modules, but not for source modules reached outside `src/`. For example, `src/main.ts → import('../extras/widget.ts') → './text.txt?raw'` requires scanning `widget.ts`, not merely hashing it.
- CSS `@import`/`url()` dependencies and HTML-referenced external entry/assets have no traversal or rejection rule. Hashing the referring CSS/HTML does not hash an external target’s later edits.
- Root-relative imports, aliases, glob options/negations, and unsupported literal patterns lack a precise support-or-bypass contract.
- Vite itself loads `.env`, `.env.local`, `.env.production`, `.env.production.local`, and exposed `VITE_*` variables. Checking only custom plugins does not establish environmental completeness.

These are holes in the proposed general contract, **not additional measured output omissions at this HEAD**: current globs and worker URL targets lie under `src/`, public assets and `index.html` are declared, and no root env files were present.

**Minimal change:** specify recursive traversal of discovered executable modules; define supported resolution/glob forms; either discover other resource/env inputs or explicitly bypass caching when unsupported forms occur. Add independent fixtures for these boundaries. Keep the existing explicit plugin-read inputs; a full Vite build during lookup is unnecessary. Also reconcile line 538’s “build failure” with lines 316–318’s intended uncached fallback.

**PB1-F2 — P1 blocks; blocks: yes — The public script split breaks retained checks and changes build-validation behavior.**  
Plan lines **330–338, 388–410**.

Two existing assertions necessarily fail when `scripts.build` becomes only `node tools/dist-build-cache.mjs`:

- [scraper-is-never-in-the-bundle.test.ts:80](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/tools/scraper-is-never-in-the-bundle.test.ts:80)
- [build-boundary.test.ts:109](/home/vagrant/PhpstormProjects/dnd-wt-build-cache/tests/unit/ai-bridge/build-boundary.test.ts:109)

I evaluated both assertions against the proposed script string in memory: both return false. Neither file is allowed to change or included in focused verification.

There is also a behavioral issue beyond those assertions. A public cache hit now skips `tsc` and the dist guard. TypeScript includes `db`, `scripts`, `tests`, and all `tools`; the guard additionally reads `tools/scrape/**` and executes `scripts/verify-bundled-content-digest.ts`. Those inputs are outside the proposed artifact inventory. An unchanged HEAD with a dirty error there can therefore make public `npm run build` succeed where the existing command fails.

**Minimal change:** preserve public build validation under the normalized environment while caching artifact production. If script restructuring requires changing the two tests, explicitly allowlist them and retain meaningful assertions that the guards execute; do not merely remove their expectations. Add focused verification of the affected build-boundary tests and the public hit path. This preserves D589 without taking on M-3.

**PB1-F3 — P1 blocks; blocks: yes — The supervisor proof can report success after a failed build.**  
Plan lines **456–477**.

Both build commands pipe through `tee` without `pipefail`, and the block lacks fail-fast execution. The MISS message precedes the real build. A failing second build can leave the first build’s artifact, whose commit still equals HEAD.

A read-only synthetic probe demonstrated **child exit 17 → pipeline exit 0 → planned MISS regex passes**. Thus different MISS digests plus a matching stamp do not prove successful rebuilding.

**Minimal change:** make this an explicit Bash script with `set -euo pipefail`, preserve the restoration trap, and require successful completion of both build pipelines before assertions. Check the artifact stamp immediately after each successful build. Exercise the first isolated public build with inherited `NODE_ENV=test` to make the same bounded proof cover F88-b. The existing regex captures and commit-comparison expression are otherwise correct.

**PB1-F4 — P1 blocks; blocks: yes — The discovery acceptance baseline is wrong.**  
Plan lines **425–442, 505–506, 585–587**.

The plan hard-codes **599**. A read-only filesystem census at this HEAD finds **640** matching test candidates, corroborating the supervisor’s [recorded correction](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/app-analysis/loop-log.md:48). This was not a Vitest execution.

The command form is correct: `vitest list --configLoader runner --filesOnly --json`, with bare `--json` last. Installed Vitest’s formatter also confirms the expected array of `{file, ...}` objects. However, `file` contains module paths: comparing raw values from different checkout roots can produce false differences.

**Minimal change:** use the verified baseline for this revision—currently 640—and compare normalized repository-relative path sets against a pre-change capture. Account explicitly for separately integrated authorized additions. Update every 599 acceptance reference.

**PB1-F5 — P2 should fix; blocks: no — Several named mutant kills are underspecified.**  
Plan lines **349–367, 536–546**.

The SQL/text byte-edit cases, unchanged HIT, HEAD-only change, and import-removal-plus-orphan control are sound. Remaining gaps:

- `HASH_BYTES_WITHOUT_PATHS` can survive a rename test that also edits the importer: importer bytes alone change the digest. Rename an equal-byte target under an unchanged glob importer.
- `DIRTY_TREE_BIT_IN_KEY` is not reliably exercised by a non-Git temporary root with only an injected HEAD reader. Specify how actual dirty state is supplied or observed.
- A static asset import, external literal dynamic import, glob expansion/options, and unsupported-edge fallback need explicit cases; the current matrix does not name them.
- Determinism needs identical logical fixtures created in different orders and absolute roots, with equal keys.

Keep HEAD fixed during dirty-file controls; committing the outside-closure edit correctly causes a miss under the selected HEAD rule.

**PB1-F6 — P3 note; blocks: no — Build cost remains unmeasured.**  
Plan lines **497, 509–510, 519–532**.

The plan candidly provides no measured distribution-build duration. HEAD-in-key is acceptable for the existing stamp contract; every commit, including docs-only commits, deliberately causes a miss. Add duration capture to the already-authorized two-build proof rather than scheduling extra builds. Neither planned run measures a warm HIT.

| Requested check | Result |
|---|---|
| 1. Complete closure and deterministic enumeration | **Needs revision.** Original omissions reproduced; transitive/resource/env boundaries remain underspecified. PB1-F1/F5. |
| 2. HEAD stamp, dirty tree, docs-only commits | **Sound for stable inputs.** HEAD belongs in the key; dirty relevant bytes change it; unrelated dirty bytes need not. A docs-only commit changes HEAD and cannot reuse an old stamp. No restore-time restamping needed. |
| 3. All cache consumers | **Executable contract preserved.** Serve, snapshot service, deep-link config, and browser spec do not parse keys or cache paths. Public-build validation has a separate regression: PB1-F2. |
| 4. Mutation matrix | **Partially sound.** Core raw-byte and orphan controls are good; several claimed kills need unconfounded fixtures. PB1-F5. |
| 5. Bounded real supervisor proof | **Fails as written.** Correct digest/stamp expressions, insufficient process-success enforcement. PB1-F3. |
| 6. Rebuild cost/cache churn | **Acceptable policy; unmeasured cost.** Capture durations within the two authorized builds. |
| 7. Discovery command/fixture suffixes | **Command and runtime-fixture approach correct; baseline wrong.** Normalize checkout paths. PB1-F4. |
| 8. Scope, decisions, dependencies | **No new dependency, Node pin, library swap, or M-3 implementation.** TypeScript is already installed. Resolve PB1-F2 to preserve existing build protections under D589; production normalization matches D612/D612.1. |

**REJECT PLAN M2**

M2 PLAN REVIEW R1 DONE