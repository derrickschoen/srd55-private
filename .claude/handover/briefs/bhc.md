# BHC — bundled-homebrew catalog + click-to-import

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-bhc (branch wt/bhc off
main). PLAYWRIGHT_PORT=4778. Read .claude/handover/briefs/COMMON.md first.
NO schema migration — see "Mint" below. No second-agent CLIs.

This is the FIRST of two seed-scope units and MUST merge before the second
(the SRD-only retirement). Nothing here removes any existing seed; the
current seeds stay intact for this unit. Do not touch them.

## Binding rulings — read them in .claude/decisions.md before coding
D215 (SRD-only default seed; bundled homebrew is a click-to-import option
installed through the REAL publish path), D219 (revisions publish a
successor with lineage — CI-7 ALREADY BUILT THIS, reuse it), D218 (full
export carries non-SRD content; share links try-then-warn), D222 (a
deliberately boring third-caster carries the test pins), D223 (third-caster
ladders are DERIVED from the SRD Multiclass Spellcaster table, never
transcribed). The design pass is
docs/design/2026-08-06-seed-scope-srd-only.md — it is a proposal; the
decisions file outranks it, and D217/D222 already supersede parts of it.

## Deliverables

1. A committed, typed bundled-homebrew catalog payload (the design pass
   proposes src/authoring/bundled-homebrew-catalog.ts as typed drafts
   rather than Tier-1 JSON, because the JSON subclass format cannot carry
   dense progression or grants — verify that claim yourself and say so).
   Contents:
   - Veteran rogue, prose from
     docs/homebrew/2026-08-04-rogue-veteran-subclass.md
   - Barbed Court Monk, prose from
     docs/homebrew/2026-08-03-monk-barbed-court.md. CONTENT ONLY — per
     D222 it carries no test pins.
   - The D222 boring third-caster: a deliberately minimal owner-authored
     subclass whose only job is to exercise third-caster seams. Give it a
     plain name and plain prose. Its slot ladder is COMPUTED per D223 as
     MulticlassSpellcasterTable[floor(class_level / 3)] from the SRD
     table — write the derivation as code with the SRD table as its
     input, and pin that the derivation reproduces the ladder. Its
     spells-known counts are its own design choice, NOT copied from
     anything.
2. Tests that independently compare the payload's prose against the two
   authoritative markdown documents and enforce the authoring field
   limits.
3. A generic authored-kind installer that stages each entry as a REAL
   draft and runs previewPublish/commitPublish through the existing
   HA-5/HA-7/HA-9 publishers. There must be exactly ONE install route —
   if you find yourself writing a second path that bypasses the
   publishers, stop and report it.
4. Idempotence: an identical current content-v1 fingerprint is a no-op
   (matched_existing, no new root). Same key with different bytes
   publishes a SUCCESSOR WITH LINEAGE through CI-7's machinery (D219) —
   build no new lineage plumbing; if you need to, that is a finding.
   Install the entries atomically.
5. The click-to-import option beside the existing catalog file control
   (import-backup-controls.ts) with preview, an entry summary,
   disabled-in-flight behavior, and accessible status/error output. It
   reuses the shared modal/adoption dialogs — do not fork them.
6. D218 verification task: character backup already calls
   `exportPortableContentClosure`. VERIFY whether full export already
   carries non-SRD library data end to end. If it does, deliver a PIN
   proving it, not a feature. Report which it turned out to be. The
   share-link try-then-warn half is NOT in this unit — report what you
   learned about the link budget so the next unit can scope it.

## Lessons already paid for (the reviewer checks these first)
1. COMPILE GATE IS `npm run build` (COMMON.md 2b), holder objects for
   closure-assigned test callbacks.
2. After touching an exported contract constant, grep for tests asserting
   its shape and RUN them.
3. Refusal censuses assert every path + code + message individually;
   rollback censuses count by captured IDs.
4. Journeys: exact role+name selectors, never hasText; route-owned
   readiness; cross-route global-ready check after reload.
5. aria-label on the MOUNT only; D108 behavior-asserted; hostile strings
   inert at every new render path.
6. Disclosure comes from the registry, never key-prefix inference; a
   missing registry row says UNKNOWN (HA-10's findings 7 and 8).

## Mint
Do NOT mint a schema migration. The design pass argues a data-only 0040
would be invisible to the schema-signature detector and that the semantic
catalog-data-migration seam is correct — but nothing in THIS unit needs
either, since installing is a normal publish. If you conclude otherwise,
STOP and report.

## Browser journey (budget: document the arithmetic, x1.5 reserve;
measured precedents 14.8s HA-8, 18.2s HA-9)
Fresh database -> character list -> click Import bundled homebrew ->
review -> confirm -> all three appear in the homebrew library with
external-layer disclosure -> create a character taking the boring
third-caster -> assert its DERIVED slots persist -> re-run the import and
assert it is a no-op -> reload with route-owned readiness -> unchanged.

## Report
Terse. Per deliverable: file:line, the pin, targeted counts pasted, then
`npm run build` exit code and the journey result. Answer the two explicit
questions (Tier-1 JSON adequacy; D218 already-satisfied or not). Claims
without citations are treated as unbuilt.
