
OpenAI Codex v0.154.0
--------
workdir: /home/vagrant/PhpstormProjects/dnd-wt-blind-01
model: gpt-6-astra
provider: openai
approval: never
sandbox: read-only
reasoning effort: high
reasoning summaries: none
session id: 01a0b492-a268-71e1-a5b4-462354754f60
--------
user
RULES (binding, restated): You are the PLAN REVIEWER (gpt-6-astra, HIGH, RESUMED — you reviewed BLIND-01 plan r1). Worktree /home/vagrant/PhpstormProjects/dnd-wt-blind-01 — claude/blind-01 at b94dd732. Read-only sandbox; no edits, no git writes, no claude / other agents / consensus skills; no full vitest / Playwright / build; never port 4173. Readable: the plan .tmp-plans/2026-09-18-blind-01-plan.md = r2 (sha256 7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce, 445 lines — verify), the MAIN repo's .claude/decisions.md (D664–D667). Model calls WILL fail. Report exact commands and numbers; end with the named marker.

TASK: re-review r2 against your r1 findings: F1 (the search-memory producer repair — never-observed Hide manufactures no cue; unseen movement does not refresh coordinates — with RED tests in an early batch, before any consumer), F2 (complete consumer/schema manifests incl. plan-materiality.ts and blind-dm-contract.ts; witnesses placed with their implementation; COHORT prerequisites vs new files against a named revision; type expansion compiles batch by batch — re-run your in-memory expansion), F3 (productivity amendment lands with the core; the Goblin Boss stationary-posture case), F4 (the "open approaches" definition — re-derive the 9×5 oracle and check the open-room / multi-opening / wide-opening / door cases the plan now specifies), F5 (canonical remaining-movement budget; no bonus-Dash expansion), F6 (43/43 hashes + 43/43 pre/post fresh generations; runtime-only dependency assertion), F7 (D583 expected set derived from the base + prerequisites + new files — recompute), F8 (map-only selection witnesses: the unseen-PC relocation control, the direction-leak mutant, competing multi-approach profiles, ties, empty approaches, the Large-creature/footprint policy — verify they distinguish what they claim, in memory), F9 (offer vs resolution identity). Re-run the plan's scoring in memory on 6209001's Bear/Eagle/Ghast and the Goblin Boss and confirm the plan's stated destinations/costs. One last sweep for anything r1 missed. If a P2 remains, state the exact supervisor amendment text that lets implementation proceed. OUTPUT: PLAN-Fn findings; "VERDICT: ACCEPT" / "ACCEPT WITH AMENDMENT (text)" / "REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll verify r2’s hash and line count, check each r1 finding against the amendments, and rerun the in-memory type, inventory, and planner probes. I’ll also check whether the new witnesses distinguish the failure modes they claim to catch.

exec
/bin/bash -lc 'git branch --show-current && git rev-parse HEAD && sha256sum .tmp-plans/2026-09-18-blind-01-plan.md && wc -l .tmp-plans/2026-09-18-blind-01-plan.md && nl -ba .tmp-plans/2026-09-18-blind-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
claude/blind-01
b94dd73221697e3d03da8991746726563777fa74
7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce  .tmp-plans/2026-09-18-blind-01-plan.md
445 .tmp-plans/2026-09-18-blind-01-plan.md
     1	# BLIND-01 implementation plan r2
     2	
     3	Date: 2026-09-18  
     4	Planning base: `/home/vagrant/PhpstormProjects/dnd-wt-blind-01`, branch
     5	`claude/blind-01`, commit `b94dd73221697e3d03da8991746726563777fa74`.  
     6	Integration prerequisite: `claude/cohort-01` at `bea24cbe` supplies
     7	`tests/unit/vtt/arena-basis-brutal-v2.test.ts`; no v6 test exists there.  
     8	Authority: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md`
     9	D420, D476, D545, D617, D625, D632, D636.6, D641-D643, D662-D666. Review addressed:
    10	`/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/blind-01/review-plan-blind-01-astra-r1.md`.
    11	All other paths are relative to the BLIND-01 worktree.
    12	
    13	## 1. Result, invariants, and landing order
    14	
    15	Implement D664: a monster that perceives an enemy keeps normal offers; with no perceived enemy but
    16	an actor-known directional indication it advances/searches using existing `move_and_search`; with no
    17	indication it moves within its canonical available movement to the best topology-only cover against
    18	the room's open approaches and Dodges. If origin is already a best reachable destination, it Dodges
    19	in place. Both moving and stationary blind postures are productive.
    20	
    21	Hard invariants:
    22	
    23	- `projectActorKnowledge` remains the single knowledge producer (D625). Offer code never reads
    24	  tokens, `observationHistory`, or `searchMemories` independently, and invents no cue from unseen
    25	  positions (D476/D545).
    26	- The resolver uses only injected `environment.queries`; it cannot import/construct another query
    27	  port, movement world, terrain helper, or cover tracer (D617.5).
    28	- No fixture byte changes and no changed-code output becomes an expectation. Changed behavioral
    29	  pins require the hand proofs in section 7; unchanged fields may come from the pre-change tree.
    30	- No full Vitest, Playwright, build, browser server, or port 4173.
    31	
    32	Landing order:
    33	
    34	1. Land B0-B6 on `b94dd732`; B0 repairs the unsafe memory producer before anything consumes memory.
    35	2. Merge that accepted core into `claude/vis-field`, then rebase/merge it into
    36	   `claude/cohort-01@bea24cbe` before COHORT-01 Batch 3. The shared productivity helper and stationary
    37	   witness are already in core B4, so COHORT's gate cannot run under the old predicate.
    38	3. On that named prerequisite revision plus core, apply B7 to the supplied v2 file. BLIND-01 does
    39	   not create or edit `tests/unit/tools/d569-v6.test.ts`; COHORT Batch 6 creates v6 later and must
    40	   import the already-landed shared predicate. D569 v1/v5 remain frozen.
    41	4. `src/vtt/intent-resolver.ts`, `src/vtt/turn-proposal.ts`, and
    42	   `src/vtt/engine-query-port.ts` are in ELEVATION-02's 221-path D636.6 manifest and the D584
    43	   inventory. Supervisor record: `BLIND-01 landed first; ELEVATION_BASE_REV includes BLIND-01;
    44	   ELEVATION-02 rebased and retained pursue_indication, seek_cover, Search, and seekCover; both
    45	   ownership overlays rerun.` A conflict may not silently discard this unit.
    46	
    47	## 2. Repair and define actor knowledge
    48	
    49	### 2.1 Search-memory producer repair comes first
    50	
    51	The reducer currently lets successful `hiddenNow` bypass prior observation and then passes
    52	`prior?.targetPosition ?? current.targetPosition` to `createSearchMemory`
    53	(`src/combat/encounter.ts:2281-2301`). That can turn a never-observed PC's true visibility-snapshot
    54	position into monster knowledge. Replace this with a strict `prior?.seen === true` prerequisite for
    55	all causes and source `lastKnownPosition` only from `prior.targetPosition`; remove the current-position
    56	fallback. Keep this in the reducer—do not add a second sanitizer in offers.
    57	
    58	RED-first producer cases in `tests/unit/combat/search-memory.test.ts`:
    59	
    60	- never-observed target successfully Hides: no memory and no cue;
    61	- previously seen target then moves unseen and Hides: memory center is the last seen cell, not either
    62	  unseen cell; repeated unseen movement/hiding never refreshes it;
    63	- previously seen loss by invisibility/obscurement still creates the existing memory at prior seen
    64	  position; reacquisition clears it; expiry remains three rounds.
    65	
    66	### 2.2 Closed branch matrix
    67	
    68	`projectActorKnowledge` projects all non-dead opponents—including dying ones—and sorts them
    69	(`src/vtt/intel/actor-knowledge.ts:222-288`). Its variants are defined at lines 42-90; observation
    70	fallback is lines 98-123. Search-memory shapes and existing options are
    71	`src/combat/search-memory.ts:15-64,88-150`. Extend this one producer with a closed turn-knowledge
    72	projection which joins only active reducer-owned memories for the actor:
    73	
    74	| Projection after precedence | Directional indication | Branch |
    75	|---|---|---|
    76	| Any `perceived` (`seen` or mechanically `located`) non-dead opponent | Current actor-known position | `normal`; existing declarations only; memories/suspicions do not add blind offers. |
    77	| No perceived target; active memory for a non-dead opponent | Its existing `lastKnownPosition`, `suspicion.cells`, and `legalOptions` | `pursue_indication`. |
    78	| No perceived target/memory for the pair; `suspected` | Observation `lastSeen.lastSeenPosition` singleton | `pursue_indication`. |
    79	| `unknown` / `never_observed` | none | contributes no cue. |
    80	| `placement_pending` | none | contributes no cue or coordinate. |
    81	| No cue from any non-dead opponent | none | `blind_posture`. |
    82	
    83	Strictly `life === 'dead'` is excluded; a dying opponent remains in the matrix. An expired memory is
    84	absent and cannot beat an observation or create a cue. For one pair, active memory supersedes the
    85	duplicate observation because it owns the expanding suspicion region. Sort independent cues by
    86	target id, source (`search_memory` before `observation_history`), then cell row/column. Tests cover
    87	perceived+memory, mechanically located-only, expired memory, pending placement, dying, and dead.
    88	
    89	These are the complete existing cues. There is no hearing vector, alert direction, nearest-enemy
    90	fallback, party centroid, initiative inference, or unseen-token cue. For a memory, carry its actual
    91	`legalOptions` member with `kind:'move_and_search'`, Search citation, and `suspicion.cells`; never
    92	recreate its region/radius/citation. For observation-only suspicion, adapt the singleton into the
    93	same typed pursuit input once. Automatic pursuit emits only Move + Search. Existing
    94	`attack_suspected_square`, `ready_action`, and `area_effect_over_region` capabilities remain where
    95	they are; BLIND-01 does not expose or duplicate them in standard offers.
    96	
    97	## 3. Deterministic topology-only cover objective
    98	
    99	### 3.1 Map, component, and approaches
   100	
   101	The canonical query-port computes one token-free map from bounds plus effective passability of
   102	`blockedCells` and `worldObjects`. Determine the actor's occupied footprint once, but read no other
   103	combatant/token. Let `C` be the cardinally connected passable component containing that footprint.
   104	An open approach is the row-major-deduplicated union of:
   105	
   106	1. **Unblocked frontier:** passable cells in `C` on the in-bounds outer boundary.
   107	2. **Open authored doorway:** passable footprint cells in `C` of a `kind:'door'` object whose
   108	   movement blocking is false. A closed door contributes none.
   109	3. **True wall aperture runs:** a maximal vertical run of passable cells in `C` for which every cell
   110	   has immediate west/east passable neighbors and the run is capped immediately north/south by wall
   111	   cells; after removing the entire run, its west- and east-neighbor sets must lie in distinct
   112	   cardinal components. Add the whole run. Include the transposed horizontal definition. This admits
   113	   one-cell and wide openings but rejects ordinary corridor interiors.
   114	
   115	Walls are the effective movement-blocking wall structure already derived from blocked cells/world
   116	objects; out-of-bounds is not a cap. Door footprints are classified by rule 2, not reclassified as
   117	rule 3. Controls: an open 4x3 room has its 10 boundary cells; the sealed 9x5 oracle below has only
   118	`(0,2)` (the PC-side corridor is disconnected); two openings retain both runs; a two-cell gap retains
   119	both cells; open door included/closed door excluded; fully sealed component has `[]`.
   120	
   121	### 3.2 Reachability, budget, footprint, and score
   122	
   123	Add `environment.queries.seekCover(state, request)` to the canonical `EngineQueryPort`. The resolver
   124	only calls that injected method. It returns selected destination/path/cost plus approaches and score
   125	evidence for tests.
   126	
   127	- Candidate anchors are origin plus anchors where the actor's full footprint fits and the existing
   128	  canonical `queries.path` returns a legal normal-movement path. Do **not** pass a synthetic
   129	  `maximumFeet`: that parameter becomes the budget. Compare returned cost to the planning window's
   130	  canonical available movement—fresh turn speed, or active-turn remaining movement after movement
   131	  already spent. Zero remaining permits origin only; 5 ft remaining cannot admit a 10-ft path.
   132	  Never call/compose `movementWithBonusUse`; bonus Dash cannot enlarge blind-posture movement.
   133	- For each approach, trace **from approach to every occupied cell of the candidate footprint** with
   134	  existing `traceTerrainLine` (`src/combat/cover.ts:795-802`). That tracer consumes blocked/world
   135	  terrain, the physical tiers exposed by `coverTierBetweenObjects` (`cover.ts:870-913`), and the
   136	  D635/D642/D657 solid-wall optical rules.
   137	- Encode a trace as `[blocksSight ? 1 : 0, coverRank]`, ranks none=0, half=1,
   138	  three-quarters=2, total=3. An approach's strength is the weakest trace to any footprint cell—large
   139	  creatures cannot hide an exposed square behind a protected anchor. Sort all approach strengths
   140	  weakest-first; compare profiles lexicographically and maximize them. This maximin ordering, not a
   141	  sum, protects against the weakest open approach first. Optical-first is the D665-pending default.
   142	- Select maximum profile. If origin is among maxima, choose it. Otherwise tie-break by minimum actual
   143	  path cost, then lower row, then lower column. Empty approaches therefore choose origin.
   144	
   145	Proof obligation: direct path-query evidence proves the returned cell/footprint legal and reachable;
   146	the selected path is the exact query result. The query-port agreement property compares injected and
   147	canonical results and architecture checks forbid any other query-port construction.
   148	
   149	### 3.3 Hand oracles and controls
   150	
   151	Primary sealed-wall RED: 9x5, perimeter blocked except `(0,2)`; a full-height wall at column 6 seals
   152	an unseen PC at `(7,2)`; passable half-cover object at `(2,2)`; Medium monster starts `(1,2)`, speed
   153	30, no history/memory. Sole approach is `(0,2)`. Direct tracer/path assertions, made before calling
   154	`seekCover`, prove:
   155	
   156	| Candidate | Cost | Profile |
   157	|---|---:|---|
   158	| origin `(1,2)` and `(2,2)` | 0 / 10 (difficult cover cell) | `[(0,0)]` |
   159	| `(3,2)` | 10 by open diagonal around `(2,2)` | `[(0,1)]` |
   160	| `(4,2)`, `(5,2)` | 15 / 20 | `[(0,1)]` |
   161	| reachable rows 1 and 3, columns 1-5 | 5-20 | `[(0,0)]` |
   162	
   163	Thus `(3,2)` wins by minimum cost and is followed by Dodge. Starting at `(3,2)` makes origin a tied
   164	maximum: path `[]`, cost 0, then Dodge. With only 5 ft remaining it stays; with 0 it stays. Relocate
   165	the unseen PC to another sealed-side cell: approaches, all profiles, winner, and path are byte-equal.
   166	A mutant using hidden-PC direction without serializing a coordinate must make that relocation fail.
   167	
   168	Additional hand tables:
   169	
   170	- Multi-approach comparison: lower-row A has sorted `[(0,0),(0,2)]`; B has
   171	  `[(0,1),(0,1)]`. Both sum to 2, but weakest-first lexicographic chooses B.
   172	- Optical discriminator: C `[(1,0)]` beats D `[(0,2)]` under the default; this freezes Q1.
   173	- Equal profile/equal cost candidates prove row then column; empty approach set proves origin.
   174	- A Large 2x2 candidate with per-footprint traces `[half,none,half,none]` scores none. Exercise both
   175	  measured Large species (6209001 Bear and Eagle) so an anchor-only implementation fails.
   176	
   177	## 4. Offer shape, execution, identity, and privacy
   178	
   179	Replace `EngineEngagement` (`src/vtt/turn-proposal.ts:115-123`) with a discriminated union retaining
   180	existing target stances and adding:
   181	
   182	- `{stance:'pursue_indication', indication: KnownIndication}` containing actor-known history/memory;
   183	- `{stance:'seek_cover', objective:{kind:'open_approach_cover', policy:'blind-cover-v1'}}` with no
   184	  target, selector, anchor, or cell.
   185	
   186	Add main action `{kind:'search', targetId, reliance:'sight'}` and resolved Search to every closed
   187	action/schema union, including `src/vtt/blind-dm-contract.ts:97-120`. Narrow engagement before reading
   188	`anchor` in `src/vtt/plan-materiality.ts:126-130`. `intent-resolver.ts:308-340` supplies movement
   189	resolution, and `engine-round-session.ts` already executes movement before the main action.
   190	
   191	- `normal`: unchanged offers.
   192	- `pursue_indication`: normal-speed objective toward any indicated cell, minimizing distance to the
   193	  region, then path cost/row/column; execute existing Search after movement. It need not reach the
   194	  region this turn. Retain defensive/End Turn fallbacks.
   195	- `blind_posture`: one `Seek Cover + Dodge` composite—normal movement objective plus Dodge main
   196	  action—and End Turn. It is not Dash+Dodge; Dash consumes the same main slot and remains only in
   197	  normal declarations (`offer-declarations.ts:497-506`).
   198	
   199	`basic_advance` (`src/vtt/snippets/registry.ts:158-202`) recognizes pursuit and cover posture before
   200	its defensive fallback; ordinary offense still wins. Search is utility, not offense/damage.
   201	
   202	Offer identity is policy identity: `engineOfferableOption` hashes the canonical offer body
   203	(`src/vtt/option-modeling.ts:26-33`). Adding the typed stance/policy changes IDs of replaced/new
   204	offers; unchanged normal bodies keep IDs. A resolver-only destination/tie-order change does **not**
   205	change the policy-only offer or ID—it changes resolved mechanics/path and resolution digest. Tests
   206	hand-build canonical bodies and use the independent existing canonical-json/SHA helper.
   207	
   208	No-coordinate witness deep-walks the blind-posture offer body and asserts no opponent CombatantId and
   209	no GridCell-shaped `{column,row}` pair occurs; movement contains only the policy tag. A pursuit
   210	control contains its historical cell, proving the walker is live. Resolved mechanics may contain the
   211	chosen cover cell. Mutants that leak `(7,2)` or steer from the unseen PC without serialization fail
   212	the structural/relocation pair.
   213	
   214	## 5. Productivity contract
   215	
   216	Export one structural helper from `tools/d569-second-family-manifest.ts` and make brutal-b, the v2
   217	suite after B7, and later v6 call it. A valid monster option is productive iff it has:
   218	
   219	1. existing positive movement, attack, save, cast, or world-object action; or
   220	2. Search paired with `pursue_indication` (movement may be 0 inside the region); or
   221	3. exactly one main Dodge paired with `seek_cover`, whether movement is positive or 0 and whether
   222	   all cover scores are zero/approaches empty.
   223	
   224	An ordinary stationary Dodge is not productive. A malformed/unresolvable posture is not productive.
   225	A room remains unproductive precisely when at least one living monster has no valid option in those
   226	three classes. Thus an already-best blind monster is productive, but an unplaced/action-spent actor
   227	with no valid posture can still fail.
   228	
   229	Pre-change measured population, used as the expectation source:
   230	
   231	| Category | Blind / living | Expected productive blind |
   232	|---|---:|---:|
   233	| hard 5117 | 55 / 75 | 55 / 55 |
   234	| brutal 6203 | 25 / 44 | 25 / 25 |
   235	| brutal-b 6206 | 40 / 42 | 40 / 40 |
   236	| brutal-2 6207 | 29 / 44 | 29 / 29 |
   237	| rejected/new 6209 | 36 / 46 | 36 / 36 |
   238	| aggregate | 185 / 251 | 185 / 185 |
   239	
   240	Pin 6209003 Goblin Boss explicitly: 55 approaches, 31 candidates, 11 tied maxima, origin `(11,2)`
   241	cost 0; its valid stationary posture is productive. The zero-score posture/ordinary-Dodge contrast
   242	is a separate RED witness.
   243	
   244	## 6. Ordered batches (each at most ten files)
   245	
   246	For every batch: R is hand-authored RED before production change; T is both
   247	`npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit`; M is applied and
   248	reverted with the same focused witnesses; V runs
   249	`npx vitest run --configLoader runner --maxWorkers=1 <listed tests>`, expected listed files collected,
   250	0 failed/0 skipped unless an existing pin says otherwise. Never update from changed output.
   251	
   252	### B0 — make memories safe (2 files)
   253	
   254	Allowed: `src/combat/encounter.ts`; `tests/unit/combat/search-memory.test.ts`.
   255	
   256	- R: the three producer cases in 2.1 fail under the true-position fallback.
   257	- M: restore `hiddenNow` bypass or current-position fallback; never-observed/moved-unseen REDs fail.
   258	- T: app 0, node 0. V: search-memory test 1/1 file, 0 failed; no offer files touched.
   259	
   260	### B1 — projection and query contract (4 files)
   261	
   262	Allowed: `src/vtt/intel/actor-knowledge.ts`; `src/vtt/engine-query-port.ts`;
   263	`tests/unit/vtt/actor-knowledge.test.ts`; `tests/unit/vtt/engine-query-port.test.ts`.
   264	
   265	- R: full precedence matrix, aperture controls, partial/zero movement, footprint, comparator, and
   266	  query-port agreement fail before their typed producer/query exists.
   267	- M: consume expired/never-observed memory, corridor-as-aperture, inverted score, synthetic 30-ft
   268	  budget, or anchor-only footprint; corresponding witness fails.
   269	- T: app 0, node 0. V: 2/2 test files, 0 failed; hand oracle gives `(3,2)`, origin variant gives 0.
   270	
   271	### B2 — offer/resolver core plus co-located witnesses (10 files)
   272	
   273	Allowed: `src/vtt/turn-proposal.ts`; `src/vtt/offers/offer-declarations.ts`;
   274	`src/vtt/intent-resolver.ts`; `src/vtt/engine-round-session.ts`; `src/vtt/option-modeling.ts`;
   275	`src/vtt/offered-option-paths.ts`; `src/vtt/blind-intent-resolver.ts`;
   276	`src/vtt/blind-dm-contract.ts`; `src/vtt/plan-materiality.ts`;
   277	`tests/unit/vtt/blind-cover-posture.test.ts` (**NEW**).
   278	
   279	- R: sealed no-cue `(3,2)` + Dodge; best origin path `[]`/0 + Dodge; last-known Move + Search;
   280	  no-coordinate and unseen-relocation controls all fail before implementation.
   281	- M: blind branch disabled gives exactly Dodge/End Turn; inverted score chooses wrong cell; ignored
   282	  indication chooses posture; serialized/nonserialized PC leaks fail privacy/relocation.
   283	- T: expected temporary diagnostics are only B3 consumers: app 6 and node 8
   284	  (`dm-tactical-intel` 2, `opportunity-cost` 1, `option-outcome` 1, `engine-server` 1,
   285	  `snippets/registry` 1; node additionally `snippets.test` 2). Anything else stops.
   286	- V: new witness file 1/1, 0 failed; movement precedes Dodge/Search; hashes use hand bodies.
   287	
   288	### B3 — close all action/engagement consumers/schemas (8 files)
   289	
   290	Allowed: `src/vtt/dm-tactical-intel.ts`; `src/vtt/intel/opportunity-cost.ts`;
   291	`src/vtt/intel/option-outcome.ts`; `src/vtt/mcp/engine-server.ts`; `src/vtt/snippets/registry.ts`;
   292	`tests/unit/vtt/snippets.test.ts`; `tests/unit/vtt/blind-dm-contract.test.ts`;
   293	`docs/specs/engine-proposal-contract-refusal-code.schema.json`.
   294	
   295	- R: Search schema and exhaustive consumers reject/misclassify new variants; `basic_advance` misses
   296	  posture/pursuit.
   297	- M: omit Search from runtime schema, classify it as offense, or omit `seek_cover` from advance;
   298	  focused schema/semantic/snippet witness fails.
   299	- T: app 0, node 0. V: 3/3 test files plus B2 witness, 0 failed; no default switch arms.
   300	
   301	### B4 — productivity lands before COHORT gate (10 files)
   302	
   303	Allowed: `src/vtt/intel/team-scorer.ts`; `src/vtt/challenge-feasibility.ts`;
   304	`src/vtt/encounter-app.ts`; `src/vtt/scripted-party-round.ts`; `src/vtt/speculative-planning.ts`;
   305	`src/vtt/mcp/schemas.ts`; `docs/specs/engine-turn-context.schema.json`;
   306	`docs/specs/engine-blind-round-intent.schema.json`;
   307	`docs/specs/engine-blind-round-intent-result.schema.json`;
   308	`tools/d569-second-family-manifest.ts`.
   309	
   310	- R: stationary valid posture is unproductive under the old helper; ordinary Dodge/all-zero valid
   311	  posture boundary; strict schemas reject Search/new engagements.
   312	- M: count arbitrary Dodge, reject zero-score posture, or omit Search/schema branch; boundary/parity
   313	  witness fails.
   314	- T: app 0, node 0. V: relevant existing semantic/schema checks plus B2 witness, 0 failed; schema
   315	  check/idempotence second run has 0-byte diff.
   316	
   317	### B5 — focused contracts and frozen rows (10 files)
   318	
   319	Allowed: `tests/unit/tools/d569-second-family-manifest.test.ts`;
   320	`tests/unit/vtt/arena-basis-brutal-b.test.ts`; `tests/unit/vtt/standard-offer-generator.test.ts`;
   321	`tests/unit/vtt/engine-round-session.test.ts`; `tests/unit/vtt/option-modeling.test.ts`;
   322	`tests/unit/vtt/offered-option-paths.test.ts`; `tests/unit/vtt/option-outcome.test.ts`;
   323	`tests/unit/vtt/team-scorer.test.ts`; `tests/unit/vtt/challenge-feasibility-production.test.ts`;
   324	`tests/unit/tools/engine-mcp-server.test.ts`.
   325	
   326	- R: old exact rows stay RED until each section-7 ledger exists; 6209003 and zero-score posture prove
   327	  shared productivity. v1/v5 controls remain green.
   328	- M: replay four required mutants; each named focused witness fails.
   329	- T: app 0, node 0. V: 10/10 files, 0 failed; core/with-hint 480/660, primary 240/330,
   330	  second-family 480; fixtures and v1/v5 have zero diff.
   331	
   332	### B6 — behavior, arena, and conversation pins (10 files)
   333	
   334	Allowed: `tests/unit/vtt/composite-turn-proposals.test.ts`;
   335	`tests/unit/vtt/engine-opportunity-movement-intel.test.ts`;
   336	`tests/unit/vtt/speculative-planning.test.ts`; `tests/unit/vtt/blind-intent-resolver.test.ts`;
   337	`tests/unit/vtt/dm-tactical-intel.test.ts`; `tests/unit/vtt/agent-round-decision.test.ts`;
   338	`tests/unit/tools/ai-dm-arena.test.ts`; `tests/unit/tools/ai-dm-conversation.test.ts`;
   339	`tests/unit/vtt/challenge-feasibility.test.ts`; `tests/unit/vtt/scripted-party-round.test.ts`.
   340	
   341	- R: retain old affected rows as RED and attach actor branch/destination/profile/action/hash proof.
   342	- M: replay four required mutants; unrelated/pre-change control changes fail exact pins.
   343	- T: app 0, node 0. V: 10/10 files, 0 failed; hard-family hand rows agree; all 185 blind are
   344	  productive by category; D583 core-stage set is its independently derived subset, not normalized.
   345	
   346	### B7 — COHORT integration at `bea24cbe` + accepted core (2 files)
   347	
   348	Allowed: `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (**COHORT prerequisite**, absent at b94);
   349	`tests/unit/tools/d569-second-family-manifest.test.ts`.
   350	
   351	- R: v2's local old predicate rejects stationary valid posture; prove import of shared helper fixes
   352	  it. Do not create v6; COHORT later imports the same helper when v6 is introduced.
   353	- M: restore v2 local predicate or reject movement-0 posture; 6209003/zero-score witnesses fail.
   354	- T: app 0, node 0. V: 2/2 files, 0 failed; v2 36/36 blind and 10/10 rooms productive; v1/v5
   355	  byte-frozen; final D583 set exactly 216.
   356	
   357	## 7. Pin ledger: demonstrate, then normalize
   358	
   359	For every changed exact pin, first retain the old expected row as RED; add a hand table of approaches,
   360	all maximal destinations, winner, cost, runner-up profile, and action; only then edit named fields.
   361	
   362	| Surface | Proof and permitted change |
   363	|---|---|
   364	| `tests/unit/vtt/composite-turn-proposals.test.ts:153-164` | Seed 5117005: prove each blind Scout's matrix branch and cover table; replace only Dodge/End-Turn behavior with the proved composite. Perceived controls unchanged. |
   365	| `tests/unit/vtt/engine-opportunity-movement-intel.test.ts:71-163` Room 8 | Hand-score monsters 1/2/4 against every tied maximum; monster 5's perceived 55-ft Dash remains unchanged. Normalize only blind option/path/ID and dependent intel. |
   366	| `tests/unit/vtt/speculative-planning.test.ts:543-565` | Preserve COHORT's nonempty-menu scene; hand-prove objective/path, dependency facts, scores, byte tie order, seam mutation. Never normalize to empty. |
   367	| `tests/unit/vtt/snippets.test.ts:329-380,489-503` | Hand bodies prove `basic_advance`: posture for no cue, Move+Search for last-known, existing Dash/offense for perceived. |
   368	| `tests/unit/vtt/standard-offer-generator.test.ts:19-125` | Enumerate labels, slot uses, movement objectives/order, bodies/hashes. Normal perceived counts/IDs stay unchanged. |
   369	| `tests/unit/vtt/arena-basis-brutal-b.test.ts:378-443` (requested frozen rows 425-431) | Fixture hashes/membership freeze. Before each changed selected row, record branch, profile alternatives, chosen path/action/body hash. |
   370	| `tests/unit/vtt/engine-query-port.test.ts:184-314` | Agreement: injected result/path equals canonical path and direct tracer profiles; include openings, partial movement, Large footprint, and relocation controls. |
   371	| D569 v2/v6 | B7 changes only supplied v2 plus shared predicate test. BLIND-01 lands no v6 file. When COHORT creates v6 it consumes the helper. v1/v5 files, observed rows, IDs, and fixtures remain byte-frozen. |
   372	| `tests/unit/tools/ai-dm-arena.test.ts`, `tests/unit/tools/ai-dm-conversation.test.ts` | For each affected authorized-plan/round row, prove branch, cell/profile or indication, movement/action, and hand-built ID; narrative moves only when exact option facts change. |
   373	
   374	## 8. D583 ownership inventory: 148 -> 216 specs
   375	
   376	Derive the expected set independently from the 148-spec b94 baseline, named
   377	`claude/cohort-01@bea24cbe` prerequisites, and the one new BLIND-01 test. `turn-proposal.ts` alone
   378	reaches 213; the complete 55-path B0-B7 manifest reaches 216. The exact +68 specs are:
   379	
   380	```text
   381	tests/integration/authoring/handlers.test.ts; tests/integration/party/token-never-travels.test.ts; tests/integration/queries/completeness-rpc.test.ts; tests/integration/queries/level-up-wizard.test.ts; tests/integration/queries/rpc.test.ts; tests/integration/tools/generate-heldout-party-basis.test.ts; tests/integration/vtt/ai-dm-arena-interleave.test.ts; tests/integration/vtt/stored-character-party-member.test.ts
   382	tests/unit/assets/board-glyphs.test.ts; tests/unit/assets/encounter-board-art.test.ts; tests/unit/assets/light-encoding.test.ts; tests/unit/assets/starter-art.test.ts; tests/unit/combat/movement-evaluator.test.ts; tests/unit/combat/tactical-evaluator-actor-knowledge.test.ts; tests/unit/combat/visibility-field.test.ts; tests/unit/tools/agent-conformance.SIMULATED.test.ts; tests/unit/tools/ai-dm-conversation-row-codec.test.ts; tests/unit/tools/ai-dm-legacy-invariance.test.ts; tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts; tests/unit/tools/ai-dm-rerun-packet.test.ts; tests/unit/tools/d569-blind-experiment.test.ts; tests/unit/tools/d569-second-family-manifest.test.ts; tests/unit/tools/d569-v5.test.ts; tests/unit/tools/engine-mcp-server.test.ts; tests/unit/ui/character-list.test.ts; tests/unit/ui/guided-builder.test.ts; tests/unit/ui/homebrew-library.test.ts; tests/unit/ui/level-up-planned-steps.test.ts; tests/unit/ui/level-up-wizard.test.ts; tests/unit/ui/planner.test.ts
   383	tests/unit/vtt/agent-round-decision.test.ts; tests/unit/vtt/arena-basis-brutal-v2.test.ts; tests/unit/vtt/blind-context-source-binding.test.ts; tests/unit/vtt/blind-cover-posture.test.ts; tests/unit/vtt/blind-dm-contract.test.ts; tests/unit/vtt/blind-intent-resolver.test.ts; tests/unit/vtt/blind-model-ingress.test.ts; tests/unit/vtt/blind-turn-context.test.ts; tests/unit/vtt/challenge-feasibility-production.test.ts; tests/unit/vtt/closed-predicates.test.ts; tests/unit/vtt/content-pack-import-order.test.ts; tests/unit/vtt/controller-assignment.test.ts; tests/unit/vtt/decision-trace.test.ts; tests/unit/vtt/door-intent.test.ts; tests/unit/vtt/encounter-selectors.test.ts; tests/unit/vtt/encounter-session-service.test.ts; tests/unit/vtt/experiment-orchestrator.test.ts; tests/unit/vtt/generated-encounter-fixtures.test.ts; tests/unit/vtt/handoff-examples.test.ts; tests/unit/vtt/heldout-evaluation.test.ts; tests/unit/vtt/in-process-transport.test.ts; tests/unit/vtt/node-runtime.test.ts; tests/unit/vtt/node-websocket-transport.test.ts; tests/unit/vtt/offer-environment-board-sequence.test.ts; tests/unit/vtt/offer-environment-identity.test.ts; tests/unit/vtt/offer-environment.test.ts; tests/unit/vtt/opportunity-selection.test.ts; tests/unit/vtt/plays-v1.test.ts; tests/unit/vtt/protocol-runtime.test.ts; tests/unit/vtt/reaction-spend-hold.test.ts; tests/unit/vtt/runtime-parity.test.ts; tests/unit/vtt/scene-snapshot.test.ts; tests/unit/vtt/session-lifecycle.test.ts; tests/unit/vtt/soak-runner.test.ts; tests/unit/vtt/standard-offer-generator.test.ts; tests/unit/vtt/team-scorer.test.ts; tests/unit/vtt/two-room-fixture.test.ts; tests/unit/vtt/worker-boundary.test.ts
   384	```
   385	
   386	A count other than 216 or different set stops for ownership review; never regenerate this expected
   387	list from the changed graph.
   388	
   389	## 9. Final gates
   390	
   391	Run serially, preserve stdout and elapsed time:
   392	
   393	```text
   394	npx tsc -p tsconfig.app.json --noEmit
   395	npx tsc -p tsconfig.node.json --noEmit
   396	node scripts/check-offer-environment-architecture.mjs --self-test
   397	node scripts/check-offer-environment-architecture.mjs
   398	node scripts/check-command-outcomes.mjs
   399	npx vitest run --configLoader runner --maxWorkers=1 <all touched B0-B7 tests>
   400	npx vitest run --configLoader runner --maxWorkers=1 tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
   401	```
   402	
   403	Expected: T 0/0; architecture self-test 0 and live check 0; command outcomes 0; touched files all
   404	collected, 0 failed/0 skipped; D630 timing pair 36/36 on a quiet box, baseline/candidate back-to-back,
   405	combined ceiling 41 s. Timeout is failure; do not raise it.
   406	
   407	Generation gate has two separate comparisons because historical fixtures are not fresh-generator
   408	equivalents:
   409	
   410	1. Before edits hash all 43 tracked room fixture files; after B7 require 43/43 hashes unchanged and
   411	   `git diff -- tests/fixtures` empty.
   412	2. Before edits generate the same 43 room inputs from the pre-change tree into a fresh temp capture;
   413	   after B7 generate them again with identical commands into another temp directory; require 43/43
   414	   pre-change-vs-post-change bytes identical. Do **not** compare fresh outputs to tracked fixtures.
   415	
   416	Prove “generator does not consult offers” at runtime: instrument module evaluation during each room
   417	generation and assert none of `offer-declarations.ts`, `intent-resolver.ts`, `turn-proposal.ts`, or
   418	`option-modeling.ts` is evaluated. Do not use static/type import closure as the gate: type traversal
   419	legitimately reaches all four. Any room delta or runtime offer-module load is STOP, not normalization.
   420	
   421	Final hard gates: four named mutants killed after clean restoration; no fixture bytes; no output-made
   422	oracle; v1/v5 frozen; only hand-demonstrated pins normalized; all 36 blind 6209 and all 185 measured
   423	blind monsters productive; D583 exactly 216; no alternate query port; no full suite/build/browser.
   424	
   425	## 10. Owner question
   426	
   427	**Q1 (D665, material):** does D664 “cover” rank optical blocking before physical tier as planned, or
   428	physical cover only with optical reported? Default for implementation is optical-first, frozen by C
   429	`[(1,0)]` beating D `[(0,2)]`; the alternative changes cover winners, resolved paths/digests, and pins,
   430	but not policy-only offer IDs. Automatic pursuit is settled, not open: emit existing Move + Search
   431	only, never suspected-square attack.
   432	
   433	## 11. Round 2 disposition
   434	
   435	- PLAN-F1 -> lines 49-64 add the prerequisite reducer repair and leakage REDs before consumption.
   436	- PLAN-F2 -> lines 4-11, 25-44, and 271-299 name `bea24cbe`, NEW/prerequisite/absent files, all missing consumers including `plan-materiality.ts`/`blind-dm-contract.ts`, and the atomic 15/17-to-0/0 type tranche.
   437	- PLAN-F3 -> lines 25-31, 214-242, and 301-315 land shared productivity and its stationary witness before COHORT B3.
   438	- PLAN-F4 -> lines 99-119 and 149-175 replace the corridor predicate with component-separating maximal aperture runs and add open/multiple/wide/door controls plus trace direction.
   439	- PLAN-F5 -> lines 121-147 and 160-165 use canonical remaining movement, forbid maximum override/bonus Dash, and test partial/zero movement.
   440	- PLAN-F6 -> lines 405-418 separate 43 tracked hashes from 43 fresh pre/post generations and use only runtime module evaluation as the no-offers proof.
   441	- PLAN-F7 -> lines 374-387 derive and enumerate 148 + 68 = 216 rather than normalizing a run.
   442	- PLAN-F8 -> lines 121-175 add relocation/nonserialized-direction mutant, maximin multi-approach table, tie/empty/optical controls, full-footprint policy, and Large Bear/Eagle witness.
   443	- PLAN-F9 -> lines 201-212 distinguish policy offer identity from resolved mechanics/digest identity.
   444	
   445	BLIND-01 PLAN R2 DONE

