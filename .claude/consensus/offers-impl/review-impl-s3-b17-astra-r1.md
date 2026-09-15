## Findings

**B17-F1 — The legendary witness does not prove both distance comparisons use the supplied port.**  
[legendary-windows.test.ts:166](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:166)

I reproduced two surviving shortcut mutants against `uses the supplied distance policy to select the nearest legendary-action enemy`:

| Exact production substitution | My result |
|---|---|
| At `legendary-windows.ts:208`, replace only `queries.spaceDistance(state, actor, left.profile.id)` with `canonicalEngineQueryPort.spaceDistance(state, actor, left.profile.id)` | **1 passed, 4 skipped; exit 0** |
| At `:209`, replace `(queries.spaceDistance(state, actor, right.profile.id) ?? Number.POSITIVE_INFINITY)` with `15` | **1 passed, 4 skipped; exit 0** |

The geometry explains the survivors. The Large unicorn occupies columns **1–2**, rows **1–2**. Canonical distances to the two players are **5 and 25**, while controlled distances are **30 and 5**. With this candidate order:

- Left-only canonical substitution still selects the intended controlled target: `25 − 30 < 0`.
- Constant-right substitution distinguishes both expected outcomes: controlled `5 − 15 < 0`, canonical `25 − 15 > 0`.

This misses §3.3’s requirement that replacing parameter reads with canonical reads fail the assertions. Add independently authored cases covering both comparator operands and candidate orders.

**B17-F2 — The shared-port witness specified at plan:206 is missing.**  
[legendary-windows.test.ts:166](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:166), [speculative-planning.test.ts:149](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/speculative-planning.test.ts:149)

The plan says: “Pass that same port to evaluateScenarioFact and provideLegendaryWindows.” These tests construct separate doubles over different fixtures. Neither passes its reversed-order port through both consumers. The separate witnesses demonstrate individual forwarding, but do not implement that frozen requirement.

## Compliance and preservation

Commands run:

```text
git rev-parse HEAD
git diff --stat 50436bc5 9761d22f
git diff --numstat 50436bc5 9761d22f
sha256sum .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
git diff --check
git diff --check 50436bc5 9761d22f
git status --short
```

Results: HEAD **9761d22fcd0066f1f314b1d03d6e439c0d09f8e1**; exactly the five allowed test files; **166 additions / 7 deletions**; no production changes; expected plan hash; both whitespace checks exit **0**; clean worktree.

My TypeScript-AST inspection and residual searches found:

- **Six** `resolveBlindRoundIntents` calls, at lines **199, 259, 282, 288, 300, 307**: all explicitly supply `offerEnvironment`. **None relies on the missing-environment path.**
- Synthetic matcher providers and proposal resolver remain intact.
- All **three** `provideLegendaryWindows` calls receive queries.
- All **four** movement-port calls use `OFFER_ENVIRONMENT.queries`.
- Zero remaining canonical-port imports, old environment factories/types, or ambient resolver references in the five files.

Assertion counts from my comparison:

| File | Before `expect(` | After | Maximum added-line length |
|---|---:|---:|---:|
| legendary-windows | 11 | 13 | 111 |
| projected-movement-options | 8 | 8 | 100 |
| ai-dm-arena | 255 | 257 | 95 |
| blind-intent-resolver | 33 | 36 | 103 |
| speculative-planning | 46 | 48 | 106 |

**352 pre-existing assertion expressions are byte-identical.** The remaining expression changes only the permitted legendary request arguments and their formatting. No expected outcome changed. No added line exceeds 120 columns; no added multiple-statement line or material style inconsistency found.

## Witness fidelity and mutation results

All three doubles are typed `EngineQueryPort`, spread a normally built environment’s queries, override only `spaceDistance`, and avoid environment casts. Both controlled and canonical outcomes are asserted through real consumers.

Hand-checked geometry:

| Witness | Canonical | Controlled | Expected consumer outcome |
|---|---|---|---|
| Legendary | Distances **5, 25** | **30, 5** | Target ordering reverses |
| Speculative | `(1,1)` → `(5,1)`: **20** | **5** | Adjacency false → true |
| Arena | `(0,0)` → `(1,0)`: **5** | **30** | Legal → scimitar-range refusal |

These expected outcomes agree with the authored geometry.

I used **in-memory Vite transforms**, invoked by `node --input-type=module` with `startVitest`, `configLoader:'runner'`, `pool:'threads'`, and `maxWorkers:1`. No source edits, `/tmp` source copies, or restoration commands were performed.

| Full canonical bypass | My reproduced failure |
|---|---|
| Legendary `:208–209` | Expected `combatant:legendary-distance-controlled`; received `combatant:legendary-distance-canonical`. **1 failed**, exit **1** |
| Speculative `:135` | Expected `{matches:true, actual:true}`; received `{matches:false, actual:false, failure:"FACT_FALSE"}`. **1 failed**, exit **1** |
| Arena `:129` | Expected `["combatant:arena-distance-goblin: target is outside scimitar reach/range"]`; received `[]`. **1 failed**, exit **1** |

