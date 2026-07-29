/**
 * THE GUIDED BUILDER SEAM.
 *
 * SUPERVISOR-OWNED. Neither the production agent nor the test agent may edit
 * this file. It exists because they work in parallel and NEITHER owns the seam:
 * every name, shape and discriminator they must agree on lives here, so that
 * agreement is a fact rather than a coincidence.
 *
 * Pinned by `docs/design/2026-07-28-guided-builder-front-door.md` §8, after
 * three review rounds. Where a decision here looks arbitrary it usually is not
 * — the plan records why.
 */

import { isEnumValue, skills } from '../domain/enums';
import type {
  Ability,
  ArmorSlot,
  BackgroundEquipmentOption,
  ClassEquipmentOption,
  Skill,
  SkillGrantState,
} from '../domain/enums';
// From the EXTRACT-FREE module, never `origins-srd` (which imports the SRD
// text via Vite's `?raw`): the seam is loaded by node-side test processes
// through the command layer, and a `?raw` in its closure breaks their
// transpilers — Playwright's whole suite failed collection on exactly this.
import { BUNDLED_ORIGIN_RULES_EDITION } from '../rules/origin-rules-edition';

/* ------------------------------------------------------------------ steps */

/**
 * The level-one build steps, in D55's order.
 *
 * D48 originally put abilities after background. D55 moved them to sit directly
 * behind class: once Roll in Order was dropped, a player allocating scores
 * deliberately needs to know the class first, because that is what tells them
 * where the numbers go.
 *
 * `skills` is here because D54 names level-one skills explicitly and an earlier
 * revision of the contract omitted it — which would have stepped permanently
 * over a required choice while looking complete.
 */
export type BuildStep =
  | 'class'
  | 'abilities'
  | 'species'
  | 'background'
  | 'skills'
  | 'equipment';

export const GUIDED_LEVEL_ONE_STEP_ORDER: readonly BuildStep[] = Object.freeze([
  'class',
  'abilities',
  'species',
  'background',
  'skills',
  'equipment',
]);

/* ------------------------------------------------------------- catalogues */

/**
 * `hit_die` IS NULLABLE, AND THAT IS DELIBERATE.
 *
 * It does not live on `class_definitions` or on any progression table — it is
 * in `class_sheet_traits`, seeded separately, and the row can be absent. The
 * sheet substitutes `ASSUMED_HIT_DIE` in that case, but the wizard must NOT:
 * per D33 a null renders as "unknown". Presenting a guessed 8 at the moment
 * someone is choosing a class would be a guess wearing a fact's clothes.
 */
export interface GuidedClassOption {
  readonly content_key: string;
  readonly name: string;
  readonly hit_die: number | null;
}

export interface GuidedOriginOption {
  readonly content_key: string;
  readonly name: string;
  readonly grants_lineage_spells: boolean;
}

/**
 * The bundled species whose lineage grants spells.
 *
 * A LITERAL SET, NOT AN INFERENCE. No template table records this: the spell
 * markers were deliberately retired from the trait effects (see
 * `src/rules/origins-srd.ts`, the `effectKinds` discussion), and the only
 * remaining evidence would be trait-name text. Sniffing that text would let the
 * production agent and the test agent each invent their own list and disagree
 * — on the exact D33 disclosure the plan legislates.
 *
 * These are the three whose markers were retired: "Elven Lineage", "Gnomish
 * Lineage" and "Otherworldly Presence".
 *
 * This set is reviewed by eye, once. The `A4-LINEAGE` control proves the
 * disclosure RENDERS; it does not prove this classification is correct, and the
 * plan says so rather than pretending otherwise.
 */
export const LINEAGE_SPELL_SPECIES_CONTENT_KEYS: ReadonlySet<string> =
  Object.freeze(
    new Set([
      `${BUNDLED_ORIGIN_RULES_EDITION}:species:elf`,
      `${BUNDLED_ORIGIN_RULES_EDITION}:species:gnome`,
      `${BUNDLED_ORIGIN_RULES_EDITION}:species:tiefling`,
    ]),
  ) as ReadonlySet<string>;

export function grantsLineageSpells(contentKey: string): boolean {
  return LINEAGE_SPELL_SPECIES_CONTENT_KEYS.has(contentKey);
}

/* ----------------------------------------------------------------- params */

export type OriginKind = 'species' | 'background';

/**
 * PARAMS CARRY THE CONTENT KEY, NOT A CLASS ID.
 *
 * The bundled gate is key membership. Routing an id through the catalogue to
 * recover its key would re-open the hole this gate exists to close: the
 * ordinary catalogue query is `SELECT * FROM class_definitions` with no
 * predicate, and `class_definitions` has no provenance column at all, so a
 * class id alone cannot tell bundled from homebrew.
 *
 * There is no `operation_uuid`. Guided creation is NOT idempotent — see the
 * note on `GuidedCreateResult`.
 */
export interface GuidedCreateParams {
  readonly name: string;
  readonly class_content_key: string;
}

export interface GuidedOriginParams {
  readonly character_id: number;
  readonly kind: OriginKind;
  readonly content_key: string;
}

export interface GuidedBuildStateParams {
  readonly character_id: number;
}

export interface GuidedOriginOptionsParams {
  readonly kind: OriginKind;
}

/* ---------------------------------------------------------------- results */

