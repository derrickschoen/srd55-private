/**
 * THE STRAIGHT-CLASS LEVEL-UP SEAM — dispatch L-A of
 * `docs/design/2026-07-29-straight-class-level-up.md` (§8b), authored in its
 * own module on the B3 / E-B precedent and OFFERED FOR RATIFICATION: L-A must
 * build the level-and-row transaction and all four guards without knowing
 * what L-B's screen submits, so every name the two dispatches must agree on
 * is pinned here before the screen exists.
 *
 * `src/builder/contracts.ts` is scoped to the level-ONE creation wizard and
 * says so in its own header; levelling 2..20 is a different feature, hence
 * the ratified-by-re-export path rather than a new section in that file.
 *
 * This module is EXTRACT-FREE deliberately (no `?raw` in its closure — the
 * seam is loaded by node-side test processes, see the contracts.ts note).
 * The ASI table parser lives in `CLASS_ASI_LEVELS_MODULE` instead.
 */

import type {
  LevelUpAbilityIncrease,
  LevelUpClassCommand,
  LevelUpPlannedGrantLocator,
} from '../domain/command-contracts';

export type { LevelUpAbilityIncrease, LevelUpClassCommand };

/**
 * The one levelling command's `type` discriminator. ONE command, ONE payload
 * (§8b, reduced by D77): class source, target level, subclass content key
 * when the new level is `LEVEL_UP_SUBCLASS_LEVEL`, ability increases — a
 * LIST of one or two — when the new level is an ASI level of the seeded
 * table. NO hit-point field: under D77 the new level's hit points are the
 * class's fixed value (`die / 2 + 1`) plus the Constitution modifier,
 * computed live, never carried and never recorded. One transaction, one
 * snapshot inverse (`restore_snapshot`, the shape `update_class` already
 * uses), one refusal set.
 */
export const LEVEL_UP_CLASS_COMMAND_TYPE = 'level_up_class' as const;

/**
 * THE COMMAND-LAYER REFUSALS — THREE, NOT §8b's FOUR — named in the seam,
 * never invented per dispatch, and raised by the COMMAND before its
 * transaction (the E-B precedent: a structured refusal, not a greyed-out
 * button):
 *
 *  - `class_not_held` (L-STRAIGHT): the levelling path refuses a class the
 *    character does not already have. `UpdateClassCommand` has no such guard
 *    and never will need one again — entry is its job, levelling is not.
 *  - `ability_increase_required` (L-ASI-LEVELS): an ASI level — read from
 *    the seeded data, per class — with no increase list.
 *  - `level_not_adjacent` (L-ADJACENT): a target level that is not exactly
 *    the class's current level plus one.
 *
 * `subclass_required` IS DELIBERATELY ABSENT — struck by D70. Only two
 * subclasses are seeded (Eldritch Knight, Arcane Trickster), so a level-3
 * refusal would dead-end ten of twelve classes with nothing to choose, which
 * D54's bar forbids by name. D70 already rules an unpicked subclass a
 * SAVEABLE state that WARNS: level 3 proceeds, the command records the
 * level, and the owed choice is the wizard's warning and the sheet's gap
 * (L-B), never this command's police.
 */
export const LEVEL_UP_REFUSAL_REASONS = Object.freeze({
  classNotHeld: 'class_not_held',
  abilityIncreaseRequired: 'ability_increase_required',
  levelNotAdjacent: 'level_not_adjacent',
  plannedSubchoiceRefused: 'planned_subchoice_refused',
} as const);

export type LevelUpRefusalReason =
  (typeof LEVEL_UP_REFUSAL_REASONS)[keyof typeof LEVEL_UP_REFUSAL_REASONS];

/** The wire data of a level-up refusal, `SkillGrantRefusalData`'s shape. */
export type LevelUpSubchoiceRefusalIssue =
  | 'locator_not_found'
  | 'source_not_available'
  | 'expected_unfilled'
  | 'expected_filled'
  | 'grant_not_found'
  | 'grant_already_filled'
  | 'skill_not_in_pool'
  | 'skill_already_held'
  | 'skill_not_proficient'
  | 'skill_already_has_expertise'
  | 'spell_not_eligible';

export type LevelUpRefusalData =
  | {
      readonly reason: Exclude<
        LevelUpRefusalReason,
        'planned_subchoice_refused'
      >;
    }
  | {
      readonly reason: 'planned_subchoice_refused';
      readonly subchoice_kind: 'skill' | 'expertise' | 'spell';
      readonly index: number;
      readonly issue: LevelUpSubchoiceRefusalIssue;
      readonly locator: LevelUpPlannedGrantLocator;
    };

/**
 * Subclass choice arrives at level 3 for ALL TWELVE seeded 2024 classes —
 * verified in the plan (§6), and unlike 2014 where it varies. The payload
 * carries a subclass CONTENT KEY, not a database id, for the reason the
 * creation params carry a class content key.
 *
 * This is where the screen OFFERS the choice — offering is not requiring
 * (D70): a level-3 payload with no key still proceeds, and the unmade
 * choice is a warning, not a refusal.
 */
export const LEVEL_UP_SUBCLASS_LEVEL = 3;

/**
 * The ASI's cap: "increase the ability score by 2, or increase two ability
 * scores by 1 each … can't increase an ability score above 20"
 * (`docs/srd/source/feats.txt`, Ability Score Improvement). Carried per
 * contribution because other sources genuinely differ (Epic Boons stop
 * at 30) — the `BACKGROUND_ABILITY_INCREASE_MAXIMUM` precedent.
 */
export const LEVEL_UP_ABILITY_INCREASE_MAXIMUM = 20;

/** The +2/+1+1 shape: every increase list sums to exactly this. */
export const LEVEL_UP_ABILITY_INCREASE_TOTAL = 2;

/**
 * Where the ASI-levels fact lives, on the `ABILITY_GENERATION_RULES_MODULE`
 * precedent. The module parses the bundled
 * `docs/srd/source/class-level-tables.txt` (levels 4/8/12/16 everywhere,
 * plus Fighter 6 and 14 and Rogue 10 — §5's correction of "level 4") and
 * exports `asiLevelsForClassName(className): ReadonlySet<number> | null`,
 * `null` for a class the tables do not print. It is NOT imported here: it
 * closes over a `?raw` extract, which the seam must stay free of.
 */
export const CLASS_ASI_LEVELS_MODULE =
  'src/rules/class-level-features-srd.ts';

/*
 * NO PERSISTENCE VERSIONS ARE MINTED BY THIS UNIT. §8c's wire mint and
 * snapshot decision existed only to carry the D66 `method` record, and D77
 * struck the record: the command writes tables every existing version
 * already carries (`character_class_levels`, `character_source_instances`,
 * `character_effects`), so share wire v7 and snapshot `a7-v9` stay current.
 * A minted version that was never needed is worse than no version.
 */
