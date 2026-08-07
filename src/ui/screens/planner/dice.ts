import type { Ability, DieSize } from '../../../domain/enums';
import { dieSizes, isDieSize } from '../../../domain/enums';
import type { WorkspaceSlot } from '../../../domain/read-models';

export type RollMode = 'normal' | 'advantage' | 'disadvantage';
export type DamageProfile =
  | 'basic'
  | 'sorcerous-burst'
  | 'chromatic-orb';

export type DamageRollKind = 'weapon' | 'spell';

declare const promotedDieOutcomeBrand: unique symbol;

export type PromotedDieOutcome = number & {
  readonly [promotedDieOutcomeBrand]: true;
};

export function promotedDieOutcome(
  value: number,
  dieSize: DieSize | null,
): PromotedDieOutcome {
  if (!Number.isFinite(value)) {
    throw new Error(
      `Promoted die outcome must be finite; received ${String(value)}.`,
    );
  }
  if (!Number.isInteger(value)) {
    throw new Error(
      `Promoted die outcome must be an integer; received ${String(value)}.`,
    );
  }
  if (value < 2) {
    throw new Error(
      `Promoted die outcome must be at least 2; received ${String(value)}.`,
    );
  }
  const maximum = dieSize ?? 100;
  if (value > maximum) {
    throw new Error(
      `Promoted die outcome must be no greater than d${String(maximum)}; received ${String(value)}.`,
    );
  }
  return value as PromotedDieOutcome;
}

export interface DieUpgrade {
  promotedOutcomes: readonly number[];
  promotedTo: PromotedDieOutcome;
  appliesTo: DamageRollKind | 'all';
  dieSize: DieSize | null;
}

export interface DiceConfig {
  profile: DamageProfile;
  armorClass: number;
  attackBonus: number;
  rollMode: RollMode;
  halflingLuck: boolean;
  luckyFeat: boolean;
  tripleAdvantage: boolean;
  bless: boolean;
  bane: boolean;
  dieUpgrade: DieUpgrade | null;
  resistanceBypass: boolean;
  resistance: boolean;
  vulnerability: boolean;
  basicDice: number;
  /**
   * THE DIE THE USER PICKED, AS A `DieSize` AND NOT A `number`.
   *
   * This field had TWO answers in this one file. The `<select>` below offers
   * `dieSizes`; the read-back clamped `boundedInteger(…, 2, 100)`, an integer
   * RANGE that accepts 3, 7, 13 and 99. The browser could not reach the
   * disagreement — the select is the only writer of `.value` — but this
   * interface is EXPORTED and the unit tests build it directly, and
   * `ordinaryDamage` loops `face = 1..size` over whatever arrives. A 7 produced
   * a real, plausible, wrong expected-damage figure with nothing to catch it.
   */
  basicDieSize: DieSize;
  damageModifier: number;
  sorcerousBaseDice: number;
  explosionCap: number;
  chromaticSlotLevel: number;
}

export interface AttackProbabilities {
  miss: number;
  normalHit: number;
  criticalHit: number;
  totalHit: number;
}

export interface ExactResult extends AttackProbabilities {
  expectedDamage: number;
  expectedDamageOnAnyHit: number;
  expectedTargetsHit: number;
  chanceToLeap: number;
  normalDamage: number;
  criticalDamage: number;
  normalLeapChance: number;
  criticalLeapChance: number;
  expectedSorcerousExtraDice: number;
}

export interface DieTrace {
  initial: number;
  reroll: number | null;
  final: number;
}

export interface DamageDieTrace {
  raw: number;
  value: number;
  added: boolean;
}

export interface RolledAttack {
  d20: DieTrace[];
  chosenD20: number;
  bless: number | null;
  bane: number | null;
  total: number;
  outcome: 'miss' | 'hit' | 'critical';
  damageDice: DamageDieTrace[];
  damageModifier: number;
  damageBeforeDefense: number;
  damage: number;
  triggeredLeap: boolean;
}

export interface SeededRollResult {
  token: string;
  attacks: RolledAttack[];
  totalDamage: number;
  stopReason: 'miss' | 'no-leap' | 'leap-limit' | 'single-attack';
}

type Distribution = Map<number, number>;

function add(
  distribution: Distribution,
  value: number,
  probability: number,
): void {
  distribution.set(
    value,
    (distribution.get(value) ?? 0) + probability,
  );
}

function effectiveMode(config: DiceConfig): RollMode {
  const circumstance =
    config.rollMode === 'advantage'
      ? 1
      : config.rollMode === 'disadvantage'
        ? -1
        : 0;
  const net = circumstance + (config.luckyFeat ? 1 : 0);
  return net > 0 ? 'advantage' : net < 0 ? 'disadvantage' : 'normal';
}

function oneD20(halflingLuck: boolean): Distribution {
  const result = new Map<number, number>();
  if (!halflingLuck) {
    for (let face = 1; face <= 20; face += 1) {
      result.set(face, 1 / 20);
    }
    return result;
  }
  result.set(1, 1 / 400);
  for (let face = 2; face <= 20; face += 1) {
    result.set(face, 21 / 400);
  }
  return result;
}

