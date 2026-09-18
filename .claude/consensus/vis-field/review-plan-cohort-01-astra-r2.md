
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 01a0b1ca-33de-7e61-a6b4-37921da22565
--------
user
RULES (binding, restated): You are the PLAN REVIEWER (gpt-6-astra, HIGH, RESUMED — you reviewed COHORT-01 plan r1). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify — DETACHED clean checkout at 807d2e3c. Sandbox read-only; no edits, no git writes, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; no full vitest, Playwright, build; never port 4173. Readable: .tmp-plans/2026-09-17-cohort-01-plan.md = r2 (sha256 4f3385b4aee5f9d83948d41d6486ba11c76f3d32bb3d7c1a443f65b9452692a0, 373 lines — verify), the MAIN repo's .claude/decisions.md (D645–D647). Model calls WILL fail. End with the named marker.

TASK: re-review r2 against your r1 findings — PLAN-F1 (v6 experiment-identity boundary: now a separately pinned outer-v6 identity in session keys, cells, rows and row matching; v5 preserved; cross-version rejection of v5 hard rows), PLAN-F2 (pre-Batch-2 namespace gate against MAIN, plain/xxx/underscore forms, verbatim output, reservations classified, all three families reserved together, Allowed-file amendment before any replacement generation), PLAN-F3 (Batch 9: a fixed two-proposal integration scene plus a nine-candidate hand table with radii, paths, scores, byte tie order, the excluded ninth and the exact seam mutation), PLAN-F4 (counts), and the supporting requirements (canonicalD569SecondFamilyRegeneration in the active v6 test; rejection of non-fog differences and of a legacy key in a new v2 fixture; behaviour derivations re-verified after WALL-01). Verify the F3 hand table yourself against src/vtt/speculative-planning.ts:638–660 (reachability, scores, tie order, the ninth's exclusion, the mutation result) — that is the largest remaining risk. Then re-attack the whole plan once more for anything r1 missed. OUTPUT: PLAN-Fn findings with severity, line, evidence, fix; "VERDICT: ACCEPT" or "VERDICT: REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll verify r2’s checksum and line count, check how it addresses each prior finding, and independently test the speculative-planning table and seam mutation against the current code.

exec
/bin/bash -lc 'git rev-parse HEAD && git status --porcelain && sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md && wc -l .tmp-plans/2026-09-17-cohort-01-plan.md && nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
807d2e3c8cbbda11cfa26d078ac7739f2954e27e
4f3385b4aee5f9d83948d41d6486ba11c76f3d32bb3d7c1a443f65b9452692a0  .tmp-plans/2026-09-17-cohort-01-plan.md
373 .tmp-plans/2026-09-17-cohort-01-plan.md
     1	# VIS-FIELD-01 / COHORT-01 implementation plan r2 (D643 option A1)
     2	
     3	Date: 2026-09-17. Baseline: detached clean `807d2e3c8cbbda11cfa26d078ac7739f2954e27e`.
     4	D643 A1 keeps historical hard-2 and adds only three solid-wall brutal v2 families.
     5	
     6	## Outcome and hard gates
     7	
     8	1. WALL-01 is a hard predecessor. Generation cannot start until its D642 corner seal is
     9	   accepted on a clean checkout. Recheck `src/vtt/room-generator.ts:1227-1231` still defines
    10	   `generatedLineIsOpen` as `tier === 'none' && !blocksSight`. Re-derive all three Batch-9
    11	   expectations against the accepted WALL-01 tree before editing tests; if any stated result
    12	   differs, stop and amend/review this plan rather than copying changed-code output.
    13	2. Before edits, inventory SHA-256 for the v1/v5 manifests and every file under historical
    14	   6203, 6206, and 6207 directories. Repeat after every batch. No byte may change in:
    15	   `tests/fixtures/d569-second-family-manifest.json`,
    16	   `tests/fixtures/d569-blind-experiment-manifest.json`,
    17	   `tests/fixtures/arena-basis-brutal`, `arena-basis-brutal-b`, or `arena-basis-brutal-2`.
    18	3. Never rewrite a historical fixture/manifest, hand-edit generated JSON, add a D466 override,
    19	   use `--terrain-profile`, or relax membership. One failing room rejects all ten seeds; no
    20	   nine-room cohort and no hash is retained.
    21	4. Expectations may come only from frozen pre-change bytes, the hand calculations named here,
    22	   or hashes made after membership and double-generation gates. Generated changed-code output
    23	   is never an oracle for a behavioural expectation.
    24	5. No full Vitest, Playwright, build, or port 4173 in a batch. Later landing gates are separate.
    25	6. Fixed scope is 10 batches with Allowed-file counts `3/3/10/10/10/8/4/4/3/1`: 52 unique
    26	   paths = 18 existing + 34 new. A batch may touch only its manifest and accepted earlier files.
    27	
    28	Common checks after every batch:
    29	
    30	- **T:** `npx tsc -p tsconfig.app.json --noEmit` and
    31	  `npx tsc -p tsconfig.node.json --noEmit` -> exit 0/0.
    32	- **V:** `git diff --check` -> empty; `git status --short` contains only allowed/earlier paths.
    33	- **V-freeze:** `git diff --exit-code -- tests/fixtures/d569-second-family-manifest.json tests/fixtures/d569-blind-experiment-manifest.json tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2` -> exit 0.
    34	
    35	## D569 demonstrate-then-normalize ledger
    36	
    37	1. **Historical regeneration pins:** demonstrate each of 20 committed second-family fixtures
    38	   differs from each canonical rebuild at exactly `$.encounter.state.foggedCells`; preserve raw
    39	   hashes, remove exactly that own key from parsed COMMITTED state, then compare both rebuilds.
    40	2. **New fixture pins:** dated namespace proof -> decoded structural/productivity membership ->
    41	   two independent temp generations with empty `diff -rq` -> `sha256sum` = OpenSSL -> pin.
    42	3. **Second-family v2 pin:** byte-copy hard-2 rows/hashes from v1, add proven 6211 rows, finalize,
    43	   hash v2 independently, then place that hash in v6.
    44	4. **Experiment v6 pin:** byte-carry all v5 fields except version, primary brutal, and nested
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
   141	- `tests/fixtures/arena-basis-brutal-v2/seed-6209002.json`
   142	- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
   143	- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
   144	- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
   145	- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
   146	- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
   147	- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
   148	- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
   149	- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
   150	
   151	**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
   152	`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
   153	Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
   154	Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
   155	unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
   156	
   157	### Batch 4 — generate brutal-b-v2 6210001-6210010
   158	
   159	**Allowed files (10):**
   160	
   161	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
   162	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
   163	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
   164	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
   165	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
   166	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
   167	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
   168	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
   169	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
   170	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
   171	
   172	**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
   173	two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
   174	
   175	### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
   176	
   177	**Allowed files (10):**
   178	
   179	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
   180	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
   181	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
   182	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
   183	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
   184	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
   185	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
   186	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
   187	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
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
   336	
   337	**R/Implementation:** clone a normal `projectEngineSemanticBoard`, set one schema-valid creature
   338	name to 40,000 characters, prove schema parsing succeeds, then render normally. Assert measured
   339	UTF-8 semantic block exceeds `BLIND_SEMANTIC_BOARD_MAX_BYTES === 32_768` and exact `RangeError`
   340	states required/max byte counts. Baseline may be green because this witnesses existing policy.
   341	
   342	**M/T/V:** disable `blind-turn-context.ts:1304-1307` (or make `>` false): the test must turn RED
   343	because oversized context is accepted. Restore, verify source hash, run focused test/common checks.
   344	
   345	## Final targeted verification and handoff
   346	
   347	Run only touched suites serially: second-family, blind-experiment, v5, v6, room-generator,
   348	brutal-v2, brutal-b, arena, rerun protocol, LOS audit, blind context, and the three behaviour
   349	files. Expected: zero failures; D569 counts 480/660/240/330 and second-family 480; 30/30 new
   350	fixtures; audits 93/63. Repeat T, freeze inventory, `git diff --check`, verify exact 52-path union,
   351	and inspect all new JSON as parsed state. Supervisor later runs the untruncated full gate.
   352	
   353	## Open questions
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

exec
/bin/bash -lc "sed -n '23065,23100p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md && sed -n '1,220p' tests/unit/vtt/speculative-planning.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:

## D645 — SUPERVISOR (2026-09-17 19:53): WALL-01 REJECTED by my verification (WALL-F1, P1: the vertex rule is inert for axis-aligned rays whose sealing pair straddles the line); fix r1 dispatched; COHORT-01 plan (400 lines, sha 6852051d…) harvested and sent to astra HIGH
SOL WALL-01 (saved impl-wall-01-sol.md): gcd lattice enumeration, TL+BR / TR+BL pairs, progress-ordered merge of interior/edge/vertex events, physical tier untouched; 43/43; three mutants killed; counts table "unchanged"; 42 seeds byte-identical; pair 38.6 s; two los-cover budget timeouts. VERIFIED BY ME (clean checkout + patch, traceTerrainLine, Medium tokens, 15x8): blockers (7,3)&(8,4) with the ray cells (13,4)→(1,4): blocksSight FALSE (must be true); (7,4)&(8,3): FALSE; vertical (4,2)&(5,3) with (5,0)→(5,6): FALSE; the diagonal crack cases TRUE. CAUSE (read in cover.ts): sharedVertexBlockingCells is built from `candidates`, which traceSpaces filters by the bounding box of the eight corners; for a ray along a grid line between Medium cells the far-side flank row is outside the box, so the vertex is never registered. Sol's STAIRCASE_WALL_SEALED witness passes only because its geometry keeps both cells inside the box — it does not exercise the case it is named for, and the "counts unchanged" table is not evidence about D642. FIX R1 (sol resumed; brief impl-vis-field-wall-01-fix-r1.md; log impl-wall-01-fix-r1.log): on-the-fly sightBlockingAt lookups around each interior lattice vertex (as the edge rule does), witnesses replaced with my three geometries + a split-pair control, a bbox-regression mutant, counts and generation bytes redone.
COHORT-01 PLAN (sol 01a0b1bb…, saved plan-cohort-01-sol.md; copied to .tmp-plans/2026-09-17-cohort-01-plan.md): 10 batches (validator normalization → RED membership witnesses + frozen-contract retirement → generate 6209 → 6210 → 6211 → manifests v2/v6 + dated ledger → routes → audit/report coverage → three behaviour pins → cap witness), a byte-freeze inventory of v1/v5/6203/6206/6207 checked after every batch, "reject all ten seeds if one fails", no open questions. Astra HIGH (fresh; brief review-plan-cohort-01-astra.md; log review-plan-cohort-01-astra-r1.log) reviewing now, in parallel with the WALL-01 fix.

## D646 — SUPERVISOR (2026-09-17 20:07): COHORT-01 plan r1 REJECTED by astra r1 (HIGH; 0 P1, 3 P2, 1 P3; saved review-plan-cohort-01-astra-r1.md); r2 dispatched to the planner
PLAN-F1 (P2): v6 has no experiment-identity boundary — session keys {family, arm, seed, rep} (d569-blind-experiment.ts:705) and row matching (:762) omit the manifest identity, and the unchanged hard fixtures keep their hashes, so 240/330/240 cells are indistinguishable across v5/v6. PLAN-F2 (P2): the namespace audit is unsound — stale worktree decisions file, patterns miss `6209xxx` and `6_209_001` forms, and D643/D645's reservations must be classified as such. PLAN-F3 (P2): the speculative-planning oracle must be a predeclared hand-calculated scene (≥9 eligible candidates, tie order, the excluded ninth, the exact mutation result). PLAN-F4 (P3): Batch 6 has eight files. Astra independently confirmed the rest: 20/20 fog-key single-key diffs via the real generator; the scout's 12+4 blocked rays per PC (wizard 16) and labels exactly Dodge/End Turn; Room-8 monsters 1/2/4 Dodge, monster 5's 55-ft Dash (10 steps × 5 + 5 difficult); the cap guard rejects a 57,580-byte block and accepts it with the guard disabled; 52 paths (18 existing + 34 new), all existing ones present. All four findings accepted. r2 (planner resumed 01a0b1bb…; brief plan-cohort-01-r2.md; r1 archived as .tmp-plans/2026-09-17-cohort-01-plan.r1.md) must also require canonicalD569SecondFamilyRegeneration in the active v6 test and rejection witnesses for non-fog-key differences and for legacy keys in new fixtures.

## D647 — SUPERVISOR (2026-09-17 20:22): WALL-01 fix r1 harvested (sol; saved impl-wall-01-fix-r1-sol.md) — my verification running on the throwaway checkout; COHORT-01 plan r2 harvested (sha 4f3385b4…, 373 lines; r1 archived) — astra r2 (HIGH, resumed) running
SOL fix r1: vertex lookup now queries sightBlockingAt directly around each GCD-enumerated interior lattice vertex (no candidate bbox), also on the coverTierBetweenObjects path; the three axis witnesses (my geometries: first cells (7,3) / (8,3) / (4,2)) + split control; 46/46; four mutants incl. the bbox-regression one (exactly the three axis witnesses red); counts table unchanged before/after (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36 — now with a working rule); 42 seeds byte-identical (aggregate 7b884bf9…); pair 39.1 s; the 35 frozen/behaviour reds unchanged; four los-cover 5 s budget timeouts under the combined audit (110/112 isolated with two) — perf, not re-pinned. MY VERIFICATION (verify-wall-01-r1.log; ../dnd-wt-seam-ab reset to 807d2e3c + patch): tsc, my seven-case probe (A/B/C/D must block, E split pair / F outer-face graze / G single corner must stay clear), a vertex-lookup-null mutant, the suites, los-cover alone, pair.
PLAN r2 disposition (planner): F1 → separately pinned outer-v6 identity in session keys/cells/rows/matching, v5 preserved, v5 hard rows rejected; F2 → pre-Batch-2 gate against MAIN decisions, plain/xxx/underscore forms, verbatim output, reservations classified, three families reserved together, Allowed-file amendment before replacement generation; F3 → fixed two-proposal integration scene + nine-candidate hand table (radii, paths, scores, byte tie order, excluded ninth, exact seam mutation); F4 → counts fixed; canonical regeneration required for active v6; rejection witnesses for non-fog differences and legacy keys in v2. Astra r2 told to verify the F3 hand table itself.
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
    const state: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((entry) => entry.profile.id === targetId
        ? { ...entry, hitPoints: 20, temporaryHitPoints: 100 }
        : entry),
    };
    const subject = direct(targetId);
    expect(enginePlanningHitPoints(state, targetId)).toBe(20);
    expect(enginePlanningHitPointMaximum(state, targetId)).toBe(40);
    expect(evaluateScenarioFact(state, {
      kind: 'hp_percent', subject, comparison: 'at_most', threshold: 50,
    })).toMatchObject({ matches: true, actual: true });
    expect(evaluateScenarioFact(state, {
      kind: 'hp_percent', subject, comparison: 'above', threshold: 50,
    })).toMatchObject({ matches: false, failure: 'FACT_FALSE' });

    const maximumModified = applyEffect(state, fixture.source, {
      targets: [targetId],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('spec-hp-maximum'),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'hit_point_maximum_modifier', amount: 10 },
    });
    expect(enginePlanningHitPointMaximum(maximumModified, targetId)).toBe(50);
    expect(evaluateScenarioFact(maximumModified, {
      kind: 'hp_percent', subject, comparison: 'above', threshold: 50,
    })).toMatchObject({ matches: false, failure: 'FACT_FALSE', actual: false });

    const dead: EncounterState = {
      ...state,
      combatants: state.combatants.map((entry) => entry.profile.id === targetId
        ? { ...entry, hitPoints: 0, life: 'dead' as const }
        : entry),
    };
    expect(evaluateScenarioFact(dead, {
      kind: 'hp_percent', subject, comparison: 'at_most', threshold: 25,
    })).toMatchObject({ matches: false, failure: 'SUBJECT_NOT_LIVING' });
  });

exec
/bin/bash -lc "sed -n '1,175p' src/vtt/speculative-planning.ts && sed -n '320,700p' src/vtt/speculative-planning.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
import { canonicalJson } from '../commands/canonical-json';
import { combatantsAreAllies } from '../combat/allies';
import {
  combatantSpace,
  combatantConditions,
  type EncounterState,
  type LifeState,
} from '../combat/encounter';
import { isIncapacitated } from '../combat/conditions';
import { persistentAreaTouchesSpace } from '../combat/persistent-areas';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  engineConcentrationActive,
  enginePlanningHitPointMaximum,
  enginePlanningHitPoints,
  enginePlanningSemanticZones,
  enginePlanningSpeedFeet,
  type EngineQueryPort,
} from './engine-query-port';
import { availableEngineActorOptions, type EngineOfferableOption, type EngineTurnProposal } from './intent-resolver';
import { projectFutureMonsterTurns } from './monster-planning-state';
import type { EngineOptionEnvironment } from './offers/build-offer-environment';
import type {
  EngineSelectorRef,
  GuardConditionIdentity,
  GuardResource,
  HostScenario,
  HostSplitCandidate,
  HpThresholdPercent,
  ScenarioFactAtom,
} from './speculative-plan-types';

export type GuardNoMatchReason =
  | 'FACT_FALSE'
  | 'SELECTOR_UNRESOLVED'
  | 'SELECTOR_ALIASING'
  | 'TOKEN_UNAVAILABLE'
  | 'SUBJECT_NOT_LIVING'
  | 'HP_MAXIMUM_UNAVAILABLE'
  | 'ACTION_UNAVAILABLE'
  | 'VISIBILITY_UNAVAILABLE'
  | 'ZONE_UNAVAILABLE'
  | 'RESOURCE_UNAVAILABLE';

export type ScenarioFactValue = LifeState | boolean | number | 'inside' | 'outside' | null;

export type GuardAtomEvaluation =
  | { readonly matches: true; readonly actual: ScenarioFactValue }
  | {
      readonly matches: false;
      readonly actual: ScenarioFactValue;
      readonly failure: GuardNoMatchReason;
    };

function resolveSelector(
  state: EncounterState,
  reference: EngineSelectorRef,
  queries: EngineQueryPort,
): CombatantId | null {
  const resolved = queries.resolveTarget(state, reference.actorId, reference.selector);
  return resolved !== null && queries.combatant(state, resolved) !== null ? resolved : null;
}

function failure(
  reason: GuardNoMatchReason,
  actual: ScenarioFactValue = null,
): GuardAtomEvaluation {
  return { matches: false, actual, failure: reason };
}

function compared(actual: ScenarioFactValue, expected: ScenarioFactValue): GuardAtomEvaluation {
  return actual === expected ? { matches: true, actual } : failure('FACT_FALSE', actual);
}

function pair(
  state: EncounterState,
  left: EngineSelectorRef,
  right: EngineSelectorRef,
  queries: EngineQueryPort,
): { readonly left: CombatantId; readonly right: CombatantId } | GuardAtomEvaluation {
  const resolvedLeft = resolveSelector(state, left, queries);
  const resolvedRight = resolveSelector(state, right, queries);
  if (resolvedLeft === null || resolvedRight === null) return failure('SELECTOR_UNRESOLVED');
  if (resolvedLeft === resolvedRight) return failure('SELECTOR_ALIASING');
  return { left: resolvedLeft, right: resolvedRight };
}

function isEvaluation(value: ReturnType<typeof pair>): value is GuardAtomEvaluation {
  return 'matches' in value;
}

function sameCondition(
  left: GuardConditionIdentity,
  right: GuardConditionIdentity,
): boolean {
  return canonicalJson(left) === canonicalJson(right);
}

/** Total, side-effect-free evaluation against the actual canonical encounter state. */
export function evaluateScenarioFact(
  state: EncounterState,
  atom: ScenarioFactAtom,
  queries: EngineQueryPort,
): GuardAtomEvaluation {
  switch (atom.kind) {
    case 'life_state_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      return compared(queries.combatant(state, subjectId)?.life ?? null, atom.value);
    }
    case 'hp_percent': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const subject = queries.combatant(state, subjectId);
      if (subject?.life !== 'living') return failure('SUBJECT_NOT_LIVING');
      const maximum = enginePlanningHitPointMaximum(state, subjectId);
      if (!Number.isFinite(maximum) || maximum <= 0) return failure('HP_MAXIMUM_UNAVAILABLE');
      const current = enginePlanningHitPoints(state, subjectId);
      const actual = atom.comparison === 'at_most'
        ? current * 100 <= maximum * atom.threshold
        : current * 100 > maximum * atom.threshold;
      return compared(actual, true);
    }
    case 'adjacency_is': {
      const subjects = pair(state, atom.left, atom.right, queries);
      if (isEvaluation(subjects)) return subjects;
      const separation = queries.spaceDistance(state, subjects.left, subjects.right);
      if (separation === null) return failure('TOKEN_UNAVAILABLE');
      return compared(separation <= 5, atom.value);
    }
    case 'within_action_reach_is': {
      const subjects = pair(state, atom.actor, atom.target, queries);
      if (isEvaluation(subjects)) return subjects;
      if (!queries.actions(state, subjects.left).some((action) => action.id === atom.actionId)) {
        return failure('ACTION_UNAVAILABLE');
      }
      const reach = queries.reach(state, {
        actorId: subjects.left,
        targetId: subjects.right,
        actionId: atom.actionId,
      });
      if (!reach.legal && reach.codes.some((code) => code !== 'target_out_of_range')) {
        return failure('ACTION_UNAVAILABLE');
      }
      return compared(reach.legal, atom.value);
    }
    case 'visibility_is': {
      const subjects = pair(state, atom.observer, atom.subject, queries);
      if (isEvaluation(subjects)) return subjects;
      const visibility = queries.visibility(state, subjects.left, subjects.right);
      if (visibility === null) return failure('VISIBILITY_UNAVAILABLE');
      return compared(visibility.visible, atom.value);
    }
    case 'zone_occupancy_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const zone = enginePlanningSemanticZones(state).find((candidate) => candidate.id === atom.zoneId);
      if (zone === undefined || !zone.active) return failure('ZONE_UNAVAILABLE');
      const actual = zone.memberCombatantIds.includes(subjectId) ? 'inside' : 'outside';
      return compared(actual, atom.value);
    }
    case 'condition_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const present = combatantConditions(state, subjectId).some((condition) =>
        sameCondition(condition, atom.condition));
      return compared(present, atom.present);
    }
    case 'resource_available_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      const subject = queries.combatant(state, subjectId);
      if (subject === null) return failure('SELECTOR_UNRESOLVED');
      let available: boolean;
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

exec
/bin/bash -lc "sed -n '1,165p' tests/unit/combat/fixtures.ts && sed -n '1,110p' tools/d569-second-family-manifest.ts && sed -n '275,321p' tools/d569-second-family-manifest.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
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

export function playerProfile(
  key: string,
  options: {
    readonly hitPoints?: number;
    readonly initiativeBonus?: number;
    readonly attacksPerAction?: number;
    readonly spellSlots?: readonly SpellSlotCapacity[];
  } = {},
): CombatantProfile {
  return characterCombatantProfile(characterSheet(key, options), {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
    ...(options.spellSlots === undefined ? {} : { spellSlots: options.spellSlots }),
  });
}

export function placedToken(
  profile: CombatantProfile,
  column: number,
  row = 0,
): CombatToken {
  return combatToken(profile, { column, row });
}
import { canonicalJson } from '../src/commands/canonical-json';
import { combatantSpace, reduceEncounter } from '../src/combat/encounter';
import { spacesIntersect } from '../src/combat/creature-space';
import { mulberry32 } from '../src/combat/random';
import { BUNDLED_MONSTER_ROSTER, STARTER_MONSTER_ROSTER } from '../src/combat/statblocks/roster';
import { spellDefinition } from '../src/combat/spells/definitions';
import { sha256 } from '../src/crypto/sha256';
import { d466GeneratedRoomOverride } from '../src/vtt/d466-room-overrides';
import { availableEngineActorOptions, resolveEngineActorOption } from '../src/vtt/intent-resolver';
import { decodeArenaFixtureText } from '../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../src/vtt/monster-planning-state';
import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
import {
  BRUTAL_CHALLENGE_BUDGET_SCALE,
  BRUTAL_TERRAIN_FEATURE_COUNT_BAND,
  generateRoom,
  type GeneratedRoom,
  type RoomDifficultyProfile,
} from '../src/vtt/room-generator';
import { z } from 'zod';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

export const D569_SECOND_FAMILY_LEDGER_ENTRY =
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
    directory: z.string(),
    fixtures: z.array(z.strictObject({
      seed: z.number().int().nonnegative(),
      path: z.string(),
      sha256: z.string().regex(/^[a-f0-9]{64}$/u),
    })),
  })),
});

export type D569SecondFamilyManifest = z.infer<typeof manifestSchema>;
export type D569SecondFamilyDifficulty = keyof typeof D569_SECOND_FAMILY_SEEDS;

export interface D569SecondFamilyValidationAccess {
  readonly readFixture: (path: string) => string;
  readonly regenerate: (
    seed: number,
    difficulty: D569SecondFamilyDifficulty,
    generation: 1 | 2,
  ) => string;
}

export interface D569SecondFamilyViolation {
  readonly code: string;
  readonly message: string;
}

function addViolation(
  violations: D569SecondFamilyViolation[],
  condition: boolean,
  code: string,
  message: string,
): void {
  if (!condition) violations.push({ code, message });
}

function cellsInBounds(
  cells: readonly { readonly column: number; readonly row: number }[],
  bounds: { readonly columns: number; readonly rows: number },
): boolean {
  return cells.every((cell) =>
    Number.isInteger(cell.column) && Number.isInteger(cell.row) &&
    cell.column >= 0 && cell.column < bounds.columns &&
    cell.row >= 0 && cell.row < bounds.rows);
}

/** Shared state/reducer invariants for the existing generator suite and D569 freeze. */
export function generatedRoomIntegrityViolations(
  room: GeneratedRoom,
  fixtureBytes: string = `${canonicalJson(room)}\n`,
): readonly D569SecondFamilyViolation[] {
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

exec
/bin/bash -lc "rg -n 'SCOUT|function monsterProfile|function encounter' tests/unit/vtt/composite-turn-proposals.test.ts; sed -n '185,231p' src/vtt/speculative-planning.ts; sed -n '735,810p' src/vtt/speculative-planning.ts; sed -n '1,90p' src/vtt/monster-planning-state.ts; rg -n 'shortsword|Shortsword' src/combat/statblocks/scout*" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 2 in 0ms:
9:import { SCOUT, SPY } from '../../../src/combat/statblocks/mercenary-company';
42:function monsterProfile(
43:  statblock: typeof SCOUT | typeof SPY | typeof PRIEST | typeof BROWN_BEAR | typeof DIRE_WOLF,
54:function encounter(
128:    const scout = monsterProfile(SCOUT, 'hidden-id-scout');
167:    const scout = monsterProfile(SCOUT, 'scout');
358:    const scout = monsterProfile(SCOUT, 'object-scout');
402:    const scout = monsterProfile(SCOUT, 'r02-scout');
          available = subject.legendary.resistanceUsesRemaining > 0;
          break;
        }
        case 'spell_slot': {
          const level = atom.resource.level;
          const slot = subject.spellSlots.find((candidate) => candidate.level === level);
          if (slot === undefined) return failure('RESOURCE_UNAVAILABLE');
          available = slot.remaining > 0;
          break;
        }
      }
      return compared(available, atom.available);
    }
    case 'concentration_is': {
      const subjectId = resolveSelector(state, atom.subject, queries);
      if (subjectId === null) return failure('SELECTOR_UNRESOLVED');
      return compared(engineConcentrationActive(state, subjectId), atom.active);
    }
  }
}

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
import type { EncounterState } from '../combat/encounter';
import { monsterSpellMaximumUses, monsterSpellResourcePoolId } from '../combat/statblock';
import { feet, type CombatantId } from '../combat/values';
import { declaredMonsterBonusActions } from './engine-query-port';

function withChoicePools(state: EncounterState): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) => {
      if (combatant.profile.kind !== 'monster') return combatant;
      const existing = combatant.limitedResources ?? [];
      const additions = declaredMonsterBonusActions(state, combatant.profile.id).flatMap((action) => {
        if (action.kind !== 'spell_choice') return [];
        return action.spells.flatMap((spell) => {
          const id = monsterSpellResourcePoolId(action.id, spell);
          const maximum = monsterSpellMaximumUses(spell);
          return id === null || maximum === null || existing.some((pool) => pool.id === id)
            ? []
            : [{ id, maximum, remaining: maximum, recharge: 'long_rest' as const }];
        });
      });
      const uniqueAdditions = [...new Map(additions.map((pool) => [pool.id, pool] as const)).values()];
      return uniqueAdditions.length === 0
        ? combatant
        : { ...combatant, limitedResources: [...existing, ...uniqueAdditions] };
    }),
  };
}

function resetMonsterTurns(
  state: EncounterState,
  actorIds: ReadonlySet<CombatantId>,
  preserveActiveActor: boolean,
): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((combatant) =>
      combatant.profile.kind !== 'monster' || !actorIds.has(combatant.profile.id) ||
        (preserveActiveActor && combatant.profile.id === state.activeCombatant)
        ? combatant
        : ({
          ...combatant,
          turn: {
            ...combatant.turn,
            action: { kind: 'available' },
            bonusActionAvailable: true,
            reactionAvailable: true,
            movement: {
              speed: feet(combatant.profile.rules.speed),
              remaining: feet(combatant.profile.rules.speed),
              spent: feet(0),
            },
          },
        })),
  };
}

/** Requested non-active monsters are viewed at the fresh turn they will receive before execution. */
export function projectFutureMonsterTurns(
  state: EncounterState,
  actorIds: readonly CombatantId[],
): EncounterState {
  return withChoicePools(resetMonsterTurns(state, new Set(actorIds), true));
}

/** A direct fixture session starts with every monster at a fresh planning window. */
export function freshMonsterPlanningState(state: EncounterState): EncounterState {
  const actors = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' ? [combatant.profile.id] : []);
  return withChoicePools(resetMonsterTurns(state, new Set(actors), false));
}
rg: src/combat/statblocks/scout*: IO error for operation on src/combat/statblocks/scout*: No such file or directory (os error 2)

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const {createEncounter}=require('./src/combat/encounter.ts');
const {monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {buildHostScenarioMenu,maximumInfluenceRadiusFeet,extractProposalFactDependencies,canPlayerFlipScenarioFact}=require('./src/vtt/speculative-planning.ts');
const {availableEngineActorOptions}=require('./src/vtt/intent-resolver.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const B=monsterProfile('B'),P=playerProfile('P');
const s={...createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),activeCombatant:A.id};
for(const [name,state] of [['base',s],['plus84_preWALL',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=buildHostScenarioMenu(state,[A.id,B.id],[P.id],env);
 console.log(name,'radius',maximumInfluenceRadiusFeet(state,P.id),'trace',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(state,p.actorId,env).find(o=>o.optionId===p.primaryOptionId)?.label));
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount}))));
}
const moved={...s,tokens:s.tokens.map(t=>t.combatantId===P.id?{...t,position:{column:1,row:0}}:t)};
console.log('visibility at 1,0',env.queries.visibility(moved,A.id,P.id));
console.log('path 1,0',env.queries.path(s,{actorId:P.id,destination:{column:1,row:0},movement:'dash',maximumFeet:60}));

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2408ms:
base radius 60 trace false
baselines [ undefined ]
menu []
plus84_preWALL radius 60 trace false
baselines [ undefined ]
menu []
visibility at 1,0 {
  visible: false,
  reciprocal: false,
  sense: 'unknown',
  reason: 'blocked'
}
path 1,0 {
  legal: true,
  cells: [
    { column: 0, row: 3 },
    { column: 0, row: 2 },
    { column: 0, row: 1 },
    { column: 1, row: 0 }
  ],
  costFeet: 20,
  budgetFeet: 60
}

exec
/bin/bash -lc "python3 - <<'PY'
import pathlib,re,subprocess
p=pathlib.Path('.tmp-plans/2026-09-17-cohort-01-plan.md').read_text()
lines=p.splitlines()
for num in [57,58,59]:
 r=subprocess.run(lines[num-1],shell=True,capture_output=True,text=True)
 print('plan-command-line',num,'exit',r.returncode,'stdout',repr(r.stdout),'stderr',repr(r.stderr))
paths=[]
for b in re.split(r'(?="'^### Batch )'"',p,flags=re.M)[1:]:
 ps=re.findall(r'"'^- `([''^`]+)`'"',b.split('**Allowed files',1)[1].split('**R',1)[0],re.M)
 paths+=ps
 print(b.splitlines()[0],len(ps))
print('unique',len(set(paths)),'existing',sum(pathlib.Path(x).exists() for x in set(paths)))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
plan-command-line 57 exit 0 stdout '23048:6209xxx\n23048:6210xxx\n23048:6211xxx\n23061:6209xxx\n23061:6210xxx\n23061:6211xxx\n23071:6209xxx\n23071:6_209_001\n' stderr ''
plan-command-line 58 exit 1 stdout '' stderr ''
plan-command-line 59 exit 0 stdout '23068:6209\n23068:6210\n23068:6211\n' stderr ''
### Batch 1 — validator normalization and historical semantics 3
### Batch 2 — RED active membership and frozen-productivity retirement 3
### Batch 3 — generate primary brutal-v2 6209001-6209010 10
### Batch 4 — generate brutal-b-v2 6210001-6210010 10
### Batch 5 — generate D569 brutal-2-v2 6211001-6211010 10
### Batch 6 — v2/v6 manifests, identity boundary, and hashes 8
### Batch 7 — versioned arena and rerun routes 4
### Batch 8 — LOS audit and blind fixture report 4
### Batch 9 — hand-authored behaviour pins 3
### Batch 10 — 32,768-byte cap rejection witness 1
unique 52 existing 18

codex
R2 matches the supplied checksum and 373-line count. The namespace commands reproduce the recorded outputs, and the file counts are correct.

I’m checking two potential problems: the integration scene gives P a legal 20-foot path to `(1,0)`, where A can no longer see P, so the menu may contain a visibility dependency beyond the claimed adjacency entry. Also, Batch 6’s “exact” namespace list appears to omit the five historical namespaces that r1 retained.

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const {createEncounter,reduceEncounter}=require('./src/combat/encounter.ts');
const {monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const sp=require('./src/vtt/speculative-planning.ts');
const {availableEngineActorOptions}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const B=monsterProfile('B'),P=playerProfile('P');
const s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
for(const [name,state] of [['base',s],['plus84_preWALL',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id));
 console.log('baselineProposals',JSON.stringify(result.baselineProposals));
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,1).find(o=>o.optionId===p.primaryOptionId)?.label));
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount,baseline:x.baseline}))));
 console.log('optionsA',availableEngineActorOptions(ps,A.id,env,1).map(o=>o.label));
}

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2469ms:
base radius 60
baselineProposals [{"actorId":"combatant:A","expectedRevision":1,"primaryOptionId":"option:1:8771ab35427e83933dd814b61558585193f25be73fa09472","fallbackOptionId":"option:1:9e5b377778fc7ff3e6f0e922184208793fffd8f51176f2d6","reason":"Use the strongest currently available offensive option.","overrideJustification":null},{"actorId":"combatant:B","expectedRevision":1,"primaryOptionId":"option:1:1d9e2a70c8d9a860317c623f21dc84d3033737428e140c9e","fallbackOptionId":"option:1:1d9e2a70c8d9a860317c623f21dc84d3033737428e140c9e","reason":"Use the strongest currently available offensive option.","overrideJustification":null}]
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"baseline":{"kind":"adjacency_is","left":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:A"}},"right":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:P"}},"value":false}},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"baseline":{"kind":"visibility_is","observer":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:A"}},"subject":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:P"}},"value":true}}]
optionsA [ 'Dash', 'Dodge', 'End Turn', 'Longbow + Longbow -> combatant:P' ]
plus84_preWALL radius 60
baselineProposals [{"actorId":"combatant:A","expectedRevision":1,"primaryOptionId":"option:1:8771ab35427e83933dd814b61558585193f25be73fa09472","fallbackOptionId":"option:1:9e5b377778fc7ff3e6f0e922184208793fffd8f51176f2d6","reason":"Use the strongest currently available offensive option.","overrideJustification":null},{"actorId":"combatant:B","expectedRevision":1,"primaryOptionId":"option:1:1d9e2a70c8d9a860317c623f21dc84d3033737428e140c9e","fallbackOptionId":"option:1:1d9e2a70c8d9a860317c623f21dc84d3033737428e140c9e","reason":"Use the strongest currently available offensive option.","overrideJustification":null}]
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"baseline":{"kind":"adjacency_is","left":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:A"}},"right":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:P"}},"value":false}},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"baseline":{"kind":"visibility_is","observer":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:A"}},"subject":{"actorId":"combatant:A","selector":{"kind":"combatant","combatantId":"combatant:P"}},"value":true}}]
optionsA [ 'Dash', 'Dodge', 'End Turn', 'Longbow + Longbow -> combatant:P' ]

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const {createEncounter}=require('./src/combat/encounter.ts'),{monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts'),{playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const sp=require('./src/vtt/speculative-planning.ts');
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'}),B=monsterCombatantProfile(SCOUT,{combatantId:'combatant:B',tokenId:'token:B'}),P=playerProfile('P');
const state={...createEncounter({bounds:{columns:10,rows:5},combatants:[A,B,P],tokens:[placedToken(A,1,1),placedToken(B,8,3),placedToken(P,4,2)]}),activeCombatant:A.id};
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),ref=x=>({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}});
const pairs=[['adjacency','A','P',['A','B']],['adjacency','B','P',['B']],['adjacency','P','A',['A']],['adjacency','P','B',['B']],['reach','A','P',['A']],['reach','B','P',['B']],['visibility','A','P',['A']],['visibility','B','P',['B']],['visibility','P','A',['A']]];
const deps=pairs.flatMap(([kind,a,b,actors])=>{
 const baseline=kind==='adjacency'?{kind:'adjacency_is',left:ref(a),right:ref(b),value:false}:kind==='reach'?{kind:'within_action_reach_is',actor:ref(a),target:ref(b),actionId:'shortsword',value:false}:{kind:'visibility_is',observer:ref(a),subject:ref(b),value:true};
 return actors.map(x=>({proposalActorId:'combatant:'+x,baseline,flipped:sp.complementScenarioFact(baseline)}));
});
const costs={'2,1':10,'7,3':20,'6,1':15,'6,3':15};
const pos=s=>{const p=s.tokens.find(t=>t.combatantId===P.id).position;return p.column+','+p.row;};
function queries(sealed){return {...env.queries,
 spaceDistance:(s,a,b)=>pos(s)===(a===A.id||b===A.id?'2,1':'7,3')?5:20,
 reach:(s,r)=>({legal:pos(s)===(r.actorId===A.id?'2,1':'7,3')}),
 visibility:(s,a,b)=>({visible:sealed||pos(s)"'!==(a===A.id||b===A.id?'"'6,1':'6,3')}),
 path:(s,r)=>({legal:costs[r.destination.column+','+r.destination.row]"'!==undefined,costFeet:costs[r.destination.column+'"','+r.destination.row]??0,cells:[],budgetFeet:60})
};}
for(const sealed of [false,true]){
 const out=sp.computeHostSplitCandidates(state,deps,[P.id],queries(sealed));
 console.log('controlled',sealed?'sealed-table':'base','radius',sp.maximumInfluenceRadiusFeet(state,P.id),'count',out.length);
 console.log(JSON.stringify(out.map(x=>({rank:x.rank,row:pairs.findIndex(([kind,a,b])=>x.factKey===sp.scenarioFactKey(deps.find(d=>d.baseline.kind===(kind==='reach'?'within_action_reach_is':kind+'_is')&&d.baseline===d.baseline)?.baseline))+1,key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount}))));
}
console.log('actions',env.queries.actions(state,A.id).map(a=>a.id));

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 2324ms:
/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/speculative-planning.ts:96
            if (!reach.legal && reach.codes.some((code) => code !== 'target_out_of_range')) {
                                            ^

TypeError: Cannot read properties of undefined (reading 'some')
    at evaluateScenarioFact (/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/speculative-planning.ts:96:45)
    at canPlayerFlipScenarioFact (/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/speculative-planning.ts:486:18)
    at /home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/speculative-planning.ts:537:29
    at Array.flatMap (<anonymous>)
    at /home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/speculative-planning.ts:535:14
    at Array.flatMap (<anonymous>)
    at Object.computeHostSplitCandidates (/home/vagrant/PhpstormProjects/dnd-wt-seam-verify/src/vtt/speculative-planning.ts:533:43)
    at [stdin]:26:15
    at runScriptInThisContext (node:internal/vm:219:10)
    at node:internal/process/execution:451:12

Node.js v24.13.0

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const {createEncounter}=require('./src/combat/encounter.ts'),{monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts'),{playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const sp=require('./src/vtt/speculative-planning.ts');
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'}),B=monsterCombatantProfile(SCOUT,{combatantId:'combatant:B',tokenId:'token:B'}),P=playerProfile('P');
const state={...createEncounter({bounds:{columns:10,rows:5},combatants:[A,B,P],tokens:[placedToken(A,1,1),placedToken(B,8,3),placedToken(P,4,2)]}),activeCombatant:A.id};
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),ref=x=>({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}});
const pairs=[['adjacency','A','P',['A','B']],['adjacency','B','P',['B']],['adjacency','P','A',['A']],['adjacency','P','B',['B']],['reach','A','P',['A']],['reach','B','P',['B']],['visibility','A','P',['A']],['visibility','B','P',['B']],['visibility','P','A',['A']]];
const atoms=pairs.map(([kind,a,b])=>kind==='adjacency'?{kind:'adjacency_is',left:ref(a),right:ref(b),value:false}:kind==='reach'?{kind:'within_action_reach_is',actor:ref(a),target:ref(b),actionId:'shortsword',value:false}:{kind:'visibility_is',observer:ref(a),subject:ref(b),value:true});
const deps=atoms.flatMap((baseline,i)=>pairs[i][3].map(x=>({proposalActorId:'combatant:'+x,baseline,flipped:sp.complementScenarioFact(baseline)})));
const costs={'2,1':10,'7,3':20,'6,1':15,'6,3':15};
const pos=s=>{const p=s.tokens.find(t=>t.combatantId===P.id).position;return p.column+','+p.row;};
function queries(sealed){return {...env.queries,
 spaceDistance:(s,a,b)=>pos(s)===(a===A.id||b===A.id?'2,1':'7,3')?5:20,
 reach:(s,r)=>{const legal=pos(s)===(r.actorId===A.id?'2,1':'7,3');return {legal,codes:legal?[]:['target_out_of_range']}},
 visibility:(s,a,b)=>({visible:sealed||pos(s)"'!==(a===A.id||b===A.id?'"'6,1':'6,3')}),
 path:(s,r)=>({legal:costs[r.destination.column+','+r.destination.row]"'!==undefined,costFeet:costs[r.destination.column+'"','+r.destination.row]??0,cells:[],budgetFeet:60})
};}
for(const sealed of [false,true]){
 const out=sp.computeHostSplitCandidates(state,deps,[P.id],queries(sealed));
 console.log('controlled',sealed?'sealed-table':'base','radius',sp.maximumInfluenceRadiusFeet(state,P.id),'count',out.length);
 console.log(JSON.stringify(out.map(x=>({rank:x.rank,row:atoms.findIndex(a=>sp.scenarioFactKey(a)===x.factKey)+1,score:x.volatilityScore,refs:x.referencedProposalCount}))));
}
console.log('actions',env.queries.actions(state,A.id).map(a=>a.id));

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2328ms:
controlled base radius 60 count 8
[{"rank":1,"row":1,"score":120,"refs":2},{"rank":2,"row":2,"score":60,"refs":1},{"rank":3,"row":3,"score":60,"refs":1},{"rank":4,"row":4,"score":60,"refs":1},{"rank":5,"row":5,"score":60,"refs":1},{"rank":6,"row":6,"score":60,"refs":1},{"rank":7,"row":7,"score":60,"refs":1},{"rank":8,"row":8,"score":60,"refs":1}]
controlled sealed-table radius 60 count 6
[{"rank":1,"row":1,"score":120,"refs":2},{"rank":2,"row":2,"score":60,"refs":1},{"rank":3,"row":3,"score":60,"refs":1},{"rank":4,"row":4,"score":60,"refs":1},{"rank":5,"row":5,"score":60,"refs":1},{"rank":6,"row":6,"score":60,"refs":1}]
actions [ 'multiattack', 'shortsword', 'longbow' ]

