# OFFERS-IMPL-S3-BUILDER amendment review r2 — gpt-5.6-sol (read-only)

Reviewed plan sha 574ae301… (996 lines) on 0e2eb984. Session 01a0a178-b7b9-76d0-b304-99841096ee48. Log .tmp/runs/fanout/review-plan-s3-amend-r2.log.

## Outcome

**REJECT PLAN S3 BUILDER AMENDMENT**

Blocking finding: **PS3B-A1 (P2)**. The amendment is otherwise complete and its reported inventories reproduce exactly.

## Findings

### PS3B-A1 — P2 — CommonJS loading is missing from the canonical-port enforcement contract

Evidence: [plan lines 658–676](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:658)

The planned fixtures cover named and aliased ESM imports, namespace access, direct calls, re-exports, dynamic imports, star exports, and computed members. They do not explicitly cover:

- `require()` or `createRequire()`
- TypeScript `import = require(...)`
- CommonJS whole-module re-export
- Computed canonical access originating from a required module

The ast-grep rule catches straightforward forms such as `require(...).canonicalEngineQueryPort` because the property name appears as a `property_identifier`. It does not catch:

```ts
const load = createRequire(import.meta.url);
const module = load('./engine-query-port');
const key = 'canonicalEngineQueryPort';
const port = module[key];
```

Nor does it catch a whole-module CommonJS re-export containing no canonical identifier. The symbol-checker requirements mention import aliases and module exports, but never require it to recognize CommonJS module origins. Node types are active in `tsconfig.node.json`, so these forms are syntactically available.

This matters because the behavior witnesses cover three named consumers; the source gate is what is supposed to close the rest of the repository against canonical bypasses.

Minimal change: amend the existing enforcement lines without expanding the plan past 1,000 lines:

- Require symbol-origin tracking through `require`, `createRequire`, and `import = require`.
- Reject CommonJS re-exports of the engine-query-port module.
- Add negative self-test fixtures for direct, destructured, computed, import-equals, and whole-module CommonJS forms.
- Explicitly bind the already-mentioned dynamic-import and star-export cases to negative self-test fixtures.

## Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| A. Fold completeness | PASS | 14 production and 45 total files reference `canonicalEngineQueryPort`; every one is assigned to a batch with an applicable migration. No site was missed. |
| B. Digest decision | PASS | For equal state/input under one engine revision, the nominal builder always installs the same frozen canonical port. Tests can create structural `EngineQueryPort` doubles, but cannot place them inside the nominal environment. MCP reconstruction uses the builder, and mid-run differing digests are rejected. Cross-version replay remains expressly outside the contract. |
| C. Compile-safe order | PASS | All 18 batches contain ≤10 files. B17 completes query callers before B13/B14/B18 contract signatures; B15 enforcement/deletion follows those contractions; B16 retires the scaffold last. The seven-API inventory reproduced as 287 diagnostics in 78 files. |
| D. Enforcement | **FAIL** | Current scan is clean and the gate scope change is correct, but CommonJS/import-equals loading and re-export paths lack explicit checker semantics and fixtures. |
| E. Mutants | PASS | Controlled unequal distance results give the legendary/speculative/arena tests independent observable outcomes. Real-symbol omission fixtures kill `QUERY_DEFAULT_REINTRODUCED`; all missing-argument fixtures are required to import production declarations. |
| F. Rebase fidelity | PASS | Citations, discovery, merge scale, manifest size, and overlap reproduce against `0e2eb984`. |
| G. Scope | PASS | Changes are limited to the authorized query-port fold, PS3B-F1/F2, integrated-base inventory, and necessary batch extensions. Existing batch order is preserved with B17/B18 inserted at safe points. No pin or binding-format change was introduced. |

## Probe results

Identity and integrity:

```text
sha256sum .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
574ae301dc3b66071399a36b16ee53c750a70ff803d4e4c2ac42a346dce89e14

wc -l .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
996

git rev-parse HEAD
0e2eb984368d7acc641cd6ec161411a99bb80cf1

git status --short
<empty>

sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Canonical-port inventory:

```text
rg -n '= canonicalEngineQueryPort|\?\? canonicalEngineQueryPort' src tools tests --glob '*.ts' | wc -l
34

rg -n canonicalEngineQueryPort src tools tests --glob '*.ts' | wc -l
189

rg -l canonicalEngineQueryPort src tools tests --glob '*.ts' | wc -l
45

