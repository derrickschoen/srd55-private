
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
RULES (binding, restated): You are the PLAN REVIEWER (gpt-6-astra, HIGH, RESUMED — BLIND-01 plan r1 and r2). Worktree /home/vagrant/PhpstormProjects/dnd-wt-blind-01 — claude/blind-01 at b94dd732. Read-only sandbox; no edits, no git writes, no claude / other agents / consensus skills; no full vitest / Playwright / build; never port 4173. Readable: the plan .tmp-plans/2026-09-18-blind-01-plan.md = r3 (sha256 0c0140eee4a61dfd677a817bd39ccbcc8d55f136d25b5470080562b2fa2356ef, 460 lines — verify), the MAIN repo's .claude/decisions.md (D664–D669). Model calls WILL fail. Report exact commands and numbers; end with the named marker.

TASK: FINAL round (3-round cap). Re-review r3 against your r2 findings — PLAN-F4 (P1): the new "open approaches" definition — apply it LITERALLY with the real tracer/planner to all controls: the sealed 9×5 witness, the enclosed 5×5 room (empty), two gaps in one wall (both), single gap, two-cell-wide gap, open 4×3 room (10 boundary cells), open/closed door, a 1-wide corridor (its cells are NOT approaches), an L-shaped wall, and the generated room 6209001 (the column-11 wall with the row-11 gap; the party side vs the monster side) — report each set and whether the plan's hand oracles match; F2/F3/F8/F10/F11 amendments applied verbatim? (re-run the type expansion per batch: B3/B4 manifests, 0/0 at each batch end; B7 wiring before COHORT's gate; the relocation fixture's hidden-direction mutant actually killed — reproduce; the productivity helper keeps targetedOffenseHasOpenTrace with the blocked-Web witness; the equivalent producer mutant retired). Re-run the footprint-aware scoring on 6209001's Bear/Eagle/Ghast and 6209003's Goblin Boss and confirm the plan's pinned destinations/costs. One last sweep. If a P2 remains, state the exact supervisor amendment so implementation can proceed without a fourth round; a P1 goes to the owner. OUTPUT: PLAN-Fn findings; "VERDICT: ACCEPT" / "ACCEPT WITH AMENDMENT (text)" / "REJECT (n P1, m P2)"; end with REVIEW DONE.

codex
I’ll verify r3, apply the new approach rule literally to every requested control, and rerun the scoring and mutation probes. I’ll distinguish any issue requiring an owner decision from bounded amendments that can close this final review round.

