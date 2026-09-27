import type { Ability } from './enums';
import type { Brand } from './ids';

/**
 * SRD-VOCAB: THE ONE HOME OF THE VALUE TYPES AN SRD RULE IS WRITTEN IN.
 *
 * Owner D918 ("rule index + status + vocabulary"; the synthesis §4 table).
 * Every typed SRD data module (the rule units that follow RULE-INDEX) states
 * its distances, durations, areas, damage types, conditions, action-economy
 * slots, usage limits and dice in these types, so a rule's data cannot carry a
 * loose number or a free string where the SRD prints a closed value.
 *
 * It lives in `src/domain`, not `src/rules/srd`, because both the combat engine
 * and the database schema already import `src/domain` and neither imports
 * `src/rules`; a vocabulary under `src/rules` would add those two edges.
 *
 * ONE LIST PER SUBJECT. Merged into this module (their old declarations are
 * gone or are re-exports that name the unit that deletes them):
 * - `Feet` and `feet()` (combat `values.ts` re-exports them),
 *   `conditionNames`/`ConditionName` (combat `conditions.ts` re-exports them),
 *   `damageTypes`/`KnownDamageType` and `KnownConditionType` (domain
 *   `enums.ts`; its duplicate `conditionTypes` list is deleted).
 * - The die sizes: `DIE_SIZES` is the ONE list for rule data and for planning
 *   (owner D920, "Add d3 everywhere", reopening D34). The planner, the damage
 *   probability folds and the sourced subsets in `enums.ts` all use it.
 *
 * UNFINISHED MIGRATIONS, each with the unit that finishes it. Until then each
 * is pinned by a compile-time check in tests/unit/domain/srd-vocabulary.test.ts,
 * so it cannot drift further:
 * - the engine's `AreaTemplate` shapes (templates.ts): pinned EQUAL to
 *   `AreaShape`; merged by EFFECT-VOCAB-CONVERGE.
 * - the engine's `ActionCost` (events.ts): pinned EQUAL to `EconomyCost` less
 *   the object interaction; merged by ACTIONS-COMPLETE.
 * - the stat-block recharge literal (statblock.ts): pinned a SUBSET of
 *   `RechargeMinimum`; replaced by `Usage` in MON-VOCAB.
 * - the database's `spellAreaShapes` (enums.ts): four of the six shapes;
 *   SPELL-EFFECT-FACTS gives the catalogue the six-shape `AreaOfEffect`.
 * - the engine's `DamageType` (values.ts) is an OPEN branded string, and it
 *   cannot close, because user content carries homebrew damage types into
 *   combat and must keep them (AGENTS.md's trap: a closed enum rejects
 *   homebrew, a data-loss bug). The consumers that block it: species and
 *   subclass authoring store a homebrew type through the domain's passthrough
 *   `DamageType` (src/authoring/species-publisher.ts; its test stores 'Void'),
 *   content packs and exported parties convert pack damage types into the
 *   engine's (src/vtt/party-pack.ts), and the engine's own scripted skirmish
 *   deals 'Scripted force' (src/vtt/scripted-skirmish.ts). The target is the
 *   domain's `DamageType` — the thirteen known types plus passthrough — in the
 *   engine, and this module's closed `DamageType` for SRD data;
 *   EFFECT-VOCAB-CONVERGE.
 * - the engine's `DieSides` (values.ts) is an open integer brand (content
 *   packs pass the sides they state through `dieSides`, src/vtt/party-pack.ts);
 *   closing it to `DieSize` is EFFECT-VOCAB-CONVERGE's.
 *
 * Every closed list here is cited to the SRD text it transcribes, and the
 * vocabulary test re-reads those spans: a hand list is a pinned transcription,
 * never a memory of the game.
 */

/* ==========================================================================
 * DISTANCE
 * ========================================================================== */

/** A distance on the battlefield or in a rule, in feet. */
export type Feet = Brand<number, 'Feet'>;
/** An overland distance, in miles (Travel Pace, docs/srd/full/srd-5.2.1.txt:12336-12340@right). */
export type Miles = Brand<number, 'Miles'>;

