# DISPATCH W-C — LU-2 projection and rollback-preview adapter (M, MINT-FREE, wt/print, PLAYWRIGHT_PORT=44473)

THE BINDING PLAN is docs/design/2026-07-31-level-up-wizard-route-ui.md:
section 3.2 (read/preview adapter is not a second rules engine), unit row
W-C in section 6, test rows W-RPC-LIVE (preview half), W-PREVIEW-PURE,
W-PREVIEW-PARITY, W-PREVIEW-AUDIT-LINE, W-COMMAND-ATOMIC, W-REFUSALS,
W-PLANNED-SPELL in section 7.2. Implement exactly W-C. W-D (rendering the
choices) is NOT yours; the state RPC exists (merged W-A/W-A2) — extend it,
do not duplicate it.

AMENDMENTS: LU-W section 8 OQ-1/OQ-2 are CLOSED by D118/D119 (both
availabilities exposed via pending_epic_resolution; disabled classes per
guideability). The LU-2 payload (planned_subchoices with logical
source/rule/ordinal locators) is MERGED — consume its exported types from
src/domain/command-contracts.ts; never re-derive.

ARCHITECTURE (non-negotiable, from plan 3.2):
1. previewLevelUp lives in a DEDICATED worker handler module
   `src/worker/handlers/level-up-preview.ts` — its name advertises the
   rollback boundary. Ordinary read-only queries stay in queries.ts.
2. The preview runs the REAL merged command application inside a
   transaction, captures the result, then throws ONE module-private
   identity-checked sentinel to roll everything back; it catches ONLY that
   exact sentinel by identity and rethrows everything else. The precedent
   is src/sharing/character-share.ts (the LU-W doc's section 2 row "P27"
   cites the exact lines) — copy that shape. DatabaseContext.transaction
   nests via savepoints (P28), so the command's own transaction is enclosed.
3. Preview must NOT call commands.execute: no operation UUID, no revision,
   no audit/operation/history rows, no idempotency interaction. Confirm
   (W-E, later) is the only writer.
4. Factor a shared preflight (src/commands/character-command-preflight.ts)
   used by BOTH the executor and the preview: same payload validator, same
   factory/integrity construction, same exact expected-revision check —
   preview refusals and confirm refusals must be byte-equal structured
   data. Modify the executor only to consume the shared preflight.
5. Extend the levelUpState projection with the LU-2 planned-choice
   projection (owed skills/expertise/spells with logical locators, optional
   swaps) — consumed types only.
6. Hand-author `ACCEPTANCE_WIZARD_2_CHOICES` in
   tests/browser/fixtures/level-up-characters.ts (create it): the exact
   ordered choice oracle for the acceptance Dwarf Wizard reaching level 2
   (Scholar Expertise: Arcana; each owed spell locator and the selected
   spell NAME proved against the sourced Wizard-2 entitlements and the
   planned-search integration fixture — never derived from preview output).
   W-F consumes it; its proving integration test is YOUR exit criterion.

Integration tests per plan 7.2 rows named above, including: preview
row/revision/sequence neutrality proved by full before/after row comparison
AND preview-after-sheet equals a subsequent real commit's sheet; malformed
and stale requests produce identical structured refusals through preview
and executor paths; the three LU-1 refusal keys survive worker transport as
data. EXIT (unit row W-C): validation/refusals match Confirm; preview is
row/revision neutral; planned search and commit agree on locators; the
acceptance oracle exists with its proving test green.
