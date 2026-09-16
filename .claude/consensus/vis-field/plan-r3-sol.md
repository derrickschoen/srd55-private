# VIS-FIELD-01 — Engine visibility field and derived fog (round 2)

## 1 Goal and non-goals

Implement D626/D626.1's simple, engine-owned visibility truth: one shared cell evaluator; actual-observer fields and geometric reverse eligibility derived from it; pairwise sight delegated to it; current fog derived from eligible player observers; and optional per-actor semantic facts.

Owner mandate (verbatim, D626): "do your simple version. it should handle spells like darkness and fog cloud blocking sightlines (also, seeing through magical darkness is a common warlock ability that needs to work). a darkvision creature should be able to see things in dim light that a non darkvision creature should not based on the vision range and light type (The engine should know which cells are eligible to be seen and then calculate if the creature can see that far in the current light type)". Also: "Must stay simple. We have wasted a lot of time."

Goals:

- Grade every in-bounds cell `seen`, `seen_dim`, or `unseen` for an actual observer.
- Reuse the existing corner tracer, footprint-distance rule, environment/effect facts, conditions, and senses; do not add another LOS algorithm.
- Fog Cloud/heavy material obscurement and magical Darkness block intervening rays unless the relevant sense defeats each crossed cell. This ray-opacity rule intentionally goes beyond the SRD's target-area wording to satisfy the owner's spell examples.
- Treat ordinary nonmagical darkness at the target cell only by default. Clear unlit air between an observer and a lit target is not opaque. Section 7 records the broader test/mutant consequences if the owner flips that policy.
- Make creature sight, actor knowledge, engine queries, derived fog, and semantic output consume this one evaluator.

Non-goals: exploration-memory fog; renderer work beyond painting the derived set with the existing fog layer; the Q9 screenshot-model oracle or any model call; art; shadowcasting; Warlock invocation-choice UI/plumbing.

RAW note for the owner: ordinary sight can see in dim light; dim light is lightly obscured and imposes Disadvantage on sight-based Perception. Darkvision upgrades dim to bright and darkness to dim within range. This plan follows that RAW reading and does **not** make dim light require darkvision.

Verbatim SRD 5.2.1 text (`docs/srd/full/srd-5.2.1.txt:656-691`; right column of the two-column source):

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

The glossary says darkvision sees Dim Light as Bright Light and Darkness as Dim Light within range (`docs/srd/full/srd-5.2.1.txt:11582-11588`). Devil's Sight says (`:4354-4358`):

> Devil’s Sight
> Prerequisite: Level 2+ Warlock
> You can see normally in Dim Light and Darkness—
> both magical and nonmagical—within 120 feet of
> yourself.

## 2 Verified facts (file:line)

- Checkout is `claude/vis-field` at `75c2f44a7784824195a6ad49d4ca2c71602bd7d5`. Main D626 is `.claude/decisions.md:22669-22672`; D626.1 dispositions/corrections are `:22680-22685`; D627 routing is `:22677-22678`. D625's one-producer ruling is `:22580-22583`.
- `detectCombatant` is the pairwise ladder (`src/combat/encounter.ts:2184-2247`), `canCombatantSee` wraps it (`:2248-2253`), and Perception maps dim/light obscurement to Disadvantage (`:4803-4820`). A copied ladder remains in `src/vtt/engine-query-port.ts:790-829,1882-1901`; actor knowledge calls the canonical detector but adds authored fog at `src/vtt/intel/actor-knowledge.ts:241-269`.
- The tracer uses boundary-safe corner crossing and `outerCorners` (`src/combat/cover.ts:48-98`), corner aggregation (`:337-375`), best footprint corner (`:414-472`), public wrappers (`:475-530`), and WeakMap/global-equivalence caches (`:200-226,420-433`). Today `blocksSight` forces Total Cover at `:343-349`; sight-only blockers therefore require a separate physical-cover boolean and cache signatures in both the base and combatant wrappers (`:420-433,494-525`).
- Cell range is nearest occupied-cell Chebyshev distance in 5-foot units via `minimumSpaceDistanceToCells` (`src/combat/creature-space.ts:514-518,532-578`). Environment light/obscurement are last-region-wins (`src/combat/world-objects.ts:230-255`).
- Fog Cloud is heavy obscurement (`src/combat/spells/definitions.ts:477-483`); Darkness is magical darkness (`:676-684`); Darkvision creates an effect targeting a willing creature (`:685-690`). Environment/effect area handling is at `src/combat/encounter.ts:5859-5890,8274-8382`.
- Senses are closed in `src/combat/statblock.ts:31-37`; `EffectPayload` contains darkvision (`src/combat/effects.ts:638-640`). `effectiveCombatRules` ignores **all** sense effects today (`src/combat/combat-rules.ts:29-42`), an existing bug this unit fixes. The operation schema has an exhaustive payload inventory (`src/content/content-pack-operation-schema.ts:109-114`) and separate imported form-sense schema (`:595-600`).
- SRD Truesight lists darkness, invisibility, illusions, transformations, and Ethereal sight, but not fog (`docs/srd/full/srd-5.2.1.txt:12216-12241`). Existing behavior correctly lets Truesight defeat magical darkness but not heavy fog (`encounter.ts:2236-2237`; `tests/unit/vtt/senses.test.ts:319-320`).
- Runtime/setup authored fog lives at `src/combat/encounter.ts:765,835,1316-1396`; projection and creature concealment read it at `src/combat/visibility.ts:518,558-592,727`. The current player observer set at `:564-587` excludes only adjudication-pending owners, not nonliving or Unconscious owners.
- The semantic tag is the typed literal `engine-semantic-board-v2` (`src/vtt/semantic-board-payload.ts:14`); truncation classes are at `:18-19`; the strict Zod schema is `src/vtt/mcp/schemas.ts:671-755`. The generated JSON's binding invariant compares parsed JSON to `z.toJSONSchema`, not bytes (`tests/unit/tools/engine-mcp-handler.test.ts:1095-1103`).
- D569 pins are `FOOTPRINTS_RAW_CONTEXT_SHA256`, `E1C_RAW_CONTEXT_SHA256`, and their historical sizes (`tests/unit/tools/ai-dm-board-delivery.test.ts:53-60,510-556,670-682`). Flag-arm identity is `:533-542`; state-reference-to-capsule binding is `:549-554`.
- The ordinary raw turn context serializes selected facts, not the encounter snapshot (`src/vtt/mcp/engine-server.ts:1968-2015`). `projectEngineEncounterState` explicitly constructs the capsule projection without `foggedCells` (`src/vtt/engine-state-capsule.ts:750-814`), and only that capsule body is hashed (`:924-938`); therefore field removal is expected to leave D569 raw bytes unchanged unless the implementation demonstrates otherwise.
- `tsconfig.app.json:18` includes `src`; `tsconfig.node.json:19-27` includes `tests` and `tools`. The exact lexical audit command `rg -l 'foggedCells' src tools tests --glob '*.ts' --glob '*.tsx' --glob '*.js' --glob '*.mjs' --glob '*.cjs' | sort` returns **36 compiled files**.

