# OFFERS-IMPL-S3-BUILDER amendment review r3 — gpt-5.6-sol (read-only)

Reviewed plan sha fa3c8016… (999 lines) on 0e2eb984. Session 01a0a178-b7b9-76d0-b304-99841096ee48. Log .tmp/runs/fanout/review-plan-s3-amend-r3.log.

## Verdict

**ACCEPT PLAN S3 BUILDER AMENDMENT**

No PS3B-B findings. PS3B-A1 is closed, the codec addition is sound, §2 compression is lossless, and no unauthorized design change was found.

## Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| A. PS3B-A1 closed | PASS | [Lines 645–659](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:645) require origin tracking through `require`, aliased `createRequire`, and `import = require`, including `load→m→k→m[k]`, and name all required fixtures. |
| B. Supervisor addition | PASS | [B15 lines 557–585](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:557) atomically adds the primitives module and migrates both codecs, the builder, and all three affected tests. Existing helper implementations are runtime-identical, so extraction cannot change digest bytes. |
| C. §2 compression | PASS | No citation, default site, canonical bypass, provenance fact, or process-boundary fact was lost. Facts removed from standalone prose are either in the table or retained later in the plan. |
| D. Nothing else changed | PASS | Every diff hunk is PS3B-A1, the codec addition, §2 compression, or necessary status/count/reference bookkeeping. |
| E. Inventory | PASS | 18 batches, every batch ≤10 files, 167 appearances, 125 distinct files. Both new manifest files appear in B15 with stated work. Discovery remains 643. |

## A. PS3B-A1 closure

The new contract says:

> “Trace symbol origin through require(), createRequire() loaders/aliases, and TypeScript import x = require(...).”

> “Follow required-module bindings through aliases, destructuring, and constant computed members, including load→m→k→m[k].”

> “Reject CommonJS whole-module re-exports exposing engine-query-port outside the two permitted modules.”

The required forms bind to these named negative fixtures:

| Form | Fixture |
|---|---|
| Direct `require` access | `canonical-require-direct.cts` |
| Destructured `require` | `canonical-require-destructured.cts` |
| Computed access | `canonical-require-computed.cts` |
| Aliased `createRequire` plus `m[k]` | `canonical-create-require-computed.mts` |
| TypeScript import-equals | `canonical-import-equals.cts` |
| Whole-module CommonJS export | `canonical-commonjs-reexport.cts` |
| Named CommonJS export | `canonical-commonjs-named-reexport.cts` |
| Dynamic ESM import | `canonical-dynamic-import.mts` |
| ESM star export | `canonical-star-export.mts` |

This is implementable. TypeScript will not provide useful symbol provenance from a raw `require()` result typed as `any`, but the script can combine the TypeScript AST and checker:

- Resolve `createRequire` aliases through checker symbols.
- Recognize literal module arguments syntactically.
- Record the origin of `const` bindings.
- Propagate origins through aliases and destructuring.
- Constant-fold the specified string key.
- Inspect assignment/export targets.

The exact `load→m→k→m[k]` chain and compatible `.cts`/`.mts` compiler options make this a bounded dataflow check, not a hand-wave. The plan also says unrelated compiler errors cannot count as kills and retains exact diagnostic expectations.

## B. Codec addition

The current helpers compare as follows:

```text
exactKeys byte-identical=true
deepFreeze byte-identical=true
digestBody runtime-identical=true
offer=function digestBody(value: object): string {
  return sha256(canonicalJson(value));
}
catalog=function digestBody(body: PartyThreatCatalogBody): string {
  return sha256(canonicalJson(body));
}
```

Changing the parameter name and static type of `digestBody` cannot alter runtime input or serialized bytes. `exactKeys` preserves sorting, comparison, and exception text; `deepFreeze` preserves recursion order and the frozen-object guard.

The new module has no dependency back on either codec, so it introduces no cycle. B15 creates the primitives module in the same atomic batch in which all consumers import it.

The three format constants are not named by the ast-grep factory/canonical-port restriction. The symbol checker’s environment-producing-export rule also does not prohibit string constants or the codec utilities.

Current literal inventory:

```text
engine-option-environment-v1: 6 occurrences
engine-offer-family-policy-v1: 6 occurrences
party-threat-catalog-v1: 8 occurrences
```

Distribution:

```text
offer-environment.ts:                 9
party-threat-catalog.ts:              6
ai-dm-legacy-invariance.test.ts:      3
offer-environment-identity.test.ts:   1
offer-environment.test.ts:            1
```

All three affected test files are in B15. Their tag literals are migrated, but their independent protection remains:

- Hard-coded digest hashes and legacy option IDs are retained.
- Tests continue deriving digests independently through `canonicalJson` and `sha256`.
- They do not use the production `digestBody`.
- Changing the sole constant initializer would still make the independent pins fail.

`OFFERS_FORMAT_TAG_RETYPED` is killed by the repository AST check that rejects any of the three exact string/literal-type nodes outside their sole initializers. Its three negative virtual fixtures each introduce one forbidden literal; `offers-format-imported.ts` is the non-tautological positive companion.

## C. §2 compression

No substantive drop was found.

Notable prose-to-table mappings include:

- The seven external legacy construction sites plus factory definition remain individually represented.
- The integrated-base provenance is retained by the §2 heading.
- D569/D613 scaffold preservation remains at lines 244, 747, and 984.
- All twelve fallback sites and the singleton remain tabulated.
- All conversation reconstruction, planning, serialization, divergence, and process-root citations remain.
- MCP launch, feed replacement, independent `turnProposals`, and blind dependencies remain.
- The SIMULATED advertised/submitted/accepted invariant remains at line 761.
- Existing gate and sgconfig facts remain in the final table rows.

No verified citation, default location, or process-boundary fact was dropped without an equivalent table entry or later contract.

## D. Diff scope

The supplied full diff contains these hunks:

1. Status and inventory-count update.
2. §2 prose-to-table compression.
3. Section-reference correction from §2.1 to §2.
4. Manifest count update.
5. B15 codec-module expansion.
6. PS3B-A1 CommonJS/ESM enforcement fixtures.
7. Format-tag architecture fixtures.
8. `OFFERS_FORMAT_TAG_RETYPED` ledger entry.
9. Read-only verification notes.
10. Updated 125-file merge bookkeeping and final status marker.

Every hunk belongs to an authorized category. No pin, digest format, builder signature, mode choice, batch ordering, or previously accepted mutant changed.

## E. Probe transcript

Integrity:

```text
sha256sum .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4

wc -l .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
999

git rev-parse HEAD
0e2eb984368d7acc641cd6ec161411a99bb80cf1

git status --short
<empty>

sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Batch parser:

```text
B1=10 B2=10 B3=10 B4=10 B5=10 B6=10 B7=10 B8=10 B9=10
B10=9 B11=10 B12=10 B17=5 B13=8 B14=10 B18=5 B15=10 B16=10

batches=18 appearances=167 distinct=125
codec-primitives appearances=1
party-threat-catalog appearances=1
```

Discovery:

```text
npx vitest list --configLoader runner --filesOnly --json |
  node -e "let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>console.log('discovery='+JSON.parse(s).length))"

discovery=643
```

Helper comparison used a read-only Node/TypeScript AST probe over the two current codec modules; output was:

```text
exactKeys byte-identical=true
deepFreeze byte-identical=true
digestBody runtime-identical=true
```

Blocking list: none.

S3 BUILDER AMEND REVIEW R3 DONE