/**
 * NOT-FOUND IS A SUCCESSFUL RESULT, NOT AN RPC ERROR.
 *
 * The existing character-read path throws `CharacterNotFoundError`, which the
 * registry degrades to a bare `handler_error` carrying no structured reason —
 * nothing a test can discriminate on. A discriminated result keeps the two
 * agents from asserting different things about the same absence.
 */
/**
 * The result of applying an origin.
 *
 * §8 described this in prose — "the updated `{ character_id, current_step }`" —
 * and pinned no type, which the A4 implementer flagged. Ratified here so the
 * test author reads the same shape rather than a second plausible one.
 */
export interface GuidedApplyOriginResult {
  readonly character_id: number;
  readonly current_step: BuildStep;
}

export type GuidedBuildStateResult =
  | {
      readonly kind: 'ready';
      readonly character_id: number;
      readonly current_step: BuildStep;
    }
  | { readonly kind: 'not_found' };

/* ----------------------------------------------------------------- errors */

/**
 * `RpcErrorCode` is a CLOSED six-member union with no domain code, so a domain
 * refusal cannot have its own code. It rides `handler_error` with structured
 * `data`, following the `RevisionConflict` precedent already in the worker.
 *
 * `invalid_name` is NOT here. Name validation happens in parameter validation,
 * and the registry turns a validator failure into `invalid_params` before the
 * handler ever runs — so a handler-level `invalid_name` could never be reached.
 * An earlier revision pinned one anyway; a reviewer caught it.
 */
export type GuidedRefusalReason =
  | 'class_not_bundled'
  | 'unknown_class'
  | 'unknown_origin'
  | 'origin_already_applied';

export interface GuidedRefusalData {
  readonly reason: GuidedRefusalReason;
}

/* -------------------------------------------------------------- validation */

/** Matches the existing create path's limit, so the two cannot drift apart. */
export const CHARACTER_NAME_MAX_CODE_POINTS = 120;

export function isValidCharacterName(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.trim().length > 0 &&
    [...value].length <= CHARACTER_NAME_MAX_CODE_POINTS
  );
}

/**
 * Lives HERE rather than being imported from the handlers, because the
 * equivalent guard there is module-private. "Reuse" that requires editing a
 * file the path split excludes is not reuse; copying it would be drift by
 * construction.
 */
export function hasExactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  if (typeof value !== 'object' || value === null) return false;
  const actual = Object.keys(value as Record<string, unknown>);
  if (actual.length !== keys.length) return false;
  return keys.every((key) => Object.hasOwn(value, key));
}

export function isGuidedCreateParams(
  value: unknown,
): value is GuidedCreateParams {
  if (!hasExactKeys(value, ['name', 'class_content_key'])) return false;
  const candidate = value as Record<string, unknown>;
  return (
    isValidCharacterName(candidate['name']) &&
    typeof candidate['class_content_key'] === 'string' &&
    candidate['class_content_key'].length > 0
  );
}

export function isOriginKind(value: unknown): value is OriginKind {
  return value === 'species' || value === 'background';
}

export function isGuidedOriginParams(
  value: unknown,
): value is GuidedOriginParams {
  if (!hasExactKeys(value, ['character_id', 'kind', 'content_key']))
    return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate['character_id'] === 'number' &&
    Number.isInteger(candidate['character_id']) &&
    candidate['character_id'] > 0 &&
    isOriginKind(candidate['kind']) &&
    typeof candidate['content_key'] === 'string' &&
    candidate['content_key'].length > 0
  );
}

/* ------------------------------------------------------------------ routes */

export const GUIDED_NEW_ROUTE = '/characters/new';

/**
 * The STRICTER of the two id patterns already in the codebase. The sheet screen
 * uses this; the planner uses `/^\d+$/`, which also accepts `0` and `007`.
 *
 * `level` is pinned to `'1'` alone. A matcher accepting `/build/levels/7` today
 * would be a dead route wearing a live one's clothes.
 */
export const GUIDED_CHARACTER_ID_PATTERN = /^[1-9]\d*$/;

export const GUIDED_BUILD_SCREEN_ID = 'build';

export function matchesGuidedNewRoute(segments: readonly string[]): boolean {
  return (
    segments.length === 2 &&
    segments[0] === 'characters' &&
    segments[1] === 'new'
  );
}

export function matchesGuidedBuildRoute(
  segments: readonly string[],
): number | null {
  if (
    segments.length !== 5 ||
    segments[0] !== 'characters' ||
    segments[2] !== 'build' ||
    segments[3] !== 'levels' ||
    segments[4] !== '1'
  ) {
    return null;
  }
  const raw = segments[1];
  if (raw === undefined || !GUIDED_CHARACTER_ID_PATTERN.test(raw)) return null;
  return Number(raw);
}

/* ----------------------------------------------------------------- panels */

/**
 * PANEL LOCATORS, PINNED.
 *
 * These belong in the seam and were missing from it — the A1 implementer found
 * the gap and reported it rather than quietly choosing for both sides. It was a
 * real hole: the plan requires the class-less panel's locator not to collide
 * with the terminal panel's control assertion, while pinning neither locator,
 * so the production agent and the test agent could each have picked their own
 * and disagreed about nothing but names.
 *
 * The values are the implementer's, ratified here BEFORE the tests are written.
 * That direction matters: pinning a locator the tests must then match is the
 * seam doing its job, whereas rewriting a test afterwards to match whatever
 * shipped would be narrowing an assertion to fit an implementation, which this
 * project forbids outright.
 */