## 3 Contract

### 3.1 Types, service boundary, and one truth

Create `src/combat/visibility-field.ts`, rather than putting rules in audience-focused `src/combat/visibility.ts`:

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
export function eligibleVisibilityObserverIds(state: EncounterState, scope: { readonly kind: 'dm_party' } | { readonly kind: 'player_seat'; readonly ownedIds: ReadonlySet<CombatantId> }): readonly CombatantId[];
export function derivedFogCells(state: EncounterState, observerIds: readonly CombatantId[]): readonly GridCell[];
```

Lists are unique, row-major, frozen/read-only. All closed unions use exhaustive switches without defaults. An internal `evaluateCell(state, actual-or-virtual-observer, targetCell)` is the sole light/obscurement/range ladder. `visibilityField`, `sightToCreature`, and `cellsThatCanSee` only project/aggregate it. Detailed actual-observer fields are cached in `WeakMap<EncounterState,...>`; immutable new states cannot inherit old fields.

`cellsThatCanSee` means **geometric/light eligibility**, not creature detection: move a normal-sight, unblinded, single-cell virtual origin through each in-bounds cell and include origin `c` iff the shared evaluator grades any subject-footprint cell non-`unseen`. It uses the same geometrically symmetric corner tracer, with light evaluated directionally at the subject cells. It explicitly excludes Hidden/Invisible and other creature-concealment overlays. Semantic rows retain `observer_profile: 'normal_sight_unblinded_single_cell'`. An Invisible-subject test requires rows to remain while `detectCombatant` is `undetected/invisible`.

### 3.2 Shared cell ladder

1. Trace from the best occupied cell/corner of the observer's whole footprint using existing `outerCorners`; range to each crossed/target cell is `minimumSpaceDistanceToCells(observerSpace,[cell])`. Terrain sight blocking is absolute. Heavy material obscurement (environment or active Fog Cloud) blocks an intervening ray unless in-range blindsight defeats that cell. Magical darkness blocks unless in-range blindsight, Truesight, or Devil's Sight defeats that cell. **Default ordinary-darkness clause:** do not add ordinary `environmentLightAt(cell) === 'darkness'` cells to intervening blockers.
2. At the target cell: heavy material obscurement => unseen unless in-range blindsight (Truesight does not defeat fog); magical darkness => unseen unless in-range blindsight/Truesight/Devil's Sight; ordinary darkness => darkvision yields `seen_dim`, blindsight/Truesight/Devil's Sight yields `seen`, otherwise unseen; dim => normal sight yields `seen_dim`, in-range darkvision/blindsight/Truesight/Devil's Sight yields `seen`; bright => `seen`. Independent light obscurement leaves `seen_dim` unless blindsight defeats it; Truesight/Devil's Sight/darkvision do not remove fog or foliage.
3. Blinded removes normal sight, darkvision, Truesight, and Devil's Sight; in-range blindsight still sees. Tremorsense/web sense never grades cells, but the pairwise overlay may return `located` as today.
4. Every special sense applies only through its own inclusive `rangeFeet`. Normal sight has no artificial range cap.

The tracer accepts sorted `additionalSightBlockingCells`, but computes physical cover and optical LOS independently. Aggregate every source corner once; select the returned `sourceCorner`/`lines`/`tier`/cover sources with `comparePhysicalCornerTraces` (cover rank then corner order, never `blocksSight`). Independently set overall `blocksSight` only when **every** source-corner aggregate is optically blocked; use `compareOpticalCornerTraces` only to choose deterministic blocker evidence when all are blocked. Thus neither aggregation (`cover.ts:343-349`) nor source-corner selection (`:377-381,465-470`) lets fog alter physical cover. The added-set signature participates in the state trace key, equivalent-cache key, `traceCombatantLine`, and `traceCombatantLineToCells` keys. `EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE` compares omitted vs explicit-empty options against existing hand expectations for every cover tier, multi-cell footprints, and nonempty→empty→nonempty calls. `SIGHT_ONLY_BLOCKER_PRESERVES_COVER` additionally uses unequal-cover source corners where fog changes which optical corner remains clear while the independently selected physical corner/tier stays identical.

### 3.3 Pairwise agreement, observers, and fog

- `detectCombatant` retains tremorsense/web `located`, Hidden/Invisible, and Blinded ordering, but delegates all light/obscurement/field aggregation to `sightToCreature`; Truesight retains its Invisible handling. On overlay-free fixtures, for every ordered pair, `detect.kind === 'seen'` iff any subject footprint cell is `seen|seen_dim`. Engine query and actor knowledge call `detectCombatant`; no second ladder or fog veto remains.
- `eligibleVisibilityObserverIds` is reused verbatim by player non-owned-creature visibility (`visibility.ts:564-587`) and cell concealment. Eligibility requires a placed token, `life === 'living'`, no effective `Unconscious` condition, and no adjudication-pending placement; even an Unconscious blindsight holder is excluded. DM scope further requires `player_character`; seat scope requires ownership. A stable/dying/dead actor reveals no cells. A lone eligible PC contributes its own field. Zero eligible observers means every in-bounds cell is concealed.
- DM fog is the complement of the union of eligible DM-party fields. Player `concealedCells` is the complement of eligible owned fields. Creature visibility uses the same IDs but keeps owned-token display and Hidden redaction policy. Remove the redundant “entire footprint in authored fog” veto.
- Runtime/setup `foggedCells` is deleted. V1 accepts the old key only as optional validated migration input and discards it before returning `EncounterState`; two distinct valid lists decode to completely equal states with no key, while malformed/duplicate lists reject. Frozen input fixtures remain byte-identical.

### 3.4 Senses and Devil's Sight

Add `devils_sight` with `rangeFeet` to statblock/form/effect/query exhaustive unions. Effects whose `targets` **include the observer** contribute darkvision/Devil's Sight, regardless of source; merge each kind with an existing sense using maximum range. Expiry/removal immediately removes the grant in the next immutable state. A permanent always-on fixture PC uses existing feature initialization (`encounter.ts:1346-1377`). Warlock invocation-choice mapping is a named follow-up because no such selection plumbing exists; it will emit this same effect, not another rule.

### 3.5 Projection, transpose, semantic payload, and all compiled fog references

Keep `DmBoardProjection.foggedCells` and player `concealedCells` as derived outputs so the existing renderer/a11y layer continues unchanged. The semantic payload remains `engine-semantic-board-v2` and gains one **additive optional** strict block:

```ts
visibility?: {
  provenance: 'engine_fact';
  observers: EngineFactList<{ actor_id: string; seen: EngineCellFactList; seen_dim: EngineCellFactList }>;
  subjects: EngineFactList<{ actor_id: string; observer_profile: 'normal_sight_unblinded_single_cell'; visible_from: EngineCellFactList }>;
}
```

State-to-board projection calls the service once; serializers encode that projection and never recompute. Observer and subject rows cover every placed PC/NPC; actual observer rows separate `seen` and `seen_dim`, while subject rows use the declared virtual profile. `cells.fogged` and `obscured_or_fogged` use derived DM fog; obscurement lists include environment plus active effects. The block is omitted from player-safe output. Add `visibility` to the typed truncation classes and strict max; truncation may omit the whole block only while recording that class and preserving existing priority/cap behavior. No v3 tag and no v2-rejection mutant. Regenerate `docs/specs/engine-turn-context.schema.json` only after literal Zod acceptance/rejection tests pass.

The 36-file audit is assigned as follows (`E` = editable in that batch; `V` = compiled verification/retained projection or legacy-fixture contract, no source edit). This audit is exhaustive; the ≤10 cap below applies to allowed edit files:

| Batch | Every audited `foggedCells` file and disposition |
|---|---|
| B1 | E `src/combat/encounter.ts`; V `tests/unit/assets/board-glyphs.test.ts`, `tests/unit/assets/encounter-board-art.test.ts` (projection inputs stay). |
| B2 | E `src/vtt/intel/actor-knowledge.ts`, `tests/unit/vtt/actor-knowledge.test.ts`, `src/vtt/encounter-state-codec.ts`, `src/vtt/semantic-board-payload.ts`; V `tests/unit/vtt/projection-types.test.ts`. |
| B3 | E `src/combat/visibility.ts`, `src/vtt/encounter-board.ts`, `tests/unit/combat/visibility.test.ts`, `tests/unit/bridge/decision-program.test.ts`, `tests/unit/tools/ai-dm-screenshot-probe.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`, `tests/unit/vtt/regret.test.ts`; V `src/vtt/accessible-board.ts`, `src/vtt/encounter-app.ts`, `tests/unit/vtt/accessible-board.test.ts`. |
| B4 | E `src/vtt/d365-sample-dungeon.ts`, `src/vtt/generated-encounter-fixtures.ts`, `src/vtt/handoff/fixtures/two-room.ts`, `src/vtt/reference-encounter.ts`, `src/vtt/stored-character-encounter.ts`, `src/vtt/vane-warren.ts`, `tests/unit/vtt/generated-encounter-fixtures.test.ts`, `tests/unit/vtt/vane-warren.test.ts`, `tools/vtt-soak.ts`. |
| B5 | E `tools/vtt-experiment.ts`, `tests/unit/vtt/experiment-orchestrator.test.ts`, `tools/ai-dm-screenshot-probe.ts`, `tools/ai-dm-blind-board-snapshot-check.ts`, `tests/unit/vtt/semantic-board-payload.test.ts`, `tests/unit/vtt/blind-context-source-binding.test.ts`; V `tests/fixtures/vtt/creature-space-migration-fixtures.ts`, `tests/fixtures/vtt/pre-last-seen-v11-save.ts`, `tools/assets/generate-starter-art.ts` (legacy/projection literals stay). Q9 receives compile-only cleanup, no oracle work. |
| B6 | E `src/vtt/semantic-board-payload.ts`, `tests/unit/vtt/semantic-board-payload.test.ts`, `tests/unit/vtt/blind-context-source-binding.test.ts`. |

## 4 Batches (≤10 allowed files; execution order 1 → 3 → 4 → 5 → rebase → 2 → 6)

Every batch begins by adding/running its named RED tests and recording the intended failures. Each mutant below is applied alone, proved present, required to fail its named killer, and restored byte-for-byte. Both TypeScript commands run after each completed batch.

### Batch 1 — evaluator, tracer, and active senses (10 files; proceed now)

Allowed: `src/combat/visibility-field.ts` (new), `src/combat/cover.ts`, `src/combat/statblock.ts`, `src/combat/effects.ts`, `src/combat/combat-rules.ts`, `src/combat/encounter.ts`, `src/combat/world-objects.ts`, `src/content/content-pack-operation-schema.ts`, `tests/unit/combat/visibility-field.test.ts` (new), `tests/unit/vtt/senses.test.ts`.

Required tests: hand-authored small-grid sets for wall, dim, light obscurement, `LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE`, `UNLIT_TARGET_WITHOUT_SENSE_IS_UNSEEN`, intervening Fog Cloud, magical Darkness sense matrix, `HEAVY_FOG_BLOCKS_TRUESIGHT` (target and intervening cases), darkvision 60/65-foot edge, Devil's Sight exactly 120/125 feet, Large best footprint, Blinded, blindsight, `BLINDED_TREMORSENSE_REMAINS_LOCATED`, any-footprint-cell aggregation, Invisible transpose-vs-detection, Perception grade, every-pair agreement, touched-ally Darkvision, effect expiry/removal, maximum-range merge, `SIGHT_TRACER_HAS_SINGLE_OWNER`, and the full `EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE`. `CACHE_IS_STATE_SCOPED_AFTER_MOVEMENT`, `...LIGHT_CHANGE`, `...OBSCUREMENT_END`, and `...SENSE_EFFECT_REMOVAL` create new reducer states and assert changed new fields plus unchanged prior-state fields.

Concrete mutants:

- `RANGE_IGNORED` — `visibility-field.ts::senseInRange`, `distance <= rangeFeet` → `true`; killed by `SPECIAL_SENSE_RANGE_EDGES`.
- `INTERVENING_OBSCUREMENT_IGNORED` — `visibility-field.ts::opaqueCellsForObserver`, collected heavy/magical set → empty set; killed by `FOG_CLOUD_BLOCKS_BEYOND_TARGET`.
- `DEVILS_SIGHT_IGNORED` — `visibility-field.ts::evaluateCell`, magical-darkness defeat includes Devil's Sight → excludes it; killed by `MAGICAL_DARKNESS_SENSE_MATRIX`.
- `DIM_TREATED_AS_DARK` — `visibility-field.ts::evaluateCell`, target dim/normal result `seen_dim` → `unseen`; killed by `DIM_LIGHT_RAW_GRADES`.
- `ORDINARY_DARKNESS_MADE_INTERVENING` — `visibility-field.ts::opaqueCellsForObserver`, exclude ordinary darkness → include it; killed by `LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_VISIBLE`.
- `TRUESIGHT_DEFEATS_FOG` — `visibility-field.ts::evaluateCell`, heavy-material defeat `blindsight` → `blindsight || truesight`; killed by `HEAVY_FOG_BLOCKS_TRUESIGHT`.
- `BLINDED_PHYSICAL_SIGHT_ALLOWED` — `visibility-field.ts::evaluateCell`, apply Blinded physical-sight guard → skip it; killed by `BLINDED_FIELD_IS_UNSEEN`.
- `BLINDSIGHT_IGNORED` — `visibility-field.ts::evaluateCell`, heavy-material defeat includes in-range blindsight → always false; killed by `BLINDSIGHT_SEES_THROUGH_HEAVY_FOG_IN_RANGE`.
- `BEST_FOOTPRINT_CORNER_IGNORED` — `src/combat/cover.ts::traceCombatantLineToCells`, source `space.cells` → `[space.cells[0]]`; killed by `LARGE_OBSERVER_USES_BEST_CELL`.
- `SIGHT_BLOCKER_BECOMES_TOTAL_COVER` — `cover.ts::aggregateCornerLines`, tier uses `physicalBlocksCover` → combined `blocksSight`; killed by `SIGHT_ONLY_BLOCKER_PRESERVES_COVER`.
- `OPTICAL_BLOCKER_CHANGES_COVER_CORNER` — `cover.ts::traceSpaces`, physical selection uses `comparePhysicalCornerTraces` → `compareOpticalCornerTraces`; killed by that test's unequal-cover/fog-flipped-corner case.
- `SIGHT_BLOCKER_CACHE_KEY_OMITTED` — `cover.ts::traceSpaces/traceCombatantLine/traceCombatantLineToCells`, keys include blocker signature → omit it; killed by `EMPTY_SIGHT_BLOCKERS_PRESERVE_FULL_TRACE`'s nonempty→empty→nonempty sequence.
- `SENSE_EFFECT_REQUIRES_SELF_SOURCE` — `src/combat/combat-rules.ts::effectiveCombatRules`, filter `targets.includes(observer)` → `source === observer`; killed by `ALLY_CAST_DARKVISION_APPLIES`.
- `SENSE_MERGE_TAKES_FIRST` — same function, `Math.max(existing,effect)` → `existing`; killed by `SENSE_EFFECT_MAX_RANGE_WINS`.
- `FIELD_DETECT_DIVERGES` — `src/combat/encounter.ts::detectCombatant`, delegate to `sightToCreature` → legacy target-light branch; killed by `DETECT_FIELD_ALL_PAIRS_AGREE`.

T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: `tests/unit/combat/visibility-field.test.ts`, `tests/unit/vtt/senses.test.ts`, `tests/unit/combat/terrain.test.ts`, `tests/unit/combat/creature-cover.test.ts`.

Boundary soundness: B1 removes no `foggedCells` declaration/consumer; it replaces only pairwise sight internals and updates the exhaustive effect/form inventories, so the still-complete legacy shape keeps both T projects green.

### Batch 2 — post-offers consolidation and final runtime-field removal (10 files; delayed)

Allowed: `src/combat/encounter.ts`, `src/combat/visibility.ts`, `src/vtt/encounter-state-codec.ts`, `src/vtt/semantic-board-payload.ts`, `src/vtt/engine-query-port.ts`, `src/vtt/intel/actor-knowledge.ts`, `src/content/content-pack.ts`, `tests/unit/vtt/engine-query-port.test.ts`, `tests/unit/vtt/actor-knowledge.test.ts`, `tests/unit/vtt/content-pack.test.ts`.

Required tests: engine query equals canonical detect including `located`; a static import-boundary assertion permits no local query-port detection ladder; actor knowledge has no fog veto; imported Devil's Sight validates; `EncounterState`/setup/classification omit fog; V1 validates/discards two distinct lists to equal complete states and rejects malformed/duplicates; fresh round trips omit the key. This batch atomically removes the inert field only after B3-B5 removed all other compiled consumers.

Concrete mutants: `ENGINE_QUERY_OLD_LADDER` — `src/vtt/engine-query-port.ts::engineQueryPort.visibility`, `detectCombatant(...)` → reintroduced local `detect(...)`; killed by `ENGINE_QUERY_IMPORTS_ONLY_CANONICAL_DETECTOR` plus behavior matrix. `ACTOR_KNOWLEDGE_FOG_OVERRIDE` — `src/vtt/intel/actor-knowledge.ts::projectActorKnowledge`, retain canonical detection → skip footprints in derived fog; killed by `ACTOR_KNOWLEDGE_HAS_NO_FOG_VETO`. `DEVILS_SIGHT_SCHEMA_OMITTED` — `src/content/content-pack.ts::loadContentPack`, sense enum includes → omits `devils_sight`; killed by `IMPORTED_DEVILS_SIGHT_ACCEPTED`. `V1_FOG_INFLUENCES_RUNTIME` — `src/vtt/encounter-state-codec.ts::decodeEncounterStateV1`, destructure/discard legacy fog → spread it into returned state; killed by `DISTINCT_LEGACY_FOG_DECODES_IDENTICALLY`. `V1_FOG_NOT_VALIDATED` — same function, call legacy-cell validator → ignore raw value; killed by `MALFORMED_LEGACY_FOG_REJECTED`.

T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: the three allowed test files, `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/session-persistence.test.ts`, `tests/unit/vtt/replay.test.ts`, `tests/unit/vtt/detection-reactions.test.ts`.

Boundary soundness: after B3-B5 cleanup, B2 stops the final state consumers in `encounter.ts`, `visibility.ts`'s classification/type surface, `encounter-state-codec.ts`, `semantic-board-payload.ts`, and `actor-knowledge.ts`, then deletes the declaration/setup field in the same batch. All other lexical references are retained projection properties or untyped legacy bytes; both T projects compile before B6.

### Batch 3 — derived projections and eligible observer reuse (9 files; proceed now)

Allowed: `src/combat/visibility-field.ts`, `src/combat/visibility.ts`, `src/vtt/encounter-board.ts`, `tests/unit/combat/visibility.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`, `tests/unit/vtt/scene-snapshot.test.ts`, `tests/unit/vtt/regret.test.ts`, `tests/unit/bridge/decision-program.test.ts`, `tests/unit/tools/ai-dm-screenshot-probe.test.ts`.

Required tests: `UNCONSCIOUS_BLINDSIGHT_REVEALS_NOTHING`; `STABLE_PC_REVEALS_NOTHING` (also dying/dead); `LONE_PC_REVEALS_OWN_FIELD`; `ZERO_ELIGIBLE_CONCEALS_ALL`; `PENDING_ADJUDICATION_OBSERVER_REVEALS_NOTHING`; `ABSENT_TOKEN_OBSERVER_REVEALS_NOTHING_AND_DOES_NOT_THROW` (guards the throwing `combatantSpace` lookup at `combat-rules.ts:83-86`); seat union uses owned IDs; non-owned creature visibility uses the identical eligible ID list; Hidden stays separate. Assert actual set equality, not the existing subset check, between DM board fog and DM view fog; `src/vtt/encounter-app.ts:2199-2205` stays unedited. Q9 test changes are compile-only and its suite is not an acceptance gate.

Concrete mutants: `FOG_STILL_AUTHORED` — `src/combat/visibility.ts::projectDmView`, `derivedFogCells(state,ids)` → `(state as LegacyState).foggedCells`; killed by `AUTHORED_FOG_CANNOT_CHANGE_PROJECTION`. `UNCONSCIOUS_OBSERVER_INCLUDED` — `src/combat/visibility-field.ts::eligibleVisibilityObserverIds`, `!conditions.includes('Unconscious')` → `true`; killed by `UNCONSCIOUS_BLINDSIGHT_REVEALS_NOTHING`. `NONLIVING_OBSERVER_INCLUDED` — same function, `life === 'living'` → `life !== 'dead'`; killed by `STABLE_PC_REVEALS_NOTHING`. `OWNED_SET_IGNORED` — same function's seat arm, `ownedIds` → all party IDs; killed by `SEAT_USES_ONLY_OWNED_FIELDS`. `ZERO_ELIGIBLE_REVEALS` — `visibility-field.ts::derivedFogCells`, complement of empty union → empty fog; killed by `ZERO_ELIGIBLE_CONCEALS_ALL`. `BOARD_VIEW_FOG_DIVERGES` — `src/vtt/encounter-board.ts::projectEncounterBoard`, eligible party IDs → empty IDs; killed by `DM_BOARD_FOG_EQUALS_DM_VIEW_FOG`.

T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: all allowed non-Q9 tests plus `tests/unit/vtt/accessible-board.test.ts`, `tests/unit/vtt/actor-knowledge.test.ts`.

Boundary soundness: B3 stops state-fog consumption in `src/combat/visibility.ts`, `src/vtt/encounter-board.ts`, `tests/unit/combat/visibility.test.ts`, `tests/unit/bridge/decision-program.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`, and `tests/unit/vtt/regret.test.ts`; the declaration remains through B5, so later tools still compile.

### Batch 4 — remove authored encounter lists (10 files; proceed now)

Allowed: `src/vtt/reference-encounter.ts`, `src/vtt/stored-character-encounter.ts`, `src/vtt/vane-warren.ts`, `src/vtt/d365-sample-dungeon.ts`, `src/vtt/handoff/fixtures/two-room.ts`, `src/vtt/generated-encounter-fixtures.ts`, `src/vtt/test-approved-first-skirmish.ts`, `tools/vtt-soak.ts`, `tests/unit/vtt/generated-encounter-fixtures.test.ts`, `tests/unit/vtt/vane-warren.test.ts`.

Required tests: no setup producer supplies fog; generated package retains three fog art IDs but has no `layout.fog.cells`. Hand oracles: reference 10×7 has 70 cells, three normal-sight PCs see 69, and only dark target `(4,3)` is unseen, so fog is exactly `[(4,3)]`; Vane Warren 14×10 has 140 cells, four dim plus four lightly obscured cells remain visible, and its two separated blockers do not screen any cell from all five PCs, so fog is exactly `[]` (`140-140=0`). Expectations are literal.

Concrete controls/mutants: `GENERATED_FOG_CELLS_RETAINED` is a **compile-time negative control** — `src/vtt/generated-encounter-fixtures.ts::encounterStateFromApprovedFixture`, omit obsolete typed `layout.fog.cells` → copy it; the required failure is T-app, while `GENERATED_PACKAGE_HAS_NO_AUTHORED_FOG_CELLS` independently pins the runtime contract. `REFERENCE_DARK_CELL_REVEALED` — `src/vtt/reference-encounter.ts::referenceEncounterSetup`, retain dark region `[(4,3)]` → `[]`; killed by `REFERENCE_DERIVED_FOG_HAND_ORACLE`. `VANE_DIM_TREATED_UNSEEN` — `src/vtt/vane-warren.ts::environment`, dim region level `dim` → `darkness`; killed by `VANE_DERIVED_FOG_HAND_ORACLE`.

T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: `tests/unit/vtt/generated-encounter-fixtures.test.ts`, `tests/unit/vtt/vane-warren.test.ts`, `tests/unit/combat/visibility-field.test.ts`, `tests/unit/vtt/encounter-projections.test.ts`.

Boundary soundness: B4 stops authored input consumption in reference, stored, Vane, d365, two-room, generated-fixture, generated/vane tests, and `tools/vtt-soak.ts`; `EncounterSetup.foggedCells?` still exists temporarily, so omission is compile-safe.

### Batch 5 — compiled caller cleanup before field deletion (7 files; proceed now)

Allowed: `tools/vtt-experiment.ts`, `tests/unit/vtt/experiment-orchestrator.test.ts`, `tools/ai-dm-screenshot-probe.ts`, `tools/ai-dm-blind-board-snapshot-check.ts`, `tests/unit/vtt/challenge-room-fixtures.test.ts`, `tests/unit/vtt/semantic-board-payload.test.ts`, `tests/unit/vtt/blind-context-source-binding.test.ts`.

Required tests: experiment reconstruction no longer expects/copies authored fog; blind-board check compares image fog to `projectEncounterBoard(projectDmView(state)).foggedCells`; challenge fixtures use derived output. Remove only the legacy `createEncounter` property at `semantic-board-payload.test.ts:55-60` and typed state property at `blind-context-source-binding.test.ts:679-686`; defer all semantic assertions to B6. Q9 probe receives only the minimum compile cleanup (delete its synthetic state-fog mutation); do not revise/run Q9 judgments.

Concrete mutants: `EXPERIMENT_REINTRODUCES_AUTHORED_FOG` — `tools/vtt-experiment.ts::generateE05Encounter`, omit fog → copy `source.foggedCells`; killed by `EXPERIMENT_RECONSTRUCTION_HAS_NO_FOG_INPUT`. `BLIND_CHECK_READS_STATE_FOG` — `tools/ai-dm-blind-board-snapshot-check.ts::inspectBlindBoardSnapshotFamily`, projected derived length → `state.foggedCells.length`; killed by `BLIND_BOARD_CHECK_USES_DM_PROJECTION` (static import/type boundary).

T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`. Suites: `tests/unit/vtt/experiment-orchestrator.test.ts`, `tests/unit/vtt/challenge-room-fixtures.test.ts`; Q9 excluded.

