**No blocking B13 findings.** One divergence-test mutant survives; the associated oracle work remains assigned to B16.

## Scope and assertion preservation

I ran:

```text
git rev-parse HEAD
git diff --stat 6f650d7a 482f3652
git diff 6f650d7a 482f3652
git diff --check
git diff --check 6f650d7a 482f3652
git status --short
```

Confirmed HEAD **482f365281aaadfdca22585a565891eabd11ceee**, exactly the **nine D617.25 files**, **130 additions / 112 deletions**, no deleted tests, and a clean worktree. Both whitespace checks exited **0**. The frozen plan hash matches.

My AST comparison of `offer-environment-board-sequence.test.ts` found **5 → 12 assertions**, with all **five pre-existing assertion expressions byte-identical**.

Added-line maxima, in manifest order: **80, 80, 80, 80, 113, 80, 51, 115**, and **112** for the amended test. No added line exceeds 120 columns or introduces multiple statements.

## Independent digest derivation

I reproduced the pins using **Python `json.dumps(sort_keys=True, separators=(',', ':'))` and `hashlib.sha256`**, with manually authored bodies. No builder or production hashing function was executed.

The revision body contains:

- Format `engine-option-environment-v1`, mode `revision_bound`.
- Policy: only `helpAttack` enabled.
- Catalog: `party-threat-catalog-v1`, `unrepresented`, empty entries.
- Independently calculated nested policy/catalog digests.

My results:

```text
Enabled-help policy:
e2a1f80bdb6afc0441f53951f2d1a63c5c6642dd2c1accdc2c223950ff4b087b

Unrepresented catalog:
0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57

Revision environment:
e93555826672102b37c9bcb16d53f743cffa90134c037ec015d5828e3ea1d3a2

Legacy environment:
fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b
```

Both hard-coded environment pins are independently reproducible and satisfy the plan’s independence requirement.

## B13 completeness

| Area | Verified |
|---|---|
| Host | Required branded environment/options; no environment fallback. Snapshot forwards the stored environment and checks the returned digest at `dm-encounter-host.ts:571–574`. |
| Human/DM projections | Required environments; module-level legacy default removed; `projectDmBoard` uses `input.offerEnvironment` at `encounter-projections.ts:484`. |
| Offered paths | Singleton and environment defaults removed. Both public APIs require the environment. |
| Round session | Constructor environment required; initializer removed. |
| MCP | Launcher binding/runtime environment required; temporary handler overload removed; exact `(state, environment, maximumToolResultBytes?)` signature retained. Request/server/line wrappers require and forward their dependencies. |
| Launcher/raw fixture | Claimed launchers undergo strict decoding; genuine fixture branch explicitly selects legacy at `entrypoint.ts:1273`. |
| Conversation/arena | Required configuration fields; CLI roots explicitly select legacy; arena forwards configuration unchanged. Conversation builds from required configuration and threads the environment through planning, rebasing, catalogs, speculation and divergence. |
| Reconstruction | Snapshot sites rebuild from their capsule bindings. `reconstructLauncherOfferEnvironment` remains at `entrypoint.ts:1079`, correctly deferred until B15. |

**Batch boundary decisions:**

- The paths adapter at [offered-option-paths.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offered-option-paths.ts:157) retains typed refusal translation. It does **not** compare digests itself. §3.1 explicitly preserves this translation; B14:530 assigns digest provenance to the resolver.
- B14/B18 resolver/query fallbacks and B15 reconstruction-wrapper removal were not prematurely removed.
- Divergence now requires and uses its environment at [ai-dm-conversation.ts:4024](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:4024).

Added-line searches found **zero** `??`, optional-property markers, unsafe environment casts, or forged branded objects. No new environment default parameter exists. The handler’s conditional concerns its optional byte budget. Existing actor/revision defaults remain explicitly permitted by §3.1.

Residual searches found **zero canonical-port references, ambient resolver references, old runtime factories, or structural environment imports** across the nine files.

