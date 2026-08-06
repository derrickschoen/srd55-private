# DISPATCH CI-4b — WIPE AND RESEED: legacy-opaque leaves the vocabulary (XL, MINT 0034)

`.claude/decisions.md` is law. Read D205 (owner: "Wipe old stuff and reseed in all
cases. No users yet"), D208 (zero-users window open until the owner's first real
campaign), D203, D198. This brief supersedes the design doc's CI-4b row (rekey/alias/
backfill) entirely per D205 - no rekeying, no aliases, no backfill.

## The unit in one sentence

Migration 0034 deletes every legacy-opaque identity, its aggregates, and the
dev-debris character rows referencing them; reseeding restores all bundled content
under the current scheme on next boot; and 'legacy-opaque' is REMOVED from the
vocabulary so the classification itself dies.

## Facts you may rely on (supervisor-commissioned inventory, verified citations)

- legacy-opaque = 0020's backfill + 0020-0033 trigger minting; CLOSED since 0033.
- Boot self-heal already flips bundled-manifest matches to bundled-stable
  (bundled-content-registry-v1.ts:302-315, spells-srd.ts:803-810 and kin), so what
  survives in any pre-existing image is: genuinely-external pre-0033 rows, and
  item_definitions rows (NO items reseed path exists - orphaned item debris).
- Aggregate FKs to catalog_content_identities are RESTRICT; character-facing tables
  (character_class_levels, spell_loadout_entries, spell_selection_slots,
  wizard_spellbook_entries, character_spell_preferences) RESTRICT against aggregates.
  Deletion order in 0034: character-facing referencing rows -> aggregate detail
  cascades -> aggregates -> identities (aliases/fingerprints cascade;
  catalog_content_match_decisions is restrict - delete decisions referencing wiped
  identities first).
- Share fragments could carry legacy keys outside the DB: zero users, no real
  fragments exist - record as an accepted non-issue in a comment, do not build for it.

## Requirements

1. MIGRATION 0034 (schema.sql + trigger source + composer in lockstep; composer
   idempotence sha-proven): the wipe in correct FK order, then the CHECK vocabulary
   and key/layer pairing lose 'legacy-opaque' everywhere (identities CHECK,
   row-rules.ts:99 pairing, any trigger text). Existing non-legacy rows byte-preserved.
2. DEAD CODE DIES (D207 license): the self-heal legacy-flip branches
   (ensureBundledRegistryRoot's legacy acceptance, reconcileBundledSpellEntry's flip,
   ensureBundledStableContentIdentity's legacy pass-through) are deleted - after 0034
   the state they handle cannot exist. While in enums.ts or adjacent files, delete
   available_on_long_rest if you touch its file (report it).
3. RESEED: next boot after 0034 restores all bundled content through the existing
   seeders/registry (this should already work - prove it: migrate a pre-0033-shaped
   image containing legacy-opaque bundled+external+item rows and a character
   referencing them, boot, assert bundled content is back under bundled-stable keys,
   external/item debris and the referencing character rows are GONE, zero
   legacy-opaque anywhere).
4. TESTS - adjudicated updates, list every flip old->new:
   - migrations.test.ts legacy-preservation pins (0033-era) stay as historical
     migration behavior BUT extend: after 0034, zero legacy-opaque rows and the
     vocabulary is gone (insert attempts fail the CHECK).
   - The six integration files seeding legacy-opaque as a convenient fixture shape
     flip to asserted/bundled-stable via the shared fixture helper.
   - content-registry.test.ts closed-vocabulary base case updated to the new set.
   - CI4A-H1's zero-legacy-opaque pin gets stronger, not weaker.
5. Hand-authored oracles; name any ordering or identity you decide NOT to pin, and
   why. The wipe scenario fixture (pre-0033 image) is hand-authored bytes, not
   generated from our own migration output.

## Law

Migrations 0000-0033 FROZEN; 0034 + schema.sql + trigger source + composer are this
lane's mint. No any/@ts-ignore/@ts-expect-error/.skip/.todo, no config edits, no
weakened assertions beyond the adjudicated flips above, no test deletion (strict
superset). No second-agent CLIs (D207, standing in COMMON.md).

CONCURRENCY: before EVERY test command:
`ps -eo args | grep -E "vitest run|playwright test" | grep -v grep`; anything not
yours -> wait 60s, re-check. Targeted vitest only; no full suite; no Playwright.

Scale: XL. If it does not fit one dispatch, land the migration + wipe + reseed proof
FIRST, report honestly what remains.

Report: 0034's deletion order, the vocabulary-removal diff sites, the reseed proof
with real numbers, dead code deleted, test flips old->new, targeted numbers,
ran-vs-asserted.