function selectedD20(config: DiceConfig): Distribution {
  const die = oneD20(config.halflingLuck);
  const mode = effectiveMode(config);
  const count =
    mode === 'normal'
      ? 1
      : mode === 'advantage' && config.tripleAdvantage
        ? 3
        : 2;
  let states: Array<{ faces: number[]; probability: number }> = [
    { faces: [], probability: 1 },
  ];
  for (let index = 0; index < count; index += 1) {
    const next: typeof states = [];
    for (const state of states) {
      for (const [face, probability] of die) {
        next.push({
          faces: [...state.faces, face],
          probability: state.probability * probability,
        });
      }
    }
    states = next;
  }
  const result = new Map<number, number>();
  for (const state of states) {
    add(
      result,
      mode === 'disadvantage'
        ? Math.min(...state.faces)
        : Math.max(...state.faces),
      state.probability,
    );
  }
  return result;
}

function d4Modifier(config: DiceConfig): Distribution {
  let result = new Map<number, number>([[0, 1]]);
  for (const sign of [
    config.bless ? 1 : 0,
    config.bane ? -1 : 0,
  ]) {
    if (sign === 0) continue;
    const next = new Map<number, number>();
    for (const [current, probability] of result) {
      for (let face = 1; face <= 4; face += 1) {
        add(next, current + sign * face, probability / 4);
      }
    }
    result = next;
  }
  return result;
}

export function attackProbabilities(
  config: DiceConfig,
): AttackProbabilities {
  let miss = 0;
  let normalHit = 0;
  let criticalHit = 0;
  for (const [natural, naturalProbability] of selectedD20(config)) {
    for (const [modifier, modifierProbability] of d4Modifier(config)) {
      const probability = naturalProbability * modifierProbability;
      if (natural === 1) miss += probability;
      else if (natural === 20) criticalHit += probability;
      else if (
        natural + config.attackBonus + modifier >=
        config.armorClass
      ) {
        normalHit += probability;
      } else miss += probability;
    }
  }
  return {
    miss,
    normalHit,
    criticalHit,
    totalHit: normalHit + criticalHit,
  };
}

function dieValue(
  raw: number,
  size: DieSize,
  kind: DamageRollKind,
  upgrade: DieUpgrade | null,
): number {
  if (
    upgrade === null ||
    (upgrade.appliesTo !== 'all' && upgrade.appliesTo !== kind) ||
    (upgrade.dieSize !== null && upgrade.dieSize !== size) ||
    upgrade.promotedTo <= raw ||
    upgrade.promotedTo > size ||
    !upgrade.promotedOutcomes.includes(raw)
  ) {
    return raw;
  }
  return upgrade.promotedTo;
}

function adjustedDamage(total: number, config: DiceConfig): number {
  let result = Math.max(0, total);
  if (config.resistance && !config.resistanceBypass) {
    result = Math.floor(result / 2);
  }
  if (config.vulnerability) result *= 2;
  return result;
}

function ordinaryDamage(
  count: number,
  size: DieSize,
  modifier: number,
  kind: DamageRollKind,
  config: DiceConfig,
): number {
  let sums = new Map<number, number>([[0, 1]]);
  for (let die = 0; die < count; die += 1) {
    const next = new Map<number, number>();
    for (const [sum, probability] of sums) {
      for (let face = 1; face <= size; face += 1) {
        add(
          next,
          sum + dieValue(face, size, kind, config.dieUpgrade),
          probability / size,
        );
      }
    }
    sums = next;
  }
  let expected = 0;
  for (const [sum, probability] of sums) {
    expected += adjustedDamage(sum + modifier, config) * probability;
  }
  return expected;
}

function combination(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - k + index)) / index;
  }
  return result;
}

export function sorcerousExpectedExtraDice(
  baseDice: number,
  cap: number,
  dieUpgrade: DieUpgrade | null = null,
): number {
  if (baseDice <= 0 || cap <= 0) return 0;
  let triggeringFaces = 0;
  for (let face = 1; face <= 8; face += 1) {
    if (dieValue(face, 8, 'spell', dieUpgrade) === 8) {
      triggeringFaces += 1;
    }
  }
  const success = triggeringFaces / 8;
  const failure = 1 - success;
  let expected = 0;
  let cumulativeBelow = 0;
  for (let k = 1; k <= cap; k += 1) {
    const successes = k - 1;
    cumulativeBelow +=
      combination(successes + baseDice - 1, successes) *
      failure ** baseDice *
      success ** successes;
    expected += 1 - cumulativeBelow;
  }
  return expected;
}

export function sorcerousExpectedRawDamage(
  baseDice: number,
  cap: number,
  dieUpgrade: DieUpgrade | null,
): number {
  let mean = 0;
  for (let face = 1; face <= 8; face += 1) {
    mean += dieValue(face, 8, 'spell', dieUpgrade) / 8;
  }
  return (
    baseDice + sorcerousExpectedExtraDice(baseDice, cap, dieUpgrade)
  ) * mean;
}