**Arena limitation:** its full spec cannot initialize under this sandbox. I extracted the unchanged witness body and unchanged environment declaration into an in-memory test module, retaining the real production consumer. That isolated baseline passed **1/1** before the mutant failed. This is not a successful full-arena run.

Production SHA-256 values printed before and after the mutation runs were identical:

```text
legendary  3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172
speculative d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1
arena      57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6
```

## Gates I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-command-outcomes.mjs
```

All exited **0**. Both compilers produced **zero diagnostics**. Architecture output: **39 active fixtures passed; 1,621 TypeScript files checked**.

Suite commands:

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads tests/unit/tools/ai-dm-arena.test.ts

node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads tests/unit/vtt/legendary-windows.test.ts tests/unit/vtt/projected-movement-options.test.ts tests/unit/vtt/blind-intent-resolver.test.ts tests/unit/vtt/speculative-planning.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

The seven-file command passed **58/58**, exit **0**:

- B17 non-arena: **5 + 3 + 12 + 23 = 43**.
- Environment suites: **11 + 3 + 1 = 15**.

Arena exited **1**, collecting **zero tests**: `EROFS: read-only file system, mkdtemp '/tmp/d569-primary-byte-runner-XXXXXX'`, originating at [ai-dm-arena.test.ts:336](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:336).

The combined JSON-reporter run additionally selected all six requested handoff suites:

| Handoff suite | Passed | Failed |
|---|---:|---:|
| bootstrap | 0 | 5 |
| contract | 5 | 0 |
| examples | 1 | 5 |
| package-contract | 1 | 0 |
| publish | 1 | 5 |
| report | 5 | 44 |
| **Total** | **13** | **59** |

All **59** failures involved blocked `/tmp` creation, including two assertions receiving that filesystem error instead of their expected error. The combined run reported **71 passed / 59 failed**, exit **1**. These are sandbox limitations, not established B17 regressions. Initial default-pool attempts also failed before collection creating `/tmp/…/ssr`.

Discovery command:

```bash
node node_modules/vitest/vitest.mjs list --configLoader runner --filesOnly --json | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))'
```

Output: **643**, exit **0**.

## Batch scope

Plan:212’s runtime projection/proposal-composition proof belongs to the later composition and closure work: §6 names `offer-environment.test.ts`, B14 extends it, and B18 finishes application forwarding and identity coverage. It is **not an additional B17 five-file obligation**. The new blind Dodge test is appropriate B17 public-boundary coverage; it does not replace that later proof.

**REJECT B17 — Findings: B17-F1, surviving partial-bypass and one-sided-comparison mutants; B17-F2, missing shared-port cross-consumer witness.**
tokens used
91,350
## Findings

**B17-F1 — The legendary witness does not prove both distance comparisons use the supplied port.**  
[legendary-windows.test.ts:166](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:166)

I reproduced two surviving shortcut mutants against `uses the supplied distance policy to select the nearest legendary-action enemy`:

| Exact production substitution | My result |
|---|---|
| At `legendary-windows.ts:208`, replace only `queries.spaceDistance(state, actor, left.profile.id)` with `canonicalEngineQueryPort.spaceDistance(state, actor, left.profile.id)` | **1 passed, 4 skipped; exit 0** |
| At `:209`, replace `(queries.spaceDistance(state, actor, right.profile.id) ?? Number.POSITIVE_INFINITY)` with `15` | **1 passed, 4 skipped; exit 0** |

The geometry explains the survivors. The Large unicorn occupies columns **1–2**, rows **1–2**. Canonical distances to the two players are **5 and 25**, while controlled distances are **30 and 5**. With this candidate order:

- Left-only canonical substitution still selects the intended controlled target: `25 − 30 < 0`.
- Constant-right substitution distinguishes both expected outcomes: controlled `5 − 15 < 0`, canonical `25 − 15 > 0`.

This misses §3.3’s requirement that replacing parameter reads with canonical reads fail the assertions. Add independently authored cases covering both comparator operands and candidate orders.

**B17-F2 — The shared-port witness specified at plan:206 is missing.**  
[legendary-windows.test.ts:166](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:166), [speculative-planning.test.ts:149](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/speculative-planning.test.ts:149)

The plan says: “Pass that same port to evaluateScenarioFact and provideLegendaryWindows.” These tests construct separate doubles over different fixtures. Neither passes its reversed-order port through both consumers. The separate witnesses demonstrate individual forwarding, but do not implement that frozen requirement.

## Compliance and preservation

Commands run:

```text
git rev-parse HEAD
git diff --stat 50436bc5 9761d22f
git diff --numstat 50436bc5 9761d22f
sha256sum .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
git diff --check
git diff --check 50436bc5 9761d22f
git status --short
```

Results: HEAD **9761d22fcd0066f1f314b1d03d6e439c0d09f8e1**; exactly the five allowed test files; **166 additions / 7 deletions**; no production changes; expected plan hash; both whitespace checks exit **0**; clean worktree.

My TypeScript-AST inspection and residual searches found:

- **Six** `resolveBlindRoundIntents` calls, at lines **199, 259, 282, 288, 300, 307**: all explicitly supply `offerEnvironment`. **None relies on the missing-environment path.**
- Synthetic matcher providers and proposal resolver remain intact.
- All **three** `provideLegendaryWindows` calls receive queries.
- All **four** movement-port calls use `OFFER_ENVIRONMENT.queries`.
- Zero remaining canonical-port imports, old environment factories/types, or ambient resolver references in the five files.

Assertion counts from my comparison:

| File | Before `expect(` | After | Maximum added-line length |
|---|---:|---:|---:|
| legendary-windows | 11 | 13 | 111 |
| projected-movement-options | 8 | 8 | 100 |
| ai-dm-arena | 255 | 257 | 95 |
| blind-intent-resolver | 33 | 36 | 103 |
| speculative-planning | 46 | 48 | 106 |

**352 pre-existing assertion expressions are byte-identical.** The remaining expression changes only the permitted legendary request arguments and their formatting. No expected outcome changed. No added line exceeds 120 columns; no added multiple-statement line or material style inconsistency found.

## Witness fidelity and mutation results

All three doubles are typed `EngineQueryPort`, spread a normally built environment’s queries, override only `spaceDistance`, and avoid environment casts. Both controlled and canonical outcomes are asserted through real consumers.

Hand-checked geometry:

| Witness | Canonical | Controlled | Expected consumer outcome |
|---|---|---|---|
| Legendary | Distances **5, 25** | **30, 5** | Target ordering reverses |
| Speculative | `(1,1)` → `(5,1)`: **20** | **5** | Adjacency false → true |
| Arena | `(0,0)` → `(1,0)`: **5** | **30** | Legal → scimitar-range refusal |

These expected outcomes agree with the authored geometry.

I used **in-memory Vite transforms**, invoked by `node --input-type=module` with `startVitest`, `configLoader:'runner'`, `pool:'threads'`, and `maxWorkers:1`. No source edits, `/tmp` source copies, or restoration commands were performed.

| Full canonical bypass | My reproduced failure |
|---|---|
| Legendary `:208–209` | Expected `combatant:legendary-distance-controlled`; received `combatant:legendary-distance-canonical`. **1 failed**, exit **1** |
| Speculative `:135` | Expected `{matches:true, actual:true}`; received `{matches:false, actual:false, failure:"FACT_FALSE"}`. **1 failed**, exit **1** |
| Arena `:129` | Expected `["combatant:arena-distance-goblin: target is outside scimitar reach/range"]`; received `[]`. **1 failed**, exit **1** |

**Arena limitation:** its full spec cannot initialize under this sandbox. I extracted the unchanged witness body and unchanged environment declaration into an in-memory test module, retaining the real production consumer. That isolated baseline passed **1/1** before the mutant failed. This is not a successful full-arena run.

Production SHA-256 values printed before and after the mutation runs were identical:

```text
legendary  3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172
speculative d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1
arena      57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6
```

## Gates I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-command-outcomes.mjs
```

All exited **0**. Both compilers produced **zero diagnostics**. Architecture output: **39 active fixtures passed; 1,621 TypeScript files checked**.

Suite commands:

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads tests/unit/tools/ai-dm-arena.test.ts

node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads tests/unit/vtt/legendary-windows.test.ts tests/unit/vtt/projected-movement-options.test.ts tests/unit/vtt/blind-intent-resolver.test.ts tests/unit/vtt/speculative-planning.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

The seven-file command passed **58/58**, exit **0**:

- B17 non-arena: **5 + 3 + 12 + 23 = 43**.
- Environment suites: **11 + 3 + 1 = 15**.

Arena exited **1**, collecting **zero tests**: `EROFS: read-only file system, mkdtemp '/tmp/d569-primary-byte-runner-XXXXXX'`, originating at [ai-dm-arena.test.ts:336](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:336).

The combined JSON-reporter run additionally selected all six requested handoff suites:

| Handoff suite | Passed | Failed |
|---|---:|---:|
| bootstrap | 0 | 5 |
| contract | 5 | 0 |
| examples | 1 | 5 |
| package-contract | 1 | 0 |
| publish | 1 | 5 |
| report | 5 | 44 |
| **Total** | **13** | **59** |

All **59** failures involved blocked `/tmp` creation, including two assertions receiving that filesystem error instead of their expected error. The combined run reported **71 passed / 59 failed**, exit **1**. These are sandbox limitations, not established B17 regressions. Initial default-pool attempts also failed before collection creating `/tmp/…/ssr`.

Discovery command:

```bash
node node_modules/vitest/vitest.mjs list --configLoader runner --filesOnly --json | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))'
```

Output: **643**, exit **0**.

## Batch scope

Plan:212’s runtime projection/proposal-composition proof belongs to the later composition and closure work: §6 names `offer-environment.test.ts`, B14 extends it, and B18 finishes application forwarding and identity coverage. It is **not an additional B17 five-file obligation**. The new blind Dodge test is appropriate B17 public-boundary coverage; it does not replace that later proof.

**REJECT B17 — Findings: B17-F1, surviving partial-bypass and one-sided-comparison mutants; B17-F2, missing shared-port cross-consumer witness.**
