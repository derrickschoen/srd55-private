# VIS-FIELD-01 — Engine visibility field and derived fog

## 1 Goal and non-goals

Implement D626's simple engine-owned visibility truth: one pure, cached visibility field per observer; one transpose built from the same evaluator; creature detection expressed through that evaluator; fog derived from living player-character fields; and typed semantic-board facts for both directions.

Owner mandate (verbatim, D626): "do your simple version. it should handle spells like darkness and fog cloud blocking sightlines (also, seeing through magical darkness is a common warlock ability that needs to work). a darkvision creature should be able to see things in dim light that a non darkvision creature should not based on the vision range and light type (The engine should know which cells are eligible to be seen and then calculate if the creature can see that far in the current light type)". Also: "Must stay simple. We have wasted a lot of time."

Goals:

- Compute every in-bounds cell as `seen`, `seen_dim`, or `unseen` for an actual observer.
- Reuse the existing corner tracer and existing state light, obscurement, active area-effect, footprint, condition, and sense facts.
- Make intervening heavy obscurement, nonmagical darkness, and magical darkness opaque unless the observer defeats each crossed cell. This is an intentional D626 engine extension beyond the SRD's target-area wording; it makes Fog Cloud and Darkness block sightlines through their areas.
- Make creature sight, actor knowledge, engine visibility queries, derived fog, and semantic output consume the one evaluation truth.
- Preserve `located` for tremorsense/web sense and preserve Hidden/Invisible gates; neither becomes a light-field grade.

Non-goals: renderer work beyond feeding the existing fog layer its derived set; Q9 screenshot-probe behavior or its model judge; model calls; art; shadowcasting or a second LOS algorithm; a general exploration-memory/fog-of-war history; class-builder support for selecting Warlock invocations.

RAW note for the owner: dim light is visible to ordinary sight but is lightly obscured, so sight-based Perception has Disadvantage; darkvision upgrades dim to bright within range. This plan does **not** adopt a house rule that dim light requires darkvision. The requested normal/darkvision distinction is represented by `seen_dim` versus `seen`.

Verbatim SRD 5.2.1 text (`docs/srd/full/srd-5.2.1.txt:656-691`; right-hand column of the two-column source):

> An area might be Lightly or Heavily Obscured. In a
> Lightly Obscured area—such as an area with Dim
> Light, patchy fog, or moderate foliage—you have
> Disadvantage on Wisdom (Perception) checks that
> rely on sight.
> A Heavily Obscured area—such as an area with
> Darkness, heavy fog, or dense foliage—is opaque.
> You have the Blinded condition (see “Rules Glos-
> sary”) when trying to see something there.
> Light
> The presence or absence of light determines the cat-
> egory of illumination in an area, as defined below.
> Bright Light. Bright Light lets most creatures see
> normally. Even gloomy days provide Bright Light, as
> do torches, lanterns, fires, and other sources of illu-
> mination within a specific radius.
> Dim Light. Dim Light, also called shadows, cre-
> ates a Lightly Obscured area. An area of Dim Light
> is usually a boundary between Bright Light and
> surrounding Darkness. The soft light of twilight and
> dawn also counts as Dim Light. A full moon might
> bathe the land in Dim Light.
> Darkness. Darkness creates a Heavily Obscured
> area. Characters face Darkness outdoors at night
> (even most moonlit nights), within the confines of
> an unlit dungeon, or in an area of magical Darkness.
> Special Senses
> Some creatures have special senses that help them
> perceive things in certain situations. “Rules Glos-
> sary” defines the following special senses:
> Blindsight
> Darkvision

The glossary continues: darkvision sees Dim Light as Bright Light and Darkness as Dim Light within range (`docs/srd/full/srd-5.2.1.txt:11582-11588`). Devil's Sight says, verbatim (`docs/srd/full/srd-5.2.1.txt:4354-4358`):

> Devil’s Sight
> Prerequisite: Level 2+ Warlock
> You can see normally in Dim Light and Darkness—
> both magical and nonmagical—within 120 feet of
> yourself.

## 2 Verified facts (file:line)

