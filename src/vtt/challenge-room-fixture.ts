import { combatantId, type CombatantId } from '../combat/values';
import {
  engineActionId,
  engineSpellId,
  type EngineActionId,
  type EngineActivationChoice,
  type EngineSpellId,
} from './turn-proposal';

export const CHALLENGE_ROOM_IDS = ['B', 'C', 'A', 'D'] as const;
export type ChallengeRoomId = typeof CHALLENGE_ROOM_IDS[number];
export type ChallengeFlawFamily = 1 | 2 | 4 | 5;

export interface ChallengeRoomProvenanceV1 {
  readonly schemaVersion: 1;
  readonly roomId: ChallengeRoomId;
  readonly seed: 5831001 | 5831002 | 5831003 | 5831004;
  readonly certification: 'ready_for_witness' | 'feasibility_candidate';
  readonly flawFamily: ChallengeFlawFamily;
  readonly flawName: 'interrupt_imminent_threat' | 'preserve_allied_turn' |
    'retain_safe_firing_position' | 'hold_bottleneck';
  readonly actorId: CombatantId;
  readonly engineTop: OptionSelectorV1;
  readonly certifiedAlternative: OptionSelectorV1;
  readonly decisiveFacts: readonly DecisiveFactV1[];
  readonly metric: ChallengeMetricSpecV1;
  readonly robustness: ChallengeRobustnessSpecV1;
}

export interface OptionSelectorV1 {
  readonly requiredMainKind: 'attack' | 'multiattack' | 'dodge';
  readonly mainActionId: EngineActionId | null;
  readonly orderedComponents: readonly {
    readonly kind: 'attack' | 'saving_throw';
    readonly actionId: EngineActionId;
    readonly targetIds: readonly CombatantId[];
  }[];
  readonly requiredBonusSpellId: EngineSpellId | null;
  readonly bonusTargetIds: readonly CombatantId[];
  readonly activationChoice: EngineActivationChoice | null;
  readonly movement: 'hold' | 'approach';
}

export type ChallengeMetricName = 'prevented_expected_reply_damage' |
  'safe_position_expected_hp' | 'allied_followup_execution_probability' |
  'scout_followup_execution_probability';

export interface ChallengeExactRationalV1 {
  readonly numerator: string;
  readonly denominator: string;
}

export interface ChallengeMetricSpecV1 {
  readonly name: ChallengeMetricName;
  readonly requiredActorTurns: readonly CombatantId[];
  readonly minimumDelta: ChallengeExactRationalV1;
}

export interface DecisiveFactV1 {
  readonly name: string;
  readonly modelJsonPointer: string;
  readonly expectedValue: unknown;
}

export type ChallengeRobustnessSpecV1 =
  | {
      readonly kind: 'validated';
      readonly axes: readonly { readonly name: string; readonly values: readonly unknown[] }[];
      readonly expectedVariantCount: 18;
    }
  | { readonly kind: 'pending_spike' };

type JsonRecord = Readonly<Record<string, unknown>>;

function record(value: unknown, label: string): JsonRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as JsonRecord;
}

function exactKeys(value: JsonRecord, keys: readonly string[], label: string): void {
  const expected = new Set(keys);
  const unknown = Object.keys(value).find((key) => !expected.has(key));
  const missing = keys.find((key) => !Object.hasOwn(value, key));
  if (unknown !== undefined || missing !== undefined) {
    throw new TypeError(`${label} has ${unknown === undefined ? `missing key ${String(missing)}` : `unknown key ${unknown}`}.`);
  }
}

function stringValue(value: unknown, label: string): string {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new TypeError(`${label} must be a non-empty trimmed string.`);
  }
  return value;
}

function stringEnum<const Values extends readonly string[]>(
  value: unknown,
  values: Values,
  label: string,
): Values[number] {
  if (typeof value !== 'string' || !values.includes(value)) {
    throw new TypeError(`${label} must be one of ${values.join(', ')}.`);
  }
  return value as Values[number];
}

function array(value: unknown, label: string): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError(`${label} must be an array.`);
  return value;
}

function nullableId<T>(
  value: unknown,
  label: string,
  decode: (source: string) => T,
): T | null {
  return value === null ? null : decode(stringValue(value, label));
}