Boundary soundness: B5 stops consumption in `tools/vtt-experiment.ts`, `tests/unit/vtt/experiment-orchestrator.test.ts`, `tools/ai-dm-screenshot-probe.ts`, `tools/ai-dm-blind-board-snapshot-check.ts`, `tests/unit/vtt/semantic-board-payload.test.ts`, and `tests/unit/vtt/blind-context-source-binding.test.ts`. This closes every typed consumer that would otherwise become an excess-property/missing-property error in B2; both T projects remain green before the rebase.

### Batch 6 — optional semantic v2 block, truncation, and pins (10 files; delayed)

Allowed: `src/vtt/semantic-board-payload.ts`, `src/vtt/mcp/schemas.ts`, `src/vtt/mcp/engine-server.ts`, `src/vtt/blind-turn-context.ts`, `docs/specs/engine-turn-context.schema.json`, `tests/unit/vtt/semantic-board-payload.test.ts`, `tests/unit/vtt/blind-turn-context.test.ts`, `tests/unit/vtt/blind-context-source-binding.test.ts`, `tests/unit/tools/engine-mcp-handler.test.ts`, `tests/unit/tools/ai-dm-board-delivery.test.ts`.

Required tests: literal v2 payload with optional visibility accepts; malformed grade/profile/provenance/unknown keys reject; absent block remains valid; player output omits it; truncation ordering/class/cap is explicit; effect obscurement enters unions. A serializer seam accepts independently chosen **valid in-bounds** observer/`visible_from` sentinel cells that contradict the fixture geometry and must emit those exact cells. This proves encoding rather than recomputation at the serializer; it does not alone prove absence of a duplicated internal ladder. `DETECT_FIELD_ALL_PAIRS_AGREE` plus `SIGHT_TRACER_HAS_SINGLE_OWNER` (static import boundary: visibility/detection/query/semantic modules may reach sight tracing only through `visibility-field.ts`; physical-cover callers remain allowed) enforce that architectural rule. Invisible subject keeps `visible_from` while detection is undetected. Regenerated JSON must satisfy parsed equality and independent literal acceptance/rejection.

