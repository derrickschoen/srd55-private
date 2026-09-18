## Findings

### B18-F1 — Arena canonical-bypass protection is outside the runnable test set

**Location:** `tests/unit/tools/ai-dm-arena.test.ts:741`; blocking setup assertion at **113**; consumer at `src/vtt/arena-legality.ts:128`.

The arena witness is sound: adjacent tokens give canonical distance **5**, while the supplied policy gives **30**; expected results are respectively `[]` and the explicit scimitar-range refusal.

However, its containing file fails during collection on the obsolete equal-binding assertion. **None of my 18 green suites loaded `arena-legality.ts`**. With the arena distance read replaced by a canonical read, those suites still passed **209/209**; the transform recorded **zero module loads**.

I separately replayed the existing witness in memory:

- Candidate: **1 passed**.
- Canonical-distance mutant: **1 failed**, expected:
  ```text
  ["combatant:arena-distance-goblin: target is outside scimitar reach/range"]
  ```
  received `[]`.

Plan **:553** defers the obsolete identity cases but explicitly requires running the named query/legality cases. It does not defer their protection until B16. The replay proves the witness works; it does not put that protection into the automated green set. A runnable arena-helper witness is required now, potentially in an existing permitted green spec.

### B18-F2 — Required runtime-forwarding assertion remains missing

**Locations:** `src/vtt/mcp/engine-server.ts:2378`, `src/vtt/blind-intent-resolver.ts:779`; tests at `tests/unit/vtt/blind-intent-resolver.test.ts:53` and `tests/unit/tools/engine-mcp-server.test.ts`.

The production forwarding is correct **by reading**:

- Entrypoint **:543** supplies `offerEnvironment.queries` to blind projection.
- Engine server **:1482–1484** derives queries and proposal resolver from its environment.
- Engine server **:2378** forwards that same environment object.
- Blind resolver **:779** uses the supplied environment.

But plan **:212** separately requires a runtime assertion of this wiring. The existing tests do not establish it:

- Rebuilding a fresh legacy environment inside the blind resolver: **12/12 passed**.
- Repeating that experiment with an independently configured revision-bound test environment: baseline **12/12**, mutant **12/12**.
- Forwarding an equal-binding rebuilt environment from MCP: **12/12 passed**, with the two filesystem-blocked stdio tests excluded.

The equal-binding survivor alone is not a behavioral defect—it retains the same queries—but it does not prove the requested same-object forwarding. Together with the blind replacement survivor and absent wiring assertion, this leaves the explicit runtime-witness requirement unfulfilled.

## Checks that passed

**Ran:** commit diff inspection, TypeScript-AST assertion comparison, formatting/residual checks and discovery.

- Exactly **five files**, **29 additions / 42 deletions**.
- Identity suite retains **3 tests**; assertions increase **6 → 9**. Every pre-existing assertion is **byte-identical**.
- Equal-binding fallback uses `createPureTurnProposalResolver(equalBindingEnvironment)`.
- Different-digest refusal uses independently configured `revisionBoundEnvironment('enabled')`; no forged environment.
- All listed B18 defaults, overloads, optional environment/query fields and MCP query injection are removed.
- B15/B16 files and scaffolds are unchanged.
- Added-line maxima: arena **27**, blind **117**, legendary **36**, MCP **58**, identity **97**; **zero over 120**.
- Requested residual grep: **empty**.
- Added-line fallback/cast screening: **no hits**.
- `git diff --check e5e5c70c 623aa639`: **exit 0**.
- Frozen plan SHA matches; discovery remains **643**; final worktree clean.

The shared legendary/speculative witness uses one typed port, overriding only `spaceDistance`, with independent expected outcomes. Its geometry gives canonical distances **5/25**, reversed by controlled **30/5**. The arena witness is separate, consistent with the plan’s “add an arena … case” wording.