exec
/bin/bash -lc "sed -n '205,385p' src/combat/cover.ts && sed -n '480,550p' src/combat/cover.ts && rg -n 'hostBaselineProposalPlanner' src/vtt/speculative-planning.ts && sed -n '805,870p' src/vtt/speculative-planning.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
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
290:export const hostBaselineProposalPlanner: HostBaselineProposalPlanner = Object.freeze({
683:  const baselineProposals = hostBaselineProposalPlanner.plan(planningState, actors, environment);

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const loader=require.extensions['.ts'];require.extensions['.ts']=(m,f)=>{
if("'!f.endsWith('"'/src/combat/cover.ts'))return loader(m,f);
let source=fs.readFileSync(f,'utf8');
const helper="'`
function reviewVertexSeal(from, to, at) {
 const dx=to.column-from.column,dy=to.row-from.row;
 let a=Math.abs(dx),b=Math.abs(dy);while(b){const r=a%b;a=b;b=r;}
 for(let k=1;k<a;k++){
 const x=from.column+dx*k/a,y=from.row+dy*k/a;
 const tl={column:x-1,row:y-1},tr={column:x,row:y-1},bl={column:x-1,row:y},br={column:x,row:y};
 if(at(tl)&&at(br))return tl;
 if(at(tr)&&at(bl))return tr;
 }return null;
}
`;
source=helper+source.replace('"'let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);','let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt) ?? reviewVertexSeal(from, to, sightBlockingAt);');
m._compile(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);
};

const {createEncounter,reduceEncounter}=require('./src/combat/encounter.ts');
const {monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const sp=require('./src/vtt/speculative-planning.ts');
const {availableEngineActorOptions}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const B=monsterProfile('B'),P=playerProfile('P');
const s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
for(const [name,state] of [['base',s],['plus84',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id),'sightBlocked',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,1).find(o=>o.optionId===p.primaryOptionId)?.label));
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount}))));
}
const moved={...s,tokens:s.tokens.map(t=>t.combatantId===P.id?{...t,position:{column:1,row:0}}:t)};
console.log('visibility at 1,0',env.queries.visibility(moved,A.id,P.id));
console.log('path 1,0',env.queries.path(s,{actorId:P.id,destination:{column:1,row:0},movement:'dash',maximumFeet:60}));

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2392ms:
base radius 60 sightBlocked false
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1}]
plus84 radius 60 sightBlocked true
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1},{"key":"reach:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:longbow:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1}]
visibility at 1,0 {
  visible: false,
  reciprocal: false,
  sense: 'unknown',
  reason: 'blocked'
}
path 1,0 {
  legal: true,
  cells: [
    { column: 0, row: 3 },
    { column: 0, row: 2 },
    { column: 0, row: 1 },
    { column: 1, row: 0 }
  ],
  costFeet: 20,
  budgetFeet: 60
}

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const loader=require.extensions['.ts'];require.extensions['.ts']=(m,f)=>{
if("'!f.endsWith('"'/src/combat/cover.ts'))return loader(m,f);
let source=fs.readFileSync(f,'utf8');
const helper="'`
function reviewVertexSeal(from,to,at){const dx=to.column-from.column,dy=to.row-from.row;let a=Math.abs(dx),b=Math.abs(dy);while(b){const r=a%b;a=b;b=r;}for(let k=1;k<a;k++){const x=from.column+dx*k/a,y=from.row+dy*k/a;const tl={column:x-1,row:y-1},tr={column:x,row:y-1},bl={column:x-1,row:y},br={column:x,row:y};if(at(tl)&&at(br))return tl;if(at(tr)&&at(bl))return tr;}return null;}
`;
source=helper+source.replace('"'let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt);','let firstBlockingCell = firstSharedEdgeBlockingCell(from, to, sightBlockingAt) ?? reviewVertexSeal(from, to, sightBlockingAt);');
m._compile(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);
};

const {createEncounter,reduceEncounter}=require('./src/combat/encounter.ts');
const {monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const sp=require('./src/vtt/speculative-planning.ts');
const {availableEngineActorOptions}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const B=monsterProfile('B'),P=playerProfile('P');
const s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
for(const [name,state] of [['base',s],['plus84',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id),'sightBlocked',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,1).find(o=>o.optionId===p.primaryOptionId)?.label));
 for (const p of result.baselineProposals) { const o=availableEngineActorOptions(ps,p.actorId,env,1).find(o=>o.optionId===p.primaryOptionId); if(o)console.log('resolution',p.actorId,JSON.stringify(require('./src/vtt/intent-resolver.ts').resolveEngineActorOption(ps,o,env))); }
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount}))));
}
const moved={...s,tokens:s.tokens.map(t=>t.combatantId===P.id?{...t,position:{column:1,row:0}}:t)};
console.log('visibility at 1,0',env.queries.visibility(moved,A.id,P.id));
console.log('path 1,0',env.queries.path(s,{actorId:P.id,destination:{column:1,row:0},movement:'dash',maximumFeet:60}));

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2370ms:
base radius 60 sightBlocked false
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
resolution combatant:A {"valid":true,"mechanics":{"actorId":"combatant:A","optionId":"option:1:8771ab35427e83933dd814b61558585193f25be73fa09472","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":4},"actionSlots":[{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true},{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true}],"omittedRiders":[]}}
resolution combatant:B {"valid":true,"mechanics":{"actorId":"combatant:B","optionId":"option:1:1d9e2a70c8d9a860317c623f21dc84d3033737428e140c9e","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":6},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1}]
plus84 radius 60 sightBlocked true
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
resolution combatant:A {"valid":true,"mechanics":{"actorId":"combatant:A","optionId":"option:1:8771ab35427e83933dd814b61558585193f25be73fa09472","movementCostFeet":25,"path":[{"column":12,"row":3},{"column":11,"row":2},{"column":10,"row":1},{"column":9,"row":2},{"column":8,"row":3}],"finalPosition":{"column":8,"row":3},"actionSlots":[{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true},{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true}],"omittedRiders":[]}}
resolution combatant:B {"valid":true,"mechanics":{"actorId":"combatant:B","optionId":"option:1:1d9e2a70c8d9a860317c623f21dc84d3033737428e140c9e","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":6},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1},{"key":"reach:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:longbow:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1}]
visibility at 1,0 {
  visible: false,
  reciprocal: false,
  sense: 'unknown',
  reason: 'blocked'
}
path 1,0 {
  legal: true,
  cells: [
    { column: 0, row: 3 },
    { column: 0, row: 2 },
    { column: 0, row: 1 },
    { column: 1, row: 0 }
  ],
  costFeet: 20,
  budgetFeet: 60
}

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const {createEncounter}=require('./src/combat/encounter.ts'),{monsterCombatantProfile}=require('./src/combat/combatant.ts');
const {SCOUT}=require('./src/combat/statblocks/mercenary-company.ts'),{playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const sp=require('./src/vtt/speculative-planning.ts');
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'}),B=monsterCombatantProfile(SCOUT,{combatantId:'combatant:B',tokenId:'token:B'}),P=playerProfile('P');
const state={...createEncounter({bounds:{columns:10,rows:5},combatants:[A,B,P],tokens:[placedToken(A,1,1),placedToken(B,8,3),placedToken(P,4,2)]}),activeCombatant:A.id};
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),ref=x=>({actorId:'combatant:'+x,selector:{kind:'combatant',combatantId:'combatant:'+x}});
const pairs=[['adjacency','A','P',['A','B']],['adjacency','B','P',['B']],['adjacency','P','A',['A']],['adjacency','P','B',['B']],['reach','A','P',['A']],['reach','B','P',['B']],['visibility','A','P',['A']],['visibility','B','P',['B']],['visibility','P','A',['A']]];
const atoms=pairs.map(([kind,a,b])=>kind==='adjacency'?{kind:'adjacency_is',left:ref(a),right:ref(b),value:false}:kind==='reach'?{kind:'within_action_reach_is',actor:ref(a),target:ref(b),actionId:'shortsword',value:false}:{kind:'visibility_is',observer:ref(a),subject:ref(b),value:true});
const deps=atoms.flatMap((baseline,i)=>pairs[i][3].map(x=>({proposalActorId:'combatant:'+x,baseline,flipped:sp.complementScenarioFact(baseline)})));
const costs={'2,1':10,'7,3':20,'6,1':15,'6,3':15};
const pos=s=>{const p=s.tokens.find(t=>t.combatantId===P.id).position;return p.column+','+p.row;};
function queries(sealed){return {...env.queries,
 spaceDistance:(s,a,b)=>pos(s)===(a===A.id||b===A.id?'2,1':'7,3')?5:20,
 reach:(s,r)=>{const legal=pos(s)===(r.actorId===A.id?'2,1':'7,3');return {legal,codes:legal?[]:['target_out_of_range']}},
 visibility:(s,a,b)=>({visible:sealed||pos(s)"'!==(a===A.id||b===A.id?'"'6,1':'6,3')}),
 path:(s,r)=>({legal:costs[r.destination.column+','+r.destination.row]"'!==undefined,costFeet:costs[r.destination.column+'"','+r.destination.row]??0,cells:[],budgetFeet:60})
};}
for(const sealed of [false,true]){
 const out=sp.computeHostSplitCandidates(state,deps,[P.id],queries(sealed));
 console.log('controlled',sealed?'sealed-table':'base','radius',sp.maximumInfluenceRadiusFeet(state,P.id),'count',out.length);
 console.log(JSON.stringify(out.map(x=>({rank:x.rank,row:atoms.findIndex(a=>sp.scenarioFactKey(a)===x.factKey)+1,score:x.volatilityScore,refs:x.referencedProposalCount}))));
}
console.log('actions',env.queries.actions(state,A.id).map(a=>a.id));

const target=require.resolve('./src/vtt/speculative-planning.ts'),source=fs.readFileSync(target,'utf8');
for(const [name,from,to] of [['no-slice','retained.slice(0, 8)','retained'],['addition','referencedProposalCount * summedMovementRadiusFeet','referencedProposalCount + summedMovementRadiusFeet'],['reverse-ties','compareCanonicalBytes(left.factKey, right.factKey)','compareCanonicalBytes(right.factKey, left.factKey)']]){
 const m=new Module(target,module);m.filename=target;m.paths=module.paths;
 m._compile(ts.transpileModule(source.replace(from,to),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,target);
 const out=m.exports.computeHostSplitCandidates(state,deps,[P.id],queries(false));
 console.log('mutant',name,'rows',out.map(x=>atoms.findIndex(a=>sp.scenarioFactKey(a)===x.factKey)+1),'scores',out.map(x=>x.volatilityScore));
}

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2334ms:
controlled base radius 60 count 8
[{"rank":1,"row":1,"score":120,"refs":2},{"rank":2,"row":2,"score":60,"refs":1},{"rank":3,"row":3,"score":60,"refs":1},{"rank":4,"row":4,"score":60,"refs":1},{"rank":5,"row":5,"score":60,"refs":1},{"rank":6,"row":6,"score":60,"refs":1},{"rank":7,"row":7,"score":60,"refs":1},{"rank":8,"row":8,"score":60,"refs":1}]
controlled sealed-table radius 60 count 6
[{"rank":1,"row":1,"score":120,"refs":2},{"rank":2,"row":2,"score":60,"refs":1},{"rank":3,"row":3,"score":60,"refs":1},{"rank":4,"row":4,"score":60,"refs":1},{"rank":5,"row":5,"score":60,"refs":1},{"rank":6,"row":6,"score":60,"refs":1}]
actions [ 'multiattack', 'shortsword', 'longbow' ]
mutant no-slice rows [
  1, 2, 3, 4, 5,
  6, 7, 8, 9
] scores [
  120, 60, 60, 60, 60,
   60, 60, 60, 60
]
mutant addition rows [
  1, 2, 3, 4,
  5, 6, 7, 8
] scores [
  62, 61, 61, 61,
  61, 61, 61, 61
]
mutant reverse-ties rows [
  1, 9, 8, 7,
  6, 5, 4, 3
] scores [
  120, 60, 60, 60,
   60, 60, 60, 60
]

codex
The nine-row controlled table checks out: it returns rows 1–8 with scores `120, 60, …, 60`, excludes row 9, and returns rows 1–6 when the stipulated visibility flips are disabled.

The real integration scene does not match its oracle: the base menu has two entries. An in-memory implementation of the stated D642 vertex rule blocks the direct ray after adding `(8,4)`, but A still receives a Longbow proposal. I’m tracing its resolved movement to check why the expected `[Dodge, Dodge]` result fails.

exec
/bin/bash -lc "python3 - <<'PY'
import re,pathlib
p=pathlib.Path('.tmp-plans/2026-09-17-cohort-01-plan.md').read_text().splitlines()
pattern=re.search(\"-e '(["'^'"']+)'\",p[56]).group(1)
for s in ['6209001','6_209_001','6209xxx','6209011','6_209_011','6210020','6_211_123']:
 print(s,bool(re.search(pattern,s)))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
6209001 True
6_209_001 True
6209xxx True
6209011 False
6_209_011 False
6210020 False
6_211_123 False

exec
/bin/bash -lc "node <<'JS'
const ts=require('typescript'),fs=require('node:fs'),path=require('node:path'),Module=require('node:module');
const orig=Module._load;Module._load=function(r,p,i){if(r.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(p.filename),r.slice(0,-4)),'utf8');return orig.apply(this,arguments)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule(fs.readFileSync(f,'utf8').replaceAll('import.meta.url',JSON.stringify(require('node:url').pathToFileURL(f).href)).replaceAll('import.meta.env','({MODE:\"production\",DEV:false})'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,f);

const {decodeArenaFixtureText}=require('./src/vtt/mcp/entrypoint.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {availableEngineActorOptions,resolveEngineActorOption}=require('./src/vtt/intent-resolver.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});let found=0;
for(const family of ['brutal','brutal-b','brutal-2']){
 for(const file of fs.readdirSync('tests/fixtures/arena-basis-'+family).sort()){
 const s=freshMonsterPlanningState(decodeArenaFixtureText(fs.readFileSync('tests/fixtures/arena-basis-'+family+'/'+file,'utf8')));
 for(const c of s.combatants.filter(c=>c.profile.kind==='monster'&&c.life==='living')){
 const resolved=availableEngineActorOptions(s,c.profile.id,env).map(o=>({o,r:resolveEngineActorOption(s,o,env)})).filter(x=>x.r.valid);
 const action=resolved.some(x=>x.r.mechanics.actionSlots.some(z=>['attack','saving_throw','cast_spell'].includes(z.kind)));
 const move=resolved.filter(x=>x.r.mechanics.movementCostFeet>0);
 if("'!action&&move.length){console.log('"'movement-only',family,file,c.profile.id,JSON.stringify(move.map(x=>({label:x.o.label,cost:x.r.mechanics.movementCostFeet,position:x.r.mechanics.finalPosition}))));found++;}
 }
 if(found)break;
 }if(found)break;
}
console.log('found',found);

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2417ms:
movement-only brutal seed-6203001.json combatant:generated-6203001-monster-3 [{"label":"Dash","cost":35,"position":{"column":10,"row":0}}]
movement-only brutal seed-6203001.json combatant:generated-6203001-monster-4 [{"label":"Dash","cost":30,"position":{"column":10,"row":0}}]
found 2

exec
/bin/bash -lc 'git status --porcelain && git diff --exit-code && sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md && wc -l .tmp-plans/2026-09-17-cohort-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
4f3385b4aee5f9d83948d41d6486ba11c76f3d32bb3d7c1a443f65b9452692a0  .tmp-plans/2026-09-17-cohort-01-plan.md
373 .tmp-plans/2026-09-17-cohort-01-plan.md

codex
**PLAN-F3 — P2, remains open — lines 294–301: the integration scene’s exact oracle is incorrect.**

Evidence from the real production planner on the specified scene, with fresh monster turns and A active:

- Baselines match: `[Longbow + Longbow -> combatant:P, Dodge]`.
- The base menu contains **two** candidates, adjacency and visibility, each scoring **60**, rather than one. P can move `(1,4) → (0,3) → (0,2) → (0,1) → (1,0)` for **20 feet**, where A cannot see P.
- The target selector’s context is also wrong in the proposed key. `extractProposalFactDependencies` produces `{actorId:'combatant:A', selector:{kind:'combatant', combatantId:'combatant:P'}}`, not `S(P)`.
- With an **in-memory reference implementation of D642’s interior-vertex sealing**, adding `(8,4)` blocks the initial ray, but A retains its Longbow proposal by moving **25 feet to `(8,3)`**. The menu becomes **three** candidates—adjacency, reach, visibility—not `[]`. This is reference-rule evidence, not verification of the pending WALL-01 implementation.

Fix: explicitly control A’s movement if the intended mutation must eliminate offense, then independently derive the complete base/mutated menus and actual selector keys. Preserve the post-WALL stop/review gate.

**PLAN-F2 — P2, partially resolved — lines 57–59: the revised audit still misses prior uses elsewhere within each namespace.**

The three commands reproduce the recorded output exactly, with statuses **0/1/0**. MAIN provenance, reservation classification, sequencing, and replacement authorization are corrected.

However, the numeric alternatives search only seeds **001–010**. Testing the exact expression yields:

| Input | Matches |
|---|---:|
| `6209001`, `6_209_001`, `6209xxx` | Yes |
| `6209011`, `6_209_011`, `6210020`, `6_211_123` | No |

The validator’s namespace intervals cover **000–999**, so these commands cannot establish that those namespaces are unused.

Fix: retain the reservation classification but search complete namespaces, for example `6209[0-9]{3}` and `6_209_[0-9]{3}`, likewise for 6210/6211 and replacement candidates.

**PLAN-F5 — P2, new — lines 213–215: v2’s “exact” namespace ledger drops historical exclusions.**

Evidence: `D569_USED_SEED_NAMESPACES` currently contains **5117xxx, 6203xxx, 6204xxx, 6206xxx, 6208xxx**. R2 specifies only **5118xxx, 6207xxx, 6209xxx, 6210xxx, 6211xxx**. R1 explicitly extended the historical list; that requirement disappeared. The special handling allowing carried hard-2 and the declared new second-family cohort also disappeared.

Fix: specify the complete **ten-namespace union**, retain narrowly defined own-cohort exceptions, and test that removing any historical namespace fails. In particular, preserve the D569 precedent’s 6204-ledger mutant.

**PLAN-F6 — P2, new — lines 120–124: membership silently changes from productivity to mandatory offense.**

Evidence: `everyMonsterProductive` accepts valid positive movement or attack/save/cast/world-object use. R2 instead requires an attack/save/cast offer for every living monster, while Batch 1 says v2 retains the existing membership contract.

This distinction is observable: in frozen `6203001`, monsters **3 and 4** have productive Dash options of **35 and 30 feet**, respectively, but no attack/save/cast option. The two definitions would classify them differently.

Fix: preserve the existing productivity predicate and apply resolved-origin sight/cover checks to its targeted offensive components. If mandatory offense is intended, explicitly reconcile that contract change across the validator, cohort selection, and tests.

The remaining review results are positive:

- **PLAN-F1 closed:** separately pinned outer-manifest identity, version-specific session/row handling, and unchanged-hard cross-version rejection are now explicit.
- **PLAN-F4 closed:** counts are **3/3/10/10/10/8/4/4/3/1**, totaling **52 unique paths: 18 existing + 34 new**.
- The controlled nine-candidate table is correct **under its stipulated query responses**: radius **60**, scores **120 then eight 60s**, retained rows **1–8**, excluded row **9**; disabling the three visibility flips retains **1–6**. In-memory mutants produced **nine rows** without the slice, scores **62/61** with addition, and order **1,9,8,7,6,5,4,3** with reversed ties. The table tests ranking/filtering; its mocked visibility change does not independently prove production corner sealing.
- Canonical regeneration for active v6, non-fog-difference rejection, new-v2 legacy-key rejection, and post-WALL behavior re-verification are explicitly required.

`sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md` returned **4f3385b4aee5f9d83948d41d6486ba11c76f3d32bb3d7c1a443f65b9452692a0**; `wc -l` returned **373**. Final `git status --porcelain` was empty and `git diff --exit-code` succeeded. All runtime probes and mutations remained in memory.

VERDICT: REJECT (0 P1, 4 P2)
REVIEW DONE
tokens used
201,027
**PLAN-F3 — P2, remains open — lines 294–301: the integration scene’s exact oracle is incorrect.**

Evidence from the real production planner on the specified scene, with fresh monster turns and A active:

- Baselines match: `[Longbow + Longbow -> combatant:P, Dodge]`.
- The base menu contains **two** candidates, adjacency and visibility, each scoring **60**, rather than one. P can move `(1,4) → (0,3) → (0,2) → (0,1) → (1,0)` for **20 feet**, where A cannot see P.
- The target selector’s context is also wrong in the proposed key. `extractProposalFactDependencies` produces `{actorId:'combatant:A', selector:{kind:'combatant', combatantId:'combatant:P'}}`, not `S(P)`.
- With an **in-memory reference implementation of D642’s interior-vertex sealing**, adding `(8,4)` blocks the initial ray, but A retains its Longbow proposal by moving **25 feet to `(8,3)`**. The menu becomes **three** candidates—adjacency, reach, visibility—not `[]`. This is reference-rule evidence, not verification of the pending WALL-01 implementation.

Fix: explicitly control A’s movement if the intended mutation must eliminate offense, then independently derive the complete base/mutated menus and actual selector keys. Preserve the post-WALL stop/review gate.

**PLAN-F2 — P2, partially resolved — lines 57–59: the revised audit still misses prior uses elsewhere within each namespace.**

The three commands reproduce the recorded output exactly, with statuses **0/1/0**. MAIN provenance, reservation classification, sequencing, and replacement authorization are corrected.

However, the numeric alternatives search only seeds **001–010**. Testing the exact expression yields:

| Input | Matches |
|---|---:|
| `6209001`, `6_209_001`, `6209xxx` | Yes |
| `6209011`, `6_209_011`, `6210020`, `6_211_123` | No |

The validator’s namespace intervals cover **000–999**, so these commands cannot establish that those namespaces are unused.

Fix: retain the reservation classification but search complete namespaces, for example `6209[0-9]{3}` and `6_209_[0-9]{3}`, likewise for 6210/6211 and replacement candidates.

**PLAN-F5 — P2, new — lines 213–215: v2’s “exact” namespace ledger drops historical exclusions.**

Evidence: `D569_USED_SEED_NAMESPACES` currently contains **5117xxx, 6203xxx, 6204xxx, 6206xxx, 6208xxx**. R2 specifies only **5118xxx, 6207xxx, 6209xxx, 6210xxx, 6211xxx**. R1 explicitly extended the historical list; that requirement disappeared. The special handling allowing carried hard-2 and the declared new second-family cohort also disappeared.

Fix: specify the complete **ten-namespace union**, retain narrowly defined own-cohort exceptions, and test that removing any historical namespace fails. In particular, preserve the D569 precedent’s 6204-ledger mutant.

**PLAN-F6 — P2, new — lines 120–124: membership silently changes from productivity to mandatory offense.**

Evidence: `everyMonsterProductive` accepts valid positive movement or attack/save/cast/world-object use. R2 instead requires an attack/save/cast offer for every living monster, while Batch 1 says v2 retains the existing membership contract.

This distinction is observable: in frozen `6203001`, monsters **3 and 4** have productive Dash options of **35 and 30 feet**, respectively, but no attack/save/cast option. The two definitions would classify them differently.

Fix: preserve the existing productivity predicate and apply resolved-origin sight/cover checks to its targeted offensive components. If mandatory offense is intended, explicitly reconcile that contract change across the validator, cohort selection, and tests.

The remaining review results are positive:

- **PLAN-F1 closed:** separately pinned outer-manifest identity, version-specific session/row handling, and unchanged-hard cross-version rejection are now explicit.
- **PLAN-F4 closed:** counts are **3/3/10/10/10/8/4/4/3/1**, totaling **52 unique paths: 18 existing + 34 new**.
- The controlled nine-candidate table is correct **under its stipulated query responses**: radius **60**, scores **120 then eight 60s**, retained rows **1–8**, excluded row **9**; disabling the three visibility flips retains **1–6**. In-memory mutants produced **nine rows** without the slice, scores **62/61** with addition, and order **1,9,8,7,6,5,4,3** with reversed ties. The table tests ranking/filtering; its mocked visibility change does not independently prove production corner sealing.
- Canonical regeneration for active v6, non-fog-difference rejection, new-v2 legacy-key rejection, and post-WALL behavior re-verification are explicitly required.

`sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md` returned **4f3385b4aee5f9d83948d41d6486ba11c76f3d32bb3d7c1a443f65b9452692a0**; `wc -l` returned **373**. Final `git status --porcelain` was empty and `git diff --exit-code` succeeded. All runtime probes and mutations remained in memory.

VERDICT: REJECT (0 P1, 4 P2)
REVIEW DONE
