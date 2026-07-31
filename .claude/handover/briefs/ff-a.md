# DISPATCH FF-A — D104 flavor persistence and frozen contracts (L, MINT, wt/attunement, PLAYWRIGHT_PORT=44480)

THE BINDING PLAN is docs/design/2026-07-31-d104-flavor-fields.md sections 4
(storage and contracts), 5 (backup and share evolution), unit FF-A in
section 9. Implement exactly FF-A. FF-B (command+planner panel), FF-C
(sheet/print), FF-D (closeout) are NOT yours — no UI, no
update_character_flavor command yet.

AMENDMENTS (these WIN over the doc):
- D124 REPLACES section 5.2's verbatim/opt-in split: ONE share option
  ("include my written text"), default OFF, covers ALL FOUR fields
  (alignment, appearance, backstory, notes). The existing notes opt-in flag
  generalizes; no per-field flags. The compact-wire tuple still appends the
  three new members positionally (absence = null), but the EXPORTER gates
  all four on the single option.
- D124 size guard: the share encoder returns a TYPED too-large refusal when
  the encoded link exceeds the maximum from
  docs/design/2026-08-01-share-url-capacity.md (EXP-URL — if that doc does
  not exist yet, STOP and report; it gates this unit). Never a truncated or
  silently broken link. The refusal is structured data surfaced by FF-B
  later; you implement and test the encoder-side refusal.
- D122/D123/D125 do not touch this unit.

MINTS YOU OWN (verify each registry tail first): next free DB migration
(three nullable TEXT columns beside existing notes, with the
nullOrTextLengthAtMost CHECK helper per doc 4.2 — do NOT retro-tighten
notes); next free character-backup document version (doc 5.1: new fields
required string|null, historical v1/v2 map absence to NULL — never '' or
invented text); next free share-wire version (doc 5.2: freeze the current
module, append three members, adjacent null-padding migration, hand-authored
frozen fragment, SHA-256 pin every newly historical module); next free
character-state snapshot schema version (doc 4.3: freeze current
CHARACTER_STATE_COLUMNS first).

Also per doc 4.1: extend CHARACTER_TEXT_LIMITS in
src/domain/character-limits.ts (alignment 120, appearance 4000, backstory
20000 code points; notes stays 2000 for new writes, grandfathered longer
notes still export/restore). Row model, generated contracts, column facts,
schema signature, candidate-audit fixtures, column-portability map entries
(all four now behind the single opt_in classification), and the D104
negative-control candidates from doc section 8 rows D104-TEXT-CHECK,
D104-ABSENT-NOT-INVENTED, D104-BACKUP-ROOT, D104-WIRE-NULLPAD,
D104-NOTES-OPT-IN (adapted: the single toggle gates all four — prove one
share with the option off carries none of the four, on carries all present
ones). EXIT (doc unit FF-A): schema, compile, backup, wire-registry, and
round-trip tests pass; lossless old-document migrations proven.