## Commands and results I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Both **exit 0**.

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage final-query
```

**Exit 0**; **39 active fixtures passed**, staged groups **11 / 6 / 14**.

The final-query fixture mapping is:

| Fixture stem | Production symbol |
|---|---|
| scenario-fact-missing-queries | `evaluateScenarioFact` |
| proposal-facts-missing-queries | `extractProposalFactDependencies` |
| player-flip-missing-queries | `canPlayerFlipScenarioFact` |
| host-split-missing-queries | `computeHostSplitCandidates` |
| host-scenarios-missing-queries | `evaluateHostScenarios` |
| allocation-missing-environment | `compareTacticalAllocations` |
| arena-token-missing-queries | `arenaTokenPosition` |
| arena-combatant-missing-queries | `arenaCombatant` |
| arena-side-missing-queries | `arenaSameSide` |
| arena-target-missing-queries | `resolveArenaTarget` |
| arena-actions-missing-queries | `arenaMonsterActions` |
| arena-plan-missing-queries | `validateArenaPlan` |
| blind-input-missing-environment | `resolveBlindRoundIntents` |
| legendary-input-missing-queries | `provideLegendaryWindows` |

An in-memory default reintroduced on **`arenaCombatant`** made the same stage exit **1**:

```text
arena-combatant-missing-queries.ts:3: omitted real-symbol dependency compiled
```

Programmatic Vitest invocation used:

```js
startVitest('test', specs, {
  run: true, configLoader: 'runner', pool: 'threads', maxWorkers: 3
}, /* in-memory transform plugin */)
```

Baseline: **18 suites / 209 tests passed**—the three environment suites, capsule, query-port, materiality, speculative, legendary, projected movement, blind resolver, round session, offered paths, projections, board projection, tactical intel, context integrations, host integration and snippets.

Also ran:

```text
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts --configLoader runner --pool threads --maxWorkers 1 -t '^(?!.*(?:discovers, lists tools|negotiates the literal)).*$'
```

**12 passed / 2 skipped**, exit **0**.

Additional reproduced mutants:

| Mutant | Result |
|---|---|
| Legendary canonical bypass | **2 failed / 4 passed**; expected beta/controlled target, received alpha/canonical target |
| Blind current position → `null` | **2 failed / 10 passed**; `DESTINATION_REQUIRED` missing, received `NO_MATCHING_OPTION` |

All mutations were in memory. Production SHA-256 values were identical before/after:

```text
arena:     0332a72a7c710b76f793d96fc13c42898d670cd4af1791b651ee43e1e80bf764
blind:     580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
legendary: 8f83888a022a0783b396b2feb32b9dc6ce5fec4db26a128233b9a26fcaf1ba98
MCP:       a6b42f0155804ba6dd6f545b1f0cfdeae101e0bff85caad91537aec2c9bcdc65
```

**Read, not rerun:** supervisor’s broader suite results, allowed scaffold-red attribution and implementer report. No forbidden suites or filesystem mutations were attempted.

REJECT B18 — Findings: B18-F1 arena canonical-bypass witness is not runnable in the automated green set; B18-F2 required runtime environment-forwarding assertion is missing.
tokens used
911,287
## Findings

### B18-F1 — Arena canonical-bypass protection is outside the runnable test set

**Location:** `tests/unit/tools/ai-dm-arena.test.ts:741`; blocking setup assertion at **113**; consumer at `src/vtt/arena-legality.ts:128`.

The arena witness is sound: adjacent tokens give canonical distance **5**, while the supplied policy gives **30**; expected results are respectively `[]` and the explicit scimitar-range refusal.

However, its containing file fails during collection on the obsolete equal-binding assertion. **None of my 18 green suites loaded `arena-legality.ts`**. With the arena distance read replaced by a canonical read, those suites still passed **209/209**; the transform recorded **zero module loads**.

I separately replayed the existing witness in memory:

- Candidate: **1 passed**.
- Canonical-distance mutant: **1 failed**, expected:
  ```text
  ["combatant:arena-distance-goblin: target is outside scimitar reach/range"]
  ```
  received `[]`.

Plan **:553** defers the obsolete identity cases but explicitly requires running the named query/legality cases. It does not defer their protection until B16. The replay proves the witness works; it does not put that protection into the automated green set. A runnable arena-helper witness is required now, potentially in an existing permitted green spec.

### B18-F2 — Required runtime-forwarding assertion remains missing

**Locations:** `src/vtt/mcp/engine-server.ts:2378`, `src/vtt/blind-intent-resolver.ts:779`; tests at `tests/unit/vtt/blind-intent-resolver.test.ts:53` and `tests/unit/tools/engine-mcp-server.test.ts`.

The production forwarding is correct **by reading**:

- Entrypoint **:543** supplies `offerEnvironment.queries` to blind projection.
- Engine server **:1482–1484** derives queries and proposal resolver from its environment.
- Engine server **:2378** forwards that same environment object.
- Blind resolver **:779** uses the supplied environment.

But plan **:212** separately requires a runtime assertion of this wiring. The existing tests do not establish it:

- Rebuilding a fresh legacy environment inside the blind resolver: **12/12 passed**.
- Repeating that experiment with an independently configured revision-bound test environment: baseline **12/12**, mutant **12/12**.
- Forwarding an equal-binding rebuilt environment from MCP: **12/12 passed**, with the two filesystem-blocked stdio tests excluded.

The equal-binding survivor alone is not a behavioral defect—it retains the same queries—but it does not prove the requested same-object forwarding. Together with the blind replacement survivor and absent wiring assertion, this leaves the explicit runtime-witness requirement unfulfilled.

## Checks that passed

**Ran:** commit diff inspection, TypeScript-AST assertion comparison, formatting/residual checks and discovery.

- Exactly **five files**, **29 additions / 42 deletions**.
- Identity suite retains **3 tests**; assertions increase **6 → 9**. Every pre-existing assertion is **byte-identical**.
- Equal-binding fallback uses `createPureTurnProposalResolver(equalBindingEnvironment)`.
- Different-digest refusal uses independently configured `revisionBoundEnvironment('enabled')`; no forged environment.
- All listed B18 defaults, overloads, optional environment/query fields and MCP query injection are removed.
- B15/B16 files and scaffolds are unchanged.
- Added-line maxima: arena **27**, blind **117**, legendary **36**, MCP **58**, identity **97**; **zero over 120**.
- Requested residual grep: **empty**.
- Added-line fallback/cast screening: **no hits**.
- `git diff --check e5e5c70c 623aa639`: **exit 0**.
- Frozen plan SHA matches; discovery remains **643**; final worktree clean.

The shared legendary/speculative witness uses one typed port, overriding only `spaceDistance`, with independent expected outcomes. Its geometry gives canonical distances **5/25**, reversed by controlled **30/5**. The arena witness is separate, consistent with the plan’s “add an arena … case” wording.

## Commands and results I ran

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Both **exit 0**.

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage final-query
```

