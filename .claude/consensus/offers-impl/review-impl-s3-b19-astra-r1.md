# OFFERS B19 — astra review r1 (medium, resumed 01a0a5af-a708-7461-9a4b-22f3e1168e10, exit 0)

## Findings

Numbering continues after the supervisor’s closed B19-F1.

### B19-F2 — P2: Decoder accepts arrays as digest strings

At [ai-dm-conversation.ts:3243](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:3243), both checks apply the regex to `String(input[field])`. Consequently, `[validDigest]` passes validation while remaining an array in the decoded record.

**Ran:** An in-memory extension of the existing decoder test supplied one-element arrays for each digest, through both envelope decoders:

```text
                         environment digest   resolution digest
round envelope                 true                 true
plan-adjustment envelope       true                 true
```

The rejection assertion failed: expected `[false,false,false,false]`, received `[true,true,true,true]`. **1 failed, 108 skipped.**

**Fix:** Require `typeof value === 'string'` before each regex check. Cover both digest fields and both envelope kinds, including non-string JSON values.

### B19-F3 — P2: Plan-adjustment provenance lacks discriminating coverage

At [engine-server.ts:3396](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/engine-server.ts:3396), the current assignment is correct, but replacing it with:

```ts
offerEnvironmentDigest: entry.resolution.resolutionDigest,
```

**survived 141 tests** across the MCP handler/server suites, with three excluded tests.

A focused rerun of `binds, budgets, stages, corrects, and explicitly keeps plan adjustments per actor` also passed. A separate execution probe that throws at this assignment failed at the submission assertion, confirming that the test reaches the mutated site.

Adjustment decoding also lacks a negative witness: removing `input['updates'].every(isStoredProposalResolution)` survived the focused decoder test (**1 passed, 108 skipped**). The existing negative cases construct only round envelopes.

**Fix:** Assert the stored adjustment updates carry the independently expected environment digest, distinct from their mechanics digest. Add adjustment-envelope negatives for both digest fields.

## Other review results

**Read and checked:**

- Scope is exactly **12 files, 268 additions / 14 deletions**: four production files and eight test files. No model-routing, timing, cache or gate changes.
- No tests were deleted; two tests were added. Added lines exceeding 120 columns: **0**.
- All production construction sites use the correct source:

| Site | Digest source and resolution environment |
|---|---|
| Server round, adjustment and single-turn: 3345, 3396, 3549 | Application `offerEnvironment.digest`; `turnProposals` is constructed from that same environment at 1483 |
| Blind resolver: 654, caller 734 | Supplied environment’s digest; default resolver uses it, and MCP forwards its matching application resolver |
| Conversation default/controller: 1490, 1528 | Each resolves directly through `createPureTurnProposalResolver(offerEnvironment)` |
| Exhaustion conversion: 6548 | Preserves the originating entry’s digest |
| Server re-registration: 1508 | Spreads the stored record, preserving its digest |

- Divergence compares digests **before constructing or calling the resolver** and names both digests. My comparison-skipping mutant failed with `expected [diagnostic], received []`.
- My blind-store mechanics-digest mutant was killed at `engine-mcp-server.test.ts:209`: expected environment digest `e9355582…d3a2`, received mechanics digest `1440d18d…ce1b`.
- The three pre-B19 proposal-ID, proposal-hash and session-digest pins remain hard-coded. Normalization removes only the new field and substitutes the resulting old proposal identity into dependent hashes. The independent canonical-body calculations retain meaningful old anchors. The new pins are independently derivable through those formulas; I **read**, rather than executed, this filesystem-dependent proof.
- **No finding on the observation hook.** External MCP spools contain complete records, but the local OpenAI path retains its proposal in memory. Its rows, RL capture and journal retain submitted intents/identities rather than stored resolutions. The callback observes a clone without replacing authorization or suppressing a refusal.

## Commands and results I ran

```bash
git diff --stat 80411ca2 1248d3c7
git diff --check 80411ca2 1248d3c7
git status --short

node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
```

Both TypeScript commands exited **0**; diff check exited **0**; status was clean.

Vitest commands:

```bash
node node_modules/vitest/vitest.mjs run \
  tests/unit/vtt/engine-envelopes.test.ts \
  tests/unit/vtt/engine-state-capsule.test.ts \
  tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts \
  tests/unit/vtt/turn-exhaustion-coordinator.test.ts \
  --configLoader runner --pool threads --maxWorkers 3
```

**3 files / 33 tests passed.** There is no matching `engine-envelopes.test.ts`; the other three files ran.

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-server.test.ts \
  --configLoader runner --pool threads --maxWorkers 1 \
  -t '^(?!.*(?:discovers, lists tools|negotiates the literal)).*$'
```

**13 passed, 2 skipped.**

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/ai-dm-conversation.test.ts \
  --configLoader runner --pool threads --maxWorkers 1 \
  -t 'divergence refuses a stored|rejects stored proposal resolutions|re-resolves independently specified'
```

**3 passed, 106 skipped.**

```bash
node node_modules/vitest/vitest.mjs run tests/unit/tools/engine-mcp-handler.test.ts \
  --configLoader runner --pool threads --maxWorkers 1
```

**129 passed.** Total baseline tests I ran: **178 passed**.

Mutants and decoder probes used `node --input-type=module` with programmatic `startVitest` and in-memory Vite transforms; no worktree files were modified. Filesystem/child-process/socket-dependent suites were not retried. Supervisor suite totals are read evidence, not my results.

Production SHA-256 values printed before and after mutation runs were identical:

```text
engine-server.ts
991159cf6e9b35e8d4502ca407e2fca84d6f7ce6428a72b45d20672b98df227c
blind-intent-resolver.ts
e7592c239e5e1466c247c4a5a6af6678de1bc6bc0943a93d531036e705872429
ai-dm-conversation.ts
a226252402fba39ca3183d6e603a9e6fb87b0557256a1757d61c773d39f922b7
```

VERDICT: REJECT (0 P1, 2 P2)
REVIEW DONE