## Required-surface fixtures

I read all eleven real-symbol fixtures and their generators:

| Fixture prefix (`-missing-environment.ts`) | Production symbol |
|---|---|
| `round-session` | `EngineRoundSession` constructor |
| `dm-host` | `DmEncounterHost` options |
| `human-options` | `projectHumanEngineOptions` |
| `dm-projector` | `projectDmBoard` input |
| `offered-actors` | `offeredOptionActorsForState` |
| `offered-paths` | `offeredOptionPaths` |
| `mcp-runtime` | `createEngineMcpRuntime` options |
| `mcp-handler` | `createEngineMcpHandler` |
| `mcp-request` | `handleMcpRequest` |
| `mcp-server` | `runEngineMcpServer` |
| `mcp-lines` | `runEngineMcpLines` |

Each imports the actual production symbol and pairs its omitted dependency with a `SUPPLIED` call using `Parameters` or `ConstructorParameters`. The checker rejects diagnostics on the supplied call.

I ran:

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage required-surfaces
```

**Exit 0.**

My independent mutant restored a legacy default on **`projectHumanEngineOptions`**, using a `ts.sys.readFile` in-memory overlay. Running the same stage produced:

```text
human-options-missing-environment.ts:3: omitted real-symbol dependency compiled
exit 1
overlayReads 16
```

Production SHA before/after:

```text
7c7f50242454ad19291ba87a1c2129316374dabd055c056b77a5c25f24ea75e9
```

## Behaviour mutants I reproduced

Commands used `node --input-type=module` with `startVitest`, `configLoader:'runner'`, `pool:'threads'`, `maxWorkers:1`, named-test selection, and an `enforce:'pre'` in-memory transform. Each mutation applied once; production files remained unchanged.

| Mutation | Actual killing result |
|---|---|
| Host digest comparison inverted | `engine-host-integration.test.ts:49`: **“DM board projection offer environment digest does not match the host environment.”** **1 failed / 1 skipped**, exit **1** |
| MCP capsule uses fresh legacy binding | `offer-environment.test.ts:226`: **“Engine MCP application offer environment does not match its launch capsule.”** **1 failed / 10 skipped**, exit **1** |
| Round fallback resolves the primary option | `engine-round-session.test.ts:1013`: expected `appliedBranch:"fallback"`; received `"dodge"` and `degraded_to_dodge`. **1 failed / 20 skipped**, exit **1** |
| Whole DM projector rebuilds legacy | Board-sequence **:66** expected `e9355582…`; received `fb1c39f0…`. **1 failed**, exit **1** |
| **New:** swallow launcher-classification errors and invoke fixture decoding | `engine-mcp-boundary.test.ts:153`: **“expected function to throw an error, but it didn't.”** **1 failed / 7 skipped**, exit **1** |
| **New:** divergence compares against the supplied entry itself | `ai-dm-conversation.test.ts:2138`: expected the geometry-divergence diagnostic; received `[]`. **1 failed / 107 skipped**, exit **1** |
| **New:** divergence resolver uses a fresh legacy environment | **Survived: 1 passed / 107 skipped**, exit **0** |

The last survivor exposes limited binding discrimination in the existing Dodge fixture. B13’s production forwarding is correct; the test’s independent-oracle work is explicitly assigned to **B16:601 and §6**. Carry this survivor into that batch.

The pristine host control and pristine targeted divergence control each passed **1/1 selected tests**. My initial host selection used the wrong suite and skipped all seven tests; I discarded that run and reproduced the failure in `engine-host-integration.test.ts`.

Printed production SHAs were identical before/after every mutation:

```text
host         9dca6c8bbd9f9c2f493a6cc43e580cd59640328692242419f4b51893554983b4
projector    0bbf21936caa16d89b8abc0c8c18c8479b607f274937042ef51c7c84ffa8cfec
round        48039d52e216b8016ef04aff59abb769c06f66451d9d304207e2c09ef11417fb
entrypoint   9826cea6be1e55a4fce87597d126a32c9fae9f451cda8558ed4d4bb5cf67a650
conversation b7a94b6d7f15573d8b379063f84d0d5a1aa0a8caa52c5761b5b1ef2e5cb91ed4
```

## Gates and suite results

I ran:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-command-outcomes.mjs
```