Concrete mutants: `SEMANTIC_VISIBILITY_RECOMPUTED` — `src/vtt/semantic-board-payload.ts::semanticBoardPayload`, encode projection rows → call `visibilityField`; killed by `SERIALIZER_PRESERVES_VISIBILITY_SENTINELS`. `VISIBLE_FROM_USES_SECOND_LADDER` — same function, encode projected subject rows → locally trace rows; killed by the distinct subject sentinel plus `SEMANTIC_IMPORTS_SHARED_VISIBILITY_SERVICE_ONLY`. `EFFECT_OBSCUREMENT_OMITTED` — `semantic-board-payload.ts::projectEngineSemanticBoard`, union environment+effects → environment only; killed by `SEMANTIC_EFFECT_OBSCUREMENT_UNION`. `VISIBILITY_TRUNCATION_UNAUDITED` — `src/vtt/mcp/engine-server.ts::engine.get_turn_context.execute`, delete-and-record `visibility` → silently delete; killed by `VISIBILITY_TRUNCATION_IS_RECORDED`. `SOURCE_BINDING_VISIBILITY_UNMAPPED` — `tests/unit/vtt/blind-context-source-binding.test.ts::expectedContext`, classify visibility paths → omit them; killed by `VISIBILITY_LEAVES_REQUIRE_ENGINE_PROVENANCE`. `STRICT_VISIBILITY_SCHEMA_LOOSENED` — `src/vtt/mcp/schemas.ts::semanticBoard`, visibility objects `.strict()` → passthrough; killed by `VISIBILITY_UNKNOWN_KEYS_REJECT`.

