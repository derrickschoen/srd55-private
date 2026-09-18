# OFFERS B16 — astra review r1 (medium, resume 01a0a5af…, exit 0)

## Findings

No B16 findings: **0 P1, 0 P2, 0 P3**. Verification limits are identified below.

### Scope and assertion preservation

**Ran:** `git diff cc8b057f 80411ca2`, TypeScript-AST test/assertion inventory, literal-pin comparison, and `git diff --check cc8b057f 80411ca2`.

- Exactly the **10 plan-listed test files**, **102 additions / 510 deletions**, **0 production files**.
- Frozen-plan SHA matches.
- Actual retirement count is **seven identity tests total**: six runtime-consumer cases plus the stdio-shaped variant. The old divergence test is replaced, and one host-negative test is added.
- No other test deleted. No added skips, todos, suppression directives or no-op replacements.
- **10 distinct hash/option/round/handle literals**, counted per file: **0 missing**.
- Maximum added line **107 columns**; whitespace check **exit 0**.
- Final worktree clean.

My literal `expect(` counts:

| File | Before → after |
|---|---:|
| host-live-path | 27 → 22 |
| arena | 257 → 250 |
| board-delivery | 120 → 113 |
| board-snapshot | 45 → 39 |
| conversation | 435 → 424 |
| knowledge-base | 95 → 88 |
| MCP boundary | 33 → 26 |
| MCP golden | 31 → 22 |
| MCP handler | 243 → 236 |
| SIMULATED | 34 → 24 |

The removed assertions are identity probes, constructor-call/cleanup assertions, retired tests, and the replaced divergence oracle.

Two removed observations deserve explicit accounting:

- Golden’s retired identity test included an in-process capsule-binding assertion. The retained **real-child** test still compares the child’s handle with the independently constructed reference capsule and submits proposals successfully.
- SIMULATED’s constructor-spy loop inspected returned runtime capsules. Its retained actual-run assertions at **:295–326** still compare reference capsule/authorization digests, the exposed handle, advertised/submitted options and accepted proposals.

Direct runtime capsule assertions remain in the simplified helpers and board-snapshot test. Launcher reconstruction and transport assertions remain. I found no lost behavioral requirement.

### Divergence oracle — independently reproduced

**Read:** `ai-dm-conversation.test.ts:2050–2098` and `proposalResolutionDivergence`.

The test hand-authors a five-foot move, adjacent final position, explicit Dodge mechanics, zero digest and “after 5 feet” summary. Its expected diagnostic explicitly contrasts this with authoritative “after 0 feet”; no second resolver invocation manufactures the expectation.

**Ran in memory:**

- Baseline host/divergence pair: **2 passed**.
- Replaced authoritative resolution with:
  ```ts
  const checked = { ...entry, valid: true };
  ```
- Divergence test: **1 failed / 106 filtered**, exit **1**. Expected the exact diagnostic; received `[]`.

A function comparing the entry to itself cannot satisfy this oracle. I accept D617.34’s equivalence ruling and did not revive the retired fresh-legacy divergence mutant.

### Host negative — independently reproduced

The projector spy calls the real projector and changes only its returned digest. The real `DmEncounterHost.snapshot()` reaches the check at **:573**.

- Baseline new test passed.
- Replacing that condition with `if (false)` produced **1 failed / 7 filtered**, exit **1**:
  ```text
  expected function to throw an error, but it didn't
  ```

This demonstrates non-vacuous namespace interception under the actual Vitest runner configuration. It does not assume native-ESM namespace mutability. The spy is restored in `finally`, followed by host cleanup.

### Same-binding allocation and retained discrimination

The full SIMULATED run was blocked locally by localhost `listen EPERM`.

I instead exercised the **real `inProcessDmToolSession`** through an in-memory export and reference-handle probe:

- Baseline: **1 passed**.
- Nested second allocation from the same binding at **:3705**: **1 passed**.
- Replacement with a legacy environment: **1 failed**, because the returned state handle differed from the reference.

This corroborates the retained SIMULATED assertions. **Read separately:** D617.38 reports the actual SIMULATED suite **4/4 green** under the nested allocation and red under dropped binding.

### Spy inventory

`rg` found no remaining builder/runtime constructor spies or getter interception in the ten files.

The only other spy is `ai-dm-conversation.test.ts:1244`, on **child stdin `write`**, restored at **:1248**. It tests transport behavior, not environment identity.

### Commands and execution results

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Both **exit 0**, zero diagnostics.

I ran all ten files together using:

```js
startVitest('test', filesFromCommitDiff, {
  run: true, configLoader: 'runner', pool: 'threads', maxWorkers: 3
})
```

**My combined result:** **3 files passed / 7 failed; 198 tests passed / 116 failed**. Arena collected **0 tests** because temporary-directory creation failed. Other reported blockers included EROFS, child-loader writes, localhost EPERM and child-process timeouts. I therefore **cannot claim a local 58/58 arena or 372/372 combined pass**.

**Read, supervisor evidence:** D617.38 records **372/372 in one combined run**, including **58/58 arena**. Source comparison confirms the arena case bodies remain intact; only its retired identity case and scaffold were removed.

The oracle/mutant runs used `startVitest` with `configLoader:'runner'`, `pool:'threads'`, `maxWorkers:1` and in-memory transforms. An initial auxiliary probe used an invalid override-policy value; it was corrected and receives no verification credit.

Production SHA-256 values were unchanged before/after:

```text
host:
9dca6c8bbd9f9c2f493a6cc43e580cd59640328692242419f4b51893554983b4
conversation:
526a3171a51a2e08e9246f0b40831eb5365f194d805630610695c4758113524d
```

VERDICT: ACCEPT

REVIEW DONE