- The checkout is `claude/vis-field` at `75c2f44a7784824195a6ad49d4ca2c71602bd7d5`; the worktree was clean before this plan.
- Main's binding record is D626 at `/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/decisions.md:22669-22672`. D625 requires one fact producer at `:22580-22583`. D616's old image-contrast condition and independent-pin rule are at `:22420-22422`; the D624/D616.1 fog-pilot history and its inconclusive/model-variance result are at `:22478-22502`, `:22591-22595`, `:22608-22612`, and `:22635-22639`.
- Main `AGENTS.md:6-28` says replace rather than accommodate; `:30-38` forbids deleting a retained test merely to get green, self-generated expectations, and data loss; `:40-63` requires closed types and exhaustive switches.
- `detectCombatant` is the current pairwise ladder (`src/combat/encounter.ts:2184-2247`), with `canCombatantSee` at `:2248-2253`. It traces first, preserves tremorsense/web sense as `located`, applies Blinded/Hidden/Invisible, then checks only the selected target cell for environment/effect obscurement and light. Its Perception mode independently treats dim/light obscurement as Disadvantage (`:4803-4820`).
- A second copied detection ladder exists in `src/vtt/engine-query-port.ts:791-829`, and its public query serializes that result at `:1882-1901`; it must be deleted, not updated in parallel. Actor knowledge already calls `detectCombatant` (`src/vtt/intel/actor-knowledge.ts:241-270`) but adds a separate authored-fog veto at `:262-265`.
- The shared geometry is `outerCorners` and interior-only corner crossing (`src/combat/cover.ts:48-98`), per-corner tracing (`:294-325`), four-target-corner aggregation (`:337-375`), best source-corner selection (`:414-472`), and public terrain/combatant entry points (`:475-530`). `blocksSight` comes from terrain kinds (`src/combat/terrain.ts:10-44`).
- The canonical range rule for a footprint to authored cells is nearest occupied-cell Chebyshev distance in 5-foot units: `minimumSpaceDistanceToCells` (`src/combat/creature-space.ts:514-518,532-578`). It agrees with `gridDistance` (`src/combat/grid.ts:71-85`).
- Environment lookup is last-region-wins with bright default (`src/combat/world-objects.ts:230-255`); its current comment explicitly says obscurement has no ray geometry (`:79-88`). Encounter setup validates environment at `src/combat/encounter.ts:1245-1253`; `set_light_level` exists at `:10607` and `:11769`.
- Fog Cloud is a heavy `obscured_area` (`src/combat/spells/definitions.ts:477-483`); Darkness is magical darkness and blocks darkvision (`:676-684`); Darkvision produces an active effect (`:685-690`). Active `obscured_area`/light-source effects are handled in encounter switches (`src/combat/encounter.ts:5859-5890,8274-8382`).
- Combat senses are a closed union in `src/combat/statblock.ts:31-37`; active feature payloads include `darkvision` at `src/combat/effects.ts:638-640`. `effectiveCombatRules` is the sole active-rules lens but currently returns base/wild-shape rules without sense effects (`src/combat/combat-rules.ts:29-42`). `createEncounter` materializes eligible `always_on` feature effects (`src/combat/encounter.ts:1346-1377`).
- `rg -n "devil|devils_sight|devil's sight" src tests` returned no implementation hits. There is generic imported feature plumbing (`src/content/content-pack.ts:1233-1247`) and always-on feature initialization, but no built-in Warlock invocation-selection grant. Therefore this unit adds the typed sense/effect and a fixture PC using the existing always-on path; mapping a selected Warlock invocation into that effect is the named follow-up.
- Authored runtime fog is declared/setup/validated/copied at `src/combat/encounter.ts:765,835,1316-1322,1396`; it also suppresses observation at `:2291-2292`. Player concealment copies it and adds another creature veto (`src/combat/visibility.ts:558-592`); DM projection copies it at `:518` and `:727`.
- Production authored lists are in `src/vtt/reference-encounter.ts:81-87,124`, `src/vtt/stored-character-encounter.ts:129`, `src/vtt/vane-warren.ts:560-563`, `src/vtt/d365-sample-dungeon.ts:321`, `src/vtt/handoff/fixtures/two-room.ts:112`, and generated fixtures at `src/vtt/generated-encounter-fixtures.ts:144-149,397-403,428,832`. Generated fog art IDs remain presentation inputs; only `layout.fog.cells` is removed (`:777-781`).
- The board accepts a fog/concealment set (`src/vtt/encounter-board.ts:100-111`), unions it at `:866-869`, and paints the existing layer/glyph at `:925,954`; only the producer at `:711` changes. The DM board-vs-DM-view equality check remains useful (`src/vtt/encounter-app.ts:2199-2205`).
- The semantic payload is tagged `engine-semantic-board-v2` (`src/vtt/semantic-board-payload.ts:14`), carries light/obscurement/fog lists (`:139-156`), projects regions/authored fog (`:305-358`), and serializes cell partitions at `:427-452,545-552`. Its strict MCP schema is `src/vtt/mcp/schemas.ts:671-755`; the visibility query sense enum is separately pinned at `:1124`.
- Semantic consumers are `src/vtt/blind-turn-context.ts:1196-1228`, `src/vtt/blind-model-ingress.ts:8-24,150-170`, `src/vtt/mcp/engine-server.ts:1455-1465,2794-2835`, `src/vtt/mcp/entrypoint.ts:583`, and type/measurement use in `tools/ai-dm-conversation.ts:203,2163-2204`. The Q9 screenshot probe is intentionally excluded by D626.
- The V1 decoder currently requires and validates `foggedCells` (`src/vtt/encounter-state-codec.ts:24-35,378-408`). Eighty-four frozen fixture files contain that old field; byte pins include `tests/unit/vtt/room-roster-preflight.test.ts:103-116`. They can remain byte-identical while V1 validates then discards the obsolete field and new session states omit it.

