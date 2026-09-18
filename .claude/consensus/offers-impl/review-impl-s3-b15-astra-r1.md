## Finding: B15-F1 — Production query-port construction is not rejected

**Location:** `scripts/check-offer-environment-architecture.mjs:1289–1307`.

Plan **:662** requires rejecting production `EngineQueryPort` literals/spreads outside its implementation, while permitting typed test doubles.

I introduced this **in memory** at `blind-intent-resolver.ts:708`:

```ts
const copiedQueries: EngineQueryPort = { ...offerEnvironment.queries };
const current = copiedQueries.tokenPosition(input.state, actor.id);
```

**My results:**

- Architecture production check: **exit 0**, “runtime export allowlist: buildOfferEnvironment only”.
- TypeScript node-program diagnostics: **0**.
- Mutant SHA: `bf01cb2bcb0a03aa3f8e1c773aeb3e3660d883c053a4456b7bfad0f82141f90a`.

The final checker checks canonical origins, exported environment constructors, format literals and branded assertions, but contains no check for these consumer-created query ports. The enabled sg rule likewise matches forbidden identifier names; this construction contains none.

Add the required production query-literal/spread check and a negative fixture, retaining positive coverage for test doubles. This is an explicit frozen-plan requirement, not a proposed design change.

## Scope and preservation — passed

**Ran:** `git diff 5883b87f 39cc7df5`, normalized test-source comparisons, pin-initializer comparisons, formatting checks and discovery.

- Exactly **13 files, 188 additions / 164 deletions**.
- All six changed test files differ **only by constant imports and tag substitutions** after normalization. This includes the three D617.31 files.
- No test deleted; no expectation, ID, cursor or hash changed.
- Maximum added-line length **108**; **zero** over 120.
- `git diff --check 5883b87f 39cc7df5`: **exit 0**.
- Discovery: **643**. Final worktree clean.

Pins checked unchanged:

- `EXPECTED_DISABLED_POLICY_DIGEST`
- `EXPECTED_UNREPRESENTED_CATALOG_DIGEST`
- `EXPECTED_LEGACY_ENVIRONMENT_DIGEST`
- `EXPECTED_REPRESENTED_CATALOG_DIGEST`
- `EXPECTED_REPRESENTED_ENVIRONMENT_DIGEST`
- `EXPECTED_REVISION_ENVIRONMENT_DIGEST`
- All five `EXPECTED_PARENT_STANDARD_IDS`
- Entire `ACCEPTED_IDENTITY_PINS` and `FROZEN_IDENTITY_PINS` objects: capsule, authorization, proposal ID/hash, agent-session, advice and cursor pins.

**Read:** D617.30/D617.31, both implementer reports, frozen-plan requirements and old codec implementations via `git show`.

### Codec extraction

No runtime semantic difference found:

- `digestBody` retains `sha256(canonicalJson(value))`.
- `deepFreeze` retains primitive/null/already-frozen guards, recursive traversal and final freeze.
- `exactKeys` retains sorted actual/expected keys and identical exception text.
- Its parameter broadens from a readonly record to `object`; this does not change runtime behavior.
- Builder replacement of `hasExactKeys` preserves rejection conditions and messages.
- Independent test derivations still use their existing hash calculations; they do not import `digestBody`.

The three constants have inferred literal types, format types use `typeof`, and producers/validators import them. Raw-tag search over `src tools tests` found **only their three initializers**. No re-exported constant aliases were added.

The four factories, structural interface and launcher wrapper are deleted. The new launcher call is exactly the deleted wrapper’s return expression.

## Gates and fixture batching

The sg rule is now **error**, scoped to `src`, `tools`, and `tests`, with the planned builder/query-module exceptions.

The complete fixture-definition region is **byte-identical** before/after. All **31** contracted fixtures remain: **11 required-surfaces + 6 resolver + 14 final-query**.

Batching retains separate per-file diagnostics and unchanged checks:

- An error must occur on each omission line.
- The supplied-argument line must remain clean.
- Unrelated diagnostics fail the fixture.

These are the existing location-based expectations; diagnostic codes were not separately pinned before this change either. Unqualified self-test now activates these 31 plus four format fixtures: **74 total**, versus the previous unqualified **39**.

