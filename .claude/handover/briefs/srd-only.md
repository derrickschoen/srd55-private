# SRD-ONLY — retire the three non-SRD bundled subclasses

Worktree: /home/vagrant/PhpstormProjects/dnd-wt-srdonly (branch wt/srdonly
off main). PLAYWRIGHT_PORT=4782. Read .claude/handover/briefs/COMMON.md
first. No second-agent CLIs.

## HARD PRECONDITION — DO NOT START UNTIL THIS IS TRUE

The BHC unit (bundled-homebrew catalog + click-to-import) must already be
MERGED TO MAIN, and this worktree must be branched off a main that
contains it. Check: `git log --oneline main | grep -i "Merge wt/bhc"`.
If it is absent, STOP and report — the boring third-caster (D222) must
already be exercising every retained third-caster seam before EK/AT
coverage is removed. This ordering is D221's binding constraint.

## Binding rulings — read them in .claude/decisions.md
D215 (SRD-only default seed), D216 (EK and AT
dropped ENTIRELY from the repo, not just the seed), D211 (bundled
2024:subclass:veteran retires), D217 (the retirement DELETES characters
attached to retiring subclasses outright — no detach, no auto-retarget, no
abort; scoped to this retirement only), D222 (the boring third-caster
carries the test pins, NOT Barbed Court Monk — this supersedes D216's
sentence routing coverage to Barbed Court), D223 (third-caster ladders are
derived from the SRD table). The design pass
docs/design/2026-08-06-seed-scope-srd-only.md has a proposed migration
shape and a test-conversion ledger — it is a PROPOSAL; verify every claim
in it against current main before relying on it, and the decisions file
outranks it wherever they differ.

## Deliverables

1. Remove EK and AT ENTIRELY: seed code,
   manifest entries, runtime references, fixtures, and test references.
   The design pass lists their footprint; re-derive it yourself with grep
   — the footprint has moved since that pass ran.
   Anything in `.claude/` or `docs/` that DISCUSSES the licensing history
   or records the decision STAYS. That is the record, not content. Stale
   product claims in docs/design and progress notes DO get corrected.
2. Retire the bundled Veteran seed.
3. A one-time retirement that actually removes installed copies. Ordinary
   boot cannot do this: omitting a manifest entry leaves stored roots and
   reconciliation re-adds every stored bundled-stable identity
   (bundled-content-registry-v1.ts). The design pass proposes a
   checksum-frozen SEMANTIC migration in catalog-data-migrations.ts
   rather than a schema mint, because a data-only 0040 would be invisible
   to the schema-signature detector. VERIFY that reasoning yourself and
   state your conclusion. Whatever mechanism you choose, it must:
   - target ONLY the three bundled keys; never touch asserted external
     keys (a published external Veteran must survive untouched);
   - DELETE characters attached to the retiring subclasses (D217),
     along with their dependent rows, in one transaction;
   - remove the subclass graphs, fingerprints, aliases, identities, match
     decisions, and any drafts based on the retiring roots;
   - handle 0039's DELETE-permanence guard correctly if lineage rows
     exist — suspend-and-restore inside the scoped transaction, or
     explain why no lineage can reference these bundled roots;
   - finish with a foreign_key_check;
   - be idempotent and run exactly once.
4. Convert every affected test as a STRICT SUPERSET. Never delete a test
   to make it pass. The design pass's ledger names twelve files — treat
   it as a starting point, verify each against main, and report any test
   whose INTENT cannot survive as a finding rather than removing it.
   Third-caster coverage moves onto the BORING THIRD-CASTER from BHC
   (D222), not Barbed Court Monk.
5. Fresh-image behaviour: a new database seeds SRD content only. Pin the
   exact SRD subclass count and pin that no retired key reappears after
   reconciliation, reset, or repair.
6. An upgrade fixture: an OLD database carrying all three retiring
   subclasses and characters attached to them, upgraded, asserting the
   characters are gone, SRD content intact, and any externally published
   Veteran untouched.

## Lessons already paid for (the reviewer checks these first)
1. COMPILE GATE IS `npm run build` (COMMON.md 2b); holder objects for
   closure-assigned test callbacks.
2. A test must call what the ROUTE calls — HA-10 shipped a fix whose pin
   exercised an unused generic seam while the live path kept the bug.
3. Mint/trigger/FK/CHECK changes re-trigger the ENTIRE census (COMMON.md
   mint checklist) — applies to the semantic-migration registry too if
   you touch it.
4. After touching an exported contract constant, grep for shape
   assertions and RUN them.
5. Journeys: exact role+name selectors; route-owned readiness;
   cross-route global-ready check.

## Report
Terse. Your verified conclusion on the migration mechanism. The removal
footprint. The conversion ledger as you actually executed it, with any
intent-cannot-survive findings. Targeted counts pasted, `npm run build`
exit code, journey result. Claims without file:line citations are treated
as unbuilt.