## 3 Contract

### 3.1 Types and public functions

Create `src/combat/visibility-field.ts`, not `src/combat/visibility.ts`: the former is a pure combat-rules service usable by the reducer, query port, VTT projections, and semantic projection; the latter remains the audience-redaction boundary and may consume the service without becoming its owner.

```ts
export type VisibilityGrade = 'seen' | 'seen_dim' | 'unseen';
export type SightSense = 'normal_sight' | 'darkvision' | 'blindsight' | 'truesight' | 'devils_sight';
export type SightOutcome =
  | { readonly kind: 'visible'; readonly grade: 'seen' | 'seen_dim'; readonly sense: SightSense }
  | { readonly kind: 'unseen'; readonly reason: 'blocked' | 'obscured' | 'darkness' | 'out_of_range' };
export interface VisibilityFieldCell { readonly cell: GridCell; readonly grade: VisibilityGrade }
export function visibilityField(state: EncounterState, observerId: CombatantId): readonly VisibilityFieldCell[];
export function sightToCreature(state: EncounterState, observerId: CombatantId, subjectId: CombatantId): SightOutcome;
export function cellsThatCanSee(state: EncounterState, subjectId: CombatantId): readonly GridCell[];
export function derivedFogCells(state: EncounterState, observerIds: readonly CombatantId[]): readonly GridCell[];
```

All lists are unique row-major and frozen/read-only. Switches over grade, sense, and result have no default arm. Cache detailed per-cell outcomes in a `WeakMap<EncounterState,...>`; reducer states are immutable identities, so projections reuse work without owning a second cache truth.

`cellsThatCanSee` has one deliberately small meaning: move an unblinded, one-cell, ordinary-normal-sight virtual observer through every in-bounds origin, and include origin `c` iff the shared evaluator can see at least one cell in the subject footprint. Its semantic row declares `observer_profile: 'normal_sight_unblinded_single_cell'`. Thus, for that declared observer profile, “a creature at `c` sees S” is exactly “some S footprint cell is visible in the field evaluated with observer origin `c`.” It is not a separate ladder and does not pretend to encode every possible observer sense; actual PC/NPC fields do that.

### 3.2 Shared cell ladder

For each target cell, derive the observer footprint with `combatantSpace`, range with `minimumSpaceDistanceToCells(observerSpace,[cell])`, conditions with `combatantConditions`, active senses with `effectiveCombatRules`, and region values with the existing environment helpers.

