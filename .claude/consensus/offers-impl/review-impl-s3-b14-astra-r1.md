Reviewed **198d223f against 482f3652**. No B14 implementation finding.

### Scope and contract

**Ran:** `git diff --name-only`, `git diff --shortstat`, `git diff --check 482f3652 198d223f`, and a Python comparison using `git show`.

- Exactly **11 files, 317 insertions, 133 deletions**.
- Frozen plan SHA matches `fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`.
- All **10 scaffold files are byte-identical** to B13.
- No tests deleted. `offer-environment.test.ts`: **11 → 16 tests; 37 → 47 `expect(` expressions**. Existing changes are the four canonical-query reference replacements.
- Conversation changes are **only 18 clone removals**, in six option/primary/fallback triplets, as D617.27 permits.
- **Zero added lines over 120 columns; maximum 112.** Diff whitespace check exited **0**.

**Read:** B14, digest-provenance requirements, D617.27, implementer reports, and affected implementations.

The contracted resolver, registry/allocation, capsule, speculative, materiality, opportunity-cost and team-scoring surfaces now require their environment/query arguments. Blind provider types use the branded environment.

Required negatives are present: absent registration, different digest, mutable-feed replacement, hostile custom feed, existing fallback/board controls, and architecture checks for contracted signatures. Equal-binding acceptance is intentional; obsolete scaffold assertions belong to **B16**.

The temporary blind fallback remains at `blind-intent-resolver.ts:784–788`, assigned to **B18**. `reconstructLauncherOfferEnvironment` remains at `entrypoint.ts:1079`, assigned to **B15**.

### Provenance paths

| Path traced by reading | Result |
|---|---|
| `intent-resolver.ts:71–91, 532–544` | Freshly generated option objects receive digest registration; absent/different registration is refused. |
| Capsule option clones, `engine-state-capsule.ts:722,794` | Wire projections lose registration intentionally; they are not directly resolved. |
| Tactical projection re-selection, `engine-server.ts:893` | IDs select freshly registered options under the application’s environment. |
| Envelope cloning, `engine-envelopes.ts:189`, then `engine-server.ts:1507–1558` | Turn, round and adjustment submissions replace cloned options with registered objects under the bound environment and revision. |
| Entrypoint callback cloning/JSON storage, then conversation authorization | Detached records are re-authorized before execution. The six amended conversation sites retain those authorized option references. |
| Resolver selection, allocation, round execution, materiality and scoring | Filters/finds retain references, or options are regenerated through the bound generator. Shallow envelope/entry spreads retain option identity. |

Re-selection is **fresh authorization under the current environment**, not acceptance of the incoming object’s provenance. I found no path selecting an option registered under another digest. Launch/current/snapshot/read/listener checks also constrain the application feed.

**Ran additionally:** an in-memory test through real MCP submission and conversation `authorizedMechanics`, including a serialized envelope. Baseline **1 passed**; the selected option resolved under its bound environment and was refused under the other digest.

Added-line screening found no branded casts, fabricated branded environments, query-union workaround or new construction fallback. The added blind `?? buildOfferEnvironment(...)` retains the explicitly deferred fallback. Other added conditionals handle nullable snapshots/fallback options.

Residual references are legitimate branded imports/binding codec types, the canonical port’s defining export, and the deferred blind fallback—not residual structural imports or old resolver factories.

### Verification I ran

During review, external mutations temporarily appeared in the shared worktree. Compiler/test runs affected by those mutations used **committed-source in-memory overlays**; I made no filesystem edits.

| Command or programmatic invocation | My result |
|---|---|
| TypeScript `_tsc.js`, arguments `-p tsconfig.app.json --noEmit --pretty false` | **Exit 0** |
| TypeScript `_tsc.js`, arguments `-p tsconfig.node.json --noEmit --pretty false` | **Exit 0** |
| `scripts/check-offer-environment-architecture.mjs --self-test --stage resolver`, invoked through Node with committed-source overlay | **Exit 0; 39 active fixtures passed**, groups **11 / 6 / 14** |
| `node scripts/check-command-outcomes.mjs` | **Exit 0**, architecture checked **1,621 TypeScript files** |
| `createVitest('test',{configLoader:'runner'}).globTestSpecifications()` | **643 files** |
| `startVitest('test', specs, {run:true,configLoader:'runner',pool:'threads',maxWorkers:4}, overlay)` | **14 suites, 150 tests passed** |

The 14 suites were the three environment suites, capsule, query-port, materiality, speculative, legendary, projected-movement, blind-resolver, round-session, offered-paths, projections and board-projection.

