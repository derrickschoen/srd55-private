
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: medium
reasoning summaries: none
session id: 01a0a642-35a1-7082-aba2-eda56ea291c1
--------
user
RULES (binding): You are the REVIEWER (gpt-6-astra, MEDIUM per D627, resumed — the session that reviewed every VIS-FIELD batch and LAND-01..04). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-ab — a DETACHED clean checkout at bc6422bf (NOTE: history was rewritten tonight, D649: 807d2e3c is now e86a4d26; bc6422bf = e86a4d26 + WALL-01 candidate 6887755f + r3; node_modules symlinked). Sandbox read-only; in-memory when /tmp is read-only; no edits, no git writes, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; never port 4173; no full gate, full vitest, Playwright, build. Do not read sibling worktrees. MAIN repo /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static's .claude/decisions.md D641–D651 and .claude/consensus/vis-field/{impl-wall-01-sol.md,impl-wall-01-fix-r1-sol.md,impl-wall-01-fix-r2-sol.md,impl-wall-01-fix-r3-sol.md} readable — read D648 (my retracted false P1) and D651 first. Model calls WILL fail. Report exact commands and numbers; end with the named marker.

TASK: Review `git diff e86a4d26 bc6422bf` = WALL-01: (a) src/combat/cover.ts — the D642 solid-wall vertex rule: strict-interior lattice vertices of each corner ray enumerated by gcd; a vertex blocks sight when TL+BR or TR+BL are sight-blocking (queried on the fly through sightBlockingAt, no candidate bounding box); events merged with cell-interior and shared-edge (D635) hits by segment progress; pair pick lower row then lower column; endpoints excluded; physical cover tiers untouched; same path in coverTierBetweenObjects; (b) tests/unit/combat/visibility-field.test.ts — hand-authored witnesses (DIAGONAL_CRACK_SEALED, the single-blocker control, STAIRCASE_WALL_SEALED / MIRRORED / VERTICAL_STEP (per-ray), OUTER_FACE_GRAZE_STILL_CLEAR, SOLID_2x2, DIAGONAL_CORNER_TOUCH_SEALED_D642 replacing the SEAM batch's crack-open pin, PHYSICAL_COVER_UNCHANGED_BY_VERTEX); (c) r3 — four test scenes: scene-snapshot normalized under D569 (vertex (7,3) between wall (7,2) and door (6,3); fog +(8,3),(9,3); hashes re-pinned; state bytes/fingerprint unchanged), conversation helper blockers (9,1)/(9,5) → (8,1)/(8,5), the two R02 helpers' (9,2) → (8,2). Supervisor verification: baseline vs candidate on a FULL stepped wall (col 7 rows 0–3 + col 8 rows 4–7, Medium (13,4)→(1,4)): baseline leaks, candidate blocks (first (7,3)); tsc 0/0; vertex-null mutant → 5 sealed witnesses red and scene-snapshot red; 176/176 across the five scene suites + visibility-field + two-room-fixture; los-cover 110/112 (the two 5 s budget tests, perf, not re-pinned); pair 39 s; sol's counts: frozen-family offers/shotless unchanged (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36) and 42 generated rooms byte-identical.

CHECK (commands + numbers): (1) Geometry: is the vertex rule exactly the solid-wall model — interior of the union of closed blocking cells — and nothing more? Enumerate the cases: single-blocker corner touch (clear), outer-face graze (clear), two blockers sharing an edge with the ray along it (D635 blocked), diagonal pair (blocked), three/four blockers around a vertex (blocked via interior/pair), endpoint vertices (excluded — is that right when the SOURCE corner itself sits on a sealed vertex? construct it and say whether sight should pass), a ray through a vertex where the pair is TL+BR but the ray travels TR→BL (blocked — correct?). Rational-arithmetic enumeration as you did for the seam. (2) The gcd enumeration: exact for all integer corner pairs? Any float in the progress ordering that could misorder a vertex hit vs an interior hit at the same t (ties → lower row/column — deterministic and documented)? (3) Physical cover: prove the vertex path cannot raise the tier (by construction or mutant). (4) Performance: the earlier profile (D635.53) counted 4.17M firstSharedEdgeBlockingCell calls in los-cover; what does the vertex rule add per ray (gcd + up to 4 lookups per interior vertex)? Measure los-cover's productive-option test before/after if you can (5 s budget). (5) r3 derivations: recompute the scene-snapshot fog delta and confirm the three hashes follow from the fog change alone (encounter-state bytes unchanged); confirm (8,1)/(8,5) and (8,2) restore the original subjects WITHOUT creating a new diagonal pair, and that the original five opened pairs / Half + Three-Quarters tiers / two 90-ft shots are asserted, not merely "passes". (6) Anything in the diff that hides a consequence instead of deriving it; tsc 0/0; suites you can run; no fixture bytes changed.

OUTPUT: findings WALL-Fn with severity P1/P2/P3, file:line, evidence, fix; then exactly "VERDICT: ACCEPT" or "VERDICT: REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll read D648 and D651 first, then check the vertex geometry, physical-cover separation, and scene re-derivations with targeted probes.

exec
/bin/bash -lc "python3 - <<'PY'
s=open('/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md').read().splitlines()
for n in [648,651,642,643,644,645,646,647,649,650,641]:
 for i,l in enumerate(s):
  if l.startswith('## D'+str(n)+' '):
   j=i+1
   while j<len(s) and not s[j].startswith('## '):j+=1
   print('\\n'.join(s[i:j]))
PY
git diff --stat e86a4d26 bc6422bf
git diff e86a4d26 bc6422bf -- src/combat/cover.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
RETRACTION, at full length. In D645 I rejected WALL-01 as P1 on two grounds, both wrong: (1) I claimed the vertex map was built from the bounding-box-filtered `candidates`; it was built from `candidateEntries` — the UNFILTERED union of indexed sources and blocked cells — so no cell was ever excluded; (2) I read my probe's aggregate blocksSight=false for two isolated diagonal blockers as "the rule is inert", but blocksSight is true only when EVERY corner ray is blocked, and in that geometry the ray along the far face (y=5) is legitimately clear (a graze) — the aggregate false was CORRECT. The decisive test I should have run first: a FULL stepped wall (column 7 rows 0–3, column 8 rows 4–7), Medium tokens (13,4)→(1,4): baseline 807d2e3c leaks (false); ORIGINAL WALL-01 blocks (true, first (7,3)); fix r1 blocks (true). Verified by me tonight on the throwaway checkout, all three trees. So the original WALL-01 was correct; fix r1 replaced a correct precomputed map with equivalent on-the-fly lookups and added per-ray witnesses for my three geometries (valid per-ray, and the split-pair control) — harmless, kept as the candidate, but the "bbox regression" mutant sol reports is a restriction the original never had. Sol did not push back on a false P1; the brief told it what to find. Lesson recorded in memory (aggregate vs per-ray; read the code path before naming a cause).
REAL FINDING (WALL-F2, D642 consequence, not a defect): tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" is red with the vertex rule (8/8 on clean 807d2e3c): the two-room scene's derived fog gains cells (8,3) and (9,3) — a sealed diagonal crack now conceals two cells the party could previously see through. Sol's suite audit did not include scene-snapshot. Handling = D569 demonstrate-then-normalize exactly as B4/B2 did for this test (D635.5–.7: show the vertex, the ray, the two cells; then re-pin the persisted expectation and the revision checksum/fingerprint with the derivation). An UNTRUNCATED full vitest on the r1 candidate is running (full-vitest-wall-r1.log) to find every other consequence before the fix-r2 brief.
MY VERIFICATION of fix r1 otherwise (verify-wall-01-r1.log): tsc 0/0; diff-check 0; vertex-lookup-null mutant → 5 sealed witnesses red; suites 2150/2186 = the 35 known frozen/behaviour reds + scene-snapshot; los-cover 110/112 (the two 5 s budget timeouts, perf); pair 36/36 in 39 s.
PLAN r2 → astra r2 REJECT (saved review-plan-cohort-01-astra-r2.md): F1, F4 closed; F3 still open (astra ran the real planner: the base menu has two candidates not one, the selector key shape is wrong, and under sealed corners A keeps its shot by moving 25 ft to (8,3) so the mutated menu has three entries, not []); F2 partial (search must cover the whole 000–999 namespaces); F5 NEW (v2's ledger drops the five historical namespaces and the own-cohort handling); F6 NEW (membership silently became mandatory offense; 6203001 monsters 3/4 are Dash-only productive). The nine-candidate table verified correct under its stipulated responses. r3 = the final round (planner resumed; brief plan-cohort-01-r3.md; r2 archived).

## D651 — SUPERVISOR (2026-09-17 21:25): two correct BLOCKED stops ruled — WALL-01 fix r2's four scene subjects (test-scene edits approved) and COHORT-01 B1's v5 cap discontinuity (amendment N2; plan re-frozen at sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69, 403 lines)
WALL-01 fix r2 (sol fresh 01a0b20e-61fa…; saved impl-wall-01-fix-r2-sol.md; no files changed): all five reds are correct D642 consequences — (1) scene-snapshot: the wall cell (7,2) and the door (6,3) meet diagonally at vertex (7,3); the fighter's and wizard's last-clear row-3 rays (3,3)→(8,3), (2,3)→(9,3) become blocked; DM fog {(4,3)} → {(4,3),(8,3),(9,3)}; hashes derived (pendingRequestHash 78f31379… → 0ec0fbbc…, coordinatorHash f8fa0780… → 79b076c9…, revisionChecksum 35c96ecc… → 52305455…, fingerprint unchanged dd802783… since encounter-state bytes are unchanged); (2)(3) the conversation helper's re-authored blockers (9,1)/(9,5) now seal with (10,2)/(10,6) and the five opened pairs vanish; (4)(5) the R02 helpers' re-authored blocker (9,2) seals with (10,3) at vertex (10,3): the R02 row becomes HIDDEN and the first Scout's 90-ft shot becomes illegal. Sol stopped per the brief and proposed minimal scene edits: (9,1)/(9,5) → (8,1)/(8,5) and (9,2) → (8,2), temporarily proven (4/4) and restored. RULING: apply the scene-snapshot normalization under D569 (as B4/B2) and the two scene edits with derivations; test files only. Dispatched fix r3 (resume 01a0b20e-61fa…; brief impl-vis-field-wall-01-fix-r3.md).
COHORT-01 B1 (sol 01a0b20e-61fb…; saved impl-b1-sol.md; three allowed files, 176+/13−): second-family validator now a strict v1/v2 union with raw-byte hashing before a legacy projection that drops only the committed own foggedCells key; 20/20 single-key structural diffs; 50/50 second-family (47 historical violations → 0); five mutants killed; V-freeze 32/32 hashes identical; tsc 0/0. BLOCKED correctly: d569-v5.test.ts still fails at collection — now on "Registered context caps mismatch" (tools/d569-v5/validate-first-arm.ts:369): the v5 manifest registers caps.semanticBytes 8192 (engine-server SEMANTIC_BOARD_MAX_BYTES, unchanged by B6) while rows produced by today's live blind runner carry 32,768 (D643). VERIFIED BY ME (test run + guard read). RULING N2 (appended to the plan, all copies): manifest-declared caps are the cell caps, version-aware (v5 = 8192 history; v6 = 32768); the v5 test stays historical and PINS the refusal of live rows under today's runner (no skip, no relaxed cap); v6's active test validates at 32,768; mutants both ways. Dispatched B1 fix r1 (resume 01a0b20e-61fb…). PARKED for the owner (design): making the blind runner take its semantic cap from the experiment manifest end-to-end would let historical experiments dry-run as registered; not in COHORT-01.

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

## D647 — SUPERVISOR (2026-09-17 20:22): WALL-01 fix r1 harvested (sol; saved impl-wall-01-fix-r1-sol.md) — my verification running on the throwaway checkout; COHORT-01 plan r2 harvested (sha 4f3385b4…, 373 lines; r1 archived) — astra r2 (HIGH, resumed) running
SOL fix r1: vertex lookup now queries sightBlockingAt directly around each GCD-enumerated interior lattice vertex (no candidate bbox), also on the coverTierBetweenObjects path; the three axis witnesses (my geometries: first cells (7,3) / (8,3) / (4,2)) + split control; 46/46; four mutants incl. the bbox-regression one (exactly the three axis witnesses red); counts table unchanged before/after (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36 — now with a working rule); 42 seeds byte-identical (aggregate 7b884bf9…); pair 39.1 s; the 35 frozen/behaviour reds unchanged; four los-cover 5 s budget timeouts under the combined audit (110/112 isolated with two) — perf, not re-pinned. MY VERIFICATION (verify-wall-01-r1.log; ../dnd-wt-seam-ab reset to 807d2e3c + patch): tsc, my seven-case probe (A/B/C/D must block, E split pair / F outer-face graze / G single corner must stay clear), a vertex-lookup-null mutant, the suites, los-cover alone, pair.
PLAN r2 disposition (planner): F1 → separately pinned outer-v6 identity in session keys/cells/rows/matching, v5 preserved, v5 hard rows rejected; F2 → pre-Batch-2 gate against MAIN decisions, plain/xxx/underscore forms, verbatim output, reservations classified, three families reserved together, Allowed-file amendment before replacement generation; F3 → fixed two-proposal integration scene + nine-candidate hand table (radii, paths, scores, byte tie order, excluded ninth, exact seam mutation); F4 → counts fixed; canonical regeneration required for active v6; rejection witnesses for non-fog differences and legacy keys in v2. Astra r2 told to verify the F3 hand table itself.

## D649 — OWNER (2026-09-17 20:56): "Purge now with filter-repo, force-push the mirror, recreate the four worktrees from the rewritten main" — DONE in place (purge.log)
Inventory before acting: 136 worktrees (not four; 9 dirty, mostly stale lanes), remote `mirror` = github.com/derrickschoen/srd55-private, git-filter-repo 2.47.0, the blob .tmp-lane-4b.log = 68,500,144 bytes introduced at 2ba5adba and untracked at bade7b57; 28 other .tmp-*.log blobs (~115 MB) remain in history — NOT purged (scope = the owner's named file; a second in-place rewrite is cheap). Deviation from the option text, deliberately: no worktree was deleted or recreated — filter-repo rewrote refs in place, branch-attached worktrees follow their branches (identical trees), and the 16 detached worktrees were remapped through .git/filter-repo/commit-map with update-ref --no-deref HEAD; nothing uncommitted anywhere was touched. Preflight: no codex/vitest readers; dry run 4634 commits OK; refs (174) and detached HEADs snapshotted; the WALL-01 r1 candidate committed on claude/vis-field (7acb936d → 6887755f after rewrite) and the records committed on main (0847602b → 3be26bd8) so nothing sat uncommitted. RESULT: main tree 524f110d… identical before and after; refs 174/174; blob occurrences 1 → 0; pack 67.6 MiB (one pack, 56,225 objects); `git push --force mirror main`: 9f148666...3be26bd8 (forced update); ls-remote main = local main. KEY SHA TRANSLATIONS (old → new; the full 4635-line map is committed at .claude/consensus/purge-2026-09-17-commit-map.txt): 9f148666 -> 29a7d2e2; 0847602b -> 3be26bd8; 807d2e3c -> e86a4d26; 9a220fce -> 213f9a7e; 61dd454e -> 8352aed5; ebfcacaa -> 34c564f0; 10cc9f5e -> 30403378; 5492f782 -> e143e899; 9a3235da -> 33aa146c; 78ee31b0 -> bf85fb89; dcca84fd -> a46eea99; 1d58ef72 -> 9407dfa8; 7acb936d -> 6887755f; 4a99570d -> 495d9eb2; 75c2f44a -> df694f93. Every decision written before this entry cites OLD ids; translate through the map.

## D650 — SUPERVISOR (2026-09-17 21:08): COHORT-01 plan ACCEPTED WITH AMENDMENT by astra r3 (HIGH, final round) — FROZEN at sha256 2b931ed857e6019fa515b387cb7c2262e8e04a4bd3c7b8690472a7adf4f6e802 (399 lines incl. binding note N1); Batch 1 dispatched on a new worktree; WALL-01 fix r2 re-dispatched after a sol capacity outage
ASTRA r3 (saved review-plan-cohort-01-astra-r3.md): F2 closed (all three namespace commands re-run verbatim, statuses 0/1/0, 1,000/1,000 plain and underscore seeds per namespace + the xxx form); F5 closed (ten-namespace union, own-cohort exceptions, remove-any-row tests, the 6204 mutant); F6 closed (positive movement stays productive; Dash-only witness + movement-arm mutant; sight/cover only on targeted offensive components); F1/F4 closed; counts 3/3/10/10/10/8/4/4/3/1 = 52 paths. F3 resolved by AMENDMENT: with the typed zero-speed effect alone the real planner still offers A a 25-ft move to (8,3) + Longbow (attack declarations read subject.profile.rules.speed, offer-declarations.ts:431–465); with the profile's rules.speed also feet(0) the real planner + an in-memory D642 reference gives base = Longbow ×2 + Dodge with adjacency/visibility keys scoring 60/60 and, with (8,4) added, Dodge/Dodge and menu [] — and removing corner sealing restores the Longbow and the two-entry menu. N1 (appended verbatim to the plan, all copies): construct A with rules.speed feet(0), keep the effect, assert declared and effective speed zero, preserve the exact labels/keys/scores/menus, two mutants (speed 30 restored; sealing disabled), re-verify against accepted WALL-01; test-file only. Plan copies: .tmp-plans (main), ../dnd-wt-seam-verify, ../dnd-wt-cohort-01, ../dnd-wt-vis-field.
OUTAGE: the first WALL-01 fix r2 lane died with "Selected model is at capacity" + "thread … not found" before editing (worktree clean); probes SOL-OK / TERRA-OK at 21:10; re-dispatched FRESH on sol (log impl-wall-01-fix-r2b.log). Per the routing rule the next sol failure on this scope goes to Terra xhigh.
COHORT-01 B1 (validator normalization; not gated on WALL-01): new worktree ../dnd-wt-cohort-01 = branch claude/cohort-01 from 6887755f (node_modules symlinked, plan copied); fresh sol; brief .tmp/runs/cohort-01/impl-cohort-01-b1.md; log impl-b1.log; consensus dir .claude/consensus/cohort-01/. Generation batches (3–5) stay gated on WALL-01's acceptance; the cohort branch merges into claude/vis-field once both are accepted.

## D641 — OWNER (2026-09-17 18:48): "I think we need to model that a wall is solid across cells. It is not just a series of cells. Look for how others have handled this." — research done by the supervisor; question put back to the owner
PROBED BY ME on 807d2e3c (traceTerrainLine, 6x6 board): (1) two blockers touching only at a corner, (2,1)&(1,2), observer (0,0) → target (3,3) through the shared vertex: tier half, blocksSight FALSE — the diagonal crack lets sight through; (2) solid 2x2 block: total, TRUE; (3) wall column with the ray along its face-line between two blockers (the D635 seam): half, TRUE; (4) a ray grazing one blocker's corner: none, FALSE. So today's tracer = closed cells whose interiors block + the D635 shared-EDGE rule; shared CORNERS of diagonally touching blockers are still open.
HOW OTHERS DO IT (sources in the reply): D&D 2014 DMG corner trace — lines from a corner to the target's corners; whether a line that merely TOUCHES an obstacle counts is explicitly the DM's call (the SRD 5.2.1 only defines cover degrees by "covers at least half / three-quarters / the whole target"); Gloomhaven — corner-to-corner lines, and "the line cannot touch or cross a wall at any point; touching the very edge of a wall still means no LOS" (walls are closed sets; touching = blocked); Foundry VTT / Roll20 — walls are SEGMENTS with endpoints (thin walls), not cells, so no cell seams exist and a long wall is one solid segment by construction; roguelikes (Red Blob "thin wall FOV", Adam Milazzo's survey, Albert Ford's symmetric shadowcasting, RogueBasin comparative study) — "thick walls" (blocking cells) vs "thin walls" (blocking edges) is the standard framing, and diagonal-gap peeking between corner-touching blockers is a known nuisance that implementations bevel or seal; Debenham & Solis-Oba, "New Algorithms for Computing Field of Vision over 2D Grids" (arXiv 2101.11002) — "adjacent vision blocking cells are first grouped together into rectilinear regions, then split into a minimal number of rectangles", and their Figure 5 is exactly our seam: two adjacent rectangles let a ray slip along the shared side, which they fix by extending one rectangle to overlap the other so the union is solid.
PROPOSAL (to the owner, one question): adopt a SOLID-WALL model — the wall is the union of sight-blocking cells as closed rectilinear regions; a ray is blocked iff it passes through the union's interior, which includes (a) any blocking cell's interior, (b) an edge shared by two blockers (D635, already in), and (c) a vertex shared by two diagonally touching blockers (seal the crack; NOT in today). Grazing an OUTER face or a single blocker's corner stays open (DMG-consistent, today's behaviour). Implementation: step 1 a local vertex rule beside firstSharedEdgeBlockingCell in cover.ts with witnesses for all four probe cases (small, rules-visible, needs its own D-ruling and astra review; lands with VIS-FIELD); step 2 the precomputed rectilinear-region/rectangle representation keyed by the blocking topology (the paper's approach) as the VIS-FIELD-PERF batch (also perf fix #3 in D635.53). Question 5 stays: regenerate the cohorts under the solid-wall geometry (A1).

 src/combat/cover.ts                           | 121 +++++++++++++--
 tests/unit/combat/visibility-field.test.ts    | 207 +++++++++++++++++++++++++-
 tests/unit/tools/ai-dm-conversation.test.ts   |  22 ++-
 tests/unit/vtt/dm-tactical-intel.test.ts      |  14 +-
 tests/unit/vtt/scene-snapshot.test.ts         |  58 ++++++--
 tests/unit/vtt/tactical-evaluator-r02.test.ts |  14 +-
 6 files changed, 387 insertions(+), 49 deletions(-)
diff --git a/src/combat/cover.ts b/src/combat/cover.ts
index f8af9c60..52e68ffc 100644
--- a/src/combat/cover.ts
+++ b/src/combat/cover.ts
@@ -301,11 +301,16 @@ function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainL
     .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
 }
 
-function firstSharedEdgeBlockingCell(
+interface SightBlockingHit {
+  readonly cell: GridCell;
+  readonly progress: number;
+}
+
+function firstSharedEdgeBlockingHit(
   from: CornerPoint,
   to: CornerPoint,
   sightBlockingAt: (cell: GridCell) => boolean,
-): GridCell | null {
+): SightBlockingHit | null {
   if (from.row === to.row && Number.isInteger(from.row)) {
     const direction = from.column < to.column ? 1 : -1;
     for (
@@ -316,7 +321,10 @@ function firstSharedEdgeBlockingCell(
       const upper = { column, row: from.row - 1 };
       const lower = { column, row: from.row };
       // Deterministic pair choice: the flanking cell with the lower row wins.
-      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;
+      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {
+        const entryColumn = direction === 1 ? column : column + 1;
+        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };
+      }
     }
   }
   if (from.column === to.column && Number.isInteger(from.column)) {
@@ -329,12 +337,95 @@ function firstSharedEdgeBlockingCell(
       const left = { column: from.column - 1, row };
       const right = { column: from.column, row };
       // Deterministic pair choice: the flanking cell with the lower column wins.
-      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;
+      if (sightBlockingAt(left) && sightBlockingAt(right)) {
+        const entryRow = direction === 1 ? row : row + 1;
+        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };
+      }
+    }
+  }
+  return null;
+}
+
+function greatestCommonDivisor(left: number, right: number): number {
+  let dividend = Math.abs(left);
+  let divisor = Math.abs(right);
+  while (divisor !== 0) {
+    const remainder = dividend % divisor;
+    dividend = divisor;
+    divisor = remainder;
+  }
+  return dividend;
+}
+
+function firstSharedVertexBlockingHit(
+  from: CornerPoint,
+  to: CornerPoint,
+  sightBlockingAt: (cell: GridCell) => boolean,
+): SightBlockingHit | null {
+  if (![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;
+  const columnDelta = to.column - from.column;
+  const rowDelta = to.row - from.row;
+  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);
+  if (latticeSteps <= 1) return null;
+  const columnStep = columnDelta / latticeSteps;
+  const rowStep = rowDelta / latticeSteps;
+  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.
+  for (let index = 1; index < latticeSteps; index += 1) {
+    const column = from.column + columnStep * index;
+    const row = from.row + rowStep * index;
+    const topLeft = { column: column - 1, row: row - 1 };
+    const topRight = { column, row: row - 1 };
+    // Check TL/BR first so lower row then lower column wins when both pairs seal.
+    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {
+      return { cell: topLeft, progress: index / latticeSteps };
+    }
+    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {
+      return { cell: topRight, progress: index / latticeSteps };
     }
   }
   return null;
 }
 
+function cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
+  let entry = 0;
+  const columnDelta = to.column - from.column;
+  if (columnDelta !== 0) {
+    entry = Math.max(entry, Math.min(
+      (cell.column - from.column) / columnDelta,
+      (cell.column + 1 - from.column) / columnDelta,
+    ));
+  }
+  const rowDelta = to.row - from.row;
+  if (rowDelta !== 0) {
+    entry = Math.max(entry, Math.min(
+      (cell.row - from.row) / rowDelta,
+      (cell.row + 1 - from.row) / rowDelta,
+    ));
+  }
+  return entry;
+}
+
+function firstSightBlockingCell(
+  from: CornerPoint,
+  to: CornerPoint,
+  interveningCells: readonly GridCell[],
+  sightBlockingAt: (cell: GridCell) => boolean,
+): GridCell | null {
+  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);
+  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
+  if (vertex !== null && (first === null || vertex.progress < first.progress ||
+    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
+  for (const cell of interveningCells) {
+    if (!sightBlockingAt(cell)) continue;
+    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };
+    if (first === null || hit.progress < first.progress ||
+      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;
+  }
+  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.
+  // Simultaneous events use lower row, then lower column.
+  return first === null ? null : { ...first.cell };
+}
+
 function traceCornerLine(
   from: CornerPoint,
   to: CornerPoint,
@@ -345,11 +436,13 @@ function traceCornerLine(
   const interveningCells = rasterizeCornerLine(from, to, candidates);
   let tier: CoverTier = 'none';
   let strongest: TerrainLineSource[] = [];
-  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);
+  const firstBlockingCell = firstSightBlockingCell(
+    from,
+    to,
+    interveningCells,
+    sightBlockingAt,
+  );
   for (const cell of interveningCells) {
-    if (sightBlockingAt(cell) && firstBlockingCell === null) {
-      firstBlockingCell = { ...cell };
-    }
     for (const source of sourcesAt(cell)) {
       const comparison = coverRank(source.tier) - coverRank(tier);
       if (comparison > 0) {
@@ -509,13 +602,15 @@ function traceSpaces(
       entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
       entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
     .map((entry) => entry.cell);
-  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));
+  const sightBlockingKeys = new Set([
+    ...sightBlockingCells.map(cellKey),
+    ...[...indexedSources]
+      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))
+      .map(([key]) => key),
+  ]);
   const sightBlockingAt = (cell: GridCell): boolean => {
     const key = cellKey(cell);
-    return !exclusions.has(key) && (
-      sightBlockingKeys.has(key) ||
-      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)
-    );
+    return !exclusions.has(key) && sightBlockingKeys.has(key);
   };
   const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
     sourceCorner,

context compacted
exec
/bin/bash -lc 'git status --short; git rev-parse HEAD; sha256sum src/combat/cover.ts; git diff e86a4d26 bc6422bf -- tests/unit/tools/ai-dm-conversation.test.ts tests/unit/vtt/dm-tactical-intel.test.ts tests/unit/vtt/tactical-evaluator-r02.test.ts; tail -65 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/impl-wall-01-fix-r3-sol.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
bc6422bf3e729008568129dd491d38a2df2ed532
e8e97592b4dad1a755a978706d83d2f9953fe9f2dd66339c816fc29f7abc616b  src/combat/cover.ts
diff --git a/tests/unit/tools/ai-dm-conversation.test.ts b/tests/unit/tools/ai-dm-conversation.test.ts
index 8aa01d5b..884746c3 100644
--- a/tests/unit/tools/ai-dm-conversation.test.ts
+++ b/tests/unit/tools/ai-dm-conversation.test.ts
@@ -228,16 +228,24 @@ function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterSta
     ...state,
     blockedCells: state.blockedCells.map((cell) =>
       cell.column === 10 && seamRows.has(cell.row)
-        ? { column: 9, row: cell.row }
+        ? { column: 8, row: cell.row }
         : cell),
   };
-  // Each move opens its targeted seam and every ray through the old cell interior.
+  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
+  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
+  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
+  // diagonal pair at either vertex and opens the intended rays without closing any pair.
   // Representative changed rays, with t from source to target:
-  // m1->Fighter (19,2)->(1,2): (10,1)/(10,2) seam, 4/9<t<1/2.
-  // m2->Fighter (13,2)->(1,2): (10,1)/(10,2) seam, 1/6<t<1/4.
-  // m2->Cleric (14,1)->(2,4): (10,1) interior, 1/4<t<1/3.
-  // m5->Wizard (19,6)->(1,6): (10,5)/(10,6) seam, 4/9<t<1/2.
-  // m6->Wizard (18,6)->(1,6): (10,5)/(10,6) seam, 7/17<t<8/17.
+  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
+  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
+  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
+  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
+  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
+    { column: 8, row: 1 },
+    { column: 8, row: 5 },
+  ]));
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
+  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
   pinMonsterPlayerVisibilityDelta(state, reauthored, [
     'combatant:generated-5117009-monster-1->combatant:fighter',
     'combatant:generated-5117009-monster-2->combatant:fighter',
diff --git a/tests/unit/vtt/dm-tactical-intel.test.ts b/tests/unit/vtt/dm-tactical-intel.test.ts
index 1f8809d1..9dfccf75 100644
--- a/tests/unit/vtt/dm-tactical-intel.test.ts
+++ b/tests/unit/vtt/dm-tactical-intel.test.ts
@@ -33,7 +33,7 @@ function reauthoredClearScoutShot(state: EncounterState): EncounterState {
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -77,10 +77,12 @@ describe('versioned DM tactical intel', () => {
     });
     const capsule = runtime.feed.current();
     // Pre-D635, the Scout at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // the edge shared by plain blocked cells (10,2) and (10,3). Moving (10,2) one
-    // cell left to (9,2) opens one side of that edge while preserving the 90-foot
-    // distance, Half Cover geometry, straight roll, and target-specific intel purpose.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // the edge shared by plain blocked cells (10,2) and (10,3). D635 first moved (10,2)
+    // to (9,2), but D642 seals its diagonal contact with (10,3) at vertex (10,3),
+    // blocking the last-clear (19,3)->(1,3)/(2,3) rays. Moving it to (8,2) removes
+    // that pair while preserving 90 feet, Half Cover, straight roll, and this intel subject.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const context = fullContext(runtime, capsule);
     const actors = context['actors'];
@@ -118,10 +120,12 @@ describe('versioned DM tactical intel', () => {
       sourceCorner: trace.sourceCorner,
       lineTiers: trace.lines.map((line) => line.tier),
       coverTier: trace.tier,
+      blocksSight: trace.blocksSight,
     }).toEqual({
       sourceCorner: { column: 19, row: 3 },
       lineTiers: ['total', 'total', 'none', 'none'],
       coverTier: 'half',
+      blocksSight: false,
     });
     expect(fighterRow).toMatchObject({
       target_id: FIGHTER,
diff --git a/tests/unit/vtt/tactical-evaluator-r02.test.ts b/tests/unit/vtt/tactical-evaluator-r02.test.ts
index 131cfac1..9d51affd 100644
--- a/tests/unit/vtt/tactical-evaluator-r02.test.ts
+++ b/tests/unit/vtt/tactical-evaluator-r02.test.ts
@@ -81,7 +81,7 @@ function reauthoredClearScoutShot(state: EncounterState): EncounterState {
   return {
     ...state,
     blockedCells: state.blockedCells.map((cell) => cell.column === 10 && cell.row === 2
-      ? { column: 9, row: 2 }
+      ? { column: 8, row: 2 }
       : cell),
   };
 }
@@ -90,10 +90,12 @@ describe('R02-like canonical tactical query', () => {
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@ describe('R02-like canonical tactical query', () => {
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,
   };
 }
@@ -90,10 +90,12 @@
   it('reports both 90-foot Scout shots as move-0 normal range and straight at the dying fighter', async () => {
     const state = reauthoredClearScoutShot(await frozenState());
     // Pre-D635, Scout 3 at (19,3) saw the fighter at (1,3) along (19,3)->(1,3),
-    // which follows row 3 between blocked cells (10,2) and (10,3). The seam rule
-    // correctly blocks that ray. Moving only (10,2) one cell left to (9,2) leaves
-    // (10,2) open, so the row-3 ray is now a one-sided graze and the intended shot is clear.
-    expect(state.blockedCells).toContainEqual({ column: 9, row: 2 });
+    // which follows row 3 between blocked cells (10,2) and (10,3). D635 first moved
+    // (10,2) to (9,2), but D642 seals that cell's diagonal contact with (10,3) at
+    // vertex (10,3), blocking (19,3)->(1,3)/(2,3). Moving it to (8,2) removes the
+    // diagonal pair while preserving Half / Three-Quarters cover and both 90-foot shots.
+    expect(state.blockedCells).toContainEqual({ column: 8, row: 2 });
+    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
     expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
     const handGeometry = [
       {
@@ -135,10 +137,12 @@
         sourceCorner: trace.sourceCorner,
         lineTiers: trace.lines.map((line) => line.tier),
         coverTier: trace.tier,
+        blocksSight: trace.blocksSight,
       }).toEqual({
         sourceCorner: geometry.sourceCorner,
         lineTiers: geometry.lineTiers,
         coverTier: geometry.coverTier,
+        blocksSight: false,
       });
       return {
         scoutId,

tokens used
211,826
Applied D651 as test-scene changes only; production code is unchanged.

| Test | Applied derivation |
|---|---|
| Scene snapshot | Vertex `(7,3)` is sealed by blocker `(7,2)` and door `(6,3)`. Last-clear rays `(3,3)→(8,3)` and `(2,3)→(9,3)` now block. DM fog gains `(8,3),(9,3)`; fighter concealment also gains `(8,2),(9,2),(8,3),(9,3)`. All three hashes were re-pinned with full old/new values. Encounter-state bytes and fingerprint `dd802783…46a` are explicitly unchanged. Negative controls remain. |
| Blocked auto-submit | Moved helper blockers `(9,1)/(9,5)` to `(8,1)/(8,5)`. This removes diagonal contacts with `(10,2)/(10,6)` at vertices `(10,2)/(10,6)`. The exact original five visibility openings and zero closures remain asserted. |
| Unresolved frontier | Uses the same corrected helper geometry; the frontier and `sim_controller` subject are restored. |
| DM tactical intel | Moved `(9,2)` to `(8,2)`, removing the `(9,2)/(10,3)` diagonal pair at `(10,3)`. The two row-3 rays are clear again; Half Cover and `blocksSight:false` are explicit. |
| Tactical evaluator | Same scene correction. Both 90-foot shots remain legal with explicit Half and Three-Quarters tiers and `blocksSight:false`. |

Touched files:

- [ai-dm-conversation.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-conversation.test.ts)
- [dm-tactical-intel.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/dm-tactical-intel.test.ts)
- [scene-snapshot.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/scene-snapshot.test.ts)
- [tactical-evaluator-r02.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/vtt/tactical-evaluator-r02.test.ts)

Verification:

- Five corrected cases: **5/5 passed**, 121 skipped.
- Visibility field: **46/46 passed**.
- LOS cover: **110/112 passed**. Unchanged budget tests timed out at:
  - `M576-E2-WALL-SEALS-ROOM`: **5.177 s**
  - productive first-turn option: **5.400 s**
- `tsconfig.app.json`: exit 0.
- `tsconfig.node.json`: exit 0.
- `git diff --check`: exit 0.
- `git status --short`: exactly the four test files above.

WALL-01-FIX-R3 DONE

exec
/bin/bash -lc "nl -ba src/combat/cover.ts | sed -n '300,470p'; sed -n '1,100p' tests/unit/combat/visibility-field.test.ts; rg -n 'DIAGONAL|ENDPOINT|endpoint|PHYSICAL|traceTerrain|traceCombatant' tests/unit/combat/visibility-field.test.ts; git diff e86a4d26 bc6422bf -- tests/unit/vtt/scene-snapshot.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
   300	      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
   301	    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
   302	}
   303	
   304	interface SightBlockingHit {
   305	  readonly cell: GridCell;
   306	  readonly progress: number;
   307	}
   308	
   309	function firstSharedEdgeBlockingHit(
   310	  from: CornerPoint,
   311	  to: CornerPoint,
   312	  sightBlockingAt: (cell: GridCell) => boolean,
   313	): SightBlockingHit | null {
   314	  if (from.row === to.row && Number.isInteger(from.row)) {
   315	    const direction = from.column < to.column ? 1 : -1;
   316	    for (
   317	      let column = direction === 1 ? from.column : from.column - 1;
   318	      direction === 1 ? column < to.column : column >= to.column;
   319	      column += direction
   320	    ) {
   321	      const upper = { column, row: from.row - 1 };
   322	      const lower = { column, row: from.row };
   323	      // Deterministic pair choice: the flanking cell with the lower row wins.
   324	      if (sightBlockingAt(upper) && sightBlockingAt(lower)) {
   325	        const entryColumn = direction === 1 ? column : column + 1;
   326	        return { cell: upper, progress: (entryColumn - from.column) / (to.column - from.column) };
   327	      }
   328	    }
   329	  }
   330	  if (from.column === to.column && Number.isInteger(from.column)) {
   331	    const direction = from.row < to.row ? 1 : -1;
   332	    for (
   333	      let row = direction === 1 ? from.row : from.row - 1;
   334	      direction === 1 ? row < to.row : row >= to.row;
   335	      row += direction
   336	    ) {
   337	      const left = { column: from.column - 1, row };
   338	      const right = { column: from.column, row };
   339	      // Deterministic pair choice: the flanking cell with the lower column wins.
   340	      if (sightBlockingAt(left) && sightBlockingAt(right)) {
   341	        const entryRow = direction === 1 ? row : row + 1;
   342	        return { cell: left, progress: (entryRow - from.row) / (to.row - from.row) };
   343	      }
   344	    }
   345	  }
   346	  return null;
   347	}
   348	
   349	function greatestCommonDivisor(left: number, right: number): number {
   350	  let dividend = Math.abs(left);
   351	  let divisor = Math.abs(right);
   352	  while (divisor !== 0) {
   353	    const remainder = dividend % divisor;
   354	    dividend = divisor;
   355	    divisor = remainder;
   356	  }
   357	  return dividend;
   358	}
   359	
   360	function firstSharedVertexBlockingHit(
   361	  from: CornerPoint,
   362	  to: CornerPoint,
   363	  sightBlockingAt: (cell: GridCell) => boolean,
   364	): SightBlockingHit | null {
   365	  if (![from.column, from.row, to.column, to.row].every(Number.isInteger)) return null;
   366	  const columnDelta = to.column - from.column;
   367	  const rowDelta = to.row - from.row;
   368	  const latticeSteps = greatestCommonDivisor(columnDelta, rowDelta);
   369	  if (latticeSteps <= 1) return null;
   370	  const columnStep = columnDelta / latticeSteps;
   371	  const rowStep = rowDelta / latticeSteps;
   372	  // Indices exclude t=0 and t=1: endpoint vertices are governed only by cell-interior crossing.
   373	  for (let index = 1; index < latticeSteps; index += 1) {
   374	    const column = from.column + columnStep * index;
   375	    const row = from.row + rowStep * index;
   376	    const topLeft = { column: column - 1, row: row - 1 };
   377	    const topRight = { column, row: row - 1 };
   378	    // Check TL/BR first so lower row then lower column wins when both pairs seal.
   379	    if (sightBlockingAt(topLeft) && sightBlockingAt({ column, row })) {
   380	      return { cell: topLeft, progress: index / latticeSteps };
   381	    }
   382	    if (sightBlockingAt(topRight) && sightBlockingAt({ column: column - 1, row })) {
   383	      return { cell: topRight, progress: index / latticeSteps };
   384	    }
   385	  }
   386	  return null;
   387	}
   388	
   389	function cellInteriorEntryProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
   390	  let entry = 0;
   391	  const columnDelta = to.column - from.column;
   392	  if (columnDelta !== 0) {
   393	    entry = Math.max(entry, Math.min(
   394	      (cell.column - from.column) / columnDelta,
   395	      (cell.column + 1 - from.column) / columnDelta,
   396	    ));
   397	  }
   398	  const rowDelta = to.row - from.row;
   399	  if (rowDelta !== 0) {
   400	    entry = Math.max(entry, Math.min(
   401	      (cell.row - from.row) / rowDelta,
   402	      (cell.row + 1 - from.row) / rowDelta,
   403	    ));
   404	  }
   405	  return entry;
   406	}
   407	
   408	function firstSightBlockingCell(
   409	  from: CornerPoint,
   410	  to: CornerPoint,
   411	  interveningCells: readonly GridCell[],
   412	  sightBlockingAt: (cell: GridCell) => boolean,
   413	): GridCell | null {
   414	  let first = firstSharedEdgeBlockingHit(from, to, sightBlockingAt);
   415	  const vertex = firstSharedVertexBlockingHit(from, to, sightBlockingAt);
   416	  if (vertex !== null && (first === null || vertex.progress < first.progress ||
   417	    (vertex.progress === first.progress && compareCells(vertex.cell, first.cell) < 0))) first = vertex;
   418	  for (const cell of interveningCells) {
   419	    if (!sightBlockingAt(cell)) continue;
   420	    const hit = { cell, progress: cellInteriorEntryProgress(from, to, cell) };
   421	    if (first === null || hit.progress < first.progress ||
   422	      (hit.progress === first.progress && compareCells(hit.cell, first.cell) < 0)) first = hit;
   423	  }
   424	  // One traversal merges cell-interior, shared-edge and strict-interior-vertex events by segment progress.
   425	  // Simultaneous events use lower row, then lower column.
   426	  return first === null ? null : { ...first.cell };
   427	}
   428	
   429	function traceCornerLine(
   430	  from: CornerPoint,
   431	  to: CornerPoint,
   432	  candidates: readonly GridCell[],
   433	  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
   434	  sightBlockingAt: (cell: GridCell) => boolean,
   435	): TerrainCornerLineTrace {
   436	  const interveningCells = rasterizeCornerLine(from, to, candidates);
   437	  let tier: CoverTier = 'none';
   438	  let strongest: TerrainLineSource[] = [];
   439	  const firstBlockingCell = firstSightBlockingCell(
   440	    from,
   441	    to,
   442	    interveningCells,
   443	    sightBlockingAt,
   444	  );
   445	  for (const cell of interveningCells) {
   446	    for (const source of sourcesAt(cell)) {
   447	      const comparison = coverRank(source.tier) - coverRank(tier);
   448	      if (comparison > 0) {
   449	        tier = source.tier;
   450	        strongest = [source];
   451	      } else if (comparison === 0) {
   452	        strongest.push(source);
   453	      }
   454	    }
   455	  }
   456	  const sources = uniqueSources(strongest);
   457	  return {
   458	    targetCorner: { ...to },
   459	    interveningCells,
   460	    tier,
   461	    blocksSight: firstBlockingCell !== null,
   462	    sourceIds: sources.map(taggedSourceId),
   463	    sources,
   464	    firstBlockingCell,
   465	  };
   466	}
   467	
   468	const COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];
   469	
   470	function countTier(obstructedLineCount: number): CoverTier {
import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { combatToken } from '../../../src/combat/combatant';
import {
  rasterizeCornerLine,
  traceCombatantLineToCells,
  traceTerrainLine,
  type TerrainLineTrace,
} from '../../../src/combat/cover';
import {
  canCombatantSee,
  createEncounter,
  detectCombatant,
  passivePerceptionAgainst,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EffectApplication } from '../../../src/combat/effects';
import type { GridCell } from '../../../src/combat/grid';
import type { CombatSense } from '../../../src/combat/statblock';
import { feetPoint } from '../../../src/combat/templates';
import {
  armorClass,
  effectStackingIdentity,
  encounterEffectId,
  feet,
  worldObjectId,
} from '../../../src/combat/values';
import {
  cellsThatCanSee,
  sightToCreature,
  visibilityField,
  type VisibilityFieldCell,
} from '../../../src/combat/visibility-field';
import { placedToken, playerProfile } from './fixtures';

const EMPTY_ENVIRONMENT = {
  lightRegions: [],
  difficultTerrainRegions: [],
  movementRegions: [],
  obscurementRegions: [],
  narrowOpeningRegions: [],
} as const;

function withSenses(
  profile: CombatantProfile,
  senses: readonly CombatSense[],
): CombatantProfile {
  return { ...profile, rules: { ...profile.rules, senses } };
}

function normalProfile(key: string): CombatantProfile {
  return withSenses(playerProfile(key), [{ kind: 'normal_sight' }]);
}

function fieldState(
  observer: CombatantProfile,
  options: {
    readonly bounds?: { readonly columns: number; readonly rows: number };
    readonly position?: GridCell;
    readonly combatants?: readonly CombatantProfile[];
    readonly tokens?: readonly ReturnType<typeof placedToken>[];
    readonly blockedCells?: readonly GridCell[];
    readonly worldObjects?: EncounterState['worldObjects'];
    readonly environment?: EncounterState['environment'];
  } = {},
): EncounterState {
  return createEncounter({
    bounds: options.bounds ?? { columns: 5, rows: 3 },
    combatants: options.combatants ?? [observer],
    tokens: options.tokens ?? [combatToken(observer, options.position ?? { column: 0, row: 0 })],
    ...(options.blockedCells === undefined ? {} : { blockedCells: options.blockedCells }),
    ...(options.worldObjects === undefined ? {} : { worldObjects: options.worldObjects }),
    environment: options.environment ?? EMPTY_ENVIRONMENT,
  });
}

function seamState(wallAbove: boolean, doorBelow: boolean, blockedDoor = false): {
  readonly state: EncounterState;
  readonly observer: CombatantProfile;
  readonly subject: CombatantProfile;
} {
  const observer = normalProfile('seam-observer');
  const subject = normalProfile('seam-subject');
  const blockedCells = Array.from({ length: 8 }, (_unused, row) =>
    row === 4 && !blockedDoor ? null : { column: 5, row })
    .filter((cell): cell is GridCell => cell !== null)
    .filter((cell) => wallAbove || cell.row !== 3);
  const worldObjects: EncounterState['worldObjects'] = doorBelow
    ? [{
        id: worldObjectId('object:seam-door'),
        name: 'Seam Door',
        kind: 'door',
        position: { column: 5, row: 4 },
        footprint: [{ column: 5, row: 4 }],
        durability: { kind: 'indestructible' },
        armorClass: armorClass(10),
        damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' },
7:  traceCombatantLineToCells,
8:  traceTerrainLine,
1015:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
1032:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
1045:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
1054:  it('DIAGONAL_CRACK_SEALED', () => {
1064:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
1079:  it('DIAGONAL_CRACK_CONTROL_ONE_BLOCKER', () => {
1088:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
1112:    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
1134:    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
1155:    const trace = traceTerrainLine(state, { column: 5, row: 0 }, { column: 5, row: 6 });
1176:    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
1195:    const trace = traceTerrainLine(state, { column: 0, row: 2 }, { column: 4, row: 2 });
1215:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
1225:  it('DIAGONAL_CORNER_TOUCH_SEALED_D642', () => {
1231:    const trace = traceTerrainLine(
1252:  it('PHYSICAL_COVER_UNCHANGED_BY_VERTEX', () => {
1259:    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
1265:  it('PHYSICAL_COVER_UNCHANGED_BY_SEAM', () => {
1267:    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });
1306:      const omitted = traceTerrainLine(state, { column: 0, row: 0 }, entry.to);
1307:      const empty = traceTerrainLine(
1328:    const omittedLarge = traceCombatantLineToCells(
1333:    const emptyLarge = traceCombatantLineToCells(
1342:    const nonemptyFirst = traceTerrainLine(
1348:    const emptyMiddle = traceTerrainLine(
1354:    const nonemptyLast = traceTerrainLine(
1374:    const physical = traceTerrainLine(clearState, from, to);
1375:    const optical = traceTerrainLine(clearState, from, to, {
1392:    const sightOnly = traceTerrainLine(
1525:    expect(detectionPath).not.toContain('traceCombatantLine(');
1529:    expect(files.engineQuery).toContain('traceCombatantLine(');
1535:    expect(files.semantic).not.toContain('traceCombatantLine(');
diff --git a/tests/unit/vtt/scene-snapshot.test.ts b/tests/unit/vtt/scene-snapshot.test.ts
index 766f5d36..c7a8b722 100644
--- a/tests/unit/vtt/scene-snapshot.test.ts
+++ b/tests/unit/vtt/scene-snapshot.test.ts
@@ -95,12 +95,13 @@ interface PersistedByteBaseline {
   readonly pendingRequestHash: string;
   readonly coordinatorHash: string;
   readonly revisionChecksum: string;
+  readonly branchRngStateFingerprint: string;
 }
 
-function persistedRevisionChecksum(
+function persistedRevisionBaseline(
   state: ReturnType<typeof fixtureState>,
   coordinatorState: PersistedCoordinatorState,
-): string {
+): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
   const store = new MemoryBrowserSessionStore();
   const sessionId = encounterSessionId('session:handoff-persistence-baseline');
   EncounterSessionJournal.create({
@@ -115,7 +116,10 @@ function persistedRevisionChecksum(
   });
   const revision = store.revisions(sessionId)[0];
   if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
-  return revision.checksum;
+  return {
+    revisionChecksum: revision.checksum,
+    branchRngStateFingerprint: revision.branchRngStateFingerprint,
+  };
 }
 
 function persistedByteBaseline(
@@ -126,7 +130,7 @@ function persistedByteBaseline(
   return {
     pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
     coordinatorHash: sha256(canonicalJson(coordinatorState)),
-    revisionChecksum: persistedRevisionChecksum(state, coordinatorState),
+    ...persistedRevisionBaseline(state, coordinatorState),
   };
 }
 
@@ -226,6 +230,7 @@ describe('renderer-neutral scene snapshot', () => {
         legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
       },
     };
+    const encounterStateBytes = canonicalJson(state);
     const before = persistedByteBaseline(state, coordinator);
     const projection = projectPlayerBoard(view, coordinator);
     sceneSnapshot({
@@ -238,14 +243,24 @@ describe('renderer-neutral scene snapshot', () => {
     // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
     // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
     // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.
-    // Targets (7,3) and (8,3) remain visible via (3,3)->(7,3) and (3,3)->(8,3): row line 3 has
-    // the door below it at (6,3), but its other flank (6,2) is open, so D635 does not block it.
-    // Across the 10x7 board, the fighter (2,3), cleric (1,4), and wizard (1,2) reveal every
-    // cell except ordinary darkness at (4,3); the door/wall seam does not hide another cell
-    // from all three observers. Derived DM fog is therefore the literal 70 - 69 complement.
-    expect(projectDmView(state).state.foggedCells).toEqual([{ column: 4, row: 3 }]);
+    // D642 additionally seals lattice vertex (7,3), where blocked cell (7,2) and Oak Door
+    // (6,3) touch diagonally. The last clear row-3 rays include (3,3)->(8,3) and
+    // (2,3)->(9,3): each was tier none / blocksSight false / first null, and is now tier
+    // none / blocksSight true / first (7,2). Thus party-derived DM fog gains (8,3),(9,3).
+    // Fighter-only concealment also gains (8,2),(9,2), whose bottom-corner rays are the
+    // same sealed row-3 rays, plus (8,3),(9,3). Cell (7,3) remains visible because the
+    // sealing vertex is its target endpoint, which is excluded by the strict-interior rule.
+    expect(projectDmView(state).state.foggedCells).toEqual([
+      { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
+    ]);
     expect(view.concealedCells).toEqual([
+      { column: 8, row: 2 },
+      { column: 9, row: 2 },
       { column: 4, row: 3 },
+      { column: 8, row: 3 },
+      { column: 9, row: 3 },
       { column: 7, row: 4 },
       { column: 8, row: 4 },
       { column: 9, row: 4 },
@@ -259,11 +274,25 @@ describe('renderer-neutral scene snapshot', () => {
     // branch RNG fingerprint=163cf20067bebf7e70bb76d69b6f45a6123e51fdc409ba32a1b985b3f60b6a2b.
     // B2 removes the empty migration key and recomputes the fingerprint as
     // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
+    // Pre-D642 -> D642, derived directly from the hand-derived visibility sets above.
+    // pendingRequest:
+    // 78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049 ->
+    // 0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0.
+    // coordinator:
+    // f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66 ->
+    // 79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd.
+    // revision:
+    // 35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385 ->
+    // 52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8.
+    // Encounter-state bytes do not change, so the branch RNG state fingerprint remains
+    // dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a.
     expect(before).toEqual({
-      pendingRequestHash: '78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049',
-      coordinatorHash: 'f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66',
-      revisionChecksum: '35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385',
+      pendingRequestHash: '0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0',
+      coordinatorHash: '79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd',
+      revisionChecksum: '52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8',
+      branchRngStateFingerprint: 'dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a',
     });
+    expect(canonicalJson(state)).toBe(encounterStateBytes);
     expect(coordinator.pendingRequest).toMatchObject({
       kind: 'turn',
       requestId: 'request:handoff-baseline',
@@ -291,7 +320,8 @@ describe('renderer-neutral scene snapshot', () => {
     };
     expect(() => assertPersistedHandoffBytesUnchanged(before, state, enrichedCoordinator))
       .toThrow('PERSISTED_HANDOFF_BYTES_CHANGED');
-    expect(persistedRevisionChecksum(state, enrichedCoordinator)).not.toBe(before.revisionChecksum);
+    expect(persistedRevisionBaseline(state, enrichedCoordinator).revisionChecksum)
+      .not.toBe(before.revisionChecksum);
   });
 
   it('emits DM environment lights, exclusive door companions and no door cell wall union', () => {

exec
/bin/bash -lc 'for f in impl-wall-01-sol.md impl-wall-01-fix-r1-sol.md impl-wall-01-fix-r2-sol.md; do tail -45 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/vis-field/$f; done' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:

- `projects fresh options for every requested generated-room monster turn`
  - Cause: Scout has only Dodge/End Turn; the frozen Longbow options remain blocked by D635 geometry.

- `does not repeat the frozen Room-8 four-actor zero-feet Dash plan`
  - Cause: expected Dash movement remains Dodge at zero movement under the sealed D635 sightlines.

- `forms a bounded volatility-ranked menu from baseline dependencies and canonical movement proofs`
  - Cause: scenario menu remains empty under the frozen sightline geometry.

Two additional non-frozen findings, not repinned:

- `kills M576-E2-WALL-SEALS-ROOM for every living footprint size`: 5,054 ms against 5,000 ms.
- `retains a productive first-turn option for every living monster in the versioned basis`: 5,384 ms against 5,000 ms.

These are timeout-only; no assertion changed.

D630 command:

```bash
npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts
```

Result: 2 files, 36/36 passed; Vitest duration 38.57 s; wall 39.00 s, below the 41-second ceiling.

### Final verification

```bash
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
git diff --check
```

Results: app exit 0, node exit 0, diff-check exit 0, forbidden additions 0, lines over 120 characters 0.

Final status:

```text
 M src/combat/cover.ts
 M tests/unit/combat/visibility-field.test.ts
```

WALL-01 DONE
  tests/unit/tools/d569-blind-experiment.test.ts \
  tests/unit/tools/d569-second-family-manifest.test.ts \
  tests/unit/tools/ai-dm-screenshot-probe.test.ts
```

Result: 54 files, 46 passed / 8 failed; 2,247 tests passed / 39 failed; 113.54 wall seconds.

The unchanged 35 frozen/behavior reds were:

- Six `d569-blind-experiment` titles: “validates the exact v5…”, “dry-runs versioned…”, “adds exactly 180…”, “consumes the frozen second…”, “records exact model…”, and “rejects either decisive…”. Cause: `second_family_brutal_productivity`.
- `d569-second-family-manifest`: ledger pin plus seeds 6207002, 6207004–6207009. Cause: regeneration/productivity invariants.
- `arena-basis-brutal-b`: all seed-pin titles 6206001–6206010. Cause: no productive first-turn offer.
- `room-generator`: brutal seed titles 6203001–6203004, 6203006, and 6203008–6203010. Cause: `brutal_productivity`.
- `composite-turn-proposals`: “projects fresh options…”; Scout has only Dodge/End Turn.
- `engine-opportunity-movement-intel`: “does not repeat…”; three actors select zero-movement Dodge instead of Dash.
- `speculative-planning`: “forms a bounded…”; scenario menu is empty.

New non-frozen performance finding, not repinned: four fixed 5-second timeouts in the combined audit:

- `kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture`
- `kills M576-E2-WALL-SEALS-ROOM for every living footprint size`
- `retains a productive first-turn option for every living monster in the versioned basis`
- `kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side`

Isolated, that file reported 110/112 passed with the middle two timeouts, wall 112.32 seconds.

D630:

```text
npx vitest run --configLoader runner tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
```

Result: 2 files, 36/36 passed; wall 39.09 seconds, below the 41-second ceiling.

Final checks:

- `npx tsc -p tsconfig.app.json --noEmit` — exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` — exit 0.
- `git diff --check` — exit 0.
- Lines over 120 characters — 0.
- `git status --short` shows exactly:
  - `M src/combat/cover.ts`
  - `M tests/unit/combat/visibility-field.test.ts`

WALL-01-FIX-R1 DONE
WALL-01-FIX-R2 BLOCKED
tokens used
163,271
The vertex rule is correct, but four tests lose their intended subjects. Per the stop condition, I made no changes. The minimal scene edits below were temporarily proven, then fully restored.

| Test | Geometry and pre/post trace | Decision |
|---|---|---|
| `scene-snapshot` persisted bytes | Blockers: cell `(7,2)` and door `(6,3)`, diagonally meeting at vertex `(7,3)`. Fighter `(2,3)` and wizard `(1,2)` previously reached targets `(8,3)/(9,3)` along row-3 corner rays—for example `(3,3)→(8,3)` and `(2,3)→(9,3)`. Cleric `(1,4)` was already blocked by interiors. Each last-clear ray changes from `tier:none / blocksSight:false / first:null` to `tier:none / blocksSight:true / first:(7,2)`. | Correct D642 consequence. DM fog changes `{(4,3)}` → `{(4,3),(8,3),(9,3)}`. Fighter concealment additionally gains `(8,2),(9,2),(8,3),(9,3)`. No fixture generator owns this hand-authored state. Normalization was derived but not applied because later rows trigger the mandatory stop. |
| `blocked auto-submit` fallbackReason | The helper moves blockers `(10,1)→(9,1)` and `(10,5)→(9,5)`. Those now meet existing `(10,2)` and `(10,6)` diagonally at vertices `(10,2)` and `(10,6)`. Last-clear rays include `(19,2)→(1,2)`, `(13,2)→(1,2)`, `(14,1)→(2,4)`, `(19,6)→(1,6)`, and `(18,6)→(1,6)`. Each changes from `none/false/null` to `none/true/(9,1)` or `none/true/(9,5)`. | Correct D642 consequence, but the blocked-auto-submit subject disappears before execution: expected five opened pairs becomes `[]`. Requires scene re-authoring. |
| unresolved-frontier `sim_controller` | Same two vertices and five rays as above. The intended frontier-producing visibility openings are eliminated. | Correct D642 consequence, but the unresolved-frontier subject disappears. Requires the same scene re-authoring. |
| `dm-tactical-intel` R02 row | Scout `(19,3)` targets fighter `(1,2)`. Moving `(10,2)→(9,2)` created a diagonal pair with `(10,3)` at vertex `(10,3)`. Both formerly clear row-3 rays, `(19,3)→(1,3)` and `(19,3)→(2,3)`, change from `none/false/null` to `none/true/(9,2)`. Aggregate physical cover remains `half`, but optical sight changes clear→blocked, so the row becomes `HIDDEN`. | Correct D642 consequence, but the intended visible, non-nearest shot/reason row disappears. Requires scene re-authoring. |
| `tactical-evaluator-r02` two Scout shots | Same `(9,2)/(10,3)` pair at `(10,3)`. First Scout changes from `tier:half / blocksSight:false / first:null` to `half/true/(9,2)`; its reach becomes illegal and `minimumMovementFeet` becomes `null`. Second Scout `(19,5)` remains `three_quarters/false/null`. | Correct D642 consequence, but “both 90-foot Scout shots” is no longer true. Mandatory stop. |

Derived scene-snapshot normalization, not applied:

- `pendingRequestHash`: `78f31379…4049` → `0ec0fbbc…b8e0`
- `coordinatorHash`: `f8fa0780…9c66` → `79b076c9…36cd`
- `revisionChecksum`: `35c96ecc…0385` → `52305455…b3a8`
- `branchRngStateFingerprint`: remains `dd802783…46a`; encounter-state bytes did not change.

Minimal proposal:

- In both R02 helpers, move the re-authored blocker from `(9,2)` to `(8,2)`. This retains the original `half` and `three_quarters` cover tiers while restoring both 90-foot shots.
- In the conversation helper, move `(9,1)/(9,5)` to `(8,1)/(8,5)`. This restores exactly the original five opened monster→player pairs with zero closed pairs.

Temporary proof of that proposal: 3 files, 4 passed, 114 skipped; both conversation tests passed in 14.7 seconds each. All temporary edits were restored.

Verification:

- `npx tsc -p tsconfig.app.json --noEmit` — exit 0.
- `npx tsc -p tsconfig.node.json --noEmit` — exit 0.
- Current five-red reproduction — 5 failed, 121 skipped, exactly the five named failures.
- Visibility/LOS run — visibility-field 46/46; LOS 110/112. The two LOS 5-second tests also timed out alone at 5.29 and 5.55 seconds, so I did not classify them as load-only.
- `git diff --check` — exit 0.
- `git status --short` — empty; files touched: none.

Full-run timeouts treated as load-only and untouched:

- node-runtime WebSocket close-code case
- `M576-E2-COVER-OVERLAPS-SPAWN`
- `rejects a deleted committed spec discovered through the Git seam`
- `js-round-plan-integration`
- `vane-tpk-clean-terminates`

WALL-01-FIX-R2 BLOCKED

exec
/bin/bash -lc 'node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc 'node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_SEALED_ENDPOINT\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/combat/visibility-field.test.ts'))return code+\"\\nit('REVIEW_SEALED_ENDPOINT',()=>{\\nconst p=normalProfile('review');\\nconst state=fieldState(p,{bounds:{columns:5,rows:5},blockedCells:[{column:1,row:1},{column:2,row:2}]});\\nfor(const [from,to] of [[{column:2,row:1},{column:1,row:2}],[{column:2,row:1},{column:0,row:3}]]){\\nconst result=traceTerrainLine(state,from,to);\\nconsole.log('ENDPOINT',JSON.stringify({from,to,result}));\\nexpect(result.blocksSight).toBe(true);\\n}\\n});\";}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 exited 1 in 2887ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/combat/visibility-field.test.ts > REVIEW_SEALED_ENDPOINT
ENDPOINT {"from":{"column":2,"row":1},"to":{"column":1,"row":2},"result":{"sourceCell":{"column":2,"row":1},"targetCell":{"column":1,"row":2},"sourceCorner":{"column":2,"row":2},"lines":[{"targetCorner":{"column":1,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":1,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}}

ENDPOINT {"from":{"column":2,"row":1},"to":{"column":1,"row":2},"result":{"sourceCell":{"column":2,"row":1},"targetCell":{"column":1,"row":2},"sourceCorner":{"column":2,"row":2},"lines":[{"targetCorner":{"column":1,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":1,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}}

 ❯ tests/unit/combat/visibility-field.test.ts (47 tests | 1 failed | 46 skipped) 14ms
     ↓ DIM_LIGHT_RAW_GRADES keeps dim visible and darkness unseen for normal sight
     ↓ LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
     ↓ DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
     ↓ LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE
     ↓ UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN
     ↓ WALL_BLOCKS_TARGET_CELL using the existing corner tracer
     ↓ FOG_CLOUD_BLOCKS_BEYOND_TARGET through a concrete obscured-area effect
     ↓ MAGICAL_DARKNESS_SENSE_MATRIX distinguishes normal, darkvision, Devil's Sight, and truesight
     ↓ HEAVY_FOG_BLOCKS_TRUESIGHT at the target and on intervening rays
     ↓ SPECIAL_SENSE_RANGE_EDGES checks darkvision 60/65 and Devil's Sight 120/125 feet
     ↓ LARGE_OBSERVER_USES_BEST_CELL for range and target-cell tracing
     ↓ BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog
     ↓ BLINDSIGHT_SEES_THROUGH_HEAVY_FOG_IN_RANGE
     ↓ BLINDED_TREMORSENSE_REMAINS_LOCATED
     ↓ ANY_FOOTPRINT_CELL_VISIBLE makes a Large subject visible
     ↓ INVISIBLE_SUBJECT_RETAINS_TRANSPOSE_ELIGIBILITY
     ↓ DETECT_FIELD_ALL_PAIRS_AGREE on every ordered overlay-free fixture pair
     ↓ ALLY_CAST_DARKVISION_APPLIES and SENSE_EFFECT_MAX_RANGE_WINS
     ↓ SENSE_EFFECT_MERGE_IS_ORDER_INDEPENDENT for two darkvision grants
     ↓ INNATE_SENSE_NOT_SHORTENED_BY_EFFECT
     ↓ DEVILS_SIGHT_EFFECT_MERGE_IS_ORDER_INDEPENDENT
     ↓ ALWAYS_ON_DEVILS_SIGHT_FIXTURE_PC initializes a permanent 120-foot grant
     ↓ CACHE_IS_STATE_SCOPED_AFTER_MOVEMENT and keeps the prior state unchanged
     ↓ CACHE_IS_STATE_SCOPED_AFTER_LIGHT_CHANGE
     ↓ CACHE_IS_STATE_SCOPED_AFTER_OBSCUREMENT_END
     ↓ CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL and EFFECT_EXPIRY_REMOVAL
     ↓ SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS
     ↓ SEAM_WITH_ONE_OPEN_SIDE_STAYS_CLEAR
     ↓ SEAM_BLOCKED_CELL_PAIR
     ↓ DIAGONAL_CRACK_SEALED
     ↓ DIAGONAL_CRACK_CONTROL_ONE_BLOCKER
     ↓ STAIRCASE_WALL_SEALED
     ↓ STAIRCASE_MIRRORED_SEALED
     ↓ VERTICAL_STEP_SEALED
     ↓ STAIRCASE_SPLIT_BY_OPEN_CELL_STAYS_CLEAR
     ↓ OUTER_FACE_GRAZE_STILL_CLEAR
     ↓ SOLID_2x2_BLOCK
     ↓ DIAGONAL_CORNER_TOUCH_SEALED_D642
     ↓ PHYSICAL_COVER_UNCHANGED_BY_VERTEX
     ↓ PHYSICAL_COVER_UNCHANGED_BY_SEAM
     ↓ EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint
     ↓ SIGHT_ONLY_BLOCKER_PRESERVES_COVER even when fog flips the preferred optical corner
     ↓ PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR
     ↓ UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING
     ↓ SIGHT_TRACER_HAS_SINGLE_OWNER at the final migration stage
     ↓ PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE
   × REVIEW_SEALED_ENDPOINT 13ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > REVIEW_SEALED_ENDPOINT
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/unit/combat/visibility-field.test.ts:1561:28
    1551|     expect(body).not.toContain('environmentObscurementAt(');
    1552|   });
    1553| });
       |    ^
    1554|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 46 skipped (47)
   Start at  22:10:05
   Duration  2.77s (transform 1.08s, setup 0ms, import 2.66s, tests 14ms, environment 0ms)


 succeeded in 14222ms:
exec
/bin/bash -lc "nl -ba src/combat/cover.ts | sed -n '475,530p;570,655p;710,775p'; sed -n '1048,1098p' tests/unit/combat/visibility-field.test.ts; rg -n 'productive first|it\\(' tests/unit/vtt/room-generator-los-cover.test.ts | tail -15; sed -n '1,145p' tests/unit/vtt/scene-snapshot.test.ts; sed -n '190,245p' tests/unit/vtt/scene-snapshot.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
   475	}
   476	
   477	function aggregateCornerLines(
   478	  sourceCorner: CornerPoint,
   479	  lines: readonly TerrainCornerLineTrace[],
   480	  sourceCell: GridCell,
   481	  targetCell: GridCell,
   482	): TerrainLineTrace {
   483	  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);
   484	  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');
   485	  const obstructed = lines.filter((line) => line.tier !== 'none');
   486	  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>
   487	    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');
   488	  const tier = physicalBlocksCover
   489	    ? 'total'
   490	    : COVER_TIER_BY_RANK[Math.min(
   491	        coverRank(countTier(obstructed.length)),
   492	        coverRank(strongestLineTier),
   493	        coverRank('three_quarters'),
   494	      )] ?? 'none';
   495	  const sources = tier === 'none'
   496	    ? []
   497	    : uniqueSources(obstructed
   498	        .filter((line) => line.tier === strongestLineTier)
   499	        .flatMap((line) => line.sources));
   500	  const interveningCells = [...new Map(lines
   501	    .flatMap((line) => line.interveningCells)
   502	    .map((cell) => [cellKey(cell), cell] as const)).values()];
   503	  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;
   504	  return {
   505	    sourceCell: { ...sourceCell },
   506	    targetCell: { ...targetCell },
   507	    sourceCorner: { ...sourceCorner },
   508	    lines,
   509	    interveningCells,
   510	    tier,
   511	    blocksSight,
   512	    sourceIds: sources.map(taggedSourceId),
   513	    sources,
   514	    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,
   515	  };
   516	}
   517	
   518	function comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
   519	  return coverRank(left.tier) - coverRank(right.tier) ||
   520	    left.sourceCorner.row - right.sourceCorner.row ||
   521	    left.sourceCorner.column - right.sourceCorner.column;
   522	}
   523	
   524	function compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
   525	  return left.sourceCorner.row - right.sourceCorner.row ||
   526	    left.sourceCorner.column - right.sourceCorner.column;
   527	}
   528	
   529	function nearestCells(
   530	  sourceCells: readonly GridCell[],
   570	  const cached = stateTraces.get(traceKey);
   571	  if (cached !== undefined) return cached;
   572	  if (!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);
   573	  const nearest = nearestCells(sourceCells, targetCells);
   574	  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));
   575	  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);
   576	  const equivalentTraceKey = `${terrainSourceSignature(
   577	    state,
   578	    options.includeCreatures === true,
   579	    indexedSources,
   580	  )}\0${traceKey}`;
   581	  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);
   582	  if (equivalent !== undefined) {
   583	    stateTraces.set(traceKey, equivalent);
   584	    return equivalent;
   585	  }
   586	  const sourceCorners = outerCorners(sourceCells);
   587	  const targetCorners = outerCorners(targetCells);
   588	  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);
   589	  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);
   590	  const minimumColumn = Math.min(...cornerColumns);
   591	  const maximumColumn = Math.max(...cornerColumns);
   592	  const minimumRow = Math.min(...cornerRows);
   593	  const maximumRow = Math.max(...cornerRows);
   594	  const candidateEntries = sightBlockingCells.length === 0
   595	    ? [...indexedSources.values()]
   596	    : [...new Map([
   597	        ...indexedSources.values(),
   598	        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),
   599	      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];
   600	  const candidates = candidateEntries
   601	    .filter((entry) => !exclusions.has(cellKey(entry.cell)) &&
   602	      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
   603	      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
   604	    .map((entry) => entry.cell);
   605	  const sightBlockingKeys = new Set([
   606	    ...sightBlockingCells.map(cellKey),
   607	    ...[...indexedSources]
   608	      .filter(([, entry]) => entry.sources.some((source) => source.tier === 'total'))
   609	      .map(([key]) => key),
   610	  ]);
   611	  const sightBlockingAt = (cell: GridCell): boolean => {
   612	    const key = cellKey(cell);
   613	    return !exclusions.has(key) && sightBlockingKeys.has(key);
   614	  };
   615	  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
   616	    sourceCorner,
   617	    targetCorners.map((targetCorner) => traceCornerLine(
   618	      sourceCorner,
   619	      targetCorner,
   620	      candidates,
   621	      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
   622	      sightBlockingAt,
   623	    )),
   624	    nearest.sourceCell,
   625	    nearest.targetCell,
   626	  ));
   627	  const first = traces[0];
   628	  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
   629	  const physicalSelected = traces.reduce(
   630	    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,
   631	    first,
   632	  );
   633	  const blocksSight = traces.every((trace) => trace.blocksSight);
   634	  const opticalSelected = blocksSight
   635	    ? traces.reduce(
   636	        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,
   637	        first,
   638	      )
   639	    : null;
   640	  const selected: TerrainLineTrace = {
   641	    ...physicalSelected,
   642	    blocksSight,
   643	    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,
   644	  };
   645	  stateTraces.set(traceKey, selected);
   646	  retainEquivalentTrace(equivalentTraceKey, selected);
   647	  return selected;
   648	}
   649	
   650	/** The canonical 2014 corner-to-corner trace for two bare grid cells. */
   651	export function traceTerrainLine(
   652	  state: EncounterState,
   653	  sourceCell: GridCell,
   654	  targetCell: GridCell,
   655	  options: TerrainLineOptions = {},
   710	  const source = options.sourceAnchor === undefined
   711	    ? combatantSpace(state, sourceId)
   712	    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
   713	  const trace = traceSpaces(state, source.cells, targetCells, {
   714	    sourceId,
   715	    includeCreatures: true,
   716	    ...(options.additionalSightBlockingCells === undefined
   717	      ? {}
   718	      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
   719	  });
   720	  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
   721	  stateTraces.set(traceKey, trace);
   722	  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
   723	  return trace;
   724	}
   725	
   726	export function coverTierBetweenObjects(
   727	  objects: readonly WorldObject[],
   728	  from: GridCell,
   729	  to: GridCell,
   730	): CoverTier {
   731	  const exclusions = new Set([cellKey(from), cellKey(to)]);
   732	  const candidates = [...new Map(objects
   733	    .flatMap((object) => object.footprint)
   734	    .filter((cell) => !exclusions.has(cellKey(cell)))
   735	    .map((cell) => [cellKey(cell), cell] as const)).values()];
   736	  const sourceCell = { ...from };
   737	  const targetCell = { ...to };
   738	  const targetCorners = outerCorners([to]);
   739	  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
   740	    objects.flatMap((object): readonly TerrainLineSource[] =>
   741	      objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
   742	        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
   743	        : []);
   744	  const sightBlockingAt = (cell: GridCell): boolean =>
   745	    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
   746	  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
   747	    sourceCorner,
   748	    targetCorners.map((targetCorner) => traceCornerLine(
   749	      sourceCorner,
   750	      targetCorner,
   751	      candidates,
   752	      sourcesAt,
   753	      sightBlockingAt,
   754	    )),
   755	    sourceCell,
   756	    targetCell,
   757	  ));
   758	  const first = traces[0];
   759	  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
   760	  return traces.reduce((best, candidate) =>
   761	    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
   762	}
   763	
   764	export type CreatureCoverOptions = CreatureLineOptions;
   765	
   766	export interface CombatantCoverResult {
   767	  readonly tier: CoverTier;
   768	  readonly sourceIds: readonly string[];
   769	}
   770	
   771	export function coverBetweenCombatants(
   772	  state: EncounterState,
   773	  sourceId: CombatantId,
   774	  targetId: CombatantId,
   775	  options: CreatureCoverOptions = {},
    expect(trace).toMatchObject({
      blocksSight: true,
      firstBlockingCell: { column: 5, row: 3 },
    });
  });

  it('DIAGONAL_CRACK_SEALED', () => {
    const observer = normalProfile('diagonal-crack-observer');
    const subject = normalProfile('diagonal-crack-subject');
    const blockers = [{ column: 2, row: 1 }, { column: 1, row: 2 }];
    const state = fieldState(observer, {
      bounds: { columns: 5, rows: 5 },
      combatants: [observer, subject],
      tokens: [placedToken(observer, 0, 0), placedToken(subject, 3, 3)],
      blockedCells: blockers,
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });

    // The (0,0)->(4,4) ray reaches lattice vertex (2,2) between diagonal blockers TR (2,1)
    // and BL (1,2). D642 seals that crack and deterministically chooses lower-row cell (2,1).
    expect(trace).toMatchObject({
      tier: 'half',
      blocksSight: true,
      firstBlockingCell: { column: 2, row: 1 },
    });
    expect(sightToCreature(state, observer.id, subject.id)).toEqual({
      kind: 'unseen',
      reason: 'blocked',
    });
  });

  it('DIAGONAL_CRACK_CONTROL_ONE_BLOCKER', () => {
    const observer = normalProfile('diagonal-crack-control-observer');
    const subject = normalProfile('diagonal-crack-control-subject');
    const state = fieldState(observer, {
      bounds: { columns: 5, rows: 5 },
      combatants: [observer, subject],
      tokens: [placedToken(observer, 0, 0), placedToken(subject, 3, 3)],
      blockedCells: [{ column: 2, row: 1 }],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
    const oneSidedCorner = trace.lines.find((line) =>
      line.targetCorner.column === 4 && line.targetCorner.row === 3);

    // Selected ray (0,1)->(4,3) reaches vertex (2,2): TR (2,1) blocks but BL (1,2) is open.
    expect(trace).toMatchObject({ tier: 'none', blocksSight: false, firstBlockingCell: null });
    expect(oneSidedCorner).toMatchObject({ blocksSight: false, firstBlockingCell: null });
    expect(sightToCreature(state, observer.id, subject.id)).toEqual({
      kind: 'visible',
      grade: 'seen',
      sense: 'normal_sight',
257:  it('OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam', () => {
295:  it('generated and authored arena fixtures share one strict decoder', () => {
319:  it('kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture', () => {
328:  it('kills M576-E2-WALL-SEALS-ROOM for every living footprint size', () => {
342:  it('retains a productive first-turn option for every living monster in the versioned basis', () => {
351:  it('kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side', () => {
377:  it('kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION', () => {
import { describe, expect, it } from 'vitest';
import { combatToken } from '../../../src/combat/combatant';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import { createEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import {
  armorClass, encounterBranchId, encounterSessionId, worldObjectId,
} from '../../../src/combat/values';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { sha256 } from '../../../src/crypto/sha256';
import { projectDmBoard, projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import {
  REFERENCE_FIGHTER_ID, REFERENCE_MONSTER_ID, referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import {
  canonicalTokenIdentityIndex, groundAnchor, groundCenter, sceneSnapshot,
} from '../../../src/vtt/handoff/scene-snapshot';
import { logicalAssetId } from '../../../src/vtt/handoff/asset-id-map';
import {
  EncounterSessionJournal, MemoryBrowserSessionStore, MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function fixtureState() {
  const setup = referenceEncounterSetup();
  return createEncounter({
    ...setup,
    worldObjects: [
      {
        id: worldObjectId('object:door'), name: 'Oak Door', kind: 'door',
        position: { column: 6, row: 3 }, footprint: [{ column: 6, row: 3 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' }, createdRevision: 0,
      },
      {
        id: worldObjectId('object:wall'), name: 'Stone Wall', kind: 'barrier',
        position: { column: 6, row: 4 }, footprint: [{ column: 6, row: 4 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: true, lineOfSight: true, cover: 'total' }, createdRevision: 0,
      },
      {
        id: worldObjectId('object:torch'), name: 'Torch', kind: 'light-source',
        position: { column: 4, row: 1 }, footprint: [{ column: 4, row: 1 }],
        durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
        blocking: { movement: false, lineOfSight: false, cover: 'none' }, createdRevision: 0,
      },
    ],
  });
}

function sizedSnapshot(size: 'Large' | 'Huge' | 'Gargantuan', squeezed = false) {
  const setup = referenceEncounterSetup();
  const base = setup.combatants.find((profile) => profile.id === REFERENCE_FIGHTER_ID);
  if (base?.kind !== 'player_character') throw new Error('Missing reference fighter.');
  const profile = { ...base, rules: { ...base.rules, sizeCategory: size } };
  const created = createEncounter({
    bounds: setup.bounds, combatants: [profile],
    tokens: [combatToken(profile, { column: 1, row: 1 })],
  });
  if (squeezed && size !== 'Large') throw new Error('Squeezed fixture supports Large only.');
  const state = squeezed
    ? {
        ...created,
        tokens: created.tokens.map((token) => ({
          ...token, placementMode: { kind: 'squeezed' as const, actual: 'Large' as const, sizedFor: 'Medium' as const },
        })),
      }
    : created;
  const projection = projectDmBoard({
    view: projectDmView(state),
    coordinator: IDLE,
    controllers: [],
    history: [],
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  return sceneSnapshot({
    sceneId: 'scene:sizes', projection, art: REFERENCE_ENCOUNTER_ART,
    tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
  }).snapshot.tokens[0];
}

interface PersistedByteBaseline {
  readonly pendingRequestHash: string;
  readonly coordinatorHash: string;
  readonly revisionChecksum: string;
  readonly branchRngStateFingerprint: string;
}

function persistedRevisionBaseline(
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): Pick<PersistedByteBaseline, 'revisionChecksum' | 'branchRngStateFingerprint'> {
  const store = new MemoryBrowserSessionStore();
  const sessionId = encounterSessionId('session:handoff-persistence-baseline');
  EncounterSessionJournal.create({
    sessionId,
    branchId: encounterBranchId('branch:handoff-persistence-baseline'),
    encounterState: state,
    coordinatorState,
    controllers: [],
    rng: mulberry32(16_603),
    store,
    mirror: new MemoryMirrorSink(),
  });
  const revision = store.revisions(sessionId)[0];
  if (revision === undefined) throw new Error('PERSISTENCE_BASELINE_REVISION_MISSING');
  return {
    revisionChecksum: revision.checksum,
    branchRngStateFingerprint: revision.branchRngStateFingerprint,
  };
}

function persistedByteBaseline(
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): PersistedByteBaseline {
  if (coordinatorState.pendingRequest === null) throw new Error('PERSISTENCE_BASELINE_REQUEST_MISSING');
  return {
    pendingRequestHash: sha256(canonicalJson(coordinatorState.pendingRequest)),
    coordinatorHash: sha256(canonicalJson(coordinatorState)),
    ...persistedRevisionBaseline(state, coordinatorState),
  };
}

function assertPersistedHandoffBytesUnchanged(
  expected: PersistedByteBaseline,
  state: ReturnType<typeof fixtureState>,
  coordinatorState: PersistedCoordinatorState,
): void {
  const actual = persistedByteBaseline(state, coordinatorState);
  if (canonicalJson(actual) !== canonicalJson(expected)) {
    throw new Error('PERSISTED_HANDOFF_BYTES_CHANGED');
  }
      if (token === undefined) throw new Error('Missing sized token.');
      expect(groundAnchor({ x: token.x, y: token.y, z: token.z }, token.footprint))
        .toEqual({ column: 1, row: 1 });
    }
  });

  it('removes canonical token identity on a visible-to-hidden player transition', () => {
    const state = fixtureState();
    const binding = { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID };
    const identities = canonicalTokenIdentityIndex(state.tokens);
    const before = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(state, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    const monsterTokenId = String(state.tokens.find((token) => token.combatantId === REFERENCE_MONSTER_ID)?.id);
    expect(before.tokens.map((token) => token.id)).toContain(monsterTokenId);
    const hidden = {
      ...state,
      hiddenCombatants: [{
        combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: '2024' as const,
      }],
    };
    const after = sceneSnapshot({
      sceneId: 'scene:hidden', projection: projectPlayerBoard(projectPlayerView(hidden, binding), IDLE),
      art: REFERENCE_ENCOUNTER_ART, tokenIdentities: identities,
    }).snapshot;
    expect(after.tokens.map((token) => token.id)).not.toContain(monsterTokenId);
  });

  it('preserves full persisted request/coordinator bytes and the actual revision checksum', () => {
    const state = fixtureState();
    const view = projectPlayerView(state, { seatId: 'player:one', combatantId: REFERENCE_FIGHTER_ID });
    const coordinator: PersistedCoordinatorState = {
      ...IDLE,
      pendingRequest: {
        kind: 'turn' as const,
        requestId: 'request:handoff-baseline',
        encounterRevision: state.revision,
        actorId: REFERENCE_FIGHTER_ID,
        visibleState: view,
        legalActions: { actions: [{ type: 'end_turn' as const, actor: REFERENCE_FIGHTER_ID }] },
      },
    };
    const encounterStateBytes = canonicalJson(state);
    const before = persistedByteBaseline(state, coordinator);
    const projection = projectPlayerBoard(view, coordinator);
    sceneSnapshot({
      sceneId: 'scene:pending', projection, art: REFERENCE_ENCOUNTER_ART,
      tokenIdentities: canonicalTokenIdentityIndex(state.tokens),
    });
    const after = persistedByteBaseline(state, coordinator);
    // Fighter (2,3) has corners (2,3),(3,3),(2,4),(3,4). For each target (c,4), c=7,8,9:
    // rays from either row-3 source corner to (c,4)/(c+1,4) enter Oak Door (6,3), while rays
    // to (c,5)/(c+1,5) enter Stone Wall (6,4) (the (3,3)->(10,5) ray enters both). From either
    // row-4 source corner, rays to (c,4)/(c+1,4) follow row line 4 between those two blockers,
    // and rays to (c,5)/(c+1,5) enter the wall. Thus every corner ray is blocked for all three.

codex
The interior-vertex rule preserves physical cover by construction. I found an endpoint gap to investigate: with blockers at `(1,1)` and `(2,2)`, the tracer reports clear sight from `(2,1)` to `(1,2)` through their sealed junction `(2,2)`. I’m checking this against D642 and testing a non-adjacent target as well.

 succeeded in 27651ms:
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\",\"tests/unit/vtt/scene-snapshot.test.ts\",\"tests/unit/vtt/dm-tactical-intel.test.ts\",\"tests/unit/vtt/tactical-evaluator-r02.test.ts\",\"tests/unit/tools/ai-dm-conversation.test.ts\",\"tests/unit/vtt/two-room-fixture.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "python3 - <<'PY'
p='/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md'
s=open(p).read().splitlines()
for i,l in enumerate(s):
 if l.startswith('## ') and any('D'+str(n)+':' in l or 'D'+str(n)+' ' in l for n in [641,642,651]):
  j=i+1
  while j<len(s) and not s[j].startswith('## '): j+=1
  print('\\n'.join(f'{k+1}:{s[k]}' for k in range(i,j)))
PY
sed -n '145,260p' tests/unit/tools/ai-dm-conversation.test.ts; sed -n '98,175p' tests/unit/vtt/tactical-evaluator-r02.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
23052:## D641 — OWNER (2026-09-17 18:48): "I think we need to model that a wall is solid across cells. It is not just a series of cells. Look for how others have handled this." — research done by the supervisor; question put back to the owner
23053:PROBED BY ME on 807d2e3c (traceTerrainLine, 6x6 board): (1) two blockers touching only at a corner, (2,1)&(1,2), observer (0,0) → target (3,3) through the shared vertex: tier half, blocksSight FALSE — the diagonal crack lets sight through; (2) solid 2x2 block: total, TRUE; (3) wall column with the ray along its face-line between two blockers (the D635 seam): half, TRUE; (4) a ray grazing one blocker's corner: none, FALSE. So today's tracer = closed cells whose interiors block + the D635 shared-EDGE rule; shared CORNERS of diagonally touching blockers are still open.
23054:HOW OTHERS DO IT (sources in the reply): D&D 2014 DMG corner trace — lines from a corner to the target's corners; whether a line that merely TOUCHES an obstacle counts is explicitly the DM's call (the SRD 5.2.1 only defines cover degrees by "covers at least half / three-quarters / the whole target"); Gloomhaven — corner-to-corner lines, and "the line cannot touch or cross a wall at any point; touching the very edge of a wall still means no LOS" (walls are closed sets; touching = blocked); Foundry VTT / Roll20 — walls are SEGMENTS with endpoints (thin walls), not cells, so no cell seams exist and a long wall is one solid segment by construction; roguelikes (Red Blob "thin wall FOV", Adam Milazzo's survey, Albert Ford's symmetric shadowcasting, RogueBasin comparative study) — "thick walls" (blocking cells) vs "thin walls" (blocking edges) is the standard framing, and diagonal-gap peeking between corner-touching blockers is a known nuisance that implementations bevel or seal; Debenham & Solis-Oba, "New Algorithms for Computing Field of Vision over 2D Grids" (arXiv 2101.11002) — "adjacent vision blocking cells are first grouped together into rectilinear regions, then split into a minimal number of rectangles", and their Figure 5 is exactly our seam: two adjacent rectangles let a ray slip along the shared side, which they fix by extending one rectangle to overlap the other so the union is solid.
23055:PROPOSAL (to the owner, one question): adopt a SOLID-WALL model — the wall is the union of sight-blocking cells as closed rectilinear regions; a ray is blocked iff it passes through the union's interior, which includes (a) any blocking cell's interior, (b) an edge shared by two blockers (D635, already in), and (c) a vertex shared by two diagonally touching blockers (seal the crack; NOT in today). Grazing an OUTER face or a single blocker's corner stays open (DMG-consistent, today's behaviour). Implementation: step 1 a local vertex rule beside firstSharedEdgeBlockingCell in cover.ts with witnesses for all four probe cases (small, rules-visible, needs its own D-ruling and astra review; lands with VIS-FIELD); step 2 the precomputed rectilinear-region/rectangle representation keyed by the blocking topology (the paper's approach) as the VIS-FIELD-PERF batch (also perf fix #3 in D635.53). Question 5 stays: regenerate the cohorts under the solid-wall geometry (A1).
23056:
23057:## D642 — OWNER (2026-09-17 19:15): "Seal diagonal corners." — the solid-wall model adopted in full: a ray is blocked by any blocking cell interior, any edge shared by two blockers (D635) and any vertex shared by two diagonally touching blockers; outer-face grazes and single-blocker corner touches stay clear; physical cover tiers unchanged
23058:Owner also confirmed on the annotated image: "The orange and purple lines should not work" (all four corner rays through the column-7 wall are blocked — the seam rule's result). WALL-01 dispatched to sol (resume the seam-rule session 01a0ab3f…, brief impl-vis-field-wall-01.md, log impl-wall-01.log) on the worktree at 807d2e3c: the vertex rule in cover.ts with exact lattice-point enumeration, hand-authored witnesses (crack sealed, single-blocker control, staircase wall sealed at a step vertex — the case the edge rule alone misses, outer-face graze clear, 2x2 solid unchanged), the SEAM batch's DIAGONAL_CORNER_TOUCH_UNCHANGED pin re-pinned by hand to the sealed result (renamed _SEALED_D642), three mutants, per-family consequence counts before/after, the red-set audit (a red in a non-frozen suite is a finding, not a re-pin), and proof that generation bytes are untouched. Astra medium review follows; then question 5 (A1) regenerates the cohorts under the sealed geometry.
23059:
23077:## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
23078:RETRACTION, at full length. In D645 I rejected WALL-01 as P1 on two grounds, both wrong: (1) I claimed the vertex map was built from the bounding-box-filtered `candidates`; it was built from `candidateEntries` — the UNFILTERED union of indexed sources and blocked cells — so no cell was ever excluded; (2) I read my probe's aggregate blocksSight=false for two isolated diagonal blockers as "the rule is inert", but blocksSight is true only when EVERY corner ray is blocked, and in that geometry the ray along the far face (y=5) is legitimately clear (a graze) — the aggregate false was CORRECT. The decisive test I should have run first: a FULL stepped wall (column 7 rows 0–3, column 8 rows 4–7), Medium tokens (13,4)→(1,4): baseline 807d2e3c leaks (false); ORIGINAL WALL-01 blocks (true, first (7,3)); fix r1 blocks (true). Verified by me tonight on the throwaway checkout, all three trees. So the original WALL-01 was correct; fix r1 replaced a correct precomputed map with equivalent on-the-fly lookups and added per-ray witnesses for my three geometries (valid per-ray, and the split-pair control) — harmless, kept as the candidate, but the "bbox regression" mutant sol reports is a restriction the original never had. Sol did not push back on a false P1; the brief told it what to find. Lesson recorded in memory (aggregate vs per-ray; read the code path before naming a cause).
23079:REAL FINDING (WALL-F2, D642 consequence, not a defect): tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" is red with the vertex rule (8/8 on clean 807d2e3c): the two-room scene's derived fog gains cells (8,3) and (9,3) — a sealed diagonal crack now conceals two cells the party could previously see through. Sol's suite audit did not include scene-snapshot. Handling = D569 demonstrate-then-normalize exactly as B4/B2 did for this test (D635.5–.7: show the vertex, the ray, the two cells; then re-pin the persisted expectation and the revision checksum/fingerprint with the derivation). An UNTRUNCATED full vitest on the r1 candidate is running (full-vitest-wall-r1.log) to find every other consequence before the fix-r2 brief.
23080:MY VERIFICATION of fix r1 otherwise (verify-wall-01-r1.log): tsc 0/0; diff-check 0; vertex-lookup-null mutant → 5 sealed witnesses red; suites 2150/2186 = the 35 known frozen/behaviour reds + scene-snapshot; los-cover 110/112 (the two 5 s budget timeouts, perf); pair 36/36 in 39 s.
23081:PLAN r2 → astra r2 REJECT (saved review-plan-cohort-01-astra-r2.md): F1, F4 closed; F3 still open (astra ran the real planner: the base menu has two candidates not one, the selector key shape is wrong, and under sealed corners A keeps its shot by moving 25 ft to (8,3) so the mutated menu has three entries, not []); F2 partial (search must cover the whole 000–999 namespaces); F5 NEW (v2's ledger drops the five historical namespaces and the own-cohort handling); F6 NEW (membership silently became mandatory offense; 6203001 monsters 3/4 are Dash-only productive). The nine-candidate table verified correct under its stipulated responses. r3 = the final round (planner resumed; brief plan-cohort-01-r3.md; r2 archived).
23082:
23091:## D651 — SUPERVISOR (2026-09-17 21:25): two correct BLOCKED stops ruled — WALL-01 fix r2's four scene subjects (test-scene edits approved) and COHORT-01 B1's v5 cap discontinuity (amendment N2; plan re-frozen at sha256 4bff2145b445cbb96771333bfdceb5cfdae8781e494cfa48622619cae0a2ac69, 403 lines)
23092:WALL-01 fix r2 (sol fresh 01a0b20e-61fa…; saved impl-wall-01-fix-r2-sol.md; no files changed): all five reds are correct D642 consequences — (1) scene-snapshot: the wall cell (7,2) and the door (6,3) meet diagonally at vertex (7,3); the fighter's and wizard's last-clear row-3 rays (3,3)→(8,3), (2,3)→(9,3) become blocked; DM fog {(4,3)} → {(4,3),(8,3),(9,3)}; hashes derived (pendingRequestHash 78f31379… → 0ec0fbbc…, coordinatorHash f8fa0780… → 79b076c9…, revisionChecksum 35c96ecc… → 52305455…, fingerprint unchanged dd802783… since encounter-state bytes are unchanged); (2)(3) the conversation helper's re-authored blockers (9,1)/(9,5) now seal with (10,2)/(10,6) and the five opened pairs vanish; (4)(5) the R02 helpers' re-authored blocker (9,2) seals with (10,3) at vertex (10,3): the R02 row becomes HIDDEN and the first Scout's 90-ft shot becomes illegal. Sol stopped per the brief and proposed minimal scene edits: (9,1)/(9,5) → (8,1)/(8,5) and (9,2) → (8,2), temporarily proven (4/4) and restored. RULING: apply the scene-snapshot normalization under D569 (as B4/B2) and the two scene edits with derivations; test files only. Dispatched fix r3 (resume 01a0b20e-61fa…; brief impl-vis-field-wall-01-fix-r3.md).
23093:COHORT-01 B1 (sol 01a0b20e-61fb…; saved impl-b1-sol.md; three allowed files, 176+/13−): second-family validator now a strict v1/v2 union with raw-byte hashing before a legacy projection that drops only the committed own foggedCells key; 20/20 single-key structural diffs; 50/50 second-family (47 historical violations → 0); five mutants killed; V-freeze 32/32 hashes identical; tsc 0/0. BLOCKED correctly: d569-v5.test.ts still fails at collection — now on "Registered context caps mismatch" (tools/d569-v5/validate-first-arm.ts:369): the v5 manifest registers caps.semanticBytes 8192 (engine-server SEMANTIC_BOARD_MAX_BYTES, unchanged by B6) while rows produced by today's live blind runner carry 32,768 (D643). VERIFIED BY ME (test run + guard read). RULING N2 (appended to the plan, all copies): manifest-declared caps are the cell caps, version-aware (v5 = 8192 history; v6 = 32768); the v5 test stays historical and PINS the refusal of live rows under today's runner (no skip, no relaxed cap); v6's active test validates at 32,768; mutants both ways. Dispatched B1 fix r1 (resume 01a0b20e-61fb…). PARKED for the owner (design): making the blind runner take its semantic cap from the experiment manifest end-to-end would let historical experiments dry-run as registered; not in COHORT-01.
23094:
): Promise<Awaited<ReturnType<typeof runConversation>>> {
  return runConversation(config, { ...options, partyPolicyOverride: decisionPolicy });
}

async function minimalAlternatingInitiativeRoom(): Promise<EncounterState> {
  const state = await alternatingInitiativeRoom();
  const actorIds = new Set<CombatantId>([
    combatantId('combatant:fighter'),
    combatantId('combatant:generated-3943001-monster-1'),
    combatantId('combatant:generated-3943001-monster-2'),
  ]);
  return {
    ...state,
    combatants: state.combatants.filter((combatant) => actorIds.has(combatant.profile.id)),
    tokens: state.tokens.filter((token) => actorIds.has(token.combatantId)),
  };
}

async function validRecalculationRoom(): Promise<EncounterState> {
  const state = await alternatingInitiativeRoom();
  return {
    ...state,
    combatants: state.combatants.map((combatant) => ({
      ...combatant,
      profile: {
        ...combatant.profile,
        rules: {
          ...combatant.profile.rules,
          initiativeBonus: combatant.profile.kind === 'monster' ? -20 : 20,
        },
      },
    })),
  };
}

type VisibilityAnchor = Readonly<{ column: number; row: number }>;

function monsterPlayerVisibilityDelta(
  before: EncounterState,
  after: EncounterState,
  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
): { readonly opened: readonly string[]; readonly closed: readonly string[] } {
  const monsters = before.combatants.filter((combatant) => combatant.profile.kind === 'monster');
  const players = before.combatants.filter((combatant) => combatant.profile.kind === 'player_character');
  const opened: string[] = [];
  const closed: string[] = [];
  for (const monster of monsters) {
    for (const player of players) {
      const sourceAnchor = sourceAnchors.get(monster.profile.id);
      const options = sourceAnchor === undefined ? {} : { sourceAnchor };
      const beforeBlocked = traceCombatantLine(
        before, monster.profile.id, player.profile.id, options,
      ).blocksSight;
      const afterBlocked = traceCombatantLine(
        after, monster.profile.id, player.profile.id, options,
      ).blocksSight;
      const pair = `${monster.profile.id}->${player.profile.id}`;
      if (beforeBlocked && !afterBlocked) opened.push(pair);
      if (!beforeBlocked && afterBlocked) closed.push(pair);
    }
  }
  return { opened, closed };
}

function pinMonsterPlayerVisibilityDelta(
  before: EncounterState,
  after: EncounterState,
  expectedOpened: readonly string[],
  sourceAnchors: ReadonlyMap<CombatantId, VisibilityAnchor> = new Map(),
): void {
  const delta = monsterPlayerVisibilityDelta(before, after, sourceAnchors);
  expect(delta.opened).toEqual(expectedOpened);
  expect(delta.closed).toEqual([]);
}

function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
  const seamRows = new Set([1, 5]);
  const matchingBlockers = state.blockedCells.filter((cell) =>
    cell.column === 10 && seamRows.has(cell.row));
  if (matchingBlockers.length !== seamRows.size) {
    throw new Error('The hard exhaustion fixture no longer has both expected seam blockers.');
  }
  const reauthored = {
    ...state,
    blockedCells: state.blockedCells.map((cell) =>
      cell.column === 10 && seamRows.has(cell.row)
        ? { column: 8, row: cell.row }
        : cell),
  };
  // D635's one-cell-left repair put blockers at (9,1)/(9,5), diagonally touching the
  // retained blockers (10,2)/(10,6) at vertices (10,2)/(10,6). D642 therefore sealed
  // the same last-clear rays. Moving them one more cell left to (8,1)/(8,5) leaves no
  // diagonal pair at either vertex and opens the intended rays without closing any pair.
  // Representative changed rays, with t from source to target:
  // m1->Fighter (19,2)->(1,2) and m2->Fighter (13,2)->(1,2) crossed vertex (10,2);
  // m2->Cleric (14,1)->(2,4) also crossed (10,2); m5->Wizard (19,6)->(1,6) and
  // m6->Wizard (18,6)->(1,6) crossed vertex (10,6). Each changes from
  // tier none / blocksSight true / first (9,1 or 9,5) back to none / false / null.
  expect(reauthored.blockedCells).toEqual(expect.arrayContaining([
    { column: 8, row: 1 },
    { column: 8, row: 5 },
  ]));
  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 1 });
  expect(reauthored.blockedCells).not.toContainEqual({ column: 9, row: 5 });
  pinMonsterPlayerVisibilityDelta(state, reauthored, [
    'combatant:generated-5117009-monster-1->combatant:fighter',
    'combatant:generated-5117009-monster-2->combatant:fighter',
    'combatant:generated-5117009-monster-2->combatant:cleric',
    'combatant:generated-5117009-monster-5->combatant:wizard',
    'combatant:generated-5117009-monster-6->combatant:wizard',
  ], new Map([
    [combatantId('combatant:generated-5117009-monster-2'), { column: 13, row: 1 }],
  ]));
  return reauthored;
}

    expect(state.blockedCells).not.toContainEqual({ column: 9, row: 2 });
    expect(state.blockedCells).not.toContainEqual({ column: 10, row: 2 });
    const handGeometry = [
      {
        scoutId: SCOUTS[0], position: { column: 19, row: 3 }, sourceCorner: { column: 19, row: 3 },
        lineTiers: ['total', 'total', 'none', 'none'], coverTier: 'half',
        probabilities: { status: 'resolved', hit: 5 / 20, critical: 1 / 20, miss: 15 / 20 },
        expectedDamage: (4 / 20) * 6.5 + (1 / 20) * 11,
      },
      {
        scoutId: SCOUTS[1], position: { column: 19, row: 5 }, sourceCorner: { column: 19, row: 5 },
        lineTiers: ['total', 'total', 'none', 'total'], coverTier: 'three_quarters',
        probabilities: { status: 'resolved', hit: 2 / 20, critical: 1 / 20, miss: 18 / 20 },
        expectedDamage: (1 / 20) * 6.5 + (1 / 20) * 11,
      },
    ] as const;
    const rows = handGeometry.map((geometry) => {
      const scoutId = geometry.scoutId;
      const action = OFFER_ENVIRONMENT.queries.actions(state, scoutId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === 'longbow');
      if (action === undefined) throw new Error(`${scoutId} has no Longbow.`);
      const reach = OFFER_ENVIRONMENT.queries.reach(state, {
        actorId: scoutId,
        targetId: FIGHTER,
        actionId: action.id,
      });
      const evaluation = OFFER_ENVIRONMENT.queries.tacticalAttack(
        state,
        scoutId,
        FIGHTER,
        action.id,
      );
      if (evaluation === null) throw new Error(`${scoutId} tactical evaluation is absent.`);
      // The executor-side state adapter must produce the exact same canonical verdict.
      expect(evaluateMonsterTacticalAttack(state, action, scoutId, FIGHTER)).toEqual(evaluation);
      const trace = traceCombatantLine(state, scoutId, FIGHTER);
      expect(state.tokens.find((token) => token.combatantId === scoutId)?.position).toEqual(geometry.position);
      expect({
        sourceCorner: trace.sourceCorner,
        lineTiers: trace.lines.map((line) => line.tier),
        coverTier: trace.tier,
        blocksSight: trace.blocksSight,
      }).toEqual({
        sourceCorner: geometry.sourceCorner,
        lineTiers: geometry.lineTiers,
        coverTier: geometry.coverTier,
        blocksSight: false,
      });
      return {
        scoutId,
        minimumMovementFeet: reach.legal ? 0 : null,
        range: evaluation.range,
        rollMode: evaluation.rollMode,
        probabilities: evaluation.probabilities,
        damage: evaluation.damage,
        consequences: evaluation.consequences,
        policy: evaluation.policy,
        expectedProbabilities: geometry.probabilities,
        expectedDamage: geometry.expectedDamage,
      };
    });

    for (const row of rows) {
      // Fixture positions differ by 18 columns and at most 3 rows: Chebyshev 18 * 5 = 90 ft.
      expect(row.minimumMovementFeet).toBe(0);
      expect(row.range).toEqual({
        status: 'resolved', distanceFeet: 90, band: 'normal', legal: true,
      });
      expect(row.rollMode).toMatchObject({
        mode: 'normal',
        reasons: ['unconscious_advantage', 'prone_ranged_disadvantage'],
      });
      // +4 attacks the hand-counted Half/Three-Quarters adjusted AC above.
      expect(row.probabilities).toEqual(row.expectedProbabilities);
      // Longbow 1d8+2 averages 6.5; critical 2d8+2 averages 11.
      expect(row.damage).toEqual({
        status: 'resolved',

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_ENDPOINT_MATRIX\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/combat/visibility-field.test.ts'))return code+\"\\nit('REVIEW_ENDPOINT_MATRIX',()=>{\\nconst p=normalProfile('review');\\nconst state=fieldState(p,{bounds:{columns:6,rows:6},blockedCells:[{column:1,row:1},{column:2,row:2}]});\\nfor(const [from,to] of [[{column:2,row:1},{column:1,row:2}],[{column:2,row:1},{column:0,row:3}],[{column:0,row:3},{column:2,row:1}],[{column:3,row:0},{column:0,row:3}]]){\\nconst result=traceTerrainLine(state,from,to);\\nconsole.log('ENDPOINT_MATRIX',JSON.stringify({from,to,blocked:result.blocksSight,source:result.sourceCorner,lines:result.lines.map(x=>({to:x.targetCorner,blocked:x.blocksSight}))}));\\n}\\n});\";}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 exited 1 in 19328ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > wall begins before initial without speculation
[MUTATION_RECEIPT] wall begins before initial without speculation APPLIED
[MUTATION_RECEIPT] wall begins before initial without speculation PROVED_APPLIED

[MUTATION_RECEIPT] wall begins before initial without speculation APPLIED
[MUTATION_RECEIPT] wall begins before initial without speculation PROVED_APPLIED

stdout | tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > wall begins before initial without speculation
[MUTATION_RECEIPT] wall begins before initial without speculation FAILED_AS_EXPECTED
[MUTATION_RECEIPT] wall begins before initial without speculation REVERTED hash=4242382f59e3d061437417e013a14c7a56022c0932718157384e2b9aa5dc987a

[MUTATION_RECEIPT] wall begins before initial without speculation FAILED_AS_EXPECTED
[MUTATION_RECEIPT] wall begins before initial without speculation REVERTED hash=4242382f59e3d061437417e013a14c7a56022c0932718157384e2b9aa5dc987a

stdout | tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > speculation uses arm base until trigger
[MUTATION_RECEIPT] speculation uses arm base until trigger APPLIED
[MUTATION_RECEIPT] speculation uses arm base until trigger PROVED_APPLIED

[MUTATION_RECEIPT] speculation uses arm base until trigger APPLIED
[MUTATION_RECEIPT] speculation uses arm base until trigger PROVED_APPLIED

stdout | tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > speculation uses arm base until trigger
[MUTATION_RECEIPT] speculation uses arm base until trigger FAILED_AS_EXPECTED
[MUTATION_RECEIPT] speculation uses arm base until trigger REVERTED hash=92f2a43840a5be1d30a6f96aff6bf639765109f2aed5180b3228d5881e5f07d6

[MUTATION_RECEIPT] speculation uses arm base until trigger FAILED_AS_EXPECTED
[MUTATION_RECEIPT] speculation uses arm base until trigger REVERTED hash=92f2a43840a5be1d30a6f96aff6bf639765109f2aed5180b3228d5881e5f07d6

 ❯ tests/unit/tools/ai-dm-conversation.test.ts (110 tests | 97 failed) 11101ms
     ✓ omits DM-only intel_mode from blind planned context arguments 1ms
     × persists indeterminate artifact and forensic row before raising the typed integrity STOP 5ms
     × classifies a timeout after catalog observation but before a tool call without an integrity STOP 0ms
     × persists primary D569 timeout evidence before applying the expired round deadline 0ms
     × persists forensic evidence and STOPs on a timed_out dispatch with a contradictory catalog 0ms
     × persists forensic evidence and STOPs on a cancelled dispatch with a contradictory catalog 0ms
     × persists forensic evidence and STOPs on a timed_out dispatch with an invalid malformed catalog 0ms
     × persists forensic evidence and STOPs on a timed_out dispatch with an invalid wrong_profile catalog 0ms
     × persists forensic evidence and STOPs on a cancelled dispatch with an invalid malformed catalog 0ms
     × persists forensic evidence and STOPs on a cancelled dispatch with an invalid wrong_profile catalog 0ms
     × persists a runner forensic row before propagating conflicting startup evidence 0ms
     × persists delivered context and process evidence before propagating conflicting startup evidence 0ms
     × rejects a request after the MCP child closes stdin without an unhandled EPIPE 5002ms
     ✓ routes a readline input error through typed rejection and complete teardown 11ms
     ✓ rejects an in-flight MCP request specifically on child exit 7ms
     × rejects on stdout closure and terminates a child that remains alive 5000ms
     ✓ refuses an MCP request issued after the child has exited 22ms
     ✓ preserves a request failure through the caller try/finally cleanup path 23ms
     ✓ reports standalone abnormal MCP termination as a typed error 19ms
     × authorizes a serialized revision-bound Dodge proposal 0ms
     × authorizes targeted Web and non-targeted Dodge through composite options 0ms
     × round-trips the End Turn option emitted by the tactical context 2ms
     × wall begins before initial without speculation 1ms
     × speculation uses arm base until trigger 4ms
     × restricted wall excludes engine work and includes later speculation 0ms
     × fallback computation of 1000 ms remains outside the restricted wall 0ms
     × fallback computation of 200000 ms remains outside the restricted wall 0ms
     × expired speculative adoption validation cannot adopt or execute that branch 0ms
     × expired recalculation authorization cannot retain or execute recalculated entries on the real path 0ms
     × one rejected submission uses arm-base correction before D474 escalation 0ms
     × empty structured correction is not D474 validation evidence on the real path 0ms
     × correction refusal triggers a fresh D474 escalation on the real path 0ms
     × actual refusal is the only single-attempt D474 trigger 0ms
     × keeps tiered primary argv/config byte-identical and isolates escalation from the base session 0ms
     × constructs no escalation adapter or bootstrap for the exact post-shift no-flag control shape (mutation: implicit escalation default) 0ms
     × keeps one sitting across rooms, rolls only at threshold, and explicit end prevents resume 0ms
     × routes a 'tiered' correction using actual dispatch bookkeeping 0ms
     × routes a 'untiered' correction using actual dispatch bookkeeping 0ms
     × authorizes a serialized MCP attack proposal 0ms
     × requests full context for round one and a delta for a resumed later round 0ms
     × preserves accepted suggested composite proposals in the authorized SIMULATED row 0ms
     ✓ re-resolves independently specified stored mechanics before reporting divergence 57ms
     ✓ divergence refuses a stored resolution produced under a different offer environment 33ms
     ✓ rejects stored proposal resolutions with missing or non-64-hex environment digests 11ms
     ✓ rejects plan adjustment envelopes whose stored updates carry malformed digests 10ms
     × authorizes generated room 3943004 through the real host after resolving boundary decisions 0ms
     × authorizes generated room 3943007 through the real host after resolving boundary decisions 0ms
     × auto-resolves an unattended ask Reaction with the decline policy and authorizes the SIMULATED arena round 0ms
     × auto-resolves an unattended ask Reaction with the take policy and authorizes the SIMULATED arena round 0ms
     × restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch 0ms
     × falls back to unattended toggle policy when sticky guidance does not cover the pending trigger 0ms
     × keeps one SIMULATED session across two rooms, one correction, and a browser restore 0ms
     × uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit 0ms
     × records typed fallbackReason for 'no proposal' from the stub adapter 0ms
     × records typed fallbackReason for 'validation exhaustion' from the stub adapter 0ms
     × records typed fallbackReason for 'blocked auto-submit' from the stub adapter 0ms
     × records typed fallbackReason for 'timeout' from the stub adapter 0ms
     ✓ does not depend on turn-context rendering to resolve a brutal exhaustion frontier  869ms
     × hidden_options_logged_once: records every hidden option once with engine-state knowledge and stationary Disengage reasons 0ms
     × runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads) 0ms
     × runs a three-room three-round model-free brutal smoke with the stub adapter 0ms
     × retries one SIMULATED service flap and uses the first healthy primary turn 0ms
     × marks three consecutive SIMULATED service flaps as service_null without exhausting the turn 0ms
     × does not retry a SIMULATED primary turn that called engine tools before rejection 0ms
     × records when the configured turn-context trimmer fired 0ms
     × injects the root and tactics pair byte-for-byte only on cold start and attributes its hash 0ms
     × threads a selected skill through every invocation and hashes the exact fixture bytes 0ms
     × runs a model-free none instruction-source smoke through a SIMULATED adapter 0ms
     × runs a model-free kb instruction-source smoke through a SIMULATED adapter 0ms
     × runs a model-free skill instruction-source smoke through a SIMULATED adapter 0ms
     × starts the persistent SIMULATED session with the first round plan in one model dispatch 0ms
     × queues a schema-final indexed decision through the same engine round path (mutation: parse valid final output but do not queue it) 0ms
     × rejects audited boilerplate at structured-final ingress before accepting a substantive correction 0ms
     × censors a cancelled structured-final turn as decision_timeout (mutation: classify cancelled final output as decision_missing) 0ms
     × records the actor chosen index for recommendation-anchor measurement (mutation: omit chosen index from final row) 0ms
     × passes a persisted final-index row through packet validation 0ms
     × records no chosen indices when no final-index decision is accepted 0ms
     ✓ rejects speculative structured-final dispatch at the typed phase boundary (mutation: pass speculative through as a decision phase) 0ms
     × records a missing final decision explicitly and repairs it with the same indexed correction shape (mutation: classify final absence as service_null) 0ms
     × uses the same indexed final contract for a G2-preflighted adjustment (mutation: send an adjustment through MCP) 0ms
     × repairs an indexed adjustment through the same correction ingress (mutation: use a tool-driven adjustment correction) 2ms
     ✓ directs K6 to consume an inline suggestion without fetching the same play again 0ms
     × admits the active process and local OpenAI conversation adapters 0ms
     × parses the D569 mode, repair, attempt, fact, cap, timeout, and judge-model combinations 0ms
     × derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile 0ms
     × walks an alternating initiative fixture without waking the DM for HP-only drift 0ms
     × ends a three-round room as party_defeated when all PCs are dead entering the party segment 0ms
     × runs three rounds with a one-round party program by recording typed default turns 0ms
     × dispatches when a superior option appears and records adjustment choice keep 0ms
     × dispatches when a superior option appears and records adjustment choice change 0ms
     × skips the D443-style adjustment when material bookkeeping changed but the retained plan stayed legal and non-dominated (mutation: always dispatch) 0ms
     × dispatches an adjustment when the retained primary becomes illegal 0ms
     × rejects a speculative context actor mismatch before model dispatch 0ms
     × never authorizes a row when execution throws before its first completed turn (mutation: authorized before the loop) 0ms
     × records partial_execution when execution throws after a completed PC turn 0ms
     × discards speculation when the actual board invalidates the planned option structure 0ms
     × aborts the cell when speculation recalculation infrastructure fails after staging output 0ms
     × retains diagnosed speculative infrastructure at the end-of-round join 0ms
     × retains diagnosed speculative infrastructure at the exception-cleanup join 0ms
     × terminates incomplete speculation with a failed rebase without repeating the initiative loop 0ms
     × aborts speculative planning at the D407 pacing deadline 0ms
     × discards a speculative proposal staged before timeout without authorizing it 0ms
     × does not spend a second adjustment flap budget when preflight finds no material plan change 0ms
     × runs one adjustment correction and retains the corrected replacement 0ms
     × stamps speculation recalculation launchers with the speculative dispatch phase 0ms
     × keeps the baseline after three adjustment service nulls and continues the round 0ms
     × ignores a staged adjustment proposal after timeout and retains the authorized baseline 0ms
     × records adjustment timeout evidence before applying the expired round deadline 0ms
     × ignores an adjustment correction proposal staged before timeout and retains the authorized baseline 0ms
     × treats adjustment correction no-response as protocol exhaustion, not a flap 0ms
 ✓ tests/unit/combat/visibility-field.test.ts (46 tests) 33ms
 ✓ tests/unit/vtt/tactical-evaluator-r02.test.ts (2 tests) 352ms
     ✓ compares ordered registry allocations with exact post-grant Bless conditioning  348ms
 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests) 46ms
 ✓ tests/unit/vtt/dm-tactical-intel.test.ts (6 tests) 3367ms
     ✓ renders target-specific non-nearest R02 rows in always-on context with exact reasons  688ms
     ✓ paginates the full matrix with a state-bound cursor and advertises the read tool to the DM  407ms
     ✓ renders the failure manifest only in the DM profile and retains the 32 KiB trim  1155ms
     ✓ attaches full-precision offered-set and all intel policy versions to accepted capture  618ms
 ✓ tests/unit/vtt/two-room-fixture.test.ts (4 tests) 201ms

⎯⎯⎯⎯⎯⎯ Failed Tests 97 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists indeterminate artifact and forensic row before raising the typed integrity STOP
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-integrity-stop-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1023:23
    1021|
    1022|   it('persists indeterminate artifact and forensic row before raising …
    1023|     const directory = mkdtempSync(join(tmpdir(), 'd569-integrity-stop-…
       |                       ^
    1024|     const launcherPath = join(directory, 'launcher.json');
    1025|     const proposalSpoolPath = join(directory, 'proposal.jsonl');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > classifies a timeout after catalog observation but before a tool call without an integrity STOP
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-runner-catalog-timeout-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1079:23
    1077|
    1078|   it('classifies a timeout after catalog observation but before a tool…
    1079|     const directory = mkdtempSync(join(tmpdir(), 'd569-runner-catalog-…
       |                       ^
    1080|     const outPath = join(directory, 'rows.jsonl');
    1081|     const boardSnapshotService: ConversationBoardSnapshotService = {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists primary D569 timeout evidence before applying the expired round deadline
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-primary-expired-evidence-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1144:23
    1142|
    1143|   it('persists primary D569 timeout evidence before applying the expir…
    1144|     const directory = mkdtempSync(join(tmpdir(), 'd569-primary-expired…
       |                       ^
    1145|     const outPath = join(directory, 'rows.jsonl');
    1146|     let policyMs = 0;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with a contradictory catalog
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-timed_out-catalog-integrity-XXXXXX'
 ❯ runIncompleteCatalogIntegrityStop tests/unit/tools/ai-dm-conversation.test.ts:488:21
    486|   readonly launcher: EngineMcpLauncherManifest;
    487| }> {
    488|   const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-i…
       |                     ^
    489|   const outPath = join(directory, 'rows.jsonl');
    490|   let launcherPath: string | null = null;
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1180:49

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with a contradictory catalog
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-cancelled-catalog-integrity-XXXXXX'
 ❯ runIncompleteCatalogIntegrityStop tests/unit/tools/ai-dm-conversation.test.ts:488:21
    486|   readonly launcher: EngineMcpLauncherManifest;
    487| }> {
    488|   const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-i…
       |                     ^
    489|   const outPath = join(directory, 'rows.jsonl');
    490|   let launcherPath: string | null = null;
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1180:49

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with an invalid malformed catalog
 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a timed_out dispatch with an invalid wrong_profile catalog
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-timed_out-catalog-integrity-XXXXXX'
 ❯ runIncompleteCatalogIntegrityStop tests/unit/tools/ai-dm-conversation.test.ts:488:21
    486|   readonly launcher: EngineMcpLauncherManifest;
    487| }> {
    488|   const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-i…
       |                     ^
    489|   const outPath = join(directory, 'rows.jsonl');
    490|   let launcherPath: string | null = null;
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1215:49

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with an invalid malformed catalog
 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists forensic evidence and STOPs on a cancelled dispatch with an invalid wrong_profile catalog
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-cancelled-catalog-integrity-XXXXXX'
 ❯ runIncompleteCatalogIntegrityStop tests/unit/tools/ai-dm-conversation.test.ts:488:21
    486|   readonly launcher: EngineMcpLauncherManifest;
    487| }> {
    488|   const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-i…
       |                     ^
    489|   const outPath = join(directory, 'rows.jsonl');
    490|   let launcherPath: string | null = null;
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1215:49

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists a runner forensic row before propagating conflicting startup evidence
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-infrastructure_failed-catalog-integrity-XXXXXX'
 ❯ runIncompleteCatalogIntegrityStop tests/unit/tools/ai-dm-conversation.test.ts:488:21
    486|   readonly launcher: EngineMcpLauncherManifest;
    487| }> {
    488|   const directory = mkdtempSync(join(tmpdir(), `d569-${exit}-catalog-i…
       |                     ^
    489|   const outPath = join(directory, 'rows.jsonl');
    490|   let launcherPath: string | null = null;
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1243:47

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > persists delivered context and process evidence before propagating conflicting startup evidence
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-runner-startup-integrity-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1267:23
    1265|
    1266|   it('persists delivered context and process evidence before propagati…
    1267|     const directory = mkdtempSync(join(tmpdir(), 'd569-runner-startup-…
       |                       ^
    1268|     const outPath = join(directory, 'rows.jsonl');
    1269|     let launcherToken: string | null = null;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects a request after the MCP child closes stdin without an unhandled EPIPE
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1323:3
    1321|   });
    1322|
    1323|   it('rejects a request after the MCP child closes stdin without an un…
       |   ^
    1324|     const child = spawn(process.execPath, ['-e', [
    1325|       "process.on('SIGTERM', () => {});",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects on stdout closure and terminates a child that remains alive
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1386:3
    1384|   });
    1385|
    1386|   it('rejects on stdout closure and terminates a child that remains al…
       |   ^
    1387|     const child = spawn(process.execPath, ['-e', [
    1388|       'process.stdin.resume();',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes a serialized revision-bound Dodge proposal
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-serialized-dodge-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1455:23
    1453|
    1454|   it('authorizes a serialized revision-bound Dodge proposal', { timeou…
    1455|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ser…
       |                       ^
    1456|     const adapter = new SerializedRoundTripAdapter('use_action_dodge',…
    1457|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes targeted Web and non-targeted Dodge through composite options
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-serialized-web-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1491:23
    1489|
    1490|   it('authorizes targeted Web and non-targeted Dodge through composite…
    1491|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ser…
       |                       ^
    1492|     const adapter = new SerializedRoundTripAdapter('targeted_web');
    1493|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > round-trips the End Turn option emitted by the tactical context
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-serialized-end-turn-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1512:23
    1510|
    1511|   it('round-trips the End Turn option emitted by the tactical context'…
    1512|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ser…
       |                       ^
    1513|     const adapter = new SerializedRoundTripAdapter('option_shaped_end_…
    1514|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > wall begins before initial without speculation
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-round-wall-start-XXXXXX'
 ❯ produce tests/unit/tools/ai-dm-conversation.test.ts:1557:25
    1555|     };
    1556|     const produce = async (roundDeadlineFactory: typeof createConversa…
    1557|       const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-r…
       |                         ^
    1558|       const adapter = new RecordingConversationAdapter();
    1559|       let policyMs = 0;
 ❯ producerMutationReceipt tests/unit/tools/ai-dm-conversation.test.ts:1007:21
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1594:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > speculation uses arm base until trigger
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-speculation-base-XXXXXX'
 ❯ produce tests/unit/tools/ai-dm-conversation.test.ts:1609:36
    1607|     const roomState = await minimalAlternatingInitiativeRoom();
    1608|     const produce = async (selectSpeculationPlanner: SpeculationSelect…
    1609|       const speculationDirectory = mkdtempSync(join(tmpdir(), 'dnd-con…
       |                                    ^
    1610|       const speculationAdapter = new SerializedRoundTripAdapter('attac…
    1611|       const speculative = await runConversation(parseConversationArgs([
 ❯ producerMutationReceipt tests/unit/tools/ai-dm-conversation.test.ts:1007:21
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1641:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > restricted wall excludes engine work and includes later speculation
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-restricted-wall-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1674:23
    1672|
    1673|   it('restricted wall excludes engine work and includes later speculat…
    1674|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-res…
       |                       ^
    1675|     const adapter = new SerializedRoundTripAdapter('first_shown');
    1676|     let policyMs = 0;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > fallback computation of 1000 ms remains outside the restricted wall
 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > fallback computation of 200000 ms remains outside the restricted wall
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-fallback-wall-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1708:25
    1706|     'fallback computation of %i ms remains outside the restricted wall…
    1707|     async (fallbackWorkMs) => {
    1708|       const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-f…
       |                         ^
    1709|       const adapter = new SerializedRoundTripAdapter('invalid_initial_…
    1710|       let policyMs = 0;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > expired speculative adoption validation cannot adopt or execute that branch
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-adoption-deadline-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1736:23
    1734|
    1735|   it('expired speculative adoption validation cannot adopt or execute …
    1736|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ado…
       |                       ^
    1737|     const outPath = join(directory, 'rows.jsonl');
    1738|     const adapter = new SerializedRoundTripAdapter('first_shown');

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > expired recalculation authorization cannot retain or execute recalculated entries on the real path
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-recalculation-deadline-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1776:23
    1774|
    1775|   it('expired recalculation authorization cannot retain or execute rec…
    1776|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-rec…
       |                       ^
    1777|     const adapter = new SerializedRoundTripAdapter('attack');
    1778|     let policyMs = 0;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > one rejected submission uses arm-base correction before D474 escalation
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-rejected-submission-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1816:23
    1814|
    1815|   it('one rejected submission uses arm-base correction before D474 esc…
    1816|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-rej…
       |                       ^
    1817|     const adapter = new BoilerplateThenValidStructuredFinalAdapter();
    1818|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > empty structured correction is not D474 validation evidence on the real path
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-empty-structured-correction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1843:23
    1841|
    1842|   it('empty structured correction is not D474 validation evidence on t…
    1843|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-emp…
       |                       ^
    1844|     const adapter = new BoilerplateThenValidStructuredFinalAdapter('em…
    1845|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > correction refusal triggers a fresh D474 escalation on the real path
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-correction-refusal-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1868:23
    1866|
    1867|   it('correction refusal triggers a fresh D474 escalation on the real …
    1868|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cor…
       |                       ^
    1869|     const adapter = new BoilerplateThenValidStructuredFinalAdapter('re…
    1870|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > actual refusal is the only single-attempt D474 trigger
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-explicit-refusal-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1896:23
    1894|
    1895|   it('actual refusal is the only single-attempt D474 trigger', async (…
    1896|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-exp…
       |                       ^
    1897|     const adapter = new SerializedRoundTripAdapter('explicit_refusal_t…
    1898|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps tiered primary argv/config byte-identical and isolates escalation from the base session
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-primary-untiered-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1923:31
    1921|
    1922|   it('keeps tiered primary argv/config byte-identical and isolates esc…
    1923|     const untieredDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversa…
       |                               ^
    1924|     const tieredDirectory = mkdtempSync(join(tmpdir(), 'dnd-conversati…
    1925|     const untieredAdapter = new SerializedRoundTripAdapter('invalid_th…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > constructs no escalation adapter or bootstrap for the exact post-shift no-flag control shape (mutation: implicit escalation default)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-no-escalation-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:1981:23
    1979|
    1980|   it('constructs no escalation adapter or bootstrap for the exact post…
    1981|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-no-…
       |                       ^
    1982|     const adapter = new SerializedRoundTripAdapter('invalid_then_dodge…
    1983|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps one sitting across rooms, rolls only at threshold, and explicit end prevents resume
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-sitting-rollover-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2008:23
    2006|
    2007|   it('keeps one sitting across rooms, rolls only at threshold, and exp…
    2008|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sit…
       |                       ^
    2009|     const adapter = new SerializedRoundTripAdapter('first_shown', [1_0…
    2010|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a 'tiered' correction using actual dispatch bookkeeping
 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > routes a 'untiered' correction using actual dispatch bookkeeping
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-tiered-correction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2082:25
    2080|     { timeout: 60_000 },
    2081|     async ({ choice, escalationArgs, expectedPlanner, expectedEscalate…
    2082|       const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-t…
       |                         ^
    2083|       const adapter = new SerializedRoundTripAdapter(choice);
    2084|       const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes a serialized MCP attack proposal
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-serialized-attack-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2121:23
    2119|
    2120|   it('authorizes a serialized MCP attack proposal', { timeout: 60_000 …
    2121|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ser…
       |                       ^
    2122|     const adapter = new SerializedRoundTripAdapter('attack');
    2123|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > requests full context for round one and a delta for a resumed later round
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-round-delta-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2156:23
    2154|
    2155|   it('requests full context for round one and a delta for a resumed la…
    2156|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-rou…
       |                       ^
    2157|     const adapter = new SerializedRoundTripAdapter('first_shown');
    2158|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > preserves accepted suggested composite proposals in the authorized SIMULATED row
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-accepted-fallback-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2182:23
    2180|
    2181|   it('preserves accepted suggested composite proposals in the authoriz…
    2182|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-acc…
       |                       ^
    2183|     const outPath = join(directory, 'rows.jsonl');
    2184|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[31/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes generated room 3943004 through the real host after resolving boundary decisions
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-generated-3943004-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2457:25
    2455|     { timeout: 60_000 },
    2456|     async (seed) => {
    2457|       const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-g…
       |                         ^
    2458|       const generatedState = generateRoom(seed).encounter.state;
    2459|       const prepared = preparedMonsterRoundRevision(generatedState);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[32/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > authorizes generated room 3943007 through the real host after resolving boundary decisions
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-generated-3943007-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2457:25
    2455|     { timeout: 60_000 },
    2456|     async (seed) => {
    2457|       const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-g…
       |                         ^
    2458|       const generatedState = generateRoom(seed).encounter.state;
    2459|       const prepared = preparedMonsterRoundRevision(generatedState);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[33/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > auto-resolves an unattended ask Reaction with the decline policy and authorizes the SIMULATED arena round
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-reaction-decline-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2493:25
    2491|     { timeout: 60_000 },
    2492|     async (askDefault, resolution) => {
    2493|       const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-r…
       |                         ^
    2494|       const store = new MemoryBrowserSessionStore();
    2495|       const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[34/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > auto-resolves an unattended ask Reaction with the take policy and authorizes the SIMULATED arena round
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-reaction-take-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2493:25
    2491|     { timeout: 60_000 },
    2492|     async (askDefault, resolution) => {
    2493|       const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-r…
       |                         ^
    2494|       const store = new MemoryBrowserSessionStore();
    2495|       const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[35/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > restores sticky side-wide guidance across a room transition and resolves a pending offer before dispatch
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-sticky-reaction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2527:23
    2525|
    2526|   it('restores sticky side-wide guidance across a room transition and …
    2527|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-sti…
       |                       ^
    2528|     const store = new MemoryBrowserSessionStore();
    2529|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[36/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > falls back to unattended toggle policy when sticky guidance does not cover the pending trigger
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-uncovered-reaction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2564:23
    2562|
    2563|   it('falls back to unattended toggle policy when sticky guidance does…
    2564|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unc…
       |                       ^
    2565|     const store = new MemoryBrowserSessionStore();
    2566|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[37/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps one SIMULATED session across two rooms, one correction, and a browser restore
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2591:23
    2589|
    2590|   it('keeps one SIMULATED session across two rooms, one correction, an…
    2591|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-'));
       |                       ^
    2592|     const outPath = join(directory, 'rows.jsonl');
    2593|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[38/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses sim_controller and records a typed block when an unresolved frontier prevents auto-submit
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-unresolved-frontier-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2736:23
    2734|
    2735|   it('uses sim_controller and records a typed block when an unresolved…
    2736|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-unr…
       |                       ^
    2737|     // D635's row-line-2 seam at (10,1)/(10,2) blocks monster-2's Spea…
    2738|     // move to (13,1); changing that blocker then exposes monster-5's …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'no proposal' from the stub adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-fallback-no_proposal-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2831:23
    2829|     hard,
    2830|   }) => {
    2831|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fal…
       |                       ^
    2832|     const rounds = expected === 'timeout' ? 2 : 1;
    2833|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[40/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'validation exhaustion' from the stub adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-fallback-validation_exhausted-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2831:23
    2829|     hard,
    2830|   }) => {
    2831|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fal…
       |                       ^
    2832|     const rounds = expected === 'timeout' ? 2 : 1;
    2833|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[41/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'blocked auto-submit' from the stub adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-fallback-auto_submit_blocked-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2831:23
    2829|     hard,
    2830|   }) => {
    2831|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fal…
       |                       ^
    2832|     const rounds = expected === 'timeout' ? 2 : 1;
    2833|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[42/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records typed fallbackReason for 'timeout' from the stub adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-fallback-timeout-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2831:23
    2829|     hard,
    2830|   }) => {
    2831|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-fal…
       |                       ^
    2832|     const rounds = expected === 'timeout' ? 2 : 1;
    2833|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[43/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > hidden_options_logged_once: records every hidden option once with engine-state knowledge and stationary Disengage reasons
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-hidden-options-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2935:23
    2933|
    2934|   it('hidden_options_logged_once: records every hidden option once wit…
    2935|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-hid…
       |                       ^
    2936|     const outPath = join(directory, 'rows.jsonl');
    2937|     const hiddenActor = monsterProfile('hidden-options-actor', { initi…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[44/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free stdio MCP dry-run smoke (mutation: count tool calls as KB reads)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-smoke-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2971:23
    2969|
    2970|   it('runs a model-free stdio MCP dry-run smoke (mutation: count tool …
    2971|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-smo…
       |                       ^
    2972|     const outPath = join(directory, 'rows.jsonl');
    2973|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[45/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a three-room three-round model-free brutal smoke with the stub adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-3round-smoke-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:2999:23
    2997|
    2998|   it('runs a three-room three-round model-free brutal smoke with the s…
    2999|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-3ro…
       |                       ^
    3000|     const config = parseConversationArgs([
    3001|       '--fixtures', 'tests/fixtures/arena-basis-brutal',

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[46/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retries one SIMULATED service flap and uses the first healthy primary turn
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-flap-recovery-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3032:23
    3030|
    3031|   it('retries one SIMULATED service flap and uses the first healthy pr…
    3032|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fla…
       |                       ^
    3033|     const config = parseConversationArgs([
    3034|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[47/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > marks three consecutive SIMULATED service flaps as service_null without exhausting the turn
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-service-null-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3052:23
    3050|
    3051|   it('marks three consecutive SIMULATED service flaps as service_null …
    3052|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ser…
       |                       ^
    3053|     const config = parseConversationArgs([
    3054|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[48/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not retry a SIMULATED primary turn that called engine tools before rejection
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-engine-rejection-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3075:23
    3073|
    3074|   it('does not retry a SIMULATED primary turn that called engine tools…
    3075|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-eng…
       |                       ^
    3076|     const config = parseConversationArgs([
    3077|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[49/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records when the configured turn-context trimmer fired
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-context-trim-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3102:23
    3100|
    3101|   it('records when the configured turn-context trimmer fired', { timeo…
    3102|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-con…
       |                       ^
    3103|     const config = parseConversationArgs([
    3104|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[50/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > injects the root and tactics pair byte-for-byte only on cold start and attributes its hash
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-kb-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3153:23
    3151|
    3152|   it('injects the root and tactics pair byte-for-byte only on cold sta…
    3153|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-kb-…
       |                       ^
    3154|     const outPath = join(directory, 'rows.jsonl');
    3155|     const root = kbInputs.fixtures.readText('tests/fixtures/ai-dm-kb/a…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[51/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > threads a selected skill through every invocation and hashes the exact fixture bytes
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-skill-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3206:23
    3204|
    3205|   it('threads a selected skill through every invocation and hashes the…
    3206|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ski…
       |                       ^
    3207|     const adapter = new RecordingConversationAdapter();
    3208|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[52/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free none instruction-source smoke through a SIMULATED adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-none-smoke-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3238:23
    3236|     sourceArgs,
    3237|   ) => {
    3238|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-${s…
       |                       ^
    3239|     const adapter = new SerializedRoundTripAdapter('attack');
    3240|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[53/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free kb instruction-source smoke through a SIMULATED adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-kb-smoke-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3238:23
    3236|     sourceArgs,
    3237|   ) => {
    3238|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-${s…
       |                       ^
    3239|     const adapter = new SerializedRoundTripAdapter('attack');
    3240|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[54/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs a model-free skill instruction-source smoke through a SIMULATED adapter
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-skill-smoke-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3238:23
    3236|     sourceArgs,
    3237|   ) => {
    3238|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-${s…
       |                       ^
    3239|     const adapter = new SerializedRoundTripAdapter('attack');
    3240|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[55/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > starts the persistent SIMULATED session with the first round plan in one model dispatch
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-cold-plan-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3259:23
    3257|
    3258|   it('starts the persistent SIMULATED session with the first round pla…
    3259|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-col…
       |                       ^
    3260|     const outPath = join(directory, 'rows.jsonl');
    3261|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[56/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > queues a schema-final indexed decision through the same engine round path (mutation: parse valid final output but do not queue it)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3295:23
    3293|
    3294|   it('queues a schema-final indexed decision through the same engine r…
    3295|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3296|     const result = await runConversation(parseConversationArgs([
    3297|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[57/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects audited boilerplate at structured-final ingress before accepting a substantive correction
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-reason-gate-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3326:23
    3324|
    3325|   it('rejects audited boilerplate at structured-final ingress before a…
    3326|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3327|     const adapter = new BoilerplateThenValidStructuredFinalAdapter();
    3328|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[58/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > censors a cancelled structured-final turn as decision_timeout (mutation: classify cancelled final output as decision_missing)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-timeout-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3356:23
    3354|
    3355|   it('censors a cancelled structured-final turn as decision_timeout (m…
    3356|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3357|     const result = await runConversation(parseConversationArgs([
    3358|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[59/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records the actor chosen index for recommendation-anchor measurement (mutation: omit chosen index from final row)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-indices-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3369:23
    3367|
    3368|   it('records the actor chosen index for recommendation-anchor measure…
    3369|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3370|     const outPath = join(directory, 'rows.jsonl');
    3371|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[60/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > passes a persisted final-index row through packet validation
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-packet-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3389:23
    3387|
    3388|   it('passes a persisted final-index row through packet validation', {…
    3389|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3390|     const outPath = join(directory, 'rows.jsonl');
    3391|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[61/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records no chosen indices when no final-index decision is accepted
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-exhausted-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3412:23
    3410|
    3411|   it('records no chosen indices when no final-index decision is accept…
    3412|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3413|     const outPath = join(directory, 'rows.jsonl');
    3414|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[62/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records a missing final decision explicitly and repairs it with the same indexed correction shape (mutation: classify final absence as service_null)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-correction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3446:23
    3444|
    3445|   it('records a missing final decision explicitly and repairs it with …
    3446|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3447|     const result = await runConversation(parseConversationArgs([
    3448|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[63/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > uses the same indexed final contract for a G2-preflighted adjustment (mutation: send an adjustment through MCP)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-adjustment-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3468:23
    3466|
    3467|   it('uses the same indexed final contract for a G2-preflighted adjust…
    3468|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3469|     const config = parseConversationArgs([
    3470|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[64/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > repairs an indexed adjustment through the same correction ingress (mutation: use a tool-driven adjustment correction)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-final-indices-adjustment-correction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3507:23
    3505|
    3506|   it('repairs an indexed adjustment through the same correction ingres…
    3507|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-fin…
       |                       ^
    3508|     const config = parseConversationArgs([
    3509|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[65/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > admits the active process and local OpenAI conversation adapters
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-cli-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3554:23
    3552|
    3553|   it('admits the active process and local OpenAI conversation adapters…
    3554|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-cli…
       |                       ^
    3555|     const outPath = join(directory, 'rows.jsonl');
    3556|     const defaults = parseConversationArgs(['--rooms', '1', '--out', o…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[66/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > parses the D569 mode, repair, attempt, fact, cap, timeout, and judge-model combinations
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-blind-parse-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3641:23
    3639|
    3640|   it('parses the D569 mode, repair, attempt, fact, cap, timeout, and j…
    3641|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-bli…
       |                       ^
    3642|     const outPath = join(directory, 'rows.jsonl');
    3643|     const common = ['--rooms', '1', '--out', outPath, '--dm-mode', 'bl…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[67/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > derives per-combatant initiative for standalone fixtures and rejects an explicit legacy profile
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-fixture-constraint-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3675:23
    3673|
    3674|   it('derives per-combatant initiative for standalone fixtures and rej…
    3675|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    3676|     const result = await runConversation(parseConversationArgs([
    3677|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'deriv…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[68/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > walks an alternating initiative fixture without waking the DM for HP-only drift
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-no-drift-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3694:23
    3692|
    3693|   it('walks an alternating initiative fixture without waking the DM fo…
    3694|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    3695|     const config = parseConversationArgs([
    3696|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[69/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ends a three-round room as party_defeated when all PCs are dead entering the party segment
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-party-defeated-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3772:23
    3770|
    3771|   it('ends a three-round room as party_defeated when all PCs are dead …
    3772|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-par…
       |                       ^
    3773|     const base = await alternatingInitiativeRoom();
    3774|     const defeated: EncounterState = {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[70/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs three rounds with a one-round party program by recording typed default turns
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-party-default-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3796:23
    3794|
    3795|   it('runs three rounds with a one-round party program by recording ty…
    3796|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-par…
       |                       ^
    3797|     const base = await alternatingInitiativeRoom({ monsterHitPoints: 1…
    3798|     const durable: EncounterState = {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[71/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches when a superior option appears and records adjustment choice keep
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-keep-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3834:23
    3832|     ['change', 'adjusted'],
    3833|   ] as const)('dispatches when a superior option appears and records a…
    3834|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-seg…
       |                       ^
    3835|     const config = parseConversationArgs([
    3836|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[72/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches when a superior option appears and records adjustment choice change
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-change-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3834:23
    3832|     ['change', 'adjusted'],
    3833|   ] as const)('dispatches when a superior option appears and records a…
    3834|     const directory = mkdtempSync(join(tmpdir(), `dnd-conversation-seg…
       |                       ^
    3835|     const config = parseConversationArgs([
    3836|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[73/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > skips the D443-style adjustment when material bookkeeping changed but the retained plan stayed legal and non-dominated (mutation: always dispatch)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-symmetric-material-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3911:23
    3909|
    3910|   it('skips the D443-style adjustment when material bookkeeping change…
    3911|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    3912|     const config = parseConversationArgs([
    3913|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[74/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > dispatches an adjustment when the retained primary becomes illegal
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-illegal-primary-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:3984:23
    3982|
    3983|   it('dispatches an adjustment when the retained primary becomes illeg…
    3984|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-ill…
       |                       ^
    3985|     const config = parseConversationArgs([
    3986|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[75/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > rejects a speculative context actor mismatch before model dispatch
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-speculation-context-mismatch-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4010:23
    4008|
    4009|   it('rejects a speculative context actor mismatch before model dispat…
    4010|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-spe…
       |                       ^
    4011|     const config = parseConversationArgs([
    4012|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[76/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > never authorizes a row when execution throws before its first completed turn (mutation: authorized before the loop)
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-execution-failed-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4031:23
    4029|
    4030|   it('never authorizes a row when execution throws before its first co…
    4031|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-exe…
       |                       ^
    4032|     const config = parseConversationArgs([
    4033|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[77/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records partial_execution when execution throws after a completed PC turn
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-partial-execution-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4055:23
    4053|
    4054|   it('records partial_execution when execution throws after a complete…
    4055|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-par…
       |                       ^
    4056|     const config = parseConversationArgs([
    4057|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[78/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > discards speculation when the actual board invalidates the planned option structure
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-speculation-material-change-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4074:23
    4072|
    4073|   it('discards speculation when the actual board invalidates the plann…
    4074|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-spe…
       |                       ^
    4075|     const config = parseConversationArgs([
    4076|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[79/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > aborts the cell when speculation recalculation infrastructure fails after staging output
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-speculation-recalc-infrastructure-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4104:23
    4102|
    4103|   it('aborts the cell when speculation recalculation infrastructure fa…
    4104|     const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-rec…
       |                       ^
    4105|     let mutated = false;
    4106|     let policyMs = 0;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[80/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retains diagnosed speculative infrastructure at the end-of-round join
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-speculation-end-of-round-join-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4149:23
    4147|     ['exception-cleanup', { failAfterSpeculationStartForTest: true }],
    4148|   ] as const)('retains diagnosed speculative infrastructure at the %s …
    4149|     const directory = mkdtempSync(join(tmpdir(), `d569-speculation-${_…
       |                       ^
    4150|     let policyMs = 0;
    4151|     let observedSpeculationExit: AgentTurnResult['exit'] | null = null;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[81/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > retains diagnosed speculative infrastructure at the exception-cleanup join
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-speculation-exception-cleanup-join-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4149:23
    4147|     ['exception-cleanup', { failAfterSpeculationStartForTest: true }],
    4148|   ] as const)('retains diagnosed speculative infrastructure at the %s …
    4149|     const directory = mkdtempSync(join(tmpdir(), `d569-speculation-${_…
       |                       ^
    4150|     let policyMs = 0;
    4151|     let observedSpeculationExit: AgentTurnResult['exit'] | null = null;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[82/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > terminates incomplete speculation with a failed rebase without repeating the initiative loop
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-speculation-failed-rebase-terminal-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4178:23
    4176|
    4177|   it('terminates incomplete speculation with a failed rebase without r…
    4178|     const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-fai…
       |                       ^
    4179|     let iterations = 0;
    4180|     const result = await runConversation(parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[83/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > aborts speculative planning at the D407 pacing deadline
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-speculation-budget-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4203:23
    4201|
    4202|   it('aborts speculative planning at the D407 pacing deadline', { time…
    4203|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-spe…
       |                       ^
    4204|     const config = parseConversationArgs([
    4205|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[84/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > discards a speculative proposal staged before timeout without authorizing it
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-speculation-staged-timeout-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4228:23
    4226|
    4227|   it('discards a speculative proposal staged before timeout without au…
    4228|     const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-sta…
       |                       ^
    4229|     const result = await runConversation(parseConversationArgs([
    4230|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[85/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > does not spend a second adjustment flap budget when preflight finds no material plan change
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-independent-flaps-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4247:23
    4245|
    4246|   it('does not spend a second adjustment flap budget when preflight fi…
    4247|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    4248|     const config = parseConversationArgs([
    4249|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[86/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > runs one adjustment correction and retains the corrected replacement
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-correction-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4312:23
    4310|
    4311|   it('runs one adjustment correction and retains the corrected replace…
    4312|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    4313|     const phaseInvocations: AgentInvocation[] = [];
    4314|     const config = parseConversationArgs([

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[87/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > stamps speculation recalculation launchers with the speculative dispatch phase
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-speculation-recalc-phase-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4351:23
    4349|
    4350|   it('stamps speculation recalculation launchers with the speculative …
    4351|     const directory = mkdtempSync(join(tmpdir(), 'd569-speculation-rec…
       |                       ^
    4352|     const invocations: AgentInvocation[] = [];
    4353|     let mutated = false;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[88/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > keeps the baseline after three adjustment service nulls and continues the round
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-service-null-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4376:23
    4374|
    4375|   it('keeps the baseline after three adjustment service nulls and cont…
    4376|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    4377|     const config = parseConversationArgs([
    4378|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[89/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ignores a staged adjustment proposal after timeout and retains the authorized baseline
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-adjustment-staged-timeout-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4399:23
    4397|
    4398|   it('ignores a staged adjustment proposal after timeout and retains t…
    4399|     const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-stag…
       |                       ^
    4400|     const result = await runConversationWithPartyPolicy('heuristic_v0'…
    4401|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[90/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > records adjustment timeout evidence before applying the expired round deadline
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-adjustment-expired-evidence-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4423:23
    4421|
    4422|   it('records adjustment timeout evidence before applying the expired …
    4423|     const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-expi…
       |                       ^
    4424|     let policyMs = 0;
    4425|     let observedAdjustmentExit: AgentTurnResult['exit'] | null = null;

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[91/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > ignores an adjustment correction proposal staged before timeout and retains the authorized baseline
Error: EROFS: read-only file system, mkdtemp '/tmp/d569-adjustment-correction-staged-timeout-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4457:23
    4455|
    4456|   it('ignores an adjustment correction proposal staged before timeout …
    4457|     const directory = mkdtempSync(join(tmpdir(), 'd569-adjustment-corr…
       |                       ^
    4458|     const result = await runConversationWithPartyPolicy('heuristic_v0'…
    4459|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[92/97]⎯

 FAIL  tests/unit/tools/ai-dm-conversation.test.ts > AI-DM engine MCP conversation runner > treats adjustment correction no-response as protocol exhaustion, not a flap
Error: EROFS: read-only file system, mkdtemp '/tmp/dnd-conversation-segments-correction-exhaustion-XXXXXX'
 ❯ tests/unit/tools/ai-dm-conversation.test.ts:4483:23
    4481|
    4482|   it('treats adjustment correction no-response as protocol exhaustion,…
    4483|     const directory = mkdtempSync(join(tmpdir(), 'dnd-conversation-seg…
       |                       ^
    4484|     const config = parseConversationArgs([
    4485|       '--rooms', '1', '--rounds', '1', '--out', join(directory, 'rows.…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[93/97]⎯


 Test Files  1 failed | 5 passed (6)
      Tests  97 failed | 79 passed (176)
   Start at  22:10:38
   Duration  19.08s (transform 1.83s, setup 0ms, import 3.80s, tests 15.10s, environment 0ms)


exec
/bin/bash -lc 'git show e86a4d26:src/combat/cover.ts' in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
import { combatantSpace, combatantSpaceAt } from './combat-rules';
import type { EncounterState } from './encounter';
import type { GridCell } from './grid';
import { coverRank, type CoverTier } from './terrain';
import type { CombatantId } from './values';
import type { WorldObject } from './world-objects';

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function compareCells(left: GridCell, right: GridCell): number {
  return left.row - right.row || left.column - right.column;
}

/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */
export function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));
  if (steps <= 1) return [];
  const result: GridCell[] = [];
  const seen = new Set<string>();
  for (let step = 1; step < steps; step += 1) {
    const cell = {
      column: Math.round(from.column + columnDelta * step / steps),
      row: Math.round(from.row + rowDelta * step / steps),
    };
    const key = cellKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(cell);
    }
  }
  return result;
}

function objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {
  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));
}

export interface CornerPoint {
  readonly column: number;
  readonly row: number;
}

/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */
export function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {
  const first = cells[0];
  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');
  let minimumColumn = first.column;
  let maximumColumn = first.column + 1;
  let minimumRow = first.row;
  let maximumRow = first.row + 1;
  for (let index = 1; index < cells.length; index += 1) {
    const cell = cells[index];
    if (cell === undefined) continue;
    minimumColumn = Math.min(minimumColumn, cell.column);
    maximumColumn = Math.max(maximumColumn, cell.column + 1);
    minimumRow = Math.min(minimumRow, cell.row);
    maximumRow = Math.max(maximumRow, cell.row + 1);
  }
  return [
    { column: minimumColumn, row: minimumRow },
    { column: maximumColumn, row: minimumRow },
    { column: minimumColumn, row: maximumRow },
    { column: maximumColumn, row: maximumRow },
  ];
}

/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */
export function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {
  const epsilon = 1e-9;
  let entry = 0;
  let exit = 1;
  const columnDelta = to.column - from.column;
  const minimumColumn = cell.column + epsilon;
  const maximumColumn = cell.column + 1 - epsilon;
  if (columnDelta === 0) {
    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;
  } else {
    const first = (minimumColumn - from.column) / columnDelta;
    const second = (maximumColumn - from.column) / columnDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  const rowDelta = to.row - from.row;
  const minimumRow = cell.row + epsilon;
  const maximumRow = cell.row + 1 - epsilon;
  if (rowDelta === 0) {
    if (from.row <= minimumRow || from.row >= maximumRow) return false;
  } else {
    const first = (minimumRow - from.row) / rowDelta;
    const second = (maximumRow - from.row) / rowDelta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return entry <= exit && exit > 0 && entry < 1;
}

function lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {
  const columnDelta = to.column - from.column;
  const rowDelta = to.row - from.row;
  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;
  if (magnitudeSquared === 0) return 0;
  return (
    (cell.column + 0.5 - from.column) * columnDelta +
    (cell.row + 0.5 - from.row) * rowDelta
  ) / magnitudeSquared;
}

/** Rasterizes a corner ray in source-to-target traversal order. */
export function rasterizeCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  const crossed: GridCell[] = [];
  for (const cell of candidates) {
    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);
  }
  if (crossed.length > 1) {
    crossed.sort((left, right) =>
      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));
  }
  return crossed;
}

export interface TerrainLineSource {
  readonly kind: 'blocked_cell' | 'world_object' | 'creature';
  readonly id: string;
  readonly tier: Exclude<CoverTier, 'none'>;
}

export interface TerrainCornerLineTrace {
  readonly targetCorner: CornerPoint;
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineTrace {
  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */
  readonly sourceCell: GridCell;
  readonly targetCell: GridCell;
  readonly sourceCorner: CornerPoint;
  readonly lines: readonly TerrainCornerLineTrace[];
  readonly interveningCells: readonly GridCell[];
  readonly tier: CoverTier;
  readonly blocksSight: boolean;
  readonly sourceIds: readonly string[];
  readonly sources: readonly TerrainLineSource[];
  readonly firstBlockingCell: GridCell | null;
}

export interface TerrainLineOptions {
  readonly sourceId?: CombatantId;
  readonly targetId?: CombatantId;
  readonly includeCreatures?: boolean;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

function normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {
  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]
    .sort(compareCells);
}

function sightBlockingSignature(cells: readonly GridCell[]): string {
  return cells.map(cellKey).join(';');
}

function taggedSourceId(source: TerrainLineSource): string {
  switch (source.kind) {
    case 'blocked_cell': return `blocked:${source.id}`;
    case 'world_object': return `object:${source.id}`;
    case 'creature': return `creature:${source.id}`;
  }
}

interface TerrainSourceCell {
  readonly cell: GridCell;
  readonly sources: TerrainLineSource[];
}

function addSource(
  sourceCells: Map<string, TerrainSourceCell>,
  cell: GridCell,
  source: TerrainLineSource,
  exclusions: ReadonlySet<string>,
): void {
  const key = cellKey(cell);
  if (exclusions.has(key)) return;
  const existing = sourceCells.get(key);
  if (existing === undefined) {
    sourceCells.set(key, { cell: { ...cell }, sources: [source] });
  } else {
    existing.sources.push(source);
  }
}

interface TerrainSourceIndexes {
  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;
  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;
}

const terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();
const terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();
const terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();
const equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();
const EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;

function terrainSourceSignature(
  state: EncounterState,
  includeCreatures: boolean,
  indexedSources: ReadonlyMap<string, TerrainSourceCell>,
): string {
  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();
  const cached = stateSignatures.get(includeCreatures);
  if (cached !== undefined) return cached;
  const signature = [...indexedSources].map(([key, entry]) =>
    `${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join(',')}`)
    .join('|');
  stateSignatures.set(includeCreatures, signature);
  if (!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);
  return signature;
}

function retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {
  equivalentTerrainLineTraces.set(key, trace);
  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;
  const oldest = equivalentTerrainLineTraces.keys().next().value;
  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);
}

function buildTerrainSourceIndex(
  state: EncounterState,
  includeCreatures: boolean,
  terrain?: ReadonlyMap<string, TerrainSourceCell>,
): ReadonlyMap<string, TerrainSourceCell> {
  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined
    ? new Map<string, TerrainSourceCell>()
    : new Map([...terrain].map(([key, entry]) => [key, {
        cell: { ...entry.cell }, sources: [...entry.sources],
      }] as const));
  const exclusions = new Set<string>();
  if (terrain === undefined) {
    for (const cell of state.blockedCells) {
      addSource(sourceCells, cell, {
        kind: 'blocked_cell', id: `${String(cell.column)},${String(cell.row)}`, tier: 'total',
      }, exclusions);
    }
    for (const object of state.worldObjects) {
      if (object.blocking.cover === 'none') continue;
      for (const cell of object.footprint) {
        addSource(sourceCells, cell, {
          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,
        }, exclusions);
      }
    }
  }
  if (!includeCreatures) return sourceCells;
  for (const candidate of state.combatants) {
    const id = candidate.profile.id;
    if (candidate.life === 'dead') continue;
    if (!state.tokens.some((token) => token.combatantId === id)) continue;
    for (const cell of combatantSpace(state, id).cells) {
      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);
    }
  }
  return sourceCells;
}

function indexedTerrainSources(
  state: EncounterState,
  includeCreatures: boolean,
): ReadonlyMap<string, TerrainSourceCell> {
  const cached = terrainSourceIndexes.get(state);
  if (cached !== undefined) {
    if (!includeCreatures) return cached.terrain;
    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);
    cached.withCreatures = withCreatures;
    return withCreatures;
  }
  const terrain = buildTerrainSourceIndex(state, false);
  const entry: TerrainSourceIndexes = { terrain };
  terrainSourceIndexes.set(state, entry);
  if (!includeCreatures) return terrain;
  const withCreatures = buildTerrainSourceIndex(state, true, terrain);
  entry.withCreatures = withCreatures;
  return withCreatures;
}

function uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {
  return sources
    .filter((source, index, all) =>
      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)
    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));
}

function firstSharedEdgeBlockingCell(
  from: CornerPoint,
  to: CornerPoint,
  sightBlockingAt: (cell: GridCell) => boolean,
): GridCell | null {
  if (from.row === to.row && Number.isInteger(from.row)) {
    const direction = from.column < to.column ? 1 : -1;
    for (
      let column = direction === 1 ? from.column : from.column - 1;
      direction === 1 ? column < to.column : column >= to.column;
      column += direction
    ) {
      const upper = { column, row: from.row - 1 };
      const lower = { column, row: from.row };
      // Deterministic pair choice: the flanking cell with the lower row wins.
      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;
    }
  }
  if (from.column === to.column && Number.isInteger(from.column)) {
    const direction = from.row < to.row ? 1 : -1;
    for (
      let row = direction === 1 ? from.row : from.row - 1;
      direction === 1 ? row < to.row : row >= to.row;
      row += direction
    ) {
      const left = { column: from.column - 1, row };
      const right = { column: from.column, row };
      // Deterministic pair choice: the flanking cell with the lower column wins.
      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;
    }
  }
  return null;
}

function traceCornerLine(
  from: CornerPoint,
  to: CornerPoint,
  candidates: readonly GridCell[],
  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],
  sightBlockingAt: (cell: GridCell) => boolean,
): TerrainCornerLineTrace {
  const interveningCells = rasterizeCornerLine(from, to, candidates);
  let tier: CoverTier = 'none';
  let strongest: TerrainLineSource[] = [];
  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);
  for (const cell of interveningCells) {
    if (sightBlockingAt(cell) && firstBlockingCell === null) {
      firstBlockingCell = { ...cell };
    }
    for (const source of sourcesAt(cell)) {
      const comparison = coverRank(source.tier) - coverRank(tier);
      if (comparison > 0) {
        tier = source.tier;
        strongest = [source];
      } else if (comparison === 0) {
        strongest.push(source);
      }
    }
  }
  const sources = uniqueSources(strongest);
  return {
    targetCorner: { ...to },
    interveningCells,
    tier,
    blocksSight: firstBlockingCell !== null,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell,
  };
}

const COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];

function countTier(obstructedLineCount: number): CoverTier {
  if (obstructedLineCount === 0) return 'none';
  if (obstructedLineCount <= 2) return 'half';
  if (obstructedLineCount === 3) return 'three_quarters';
  return 'total';
}

function aggregateCornerLines(
  sourceCorner: CornerPoint,
  lines: readonly TerrainCornerLineTrace[],
  sourceCell: GridCell,
  targetCell: GridCell,
): TerrainLineTrace {
  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);
  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');
  const obstructed = lines.filter((line) => line.tier !== 'none');
  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>
    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');
  const tier = physicalBlocksCover
    ? 'total'
    : COVER_TIER_BY_RANK[Math.min(
        coverRank(countTier(obstructed.length)),
        coverRank(strongestLineTier),
        coverRank('three_quarters'),
      )] ?? 'none';
  const sources = tier === 'none'
    ? []
    : uniqueSources(obstructed
        .filter((line) => line.tier === strongestLineTier)
        .flatMap((line) => line.sources));
  const interveningCells = [...new Map(lines
    .flatMap((line) => line.interveningCells)
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;
  return {
    sourceCell: { ...sourceCell },
    targetCell: { ...targetCell },
    sourceCorner: { ...sourceCorner },
    lines,
    interveningCells,
    tier,
    blocksSight,
    sourceIds: sources.map(taggedSourceId),
    sources,
    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,
  };
}

function comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return coverRank(left.tier) - coverRank(right.tier) ||
    left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
}

function compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
  return left.sourceCorner.row - right.sourceCorner.row ||
    left.sourceCorner.column - right.sourceCorner.column;
}

function nearestCells(
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {
  const sources = [...sourceCells].sort(compareCells);
  const targets = [...targetCells].sort(compareCells);
  const firstSource = sources[0];
  const firstTarget = targets[0];
  if (firstSource === undefined || firstTarget === undefined) {
    throw new RangeError('A line query requires non-empty source and target spaces.');
  }
  let selectedSource = firstSource;
  let selectedTarget = firstTarget;
  let selectedDistance = Number.POSITIVE_INFINITY;
  for (const sourceCell of sources) {
    for (const targetCell of targets) {
      const distance = Math.max(
        Math.abs(sourceCell.column - targetCell.column),
        Math.abs(sourceCell.row - targetCell.row),
      );
      if (distance < selectedDistance) {
        selectedSource = sourceCell;
        selectedTarget = targetCell;
        selectedDistance = distance;
      }
    }
  }
  return { sourceCell: selectedSource, targetCell: selectedTarget };
}

function traceSpaces(
  state: EncounterState,
  sourceCells: readonly GridCell[],
  targetCells: readonly GridCell[],
  options: TerrainLineOptions,
): TerrainLineTrace {
  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);
  const blockerSignature = sightBlockingSignature(sightBlockingCells);
  const traceKey = `${options.includeCreatures === true ? 'creatures' : 'terrain'}:${sourceCells
    .map(cellKey).join(';')}->${targetCells.map(cellKey).join(';')}#sight:${blockerSignature}`;
  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  const cached = stateTraces.get(traceKey);
  if (cached !== undefined) return cached;
  if (!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);
  const nearest = nearestCells(sourceCells, targetCells);
  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));
  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);
  const equivalentTraceKey = `${terrainSourceSignature(
    state,
    options.includeCreatures === true,
    indexedSources,
  )}\0${traceKey}`;
  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);
  if (equivalent !== undefined) {
    stateTraces.set(traceKey, equivalent);
    return equivalent;
  }
  const sourceCorners = outerCorners(sourceCells);
  const targetCorners = outerCorners(targetCells);
  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);
  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);
  const minimumColumn = Math.min(...cornerColumns);
  const maximumColumn = Math.max(...cornerColumns);
  const minimumRow = Math.min(...cornerRows);
  const maximumRow = Math.max(...cornerRows);
  const candidateEntries = sightBlockingCells.length === 0
    ? [...indexedSources.values()]
    : [...new Map([
        ...indexedSources.values(),
        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),
      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];
  const candidates = candidateEntries
    .filter((entry) => !exclusions.has(cellKey(entry.cell)) &&
      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&
      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)
    .map((entry) => entry.cell);
  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));
  const sightBlockingAt = (cell: GridCell): boolean => {
    const key = cellKey(cell);
    return !exclusions.has(key) && (
      sightBlockingKeys.has(key) ||
      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)
    );
  };
  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],
      sightBlockingAt,
    )),
    nearest.sourceCell,
    nearest.targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  const physicalSelected = traces.reduce(
    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,
    first,
  );
  const blocksSight = traces.every((trace) => trace.blocksSight);
  const opticalSelected = blocksSight
    ? traces.reduce(
        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,
        first,
      )
    : null;
  const selected: TerrainLineTrace = {
    ...physicalSelected,
    blocksSight,
    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,
  };
  stateTraces.set(traceKey, selected);
  retainEquivalentTrace(equivalentTraceKey, selected);
  return selected;
}

/** The canonical 2014 corner-to-corner trace for two bare grid cells. */
export function traceTerrainLine(
  state: EncounterState,
  sourceCell: GridCell,
  targetCell: GridCell,
  options: TerrainLineOptions = {},
): TerrainLineTrace {
  return traceSpaces(state, [sourceCell], [targetCell], options);
}

export interface CreatureLineOptions {
  readonly sourceAnchor?: GridCell;
  readonly additionalSightBlockingCells?: readonly GridCell[];
}

export function traceCombatantLine(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const traceKey = `${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined
    ? 'current'
    : cellKey(options.sourceAnchor)}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {
    sourceId,
    targetId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function traceCombatantLineToCells(
  state: EncounterState,
  sourceId: CombatantId,
  targetCells: readonly GridCell[],
  options: CreatureLineOptions = {},
): TerrainLineTrace {
  const blockerSignature = sightBlockingSignature(
    normalizedSightBlockingCells(options.additionalSightBlockingCells),
  );
  const targetSignature = targetCells.map(cellKey).join(';');
  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);
  const traceKey = `${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;
  const cached = combatantLineTraces.get(state)?.get(traceKey);
  if (cached !== undefined) return cached;
  const source = options.sourceAnchor === undefined
    ? combatantSpace(state, sourceId)
    : combatantSpaceAt(state, sourceId, options.sourceAnchor);
  const trace = traceSpaces(state, source.cells, targetCells, {
    sourceId,
    includeCreatures: true,
    ...(options.additionalSightBlockingCells === undefined
      ? {}
      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),
  });
  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();
  stateTraces.set(traceKey, trace);
  if (!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);
  return trace;
}

export function coverTierBetweenObjects(
  objects: readonly WorldObject[],
  from: GridCell,
  to: GridCell,
): CoverTier {
  const exclusions = new Set([cellKey(from), cellKey(to)]);
  const candidates = [...new Map(objects
    .flatMap((object) => object.footprint)
    .filter((cell) => !exclusions.has(cellKey(cell)))
    .map((cell) => [cellKey(cell), cell] as const)).values()];
  const sourceCell = { ...from };
  const targetCell = { ...to };
  const targetCorners = outerCorners([to]);
  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>
    objects.flatMap((object): readonly TerrainLineSource[] =>
      objectOccupiesCell(object, cell) && object.blocking.cover !== 'none'
        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]
        : []);
  const sightBlockingAt = (cell: GridCell): boolean =>
    !exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === 'total');
  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(
    sourceCorner,
    targetCorners.map((targetCorner) => traceCornerLine(
      sourceCorner,
      targetCorner,
      candidates,
      sourcesAt,
      sightBlockingAt,
    )),
    sourceCell,
    targetCell,
  ));
  const first = traces[0];
  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');
  return traces.reduce((best, candidate) =>
    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;
}

export type CreatureCoverOptions = CreatureLineOptions;

export interface CombatantCoverResult {
  readonly tier: CoverTier;
  readonly sourceIds: readonly string[];
}

export function coverBetweenCombatants(
  state: EncounterState,
  sourceId: CombatantId,
  targetId: CombatantId,
  options: CreatureCoverOptions = {},
): CombatantCoverResult {
  const trace = traceCombatantLine(state, sourceId, targetId, options);
  return { tier: trace.tier, sourceIds: trace.sourceIds };
}

exec
/bin/bash -lc "git diff --check e86a4d26 bc6422bf; git diff --numstat e86a4d26 bc6422bf; git diff e86a4d26 bc6422bf -- tests/fixtures fixtures; git diff --unified=0 e86a4d26 bc6422bf | python3 -c 'import sys; a=[s.rstrip() for s in sys.stdin if s.startswith(\"+\") and not s.startswith(\"+++\") and len(s.rstrip())>121];print(\"Added lines over 120:\",len(a))'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
108	13	src/combat/cover.ts
202	5	tests/unit/combat/visibility-field.test.ts
15	7	tests/unit/tools/ai-dm-conversation.test.ts
9	5	tests/unit/vtt/dm-tactical-intel.test.ts
44	14	tests/unit/vtt/scene-snapshot.test.ts
9	5	tests/unit/vtt/tactical-evaluator-r02.test.ts
Added lines over 120: 0

 succeeded in 2639ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/combat/visibility-field.test.ts > REVIEW_ENDPOINT_MATRIX
ENDPOINT_MATRIX {"from":{"column":2,"row":1},"to":{"column":1,"row":2},"blocked":false,"source":{"column":2,"row":2},"lines":[{"to":{"column":1,"row":2},"blocked":false},{"to":{"column":2,"row":2},"blocked":false},{"to":{"column":1,"row":3},"blocked":false},{"to":{"column":2,"row":3},"blocked":false}]}
ENDPOINT_MATRIX {"from":{"column":2,"row":1},"to":{"column":0,"row":3},"blocked":false,"source":{"column":2,"row":2},"lines":[{"to":{"column":0,"row":3},"blocked":false},{"to":{"column":1,"row":3},"blocked":false},{"to":{"column":0,"row":4},"blocked":false},{"to":{"column":1,"row":4},"blocked":false}]}
ENDPOINT_MATRIX {"from":{"column":0,"row":3},"to":{"column":2,"row":1},"blocked":false,"source":{"column":1,"row":3},"lines":[{"to":{"column":2,"row":1},"blocked":true},{"to":{"column":3,"row":1},"blocked":true},{"to":{"column":2,"row":2},"blocked":false},{"to":{"column":3,"row":2},"blocked":true}]}
ENDPOINT_MATRIX {"from":{"column":3,"row":0},"to":{"column":0,"row":3},"blocked":true,"source":{"column":4,"row":0},"lines":[{"to":{"column":0,"row":3},"blocked":true},{"to":{"column":1,"row":3},"blocked":true},{"to":{"column":0,"row":4},"blocked":true},{"to":{"column":1,"row":4},"blocked":true}]}

ENDPOINT_MATRIX {"from":{"column":2,"row":1},"to":{"column":1,"row":2},"blocked":false,"source":{"column":2,"row":2},"lines":[{"to":{"column":1,"row":2},"blocked":false},{"to":{"column":2,"row":2},"blocked":false},{"to":{"column":1,"row":3},"blocked":false},{"to":{"column":2,"row":3},"blocked":false}]}
ENDPOINT_MATRIX {"from":{"column":2,"row":1},"to":{"column":0,"row":3},"blocked":false,"source":{"column":2,"row":2},"lines":[{"to":{"column":0,"row":3},"blocked":false},{"to":{"column":1,"row":3},"blocked":false},{"to":{"column":0,"row":4},"blocked":false},{"to":{"column":1,"row":4},"blocked":false}]}
ENDPOINT_MATRIX {"from":{"column":0,"row":3},"to":{"column":2,"row":1},"blocked":false,"source":{"column":1,"row":3},"lines":[{"to":{"column":2,"row":1},"blocked":true},{"to":{"column":3,"row":1},"blocked":true},{"to":{"column":2,"row":2},"blocked":false},{"to":{"column":3,"row":2},"blocked":true}]}
ENDPOINT_MATRIX {"from":{"column":3,"row":0},"to":{"column":0,"row":3},"blocked":true,"source":{"column":4,"row":0},"lines":[{"to":{"column":0,"row":3},"blocked":true},{"to":{"column":1,"row":3},"blocked":true},{"to":{"column":0,"row":4},"blocked":true},{"to":{"column":1,"row":4},"blocked":true}]}

 ✓ tests/unit/combat/visibility-field.test.ts (47 tests | 46 skipped) 9ms

 Test Files  1 passed (1)
      Tests  1 passed | 46 skipped (47)
   Start at  22:10:57
   Duration  2.53s (transform 958ms, setup 0ms, import 2.43s, tests 9ms, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/scene-snapshot.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"preserves full persisted\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return \"import { combatantSpace, combatantSpaceAt } from './combat-rules';\\nimport type { EncounterState } from './encounter';\\nimport type { GridCell } from './grid';\\nimport { coverRank, type CoverTier } from './terrain';\\nimport type { CombatantId } from './values';\\nimport type { WorldObject } from './world-objects';\\n\\nfunction cellKey(cell: GridCell): string {\\n  return "'`${String(cell.column)},${String(cell.row)}`;'"\\n}\\n\\nfunction compareCells(left: GridCell, right: GridCell): number {\\n  return left.row - right.row || left.column - right.column;\\n}\\n\\n/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */\\nexport function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));\\n  if (steps <= 1) return [];\\n  const result: GridCell[] = [];\\n  const seen = new Set<string>();\\n  for (let step = 1; step < steps; step += 1) {\\n    const cell = {\\n      column: Math.round(from.column + columnDelta * step / steps),\\n      row: Math.round(from.row + rowDelta * step / steps),\\n    };\\n    const key = cellKey(cell);\\n    if ("'!seen.has(key)) {'"\\n      seen.add(key);\\n      result.push(cell);\\n    }\\n  }\\n  return result;\\n}\\n\\nfunction objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {\\n  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));\\n}\\n\\nexport interface CornerPoint {\\n  readonly column: number;\\n  readonly row: number;\\n}\\n\\n/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */\\nexport function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {\\n  const first = cells[0];\\n  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');\\n  let minimumColumn = first.column;\\n  let maximumColumn = first.column + 1;\\n  let minimumRow = first.row;\\n  let maximumRow = first.row + 1;\\n  for (let index = 1; index < cells.length; index += 1) {\\n    const cell = cells[index];\\n    if (cell === undefined) continue;\\n    minimumColumn = Math.min(minimumColumn, cell.column);\\n    maximumColumn = Math.max(maximumColumn, cell.column + 1);\\n    minimumRow = Math.min(minimumRow, cell.row);\\n    maximumRow = Math.max(maximumRow, cell.row + 1);\\n  }\\n  return [\\n    { column: minimumColumn, row: minimumRow },\\n    { column: maximumColumn, row: minimumRow },\\n    { column: minimumColumn, row: maximumRow },\\n    { column: maximumColumn, row: maximumRow },\\n  ];\\n}\\n\\n/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */\\nexport function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {\\n  const epsilon = 1e-9;\\n  let entry = 0;\\n  let exit = 1;\\n  const columnDelta = to.column - from.column;\\n  const minimumColumn = cell.column + epsilon;\\n  const maximumColumn = cell.column + 1 - epsilon;\\n  if (columnDelta === 0) {\\n    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;\\n  } else {\\n    const first = (minimumColumn - from.column) / columnDelta;\\n    const second = (maximumColumn - from.column) / columnDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  const rowDelta = to.row - from.row;\\n  const minimumRow = cell.row + epsilon;\\n  const maximumRow = cell.row + 1 - epsilon;\\n  if (rowDelta === 0) {\\n    if (from.row <= minimumRow || from.row >= maximumRow) return false;\\n  } else {\\n    const first = (minimumRow - from.row) / rowDelta;\\n    const second = (maximumRow - from.row) / rowDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  return entry <= exit && exit > 0 && entry < 1;\\n}\\n\\nfunction lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;\\n  if (magnitudeSquared === 0) return 0;\\n  return (\\n    (cell.column + 0.5 - from.column) * columnDelta +\\n    (cell.row + 0.5 - from.row) * rowDelta\\n  ) / magnitudeSquared;\\n}\\n\\n/** Rasterizes a corner ray in source-to-target traversal order. */\\nexport function rasterizeCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n): readonly GridCell[] {\\n  const crossed: GridCell[] = [];\\n  for (const cell of candidates) {\\n    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);\\n  }\\n  if (crossed.length > 1) {\\n    crossed.sort((left, right) =>\\n      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));\\n  }\\n  return crossed;\\n}\\n\\nexport interface TerrainLineSource {\\n  readonly kind: 'blocked_cell' | 'world_object' | 'creature';\\n  readonly id: string;\\n  readonly tier: Exclude<CoverTier, 'none'>;\\n}\\n\\nexport interface TerrainCornerLineTrace {\\n  readonly targetCorner: CornerPoint;\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineTrace {\\n  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */\\n  readonly sourceCell: GridCell;\\n  readonly targetCell: GridCell;\\n  readonly sourceCorner: CornerPoint;\\n  readonly lines: readonly TerrainCornerLineTrace[];\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineOptions {\\n  readonly sourceId?: CombatantId;\\n  readonly targetId?: CombatantId;\\n  readonly includeCreatures?: boolean;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nfunction normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {\\n  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]\\n    .sort(compareCells);\\n}\\n\\nfunction sightBlockingSignature(cells: readonly GridCell[]): string {\\n  return cells.map(cellKey).join(';');\\n}\\n\\nfunction taggedSourceId(source: TerrainLineSource): string {\\n  switch (source.kind) {\\n    case 'blocked_cell': return "'`blocked:${source.id}`;'"\\n    case 'world_object': return "'`object:${source.id}`;'"\\n    case 'creature': return "'`creature:${source.id}`;'"\\n  }\\n}\\n\\ninterface TerrainSourceCell {\\n  readonly cell: GridCell;\\n  readonly sources: TerrainLineSource[];\\n}\\n\\nfunction addSource(\\n  sourceCells: Map<string, TerrainSourceCell>,\\n  cell: GridCell,\\n  source: TerrainLineSource,\\n  exclusions: ReadonlySet<string>,\\n): void {\\n  const key = cellKey(cell);\\n  if (exclusions.has(key)) return;\\n  const existing = sourceCells.get(key);\\n  if (existing === undefined) {\\n    sourceCells.set(key, { cell: { ...cell }, sources: [source] });\\n  } else {\\n    existing.sources.push(source);\\n  }\\n}\\n\\ninterface TerrainSourceIndexes {\\n  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;\\n  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;\\n}\\n\\nconst terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();\\nconst terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();\\nconst equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();\\nconst EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;\\n\\nfunction terrainSourceSignature(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  indexedSources: ReadonlyMap<string, TerrainSourceCell>,\\n): string {\\n  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();\\n  const cached = stateSignatures.get(includeCreatures);\\n  if (cached "'!== undefined) return cached;'"\\n  const signature = [...indexedSources].map(([key, entry]) =>\\n    "'`${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join('"',')}"'`)'"\\n    .join('|');\\n  stateSignatures.set(includeCreatures, signature);\\n  if ("'!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);'"\\n  return signature;\\n}\\n\\nfunction retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {\\n  equivalentTerrainLineTraces.set(key, trace);\\n  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;\\n  const oldest = equivalentTerrainLineTraces.keys().next().value;\\n  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);\\n}\\n\\nfunction buildTerrainSourceIndex(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  terrain?: ReadonlyMap<string, TerrainSourceCell>,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined\\n    ? new Map<string, TerrainSourceCell>()\\n    : new Map([...terrain].map(([key, entry]) => [key, {\\n        cell: { ...entry.cell }, sources: [...entry.sources],\\n      }] as const));\\n  const exclusions = new Set<string>();\\n  if (terrain === undefined) {\\n    for (const cell of state.blockedCells) {\\n      addSource(sourceCells, cell, {\\n        kind: 'blocked_cell', id: "'`${String(cell.column)},${String(cell.row)}`, tier: '"'total',\\n      }, exclusions);\\n    }\\n    for (const object of state.worldObjects) {\\n      if (object.blocking.cover === 'none') continue;\\n      for (const cell of object.footprint) {\\n        addSource(sourceCells, cell, {\\n          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,\\n        }, exclusions);\\n      }\\n    }\\n  }\\n  if ("'!includeCreatures) return sourceCells;'"\\n  for (const candidate of state.combatants) {\\n    const id = candidate.profile.id;\\n    if (candidate.life === 'dead') continue;\\n    if ("'!state.tokens.some((token) => token.combatantId === id)) continue;'"\\n    for (const cell of combatantSpace(state, id).cells) {\\n      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);\\n    }\\n  }\\n  return sourceCells;\\n}\\n\\nfunction indexedTerrainSources(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const cached = terrainSourceIndexes.get(state);\\n  if (cached "'!== undefined) {'"\\n    if ("'!includeCreatures) return cached.terrain;'"\\n    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);\\n    cached.withCreatures = withCreatures;\\n    return withCreatures;\\n  }\\n  const terrain = buildTerrainSourceIndex(state, false);\\n  const entry: TerrainSourceIndexes = { terrain };\\n  terrainSourceIndexes.set(state, entry);\\n  if ("'!includeCreatures) return terrain;'"\\n  const withCreatures = buildTerrainSourceIndex(state, true, terrain);\\n  entry.withCreatures = withCreatures;\\n  return withCreatures;\\n}\\n\\nfunction uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {\\n  return sources\\n    .filter((source, index, all) =>\\n      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)\\n    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));\\n}\\n\\nfunction firstSharedEdgeBlockingCell(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): GridCell | null {\\n  if (from.row === to.row && Number.isInteger(from.row)) {\\n    const direction = from.column < to.column ? 1 : -1;\\n    for (\\n      let column = direction === 1 ? from.column : from.column - 1;\\n      direction === 1 ? column < to.column : column >= to.column;\\n      column += direction\\n    ) {\\n      const upper = { column, row: from.row - 1 };\\n      const lower = { column, row: from.row };\\n      // Deterministic pair choice: the flanking cell with the lower row wins.\\n      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;\\n    }\\n  }\\n  if (from.column === to.column && Number.isInteger(from.column)) {\\n    const direction = from.row < to.row ? 1 : -1;\\n    for (\\n      let row = direction === 1 ? from.row : from.row - 1;\\n      direction === 1 ? row < to.row : row >= to.row;\\n      row += direction\\n    ) {\\n      const left = { column: from.column - 1, row };\\n      const right = { column: from.column, row };\\n      // Deterministic pair choice: the flanking cell with the lower column wins.\\n      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction traceCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): TerrainCornerLineTrace {\\n  const interveningCells = rasterizeCornerLine(from, to, candidates);\\n  let tier: CoverTier = 'none';\\n  let strongest: TerrainLineSource[] = [];\\n  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);\\n  for (const cell of interveningCells) {\\n    if (sightBlockingAt(cell) && firstBlockingCell === null) {\\n      firstBlockingCell = { ...cell };\\n    }\\n    for (const source of sourcesAt(cell)) {\\n      const comparison = coverRank(source.tier) - coverRank(tier);\\n      if (comparison > 0) {\\n        tier = source.tier;\\n        strongest = [source];\\n      } else if (comparison === 0) {\\n        strongest.push(source);\\n      }\\n    }\\n  }\\n  const sources = uniqueSources(strongest);\\n  return {\\n    targetCorner: { ...to },\\n    interveningCells,\\n    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell,\\n  };\\n}\\n\\nconst COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];\\n\\nfunction countTier(obstructedLineCount: number): CoverTier {\\n  if (obstructedLineCount === 0) return 'none';\\n  if (obstructedLineCount <= 2) return 'half';\\n  if (obstructedLineCount === 3) return 'three_quarters';\\n  return 'total';\\n}\\n\\nfunction aggregateCornerLines(\\n  sourceCorner: CornerPoint,\\n  lines: readonly TerrainCornerLineTrace[],\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n): TerrainLineTrace {\\n  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);\\n  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');\\n  const obstructed = lines.filter((line) => line.tier "'!== '"'none');\\n  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>\\n    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');\\n  const tier = physicalBlocksCover\\n    ? 'total'\\n    : COVER_TIER_BY_RANK[Math.min(\\n        coverRank(countTier(obstructed.length)),\\n        coverRank(strongestLineTier),\\n        coverRank('three_quarters'),\\n      )] ?? 'none';\\n  const sources = tier === 'none'\\n    ? []\\n    : uniqueSources(obstructed\\n        .filter((line) => line.tier === strongestLineTier)\\n        .flatMap((line) => line.sources));\\n  const interveningCells = [...new Map(lines\\n    .flatMap((line) => line.interveningCells)\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;\\n  return {\\n    sourceCell: { ...sourceCell },\\n    targetCell: { ...targetCell },\\n    sourceCorner: { ...sourceCorner },\\n    lines,\\n    interveningCells,\\n    tier,\\n    blocksSight,\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,\\n  };\\n}\\n\\nfunction comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return coverRank(left.tier) - coverRank(right.tier) ||\\n    left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction nearestCells(\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {\\n  const sources = [...sourceCells].sort(compareCells);\\n  const targets = [...targetCells].sort(compareCells);\\n  const firstSource = sources[0];\\n  const firstTarget = targets[0];\\n  if (firstSource === undefined || firstTarget === undefined) {\\n    throw new RangeError('A line query requires non-empty source and target spaces.');\\n  }\\n  let selectedSource = firstSource;\\n  let selectedTarget = firstTarget;\\n  let selectedDistance = Number.POSITIVE_INFINITY;\\n  for (const sourceCell of sources) {\\n    for (const targetCell of targets) {\\n      const distance = Math.max(\\n        Math.abs(sourceCell.column - targetCell.column),\\n        Math.abs(sourceCell.row - targetCell.row),\\n      );\\n      if (distance < selectedDistance) {\\n        selectedSource = sourceCell;\\n        selectedTarget = targetCell;\\n        selectedDistance = distance;\\n      }\\n    }\\n  }\\n  return { sourceCell: selectedSource, targetCell: selectedTarget };\\n}\\n\\nfunction traceSpaces(\\n  state: EncounterState,\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n  options: TerrainLineOptions,\\n): TerrainLineTrace {\\n  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);\\n  const blockerSignature = sightBlockingSignature(sightBlockingCells);\\n  const traceKey = "'`${options.includeCreatures === true ? '"'creatures' : 'terrain'}:"'${sourceCells'"\\n    .map(cellKey).join(';')}->"'${targetCells.map(cellKey).join('"';')}#sight:"'${blockerSignature}`;'"\\n  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  const cached = stateTraces.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  if ("'!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);'"\\n  const nearest = nearestCells(sourceCells, targetCells);\\n  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));\\n  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);\\n  const equivalentTraceKey = "'`${terrainSourceSignature('"\\n    state,\\n    options.includeCreatures === true,\\n    indexedSources,\\n  )}\\\\0"'${traceKey}`;'"\\n  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);\\n  if (equivalent "'!== undefined) {'"\\n    stateTraces.set(traceKey, equivalent);\\n    return equivalent;\\n  }\\n  const sourceCorners = outerCorners(sourceCells);\\n  const targetCorners = outerCorners(targetCells);\\n  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);\\n  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);\\n  const minimumColumn = Math.min(...cornerColumns);\\n  const maximumColumn = Math.max(...cornerColumns);\\n  const minimumRow = Math.min(...cornerRows);\\n  const maximumRow = Math.max(...cornerRows);\\n  const candidateEntries = sightBlockingCells.length === 0\\n    ? [...indexedSources.values()]\\n    : [...new Map([\\n        ...indexedSources.values(),\\n        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),\\n      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];\\n  const candidates = candidateEntries\\n    .filter((entry) => "'!exclusions.has(cellKey(entry.cell)) &&'"\\n      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&\\n      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)\\n    .map((entry) => entry.cell);\\n  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));\\n  const sightBlockingAt = (cell: GridCell): boolean => {\\n    const key = cellKey(cell);\\n    return "'!exclusions.has(key) && ('"\\n      sightBlockingKeys.has(key) ||\\n      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)\\n    );\\n  };\\n  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],\\n      sightBlockingAt,\\n    )),\\n    nearest.sourceCell,\\n    nearest.targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  const physicalSelected = traces.reduce(\\n    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,\\n    first,\\n  );\\n  const blocksSight = traces.every((trace) => trace.blocksSight);\\n  const opticalSelected = blocksSight\\n    ? traces.reduce(\\n        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,\\n        first,\\n      )\\n    : null;\\n  const selected: TerrainLineTrace = {\\n    ...physicalSelected,\\n    blocksSight,\\n    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,\\n  };\\n  stateTraces.set(traceKey, selected);\\n  retainEquivalentTrace(equivalentTraceKey, selected);\\n  return selected;\\n}\\n\\n/** The canonical 2014 corner-to-corner trace for two bare grid cells. */\\nexport function traceTerrainLine(\\n  state: EncounterState,\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n  options: TerrainLineOptions = {},\\n): TerrainLineTrace {\\n  return traceSpaces(state, [sourceCell], [targetCell], options);\\n}\\n\\nexport interface CreatureLineOptions {\\n  readonly sourceAnchor?: GridCell;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nexport function traceCombatantLine(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const traceKey = "'`${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined'"\\n    ? 'current'\\n    : cellKey(options.sourceAnchor)}#sight:"'${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {\\n    sourceId,\\n    targetId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function traceCombatantLineToCells(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetCells: readonly GridCell[],\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const targetSignature = targetCells.map(cellKey).join(';');\\n  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);\\n  const traceKey = "'`${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, targetCells, {\\n    sourceId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function coverTierBetweenObjects(\\n  objects: readonly WorldObject[],\\n  from: GridCell,\\n  to: GridCell,\\n): CoverTier {\\n  const exclusions = new Set([cellKey(from), cellKey(to)]);\\n  const candidates = [...new Map(objects\\n    .flatMap((object) => object.footprint)\\n    .filter((cell) => "'!exclusions.has(cellKey(cell)))'"\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const sourceCell = { ...from };\\n  const targetCell = { ...to };\\n  const targetCorners = outerCorners([to]);\\n  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>\\n    objects.flatMap((object): readonly TerrainLineSource[] =>\\n      objectOccupiesCell(object, cell) && object.blocking.cover "'!== '"'none'\\n        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]\\n        : []);\\n  const sightBlockingAt = (cell: GridCell): boolean =>\\n    "'!exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === '"'total');\\n  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      sourcesAt,\\n      sightBlockingAt,\\n    )),\\n    sourceCell,\\n    targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  return traces.reduce((best, candidate) =>\\n    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;\\n}\\n\\nexport type CreatureCoverOptions = CreatureLineOptions;\\n\\nexport interface CombatantCoverResult {\\n  readonly tier: CoverTier;\\n  readonly sourceIds: readonly string[];\\n}\\n\\nexport function coverBetweenCombatants(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureCoverOptions = {},\\n): CombatantCoverResult {\\n  const trace = traceCombatantLine(state, sourceId, targetId, options);\\n  return { tier: trace.tier, sourceIds: trace.sourceIds };\\n}\\n\";if(id.endsWith('/tests/unit/vtt/scene-snapshot.test.ts'))return code.replace('const before = persistedByteBaseline(state, coordinator);','const before = persistedByteBaseline(state, coordinator); console.log(\"REVIEW_CAPTURE \"+JSON.stringify({before, state:canonicalJson(state), coordinator})); return;');}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/scene-snapshot.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"preserves full persisted\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/vtt/scene-snapshot.test.ts'))return code.replace('const before = persistedByteBaseline(state, coordinator);','const before = persistedByteBaseline(state, coordinator); console.log(\"REVIEW_CAPTURE \"+JSON.stringify({before, state:canonicalJson(state), coordinator})); return;');}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 2885ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum
REVIEW_CAPTURE {"before":{"pendingRequestHash":"78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049","coordinatorHash":"f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66","revisionChecksum":"35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":8,"row":2},{"column":9,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":7,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":4,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

REVIEW_CAPTURE {"before":{"pendingRequestHash":"78f31379db8355bb977b5a87cac2349137ff0aa606d32ba4080277856e874049","coordinatorHash":"f8fa07803660b6ba53f256d885955af174f921fcaf58de46b1a7f0e697de9c66","revisionChecksum":"35c96ecc6772f0cd518b5de7beeb79e4e92af4b270a5e709cbc3077d8f900385","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":8,"row":2},{"column":9,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":7,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":4,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests | 7 skipped) 16ms

 Test Files  1 passed (1)
      Tests  1 passed | 7 skipped (8)
   Start at  22:11:15
   Duration  2.79s (transform 1.14s, setup 0ms, import 2.69s, tests 16ms, environment 0ms)


 succeeded in 2908ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/vtt/scene-snapshot.test.ts > renderer-neutral scene snapshot > preserves full persisted request/coordinator bytes and the actual revision checksum
REVIEW_CAPTURE {"before":{"pendingRequestHash":"0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0","coordinatorHash":"79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd","revisionChecksum":"52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":7,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":8,"row":2},{"column":9,"row":2},{"column":4,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

REVIEW_CAPTURE {"before":{"pendingRequestHash":"0ec0fbbc308e5b744b61bd609c7107c1cdda97a6d561d2787b8b3bf4f194b8e0","coordinatorHash":"79b076c9c5cbc8312f72a917753f2aeabc3f63dc8ec2f8a259e530418c3b36cd","revisionChecksum":"52305455f1650a70231e6c7d2d322ca344bda7192a37632c050a3bc4f75fb3a8","branchRngStateFingerprint":"dd802783e2936f2c144e487bb48fa8e6a17e05dbaefb181d40c74647bb66b46a"},"state":"{\"activeCombatant\":null,\"activeInitiativeIndex\":null,\"adjudicationPending\":[],\"blockedCells\":[{\"column\":7,\"row\":2}],\"bounds\":{\"columns\":10,\"rows\":7},\"combatants\":[{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":67,\"life\":\"living\",\"profile\":{\"characterId\":1,\"id\":\"combatant:fighter\",\"kind\":\"player_character\",\"name\":\"Reference Fighter\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":2,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":67,\"initiativeBonus\":100,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":true},\"tokenId\":\"token:fighter\",\"wildShape\":null},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":52,\"life\":\"living\",\"profile\":{\"characterId\":2,\"id\":\"combatant:cleric\",\"kind\":\"player_character\",\"name\":\"Reference Cleric\",\"rules\":{\"armorClass\":18,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":52,\"initiativeBonus\":70,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:cleric\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":38,\"life\":\"living\",\"profile\":{\"characterId\":3,\"id\":\"combatant:wizard\",\"kind\":\"player_character\",\"name\":\"Reference Wizard\",\"rules\":{\"armorClass\":15,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":38,\"initiativeBonus\":40,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"speed\":30,\"spellSlots\":[{\"level\":1,\"maximum\":4},{\"level\":2,\"maximum\":3},{\"level\":3,\"maximum\":3},{\"level\":4,\"maximum\":1}],\"usesDeathSaves\":true},\"tokenId\":\"token:wizard\",\"wildShape\":null},\"spellSlots\":[{\"level\":1,\"maximum\":4,\"remaining\":4},{\"level\":2,\"maximum\":3,\"remaining\":3},{\"level\":3,\"maximum\":3,\"remaining\":3},{\"level\":4,\"maximum\":1,\"remaining\":1}],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null},{\"deathAt\":null,\"deathSaves\":null,\"hitPoints\":80,\"life\":\"living\",\"profile\":{\"id\":\"combatant:training-brute\",\"kind\":\"monster\",\"name\":\"Training Brute\",\"rules\":{\"armorClass\":12,\"attacksPerAction\":1,\"conditionImmunities\":[],\"contactMedium\":\"surface\",\"damageResponses\":[],\"detectionTraits\":[],\"hitPointMaximum\":80,\"initiativeBonus\":0,\"passivePerception\":12,\"reach\":5,\"savingThrowBonuses\":{\"charisma\":0,\"constitution\":3,\"dexterity\":2,\"intelligence\":1,\"strength\":3,\"wisdom\":2},\"senses\":[{\"kind\":\"normal_sight\"}],\"sizeCategory\":\"Medium\",\"skillBonuses\":{\"stealth\":20},\"speed\":30,\"spellSlots\":[],\"usesDeathSaves\":false},\"statblockId\":\"statblock:training-brute\",\"tokenId\":\"token:training-brute\"},\"spellSlots\":[],\"temporaryHitPoints\":0,\"turn\":{\"action\":{\"kind\":\"spent\"},\"bonusActionAvailable\":false,\"disengaging\":false,\"dodging\":false,\"movement\":{\"remaining\":0,\"speed\":0,\"spent\":0},\"reactionAvailable\":false},\"wildShapeUses\":null}],\"config\":{\"initiativeMode\":\"shared_enemy\"},\"dmNotes\":[\"Training Brute retreats after the three reference PCs act.\"],\"effects\":[],\"environment\":{\"difficultTerrainRegions\":[],\"lightRegions\":[{\"cells\":[{\"column\":4,\"row\":3}],\"id\":\"reference-hiding-shadow\",\"level\":\"darkness\"}],\"movementRegions\":[],\"narrowOpeningRegions\":[],\"obscurementRegions\":[]},\"eventLog\":[],\"hiddenCombatants\":[],\"hiddenRolls\":[],\"initiative\":[],\"nextDecisionSequence\":1,\"nextEffectSequence\":1,\"nextEventSequence\":1,\"nextPersistentAreaSequence\":1,\"nextWorldObjectSequence\":1,\"observationHistory\":[],\"pendingDecisions\":[],\"persistentAreas\":[],\"phase\":{\"kind\":\"active\"},\"reactionPolicies\":[],\"revision\":0,\"round\":0,\"rulesEdition\":\"2024\",\"sharedSpaceRelations\":[],\"tokens\":[{\"combatantId\":\"combatant:fighter\",\"id\":\"token:fighter\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":2,\"row\":3}},{\"combatantId\":\"combatant:cleric\",\"id\":\"token:cleric\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":4}},{\"combatantId\":\"combatant:wizard\",\"id\":\"token:wizard\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":1,\"row\":2}},{\"combatantId\":\"combatant:training-brute\",\"id\":\"token:training-brute\",\"placementMode\":{\"actual\":\"Medium\",\"kind\":\"normal\"},\"position\":{\"column\":3,\"row\":3}}],\"worldObjects\":[{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":3}],\"id\":\"object:door\",\"kind\":\"door\",\"name\":\"Oak Door\",\"position\":{\"column\":6,\"row\":3}},{\"armorClass\":10,\"blocking\":{\"cover\":\"total\",\"lineOfSight\":true,\"movement\":true},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":6,\"row\":4}],\"id\":\"object:wall\",\"kind\":\"barrier\",\"name\":\"Stone Wall\",\"position\":{\"column\":6,\"row\":4}},{\"armorClass\":10,\"blocking\":{\"cover\":\"none\",\"lineOfSight\":false,\"movement\":false},\"createdRevision\":0,\"damageResponses\":[],\"durability\":{\"kind\":\"indestructible\"},\"footprint\":[{\"column\":4,\"row\":1}],\"id\":\"object:torch\",\"kind\":\"light-source\",\"name\":\"Torch\",\"position\":{\"column\":4,\"row\":1}}]}","coordinator":{"requestSequence":1,"pendingRequest":{"kind":"turn","requestId":"request:handoff-baseline","encounterRevision":0,"actorId":"combatant:fighter","visibleState":{"audience":"player","seat":{"seatId":"player:one","combatantId":"combatant:fighter"},"revision":0,"round":0,"activeCombatant":null,"bounds":{"columns":10,"rows":7},"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":4,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":9,"row":0},{"column":0,"row":1},{"column":1,"row":1},{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":5,"row":1},{"column":6,"row":1},{"column":7,"row":1},{"column":8,"row":1},{"column":9,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":5,"row":2},{"column":6,"row":2},{"column":7,"row":2},{"column":0,"row":3},{"column":1,"row":3},{"column":2,"row":3},{"column":3,"row":3},{"column":5,"row":3},{"column":6,"row":3},{"column":7,"row":3},{"column":0,"row":4},{"column":1,"row":4},{"column":2,"row":4},{"column":3,"row":4},{"column":4,"row":4},{"column":5,"row":4},{"column":6,"row":4},{"column":0,"row":5},{"column":1,"row":5},{"column":2,"row":5},{"column":3,"row":5},{"column":4,"row":5},{"column":5,"row":5},{"column":6,"row":5},{"column":7,"row":5},{"column":8,"row":5},{"column":9,"row":5},{"column":0,"row":6},{"column":1,"row":6},{"column":2,"row":6},{"column":3,"row":6},{"column":4,"row":6},{"column":5,"row":6},{"column":6,"row":6},{"column":7,"row":6},{"column":8,"row":6},{"column":9,"row":6}],"concealedCells":[{"column":8,"row":2},{"column":9,"row":2},{"column":4,"row":3},{"column":8,"row":3},{"column":9,"row":3},{"column":7,"row":4},{"column":8,"row":4},{"column":9,"row":4}],"blockedCells":[{"column":7,"row":2}],"worldObjects":[{"id":"object:door","name":"Oak Door","kind":"door","position":{"column":6,"row":3},"footprint":[{"column":6,"row":3}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:wall","name":"Stone Wall","kind":"barrier","position":{"column":6,"row":4},"footprint":[{"column":6,"row":4}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":true,"lineOfSight":true,"cover":"total"},"createdRevision":0},{"id":"object:torch","name":"Torch","kind":"light-source","position":{"column":4,"row":1},"footprint":[{"column":4,"row":1}],"durability":{"kind":"indestructible"},"armorClass":10,"damageResponses":[],"blocking":{"movement":false,"lineOfSight":false,"cover":"none"},"createdRevision":0}],"combatants":[{"id":"combatant:cleric","name":"Reference Cleric","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":4},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":4}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:fighter","name":"Reference Fighter","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":2,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":2,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:training-brute","name":"Training Brute","kind":"monster","life":"living","placementStatus":"placed","position":{"column":3,"row":3},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":3,"row":3}],"active":false,"formName":null,"conditions":[]},{"id":"combatant:wizard","name":"Reference Wizard","kind":"player_character","life":"living","placementStatus":"placed","position":{"column":1,"row":2},"effectiveSize":"Medium","placementMode":{"kind":"normal","actual":"Medium"},"footprint":[{"column":1,"row":2}],"active":false,"formName":null,"conditions":[]}],"lastSeen":[],"ownedCombatants":[{"id":"combatant:fighter","hitPoints":67,"hitPointMaximum":67,"turn":{"action":{"kind":"spent"},"bonusActionAvailable":false,"reactionAvailable":false,"movement":{"speed":0,"spent":0,"remaining":0},"disengaging":false,"dodging":false},"wildShapeUses":null}],"recentEvents":[]},"legalActions":{"actions":[{"type":"end_turn","actor":"combatant:fighter"}]}},"pendingCommand":null,"continuation":{"kind":"idle"},"pause":null}}

 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests | 7 skipped) 17ms

 Test Files  1 passed (1)
      Tests  1 passed | 7 skipped (8)
   Start at  22:11:17
   Duration  2.81s (transform 1.15s, setup 0ms, import 2.72s, tests 17ms, environment 0ms)


exec
/bin/bash -lc "sed -n '1,145p' tests/unit/tools/ai-dm-conversation.test.ts; rg -n 'reauthoredHardExhaustionSightlines|5117009' tests/unit/tools/ai-dm-conversation.test.ts; sed -n '1250,1268p' tests/unit/combat/visibility-field.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  agentSessionIdFromCli,
  contextTokenCount,
  turnInputTotal,
  measuredContextRolloverThreshold,
  engineDispatchId,
  engineDispatchPhaseForCallPhase,
  type AgentInvocation,
  type AgentSessionAdapter,
  type AgentSessionBinding,
  type AgentTurnResult,
  type EngineCatalogEvidence,
  type EngineDispatchId,
} from '../../../src/vtt/agent-session';
import {
  AgentSessionLifecycle,
  createConversationRoundDeadline,
  type AgentDispatchDeadline,
} from '../../../src/vtt/agent-session-lifecycle';
import {
  parseConversationArgs,
  proposalResolutionDivergence,
  isPlanAdjustmentProposal,
  isRoundProposal,
  runConversation,
  structuredFinalDecisionPhase,
  createMcpClient,
  McpChildExited,
  mcpRequest,
  stopMcpClient,
  profiledTurnContextArguments,
  persistD569IntegrityStop,
  type ConversationBoardSnapshotService,
  type ConversationRunOptions,
} from '../../../tools/ai-dm-conversation';
import { buildRerunPacket } from '../../../tools/ai-dm-rerun-packet';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from '../../helpers/test-filesystem';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { armorClass, combatantId, encounterSessionId, feet, type CombatantId } from '../../../src/combat/values';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { applyRoomInitiativeProfile, generateRoom } from '../../../src/vtt/room-generator';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  engineActorOptionsForEnvironment,
} from '../../../src/vtt/intent-resolver';
import {
  freshMonsterPlanningState,
  loadArenaFixture,
  parseEngineMcpJsonLine,
  type EngineMcpLauncherManifest,
} from '../../../src/vtt/mcp/entrypoint';
import * as engineMcpEntrypoint from '../../../src/vtt/mcp/entrypoint';
import { mcpRequestMeta, type McpHandler } from '../../../src/vtt/mcp/handler';
import { reduceSessionEncounter } from '../../../src/vtt/session-encounter-reducer';
import {
  importSavedSession,
  exportSavedSession,
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
} from '../../../src/vtt/session-persistence';
import { codexArgv } from '../../../src/vtt/agent-adapters/codex';
import { D569IntegrityStop } from '../../../src/vtt/d569-integrity';
import { decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
import { canonicalJson } from '../../../src/commands/canonical-json';
import {
  applyRevisionDelta,
  type RevisionDeltaOperation,
} from '../../../src/vtt/dm-bridge/projection-transport';
import { projectActorKnowledge } from '../../../src/vtt/intel/actor-knowledge';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import {
  createDisabledEngineOfferFamilyPolicy,
} from '../../../src/vtt/offers/offer-environment';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';
import { engineStateHandle } from '../../../src/vtt/engine-state-capsule';
import { engineActionId } from '../../../src/vtt/turn-proposal';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';
import { alternatingInitiativeRoom } from '../../fixtures/initiative-segments/alternating-room';
import {
  createScriptedPartyPlan,
  type ScriptedPartyDecisionPolicy,
} from '../../../src/vtt/scripted-party-round';
import {
  AI_DM_KB_FIXTURE_DIRECTORY,
  DEFAULT_AI_DM_KB_ROOT,
  KB_SUBJECTS,
} from '../../../src/vtt/knowledge-base-contract';
import { declareTestInputs } from '../../helpers/test-inputs';
import { sha256 } from '../../../src/crypto/sha256';
import { DEFAULT_RENDERER_PROFILE } from '../../../src/vtt/renderer-profile';
import { traceCombatantLine } from '../../../src/combat/cover';
import {
  classifyEngineCatalogEvidence,
  type EngineReadinessRecord,
} from '../../../src/vtt/engine-dispatch-evidence';

const kbInputs = declareTestInputs({ fixtures: [
  'tests/fixtures/ai-dm-kb/ai-dm-core.md',
  'tests/fixtures/ai-dm-kb/tactics.md',
  'tests/fixtures/ai-dm-skills/engine-submission/SKILL.md',
] });
const DEFAULT_KB_HASH = '00776f3f2d4cd7468a1eb2a63028e9c3f846b43b14a4e5787d3e9c94e02633c0';
const BOUND_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
const DIVERGENCE_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createDisabledEngineOfferFamilyPolicy(),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});
function createEngineMcpRuntime(
  state: Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[0],
  options: Omit<NonNullable<Parameters<typeof engineMcpEntrypoint.createEngineMcpRuntime>[1]>,
    'offerEnvironment'> & { readonly offerEnvironment?: typeof BOUND_OFFER_ENVIRONMENT } = {},
): ReturnType<typeof engineMcpEntrypoint.createEngineMcpRuntime> {
  const offerEnvironment = options.offerEnvironment ?? BOUND_OFFER_ENVIRONMENT;
  const runtime = engineMcpEntrypoint.createEngineMcpRuntime(state, { ...options, offerEnvironment });
  expect(runtime.feed.current().offerEnvironment).toEqual(offerEnvironment.binding);
  return runtime;
}

function launcherOfferEnvironment(manifest: EngineMcpLauncherManifest) {
  if (manifest.offerEnvironment === undefined) throw new TypeError('Launcher offer environment is absent.');
  return buildOfferEnvironment({ kind: 'binding', binding: manifest.offerEnvironment });
}

async function runConversationWithPartyPolicy(
  decisionPolicy: ScriptedPartyDecisionPolicy,
  config: Parameters<typeof runConversation>[0],
  options?: Parameters<typeof runConversation>[1],
): Promise<Awaited<ReturnType<typeof runConversation>>> {
220:function reauthoredHardExhaustionSightlines(state: EncounterState): EncounterState {
250:    'combatant:generated-5117009-monster-1->combatant:fighter',
251:    'combatant:generated-5117009-monster-2->combatant:fighter',
252:    'combatant:generated-5117009-monster-2->combatant:cleric',
253:    'combatant:generated-5117009-monster-5->combatant:wizard',
254:    'combatant:generated-5117009-monster-6->combatant:wizard',
256:    [combatantId('combatant:generated-5117009-monster-2'), { column: 13, row: 1 }],
2741:    const state = reauthoredHardExhaustionSightlines(
2742:      await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
2764:          actorId: 'combatant:generated-5117009-monster-1',
2776:          actorId: 'combatant:generated-5117009-monster-1',
2782:      entry.actorId === 'combatant:generated-5117009-monster-1');
2841:      ? reauthoredHardExhaustionSightlines(
2842:          await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'),
  });

  it('PHYSICAL_COVER_UNCHANGED_BY_VERTEX', () => {
    const actor = normalProfile('diagonal-cover-actor');
    const state = fieldState(actor, {
      bounds: { columns: 5, rows: 5 },
      position: { column: 4, row: 4 },
      blockedCells: [{ column: 2, row: 1 }, { column: 1, row: 2 }],
    });
    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });

    // Pre-D642 physical pin: interior crossings obstruct two target-corner rays, yielding Half Cover.
    expect(trace.tier).toBe('half');
  });

  it('PHYSICAL_COVER_UNCHANGED_BY_SEAM', () => {
    const { state } = seamState(true, true);
    const trace = traceTerrainLine(state, { column: 3, row: 4 }, { column: 7, row: 4 });


codex
The snapshot derivation checks out: substituting pre-WALL `cover.ts` in memory reproduces all three old hashes; current code reproduces all three new hashes. The only payload differences are `visibleState.cells` and `visibleState.concealedCells`; canonical state bytes and the RNG fingerprint are identical. Five targeted suites passed, but the conversation suite hit read-only `/tmp` errors, so I’ll verify its changed geometry helper directly.

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"retains a productive first-turn option\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return \"import { combatantSpace, combatantSpaceAt } from './combat-rules';\\nimport type { EncounterState } from './encounter';\\nimport type { GridCell } from './grid';\\nimport { coverRank, type CoverTier } from './terrain';\\nimport type { CombatantId } from './values';\\nimport type { WorldObject } from './world-objects';\\n\\nfunction cellKey(cell: GridCell): string {\\n  return "'`${String(cell.column)},${String(cell.row)}`;'"\\n}\\n\\nfunction compareCells(left: GridCell, right: GridCell): number {\\n  return left.row - right.row || left.column - right.column;\\n}\\n\\n/** Retained for the frozen pre-D576 oracle and non-canonical historical callers. */\\nexport function rasterizeInterveningCells(from: GridCell, to: GridCell): readonly GridCell[] {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const steps = Math.max(Math.abs(columnDelta), Math.abs(rowDelta));\\n  if (steps <= 1) return [];\\n  const result: GridCell[] = [];\\n  const seen = new Set<string>();\\n  for (let step = 1; step < steps; step += 1) {\\n    const cell = {\\n      column: Math.round(from.column + columnDelta * step / steps),\\n      row: Math.round(from.row + rowDelta * step / steps),\\n    };\\n    const key = cellKey(cell);\\n    if ("'!seen.has(key)) {'"\\n      seen.add(key);\\n      result.push(cell);\\n    }\\n  }\\n  return result;\\n}\\n\\nfunction objectOccupiesCell(object: WorldObject, cell: GridCell): boolean {\\n  return object.footprint.some((candidate) => cellKey(candidate) === cellKey(cell));\\n}\\n\\nexport interface CornerPoint {\\n  readonly column: number;\\n  readonly row: number;\\n}\\n\\n/** Row-major outer corners: top-left, top-right, bottom-left, bottom-right. */\\nexport function outerCorners(cells: readonly GridCell[]): readonly CornerPoint[] {\\n  const first = cells[0];\\n  if (first === undefined) throw new RangeError('A line query requires a non-empty space.');\\n  let minimumColumn = first.column;\\n  let maximumColumn = first.column + 1;\\n  let minimumRow = first.row;\\n  let maximumRow = first.row + 1;\\n  for (let index = 1; index < cells.length; index += 1) {\\n    const cell = cells[index];\\n    if (cell === undefined) continue;\\n    minimumColumn = Math.min(minimumColumn, cell.column);\\n    maximumColumn = Math.max(maximumColumn, cell.column + 1);\\n    minimumRow = Math.min(minimumRow, cell.row);\\n    maximumRow = Math.max(maximumRow, cell.row + 1);\\n  }\\n  return [\\n    { column: minimumColumn, row: minimumRow },\\n    { column: maximumColumn, row: minimumRow },\\n    { column: minimumColumn, row: maximumRow },\\n    { column: maximumColumn, row: maximumRow },\\n  ];\\n}\\n\\n/** A corner ray crosses only a cell interior; a boundary graze is not a crossing. */\\nexport function cornerLineCrossesCell(from: CornerPoint, to: CornerPoint, cell: GridCell): boolean {\\n  const epsilon = 1e-9;\\n  let entry = 0;\\n  let exit = 1;\\n  const columnDelta = to.column - from.column;\\n  const minimumColumn = cell.column + epsilon;\\n  const maximumColumn = cell.column + 1 - epsilon;\\n  if (columnDelta === 0) {\\n    if (from.column <= minimumColumn || from.column >= maximumColumn) return false;\\n  } else {\\n    const first = (minimumColumn - from.column) / columnDelta;\\n    const second = (maximumColumn - from.column) / columnDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  const rowDelta = to.row - from.row;\\n  const minimumRow = cell.row + epsilon;\\n  const maximumRow = cell.row + 1 - epsilon;\\n  if (rowDelta === 0) {\\n    if (from.row <= minimumRow || from.row >= maximumRow) return false;\\n  } else {\\n    const first = (minimumRow - from.row) / rowDelta;\\n    const second = (maximumRow - from.row) / rowDelta;\\n    entry = Math.max(entry, Math.min(first, second));\\n    exit = Math.min(exit, Math.max(first, second));\\n  }\\n  return entry <= exit && exit > 0 && entry < 1;\\n}\\n\\nfunction lineProgress(from: CornerPoint, to: CornerPoint, cell: GridCell): number {\\n  const columnDelta = to.column - from.column;\\n  const rowDelta = to.row - from.row;\\n  const magnitudeSquared = columnDelta * columnDelta + rowDelta * rowDelta;\\n  if (magnitudeSquared === 0) return 0;\\n  return (\\n    (cell.column + 0.5 - from.column) * columnDelta +\\n    (cell.row + 0.5 - from.row) * rowDelta\\n  ) / magnitudeSquared;\\n}\\n\\n/** Rasterizes a corner ray in source-to-target traversal order. */\\nexport function rasterizeCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n): readonly GridCell[] {\\n  const crossed: GridCell[] = [];\\n  for (const cell of candidates) {\\n    if (cornerLineCrossesCell(from, to, cell)) crossed.push(cell);\\n  }\\n  if (crossed.length > 1) {\\n    crossed.sort((left, right) =>\\n      lineProgress(from, to, left) - lineProgress(from, to, right) || compareCells(left, right));\\n  }\\n  return crossed;\\n}\\n\\nexport interface TerrainLineSource {\\n  readonly kind: 'blocked_cell' | 'world_object' | 'creature';\\n  readonly id: string;\\n  readonly tier: Exclude<CoverTier, 'none'>;\\n}\\n\\nexport interface TerrainCornerLineTrace {\\n  readonly targetCorner: CornerPoint;\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineTrace {\\n  /** Stable nearest occupied cells retained for attack-position consumers, not cover geometry. */\\n  readonly sourceCell: GridCell;\\n  readonly targetCell: GridCell;\\n  readonly sourceCorner: CornerPoint;\\n  readonly lines: readonly TerrainCornerLineTrace[];\\n  readonly interveningCells: readonly GridCell[];\\n  readonly tier: CoverTier;\\n  readonly blocksSight: boolean;\\n  readonly sourceIds: readonly string[];\\n  readonly sources: readonly TerrainLineSource[];\\n  readonly firstBlockingCell: GridCell | null;\\n}\\n\\nexport interface TerrainLineOptions {\\n  readonly sourceId?: CombatantId;\\n  readonly targetId?: CombatantId;\\n  readonly includeCreatures?: boolean;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nfunction normalizedSightBlockingCells(cells: readonly GridCell[] = []): readonly GridCell[] {\\n  return [...new Map(cells.map((cell) => [cellKey(cell), { ...cell }] as const)).values()]\\n    .sort(compareCells);\\n}\\n\\nfunction sightBlockingSignature(cells: readonly GridCell[]): string {\\n  return cells.map(cellKey).join(';');\\n}\\n\\nfunction taggedSourceId(source: TerrainLineSource): string {\\n  switch (source.kind) {\\n    case 'blocked_cell': return "'`blocked:${source.id}`;'"\\n    case 'world_object': return "'`object:${source.id}`;'"\\n    case 'creature': return "'`creature:${source.id}`;'"\\n  }\\n}\\n\\ninterface TerrainSourceCell {\\n  readonly cell: GridCell;\\n  readonly sources: TerrainLineSource[];\\n}\\n\\nfunction addSource(\\n  sourceCells: Map<string, TerrainSourceCell>,\\n  cell: GridCell,\\n  source: TerrainLineSource,\\n  exclusions: ReadonlySet<string>,\\n): void {\\n  const key = cellKey(cell);\\n  if (exclusions.has(key)) return;\\n  const existing = sourceCells.get(key);\\n  if (existing === undefined) {\\n    sourceCells.set(key, { cell: { ...cell }, sources: [source] });\\n  } else {\\n    existing.sources.push(source);\\n  }\\n}\\n\\ninterface TerrainSourceIndexes {\\n  readonly terrain: ReadonlyMap<string, TerrainSourceCell>;\\n  withCreatures?: ReadonlyMap<string, TerrainSourceCell>;\\n}\\n\\nconst terrainSourceIndexes = new WeakMap<EncounterState, TerrainSourceIndexes>();\\nconst terrainLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst combatantLineTraces = new WeakMap<EncounterState, Map<string, TerrainLineTrace>>();\\nconst terrainSourceSignatures = new WeakMap<EncounterState, Map<boolean, string>>();\\nconst equivalentTerrainLineTraces = new Map<string, TerrainLineTrace>();\\nconst EQUIVALENT_TRACE_CACHE_LIMIT = 4_096;\\n\\nfunction terrainSourceSignature(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  indexedSources: ReadonlyMap<string, TerrainSourceCell>,\\n): string {\\n  const stateSignatures = terrainSourceSignatures.get(state) ?? new Map<boolean, string>();\\n  const cached = stateSignatures.get(includeCreatures);\\n  if (cached "'!== undefined) return cached;'"\\n  const signature = [...indexedSources].map(([key, entry]) =>\\n    "'`${key}=${entry.sources.map((source) => `${taggedSourceId(source)}:${source.tier}`).join('"',')}"'`)'"\\n    .join('|');\\n  stateSignatures.set(includeCreatures, signature);\\n  if ("'!terrainSourceSignatures.has(state)) terrainSourceSignatures.set(state, stateSignatures);'"\\n  return signature;\\n}\\n\\nfunction retainEquivalentTrace(key: string, trace: TerrainLineTrace): void {\\n  equivalentTerrainLineTraces.set(key, trace);\\n  if (equivalentTerrainLineTraces.size <= EQUIVALENT_TRACE_CACHE_LIMIT) return;\\n  const oldest = equivalentTerrainLineTraces.keys().next().value;\\n  if (typeof oldest === 'string') equivalentTerrainLineTraces.delete(oldest);\\n}\\n\\nfunction buildTerrainSourceIndex(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n  terrain?: ReadonlyMap<string, TerrainSourceCell>,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const sourceCells: Map<string, TerrainSourceCell> = terrain === undefined\\n    ? new Map<string, TerrainSourceCell>()\\n    : new Map([...terrain].map(([key, entry]) => [key, {\\n        cell: { ...entry.cell }, sources: [...entry.sources],\\n      }] as const));\\n  const exclusions = new Set<string>();\\n  if (terrain === undefined) {\\n    for (const cell of state.blockedCells) {\\n      addSource(sourceCells, cell, {\\n        kind: 'blocked_cell', id: "'`${String(cell.column)},${String(cell.row)}`, tier: '"'total',\\n      }, exclusions);\\n    }\\n    for (const object of state.worldObjects) {\\n      if (object.blocking.cover === 'none') continue;\\n      for (const cell of object.footprint) {\\n        addSource(sourceCells, cell, {\\n          kind: 'world_object', id: String(object.id), tier: object.blocking.cover,\\n        }, exclusions);\\n      }\\n    }\\n  }\\n  if ("'!includeCreatures) return sourceCells;'"\\n  for (const candidate of state.combatants) {\\n    const id = candidate.profile.id;\\n    if (candidate.life === 'dead') continue;\\n    if ("'!state.tokens.some((token) => token.combatantId === id)) continue;'"\\n    for (const cell of combatantSpace(state, id).cells) {\\n      addSource(sourceCells, cell, { kind: 'creature', id: String(id), tier: 'half' }, exclusions);\\n    }\\n  }\\n  return sourceCells;\\n}\\n\\nfunction indexedTerrainSources(\\n  state: EncounterState,\\n  includeCreatures: boolean,\\n): ReadonlyMap<string, TerrainSourceCell> {\\n  const cached = terrainSourceIndexes.get(state);\\n  if (cached "'!== undefined) {'"\\n    if ("'!includeCreatures) return cached.terrain;'"\\n    const withCreatures = cached.withCreatures ?? buildTerrainSourceIndex(state, true, cached.terrain);\\n    cached.withCreatures = withCreatures;\\n    return withCreatures;\\n  }\\n  const terrain = buildTerrainSourceIndex(state, false);\\n  const entry: TerrainSourceIndexes = { terrain };\\n  terrainSourceIndexes.set(state, entry);\\n  if ("'!includeCreatures) return terrain;'"\\n  const withCreatures = buildTerrainSourceIndex(state, true, terrain);\\n  entry.withCreatures = withCreatures;\\n  return withCreatures;\\n}\\n\\nfunction uniqueSources(sources: readonly TerrainLineSource[]): readonly TerrainLineSource[] {\\n  return sources\\n    .filter((source, index, all) =>\\n      all.findIndex((candidate) => taggedSourceId(candidate) === taggedSourceId(source)) === index)\\n    .sort((left, right) => taggedSourceId(left).localeCompare(taggedSourceId(right)));\\n}\\n\\nfunction firstSharedEdgeBlockingCell(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): GridCell | null {\\n  if (from.row === to.row && Number.isInteger(from.row)) {\\n    const direction = from.column < to.column ? 1 : -1;\\n    for (\\n      let column = direction === 1 ? from.column : from.column - 1;\\n      direction === 1 ? column < to.column : column >= to.column;\\n      column += direction\\n    ) {\\n      const upper = { column, row: from.row - 1 };\\n      const lower = { column, row: from.row };\\n      // Deterministic pair choice: the flanking cell with the lower row wins.\\n      if (sightBlockingAt(upper) && sightBlockingAt(lower)) return upper;\\n    }\\n  }\\n  if (from.column === to.column && Number.isInteger(from.column)) {\\n    const direction = from.row < to.row ? 1 : -1;\\n    for (\\n      let row = direction === 1 ? from.row : from.row - 1;\\n      direction === 1 ? row < to.row : row >= to.row;\\n      row += direction\\n    ) {\\n      const left = { column: from.column - 1, row };\\n      const right = { column: from.column, row };\\n      // Deterministic pair choice: the flanking cell with the lower column wins.\\n      if (sightBlockingAt(left) && sightBlockingAt(right)) return left;\\n    }\\n  }\\n  return null;\\n}\\n\\nfunction traceCornerLine(\\n  from: CornerPoint,\\n  to: CornerPoint,\\n  candidates: readonly GridCell[],\\n  sourcesAt: (cell: GridCell) => readonly TerrainLineSource[],\\n  sightBlockingAt: (cell: GridCell) => boolean,\\n): TerrainCornerLineTrace {\\n  const interveningCells = rasterizeCornerLine(from, to, candidates);\\n  let tier: CoverTier = 'none';\\n  let strongest: TerrainLineSource[] = [];\\n  let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);\\n  for (const cell of interveningCells) {\\n    if (sightBlockingAt(cell) && firstBlockingCell === null) {\\n      firstBlockingCell = { ...cell };\\n    }\\n    for (const source of sourcesAt(cell)) {\\n      const comparison = coverRank(source.tier) - coverRank(tier);\\n      if (comparison > 0) {\\n        tier = source.tier;\\n        strongest = [source];\\n      } else if (comparison === 0) {\\n        strongest.push(source);\\n      }\\n    }\\n  }\\n  const sources = uniqueSources(strongest);\\n  return {\\n    targetCorner: { ...to },\\n    interveningCells,\\n    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell,\\n  };\\n}\\n\\nconst COVER_TIER_BY_RANK = ['none', 'half', 'three_quarters', 'total'] as const satisfies readonly CoverTier[];\\n\\nfunction countTier(obstructedLineCount: number): CoverTier {\\n  if (obstructedLineCount === 0) return 'none';\\n  if (obstructedLineCount <= 2) return 'half';\\n  if (obstructedLineCount === 3) return 'three_quarters';\\n  return 'total';\\n}\\n\\nfunction aggregateCornerLines(\\n  sourceCorner: CornerPoint,\\n  lines: readonly TerrainCornerLineTrace[],\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n): TerrainLineTrace {\\n  const blocksSight = lines.length === 4 && lines.every((line) => line.blocksSight);\\n  const physicalBlocksCover = lines.length === 4 && lines.every((line) => line.tier === 'total');\\n  const obstructed = lines.filter((line) => line.tier "'!== '"'none');\\n  const strongestLineTier = obstructed.reduce<CoverTier>((strongest, line) =>\\n    coverRank(line.tier) > coverRank(strongest) ? line.tier : strongest, 'none');\\n  const tier = physicalBlocksCover\\n    ? 'total'\\n    : COVER_TIER_BY_RANK[Math.min(\\n        coverRank(countTier(obstructed.length)),\\n        coverRank(strongestLineTier),\\n        coverRank('three_quarters'),\\n      )] ?? 'none';\\n  const sources = tier === 'none'\\n    ? []\\n    : uniqueSources(obstructed\\n        .filter((line) => line.tier === strongestLineTier)\\n        .flatMap((line) => line.sources));\\n  const interveningCells = [...new Map(lines\\n    .flatMap((line) => line.interveningCells)\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const firstSightBlockingLine = blocksSight ? lines.find((line) => line.blocksSight) : undefined;\\n  return {\\n    sourceCell: { ...sourceCell },\\n    targetCell: { ...targetCell },\\n    sourceCorner: { ...sourceCorner },\\n    lines,\\n    interveningCells,\\n    tier,\\n    blocksSight,\\n    sourceIds: sources.map(taggedSourceId),\\n    sources,\\n    firstBlockingCell: firstSightBlockingLine?.firstBlockingCell ?? null,\\n  };\\n}\\n\\nfunction comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return coverRank(left.tier) - coverRank(right.tier) ||\\n    left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction compareOpticalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {\\n  return left.sourceCorner.row - right.sourceCorner.row ||\\n    left.sourceCorner.column - right.sourceCorner.column;\\n}\\n\\nfunction nearestCells(\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n): { readonly sourceCell: GridCell; readonly targetCell: GridCell } {\\n  const sources = [...sourceCells].sort(compareCells);\\n  const targets = [...targetCells].sort(compareCells);\\n  const firstSource = sources[0];\\n  const firstTarget = targets[0];\\n  if (firstSource === undefined || firstTarget === undefined) {\\n    throw new RangeError('A line query requires non-empty source and target spaces.');\\n  }\\n  let selectedSource = firstSource;\\n  let selectedTarget = firstTarget;\\n  let selectedDistance = Number.POSITIVE_INFINITY;\\n  for (const sourceCell of sources) {\\n    for (const targetCell of targets) {\\n      const distance = Math.max(\\n        Math.abs(sourceCell.column - targetCell.column),\\n        Math.abs(sourceCell.row - targetCell.row),\\n      );\\n      if (distance < selectedDistance) {\\n        selectedSource = sourceCell;\\n        selectedTarget = targetCell;\\n        selectedDistance = distance;\\n      }\\n    }\\n  }\\n  return { sourceCell: selectedSource, targetCell: selectedTarget };\\n}\\n\\nfunction traceSpaces(\\n  state: EncounterState,\\n  sourceCells: readonly GridCell[],\\n  targetCells: readonly GridCell[],\\n  options: TerrainLineOptions,\\n): TerrainLineTrace {\\n  const sightBlockingCells = normalizedSightBlockingCells(options.additionalSightBlockingCells);\\n  const blockerSignature = sightBlockingSignature(sightBlockingCells);\\n  const traceKey = "'`${options.includeCreatures === true ? '"'creatures' : 'terrain'}:"'${sourceCells'"\\n    .map(cellKey).join(';')}->"'${targetCells.map(cellKey).join('"';')}#sight:"'${blockerSignature}`;'"\\n  const stateTraces = terrainLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  const cached = stateTraces.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  if ("'!terrainLineTraces.has(state)) terrainLineTraces.set(state, stateTraces);'"\\n  const nearest = nearestCells(sourceCells, targetCells);\\n  const exclusions = new Set([...sourceCells, ...targetCells].map(cellKey));\\n  const indexedSources = indexedTerrainSources(state, options.includeCreatures === true);\\n  const equivalentTraceKey = "'`${terrainSourceSignature('"\\n    state,\\n    options.includeCreatures === true,\\n    indexedSources,\\n  )}\\\\0"'${traceKey}`;'"\\n  const equivalent = equivalentTerrainLineTraces.get(equivalentTraceKey);\\n  if (equivalent "'!== undefined) {'"\\n    stateTraces.set(traceKey, equivalent);\\n    return equivalent;\\n  }\\n  const sourceCorners = outerCorners(sourceCells);\\n  const targetCorners = outerCorners(targetCells);\\n  const cornerColumns = [...sourceCorners, ...targetCorners].map((corner) => corner.column);\\n  const cornerRows = [...sourceCorners, ...targetCorners].map((corner) => corner.row);\\n  const minimumColumn = Math.min(...cornerColumns);\\n  const maximumColumn = Math.max(...cornerColumns);\\n  const minimumRow = Math.min(...cornerRows);\\n  const maximumRow = Math.max(...cornerRows);\\n  const candidateEntries = sightBlockingCells.length === 0\\n    ? [...indexedSources.values()]\\n    : [...new Map([\\n        ...indexedSources.values(),\\n        ...sightBlockingCells.map((cell) => ({ cell, sources: [] })),\\n      ].map((entry) => [cellKey(entry.cell), entry] as const)).values()];\\n  const candidates = candidateEntries\\n    .filter((entry) => "'!exclusions.has(cellKey(entry.cell)) &&'"\\n      entry.cell.column < maximumColumn && entry.cell.column + 1 > minimumColumn &&\\n      entry.cell.row < maximumRow && entry.cell.row + 1 > minimumRow)\\n    .map((entry) => entry.cell);\\n  const sightBlockingKeys = new Set(sightBlockingCells.map(cellKey));\\n  const sightBlockingAt = (cell: GridCell): boolean => {\\n    const key = cellKey(cell);\\n    return "'!exclusions.has(key) && ('"\\n      sightBlockingKeys.has(key) ||\\n      (indexedSources.get(key)?.sources.some((source) => source.tier === 'total') ?? false)\\n    );\\n  };\\n  const traces = sourceCorners.map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      (cell) => indexedSources.get(cellKey(cell))?.sources ?? [],\\n      sightBlockingAt,\\n    )),\\n    nearest.sourceCell,\\n    nearest.targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  const physicalSelected = traces.reduce(\\n    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,\\n    first,\\n  );\\n  const blocksSight = traces.every((trace) => trace.blocksSight);\\n  const opticalSelected = blocksSight\\n    ? traces.reduce(\\n        (best, candidate) => compareOpticalCornerTraces(candidate, best) < 0 ? candidate : best,\\n        first,\\n      )\\n    : null;\\n  const selected: TerrainLineTrace = {\\n    ...physicalSelected,\\n    blocksSight,\\n    firstBlockingCell: opticalSelected?.firstBlockingCell ?? null,\\n  };\\n  stateTraces.set(traceKey, selected);\\n  retainEquivalentTrace(equivalentTraceKey, selected);\\n  return selected;\\n}\\n\\n/** The canonical 2014 corner-to-corner trace for two bare grid cells. */\\nexport function traceTerrainLine(\\n  state: EncounterState,\\n  sourceCell: GridCell,\\n  targetCell: GridCell,\\n  options: TerrainLineOptions = {},\\n): TerrainLineTrace {\\n  return traceSpaces(state, [sourceCell], [targetCell], options);\\n}\\n\\nexport interface CreatureLineOptions {\\n  readonly sourceAnchor?: GridCell;\\n  readonly additionalSightBlockingCells?: readonly GridCell[];\\n}\\n\\nexport function traceCombatantLine(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const traceKey = "'`${String(sourceId)}->${String(targetId)}@${options.sourceAnchor === undefined'"\\n    ? 'current'\\n    : cellKey(options.sourceAnchor)}#sight:"'${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {\\n    sourceId,\\n    targetId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function traceCombatantLineToCells(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetCells: readonly GridCell[],\\n  options: CreatureLineOptions = {},\\n): TerrainLineTrace {\\n  const blockerSignature = sightBlockingSignature(\\n    normalizedSightBlockingCells(options.additionalSightBlockingCells),\\n  );\\n  const targetSignature = targetCells.map(cellKey).join(';');\\n  const anchorSignature = options.sourceAnchor === undefined ? 'current' : cellKey(options.sourceAnchor);\\n  const traceKey = "'`${String(sourceId)}->cells:${targetSignature}@${anchorSignature}#sight:${blockerSignature}`;'"\\n  const cached = combatantLineTraces.get(state)?.get(traceKey);\\n  if (cached "'!== undefined) return cached;'"\\n  const source = options.sourceAnchor === undefined\\n    ? combatantSpace(state, sourceId)\\n    : combatantSpaceAt(state, sourceId, options.sourceAnchor);\\n  const trace = traceSpaces(state, source.cells, targetCells, {\\n    sourceId,\\n    includeCreatures: true,\\n    ...(options.additionalSightBlockingCells === undefined\\n      ? {}\\n      : { additionalSightBlockingCells: options.additionalSightBlockingCells }),\\n  });\\n  const stateTraces = combatantLineTraces.get(state) ?? new Map<string, TerrainLineTrace>();\\n  stateTraces.set(traceKey, trace);\\n  if ("'!combatantLineTraces.has(state)) combatantLineTraces.set(state, stateTraces);'"\\n  return trace;\\n}\\n\\nexport function coverTierBetweenObjects(\\n  objects: readonly WorldObject[],\\n  from: GridCell,\\n  to: GridCell,\\n): CoverTier {\\n  const exclusions = new Set([cellKey(from), cellKey(to)]);\\n  const candidates = [...new Map(objects\\n    .flatMap((object) => object.footprint)\\n    .filter((cell) => "'!exclusions.has(cellKey(cell)))'"\\n    .map((cell) => [cellKey(cell), cell] as const)).values()];\\n  const sourceCell = { ...from };\\n  const targetCell = { ...to };\\n  const targetCorners = outerCorners([to]);\\n  const sourcesAt = (cell: GridCell): readonly TerrainLineSource[] =>\\n    objects.flatMap((object): readonly TerrainLineSource[] =>\\n      objectOccupiesCell(object, cell) && object.blocking.cover "'!== '"'none'\\n        ? [{ kind: 'world_object', id: String(object.id), tier: object.blocking.cover }]\\n        : []);\\n  const sightBlockingAt = (cell: GridCell): boolean =>\\n    "'!exclusions.has(cellKey(cell)) && sourcesAt(cell).some((source) => source.tier === '"'total');\\n  const traces = outerCorners([from]).map((sourceCorner) => aggregateCornerLines(\\n    sourceCorner,\\n    targetCorners.map((targetCorner) => traceCornerLine(\\n      sourceCorner,\\n      targetCorner,\\n      candidates,\\n      sourcesAt,\\n      sightBlockingAt,\\n    )),\\n    sourceCell,\\n    targetCell,\\n  ));\\n  const first = traces[0];\\n  if (first === undefined) throw new RangeError('A line query requires non-empty source and target spaces.');\\n  return traces.reduce((best, candidate) =>\\n    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;\\n}\\n\\nexport type CreatureCoverOptions = CreatureLineOptions;\\n\\nexport interface CombatantCoverResult {\\n  readonly tier: CoverTier;\\n  readonly sourceIds: readonly string[];\\n}\\n\\nexport function coverBetweenCombatants(\\n  state: EncounterState,\\n  sourceId: CombatantId,\\n  targetId: CombatantId,\\n  options: CreatureCoverOptions = {},\\n): CombatantCoverResult {\\n  const trace = traceCombatantLine(state, sourceId, targetId, options);\\n  return { tier: trace.tier, sourceIds: trace.sourceIds };\\n}\\n\";}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/tools/ai-dm-conversation.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_HARD_HELPER\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/tools/ai-dm-conversation.test.ts'))return code+\"it('REVIEW_HARD_HELPER', async()=>{const state=await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json'); const after=reauthoredHardExhaustionSightlines(state);console.log('HELPER_DELTA',JSON.stringify(monsterPlayerVisibilityDelta(state,after,new Map([[combatantId('combatant:generated-5117009-monster-2'),{column:13,row:1}]]))));});\";}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"PHYSICAL_COVER_UNCHANGED_BY_VERTEX\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/src/combat/cover.ts'))return code.replace('    tier,\\n    blocksSight: firstBlockingCell "'!== null,'"','    tier: firstBlockingCell "'!== null ? "total" : tier,'"\\n    blocksSight: firstBlockingCell "'!== null,'"');}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 exited 1 in 2788ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ❯ tests/unit/combat/visibility-field.test.ts (46 tests | 1 failed | 45 skipped) 14ms
     ↓ DIM_LIGHT_RAW_GRADES keeps dim visible and darkness unseen for normal sight
     ↓ LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
     ↓ DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
     ↓ LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE
     ↓ UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN
     ↓ WALL_BLOCKS_TARGET_CELL using the existing corner tracer
     ↓ FOG_CLOUD_BLOCKS_BEYOND_TARGET through a concrete obscured-area effect
     ↓ MAGICAL_DARKNESS_SENSE_MATRIX distinguishes normal, darkvision, Devil's Sight, and truesight
     ↓ HEAVY_FOG_BLOCKS_TRUESIGHT at the target and on intervening rays
     ↓ SPECIAL_SENSE_RANGE_EDGES checks darkvision 60/65 and Devil's Sight 120/125 feet
     ↓ LARGE_OBSERVER_USES_BEST_CELL for range and target-cell tracing
     ↓ BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog
     ↓ BLINDSIGHT_SEES_THROUGH_HEAVY_FOG_IN_RANGE
     ↓ BLINDED_TREMORSENSE_REMAINS_LOCATED
     ↓ ANY_FOOTPRINT_CELL_VISIBLE makes a Large subject visible
     ↓ INVISIBLE_SUBJECT_RETAINS_TRANSPOSE_ELIGIBILITY
     ↓ DETECT_FIELD_ALL_PAIRS_AGREE on every ordered overlay-free fixture pair
     ↓ ALLY_CAST_DARKVISION_APPLIES and SENSE_EFFECT_MAX_RANGE_WINS
     ↓ SENSE_EFFECT_MERGE_IS_ORDER_INDEPENDENT for two darkvision grants
     ↓ INNATE_SENSE_NOT_SHORTENED_BY_EFFECT
     ↓ DEVILS_SIGHT_EFFECT_MERGE_IS_ORDER_INDEPENDENT
     ↓ ALWAYS_ON_DEVILS_SIGHT_FIXTURE_PC initializes a permanent 120-foot grant
     ↓ CACHE_IS_STATE_SCOPED_AFTER_MOVEMENT and keeps the prior state unchanged
     ↓ CACHE_IS_STATE_SCOPED_AFTER_LIGHT_CHANGE
     ↓ CACHE_IS_STATE_SCOPED_AFTER_OBSCUREMENT_END
     ↓ CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL and EFFECT_EXPIRY_REMOVAL
     ↓ SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS
     ↓ SEAM_WITH_ONE_OPEN_SIDE_STAYS_CLEAR
     ↓ SEAM_BLOCKED_CELL_PAIR
     ↓ DIAGONAL_CRACK_SEALED
     ↓ DIAGONAL_CRACK_CONTROL_ONE_BLOCKER
     ↓ STAIRCASE_WALL_SEALED
     ↓ STAIRCASE_MIRRORED_SEALED
     ↓ VERTICAL_STEP_SEALED
     ↓ STAIRCASE_SPLIT_BY_OPEN_CELL_STAYS_CLEAR
     ↓ OUTER_FACE_GRAZE_STILL_CLEAR
     ↓ SOLID_2x2_BLOCK
     ↓ DIAGONAL_CORNER_TOUCH_SEALED_D642
     × PHYSICAL_COVER_UNCHANGED_BY_VERTEX 12ms
     ↓ PHYSICAL_COVER_UNCHANGED_BY_SEAM
     ↓ EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint
     ↓ SIGHT_ONLY_BLOCKER_PRESERVES_COVER even when fog flips the preferred optical corner
     ↓ PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR
     ↓ UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING
     ↓ SIGHT_TRACER_HAS_SINGLE_OWNER at the final migration stage
     ↓ PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > VIS-FIELD-01 optical tracer separation > PHYSICAL_COVER_UNCHANGED_BY_VERTEX
AssertionError: expected 'total' to be 'half' // Object.is equality

Expected: "half"
Received: "total"

 ❯ tests/unit/combat/visibility-field.test.ts:1262:24
    1260|
    1261|     // Pre-D642 physical pin: interior crossings obstruct two target-c…
    1262|     expect(trace.tier).toBe('half');
       |                        ^
    1263|   });
    1264|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 45 skipped (46)
   Start at  22:11:52
   Duration  2.67s (transform 1.05s, setup 0ms, import 2.56s, tests 14ms, environment 0ms)


 succeeded in 4084ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/tools/ai-dm-conversation.test.ts > REVIEW_HARD_HELPER
HELPER_DELTA {"opened":["combatant:generated-5117009-monster-1->combatant:fighter","combatant:generated-5117009-monster-2->combatant:fighter","combatant:generated-5117009-monster-2->combatant:cleric","combatant:generated-5117009-monster-5->combatant:wizard","combatant:generated-5117009-monster-6->combatant:wizard"],"closed":[]}

HELPER_DELTA {"opened":["combatant:generated-5117009-monster-1->combatant:fighter","combatant:generated-5117009-monster-2->combatant:fighter","combatant:generated-5117009-monster-2->combatant:cleric","combatant:generated-5117009-monster-5->combatant:wizard","combatant:generated-5117009-monster-6->combatant:wizard"],"closed":[]}

 ✓ tests/unit/tools/ai-dm-conversation.test.ts (111 tests | 110 skipped) 16ms

 Test Files  1 passed (1)
      Tests  1 passed | 110 skipped (111)
   Start at  22:11:51
   Duration  3.97s (transform 1.86s, setup 0ms, import 3.87s, tests 16ms, environment 0ms)


 succeeded in 8160ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ✓ tests/unit/vtt/room-generator-los-cover.test.ts (112 tests | 111 skipped) 4936ms
     ✓ retains a productive first-turn option for every living monster in the versioned basis  4935ms

 Test Files  1 passed (1)
      Tests  1 passed | 111 skipped (112)
   Start at  22:11:50
   Duration  8.01s (transform 1.32s, setup 0ms, import 2.99s, tests 4.94s, environment 0ms)


exec
/bin/bash -lc "python3 - <<'PY'
from fractions import Fraction
from math import gcd
n=0
for x in range(5):
 for y in range(5):
  for X in range(5):
   for Y in range(5):
    if (x,y)==(X,Y):continue
    dx,dy=X-x,Y-y;g=gcd(abs(dx),abs(dy))
    actual={(x+dx*i//g,y+dy*i//g) for i in range(1,g)}
    expected=set()
    for a in range(5):
     for b in range(5):
      t=Fraction(a-x,dx) if dx else Fraction(b-y,dy)
      if 0<t<1 and x+t*dx==a and y+t*dy==b:expected.add((a,b))
    assert actual==expected
    n+=1
print('GCD exact rational comparisons:',n)
import json
p='tests/fixtures/arena-basis-hard/seed-5117009.json'
s=json.load(open(p))
print('fixture top keys',list(s))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
GCD exact rational comparisons: 600
fixture top keys ['encounter', 'spec']

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/vtt/room-generator-los-cover.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"retains a productive first-turn option\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "python3 - <<'PY'
import json
s=json.load(open('tests/fixtures/arena-basis-hard/seed-5117009.json'))['encounter'];print(list(s))
PY
nl -ba tests/unit/combat/visibility-field.test.ts | sed -n '1100,1250p'; rg -n '6203|fixture' tests/unit/vtt/tactical-evaluator-r02.test.ts | head -12" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
['provenance', 'schemaVersion', 'state']
  1100	  });
  1101	
  1102	  it('STAIRCASE_WALL_SEALED', () => {
  1103	    const observer = normalProfile('staircase-wall-observer');
  1104	    const subject = normalProfile('staircase-wall-subject');
  1105	    const blockers = [{ column: 7, row: 3 }, { column: 8, row: 4 }];
  1106	    const state = fieldState(observer, {
  1107	      bounds: { columns: 15, rows: 8 },
  1108	      combatants: [observer, subject],
  1109	      tokens: [placedToken(observer, 13, 4), placedToken(subject, 1, 4)],
  1110	      blockedCells: blockers,
  1111	    });
  1112	    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
  1113	    const stepRay = trace.lines.find((line) =>
  1114	      line.targetCorner.column === 1 && line.targetCorner.row === 4);
  1115	
  1116	    // (13,4)->(1,4) touches upper cell (7,3) and lower cell (8,4) only at vertex (8,4).
  1117	    // No unit edge has two blocking flanks and neither interior is crossed; lower-row (7,3) wins.
  1118	    expect(rasterizeCornerLine({ column: 13, row: 4 }, { column: 1, row: 4 }, blockers)).toEqual([]);
  1119	    expect(stepRay).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 7, row: 3 } });
  1120	    // Pre-fix aggregate physical pin: two diagonal cells obstruct two corner rays, yielding Half Cover.
  1121	    expect(trace.tier).toBe('half');
  1122	  });
  1123	
  1124	  it('STAIRCASE_MIRRORED_SEALED', () => {
  1125	    const observer = normalProfile('mirrored-staircase-observer');
  1126	    const subject = normalProfile('mirrored-staircase-subject');
  1127	    const blockers = [{ column: 7, row: 4 }, { column: 8, row: 3 }];
  1128	    const state = fieldState(observer, {
  1129	      bounds: { columns: 15, rows: 8 },
  1130	      combatants: [observer, subject],
  1131	      tokens: [placedToken(observer, 13, 4), placedToken(subject, 1, 4)],
  1132	      blockedCells: blockers,
  1133	    });
  1134	    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
  1135	    const stepRay = trace.lines.find((line) =>
  1136	      line.targetCorner.column === 1 && line.targetCorner.row === 4);
  1137	
  1138	    // (13,4)->(1,4) reaches vertex (8,4) between TR (8,3) and BL (7,4).
  1139	    // Neither cell interior nor a doubly flanked edge is crossed; lower-row (8,3) wins.
  1140	    expect(rasterizeCornerLine({ column: 13, row: 4 }, { column: 1, row: 4 }, blockers)).toEqual([]);
  1141	    expect(stepRay).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 8, row: 3 } });
  1142	    expect(trace.tier).toBe('half');
  1143	  });
  1144	
  1145	  it('VERTICAL_STEP_SEALED', () => {
  1146	    const observer = normalProfile('vertical-step-observer');
  1147	    const subject = normalProfile('vertical-step-subject');
  1148	    const blockers = [{ column: 4, row: 2 }, { column: 5, row: 3 }];
  1149	    const state = fieldState(observer, {
  1150	      bounds: { columns: 15, rows: 8 },
  1151	      combatants: [observer, subject],
  1152	      tokens: [placedToken(observer, 5, 0), placedToken(subject, 5, 6)],
  1153	      blockedCells: blockers,
  1154	    });
  1155	    const trace = traceTerrainLine(state, { column: 5, row: 0 }, { column: 5, row: 6 });
  1156	    const stepRay = trace.lines.find((line) =>
  1157	      line.targetCorner.column === 5 && line.targetCorner.row === 6);
  1158	
  1159	    // (5,0)->(5,6) reaches vertex (5,3) between TL (4,2) and BR (5,3).
  1160	    // It crosses no cell interior or doubly flanked edge; lower-row (4,2) wins the pair.
  1161	    expect(rasterizeCornerLine({ column: 5, row: 0 }, { column: 5, row: 6 }, blockers)).toEqual([]);
  1162	    expect(stepRay).toMatchObject({ blocksSight: true, firstBlockingCell: { column: 4, row: 2 } });
  1163	    expect(trace.tier).toBe('half');
  1164	  });
  1165	
  1166	  it('STAIRCASE_SPLIT_BY_OPEN_CELL_STAYS_CLEAR', () => {
  1167	    const observer = normalProfile('split-staircase-observer');
  1168	    const subject = normalProfile('split-staircase-subject');
  1169	    const blockers = [{ column: 7, row: 3 }, { column: 9, row: 4 }];
  1170	    const state = fieldState(observer, {
  1171	      bounds: { columns: 15, rows: 8 },
  1172	      combatants: [observer, subject],
  1173	      tokens: [placedToken(observer, 13, 4), placedToken(subject, 1, 4)],
  1174	      blockedCells: blockers,
  1175	    });
  1176	    const trace = traceTerrainLine(state, { column: 13, row: 4 }, { column: 1, row: 4 });
  1177	    const splitRay = trace.lines.find((line) =>
  1178	      line.targetCorner.column === 1 && line.targetCorner.row === 4);
  1179	
  1180	    // (7,3) and (9,4) leave (8,4) open, so no diagonal pair meets at either lattice vertex.
  1181	    // The y=4 ray only grazes one outer face at a time and therefore remains clear.
  1182	    expect(rasterizeCornerLine({ column: 13, row: 4 }, { column: 1, row: 4 }, blockers)).toEqual([]);
  1183	    expect(splitRay).toMatchObject({ blocksSight: false, firstBlockingCell: null });
  1184	    expect(trace.tier).toBe('half');
  1185	  });
  1186	
  1187	  it('OUTER_FACE_GRAZE_STILL_CLEAR', () => {
  1188	    const actor = normalProfile('outer-face-graze-actor');
  1189	    const blockers = [{ column: 2, row: 2 }, { column: 3, row: 2 }];
  1190	    const state = fieldState(actor, {
  1191	      bounds: { columns: 6, rows: 4 },
  1192	      position: { column: 5, row: 3 },
  1193	      blockedCells: blockers,
  1194	    });
  1195	    const trace = traceTerrainLine(state, { column: 0, row: 2 }, { column: 4, row: 2 });
  1196	    const outerFace = trace.lines.find((line) =>
  1197	      line.targetCorner.column === 4 && line.targetCorner.row === 2);
  1198	
  1199	    // (0,2)->(4,2) follows the north faces of (2,2),(3,2); every cell above y=2 is open.
  1200	    expect(rasterizeCornerLine({ column: 0, row: 2 }, { column: 4, row: 2 }, blockers)).toEqual([]);
  1201	    expect(outerFace).toMatchObject({ blocksSight: false, firstBlockingCell: null });
  1202	    expect(trace.blocksSight).toBe(false);
  1203	  });
  1204	
  1205	  it('SOLID_2x2_BLOCK', () => {
  1206	    const actor = normalProfile('solid-block-actor');
  1207	    const state = fieldState(actor, {
  1208	      bounds: { columns: 5, rows: 5 },
  1209	      position: { column: 4, row: 4 },
  1210	      blockedCells: [
  1211	        { column: 1, row: 1 }, { column: 2, row: 1 },
  1212	        { column: 1, row: 2 }, { column: 2, row: 2 },
  1213	      ],
  1214	    });
  1215	    const trace = traceTerrainLine(state, { column: 0, row: 0 }, { column: 3, row: 3 });
  1216	
  1217	    // Every corner ray crosses the 2x2 closed region; the existing physical result is Total Cover.
  1218	    expect(trace).toMatchObject({
  1219	      tier: 'total',
  1220	      blocksSight: true,
  1221	      firstBlockingCell: { column: 1, row: 1 },
  1222	    });
  1223	  });
  1224	
  1225	  it('DIAGONAL_CORNER_TOUCH_SEALED_D642', () => {
  1226	    const observer = normalProfile('diagonal-corner-observer');
  1227	    const blockers = [{ column: 1, row: 0 }, { column: 0, row: 1 }];
  1228	    const state = fieldState(observer, {
  1229	      bounds: { columns: 4, rows: 4 },
  1230	    });
  1231	    const trace = traceTerrainLine(
  1232	      state,
  1233	      { column: 0, row: 0 },
  1234	      { column: 2, row: 2 },
  1235	      { additionalSightBlockingCells: blockers },
  1236	    );
  1237	    const sealedRay = trace.lines.find((line) =>
  1238	      line.targetCorner.column === 3 && line.targetCorner.row === 3);
  1239	
  1240	    // Original pin: (0,0)->(3,3) reaches vertex (1,1) between TR (1,0) and BL (0,1).
  1241	    // D642 seals that exact sight-only ray and picks lower-row cell (1,0); physical tier stays None.
  1242	    expect(rasterizeCornerLine({ column: 0, row: 0 }, { column: 3, row: 3 }, blockers)).toEqual([]);
  1243	    expect(sealedRay).toMatchObject({
  1244	      tier: 'none',
  1245	      blocksSight: true,
  1246	      firstBlockingCell: { column: 1, row: 0 },
  1247	    });
  1248	    // Other source corners legitimately route around the pair's outer faces, so the cell trace stays open.
  1249	    expect(trace).toMatchObject({ tier: 'none', blocksSight: false, firstBlockingCell: null });
  1250	  });
17:  fixtures: ['tests/fixtures/arena-basis-hard/seed-5117009.json'],
76:  inputs.fixtures.readText('tests/fixtures/arena-basis-hard/seed-5117009.json');
77:  return loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117009.json');

 exited 1 in 8820ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ❯ tests/unit/vtt/room-generator-los-cover.test.ts (112 tests | 1 failed | 111 skipped) 5741ms
     ↓ OPEN_RAY_IGNORES_BLOCKS_SIGHT rejects the only opposing pair across a two-blocker seam
     ↓ generated and authored arena fixtures share one strict decoder
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762001
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762002
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'standard' seed 5762003
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762101
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762102
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'hard' seed 5762103
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762201
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762202
     ↓ kills M576-E2-TIER-PRESENT-BUT-NOT-EXERCISED for 'brutal' seed 5762203
     ↓ kills M576-E2-COVER-OVERLAPS-SPAWN across every versioned fixture
     ↓ kills M576-E2-WALL-SEALS-ROOM for every living footprint size
     × retains a productive first-turn option for every living monster in the versioned basis 5740ms
     ↓ kills M576-E2-ONE-SIDE-CANNOT-CHANGE-COVER with a legal destination per side
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'standard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'hard' seed 31
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed +0
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 1
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 2
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 3
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 4
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 5
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 6
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 7
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 8
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 9
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 10
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 11
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 12
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 13
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 14
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 15
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 16
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 17
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 18
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 19
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 20
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 21
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 22
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 23
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 24
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 25
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 26
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 27
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 28
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 29
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 30
     ↓ kills M576-E2-SEED-SPECIFIC-CORRECTION for 'brutal' seed 31
     ↓ kills M576-E2-LARGE-CREATURE-NO-PRODUCTIVE-REGION

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/vtt/room-generator-los-cover.test.ts > D576 los_cover_v1 generator membership > retains a productive first-turn option for every living monster in the versioned basis
Error: Test timed out in 5000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/unit/vtt/room-generator-los-cover.test.ts:342:3
    340|   });
    341|
    342|   it('retains a productive first-turn option for every living monster …
       |   ^
    343|     for (const fixture of FIXTURE_CASES) {
    344|       expectProductiveMonsters(generateRoom(fixture.seed, {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 111 skipped (112)
   Start at  22:12:34
   Duration  8.68s (transform 1.24s, setup 0ms, import 2.86s, tests 5.74s, environment 0ms)


exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:\"REVIEW_FULL_WALL_ENDPOINT\"},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){if(id.endsWith('/tests/unit/combat/visibility-field.test.ts'))return code+\"\\nit('REVIEW_FULL_WALL_ENDPOINT',()=>{\\nconst p=normalProfile('review-endpoint-source'),q=normalProfile('review-endpoint-target');\\nconst blockers=Array.from({length:6},(_,row)=>({column:row<2?1:2,row}));\\nconst state=fieldState(p,{bounds:{columns:6,rows:6},combatants:[p,q],tokens:[placedToken(p,2,1),placedToken(q,0,3)],blockedCells:blockers});\\nconsole.log('FULL_WALL_ENDPOINT',JSON.stringify({trace:traceTerrainLine(state,{column:2,row:1},{column:0,row:3}),sight:sightToCreature(state,p.id,q.id)}));\\nexpect(sightToCreature(state,p.id,q.id).kind).toBe('unseen');\\n});\";}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
exec
/bin/bash -lc "python3 - <<'PY'
import json
s=json.load(open('tests/fixtures/arena-basis-hard/seed-5117009.json'))['encounter']['state'];cells={(x['column'],x['row']) for x in s['blockedCells']}
for old,new in [((10,1),(8,1)),((10,5),(8,5)),((10,2),(8,2))]:
 c=(cells-{old})|{new};x,y=new
 print(old,'->',new,'diagonal neighbors',[p for p in [(x-1,y-1),(x+1,y-1),(x-1,y+1),(x+1,y+1)] if p in c])
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
(10, 1) -> (8, 1) diagonal neighbors []
(10, 5) -> (8, 5) diagonal neighbors []
(10, 2) -> (8, 2) diagonal neighbors []

 exited 1 in 2601ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

stdout | tests/unit/combat/visibility-field.test.ts > REVIEW_FULL_WALL_ENDPOINT
FULL_WALL_ENDPOINT {"trace":{"sourceCell":{"column":2,"row":1},"targetCell":{"column":0,"row":3},"sourceCorner":{"column":2,"row":2},"lines":[{"targetCorner":{"column":0,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":1,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":0,"row":4},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":1,"row":4},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},"sight":{"kind":"visible","grade":"seen","sense":"normal_sight"}}

FULL_WALL_ENDPOINT {"trace":{"sourceCell":{"column":2,"row":1},"targetCell":{"column":0,"row":3},"sourceCorner":{"column":2,"row":2},"lines":[{"targetCorner":{"column":0,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":1,"row":3},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":0,"row":4},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":1,"row":4},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},"sight":{"kind":"visible","grade":"seen","sense":"normal_sight"}}

 ❯ tests/unit/combat/visibility-field.test.ts (47 tests | 1 failed | 46 skipped) 14ms
     ↓ DIM_LIGHT_RAW_GRADES keeps dim visible and darkness unseen for normal sight
     ↓ LIGHT_OBSCUREMENT_FORCES_SEEN_DIM without making the cell invisible
     ↓ DEVILS_SIGHT_RETAINS_OVERLAPPING_LIGHT_OBSCUREMENT
     ↓ LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE
     ↓ UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN
     ↓ WALL_BLOCKS_TARGET_CELL using the existing corner tracer
     ↓ FOG_CLOUD_BLOCKS_BEYOND_TARGET through a concrete obscured-area effect
     ↓ MAGICAL_DARKNESS_SENSE_MATRIX distinguishes normal, darkvision, Devil's Sight, and truesight
     ↓ HEAVY_FOG_BLOCKS_TRUESIGHT at the target and on intervening rays
     ↓ SPECIAL_SENSE_RANGE_EDGES checks darkvision 60/65 and Devil's Sight 120/125 feet
     ↓ LARGE_OBSERVER_USES_BEST_CELL for range and target-cell tracing
     ↓ BLINDED_FIELD_IS_UNSEEN while in-range blindsight sees heavy fog
     ↓ BLINDSIGHT_SEES_THROUGH_HEAVY_FOG_IN_RANGE
     ↓ BLINDED_TREMORSENSE_REMAINS_LOCATED
     ↓ ANY_FOOTPRINT_CELL_VISIBLE makes a Large subject visible
     ↓ INVISIBLE_SUBJECT_RETAINS_TRANSPOSE_ELIGIBILITY
     ↓ DETECT_FIELD_ALL_PAIRS_AGREE on every ordered overlay-free fixture pair
     ↓ ALLY_CAST_DARKVISION_APPLIES and SENSE_EFFECT_MAX_RANGE_WINS
     ↓ SENSE_EFFECT_MERGE_IS_ORDER_INDEPENDENT for two darkvision grants
     ↓ INNATE_SENSE_NOT_SHORTENED_BY_EFFECT
     ↓ DEVILS_SIGHT_EFFECT_MERGE_IS_ORDER_INDEPENDENT
     ↓ ALWAYS_ON_DEVILS_SIGHT_FIXTURE_PC initializes a permanent 120-foot grant
     ↓ CACHE_IS_STATE_SCOPED_AFTER_MOVEMENT and keeps the prior state unchanged
     ↓ CACHE_IS_STATE_SCOPED_AFTER_LIGHT_CHANGE
     ↓ CACHE_IS_STATE_SCOPED_AFTER_OBSCUREMENT_END
     ↓ CACHE_IS_STATE_SCOPED_AFTER_SENSE_EFFECT_REMOVAL and EFFECT_EXPIRY_REMOVAL
     ↓ SEAM_BETWEEN_TWO_BLOCKERS_BLOCKS
     ↓ SEAM_WITH_ONE_OPEN_SIDE_STAYS_CLEAR
     ↓ SEAM_BLOCKED_CELL_PAIR
     ↓ DIAGONAL_CRACK_SEALED
     ↓ DIAGONAL_CRACK_CONTROL_ONE_BLOCKER
     ↓ STAIRCASE_WALL_SEALED
     ↓ STAIRCASE_MIRRORED_SEALED
     ↓ VERTICAL_STEP_SEALED
     ↓ STAIRCASE_SPLIT_BY_OPEN_CELL_STAYS_CLEAR
     ↓ OUTER_FACE_GRAZE_STILL_CLEAR
     ↓ SOLID_2x2_BLOCK
     ↓ DIAGONAL_CORNER_TOUCH_SEALED_D642
     ↓ PHYSICAL_COVER_UNCHANGED_BY_VERTEX
     ↓ PHYSICAL_COVER_UNCHANGED_BY_SEAM
     ↓ EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE including caches and a multi-cell footprint
     ↓ SIGHT_ONLY_BLOCKER_PRESERVES_COVER even when fog flips the preferred optical corner
     ↓ PERCEPTION_GRADES_DRIVE_PASSIVE_BEHAVIOR
     ↓ UNSEEN_SIGHT_SEARCH_AUTO_FAILS_WITHOUT_ROLLING
     ↓ SIGHT_TRACER_HAS_SINGLE_OWNER at the final migration stage
     ↓ PERCEPTION_MODE_CONSUMES_SHARED_SUBJECT_GRADE
   × REVIEW_FULL_WALL_ENDPOINT 14ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/combat/visibility-field.test.ts > REVIEW_FULL_WALL_ENDPOINT
AssertionError: expected 'visible' to be 'unseen' // Object.is equality

Expected: "unseen"
Received: "visible"

 ❯ tests/unit/combat/visibility-field.test.ts:1560:47
    1551|     expect(body).not.toContain('environmentObscurementAt(');
    1552|   });
    1553| });
       |    ^
    1554|

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/1]⎯


 Test Files  1 failed (1)
      Tests  1 failed | 46 skipped (47)
   Start at  22:13:00
   Duration  2.50s (transform 925ms, setup 0ms, import 2.40s, tests 14ms, environment 0ms)


exec
/bin/bash -lc "python3 - <<'PY'
from fractions import Fraction as F
B={(1,r) if r<2 else (2,r) for r in range(6)}
def interior(a,b,c):
 lo,hi=F(0),F(1)
 for s,d,k in zip(a,(b[0]-a[0],b[1]-a[1]),c):
  if d==0:
   if not k<s<k+1:return False
  else:
   u,v=sorted([F(k-s,d),F(k+1-s,d)]);lo=max(lo,u);hi=min(hi,v)
 return lo<hi
counts={'interior':0,'interior_vertex':0,'endpoint_only':0}
for a in [(2,1),(3,1),(2,2),(3,2)]:
 for b in [(0,3),(1,3),(0,4),(1,4)]:
  if any(interior(a,b,c) for c in B):counts['interior']+=1;continue
  t=F(2-a[0],b[0]-a[0]);assert a[1]+t*(b[1]-a[1])==2
  key='endpoint_only' if t in (0,1) else 'interior_vertex';counts[key]+=1
  print(a,'->',b,'junction t=',t,key)
print('16-ray rational classification',counts)
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
(3, 1) -> (1, 3) junction t= 1/2 interior_vertex
(3, 1) -> (0, 4) junction t= 1/3 interior_vertex
(2, 2) -> (0, 3) junction t= 0 endpoint_only
(2, 2) -> (1, 3) junction t= 0 endpoint_only
(2, 2) -> (0, 4) junction t= 0 endpoint_only
(2, 2) -> (1, 4) junction t= 0 endpoint_only
16-ray rational classification {'interior': 10, 'interior_vertex': 2, 'endpoint_only': 4}

codex
The endpoint gap also leaks through a full stepped wall spanning the board. Of 16 corner rays, 10 cross blocker interiors and 2 cross the sealed vertex internally; the remaining 4 start at that vertex and bypass the check. The visibility service reports `seen`. Separately, the isolated productive-option test took 4,935 ms with baseline cover code and timed out at 5,740 ms with the candidate.

exec
/bin/bash -lc "rg -n 'bounds|MAX|integer' src/combat/grid.ts | head -25; nl -ba src/combat/visibility-field.ts | sed -n '30,65p'; git status --short; sha256sum src/combat/cover.ts; git diff --name-only e86a4d26 bc6422bf" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
25:export function isCellInside(bounds: GridBounds, cell: GridCell): boolean {
27:    isWholeNumber(bounds.columns) &&
28:    isWholeNumber(bounds.rows) &&
29:    bounds.columns > 0 &&
30:    bounds.rows > 0 &&
34:    cell.column < bounds.columns &&
36:    cell.row < bounds.rows
45:  bounds: GridBounds,
48:  if (!isCellInside(bounds, cell)) {
63:      if (isCellInside(bounds, candidate)) {
79:    throw new RangeError('Grid cells must use safe-integer coordinates.');
    30	  | 'devils_sight';
    31	
    32	export type SightOutcome =
    33	  | {
    34	      readonly kind: 'visible';
    35	      readonly grade: 'seen' | 'seen_dim';
    36	      readonly sense: SightSense;
    37	    }
    38	  | {
    39	      readonly kind: 'unseen';
    40	      readonly reason: 'blocked' | 'obscured' | 'darkness' | 'out_of_range';
    41	    };
    42	
    43	export type DetectionResult =
    44	  | {
    45	      readonly kind: 'seen';
    46	      readonly sense: 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'devils_sight';
    47	    }
    48	  | {
    49	      readonly kind: 'located';
    50	      readonly sense: 'tremorsense' | 'web_sense';
    51	    }
    52	  | {
    53	      readonly kind: 'undetected';
    54	      readonly reason: 'blocked' | 'hidden' | 'invisible' | 'obscured' | 'darkness' | 'out_of_range';
    55	    };
    56	
    57	export interface VisibilityFieldCell {
    58	  readonly cell: GridCell;
    59	  readonly grade: VisibilityGrade;
    60	}
    61	
    62	export type VisibilityObserverScope =
    63	  | { readonly kind: 'dm_party' }
    64	  | {
    65	      readonly kind: 'player_seat';
e8e97592b4dad1a755a978706d83d2f9953fe9f2dd66339c816fc29f7abc616b  src/combat/cover.ts
src/combat/cover.ts
tests/unit/combat/visibility-field.test.ts
tests/unit/tools/ai-dm-conversation.test.ts
tests/unit/vtt/dm-tactical-intel.test.ts
tests/unit/vtt/scene-snapshot.test.ts
tests/unit/vtt/tactical-evaluator-r02.test.ts

exec
/bin/bash -lc "node --input-type=module <<'JS'
import {startVitest} from 'vitest/node';
const files=[\"tests/unit/combat/visibility-field.test.ts\",\"tests/unit/vtt/scene-snapshot.test.ts\",\"tests/unit/vtt/dm-tactical-intel.test.ts\",\"tests/unit/vtt/tactical-evaluator-r02.test.ts\",\"tests/unit/vtt/two-room-fixture.test.ts\"];
const ctx=await startVitest('test',files,{config:false,run:true,pool:'threads',environment:'node',isolate:false,maxWorkers:1,cache:false,experimental:{viteModuleRunner:true},reporters:['default',{onUserConsoleLog(log){process.stdout.write(log.content+'\\n')}}],testNamePattern:undefined},{configFile:false,server:{watch:null},test:{include:files},plugins:[{name:'review-memory',enforce:'pre',transform(code,id){}}]});
await ctx?.close();
JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 7461ms:

 RUN  v4.1.10 /home/vagrant/PhpstormProjects/dnd-wt-seam-ab

 ✓ tests/unit/combat/visibility-field.test.ts (46 tests) 57ms
 ✓ tests/unit/vtt/tactical-evaluator-r02.test.ts (2 tests) 401ms
     ✓ compares ordered registry allocations with exact post-grant Bless conditioning  390ms
 ✓ tests/unit/vtt/scene-snapshot.test.ts (8 tests) 50ms
 ✓ tests/unit/vtt/dm-tactical-intel.test.ts (6 tests) 3350ms
     ✓ renders target-specific non-nearest R02 rows in always-on context with exact reasons  723ms
     ✓ paginates the full matrix with a state-bound cursor and advertises the read tool to the DM  407ms
     ✓ renders the failure manifest only in the DM profile and retains the 32 KiB trim  1113ms
     ✓ attaches full-precision offered-set and all intel policy versions to accepted capture  604ms
 ✓ tests/unit/vtt/two-room-fixture.test.ts (4 tests) 191ms

 Test Files  5 passed (5)
      Tests  66 passed (66)
   Start at  22:13:40
   Duration  7.33s (transform 1.51s, setup 0ms, import 3.20s, tests 4.05s, environment 0ms)


exec
/bin/bash -lc "rg -n 'placedToken|combatToken|column:|lightRegions' src/vtt/reference-encounter.ts | tail -32; sed -n '1,42p' src/combat/grid.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
1:import { combatToken, type CombatantProfile, type CombatToken } from '../combat/combatant';
112:    { column: 2, row: 3 },
113:    { column: 1, row: 4 },
114:    { column: 1, row: 2 },
115:    { column: 3, row: 3 },
121:    tokens: combatants.map((combatant, index) => combatToken(combatant, positions[index] as GridCell)),
122:    blockedCells: [{ column: 7, row: 2 }],
124:      lightRegions: [{ id: 'reference-hiding-shadow', cells: [{ column: 4, row: 3 }], level: 'darkness' }],
155:        column: current.column + columnDelta,
import { feet, type Feet } from './values';

export interface GridCell {
  readonly column: number;
  readonly row: number;
}

export interface GridBounds {
  readonly columns: number;
  readonly rows: number;
}

/**
 * Shared obstacle representation for movement and template sight lines.
 * A blocked cell is an impassable, opaque 5-foot square.
 */
export interface GridObstacles {
  readonly blockedCells: readonly GridCell[];
}

function isWholeNumber(value: number): boolean {
  return Number.isSafeInteger(value);
}

export function isCellInside(bounds: GridBounds, cell: GridCell): boolean {
  return (
    isWholeNumber(bounds.columns) &&
    isWholeNumber(bounds.rows) &&
    bounds.columns > 0 &&
    bounds.rows > 0 &&
    isWholeNumber(cell.column) &&
    isWholeNumber(cell.row) &&
    cell.column >= 0 &&
    cell.column < bounds.columns &&
    cell.row >= 0 &&
    cell.row < bounds.rows
  );
}

/**
 * Returns eight-way neighbors in row-major order. This order is the stable
 * tie-break used by the pathfinder: top row to bottom row, then left to right.

exec
/bin/bash -lc "python3 - <<'PY'
from fractions import Fraction as F
from math import gcd
wall={(7,2),(6,3),(6,4)}
def interior(a,b,c):
 lo,hi=F(0),F(1)
 for s,d,k in zip(a,(b[0]-a[0],b[1]-a[1]),c):
  if not d:
   if not k<s<k+1:return False
  else:
   u,v=sorted((F(k-s,d),F(k+1-s,d)));lo=max(lo,u);hi=min(hi,v)
 return lo<hi
def blocked(a,b,B,vertex):
 if any(interior(a,b,c) for c in B):return True
 dx,dy=b[0]-a[0],b[1]-a[1]
 if dy==0:
  for x in range(min(a[0],b[0]),max(a[0],b[0])):
   if (x,a[1]-1) in B and (x,a[1]) in B:return True
 if dx==0:
  for y in range(min(a[1],b[1]),max(a[1],b[1])):
   if (a[0]-1,y) in B and (a[0],y) in B:return True
 g=gcd(abs(dx),abs(dy))
 if vertex:
  for i in range(1,g):
   x,y=a[0]+dx*i//g,a[1]+dy*i//g
   if ((x-1,y-1) in B and (x,y) in B) or ((x,y-1) in B and (x-1,y) in B):return True
 return False
def corners(p):return [(p[0]+x,p[1]+y) for x,y in [(0,0),(1,0),(0,1),(1,1)]]
def seen(s,t,v):
 return t"'!=(4,3) and any(not blocked(a,b,wall-{s,t},v) for a in corners(s) for b in corners(t))
for v in [False,True]:
 dm=[];fighter=[]
 for y in range(7):
  for x in range(10):
   t=x,y
   if not any(seen(s,t,v) for s in [(2,3),(1,4),(1,2)]):dm.append(t)
   if not seen((2,3),t,v):fighter.append(t)
 print('"'vertex=',v,'DM fog=',dm,'fighter concealed=',fighter)
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-ab
 succeeded in 0ms:
vertex= False DM fog= [(4, 3)] fighter concealed= [(4, 3), (7, 4), (8, 4), (9, 4)]
vertex= True DM fog= [(4, 3), (8, 3), (9, 3)] fighter concealed= [(8, 2), (9, 2), (4, 3), (8, 3), (9, 3), (7, 4), (8, 4), (9, 4)]

codex
## WALL-F3 — P1: Endpoint exclusion still permits sight through a sealed wall

**Evidence:** [cover.ts:369–373](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:369) excludes both endpoint vertices. D642 requires diagonal junctions to block sight.

I reproduced this with a **complete stepped wall** on a 6×6 board:

- Blockers: column 1, rows 0–1; column 2, rows 2–5.
- Observer `(2,1)`; target `(0,3)`.
- Sealed junction: `(2,2)`, between blockers `(1,1)` and `(2,2)`.

Independent rational enumeration of all **16 rays** found:

| Obstruction | Rays |
|---|---:|
| Blocker interior | 10 |
| Sealed vertex strictly inside the ray | 2 |
| Sealed vertex at the source endpoint | 4 |

The last four bypass the check. Production returns `blocksSight:false` and `{kind:'visible', grade:'seen', sense:'normal_sight'}`. My in-memory `REVIEW_FULL_WALL_ENDPOINT` assertion failed accordingly. Reversing the smaller endpoint probe also leaks through a target endpoint.

This is not the retracted D648 isolated-blocker finding: the wall spans the board, and the rational enumeration identifies every possible ray.

**Fix:** Handle sealed endpoint junctions using the source/target’s side of the junction, preventing passage into the opposite open quadrant while preserving legitimate same-side grazing. Add source-endpoint, target-endpoint, reversed-direction, and zero-length-corner witnesses. Revisit affected snapshot expectations through D569 rather than blindly blocking every endpoint.

## Other checks

**Geometry and ordering — read and independently checked**

- Single-blocker touches and outer-face grazes remain clear; shared edges block.
- Interior diagonal pairs block, including TL+BR with a TR→BL ray. Three/four surrounding blockers are covered by interior crossings or diagonal pairs.
- Python `Fraction` enumeration matched the gcd enumeration for **600 ordered integer endpoint pairs**.
- Progress ordering and lower-row/lower-column tie-breaking are explicit at [cover.ts:414–425](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:414). I found no ordering defect.
- Strictly speaking, a diagonal contact is not the Euclidean interior of the cells’ union. The implementation should follow D642’s explicit sealing rule, which resolves that terminology issue.

**Physical cover — verified**

Tier calculation remains independent of optical hits at [cover.ts:445](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:445), aggregation at line 484, and physical-corner selection at line 629. `coverTierBetweenObjects` uses the same physical selection.

My in-memory mutant assigning `total` whenever `firstBlockingCell !== null` was **killed** by `PHYSICAL_COVER_UNCHANGED_BY_VERTEX`: expected `half`, received `total`.

**r3 derivations — verified**

Independent rational geometry reproduced:

| Projection | Before | Candidate |
|---|---|---|
| DM fog | `(4,3)` | `(4,3),(8,3),(9,3)` |
| Fighter concealment additions | — | `(8,2),(9,2),(8,3),(9,3)` |

In-memory substitution of baseline `cover.ts` reproduced all three historical hashes. Candidate code reproduced all three replacements:

| Hash | Baseline prefix | Candidate prefix |
|---|---|---|
| Pending request | `78f31379` | `0ec0fbbc` |
| Coordinator | `f8fa0780` | `79b076c9` |
| Revision | `35c96ecc` | `52305455` |

The structural comparison found **only** `visibleState.cells` and `visibleState.concealedCells` changed. Canonical state bytes were identical; fingerprint remained `dd802783…66b46a`.

The hard-fixture helper independently produced the original **five opened pairs and zero closures**. Reading fixture bytes found **zero diagonal blocked-cell neighbours** at the three replacement positions `(8,1)`, `(8,5)`, `(8,2)`. The R02 tests retain explicit Half/Three-Quarters cover, clear sight, and both 90-foot-shot assertions.

## Commands and results

Ran:

```text
git diff --check e86a4d26 bc6422bf
git diff --numstat e86a4d26 bc6422bf
git diff e86a4d26 bc6422bf -- tests/fixtures fixtures
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
```

Results: **six files, 387 insertions/49 deletions; no fixture changes; diff-check 0; tsc 0/0; zero added lines over 120 columns; clean checkout.**

Vitest ran through `node --input-type=module` and `startVitest`, with `config:false`, `configFile:false`, `cache:false`, `maxWorkers:1`, `isolate:false`, `pool:'threads'`, and `experimental.viteModuleRunner:true`. All substitutions/probes used an in-memory Vite transform.

| Suite | Result |
|---|---:|
| visibility-field | 46/46 |
| scene-snapshot | 8/8 |
| dm-tactical-intel | 6/6 |
| tactical-evaluator-r02 | 2/2 |
| two-room-fixture | 4/4 |
| **Total** | **66/66** |

The six-suite attempt including conversation reported **79 passed/97 failed**, with read-only `/tmp` failures preventing conversation verification. Its changed geometry helper passed separately in memory.

**Performance:** isolated `retains a productive first-turn option for every living monster in the versioned basis`:

- Baseline cover substituted in memory: **4,935 ms, passed**.
- Candidate: **5,740 ms, failed the unchanged 5,000 ms timeout**.

The added work is gcd computation plus up to four blocker lookups per interior lattice vertex. This confirms the reported performance consequence; I have not treated the explicitly deferred performance work as another blocking finding.

Production `cover.ts` SHA-256 before/after was identical:

```text
e8e97592b4dad1a755a978706d83d2f9953fe9f2dd66339c816fc29f7abc616b
```

VERDICT: REJECT (1 P1, 0 P2)
REVIEW DONE.
tokens used
2,485,044
## WALL-F3 — P1: Endpoint exclusion still permits sight through a sealed wall

**Evidence:** [cover.ts:369–373](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:369) excludes both endpoint vertices. D642 requires diagonal junctions to block sight.

I reproduced this with a **complete stepped wall** on a 6×6 board:

- Blockers: column 1, rows 0–1; column 2, rows 2–5.
- Observer `(2,1)`; target `(0,3)`.
- Sealed junction: `(2,2)`, between blockers `(1,1)` and `(2,2)`.

Independent rational enumeration of all **16 rays** found:

| Obstruction | Rays |
|---|---:|
| Blocker interior | 10 |
| Sealed vertex strictly inside the ray | 2 |
| Sealed vertex at the source endpoint | 4 |

The last four bypass the check. Production returns `blocksSight:false` and `{kind:'visible', grade:'seen', sense:'normal_sight'}`. My in-memory `REVIEW_FULL_WALL_ENDPOINT` assertion failed accordingly. Reversing the smaller endpoint probe also leaks through a target endpoint.

This is not the retracted D648 isolated-blocker finding: the wall spans the board, and the rational enumeration identifies every possible ray.

**Fix:** Handle sealed endpoint junctions using the source/target’s side of the junction, preventing passage into the opposite open quadrant while preserving legitimate same-side grazing. Add source-endpoint, target-endpoint, reversed-direction, and zero-length-corner witnesses. Revisit affected snapshot expectations through D569 rather than blindly blocking every endpoint.

## Other checks

**Geometry and ordering — read and independently checked**

- Single-blocker touches and outer-face grazes remain clear; shared edges block.
- Interior diagonal pairs block, including TL+BR with a TR→BL ray. Three/four surrounding blockers are covered by interior crossings or diagonal pairs.
- Python `Fraction` enumeration matched the gcd enumeration for **600 ordered integer endpoint pairs**.
- Progress ordering and lower-row/lower-column tie-breaking are explicit at [cover.ts:414–425](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:414). I found no ordering defect.
- Strictly speaking, a diagonal contact is not the Euclidean interior of the cells’ union. The implementation should follow D642’s explicit sealing rule, which resolves that terminology issue.

**Physical cover — verified**

Tier calculation remains independent of optical hits at [cover.ts:445](/home/vagrant/PhpstormProjects/dnd-wt-seam-ab/src/combat/cover.ts:445), aggregation at line 484, and physical-corner selection at line 629. `coverTierBetweenObjects` uses the same physical selection.

My in-memory mutant assigning `total` whenever `firstBlockingCell !== null` was **killed** by `PHYSICAL_COVER_UNCHANGED_BY_VERTEX`: expected `half`, received `total`.

**r3 derivations — verified**

Independent rational geometry reproduced:

| Projection | Before | Candidate |
|---|---|---|
| DM fog | `(4,3)` | `(4,3),(8,3),(9,3)` |
| Fighter concealment additions | — | `(8,2),(9,2),(8,3),(9,3)` |

In-memory substitution of baseline `cover.ts` reproduced all three historical hashes. Candidate code reproduced all three replacements:

| Hash | Baseline prefix | Candidate prefix |
|---|---|---|
| Pending request | `78f31379` | `0ec0fbbc` |
| Coordinator | `f8fa0780` | `79b076c9` |
| Revision | `35c96ecc` | `52305455` |

The structural comparison found **only** `visibleState.cells` and `visibleState.concealedCells` changed. Canonical state bytes were identical; fingerprint remained `dd802783…66b46a`.

The hard-fixture helper independently produced the original **five opened pairs and zero closures**. Reading fixture bytes found **zero diagonal blocked-cell neighbours** at the three replacement positions `(8,1)`, `(8,5)`, `(8,2)`. The R02 tests retain explicit Half/Three-Quarters cover, clear sight, and both 90-foot-shot assertions.

## Commands and results

Ran:

```text
git diff --check e86a4d26 bc6422bf
git diff --numstat e86a4d26 bc6422bf
git diff e86a4d26 bc6422bf -- tests/fixtures fixtures
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit
```

Results: **six files, 387 insertions/49 deletions; no fixture changes; diff-check 0; tsc 0/0; zero added lines over 120 columns; clean checkout.**

Vitest ran through `node --input-type=module` and `startVitest`, with `config:false`, `configFile:false`, `cache:false`, `maxWorkers:1`, `isolate:false`, `pool:'threads'`, and `experimental.viteModuleRunner:true`. All substitutions/probes used an in-memory Vite transform.

| Suite | Result |
|---|---:|
| visibility-field | 46/46 |
| scene-snapshot | 8/8 |
| dm-tactical-intel | 6/6 |
| tactical-evaluator-r02 | 2/2 |
| two-room-fixture | 4/4 |
| **Total** | **66/66** |

The six-suite attempt including conversation reported **79 passed/97 failed**, with read-only `/tmp` failures preventing conversation verification. Its changed geometry helper passed separately in memory.

**Performance:** isolated `retains a productive first-turn option for every living monster in the versioned basis`:

- Baseline cover substituted in memory: **4,935 ms, passed**.
- Candidate: **5,740 ms, failed the unchanged 5,000 ms timeout**.

The added work is gcd computation plus up to four blocker lookups per interior lattice vertex. This confirms the reported performance consequence; I have not treated the explicitly deferred performance work as another blocking finding.

Production `cover.ts` SHA-256 before/after was identical:

```text
e8e97592b4dad1a755a978706d83d2f9953fe9f2dd66339c816fc29f7abc616b
```

VERDICT: REJECT (1 P1, 0 P2)
REVIEW DONE.
