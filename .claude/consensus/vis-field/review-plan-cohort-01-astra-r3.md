
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
RULES (binding, restated): You are the PLAN REVIEWER (gpt-6-astra, HIGH, RESUMED — you reviewed COHORT-01 plan r1 and r2). Worktree /home/vagrant/PhpstormProjects/dnd-wt-seam-verify — DETACHED clean checkout at e86a4d26 (NOTE: the repository's history was rewritten tonight to purge a 65 MB log blob — D649; e86a4d26 is the SAME tree as the 807d2e3c you reviewed before; commit ids changed, contents did not). Sandbox read-only; no edits, no git writes, no claude / `claude -p` / other agents / consensus skills; skills under ~/.codex do NOT apply; no full vitest, Playwright, build; never port 4173. Readable: .tmp-plans/2026-09-17-cohort-01-plan.md = r3 (sha256 b6b4b6c09d1e1643df7d30e0b70bc9c6ca4f746750ff373e3e51b31a2a4b796d, 395 lines — verify), the MAIN repo's .claude/decisions.md (D648, D649). Model calls WILL fail. End with the named marker.

TASK: FINAL round (3-round cap). Re-review r3 against your r2 findings: PLAN-F3 (the integration scene: A's movement now controlled? complete base and mutated menus and the real selector keys derived by hand — verify with the real planner as you did in r2), PLAN-F2 (namespace search over the full 000–999 intervals in plain/underscore/xxx forms — run the commands), PLAN-F5 (the ten-namespace union, own-cohort exceptions, the remove-any-historical-namespace test, the 6204 mutant), PLAN-F6 (productivity predicate preserved with sight/cover applied only to targeted offensive components; Dash-only monsters stay productive — or an explicit owner question if the contract changes). Then one last sweep for anything the three rounds missed. If a P2 remains, say precisely what a supervisor amendment (a binding note appended to the frozen plan, as D626/D636 did) must contain so implementation can proceed without a fourth planning round. OUTPUT: PLAN-Fn findings with severity, line, evidence, fix; "VERDICT: ACCEPT" / "ACCEPT WITH AMENDMENT (text)" / "REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll verify r3 and the rewritten checkout, run the namespace commands, and reproduce the revised integration scene with the real planner. I’ll also check the ledger and productivity fixes and identify any precise amendment needed to finish this review round.

exec
/bin/bash -lc 'git rev-parse HEAD && git status --porcelain && sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md && wc -l .tmp-plans/2026-09-17-cohort-01-plan.md && nl -ba .tmp-plans/2026-09-17-cohort-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
e86a4d2620f58f75c3d54161ffb446341a7cfa1d
b6b4b6c09d1e1643df7d30e0b70bc9c6ca4f746750ff373e3e51b31a2a4b796d  .tmp-plans/2026-09-17-cohort-01-plan.md
395 .tmp-plans/2026-09-17-cohort-01-plan.md
     1	# VIS-FIELD-01 / COHORT-01 implementation plan r3 (D643 option A1)
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
   146	- `tests/fixtures/arena-basis-brutal-v2/seed-6209003.json`
   147	- `tests/fixtures/arena-basis-brutal-v2/seed-6209004.json`
   148	- `tests/fixtures/arena-basis-brutal-v2/seed-6209005.json`
   149	- `tests/fixtures/arena-basis-brutal-v2/seed-6209006.json`
   150	- `tests/fixtures/arena-basis-brutal-v2/seed-6209007.json`
   151	- `tests/fixtures/arena-basis-brutal-v2/seed-6209008.json`
   152	- `tests/fixtures/arena-basis-brutal-v2/seed-6209009.json`
   153	- `tests/fixtures/arena-basis-brutal-v2/seed-6209010.json`
   154	
   155	**R/M/Generation/V:** Batch-2 tests are RED first. Twice run
   156	`npx vite-node tools/generate-arena-basis.ts -- --difficulty brutal --seed 6209001 --rooms 10 --out <fresh-temp>/arena-basis-brutal-v2`.
   157	Assert no parsed `terrainProfile` and `d466GeneratedRoomOverride(seed) === null` for 10/10.
   158	Require empty `diff -rq A B`, then decoded membership 10/10 and both mutants. Only then move A
   159	unchanged to Allowed files and rerun membership/common checks. Do not compute hashes yet.
   160	
   161	### Batch 4 — generate brutal-b-v2 6210001-6210010
   162	
   163	**Allowed files (10):**
   164	
   165	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json`
   166	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json`
   167	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json`
   168	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json`
   169	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json`
   170	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json`
   171	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json`
   172	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json`
   173	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json`
   174	- `tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json`
   175	
   176	**R/M/T/V:** identical to Batch 3 with seed 6210001/directory `arena-basis-brutal-b-v2`:
   177	two temps, empty diff, no profile/override, decoded membership 10/10, mutants, common checks, no hashes.
   178	
   179	### Batch 5 — generate D569 brutal-2-v2 6211001-6211010
   180	
   181	**Allowed files (10):**
   182	
   183	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json`
   184	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json`
   185	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json`
   186	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json`
   187	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json`
   188	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json`
   189	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json`
   190	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json`
   191	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json`
   192	- `tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json`
   193	
   194	**R/M/T/V:** identical with seed 6211001/directory `arena-basis-brutal-2-v2`. End with one
   195	membership-only run proving exactly 30/30 fixtures and every living monster; any failure rejects
   196	that full ten-seed namespace and invokes the pre-Batch-2 replacement procedure.
   197	
   198	### Batch 6 — v2/v6 manifests, identity boundary, and hashes
   199	
   200	**Allowed files (8):**
   201	
   202	- `tools/d569-second-family-manifest.ts`
   203	- `tools/d569-blind-experiment.ts`
   204	- `tests/fixtures/d569-second-family-manifest-v2.json` (new)
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
   256	- `tools/ai-dm-arena.ts`
   257	- `tests/unit/tools/ai-dm-arena.test.ts`
   258	- `tools/ai-dm-rerun-packet.ts`
   259	- `tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts`
   260	
   261	**R/Implementation:** first fail exact parser/path/wrong-family cases. Add arena basis labels
   262	`brutal-v2` -> 6209 and `brutal-b-v2` -> 6210, both difficulty brutal. At rerun definitions near
   263	lines 26/547 add closed protocols `brutal-10-v2` and `brutal-10-b-v2`, exact ten-seed arrays and
   264	directories. Historical labels/protocols retain their old paths and behaviour.
   265	
   266	**M/T/V:** map new labels to old paths, swap new ranges, and remove an old label; exact new and
   267	historical route tests kill each. Common checks; arena has prior 6 + 2 labels, rerun prior 3 + 2.
   268	
   269	### Batch 8 — LOS audit and blind fixture report
   270	
   271	**Allowed files (4):**
   272	
   273	- `tools/los-cover-era-audit.ts`
   274	- `tests/unit/tools/los-cover-era-audit.test.ts`
   275	- `tools/blind-context-fixture-report.ts`
   276	- `tests/unit/vtt/blind-turn-context.test.ts`
   277	
   278	**R/Implementation:** first expect 30 missing rows. Add file-backed `brutal-v2`,
   279	`brutal-b-v2`, `brutal-2-v2`; preserve historical entries. LOS audit is 93 rooms (63+30), ten
   280	per new family. Blind report is 63 cases (33+30), decoded from exact committed paths.
   281	
   282	**M/T/V:** omit or alias a family; family/seed/path/hash/count assertions fail. Common checks;
   283	focused outputs are 93 and 63, with 10/10/10 new rows and 63/63 schema-valid cap-fit cases.
   284	
   285	### Batch 9 — hand-authored behaviour pins
   286	
   287	**Allowed files (3):**
   288	
   289	- `tests/unit/vtt/composite-turn-proposals.test.ts`
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

exec
/bin/bash -lc "rg -n '"'^## D64[89]'"' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md && tail -n 32 /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
23077:## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
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

## D647 — SUPERVISOR (2026-09-17 20:22): WALL-01 fix r1 harvested (sol; saved impl-wall-01-fix-r1-sol.md) — my verification running on the throwaway checkout; COHORT-01 plan r2 harvested (sha 4f3385b4…, 373 lines; r1 archived) — astra r2 (HIGH, resumed) running
SOL fix r1: vertex lookup now queries sightBlockingAt directly around each GCD-enumerated interior lattice vertex (no candidate bbox), also on the coverTierBetweenObjects path; the three axis witnesses (my geometries: first cells (7,3) / (8,3) / (4,2)) + split control; 46/46; four mutants incl. the bbox-regression one (exactly the three axis witnesses red); counts table unchanged before/after (hard 142/35, brutal 57/34, brutal-b 15/41, brutal-2 58/36 — now with a working rule); 42 seeds byte-identical (aggregate 7b884bf9…); pair 39.1 s; the 35 frozen/behaviour reds unchanged; four los-cover 5 s budget timeouts under the combined audit (110/112 isolated with two) — perf, not re-pinned. MY VERIFICATION (verify-wall-01-r1.log; ../dnd-wt-seam-ab reset to 807d2e3c + patch): tsc, my seven-case probe (A/B/C/D must block, E split pair / F outer-face graze / G single corner must stay clear), a vertex-lookup-null mutant, the suites, los-cover alone, pair.
PLAN r2 disposition (planner): F1 → separately pinned outer-v6 identity in session keys/cells/rows/matching, v5 preserved, v5 hard rows rejected; F2 → pre-Batch-2 gate against MAIN decisions, plain/xxx/underscore forms, verbatim output, reservations classified, three families reserved together, Allowed-file amendment before replacement generation; F3 → fixed two-proposal integration scene + nine-candidate hand table (radii, paths, scores, byte tie order, excluded ninth, exact seam mutation); F4 → counts fixed; canonical regeneration required for active v6; rejection witnesses for non-fog differences and legacy keys in v2. Astra r2 told to verify the F3 hand table itself.

## D648 — SUPERVISOR (2026-09-17 20:38): FINDING AGAINST MY OWN REVIEW — WALL-F1 (D645) RETRACTED; a real D642 consequence found in scene-snapshot; COHORT-01 plan r2 REJECTED by astra r2 (0 P1, 4 P2) → r3 (final round) dispatched
RETRACTION, at full length. In D645 I rejected WALL-01 as P1 on two grounds, both wrong: (1) I claimed the vertex map was built from the bounding-box-filtered `candidates`; it was built from `candidateEntries` — the UNFILTERED union of indexed sources and blocked cells — so no cell was ever excluded; (2) I read my probe's aggregate blocksSight=false for two isolated diagonal blockers as "the rule is inert", but blocksSight is true only when EVERY corner ray is blocked, and in that geometry the ray along the far face (y=5) is legitimately clear (a graze) — the aggregate false was CORRECT. The decisive test I should have run first: a FULL stepped wall (column 7 rows 0–3, column 8 rows 4–7), Medium tokens (13,4)→(1,4): baseline 807d2e3c leaks (false); ORIGINAL WALL-01 blocks (true, first (7,3)); fix r1 blocks (true). Verified by me tonight on the throwaway checkout, all three trees. So the original WALL-01 was correct; fix r1 replaced a correct precomputed map with equivalent on-the-fly lookups and added per-ray witnesses for my three geometries (valid per-ray, and the split-pair control) — harmless, kept as the candidate, but the "bbox regression" mutant sol reports is a restriction the original never had. Sol did not push back on a false P1; the brief told it what to find. Lesson recorded in memory (aggregate vs per-ray; read the code path before naming a cause).
REAL FINDING (WALL-F2, D642 consequence, not a defect): tests/unit/vtt/scene-snapshot.test.ts "preserves full persisted request/coordinator bytes and the actual revision checksum" is red with the vertex rule (8/8 on clean 807d2e3c): the two-room scene's derived fog gains cells (8,3) and (9,3) — a sealed diagonal crack now conceals two cells the party could previously see through. Sol's suite audit did not include scene-snapshot. Handling = D569 demonstrate-then-normalize exactly as B4/B2 did for this test (D635.5–.7: show the vertex, the ray, the two cells; then re-pin the persisted expectation and the revision checksum/fingerprint with the derivation). An UNTRUNCATED full vitest on the r1 candidate is running (full-vitest-wall-r1.log) to find every other consequence before the fix-r2 brief.
MY VERIFICATION of fix r1 otherwise (verify-wall-01-r1.log): tsc 0/0; diff-check 0; vertex-lookup-null mutant → 5 sealed witnesses red; suites 2150/2186 = the 35 known frozen/behaviour reds + scene-snapshot; los-cover 110/112 (the two 5 s budget timeouts, perf); pair 36/36 in 39 s.
PLAN r2 → astra r2 REJECT (saved review-plan-cohort-01-astra-r2.md): F1, F4 closed; F3 still open (astra ran the real planner: the base menu has two candidates not one, the selector key shape is wrong, and under sealed corners A keeps its shot by moving 25 ft to (8,3) so the mutated menu has three entries, not []); F2 partial (search must cover the whole 000–999 namespaces); F5 NEW (v2's ledger drops the five historical namespaces and the own-cohort handling); F6 NEW (membership silently became mandatory offense; 6203001 monsters 3/4 are Dash-only productive). The nine-candidate table verified correct under its stipulated responses. r3 = the final round (planner resumed; brief plan-cohort-01-r3.md; r2 archived).

exec
/bin/bash -lc "rg -n 'speed_set|speed.*set|movement_modifier|enginePlanningSpeedFeet' src/combat/effects.ts src/vtt/engine-query-port.ts tests/unit/vtt/speculative-planning.test.ts | head -55 && sed -n '250,325p' tests/unit/vtt/speculative-planning.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
tests/unit/vtt/speculative-planning.test.ts:32:  enginePlanningSpeedFeet,
tests/unit/vtt/speculative-planning.test.ts:231:      payload: { kind: 'movement_modifier', speedDeltaFeet: -10 },
tests/unit/vtt/speculative-planning.test.ts:233:    expect(enginePlanningSpeedFeet(slowed, fixture.source.id)).toBe(20);
src/combat/effects.ts:391:      readonly kind: 'movement_modifier';
src/combat/effects.ts:395:      readonly kind: 'movement_modifier';
src/vtt/engine-query-port.ts:384:    enginePlanningSpeedFeet(state, targetId) > 0 &&
src/vtt/engine-query-port.ts:595:export function enginePlanningSpeedFeet(
src/vtt/engine-query-port.ts:604:    effect.targets.includes(subjectId) && effect.payload.kind === 'movement_modifier'
src/vtt/engine-query-port.ts:614:      speeds.set('walking', (speeds.get('walking') ?? 0) + payload.speedDeltaFeet);
src/vtt/engine-query-port.ts:619:        for (const mode of speeds.keys()) speeds.set(mode, payload.speedChange.speedFeet);
src/vtt/engine-query-port.ts:622:        for (const [mode, speed] of speeds) speeds.set(mode, speed + payload.speedChange.feet);
src/vtt/engine-query-port.ts:627:            speeds.set(mode, payload.speedChange.reduction.kind === 'feet'
src/vtt/engine-query-port.ts:636:      speeds.set(grant.mode, grant.speed.kind === 'fixed' ? grant.speed.feet : walking);
src/vtt/engine-query-port.ts:785:  return state.effects.some((effect) => effect.targets.includes(id) && effect.payload.kind === 'movement_modifier' &&
src/vtt/engine-query-port.ts:1466:    speedPerTurn: feet(enginePlanningSpeedFeet(state, actorId)),
src/vtt/engine-query-port.ts:1609:    speedPerTurn: feet(enginePlanningSpeedFeet(state, request.actorId)),
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity('spec-exhaustion'),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'exhaustion', level: 2 },
    });
    const targetRef = direct(fixture.target.id);
    const sourceRef = direct(fixture.source.id);
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Charmed', source: fixture.source.id }, present: true,
    }).matches).toBe(true);
    expect(enginePlanningConditions(state, fixture.target.id)).toEqual(
      expect.arrayContaining([
        { name: 'Charmed', source: fixture.source.id },
        { name: 'Exhaustion', level: 2 },
      ]),
    );
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Charmed', source: fixture.target.id }, present: true,
    })).toMatchObject({ matches: false, failure: 'FACT_FALSE' });
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Exhaustion', level: 2 }, present: true,
    }).matches).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'condition_is', subject: targetRef,
      condition: { name: 'Exhaustion', level: 1 }, present: true,
    }).matches).toBe(false);
    expect(evaluateScenarioFact(state, {
      kind: 'resource_available_is', subject: sourceRef,
      resource: { kind: 'spell_slot', level: 3 }, available: true,
    }).matches).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'visibility_is', observer: sourceRef, subject: targetRef, value: true,
    }).matches).toBe(true);
    expect(engineConcentrationActive(state, fixture.source.id)).toBe(true);
    expect(evaluateScenarioFact(state, {
      kind: 'concentration_is', subject: sourceRef, active: true,
    }).matches).toBe(true);
  });

  it('evaluates life, adjacency, action reach, and persistent-zone occupancy with exact complements', () => {
    const hard = freshMonsterPlanningState(generateRoom(5_117_002, { difficulty: 'hard' }).encounter.state);
    const actor = hard.combatants.find((entry) =>
      entry.profile.kind === 'monster' && entry.life === 'living' &&
      engineActionRegistryForEnvironment(hard, OFFER_ENVIRONMENT).actionsFor(entry.profile.id).length > 0);
    const target = actor === undefined ? undefined : hard.combatants.find((entry) =>
      entry.profile.kind === 'player_character' && entry.life === 'living');
    const action = actor === undefined
      ? undefined
      : engineActionRegistryForEnvironment(hard, OFFER_ENVIRONMENT).actionsFor(actor.profile.id)[0];
    if (actor === undefined || target === undefined || action === undefined) {
      throw new Error('Hard-basis reach fixture is incomplete.');
    }
    const actorRef = direct(actor.profile.id);
    const targetRef = direct(target.profile.id);
    const life: ScenarioFactAtom = { kind: 'life_state_is', subject: targetRef, value: target.life };
    const adjacencyResult = evaluateScenarioFact(hard, {
      kind: 'adjacency_is', left: actorRef, right: targetRef, value: true,
    });
    const adjacency: ScenarioFactAtom = {
      kind: 'adjacency_is', left: actorRef, right: targetRef,
      value: adjacencyResult.matches,
    };
    const reachResult = evaluateScenarioFact(hard, {
      kind: 'within_action_reach_is', actor: actorRef, actionId: action.actionId,
      target: targetRef, value: true,
    });
    const reach: ScenarioFactAtom = {
      kind: 'within_action_reach_is', actor: actorRef, actionId: action.actionId,
      target: targetRef, value: reachResult.matches,
    };
    for (const atom of [life, adjacency, reach]) {

exec
/bin/bash -lc "sed -n '375,421p' src/combat/effects.ts; sed -n '1060,1130p' src/vtt/engine-query-port.ts; rg -n 'speedChange:.*set|kind: .set.*speedFeet|speedFeet: 0' tests/unit/vtt tests/unit/combat | head -25; rg -n 'D649' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 exited 1 in 0ms:
      readonly application?: 'every_qualifying_roll' | 'chosen_skill_checks';
    }
  | {
      readonly kind: 'skill_modifier';
      readonly skill: 'stealth';
      readonly amount: number;
    }
  | {
      readonly kind: 'd20_test_modifier';
      readonly tests: readonly ('attack_roll' | 'saving_throw')[];
      readonly count: number;
      readonly sides: number;
      readonly sign: 1 | -1;
      readonly application?: 'every_qualifying_roll';
    }
  | {
      readonly kind: 'movement_modifier';
      readonly speedDeltaFeet: number;
    }
  | {
      readonly kind: 'movement_modifier';
      readonly speedChange: 
        | { readonly kind: 'set'; readonly speedFeet: number }
        | { readonly kind: 'increase'; readonly feet: number }
        | { readonly kind: 'reduce'; readonly reduction: { readonly kind: 'feet'; readonly feet: number } | { readonly kind: 'multiplier'; readonly multiplier: number } };
      readonly modeGrants: readonly {
        readonly mode: 'flying' | 'climbing' | 'swimming';
        readonly speed: { readonly kind: 'fixed'; readonly feet: number } | { readonly kind: 'walking_speed' };
      }[];
      readonly difficultTerrainImmunity: boolean;
      readonly magicalSpeedReductionImmunity: boolean;
    }
  | {
      readonly kind: 'damage_rider';
      readonly damage: DamageRequest;
      readonly appliesTo: 'next_attack_against_target' | 'weapon_attack_by_target';
      readonly gating?: DamageRiderGating;
      readonly consumeOnHit?: boolean;
      readonly followUp?: WeaponHitRiderFollowUp;
      /** Present only on a party/content feature which must first be armed. */
      readonly arming?: {
        readonly durationRounds: number;
        readonly concentration: boolean;
      };
    }
  | {
      readonly kind: 'ensnaring_strike';
function path(state: EncounterState, request: EnginePathRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const searchBudget = request.maximumFeet === undefined
    ? availableBudget
    : Math.min(availableBudget, maximumPathCost(state));
  const result = findPath(encounterMovementWorld(state), {
    actorId: request.actorId,
    start,
    goal: request.destination,
    maximumCost: feet(searchBudget),
  });
  if (result.kind === 'found') {
    return {
      legal: true,
      cells: result.cells,
      costFeet: result.cost,
      budgetFeet: availableBudget,
    };
  }
  if (request.maximumFeet !== undefined && request.maximumFeet < maximumPathCost(state)) {
    const unbounded = findPath(encounterMovementWorld(state), {
      actorId: request.actorId,
      start,
      goal: request.destination,
      maximumCost: feet(maximumPathCost(state)),
    });
    if (unbounded.kind === 'found') return { legal: false, code: 'insufficient_movement' };
  }
  return { legal: false, code: 'destination_unreachable' };
}

function approach(state: EncounterState, request: EngineApproachRequest): EnginePathResult {
  const actor = state.combatants.find((candidate) => candidate.profile.id === request.actorId);
  const start = state.tokens.find((token) => token.combatantId === request.actorId)?.position;
  if (actor === undefined || start === undefined) return { legal: false, code: 'actor_not_placed' };
  const ordinaryBudget = state.activeCombatant === request.actorId
    ? actor.turn.movement.remaining
    : actor.profile.rules.speed;
  const availableBudget = request.maximumFeet ?? (
    request.movement === 'dash'
      ? ordinaryBudget + actor.profile.rules.speed
      : ordinaryBudget
  );
  const originDistance = minimumSpaceDistanceToCells(
    queryCombatantSpaceAt(state, request.actorId, start),
    [request.target],
  );
  const result = findPathToBest(encounterMovementWorld(state), {
    actorId: request.actorId,
    start,
    maximumCost: feet(Math.min(availableBudget, maximumPathCost(state))),
    rank: (cell) => {
      const distance = minimumSpaceDistanceToCells(
        queryCombatantSpaceAt(state, request.actorId, cell),
        [request.target],
      );
      return distance < originDistance ? [distance] : null;
    },
  });
  return result.kind === 'found'
    ? { legal: true, cells: result.cells, costFeet: result.cost, budgetFeet: availableBudget }
tests/unit/combat/spells-level-three.test.ts:55:  { id: 'hypnotic-pattern', source: 'spell-descriptions.txt:4410', targeting: { kind: 'area', rangeFeet: 120, shape: 'cube', baseSizeFeet: 30, sizePerSlotFeet: 0 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'hypnotic_pattern', conditions: ['Charmed', 'Incapacitated'], speedFeet: 0, endsOnDamage: true, wakeAction: true }, { concentration: true, durationRounds: 10 }) } },
tests/unit/vtt/spatial-movement.test.ts:389:      { id: 'set-pace', operation: { kind: 'speed_modification', modification: { kind: 'set', speedFeet: 20 }, ...duration } },

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
const {availableEngineActorOptions,resolveEngineActorOption}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const {enginePlanningSpeedFeet}=require('./src/vtt/engine-query-port.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const B=monsterProfile('B'),P=playerProfile('P');
let s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
s=reduceEncounter(s,{type:'apply_effect',actor:A.id,cost:'none',effect:{targets:[A.id],duration:{kind:'permanent'},concentration:false,stackingIdentity:'effect:review-speed-zero',stacking:'coexist',repeatedSave:null,payload:{kind:'movement_modifier',speedChange:{kind:'set',speedFeet:0},modeGrants:[],difficultTerrainImmunity:false,magicalSpeedReductionImmunity:false}}},()=>0.5).state;
console.log('A speed',enginePlanningSpeedFeet(s,A.id),'turn',s.combatants.find(c=>c.profile.id===A.id).turn.movement);
for(const [name,state] of [['base',s],['plus84',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id),'sightBlocked',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,1).find(o=>o.optionId===p.primaryOptionId)?.label));
 for(const p of result.baselineProposals){const o=availableEngineActorOptions(ps,p.actorId,env,1).find(o=>o.optionId===p.primaryOptionId);if(o){const r=resolveEngineActorOption(ps,o,env);console.log('resolution',p.actorId,JSON.stringify(r));}}
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount,influencers:x.influencingPlayerIds}))));
}
for(const destination of [{column:12,row:4},{column:1,row:0}]){
const moved={...s,tokens:s.tokens.map(t=>t.combatantId===P.id?{...t,position:destination}:t)};
console.log('destination',destination,'visibility',env.queries.visibility(moved,A.id,P.id));
console.log('path',env.queries.path(s,{actorId:P.id,destination,movement:'dash',maximumFeet:60}));
}

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2463ms:
A speed 0 turn { speed: 0, spent: 0, remaining: 0 }
base radius 60 sightBlocked false
baselines [ undefined, undefined ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]
plus84 radius 60 sightBlocked true
baselines [ undefined, undefined ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"reach:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:longbow:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]
destination { column: 12, row: 4 } visibility {
  visible: true,
  reciprocal: true,
  sense: 'normal_sight',
  reason: null
}
path {
  legal: true,
  cells: [
    { column: 2, row: 3 },
    { column: 3, row: 2 },
    { column: 4, row: 1 },
    { column: 5, row: 2 },
    { column: 6, row: 3 },
    { column: 7, row: 4 },
    { column: 8, row: 3 },
    { column: 9, row: 2 },
    { column: 10, row: 2 },
    { column: 11, row: 3 },
    { column: 12, row: 4 }
  ],
  costFeet: 55,
  budgetFeet: 60
}
destination { column: 1, row: 0 } visibility {
  visible: false,
  reciprocal: false,
  sense: 'unknown',
  reason: 'blocked'
}
path {
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
p=pathlib.Path('.tmp-plans/2026-09-17-cohort-01-plan.md').read_text();lines=p.splitlines()
for n in [57,58,59]:
 cmd=lines[n-1];r=subprocess.run(cmd,shell=True,text=True,capture_output=True)
 print('COMMAND',cmd,'\\nSTATUS',r.returncode,'STDOUT',repr(r.stdout),'STDERR',repr(r.stderr))
pattern=re.search(\"-e '(["'^'"']+)'\",lines[56]).group(1)
for ns,under in [('6209','6_209_'),('6210','6_210_'),('6211','6_211_')]:
 print(ns,'plain_matches',sum(bool(re.search(pattern,f'{ns}{i:03}')) for i in range(1000)),'underscore_matches',sum(bool(re.search(pattern,f'{under}{i:03}')) for i in range(1000)),'xxx',bool(re.search(pattern,ns+'xxx')))
paths=[]
for b in re.split(r'(?="'^### Batch )'"',p,flags=re.M)[1:]:
 ps=re.findall(r'"'^- `([''^`]+)`'"',b.split('**Allowed files',1)[1].split('**R',1)[0],re.M);paths+=ps
 print(b.splitlines()[0],len(ps))
print('unique_paths',len(set(paths)),'existing',sum(pathlib.Path(x).exists() for x in set(paths)))
PY" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
COMMAND rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md 
STATUS 0 STDOUT '23048:6209xxx\n23048:6210xxx\n23048:6211xxx\n23061:6209xxx\n23061:6210xxx\n23061:6211xxx\n23071:6209xxx\n23071:6_209_001\n' STDERR ''
COMMAND rg -n -o -e '6209[0-9]{3}|6210[0-9]{3}|6211[0-9]{3}|6_209_[0-9]{3}|6_210_[0-9]{3}|6_211_[0-9]{3}|6209xxx|6210xxx|6211xxx' tests/fixtures tools 
STATUS 1 STDOUT '' STDERR ''
COMMAND rg -n -o -e '\b6209\b|\b6210\b|\b6211\b' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md 
STATUS 0 STDOUT '23068:6209\n23068:6210\n23068:6211\n' STDERR ''
6209 plain_matches 1000 underscore_matches 1000 xxx True
6210 plain_matches 1000 underscore_matches 1000 xxx True
6211 plain_matches 1000 underscore_matches 1000 xxx True
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
unique_paths 52 existing 18

exec
/bin/bash -lc "sed -n '260,320p' src/vtt/speculative-planning.ts && sed -n '1,105p' src/vtt/monster-planning-state.ts && rg -n 'speedChange|movement.remaining|planningState' src/vtt/offers/offer-declarations.ts src/vtt/offers/*.ts src/vtt/intent-resolver.ts | head -65" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
export function scenarioFactsAreComplements(
  left: ScenarioFactAtom,
  right: ScenarioFactAtom,
): boolean {
  if (scenarioFactKey(left) !== scenarioFactKey(right) || left.kind !== right.kind) return false;
  if (left.kind === 'life_state_is' && right.kind === 'life_state_is') return left.value !== right.value;
  try {
    return canonicalJson(complementScenarioFact(left)) === canonicalJson(right);
  } catch {
    return false;
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

function hpThreshold(current: number, maximum: number): HpThresholdPercent {
  if (current * 100 <= maximum * 25) return 25;
  if (current * 100 <= maximum * 50) return 50;
  if (current * 100 <= maximum * 75) return 75;
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
const {availableEngineActorOptions,resolveEngineActorOption}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const {enginePlanningSpeedFeet}=require('./src/vtt/engine-query-port.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const A=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const B=monsterProfile('B'),P=playerProfile('P');
let s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
s=reduceEncounter(s,{type:'apply_effect',actor:A.id,cost:'none',effect:{targets:[A.id],duration:{kind:'permanent'},concentration:false,stackingIdentity:'effect:review-speed-zero',stacking:'coexist',repeatedSave:null,payload:{kind:'movement_modifier',speedChange:{kind:'set',speedFeet:0},modeGrants:[],difficultTerrainImmunity:false,magicalSpeedReductionImmunity:false}}},()=>0.5).state;
console.log('active',s.activeCombatant); console.log('A speed',enginePlanningSpeedFeet(s,A.id),'turn',s.combatants.find(c=>c.profile.id===A.id).turn.movement);
for(const [name,state] of [['base',s],['plus84',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id),'sightBlocked',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,p.expectedRevision).find(o=>o.optionId===p.primaryOptionId)?.label));
 for(const p of result.baselineProposals){const o=availableEngineActorOptions(ps,p.actorId,env,p.expectedRevision).find(o=>o.optionId===p.primaryOptionId);if(o){const r=resolveEngineActorOption(ps,o,env);console.log('resolution',p.actorId,JSON.stringify(r));}}
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount,influencers:x.influencingPlayerIds}))));
}
for(const destination of [{column:12,row:4},{column:1,row:0}]){
const moved={...s,tokens:s.tokens.map(t=>t.combatantId===P.id?{...t,position:destination}:t)};
console.log('destination',destination,'visibility',env.queries.visibility(moved,A.id,P.id));
console.log('path',env.queries.path(s,{actorId:P.id,destination,movement:'dash',maximumFeet:60}));
}

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2464ms:
active combatant:A
A speed 0 turn { speed: 0, spent: 0, remaining: 0 }
base radius 60 sightBlocked false
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
resolution combatant:A {"valid":true,"mechanics":{"actorId":"combatant:A","optionId":"option:2:d65f3bbde95061b152843903d96160bbef4ff962f602bb8c","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":4},"actionSlots":[{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true},{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true}],"omittedRiders":[]}}
resolution combatant:B {"valid":true,"mechanics":{"actorId":"combatant:B","optionId":"option:2:8308446cb31b63182be3d17825e5fc8877eb7bed51ee3f4f","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":6},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]
plus84 radius 60 sightBlocked true
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
resolution combatant:A {"valid":true,"mechanics":{"actorId":"combatant:A","optionId":"option:2:d65f3bbde95061b152843903d96160bbef4ff962f602bb8c","movementCostFeet":25,"path":[{"column":12,"row":3},{"column":11,"row":2},{"column":10,"row":1},{"column":9,"row":2},{"column":8,"row":3}],"finalPosition":{"column":8,"row":3},"actionSlots":[{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true},{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true}],"omittedRiders":[]}}
resolution combatant:B {"valid":true,"mechanics":{"actorId":"combatant:B","optionId":"option:2:8308446cb31b63182be3d17825e5fc8877eb7bed51ee3f4f","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":6},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"reach:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:longbow:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]
destination { column: 12, row: 4 } visibility {
  visible: true,
  reciprocal: true,
  sense: 'normal_sight',
  reason: null
}
path {
  legal: true,
  cells: [
    { column: 2, row: 3 },
    { column: 3, row: 2 },
    { column: 4, row: 1 },
    { column: 5, row: 2 },
    { column: 6, row: 3 },
    { column: 7, row: 4 },
    { column: 8, row: 3 },
    { column: 9, row: 2 },
    { column: 10, row: 2 },
    { column: 11, row: 3 },
    { column: 12, row: 4 }
  ],
  costFeet: 55,
  budgetFeet: 60
}
destination { column: 1, row: 0 } visibility {
  visible: false,
  reciprocal: false,
  sense: 'unknown',
  reason: 'blocked'
}
path {
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
/bin/bash -lc "sed -n '300,375p' src/vtt/intent-resolver.ts && rg -n 'maximumFeet:.*speed|remaining|maximumFeet' src/vtt/offers/offer-declarations.ts | head -40 && rg -n 'export function availableEngineActorOptions|function availableEngineActorOptions' src/vtt/intent-resolver.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
}

interface MovementResolution {
  readonly costFeet: number;
  readonly path: readonly GridCell[];
  readonly finalPosition: GridCell;
}

function movementResolution(
  state: EncounterState,
  actorId: CombatantId,
  movement: EngineMovementObjective,
  slots: readonly EngineActionSlotUse[],
  queries: EngineQueryPort,
): MovementResolution | null {
  const origin = queries.tokenPosition(state, actorId);
  const actor = queries.combatant(state, actorId);
  const constraints = targetConstraints(state, actorId, slots, queries);
  if (origin === null || actor === null || constraints === null) return null;
  const anchor = movement.engagement.anchor;
  const productiveClose = constraints.length === 0 &&
    movement.engagement.stance === 'close_to_melee' && anchor !== undefined && anchor !== null;
  if (!productiveClose && positionFits(state, actorId, origin, constraints, movement, queries)) {
    return { costFeet: 0, path: [], finalPosition: origin };
  }
  if (movement.preference.willingness === 'none') return null;
  const maximumFeet = movement.preference.maximumFeet ?? actor.profile.rules.speed;
  const movementKind = slots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dash') ? 'dash' : 'normal';
  if (productiveClose) {
    const anchorId = resolveSelector(state, actorId, anchor, queries);
    if (anchorId === null || queries.tokenPosition(state, anchorId) === null) return null;
    const anchorPosition = minimumSpaceLine(
      combatantSpace(state, actorId),
      combatantSpace(state, anchorId),
    ).targetCell;
    const approach = queries.approach(state, {
      actorId,
      target: anchorPosition,
      movement: movementKind,
      maximumFeet,
    });
    if (!approach.legal) return null;
    return {
      costFeet: approach.costFeet,
      path: approach.cells,
      finalPosition: approach.cells.at(-1) ?? origin,
    };
  }
  const candidateCells: { readonly lowerBoundFeet: number; readonly finalPosition: GridCell }[] = [];
  for (let row = 0; row < state.bounds.rows; row += 1) {
    for (let column = 0; column < state.bounds.columns; column += 1) {
      const finalPosition = { column, row };
      if (!positionFits(state, actorId, finalPosition, constraints, movement, queries)) continue;
      const lowerBoundFeet = gridDistance(origin, finalPosition);
      if (lowerBoundFeet <= maximumFeet) candidateCells.push({ lowerBoundFeet, finalPosition });
    }
  }
  candidateCells.sort((left, right) => left.lowerBoundFeet - right.lowerBoundFeet ||
    left.finalPosition.row - right.finalPosition.row || left.finalPosition.column - right.finalPosition.column);
  let best: { readonly costFeet: number; readonly path: readonly GridCell[]; readonly finalPosition: GridCell } | null = null;
  for (const candidate of candidateCells) {
    if (best !== null && candidate.lowerBoundFeet > best.costFeet) break;
    const result = queries.path(state, {
      actorId,
      destination: candidate.finalPosition,
      movement: movementKind,
      maximumFeet,
    });
    if (!result.legal) continue;
    const resolved = { costFeet: result.costFeet, path: result.cells, finalPosition: candidate.finalPosition };
    if (best === null || resolved.costFeet < best.costFeet ||
      resolved.costFeet === best.costFeet && (resolved.finalPosition.row < best.finalPosition.row ||
        resolved.finalPosition.row === best.finalPosition.row && resolved.finalPosition.column < best.finalPosition.column)) {
      best = resolved;
    }
  }
53:  preference: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
376:    const remaining = poolId === null
378:      : subject?.limitedResources?.find((pool) => pool.id === poolId)?.remaining ?? 0;
379:    if (remaining !== null && remaining < 1) return [];
389:      label: `${action.id}/${spell.id}${maximum === null ? '' : ` (${String(remaining)}/${String(maximum)})`}${selection.labelSuffix}`,
398:      resourceCostLabels: poolId === null ? [] : [`${String(poolId)}:${String(remaining)}/${String(maximum)}`],
431:            preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
450:              preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
465:      preference: { willingness: 'only_if_required' as const, maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' as const },
501:        preference: { willingness: 'freely', maximumFeet: subject.profile.rules.speed * 2, opportunityRisk: 'avoid' },
545:        const remaining = subject.limitedResources?.find((pool) =>
546:          pool.id === monsterSpellResourcePoolId(action.id, action.spells[0] as (typeof action.spells)[number]))?.remaining ?? action.uses;
547:        if (remaining < 1 || action.spells.length !== 2 ||
552:        const resourceCostLabels = [`${String(monsterSpellResourcePoolId(action.id, action.spells[0] as (typeof action.spells)[number]))}:${String(remaining)}/${String(action.uses)}`];
554:          label: `${action.name}/Cure Wounds (${String(remaining)}/${String(action.uses)})`,
562:          label: `${action.name} [Lesser Restoration condition: ${condition}] (${String(remaining)}/${String(action.uses)})`,
593:      maximumFeet: (movement.preference.maximumFeet ?? speed) + speed,
635:export function availableEngineActorOptions(

codex
The namespace commands reproduce the recorded output, and the revised patterns cover all 1,000 seeds in each namespace in both numeric forms. The ten-namespace ledger and Dash-only productivity fixes are also explicit.

The integration probe found one remaining issue: the speed-set effect makes A’s effective speed and remaining movement zero, but attack offers still use its declared profile speed. I’m testing a fixture-only amendment that also sets A’s declared speed to zero.

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
const {availableEngineActorOptions,resolveEngineActorOption}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const {enginePlanningSpeedFeet}=require('./src/vtt/engine-query-port.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const scoutProfile=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const A={...scoutProfile,rules:{...scoutProfile.rules,speed:0}};
const B=monsterProfile('B'),P=playerProfile('P');
let s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
s=reduceEncounter(s,{type:'apply_effect',actor:A.id,cost:'none',effect:{targets:[A.id],duration:{kind:'permanent'},concentration:false,stackingIdentity:'effect:review-speed-zero',stacking:'coexist',repeatedSave:null,payload:{kind:'movement_modifier',speedChange:{kind:'set',speedFeet:0},modeGrants:[],difficultTerrainImmunity:false,magicalSpeedReductionImmunity:false}}},()=>0.5).state;
console.log('active',s.activeCombatant); console.log('A speed',enginePlanningSpeedFeet(s,A.id),'turn',s.combatants.find(c=>c.profile.id===A.id).turn.movement);
for(const [name,state] of [['base',s],['plus84',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id),'sightBlocked',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,p.expectedRevision).find(o=>o.optionId===p.primaryOptionId)?.label));
 for(const p of result.baselineProposals){const o=availableEngineActorOptions(ps,p.actorId,env,p.expectedRevision).find(o=>o.optionId===p.primaryOptionId);if(o){const r=resolveEngineActorOption(ps,o,env);console.log('resolution',p.actorId,JSON.stringify(r));}}
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount,influencers:x.influencingPlayerIds}))));
}
for(const destination of [{column:12,row:4},{column:1,row:0}]){
const moved={...s,tokens:s.tokens.map(t=>t.combatantId===P.id?{...t,position:destination}:t)};
console.log('destination',destination,'visibility',env.queries.visibility(moved,A.id,P.id));
console.log('path',env.queries.path(s,{actorId:P.id,destination,movement:'dash',maximumFeet:60}));
}

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 2399ms:
active combatant:A
A speed 0 turn { speed: 0, spent: 0, remaining: 0 }
base radius 60 sightBlocked false
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
resolution combatant:A {"valid":true,"mechanics":{"actorId":"combatant:A","optionId":"option:2:d489f2768337a4a38dbfba557468d27c5eff11d46364164b","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":4},"actionSlots":[{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true},{"slot":"main","kind":"attack","actionId":"longbow","spellId":null,"targetIds":["combatant:P"],"objectId":null,"omittedRiders":[],"multiattackComponent":true}],"omittedRiders":[]}}
resolution combatant:B {"valid":true,"mechanics":{"actorId":"combatant:B","optionId":"option:2:8308446cb31b63182be3d17825e5fc8877eb7bed51ee3f4f","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":6},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]
plus84 radius 60 sightBlocked true
baselines [ 'Dodge', 'Dodge' ]
resolution combatant:A {"valid":true,"mechanics":{"actorId":"combatant:A","optionId":"option:2:f4833a29a2c853968d8e9210d755591141c765a6bbe709cd","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":4},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
resolution combatant:B {"valid":true,"mechanics":{"actorId":"combatant:B","optionId":"option:2:8308446cb31b63182be3d17825e5fc8877eb7bed51ee3f4f","movementCostFeet":0,"path":[],"finalPosition":{"column":13,"row":6},"actionSlots":[{"slot":"main","kind":"dodge","actionId":"dodge","spellId":null,"targetIds":[],"objectId":null,"omittedRiders":[]}],"omittedRiders":[]}}
menu []
destination { column: 12, row: 4 } visibility {
  visible: true,
  reciprocal: true,
  sense: 'normal_sight',
  reason: null
}
path {
  legal: true,
  cells: [
    { column: 2, row: 3 },
    { column: 3, row: 2 },
    { column: 4, row: 1 },
    { column: 5, row: 2 },
    { column: 6, row: 3 },
    { column: 7, row: 4 },
    { column: 8, row: 3 },
    { column: 9, row: 2 },
    { column: 10, row: 2 },
    { column: 11, row: 3 },
    { column: 12, row: 4 }
  ],
  costFeet: 55,
  budgetFeet: 60
}
destination { column: 1, row: 0 } visibility {
  visible: false,
  reciprocal: false,
  sense: 'unknown',
  reason: 'blocked'
}
path {
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
/bin/bash -lc "rg -n 'readonly speed:|speed:' src/combat/combatant.ts | head -15 && sed -n '1,95p' src/combat/combatant.ts && sed -n '415,436p' src/vtt/offers/offer-declarations.ts && sed -n '590,609p' src/vtt/engine-query-port.ts && git status --porcelain" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
48:  readonly speed: Feet;
209:      speed: feet(sheet.walking_speed.value),
274:      speed: statblock.speed,
import { abilities, creatureSizes, skills, type Ability, type KnownCreatureSize, type Skill } from '../domain/enums';
import type { CharacterSheet } from '../queries/character-sheet-builder';
import type { CombatFeatureEffect } from './effects';
import type { GridCell } from './grid';
import {
  normalPlacementFor,
  serializedPlacementMode,
  sizedCombatantState,
  type SerializedPlacementMode,
} from './creature-space';
import type { DamageResponse } from './resolution';
import {
  monsterSpellMaximumUses,
  monsterSpellResourcePoolId,
  type CombatSense,
  type MonsterLegendaryAction,
  type MonsterBonusAction,
  type MonsterSpellcastingAction,
  type MonsterStatblock,
} from './statblock';
import type { WildShapeCharacterSheet } from './wild-shape';
import {
  armorClass,
  combatantId,
  damageType,
  feet,
  tokenId,
  type ArmorClass,
  type CombatantId,
  type DamageType,
  type Feet,
  type LimitedResourcePoolId,
  type StatblockId,
  type TokenId,
} from './values';

export class CharacterCombatantProjectionError extends Error {
  override readonly name = 'CharacterCombatantProjectionError' as const;

  constructor(readonly field: string) {
    super(`Character sheet ${field} must be known before combat begins.`);
  }
}

export interface CombatRulesProfile {
  readonly armorClass: ArmorClass;
  readonly hitPointMaximum: number;
  readonly speed: Feet;
  readonly initiativeBonus: number;
  /** Present when the source exposes scores rather than modifiers alone. */
  readonly abilityScores?: Readonly<Record<Ability, number>>;
  /** Present when the source exposes the bonus separately from final modifiers. */
  readonly proficiencyBonus?: number;
  readonly savingThrowBonuses: Readonly<Record<Ability, number>>;
  readonly attacksPerAction: number;
  readonly reach: Feet;
  readonly damageResponses: readonly {
    readonly type: DamageType;
    readonly response: DamageResponse;
  }[];
  readonly conditionImmunities: readonly string[];
  readonly usesDeathSaves: boolean;
  readonly senses: readonly CombatSense[];
  /** 10 + Wisdom (Perception), including proficiency when sourced. */
  readonly passivePerception: number;
  readonly detectionTraits: readonly ('web_sense' | 'keen_sight' | 'flyby')[];
  /** Tremorsense requires both participants to contact the same surface or liquid. */
  readonly contactMedium: 'surface' | 'liquid' | 'air';
  /** Absence means the source did not establish a mechanical size category. */
  readonly sizeCategory?: KnownCreatureSize;
  /** Known SRD creature types and homebrew passthrough values share this sourced field. */
  readonly creatureType?: string;
  /** Reducer-owned expendable spell slots; absent levels are unavailable. */
  readonly spellSlots: readonly SpellSlotCapacity[];
  /** Reducer-owned class/feat pools; spell slots remain a separate resource type. */
  readonly limitedResources?: readonly LimitedResourceCapacity[];
  readonly featureEffects?: readonly CombatFeatureEffect[];
  readonly skillBonuses?: Readonly<Partial<Record<Skill, number>>>;
  readonly legendary?: {
    readonly actionUsesMaximum: number;
    readonly actions: readonly MonsterLegendaryAction[];
    readonly resistanceUsesMaximum: number;
  };
  readonly magicResistance?: true;
}

export interface LimitedResourceCapacity {
  readonly id: LimitedResourcePoolId;
  readonly maximum: number;
  readonly recharge: 'short_rest' | 'long_rest';
}

export type SpellSlotLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

export interface SpellSlotCapacity {
function mainUses(state: EncounterState, actorId: CombatantId): readonly MainUseOption[] {
  const subject = state.combatants.find((candidate) => candidate.profile.id === actorId);
  if (subject?.profile.kind !== 'monster' || subject.life !== 'living' || subject.turn.action.kind !== 'available') {
    return [];
  }
  const actions = monsterActions(state, actorId);
  const enemies = livingEnemies(state, actorId);
  const multiattacks = actions.filter(
    (action): action is MonsterMultiattackAction => action.kind === 'multiattack',
  );
  const attacks = multiattacks.length === 0
    ? actions.filter((action): action is MonsterAttackAction => action.kind === 'attack').flatMap((action) =>
        enemies.map((enemy): MainUseOption => ({
          label: `${action.name} -> ${enemy}`,
          use: { kind: 'attack', actionId: engineActionId(action.id), target: target(enemy) },
          movement: {
            preference: { willingness: 'only_if_required', maximumFeet: subject.profile.rules.speed, opportunityRisk: 'avoid' },
            engagement: { stance: action.delivery.kind === 'melee' ? 'close_to_melee' : 'maintain_range', anchor: target(enemy) },
          },
          resourceCostLabels: [],
          omittedRiders: omittedRidersForStandaloneAction(action),
        })))
  }
  return conditions;
}

/** Canonical query-only movement speed, including active typed modifiers. */
export function enginePlanningSpeedFeet(
  state: EncounterState,
  subjectId: CombatantId,
): number {
  const subject = combatant(state, subjectId);
  if (subject === null) return 0;
  const penalty = conditionSpeedPenaltyFeet(enginePlanningConditions(state, subjectId));
  if (penalty === Number.NEGATIVE_INFINITY) return 0;
  const modifiers = state.effects.flatMap((effect) =>
    effect.targets.includes(subjectId) && effect.payload.kind === 'movement_modifier'
      ? [effect.payload]
      : []);
  const immuneToReduction = modifiers.some((payload) =>
    'magicalSpeedReductionImmunity' in payload && payload.magicalSpeedReductionImmunity);
  const speeds = new Map<'walking' | 'flying' | 'climbing' | 'swimming', number>([

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
const {availableEngineActorOptions,resolveEngineActorOption}=require('./src/vtt/intent-resolver.ts');
const {freshMonsterPlanningState,projectFutureMonsterTurns}=require('./src/vtt/monster-planning-state.ts');
const {traceCombatantLine}=require('./src/combat/cover.ts');
const {enginePlanningSpeedFeet}=require('./src/vtt/engine-query-port.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const scoutProfile=monsterCombatantProfile(SCOUT,{combatantId:'combatant:A',tokenId:'token:A'});
const A={...scoutProfile,rules:{...scoutProfile.rules,speed:require('./src/combat/values.ts').feet(0)}};
const B=monsterProfile('B'),P=playerProfile('P');
let s=freshMonsterPlanningState({...reduceEncounter(createEncounter({bounds:{columns:15,rows:8},combatants:[A,B,P],tokens:[placedToken(A,13,4),placedToken(B,13,6),placedToken(P,1,4)],blockedCells:[0,1,2,3].map(row=>({column:7,row})).concat([5,6,7].map(row=>({column:8,row})))}),{type:'roll_initiative'},()=>0.5).state,activeCombatant:A.id});
s=reduceEncounter(s,{type:'apply_effect',actor:A.id,cost:'none',effect:{targets:[A.id],duration:{kind:'permanent'},concentration:false,stackingIdentity:'effect:review-speed-zero',stacking:'coexist',repeatedSave:null,payload:{kind:'movement_modifier',speedChange:{kind:'set',speedFeet:0},modeGrants:[],difficultTerrainImmunity:false,magicalSpeedReductionImmunity:false}}},()=>0.5).state;
console.log('active',s.activeCombatant); console.log('A speed',enginePlanningSpeedFeet(s,A.id),'turn',s.combatants.find(c=>c.profile.id===A.id).turn.movement);
for(const [name,state] of [['base',s],['plus84',{...s,blockedCells:[...s.blockedCells,{column:8,row:4}]}]]){
 const result=sp.buildHostScenarioMenu(state,[A.id,B.id],[P.id],env),ps=projectFutureMonsterTurns(state,[A.id,B.id]);
 console.log(name,'radius',sp.maximumInfluenceRadiusFeet(state,P.id),'sightBlocked',traceCombatantLine(state,A.id,P.id).blocksSight);
 console.log('baselines',result.baselineProposals.map(p=>availableEngineActorOptions(ps,p.actorId,env,p.expectedRevision).find(o=>o.optionId===p.primaryOptionId)?.label));
 console.log('menu',JSON.stringify(result.scenarioMenu.map(x=>({key:x.factKey,score:x.volatilityScore,refs:x.referencedProposalCount,influencers:x.influencingPlayerIds}))));
}

JS" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
exec
/bin/bash -lc "sed -n '260,292p' tools/d569-second-family-manifest.ts && sed -n '388,430p' tools/d569-second-family-manifest.ts && git diff --exit-code && sha256sum src/vtt/blind-turn-context.ts" in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
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
b714e30c02d7fcf33fd753b86e7e1b096f489b41f0672cd738f69d5e9f4f8fab  src/vtt/blind-turn-context.ts

 succeeded in 2439ms:
active combatant:A
A speed 0 turn { speed: 0, spent: 0, remaining: 0 }
base radius 60 sightBlocked false
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]
plus84 radius 60 sightBlocked false
baselines [ 'Longbow + Longbow -> combatant:P', 'Dodge' ]
menu [{"key":"adjacency:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]},{"key":"visibility:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:A\",\"kind\":\"combatant\"}}:{\"actorId\":\"combatant:A\",\"selector\":{\"combatantId\":\"combatant:P\",\"kind\":\"combatant\"}}","score":60,"refs":1,"influencers":["combatant:P"]}]

exec
/bin/bash -lc 'git rev-parse HEAD && git status --porcelain && git diff --exit-code && sha256sum .tmp-plans/2026-09-17-cohort-01-plan.md && wc -l .tmp-plans/2026-09-17-cohort-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-seam-verify
 succeeded in 0ms:
e86a4d2620f58f75c3d54161ffb446341a7cfa1d
b6b4b6c09d1e1643df7d30e0b70bc9c6ca4f746750ff373e3e51b31a2a4b796d  .tmp-plans/2026-09-17-cohort-01-plan.md
395 .tmp-plans/2026-09-17-cohort-01-plan.md

codex
**PLAN-F3 — P2, resolved by the binding amendment below — lines 304–318.**

The typed speed-set effect alone does **not** prevent A’s escape. The real planner still offers a **25-foot move to `(8,3)` followed by Longbow**, despite effective speed and remaining movement both being zero. Attack declarations use `subject.profile.rules.speed` for their movement allowance (`offer-declarations.ts:431–465`).

I verified a bounded fixture correction: also set the hand-authored A profile’s `rules.speed` to `feet(0)` before creating the encounter.

With that correction, the real planner plus an **in-memory reference implementation of D642** produces:

| Scene | Baselines | Menu |
|---|---|---|
| Base | Longbow ×2, Dodge | Exact adjacency and visibility keys; scores **60, 60** |
| Add `(8,4)` | Dodge, Dodge | **`[]`** |

The selector keys match `DA`/`TAP`. P’s paths cost **55 feet** to `(12,4)` and **20 feet** to `(1,0)`. Removing corner sealing restores the Longbow and two-entry menu, so the mutation witness distinguishes the behavior. These probes do not replace verification against accepted WALL-01.

The other findings are closed:

- **PLAN-F2 — lines 50–73:** ran all three commands verbatim; outputs match the recorded evidence, with statuses **0/1/0**. Each namespace matches **1,000/1,000** plain seeds, **1,000/1,000** underscore-form seeds, and its `xxx` representation.
- **PLAN-F5 — lines 217–246:** the complete ten-namespace union, narrowly scoped own-cohort exceptions, remove-any-row tests, and 6204 mutant are explicit.
- **PLAN-F6 — lines 115–138:** positive movement remains productive; the Dash-only witness and movement-arm mutant protect it. Targeted offensive components receive the sight/cover checks.
- **PLAN-F1/F4:** remain closed. Counts remain **3/3/10/10/10/8/4/4/3/1**, totaling **52 paths: 18 existing + 34 new**.

No additional blocking findings emerged.

Verified checkout **e86a4d2620f58f75c3d54161ffb446341a7cfa1d**, plan SHA-256 **b6b4b6c09d1e1643df7d30e0b70bc9c6ca4f746750ff373e3e51b31a2a4b796d**, and **395 lines**. Final status was clean; all probe modifications remained in memory.

**VERDICT: ACCEPT WITH AMENDMENT (Append this binding note: “Batch 9 must construct the hand-authored Scout A with `profile.rules.speed: feet(0)` before encounter creation, retain the typed zero-speed effect, and assert both declared and effective speed are zero. Preserve the exact base and mutated labels, selector keys, scores, and menus at lines 310–319. Require restoring A’s declared speed to 30 while retaining the effect, and separately disabling corner sealing, to fail the mutation expectations. Reverify against accepted WALL-01 before implementation acceptance. This correction is confined to the allowed speculative-planning test file; no production movement change is authorized.”)**

REVIEW DONE
tokens used
248,708
**PLAN-F3 — P2, resolved by the binding amendment below — lines 304–318.**

The typed speed-set effect alone does **not** prevent A’s escape. The real planner still offers a **25-foot move to `(8,3)` followed by Longbow**, despite effective speed and remaining movement both being zero. Attack declarations use `subject.profile.rules.speed` for their movement allowance (`offer-declarations.ts:431–465`).

I verified a bounded fixture correction: also set the hand-authored A profile’s `rules.speed` to `feet(0)` before creating the encounter.

With that correction, the real planner plus an **in-memory reference implementation of D642** produces:

| Scene | Baselines | Menu |
|---|---|---|
| Base | Longbow ×2, Dodge | Exact adjacency and visibility keys; scores **60, 60** |
| Add `(8,4)` | Dodge, Dodge | **`[]`** |

The selector keys match `DA`/`TAP`. P’s paths cost **55 feet** to `(12,4)` and **20 feet** to `(1,0)`. Removing corner sealing restores the Longbow and two-entry menu, so the mutation witness distinguishes the behavior. These probes do not replace verification against accepted WALL-01.

The other findings are closed:

- **PLAN-F2 — lines 50–73:** ran all three commands verbatim; outputs match the recorded evidence, with statuses **0/1/0**. Each namespace matches **1,000/1,000** plain seeds, **1,000/1,000** underscore-form seeds, and its `xxx` representation.
- **PLAN-F5 — lines 217–246:** the complete ten-namespace union, narrowly scoped own-cohort exceptions, remove-any-row tests, and 6204 mutant are explicit.
- **PLAN-F6 — lines 115–138:** positive movement remains productive; the Dash-only witness and movement-arm mutant protect it. Targeted offensive components receive the sight/cover checks.
- **PLAN-F1/F4:** remain closed. Counts remain **3/3/10/10/10/8/4/4/3/1**, totaling **52 paths: 18 existing + 34 new**.

No additional blocking findings emerged.

Verified checkout **e86a4d2620f58f75c3d54161ffb446341a7cfa1d**, plan SHA-256 **b6b4b6c09d1e1643df7d30e0b70bc9c6ca4f746750ff373e3e51b31a2a4b796d**, and **395 lines**. Final status was clean; all probe modifications remained in memory.

**VERDICT: ACCEPT WITH AMENDMENT (Append this binding note: “Batch 9 must construct the hand-authored Scout A with `profile.rules.speed: feet(0)` before encounter creation, retain the typed zero-speed effect, and assert both declared and effective speed are zero. Preserve the exact base and mutated labels, selector keys, scores, and menus at lines 310–319. Require restoring A’s declared speed to 30 while retaining the effect, and separately disabling corner sealing, to fail the mutation expectations. Reverify against accepted WALL-01 before implementation acceptance. This correction is confined to the allowed speculative-planning test file; no production movement change is authorized.”)**

REVIEW DONE