Also ran:

```text
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts --configLoader runner --pool threads --maxWorkers 1
```

Result: **12 passed, 2 failed**. Both failures were child-server startup failures. Running that child command directly established the cause:

```text
node node_modules/vite-node/vite-node.mjs tools/engine-mcp-server.ts tests/fixtures/arena-basis/seed-3943001.json </dev/null
```

It exited **1**, with **EROFS writing `node_modules/.vite-temp/vite.config.ts.timestamp-…mjs`**, before application startup. This is a sandbox limitation.

### In-memory mutants

Each mutant was applied through a Vite transform; production files were not changed.

| Mutant | My result |
|---|---|
| `SKIP_DIGEST_CHECK` | **2 failed**: expected mismatch refusal, received `valid:true`. |
| `MIDRUN_ENV_SWAP` | **1 failed**: expected replacement-guard error, received downstream application-guard error. |
| Skip custom-feed digest check | **1 failed**: “expected function to throw an error, but it didn't”. |
| Restore conversation option clones | **1 failed** in the real authorization-helper probe: expected `valid:true`, received `valid:false`. |
| MCP re-association returns incoming cloned option | **1 failed**, same validity mismatch. |
| MCP re-association registers under legacy digest | **1 failed**, same validity mismatch. |
| Conversation reuses detached incoming option | **1 failed**, same validity mismatch. |

**Seven killed; zero survivors.** The conversation clone mutation was reproduced through the real helper, **not the filesystem-dependent legacy-invariance suite**.

Production SHA-256 values printed before/after the relevant runs matched committed bytes:

```text
intent-resolver.ts
68148545b7c3b0f8e1ec15680253c41bb7ce0e967a30df3f107d6f2d063db4b2
engine-server.ts
c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544
ai-dm-conversation.ts
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d
```

Conversation’s disk hash temporarily differed during external mutation; the committed overlay remained fixed. Final disk hashes matched these values and `git status --short` was empty.

**Read-only external evidence:** the supervisor’s **22 suites / 246 tests**, legacy-invariance result and attribution of scaffold failures remain supervisor evidence, not my runs. I did not retry temp-directory suites.

ACCEPT B14
tokens used
797,328
Reviewed **198d223f against 482f3652**. No B14 implementation finding.

### Scope and contract

**Ran:** `git diff --name-only`, `git diff --shortstat`, `git diff --check 482f3652 198d223f`, and a Python comparison using `git show`.

- Exactly **11 files, 317 insertions, 133 deletions**.
- Frozen plan SHA matches `fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4`.
- All **10 scaffold files are byte-identical** to B13.
- No tests deleted. `offer-environment.test.ts`: **11 → 16 tests; 37 → 47 `expect(` expressions**. Existing changes are the four canonical-query reference replacements.
- Conversation changes are **only 18 clone removals**, in six option/primary/fallback triplets, as D617.27 permits.
- **Zero added lines over 120 columns; maximum 112.** Diff whitespace check exited **0**.

**Read:** B14, digest-provenance requirements, D617.27, implementer reports, and affected implementations.

The contracted resolver, registry/allocation, capsule, speculative, materiality, opportunity-cost and team-scoring surfaces now require their environment/query arguments. Blind provider types use the branded environment.

Required negatives are present: absent registration, different digest, mutable-feed replacement, hostile custom feed, existing fallback/board controls, and architecture checks for contracted signatures. Equal-binding acceptance is intentional; obsolete scaffold assertions belong to **B16**.

The temporary blind fallback remains at `blind-intent-resolver.ts:784–788`, assigned to **B18**. `reconstructLauncherOfferEnvironment` remains at `entrypoint.ts:1079`, assigned to **B15**.

### Provenance paths

| Path traced by reading | Result |
|---|---|
| `intent-resolver.ts:71–91, 532–544` | Freshly generated option objects receive digest registration; absent/different registration is refused. |
| Capsule option clones, `engine-state-capsule.ts:722,794` | Wire projections lose registration intentionally; they are not directly resolved. |
| Tactical projection re-selection, `engine-server.ts:893` | IDs select freshly registered options under the application’s environment. |
| Envelope cloning, `engine-envelopes.ts:189`, then `engine-server.ts:1507–1558` | Turn, round and adjustment submissions replace cloned options with registered objects under the bound environment and revision. |
| Entrypoint callback cloning/JSON storage, then conversation authorization | Detached records are re-authorized before execution. The six amended conversation sites retain those authorized option references. |
| Resolver selection, allocation, round execution, materiality and scoring | Filters/finds retain references, or options are regenerated through the bound generator. Shallow envelope/entry spreads retain option identity. |

