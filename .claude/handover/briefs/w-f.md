# DISPATCH W-F — entry points and acceptance closeout (M, MINT-FREE, wt/print, PLAYWRIGHT_PORT=44476)

THE BINDING PLAN is docs/design/2026-07-31-level-up-wizard-route-ui.md:
section 4.1 item 1 (entry links), unit row W-F in section 6, test rows
W-ENTRY-BOTH, W-NO-SHADOW, W-KEYBOARD, W-INCOMPLETE (7.3), and THE WHOLE OF
section 7.4 (acceptance-walkthrough extension) EXACTLY as written there —
including replacing the three seam-comment lines, the numbered steps 1-8,
and the acceptance negative-control table AW-ROUTE..AW-RELOAD. Implement
exactly W-F on top of merged W-E.

Constraints: sheet gains the primary Level Up link BEFORE the secondary
Open planner link (D85/D111); every character-list card gains the same link
via levelUpPath — no string duplication; the walkthrough consumes
ACCEPTANCE_WIZARD_2_CHOICES from W-C's fixture (already merged and proven —
select by explicit label/name, never snapshot production output); the
HP 9 → 16 oracle and Arcana Expertise +5 are hand-pinned expectations from
the plan's P22/P25/P26/P29 (already proven against merged rules). Also add
the focused browser journeys the 7.3 table assigns to W-F's rows. This
closes bar item 3 (D54/D112): say so explicitly in your report with the
walkthrough's pasted output.