function sorcerousDamage(
  baseDice: number,
  cap: number,
  config: DiceConfig,
): number {
  type State = {
    remaining: number;
    extras: number;
    sum: number;
    probability: number;
  };
  let states: State[] = [
    { remaining: baseDice, extras: 0, sum: 0, probability: 1 },
  ];
  const finished = new Map<number, number>();
  while (states.length > 0) {
    const next = new Map<string, State>();
    for (const state of states) {
      if (state.remaining === 0) {
        add(finished, state.sum, state.probability);
        continue;
      }
      for (let face = 1; face <= 8; face += 1) {
        const value = dieValue(
          face,
          8,
          'spell',
          config.dieUpgrade,
        );
        const addsDie = value === 8 && state.extras < cap;
        const candidate: State = {
          remaining: state.remaining - 1 + (addsDie ? 1 : 0),
          extras: state.extras + (addsDie ? 1 : 0),
          sum: state.sum + value,
          probability: state.probability / 8,
        };
        const key = `${candidate.remaining}:${candidate.extras}:${candidate.sum}`;
        const existing = next.get(key);
        if (existing) existing.probability += candidate.probability;
        else next.set(key, candidate);
      }
    }
    states = [...next.values()];
  }
  let expected = 0;
  for (const [sum, probability] of finished) {
    expected += adjustedDamage(sum, config) * probability;
  }
  return expected;
}

export function chromaticLeapChance(
  dice: number,
  dieUpgrade: DieUpgrade | null,
): number {
  let unique = new Map<number, number>([[0, 1]]);
  for (let die = 0; die < dice; die += 1) {
    const next = new Map<number, number>();
    for (const [mask, probability] of unique) {
      for (let face = 1; face <= 8; face += 1) {
        const bit = 1 << dieValue(face, 8, 'spell', dieUpgrade);
        if ((mask & bit) === 0) add(next, mask | bit, probability / 8);
      }
    }
    unique = next;
  }
  return (
    1 -
    [...unique.values()].reduce(
      (sum, probability) => sum + probability,
      0,
    )
  );
}

function profileDamage(config: DiceConfig, critical: boolean): number {
  const multiplier = critical ? 2 : 1;
  if (config.profile === 'sorcerous-burst') {
    return sorcerousDamage(
      config.sorcerousBaseDice * multiplier,
      config.explosionCap,
      config,
    );
  }
  if (config.profile === 'chromatic-orb') {
    return ordinaryDamage(
      (config.chromaticSlotLevel + 2) * multiplier,
      8,
      0,
      'spell',
      config,
    );
  }
  return ordinaryDamage(
    config.basicDice * multiplier,
    config.basicDieSize,
    config.damageModifier,
    'weapon',
    config,
  );
}

export function exactResult(config: DiceConfig): ExactResult {
  const attacks = attackProbabilities(config);
  const normalDamage = profileDamage(config, false);
  const criticalDamage = profileDamage(config, true);
  const oneAttackDamage =
    attacks.normalHit * normalDamage +
    attacks.criticalHit * criticalDamage;
  let expectedDamage = oneAttackDamage;
  let expectedTargetsHit = attacks.totalHit;
  let chanceToLeap = 0;
  let normalLeapChance = 0;
  let criticalLeapChance = 0;
  if (config.profile === 'chromatic-orb') {
    normalLeapChance = chromaticLeapChance(
      config.chromaticSlotLevel + 2,
      config.dieUpgrade,
    );
    criticalLeapChance = chromaticLeapChance(
      (config.chromaticSlotLevel + 2) * 2,
      config.dieUpgrade,
    );
    chanceToLeap =
      attacks.normalHit * normalLeapChance +
      attacks.criticalHit * criticalLeapChance;
    expectedDamage = 0;
    expectedTargetsHit = 0;
    let reach = 1;
    for (
      let attack = 0;
      attack <= config.chromaticSlotLevel;
      attack += 1
    ) {
      expectedDamage += reach * oneAttackDamage;
      expectedTargetsHit += reach * attacks.totalHit;
      reach *= chanceToLeap;
    }
  }
  return {
    ...attacks,
    expectedDamage,
    expectedDamageOnAnyHit:
      attacks.totalHit === 0
        ? 0
        : oneAttackDamage / attacks.totalHit,
    expectedTargetsHit,
    chanceToLeap,
    normalDamage,
    criticalDamage,
    normalLeapChance,
    criticalLeapChance,
    expectedSorcerousExtraDice:
      config.profile === 'sorcerous-burst'
        ? sorcerousExpectedExtraDice(
            config.sorcerousBaseDice,
            config.explosionCap,
            config.dieUpgrade,
          )
        : 0,
  };
}

function seededRandom(seed: string): () => number {
  let state = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    state ^= seed.charCodeAt(index);
    state = Math.imul(state, 16777619);
  }
  state >>>= 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function rollDie(random: () => number, size: number): number {
  return Math.floor(random() * size) + 1;
}

function tracedDie(
  random: () => number,
  size: number,
  halflingLuck: boolean,
): DieTrace {
  const initial = rollDie(random, size);
  const reroll =
    halflingLuck && initial === 1 ? rollDie(random, size) : null;
  return { initial, reroll, final: reroll ?? initial };
}

function rollAttack(
  config: DiceConfig,
  random: () => number,
): Omit<
  RolledAttack,
  | 'damageDice'
  | 'damageModifier'
  | 'damageBeforeDefense'
  | 'damage'
  | 'triggeredLeap'
