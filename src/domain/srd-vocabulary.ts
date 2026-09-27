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
 * Duplicates, and when each one goes (see the RULE-INDEX unit's report):
 * - NOW, as the definition: `Feet` and `feet()` (combat `values.ts` re-exports
 *   them), `conditionNames`/`ConditionName` (combat `conditions.ts` re-exports
 *   them), `damageTypes`/`KnownDamageType` and `KnownConditionType` (domain
 *   `enums.ts`; its duplicate `conditionTypes` list is deleted).
 * - LATER, pinned equal by compile-time checks until then
 *   (tests/unit/domain/srd-vocabulary.test.ts): the engine's `AreaTemplate`
 *   shapes (templates.ts) and `ActionCost` (events.ts).
 * - LATER, and deliberately different today: the engine's open
 *   `DamageType = Brand<string>` and `DieSides` (values.ts), the stat-block
 *   recharge literal (statblock.ts), the planner's owner-chosen `dieSizes`
 *   (enums.ts, D34: no d3), and the database's four-shape `spellAreaShapes`
 *   (enums.ts; the Part A rule asks for six).
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

export type Usage =
  | { readonly kind: 'at_will' }
  /** `X/Day`: X uses, regained on a Long Rest; `each` for `X/Day Each`. */
  | { readonly kind: 'per_day'; readonly uses: PerDayUses; readonly each: boolean; readonly inLair: PerDayUses | null }
  /** `Recharge X–6`: one use; at the start of each of its turns a 1d6 of X or more regains it, as does a Short or Long Rest. */
  | { readonly kind: 'recharge_roll'; readonly minimum: RechargeMinimum }
  /** `Recharge after a Short or Long Rest`: one use, regained by either rest. */
  | { readonly kind: 'recharge_after_rest' };

/* ==========================================================================
 * DICE
 * ========================================================================== */

/**
 * The die sizes the SRD text prints in dice expressions, counted over
 * docs/srd/full/srd-5.2.1.txt: d3 19 times (trap darts, magic item charges),
 * d4 232, d6 570, d8 499, d10 371, d12 93, d20 69, d100 31. No other size
 * occurs. This is a DIFFERENT list from the planner's `dieSizes` in
 * `enums.ts`, which the owner closed without d3 (D34); whether the two merge is
 * an owner question recorded by the RULE-INDEX unit.
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
