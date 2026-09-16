# OFFERS-IMPL-S3-BUILDER B1 review r2 — gpt-6-astra (read-only)

Reviewed 0e82a6f4. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b1-r2.log.

## REJECT B1 — blocking finding: IB2-F1

Reviewed `0e82a6f4df63ab30aa22fb8c6833b0b179163f0f`. Exactly the two authorized files changed; worktree remained clean.

Verified:

- Plan SHA: `fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`
- Frozen contracts SHA: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`
- Builder and lockfile unchanged.

### IB2-F1 — P1: Revised origin checker lets namespace re-exports escape

**Locations:** [architecture checker:678](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs:678), [local export handling:693](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs:693).

Both forms below expose the canonical query port, violating §5:

```ts
export * as queries from '../src/vtt/engine-query-port';
```

```ts
import * as queries from '../src/vtt/engine-query-port';
export { queries };
```

The first misses a `NamespaceExport` branch. The second looks up the export-specifier symbol without resolving its local target.

**Probe:** `node --input-type=module`, loading the unchanged checker functions in memory and passing both sources through `originFixtureAnalyses` → actual `canonicalOriginDiagnostics`. Compared against the pre-fix checker:

| Source | Before fix | After fix | Real module resolved | TypeScript diagnostics |
|---|---:|---:|---|---:|
| Direct namespace re-export | 1 diagnostic | **0** | Yes | 0 |
| Imported namespace subsequently exported | 1 diagnostic | **0** | Yes | 0 |

This is a regression introduced by the fix, not merely repository-wide enforcement remaining staged.

**Minimal change:** handle `ts.isNamespaceExport`; resolve named export specifiers to their local symbols before looking up origins. Add both negative fixtures alongside positive helper imports/re-exports. Keep repository-wide activation at B15.

### Closure and dimension verdicts

| Dimension | Verdict | Independent evidence |
|---|---|---|
| **IB1-F1 requested probes** | **CLOSED; new regression above** | Allowed helper **0**, indirect `load(p)`/`m[k]` **1**, type-of-value **1**; all resolve production declarations and have **0 fixture compiler diagnostics**. |
| **Specified CJS variants** | **PASS** | Import-equals member access and separate `export = m`: **2 diagnostics**. Direct/aliased `module.exports`: **2**. Whole-module `exports.queries`: **1**. `.cts`/`.mts` use NodeNext. |
| **IB1-F2** | **CLOSED** | All three requested mutations rejected through actual `runProductionCheck()` with CompilerHost overlays; details below. |
| **IB1-F3** | **CLOSED** | Exact `c61ffd2c…` mutant: **2 failed / 13 passed** across three suites; pristine **15 passed**. |
| **Staging and active production checks** | **PASS** | Canonical-origin enforcement remains self-test-only. Production builder/export/assertion checks execute and reject mutations. Pristine scan passes **1,621 files** with the intended five transitional exports. |
| **False positives/performance** | **PASS for tested controls** | Allowed named/namespace helper use and helper re-export: **0 diagnostics**. Unrelated `node:fs` through `require` and aliased `createRequire`: **0**. Ten origin probes across three compiler groups completed in **1,909 ms**. |
| **Scope and retained evidence** | **PASS** | Two-file fix; digest/legacy-ID pins and existing assertions retained. Discovery **643**, fixture paths **0**. |

### Export mutation replay

All changes stayed in memory.

| Mutation | Applied SHA | Production-check result |
|---|---|---|
| Original member-export mutant | `19ab2e177cf3daa484a46d45349eff5722bf145be4f41680a0be6765f8bad4ad` | **Exit 1**: exact runtime inventory and exported-member checks both reject it. |
| `import * as builders …; export { builders }` appended to environment suite | `a944166d526d088eac774d9beae081153699b8132b55850289d2405142303bc6` | **Exit 1**: `builders: exported runtime environment constructor is forbidden`. |
| Additional exported runtime function | `0082bbf0816c95f5b23c79a46bed18a02d3c183914558f338a388fa6366a526a` | **Exit 1**: `runtime exports must be exactly buildOfferEnvironment`. |

### Binding-shape regression tests

The three new names are:

1. `rejects a binding mode override with the exact shape error`
2. `rejects queries alongside a binding with the exact shape error`
3. `rejects query injection into revision configuration input`

Applied the exact mutant:

```text
c61ffd2c3ab77d0140f913dd99483de38e4700572a446442fb0348a1a307150d
```

The first two tests failed with `expected function to throw an error, but it didn't`. Results were **2 failed / 9 passed** in the environment suite, **2 failed / 13 passed** overall.

The replay used the actual three suite sources, in-memory TypeScript transpilation, and installed Chai/Vitest matchers. Native Vitest was not retried after the sandbox limitation established in R1.

### Commands and results

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
git diff --check HEAD^ HEAD
git status --short
```

Both compilers: **exit 0, zero diagnostics**. Scan: **0 findings**. sg fixtures: **1 passed**. Architecture self-test: **36 passed**, probe line **0/1/1**. Production scan: **1,621 files**. Discovery: **643 rows / 643 unique / 0 fixture paths**. Diff check: **exit 0**. Status: **clean**.

**REJECT B1 — blocking list: IB2-F1.** The three original findings are resolved; the namespace-origin regression requires correction.

S3 B1 REVIEW R2 DONE