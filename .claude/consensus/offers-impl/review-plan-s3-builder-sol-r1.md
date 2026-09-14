# OFFERS-IMPL-S3-BUILDER plan review r1 (sol 01a0a178-b7b9-76d0-b304-99841096ee48) on plan sha a5335ad2…, harvested 2026-09-14 16:05

The plan is implementable and faithfully realizes D617.5/D617.6. I found no P1 or P2 blocker.

## Findings

### PS3B-F1 — P3 — Record the full merge size as well as the scoped size

The plan accurately labels its `177 files` figure as scoped to `src/vtt`, `tools`, `tests/unit/vtt`, and `tests/unit/tools` at [plan:837](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:837>). However, the unscoped command requested for this review is substantially larger:

```text
git diff --stat 82ae8554...40f04e2c
431 files changed, 183961 insertions(+), 1363 deletions(-)

git diff --stat 82ae8554...40f04e2c -- src/vtt tools tests/unit/vtt tests/unit/tools
177 files changed, 55268 insertions(+), 1247 deletions(-)
```

This does not invalidate the 44-path direct-overlap calculation, but the full figure better communicates integration risk.

Minimal change: add the unscoped `431 files` result beside the explicitly scoped `177 files` result.

### PS3B-F2 — P3 — Make the missing-argument self-test’s source dependency explicit

The plan requires negative compile fixtures for each contracted API at [plan:601](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:601>) and maps `MISSING_ENV_ARGUMENT` to them at [plan:680](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:680>). It does not explicitly say those fixtures import the real repository declarations rather than fixture-local copies.

Minimal change: state that every missing-argument fixture imports its actual production symbol, and that making the production argument optional must cause the self-test to fail because the expected diagnostic disappears.

## Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| Design fidelity | PASS | [Plan:109–152](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:109>) defines one exported runtime function, a module-private class with a real private field, canonical queries, and no exported constructor. Old factories, the launcher reconstruction wrapper, and the capsule legacy wrapper are deleted. Object literals/spreads cannot satisfy the nominal type; aliases, casts, wrappers, and re-exports are rejected. The child directly calls the same builder. No ambient accessor is introduced. |
| Digest contract | PASS | [Plan:153–193](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:153>) closes all requested routes: absent/unregistered and cloned objects refuse; serialized IDs are authoritatively reminted; query selection is canonical and outside caller input; capsule replacement and hostile custom feeds are checked; `turnProposals` is derived internally from the application environment. |
| Batching | PASS | Counts are `B1…B16 = 10,8,9,10,10,10,10,10,10,9,10,10,8,10,4,10`: 148 appearances and 118 distinct files. No batch exceeds ten. B1–B12 retain compatible surfaces, B13/B14 contract them, B15 deletes exports, and B16 removes obsolete tests. Every listed file has a stated builder, caller, enforcement, merge, or scaffold change. |
| Enforcement | PASS | The ast-grep identifier/property rule catches direct names, named aliases, namespace properties, and ordinary re-exports. The symbol-aware checker covers computed members, inferred-return wrappers, re-exported builders/classes, nominal-type casts, and construction expressions. The real gate changes are correctly identified at [plan:607–614](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:607>). Existing widened scan: exit 0, zero findings. |
| Tests and mutants | PASS, with PS3B-F2 | The inventory contains 79 distinct specs: 65 worktree environment/caller/3B specs plus 14 main-side specs. Golden’s expected handle is built from independently specified fixture/run/request/binding data, never child output. SIMULATED uses independently known input and metadata. Divergence restores a fixture-defined mechanics oracle. No pin is regenerated. |
| Merge | PASS | Full diff is 431 files; relevant scoped diff is the documented 177. Manifest intersection with the complete diff is exactly 44 paths. Main discovers 641 specs; the branch adds exactly two specs and no rename, so the merged expectation is 643. Implementation should start only on the main-merged integration base; [plan:246–252](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:246>) already mandates that. |
| Size/risk | PASS | The large caller migration is compiler-derived rather than compatibility machinery. The private nominal type and symbol checker add complexity, but each closes a real structural-fake, wrapper, cast, or re-export route. The plan removes 428 lines of identity scaffold and does not retain adapters or alternate factories. |

## Digest-loophole and mutant audit