export const GUIDED_PANEL = Object.freeze({
  /** Shown when the derived step exists but this group has not built it. */
  stepNotBuilt: 'step-not-built',
  /** Shown for a blank-created character opened at the build route. */
  classless: 'classless-character',
  /**
   * The class chooser at `/characters/new`.
   *
   * A1 shipped a placeholder here named `class-chooser-pending`, described in
   * this file as valid only until A3 landed. A3 landed and replaced it, and the
   * implementer reported that nothing in the seam named the real panel — so the
   * two agents would have picked their own locators again. Retired rather than
   * kept beside its replacement: a constant nothing renders is a trap for the
   * next reader, who cannot tell a dead value from a live one.
   */
  classChooser: 'class-chooser',
  /** No such character. */
  notFound: 'not-found',
  /** The species step. Ratified from A4, as A1's and A3's panels were. */
  speciesStep: 'species-step',
  /** The background step. Ratified from A5, same pattern. */
  backgroundStep: 'background-step',
  /** The abilities step (B1). */
  abilitiesStep: 'abilities-step',
  /** The skills step (S-C, skills-with-provenance §3.6). */
  skillsStep: 'skills-step',
} as const);

/** The attribute the panels above are selected by: `data-panel="…"`. */
export const GUIDED_PANEL_ATTRIBUTE = 'data-panel';

/**
 * The inverse of `matchesGuidedBuildRoute`.
 *
 * Missing until A3, which is a real gap and not a nicety: the matcher told both
 * agents how to READ the route and nothing told them how to WRITE it, so the
 * production code and the browser proof could have formatted the same path
 * differently and only disagreed at runtime. A round trip through both is worth
 * asserting.
 */
export function guidedBuildPath(characterId: number): string {
  return `/characters/${characterId}/build/levels/1`;
}

/* ------------------------------------------------------------ RPC methods */

export const GUIDED_RPC = Object.freeze({
  classOptions: 'queries.characters.guidedClassOptions',
  originOptions: 'queries.characters.originOptions',
  create: 'queries.characters.createGuided',
  applyOrigin: 'queries.characters.applyOrigin',
  buildState: 'queries.characters.buildState',
  allocateAbilities: 'queries.characters.allocateAbilities',
  /** The skills step's fill/clear command (S-B, §3.6), riding the executor. */
  fillSkillGrant: 'queries.characters.fillSkillGrant',
  /** The skills step's read (S-C): everything the step renders, in one query. */
  skillsStep: 'queries.characters.skillsStep',
} as const);

/* --------------------------------------------------------------- abilities */

/**
 * THE ABILITIES STEP AND THE CONTRIBUTION LAYER.
 *
 * Pinned by `docs/design/2026-07-28-abilities-and-contributions.md` after three
 * review rounds. B1 and B2 are SEQUENTIAL, not parallel — §3.8 — because both
 * change the share wire and D41 makes each change mint a frozen version plus a
 * mandatory migration. B1 mints share v3; B2 mints v4, rebased on B1.
 */

/** D64: standard array is the default; the other two WARN, never block. */
export type AbilityAllocationMethod =
  | 'standard_array'
  | 'point_buy'
  | 'manual';

export type GuidedAbilityScores = Readonly<Record<Ability, number>>;

/**
 * `operation_uuid` and `expected_revision` are NOT optional. Every executor
 * request requires both, and revision 3 of the plan said so in prose while the
 * pinned shape omitted them — the kind of contradiction two parallel agents
 * resolve differently.
 */
export interface GuidedAllocateAbilitiesParams {
  readonly character_id: number;
  readonly method: AbilityAllocationMethod;
  readonly scores: GuidedAbilityScores;
  readonly operation_uuid: string;
  readonly expected_revision: number;
}

/**
 * WARNINGS ARE DATA, AND THAT IS WHAT MAKES D49 STRUCTURAL.
 *
 * D49 says warn and block are different mechanisms that must not be conflated.
 * A warning carried in the result — rather than expressed as styling, or as a
 * disabled button, or as a refusal reason — is the only form a test can assert
 * without proving something about CSS. `GuidedAbilityWarning` deliberately does
 * NOT share a union with `GuidedRefusalReason`: a refusal stops the work, a
 * warning never does.
 */
export type GuidedAbilityWarning =
  | { readonly kind: 'non_standard_method'; readonly method: AbilityAllocationMethod }
  | { readonly kind: 'weak_scores'; readonly at_least_plus_two: number };

export interface GuidedAllocateAbilitiesResult {
  readonly character_id: number;
  readonly current_step: BuildStep;
  readonly warnings: readonly GuidedAbilityWarning[];
}

/**
 * D64's weakness condition, as one named function so the step, the tests and
 * any later surface cannot each invent their own threshold.
 *
 * "At least two +2 ability scores" is read as two abilities whose MODIFIER is
 * +2 or better — score 14 or higher. The plan records that reading explicitly so
 * one sentence from the owner can change this one number.
 */
export const WEAK_SCORES_MIN_COUNT = 2;
export const WEAK_SCORES_MIN_SCORE = 14;

export function countAbilitiesAtLeastPlusTwo(
  scores: GuidedAbilityScores,
): number {
  return Object.values(scores).filter(
    (score) => score >= WEAK_SCORES_MIN_SCORE,
  ).length;
}

