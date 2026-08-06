# HA-7 — L: species form

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha7 (branch wt/ha7 from main).
Design row, docs/design/2026-07-30-homebrew-authoring-forms.md:901-902, VERBATIM:

> **HA-7 — L: species form.** Root fields, known-plus-custom controls, traits,
> effects, supported grants, preview/publish, browser journey.

Prerequisites HA-3 (species backend) and HA-6 (library + shared form components)
are merged. Read the doc's HA-7 section; .claude/decisions.md wins.

## Build on the merged seams — do not fork them
- Form components: src/ui/authoring/form-components.ts (ordered cards, effect
  cards, validation summary, dirty-navigation guard through the router seam).
- Draft store: src/authoring/draft-service.ts (revision-CAS; the conflict modal
  from HA-6 handles conflicts — reuse it).
- Publisher: src/authoring/species-publisher.ts public API (previewPublish/
  commitPublish shapes; collect-all validation paths feed the validation summary;
  the CI-4a review discipline surfaces through the common adoption dialog).
- Known-plus-custom controls: HA-PASSTHROUGH open vocabularies (creature types,
  sizes, damage types) — known options offered, custom text allowed, rendered
  inert (hostile-string discipline).
- D108 a11y bar on every control; D133 (species only, no class anywhere).

## Browser journey
Author the Playwright journey spec (create draft -> fill root fields/traits/
effects/grants -> preview -> publish -> species appears in the library and is
applicable to a character). You CANNOT run Playwright; write the spec against the
real UI seams, keep its budget consistent with the pool (per-test timeouts match
neighboring specs), and list it in your report's spec table. The supervisor runs
the pool at the gate.

## Currency facts
- Migrations 0000-0037 FROZEN. EXPECTED MINT-FREE; stop and report if a migration
  seems needed.
- If you rename any string anchored by tests/fixtures/content-identity-mutations.mjs,
  update the anchors in the same change and run the verifier (ps-guard first).

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard before EVERY
  test command. Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo,
  no config edits, no weakened assertions, no test deletion (strict-superset
  only), never regenerate expectations from own output.
- SCOPE: species form only. HA-8 (subclass timeline) and HA-9 (background form)
  are separate units; shared form-component EXTENSIONS are allowed but must stay
  backward-compatible with HA-6's pins.

## Report
Per row clause built/partial; a11y evidence; hostile-string coverage; the journey
spec path + what it pins; targeted vitest counts pasted; tsc -b exit; exact
git diff --stat tail. Distinguish ran from inferred.
