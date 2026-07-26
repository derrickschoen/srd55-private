# Loop log — codex-consensus

## Unit SHARE-VERIFY-01 — **COMPLETE** (closed 2026-07-25)

Deliverable: verify, tidy and ready the character-share-by-link feature.
Risk class: HIGH_RISK (untrusted-input parsing boundary; versioned data contract).
Authoritative verification source: supervisor rerun on this machine.

**Landed with explicit user approval:**
- `89ef860` Add character sharing by link (31 files, +9201/-72)
- `8c65c4b` Report share-import catalog gaps as structured diagnostics

**Final verification (supervisor rerun, not delegated):**
`npm test` 368 passed / 46 files · `npm run build` exit 0 · `npx playwright test`
41 passed.

**All six tick items closed:**
1. SCHEMA.md ↔ codec drift — strict fixed-length records; doc demoted to a
   design guide, `validateShareDocument` + codec are the contract.
2. `tsc -b` break — fixed with the `.buffer` idiom.
3. Three adversarial artifacts tidied — valid-tuple over-count fixtures, real DB
   instead of `{} as DatabaseContext`, collision test proving
   `spellcasting_ability` survives.
4. Negative-control gap closed — integration round-trips now traverse the real
   link, not the object path.
5. Three gates re-run and reported with real numbers.
6. Staged, diffed, message proposed, committed on approval.

**Twelve defects found and fixed**, none introduced by this unit — all latent
while 343 tests passed green. Every test file was checksum-verified against
tampering across three producer runs, so no fix was manufactured by editing an
assertion.

### Assumption register outcome

`.claude/assumptions/SHARE-VERIFY-01.md` — 19 entries. Six disproved, including
two of the supervisor's own:
- **A19** — I asserted a placeholder SOURCE could be upgraded in place "the way
  placeholder spells are". `CatalogImporter` imports SPELLS ONLY. Caught by a
  codex dispatch explicitly told to verify rather than accept. Had it shipped,
  users would have accumulated permanently unresolvable stubs behind a UI
  implying they were fixable. This finding is now a prerequisite of the
  catalog-agnostic track.
- **Magic Initiate reconciliation** — I argued failing on an off-list config was
  homebrew-compatible "because the recipient's catalog governs". It does not:
  `MAGIC_INITIATE_LISTS` is a hardcoded module constant and `feat_definitions`
  has no column that could express an allowed-list set. Disproved by reading the
  constant.

Both were reasoning-from-source errors that execution or targeted reading
caught. That is the pattern worth carrying forward.

**A16b** is recorded as *superseded, not verified*: codex's 2/32 → 7/32
negative-control claim was never independently reproduced, and later rounds
rewrote the tests underneath it. Stronger evidence replaced it; the distinction
is kept deliberately.

### Carried forward (not part of this unit)

- Known-ineligible-selection policy — never a defect; its test passes and
  documents current behaviour. Likely subsumed by the deferred tolerance work.
- Automatic import repair — placeholder sources, synthetic slots, adjustment
  persistence, zero-slot ordinal remapping. Deferred by owner direction
  ("fail early unless there is an obvious mechanical fix"); codex's full
  tolerance plan is the roadmap.

---

## Successor work — five planning tracks (no loop attached)

Running as three background workflows, planning only. Each track: assumptions
with proof attempted → plan → independent adversarial review → revision to
consensus, rejected findings argued rather than dropped.

1. Character-model expansion — HP, AC, armour, weapons, skill/save proficiencies
   (all structurally absent from the schema, not merely unexposed).
2. Guided single-class builder + completeness warnings.
3. Bundled SRD 5.2 (CC-BY-4.0) + agent-readable reference.
4. Dev-only local Claude/codex CLI chat bridge — security-weighted; "cannot
   reach production" is the primary requirement, asserted not assumed.
5. Catalog-agnostic content model — generalised non-spell import, provenance,
   and the bundled-versus-imported licence boundary.

Track 5 reports its interface assumptions about the other four so conflicts are
reconciled before implementation rather than discovered during it.

**No cron loop is attached to these.** They are user-driven; the hourly tick
existed for SHARE-VERIFY-01 and retires with it.