**Exit 0**; **39 active fixtures passed**, staged groups **11 / 6 / 14**.

The final-query fixture mapping is:

| Fixture stem | Production symbol |
|---|---|
| scenario-fact-missing-queries | `evaluateScenarioFact` |
| proposal-facts-missing-queries | `extractProposalFactDependencies` |
| player-flip-missing-queries | `canPlayerFlipScenarioFact` |
| host-split-missing-queries | `computeHostSplitCandidates` |
| host-scenarios-missing-queries | `evaluateHostScenarios` |
| allocation-missing-environment | `compareTacticalAllocations` |
| arena-token-missing-queries | `arenaTokenPosition` |
| arena-combatant-missing-queries | `arenaCombatant` |
| arena-side-missing-queries | `arenaSameSide` |
| arena-target-missing-queries | `resolveArenaTarget` |
| arena-actions-missing-queries | `arenaMonsterActions` |
| arena-plan-missing-queries | `validateArenaPlan` |
| blind-input-missing-environment | `resolveBlindRoundIntents` |
| legendary-input-missing-queries | `provideLegendaryWindows` |

An in-memory default reintroduced on **`arenaCombatant`** made the same stage exit **1**:

```text
arena-combatant-missing-queries.ts:3: omitted real-symbol dependency compiled
```

Programmatic Vitest invocation used:

```js
startVitest('test', specs, {
  run: true, configLoader: 'runner', pool: 'threads', maxWorkers: 3
}, /* in-memory transform plugin */)
```

Baseline: **18 suites / 209 tests passed**—the three environment suites, capsule, query-port, materiality, speculative, legendary, projected movement, blind resolver, round session, offered paths, projections, board projection, tactical intel, context integrations, host integration and snippets.

Also ran:

```text
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts --configLoader runner --pool threads --maxWorkers 1 -t '^(?!.*(?:discovers, lists tools|negotiates the literal)).*$'
```

**12 passed / 2 skipped**, exit **0**.

Additional reproduced mutants:

| Mutant | Result |
|---|---|
| Legendary canonical bypass | **2 failed / 4 passed**; expected beta/controlled target, received alpha/canonical target |
| Blind current position → `null` | **2 failed / 10 passed**; `DESTINATION_REQUIRED` missing, received `NO_MATCHING_OPTION` |

All mutations were in memory. Production SHA-256 values were identical before/after:

```text
arena:     0332a72a7c710b76f793d96fc13c42898d670cd4af1791b651ee43e1e80bf764
blind:     580dffd5a08daf2608821623bf420056f2e441ec98abe7af55a8dad479860fcb
legendary: 8f83888a022a0783b396b2feb32b9dc6ce5fec4db26a128233b9a26fcaf1ba98
MCP:       a6b42f0155804ba6dd6f545b1f0cfdeae101e0bff85caad91537aec2c9bcdc65
```

**Read, not rerun:** supervisor’s broader suite results, allowed scaffold-red attribution and implementer report. No forbidden suites or filesystem mutations were attempted.

REJECT B18 — Findings: B18-F1 arena canonical-bypass witness is not runnable in the automated green set; B18-F2 required runtime environment-forwarding assertion is missing.