function nonNegativeFinite(value: number, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative number.`);
  }
  return value;
}

/** Establishes the non-negative, finite invariant for spatial measurements. */
export function feet(value: number): Feet {
  return nonNegativeFinite(value, 'Feet') as Feet;
}

export function miles(value: number): Miles {
  return nonNegativeFinite(value, 'Miles') as Miles;
}

/* ==========================================================================
 * TIME
 * ========================================================================== */

/**
 * "A round represents about 6 seconds in the game world."
 * (docs/srd/full/srd-5.2.1.txt:786-787@left, The Order of Combat.)
 */
export const SECONDS_PER_ROUND = 6;

export const TIME_UNITS = ['round', 'minute', 'hour', 'day'] as const;
export type TimeUnit = (typeof TIME_UNITS)[number];

/** A printed length of time, in the unit it was printed in ("10 minutes" stays minutes). */
export interface TimeSpan {
  readonly amount: number;
  readonly unit: TimeUnit;
}

/** A length of time counted in combat rounds. */
export type Rounds = Brand<number, 'Rounds'>;

/** Rounds per unit: a minute is 60 s / 6 s; an hour 60 minutes; a day 24 hours. */
export const ROUNDS_PER_UNIT = {
  round: 1,
  minute: 60 / SECONDS_PER_ROUND,
  hour: (60 * 60) / SECONDS_PER_ROUND,
  day: (24 * 60 * 60) / SECONDS_PER_ROUND,
} as const satisfies Readonly<Record<TimeUnit, number>>;

/** Total: every printed span has a length in rounds. */
export function toRounds(span: TimeSpan): Rounds {
  nonNegativeFinite(span.amount, 'TimeSpan amount');
  return (span.amount * ROUNDS_PER_UNIT[span.unit]) as Rounds;
}

/* ==========================================================================
 * AREA OF EFFECT
 * ========================================================================== */

/**
 * The six shapes the Area of Effect glossary entry names
 * (docs/srd/full/srd-5.2.1.txt:11331-11351@left): Cone, Cube, Cylinder,
 * Emanation, Line and Sphere. `rule-index.ts` checks at compile time that this
 * list is exactly the index's `area_of_effect` entries.
 */
export const AREA_SHAPES = ['cone', 'cube', 'cylinder', 'emanation', 'line', 'sphere'] as const;
export type AreaShape = (typeof AREA_SHAPES)[number];

/** An area of effect with the dimensions its glossary entry says the effect specifies. */
export type AreaOfEffect =
  | { readonly shape: 'cone'; readonly length: Feet }
  | { readonly shape: 'cube'; readonly size: Feet }
  | { readonly shape: 'cylinder'; readonly radius: Feet; readonly height: Feet }
  | { readonly shape: 'emanation'; readonly distance: Feet }
  | { readonly shape: 'line'; readonly length: Feet; readonly width: Feet }
  | { readonly shape: 'sphere'; readonly radius: Feet };

/* ==========================================================================
 * DAMAGE TYPE
 * ========================================================================== */

/**
 * The thirteen rows of the Damage Types table in the Rules Glossary
 * (docs/srd/full/srd-5.2.1.txt:11610-11621@left and 11565-11575@right).
 * Closed: the SRD has no other damage type. Homebrew passthrough belongs at the
 * import boundary (`enums.ts` `DamageType`), never in SRD data.
 */
export const DAMAGE_TYPES = [
  'Acid',
  'Bludgeoning',
  'Cold',
  'Fire',
  'Force',
  'Lightning',
  'Necrotic',
  'Piercing',
  'Poison',
  'Psychic',
  'Radiant',
  'Slashing',
  'Thunder',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

/* ==========================================================================
 * CONDITION
 * ========================================================================== */

/**
 * The fifteen [Condition] entries of the Rules Glossary, in its order.
 * `rule-index.ts` checks at compile time that this is exactly the generated
 * index's `condition` names, so the list cannot drift from the SRD text.
 */
export const CONDITION_NAMES = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Exhaustion',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
] as const;
export type ConditionName = (typeof CONDITION_NAMES)[number];

/* ==========================================================================
 * ACTION ECONOMY
 * ========================================================================== */

/**
 * What a turn offers besides movement: one action, one Bonus Action (when a
 * feature grants one), one Reaction per round, and one free interaction with an
 * object or feature of the environment during the move or the action
 * ("Interacting with Things", docs/srd/full/srd-5.2.1.txt:796-804@right; a
 * second interaction takes the Utilize action).
 */
export const ECONOMY_SLOTS = ['action', 'bonus_action', 'reaction', 'object_interaction'] as const;
export type EconomySlot = (typeof ECONOMY_SLOTS)[number];
/** What something costs to use: a slot, or nothing ("no action required"). */
export type EconomyCost = EconomySlot | 'none';

/* ==========================================================================
 * USAGE AND RECHARGE
 * ========================================================================== */

/**
 * The stat-block Limited Usage notations (Running a Monster,
 * docs/srd/full/srd-5.2.1.txt:16718-16744@right). Counted over the full text:
 * `Recharge 5–6` 68 times, `Recharge 6` 14, `Recharge 4–6` 5; `X/Day` for X in
 * 1..6, with `Each` for spell lists and `, or Y/Day in Lair` (3→4, 4→5).
 */
export const RECHARGE_MINIMUMS = [4, 5, 6] as const;
export type RechargeMinimum = (typeof RECHARGE_MINIMUMS)[number];
export const PER_DAY_USES = [1, 2, 3, 4, 5, 6] as const;
export type PerDayUses = (typeof PER_DAY_USES)[number];

/**
 * How many uses a feature has before it is regained by a rest (Rules
 * Glossary and class text): a printed number, a number equal to the Proficiency
 * Bonus ("a number of times equal to your Proficiency Bonus"), an ability
 * modifier with the SRD's floor of one ("equal to your Wisdom modifier
 * (minimum of once)"), or a column of the owning class's Features table ("the
 * number of times shown for your Barbarian level in the Rages column").
 */
export type UsesFormula =
  | { readonly kind: 'fixed'; readonly uses: number }
  | { readonly kind: 'proficiency_bonus' }
  | { readonly kind: 'ability_modifier'; readonly ability: Ability; readonly minimum: 1 }
  | { readonly kind: 'class_table' };

/**
 * What a Short Rest regains. A Long Rest regains every use in every form the
 * SRD prints: "you regain one expended use when you finish a Short Rest, and
 * you regain all expended uses when you finish a Long Rest" (`one`); "you
 * regain all expended uses when you finish a Long Rest" and "you can't use it
 * again until you finish a Long Rest" (`none`); "...a Short or Long Rest"
 * (`all`). The vocabulary test re-reads every such sentence.
 */
export const SHORT_REST_REGAINS = ['none', 'one', 'all'] as const;
export type ShortRestRegain = (typeof SHORT_REST_REGAINS)[number];

export type Usage =
  | { readonly kind: 'at_will' }
  /** `X/Day`: X uses, regained on a Long Rest; `each` for `X/Day Each`. */
  | { readonly kind: 'per_day'; readonly uses: PerDayUses; readonly each: boolean; readonly inLair: PerDayUses | null }
  /** `Recharge X–6`: one use; at the start of each of its turns a 1d6 of X or more regains it, as does a Short or Long Rest. */
  | { readonly kind: 'recharge_roll'; readonly minimum: RechargeMinimum }
  /** `Recharge after a Short or Long Rest`: one use, regained by either rest. */
  | { readonly kind: 'recharge_after_rest' }
  /** A class, species or feat feature's uses, regained by rests. */
  | { readonly kind: 'per_rest'; readonly uses: UsesFormula; readonly shortRest: ShortRestRegain }
  /**
   * A magic item's charges: it "has N charges" and regains some daily at dawn.
   * Every regain the SRD prints is daily at dawn (The Next Dawn, Magic Items).
   */
  | { readonly kind: 'charges'; readonly charges: number; readonly regain: ChargeRegain; readonly at: 'dawn' };

/**
 * What a charged item regains: a printed dice expression ("regains 1d6 + 1
 * expended charges"), a printed number ("regains 1 expended charge"), or every
 * charge ("regain all expended charges").
 */
export type ChargeRegain =
  | { readonly kind: 'dice'; readonly dice: DiceExpression }
  | { readonly kind: 'fixed'; readonly charges: number }
  | { readonly kind: 'all' };

/* ==========================================================================
 * DIFFICULT TERRAIN, WHILE FLYING — A HOUSE RULE (owner D921 Q3)
 * ========================================================================== */

/**
 * SRD 5.2.1 has no rule that flying ignores difficult terrain; the owner ruled
 * one (D921 Q3, "Yes, tag ground/volume/creature (Recommended)", a house
 * ruling beside D905). Every difficult-terrain source carries one closed tag:
 * - `ground`: rubble, snow, undergrowth, furniture, ground-based magic such as
 *   Spike Growth — ignored while flying;
 * - `volume`: an effect filling a 3-D volume in the air or stating a height
 *   (Web's cube, Fog Cloud, Sleet Storm) — applies to flyers;
 * - `creature`: another creature's space — applies; the 2-D engine has no
 *   heights, so passing through a square is not flying over it.
 * Data only here; MOVE-COST with MOVEMENT-MODES executes it
 * (src/rules/srd/owner-rulings.ts `flyer-terrain-tags`).
 */
export const DIFFICULT_TERRAIN_TAGS = ['ground', 'volume', 'creature'] as const;
export type DifficultTerrainTag = (typeof DIFFICULT_TERRAIN_TAGS)[number];

export const DIFFICULT_TERRAIN_APPLIES_WHILE_FLYING = {
  ground: false,
  volume: true,
  creature: true,
} as const satisfies { readonly [T in DifficultTerrainTag]: boolean };

/* ==========================================================================
 * DICE
 * ========================================================================== */

/**
 * THE DIE SIZES: the ONE list for rule data and for planning (owner D920, "Add
 * d3 everywhere", which reopened D34's planner list of 4, 6, 8, 10, 12, 20 and
 * 100). It is exactly the sizes the SRD text prints in dice expressions,
 * counted over docs/srd/full/srd-5.2.1.txt: d3 19 times (trap darts, magic
 * item charges), d4 232, d6 570, d8 499, d10 371, d12 93, d20 69, d100 31. No
 * other size occurs. The planner's die control, the damage-probability folds
 * (src/simulation/probability.ts) and the sourced subsets in `enums.ts`
 * (`hitDieSizes`, `martialArtsDieSizes`) all use it.
 */
export const DIE_SIZES = [3, 4, 6, 8, 10, 12, 20, 100] as const;
export type DieSize = (typeof DIE_SIZES)[number];

/** `count` dice of one size: `2d6` is `{ count: 2, sides: 6 }`. */
export interface Dice<S extends DieSize = DieSize> {
  readonly count: number;
  readonly sides: S;
}

/** A printed dice expression: one or more dice terms and a flat modifier (`2d6 + 3`, `1d8 + 1d6`). */
export interface DiceExpression {
  readonly dice: readonly [Dice, ...Dice[]];
  readonly modifier: number;
}

export function isDieSize(value: number): value is DieSize {
  return (DIE_SIZES as readonly number[]).includes(value);
}

/**
 * Reads a printed dice expression (`1d3`, `2d6 + 3`, `1d8 + 1d6 − 1`, the SRD's
 * minus sign included), or returns `null`. A die size the SRD never prints is
 * `null`, not a guess.
 */
export function parseDiceExpression(text: string): DiceExpression | null {
  const terms = text.trim().replaceAll('−', '-').split(/\s*([+-])\s*/);
  const dice: Dice[] = [];
  let modifier = 0;
  let sign = 1;
  for (const [index, term] of terms.entries()) {
    if (index % 2 === 1) {
      sign = term === '-' ? -1 : 1;
      continue;
    }
    const die = /^(\d+)d(\d+)$/.exec(term);
    if (die !== null) {
      const count = Number(die[1]);
      const sides = Number(die[2]);
      if (sign < 0 || count < 1 || !isDieSize(sides)) {
        return null;
      }
      dice.push({ count, sides });
      continue;
    }
    if (!/^\d+$/.test(term) || index === 0) {
      return null;
    }
    modifier += sign * Number(term);
  }
  const [first, ...rest] = dice;
  return first === undefined ? null : { dice: [first, ...rest], modifier };
}
