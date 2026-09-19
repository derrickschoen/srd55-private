# COHORT-01 N3 draft — astra HIGH plan review r1 (session 01a0b990-0ea0-7a43-84db-f536d413bd66, draft sha 8350e674…)

**VERDICT: REJECT — 0 P1, 3 P2, 1 P3.**

The corrected **three-entry base menu and two-entry sealed menu are valid**. The blockers concern preservation of landed tests and inaccurate mutant witnesses.

1. **P2 — The draft both freezes and deletes the BLIND-01 speculative witness.**  
   Section 1 correctly freezes `speculative-planning.test.ts:545–594`, including its relocation-invariance assertion. [Draft lines 97–98](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:97) then instruct replacement of that same test. The new scene does not retain its frozen-fixture coverage.

   Keep the existing test unchanged and add the two proposed tests. With that arrangement, the serial suite expectations become **11/11, 6/6, 25/25**, rather than 11/6/24.

2. **P2 — The N1 speed-restoration mutant cannot produce the claimed escape.**  
   [Draft lines 127–130](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:127) retain obsolete behavior from before BLIND-01. The early branch in [offer-declarations.ts:437](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/offer-declarations.ts:437) returns blind Dodge before normal attack movement declarations.

   My probe restored A’s declared speed to 30 while retaining the typed zero-speed effect. Results:

   - Declared/effective speed: **30/0**.
   - Labels: **Dodge/Dodge**.
   - Both resolutions: original position, empty path, zero cost.
   - Sealed menu: unchanged, including both candidate IDs.

   Thus the declared-speed assertion kills this mutant; the claimed label/menu failures do not occur. Explicitly amend N1’s obsolete behavioral requirement. Also replace mutant 3’s unspecified movement bypass with a concrete, reachable mutation and its actual killing assertion.

   The separate corner-sealing mutant works: disabling the strict-interior vertex seal in memory made A’s trace clear, restored Longbow, and changed the menu to three entries.

3. **P2 — Removing the D693 tag survives the named witnesses.**  
   [Draft line 135](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:135) conflates removing the dependency with removing its tag.

   I tested both independently:

   | Mutation | Base menu | Sealed menu |
   |---|---:|---:|
   | Remove tagged dependencies entirely | 2 entries | 0 entries |
   | Remove only `playerInfluence` | **Byte-identical** | **Byte-identical** |

   Split these mutants and give tag removal a real killing witness. A verified option is to change unseen P’s speed to zero in the sealed scene: correct D693 behavior retains the same two candidates at policy radius 60; tag removal produces zero candidates. This can remain inside the new integration test.

4. **P3 — Document the derivation of the newly pinned exact Room-8 route.**  
   [Draft lines 60–61](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-cohort-01-n3-draft.md:60) establish the cost but do not explain why that precise route wins. The probe confirms it, but `10×5+5` alone does not establish the path ordering. Record the deterministic Dijkstra derivation—row-major frontier ordering and first equal-cost predecessor retention in [movement.ts:163](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/movement.ts:163)—before making the exact route binding.

The requested oracle audit otherwise passes:

- **Base menu:** adjacency A→P, visibility A→P, visibility B→P; ranks 1–3, refs 1 each, influencing player P, radius 60, score 60. I independently reconstructed the typed atoms and canonical hash inputs; all three candidate IDs match.
- **Sealed menu:** visibility A→P followed by visibility B→P, both false→true, refs 1 and score 60. B retains its original key and ID despite moving from rank 3 to rank 2.
- **Movement witnesses:** production queries confirmed P→`(12,4)` costs 55 and flips adjacency; the stated four-step path to `(1,0)` costs 20 and flips A’s visibility.
- **Nine-row table:** all nine stated keys and ordering are reproducible from the stipulated dependencies and controlled query table:

  | Rank | Fact | Refs | Score | Result |
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

  The probe exercised the ninth successful flip during candidate computation and retained it when supplied alone. Its exclusion therefore follows the slice, not failed eligibility.

These results follow the production extraction, grouping, multiplication, canonical ordering, and slicing in [speculative-planning.ts:363](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/speculative-planning.ts:363) and [speculative-planning.ts:621](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/speculative-planning.ts:621). The addition, reversed-order, and removed-slice mutants have appropriate exact witnesses.

**D693/D694 permit roster identity only for these unseen dependencies—not movement capacity.** The latter belonged to the rejected D690 mechanism. Production uses a fixed policy radius of 60 and retains opposing roster identities without filtering token presence or life. The draft’s corrected menus respect that contract. I also confirmed unchanged sealed menus with P speed 15 and zero.

The composite and Room-8 frozen values and cited locations are accurate. Scout ray traces matched the stated corners, first blocking cells, and `half/half/total` physical tiers. Room-8’s exact ten-cell route matched, with `(13,5)` its sole difficult cell and total cost 55.

The proposed type checks, architecture checks, command-outcomes check, serial suites, and freeze checks are appropriate. I verified the supervisor’s recorded **11/6/23** baseline; I did not rerun those suites or claim implementation gates passed. An independent D583 recount using the recorded 50 seed paths yielded **217**, exactly matching inherited 148 plus the frozen 68 additions plus `d569-v6.test.ts`: **zero missing, zero unexpected**.

For execution provenance, I ran inline Node/ViteNode probes from `/tmp/cohort-01-b4-wrapper-QUDMSQ`, using this command form; full stdin programs are in the tool transcript:

```bash
STATIC_APP_CACHE_DIR=/tmp/n3-review-694284 node --input-type=module <<'NODE'
```

The successful probe invocations used these cache suffixes:

| Suffix | Executed probe |
|---|---|
| `694284` | Base/sealed menus, independent candidate hashes, restored declared speed, movement witnesses |
| `694285` | Ten dependencies, nine candidate rows, eight-entry slice, ninth-alone control |
| `694286` | Dependency removal versus tag removal; unseen-player speed controls |
| `694287` | In-memory strict-interior corner-seal mutation |
| `694290` | D583 recorded-seed closure and exact-set comparison |
| `694291` | Scout corner rays and Room-8 resolution |
| `694292` | Whole-menu equality after tag removal; speed-zero killing control |

The runner imported the existing Vite config with `configLoader:'runner'`, disabled listening and dependency optimization, and made no source edits. Initial loader attempts failed on sandbox write/listen restrictions. Final `git diff --check` and `git status --short` were empty; HEAD remained `55465bf6`.

COHORT-01 N3 REVIEW DONE