T: `npx tsc -p tsconfig.app.json --noEmit`; `npx tsc -p tsconfig.node.json --noEmit`; final `npx tsc -b --force`. Suites: all five allowed test files plus `tests/unit/tools/engine-mcp-server.test.ts`, `tests/unit/tools/engine-mcp-boundary.test.ts` (entrypoint), `tests/unit/tools/ai-dm-conversation.test.ts`, `tests/unit/vtt/stable-dom-render.test.ts` (encounter app), `tests/unit/vtt/accessible-board.test.ts`, and the final aggregate of every suite named in B1-B6. Do not run browsers or touch port 4173.

Boundary soundness: B6 reopens only the two B5-cleaned tests for semantic assertions and adds no runtime `foggedCells` use. Its schemas/consumers operate on retained derived projection fields, so both T projects and the final forced build are sound.

Unique editable file manifest total: **50 files** (2 new, 48 existing); repeated files count once. The **nine** audit-only compiled references are `src/vtt/accessible-board.ts`, `src/vtt/encounter-app.ts`, `tests/unit/vtt/accessible-board.test.ts`, `tests/unit/assets/board-glyphs.test.ts`, `tests/unit/assets/encounter-board-art.test.ts`, `tools/assets/generate-starter-art.ts`, `tests/fixtures/vtt/creature-space-migration-fixtures.ts`, `tests/fixtures/vtt/pre-last-seen-v11-save.ts`, and `tests/unit/vtt/projection-types.test.ts`. No fixture JSON, art, package/lock/config file, model artifact, or git metadata is editable.

