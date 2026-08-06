# HA-3 — XL: species backend

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha3 (branch wt/ha3 from main).
Design row, docs/design/2026-07-30-homebrew-authoring-forms.md:880-885, VERBATIM:

> **HA-3 — XL: species backend.** Draft-to-semantic validation, typed supported
> grant cards, atomic definition/template/trait/effect install through the
> common publisher, projector vectors, and generalized species application.
> Includes HA-PASSTHROUGH, refusal of unresolved authored effect payloads, and
> generated `template_ref` proof. Exit also requires HA-EXTERNAL-SELF-MATCH for
> a byte-identical installed external species.

Read the doc's HA-3 sections and edge list; .claude/decisions.md adjudications win
over the doc wherever they conflict.

## Amendments from rulings newer than the doc
- D133: NO class authoring — species only here.
- D138 usage-index seam: same forward-compatible seam ha-2.md carried — do not
  paint HA-11 into a corner; no UI.
- D139: the closure vocabulary from HA-1 feeds the species export closure —
  species aggregates must project/export through the same portable-content
  machinery CI-5 landed (src/backup/portable-content.ts), not a parallel path.
- D198 SUPERSESSION: where the doc says derived/digest-derived keys, the ruling
  is ASSERTED name-derived keys via the shared normalization
  (src/catalog/catalog-key.ts) with typed collision refusals. The CI-4a edge
  discipline still binds: authoring previewPublish/commitPublish must silently
  adopt only the exact byte-identical no-metadata-conflict self-match; alias,
  compatible-fingerprint, SRD-fallback, and metadata-conflict adoptions cannot
  bypass review even without a UI button.
- D205: wipe-and-reseed world; no legacy-opaque anything.

## Currency facts (binding)
- HA-2's draft store is merged: catalog_content_drafts (species|background|
  subclass), revision-CAS, copy-from-published — your input documents live there
  via src/authoring/draft-service.ts. Draft-export sentinel pins exist in
  tests/integration/authoring/draft-export-boundaries.test.ts — do not break them.
- CI-5 merged: backup v5 complete content manifest, spell identity sidecar,
  asserted-key derivation enforced at import validation. Registry-first triggers
  refuse unregistered content inserts (sqlite error 1811) — install through the
  registry seam.
- Migrations 0000-0036 FROZEN. You own mint 0037 IF a migration is genuinely
  needed. If you mint: full lockstep (drizzle SQL + src/db/schema.sql + trigger
  source + composer, sha-proven idempotence) AND every hand-authored inventory in
  the COMMON.md mint checklist (prefix inventory in
  tests/helpers/catalog-data-migration-prefixes.ts, autoincrement census, CHECK
  coverage, signature counts, row contracts, .ai anchors, checksums for the new
  migration only).
- species_definitions/background_definitions are NEVER written by app code
  outside the publisher seam; templates are the application source.

## Standing constraints
- Leave all work UNCOMMITTED; the supervisor commits.
- No second-agent CLIs (claude, gemini, etc.).
- NO full vitest suite, NO Playwright, NO build. Targeted vitest only; ps-guard
  (`ps -eo args | grep -E "vitest|playwright" | grep -v grep`, abort if nonempty)
  before EVERY test command.
- Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo, no config
  edits, no weakened assertions, no test deletion (strict-superset only), never
  regenerate an expectation from our own output.
- XL honesty allowance: if the full row cannot land in one dispatch, land a
  coherent subset with the remainder NAMED explicitly — an honest partial beats a
  hollow whole.

## Report
Per row clause: built/partial/not-started. HA-EXTERNAL-SELF-MATCH exit status.
Whether you minted 0037 and the checklist evidence if so. Targeted vitest counts
pasted; `npx tsc -b` exit; `git diff --stat` tail. Distinguish what you ran from
what you infer.
