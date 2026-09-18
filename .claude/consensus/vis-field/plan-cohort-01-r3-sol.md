
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
RULES (binding, restated): You are the PLANNER (gpt-5.6-sol, high, RESUMED — COHORT-01 plan r1/r2 in worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify, DETACHED clean checkout at 807d2e3c). Sandbox workspace-write, but you may WRITE ONLY .tmp-plans/2026-09-17-cohort-01-plan.md (edit in place to r3 — the FINAL round under the 3-round cap); no other file, no git writes, no generation, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; no full vitest, Playwright, build; never port 4173. The MAIN repo's .claude/decisions.md (/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md, authoritative) is readable: read D648. Model calls WILL fail. End with the named marker.

ASTRA r2 (HIGH) = REJECT (0 P1, 4 P2). F1 and F4 CLOSED. Revise to r3:
PLAN-F3 (P2, still open, lines 294–301): the integration scene's exact oracle is WRONG — astra ran the real planner on your scene: the base menu has TWO candidates (adjacency and visibility, each scoring 60, because P can move (1,4)→(0,3)→(0,2)→(0,1)→(1,0) for 20 ft to where A cannot see P), not one; the selector key is `{actorId:'combatant:A', selector:{kind:'combatant', combatantId:'combatant:P'}}` (extractProposalFactDependencies), not `S(P)`; and with the sealed-corner rule applied in memory, adding (8,4) blocks the initial ray but A keeps its Longbow proposal by moving 25 ft to (8,3), so the mutated menu has THREE candidates (adjacency, reach, visibility), not []. FIX: control A's movement explicitly if the mutation must remove offense (e.g. speed 0 or a pen of blockers), then derive the COMPLETE base and mutated menus and the actual selector keys by hand from src/vtt/speculative-planning.ts:638–660 and extractProposalFactDependencies; keep the post-WALL-01 stop/review gate. The nine-candidate hand table is correct under its stipulated query responses (astra reproduced: radius 60, scores 120 then eight 60s, rows 1–8 retained, row 9 excluded; mutants 62/61 and reversed-tie order) — keep it, but state that it tests ranking/filtering only and does not prove corner sealing.
PLAN-F2 (P2, partial, lines 57–59): the namespace search only covers seeds 001–010; the validator's intervals cover 000–999. FIX: search complete namespaces — `6209[0-9]{3}`, `6_209_[0-9]{3}`, `6209xxx` — likewise 6210/6211 and any replacement candidate; keep the MAIN provenance, verbatim output, reservation classification, and the replacement authorization procedure (astra reproduced your three commands: statuses 0/1/0).
PLAN-F5 (P2, NEW, lines 213–215): v2's "exact" namespace ledger drops the historical exclusions — D569_USED_SEED_NAMESPACES has 5117xxx, 6203xxx, 6204xxx, 6206xxx, 6208xxx; r2 lists only 5118xxx, 6207xxx, 6209xxx, 6210xxx, 6211xxx, and the carried hard-2 / own-cohort special handling vanished. FIX: the complete TEN-namespace union, narrowly defined own-cohort exceptions, a test that removing ANY historical namespace fails, and the precedent's 6204-ledger mutant preserved.
PLAN-F6 (P2, NEW, lines 120–124): membership silently changed from PRODUCTIVITY to MANDATORY OFFENSE — everyMonsterProductive accepts a valid positive movement OR an attack/save/cast/world-object use, but r2 requires an attack/save/cast offer for every living monster while Batch 1 claims v2 keeps the existing contract; observable: in frozen 6203001 monsters 3 and 4 have productive Dash options (35 and 30 ft) and no offensive option. FIX: preserve the existing productivity predicate and apply the resolved-origin sight/cover checks to its TARGETED OFFENSIVE components only (a Dash-only monster stays productive); if you believe mandatory offense is the better contract, do NOT change it silently — flag it as an owner question in the plan and keep the existing predicate as the default.
Append "Round 3 disposition" (each finding → what changed, line refs). Write r3 in place; ≤400 lines; end with "COHORT-01 PLAN R3 DONE".

codex
I’ll make the final revision narrowly around the four open findings: full namespace intervals, the complete historical namespace union, preservation of movement-based productivity, and a corrected production-planner scene with complete hand-derived menus. I’ll read D648 and the dependency extraction/planner paths before editing.
exec
/bin/bash -lc "rg -n '"'^## D648'"' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
sed -n '23070,23110p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '45,140p'
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '190,335p'
rg -n \"D569_USED_SEED_NAMESPACES|everyMonsterProductive|brutalRoomMembershipViolations\" tools/d569-second-family-manifest.ts tests/unit/vtt/arena-basis-brutal-b.test.ts tests/unit/vtt/room-generator.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
23077:## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
## D646 — SUPERVISOR (2026-09-17 20:07): COHORT-01 plan r1 REJECTED by astra r1 (HIGH; 0 P1, 3 P2, 1 P3; saved review-plan-cohort-01-astra-r1.md); r2 dispatched to the planner
PLAN-F1 (P2): v6 has no experiment-identity boundary — session keys {family, arm, seed, rep} (d569-blind-experiment.ts:705) and row matching (:762) omit the manifest identity, and the unchanged hard fixtures keep their hashes, so 240/330/240 cells are indistinguishable across v5/v6. PLAN-F2 (P2): the namespace audit is unsound — stale worktree decisions file, patterns miss `6209xxx` and `6_209_001` forms, and D643/D645's reservations must be classified as such. PLAN-F3 (P2): the speculative-planning oracle must be a predeclared hand-calculated scene (≥9 eligible candidates, tie order, the excluded ninth, the exact mutation result). PLAN-F4 (P3): Batch 6 has eight files. Astra independently confirmed the rest: 20/20 fog-key single-key diffs via the real generator; the scout's 12+4 blocked rays per PC (wizard 16) and labels exactly Dodge/End Turn; Room-8 monsters 1/2/4 Dodge, monster 5's 55-ft Dash (10 steps × 5 + 5 difficult); the cap guard rejects a 57,580-byte block and accepts it with the guard disabled; 52 paths (18 existing + 34 new), all existing ones present. All four findings accepted. r2 (planner resumed 01a0b1bb…; brief plan-cohort-01-r2.md; r1 archived as .tmp-plans/2026-09-17-cohort-01-plan.r1.md) must also require canonicalD569SecondFamilyRegeneration in the active v6 test and rejection witnesses for non-fog-key differences and for legacy keys in new fixtures.

## D647 — SUPERVISOR (2026-09-17 20:22): WALL-01 fix r1 harvested (sol; saved impl-wall-01-fix-r1-sol.md) — my verification running on the throwaway checkout; COHORT-01 plan r2 harvested (sha 4f3385b4…, 373 lines; r1 archived) — astra r2 (HIGH, resumed) running
SOL fix r1: vertex lookup now queries sightBlockingAt directly around each GCD-enumerated interior lattice vertex (no candidate bbox), also on the coverTierBetweenObjects path; the three axis witnesses (my geometries: first cells (7,3) / (8,3) / (4,2)) + split control; 46/46; four mutants incl. the bbox-regression one (exactly the three axis witnesses red); counts table unchanged before/after (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36 — now with a working rule); 42 seeds byte-identical (aggregate 7b884bf9…); pair 39.1 s; the 35 frozen/behaviour reds unchanged; four los-cover 5 s budget timeouts under the combined audit (110/112 isolated with two) — perf, not re-pinned. MY VERIFICATION (verify-wall-01-r1.log; ../dnd-wt-seam-ab reset to 807d2e3c + patch): tsc, my seven-case probe (A/B/C/D must block, E split pair / F outer-face graze / G single corner must stay clear), a vertex-lookup-null mutant, the suites, los-cover alone, pair.
PLAN r2 disposition (planner): F1 → separately pinned outer-v6 identity in session keys/cells/rows/matching, v5 preserved, v5 hard rows rejected; F2 → pre-Batch-2 gate against MAIN decisions, plain/xxx/underscore forms, verbatim output, reservations classified, three families reserved together, Allowed-file amendment before replacement generation; F3 → fixed two-proposal integration scene + nine-candidate hand table (radii, paths, scores, byte tie order, excluded ninth, exact seam mutation); F4 → counts fixed; canonical regeneration required for active v6; rejection witnesses for non-fog differences and legacy keys in v2. Astra r2 told to verify the F3 hand table itself.

## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
RETRACTION, at full length. In D645 I rejected WALL-01 as P1 on two grounds, both wrong: (1) I claimed the vertex map was built from the bounding-box-filtered `candidates`; it was built from `candidateEntries` — the UNFILTERED union of indexed sources and blocked cells — so no cell was ever excluded; (2) I read my probe's aggregate blocksSight=false for two isolated diagonal blockers as "the rule is inert", but blocksSight is true only when EVERY corner ray is blocked, and in that geometry the ray along the far face (y=5) is legitimately clear (a graze) — the aggregate false was CORRECT. The decisive test I should have run first: a FULL stepped wall (column 7 rows 0–3, column 8 rows 4–7), Medium tokens (13,4)→(1,4): baseline 807d2e3c leaks (false); ORIGINAL WALL-01 blocks (true, first (7,3)); fix r1 blocks (true). Verified by me tonight on the throwaway checkout, all three trees. So the original WALL-01 was correct; fix r1 replaced a correct precomputed map with equivalent on-the-fly lookups and added per-ray witnesses for my three geometries (valid per-ray, and the split-pair control) — harmless, kept as the candidate, but the "bbox regression" mutant sol reports is a restriction the original never had. Sol did not push back on a false P1; the brief told it what to find. Lesson recorded in memory (aggregate vs per-ray; read the code path before naming a cause).
REAL FINDING (WALL-F2, D642 consequence, not a defect): tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" is red with the vertex rule (8/8 on clean 807d2e3c): the two-room scene's derived fog gains cells (8,3) and (9,3) — a sealed diagonal crack now conceals two cells the party could previously see through. Sol's suite audit did not include scene-snapshot. Handling = D569 demonstrate-then-normalize exactly as B4/B2 did for this test (D635.5–.7: show the vertex, the ray, the two cells; then re-pin the persisted expectation and the revision checksum/fingerprint with the derivation). An UNTRUNCATED full vitest on the r1 candidate is running (full-vitest-wall-r1.log) to find every other consequence before the fix-r2 brief.
MY VERIFICATION of fix r1 otherwise (verify-wall-01-r1.log): tsc 0/0; diff-check 0; vertex-lookup-null mutant → 5 sealed witnesses red; suites 2150/2186 = the 35 known frozen/behaviour reds + scene-snapshot; los-cover 110/112 (the two 5 s budget timeouts, perf); pair 36/36 in 39 s.
PLAN r2 → astra r2 REJECT (saved review-plan-cohort-01-astra-r2.md): F1, F4 closed; F3 still open (astra ran the real planner: the base menu has two candidates not one, the selector key shape is wrong, and under sealed corners A keeps its shot by moving 25 ft to (8,3) so the mutated menu has three entries, not []); F2 partial (search must cover the whole 000–999 namespaces); F5 NEW (v2's ledger drops the five historical namespaces and the own-cohort handling); F6 NEW (membership silently became mandatory offense; 6203001 monsters 3/4 are Dash-only productive). The nine-candidate table verified correct under its stipulated responses. r3 = the final round (planner resumed; brief plan-cohort-01-r3.md; r2 archived).
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
   109	**Allowed files (3):**
   110	
   111	- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
   112	- `tests/unit/vtt/room-generator.test.ts`
   113	- `tests/unit/vtt/arena-basis-brutal-b.test.ts`
   114	
   115	**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
   116	expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
   117	monster and for an apparently productive ranged offer whose resolved origin has a blocked or
   118	total trace.
   119	
   120	**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
   121	identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
   122	then every living monster has a valid first-turn attack/save/cast offer whose target trace from
   123	`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
   124	contract and `room-generator.ts:1227`'s stricter generated-room predicate.
   125	
   126	Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
   127	frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
   128	productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
   129	reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
   130	Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
   131	D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
   132	
   133	**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
   134	Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
   135	
   136	### Batch 3 — generate primary brutal-v2 6209001-6209010
   137	
   138	**Allowed files (10):**
   139	
   140	- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
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
   246	- `tools/ai-dm-arena.ts`
   247	- `tests/unit/tools/ai-dm-arena.test.ts`
   248	- `tools/ai-dm-rerun-packet.ts`
   249	- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
   250	
   251	**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
   252	`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
   253	lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
   254	directories. Historical labels/protocols retain their old paths and behaviour.
   255	
   256	**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
   257	historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
   258	
   259	### Batch 8 — LOS audit and blind fixture report
   260	
   261	**Allowed files (4):**
   262	
   263	- `tools/los-cover-era-audit.ts`
   264	- `tests/unit/tools/los-cover-era-audit.test.ts`
   265	- `tools/blind-context-fixture-report.ts`
   266	- `tests/unit/vtt/blind-turn-context.test.ts`
   267	
   268	**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
   269	`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
   270	per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
   271	
   272	**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
   273	focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
   274	
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
   295	monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
   296	cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
   297	`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
   298	`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
   299	`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
   300	baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
   301	normalization of the old frozen empty scene.
   302	
   303	Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
   304	P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
   305	`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
   306	All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
   307	The nine non-shadowed candidates and hand oracle are:
   308	
   309	|rank|fact key|refs|legal P destination/path ft|score|result|
   310	|---:|---|---:|---|---:|---|
   311	|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
   312	|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
   313	|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
   314	|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
   315	|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
   316	|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
   317	|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
   318	|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
   319	|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
   320	
   321	All costs are independently <=60; the controlled port rejects every unlisted destination.
   322	Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
   323	exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
   324	the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
   325	ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
   326	
   327	**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
   328	tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
   329	table fail. Common checks; run these three files serially, all named outcomes exact.
   330	
   331	### Batch 10 — 32,768-byte cap rejection witness
   332	
   333	**Allowed files (1):**
   334	
   335	- `tests/unit/vtt/blind-turn-context.test.ts`
tests/unit/vtt/room-generator.test.ts:22:  brutalRoomMembershipViolations,
tests/unit/vtt/room-generator.test.ts:592:      expect(brutalRoomMembershipViolations(brutal)).toEqual([]);
tools/d569-second-family-manifest.ts:38:export const D569_USED_SEED_NAMESPACES = [
tools/d569-second-family-manifest.ts:272:function everyMonsterProductive(room: GeneratedRoom): boolean {
tools/d569-second-family-manifest.ts:287:export function brutalRoomMembershipViolations(
tools/d569-second-family-manifest.ts:328:    everyMonsterProductive(room),
tools/d569-second-family-manifest.ts:342:  return canonicalJson(actual) === canonicalJson(D569_USED_SEED_NAMESPACES);
tools/d569-second-family-manifest.ts:456:          : brutalRoomMembershipViolations(room)));

exec
/bin/bash -lc "sed -n '25,60p' tools/d569-second-family-manifest.ts
sed -n '250,350p' tools/d569-second-family-manifest.ts
sed -n '370,500p' tools/d569-second-family-manifest.ts
sed -n '360,430p' src/vtt/speculative-planning.ts
sed -n '620,665p' src/vtt/speculative-planning.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
  'seed ranges 5118001-5118010 and 6207001-6207010 have no occurrence in .claude/decisions.md, tests/fixtures or tools as of 2026-09-07 (supervisor grep); ranges 5117xxx, 6203xxx, 6204xxx, 6206xxx and 6208xxx are used (primary hard, primary brutal, D466 override/protocol, D572 brutal-b, D572 pool)' as const;

export const D569_SECOND_FAMILY_SEEDS = {
  hard: [
    5_118_001, 5_118_002, 5_118_003, 5_118_004, 5_118_005,
    5_118_006, 5_118_007, 5_118_008, 5_118_009, 5_118_010,
  ],
  brutal: [
    6_207_001, 6_207_002, 6_207_003, 6_207_004, 6_207_005,
    6_207_006, 6_207_007, 6_207_008, 6_207_009, 6_207_010,
  ],
} as const;

export const D569_USED_SEED_NAMESPACES = [
  { label: '5117xxx', start: 5_117_000, end: 5_117_999 },
  { label: '6203xxx', start: 6_203_000, end: 6_203_999 },
  { label: '6204xxx', start: 6_204_000, end: 6_204_999 },
  { label: '6206xxx', start: 6_206_000, end: 6_206_999 },
  { label: '6208xxx', start: 6_208_000, end: 6_208_999 },
] as const;

const manifestSchema = z.strictObject({
  version: z.literal('d569-second-family-manifest-v1'),
  generator: z.strictObject({
    tool: z.literal('tools/generate-arena-basis.ts'),
    canonicalFormat: z.literal('canonical-json-with-trailing-newline'),
    independentRegenerations: z.literal(2),
  }),
  ledgerEntry: z.string(),
  usedSeedNamespaces: z.array(z.strictObject({
    label: z.string(),
    start: z.number().int().nonnegative(),
    end: z.number().int().nonnegative(),
  })),
  cohorts: z.array(z.strictObject({
    difficulty: z.enum(['hard', 'brutal']),
    hardFeatures?.shape === 'single-gate' && hardFeatures.chokepointCells.length === 1 &&
      gate !== undefined && barrier.length === room.spec.dimensions.rows - 1 &&
      !barrier.some((cell) => cell.row === gate.row) && difficultRegions.length >= 1 &&
      hardFeatures.likelyApproachTerrainRegionIds.length > 0 &&
      hardFeatures.likelyApproachTerrainRegionIds.every((id) =>
        difficultRegions.some((region) => region.id === id && region.cells.length > 0)),
    'hard_chokepoint_structure',
    'hard room must retain its single-gate barrier, chokepoint, and approach difficult terrain',
  );
  return violations;
}

function executableCaster(room: GeneratedRoom): boolean {
  return room.spec.monsterRoster.some((entry) => {
    const row = BUNDLED_MONSTER_ROSTER.find((candidate) => candidate.id === entry.statblockId);
    const actions = row?.statblock.sourceDetails.actions;
    return actions?.kind === 'present' && actions.value.some((action) =>
      action.kind === 'spellcasting' && action.execution?.kind !== 'absent' &&
      action.spells.some((spell) => spell.manifestStatus === 'implemented'));
  });
}

function everyMonsterProductive(room: GeneratedRoom): boolean {
  const planningState = freshMonsterPlanningState(room.encounter.state);
  return planningState.combatants
    .filter((combatant) => combatant.profile.kind === 'monster')
    .every((monster) => availableEngineActorOptions(planningState, monster.profile.id, OFFER_ENVIRONMENT)
      .some((option) => {
        const resolution = resolveEngineActorOption(planningState, option, OFFER_ENVIRONMENT);
        return resolution.valid && (resolution.mechanics.movementCostFeet > 0 ||
          resolution.mechanics.actionSlots.some((slot) =>
            slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
            slot.kind === 'use_world_object'));
      }));
}

/** State-derived brutal membership; hashes and creature names alone cannot satisfy it. */
export function brutalRoomMembershipViolations(
  room: GeneratedRoom,
  sameSeedHard: GeneratedRoom = generateRoom(room.spec.seed, { difficulty: 'hard' }),
): readonly D569SecondFamilyViolation[] {
  const violations: D569SecondFamilyViolation[] = [];
  addViolation(violations, room.spec.difficultyProfile === 'brutal', 'brutal_difficulty', 'room is not tagged brutal');
  addViolation(
    violations,
    room.spec.challengeBudgetEighths ===
      sameSeedHard.spec.challengeBudgetEighths * BRUTAL_CHALLENGE_BUDGET_SCALE &&
      room.spec.challengeSpentEighths >= room.spec.challengeBudgetEighths * 0.9 &&
      room.spec.challengeSpentEighths <= room.spec.challengeBudgetEighths,
    'brutal_budget',
    'brutal budget must be scaled from hard and spend 90-100 percent',
  );
  addViolation(
    violations,
    executableCaster(room),
    'brutal_caster',
    'brutal roster must contain an executable implemented caster',
  );

  const terrainCounts = {
    difficult: room.spec.terrain.filter((feature) => feature.kind === 'difficult-terrain-patch').length,
    hazards: room.spec.terrain.filter((feature) => feature.kind === 'hazard-object').length,
    lights: room.spec.terrain.filter((feature) => feature.kind === 'light-source').length,
    obscurement: room.spec.terrain.filter((feature) => feature.kind === 'obscurement-patch').length,
  };
  const terrainTotal = Object.values(terrainCounts).reduce((total, count) => total + count, 0);
  addViolation(
    violations,
    terrainCounts.difficult >= 3 && terrainCounts.hazards >= 3 && terrainCounts.lights >= 2 &&
      terrainCounts.obscurement >= 2 &&
      terrainTotal >= BRUTAL_TERRAIN_FEATURE_COUNT_BAND.minimum &&
      terrainTotal <= BRUTAL_TERRAIN_FEATURE_COUNT_BAND.maximum &&
      room.spec.terrain.length > sameSeedHard.spec.terrain.length,
    'brutal_terrain',
    'brutal terrain must meet every configured minimum/count band and exceed hard density',
  );
  addViolation(
    violations,
    everyMonsterProductive(room),
    'brutal_productivity',
    'every brutal monster must have a productive first-turn offer',
  );
  return violations;
}

function expectedDirectory(difficulty: D569SecondFamilyDifficulty): string {
  return `tests/fixtures/arena-basis-${difficulty}-2`;
}

function sameNamespace(
  actual: readonly { readonly label: string; readonly start: number; readonly end: number }[],
): boolean {
  return canonicalJson(actual) === canonicalJson(D569_USED_SEED_NAMESPACES);
}

/**
 * Validates the pins only after state membership and two independent canonical
 * regenerations. It is pure/model-free; callers provide repository bytes.
 */
export function validateD569SecondFamilyManifest(
  input: unknown,
  );
  addViolation(
    violations,
    manifest.cohorts.length === 2 && new Set(manifest.cohorts.map((cohort) => cohort.difficulty)).size === 2,
    'cohort_set',
    'manifest must contain exactly one hard and one brutal cohort',
  );

  const seenSeeds = new Set<number>();
  for (const difficulty of ['hard', 'brutal'] as const) {
    const cohort = manifest.cohorts.find((candidate) => candidate.difficulty === difficulty);
    if (cohort === undefined) continue;
    const expectedSeeds = D569_SECOND_FAMILY_SEEDS[difficulty];
    addViolation(
      violations,
      cohort.directory === expectedDirectory(difficulty),
      'cohort_directory',
      `${difficulty} cohort directory is not the frozen second-family directory`,
    );
    addViolation(
      violations,
      canonicalJson(cohort.fixtures.map((fixture) => fixture.seed)) === canonicalJson(expectedSeeds),
      'cohort_seed_range',
      `${difficulty} cohort must contain its exact ten contiguous second-family seeds`,
    );

    for (const [index, fixture] of cohort.fixtures.entries()) {
      const expectedSeed = expectedSeeds[index];
      addViolation(
        violations,
        !seenSeeds.has(fixture.seed),
        'duplicate_seed',
        `seed ${String(fixture.seed)} appears more than once`,
      );
      seenSeeds.add(fixture.seed);
      for (const namespace of manifest.usedSeedNamespaces) {
        addViolation(
          violations,
          fixture.seed < namespace.start || fixture.seed > namespace.end,
          'seed_overlap',
          `seed ${String(fixture.seed)} overlaps used namespace ${namespace.label}`,
        );
      }
      addViolation(
        violations,
        d466GeneratedRoomOverride(fixture.seed) === null,
        'generator_override',
        `seed ${String(fixture.seed)} is subject to a generator override`,
      );
      if (expectedSeed === undefined || fixture.seed !== expectedSeed) continue;

      const expectedPath = `${cohort.directory}/seed-${String(fixture.seed)}.json`;
      addViolation(
        violations,
        fixture.path === expectedPath,
        'fixture_path',
        `seed ${String(fixture.seed)} has a non-canonical fixture path`,
      );
      let fixtureBytes: string;
      try {
        fixtureBytes = access.readFixture(fixture.path);
      } catch (error) {
        violations.push({
          code: 'fixture_missing',
          message: `cannot read ${fixture.path}: ${error instanceof Error ? error.message : String(error)}`,
        });
        continue;
      }
      addViolation(
        violations,
        sha256(fixtureBytes) === fixture.sha256,
        'fixture_hash',
        `seed ${String(fixture.seed)} fixture hash changed`,
      );

      try {
        const room = JSON.parse(fixtureBytes) as GeneratedRoom;
        addViolation(
          violations,
          room.spec.seed === fixture.seed,
          'fixture_seed',
          `seed ${String(fixture.seed)} fixture contains a different seed`,
        );
        violations.push(...generatedRoomIntegrityViolations(room, fixtureBytes));
        violations.push(...(difficulty === 'hard'
          ? hardRoomMembershipViolations(room)
          : brutalRoomMembershipViolations(room)));
      } catch (error) {
        violations.push({
          code: 'fixture_parse',
          message: `seed ${String(fixture.seed)} fixture is invalid JSON: ${error instanceof Error ? error.message : String(error)}`,
        });
      }

      const firstGeneration = access.regenerate(fixture.seed, difficulty, 1);
      const secondGeneration = access.regenerate(fixture.seed, difficulty, 2);
      addViolation(
        violations,
        firstGeneration === fixtureBytes,
        'first_regeneration',
        `seed ${String(fixture.seed)} first canonical regeneration differs from the fixture`,
      );
      addViolation(
        violations,
        secondGeneration === firstGeneration && secondGeneration === fixtureBytes,
        'independent_regeneration',
        `seed ${String(fixture.seed)} independent canonical regeneration differs`,
      );
    }
  }
  return violations;
}

export function canonicalD569SecondFamilyRegeneration(
  seed: number,
  difficulty: D569SecondFamilyDifficulty,
  _generation: 1 | 2,
): string {
  return `${canonicalJson(generateRoom(seed, { difficulty: difficulty as RoomDifficultyProfile }))}\n`;
}
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

exec
/bin/bash -lc 'rg -n "function enginePlanningSpeedFeet|export function enginePlanningSpeedFeet|speedFeet" src/vtt/engine-query-port.ts src/combat | head -80
rg -n "Grappled|grappled|speed.*0|movement.*0" tests/unit/vtt src/combat src/vtt | head -100' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
src/vtt/engine-query-port.ts:595:export function enginePlanningSpeedFeet(
src/vtt/engine-query-port.ts:619:        for (const mode of speeds.keys()) speeds.set(mode, payload.speedChange.speedFeet);
src/combat/statblock.ts:627:  readonly speedFeet: number;
src/combat/statblock.ts:1096:function validateSourceDetails(input: MonsterSourceDetailsInput | undefined, speedFeet: number): MonsterSourceDetails {
src/combat/statblock.ts:1123:  if (walk === undefined || walk.feet !== speedFeet) throw new RangeError('Detailed walking speed must match combat walking speed.');
src/combat/statblock.ts:1214:  const sourceDetails = validateSourceDetails(input.sourceDetails, input.speedFeet);
src/combat/statblock.ts:1271:    hitPointMaximum, speed: feet(input.speedFeet), initiativeBonus: finiteInteger(input.initiativeBonus, 'Monster Initiative bonus'),
src/combat/spells/types.ts:541:  readonly speedFeet: number;
src/combat/spells/types.ts:857:        | { readonly kind: 'set'; readonly speedFeet: number }
src/combat/encounter.ts:1854:        for (const mode of speeds.keys()) speeds.set(mode, payload.speedChange.speedFeet);
src/combat/encounter.ts:6916:            speedChange: { kind: 'set', speedFeet: effect.feet },
src/combat/encounter.ts:9801:      speed: feet(stats.speedFeet),
src/combat/statblocks/monster-helpers.ts:53:  speedFeet: number,
src/combat/statblocks/monster-helpers.ts:61:  movement: [{ kind: 'walk', feet: speedFeet, hover: false }, ...additionalMovement],
src/combat/statblocks/undead-crypt.ts:17:  id: 'statblock:warhorse-skeleton', name: 'Warhorse Skeleton', armorClass: 13, hitPointMaximum: 22, speedFeet: 60, initiativeBonus: 1,
src/combat/statblocks/undead-crypt.ts:29:  id: 'statblock:ghoul', name: 'Ghoul', armorClass: 12, hitPointMaximum: 22, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/undead-crypt.ts:46:  id: 'statblock:ghast', name: 'Ghast', armorClass: 13, hitPointMaximum: 36, speedFeet: 30, initiativeBonus: 3,
src/combat/statblocks/undead-crypt.ts:63:  id: 'statblock:specter', name: 'Specter', armorClass: 12, hitPointMaximum: 22, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/undead-crypt.ts:84:  id: 'statblock:minotaur-skeleton', name: 'Minotaur Skeleton', armorClass: 12, hitPointMaximum: 45, speedFeet: 40, initiativeBonus: 0,
src/combat/statblocks/undead-crypt.ts:100:  id: 'statblock:ogre-zombie', name: 'Ogre Zombie', armorClass: 8, hitPointMaximum: 85, speedFeet: 30, initiativeBonus: -2,
src/combat/statblocks/undead-crypt.ts:114:  id: 'statblock:wight', name: 'Wight', armorClass: 14, hitPointMaximum: 82, speedFeet: 30, initiativeBonus: 4,
src/combat/effects.ts:397:        | { readonly kind: 'set'; readonly speedFeet: number }
src/combat/effects.ts:866:      readonly speedFeet: number;
src/combat/effects.ts:904:      readonly speedFeet: 0;
src/combat/effects.ts:948:      readonly speedFeet: number;
src/combat/statblocks/mercenary-company.ts:17:  id: 'statblock:bandit', name: 'Bandit', armorClass: 12, hitPointMaximum: 11, speedFeet: 30, initiativeBonus: 1,
src/combat/statblocks/mercenary-company.ts:31:  id: 'statblock:guard', name: 'Guard', armorClass: 16, hitPointMaximum: 11, speedFeet: 30, initiativeBonus: 1,
src/combat/statblocks/mercenary-company.ts:43:  id: 'statblock:scout', name: 'Scout', armorClass: 13, hitPointMaximum: 16, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/mercenary-company.ts:57:  id: 'statblock:tough', name: 'Tough', armorClass: 12, hitPointMaximum: 32, speedFeet: 30, initiativeBonus: 1,
src/combat/statblocks/mercenary-company.ts:71:  id: 'statblock:spy', name: 'Spy', armorClass: 12, hitPointMaximum: 27, speedFeet: 30, initiativeBonus: 4,
src/combat/statblocks/mercenary-company.ts:87:  id: 'statblock:berserker', name: 'Berserker', armorClass: 13, hitPointMaximum: 67, speedFeet: 30, initiativeBonus: 1,
src/combat/statblocks/mercenary-company.ts:99:  id: 'statblock:knight', name: 'Knight', armorClass: 18, hitPointMaximum: 52, speedFeet: 30, initiativeBonus: 0,
src/combat/statblocks/wild-beasts.ts:16:  id: 'statblock:boar', name: 'Boar', armorClass: 11, hitPointMaximum: 13, speedFeet: 40, initiativeBonus: 0,
src/combat/statblocks/wild-beasts.ts:29:  id: 'statblock:black-bear', name: 'Black Bear', armorClass: 11, hitPointMaximum: 19, speedFeet: 30, initiativeBonus: 1,
src/combat/statblocks/wild-beasts.ts:41:  id: 'statblock:dire-wolf', name: 'Dire Wolf', armorClass: 14, hitPointMaximum: 22, speedFeet: 50, initiativeBonus: 2,
src/combat/statblocks/wild-beasts.ts:53:  id: 'statblock:brown-bear', name: 'Brown Bear', armorClass: 11, hitPointMaximum: 22, speedFeet: 40, initiativeBonus: 1,
src/combat/statblocks/wild-beasts.ts:65:  id: 'statblock:lion', name: 'Lion', armorClass: 12, hitPointMaximum: 22, speedFeet: 50, initiativeBonus: 2,
src/combat/statblocks/wild-beasts.ts:82:  id: 'statblock:tiger', name: 'Tiger', armorClass: 13, hitPointMaximum: 30, speedFeet: 40, initiativeBonus: 3,
src/combat/statblocks/wild-beasts.ts:94:  id: 'statblock:polar-bear', name: 'Polar Bear', armorClass: 12, hitPointMaximum: 42, speedFeet: 40, initiativeBonus: 2,
src/combat/statblocks/wild-beasts.ts:105:  id: 'statblock:saber-toothed-tiger', name: 'Saber-Toothed Tiger', armorClass: 13, hitPointMaximum: 52, speedFeet: 40, initiativeBonus: 3,
src/combat/statblocks/wild-beasts.ts:118:  id: 'statblock:giant-scorpion', name: 'Giant Scorpion', armorClass: 15, hitPointMaximum: 52, speedFeet: 40, initiativeBonus: 1,
src/combat/statblocks/wild-beasts.ts:134:  id: 'statblock:blood-hawk', name: 'Blood Hawk', armorClass: 12, hitPointMaximum: 7, speedFeet: 10, initiativeBonus: 2,
src/combat/statblocks/wild-beasts.ts:147:  id: 'statblock:camel', name: 'Camel', armorClass: 10, hitPointMaximum: 17, speedFeet: 50, initiativeBonus: -1,
src/combat/statblocks/wild-beasts.ts:158:  id: 'statblock:crocodile', name: 'Crocodile', armorClass: 12, hitPointMaximum: 13, speedFeet: 20, initiativeBonus: 0,
src/combat/statblocks/wild-beasts.ts:170:  id: 'statblock:giant-spider', name: 'Giant Spider', armorClass: 14, hitPointMaximum: 26, speedFeet: 30, initiativeBonus: 3,
src/combat/statblocks/wild-beasts.ts:184:  id: 'statblock:giant-constrictor-snake', name: 'Giant Constrictor Snake', armorClass: 12, hitPointMaximum: 60, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/wild-beasts.ts:199:  id: 'statblock:killer-whale', name: 'Killer Whale', armorClass: 12, hitPointMaximum: 90, speedFeet: 5, initiativeBonus: 2,
src/combat/statblocks/wild-beasts.ts:210:  id: 'statblock:archelon', name: 'Archelon', armorClass: 17, hitPointMaximum: 90, speedFeet: 20, initiativeBonus: 3,
src/combat/statblocks/wild-beasts.ts:221:  id: 'statblock:elephant', name: 'Elephant', armorClass: 12, hitPointMaximum: 76, speedFeet: 40, initiativeBonus: -1,
src/combat/statblocks/wild-beasts.ts:233:  id: 'statblock:giant-crocodile', name: 'Giant Crocodile', armorClass: 14, hitPointMaximum: 85, speedFeet: 30, initiativeBonus: -1,
src/combat/statblocks/wild-beasts.ts:248:  id: 'statblock:giant-shark', name: 'Giant Shark', armorClass: 13, hitPointMaximum: 92, speedFeet: 5, initiativeBonus: 3,
src/combat/statblocks/goblinoid-warband.ts:18:  id: 'statblock:goblin-minion', name: 'Goblin Minion', armorClass: 12, hitPointMaximum: 7, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/goblinoid-warband.ts:32:  id: 'statblock:goblin-boss', name: 'Goblin Boss', armorClass: 17, hitPointMaximum: 21, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/goblinoid-warband.ts:51:  id: 'statblock:bugbear-warrior', name: 'Bugbear Warrior', armorClass: 14, hitPointMaximum: 33, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/goblinoid-warband.ts:68:  id: 'statblock:bugbear-stalker', name: 'Bugbear Stalker', armorClass: 15, hitPointMaximum: 65, speedFeet: 30, initiativeBonus: 2,
src/combat/statblocks/goblinoid-warband.ts:87:  id: 'statblock:hobgoblin-captain', name: 'Hobgoblin Captain', armorClass: 17, hitPointMaximum: 58, speedFeet: 30, initiativeBonus: 4,
src/combat/statblocks/vane-warren.ts:94:  speedFeet: 30,
src/combat/statblocks/vane-warren.ts:183:    speedFeet: 30,
src/combat/spells/definitions.ts:1031:    operation: { kind: 'effect', effect: effect({ kind: 'flight', speedFeet: 60, canHover: true, fallsWhenEffectEnds: true }, { concentration: true, durationRounds: 100 }) },
src/combat/spells/definitions.ts:1055:    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'hypnotic_pattern', conditions: ['Charmed', 'Incapacitated'], speedFeet: 0, endsOnDamage: true, wakeAction: true }, { concentration: true, durationRounds: 10 }) },
src/combat/spells/definitions.ts:1097:    operation: { kind: 'utility', effect: { kind: 'phantom_steed', speedFeet: 100, travelMilesPerHour: 13, equipmentVanishDistanceFeet: 10, fadeRounds: 10 }, concentration: false, durationRounds: 600 },
src/combat/statblocks/homebrew-beast-families.ts:261:    speedFeet: walkSpeed, initiativeBonus: abilities.dexterity.modifier, savingThrowBonuses: savingThrowBonuses(abilities),
src/combat/statblocks/astral-tower.ts:62:  id: 'statblock:air-elemental', name: 'Air Elemental', armorClass: 15, hitPointMaximum: 90, speedFeet: 10,
src/combat/statblocks/astral-tower.ts:107:  id: 'statblock:animated-armor', name: 'Animated Armor', armorClass: 18, hitPointMaximum: 33, speedFeet: 25,
src/combat/statblocks/astral-tower.ts:124:  id: 'statblock:black-pudding', name: 'Black Pudding', armorClass: 7, hitPointMaximum: 68, speedFeet: 20,
src/combat/statblocks/astral-tower.ts:176:  id: 'statblock:doppelganger', name: 'Doppelganger', armorClass: 14, hitPointMaximum: 52, speedFeet: 30,
src/combat/statblocks/astral-tower.ts:227:  id: 'statblock:earth-elemental', name: 'Earth Elemental', armorClass: 17, hitPointMaximum: 147, speedFeet: 30,
src/combat/statblocks/astral-tower.ts:255:  id: 'statblock:gargoyle', name: 'Gargoyle', armorClass: 15, hitPointMaximum: 67, speedFeet: 30,
src/combat/statblocks/astral-tower.ts:271:  id: 'statblock:ghost', name: 'Ghost', armorClass: 11, hitPointMaximum: 45, speedFeet: 5,
src/combat/statblocks/astral-tower.ts:342:  id: 'statblock:giant-rat', name: 'Giant Rat', armorClass: 13, hitPointMaximum: 7, speedFeet: 30,
src/combat/statblocks/astral-tower.ts:356:  id: 'statblock:mimic', name: 'Mimic', armorClass: 12, hitPointMaximum: 58, speedFeet: 20,
src/combat/statblocks/astral-tower.ts:407:  id: 'statblock:roc', name: 'Roc', armorClass: 15, hitPointMaximum: 248, speedFeet: 20, initiativeBonus: 8,
src/combat/statblocks/astral-tower.ts:428:  id: 'statblock:stirge', name: 'Stirge', armorClass: 13, hitPointMaximum: 5, speedFeet: 10,
src/combat/statblocks/astral-tower.ts:450:  id: 'statblock:will-o-wisp', name: 'Will-o’-Wisp', armorClass: 19, hitPointMaximum: 27, speedFeet: 5,
src/combat/statblocks/astral-tower.ts:509:  readonly speedFeet: number;
src/combat/statblocks/astral-tower.ts:517:    ...baseDetails([options.source], options.classification, options.challenge, unsupported('Original clean-room HP are authored directly rather than transcribed as Hit Dice.'), options.speedFeet, options.abilities, options.movement),
src/combat/statblocks/astral-tower.ts:530:  id: 'homebrew:escape-the-astral-tower/astraldendon', name: 'Astraldendon', armorClass: 13, hitPointMaximum: 8, speedFeet: 30,
src/combat/statblocks/astral-tower.ts:532:  sourceDetails: homebrewDetails({ source: GIANT_RAT_SOURCE, classification: { sizes: ['Small'], type: 'Plant', subtype: null, alignment: 'Unaligned' }, challenge: { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, speedFeet: 30, abilities: astraldendonAbilities, senses: [], passivePerception: 10, actions: [melee('thorn', 'Thorn', 4, [damage(5, 1, 6, 2, 'Piercing')])] }),
src/combat/statblocks/astral-tower.ts:538:  id: 'homebrew:escape-the-astral-tower/astralmycon', name: 'Astralmycon', armorClass: 12, hitPointMaximum: 9, speedFeet: 20,
src/combat/statblocks/astral-tower.ts:540:  sourceDetails: homebrewDetails({ source: GIANT_RAT_SOURCE, classification: { sizes: ['Small'], type: 'Plant', subtype: 'Fungus', alignment: 'Unaligned' }, challenge: { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 }, speedFeet: 20, abilities: astralmyconAbilities, senses: [{ kind: 'darkvision', rangeFeet: 60 }], passivePerception: 11, actions: [melee('buffet', 'Buffet', 3, [damage(5, 1, 6, 2, 'Bludgeoning')])] }),
src/vtt/speculative-planning.ts:502:  const dash = awaitingOwnTurn || player.turn.action.kind !== 'spent' ? speed : 0;
src/vtt/speculative-planning.ts:570:    ?.turn.movement.remaining ?? 0;
src/vtt/plan-materiality.ts:15:  movementCostBucketFeet: 10,
src/vtt/plan-materiality.ts:114:        movementCostBucketFeet: Math.floor(resolution.mechanics.movementCostFeet / 10) * 10,
src/vtt/encounter-app.ts:604:    let movementSpent = 0;
src/vtt/intel/contracts.ts:339:  | 'Grappled'
src/combat/visibility.ts:144:      case 'Grappled':
src/vtt/intel/option-outcome.ts:1256:      const credit = speed === 0
src/vtt/intel/team-scorer.ts:231:  if (movementCostFeet > 0) return true;
src/vtt/speculative-plan-types.ts:14:      readonly name: Exclude<ConditionName, 'Charmed' | 'Frightened' | 'Grappled' | 'Exhaustion'>;
src/vtt/speculative-plan-types.ts:17:      readonly name: 'Charmed' | 'Frightened' | 'Grappled';
src/combat/combat-rules.ts:283:        condition === 'Charmed' || condition === 'Frightened' || condition === 'Grappled'
src/combat/combat-rules.ts:294:        case 'Grappled':
tests/unit/vtt/roll-defense-modifiers.test.ts:320:      kind: 'movement_region', region: { id: `thorn-${String(modifier)}`, cells: [{ column: 3, row: 0 }] },
src/vtt/intel/movement-options.ts:97:          left.semantic.kind === 'move_within_speed_to_enable_attack') ? 0 : 1;
src/vtt/intel/movement-options.ts:100:          right.semantic.kind === 'move_within_speed_to_enable_attack') ? 0 : 1;
src/combat/conditions.ts:11:  'Grappled',
src/combat/conditions.ts:26:type SourceConditionName = 'Charmed' | 'Frightened' | 'Grappled';
src/combat/conditions.ts:72:      readonly kind: 'grappled';
src/combat/conditions.ts:73:      readonly speed: 0;
src/combat/conditions.ts:99:      readonly speed: 0;
src/combat/conditions.ts:111:      readonly speed: 0;
src/combat/conditions.ts:132:      readonly speed: 0;
src/combat/conditions.ts:149:      readonly speed: 0;
src/combat/conditions.ts:231:    condition: 'Grappled',
src/combat/conditions.ts:236:      kind: 'grappled',
src/combat/conditions.ts:237:      speed: 0,
src/combat/conditions.ts:281:      speed: 0,
src/combat/conditions.ts:299:      speed: 0,
src/combat/conditions.ts:338:      speed: 0,
src/combat/conditions.ts:367:      speed: 0,
src/combat/conditions.ts:521:      case 'grappled': {
src/combat/conditions.ts:522:        if (condition.name !== 'Grappled') throw new Error('Condition manifest mismatch.');
src/vtt/intel/actor-knowledge.ts:128:    case 'Grappled':
tests/unit/vtt/turn-exhaustion-coordinator.test.ts:112:    movement: { preference: { willingness: 'none' as const, maximumFeet: 0, opportunityRisk: 'avoid' as const }, engagement: { stance: 'hold_position' as const } },
tests/unit/vtt/turn-exhaustion-coordinator.test.ts:143:        actorId: f.actor, optionId: selectedOption.optionId, movementCostFeet: 0, path: [],
src/combat/movement-evaluator.ts:461:  if (input.speedPerTurn === feet(0)) return 'speed_zero';
src/vtt/mcp/schemas.ts:286:  usable_now: z.boolean(), usable_after_movement: z.boolean(), minimum_movement_feet: z.number().int().min(0).nullable(),
src/vtt/mcp/schemas.ts:292:  movement_feet: z.number().int().min(0), action_available: z.boolean(), bonus_action_available: z.boolean(), reaction_available: z.boolean(),
src/vtt/mcp/schemas.ts:359:  movement_need_feet: z.number().int().min(0).nullable(),
src/vtt/mcp/schemas.ts:429:  zero_movement_offense_count: z.number().int().min(0),
src/vtt/mcp/schemas.ts:576:        movement_feet: z.number().int().min(0),
src/vtt/mcp/schemas.ts:991:      movement_feet: z.number().int().min(0),
src/vtt/mcp/schemas.ts:999:      minimum_movement_feet: z.number().int().min(0).nullable(),
src/vtt/mcp/schemas.ts:1005:      zero_movement_offense_count: z.number().int().min(0),
src/vtt/mcp/schemas.ts:1007:      movement: z.array(z.never()).length(0),
src/vtt/mcp/schemas.ts:1136:const reachFacts = z.object({ distance_band: z.enum(['engaged', 'near', 'far', 'unknown']), action_range_feet: z.number().int().min(0).nullable(), reachable_now: z.boolean(), reachable_after_movement: z.boolean(), minimum_movement_feet: z.number().int().min(0).nullable() }).strict();
src/vtt/mcp/schemas.ts:1172:  movement_rows: z.array(movementIntelRow).max(100),
src/vtt/mcp/schemas.ts:1181:const resolutionPreview = z.object({ actor_id: identifier, option_id: identifier, action_slot_count: z.number().int().min(1).max(20), movement_feet: z.number().int().min(0), omitted_riders: z.array(omittedRider).max(100), resolution_digest: z.string().min(64).max(128), summary: summaryText }).strict();
src/vtt/mcp/schemas.ts:1441:  spec('engine.query_reach', 'Batch engine-owned current and post-movement reach checks.', z.object({ ...refInput, queries: z.array(pairQuery).min(1).max(50) }).strict(), pairOutput(reachFacts)),
src/vtt/mcp/schemas.ts:1444:  spec('engine.query_dice_expectation', 'Compare bounded analytic outcomes without consuming RNG.', z.object({ ...refInput, candidates: z.array(z.object({ candidate_id: z.string().min(1).max(100), actor_id: identifier, choice: actionChoice, movement: movementPreference.optional(), engagement: engagement.optional() }).strict()).min(1).max(20), include_distribution: z.boolean().optional() }).strict(), diceOutput),
src/combat/tactical-evaluator.ts:52:  | 'target_grappled_by_attacker_advantage'
src/combat/tactical-evaluator.ts:61:  | 'grappled_attacker_disadvantage'
src/combat/tactical-evaluator.ts:374:      case 'Grappled': return 'grappled_attacker_disadvantage';
src/combat/tactical-evaluator.ts:406:    case 'Grappled':
src/vtt/intel/recovery-capability.ts:215:      const movementFeet = Math.max(0, distance - range);
src/vtt/intel/recovery-capability.ts:227:        reach: movementFeet === 0 ? 'in_range' : 'movement_qualified',
tests/unit/vtt/condition-lifecycle.test.ts:278:    // Any damage wakes Sleep (spell-descriptions.txt:7111-7116); Spike Growth damages entered movement (spell-descriptions.txt:7309-7312).
src/vtt/challenge-feasibility.ts:449:  if (!resolution.valid || resolution.mechanics.movementCostFeet !== 0 || resolution.mechanics.path.length !== 0) {
src/vtt/option-modeling.ts:165:    candidate.movement.preference.maximumFeet !== 0;
src/combat/movement.ts:420:  return { speed: checkedSpeed, spent: feet(0), remaining: checkedSpeed };
src/vtt/mcp/engine-server.ts:969:      usable_now: resolution.valid && movementFeet === 0,
src/vtt/mcp/engine-server.ts:2252:      const actor = [...result.actors].reverse().find((candidate) => candidate.intel.movement.length > 0);
src/vtt/mcp/engine-server.ts:2773:            return intel !== null && Array.isArray(intel['movement']) && intel['movement'].length > 0;
src/vtt/mcp/engine-server.ts:3142:      const maximumFeet = movement.willingness === 'none' ? 0 : movement.maximumFeet;
src/combat/monster-commands.ts:59:    case 'target_grappled_by_attacker':
src/combat/monster-commands.ts:61:        condition.name === 'Grappled' && condition.source === actor)
src/combat/monster-commands.ts:62:        ? [{ mode: 'advantage', reason: 'target_grappled_by_attacker_advantage' }]
src/vtt/reference-encounter.ts:49:      speed: feet(30),
src/vtt/engine-query-port.ts:531:      condition === 'Charmed' || condition === 'Frightened' || condition === 'Grappled'
src/vtt/engine-query-port.ts:541:    case 'Grappled': return [{ name: payload.condition, source: effect.source }];
src/vtt/engine-query-port.ts:614:      speeds.set('walking', (speeds.get('walking') ?? 0) + payload.speedDeltaFeet);
src/vtt/engine-query-port.ts:634:    const walking = Math.max(0, speeds.get('walking') ?? 0);
src/vtt/engine-query-port.ts:1496:      case 'Grappled': return [];
src/vtt/engine-state-capsule.ts:479:      } else if (name === 'Charmed' || name === 'Frightened' || name === 'Grappled') {
src/vtt/engine-state-capsule.ts:551:  capsuleArray(record['movementBlockingObjects'], 'projection.movementBlockingObjects', 10_000)
src/vtt/engine-state-capsule.ts:557:      capsuleArray(object['cells'], 'movementBlockingObject.cells', 10_000)
src/vtt/engine-state-capsule.ts:714:        movementRemainingFeet: combatant.placementStatus === 'placed' ? combatant.turn.movement.remaining : 0,
src/vtt/engine-state-capsule.ts:791:        movementRemainingFeet: token === undefined ? 0 : combatant.turn.movement.remaining,
tests/unit/vtt/blind-turn-context.test.ts:400:    const actor = recordArray(record(context['legal_movement'], 'legal movement')['actors'], 'movement actors')[0];
tests/unit/vtt/blind-turn-context.test.ts:402:    const cell = recordArray(actor['cells'], 'movement cells')[0];
tests/unit/vtt/shared-outcome.test.ts:155:    { kind: 'forced_movement', direction: 'away', origin: 'caster', distanceFeet: 10, save: null },
src/combat/statblock.ts:158:    readonly kind: 'target_grappled_by_attacker' | 'target_not_full_hit_points';
src/combat/statblock.ts:180:      readonly condition: 'target_grappled_by_attacker';
src/combat/statblock.ts:186:      readonly appliesToCondition: 'Grappled';
src/combat/statblock.ts:229:    readonly boundCondition: Extract<ConditionName, 'Grappled' | 'Restrained'>;
src/combat/statblock.ts:232:    readonly endsWhen: { readonly kind: 'condition_ends'; readonly condition: Extract<ConditionName, 'Grappled' | 'Restrained'> };
src/combat/statblock.ts:235:  | { readonly kind: 'speed_reduction'; readonly feet: 0; readonly duration: 'until_start_of_monster_next_turn' }
src/combat/statblock.ts:436:      readonly condition: 'Grappled';
src/combat/statblock.ts:510:      readonly requires: 'creature_grappled_by_monster';
src/combat/statblock.ts:516:      readonly releases: 'selected_grappled_creature';
src/combat/statblock.ts:800:      exactValue(trait.condition, 'Grappled', 'Adhesive condition');
src/combat/statblock.ts:869:      exactValue(mechanic.condition, 'target_grappled_by_attacker', `${label} replacement condition`);
src/combat/statblock.ts:874:      exactValue(mechanic.appliesToCondition, 'Grappled', `${label} escape condition`);
src/combat/statblock.ts:1057:      exactValue(action.requires, 'creature_grappled_by_monster', 'Swoop requirement');
src/combat/statblock.ts:1061:      exactValue(action.releases, 'selected_grappled_creature', 'Swoop release');
src/combat/spells/kb/entries.ts:114:  entry('R-SPELL-054', 'jump', '4710', 'Each affected target can spend 10 feet of movement for one 30-foot jump per turn.'),
src/combat/spells/kb/entries.ts:182:  entry('R-SPELL-122', 'glyph-of-warding', '3802', 'Track the 10-foot glyph, 10-foot movement break, 20-foot explosion, 5d8 damage, and slot scaling.'),
src/combat/spells/kb/entries.ts:221:  entry('R-SPELL-161', 'freedom-of-movement', '3520', 'Ignore difficult terrain and magical movement restraints; higher slots add one touched target each.'),
tests/unit/vtt/blind-intent-resolver.test.ts:556:    const movement = subject.projection.resolvedMovement[0]?.cells.find((entry) =>

codex
D648 confirms the integration fix should constrain the Scout, not reinterpret the planner. I’ll use a typed speed-zero effect, pin both real base candidates with the extracted actor-relative target selector, and reserve the synthetic nine-row table solely for ranking/filtering coverage.
exec
/bin/bash -lc "set +e
PAT='6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx'
rg -n -o -e \""'$PAT" /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
printf '"'main=%s\\n' \""'$?"
rg -n -o -e "$PAT" tests/fixtures tools
printf '"'tracked=%s\\n' \""'$?"
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

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..891ef7e3653c596beb2462bc450ba2a2afc5684f
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -370,4 +389,16 @@
   rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   derivations after WALL-01.
 
-COHORT-01 PLAN R2 DONE
+## Round 3 disposition
+
+- **PLAN-F3 (P2):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
+
+COHORT-01 PLAN R3 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..891ef7e3653c596beb2462bc450ba2a2afc5684f
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -370,4 +389,16 @@
   rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   derivations after WALL-01.
 
-COHORT-01 PLAN R2 DONE
+## Round 3 disposition
+
+- **PLAN-F3 (P2):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
+
+COHORT-01 PLAN R3 DONE

exec
/bin/bash -lc "wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
rg -n '"'^## |''^### Batch|''^'"\\*\\*Allowed files|PLAN-F[2356]|Supporting requirements' .tmp-plans/2026-09-17-cohort-01-plan.md
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '45,145p'
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '205,255p'
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '290,420p'" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
404 .tmp-plans/2026-09-17-cohort-01-plan.md
6:## Outcome and hard gates
35:## D569 demonstrate-then-normalize ledger
50:## Pre-Batch-2 namespace reservation gate
75:## Ordered batches
77:### Batch 1 — validator normalization and historical semantics
79:**Allowed files (3):**
107:### Batch 2 — RED active membership and frozen-productivity retirement
109:**Allowed files (3):**
140:### Batch 3 — generate primary brutal-v2 6209001-6209010
142:**Allowed files (10):**
161:### Batch 4 — generate brutal-b-v2 6210001-6210010
163:**Allowed files (10):**
179:### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
181:**Allowed files (10):**
198:### Batch 6 — v2/v6 manifests, identity boundary, and hashes
200:**Allowed files (8):**
252:### Batch 7 — versioned arena and rerun routes
254:**Allowed files (4):**
269:### Batch 8 — LOS audit and blind fixture report
271:**Allowed files (4):**
285:### Batch 9 — hand-authored behaviour pins
287:**Allowed files (3):**
350:### Batch 10 — 32,768-byte cap rejection witness
352:**Allowed files (1):**
364:## Final targeted verification and handoff
372:## Open questions
377:## Round 2 disposition
381:- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
384:- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
388:- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
392:## Round 3 disposition
394:- **PLAN-F3 (P2):** the production scene now makes A speed zero, uses extracted actor-relative
397:- **PLAN-F2 (P2):** both absence commands now cover every 000-999 plain and underscore seed plus
399:- **PLAN-F5 (P2):** v2 now requires all ten historical/current namespaces, exact own-cohort
401:- **PLAN-F6 (P2):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
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
    57	rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
    58	rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
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
   109	**Allowed files (3):**
   110	
   111	- `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (new)
   112	- `tests/unit/vtt/room-generator.test.ts`
   113	- `tests/unit/vtt/arena-basis-brutal-b.test.ts`
   114	
   115	**R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
   116	expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
   117	positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
   118	resolved origin has a blocked or total trace and MUST fail.
   119	
   120	**Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
   121	identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
   122	then preserve the existing productivity predicate exactly: each living monster has some valid
   123	option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
   124	therefore remains productive. If the qualifying option has targeted attack/save/cast components,
   125	each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
   126	movement-only/world-object qualification does not invent a LOS target. Cite the contract and
   127	`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
   128	
   129	Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
   130	frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
   131	productivity assertions for 6209. In `arena-basis-brutal-b.test.ts:292-397`, retain structural,
   132	reducer, SHA, and round-execution pins but retire only 378-393's 6206 productivity assertion.
   133	Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
   134	D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
   135	
   136	**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
   137	the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
   138	suite is RED only for 30 missing files; frozen suites have no productivity red.
   139	
   140	### Batch 3 — generate primary brutal-v2 6209001-6209010
   141	
   142	**Allowed files (10):**
   143	
   144	- `tests/fixtures/arena-basis-brutal-v2/seed-6209001.json`
   145	- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
   205	- `tests/fixtures/d569-blind-experiment-manifest-v6.json` (new)
   206	- `tests/unit/tools/d569-second-family-manifest.test.ts`
   207	- `tests/unit/tools/d569-blind-experiment.test.ts`
   208	- `tests/unit/tools/d569-v6.test.ts` (new)
   209	- `tests/unit/vtt/arena-basis-brutal-v2.test.ts`
   210	
   211	**R:** strict version/path/range/ledger tests, the exact v5-v6 structural diff, outer-v6 hash,
   212	and cardinalities. Add primary-hard and second-family-hard cross-version witnesses: a v5 observed
   213	row with the same unchanged seed/state/visual hashes must be rejected by v6 as wrong experiment
   214	identity. A missing/wrong identity must also reject. V6 ordinals use manifest order/seed maps;
   215	no `seed - 6203000` assumption survives in a v6 path.
   216	
   217	**Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
   218	proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
   219	ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
   220	6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
   221	constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
   222	namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
   223	ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
   224	6204xxx. V6 is
   225	`d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
   226	other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
   227	
   228	Create a separate `D569ExperimentIdentity = {version, manifestSha256}` from the exact outer
   229	manifest bytes at the load boundary. Pin/export the final v6 SHA-256 outside the manifest.
   230	V6 dry-run cells carry both fields; include both in `sessionKey`. V6 observed rows must carry an
   231	exact match, and row lookup/duplicate/missing keys include identity. Branch by version so v5's
   232	cell shape, legacy session-key derivation, and observed-row matching remain byte-behaviourally
   233	unchanged. Content/state/visual hashes remain truthful content hashes, never overloaded as the
   234	experiment identity. Thus unchanged hard cells cannot cross v5/v6.
   235	
   236	The active `d569-v6.test.ts` access MUST set `regenerate:
   237	canonicalD569SecondFamilyRegeneration`; the fixture-reader helper at
   238	`d569-blind-experiment.test.ts:294-296` may serve historical/synthetic unit tests only. Add a spy
   239	or deliberately divergent canonical regeneration proving v6 actually calls it. Only after all
   240	30 membership checks pass, hash each fixture with SHA/OpenSSL, finalize/hash v2, insert its hash
   241	in v6, finalize/hash v6, and pin that outer hash in code/test.
   242	
   243	**M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
   244	bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
   245	admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
   246	Named witnesses fail each mutant.
   247	
   248	**T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
   249	suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
   250	second-family core 480. Historical v1/v5 suites remain green and never execute v6.
   251	
   252	### Batch 7 — versioned arena and rerun routes
   253	
   254	**Allowed files (4):**
   255	
   290	- `tests/unit/vtt/engine-opportunity-movement-intel.test.ts`
   291	- `tests/unit/vtt/speculative-planning.test.ts`
   292	
   293	**R:** preserve the three current deterministic RED titles before edits. Re-run the following
   294	geometry calculations after WALL-01; a discrepancy stops the batch, never selects a new oracle.
   295	
   296	**Implementation:** composite hard 5117005 labels are exactly `Dodge`, `End Turn`, with no
   297	`Longbow`. Comment the four corner-ray derivation: Scout `(13,3)` -> Fighter `(1,2)` has two rays
   298	enter `(7,2)` and two on shared edge `(7,2)/(7,3)`; -> Cleric `(2,4)` has two on
   299	`(7,3)/(7,4)` and two entering `(7,4)`; -> Wizard `(1,6)` all cross column 7. D635/D642 block
   300	every set. Room 8 pins monsters 1 `(22,1)`, 2 `(21,1)`, 4 `(21,3)` to zero-foot Dodge at current
   301	cells; monster 5 keeps 55-ft Dash `(22,5)->(12,6)` = ten 5-ft steps + 5 difficult. Replace the
   302	stale comment; these are hand calculations.
   303	
   304	For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
   305	monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
   306	`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
   307	`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
   308	`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
   309	and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
   310	Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
   311	exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
   312	`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
   313	proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
   314	cannot flip inside 15x8; Dodge contributes no movement-change fact.
   315	
   316	The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
   317	sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
   318	to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
   319	menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
   320	base/mutated oracle after WALL-01; any difference stops for plan review.
   321	
   322	Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
   323	P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
   324	`S(x)=canonicalJson({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}})`.
   325	All adjacency/reach baselines are false -> true; all visibility baselines are true -> false.
   326	The nine non-shadowed candidates and hand oracle are:
   327	
   328	|rank|fact key|refs|legal P destination/path ft|score|result|
   329	|---:|---|---:|---|---:|---|
   330	|1|`adjacency:S(A):S(P)`|A+B|`(2,1)`/10|`2*60=120`|kept|
   331	|2|`adjacency:S(B):S(P)`|B|`(7,3)`/20|60|kept|
   332	|3|`adjacency:S(P):S(A)`|A|`(2,1)`/10|60|kept|
   333	|4|`adjacency:S(P):S(B)`|B|`(7,3)`/20|60|kept|
   334	|5|`reach:S(A):shortsword:S(P)`|A|`(2,1)`/10|60|kept|
   335	|6|`reach:S(B):shortsword:S(P)`|B|`(7,3)`/20|60|kept|
   336	|7|`visibility:S(A):S(P)`|A|`(6,1)`/15|60|kept|
   337	|8|`visibility:S(B):S(P)`|B|`(6,3)`/15|60|kept|
   338	|9|`visibility:S(P):S(A)`|A|`(6,1)`/15|60|excluded|
   339	
   340	All costs are independently <=60; the controlled port rejects every unlisted destination.
   341	Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
   342	exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
   343	tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
   344	not evidence for D642 corner sealing, which the production integration witness above proves.
   345	
   346	**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
   347	change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
   348	labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
   349	
   350	### Batch 10 — 32,768-byte cap rejection witness
   351	
   352	**Allowed files (1):**
   353	
   354	- `tests/unit/vtt/blind-turn-context.test.ts`
   355	
   356	**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
   357	name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
   358	UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
   359	states required/max byte counts. Baseline may be green because this witnesses existing policy.
   360	
   361	**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
   362	because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
   363	
   364	## Final targeted verification and handoff
   365	
   366	Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
   367	brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
   368	files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
   369	fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
   370	and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
   371	
   372	## Open questions
   373	
   374	None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
   375	procedure; it is not an implementation-time choice.
   376	
   377	## Round 2 disposition
   378	
   379	- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
   380	  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
   381	- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
   382	  underscore forms, records actual output/status, classifies reservations, reserves all three
   383	  families together, and requires Allowed-file amendment before a replacement generation.
   384	- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
   385	  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
   386	- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
   387	  and 52 = 18 existing + 34 new.
   388	- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
   389	  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   390	  derivations after WALL-01.
   391	
   392	## Round 3 disposition
   393	
   394	- **PLAN-F3 (P2):** the production scene now makes A speed zero, uses extracted actor-relative
   395	  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
   396	  nine-row table is explicitly ranking/filtering-only.
   397	- **PLAN-F2 (P2):** both absence commands now cover every 000-999 plain and underscore seed plus
   398	  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
   399	- **PLAN-F5 (P2):** v2 now requires all ten historical/current namespaces, exact own-cohort
   400	  exceptions, removal-of-any-row tests, and the 6204 mutant.
   401	- **PLAN-F6 (P2):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
   402	  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
   403	
   404	COHORT-01 PLAN R3 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..891ef7e3653c596beb2462bc450ba2a2afc5684f
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -370,4 +389,16 @@
   rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
   derivations after WALL-01.
 
-COHORT-01 PLAN R2 DONE
+## Round 3 disposition
+
+- **PLAN-F3 (P2):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
+
+COHORT-01 PLAN R3 DONE

apply patch
patch: completed
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..fd53b4ba5a0d782b0e2ad876112e106c4395b57e
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -355,19 +374,22 @@
 None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
 procedure; it is not an implementation-time choice.
 
-## Round 2 disposition
+## Round 2 disposition (closed/superseded)
 
-- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
-  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
-- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
-  underscore forms, records actual output/status, classifies reservations, reserves all three
-  families together, and requires Allowed-file amendment before a replacement generation.
-- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
-  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
-- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
-  and 52 = 18 existing + 34 new.
-- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
-  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
-  derivations after WALL-01.
+F1 remains closed at lines 211-250; F4 remains closed at lines 25-26 and 198-209.
+F2's r2 work remains at 50-73 and F3 is superseded by the corrected r3 oracle at 304-348.
+Supporting requirements remain at 8-12, 85-102, 236-239, and 293-348.
+
+## Round 3 disposition
+
+- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
 
-COHORT-01 PLAN R2 DONE
+COHORT-01 PLAN R3 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..fd53b4ba5a0d782b0e2ad876112e106c4395b57e
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -355,19 +374,22 @@
 None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
 procedure; it is not an implementation-time choice.
 
-## Round 2 disposition
+## Round 2 disposition (closed/superseded)
 
-- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
-  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
-- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
-  underscore forms, records actual output/status, classifies reservations, reserves all three
-  families together, and requires Allowed-file amendment before a replacement generation.
-- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
-  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
-- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
-  and 52 = 18 existing + 34 new.
-- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
-  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
-  derivations after WALL-01.
+F1 remains closed at lines 211-250; F4 remains closed at lines 25-26 and 198-209.
+F2's r2 work remains at 50-73 and F3 is superseded by the corrected r3 oracle at 304-348.
+Supporting requirements remain at 8-12, 85-102, 236-239, and 293-348.
+
+## Round 3 disposition
+
+- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
 
-COHORT-01 PLAN R2 DONE
+COHORT-01 PLAN R3 DONE

codex
The four corrections are now encoded. The real planner witness has a complete two-candidate base oracle and a speed-zero sealed-wall mutation; the synthetic nine-row oracle is explicitly limited to ranking/filtering. I’m doing the final line-count, scope, marker, and reference audit now.
exec
/bin/bash -lc "wc -l .tmp-plans/2026-09-17-cohort-01-plan.md
nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md | sed -n '1,420p' | tail -45
awk '/"'^'"\\- "'`/{line=$0; sub(/''^- `/,"",line); sub(/`.*/,"",line); print line}'"' .tmp-plans/2026-09-17-cohort-01-plan.md | sort -u | wc -l
rg -n \"6209\\[0-9\\]|ten-namespace|movementCostFeet|DA=|TAP=|ranking/filtering|Round 3 disposition|PLAN-F[2356]\" .tmp-plans/2026-09-17-cohort-01-plan.md
tail -1 .tmp-plans/2026-09-17-cohort-01-plan.md
git diff --check
git status --short --untracked-files=all" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
395 .tmp-plans/2026-09-17-cohort-01-plan.md
   351	
   352	**Allowed files (1):**
   353	
   354	- `tests/unit/vtt/blind-turn-context.test.ts`
   355	
   356	**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
   357	name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
   358	UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
   359	states required/max byte counts. Baseline may be green because this witnesses existing policy.
   360	
   361	**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
   362	because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
   363	
   364	## Final targeted verification and handoff
   365	
   366	Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
   367	brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
   368	files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
   369	fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
   370	and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
   371	
   372	## Open questions
   373	
   374	None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
   375	procedure; it is not an implementation-time choice.
   376	
   377	## Round 2 disposition (closed/superseded)
   378	
   379	F1 remains closed at lines 211-250; F4 remains closed at lines 25-26 and 198-209.
   380	F2's r2 work remains at 50-73 and F3 is superseded by the corrected r3 oracle at 304-348.
   381	Supporting requirements remain at 8-12, 85-102, 236-239, and 293-348.
   382	
   383	## Round 3 disposition
   384	
   385	- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
   386	  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
   387	  nine-row table is explicitly ranking/filtering-only.
   388	- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
   389	  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
   390	- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
   391	  exceptions, removal-of-any-row tests, and the 6204 mutant.
   392	- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
   393	  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
   394	
   395	COHORT-01 PLAN R3 DONE
52
57:rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
58:rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
123:option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
219:ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
308:`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
309:and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
383:## Round 3 disposition
385:- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
387:  nine-row table is explicitly ranking/filtering-only.
388:- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
390:- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
392:- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
COHORT-01 PLAN R3 DONE

diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..fd53b4ba5a0d782b0e2ad876112e106c4395b57e
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -355,19 +374,22 @@
 None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
 procedure; it is not an implementation-time choice.
 
-## Round 2 disposition
+## Round 2 disposition (closed/superseded)
 
-- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
-  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
-- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
-  underscore forms, records actual output/status, classifies reservations, reserves all three
-  families together, and requires Allowed-file amendment before a replacement generation.
-- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
-  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
-- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
-  and 52 = 18 existing + 34 new.
-- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
-  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
-  derivations after WALL-01.
+F1 remains closed at lines 211-250; F4 remains closed at lines 25-26 and 198-209.
+F2's r2 work remains at 50-73 and F3 is superseded by the corrected r3 oracle at 304-348.
+Supporting requirements remain at 8-12, 85-102, 236-239, and 293-348.
+
+## Round 3 disposition
+
+- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
 
-COHORT-01 PLAN R2 DONE
+COHORT-01 PLAN R3 DONE

codex
Updated [COHORT-01 implementation plan r3](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md). Final plan is 395 lines with a verified 52-path scope.

COHORT-01 PLAN R3 DONE
diff --git a/.tmp-plans/2026-09-17-cohort-01-plan.md b/.tmp-plans/2026-09-17-cohort-01-plan.md
index bb90e7191357aae6740ce8d402df16f178302b3c..fd53b4ba5a0d782b0e2ad876112e106c4395b57e
--- a/.tmp-plans/2026-09-17-cohort-01-plan.md
+++ b/.tmp-plans/2026-09-17-cohort-01-plan.md
@@ -1,4 +1,4 @@
-# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
+# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
 
 Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
 D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
@@ -54,8 +54,8 @@
 tracked consumers. Copy commands, stdout, and statuses verbatim into the dated v2 ledger entry.
 
 ```text
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
-rg -n -o -e '6209xxx|6210xxx|6211xxx|620900[1-9]|6209010|621000[1-9]|6210010|621100[1-9]|6211010|6_209_00[1-9]|6_209_010|6_210_00[1-9]|6_210_010|6_211_00[1-9]|6_211_010' tests/fixtures tools
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
+rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools
 rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md
 ```
 
@@ -113,15 +113,18 @@
 - `tests/unit/vtt/arena-basis-brutal-b.test.ts`
 
 **R:** after the reservation gate, declare exact 6209001-10, 6210001-10, 6211001-10 paths;
-expect exactly 30 missing fixtures. Add decoded negative clones for a nonproductive living
-monster and for an apparently productive ranged offer whose resolved origin has a blocked or
-total trace.
+expect exactly 30 missing fixtures. Add decoded clones for a nonproductive living monster, a
+positive-movement-only Dash monster that MUST pass, and a targeted offensive option whose
+resolved origin has a blocked or total trace and MUST fail.
 
 **Implementation:** mirror `arena-basis-brutal-b.test.ts` but order proof before hashes:
 identity/reducer load; brutal budget and 90-100% spend; implemented caster; terrain density/count;
-then every living monster has a valid first-turn attack/save/cast offer whose target trace from
-`resolution.mechanics.finalPosition` is sight-clear and non-total. Cite the existing productivity
-contract and `room-generator.ts:1227`'s stricter generated-room predicate.
+then preserve the existing productivity predicate exactly: each living monster has some valid
+option with `movementCostFeet > 0` OR an attack/save/cast/world-object slot. A Dash-only monster
+therefore remains productive. If the qualifying option has targeted attack/save/cast components,
+each target trace from `resolution.mechanics.finalPosition` must be sight-clear and non-total;
+movement-only/world-object qualification does not invent a LOS target. Cite the contract and
+`room-generator.ts:1227`'s stricter generated-room predicate. Mandatory offense is out of scope.
 
 Move precisely these active assertions: retire `room-generator.test.ts:588-601` productivity for
 frozen 6203001-10 while retaining its 6203001-3 byte/digest pins; add equivalent generation and
@@ -130,8 +133,9 @@
 Batch 1 retires only the analogous 6207 productivity assertion. Each comment cites D635/D642/
 D643: frozen bytes are history; 6209/6210/6211 own the live contract. No skip/todo.
 
-**M/T/V:** force productivity true and treat `blocksSight:true` as open; both clones fail.
-Common checks; active suite is RED only for 30 missing files, frozen suites have no productivity red.
+**M/T/V:** force productivity true, delete the movement arm, and treat `blocksSight:true` as open;
+the nonproductive, Dash-only, and blocked-target clones kill each mutant. Common checks; active
+suite is RED only for 30 missing files; frozen suites have no productivity red.
 
 ### Batch 3 — generate primary brutal-v2 6209001-6209010
 
@@ -211,8 +215,13 @@
 no `seed - 6203000` assumption survives in a v6 path.
 
 **Implementation:** v2 is `d569-second-family-manifest-v2`: byte-carried hard-2 rows/hashes,
-proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and exact
-`usedSeedNamespaces` 5118xxx/6207xxx/6209xxx/6210xxx/6211xxx. V6 is
+proven brutal-2-v2 rows/hashes, the dated verbatim audit/classification, and this exact ordered
+ten-namespace union: 5117xxx, 5118xxx, 6203xxx, 6204xxx, 6206xxx, 6207xxx, 6208xxx,
+6209xxx, 6210xxx, 6211xxx. Keep v1's five-entry historical constant/policy unchanged; add a v2
+constant. V2 overlap validation exempts only the expected fixture in its own exact cohort
+namespace (hard 5118xxx; brutal 6211xxx); cross-cohort and all other overlaps still fail. Removing
+ANY of ten namespaces fails an exact-ledger test; preserve the precedent mutant that removes
+6204xxx. V6 is
 `d569-blind-experiment-v6`: unchanged hard 5117, primary brutal 6209, nested v2 path/hash, every
 other v5 field byte-carried. V1/v5 constants and files remain historical; add v2/v6 constants.
 
@@ -232,8 +241,9 @@
 in v6, finalize/hash v6, and pin that outer hash in code/test.
 
 **M:** omit experiment identity from session/row keys; substitute a v5 hard row; use committed
-bytes as v6 regeneration; admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference,
-or generation 2 divergence. Named witnesses fail each mutant.
+bytes as v6 regeneration; remove 6204 or any ledger row; over-broaden the 5118/6211 exception;
+admit v1/6203, a 6207/6209 overlap, a fourth carry-forward difference, or generation 2 divergence.
+Named witnesses fail each mutant.
 
 **T/V:** common checks; both hash tools agree for 30 fixtures, v2, and outer v6. Targeted D569
 suites have zero violations and exact core/with-hint counts 480/660, primary-brutal 240/330,
@@ -292,13 +302,22 @@
 stale comment; these are hand calculations.
 
 For real integration, replace frozen 5117001 with a 15x8 state: Scout A at `(13,4)`, actionless
-monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, and base wall
-cells exactly `(7,0..3)` plus `(8,5..7)`. Production `buildHostScenarioMenu` must yield labels
-`[Longbow + Longbow -> combatant:P, Dodge]`, P radius 60 (30 remaining + 30 Dash), and only
-`adjacency:S(A):S(P)` at score `1*60=60`. The mutation adds `(8,4)`, completing diagonal pair
-`(7,3)/(8,4)`. First assert the production trace changes sight-clear -> blocked, then require
-baselines `[Dodge,Dodge]` and exact menu `[]`. This empty mutation result is a contrast, not
-normalization of the old frozen empty scene.
+monster B at `(13,6)`, unacted 30-ft player P at `(1,4)`, ids `combatant:A/B/P`, base walls
+`(7,0..3)` plus `(8,5..7)`, and a typed speed-set effect with
+`enginePlanningSpeedFeet(A) === 0`. Define exact extracted selector strings
+`DA=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:A'}})`
+and `TAP=canonicalJson({actorId:'combatant:A',selector:{kind:'combatant',combatantId:'combatant:P'}})`.
+Production `buildHostScenarioMenu` yields labels `[Longbow + Longbow -> combatant:P, Dodge]` and
+exact menu rank 1 `adjacency:${DA}:${TAP}` (P moves to `(12,4)`, 55 ft) then rank 2
+`visibility:${DA}:${TAP}` (P path `(1,4)->(0,3)->(0,2)->(0,1)->(1,0)`, 20 ft); each has one
+proposal reference, only influencing player P, radius 60, and score `1*60=60`. Longbow reach
+cannot flip inside 15x8; Dodge contributes no movement-change fact.
+
+The mutation adds `(8,4)`, completing `(7,3)/(8,4)`. Assert the production trace changes
+sight-clear -> blocked. Because A's speed is explicitly zero it cannot use Astra's 25-ft escape
+to `(8,3)`; A and B now propose `[Dodge,Dodge]`, targeted dependencies disappear, and the exact
+menu is `[]`. This is a contrast, not normalization of the frozen empty scene. Recheck the full
+base/mutated oracle after WALL-01; any difference stops for plan review.
 
 Separately test the eight-entry slice through `computeHostSplitCandidates` with two Scouts A/B,
 P at `(4,2)`, awaiting A's turn, speed 30/radius 60, and a controlled query table. Define
@@ -320,13 +339,13 @@
 
 All costs are independently <=60; the controlled port rejects every unlisted destination.
 Order is score, refs, then canonical fact-key bytes (`adjacency` < `reach` < `visibility`). Assert
-exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. In a second exact seam mutation table,
-the sealed corner makes only ranks 7/8/9 non-flippable, so the result is exactly keys 1-6 at
-ranks 1-6; this fixed result kills a seam/open-ray mutation without choosing after a run.
+exact keys/ranks 1-8 and excluded key 9, not merely `<=8`. This stipulated dependency/query table
+tests only grouping, score, canonical tie ordering, filtering, and the eight-entry slice; it is
+not evidence for D642 corner sealing, which the production integration witness above proves.
 
-**M/T/V:** restore old Longbow/Dash values, disable corner sealing, change score multiplication,
-tie order, or remove `.slice(0,8)`; exact labels/positions, integration mutation, and nine-row
-table fail. Common checks; run these three files serially, all named outcomes exact.
+**M/T/V:** restore old Longbow/Dash values, let A move despite speed zero, disable corner sealing,
+change score multiplication to 62/61, reverse the tie order, or remove `.slice(0,8)`; exact
+labels/keys/paths, production mutation, and nine-row table fail. Common checks; run serially.
 
 ### Batch 10 — 32,768-byte cap rejection witness
 
@@ -355,19 +374,22 @@
 None. Any failed post-WALL derivation or rejected namespace invokes the stated stop/amend/review
 procedure; it is not an implementation-time choice.
 
-## Round 2 disposition
+## Round 2 disposition (closed/superseded)
 
-- **PLAN-F1 (P2; lines 194-240):** Batch 6 now adds a separately pinned outer-v6 identity to
-  session keys, cells, rows, and row matching; preserves v5; rejects v5 primary/second hard rows.
-- **PLAN-F2 (P2; lines 50-73):** the pre-Batch-2 gate now reads authoritative MAIN, audits plain/xxx/
-  underscore forms, records actual output/status, classifies reservations, reserves all three
-  families together, and requires Allowed-file amendment before a replacement generation.
-- **PLAN-F3 (P2; lines 294-326):** Batch 9 now fixes a real two-proposal integration scene and a nine-candidate
-  hand table with radii, paths, scores, byte tie order, excluded ninth, and exact seam mutation.
-- **PLAN-F4 (P3; lines 25-26, 194-205):** Batch 6 says eight files; the top gate records `3/3/10/10/10/8/4/4/3/1`
-  and 52 = 18 existing + 34 new.
-- **Supporting requirements (lines 8-12, 85-103, 227-230, 283-326):** Batch 6 requires canonical regeneration for active v6; Batch 1
-  rejects non-fog differences and a legacy key in new v2; gates/Batch 9 reverify all behaviour
-  derivations after WALL-01.
+F1 remains closed at lines 211-250; F4 remains closed at lines 25-26 and 198-209.
+F2's r2 work remains at 50-73 and F3 is superseded by the corrected r3 oracle at 304-348.
+Supporting requirements remain at 8-12, 85-102, 236-239, and 293-348.
+
+## Round 3 disposition
+
+- **PLAN-F3 (P2; lines 304-348):** the production scene now makes A speed zero, uses extracted actor-relative
+  selector keys, and pins both base candidates plus the exact empty post-seal menu; the verified
+  nine-row table is explicitly ranking/filtering-only.
+- **PLAN-F2 (P2; lines 50-73):** both absence commands now cover every 000-999 plain and underscore seed plus
+  `xxx`; MAIN provenance, verbatim results, reservation classification, and replacement rules stay.
+- **PLAN-F5 (P2; lines 217-246):** v2 now requires all ten historical/current namespaces, exact own-cohort
+  exceptions, removal-of-any-row tests, and the 6204 mutant.
+- **PLAN-F6 (P2; lines 115-138):** Batch 2 now preserves positive movement OR productive slots, keeps Dash-only
+  monsters valid, and applies resolved-origin trace checks only to targeted offensive components.
 
-COHORT-01 PLAN R2 DONE
+COHORT-01 PLAN R3 DONE

tokens used
446,046
Updated [COHORT-01 implementation plan r3](/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/.tmp-plans/2026-09-17-cohort-01-plan.md). Final plan is 395 lines with a verified 52-path scope.

COHORT-01 PLAN R3 DONE
