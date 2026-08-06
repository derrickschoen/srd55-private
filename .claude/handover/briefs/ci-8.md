# CI-8 — M: adversarial controls and UI disclosure

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-ci8 (branch wt/ci8 from main).
Design row, docs/design/2026-07-30-content-identity.md:1337-1340, VERBATIM:

> **CI-8 — M: adversarial controls and UI disclosure.** Mutation suite for every
> projector and scheme transition, import preview counts/conflicts,
> same-name-distinct and match-reason labeling, remembered-choice management,
> and wording that distinguishes complete JSON from reference-only links.

Read the design doc THROUGH its D198 supersession banner and .claude/decisions.md —
adjudications win over the doc.

## Currency corrections (binding; the doc predates these)
- Asserted-key world only: `legacy-opaque` was deleted from the vocabulary (D205,
  migration 0034). "Scheme transition" means transitions that EXIST today
  (content-v1 fingerprints, asserted/derived/bundled-stable key_kinds). Do not
  build mutation controls for removed code paths.
- Character backup is v5 with the complete content manifest (CI-5, merged). The
  legacy `backup.importCharacter` RPC is DELETED — import goes through the
  plan/commit RPC pair. The spell identity sidecar (canonical_name/
  normalized_name/aliases) travels OUTSIDE the fingerprinted aggregate.
- The fifth review control's name is CI-SRD-FALLBACK-REVIEW (D198 banner item 4).
- Migrations 0000-0036 are FROZEN. This unit is EXPECTED TO BE MINT-FREE: if you
  believe a migration is required, STOP and report why instead of minting.

## Mutation-suite discipline (non-negotiable)
- Each mutation lives in a committed script/test file, never inline shell.
- Every mutation control must first PROVE the mutation applied (assert the
  mutated behavior is observed), then prove the detector fires, then prove
  restoration by re-running clean. A zero from an unverified instrument is not
  evidence.
- Name in your report what you decided NOT to pin, per surface.

## Standing constraints
- Leave all work UNCOMMITTED; the supervisor commits.
- Do not invoke any second-agent CLI (claude, gemini, etc.).
- NO full vitest suite, NO Playwright, NO build. Targeted vitest files only;
  before EVERY test command run
  `ps -eo args | grep -E "vitest|playwright" | grep -v grep` and abort if it
  prints anything.
- Forbidden paths to green: no any/@ts-ignore/@ts-expect-error/.skip/.todo, no
  config edits, no weakened assertions, no test deletion (strict-superset
  replacement only), never regenerate an expectation from our own output.

## Report
What you built per row clause; what you deliberately did not pin; targeted vitest
results with real pasted counts; `npx tsc -b` exit; `git diff --stat` tail. State
actual numbers you ran; never summarize counts you did not run.
