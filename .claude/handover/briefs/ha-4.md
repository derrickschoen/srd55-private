# HA-4 — XL: background backend

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha4 (branch wt/ha4 from main).
Design row, docs/design/2026-07-30-homebrew-authoring-forms.md:886-890, VERBATIM:

> **HA-4 — XL: background backend.** Definition/template/equipment/effect
> aggregate, reference resolution, typed default feat/skills, generalized
> choice/equipment application, D102 boundary, projector vectors, and full
> rollback fixtures. Exit also requires HA-EXTERNAL-SELF-MATCH for a
> byte-identical installed external background.

Read the doc's HA-4 sections and edge list; .claude/decisions.md wins over the doc.

## Amendments from rulings newer than the doc
- D133: no class authoring. D138 usage-index seam (as ha-2.md). D139: closure
  vocabulary feeds the background export closure through the CI-5 portable
  machinery (src/backup/portable-content.ts) - no parallel path.
- D198: asserted name-derived keys via the shared normalization
  (src/catalog/catalog-key.ts), typed collision refusals. CI-4a edge discipline:
  previewPublish/commitPublish silently adopts ONLY the exact byte-identical
  no-metadata-conflict self-match; alias/compatible-fingerprint/SRD-fallback/
  metadata-conflict adoptions require review even without UI. D205: no legacy
  anything.

## Follow HA-3's merged precedent (it is on main - read it first)
- src/authoring/species-publisher.ts is the sibling: draft-to-semantic validation
  COLLECTING every unresolved field path (not first-error), the common publisher
  seam, atomic install with LAST-STEP rollback fixture, explicit-Match success
  path, remembered-decision opt-out for authoring.
- Provenance-gated grant dispatch (src/grants/skill-grants.ts): authored rule
  keys must not impersonate bundled plans - background defaults must obey the
  same gate.
- Target-local template_ref discipline: HA-3 bound species effect provenance to
  portable trait identity with typed unresolved notices. Background effects must
  get the SAME treatment in character import (extend the notice vocabulary, do
  not fork a second mechanism). The CI-5 remaining item is still open for the
  background kind - closing it for background is IN SCOPE here.

## Currency facts
- Migrations 0000-0036 FROZEN. You own mint 0037 IF genuinely needed; if you
  mint: full four-way lockstep + every COMMON.md checklist inventory. Prefer
  mint-free if existing schema fits (HA-3 needed no mint).
- background_definitions/templates are applied from templates; the publisher owns
  external writes; registry-first triggers refuse unregistered inserts (1811).
- Backup v5; character import returns typed notices[]; UI stubs carry notices: [].

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard
  (`ps -eo args | grep -E "vitest|playwright" | grep -v grep`, abort if nonempty)
  before EVERY test command.
- Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo, no config
  edits, no weakened assertions, no test deletion (strict-superset only), never
  regenerate an expectation from own output.
- XL honesty allowance: coherent subset with the remainder NAMED beats a hollow
  whole.

## Report
Per row clause built/partial/not-started; HA-EXTERNAL-SELF-MATCH status; D102
boundary statement; mint decision with evidence; targeted vitest counts pasted;
tsc -b exit; git diff --stat tail. Distinguish ran from inferred.