function decodeActivationChoice(value: unknown): EngineActivationChoice | null {
  if (value === null) return null;
  const choice = record(value, 'challenge selector activationChoice');
  const kind = stringEnum(choice['kind'], [
    'command_word', 'unicorns_blessing_spell', 'dispel_evil_and_good_mode',
    'calm_emotions_per_target',
  ] as const, 'challenge selector activationChoice.kind');
  switch (kind) {
    case 'command_word':
      exactKeys(choice, ['kind', 'value'], 'command-word activation choice');
      return { kind, value: stringEnum(choice['value'], ['approach', 'flee', 'grovel', 'halt', 'drop'] as const, 'command word') };
    case 'unicorns_blessing_spell':
      exactKeys(choice, ['kind', 'value'], 'unicorn activation choice');
      return { kind, value: stringEnum(choice['value'], ['cure-wounds', 'lesser-restoration'] as const, 'unicorn spell') };
    case 'dispel_evil_and_good_mode':
      exactKeys(choice, ['kind', 'value'], 'dispel activation choice');
      return { kind, value: stringEnum(choice['value'], ['break_enchantment', 'dismissal'] as const, 'dispel mode') };
    case 'calm_emotions_per_target': {
      exactKeys(choice, ['kind', 'selections'], 'calm-emotions activation choice');
      const selections = array(choice['selections'], 'calm-emotions selections').map((entry) => {
        const selection = record(entry, 'calm-emotions selection');
        exactKeys(selection, ['targetId', 'mode'], 'calm-emotions selection');
        return {
          targetId: combatantId(stringValue(selection['targetId'], 'calm-emotions targetId')),
          mode: stringEnum(selection['mode'], ['suppress_charmed_frightened', 'indifferent_toward_monster_side'] as const, 'calm-emotions mode'),
        };
      });
      return { kind, selections };
    }
  }
}

function decodeSelector(value: unknown): OptionSelectorV1 {
  const selector = record(value, 'challenge option selector');
  exactKeys(selector, [
    'requiredMainKind', 'mainActionId', 'orderedComponents', 'requiredBonusSpellId',
    'bonusTargetIds', 'activationChoice', 'movement',
  ], 'challenge option selector');
  const orderedComponents = array(selector['orderedComponents'], 'challenge orderedComponents').map((entry) => {
    const component = record(entry, 'challenge option component');
    exactKeys(component, ['kind', 'actionId', 'targetIds'], 'challenge option component');
    return {
      kind: stringEnum(component['kind'], ['attack', 'saving_throw'] as const, 'challenge component kind'),
      actionId: engineActionId(stringValue(component['actionId'], 'challenge component actionId')),
      targetIds: array(component['targetIds'], 'challenge component targetIds').map((id) =>
        combatantId(stringValue(id, 'challenge component targetId'))),
    };
  });
  return {
    requiredMainKind: stringEnum(selector['requiredMainKind'], ['attack', 'multiattack', 'dodge'] as const, 'challenge requiredMainKind'),
    mainActionId: nullableId(selector['mainActionId'], 'challenge mainActionId', engineActionId),
    orderedComponents,
    requiredBonusSpellId: nullableId(selector['requiredBonusSpellId'], 'challenge requiredBonusSpellId', engineSpellId),
    bonusTargetIds: array(selector['bonusTargetIds'], 'challenge bonusTargetIds').map((id) =>
      combatantId(stringValue(id, 'challenge bonusTargetId'))),
    activationChoice: decodeActivationChoice(selector['activationChoice']),
    movement: stringEnum(selector['movement'], ['hold', 'approach'] as const, 'challenge movement'),
  };
}

function decodeExactRational(value: unknown): ChallengeExactRationalV1 {
  const rational = record(value, 'challenge exact rational');
  exactKeys(rational, ['numerator', 'denominator'], 'challenge exact rational');
  const numerator = stringValue(rational['numerator'], 'challenge rational numerator');
  const denominator = stringValue(rational['denominator'], 'challenge rational denominator');
  if (!/^(?:0|-?[1-9][0-9]*)$/u.test(numerator) || !/^[1-9][0-9]*$/u.test(denominator)) {
    throw new TypeError('Challenge exact rational must use canonical base-10 bigint strings and a positive denominator.');
  }
  return { numerator, denominator };
}

function assertJsonValue(value: unknown, label: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => assertJsonValue(entry, `${label}[${String(index)}]`));
    return;
  }
  if (typeof value === 'object') {
    for (const [key, entry] of Object.entries(value)) assertJsonValue(entry, `${label}.${key}`);
    return;
  }
  throw new TypeError(`${label} must be a JSON value.`);
}

