<!-- trimmed 2026-09-18 (D683): full codex log (1185035 bytes) replaced by the lane's final message; session id 01a0a642-35a1-7082-aba2-eda56ea291c1; the full log is in the mirror history of commit 8889b450 -->

No LAND3 findings. **LAND-F1 is closed.**

## 1. Save-LOS closure

The property now checks every target of every component at [engine-query-port.test.ts:631](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/tests/unit/vtt/engine-query-port.test.ts:631), using actor, target, and `sourceAnchor: resolution.mechanics.finalPosition`. These match the query’s inputs at `engine-query-port.ts:1168–1170`. Relocating the actor in the execution state preserves the same footprint and source/target exclusions.

The passing property pins **214 options, 316 components, four saves**. Reducer execution is correctly labelled as an additional check.

**Own blocking-column probe:** reproduced in memory; now **fails** at line 637 on `6203010` Web with `blocksSight: true`. Previously this probe survived.

The Giant Spider is Large. Independent corner enumeration gives **12 interior-blocked rays and four horizontal rays** along row 1 between `(3,0)/(3,1)`. Those four retain physical edge-grazing behavior but block sight under D635. Therefore **Half cover + blocked sight** is correct; removing the column opens the shot.

## 2. Board-digest audit

All active board-artifact producers and validators now agree on:

```text
sha256(canonicalJson(projectDmView(state).state))
```

| Sites | Binding |
|---|---|
| `tools/ai-dm-board-snapshot.ts:201,218,234,793,1016` | Computes projected digest; validates source, artifact, and DOM equality |
| `src/vtt/mcp/entrypoint.ts:884,927` | Image and HTML validators independently compute the same digest |
| `encounter-projections.ts:488` | Hashes the supplied DM-view state |
| `encounter-app.ts:2280,2308` | Publishes that digest for ordinary and blind-role captures, including player-board capture |
| `ai-dm-conversation.ts:4487` | Uses `boardStateDigest(rendererState)` |
| `ai-dm-board-glyph-captures.ts:118` | Uses `boardStateDigest(candidate.state)` |
| Board snapshot checks: `:20`; blind check: `:25,49` | Produce/compare through `boardStateDigest` |
| `ai-dm-screenshot-probe.ts:2622,3615` | Produces and validates through `boardStateDigest`; other digest fields carry recorded metadata |

The `rg` audit found **38 files** containing the digest identifiers. Remaining occurrences fall into these distinct categories:

- Snapshot/delivery/browser/integration test artifacts forward the supplied board source digest. The launcher fixture at `ai-dm-board-delivery.test.ts:772` now independently computes the projected digest.
- Glyph, light, footprint, board-chrome and offered-path rendering tests use explicit placeholder digests.
- Agent decisions, envelopes, persistence, blind-context provenance, conversation authorization and their tests use **engine capsule digests**, not board-image hashes.
- `tools/rl/extract-sft.ts:155–160` extracts an engine-state handle. The committed RL JSONL contains the placeholder `"a".repeat(64)` in `rlData.stateDigest`; it is not a board artifact.
- D569’s `startingRoomDigest` intentionally remains raw-state based (`d569-v5.test.ts:117`, `validate-first-arm.ts:321`). No manifest or historical digest was regenerated.
- E1C/FOOTPRINTS constants and their **31,995/32,000-byte** assertions remain unchanged.

### Determinism and collisions

`projectDmView` uses state data and deterministic derived visibility; it has no clock, randomness, or offer-environment input. The board projection hashes the state separately from `offerEnvironmentDigest`.

**The projected digest is not full canonical-state identity.** `projectDmView` omits optional `initiativeBeforeDelays` (`encounter.ts:786`; projection at `visibility.ts:505–550`). My in-memory probe confirmed that two raw states differing only there have different canonical JSON but identical DM views and board digests.

That is consistent with D635.42’s **rendered-view binding**: the artifact is identical for these inputs. Revision, round, current initiative and event log remain represented. This digest must not be treated as a replacement for execution authorization; the separate envelope/capsule checks were not changed.

## 3. Hand oracles

**Snapshot witness:** on the five-cell row, cells 0 and 1 are visible; wall cell 2 is visible as the target endpoint. Normal sight cannot see dark target cells 3 and 4. Hence the literal fog field `{3,4}` is correct (`ai-dm-board-snapshot.test.ts:218–239`).

The negative control discriminates: restoring raw hashing caused **1/1 targeted test to fail**, with raw digest `46d6cc95…` versus projected `92ba94ec…`. Even empty derived fog adds a field absent from canonical state; the fix is not limited to non-empty fog.

**LAND-02:** reference positions, normal-only senses, blocker `(7,2)`, and darkness `(4,3)` are established at `reference-encounter.ts:57,112–124`. Independent rational-arithmetic enumeration gives **69 visible cells and exactly `(4,3)` concealed**.

The local player seat owns all three PCs (`encounter-app.ts:1496–1500`), so its observer union matches the DM party union. Keeping floor art, adding one fog overlay, retaining the omniscient DM token, and omitting the Hidden player-side monster are consistent. Other browser assertions remain unchanged.

## 4. Commands and results — my runs

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
git diff --check ebfcacaa 9a220fce
git diff --numstat ebfcacaa 9a220fce -- tests/fixtures
git status --short
```

Both TypeScript checks and diff check exited **0**. Fixture diff and working-tree status were empty. Scope: **six files, 162+/22−**; **zero added lines over 120 columns**.

Vitest used `node --input-type=module` with programmatic `startVitest`, configuration bundling disabled, one thread worker, `cache:false`, and in-memory transforms:

| Run | Result |
|---|---:|
| Query port | **20/20 passed** |
| Board snapshot | **22/22 passed** |
| Screenshot probe | **23 passed; 3 EROFS-blocked** |
| Board delivery | **7 passed; 10 filesystem-blocked** |
| Brutal-b | **37 passed; exactly 10 expected productivity failures** |
| D569 blind experiment | **46 passed; exactly 6 expected manifest failures** |
| Projected-digest collision probe | **1/1 passed** |

The two own mutants—blocking-column save probe and raw snapshot digest—were both killed. Browser results remain **supervisor evidence**; I did not run Playwright. Historical delivery pins could not execute through this sandbox’s filesystem restrictions.

Production SHA-256 values printed before and after were identical:

```text
ai-dm-board-snapshot.ts e9398ff7d97d62804920ce6a3ac017917ad932949574bc47415e0eaa4a48e55c
mcp/entrypoint.ts      b5a9e428641276fbf5cba4df3ca4105ad214fc0a4c63a8a2d341a25c69f13948
```

VERDICT: ACCEPT
REVIEW DONE.
