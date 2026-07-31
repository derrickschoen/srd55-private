# DISPATCH W-B2 — Feat/ASI and Epic Boon card surfaces (M, MINT-FREE, wt/print, PLAYWRIGHT_PORT=44472)

THE BINDING PLAN is docs/design/2026-07-31-level-up-wizard-route-ui.md:
sections 4.4 (feat/ASI — 17 cards from FeatApplicationPlan), 4.5 (Epic Boon
defer/resolution), unit row W-B2 in section 6, test rows W-FEAT-17,
W-FEAT-COVERAGE, W-EPIC-DEFER, W-COLOR-SIGNAL in section 7.1. Implement
exactly W-B2 on top of merged W-B1. W-C/W-D/W-E are NOT yours.

AMENDMENTS (these WIN): D118 replaces the doc's OQ-1-conditional section
4.5 shape — there is NO forced epic_resolution route variant. A deferred
Epic Boon shows W-B1's choice surface; choosing "resolve now" renders YOUR
Boon cards (same 17-card renderer, qualified Boons only) in a resolution
pass whose rail is Boon → Review → Complete with no level added; choosing
"proceed" runs the ordinary pass with the pinned epic_boon_deferred warning
visible. Both paths coexist per the merged pending_epic_resolution state.
D119: unmet/unprovable/disabled presentation per W-B1's merged conventions.

Card requirements (plan 4.4, all from the backend plan — no UI inference):
name/category/minimum/repeatability + qualified|unmet|unprovable + every
named eligibility reason; ability point budget/allowed/cap generated from
the returned plan never a UI table; effect + grant-rule + sourced-text +
undetermined-number sections all rendered (W-FEAT-COVERAGE); only qualified
cards contain a selectable radio; unmet/unprovable cards keyboard-focusable
with reasons in aria-describedby and NO selection action; ASI is one card
marked "class default"; a zero-point feat says it grants no increase; Magic
Initiate config collected here but its spell locators deferred to Spells
(W-D); Skilled's tool alternative stays sourced text, never a false owed
skill (D102).
