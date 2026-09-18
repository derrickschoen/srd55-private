# OFFERS B19 — astra review r2 (medium, resumed 01a0a5af…, exit 0)

No new findings. **B19-F2 and B19-F3 are closed.**

## Findings verification

**F2 — closed.** [isSha256Hex](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:3230) checks `typeof value === 'string'` before applying the regex, rejecting every non-string without coercion.

I reran the in-memory array probe against both digest fields and both envelope kinds. Its assertion passed:

```text
[false, false, false, false]
1 passed / 109 skipped
```

`rg -n '\.test\(String\(' tools/ai-dm-conversation.ts` returned **0 matches**; a whitespace-tolerant Python scan also found **0**.

**F3 — closed.** My in-memory mutants produced:

| Mutant | Result |
|---|---|
| Adjustment stores `entry.resolution.resolutionDigest` | **Killed**, 1 failed / 128 skipped, handler test:1769 |
| Same mutation only when `request.phase === 'correction'` | **Killed**, 1 failed / 128 skipped, handler test:1881 |
| Remove `updates.every(isStoredProposalResolution)` | **Killed**, 1 failed / 109 skipped, conversation test:2262 |

Both store assertions expected independently constructed environment digest `0c2e08e2…4afb`. They received mechanics digests `13128d37…56b6` and `616c881c…c699`, respectively.

The expectation is independent of server output: [handler test:55](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:55) builds `BOUND_OFFER_ENVIRONMENT`; the runtime helper passes that object into the application. Both staged and corrected records must contain nonempty updates, preventing vacuous loops.

## Decoder and regression review

- The new adjustment test directly calls the real exported decoder. Adding `export` changes visibility, not its production execution.
- Its **one positive and eight negatives** are meaningful: missing, 63-character, uppercase and array values, separately for both digests. An always-false decoder fails the positive baseline.
- Scope: exactly **3 files, 112 additions / 3 deletions**.
- No tests or pins removed or altered.
- AST comparison found every pre-existing assertion statement byte-identical:
  - Conversation: **422 → 433**, **0 missing/changed**.
  - Handler: **236 → 242**, **0 missing/changed**.
- Added lines exceeding 120 columns: **0**.
- The observation hook and previously accepted store-site wiring are unchanged.

## Commands and results I ran

```bash
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
git diff --check 1248d3c7 8d5f86fa
git status --short
```

Both TypeScript checks and diff check exited **0**. Status was clean.

```bash
node node_modules/vitest/vitest.mjs run \
  tests/unit/vtt/engine-state-capsule.test.ts \
  tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts \
  tests/unit/vtt/turn-exhaustion-coordinator.test.ts \
  tests/unit/tools/engine-mcp-handler.test.ts \
  --configLoader runner --pool threads --maxWorkers 2
```

**4 files / 162 tests passed.**

```bash
node node_modules/vitest/vitest.mjs run \
  tests/unit/tools/ai-dm-conversation.test.ts \
  --configLoader runner --pool threads --maxWorkers 1 \
  -t 'divergence refuses a stored|rejects stored proposal resolutions|re-resolves independently specified|rejects plan adjustment envelopes'
```

**4 passed / 106 skipped.** Total baseline: **166 passed**.

The probe and mutants ran through `node --input-type=module`, using `startVitest` with in-memory Vite transforms, `configLoader: 'runner'`, `pool: 'threads'`, and `maxWorkers: 1`. No production files were edited.

SHA-256 values printed before and after were identical:

```text
tools/ai-dm-conversation.ts
4ef64831f0420670936277f1e74b39ecac5fb503184e9197ef7571528bae9e18

src/vtt/mcp/engine-server.ts
991159cf6e9b35e8d4502ca407e2fca84d6f7ce6428a72b45d20672b98df227c
```

I read the implementer report and D617.45; their **303/303** result is supervisor evidence, not my run.

VERDICT: ACCEPT
REVIEW DONE