rg -l canonicalEngineQueryPort src tools --glob '*.ts' | wc -l
14
```

The twelve current production fallback expressions reproduced at:

```text
engine-query-port.ts:906
blind-intent-resolver.ts:776
speculative-planning.ts:105,299,356,570,611,681,761
intent-resolver.ts:548,652,682
```

The resolver singleton is the thirteenth audit item. Direct bypasses reproduced at arena-legality `21,25,29,40,47,59,111`, legendary-windows `199–200`, entrypoint `545`, engine-query-port `1733,1788`, and the conversation sites enumerated by the plan. No unassigned file remained.

Batch parser:

```text
B1=10 B2=10 B3=10 B4=10 B5=10 B6=10 B7=10 B8=10 B9=10
B10=9 B11=10 B12=10 B17=5 B13=8 B14=10 B18=5 B15=4 B16=10
batches=18 appearances=161 distinct=123
```

The plan’s diagnostic table is internally consistent:

```text
rows=108
seven_files=78
seven_diagnostics=287
full_files=108
full_diagnostics=558
```

Because the sandbox required no writes anywhere, I reproduced the signature probe with an in-memory TypeScript `CompilerHost` overlay rather than a `/tmp` copy. It applied the six-file/seven-API edits to:

```text
src/vtt/dm-encounter-host.ts
src/vtt/encounter-board-projection.ts
src/vtt/encounter-projections.ts
src/vtt/engine-round-session.ts
src/vtt/offered-option-paths.ts
src/vtt/mcp/entrypoint.ts
```

Output:

```text
diagnostics=287 files=78
40 tests/unit/tools/engine-mcp-handler.test.ts
23 tests/unit/vtt/engine-round-session.test.ts
20 tests/unit/vtt/encounter-session-service.test.ts
13 tests/unit/vtt/local-session-store.test.ts
13 tests/unit/vtt/prose-renderer.test.ts
10 tests/unit/tools/engine-mcp-server.test.ts
9 tests/unit/vtt/renderer-profile.test.ts
8 tests/integration/vtt/dm-encounter-host-live-path.test.ts
7 tests/unit/tools/ai-dm-board-delivery.test.ts
6 tests/unit/vtt/composite-turn-proposals.test.ts
6 tests/unit/vtt/refusal-handling.test.ts
5 tests/unit/vtt/engine-context-integrations.test.ts
```

TypeScript configuration and baseline:

```text
tsconfig.app.json noEmit=true
tsBuildInfoFile=/tmp/dnd-multiclass-spells-static-app.tsbuildinfo

tsconfig.node.json noEmit=true
tsBuildInfoFile=/tmp/dnd-multiclass-spells-static-node.tsbuildinfo
```

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

Architecture baseline:

```text
sg scan --config sgconfig.yml src tools tests
exit 0, zero findings
```

Discovery:

```text
npx vitest list --configLoader runner --filesOnly --json |
  node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log(JSON.parse(s).length))"
643
```

Rebase citation spot-checks:

```text
encounter-projections.ts:399  export function projectDmBoard(input: {
encounter-projections.ts:483  const offerEnvironment = createLegacyEngineOptionEnvironment(...)

dm-encounter-host.ts:393     readonly offerEnvironment?: EngineOptionEnvironment;
dm-encounter-host.ts:408-409 ?? createLegacyEngineOptionEnvironment(...)

mcp/entrypoint.ts:337        readonly offerEnvironment?: EngineOptionEnvironmentBinding;
mcp/entrypoint.ts:437        readonly offerEnvironment?: EngineOptionEnvironment;
mcp/entrypoint.ts:453        options.offerEnvironment ?? createLegacy...

engine-state-capsule.ts:944-949
createEngineStateCapsule delegates with a legacy binding

tools/ai-dm-conversation.ts:4252
const offerEnvironment = createLegacyEngineOptionEnvironment(...)
```

Additional query citations also matched: legendary-windows `199–200`, blind-intent-resolver `776`, and speculative-planning `105/299`.

Merge scale:

```text
git diff --stat 82ae8554...40f04e2c | tail -1
431 files changed, 183961 insertions(+), 1363 deletions(-)

git diff --stat 82ae8554...40f04e2c -- src/vtt tools tests/unit/vtt tests/unit/tools | tail -1
177 files changed, 55268 insertions(+), 1247 deletions(-)

git diff --name-only 82ae8554...40f04e2c | wc -l
431

manifest/main-path intersection
45

manifest distinct paths
123
```

Blocking list: **PS3B-A1**.

S3 BUILDER AMEND REVIEW DONE