1. Build the observer-specific opaque-cell set from environment heavy/magical obscurement, environment `darkness`, and concrete active `obscured_area` effects. Extend the existing cover tracer with sorted `additionalSightBlockingCells`; include these cells in corner candidates/cache keys and `blocksSight`, but do not let them alter ordinary cover tiers. Exclude source and target cells as today. Use all four `outerCorners` of the whole observer footprint and the existing best-source-corner selection. Terrain Total Cover is never defeated. For an intervening cell, in-range blindsight/truesight defeat heavy fog; in-range darkvision/Devil's Sight/truesight/blindsight defeat nonmagical darkness; in-range Devil's Sight/truesight/blindsight defeat magical darkness. If every eligible corner ray remains blocked, return `unseen/blocked`.
2. Evaluate the target cell itself. Heavy obscurement => unseen unless in-range blindsight/truesight. Magical darkness => unseen unless in-range blindsight/truesight/Devil's Sight. Nonmagical darkness => darkvision gives `seen_dim`; blindsight/truesight/Devil's Sight give `seen`; otherwise unseen (`out_of_range` when an applicable ranged sense exists but is short, else `darkness`). Dim => `seen_dim` for normal sight and `seen` for in-range darkvision/Devil's Sight/blindsight/truesight. Bright => `seen`. Independent light obscurement forces `seen_dim` unless blindsight/truesight defeats it; darkvision and Devil's Sight do not erase fog/foliage.
3. A Blinded observer has no physical-sight branches: darkvision, truesight, Devil's Sight, and normal sight cannot produce visibility. In-range blindsight still can. Tremorsense/web sense never promotes a cell to sight; pairwise detection may still return `located`.
4. A special sense defeats a target or intervening cell only when that specific cell's nearest-footprint distance is within the sense's `rangeFeet`. Normal sight has no artificial range cap.

`sightToCreature` aggregates the cached detailed cell outcomes: visible iff any footprint cell is `seen`/`seen_dim`, preferring `seen` then row-major for the reported sense/reason. `visibilityField` is merely the public grade projection of those same cached outcomes.

### 3.3 Pairwise agreement and downstream truth

- `detectCombatant` keeps, in order, blindsight's Invisible handling, tremorsense/web `located`, terrain blocking, Blinded, Hidden, and Invisible semantics, but delegates every light/obscurement/Devil's Sight decision and footprint aggregation to `sightToCreature`. Add `devils_sight` to its seen-sense union. `canCombatantSee` remains `detect.kind === 'seen'`.
- Delete `engine-query-port.ts`'s private `Detection`/`detect`; its query calls exported `detectCombatant`. Actor knowledge keeps calling `detectCombatant` and loses its authored-fog veto. This implements D625's one-producer rule.
- Fixture agreement invariant: for every ordered pair in a fixture with no Hidden/Invisible/tremor/web overlay, `detectCombatant(...).kind === 'seen'` iff any subject-footprint cell has a non-`unseen` field grade. The test includes normal, darkvision, Devil's Sight, blindsight, truesight, dim, darkness, heavy fog, and terrain-blocked pairs.
- Sight Perception mode consumes the shared subject result: `seen_dim` adds Disadvantage, while `seen` does not. Independent light obscurement remains `seen_dim`; darkvision correctly upgrades dim but not fog.

### 3.4 Devil's Sight grant

Add `devils_sight` with `rangeFeet` to `CombatSense`, detection/query/schema exhaustive unions, and `{ kind: 'devils_sight'; rangeFeet: number }` to `EffectPayload`. `effectiveCombatRules` merges active self-targeted `darkvision` and `devils_sight` effects into senses, taking the maximum range per kind and retaining unique kinds. A test PC receives an `always_on`, permanent Devil's Sight feature through the existing `CombatFeatureEffect` initialization (`encounter.ts:1346-1377`), proving the grant seam. Follow-up (not this unit): when the character builder models Warlock invocation choices, map the selected Level 2+ invocation to that same always-on payload; do not add a parallel class-specific vision rule now.

### 3.5 Derived fog and semantic schema

- DM fog: complement of the union of fields for placed combatants with `profile.kind === 'player_character' && life === 'living'`.
- Player-seat fog/concealment: complement of the union for placed, non-pending owned combatants whose `life === 'living'`. No eligible observers means every in-bounds cell is concealed. Hidden creature geometry stays separately redacted; remove the redundant “footprint entirely fogged” creature veto.
- Remove runtime/setup `foggedCells`. V1 decoding accepts the old key only as an optional, validated migration input, then deletes it before returning `EncounterState`; absent is valid for new session snapshots. Frozen fixture bytes/hashes do not move, and the value cannot influence runtime truth.
- Keep DM-board `foggedCells` and player-board `concealedCells` as derived projection outputs so `encounter-board.ts:866-869,925,954`, accessible-board consumers, and the app equality check continue painting/checking the existing layer.
- Bump `SEMANTIC_BOARD_FORMAT` to `engine-semantic-board-v3`. Add optional (only optional because deterministic size truncation/player redaction may remove it):