export function hasWeakScores(scores: GuidedAbilityScores): boolean {
  return countAbilitiesAtLeastPlusTwo(scores) < WEAK_SCORES_MIN_COUNT;
}

/* ------------------------------------------------- contributions (B2) */

/**
 * The additive layer. A contribution is a `character_effects` row of kind
 * `ability_increase`, and it REQUIRES a non-null `source_instance_id` — the
 * column is nullable in general and guided species copying writes NULL, so
 * without a kind-specific CHECK D63's "knows where it came from" would be a
 * convention rather than an invariant.
 *
 * `maximum` is bounded 1–30 at the validator, the CHECK and the share wire.
 * Revision 3 floored negatives at 1 because `AbilityScore` throws below it, then
 * left the top of the range open — the same crash by the same argument.
 */
export const ABILITY_SCORE_MIN = 1;
export const ABILITY_SCORE_MAX = 30;

export interface AbilityIncreaseContribution {
  readonly ability: Ability;
  readonly amount: number;
  readonly maximum: number;
  readonly source_instance_id: number;
}

/**
 * THE RESOLVER, AND WHY IT ORDERS BY ACQUISITION.
 *
 * Contributions apply in `id` order. `character_effects.id` is autoincrement, so
 * it is monotonic in insertion order — acquisition order — and no user can
 * change it. Revision 3 ordered by `(sort_order, id)`, and `sort_order` is the
 * user's own editable display order: a cosmetic drag would have changed an
 * ability score.
 *
 * Each positive contribution adds `max(0, min(running + amount, maximum) −
 * running)`, so it applies PARTIALLY when it would cross its own cap and ZERO
 * when the running total already meets it. Negatives floor the running total at
 * `ABILITY_SCORE_MIN`.
 *
 * The result keeps all three values addressable because different surfaces need
 * different ones — see `abilities_base` versus `abilities` in the read model.
 */
export interface ResolvedAbility {
  readonly base: number;
  readonly contributions: readonly AbilityIncreaseContribution[];
  readonly total: number;
}

export type ResolvedAbilities = Readonly<Record<Ability, ResolvedAbility>>;

/* ------------------------------------------- abilities step, ratified from B1 */

/**
 * Three gaps the B1 implementer found and REPORTED rather than filled silently.
 * §3.6 promised all three and the seam shipped none of them; the values are the
 * implementer's, ratified here BEFORE the tests are written — which is the only
 * direction that works, since a test written first would have pinned itself.
 */

/** §3.6 promised "plus its exact-keys validator" and the seam had no validator. */
export function isGuidedAllocateAbilitiesParams(
  value: unknown,
): value is GuidedAllocateAbilitiesParams {
  if (
    !hasExactKeys(value, [
      'character_id',
      'method',
      'scores',
      'operation_uuid',
      'expected_revision',
    ])
  ) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const scores = candidate['scores'];
  if (typeof scores !== 'object' || scores === null) return false;
  const everyAbilityScored = (
    Object.values(scores as Record<string, unknown>) as unknown[]
  ).every(
    (score) =>
      typeof score === 'number' &&
      Number.isInteger(score) &&
      score >= ABILITY_SCORE_MIN &&
      score <= ABILITY_SCORE_MAX,
  );
  return (
    typeof candidate['character_id'] === 'number' &&
    Number.isInteger(candidate['character_id']) &&
    candidate['character_id'] > 0 &&
    (candidate['method'] === 'standard_array' ||
      candidate['method'] === 'point_buy' ||
      candidate['method'] === 'manual') &&
    everyAbilityScored &&
    typeof candidate['operation_uuid'] === 'string' &&
    candidate['operation_uuid'].length > 0 &&
    typeof candidate['expected_revision'] === 'number' &&
    Number.isInteger(candidate['expected_revision']) &&
    candidate['expected_revision'] >= 0
  );
}

/**
 * The step's locators. §3.6 pinned only the panel, which would have left the
 * test author inventing a second set — the exact divergence that made A1's and
 * A3's panel locators worth ratifying.
 */
export const ABILITY_STEP_ATTR = Object.freeze({
  method: 'data-ability-method',
  input: 'data-ability-input',
  warnings: 'data-ability-warnings',
  warning: 'data-ability-warning',
  submit: 'data-ability-submit',
  pointBuyBudget: 'data-point-buy-budget',
} as const);

/**
 * The production rules module holding the SRD standard array and point costs.
 * §3.6 listed "the production rules module path" as a seam addition and neither
 * the plan nor the seam ever named it; `B1-ARRAY`'s author needs it.
 */
export const ABILITY_GENERATION_RULES_MODULE =
  'src/rules/ability-score-generation-srd.ts';

/* --------------------------------- skill grants (S-A, ratified from plan §3.6) */

/**
 * THE SKILLS-WITH-PROVENANCE SEAM — dispatch S-A of
 * `docs/design/2026-07-29-skills-with-provenance.md`. The values below are the
 * S-A implementer's, ratified here BEFORE the tests are written, on the same
 * direction-of-ratification the panel locators established.
 *
 * The runtime lives in `src/grants/skill-grants.ts` (`SKILL_GRANTS_MODULE`);
 * this file pins the SHAPES and the LITERALS so the production agent and the
 * test author cannot each invent their own.
 */

/**
 * LITERAL `grant_key` values, not semantic labels (§3.6): "starting-class" and
 * "Keen Senses" are descriptions, and two agents would write two vocabularies.
 * Rule-driven feat grants (the Skilled feat, §3.4 — deferred, D33-disclosed)
 * will use their own `rule_key` as the grant key when that unit lands; they
 * are deliberately NOT in this map because nothing mints them yet.
 */
