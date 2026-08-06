# HA-8 — XL: subclass timeline form

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha8 (branch wt/ha8 from main).
Design row, docs/design/2026-07-30-homebrew-authoring-forms.md:903-905, VERBATIM:

> **HA-8 — XL: subclass timeline form.** Parent, spellcasting/progression grid,
> level groups, feature/effect ordering and moving, preview/publish, threshold
> browser journeys.

Prerequisites HA-5 (subclass backend) and HA-6 (library/components) merged; HA-7
(species form) merged and is the FORM PRECEDENT — follow it. Read the doc's HA-8
section; .claude/decisions.md wins.

## Build on merged seams (HA-7 set the pattern - reuse, do not fork)
- src/ui/authoring/form-components.ts, src/ui/modal-trap.ts (ONE modal
  discipline), the publish dialog in content-adoption-dialog.ts, the draft
  conflict modal, the router dirty-guard seam.
- src/authoring/subclass-publisher.ts public API. Its rules bind the form:
  bundled parents only (D133), dense 20-level progression when spellcasting/
  overriding (root_only = unchanged copy-from-published only), collect-all
  validation paths -> the validation summary.
- HA-7's review lessons apply PRE-EMPTIVELY: pin EVERY refusal path through the
  real service; save/reload/rehydrate byte-equality through the production codec;
  dirty lifecycle through the real router seam; full-aggregate equality not
  field samples; journey must prove PERSISTED character effects (a threshold
  feature's mechanic on a real character), not DOM only; budget arithmetic
  documented (measured guided baseline + reserves, headroom stated).
- The progression GRID is the XL heart: 20-level editing with slot counts,
  monotonicity/gap validation surfaced inline, level-group feature ordering and
  moving (keyboard-reachable per D108), multiple effects per feature.
- Hostile strings inert in every new render path.

## Currency facts
- Migrations 0000-0037 FROZEN on main; a PARALLEL lane (CI-7, wt/ci7) carries
  unmerged mints 0038/0039 — do NOT mint in this lane; if a migration seems
  needed, stop and report. Do not touch src/authoring/*publisher*, src/catalog/,
  src/backup/ beyond public-API imports.
- If you rename any anchored string, update
  tests/fixtures/content-identity-mutations.mjs anchors and run the verifier
  (ps-guard first).

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard before EVERY
  test command. Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo,
  no config edits, no weakened assertions, no test deletion (strict-superset
  only), never regenerate expectations from own output.
- XL honesty: coherent subset with remainder NAMED beats a hollow whole.

## Report
Per row clause built/partial; refusal-path pin list; journey spec path + persisted
assertions; a11y evidence for the grid/ordering controls; targeted vitest counts
pasted; tsc -b exit; exact git diff --stat tail. Distinguish ran from inferred.