All exited **0**. Both compilers produced **zero diagnostics**. Architecture output: **39 active fixtures passed; 1,621 TypeScript files checked**.

My suite command was:

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads --reporter=json tests/integration/vtt/dm-encounter-host-live-path.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/engine-round-session.test.ts tests/unit/vtt/offered-option-paths.test.ts tests/unit/tools/engine-mcp-boundary.test.ts tests/unit/tools/engine-mcp-handler.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

| Suite | Passed / total |
|---|---:|
| host-live-path | 7/7 |
| board-projection | 12/12 |
| projections | 11/11 |
| round-session | 21/21 |
| paths | 4/4 |
| MCP boundary | 6/8 |
| MCP handler | 130/130 |
| MCP server | 12/14 |
| Environment suites | 15/15 |

Total: **218 passed / 4 failed**, exit **1**. The four child-process tests closed before responding; boundary output included `node:internal/fs/promises:637`. I did not establish their exact underlying cause or retry them.

Discovery:

```bash
node node_modules/vitest/vitest.mjs list --configLoader runner --filesOnly --json | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))'
```

Output **643**, exit **0**.

**Read/supplied evidence:** I read D617.25 and both implementation reports. The supervisor’s **20 files / 464 tests green**, including arena, full conversation, golden and M-3, is supplied evidence—not my result. I did not run those full temp-directory suites.

ACCEPT B13
tokens used
308,318
**No blocking B13 findings.** One divergence-test mutant survives; the associated oracle work remains assigned to B16.

## Scope and assertion preservation

I ran:

```text
git rev-parse HEAD
git diff --stat 6f650d7a 482f3652
git diff 6f650d7a 482f3652
git diff --check
git diff --check 6f650d7a 482f3652
git status --short
```

Confirmed HEAD **482f365281aaadfdca22585a565891eabd11ceee**, exactly the **nine D617.25 files**, **130 additions / 112 deletions**, no deleted tests, and a clean worktree. Both whitespace checks exited **0**. The frozen plan hash matches.

My AST comparison of `offer-environment-board-sequence.test.ts` found **5 → 12 assertions**, with all **five pre-existing assertion expressions byte-identical**.

Added-line maxima, in manifest order: **80, 80, 80, 80, 113, 80, 51, 115**, and **112** for the amended test. No added line exceeds 120 columns or introduces multiple statements.

## Independent digest derivation

I reproduced the pins using **Python `json.dumps(sort_keys=True, separators=(',', ':'))` and `hashlib.sha256`**, with manually authored bodies. No builder or production hashing function was executed.

The revision body contains:

- Format `engine-option-environment-v1`, mode `revision_bound`.
- Policy: only `helpAttack` enabled.
- Catalog: `party-threat-catalog-v1`, `unrepresented`, empty entries.
- Independently calculated nested policy/catalog digests.

My results:

```text
Enabled-help policy:
e2a1f80bdb6afc0441f53951f2d1a63c5c6642dd2c1accdc2c223950ff4b087b

Unrepresented catalog:
0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57

Revision environment:
e93555826672102b37c9bcb16d53f743cffa90134c037ec015d5828e3ea1d3a2

Legacy environment:
fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b
```

Both hard-coded environment pins are independently reproducible and satisfy the plan’s independence requirement.

## B13 completeness