## 5 Pins and invariants touched

- D569 demonstration protocol for `E1C_RAW_CONTEXT_SHA256` / 31,995 (`ai-dm-board-delivery.test.ts:555-556`) and `FOOTPRINTS_RAW_CONTEXT_SHA256` / 32,000 (`:670-682`): first run the **unchanged existing checks** before any normalization change; the expected outcome is no change because ordinary context serializes selected facts (`engine-server.ts:1968-2015`) and capsule projection omits fog (`engine-state-capsule.ts:750-814`). Preserve FOOTPRINTS' already-authorized historical policy/handle normalization exactly as it exists.
- Only if the unchanged E1C/FOOTPRINTS check demonstrates that the sole differing parsed value is `state_ref.state_handle`, and the live binding still proves `state_handle === engine-state:<capsule digest>`, authorize an insertion-order `JSON.parse`/field assignment/`JSON.stringify` normalization of **that exact field only** to its historical value. Re-run the historical size/hash and flag-arm checks. Any byte-length change, any second differing field, or any actor/action/content mismatch is a hard stop; add no broader normalizer and record no fresh size/hash. Negative controls mutate unrelated actor and action facts after normalization and must fail the historical hash.
- Where semantic-enabled behavior genuinely changes, do **not** normalize: assert independently hand-written actor IDs, grades, cells, reverse rows, provenance, and absence from player output, with wrong-cell/wrong-actor/extra-player-field negative controls. This is the D516/ledger replacement rule: a changed pin gets an independent invariant, never an expectation regenerated from the run.
- Scene snapshot pins (`tests/unit/vtt/scene-snapshot.test.ts:206-243`) are not repinned; retain before/after observational identity, journal checksum/pending-request identity, and negative mutation controls.
- `engine-turn-context.schema.json:5205` remains v2 and is regenerated. Its pin is parsed equality to Zod (`engine-mcp-handler.test.ts:1095-1103`), backed by independent literal optional-block acceptance and malformed/unknown-key rejection.
- Blind source-binding paths gain visibility provenance witnesses and actor/grade/cell mutations. Frozen V1 input hashes (`room-roster-preflight.test.ts:103-120,191-196`) and all 84 legacy fixture files remain byte-identical; only real-decoder equality proves fog is discarded.
- D616/D624 Q9/image pins and art stay untouched. Projection-level board glyph/art tests retain their authored fog arrays because their subject is the existing renderer input, not encounter state.