exec
/bin/bash -lc "sed -n '23136,23165p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md; sed -n '2255,2320p' src/combat/encounter.ts; sed -n '222,266p' tests/unit/combat/search-memory.test.ts; sed -n '1,48p' tools/generate-engine-mcp-schemas.ts; git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts; git cat-file -e bea24cbe:tests/unit/tools/d569-v6.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 exited 128 in 0ms:
## D664 — OWNER (2026-09-18 08:27): Question 6 — "Seek cover and dodge unless there is some indication of direction of an enemy"
RULING (verbatim above). Reading, as binding for the BLIND-01 unit: a monster that perceives no enemy (no 'seen'/'located' detection) acts on its KNOWLEDGE: (a) if there is an indication of an enemy's direction — a last-known position in observationHistory, a searchMemory / suspicion region (D420), or another defined knowledge cue the plan enumerates from the single actor-knowledge producer (D625) — it advances/searches toward that indication with the existing move-and-search machinery; (b) if there is NO indication, it SEEKS COVER and DODGES: it moves (positive movement, within its speed) to a reachable cell with the best available cover against the room's open approaches, chosen from the map alone (never from an unseen PC's true position — D476/D545 stand), then takes Dodge; if it already holds the best reachable cover, it Dodges in place. SUPERVISOR CONSEQUENCE, open to the owner's veto: the productivity contract (movement > 0 OR an offensive component with a clear trace) must treat the blind posture — seek-cover-and-Dodge, including Dodge-in-place when already at best cover — as PRODUCTIVE, because it is now the defined useful action for a blind monster; a room is unproductive only if a monster has neither a shot, nor a path to better cover, nor an indication to pursue AND is not already in cover. Sequencing: BLIND-01 is planned now (sol, plan reviewed by astra at HIGH per D627), implemented on a new worktree ../dnd-wt-blind-01 (branch claude/blind-01 from claude/vis-field b94dd732), merged into claude/vis-field and then into claude/cohort-01 before Batch 3 re-runs; COHORT-01 Batch 9's hand derivations (Room-8, composite, speculative) are redone after BLIND-01 because the behaviour they pin changes by design.

## D665 — SUPERVISOR (2026-09-18 08:52): BLIND-01 plan r1 written (sol 01a0b47c…; sha256 e78967b7ecd4204d97e03b1589c10950f61165e9f97c96113beac3e72b16889f, 450 lines; six batches B1–B6 ≤10 files, D583 inventory 148 → 214, owner questions in §10); astra HIGH review r1 dispatched (fresh 01a0b492…; brief review-plan-blind-01-astra.md; log review-plan-blind-01-astra-r1.log). Plan copies: .tmp-plans (main), ../dnd-wt-blind-01/.tmp-plans.

## D666 — SUPERVISOR (2026-09-18 09:07): BLIND-01 plan r1 REJECTED by astra r1 (HIGH; 3 P1, 5 P2, 1 P3; saved review-plan-blind-01-astra-r1.md) → r2 dispatched; a PRE-EXISTING knowledge-leak defect found (KNOW-F1) for the owner
KNOW-F1 (pre-existing, found by astra with the real reducer; NOT introduced by any recent batch): when a PC that a monster has NEVER observed Hides, the reducer creates a searchMemory for that monster with lastKnownPosition = the PC's TRUE cell and a suspicion region on it (encounter.ts:2284: `hiddenNow` bypasses the previously-seen requirement and memory creation reads the visibility snapshot's true position). That violates D476 (observed facts + defined inference only) and D545; any consumer of searchMemories (the D420 move-and-search machinery, and BLIND-01's pursue branch) would act on a position the monster never had. BLIND-01 r2 must repair this producer in an early batch before consuming memories. Recorded as a finding against the existing engine; the owner may also want it fixed independently of BLIND-01.
PLAN findings: F2 manifests incomplete (plan-materiality.ts:128, blind-dm-contract.ts:97, 15/17 diagnostics on expansion; COHORT-supplied prerequisites conflated with new files); F3 the productivity amendment must land with the core (6209003's Goblin Boss wins the origin at cost 0 and stays unproductive under the old predicate); F4 the aperture predicate marks corridor cells (the 9×5 oracle has four approaches, not one); F5 the movement budget must be the canonical remaining movement (queries.path honours a supplied maximumFeet; bonus Dash must not extend the posture); F6 the generation gate must be 43/43 tracked hashes unchanged + 43/43 pre/post fresh generations identical, with a runtime-only dependency assertion; F7 D583 = 216 for the declared manifest, not 214; F8 map-only selection and weakest-first ordering need real witnesses (unseen-PC relocation control, a direction-leak mutant without serialized coordinates, competing profiles, ties, empty approaches, a Large-creature/footprint policy); F9 option identity vs resolution identity. Astra's in-memory planner runs with the plan's scoring: 6209001 Bear → (16,2) at 10 ft, Eagle → (19,4) at 5 ft, Ghast → (18,2) at 5 ft (all currently Dodge/End Turn only); it recommends keeping both plan defaults (Q1 optical first; Q2 move_and_search only) and that the productivity contract counts a valid blind posture even at zero cover scores while an ordinary stationary Dodge does not. Owner Question 7 (Q1) remains open; r2 keeps the default.

## D667 — SUPERVISOR (2026-09-18 09:36): BLIND-01 plan r2 written (sha256 7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce, 445 lines; r1 archived as .r1.md); astra HIGH r2 (resumed 01a0b492…) dispatched
function reconcileSearchMemories(
  context: ReductionContext,
  before: readonly MonsterVisibilitySnapshot[],
  command: EncounterCommand,
): void {
  const beforeByPair = new Map(before.map((entry) =>
    [`${String(entry.observer)}\u0000${String(entry.target)}`, entry] as const));
  for (const current of monsterVisibilitySnapshot(context.state)) {
    const prior = beforeByPair.get(`${String(current.observer)}\u0000${String(current.target)}`);
    const existing = encounterSearchMemories(context.state).find((memory) =>
      memory.observer === current.observer && memory.target === current.target);
    if (current.seen) {
      if (existing === undefined) continue;
      context.state = {
        ...context.state,
        searchMemories: encounterSearchMemories(context.state).filter((memory) => memory !== existing),
      };
      emit(context, {
        type: 'search_memory_cleared',
        visibility: 'dm_only',
        observer: existing.observer,
        target: existing.target,
        reason: 'target_reacquired',
      });
      continue;
    }
    const hiddenNow = command.type === 'hide' && command.actor === current.target &&
      context.events.some((event) =>
        event.type === 'hide_resolved' &&
        event.combatant === current.target &&
        event.outcome === 'hidden');
    if (prior?.seen !== true && !hiddenNow) continue;
    const cause = hiddenNow
      ? 'hiding' as const
      : searchMemoryCause(
          context.state,
          current.observer,
          detectCombatant(context.state, current.observer, current.target),
        );
    if (cause === null) continue;
    const memory = createSearchMemory({
      bounds: context.state.bounds,
      observer: current.observer,
      target: current.target,
      cause,
      lastKnownPosition: prior?.targetPosition ?? current.targetPosition,
      round: context.state.round,
    });
    context.state = {
      ...context.state,
      searchMemories: [
        ...encounterSearchMemories(context.state).filter((candidate) =>
          candidate.observer !== current.observer || candidate.target !== current.target),
        memory,
      ],
    };
    emit(context, {
      type: 'search_memory_recorded',
      visibility: 'dm_only',
      observer: memory.observer,
      target: memory.target,
      cause: memory.cause,
      lastKnownPosition: memory.lastKnownPosition,
      suspicion: memory.suspicion,
      expires: memory.expires,
      legalOptions: memory.legalOptions,
        region: { id: 'd420-heavy', cells: [{ column: 2, row: 0 }] },
        obscurement: 'heavy',
      },
    }, fixedD20(10)).state;

    expect(state.searchMemories).toEqual([expect.objectContaining({
      observer: monster.id,
      target: pc.id,
      cause: 'obscurement',
      lastKnownPosition: { column: 2, row: 0 },
    })]);
  });

  it('records a successful Hide as the active search-memory cause', () => {
    const pc = playerProfile('hidden-target', { initiativeBonus: 20 });
    const monster = monsterProfile('hide-searcher', { initiativeBonus: -20 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 1 },
      combatants: [pc, monster],
      tokens: [placedToken(pc, 2), placedToken(monster, 0)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, fixedD20(15)).state;
    state = reduceEncounter(state, {
      type: 'world_operation',
      actor: null,
      cost: 'none',
      operation: {
        kind: 'set_obscurement',
        region: { id: 'd420-hide-cover', cells: [{ column: 2, row: 0 }] },
        obscurement: 'heavy',
      },
    }, fixedD20(15)).state;
    state = reduceEncounter(state, { type: 'hide', actor: pc.id }, fixedD20(15)).state;

    expect(state.eventLog).toContainEqual(expect.objectContaining({
      type: 'hide_resolved',
      combatant: pc.id,
      outcome: 'hidden',
    }));
    expect(state.searchMemories).toEqual([expect.objectContaining({
      observer: monster.id,
      target: pc.id,
      cause: 'hiding',
      lastKnownPosition: { column: 2, row: 0 },
    })]);
import { rmSync, writeFileSync } from 'node:fs';
import { z } from 'zod';
import {
  engineSchemaInternals,
  proposalContractRefusalCodeSchema,
} from '../src/vtt/mcp/schemas';

function writeSchema(path: string, schema: z.ZodType<unknown>): void {
  const generated = z.toJSONSchema(schema, {
    target: 'draft-2020-12',
    io: 'output',
    reused: 'ref',
  });
  writeFileSync(path, `${JSON.stringify(generated, null, 2)}\n`);
}

rmSync('docs/specs/engine-get-turn-context-output.schema.json', { force: true });
writeSchema('docs/specs/engine-turn-context.schema.json', engineSchemaInternals.turnContextOutput);
writeSchema(
  'docs/specs/engine-proposal-contract-refusal-code.schema.json',
  proposalContractRefusalCodeSchema,
);
writeSchema(
  'docs/specs/engine-blind-round-intent.schema.json',
  engineSchemaInternals.blindRoundIntentEnvelopeSchema,
);
writeSchema(
  'docs/specs/engine-blind-round-intent-result.schema.json',
  engineSchemaInternals.blindIntentSubmissionOutputSchema,
);
fatal: Not a valid object name bea24cbe:tests/unit/tools/d569-v6.test.ts

exec
/bin/bash -lc "node <<'NODE'
process.env.VITEST='true';
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {buildD583ContractInventory}=require('./tools/d583-contract-inventory.ts');
const plan=fs.readFileSync('.tmp-plans/2026-09-18-blind-01-plan.md','utf8'),batches=[...plan.matchAll(/### (B\\d)["'^'"\\n]*\\n([\\s\\S]*?)(?=\\n###|\\n##)/g)].map(m=>({name:m[1],paths:[...m[2].split('Allowed: ')[1].split('\\n\\n')[0].matchAll(/"'`([''^`]+)`/g)].map(x=>x[1])}));
const paths=[...new Set(batches.flatMap(b=>b.paths))];console.log('"'BATCHES',JSON.stringify(batches.map(b=>({name:b.name,count:b.paths.length,absent:b.paths.filter(p=>"'!fs.existsSync(p))}))));console.log('"'UNIQUE',paths.length);
const baseline=buildD583ContractInventory({changedPaths:[]});for(const [name,changed] of [['base',[]],['turn',['src/vtt/turn-proposal.ts']],['core',paths.filter(p=>p"'!=='"'tests/unit/vtt/arena-basis-brutal-v2.test.ts')],['final',paths]]){const inventory=buildD583ContractInventory({changedPaths:changed});console.log('INVENTORY',name,inventory.length);if(name==='final'){const listed=plan.slice(plan.indexOf('The exact +68')).split('"'```text'"')[1].split('"'```'"')[0].trim().split(/[;\\n]/).map(s=>s.trim()).filter(Boolean),actual=inventory.filter(p=>"'!baseline.includes(p));console.log('"'LISTCHECK',listed.length,'missing',actual.filter(p=>"'!listed.includes(p)),'"'extra',listed.filter(p=>"'!actual.includes(p)));}}

NODE' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 9762ms:
BATCHES [{"name":"B0","count":2,"absent":[]},{"name":"B1","count":4,"absent":[]},{"name":"B2","count":10,"absent":["tests/unit/vtt/blind-cover-posture.test.ts"]},{"name":"B3","count":8,"absent":[]},{"name":"B4","count":10,"absent":[]},{"name":"B5","count":10,"absent":[]},{"name":"B6","count":10,"absent":[]},{"name":"B7","count":2,"absent":["tests/unit/vtt/arena-basis-brutal-v2.test.ts"]}]
UNIQUE 55
INVENTORY base 148
INVENTORY turn 213
INVENTORY core 215
INVENTORY final 216
LISTCHECK 68 missing [] extra []

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {generateRoom}=require('./src/vtt/room-generator.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {combatantSpaceAt,createEncounter}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),key=c=>c.column+','+c.row,cell=k=>{const [column,row]=k.split(',').map(Number);return {column,row}};
function neighbors(c){return [{column:c.column-1,row:c.row},{column:c.column+1,row:c.row},{column:c.column,row:c.row-1},{column:c.column,row:c.row+1}]}
function component(pass,seed,removed=new Set()){const result=new Set(),queue=[seed];for(const c of queue){const k=key(c);if(result.has(k)||"'!pass.has(k)||removed.has(k))continue;result.add(k);queue.push(...neighbors(c))}return result}
function approaches(s,origin){const pass=new Set(),walls=new Set(terrainWallCells(s).map(key));for(let row=0;row<s.bounds.rows;row++)for(let column=0;column<s.bounds.columns;column++){const c={column,row};if(terrainPassabilityAt(s,c)!=='"'blocked')pass.add(key(c))}
const C=component(pass,origin),doorAll=new Set(s.worldObjects.filter(o=>o.kind==='door').flatMap(o=>o.footprint.map(key))),openDoors=new Set(s.worldObjects.filter(o=>o.kind==='door'&&"'!o.blocking.movement).flatMap(o=>o.footprint.map(key))),out=new Set([...C].filter(k=>{const c=cell(k);return c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1||openDoors.has(k)})),runs=[];
for(const axis of ['"'v','h']){const step=axis==='v'?{column:0,row:1}:{column:1,row:0},side=axis==='v'?{column:1,row:0}:{column:0,row:1},add=(a,b,n=1)=>({column:a.column+b.column*n,row:a.row+b.row*n});
const eligible=new Set([...C].filter(k=>{const c=cell(k);return "'!doorAll.has(k)&&pass.has(key(add(c,side)))&&pass.has(key(add(c,side,-1)))}));
for(const k of eligible){const first=cell(k);if(eligible.has(key(add(first,step,-1))))continue;let run=[],cur=first;while(eligible.has(key(cur))){run.push(cur);cur=add(cur,step)}if(!walls.has(key(add(first,step,-1)))||!walls.has(key(cur)))continue;const removed=new Set(run.map(key)),left=run.map(c=>add(c,side,-1)),right=run.map(c=>add(c,side)),lComp=component(C,left[0],removed);const separated=left.every(c=>lComp.has(key(c)))&&right.every(c=>!lComp.has(key(c)));runs.push({axis,cells:run,separated});if(separated)run.forEach(c=>out.add(key(c)))}}
return {cells:[...out].map(cell).sort((a,b)=>a.row-b.row||a.column-b.column),runs,component:C.size}}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0}
function score(s,foot,ap){return ap.map(a=>Math.min(...foot.map(c=>{const t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3})[t.tier]}))).sort((a,b)=>a-b)}
function histogram(a){return Object.fromEntries([...new Set(a)].map(n=>[n,a.filter(v=>v===n).length]))}
function examine(s,id){const actor=s.combatants.find(c=>c.profile.id===id),origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin).cells,rows=[];for(let row=0;row<s.bounds.rows;row++)for(let column=0;column<s.bounds.columns;column++){const c={column,row},p=env.queries.path(s,{actorId:id,destination:c,movement:'"'normal'});if("'!p.legal)continue;const foot=combatantSpaceAt(s,id,c).cells;rows.push({cell:c,cost:p.costFeet,path:p.cells,score:score(s,foot,ap)})}rows.sort((a,b)=>compare(b.score,a.score)||(key(a.cell)===key(origin)?-1:key(b.cell)===key(origin)?1:0)||a.cost-b.cost||a.cell.row-b.cell.row||a.cell.column-b.cell.column);const best=rows[0];console.log('"'WINNER',JSON.stringify({id,name:actor.profile.name,size:actor.profile.rules.sizeCategory,origin,approaches:ap.length,candidates:rows.length,best:{...best,score:histogram(best.score)},maxima:rows.filter(c=>compare(c.score,best.score)===0).map(c=>({cell:c.cell,cost:c.cost})),originProfile:histogram(rows.find(c=>key(c.cell)===key(origin)).score)}));return {ap,rows,best}}
const actor=monsterProfile('blind-witness'),pc=playerProfile('sealed-pc');
const blocked=[];for(let row=0;row<5;row++)for(let column=0;column<9;column++)if((row===0||row===4||column===0||column===8||column===6)&&"'!(column===0&&row===2))blocked.push({column,row});
const obj={id:'"'world-object:half',name:'Half cover',kind:'cover',position:{column:2,row:2},footprint:[{column:2,row:2}],durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking('half_cover')};
const scene=freshMonsterPlanningState(createEncounter({bounds:{columns:9,rows:5},combatants:[actor,pc],tokens:[placedToken(actor,1,2),placedToken(pc,7,2)],blockedCells:blocked,worldObjects:[obj]}));

console.log('SEALED-APPROACHES',JSON.stringify(approaches(scene,{column:1,row:2})));examine(scene,actor.id);
for(const seed of [6209001,6209003]){const s=freshMonsterPlanningState(generateRoom(seed,{difficulty:'brutal'}).encounter.state);for(const a of s.combatants.filter(c=>c.profile.kind==='monster'&&(seed===6209001?/Bear|Eagle|Ghast/.test(c.profile.name):c.profile.name==='Goblin Boss')))examine(s,a.profile.id)}
const open={bounds:{columns:4,rows:3},blockedCells:[],worldObjects:[]};console.log('OPEN4x3',JSON.stringify(approaches(open,{column:1,row:1})));
for(const gaps of [[4],[3,4],[2,6]]){const m={bounds:{columns:9,rows:9},blockedCells:Array.from({length:9},(_,row)=>({column:4,row})).filter(c=>"'!gaps.includes(c.row)),worldObjects:[]};console.log('"'GAPS',gaps,JSON.stringify(approaches(m,{column:1,row:4})))}

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 4209ms:
SEALED-APPROACHES {"cells":[{"column":2,"row":1},{"column":3,"row":1},{"column":4,"row":1},{"column":0,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":2},{"column":2,"row":3},{"column":3,"row":3},{"column":4,"row":3}],"runs":[{"axis":"v","cells":[{"column":2,"row":1},{"column":2,"row":2},{"column":2,"row":3}],"separated":true},{"axis":"v","cells":[{"column":3,"row":1},{"column":3,"row":2},{"column":3,"row":3}],"separated":true},{"axis":"v","cells":[{"column":4,"row":1},{"column":4,"row":2},{"column":4,"row":3}],"separated":true}],"component":16}
WINNER {"id":"combatant:blind-witness","name":"blind-witness","size":"Medium","origin":{"column":1,"row":2},"approaches":10,"candidates":16,"best":{"cell":{"column":1,"row":2},"cost":0,"path":[],"score":{"0":4,"1":6}},"maxima":[{"cell":{"column":1,"row":2},"cost":0},{"cell":{"column":0,"row":2},"cost":5}],"originProfile":{"0":4,"1":6}}
WINNER {"id":"combatant:generated-6209001-monster-2","name":"Deepwood Bear","size":"Large","origin":{"column":18,"row":0},"approaches":81,"candidates":60,"best":{"cell":{"column":16,"row":2},"cost":10,"path":[{"column":17,"row":1},{"column":16,"row":2}],"score":{"0":40,"5":4,"7":37}},"maxima":[{"cell":{"column":16,"row":2},"cost":10},{"cell":{"column":15,"row":2},"cost":15},{"cell":{"column":15,"row":3},"cost":15},{"cell":{"column":14,"row":2},"cost":20},{"cell":{"column":14,"row":3},"cost":20},{"cell":{"column":14,"row":4},"cost":20},{"cell":{"column":13,"row":2},"cost":25},{"cell":{"column":13,"row":3},"cost":25},{"cell":{"column":13,"row":4},"cost":25},{"cell":{"column":13,"row":5},"cost":25},{"cell":{"column":12,"row":2},"cost":30},{"cell":{"column":12,"row":3},"cost":30},{"cell":{"column":12,"row":4},"cost":30},{"cell":{"column":12,"row":5},"cost":30},{"cell":{"column":12,"row":6},"cost":30}],"originProfile":{"0":40,"1":11,"5":2,"7":28}}
WINNER {"id":"combatant:generated-6209001-monster-3","name":"Harrier Eagle","size":"Large","origin":{"column":20,"row":3},"approaches":81,"candidates":8,"best":{"cell":{"column":20,"row":4},"cost":5,"path":[{"column":20,"row":4}],"score":{"0":40,"1":3,"2":4,"5":4,"7":30}},"maxima":[{"cell":{"column":20,"row":4},"cost":5}],"originProfile":{"0":40,"1":5,"2":2,"5":4,"7":30}}
WINNER {"id":"combatant:generated-6209001-monster-4","name":"Ghast","size":"Medium","origin":{"column":19,"row":3},"approaches":81,"candidates":81,"best":{"cell":{"column":18,"row":2},"cost":5,"path":[{"column":18,"row":2}],"score":{"0":40,"5":3,"7":38}},"maxima":[{"cell":{"column":18,"row":2},"cost":5},{"cell":{"column":17,"row":2},"cost":10},{"cell":{"column":17,"row":3},"cost":10},{"cell":{"column":16,"row":2},"cost":15},{"cell":{"column":16,"row":3},"cost":15},{"cell":{"column":16,"row":4},"cost":15},{"cell":{"column":15,"row":2},"cost":20},{"cell":{"column":15,"row":3},"cost":20},{"cell":{"column":15,"row":4},"cost":20},{"cell":{"column":15,"row":5},"cost":20},{"cell":{"column":14,"row":2},"cost":25},{"cell":{"column":14,"row":3},"cost":25},{"cell":{"column":14,"row":4},"cost":25},{"cell":{"column":14,"row":5},"cost":25},{"cell":{"column":14,"row":6},"cost":25},{"cell":{"column":13,"row":2},"cost":30},{"cell":{"column":13,"row":3},"cost":30},{"cell":{"column":13,"row":4},"cost":30},{"cell":{"column":13,"row":5},"cost":30},{"cell":{"column":13,"row":6},"cost":30},{"cell":{"column":13,"row":7},"cost":30}],"originProfile":{"0":40,"1":3,"5":3,"7":35}}
WINNER {"id":"combatant:generated-6209003-monster-3","name":"Goblin Boss","size":"Small","origin":{"column":11,"row":2},"approaches":55,"candidates":31,"best":{"cell":{"column":11,"row":2},"cost":0,"path":[],"score":{"0":27,"5":3,"7":25}},"maxima":[{"cell":{"column":11,"row":2},"cost":0},{"cell":{"column":11,"row":3},"cost":5},{"cell":{"column":8,"row":5},"cost":15},{"cell":{"column":9,"row":5},"cost":15},{"cell":{"column":7,"row":2},"cost":20},{"cell":{"column":7,"row":3},"cost":20},{"cell":{"column":7,"row":4},"cost":20},{"cell":{"column":7,"row":5},"cost":20},{"cell":{"column":7,"row":6},"cost":20},{"cell":{"column":8,"row":6},"cost":20},{"cell":{"column":7,"row":7},"cost":25}],"originProfile":{"0":27,"5":3,"7":25}}
OPEN4x3 {"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":0,"row":1},{"column":3,"row":1},{"column":0,"row":2},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2}],"runs":[],"component":12}
GAPS [ 4 ] {"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":0,"row":1},{"column":8,"row":1},{"column":0,"row":2},{"column":8,"row":2},{"column":0,"row":3},{"column":8,"row":3},{"column":0,"row":4},{"column":4,"row":4},{"column":8,"row":4},{"column":0,"row":5},{"column":8,"row":5},{"column":0,"row":6},{"column":8,"row":6},{"column":0,"row":7},{"column":8,"row":7},{"column":0,"row":8},{"column":1,"row":8},{"column":2,"row":8},{"column":3,"row":8},{"column":5,"row":8},{"column":6,"row":8},{"column":7,"row":8},{"column":8,"row":8}],"runs":[{"axis":"v","cells":[{"column":4,"row":4}],"separated":true}],"component":73}
GAPS [ 3, 4 ] {"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":0,"row":1},{"column":8,"row":1},{"column":0,"row":2},{"column":8,"row":2},{"column":0,"row":3},{"column":4,"row":3},{"column":8,"row":3},{"column":0,"row":4},{"column":4,"row":4},{"column":8,"row":4},{"column":0,"row":5},{"column":8,"row":5},{"column":0,"row":6},{"column":8,"row":6},{"column":0,"row":7},{"column":8,"row":7},{"column":0,"row":8},{"column":1,"row":8},{"column":2,"row":8},{"column":3,"row":8},{"column":5,"row":8},{"column":6,"row":8},{"column":7,"row":8},{"column":8,"row":8}],"runs":[{"axis":"v","cells":[{"column":4,"row":3},{"column":4,"row":4}],"separated":true}],"component":74}
GAPS [ 2, 6 ] {"cells":[{"column":0,"row":0},{"column":1,"row":0},{"column":2,"row":0},{"column":3,"row":0},{"column":5,"row":0},{"column":6,"row":0},{"column":7,"row":0},{"column":8,"row":0},{"column":0,"row":1},{"column":8,"row":1},{"column":0,"row":2},{"column":8,"row":2},{"column":0,"row":3},{"column":8,"row":3},{"column":0,"row":4},{"column":8,"row":4},{"column":0,"row":5},{"column":8,"row":5},{"column":0,"row":6},{"column":8,"row":6},{"column":0,"row":7},{"column":8,"row":7},{"column":0,"row":8},{"column":1,"row":8},{"column":2,"row":8},{"column":3,"row":8},{"column":5,"row":8},{"column":6,"row":8},{"column":7,"row":8},{"column":8,"row":8}],"runs":[{"axis":"v","cells":[{"column":4,"row":2}],"separated":false},{"axis":"v","cells":[{"column":4,"row":6}],"separated":false}],"component":74}

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),path=require('path');
const file=path.resolve('src/vtt/turn-proposal.ts'),blind=path.resolve('src/vtt/blind-dm-contract.ts');let source=fs.readFileSync(file,'utf8');source=source.replace('export interface EngineEngagement {','export interface ExistingEngineEngagement {').replace('export interface EngineMovementObjective {',"'`export type EngineEngagement = ExistingEngineEngagement | {readonly stance:'"'pursue_indication';readonly indication:{readonly targetId:CombatantId;readonly cells:readonly GridCell[]}} | {readonly stance:'seek_cover';readonly objective:{readonly kind:'open_approach_cover';readonly policy:'blind-cover-v1'}};\\nexport interface EngineMovementObjective {"'`).replace("| { readonly kind: '"'dodge' | 'disengage' | 'dash' | 'end_turn' };\",\"| {readonly kind:'search';readonly targetId:CombatantId;readonly reliance:'sight'}\\n  | { readonly kind: 'dodge' | 'disengage' | 'dash' | 'end_turn' };\").replace(\"    | 'dodge'\",\"    | 'search'\\n    | 'dodge'\");
const blindSource=fs.readFileSync(blind,'utf8').replace(\"  'attack',\\n  'cast',\",\"  'search',\\n  'attack',\\n  'cast',\").replace(\"kind: z.enum(['dash', 'dodge',\", \"kind: z.enum(['search', 'dash', 'dodge',\");
const b2=new Set(['turn-proposal','offers/offer-declarations','intent-resolver','engine-round-session','option-modeling','offered-option-paths','blind-intent-resolver','blind-dm-contract','plan-materiality'].map(f=>'src/vtt/'+f+'.ts'));
for(const cfg of ['tsconfig.app.json','tsconfig.node.json']) {const config=ts.readConfigFile(cfg,ts.sys.readFile),parsed=ts.parseJsonConfigFileContent(config.config,ts.sys,process.cwd()),host=ts.createCompilerHost(parsed.options),read=host.readFile;host.readFile=f=>path.resolve(f)===file?source:path.resolve(f)===blind?blindSource:read(f);const ds=ts.getPreEmitDiagnostics(ts.createProgram(parsed.fileNames,parsed.options,host)),counts={},outside=[];for(const d of ds){const f=d.file?path.relative(process.cwd(),d.file.fileName):'config';counts[f]=(counts[f]||0)+1;if("'!b2.has(f))outside.push({file:f,line:d.file.getLineAndCharacterOfPosition(d.start).line+1,code:d.code,message:ts.flattenDiagnosticMessageText(d.messageText,'"' ')})}console.log(cfg,ds.length,JSON.stringify(counts));console.log('OUTSIDE-B2',outside.length,JSON.stringify(outside));}
NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc "git diff --stat b94dd732 bea24cbe && git show bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts | sed -n '70,110p'; rg -n 'function processMove|case .move.|function reconcileObservationHistory|searchMemories' src/combat/encounter.ts | head -n 18; sed -n '1,105p' src/combat/creature-space.ts; rg -n 'traceSpaces|blocksSight.*tier|comparePhysicalCornerTraces' src/combat/cover.ts | head -n 22" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
 .../unit/tools/d569-second-family-manifest.test.ts |  88 ++++++++-
 tests/unit/tools/d569-v5.test.ts                   |  35 +++-
 tests/unit/vtt/arena-basis-brutal-b.test.ts        |  22 +--
 tests/unit/vtt/arena-basis-brutal-v2.test.ts       | 220 +++++++++++++++++++++
 tests/unit/vtt/room-generator.test.ts              |  24 +--
 tools/d569-second-family-manifest.ts               |  90 +++++++--
 6 files changed, 424 insertions(+), 55 deletions(-)
    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
      sourceAnchor: mechanics.finalPosition,
    });
    return !trace.blocksSight && trace.tier !== 'total';
  });
}

function resolvedMechanicsIsProductive(
  state: EncounterState,
  mechanics: ResolvedTurnMechanics,
): boolean {
  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||
    mechanics.actionSlots.some((slot) =>
      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||
      slot.kind === 'use_world_object');
  if (!hasProductiveComponent) return false;

  // D635/D642/D643: live cohorts additionally require every targeted offensive component
  // to remain sight-clear and non-total at its resolved origin. room-generator.ts:1227's
  // generated-room predicate is intentionally stricter: it requires no cover at all.
  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));
}

function monsterHasProductiveOption(state: EncounterState, actorId: CombatantId): boolean {
  return availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).some((option) => {
    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);
    return resolution.valid && resolvedMechanicsIsProductive(state, resolution.mechanics);
  });
}

function everyLivingMonsterIsProductive(state: EncounterState): boolean {
  const planningState = freshMonsterPlanningState(state);
  return planningState.combatants
    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life === 'living')
    .every((monster) => monsterHasProductiveOption(planningState, monster.profile.id));
}

function decodedClone(state: EncounterState): EncounterState {
  return decodeEncounterStateV1(JSON.parse(JSON.stringify(state)) as unknown, 'session');
}

801:  readonly searchMemories?: readonly SearchMemory[];
913:  return state.searchMemories ?? [];
924:  const { searchMemories, alerting, ...base } = state;
929:    ...(searchMemories !== undefined && searchMemories.length > 0 ? { searchMemories } : {}),
2158:export function reconcileObservationHistory(state: EncounterState): EncounterState {
2270:        searchMemories: encounterSearchMemories(context.state).filter((memory) => memory !== existing),
2305:      searchMemories: [
2330:        searchMemories: encounterSearchMemories(context.state).filter((candidate) => candidate !== memory),
2345:      searchMemories: encounterSearchMemories(context.state).map((candidate) =>
2968:    searchMemories: encounterSearchMemories(context.state).filter((memory) =>
5192:function processMove(
5776:      case 'movement_modifier':
8274:    case 'movement_modifier':
10572:          case 'move_owned_object': {
10607:          case 'move_owned_object_group': {
10738:    case 'movement_mode': {
10767:    case 'movement_region': {
12296:    case 'move':
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { GridBounds, GridCell } from './grid';
import { feet, type Feet } from './values';
import type { CombatantId } from './values';

export type { KnownCreatureSize } from '../domain/enums';

type SizedCombatantStateBySize = {
  readonly [Size in KnownCreatureSize]: {
    readonly effectiveSize: Size;
  };
};

/** A combatant whose current mechanical size has already been established. */
export type SizedCombatantState<
  Size extends KnownCreatureSize = KnownCreatureSize,
> = SizedCombatantStateBySize[Size];

export type SqueezePair =
  | { readonly actual: 'Small'; readonly sizedFor: 'Tiny' }
  | { readonly actual: 'Medium'; readonly sizedFor: 'Small' }
  | { readonly actual: 'Large'; readonly sizedFor: 'Medium' }
  | { readonly actual: 'Huge'; readonly sizedFor: 'Large' }
  | { readonly actual: 'Gargantuan'; readonly sizedFor: 'Huge' };

export type SqueezePairFor<Size extends KnownCreatureSize> = Extract<
  SqueezePair,
  { readonly actual: Size }
>;

export type SqueezableCreatureSize = SqueezePair['actual'];
export type SqueezableSizedCombatantState = SizedCombatantState<SqueezableCreatureSize>;

const normalPlacementBrand = Symbol('NormalPlacement');
const squeezedPlacementBrand = Symbol('SqueezedPlacement');
const traversalPlacementBrand = Symbol('TraversalPlacement');
const creatureSpaceBrand = Symbol('CreatureSpace');
const brandPresent: true = true;

export interface NormalPlacement<Size extends KnownCreatureSize> {
  readonly kind: 'normal';
  readonly actual: Size;
  readonly [normalPlacementBrand]: true;
}

export interface SqueezedPlacement<Pair extends SqueezePair> {
  readonly kind: 'squeezed';
  readonly pair: Pair;
  readonly [squeezedPlacementBrand]: true;
}

export type PlacementModeFor<Size extends KnownCreatureSize> =
  | NormalPlacement<Size>
  | (Size extends SqueezableCreatureSize
      ? SqueezedPlacement<SqueezePairFor<Size>>
      : never);

export interface TraversalPlacement<
  Size extends KnownCreatureSize,
  Mode extends PlacementModeFor<Size> = PlacementModeFor<Size>,
> {
  readonly anchor: GridCell;
  readonly mode: Mode;
  readonly [traversalPlacementBrand]: true;
}

type OneCell = readonly [GridCell];
type FourCells = readonly [GridCell, GridCell, GridCell, GridCell];
type NineCells = readonly [
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
];
type SixteenCells = readonly [
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
  GridCell,
];
type ExactFootprintCells = OneCell | FourCells | NineCells | SixteenCells;

export interface CreatureSpace<
  Size extends KnownCreatureSize,
  Mode extends PlacementModeFor<Size> = PlacementModeFor<Size>,
> {
  readonly actualSize: Size;
  readonly controlledAs: KnownCreatureSize;
654:function comparePhysicalCornerTraces(left: TerrainLineTrace, right: TerrainLineTrace): number {
695:function traceSpaces(
774:    (best, candidate) => comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best,
801:  return traceSpaces(state, [sourceCell], [targetCell], options);
826:  const trace = traceSpaces(state, source.cells, combatantSpace(state, targetId).cells, {
857:  const trace = traceSpaces(state, source.cells, targetCells, {
912:    comparePhysicalCornerTraces(candidate, best) < 0 ? candidate : best, first).tier;

codex
The new aperture rule still contradicts the primary oracle. Applied literally, it treats three full-height strips of the monster’s chamber as openings: the 9×5 scene gets 10 approaches and chooses the origin, not `(3,2)`. It also rejects two separate gaps in one wall because either gap keeps the sides connected when the other is removed.

The inventory now checks out: 55 unique paths, 215 core-stage specs, and 216 after the named v2 prerequisite. The footprint-aware score changes Eagle’s winner to `(20,4)` at 5 feet; Bear, Ghast, and Goblin Boss retain their prior destinations and costs.

exec
/bin/bash -lc "rg -n \"blocksSight: true|tier: 'none'|tier: 'half'|sealed\" tests/unit/combat/creature-cover.test.ts tests/unit/combat/terrain.test.ts | tail -n 35; sed -n '1,48p' src/vtt/offer-environment.ts; sed -n '60,100p' src/vtt/offers/build-offer-environment.ts; sed -n '45,92p' tests/unit/vtt/arena-basis-brutal-b.test.ts; git show bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts | sed -n '125,218p'" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
tests/unit/combat/terrain.test.ts:58:      { kind: 'wall', inverse: 'wall', profile: expect.objectContaining({ coverTier: 'total', passability: 'blocked', blocksSight: true }) },
tests/unit/combat/terrain.test.ts:96:      tier: 'half', blocksSight: false, sourceIds: ['object:object:low-strip'],
tests/unit/combat/terrain.test.ts:126:      tier: 'half', blocksSight: false, sourceIds: ['blocked:2,0'], firstBlockingCell: null,
tests/unit/combat/terrain.test.ts:139:      tier: 'total', blocksSight: true, sourceIds: ['blocked:1,0', 'blocked:1,1'],
tests/unit/combat/terrain.test.ts:168:      .toMatchObject({ tier: 'none', blocksSight: false, sourceIds: [] });
tests/unit/combat/terrain.test.ts:181:      sourceCorner: { column: 1, row: 0 }, tier: 'none', blocksSight: false,
tests/unit/combat/terrain.test.ts:207:      { tier: 'half', blocksSight: false },
tests/unit/combat/terrain.test.ts:208:      { tier: 'half', blocksSight: false },
tests/unit/combat/creature-cover.test.ts:39:      tier: 'half',
tests/unit/combat/creature-cover.test.ts:56:      tier: 'half',
tests/unit/combat/creature-cover.test.ts:67:      tier: 'none', sourceIds: [],
tests/unit/combat/creature-cover.test.ts:91:      sourceCorner: { column: 0, row: 0 }, tier: 'none', blocksSight: false,
tests/unit/combat/creature-cover.test.ts:112:      tier: 'half', blocksSight: false,
sed: can't read src/vtt/offer-environment.ts: No such file or directory
  }
  if (input.mode === 'legacy_standard') {
    exactKeys(input, ['kind', 'mode'], 'Offer environment configuration');
    return new RuntimeOfferEnvironment(createLegacyEngineOptionEnvironmentBinding());
  }
  if (input.mode !== 'revision_bound') {
    throw new TypeError('Offer environment configuration has an invalid shape.');
  }
  exactKeys(
    input,
    ['kind', 'mode', 'familyPolicy', 'partyThreatCatalog'],
    'Offer environment configuration',
  );
  const familyPolicy = decodeEngineOfferFamilyPolicy(input.familyPolicy);
  const partyThreatCatalog = decodePartyThreatCatalog(input.partyThreatCatalog);
  const binding = createEngineOptionEnvironmentBinding({
    format: ENGINE_OPTION_ENVIRONMENT_FORMAT,
    mode: 'revision_bound',
    familyPolicy,
    partyThreatCatalog,
  });
  return new RuntimeOfferEnvironment(binding);
}
  'tests/fixtures/arena-basis-brutal-b/seed-6206001.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206002.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206003.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206004.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206005.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206006.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206007.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206008.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206009.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206010.json',
] as const;

const HARD_EXECUTION_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-hard/seed-5117001.json',
  'tests/fixtures/arena-basis-hard/seed-5117002.json',
  'tests/fixtures/arena-basis-hard/seed-5117003.json',
  'tests/fixtures/arena-basis-hard/seed-5117004.json',
  'tests/fixtures/arena-basis-hard/seed-5117005.json',
  'tests/fixtures/arena-basis-hard/seed-5117006.json',
  'tests/fixtures/arena-basis-hard/seed-5117007.json',
  'tests/fixtures/arena-basis-hard/seed-5117008.json',
  'tests/fixtures/arena-basis-hard/seed-5117009.json',
  'tests/fixtures/arena-basis-hard/seed-5117010.json',
  'tests/fixtures/arena-basis-hard/seed-5117011.json',
  'tests/fixtures/arena-basis-hard/seed-5117012.json',
  'tests/fixtures/arena-basis-hard/seed-5117013.json',
] as const;

const BRUTAL_EXECUTION_FIXTURE_PATHS = [
  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json',
  'tests/fixtures/arena-basis-brutal/seed-6203004.json',
  'tests/fixtures/arena-basis-brutal/seed-6203005.json',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json',
  'tests/fixtures/arena-basis-brutal/seed-6203007.json',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json',
] as const;

const EXECUTION_FIXTURE_PATHS = [
  ...HARD_EXECUTION_FIXTURE_PATHS,
  ...BRUTAL_EXECUTION_FIXTURE_PATHS,
  ...FIXTURE_PATHS,
] as const;

const EXECUTION_FIXTURE_FAMILIES = [
  };
}

function openWebState(): {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
} {
  const base = monsterCombatantProfile(GIANT_SPIDER, {
    combatantId: 'combatant:active-productivity-spider',
    tokenId: 'token:active-productivity-spider',
  });
  const actor = { ...base, rules: { ...base.rules, speed: feet(0) } };
  const target = playerProfile('active-productivity-web-target');
  return {
    state: freshMonsterPlanningState(decodedClone(createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],
    }))),
    actorId: actor.id,
    targetId: target.id,
  };
}

describe('active brutal v2 arena membership', () => {
  it('reserves exactly three contiguous ten-seed fixture families', () => {
    expect(ACTIVE_FIXTURES).toHaveLength(30);
    expect(ACTIVE_FIXTURES.map(({ seed }) => seed)).toEqual([
      ...Array.from({ length: 10 }, (_unused, index) => 6_209_001 + index),
      ...Array.from({ length: 10 }, (_unused, index) => 6_210_001 + index),
      ...Array.from({ length: 10 }, (_unused, index) => 6_211_001 + index),
    ]);
    expect(new Set(ACTIVE_FIXTURES.map(({ path }) => path))).toHaveLength(30);
  });

  it.each(ACTIVE_FIXTURES)(
    '$family seed $seed satisfies active state-derived membership at $path',
    ({ path, seed }) => {
      const fixtureBytes = inputs.fixtures.readText(path);
      const room = JSON.parse(fixtureBytes) as GeneratedRoom;
      const decoded = decodeArenaFixtureText(fixtureBytes);

      expect(room.spec.seed).toBe(seed);
      expect(generatedRoomIntegrityViolations(room, fixtureBytes)).toEqual([]);
      expect(brutalRoomMembershipViolations(room)
        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);
      expect(everyLivingMonsterIsProductive(decoded)).toBe(true);
    },
  );

  it('rejects a living monster whose only valid options are nonproductive', () => {
    const fixture = actionlessMonsterState(0);
    expect(fixture.state.combatants.find((entry) => entry.profile.id === fixture.actorId)?.life)
      .toBe('living');
    expect(availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
      .map(({ label }) => label)).toEqual(['Dodge', 'End Turn']);
    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(false);
  });

  it('keeps a positive-movement-only Dash monster productive', () => {
    const fixture = actionlessMonsterState(30);
    const resolved = availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
      .map((option) => ({ option, resolution: resolveEngineActorOption(
        fixture.state,
        option,
        OFFER_ENVIRONMENT,
      ) }));
    const dash = resolved.find(({ option }) => option.label === 'Dash');
    if (dash === undefined || !dash.resolution.valid) throw new Error('Dash witness did not resolve.');

    expect(dash.resolution.mechanics.movementCostFeet).toBeGreaterThan(0);
    expect(dash.resolution.mechanics.actionSlots.map(({ kind }) => kind)).toEqual(['dash']);
    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(true);
  });

  it('rejects targeted offense whose resolved origin has an optically blocked trace', () => {
    const fixture = openWebState();
    const web = availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)
      .find((option) => option.actionSlots.some((slot) =>
        slot.use.kind === 'saving_throw' && slot.use.actionId === 'web'));
    if (web === undefined) throw new Error('Blocked-target witness omitted Web.');
    const resolution = resolveEngineActorOption(fixture.state, web, OFFER_ENVIRONMENT);
    if (!resolution.valid) throw new Error('Blocked-target witness could not resolve Web.');

    const blocked = decodedClone({
      ...fixture.state,
      blockedCells: Array.from({ length: 3 }, (_unused, row) => ({ column: 3, row })),
    });
    expect(traceCombatantLine(blocked, fixture.actorId, fixture.targetId, {
      sourceAnchor: resolution.mechanics.finalPosition,
    })).toMatchObject({ tier: 'half', blocksSight: true });
    expect(resolvedMechanicsIsProductive(fixture.state, resolution.mechanics)).toBe(true);
    expect(resolvedMechanicsIsProductive(blocked, resolution.mechanics)).toBe(false);

 succeeded in 39830ms:
tsconfig.app.json 15 {"src/vtt/blind-intent-resolver.ts":2,"src/vtt/dm-tactical-intel.ts":2,"src/vtt/intel/opportunity-cost.ts":1,"src/vtt/intel/option-outcome.ts":1,"src/vtt/intent-resolver.ts":4,"src/vtt/mcp/engine-server.ts":1,"src/vtt/offered-option-paths.ts":1,"src/vtt/option-modeling.ts":1,"src/vtt/plan-materiality.ts":1,"src/vtt/snippets/registry.ts":1}
OUTSIDE-B2 6 [{"file":"src/vtt/dm-tactical-intel.ts","line":103,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":122,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/opportunity-cost.ts","line":97,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/option-outcome.ts","line":605,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/mcp/engine-server.ts","line":906,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/snippets/registry.ts","line":135,"code":2322,"message":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly CombatantId[]'.   Type 'CombatantId | undefined' is not assignable to type 'CombatantId'.     Type 'undefined' is not assignable to type 'CombatantId'.       Type 'undefined' is not assignable to type 'string'."}]
tsconfig.node.json 17 {"src/vtt/blind-intent-resolver.ts":2,"src/vtt/dm-tactical-intel.ts":2,"src/vtt/intel/opportunity-cost.ts":1,"src/vtt/intel/option-outcome.ts":1,"src/vtt/intent-resolver.ts":4,"src/vtt/mcp/engine-server.ts":1,"src/vtt/offered-option-paths.ts":1,"src/vtt/option-modeling.ts":1,"src/vtt/plan-materiality.ts":1,"src/vtt/snippets/registry.ts":1,"tests/unit/vtt/snippets.test.ts":2}
OUTSIDE-B2 8 [{"file":"src/vtt/dm-tactical-intel.ts","line":103,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":122,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/opportunity-cost.ts","line":97,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/option-outcome.ts","line":605,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/mcp/engine-server.ts","line":906,"code":2366,"message":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/snippets/registry.ts","line":135,"code":2322,"message":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly CombatantId[]'.   Type 'CombatantId | undefined' is not assignable to type 'CombatantId'.     Type 'undefined' is not assignable to type 'CombatantId'.       Type 'undefined' is not assignable to type 'string'."},{"file":"tests/unit/vtt/snippets.test.ts","line":83,"code":2345,"message":"Argument of type '(this: undefined, slot: EngineActionSlotUse) => EngineSpellId[] | EngineActionId[] | (\"dash\" | \"disengage\" | \"hide\" | \"dodge\" | \"end_turn\")[] | undefined' is not assignable to parameter of type '(this: undefined, value: EngineActionSlotUse, index: number, array: EngineActionSlotUse[]) => string | readonly string[]'.   Type 'EngineSpellId[] | EngineActionId[] | (\"dash\" | \"disengage\" | \"hide\" | \"dodge\" | \"end_turn\")[] | undefined' is not assignable to type 'string | readonly string[]'.     Type 'undefined' is not assignable to type 'string | readonly string[]'."},{"file":"tests/unit/vtt/snippets.test.ts","line":101,"code":2322,"message":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly string[]'.   Type 'CombatantId | undefined' is not assignable to type 'string'.     Type 'undefined' is not assignable to type 'string'."}]

exec
/bin/bash -lc "REVIEW_VARIANT=base node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

let encounterSource=fs.readFileSync('src/combat/encounter.ts','utf8');
if(process.env.REVIEW_VARIANT"'!=='"'base'){encounterSource=encounterSource.replace(\"if (prior?.seen "'!== true && !hiddenNow) continue;","if (prior?.seen !== true) continue;");if(process.env.REVIEW_VARIANT!=='"'fallback_mutant')encounterSource=encounterSource.replace(\"lastKnownPosition: prior?.targetPosition ?? current.targetPosition,\",\"lastKnownPosition: prior.targetPosition,\");global.overlay=new Map([[path.resolve('src/combat/encounter.ts'),encounterSource]])}
const {createEncounter,reduceEncounter}=require('./src/combat/encounter.ts'),{projectActorKnowledge}=require('./src/vtt/intel/actor-knowledge.ts'),{monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const rng=()=>0.975,pc=playerProfile('memory-pc',{initiativeBonus:20}),monster=monsterProfile('memory-monster',{initiativeBonus:-20});
function obsc(s){return reduceEncounter(s,{type:'world_operation',actor:null,cost:'none',operation:{kind:'set_obscurement',region:{id:'review-heavy',cells:[2,3,4,5].map(column=>({column,row:2}))},obscurement:'heavy'}},rng).state}
function initial(blocked){return reduceEncounter(createEncounter({bounds:{columns:7,rows:5},combatants:[pc,monster],tokens:[placedToken(pc,2,2),placedToken(monster,0,2)],blockedCells:blocked?Array.from({length:5},(_,row)=>({column:1,row})):[]}),{type:'roll_initiative'},rng).state}
let never=obsc(initial(true));never=reduceEncounter(never,{type:'hide',actor:pc.id},rng).state;
console.log('NEVER',process.env.REVIEW_VARIANT,JSON.stringify({knowledge:projectActorKnowledge(never,monster.id).targets,memories:never.searchMemories??[]}));
let s=obsc(initial(false));const before=s.searchMemories;s=reduceEncounter(s,{type:'move',actor:pc.id,path:[{column:3,row:2}],cause:'voluntary'},rng).state;s=reduceEncounter(s,{type:'hide',actor:pc.id},rng).state;
console.log('MOVED-HIDE',process.env.REVIEW_VARIANT,JSON.stringify({before:before?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round})),after:s.searchMemories?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round}))}));
for(let i=0;i<2;i++)s=reduceEncounter(s,{type:'end_turn',actor:s.activeCombatant},rng).state;
s=reduceEncounter(s,{type:'move',actor:pc.id,path:[{column:4,row:2}],cause:'voluntary'},rng).state;s=reduceEncounter(s,{type:'hide',actor:pc.id},rng).state;
console.log('REPEAT',process.env.REVIEW_VARIANT,JSON.stringify({round:s.round,memories:s.searchMemories?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round,radius:m.suspicion.radius}))}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc "REVIEW_VARIANT=repair node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

let encounterSource=fs.readFileSync('src/combat/encounter.ts','utf8');
if(process.env.REVIEW_VARIANT"'!=='"'base'){encounterSource=encounterSource.replace(\"if (prior?.seen "'!== true && !hiddenNow) continue;","if (prior?.seen !== true) continue;");if(process.env.REVIEW_VARIANT!=='"'fallback_mutant')encounterSource=encounterSource.replace(\"lastKnownPosition: prior?.targetPosition ?? current.targetPosition,\",\"lastKnownPosition: prior.targetPosition,\");global.overlay=new Map([[path.resolve('src/combat/encounter.ts'),encounterSource]])}
const {createEncounter,reduceEncounter}=require('./src/combat/encounter.ts'),{projectActorKnowledge}=require('./src/vtt/intel/actor-knowledge.ts'),{monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const rng=()=>0.975,pc=playerProfile('memory-pc',{initiativeBonus:20}),monster=monsterProfile('memory-monster',{initiativeBonus:-20});
function obsc(s){return reduceEncounter(s,{type:'world_operation',actor:null,cost:'none',operation:{kind:'set_obscurement',region:{id:'review-heavy',cells:[2,3,4,5].map(column=>({column,row:2}))},obscurement:'heavy'}},rng).state}
function initial(blocked){return reduceEncounter(createEncounter({bounds:{columns:7,rows:5},combatants:[pc,monster],tokens:[placedToken(pc,2,2),placedToken(monster,0,2)],blockedCells:blocked?Array.from({length:5},(_,row)=>({column:1,row})):[]}),{type:'roll_initiative'},rng).state}
let never=obsc(initial(true));never=reduceEncounter(never,{type:'hide',actor:pc.id},rng).state;
console.log('NEVER',process.env.REVIEW_VARIANT,JSON.stringify({knowledge:projectActorKnowledge(never,monster.id).targets,memories:never.searchMemories??[]}));
let s=obsc(initial(false));const before=s.searchMemories;s=reduceEncounter(s,{type:'move',actor:pc.id,path:[{column:3,row:2}],cause:'voluntary'},rng).state;s=reduceEncounter(s,{type:'hide',actor:pc.id},rng).state;
console.log('MOVED-HIDE',process.env.REVIEW_VARIANT,JSON.stringify({before:before?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round})),after:s.searchMemories?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round}))}));
for(let i=0;i<2;i++)s=reduceEncounter(s,{type:'end_turn',actor:s.activeCombatant},rng).state;
s=reduceEncounter(s,{type:'move',actor:pc.id,path:[{column:4,row:2}],cause:'voluntary'},rng).state;s=reduceEncounter(s,{type:'hide',actor:pc.id},rng).state;
console.log('REPEAT',process.env.REVIEW_VARIANT,JSON.stringify({round:s.round,memories:s.searchMemories?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round,radius:m.suspicion.radius}))}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc "REVIEW_VARIANT=fallback_mutant node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

let encounterSource=fs.readFileSync('src/combat/encounter.ts','utf8');
if(process.env.REVIEW_VARIANT"'!=='"'base'){encounterSource=encounterSource.replace(\"if (prior?.seen "'!== true && !hiddenNow) continue;","if (prior?.seen !== true) continue;");if(process.env.REVIEW_VARIANT!=='"'fallback_mutant')encounterSource=encounterSource.replace(\"lastKnownPosition: prior?.targetPosition ?? current.targetPosition,\",\"lastKnownPosition: prior.targetPosition,\");global.overlay=new Map([[path.resolve('src/combat/encounter.ts'),encounterSource]])}
const {createEncounter,reduceEncounter}=require('./src/combat/encounter.ts'),{projectActorKnowledge}=require('./src/vtt/intel/actor-knowledge.ts'),{monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const rng=()=>0.975,pc=playerProfile('memory-pc',{initiativeBonus:20}),monster=monsterProfile('memory-monster',{initiativeBonus:-20});
function obsc(s){return reduceEncounter(s,{type:'world_operation',actor:null,cost:'none',operation:{kind:'set_obscurement',region:{id:'review-heavy',cells:[2,3,4,5].map(column=>({column,row:2}))},obscurement:'heavy'}},rng).state}
function initial(blocked){return reduceEncounter(createEncounter({bounds:{columns:7,rows:5},combatants:[pc,monster],tokens:[placedToken(pc,2,2),placedToken(monster,0,2)],blockedCells:blocked?Array.from({length:5},(_,row)=>({column:1,row})):[]}),{type:'roll_initiative'},rng).state}
let never=obsc(initial(true));never=reduceEncounter(never,{type:'hide',actor:pc.id},rng).state;
console.log('NEVER',process.env.REVIEW_VARIANT,JSON.stringify({knowledge:projectActorKnowledge(never,monster.id).targets,memories:never.searchMemories??[]}));
let s=obsc(initial(false));const before=s.searchMemories;s=reduceEncounter(s,{type:'move',actor:pc.id,path:[{column:3,row:2}],cause:'voluntary'},rng).state;s=reduceEncounter(s,{type:'hide',actor:pc.id},rng).state;
console.log('MOVED-HIDE',process.env.REVIEW_VARIANT,JSON.stringify({before:before?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round})),after:s.searchMemories?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round}))}));
for(let i=0;i<2;i++)s=reduceEncounter(s,{type:'end_turn',actor:s.activeCombatant},rng).state;
s=reduceEncounter(s,{type:'move',actor:pc.id,path:[{column:4,row:2}],cause:'voluntary'},rng).state;s=reduceEncounter(s,{type:'hide',actor:pc.id},rng).state;
console.log('REPEAT',process.env.REVIEW_VARIANT,JSON.stringify({round:s.round,memories:s.searchMemories?.map(m=>({cause:m.cause,center:m.lastKnownPosition,lost:m.lostAtRound,expires:m.expires.round,radius:m.suspicion.radius}))}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2255ms:
NEVER fallback_mutant {"knowledge":[{"kind":"unknown","targetId":"combatant:memory-pc","lastSeen":{"status":"unresolved","reason":"never_observed"}}],"memories":[]}
MOVED-HIDE fallback_mutant {"before":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4}],"after":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4}]}
REPEAT fallback_mutant {"round":2,"memories":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4,"radius":5}]}

 succeeded in 2494ms:
NEVER base {"knowledge":[{"kind":"unknown","targetId":"combatant:memory-pc","lastSeen":{"status":"unresolved","reason":"never_observed"}}],"memories":[{"policy":"search-memory-v1","observer":"combatant:memory-monster","target":"combatant:memory-pc","cause":"hiding","lastKnownPosition":{"column":2,"row":2},"lostAtRound":1,"lastExpandedRound":1,"expires":{"kind":"start_of_round","round":4},"suspicion":{"kind":"grid_radius","center":{"column":2,"row":2},"radius":0,"cells":[{"column":2,"row":2}]},"legalOptions":[{"kind":"move_and_search","target":"combatant:memory-pc","searchCitation":"docs/srd/full/srd-5.2.1.txt:12016-12027"},{"kind":"ready_action","target":"combatant:memory-pc","readyCitation":"docs/srd/full/srd-5.2.1.txt:11997-12015"},{"kind":"attack_suspected_square","target":"combatant:memory-pc","cells":[{"column":2,"row":2}],"rollMode":"disadvantage","unseenTargetCitation":"docs/srd/full/srd-5.2.1.txt:884-889"},{"kind":"area_effect_over_region","target":"combatant:memory-pc","cells":[{"column":2,"row":2}]}]}]}
MOVED-HIDE base {"before":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4}],"after":[{"cause":"hiding","center":{"column":3,"row":2},"lost":1,"expires":4}]}
REPEAT base {"round":2,"memories":[{"cause":"hiding","center":{"column":4,"row":2},"lost":2,"expires":5,"radius":0}]}

 succeeded in 2496ms:
NEVER repair {"knowledge":[{"kind":"unknown","targetId":"combatant:memory-pc","lastSeen":{"status":"unresolved","reason":"never_observed"}}],"memories":[]}
MOVED-HIDE repair {"before":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4}],"after":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4}]}
REPEAT repair {"round":2,"memories":[{"cause":"obscurement","center":{"column":2,"row":2},"lost":1,"expires":4,"radius":5}]}

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const evaluated=[];const compile=Module.prototype._compile;Module.prototype._compile=function(code,filename){evaluated.push(path.relative(process.cwd(),filename));return compile.call(this,code,filename)};
const {generateRoom}=require('./src/vtt/room-generator.ts'),{canonicalJson}=require('./src/commands/canonical-json.ts'),{createHash}=require('crypto');
const hash=s=>createHash('sha256').update(s).digest('hex');let rooms=0,repeatEqual=0,trackedEqual=0;const hashes=[];
for(const family of ['hard','brutal','brutal-b','brutal-2'])for(const f of fs.readdirSync('tests/fixtures/arena-basis-'+family).filter(f=>/"'^seed-.*'"\\.json"'$/.test(f))){const seed=Number(f.match(/'"\\d+/)[0]),file='tests/fixtures/arena-basis-'+family+'/'+f;hashes.push([file,hash(fs.readFileSync(file))]);const a=canonicalJson(generateRoom(seed,{difficulty:family==='hard'?'hard':'brutal'}))+'\\n',b=canonicalJson(generateRoom(seed,{difficulty:family==='hard'?'hard':'brutal'}))+'\\n';rooms++;if(a===b)repeatEqual++;if(a===fs.readFileSync(file,'utf8'))trackedEqual++}
console.log(JSON.stringify({rooms,repeatEqual,trackedEqual,trackedHashesStable:hashes.filter(([f,h])=>hash(fs.readFileSync(f))===h).length,forbiddenEvaluated:evaluated.filter(f=>['src/vtt/offers/offer-declarations.ts','src/vtt/intent-resolver.ts','src/vtt/turn-proposal.ts','src/vtt/option-modeling.ts'].includes(f))}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2262ms:
{"rooms":43,"repeatEqual":43,"trackedEqual":0,"trackedHashesStable":43,"forbiddenEvaluated":[]}

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {generateRoom}=require('./src/vtt/room-generator.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {combatantSpaceAt,createEncounter}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),key=c=>c.column+','+c.row,cell=k=>{const [column,row]=k.split(',').map(Number);return {column,row}};
function neighbors(c){return [{column:c.column-1,row:c.row},{column:c.column+1,row:c.row},{column:c.column,row:c.row-1},{column:c.column,row:c.row+1}]}
function component(pass,seed,removed=new Set()){const result=new Set(),queue=[seed];for(const c of queue){const k=key(c);if(result.has(k)||"'!pass.has(k)||removed.has(k))continue;result.add(k);queue.push(...neighbors(c))}return result}
function approaches(s,origin){const pass=new Set(),walls=new Set(terrainWallCells(s).map(key));for(let row=0;row<s.bounds.rows;row++)for(let column=0;column<s.bounds.columns;column++){const c={column,row};if(terrainPassabilityAt(s,c)!=='"'blocked')pass.add(key(c))}
const C=component(pass,origin),doorAll=new Set(s.worldObjects.filter(o=>o.kind==='door').flatMap(o=>o.footprint.map(key))),openDoors=new Set(s.worldObjects.filter(o=>o.kind==='door'&&"'!o.blocking.movement).flatMap(o=>o.footprint.map(key))),out=new Set([...C].filter(k=>{const c=cell(k);return c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1||openDoors.has(k)})),runs=[];
for(const axis of ['"'v','h']){const step=axis==='v'?{column:0,row:1}:{column:1,row:0},side=axis==='v'?{column:1,row:0}:{column:0,row:1},add=(a,b,n=1)=>({column:a.column+b.column*n,row:a.row+b.row*n});
const eligible=new Set([...C].filter(k=>{const c=cell(k);return "'!doorAll.has(k)&&pass.has(key(add(c,side)))&&pass.has(key(add(c,side,-1)))}));
for(const k of eligible){const first=cell(k);if(eligible.has(key(add(first,step,-1))))continue;let run=[],cur=first;while(eligible.has(key(cur))){run.push(cur);cur=add(cur,step)}if(!walls.has(key(add(first,step,-1)))||!walls.has(key(cur)))continue;const removed=new Set(run.map(key)),left=run.map(c=>add(c,side,-1)),right=run.map(c=>add(c,side)),lComp=component(C,left[0],removed);const separated=left.every(c=>lComp.has(key(c)))&&right.every(c=>!lComp.has(key(c)));runs.push({axis,cells:run,separated});if(separated)run.forEach(c=>out.add(key(c)))}}
return {cells:[...out].map(cell).sort((a,b)=>a.row-b.row||a.column-b.column),runs,component:C.size}}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0}
function score(s,foot,ap){return ap.map(a=>Math.min(...foot.map(c=>{const t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3})[t.tier]}))).sort((a,b)=>a-b)}
function histogram(a){return Object.fromEntries([...new Set(a)].map(n=>[n,a.filter(v=>v===n).length]))}
function examine(s,id){const actor=s.combatants.find(c=>c.profile.id===id),origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin).cells,rows=[];for(let row=0;row<s.bounds.rows;row++)for(let column=0;column<s.bounds.columns;column++){const c={column,row},p=env.queries.path(s,{actorId:id,destination:c,movement:'"'normal'});if("'!p.legal)continue;const foot=combatantSpaceAt(s,id,c).cells;rows.push({cell:c,cost:p.costFeet,path:p.cells,score:score(s,foot,ap)})}rows.sort((a,b)=>compare(b.score,a.score)||(key(a.cell)===key(origin)?-1:key(b.cell)===key(origin)?1:0)||a.cost-b.cost||a.cell.row-b.cell.row||a.cell.column-b.cell.column);const best=rows[0];console.log('"'WINNER',JSON.stringify({id,name:actor.profile.name,size:actor.profile.rules.sizeCategory,origin,approaches:ap.length,candidates:rows.length,best:{...best,score:histogram(best.score)},maxima:rows.filter(c=>compare(c.score,best.score)===0).map(c=>({cell:c.cell,cost:c.cost})),originProfile:histogram(rows.find(c=>key(c.cell)===key(origin)).score)}));return {ap,rows,best}}
const actor=monsterProfile('blind-witness'),pc=playerProfile('sealed-pc');
const blocked=[];for(let row=0;row<5;row++)for(let column=0;column<9;column++)if((row===0||row===4||column===0||column===8||column===6)&&"'!(column===0&&row===2))blocked.push({column,row});
const obj={id:'"'world-object:half',name:'Half cover',kind:'cover',position:{column:2,row:2},footprint:[{column:2,row:2}],durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking('half_cover')};
const scene=freshMonsterPlanningState(createEncounter({bounds:{columns:9,rows:5},combatants:[actor,pc],tokens:[placedToken(actor,1,2),placedToken(pc,7,2)],blockedCells:blocked,worldObjects:[obj]}));

const sealed={bounds:{columns:5,rows:5},blockedCells:[],worldObjects:[]};for(let row=0;row<5;row++)for(let column=0;column<5;column++)if(row===0||row===4||column===0||column===4)sealed.blockedCells.push({column,row});console.log('FULLY-SEALED',JSON.stringify(approaches(sealed,{column:1,row:1})));
for(const closed of [false,true]){const m={bounds:{columns:7,rows:5},blockedCells:Array.from({length:5},(_,row)=>({column:3,row})).filter(c=>c.row"'!==2),worldObjects:[{...obj,kind:'"'door',position:{column:3,row:2},footprint:[{column:3,row:2}],blocking:terrainBlocking(closed?'wall':'open')}]};const ap=approaches(m,{column:1,row:2});console.log('DOOR',closed?'closed':'open',JSON.stringify({count:ap.cells.length,containsDoor:ap.cells.some(c=>c.column===3&&c.row===2),runs:ap.runs}));}
const before=examine(scene,actor.id),relocated={...scene,tokens:scene.tokens.map(t=>t.combatantId===pc.id?{...t,position:{column:7,row:3}}:t)},after=examine(relocated,actor.id);console.log('RELOCATION-EQUAL',JSON.stringify(before)===JSON.stringify(after));
console.log('COMPARATOR',{maximinB:compare([1,1],[0,2])>0,sumTie:1+1===0+2,opticalC:compare([4],[2])>0,footprintMinimum:Math.min(1,0,1,0)});
const intended=[{column:3,row:2,cost:10},{column:4,row:2,cost:15},{column:5,row:2,cost:20}];for(const pcCell of [{column:7,row:1},{column:7,row:2},{column:7,row:3}]){const direction=Math.sign(pcCell.column-1),mutant=[...intended].sort((a,b)=>a.cost-b.cost||-direction*(a.column-b.column)||a.row-b.row);console.log('DIRECTION-TIE-MUTANT',pcCell,mutant[0])}

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2311ms:
FULLY-SEALED {"cells":[{"column":2,"row":1},{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2},{"column":2,"row":3}],"runs":[{"axis":"v","cells":[{"column":2,"row":1},{"column":2,"row":2},{"column":2,"row":3}],"separated":true},{"axis":"h","cells":[{"column":1,"row":2},{"column":2,"row":2},{"column":3,"row":2}],"separated":true}],"component":9}
DOOR open {"count":19,"containsDoor":true,"runs":[]}
DOOR closed {"count":9,"containsDoor":false,"runs":[]}
WINNER {"id":"combatant:blind-witness","name":"blind-witness","size":"Medium","origin":{"column":1,"row":2},"approaches":10,"candidates":16,"best":{"cell":{"column":1,"row":2},"cost":0,"path":[],"score":{"0":4,"1":6}},"maxima":[{"cell":{"column":1,"row":2},"cost":0},{"cell":{"column":0,"row":2},"cost":5}],"originProfile":{"0":4,"1":6}}
WINNER {"id":"combatant:blind-witness","name":"blind-witness","size":"Medium","origin":{"column":1,"row":2},"approaches":10,"candidates":16,"best":{"cell":{"column":1,"row":2},"cost":0,"path":[],"score":{"0":4,"1":6}},"maxima":[{"cell":{"column":1,"row":2},"cost":0},{"cell":{"column":0,"row":2},"cost":5}],"originProfile":{"0":4,"1":6}}
RELOCATION-EQUAL true
COMPARATOR { maximinB: true, sumTie: true, opticalC: true, footprintMinimum: 0 }
DIRECTION-TIE-MUTANT { column: 7, row: 1 } { column: 3, row: 2, cost: 10 }
DIRECTION-TIE-MUTANT { column: 7, row: 2 } { column: 3, row: 2, cost: 10 }
DIRECTION-TIE-MUTANT { column: 7, row: 3 } { column: 3, row: 2, cost: 10 }

exec
/bin/bash -lc "git ls-tree -r --name-only bea24cbe tests/fixtures/arena-basis-brutal-v2 tests/fixtures/arena-basis-brutal-b-v2 tests/fixtures/arena-basis-brutal-2-v2; sed -n '1,74p' <(git show bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts); sed -n '272,286p' tools/d569-second-family-manifest.ts; sed -n '1,70p' tests/unit/vtt/blind-dm-contract.test.ts; sed -n '1,28p' src/vtt/intent-resolver.ts; sed -n '1060,1079p' src/vtt/engine-query-port.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { traceCombatantLine } from '../../../src/combat/cover';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { GIANT_SPIDER } from '../../../src/combat/statblocks/wild-beasts';
import { feet, type CombatantId } from '../../../src/combat/values';
import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';
import {
  availableEngineActorOptions,
  resolveEngineActorOption,
  type ResolvedActionSlotUse,
  type ResolvedTurnMechanics,
} from '../../../src/vtt/intent-resolver';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';
import type { GeneratedRoom } from '../../../src/vtt/room-generator';
import {
  brutalRoomMembershipViolations,
  generatedRoomIntegrityViolations,
} from '../../../tools/d569-second-family-manifest';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const ACTIVE_FIXTURES = [
  { family: 'brutal-v2', seed: 6_209_001, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' },
  { family: 'brutal-v2', seed: 6_209_002, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' },
  { family: 'brutal-v2', seed: 6_209_003, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' },
  { family: 'brutal-v2', seed: 6_209_004, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' },
  { family: 'brutal-v2', seed: 6_209_005, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' },
  { family: 'brutal-v2', seed: 6_209_006, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' },
  { family: 'brutal-v2', seed: 6_209_007, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' },
  { family: 'brutal-v2', seed: 6_209_008, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' },
  { family: 'brutal-v2', seed: 6_209_009, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' },
  { family: 'brutal-v2', seed: 6_209_010, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' },
  { family: 'brutal-b-v2', seed: 6_210_001, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json' },
  { family: 'brutal-b-v2', seed: 6_210_002, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json' },
  { family: 'brutal-b-v2', seed: 6_210_003, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json' },
  { family: 'brutal-b-v2', seed: 6_210_004, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json' },
  { family: 'brutal-b-v2', seed: 6_210_005, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json' },
  { family: 'brutal-b-v2', seed: 6_210_006, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json' },
  { family: 'brutal-b-v2', seed: 6_210_007, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json' },
  { family: 'brutal-b-v2', seed: 6_210_008, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json' },
  { family: 'brutal-b-v2', seed: 6_210_009, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json' },
  { family: 'brutal-b-v2', seed: 6_210_010, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json' },
  { family: 'brutal-2-v2', seed: 6_211_001, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json' },
  { family: 'brutal-2-v2', seed: 6_211_002, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json' },
  { family: 'brutal-2-v2', seed: 6_211_003, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json' },
  { family: 'brutal-2-v2', seed: 6_211_004, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json' },
  { family: 'brutal-2-v2', seed: 6_211_005, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json' },
  { family: 'brutal-2-v2', seed: 6_211_006, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json' },
  { family: 'brutal-2-v2', seed: 6_211_007, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json' },
  { family: 'brutal-2-v2', seed: 6_211_008, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json' },
  { family: 'brutal-2-v2', seed: 6_211_009, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json' },
  { family: 'brutal-2-v2', seed: 6_211_010, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json' },
] as const;

const inputs = declareTestInputs({ fixtures: ACTIVE_FIXTURES.map(({ path }) => path) });
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

function targetedOffenseHasOpenTrace(
  state: EncounterState,
  mechanics: ResolvedTurnMechanics,
  slot: ResolvedActionSlotUse,
): boolean {
  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {
    return true;
  }
  return slot.targetIds.every((targetId) => {
    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {
      sourceAnchor: mechanics.finalPosition,
    });
    return !trace.blocksSight && trace.tier !== 'total';
  });
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
import { describe, expect, it } from 'vitest';
import {
  BLIND_INTENT_REJECTION_CODES,
  BLIND_INTENT_VERSION,
  BLIND_MAX_ATTEMPTS_DEFAULT,
  BLIND_REPAIR_ARMS,
  COMPASS_DIRECTIONS,
  DM_MODES,
  blindActionKinds,
  blindActionSchema,
  blindAreaSchema,
  blindAttemptNumberSchema,
  blindCodeOnlyRejectionSchema,
  blindDestinationSchema,
  blindIntentRejectionCodeSchema,
  blindMaxAttemptsSchema,
  blindMinimalLegalAlternativeRejectionSchema,
  blindRepairArmSchema,
  blindRoundIntentEnvelopeSchema,
  columnRowLabelSchema,
  compassDirectionSchema,
  dmModeSchema,
} from '../../../src/vtt/blind-dm-contract';

function baseIntent() {
  return {
    actor: { name: 'Goblin Warrior', badge: 2 },
    action: { kind: 'attack' as const, name: 'Scimitar' },
    target: { kind: 'creature' as const, name: 'Fighter', badge: 1 },
    destination: { kind: 'relative' as const, relation: 'hold' as const },
    reason: 'Pressure the front line while holding the doorway.',
  };
}

function envelope(intent: Readonly<Record<string, unknown>> = baseIntent()) {
  return { intent_version: BLIND_INTENT_VERSION, intents: [intent] };
}

describe('D569 blind DM contracts', () => {
  it('closes the mode, repair-arm, attempt, and rejection-code sets', () => {
    expect(DM_MODES).toEqual(['advice', 'blind']);
    expect(DM_MODES.map((mode) => dmModeSchema.parse(mode))).toEqual(DM_MODES);
    expect(dmModeSchema.safeParse('hybrid').success).toBe(false);

    expect(BLIND_REPAIR_ARMS).toEqual(['code_only', 'minimal_legal_alternative']);
    expect(BLIND_REPAIR_ARMS.map((arm) => blindRepairArmSchema.parse(arm)))
      .toEqual(BLIND_REPAIR_ARMS);
    expect(blindRepairArmSchema.safeParse('engine_fallback').success).toBe(false);

    expect(blindMaxAttemptsSchema.parse(undefined)).toBe(BLIND_MAX_ATTEMPTS_DEFAULT);
    expect([1, 2, 3].map((attempt) => blindAttemptNumberSchema.parse(attempt)))
      .toEqual([1, 2, 3]);
    for (const invalid of [0, 4, 1.5, Number.NaN, '3']) {
      expect(blindMaxAttemptsSchema.safeParse(invalid).success).toBe(false);
    }

    expect(BLIND_INTENT_REJECTION_CODES).toHaveLength(24);
    expect(BLIND_INTENT_REJECTION_CODES.map((code) => blindIntentRejectionCodeSchema.parse(code)))
      .toEqual(BLIND_INTENT_REJECTION_CODES);
    expect(blindIntentRejectionCodeSchema.safeParse('OPTION_NOT_SHOWN').success).toBe(false);
  });

  it('accepts every action variant and requires a human spell name', () => {
    const actions = [
      { kind: 'attack' },
      { kind: 'attack', name: 'Shortbow' },
      { kind: 'cast', name: 'Web' },
      { kind: 'interact' },
      { kind: 'interact', name: 'Raise portcullis' },
      ...(['dash', 'dodge', 'disengage', 'hide', 'help', 'ready', 'end'] as const)
import { canonicalJson } from '../commands/canonical-json';
import { combatantSpace } from '../combat/combat-rules';
import { minimumSpaceDistanceToCells, minimumSpaceLine } from '../combat/creature-space';
import { traceCombatantLine } from '../combat/cover';
import type { EncounterState } from '../combat/encounter';
import { gridDistance, type GridCell } from '../combat/grid';
import type {
  MonsterAttackAction,
  MonsterSavingThrowAction,
  MonsterSpellcastingAction,
} from '../combat/statblock';
import { monsterSpellResourcePoolId } from '../combat/statblock';
import { spellDefinition } from '../combat/spells/definitions';
import type { CombatantId } from '../combat/values';
import { worldObjectClassAction, worldObjectActionWasUsed } from '../combat/world-object-actions';
import { sha256 } from '../crypto/sha256';
import {
  monsterActions,
  monsterBonusActions,
  type EngineQueryPort,
  type EngineTargetSelector,
} from './engine-query-port';
import { engineActorOptions } from './turn-option-registry';
import type { EngineActorOptionPartition } from './turn-option-registry';
import {
  engineActionId,
  engineSpellId,
  type EngineActionSlotUse,
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

codex
The proposed memory repair works in the in-memory reducer: never-observed Hide creates no memory, and repeated unseen movement/Hide preserves the original cell and expiry. One planned mutant cannot be killed: restoring only the fallback is behaviorally identical once `prior.seen === true` is mandatory.

I also found a contract detail the shared productivity helper must preserve: the supplied v2 checker separately rejects targeted offense through an optically blocked trace. Replacing it with the structural helper alone would remove that check.

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {execFileSync}=require('child_process'),source=execFileSync('git',['show','bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts'],{encoding:'utf8'}),ast=ts.createSourceFile('v2.ts',source,ts.ScriptTarget.Latest,true),selected=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['targetedOffenseHasOpenTrace','resolvedMechanicsIsProductive'].includes(n.name?.text)).map(n=>n.getText(ast)).join('\\n');
const {traceCombatantLine}=require('./src/combat/cover.ts'),strict=new Function('traceCombatantLine',ts.transpileModule(selected,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+';return resolvedMechanicsIsProductive;')(traceCombatantLine);
const {createEncounter}=require('./src/combat/encounter.ts'),{monsterCombatantProfile}=require('./src/combat/combatant.ts'),{GIANT_SPIDER}=require('./src/combat/statblocks/wild-beasts.ts'),{playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts'),{freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts'),{buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts'),{availableEngineActorOptions,resolveEngineActorOption}=require('./src/vtt/intent-resolver.ts');
const base=monsterCombatantProfile(GIANT_SPIDER,{combatantId:'combatant:active-productivity-spider',tokenId:'token:[REDACTED_SECRET]'}),actor={...base,rules:{...base.rules,speed:0}},target=playerProfile('active-productivity-web-target'),env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),state=freshMonsterPlanningState(createEncounter({bounds:{columns:6,rows:3},combatants:[actor,target],tokens:[placedToken(actor,0,1),placedToken(target,5,1)]})),web=availableEngineActorOptions(state,actor.id,env).find(o=>o.actionSlots.some(s=>s.use.kind==='saving_throw'&&s.use.actionId==='web')),r=resolveEngineActorOption(state,web,env),blocked={...state,blockedCells:Array.from({length:3},(_,row)=>({column:3,row}))};console.log(JSON.stringify({valid:r.valid,strictOpen:strict(state,r.mechanics),strictBlocked:strict(blocked,r.mechanics),structuralBlocked:r.mechanics.movementCostFeet>0||r.mechanics.actionSlots.some(s=>['attack','saving_throw','cast_spell','use_world_object'].includes(s.kind)),trace:((t)=>({tier:t.tier,blocksSight:t.blocksSight}))(traceCombatantLine(blocked,actor.id,target.id,{sourceAnchor:r.mechanics.finalPosition}))}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 exited 1 in 15ms:
<ref *1> node:child_process:964
    throw err;
    ^

Error: spawnSync git EPERM
    at Object.spawnSync (node:internal/child_process:1120:20)
    at spawnSync (node:child_process:911:24)
    at execFileSync (node:child_process:954:15)
    at [stdin]:5:54
    at runScriptInThisContext (node:internal/vm:219:10)
    at node:internal/process/execution:451:12
    at [stdin]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:449:60)
    at evalFunction (node:internal/process/execution:283:30)
    at evalTypeScript (node:internal/process/execution:295:3) {
  errno: -1,
  code: 'EPERM',
  syscall: 'spawnSync git',
  path: 'git',
  spawnargs: [ 'show', 'bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts' ],
  error: [Circular *1],
  status: 0,
  signal: null,
  output: [
    null,
    "import { describe, expect, it } from 'vitest';\n" +
      "import { monsterCombatantProfile } from '../../../src/combat/combatant';\n" +
      "import { traceCombatantLine } from '../../../src/combat/cover';\n" +
      "import { createEncounter, type EncounterState } from '../../../src/combat/encounter';\n" +
      "import { GIANT_SPIDER } from '../../../src/combat/statblocks/wild-beasts';\n" +
      "import { feet, type CombatantId } from '../../../src/combat/values';\n" +
      "import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';\n" +
      'import {\n' +
      '  availableEngineActorOptions,\n' +
      '  resolveEngineActorOption,\n' +
      '  type ResolvedActionSlotUse,\n' +
      '  type ResolvedTurnMechanics,\n' +
      "} from '../../../src/vtt/intent-resolver';\n" +
      "import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';\n" +
      "import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';\n" +
      "import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';\n" +
      "import type { GeneratedRoom } from '../../../src/vtt/room-generator';\n" +
      'import {\n' +
      '  brutalRoomMembershipViolations,\n' +
      '  generatedRoomIntegrityViolations,\n' +
      "} from '../../../tools/d569-second-family-manifest';\n" +
      "import { declareTestInputs } from '../../helpers/test-inputs';\n" +
      "import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';\n" +
      '\n' +
      'const ACTIVE_FIXTURES = [\n' +
      "  { family: 'brutal-v2', seed: 6_209_001, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_002, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_003, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_004, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_005, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_006, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_007, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_008, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_009, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' },\n" +
      "  { family: 'brutal-v2', seed: 6_209_010, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_001, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_002, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_003, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_004, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_005, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_006, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_007, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_008, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_009, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json' },\n" +
      "  { family: 'brutal-b-v2', seed: 6_210_010, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_001, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_002, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_003, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_004, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_005, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_006, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_007, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_008, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_009, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json' },\n" +
      "  { family: 'brutal-2-v2', seed: 6_211_010, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json' },\n" +
      '] as const;\n' +
      '\n' +
      'const inputs = declareTestInputs({ fixtures: ACTIVE_FIXTURES.map(({ path }) => path) });\n' +
      "const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
      '\n' +
      'function targetedOffenseHasOpenTrace(\n' +
      '  state: EncounterState,\n' +
      '  mechanics: ResolvedTurnMechanics,\n' +
      '  slot: ResolvedActionSlotUse,\n' +
      '): boolean {\n' +
      "  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {\n" +
      '    return true;\n' +
      '  }\n' +
      '  return slot.targetIds.every((targetId) => {\n' +
      '    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {\n' +
      '      sourceAnchor: mechanics.finalPosition,\n' +
      '    });\n' +
      "    return !trace.blocksSight && trace.tier !== 'total';\n" +
      '  });\n' +
      '}\n' +
      '\n' +
      'function resolvedMechanicsIsProductive(\n' +
      '  state: EncounterState,\n' +
      '  mechanics: ResolvedTurnMechanics,\n' +
      '): boolean {\n' +
      '  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||\n' +
      '    mechanics.actionSlots.some((slot) =>\n' +
      "      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||\n" +
      "      slot.kind === 'use_world_object');\n" +
      '  if (!hasProductiveComponent) return false;\n' +
      '\n' +
      '  // D635/D642/D643: live cohorts additionally require every targeted offensive component\n' +
      "  // to remain sight-clear and non-total at its resolved origin. room-generator.ts:1227's\n" +
      '  // generated-room predicate is intentionally stricter: it requires no cover at all.\n' +
      '  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));\n' +
      '}\n' +
      '\n' +
      'function monsterHasProductiveOption(state: EncounterState, actorId: CombatantId): boolean {\n' +
      '  return availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).some((option) => {\n' +
      '    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);\n' +
      '    return resolution.valid && resolvedMechanicsIsProductive(state, resolution.mechanics);\n' +
      '  });\n' +
      '}\n' +
      '\n' +
      'function everyLivingMonsterIsProductive(state: EncounterState): boolean {\n' +
      '  const planningState = freshMonsterPlanningState(state);\n' +
      '  return planningState.combatants\n' +
      "    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life === 'living')\n" +
      '    .every((monster) => monsterHasProductiveOption(planningState, monster.profile.id));\n' +
      '}\n' +
      '\n' +
      'function decodedClone(state: EncounterState): EncounterState {\n' +
      "  return decodeEncounterStateV1(JSON.parse(JSON.stringify(state)) as unknown, 'session');\n" +
      '}\n' +
      '\n' +
      'function actionlessMonsterState(speed: 0 | 30): {\n' +
      '  readonly state: EncounterState;\n' +
      '  readonly actorId: CombatantId;\n' +
      '} {\n' +
      '  const base = monsterProfile(`active-productivity-${String(speed)}`);\n' +
      '  const actor = { ...base, rules: { ...base.rules, speed: feet(speed) } };\n' +
      '  const target = playerProfile(`active-productivity-target-${String(speed)}`);\n' +
      '  return {\n' +
      '    state: freshMonsterPlanningState(decodedClone(createEncounter({\n' +
      '      bounds: { columns: 20, rows: 3 },\n' +
      '      combatants: [actor, target],\n' +
      '      tokens: [placedToken(actor, 0, 1), placedToken(target, 15, 1)],\n' +
      '    }))),\n' +
      '    actorId: actor.id,\n' +
      '  };\n' +
      '}\n' +
      '\n' +
      'function openWebState(): {\n' +
      '  readonly state: EncounterState;\n' +
      '  readonly actorId: CombatantId;\n' +
      '  readonly targetId: CombatantId;\n' +
      '} {\n' +
      '  const base = monsterCombatantProfile(GIANT_SPIDER, {\n' +
      "    combatantId: 'combatant:active-productivity-spider',\n" +
      "    tokenId: 'token:active-productivity-spider',\n" +
      '  });\n' +
      '  const actor = { ...base, rules: { ...base.rules, speed: feet(0) } };\n' +
      "  const target = playerProfile('active-productivity-web-target');\n" +
      '  return {\n' +
      '    state: freshMonsterPlanningState(decodedClone(createEncounter({\n' +
      '      bounds: { columns: 6, rows: 3 },\n' +
      '      combatants: [actor, target],\n' +
      '      tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],\n' +
      '    }))),\n' +
      '    actorId: actor.id,\n' +
      '    targetId: target.id,\n' +
      '  };\n' +
      '}\n' +
      '\n' +
      "describe('active brutal v2 arena membership', () => {\n" +
      "  it('reserves exactly three contiguous ten-seed fixture families', () => {\n" +
      '    expect(ACTIVE_FIXTURES).toHaveLength(30);\n' +
      '    expect(ACTIVE_FIXTURES.map(({ seed }) => seed)).toEqual([\n' +
      '      ...Array.from({ length: 10 }, (_unused, index) => 6_209_001 + index),\n' +
      '      ...Array.from({ length: 10 }, (_unused, index) => 6_210_001 + index),\n' +
      '      ...Array.from({ length: 10 }, (_unused, index) => 6_211_001 + index),\n' +
      '    ]);\n' +
      '    expect(new Set(ACTIVE_FIXTURES.map(({ path }) => path))).toHaveLength(30);\n' +
      '  });\n' +
      '\n' +
      '  it.each(ACTIVE_FIXTURES)(\n' +
      "    '$family seed $seed satisfies active state-derived membership at $path',\n" +
      '    ({ path, seed }) => {\n' +
      '      const fixtureBytes = inputs.fixtures.readText(path);\n' +
      '      const room = JSON.parse(fixtureBytes) as GeneratedRoom;\n' +
      '      const decoded = decodeArenaFixtureText(fixtureBytes);\n' +
      '\n' +
      '      expect(room.spec.seed).toBe(seed);\n' +
      '      expect(generatedRoomIntegrityViolations(room, fixtureBytes)).toEqual([]);\n' +
      '      expect(brutalRoomMembershipViolations(room)\n' +
      "        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);\n" +
      '      expect(everyLivingMonsterIsProductive(decoded)).toBe(true);\n' +
      '    },\n' +
      '  );\n' +
      '\n' +
      "  it('rejects a living monster whose only valid options are nonproductive', () => {\n" +
      '    const fixture = actionlessMonsterState(0);\n' +
      '    expect(fixture.state.combatants.find((entry) => entry.profile.id === fixture.actorId)?.life)\n' +
      "      .toBe('living');\n" +
      '    expect(availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)\n' +
      "      .map(({ label }) => label)).toEqual(['Dodge', 'End Turn']);\n" +
      '    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(false);\n' +
      '  });\n' +
      '\n'... 1962 more characters,
    ''
  ],
  pid: 10,
  stdout: "import { describe, expect, it } from 'vitest';\n" +
    "import { monsterCombatantProfile } from '../../../src/combat/combatant';\n" +
    "import { traceCombatantLine } from '../../../src/combat/cover';\n" +
    "import { createEncounter, type EncounterState } from '../../../src/combat/encounter';\n" +
    "import { GIANT_SPIDER } from '../../../src/combat/statblocks/wild-beasts';\n" +
    "import { feet, type CombatantId } from '../../../src/combat/values';\n" +
    "import { decodeEncounterStateV1 } from '../../../src/vtt/encounter-state-codec';\n" +
    'import {\n' +
    '  availableEngineActorOptions,\n' +
    '  resolveEngineActorOption,\n' +
    '  type ResolvedActionSlotUse,\n' +
    '  type ResolvedTurnMechanics,\n' +
    "} from '../../../src/vtt/intent-resolver';\n" +
    "import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';\n" +
    "import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';\n" +
    "import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';\n" +
    "import type { GeneratedRoom } from '../../../src/vtt/room-generator';\n" +
    'import {\n' +
    '  brutalRoomMembershipViolations,\n' +
    '  generatedRoomIntegrityViolations,\n' +
    "} from '../../../tools/d569-second-family-manifest';\n" +
    "import { declareTestInputs } from '../../helpers/test-inputs';\n" +
    "import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';\n" +
    '\n' +
    'const ACTIVE_FIXTURES = [\n' +
    "  { family: 'brutal-v2', seed: 6_209_001, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209001.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_002, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209002.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_003, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209003.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_004, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209004.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_005, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209005.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_006, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209006.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_007, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209007.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_008, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209008.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_009, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209009.json' },\n" +
    "  { family: 'brutal-v2', seed: 6_209_010, path: 'tests/fixtures/arena-basis-brutal-v2/seed-6209010.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_001, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210001.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_002, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210002.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_003, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210003.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_004, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210004.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_005, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210005.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_006, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210006.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_007, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210007.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_008, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210008.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_009, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210009.json' },\n" +
    "  { family: 'brutal-b-v2', seed: 6_210_010, path: 'tests/fixtures/arena-basis-brutal-b-v2/seed-6210010.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_001, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211001.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_002, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211002.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_003, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211003.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_004, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211004.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_005, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211005.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_006, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211006.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_007, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211007.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_008, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211008.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_009, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211009.json' },\n" +
    "  { family: 'brutal-2-v2', seed: 6_211_010, path: 'tests/fixtures/arena-basis-brutal-2-v2/seed-6211010.json' },\n" +
    '] as const;\n' +
    '\n' +
    'const inputs = declareTestInputs({ fixtures: ACTIVE_FIXTURES.map(({ path }) => path) });\n' +
    "const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
    '\n' +
    'function targetedOffenseHasOpenTrace(\n' +
    '  state: EncounterState,\n' +
    '  mechanics: ResolvedTurnMechanics,\n' +
    '  slot: ResolvedActionSlotUse,\n' +
    '): boolean {\n' +
    "  if (slot.kind !== 'attack' && slot.kind !== 'saving_throw' && slot.kind !== 'cast_spell') {\n" +
    '    return true;\n' +
    '  }\n' +
    '  return slot.targetIds.every((targetId) => {\n' +
    '    const trace = traceCombatantLine(state, mechanics.actorId, targetId, {\n' +
    '      sourceAnchor: mechanics.finalPosition,\n' +
    '    });\n' +
    "    return !trace.blocksSight && trace.tier !== 'total';\n" +
    '  });\n' +
    '}\n' +
    '\n' +
    'function resolvedMechanicsIsProductive(\n' +
    '  state: EncounterState,\n' +
    '  mechanics: ResolvedTurnMechanics,\n' +
    '): boolean {\n' +
    '  const hasProductiveComponent = mechanics.movementCostFeet > 0 ||\n' +
    '    mechanics.actionSlots.some((slot) =>\n' +
    "      slot.kind === 'attack' || slot.kind === 'saving_throw' || slot.kind === 'cast_spell' ||\n" +
    "      slot.kind === 'use_world_object');\n" +
    '  if (!hasProductiveComponent) return false;\n' +
    '\n' +
    '  // D635/D642/D643: live cohorts additionally require every targeted offensive component\n' +
    "  // to remain sight-clear and non-total at its resolved origin. room-generator.ts:1227's\n" +
    '  // generated-room predicate is intentionally stricter: it requires no cover at all.\n' +
    '  return mechanics.actionSlots.every((slot) => targetedOffenseHasOpenTrace(state, mechanics, slot));\n' +
    '}\n' +
    '\n' +
    'function monsterHasProductiveOption(state: EncounterState, actorId: CombatantId): boolean {\n' +
    '  return availableEngineActorOptions(state, actorId, OFFER_ENVIRONMENT).some((option) => {\n' +
    '    const resolution = resolveEngineActorOption(state, option, OFFER_ENVIRONMENT);\n' +
    '    return resolution.valid && resolvedMechanicsIsProductive(state, resolution.mechanics);\n' +
    '  });\n' +
    '}\n' +
    '\n' +
    'function everyLivingMonsterIsProductive(state: EncounterState): boolean {\n' +
    '  const planningState = freshMonsterPlanningState(state);\n' +
    '  return planningState.combatants\n' +
    "    .filter((combatant) => combatant.profile.kind === 'monster' && combatant.life === 'living')\n" +
    '    .every((monster) => monsterHasProductiveOption(planningState, monster.profile.id));\n' +
    '}\n' +
    '\n' +
    'function decodedClone(state: EncounterState): EncounterState {\n' +
    "  return decodeEncounterStateV1(JSON.parse(JSON.stringify(state)) as unknown, 'session');\n" +
    '}\n' +
    '\n' +
    'function actionlessMonsterState(speed: 0 | 30): {\n' +
    '  readonly state: EncounterState;\n' +
    '  readonly actorId: CombatantId;\n' +
    '} {\n' +
    '  const base = monsterProfile(`active-productivity-${String(speed)}`);\n' +
    '  const actor = { ...base, rules: { ...base.rules, speed: feet(speed) } };\n' +
    '  const target = playerProfile(`active-productivity-target-${String(speed)}`);\n' +
    '  return {\n' +
    '    state: freshMonsterPlanningState(decodedClone(createEncounter({\n' +
    '      bounds: { columns: 20, rows: 3 },\n' +
    '      combatants: [actor, target],\n' +
    '      tokens: [placedToken(actor, 0, 1), placedToken(target, 15, 1)],\n' +
    '    }))),\n' +
    '    actorId: actor.id,\n' +
    '  };\n' +
    '}\n' +
    '\n' +
    'function openWebState(): {\n' +
    '  readonly state: EncounterState;\n' +
    '  readonly actorId: CombatantId;\n' +
    '  readonly targetId: CombatantId;\n' +
    '} {\n' +
    '  const base = monsterCombatantProfile(GIANT_SPIDER, {\n' +
    "    combatantId: 'combatant:active-productivity-spider',\n" +
    "    tokenId: 'token:active-productivity-spider',\n" +
    '  });\n' +
    '  const actor = { ...base, rules: { ...base.rules, speed: feet(0) } };\n' +
    "  const target = playerProfile('active-productivity-web-target');\n" +
    '  return {\n' +
    '    state: freshMonsterPlanningState(decodedClone(createEncounter({\n' +
    '      bounds: { columns: 6, rows: 3 },\n' +
    '      combatants: [actor, target],\n' +
    '      tokens: [placedToken(actor, 0, 1), placedToken(target, 5, 1)],\n' +
    '    }))),\n' +
    '    actorId: actor.id,\n' +
    '    targetId: target.id,\n' +
    '  };\n' +
    '}\n' +
    '\n' +
    "describe('active brutal v2 arena membership', () => {\n" +
    "  it('reserves exactly three contiguous ten-seed fixture families', () => {\n" +
    '    expect(ACTIVE_FIXTURES).toHaveLength(30);\n' +
    '    expect(ACTIVE_FIXTURES.map(({ seed }) => seed)).toEqual([\n' +
    '      ...Array.from({ length: 10 }, (_unused, index) => 6_209_001 + index),\n' +
    '      ...Array.from({ length: 10 }, (_unused, index) => 6_210_001 + index),\n' +
    '      ...Array.from({ length: 10 }, (_unused, index) => 6_211_001 + index),\n' +
    '    ]);\n' +
    '    expect(new Set(ACTIVE_FIXTURES.map(({ path }) => path))).toHaveLength(30);\n' +
    '  });\n' +
    '\n' +
    '  it.each(ACTIVE_FIXTURES)(\n' +
    "    '$family seed $seed satisfies active state-derived membership at $path',\n" +
    '    ({ path, seed }) => {\n' +
    '      const fixtureBytes = inputs.fixtures.readText(path);\n' +
    '      const room = JSON.parse(fixtureBytes) as GeneratedRoom;\n' +
    '      const decoded = decodeArenaFixtureText(fixtureBytes);\n' +
    '\n' +
    '      expect(room.spec.seed).toBe(seed);\n' +
    '      expect(generatedRoomIntegrityViolations(room, fixtureBytes)).toEqual([]);\n' +
    '      expect(brutalRoomMembershipViolations(room)\n' +
    "        .filter((violation) => violation.code !== 'brutal_productivity')).toEqual([]);\n" +
    '      expect(everyLivingMonsterIsProductive(decoded)).toBe(true);\n' +
    '    },\n' +
    '  );\n' +
    '\n' +
    "  it('rejects a living monster whose only valid options are nonproductive', () => {\n" +
    '    const fixture = actionlessMonsterState(0);\n' +
    '    expect(fixture.state.combatants.find((entry) => entry.profile.id === fixture.actorId)?.life)\n' +
    "      .toBe('living');\n" +
    '    expect(availableEngineActorOptions(fixture.state, fixture.actorId, OFFER_ENVIRONMENT)\n' +
    "      .map(({ label }) => label)).toEqual(['Dodge', 'End Turn']);\n" +
    '    expect(monsterHasProductiveOption(fixture.state, fixture.actorId)).toBe(false);\n' +
    '  });\n' +
    '\n'... 1962 more characters,
  stderr: ''
}

Node.js v24.13.0

exec
/bin/bash -lc "git show bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts | node -e 'const ts=require('\\''typescript'\\''),fs=require('\\''fs'\\''),Module=require('\\''module'\\''),path=require('\\''path'\\'');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('\\''?raw'\\''))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'\\''utf8'\\'');return load.call(this,id,parent,...rest)};
require.extensions['\\''.ts'\\'']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'\\''utf8'\\'')).replaceAll('\\''import.meta.env'\\'','\\''({MODE:\"review\",DEV:false})'\\'').replaceAll('\\''import.meta.dirname'\\'',JSON.stringify(path.dirname(f))).replaceAll('\\''import.meta.url'\\'',JSON.stringify(require('\\''url'\\'').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const source=fs.readFileSync(0,'\\''utf8'\\''),ast=ts.createSourceFile('\\''v2.ts'\\'',source,ts.ScriptTarget.Latest,true),selected=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['\\''targetedOffenseHasOpenTrace'\\'','\\''resolvedMechanicsIsProductive'\\''].includes(n.name?.text)).map(n=>n.getText(ast)).join('\\''\\n'\\'');
const {traceCombatantLine}=require('\\''./src/combat/cover.ts'\\''),strict=new Function('\\''traceCombatantLine'\\'',ts.transpileModule(selected,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText+'\\'';return resolvedMechanicsIsProductive;'\\'')(traceCombatantLine);
const {createEncounter}=require('\\''./src/combat/encounter.ts'\\''),{monsterCombatantProfile}=require('\\''./src/combat/combatant.ts'\\''),{GIANT_SPIDER}=require('\\''./src/combat/statblocks/wild-beasts.ts'\\''),{playerProfile,placedToken}=require('\\''./tests/unit/combat/fixtures.ts'\\''),{freshMonsterPlanningState}=require('\\''./src/vtt/monster-planning-state.ts'\\''),{buildOfferEnvironment}=require('\\''./src/vtt/offers/build-offer-environment.ts'\\''),{availableEngineActorOptions,resolveEngineActorOption}=require('\\''./src/vtt/intent-resolver.ts'\\'');
const base=monsterCombatantProfile(GIANT_SPIDER,{combatantId:'\\''combatant:active-productivity-spider'\\'',tokenId:'\\''token:[REDACTED_SECRET]'\\''}),actor={...base,rules:{...base.rules,speed:0}},target=playerProfile('\\''active-productivity-web-target'\\''),env=buildOfferEnvironment({kind:'\\''configuration'\\'',mode:'\\''legacy_standard'\\''}),state=freshMonsterPlanningState(createEncounter({bounds:{columns:6,rows:3},combatants:[actor,target],tokens:[placedToken(actor,0,1),placedToken(target,5,1)]})),web=availableEngineActorOptions(state,actor.id,env).find(o=>o.actionSlots.some(s=>s.use.kind==='\\''saving_throw'\\''&&s.use.actionId==='\\''web'\\'')),r=resolveEngineActorOption(state,web,env),blocked={...state,blockedCells:Array.from({length:3},(_,row)=>({column:3,row}))};console.log(JSON.stringify({valid:r.valid,strictOpen:strict(state,r.mechanics),strictBlocked:strict(blocked,r.mechanics),structuralBlocked:r.mechanics.movementCostFeet>0||r.mechanics.actionSlots.some(s=>['\\''attack'\\'','\\''saving_throw'\\'','\\''cast_spell'\\'','\\''use_world_object'\\''].includes(s.kind)),trace:((t)=>({tier:t.tier,blocksSight:t.blocksSight}))(traceCombatantLine(blocked,actor.id,target.id,{sourceAnchor:r.mechanics.finalPosition}))}));
'" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2246ms:
{"valid":true,"strictOpen":true,"strictBlocked":false,"structuralBlocked":true,"trace":{"tier":"half","blocksSight":true}}

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const load=Module._load;Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return load.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {generateRoom}=require('./src/vtt/room-generator.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {combatantSpaceAt,createEncounter}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'}),key=c=>c.column+','+c.row,cell=k=>{const [column,row]=k.split(',').map(Number);return {column,row}};
function neighbors(c){return [{column:c.column-1,row:c.row},{column:c.column+1,row:c.row},{column:c.column,row:c.row-1},{column:c.column,row:c.row+1}]}
function component(pass,seed,removed=new Set()){const result=new Set(),queue=[seed];for(const c of queue){const k=key(c);if(result.has(k)||"'!pass.has(k)||removed.has(k))continue;result.add(k);queue.push(...neighbors(c))}return result}
function approaches(s,origin){const pass=new Set(),walls=new Set(terrainWallCells(s).map(key));for(let row=0;row<s.bounds.rows;row++)for(let column=0;column<s.bounds.columns;column++){const c={column,row};if(terrainPassabilityAt(s,c)!=='"'blocked')pass.add(key(c))}
const C=component(pass,origin),doorAll=new Set(s.worldObjects.filter(o=>o.kind==='door').flatMap(o=>o.footprint.map(key))),openDoors=new Set(s.worldObjects.filter(o=>o.kind==='door'&&"'!o.blocking.movement).flatMap(o=>o.footprint.map(key))),out=new Set([...C].filter(k=>{const c=cell(k);return c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1||openDoors.has(k)})),runs=[];
for(const axis of ['"'v','h']){const step=axis==='v'?{column:0,row:1}:{column:1,row:0},side=axis==='v'?{column:1,row:0}:{column:0,row:1},add=(a,b,n=1)=>({column:a.column+b.column*n,row:a.row+b.row*n});
const eligible=new Set([...C].filter(k=>{const c=cell(k);return "'!doorAll.has(k)&&pass.has(key(add(c,side)))&&pass.has(key(add(c,side,-1)))}));
for(const k of eligible){const first=cell(k);if(eligible.has(key(add(first,step,-1))))continue;let run=[],cur=first;while(eligible.has(key(cur))){run.push(cur);cur=add(cur,step)}if(!walls.has(key(add(first,step,-1)))||!walls.has(key(cur)))continue;const removed=new Set(run.map(key)),left=run.map(c=>add(c,side,-1)),right=run.map(c=>add(c,side)),lComp=component(C,left[0],removed);const separated=left.every(c=>lComp.has(key(c)))&&right.every(c=>!lComp.has(key(c)));runs.push({axis,cells:run,separated});if(separated)run.forEach(c=>out.add(key(c)))}}
return {cells:[...out].map(cell).sort((a,b)=>a.row-b.row||a.column-b.column),runs,component:C.size}}
function compare(a,b){for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]-b[i];return 0}
function score(s,foot,ap){return ap.map(a=>Math.min(...foot.map(c=>{const t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3})[t.tier]}))).sort((a,b)=>a-b)}
function histogram(a){return Object.fromEntries([...new Set(a)].map(n=>[n,a.filter(v=>v===n).length]))}
function examine(s,id){const actor=s.combatants.find(c=>c.profile.id===id),origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin).cells,rows=[];for(let row=0;row<s.bounds.rows;row++)for(let column=0;column<s.bounds.columns;column++){const c={column,row},p=env.queries.path(s,{actorId:id,destination:c,movement:'"'normal'});if("'!p.legal)continue;const foot=combatantSpaceAt(s,id,c).cells;rows.push({cell:c,cost:p.costFeet,path:p.cells,score:score(s,foot,ap)})}rows.sort((a,b)=>compare(b.score,a.score)||(key(a.cell)===key(origin)?-1:key(b.cell)===key(origin)?1:0)||a.cost-b.cost||a.cell.row-b.cell.row||a.cell.column-b.cell.column);const best=rows[0];console.log('"'WINNER',JSON.stringify({id,name:actor.profile.name,size:actor.profile.rules.sizeCategory,origin,approaches:ap.length,candidates:rows.length,best:{...best,score:histogram(best.score)},maxima:rows.filter(c=>compare(c.score,best.score)===0).map(c=>({cell:c.cell,cost:c.cost})),originProfile:histogram(rows.find(c=>key(c.cell)===key(origin)).score)}));return {ap,rows,best}}
const actor=monsterProfile('blind-witness'),pc=playerProfile('sealed-pc');
const blocked=[];for(let row=0;row<5;row++)for(let column=0;column<9;column++)if((row===0||row===4||column===0||column===8||column===6)&&"'!(column===0&&row===2))blocked.push({column,row});
const obj={id:'"'world-object:half',name:'Half cover',kind:'cover',position:{column:2,row:2},footprint:[{column:2,row:2}],durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking('half_cover')};
const scene=freshMonsterPlanningState(createEncounter({bounds:{columns:9,rows:5},combatants:[actor,pc],tokens:[placedToken(actor,1,2),placedToken(pc,7,2)],blockedCells:blocked,worldObjects:[obj]}));

for(const remaining of [5,0]){const s={...scene,activeCombatant:actor.id,combatants:scene.combatants.map(c=>c.profile.id===actor.id?{...c,turn:{...c.turn,movement:{...c.turn.movement,remaining,spent:30-remaining}}}:c)};console.log('BUDGET',remaining,JSON.stringify({tenFoot:env.queries.path(s,{actorId:actor.id,destination:{column:3,row:2},movement:'normal'}),origin:env.queries.path(s,{actorId:actor.id,destination:{column:1,row:2},movement:'normal'})}))}

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc 'git status --porcelain=v1 && sha256sum .tmp-plans/2026-09-18-blind-01-plan.md && wc -l .tmp-plans/2026-09-18-blind-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 235ms:
7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce  .tmp-plans/2026-09-18-blind-01-plan.md
445 .tmp-plans/2026-09-18-blind-01-plan.md

 succeeded in 2313ms:
BUDGET 5 {"tenFoot":{"legal":false,"code":"destination_unreachable"},"origin":{"legal":true,"cells":[],"costFeet":0,"budgetFeet":5}}
BUDGET 0 {"tenFoot":{"legal":false,"code":"destination_unreachable"},"origin":{"legal":true,"cells":[],"costFeet":0,"budgetFeet":0}}

codex
**PLAN-F4 — P1 — The revised aperture definition still contradicts its oracles.**  
Location: plan lines 109–119, 151–166.

Applying the rule literally with the existing tracer and path planner gives:

| Control | Required | Actual under r2 |
|---|---|---|
| Sealed 9×5 witness | One approach; `(3,2)`, cost 10 | **10 approaches; origin `(1,2)`, cost 0** |
| Fully enclosed 5×5 room | Empty approaches | **5 approaches** |
| Two gaps in one separating wall | Both gaps included | **Neither included** |
| Single gap | Included | Pass |
| Two-cell-wide gap | Both cells included | Pass |
| Open 4×3 room | 10 boundary cells | Pass |
| Open/closed authored door | Included/excluded | Pass |

In the 9×5 witness, each of columns **2, 3, 4**, rows **1–3**, satisfies the new rule: passable west/east neighbors, wall caps, and disconnection after removing the strip. These nine ordinary floor cells join `(0,2)` as approaches.

Conversely, removing either of two genuine wall openings leaves connectivity through the other, so neither qualifies.

**Fix:** revise the aperture definition before dispatch. It must distinguish wall openings from arbitrary separating floor strips and handle alternative openings. Re-derive the primary and empty-component oracles against that definition; changing their expectations to the current algorithm’s output would not establish the intended behavior.

**PLAN-F2 — P2 — Type ownership is corrected, but B4 cannot author its RED witnesses.**  
Location: plan lines 288–315.

The in-memory type expansion reproduces **15 app / 17 node diagnostics**. The diagnostics outside B2-owned files are exactly **6 app / 8 node**, all in the listed B3 consumers. The previously missing production/schema files are now present.

However, B4 owns **no test files**, while requiring new stationary-productivity and schema-boundary REDs before its production changes. Their editable tests arrive in B5. B3 also lists two test files but requires “3/3 test files plus B2 witness.”

**Exact supervisor amendment:**

> Move `src/vtt/intel/team-scorer.ts` and `src/vtt/encounter-app.ts` from B4 to B3. Add `tests/unit/vtt/blind-cover-posture.test.ts` and `tests/unit/tools/engine-mcp-server.test.ts` to B4’s Allowed manifest. Author B4’s productivity and schema REDs there before production edits. B3 and B4 each contain ten paths. B3 verification collects its two listed test files plus the B2 witness: three files total.

**PLAN-F3 — P2 — B7 needs an explicit pre-generation wiring gate and deferred fixture gate.**  
Location: plan lines 34–40, 346–355.

The named prerequisite correctly supplies the v2 test, but that test still calls its **local old productivity predicate**. Landing the shared helper alone does not change that caller.

Also, `bea24cbe` contains **zero** of the **30** fixtures exercised by that suite. Its full-file green gate cannot run on the stated prerequisite-plus-core revision before COHORT generates them.

The Goblin Boss result is confirmed: **55 approaches, 31 candidates, 11 maxima, origin `(11,2)`, cost 0**.

**Exact supervisor amendment:**

> Apply B7’s shared-predicate wiring before COHORT-01 B3 performs any productivity acceptance check. Validate that wiring with the named in-memory stationary-posture and zero-score witnesses. Defer the full v2 fixture suite until all thirty COHORT fixtures exist at a recorded revision; retain that full-suite run as an outstanding integration gate. Do not report B7 complete from the focused pre-generation checks.

**PLAN-F8 — P2 — The specified relocation scene does not kill the claimed direction-leak mutant.**  
Location: plan lines 164–175, 208–212.

The legitimate query is invariant when the sealed PC moves from `(7,2)` to `(7,3)`. However, all available sealed-side placements have column **7**, and the intended primary winner has a unique cheapest maximal score.

A mutant that uses unseen-PC horizontal direction to break equal-profile/equal-cost destination ties therefore preserves `(3,2)` for **all three** placements `(7,1)`, `(7,2)`, `(7,3)`. It passes both the primary expected result and this relocation control.

The abstract comparator checks work: B beats A despite equal sums; optical C beats D; the footprint minimum is none. The Large-species witness is now useful: full-footprint scoring changes Eagle’s winner.

**Exact supervisor amendment:**

> Keep the sealed-room privacy control, but add a separate concrete relocation fixture with two equal-profile, equal-cost destinations and two unseen placements that reverse the named hidden-direction tie-break without changing topology or path legality. Require canonical results to remain identical and that exact mutant to change the result. Freeze the coordinates, profiles, costs, and mutant before implementing the query.

**PLAN-F10 — P2 — Preserve v2’s existing clear-trace productivity condition.**  
Location: plan lines 216–227, 351–355.

The supplied v2 predicate requires both a productive component **and** an open trace for every targeted offensive component. The proposed structural “iff” omits the latter.

Using the real v2 helper and its Web witness:

```text
Valid original resolution:          true
Existing predicate, open scene:     true
Existing predicate, blocked scene:  false
Proposed structural component test: true
Blocked trace:                     half cover, blocksSight=true
```

Replacing the local predicate outright would weaken an existing acceptance contract.

**Exact supervisor amendment:**

> The shared structural productivity helper replaces only the component-classification portion of the v2 predicate. Preserve the existing `targetedOffenseHasOpenTrace` conjunction and its blocked-Web negative witness. Stationary Seek Cover + Dodge and pursuit Search extend productivity without weakening targeted-offense trace requirements.

**PLAN-F11 — P3 — One producer mutant is equivalent after the repair.**  
Location: plan lines 54–56, 257.

The producer repair works. But restoring only:

```ts
prior?.targetPosition ?? current.targetPosition
```

while retaining the strict `prior?.seen === true` prerequisite changes no behavior: `prior.targetPosition` necessarily exists.

**Amendment:** retire the fallback-only mutant as equivalent; require the `hiddenNow` bypass-restoration mutant. Preserve the existing successful-Hide test, updating its expected memory cause to the retained prior loss cause rather than deleting it.

The other r1 findings are resolved or supported:

- **F1:** In-memory reducer repair creates **zero** memories for never-observed Hide. After unseen moves to `(3,2)` and `(4,2)`, memory remains centered at `(2,2)`, lost at round **1**, expiring at round **4**. At round **2**, radius is **5**, rather than a refreshed zero-radius memory.
- **F5:** Without `maximumFeet`, both **5-foot** and **0-foot** remaining budgets reject the 10-foot destination and accept origin at cost **0**. The explicit prohibition on bonus-Dash expansion addresses that branch.
- **F6:** Two fresh generations agree for **43/43** rooms; tracked hashes remain stable for **43/43**; fresh output matches historical bytes for **0/43**, as expected. Instrumentation started before importing the generator and observed **zero** prohibited offer-module evaluations.
- **F7:** **55 unique allowed paths**; batch sizes **2, 4, 10, 8, 10, 10, 10, 2**. Inventory: **148 baseline**, **213 for turn-proposal alone**, **215 core**, **216 final**. The listed **68 additions match exactly**, with zero missing or extra entries.
- **F9:** Offer identity versus resolution identity is now correctly distinguished.

The footprint-aware scoring results are:

| Actor | Approaches | Reachable candidates | Winner | Cost |
|---|---:|---:|---|---:|
| 6209001 Bear | 81 | 60 | `(16,2)` | 10 |
| 6209001 Eagle | 81 | 8 | **`(20,4)`** | 5 |
| 6209001 Ghast | 81 | 81 | `(18,2)` | 5 |
| 6209003 Goblin Boss | 55 | 31 | Origin `(11,2)` | 0 |

Eagle’s former `(19,4)` winner must not be carried into the new footprint-aware pins. These runs used the existing canonical planner and tracer with an independent implementation of r2’s scoring—not an implemented `seekCover`.

Verification commands included:

```bash
git branch --show-current
git rev-parse HEAD
sha256sum .tmp-plans/2026-09-18-blind-01-plan.md
wc -l .tmp-plans/2026-09-18-blind-01-plan.md
git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts
git cat-file -e bea24cbe:tests/unit/tools/d569-v6.test.ts
git diff --stat b94dd732 bea24cbe
git ls-tree -r --name-only bea24cbe \
  tests/fixtures/arena-basis-brutal-v2 \
  tests/fixtures/arena-basis-brutal-b-v2 \
  tests/fixtures/arena-basis-brutal-2-v2
git status --porcelain=v1
```

Verified **`claude/blind-01`**, **`b94dd73221697e3d03da8991746726563777fa74`**, **445 lines**, SHA-256 **`7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce`**. The v2 prerequisite exists; v6 does not. Worktree remains clean.

The additional `node <<'NODE'` probes used in-memory TypeScript overlays, `buildD583ContractInventory({changedPaths})`, `generateRoom(seed,{difficulty:'brutal'})`, canonical `queries.path` **without** `maximumFeet`, footprint-cell `traceTerrainLine`, and real reducer commands. Producer variants ran as `REVIEW_VARIANT=base`, `repair`, and `fallback_mutant`. No files were edited and no prohibited tests, agents, model calls, or servers ran.

The quoted amendments close the bounded P2 issues. The aperture definition and its contradictory oracles still require correction before implementation proceeds.

VERDICT: REJECT (1 P1, 4 P2)
REVIEW DONE
tokens used
237,770
**PLAN-F4 — P1 — The revised aperture definition still contradicts its oracles.**  
Location: plan lines 109–119, 151–166.

Applying the rule literally with the existing tracer and path planner gives:

| Control | Required | Actual under r2 |
|---|---|---|
| Sealed 9×5 witness | One approach; `(3,2)`, cost 10 | **10 approaches; origin `(1,2)`, cost 0** |
| Fully enclosed 5×5 room | Empty approaches | **5 approaches** |
| Two gaps in one separating wall | Both gaps included | **Neither included** |
| Single gap | Included | Pass |
| Two-cell-wide gap | Both cells included | Pass |
| Open 4×3 room | 10 boundary cells | Pass |
| Open/closed authored door | Included/excluded | Pass |

In the 9×5 witness, each of columns **2, 3, 4**, rows **1–3**, satisfies the new rule: passable west/east neighbors, wall caps, and disconnection after removing the strip. These nine ordinary floor cells join `(0,2)` as approaches.

Conversely, removing either of two genuine wall openings leaves connectivity through the other, so neither qualifies.

**Fix:** revise the aperture definition before dispatch. It must distinguish wall openings from arbitrary separating floor strips and handle alternative openings. Re-derive the primary and empty-component oracles against that definition; changing their expectations to the current algorithm’s output would not establish the intended behavior.

**PLAN-F2 — P2 — Type ownership is corrected, but B4 cannot author its RED witnesses.**  
Location: plan lines 288–315.

The in-memory type expansion reproduces **15 app / 17 node diagnostics**. The diagnostics outside B2-owned files are exactly **6 app / 8 node**, all in the listed B3 consumers. The previously missing production/schema files are now present.

However, B4 owns **no test files**, while requiring new stationary-productivity and schema-boundary REDs before its production changes. Their editable tests arrive in B5. B3 also lists two test files but requires “3/3 test files plus B2 witness.”

**Exact supervisor amendment:**

> Move `src/vtt/intel/team-scorer.ts` and `src/vtt/encounter-app.ts` from B4 to B3. Add `tests/unit/vtt/blind-cover-posture.test.ts` and `tests/unit/tools/engine-mcp-server.test.ts` to B4’s Allowed manifest. Author B4’s productivity and schema REDs there before production edits. B3 and B4 each contain ten paths. B3 verification collects its two listed test files plus the B2 witness: three files total.

**PLAN-F3 — P2 — B7 needs an explicit pre-generation wiring gate and deferred fixture gate.**  
Location: plan lines 34–40, 346–355.

The named prerequisite correctly supplies the v2 test, but that test still calls its **local old productivity predicate**. Landing the shared helper alone does not change that caller.

Also, `bea24cbe` contains **zero** of the **30** fixtures exercised by that suite. Its full-file green gate cannot run on the stated prerequisite-plus-core revision before COHORT generates them.

The Goblin Boss result is confirmed: **55 approaches, 31 candidates, 11 maxima, origin `(11,2)`, cost 0**.

**Exact supervisor amendment:**

> Apply B7’s shared-predicate wiring before COHORT-01 B3 performs any productivity acceptance check. Validate that wiring with the named in-memory stationary-posture and zero-score witnesses. Defer the full v2 fixture suite until all thirty COHORT fixtures exist at a recorded revision; retain that full-suite run as an outstanding integration gate. Do not report B7 complete from the focused pre-generation checks.

**PLAN-F8 — P2 — The specified relocation scene does not kill the claimed direction-leak mutant.**  
Location: plan lines 164–175, 208–212.

The legitimate query is invariant when the sealed PC moves from `(7,2)` to `(7,3)`. However, all available sealed-side placements have column **7**, and the intended primary winner has a unique cheapest maximal score.

A mutant that uses unseen-PC horizontal direction to break equal-profile/equal-cost destination ties therefore preserves `(3,2)` for **all three** placements `(7,1)`, `(7,2)`, `(7,3)`. It passes both the primary expected result and this relocation control.

The abstract comparator checks work: B beats A despite equal sums; optical C beats D; the footprint minimum is none. The Large-species witness is now useful: full-footprint scoring changes Eagle’s winner.

**Exact supervisor amendment:**

> Keep the sealed-room privacy control, but add a separate concrete relocation fixture with two equal-profile, equal-cost destinations and two unseen placements that reverse the named hidden-direction tie-break without changing topology or path legality. Require canonical results to remain identical and that exact mutant to change the result. Freeze the coordinates, profiles, costs, and mutant before implementing the query.

**PLAN-F10 — P2 — Preserve v2’s existing clear-trace productivity condition.**  
Location: plan lines 216–227, 351–355.

The supplied v2 predicate requires both a productive component **and** an open trace for every targeted offensive component. The proposed structural “iff” omits the latter.

Using the real v2 helper and its Web witness:

```text
Valid original resolution:          true
Existing predicate, open scene:     true
Existing predicate, blocked scene:  false
Proposed structural component test: true
Blocked trace:                     half cover, blocksSight=true
```

Replacing the local predicate outright would weaken an existing acceptance contract.

**Exact supervisor amendment:**

> The shared structural productivity helper replaces only the component-classification portion of the v2 predicate. Preserve the existing `targetedOffenseHasOpenTrace` conjunction and its blocked-Web negative witness. Stationary Seek Cover + Dodge and pursuit Search extend productivity without weakening targeted-offense trace requirements.

**PLAN-F11 — P3 — One producer mutant is equivalent after the repair.**  
Location: plan lines 54–56, 257.

The producer repair works. But restoring only:

```ts
prior?.targetPosition ?? current.targetPosition
```

while retaining the strict `prior?.seen === true` prerequisite changes no behavior: `prior.targetPosition` necessarily exists.

**Amendment:** retire the fallback-only mutant as equivalent; require the `hiddenNow` bypass-restoration mutant. Preserve the existing successful-Hide test, updating its expected memory cause to the retained prior loss cause rather than deleting it.

The other r1 findings are resolved or supported:

- **F1:** In-memory reducer repair creates **zero** memories for never-observed Hide. After unseen moves to `(3,2)` and `(4,2)`, memory remains centered at `(2,2)`, lost at round **1**, expiring at round **4**. At round **2**, radius is **5**, rather than a refreshed zero-radius memory.
- **F5:** Without `maximumFeet`, both **5-foot** and **0-foot** remaining budgets reject the 10-foot destination and accept origin at cost **0**. The explicit prohibition on bonus-Dash expansion addresses that branch.
- **F6:** Two fresh generations agree for **43/43** rooms; tracked hashes remain stable for **43/43**; fresh output matches historical bytes for **0/43**, as expected. Instrumentation started before importing the generator and observed **zero** prohibited offer-module evaluations.
- **F7:** **55 unique allowed paths**; batch sizes **2, 4, 10, 8, 10, 10, 10, 2**. Inventory: **148 baseline**, **213 for turn-proposal alone**, **215 core**, **216 final**. The listed **68 additions match exactly**, with zero missing or extra entries.
- **F9:** Offer identity versus resolution identity is now correctly distinguished.

The footprint-aware scoring results are:

| Actor | Approaches | Reachable candidates | Winner | Cost |
|---|---:|---:|---|---:|
| 6209001 Bear | 81 | 60 | `(16,2)` | 10 |
| 6209001 Eagle | 81 | 8 | **`(20,4)`** | 5 |
| 6209001 Ghast | 81 | 81 | `(18,2)` | 5 |
| 6209003 Goblin Boss | 55 | 31 | Origin `(11,2)` | 0 |

Eagle’s former `(19,4)` winner must not be carried into the new footprint-aware pins. These runs used the existing canonical planner and tracer with an independent implementation of r2’s scoring—not an implemented `seekCover`.

Verification commands included:

```bash
git branch --show-current
git rev-parse HEAD
sha256sum .tmp-plans/2026-09-18-blind-01-plan.md
wc -l .tmp-plans/2026-09-18-blind-01-plan.md
git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts
git cat-file -e bea24cbe:tests/unit/tools/d569-v6.test.ts
git diff --stat b94dd732 bea24cbe
git ls-tree -r --name-only bea24cbe \
  tests/fixtures/arena-basis-brutal-v2 \
  tests/fixtures/arena-basis-brutal-b-v2 \
  tests/fixtures/arena-basis-brutal-2-v2
git status --porcelain=v1
```

Verified **`claude/blind-01`**, **`b94dd73221697e3d03da8991746726563777fa74`**, **445 lines**, SHA-256 **`7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce`**. The v2 prerequisite exists; v6 does not. Worktree remains clean.

The additional `node <<'NODE'` probes used in-memory TypeScript overlays, `buildD583ContractInventory({changedPaths})`, `generateRoom(seed,{difficulty:'brutal'})`, canonical `queries.path` **without** `maximumFeet`, footprint-cell `traceTerrainLine`, and real reducer commands. Producer variants ran as `REVIEW_VARIANT=base`, `repair`, and `fallback_mutant`. No files were edited and no prohibited tests, agents, model calls, or servers ran.

The quoted amendments close the bounded P2 issues. The aperture definition and its contradictory oracles still require correction before implementation proceeds.

VERDICT: REJECT (1 P1, 4 P2)
REVIEW DONE