| Mutant/loophole | Killing evidence | Assessment |
|---|---|---|
| `MISSING_ENV_ARGUMENT` | Real-API negative compile fixtures | Real once PS3B-F2’s import requirement is explicit |
| `SECOND_ENV_BUILDER` | Exported wrapper/class/alias fixtures plus final symbol scan | Real; tests independent checker behavior |
| `LEGACY_FACTORY_IMPORT` | ast-grep invalid fixtures and final `src tools tests` scan | Real |
| `FALLBACK_USES_LEGACY_ONLY` | Bound fallback acceptance after primary refusal | Real behavior assertion |
| `BOARD_DIFFERENT_POLICY` | Different-digest path refusal plus host/board-sequence digest conservation | Real; independent non-legacy input |
| `CONSUMER_DROPS_BOUND_ENV` | Runtime capsule assertions, host/projector digest check, and SIMULATED reference capsule | Real at the principal lifecycle roots; final ledger must identify the exact mutated consumer |
| `MCP_CHILD_IGNORES_SERIALIZED_BINDING` | Golden child handle compared with independently constructed reference, followed by real proposal acceptance | Real and cross-process |
| `MIDRUN_ENV_SWAP` | Replacement-before-mutation/listener tests and hostile custom-feed tests | Real state-transition assertion |
| `SKIP_DIGEST_CHECK` | Different/absent provenance plus capsule-swap refusal | Real; includes cloned and raw/unregistered objects |
| `DIVERGENCE_TRUSTS_STORED_RESOLUTION` | Independently specified action/target/movement and forced divergence | Real; eliminates the prior self-comparison |

The contract also directly covers malformed bindings, extra `queries`, forged nominal values, equivalent-digest reconstruction acceptance, and different-digest rejection.

## Probe record

```text
sha256sum .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
a5335ad2472b16d33e66482cee322656d84a151e2309331635e603a84abad566

wc -l .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
891

git rev-parse HEAD
82ae85542f2b4103d02749b33413739bd641af66

sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Baseline compilers:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

Both `tsBuildInfoFile` paths are under `/tmp`. The requested copy-based probe could not create its scratch directory:

```text
mktemp -d /tmp/s3b-builder-review.XXXXXX
mktemp: failed to create directory ...: Read-only file system
```

I therefore applied the same seven required-environment signature changes through an in-memory TypeScript compiler host, with `writeFile` disabled:

```text
tsconfig.app.json:
diagnostics=5 files=3
codes={"2322":1,"2345":1,"2379":2,"2741":1}

tsconfig.node.json:
diagnostics=221 files=59
codes={"2322":1,"2345":139,"2379":9,"2554":63,"2741":9}
```

This independently reproduces the design report’s `221 diagnostics / 59 files`.

Enforcement and discovery:

```text
sg scan --config sgconfig.yml src tools tests
exit 0, zero findings

npx vitest list --configLoader runner --filesOnly --json
82ae8554 worktree: 598
main 40f04e2c: 641

git diff --name-status 40f04e2c...82ae8554 -- tests
A tests/unit/vtt/offer-environment-board-sequence.test.ts
A tests/unit/vtt/offer-environment-identity.test.ts
```

Final blocking list: none.

**ACCEPT PLAN S3 BUILDER**

S3 BUILDER PLAN REVIEW DONE
tokens used
132,262
The plan is implementable and faithfully realizes D617.5/D617.6. I found no P1 or P2 blocker.

## Findings

### PS3B-F1 — P3 — Record the full merge size as well as the scoped size

The plan accurately labels its `177 files` figure as scoped to `src/vtt`, `tools`, `tests/unit/vtt`, and `tests/unit/tools` at [plan:837](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:837>). However, the unscoped command requested for this review is substantially larger:

```text
git diff --stat 82ae8554...40f04e2c
431 files changed, 183961 insertions(+), 1363 deletions(-)

