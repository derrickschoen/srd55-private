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
} as const);
