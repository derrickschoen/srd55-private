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

import type { Ability } from '../domain/enums';
import { BUNDLED_ORIGIN_RULES_EDITION } from '../rules/origins-srd';

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

/* ------------------------------------------ background choices (B3, ratified) */

/**
 * B3's contract, authored in its own module because this file is read-only to
 * implementers, then ratified into the seam. Re-exported here so callers have
 * one import point and neither agent has to know which file a name lives in.
 */
export * from './background-choices';
