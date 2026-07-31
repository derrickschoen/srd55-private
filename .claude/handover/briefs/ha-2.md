# DISPATCH HA-2 — durable draft store and catalog authoring service (L, MINT, wt/attunement, PLAYWRIGHT_PORT=44486)

THE BINDING PLAN is docs/design/2026-07-30-homebrew-authoring-forms.md,
unit HA-2 in section 11 plus its cited sections (catalog_content_drafts,
per-kind document versions and migrations, strict incomplete codecs,
revision conflicts, create/read/save/discard, copy-from-published,
unknown-future recovery, no portable-draft leakage). Depends on HA-0 (merged
long ago), CI-2a, CI-2b (both merged).

AMENDMENTS (these WIN):
- D133: draft kinds are exactly species | background | subclass. No class
  drafts, no seam for them.
- D138 (design constraint now, UI later in HA-11): published creations will
  support (a) apply-to-all-characters on the fix-review, and (b) deletion
  INCLUDING with attached characters, reconciled with D99 as an
  archive-first cascade (creation + attached characters archived as one
  restorable set; purge from the archive view is what is permanent). YOUR
  unit must not make that impossible: the authoring service's
  published-content model needs a usage-index seam (which characters
  reference this creation — cheap query, not a stored denormalization
  unless the doc says so) and must not hard-code "published content is
  永-immutable-and-undeletable" into contracts that HA-11 cannot extend.
  Implement ONLY what the HA-2 unit row says; leave the cascade itself to
  HA-11.
- D139: drafts are NEVER portable (the doc already says no portable-draft
  leakage — hold the line: no draft may enter any export, share, closure,
  or library-export document).
MINTS YOU OWN: the catalog_content_drafts migration (next free number —
verify the tail) and the per-kind draft document versions (their own
registry per the doc, append-only from v1).