| Area | Verified |
|---|---|
| Host | Required branded environment/options; no environment fallback. Snapshot forwards the stored environment and checks the returned digest at `dm-encounter-host.ts:571–574`. |
| Human/DM projections | Required environments; module-level legacy default removed; `projectDmBoard` uses `input.offerEnvironment` at `encounter-projections.ts:484`. |
| Offered paths | Singleton and environment defaults removed. Both public APIs require the environment. |
| Round session | Constructor environment required; initializer removed. |
| MCP | Launcher binding/runtime environment required; temporary handler overload removed; exact `(state, environment, maximumToolResultBytes?)` signature retained. Request/server/line wrappers require and forward their dependencies. |
| Launcher/raw fixture | Claimed launchers undergo strict decoding; genuine fixture branch explicitly selects legacy at `entrypoint.ts:1273`. |
| Conversation/arena | Required configuration fields; CLI roots explicitly select legacy; arena forwards configuration unchanged. Conversation builds from required configuration and threads the environment through planning, rebasing, catalogs, speculation and divergence. |
| Reconstruction | Snapshot sites rebuild from their capsule bindings. `reconstructLauncherOfferEnvironment` remains at `entrypoint.ts:1079`, correctly deferred until B15. |

**Batch boundary decisions:**

- The paths adapter at [offered-option-paths.ts:157](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offered-option-paths.ts:157) retains typed refusal translation. It does **not** compare digests itself. §3.1 explicitly preserves this translation; B14:530 assigns digest provenance to the resolver.
- B14/B18 resolver/query fallbacks and B15 reconstruction-wrapper removal were not prematurely removed.
- Divergence now requires and uses its environment at [ai-dm-conversation.ts:4024](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:4024).

Added-line searches found **zero** `??`, optional-property markers, unsafe environment casts, or forged branded objects. No new environment default parameter exists. The handler’s conditional concerns its optional byte budget. Existing actor/revision defaults remain explicitly permitted by §3.1.

Residual searches found **zero canonical-port references, ambient resolver references, old runtime factories, or structural environment imports** across the nine files.

## Required-surface fixtures

I read all eleven real-symbol fixtures and their generators:

| Fixture prefix (`-missing-environment.ts`) | Production symbol |
|---|---|
| `round-session` | `EngineRoundSession` constructor |
| `dm-host` | `DmEncounterHost` options |
| `human-options` | `projectHumanEngineOptions` |
| `dm-projector` | `projectDmBoard` input |
| `offered-actors` | `offeredOptionActorsForState` |
| `offered-paths` | `offeredOptionPaths` |
| `mcp-runtime` | `createEngineMcpRuntime` options |
| `mcp-handler` | `createEngineMcpHandler` |
| `mcp-request` | `handleMcpRequest` |
| `mcp-server` | `runEngineMcpServer` |
| `mcp-lines` | `runEngineMcpLines` |

Each imports the actual production symbol and pairs its omitted dependency with a `SUPPLIED` call using `Parameters` or `ConstructorParameters`. The checker rejects diagnostics on the supplied call.