```ts
visibility: {
  observers: EngineFactList<{ actor_id: string; seen: EngineCellFactList; seen_dim: EngineCellFactList }>;
  subjects: EngineFactList<{ actor_id: string; observer_profile: 'normal_sight_unblinded_single_cell'; visible_from: EngineCellFactList }>;
}
```

The authoritative state-to-board projection computes rows for every placed PC/NPC by calling the combat service; serializers only encode them. `cells.fogged` becomes derived DM fog. `cells.obscurement.{light,heavy}`, `cells.obscured`, and `cells.obscured_or_fogged` include both environment regions and concrete active `obscured_area` effects; magical darkness belongs to `heavy`. Add `visibility` last to `SEMANTIC_BOARD_TRUNCATION_CLASSES` and raise the strict list maximum from 3 to 4, so lower-priority light/adjacency/objects truncate first and an oversized visibility block is omitted only with an explicit `semantic_board_truncated: ['...','visibility']`. Blind delivery keeps visibility protected under its existing 8,192-byte cap and gets a measured fixture assertion; no cap is repinned by guess.

Every current fog reader has one explicit disposition:

| Current reader | Replacement |
|---|---|
| `encounter.ts` state/setup validation/copy and observation-history veto | Delete field/input/veto; detection already supplies sight truth. |
| `visibility.ts` classification, DM clone, player `fog` set, full-footprint creature veto, DM compact copy | Delete classification/clone/veto; call `derivedFogCells` for DM-party and seat-owned projections. |
| `intel/actor-knowledge.ts` full-footprint fog veto | Delete; retain its sole call to `detectCombatant`. |
| `encounter-board.ts` DM-board producer | Call `derivedFogCells`; model/renderer/a11y readers keep consuming the projection field. |
| `semantic-board-payload.ts` state copy and fog/union serializer | Project derived DM fog once; serializer encodes it and never recomputes. |
| `encounter-state-codec.ts` strict persisted-state reader | Optional V1 validation-and-discard only; returned/new runtime state has no field. |
| `encounter-app.ts` board-vs-view check | No edit: it now compares two projections of the same derived helper. |
| Reference/stored/Vane/d365/two-room/generated encounter setup writers | Delete cell lists; generated package retains fog art IDs only. |
| Unit board-model fixtures (`board-glyphs`, `encounter-board-art`) | No change: they test the renderer's projection input, not authored encounter state. |

Semantic consumer disposition: `mcp/schemas.ts` and `blind-turn-context.ts` gain strict v3 visibility schemas; `engine-server.ts` gains the exhaustive truncation arm; `engine-turn-context.schema.json` is regenerated under its independent schema-equality invariant. `mcp/entrypoint.ts` keeps forwarding `projectEngineSemanticBoard`; `blind-model-ingress.ts` keeps validating the imported strict schema/unchanged top-level allowlist; `ai-dm-conversation.ts` keeps opaque measurement plus the expanded truncation union. Those three need no source edit but their suites run. The screenshot probe remains excluded.

## 4 Ordered batches (at most 10 allowed files each)

For every batch, RED means run the named focused suites before implementation and record the intended new assertions failing. Every named mutant is applied one at a time, proved present, required to make its named test fail, restored byte-for-byte, and the baseline rerun. `T-app` = `npx tsc -p tsconfig.app.json --noEmit`; `T-node` = `npx tsc -p tsconfig.node.json --noEmit`. Run both after every batch. Final integration also runs the authoritative `npx tsc -b --force`.

### Batch 1 — typed evaluator, tracer reuse, active sense effects (10 files)

Allowed: `src/combat/visibility-field.ts` (new), `src/combat/cover.ts`, `src/combat/statblock.ts`, `src/combat/effects.ts`, `src/combat/combat-rules.ts`, `src/combat/encounter.ts`, `src/combat/world-objects.ts`, `src/content/content-pack.ts`, `tests/unit/combat/visibility-field.test.ts` (new), `tests/unit/vtt/senses.test.ts`.