git diff --stat 82ae8554...40f04e2c -- src/vtt tools tests/unit/vtt tests/unit/tools
177 files changed, 55268 insertions(+), 1247 deletions(-)
```

This does not invalidate the 44-path direct-overlap calculation, but the full figure better communicates integration risk.

Minimal change: add the unscoped `431 files` result beside the explicitly scoped `177 files` result.

### PS3B-F2 — P3 — Make the missing-argument self-test’s source dependency explicit

The plan requires negative compile fixtures for each contracted API at [plan:601](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:601>) and maps `MISSING_ENV_ARGUMENT` to them at [plan:680](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:680>). It does not explicitly say those fixtures import the real repository declarations rather than fixture-local copies.

Minimal change: state that every missing-argument fixture imports its actual production symbol, and that making the production argument optional must cause the self-test to fail because the expected diagnostic disappears.

## Dimension verdicts

| Dimension | Verdict | Evidence |
|---|---|---|
| Design fidelity | PASS | [Plan:109–152](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:109>) defines one exported runtime function, a module-private class with a real private field, canonical queries, and no exported constructor. Old factories, the launcher reconstruction wrapper, and the capsule legacy wrapper are deleted. Object literals/spreads cannot satisfy the nominal type; aliases, casts, wrappers, and re-exports are rejected. The child directly calls the same builder. No ambient accessor is introduced. |
| Digest contract | PASS | [Plan:153–193](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:153>) closes all requested routes: absent/unregistered and cloned objects refuse; serialized IDs are authoritatively reminted; query selection is canonical and outside caller input; capsule replacement and hostile custom feeds are checked; `turnProposals` is derived internally from the application environment. |
| Batching | PASS | Counts are `B1…B16 = 10,8,9,10,10,10,10,10,10,9,10,10,8,10,4,10`: 148 appearances and 118 distinct files. No batch exceeds ten. B1–B12 retain compatible surfaces, B13/B14 contract them, B15 deletes exports, and B16 removes obsolete tests. Every listed file has a stated builder, caller, enforcement, merge, or scaffold change. |
| Enforcement | PASS | The ast-grep identifier/property rule catches direct names, named aliases, namespace properties, and ordinary re-exports. The symbol-aware checker covers computed members, inferred-return wrappers, re-exported builders/classes, nominal-type casts, and construction expressions. The real gate changes are correctly identified at [plan:607–614](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:607>). Existing widened scan: exit 0, zero findings. |
| Tests and mutants | PASS, with PS3B-F2 | The inventory contains 79 distinct specs: 65 worktree environment/caller/3B specs plus 14 main-side specs. Golden’s expected handle is built from independently specified fixture/run/request/binding data, never child output. SIMULATED uses independently known input and metadata. Divergence restores a fixture-defined mechanics oracle. No pin is regenerated. |
| Merge | PASS | Full diff is 431 files; relevant scoped diff is the documented 177. Manifest intersection with the complete diff is exactly 44 paths. Main discovers 641 specs; the branch adds exactly two specs and no rename, so the merged expectation is 643. Implementation should start only on the main-merged integration base; [plan:246–252](</home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md:246>) already mandates that. |
| Size/risk | PASS | The large caller migration is compiler-derived rather than compatibility machinery. The private nominal type and symbol checker add complexity, but each closes a real structural-fake, wrapper, cast, or re-export route. The plan removes 428 lines of identity scaffold and does not retain adapters or alternate factories. |

## Digest-loophole and mutant audit

| Mutant/loophole | Killing evidence | Assessment |
|---|---|---|
| `MISSING_ENV_ARGUMENT` | Real-API negative compile fixtures | Real once PS3B-F2’s import requirement is explicit |
| `SECOND_ENV_BUILDER` | Exported wrapper/class/alias fixtures plus final symbol scan | Real; tests independent checker behavior |
| `LEGACY_FACTORY_IMPORT` | ast-grep invalid fixtures and final `src tools tests` scan | Real |
| `FALLBACK_USES_LEGACY_ONLY` | Bound fallback acceptance after primary refusal | Real behavior assertion |
| `BOARD_DIFFERENT_POLICY` | Different-digest path refusal plus host/board-sequence digest conservation | Real; independent non-legacy input |
| `CONSUMER_DROPS_BOUND_ENV` | Runtime capsule assertions, host/projector digest check, and SIMULATED reference capsule | Real at the principal lifecycle roots; final ledger must identify the exact mutated consumer |
| `MCP_CHILD_IGNORES_SERIALIZED_BINDING` | Golden child handle compared with independently constructed reference, followed by real proposal acceptance | Real and cross-process |
| `MIDRUN_ENV_SWAP` | Replacement-before-mutation/listener tests and hostile custom-feed tests | Real state-transition assertion |
| `SKIP_DIGEST_CHECK` | Different/absent provenance plus capsule-swap refusal | Real; includes cloned and raw/unregistered objects |
| `DIVERGENCE_TRUSTS_STORED_RESOLUTION` | Independently specified action/target/movement and forced divergence | Real; eliminates the prior self-comparison |

The contract also directly covers malformed bindings, extra `queries`, forged nominal values, equivalent-digest reconstruction acceptance, and different-digest rejection.

## Probe record

```text
sha256sum .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
a5335ad2472b16d33e66482cee322656d84a151e2309331635e603a84abad566

wc -l .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
891

git rev-parse HEAD
82ae85542f2b4103d02749b33413739bd641af66

sha256sum src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Baseline compilers:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0, zero diagnostics

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0, zero diagnostics
```

Both `tsBuildInfoFile` paths are under `/tmp`. The requested copy-based probe could not create its scratch directory:

```text
mktemp -d /tmp/s3b-builder-review.XXXXXX
mktemp: failed to create directory ...: Read-only file system
```

I therefore applied the same seven required-environment signature changes through an in-memory TypeScript compiler host, with `writeFile` disabled:

```text
tsconfig.app.json:
diagnostics=5 files=3
codes={"2322":1,"2345":1,"2379":2,"2741":1}

tsconfig.node.json:
diagnostics=221 files=59
codes={"2322":1,"2345":139,"2379":9,"2554":63,"2741":9}
```

This independently reproduces the design report’s `221 diagnostics / 59 files`.

Enforcement and discovery:

```text
sg scan --config sgconfig.yml src tools tests
exit 0, zero findings

npx vitest list --configLoader runner --filesOnly --json
82ae8554 worktree: 598
main 40f04e2c: 641

git diff --name-status 40f04e2c...82ae8554 -- tests
A tests/unit/vtt/offer-environment-board-sequence.test.ts
A tests/unit/vtt/offer-environment-identity.test.ts
```

Final blocking list: none.

**ACCEPT PLAN S3 BUILDER**

S3 BUILDER PLAN REVIEW DONE