I ran:

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage required-surfaces
```

**Exit 0.**

My independent mutant restored a legacy default on **`projectHumanEngineOptions`**, using a `ts.sys.readFile` in-memory overlay. Running the same stage produced:

```text
human-options-missing-environment.ts:3: omitted real-symbol dependency compiled
exit 1
overlayReads 16
```

Production SHA before/after:

```text
7c7f50242454ad19291ba87a1c2129316374dabd055c056b77a5c25f24ea75e9
```

## Behaviour mutants I reproduced

Commands used `node --input-type=module` with `startVitest`, `configLoader:'runner'`, `pool:'threads'`, `maxWorkers:1`, named-test selection, and an `enforce:'pre'` in-memory transform. Each mutation applied once; production files remained unchanged.

| Mutation | Actual killing result |
|---|---|
| Host digest comparison inverted | `engine-host-integration.test.ts:49`: **“DM board projection offer environment digest does not match the host environment.”** **1 failed / 1 skipped**, exit **1** |
| MCP capsule uses fresh legacy binding | `offer-environment.test.ts:226`: **“Engine MCP application offer environment does not match its launch capsule.”** **1 failed / 10 skipped**, exit **1** |
| Round fallback resolves the primary option | `engine-round-session.test.ts:1013`: expected `appliedBranch:"fallback"`; received `"dodge"` and `degraded_to_dodge`. **1 failed / 20 skipped**, exit **1** |
| Whole DM projector rebuilds legacy | Board-sequence **:66** expected `e9355582…`; received `fb1c39f0…`. **1 failed**, exit **1** |
| **New:** swallow launcher-classification errors and invoke fixture decoding | `engine-mcp-boundary.test.ts:153`: **“expected function to throw an error, but it didn't.”** **1 failed / 7 skipped**, exit **1** |
| **New:** divergence compares against the supplied entry itself | `ai-dm-conversation.test.ts:2138`: expected the geometry-divergence diagnostic; received `[]`. **1 failed / 107 skipped**, exit **1** |
| **New:** divergence resolver uses a fresh legacy environment | **Survived: 1 passed / 107 skipped**, exit **0** |

The last survivor exposes limited binding discrimination in the existing Dodge fixture. B13’s production forwarding is correct; the test’s independent-oracle work is explicitly assigned to **B16:601 and §6**. Carry this survivor into that batch.

The pristine host control and pristine targeted divergence control each passed **1/1 selected tests**. My initial host selection used the wrong suite and skipped all seven tests; I discarded that run and reproduced the failure in `engine-host-integration.test.ts`.

Printed production SHAs were identical before/after every mutation:

```text
host         9dca6c8bbd9f9c2f493a6cc43e580cd59640328692242419f4b51893554983b4
projector    0bbf21936caa16d89b8abc0c8c18c8479b607f274937042ef51c7c84ffa8cfec
round        48039d52e216b8016ef04aff59abb769c06f66451d9d304207e2c09ef11417fb
entrypoint   9826cea6be1e55a4fce87597d126a32c9fae9f451cda8558ed4d4bb5cf67a650
conversation b7a94b6d7f15573d8b379063f84d0d5a1aa0a8caa52c5761b5b1ef2e5cb91ed4
```

## Gates and suite results

I ran:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
node scripts/check-command-outcomes.mjs
```

All exited **0**. Both compilers produced **zero diagnostics**. Architecture output: **39 active fixtures passed; 1,621 TypeScript files checked**.

My suite command was:

```bash
node node_modules/vitest/vitest.mjs run --configLoader runner --pool threads --reporter=json tests/integration/vtt/dm-encounter-host-live-path.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/engine-round-session.test.ts tests/unit/vtt/offered-option-paths.test.ts tests/unit/tools/engine-mcp-boundary.test.ts tests/unit/tools/engine-mcp-handler.test.ts tests/unit/tools/engine-mcp-server.test.ts tests/unit/vtt/offer-environment.test.ts tests/unit/vtt/offer-environment-identity.test.ts tests/unit/vtt/offer-environment-board-sequence.test.ts
```

| Suite | Passed / total |
|---|---:|
| host-live-path | 7/7 |
| board-projection | 12/12 |
| projections | 11/11 |
| round-session | 21/21 |
| paths | 4/4 |
| MCP boundary | 6/8 |
| MCP handler | 130/130 |
| MCP server | 12/14 |
| Environment suites | 15/15 |

Total: **218 passed / 4 failed**, exit **1**. The four child-process tests closed before responding; boundary output included `node:internal/fs/promises:637`. I did not establish their exact underlying cause or retry them.

Discovery:

```bash
node node_modules/vitest/vitest.mjs list --configLoader runner --filesOnly --json | python3 -c 'import sys,json; print(len(json.load(sys.stdin)))'
```

Output **643**, exit **0**.

**Read/supplied evidence:** I read D617.25 and both implementation reports. The supervisor’s **20 files / 464 tests green**, including arena, full conversation, golden and M-3, is supplied evidence—not my result. I did not run those full temp-directory suites.

ACCEPT B13
