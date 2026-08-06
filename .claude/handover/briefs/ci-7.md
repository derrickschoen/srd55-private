# CI-7 — L: authoring immutability

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ci7 (branch wt/ci7 from main).
Design row, docs/design/2026-07-30-content-identity.md:1332-1336, VERBATIM:

> **CI-7 — L: authoring immutability.** Draft ids and publish-to-derived-key
> across nine content kinds, edit-as-new-version, explicit reference retarget
> command, D82 review on a review-required existing result, silent reuse of a
> trivial exact-derived self-match, and refusal to export/share drafts. Forks
> are one spell-shaped use of this common lifecycle, not a policy branch.

Read through the D198 banner: "publish-to-derived-key" is SUPERSEDED — keys are
ASSERTED name-derived slugs via shared normalization; "exact-derived self-match"
means the exact byte-identical no-metadata-conflict self-match (CI-4a discipline).

## GAP ANALYSIS FIRST — much of this row has landed since the doc was written
Merged already: HA-2 (draft ids, revision-CAS, copy-from-published, draft-export
sentinels), HA-3/HA-4/HA-5 (publish + silent self-match + review through the common
publisher for species/background/subclass), CI-8 (review dialog), CI-6 (share
resolution). Your FIRST deliverable is a clause-by-clause gap table: for each row
clause, cite the merged artifact that satisfies it or name the gap. Implement ONLY
the gaps. Likely genuine gaps:
 - the common lifecycle for the remaining kinds (spell forks unified onto the
   common lifecycle rather than a policy branch — src/catalog/spell-fork.ts is the
   existing fork seam; equipment kinds if the doc's nine-kind claim demands them —
   check what the doc's CI-7 section actually requires per kind and be honest about
   what you defer);
 - edit-as-new-version (BUT: HA-11's design owns the character-replacement side —
   build only the CATALOG lifecycle here: publishing a new version of an existing
   external creation under a new key with superseded metadata, no character
   propagation — do not touch HA-11's scope);
 - the explicit reference retarget command (typed command, D82 review when the
   existing result is review-required);
 - drafts-refuse-export/share for any surface not already pinned by HA-2 sentinels.

## Currency facts
- Migrations 0000-0037 FROZEN; you own mint 0038 IF genuinely needed; full
  COMMON.md checklist (incl. the fifth-recurrence amendment) if you mint or add
  any trigger/FK/CHECK in any round.
- Backup v5; notices[] vocabulary; router has a navigation-guard seam; the
  homebrew library screen exists (HA-6) — wire list/actions only if a small seam
  is needed, no form building (HA-7/8/9 own forms).

## Standing constraints
- Leave all work UNCOMMITTED; supervisor commits. No second-agent CLIs.
- NO full vitest/Playwright/build. Targeted vitest only; ps-guard before EVERY
  test command. Forbidden paths: no any/@ts-ignore/@ts-expect-error/.skip/.todo,
  no config edits, no weakened assertions, no test deletion (strict-superset
  only), never regenerate expectations from own output. Frozen vectors frozen.
- L honesty: coherent subset with remainder NAMED beats a hollow whole.

## Report
The gap table FIRST; then per implemented gap: files:lines, pins; targeted vitest
counts pasted; tsc -b exit; exact git diff --stat tail. Distinguish ran from
inferred.