exec
/bin/bash -lc 'git branch --show-current && git rev-parse HEAD && sha256sum .tmp-plans/2026-09-18-blind-01-plan.md && wc -l .tmp-plans/2026-09-18-blind-01-plan.md && nl -ba .tmp-plans/2026-09-18-blind-01-plan.md' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
claude/blind-01
b94dd73221697e3d03da8991746726563777fa74
0c0140eee4a61dfd677a817bd39ccbcc8d55f136d25b5470080562b2fa2356ef  .tmp-plans/2026-09-18-blind-01-plan.md
460 .tmp-plans/2026-09-18-blind-01-plan.md
     1	# BLIND-01 implementation plan r3 (final review round)
     2	
     3	Date: 2026-09-18  
     4	Planning base: `/home/vagrant/PhpstormProjects/dnd-wt-blind-01`, branch `claude/blind-01`, commit `b94dd73221697e3d03da8991746726563777fa74`.  
     5	Integration prerequisite: `claude/cohort-01` at `bea24cbe` supplies `tests/unit/vtt/arena-basis-brutal-v2.test.ts`; no v6 test exists there.  
     6	Authority: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md` D420, D476, D545, D617, D625, D632, D636.6, D641-D643, D662-D668; review: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/blind-01/review-plan-blind-01-astra-r2.md`.
     7	All other paths are relative to the BLIND-01 worktree.
     8	
     9	## 1. Result, invariants, and landing order
    10	
    11	Implement D664: a monster that perceives an enemy keeps normal offers; with no perceived enemy but
    12	an actor-known directional indication it advances/searches using existing `move_and_search`; with no
    13	indication it moves within its canonical available movement to the best topology-only cover against
    14	the room's open approaches and Dodges. If origin is already a best reachable destination, it Dodges
    15	in place. Both moving and stationary blind postures are productive.
    16	
    17	Hard invariants:
    18	
    19	- `projectActorKnowledge` remains the single knowledge producer (D625). Offer code never reads
    20	  tokens, `observationHistory`, or `searchMemories` independently, and invents no cue from unseen
    21	  positions (D476/D545).
    22	- The resolver uses only injected `environment.queries`; it cannot import/construct another query
    23	  port, movement world, terrain helper, or cover tracer (D617.5).
    24	- No fixture byte changes and no changed-code output becomes an expectation; changed pins require section 7's hand proofs, while unchanged fields may come from the pre-change tree.
    25	- No full Vitest, Playwright, build, browser server, or port 4173.
    26	
    27	Landing order:
    28	
    29	1. Land B0-B6 on `b94dd732`; B0 repairs the unsafe memory producer before anything consumes memory.
    30	2. Merge that accepted core into `claude/vis-field`, then rebase/merge it into
    31	   `claude/cohort-01@bea24cbe` before COHORT-01 Batch 3. The shared productivity helper and stationary
    32	   witness are already in core B4, so COHORT's gate cannot run under the old predicate.
    33	3. On that named prerequisite revision plus core, apply B7's shared-predicate wiring **before**
    34	   COHORT-01 B3 performs any productivity acceptance check. Its focused pre-generation witnesses do
    35	   not complete B7: defer the full v2 suite until all 30 fixtures exist at a recorded COHORT revision.
    36	   BLIND-01 does not create v6; COHORT B6 later imports the helper. D569 v1/v5 remain frozen.
    37	4. `src/vtt/intent-resolver.ts`, `src/vtt/turn-proposal.ts`, and
    38	   `src/vtt/engine-query-port.ts` are in ELEVATION-02's 221-path D636.6 manifest and the D584
    39	   inventory. Supervisor record: `BLIND-01 landed first; ELEVATION_BASE_REV includes BLIND-01;
    40	   ELEVATION-02 rebased and retained pursue_indication, seek_cover, Search, and seekCover; both
    41	   ownership overlays rerun.` A conflict may not silently discard this unit.
    42	
    43	## 2. Repair and define actor knowledge
    44	
    45	### 2.1 Search-memory producer repair comes first
    46	
    47	The reducer currently lets successful `hiddenNow` bypass prior observation and then passes
    48	`prior?.targetPosition ?? current.targetPosition` to `createSearchMemory`
    49	(`src/combat/encounter.ts:2281-2301`). That can turn a never-observed PC's true visibility-snapshot
    50	position into monster knowledge. Replace this with a strict `prior?.seen === true` prerequisite for
    51	all causes and source `lastKnownPosition` only from `prior.targetPosition`; remove the current-position
    52	fallback. Keep this in the reducer—do not add a second sanitizer in offers.
    53	
    54	RED-first producer cases in `tests/unit/combat/search-memory.test.ts`:
    55	
    56	- never-observed target successfully Hides: no memory and no cue;
    57	- previously seen target then moves unseen and Hides: memory center is the last seen cell, not either
    58	  unseen cell; repeated unseen movement/hiding never refreshes it;
    59	- previously seen loss by invisibility/obscurement still creates the existing memory at prior seen
    60	  position; reacquisition clears it; expiry remains three rounds; retain the existing successful-Hide
    61	  test but change its memory cause from `hiding` to the retained prior-loss cause (`obscurement`).
    62	
    63	### 2.2 Closed branch matrix
    64	
    65	`projectActorKnowledge` projects all non-dead opponents—including dying ones—and sorts them
    66	(`src/vtt/intel/actor-knowledge.ts:222-288`). Its variants are defined at lines 42-90; observation
    67	fallback is lines 98-123. Search-memory shapes and existing options are
    68	`src/combat/search-memory.ts:15-64,88-150`. Extend this one producer with a closed turn-knowledge
    69	projection which joins only active reducer-owned memories for the actor:
    70	
    71	| Projection after precedence | Directional indication | Branch |
    72	|---|---|---|
    73	| Any `perceived` (`seen` or mechanically `located`) non-dead opponent | Current actor-known position | `normal`; existing declarations only; memories/suspicions do not add blind offers. |
    74	| No perceived target; active memory for a non-dead opponent | Its existing `lastKnownPosition`, `suspicion.cells`, and `legalOptions` | `pursue_indication`. |
    75	| No perceived target/memory for the pair; `suspected` | Observation `lastSeen.lastSeenPosition` singleton | `pursue_indication`. |
    76	| `unknown` / `never_observed` | none | contributes no cue. |
    77	| `placement_pending` | none | contributes no cue or coordinate. |
    78	| No cue from any non-dead opponent | none | `blind_posture`. |
    79	
    80	Strictly `life === 'dead'` is excluded; a dying opponent remains in the matrix. An expired memory is
    81	absent and cannot beat an observation or create a cue. For one pair, active memory supersedes the
    82	duplicate observation because it owns the expanding suspicion region. Sort independent cues by
    83	target id, source (`search_memory` before `observation_history`), then cell row/column. Tests cover
    84	perceived+memory, mechanically located-only, expired memory, pending placement, dying, and dead.
    85	
    86	These are the complete existing cues. There is no hearing vector, alert direction, nearest-enemy
    87	fallback, party centroid, initiative inference, or unseen-token cue. For a memory, carry its actual
    88	`legalOptions` member with `kind:'move_and_search'`, Search citation, and `suspicion.cells`; never
    89	recreate its region/radius/citation. For observation-only suspicion, adapt the singleton into the
    90	same typed pursuit input once. Automatic pursuit emits only Move + Search. Existing
    91	`attack_suspected_square`, `ready_action`, and `area_effect_over_region` capabilities remain where
    92	they are; BLIND-01 does not expose or duplicate them in standard offers.
    93	
    94	## 3. Deterministic topology-only cover objective
    95	
    96	### 3.1 Map, component, and approaches
    97	
    98	The canonical query-port computes one token-free map from bounds plus effective passability of
    99	`blockedCells` and `worldObjects`. Determine only the actor footprint; read no other token. Let `C`
   100	be its cardinally connected passable component. Open approaches are the row-major-deduplicated union:
   101	
   102	1. **Unblocked frontier:** passable cells in `C` on the in-bounds outer boundary.
   103	2. **Open authored door:** passable footprint cells in `C` of a `kind:'door'` object with movement
   104	   blocking false. Closed doors contribute none; all door footprints are excluded from rule 3.
   105	3. **Wall-opening gap runs (local; no connectivity test):** for each wall-line orientation, find a
   106	   maximal nonempty consecutive run `R` of passable non-door cells in `C` along that line. Every cell
   107	   in `R` must have passable immediate neighbors on both crossing sides. The two cells immediately
   108	   before and after `R` on the wall axis must be wall cells, and the next cell outward beyond each
   109	   must also be wall: the wall continues away from both ends. Add all cells of `R`. For a vertical
   110	   wall this is a fixed-column north/south gap with passable west/east neighbors; transpose exactly
   111	   for a horizontal wall. All four flanking/continuation cells must be in bounds.
   112	
   113	Walls come from the existing effective wall structure (`terrainWallCells`). The two-wall continuation
   114	distinguishes a cut through a wall line from parallel corridor walls and boundary-capped room strips;
   115	multiple gaps are classified independently. The in-memory real-terrain/tracer/planner oracle is:
   116	sealed 9x5 `{(0,2)}`; enclosed 5x5 `{}`; internal 9x9 wall single gap `{(4,4)}`;
   117	two-cell gap `{(4,3),(4,4)}`; two gaps `{(4,2),(4,6)}`; open 4x3 boundary
   118	`{(0,0),(1,0),(2,0),(3,0),(0,1),(3,1),(0,2),(1,2),(2,2),(3,2)}`; enclosed open-door
   119	scene `{(3,2)}` and its closed-door twin `{}`; one-wide corridor `{}`; enclosed L-wall scene `{}`.
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
   166	This remains the offer/privacy control, not the direction-mutant killer.
   167	
   168	Separate concrete direction RED: a 9x7 room has perimeter walls except frontier `(0,3)`, a full wall
   169	at column 6, actor `(1,3)`, and passable half-cover footprint `(2,2)..(2,4)`. With the unseen PC at
   170	`(7,1)` or `(7,5)`, the sole approach is `(0,3)`; the only minimum-cost maxima are `(2,1)` and `(2,5)`,
   171	both profile `[(0,1)]`, cost 10, paths `[(1,2),(2,1)]` / `[(1,4),(2,5)]`. Canonical row order picks
   172	`(2,1)` in both states. The exact mutant, after profile/cost ties, minimizes absolute row distance to
   173	the current unseen PC: it picks `(2,1)` then `(2,5)`. Topology/path legality stay byte-identical, so
   174	the canonical equality plus mutant inequality kills hidden-direction use without coordinate leakage.
   175	
   176	Additional hand tables:
   177	
   178	- Multi-approach comparison: lower-row A has sorted `[(0,0),(0,2)]`; B has
   179	  `[(0,1),(0,1)]`. Both sum to 2, but weakest-first lexicographic chooses B.
   180	- Optical discriminator: C `[(1,0)]` beats D `[(0,2)]` under the default; this freezes Q1.
   181	- Equal profile/equal cost candidates prove row then column; empty approach set proves origin.
   182	- A Large 2x2 candidate with per-footprint traces `[half,none,half,none]` scores none. Exercise both
   183	  measured Large species so anchor-only scoring fails. Freeze footprint-aware 6209001 winners:
   184	  Bear `(16,2)`/10 ft, Eagle `(20,4)`/5 ft (never `(19,4)`), Ghast `(18,2)`/5 ft.
   185	
   186	## 4. Offer shape, execution, identity, and privacy
   187	
   188	Replace `EngineEngagement` (`src/vtt/turn-proposal.ts:115-123`) with a discriminated union retaining
   189	existing target stances and adding:
   190	
   191	- `{stance:'pursue_indication', indication: KnownIndication}` containing actor-known history/memory;
   192	- `{stance:'seek_cover', objective:{kind:'open_approach_cover', policy:'blind-cover-v1'}}` with no
   193	  target, selector, anchor, or cell.
   194	
   195	Add main action `{kind:'search', targetId, reliance:'sight'}` and resolved Search to every closed
   196	action/schema union, including `src/vtt/blind-dm-contract.ts:97-120`. Narrow engagement before reading
   197	`anchor` in `src/vtt/plan-materiality.ts:126-130`. `intent-resolver.ts:308-340` supplies movement
   198	resolution, and `engine-round-session.ts` already executes movement before the main action.
   199	
   200	- `normal`: unchanged offers.
   201	- `pursue_indication`: normal-speed objective toward any indicated cell, minimizing distance to the
   202	  region, then path cost/row/column; execute existing Search after movement. It need not reach the
   203	  region this turn. Retain defensive/End Turn fallbacks.
   204	- `blind_posture`: one `Seek Cover + Dodge` composite—normal movement objective plus Dodge main
   205	  action—and End Turn. It is not Dash+Dodge; Dash consumes the same main slot and remains only in
   206	  normal declarations (`offer-declarations.ts:497-506`).
   207	
   208	`basic_advance` (`src/vtt/snippets/registry.ts:158-202`) recognizes pursuit and cover posture before
   209	its defensive fallback; ordinary offense still wins. Search is utility, not offense/damage.
   210	
   211	Offer identity is policy identity: `engineOfferableOption` hashes the canonical offer body
   212	(`src/vtt/option-modeling.ts:26-33`). Adding the typed stance/policy changes IDs of replaced/new
   213	offers; unchanged normal bodies keep IDs. A resolver-only destination/tie-order change does **not**
   214	change the policy-only offer or ID—it changes resolved mechanics/path and resolution digest. Tests
   215	hand-build canonical bodies and use the independent existing canonical-json/SHA helper.
   216	
   217	No-coordinate witness deep-walks the blind-posture offer body and asserts no opponent CombatantId and
   218	no GridCell-shaped `{column,row}` pair occurs; movement contains only the policy tag. A pursuit
   219	control contains its historical cell, proving the walker is live. Resolved mechanics may contain the
   220	chosen cover cell. Mutants that leak `(7,2)` or steer from the unseen PC without serialization fail
   221	the structural/relocation pair.
   222	
   223	## 5. Productivity contract
   224	
   225	Export one structural **component-classification** helper from
   226	`tools/d569-second-family-manifest.ts`; brutal-b, v2 after B7, and later v6 call it. It returns true
   227	for a valid resolved option with:
   228	
   229	1. existing positive movement, attack, save, cast, or world-object action; or
   230	2. Search paired with `pursue_indication` (movement may be 0 inside the region); or
   231	3. exactly one main Dodge paired with `seek_cover`, whether movement is positive or 0 and whether
   232	   all cover scores are zero/approaches empty.
   233	
   234	An ordinary stationary Dodge and malformed/unresolvable posture remain false. In v2 this helper
   235	replaces **only** `hasProductiveComponent`; preserve the existing conjunction that every targeted
   236	offensive slot passes `targetedOffenseHasOpenTrace`. Keep the blocked-Web negative: a valid structural
   237	Web remains unproductive through half cover with `blocksSight:true`. Pursuit Search and posture have
   238	no targeted offense, so extend productivity without weakening that trace gate. A room is unproductive
   239	when any living monster has no valid option passing both component classification and applicable
   240	trace checks; already-best cover is valid, but unplaced/action-spent without posture can still fail.
   241	
   242	Pre-change measured population, used as the expectation source:
   243	
   244	| Category | Blind / living | Expected productive blind |
   245	|---|---:|---:|
   246	| hard 5117 | 55 / 75 | 55 / 55 |
   247	| brutal 6203 | 25 / 44 | 25 / 25 |
   248	| brutal-b 6206 | 40 / 42 | 40 / 40 |
   249	| brutal-2 6207 | 29 / 44 | 29 / 29 |
   250	| rejected/new 6209 | 36 / 46 | 36 / 36 |
   251	| aggregate | 185 / 251 | 185 / 185 |
   252	
   253	Pin 6209003 Goblin Boss explicitly: 55 approaches, 31 candidates, 11 tied maxima, origin `(11,2)`
   254	cost 0; its valid stationary posture is productive. The zero-score posture/ordinary-Dodge contrast
   255	is a separate RED witness.
   256	
   257	## 6. Ordered batches (each at most ten files)
   258	
   259	For every batch: R is hand-authored RED before production change; T is both
   260	`npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit`; M is applied and
   261	reverted with the same focused witnesses; V runs
   262	`npx vitest run --configLoader runner --maxWorkers=1 <listed tests>`, expected listed files collected,
   263	0 failed/0 skipped unless an existing pin says otherwise. Never update from changed output.
   264	
   265	### B0 — make memories safe (2 files)
   266	
   267	Allowed: `src/combat/encounter.ts`; `tests/unit/combat/search-memory.test.ts`.
   268	
   269	- R: section 2.1 cases fail; retain successful-Hide coverage with prior-loss cause `obscurement`.
   270	- M: restore the `hiddenNow` bypass; never-observed Hide fails. Retire the fallback-only mutant as
   271	  equivalent: strict `prior?.seen === true` guarantees `prior.targetPosition` exists.
   272	- T: app 0, node 0. V: search-memory test 1/1 file, 0 failed; no offer files touched.
   273	
   274	### B1 — projection and query contract (4 files)
   275	
   276	Allowed: `src/vtt/intel/actor-knowledge.ts`; `src/vtt/engine-query-port.ts`;
   277	`tests/unit/vtt/actor-knowledge.test.ts`; `tests/unit/vtt/engine-query-port.test.ts`.
   278	
   279	- R: full precedence matrix, aperture controls, partial/zero movement, footprint, comparator, and
   280	  query-port agreement fail before their typed producer/query exists.
   281	- M: consume expired/never-observed memory, corridor-as-aperture, inverted score, synthetic 30-ft
   282	  budget, or anchor-only footprint; corresponding witness fails.
   283	- T: app 0, node 0. V: 2/2 test files, 0 failed; hand oracle gives `(3,2)`, origin variant gives 0.
   284	
   285	### B2 — offer/resolver core plus co-located witnesses (10 files)
   286	
   287	Allowed: `src/vtt/turn-proposal.ts`; `src/vtt/offers/offer-declarations.ts`;
   288	`src/vtt/intent-resolver.ts`; `src/vtt/engine-round-session.ts`; `src/vtt/option-modeling.ts`;
   289	`src/vtt/offered-option-paths.ts`; `src/vtt/blind-intent-resolver.ts`;
   290	`src/vtt/blind-dm-contract.ts`; `src/vtt/plan-materiality.ts`;
   291	`tests/unit/vtt/blind-cover-posture.test.ts` (**NEW**).
   292	
   293	- R: sealed no-cue `(3,2)` + Dodge; best origin path `[]`/0 + Dodge; last-known Move + Search;
   294	  no-coordinate and unseen-relocation controls all fail before implementation.
   295	- M: blind branch disabled gives exactly Dodge/End Turn; inverted score chooses wrong cell; ignored
   296	  indication chooses posture; coordinate leak fails privacy; hidden-row tie-break fails relocation.
   297	- T: expected temporary diagnostics are only B3 consumers: app 6 and node 8
   298	  (`dm-tactical-intel` 2, `opportunity-cost` 1, `option-outcome` 1, `engine-server` 1,
   299	  `snippets/registry` 1; node additionally `snippets.test` 2). Anything else stops.
   300	- V: new witness file 1/1, 0 failed; movement precedes Dodge/Search; hashes use hand bodies.
   301	
   302	### B3 — close all action/engagement consumers/schemas (10 files)
   303	
   304	Allowed: `src/vtt/dm-tactical-intel.ts`; `src/vtt/intel/opportunity-cost.ts`;
   305	`src/vtt/intel/option-outcome.ts`; `src/vtt/mcp/engine-server.ts`; `src/vtt/snippets/registry.ts`;
   306	`tests/unit/vtt/snippets.test.ts`; `tests/unit/vtt/blind-dm-contract.test.ts`;
   307	`docs/specs/engine-proposal-contract-refusal-code.schema.json`; `src/vtt/intel/team-scorer.ts`;
   308	`src/vtt/encounter-app.ts`.
   309	
   310	- R: Search schema and exhaustive consumers reject/misclassify new variants; `basic_advance` misses
   311	  posture/pursuit.
   312	- M: omit Search from runtime schema, classify it as offense, or omit `seek_cover` from advance;
   313	  focused schema/semantic/snippet witness fails.
   314	- T: app 0, node 0. V: its two listed tests plus the B2 witness = 3 files, 0 failed; no defaults.
   315	
   316	### B4 — productivity lands before COHORT gate (10 files)
   317	
   318	Allowed: `src/vtt/challenge-feasibility.ts`; `src/vtt/scripted-party-round.ts`;
   319	`src/vtt/speculative-planning.ts`;
   320	`src/vtt/mcp/schemas.ts`; `docs/specs/engine-turn-context.schema.json`;
   321	`docs/specs/engine-blind-round-intent.schema.json`;
   322	`docs/specs/engine-blind-round-intent-result.schema.json`;
   323	`tools/d569-second-family-manifest.ts`; `tests/unit/vtt/blind-cover-posture.test.ts`;
   324	`tests/unit/tools/engine-mcp-server.test.ts`.
   325	
   326	- R: author stationary/all-zero posture versus ordinary Dodge and schema boundary REDs in B4's two
   327	  allowed test files before production edits; strict schemas initially reject Search/new engagements.
   328	- M: count arbitrary Dodge, reject zero-score posture, or omit Search/schema branch; boundary/parity
   329	  witness fails.
   330	- T: app 0, node 0. V: those 2/2 test files, 0 failed; schema check/idempotence second run 0-byte diff.
   331	
   332	### B5 — focused contracts and frozen rows (10 files)
   333	
   334	Allowed: `tests/unit/tools/d569-second-family-manifest.test.ts`;
   335	`tests/unit/vtt/arena-basis-brutal-b.test.ts`; `tests/unit/vtt/standard-offer-generator.test.ts`;
   336	`tests/unit/vtt/engine-round-session.test.ts`; `tests/unit/vtt/option-modeling.test.ts`;
   337	`tests/unit/vtt/offered-option-paths.test.ts`; `tests/unit/vtt/option-outcome.test.ts`;
   338	`tests/unit/vtt/team-scorer.test.ts`; `tests/unit/vtt/challenge-feasibility-production.test.ts`;
   339	`tests/unit/tools/engine-mcp-server.test.ts`.
   340	
   341	- R: old exact rows stay RED until each section-7 ledger exists; 6209003 and zero-score posture prove
   342	  shared productivity. v1/v5 controls remain green.
   343	- M: replay four required mutants; each named focused witness fails.
   344	- T: app 0, node 0. V: 10/10 files, 0 failed; core/with-hint 480/660, primary 240/330,
   345	  second-family 480; fixtures and v1/v5 have zero diff.
   346	
   347	### B6 — behavior, arena, and conversation pins (10 files)
   348	
   349	Allowed: `tests/unit/vtt/composite-turn-proposals.test.ts`;
   350	`tests/unit/vtt/engine-opportunity-movement-intel.test.ts`;
   351	`tests/unit/vtt/speculative-planning.test.ts`; `tests/unit/vtt/blind-intent-resolver.test.ts`;
   352	`tests/unit/vtt/dm-tactical-intel.test.ts`; `tests/unit/vtt/agent-round-decision.test.ts`;
   353	`tests/unit/tools/ai-dm-arena.test.ts`; `tests/unit/tools/ai-dm-conversation.test.ts`;
   354	`tests/unit/vtt/challenge-feasibility.test.ts`; `tests/unit/vtt/scripted-party-round.test.ts`.
   355	
   356	- R: retain old affected rows as RED and attach actor branch/destination/profile/action/hash proof.
   357	- M: replay four required mutants; unrelated/pre-change control changes fail exact pins.
   358	- T: app 0, node 0. V: 10/10 files, 0 failed; hard-family hand rows agree; all 185 blind are
   359	  productive by category; D583 core-stage set is its independently derived subset, not normalized.
   360	
   361	### B7 — COHORT integration at `bea24cbe` + accepted core (2 files)
   362	
   363	Allowed: `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (**COHORT prerequisite**, absent at b94);
   364	`tests/unit/tools/d569-second-family-manifest.test.ts`.
   365	
   366	- R: wire v2's local predicate to the shared component helper before COHORT B3. Its in-memory
   367	  stationary 6209003 and zero-score posture REDs turn green; retain blocked-Web trace rejection.
   368	- M: restore local component logic, reject movement-0 posture, or bypass `targetedOffenseHasOpenTrace`;
   369	  stationary/zero-score/blocked-Web witnesses respectively fail.
   370	- T: app 0, node 0. V-pre-generation: focused witnesses in the two files, 0 failed; **do not mark B7
   371	  complete**. Outstanding V: after all 30 fixtures exist at a recorded revision, run the full v2 file,
   372	  require all 30/30 membership rows and controls green, v1/v5 byte-frozen, D583 exactly 216.
   373	
   374	## 7. Pin ledger: demonstrate, then normalize
   375	
   376	For every changed exact pin, first retain the old expected row as RED; add a hand table of approaches,
   377	all maximal destinations, winner, cost, runner-up profile, and action; only then edit named fields.
   378	
   379	| Surface | Proof and permitted change |
   380	|---|---|
   381	| `tests/unit/vtt/composite-turn-proposals.test.ts:153-164` | Seed 5117005: prove each blind Scout's matrix branch and cover table; replace only Dodge/End-Turn behavior with the proved composite. Perceived controls unchanged. |
   382	| `tests/unit/vtt/engine-opportunity-movement-intel.test.ts:71-163` Room 8 | Hand-score monsters 1/2/4 against every tied maximum; monster 5's perceived 55-ft Dash remains unchanged. Normalize only blind option/path/ID and dependent intel. |
   383	| `tests/unit/vtt/speculative-planning.test.ts:543-565` | Preserve COHORT's nonempty-menu scene; hand-prove objective/path, dependency facts, scores, byte tie order, seam mutation. Never normalize to empty. |
   384	| `tests/unit/vtt/snippets.test.ts:329-380,489-503` | Hand bodies prove `basic_advance`: posture for no cue, Move+Search for last-known, existing Dash/offense for perceived. |
   385	| `tests/unit/vtt/standard-offer-generator.test.ts:19-125` | Enumerate labels, slot uses, movement objectives/order, bodies/hashes. Normal perceived counts/IDs stay unchanged. |
   386	| `tests/unit/vtt/arena-basis-brutal-b.test.ts:378-443` (requested frozen rows 425-431) | Fixture hashes/membership freeze. Before each changed selected row, record branch, profile alternatives, chosen path/action/body hash. |
   387	| `tests/unit/vtt/engine-query-port.test.ts:184-314` | Agreement: injected result/path equals canonical path/direct traces; include nine opening controls, partial movement, Large footprint, sealed privacy, and the exact `(2,1)`/`(2,5)` relocation mutant fixture. |
   388	| D569 v2/v6 | B7 wires only supplied v2 plus shared test, preserves `targetedOffenseHasOpenTrace`/blocked Web, and remains incomplete until 30 fixtures exist and full v2 passes. Later v6 consumes the helper; v1/v5 rows/IDs/fixtures freeze. |
   389	| `tests/unit/tools/ai-dm-arena.test.ts`, `tests/unit/tools/ai-dm-conversation.test.ts` | For each affected authorized-plan/round row, prove branch, cell/profile or indication, movement/action, and hand-built ID; narrative moves only when exact option facts change. |
   390	
   391	## 8. D583 ownership inventory: 148 -> 216 specs
   392	
   393	Derive the expected set independently from the 148-spec b94 baseline, named
   394	`claude/cohort-01@bea24cbe` prerequisites, and the one new BLIND-01 test. `turn-proposal.ts` alone
   395	reaches 213; the complete 55-path B0-B7 manifest reaches 216. The exact +68 specs are:
   396	
   397	```text
   398	tests/integration/authoring/handlers.test.ts; tests/integration/party/token-never-travels.test.ts; tests/integration/queries/completeness-rpc.test.ts; tests/integration/queries/level-up-wizard.test.ts; tests/integration/queries/rpc.test.ts; tests/integration/tools/generate-heldout-party-basis.test.ts; tests/integration/vtt/ai-dm-arena-interleave.test.ts; tests/integration/vtt/stored-character-party-member.test.ts
   399	tests/unit/assets/board-glyphs.test.ts; tests/unit/assets/encounter-board-art.test.ts; tests/unit/assets/light-encoding.test.ts; tests/unit/assets/starter-art.test.ts; tests/unit/combat/movement-evaluator.test.ts; tests/unit/combat/tactical-evaluator-actor-knowledge.test.ts; tests/unit/combat/visibility-field.test.ts; tests/unit/tools/agent-conformance.SIMULATED.test.ts; tests/unit/tools/ai-dm-conversation-row-codec.test.ts; tests/unit/tools/ai-dm-legacy-invariance.test.ts; tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts; tests/unit/tools/ai-dm-rerun-packet.test.ts; tests/unit/tools/d569-blind-experiment.test.ts; tests/unit/tools/d569-second-family-manifest.test.ts; tests/unit/tools/d569-v5.test.ts; tests/unit/tools/engine-mcp-server.test.ts; tests/unit/ui/character-list.test.ts; tests/unit/ui/guided-builder.test.ts; tests/unit/ui/homebrew-library.test.ts; tests/unit/ui/level-up-planned-steps.test.ts; tests/unit/ui/level-up-wizard.test.ts; tests/unit/ui/planner.test.ts
   400	tests/unit/vtt/agent-round-decision.test.ts; tests/unit/vtt/arena-basis-brutal-v2.test.ts; tests/unit/vtt/blind-context-source-binding.test.ts; tests/unit/vtt/blind-cover-posture.test.ts; tests/unit/vtt/blind-dm-contract.test.ts; tests/unit/vtt/blind-intent-resolver.test.ts; tests/unit/vtt/blind-model-ingress.test.ts; tests/unit/vtt/blind-turn-context.test.ts; tests/unit/vtt/challenge-feasibility-production.test.ts; tests/unit/vtt/closed-predicates.test.ts; tests/unit/vtt/content-pack-import-order.test.ts; tests/unit/vtt/controller-assignment.test.ts; tests/unit/vtt/decision-trace.test.ts; tests/unit/vtt/door-intent.test.ts; tests/unit/vtt/encounter-selectors.test.ts; tests/unit/vtt/encounter-session-service.test.ts; tests/unit/vtt/experiment-orchestrator.test.ts; tests/unit/vtt/generated-encounter-fixtures.test.ts; tests/unit/vtt/handoff-examples.test.ts; tests/unit/vtt/heldout-evaluation.test.ts; tests/unit/vtt/in-process-transport.test.ts; tests/unit/vtt/node-runtime.test.ts; tests/unit/vtt/node-websocket-transport.test.ts; tests/unit/vtt/offer-environment-board-sequence.test.ts; tests/unit/vtt/offer-environment-identity.test.ts; tests/unit/vtt/offer-environment.test.ts; tests/unit/vtt/opportunity-selection.test.ts; tests/unit/vtt/plays-v1.test.ts; tests/unit/vtt/protocol-runtime.test.ts; tests/unit/vtt/reaction-spend-hold.test.ts; tests/unit/vtt/runtime-parity.test.ts; tests/unit/vtt/scene-snapshot.test.ts; tests/unit/vtt/session-lifecycle.test.ts; tests/unit/vtt/soak-runner.test.ts; tests/unit/vtt/standard-offer-generator.test.ts; tests/unit/vtt/team-scorer.test.ts; tests/unit/vtt/two-room-fixture.test.ts; tests/unit/vtt/worker-boundary.test.ts
   401	```
   402	
   403	A count other than 216 or different set stops for ownership review; never regenerate this expected
   404	list from the changed graph.
   405	
   406	## 9. Final gates
   407	
   408	Run serially, preserve stdout and elapsed time:
   409	
   410	```text
   411	npx tsc -p tsconfig.app.json --noEmit
   412	npx tsc -p tsconfig.node.json --noEmit
   413	node scripts/check-offer-environment-architecture.mjs --self-test
   414	node scripts/check-offer-environment-architecture.mjs
   415	node scripts/check-command-outcomes.mjs
   416	npx vitest run --configLoader runner --maxWorkers=1 <all touched B0-B6 tests plus B7 focused -t witnesses>
   417	npx vitest run --configLoader runner --maxWorkers=1 tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
   418	```
   419	
   420	Expected: T 0/0; architecture self-test 0 and live check 0; command outcomes 0; touched files all
   421	collected, 0 failed; D630 pair 36/36 on a quiet box, baseline/candidate back-to-back, combined ceiling
   422	41 s. Timeout is failure. B7 remains outstanding until its recorded-revision 30/30 full-v2 gate.
   423	
   424	Generation gate has two separate comparisons because historical fixtures are not fresh-generator
   425	equivalents:
   426	
   427	1. Before edits hash all 43 tracked room fixture files; after B7 require 43/43 hashes unchanged and
   428	   `git diff -- tests/fixtures` empty.
   429	2. Before edits generate the same 43 room inputs from the pre-change tree into a fresh temp capture;
   430	   after B7 generate them again with identical commands into another temp directory; require 43/43
   431	   pre-change-vs-post-change bytes identical. Do **not** compare fresh outputs to tracked fixtures.
   432	
   433	Prove “generator does not consult offers” at runtime: instrument module evaluation during each room
   434	generation and assert none of `offer-declarations.ts`, `intent-resolver.ts`, `turn-proposal.ts`, or
   435	`option-modeling.ts` is evaluated. Do not use static/type import closure as the gate: type traversal
   436	legitimately reaches all four. Any room delta or runtime offer-module load is STOP, not normalization.
   437	
   438	Final hard gates: original four mutants plus hidden-direction and `hiddenNow`-bypass mutants killed
   439	after clean restoration; no fixture bytes/output-made oracle; v1/v5 frozen; only hand-proved pins
   440	normalized; 36/36 blind 6209 and 185/185 measured productive; D583 216; no alternate query port or
   441	full suite/build/browser. Blocked Web remains unproductive despite its productive component.
   442	
   443	## 10. Owner question
   444	
   445	**Q1 (D665, material):** does D664 “cover” rank optical blocking before physical tier as planned, or
   446	physical cover only with optical reported? Default for implementation is optical-first, frozen by C
   447	`[(1,0)]` beating D `[(0,2)]`; the alternative changes cover winners, resolved paths/digests, and pins,
   448	but not policy-only offer IDs. Automatic pursuit is settled, not open: emit existing Move + Search
   449	only, never suspected-square attack.
   450	
   451	## 11. Round 3 disposition
   452	
   453	- PLAN-F4 -> lines 96-119 and 149-184: local maximal wall-gap runs replace connectivity; nine exact approach sets and the `(3,2)`/10-ft real-tracer oracle are frozen.
   454	- PLAN-F2 -> lines 302-330: B3/B4 are ten paths each; B4 owns its RED files and B3 verifies exactly three files.
   455	- PLAN-F3 -> lines 29-36 and 361-372: B7 wiring precedes COHORT B3; focused pre-generation checks cannot complete B7, whose 30-fixture full suite remains outstanding.
   456	- PLAN-F8 -> lines 163-184 and 293-300: concrete `(2,1)`/`(2,5)` equal-profile/equal-cost fixture kills the hidden-row mutant; Eagle is `(20,4)`.
   457	- PLAN-F10 -> lines 223-240 and 366-372: component classification only changes; targeted-offense trace conjunction and blocked-Web negative remain.
   458	- PLAN-F11 -> lines 45-61 and 265-272: fallback-only mutant retired; `hiddenNow` bypass mutant and successful-Hide/prior-loss-cause test retained.
   459	
   460	BLIND-01 PLAN R3 DONE

exec
/bin/bash -lc "sed -n '23136,23175p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md; sed -n '97,143p' src/vtt/dm-tactical-intel.ts; sed -n '95,116p' src/vtt/intel/opportunity-cost.ts; sed -n '596,630p' src/vtt/intel/option-outcome.ts; sed -n '118,142p' src/vtt/snippets/registry.ts; sed -n '76,112p' tests/unit/vtt/snippets.test.ts; sed -n '125,151p' src/vtt/intent-resolver.ts; sed -n '180,219p' src/vtt/option-modeling.ts; sed -n '70,94p' src/vtt/offered-option-paths.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
## D664 — OWNER (2026-09-18 08:27): Question 6 — "Seek cover and dodge unless there is some indication of direction of an enemy"
RULING (verbatim above). Reading, as binding for the BLIND-01 unit: a monster that perceives no enemy (no 'seen'/'located' detection) acts on its KNOWLEDGE: (a) if there is an indication of an enemy's direction — a last-known position in observationHistory, a searchMemory / suspicion region (D420), or another defined knowledge cue the plan enumerates from the single actor-knowledge producer (D625) — it advances/searches toward that indication with the existing move-and-search machinery; (b) if there is NO indication, it SEEKS COVER and DODGES: it moves (positive movement, within its speed) to a reachable cell with the best available cover against the room's open approaches, chosen from the map alone (never from an unseen PC's true position — D476/D545 stand), then takes Dodge; if it already holds the best reachable cover, it Dodges in place. SUPERVISOR CONSEQUENCE, open to the owner's veto: the productivity contract (movement > 0 OR an offensive component with a clear trace) must treat the blind posture — seek-cover-and-Dodge, including Dodge-in-place when already at best cover — as PRODUCTIVE, because it is now the defined useful action for a blind monster; a room is unproductive only if a monster has neither a shot, nor a path to better cover, nor an indication to pursue AND is not already in cover. Sequencing: BLIND-01 is planned now (sol, plan reviewed by astra at HIGH per D627), implemented on a new worktree ../dnd-wt-blind-01 (branch claude/blind-01 from claude/vis-field b94dd732), merged into claude/vis-field and then into claude/cohort-01 before Batch 3 re-runs; COHORT-01 Batch 9's hand derivations (Room-8, composite, speculative) are redone after BLIND-01 because the behaviour they pin changes by design.

## D665 — SUPERVISOR (2026-09-18 08:52): BLIND-01 plan r1 written (sol 01a0b47c…; sha256 e78967b7ecd4204d97e03b1589c10950f61165e9f97c96113beac3e72b16889f, 450 lines; six batches B1–B6 ≤10 files, D583 inventory 148 → 214, owner questions in §10); astra HIGH review r1 dispatched (fresh 01a0b492…; brief review-plan-blind-01-astra.md; log review-plan-blind-01-astra-r1.log). Plan copies: .tmp-plans (main), ../dnd-wt-blind-01/.tmp-plans.

## D666 — SUPERVISOR (2026-09-18 09:07): BLIND-01 plan r1 REJECTED by astra r1 (HIGH; 3 P1, 5 P2, 1 P3; saved review-plan-blind-01-astra-r1.md) → r2 dispatched; a PRE-EXISTING knowledge-leak defect found (KNOW-F1) for the owner
KNOW-F1 (pre-existing, found by astra with the real reducer; NOT introduced by any recent batch): when a PC that a monster has NEVER observed Hides, the reducer creates a searchMemory for that monster with lastKnownPosition = the PC's TRUE cell and a suspicion region on it (encounter.ts:2284: `hiddenNow` bypasses the previously-seen requirement and memory creation reads the visibility snapshot's true position). That violates D476 (observed facts + defined inference only) and D545; any consumer of searchMemories (the D420 move-and-search machinery, and BLIND-01's pursue branch) would act on a position the monster never had. BLIND-01 r2 must repair this producer in an early batch before consuming memories. Recorded as a finding against the existing engine; the owner may also want it fixed independently of BLIND-01.
PLAN findings: F2 manifests incomplete (plan-materiality.ts:128, blind-dm-contract.ts:97, 15/17 diagnostics on expansion; COHORT-supplied prerequisites conflated with new files); F3 the productivity amendment must land with the core (6209003's Goblin Boss wins the origin at cost 0 and stays unproductive under the old predicate); F4 the aperture predicate marks corridor cells (the 9×5 oracle has four approaches, not one); F5 the movement budget must be the canonical remaining movement (queries.path honours a supplied maximumFeet; bonus Dash must not extend the posture); F6 the generation gate must be 43/43 tracked hashes unchanged + 43/43 pre/post fresh generations identical, with a runtime-only dependency assertion; F7 D583 = 216 for the declared manifest, not 214; F8 map-only selection and weakest-first ordering need real witnesses (unseen-PC relocation control, a direction-leak mutant without serialized coordinates, competing profiles, ties, empty approaches, a Large-creature/footprint policy); F9 option identity vs resolution identity. Astra's in-memory planner runs with the plan's scoring: 6209001 Bear → (16,2) at 10 ft, Eagle → (19,4) at 5 ft, Ghast → (18,2) at 5 ft (all currently Dodge/End Turn only); it recommends keeping both plan defaults (Q1 optical first; Q2 move_and_search only) and that the productivity contract counts a valid blind posture even at zero cover scores while an ordinary stationary Dodge does not. Owner Question 7 (Q1) remains open; r2 keeps the default.

## D667 — SUPERVISOR (2026-09-18 09:36): BLIND-01 plan r2 written (sha256 7127b23714282c733ba2c2b0a5ca79bee2540b0401cfec72b92118edbb4572ce, 445 lines; r1 archived as .r1.md); astra HIGH r2 (resumed 01a0b492…) dispatched

## D668 — SUPERVISOR (2026-09-18 09:52): BLIND-01 plan r2 REJECTED by astra r2 (HIGH; 1 P1, 4 P2, 1 P3; saved review-plan-blind-01-astra-r2.md) → r3 (FINAL round) dispatched
CLOSED: F1 (the producer repair verified with the real reducer: never-observed Hide creates zero memories; unseen moves keep the memory at (2,2), lost round 1, expiring round 4, radius 5 at round 2), F5 (without a maximumFeet override the 5-ft and 0-ft budgets reject the 10-ft cell and accept the origin at cost 0), F6 (43/43 fresh generations agree, 43/43 tracked hashes stable, 0/43 equal historical bytes as expected; zero prohibited offer-module evaluations at runtime), F7 (55 allowed paths; batches 2/4/10/8/10/10/10/2; inventory 148 → 216 with the 68 additions matching exactly), F9. OPEN: F4 (P1) — the r2 "component-separating runs" aperture definition is still wrong: the sealed 9×5 witness yields 10 approaches (every floor cell of the middle strip separates the graph) and the origin wins at cost 0; an enclosed 5×5 room yields 5 approaches; two gaps in one wall yield neither (each alone leaves connectivity). r3 must define wall openings locally (a candidate wall-run-orientation rule is given to the planner to VERIFY against nine controls incl. corridor and L-wall, not to adopt blindly) and re-derive the oracles by hand. F2/F3/F8/F10 (P2) and F11 (P3): astra supplied exact amendment text (B3/B4 manifest moves so B4 can author its REDs; B7 wiring before COHORT's productivity gate with the full v2 suite deferred as an outstanding integration gate until the 30 fixtures exist; a concrete relocation fixture whose hidden-direction tie-break mutant is actually killed; the shared productivity helper replaces only component classification and keeps targetedOffenseHasOpenTrace; the equivalent producer mutant retired) — carried verbatim into the r3 brief. Footprint-aware scoring: Bear (16,2)/10 ft, Eagle (20,4)/5 ft (not (19,4)), Ghast (18,2)/5 ft, Goblin Boss origin (11,2)/0. If r3 leaves a P2, astra states the supervisor amendment; a P1 → owner.

## D669 — SUPERVISOR (2026-09-18 10:06): BLIND-01 plan r3 written (sha256 0c0140eee4a61dfd677a817bd39ccbcc8d55f136d25b5470080562b2fa2356ef, 460 lines; r2 archived as .r2.md); astra HIGH r3 (final, resumed) dispatched
      case 'spellcasting': return [];
    }
  });
}

function optionTargets(option: EngineOfferableOption): readonly CombatantId[] {
  return option.actionSlots.flatMap((slot): readonly CombatantId[] => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) =>
        target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function optionActionId(option: EngineOfferableOption): string | null {
  const main = option.actionSlots.find((slot) => slot.slot === 'main')?.use;
  if (main === undefined) return null;
  switch (main.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': return main.actionId;
    case 'cast_spell': return main.sourceActionId;
    case 'use_world_object': return main.actionId;
    case 'dodge':
    case 'disengage':
    case 'dash':
    case 'end_turn': return main.kind;
  }
}

function selectedOption(
  actor: EngineStateCapsule['projection']['combatants'][number],
  targetId: CombatantId,
  actionId: string,
  attackActionIds: readonly string[],
  componentIdentities: readonly { readonly kind: 'attack' | 'saving_throw'; readonly actionId: string }[],
}

function optionKind(option: EngineOfferableOption, approachFeet: number): OpportunityOptionKind {
  const main = mainUse(option);
  if (main === undefined) return 'other';
  switch (main.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw':
    case 'cast_spell': return 'offense';
    case 'dash': return approachFeet > 0 ? 'approach' : 'other';
    case 'dodge': return 'dodge';
    case 'use_world_object':
    case 'disengage':
    case 'end_turn': return 'other';
  }
}

function targetedAttacks(option: EngineOfferableOption): readonly {
  readonly actionId: string;
  readonly targetId: CombatantId;
}[] {
  return typeof profile === 'string'
    ? { kind: 'unsupported', reason: profile }
    : { kind: 'hard_control', profile };
}

function declaredUseOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
  use: EngineMainActionUse | EngineBonusActionUse,
): DeclaredOptionOutcome {
  switch (use.kind) {
    case 'attack':
    case 'multiattack': return { kind: 'attack_sequence' };
    case 'cast_spell': return declaredSpellOutcome(state, option, use);
    case 'dash': return { kind: 'movement' };
    case 'dodge':
    case 'disengage':
    case 'end_turn':
    case 'hide': return { kind: 'known_no_effect' };
    case 'saving_throw': return { kind: 'unsupported', reason: 'saving_throw_action_outcome_unsupported' };
    case 'use_world_object': return { kind: 'unsupported', reason: 'world_object_outcome_unsupported' };
  }
}

export function classifyDeclaredOptionOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
): DeclaredOptionOutcome {
  const declarations = option.actionSlots.map((slot) => declaredUseOutcome(state, option, slot.use));
  const unsupported = declarations.find(
    (declaration): declaration is Extract<DeclaredOptionOutcome, { readonly kind: 'unsupported' }> =>
      declaration.kind === 'unsupported',
  );
  if (unsupported !== undefined) return unsupported;

  readonly outputSchema: SnippetSchema<readonly EngineTurnProposal[]>;
  readonly hash: (content: string) => string;
}

type ProjectedActor = EngineStateCapsule['projection']['combatants'][number];

const RUNTIME_VERSION = 'plays-v1-skills-shadow-1';

function requestedActors(capsule: EngineStateCapsule): readonly ProjectedActor[] {
  if (capsule.request === null) return [];
  const ids = new Set(capsule.request.actors);
  return capsule.projection.combatants
    .filter((actor) => ids.has(actor.id) && actor.life !== 'dead')
    .sort((left, right) => left.id.localeCompare(right.id));
}

function explicitTargetIds(option: EngineOfferableOption): readonly CombatantId[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) => target.kind === 'combatant' ? [target.combatantId] : []);
function fallbackOption(capsule: EngineStateCapsule, proposal: EngineTurnProposal): EngineOfferableOption | null {
  if (proposal.fallbackOptionId === null) return null;
  const actor = capsule.projection.combatants.find((candidate) => candidate.id === proposal.actorId);
  return actor?.options.find((candidate) => candidate.optionId === proposal.fallbackOptionId) ?? null;
}

function actionIds(option: EngineOfferableOption): readonly string[] {
  return option.actionSlots.flatMap<string>((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack':
      case 'saving_throw': return [use.actionId];
      case 'multiattack': return use.components.map((component) => component.actionId);
      case 'cast_spell': return [use.spellId];
      case 'use_world_object': return [use.actionId];
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [use.kind];
    }
  });
}

function targetIds(option: EngineOfferableOption): readonly string[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) =>
        target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      candidate.kind === 'saving_throw' && candidate.id === use.actionId,
  );
  return targetId === null || action === undefined ? null : { targetId, action };
}

function useTargets(
  state: EncounterState,
  actorId: CombatantId,
  use: EngineMainActionUse | EngineBonusActionUse,
  queries: EngineQueryPort,
): readonly CombatantId[] | null {
  switch (use.kind) {
    case 'attack': {
      const resolved = targetUse(state, actorId, use, queries);
      return resolved === null ? null : [resolved.targetId];
    }
    case 'multiattack': {
      const targets = use.components.map((component) => component.kind === 'attack'
        ? targetUse(state, actorId, component, queries)
        : savingThrowTargetUse(state, actorId, component, queries));
      return targets.some((entry) => entry === null)
        ? null
        : targets.flatMap((entry) => entry === null ? [] : [entry.targetId]);
    }
    case 'saving_throw': {
      const targetId = resolveSelector(state, actorId, use.target, queries);
      return targetId === null ? null : [targetId];
      combatantSpace(state, candidate.profile.id),
    ) <= candidate.profile.rules.reach;
  });
}

export function classifyOptionModeling(
  state: EncounterState,
  candidate: EngineOptionModelingCandidate,
): EngineOptionModelingDisposition {
  switch (candidate.kind) {
    case 'unsupported_action':
      return {
        kind: 'no_modeled_effect',
        reason: {
          kind: 'unsupported_action_payload',
          actionId: candidate.actionId,
          actionKind: candidate.actionKind,
          sourceNote: candidate.sourceNote,
        },
      };
    case 'unsupported_spell':
      return {
        kind: 'no_modeled_effect',
        reason: {
          kind: 'unsupported_spell_payload',
          sourceActionId: candidate.sourceActionId,
          spellId: candidate.spellId,
          limitation: candidate.limitation,
        },
      };
    case 'executable': {
      const primary = candidate.actionSlots.find((slot) => slot.slot === 'main')?.use;
      if (primary === undefined) return { kind: 'primary_effect_modeled' };
      switch (primary.kind) {
        case 'dodge':
        case 'end_turn':
        case 'attack':
        case 'multiattack':
        case 'saving_throw':
        case 'use_world_object':
  throw new TypeError(`Engine option ${option.optionId} has no main action.`);
}

/** Mirrors the current turn-context information ordering at its file seam. */
export function orderOptionsAsTurnContext(
  options: readonly EngineOfferableOption[],
): readonly EngineOfferableOption[] {
  const informationRank = (option: EngineOfferableOption): number => {
    const use = mainUse(option);
    switch (use.kind) {
      case 'multiattack': return 0;
      case 'attack':
      case 'saving_throw': return 1;
      case 'cast_spell': return 2;
      case 'use_world_object': return 3;
      case 'dodge':
      case 'disengage':
      case 'dash': return 4;
      case 'end_turn': return 5;
    }
    const exhaustive: never = use;
    throw new TypeError(`Unknown engine option use: ${String(exhaustive)}`);
  };
  return [...options].sort((left, right) =>
    informationRank(left) - informationRank(right) || left.label.localeCompare(right.label));

context compacted
exec
/bin/bash -lc "sed -n '95,122p' .tmp-plans/2026-09-18-blind-01-plan.md; sed -n '265,333p' .tmp-plans/2026-09-18-blind-01-plan.md; sed -n '1,100p' src/combat/terrain.ts; rg -n 'terrainPassabilityAt|terrainWallCells|function combatantSpaceAt|function generateRoom' src/combat/terrain.ts src/combat/encounter.ts src/vtt/room-generator.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:

### 3.1 Map, component, and approaches

The canonical query-port computes one token-free map from bounds plus effective passability of
`blockedCells` and `worldObjects`. Determine only the actor footprint; read no other token. Let `C`
be its cardinally connected passable component. Open approaches are the row-major-deduplicated union:

1. **Unblocked frontier:** passable cells in `C` on the in-bounds outer boundary.
2. **Open authored door:** passable footprint cells in `C` of a `kind:'door'` object with movement
   blocking false. Closed doors contribute none; all door footprints are excluded from rule 3.
3. **Wall-opening gap runs (local; no connectivity test):** for each wall-line orientation, find a
   maximal nonempty consecutive run `R` of passable non-door cells in `C` along that line. Every cell
   in `R` must have passable immediate neighbors on both crossing sides. The two cells immediately
   before and after `R` on the wall axis must be wall cells, and the next cell outward beyond each
   must also be wall: the wall continues away from both ends. Add all cells of `R`. For a vertical
   wall this is a fixed-column north/south gap with passable west/east neighbors; transpose exactly
   for a horizontal wall. All four flanking/continuation cells must be in bounds.

Walls come from the existing effective wall structure (`terrainWallCells`). The two-wall continuation
distinguishes a cut through a wall line from parallel corridor walls and boundary-capped room strips;
multiple gaps are classified independently. The in-memory real-terrain/tracer/planner oracle is:
sealed 9x5 `{(0,2)}`; enclosed 5x5 `{}`; internal 9x9 wall single gap `{(4,4)}`;
two-cell gap `{(4,3),(4,4)}`; two gaps `{(4,2),(4,6)}`; open 4x3 boundary
`{(0,0),(1,0),(2,0),(3,0),(0,1),(3,1),(0,2),(1,2),(2,2),(3,2)}`; enclosed open-door
scene `{(3,2)}` and its closed-door twin `{}`; one-wide corridor `{}`; enclosed L-wall scene `{}`.

### 3.2 Reachability, budget, footprint, and score

### B0 — make memories safe (2 files)

Allowed: `src/combat/encounter.ts`; `tests/unit/combat/search-memory.test.ts`.

- R: section 2.1 cases fail; retain successful-Hide coverage with prior-loss cause `obscurement`.
- M: restore the `hiddenNow` bypass; never-observed Hide fails. Retire the fallback-only mutant as
  equivalent: strict `prior?.seen === true` guarantees `prior.targetPosition` exists.
- T: app 0, node 0. V: search-memory test 1/1 file, 0 failed; no offer files touched.

### B1 — projection and query contract (4 files)

Allowed: `src/vtt/intel/actor-knowledge.ts`; `src/vtt/engine-query-port.ts`;
`tests/unit/vtt/actor-knowledge.test.ts`; `tests/unit/vtt/engine-query-port.test.ts`.

- R: full precedence matrix, aperture controls, partial/zero movement, footprint, comparator, and
  query-port agreement fail before their typed producer/query exists.
- M: consume expired/never-observed memory, corridor-as-aperture, inverted score, synthetic 30-ft
  budget, or anchor-only footprint; corresponding witness fails.
- T: app 0, node 0. V: 2/2 test files, 0 failed; hand oracle gives `(3,2)`, origin variant gives 0.

### B2 — offer/resolver core plus co-located witnesses (10 files)

Allowed: `src/vtt/turn-proposal.ts`; `src/vtt/offers/offer-declarations.ts`;
`src/vtt/intent-resolver.ts`; `src/vtt/engine-round-session.ts`; `src/vtt/option-modeling.ts`;
`src/vtt/offered-option-paths.ts`; `src/vtt/blind-intent-resolver.ts`;
`src/vtt/blind-dm-contract.ts`; `src/vtt/plan-materiality.ts`;
`tests/unit/vtt/blind-cover-posture.test.ts` (**NEW**).

- R: sealed no-cue `(3,2)` + Dodge; best origin path `[]`/0 + Dodge; last-known Move + Search;
  no-coordinate and unseen-relocation controls all fail before implementation.
- M: blind branch disabled gives exactly Dodge/End Turn; inverted score chooses wrong cell; ignored
  indication chooses posture; coordinate leak fails privacy; hidden-row tie-break fails relocation.
- T: expected temporary diagnostics are only B3 consumers: app 6 and node 8
  (`dm-tactical-intel` 2, `opportunity-cost` 1, `option-outcome` 1, `engine-server` 1,
  `snippets/registry` 1; node additionally `snippets.test` 2). Anything else stops.
- V: new witness file 1/1, 0 failed; movement precedes Dodge/Search; hashes use hand bodies.

### B3 — close all action/engagement consumers/schemas (10 files)

Allowed: `src/vtt/dm-tactical-intel.ts`; `src/vtt/intel/opportunity-cost.ts`;
`src/vtt/intel/option-outcome.ts`; `src/vtt/mcp/engine-server.ts`; `src/vtt/snippets/registry.ts`;
`tests/unit/vtt/snippets.test.ts`; `tests/unit/vtt/blind-dm-contract.test.ts`;
`docs/specs/engine-proposal-contract-refusal-code.schema.json`; `src/vtt/intel/team-scorer.ts`;
`src/vtt/encounter-app.ts`.

- R: Search schema and exhaustive consumers reject/misclassify new variants; `basic_advance` misses
  posture/pursuit.
- M: omit Search from runtime schema, classify it as offense, or omit `seek_cover` from advance;
  focused schema/semantic/snippet witness fails.
- T: app 0, node 0. V: its two listed tests plus the B2 witness = 3 files, 0 failed; no defaults.

### B4 — productivity lands before COHORT gate (10 files)

Allowed: `src/vtt/challenge-feasibility.ts`; `src/vtt/scripted-party-round.ts`;
`src/vtt/speculative-planning.ts`;
`src/vtt/mcp/schemas.ts`; `docs/specs/engine-turn-context.schema.json`;
`docs/specs/engine-blind-round-intent.schema.json`;
`docs/specs/engine-blind-round-intent-result.schema.json`;
`tools/d569-second-family-manifest.ts`; `tests/unit/vtt/blind-cover-posture.test.ts`;
`tests/unit/tools/engine-mcp-server.test.ts`.

- R: author stationary/all-zero posture versus ordinary Dodge and schema boundary REDs in B4's two
  allowed test files before production edits; strict schemas initially reject Search/new engagements.
- M: count arbitrary Dodge, reject zero-score posture, or omit Search/schema branch; boundary/parity
  witness fails.
- T: app 0, node 0. V: those 2/2 test files, 0 failed; schema check/idempotence second run 0-byte diff.

### B5 — focused contracts and frozen rows (10 files)

import type { GridCell } from './grid';

export const TERRAIN_KINDS = ['open', 'half_cover', 'three_quarters_cover', 'wall'] as const;
export type TerrainKind = (typeof TERRAIN_KINDS)[number];
export type CoverTier = 'none' | 'half' | 'three_quarters' | 'total';
export type TerrainPassability = 'open' | 'difficult' | 'blocked';

/** The four canonical profiles over the existing persisted blocking triple. */
export type CanonicalWorldObjectBlocking =
  | { readonly movement: false; readonly lineOfSight: false; readonly cover: 'none' }
  | { readonly movement: false; readonly lineOfSight: false; readonly cover: 'half' }
  | { readonly movement: true; readonly lineOfSight: false; readonly cover: 'three_quarters' }
  | { readonly movement: true; readonly lineOfSight: true; readonly cover: 'total' };

/** Transitional decoded wire input; Increment 1b closes schemas to the canonical subtype. */
export interface WorldObjectBlockingWire {
  readonly movement: boolean;
  readonly lineOfSight: boolean;
  readonly cover: CoverTier;
}

export interface TerrainProfile {
  readonly coverTier: CoverTier;
  readonly passability: TerrainPassability;
  readonly blocksSight: boolean;
  readonly blocking: CanonicalWorldObjectBlocking;
}

export const TERRAIN_PROFILES = Object.freeze({
  open: Object.freeze({
    coverTier: 'none', passability: 'open', blocksSight: false,
    blocking: Object.freeze({ movement: false, lineOfSight: false, cover: 'none' }),
  }),
  half_cover: Object.freeze({
    coverTier: 'half', passability: 'difficult', blocksSight: false,
    blocking: Object.freeze({ movement: false, lineOfSight: false, cover: 'half' }),
  }),
  three_quarters_cover: Object.freeze({
    coverTier: 'three_quarters', passability: 'blocked', blocksSight: false,
    blocking: Object.freeze({ movement: true, lineOfSight: false, cover: 'three_quarters' }),
  }),
  wall: Object.freeze({
    coverTier: 'total', passability: 'blocked', blocksSight: true,
    blocking: Object.freeze({ movement: true, lineOfSight: true, cover: 'total' }),
  }),
} as const satisfies Readonly<Record<TerrainKind, TerrainProfile>>);

export function terrainProfile(kind: TerrainKind): TerrainProfile {
  return TERRAIN_PROFILES[kind];
}

export function terrainBlocking(kind: TerrainKind): CanonicalWorldObjectBlocking {
  return TERRAIN_PROFILES[kind].blocking;
}

export function terrainKindOfBlocking(blocking: CanonicalWorldObjectBlocking): TerrainKind {
  switch (blocking.cover) {
    case 'none': return 'open';
    case 'half': return 'half_cover';
    case 'three_quarters': return 'three_quarters_cover';
    case 'total': return 'wall';
  }
}

export function coverRank(tier: CoverTier): number {
  switch (tier) {
    case 'none': return 0;
    case 'half': return 1;
    case 'three_quarters': return 2;
    case 'total': return 3;
  }
}

export function passabilityRank(passability: TerrainPassability): number {
  switch (passability) {
    case 'open': return 0;
    case 'difficult': return 1;
    case 'blocked': return 2;
  }
}

export interface TerrainWorldObject {
  readonly id: string;
  readonly footprint: readonly GridCell[];
  readonly blocking: WorldObjectBlockingWire;
}

export interface TerrainState {
  readonly blockedCells: readonly GridCell[];
  readonly worldObjects: readonly TerrainWorldObject[];
}

export interface EffectiveTerrain {
  readonly kind: TerrainKind;
  /** Stable identities of the sources tied for the effective (strongest) kind. */
  readonly sourceIds: readonly string[];
}

function cellKey(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
src/vtt/room-generator.ts:1426:export function generateRoom(seed: number, options: GenerateRoomOptions = {}): GeneratedRoom {
src/combat/encounter.ts:267:import { terrainPassabilityAt, terrainWallCells } from './terrain';
src/combat/encounter.ts:1285:    if (space.cells.some((cell) => terrainPassabilityAt({ blockedCells: [], worldObjects }, cell) === 'blocked')) {
src/combat/encounter.ts:1591:  if (space.cells.some((occupied) => terrainPassabilityAt(state, occupied) === 'blocked')) {
src/combat/encounter.ts:2105:  return terrainPassabilityAt(state, cell) === 'blocked' ||
src/combat/encounter.ts:2111:  return terrainWallCells(state);
src/combat/encounter.ts:11564:    terrainPassabilityAt({ blockedCells: [], worldObjects: [object] }, cell) === 'blocked') && state.tokens.some((placed) =>
src/combat/terrain.ts:132:export function terrainPassabilityAt(state: TerrainState, cell: GridCell): TerrainPassability {
src/combat/terrain.ts:158:export function terrainWallCells(state: TerrainState): readonly GridCell[] {

exec
/bin/bash -lc "sed -n '1,110p' src/vtt/engine-query-port.ts; rg -n 'export function traceTerrainLine|interface.*Path|kind: .legal.|costFeet' src/combat/cover.ts src/vtt/engine-query-port.ts; rg -n 'combatantSpaceAt' src/combat/encounter.ts | head" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
import { combatantFaction, combatantsAreAllies } from '../combat/allies';
import { conditionSpeedPenaltyFeet, exhaustionPenalty, isIncapacitated } from '../combat/conditions';
import { creatureSizes, type KnownCreatureSize } from '../domain/enums';
import type { EncounterCombatantState, EncounterState } from '../combat/encounter';
import { detectCombatant } from '../combat/visibility-field';
import { coverBetweenCombatants, traceCombatantLine } from '../combat/cover';
import {
  applySizeSteps,
  creatureSpace,
  decodeProjectedCreatureSpace,
  effectSequence,
  minimumSpaceDistance,
  minimumSpaceDistanceToCells,
  minimumSpaceLine,
  placementFromSerialized,
  sizedCombatantState,
  type CreatureSpace,
} from '../combat/creature-space';
import type { AppliedCondition, ExhaustionLevel } from '../combat/conditions';
import { adjacentCells, gridDistance, type GridCell } from '../combat/grid';
import { findPath, findPathToAny, findPathToBest } from '../combat/movement';
import { encounterMovementWorld } from '../combat/encounter-movement-world';
import {
  evaluateMovementOptions,
  MOVEMENT_EVALUATOR_POLICY,
  type MovementEvaluation,
  type MovementEvaluationInput,
} from '../combat/movement-evaluator';
import { persistentAreaTouchesSpace } from '../combat/persistent-areas';
import type { EffectPayload, EncounterEffect } from '../combat/effects';
import { monsterAttackRange, monsterAttackRollModeSources } from '../combat/monster-commands';
import { declaredMonsterTraits } from '../combat/monster-traits';
import {
  TACTICAL_EVALUATOR_POLICY,
  evaluateTacticalAttack,
  foldTacticalAttackSequence,
  tacticalRangeVerdict,
  tacticalRangeVerdictAtDistance,
  type AttackRollModeSource,
  type MonsterRollModeCombatantFacts,
  type MonsterRollModeFeatureInput,
  type TacticalAttackInput,
  type TacticalAttackRange,
  type TacticalAttackRollModifier,
  type TacticalDamageTerm,
  type TacticalAttackEvaluation,
  type TacticalRangeBand,
  type TacticalUnresolvedReason,
} from '../combat/tactical-evaluator';
import type { MonsterAction, MonsterAttackAction, MonsterBonusAction, MonsterSavingThrowAction, MonsterSpellReference } from '../combat/statblock';
import { monsterSpellMaximumUses, monsterSpellResourcePoolId } from '../combat/statblock';
import { lookupBundledMonster } from '../combat/statblocks/companions';
import {
  engineZoneId,
  feet,
  type CombatantId,
  type EngineZoneId,
} from '../combat/values';
import { wildShapeRulesLens } from '../combat/wild-shape';
import { isEnvironmentDifficultTerrain } from '../combat/world-objects';
import { availableEngineActorOptions, resolveEngineActorOption } from './intent-resolver';
import type {
  ActorKnowledgeProjection,
  PerceivedTargetKnowledge,
} from './intel/actor-knowledge';
import type { EngineOfferableOption, EngineOptionId } from './turn-proposal';
import type { EngineOptionEnvironment } from './offers/build-offer-environment';

export interface TacticalAllocationChoice {
  readonly actorId: CombatantId;
  readonly optionId: EngineOptionId;
}

export interface TacticalAllocationCandidate {
  readonly allocationId: string;
  readonly choices: readonly TacticalAllocationChoice[];
  /** Query-only hypothetical grants; never expanded into ordinary registry options. */
  readonly modifierGrants?: readonly TacticalAllocationModifierGrant[];
}

export interface TacticalAllocationModifierGrant {
  readonly sourceActorId: CombatantId;
  readonly kind: 'bless';
  readonly targetIds: readonly CombatantId[];
}

export type TacticalAllocationReasonCode =
  | import('../combat/tactical-evaluator').TacticalSequenceReasonCode
  | 'allocation_resolved'
  | 'option_not_offered'
  | 'modifier_grant_not_in_option'
  | 'initiative_order_mismatch'
  | 'no_attacks_against_target'
  | 'attack_modifier_applied_after_grant';

export interface TacticalAllocationResult {
  readonly allocationId: string;
  readonly policy: typeof import('../combat/tactical-evaluator').TACTICAL_EVALUATOR_POLICY;
  readonly status: 'resolved' | 'unresolved';
  readonly killProbability: number | null;
  readonly expectedFailures: number | null;
  readonly expectedDamage: number | null;
  readonly reasonCodes: readonly TacticalAllocationReasonCode[];
}

export interface TacticalAllocationComparison {
  readonly policy: typeof import('../combat/tactical-evaluator').TACTICAL_EVALUATOR_POLICY;
  readonly targetId: CombatantId;
  readonly initiativeOrder: readonly CombatantId[];
  readonly allocations: readonly TacticalAllocationResult[];
src/vtt/engine-query-port.ts:129:export interface EnginePathRequest {
src/vtt/engine-query-port.ts:147:      readonly costFeet: number;
src/vtt/engine-query-port.ts:1085:      costFeet: result.cost,
src/vtt/engine-query-port.ts:1130:    ? { legal: true, cells: result.cells, costFeet: result.cost, budgetFeet: availableBudget }
src/combat/cover.ts:795:export function traceTerrainLine(
29:  combatantSpaceAt,
38:  combatantSpaceAt,
4229:    const destinationSpace = combatantSpaceAt(state, command.actor, step.to);
5046:      combatantSpaceAt(context.state, actor, anchor),
5140:      combatantSpaceAt(state, actor, anchor),
6248:          return minimumSpaceDistance(combatantSpaceAt(context.state, actor, leftEnd), sourceSpace) -
6249:            minimumSpaceDistance(combatantSpaceAt(context.state, actor, rightEnd), sourceSpace) ||
6289:            return minimumSpaceDistance(combatantSpaceAt(context.state, actor, rightEnd), sourceSpace) -
6290:              minimumSpaceDistance(combatantSpaceAt(context.state, actor, leftEnd), sourceSpace) ||
8536:    const candidateSpace = combatantSpaceAt(context.state, target, candidate);

exec
/bin/bash -lc "sed -n '129,159p' src/vtt/engine-query-port.ts; sed -n '790,820p' src/combat/cover.ts; rg -n 'export function placedToken|function monsterProfile' tests/unit/combat/fixtures.ts; sed -n '1030,1092p' src/vtt/engine-query-port.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
export interface EnginePathRequest {
  readonly actorId: CombatantId;
  readonly destination: GridCell;
  readonly movement: 'normal' | 'dash';
  readonly maximumFeet?: number;
}

export interface EngineApproachRequest {
  readonly actorId: CombatantId;
  readonly target: GridCell;
  readonly movement: 'normal' | 'dash';
  readonly maximumFeet?: number;
}

export type EnginePathResult =
  | {
      readonly legal: true;
      readonly cells: readonly GridCell[];
      readonly costFeet: number;
      readonly budgetFeet: number;
    }
  | {
      readonly legal: false;
      readonly code: 'actor_not_placed' | 'destination_unreachable' | 'insufficient_movement';
    };

export interface EngineReachRequest {
  readonly actorId: CombatantId;
  readonly targetId: CombatantId;
  readonly actionId: string;
  readonly origin?: GridCell;
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
13:export function monsterProfile(
148:export function placedToken(
    state.tokens.some((token) => token.combatantId === selector.allyId)
    ? selector.allyId
    : actorId;
  const enemies = positionedCandidates(
    state,
    (candidate) => candidate.life !== 'dead' &&
      !combatantsAreAllies(state, actorId, candidate.profile.id) &&
      (
        selector.kind === 'current_threat' ||
        selector.kind === 'enemy_threatening_ally' ||
        detectCombatant(state, actorId, candidate.profile.id).kind === 'seen'
      ),
  );
  if (selector.kind === 'lowest_hp_visible_enemy') {
    enemies.sort((left, right) =>
      left.combatant.hitPoints - right.combatant.hitPoints ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  } else {
    enemies.sort((left, right) =>
      minimumSpaceDistance(queryCombatantSpace(state, distanceOriginId), queryCombatantSpace(state, left.combatant.profile.id)) -
        minimumSpaceDistance(queryCombatantSpace(state, distanceOriginId), queryCombatantSpace(state, right.combatant.profile.id)) ||
      left.combatant.profile.id.localeCompare(right.combatant.profile.id));
  }
  return enemies[0]?.combatant.profile.id ?? null;
}

function maximumPathCost(state: EncounterState): number {
  return state.bounds.columns * state.bounds.rows * 10;
}

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

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {createEncounter,combatantSpaceAt}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {generateRoom}=require('./src/vtt/room-generator.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const K=c=>c.column+','+c.row, cell=(column,row)=>({column,row});
function approaches(s,origin){
 const inside=c=>c.column>=0&&c.row>=0&&c.column<s.bounds.columns&&c.row<s.bounds.rows;
 const pass=c=>inside(c)&&terrainPassabilityAt(s,c)"'!=='"'blocked';
 const C=new Map(),q=[origin];
 while(q.length){let c=q.shift();if(C.has(K(c))||"'!pass(c))continue;C.set(K(c),c);for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])q.push(cell(c.column+x,c.row+y))}
 const walls=new Set(terrainWallCells(s).map(K)),doors=new Set(s.worldObjects.filter(o=>o.kind==='"'door').flatMap(o=>o.footprint.map(K))),out=new Map();
 for(const c of C.values())if(c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1)out.set(K(c),c);
 for(const o of s.worldObjects)if(o.kind==='door'&&"'!o.blocking.movement)for(const c of o.footprint)if(C.has(K(c)))out.set(K(c),c);
 for(const [dx,dy]of[[0,1],[1,0]]){
  const plus=(c,n)=>cell(c.column+dx*n,c.row+dy*n);
  const runCell=c=>C.has(K(c))&&!doors.has(K(c));
  for(const start of C.values()){
   if(!runCell(start)||runCell(plus(start,-1)))continue;
   const R=[];let next=start;while(runCell(next)){R.push(next);next=plus(next,1)}
   if(!R.every(c=>pass(cell(c.column+dy,c.row+dx))&&pass(cell(c.column-dy,c.row-dx))))continue;
   if(![plus(start,-1),plus(start,-2),next,plus(next,1)].every(c=>inside(c)&&walls.has(K(c))))continue;
   for(const c of R)out.set(K(c),c)
  }
 }
 return [...out.values()].sort((a,b)=>a.row-b.row||a.column-b.column)
}
function scene(w,h,blocked,origin,pcpos,objects=[]){
 const actor=monsterProfile('"'blind-witness'),pc=playerProfile('sealed-pc');
 return freshMonsterPlanningState(createEncounter({bounds:{columns:w,rows:h},combatants:[actor,pc],tokens:[placedToken(actor,...origin),placedToken(pc,...pcpos)],blockedCells:blocked,worldObjects:objects}));
}
function walls(w,h,predicate){let a=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(x,y))a.push(cell(x,y));return a}
const perimeter=(w,h,x,y)=>x===0||x===w-1||y===0||y===h-1;
const obj=(id,kind,footprint,terrain)=>({id:'world-object:'+id,name:id,kind,position:footprint[0],footprint,durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking(terrain)});
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]"'!==b[i])return a[i]-b[i]}return 0}
function score(s,id){
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
 for(let y=0;y<s.bounds.rows;y++)for(let x=0;x<s.bounds.columns;x++){
  let dest=cell(x,y),route=env.queries.path(s,{actorId:id,destination:dest,movement:'"'normal'});
  if("'!route.legal)continue;
  const footprint=combatantSpaceAt(s,id,dest).cells;
  const profile=ap.map(a=>Math.min(...footprint.map(c=>{let t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3}[t.tier])}))).sort((a,b)=>a-b);
  candidates.push({dest,cost:route.costFeet,path:route.cells,profile});
 }
 candidates.sort((a,b)=>compare(b.profile,a.profile)||(K(a.dest)===K(origin)?-1:K(b.dest)===K(origin)?1:0)||a.cost-b.cost||a.dest.row-b.dest.row||a.dest.column-b.dest.column);
 let best=candidates[0],max=candidates.filter(c=>compare(c.profile,best.profile)===0),minCost=Math.min(...max.map(c=>c.cost));
 return {ap,origin,best,candidates,max,minCost,ties:max.filter(c=>c.cost===minCost)}
}
function outputScore(name,s,id){
 const r=score(s,id);console.log(JSON.stringify({name,approaches:r.ap.length,origin:r.origin,candidates:r.candidates.length,maxima:r.max.length,best:r.best,ties:r.ties.map(c=>({dest:c.dest,cost:c.cost,path:c.path}))}));return r
}

const controls=[];
controls.push(['"'sealed9x5',scene(9,5,walls(9,5,(x,y)=>(perimeter(9,5,x,y)||x===6)&&"'!(x===0&&y===2)),[1,2],[7,2],[obj('"'half','cover',[cell(2,2)],'half_cover')])]);
controls.push(['enclosed5x5',scene(5,5,walls(5,5,(x,y)=>perimeter(5,5,x,y)),[1,2],[3,2])]);
for(const gaps of [[4],[3,4],[2,6]])controls.push(['gap'+gaps,scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&"'!gaps.includes(y))),[2,4],[6,4])]);
controls.push(['"'open4x3',scene(4,3,[],[0,1],[3,1])]);
for(const open of [true,false])controls.push(['door'+open,scene(7,5,walls(7,5,(x,y)=>perimeter(7,5,x,y)||(x===3&&y"'!==2)),[1,2],[5,2],[obj('"'door','door',[cell(3,2)],open?'open':'wall')])]);
controls.push(['thinCorridor3x7',scene(3,7,walls(3,7,(x,y)=>x"'!==1||y===0||y===6),[1,1],[1,5])]);
controls.push(['"'thickCorridor5x7',scene(5,7,walls(5,7,(x,y)=>x"'!==2||y===0||y===6),[2,1],[2,5])]);
controls.push(['"'Lwall9x9',scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&y>=2&&y<=6)||(y===6&&x>=4&&x<=6)),[2,4],[6,4])]);
for(const [name,s]of controls)console.log(JSON.stringify({name,approaches:approaches(s,s.tokens[0].position).map(K)}));
outputScore('sealed9x5',controls[0][1],'blind-witness');
for(const py of[1,5]){
 let s=scene(9,7,walls(9,7,(x,y)=>(perimeter(9,7,x,y)||x===6)&&"'!(x===0&&y===3)),[1,3],[7,py],[obj('"'half','cover',[cell(2,2),cell(2,3),cell(2,4)],'half_cover')]);
 let r=outputScore('relocatePC'+py,s,'blind-witness');
 let mutant=r.ties.slice().sort((a,b)=>Math.abs(a.dest.row-py)-Math.abs(b.dest.row-py)||a.dest.row-b.dest.row||a.dest.column-b.dest.column)[0];
 console.log(JSON.stringify({name:'hiddenRowMutant'+py,best:mutant?.dest,cost:mutant?.cost}));
}
for(const seed of[6209001,6209003]){
 let s=freshMonsterPlanningState(generateRoom(seed,{difficulty:'brutal'}).encounter.state);
 console.log(JSON.stringify({seed,bounds:s.bounds,actors:s.combatants.map(c=>({id:c.profile.id,name:c.profile.name})),tokens:s.tokens}));
 for(const c of s.combatants)if(seed===6209001?/Bear|Eagle|Ghast/i.test(c.profile.name):/Goblin Boss/i.test(c.profile.name))outputScore(seed+':'+c.profile.name,s,c.profile.id);
 if(seed===6209001)for(const t of[s.tokens[0],s.tokens[s.tokens.length-1]])console.log(JSON.stringify({name:'6209001side:'+t.combatantId,approaches:approaches(s,t.position).map(K)}))
}

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 exited 1 in 2298ms:
{"name":"sealed9x5","approaches":["0,2"]}
{"name":"enclosed5x5","approaches":[]}
{"name":"gap4","approaches":["4,4"]}
{"name":"gap3,4","approaches":["4,3","4,4"]}
{"name":"gap2,6","approaches":["4,2","4,6"]}
{"name":"open4x3","approaches":["0,0","1,0","2,0","3,0","0,1","3,1","0,2","1,2","2,2","3,2"]}
{"name":"doortrue","approaches":["3,2"]}
{"name":"doorfalse","approaches":[]}
{"name":"thinCorridor3x7","approaches":[]}
{"name":"thickCorridor5x7","approaches":["2,2","2,3","2,4"]}
{"name":"Lwall9x9","approaches":[]}
[stdin]:45
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
                                                  ^

TypeError: Cannot read properties of undefined (reading 'position')
    at score ([stdin]:45:51)
    at outputScore ([stdin]:58:10)
    at [stdin]:71:1
    at runScriptInThisContext (node:internal/vm:219:10)
    at node:internal/process/execution:451:12
    at [stdin]-wrapper:6:24
    at runScriptInContext (node:internal/process/execution:449:60)
    at evalFunction (node:internal/process/execution:283:30)
    at evalTypeScript (node:internal/process/execution:295:3)
    at node:internal/main/eval_stdin:51:5

Node.js v24.13.0

exec
/bin/bash -lc "nl -ba .tmp-plans/2026-09-18-blind-01-plan.md | sed -n '120,266p'; sed -n '180,340p' src/vtt/turn-proposal.ts; cat tsconfig.app.json; cat tsconfig.node.json" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
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
   166	This remains the offer/privacy control, not the direction-mutant killer.
   167	
   168	Separate concrete direction RED: a 9x7 room has perimeter walls except frontier `(0,3)`, a full wall
   169	at column 6, actor `(1,3)`, and passable half-cover footprint `(2,2)..(2,4)`. With the unseen PC at
   170	`(7,1)` or `(7,5)`, the sole approach is `(0,3)`; the only minimum-cost maxima are `(2,1)` and `(2,5)`,
   171	both profile `[(0,1)]`, cost 10, paths `[(1,2),(2,1)]` / `[(1,4),(2,5)]`. Canonical row order picks
   172	`(2,1)` in both states. The exact mutant, after profile/cost ties, minimizes absolute row distance to
   173	the current unseen PC: it picks `(2,1)` then `(2,5)`. Topology/path legality stay byte-identical, so
   174	the canonical equality plus mutant inequality kills hidden-direction use without coordinate leakage.
   175	
   176	Additional hand tables:
   177	
   178	- Multi-approach comparison: lower-row A has sorted `[(0,0),(0,2)]`; B has
   179	  `[(0,1),(0,1)]`. Both sum to 2, but weakest-first lexicographic chooses B.
   180	- Optical discriminator: C `[(1,0)]` beats D `[(0,2)]` under the default; this freezes Q1.
   181	- Equal profile/equal cost candidates prove row then column; empty approach set proves origin.
   182	- A Large 2x2 candidate with per-footprint traces `[half,none,half,none]` scores none. Exercise both
   183	  measured Large species so anchor-only scoring fails. Freeze footprint-aware 6209001 winners:
   184	  Bear `(16,2)`/10 ft, Eagle `(20,4)`/5 ft (never `(19,4)`), Ghast `(18,2)`/5 ft.
   185	
   186	## 4. Offer shape, execution, identity, and privacy
   187	
   188	Replace `EngineEngagement` (`src/vtt/turn-proposal.ts:115-123`) with a discriminated union retaining
   189	existing target stances and adding:
   190	
   191	- `{stance:'pursue_indication', indication: KnownIndication}` containing actor-known history/memory;
   192	- `{stance:'seek_cover', objective:{kind:'open_approach_cover', policy:'blind-cover-v1'}}` with no
   193	  target, selector, anchor, or cell.
   194	
   195	Add main action `{kind:'search', targetId, reliance:'sight'}` and resolved Search to every closed
   196	action/schema union, including `src/vtt/blind-dm-contract.ts:97-120`. Narrow engagement before reading
   197	`anchor` in `src/vtt/plan-materiality.ts:126-130`. `intent-resolver.ts:308-340` supplies movement
   198	resolution, and `engine-round-session.ts` already executes movement before the main action.
   199	
   200	- `normal`: unchanged offers.
   201	- `pursue_indication`: normal-speed objective toward any indicated cell, minimizing distance to the
   202	  region, then path cost/row/column; execute existing Search after movement. It need not reach the
   203	  region this turn. Retain defensive/End Turn fallbacks.
   204	- `blind_posture`: one `Seek Cover + Dodge` composite—normal movement objective plus Dodge main
   205	  action—and End Turn. It is not Dash+Dodge; Dash consumes the same main slot and remains only in
   206	  normal declarations (`offer-declarations.ts:497-506`).
   207	
   208	`basic_advance` (`src/vtt/snippets/registry.ts:158-202`) recognizes pursuit and cover posture before
   209	its defensive fallback; ordinary offense still wins. Search is utility, not offense/damage.
   210	
   211	Offer identity is policy identity: `engineOfferableOption` hashes the canonical offer body
   212	(`src/vtt/option-modeling.ts:26-33`). Adding the typed stance/policy changes IDs of replaced/new
   213	offers; unchanged normal bodies keep IDs. A resolver-only destination/tie-order change does **not**
   214	change the policy-only offer or ID—it changes resolved mechanics/path and resolution digest. Tests
   215	hand-build canonical bodies and use the independent existing canonical-json/SHA helper.
   216	
   217	No-coordinate witness deep-walks the blind-posture offer body and asserts no opponent CombatantId and
   218	no GridCell-shaped `{column,row}` pair occurs; movement contains only the policy tag. A pursuit
   219	control contains its historical cell, proving the walker is live. Resolved mechanics may contain the
   220	chosen cover cell. Mutants that leak `(7,2)` or steer from the unseen PC without serialization fail
   221	the structural/relocation pair.
   222	
   223	## 5. Productivity contract
   224	
   225	Export one structural **component-classification** helper from
   226	`tools/d569-second-family-manifest.ts`; brutal-b, v2 after B7, and later v6 call it. It returns true
   227	for a valid resolved option with:
   228	
   229	1. existing positive movement, attack, save, cast, or world-object action; or
   230	2. Search paired with `pursue_indication` (movement may be 0 inside the region); or
   231	3. exactly one main Dodge paired with `seek_cover`, whether movement is positive or 0 and whether
   232	   all cover scores are zero/approaches empty.
   233	
   234	An ordinary stationary Dodge and malformed/unresolvable posture remain false. In v2 this helper
   235	replaces **only** `hasProductiveComponent`; preserve the existing conjunction that every targeted
   236	offensive slot passes `targetedOffenseHasOpenTrace`. Keep the blocked-Web negative: a valid structural
   237	Web remains unproductive through half cover with `blocksSight:true`. Pursuit Search and posture have
   238	no targeted offense, so extend productivity without weakening that trace gate. A room is unproductive
   239	when any living monster has no valid option passing both component classification and applicable
   240	trace checks; already-best cover is valid, but unplaced/action-spent without posture can still fail.
   241	
   242	Pre-change measured population, used as the expectation source:
   243	
   244	| Category | Blind / living | Expected productive blind |
   245	|---|---:|---:|
   246	| hard 5117 | 55 / 75 | 55 / 55 |
   247	| brutal 6203 | 25 / 44 | 25 / 25 |
   248	| brutal-b 6206 | 40 / 42 | 40 / 40 |
   249	| brutal-2 6207 | 29 / 44 | 29 / 29 |
   250	| rejected/new 6209 | 36 / 46 | 36 / 36 |
   251	| aggregate | 185 / 251 | 185 / 185 |
   252	
   253	Pin 6209003 Goblin Boss explicitly: 55 approaches, 31 candidates, 11 tied maxima, origin `(11,2)`
   254	cost 0; its valid stationary posture is productive. The zero-score posture/ordinary-Dodge contrast
   255	is a separate RED witness.
   256	
   257	## 6. Ordered batches (each at most ten files)
   258	
   259	For every batch: R is hand-authored RED before production change; T is both
   260	`npx tsc -p tsconfig.app.json --noEmit` and `npx tsc -p tsconfig.node.json --noEmit`; M is applied and
   261	reverted with the same focused witnesses; V runs
   262	`npx vitest run --configLoader runner --maxWorkers=1 <listed tests>`, expected listed files collected,
   263	0 failed/0 skipped unless an existing pin says otherwise. Never update from changed output.
   264	
   265	### B0 — make memories safe (2 files)
   266	
      readonly actionId: EngineActionId;
      readonly target: EngineTargetSelector;
    }
  | { readonly kind: 'dash' | 'disengage' | 'hide' };

export type EngineActionSlotUse =
  | { readonly slot: 'main'; readonly use: EngineMainActionUse }
  | { readonly slot: 'bonus'; readonly use: EngineBonusActionUse };

export interface EngineTurnProposal {
  readonly actorId: CombatantId;
  readonly expectedRevision: number;
  readonly primaryOptionId: EngineOptionId;
  readonly fallbackOptionId: EngineOptionId | null;
  /** Verbatim, bounded explanation supplied by the decision author. */
  readonly reason: string;
  readonly activationChoice?: EngineActivationChoice | null;
  readonly overrideJustification: EngineOverrideJustification | null;
}

export interface ResolvedActionSlotUse {
  readonly slot: 'main' | 'bonus';
  readonly kind:
    | 'attack'
    | 'saving_throw'
    | 'cast_spell'
    | 'use_world_object'
    | 'dodge'
    | 'disengage'
    | 'dash'
    | 'hide'
    | 'end_turn';
  readonly actionId: EngineActionId;
  readonly spellId: EngineSpellId | null;
  readonly targetIds: readonly CombatantId[];
  readonly objectId: WorldObjectId | null;
  readonly omittedRiders: readonly EngineOmittedRider[];
  /** Engine-bound condition encoded by a revision-bound offered option. */
  readonly selectedCondition?: LesserRestorationCondition;
  readonly activationChoice?: EngineActivationChoice;
  readonly multiattackComponent?: true;
  /** Present only for a placed-area spell. */
  readonly area?: AreaTemplate;
}

export interface ResolvedTurnMechanics {
  readonly actorId: CombatantId;
  readonly optionId: EngineOptionId;
  readonly movementCostFeet: number;
  readonly path: readonly GridCell[];
  readonly finalPosition: GridCell;
  readonly actionSlots: readonly ResolvedActionSlotUse[];
  readonly omittedRiders: readonly EngineOmittedRider[];
}

export type EngineProposalResolution =
  | {
      readonly valid: true;
      readonly selectedBranch: 'primary' | 'fallback';
      readonly resolutionDigest: string;
      readonly summary: string;
      readonly refusals: readonly {
        readonly branch: 'primary';
        readonly code: string;
        readonly summary: string;
      }[];
      readonly mechanics: ResolvedTurnMechanics;
      readonly option: EngineOfferableOption;
      readonly primaryOption: EngineOfferableOption;
      readonly fallbackOption: EngineOfferableOption | null;
    }
  | {
      readonly valid: false;
      readonly selectedBranch: 'none';
      readonly refusals: readonly {
        readonly branch: 'primary' | 'fallback';
        readonly code: string;
        readonly summary: string;
      }[];
    };

export interface PureTurnProposalResolver {
  resolve(state: import('../combat/encounter').EncounterState, proposal: EngineTurnProposal): EngineProposalResolution;
}
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "WebWorker"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "tsBuildInfoFile": "/tmp/dnd-multiclass-spells-static-app.tsbuildinfo",
    "noEmit": true,
    "strict": true
  },
  "include": ["src"]
}
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023", "DOM"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "Bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "isolatedModules": true,
    "tsBuildInfoFile": "/tmp/dnd-multiclass-spells-static-node.tsbuildinfo",
    "noEmit": true,
    "strict": true,
    "types": ["node", "vite/client"]
  },
  "include": [
    "vite.config.ts",
    "vitest.config.ts",
    "playwright.config.ts",
    "src/vite-env.d.ts",
    "db",
    "scripts",
    "tests",
    "tools"
  ]
}

exec
/bin/bash -lc "sed -n '1,50p' tests/unit/combat/fixtures.ts; sed -n '145,161p' tests/unit/combat/fixtures.ts; sed -n '94,176p' src/vtt/turn-proposal.ts; sed -n '85,125p' src/vtt/blind-dm-contract.ts; sed -n '110,162p' src/vtt/intent-resolver.ts; sed -n '278,327p' src/vtt/intent-resolver.ts; sed -n '400,430p' src/vtt/intent-resolver.ts; sed -n '170,215p' src/vtt/option-modeling.ts; sed -n '285,345p' src/vtt/blind-intent-resolver.ts; sed -n '74,106p' src/vtt/offered-option-paths.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
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
  });
}

export function placedToken(
  profile: CombatantProfile,
  column: number,
  row = 0,
): CombatToken {
  return combatToken(profile, { column, row });
}
  | {
      readonly kind: 'calm_emotions_per_target';
      readonly targetIds: readonly CombatantId[];
      readonly values: typeof CALM_EMOTIONS_MODES;
    };

export type EngineActivationChoice =
  | { readonly kind: 'command_word'; readonly value: CommandWord }
  | { readonly kind: 'unicorns_blessing_spell'; readonly value: UnicornsBlessingSpell }
  | { readonly kind: 'dispel_evil_and_good_mode'; readonly value: DispelEvilAndGoodMode }
  | {
      readonly kind: 'calm_emotions_per_target';
      readonly selections: readonly { readonly targetId: CombatantId; readonly mode: CalmEmotionsMode }[];
    };

export interface EngineMovementPreference {
  readonly willingness: 'none' | 'only_if_required' | 'for_clear_advantage' | 'freely';
  readonly maximumFeet?: number;
  readonly opportunityRisk: 'avoid' | 'accept_if_needed' | 'accept';
}

export interface EngineEngagement {
  readonly stance: 'hold_position' | 'close_to_melee' | 'maintain_range' | 'withdraw';
  readonly anchor?: EngineTargetSelector | null;
}

export interface EngineMovementObjective {
  readonly preference: EngineMovementPreference;
  readonly engagement: EngineEngagement;
}

export interface EngineTargetedAttackUse {
  readonly kind: 'attack';
  readonly actionId: EngineActionId;
  readonly target: EngineTargetSelector;
}

export type EngineMultiattackComponentUse = (
  | EngineTargetedAttackUse
  | {
      readonly kind: 'saving_throw';
      readonly actionId: EngineActionId;
      readonly target: EngineTargetSelector;
    }
) & { readonly omittedRiders: readonly EngineOmittedRider[] };

export type EngineMainActionUse =
  | EngineTargetedAttackUse
  | {
      readonly kind: 'multiattack';
      readonly actionId: EngineActionId;
      readonly components: readonly EngineMultiattackComponentUse[];
    }
  | {
      readonly kind: 'saving_throw';
      readonly actionId: EngineActionId;
      readonly target: EngineTargetSelector;
    }
  | {
      readonly kind: 'cast_spell';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly targets: readonly EngineTargetSelector[];
      /** Exact engine-owned placement; null for spells without a placed area. */
      readonly area: AreaTemplate | null;
    }
  | {
      readonly kind: 'use_world_object';
      readonly objectId: WorldObjectId;
      readonly actionId: EngineActionId;
    }
  | { readonly kind: 'dodge' | 'disengage' | 'dash' | 'end_turn' };

export type EngineBonusActionUse =
  | {
      readonly kind: 'cast_spell';
      readonly sourceActionId: EngineActionId;
      readonly spellId: EngineSpellId;
      readonly targets: readonly EngineTargetSelector[];
      /** Engine-bound condition encoded by a revision-bound offered option. */
      readonly selectedCondition?: LesserRestorationCondition;
      /** Exact engine-owned placement; null for spells without a placed area. */
      readonly area: AreaTemplate | null;
export const blindActorReferenceSchema = z.strictObject({
  name: blindBoundedNameSchema,
  badge: blindPositiveBadgeSchema,
});
export type BlindActorReference = z.infer<typeof blindActorReferenceSchema>;

export const namedBoardEntitySchema = z.strictObject({
  name: blindBoundedNameSchema,
  badge: blindPositiveBadgeSchema.optional(),
});
export type NamedBoardEntity = z.infer<typeof namedBoardEntitySchema>;

export const blindActionKinds = [
  'attack',
  'cast',
  'interact',
  'dash',
  'dodge',
  'disengage',
  'hide',
  'help',
  'ready',
  'end',
] as const;
export const blindActionKindSchema = z.enum(blindActionKinds);
export type BlindActionKind = z.infer<typeof blindActionKindSchema>;

const namedBlindActionSchema = z.union([
  z.strictObject({ kind: z.literal('attack'), name: blindBoundedNameSchema.optional() }),
  z.strictObject({ kind: z.literal('cast'), name: blindBoundedNameSchema }),
  z.strictObject({ kind: z.literal('interact'), name: blindBoundedNameSchema.optional() }),
]);
const simpleBlindActionSchema = z.strictObject({
  kind: z.enum(['dash', 'dodge', 'disengage', 'hide', 'help', 'ready', 'end']),
});
export const blindActionSchema = z.union([namedBlindActionSchema, simpleBlindActionSchema]);
export type BlindAction = z.infer<typeof blindActionSchema>;

export const blindTargetSchema = z.strictObject({
  kind: z.enum(['creature', 'object']),
  name: blindBoundedNameSchema,
  const action = monsterActions(state, actorId).find(
    (candidate): candidate is MonsterAttackAction => candidate.kind === 'attack' && candidate.id === use.actionId,
  );
  return targetId === null || action === undefined ? null : { targetId, action };
}

function savingThrowTargetUse(
  state: EncounterState,
  actorId: CombatantId,
  use: Extract<EngineMultiattackComponentUse, { readonly kind: 'saving_throw' }>,
  queries: EngineQueryPort,
): { readonly targetId: CombatantId; readonly action: MonsterSavingThrowAction } | null {
  const targetId = resolveSelector(state, actorId, use.target, queries);
  const action = monsterActions(state, actorId).find(
    (candidate): candidate is MonsterSavingThrowAction =>
      candidate.kind === 'saving_throw' && candidate.id === use.actionId,
  );
  return targetId === null || action === undefined ? null : { targetId, action };
}

function useTargets(
  state: EncounterState,
  actorId: CombatantId,
  use: EngineMainActionUse | EngineBonusActionUse,
  queries: EngineQueryPort,
): readonly CombatantId[] | null {
  switch (use.kind) {
    case 'attack': {
      const resolved = targetUse(state, actorId, use, queries);
      return resolved === null ? null : [resolved.targetId];
    }
    case 'multiattack': {
      const targets = use.components.map((component) => component.kind === 'attack'
        ? targetUse(state, actorId, component, queries)
        : savingThrowTargetUse(state, actorId, component, queries));
      return targets.some((entry) => entry === null)
        ? null
        : targets.flatMap((entry) => entry === null ? [] : [entry.targetId]);
    }
    case 'saving_throw': {
      const targetId = resolveSelector(state, actorId, use.target, queries);
      return targetId === null ? null : [targetId];
    }
    case 'cast_spell': {
      const targets = use.targets.map((selector) => resolveSelector(state, actorId, selector, queries));
      return targets.some((targetId) => targetId === null)
        ? null
        : targets.flatMap((targetId) => targetId === null ? [] : [targetId]);
    }
    case 'use_world_object':
    case 'dodge':
    case 'disengage':
    case 'dash':
      if (distance === null || distance > constraint.rangeFeet ||
        (constraint.source.requiresSight && traceCombatantLine(
          state, actorId, constraint.targetId, { sourceAnchor: position },
        ).blocksSight)) return false;
      continue;
    }
    const reach = queries.reach(state, {
      actorId,
      targetId: constraint.targetId,
      actionId: constraint.source.actionId,
      origin: position,
    });
    if (!reach.legal || reach.distanceFeet > constraint.rangeFeet) return false;
  }
  const anchor = movement.engagement.anchor;
  if (movement.engagement.stance === 'maintain_range' && anchor !== undefined && anchor !== null) {
    const anchorId = resolveSelector(state, actorId, anchor, queries);
    const anchorReach = anchorId === null ? null : queries.combatant(state, anchorId)?.profile.rules.reach;
    const separation = anchorId === null ? null : queries.spaceDistance(state, actorId, anchorId, position);
    if (separation === null || anchorReach === null || anchorReach === undefined || separation <= anchorReach) return false;
  }
  return true;
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

function validateUse(
  state: EncounterState,
  actorId: CombatantId,
  slot: EngineActionSlotUse['slot'],
  use: EngineMainActionUse | EngineBonusActionUse,
  queries: EngineQueryPort,
): string | null {
  const actions = monsterActions(state, actorId);
  switch (use.kind) {
    case 'attack': return targetUse(state, actorId, use, queries) === null ? 'ATTACK_UNAVAILABLE' : null;
    case 'multiattack': {
      const declaration = actions.find(
        (candidate): candidate is import('../combat/statblock').MonsterMultiattackAction =>
          candidate.kind === 'multiattack' && candidate.id === use.actionId,
      );
      if (declaration === undefined || use.components.length !== declaration.count ||
        use.components.some((component) => component.kind === 'attack'
          ? targetUse(state, actorId, component, queries) === null
          : savingThrowTargetUse(state, actorId, component, queries) === null)) {
        return 'MULTIATTACK_COMBINATION_ILLEGAL';
      }
      const legal = legalMultiattackCombinations(declaration, actions);
      return legal.some((combination) => combination.every((component, index) =>
        component.kind === use.components[index]?.kind && component.id === use.components[index]?.actionId))
        ? null
        : 'MULTIATTACK_COMBINATION_ILLEGAL';
    }
    case 'saving_throw': {
      const source = slot === 'main' ? actions : monsterBonusActions(state, actorId);
      return source.some((candidate) => candidate.kind === 'saving_throw' && candidate.id === use.actionId) &&
  actorId: CombatantId,
): boolean {
  const actorPosition = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (actorPosition === undefined) return false;
  return state.combatants.some((candidate) => {
    if (candidate.profile.id === actorId || candidate.life !== 'living' ||
      combatantsAreAllies(state, actorId, candidate.profile.id) || !candidate.turn.reactionAvailable) return false;
    const position = state.tokens.find((token) => token.combatantId === candidate.profile.id)?.position;
    return position !== undefined && minimumSpaceDistance(
      combatantSpace(state, actorId),
      combatantSpace(state, candidate.profile.id),
    ) <= candidate.profile.rules.reach;
  });
}

export function classifyOptionModeling(
  state: EncounterState,
  candidate: EngineOptionModelingCandidate,
): EngineOptionModelingDisposition {
  switch (candidate.kind) {
    case 'unsupported_action':
      return {
        kind: 'no_modeled_effect',
        reason: {
          kind: 'unsupported_action_payload',
          actionId: candidate.actionId,
          actionKind: candidate.actionKind,
          sourceNote: candidate.sourceNote,
        },
      };
    case 'unsupported_spell':
      return {
        kind: 'no_modeled_effect',
        reason: {
          kind: 'unsupported_spell_payload',
          sourceActionId: candidate.sourceActionId,
          spellId: candidate.spellId,
          limitation: candidate.limitation,
        },
      };
    case 'executable': {
      const primary = candidate.actionSlots.find((slot) => slot.slot === 'main')?.use;
      if (primary === undefined) return { kind: 'primary_effect_modeled' };
      switch (primary.kind) {
        case 'dodge':
        case 'end_turn':
): BoundEntity | 'unknown' | 'ambiguous' {
  const matches = entityCandidates(state, projection, reference, kind);
  if (matches.length === 0) return 'unknown';
  if (matches.length > 1) return 'ambiguous';
  return matches[0] ?? 'unknown';
}

function actionDisplayName(
  state: EncounterState,
  actorId: CombatantId,
  slot: EngineActionSlotUse,
  queries: EngineQueryPort,
): string | null {
  const use = slot.use;
  switch (use.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': {
      const sources = slot.slot === 'main'
        ? queries.actions(state, actorId)
        : monsterBonusActions(state, actorId);
      const source = sources.find((action) => 'id' in action && action.id === use.actionId);
      if (source === undefined) return String(use.actionId);
      if ('name' in source && typeof source.name === 'string') return source.name;
      return source.kind === 'multiattack' ? 'Multiattack' : String(use.actionId);
    }
    case 'cast_spell': return spellDefinition(use.spellId)?.name ?? String(use.spellId);
    case 'use_world_object': return String(use.actionId);
    case 'dodge': return 'Dodge';
    case 'disengage': return 'Disengage';
    case 'dash': return 'Dash';
    case 'hide': return 'Hide';
    case 'end_turn': return 'End Turn';
  }
}

function actionKind(slot: EngineActionSlotUse): BlindActionKind {
  switch (slot.use.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': return 'attack';
    case 'cast_spell': return 'cast';
    case 'use_world_object': return 'interact';
    case 'dodge': return 'dodge';
    case 'disengage': return 'disengage';
    case 'dash': return 'dash';
    case 'hide': return 'hide';
    case 'end_turn': return 'end';
  }
}

function semanticFingerprint(
  option: EngineOfferableOption,
  mechanics: ResolvedTurnMechanics,
  actions: readonly SemanticAction[],
): string {
  return canonicalJson({
    actor: String(mechanics.actorId),
    ordered_slot_kinds: option.actionSlots.map((slot) => ({
      slot: slot.slot,
      kind: slot.use.kind,
export function orderOptionsAsTurnContext(
  options: readonly EngineOfferableOption[],
): readonly EngineOfferableOption[] {
  const informationRank = (option: EngineOfferableOption): number => {
    const use = mainUse(option);
    switch (use.kind) {
      case 'multiattack': return 0;
      case 'attack':
      case 'saving_throw': return 1;
      case 'cast_spell': return 2;
      case 'use_world_object': return 3;
      case 'dodge':
      case 'disengage':
      case 'dash': return 4;
      case 'end_turn': return 5;
    }
    const exhaustive: never = use;
    throw new TypeError(`Unknown engine option use: ${String(exhaustive)}`);
  };
  return [...options].sort((left, right) =>
    informationRank(left) - informationRank(right) || left.label.localeCompare(right.label));
}

/**
 * The maximal monster segment represented by the round planner. Shared-side
 * modes plan every living monster; per-combatant mode stops at the next PC.
 */
export function actingMonsterIds(state: EncounterState): readonly CombatantId[] {
  const livingMonsters = new Set(state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life === 'living'
      ? [combatant.profile.id]
      : []));
  if (state.config.initiativeMode !== 'per_combatant') {

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {createEncounter,combatantSpaceAt}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {generateRoom}=require('./src/vtt/room-generator.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const K=c=>c.column+','+c.row, cell=(column,row)=>({column,row});
function approaches(s,origin){
 const inside=c=>c.column>=0&&c.row>=0&&c.column<s.bounds.columns&&c.row<s.bounds.rows;
 const pass=c=>inside(c)&&terrainPassabilityAt(s,c)"'!=='"'blocked';
 const C=new Map(),q=[origin];
 while(q.length){let c=q.shift();if(C.has(K(c))||"'!pass(c))continue;C.set(K(c),c);for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])q.push(cell(c.column+x,c.row+y))}
 const walls=new Set(terrainWallCells(s).map(K)),doors=new Set(s.worldObjects.filter(o=>o.kind==='"'door').flatMap(o=>o.footprint.map(K))),out=new Map();
 for(const c of C.values())if(c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1)out.set(K(c),c);
 for(const o of s.worldObjects)if(o.kind==='door'&&"'!o.blocking.movement)for(const c of o.footprint)if(C.has(K(c)))out.set(K(c),c);
 for(const [dx,dy]of[[0,1],[1,0]]){
  const plus=(c,n)=>cell(c.column+dx*n,c.row+dy*n);
  const runCell=c=>C.has(K(c))&&!doors.has(K(c));
  for(const start of C.values()){
   if(!runCell(start)||runCell(plus(start,-1)))continue;
   const R=[];let next=start;while(runCell(next)){R.push(next);next=plus(next,1)}
   if(!R.every(c=>pass(cell(c.column+dy,c.row+dx))&&pass(cell(c.column-dy,c.row-dx))))continue;
   if(![plus(start,-1),plus(start,-2),next,plus(next,1)].every(c=>inside(c)&&walls.has(K(c))))continue;
   for(const c of R)out.set(K(c),c)
  }
 }
 return [...out.values()].sort((a,b)=>a.row-b.row||a.column-b.column)
}
function scene(w,h,blocked,origin,pcpos,objects=[]){
 const actor=monsterProfile('"'blind-witness'),pc=playerProfile('sealed-pc');
 return freshMonsterPlanningState(createEncounter({bounds:{columns:w,rows:h},combatants:[actor,pc],tokens:[placedToken(actor,...origin),placedToken(pc,...pcpos)],blockedCells:blocked,worldObjects:objects}));
}
function walls(w,h,predicate){let a=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(x,y))a.push(cell(x,y));return a}
const perimeter=(w,h,x,y)=>x===0||x===w-1||y===0||y===h-1;
const obj=(id,kind,footprint,terrain)=>({id:'world-object:'+id,name:id,kind,position:footprint[0],footprint,durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking(terrain)});
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]"'!==b[i])return a[i]-b[i]}return 0}
function score(s,id){
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
 for(let y=0;y<s.bounds.rows;y++)for(let x=0;x<s.bounds.columns;x++){
  let dest=cell(x,y),route=env.queries.path(s,{actorId:id,destination:dest,movement:'"'normal'});
  if("'!route.legal)continue;
  const footprint=combatantSpaceAt(s,id,dest).cells;
  const profile=ap.map(a=>Math.min(...footprint.map(c=>{let t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3}[t.tier])}))).sort((a,b)=>a-b);
  candidates.push({dest,cost:route.costFeet,path:route.cells,profile});
 }
 candidates.sort((a,b)=>compare(b.profile,a.profile)||(K(a.dest)===K(origin)?-1:K(b.dest)===K(origin)?1:0)||a.cost-b.cost||a.dest.row-b.dest.row||a.dest.column-b.dest.column);
 let best=candidates[0],max=candidates.filter(c=>compare(c.profile,best.profile)===0),minCost=Math.min(...max.map(c=>c.cost));
 return {ap,origin,best,candidates,max,minCost,ties:max.filter(c=>c.cost===minCost)}
}
function outputScore(name,s,id){
 const r=score(s,id);console.log(JSON.stringify({name,approaches:r.ap.length,origin:r.origin,candidates:r.candidates.length,maxima:r.max.length,best:r.best,ties:r.ties.map(c=>({dest:c.dest,cost:c.cost,path:c.path}))}));return r
}

const controls=[];
controls.push(['"'sealed9x5',scene(9,5,walls(9,5,(x,y)=>(perimeter(9,5,x,y)||x===6)&&"'!(x===0&&y===2)),[1,2],[7,2],[obj('"'half','cover',[cell(2,2)],'half_cover')])]);
controls.push(['enclosed5x5',scene(5,5,walls(5,5,(x,y)=>perimeter(5,5,x,y)),[1,2],[3,2])]);
for(const gaps of [[4],[3,4],[2,6]])controls.push(['gap'+gaps,scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&"'!gaps.includes(y))),[2,4],[6,4])]);
controls.push(['"'open4x3',scene(4,3,[],[0,1],[3,1])]);
for(const open of [true,false])controls.push(['door'+open,scene(7,5,walls(7,5,(x,y)=>perimeter(7,5,x,y)||(x===3&&y"'!==2)),[1,2],[5,2],[obj('"'door','door',[cell(3,2)],open?'open':'wall')])]);
controls.push(['thinCorridor3x7',scene(3,7,walls(3,7,(x,y)=>x"'!==1||y===0||y===6),[1,1],[1,5])]);
controls.push(['"'thickCorridor5x7',scene(5,7,walls(5,7,(x,y)=>x"'!==2||y===0||y===6),[2,1],[2,5])]);
controls.push(['"'Lwall9x9',scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&y>=2&&y<=6)||(y===6&&x>=4&&x<=6)),[2,4],[6,4])]);
for(const [name,s]of controls)console.log(JSON.stringify({name,approaches:approaches(s,s.tokens[0].position).map(K)}));
outputScore('sealed9x5',controls[0][1],controls[0][1].tokens[0].combatantId);
for(const py of[1,5]){
 let s=scene(9,7,walls(9,7,(x,y)=>(perimeter(9,7,x,y)||x===6)&&"'!(x===0&&y===3)),[1,3],[7,py],[obj('"'half','cover',[cell(2,2),cell(2,3),cell(2,4)],'half_cover')]);
 let r=outputScore('relocatePC'+py,s,controls[0][1].tokens[0].combatantId);
 let mutant=r.ties.slice().sort((a,b)=>Math.abs(a.dest.row-py)-Math.abs(b.dest.row-py)||a.dest.row-b.dest.row||a.dest.column-b.dest.column)[0];
 console.log(JSON.stringify({name:'hiddenRowMutant'+py,best:mutant?.dest,cost:mutant?.cost}));
}
for(const seed of[6209001,6209003]){
 let s=freshMonsterPlanningState(generateRoom(seed,{difficulty:'brutal'}).encounter.state);
 console.log(JSON.stringify({seed,bounds:s.bounds,actors:s.combatants.map(c=>({id:c.profile.id,name:c.profile.name})),tokens:s.tokens}));
 for(const c of s.combatants)if(seed===6209001?/Bear|Eagle|Ghast/i.test(c.profile.name):/Goblin Boss/i.test(c.profile.name))outputScore(seed+':'+c.profile.name,s,c.profile.id);
 if(seed===6209001)for(const t of[s.tokens[0],s.tokens[s.tokens.length-1]])console.log(JSON.stringify({name:'6209001side:'+t.combatantId,approaches:approaches(s,t.position).map(K)}))
}

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 4240ms:
{"name":"sealed9x5","approaches":["0,2"]}
{"name":"enclosed5x5","approaches":[]}
{"name":"gap4","approaches":["4,4"]}
{"name":"gap3,4","approaches":["4,3","4,4"]}
{"name":"gap2,6","approaches":["4,2","4,6"]}
{"name":"open4x3","approaches":["0,0","1,0","2,0","3,0","0,1","3,1","0,2","1,2","2,2","3,2"]}
{"name":"doortrue","approaches":["3,2"]}
{"name":"doorfalse","approaches":[]}
{"name":"thinCorridor3x7","approaches":[]}
{"name":"thickCorridor5x7","approaches":["2,2","2,3","2,4"]}
{"name":"Lwall9x9","approaches":[]}
{"name":"sealed9x5","approaches":1,"origin":{"column":1,"row":2},"candidates":16,"maxima":3,"best":{"dest":{"column":3,"row":2},"cost":10,"path":[{"column":2,"row":1},{"column":3,"row":2}],"profile":[1]},"ties":[{"dest":{"column":3,"row":2},"cost":10,"path":[{"column":2,"row":1},{"column":3,"row":2}]}]}
{"name":"relocatePC1","approaches":1,"origin":{"column":1,"row":3},"candidates":26,"maxima":17,"best":{"dest":{"column":2,"row":1},"cost":10,"path":[{"column":1,"row":2},{"column":2,"row":1}],"profile":[1]},"ties":[{"dest":{"column":2,"row":1},"cost":10,"path":[{"column":1,"row":2},{"column":2,"row":1}]},{"dest":{"column":2,"row":5},"cost":10,"path":[{"column":1,"row":4},{"column":2,"row":5}]}]}
{"name":"hiddenRowMutant1","best":{"column":2,"row":1},"cost":10}
{"name":"relocatePC5","approaches":1,"origin":{"column":1,"row":3},"candidates":26,"maxima":17,"best":{"dest":{"column":2,"row":1},"cost":10,"path":[{"column":1,"row":2},{"column":2,"row":1}],"profile":[1]},"ties":[{"dest":{"column":2,"row":1},"cost":10,"path":[{"column":1,"row":2},{"column":2,"row":1}]},{"dest":{"column":2,"row":5},"cost":10,"path":[{"column":1,"row":4},{"column":2,"row":5}]}]}
{"name":"hiddenRowMutant5","best":{"column":2,"row":5},"cost":10}
{"seed":6209001,"bounds":{"columns":22,"rows":21},"actors":[{"id":"combatant:fighter","name":"Reference Fighter"},{"id":"combatant:cleric","name":"Reference Cleric"},{"id":"combatant:wizard","name":"Reference Wizard"},{"id":"combatant:generated-6209001-monster-1","name":"Priest"},{"id":"combatant:generated-6209001-monster-2","name":"Deepwood Bear"},{"id":"combatant:generated-6209001-monster-3","name":"Harrier Eagle"},{"id":"combatant:generated-6209001-monster-4","name":"Ghast"}],"tokens":[{"id":"token:fighter","combatantId":"combatant:fighter","position":{"column":1,"row":2},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:cleric","combatantId":"combatant:cleric","position":{"column":2,"row":4},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:wizard","combatantId":"combatant:wizard","position":{"column":1,"row":6},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:generated-6209001-monster-1","combatantId":"combatant:generated-6209001-monster-1","position":{"column":20,"row":1},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:generated-6209001-monster-2","combatantId":"combatant:generated-6209001-monster-2","position":{"column":18,"row":0},"placementMode":{"kind":"normal","actual":"Large"}},{"id":"token:generated-6209001-monster-3","combatantId":"combatant:generated-6209001-monster-3","position":{"column":20,"row":3},"placementMode":{"kind":"normal","actual":"Large"}},{"id":"token:generated-6209001-monster-4","combatantId":"combatant:generated-6209001-monster-4","position":{"column":19,"row":3},"placementMode":{"kind":"normal","actual":"Medium"}}]}
{"name":"6209001:Deepwood Bear","approaches":81,"origin":{"column":18,"row":0},"candidates":60,"maxima":15,"best":{"dest":{"column":16,"row":2},"cost":10,"path":[{"column":17,"row":1},{"column":16,"row":2}],"profile":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7]},"ties":[{"dest":{"column":16,"row":2},"cost":10,"path":[{"column":17,"row":1},{"column":16,"row":2}]}]}
{"name":"6209001:Harrier Eagle","approaches":81,"origin":{"column":20,"row":3},"candidates":8,"maxima":1,"best":{"dest":{"column":20,"row":4},"cost":5,"path":[{"column":20,"row":4}],"profile":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1,1,2,2,2,2,5,5,5,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7]},"ties":[{"dest":{"column":20,"row":4},"cost":5,"path":[{"column":20,"row":4}]}]}
{"name":"6209001:Ghast","approaches":81,"origin":{"column":19,"row":3},"candidates":81,"maxima":21,"best":{"dest":{"column":18,"row":2},"cost":5,"path":[{"column":18,"row":2}],"profile":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7]},"ties":[{"dest":{"column":18,"row":2},"cost":5,"path":[{"column":18,"row":2}]}]}
{"name":"6209001side:combatant:fighter","approaches":["0,0","1,0","2,0","3,0","4,0","5,0","6,0","7,0","8,0","9,0","10,0","12,0","13,0","14,0","15,0","16,0","17,0","18,0","19,0","20,0","21,0","0,1","21,1","0,2","21,2","0,3","21,3","0,4","21,4","0,5","21,5","0,6","21,6","0,7","21,7","0,8","21,8","0,9","21,9","0,10","21,10","0,11","11,11","21,11","0,12","21,12","0,13","21,13","0,14","21,14","0,15","21,15","0,16","21,16","0,17","21,17","0,18","21,18","0,19","21,19","0,20","1,20","2,20","3,20","4,20","5,20","6,20","7,20","8,20","9,20","10,20","12,20","13,20","14,20","15,20","16,20","17,20","18,20","19,20","20,20","21,20"]}
{"name":"6209001side:combatant:generated-6209001-monster-4","approaches":["0,0","1,0","2,0","3,0","4,0","5,0","6,0","7,0","8,0","9,0","10,0","12,0","13,0","14,0","15,0","16,0","17,0","18,0","19,0","20,0","21,0","0,1","21,1","0,2","21,2","0,3","21,3","0,4","21,4","0,5","21,5","0,6","21,6","0,7","21,7","0,8","21,8","0,9","21,9","0,10","21,10","0,11","11,11","21,11","0,12","21,12","0,13","21,13","0,14","21,14","0,15","21,15","0,16","21,16","0,17","21,17","0,18","21,18","0,19","21,19","0,20","1,20","2,20","3,20","4,20","5,20","6,20","7,20","8,20","9,20","10,20","12,20","13,20","14,20","15,20","16,20","17,20","18,20","19,20","20,20","21,20"]}
{"seed":6209003,"bounds":{"columns":12,"rows":18},"actors":[{"id":"combatant:fighter","name":"Reference Fighter"},{"id":"combatant:cleric","name":"Reference Cleric"},{"id":"combatant:wizard","name":"Reference Wizard"},{"id":"combatant:generated-6209003-monster-1","name":"Priest Acolyte"},{"id":"combatant:generated-6209003-monster-2","name":"Elder Web Tyrant"},{"id":"combatant:generated-6209003-monster-3","name":"Goblin Boss"},{"id":"combatant:generated-6209003-monster-4","name":"Cliff Glider"},{"id":"combatant:generated-6209003-monster-5","name":"Zombie"}],"tokens":[{"id":"token:fighter","combatantId":"combatant:fighter","position":{"column":1,"row":2},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:cleric","combatantId":"combatant:cleric","position":{"column":2,"row":4},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:wizard","combatantId":"combatant:wizard","position":{"column":1,"row":6},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:generated-6209003-monster-1","combatantId":"combatant:generated-6209003-monster-1","position":{"column":10,"row":1},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:generated-6209003-monster-2","combatantId":"combatant:generated-6209003-monster-2","position":{"column":8,"row":2},"placementMode":{"kind":"normal","actual":"Huge"}},{"id":"token:generated-6209003-monster-3","combatantId":"combatant:generated-6209003-monster-3","position":{"column":11,"row":2},"placementMode":{"kind":"normal","actual":"Small"}},{"id":"token:generated-6209003-monster-4","combatantId":"combatant:generated-6209003-monster-4","position":{"column":7,"row":1},"placementMode":{"kind":"normal","actual":"Medium"}},{"id":"token:generated-6209003-monster-5","combatantId":"combatant:generated-6209003-monster-5","position":{"column":10,"row":5},"placementMode":{"kind":"normal","actual":"Medium"}}]}
{"name":"6209003:Goblin Boss","approaches":55,"origin":{"column":11,"row":2},"candidates":31,"maxima":11,"best":{"dest":{"column":11,"row":2},"cost":0,"path":[],"profile":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,5,5,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7,7]},"ties":[{"dest":{"column":11,"row":2},"cost":0,"path":[]}]}

codex
The stated aperture controls pass, and the new relocation fixture is ready for the scoring check. I found a counterexample to the corridor claim: with two-cell-thick side walls, the literal rule marks three interior cells of a one-cell-wide corridor as approaches. I’m checking its effect alongside the generated-room pins and batch type checks.
exec
/bin/bash -lc "sed -n '90,150p' src/vtt/dm-tactical-intel.ts; sed -n '88,120p' src/vtt/intel/opportunity-cost.ts; sed -n '593,633p' src/vtt/intel/option-outcome.ts; sed -n '898,928p' src/vtt/mcp/engine-server.ts; sed -n '120,158p' src/vtt/snippets/registry.ts; sed -n '73,123p' tests/unit/vtt/snippets.test.ts; sed -n '115,142p' src/vtt/plan-materiality.ts; sed -n '355,460p' .tmp-plans/2026-09-18-blind-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
      }];
      case 'multiattack': return legalMultiattackCombinations(action, actions).map((combination) => ({
        actionId: action.id,
        attackActionIds: combination.flatMap((component) => component.kind === 'attack' ? [component.id] : []),
        componentIdentities: combination.map((component) => ({ kind: component.kind, actionId: component.id })),
      }));
      case 'saving_throw':
      case 'spellcasting': return [];
    }
  });
}

function optionTargets(option: EngineOfferableOption): readonly CombatantId[] {
  return option.actionSlots.flatMap((slot): readonly CombatantId[] => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) =>
        target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function optionActionId(option: EngineOfferableOption): string | null {
  const main = option.actionSlots.find((slot) => slot.slot === 'main')?.use;
  if (main === undefined) return null;
  switch (main.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': return main.actionId;
    case 'cast_spell': return main.sourceActionId;
    case 'use_world_object': return main.actionId;
    case 'dodge':
    case 'disengage':
    case 'dash':
    case 'end_turn': return main.kind;
  }
}

function selectedOption(
  actor: EngineStateCapsule['projection']['combatants'][number],
  targetId: CombatantId,
  actionId: string,
  attackActionIds: readonly string[],
  componentIdentities: readonly { readonly kind: 'attack' | 'saving_throw'; readonly actionId: string }[],
): EngineOfferableOption | null {
  return actor.options.find((option) =>
    optionActionId(option) === actionId && optionTargets(option).includes(targetId) &&
    option.actionSlots.some((slot) => slot.slot === 'main' && (
      slot.use.kind === 'attack'
        ? attackActionIds.length === 1 && slot.use.actionId === attackActionIds[0]
        : slot.use.kind === 'multiattack' &&
      ? { ...token, position: { ...position } }
      : token),
  };
}

function mainUse(option: EngineOfferableOption) {
  return option.actionSlots.find((slot) => slot.slot === 'main')?.use;
}

function optionKind(option: EngineOfferableOption, approachFeet: number): OpportunityOptionKind {
  const main = mainUse(option);
  if (main === undefined) return 'other';
  switch (main.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw':
    case 'cast_spell': return 'offense';
    case 'dash': return approachFeet > 0 ? 'approach' : 'other';
    case 'dodge': return 'dodge';
    case 'use_world_object':
    case 'disengage':
    case 'end_turn': return 'other';
  }
}

function targetedAttacks(option: EngineOfferableOption): readonly {
  readonly actionId: string;
  readonly targetId: CombatantId;
}[] {
  const main = mainUse(option);
  if (main?.kind === 'attack') {
    return main.target.kind === 'combatant'
      ? [{ actionId: String(main.actionId), targetId: main.target.combatantId }]
  const saveDc = source.kind === 'spellcasting' && source.saveDc.kind === 'present'
    ? source.saveDc.value : null;
  const profile = hardControlProfileFromDefinition(definition, targetIds, saveDc);
  return typeof profile === 'string'
    ? { kind: 'unsupported', reason: profile }
    : { kind: 'hard_control', profile };
}

function declaredUseOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
  use: EngineMainActionUse | EngineBonusActionUse,
): DeclaredOptionOutcome {
  switch (use.kind) {
    case 'attack':
    case 'multiattack': return { kind: 'attack_sequence' };
    case 'cast_spell': return declaredSpellOutcome(state, option, use);
    case 'dash': return { kind: 'movement' };
    case 'dodge':
    case 'disengage':
    case 'end_turn':
    case 'hide': return { kind: 'known_no_effect' };
    case 'saving_throw': return { kind: 'unsupported', reason: 'saving_throw_action_outcome_unsupported' };
    case 'use_world_object': return { kind: 'unsupported', reason: 'world_object_outcome_unsupported' };
  }
}

export function classifyDeclaredOptionOutcome(
  state: EncounterState,
  option: EngineOfferableOption,
): DeclaredOptionOutcome {
  const declarations = option.actionSlots.map((slot) => declaredUseOutcome(state, option, slot.use));
  const unsupported = declarations.find(
    (declaration): declaration is Extract<DeclaredOptionOutcome, { readonly kind: 'unsupported' }> =>
      declaration.kind === 'unsupported',
  );
  if (unsupported !== undefined) return unsupported;

  const hardControl = declarations.filter(
    (declaration): declaration is Extract<DeclaredOptionOutcome, { readonly kind: 'hard_control' }> =>
      declaration.kind === 'hard_control',
    actorId,
    offerEnvironment,
    capsule.revision,
  ).map((option) => [option.optionId, option] as const));
  // The byte-cap pruner removes from the tail. Keep immediately usable,
  // information-rich offense first; movement/defense follows, with End Turn
  // last. This makes truncation deterministic without promoting an unavailable
  // attack over a legal defensive turn.
  const informationRank = (option: EngineOfferableOption): number => {
    const main = option.actionSlots.find((slot) => slot.slot === 'main')?.use;
    if (main === undefined) return 6;
    switch (main.kind) {
      case 'multiattack': return 0;
      case 'attack':
      case 'saving_throw': return 1;
      case 'cast_spell': return 2;
      case 'use_world_object': return 3;
      case 'dodge':
      case 'disengage':
      case 'dash': return 4;
      case 'end_turn': return 5;
    }
  };
  return projected.options.flatMap((projectedOption) => {
    const option = registeredOptions.get(projectedOption.optionId);
    return option === undefined ? [] : [option];
  })
    .sort((left, right) => informationRank(left) - informationRank(right) || left.label.localeCompare(right.label))
    .map((option) => {
    const first = option.actionSlots[0];
    if (first === undefined) throw new Error(`Composite option ${option.optionId} has no action slot use.`);
}

type ProjectedActor = EngineStateCapsule['projection']['combatants'][number];

const RUNTIME_VERSION = 'plays-v1-skills-shadow-1';

function requestedActors(capsule: EngineStateCapsule): readonly ProjectedActor[] {
  if (capsule.request === null) return [];
  const ids = new Set(capsule.request.actors);
  return capsule.projection.combatants
    .filter((actor) => ids.has(actor.id) && actor.life !== 'dead')
    .sort((left, right) => left.id.localeCompare(right.id));
}

function explicitTargetIds(option: EngineOfferableOption): readonly CombatantId[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) => target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function isDefense(option: EngineOfferableOption): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' &&
    (slot.use.kind === 'dodge' || slot.use.kind === 'end_turn'));
}

function isAdvance(option: EngineOfferableOption): boolean {
  return option;
}

function fallbackOption(capsule: EngineStateCapsule, proposal: EngineTurnProposal): EngineOfferableOption | null {
  if (proposal.fallbackOptionId === null) return null;
  const actor = capsule.projection.combatants.find((candidate) => candidate.id === proposal.actorId);
  return actor?.options.find((candidate) => candidate.optionId === proposal.fallbackOptionId) ?? null;
}

function actionIds(option: EngineOfferableOption): readonly string[] {
  return option.actionSlots.flatMap<string>((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack':
      case 'saving_throw': return [use.actionId];
      case 'multiattack': return use.components.map((component) => component.actionId);
      case 'cast_spell': return [use.spellId];
      case 'use_world_object': return [use.actionId];
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [use.kind];
    }
  });
}

function targetIds(option: EngineOfferableOption): readonly string[] {
  return option.actionSlots.flatMap((slot) => {
    const use = slot.use;
    switch (use.kind) {
      case 'attack': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'multiattack': return use.components.flatMap((component) =>
        component.target.kind === 'combatant' ? [component.target.combatantId] : []);
      case 'saving_throw': return use.target.kind === 'combatant' ? [use.target.combatantId] : [];
      case 'cast_spell': return use.targets.flatMap((target) =>
        target.kind === 'combatant' ? [target.combatantId] : []);
      case 'use_world_object':
      case 'dodge':
      case 'disengage':
      case 'dash':
      case 'hide':
      case 'end_turn': return [];
    }
  });
}

function isOffensive(option: EngineOfferableOption): boolean {
  return option.actionSlots.some((slot) =>
    slot.use.kind === 'attack' || slot.use.kind === 'multiattack' || slot.use.kind === 'saving_throw');
}
      }
    : {
        actorId: option.actorId,
        valid: false,
        resolvedActions: [],
        resolvedTargets: [],
        refusalCodes: [resolution.code],
        movementCostBucketFeet: null,
      };
}

function configuredCombatantAnchors(options: readonly EngineOfferableOption[]): readonly CombatantId[] {
  return options.flatMap((option) => {
    const anchor = option.movement.engagement.anchor;
    return anchor?.kind === 'combatant' ? [anchor.combatantId] : [];
  });
}

function canonicalTurnEvents(events: readonly PlanRelevanceTurnEvent[]): readonly PlanRelevanceTurnEvent[] {
  return [...events].sort((left, right) => canonicalJson(left).localeCompare(canonicalJson(right)));
}

export function createPlanRelevanceRecord(context: PlanRelevanceContext): PlanRelevanceRecord {
  const openMonsterActorIds = uniqueSorted(context.openMonsterActorIds);
  const planningState = projectFutureMonsterTurns(context.state, openMonsterActorIds);
  const registry = engineActionRegistryForEnvironment(context.state, context.offerEnvironment);
  const open = new Set(openMonsterActorIds);
  const remaining = context.remainingOptions.filter((option) => open.has(option.actorId))

- R: retain old affected rows as RED and attach actor branch/destination/profile/action/hash proof.
- M: replay four required mutants; unrelated/pre-change control changes fail exact pins.
- T: app 0, node 0. V: 10/10 files, 0 failed; hard-family hand rows agree; all 185 blind are
  productive by category; D583 core-stage set is its independently derived subset, not normalized.

### B7 — COHORT integration at `bea24cbe` + accepted core (2 files)

Allowed: `tests/unit/vtt/arena-basis-brutal-v2.test.ts` (**COHORT prerequisite**, absent at b94);
`tests/unit/tools/d569-second-family-manifest.test.ts`.

- R: wire v2's local predicate to the shared component helper before COHORT B3. Its in-memory
  stationary 6209003 and zero-score posture REDs turn green; retain blocked-Web trace rejection.
- M: restore local component logic, reject movement-0 posture, or bypass `targetedOffenseHasOpenTrace`;
  stationary/zero-score/blocked-Web witnesses respectively fail.
- T: app 0, node 0. V-pre-generation: focused witnesses in the two files, 0 failed; **do not mark B7
  complete**. Outstanding V: after all 30 fixtures exist at a recorded revision, run the full v2 file,
  require all 30/30 membership rows and controls green, v1/v5 byte-frozen, D583 exactly 216.

## 7. Pin ledger: demonstrate, then normalize

For every changed exact pin, first retain the old expected row as RED; add a hand table of approaches,
all maximal destinations, winner, cost, runner-up profile, and action; only then edit named fields.

| Surface | Proof and permitted change |
|---|---|
| `tests/unit/vtt/composite-turn-proposals.test.ts:153-164` | Seed 5117005: prove each blind Scout's matrix branch and cover table; replace only Dodge/End-Turn behavior with the proved composite. Perceived controls unchanged. |
| `tests/unit/vtt/engine-opportunity-movement-intel.test.ts:71-163` Room 8 | Hand-score monsters 1/2/4 against every tied maximum; monster 5's perceived 55-ft Dash remains unchanged. Normalize only blind option/path/ID and dependent intel. |
| `tests/unit/vtt/speculative-planning.test.ts:543-565` | Preserve COHORT's nonempty-menu scene; hand-prove objective/path, dependency facts, scores, byte tie order, seam mutation. Never normalize to empty. |
| `tests/unit/vtt/snippets.test.ts:329-380,489-503` | Hand bodies prove `basic_advance`: posture for no cue, Move+Search for last-known, existing Dash/offense for perceived. |
| `tests/unit/vtt/standard-offer-generator.test.ts:19-125` | Enumerate labels, slot uses, movement objectives/order, bodies/hashes. Normal perceived counts/IDs stay unchanged. |
| `tests/unit/vtt/arena-basis-brutal-b.test.ts:378-443` (requested frozen rows 425-431) | Fixture hashes/membership freeze. Before each changed selected row, record branch, profile alternatives, chosen path/action/body hash. |
| `tests/unit/vtt/engine-query-port.test.ts:184-314` | Agreement: injected result/path equals canonical path/direct traces; include nine opening controls, partial movement, Large footprint, sealed privacy, and the exact `(2,1)`/`(2,5)` relocation mutant fixture. |
| D569 v2/v6 | B7 wires only supplied v2 plus shared test, preserves `targetedOffenseHasOpenTrace`/blocked Web, and remains incomplete until 30 fixtures exist and full v2 passes. Later v6 consumes the helper; v1/v5 rows/IDs/fixtures freeze. |
| `tests/unit/tools/ai-dm-arena.test.ts`, `tests/unit/tools/ai-dm-conversation.test.ts` | For each affected authorized-plan/round row, prove branch, cell/profile or indication, movement/action, and hand-built ID; narrative moves only when exact option facts change. |

## 8. D583 ownership inventory: 148 -> 216 specs

Derive the expected set independently from the 148-spec b94 baseline, named
`claude/cohort-01@bea24cbe` prerequisites, and the one new BLIND-01 test. `turn-proposal.ts` alone
reaches 213; the complete 55-path B0-B7 manifest reaches 216. The exact +68 specs are:

```text
tests/integration/authoring/handlers.test.ts; tests/integration/party/token-never-travels.test.ts; tests/integration/queries/completeness-rpc.test.ts; tests/integration/queries/level-up-wizard.test.ts; tests/integration/queries/rpc.test.ts; tests/integration/tools/generate-heldout-party-basis.test.ts; tests/integration/vtt/ai-dm-arena-interleave.test.ts; tests/integration/vtt/stored-character-party-member.test.ts
tests/unit/assets/board-glyphs.test.ts; tests/unit/assets/encounter-board-art.test.ts; tests/unit/assets/light-encoding.test.ts; tests/unit/assets/starter-art.test.ts; tests/unit/combat/movement-evaluator.test.ts; tests/unit/combat/tactical-evaluator-actor-knowledge.test.ts; tests/unit/combat/visibility-field.test.ts; tests/unit/tools/agent-conformance.SIMULATED.test.ts; tests/unit/tools/ai-dm-conversation-row-codec.test.ts; tests/unit/tools/ai-dm-legacy-invariance.test.ts; tests/unit/tools/ai-dm-rerun-packet-protocol.test.ts; tests/unit/tools/ai-dm-rerun-packet.test.ts; tests/unit/tools/d569-blind-experiment.test.ts; tests/unit/tools/d569-second-family-manifest.test.ts; tests/unit/tools/d569-v5.test.ts; tests/unit/tools/engine-mcp-server.test.ts; tests/unit/ui/character-list.test.ts; tests/unit/ui/guided-builder.test.ts; tests/unit/ui/homebrew-library.test.ts; tests/unit/ui/level-up-planned-steps.test.ts; tests/unit/ui/level-up-wizard.test.ts; tests/unit/ui/planner.test.ts
tests/unit/vtt/agent-round-decision.test.ts; tests/unit/vtt/arena-basis-brutal-v2.test.ts; tests/unit/vtt/blind-context-source-binding.test.ts; tests/unit/vtt/blind-cover-posture.test.ts; tests/unit/vtt/blind-dm-contract.test.ts; tests/unit/vtt/blind-intent-resolver.test.ts; tests/unit/vtt/blind-model-ingress.test.ts; tests/unit/vtt/blind-turn-context.test.ts; tests/unit/vtt/challenge-feasibility-production.test.ts; tests/unit/vtt/closed-predicates.test.ts; tests/unit/vtt/content-pack-import-order.test.ts; tests/unit/vtt/controller-assignment.test.ts; tests/unit/vtt/decision-trace.test.ts; tests/unit/vtt/door-intent.test.ts; tests/unit/vtt/encounter-selectors.test.ts; tests/unit/vtt/encounter-session-service.test.ts; tests/unit/vtt/experiment-orchestrator.test.ts; tests/unit/vtt/generated-encounter-fixtures.test.ts; tests/unit/vtt/handoff-examples.test.ts; tests/unit/vtt/heldout-evaluation.test.ts; tests/unit/vtt/in-process-transport.test.ts; tests/unit/vtt/node-runtime.test.ts; tests/unit/vtt/node-websocket-transport.test.ts; tests/unit/vtt/offer-environment-board-sequence.test.ts; tests/unit/vtt/offer-environment-identity.test.ts; tests/unit/vtt/offer-environment.test.ts; tests/unit/vtt/opportunity-selection.test.ts; tests/unit/vtt/plays-v1.test.ts; tests/unit/vtt/protocol-runtime.test.ts; tests/unit/vtt/reaction-spend-hold.test.ts; tests/unit/vtt/runtime-parity.test.ts; tests/unit/vtt/scene-snapshot.test.ts; tests/unit/vtt/session-lifecycle.test.ts; tests/unit/vtt/soak-runner.test.ts; tests/unit/vtt/standard-offer-generator.test.ts; tests/unit/vtt/team-scorer.test.ts; tests/unit/vtt/two-room-fixture.test.ts; tests/unit/vtt/worker-boundary.test.ts
```

A count other than 216 or different set stops for ownership review; never regenerate this expected
list from the changed graph.

## 9. Final gates

Run serially, preserve stdout and elapsed time:

```text
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
node scripts/check-offer-environment-architecture.mjs --self-test
node scripts/check-offer-environment-architecture.mjs
node scripts/check-command-outcomes.mjs
npx vitest run --configLoader runner --maxWorkers=1 <all touched B0-B6 tests plus B7 focused -t witnesses>
npx vitest run --configLoader runner --maxWorkers=1 tests/unit/vtt/replay.test.ts tests/unit/vtt/detection-reactions.test.ts
```

Expected: T 0/0; architecture self-test 0 and live check 0; command outcomes 0; touched files all
collected, 0 failed; D630 pair 36/36 on a quiet box, baseline/candidate back-to-back, combined ceiling
41 s. Timeout is failure. B7 remains outstanding until its recorded-revision 30/30 full-v2 gate.

Generation gate has two separate comparisons because historical fixtures are not fresh-generator
equivalents:

1. Before edits hash all 43 tracked room fixture files; after B7 require 43/43 hashes unchanged and
   `git diff -- tests/fixtures` empty.
2. Before edits generate the same 43 room inputs from the pre-change tree into a fresh temp capture;
   after B7 generate them again with identical commands into another temp directory; require 43/43
   pre-change-vs-post-change bytes identical. Do **not** compare fresh outputs to tracked fixtures.

Prove “generator does not consult offers” at runtime: instrument module evaluation during each room
generation and assert none of `offer-declarations.ts`, `intent-resolver.ts`, `turn-proposal.ts`, or
`option-modeling.ts` is evaluated. Do not use static/type import closure as the gate: type traversal
legitimately reaches all four. Any room delta or runtime offer-module load is STOP, not normalization.

Final hard gates: original four mutants plus hidden-direction and `hiddenNow`-bypass mutants killed
after clean restoration; no fixture bytes/output-made oracle; v1/v5 frozen; only hand-proved pins
normalized; 36/36 blind 6209 and 185/185 measured productive; D583 216; no alternate query port or
full suite/build/browser. Blocked Web remains unproductive despite its productive component.

## 10. Owner question

**Q1 (D665, material):** does D664 “cover” rank optical blocking before physical tier as planned, or
physical cover only with optical reported? Default for implementation is optical-first, frozen by C
`[(1,0)]` beating D `[(0,2)]`; the alternative changes cover winners, resolved paths/digests, and pins,
but not policy-only offer IDs. Automatic pursuit is settled, not open: emit existing Move + Search
only, never suspected-square attack.

## 11. Round 3 disposition

- PLAN-F4 -> lines 96-119 and 149-184: local maximal wall-gap runs replace connectivity; nine exact approach sets and the `(3,2)`/10-ft real-tracer oracle are frozen.
- PLAN-F2 -> lines 302-330: B3/B4 are ten paths each; B4 owns its RED files and B3 verifies exactly three files.
- PLAN-F3 -> lines 29-36 and 361-372: B7 wiring precedes COHORT B3; focused pre-generation checks cannot complete B7, whose 30-fixture full suite remains outstanding.
- PLAN-F8 -> lines 163-184 and 293-300: concrete `(2,1)`/`(2,5)` equal-profile/equal-cost fixture kills the hidden-row mutant; Eagle is `(20,4)`.
- PLAN-F10 -> lines 223-240 and 366-372: component classification only changes; targeted-offense trace conjunction and blocked-Web negative remain.
- PLAN-F11 -> lines 45-61 and 265-272: fallback-only mutant retired; `hiddenNow` bypass mutant and successful-Hide/prior-loss-cause test retained.

BLIND-01 PLAN R3 DONE

exec
/bin/bash -lc "node --max-old-space-size=6144 <<'NODE'
const ts=require('typescript'),fs=require('fs'),path=require('path');
const overlays=new Map(),get=f=>overlays.get(path.resolve(f))??fs.readFileSync(f,'utf8');
function set(f,s){overlays.set(path.resolve(f),s)}
function replace(f,old,value){let s=get(f);if("'!s.includes(old))throw Error('"'missing '+f+': '+old);set(f,s.replace(old,value))}
function addCase(f,name,expr,code){
 let s=get(f),i=s.indexOf('function '+name+'(');if(i<0)i=s.indexOf('const '+name+' =');
 if(i<0)throw Error('functionmissing '+name);
 let sw=s.indexOf('switch ('+expr+') {',i);if(sw<0)throw Error('switchmissing '+name);
 let end=sw+('switch ('+expr+') {').length;set(f,s.slice(0,end)+'\\n'+code+s.slice(end));
}
function check(label){for(const config of['app','node']){
 const cf=ts.readConfigFile('tsconfig.'+config+'.json',ts.sys.readFile);
 const parsed=ts.parseJsonConfigFileContent(cf.config,ts.sys,process.cwd(),{incremental:false,noEmit:true});
 const host=ts.createCompilerHost(parsed.options),read=host.readFile;
 host.readFile=f=>overlays.get(path.resolve(f))??read(f);
 host.writeFile=()=>{throw Error('WRITE')};
 const p=ts.createProgram(parsed.fileNames,parsed.options,host);
 const ds=ts.getPreEmitDiagnostics(p);
 console.log(JSON.stringify({label,config,count:ds.length,diagnostics:ds.map(d=>({file:d.file&&path.relative(process.cwd(),d.file.fileName),line:d.file&&d.file.getLineAndCharacterOfPosition(d.start).line+1,code:d.code,text:ts.flattenDiagnosticMessageText(d.messageText,' ')}))}));
}}
check('base');
const turn='src/vtt/turn-proposal.ts';
replace(turn,'export interface EngineEngagement {','export interface ExistingEngineEngagement {');
replace(turn,'export interface EngineMovementObjective {',"'`export type EngineEngagement = ExistingEngineEngagement
| {readonly stance:'"'pursue_indication';readonly indication:{readonly targetId:CombatantId;readonly cells:readonly GridCell[]}}
| {readonly stance:'seek_cover';readonly objective:{readonly kind:'open_approach_cover';readonly policy:'blind-cover-v1'}};
export interface EngineMovementObjective {"'`);
replace(turn,"| { readonly kind: '"'dodge' | 'disengage' | 'dash' | 'end_turn' };\",\"| { readonly kind: 'search';readonly targetId:CombatantId;readonly reliance:'sight' }\\n  | { readonly kind: 'dodge' | 'disengage' | 'dash' | 'end_turn' };\");
replace(turn,\"    | 'dodge'\",\"    | 'search'\\n    | 'dodge'\");
replace('src/vtt/blind-dm-contract.ts',\"export const blindActionKinds = [\",\"export const blindActionKinds = [\\n 'search',\");
replace('src/vtt/blind-dm-contract.ts',\"kind: z.enum(['dash',\",\"kind: z.enum(['search', 'dash',\");
check('expanded');
for(const f of['src/vtt/intent-resolver.ts','src/vtt/plan-materiality.ts']){
 set(f,get(f).replaceAll('const anchor = movement.engagement.anchor;',\"const anchor = 'anchor' in movement.engagement ? movement.engagement.anchor : undefined;\").replaceAll('const anchor = option.movement.engagement.anchor;',\"const anchor = 'anchor' in option.movement.engagement ? option.movement.engagement.anchor : undefined;\"));
}
addCase('src/vtt/intent-resolver.ts','useTargets','use.kind',\"case 'search': return [use.targetId];\");
addCase('src/vtt/intent-resolver.ts','validateUse','use.kind',\"case 'search': return null;\");
addCase('src/vtt/blind-intent-resolver.ts','actionDisplayName','use.kind',\"case 'search': return 'Search';\");
addCase('src/vtt/blind-intent-resolver.ts','actionKind','slot.use.kind',\"case 'search': return 'search';\");
addCase('src/vtt/offered-option-paths.ts','informationRank','use.kind',\"case 'search': return 4;\");
addCase('src/vtt/option-modeling.ts','classifyOptionModeling','primary.kind',\"case 'search': return {kind:'primary_effect_modeled'};\");
check('B2');
addCase('src/vtt/dm-tactical-intel.ts','optionTargets','use.kind',\"case 'search': return [use.targetId];\");
addCase('src/vtt/dm-tactical-intel.ts','optionActionId','main.kind',\"case 'search': return 'search';\");
addCase('src/vtt/intel/opportunity-cost.ts','optionKind','main.kind',\"case 'search': return 'other';\");
addCase('src/vtt/intel/option-outcome.ts','declaredUseOutcome','use.kind',\"case 'search': return {kind:'known_no_effect'};\");
addCase('src/vtt/mcp/engine-server.ts','informationRank','main.kind',\"case 'search': return 4;\");
addCase('src/vtt/snippets/registry.ts','explicitTargetIds','use.kind',\"case 'search': return [use.targetId];\");
addCase('tests/unit/vtt/snippets.test.ts','actionIds','use.kind',\"case 'search': return [use.kind];\");
addCase('tests/unit/vtt/snippets.test.ts','targetIds','use.kind',\"case 'search': return [use.targetId];\");
check('B3');
check('B4');

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc "sed -n '1,180p' tools/d583-contract-inventory.ts; rg -n 'export |if \\(|process.env|base|include' tools/d583-contract-inventory.ts | tail -30; sed -n '23130,23190p' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md; rg -n 'hiddenNow|lastKnownPosition: prior' src/combat/encounter.ts; git status --short" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 246ms:
exec
/bin/bash -lc "sed -n '190,278p' tools/d583-contract-inventory.ts; git show bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts | sed -n '1,160p'; rg -n 'targetedOffenseHasOpenTrace|resolvedMechanicsIsProductive' /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/vtt/arena-basis-brutal-v2.test.ts; rg --files tests/fixtures | rg 'room|arena' | head -35; sed -n '1,100p' src/vtt/monster-planning-state.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
export type GitRunner = (args: readonly string[]) => string | null;

// Injected runners propagate exceptions; only this default adapter converts Git execution failures to null.
export function gitOutput(args: readonly string[]): string | null {
  try {
    return execFileSync('git', args, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch (_error: unknown) {
    return null;
  }
}

function changedPaths(git: GitRunner): readonly string[] {
  const mergedMain = git(['merge-base', 'HEAD', 'main'])?.trim() ?? '';
  const committed = git(['diff', '--name-only', 'main', '--']) ?? '';
  const branchCommitted = new Set((mergedMain === ''
    ? ''
    : git(['diff', '--name-only', mergedMain, '--']) ?? '')
    .split('\n').filter((path) => path.length > 0));
  const untracked = git(['ls-files', '--others', '--exclude-standard']) ?? '';
  const changed = [...new Set(`${committed}\n${untracked}`.split('\n').filter((path) => path.length > 0))].sort();
  for (const path of changed) {
    if (path.startsWith('tests/') && path.endsWith('.test.ts') &&
      !existsSync(resolve(ROOT, path)) && branchCommitted.has(path)) {
      throw new Error(`D583 changed spec was deleted: ${path}`);
    }
  }
  return changed.filter((path) => existsSync(resolve(ROOT, path)));
}

export function buildD583ContractInventory(
  input: Readonly<{ changedPaths?: readonly string[]; git?: GitRunner }> = {},
): readonly string[] {
  if (D583_BASELINE_SPECS.length !== 140 || inventoryDigest(D583_BASELINE_SPECS) !== D583_BASELINE_SHA256) {
    throw new Error('D583 inherited 140-spec baseline count or SHA-256 changed.');
  }
  for (const path of D583_BASELINE_SPECS) if (!existsSync(resolve(ROOT, path))) {
    throw new Error(`D583 inherited spec is missing: ${path}`);
  }
  if (SESSION_TRANSACTION_BASELINE_SPECS.length !== 19 ||
    inventoryDigest(SESSION_TRANSACTION_BASELINE_SPECS) !== SESSION_TRANSACTION_BASELINE_SHA256) {
    throw new Error('Session transaction inherited 19-spec baseline count or SHA-256 changed.');
  }
  for (const path of SESSION_TRANSACTION_BASELINE_SPECS) if (!existsSync(resolve(ROOT, path))) {
    throw new Error(`Session transaction inherited spec is missing: ${path}`);
  }
  if (TRIAL_CORE_RECONCILIATION_BASELINE_SPECS.length !== 12 ||
    inventoryDigest(TRIAL_CORE_RECONCILIATION_BASELINE_SPECS) !== TRIAL_CORE_RECONCILIATION_BASELINE_SHA256) {
    throw new Error('Trial-core reconciliation 12-spec baseline count or SHA-256 changed.');
  }
  for (const path of TRIAL_CORE_RECONCILIATION_BASELINE_SPECS) if (!existsSync(resolve(ROOT, path))) {
    throw new Error(`Trial-core reconciliation spec is missing: ${path}`);
  }
  const files = sourceFiles(ROOT);
  const reverse = new Map<string, Set<string>>();
  for (const importer of files) {
    const text = readFileSync(resolve(ROOT, importer), 'utf8');
    for (const dependency of dependencySpecifiers(text, importer)) {
      const resolved = resolveLocal(importer, dependency.specifier);
      if (resolved === null) continue;
      const consumers = reverse.get(resolved) ?? new Set<string>();
      consumers.add(importer);
      reverse.set(resolved, consumers);
    }
  }
  const changed = input.changedPaths ?? changedPaths(input.git ?? gitOutput);
  const consumers = reverseConsumerClosure(
    changed.filter((path) => /\.(?:ts|tsx|mts|cts)$/.test(path)),
    reverse,
  );
  const changedSpecs = changed.filter((path) => path.startsWith('tests/') && path.endsWith('.test.ts'));
  return contractInventoryUnion(
    D583_BASELINE_SPECS,
    SESSION_TRANSACTION_BASELINE_SPECS,
    TRIAL_CORE_RECONCILIATION_BASELINE_SPECS,
    changedSpecs,
    consumers,
  );
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

function main(): void {
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

function actionlessMonsterState(speed: 0 | 30): {
  readonly state: EncounterState;
  readonly actorId: CombatantId;
} {
  const base = monsterProfile(`active-productivity-${String(speed)}`);
  const actor = { ...base, rules: { ...base.rules, speed: feet(speed) } };
  const target = playerProfile(`active-productivity-target-${String(speed)}`);
  return {
    state: freshMonsterPlanningState(decodedClone(createEncounter({
      bounds: { columns: 20, rows: 3 },
      combatants: [actor, target],
      tokens: [placedToken(actor, 0, 1), placedToken(target, 15, 1)],
    }))),
    actorId: actor.id,
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

rg: /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/vtt/arena-basis-brutal-v2.test.ts: IO error for operation on /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/vtt/arena-basis-brutal-v2.test.ts: No such file or directory (os error 2)
tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json
tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json
tests/fixtures/arena-basis/seed-3943002.json
tests/fixtures/arena-basis/seed-3943007.json
tests/fixtures/arena-basis/seed-3943009.json
tests/fixtures/arena-basis/seed-3943006.json
tests/fixtures/arena-basis/seed-3943003.json
tests/fixtures/arena-basis/seed-3943011.json
tests/fixtures/arena-basis/seed-3943005.json
tests/fixtures/arena-basis/seed-3943001.json
tests/fixtures/arena-basis/seed-3943004.json
tests/fixtures/arena-basis/seed-3943010.json
tests/fixtures/arena-basis/seed-3943012.json
tests/fixtures/arena-basis/seed-3943008.json
tests/fixtures/arena-basis-challenge/seed-5831002.json
tests/fixtures/arena-basis-brutal-2/seed-6207010.json
tests/fixtures/room8-repro/failing-round.SIMULATED.json
tests/fixtures/arena-basis-brutal-2/seed-6207009.json
tests/fixtures/arena-basis-challenge/seed-5831004.provenance.json
tests/fixtures/arena-basis-challenge/seed-5831003.json
tests/fixtures/arena-basis-challenge/seed-5831001.json
tests/fixtures/arena-basis-challenge/seed-5831001.provenance.json
tests/fixtures/arena-basis-challenge/seed-5831002.provenance.json
tests/fixtures/arena-basis-challenge/seed-5831003.provenance.json
tests/fixtures/arena-basis-challenge/seed-5831004.json
tests/fixtures/arena-basis-brutal-2/seed-6207005.json
tests/fixtures/arena-basis-brutal-2/seed-6207002.json
tests/fixtures/arena-basis-brutal-2/seed-6207006.json
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
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);
process.env.VITEST='true';
const {buildD583ContractInventory}=require('./tools/d583-contract-inventory.ts');
const plan=fs.readFileSync('.tmp-plans/2026-09-18-blind-01-plan.md','utf8');
const blocks=[...plan.matchAll(/### (B\\d) —[\\s\\S]*?Allowed: ([\\s\\S]*?)\\n\\n/g)];
const paths=[...new Set(blocks.flatMap(m=>[...m[2].matchAll(/"'`([''^'"\\x60]+)"'`/g)].map(m=>m[1])))];
console.log(JSON.stringify({batchSizes:blocks.map(m=>[m[1],[...m[2].matchAll(/`([''^'"\\x60]+)"'`/g)].length]),unique:paths.length,absent:paths.filter(p=>!fs.existsSync(p))}));
const base=buildD583ContractInventory({changedPaths:[]}),turn=buildD583ContractInventory({changedPaths:['"'src/vtt/turn-proposal.ts']}),core=buildD583ContractInventory({changedPaths:paths.filter(p=>"'!p.endsWith('"'arena-basis-brutal-v2.test.ts'))}),final=buildD583ContractInventory({changedPaths:paths});
const expected=plan.split('The exact +68 specs are:')[1].split('"'```text'"')[1].split('"'```'"')[0].split(/[;\\n]/).map(s=>s.trim()).filter(Boolean);
const actual=final.filter(p=>"'!base.includes(p));
console.log(JSON.stringify({base:base.length,turn:turn.length,core:core.length,final:final.length,additions:actual.length,expected:expected.length,missing:expected.filter(p=>!actual.includes(p)),extra:actual.filter(p=>!expected.includes(p))}));

NODE' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc "git show bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts | node -e 'const ts=require('\\''typescript'\\''),fs=require('\\''fs'\\''),Module=require('\\''module'\\''),path=require('\\''path'\\'');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('\\''?raw'\\''))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'\\''utf8'\\'');return oldLoad.call(this,id,parent,...rest)};
require.extensions['\\''.ts'\\'']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'\\''utf8'\\'')).replaceAll('\\''import.meta.env'\\'','\\''({MODE:\"review\",DEV:false})'\\'').replaceAll('\\''import.meta.dirname'\\'',JSON.stringify(path.dirname(f))).replaceAll('\\''import.meta.url'\\'',JSON.stringify(require('\\''url'\\'').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('\\''./src/combat/terrain.ts'\\'');
const {createEncounter,combatantSpaceAt}=require('\\''./src/combat/encounter.ts'\\'');
const {monsterProfile,playerProfile,placedToken}=require('\\''./tests/unit/combat/fixtures.ts'\\'');
const {freshMonsterPlanningState}=require('\\''./src/vtt/monster-planning-state.ts'\\'');
const {generateRoom}=require('\\''./src/vtt/room-generator.ts'\\'');
const {buildOfferEnvironment}=require('\\''./src/vtt/offers/build-offer-environment.ts'\\'');
const {traceTerrainLine}=require('\\''./src/combat/cover.ts'\\'');
const env=buildOfferEnvironment({kind:'\\''configuration'\\'',mode:'\\''legacy_standard'\\''});
const K=c=>c.column+'\\'','\\''+c.row, cell=(column,row)=>({column,row});
function approaches(s,origin){
 const inside=c=>c.column>=0&&c.row>=0&&c.column<s.bounds.columns&&c.row<s.bounds.rows;
 const pass=c=>inside(c)&&terrainPassabilityAt(s,c)"'!=='"'\\''blocked'\\'';
 const C=new Map(),q=[origin];
 while(q.length){let c=q.shift();if(C.has(K(c))||"'!pass(c))continue;C.set(K(c),c);for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])q.push(cell(c.column+x,c.row+y))}
 const walls=new Set(terrainWallCells(s).map(K)),doors=new Set(s.worldObjects.filter(o=>o.kind==='"'\\''door'\\'').flatMap(o=>o.footprint.map(K))),out=new Map();
 for(const c of C.values())if(c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1)out.set(K(c),c);
 for(const o of s.worldObjects)if(o.kind==='\\''door'\\''&&"'!o.blocking.movement)for(const c of o.footprint)if(C.has(K(c)))out.set(K(c),c);
 for(const [dx,dy]of[[0,1],[1,0]]){
  const plus=(c,n)=>cell(c.column+dx*n,c.row+dy*n);
  const runCell=c=>C.has(K(c))&&!doors.has(K(c));
  for(const start of C.values()){
   if(!runCell(start)||runCell(plus(start,-1)))continue;
   const R=[];let next=start;while(runCell(next)){R.push(next);next=plus(next,1)}
   if(!R.every(c=>pass(cell(c.column+dy,c.row+dx))&&pass(cell(c.column-dy,c.row-dx))))continue;
   if(![plus(start,-1),plus(start,-2),next,plus(next,1)].every(c=>inside(c)&&walls.has(K(c))))continue;
   for(const c of R)out.set(K(c),c)
  }
 }
 return [...out.values()].sort((a,b)=>a.row-b.row||a.column-b.column)
}
function scene(w,h,blocked,origin,pcpos,objects=[]){
 const actor=monsterProfile('"'\\''blind-witness'\\''),pc=playerProfile('\\''sealed-pc'\\'');
 return freshMonsterPlanningState(createEncounter({bounds:{columns:w,rows:h},combatants:[actor,pc],tokens:[placedToken(actor,...origin),placedToken(pc,...pcpos)],blockedCells:blocked,worldObjects:objects}));
}
function walls(w,h,predicate){let a=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(x,y))a.push(cell(x,y));return a}
const perimeter=(w,h,x,y)=>x===0||x===w-1||y===0||y===h-1;
const obj=(id,kind,footprint,terrain)=>({id:'\\''world-object:'\\''+id,name:id,kind,position:footprint[0],footprint,durability:{kind:'\\''indestructible'\\''},armorClass:10,damageResponses:[],blocking:terrainBlocking(terrain)});
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]"'!==b[i])return a[i]-b[i]}return 0}
function score(s,id){
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
 for(let y=0;y<s.bounds.rows;y++)for(let x=0;x<s.bounds.columns;x++){
  let dest=cell(x,y),route=env.queries.path(s,{actorId:id,destination:dest,movement:'"'\\''normal'\\''});
  if("'!route.legal)continue;
  const footprint=combatantSpaceAt(s,id,dest).cells;
  const profile=ap.map(a=>Math.min(...footprint.map(c=>{let t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3}[t.tier])}))).sort((a,b)=>a-b);
  candidates.push({dest,cost:route.costFeet,path:route.cells,profile});
 }
 candidates.sort((a,b)=>compare(b.profile,a.profile)||(K(a.dest)===K(origin)?-1:K(b.dest)===K(origin)?1:0)||a.cost-b.cost||a.dest.row-b.dest.row||a.dest.column-b.dest.column);
 let best=candidates[0],max=candidates.filter(c=>compare(c.profile,best.profile)===0),minCost=Math.min(...max.map(c=>c.cost));
 return {ap,origin,best,candidates,max,minCost,ties:max.filter(c=>c.cost===minCost)}
}
function outputScore(name,s,id){
 const r=score(s,id);console.log(JSON.stringify({name,approaches:r.ap.length,origin:r.origin,candidates:r.candidates.length,maxima:r.max.length,best:r.best,ties:r.ties.map(c=>({dest:c.dest,cost:c.cost,path:c.path}))}));return r
}

const src=fs.readFileSync(0,'"'\\''utf8'\\''),ast=ts.createSourceFile('\\''cohort.ts'\\'',src,ts.ScriptTarget.Latest,true);
const extracted=ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&['\\''targetedOffenseHasOpenTrace'\\'','\\''resolvedMechanicsIsProductive'\\''].includes(n.name?.text)).map(n=>n.getText(ast)).join('\\''\\n'\\'');
const {traceCombatantLine}=require('\\''./src/combat/cover.ts'\\'');
const classify=new Function('\\''traceCombatantLine'\\'',ts.transpileModule(extracted,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText+'\\'';return resolvedMechanicsIsProductive;'\\'')(traceCombatantLine);
const {monsterCombatantProfile}=require('\\''./src/combat/combatant.ts'\\'');
const {GIANT_SPIDER}=require('\\''./src/combat/statblocks/wild-beasts.ts'\\'');
const {availableEngineActorOptions,resolveEngineActorOption}=require('\\''./src/vtt/intent-resolver.ts'\\'');
const base=monsterCombatantProfile(GIANT_SPIDER,{combatantId:'\\''combatant:spider'\\'',tokenId:'\\''token:spider'\\''});
const actor={...base,rules:{...base.rules,speed:0}},target=playerProfile('\\''web-target'\\'');
const s=freshMonsterPlanningState(createEncounter({bounds:{columns:6,rows:3},combatants:[actor,target],tokens:[placedToken(actor,0,1),placedToken(target,5,1)]}));
const option=availableEngineActorOptions(s,actor.id,env).find(o=>o.actionSlots.some(slot=>slot.use.kind==='\\''saving_throw'\\''&&String(slot.use.actionId).toLowerCase().includes('\\''web'\\'')));
const resolution=resolveEngineActorOption(s,option,env);
const blocked={...s,blockedCells:[cell(3,0),cell(3,1),cell(3,2)]};
console.log(JSON.stringify({valid:resolution.valid,slot:resolution.mechanics.actionSlots,open:classify(s,resolution.mechanics),blocked:classify(blocked,resolution.mechanics),trace:traceCombatantLine(blocked,actor.id,target.id),componentOnly:resolution.mechanics.actionSlots.some(x=>x.kind==='\\''saving_throw'\\'')}));
'" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2476ms:
{"valid":true,"slot":[{"slot":"main","kind":"saving_throw","actionId":"web","spellId":null,"targetIds":["combatant:web-target"],"objectId":null,"omittedRiders":[]}],"open":true,"blocked":false,"trace":{"sourceCell":{"column":1,"row":1},"targetCell":{"column":5,"row":1},"sourceCorner":{"column":0,"row":1},"lines":[{"targetCorner":{"column":5,"row":1},"interveningCells":[],"tier":"none","blocksSight":true,"sourceIds":[],"sources":[],"firstBlockingCell":{"column":3,"row":0}},{"targetCorner":{"column":6,"row":1},"interveningCells":[],"tier":"none","blocksSight":true,"sourceIds":[],"sources":[],"firstBlockingCell":{"column":3,"row":0}},{"targetCorner":{"column":5,"row":2},"interveningCells":[{"column":3,"row":1}],"tier":"total","blocksSight":true,"sourceIds":["blocked:3,1"],"sources":[{"kind":"blocked_cell","id":"3,1","tier":"total"}],"firstBlockingCell":{"column":3,"row":1}},{"targetCorner":{"column":6,"row":2},"interveningCells":[{"column":3,"row":1}],"tier":"total","blocksSight":true,"sourceIds":["blocked:3,1"],"sources":[{"kind":"blocked_cell","id":"3,1","tier":"total"}],"firstBlockingCell":{"column":3,"row":1}}],"interveningCells":[{"column":3,"row":1}],"tier":"half","blocksSight":true,"sourceIds":["blocked:3,1"],"sources":[{"kind":"blocked_cell","id":"3,1","tier":"total"}],"firstBlockingCell":{"column":3,"row":0}},"componentOnly":true}

 succeeded in 8094ms:
{"batchSizes":[["B0",2],["B1",4],["B2",10],["B3",10],["B4",10],["B5",10],["B6",10],["B7",2]],"unique":55,"absent":["tests/unit/vtt/blind-cover-posture.test.ts","tests/unit/vtt/arena-basis-brutal-v2.test.ts"]}
{"base":148,"turn":213,"core":215,"final":216,"additions":68,"expected":68,"missing":[],"extra":[]}

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {createEncounter,combatantSpaceAt}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {generateRoom}=require('./src/vtt/room-generator.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const K=c=>c.column+','+c.row, cell=(column,row)=>({column,row});
function approaches(s,origin){
 const inside=c=>c.column>=0&&c.row>=0&&c.column<s.bounds.columns&&c.row<s.bounds.rows;
 const pass=c=>inside(c)&&terrainPassabilityAt(s,c)"'!=='"'blocked';
 const C=new Map(),q=[origin];
 while(q.length){let c=q.shift();if(C.has(K(c))||"'!pass(c))continue;C.set(K(c),c);for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])q.push(cell(c.column+x,c.row+y))}
 const walls=new Set(terrainWallCells(s).map(K)),doors=new Set(s.worldObjects.filter(o=>o.kind==='"'door').flatMap(o=>o.footprint.map(K))),out=new Map();
 for(const c of C.values())if(c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1)out.set(K(c),c);
 for(const o of s.worldObjects)if(o.kind==='door'&&"'!o.blocking.movement)for(const c of o.footprint)if(C.has(K(c)))out.set(K(c),c);
 for(const [dx,dy]of[[0,1],[1,0]]){
  const plus=(c,n)=>cell(c.column+dx*n,c.row+dy*n);
  const runCell=c=>C.has(K(c))&&!doors.has(K(c));
  for(const start of C.values()){
   if(!runCell(start)||runCell(plus(start,-1)))continue;
   const R=[];let next=start;while(runCell(next)){R.push(next);next=plus(next,1)}
   if(!R.every(c=>pass(cell(c.column+dy,c.row+dx))&&pass(cell(c.column-dy,c.row-dx))))continue;
   if(![plus(start,-1),plus(start,-2),next,plus(next,1)].every(c=>inside(c)&&walls.has(K(c))))continue;
   for(const c of R)out.set(K(c),c)
  }
 }
 return [...out.values()].sort((a,b)=>a.row-b.row||a.column-b.column)
}
function scene(w,h,blocked,origin,pcpos,objects=[]){
 const actor=monsterProfile('"'blind-witness'),pc=playerProfile('sealed-pc');
 return freshMonsterPlanningState(createEncounter({bounds:{columns:w,rows:h},combatants:[actor,pc],tokens:[placedToken(actor,...origin),placedToken(pc,...pcpos)],blockedCells:blocked,worldObjects:objects}));
}
function walls(w,h,predicate){let a=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(x,y))a.push(cell(x,y));return a}
const perimeter=(w,h,x,y)=>x===0||x===w-1||y===0||y===h-1;
const obj=(id,kind,footprint,terrain)=>({id:'world-object:'+id,name:id,kind,position:footprint[0],footprint,durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking(terrain)});
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]"'!==b[i])return a[i]-b[i]}return 0}
function score(s,id){
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
 for(let y=0;y<s.bounds.rows;y++)for(let x=0;x<s.bounds.columns;x++){
  let dest=cell(x,y),route=env.queries.path(s,{actorId:id,destination:dest,movement:'"'normal'});
  if("'!route.legal)continue;
  const footprint=combatantSpaceAt(s,id,dest).cells;
  const profile=ap.map(a=>Math.min(...footprint.map(c=>{let t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3}[t.tier])}))).sort((a,b)=>a-b);
  candidates.push({dest,cost:route.costFeet,path:route.cells,profile});
 }
 candidates.sort((a,b)=>compare(b.profile,a.profile)||(K(a.dest)===K(origin)?-1:K(b.dest)===K(origin)?1:0)||a.cost-b.cost||a.dest.row-b.dest.row||a.dest.column-b.dest.column);
 let best=candidates[0],max=candidates.filter(c=>compare(c.profile,best.profile)===0),minCost=Math.min(...max.map(c=>c.cost));
 return {ap,origin,best,candidates,max,minCost,ties:max.filter(c=>c.cost===minCost)}
}
function outputScore(name,s,id){
 const r=score(s,id);console.log(JSON.stringify({name,approaches:r.ap.length,origin:r.origin,candidates:r.candidates.length,maxima:r.max.length,best:r.best,ties:r.ties.map(c=>({dest:c.dest,cost:c.cost,path:c.path}))}));return r
}

for(const gaps of[[3,5],[2,4],[2,3,4,5,6]]){
 const s=scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&!gaps.includes(y))),[2,4],[6,4]);
 console.log(JSON.stringify({name:'"'additionalGapControl',gaps,approaches:approaches(s,s.tokens[0].position).map(K)}))
}
const thick=scene(5,7,walls(5,7,(x,y)=>x"'!==2||y===0||y===6),[2,1],[2,5]);
const r=outputScore('"'thickCorridor',thick,thick.tokens[0].combatantId);
console.log(JSON.stringify({corridorWallCells:terrainWallCells(thick).map(K),traces:r.ap.map(c=>({from:c,to:cell(2,1),trace:traceTerrainLine(thick,c,cell(2,1))}))}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc "git ls-tree -r --name-only b94dd732 tests/fixtures/arena-basis-hard tests/fixtures/arena-basis-brutal tests/fixtures/arena-basis-brutal-b tests/fixtures/arena-basis-brutal-2; rg -n 'canonicalJson' tools/generate-arena-basis.ts src/vtt/room-generator.ts; sed -n '1,95p' .tmp-plans/2026-09-18-blind-01-plan.md" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
tests/fixtures/arena-basis-brutal-2/seed-6207001.json
tests/fixtures/arena-basis-brutal-2/seed-6207002.json
tests/fixtures/arena-basis-brutal-2/seed-6207003.json
tests/fixtures/arena-basis-brutal-2/seed-6207004.json
tests/fixtures/arena-basis-brutal-2/seed-6207005.json
tests/fixtures/arena-basis-brutal-2/seed-6207006.json
tests/fixtures/arena-basis-brutal-2/seed-6207007.json
tests/fixtures/arena-basis-brutal-2/seed-6207008.json
tests/fixtures/arena-basis-brutal-2/seed-6207009.json
tests/fixtures/arena-basis-brutal-2/seed-6207010.json
tests/fixtures/arena-basis-brutal-b/seed-6206001.json
tests/fixtures/arena-basis-brutal-b/seed-6206002.json
tests/fixtures/arena-basis-brutal-b/seed-6206003.json
tests/fixtures/arena-basis-brutal-b/seed-6206004.json
tests/fixtures/arena-basis-brutal-b/seed-6206005.json
tests/fixtures/arena-basis-brutal-b/seed-6206006.json
tests/fixtures/arena-basis-brutal-b/seed-6206007.json
tests/fixtures/arena-basis-brutal-b/seed-6206008.json
tests/fixtures/arena-basis-brutal-b/seed-6206009.json
tests/fixtures/arena-basis-brutal-b/seed-6206010.json
tests/fixtures/arena-basis-brutal/seed-6203001.json
tests/fixtures/arena-basis-brutal/seed-6203002.json
tests/fixtures/arena-basis-brutal/seed-6203003.json
tests/fixtures/arena-basis-brutal/seed-6203004.json
tests/fixtures/arena-basis-brutal/seed-6203005.json
tests/fixtures/arena-basis-brutal/seed-6203006.json
tests/fixtures/arena-basis-brutal/seed-6203007.json
tests/fixtures/arena-basis-brutal/seed-6203008.json
tests/fixtures/arena-basis-brutal/seed-6203009.json
tests/fixtures/arena-basis-brutal/seed-6203010.json
tests/fixtures/arena-basis-hard/seed-5117001.json
tests/fixtures/arena-basis-hard/seed-5117002.json
tests/fixtures/arena-basis-hard/seed-5117003.json
tests/fixtures/arena-basis-hard/seed-5117004.json
tests/fixtures/arena-basis-hard/seed-5117005.json
tests/fixtures/arena-basis-hard/seed-5117006.json
tests/fixtures/arena-basis-hard/seed-5117007.json
tests/fixtures/arena-basis-hard/seed-5117008.json
tests/fixtures/arena-basis-hard/seed-5117009.json
tests/fixtures/arena-basis-hard/seed-5117010.json
tests/fixtures/arena-basis-hard/seed-5117011.json
tests/fixtures/arena-basis-hard/seed-5117012.json
tests/fixtures/arena-basis-hard/seed-5117013.json
tools/generate-arena-basis.ts:7:import { canonicalJson } from '../src/commands/canonical-json';
tools/generate-arena-basis.ts:258:      `${canonicalJson(room)}\n`,
tools/generate-arena-basis.ts:303:        memberSha256: loaded.party.pack.members.map((member) => sha256(canonicalJson(member))),
tools/generate-arena-basis.ts:357:  const bytes = `${canonicalJson(room)}\n`;
tools/generate-arena-basis.ts:390:    partyRecipeSha256: sha256(canonicalJson(HELDOUT_PARTY_RECIPES)),
tools/generate-arena-basis.ts:398:    aggregateSha256: sha256(canonicalJson({ parties: partyRows, rooms })),
tools/generate-arena-basis.ts:401:  await writeFile(config.manifestPath, `${canonicalJson(manifest)}\n`, 'utf8');
tools/generate-arena-basis.ts:591:    manifest.partyRecipeSha256 !== sha256(canonicalJson(HELDOUT_PARTY_RECIPES))) {
tools/generate-arena-basis.ts:595:  if (canonicalJson(partyLevels) !== canonicalJson([3, 4, 5, 6])) {
tools/generate-arena-basis.ts:611:      canonicalJson(loaded.party.pack.members.map((member) => sha256(canonicalJson(member)))) !==
tools/generate-arena-basis.ts:612:        canonicalJson(party.memberSha256)) {
tools/generate-arena-basis.ts:617:  if (sha256(canonicalJson({ parties: manifest.parties, rooms: manifest.rooms })) !== manifest.aggregateSha256) {
tools/generate-arena-basis.ts:650:    if (canonicalJson(playerProfiles) !== canonicalJson(expectedPlayerProfiles)) {
tools/generate-arena-basis.ts:658:    if (canonicalJson(row.roster.eligibleStatblockIds) !== canonicalJson(eligibleStatblockIds)) {
tools/generate-arena-basis.ts:673:      if (canonicalJson(rosterEntry.challengeRating) !== canonicalJson(source.challengeRating)) {
tools/generate-arena-basis.ts:701:      canonicalJson(selectedStatblockIds) !== canonicalJson(selectedVector.statblockIds) ||
tools/generate-arena-basis.ts:705:    if (canonicalJson(monsterProfiles) !== canonicalJson(expectedMonsterProfiles)) {
tools/generate-arena-basis.ts:710:      roomRoster.spentXp !== row.targetXp || canonicalJson(roomRoster) !== canonicalJson(row.roster) ||
tools/generate-arena-basis.ts:728:  if (result !== null) process.stdout.write(`${canonicalJson(result)}\n`);
# BLIND-01 implementation plan r3 (final review round)

Date: 2026-09-18  
Planning base: `/home/vagrant/PhpstormProjects/dnd-wt-blind-01`, branch `claude/blind-01`, commit `b94dd73221697e3d03da8991746726563777fa74`.  
Integration prerequisite: `claude/cohort-01` at `bea24cbe` supplies `tests/unit/vtt/arena-basis-brutal-v2.test.ts`; no v6 test exists there.  
Authority: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md` D420, D476, D545, D617, D625, D632, D636.6, D641-D643, D662-D668; review: `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/blind-01/review-plan-blind-01-astra-r2.md`.
All other paths are relative to the BLIND-01 worktree.

## 1. Result, invariants, and landing order

Implement D664: a monster that perceives an enemy keeps normal offers; with no perceived enemy but
an actor-known directional indication it advances/searches using existing `move_and_search`; with no
indication it moves within its canonical available movement to the best topology-only cover against
the room's open approaches and Dodges. If origin is already a best reachable destination, it Dodges
in place. Both moving and stationary blind postures are productive.

Hard invariants:

- `projectActorKnowledge` remains the single knowledge producer (D625). Offer code never reads
  tokens, `observationHistory`, or `searchMemories` independently, and invents no cue from unseen
  positions (D476/D545).
- The resolver uses only injected `environment.queries`; it cannot import/construct another query
  port, movement world, terrain helper, or cover tracer (D617.5).
- No fixture byte changes and no changed-code output becomes an expectation; changed pins require section 7's hand proofs, while unchanged fields may come from the pre-change tree.
- No full Vitest, Playwright, build, browser server, or port 4173.

Landing order:

1. Land B0-B6 on `b94dd732`; B0 repairs the unsafe memory producer before anything consumes memory.
2. Merge that accepted core into `claude/vis-field`, then rebase/merge it into
   `claude/cohort-01@bea24cbe` before COHORT-01 Batch 3. The shared productivity helper and stationary
   witness are already in core B4, so COHORT's gate cannot run under the old predicate.
3. On that named prerequisite revision plus core, apply B7's shared-predicate wiring **before**
   COHORT-01 B3 performs any productivity acceptance check. Its focused pre-generation witnesses do
   not complete B7: defer the full v2 suite until all 30 fixtures exist at a recorded COHORT revision.
   BLIND-01 does not create v6; COHORT B6 later imports the helper. D569 v1/v5 remain frozen.
4. `src/vtt/intent-resolver.ts`, `src/vtt/turn-proposal.ts`, and
   `src/vtt/engine-query-port.ts` are in ELEVATION-02's 221-path D636.6 manifest and the D584
   inventory. Supervisor record: `BLIND-01 landed first; ELEVATION_BASE_REV includes BLIND-01;
   ELEVATION-02 rebased and retained pursue_indication, seek_cover, Search, and seekCover; both
   ownership overlays rerun.` A conflict may not silently discard this unit.

## 2. Repair and define actor knowledge

### 2.1 Search-memory producer repair comes first

The reducer currently lets successful `hiddenNow` bypass prior observation and then passes
`prior?.targetPosition ?? current.targetPosition` to `createSearchMemory`
(`src/combat/encounter.ts:2281-2301`). That can turn a never-observed PC's true visibility-snapshot
position into monster knowledge. Replace this with a strict `prior?.seen === true` prerequisite for
all causes and source `lastKnownPosition` only from `prior.targetPosition`; remove the current-position
fallback. Keep this in the reducer—do not add a second sanitizer in offers.

RED-first producer cases in `tests/unit/combat/search-memory.test.ts`:

- never-observed target successfully Hides: no memory and no cue;
- previously seen target then moves unseen and Hides: memory center is the last seen cell, not either
  unseen cell; repeated unseen movement/hiding never refreshes it;
- previously seen loss by invisibility/obscurement still creates the existing memory at prior seen
  position; reacquisition clears it; expiry remains three rounds; retain the existing successful-Hide
  test but change its memory cause from `hiding` to the retained prior-loss cause (`obscurement`).

### 2.2 Closed branch matrix

`projectActorKnowledge` projects all non-dead opponents—including dying ones—and sorts them
(`src/vtt/intel/actor-knowledge.ts:222-288`). Its variants are defined at lines 42-90; observation
fallback is lines 98-123. Search-memory shapes and existing options are
`src/combat/search-memory.ts:15-64,88-150`. Extend this one producer with a closed turn-knowledge
projection which joins only active reducer-owned memories for the actor:

| Projection after precedence | Directional indication | Branch |
|---|---|---|
| Any `perceived` (`seen` or mechanically `located`) non-dead opponent | Current actor-known position | `normal`; existing declarations only; memories/suspicions do not add blind offers. |
| No perceived target; active memory for a non-dead opponent | Its existing `lastKnownPosition`, `suspicion.cells`, and `legalOptions` | `pursue_indication`. |
| No perceived target/memory for the pair; `suspected` | Observation `lastSeen.lastSeenPosition` singleton | `pursue_indication`. |
| `unknown` / `never_observed` | none | contributes no cue. |
| `placement_pending` | none | contributes no cue or coordinate. |
| No cue from any non-dead opponent | none | `blind_posture`. |

Strictly `life === 'dead'` is excluded; a dying opponent remains in the matrix. An expired memory is
absent and cannot beat an observation or create a cue. For one pair, active memory supersedes the
duplicate observation because it owns the expanding suspicion region. Sort independent cues by
target id, source (`search_memory` before `observation_history`), then cell row/column. Tests cover
perceived+memory, mechanically located-only, expired memory, pending placement, dying, and dead.

These are the complete existing cues. There is no hearing vector, alert direction, nearest-enemy
fallback, party centroid, initiative inference, or unseen-token cue. For a memory, carry its actual
`legalOptions` member with `kind:'move_and_search'`, Search citation, and `suspicion.cells`; never
recreate its region/radius/citation. For observation-only suspicion, adapt the singleton into the
same typed pursuit input once. Automatic pursuit emits only Move + Search. Existing
`attack_suspected_square`, `ready_action`, and `area_effect_over_region` capabilities remain where
they are; BLIND-01 does not expose or duplicate them in standard offers.

## 3. Deterministic topology-only cover objective


 succeeded in 2342ms:
{"name":"additionalGapControl","gaps":[3,5],"approaches":[]}
{"name":"additionalGapControl","gaps":[2,4],"approaches":[]}
{"name":"additionalGapControl","gaps":[2,3,4,5,6],"approaches":["4,2","4,3","4,4","4,5","4,6"]}
{"name":"thickCorridor","approaches":3,"origin":{"column":2,"row":1},"candidates":4,"maxima":4,"best":{"dest":{"column":2,"row":1},"cost":0,"path":[],"profile":[0,0,0]},"ties":[{"dest":{"column":2,"row":1},"cost":0,"path":[]}]}
{"corridorWallCells":["0,0","1,0","2,0","3,0","4,0","0,1","1,1","3,1","4,1","0,2","1,2","3,2","4,2","0,3","1,3","3,3","4,3","0,4","1,4","3,4","4,4","0,5","1,5","3,5","4,5","0,6","1,6","2,6","3,6","4,6"],"traces":[{"from":{"column":2,"row":2},"to":{"column":2,"row":1},"trace":{"sourceCell":{"column":2,"row":2},"targetCell":{"column":2,"row":1},"sourceCorner":{"column":2,"row":2},"lines":[{"targetCorner":{"column":2,"row":1},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":3,"row":1},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":3,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}},{"from":{"column":2,"row":3},"to":{"column":2,"row":1},"trace":{"sourceCell":{"column":2,"row":3},"targetCell":{"column":2,"row":1},"sourceCorner":{"column":2,"row":3},"lines":[{"targetCorner":{"column":2,"row":1},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":3,"row":1},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":3,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}},{"from":{"column":2,"row":4},"to":{"column":2,"row":1},"trace":{"sourceCell":{"column":2,"row":4},"targetCell":{"column":2,"row":1},"sourceCorner":{"column":2,"row":4},"lines":[{"targetCorner":{"column":2,"row":1},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":3,"row":1},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":2,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null},{"targetCorner":{"column":3,"row":2},"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}],"interveningCells":[],"tier":"none","blocksSight":false,"sourceIds":[],"sources":[],"firstBlockingCell":null}}]}

codex
The real planner confirms all four actor pins: Bear `(16,2)/10 ft`, Eagle `(20,4)/5 ft`, Ghast `(18,2)/5 ft`, and Goblin Boss at its origin for `0 ft`. The relocation mutant now fails as intended, and blocked Web remains unproductive. The approach rule also misses two gaps separated by one wall cell; both counterexamples concern the same remaining F4 definition problem.
exec
/bin/bash -lc 'cat /home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/consensus/blind-01/review-plan-blind-01-astra-r2.md' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:

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

exec
/bin/bash -lc "rg -n \"case 'search'|move_and_search|kind === 'search'|case 'hide'\" src/vtt/engine-round-session.ts src/combat/encounter.ts src/combat/search-memory.ts | head -35; sed -n '1,170p' src/combat/search-memory.ts; git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts; git ls-tree -r --name-only bea24cbe tests/fixtures/arena-basis-brutal-v2 tests/fixtures/arena-basis-brutal-b-v2 tests/fixtures/arena-basis-brutal-2-v2; git ls-tree -r --name-only bea24cbe tests/unit/tools/d569-v6.test.ts" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
src/combat/search-memory.ts:31:      readonly kind: 'move_and_search';
src/combat/search-memory.ts:90:    { kind: 'move_and_search', target, searchCitation: SEARCH_MEMORY_RULE_CITATIONS.search },
src/combat/encounter.ts:12299:    case 'hide':
src/combat/encounter.ts:12302:    case 'search':
src/vtt/engine-round-session.ts:308:    case 'hide': state = reduce(state, { type: 'hide', actor: mechanics.actorId, cost: 'bonus_action' }); break;
import type { GridBounds, GridCell } from './grid';
import { gridDistance, isCellInside } from './grid';
import { feet, type CombatantId, type Feet } from './values';

export const SEARCH_MEMORY_POLICY = 'search-memory-v1' as const;
export const SEARCH_MEMORY_DURATION_ROUNDS = 3 as const;
export const SEARCH_REGION_EXPANSION_PER_ROUND = feet(5);

export const SEARCH_MEMORY_RULE_CITATIONS = {
  unseenTarget: 'docs/srd/full/srd-5.2.1.txt:884-889',
  ready: 'docs/srd/full/srd-5.2.1.txt:11997-12015',
  search: 'docs/srd/full/srd-5.2.1.txt:12016-12027',
} as const;

export type SearchMemoryCause = 'hiding' | 'invisibility' | 'obscurement';

export interface SearchMemoryExpiry {
  readonly kind: 'start_of_round';
  readonly round: number;
}

export interface SuspicionRegion {
  readonly kind: 'grid_radius';
  readonly center: GridCell;
  readonly radius: Feet;
  readonly cells: readonly GridCell[];
}

export type SearchEscalationOption =
  | {
      readonly kind: 'move_and_search';
      readonly target: CombatantId;
      readonly searchCitation: typeof SEARCH_MEMORY_RULE_CITATIONS.search;
    }
  | {
      readonly kind: 'ready_action';
      readonly target: CombatantId;
      readonly readyCitation: typeof SEARCH_MEMORY_RULE_CITATIONS.ready;
    }
  | {
      readonly kind: 'attack_suspected_square';
      readonly target: CombatantId;
      readonly cells: readonly GridCell[];
      readonly rollMode: 'disadvantage';
      readonly unseenTargetCitation: typeof SEARCH_MEMORY_RULE_CITATIONS.unseenTarget;
    }
  | {
      readonly kind: 'area_effect_over_region';
      readonly target: CombatantId;
      readonly cells: readonly GridCell[];
    };

export interface SearchMemory {
  readonly policy: typeof SEARCH_MEMORY_POLICY;
  readonly observer: CombatantId;
  readonly target: CombatantId;
  readonly cause: SearchMemoryCause;
  readonly lastKnownPosition: GridCell;
  readonly lostAtRound: number;
  readonly lastExpandedRound: number;
  readonly expires: SearchMemoryExpiry;
  readonly suspicion: SuspicionRegion;
  readonly legalOptions: readonly SearchEscalationOption[];
}

function orderedCells(cells: readonly GridCell[]): readonly GridCell[] {
  return [...cells].sort((left, right) =>
    left.row - right.row || left.column - right.column);
}

/** A clipped Chebyshev radius matches the engine's eight-way 5-foot grid distance. */
export function suspicionCells(
  bounds: GridBounds,
  center: GridCell,
  radius: Feet,
): readonly GridCell[] {
  if (!isCellInside(bounds, center)) throw new RangeError('A suspicion-region center must be on the grid.');
  const cells: GridCell[] = [];
  for (let row = 0; row < bounds.rows; row += 1) {
    for (let column = 0; column < bounds.columns; column += 1) {
      const candidate = { column, row };
      if (gridDistance(center, candidate) <= radius) cells.push(candidate);
    }
  }
  return orderedCells(cells);
}

function legalOptions(target: CombatantId, cells: readonly GridCell[]): readonly SearchEscalationOption[] {
  return [
    { kind: 'move_and_search', target, searchCitation: SEARCH_MEMORY_RULE_CITATIONS.search },
    { kind: 'ready_action', target, readyCitation: SEARCH_MEMORY_RULE_CITATIONS.ready },
    {
      kind: 'attack_suspected_square',
      target,
      cells,
      rollMode: 'disadvantage',
      unseenTargetCitation: SEARCH_MEMORY_RULE_CITATIONS.unseenTarget,
    },
    { kind: 'area_effect_over_region', target, cells },
  ];
}

export function createSearchMemory(input: {
  readonly bounds: GridBounds;
  readonly observer: CombatantId;
  readonly target: CombatantId;
  readonly cause: SearchMemoryCause;
  readonly lastKnownPosition: GridCell;
  readonly round: number;
}): SearchMemory {
  const cells = suspicionCells(input.bounds, input.lastKnownPosition, feet(0));
  return {
    policy: SEARCH_MEMORY_POLICY,
    observer: input.observer,
    target: input.target,
    cause: input.cause,
    lastKnownPosition: { ...input.lastKnownPosition },
    lostAtRound: input.round,
    lastExpandedRound: input.round,
    expires: { kind: 'start_of_round', round: input.round + SEARCH_MEMORY_DURATION_ROUNDS },
    suspicion: {
      kind: 'grid_radius',
      center: { ...input.lastKnownPosition },
      radius: feet(0),
      cells,
    },
    legalOptions: legalOptions(input.target, cells),
  };
}

export function expandSearchMemory(
  bounds: GridBounds,
  memory: SearchMemory,
  round: number,
): SearchMemory {
  if (round <= memory.lastExpandedRound) return memory;
  const elapsedRounds = round - memory.lostAtRound;
  const radius = feet(elapsedRounds * SEARCH_REGION_EXPANSION_PER_ROUND);
  const cells = suspicionCells(bounds, memory.lastKnownPosition, radius);
  return {
    ...memory,
    lastExpandedRound: round,
    suspicion: {
      kind: 'grid_radius',
      center: { ...memory.lastKnownPosition },
      radius,
      cells,
    },
    legalOptions: legalOptions(memory.target, cells),
  };
}


exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const evaluated=[];
const originalCompile=Module.prototype._compile;
Module.prototype._compile=function(source,filename){evaluated.push(filename);return originalCompile.call(this,source,filename)};
const {generateRoom}=require('./src/vtt/room-generator.ts');
const {canonicalJson}=require('./src/commands/canonical-json.ts');
const {createHash}=require('crypto');
const sha=s=>createHash('sha256').update(s).digest('hex');
const dirs=['arena-basis-hard','arena-basis-brutal','arena-basis-brutal-b','arena-basis-brutal-2'];
const files=dirs.flatMap(d=>fs.readdirSync('tests/fixtures/'+d).filter(f=>/"'^seed-'"\\d+\\.json"'$/.test(f)).map(f=>'"'tests/fixtures/'+d+'/'+f)).sort();
const before=files.map(f=>sha(fs.readFileSync(f)));
const captures=files.map(f=>canonicalJson(generateRoom(Number(f.match(/seed-(\\d+)/)[1]),{difficulty:f.includes('arena-basis-hard')?'hard':'brutal'}))+'\\n');
const second=files.map(f=>canonicalJson(generateRoom(Number(f.match(/seed-(\\d+)/)[1]),{difficulty:f.includes('arena-basis-hard')?'hard':'brutal'}))+'\\n');
console.log(JSON.stringify({files:files.length,stableHashes:files.filter((f,i)=>before[i]===sha(fs.readFileSync(f))).length,equalFresh:captures.filter((s,i)=>s===second[i]).length,equalHistorical:captures.filter((s,i)=>s===fs.readFileSync(files[i],'utf8')).length,prohibitedLoads:evaluated.filter(f=>/\\/(offer-declarations|intent-resolver|turn-proposal|option-modeling)\\.ts"'$/.test(f))}));

NODE' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2356ms:
{"files":43,"stableHashes":43,"equalFresh":43,"equalHistorical":0,"prohibitedLoads":[]}

exec
/bin/bash -lc "sed -n '200,325p' src/vtt/engine-round-session.ts; rg -n 'function search\\(|searchActor|function resolveSearch|function searchCommand' src/combat/encounter.ts; git ls-tree -r --name-only b94dd732 | python3 -c 'import sys,re,pathlib; base=set(sys.stdin.read().splitlines()); p=pathlib.Path(\".tmp-plans/2026-09-18-blind-01-plan.md\").read_text(); paths=set(x for b in re.findall(r\"### B\\d —[\\s\\S]*?Allowed: ([\\s\\S]*?)\\n\\n\",p) for x in re.findall(r\""'`([''^`]+)`",b)); print("paths",len(paths),"present_at_b94",len(paths&base),"absent_at_b94",sorted(paths-base))'"'" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 0ms:
  state: EncounterState,
  use: ResolvedActionSlotUse,
  queries: EngineQueryPort,
): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  if (use.spellId === null) throw new Error('Resolved spell use omitted its spell id.');
  const caster = state.combatants.find((candidate) => candidate.profile.id === state.activeCombatant);
  if (caster?.profile.kind !== 'monster') throw new Error('Resolved statblock spell caster is absent.');
  const sources = use.slot === 'main' ? monsterActions(state, caster.profile.id) : monsterBonusActions(state, caster.profile.id);
  const source = sources.find((candidate): candidate is MonsterSpellcastingAction |
    Extract<import('../combat/statblock').MonsterBonusAction, { readonly kind: 'spell_choice' }> =>
    (candidate.kind === 'spellcasting' || candidate.kind === 'spell_choice') && candidate.id === use.actionId);
  const reference = source?.spells.find((spell) => spell.id === use.spellId);
  const definition = spellDefinition(use.spellId);
  if (source === undefined || reference === undefined || definition === null) {
    throw new Error(`Resolved spell ${use.spellId} is absent from ${use.actionId}.`);
  }
  const abilityScore = caster.profile.rules.abilityScores?.[source.ability] ?? 10;
  const modifier = Math.floor((abilityScore - 10) / 2);
  const proficiency = caster.profile.rules.proficiencyBonus ?? 2;
  const saveDc = source.kind === 'spellcasting' && source.saveDc.kind === 'present'
    ? source.saveDc.value : 8 + proficiency + modifier;
  const attackBonus = source.kind === 'spellcasting' && source.spellAttackBonus.kind === 'present'
    ? source.spellAttackBonus.value : proficiency + modifier;
  const resourcePoolId = monsterSpellResourcePoolId(source.id, reference);
  const placedArea = use.area ?? null;
  const usesPlacedArea = definition.targeting.kind === 'area' || definition.targeting.kind === 'area_selected';
  return {
    type: 'cast_spell', actor: caster.profile.id, spellId: use.spellId,
    slotLevel: definition.level === 0 ? null : definition.level,
    castAsRitual: false, casterLevel: 1, attackBonus, saveDc, spellcastingModifier: modifier,
    targets: usesPlacedArea ? [] : use.targetIds,
    area: usesPlacedArea ? placedArea : null,
    weaponAttack: null,
    selectedOption: use.activationChoice?.kind === 'command_word' ||
      use.activationChoice?.kind === 'dispel_evil_and_good_mode'
      ? use.activationChoice.value
      : use.activationChoice?.kind === 'unicorns_blessing_spell' &&
          use.activationChoice.value === 'lesser-restoration'
        ? use.selectedCondition ?? null
        : null,
    ...(use.activationChoice?.kind === 'calm_emotions_per_target'
      ? { calmEmotionsModes: use.activationChoice.selections.map((entry) => ({ target: entry.targetId, mode: entry.mode })) }
      : {}),
    ...(resourcePoolId === null ? {} : { resourcePoolId }),
    monsterActionId: source.id,
  };
}

function applyOneResolvedProposal(
  initialState: EncounterState,
  mechanics: ResolvedTurnMechanics,
  reduce: (state: EncounterState, command: EncounterCommand) => EncounterState,
  queries: EngineQueryPort,
): { readonly state: EncounterState; readonly remainingAttackTargetDead: boolean } {
  let state = initialState;
  let remainingAttackTargetDead = false;
  const dashesBeforeMovement = mechanics.path.length === 0
    ? []
    : mechanics.actionSlots.filter((use) => use.kind === 'dash');
  for (const dash of dashesBeforeMovement) {
    state = reduce(state, {
      type: 'dash',
      actor: mechanics.actorId,
      cost: dash.slot === 'bonus' ? 'bonus_action' : 'action',
    });
  }
  if (mechanics.path.length > 0) {
    state = reduce(state, {
      type: 'move', actor: mechanics.actorId, path: mechanics.path, cause: 'voluntary',
    });
  }
  if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') {
    return { state, remainingAttackTargetDead };
  }
  for (const use of mechanics.actionSlots) {
    if (state.combatants.find((entry) => entry.profile.id === mechanics.actorId)?.life !== 'living') break;
    switch (use.kind) {
    case 'attack': {
      const targetId = use.targetIds[0];
      if (targetId === undefined) throw new Error('Resolved attack omitted its target.');
      if (state.combatants.find((entry) => entry.profile.id === targetId)?.life === 'dead') {
        remainingAttackTargetDead = true;
        break;
      }
      const action = queries.actions(state, mechanics.actorId)
        .find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === use.actionId);
      if (action === undefined) throw new Error(`Resolved attack ${use.actionId} is absent.`);
      const evaluation = evaluateMonsterTacticalAttack(state, action, mechanics.actorId, targetId);
      state = reduce(state, monsterAttackCommand(action, mechanics.actorId, targetId, evaluation.rollMode.mode));
      break;
    }
    case 'dodge': state = reduce(state, { type: 'dodge', actor: mechanics.actorId, cost: 'action' }); break;
    case 'disengage': state = reduce(state, {
      type: 'disengage',
      actor: mechanics.actorId,
      cost: use.slot === 'bonus' ? 'bonus_action' : 'action',
    }); break;
    case 'dash': {
      if (!dashesBeforeMovement.includes(use)) {
        state = reduce(state, {
          type: 'dash',
          actor: mechanics.actorId,
          cost: use.slot === 'bonus' ? 'bonus_action' : 'action',
        });
      }
      break;
    }
    case 'hide': state = reduce(state, { type: 'hide', actor: mechanics.actorId, cost: 'bonus_action' }); break;
    case 'end_turn': return {
      state: reduce(state, { type: 'end_turn', actor: mechanics.actorId }),
      remainingAttackTargetDead,
    };
    case 'saving_throw': {
        const targetId = use.targetIds[0];
        if (targetId === undefined) throw new Error(`Resolved save action ${use.actionId} omitted its target.`);
        const sources = use.slot === 'main' ? monsterActions(state, mechanics.actorId) : monsterBonusActions(state, mechanics.actorId);
        const action = queries.actions(state, mechanics.actorId)
          .find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === use.actionId) ??
          sources.find((candidate): candidate is MonsterSavingThrowAction =>
            candidate.kind === 'saving_throw' && candidate.id === use.actionId);
        if (action === undefined) {
          throw new Error(`Saving-throw action ${use.actionId} is absent.`);
        }
        state = reduce(state, monsterSavingThrowCommand(
paths 55 present_at_b94 53 absent_at_b94 ['tests/unit/vtt/arena-basis-brutal-v2.test.ts', 'tests/unit/vtt/blind-cover-posture.test.ts']

 succeeded in 204395ms:
{"label":"base","config":"app","count":0,"diagnostics":[]}
{"label":"base","config":"node","count":0,"diagnostics":[]}
{"label":"expanded","config":"app","count":15,"diagnostics":[{"file":"src/vtt/blind-intent-resolver.ts","line":297,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/blind-intent-resolver.ts","line":321,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":103,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":122,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/opportunity-cost.ts","line":97,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/option-outcome.ts","line":605,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intent-resolver.ts","line":135,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intent-resolver.ts","line":292,"code":2339,"text":"Property 'anchor' does not exist on type 'EngineEngagement'.   Property 'anchor' does not exist on type '{ readonly stance: \"pursue_indication\"; readonly indication: { readonly targetId: CombatantId; readonly cells: readonly GridCell[]; }; }'."},{"file":"src/vtt/intent-resolver.ts","line":319,"code":2339,"text":"Property 'anchor' does not exist on type 'EngineEngagement'.   Property 'anchor' does not exist on type '{ readonly stance: \"pursue_indication\"; readonly indication: { readonly targetId: CombatantId; readonly cells: readonly GridCell[]; }; }'."},{"file":"src/vtt/intent-resolver.ts","line":407,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/mcp/engine-server.ts","line":906,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/offered-option-paths.ts","line":90,"code":2322,"text":"Type '{ readonly kind: \"search\"; readonly targetId: CombatantId; readonly reliance: \"sight\"; }' is not assignable to type 'never'."},{"file":"src/vtt/option-modeling.ts","line":188,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/plan-materiality.ts","line":128,"code":2339,"text":"Property 'anchor' does not exist on type 'EngineEngagement'.   Property 'anchor' does not exist on type '{ readonly stance: \"pursue_indication\"; readonly indication: { readonly targetId: CombatantId; readonly cells: readonly GridCell[]; }; }'."},{"file":"src/vtt/snippets/registry.ts","line":135,"code":2322,"text":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly CombatantId[]'.   Type 'CombatantId | undefined' is not assignable to type 'CombatantId'.     Type 'undefined' is not assignable to type 'CombatantId'.       Type 'undefined' is not assignable to type 'string'."}]}
{"label":"expanded","config":"node","count":17,"diagnostics":[{"file":"src/vtt/blind-intent-resolver.ts","line":297,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/blind-intent-resolver.ts","line":321,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":103,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":122,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/opportunity-cost.ts","line":97,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/option-outcome.ts","line":605,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intent-resolver.ts","line":135,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intent-resolver.ts","line":292,"code":2339,"text":"Property 'anchor' does not exist on type 'EngineEngagement'.   Property 'anchor' does not exist on type '{ readonly stance: \"pursue_indication\"; readonly indication: { readonly targetId: CombatantId; readonly cells: readonly GridCell[]; }; }'."},{"file":"src/vtt/intent-resolver.ts","line":319,"code":2339,"text":"Property 'anchor' does not exist on type 'EngineEngagement'.   Property 'anchor' does not exist on type '{ readonly stance: \"pursue_indication\"; readonly indication: { readonly targetId: CombatantId; readonly cells: readonly GridCell[]; }; }'."},{"file":"src/vtt/intent-resolver.ts","line":407,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/mcp/engine-server.ts","line":906,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/offered-option-paths.ts","line":90,"code":2322,"text":"Type '{ readonly kind: \"search\"; readonly targetId: CombatantId; readonly reliance: \"sight\"; }' is not assignable to type 'never'."},{"file":"src/vtt/option-modeling.ts","line":188,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/plan-materiality.ts","line":128,"code":2339,"text":"Property 'anchor' does not exist on type 'EngineEngagement'.   Property 'anchor' does not exist on type '{ readonly stance: \"pursue_indication\"; readonly indication: { readonly targetId: CombatantId; readonly cells: readonly GridCell[]; }; }'."},{"file":"src/vtt/snippets/registry.ts","line":135,"code":2322,"text":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly CombatantId[]'.   Type 'CombatantId | undefined' is not assignable to type 'CombatantId'.     Type 'undefined' is not assignable to type 'CombatantId'.       Type 'undefined' is not assignable to type 'string'."},{"file":"tests/unit/vtt/snippets.test.ts","line":83,"code":2345,"text":"Argument of type '(this: undefined, slot: EngineActionSlotUse) => EngineSpellId[] | EngineActionId[] | (\"dash\" | \"disengage\" | \"hide\" | \"dodge\" | \"end_turn\")[] | undefined' is not assignable to parameter of type '(this: undefined, value: EngineActionSlotUse, index: number, array: EngineActionSlotUse[]) => string | readonly string[]'.   Type 'EngineSpellId[] | EngineActionId[] | (\"dash\" | \"disengage\" | \"hide\" | \"dodge\" | \"end_turn\")[] | undefined' is not assignable to type 'string | readonly string[]'.     Type 'undefined' is not assignable to type 'string | readonly string[]'."},{"file":"tests/unit/vtt/snippets.test.ts","line":101,"code":2322,"text":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly string[]'.   Type 'CombatantId | undefined' is not assignable to type 'string'.     Type 'undefined' is not assignable to type 'string'."}]}
{"label":"B2","config":"app","count":6,"diagnostics":[{"file":"src/vtt/dm-tactical-intel.ts","line":103,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":122,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/opportunity-cost.ts","line":97,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/option-outcome.ts","line":605,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/mcp/engine-server.ts","line":906,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/snippets/registry.ts","line":135,"code":2322,"text":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly CombatantId[]'.   Type 'CombatantId | undefined' is not assignable to type 'CombatantId'.     Type 'undefined' is not assignable to type 'CombatantId'.       Type 'undefined' is not assignable to type 'string'."}]}
{"label":"B2","config":"node","count":8,"diagnostics":[{"file":"src/vtt/dm-tactical-intel.ts","line":103,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/dm-tactical-intel.ts","line":122,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/opportunity-cost.ts","line":97,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/intel/option-outcome.ts","line":605,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/mcp/engine-server.ts","line":906,"code":2366,"text":"Function lacks ending return statement and return type does not include 'undefined'."},{"file":"src/vtt/snippets/registry.ts","line":135,"code":2322,"text":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly CombatantId[]'.   Type 'CombatantId | undefined' is not assignable to type 'CombatantId'.     Type 'undefined' is not assignable to type 'CombatantId'.       Type 'undefined' is not assignable to type 'string'."},{"file":"tests/unit/vtt/snippets.test.ts","line":83,"code":2345,"text":"Argument of type '(this: undefined, slot: EngineActionSlotUse) => EngineSpellId[] | EngineActionId[] | (\"dash\" | \"disengage\" | \"hide\" | \"dodge\" | \"end_turn\")[] | undefined' is not assignable to parameter of type '(this: undefined, value: EngineActionSlotUse, index: number, array: EngineActionSlotUse[]) => string | readonly string[]'.   Type 'EngineSpellId[] | EngineActionId[] | (\"dash\" | \"disengage\" | \"hide\" | \"dodge\" | \"end_turn\")[] | undefined' is not assignable to type 'string | readonly string[]'.     Type 'undefined' is not assignable to type 'string | readonly string[]'."},{"file":"tests/unit/vtt/snippets.test.ts","line":101,"code":2322,"text":"Type '(CombatantId | undefined)[]' is not assignable to type 'readonly string[]'.   Type 'CombatantId | undefined' is not assignable to type 'string'.     Type 'undefined' is not assignable to type 'string'."}]}
{"label":"B3","config":"app","count":0,"diagnostics":[]}
{"label":"B3","config":"node","count":0,"diagnostics":[]}
{"label":"B4","config":"app","count":0,"diagnostics":[]}
{"label":"B4","config":"node","count":0,"diagnostics":[]}

exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {createEncounter,combatantSpaceAt}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {generateRoom}=require('./src/vtt/room-generator.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const K=c=>c.column+','+c.row, cell=(column,row)=>({column,row});
function approaches(s,origin){
 const inside=c=>c.column>=0&&c.row>=0&&c.column<s.bounds.columns&&c.row<s.bounds.rows;
 const pass=c=>inside(c)&&terrainPassabilityAt(s,c)"'!=='"'blocked';
 const C=new Map(),q=[origin];
 while(q.length){let c=q.shift();if(C.has(K(c))||"'!pass(c))continue;C.set(K(c),c);for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])q.push(cell(c.column+x,c.row+y))}
 const walls=new Set(terrainWallCells(s).map(K)),doors=new Set(s.worldObjects.filter(o=>o.kind==='"'door').flatMap(o=>o.footprint.map(K))),out=new Map();
 for(const c of C.values())if(c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1)out.set(K(c),c);
 for(const o of s.worldObjects)if(o.kind==='door'&&"'!o.blocking.movement)for(const c of o.footprint)if(C.has(K(c)))out.set(K(c),c);
 for(const [dx,dy]of[[0,1],[1,0]]){
  const plus=(c,n)=>cell(c.column+dx*n,c.row+dy*n);
  const runCell=c=>C.has(K(c))&&!doors.has(K(c));
  for(const start of C.values()){
   if(!runCell(start)||runCell(plus(start,-1)))continue;
   const R=[];let next=start;while(runCell(next)){R.push(next);next=plus(next,1)}
   if(!R.every(c=>pass(cell(c.column+dy,c.row+dx))&&pass(cell(c.column-dy,c.row-dx))))continue;
   if(![plus(start,-1),plus(start,-2),next,plus(next,1)].every(c=>inside(c)&&walls.has(K(c))))continue;
   for(const c of R)out.set(K(c),c)
  }
 }
 return [...out.values()].sort((a,b)=>a.row-b.row||a.column-b.column)
}
function scene(w,h,blocked,origin,pcpos,objects=[]){
 const actor=monsterProfile('"'blind-witness'),pc=playerProfile('sealed-pc');
 return freshMonsterPlanningState(createEncounter({bounds:{columns:w,rows:h},combatants:[actor,pc],tokens:[placedToken(actor,...origin),placedToken(pc,...pcpos)],blockedCells:blocked,worldObjects:objects}));
}
function walls(w,h,predicate){let a=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(x,y))a.push(cell(x,y));return a}
const perimeter=(w,h,x,y)=>x===0||x===w-1||y===0||y===h-1;
const obj=(id,kind,footprint,terrain)=>({id:'world-object:'+id,name:id,kind,position:footprint[0],footprint,durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking(terrain)});
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]"'!==b[i])return a[i]-b[i]}return 0}
function score(s,id){
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
 for(let y=0;y<s.bounds.rows;y++)for(let x=0;x<s.bounds.columns;x++){
  let dest=cell(x,y),route=env.queries.path(s,{actorId:id,destination:dest,movement:'"'normal'});
  if("'!route.legal)continue;
  const footprint=combatantSpaceAt(s,id,dest).cells;
  const profile=ap.map(a=>Math.min(...footprint.map(c=>{let t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3}[t.tier])}))).sort((a,b)=>a-b);
  candidates.push({dest,cost:route.costFeet,path:route.cells,profile});
 }
 candidates.sort((a,b)=>compare(b.profile,a.profile)||(K(a.dest)===K(origin)?-1:K(b.dest)===K(origin)?1:0)||a.cost-b.cost||a.dest.row-b.dest.row||a.dest.column-b.dest.column);
 let best=candidates[0],max=candidates.filter(c=>compare(c.profile,best.profile)===0),minCost=Math.min(...max.map(c=>c.cost));
 return {ap,origin,best,candidates,max,minCost,ties:max.filter(c=>c.cost===minCost)}
}
function outputScore(name,s,id){
 const r=score(s,id);console.log(JSON.stringify({name,approaches:r.ap.length,origin:r.origin,candidates:r.candidates.length,maxima:r.max.length,best:r.best,ties:r.ties.map(c=>({dest:c.dest,cost:c.cost,path:c.path}))}));return r
}

const sel=score.toString().replace('"'function score(s,id)','function score(s,id,override)').replace('ap=approaches(s,origin)','ap=override??approaches(s,origin)');
const scoreWithApproaches=eval('('+sel+')');
const s=scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&y"'!==3&&y!==5)),[1,3],[7,7]);
for(const a of[undefined,[cell(4,3),cell(4,5)]]){
const r=scoreWithApproaches(s,s.tokens[0].combatantId,a);
console.log(JSON.stringify({case:a?'"'trueGaps':'literalR3',approaches:r.ap.map(K),best:r.best,candidates:r.candidates.length,maxima:r.max.length}));
}
const witness=scene(9,5,walls(9,5,(x,y)=>(perimeter(9,5,x,y)||x===6)&&"'!(x===0&&y===2)),[1,2],[7,2],[obj('"'half','cover',[cell(2,2)],'half_cover')]);
for(const remaining of[5,0]){
 const id=witness.tokens[0].combatantId,limited={...witness,activeCombatant:id,combatants:witness.combatants.map(c=>c.profile.id===id?{...c,turn:{...c.turn,movement:{...c.turn.movement,remaining}}}:c)};
 const r=score(limited,id);console.log(JSON.stringify({remaining,best:r.best,destinationQuery:env.queries.path(limited,{actorId:id,destination:cell(3,2),movement:'normal'})}))
}
console.log(JSON.stringify({abstract:{weakestFirst:compare([1,1],[0,2]),sumA:0+2,sumB:1+1,optical:compare([4],[2]),footprintMinimum:Math.min(1,0,1,0)}}));

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
exec
/bin/bash -lc 'git branch --show-current && git rev-parse HEAD && sha256sum .tmp-plans/2026-09-18-blind-01-plan.md && wc -l .tmp-plans/2026-09-18-blind-01-plan.md && git status --porcelain=v1' in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 238ms:
 succeeded in 2389ms:
{"case":"literalR3","approaches":[],"best":{"dest":{"column":1,"row":3},"cost":0,"path":[],"profile":[]},"candidates":43,"maxima":43}
{"case":"trueGaps","approaches":["4,3","4,5"],"best":{"dest":{"column":4,"row":3},"cost":15,"path":[{"column":2,"row":2},{"column":3,"row":2},{"column":4,"row":3}],"profile":[0,1]},"candidates":43,"maxima":2}
{"remaining":5,"best":{"dest":{"column":1,"row":2},"cost":0,"path":[],"profile":[0]},"destinationQuery":{"legal":false,"code":"destination_unreachable"}}
{"remaining":0,"best":{"dest":{"column":1,"row":2},"cost":0,"path":[],"profile":[0]},"destinationQuery":{"legal":false,"code":"destination_unreachable"}}
{"abstract":{"weakestFirst":1,"sumA":2,"sumB":2,"optical":2,"footprintMinimum":0}}

codex
The type-expansion probe finishes at `0 app / 0 node` for B3 and B4; B2 has exactly the permitted `6 / 8` diagnostics. All five bounded amendments from r2 are present, and the inventory still matches all 68 additions exactly. F4 remains blocking: the literal rule misclassifies thick-walled corridors and omits closely spaced openings. Under the final-round rule, that definition needs owner resolution.
exec
/bin/bash -lc "node <<'NODE'
const ts=require('typescript'),fs=require('fs'),Module=require('module'),path=require('path');
const oldLoad=Module._load;
Module._load=function(id,parent,...rest){if(id.endsWith('?raw'))return fs.readFileSync(path.resolve(path.dirname(parent.filename),id.slice(0,-4)),'utf8');return oldLoad.call(this,id,parent,...rest)};
require.extensions['.ts']=(m,f)=>m._compile(ts.transpileModule((global.overlay?.get(path.resolve(f))??fs.readFileSync(f,'utf8')).replaceAll('import.meta.env','({MODE:\"review\",DEV:false})').replaceAll('import.meta.dirname',JSON.stringify(path.dirname(f))).replaceAll('import.meta.url',JSON.stringify(require('url').pathToFileURL(f).href)),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText,f);

const {terrainPassabilityAt,terrainWallCells,terrainBlocking}=require('./src/combat/terrain.ts');
const {createEncounter,combatantSpaceAt}=require('./src/combat/encounter.ts');
const {monsterProfile,playerProfile,placedToken}=require('./tests/unit/combat/fixtures.ts');
const {freshMonsterPlanningState}=require('./src/vtt/monster-planning-state.ts');
const {generateRoom}=require('./src/vtt/room-generator.ts');
const {buildOfferEnvironment}=require('./src/vtt/offers/build-offer-environment.ts');
const {traceTerrainLine}=require('./src/combat/cover.ts');
const env=buildOfferEnvironment({kind:'configuration',mode:'legacy_standard'});
const K=c=>c.column+','+c.row, cell=(column,row)=>({column,row});
function approaches(s,origin){
 const inside=c=>c.column>=0&&c.row>=0&&c.column<s.bounds.columns&&c.row<s.bounds.rows;
 const pass=c=>inside(c)&&terrainPassabilityAt(s,c)"'!=='"'blocked';
 const C=new Map(),q=[origin];
 while(q.length){let c=q.shift();if(C.has(K(c))||"'!pass(c))continue;C.set(K(c),c);for(const [x,y]of[[1,0],[-1,0],[0,1],[0,-1]])q.push(cell(c.column+x,c.row+y))}
 const walls=new Set(terrainWallCells(s).map(K)),doors=new Set(s.worldObjects.filter(o=>o.kind==='"'door').flatMap(o=>o.footprint.map(K))),out=new Map();
 for(const c of C.values())if(c.column===0||c.row===0||c.column===s.bounds.columns-1||c.row===s.bounds.rows-1)out.set(K(c),c);
 for(const o of s.worldObjects)if(o.kind==='door'&&"'!o.blocking.movement)for(const c of o.footprint)if(C.has(K(c)))out.set(K(c),c);
 for(const [dx,dy]of[[0,1],[1,0]]){
  const plus=(c,n)=>cell(c.column+dx*n,c.row+dy*n);
  const runCell=c=>C.has(K(c))&&!doors.has(K(c));
  for(const start of C.values()){
   if(!runCell(start)||runCell(plus(start,-1)))continue;
   const R=[];let next=start;while(runCell(next)){R.push(next);next=plus(next,1)}
   if(!R.every(c=>pass(cell(c.column+dy,c.row+dx))&&pass(cell(c.column-dy,c.row-dx))))continue;
   if(![plus(start,-1),plus(start,-2),next,plus(next,1)].every(c=>inside(c)&&walls.has(K(c))))continue;
   for(const c of R)out.set(K(c),c)
  }
 }
 return [...out.values()].sort((a,b)=>a.row-b.row||a.column-b.column)
}
function scene(w,h,blocked,origin,pcpos,objects=[]){
 const actor=monsterProfile('"'blind-witness'),pc=playerProfile('sealed-pc');
 return freshMonsterPlanningState(createEncounter({bounds:{columns:w,rows:h},combatants:[actor,pc],tokens:[placedToken(actor,...origin),placedToken(pc,...pcpos)],blockedCells:blocked,worldObjects:objects}));
}
function walls(w,h,predicate){let a=[];for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(predicate(x,y))a.push(cell(x,y));return a}
const perimeter=(w,h,x,y)=>x===0||x===w-1||y===0||y===h-1;
const obj=(id,kind,footprint,terrain)=>({id:'world-object:'+id,name:id,kind,position:footprint[0],footprint,durability:{kind:'indestructible'},armorClass:10,damageResponses:[],blocking:terrainBlocking(terrain)});
function compare(a,b){for(let i=0;i<a.length;i++){if(a[i]"'!==b[i])return a[i]-b[i]}return 0}
function score(s,id){
 const origin=s.tokens.find(t=>t.combatantId===id).position,ap=approaches(s,origin),candidates=[];
 for(let y=0;y<s.bounds.rows;y++)for(let x=0;x<s.bounds.columns;x++){
  let dest=cell(x,y),route=env.queries.path(s,{actorId:id,destination:dest,movement:'"'normal'});
  if("'!route.legal)continue;
  const footprint=combatantSpaceAt(s,id,dest).cells;
  const profile=ap.map(a=>Math.min(...footprint.map(c=>{let t=traceTerrainLine(s,a,c);return Number(t.blocksSight)*4+({none:0,half:1,three_quarters:2,total:3}[t.tier])}))).sort((a,b)=>a-b);
  candidates.push({dest,cost:route.costFeet,path:route.cells,profile});
 }
 candidates.sort((a,b)=>compare(b.profile,a.profile)||(K(a.dest)===K(origin)?-1:K(b.dest)===K(origin)?1:0)||a.cost-b.cost||a.dest.row-b.dest.row||a.dest.column-b.dest.column);
 let best=candidates[0],max=candidates.filter(c=>compare(c.profile,best.profile)===0),minCost=Math.min(...max.map(c=>c.cost));
 return {ap,origin,best,candidates,max,minCost,ties:max.filter(c=>c.cost===minCost)}
}
function outputScore(name,s,id){
 const r=score(s,id);console.log(JSON.stringify({name,approaches:r.ap.length,origin:r.origin,candidates:r.candidates.length,maxima:r.max.length,best:r.best,ties:r.ties.map(c=>({dest:c.dest,cost:c.cost,path:c.path}))}));return r
}

const controls=[];
controls.push(['"'sealed9x5',scene(9,5,walls(9,5,(x,y)=>(perimeter(9,5,x,y)||x===6)&&"'!(x===0&&y===2)),[1,2],[7,2],[obj('"'half','cover',[cell(2,2)],'half_cover')])]);
controls.push(['enclosed5x5',scene(5,5,walls(5,5,(x,y)=>perimeter(5,5,x,y)),[1,2],[3,2])]);
for(const gaps of [[4],[3,4],[2,6]])controls.push(['gap'+gaps,scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&"'!gaps.includes(y))),[2,4],[6,4])]);
controls.push(['"'open4x3',scene(4,3,[],[0,1],[3,1])]);
for(const open of [true,false])controls.push(['door'+open,scene(7,5,walls(7,5,(x,y)=>perimeter(7,5,x,y)||(x===3&&y"'!==2)),[1,2],[5,2],[obj('"'door','door',[cell(3,2)],open?'open':'wall')])]);
controls.push(['thinCorridor3x7',scene(3,7,walls(3,7,(x,y)=>x"'!==1||y===0||y===6),[1,1],[1,5])]);
controls.push(['"'thickCorridor5x7',scene(5,7,walls(5,7,(x,y)=>x"'!==2||y===0||y===6),[2,1],[2,5])]);
controls.push(['"'Lwall9x9',scene(9,9,walls(9,9,(x,y)=>perimeter(9,9,x,y)||(x===4&&y>=2&&y<=6)||(y===6&&x>=4&&x<=6)),[2,4],[6,4])]);

for(const [name,s]of controls){
const r=score(s,s.tokens[0].combatantId);
console.log(JSON.stringify({name,approaches:r.ap.map(K),candidates:r.candidates.length,maxima:r.max.length,best:r.best.dest,cost:r.best.cost,path:r.best.path,profile:r.best.profile}));
}

NODE" in /home/vagrant/PhpstormProjects/dnd-wt-blind-01
 succeeded in 2495ms:
{"name":"sealed9x5","approaches":["0,2"],"candidates":16,"maxima":3,"best":{"column":3,"row":2},"cost":10,"path":[{"column":2,"row":1},{"column":3,"row":2}],"profile":[1]}
{"name":"enclosed5x5","approaches":[],"candidates":8,"maxima":8,"best":{"column":1,"row":2},"cost":0,"path":[],"profile":[]}
{"name":"gap4","approaches":["4,4"],"candidates":42,"maxima":42,"best":{"column":2,"row":4},"cost":0,"path":[],"profile":[0]}
{"name":"gap3,4","approaches":["4,3","4,4"],"candidates":43,"maxima":43,"best":{"column":2,"row":4},"cost":0,"path":[],"profile":[0,0]}
{"name":"gap2,6","approaches":["4,2","4,6"],"candidates":43,"maxima":2,"best":{"column":4,"row":2},"cost":10,"path":[{"column":3,"row":3},{"column":4,"row":2}],"profile":[0,1]}
{"name":"open4x3","approaches":["0,0","1,0","2,0","3,0","0,1","3,1","0,2","1,2","2,2","3,2"],"candidates":11,"maxima":11,"best":{"column":0,"row":1},"cost":0,"path":[],"profile":[0,0,0,0,0,0,0,0,0,0]}
{"name":"doortrue","approaches":["3,2"],"candidates":12,"maxima":12,"best":{"column":1,"row":2},"cost":0,"path":[],"profile":[0]}
{"name":"doorfalse","approaches":[],"candidates":6,"maxima":6,"best":{"column":1,"row":2},"cost":0,"path":[],"profile":[]}
{"name":"thinCorridor3x7","approaches":[],"candidates":4,"maxima":4,"best":{"column":1,"row":1},"cost":0,"path":[],"profile":[]}
{"name":"thickCorridor5x7","approaches":["2,2","2,3","2,4"],"candidates":4,"maxima":4,"best":{"column":2,"row":1},"cost":0,"path":[],"profile":[0,0,0]}
{"name":"Lwall9x9","approaches":[],"candidates":38,"maxima":38,"best":{"column":2,"row":4},"cost":0,"path":[],"profile":[]}

codex
**PLAN-F4 — P1 — The new approach rule still misclassifies corridors and misses genuine openings.**  
Location: [plan lines 105–119](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/.tmp-plans/2026-09-18-blind-01-plan.md:105).

The stated controls pass with thin walls and sufficiently separated gaps. The general claim does not.

Two counterexamples, evaluated literally using real terrain, tracer, and path queries:

1. **One-wide corridor with two-cell-thick walls:** a 5×7 board whose only passable cells are `(2,1)` through `(2,5)`.

   ```text
   #####
   ##.##
   ##.##
   ##.##
   ##.##
   ##.##
   #####
   ```

   Required approaches: `{}`. Actual: **`{(2,2),(2,3),(2,4)}`**.

   Each interior cell qualifies as a horizontal gap: its crossing neighbors are passable, and both caps and continuations are walls. The extra continuation check therefore does not distinguish corridor interiors from openings.

2. **Closely spaced openings:** enclosed 9×9 board, dividing wall at column 4, gaps at rows **3 and 5**.

   Required: `{(4,3),(4,5)}`. Actual: **`{}`**.

   Each gap’s continuation encounters the other gap. The same failure occurs with gaps at rows **2 and 4**. “Multiple gaps are classified independently” is false.

**Fix:** escalate the approach definition to the owner under the final-round rule. Require both counterexamples as RED controls, alongside the existing controls. Decide the intended treatment of wall thickness and closely spaced openings before implementation; changing expected sets to match this heuristic would not prove D664’s intended behavior.

The complete requested control results were:

| Control | Literal r3 approach set | Hand oracle |
|---|---|---|
| Sealed 9×5 | `{(0,2)}` | Matches |
| Enclosed 5×5 | `{}` | Matches |
| Single gap, enclosed 9×9 | `{(4,4)}` | Matches |
| Two-cell-wide gap | `{(4,3),(4,4)}` | Matches |
| Two gaps at rows 2 and 6 | `{(4,2),(4,6)}` | Matches |
| Open 4×3 | `{(0,0),(1,0),(2,0),(3,0),(0,1),(3,1),(0,2),(1,2),(2,2),(3,2)}` | Matches: 10 |
| Open authored door | `{(3,2)}` | Matches |
| Closed authored door | `{}` | Matches |
| Thin-walled one-wide corridor | `{}` | Matches |
| Thick-walled one-wide corridor above | `{(2,2),(2,3),(2,4)}` | **Fails** |
| Enclosed L-wall | `{}` | Matches |
| Two gaps at rows 3 and 5 | `{}` | **Fails** |

For reproducibility: gap controls used perimeter walls plus column 4; door controls used a 7×5 perimeter and column-3 divider; the L-wall occupied `(4,2..6) ∪ (4..6,6)` inside a 9×9 perimeter. The thin corridor’s passable cells were `(1,1..5)` on a 3×7 board.

For **6209001**, both party-side and monster-side origins produce the same **81 approaches**:

- `(x,0)` and `(x,20)` for `x ∈ {0..10,12..21}`;
- `(0,y)` and `(21,y)` for `y ∈ {1..19}`;
- gap `(11,11)`.

That is **80 boundary cells plus one opening**. The passable gap connects both sides; the definition does not restrict approaches to the actor’s side.

The other r2 findings are closed:

- **F2 — lines 285–330:** B3/B4 each have **10 paths**; B4 owns its RED witnesses; B3 verifies **three files total**. In-memory type expansion reproduced **15 app / 17 node diagnostics**. B2-owned repairs leave exactly **6 / 8**; B3-owned repairs reach **0 / 0**, retained at the B4 boundary. This verifies the expansion’s consumer coverage, not the future implementation’s behavior.
- **F3 — lines 29–36, 361–372:** B7 wiring explicitly precedes COHORT B3. Focused checks cannot complete B7; the **30-fixture** full-file gate remains outstanding. The prerequisite contains **0/30** fixtures.
- **F8 — lines 168–184:** The replacement relocation fixture works. Both states have **26 reachable candidates**, **17 maximal profiles**, and exactly **two cheapest maxima**, `(2,1)` and `(2,5)`, each costing **10 ft**. Canonical selection remains `(2,1)`; the named hidden-row mutant selects `(2,1)` then `(2,5)`. **Mutant killed.**
- **F10 — lines 225–240:** The amendment preserves `targetedOffenseHasOpenTrace`. Extracting the actual prerequisite predicate reproduced: valid Web resolution **true**, open-scene productivity **true**, blocked-scene productivity **false**, structural component **true**, blocked trace **half / blocksSight=true**.
- **F11 — lines 47–61, 269–271:** The equivalent fallback-only mutant is retired; the `hiddenNow` bypass mutant and successful-Hide/prior-loss-cause coverage remain.

These changes preserve the requested amendment requirements; their prose is reorganized rather than copied word-for-word. **No P2 remains requiring another supervisor amendment.**

Footprint-aware scoring confirms every pinned actor:

| Actor | Approaches | Reachable candidates | Maximal profiles | Destination / cost |
|---|---:|---:|---:|---|
| 6209001 Bear | 81 | 60 | 15 | `(16,2)` / **10 ft** |
| 6209001 Eagle | 81 | 8 | 1 | `(20,4)` / **5 ft** |
| 6209001 Ghast | 81 | 81 | 21 | `(18,2)` / **5 ft** |
| 6209003 Goblin Boss | 55 | 31 | 11 | Origin `(11,2)` / **0 ft** |

The sealed 9×5 witness has **16 reachable candidates**, **three maximal profiles**, and winner `(3,2)`, costing **10 ft**, with exact path `[(2,1),(3,2)]`. Remaining budgets of **5 ft** and **0 ft** both retain origin at cost **0** and reject that destination.

The remaining verification results:

- Manifest sizes: **2, 4, 10, 10, 10, 10, 10, 2**; **55 unique paths**.
- **53/55** exist at `b94dd732`; the other two are correctly identified as the new posture test and the COHORT-supplied v2 test.
- D583: **148 baseline → 213 turn-proposal alone → 215 core → 216 final**. All **68 additions** match; **zero missing or extra**.
- Baseline generation replay: **43/43** fresh pairs equal, **43/43** tracked hashes stable, **0/43** fresh outputs equal historical fixtures, **zero** prohibited offer-module evaluations. Actual pre/post-implementation equality remains an implementation gate.
- The comparison controls distinguish weakest-first scoring from summation and footprint minimum from anchor-only scoring. Offer identity versus resolution identity and ELEVATION/D584 ownership sequencing remain correctly stated.

Verification commands included:

```bash
git branch --show-current
git rev-parse HEAD
sha256sum .tmp-plans/2026-09-18-blind-01-plan.md
wc -l .tmp-plans/2026-09-18-blind-01-plan.md
git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts
git ls-tree -r --name-only bea24cbe tests/unit/tools/d569-v6.test.ts
git ls-tree -r --name-only bea24cbe \
  tests/fixtures/arena-basis-brutal-v2 \
  tests/fixtures/arena-basis-brutal-b-v2 \
  tests/fixtures/arena-basis-brutal-2-v2
git status --porcelain=v1
```

The logged `node <<'NODE'` probes used `generateRoom`, literal approach enumeration, canonical `queries.path` without `maximumFeet`, `combatantSpaceAt`, and footprint-cell `traceTerrainLine`. Type probes ran through `node --max-old-space-size=6144` with an in-memory compiler host and writes forbidden.

Verified branch **`claude/blind-01`**, HEAD **`b94dd73221697e3d03da8991746726563777fa74`**, **460 lines**, SHA-256 **`0c0140eee4a61dfd677a817bd39ccbcc8d55f136d25b5470080562b2fa2356ef`**. Worktree remains clean. No prohibited commands, agents, model calls, or servers ran.

VERDICT: REJECT (1 P1, 0 P2)

REVIEW DONE
tokens used
389,839
**PLAN-F4 — P1 — The new approach rule still misclassifies corridors and misses genuine openings.**  
Location: [plan lines 105–119](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/.tmp-plans/2026-09-18-blind-01-plan.md:105).

The stated controls pass with thin walls and sufficiently separated gaps. The general claim does not.

Two counterexamples, evaluated literally using real terrain, tracer, and path queries:

1. **One-wide corridor with two-cell-thick walls:** a 5×7 board whose only passable cells are `(2,1)` through `(2,5)`.

   ```text
   #####
   ##.##
   ##.##
   ##.##
   ##.##
   ##.##
   #####
   ```

   Required approaches: `{}`. Actual: **`{(2,2),(2,3),(2,4)}`**.

   Each interior cell qualifies as a horizontal gap: its crossing neighbors are passable, and both caps and continuations are walls. The extra continuation check therefore does not distinguish corridor interiors from openings.

2. **Closely spaced openings:** enclosed 9×9 board, dividing wall at column 4, gaps at rows **3 and 5**.

   Required: `{(4,3),(4,5)}`. Actual: **`{}`**.

   Each gap’s continuation encounters the other gap. The same failure occurs with gaps at rows **2 and 4**. “Multiple gaps are classified independently” is false.

**Fix:** escalate the approach definition to the owner under the final-round rule. Require both counterexamples as RED controls, alongside the existing controls. Decide the intended treatment of wall thickness and closely spaced openings before implementation; changing expected sets to match this heuristic would not prove D664’s intended behavior.

The complete requested control results were:

| Control | Literal r3 approach set | Hand oracle |
|---|---|---|
| Sealed 9×5 | `{(0,2)}` | Matches |
| Enclosed 5×5 | `{}` | Matches |
| Single gap, enclosed 9×9 | `{(4,4)}` | Matches |
| Two-cell-wide gap | `{(4,3),(4,4)}` | Matches |
| Two gaps at rows 2 and 6 | `{(4,2),(4,6)}` | Matches |
| Open 4×3 | `{(0,0),(1,0),(2,0),(3,0),(0,1),(3,1),(0,2),(1,2),(2,2),(3,2)}` | Matches: 10 |
| Open authored door | `{(3,2)}` | Matches |
| Closed authored door | `{}` | Matches |
| Thin-walled one-wide corridor | `{}` | Matches |
| Thick-walled one-wide corridor above | `{(2,2),(2,3),(2,4)}` | **Fails** |
| Enclosed L-wall | `{}` | Matches |
| Two gaps at rows 3 and 5 | `{}` | **Fails** |

For reproducibility: gap controls used perimeter walls plus column 4; door controls used a 7×5 perimeter and column-3 divider; the L-wall occupied `(4,2..6) ∪ (4..6,6)` inside a 9×9 perimeter. The thin corridor’s passable cells were `(1,1..5)` on a 3×7 board.

For **6209001**, both party-side and monster-side origins produce the same **81 approaches**:

- `(x,0)` and `(x,20)` for `x ∈ {0..10,12..21}`;
- `(0,y)` and `(21,y)` for `y ∈ {1..19}`;
- gap `(11,11)`.

That is **80 boundary cells plus one opening**. The passable gap connects both sides; the definition does not restrict approaches to the actor’s side.

The other r2 findings are closed:

- **F2 — lines 285–330:** B3/B4 each have **10 paths**; B4 owns its RED witnesses; B3 verifies **three files total**. In-memory type expansion reproduced **15 app / 17 node diagnostics**. B2-owned repairs leave exactly **6 / 8**; B3-owned repairs reach **0 / 0**, retained at the B4 boundary. This verifies the expansion’s consumer coverage, not the future implementation’s behavior.
- **F3 — lines 29–36, 361–372:** B7 wiring explicitly precedes COHORT B3. Focused checks cannot complete B7; the **30-fixture** full-file gate remains outstanding. The prerequisite contains **0/30** fixtures.
- **F8 — lines 168–184:** The replacement relocation fixture works. Both states have **26 reachable candidates**, **17 maximal profiles**, and exactly **two cheapest maxima**, `(2,1)` and `(2,5)`, each costing **10 ft**. Canonical selection remains `(2,1)`; the named hidden-row mutant selects `(2,1)` then `(2,5)`. **Mutant killed.**
- **F10 — lines 225–240:** The amendment preserves `targetedOffenseHasOpenTrace`. Extracting the actual prerequisite predicate reproduced: valid Web resolution **true**, open-scene productivity **true**, blocked-scene productivity **false**, structural component **true**, blocked trace **half / blocksSight=true**.
- **F11 — lines 47–61, 269–271:** The equivalent fallback-only mutant is retired; the `hiddenNow` bypass mutant and successful-Hide/prior-loss-cause coverage remain.

These changes preserve the requested amendment requirements; their prose is reorganized rather than copied word-for-word. **No P2 remains requiring another supervisor amendment.**

Footprint-aware scoring confirms every pinned actor:

| Actor | Approaches | Reachable candidates | Maximal profiles | Destination / cost |
|---|---:|---:|---:|---|
| 6209001 Bear | 81 | 60 | 15 | `(16,2)` / **10 ft** |
| 6209001 Eagle | 81 | 8 | 1 | `(20,4)` / **5 ft** |
| 6209001 Ghast | 81 | 81 | 21 | `(18,2)` / **5 ft** |
| 6209003 Goblin Boss | 55 | 31 | 11 | Origin `(11,2)` / **0 ft** |

The sealed 9×5 witness has **16 reachable candidates**, **three maximal profiles**, and winner `(3,2)`, costing **10 ft**, with exact path `[(2,1),(3,2)]`. Remaining budgets of **5 ft** and **0 ft** both retain origin at cost **0** and reject that destination.

The remaining verification results:

- Manifest sizes: **2, 4, 10, 10, 10, 10, 10, 2**; **55 unique paths**.
- **53/55** exist at `b94dd732`; the other two are correctly identified as the new posture test and the COHORT-supplied v2 test.
- D583: **148 baseline → 213 turn-proposal alone → 215 core → 216 final**. All **68 additions** match; **zero missing or extra**.
- Baseline generation replay: **43/43** fresh pairs equal, **43/43** tracked hashes stable, **0/43** fresh outputs equal historical fixtures, **zero** prohibited offer-module evaluations. Actual pre/post-implementation equality remains an implementation gate.
- The comparison controls distinguish weakest-first scoring from summation and footprint minimum from anchor-only scoring. Offer identity versus resolution identity and ELEVATION/D584 ownership sequencing remain correctly stated.

Verification commands included:

```bash
git branch --show-current
git rev-parse HEAD
sha256sum .tmp-plans/2026-09-18-blind-01-plan.md
wc -l .tmp-plans/2026-09-18-blind-01-plan.md
git cat-file -e bea24cbe:tests/unit/vtt/arena-basis-brutal-v2.test.ts
git ls-tree -r --name-only bea24cbe tests/unit/tools/d569-v6.test.ts
git ls-tree -r --name-only bea24cbe \
  tests/fixtures/arena-basis-brutal-v2 \
  tests/fixtures/arena-basis-brutal-b-v2 \
  tests/fixtures/arena-basis-brutal-2-v2
git status --porcelain=v1
```

The logged `node <<'NODE'` probes used `generateRoom`, literal approach enumeration, canonical `queries.path` without `maximumFeet`, `combatantSpaceAt`, and footprint-cell `traceTerrainLine`. Type probes ran through `node --max-old-space-size=6144` with an in-memory compiler host and writes forbidden.

Verified branch **`claude/blind-01`**, HEAD **`b94dd73221697e3d03da8991746726563777fa74`**, **460 lines**, SHA-256 **`0c0140eee4a61dfd677a817bd39ccbcc8d55f136d25b5470080562b2fa2356ef`**. Worktree remains clean. No prohibited commands, agents, model calls, or servers ran.

VERDICT: REJECT (1 P1, 0 P2)

REVIEW DONE
