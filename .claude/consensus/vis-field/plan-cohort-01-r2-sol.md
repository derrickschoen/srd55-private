
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
model: gpt-5.6-sol
provider: openai
approval: never
sandbox: workspace-write [workdir, /tmp, $TMPDIR] (network access enabled)
reasoning effort: high
reasoning summaries: none
session id: 01a0b1bb-d55e-74a0-8c65-c6402ad96f37
--------
user
RULES (binding, restated): You are the PLANNER (gpt-5.6-sol, high, RESUMED — you wrote .tmp-plans/2026-09-17-cohort-01-plan.md r1 in worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify, a DETACHED clean checkout at 807d2e3c). Sandbox workspace-write, but you may WRITE ONLY that plan file (edit it in place to r2); no other file, no git writes, no generation, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; no full vitest, Playwright, build; never port 4173. The MAIN repo's .claude/decisions.md (/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md — the AUTHORITATIVE copy, 23,000+ lines; your worktree's copy is stale) is readable; read D645 and D646. Model calls WILL fail. End with the named marker.

ASTRA r1 (HIGH) = REJECT (0 P1, 3 P2, 1 P3). Revise the plan to r2 addressing each, keeping ≤400 lines and the batch/allowed-file format:
PLAN-F1 (P2, lines 243–268): v6 lacks an experiment-identity boundary — tools/d569-blind-experiment.ts:705 derives session keys from {family, arm, seed, rep} and row matching at :762 omits manifest identity; the unchanged hard fixtures keep their state and visual-source hashes, so 240 primary core cells (330 with hints) and 240 second-family core cells are indistinguishable across v5/v6 and historical hard rows could enter v6. FIX: specify version/manifest identity in v6 execution and observed-row validation (a separate experiment identity, content hashes stay truthful), preserve v5 behaviour, add cross-version rejection witnesses using the unchanged hard seeds, and include the outer v6 manifest hash.
PLAN-F2 (P2, lines 227–241 and 23–26): the namespace audit does not establish absence — the worktree's decisions.md is stale (22,707 vs 23,068 lines), the grep patterns miss the `6209xxx` notation and TypeScript numeric separators (`6_209_001`), and the authorized reservations in D643/D645 (main :23048, :23061) must be classified as reservations, not prior use. FIX: an explicit pre-Batch-2 gate against the MAIN decisions file and all seed representations (plain, xxx notation, underscore-separated), actual output recorded verbatim, reservations classified separately, all three families reserved before any candidate rejection/reselection, and a stated procedure for how a replacement range updates the fixed allowed-file manifests before generation.
PLAN-F3 (P2, lines 340–353): the speculative-planning oracle is unspecified — no concrete scene, radii, proposal-reference sets, scores, fact-key order or mutation result; "add enough" does not show ≥9 eligible non-shadowed candidates reach the eight-entry slice; "empty or deterministically change" leaves the mutation expectation selectable after the fact. FIX: predeclare the scene and a hand-calculated candidate table (reachability proofs, tie ordering, the excluded ninth candidate, the exact corner-mutation result) against src/vtt/speculative-planning.ts:638–660; separate the real buildHostScenarioMenu integration witness from a hand-authored dependency-table truncation witness if needed.
PLAN-F4 (P3, line 216): Batch 6 lists eight files, not seven (actual counts 3/3/10/10/10/8/4/4/3/1; union 52 paths = 18 existing + 34 new).
ALSO carry astra's supporting requirements into the plan text: the active v6 test must use canonicalD569SecondFamilyRegeneration (the blind-experiment test helper at :294–296 returns committed bytes as its "regeneration" — not acceptable for v6); explicit rejection tests for any non-fog-key difference and for a legacy key present in a NEW v2 fixture; all behaviour derivations re-verified after WALL-01 (hard predecessor). Append a "Round 2 disposition" section listing each finding and what changed (line refs). Write r2 in place; end with "COHORT-01 PLAN R2 DONE".

