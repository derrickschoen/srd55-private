# DISPATCH CI-3a — content identity projector: stored bundled/external rows (M/L, MINT-LIKELY, wt/attunement, PLAYWRIGHT_PORT=44483)

THE BINDING PLAN is docs/design/2026-07-30-homebrew-authoring-forms.md,
unit CI-3a in section 11, plus the projector-contract sections HA-1's exit
pointed at (read HA-1's merge-commit report reference in
.claude/handover/lane-state.md for where the contracts/vectors live).
Implement CI-3a exactly: the projection for stored bundled/external rows
over HA-1's pinned contracts. CI-3b (equipment-dependent projection, after
CI-3c) is NOT yours.

CONSTRAINTS:
- HA-1's hand-pinned vectors are FROZEN inputs: your projector must
  reproduce them byte-for-byte. If a vector seems wrong, do NOT "fix" it —
  STOP and report; the supervisor arbitrates (a wrong vector is a finding
  against HA-1, resolvable only before content-v1 freezes).
- Trivial self-match discipline from CI-2a stands: derived-key equality +
  byte-identical canonical bytes = silent adoption; metadata conflict =
  review; equal digest with different bytes = collision throw. Your
  projection feeds exactly that resolver — integration-test all three
  paths against real stored rows.
- D133: no class projection exists or is stubbed.
- If the unit requires a migration (registry/marker changes), you own the
  next free number — verify the tail; if it needs none, mint NOTHING and
  say so.

EXIT: the unit row's exit criteria; every HA-1 vector reproduced by the
live projector in a named test; the three resolver paths proven against
stored rows.