> {
  const mode = effectiveMode(config);
  const d20 = [tracedDie(random, 20, config.halflingLuck)];
  if (mode !== 'normal') {
    d20.push(tracedDie(random, 20, config.halflingLuck));
  }
  let chosenD20: number;
  if (mode === 'advantage' && config.tripleAdvantage) {
    const first = d20[0]!;
    const second = d20[1]!;
    const lower = first.final <= second.final ? 0 : 1;
    const replacement = tracedDie(random, 20, config.halflingLuck);
    d20.push(replacement);
    chosenD20 = Math.max(
      d20[lower === 0 ? 1 : 0]!.final,
      replacement.final,
    );
  } else {
    const finals = d20.map((die) => die.final);
    chosenD20 =
      mode === 'disadvantage'
        ? Math.min(...finals)
        : Math.max(...finals);
  }
  const bless = config.bless ? rollDie(random, 4) : null;
  const bane = config.bane ? rollDie(random, 4) : null;
  const total =
    chosenD20 +
    config.attackBonus +
    (bless ?? 0) -
    (bane ?? 0);
  const outcome =
    chosenD20 === 1 ||
    (chosenD20 !== 20 && total < config.armorClass)
      ? 'miss'
      : chosenD20 === 20
        ? 'critical'
        : 'hit';
  return { d20, chosenD20, bless, bane, total, outcome };
}

function ordinaryRoll(
  count: number,
  size: DieSize,
  modifier: number,
  kind: DamageRollKind,
  config: DiceConfig,
  random: () => number,
) {
  const damageDice: DamageDieTrace[] = [];
  for (let die = 0; die < count; die += 1) {
    const raw = rollDie(random, size);
    damageDice.push({
      raw,
      value: dieValue(raw, size, kind, config.dieUpgrade),
      added: false,
    });
  }
  const damageBeforeDefense = Math.max(
    0,
    damageDice.reduce((sum, die) => sum + die.value, modifier),
  );
  return {
    damageDice,
    damageModifier: modifier,
    damageBeforeDefense,
    damage: adjustedDamage(damageBeforeDefense, config),
  };
}

function sorcerousRoll(
  baseDice: number,
  config: DiceConfig,
  random: () => number,
) {
  const damageDice: DamageDieTrace[] = [];
  let remaining = baseDice;
  let extras = 0;
  while (remaining > 0) {
    remaining -= 1;
    const raw = rollDie(random, 8);
    const value = dieValue(raw, 8, 'spell', config.dieUpgrade);
    damageDice.push({
      raw,
      value,
      added: damageDice.length >= baseDice,
    });
    if (value === 8 && extras < config.explosionCap) {
      extras += 1;
      remaining += 1;
    }
  }
  const damageBeforeDefense = damageDice.reduce(
    (sum, die) => sum + die.value,
    0,
  );
  return {
    damageDice,
    damageModifier: 0,
    damageBeforeDefense,
    damage: adjustedDamage(damageBeforeDefense, config),
  };
}

export function seededRoll(
  config: DiceConfig,
  token: string,
): SeededRollResult {
  const random = seededRandom(token);
  const attacks: RolledAttack[] = [];
  const maximum =
    config.profile === 'chromatic-orb'
      ? config.chromaticSlotLevel + 1
      : 1;
  let stopReason: SeededRollResult['stopReason'] =
    config.profile === 'chromatic-orb'
      ? 'leap-limit'
      : 'single-attack';
  for (let index = 0; index < maximum; index += 1) {
    const attack = rollAttack(config, random);
    if (attack.outcome === 'miss') {
      attacks.push({
        ...attack,
        damageDice: [],
        damageModifier: 0,
        damageBeforeDefense: 0,
        damage: 0,
        triggeredLeap: false,
      });
      stopReason = 'miss';
      break;
    }
    const multiplier = attack.outcome === 'critical' ? 2 : 1;
    const rolled =
      config.profile === 'sorcerous-burst'
        ? sorcerousRoll(
            config.sorcerousBaseDice * multiplier,
            config,
            random,
          )
        : config.profile === 'chromatic-orb'
          ? ordinaryRoll(
              (config.chromaticSlotLevel + 2) * multiplier,
              8,
              0,
              'spell',
              config,
              random,
            )
          : ordinaryRoll(
              config.basicDice * multiplier,
              config.basicDieSize,
              config.damageModifier,
              'weapon',
              config,
              random,
            );
    const values = rolled.damageDice.map((die) => die.value);
    const matched =
      config.profile === 'chromatic-orb' &&
      new Set(values).size < values.length;
    const canLeap = index < maximum - 1;
    attacks.push({
      ...attack,
      ...rolled,
      triggeredLeap: matched && canLeap,
    });
    if (config.profile === 'chromatic-orb' && !matched) {
      stopReason = 'no-leap';
      break;
    }
    if (config.profile === 'chromatic-orb' && !canLeap) break;
  }
  return {
    token,
    attacks,
    totalDamage: attacks.reduce(
      (sum, attack) => sum + attack.damage,
      0,
    ),
    stopReason,
  };
}

export function defaultDiceConfig(): DiceConfig {
  return {
    profile: 'sorcerous-burst',
    armorClass: 15,
    attackBonus: 5,
    rollMode: 'normal',
    halflingLuck: false,
    luckyFeat: false,
    tripleAdvantage: false,
    bless: false,
    bane: false,
    dieUpgrade: null,
    resistanceBypass: false,
    resistance: false,
    vulnerability: false,
    basicDice: 1,
    basicDieSize: DEFAULT_BASIC_DIE_SIZE,
    damageModifier: 0,
    sorcerousBaseDice: 1,
    explosionCap: 3,
    chromaticSlotLevel: 1,
  };
}