## Mutants I ran

Used `node --input-type=module` with `ts.sys.readFile` overlays, importing the actual architecture script without changing files.

| Mutant | Result |
|---|---|
| Canonical re-import/use in blind resolver | **Exit 1**; forbidden import and value reference |
| Second builder export | **Exit 1**; runtime exports must be exactly `buildOfferEnvironment` |
| Raw catalog tag at test usage site | **Exit 1**; forbidden raw format tag |
| **Own:** builder alias imported through a re-export | **Exit 1**; forbidden exported constructor and builder re-export |
| **Own:** canonical namespace access in blind resolver | **Exit 1**; forbidden canonical member access |
| **Additional:** production typed query-port spread | **Survived**; finding above |

Thus D617.30’s canonical-reimport acceptance requirement is satisfied.

Production SHA-256 values printed before/after were unchanged:

```text
builder:
83e1e6f6c46e056454dcbdb2a29e46999ce5ac6876efc3e561fdaa81952e2364
blind resolver:
580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
offer-environment:
a8d2803bb94e4ce75c9cf7a95edef78b2a6f014fc17766341d517384293022a6
```

## Baseline checks I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-command-outcomes.mjs
npx --no-install sg scan --config sgconfig.yml src tools tests
npx --no-install sg test --skip-snapshot-tests --test-dir ast-grep-tests
```

All **exit 0**. Architecture: **1,622 TypeScript files**, **74 fixtures**; sg tests: **1 passed**.

Vitest with `--configLoader runner --pool threads --maxWorkers 3`: the three environment suites, legendary, blind resolver and speculative passed **63/63 across six files**.

MCP server with the same previous exclusion of the two blocked stdio cases: **13 passed / 2 skipped**, exit **0**.

The legacy-invariance and M-3 results remain **supervisor evidence**; I did not retry their blocked filesystem paths. An optional sg stdin probe was interrupted without a result and receives no verification credit.

REJECT B15 — Findings: B15-F1 the final architecture gate permits production EngineQueryPort literals/spreads forbidden by plan :662.
tokens used
1,164,544
## Finding: B15-F1 — Production query-port construction is not rejected

**Location:** `scripts/check-offer-environment-architecture.mjs:1289–1307`.

Plan **:662** requires rejecting production `EngineQueryPort` literals/spreads outside its implementation, while permitting typed test doubles.

I introduced this **in memory** at `blind-intent-resolver.ts:708`:

```ts
const copiedQueries: EngineQueryPort = { ...offerEnvironment.queries };
const current = copiedQueries.tokenPosition(input.state, actor.id);
```

**My results:**

- Architecture production check: **exit 0**, “runtime export allowlist: buildOfferEnvironment only”.
- TypeScript node-program diagnostics: **0**.
- Mutant SHA: `bf01cb2bcb0a03aa3f8e1c773aeb3e3660d883c053a4456b7bfad0f82141f90a`.

The final checker checks canonical origins, exported environment constructors, format literals and branded assertions, but contains no check for these consumer-created query ports. The enabled sg rule likewise matches forbidden identifier names; this construction contains none.

Add the required production query-literal/spread check and a negative fixture, retaining positive coverage for test doubles. This is an explicit frozen-plan requirement, not a proposed design change.

## Scope and preservation — passed

**Ran:** `git diff 5883b87f 39cc7df5`, normalized test-source comparisons, pin-initializer comparisons, formatting checks and discovery.

- Exactly **13 files, 188 additions / 164 deletions**.
- All six changed test files differ **only by constant imports and tag substitutions** after normalization. This includes the three D617.31 files.
- No test deleted; no expectation, ID, cursor or hash changed.
- Maximum added-line length **108**; **zero** over 120.
- `git diff --check 5883b87f 39cc7df5`: **exit 0**.
- Discovery: **643**. Final worktree clean.

Pins checked unchanged:

- `EXPECTED_DISABLED_POLICY_DIGEST`
- `EXPECTED_UNREPRESENTED_CATALOG_DIGEST`
- `EXPECTED_LEGACY_ENVIRONMENT_DIGEST`
- `EXPECTED_REPRESENTED_CATALOG_DIGEST`
- `EXPECTED_REPRESENTED_ENVIRONMENT_DIGEST`
- `EXPECTED_REVISION_ENVIRONMENT_DIGEST`
- All five `EXPECTED_PARENT_STANDARD_IDS`
- Entire `ACCEPTED_IDENTITY_PINS` and `FROZEN_IDENTITY_PINS` objects: capsule, authorization, proposal ID/hash, agent-session, advice and cursor pins.

**Read:** D617.30/D617.31, both implementer reports, frozen-plan requirements and old codec implementations via `git show`.

### Codec extraction

No runtime semantic difference found:

- `digestBody` retains `sha256(canonicalJson(value))`.
- `deepFreeze` retains primitive/null/already-frozen guards, recursive traversal and final freeze.
- `exactKeys` retains sorted actual/expected keys and identical exception text.
- Its parameter broadens from a readonly record to `object`; this does not change runtime behavior.
- Builder replacement of `hasExactKeys` preserves rejection conditions and messages.
- Independent test derivations still use their existing hash calculations; they do not import `digestBody`.

The three constants have inferred literal types, format types use `typeof`, and producers/validators import them. Raw-tag search over `src tools tests` found **only their three initializers**. No re-exported constant aliases were added.

The four factories, structural interface and launcher wrapper are deleted. The new launcher call is exactly the deleted wrapper’s return expression.

## Gates and fixture batching

The sg rule is now **error**, scoped to `src`, `tools`, and `tests`, with the planned builder/query-module exceptions.

The complete fixture-definition region is **byte-identical** before/after. All **31** contracted fixtures remain: **11 required-surfaces + 6 resolver + 14 final-query**.

Batching retains separate per-file diagnostics and unchanged checks:

- An error must occur on each omission line.
- The supplied-argument line must remain clean.
- Unrelated diagnostics fail the fixture.

These are the existing location-based expectations; diagnostic codes were not separately pinned before this change either. Unqualified self-test now activates these 31 plus four format fixtures: **74 total**, versus the previous unqualified **39**.

## Mutants I ran

Used `node --input-type=module` with `ts.sys.readFile` overlays, importing the actual architecture script without changing files.

| Mutant | Result |
|---|---|
| Canonical re-import/use in blind resolver | **Exit 1**; forbidden import and value reference |
| Second builder export | **Exit 1**; runtime exports must be exactly `buildOfferEnvironment` |
| Raw catalog tag at test usage site | **Exit 1**; forbidden raw format tag |
| **Own:** builder alias imported through a re-export | **Exit 1**; forbidden exported constructor and builder re-export |
| **Own:** canonical namespace access in blind resolver | **Exit 1**; forbidden canonical member access |
| **Additional:** production typed query-port spread | **Survived**; finding above |

Thus D617.30’s canonical-reimport acceptance requirement is satisfied.

Production SHA-256 values printed before/after were unchanged:

```text
builder:
83e1e6f6c46e056454dcbdb2a29e46999ce5ac6876efc3e561fdaa81952e2364
blind resolver:
580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
offer-environment:
a8d2803bb94e4ce75c9cf7a95edef78b2a6f014fc17766341d517384293022a6
```

## Baseline checks I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-command-outcomes.mjs
npx --no-install sg scan --config sgconfig.yml src tools tests
npx --no-install sg test --skip-snapshot-tests --test-dir ast-grep-tests
```

All **exit 0**. Architecture: **1,622 TypeScript files**, **74 fixtures**; sg tests: **1 passed**.

Vitest with `--configLoader runner --pool threads --maxWorkers 3`: the three environment suites, legendary, blind resolver and speculative passed **63/63 across six files**.

MCP server with the same previous exclusion of the two blocked stdio cases: **13 passed / 2 skipped**, exit **0**.

The legacy-invariance and M-3 results remain **supervisor evidence**; I did not retry their blocked filesystem paths. An optional sg stdin probe was interrupted without a result and receives no verification credit.

REJECT B15 — Findings: B15-F1 the final architecture gate permits production EngineQueryPort literals/spreads forbidden by plan :662.