## 6 Assumptions re-verified locally and how

- Read Astra r2 review end-to-end (216 lines, duplicated review body) and retained main D626.1/D627. Every r2 finding is incorporated; ordinary intervening darkness remains the only owner question.
- Re-read detection, player `availableObservers`, the throwing absent-token footprint lookup (`combat-rules.ts:83-86`), Truesight/fog, cover aggregation/comparator/selection/caches, effect target/range plumbing, operation payload inventory/form schema, semantic tag/schema/truncation, D569 pins, ordinary selected-fact context (`engine-server.ts:1968-2015`), capsule projection/hash (`engine-state-capsule.ts:750-814,924-938`), and generated-schema equality.
- Re-ran the exact compiled `foggedCells` audit in §2: 36 files and 36/36 remain assigned in §3.5. Exactly nine are audit-only (listed after B6); the six justified additions over r1 are operation schema, soak, experiment, experiment test, screenshot compile cleanup, and blind-board check.
- Re-read both tsconfigs and every typed occurrence at each execution boundary. Counts are **10,10,9,10,7,10**; B5 now removes the two semantic-test excess properties before delayed B2 deletes the field. The per-batch boundary statements enumerate which consumers stop, and the nine retained `V` references use derived projection types or untyped historical bytes.
- Re-read SRD `:656-691`, darkvision `:11582-11588`, Truesight `:12216-12241`, and Devil's Sight `:4354-4358` directly. No memory/model rule assertion was used.
- Reconfirmed reference and Vane sources/ray facts cited in Astra: literal oracles remain `[(4,3)]` and `[]`. Reconfirmed 84 legacy fixture mentions and the V1 validate path; no frozen input rewrite is planned.
- No sibling worktree or forbidden run directory was read; no source/test/git write, test, install, model, reviewer, agent, skill, browser, or port 4173 action was used. Only this plan file was edited.