export const SKILL_GRANT_KEYS = Object.freeze({
  /** A starting class's "choose N" (`class_sheet_traits.skill_choice_count`). */
  classSkill: 'class_skill',
  /** A multiclass entry grant (D44; `multiclass_skill_choice_count`/`_pool`). */
  multiclassSkill: 'multiclass_skill',
  /** A background's two printed skills, produced by S-B. */
  backgroundSkill: 'background_skill',
  /** Elf Keen Senses (three-way choice), produced by S-B. */
  speciesKeenSenses: 'species_keen_senses',
  /** Human Skillful (any one), produced by S-B. */
  speciesSkillful: 'species_skillful',
} as const);

/** The two grant keys the GENERATOR's class arm owns and reconciles (S-A). */
export const CLASS_SKILL_GRANT_KEYS = [
  SKILL_GRANT_KEYS.classSkill,
  SKILL_GRANT_KEYS.multiclassSkill,
] as const;

/**
 * The orphan reason vocabulary, matching the spell slots' literals so one
 * grep finds both lifecycles: `rule_no_longer_active` when the entitlement
 * shrinks under a live source, `parent_rule_removed` when the source itself
 * tombstones (§3.8).
 */
export const SKILL_GRANT_ORPHAN_REASONS = Object.freeze({
  ruleNoLongerActive: 'rule_no_longer_active',
  sourceRemoved: 'parent_rule_removed',
} as const);

/**
 * THE DISCLOSURE REASON for a grant that revived UNFILLED because another
 * ACTIVE grant already holds its remembered skill (§3.8's corrected policy —
 * re-adding a class is not an operation that may fail, so this is a
 * disclosure, never a refusal). It reuses §3.3's `skill_already_held` literal
 * so the collision has ONE name whether it is refused (a background re-apply)
 * or disclosed (a revival). S-A does not persist it on the row — the row's
 * observable state is active + unfilled, which completeness reports
 * outstanding; surfaces that narrate the revival use this constant.
 */
export const SKILL_GRANT_REVIVED_UNFILLED_REASON = 'skill_already_held';

/**
 * One `character_skill_grants` row, as the resolver returns it. `skill: null`
 * is GRANTED BUT UNFILLED — the defended null the table exists for. The two
 * lifecycle columns ride along so a consumer never has to re-query to learn
 * why a grant is orphaned.
 */
export interface SkillGrantRow {
  readonly id: number;
  readonly character_id: number;
  readonly source_instance_id: number;
  readonly grant_key: string;
  readonly ordinal: number;
  readonly skill: Skill | null;
  readonly state: SkillGrantState;
  readonly orphan_reason_code: string | null;
  readonly orphaned_at: string | null;
}

/**
 * One unfilled, ACTIVE class grant, with its per-grant available choices.
 * `available` is the class pool MINUS every skill any active grant already
 * holds (§3.3: you cannot pick what you already have — but a held skill never
 * reduces the number of unfilled ordinals). `class_name: null` is D33's
 * honest unknown for a class definition that has vanished.
 */
export interface UnfilledClassSkillGrant {
  readonly grant_id: number;
  readonly source_instance_id: number;
  readonly grant_key: string;
  readonly ordinal: number;
  readonly class_definition_id: number;
  readonly class_name: string | null;
  readonly available: readonly Skill[];
}

/**
 * THE RESOLVER'S RETURN SHAPE (§3.6): four different questions, and a
 * resolver returning only the third makes the step unbuildable.
 *
 *  - `grants` — every grant row, BOTH states (the generator and the
 *    persistence layers need orphaned rows; §3.8);
 *  - `skills` — the filled DISTINCT proficiencies of ACTIVE grants, the set
 *    the sheet prints;
 *  - `unfilledClassGrants` — the outstanding obligations, each carrying its
 *    own `available` choices.
 */
export interface ResolvedSkillGrants {
  readonly grants: readonly SkillGrantRow[];
  readonly skills: readonly Skill[];
  readonly unfilledClassGrants: readonly UnfilledClassSkillGrant[];
}

/**
 * Where the runtime lives, on the `ABILITY_GENERATION_RULES_MODULE` precedent.
 * The module exports, whose names are pinned here so neither agent renames
 * them unilaterally:
 *
 *  - `resolveSkillGrants(db, characterId): ResolvedSkillGrants` — the resolver;
 *  - `activeGrantedSkills(db, characterId): Skill[]` — the sheet's read,
 *    `DISTINCT skill` from ACTIVE grants, never the projection;
 *  - `rebuildSkillProjection(db, characterId): void` — the ONE deriving writer
 *    of `character_skill_proficiencies` (§3.2), called on every path that
 *    changes the active grant set;
 *  - `syncClassSkillGrants(db, source): void` — the generator's sync/revive
 *    class arm (§3.8);
 *  - `orphanSkillGrantsForSource(db, sourceInstanceId): void` — the tombstone
 *    path;
 *  - `classSkillGrantsFilled(db, characterId): boolean` — the guided skills
 *    step's completion predicate (S-C, §3.6): true exactly when
 *    `resolveSkillGrants` reports no unfilled ACTIVE class grants.
 */
export const SKILL_GRANTS_MODULE = 'src/grants/skill-grants.ts';

