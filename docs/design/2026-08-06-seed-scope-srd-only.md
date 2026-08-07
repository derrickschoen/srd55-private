# Seed-scope design pass — SRD-only boot + bundled-homebrew import option

Produced 2026-08-06 by a read-only codex design pass against main 1888569,
commissioned by the supervisor after D215/D216 grew the VET-REPUB unit.
This is a PROPOSAL, not a ruling. `.claude/decisions.md` outranks it.
Owner questions from section F were put to the owner; their answers become
decisions and supersede anything here that conflicts.

# PLAN — SEED-SCOPE

## A. Sequencing

1. Split into two mergeable units with a hard boundary; the catalog unit must land first.
2. `BUNDLED-HOMEBREW-CATALOG`: add the typed Veteran/Barbed Court payload, generic install service, import-page option, HA publisher routing, portability tests, and Barbed Court third-caster coverage. Leave current seeds temporarily intact.
3. `SRD-ONLY-RETIREMENT`: run the one-time cleanup, remove the three bundled seeds/manifest entries, delete EK/AT runtime/test/fixture references, and convert remaining assertions.
4. Never merge retirement first: Barbed Court must already exercise every retained third-caster seam before EK/AT coverage disappears.
5. Scrub stale public design/progress claims as well as code; retain `.claude/decisions.md` as the binding historical record.

## B. Mint

- Do not mint a schema migration `0040`; no schema change is required. A data-only `0040` would be invisible to the schema-signature detector in [migrations.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/db/migrations.ts:500).
- Register a checksum-frozen semantic migration such as `retire_non_srd_bundled_subclasses_v1` in [catalog-data-migrations.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/catalog/catalog-data-migrations.ts:30). It already runs once, before seeding, on open/restore.
- In one transaction, target only bundled keys `2024:subclass:ek`, `2024:subclass:at`, and `2024:subclass:veteran`; never touch asserted external keys.
- Capture affected definitions/characters; set their `character_class_levels.subclass_definition_id` to `NULL`, preserving character, class, level, abilities, and equipment.
- Remove retired subclass source trees and their generated slots/selections/effects; invalidate affected savepoints/operations so stale IDs cannot be replayed.
- Remove drafts based on retired roots, match decisions, and supersession edges involving them; preserve external successors as standalone external content. Temporarily suspend and restore 0039’s delete guard inside this scoped migration.
- Delete feature/progression roots, fingerprints/aliases, and bundled identities; finish with `foreign_key_check` and the semantic-migration marker.
- Ordinary boot cannot perform this retirement: omitting seed/manifest entries leaves stored roots, and reconciliation enumerates stored bundled-stable identities in [bundled-content-registry-v1.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/catalog/bundled-content-registry-v1.ts:232).

## C. The import option

- Commit a typed `readonly HomebrewDraft[]` payload in a new `src/authoring/bundled-homebrew-catalog.ts`; do not use Tier-1 JSON, whose subclass format cannot carry dense progression or grants.
- Store exact full feature prose in that payload, with deterministic item UUIDs/rule keys. Tests independently compare it with the two authoritative Markdown documents and enforce code-point/document limits.
- Veteran publishes as `2024:content.subclass:veteran`; Barbed Court as `2024:content.subclass:warrior-of-the-barbed-court`, parent Monk, Wisdom, `third_down`, and exactly 20 dense rows.
- Add a generic authored-kind installer to `CatalogAuthoringService`; current entries dispatch to HA-5, while the shape remains capable of using the existing species/background publishers later.
- Each entry is staged as a real draft, then runs `previewPublish`/`commitPublish` in [draft-service.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/authoring/draft-service.ts:822), through [subclass-publisher.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/authoring/subclass-publisher.ts:402), and finally the shared immutable installer in [portable-content.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/backup/portable-content.ts:1258).
- Install both entries atomically. An identical current `content-v1` fingerprint produces `matched_existing` and no new root; same key/different fingerprint refuses; cloning requires explicit review and is never automatic.
- Present “Import bundled homebrew” beside the existing catalog file control in [import-backup-controls.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/ui/screens/character-list/import-backup-controls.ts:318), with preview, two-entry summary, disabled-in-flight behavior, and accessible status/error output.

## D. Test conversion ledger

- `class-progression.test.ts`: move Veteran assertions to external-publish tests; replace 40 EK/AT rows with Barbed Court’s exact 20-row Wisdom schedule, 13 fixed spells, grants, prose, and fingerprint.
- **Finding:** EK/AT-specific 2→3 versus 3→4 cantrip variants cannot survive as catalog facts; the machinery intent survives through Barbed Court’s authoritative 2→3 schedule plus all slot breakpoints.
- `bootstrap.test.ts`: fresh/reset/repair now pin exactly twelve SRD subclasses and zero bundled override schedules; add migration-upgrade and no-reappearance cases.
- `bundled-content-registry-v1.test.ts`: remove three bundled anchors; prove SRD-only manifest plus separately published external Veteran/Monk fingerprints.
- `homebrew-catalog-fixture.test.ts`: expect twelve bundled keys; use SRD Champion for bundled-key/name collision protection.
- `level-up-wizard.test.ts`: default choices become one SRD subclass per class; after explicit catalog install, Monk also offers Barbed Court and Rogue offers Veteran.
- `character-sheet-resources.test.ts`: install Barbed Court, attach it to Monk 3, and retain the sole-subclass-caster two-slot assertion.
- `spell-access.test.ts`: replace the manual intelligence fixture with installed Barbed Court, Wisdom math, and a real curated spell grant.
- `level-up-class.test.ts`: use Champion/Thief for parent mismatch; convert the planned subclass-spell locator case to Barbed Court.
- `invariants.test.ts`: use Champion attached to Fighter when proving rejection under Wizard.
- `multiclass-slots.test.ts`: rename both independent third-down contribution operands to Barbed Court fixtures while retaining pre-sum rounding boundaries.
- `character-sheet.test.ts`, `sheet-view.test.ts`, and `agent-reference.test.ts`: replace the hard-coded fifteen-subclass claim with SRD-only default wording plus explicit import extensibility.

## E. Risks

- Fresh images and reset contain SRD only; the catalog appears only as an option and no install receipt/content is written until clicked.
- Migration and both manifest removals must land together, or the seeder/reconciler can recreate retired content.
- Character backups and library exports carry complete external subclass aggregates through [portable-content.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/backup/portable-content.ts:647).
- Share links currently carry only subclass keys, not aggregate bytes, in [character-share.ts](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/sharing/character-share.ts:1395); a recipient must install the catalog first.
- A Thief rogue-9 is untouched. An old bundled-Veteran rogue-9 survives as a rogue-9 but loses its subclass attachment and undo history; EK/AT characters likewise lose retired subclass-generated spell state. Require an upgrade fixture and recommend a database backup before refresh.
- Future edits cannot reuse the same asserted name/key with different bytes; they need an explicit bundled-catalog revision policy.

## F. Owner questions

1. Must share links be self-contained for these subclasses, or is “install bundled homebrew, then reopen the link” acceptable?
2. For an existing bundled-Veteran character, is detach-and-preserve-the-character correct, or should upgrade abort and demand a backup/manual decision?
3. When shipped catalog prose changes later, should it refuse as a same-key collision, or publish a renamed successor and record lineage?