function labeledInput(
  label: string,
  input: HTMLInputElement | HTMLSelectElement,
): HTMLLabelElement {
  const wrapper = document.createElement('label');
  wrapper.className = 'planner-field';
  const caption = document.createElement('span');
  caption.textContent = label;
  wrapper.append(caption, input);
  return wrapper;
}

function boundedInteger(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.min(
    maximum,
    Math.max(
      minimum,
      Math.trunc(Number.isFinite(value) ? value : minimum),
    ),
  );
}

/**
 * The die the calculator opens on, and the one it falls back to.
 *
 * d8 for no deeper reason than that it is the middle of the printed weapon
 * dice; this is a calculator input tied to no SRD content and to no character,
 * so there is nothing to cite and nothing is claimed.
 */
export const DEFAULT_BASIC_DIE_SIZE: DieSize = 8;

/**
 * Reads the die-size `<select>` back as a member of the vocabulary it renders.
 *
 * A non-member cannot come from the control — the user picks, and cannot type —
 * so this is not tolerating bad input; it is refusing to state a `number` where
 * the only reachable values are seven. The fallback is the same constant the
 * control opens on, so an unreadable value and a fresh page agree.
 */
export function selectedDieSize(raw: string): DieSize {
  const parsed = Number(raw);
  return isDieSize(parsed) ? parsed : DEFAULT_BASIC_DIE_SIZE;
}

function selectedUpgradeOutcomes(
  raw: string,
  promotedTo: PromotedDieOutcome,
): readonly number[] {
  return [
    ...new Set(
      raw
        .split(',')
        .map((value) => Number(value.trim()))
        .filter(
          (value) =>
            Number.isInteger(value) && value >= 1 && value < promotedTo,
        ),
    ),
  ];
}

