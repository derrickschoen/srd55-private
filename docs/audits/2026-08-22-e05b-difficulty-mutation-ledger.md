# E05B difficulty mutation ledger

Date: 2026-08-22

| Control | Killing test | Mutation applied | Mutated result | Restored result |
|---|---|---|---|---|
| `difficulty_not_in_digest` | `difficulty_not_in_digest: changing one difficulty parameter changes the full preregistration digest inputs` | Made the difficulty-digest function hash the registered constant instead of its parameter, so an edited monster count retained the registered digest. | Vitest verdict: 1 failed and 50 skipped; the changed monster count produced the unchanged difficulty digest. | Restored hashing the supplied difficulty parameters; Vitest verdict: 1 passed and 50 skipped. |
| `arms_differ_beyond_typecheck` | `arms_differ_beyond_typecheck: paired arms share seeds and all encounter-generation parameters` | Raised only the untyped arm's generated movement budget from 5 to 6 feet. | Vitest verdict: 1 failed and 50 skipped; the paired declaration-domain captures reported 5 versus 6 feet. | Restored the single experiment-level parameter source; Vitest verdict: 1 passed and 50 skipped. |
| `manipulation_check_constant` | `manipulation_check_constant: E05B captures strictly more ids, tighter movement, and broader partitioned spell domains than E05` | Recorded E05's 7-id, 30-foot, zero-spell domains in E05B table captures. | Vitest verdict: 1 failed and 50 skipped; neither E05B record matched the independently generated harder domains. | Restored capture from the generated E05B encounter and its registered parameters; Vitest verdict: 1 passed and 50 skipped. |

Each mutation was applied alone, proved present by an exact source read, killed by its named test, restored, proved absent by an exact source read, and followed by a passing rerun of that killing test.

## Numeric boundary probes

| Parameter | One-step mutation | Mutated result | Restored result |
|---|---|---|---|
| Monster count | Accepted E05's maximum of 4 monsters as the E05B minimum. | Vitest verdict: 1 failed and 50 skipped. | Restored the minimum of 5; 1 passed and 50 skipped. |
| Movement budget | Lowered the declared movement minimum from 5 to 4 feet. | Vitest verdict: 1 failed and 50 skipped. | Restored the minimum of 5 feet; 1 passed and 50 skipped. |
| Spells per caster | Lowered the partition minimum from 2 to 1 spell. | Vitest verdict: 1 failed and 50 skipped. | Restored the minimum of 2 spells; 1 passed and 50 skipped. |
