# HA-5 — XL: subclass backend

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ha5 (branch wt/ha5 from main).
Design row, docs/design/2026-07-30-homebrew-authoring-forms.md:891-897, VERBATIM:

> **HA-5 — XL: subclass backend.** Bundled parent validation, typed
> spellcasting/progression builder with dense 20-level materialization, leveled
> features with multiple effects, immutable install, projector vectors, and
> end-to-end report/grant/spell-access plus feature-threshold proofs. This is XL
> because progressions and grant rules are executable mechanics, not form
> decoration. Exit also requires HA-EXTERNAL-SELF-MATCH for a byte-identical
> installed external subclass.

Read the doc's HA-5 sections and edge list; .claude/decisions.md wins over the doc.

## Amendments and merged precedents (all on main - read them first)
- Siblings: src/authoring/species-publisher.ts (HA-3) and background-publisher.ts
  (HA-4). Follow their shape: collect-all draft-to-semantic validation, common
  publisher seam, atomic install with LAST-STEP rollback fixture, explicit-Match
  success, remembered-decision opt-out, provenance-gated dispatch (authored rule
  keys must not impersonate bundled plans - HA-3's skill-grant gate precedent).
- D133: classes stay bundled-only; subclasses attach to BUNDLED parent classes only.
- D198 asserted keys via shared normalization; CI-4a edge discipline (silent
  adoption ONLY for exact byte-identical no-metadata-conflict self-match).
- D152 applies to BUNDLED content (heading-only); HOMEBREW subclass features carry
  prose descriptions - the existing homebrew fixtures (College of the Long Road)
  are the precedent.
- Display/reference metadata outside identity with conflict-review (HA-4's sidecar
  rule); drift verification through ONE shared publish/apply seam (HA-4's helper).
- CI-5 remaining item: target-local template_ref/provenance rebinding for SUBCLASS
  effects in character import is IN SCOPE here (species and background are done -
  extend the same mechanism and notice vocabulary, do not fork).
- CI-6 merged: share references resolve key-first with evidence rules; subclass
  share refs are reviewable via live projector - do not regress that seam.

## Currency facts
- Migrations 0000-0037 FROZEN. You own mint 0038 IF genuinely needed (HA-3/HA-4
  precedent: HA-3 was mint-free, HA-4 minted for a relational identity). If you
  mint OR add any trigger/FK/CHECK in ANY round: the ENTIRE COMMON.md checklist
  every time (fifth-recurrence amendment at the bottom of COMMON.md).
- subclass_definitions/subclass_features/subclass_progressions exist; 15 bundled
  subclasses; registry-first triggers (1811).
- Character import returns typed notices[]; backup v5.

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard
  (`ps -eo args | grep -E "vitest|playwright" | grep -v grep`, abort if nonempty)
  before EVERY test command.
- Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo, no config edits,
  no weakened assertions, no test deletion (strict-superset only), never regenerate
  an expectation from own output. Frozen vectors frozen; new vectors alongside.
- XL honesty allowance: coherent subset with remainder NAMED beats a hollow whole.

## Report
Per row clause built/partial/not-started; HA-EXTERNAL-SELF-MATCH status; mint
decision with evidence; the subclass template_ref closure status; targeted vitest
counts pasted; tsc -b exit; exact git diff --stat tail. Distinguish ran from
inferred.
