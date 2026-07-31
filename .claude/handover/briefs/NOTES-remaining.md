# Author-notes for briefs not pre-written (Opus writes these from the template + design doc + this note)

General: use .claude/handover/brief-template.md structure + COMMON.md
concatenation. Every brief: name the unit's design-doc row, quote its exit,
list amendments from rulings newer than the doc. Ports: next unused from
the ledger in lane-state.md.

- **FF-B** (M, mint-free, after FF-A): D104 doc section 6.1 —
  update_character_flavor command (one atomic 4-field write, one
  revision/inverse), planner "Character details" panel, single Save,
  D71 disabled-submit. AMEND: the share-option UI wording covers all four
  fields (D124). Control: D104-FLAVOR-ATOMIC.
- **FF-C** (M, mint-free, after FF-A): doc 6.2 — CharacterFlavor sheet
  object, visible-when-present section, freeTextSpan-only rendering,
  unverified suffix, sheetFacts exclusion, print presence. Controls:
  D104-BACKSTORY-DOM-SINK, D104-NO-FLAVOR-FACTS, D104-PRINT-PRESENCE.
- **FF-D** (S): doc section 9 closeout row.
- **AR-B** (M, mint-free, after AR-A): D99 doc 3.2 — archive/restore/
  purgeArchived replacing delete everywhere (client, worker, CRUD), list
  partition queries, active-root guard on every mutating path. Controls:
  D99-LIST-PARTITION, D99-PURGE-ARCHIVE-ONLY, D99-ARCHIVED-ROUTE-GUARD.
- **AR-C** (M, after AR-A): doc 4.2/4.3 — Duplicate = export→rename→import
  composition over the EXISTING backup engine, collision-safe suffix
  naming with post-truncation comparison. Control: D99-DUPLICATE-D62.
- **AR-D** (L, after AR-B+AR-C): doc 5 — list actions, /archive screen,
  typed-PURGE modal per the existing focus-trap precedent. Controls:
  D99-NO-MAIN-PURGE, D99-PURGE-CONFIRMATION, D99-DOUBLE-SUBMIT.
- **AR-E** (S): doc 8 closeout row.
- **CI-3c, CI-3b, CI-3s, CI-4a, CI-4b** (mint lane, serial): HA/CI doc
  section 11 rows verbatim; CI-3b reproduces HA-1's vectors like CI-3a;
  CI-4a's adoption discipline is quoted in the doc's edge list (only exact
  derived-primary byte-identical no-metadata-conflict self-match adopts
  silently — hold codex to it). No new amendments beyond D133.
- **HA-3, HA-4, HA-5** (XL, mint lane): doc rows verbatim + the
  HA-EXTERNAL-SELF-MATCH exit each row names. AMEND each: D133 (no class
  authoring), D138 usage-index seam (as in ha-2.md), D139 (closure
  vocabulary from HA-1 feeds each kind's export closure).
- **HA-6..HA-9** (forms, side lanes): doc rows; D108 a11y bar; hostile-
  string tests per doc; D133 note.
- **HA-10** (XL): consumer cutover; the doc's "keep classes bundled-only"
  line is D133 — quote both.
- **HA-11** (XL): edit-as-version + D138 IN FULL: apply-to-all button on
  the review screen (explicit, shows before/after), delete-with-attached-
  characters as the archive-first cascade (creation + characters archived
  as one restorable set; purge from archive view permanent; restore
  restores the set). This is where the D138 taken-for-now reading gets
  implemented — if codex finds the cascade semantics underspecified, that
  finding goes to the owner before implementation, not after.
- **HA-12** (L): doc row + D139 library-export UI (whole or selected
  subset) + reference-only share stands.
- **CI-6/7/8**: doc rows verbatim.
- **Publish-prep** (after gate): HANDOVER section 5 "Gate and publish
  prep" lists every artifact and its ruling; build all, run nothing
  outward, STOP.