/**
 * The share wire version this unit mints (§3.6). Pre-v5 documents are RETIRED
 * per D60 — refused by `ShareWireRetirementError` in
 * `src/sharing/wire-schemas/index.ts`, never migrated with fabricated
 * provenance — and the refusal's name is pinned there rather than here
 * because the wire registry owns its own error vocabulary.
 */
export const SKILL_GRANTS_SHARE_WIRE_VERSION = 5;

/* --------------------------------- skill producers (S-B, offered for ratification) */

/**
 * THE S-B ADDITIONS — the producers and the fill command
 * (`docs/design/2026-07-29-skills-with-provenance.md` §3.3/§3.6/§4 S-B).
 * The values below are the S-B implementer's, OFFERED FOR RATIFICATION on the
 * same direction every earlier dispatch used: pinned here before more tests
 * are written, reported rather than silently chosen for both sides.
 */

/**
 * The two grant keys the GENERATOR's species arm owns and reconciles —
 * `syncSpeciesSkillGrants` in `SKILL_GRANTS_MODULE`, scoped exactly as the
 * class arm is scoped to `CLASS_SKILL_GRANT_KEYS`, so neither arm's
 * reconcile can orphan the other's grants (or the background producer's).
 */
export const SPECIES_SKILL_GRANT_KEYS = [
  SKILL_GRANT_KEYS.speciesKeenSenses,
  SKILL_GRANT_KEYS.speciesSkillful,
] as const;

/**
 * What one species is entitled to grant, keyed by `species_definitions`
 * content key. A LITERAL MAP, NOT AN INFERENCE — the trait text ("You have
 * proficiency in the Insight, Perception, or Survival skill") is prose, and
 * sniffing it would let two agents each invent their own pool. The two
 * entries are the two species D63 names and §3.4 scopes:
 *
 *  - Elf, Keen Senses: ONE choice from a printed three-way pool
 *    (`docs/srd/source/species-descriptions.txt`, the Keen Senses trait);
 *  - Human, Skillful: ONE choice from any skill ("one skill of your
 *    choice"), represented as `'any_skill'` rather than a copied-out
 *    eighteen so the pool cannot drift from the `skills` vocabulary.
 *
 * The grants are minted UNFILLED by the generator when the species source is
 * created (§3.8 pins the generator, not a command on demand) and revive on
 * reactivation exactly as class grants do.
 */
export interface SpeciesSkillGrantPlan {
  readonly grant_key: (typeof SPECIES_SKILL_GRANT_KEYS)[number];
  readonly count: number;
  readonly pool: readonly Skill[] | 'any_skill';
}

export const SPECIES_SKILL_GRANT_PLANS: Readonly<
  Record<string, SpeciesSkillGrantPlan>
> = Object.freeze({
  [`${BUNDLED_ORIGIN_RULES_EDITION}:species:elf`]: {
    grant_key: SKILL_GRANT_KEYS.speciesKeenSenses,
    count: 1,
    pool: ['insight', 'perception', 'survival'],
  },
  [`${BUNDLED_ORIGIN_RULES_EDITION}:species:human`]: {
    grant_key: SKILL_GRANT_KEYS.speciesSkillful,
    count: 1,
    pool: 'any_skill',
  },
});

/**
 * §3.6's refusal reasons, a SEPARATE union from `GuidedRefusalReason`: these
 * are skill-grant refusals with their own data shape (the conflicting skill),
 * raised by the fill command and by the background producer's §3.3 collision
 * check, and carried by `SkillGrantRefusal` in `SKILL_GRANTS_MODULE`.
 */
export type SkillGrantRefusalReason =
  | 'skill_not_in_pool'
  | 'grant_not_found'
  | 'grant_already_filled'
  | 'skill_already_held';

/**
 * The wire data of a skill-grant refusal. §3.3 pins that `skill_already_held`
 * NAMES the conflicting skill so the step can offer to clear it; `skill` is
 * null where no particular skill is at issue (`grant_not_found`).
 */
export interface SkillGrantRefusalData {
  readonly reason: SkillGrantRefusalReason;
  readonly skill: Skill | null;
}

/**
 * THE FILL COMMAND'S PARAMS (§3.6): the grant's own stable id is the locator
 * — an addressed grant, never "whichever grant happens to be unfilled", which
 * is §5's second trap. `skill: null` is the pinned CLEAR (§3.3: refusing the
 * background collision is right only because unfilling is possible).
 * `operation_uuid` and `expected_revision` are required because the request
 * rides the command executor, exactly as B1's allocation does.
 */
export interface GuidedFillSkillGrantParams {
  readonly character_id: number;
  readonly grant_id: number;
  readonly skill: Skill | null;
  readonly operation_uuid: string;
  readonly expected_revision: number;
}

/** The result: the updated build position, `allocateAbilities`'s shape. */
export interface GuidedFillSkillGrantResult {
  readonly character_id: number;
  readonly current_step: BuildStep;
}