Required tests: literal expected sets on small grids for a full wall strip, dim and light-obscured cells, ordinary darkness, concrete Fog Cloud between observer/target, concrete Darkness with normal/darkvision/Devil's Sight observers, 60-foot darkvision edge and 65-foot miss, Large best-footprint corner, Blinded, blindsight, target-footprint-any-cell, transpose equivalence, Perception grade, always-on Devil's Sight, and the every-ordered-pair agreement fixture. Expected arrays are written explicitly in tests, never generated by `visibilityField`/the tracer.

Required reds/mutants: `RANGE_IGNORED`, `INTERVENING_OBSCUREMENT_IGNORED`, `DEVILS_SIGHT_IGNORED`, `DIM_TREATED_AS_DARK`, `LIGHT_OBSCUREMENT_IGNORED`, `BEST_FOOTPRINT_CORNER_IGNORED`, `BLINDED_PHYSICAL_SIGHT_ALLOWED`, `BLINDSIGHT_IGNORED`, `FIELD_DETECT_DIVERGES`.

T: T-app + T-node. Suites: `tests/unit/combat/visibility-field.test.ts`, `tests/unit/vtt/senses.test.ts`, `tests/unit/combat/terrain.test.ts`, `tests/unit/combat/creature-cover.test.ts`.

### Batch 2 — remove copied pairwise producers (5 files)

Allowed: `src/vtt/engine-query-port.ts`, `src/vtt/intel/actor-knowledge.ts`, `tests/unit/vtt/engine-query-port.test.ts`, `tests/unit/vtt/actor-knowledge.test.ts`, `tests/unit/vtt/content-pack.test.ts`.

Required tests: engine-query result equals `detectCombatant` including Devil's Sight and `located`; actor knowledge no longer consults map fog; imported combat-sense decoding accepts bounded Devil's Sight where combat senses are accepted. Keep Hidden/Invisible/tremor/web cases unchanged.

Required reds/mutants: `ENGINE_QUERY_OLD_LADDER`, `ACTOR_KNOWLEDGE_FOG_OVERRIDE`, `DEVILS_SIGHT_SCHEMA_OMITTED`.

T: T-app + T-node. Suites: the three allowed test files plus `tests/unit/vtt/detection-reactions.test.ts`.

### Batch 3 — projections consume derived fog; pre-clean callers/pins (10 files)

Allowed: `src/combat/visibility.ts`, `src/vtt/encounter-board.ts`, `tests/unit/combat/visibility.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`, `tests/unit/vtt/scene-snapshot.test.ts`, `tests/unit/vtt/regret.test.ts`, `tests/unit/bridge/decision-program.test.ts`, `tests/unit/tools/ai-dm-screenshot-probe.test.ts`, `tests/unit/vtt/semantic-board-payload.test.ts`, `tests/unit/vtt/blind-context-source-binding.test.ts`.

Required tests: DM uses all living party fields; a seat unions every living owned field; dead/dying/stable and pending/absent tokens do not reveal; empty observer set conceals all; hidden redaction remains separate; DM compact view and board expose identical derived fog. Remove old setup literals from future callers. In the excluded Q9 test file, make only the compile-time setup cleanup; do not change its probe oracle or run it as an acceptance suite.

Required reds/mutants: `FOG_STILL_AUTHORED`, `OWNED_SET_IGNORED`, `NONLIVING_OBSERVER_REVEALS`, `EMPTY_OBSERVER_SET_REVEALS`, `BOARD_VIEW_FOG_DIVERGES`.

T: T-app + T-node. Suites: `tests/unit/combat/visibility.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`, `tests/unit/vtt/scene-snapshot.test.ts`, `tests/unit/vtt/actor-knowledge.test.ts`, `tests/unit/vtt/accessible-board.test.ts`, `tests/unit/bridge/decision-program.test.ts`, `tests/unit/vtt/regret.test.ts` (explicitly not the Q9 probe suite).

### Batch 4 — delete production-authored fog lists (9 files)

Allowed: `src/vtt/reference-encounter.ts`, `src/vtt/stored-character-encounter.ts`, `src/vtt/vane-warren.ts`, `src/vtt/d365-sample-dungeon.ts`, `src/vtt/handoff/fixtures/two-room.ts`, `src/vtt/generated-encounter-fixtures.ts`, `src/vtt/test-approved-first-skirmish.ts`, `tests/unit/vtt/generated-encounter-fixtures.test.ts`, `tests/unit/vtt/vane-warren.test.ts`.

