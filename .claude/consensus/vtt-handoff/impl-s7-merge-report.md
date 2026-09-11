Resolved working-tree contents are complete; the three files remain `UU` only because staging was prohibited. Conflict-marker count is zero.

Conflict resolutions

- `package.json`, one hunk: retained S7’s `test:runtime-node` and retained the existing `handoff:publish`, `art:request`, `art:validate`, `art:stage`, and `windows:probe` scripts.
- `tests/helpers/test-filesystem.ts`, one hunk: retained both `chmodSync` from S7 and `closeSync` from the existing branch, with one export list and no duplicates.
- `tests/unit/vtt/engine-boundary.test.ts`, six hunks:

  1. Retained `tmpdir`, required by the S6 temporary source controls.
  2. Combined S7’s `reachableSubgraph`, `graphProgram`, and `resolvedSymbol` helpers with S6’s symbol-resolved platform analyzer.
  3. Retained S6’s provenance-aware AST visitor, covering aliases, destructuring, computed globals, and Node builtins.
  4. Retained S8’s `memberCallDefinitions` and `encounterCommandLiteralSites`, followed by S7’s runtime convergence and exact reducer-edge helpers.
  5. Retained both S6’s `platformControlViolations` and S7’s runtime dependency graph/program/cache helpers.
  6. Retained the complete assertion union: S6 platform controls, S7 platform/convergence/source-mutant checks, S7c adapter-only convergence, and all three S8 top-down assertions. The S8 convergence graph now includes all `RUNTIME_ENTRYPOINTS`, including S7’s Node and WebSocket entries.

Recomputed `PERMITTED_REDUCER_EDGES`, verbatim:

```text
src/vtt/dm-encounter-host.ts#commandReducer -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter
src/vtt/session-encounter-reducer.ts#reduceSessionEncounter -> src/vtt/vane-warren.ts#reduceVaneWarrenEncounter
src/vtt/session-persistence.ts#advanceSkippedTurn -> src/combat/encounter.ts#reduceEncounter
src/vtt/session-persistence.ts#replaySessionRevisions -> src/vtt/session-encounter-reducer.ts#reduceSessionEncounter
src/vtt/vane-warren.ts#reduceVaneWarrenEncounter -> src/combat/encounter.ts#reduceEncounter
src/vtt/vane-warren.ts#reduceVaneWarrenWorldObjectAction -> src/combat/encounter.ts#reduceEncounter
```

F89 was closed with the test named `keeps the browser WebSocket adapter platform-neutral`. It constructs the dependency graph rooted explicitly at `src/vtt/handoff/websocket-transport.ts`, asserts that the entrypoint is present, and asserts that the symbol-resolved platform violation set is exactly empty. This independently covers the browser adapter excluded from `CORE_ENTRYPOINTS`.

Changed expectations

No existing assertion was weakened or deleted.

- The S7 builtin control’s single literal-path equality became `toHaveLength(1)` plus an exact filename/import regex, accommodating S6’s randomized temporary directory without weakening the diagnostic.
- The alias control’s former single-result equality became length `2`, with exact matches for both `browser.document` and `browser.document.createElement`.
- The destructuring control’s former single-result equality became length `2`, with exact matches for both `pageDocument` and `pageDocument.body`.
- The computed-access control became length `1` plus an exact `browser['indexedDB']` resolution match.
- The shadowed-local negative control remains exact `toEqual([])`, now executed through the S6 symbol-resolved temporary-file analyzer.
- S8’s reducer equality changed from a graph rooted at `CORE_ENTRYPOINTS` with an inline six-item array to a graph rooted at all `RUNTIME_ENTRYPOINTS` plus `encounter-app.ts`, compared exactly with the same six-item `PERMITTED_REDUCER_EDGES` constant.
- F89 added, rather than replaced, two expectations: entrypoint presence and an exactly empty violation set.

Verification commands and results

```text
npm run typecheck:fast
```

Exit 0.

```text
sg scan
```

Exit 0, zero findings.

```text
git diff --check && test -z "$(rg -l '^(<<<<<<<|=======|>>>>>>>)' src tools tests package.json || true)" && echo 'conflict-markers=0' && sha256sum src/vtt/intel/contracts.ts
```

Exit 0; `conflict-markers=0`; frozen hash remained:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

```text
npm run test:runtime-node
```

4 files passed, 66 tests passed.

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts
```

1 file passed, 17 tests passed.

The following named selections were run with:

```text
npx vitest run --configLoader runner tests/unit/vtt/engine-boundary.test.ts -t '<name>'
```

Results:

- `top-down UI mutations enter the rich session service`: 1 passed.
- `top-down UI constructs no reducer command literals`: 1 passed.
- `all runtime entries converge after top-down refactor`: 1 passed.
- `all renderer adapters converge on the session service`: 1 passed.
- `keeps the browser WebSocket adapter platform-neutral`: 1 passed.
- `rejects bare Node builtins plus aliased, destructured, and computed browser globals`: 1 passed.
- `rejects source-mutated reducer and service bypasses`: 1 passed.
- `all runtime entries converge on the pinned session reducer edges`: 2 passed because both retained assertions have that name.

```text
npm run test:engine
```

4 files passed, 64 tests passed.

```text
npm run test:protocol
```

4 files passed, 76 tests passed.

The exact 31-file S8-plus-S7 cumulative command was:

```text
npx vitest run --configLoader runner tests/unit/vtt/handoff-bootstrap.test.ts tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/scene-snapshot.test.ts tests/unit/vtt/two-room-fixture.test.ts tests/unit/vtt/door-intent.test.ts tests/unit/vtt/encounter-selectors.test.ts tests/unit/vtt/encounter-session-service.test.ts tests/unit/vtt/engine-boundary.test.ts tests/unit/vtt/local-session-store.test.ts tests/unit/vtt/session-lifecycle.test.ts tests/unit/vtt/session-persistence.test.ts tests/unit/vtt/handoff-examples.test.ts tests/unit/vtt/in-process-transport.test.ts tests/unit/vtt/protocol-runtime.test.ts tests/unit/vtt/worker-boundary.test.ts tests/unit/vtt/serve-existing-dist.test.ts tests/unit/vtt/art-request.test.ts tests/unit/vtt/art-stage.test.ts tests/unit/vtt/art-validator.test.ts tests/unit/vtt/png-validator.test.ts tests/unit/vtt/uuidv7.test.ts tests/unit/vtt/windows-probe.test.ts tests/unit/vtt/encounter-projections.test.ts tests/unit/vtt/encounter-board-projection.test.ts tests/unit/vtt/preview-hidden-rolls.test.ts tests/unit/vtt/semantic-board-payload.test.ts tests/unit/vtt/detection-ui.test.ts tests/unit/vtt/controller-assignment.test.ts tests/unit/vtt/node-runtime.test.ts tests/unit/vtt/node-websocket-transport.test.ts tests/unit/vtt/runtime-parity.test.ts
```

31 files passed, 371 tests passed.

The successful browser command was:

```text
PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=/tmp/vtt-s7-merge-playwright.config.mjs vtt-handoff/top-down-smoke.spec.ts vtt-handoff/runtime-parity.spec.ts vtt-encounter.spec.ts
```

3 spec files, 5 tests passed in 1.2 minutes. Artifact line:

```text
artifact=dev page=http://127.0.0.1:4410/vtt?encounter=d365 offered=turn:1:combatant:character-5:1:option:0 destination=1,4
```

HANDOFF S7 MERGE DONE