## 7 Open questions for the owner

Ordinary intervening darkness only: default is target-cell-only, so a lit target across clear unlit cells remains visible and an unlit target remains unseen without a defeating sense. If the owner chooses literal intervening opacity, change §3.2 step 1 to add ordinary-dark cells to blockers (defeated per-cell by in-range darkvision, blindsight, Truesight, or Devil's Sight), replace default mutant `ORDINARY_DARKNESS_MADE_INTERVENING`—which would become correct behavior—with `ORDINARY_DARKNESS_NOT_INTERVENING` (`visibility-field.ts::opaqueCellsForObserver`, include ordinary darkness → exclude it), and replace its killer with `LIT_TARGET_ACROSS_ORDINARY_DARKNESS_IS_UNSEEN`. Re-run **all** field, transpose, pairwise-agreement, reference, Vane, projection, and semantic oracles. The r2 claim that this requires only one clause and one test is withdrawn.

## 8 Landing dependencies

Landing order is **offers → VIS-FIELD-01 → ACTOR-KNOWLEDGE-01**. Batches 1, 3, 4, and 5 may proceed now on `claude/vis-field`; they leave the obsolete runtime field inert but compilable. Name the checkpoint **VIS-FIELD-OFFERS-REBASE**: after the offers tranche lands on main, rebase this branch, then and only then execute B2 and B6.

At the checkpoint re-verify by symbols and rerun REDs for `engine-query-port.ts:790-829,1882-1901`, `actor-knowledge.ts:261-269`, `engine-server.ts:2794-2835`, `mcp/schemas.ts`, and D569 tests. Run the current historical D569 assertions unchanged first; expect no change, permit only the demonstrated state-handle-only fallback in §5, and stop on any other mismatch. Re-enumerate compiled `foggedCells`, recheck all batch counts/manifest, run both T commands, and resolve offers conflicts without restoring a second producer. `src/vtt/encounter-app.ts`, `src/vtt/mcp/entrypoint.ts`, and `tools/ai-dm-conversation.ts` sources remain unedited, but their suites run; the new projection test, not the app's subset check, proves exact DM-board/DM-view fog equality. After B6 and the final aggregate/forced build pass, VIS-FIELD lands before ACTOR-KNOWLEDGE rebases onto and consumes it.
