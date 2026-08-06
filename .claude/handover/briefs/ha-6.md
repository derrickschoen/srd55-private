# HA-6 — L: Homebrew library and shared form components

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha6 (branch wt/ha6 from main).
Design row, docs/design/2026-07-30-homebrew-authoring-forms.md:898-900, VERBATIM:

> **HA-6 — L: Homebrew library and shared form components.** Route/screen,
> library tabs/badges, draft navigation/conflict UX, ordered-card controls,
> exhaustive effect cards, common validation summary, hostile-string tests.

Read the doc's HA-6 sections and edge list; .claude/decisions.md wins over the doc.
Prerequisites HA-2 (draft store) and CI-4a (adoption) are merged.

## Amendments
- D108 accessibility bar applies to every new screen/control (focus management,
  labels, keyboard reachability - follow the existing typed-PURGE modal focus-trap
  precedent).
- D133: no class authoring anywhere in the UI - species/background/subclass only.
- Hostile-string tests per the doc: names/descriptions containing HTML, quotes,
  emoji, RTL, NULs-adjacent control chars render inert (the DOM-sink discipline
  from D104-BACKSTORY-DOM-SINK).
- Drafts: src/authoring/draft-service.ts is the seam (revision-CAS conflicts -> the
  conflict UX this unit builds). Draft-export sentinels must stay green.
- SCOPE BOUNDARY: HA-5 (subclass backend) is being built in a PARALLEL lane. Do NOT
  touch src/authoring/*publisher*, src/grants/, src/backup/, or src/catalog/ beyond
  read-only imports of existing public seams. If a needed seam is missing, build
  against the draft-service and existing publishers' public API only, and NAME the
  gap in your report instead of reaching into backend files. Forms for species and
  background may wire to their merged publishers; the subclass timeline form is
  HA-8, NOT here - only the library/navigation shell and SHARED components land now.
- UI stubs of import results carry notices: [].

## Currency facts
- Migrations 0000-0037 FROZEN. This unit is EXPECTED MINT-FREE; if a migration
  seems required, stop and report.
- CI-8's adoption dialog (src/ui/content-adoption-dialog.ts) and its whenSettled()
  test pattern are the modal/async precedents; the mutation suite has anchors into
  UI sources - if you rename any anchored string, update
  tests/fixtures/content-identity-mutations.mjs in the same change and run the
  verifier (single-file vitest invocations; ps-guard first).

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard before every
  test command.
- Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo, no config edits,
  no weakened assertions, no test deletion (strict-superset only), never regenerate
  expectations from own output.

## Report
Per row clause built/partial; the a11y evidence per new control; hostile-string
coverage list; any named seam gaps; targeted vitest counts pasted; tsc -b exit;
exact git diff --stat tail. Distinguish ran from inferred.