codex
I’ll revise the existing plan in place only. First I’ll read authoritative D645/D646 and inspect the exact v6 identity seams and speculative-planning scoring code, then I’ll tighten the affected batches, correct all counts, and keep the result within 400 lines.
exec
/bin/bash -lc "rg -n '"'^## D645|''^## D646'"' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md && sed -n '23040,23090p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md && nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '1,400p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
23066:## D645 — SUPERVISOR (2026-09-17 19:53): WALL-01 REJECTED by my verification (WALL-F1, P1: the vertex rule is inert for axis-aligned rays whose sealing pair straddles the line); fix r1 dispatched; COHORT-01 plan (400 lines, sha 6852051d…) harvested and sent to astra HIGH
23070:## D646 — SUPERVISOR (2026-09-17 20:07): COHORT-01 plan r1 REJECTED by astra r1 (HIGH; 0 P1, 3 P2, 1 P3; saved review-plan-cohort-01-astra-r1.md); r2 dispatched to the planner
## D635.53 — SUPERVISOR (2026-09-17 10:21): VIS-FIELD slowdown profiled (sol, read-only; saved .claude/consensus/test-perf/investigate-vis-field-slowdown-sol.md); three bounded fixes queued for TEST-PERF-01 / a post-landing VIS-FIELD perf batch
MEASURED (sol, both trees' production hashes identical before/after; my own numbers agree: vane 3077 → 6585 ms): vane-tpk 3180 → 6820 ms (2.14×). NOT more detection queries (0.83×) but each sight query expanding into per-target-cell traces (visibility-field.ts:431): traceSpaces 95k → 348k (3.67×), traceCornerLine 124k → 536k (4.33×); 91.7% of cell traces are pairwise sightToCreature detection (~4.8 s inclusive), only 8.3% the derived field itself (~0.55 s). The field's weak caches (visibility-field.ts:104) are keyed by EncounterState identity, so immutable reducer revisions make nearly every request cold (206 projections over 205 distinct revisions; 140 traces each). los-cover productive-option 5472 → 6139 ms (+12%): the seam scan (firstSharedEdgeBlockingCell 4.17M calls, 380 ms) plus ~0.7 s more in traceCornerLine; also 33,953 of 46,650 reach traces (72.8%) were for candidates then refused by RANGE — geometry evaluated before the cheap range check. D630 pair 33.6 → 41.5 s: replay.ts:238 projects DM + every PC per replayed revision (derived fog 3,361 calls); the replay file rebuilds the scripted gate 15 times (13 default) at ~1.9 s each.
FIXES (bounded, with required witnesses): (1) TEST-ONLY: build each parameterized replay gate once, deep-freeze, structuredClone per mutating test (~20–23 s off the replay file; witness: gate hash unchanged across tests, shuffled order twice, corruption tests still fail on their own clones) — this is TEST-PERF-01's default-gate reuse item, confirmed as the largest test-only win; (2) PRODUCTION: cache visibility outcomes by an explicit visibility epoch (bumped by movement, footprints, walls/objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, observer eligibility; HP/log-only revisions reuse) + observer/subject key instead of state identity (~2.5–3.5 s in vane; witness: per revision, cached == from-scratch for every eligible pair and cell, byte-identical fog/reason/sense/grade and projection hashes, incl. Large/Huge footprints, seam rays, darkness, obscurement, Invisible/Hidden/Blinded, death/placement); (3) TEST-ONLY: generate the nine versioned rooms once per suite, deep-frozen (~4.5 s per named los-cover test) + optional seam memoization by blocking-topology signature (~0.35–0.7 s); (4) small: prefilter range before LOS inside offer generation only (public reach precedence unchanged; ~0.2–0.3 s).
CORRECTNESS: no field computed for ineligible observers (eligibleVisibilityObserverIds :525 excludes dead/unplaced/adjudication-pending/unconscious); per-cell tracing for large footprints is correctness-sensitive (a single representative ray would regress); the seam scan is required work. State-identity caching = design smell, not a defect. DISPOSITION: (1)+(3) go into TEST-PERF-01 (owner's ranks 6/8/9 still pending); (2)+(4) = a VIS-FIELD-PERF batch after landing, planned and reviewed like any batch; the 5 s budgets are NOT re-pinned meanwhile.

## D635.54 — SUPERVISOR (2026-09-17 11:06): option A costed (sol, read-only; saved investigate-option-a-costing-sol.md); a refinement of the attribution — 40 of the second-family ledger's 47 violations are B2's fog key, not the seam rule
REFINEMENT (sol; consistent with the failure text I saw in D635.46): the ledger pin's 47 markers = 20 second-family fixtures (hard-2 5118xxx AND brutal-2 6207xxx) × 2 byte-regeneration checks (first_regeneration / independent_regeneration — the validator rebuilds each fixture with generateRoom twice and requires byte equality with the committed bytes, which still carry the removed foggedCells key) = 40, plus 7 brutal-2 productivity violations. So the second-family manifest is red for TWO reasons: B2's key (40, the same consequence LAND-04 normalized for the generator pins) and the seam rule (7). Neither option B nor C repairs the 40. d569-v5.test.ts fails at file level because it validates the manifest at module load.
MACHINERY: "regeneration" in D569 means a second deterministic build, not a cohort version; the sanctioned precedent for a NEW cohort is the second family itself (D569: predeclare unused ranges with a verbatim namespace audit, generate into a new directory, prove membership from decoded state, generate twice and compare bytes, pin hashes only then, nest the manifest hash) — history is never edited in place. No tracked RL row and no docs bind the brutal families.
OPTION A as costed by sol (40 fixtures: brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx, PLUS hard-3 5120xxx because hard-2's bytes fail the fog-key regeneration; new d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v5/v1 kept frozen; 42 new SHA-256 pins; ~62–66 paths; ~865 KB fixtures; versioned arena/rerun routes brutal-v2 / brutal-10-v2 rather than retargeting historical names; negative witnesses required; d569-v5.test.ts stays historical, a v6 test becomes active). Hard-family pins: composite-turn-proposals and Room-8 opportunity-intel are hand-derivable re-pins on the same scenes (Dodge/End Turn only; monsters 1/2/4 zero-foot Dodge, monster 5 keeps its 55-ft Dash); speculative-planning must NOT be normalized to an empty menu — it needs a small hand-authored scene with an independently computed volatility score and a seam mutation.
MY REFINEMENT TO A (A1, recommended over sol's A2): treat the 40 fog-key regeneration violations exactly as LAND-04 treated the generator pins — the validator's byte-regeneration comparison drops the obsolete legacy key from the committed bytes before comparing (a version-aware projection, demonstrated per fixture as a single-key structural diff), so hard-2 (5118xxx) stays the historical hard half and only the three BRUTAL cohorts regenerate: 30 fixtures instead of 40, no hard-3 namespace, second-family v2 = hard-2 (as is) + brutal-2-v2. Risk noted by sol applies: the normalization must be a demonstrated single-key projection, never a rewrite of manifest bytes.
B (6–10 files, relaxes everyMonsterProductive; leaves the 40 and the speculative scene broken; brutal-b has 41/42 monsters without attack offers under the seam so any threshold would be fitted to the failures) and C (reverses D635's optical ruling; restores the three behaviour pins and 214→451 offers; 10–20 files + full revalidation of cover/sight/fields/offers/browser; still leaves the 40) — both advised against.

## D641 — OWNER (2026-09-17 18:48): "I think we need to model that a wall is solid across cells. It is not just a series of cells. Look for how others have handled this." — research done by the supervisor; question put back to the owner
PROBED BY ME on 807d2e3c (traceTerrainLine, 6x6 board): (1) two blockers touching only at a corner, (2,1)&(1,2), observer (0,0) → target (3,3) through the shared vertex: tier half, blocksSight FALSE — the diagonal crack lets sight through; (2) solid 2x2 block: total, TRUE; (3) wall column with the ray along its face-line between two blockers (the D635 seam): half, TRUE; (4) a ray grazing one blocker's corner: none, FALSE. So today's tracer = closed cells whose interiors block + the D635 shared-EDGE rule; shared CORNERS of diagonally touching blockers are still open.
HOW OTHERS DO IT (sources in the reply): D&D 2014 DMG corner trace — lines from a corner to the target's corners; whether a line that merely TOUCHES an obstacle counts is explicitly the DM's call (the SRD 5.2.1 only defines cover degrees by "covers at least half / three-quarters / the whole target"); Gloomhaven — corner-to-corner lines, and "the line cannot touch or cross a wall at any point; touching the very edge of a wall still means no LOS" (walls are closed sets; touching = blocked); Foundry VTT / Roll20 — walls are SEGMENTS with endpoints (thin walls), not cells, so no cell seams exist and a long wall is one solid segment by construction; roguelikes (Red Blob "thin wall FOV", Adam Milazzo's survey, Albert Ford's symmetric shadowcasting, RogueBasin comparative study) — "thick walls" (blocking cells) vs "thin walls" (blocking edges) is the standard framing, and diagonal-gap peeking between corner-touching blockers is a known nuisance that implementations bevel or seal; Debenham & Solis-Oba, "New Algorithms for Computing Field of Vision over 2D Grids" (arXiv 2101.11002) — "adjacent vision blocking cells are first grouped together into rectilinear regions, then split into a minimal number of rectangles", and their Figure 5 is exactly our seam: two adjacent rectangles let a ray slip along the shared side, which they fix by extending one rectangle to overlap the other so the union is solid.
PROPOSAL (to the owner, one question): adopt a SOLID-WALL model — the wall is the union of sight-blocking cells as closed rectilinear regions; a ray is blocked iff it passes through the union's interior, which includes (a) any blocking cell's interior, (b) an edge shared by two blockers (D635, already in), and (c) a vertex shared by two diagonally touching blockers (seal the crack; NOT in today). Grazing an OUTER face or a single blocker's corner stays open (DMG-consistent, today's behaviour). Implementation: step 1 a local vertex rule beside firstSharedEdgeBlockingCell in cover.ts with witnesses for all four probe cases (small, rules-visible, needs its own D-ruling and astra review; lands with VIS-FIELD); step 2 the precomputed rectilinear-region/rectangle representation keyed by the blocking topology (the paper's approach) as the VIS-FIELD-PERF batch (also perf fix #3 in D635.53). Question 5 stays: regenerate the cohorts under the solid-wall geometry (A1).

## D642 — OWNER (2026-09-17 19:15): "Seal diagonal corners." — the solid-wall model adopted in full: a ray is blocked by any blocking cell interior, any edge shared by two blockers (D635) and any vertex shared by two diagonally touching blockers; outer-face grazes and single-blocker corner touches stay clear; physical cover tiers unchanged
Owner also confirmed on the annotated image: "The orange and purple lines should not work" (all four corner rays through the column-7 wall are blocked — the seam rule's result). WALL-01 dispatched to sol (resume the seam-rule session 01a0ab3f…, brief impl-vis-field-wall-01.md, log impl-wall-01.log) on the worktree at 807d2e3c: the vertex rule in cover.ts with exact lattice-point enumeration, hand-authored witnesses (crack sealed, single-blocker control, staircase wall sealed at a step vertex — the case the edge rule alone misses, outer-face graze clear, 2x2 solid unchanged), the SEAM batch's DIAGONAL_CORNER_TOUCH_UNCHANGED pin re-pinned by hand to the sealed result (renamed _SEALED_D642), three mutants, per-family consequence counts before/after, the red-set audit (a red in a non-frozen suite is a finding, not a re-pin), and proof that generation bytes are untouched. Astra medium review follows; then question 5 (A1) regenerates the cohorts under the sealed geometry.

## D643 — OWNER (2026-09-17 19:36): "Do your proposal" — the supervisor's recommendations are authorized as a whole
Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.

## D644 — OWNER (2026-09-17 19:45): TEST-PERF ranks 6/8/9 = option A
Rank 6 limited to the visibility-field caches (the VIS-FIELD-PERF batch authorized in D643: explicit visibility epoch + from-scratch differential witness per revision); rank 9 (vitest worker topology / duration-balanced shards / experimental fsModuleCache — gate config only) scheduled as a small measured batch after VIS-FIELD lands, savings measured back-to-back on a quiet box per D632's invariants; rank 6 engine-wide and rank 8 stay deferred until the visibility epoch has proven the pattern. Sequence after landing: TEST-PERF-01 (ranks 1–5, 7) → rank 9 → VIS-FIELD-PERF.

## D645 — SUPERVISOR (2026-09-17 19:53): WALL-01 REJECTED by my verification (WALL-F1, P1: the vertex rule is inert for axis-aligned rays whose sealing pair straddles the line); fix r1 dispatched; COHORT-01 plan (400 lines, sha 6852051d…) harvested and sent to astra HIGH
SOL WALL-01 (saved impl-wall-01-sol.md): gcd lattice enumeration, TL+BR / TR+BL pairs, progress-ordered merge of interior/edge/vertex events, physical tier untouched; 43/43; three mutants killed; counts table "unchanged"; 42 seeds byte-identical; pair 38.6 s; two los-cover budget timeouts. VERIFIED BY ME (clean checkout + patch, traceTerrainLine, Medium tokens, 15x8): blockers (7,3)&(8,4) with the ray cells (13,4)→(1,4): blocksSight FALSE (must be true); (7,4)&(8,3): FALSE; vertical (4,2)&(5,3) with (5,0)→(5,6): FALSE; the diagonal crack cases TRUE. CAUSE (read in cover.ts): sharedVertexBlockingCells is built from `candidates`, which traceSpaces filters by the bounding box of the eight corners; for a ray along a grid line between Medium cells the far-side flank row is outside the box, so the vertex is never registered. Sol's STAIRCASE_WALL_SEALED witness passes only because its geometry keeps both cells inside the box — it does not exercise the case it is named for, and the "counts unchanged" table is not evidence about D642. FIX R1 (sol resumed; brief impl-vis-field-wall-01-fix-r1.md; log impl-wall-01-fix-r1.log): on-the-fly sightBlockingAt lookups around each interior lattice vertex (as the edge rule does), witnesses replaced with my three geometries + a split-pair control, a bbox-regression mutant, counts and generation bytes redone.
COHORT-01 PLAN (sol 01a0b1bb…, saved plan-cohort-01-sol.md; copied to .tmp-plans/2026-09-17-cohort-01-plan.md): 10 batches (validator normalization → RED membership witnesses + frozen-contract retirement → generate 6209 → 6210 → 6211 → manifests v2/v6 + dated ledger → routes → audit/report coverage → three behaviour pins → cap witness), a byte-freeze inventory of v1/v5/6203/6206/6207 checked after every batch, "reject all ten seeds if one fails", no open questions. Astra HIGH (fresh; brief review-plan-cohort-01-astra.md; log review-plan-cohort-01-astra-r1.log) reviewing now, in parallel with the WALL-01 fix.

## D646 — SUPERVISOR (2026-09-17 20:07): COHORT-01 plan r1 REJECTED by astra r1 (HIGH; 0 P1, 3 P2, 1 P3; saved review-plan-cohort-01-astra-r1.md); r2 dispatched to the planner
PLAN-F1 (P2): v6 has no experiment-identity boundary — session keys {family, arm, seed, rep} (d569-blind-experiment.ts:705) and row matching (:762) omit the manifest identity, and the unchanged hard fixtures keep their hashes, so 240/330/240 cells are indistinguishable across v5/v6. PLAN-F2 (P2): the namespace audit is unsound — stale worktree decisions file, patterns miss `6209xxx` and `6_209_001` forms, and D643/D645's reservations must be classified as such. PLAN-F3 (P2): the speculative-planning oracle must be a predeclared hand-calculated scene (≥9 eligible candidates, tie order, the excluded ninth, the exact mutation result). PLAN-F4 (P3): Batch 6 has eight files. Astra independently confirmed the rest: 20/20 fog-key single-key diffs via the real generator; the scout's 12+4 blocked rays per PC (wizard 16) and labels exactly Dodge/End Turn; Room-8 monsters 1/2/4 Dodge, monster 5's 55-ft Dash (10 steps × 5 + 5 difficult); the cap guard rejects a 57,580-byte block and accepts it with the guard disabled; 52 paths (18 existing + 34 new), all existing ones present. All four findings accepted. r2 (planner resumed 01a0b1bb…; brief plan-cohort-01-r2.md; r1 archived as .tmp-plans/2026-09-17-cohort-01-plan.r1.md) must also require canonicalD569SecondFamilyRegeneration in the active v6 test and rejection witnesses for non-fog-key differences and for legacy keys in new fixtures.
     1	# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
     2	
     3	Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
     4	D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
     5	only three brutal v2 families.
     6	
     7	## Outcome and non-negotiable gates
     8	
     9	COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
    10	activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
    11	
    12	1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
    13	   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
    14	   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
    15	   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
    16	2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
    17	   repeat them after every batch and require equality:
    18	   `tests/fixtures/d569-second-family-manifest.json` (v1),
    19	   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
    20	   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
    21	   `arena-basis-brutal-2` (6207). No byte in those paths may change.
    22	3. Never rewrite a historical fixture/manifest, add a D466 override, use
    23	   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
    24	   room fails, reject all ten seeds in that candidate range; record the rejected
    25	   namespace, audit the next unused contiguous namespace, and restart that
    26	   whole family. Do not keep nine rooms.
    27	4. No expectation may be copied from changed-code output. Sources are frozen
    28	   pre-change bytes, named hand derivations, or hashes after all generation gates.
    29	5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
    30	   The supervisor's later landing gate is separate and must read the full,
    31	   untruncated result.
    32	
    33	Common commands used after every batch:
    34	
    35	- **T:** `npx tsc -p tsconfig.app.json --noEmit` and
    36	  `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
    37	- **V-diff:** `git diff --check` -> no output; `git status --short` contains
    38	  only that batch's Allowed files plus accepted earlier batches.
    39	- **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
    40	
    41	## D569 demonstrate-then-normalize ledger
    42	
    43	Every pin has an explicit source and ordering:
    44	
    45	1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
    46	   committed bytes and current generation must be exactly
    47	   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
    48	   key for comparison, never from generated bytes.
    49	2. **New fixture hashes (30):** namespace evidence -> decoded membership and
    50	   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
    51	   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
    52	3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
    53	   hashes; finalize and independently hash v2 before inserting its hash in v6.
    54	4. **Experiment v6:** copy v5, changing only `version`, primary brutal
    55	   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
    56	   assert exactly those changes.
    57	5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
    58	   comments as pre-D635/D642 history, never changed-code output.
    59	6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
    60	   schema-valid oversized semantic block; there is no derived replacement value.
    61	
    62	## Ordered batches
    63	
    64	### Batch 1 — validator normalization and historical v1 semantics
    65	
    66	**Allowed files (3):**
    67	
    68	- `tools/d569-second-family-manifest.ts`
    69	- `tests/unit/tools/d569-second-family-manifest.test.ts`
    70	- `tests/unit/tools/d569-v5.test.ts`
    71	
    72	**R (write first):** add a 20-path table red until it reports the single path;
    73	add a rebound fixture with updated raw hash plus one other state difference,
    74	requiring both regeneration codes; retain the divergent-generation-2 witness.
    75	Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
    76	
    77	**Implementation:** make the second-family schema a strict v1/v2 discriminated
    78	union. Its comparison policy is version/cohort aware:
    79	
    80	- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
    81	  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
    82	  one trailing newline, and compare both regenerations to that projection;
    83	- v2 hard-2: use the same projection because those ten raw files are carried;
    84	- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
    85	
    86	Make v1 explicitly historical: continue integrity plus hard and static brutal
    87	(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
    88	productivity against post-D635/D642 geometry. V2 retains the full current
    89	`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
    90	`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
    91	commented historical/static check; do not assert that frozen rooms satisfy a
    92	contract they no longer satisfy.
    93	
    94	`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
    95	through the stated historical rules, never by reading v6. Historical
    96	`seed - 6203000` arithmetic may remain only there.
    97	
    98	**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
    99	delete the entire state or ignore committed bytes -> the extra-field witness
   100	survives and the batch fails; (c) apply v1's productivity rule to v2=false or
   101	skip v2 productivity -> the later nonproductive v2 witness fails.
   102	
   103	**T/V:** T, V-diff, V-freeze; then
   104	`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
   105	
   106	### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
   107	
   108	**Allowed files (3):**
   109	
   110	- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
   111	- `tests/unit/vtt/room-generator.test.ts`
   112	- `tests/unit/vtt/arena-basis-brutal-b.test.ts`
   113	
   114	**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
   115	fail on 30 missing fixtures. Add negative clones for a nonproductive living
   116	monster and a productive ranged offer blocked from its resolved origin.
   117	
   118	**Implementation:** create shared test assertions that decode fixture bytes,
   119	then prove, in this order: identity/integrity and reducer load; brutal budget
   120	and 90-100% spend; implemented caster; terrain density/count band; every living
   121	monster has a valid productive first-turn option; and for the selected option's
   122	attack/save/cast target(s), `traceCombatantLine` from
   123	`resolution.mechanics.finalPosition` has `blocksSight === false` and
   124	`tier !== 'total'`. This is the per-monster strengthening of the existing
   125	productivity contract; cite `generatedLineIsOpen` as the generator's stricter
   126	room-level open-ray predicate. Only after all properties may a byte hash assert.
   127	
   128	Move, do not weaken, the current productivity assertions:
   129	
   130	- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
   131	  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
   132	  generation/fixture block;
   133	- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
   134	  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
   135	  recertification; keep the round-execution tests unchanged;
   136	- Batch 1 already retires only the frozen 6207 productivity assertion.
   137	
   138	Each retirement gets a D635/D642/D643 comment: bytes remain history; the
   139	productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
   140	pin.
   141	
   142	**M:** force productivity true and separately treat `blocksSight:true` as open;
   143	the two negative clones must kill the mutants.
   144	
   145	**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
   146	only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
   147	productivity red after the precise retirement.
   148	
   149	### Batch 3 — generate primary brutal-v2 (6209001-6209010)
   150	
   151	**Allowed files (10):**
   152	
   153	- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
   154	- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
   155	- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
   156	- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
   157	- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
   158	- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
   159	- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
   160	- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
   161	- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
   162	- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
   163	
   164	**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
   165	blocked-trace mutants remain RED after generation.
   166	
   167	**Generation/V:** run twice into distinct `mktemp -d` roots:
   168	`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
   169	No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
   170	`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
   171	output; decoded membership -> 10/10 rooms and every living monster passes.
   172	Move A unchanged to the allowed directory, re-run membership, T,
   173	V-diff, V-freeze. Do not calculate/pin hashes yet.
   174	
   175	### Batch 4 — generate brutal-b-v2 (6210001-6210010)
   176	
   177	**Allowed files (10):**
   178	
   179	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
   180	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
   181	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
   182	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
   183	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
   184	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
   185	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
   186	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
   187	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
   188	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
   189	
   190	**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
   191	`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
   192	membership, no D466 override, common T/V green, no hashes yet.
   193	
   194	### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
   195	
   196	**Allowed files (10):**
   197	
   198	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
   199	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
   200	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
   201	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
   202	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
   203	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
   204	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
   205	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
   206	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
   207	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
   208	
   209	**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
   210	`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
   211	tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
   212	under their named mutants. A failure rejects that entire ten-seed namespace.
   213	
   214	### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
   215	
   216	**Allowed files (7):**
   217	
   218	- `tools/d569-second-family-manifest.ts`
   219	- `tools/d569-blind-experiment.ts`
   220	- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
   221	- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
   222	- `tests/unit/tools/d569-second-family-manifest.test.ts`
   223	- `tests/unit/tools/d569-blind-experiment.test.ts`
   224	- `tests/unit/tools/d569-v6.test.ts` (new)
   225	- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
   226	
   227	**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
   228	reference, execute from the clean WALL-01 checkout and copy these commands plus
   229	their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
   230	
   231	```text
   232	git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
   233	git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
   234	git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
   235	```
   236	
   237	The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
   238	WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
   239	`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
   240	6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
   241	brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
   242	
   243	**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
   244	diff test, and exact cardinality tests. They must fail for missing manifests and
   245	unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
   246	map; no `seed - 6203000` arithmetic may occur in a v6 path.
   247	
   248	**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
   249	raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
   250	dated ledger, and the extended namespace list. V6 contains version
   251	`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
   252	and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
   253	Keep old path constants as explicitly historical v5/v1 constants; add distinct
   254	active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
   255	`d569-v5.test.ts`. Make the outer strict union validate each version against
   256	its own primary ranges, directories, nested path, and second-family policy.
   257	
   258	Only now compute 30 hashes with both commands and add pins after membership.
   259	Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
   260	primary brutal 240, primary brutal+hints 330, and second-family core 480.
   261	
   262	**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
   263	membership -> membership code; accepting 6207/6209 overlap -> range code; v6
   264	using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
   265	
   266	**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
   267	and v2; targeted three D569 suites -> zero violations and exact
   268	480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
   269	
   270	### Batch 7 — versioned arena and rerun routes
   271	
   272	**Allowed files (4):**
   273	
   274	- `tools/ai-dm-arena.ts`
   275	- `tests/unit/tools/ai-dm-arena.test.ts`
   276	- `tools/ai-dm-rerun-packet.ts`
   277	- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
   278	
   279	**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
   280	and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
   281	
   282	**Implementation:** extend the closed arena basis union/path switch to the 6209
   283	and 6210 directories; both generate-missing difficulty mappings remain brutal.
   284	Add exact ten-seed arrays and closed rerun protocol mappings at the current
   285	definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
   286	`brutal-10`, and `brutal-10-b` byte behavior and tests.
   287	
   288	**M:** map either v2 label/protocol to its old directory/range and require the
   289	new seed/path and wrong-family tests to fail; remove an old label and require
   290	the historical-route tests to fail.
   291	
   292	**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
   293	new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
   294	protocol accepts exactly ten intended seeds and rejects old-family seed 1.
   295	
   296	### Batch 8 — audit/report coverage for all three new families
   297	
   298	**Allowed files (4):**
   299	
   300	- `tools/los-cover-era-audit.ts`
   301	- `tests/unit/tools/los-cover-era-audit.test.ts`
   302	- `tools/blind-context-fixture-report.ts`
   303	- `tests/unit/vtt/blind-turn-context.test.ts`
   304	
   305	**R:** add family/census assertions before wiring; expected missing rows are 30.
   306	
   307	**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
   308	file-backed families. Keep all historical entries. Era audit becomes 93 rooms
   309	(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
   310	ten per new family, all decoded from the committed fixture paths.
   311	
   312	**M:** omit one new family or point it at an old directory; exact family,
   313	seed, count, and fixture-hash assertions fail.
   314	
   315	**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
   316	blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
   317	
   318	### Batch 9 — three behavior pins, hand-authored evidence only
   319	
   320	**Allowed files (3):**
   321	
   322	- `tests/unit/vtt/composite-turn-proposals.test.ts`
   323	- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
   324	- `tests/unit/vtt/speculative-planning.test.ts`
   325	
   326	**R:** retain the three current deterministic RED titles as the before state.
   327	Do not change production code to recover obsolete geometry.
   328	
   329	**Implementation:**
   330	
   331	- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
   332	  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
   333	  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
   334	  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
   335	  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
   336	  sight-blocked, so LAND-01 correctly withholds all Longbows.
   337	- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
   338	  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
   339	  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
   340	- Speculative planning: replace frozen seed 5117001 with a small hand-authored
   341	  state containing exactly two monster baseline proposals and one movable
   342	  player dependency. In comments enumerate each canonical player movement
   343	  radius, each candidate's proposal references, and the independent arithmetic
   344	  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
   345	  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
   346	  lower-ranked hand-authored dependencies to exercise truncation at exactly
   347	  eight. A diagonal two-wall corner mutation (D642) must remove/change the
   348	  relevant offensive proposal dependency and therefore empty or deterministically
   349	  change the menu. Never accept the frozen scene's empty menu as a new pin.
   350	
   351	**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
   352	or remove the eight-entry slice; the exact labels/positions, seam mutation, or
   353	rank/cap witness fails.
   354	
   355	**T/V:** common T/V; run the three named files serially -> all green, exactly
   356	the three reconciled titles pass, and the speculative base/mutation outcomes
   357	are distinct.
   358	
   359	### Batch 10 — 32,768-byte cap rejection witness
   360	
   361	**Allowed files (1):**
   362	
   363	- `tests/unit/vtt/blind-turn-context.test.ts`
   364	
   365	**R:** this is a witness for already-authorized behavior, so baseline may be
   366	green; the required RED is the guard-disabled mutant below.
   367	
   368	**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
   369	replace one semantic creature `name` with 40,000 characters (the schema permits
   370	an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
   371	call `renderBlindTurnContext` with the ordinary blind projection. Assert the
   372	measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
   373	32_768` and the exact `RangeError` names the required and maximum byte counts.
   374	
   375	**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
   376	guard; this one test must turn RED because the oversized context is accepted.
   377	
   378	**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
   379	mutant -> 1 failed; restore and verify source hash exactly.
   380	
   381	## Final targeted verification and handoff
   382	
   383	Run serially only the touched suites (no full Vitest): second-family, blind
   384	experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
   385	rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
   386	zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
   387	480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
   388	63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
   389	inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
   390	`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
   391	the union of Allowed files.
   392	
   393	The supervisor then performs the separate untruncated full landing gate and
   394	review required by D643. Any deterministic red outside this plan is a finding,
   395	not a re-pin.
   396	
   397	## Open questions for the owner
   398	
   399	None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
   400	COHORT-01 PLAN DONE

context compacted
exec
/bin/bash -lc "sed -n '1,420p' .tmp-plans/2026-09-17-cohort-01-plan.md
sed -n '23035,23085p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
sed -n '620,790p' src/vtt/speculative-planning.ts
sed -n '680,785p' tools/d569-blind-experiment.ts
sed -n '275,310p' tests/unit/tools/d569-blind-experiment.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)

Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
only three brutal v2 families.

## Outcome and non-negotiable gates

COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.

1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
   repeat them after every batch and require equality:
   `tests/fixtures/d569-second-family-manifest.json` (v1),
   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
   `arena-basis-brutal-2` (6207). No byte in those paths may change.
3. Never rewrite a historical fixture/manifest, add a D466 override, use
   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
   room fails, reject all ten seeds in that candidate range; record the rejected
   namespace, audit the next unused contiguous namespace, and restart that
   whole family. Do not keep nine rooms.
4. No expectation may be copied from changed-code output. Sources are frozen
   pre-change bytes, named hand derivations, or hashes after all generation gates.
5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
   The supervisor's later landing gate is separate and must read the full,
   untruncated result.

Common commands used after every batch:

- **T:** `npx tsc -p tsconfig.app.json --noEmit` and
  `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
- **V-diff:** `git diff --check` -> no output; `git status --short` contains
  only that batch's Allowed files plus accepted earlier batches.
- **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.

## D569 demonstrate-then-normalize ledger

Every pin has an explicit source and ordering:

1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
   committed bytes and current generation must be exactly
   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
   key for comparison, never from generated bytes.
2. **New fixture hashes (30):** namespace evidence -> decoded membership and
   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
   hashes; finalize and independently hash v2 before inserting its hash in v6.
4. **Experiment v6:** copy v5, changing only `version`, primary brutal
   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
   assert exactly those changes.
5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
   comments as pre-D635/D642 history, never changed-code output.
6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
   schema-valid oversized semantic block; there is no derived replacement value.

## Ordered batches

### Batch 1 — validator normalization and historical v1 semantics

**Allowed files (3):**

- `tools/d569-second-family-manifest.ts`
- `tests/unit/tools/d569-second-family-manifest.test.ts`
- `tests/unit/tools/d569-v5.test.ts`

**R (write first):** add a 20-path table red until it reports the single path;
add a rebound fixture with updated raw hash plus one other state difference,
requiring both regeneration codes; retain the divergent-generation-2 witness.
Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.

**Implementation:** make the second-family schema a strict v1/v2 discriminated
union. Its comparison policy is version/cohort aware:

- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
  one trailing newline, and compare both regenerations to that projection;
- v2 hard-2: use the same projection because those ten raw files are carried;
- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.

Make v1 explicitly historical: continue integrity plus hard and static brutal
(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
productivity against post-D635/D642 geometry. V2 retains the full current
`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
commented historical/static check; do not assert that frozen rooms satisfy a
contract they no longer satisfy.

`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
through the stated historical rules, never by reading v6. Historical
`seed - 6203000` arithmetic may remain only there.

**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
delete the entire state or ignore committed bytes -> the extra-field witness
survives and the batch fails; (c) apply v1's productivity rule to v2=false or
skip v2 productivity -> the later nonproductive v2 witness fails.

**T/V:** T, V-diff, V-freeze; then
`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.

### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement

**Allowed files (3):**

- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
- `tests/unit/vtt/room-generator.test.ts`
- `tests/unit/vtt/arena-basis-brutal-b.test.ts`

**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
fail on 30 missing fixtures. Add negative clones for a nonproductive living
monster and a productive ranged offer blocked from its resolved origin.

**Implementation:** create shared test assertions that decode fixture bytes,
then prove, in this order: identity/integrity and reducer load; brutal budget
and 90-100% spend; implemented caster; terrain density/count band; every living
monster has a valid productive first-turn option; and for the selected option's
attack/save/cast target(s), `traceCombatantLine` from
`resolution.mechanics.finalPosition` has `blocksSight === false` and
`tier !== 'total'`. This is the per-monster strengthening of the existing
productivity contract; cite `generatedLineIsOpen` as the generator's stricter
room-level open-ray predicate. Only after all properties may a byte hash assert.

Move, do not weaken, the current productivity assertions:

- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
  generation/fixture block;
- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
  recertification; keep the round-execution tests unchanged;
- Batch 1 already retires only the frozen 6207 productivity assertion.

Each retirement gets a D635/D642/D643 comment: bytes remain history; the
productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
pin.

**M:** force productivity true and separately treat `blocksSight:true` as open;
the two negative clones must kill the mutants.

**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
productivity red after the precise retirement.

### Batch 3 — generate primary brutal-v2 (6209001-6209010)

**Allowed files (10):**

- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`

**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
blocked-trace mutants remain RED after generation.

**Generation/V:** run twice into distinct `mktemp -d` roots:
`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
output; decoded membership -> 10/10 rooms and every living monster passes.
Move A unchanged to the allowed directory, re-run membership, T,
V-diff, V-freeze. Do not calculate/pin hashes yet.

### Batch 4 — generate brutal-b-v2 (6210001-6210010)

**Allowed files (10):**

- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`

**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
membership, no D466 override, common T/V green, no hashes yet.

### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)

**Allowed files (10):**

- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`

**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
under their named mutants. A failure rejects that entire ten-seed namespace.

### Batch 6 — manifests, dated namespace ledger, active v6, then hashes

**Allowed files (7):**

- `tools/d569-second-family-manifest.ts`
- `tools/d569-blind-experiment.ts`
- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
- `tests/unit/tools/d569-second-family-manifest.test.ts`
- `tests/unit/tools/d569-blind-experiment.test.ts`
- `tests/unit/tools/d569-v6.test.ts` (new)
- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`

**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
reference, execute from the clean WALL-01 checkout and copy these commands plus
their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:

```text
git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
```

The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.

**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
diff test, and exact cardinality tests. They must fail for missing manifests and
unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
map; no `seed - 6203000` arithmetic may occur in a v6 path.

**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
dated ledger, and the extended namespace list. V6 contains version
`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
Keep old path constants as explicitly historical v5/v1 constants; add distinct
active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
`d569-v5.test.ts`. Make the outer strict union validate each version against
its own primary ranges, directories, nested path, and second-family policy.

Only now compute 30 hashes with both commands and add pins after membership.
Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
primary brutal 240, primary brutal+hints 330, and second-family core 480.

**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
membership -> membership code; accepting 6207/6209 overlap -> range code; v6
using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.

**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
and v2; targeted three D569 suites -> zero violations and exact
480/660/240/330/480 counts. V1/v5 targeted suites also remain green.

### Batch 7 — versioned arena and rerun routes

**Allowed files (4):**

- `tools/ai-dm-arena.ts`
- `tests/unit/tools/ai-dm-arena.test.ts`
- `tools/ai-dm-rerun-packet.ts`
- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`

**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.

**Implementation:** extend the closed arena basis union/path switch to the 6209
and 6210 directories; both generate-missing difficulty mappings remain brutal.
Add exact ten-seed arrays and closed rerun protocol mappings at the current
definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
`brutal-10`, and `brutal-10-b` byte behavior and tests.

**M:** map either v2 label/protocol to its old directory/range and require the
new seed/path and wrong-family tests to fail; remove an old label and require
the historical-route tests to fail.

**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
protocol accepts exactly ten intended seeds and rejects old-family seed 1.

### Batch 8 — audit/report coverage for all three new families

**Allowed files (4):**

- `tools/los-cover-era-audit.ts`
- `tests/unit/tools/los-cover-era-audit.test.ts`
- `tools/blind-context-fixture-report.ts`
- `tests/unit/vtt/blind-turn-context.test.ts`

**R:** add family/census assertions before wiring; expected missing rows are 30.

**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
file-backed families. Keep all historical entries. Era audit becomes 93 rooms
(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
ten per new family, all decoded from the committed fixture paths.

**M:** omit one new family or point it at an old directory; exact family,
seed, count, and fixture-hash assertions fail.

**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.

### Batch 9 — three behavior pins, hand-authored evidence only

**Allowed files (3):**

- `tests/unit/vtt/composite-turn-proposals.test.ts`
- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
- `tests/unit/vtt/speculative-planning.test.ts`

**R:** retain the three current deterministic RED titles as the before state.
Do not change production code to recover obsolete geometry.

**Implementation:**

- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
  sight-blocked, so LAND-01 correctly withholds all Longbows.
- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
- Speculative planning: replace frozen seed 5117001 with a small hand-authored
  state containing exactly two monster baseline proposals and one movable
  player dependency. In comments enumerate each canonical player movement
  radius, each candidate's proposal references, and the independent arithmetic
  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
  lower-ranked hand-authored dependencies to exercise truncation at exactly
  eight. A diagonal two-wall corner mutation (D642) must remove/change the
  relevant offensive proposal dependency and therefore empty or deterministically
  change the menu. Never accept the frozen scene's empty menu as a new pin.

**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
or remove the eight-entry slice; the exact labels/positions, seam mutation, or
rank/cap witness fails.

**T/V:** common T/V; run the three named files serially -> all green, exactly
the three reconciled titles pass, and the speculative base/mutation outcomes
are distinct.

### Batch 10 — 32,768-byte cap rejection witness

**Allowed files (1):**

- `tests/unit/vtt/blind-turn-context.test.ts`

**R:** this is a witness for already-authorized behavior, so baseline may be
green; the required RED is the guard-disabled mutant below.

**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
replace one semantic creature `name` with 40,000 characters (the schema permits
an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
call `renderBlindTurnContext` with the ordinary blind projection. Assert the
measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
32_768` and the exact `RangeError` names the required and maximum byte counts.

**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
guard; this one test must turn RED because the oversized context is accepted.

**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
mutant -> 1 failed; restore and verify source hash exactly.

## Final targeted verification and handoff

Run serially only the touched suites (no full Vitest): second-family, blind
experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
the union of Allowed files.

The supervisor then performs the separate untruncated full landing gate and
review required by D643. Any deterministic red outside this plan is a finding,
not a re-pin.

## Open questions for the owner

None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
COHORT-01 PLAN DONE
## D635.52 — SUPERVISOR (2026-09-17 09:52): untruncated full vitest on 807d2e3c = 47 reds / 13 files (11485/11532): EXACTLY the predicted 37 + 10 full-run budget timeouts; VIS-FIELD is now blocked only on question 5; perf investigation dispatched
CLASSIFIED (full-vitest-807d2e3c.log, all titles listed): seam-rule frozen-family/behaviour set = brutal productivity 8 (room-generator) + second-family manifest 8 + brutal-b 10 + D569 blind-experiment 6 + d569-v5 file-level 1 + composite-turn-proposals 1 + engine-opportunity-movement-intel 1 + speculative-planning 1 = 36; vane-tpk 1 (perf, 7817 ms in the full run); the other 10 are 5.0–6.3 s budget timeouts that pass isolated on a quiet machine (los-cover 3 — 112/112 quiet; d583 contract inventory 6; replay 1; js-round-plan 1 — 35/35 quiet). No new deterministic red. The B2/B6 consequences (28 byte pins, 13 digests, 4 cap pins, legacy invariance) are gone. NOTE for TEST-PERF: the branch's per-turn cost makes thin 5 s budgets thinner (los-cover 5.9–6.2 s in the full run vs main's 17 load timeouts at landing) — the pre-existing budgets plus a ~2× slowdown on visibility-heavy fights.
DISPATCHED (read-only investigation, fresh sol high, brief .tmp/runs/test-perf/investigate-vis-field-slowdown.md, log investigate-slowdown.log): profile vane-tpk (3077 → 6585 ms), the los-cover productive-option test and the D630 pair on the branch vs main; top-3 hot paths with bounded fix proposals and the invariants/witnesses each must keep; flag any correctness smell (field computed for ineligible observers, traces for unreachable targets). Feeds TEST-PERF-01; no code changes.
STATE: claude/vis-field = 807d2e3c (LAND-01..04 all accepted). Landing = owner's question 5 → (A) new-cohort regeneration batch for brutal, brutal-b and brutal-2 + re-pins of the three hard-family behaviour witnesses + D569 manifest versioning, then the full landing gate read UNTRUNCATED, merge, mirror push (D640); (B)/(C) per ruling.

## D635.53 — SUPERVISOR (2026-09-17 10:21): VIS-FIELD slowdown profiled (sol, read-only; saved .claude/consensus/test-perf/investigate-vis-field-slowdown-sol.md); three bounded fixes queued for TEST-PERF-01 / a post-landing VIS-FIELD perf batch
MEASURED (sol, both trees' production hashes identical before/after; my own numbers agree: vane 3077 → 6585 ms): vane-tpk 3180 → 6820 ms (2.14×). NOT more detection queries (0.83×) but each sight query expanding into per-target-cell traces (visibility-field.ts:431): traceSpaces 95k → 348k (3.67×), traceCornerLine 124k → 536k (4.33×); 91.7% of cell traces are pairwise sightToCreature detection (~4.8 s inclusive), only 8.3% the derived field itself (~0.55 s). The field's weak caches (visibility-field.ts:104) are keyed by EncounterState identity, so immutable reducer revisions make nearly every request cold (206 projections over 205 distinct revisions; 140 traces each). los-cover productive-option 5472 → 6139 ms (+12%): the seam scan (firstSharedEdgeBlockingCell 4.17M calls, 380 ms) plus ~0.7 s more in traceCornerLine; also 33,953 of 46,650 reach traces (72.8%) were for candidates then refused by RANGE — geometry evaluated before the cheap range check. D630 pair 33.6 → 41.5 s: replay.ts:238 projects DM + every PC per replayed revision (derived fog 3,361 calls); the replay file rebuilds the scripted gate 15 times (13 default) at ~1.9 s each.
FIXES (bounded, with required witnesses): (1) TEST-ONLY: build each parameterized replay gate once, deep-freeze, structuredClone per mutating test (~20–23 s off the replay file; witness: gate hash unchanged across tests, shuffled order twice, corruption tests still fail on their own clones) — this is TEST-PERF-01's default-gate reuse item, confirmed as the largest test-only win; (2) PRODUCTION: cache visibility outcomes by an explicit visibility epoch (bumped by movement, footprints, walls/objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, observer eligibility; HP/log-only revisions reuse) + observer/subject key instead of state identity (~2.5–3.5 s in vane; witness: per revision, cached == from-scratch for every eligible pair and cell, byte-identical fog/reason/sense/grade and projection hashes, incl. Large/Huge footprints, seam rays, darkness, obscurement, Invisible/Hidden/Blinded, death/placement); (3) TEST-ONLY: generate the nine versioned rooms once per suite, deep-frozen (~4.5 s per named los-cover test) + optional seam memoization by blocking-topology signature (~0.35–0.7 s); (4) small: prefilter range before LOS inside offer generation only (public reach precedence unchanged; ~0.2–0.3 s).
CORRECTNESS: no field computed for ineligible observers (eligibleVisibilityObserverIds :525 excludes dead/unplaced/adjudication-pending/unconscious); per-cell tracing for large footprints is correctness-sensitive (a single representative ray would regress); the seam scan is required work. State-identity caching = design smell, not a defect. DISPOSITION: (1)+(3) go into TEST-PERF-01 (owner's ranks 6/8/9 still pending); (2)+(4) = a VIS-FIELD-PERF batch after landing, planned and reviewed like any batch; the 5 s budgets are NOT re-pinned meanwhile.

## D635.54 — SUPERVISOR (2026-09-17 11:06): option A costed (sol, read-only; saved investigate-option-a-costing-sol.md); a refinement of the attribution — 40 of the second-family ledger's 47 violations are B2's fog key, not the seam rule
REFINEMENT (sol; consistent with the failure text I saw in D635.46): the ledger pin's 47 markers = 20 second-family fixtures (hard-2 5118xxx AND brutal-2 6207xxx) × 2 byte-regeneration checks (first_regeneration / independent_regeneration — the validator rebuilds each fixture with generateRoom twice and requires byte equality with the committed bytes, which still carry the removed foggedCells key) = 40, plus 7 brutal-2 productivity violations. So the second-family manifest is red for TWO reasons: B2's key (40, the same consequence LAND-04 normalized for the generator pins) and the seam rule (7). Neither option B nor C repairs the 40. d569-v5.test.ts fails at file level because it validates the manifest at module load.
MACHINERY: "regeneration" in D569 means a second deterministic build, not a cohort version; the sanctioned precedent for a NEW cohort is the second family itself (D569: predeclare unused ranges with a verbatim namespace audit, generate into a new directory, prove membership from decoded state, generate twice and compare bytes, pin hashes only then, nest the manifest hash) — history is never edited in place. No tracked RL row and no docs bind the brutal families.
OPTION A as costed by sol (40 fixtures: brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx, PLUS hard-3 5120xxx because hard-2's bytes fail the fog-key regeneration; new d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v5/v1 kept frozen; 42 new SHA-256 pins; ~62–66 paths; ~865 KB fixtures; versioned arena/rerun routes brutal-v2 / brutal-10-v2 rather than retargeting historical names; negative witnesses required; d569-v5.test.ts stays historical, a v6 test becomes active). Hard-family pins: composite-turn-proposals and Room-8 opportunity-intel are hand-derivable re-pins on the same scenes (Dodge/End Turn only; monsters 1/2/4 zero-foot Dodge, monster 5 keeps its 55-ft Dash); speculative-planning must NOT be normalized to an empty menu — it needs a small hand-authored scene with an independently computed volatility score and a seam mutation.
MY REFINEMENT TO A (A1, recommended over sol's A2): treat the 40 fog-key regeneration violations exactly as LAND-04 treated the generator pins — the validator's byte-regeneration comparison drops the obsolete legacy key from the committed bytes before comparing (a version-aware projection, demonstrated per fixture as a single-key structural diff), so hard-2 (5118xxx) stays the historical hard half and only the three BRUTAL cohorts regenerate: 30 fixtures instead of 40, no hard-3 namespace, second-family v2 = hard-2 (as is) + brutal-2-v2. Risk noted by sol applies: the normalization must be a demonstrated single-key projection, never a rewrite of manifest bytes.
B (6–10 files, relaxes everyMonsterProductive; leaves the 40 and the speculative scene broken; brutal-b has 41/42 monsters without attack offers under the seam so any threshold would be fitted to the failures) and C (reverses D635's optical ruling; restores the three behaviour pins and 214→451 offers; 10–20 files + full revalidation of cover/sight/fields/offers/browser; still leaves the 40) — both advised against.

## D641 — OWNER (2026-09-17 18:48): "I think we need to model that a wall is solid across cells. It is not just a series of cells. Look for how others have handled this." — research done by the supervisor; question put back to the owner
PROBED BY ME on 807d2e3c (traceTerrainLine, 6x6 board): (1) two blockers touching only at a corner, (2,1)&(1,2), observer (0,0) → target (3,3) through the shared vertex: tier half, blocksSight FALSE — the diagonal crack lets sight through; (2) solid 2x2 block: total, TRUE; (3) wall column with the ray along its face-line between two blockers (the D635 seam): half, TRUE; (4) a ray grazing one blocker's corner: none, FALSE. So today's tracer = closed cells whose interiors block + the D635 shared-EDGE rule; shared CORNERS of diagonally touching blockers are still open.
HOW OTHERS DO IT (sources in the reply): D&D 2014 DMG corner trace — lines from a corner to the target's corners; whether a line that merely TOUCHES an obstacle counts is explicitly the DM's call (the SRD 5.2.1 only defines cover degrees by "covers at least half / three-quarters / the whole target"); Gloomhaven — corner-to-corner lines, and "the line cannot touch or cross a wall at any point; touching the very edge of a wall still means no LOS" (walls are closed sets; touching = blocked); Foundry VTT / Roll20 — walls are SEGMENTS with endpoints (thin walls), not cells, so no cell seams exist and a long wall is one solid segment by construction; roguelikes (Red Blob "thin wall FOV", Adam Milazzo's survey, Albert Ford's symmetric shadowcasting, RogueBasin comparative study) — "thick walls" (blocking cells) vs "thin walls" (blocking edges) is the standard framing, and diagonal-gap peeking between corner-touching blockers is a known nuisance that implementations bevel or seal; Debenham & Solis-Oba, "New Algorithms for Computing Field of Vision over 2D Grids" (arXiv 2101.11002) — "adjacent vision blocking cells are first grouped together into rectilinear regions, then split into a minimal number of rectangles", and their Figure 5 is exactly our seam: two adjacent rectangles let a ray slip along the shared side, which they fix by extending one rectangle to overlap the other so the union is solid.
PROPOSAL (to the owner, one question): adopt a SOLID-WALL model — the wall is the union of sight-blocking cells as closed rectilinear regions; a ray is blocked iff it passes through the union's interior, which includes (a) any blocking cell's interior, (b) an edge shared by two blockers (D635, already in), and (c) a vertex shared by two diagonally touching blockers (seal the crack; NOT in today). Grazing an OUTER face or a single blocker's corner stays open (DMG-consistent, today's behaviour). Implementation: step 1 a local vertex rule beside firstSharedEdgeBlockingCell in cover.ts with witnesses for all four probe cases (small, rules-visible, needs its own D-ruling and astra review; lands with VIS-FIELD); step 2 the precomputed rectilinear-region/rectangle representation keyed by the blocking topology (the paper's approach) as the VIS-FIELD-PERF batch (also perf fix #3 in D635.53). Question 5 stays: regenerate the cohorts under the solid-wall geometry (A1).

## D642 — OWNER (2026-09-17 19:15): "Seal diagonal corners." — the solid-wall model adopted in full: a ray is blocked by any blocking cell interior, any edge shared by two blockers (D635) and any vertex shared by two diagonally touching blockers; outer-face grazes and single-blocker corner touches stay clear; physical cover tiers unchanged
Owner also confirmed on the annotated image: "The orange and purple lines should not work" (all four corner rays through the column-7 wall are blocked — the seam rule's result). WALL-01 dispatched to sol (resume the seam-rule session 01a0ab3f…, brief impl-vis-field-wall-01.md, log impl-wall-01.log) on the worktree at 807d2e3c: the vertex rule in cover.ts with exact lattice-point enumeration, hand-authored witnesses (crack sealed, single-blocker control, staircase wall sealed at a step vertex — the case the edge rule alone misses, outer-face graze clear, 2x2 solid unchanged), the SEAM batch's DIAGONAL_CORNER_TOUCH_UNCHANGED pin re-pinned by hand to the sealed result (renamed _SEALED_D642), three mutants, per-family consequence counts before/after, the red-set audit (a red in a non-frozen suite is a finding, not a re-pin), and proof that generation bytes are untouched. Astra medium review follows; then question 5 (A1) regenerates the cohorts under the sealed geometry.

## D643 — OWNER (2026-09-17 19:36): "Do your proposal" — the supervisor's recommendations are authorized as a whole
Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.

## D644 — OWNER (2026-09-17 19:45): TEST-PERF ranks 6/8/9 = option A
Rank 6 limited to the visibility-field caches (the VIS-FIELD-PERF batch authorized in D643: explicit visibility epoch + from-scratch differential witness per revision); rank 9 (vitest worker topology / duration-balanced shards / experimental fsModuleCache — gate config only) scheduled as a small measured batch after VIS-FIELD lands, savings measured back-to-back on a quiet box per D632's invariants; rank 6 engine-wide and rank 8 stay deferred until the visibility epoch has proven the pattern. Sequence after landing: TEST-PERF-01 (ranks 1–5, 7) → rank 9 → VIS-FIELD-PERF.

## D645 — SUPERVISOR (2026-09-17 19:53): WALL-01 REJECTED by my verification (WALL-F1, P1: the vertex rule is inert for axis-aligned rays whose sealing pair straddles the line); fix r1 dispatched; COHORT-01 plan (400 lines, sha 6852051d…) harvested and sent to astra HIGH
SOL WALL-01 (saved impl-wall-01-sol.md): gcd lattice enumeration, TL+BR / TR+BL pairs, progress-ordered merge of interior/edge/vertex events, physical tier untouched; 43/43; three mutants killed; counts table "unchanged"; 42 seeds byte-identical; pair 38.6 s; two los-cover budget timeouts. VERIFIED BY ME (clean checkout + patch, traceTerrainLine, Medium tokens, 15x8): blockers (7,3)&(8,4) with the ray cells (13,4)→(1,4): blocksSight FALSE (must be true); (7,4)&(8,3): FALSE; vertical (4,2)&(5,3) with (5,0)→(5,6): FALSE; the diagonal crack cases TRUE. CAUSE (read in cover.ts): sharedVertexBlockingCells is built from `candidates`, which traceSpaces filters by the bounding box of the eight corners; for a ray along a grid line between Medium cells the far-side flank row is outside the box, so the vertex is never registered. Sol's STAIRCASE_WALL_SEALED witness passes only because its geometry keeps both cells inside the box — it does not exercise the case it is named for, and the "counts unchanged" table is not evidence about D642. FIX R1 (sol resumed; brief impl-vis-field-wall-01-fix-r1.md; log impl-wall-01-fix-r1.log): on-the-fly sightBlockingAt lookups around each interior lattice vertex (as the edge rule does), witnesses replaced with my three geometries + a split-pair control, a bbox-regression mutant, counts and generation bytes redone.
COHORT-01 PLAN (sol 01a0b1bb…, saved plan-cohort-01-sol.md; copied to .tmp-plans/2026-09-17-cohort-01-plan.md): 10 batches (validator normalization → RED membership witnesses + frozen-contract retirement → generate 6209 → 6210 → 6211 → manifests v2/v6 + dated ledger → routes → audit/report coverage → three behaviour pins → cap witness), a byte-freeze inventory of v1/v5/6203/6206/6207 checked after every batch, "reject all ten seeds if one fails", no open questions. Astra HIGH (fresh; brief review-plan-cohort-01-astra.md; log review-plan-cohort-01-astra-r1.log) reviewing now, in parallel with the WALL-01 fix.

## D646 — SUPERVISOR (2026-09-17 20:07): COHORT-01 plan r1 REJECTED by astra r1 (HIGH; 0 P1, 3 P2, 1 P3; saved review-plan-cohort-01-astra-r1.md); r2 dispatched to the planner
PLAN-F1 (P2): v6 has no experiment-identity boundary — session keys {family, arm, seed, rep} (d569-blind-experiment.ts:705) and row matching (:762) omit the manifest identity, and the unchanged hard fixtures keep their hashes, so 240/330/240 cells are indistinguishable across v5/v6. PLAN-F2 (P2): the namespace audit is unsound — stale worktree decisions file, patterns miss `6209xxx` and `6_209_001` forms, and D643/D645's reservations must be classified as such. PLAN-F3 (P2): the speculative-planning oracle must be a predeclared hand-calculated scene (≥9 eligible candidates, tie order, the excluded ninth, the exact mutation result). PLAN-F4 (P3): Batch 6 has eight files. Astra independently confirmed the rest: 20/20 fog-key single-key diffs via the real generator; the scout's 12+4 blocked rays per PC (wizard 16) and labels exactly Dodge/End Turn; Room-8 monsters 1/2/4 Dodge, monster 5's 55-ft Dash (10 steps × 5 + 5 difficult); the cap guard rejects a 57,580-byte block and accepts it with the guard disabled; 52 paths (18 existing + 34 new), all existing ones present. All four findings accepted. r2 (planner resumed 01a0b1bb…; brief plan-cohort-01-r2.md; r1 archived as .tmp-plans/2026-09-17-cohort-01-plan.r1.md) must also require canonicalD569SecondFamilyRegeneration in the active v6 test and rejection witnesses for non-fog-key differences and for legacy keys in new fixtures.
        baseline: dependency.baseline,
        flipped: dependency.flipped,
        proposalActorIds: new Set([dependency.proposalActorId]),
      });
    } else if (canonicalJson(prior.baseline) === canonicalJson(dependency.baseline) &&
      canonicalJson(prior.flipped) === canonicalJson(dependency.flipped)) {
      prior.proposalActorIds.add(dependency.proposalActorId);
    }
  }
  const scored = [...grouped.entries()].flatMap(([factKey, dependency]) => {
    const influences = canonicalPlayerIds
      .flatMap((playerId) => {
        const radius = maximumInfluenceRadiusFeet(state, playerId);
        const canFlip = canPlayerFlipScenarioFact(state, playerId, dependency.flipped, queries);
        return radius > 0 && canFlip
          ? [{ playerId, radius }]
          : [];
      });
    const referencedProposalCount = dependency.proposalActorIds.size;
    const summedMovementRadiusFeet = influences.reduce((sum, entry) => sum + entry.radius, 0);
    const volatilityScore = referencedProposalCount * summedMovementRadiusFeet;
    return volatilityScore === 0 ? [] : [{
      factKey,
      baseline: dependency.baseline,
      flipped: dependency.flipped,
      referencedProposalCount,
      influencingPlayerIds: influences.map((entry) => entry.playerId),
      summedMovementRadiusFeet,
      volatilityScore,
    }];
  });
  scored.sort((left, right) =>
    right.volatilityScore - left.volatilityScore ||
    right.referencedProposalCount - left.referencedProposalCount ||
    compareCanonicalBytes(left.factKey, right.factKey));
  const retained: typeof scored = [];
  for (const candidate of scored) {
    if (retained.some((higher) => shadowedBy(higher.baseline, candidate.baseline))) continue;
    retained.push(candidate);
  }
  return retained.slice(0, 8).map((candidate, index) => ({
    ...candidate,
    candidateId: `candidate:${sha256(canonicalJson({
      factKey: candidate.factKey,
      baseline: candidate.baseline,
      flipped: candidate.flipped,
    })).slice(0, 32)}`,
    rank: (index + 1) as HostSplitCandidate['rank'],
  }));
}

export function buildHostScenarioMenu(
  state: EncounterState,
  actors: readonly CombatantId[],
  unactedPlayerIds: readonly CombatantId[],
  environment: EngineOptionEnvironment,
): {
  readonly baselineProposals: readonly EngineTurnProposal[];
  readonly scenarioMenu: readonly HostSplitCandidate[];
  readonly scenarios: readonly HostScenario[];
} {
  const queries = environment.queries;
  const planningState = projectFutureMonsterTurns(state, actors);
  const baselineProposals = hostBaselineProposalPlanner.plan(planningState, actors, environment);
  const baselineOptions = baselineProposals.flatMap((proposal) =>
    availableEngineActorOptions(planningState, proposal.actorId, environment).filter((option) =>
      option.optionId === proposal.primaryOptionId));
  const scenarioMenu = computeHostSplitCandidates(
    state,
    extractProposalFactDependencies(state, baselineOptions, queries),
    unactedPlayerIds,
    queries,
  );
  return { baselineProposals, scenarioMenu, scenarios: compileHostScenarios(scenarioMenu) };
}

export function compileHostScenarios(
  menu: readonly HostSplitCandidate[],
): readonly HostScenario[] {
  if (menu.length === 0) return [];
  if (menu.length > 8) throw new RangeError('A host scenario menu contains at most eight candidates.');
  const ordered = [...menu].sort((left, right) => left.rank - right.rank);
  if (ordered.some((candidate, index) => candidate.rank !== index + 1)) {
    throw new RangeError('Host split-candidate ranks must be contiguous and canonical.');
  }
  const selected = ordered.slice(0, 3);
  if (new Set(selected.map((candidate) => candidate.factKey)).size !== selected.length ||
    selected.some((candidate) => !scenarioFactsAreComplements(candidate.baseline, candidate.flipped))) {
    throw new RangeError('Host scenarios require unique fact keys and exact complements.');
  }
  const scenarioSetKey = selected.map((candidate) => candidate.candidateId);
  return selected.map((_candidate, index) => {
    const ordinal = (index + 2) as HostScenario['ordinal'];
    return {
      scenarioId: `scenario:${sha256(canonicalJson({ scenarioSetKey, ordinal })).slice(0, 32)}`,
      ordinal,
      kind: 'single_candidate_flip' as const,
      flippedCandidateId: selected[index]?.candidateId ?? null,
      facts: selected.map((candidate, factIndex) =>
        factIndex === index ? candidate.flipped : candidate.baseline),
    };
  }).reduce<HostScenario[]>((scenarios, scenario) => {
    if (scenarios.length === 0) {
      scenarios.push({
        scenarioId: `scenario:${sha256(canonicalJson({ scenarioSetKey, ordinal: 1 })).slice(0, 32)}`,
        ordinal: 1,
        kind: 'no_material_change',
        flippedCandidateId: null,
        facts: selected.map((candidate) => candidate.baseline),
      });
    }
    scenarios.push(scenario);
    return scenarios;
  }, []);
}

export type HostScenarioSelection =
  | {
      readonly kind: 'matched';
      readonly scenario: HostScenario;
      readonly evaluations: readonly GuardAtomEvaluation[];
    }
  | {
      readonly kind: 'no_match';
      readonly reason: 'NO_SCENARIO_MATCH' | 'OVERLAPPING_SCENARIOS';
      readonly evaluations: readonly {
        readonly scenarioId: string;
        readonly facts: readonly GuardAtomEvaluation[];
      }[];
    };

/** Total selection: returns one branch or an explicit no-match value; it never first-matches. */
export function evaluateHostScenarios(
  state: EncounterState,
  scenarios: readonly HostScenario[],
  queries: EngineQueryPort,
): HostScenarioSelection {
  const evaluations = scenarios.map((scenario) => ({
    scenario,
    facts: scenario.facts.map((fact) => evaluateScenarioFact(state, fact, queries)),
  }));
  const matching = evaluations.filter((entry) => entry.facts.every((fact) => fact.matches));
  if (matching.length === 1) {
    const selected = matching[0];
    if (selected === undefined) throw new Error('One matching scenario was not retained.');
    return { kind: 'matched', scenario: selected.scenario, evaluations: selected.facts };
  }
  return {
    kind: 'no_match',
    reason: matching.length === 0 ? 'NO_SCENARIO_MATCH' : 'OVERLAPPING_SCENARIOS',
    evaluations: evaluations.map((entry) => ({
      scenarioId: entry.scenario.scenarioId,
      facts: entry.facts,
    })),
  };
}

export function guardResourceKey(resource: GuardResource): string {
  return canonicalJson(resource);
}
  const family = options.family ?? 'primary';
  const cohorts = family === 'primary' ? manifest.primaryCohorts : secondFamilyCohorts(manifest, access);
  const arms = options.includeHintArms === true
    ? [...manifest.coreArms, ...manifest.hintArms]
    : manifest.coreArms;
  return arms.flatMap((arm) => cohorts.flatMap((cohort) => cohort.fixtures.flatMap((fixture) =>
    ([1, 2, 3] as const).map((rep): D569DryRunCell => {
      const visualPin = manifest.visualPins[arm.dmMode];
      return {
        arm: arm.id,
        model: arm.model,
        effort: arm.effort,
        dmMode: arm.dmMode,
        repair: arm.repair,
        adviceAssisted: arm.adviceAssisted,
        family,
        basis: cohort.difficulty,
        seed: fixture.seed,
        rep,
        fixturePath: fixture.path,
        stateHash: fixture.sha256,
        sharedKbHash: manifest.sharedKb.combinedStartupHash,
        visualSourceHash: sha256(canonicalJson({ stateHash: fixture.sha256, role: visualPin.imageRole })),
        visualProfileHash: sha256(canonicalJson(visualPin)),
        sessionPolicy: 'fresh',
        sessionKey: sha256(canonicalJson({ family, arm: arm.id, seed: fixture.seed, rep })),
        timeoutMs: manifest.experimentWallMs,
        escalation: false,
        modelDefaultFallback: false,
        baseContextCapBytes: arm.dmMode === 'blind'
          ? manifest.caps.blindBaseBytes
          : manifest.caps.adviceBaseBytes,
        semanticContextCapBytes: SEMANTIC_BOARD_MAX_BYTES,
        requiredBlocks: ['semantic_board', 'creature_facts', 'initiative', 'legal_movement'],
        truncatedBlocks: [],
      };
    }))));
}

export interface D569ObservedRow {
  readonly arm: string;
  readonly cli: string;
  readonly cliVersion: string;
  readonly model: D569ExperimentArm['model'];
  readonly effort: 'high';
  readonly family: D569ExperimentFamily;
  readonly basis: D569ExperimentBasis;
  readonly seed: number;
  readonly rep: number;
  readonly sessionId: string | null;
  readonly outcome?: 'authorized' | 'refused' | 'service_null' | 'execution_failed' |
    'partial_execution' | 'infrastructure_failed' | 'integrity_indeterminate';
  readonly scheduledCellKey?: string;
  readonly dispatchId?: string;
  readonly engineCatalogEvidence?: EngineCatalogIntegrityView;
  readonly turnContextDelivery?: TurnContextDeliveryIntegrityView;
  readonly failingDispatch?: {
    readonly dispatchId: string;
    readonly exit: 'cancelled' | 'infrastructure_failed';
    readonly engineCatalogEvidence: { readonly status: 'ready' | 'absent' | 'inconclusive' };
    readonly turnContextDelivery: { readonly status: 'delivered' | 'not_requested' |
      'timeout_before_delivery' | 'infrastructure_absent' | 'indeterminate' };
  };
  readonly timeoutMs: number;
  readonly escalationModel: string | null;
  readonly modelDefaultFallback: boolean;
  readonly stateHash: string;
  readonly sharedKbHash: string;
  readonly visualSourceHash: string;
  readonly visualProfileHash: string;
  readonly visualArtifactHash: string;
  readonly baseContextCapBytes: number;
  readonly semanticContextCapBytes: number;
  readonly truncatedBlocks: readonly string[];
}

/** Validates exact completeness and launch invariants after supervisor-owned runs. */
export function validateD569ObservedRows(
  cells: readonly D569DryRunCell[],
  rows: readonly D569ObservedRow[],
): readonly D569ExperimentViolation[] {
  const violations: D569ExperimentViolation[] = [];
  const key = (row: Pick<D569ObservedRow, 'family' | 'arm' | 'basis' | 'seed' | 'rep'>): string =>
    `${row.family}:${row.arm}:${row.basis}:${String(row.seed)}:${String(row.rep)}`;
  const expected = new Map(cells.map((cell) => [key(cell), cell]));
  const seen = new Set<string>();
  const sessionIds = new Set<string>();
  const dispatchIds = new Set<string>();
  const pairedVisualHashes = new Map<string, string>();
  for (const row of rows) {
    const rowKey = key(row);
    const cell = expected.get(rowKey);
    addViolation(violations, cell !== undefined, 'unexpected_row', `unexpected row ${rowKey}`);
    addViolation(violations, !seen.has(rowKey), 'duplicate_rep', `duplicate row ${rowKey}`);
    seen.add(rowKey);
    if (cell === undefined) continue;
    addViolation(violations, row.model === cell.model,
      'model_identity', `row ${rowKey} changed the registered model identity`);
    addViolation(violations, row.effort === cell.effort,
      'effort_identity', `row ${rowKey} changed the registered effort identity`);
    addViolation(violations, row.cli.trim().length > 0,
      'cli_identity', `row ${rowKey} omitted the executing CLI identity`);
    addViolation(violations, row.cliVersion.trim().length > 0,
      'cli_version', `row ${rowKey} omitted the executing CLI version`);
    const diagnosedInfrastructure = row.outcome === 'infrastructure_failed';
    const integrityIndeterminate = row.outcome === 'integrity_indeterminate' ||
  advisoryAnalysisPolicy: 'exposure_status_only_source_artifact_never_loaded',
  scoringSeatAdvisoryPolicy: 'consider_or_ignore_untrusted_no_weight_no_anchor',
} as const;

function readText(path: string): string {
  const bytes = fixtureBytes.get(path);
  if (bytes === undefined) throw new Error(`undeclared fixture ${path}`);
  return bytes;
}

function manifest(): D569ExperimentManifest {
  return JSON.parse(readText(D569_EXPERIMENT_MANIFEST_PATH)) as D569ExperimentManifest;
}

function access(readOverride?: (path: string) => string | undefined): D569ExperimentValidationAccess {
  return {
    readText: (path) => readOverride?.(path) ?? readText(path),
    secondFamilyAccess: {
      readFixture: (path) => readOverride?.(path) ?? readText(path),
      regenerate: (seed, difficulty) => readText(
        `tests/fixtures/arena-basis-${difficulty}-2/seed-${String(seed)}.json`,
      ),
    },
  };
}

function codes(candidate: unknown, validationAccess = access()): readonly string[] {
  return validateD569ExperimentManifest(candidate, validationAccess).map((violation) => violation.code);
}

function observedRows(cells: ReturnType<typeof dryRunD569Experiment>): readonly D569ObservedRow[] {
  return cells.map((cell, index) => ({
    arm: cell.arm,
    cli: '/usr/local/bin/codex',
    cliVersion: 'codex-cli 0.148.0',
    model: cell.model,

codex
I’ve confirmed the authoritative D646 findings and the two code boundaries behind them. I’m now tightening the namespace evidence and the speculative oracle so the revision names fixed, testable expectations rather than leaving choices to implementation time.
exec
/bin/bash -lc 'set +e
for ns in 6209 6210 6211; do
  echo "MAIN $ns"
  case "$ns" in
    6209) pat='"'6209xxx|620900[1-9]|6209010|6_209_00[1-9]|6_209_010' ;;
    6210) pat='6210xxx|621000[1-9]|6210010|6_210_00[1-9]|6_210_010' ;;
    6211) pat='6211xxx|621100[1-9]|6211010|6_211_00[1-9]|6_211_010' ;;
  esac
  rg -n -e \""'$pat" /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
  echo "TRACKED $ns"
  rg -n -e "$pat" tests/fixtures tools
  echo "status=$?"
done
printf '"'\\nSPEC TYPES\\n'
rg -n \"export function computeHostSplitCandidates|function scenarioFactKey|type Scenario|interface Scenario|maximumInfluenceRadiusFeet|canPlayerFlipScenarioFact\" src/vtt/speculative-planning.ts
sed -n '430,675p' src/vtt/speculative-planning.ts
printf '\\nSPEC TESTS\\n'
rg -n \"forms a bounded volatility|computeHostSplitCandidates|buildHostScenarioMenu|maximumInfluence|factKey|scenarioMenu\" tests/unit/vtt/speculative-planning.test.ts
sed -n '1,180p' tests/unit/vtt/speculative-planning.test.ts
sed -n '620,780p' tests/unit/vtt/speculative-planning.test.ts
printf '\\nBLIND INTERFACES\\n'
rg -n \"D569DryRunCell|D569ExperimentManifest|D569_EXPERIMENT_MANIFEST_PATH|canonicalD569SecondFamilyRegeneration|validateD569ObservedRows\" tools/d569-blind-experiment.ts tests/unit/tools/d569-blind-experiment.test.ts tests/unit/tools/d569-v5.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
MAIN 6209
23048:OPTION A as costed by sol (40 fixtures: brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx, PLUS hard-3 5120xxx because hard-2's bytes fail the fog-key regeneration; new d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v5/v1 kept frozen; 42 new SHA-256 pins; ~62–66 paths; ~865 KB fixtures; versioned arena/rerun routes brutal-v2 / brutal-10-v2 rather than retargeting historical names; negative witnesses required; d569-v5.test.ts stays historical, a v6 test becomes active). Hard-family pins: composite-turn-proposals and Room-8 opportunity-intel are hand-derivable re-pins on the same scenes (Dodge/End Turn only; monsters 1/2/4 zero-foot Dodge, monster 5 keeps its 55-ft Dash); speculative-planning must NOT be normalized to an empty menu — it needs a small hand-authored scene with an independently computed volatility score and a seam mutation.
23061:Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.
23071:PLAN-F1 (P2): v6 has no experiment-identity boundary — session keys {family, arm, seed, rep} (d569-blind-experiment.ts:705) and row matching (:762) omit the manifest identity, and the unchanged hard fixtures keep their hashes, so 240/330/240 cells are indistinguishable across v5/v6. PLAN-F2 (P2): the namespace audit is unsound — stale worktree decisions file, patterns miss `6209xxx` and `6_209_001` forms, and D643/D645's reservations must be classified as such. PLAN-F3 (P2): the speculative-planning oracle must be a predeclared hand-calculated scene (≥9 eligible candidates, tie order, the excluded ninth, the exact mutation result). PLAN-F4 (P3): Batch 6 has eight files. Astra independently confirmed the rest: 20/20 fog-key single-key diffs via the real generator; the scout's 12+4 blocked rays per PC (wizard 16) and labels exactly Dodge/End Turn; Room-8 monsters 1/2/4 Dodge, monster 5's 55-ft Dash (10 steps × 5 + 5 difficult); the cap guard rejects a 57,580-byte block and accepts it with the guard disabled; 52 paths (18 existing + 34 new), all existing ones present. All four findings accepted. r2 (planner resumed 01a0b1bb…; brief plan-cohort-01-r2.md; r1 archived as .tmp-plans/2026-09-17-cohort-01-plan.r1.md) must also require canonicalD569SecondFamilyRegeneration in the active v6 test and rejection witnesses for non-fog-key differences and for legacy keys in new fixtures.
TRACKED 6209
status=1
MAIN 6210
23048:OPTION A as costed by sol (40 fixtures: brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx, PLUS hard-3 5120xxx because hard-2's bytes fail the fog-key regeneration; new d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v5/v1 kept frozen; 42 new SHA-256 pins; ~62–66 paths; ~865 KB fixtures; versioned arena/rerun routes brutal-v2 / brutal-10-v2 rather than retargeting historical names; negative witnesses required; d569-v5.test.ts stays historical, a v6 test becomes active). Hard-family pins: composite-turn-proposals and Room-8 opportunity-intel are hand-derivable re-pins on the same scenes (Dodge/End Turn only; monsters 1/2/4 zero-foot Dodge, monster 5 keeps its 55-ft Dash); speculative-planning must NOT be normalized to an empty menu — it needs a small hand-authored scene with an independently computed volatility score and a seam mutation.
23061:Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.
TRACKED 6210
status=1
MAIN 6211
23048:OPTION A as costed by sol (40 fixtures: brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx, PLUS hard-3 5120xxx because hard-2's bytes fail the fog-key regeneration; new d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v5/v1 kept frozen; 42 new SHA-256 pins; ~62–66 paths; ~865 KB fixtures; versioned arena/rerun routes brutal-v2 / brutal-10-v2 rather than retargeting historical names; negative witnesses required; d569-v5.test.ts stays historical, a v6 test becomes active). Hard-family pins: composite-turn-proposals and Room-8 opportunity-intel are hand-derivable re-pins on the same scenes (Dodge/End Turn only; monsters 1/2/4 zero-foot Dodge, monster 5 keeps its 55-ft Dash); speculative-planning must NOT be normalized to an empty menu — it needs a small hand-authored scene with an independently computed volatility score and a seam mutation.
23061:Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.
TRACKED 6211
status=1

SPEC TYPES
46:export type ScenarioFactValue = LifeState | boolean | number | 'inside' | 'outside' | null;
224:export function scenarioFactKey(atom: ScenarioFactAtom): string {
492:export function maximumInfluenceRadiusFeet(
560:export function canPlayerFlipScenarioFact(
567:  const radius = maximumInfluenceRadiusFeet(state, playerId);
601:export function computeHostSplitCandidates(
632:        const radius = maximumInfluenceRadiusFeet(state, playerId);
633:        const canFlip = canPlayerFlipScenarioFact(state, playerId, dependency.flipped, queries);
      addDependency(entries, option.actorId, {
        kind: 'condition_is', subject: targetRef, condition, present: true,
      });
    }
    addDependency(entries, option.actorId, {
      kind: 'concentration_is', subject: targetRef,
      active: engineConcentrationActive(state, targetId),
    });
    }
  }
  return entries;
}

function selectorRefs(atom: ScenarioFactAtom): readonly EngineSelectorRef[] {
  switch (atom.kind) {
    case 'life_state_is':
    case 'hp_percent':
    case 'zone_occupancy_is':
    case 'condition_is':
    case 'resource_available_is':
    case 'concentration_is': return [atom.subject];
    case 'adjacency_is': return [atom.left, atom.right];
    case 'within_action_reach_is': return [atom.actor, atom.target];
    case 'visibility_is': return [atom.observer, atom.subject];
  }
}

function candidateAdvertised(
  state: EncounterState,
  baseline: ScenarioFactAtom,
  queries: EngineQueryPort,
): boolean {
  const resolved = selectorRefs(baseline).map((reference) => resolveSelector(state, reference, queries));
  if (resolved.some((id) => id === null)) return false;
  if (baseline.kind === 'hp_percent') {
    const id = resolved[0];
    return id !== undefined && id !== null && queries.combatant(state, id)?.life === 'living';
  }
  if (baseline.kind === 'within_action_reach_is') {
    const id = resolved[0];
    return id !== undefined && id !== null && queries.actions(state, id).some((action) => action.id === baseline.actionId);
  }
  if (baseline.kind === 'zone_occupancy_is') {
    return enginePlanningSemanticZones(state).some((zone) => zone.id === baseline.zoneId && zone.active);
  }
  if (baseline.kind === 'resource_available_is') {
    const id = resolved[0];
    const subject = id === undefined || id === null ? null : queries.combatant(state, id);
    if (subject === null) return false;
    switch (baseline.resource.kind) {
      case 'reaction': return true;
      case 'legendary_action':
      case 'legendary_resistance': return subject.legendary !== undefined;
      case 'spell_slot': {
        const level = baseline.resource.level;
        return subject.spellSlots.some((slot) => slot.level === level);
      }
    }
  }
  return true;
}

export function maximumInfluenceRadiusFeet(
  state: EncounterState,
  playerId: CombatantId,
): number {
  const player = state.combatants.find((candidate) => candidate.profile.id === playerId);
  if (player?.profile.kind !== 'player_character' || player.life !== 'living') return 0;
  if (isIncapacitated(combatantConditions(state, playerId))) return 0;
  const awaitingOwnTurn = state.activeCombatant !== playerId;
  const speed = enginePlanningSpeedFeet(state, playerId);
  const remaining = awaitingOwnTurn ? speed : player.turn.movement.remaining;
  const dash = awaitingOwnTurn || player.turn.action.kind !== 'spent' ? speed : 0;
  return Math.max(0, remaining + dash);
}

function factCanChangeThroughMovement(atom: ScenarioFactAtom): boolean {
  return atom.kind === 'adjacency_is' || atom.kind === 'within_action_reach_is' ||
    atom.kind === 'visibility_is' || atom.kind === 'zone_occupancy_is';
}

function movedState(
  state: EncounterState,
  playerId: CombatantId,
  destination: { readonly column: number; readonly row: number },
): EncounterState {
  const moved: EncounterState = {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === playerId
      ? { ...token, position: { ...destination } }
      : token),
  };
  return {
    ...moved,
    persistentAreas: moved.persistentAreas.map((area) => {
      const origin = area.origin;
      const anchorCells = origin.kind === 'anchored'
        ? moved.tokens.some((token) => token.combatantId === origin.combatant)
          ? combatantSpace(moved, origin.combatant).cells
          : null
        : origin.kind === 'anchored_to_object'
          ? moved.worldObjects.find((object) => object.id === origin.object)?.footprint ?? null
          : null;
      const eligible = (subjectId: CombatantId): boolean => {
        switch (area.targetFilter.kind) {
          case 'all': return true;
          case 'selected': return area.targetFilter.combatants.includes(subjectId);
          case 'allies': return combatantsAreAllies(moved, subjectId, area.owner);
          case 'enemies': return !combatantsAreAllies(moved, subjectId, area.owner);
        }
      };
      const members = moved.combatants
        .filter((subject) => subject.life !== 'dead' && eligible(subject.profile.id))
        .flatMap((subject) => {
          const token = moved.tokens.find((candidate) => candidate.combatantId === subject.profile.id);
          return token !== undefined && persistentAreaTouchesSpace(
            area,
            combatantSpace(moved, subject.profile.id).cells,
            anchorCells,
            moved,
          )
            ? [subject.profile.id]
            : [];
        })
        .sort(compareCanonicalBytes);
      return { ...area, members };
    }),
  };
}

export function canPlayerFlipScenarioFact(
  state: EncounterState,
  playerId: CombatantId,
  flipped: ScenarioFactAtom,
  queries: EngineQueryPort,
): boolean {
  if (!factCanChangeThroughMovement(flipped)) return false;
  const radius = maximumInfluenceRadiusFeet(state, playerId);
  if (radius <= 0) return false;
  const ordinary = state.combatants.find((candidate) => candidate.profile.id === playerId)
    ?.turn.movement.remaining ?? 0;
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const candidate = movedState(state, playerId, { column, row });
      if (!evaluateScenarioFact(candidate, flipped, queries).matches) continue;
      const path = queries.path(state, {
        actorId: playerId,
        destination: { column, row },
        movement: radius > ordinary ? 'dash' : 'normal',
        maximumFeet: radius,
      });
      if (path.legal) return true;
    }
  }
  return false;
}

function subjectIdentity(atom: ScenarioFactAtom): string | null {
  switch (atom.kind) {
    case 'life_state_is':
    case 'hp_percent': return selectorKey(atom.subject);
    default: return null;
  }
}

function shadowedBy(higher: ScenarioFactAtom, lower: ScenarioFactAtom): boolean {
  const higherSubject = subjectIdentity(higher);
  return higherSubject !== null && higherSubject === subjectIdentity(lower) &&
    higher.kind !== lower.kind;
}

export function computeHostSplitCandidates(
  state: EncounterState,
  dependencies: readonly ProposalFactDependency[],
  unactedPlayerIds: readonly CombatantId[],
  queries: EngineQueryPort,
): readonly HostSplitCandidate[] {
  const grouped = new Map<string, {
    readonly baseline: ScenarioFactAtom;
    readonly flipped: ScenarioFactAtom;
    readonly proposalActorIds: Set<CombatantId>;
  }>();
  const canonicalPlayerIds = [...new Set(unactedPlayerIds)].sort(compareCanonicalBytes);
  for (const dependency of dependencies) {
    const key = scenarioFactKey(dependency.baseline);
    if (!scenarioFactsAreComplements(dependency.baseline, dependency.flipped) ||
      !candidateAdvertised(state, dependency.baseline, queries)) continue;
    const prior = grouped.get(key);
    if (prior === undefined) {
      grouped.set(key, {
        baseline: dependency.baseline,
        flipped: dependency.flipped,
        proposalActorIds: new Set([dependency.proposalActorId]),
      });
    } else if (canonicalJson(prior.baseline) === canonicalJson(dependency.baseline) &&
      canonicalJson(prior.flipped) === canonicalJson(dependency.flipped)) {
      prior.proposalActorIds.add(dependency.proposalActorId);
    }
  }
  const scored = [...grouped.entries()].flatMap(([factKey, dependency]) => {
    const influences = canonicalPlayerIds
      .flatMap((playerId) => {
        const radius = maximumInfluenceRadiusFeet(state, playerId);
        const canFlip = canPlayerFlipScenarioFact(state, playerId, dependency.flipped, queries);
        return radius > 0 && canFlip
          ? [{ playerId, radius }]
          : [];
      });
    const referencedProposalCount = dependency.proposalActorIds.size;
    const summedMovementRadiusFeet = influences.reduce((sum, entry) => sum + entry.radius, 0);
    const volatilityScore = referencedProposalCount * summedMovementRadiusFeet;
    return volatilityScore === 0 ? [] : [{
      factKey,
      baseline: dependency.baseline,
      flipped: dependency.flipped,
      referencedProposalCount,
      influencingPlayerIds: influences.map((entry) => entry.playerId),
      summedMovementRadiusFeet,
      volatilityScore,
    }];
  });
  scored.sort((left, right) =>
    right.volatilityScore - left.volatilityScore ||
    right.referencedProposalCount - left.referencedProposalCount ||
    compareCanonicalBytes(left.factKey, right.factKey));
  const retained: typeof scored = [];
  for (const candidate of scored) {
    if (retained.some((higher) => shadowedBy(higher.baseline, candidate.baseline))) continue;
    retained.push(candidate);
  }
  return retained.slice(0, 8).map((candidate, index) => ({
    ...candidate,
    candidateId: `candidate:${sha256(canonicalJson({
      factKey: candidate.factKey,
      baseline: candidate.baseline,
      flipped: candidate.flipped,
    })).slice(0, 32)}`,
    rank: (index + 1) as HostSplitCandidate['rank'],
  }));
}

export function buildHostScenarioMenu(
  state: EncounterState,
  actors: readonly CombatantId[],
  unactedPlayerIds: readonly CombatantId[],
  environment: EngineOptionEnvironment,

SPEC TESTS
36:  buildHostScenarioMenu,
41:  maximumInfluenceRadiusFeet,
136:    factKey: scenarioFactKey(baseline),
234:    expect(maximumInfluenceRadiusFeet(slowed, fixture.source.id)).toBe(40);
525:          scenarioMenu: menu,
543:  it('forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs', () => {
552:    const result = buildHostScenarioMenu(state, actors, players, OFFER_ENVIRONMENT);
554:    expect(result.scenarioMenu.length).toBeGreaterThan(0);
555:    expect(result.scenarioMenu.length).toBeLessThanOrEqual(8);
556:    expect(result.scenarioMenu.map((entry) => entry.rank)).toEqual(
557:      result.scenarioMenu.map((_entry, index) => index + 1),
559:    expect(result.scenarioMenu.every((entry) =>
562:    expect(result.scenarios.length).toBe(result.scenarioMenu.length === 0
564:      : Math.min(3, result.scenarioMenu.length) + 1);
588:        scenarioMenu: menu,
import { describe, expect, it } from 'vitest';
import type { EffectApplication } from '../../../src/combat/effects';
import type { PersistentArea } from '../../../src/combat/persistent-areas';
import { feetPoint } from '../../../src/combat/templates';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import {
  combatantId,
  engineZoneId,
  effectStackingIdentity,
  encounterBranchId,
  encounterSessionId,
  feet,
  persistentAreaId,
} from '../../../src/combat/values';
import {
  createEngineStateCapsuleForEnvironment,
  engineStateHandle,
  FixedReadonlyStateCapsuleSource,
  projectEngineEncounterState,
} from '../../../src/vtt/engine-state-capsule';
import { projectEngineInitiativeIntel } from '../../../src/vtt/engine-initiative-intel';
import {
  engineActionRegistryForEnvironment,
  engineConcentrationActive,
  enginePlanningHitPointMaximum,
  enginePlanningHitPoints,
  enginePlanningConditions,
  enginePlanningSpeedFeet,
  type EngineQueryPort,
} from '../../../src/vtt/engine-query-port';
import {
  buildHostScenarioMenu,
  compileHostScenarios,
  complementScenarioFact,
  evaluateHostScenarios as evaluateHostScenariosWithEnvironment,
  evaluateScenarioFact as evaluateScenarioFactWithQueries,
  maximumInfluenceRadiusFeet,
  scenarioFactKey,
} from '../../../src/vtt/speculative-planning';
import { submitSpeculativeRoundPlan } from '../../../src/vtt/speculative-plan-submission';
import type {
  EngineSelectorRef,
  HostSplitCandidate,
  ScenarioFactAtom,
} from '../../../src/vtt/speculative-plan-types';
import { engineSchemaInternals, schemaViolations } from '../../../src/vtt/mcp/schemas';
import { generateRoom } from '../../../src/vtt/room-generator';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState, projectFutureMonsterTurns } from '../../../src/vtt/monster-planning-state';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { declareTestInputs } from '../../helpers/test-inputs';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function evaluateScenarioFact(
  state: Parameters<typeof evaluateScenarioFactWithQueries>[0],
  fact: Parameters<typeof evaluateScenarioFactWithQueries>[1],
): ReturnType<typeof evaluateScenarioFactWithQueries> {
  return evaluateScenarioFactWithQueries(state, fact, OFFER_ENVIRONMENT.queries);
}

function evaluateHostScenarios(
  state: Parameters<typeof evaluateHostScenariosWithEnvironment>[0],
  scenarios: Parameters<typeof evaluateHostScenariosWithEnvironment>[1],
): ReturnType<typeof evaluateHostScenariosWithEnvironment> {
  return evaluateHostScenariosWithEnvironment(state, scenarios, OFFER_ENVIRONMENT.queries);
}

const HARD_BASIS_SEEDS = [
  5_117_001, 5_117_002, 5_117_003, 5_117_004, 5_117_005, 5_117_006,
  5_117_007, 5_117_008, 5_117_009, 5_117_010, 5_117_011, 5_117_012,
] as const;

const hardBasisInputs = declareTestInputs({
  fixtures: HARD_BASIS_SEEDS.map((seed): `tests/fixtures/arena-basis-hard/seed-${number}.json` =>
    `tests/fixtures/arena-basis-hard/seed-${seed}.json`),
});

function frozenHardState(seed: (typeof HARD_BASIS_SEEDS)[number]): EncounterState {
  const path: `tests/fixtures/arena-basis-hard/seed-${number}.json` =
    `tests/fixtures/arena-basis-hard/seed-${seed}.json`;
  return decodeArenaFixtureText(hardBasisInputs.fixtures.readText(path));
}

function direct(actorId: ReturnType<typeof combatantId>): EngineSelectorRef {
  return { actorId, selector: { kind: 'combatant', combatantId: actorId } };
}

function compactState(): {
  readonly state: EncounterState;
  readonly source: ReturnType<typeof playerProfile>;
  readonly target: ReturnType<typeof monsterProfile>;
} {
  const source = playerProfile('spec-source', {
    hitPoints: 20,
    initiativeBonus: 20,
    spellSlots: [{ level: 3, maximum: 2 }],
  });
  const target = monsterProfile('spec-target', { hitPoints: 40, initiativeBonus: 0 });
  const initial = createEncounter({
    bounds: { columns: 8, rows: 4 },
    combatants: [source, target],
    tokens: [placedToken(source, 1, 1), placedToken(target, 5, 1)],
  });
  return {
    state: reduceEncounter(initial, { type: 'roll_initiative' }, () => 0.5).state,
    source,
    target,
  };
}

function applyEffect(
  state: EncounterState,
  source: ReturnType<typeof playerProfile>,
  effect: EffectApplication,
): EncounterState {
  return reduceEncounter(
    state,
    { type: 'apply_effect', actor: source.id, effect, cost: 'none' },
    () => 0.5,
  ).state;
}

function candidate(
  rank: HostSplitCandidate['rank'],
  baseline: ScenarioFactAtom,
): HostSplitCandidate {
  return {
    candidateId: `candidate:${String(rank)}`,
    rank,
    factKey: scenarioFactKey(baseline),
    baseline,
    flipped: complementScenarioFact(baseline),
    referencedProposalCount: 1,
    influencingPlayerIds: [],
    summedMovementRadiusFeet: 30,
    volatilityScore: 30,
  };
}

describe('speculative host fact system', () => {
  it('uses the supplied distance policy for adjacency facts', () => {
    const fixture = compactState();
    const controlledQueries: EngineQueryPort = Object.freeze({
      ...OFFER_ENVIRONMENT.queries,
      spaceDistance: (...args: Parameters<EngineQueryPort['spaceDistance']>) => {
        const [state, left, right, leftAnchor] = args;
        return left === fixture.source.id && right === fixture.target.id
          ? 5
          : OFFER_ENVIRONMENT.queries.spaceDistance(state, left, right, leftAnchor);
      },
    });
    const adjacency: ScenarioFactAtom = {
      kind: 'adjacency_is',
      left: direct(fixture.source.id),
      right: direct(fixture.target.id),
      value: true,
    };

    expect(evaluateScenarioFactWithQueries(fixture.state, adjacency, controlledQueries)).toEqual({
      matches: true,
      actual: true,
    });
    expect(evaluateScenarioFactWithQueries(fixture.state, adjacency, OFFER_ENVIRONMENT.queries)).toEqual({
      matches: false,
      actual: false,
      failure: 'FACT_FALSE',
    });
  });

  it('uses one active HP lens and excludes temporary HP from exact integer bands', () => {
    const fixture = compactState();
    const targetId = fixture.target.id;
    const target = fixture.state.combatants.find((entry) => entry.profile.id === targetId);
    if (target === undefined) throw new Error('Target fixture is absent.');
      targetRoom: 2,
      targetMonsterRound: 3,
      refreshGeneration: 1,
      branches: scenarios.map((scenario) => ({ scenarioId: scenario.scenarioId, proposals: [turnProposal] })),
      reactionGuidance: { sideWide: { opportunity_attack: 'decline' }, actors: [] },
      idempotencyKey: 'spec-submit-idempotency-0001',
    });
    expect(envelope).toMatchObject({
      status: 'QUEUED-SPECULATIVE',
      sourceRevision: 7,
      reactionGuidance: { sideWide: { opportunity_attack: 'decline' } },
    });
    expect(accepted).toHaveLength(1);
    expect(JSON.stringify(envelope)).not.toContain('resolutionDigest');
  });

  it('rejects coordinates, free-text guards, agent-authored guards, and unknown fields at schema entry', () => {
    const base = {
      state_ref: {
        run_id: 'encounter:strict',
        state_handle: `engine-state:${'a'.repeat(64)}`,
        expected_revision: 1,
      },
      request_id: 'request:strict',
      target_room: 1,
      target_monster_round: 2,
      refresh_generation: 0,
      branches: [{
        scenario_id: 'scenario:1',
        proposals: [{
          actor_id: 'combatant:monster',
          expected_revision: 1,
          primary_option_id: 'option:monster:dodge',
          fallback_option_id: null,
          reason: 'Exercise the speculative branch proposal.',
          override_justification: null,
        }],
      }],
      idempotency_key: 'strict-speculation-0001',
    };
    expect(schemaViolations(engineSchemaInternals.submitSpeculativeRoundPlanInput, base)).toEqual([]);
    for (const mutation of [
      { ...base, coordinate: { row: 1, column: 1 } },
      { ...base, guard: { kind: 'always', rationale: 'trust me' } },
      { ...base, branches: [{ ...base.branches[0], guards: [{ kind: 'custom', text: 'if hurt' }] }] },
    ]) {
      expect(schemaViolations(engineSchemaInternals.submitSpeculativeRoundPlanInput, mutation).length)
        .toBeGreaterThan(0);
    }
  });
});

BLIND INTERFACES
tests/unit/tools/d569-v5.test.ts:45:  D569_EXPERIMENT_MANIFEST_PATH,
tests/unit/tools/d569-v5.test.ts:47:  validateD569ObservedRows,
tests/unit/tools/d569-v5.test.ts:48:  type D569DryRunCell,
tests/unit/tools/d569-v5.test.ts:49:  type D569ExperimentManifest,
tests/unit/tools/d569-v5.test.ts:52:import { canonicalD569SecondFamilyRegeneration } from '../../../tools/d569-second-family-manifest';
tests/unit/tools/d569-v5.test.ts:60:const MANIFEST = JSON.parse(readFileSync(D569_EXPERIMENT_MANIFEST_PATH, 'utf8')) as D569ExperimentManifest;
tests/unit/tools/d569-v5.test.ts:65:    regenerate: canonicalD569SecondFamilyRegeneration,
tests/unit/tools/d569-v5.test.ts:79:function current(cell: D569DryRunCell, outcome: 'authorized' | 'refused' | 'service_null' | 'infrastructure_failed') {
tests/unit/tools/d569-v5.test.ts:195:function retainedHistorical(cell: D569DryRunCell, lineNumber: number): Readonly<Record<string, unknown>> {
tests/unit/tools/d569-v5.test.ts:497:  const observedViolations = validateD569ObservedRows([cell], [observed]).map((violation) => violation.code);
tests/unit/tools/d569-v5.test.ts:555:        observedViolations: validateD569ObservedRows([cell], [invalidObserved])
tests/unit/tools/d569-v5.test.ts:565:    contradictoryObservedViolations: validateD569ObservedRows([cell], [{
tests/unit/tools/d569-v5.test.ts:806:    const changedManifest: D569ExperimentManifest = {
tests/unit/tools/d569-blind-experiment.test.ts:8:  D569_EXPERIMENT_MANIFEST_PATH,
tests/unit/tools/d569-blind-experiment.test.ts:23:  validateD569ExperimentManifest,
tests/unit/tools/d569-blind-experiment.test.ts:24:  validateD569ObservedRows,
tests/unit/tools/d569-blind-experiment.test.ts:28:  type D569ExperimentManifest,
tests/unit/tools/d569-blind-experiment.test.ts:98:  D569_EXPERIMENT_MANIFEST_PATH,
tests/unit/tools/d569-blind-experiment.test.ts:285:function manifest(): D569ExperimentManifest {
tests/unit/tools/d569-blind-experiment.test.ts:286:  return JSON.parse(readText(D569_EXPERIMENT_MANIFEST_PATH)) as D569ExperimentManifest;
tests/unit/tools/d569-blind-experiment.test.ts:302:  return validateD569ExperimentManifest(candidate, validationAccess).map((violation) => violation.code);
tests/unit/tools/d569-blind-experiment.test.ts:499:    expect(validateD569ObservedRows(cells, historical).map((violation) => violation.code))
tests/unit/tools/d569-blind-experiment.test.ts:655:    expect(validateD569ObservedRows(cells, rows)).toEqual([]);
tests/unit/tools/d569-blind-experiment.test.ts:657:    expect(validateD569ObservedRows(cells, missing).map((violation) => violation.code)).toContain('missing_row');
tests/unit/tools/d569-blind-experiment.test.ts:659:    expect(validateD569ObservedRows(cells, duplicate).map((violation) => violation.code)).toContain('duplicate_rep');
tests/unit/tools/d569-blind-experiment.test.ts:665:    expect(validateD569ObservedRows(cells, changedRows).map((violation) => violation.code))
tests/unit/tools/d569-blind-experiment.test.ts:677:      expect(validateD569ObservedRows(cells, [mutant, ...rows.slice(1)])
tests/unit/tools/d569-blind-experiment.test.ts:690:    expect(validateD569ObservedRows([cell], [row])).toEqual([]);
tests/unit/tools/d569-blind-experiment.test.ts:696:    expect(validateD569ObservedRows([cell], [indeterminateDeliveryOnly]).map((violation) => violation.code))
tests/unit/tools/d569-blind-experiment.test.ts:704:      expect(validateD569ObservedRows([cell], [invalidCatalogOnly]).map((violation) => violation.code))
tools/d569-blind-experiment.ts:24:export const D569_EXPERIMENT_MANIFEST_PATH =
tools/d569-blind-experiment.ts:413:export type D569ExperimentManifest = z.infer<typeof d569ExperimentManifestSchema>;
tools/d569-blind-experiment.ts:486:export function validateD569ExperimentManifest(
tools/d569-blind-experiment.ts:630:export interface D569DryRunCell {
tools/d569-blind-experiment.ts:658:  manifest: D569ExperimentManifest,
tools/d569-blind-experiment.ts:660:): D569ExperimentManifest['primaryCohorts'] {
tools/d569-blind-experiment.ts:674:): readonly D569DryRunCell[] {
tools/d569-blind-experiment.ts:675:  const violations = validateD569ExperimentManifest(input, access);
tools/d569-blind-experiment.ts:686:    ([1, 2, 3] as const).map((rep): D569DryRunCell => {
tools/d569-blind-experiment.ts:757:export function validateD569ObservedRows(
tools/d569-blind-experiment.ts:758:  cells: readonly D569DryRunCell[],
tools/d569-blind-experiment.ts:1189:    readonly manifest: D569ExperimentManifest;

exec
/bin/bash -lc "sed -n '205,245p' src/vtt/speculative-planning.ts
sed -n '35,95p' src/vtt/speculative-plan-types.ts
sed -n '525,575p' tests/unit/vtt/speculative-planning.test.ts
sed -n '620,720p' tools/d569-blind-experiment.ts
sed -n '745,850p' tools/d569-blind-experiment.ts
sed -n '1,90p' tools/d569-blind-experiment.ts
sed -n '45,75p' tests/unit/tools/d569-v5.test.ts
sed -n '310,355p' tests/unit/tools/d569-blind-experiment.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:

function selectorKey(reference: EngineSelectorRef): string {
  return canonicalJson(reference);
}

function compareCanonicalBytes(left: string, right: string): number {
  const leftBytes = new TextEncoder().encode(left);
  const rightBytes = new TextEncoder().encode(right);
  const sharedLength = Math.min(leftBytes.length, rightBytes.length);
  for (let index = 0; index < sharedLength; index += 1) {
    const leftByte = leftBytes[index];
    const rightByte = rightBytes[index];
    if (leftByte === undefined || rightByte === undefined) break;
    if (leftByte !== rightByte) return leftByte - rightByte;
  }
  return leftBytes.length - rightBytes.length;
}

/** Canonical identity excludes the atom's truth value but includes its full typed subject. */
export function scenarioFactKey(atom: ScenarioFactAtom): string {
  switch (atom.kind) {
    case 'life_state_is': return `life:${selectorKey(atom.subject)}`;
    case 'hp_percent': return `hp:${selectorKey(atom.subject)}:${String(atom.threshold)}`;
    case 'adjacency_is': return `adjacency:${selectorKey(atom.left)}:${selectorKey(atom.right)}`;
    case 'within_action_reach_is': return `reach:${selectorKey(atom.actor)}:${atom.actionId}:${selectorKey(atom.target)}`;
    case 'visibility_is': return `visibility:${selectorKey(atom.observer)}:${selectorKey(atom.subject)}`;
    case 'zone_occupancy_is': return `zone:${selectorKey(atom.subject)}:${atom.zoneId}`;
    case 'condition_is': return `condition:${selectorKey(atom.subject)}:${canonicalJson(atom.condition)}`;
    case 'resource_available_is': return `resource:${selectorKey(atom.subject)}:${canonicalJson(atom.resource)}`;
    case 'concentration_is': return `concentration:${selectorKey(atom.subject)}`;
  }
}

export function complementScenarioFact(
  atom: ScenarioFactAtom,
  lifeStateFlip?: LifeState,
): ScenarioFactAtom {
  switch (atom.kind) {
    case 'life_state_is': {
      if (lifeStateFlip === undefined || lifeStateFlip === atom.value) {
        throw new RangeError('A life-state complement requires one distinct host-proven reachable state.');
  | { readonly kind: 'legendary_action' }
  | { readonly kind: 'legendary_resistance' }
  | {
      readonly kind: 'spell_slot';
      readonly level: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
    };

export type ScenarioFactAtom =
  | {
      readonly kind: 'life_state_is';
      readonly subject: EngineSelectorRef;
      readonly value: 'living' | 'dying' | 'stable' | 'dead';
    }
  | {
      readonly kind: 'hp_percent';
      readonly subject: EngineSelectorRef;
      readonly comparison: HpComparison;
      readonly threshold: HpThresholdPercent;
    }
  | {
      readonly kind: 'adjacency_is';
      readonly left: EngineSelectorRef;
      readonly right: EngineSelectorRef;
      readonly value: boolean;
    }
  | {
      readonly kind: 'within_action_reach_is';
      readonly actor: EngineSelectorRef;
      readonly actionId: string;
      readonly target: EngineSelectorRef;
      readonly value: boolean;
    }
  | {
      readonly kind: 'visibility_is';
      readonly observer: EngineSelectorRef;
      readonly subject: EngineSelectorRef;
      readonly value: boolean;
    }
  | {
      readonly kind: 'zone_occupancy_is';
      readonly subject: EngineSelectorRef;
      readonly zoneId: EngineZoneId;
      readonly value: 'inside' | 'outside';
    }
  | {
      readonly kind: 'condition_is';
      readonly subject: EngineSelectorRef;
      readonly condition: GuardConditionIdentity;
      readonly present: boolean;
    }
  | {
      readonly kind: 'resource_available_is';
      readonly subject: EngineSelectorRef;
      readonly resource: GuardResource;
      readonly available: boolean;
    }
  | {
      readonly kind: 'concentration_is';
      readonly subject: EngineSelectorRef;
      readonly active: boolean;
    };
          scenarioMenu: menu,
          scenarios,
        },
        projection: projectEngineEncounterState(
          state,
          engineActionRegistryForEnvironment(state, OFFER_ENVIRONMENT),
          projectEngineInitiativeIntel(state, []),
          1,
        ),
        offerEnvironment: OFFER_ENVIRONMENT.binding,
      });
      if (capsule.request?.phase !== 'speculative') throw new Error('Speculative capsule was not retained.');
      expect(evaluateHostScenarios(state, capsule.request.scenarios)).toMatchObject({
        kind: 'matched', scenario: { ordinal: 1, kind: 'no_material_change' },
      });
    },
  );

  it('forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs', () => {
    const state = frozenHardState(5_117_001);
    const actors = state.combatants
      .filter((entry) => entry.profile.kind === 'monster' && entry.life === 'living')
      .map((entry) => entry.profile.id)
      .slice(0, 2);
    const players = state.combatants
      .filter((entry) => entry.profile.kind === 'player_character' && entry.life === 'living')
      .map((entry) => entry.profile.id);
    const result = buildHostScenarioMenu(state, actors, players, OFFER_ENVIRONMENT);
    expect(result.baselineProposals.map((entry) => entry.actorId)).toEqual(actors);
    expect(result.scenarioMenu.length).toBeGreaterThan(0);
    expect(result.scenarioMenu.length).toBeLessThanOrEqual(8);
    expect(result.scenarioMenu.map((entry) => entry.rank)).toEqual(
      result.scenarioMenu.map((_entry, index) => index + 1),
    );
    expect(result.scenarioMenu.every((entry) =>
      entry.volatilityScore === entry.referencedProposalCount * entry.summedMovementRadiusFeet &&
      entry.influencingPlayerIds.length > 0)).toBe(true);
    expect(result.scenarios.length).toBe(result.scenarioMenu.length === 0
      ? 0
      : Math.min(3, result.scenarioMenu.length) + 1);
  });

  it('queues strict scenario-id-only v2 prediction data with inert D401 guidance', () => {
    const fixture = compactState();
    const subject = direct(fixture.target.id);
    const menu = [candidate(1, {
      kind: 'resource_available_is', subject, resource: { kind: 'reaction' }, available: true,
    })];
    const scenarios = compileHostScenarios(menu);
    const planningState = projectFutureMonsterTurns(fixture.state, [fixture.target.id]);
    const capsule = createEngineStateCapsuleForEnvironment({
    'second_family_seed_range', 'fluke guard must use the frozen encounter cohort, not a shuffle seed');
  } catch (error) {
    violations.push({
      code: 'second_family_manifest_missing',
      message: error instanceof Error ? error.message : String(error),
    });
  }
  return violations;
}

export interface D569DryRunCell {
  readonly arm: string;
  readonly model: D569ExperimentArm['model'];
  readonly effort: 'high';
  readonly dmMode: 'blind' | 'advice';
  readonly repair: 'code_only' | 'minimal_legal_alternative' | null;
  readonly adviceAssisted: boolean;
  readonly family: D569ExperimentFamily;
  readonly basis: D569ExperimentBasis;
  readonly seed: number;
  readonly rep: 1 | 2 | 3;
  readonly fixturePath: string;
  readonly stateHash: string;
  readonly sharedKbHash: string;
  readonly visualSourceHash: string;
  readonly visualProfileHash: string;
  readonly sessionPolicy: 'fresh';
  readonly sessionKey: string;
  readonly timeoutMs: 240_000;
  readonly escalation: false;
  readonly modelDefaultFallback: false;
  readonly baseContextCapBytes: number;
  readonly semanticContextCapBytes: number;
  readonly requiredBlocks: readonly ['semantic_board', 'creature_facts', 'initiative', 'legal_movement'];
  readonly truncatedBlocks: readonly [];
}

function secondFamilyCohorts(
  manifest: D569ExperimentManifest,
  access: D569ExperimentValidationAccess,
): D569ExperimentManifest['primaryCohorts'] {
  const parsed = JSON.parse(access.readText(manifest.secondFamily.manifestPath)) as D569SecondFamilyManifest;
  return parsed.cohorts.map((cohort) => ({
    id: cohort.difficulty === 'hard' ? 'evaluation-hard' as const : 'evaluation-brutal' as const,
    difficulty: cohort.difficulty,
    fixtures: cohort.fixtures,
  }));
}

/** Emits future execution cells only. This function has no process, arena, adapter, or model seam. */
export function dryRunD569Experiment(
  input: unknown,
  access: D569ExperimentValidationAccess,
  options: { readonly includeHintArms?: boolean; readonly family?: D569ExperimentFamily } = {},
): readonly D569DryRunCell[] {
  const violations = validateD569ExperimentManifest(input, access);
  if (violations.length > 0) {
    throw new TypeError(`Invalid D569 experiment manifest: ${violations[0]?.code ?? 'unknown'}`);
  }
  const manifest = d569ExperimentManifestSchema.parse(input);
  const family = options.family ?? 'primary';
  const cohorts = family === 'primary' ? manifest.primaryCohorts : secondFamilyCohorts(manifest, access);
  const arms = options.includeHintArms === true
    ? [...manifest.coreArms, ...manifest.hintArms]
    : manifest.coreArms;
  return arms.flatMap((arm) => cohorts.flatMap((cohort) => cohort.fixtures.flatMap((fixture) =>
    ([1, 2, 3] as const).map((rep): D569DryRunCell => {
      const visualPin = manifest.visualPins[arm.dmMode];
      return {
        arm: arm.id,
        model: arm.model,
        effort: arm.effort,
        dmMode: arm.dmMode,
        repair: arm.repair,
        adviceAssisted: arm.adviceAssisted,
        family,
        basis: cohort.difficulty,
        seed: fixture.seed,
        rep,
        fixturePath: fixture.path,
        stateHash: fixture.sha256,
        sharedKbHash: manifest.sharedKb.combinedStartupHash,
        visualSourceHash: sha256(canonicalJson({ stateHash: fixture.sha256, role: visualPin.imageRole })),
        visualProfileHash: sha256(canonicalJson(visualPin)),
        sessionPolicy: 'fresh',
        sessionKey: sha256(canonicalJson({ family, arm: arm.id, seed: fixture.seed, rep })),
        timeoutMs: manifest.experimentWallMs,
        escalation: false,
        modelDefaultFallback: false,
        baseContextCapBytes: arm.dmMode === 'blind'
          ? manifest.caps.blindBaseBytes
          : manifest.caps.adviceBaseBytes,
        semanticContextCapBytes: SEMANTIC_BOARD_MAX_BYTES,
        requiredBlocks: ['semantic_board', 'creature_facts', 'initiative', 'legal_movement'],
        truncatedBlocks: [],
      };
    }))));
}

export interface D569ObservedRow {
  readonly arm: string;
  readonly modelDefaultFallback: boolean;
  readonly stateHash: string;
  readonly sharedKbHash: string;
  readonly visualSourceHash: string;
  readonly visualProfileHash: string;
  readonly visualArtifactHash: string;
  readonly baseContextCapBytes: number;
  readonly semanticContextCapBytes: number;
  readonly truncatedBlocks: readonly string[];
}

/** Validates exact completeness and launch invariants after supervisor-owned runs. */
export function validateD569ObservedRows(
  cells: readonly D569DryRunCell[],
  rows: readonly D569ObservedRow[],
): readonly D569ExperimentViolation[] {
  const violations: D569ExperimentViolation[] = [];
  const key = (row: Pick<D569ObservedRow, 'family' | 'arm' | 'basis' | 'seed' | 'rep'>): string =>
    `${row.family}:${row.arm}:${row.basis}:${String(row.seed)}:${String(row.rep)}`;
  const expected = new Map(cells.map((cell) => [key(cell), cell]));
  const seen = new Set<string>();
  const sessionIds = new Set<string>();
  const dispatchIds = new Set<string>();
  const pairedVisualHashes = new Map<string, string>();
  for (const row of rows) {
    const rowKey = key(row);
    const cell = expected.get(rowKey);
    addViolation(violations, cell !== undefined, 'unexpected_row', `unexpected row ${rowKey}`);
    addViolation(violations, !seen.has(rowKey), 'duplicate_rep', `duplicate row ${rowKey}`);
    seen.add(rowKey);
    if (cell === undefined) continue;
    addViolation(violations, row.model === cell.model,
      'model_identity', `row ${rowKey} changed the registered model identity`);
    addViolation(violations, row.effort === cell.effort,
      'effort_identity', `row ${rowKey} changed the registered effort identity`);
    addViolation(violations, row.cli.trim().length > 0,
      'cli_identity', `row ${rowKey} omitted the executing CLI identity`);
    addViolation(violations, row.cliVersion.trim().length > 0,
      'cli_version', `row ${rowKey} omitted the executing CLI version`);
    const diagnosedInfrastructure = row.outcome === 'infrastructure_failed';
    const integrityIndeterminate = row.outcome === 'integrity_indeterminate' ||
      d569PartialEvidenceHasIntegritySignal(row.engineCatalogEvidence, row.turnContextDelivery);
    addViolation(violations, !integrityIndeterminate,
      'integrity_indeterminate', `row ${rowKey} has indeterminate integrity evidence`);
    addViolation(violations, diagnosedInfrastructure
      ? typeof row.scheduledCellKey === 'string' && row.scheduledCellKey.length > 0 &&
        typeof row.dispatchId === 'string' && row.dispatchId.length >= 16 &&
        row.failingDispatch !== undefined && row.failingDispatch.dispatchId.length >= 16 &&
        (row.failingDispatch.exit === 'cancelled'
          ? row.failingDispatch.turnContextDelivery.status === 'delivered' ||
            row.failingDispatch.turnContextDelivery.status === 'not_requested'
          : row.failingDispatch.engineCatalogEvidence.status === 'absent' &&
            row.failingDispatch.turnContextDelivery.status === 'infrastructure_absent')
      : row.sessionId !== null && !sessionIds.has(row.sessionId),
    'fresh_session', diagnosedInfrastructure
      ? `row ${rowKey} lacks typed infrastructure identity/evidence`
      : `row ${rowKey} did not use a unique fresh session`);
    for (const dispatchId of [
      ...(row.dispatchId === undefined ? [] : [row.dispatchId]),
      ...(row.failingDispatch === undefined || row.failingDispatch.dispatchId === row.dispatchId
        ? [] : [row.failingDispatch.dispatchId]),
    ]) {
      addViolation(violations, !dispatchIds.has(dispatchId), 'dispatch_identity',
        `row ${rowKey} reused dispatch identity ${dispatchId}`);
      dispatchIds.add(dispatchId);
    }
    addViolation(violations, diagnosedInfrastructure || row.failingDispatch === undefined,
      'failure_attribution', `row ${rowKey} identifies a failing dispatch without an infrastructure outcome`);
    if (diagnosedInfrastructure && row.failingDispatch !== undefined && row.dispatchId !== undefined) {
      const primaryFailure = row.failingDispatch.dispatchId === row.dispatchId;
      addViolation(violations, !primaryFailure ||
        row.engineCatalogEvidence?.status === row.failingDispatch.engineCatalogEvidence.status &&
        row.turnContextDelivery?.status === row.failingDispatch.turnContextDelivery.status,
      'failure_attribution', `row ${rowKey} primary and failing-dispatch evidence diverge`);
    }
    addViolation(violations, row.engineCatalogEvidence?.status !== 'absent' || diagnosedInfrastructure,
      'failure_attribution', `row ${rowKey} reports engine absence without an infrastructure outcome`);
    if (row.sessionId !== null) sessionIds.add(row.sessionId);
    addViolation(violations, row.timeoutMs === cell.timeoutMs, 'timeout', `row ${rowKey} changed timeout`);
    addViolation(violations, row.escalationModel === null, 'escalation', `row ${rowKey} escalated`);
    addViolation(violations, !row.modelDefaultFallback, 'model_default_fallback',
      `row ${rowKey} used a default fallback`);
    addViolation(violations, row.stateHash === cell.stateHash &&
      row.sharedKbHash === cell.sharedKbHash && row.visualSourceHash === cell.visualSourceHash,
    'paired_input_hash', `row ${rowKey} changed paired state, KB, or visual source`);
    addViolation(violations, row.visualProfileHash === cell.visualProfileHash,
      'visual_profile_hash', `row ${rowKey} changed its mode-specific visual profile`);
    const visualPairKey = `${row.family}:${row.basis}:${String(row.seed)}:${String(row.rep)}:${cell.dmMode}`;
    const pairedVisualHash = pairedVisualHashes.get(visualPairKey);
    addViolation(violations, pairedVisualHash === undefined || pairedVisualHash === row.visualArtifactHash,
      'paired_visual_hash', `row ${rowKey} changed the paired ${cell.dmMode} visual bytes`);
    pairedVisualHashes.set(visualPairKey, row.visualArtifactHash);
    addViolation(violations, row.baseContextCapBytes === cell.baseContextCapBytes &&
      row.semanticContextCapBytes === cell.semanticContextCapBytes,
    'context_cap', `row ${rowKey} changed context caps`);
    addViolation(violations, row.truncatedBlocks.length === 0, 'required_block_truncated',
      `row ${rowKey} truncated a required block`);
  }
  for (const expectedKey of expected.keys()) {
    addViolation(violations, seen.has(expectedKey), 'missing_row', `missing row ${expectedKey}`);
  }
  return violations;
}

export type D569Effort = 'high' | 'medium' | 'low';
export interface D569TuningState {
import { canonicalJson } from '../src/commands/canonical-json';
import { sha256 } from '../src/crypto/sha256';
import { BLIND_TURN_CONTEXT_MAX_BYTES } from '../src/vtt/blind-turn-context';
import {
  D569_AI_DM_KB_COMPONENT_PATHS,
  D569_AI_DM_KB_ROOT,
} from '../src/vtt/knowledge-base-contract';
import { SEMANTIC_BOARD_MAX_BYTES, TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
import { DEFAULT_RENDERER_PROFILE } from '../src/vtt/renderer-profile';
import {
  d569PartialEvidenceHasIntegritySignal,
  type EngineCatalogIntegrityView,
  type TurnContextDeliveryIntegrityView,
} from '../src/vtt/turn-context-delivery';
import { BLIND_STATE_PRIMER_VERSION } from './ai-dm-board-snapshot';
import {
  D569_SECOND_FAMILY_SEEDS,
  validateD569SecondFamilyManifest,
  type D569SecondFamilyManifest,
  type D569SecondFamilyValidationAccess,
} from './d569-second-family-manifest';
import { z } from 'zod';

export const D569_EXPERIMENT_MANIFEST_PATH =
  'tests/fixtures/d569-blind-experiment-manifest.json' as const;
export const D569_SECOND_FAMILY_MANIFEST_PATH =
  'tests/fixtures/d569-second-family-manifest.json' as const;
export const D569_EXPERIMENT_WALL_MS = 240_000 as const;
export const D569_BOOTSTRAP_RESAMPLES = 100_000 as const;
export const D569_NONINFERIORITY_MARGIN = -0.20 as const;
export const D569_REFUSAL_RISK_MARGIN = 0.00 as const;
export const D569_REPS = 3 as const;

export const D569_PLAYER_MODELS = Object.freeze([
  'gpt-5.6-luna',
  'claude-opus-4-8',
  'gpt-5.6-sol',
  'gpt-6-astra',
] as const);

export const D569_PREREGISTRATION_AMENDMENTS = Object.freeze([
  {
    id: 'refusal-risk-upper-bound',
    timing: 'pre-results',
    reason: 'The prior lower-bound check allowed an increased refusal risk compatible with the data.',
  },
  {
    id: 'remove-fable-player-arms',
    timing: 'pre-results',
    reason: 'Fable usage exhausted; no replacement in this registration',
  },
  {
    id: 'fresh-context-judge-eligibility',
    timing: 'pre-results',
    reason: 'Owner ruling D578.3: "It is ok for the same model to judge if it starts from a fresh context".',
  },
  {
    id: 'add-astra-high-player-arms',
    timing: 'pre-astra-run-and-analysis',
    date: '2026-09-08',
    reason: 'Owner ruling D586.24 requires Astra at high effort for a fair comparison with Sol high; this amendment was recorded before any Astra player arm was run or scored.',
  },
  {
    id: 'replace-opus-and-notes-only-panel',
    timing: 'pre-opus-4-8-player-run-and-new-panel-scoring',
    date: '2026-09-08',
    reason: 'Owner rulings replace every active claude-opus-5 use with claude-opus-4-8 and set claude-fable-5-1, gpt-6-astra, and gpt-5.6-sol at high effort as the scoring panel; claude-opus-4-8 supplies labelled notes only and never participates in analysis or decisions.',
  },
] as const);

export const D569_SCORING_PANEL_IDENTITIES = Object.freeze([
  { id: 'claude-fable-5-1', model: 'claude-fable-5-1', effort: 'high', role: 'scoring' },
  { id: 'gpt-6-astra', model: 'gpt-6-astra', effort: 'high', role: 'scoring' },
  { id: 'gpt-5.6-sol', model: 'gpt-5.6-sol', effort: 'high', role: 'scoring' },
] as const);
export const D569_ADVISORY_NOTES_SOURCE = Object.freeze({
  id: 'claude-opus-4-8', model: 'claude-opus-4-8', effort: 'high', role: 'advisory_notes',
} as const);

export const D569_CORE_ARM_IDENTITIES = Object.freeze(D569_PLAYER_MODELS.flatMap((model) =>
  (['blind', 'advice'] as const).map((dmMode) => ({
    id: `${model}-${dmMode}`,
    model,
    effort: 'high' as const,
    dmMode,
    repair: dmMode === 'blind' ? 'code_only' as const : null,
    adviceAssisted: dmMode === 'advice',
  }))));

export const D569_HINT_ARM_IDENTITIES = Object.freeze([
  D569_EXPERIMENT_MANIFEST_PATH,
  dryRunD569Experiment,
  validateD569ObservedRows,
  type D569DryRunCell,
  type D569ExperimentManifest,
  type D569ObservedRow,
} from '../../../tools/d569-blind-experiment';
import { canonicalD569SecondFamilyRegeneration } from '../../../tools/d569-second-family-manifest';
import { BRUTAL_10_PROTOCOL, buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
import { parseArenaArgs, runArena } from '../../../tools/ai-dm-arena';
import type { ConversationBoardSnapshotService } from '../../../tools/ai-dm-conversation';
import type { BoardImageArtifact, BoardSnapshotCapture } from '../../../tools/ai-dm-board-snapshot';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';

const PATCHED_COMMIT = 'd60a0571a4588879c65992a17ab95023911d17c1';
const MANIFEST = JSON.parse(readFileSync(D569_EXPERIMENT_MANIFEST_PATH, 'utf8')) as D569ExperimentManifest;
const access = {
  readText: (path: string): string => readFileSync(path, 'utf8'),
  secondFamilyAccess: {
    readFixture: (path: string): string => readFileSync(path, 'utf8'),
    regenerate: canonicalD569SecondFamilyRegeneration,
  },
};
const CELLS = dryRunD569Experiment(MANIFEST, access).filter((cell) =>
  cell.arm === 'gpt-5.6-luna-blind');
const FIRST_BRUTAL_STATE = applyRoomInitiativeProfile(
  decodeArenaFixtureText(readFileSync('tests/fixtures/arena-basis-brutal/seed-6203001.json', 'utf8')),
  'derived_v1',
);

function historical(room: number, rep: number, sessionId: string | null) {
    model: cell.model,
    effort: cell.effort,
    family: cell.family,
    basis: cell.basis,
    seed: cell.seed,
    rep: cell.rep,
    sessionId: `fresh-session-${String(index)}`,
    timeoutMs: cell.timeoutMs,
    escalationModel: null,
    modelDefaultFallback: false,
    stateHash: cell.stateHash,
    sharedKbHash: cell.sharedKbHash,
    visualSourceHash: cell.visualSourceHash,
    visualProfileHash: cell.visualProfileHash,
    visualArtifactHash: sha256(`${cell.visualSourceHash}:${cell.visualProfileHash}`),
    baseContextCapBytes: cell.baseContextCapBytes,
    semanticContextCapBytes: cell.semanticContextCapBytes,
    truncatedBlocks: [],
  }));
}

const components = (value: number): D569PanelComponents => ({
  targetPriority: value,
  actionEconomy: value,
  coherence: value,
  positioning: value,
});

type SyntheticScore = number | 'refused' | 'execution_failed';

function analysisRows(
  family: 'primary' | 'second',
  basis: 'hard' | 'brutal',
  leftScores: readonly SyntheticScore[],
  rightScores: readonly SyntheticScore[],
): readonly D569AnalysisRow[] {
  if (leftScores.length !== rightScores.length) throw new Error('synthetic pair mismatch');
  return leftScores.flatMap((left, index) => {
    const right = rightScores[index];
    if (right === undefined) throw new Error('synthetic right row disappeared');
    const seed = (basis === 'hard' ? 1_000 : 2_000) + index;
    const row = (arm: string, value: SyntheticScore): D569AnalysisRow => ({
      arm,
      family,
      basis,
      seed,

exec
/bin/bash -lc 'set +e
for ns in 6209 6210 6211; do
  case "$ns" in
    6209) pat='"'6209(xxx|[0-9]{3})?|6_209_(xxx|[0-9]{3})' ;;
    6210) pat='6210(xxx|[0-9]{3})?|6_210_(xxx|[0-9]{3})' ;;
    6211) pat='6211(xxx|[0-9]{3})?|6_211_(xxx|[0-9]{3})' ;;
  esac
  echo \"MAIN "'$ns"
  rg -n -o -e "$pat" /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
  echo "main_status=$?"
  echo "TRACKED $ns"
  rg -n -o -e "$pat" tests/fixtures tools
  echo "tracked_status=$?"
done
wc -l /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md .claude/decisions.md .tmp-plans/2026-09-17-cohort-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
MAIN 6209
23048:6209xxx
23061:6209xxx
23068:6209
23071:6209xxx
23071:6_209_001
main_status=0
TRACKED 6209
tracked_status=1
MAIN 6210
15754:6210
15763:6210
15764:6210
15765:6210
23048:6210xxx
23061:6210xxx
23068:6210
main_status=0
TRACKED 6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json:1:6210
tests/fixtures/ai-dm-legacy/implicit-advice-v1.json:36:6210
tracked_status=0
MAIN 6211
23048:6211xxx
23061:6211xxx
23068:6211
main_status=0
TRACKED 6211
tracked_status=1
  23071 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
  22707 .claude/decisions.md
    400 .tmp-plans/2026-09-17-cohort-01-plan.md
  46178 total

exec
/bin/bash -lc "rg -n \"SCOUT|Longbow|baselineProposals|Dodge\" tests/unit/vtt/composite-turn-proposals.test.ts tests/unit/vtt/speculative-planning.test.ts src/data/monsters.ts src/vtt/monster-profiles.ts | head -120
rg -n \"export const SCOUT|name: 'Scout'|Longbow\" src tests/unit | head -80
sed -n '1,110p' tests/unit/vtt/composite-turn-proposals.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
rg: src/data/monsters.ts: No such file or directory (os error 2)
rg: src/vtt/monster-profiles.ts: No such file or directory (os error 2)
tests/unit/vtt/speculative-planning.test.ts:553:    expect(result.baselineProposals.map((entry) => entry.actorId)).toEqual(actors);
tests/unit/vtt/composite-turn-proposals.test.ts:9:import { SCOUT, SPY } from '../../../src/combat/statblocks/mercenary-company';
tests/unit/vtt/composite-turn-proposals.test.ts:43:  statblock: typeof SCOUT | typeof SPY | typeof PRIEST | typeof BROWN_BEAR | typeof DIRE_WOLF,
tests/unit/vtt/composite-turn-proposals.test.ts:128:    const scout = monsterProfile(SCOUT, 'hidden-id-scout');
tests/unit/vtt/composite-turn-proposals.test.ts:160:    expect(labels).toContain('Longbow + Longbow -> combatant:fighter');
tests/unit/vtt/composite-turn-proposals.test.ts:161:    expect(labels).toContain('Longbow + Longbow -> combatant:cleric');
tests/unit/vtt/composite-turn-proposals.test.ts:162:    expect(labels).toContain('Longbow + Longbow -> combatant:wizard');
tests/unit/vtt/composite-turn-proposals.test.ts:163:    expect(labels).toContain('Dodge');
tests/unit/vtt/composite-turn-proposals.test.ts:166:  it('offers and executes Scout Longbow twice in one main action', () => {
tests/unit/vtt/composite-turn-proposals.test.ts:167:    const scout = monsterProfile(SCOUT, 'scout');
tests/unit/vtt/composite-turn-proposals.test.ts:171:    if (option === undefined) throw new Error('Scout Longbow ×2 option is absent.');
tests/unit/vtt/composite-turn-proposals.test.ts:173:    expect(option.label).toBe('Longbow + Longbow -> combatant:target');
tests/unit/vtt/composite-turn-proposals.test.ts:358:    const scout = monsterProfile(SCOUT, 'object-scout');
tests/unit/vtt/composite-turn-proposals.test.ts:402:    const scout = monsterProfile(SCOUT, 'r02-scout');
tests/unit/vtt/composite-turn-proposals.test.ts:411:    expect(labels).toContain('Longbow + Longbow -> combatant:target');
tests/unit/vtt/composite-turn-proposals.test.ts:421:    expect(JSON.stringify(context)).toContain('Longbow + Longbow -> combatant:target');
tests/unit/rules/srd-class-starting-equipment-extract.test.ts:26:    'Choose A, B, or C: (A) Chain Mail, Greatsword, Flail, 8 Javelins, Dungeoneer’s Pack, and 4 GP; (B) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Dungeoneer’s Pack, and 11 GP; or (C) 155 GP',
tests/unit/rules/srd-class-starting-equipment-extract.test.ts:32:    'Choose A or B: (A) Studded Leather Armor, Scimitar, Shortsword, Longbow, 20 Arrows, Quiver, Druidic Focus (sprig of mistletoe), Explorer’s Pack, and 7 GP; or (B) 150 GP',
tests/unit/assets/board-glyphs.test.ts:560:    { id: SCOUT, name: 'Scout', kind: 'player_character', placementStatus: 'placed', position: OPEN_DOOR, effectiveSize: 'Medium', placementMode: { kind: 'normal', actual: 'Medium' }, footprint: [OPEN_DOOR], life: 'living', hitPointBand: { kind: 'perceived_band', band: 'bloodied' } },
src/combat/statblocks/kb/entries.ts:31:  { ruleId: 'R-MONSTER-021', monsterId: 'statblock:scout', srdLocator: 'docs/srd/full/srd-5.2.1.txt:21130-21164', rulingGuidance: 'Make two Shortsword or Longbow attacks in any combination.' },
src/combat/statblocks/mercenary-company.ts:42:export const SCOUT = monsterStatblock({
src/combat/statblocks/mercenary-company.ts:43:  id: 'statblock:scout', name: 'Scout', armorClass: 13, hitPointMaximum: 16, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/mercenary-company.ts:47:    skills: present([{ name: 'Nature', bonus: 4 }, { name: 'Perception', bonus: 5 }, { name: 'Stealth', bonus: 6 }, { name: 'Survival', bonus: 5 }]), gear: present(['Leather Armor', 'Longbow', 'Shortsword']), senses: present([]), passivePerception: 15,
src/combat/statblocks/mercenary-company.ts:50:    actions: [{ kind: 'multiattack', id: 'multiattack', count: 2, actionIds: ['shortsword', 'longbow'], combination: 'any' }, melee('shortsword', 'Shortsword', 4, [damage(5, 1, 6, 2, 'Piercing')]), ranged('longbow', 'Longbow', 4, [damage(6, 1, 8, 2, 'Piercing')], 150, present(600))],
src/combat/statblocks/monsters.ts:111:    skills: notListed('skills'), gear: present(['Half Plate Armor', 'Longbow', 'Longsword', 'Shield']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
src/combat/statblocks/monsters.ts:114:    actions: [melee('longsword', 'Longsword', 3, 12, 2, 10, 1, 'Slashing'), { ...ranged('longbow', 'Longbow', 3, 5, 1, 8, 1, 'Piercing', 150, present(600)), damage: [{ average: 5, dice: { count: 1, sides: 8, modifier: 1 }, type: 'Piercing', trigger: { kind: 'always' } }, { average: 7, dice: { count: 3, sides: 4, modifier: 0 }, type: 'Poison', trigger: { kind: 'always' } }] }],
src/combat/statblocks/roster.ts:51:  { id: 'statblock:scout', name: 'Scout', family: 'mercenary_company', challengeRating: '1/2', source: [{ path: SRD_PATH, lineStart: 21130, lineEnd: 21164 }], selectionNote: null, statblock: SCOUT },
src/combat/statblocks/goblinoid-warband.ts:91:    skills: notListed('skills'), gear: present(['Greatsword', 'Half Plate Armor', 'Longbow']), senses: present([{ kind: 'darkvision', rangeFeet: 60 }]), passivePerception: 10,
src/combat/statblocks/goblinoid-warband.ts:97:      ranged('longbow', 'Longbow', 4, [damage(6, 1, 8, 2, 'Piercing'), damage(5, 2, 4, 0, 'Poison')], 150, present(600)),
src/combat/statblocks/vane-warren.ts:199:      gear: present(['Greatsword', 'Half Plate Armor', 'Longbow']),
src/combat/statblocks/vane-warren.ts:226:        ranged('longbow', 'Longbow', 5, [
tests/unit/tools/ai-dm-conversation.test.ts:2730:    // move to (13,1); changing that blocker then exposes monster-5's Longbow at
tests/unit/tools/ai-dm-conversation.test.ts:2832:      // Longbow clear their seams; the moves also open the pinned interior rays.
src/catalog/bundled-content-digest-v1.expected.ts:65:  Object.freeze({"catalog_layer":"bundled","kind":"weapon","contentKey":"2024:weapon:longbow","name":"Longbow","digest":"34269141759599289036360667096452aa4c7fa23bf92322363c77127e13c530"}),
tests/unit/vtt/challenge-room-fixtures.test.ts:91:function hypotheticalLongbowExpansionCost(effectiveArmorClass: number): number {
tests/unit/vtt/challenge-room-fixtures.test.ts:355:    expect(hypotheticalLongbowExpansionCost(18 + 2)).toBe(124);
tests/unit/vtt/challenge-room-fixtures.test.ts:356:    expect(hypotheticalLongbowExpansionCost(15 + 5)).toBe(124);
tests/unit/vtt/challenge-room-fixtures.test.ts:382:    expect(hypotheticalLongbowExpansionCost(18)).toBe(140);
tests/unit/vtt/challenge-room-fixtures.test.ts:383:    expect(hypotheticalLongbowExpansionCost(15 + 5)).toBe(124);
tests/unit/ui/equipment-step.test.ts:153:          { weapon_id: 13, weapon_name: 'Longbow', mastery_property: 'Slow', selected: complete },
tests/unit/vtt/dm-tactical-intel.test.ts:160:    // Half Cover makes each +4 Longbow shot hit AC 20 on 16-20: 5/20.
tests/unit/schema-check-constraints.test.ts:3038:      // Fighter holding a Longbow — the silent-wrong these CHECKs exist for.
src/vtt/d365-sample-party.ts:156:  name: 'Longbow', proficiency_category: 'martial', attack_kind: 'ranged',
tests/unit/vtt/challenge-feasibility.test.ts:558:  it('total-only grouping rejects the 59 2 versus 31 30 Longbow counterexample', () => {
tests/unit/vtt/engine-round-session.test.ts:347:    // 31 grid intervals are 155 ft: beyond Longbow normal 150, within long 600.
tests/unit/db/migrations.test.ts:3113:         ('test:longbow', 'Longbow', 'martial_ranged', 'dice', '1d8',
tests/unit/db/migrations.test.ts:3156:      { name: 'Longbow', attack_kind: 'ranged' },
tests/unit/db/migrations.test.ts:3395:       INSERT INTO migration_parent (id, name) VALUES (7, 'Longbow');
tests/unit/db/migrations.test.ts:3417:      name: 'Longbow',
tests/unit/vtt/tactical-evaluator-r02.test.ts:117:      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
tests/unit/vtt/tactical-evaluator-r02.test.ts:169:      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
tests/unit/vtt/composite-turn-proposals.test.ts:160:    expect(labels).toContain('Longbow + Longbow -> combatant:fighter');
tests/unit/vtt/composite-turn-proposals.test.ts:161:    expect(labels).toContain('Longbow + Longbow -> combatant:cleric');
tests/unit/vtt/composite-turn-proposals.test.ts:162:    expect(labels).toContain('Longbow + Longbow -> combatant:wizard');
tests/unit/vtt/composite-turn-proposals.test.ts:166:  it('offers and executes Scout Longbow twice in one main action', () => {
tests/unit/vtt/composite-turn-proposals.test.ts:171:    if (option === undefined) throw new Error('Scout Longbow ×2 option is absent.');
tests/unit/vtt/composite-turn-proposals.test.ts:173:    expect(option.label).toBe('Longbow + Longbow -> combatant:target');
tests/unit/vtt/composite-turn-proposals.test.ts:411:    expect(labels).toContain('Longbow + Longbow -> combatant:target');
tests/unit/vtt/composite-turn-proposals.test.ts:421:    expect(JSON.stringify(context)).toContain('Longbow + Longbow -> combatant:target');
tests/unit/vtt/snippets.test.ts:413:    if (proposal === undefined) throw new Error('Longbow proposal is absent.');
tests/unit/vtt/snippets.test.ts:416:    if (!resolved.valid) throw new Error('Longbow proposal was refused.');
tests/unit/vtt/snippets.test.ts:424:    if (proposal === undefined) throw new Error('Longbow proposal is absent.');
import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  monsterSpellResourcePoolId,
  type MonsterSpellcastingAction,
} from '../../../src/combat/statblock';
import { SCOUT, SPY } from '../../../src/combat/statblocks/mercenary-company';
import { PRIEST } from '../../../src/combat/statblocks/monsters';
import { BROWN_BEAR, DIRE_WOLF } from '../../../src/combat/statblocks/wild-beasts';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  engineActorOptionsForEnvironment,
  resolveEngineActorOption,
} from '../../../src/vtt/intent-resolver';
import {
  engineOptionId,
  type EngineOfferableOption,
  type EngineTurnProposal,
} from '../../../src/vtt/turn-proposal';
import { placedToken, playerProfile } from '../combat/fixtures';
import { engineActorOptions } from '../../../src/vtt/turn-option-registry';
import { generateStandardOfferDeclarations } from '../../../src/vtt/offers/offer-declarations';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});
const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);

function monsterProfile(
  statblock: typeof SCOUT | typeof SPY | typeof PRIEST | typeof BROWN_BEAR | typeof DIRE_WOLF,
  key: string,
  initiativeBonus = 100,
): CombatantProfile {
  const profile = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
  return { ...profile, rules: { ...profile.rules, initiativeBonus } };
}

function encounter(
  monsters: readonly { readonly profile: CombatantProfile; readonly column: number; readonly row: number }[],
  targetColumn: number,
  worldObjects: readonly WorldObject[] = [],
): EncounterState {
  const target = playerProfile('target', { hitPoints: 200, initiativeBonus: -100 });
  return freshMonsterPlanningState(createEncounter({
    bounds: { columns: 40, rows: 10 },
    combatants: [...monsters.map((entry) => entry.profile), target],
    tokens: [
      ...monsters.map((entry) => placedToken(entry.profile, entry.column, entry.row)),
      placedToken(target, targetColumn, 2),
    ],
    worldObjects,
  }));
}

function proposalFor(state: EncounterState, option: EngineOfferableOption): EngineTurnProposal {
  return {
    actorId: option.actorId,
    expectedRevision: option.revision,
    primaryOptionId: option.optionId,
    fallbackOptionId: null,
    reason: 'Exercise the composite proposal fixture.',
    overrideJustification: null,
  };
}

function authorize(state: EncounterState, option: EngineOfferableOption): AuthorizedEngineTurnProposal {
  const proposal = proposalFor(state, option);
  const resolution = TURN_PROPOSAL_RESOLVER.resolve(state, proposal);
  if (!resolution.valid) {
    throw new Error(`Composite fixture was refused: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
  }
  return {
    proposal,
    option: resolution.option,
    primaryOption: resolution.primaryOption,
    fallbackOption: resolution.fallbackOption,
    mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
  };
}

function mainMultiattack(option: EngineOfferableOption, actionId: string, count: number): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'multiattack' &&
    slot.use.components.length === count && slot.use.components.every((component) => component.actionId === actionId));
}

describe('complete action economy and composite turn proposals', () => {
  it('declaration extraction preserves End Turn plus bonus ordering', () => {
    const spy = monsterProfile(SPY, 'declaration-order-spy');
    const state = encounter([{ profile: spy, column: 0, row: 2 }], 10);
    const declarations = generateStandardOfferDeclarations(state, spy.id);
    const endTurn = declarations.filter((declaration) => declaration.label.startsWith('End Turn'));

    expect(endTurn.map((declaration) => declaration.label)).toEqual([

exec
/bin/bash -lc "rg -n \"adjacency_is|within_action_reach_is|visibility_is\" src/vtt/speculative-planning.ts | head -60
sed -n '300,430p' src/vtt/speculative-planning.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
125:    case 'adjacency_is': {
132:    case 'within_action_reach_is': {
148:    case 'visibility_is': {
228:    case 'adjacency_is': return `adjacency:${selectorKey(atom.left)}:${selectorKey(atom.right)}`;
229:    case 'within_action_reach_is': return `reach:${selectorKey(atom.actor)}:${atom.actionId}:${selectorKey(atom.target)}`;
230:    case 'visibility_is': return `visibility:${selectorKey(atom.observer)}:${selectorKey(atom.subject)}`;
250:    case 'adjacency_is': return { ...atom, value: !atom.value };
251:    case 'within_action_reach_is': return { ...atom, value: !atom.value };
252:    case 'visibility_is': return { ...atom, value: !atom.value };
401:        kind: 'adjacency_is', left: actorRef, right: targetRef,
411:          kind: 'within_action_reach_is', actor: actorRef, actionId, target: targetRef,
419:        kind: 'visibility_is', observer: actorRef, subject: targetRef, value: visibility.visible,
451:    case 'adjacency_is': return [atom.left, atom.right];
452:    case 'within_action_reach_is': return [atom.actor, atom.target];
453:    case 'visibility_is': return [atom.observer, atom.subject];
468:  if (baseline.kind === 'within_action_reach_is') {
507:  return atom.kind === 'adjacency_is' || atom.kind === 'within_action_reach_is' ||
508:    atom.kind === 'visibility_is' || atom.kind === 'zone_occupancy_is';
      if (primary === undefined) return [];
      const fallback = options.find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
      return [{ actorId, expectedRevision: state.revision, primaryOptionId: primary.optionId,
        fallbackOptionId: fallback?.optionId ?? null,
        reason: 'Use the strongest currently available offensive option.',
        overrideJustification: null }];
    });
  },
});

export interface ProposalFactDependency {
  readonly proposalActorId: CombatantId;
  readonly baseline: ScenarioFactAtom;
  readonly flipped: ScenarioFactAtom;
}

function hpThreshold(current: number, maximum: number): HpThresholdPercent {
  if (current * 100 <= maximum * 25) return 25;
  if (current * 100 <= maximum * 50) return 50;
  if (current * 100 <= maximum * 75) return 75;
  return 75;
}

function addDependency(
  entries: ProposalFactDependency[],
  proposalActorId: CombatantId,
  baseline: ScenarioFactAtom,
  lifeFlip?: LifeState,
): void {
  entries.push({
    proposalActorId,
    baseline,
    flipped: complementScenarioFact(baseline, lifeFlip),
  });
}

function optionSelectors(option: EngineOfferableOption): readonly EngineSelectorRef[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    const selectors = use.kind === 'attack' || use.kind === 'saving_throw' ? [use.target]
      : use.kind === 'multiattack' ? use.components.map((component) => component.target)
        : use.kind === 'cast_spell' ? use.targets : [];
    return selectors.map((selector) => ({ actorId: option.actorId, selector }));
  });
}

export function extractProposalFactDependencies(
  state: EncounterState,
  options: readonly EngineOfferableOption[],
  queries: EngineQueryPort,
): readonly ProposalFactDependency[] {
  const entries: ProposalFactDependency[] = [];
  for (const option of options) {
    const actorRef = directRef(option.actorId, option.actorId);
    const actor = queries.combatant(state, option.actorId);
    if (actor === null) continue;
    addDependency(entries, option.actorId, {
      kind: 'life_state_is', subject: actorRef, value: actor.life,
    }, actor.life === 'living' ? 'dead' : 'living');
    addDependency(entries, option.actorId, {
      kind: 'resource_available_is', subject: actorRef,
      resource: { kind: 'reaction' }, available: actor.turn.reactionAvailable,
    });
    addDependency(entries, option.actorId, {
      kind: 'concentration_is', subject: actorRef,
      active: engineConcentrationActive(state, option.actorId),
    });
    if (actor.legendary !== undefined) {
      for (const resource of [{ kind: 'legendary_action' }, { kind: 'legendary_resistance' }] as const) {
        const available = resource.kind === 'legendary_action'
          ? actor.legendary.actionUsesRemaining > 0
          : actor.legendary.resistanceUsesRemaining > 0;
        addDependency(entries, option.actorId, {
          kind: 'resource_available_is', subject: actorRef, resource, available,
        });
      }
    }
    for (const targetRef of optionSelectors(option)) {
    const targetId = resolveSelector(state, targetRef, queries);
    if (targetId === null) continue;
    const target = queries.combatant(state, targetId);
    if (target === null) continue;
    addDependency(entries, option.actorId, {
      kind: 'life_state_is', subject: targetRef, value: target.life,
    }, target.life === 'living' ? 'dead' : 'living');
    if (target.life === 'living') {
      const maximum = enginePlanningHitPointMaximum(state, targetId);
      if (maximum > 0) {
        const threshold = hpThreshold(enginePlanningHitPoints(state, targetId), maximum);
        const comparison = enginePlanningHitPoints(state, targetId) * 100 <= maximum * threshold
          ? 'at_most' as const
          : 'above' as const;
        addDependency(entries, option.actorId, {
          kind: 'hp_percent', subject: targetRef, comparison, threshold,
        });
      }
    }
    const separation = queries.spaceDistance(state, option.actorId, targetId);
    if (separation !== null) {
      addDependency(entries, option.actorId, {
        kind: 'adjacency_is', left: actorRef, right: targetRef,
        value: separation <= 5,
      });
    }
    for (const slot of option.actionSlots) {
      const use = slot.use;
      const actionIds = use.kind === 'multiattack' ? use.components.map((component) => component.actionId)
        : use.kind === 'attack' || use.kind === 'saving_throw' ? [use.actionId] : [];
      for (const actionId of actionIds) if (queries.actions(state, option.actorId).some((action) => action.id === actionId)) {
        addDependency(entries, option.actorId, {
          kind: 'within_action_reach_is', actor: actorRef, actionId, target: targetRef,
          value: queries.reach(state, { actorId: option.actorId, targetId, actionId }).legal,
        });
      }
    }
    const visibility = queries.visibility(state, option.actorId, targetId);
    if (visibility !== null) {
      addDependency(entries, option.actorId, {
        kind: 'visibility_is', observer: actorRef, subject: targetRef, value: visibility.visible,
      });
    }
    for (const zone of enginePlanningSemanticZones(state)) {
      if (!zone.active) continue;
      addDependency(entries, option.actorId, {
        kind: 'zone_occupancy_is', subject: targetRef, zoneId: zone.id,
        value: zone.memberCombatantIds.includes(targetId) ? 'inside' : 'outside',
      });
    }
    for (const condition of combatantConditions(state, targetId)) {
      addDependency(entries, option.actorId, {

exec
/bin/bash -lc "rg -n \"export function monsterProfile|function monsterProfile\" tests/unit/combat/fixtures.ts tests/unit/combat/fixtures.*
sed -n '1,130p' tests/unit/combat/fixtures.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
tests/unit/combat/fixtures.ts:13:export function monsterProfile(
tests/unit/combat/fixtures.ts:13:export function monsterProfile(
import { abilities } from '../../../src/domain/enums';
import {
  characterCombatantProfile,
  combatToken,
  monsterCombatantProfile,
  type CharacterCombatSheet,
  type CombatantProfile,
  type CombatToken,
  type SpellSlotCapacity,
} from '../../../src/combat/combatant';
import { monsterStatblock } from '../../../src/combat/statblock';

export function monsterProfile(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
    readonly usesDeathSaves?: boolean;
    readonly conditionImmunities?: readonly string[];
    readonly constitutionSaveBonus?: number;
  } = {},
): CombatantProfile {
  const statblock = monsterStatblock({
    id: `statblock:${key}`,
    name: key,
    armorClass: 12,
    hitPointMaximum: options.hitPoints ?? 10,
    speedFeet: 30,
    initiativeBonus: options.initiativeBonus ?? 0,
    savingThrowBonuses: {
      strength: 0,
      dexterity: 0,
      constitution: options.constitutionSaveBonus ?? 0,
      intelligence: 0,
      wisdom: 0,
      charisma: 0,
    },
    ...(options.attacksPerAction === undefined
      ? {}
      : { attacksPerAction: options.attacksPerAction }),
    ...(options.conditionImmunities === undefined
      ? {}
      : { conditionImmunities: options.conditionImmunities }),
    ...(options.usesDeathSaves === undefined
      ? {}
      : { usesDeathSaves: options.usesDeathSaves }),
  });
  const profile = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
  return { ...profile, rules: { ...profile.rules, sizeCategory: 'Medium' } };
}

export function characterSheet(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
  } = {},
): CharacterCombatSheet {
  const initiativeBonus = options.initiativeBonus ?? 5;
  return {
    character_id: 1,
    name: key,
    creature_classification: { type: 'Humanoid', size: 'Medium' },
    hit_point_maximum: {
      id: 'hit_point_maximum',
      label: 'Hit Point maximum',
      value: options.hitPoints ?? 10,
      formula: 'fixture',
    },
    walking_speed: { kind: 'known', value: 30, detail: 'fixture' },
    armor_class: {
      id: 'armor_class',
      label: 'Armor Class',
      value: 14,
      formula: 'fixture',
      winner: {
        label: 'Unarmored',
        source: 'manual',
        expression: '10 + DEX',
        total: 14,
      },
      shields: [],
      bonuses: [],
      excluded: [],
      tie_break: null,
    },
    initiative: {
      id: 'initiative',
      label: 'Initiative',
      value: initiativeBonus,
      formula: 'fixture',
    },
    ability_scores: abilities.map((ability) => ({
      id: `ability:${ability}`,
      label: ability,
      ability,
      value: ability === 'wisdom' ? 18 : 10,
      score: ability === 'wisdom' ? 18 : 10,
      base_score: ability === 'wisdom' ? 18 : 10,
      increased_score: ability === 'wisdom' ? 18 : 10,
      override_terms: [],
      formula: 'fixture',
    })),
    proficiency_bonus: {
      id: 'proficiency_bonus',
      label: 'Proficiency Bonus',
      value: 2,
      formula: 'fixture',
    },
    saves: abilities.map((ability) => ({
      id: `save:${ability}`,
      label: ability,
      ability,
      value: 0,
      formula: 'fixture',
      proficient: false,
    })),
    attacks_per_action: {
      count: options.attacksPerAction ?? 1,
      unresolved: [],
    },
    damage_resistances: [],
    unchosen_damage_resistances: [],
  };
}

exec
/bin/bash -lc "rg -n \"D642|STAIRCASE_WALL|axis-aligned|sharedVertex\" /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md | tail -30
sed -n '23010,23045p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
15547:  intervals on axis-aligned rays.
22814:Sol (fresh 01a0ab3f…, impl-seam-blocked-sol.md): shared-edge rule implemented in traceCornerLine via firstSharedEdgeBlockingCell (axis-aligned rays on integer grid lines; both flanking cells sight-blocking; lower row/column wins), optical only — cover tier aggregation reads line.tier only, so the seam cannot raise cover by construction; the total-cover-source shortcut was folded into sightBlockingAt (exclusions respected); five hand-authored tests; three mutants red→green (sol's runs). 19 suites 308/312. ATTRIBUTION BY ME (attrib-seam.log; cover.ts swapped to HEAD and restored, sha c8852c97… both ends, dirty=14 unchanged): WITH seam 4 reds (visibility-field LARGE_OBSERVER seen_dim→unseen; scene-snapshot "preserves full persisted request/coordinator bytes…"; dm-tactical-intel "reports both 90-foot Scout shots…" expected [] to equal [(8,1),…]; tactical-evaluator-r02 "renders target-specific non-nearest R02 rows…" reasons). WITHOUT seam: only the two new seam tests red plus scene-snapshot — so scene-snapshot is NOT the seam's (it is the partial-B4 producer edits; added to B4 r2's known reds) and the other three ARE the seam's. DISPOSITIONS: (1) LARGE_OBSERVER_USES_BEST_CELL: the fixture's "clear" ray (2,2)→(4,2) ran along the seam of a full-height fog column — the test leaned on the defect; RE-AUTHOR the geometry so the best footprint cell has a genuinely clear ray (stated in the comment with the cells it crosses) and the plan's BEST_FOOTPRINT_CORNER_IGNORED mutant still dies; no repin. (2)+(3) consumer pins: normalize under D569 ONLY with the geometry named (the ray and its two flanking blockers) and the new expected value hand-derived from that geometry with a negative control, OR re-author if the test's stated purpose needs that visibility; sol proposes per test, I verify the geometry myself before accepting. Fix r1 resumed on the seam session.
23057:## D642 — OWNER (2026-09-17 19:15): "Seal diagonal corners." — the solid-wall model adopted in full: a ray is blocked by any blocking cell interior, any edge shared by two blockers (D635) and any vertex shared by two diagonally touching blockers; outer-face grazes and single-blocker corner touches stay clear; physical cover tiers unchanged
23058:Owner also confirmed on the annotated image: "The orange and purple lines should not work" (all four corner rays through the column-7 wall are blocked — the seam rule's result). WALL-01 dispatched to sol (resume the seam-rule session 01a0ab3f…, brief impl-vis-field-wall-01.md, log impl-wall-01.log) on the worktree at 807d2e3c: the vertex rule in cover.ts with exact lattice-point enumeration, hand-authored witnesses (crack sealed, single-blocker control, staircase wall sealed at a step vertex — the case the edge rule alone misses, outer-face graze clear, 2x2 solid unchanged), the SEAM batch's DIAGONAL_CORNER_TOUCH_UNCHANGED pin re-pinned by hand to the sealed result (renamed _SEALED_D642), three mutants, per-family consequence counts before/after, the red-set audit (a red in a non-frozen suite is a finding, not a re-pin), and proof that generation bytes are untouched. Astra medium review follows; then question 5 (A1) regenerates the cohorts under the sealed geometry.
23061:Authorized: (1) WALL-01 (D642, in flight) lands the solid-wall vertex rule with VIS-FIELD; (2) QUESTION 5 = A1: normalize the removed fog key in the second-family validator's regeneration comparison (demonstrated per fixture as a single-key diff, as LAND-04 did), then regenerate ONLY the three brutal cohorts as new versioned families under the sealed geometry (brutal-v2 6209xxx, brutal-b-v2 6210xxx, brutal-2-v2 6211xxx; hard-2 5118xxx kept as the historical hard half), D569 precedent in full (verbatim namespace audit, membership from decoded state, two byte-identical generations, hashes pinned only then), manifests d569-second-family-manifest-v2 + d569-blind-experiment-manifest-v6 with v1/v5 frozen, versioned arena/rerun routes (brutal-v2, brutal-10-v2, brutal-10-b-v2), hand re-pins for composite-turn-proposals and Room-8 opportunity-intel, a small hand-authored scene for speculative-planning (never an empty-menu normalization); (3) the blind semantic cap stays 32,768 and the oversized-block rejection witness (astra's LAND4-F1, P3) is added; (4) after landing: the VIS-FIELD-PERF batch — visibility-epoch cache with the from-scratch differential witness, range-before-LOS prefilter inside offer generation, and the precomputed rectilinear-region/rectangle wall representation (Debenham–Solis-Oba) — planned and reviewed like any unit, plus the two test-only items into TEST-PERF-01. ORDER: WALL-01 (verify, astra) → A1 as VIS-FIELD-01 batch COHORT-01 (planned as a brief with the file-level costing from investigate-option-a-costing-sol.md as its binding spec; astra reviews) → untruncated full gate → land → mirror push (D640) → ELEVATION-02 B0 and the perf batch.
23066:## D645 — SUPERVISOR (2026-09-17 19:53): WALL-01 REJECTED by my verification (WALL-F1, P1: the vertex rule is inert for axis-aligned rays whose sealing pair straddles the line); fix r1 dispatched; COHORT-01 plan (400 lines, sha 6852051d…) harvested and sent to astra HIGH
23067:SOL WALL-01 (saved impl-wall-01-sol.md): gcd lattice enumeration, TL+BR / TR+BL pairs, progress-ordered merge of interior/edge/vertex events, physical tier untouched; 43/43; three mutants killed; counts table "unchanged"; 42 seeds byte-identical; pair 38.6 s; two los-cover budget timeouts. VERIFIED BY ME (clean checkout + patch, traceTerrainLine, Medium tokens, 15x8): blockers (7,3)&(8,4) with the ray cells (13,4)→(1,4): blocksSight FALSE (must be true); (7,4)&(8,3): FALSE; vertical (4,2)&(5,3) with (5,0)→(5,6): FALSE; the diagonal crack cases TRUE. CAUSE (read in cover.ts): sharedVertexBlockingCells is built from `candidates`, which traceSpaces filters by the bounding box of the eight corners; for a ray along a grid line between Medium cells the far-side flank row is outside the box, so the vertex is never registered. Sol's STAIRCASE_WALL_SEALED witness passes only because its geometry keeps both cells inside the box — it does not exercise the case it is named for, and the "counts unchanged" table is not evidence about D642. FIX R1 (sol resumed; brief impl-vis-field-wall-01-fix-r1.md; log impl-wall-01-fix-r1.log): on-the-fly sightBlockingAt lookups around each interior lattice vertex (as the edge rule does), witnesses replaced with my three geometries + a split-pair control, a bbox-regression mutant, counts and generation bytes redone.
## D635.48 — SUPERVISOR (2026-09-17 08:27): attribution of the 77 reds; LAND-04 dispatched for the non-seam reconciliations; gate-wt2 truncation fixed
ATTRIBUTION (verified by me): room-generator.test.ts bisect on the clean checkout — 66/66 at main 9f148666 and B3 78ee31b0; 7 red from the seam commit 5492f782 (the brutal first family's "productive monsters" pins); 36 red from B2 dcca84fd (the runtime fog-field removal); 37 at LAND-01+. Captured the test's own expected vs generated strings for the twelve 3943 basis pins: EXACTLY ONE structural difference each — `.encounter.state.foggedCells` ([]) present in the expectation (expectedCreatureSpaceFixture passes the legacy fixture key through) and absent from the generated state. That is a narrowly authorized normalization in the TEST's normalizer (drop the legacy key as the V1 decoder does), not a fixture regeneration. Main controls (main-controls.log): node-runtime, composite-turn-proposals, engine-opportunity-movement-intel, speculative-planning, legacy-invariance 59/59 and the four ai-dm-arena blind rows 4/4 pass on main — every one of those reds is a branch consequence, not pre-existing.
CLASSES: (1) B2's missed consequence — 27 byte pins + M576 + probably the three 6204 digests + legacy-invariance identities → LAND-04 Task A/B under D569 protocol; (2) B6's missed consequence — four ai-dm-arena blind-row pins at 8192 vs the 32,768 cap → re-pin to the recorded default (owner may still reduce it); (3) THE SEAM RULE's productivity consequence, now known to cover ALL frozen families: brutal (8/10 seeds), brutal-b (10/10), brutal-2 (7/10 + ledger + d569-v5 at file level), and hard-family behaviour pins (composite-turn-proposals: the scout offers only Dodge/End Turn; opportunity intel: 5117008 monster-1 dash → dodge; speculative-planning: empty scenario menu) — LAND-04 Task C investigates with per-ray evidence and a three-way offer count (as-is / seam off / seam+LOS-refusal off) per family for the owner's question 5; NO re-pins; (4) load candidates being rerun isolated (branch-isolated.log).
TOOLING: gate-wt2.sh `head -30` → `head -400` (both greps), applied while no gate was running. Memory note gate-wt2-truncates-red-list written.
LAND-04 dispatched to sol (resume 01a0ae59…, brief impl-vis-field-land-04.md, log impl-land-04.log).

## D635.49 — SUPERVISOR (2026-09-17 09:07): LAND-04 harvested (sol; saved impl-land-04-sol.md); the thirteen re-pinned digests derived independently by me on main; Task C's seam-rule counts recorded for question 5
SOL: three test files 58+/16−, nothing under tests/fixtures. Task A: structural diff = exactly $.encounter.state.foggedCells for all 28 byte pins (12 basis, 12 hard, 3 brutal, M576); normalizer drops the key with a D635.48 comment; the three BRUTAL_BASIS_GENERATED_DIGESTS and all ten D466_6204_NON_ROSTER_DIGESTS (the projection carries the state field for every seed, not only the three replacements) re-derived with old values kept as comments; reverse mutant (key added back) → exactly 12 basis pins red. Task B: four ai-dm-arena blind-row pins → 32,768 with the D635.48 comment (actual semantic bytes observed 10,399); legacy-invariance now derives the starting-room digest IN the test (reconstructs the pre-B2 state as current + foggedCells: [], asserts that exact single difference, hashes both: 34287ad8… → 4757f909…) and approves only row[0].startingRoomDigest; d569-v5 left red (frozen second family). Sol's runs: room-generator 58 passed + exactly the 8 brutal productivity reds; ai-dm-arena 58/58; legacy-invariance 10/10; tsc 0/0.
VERIFIED BY ME (d466-derivation-main.txt): on MAIN 9f148666, a temp copy of the test computed for the ten 6204 seeds sha256(canonicalJson(d466NonRosterProjection(room))) as-is and with ONLY foggedCells deleted, and for 6203001–3 the legacy creature-space projection likewise: all 13 as-is digests equal the OLD constants and all 13 key-dropped digests equal sol's NEW constants — a cross-version derivation, not a regeneration. My verification of the rest (tsc, my normalizer mutant → 28 red, suites, the two budget reds on a quieter machine) is running (verify-land-04.log).
TASK C (sol, production hashes unchanged before/after): every behaviour red is the D635 seam rule — with the seam disabled only, composite-turn-proposals / opportunity-intel / speculative-planning all pass (3/3); LAND-01 merely refuses the resulting sight-blocked offers. Ray evidence: the scout (13,3) → fighter (1,2): two rays total/blocked, the two row-3 rays cover NONE but optically blocked along the seam (7,2)/(7,3) — i.e. the rays run inside a two-cell wall. COUNTS (resolved first-turn options with an attack/save component; "zero" = living monsters with no attack option at all):
| family | monsters | as-is offers / zero-attack | seam off | seam + LOS refusal off |
| hard 5117001–013 | 75 | 142 / 35 | 286 / 9 | 286 / 9 |
| brutal | 44 | 57 / 34 | 111 / 31 | 111 / 31 |
| brutal-b | 42 | 15 / 41 | 54 / 35 | 54 / 35 |
| brutal-2 | 44 | 58 / 36 | 96 / 34 | 96 / 34 |
Disabling the LOS refusal on top of the seam changes nothing (the refusal is exactly the seam's shadow). Reading: in the HARD family the seam rule takes 35 of 75 monsters from "has a shot" to "no shot on turn one" (9 without it); in the brutal families most monsters had no first-turn shot even before the seam (31–35 of ~44), the seam adds 3–6. The brutal families' productivity CONTRACT was written against the old geometry; the hard family's behaviour pins encode the old geometry's sightlines.

## D635.50 — SUPERVISOR (2026-09-17 09:22): LAND-04 VERIFIED BY ME and committed 807d2e3c; astra medium review dispatched; the vane-tpk budget red is a branch slowdown, not load
VERIFIED (verify-land-04.log, clean checkout at 9a220fce + patch, load ≤1.7): tsc 0/0; diff-check 0; 0 long lines; 0 fixture files; MY MUTANT — normalizer keeps the legacy key → 34 red vs the 8 baseline (I predicted 36 = 28 pins + 8; the difference of two was not investigated — the mutant is unmistakably caught); room-generator 58 passed + exactly the eight brutal productivity reds; legacy-invariance + ai-dm-arena 68/68; js-round-plan 35/35 (its earlier 5.1 s was load). vane-tpk-clean-terminates (pc-algorithm-policy.test.ts:967): 6585 ms on the branch at load 1.5 vs its 5 s budget, and 6674 ms earlier — main's duration measured this tick (see loop-log) — a branch SLOWDOWN candidate (the derived visibility field costs per turn), to be handled as a perf finding (TEST-PERF / budget rationale), NOT by re-pinning the budget under load (memory: gates-need-a-quiet-machine). Committed 807d2e3c. vis-field = ebfcacaa → 61dd454e → 9a220fce → 807d2e3c. Astra (resume 01a0a642…, medium; brief review-impl-land-04-astra.md; log review-land-04-astra-r1.log) reviews LAND-04 on the detached checkout.
REMAINING RED SET on 807d2e3c (expected, all the seam rule's frozen-family/behaviour consequence awaiting question 5): brutal productivity 8 (room-generator), brutal-b 10, D569 blind-experiment 6, second-family manifest 8, d569-v5 file-level, composite-turn-proposals 1, engine-opportunity-movement-intel 1, speculative-planning 1; plus vane-tpk (perf). The next full-suite run must show EXACTLY these; read from an untruncated log.

## D635.51 — SUPERVISOR (2026-09-17 09:36): LAND-04 ACCEPTED by astra r1 (medium; saved review-impl-land-04-astra-r1.md; 1 P3 parked); untruncated full vitest launched on 807d2e3c to pin the exact remaining red set
Astra: all 28 pin cases and 13 digest pairs re-derived in memory with the OLD constants taken from `git show 9a220fce:…`, not the comments (restoring only the key reproduces the old hashes; removing it the new); legacy-invariance sound — it decoded the committed approved-main oracle and both rows record 34287ad8…, equal to the reconstructed pre-B2 hash, and the approved-change map keeps every other field byte-compared; the cap pins are bounded both ways (0 < 10,399 ≤ 32,768) and the screenshot-only case still asserts zero semantic bytes; nothing normalizes a seam consequence (58 + exactly 8; the three behaviour witnesses still red); tsc 0/0; production hashes unchanged. MY MUTANT DISCREPANCY EXPLAINED by astra: keeping the key fails 26 of the 28 selected pins (6203002/3 compare through digests, not the helper) + 8 baseline = 34. LAND4-F1 (P3, parked, not blocking): no committed test exercises the oversized blind semantic-block REJECTION at blind-turn-context.ts:1304; astra's probe (a 40,000-char creature name) was rejected at 32,768 and passed with the guard disabled — add that witness when the owner rules on the cap (it pins whichever value is ratified).
Full vitest on the clean checkout at 807d2e3c running (full-vitest-807d2e3c.log, untruncated). Expected red set: brutal productivity 8, brutal-b 10, D569 blind-experiment 6, second-family manifest 8, d569-v5 file-level, composite-turn-proposals 1, engine-opportunity-movement-intel 1, speculative-planning 1, vane-tpk 1 (perf) — 37 reds in 9 files — plus load noise if any. Anything else is a new finding.

## D635.52 — SUPERVISOR (2026-09-17 09:52): untruncated full vitest on 807d2e3c = 47 reds / 13 files (11485/11532): EXACTLY the predicted 37 + 10 full-run budget timeouts; VIS-FIELD is now blocked only on question 5; perf investigation dispatched
CLASSIFIED (full-vitest-807d2e3c.log, all titles listed): seam-rule frozen-family/behaviour set = brutal productivity 8 (room-generator) + second-family manifest 8 + brutal-b 10 + D569 blind-experiment 6 + d569-v5 file-level 1 + composite-turn-proposals 1 + engine-opportunity-movement-intel 1 + speculative-planning 1 = 36; vane-tpk 1 (perf, 7817 ms in the full run); the other 10 are 5.0–6.3 s budget timeouts that pass isolated on a quiet machine (los-cover 3 — 112/112 quiet; d583 contract inventory 6; replay 1; js-round-plan 1 — 35/35 quiet). No new deterministic red. The B2/B6 consequences (28 byte pins, 13 digests, 4 cap pins, legacy invariance) are gone. NOTE for TEST-PERF: the branch's per-turn cost makes thin 5 s budgets thinner (los-cover 5.9–6.2 s in the full run vs main's 17 load timeouts at landing) — the pre-existing budgets plus a ~2× slowdown on visibility-heavy fights.
DISPATCHED (read-only investigation, fresh sol high, brief .tmp/runs/test-perf/investigate-vis-field-slowdown.md, log investigate-slowdown.log): profile vane-tpk (3077 → 6585 ms), the los-cover productive-option test and the D630 pair on the branch vs main; top-3 hot paths with bounded fix proposals and the invariants/witnesses each must keep; flag any correctness smell (field computed for ineligible observers, traces for unreachable targets). Feeds TEST-PERF-01; no code changes.
STATE: claude/vis-field = 807d2e3c (LAND-01..04 all accepted). Landing = owner's question 5 → (A) new-cohort regeneration batch for brutal, brutal-b and brutal-2 + re-pins of the three hard-family behaviour witnesses + D569 manifest versioning, then the full landing gate read UNTRUNCATED, merge, mirror push (D640); (B)/(C) per ruling.

## D635.53 — SUPERVISOR (2026-09-17 10:21): VIS-FIELD slowdown profiled (sol, read-only; saved .claude/consensus/test-perf/investigate-vis-field-slowdown-sol.md); three bounded fixes queued for TEST-PERF-01 / a post-landing VIS-FIELD perf batch
MEASURED (sol, both trees' production hashes identical before/after; my own numbers agree: vane 3077 → 6585 ms): vane-tpk 3180 → 6820 ms (2.14×). NOT more detection queries (0.83×) but each sight query expanding into per-target-cell traces (visibility-field.ts:431): traceSpaces 95k → 348k (3.67×), traceCornerLine 124k → 536k (4.33×); 91.7% of cell traces are pairwise sightToCreature detection (~4.8 s inclusive), only 8.3% the derived field itself (~0.55 s). The field's weak caches (visibility-field.ts:104) are keyed by EncounterState identity, so immutable reducer revisions make nearly every request cold (206 projections over 205 distinct revisions; 140 traces each). los-cover productive-option 5472 → 6139 ms (+12%): the seam scan (firstSharedEdgeBlockingCell 4.17M calls, 380 ms) plus ~0.7 s more in traceCornerLine; also 33,953 of 46,650 reach traces (72.8%) were for candidates then refused by RANGE — geometry evaluated before the cheap range check. D630 pair 33.6 → 41.5 s: replay.ts:238 projects DM + every PC per replayed revision (derived fog 3,361 calls); the replay file rebuilds the scripted gate 15 times (13 default) at ~1.9 s each.
FIXES (bounded, with required witnesses): (1) TEST-ONLY: build each parameterized replay gate once, deep-freeze, structuredClone per mutating test (~20–23 s off the replay file; witness: gate hash unchanged across tests, shuffled order twice, corruption tests still fail on their own clones) — this is TEST-PERF-01's default-gate reuse item, confirmed as the largest test-only win; (2) PRODUCTION: cache visibility outcomes by an explicit visibility epoch (bumped by movement, footprints, walls/objects, light, obscurement, relevant conditions/effects, hidden state, senses, life, placement, observer eligibility; HP/log-only revisions reuse) + observer/subject key instead of state identity (~2.5–3.5 s in vane; witness: per revision, cached == from-scratch for every eligible pair and cell, byte-identical fog/reason/sense/grade and projection hashes, incl. Large/Huge footprints, seam rays, darkness, obscurement, Invisible/Hidden/Blinded, death/placement); (3) TEST-ONLY: generate the nine versioned rooms once per suite, deep-frozen (~4.5 s per named los-cover test) + optional seam memoization by blocking-topology signature (~0.35–0.7 s); (4) small: prefilter range before LOS inside offer generation only (public reach precedence unchanged; ~0.2–0.3 s).
CORRECTNESS: no field computed for ineligible observers (eligibleVisibilityObserverIds :525 excludes dead/unplaced/adjudication-pending/unconscious); per-cell tracing for large footprints is correctness-sensitive (a single representative ray would regress); the seam scan is required work. State-identity caching = design smell, not a defect. DISPOSITION: (1)+(3) go into TEST-PERF-01 (owner's ranks 6/8/9 still pending); (2)+(4) = a VIS-FIELD-PERF batch after landing, planned and reviewed like any batch; the 5 s budgets are NOT re-pinned meanwhile.

## D635.54 — SUPERVISOR (2026-09-17 11:06): option A costed (sol, read-only; saved investigate-option-a-costing-sol.md); a refinement of the attribution — 40 of the second-family ledger's 47 violations are B2's fog key, not the seam rule

exec
/bin/bash -lc "set +e
rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
printf 'main=%s\\n' \""'$?"
rg -n -o -e '"'6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
printf 'tracked=%s\\n' \""'$?"
rg -n -o -e '"'\\b6209\\b|\\b6210\\b|\\b6211\\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
printf 'short=%s\\n' \""'$?"' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
23048:6209xxx
23048:6210xxx
23048:6211xxx
23061:6209xxx
23061:6210xxx
23061:6211xxx
23071:6209xxx
23071:6_209_001
main=0
tracked=1
23068:6209
23068:6210
23068:6211
short=0

codex
The namespace preflight now has a reproducible shape: the authoritative decisions file has only reservation/review matches, while the exact seed representations are absent from tracked fixture/tool paths. I’ll encode that distinction verbatim and make any replacement range require a plan-manifest amendment before generation.
2026-09-18T00:14:25.627621Z ERROR codex_core::tools::router: error=apply_patch verification failed: invalid patch: multiple operations target /home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
deleted file mode 100644
index 6edc0138a1519b499cc6913bfca597ebe88268aa..0000000000000000000000000000000000000000
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ /dev/null
@@ -1,400 +0,0 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
-
-Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
-
-## Outcome and non-negotiable gates
-
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
-
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
-
-Common commands used after every batch:
-
-- **T:** `npx tsc -p tsconfig.app.json --noEmit` and
-  `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
-- **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
-
-## D569 demonstrate-then-normalize ledger
-
-Every pin has an explicit source and ordering:
-
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
-
-## Ordered batches
-
-### Batch 1 — validator normalization and historical v1 semantics
-
-**Allowed files (3):**
-
-- `tools/d569-second-family-manifest.ts`
-- `tests/unit/tools/d569-second-family-manifest.test.ts`
-- `tests/unit/tools/d569-v5.test.ts`
-
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
-
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
-
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
-
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
-
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
-
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
-**Allowed files (3):**
-
-- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
-- `tests/unit/vtt/room-generator.test.ts`
-- `tests/unit/vtt/arena-basis-brutal-b.test.ts`
-
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
-
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
-
-Move, do not weaken, the current productivity assertions:
-
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
-
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
-
-**Allowed files (10):**
-
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
-
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
-
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
-
-**Allowed files (10):**
-
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
-
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
-
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
-
-**Allowed files (10):**
-
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
-
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
-
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
-
-**Allowed files (7):**
-
-- `tools/d569-second-family-manifest.ts`
-- `tools/d569-blind-experiment.ts`
-- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
-- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
-- `tests/unit/tools/d569-second-family-manifest.test.ts`
-- `tests/unit/tools/d569-blind-experiment.test.ts`
-- `tests/unit/tools/d569-v6.test.ts` (new)
-- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
-
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
-
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
-
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
-
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
-
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
-
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
-
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
-### Batch 7 — versioned arena and rerun routes
-
-**Allowed files (4):**
-
-- `tools/ai-dm-arena.ts`
-- `tests/unit/tools/ai-dm-arena.test.ts`
-- `tools/ai-dm-rerun-packet.ts`
-- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
-
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
-
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
-
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
-
-**Allowed files (4):**
-
-- `tools/los-cover-era-audit.ts`
-- `tests/unit/tools/los-cover-era-audit.test.ts`
-- `tools/blind-context-fixture-report.ts`
-- `tests/unit/vtt/blind-turn-context.test.ts`
-
-**R:** add family/census assertions before wiring; expected missing rows are 30.
-
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
-
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
-
-### Batch 9 — three behavior pins, hand-authored evidence only
-
-**Allowed files (3):**
-
-- `tests/unit/vtt/composite-turn-proposals.test.ts`
-- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
-- `tests/unit/vtt/speculative-planning.test.ts`
-
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
-
-**Implementation:**
-
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
-
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
-
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
-
-### Batch 10 — 32,768-byte cap rejection witness
-
-**Allowed files (1):**
-
-- `tests/unit/vtt/blind-turn-context.test.ts`
-
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
-
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
-
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
-
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
-
-## Final targeted verification and handoff
-
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
-
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
-
-## Open questions for the owner
-
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
deleted file mode 100644
index 6edc0138a1519b499cc6913bfca597ebe88268aa..0000000000000000000000000000000000000000
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ /dev/null
@@ -1,400 +0,0 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
-
-Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
-
-## Outcome and non-negotiable gates
-
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
-
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
-
-Common commands used after every batch:
-
-- **T:** `npx tsc -p tsconfig.app.json --noEmit` and
-  `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
-- **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
-
-## D569 demonstrate-then-normalize ledger
-
-Every pin has an explicit source and ordering:
-
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
-
-## Ordered batches
-
-### Batch 1 — validator normalization and historical v1 semantics
-
-**Allowed files (3):**
-
-- `tools/d569-second-family-manifest.ts`
-- `tests/unit/tools/d569-second-family-manifest.test.ts`
-- `tests/unit/tools/d569-v5.test.ts`
-
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
-
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
-
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
-
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
-
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
-
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
-**Allowed files (3):**
-
-- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
-- `tests/unit/vtt/room-generator.test.ts`
-- `tests/unit/vtt/arena-basis-brutal-b.test.ts`
-
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
-
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
-
-Move, do not weaken, the current productivity assertions:
-
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
-
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
-
-**Allowed files (10):**
-
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
-- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
-
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
-
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
-
-**Allowed files (10):**
-
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
-- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
-
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
-
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
-
-**Allowed files (10):**
-
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
-- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
-
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
-
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
-
-**Allowed files (7):**
-
-- `tools/d569-second-family-manifest.ts`
-- `tools/d569-blind-experiment.ts`
-- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
-- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
-- `tests/unit/tools/d569-second-family-manifest.test.ts`
-- `tests/unit/tools/d569-blind-experiment.test.ts`
-- `tests/unit/tools/d569-v6.test.ts` (new)
-- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
-
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
-
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
-
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
-
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
-
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
-
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
-
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
-### Batch 7 — versioned arena and rerun routes
-
-**Allowed files (4):**
-
-- `tools/ai-dm-arena.ts`
-- `tests/unit/tools/ai-dm-arena.test.ts`
-- `tools/ai-dm-rerun-packet.ts`
-- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
-
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
-
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
-
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
-
-**Allowed files (4):**
-
-- `tools/los-cover-era-audit.ts`
-- `tests/unit/tools/los-cover-era-audit.test.ts`
-- `tools/blind-context-fixture-report.ts`
-- `tests/unit/vtt/blind-turn-context.test.ts`
-
-**R:** add family/census assertions before wiring; expected missing rows are 30.
-
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
-
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
-
-### Batch 9 — three behavior pins, hand-authored evidence only
-
-**Allowed files (3):**
-
-- `tests/unit/vtt/composite-turn-proposals.test.ts`
-- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
-- `tests/unit/vtt/speculative-planning.test.ts`
-
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
-
-**Implementation:**
-
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
-
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
-
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
-
-### Batch 10 — 32,768-byte cap rejection witness
-
-**Allowed files (1):**
-
-- `tests/unit/vtt/blind-turn-context.test.ts`
-
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
-
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
-
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
-
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
-
-## Final targeted verification and handoff
-
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
-
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
-
-## Open questions for the owner
-
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..161ef2493e147a24efe15ea50915966e88ed637a
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
-
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
-
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
+### Batch 2 — RED active membership and frozen-productivity retirement
 
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
-
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
-
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
 
-Move, do not weaken, the current productivity assertions:
-
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,48 +204,40 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
-
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
 ### Batch 7 — versioned arena and rerun routes
 
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
-
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,20 +265,14 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
-
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
-
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-### Batch 9 — three behavior pins, hand-authored evidence only
+### Batch 9 — hand-authored behaviour pins
 
 **Allowed files (3):**
 
@@ -323,38 +280,51 @@
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture adds the predeclared staircase
+wall whose last diagonal pair is `(7,3)/(8,4)`; first assert the production trace changes from
+sight-clear to blocked, then require baselines `[Dodge,Dodge]` and exact menu `[]`. This empty
+mutation result is a contrast, not normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, no active turn, speed 30/radius 60, and a controlled query table. Define `S(x)` as
+the exact canonical direct selector. The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +332,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2):** Batch 6 now adds a separately pinned outer-v6 identity to session keys,
+  cells, rows, and row matching; preserves v5; and rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements:** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..161ef2493e147a24efe15ea50915966e88ed637a
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
-
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
-
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
+### Batch 2 — RED active membership and frozen-productivity retirement
 
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
-
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
-
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
 
-Move, do not weaken, the current productivity assertions:
-
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,48 +204,40 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
-
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
 ### Batch 7 — versioned arena and rerun routes
 
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
-
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,20 +265,14 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
-
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
-
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-### Batch 9 — three behavior pins, hand-authored evidence only
+### Batch 9 — hand-authored behaviour pins
 
 **Allowed files (3):**
 
@@ -323,38 +280,51 @@
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture adds the predeclared staircase
+wall whose last diagonal pair is `(7,3)/(8,4)`; first assert the production trace changes from
+sight-clear to blocked, then require baselines `[Dodge,Dodge]` and exact menu `[]`. This empty
+mutation result is a contrast, not normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, no active turn, speed 30/radius 60, and a controlled query table. Define `S(x)` as
+the exact canonical direct selector. The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +332,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2):** Batch 6 now adds a separately pinned outer-v6 identity to session keys,
+  cells, rows, and row matching; preserves v5; and rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements:** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

exec
/bin/bash -lc "wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '1,430p' | tail -90
git status --short --untracked-files=all
rg -n '"'^### Batch|''^'"\\*\\*Allowed files|"'^## Pre-Batch|''^## Round|D569ExperimentIdentity|canonicalD569SecondFamilyRegeneration|NEW v2|Round 2'"' .tmp-plans/2026-09-17-cohort-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
371 .tmp-plans/2026-09-17-cohort-01-plan.md
   282	
   283	**R:** preserve the three current deterministic RED titles before edits. Re-run the following
   284	geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
   285	
   286	**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
   287	`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
   288	enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
   289	`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
   290	every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
   291	cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
   292	stale comment; these are hand calculations.
   293	
   294	For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
   295	monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
   296	`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
   297	canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
   298	`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture adds the predeclared staircase
   299	wall whose last diagonal pair is `(7,3)/(8,4)`; first assert the production trace changes from
   300	sight-clear to blocked, then require baselines `[Dodge,Dodge]` and exact menu `[]`. This empty
   301	mutation result is a contrast, not normalization of the old frozen empty scene.
   302	
   303	Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
   304	P at `(4,2)`, no active turn, speed 30/radius 60, and a controlled query table. Define `S(x)` as
   305	the exact canonical direct selector. The nine non-shadowed candidates and hand oracle are:
   306	
   307	|rank|fact key|refs|legal P destination/path ft|score|result|
   308	|---:|---|---:|---|---:|---|
   309	|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
   310	|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
   311	|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
   312	|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
   313	|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
   314	|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
   315	|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
   316	|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
   317	|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
   318	
   319	All costs are independently <=60; the controlled port rejects every unlisted destination.
   320	Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
   321	exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
   322	the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
   323	ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
   324	
   325	**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
   326	tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
   327	table fail. Common checks; run these three files serially, all named outcomes exact.
   328	
   329	### Batch 10 — 32,768-byte cap rejection witness
   330	
   331	**Allowed files (1):**
   332	
   333	- `tests/unit/vtt/blind-turn-context.test.ts`
   334	
   335	**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
   336	name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
   337	UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
   338	states required/max byte counts. Baseline may be green because this witnesses existing policy.
   339	
   340	**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
   341	because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
   342	
   343	## Final targeted verification and handoff
   344	
   345	Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
   346	brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
   347	files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
   348	fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
   349	and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
   350	
   351	## Open questions
   352	
   353	None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
   354	procedure; it is not an implementation-time choice.
   355	
   356	## Round 2 disposition
   357	
   358	- **PLAN-F1 (P2):** Batch 6 now adds a separately pinned outer-v6 identity to session keys,
   359	  cells, rows, and row matching; preserves v5; and rejects v5 primary/second hard rows.
   360	- **PLAN-F2 (P2):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
   361	  underscore forms, records actual output/status, classifies reservations, reserves all three
   362	  families together, and requires Allowed-file amendment before a replacement generation.
   363	- **PLAN-F3 (P2):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
   364	  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
   365	- **PLAN-F4 (P3):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
   366	  and 52 = 18 existing + 34 new.
   367	- **Supporting requirements:** Batch 6 requires canonical regeneration for active v6; Batch 1
   368	  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   369	  derivations after WALL-01.
   370	
   371	COHORT-01 PLAN R2 DONE
50:## Pre-Batch-2 namespace reservation gate
77:### Batch 1 — validator normalization and historical semantics
79:**Allowed files (3):**
88:NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
98:paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
107:### Batch 2 — RED active membership and frozen-productivity retirement
109:**Allowed files (3):**
136:### Batch 3 — generate primary brutal-v2 6209001-6209010
138:**Allowed files (10):**
157:### Batch 4 — generate brutal-b-v2 6210001-6210010
159:**Allowed files (10):**
175:### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
177:**Allowed files (10):**
194:### Batch 6 — v2/v6 manifests, identity boundary, and hashes
196:**Allowed files (8):**
219:Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
228:canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
242:### Batch 7 — versioned arena and rerun routes
244:**Allowed files (4):**
259:### Batch 8 — LOS audit and blind fixture report
261:**Allowed files (4):**
275:### Batch 9 — hand-authored behaviour pins
277:**Allowed files (3):**
329:### Batch 10 — 32,768-byte cap rejection witness
331:**Allowed files (1):**
356:## Round 2 disposition

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..161ef2493e147a24efe15ea50915966e88ed637a
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
-
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
-
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
+### Batch 2 — RED active membership and frozen-productivity retirement
 
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
-
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
-
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
 
-Move, do not weaken, the current productivity assertions:
-
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,48 +204,40 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
-
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
 ### Batch 7 — versioned arena and rerun routes
 
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
-
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,20 +265,14 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
-
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
-
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-### Batch 9 — three behavior pins, hand-authored evidence only
+### Batch 9 — hand-authored behaviour pins
 
 **Allowed files (3):**
 
@@ -323,38 +280,51 @@
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture adds the predeclared staircase
+wall whose last diagonal pair is `(7,3)/(8,4)`; first assert the production trace changes from
+sight-clear to blocked, then require baselines `[Dodge,Dodge]` and exact menu `[]`. This empty
+mutation result is a contrast, not normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, no active turn, speed 30/radius 60, and a controlled query table. Define `S(x)` as
+the exact canonical direct selector. The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +332,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2):** Batch 6 now adds a separately pinned outer-v6 identity to session keys,
+  cells, rows, and row matching; preserves v5; and rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements:** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..618ac2820ba4bddb5531972cc6d9eba2f0908a84
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,59 +265,69 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture's base wall cells are exactly
+`(7,0..3)` plus `(8,5..7)`; the mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +335,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-239):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..618ac2820ba4bddb5531972cc6d9eba2f0908a84
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,59 +265,69 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture's base wall cells are exactly
+`(7,0..3)` plus `(8,5..7)`; the mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +335,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-239):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

exec
/bin/bash -lc "wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '188,245p'
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '275,380p'
tail -1 .tmp-plans/2026-09-17-cohort-01-plan.md
git diff --check
git status --short --untracked-files=all" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
374 .tmp-plans/2026-09-17-cohort-01-plan.md
   188	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
   189	
   190	**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
   191	membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
   192	that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
   193	
   194	### Batch 6 — v2/v6 manifests, identity boundary, and hashes
   195	
   196	**Allowed files (8):**
   197	
   198	- `tools/d569-second-family-manifest.ts`
   199	- `tools/d569-blind-experiment.ts`
   200	- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
   201	- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
   202	- `tests/unit/tools/d569-second-family-manifest.test.ts`
   203	- `tests/unit/tools/d569-blind-experiment.test.ts`
   204	- `tests/unit/tools/d569-v6.test.ts` (new)
   205	- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
   206	
   207	**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
   208	and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
   209	row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
   210	identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
   211	no `seed - 6203000` assumption survives in a v6 path.
   212	
   213	**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
   214	proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
   215	`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
   216	`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
   217	other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
   218	
   219	Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
   220	manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
   221	V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
   222	exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
   223	cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
   224	unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
   225	experiment identity. Thus unchanged hard cells cannot cross v5/v6.
   226	
   227	The active `d569-v6.test.ts` access MUST set `regenerate:
   228	canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
   229	`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
   230	or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
   231	30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
   232	in v6, finalize/hash v6, and pin that outer hash in code/test.
   233	
   234	**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
   235	bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
   236	or generation 2 divergence. Named witnesses fail each mutant.
   237	
   238	**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
   239	suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
   240	second-family core 480. Historical v1/v5 suites remain green and never execute v6.
   241	
   242	### Batch 7 — versioned arena and rerun routes
   243	
   244	**Allowed files (4):**
   245	
   275	### Batch 9 — hand-authored behaviour pins
   276	
   277	**Allowed files (3):**
   278	
   279	- `tests/unit/vtt/composite-turn-proposals.test.ts`
   280	- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
   281	- `tests/unit/vtt/speculative-planning.test.ts`
   282	
   283	**R:** preserve the three current deterministic RED titles before edits. Re-run the following
   284	geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
   285	
   286	**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
   287	`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
   288	enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
   289	`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
   290	every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
   291	cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
   292	stale comment; these are hand calculations.
   293	
   294	For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
   295	monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
   296	`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
   297	canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
   298	`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture's base wall cells are exactly
   299	`(7,0..3)` plus `(8,5..7)`; the mutation adds `(8,4)`, completing diagonal pair
   300	`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
   301	baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
   302	normalization of the old frozen empty scene.
   303	
   304	Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
   305	P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
   306	`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
   307	All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
   308	The nine non-shadowed candidates and hand oracle are:
   309	
   310	|rank|fact key|refs|legal P destination/path ft|score|result|
   311	|---:|---|---:|---|---:|---|
   312	|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
   313	|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
   314	|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
   315	|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
   316	|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
   317	|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
   318	|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
   319	|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
   320	|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
   321	
   322	All costs are independently <=60; the controlled port rejects every unlisted destination.
   323	Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
   324	exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
   325	the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
   326	ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
   327	
   328	**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
   329	tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
   330	table fail. Common checks; run these three files serially, all named outcomes exact.
   331	
   332	### Batch 10 — 32,768-byte cap rejection witness
   333	
   334	**Allowed files (1):**
   335	
   336	- `tests/unit/vtt/blind-turn-context.test.ts`
   337	
   338	**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
   339	name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
   340	UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
   341	states required/max byte counts. Baseline may be green because this witnesses existing policy.
   342	
   343	**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
   344	because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
   345	
   346	## Final targeted verification and handoff
   347	
   348	Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
   349	brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
   350	files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
   351	fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
   352	and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
   353	
   354	## Open questions
   355	
   356	None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
   357	procedure; it is not an implementation-time choice.
   358	
   359	## Round 2 disposition
   360	
   361	- **PLAN-F1 (P2; lines 194-239):** Batch 6 now adds a separately pinned outer-v6 identity to
   362	  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
   363	- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
   364	  underscore forms, records actual output/status, classifies reservations, reserves all three
   365	  families together, and requires Allowed-file amendment before a replacement generation.
   366	- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
   367	  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
   368	- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
   369	  and 52 = 18 existing + 34 new.
   370	- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
   371	  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   372	  derivations after WALL-01.
   373	
   374	COHORT-01 PLAN R2 DONE
COHORT-01 PLAN R2 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..618ac2820ba4bddb5531972cc6d9eba2f0908a84
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,59 +265,69 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture's base wall cells are exactly
+`(7,0..3)` plus `(8,5..7)`; the mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +335,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-239):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

exec
/bin/bash -lc "nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '45,108p'
rg -n '"'^## |''^### Batch'"' .tmp-plans/2026-09-17-cohort-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
    45	   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
    46	5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
    47	   WALL-01. Preserve stale values only as history comments.
    48	6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
    49	
    50	## Pre-Batch-2 namespace reservation gate
    51	
    52	Run this after accepted WALL-01 and before adding any range to source/tests. The first command
    53	uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
    54	tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
    55	
    56	```text
    57	rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
    58	rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
    59	rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
    60	```
    61	
    62	Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
    63	`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
    64	`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
    65	empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
    66	status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
    67	shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
    68	Record one reservation covering all three families before any rejection/reselection.
    69	Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
    70	audit a fresh contiguous range in all three representations, and have the supervisor amend this
    71	plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
    72	manifest/route constants before creating replacement bytes. Unamended replacement paths are
    73	unauthorized; the other two initial reservations remain reserved.
    74	
    75	## Ordered batches
    76	
    77	### Batch 1 — validator normalization and historical semantics
    78	
    79	**Allowed files (3):**
    80	
    81	- `tools/d569-second-family-manifest.ts`
    82	- `tests/unit/tools/d569-second-family-manifest.test.ts`
    83	- `tests/unit/tools/d569-v5.test.ts`
    84	
    85	**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
    86	regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
    87	difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
    88	NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
    89	the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
    90	
    91	**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
    92	brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
    93	own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
    94	canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
    95	raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
    96	static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
    97	retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
    98	paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
    99	normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
   100	
   101	**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
   102	ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
   103	
   104	**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
   105	zero v1 violations, all negative witnesses green.
   106	
   107	### Batch 2 — RED active membership and frozen-productivity retirement
   108	
6:## Outcome and hard gates
35:## D569 demonstrate-then-normalize ledger
50:## Pre-Batch-2 namespace reservation gate
75:## Ordered batches
77:### Batch 1 — validator normalization and historical semantics
107:### Batch 2 — RED active membership and frozen-productivity retirement
136:### Batch 3 — generate primary brutal-v2 6209001-6209010
157:### Batch 4 — generate brutal-b-v2 6210001-6210010
175:### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
194:### Batch 6 — v2/v6 manifests, identity boundary, and hashes
242:### Batch 7 — versioned arena and rerun routes
259:### Batch 8 — LOS audit and blind fixture report
275:### Batch 9 — hand-authored behaviour pins
332:### Batch 10 — 32,768-byte cap rejection witness
346:## Final targeted verification and handoff
354:## Open questions
359:## Round 2 disposition

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..618ac2820ba4bddb5531972cc6d9eba2f0908a84
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,59 +265,69 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture's base wall cells are exactly
+`(7,0..3)` plus `(8,5..7)`; the mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +335,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-239):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

exec
/bin/bash -lc "sed -n '270,315p' src/vtt/speculative-planning.ts
sed -n '1218,1235p' src/vtt/room-generator.ts
sed -n '570,610p' tests/unit/vtt/room-generator.test.ts
sed -n '360,402p' tests/unit/vtt/arena-basis-brutal-b.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
  }
}

function directRef(actorId: CombatantId, subjectId: CombatantId): EngineSelectorRef {
  return { actorId, selector: { kind: 'combatant', combatantId: subjectId } };
}

export interface HostBaselineProposalPlanner {
  plan(
    state: EncounterState,
    actors: readonly CombatantId[],
    environment: EngineOptionEnvironment,
  ): readonly EngineTurnProposal[];
}

function optionIsOffensive(option: EngineOfferableOption): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' &&
    (slot.use.kind === 'attack' || slot.use.kind === 'multiattack' || slot.use.kind === 'saving_throw'));
}

export const hostBaselineProposalPlanner: HostBaselineProposalPlanner = Object.freeze({
  plan(
    state: EncounterState,
    actors: readonly CombatantId[],
    environment: EngineOptionEnvironment,
  ): readonly EngineTurnProposal[] {
    const planningState = projectFutureMonsterTurns(state, actors);
    return actors.flatMap((actorId) => {
      const options = availableEngineActorOptions(planningState, actorId, environment);
      const primary = options.find(optionIsOffensive) ?? options[0];
      if (primary === undefined) return [];
      const fallback = options.find((option) => option.actionSlots.some((slot) =>
        slot.slot === 'main' && slot.use.kind === 'dodge')) ?? null;
      return [{ actorId, expectedRevision: state.revision, primaryOptionId: primary.optionId,
        fallbackOptionId: fallback?.optionId ?? null,
        reason: 'Use the strongest currently available offensive option.',
        overrideJustification: null }];
    });
  },
});

export interface ProposalFactDependency {
  readonly proposalActorId: CombatantId;
  readonly baseline: ScenarioFactAtom;
  readonly flipped: ScenarioFactAtom;
}
  tier: CoverTier,
  authoredSourceIds: ReadonlySet<string>,
): boolean {
  return livingOpposingPairs(state).some(({ source, target }) => {
    const trace = traceCombatantLine(state, source.profile.id, target.profile.id);
    return trace.tier === tier && trace.sourceIds.some((id) => authoredSourceIds.has(id));
  });
}

export function generatedLineIsOpen(
  trace: Pick<TerrainLineTrace, 'tier' | 'blocksSight'>,
): boolean {
  return trace.tier === 'none' && !trace.blocksSight;
}

function hasOpenOpposingRay(state: EncounterState): boolean {
  if (livingOpposingPairs(state).some(({ source, target }) =>
    generatedLineIsOpen(traceCombatantLine(state, source.profile.id, target.profile.id)))) return true;
        );
        expect(combatant?.profile).toEqual(monsterCombatantProfile(
          d466ReplacementStatblock(replacement),
          { combatantId: entry.combatantId, tokenId: entry.tokenId },
        ));
      }
      const restoredRoster = room.spec.monsterRoster.map((entry) =>
        entry.statblockId !== replacement.replacement ? entry : {
          ...entry,
          statblockId: replacement.original,
        });
      expect(
        sha256(canonicalJson(restoredRoster)),
        `seed ${String(seed)} changed sampled roster data beyond the typed id replacement`,
      ).toBe(D466_6204_PRE_OVERRIDE_ROSTER_DIGESTS[typedSeed]);
    }
  });

  it.each(BRUTAL_PRODUCTIVITY_SEEDS)(
    'generates brutal seed %s with executable casters, dense terrain, scaled pressure, and productive monsters',
    (seed) => {
      const brutal = generateRoom(seed, { difficulty: 'brutal' });
      expect(brutalRoomMembershipViolations(brutal)).toEqual([]);
      const state = freshMonsterPlanningState(brutal.encounter.state);
      const monsters = state.combatants.filter((candidate) => candidate.profile.kind === 'monster');
      for (const monster of monsters) {
        const productive = availableEngineActorOptions(state, monster.profile.id, OFFER_ENVIRONMENT)
          .some((option) => resolveEngineActorOption(state, option, OFFER_ENVIRONMENT).valid);
        expect(productive, monster.profile.id).toBe(true);
      }
    },
  );

  it.each([
    [3, 900],
    [4, 1_500],
    [5, 3_000],
    [6, 4_000],
  ] as const)('builds four full level-matched PCs at level %s', (level, targetXp) => {
    const party = heldoutParty(level);
    const room = generateRoom(7_850_001 + level, {
    id: combatant.profile.id,
    space: combatantSpace(state, combatant.profile.id),
  }));
  for (const entry of spaces) {
    expect(spaceFitsBounds(entry.space, state.bounds), `${entry.id} position bounds`).toBe(true);
    expect(spaceTouchesCellSet(entry.space, state.blockedCells), `${entry.id} blocked overlap`).toBe(false);
  }
  for (let left = 0; left < spaces.length; left += 1) {
    for (let right = left + 1; right < spaces.length; right += 1) {
      expect(spacesIntersect(spaces[left]!.space, spaces[right]!.space),
        `${spaces[left]!.id}/${spaces[right]!.id} overlap`).toBe(false);
    }
  }

  const reduced = reduceEncounter(state, { type: 'roll_initiative' }, mulberry32(seed));
  expect(reduced.state.revision, `seed ${String(seed)} reducer load`).toBe(state.revision + 1);
  expect(reduced.state.initiative, `seed ${String(seed)} initiative load`).toHaveLength(state.combatants.length);

  const planningState = freshMonsterPlanningState(state);
  for (const monster of planningState.combatants.filter((combatant) =>
    combatant.profile.kind === 'monster')) {
    const productive = availableEngineActorOptions(
      planningState,
      monster.profile.id,
      OFFER_ENVIRONMENT,
    ).some((option) => {
      const resolution = resolveEngineActorOption(planningState, option, OFFER_ENVIRONMENT);
      return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
        resolution.mechanics.actionSlots.some((slot) =>
          slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
          slot.kind === 'use_world_object'));
    });
    expect(productive, `${monster.profile.id} has no productive first-turn offer`).toBe(true);
  }

  // The byte pin lives with, and cannot pass instead of, the state-derived membership checks above.
  expect(sha256(fixtureBytes), `seed ${String(seed)} fixture bytes`).toBe(expectedDigest);
}

function fixtureAt(index: number): { readonly room: GeneratedRoom; readonly bytes: string } {
  const path = FIXTURE_PATHS[index];
  if (path === undefined) throw new RangeError(`No brutal-b fixture at index ${String(index)}.`);
  const bytes = inputs.fixtures.readText(path);

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..618ac2820ba4bddb5531972cc6d9eba2f0908a84
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,59 +265,69 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
+
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
+
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`. With no walls, production
+`buildHostScenarioMenu` must yield baseline labels `[Longbow + Longbow -> P, Dodge]`, P's
+canonical radius 60 (30 remaining + 30 Dash), and the one movement-flippable candidate
+`adjacency:S(A):S(P)` at score `1*60=60`. The D645 seam fixture's base wall cells are exactly
+`(7,0..3)` plus `(8,5..7)`; the mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
 
-**Implementation:**
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -362,39 +335,40 @@
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-239):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..bb90e7191357aae6740ce8d402df16f178302b3c
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,99 +265,109 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
 
-**Implementation:**
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
+cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
+`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
+`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
+
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
+
 ### Batch 10 — 32,768-byte cap rejection witness
 
 **Allowed files (1):**
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..bb90e7191357aae6740ce8d402df16f178302b3c
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,99 +265,109 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
 
-**Implementation:**
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
+cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
+`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
+`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
+
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
+
 ### Batch 10 — 32,768-byte cap rejection witness
 
 **Allowed files (1):**
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

exec
/bin/bash -lc "awk '/"'^'"\\- "'`/{line=$0; sub(/''^- `/,"",line); sub(/`.*/,"",line); print line}'"' .tmp-plans/2026-09-17-cohort-01-plan.md | sort -u | wc -l
awk '/"'^'"\\- "'`/{line=$0; sub(/''^- `/,"",line); sub(/`.*/,"",line); print line}'"' .tmp-plans/2026-09-17-cohort-01-plan.md | wc -l
wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | tail -20
rg -n \"full Vitest|Playwright|port 4173|canonicalD569SecondFamilyRegeneration|outer v6|wrong experiment|legacy key|Round 2 disposition\" .tmp-plans/2026-09-17-cohort-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
52
56
373 .tmp-plans/2026-09-17-cohort-01-plan.md
   354	
   355	None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
   356	procedure; it is not an implementation-time choice.
   357	
   358	## Round 2 disposition
   359	
   360	- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
   361	  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
   362	- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
   363	  underscore forms, records actual output/status, classifies reservations, reserves all three
   364	  families together, and requires Allowed-file amendment before a replacement generation.
   365	- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
   366	  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
   367	- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
   368	  and 52 = 18 existing + 34 new.
   369	- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
   370	  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   371	  derivations after WALL-01.
   372	
   373	COHORT-01 PLAN R2 DONE
24:5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
45:   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
92:brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
95:raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
98:paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
101:**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
209:row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
228:canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
238:**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
358:## Round 2 disposition
370:  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..bb90e7191357aae6740ce8d402df16f178302b3c
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,99 +265,109 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
 
-**Implementation:**
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
+cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
+`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
+`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
+
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
+
 ### Batch 10 — 32,768-byte cap rejection witness
 
 **Allowed files (1):**
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

codex
Revised [COHORT-01 implementation plan r2](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md). It is 373 lines, covers all Astra findings, and retains the 52-path scope.

COHORT-01 PLAN R2 DONE
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index 6edc0138a1519b499cc6913bfca597ebe88268aa..bb90e7191357aae6740ce8d402df16f178302b3c
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,67 +1,80 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
-D643 A1 supersedes the costing report's hard-3 proposal: keep hard-2 and add
-only three brutal v2 families.
+D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
 
-## Outcome and non-negotiable gates
+## Outcome and hard gates
 
-COHORT-01 preserves historical inputs, creates three solid-wall brutal cohorts,
-activates v6/v2, adds routes, reconciles behavior, and witnesses the cap.
+1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
+   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
+   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
+   expectations against the accepted WALL-01 tree before editing tests; if any stated result
+   differs, stop and amend/review this plan rather than copying changed-code output.
+2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
+   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
+   `tests/fixtures/d569-second-family-manifest.json`,
+   `tests/fixtures/d569-blind-experiment-manifest.json`,
+   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
+3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
+   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
+   nine-room cohort and no hash is retained.
+4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
+   or hashes made after membership and double-generation gates. Generated changed-code output
+   is never an oracle for a behavioural expectation.
+5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
+6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
+   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
 
-1. WALL-01 is a hard predecessor. Do not generate or hash a cohort until the
-   D642 diagonal-corner seal is verified/reviewed on a clean checkout. Confirm
-   `generatedLineIsOpen` remains `tier === 'none' && !blocksSight` at
-   `src/vtt/room-generator.ts:1227-1231` and WALL-01 left generator bytes fixed.
-2. Before edits, record aggregate SHA-256 inventories for these frozen inputs;
-   repeat them after every batch and require equality:
-   `tests/fixtures/d569-second-family-manifest.json` (v1),
-   `tests/fixtures/d569-blind-experiment-manifest.json` (v5), and every file in
-   `arena-basis-brutal` (6203), `arena-basis-brutal-b` (6206), and
-   `arena-basis-brutal-2` (6207). No byte in those paths may change.
-3. Never rewrite a historical fixture/manifest, add a D466 override, use
-   `--terrain-profile`, hand-edit generated JSON, or relax membership. If one
-   room fails, reject all ten seeds in that candidate range; record the rejected
-   namespace, audit the next unused contiguous namespace, and restart that
-   whole family. Do not keep nine rooms.
-4. No expectation may be copied from changed-code output. Sources are frozen
-   pre-change bytes, named hand derivations, or hashes after all generation gates.
-5. No full Vitest, Playwright, build, or port 4173 in implementation batches.
-   The supervisor's later landing gate is separate and must read the full,
-   untruncated result.
+Common checks after every batch:
 
-Common commands used after every batch:
-
 - **T:** `npx tsc -p tsconfig.app.json --noEmit` and
   `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
-- **V-diff:** `git diff --check` -> no output; `git status --short` contains
-  only that batch's Allowed files plus accepted earlier batches.
+- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
 - **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
 
 ## D569 demonstrate-then-normalize ledger
 
-Every pin has an explicit source and ordering:
+1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
+   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
+   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
+2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
+   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
+3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
+   hash v2 independently, then place that hash in v6.
+4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
+   second-family path/hash; pin the final outer v6 manifest hash separately from its contents.
+5. **Behaviour pins:** use only Batch 9's explicit ray/path/table calculations, rechecked after
+   WALL-01. Preserve stale values only as history comments.
+6. **Cap pin:** D643 fixes 32,768; measure the hand-authored oversized block, never derive a cap.
+
+## Pre-Batch-2 namespace reservation gate
+
+Run this after accepted WALL-01 and before adding any range to source/tests. The first command
+uses the authoritative MAIN file, not the stale 22,707-line worktree copy; the second audits
+tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
+
+```text
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+```
 
-1. **V1 regeneration pins:** for all 20 fixtures, structural paths between
-   committed bytes and current generation must be exactly
-   `$.encounter.state.foggedCells`. Preserve raw SHA; delete only that committed
-   key for comparison, never from generated bytes.
-2. **New fixture hashes (30):** namespace evidence -> decoded membership and
-   resolved-origin traces -> A/B `diff -rq` -> agreeing `sha256sum` and
-   `openssl dgst -sha256` -> insert hash. Hashes never prove membership.
-3. **Second-family v2 hash:** copy hard-2 rows/hashes from v1; use proven 6211
-   hashes; finalize and independently hash v2 before inserting its hash in v6.
-4. **Experiment v6:** copy v5, changing only `version`, primary brutal
-   (6203 -> accepted 6209), and `secondFamily` (v1 -> v2 path/hash); structurally
-   assert exactly those changes.
-5. **Behavior pins:** use only Batch 9's hand derivations; keep stale values in
-   comments as pre-D635/D642 history, never changed-code output.
-6. **Cap pin:** D643 supplies 32,768. The test measures a hand-authored
-   schema-valid oversized semantic block; there is no derived replacement value.
+Verified 2026-09-17 output is, verbatim: command 1 -> `23048:6209xxx`,
+`23048:6210xxx`, `23048:6211xxx`, `23061:6209xxx`, `23061:6210xxx`,
+`23061:6211xxx`, `23071:6209xxx`, `23071:6_209_001`, status 0; command 2 ->
+empty stdout/status 1; command 3 -> `23068:6209`, `23068:6210`, `23068:6211`,
+status 0. Lines 23048/23061 are costing/authorized reservations, 23068 is D645's
+shorthand plan summary, and 23071 is D646's review example: none is prior seed use.
+Record one reservation covering all three families before any rejection/reselection.
+Any new non-reservation match is a hard stop. If a range later fails, retain it as rejected,
+audit a fresh contiguous range in all three representations, and have the supervisor amend this
+plan's exact Batch-2 seed table, one Batch-3/4/5 Allowed-file manifest, and all downstream
+manifest/route constants before creating replacement bytes. Unamended replacement paths are
+unauthorized; the other two initial reservations remain reserved.
 
 ## Ordered batches
 
-### Batch 1 — validator normalization and historical v1 semantics
+### Batch 1 — validator normalization and historical semantics
 
 **Allowed files (3):**
 
@@ -69,84 +82,58 @@
 - `tests/unit/tools/d569-second-family-manifest.test.ts`
 - `tests/unit/tools/d569-v5.test.ts`
 
-**R (write first):** add a 20-path table red until it reports the single path;
-add a rebound fixture with updated raw hash plus one other state difference,
-requiring both regeneration codes; retain the divergent-generation-2 witness.
-Baseline: 40 regeneration + seven 6207 productivity violations; v5 aborts.
+**R:** add a per-fixture 20-row structural-diff table (one legacy path each, hence today's 40
+regeneration violations). Add rebound-hash witnesses proving (a) any second state-field/value
+difference still yields both `first_regeneration` and `independent_regeneration`, and (b) a
+NEW v2 brutal fixture containing `foggedCells` is rejected even if its hash is rebound. Retain
+the two-generation divergence witness. These are hand-authored mutations, not regenerated pins.
 
-**Implementation:** make the second-family schema a strict v1/v2 discriminated
-union. Its comparison policy is version/cohort aware:
+**Implementation:** make the schema a strict v1/v2 union. Hash raw bytes first. For v1 hard and
+brutal, and v2's carried hard-2 only, parse COMMITTED bytes, require the legacy key, delete only
+own `encounter.state.foggedCells`, canonicalize with one newline, and compare each current
+canonical rebuild to that projection. Never project generated bytes. V2 brutal-2-v2 compares
+raw committed/current canonical bytes and rejects the legacy key. V1 retains integrity plus
+static budget/caster/terrain checks but no longer recertifies frozen brutal productivity; v2
+retains full current membership/productivity. `d569-v5.test.ts` imports/asserts only the v5/v1
+paths and version, uses `canonicalD569SecondFamilyRegeneration`, and becomes green because this
+normalization makes v1 valid; it must never resolve v6. `seed - 6203000` may remain only there.
 
-- v1 hard and brutal: hash raw bytes, parse, require the demonstrated legacy
-  shape, delete exactly own key `encounter.state.foggedCells`, canonicalize with
-  one trailing newline, and compare both regenerations to that projection;
-- v2 hard-2: use the same projection because those ten raw files are carried;
-- v2 brutal-2-v2: compare raw committed bytes directly and reject a legacy key.
+**M:** keep the key, drop all state, normalize generated bytes, allow a new-v2 legacy key, and
+ignore regeneration 2; the 40-count, extra-diff, new-v2, and divergence witnesses kill each.
 
-Make v1 explicitly historical: continue integrity plus hard and static brutal
-(difficulty/budget/caster/terrain) checks, but do not re-certify v1 brutal
-productivity against post-D635/D642 geometry. V2 retains the full current
-`brutalRoomMembershipViolations`, including productivity. Replace the old 6207
-`expect(brutalRoomMembershipViolations(...)).toEqual([])` assertion with a
-commented historical/static check; do not assert that frozen rooms satisfy a
-contract they no longer satisfy.
-
-`d569-v5.test.ts` asserts outer v5/nested v1 before module dry-run. It is valid
-through the stated historical rules, never by reading v6. Historical
-`seed - 6203000` arithmetic may remain only there.
+**T/V:** common checks; serially run the two listed suites -> 20/20 one-key demonstrations,
+zero v1 violations, all negative witnesses green.
 
-**M:** (a) keep `foggedCells` -> exactly 40 regeneration codes return; (b)
-delete the entire state or ignore committed bytes -> the extra-field witness
-survives and the batch fails; (c) apply v1's productivity rule to v2=false or
-skip v2 productivity -> the later nonproductive v2 witness fails.
+### Batch 2 — RED active membership and frozen-productivity retirement
 
-**T/V:** T, V-diff, V-freeze; then
-`npx vitest run --configLoader runner tests/unit/tools/d569-second-family-manifest.test.ts tests/unit/tools/d569-v5.test.ts --maxWorkers=1` -> both files collect, all tests green, 20/20 single-key demonstrations, zero manifest violations.
-
-### Batch 2 — RED active-cohort membership witnesses and frozen-contract retirement
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
 - `tests/unit/vtt/room-generator.test.ts`
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
-**R:** declare 6209001-10, 6210001-10, and 6211001-10 paths before they exist;
-fail on 30 missing fixtures. Add negative clones for a nonproductive living
-monster and a productive ranged offer blocked from its resolved origin.
+**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
+expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
+monster and for an apparently productive ranged offer whose resolved origin has a blocked or
+total trace.
 
-**Implementation:** create shared test assertions that decode fixture bytes,
-then prove, in this order: identity/integrity and reducer load; brutal budget
-and 90-100% spend; implemented caster; terrain density/count band; every living
-monster has a valid productive first-turn option; and for the selected option's
-attack/save/cast target(s), `traceCombatantLine` from
-`resolution.mechanics.finalPosition` has `blocksSight === false` and
-`tier !== 'total'`. This is the per-monster strengthening of the existing
-productivity contract; cite `generatedLineIsOpen` as the generator's stricter
-room-level open-ray predicate. Only after all properties may a byte hash assert.
+**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
+identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
+then every living monster has a valid first-turn attack/save/cast offer whose target trace from
+`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
+contract and `room-generator.ts:1227`'s stricter generated-room predicate.
 
-Move, do not weaken, the current productivity assertions:
+Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
+frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
+productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
+reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
+Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
+D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-- retire `room-generator.test.ts:588-601` for frozen 6203001-10, preserve the
-  6203001-3 byte/digest pins at 506-528, and add the equivalent active 6209 v2
-  generation/fixture block;
-- split `arena-basis-brutal-b.test.ts:292-397` so frozen 6206001-10 keep every
-  structural/reducer/raw-SHA pin but omit only lines 378-393's productivity
-  recertification; keep the round-execution tests unchanged;
-- Batch 1 already retires only the frozen 6207 productivity assertion.
-
-Each retirement gets a D635/D642/D643 comment: bytes remain history; the
-productive contract lives on 6209/6210/6211. No skip/todo and no deleted byte
-pin.
-
-**M:** force productivity true and separately treat `blocksSight:true` as open;
-the two negative clones must kill the mutants.
+**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
+Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
 
-**T/V:** T, V-diff, V-freeze. The focused v2 suite is expected RED
-only for 30 missing inputs; the frozen 6203/6206 pin tests must have no
-productivity red after the precise retirement.
-
-### Batch 3 — generate primary brutal-v2 (6209001-6209010)
+### Batch 3 — generate primary brutal-v2 6209001-6209010
 
 **Allowed files (10):**
 
@@ -161,18 +148,13 @@
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
 - `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
 
-**R/M:** the Batch-2 6209 table is RED before generation; its nonproductive and
-blocked-trace mutants remain RED after generation.
-
-**Generation/V:** run twice into distinct `mktemp -d` roots:
-`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <temp>/arena-basis-brutal-v2`.
-No `--terrain-profile`; assert parsed config has no `terrainProfile`; assert
-`d466GeneratedRoomOverride(seed) === null` for 10/10. `diff -rq A B` -> no
-output; decoded membership -> 10/10 rooms and every living monster passes.
-Move A unchanged to the allowed directory, re-run membership, T,
-V-diff, V-freeze. Do not calculate/pin hashes yet.
+**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
+`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
+Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
+Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
+unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
 
-### Batch 4 — generate brutal-b-v2 (6210001-6210010)
+### Batch 4 — generate brutal-b-v2 6210001-6210010
 
 **Allowed files (10):**
 
@@ -187,11 +169,10 @@
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
 - `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6210001 and directory
-`arena-basis-brutal-b-v2`; exactly 10 files, empty `diff -rq`, 10/10 decoded
-membership, no D466 override, common T/V green, no hashes yet.
+**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
+two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
 
-### Batch 5 — generate D569 brutal-2-v2 (6211001-6211010)
+### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
 
 **Allowed files (10):**
 
@@ -206,14 +187,13 @@
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
 - `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
 
-**R/M/T/V:** identical gate to Batch 3, substituting seed 6211001 and directory
-`arena-basis-brutal-2-v2`. After all three batches, run the v2 membership-only
-tests: exactly 30/30 fixtures, zero violations, and both negative witnesses RED
-under their named mutants. A failure rejects that entire ten-seed namespace.
+**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
+membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
+that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
 
-### Batch 6 — manifests, dated namespace ledger, active v6, then hashes
+### Batch 6 — v2/v6 manifests, identity boundary, and hashes
 
-**Allowed files (7):**
+**Allowed files (8):**
 
 - `tools/d569-second-family-manifest.ts`
 - `tools/d569-blind-experiment.ts`
@@ -224,49 +204,41 @@
 - `tests/unit/tools/d569-v6.test.ts` (new)
 - `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
 
-**Predeclaration evidence:** before adding the first 6209/6210/6211 repository
-reference, execute from the clean WALL-01 checkout and copy these commands plus
-their literal empty stdout and `exit 1` into a dated 2026-09-17 v2 ledger entry:
+**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
+and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
+row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
+identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
+no `seed - 6203000` assumption survives in a v6 path.
 
-```text
-git grep -n -E '6209[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6210[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-git grep -n -E '6211[0-9]{3}' -- .claude/decisions.md tests/fixtures tools
-```
+**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
+`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
+other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
-The verified 807d2e3c preflight result is no stdout and exit 1 for each. If
-WALL-01 adds a non-reservation occurrence, stop and classify it. V2's exact
-`usedSeedNamespaces` extends v1 with 5118xxx, 6207xxx, 6209xxx, 6210xxx, and
-6211xxx. The overlap checker allows only v2's declared own 5118 hard and 6211
-brutal cohorts; it still rejects 6209/6210 and every other ledger namespace.
+Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
+manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
+V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
+exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
+cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
+unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
+experiment identity. Thus unchanged hard cells cannot cross v5/v6.
 
-**R:** first add strict schema/version/path/seed/ledger tests, a v5-v6 structural
-diff test, and exact cardinality tests. They must fail for missing manifests and
-unsupported versions. V6 ordinal tests use manifest array order/a seed-to-room
-map; no `seed - 6203000` arithmetic may occur in a v6 path.
+The active `d569-v6.test.ts` access MUST set `regenerate:
+canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
+`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
+or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
+30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
+in v6, finalize/hash v6, and pin that outer hash in code/test.
 
-**Implementation:** v2 contains version `d569-second-family-manifest-v2`, the
-raw unchanged hard-2 entries/hashes, accepted brutal-2-v2 entries/hashes, the
-dated ledger, and the extended namespace list. V6 contains version
-`d569-blind-experiment-v6`, unchanged primary hard 5117, primary brutal-v2,
-and `secondFamily` pointing to v2 plus its hash. All other v5 fields are copied.
-Keep old path constants as explicitly historical v5/v1 constants; add distinct
-active v6/v2 constants. Do not retarget `tools/d569-v5/**` or
-`d569-v5.test.ts`. Make the outer strict union validate each version against
-its own primary ranges, directories, nested path, and second-family policy.
+**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
+bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
+or generation 2 divergence. Named witnesses fail each mutant.
 
-Only now compute 30 hashes with both commands and add pins after membership.
-Hash final v2 and insert that digest in v6. Pin core 480, primary+hints 660,
-primary brutal 240, primary brutal+hints 330, and second-family core 480.
-
-**M:** wrong generation 2 -> `independent_regeneration`; hash with failed
-membership -> membership code; accepting 6207/6209 overlap -> range code; v6
-using v1/6203 -> path/range code; a fourth v5-v6 change -> carry-forward failure.
+**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
+suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
+second-family core 480. Historical v1/v5 suites remain green and never execute v6.
 
-**T/V:** common T/V; `sha256sum` equals `openssl dgst -sha256` for 30/30 files
-and v2; targeted three D569 suites -> zero violations and exact
-480/660/240/330/480 counts. V1/v5 targeted suites also remain green.
-
 ### Batch 7 — versioned arena and rerun routes
 
 **Allowed files (4):**
@@ -276,24 +248,15 @@
 - `tools/ai-dm-rerun-packet.ts`
 - `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
 
-**R:** add failing parser/path tests for arena `brutal-v2` and `brutal-b-v2`,
-and rerun `brutal-10-v2`/`brutal-10-b-v2`, including wrong-family rejection.
-
-**Implementation:** extend the closed arena basis union/path switch to the 6209
-and 6210 directories; both generate-missing difficulty mappings remain brutal.
-Add exact ten-seed arrays and closed rerun protocol mappings at the current
-definitions near lines 26 and 547. Preserve `brutal`, `brutal-b`,
-`brutal-10`, and `brutal-10-b` byte behavior and tests.
+**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
+`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
+lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
+directories. Historical labels/protocols retain their old paths and behaviour.
 
-**M:** map either v2 label/protocol to its old directory/range and require the
-new seed/path and wrong-family tests to fail; remove an old label and require
-the historical-route tests to fail.
+**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
+historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
 
-**T/V:** common T/V; arena table contains 8 labels (the prior 6 plus 2), both
-new paths exact; rerun registry contains 5 protocols (prior 3 plus 2), each v2
-protocol accepts exactly ten intended seeds and rejects old-family seed 1.
-
-### Batch 8 — audit/report coverage for all three new families
+### Batch 8 — LOS audit and blind fixture report
 
 **Allowed files (4):**
 
@@ -302,99 +265,109 @@
 - `tools/blind-context-fixture-report.ts`
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** add family/census assertions before wiring; expected missing rows are 30.
+**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
+`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
+per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
 
-**Implementation:** add `brutal-v2`, `brutal-b-v2`, and `brutal-2-v2` as
-file-backed families. Keep all historical entries. Era audit becomes 93 rooms
-(63 + 30), ten per new family; blind fixture report becomes 63 cases (33 + 30),
-ten per new family, all decoded from the committed fixture paths.
+**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
+focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
 
-**M:** omit one new family or point it at an old directory; exact family,
-seed, count, and fixture-hash assertions fail.
-
-**T/V:** common T/V; focused audit test reports 93 rows and 10/10/10 v2 rows;
-blind cap-fit parameterization reports 63/63 schema-valid, untruncated cases.
+### Batch 9 — hand-authored behaviour pins
 
-### Batch 9 — three behavior pins, hand-authored evidence only
-
 **Allowed files (3):**
 
 - `tests/unit/vtt/composite-turn-proposals.test.ts`
 - `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
 - `tests/unit/vtt/speculative-planning.test.ts`
 
-**R:** retain the three current deterministic RED titles as the before state.
-Do not change production code to recover obsolete geometry.
+**R:** preserve the three current deterministic RED titles before edits. Re-run the following
+geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
 
-**Implementation:**
+**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
+`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
+enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
+`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
+every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
+cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
+stale comment; these are hand calculations.
 
-- Composite 5117005: assert labels exactly `['Dodge', 'End Turn']` and no label
-  contains `Longbow`. Comment the hand derivation: Scout `(13,3)` to Fighter
-  `(1,2)` has two rays entering wall `(7,2)` and two running the `(7,2)/(7,3)`
-  shared edge; to Cleric `(2,4)` two run `(7,3)/(7,4)` and two enter `(7,4)`;
-  to Wizard `(1,6)` all four enter the column-7 wall. Every four-ray set is
-  sight-blocked, so LAND-01 correctly withholds all Longbows.
-- Room 8: replace the stale “all Dashes productive” comment. Pin monster 1 at
-  `(22,1)`, monster 2 at `(21,1)`, and monster 4 at `(21,3)` to zero-foot
-  Dodge at their current cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)`.
-- Speculative planning: replace frozen seed 5117001 with a small hand-authored
-  state containing exactly two monster baseline proposals and one movable
-  player dependency. In comments enumerate each canonical player movement
-  radius, each candidate's proposal references, and the independent arithmetic
-  `volatilityScore = referencedProposalCount * summedMovementRadiusFeet`.
-  Assert exact fact-key rank order, contiguous ranks, and `<= 8`; add enough
-  lower-ranked hand-authored dependencies to exercise truncation at exactly
-  eight. A diagonal two-wall corner mutation (D642) must remove/change the
-  relevant offensive proposal dependency and therefore empty or deterministically
-  change the menu. Never accept the frozen scene's empty menu as a new pin.
+For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
+cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
+`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
+`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
+`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
+baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
+normalization of the old frozen empty scene.
+
+Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
+P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
+`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
+All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
+The nine non-shadowed candidates and hand oracle are:
 
-**M:** restore any old Longbow/Dash expectation, disable shared-edge blocking,
-or remove the eight-entry slice; the exact labels/positions, seam mutation, or
-rank/cap witness fails.
+|rank|fact key|refs|legal P destination/path ft|score|result|
+|---:|---|---:|---|---:|---|
+|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
+|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
+|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
+|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
+|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
+|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
+|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
+|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
+|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
 
-**T/V:** common T/V; run the three named files serially -> all green, exactly
-the three reconciled titles pass, and the speculative base/mutation outcomes
-are distinct.
+All costs are independently <=60; the controlled port rejects every unlisted destination.
+Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
+the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
+ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
 
+**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
+tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
+table fail. Common checks; run these three files serially, all named outcomes exact.
+
 ### Batch 10 — 32,768-byte cap rejection witness
 
 **Allowed files (1):**
 
 - `tests/unit/vtt/blind-turn-context.test.ts`
 
-**R:** this is a witness for already-authorized behavior, so baseline may be
-green; the required RED is the guard-disabled mutant below.
+**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
+name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
+UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
+states required/max byte counts. Baseline may be green because this witnesses existing policy.
 
-**Implementation:** clone a normal `projectEngineSemanticBoard` projection,
-replace one semantic creature `name` with 40,000 characters (the schema permits
-an unbounded string), prove `blindSemanticBoard` schema parsing succeeds, then
-call `renderBlindTurnContext` with the ordinary blind projection. Assert the
-measured encoded semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES ===
-32_768` and the exact `RangeError` names the required and maximum byte counts.
+**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
+because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
 
-**M:** disable `blind-turn-context.ts:1304-1307` or change `>` to an always-false
-guard; this one test must turn RED because the oversized context is accepted.
+## Final targeted verification and handoff
 
-**T/V:** common T/V; focused test -> 1/1 cap witness green; guard-disabled
-mutant -> 1 failed; restore and verify source hash exactly.
+Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
+brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
+files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
+fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
+and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
 
-## Final targeted verification and handoff
+## Open questions
 
-Run serially only the touched suites (no full Vitest): second-family, blind
-experiment, v5, v6, generator, brutal-v2, room-generator, brutal-b, arena,
-rerun protocol, LOS audit, blind context, and the three behavior suites. Expect
-zero failures; 30 new fixtures; 20 v2 second-family fixtures; cardinalities
-480/660/240/330; arena 8 labels; rerun 5 protocols; audit 93 rows; blind report
-63 cases. Run both typechecks and `git diff --check` last. Re-run frozen
-inventories and require byte identity for v1/v5/6203/6206/6207. Confirm no
-`--terrain-profile`, no new D466 override, no skip/todo, and no changes outside
-the union of Allowed files.
+None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
+procedure; it is not an implementation-time choice.
 
-The supervisor then performs the separate untruncated full landing gate and
-review required by D643. Any deterministic red outside this plan is a finding,
-not a re-pin.
+## Round 2 disposition
 
-## Open questions for the owner
+- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
+  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
+- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
+  underscore forms, records actual output/status, classifies reservations, reserves all three
+  families together, and requires Allowed-file amendment before a replacement generation.
+- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
+  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
+- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
+  and 52 = 18 existing + 34 new.
+- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
+  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
+  derivations after WALL-01.
 
-None; D642/D643 resolve geometry, cohorts, versions, routes, behavior, and cap.
-COHORT-01 PLAN DONE
+COHORT-01 PLAN R2 DONE

tokens used
399,108
Revised [COHORT-01 implementation plan r2](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md). It is 373 lines, covers all Astra findings, and retains the 52-path scope.

COHORT-01 PLAN R2 DONE