Re-selection is **fresh authorization under the current environment**, not acceptance of the incoming object’s provenance. I found no path selecting an option registered under another digest. Launch/current/snapshot/read/listener checks also constrain the application feed.

**Ran additionally:** an in-memory test through real MCP submission and conversation `authorizedMechanics`, including a serialized envelope. Baseline **1 passed**; the selected option resolved under its bound environment and was refused under the other digest.

Added-line screening found no branded casts, fabricated branded environments, query-union workaround or new construction fallback. The added blind `?? buildOfferEnvironment(...)` retains the explicitly deferred fallback. Other added conditionals handle nullable snapshots/fallback options.

Residual references are legitimate branded imports/binding codec types, the canonical port’s defining export, and the deferred blind fallback—not residual structural imports or old resolver factories.

### Verification I ran

During review, external mutations temporarily appeared in the shared worktree. Compiler/test runs affected by those mutations used **committed-source in-memory overlays**; I made no filesystem edits.

| Command or programmatic invocation | My result |
|---|---|
| TypeScript `_tsc.js`, arguments `-p tsconfig.app.json --noEmit --pretty false` | **Exit 0** |
| TypeScript `_tsc.js`, arguments `-p tsconfig.node.json --noEmit --pretty false` | **Exit 0** |
| `scripts/check-offer-environment-architecture.mjs --self-test --stage resolver`, invoked through Node with committed-source overlay | **Exit 0; 39 active fixtures passed**, groups **11 / 6 / 14** |
| `node scripts/check-command-outcomes.mjs` | **Exit 0**, architecture checked **1,621 TypeScript files** |
| `createVitest('test',{configLoader:'runner'}).globTestSpecifications()` | **643 files** |
| `startVitest('test', specs, {run:true,configLoader:'runner',pool:'threads',maxWorkers:4}, overlay)` | **14 suites, 150 tests passed** |

The 14 suites were the three environment suites, capsule, query-port, materiality, speculative, legendary, projected-movement, blind-resolver, round-session, offered-paths, projections and board-projection.

Also ran:

```text
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts --configLoader runner --pool threads --maxWorkers 1
```

Result: **12 passed, 2 failed**. Both failures were child-server startup failures. Running that child command directly established the cause:

```text
node node_modules/vite-node/vite-node.mjs tools/engine-mcp-server.ts tests/fixtures/arena-basis/seed-3943001.json </dev/null
```

It exited **1**, with **EROFS writing `node_modules/.vite-temp/vite.config.ts.timestamp-…mjs`**, before application startup. This is a sandbox limitation.

### In-memory mutants

Each mutant was applied through a Vite transform; production files were not changed.

| Mutant | My result |
|---|---|
| `SKIP_DIGEST_CHECK` | **2 failed**: expected mismatch refusal, received `valid:true`. |
| `MIDRUN_ENV_SWAP` | **1 failed**: expected replacement-guard error, received downstream application-guard error. |
| Skip custom-feed digest check | **1 failed**: “expected function to throw an error, but it didn't”. |
| Restore conversation option clones | **1 failed** in the real authorization-helper probe: expected `valid:true`, received `valid:false`. |
| MCP re-association returns incoming cloned option | **1 failed**, same validity mismatch. |
| MCP re-association registers under legacy digest | **1 failed**, same validity mismatch. |
| Conversation reuses detached incoming option | **1 failed**, same validity mismatch. |

**Seven killed; zero survivors.** The conversation clone mutation was reproduced through the real helper, **not the filesystem-dependent legacy-invariance suite**.

Production SHA-256 values printed before/after the relevant runs matched committed bytes:

```text
intent-resolver.ts
68148545b7c3b0f8e1ec15680253c41bb7ce0e967a30df3f107d6f2d063db4b2
engine-server.ts
c40292df285a44c0dc977d4b605a5c98eb6b6625e04672f8c2b5b6367dc45544
ai-dm-conversation.ts
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d
```

Conversation’s disk hash temporarily differed during external mutation; the committed overlay remained fixed. Final disk hashes matched these values and `git status --short` was empty.

**Read-only external evidence:** the supervisor’s **22 suites / 246 tests**, legacy-invariance result and attribution of scaffold failures remain supervisor evidence, not my runs. I did not retry temp-directory suites.

ACCEPT B14