Required tests: generated package retains its three fog art IDs but rejects the obsolete `layout.fog.cells`; approved encounter rendering gets fog only from party visibility. Hand-computed integration oracles: reference grid is 10×7 = 70 cells; its three normal-sight living PCs see 69, with only dark target `(4,3)` unseen by all, so DM fog is exactly `[(4,3)]`. Default Vane Warren is 14×10 = 140; all cells are bright/dim, its smoke is only light obscurement, and its two isolated blockers form no Total-Cover screen, so at least one of the five PCs sees every cell and DM fog is exactly `[]` (`140 - 140 = 0`). Store these literal sets, not output-derived snapshots.

Required reds/mutants: `GENERATED_FOG_CELLS_RETAINED`, `REFERENCE_DARK_CELL_REVEALED`, `VANE_DIM_TREATED_UNSEEN`.

T: T-app + T-node. Suites: `tests/unit/vtt/generated-encounter-fixtures.test.ts`, `tests/unit/vtt/vane-warren.test.ts`, `tests/unit/combat/visibility-field.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`.

### Batch 5 — remove runtime state field; preserve V1 import only (5 files)

Allowed: `src/combat/encounter.ts`, `src/combat/visibility.ts`, `src/vtt/encounter-state-codec.ts`, `src/vtt/semantic-board-payload.ts`, `tests/unit/vtt/challenge-room-fixtures.test.ts`.

Required tests: `EncounterState`/setup/classification have no `foggedCells`; fresh session round-trip omits it; V1 with a valid old list validates and returns a state without the key; malformed/duplicate old lists still fail; changing only a legacy fog list yields byte-identical decoded runtime states; all 84 fixture files and their existing SHA pins stay byte-identical; generated-vs-decoded state equality remains.

Required reds/mutants: `V1_FOG_INFLUENCES_RUNTIME`, `V1_FOG_NOT_VALIDATED`, `RUNTIME_FOG_FIELD_RETAINED` (the last is a compile-time negative control).

T: T-app + T-node. Suites: `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/room-roster-preflight.test.ts`, `tests/unit/vtt/session-persistence.test.ts`, `tests/unit/vtt/replay.test.ts`.

### Batch 6 — semantic v3, consumers, truncation, independent pins (10 files)

Allowed: `src/vtt/semantic-board-payload.ts`, `src/vtt/mcp/schemas.ts`, `src/vtt/mcp/engine-server.ts`, `src/vtt/blind-turn-context.ts`, `docs/specs/engine-turn-context.schema.json`, `tests/unit/vtt/semantic-board-payload.test.ts`, `tests/unit/vtt/blind-turn-context.test.ts`, `tests/unit/vtt/blind-context-source-binding.test.ts`, `tests/unit/tools/engine-mcp-handler.test.ts`, `tests/unit/tools/ai-dm-board-delivery.test.ts`.

Required tests: exact v3 schema accepts literal per-actor `seen`/`seen_dim` and subject `visible_from` runs; v2 and malformed/missing provenance reject; environment plus Fog Cloud/Darkness effects appear in obscurement unions; semantic rows equal direct service output but expected cell lists are independently hand-authored; player serialization omits DM visibility; visibility truncates only after light/adjacency/objects and records the class; blind reference payload remains under 8,192 bytes and source-binding maps every new string leaf to raw state/service provenance. Regenerate the JSON schema only after the strict Zod assertions pass, then retain the independent byte-equality test against `z.toJSONSchema`.

Required reds/mutants: `FORMAT_NOT_BUMPED`, `SEMANTIC_VISIBILITY_RECOMPUTED`, `EFFECT_OBSCUREMENT_OMITTED`, `VISIBLE_FROM_USES_SECOND_LADDER`, `VISIBILITY_TRUNCATION_UNAUDITED`, `SOURCE_BINDING_VISIBILITY_UNMAPPED`.

T: T-app + T-node, then `npx tsc -b --force`. Suites: all five allowed test files plus `tests/unit/tools/engine-mcp-server.test.ts`, `tests/unit/tools/ai-dm-conversation.test.ts`, and `tests/unit/vtt/accessible-board.test.ts`. Final focused aggregate: every suite named in Batches 1-6. Do not run browser tests or touch port 4173.