function signedLabel(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

function percent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function metricNode(label: string, value: string): HTMLElement {
  const wrapper = document.createElement('div');
  const term = document.createElement('dt');
  term.textContent = label;
  const description = document.createElement('dd');
  description.textContent = value;
  wrapper.append(term, description);
  return wrapper;
}

export function renderDiceHelper(
  slots: readonly WorkspaceSlot[],
  characterLevel: number | null,
  abilities: Readonly<Record<Ability, number>>,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel dice-helper';
  section.setAttribute('aria-labelledby', 'dice-helper-title');
  section.innerHTML =
    '<div class="panel-heading"><div><h2 id="dice-helper-title">At-the-table dice calculator</h2><p>Exact odds, quick live rolls, and a replay token for every result.</p></div><span class="badge badge-ok">No simulation</span></div>';
  if (characterLevel === null) {
    const message = document.createElement('p');
    message.textContent =
      'Dice calculations that depend on character level are unavailable until a class is selected.';
    section.append(message);
    return section;
  }
  const config = defaultDiceConfig();
  config.sorcerousBaseDice =
    characterLevel >= 17
      ? 4
      : characterLevel >= 11
        ? 3
        : characterLevel >= 5
          ? 2
          : 1;
  const controls = document.createElement('div');
  controls.className = 'dice-controls';
  const profile = document.createElement('select');
  profile.append(
    new Option('Sorcerous Burst (2024)', 'manual-sorcerous-burst'),
    new Option('Chromatic Orb (2024)', 'manual-chromatic-orb'),
    new Option('Basic weapon attack', 'basic'),
  );
  const selectedSpellOptions = slots.filter(
    (slot) =>
      slot.spell_edition === '2024' &&
      slot.attack_bonus !== null &&
      ['Sorcerous Burst', 'Chromatic Orb'].includes(
        slot.spell_name ?? '',
      ),
  );
  if (selectedSpellOptions.length > 0) {
    const group = document.createElement('optgroup');
    group.label = 'Selected spells — uses character bonus';
    for (const slot of selectedSpellOptions) {
      group.append(
        new Option(
          `${slot.spell_name} · ${slot.source} · ${signedLabel(
            slot.attack_bonus ?? 0,
          )}`,
          `slot:${slot.id}`,
        ),
      );
    }
    profile.append(group);
  }
  const ac = document.createElement('input');
  ac.type = 'number';
  ac.min = '1';
  ac.max = '40';
  ac.value = '15';
  const bonus = document.createElement('input');
  bonus.type = 'number';
  bonus.min = '-10';
  bonus.max = '30';
  bonus.value = '5';
  const mode = document.createElement('select');
  mode.innerHTML =
    '<option value="normal">Normal</option><option value="advantage">Advantage</option><option value="disadvantage">Disadvantage</option>';
  const profileField = labeledInput('Attack profile', profile);
  profileField.classList.add('dice-profile-field');
  controls.append(
    profileField,
    labeledInput('Target AC', ac),
    labeledInput('Attack bonus', bonus),
    labeledInput('d20 mode', mode),
  );

  const selectedSource = document.createElement('small');
  selectedSource.className = 'dice-selected-source';
  const slotLevel = document.createElement('input');
  slotLevel.type = 'number';
  slotLevel.min = '1';
  slotLevel.max = '9';
  slotLevel.value = '1';
  const slotLevelField = labeledInput('Spell slot level', slotLevel);
  const explosionCap = document.createElement('input');
  explosionCap.type = 'number';
  explosionCap.min = '0';
  explosionCap.max = '10';
  explosionCap.value = '3';
  const explosionCapField = labeledInput('Added-d8 cap', explosionCap);
  const burstBase = document.createElement('small');
  burstBase.className = 'dice-field-note';
  explosionCapField.append(burstBase);
  const basicAbility = document.createElement('select');
  for (const ability of [
    'strength',
    'dexterity',
    'intelligence',
    'wisdom',
    'charisma',
  ] as const) {
    basicAbility.append(
      new Option(
        ability[0]!.toUpperCase() + ability.slice(1),
        ability,
      ),
    );
  }
  basicAbility.value = 'dexterity';
  const basicAbilityField = labeledInput('Attack ability', basicAbility);
  const basicDice = document.createElement('input');
  basicDice.type = 'number';
  basicDice.min = '1';
  basicDice.max = '20';
  basicDice.value = '1';
  const basicDiceField = labeledInput('Damage dice', basicDice);
  const basicDieSize = document.createElement('select');
  // THE OPTIONS ARE THE TYPE. Adding a size to `dieSizes` adds it here, and
  // there is no literal to forget: this loop WAS the only statement of the die
  // vocabulary anywhere in the application.
  for (const size of dieSizes) {
    basicDieSize.append(new Option(`d${String(size)}`, String(size)));
  }
  basicDieSize.value = String(DEFAULT_BASIC_DIE_SIZE);
  const basicDieSizeField = labeledInput('Die size', basicDieSize);
  const damageModifier = document.createElement('input');
  damageModifier.type = 'number';
  damageModifier.min = '-20';
  damageModifier.max = '40';
  damageModifier.value = '0';
  const damageModifierField = labeledInput(
    'Damage modifier',
    damageModifier,
  );
  const profileControls = document.createElement('div');
  profileControls.className = 'dice-profile-controls';
  profileControls.append(
    slotLevelField,
    explosionCapField,
    basicAbilityField,
    basicDiceField,
    basicDieSizeField,
    damageModifierField,
  );
  const bonusField = bonus.closest('label');
  bonusField?.append(selectedSource);

  const effects = document.createElement('div');
  effects.className = 'dice-effects';
  const effectInputs = new Map<
    keyof Pick<
      DiceConfig,
      | 'halflingLuck'
      | 'luckyFeat'
      | 'tripleAdvantage'
      | 'bless'
      | 'bane'
      | 'resistanceBypass'
      | 'resistance'
      | 'vulnerability'
    >,
    HTMLInputElement
  >();
  for (const [key, label] of [
    ['halflingLuck', 'Halfling Luck'],
    ['luckyFeat', 'Lucky feat: spend point'],
    ['tripleAdvantage', 'Triple Advantage'],
    ['bless', 'Bless +d4'],
    ['bane', 'Bane −d4'],
    ['resistanceBypass', 'Bypass Resistance'],
    ['resistance', 'Resistance'],
    ['vulnerability', 'Vulnerability'],
  ] as const) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.diceEffect = key;
    effectInputs.set(key, input);
    const labelNode = document.createElement('label');
    labelNode.append(input, ` ${label}`);
    effects.append(labelNode);
  }
  const dieUpgradeEnabled = document.createElement('input');
  dieUpgradeEnabled.type = 'checkbox';
  dieUpgradeEnabled.dataset.diceEffect = 'dieUpgrade';
  const dieUpgradeToggle = document.createElement('label');
  dieUpgradeToggle.append(dieUpgradeEnabled, ' Upgrade die outcomes');
  const upgradeOutcomes = document.createElement('input');
  upgradeOutcomes.type = 'text';
  upgradeOutcomes.value = '1';
  const upgradeTo = document.createElement('input');
  upgradeTo.type = 'number';
  upgradeTo.min = '2';
  upgradeTo.max = '100';
  upgradeTo.value = '2';
  const upgradeAppliesTo = document.createElement('select');
  upgradeAppliesTo.append(
    new Option('Weapon attack damage', 'weapon'),
    new Option('Spell damage', 'spell'),
    new Option('Weapon and spell damage', 'all'),
  );
  const upgradeDieSize = document.createElement('select');
  upgradeDieSize.append(new Option('Any', 'any'));
  for (const size of dieSizes) {
    upgradeDieSize.append(new Option(`d${String(size)}`, String(size)));
  }
  const dieUpgradeFields = [
    labeledInput('Promote outcomes', upgradeOutcomes),
    labeledInput('Promote to', upgradeTo),
    labeledInput('Roll scope', upgradeAppliesTo),
    labeledInput('Apply to die', upgradeDieSize),
  ];
  effects.append(dieUpgradeToggle, ...dieUpgradeFields);
  const metrics = document.createElement('dl');
  metrics.className = 'dice-metrics';
  const profileNote = document.createElement('p');
  profileNote.className = 'dice-profile-note';
  const seed = document.createElement('input');
  seed.value = 'table-night';
  seed.maxLength = 80;
  seed.setAttribute('aria-label', 'Dice seed');
  const sequenceInput = document.createElement('input');
  sequenceInput.type = 'number';
  sequenceInput.min = '1';
  sequenceInput.value = '1';
  sequenceInput.setAttribute('aria-label', 'Next roll number');
  const roll = document.createElement('button');
  roll.type = 'button';
  roll.className = 'button-primary';
  roll.textContent = 'Roll attack + damage';
  const live = document.createElement('section');
  live.className = 'dice-roll-result';
  live.setAttribute('aria-live', 'polite');
  live.hidden = true;
  const selectedSlot = (): WorkspaceSlot | null => {
    if (!profile.value.startsWith('slot:')) return null;
    const id = Number(profile.value.slice(5));
    return selectedSpellOptions.find((slot) => slot.id === id) ?? null;
  };
  const damageProfile = (): DamageProfile => {
    const slot = selectedSlot();
    if (
      slot?.spell_name === 'Sorcerous Burst' ||
      profile.value === 'manual-sorcerous-burst'
    ) {
      return 'sorcerous-burst';
    }
    if (
      slot?.spell_name === 'Chromatic Orb' ||
      profile.value === 'manual-chromatic-orb'
    ) {
      return 'chromatic-orb';
    }
    return 'basic';
  };
  const selectedAbilityModifier = (): number | null => {
    const ability = selectedSlot()?.ability;
    return ability === null || ability === undefined
      ? null
      : Math.floor(((abilities[ability] ?? 10) - 10) / 2);
  };
  const read = (): DiceConfig => {
    config.profile = damageProfile();
    config.armorClass = boundedInteger(Number(ac.value), 1, 40);
    config.attackBonus =
      selectedSlot()?.attack_bonus ??
      boundedInteger(Number(bonus.value), -10, 30);
    config.rollMode = mode.value as RollMode;
    for (const [key, input] of effectInputs) {
      config[key] = input.checked;
    }
    const netAdvantage =
      (config.rollMode === 'advantage'
        ? 1
        : config.rollMode === 'disadvantage'
          ? -1
          : 0) + (config.luckyFeat ? 1 : 0);
    const tripleAdvantageEligible =
      config.profile !== 'basic' ||
      ['dexterity', 'intelligence', 'wisdom', 'charisma'].includes(
        basicAbility.value,
      );
    config.tripleAdvantage =
      config.tripleAdvantage &&
      netAdvantage > 0 &&
      tripleAdvantageEligible;
    config.basicDice = boundedInteger(Number(basicDice.value), 1, 20);
    // NOT `boundedInteger(…, 2, 100)`. A clamp answers "how big may this be";
    // the question here is "which die is it", and the two gave different
    // answers about the same field. `basicDice` above IS a count and keeps its
    // clamp — the neighbours in this block are separate subjects and are not
    // folded in.
    config.basicDieSize = selectedDieSize(basicDieSize.value);
    const selectedUpgradeDieSize =
      upgradeDieSize.value === 'any'
        ? null
        : selectedDieSize(upgradeDieSize.value);
    const promotedTo = promotedDieOutcome(
      boundedInteger(
        Number(upgradeTo.value),
        2,
        selectedUpgradeDieSize ?? 100,
      ),
      selectedUpgradeDieSize,
    );
    config.dieUpgrade = dieUpgradeEnabled.checked
      ? {
          promotedOutcomes: selectedUpgradeOutcomes(
            upgradeOutcomes.value,
            promotedTo,
          ),
          promotedTo,
          appliesTo: upgradeAppliesTo.value as DieUpgrade['appliesTo'],
          dieSize: selectedUpgradeDieSize,
        }
      : null;
    config.damageModifier = boundedInteger(
      Number(damageModifier.value),
      -20,
      40,
    );
    config.explosionCap = boundedInteger(
      selectedAbilityModifier() ?? Number(explosionCap.value),
      0,
      10,
    );
    config.chromaticSlotLevel = boundedInteger(
      Number(slotLevel.value),
      1,
      9,
    );
    return config;
  };
  const update = (): void => {
    const selected = selectedSlot();
    const kind = damageProfile();
    const modifier = selectedAbilityModifier();
    bonus.disabled = selected !== null;
    selectedSource.textContent =
      selected === null ? '' : `From ${selected.source}`;
    slotLevelField.hidden = kind !== 'chromatic-orb';
    explosionCapField.hidden = kind !== 'sorcerous-burst';
    for (const field of [
      basicAbilityField,
      basicDiceField,
      basicDieSizeField,
      damageModifierField,
    ]) {
      field.hidden = kind !== 'basic';
    }
    explosionCap.disabled = modifier !== null;
    burstBase.textContent = `${config.sorcerousBaseDice} base d8${
      modifier === null
        ? ''
        : ` · ${selected?.ability?.slice(0, 3).toUpperCase()} modifier`
    }`;
    const lucky = effectInputs.get('luckyFeat')?.checked === true;
    const net =
      (mode.value === 'advantage'
        ? 1
        : mode.value === 'disadvantage'
          ? -1
          : 0) + (lucky ? 1 : 0);
    const tripleAdvantageEligible =
      kind !== 'basic' ||
      ['dexterity', 'intelligence', 'wisdom', 'charisma'].includes(
        basicAbility.value,
      );
    const tripleAdvantage = effectInputs.get('tripleAdvantage');
    if (tripleAdvantage !== undefined) {
      tripleAdvantage.disabled = net <= 0 || !tripleAdvantageEligible;
      if (tripleAdvantage.disabled) tripleAdvantage.checked = false;
    }
    for (const field of [
      upgradeOutcomes,
      upgradeTo,
      upgradeAppliesTo,
      upgradeDieSize,
    ]) {
      field.disabled = !dieUpgradeEnabled.checked;
    }
    const exact = exactResult(read());
    metrics.replaceChildren(
      metricNode('Hit chance', percent(exact.totalHit)),
      metricNode('Critical chance', percent(exact.criticalHit)),
      metricNode('Expected damage / cast', exact.expectedDamage.toFixed(2)),
      metricNode(
        kind === 'chromatic-orb'
          ? 'Expected targets hit'
          : 'Damage / hit',
        (kind === 'chromatic-orb'
          ? exact.expectedTargetsHit
          : exact.expectedDamageOnAnyHit
        ).toFixed(2),
      ),
    );
    if (kind === 'sorcerous-burst') {
      profileNote.textContent = `${config.sorcerousBaseDice}d8 base · ${exact.expectedSorcerousExtraDice.toFixed(2)} expected added d8s · critical doubles base dice, not the cap.`;
    } else if (kind === 'chromatic-orb') {
      profileNote.textContent = `${config.chromaticSlotLevel + 2}d8 · ${percent(exact.chanceToLeap)} chance the first attack both hits and leaps · at most ${config.chromaticSlotLevel} leap${config.chromaticSlotLevel === 1 ? '' : 's'}.`;
    } else {
      profileNote.textContent = '';
    }
    live.replaceChildren();
    live.hidden = true;
  };
  controls.addEventListener('change', update);
  profileControls.addEventListener('change', update);
  effects.addEventListener('change', update);
  roll.addEventListener('click', () => {
    const sequence = boundedInteger(
      Number(sequenceInput.value),
      1,
      Number.MAX_SAFE_INTEGER,
    );
    const token = `${seed.value.trim() || 'table'}:${sequence}`;
    sequenceInput.value = String(sequence + 1);
    const result = seededRoll(read(), token);
    const heading = document.createElement('h3');
    const targets = result.attacks.filter(
      (attack) => attack.outcome !== 'miss',
    ).length;
    heading.textContent = `${result.totalDamage} total damage · ${targets} target${targets === 1 ? '' : 's'} hit`;
    const replay = document.createElement('code');
    replay.textContent = `Replay ${result.token}`;
    const list = document.createElement('ol');
    list.className = 'dice-trace';
    for (const [index, attack] of result.attacks.entries()) {
      const item = document.createElement('li');
      const attackHeading = document.createElement('strong');
      attackHeading.textContent = `Target ${index + 1} · ${attack.outcome}`;
      const attackMath = document.createElement('p');
      attackMath.textContent = `d20 ${attack.d20
        .map((die) =>
          die.reroll === null
            ? String(die.initial)
            : `${die.initial}→${die.reroll}`,
        )
        .join(', ')} → ${attack.chosenD20} ${signedLabel(
        read().attackBonus,
      )}${
        attack.bless === null ? '' : ` + ${attack.bless}`
      }${attack.bane === null ? '' : ` − ${attack.bane}`} = ${attack.total}`;
      item.append(attackHeading, attackMath);
      if (attack.outcome !== 'miss') {
        const damage = document.createElement('p');
        damage.textContent = `Damage [${attack.damageDice
          .map(
            (die) =>
              `${die.added ? '+' : ''}${
                die.raw === die.value
                  ? die.raw
                  : `${die.raw}→${die.value}`
              }`,
          )
          .join(', ')}]${
          attack.damageModifier === 0
            ? ''
            : ` ${signedLabel(attack.damageModifier)}`
        } = ${attack.damageBeforeDefense} → ${attack.damage}${
          attack.triggeredLeap ? ' · leaps' : ''
        }`;
        item.append(damage);
      }
      list.append(item);
    }
    const stopped = document.createElement('p');
    stopped.className = 'dice-stop';
    stopped.textContent = `Stopped: ${result.stopReason.replaceAll(
      '-',
      ' ',
    )}. To replay, enter the token’s text before the final colon as Seed and its final number as Next #.`;
    live.append(heading, replay, list, stopped);
    live.hidden = false;
  });
  update();
  const actions = document.createElement('div');
  actions.className = 'dice-actions';
  actions.append(
    labeledInput('Seed', seed),
    labeledInput('Next #', sequenceInput),
    roll,
  );
  const assumptions = document.createElement('details');
  assumptions.className = 'dice-assumptions';
  assumptions.innerHTML =
    '<summary>Composition and table assumptions</summary><p>Order: net Advantage/Disadvantage → Halfling rerolls/Triple Advantage → Bless/Bane → critical doubles initial dice → configured die-outcome upgrades → spell triggers → total → Resistance (unless bypassed) → Vulnerability.</p><p>Chromatic Orb uses the same AC and checked attack effects for every new target, never retargets a creature, and stops after the slot-level leap limit. Checking Lucky assumes a Luck Point is available for each attack in a chain.</p>';
  section.append(
    controls,
    profileControls,
    effects,
    metrics,
    profileNote,
    actions,
    live,
    assumptions,
  );
  return section;
}
