# VIS-FIELD B5 — astra review r1 (medium, resumed 01a0a642…)

## Finding

**B5-F1 — P3, nonblocking: the blind-board guard is a source-text proxy, not a type/import boundary.**

At `tests/unit/vtt/challenge-room-fixtures.test.ts:130–143`, exact string checks reject harmless changes such as renaming `board` or reformatting the import. They can also accept incorrect behavior: supplying source containing

```ts
requireCondition(true || dm.fogMarks === board.foggedCells.length, ...)
```

still passed **1/1**. The specified `board.foggedCells → state.foggedCells` substitution correctly failed **1/1**.

**Recommended improvement:** use TypeScript AST checks for type-only imports and property access, plus a small behavioral test that rejects an incorrect fog count. A type-level guard is feasible; the field-deletion overlay already demonstrates it. This does not block B5: the production comparison is correct, the named mutant dies, and the actual compilation boundary is independently verified.

## Verification

### Scope and protected assertions

Ran:

```bash
git diff 2e360685 436702cf
git diff --stat 2e360685 436702cf
git diff --check 2e360685 436702cf
git status --short
```

Confirmed **13 files, 86 insertions / 41 deletions**, **zero `src/` changes**, clean checkout, and whitespace check exit **0**. Maximum added-line width: **106**. Frozen-plan SHA matches.

The screenshot test diff contains only:

- Removal of `everyClassState()`’s authored fog input.
- The permitted fact-class oracle and its geometry explanation.

The test title remains unchanged. **D524 and all subsequent file bytes are identical** to `2e360685`; its timeout budget and Q9 judgments were not altered.

For `engine-state-capsule.test.ts:137,364` and `turn-exhaustion-coordinator.test.ts:71`, I normalized only the added import and three `projectDmView(...)` substitutions. **Every remaining byte—including all assertions—matched the previous version.**

### Field-deletion overlay

Ran both TypeScript projects using an in-memory compiler host that:

1. Removed exactly the two runtime/setup declarations.
2. Explicitly retained `ProjectedCanonicalEncounterState.foggedCells`.

Results:

| Diagnostic path | App | Node | Owner |
|---|---:|---:|---|
| `src/combat/encounter.ts:1315,1395,2271` | 5 | 5 | B2 |
| `src/combat/visibility.ts:45` | 1 | 1 | B2 |
| `src/vtt/intel/actor-knowledge.ts:263` | 2 | 2 | B2 |
| `src/vtt/semantic-board-payload.ts:358` | 2 | 2 | B2 |
| `tests/unit/vtt/actor-knowledge.test.ts:17,205,209` | 0 | 3 | B2 |
| **Total** | **10** | **13** | **0 outside B2/B6** |

Repeated locations include the resulting implicit-parameter-type diagnostics. Boundary soundness is confirmed.

### Rewritten visibility tests

The four affected sites retain meaningful coverage:

- **Old `:38`:** removes an inert fixture input. Death-save redaction, DM-note exclusion and absence of the `foggedCells` property in player serialization remain asserted.
- **Old `:349`:** removes explicit `foggedCells: []`; the clear-board expectation remains `[]`.
- **Old `:355`:** replaces the authored-list mutation with actual darkness. The old DM/player expectations of `[]` become literal `['1,0']`. This changes the tested scenario, preserving discrimination between authored state and derived projection.
- **Old `:485`:** removes an inert partial-fog list. Squeezed footprint, Hidden exclusion, last-seen information and DM footprint assertions are unchanged. The title’s “partial fog” wording is now historical.

My in-memory `FOG_STILL_AUTHORED` mutation failed both:

```text
AUTHORED_FOG_CANNOT_CHANGE_PROJECTION
DM_BOARD_FOG_EQUALS_DM_VIEW_FOG
```

Result: **2 failed / 20 skipped**.

The ledger does **not** pin `AUTHORED_FOG_CANNOT_CHANGE_PROJECTION`. It pins the separate D359 edge-cell title at `mutation-ledger.test.ts:374–376`. That test remains unchanged and discriminating: my creature-visibility leak mutation failed its exclusion assertion at `visibility.test.ts:562`: **1 failed / 21 skipped**.

### Fact-class hand oracle

Source geometry: `ai-dm-screenshot-probe.test.ts:127–163`.

The hero at `(1,1)` is the sole eligible observer. The foe is a dying monster. Normal sight cannot see:

- `(2,0)`: dark target.
- `(3,1)`: heavily obscured target.

Other cells have a clear corner ray. In particular, `(1,2)→(4,3)` crosses `(2,2)` and `(3,2)` without entering smoke or either eastern blocker; the statue at `(3,2)` does not block sight.

An independent rational-coordinate enumeration—not the production tracer—found **22 visible / 2 concealed**, exactly `[(2,0),(3,1)]`.

The permitted fact-class test passed **1 / 25 skipped**.

### Deferred semantic failures

My run produced exactly **6 passed / 2 failed**:

1. `keeps the engine-safe semantic source equal to the canonical DM board projection`
2. `M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION exhaustively partitions cells and matches effective walls`

No additional semantic failures appeared. The remaining state-source cleanup is assigned to B2; semantic assertions remain deferred to B6 under plan lines 220 and 228–238.

## Commands and results — my runs

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

Both exited **0**.

I ran the report’s complete **22-file selection** through `vitest/node.startVitest`, using in-memory configuration, a thread pool, four workers and cache disabled:

- **19 files passed / 3 failed**
- **318 tests passed / 5 failed / 53 skipped**
- Five blind-context tests could not collect.
- All blockers were read-only `/tmp` failures: experiment setup, blind-context capture and five handoff publication tests.

These are sandbox limitations; I do not claim the supervisor’s **381/381** as my result.

The same runner, with one worker, ran:

```text
tests/unit/vtt/replay.test.ts
tests/unit/vtt/detection-reactions.test.ts
```

**36/36 passed in 39.28 seconds**, below the **42-second** ceiling. B5 changes no engine path.

Production hashes were printed before/after probes and remained unchanged:

```text
visibility.ts:
cc283475f84c409d3cbfacc50bd7f9ca1f318fd4ef1ffd91542b3a02d9acc23e
ai-dm-blind-board-snapshot-check.ts:
3aa926045a5ba214dcaa7b66f731cd21da6573db23d1335722945d40c49c4b92
vtt-experiment.ts:
db4d17ab07b33249390f42d91786e82ab042fa1c8b05236530eef6efda2397af
```

VERDICT: ACCEPT

REVIEW DONE