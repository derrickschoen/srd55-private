# DISPATCH W-D — planned Skills/Expertise/Spells wizard UI (L, MINT-FREE, wt/print, PLAYWRIGHT_PORT=44474)

THE BINDING PLAN is docs/design/2026-07-31-level-up-wizard-route-ui.md:
section 4.6, unit row W-D in section 6, test row W-LU2-DRAFT in 7.1.
Implement exactly W-D on top of merged W-C. W-E is NOT yours.

CORE DISCIPLINE (plan 4.6): these steps mutate ONLY the in-memory draft.
They never call guided creation's durable fill/assign RPCs — LU-2
revalidates and applies every logical locator in the one final command
(W-E's Confirm). Skills use source/rule/ordinal identity with the granting
source labelled; Expertise follows every skill screen and offers only
returned active proficient skills without existing Expertise; Spells reuse
createSpellPicker presentation with search via levelUpPlannedEligibleSpells
using the exact merged locator/revision; new choices vs acquisitions vs
optional swaps visibly distinct; skipping an optional swap preserves the
current spell; deferring an owed choice leaves the durable generated choice
unfilled and warned (D70/D95). Upstream draft edits clear stale downstream
selections. The W-LU2-DRAFT negative control (call-guided-assign-on-select:
zero-command spy must fail) is mandatory.
