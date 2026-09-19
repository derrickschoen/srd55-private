# COHORT-01 N3 draft r2 — astra HIGH plan review r2 (session 01a0b9ab-db73-7903-879a-5c23adf1cc72, draft sha c5001cde…)

**VERDICT: ACCEPT — 0 P1 / 0 P2 / 0 P3.**

Reviewed revision 2 at `55465bf6`; both supplied plan hashes match. All four r1 findings are closed.

1. **Frozen-test preservation — closed.** [Draft lines 103–104](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:103) explicitly say: “Keep the frozen 5117001 test at lines 545-594 byte-unchanged and add title…”. Line 132 adds the separate nine-row title; line 161 correctly expects **25/25**, preserving the existing 23 tests. The BLIND-01 composite, Room-8, and speculative pins match the cited files and values.

2. **N1’s incorrect escape witness — closed.** [Lines 106–109](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:106) explicitly supersede the escape claim and specify “declared/effective `30/0`, labels `['Dodge','Dodge']`, byte-identical menu.” Lines 138–139 correctly state that “only the exact declared/effective `0/0` assertion kills it.” My fresh probe confirmed both statements. Lines 148–149 explicitly drop the unreachable movement mutant with the requested rationale. N1’s declared-zero construction, typed effect, and separate corner-sealing mutant remain required.

3. **Dependency removal versus tag removal — closed.** [Lines 101–102](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:101) require the zero-speed-P control: “correct D693 keeps these same two IDs, refs/radii/scores, while removing only `playerInfluence` produces `[]`.” Lines 144–146 now list separate mutants. My fresh probe confirmed the complete unchanged two-entry oracle with P’s effective speed and ordinary influence radius both zero; stripping only the tag produced `[]`.

4. **Exact Room-8 route provenance — closed.** [Lines 62–64](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:62) now explain “frontier order is cost then row then column” and that “`knownCost <= nextCost` never replaces” the predecessor. These match [movement.ts:133](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/movement.ts:133) and its search loop. This supplies the missing deterministic ordering justification; I did not repeat the already-confirmed route/terrain probe.

**Oracle and privacy audit passes.** I checked the production planner selection, dependency extraction, influence filtering, grouping, scoring, ordering, slicing, and candidate hashing in [speculative-planning.ts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/speculative-planning.ts:290).

- Base labels are `Longbow + Longbow -> combatant:P`, `Dodge`. Ranked facts are `adjacency:DA:TAP`, `visibility:DA:TAP`, `visibility:DB:TBP`; each has one proposal reference, player P, radius 60, score 60.
- Sealed labels are `Dodge`, `Dodge`. Ranked facts are `visibility:DA:TAP`, then `visibility:DB:TBP`, both false→true with the same reference/radius/score values. B retains its key and candidate ID when its rank changes.
- I independently constructed the expected typed atoms and canonical hash inputs before comparing with production. All five stated candidate-ID occurrences match.
- The previously confirmed 55-foot adjacency witness and 20-foot visibility witness remain unchanged. B’s unseen dependency—and A’s after sealing—requires no positional movement witness.

**D693/D694 permit roster identity only**, with a fixed policy radius of 60. Movement capacity, living status, and token presence are not permitted unseen-opponent inputs. The revised draft correctly reflects the accepted D693 mechanism rather than the rejected D690 mechanism. The extraction branch reads opposing identity; tagged candidate scoring bypasses ordinary movement reachability.

The requested nine-row reproduction also passed:

| Rank | Fact | References | Score | Result |
|---:|---|---:|---:|---|
| 1 | adjacency A→P | 2 | 120 | retained |
| 2 | adjacency B→P | 1 | 60 | retained |
| 3 | adjacency P→A | 1 | 60 | retained |
| 4 | adjacency P→B | 1 | 60 | retained |
| 5 | reach A→P | 1 | 60 | retained |
| 6 | reach B→P | 1 | 60 | retained |
| 7 | visibility A→P | 1 | 60 | retained |
| 8 | visibility B→P | 1 | 60 | retained |
| 9 | visibility P→A | 1 | 60 | excluded |

All nine reached their stipulated successful path checks. Supplying row 9 alone retained it, confirming that its exclusion is caused by the eight-entry slice. This remains a controlled grouping/ranking test; the production scene supplies the geometry evidence.

Every remaining mutant has a named killing assertion. Addition producing `62/61`, reversed canonical ordering, removed slicing, and removed unseen dependencies provide plausible-wrong-result coverage.

**Execution provenance:** from `/tmp/cohort-01-b4-wrapper-QUDMSQ`, I ran two inline Node/ViteNode programs using:

```bash
STATIC_APP_CACHE_DIR=/tmp/n3-review-837462 node --input-type=module <<'NODE'
# Base/sealed menus, independent hashes, zero-speed-P/tag removal,
# restored A speed, exact speed assertions and sealed resolutions.
NODE

STATIC_APP_CACHE_DIR=/tmp/n3-review-837463 node --input-type=module <<'NODE'
# Ten dependencies, exact nine-row order, eight retained rows,
# successful path calls and ninth-alone control.
NODE
```

Both exited 0. Full programs are in the tool transcript. They imported the existing wrapper config with `configLoader:'runner'`, disabled listening and dependency optimization, and made no source edits. An initial loader attempt using cache suffix `837461` failed before assertions because dependency optimization attempted a sandbox-blocked cache write.

The planned serial suite counts **11/6/25**, common checks, architecture checks, and recorded-set D583 requirement **217** are appropriate. I did not rerun unchanged suites or the previously confirmed closure recount. Acceptance does not waive the D694-INTEL-01 predecessor; any later baseline or recorded-set discrepancy still triggers the draft’s stop/review requirement.

Final `git diff --check` and `git status --short` were empty; HEAD and draft hash remained unchanged.

COHORT-01 N3 REVIEW R2 DONE