Unique file manifest total: **44 files** (2 new, 42 existing). Repeated files in later batches are counted once. No fixture JSON, art, model/probe source, package file, lockfile, config, or git metadata is in the manifest.

## 5 Pins and invariants touched

- D569 board-delivery goldens: `FOOTPRINTS_RAW_CONTEXT_SHA256`, `E1C_RAW_CONTEXT_SHA256`, and 31,995/32,000-byte literals at `tests/unit/tools/ai-dm-board-delivery.test.ts:53-60,510-556,670-682`. Do not compute replacement constants from the new run. Remove the obsolete exact byte/hash assertions and replace them with: default/image-off/semantic-off raw-context and invocation byte identity; repeated-run byte identity; `state_ref.state_handle === engine-state:<capsule digest>`; semantic-disabled rows have zero semantic bytes/truncation; and normalized policy/state-handle transformations alter only their declared substrings.
- Scene persistence goldens at `tests/unit/vtt/scene-snapshot.test.ts:206-230` encode the old player view/state. Do not repin the three hashes. Retain before/after byte equality, actual journal checksum equality, pending-request identity, immutability, and a negative mutation of each protected component.
- `docs/specs/engine-turn-context.schema.json:5205` pins semantic v2. Its replacement invariant is the existing exact equality to `z.toJSONSchema` (`tests/unit/tools/engine-mcp-handler.test.ts:1095-1103`) plus explicit v3 acceptance, v2 rejection, exhaustive new fields, and truncation enum tests.
- Blind source-binding fixtures/classification (`tests/unit/vtt/blind-context-source-binding.test.ts:83-95,489-499,549,686`) gain visibility path families and raw provenance witnesses; a mutated actor id/grade/cell must fail. No context text is accepted merely because the serializer emitted it.
- Frozen arena basis bytes/hashes (`tests/unit/vtt/room-roster-preflight.test.ts:103-116`) do **not** move. The V1 decoder's independent invariant is that two payloads differing only in old fog decode to the same runtime state while malformed old fog is rejected.
- Generated approved-fixture identity is content-addressed, not a fixed literal (`tests/unit/vtt/generated-encounter-fixtures.test.ts:232-260`); retain canonical-byte, approval-hash, offline-load, and tamper-detection invariants. Deleting `layout.fog.cells` legitimately changes dynamically derived identity without repinning a constant.
- D616/D624 image/Q9 pins and captures are untouched; D626 closed that pilot. Rendering continues to consume the existing derived projection set, so no pixel/art pin is regenerated.

## 6 Assumptions verified locally and how

- Read main `AGENTS.md` and exact D616, D624.*, D625, and D626 records with numbered line reads; D626 supersedes the image-fog pilot and mandates this field.
- Verified branch/HEAD/clean status with read-only git commands. No git write command was used.
- Read the full current detection/perception ladders, cover tracer, footprint distance helpers, environment lookup, spell definitions, effect union/switches, active-rules lens, and all `foggedCells` readers using `sed`/`rg`.
- Ran the repository's normalized `srdgrep.py` and line reads for dim/heavy obscurement, Darkvision, Blindsight, Tremorsense, Truesight, and Devil's Sight. The model-backed KB helper was not used because this unit forbids model calls.
- Proved there is a copied query-port detection ladder and an actor-knowledge fog override; the plan removes both instead of adding a third producer.
- Proved there is no Devil's Sight implementation and no built-in invocation-selection grant. Verified the generic always-on feature-effect path is sufficient for a fixture and future grant mapping.
- Enumerated production authored fog inputs and every runtime/projection reader. Counted 84 old fixture files with `foggedCells`; inspected the V1 strict decoder and frozen fixture SHA table before choosing validate-and-discard rather than rewriting/pinning those bytes.
- Read both tsconfigs: root references app and node; app covers `src`, node covers tests/tools. The plan names both direct T commands per batch and the final forced build-mode gate required by `.claude/supervision.md:94-103`.
- Did not inspect sibling worktrees or `/home/vagrant/dnd-slim-runs`, did not depend on `node_modules`, did not invoke a model/reviewer/agent/skill, and did not touch port 4173.

## 7 Open questions for the owner

None. D626 fixes all design choices needed for this unit; the only deferred item is the explicitly named character-builder mapping for a selected Warlock invocation, which does not change the field design.