function decodeRobustness(
  value: unknown,
  certification: ChallengeRoomProvenanceV1['certification'],
): ChallengeRobustnessSpecV1 {
  const robustness = record(value, 'challenge robustness');
  const kind = stringEnum(robustness['kind'], ['validated', 'pending_spike'] as const, 'challenge robustness kind');
  if (kind === 'pending_spike') {
    exactKeys(robustness, ['kind'], 'pending-spike robustness');
    if (certification !== 'feasibility_candidate') {
      throw new TypeError('Only a feasibility candidate may have pending_spike robustness.');
    }
    return { kind };
  }
  exactKeys(robustness, ['kind', 'axes', 'expectedVariantCount'], 'validated robustness');
  if (certification !== 'ready_for_witness' || robustness['expectedVariantCount'] !== 18) {
    throw new TypeError('Ready witness robustness must be validated with exactly 18 variants.');
  }
  const axes = array(robustness['axes'], 'challenge robustness axes').map((entry) => {
    const axis = record(entry, 'challenge robustness axis');
    exactKeys(axis, ['name', 'values'], 'challenge robustness axis');
    const values = array(axis['values'], 'challenge robustness axis values');
    values.forEach((axisValue, index) => assertJsonValue(axisValue, `challenge robustness axis value ${String(index)}`));
    if (values.length === 0) throw new TypeError('Challenge robustness axes require nonempty values.');
    return { name: stringValue(axis['name'], 'challenge robustness axis name'), values: structuredClone(values) };
  });
  if (axes.length === 0 || axes.reduce((count, axis) => count * axis.values.length, 1) !== 18) {
    throw new TypeError('Validated challenge robustness axes must describe exactly 18 variants.');
  }
  return { kind, axes, expectedVariantCount: 18 };
}

const ROOM_CORRESPONDENCE = {
  B: { seed: 5831001, flawFamily: 1, flawName: 'interrupt_imminent_threat' },
  C: { seed: 5831002, flawFamily: 4, flawName: 'retain_safe_firing_position' },
  A: { seed: 5831003, flawFamily: 2, flawName: 'preserve_allied_turn' },
  D: { seed: 5831004, flawFamily: 5, flawName: 'hold_bottleneck' },
} as const;

export function decodeChallengeRoomProvenanceV1(value: unknown): ChallengeRoomProvenanceV1 {
  const sidecar = record(value, 'challenge room provenance');
  exactKeys(sidecar, [
    'schemaVersion', 'roomId', 'seed', 'certification', 'flawFamily', 'flawName',
    'actorId', 'engineTop', 'certifiedAlternative', 'decisiveFacts', 'metric', 'robustness',
  ], 'challenge room provenance');
  if (sidecar['schemaVersion'] !== 1) throw new TypeError('Challenge room provenance schemaVersion must be 1.');
  const roomId = stringEnum(sidecar['roomId'], CHALLENGE_ROOM_IDS, 'challenge roomId');
  const expected = ROOM_CORRESPONDENCE[roomId];
  if (sidecar['seed'] !== expected.seed || sidecar['flawFamily'] !== expected.flawFamily ||
    sidecar['flawName'] !== expected.flawName) {
    throw new TypeError(`Challenge room ${roomId} seed, family, and flaw name do not correspond.`);
  }
  const certification = stringEnum(sidecar['certification'], ['ready_for_witness', 'feasibility_candidate'] as const, 'challenge certification');
  if ((roomId === 'D') !== (certification === 'feasibility_candidate')) {
    throw new TypeError('Only challenge room D may be a feasibility candidate, and D must remain one until the spike.');
  }
  const decisiveFacts = array(sidecar['decisiveFacts'], 'challenge decisiveFacts').map((entry) => {
    const fact = record(entry, 'challenge decisive fact');
    exactKeys(fact, ['name', 'modelJsonPointer', 'expectedValue'], 'challenge decisive fact');
    const modelJsonPointer = stringValue(fact['modelJsonPointer'], 'challenge decisive fact modelJsonPointer');
    if (!modelJsonPointer.startsWith('/')) throw new TypeError('Challenge decisive fact modelJsonPointer must be an absolute JSON pointer.');
    assertJsonValue(fact['expectedValue'], 'challenge decisive fact expectedValue');
    return {
      name: stringValue(fact['name'], 'challenge decisive fact name'),
      modelJsonPointer,
      expectedValue: structuredClone(fact['expectedValue']),
    };
  });
  const metric = record(sidecar['metric'], 'challenge metric');
  exactKeys(metric, ['name', 'requiredActorTurns', 'minimumDelta'], 'challenge metric');
  return {
    schemaVersion: 1,
    roomId,
    seed: expected.seed,
    certification,
    flawFamily: expected.flawFamily,
    flawName: expected.flawName,
    actorId: combatantId(stringValue(sidecar['actorId'], 'challenge actorId')),
    engineTop: decodeSelector(sidecar['engineTop']),
    certifiedAlternative: decodeSelector(sidecar['certifiedAlternative']),
    decisiveFacts,
    metric: {
      name: stringEnum(metric['name'], [
        'prevented_expected_reply_damage', 'safe_position_expected_hp',
        'allied_followup_execution_probability', 'scout_followup_execution_probability',
      ] as const, 'challenge metric name'),
      requiredActorTurns: array(metric['requiredActorTurns'], 'challenge metric requiredActorTurns').map((id) =>
        combatantId(stringValue(id, 'challenge metric actor id'))),
      minimumDelta: decodeExactRational(metric['minimumDelta']),
    },
    robustness: decodeRobustness(sidecar['robustness'], certification),
  };
}
