# OFFERS-IMPL-S3-BUILDER B1 review r1 — gpt-6-astra (read-only)

Reviewed f5b91982. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b1-r1.log.

## REJECT B1

**Blocking findings: IB1-F1 and IB1-F2.** The builder and migrated suites behave correctly; the architecture enforcement does not yet prove the required guarantees.

Reviewed `f5b91982d59c5718131f962846224bccfc9d2c79`. Worktree remained clean. Verified exact hashes:

- Plan: `fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`
- Frozen contracts: `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

### Findings

#### IB1-F1 — P1: Origin fixtures do not perform the promised production-symbol verification

**Locations:** [architecture checker:489](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs:489), [fixtures:694](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs:694).

All nine named CJS/ESM fixtures execute, but only through `ts.createSourceFile` and syntactic inspection. They never resolve against the real production module or use compatible ESM/CommonJS compiler configurations as §5 requires.

Several specified cases are also substituted or absent:

- `canonical-import-equals.cts` lacks its separate `export = m` case.
- `canonical-commonjs-reexport.cts` tests `export = queryPort`, rather than both required `module.exports` forms.
- The named CommonJS re-export fixture exports the canonical member rather than the specified whole module.

**Read-only probe:** invoked the actual `canonicalOriginDiagnostics` through `node --input-type=module`, supplying these sources:

```ts
// Allowed helper: incorrectly rejected.
import { compareTacticalAllocations } from '../src/vtt/engine-query-port';

// Indirect canonical access: incorrectly accepted.
const p = '../src/vtt/engine-query-port';
const load = require;
const m = load(p);
const k = 'canonicalEngineQueryPort';
void m[k];

// Required type-of-value negative: incorrectly accepted.
type Q = typeof import('../src/vtt/engine-query-port').canonicalEngineQueryPort;
```

**Output:** respectively **1 diagnostic, 0 diagnostics, 0 diagnostics**. The first diagnostic was `canonical query-port import is forbidden here`.

**Minimal change:** resolve the virtual fixtures against production declarations, include every specified variant, implement origin tracking, and add a positive ordinary-helper import. Keep repository-wide canonical enforcement staged until B15.

#### IB1-F2 — P1: A namespace or object can export another route to the builder undetected

**Locations:** [export checking:378](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs:378), [export fixtures:654](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/scripts/check-offer-environment-architecture.mjs:654).

The checker examines only an exported value’s own call/construct signatures. It misses builder functions exposed through exported members.

**Production-source mutant:** appended, in a CompilerHost overlay:

```ts
export const secondOfferEnvironmentBuilder = { build: buildOfferEnvironment };
```

Applied SHA:

```text
19ab2e177cf3daa484a46d45349eff5722bf145be4f41680a0be6765f8bad4ad
```

**Probe:** called the unchanged `runProductionCheck()` against that production-source overlay.

**Output:**

```text
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

**Exit 0: mutant survived.**

This real-symbol fixture likewise compiled with **0 TypeScript diagnostics and 0 architecture diagnostics**:

```ts
import * as builders from '../src/vtt/offers/build-offer-environment';
export { builders };
```

An additional exported ordinary runtime function also escaped the “exactly one exported runtime function” check.

**Minimal change:** follow namespace aliases and exported members to the builder; add these negative fixtures and explicitly verify the builder module’s runtime export inventory. Preserve the five transitional allowances.

#### IB1-F3 — P2: Binding-mode override rejection lacks a regression test

**Locations:** [builder:58](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offers/build-offer-environment.ts:58), [suite:115](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/offer-environment.test.ts:115).

The production check is correct, but removing it leaves every environment test green.

**Mutation:**

```ts
if (!hasExactKeys(input, ['kind', 'binding'])) {
```

changed to:

```ts
if (false) {
```

Applied SHA:

```text
c61ffd2c3ab77d0140f913dd99483de38e4700572a446442fb0348a1a307150d
```

**Probe/output:** in-memory replay of all three unchanged suites: **12 passed, 0 failed**.

The pristine builder independently rejected both binding `mode` overrides and binding `queries` extras with:

```text
TypeError: Offer environment binding input has an invalid shape.
```

**Minimal change:** add exact-error tests for both extras, plus query injection into revision configuration.

### Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| **1. Builder contract §3** | **PASS implementation; enforcement gaps above** | Exactly one runtime export; private class with real `#brand`; canonical port imported internally; three construction expressions, all inside the builder; instance, binding and canonical port frozen. Missing input/binding and codec error messages verified. |
| **2. Transitional wiring** | **PASS** | Four runtime factory exports remain and delegate to the builder. Launcher wrapper and structural type remain for subsequent migrations. Search found no external `new RuntimeOfferEnvironment` or production environment casts/literals. Both compilers pass. |
| **3. Suites** | **PASS** | Five digest pins and five legacy IDs byte-identical to `HEAD^`. Original assertion counts **27/6/5**, now **34/6/5**; no original assertion removed or weakened. In-memory replay: **12/12**. |
| **4. Enforcement** | **FAIL — IB1-F1/F2** | Staged sg rule and gate wiring match §5. Allowlist names exactly five transitional exports plus builder. All nine origin fixture names execute, but their verification is deficient. Groups **11/6/14** and four format fixtures exist and remain staged. |
| **5. Mutants** | **FAIL — additional builder-export mutant survives** | Required direct-wrapper, malformed-binding, forged-brand and query-injection behaviors were killed. Namespace/object export survives; binding-shape test gap is nonblocking. Details below. |
| **6. Scope/B2 preparation** | **PASS** | Exactly ten authorized files. No premature B15 deletion. Lockfile and M-1 runner/reducer files unchanged. No additional B2 preparation omission found. |

**Brand qualification:** object literal, spread and external implementing class fail TypeScript checks. A direct `as EngineOptionEnvironment` assertion compiles in TypeScript but is rejected by the architecture assertion check. The fixtures import the **real production builder/type**. Removing the real private field makes all four controls fail their self-test, satisfying PS3B-F2 for those controls.

### Mutation replay

All mutations stayed in memory.

| Mutant | Applied SHA / correspondence | Result |
|---|---|---|
| `SECOND_ENV_BUILDER` | Equivalent direct exported wrapper: `71a2e7a9a0dc3a08a8f50e5767108af46c448be281b7f2593fa7db845287cb15` | Rejected: `exported runtime environment constructor is forbidden`. |
| `MALFORMED_BINDING` | **Exact reported SHA** `7f9133db4e3c6d173f6a91f0a47c39b33bc2611543c6804c60a2b8dc6d53dfbd` | **2 failed, 10 passed** across all three suites. |
| `FORGED_BRAND` | **Exact reported SHA** `ed94603852b68c11849b4651fa7e0e4a783aced1d4a388b4c18c2ec6b56301f6` | All four markers reported `unexpectedly compiled`; pristine brand self-test had **0 failures**. |
| `QUERY_INJECTION` | Equivalent removal of legacy configuration shape rejection: `c6439dc62c784cdc1ebe8a7bd5e4a4fa02a6ce6c69cdae457ebadc7aa8bb0a93` | **1 failed, 11 passed**. |
| Additional exported builder member | `19ab2e17…` | **Survived**, IB1-F2. |
| Binding-mode override acceptance | `c61ffd2c…` | **Survived**, IB1-F3. |

The report does not provide the edit text needed to reproduce its `3b45567f…` and `c12f43e7…` hashes; those two replays above are explicitly equivalent mutations.

### Commands and results

Executed directly:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
sg test --config sgconfig.yml --test-dir ast-grep-tests --skip-snapshot-tests --include-off
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
git diff --check HEAD^ HEAD
```

Results: both tsc **exit 0, zero diagnostics**; scan **0 findings**; sg fixtures **1 passed**; architecture self-test **28 active fixtures passed**; production scan **1,621 files**; discovery **643 rows / 643 unique paths / 0 fixture paths**; diff check **exit 0**. **Zero lines over 120** outside `package.json`.

```text
npx vitest run --configLoader runner tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

Native Vitest exited **1 before running tests**, unable to create its temporary SSR directory. The fallback used `node --input-type=module` with in-memory TypeScript transpilation, the actual suite sources and installed Chai/Vitest matchers: **12 passed, 0 failed**.

The `test:gate` prefix exactly matches §5. M-1 evidence collection, classification and retry implementation are unchanged; architecture failure now prevents the runner from starting, as planned.

**REJECT B1 — blocking list: IB1-F1, IB1-F2.**

S3 B1 REVIEW DONE