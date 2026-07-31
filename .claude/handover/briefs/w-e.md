# DISPATCH W-E — review, atomic confirm, complete (L, MINT-FREE, wt/print, PLAYWRIGHT_PORT=44475)

THE BINDING PLAN is docs/design/2026-07-31-level-up-wizard-route-ui.md:
section 4.7, unit row W-E in section 6, test rows W-ONE-UUID,
W-LOAD-ANNOUNCE, W-NO-BACKUP-HINT (7.1) and W-DOUBLE-CONFIRM, W-STALE
(7.3 — implement their focused browser journeys). Implement exactly W-E on
top of merged W-B2 + W-D. W-F (entry links + acceptance extension) is NOT
yours.

Confirm lifecycle (plan 4.7, exact order): synchronously focus+announce a
submitting status THEN disable all controls (never disable the focused
control first — W-LOAD-ANNOUNCE); ONE operation UUID per confirmed draft,
retained across ambiguous retry (W-ONE-UUID); submit the exact merged
LU-1/LU-2 command with state revision; structured revision conflict keeps
the draft, shows the character changed elsewhere, offers explicit reload,
never blind-retries (W-STALE); success/idempotent-replay discards the draft
and loads fresh sheet data. Review requests a fresh rollback preview (W-C's
RPC) per draft fingerprint; any earlier edit invalidates it. Complete uses
returned names/levels, lists gains and outstanding warnings, links the
sheet, and NEVER mounts the level-1 backup hint (W-NO-BACKUP-HINT).
D118: in a resolution pass, Complete says the Boon choice is complete,
never "level N complete", and total/class levels are unchanged.
EXIT (unit row): one click = one level/revision/history operation; an
induced LU-2 failure leaves state unchanged.
