export type RollMode = 'normal' | 'advantage' | 'disadvantage';
export type DamageProfile =
  | 'basic'
  | 'sorcerous-burst'
  | 'chromatic-orb';

export interface DiceConfig {
  profile: DamageProfile;
  armorClass: number;
  attackBonus: number;
  rollMode: RollMode;
  halflingLuck: boolean;
  luckyFeat: boolean;
  elvenAccuracy: boolean;
  bless: boolean;
  bane: boolean;
  elementalAdept: boolean;
  resistance: boolean;
  vulnerability: boolean;
  basicDice: number;
  basicDieSize: number;
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
      : mode === 'advantage' && config.elvenAccuracy
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

function dieValue(raw: number, adept: boolean): number {
  return adept && raw === 1 ? 2 : raw;
}

function adjustedDamage(total: number, config: DiceConfig): number {
  let result = Math.max(0, total);
  if (config.resistance && !config.elementalAdept) {
    result = Math.floor(result / 2);
  }
  if (config.vulnerability) result *= 2;
  return result;
}

function ordinaryDamage(
  count: number,
  size: number,
  modifier: number,
  config: DiceConfig,
): number {
  let sums = new Map<number, number>([[0, 1]]);
  for (let die = 0; die < count; die += 1) {
    const next = new Map<number, number>();
    for (const [sum, probability] of sums) {
      for (let face = 1; face <= size; face += 1) {
        add(
          next,
          sum + dieValue(face, config.elementalAdept),
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
): number {
  if (baseDice <= 0 || cap <= 0) return 0;
  const success = 1 / 8;
  const failure = 7 / 8;
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
  elementalAdept: boolean,
): number {
  const mean = elementalAdept ? 37 / 8 : 9 / 2;
  return (baseDice + sorcerousExpectedExtraDice(baseDice, cap)) * mean;
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
        const addsDie = face === 8 && state.extras < cap;
        const candidate: State = {
          remaining: state.remaining - 1 + (addsDie ? 1 : 0),
          extras: state.extras + (addsDie ? 1 : 0),
          sum: state.sum + dieValue(face, config.elementalAdept),
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
  elementalAdept: boolean,
): number {
  let unique = new Map<number, number>([[0, 1]]);
  for (let die = 0; die < dice; die += 1) {
    const next = new Map<number, number>();
    for (const [mask, probability] of unique) {
      for (let face = 1; face <= 8; face += 1) {
        const bit = 1 << dieValue(face, elementalAdept);
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
      config,
    );
  }
  return ordinaryDamage(
    config.basicDice * multiplier,
    config.basicDieSize,
    config.damageModifier,
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
      config.elementalAdept,
    );
    criticalLeapChance = chromaticLeapChance(
      (config.chromaticSlotLevel + 2) * 2,
      config.elementalAdept,
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
  if (mode === 'advantage' && config.elvenAccuracy) {
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
  size: number,
  modifier: number,
  config: DiceConfig,
  random: () => number,
) {
  const damageDice: DamageDieTrace[] = [];
  for (let die = 0; die < count; die += 1) {
    const raw = rollDie(random, size);
    damageDice.push({
      raw,
      value: dieValue(raw, config.elementalAdept),
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
    damageDice.push({
      raw,
      value: dieValue(raw, config.elementalAdept),
      added: damageDice.length >= baseDice,
    });
    if (raw === 8 && extras < config.explosionCap) {
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
              config,
              random,
            )
          : ordinaryRoll(
              config.basicDice * multiplier,
              config.basicDieSize,
              config.damageModifier,
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
    elvenAccuracy: false,
    bless: false,
    bane: false,
    elementalAdept: false,
    resistance: false,
    vulnerability: false,
    basicDice: 1,
    basicDieSize: 8,
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

export function renderDiceHelper(characterLevel: number): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel dice-helper';
  section.setAttribute('aria-labelledby', 'dice-helper-title');
  section.innerHTML =
    '<div class="panel-heading"><div><h2 id="dice-helper-title">At-the-table dice calculator</h2><p>Exact odds and replayable seeded rolls.</p></div><span class="badge badge-ok">No simulation</span></div>';
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
  profile.innerHTML =
    '<option value="sorcerous-burst">Sorcerous Burst (2024)</option><option value="chromatic-orb">Chromatic Orb (2024)</option><option value="basic">Basic attack</option>';
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
  controls.append(
    labeledInput('Attack profile', profile),
    labeledInput('Target AC', ac),
    labeledInput('Attack bonus', bonus),
    labeledInput('d20 mode', mode),
  );
  const effects = document.createElement('div');
  effects.className = 'dice-effects';
  for (const [key, label] of [
    ['halflingLuck', 'Halfling Luck'],
    ['luckyFeat', 'Lucky feat'],
    ['elvenAccuracy', 'Elven Accuracy'],
    ['bless', 'Bless +d4'],
    ['bane', 'Bane −d4'],
    ['elementalAdept', 'Elemental Adept'],
    ['resistance', 'Resistance'],
    ['vulnerability', 'Vulnerability'],
  ] as const) {
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.dataset.diceEffect = key;
    const labelNode = document.createElement('label');
    labelNode.append(input, ` ${label}`);
    effects.append(labelNode);
  }
  const metrics = document.createElement('dl');
  metrics.className = 'dice-metrics';
  const seed = document.createElement('input');
  seed.value = 'table-night';
  seed.maxLength = 80;
  seed.setAttribute('aria-label', 'Dice seed');
  const roll = document.createElement('button');
  roll.type = 'button';
  roll.className = 'button-primary';
  roll.textContent = 'Roll attack + damage';
  const live = document.createElement('output');
  live.className = 'dice-roll-result';
  live.setAttribute('aria-live', 'polite');
  let sequence = 1;
  const read = (): DiceConfig => {
    config.profile = profile.value as DamageProfile;
    config.armorClass = Number(ac.value);
    config.attackBonus = Number(bonus.value);
    config.rollMode = mode.value as RollMode;
    for (const input of Array.from(
      effects.querySelectorAll<HTMLInputElement>('[data-dice-effect]'),
    )) {
      const key = input.dataset.diceEffect as keyof Pick<
        DiceConfig,
        | 'halflingLuck'
        | 'luckyFeat'
        | 'elvenAccuracy'
        | 'bless'
        | 'bane'
        | 'elementalAdept'
        | 'resistance'
        | 'vulnerability'
      >;
      config[key] = input.checked;
    }
    return config;
  };
  const update = (): void => {
    const exact = exactResult(read());
    metrics.innerHTML = `<div><dt>Hit chance</dt><dd>${(exact.totalHit * 100).toFixed(1)}%</dd></div><div><dt>Critical</dt><dd>${(exact.criticalHit * 100).toFixed(1)}%</dd></div><div><dt>Expected damage</dt><dd>${exact.expectedDamage.toFixed(2)}</dd></div><div><dt>Damage / hit</dt><dd>${exact.expectedDamageOnAnyHit.toFixed(2)}</dd></div>`;
    live.value = '';
  };
  controls.addEventListener('change', update);
  effects.addEventListener('change', update);
  roll.addEventListener('click', () => {
    const token = `${seed.value.trim() || 'table'}:${sequence}`;
    sequence += 1;
    const result = seededRoll(read(), token);
    live.value = `${result.totalDamage} total damage · Replay ${result.token} · stopped: ${result.stopReason.replaceAll('-', ' ')}`;
  });
  update();
  const actions = document.createElement('div');
  actions.className = 'dice-actions';
  actions.append(labeledInput('Seed', seed), roll);
  section.append(controls, effects, metrics, actions, live);
  return section;
}
