40,512
**ACCEPT — no P1/P2/P3 findings.** Reviewed candidate `d71860ad` against base `b94dd732`; frozen plan SHA-256 matches.

- **Knowledge safety:** `encounter.ts:2286–2300` requires prior sight and copies only `prior.targetPosition`. The snapshot is freshly computed before each command (`:12860`), not recovered from an older round. `located` is not `seen`; it cannot authorize memory creation. A stale historical position remains known information, and unseen movement cannot refresh it. No remaining reducer path found that creates memory from a never-observed target’s current position.
- **Hide control:** At `search-memory.test.ts:360`, the monster initially sees `(2,0)`. Applying heavy obscurement creates an `obscurement` memory there. The subsequent Hide starts with `prior.seen === false`, so it retains that memory. The changed expectation is independently justified by these events.
- **Base-tree failures:** The old bypass creates a forbidden memory in the never-observed test; overwrites the moving target’s memory with `(3,0)` and later `(4,0)`, refreshing its lifetime; and replaces `obscurement` with `hiding` in the retained control. These failures directly expose the defect. The added expiry/reacquisition assertions are preservation controls. No output-generated expectation found. Precisely, the diff adds two test blocks and strengthens existing cases.
- **Consumers:** Candidate-tree searches found no consumer branching on memory cause. Region expansion (`search-memory.ts:139`), suspected-square eligibility (`encounter.ts:7463`), and MCP rendering (`engine-server.ts:1386`) consume the retained historical memory as intended. Serialization/projection preserves that data without introducing a current-position fallback.

Review was read-only; no tests rerun or files changed.

BLIND-01 REVIEW B0 DONE