/** §3.6's exact-keys validator for the fill params. */
export function isGuidedFillSkillGrantParams(
  value: unknown,
): value is GuidedFillSkillGrantParams {
  if (
    !hasExactKeys(value, [
      'character_id',
      'grant_id',
      'skill',
      'operation_uuid',
      'expected_revision',
    ])
  ) {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  const skill = candidate['skill'];
  const expectedRevision = candidate['expected_revision'];
  return (
    typeof candidate['character_id'] === 'number' &&
    Number.isInteger(candidate['character_id']) &&
    candidate['character_id'] > 0 &&
    typeof candidate['grant_id'] === 'number' &&
    Number.isInteger(candidate['grant_id']) &&
    candidate['grant_id'] > 0 &&
    (skill === null || isEnumValue(skills, skill)) &&
    typeof candidate['operation_uuid'] === 'string' &&
    candidate['operation_uuid'].length > 0 &&
    typeof expectedRevision === 'number' &&
    Number.isInteger(expectedRevision) &&
    expectedRevision >= 0
  );
}

/* --------------------------------- the skills step (S-C, offered for ratification) */

/**
 * THE S-C ADDITIONS — the guided skills step and its completion predicate
 * (`docs/design/2026-07-29-skills-with-provenance.md` §3.3/§3.6/§3.7, §4 S-C).
 * The values below are the S-C implementer's, OFFERED FOR RATIFICATION on the
 * same direction every earlier dispatch used.
 *
 * THE COMPLETION PREDICATE is `classSkillGrantsFilled(db, characterId)` in
 * `SKILL_GRANTS_MODULE`, and its `GuidedStepEvidence` field is `skillsFilled`
 * — replacing the hard-coded `skills: false` (§3.6). It is TRUE exactly when
 * the resolver reports no unfilled ACTIVE class grants: §5's trap is reusing
 * planner-count completeness here, and deriving both the step and the planner
 * item from `resolveSkillGrants().unfilledClassGrants` is what makes the
 * per-grant rule one truth rather than two predicates that can drift.
 * Species choice grants (Keen Senses, Skillful) are CHOOSABLE in the step but
 * never gate it — §4 pins "advances only when every class ordinal is filled",
 * and an Elf whose three-way pool is exhausted by other sources must not be
 * stranded on this step forever.
 */

/** The step's locators, on the `ABILITY_STEP_ATTR` precedent (§3.6). */
export const SKILL_STEP_ATTR = Object.freeze({
  /**
   * The already-granted-by-background/species display (§3.6 pins this
   * locator by name — S-C's exit needs it). One element per FILLED active
   * grant; the value is the skill.
   */
  granted: 'data-skill-granted',
  /** One container per unfilled choice grant; the value is the grant id. */
  choice: 'data-skill-choice',
  /** The choice's `select`; the value is the grant id. */
  select: 'data-skill-select',
  /** The choice's fill button; the value is the grant id. */
  fill: 'data-skill-fill',
  /** The clear button on a clearable filled grant; the value is the grant id. */
  clear: 'data-skill-clear',
  /** The §3.7 Skilled-feat disclosure: skill grants the app does not apply. */
  skilledFeatGap: 'data-skill-gap-unapplied-rule',
  /** The §3.7 Expertise disclosure for a level-1 Rogue. */
  expertiseGap: 'data-skill-gap-expertise',
} as const);

/**
 * §3.7's Expertise disclosure population: the classes whose LEVEL-ONE kit
 * includes Expertise — the Rogue, per D54's level-1 bar (the Bard takes it at
 * level 2, outside the bar). A PINNED LITERAL on the
 * `LINEAGE_SPELL_SPECIES_CONTENT_KEYS` precedent: no table records which
 * classes take Expertise or when, and sniffing feature prose would let two
 * agents invent two lists. Reviewed by eye against
 * `docs/srd/source/`'s Rogue and Bard core traits.
 */
export const EXPERTISE_AT_LEVEL_ONE_CLASS_CONTENT_KEYS: ReadonlySet<string> =
  Object.freeze(
    new Set([`${BUNDLED_ORIGIN_RULES_EDITION}:class:rogue`]),
  ) as ReadonlySet<string>;

/** One FILLED active grant, as the step's already-granted display shows it. */
export interface GuidedGrantedSkillDisplay {
  readonly grant_id: number;
  readonly skill: Skill;
  readonly grant_key: string;
  readonly source_name: string;
  /**
   * True when the grant is a CHOICE the step may CLEAR (class and species
   * keys). A background's printed skills are minted filled and are not
   * choices, so they are shown but never clearable here.
   */
  readonly clearable: boolean;
}

/** One unfilled SPECIES choice grant (Keen Senses / Skillful), fillable here. */
export interface GuidedSpeciesSkillChoice {
  readonly grant_id: number;
  readonly grant_key: string;
  readonly source_name: string;
  /** The seam's plan pool minus every skill an active grant already holds. */
  readonly available: readonly Skill[];
}

/**
 * `queries.characters.skillsStep`'s result: everything the step renders.
 *
 * `revision` rides along because every fill is an executor command requiring
 * `expected_revision`, and the step re-derives after each successful write —
 * the same read-then-command shape the abilities step uses.
 *
 * The two §3.7 gaps are DATA here, never inferred in the UI:
 * `unapplied_skill_rule_sources` names every ACTIVE source whose definition
 * carries a `skill_proficiency` grant rule nothing consumes (the Skilled
 * feat, S6), and `expertise_gap` is true for the
 * `EXPERTISE_AT_LEVEL_ONE_CLASS_CONTENT_KEYS` population.
 */
export interface GuidedSkillsStepState {
  readonly character_id: number;
  readonly revision: number;
  readonly granted: readonly GuidedGrantedSkillDisplay[];
  readonly class_choices: readonly UnfilledClassSkillGrant[];
  readonly species_choices: readonly GuidedSpeciesSkillChoice[];
  readonly unapplied_skill_rule_sources: readonly string[];
  readonly expertise_gap: boolean;
}

/* --------------------------------- starting equipment (E-A, offered for ratification) */

/**
 * THE STARTING-EQUIPMENT SEAM — dispatch E-A of
 * `docs/design/2026-07-29-starting-equipment.md` (§2, §3, §6b), REDUCED BY
 * OWNER RULING D69: weapons and armour carry NO provenance. §6b's value 1
 * (the `source_instance_id` column, `EQUIPMENT_SOURCE_COLUMN`) and value 4's
 * wire pins (`EQUIPMENT_SHARE_WIRE_VERSION`, `EQUIPMENT_WIRE_SOURCE_REF_FIELD`)
 * were ratified here and are now UNRATIFIED — the column is dropped
 * (migration `0012`) and wire v7 removed the field, so a constant naming
 * either would be a dead value wearing a live one's clothes. What survives is
 * what the step still uses: the recorded CHOICE and the armour-slot refusal.
 */

/** The two sources that offer a starting-equipment package (D65, D61). */
export type EquipmentSourceKind = 'class' | 'background';

/**
 * §6b value 2 — THE RECORDED CHOICE. It lives in the granting source
 * instance's `config` under this key (the `applyGuidedBackgroundChoices`
 * pattern, and `config` is already on the share wire since v1, so the choice
 * travels for free). The value carries the source kind AND the option letter,
 * discriminated so a class's three-way choice and a background's two-way one
 * cannot be conflated.
 */
export const EQUIPMENT_CHOICE_CONFIG_KEY = 'equipment_choice';

export type EquipmentChoiceConfig =
  | { readonly kind: 'class'; readonly option: ClassEquipmentOption }
  | { readonly kind: 'background'; readonly option: BackgroundEquipmentOption };

/**
 * §6b value 3 — THE ARMOUR-COLLISION REFUSAL REASON. `character_armor` is
 * UNIQUE on `(character_id, slot)`; minting worn armour for a character whose
 * slot is occupied is a NAMED refusal with whole-apply rollback — the shape
 * S-B built for `skill_already_held` — never a raw SQLite constraint
 * violation and never a silent overwrite. The data names the slot, the item
 * that could not be placed, and the item already holding the slot, so the
 * step can tell the person exactly what collided. Since D69 the occupant may
 * be ANY row — a hand-added one or a previous mint's, now indistinguishable
 * — and the remedy is the player's own removal.
 */
export type EquipmentGrantRefusalReason = 'armor_slot_occupied';

export interface EquipmentGrantRefusalData {
  readonly reason: EquipmentGrantRefusalReason;
  readonly slot: ArmorSlot;
  /** The granted item that could not be placed. */
  readonly item: string;
  /** The name of the row already occupying the slot. */
  readonly holder: string;
}

/**
 * §6b value 5 — THE DECLARED CLASS WEAPON-EQUIPMENT MAP'S MODULE. The
 * class-side `DECLARED_WEAPON_EQUIPMENT` (plural bundles: Daggers, Handaxes,
 * Javelins) lives beside the parser it corrects, with its exercised-entries
 * guard, mirroring `origins-srd.ts`'s background map. No singularisation
 * algorithm — D15 forbids deciding a mechanical fact by matching text, and no
 * declared entry means the row REMAINS GEAR (`20 Arrows`, `Quiver`).
 */
export const CLASS_EQUIPMENT_RULES_MODULE = 'src/rules/class-equipment-srd.ts';

/**
 * Where the mint lives, on the `SKILL_GRANTS_MODULE` precedent. The module
 * exports `applyEquipmentPackageChoice(db, params)` — one transaction that
 * records the choice in `config` and mints the chosen option's
 * weapon/armour rows as PLAIN rows (D69: no provenance stamp, no
 * option-change cleanup; re-confirming a recorded choice is a no-op) — and
 * `EquipmentGrantRefusal`, the named-refusal error carrying
 * `EquipmentGrantRefusalData`.
 */
export const EQUIPMENT_GRANTS_MODULE = 'src/grants/equipment-grants.ts';

/* ------------------------------------------ background choices (B3, ratified) */

/**
 * B3's contract, authored in its own module because this file is read-only to
 * implementers, then ratified into the seam. Re-exported here so callers have
 * one import point and neither agent has to know which file a name lives in.
 */
export * from './background-choices';

/* ---------------------- equipment step (E-B, offered for ratification) */

/**
 * E-B's contract — the step's RPC names, read-model shape, panel, locators,
 * validator and refusals — authored in its own module on the B3 precedent
 * above and offered for ratification the same way. It consumes the E-A
 * section's ratified values (`EquipmentChoiceConfig`,
 * `EQUIPMENT_CHOICE_CONFIG_KEY`) rather than inventing parallels.
 */
export * from './equipment-choices';

/* ---------------------- straight-class level-up (L-A, offered for ratification) */

/**
 * L-A's contract — the one levelling command's type and payload shape (D77:
 * no hit-point field), the four refusal reasons, the subclass level, the
 * ASI cap and total, and the ASI rules module path — authored in its own
 * module on the B3 precedent above and offered for ratification the same
 * way. Level-up is NOT a creation step, which is why the values live in
 * `./level-up` rather than a new section of this level-one file (plan §8b).
 */
export * from './level-up';
