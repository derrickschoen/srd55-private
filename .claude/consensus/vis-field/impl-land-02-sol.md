<!-- trimmed 2026-09-18 (D683): full codex log (478527 bytes) replaced by the lane's final message; session id 01a0aeac-47dc-7361-830f-5bcc1251fc36; the full log is in the mirror history of commit 8889b450 -->

Implemented the browser-spec reconciliation in [vtt-encounter.spec.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/browser/vtt-encounter.spec.ts:237).

Reference derivation:

- Fighter `(2,3)`: `normal_sight` only.
- Cleric `(1,4)`: `normal_sight` only.
- Wizard `(1,2)`: `normal_sight` only.
- Their visibility union covers every cell except dark target cell `(4,3)`.
- The blocker at `(7,2)` does not leave another cell unseen by all three.
- The Brute’s body supplies no light.
- DM fog and player owned-party concealment are therefore exactly `{(4,3)}`.

Re-pinned results:

- DM fog at `(4,3)`: `1`.
- DM Brute remains visible and marked hidden-from-players.
- Player floor remains rendered beneath the fog.
- Player fog at `(4,3)`: `1`.
- Player receives zero Brute tokens.
- Undo, adjudication, and control assertions remain unchanged.

Snapshot blocker:

- Expected service digest: `89d40ec8364439360e63d3e62fdc4d10da9613609e53f853b277c30b510216a2`.
- Rendered `data-source-state-digest`: `34724654c3898715fb3984720852e54bf391df1fe5c86fa7759ca154a76d6352`.
- Audience `dm`, revision `0`, round `0`, and glyph mode `full` match.
- The second digest equals the hash of `projectDmView(state).state`, including 176 derived fog cells—columns `9..16` across all 22 rows.
- B2’s decoder discards the legacy fixture `foggedCells` key consistently. The divergence comes from B3 adding derived fog to the projected state at [visibility.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts:524), while [boardStateDigest](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-board-snapshot.ts:201) still hashes the unprojected canonical state. The app writes the projected digest at [encounter-app.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-app.ts:2308).
- Proposed manifest addition: change `boardStateDigest()` to hash `projectDmView(state).state`, matching [encounter-projections.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-projections.ts:488). No production code was changed.

Other browser-spec inventory found no additional direct fog/concealment pins requiring changes. Reference, Vane, D365, and two-room specs otherwise test mounting, controls, transport, or owned-token positions. The manual `vtt-board.spec.ts` fog test uses a separate collaborative-canvas scene.

Verification:

- `PLAYWRIGHT_PORT=4470 PLAYWRIGHT_WORKERS=1 npx playwright test tests/browser/vtt-encounter.spec.ts --project=chromium`
  - `3 passed (1.0m)`
  - Target flow: `15.1s`
- Snapshot diagnostic:
  - `1 failed`, `1 did not run`, reproducing four 30-second `beforeAll` timeout reports.
  - The first instrumentation attempt stopped before tests because the temporary probe produced 2 TypeScript errors; the probe was corrected, used for diagnosis, and completely removed.
- `npx tsc -p tsconfig.app.json --noEmit`: exit `0`, `14.38s`.
- `npx tsc -p tsconfig.node.json --noEmit`: exit `0`, `27.63s`.
- `git diff --check`: exit `0`.
- `git status --short`: exactly `M tests/browser/vtt-encounter.spec.ts`.
- `tests/browser/ai-dm-board-snapshot.spec.ts` is untouched.

BLOCKED: tools/ai-dm-board-snapshot.ts:201 requires a production manifest ruling to align the service digest with the derived DM projection.
