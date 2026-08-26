import { describe, expect, it } from 'vitest';
import type { EffectPayload } from '../../../src/combat/effects';
import {
  parseSrdSpellDescriptions,
  parseSrdSpellList,
} from '../../../src/rules/spells-srd';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { damageType, dieSides, feet } from '../../../src/combat/values';
import { feetPoint } from '../../../src/combat/templates';
import {
  IMPLEMENTED_SPELL_DEFINITIONS,
  spellDefinition,
} from '../../../src/combat/spells/definitions';
import {
  assertSpellManifestBurnDown,
  SPELL_MANIFEST,
  type SpellManifestRow,
} from '../../../src/combat/spells/manifest';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type {
  SpellCastCommand,
  SpellCastingTime,
  SpellDefinition,
  EffectData,
  ScaledDice,
  SpellLevel,
} from '../../../src/combat/spells/types';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const EXPECTED_LEVEL_TOTALS: Readonly<Record<SpellLevel, number>> = {
  0: 22,
  1: 50,
  2: 47,
  3: 37,
  4: 30,
  5: 1,
  6: 1,
  7: 0,
  8: 0,
  9: 0,
};
const EXPECTED_MANIFEST_TOTAL = 188;
const EXPECTED_IMPLEMENTED = 188;
const EXPECTED_PENDING = 0;
const EXPECTED_CANTRIP_AND_LEVEL_ONE_IMPLEMENTED = 72;

interface ValuePin {
  readonly id: string;
  readonly level: SpellLevel;
  readonly operation: SpellDefinition['operation']['kind'];
  readonly rangeFeet: number;
  readonly baseDice: readonly [number, number] | null;
  readonly perSlotCount: number;
  readonly source: string;
}

/** Independent SRD value oracle; do not derive this table from definitions. */
const VALUE_PINS: readonly ValuePin[] = [
  { id: 'acid-splash', level: 0, operation: 'save_damage', rangeFeet: 60, baseDice: [1, 6], perSlotCount: 0, source: 'spell-descriptions.txt:37-51' },
  { id: 'chill-touch', level: 0, operation: 'attack_damage', rangeFeet: 5, baseDice: [1, 10], perSlotCount: 0, source: 'spell-descriptions.txt:1066' },
  { id: 'dancing-lights', level: 0, operation: 'utility', rangeFeet: 120, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1906' },
  { id: 'eldritch-blast', level: 0, operation: 'attack_beams', rangeFeet: 120, baseDice: [1, 10], perSlotCount: 0, source: 'spell-descriptions.txt:2608-2626' },
  { id: 'elementalism', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2630' },
  { id: 'fire-bolt', level: 0, operation: 'attack_damage', rangeFeet: 120, baseDice: [1, 10], perSlotCount: 0, source: 'spell-descriptions.txt:3184-3200' },
  { id: 'guidance', level: 0, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4000' },
  { id: 'light', level: 0, operation: 'utility', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4816' },
  { id: 'mage-hand', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4931' },
  { id: 'mending', level: 0, operation: 'utility', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:5322' },
  { id: 'message', level: 0, operation: 'utility', rangeFeet: 120, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:5341' },
  { id: 'minor-illusion', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:5420' },
  { id: 'poison-spray', level: 0, operation: 'attack_damage', rangeFeet: 30, baseDice: [1, 12], perSlotCount: 0, source: 'spell-descriptions.txt:5925' },
  { id: 'prestidigitation', level: 0, operation: 'utility', rangeFeet: 10, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6034' },
  { id: 'ray-of-frost', level: 0, operation: 'attack_damage', rangeFeet: 60, baseDice: [1, 8], perSlotCount: 0, source: 'spell-descriptions.txt:6427' },
  { id: 'resistance', level: 0, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6540' },
  { id: 'sacred-flame', level: 0, operation: 'save_damage', rangeFeet: 60, baseDice: [1, 8], perSlotCount: 0, source: 'spell-descriptions.txt:6645' },
  { id: 'shocking-grasp', level: 0, operation: 'attack_damage', rangeFeet: 5, baseDice: [1, 8], perSlotCount: 0, source: 'spell-descriptions.txt:7006' },
  { id: 'spare-the-dying', level: 0, operation: 'stabilize', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:7181 (level-5 range upgrade)' },
  { id: 'thaumaturgy', level: 0, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:7842' },
  { id: 'true-strike', level: 0, operation: 'weapon_attack_augmentation', rangeFeet: 5, baseDice: [0, 6], perSlotCount: 0, source: 'spell-descriptions.txt:8079-8094' },
  { id: 'bane', level: 1, operation: 'save_effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:670' },
  { id: 'bless', level: 1, operation: 'effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:824' },
  { id: 'burning-hands', level: 1, operation: 'save_damage', rangeFeet: 0, baseDice: [3, 6], perSlotCount: 1, source: 'spell-descriptions.txt:924' },
  { id: 'charm-person', level: 1, operation: 'save_effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1046' },
  { id: 'cure-wounds', level: 1, operation: 'healing', rangeFeet: 5, baseDice: [2, 8], perSlotCount: 2, source: 'spell-descriptions.txt:1895' },
  { id: 'false-life', level: 1, operation: 'temporary_hit_points', rangeFeet: 0, baseDice: [2, 4], perSlotCount: 0, source: 'spell-descriptions.txt:2930' },
  { id: 'guiding-bolt', level: 1, operation: 'attack_damage', rangeFeet: 120, baseDice: [4, 6], perSlotCount: 1, source: 'spell-descriptions.txt:4011' },
  { id: 'healing-word', level: 1, operation: 'healing', rangeFeet: 60, baseDice: [2, 4], perSlotCount: 2, source: 'spell-descriptions.txt:4169' },
  { id: 'inflict-wounds', level: 1, operation: 'save_damage', rangeFeet: 5, baseDice: [2, 10], perSlotCount: 1, source: 'spell-descriptions.txt:4593' },
  { id: 'magic-missile', level: 1, operation: 'magic_missiles', rangeFeet: 120, baseDice: [1, 4], perSlotCount: 0, source: 'spell-descriptions.txt:5033' },
  { id: 'shield', level: 1, operation: 'effect', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6937' },
  { id: 'shield-of-faith', level: 1, operation: 'effect', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6956' },
  { id: 'thunderwave', level: 1, operation: 'save_damage', rangeFeet: 0, baseDice: [2, 8], perSlotCount: 1, source: 'spell-descriptions.txt:7868' },
  { id: 'alarm', level: 1, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:70' },
  { id: 'chromatic-orb', level: 1, operation: 'attack_damage', rangeFeet: 90, baseDice: [3, 8], perSlotCount: 1, source: 'spell-descriptions.txt:1079' },
  { id: 'color-spray', level: 1, operation: 'save_effect', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1193' },
  { id: 'command', level: 1, operation: 'save_effect', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1209' },
  { id: 'comprehend-languages', level: 1, operation: 'utility', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1304' },
  { id: 'create-or-destroy-water', level: 1, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:1797' },
  { id: 'detect-evil-and-good', level: 1, operation: 'utility', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2068' },
  { id: 'detect-magic', level: 1, operation: 'utility', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2085' },
  { id: 'detect-poison-and-disease', level: 1, operation: 'utility', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2103' },
  { id: 'disguise-self', level: 1, operation: 'utility', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2185' },
  { id: 'expeditious-retreat', level: 1, operation: 'effect', rangeFeet: 0, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2810' },
  { id: 'feather-fall', level: 1, operation: 'effect', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2964' },
  { id: 'find-familiar', level: 1, operation: 'utility', rangeFeet: 10, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:2979' },
  { id: 'floating-disk', level: 1, operation: 'utility', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:3335' },
  { id: 'fog-cloud', level: 1, operation: 'utility', rangeFeet: 120, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:3396' },
  { id: 'grease', level: 1, operation: 'persistent_area', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:3883' },
  { id: 'hideous-laughter', level: 1, operation: 'save_effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4294' },
  { id: 'ice-knife', level: 1, operation: 'attack_then_save_damage', rangeFeet: 60, baseDice: [2, 6], perSlotCount: 1, source: 'spell-descriptions.txt:4430' },
  { id: 'identify', level: 1, operation: 'utility', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4476' },
  { id: 'illusory-script', level: 1, operation: 'utility', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4495' },
  { id: 'jump', level: 1, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4710' },
  { id: 'longstrider', level: 1, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4904' },
  { id: 'mage-armor', level: 1, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:4920' },
  { id: 'protection-from-evil-and-good', level: 1, operation: 'effect', rangeFeet: 5, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6337' },
  { id: 'purify-food-and-drink', level: 1, operation: 'utility', rangeFeet: 10, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6369' },
  { id: 'ray-of-sickness', level: 1, operation: 'attack_damage', rangeFeet: 60, baseDice: [2, 8], perSlotCount: 1, source: 'spell-descriptions.txt:6456' },
  { id: 'sanctuary', level: 1, operation: 'effect', rangeFeet: 30, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:6662' },
  { id: 'silent-image', level: 1, operation: 'utility', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:7042' },
  { id: 'sleep', level: 1, operation: 'save_effect', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:7103' },
  { id: 'unseen-servant', level: 1, operation: 'utility', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:8131' },
];

interface BatchNumericPin {
  readonly id: string;
  readonly mechanics: readonly number[];
  readonly source: string;
}

/** Independent numeric oracle transcribed from the cited SRD entries, never from reducer output. */
const LEVEL_ONE_BATCH_NUMERIC_PINS: readonly BatchNumericPin[] = [
  { id: 'alarm', mechanics: [30, 20, 0, 20, 60, 5280, 4800], source: 'spell-descriptions.txt:70' },
  { id: 'chromatic-orb', mechanics: [90, 3, 8, 0, 1, 0], source: 'spell-descriptions.txt:1079' },
  { id: 'color-spray', mechanics: [0, 15, 0, 2], source: 'spell-descriptions.txt:1193' },
  { id: 'command', mechanics: [60, 1, 1, 1], source: 'spell-descriptions.txt:1209' },
  { id: 'comprehend-languages', mechanics: [60, 600], source: 'spell-descriptions.txt:1304' },
  { id: 'create-or-destroy-water', mechanics: [30, 30, 5, 10, 10, 30, 5], source: 'spell-descriptions.txt:1797' },
  { id: 'detect-evil-and-good', mechanics: [30, 100], source: 'spell-descriptions.txt:2068' },
  { id: 'detect-magic', mechanics: [30, 100], source: 'spell-descriptions.txt:2085' },
  { id: 'detect-poison-and-disease', mechanics: [30, 100], source: 'spell-descriptions.txt:2103' },
  { id: 'disguise-self', mechanics: [1, 600], source: 'spell-descriptions.txt:2185' },
  { id: 'expeditious-retreat', mechanics: [100], source: 'spell-descriptions.txt:2810' },
  { id: 'feather-fall', mechanics: [60, 5, 0, 60, 10], source: 'spell-descriptions.txt:2964' },
  { id: 'find-familiar', mechanics: [10, 100], source: 'spell-descriptions.txt:2979' },
  { id: 'floating-disk', mechanics: [30, 3, 3, 1, 500, 20, 100, 600], source: 'spell-descriptions.txt:3335' },
  { id: 'fog-cloud', mechanics: [120, 20, 20, 20, 600], source: 'spell-descriptions.txt:3396' },
  { id: 'grease', mechanics: [60, 10, 0, 10, 1, 2, 4, 0, 1, 1], source: 'spell-descriptions.txt:3883,8486-8489 + D373.10' },
  { id: 'hideous-laughter', mechanics: [30, 1, 1, 10], source: 'spell-descriptions.txt:4294' },
  { id: 'ice-knife', mechanics: [60, 1, 10, 0, 0, 0, 2, 6, 0, 1, 0, 5], source: 'spell-descriptions.txt:4430' },
  { id: 'identify', mechanics: [5], source: 'spell-descriptions.txt:4476' },
  { id: 'illusory-script', mechanics: [5, 144000], source: 'spell-descriptions.txt:4495' },
  { id: 'jump', mechanics: [5, 1, 1, 30, 10, 1, 10], source: 'spell-descriptions.txt:4710' },
  { id: 'longstrider', mechanics: [5, 1, 1, 10, 600], source: 'spell-descriptions.txt:4904' },
  { id: 'mage-armor', mechanics: [5, 13, 4800], source: 'spell-descriptions.txt:4920' },
  { id: 'protection-from-evil-and-good', mechanics: [5, 100], source: 'spell-descriptions.txt:6337' },
  { id: 'purify-food-and-drink', mechanics: [10, 5, 0, 5], source: 'spell-descriptions.txt:6369' },
  { id: 'ray-of-sickness', mechanics: [60, 2, 8, 0, 1, 0, 2], source: 'spell-descriptions.txt:6456' },
  { id: 'sanctuary', mechanics: [30, 10], source: 'spell-descriptions.txt:6662' },
  { id: 'silent-image', mechanics: [60, 15, 0, 15, 100], source: 'spell-descriptions.txt:7042' },
  { id: 'sleep', mechanics: [60, 5, 0, 10], source: 'spell-descriptions.txt:7103' },
  { id: 'unseen-servant', mechanics: [60, 10, 1, 2, 15, 60, 600], source: 'spell-descriptions.txt:8131' },
];

function numericLeaves(value: unknown): readonly number[] {
  if (typeof value === 'number') return [value];
  if (value === null || typeof value !== 'object') return [];
  return Object.values(value).flatMap(numericLeaves);
}

interface BatchComponentPin {
  readonly id: string;
  readonly castingTime: SpellCastingTime;
  readonly components: 'V' | 'VS' | 'VM' | 'SM' | 'VSM';
  readonly material: string | null;
  readonly consumed: boolean;
  readonly ritual?: true;
  readonly source: string;
}

/** Independent component/casting-time oracle transcribed from the cited SRD entries. */
const LEVEL_ONE_BATCH_COMPONENT_PINS: readonly BatchComponentPin[] = [
  { id: 'alarm', castingTime: 'minute', components: 'VSM', material: 'a bell and silver wire', consumed: false, ritual: true, source: 'spell-descriptions.txt:70' },
  { id: 'chromatic-orb', castingTime: 'action', components: 'VSM', material: 'a diamond worth 50+ GP', consumed: false, source: 'spell-descriptions.txt:1079' },
  { id: 'color-spray', castingTime: 'action', components: 'VSM', material: 'a pinch of colorful sand', consumed: false, source: 'spell-descriptions.txt:1193' },
  { id: 'command', castingTime: 'action', components: 'V', material: null, consumed: false, source: 'spell-descriptions.txt:1209' },
  { id: 'comprehend-languages', castingTime: 'action', components: 'VSM', material: 'a pinch of soot and salt', consumed: false, ritual: true, source: 'spell-descriptions.txt:1304' },
  { id: 'create-or-destroy-water', castingTime: 'action', components: 'VSM', material: 'a mix of water and sand', consumed: false, source: 'spell-descriptions.txt:1797' },
  { id: 'detect-evil-and-good', castingTime: 'action', components: 'VS', material: null, consumed: false, source: 'spell-descriptions.txt:2068' },
  { id: 'detect-magic', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: true, source: 'spell-descriptions.txt:2085' },
  { id: 'detect-poison-and-disease', castingTime: 'action', components: 'VSM', material: 'a yew leaf', consumed: false, ritual: true, source: 'spell-descriptions.txt:2103' },
  { id: 'disguise-self', castingTime: 'action', components: 'VS', material: null, consumed: false, source: 'spell-descriptions.txt:2185' },
  { id: 'expeditious-retreat', castingTime: 'bonus_action', components: 'VS', material: null, consumed: false, source: 'spell-descriptions.txt:2810' },
  { id: 'feather-fall', castingTime: 'reaction', components: 'VM', material: 'a small feather or piece of down', consumed: false, source: 'spell-descriptions.txt:2964' },
  { id: 'find-familiar', castingTime: 'hour', components: 'VSM', material: 'burning incense worth 10+ GP', consumed: true, ritual: true, source: 'spell-descriptions.txt:2979' },
  { id: 'floating-disk', castingTime: 'action', components: 'VSM', material: 'a drop of mercury', consumed: false, ritual: true, source: 'spell-descriptions.txt:3335' },
  { id: 'fog-cloud', castingTime: 'action', components: 'VS', material: null, consumed: false, source: 'spell-descriptions.txt:3396' },
  { id: 'grease', castingTime: 'action', components: 'VSM', material: 'a bit of pork rind or butter', consumed: false, source: 'spell-descriptions.txt:3883' },
  { id: 'hideous-laughter', castingTime: 'action', components: 'VSM', material: 'a tart and a feather', consumed: false, source: 'spell-descriptions.txt:4294' },
  { id: 'ice-knife', castingTime: 'action', components: 'SM', material: 'a drop of water or a piece of ice', consumed: false, source: 'spell-descriptions.txt:4430' },
  { id: 'identify', castingTime: 'minute', components: 'VSM', material: 'a pearl worth 100+ GP', consumed: false, ritual: true, source: 'spell-descriptions.txt:4476' },
  { id: 'illusory-script', castingTime: 'minute', components: 'SM', material: 'ink worth 10+ GP', consumed: true, ritual: true, source: 'spell-descriptions.txt:4495' },
  { id: 'jump', castingTime: 'bonus_action', components: 'VSM', material: 'a grasshopper\'s hind leg', consumed: false, source: 'spell-descriptions.txt:4710' },
  { id: 'longstrider', castingTime: 'action', components: 'VSM', material: 'a pinch of dirt', consumed: false, source: 'spell-descriptions.txt:4904' },
  { id: 'mage-armor', castingTime: 'action', components: 'VSM', material: 'a piece of cured leather', consumed: false, source: 'spell-descriptions.txt:4920' },
  { id: 'protection-from-evil-and-good', castingTime: 'action', components: 'VSM', material: 'a flask of Holy Water worth 25+ GP', consumed: true, source: 'spell-descriptions.txt:6337' },
  { id: 'purify-food-and-drink', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: true, source: 'spell-descriptions.txt:6369' },
  { id: 'ray-of-sickness', castingTime: 'action', components: 'VS', material: null, consumed: false, source: 'spell-descriptions.txt:6456' },
  { id: 'sanctuary', castingTime: 'bonus_action', components: 'VSM', material: 'a shard of glass from a mirror', consumed: false, source: 'spell-descriptions.txt:6662' },
  { id: 'silent-image', castingTime: 'action', components: 'VSM', material: 'a bit of fleece', consumed: false, source: 'spell-descriptions.txt:7042' },
  { id: 'sleep', castingTime: 'action', components: 'VSM', material: 'a pinch of sand or rose petals', consumed: false, source: 'spell-descriptions.txt:7103' },
  { id: 'unseen-servant', castingTime: 'action', components: 'VSM', material: 'a bit of string and of wood', consumed: false, ritual: true, source: 'spell-descriptions.txt:8131' },
];

function componentCode(definition: SpellDefinition): BatchComponentPin['components'] {
  const code = `${definition.components.verbal ? 'V' : ''}${definition.components.somatic ? 'S' : ''}${definition.components.material === null ? '' : 'M'}`;
  if (code === 'V' || code === 'VS' || code === 'VM' || code === 'SM' || code === 'VSM') return code;
  throw new Error(`Unexpected component combination ${code}.`);
}

interface CompleteMechanicsPin {
  readonly id: string;
  readonly source: string;
  readonly targeting: SpellDefinition['targeting'];
  readonly operation: SpellDefinition['operation'];
}

function pinnedDice(
  baseCount: number,
  sides: number,
  options: {
    readonly modifier?: number;
    readonly perSlotCount?: number;
    readonly perSlotModifier?: number;
    readonly cantripUpgrade?: boolean;
  } = {},
): ScaledDice {
  return {
    baseCount,
    sides,
    modifier: options.modifier ?? 0,
    perSlotCount: options.perSlotCount ?? 0,
    perSlotModifier: options.perSlotModifier ?? 0,
    cantripUpgrade: options.cantripUpgrade ?? false,
  };
}

function pinnedSurfaceBurningRule() {
  return {
    burnAwayAfterRounds: 1 as const,
    startOfTurnDamage: {
      terms: [{ type: damageType('Fire'), dice: { count: 2, sides: dieSides(4), modifier: 0 } }],
      critical: false,
      responses: [],
    },
  };
}

function pinnedEffect(
  payload: EffectPayload,
  options: {
    readonly target?: 'self' | 'targets';
    readonly concentration?: boolean;
    readonly durationRounds?: number | null;
    readonly expiresAt?: EffectData['expiresAt'];
    readonly repeatedSave?: EffectData['repeatedSave'];
    readonly stacking?: EffectData['stacking'];
  } = {},
): EffectData {
  return {
    payload,
    target: options.target ?? 'targets',
    concentration: options.concentration ?? false,
    durationRounds: options.durationRounds ?? 1,
    expiresAt: options.expiresAt ?? 'source_start',
    ...(options.stacking === undefined ? {} : { stacking: options.stacking }),
    ...(options.repeatedSave === undefined ? {} : { repeatedSave: options.repeatedSave }),
  };
}

/** Exact SRD-transcribed mechanics oracle: no definition operation leaf is projected away. */
const COMPLETE_MECHANICS_PINS: readonly CompleteMechanicsPin[] = [
  {
    id: 'acid-splash', source: 'spell-descriptions.txt:37-51',
    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
    operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'none', damageType: damageType('Acid'), dice: pinnedDice(1, 6, { cantripUpgrade: true }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'chill-touch', source: 'spell-descriptions.txt:1066',
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'melee', damageType: damageType('Necrotic'), dice: pinnedDice(1, 10, { cantripUpgrade: true }), rider: pinnedEffect({ kind: 'cannot_regain_hit_points' }) },
  },
  {
    id: 'dancing-lights', source: 'spell-descriptions.txt:1906',
    targeting: { kind: 'utility', rangeFeet: 120 },
    operation: { kind: 'utility', effect: { kind: 'light_source', brightFeet: 0, dimFeet: 10, maximumLights: 4, moveFeetPerBonusAction: 60 }, concentration: true, durationRounds: 10 },
  },
  {
    id: 'eldritch-blast', source: 'spell-descriptions.txt:2608-2626',
    targeting: { kind: 'multiple', rangeFeet: 120, baseMaximum: 1, additionalPerSlot: 0 },
    operation: { kind: 'attack_beams', attackKind: 'ranged', baseBeams: 1, additionalBeamLevels: [5, 11, 17], damageType: damageType('Force'), dice: pinnedDice(1, 10) },
  },
  {
    id: 'elementalism', source: 'spell-descriptions.txt:2630',
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'minor_magic', spell: 'Elementalism', options: ['beckon_air', 'beckon_earth', 'beckon_fire', 'beckon_water', 'sculpt_element'], maximumActive: null }, concentration: false, durationRounds: null },
  },
  {
    id: 'fire-bolt', source: 'spell-descriptions.txt:3184-3200',
    targeting: { kind: 'single', rangeFeet: 120, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Fire'), dice: pinnedDice(1, 10, { cantripUpgrade: true }), rider: null },
  },
  {
    id: 'guidance', source: 'spell-descriptions.txt:4000',
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'ability_check_modifier', count: 1, sides: 4, sign: 1, skill: 'chosen_when_cast' }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'light', source: 'spell-descriptions.txt:4816',
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'light_source', brightFeet: 20, dimFeet: 20, maximumLights: 1, moveFeetPerBonusAction: 0 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'mage-hand', source: 'spell-descriptions.txt:4931',
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'conjured_hand', maximumDistanceFeet: 30, moveFeetPerAction: 30, carryPounds: 10 }, concentration: false, durationRounds: 10 },
  },
  {
    id: 'mending', source: 'spell-descriptions.txt:5322',
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'object_repair', maximumBreakFeet: 1, restoresMagic: false }, concentration: false, durationRounds: null },
  },
  {
    id: 'message', source: 'spell-descriptions.txt:5341',
    targeting: { kind: 'single', rangeFeet: 120, willing: false },
    operation: { kind: 'utility', effect: { kind: 'communication_link', rangeFeet: 120, permitsReply: true, blockedByMagicalSilence: true }, concentration: false, durationRounds: 1 },
  },
  {
    id: 'minor-illusion', source: 'spell-descriptions.txt:5420',
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'illusion', modes: ['sound', 'image'], maximumCubeFeet: 5 }, concentration: false, durationRounds: 10 },
  },
  {
    id: 'poison-spray', source: 'spell-descriptions.txt:5925',
    targeting: { kind: 'single', rangeFeet: 30, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Poison'), dice: pinnedDice(1, 12, { cantripUpgrade: true }), rider: null },
  },
  {
    id: 'prestidigitation', source: 'spell-descriptions.txt:6034',
    targeting: { kind: 'utility', rangeFeet: 10 },
    operation: { kind: 'utility', effect: { kind: 'minor_magic', spell: 'Prestidigitation', options: ['sensory', 'fire_play', 'clean_or_soil', 'minor_sensation', 'magic_mark', 'minor_creation'], maximumActive: 3 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'ray-of-frost', source: 'spell-descriptions.txt:6427',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Cold'), dice: pinnedDice(1, 8, { cantripUpgrade: true }), rider: pinnedEffect({ kind: 'movement_modifier', speedDeltaFeet: -10 }) },
  },
  {
    id: 'resistance', source: 'spell-descriptions.txt:6540',
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'damage_reduction', damageType: 'chosen_when_cast', count: 1, sides: 4, oncePerTurn: true }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'sacred-flame', source: 'spell-descriptions.txt:6645',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'none', damageType: damageType('Radiant'), dice: pinnedDice(1, 8, { cantripUpgrade: true }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'shocking-grasp', source: 'spell-descriptions.txt:7006',
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'melee', damageType: damageType('Lightning'), dice: pinnedDice(1, 8, { cantripUpgrade: true }), rider: pinnedEffect({ kind: 'opportunity_attacks_disabled' }, { expiresAt: 'target_start' }) },
  },
  {
    id: 'spare-the-dying', source: 'spell-descriptions.txt:7181',
    targeting: { kind: 'single', rangeFeet: 30, willing: false, rangeByCasterLevel: [{ minimumLevel: 1, rangeFeet: 15 }, { minimumLevel: 5, rangeFeet: 30 }, { minimumLevel: 11, rangeFeet: 60 }, { minimumLevel: 17, rangeFeet: 120 }] },
    operation: { kind: 'stabilize' },
  },
  {
    id: 'thaumaturgy', source: 'spell-descriptions.txt:7842',
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'minor_magic', spell: 'Thaumaturgy', options: ['altered_eyes', 'booming_voice', 'fire_play', 'invisible_hand', 'phantom_sound', 'tremors'], maximumActive: 3 }, concentration: false, durationRounds: 10 },
  },
  {
    id: 'true-strike', source: 'spell-descriptions.txt:8079',
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: {
      kind: 'weapon_attack_augmentation',
      timing: 'during_cast',
      attackAbility: 'spellcasting',
      damageAbility: 'spellcasting',
      damageTypeChoice: 'weapon_or_radiant',
      extraDamage: { type: damageType('Radiant'), dice: pinnedDice(0, 6, { cantripUpgrade: true }) },
    },
  },
  {
    id: 'bane', source: 'spell-descriptions.txt:670',
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 3, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'charisma', rollMode: 'normal', effect: pinnedEffect({ kind: 'd20_test_modifier', tests: ['attack_roll', 'saving_throw'], count: 1, sides: 4, sign: -1 }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'charm-person', source: 'spell-descriptions.txt:1046',
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: pinnedEffect({ kind: 'condition', condition: 'Charmed' }, { durationRounds: 600 }) },
  },
  {
    id: 'bless', source: 'spell-descriptions.txt:824',
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 3, additionalPerSlot: 1 },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'd20_test_modifier', tests: ['attack_roll', 'saving_throw'], count: 1, sides: 4, sign: 1 }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'burning-hands', source: 'spell-descriptions.txt:924',
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cone', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'half', damageType: damageType('Fire'), dice: pinnedDice(3, 6, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'cure-wounds', source: 'spell-descriptions.txt:1895',
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'healing', dice: pinnedDice(2, 8, { perSlotCount: 2 }), addSpellcastingModifier: true },
  },
  {
    id: 'false-life', source: 'spell-descriptions.txt:2930',
    targeting: { kind: 'self' },
    operation: { kind: 'temporary_hit_points', dice: pinnedDice(2, 4, { modifier: 4, perSlotModifier: 5 }) },
  },
  {
    id: 'guiding-bolt', source: 'spell-descriptions.txt:4011',
    targeting: { kind: 'single', rangeFeet: 120, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Radiant'), dice: pinnedDice(4, 6, { perSlotCount: 1 }), rider: pinnedEffect({ kind: 'attack_roll_mode_modifier', mode: 'advantage', appliesTo: { kind: 'next_attack_against_target' } }, { durationRounds: 2, expiresAt: 'source_end' }) },
  },
  {
    id: 'healing-word', source: 'spell-descriptions.txt:4169',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'healing', dice: pinnedDice(2, 4, { perSlotCount: 2 }), addSpellcastingModifier: true },
  },
  {
    id: 'divine-favor', source: 'spell-descriptions.txt:2333-2341',
    targeting: { kind: 'self' },
    operation: { kind: 'weapon_attack_augmentation', timing: 'subsequent_weapon_hits', extraDamage: { type: damageType('Radiant'), dice: pinnedDice(1, 4) }, consumeOnHit: false, concentration: false, durationRounds: 10, followUp: null },
  },
  {
    id: 'ensnaring-strike', source: 'spell-descriptions.txt:2708-2728',
    targeting: { kind: 'self' },
    operation: { kind: 'weapon_attack_augmentation', timing: 'subsequent_weapon_hits', extraDamage: null, consumeOnHit: true, concentration: true, durationRounds: 10, followUp: { kind: 'save_then_restrain', saveAbility: 'strength', rollMode: 'normal', damageType: damageType('Piercing'), dice: pinnedDice(1, 6, { perSlotCount: 1 }), timing: 'target_start', durationRounds: 10 } },
  },
  {
    id: 'inflict-wounds', source: 'spell-descriptions.txt:4593',
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Necrotic'), dice: pinnedDice(2, 10, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'magic-missile', source: 'spell-descriptions.txt:5033',
    targeting: { kind: 'multiple', rangeFeet: 120, baseMaximum: 3, additionalPerSlot: 1 },
    operation: { kind: 'magic_missiles', baseDarts: 3, additionalPerSlot: 1, damageType: damageType('Force'), dice: pinnedDice(1, 4, { modifier: 1 }) },
  },
  {
    id: 'shield', source: 'spell-descriptions.txt:6937',
    targeting: { kind: 'self' },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'shield_defense', armorClassBonus: 5, magicMissileImmune: true, trigger: 'hit_by_attack_or_targeted_by_magic_missile' }, { target: 'self', durationRounds: 1 }) },
  },
  {
    id: 'searing-smite', source: 'spell-descriptions.txt:6738-6751',
    targeting: { kind: 'self' },
    operation: { kind: 'weapon_attack_augmentation', timing: 'subsequent_weapon_hits', extraDamage: { type: damageType('Fire'), dice: pinnedDice(1, 6, { perSlotCount: 1 }) }, consumeOnHit: true, concentration: false, durationRounds: 10, followUp: { kind: 'ongoing_damage_save_ends', damageType: damageType('Fire'), dice: pinnedDice(1, 6, { perSlotCount: 1 }), saveAbility: 'constitution', timing: 'target_start', durationRounds: 10 } },
  },
  {
    id: 'shield-of-faith', source: 'spell-descriptions.txt:6956',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'armor_class_modifier', amount: 2 }, { concentration: true, durationRounds: 100 }) },
  },
  {
    id: 'thunderwave', source: 'spell-descriptions.txt:7868',
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cube', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Thunder'), dice: pinnedDice(2, 8, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 10 },
  },
  {
    id: 'alarm', source: 'spell-descriptions.txt:70',
    targeting: { kind: 'area', rangeFeet: 30, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0 },
    operation: { kind: 'utility', effect: { kind: 'alarm_ward', placement: 'selected_when_cast', maximumCubeFeet: 20, audibleRangeFeet: 60, mentalRangeFeet: 5280 }, concentration: false, durationRounds: 4800 },
  },
  {
    id: 'chromatic-orb', source: 'spell-descriptions.txt:1079',
    targeting: { kind: 'single', rangeFeet: 90, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: [damageType('Acid'), damageType('Cold'), damageType('Fire'), damageType('Lightning'), damageType('Poison'), damageType('Thunder')], dice: pinnedDice(3, 8, { perSlotCount: 1 }), rider: null },
  },
  {
    id: 'color-spray', source: 'spell-descriptions.txt:1193',
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cone', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'save_effect', ability: 'constitution', rollMode: 'normal', effect: pinnedEffect({ kind: 'condition', condition: 'Blinded' }, { durationRounds: 2, expiresAt: 'source_end' }) },
  },
  {
    id: 'command', source: 'spell-descriptions.txt:1209',
    targeting: { kind: 'multiple', rangeFeet: 60, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: pinnedEffect({ kind: 'commanded_action', options: ['approach', 'drop', 'flee', 'grovel', 'halt'], selectedOption: 'selected_when_cast' }, { durationRounds: 1, expiresAt: 'target_end' }) },
  },
  {
    id: 'comprehend-languages', source: 'spell-descriptions.txt:1304',
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'language_comprehension', secondsPerPage: 60, decodesSecretMessages: false }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'create-or-destroy-water', source: 'spell-descriptions.txt:1797',
    targeting: { kind: 'area', rangeFeet: 30, shape: 'cube', baseSizeFeet: 30, sizePerSlotFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'environmental_water', placement: 'selected_when_cast', gallons: 10, gallonsPerSlot: 10, cubeFeet: 30, cubeFeetPerSlot: 5 }, concentration: false, durationRounds: null },
  },
  {
    id: 'detect-evil-and-good', source: 'spell-descriptions.txt:2068',
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'creature_types_and_hallow', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'detect-magic', source: 'spell-descriptions.txt:2085',
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'magic', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'detect-poison-and-disease', source: 'spell-descriptions.txt:2103',
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'poison_and_disease', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'disguise-self', source: 'spell-descriptions.txt:2185',
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'appearance_illusion', maximumHeightChangeFeet: 1, investigationAgainstSpellDc: true }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'expeditious-retreat', source: 'spell-descriptions.txt:2810',
    targeting: { kind: 'self' },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'bonus_action_dash', immediateDash: true }, { target: 'self', concentration: true, durationRounds: 100 }) },
  },
  {
    id: 'feather-fall', source: 'spell-descriptions.txt:2964',
    targeting: { kind: 'multiple', rangeFeet: 60, baseMaximum: 5, additionalPerSlot: 0 },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'falling_protection', descentFeetPerRound: 60, preventsLandingDamage: true }, { durationRounds: 10 }) },
  },
  {
    id: 'find-familiar', source: 'spell-descriptions.txt:2979',
    targeting: { kind: 'utility', rangeFeet: 10 },
    operation: { kind: 'utility', effect: { kind: 'summoned_familiar', forms: ['Bat', 'Cat', 'Frog', 'Hawk', 'Lizard', 'Octopus', 'Owl', 'Rat', 'Raven', 'Spider', 'Weasel', 'other CR 0 Beast'], telepathyFeet: 100 }, concentration: false, durationRounds: null, stateful: true },
  },
  {
    id: 'floating-disk', source: 'spell-descriptions.txt:3335',
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'floating_disk', diameterFeet: 3, heightFeet: 3, thicknessInches: 1, capacityPounds: 500, followDistanceFeet: 20, maximumDistanceFeet: 100 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'fog-cloud', source: 'spell-descriptions.txt:3396',
    targeting: { kind: 'area', rangeFeet: 120, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 20 },
    operation: { kind: 'utility', effect: { kind: 'obscured_area', placement: 'selected_when_cast', radiusFeet: 20, obscurement: 'heavy', dispersedByStrongWind: true }, concentration: true, durationRounds: 600 },
  },
  {
    id: 'grease', source: 'spell-descriptions.txt:3883',
    targeting: { kind: 'area', rangeFeet: 60, shape: 'cube', baseSizeFeet: 10, sizePerSlotFeet: 0, surface: 'ground_square' },
    operation: {
      kind: 'persistent_area', origin: 'selected_when_cast', shape: null,
      durationRounds: 10, concentration: false, targetFilter: 'all', includeOwner: false,
      difficultTerrain: true,
      material: {
        id: 'grease',
        flammability: {
          kind: 'optional_rule', rule: 'flammable_grease', ignition: pinnedSurfaceBurningRule(),
        },
      },
      movableFeet: null,
      hooks: (['on_enter', 'on_end_of_turn_inside'] as const).map((hook) => ({
        hook, frequency: 'once_per_turn' as const,
        effect: {
          kind: 'save_gated' as const, ability: 'dexterity' as const, rollMode: 'normal' as const,
          onSuccess: 'none' as const,
          payload: {
            kind: 'effect' as const,
            payload: { kind: 'condition' as const, condition: 'Prone' as const },
            lifetime: { kind: 'fixed_rounds' as const, rounds: 1, boundary: 'end' as const },
          },
        },
      })),
      initialEffects: [],
    },
  },
  {
    id: 'hideous-laughter', source: 'spell-descriptions.txt:4294',
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: pinnedEffect({ kind: 'condition_bundle', conditions: ['Prone', 'Incapacitated'] }, { concentration: true, durationRounds: 10, expiresAt: 'target_end' }) },
  },
  {
    id: 'ice-knife', source: 'spell-descriptions.txt:4430',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'attack_then_save_damage', attackKind: 'ranged', attackDamageType: damageType('Piercing'), attackDice: pinnedDice(1, 10), saveAbility: 'dexterity', saveDamageType: damageType('Cold'), saveDice: pinnedDice(2, 6, { perSlotCount: 1 }), onSaveSuccess: 'none', burstShape: 'sphere', burstRadiusFeet: 5 },
  },
  {
    id: 'identify', source: 'spell-descriptions.txt:4476',
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'magic_identification', identifiesPropertiesChargesAndSpells: true }, concentration: false, durationRounds: null },
  },
  {
    id: 'illusory-script', source: 'spell-descriptions.txt:4495',
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'illusory_script', truesightReadsHiddenMessage: true }, concentration: false, durationRounds: 144000 },
  },
  {
    id: 'jump', source: 'spell-descriptions.txt:4710',
    targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1, willing: true },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'jump_movement', jumpFeet: 30, movementCostFeet: 10, usesPerTurn: 1 }, { durationRounds: 10 }) },
  },
  {
    id: 'longstrider', source: 'spell-descriptions.txt:4904',
    targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'movement_modifier', speedDeltaFeet: 10 }, { durationRounds: 600 }) },
  },
  {
    id: 'mage-armor', source: 'spell-descriptions.txt:4920',
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'base_armor_class', base: 13, addsDexterityModifier: true, requiresUnarmored: true }, { durationRounds: 4800 }) },
  },
  {
    id: 'protection-from-evil-and-good', source: 'spell-descriptions.txt:6337',
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'creature_type_protection', creatureTypes: ['Aberration', 'Celestial', 'Elemental', 'Fey', 'Fiend', 'Undead'] }, { concentration: true, durationRounds: 100 }) },
  },
  {
    id: 'purify-food-and-drink', source: 'spell-descriptions.txt:6369',
    targeting: { kind: 'area', rangeFeet: 10, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
    operation: { kind: 'utility', effect: { kind: 'food_purification', placement: 'selected_when_cast', radiusFeet: 5, removesPoisonAndRot: true }, concentration: false, durationRounds: null },
  },
  {
    id: 'ray-of-sickness', source: 'spell-descriptions.txt:6456',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Poison'), dice: pinnedDice(2, 8, { perSlotCount: 1 }), rider: pinnedEffect({ kind: 'condition', condition: 'Poisoned' }, { durationRounds: 2, expiresAt: 'source_end' }) },
  },
  {
    id: 'sanctuary', source: 'spell-descriptions.txt:6662',
    targeting: { kind: 'single', rangeFeet: 30, willing: false },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'sanctuary', saveAbility: 'wisdom' }, { durationRounds: 10 }) },
  },
  {
    id: 'silent-image', source: 'spell-descriptions.txt:7042',
    targeting: { kind: 'area', rangeFeet: 60, shape: 'cube', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'utility', effect: { kind: 'image_illusion', placement: 'selected_when_cast', maximumCubeFeet: 15, movableByMagicAction: true, investigationAgainstSpellDc: true }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'sleep', source: 'spell-descriptions.txt:7103',
    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: pinnedEffect({ kind: 'sleep_sequence', initial: 'Incapacitated', failedRepeat: 'Unconscious' }, { concentration: true, durationRounds: 10, expiresAt: 'target_end' }), excludeCaster: true },
  },
  {
    id: 'unseen-servant', source: 'spell-descriptions.txt:8131',
    targeting: { kind: 'utility', rangeFeet: 60 },
    operation: { kind: 'utility', effect: { kind: 'unseen_servant', armorClass: 10, hitPoints: 1, strength: 2, moveFeetPerBonusAction: 15, maximumDistanceFeet: 60 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'vicious-mockery', source: 'spell-descriptions.txt:8176-8195',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'save_damage', ability: 'wisdom', onSuccess: 'none', damageType: damageType('Psychic'), dice: pinnedDice(1, 6, { cantripUpgrade: true }), riderOnFailure: pinnedEffect({ kind: 'attack_roll_mode_modifier', mode: 'disadvantage', appliesTo: { kind: 'next_attack_by_target' } }, { durationRounds: 1, expiresAt: 'target_end' }), pushFeetOnFailure: 0 },
  },
  {
    id: 'faerie-fire', source: 'spell-descriptions.txt:2887-2900',
    targeting: { kind: 'area', rangeFeet: 60, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0 },
    operation: { kind: 'save_effect', ability: 'dexterity', rollMode: 'normal', effect: pinnedEffect({ kind: 'faerie_fire', attackModeAgainstTarget: 'advantage', preventsInvisibleConditionBenefit: true, dimLightFeet: 10 }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'entangle', source: 'spell-descriptions.txt:2729-2756',
    targeting: { kind: 'area', rangeFeet: 90, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0, surface: 'ground_square' },
    operation: { kind: 'persistent_area', origin: 'selected_when_cast', shape: null, durationRounds: 10, concentration: true, targetFilter: 'all', includeOwner: false, difficultTerrain: true, movableFeet: null, hooks: [], initialEffects: [{ excludeOwner: true, effect: { kind: 'save_gated', ability: 'strength', rollMode: 'normal', onSuccess: 'none', payload: { kind: 'effect', payload: { kind: 'condition', condition: 'Restrained' }, lifetime: { kind: 'area_duration' } } } }] },
  },
  {
    id: 'dissonant-whispers', source: 'spell-descriptions.txt:2289-2312',
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'save_damage', ability: 'wisdom', onSuccess: 'half', damageType: damageType('Psychic'), dice: pinnedDice(3, 6, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'goodberry', source: 'spell-descriptions.txt:3870-3881',
    targeting: { kind: 'self' },
    operation: { kind: 'effect', effect: pinnedEffect({ kind: 'consumable_healing_pool', remainingUses: 10, healingPerUse: 1, activation: 'bonus_action', encounterExpiry: 'not_tracked_24_hours' }, { target: 'self', durationRounds: null, stacking: 'coexist' }) },
  },
];

function definitionRange(definition: SpellDefinition): number {
  return definition.targeting.kind === 'self' || definition.targeting.kind === 'remote'
    ? 0
    : definition.targeting.rangeFeet;
}

function operationDice(definition: SpellDefinition): readonly [number, number] | null {
  const operation = definition.operation;
  switch (operation.kind) {
    case 'composition':
    case 'shared_outcome':
    case 'reaction':
    case 'caster_choice':
    case 'random_branch':
    case 'target_branch':
    case 'reevaluated_branch':
    case 'condition_lifecycle':
    case 'roll_mode_modifier':
    case 'armor_class_modifier':
    case 'damage_response_modifier':
    case 'roll_defense_modifier':
    case 'targeted_defense_modifier':
    case 'sustained_effect':
    case 'summon':
    case 'form_replacement':
      return null;
    case 'heat_metal':
      return [operation.dice.baseCount, operation.dice.sides];
    case 'roll_dice_modifier':
    case 'damage_dice_reduction':
      return [operation.die.count, operation.die.sides];
    case 'damage_operation': {
      const packet = operation.packets[0];
      return packet === undefined ? null : [packet.dice.baseCount, packet.dice.sides];
    }
    case 'armed_weapon_hit_rider':
      return operation.damage === null
        ? null
        : [operation.damage.dice.baseCount, operation.damage.dice.sides];
    case 'persistent_area': {
      const damage = [...operation.hooks.map((hook) => hook.effect), ...operation.initialEffects.map((initial) => initial.effect)]
        .find((spec) => spec.payload.kind === 'damage');
      return damage?.payload.kind === 'damage'
        ? [damage.payload.dice.baseCount, damage.payload.dice.sides]
        : null;
    }
    case 'world_operations': {
      const damage = operation.operations
        .find((candidate) => candidate.kind === 'damage_objects');
      if (damage?.kind !== 'damage_objects') return null;
      const term = damage.damage.terms[0];
      return term === undefined ? null : [term.dice.count, term.dice.sides];
    }
    case 'movement_region':
      return operation.damage === null ? null : [operation.damage.dice.count, operation.damage.dice.sides];
    case 'teleport':
    case 'forced_movement':
    case 'movement_mode':
    case 'speed_modification':
      return null;
    case 'attack_damage':
    case 'save_damage':
    case 'healing':
    case 'temporary_hit_points':
    case 'magic_missiles':
      return [operation.dice.baseCount, operation.dice.sides];
    case 'attack_then_save_damage':
      return [operation.saveDice.baseCount, operation.saveDice.sides];
    case 'attack_damage_over_time':
      return [operation.initialDice.baseCount, operation.initialDice.sides];
    case 'save_multi_damage':
      return operation.terms[0] === undefined ? null : [operation.terms[0].dice.baseCount, operation.terms[0].dice.sides];
    case 'save_damage_over_time':
      return [operation.initialDice.baseCount, operation.initialDice.sides];
    case 'save_damage_and_effect':
      return [operation.dice.baseCount, operation.dice.sides];
    case 'attack_rays':
    case 'attack_beams':
    case 'summoned_weapon_attack':
    case 'lifedrain_attack':
      return [operation.dice.baseCount, operation.dice.sides];
    case 'weapon_attack_augmentation':
      return operation.extraDamage === null
        ? null
        : [operation.extraDamage.dice.baseCount, operation.extraDamage.dice.sides];
    case 'fixed_healing':
    case 'effect':
    case 'hit_point_maximum_increase':
    case 'save_push':
    case 'remove_condition':
    case 'remove_condition_and_effect':
    case 'save_branch_effect':
    case 'reaction_save_cancel':
    case 'dispel_magic':
    case 'remove_curse':
    case 'revive':
    case 'save_effect':
    case 'stabilize':
    case 'utility':
      return null;
  }
}

function operationPerSlot(definition: SpellDefinition): number {
  const operation = definition.operation;
  switch (operation.kind) {
    case 'composition':
    case 'shared_outcome':
    case 'reaction':
    case 'caster_choice':
    case 'random_branch':
    case 'target_branch':
    case 'reevaluated_branch':
    case 'condition_lifecycle':
    case 'roll_dice_modifier':
    case 'damage_dice_reduction':
    case 'roll_mode_modifier':
    case 'armor_class_modifier':
    case 'damage_response_modifier':
    case 'roll_defense_modifier':
    case 'targeted_defense_modifier':
    case 'sustained_effect':
    case 'summon':
    case 'form_replacement':
      return 0;
    case 'heat_metal':
      return operation.dice.perSlotCount;
    case 'damage_operation':
      return operation.packets[0]?.dice.perSlotCount ?? 0;
    case 'armed_weapon_hit_rider':
      return operation.damage?.dice.perSlotCount ?? 0;
    case 'persistent_area': {
      const damage = [...operation.hooks.map((hook) => hook.effect), ...operation.initialEffects.map((initial) => initial.effect)]
        .find((spec) => spec.payload.kind === 'damage');
      return damage?.payload.kind === 'damage' ? damage.payload.dice.perSlotCount : 0;
    }
    case 'world_operations':
      // World-operation damage uses a concrete DamageRequest and never scales by slot.
      return 0;
    case 'teleport':
    case 'forced_movement':
    case 'movement_mode':
    case 'movement_region':
    case 'speed_modification':
      return 0;
    case 'attack_damage':
    case 'save_damage':
    case 'healing':
    case 'temporary_hit_points':
      return operation.dice.perSlotCount;
    case 'attack_then_save_damage':
      return operation.saveDice.perSlotCount;
    case 'attack_damage_over_time':
      return operation.initialDice.perSlotCount;
    case 'save_multi_damage':
      return operation.terms[0]?.dice.perSlotCount ?? 0;
    case 'save_damage_over_time':
      return operation.initialDice.perSlotCount;
    case 'save_damage_and_effect':
      return operation.dice.perSlotCount;
    case 'attack_rays':
    case 'attack_beams':
      return operation.dice.perSlotCount;
    case 'summoned_weapon_attack':
    case 'lifedrain_attack':
      return operation.dice.perSlotCount;
    case 'magic_missiles':
      return operation.dice.perSlotCount;
    case 'weapon_attack_augmentation':
      return operation.extraDamage?.dice.perSlotCount ??
        (operation.timing === 'subsequent_weapon_hits' ? operation.followUp?.dice.perSlotCount ?? 0 : 0);
    case 'fixed_healing':
      return operation.additionalPerSlot;
    case 'hit_point_maximum_increase':
      return operation.additionalPerSlot;
    case 'effect':
    case 'save_push':
    case 'remove_condition':
    case 'remove_condition_and_effect':
    case 'save_branch_effect':
    case 'reaction_save_cancel':
    case 'dispel_magic':
    case 'remove_curse':
    case 'revive':
    case 'save_effect':
    case 'stabilize':
    case 'utility':
      return 0;
  }
}

function areaFor(definition: SpellDefinition, slotLevel: number | null): SpellCastCommand['area'] {
  if (definition.id === 'ice-knife') {
    return { shape: 'sphere', template: { origin: feetPoint(10, 10), radius: feet(5) } };
  }
  if (definition.targeting.kind !== 'area') return null;
  const size = definition.targeting.baseSizeFeet + definition.targeting.sizePerSlotFeet *
    ((slotLevel ?? definition.level) - definition.level);
  switch (definition.targeting.shape) {
    case 'sphere':
      return { shape: 'sphere', template: { origin: feetPoint(10, 10), radius: feet(size) } };
    case 'cone':
      return { shape: 'cone', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(size), includeOrigin: false } };
    case 'cube': {
      const center = Math.ceil((size / 2) / 5) * 5;
      return { shape: 'cube', template: { origin: feetPoint(center - size / 2, center), center: feetPoint(center, center), axis: { x: 1, y: 0 }, size: feet(size), includeOrigin: false } };
    }
    case 'line':
      return { shape: 'line', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(size), width: feet(definition.targeting.secondarySizeFeet ?? 10), includeOrigin: false } };
    case 'cylinder':
    case 'emanation':
      throw new Error(`No level-1 batch fixture for ${definition.targeting.shape}.`);
  }
}

function castCommand(
  definition: SpellDefinition,
  caster: ReturnType<typeof playerProfile>,
  target: ReturnType<typeof monsterProfile>,
  slotLevel: number | null = definition.level === 0 ? null : definition.level,
): SpellCastCommand {
  const operation = definition.operation;
  let targets = definition.targeting.kind === 'single' ? [target.id] : [];
  if (definition.targeting.kind === 'multiple') {
    const count = operation.kind === 'magic_missiles'
      ? operation.baseDarts + operation.additionalPerSlot * ((slotLevel as number) - definition.level)
      : operation.kind === 'attack_rays'
        ? operation.baseRays + operation.additionalPerSlot * ((slotLevel as number) - definition.level)
        : operation.kind === 'attack_beams'
          ? operation.baseBeams + operation.additionalBeamLevels.filter((level) => 7 >= level).length
        : 1;
    targets = Array.from({ length: count }, () => target.id);
  }
  return {
    type: 'cast_spell',
    actor: caster.id,
    spellId: definition.id,
    slotLevel,
    castAsRitual: false,
    casterLevel: 7,
    attackBonus: 100,
    saveDc: 100,
    spellcastingModifier: 3,
    targets,
    area: areaFor(definition, slotLevel),
    weaponAttack: definition.id === 'true-strike'
      ? { attackBonus: 100, damageType: damageType('Slashing'), damageCount: 1, damageSides: 8, damageModifier: 3 }
      : null,
    selectedOption: definition.id === 'resistance' || definition.id === 'chromatic-orb'
      ? 'Fire'
      : definition.id === 'guidance' ? 'Arcana'
          : definition.id === 'blindness-deafness' ? 'Blinded'
          : definition.id === 'lesser-restoration' ? 'Poisoned'
            : definition.id === 'command' ? 'halt'
            : null,
  };
}

function fixture(definition: SpellDefinition): {
  readonly caster: ReturnType<typeof playerProfile>;
  readonly target: ReturnType<typeof monsterProfile>;
  readonly state: EncounterState;
} {
  const caster = playerProfile(`caster-${definition.id}`, {
    hitPoints: 200,
    initiativeBonus: 20,
    spellSlots: referencePartySpellSlots('Wizard'),
  });
  const target = monsterProfile(`target-${definition.id}`, {
    hitPoints: 200,
    initiativeBonus: 0,
    usesDeathSaves: true,
  });
  let state = createEncounter({
    bounds: { columns: 12, rows: 6 },
    combatants: [caster, target],
    tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)],
  });
  if (definition.castingTime !== 'minute' && definition.castingTime !== 'ten_minutes' && definition.castingTime !== 'hour') {
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  }
  if (definition.operation.kind === 'healing') {
    state = {
      ...state,
      combatants: state.combatants.map((subject) =>
        subject.profile.id === target.id ? { ...subject, hitPoints: 1 } : subject),
    };
  }
  if (definition.operation.kind === 'stabilize') {
    state = {
      ...state,
      combatants: state.combatants.map((subject) =>
        subject.profile.id === target.id
          ? { ...subject, hitPoints: 0, life: 'dying', deathSaves: { successes: 0, failures: 0 } }
          : subject),
    };
  }
  return { caster, target, state };
}

describe('reference-party spell manifest', () => {
  it('is the exact reference-party union plus all source-pinned D318.1 spell additions', () => {
    const levels = new Map(parseSrdSpellDescriptions().map((spell) => [spell.name, spell.level]));
    const expected = new Map<string, Set<string>>();
    for (const list of ['Cleric', 'Wizard'] as const) {
      for (const membership of parseSrdSpellList(list)) {
        const level = levels.get(membership.spell_name);
        if (level !== undefined && level <= 4) {
          const lists = expected.get(membership.spell_name) ?? new Set<string>();
          lists.add(list);
          expected.set(membership.spell_name, lists);
        }
      }
    }
    expected.set('Eldritch Blast', new Set(['Warlock']));
    expected.set('Divine Favor', new Set(['Paladin']));
    expected.set('Ensnaring Strike', new Set(['Ranger']));
    expected.set('Searing Smite', new Set(['Paladin']));
    expected.set('Moonbeam', new Set(['Druid']));
    expected.set('Heal', new Set(['Cleric', 'Druid']));
    expected.set('Vicious Mockery', new Set(['Bard']));
    expected.set('Faerie Fire', new Set(['Bard', 'Druid']));
    expected.set('Entangle', new Set(['Druid', 'Ranger']));
    expected.set('Dissonant Whispers', new Set(['Bard']));
    expected.set('Goodberry', new Set(['Druid', 'Ranger']));
    expected.set('Pass without Trace', new Set(['Druid', 'Ranger']));
    expected.set('Hold Monster', new Set(['Bard', 'Sorcerer', 'Warlock', 'Wizard']));

    expect(SPELL_MANIFEST).toHaveLength(EXPECTED_MANIFEST_TOTAL);
    expect(new Set(SPELL_MANIFEST.map((row) => row.id)).size).toBe(EXPECTED_MANIFEST_TOTAL);
    expect(SPELL_MANIFEST.map((row) => row.name).sort()).toEqual([...expected.keys()].sort());
    for (const level of [0, 1, 2, 3, 4, 5, 6, 7, 8, 9] as const) {
      expect(SPELL_MANIFEST.filter((row) => row.level === level), `level ${level}`).toHaveLength(EXPECTED_LEVEL_TOTALS[level]);
    }
    for (const row of SPELL_MANIFEST) {
      expect(row.memberships.map((membership) => membership.list).sort()).toEqual(
        [...(expected.get(row.name) ?? [])].sort(),
      );
      expect(row.memberships.every((membership) =>
        /^docs\/srd\/source\/(?:bard|cleric|druid|paladin|ranger|sorcerer|warlock|wizard)-spell-list\.txt:\d+$/u.test(membership.source))).toBe(true);
      if ('partial' in row) expect(row.partial.trim().length).toBeGreaterThan(20);
    }
  });

  it('closes the manifest with exactly 188 implemented and zero pending rows', () => {
    expect(SPELL_MANIFEST.filter((row) => row.status === 'implemented')).toHaveLength(EXPECTED_IMPLEMENTED);
    expect(SPELL_MANIFEST.filter((row) => row.status === 'pending')).toHaveLength(EXPECTED_PENDING);
    expect(IMPLEMENTED_SPELL_DEFINITIONS).toHaveLength(EXPECTED_IMPLEMENTED);
    expect(() => assertSpellManifestBurnDown(SPELL_MANIFEST, spellDefinition)).not.toThrow();
  });

  it('closed manifest rejects marking any implemented row pending', () => {
    const pendingIndex = 0;
    const mutated: SpellManifestRow[] = SPELL_MANIFEST.map((row, index) =>
      index === pendingIndex ? { ...row, status: 'pending' } : row);
    expect(() => assertSpellManifestBurnDown(mutated, spellDefinition)).toThrow(
      'is not closed',
    );
  });
});

describe('spell foundations and implemented value pins', () => {
  // Independently transcribed from the cited creature-you-can-see clauses.
  const sightRequiredPins = new Set(['bane', 'charm-person', 'magic-missile', 'command']);
  it('has one exhaustive mechanics pin for every implemented cantrip and level-1 definition', () => {
    expect(COMPLETE_MECHANICS_PINS).toHaveLength(EXPECTED_CANTRIP_AND_LEVEL_ONE_IMPLEMENTED);
    expect(COMPLETE_MECHANICS_PINS.map((pin) => pin.id).sort()).toEqual(
      IMPLEMENTED_SPELL_DEFINITIONS.filter((definition) => definition.level <= 1).map((definition) => definition.id).sort(),
    );
  });

  it.each(COMPLETE_MECHANICS_PINS)('$id pins every targeting and operation literal from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({ targeting: definition.targeting, operation: definition.operation }).toEqual({
      targeting: sightRequiredPins.has(pin.id) ? { ...pin.targeting, requiresSight: true } : pin.targeting,
      operation: pin.operation,
    });
  });

  it('uses the two independently printed level-7 full-caster slot rows: 4/3/3/1', () => {
    // docs/srd/source/class-level-tables.txt:73,311.
    expect(referencePartySpellSlots('Cleric')).toEqual([
      { level: 1, maximum: 4 },
      { level: 2, maximum: 3 },
      { level: 3, maximum: 3 },
      { level: 4, maximum: 1 },
    ]);
    expect(referencePartySpellSlots('Wizard')).toEqual(referencePartySpellSlots('Cleric'));
    expect(referencePartySpellSlots('Fighter')).toEqual([]);
  });

  it.each(VALUE_PINS)('$id pins level, range, operation, dice, and scaling from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    expect(definition).not.toBeNull();
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({
      level: definition.level,
      operation: definition.operation.kind,
      rangeFeet: definitionRange(definition),
      baseDice: operationDice(definition),
      perSlotCount: operationPerSlot(definition),
    }).toEqual({
      level: pin.level,
      operation: pin.operation,
      rangeFeet: pin.rangeFeet,
      baseDice: pin.baseDice,
      perSlotCount: pin.perSlotCount,
    });
  });

  it.each(LEVEL_ONE_BATCH_NUMERIC_PINS)('$id pins every numeric mechanic from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect(numericLeaves({
      targeting: definition.targeting,
      operation: definition.operation,
    })).toEqual(pin.mechanics);
  });

  it.each(LEVEL_ONE_BATCH_COMPONENT_PINS)('$id pins casting time and components from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({
      castingTime: definition.castingTime,
      components: componentCode(definition),
      material: definition.components.material?.text ?? null,
      consumed: definition.components.material?.consumed ?? false,
      ritual: definition.ritual === true,
    }).toEqual({
      castingTime: pin.castingTime,
      components: pin.components,
      material: pin.material,
      consumed: pin.consumed,
      ritual: pin.ritual === true,
    });
  });

  it('Fog Cloud rejects a wrong radius before spending its action or slot', () => {
    // Fog Cloud, docs/srd/source/spell-descriptions.txt:3396: 20-foot radius.
    const definition = spellDefinition('fog-cloud');
    if (definition === null) throw new Error('Fog Cloud definition missing.');
    const { caster, target, state } = fixture(definition);
    const command = castCommand(definition, caster, target);
    const wrongRadius = {
      ...command,
      area: { shape: 'sphere' as const, template: { origin: feetPoint(10, 10), radius: feet(15) } },
    };
    expect(() => reduceEncounter(state, wrongRadius, () => 0.5)).toThrow(
      'requires a 20-foot sphere template',
    );
    expect(state.combatants.find((subject) => subject.profile.id === caster.id)?.turn.action).toEqual({ kind: 'available' });
    expect(state.combatants.find((subject) => subject.profile.id === caster.id)?.spellSlots[0]?.remaining).toBe(4);
  });

  it('level-2 Fog Cloud validates and stores its 40-foot upcast radius', () => {
    // Fog Cloud, docs/srd/source/spell-descriptions.txt:3396: +20-foot radius per slot level.
    const definition = spellDefinition('fog-cloud');
    if (definition === null) throw new Error('Fog Cloud definition missing.');
    const { caster, target, state } = fixture(definition);
    const result = reduceEncounter(state, castCommand(definition, caster, target, 2), () => 0.5);
    const fog = result.state.effects.find((candidate) => candidate.payload.kind === 'obscured_area');
    expect(fog?.payload).toMatchObject({ kind: 'obscured_area', radiusFeet: 40 });
  });

  it('level-2 Create or Destroy Water resolves 20 gallons and a 35-foot cube', () => {
    // Create or Destroy Water, docs/srd/source/spell-descriptions.txt:1797: +10 gallons or +5 feet per slot level.
    const definition = spellDefinition('create-or-destroy-water');
    if (definition === null) throw new Error('Create or Destroy Water definition missing.');
    const { caster, target, state } = fixture(definition);
    const result = reduceEncounter(state, castCommand(definition, caster, target, 2), () => 0.5);
    const utility = result.events.find((event) =>
      event.type === 'spell_utility_resolved' && event.spellId === definition.id);
    expect(utility?.type === 'spell_utility_resolved' ? utility.effect : null).toMatchObject({
      kind: 'environmental_water',
      gallons: 20,
      cubeFeet: 35,
    });
  });

  it('Alarm can be cast as a ritual without expending a spell slot', () => {
    // Alarm, docs/srd/source/spell-descriptions.txt:70: Casting Time 1 minute or Ritual.
    const definition = spellDefinition('alarm');
    if (definition === null) throw new Error('Alarm definition missing.');
    const { caster, target, state } = fixture(definition);
    const command = {
      ...castCommand(definition, caster, target, null),
      castAsRitual: true,
    };
    const result = reduceEncounter(state, command, () => 0.5);
    expect(result.state.combatants.find((subject) => subject.profile.id === caster.id)?.spellSlots[0]?.remaining).toBe(4);
    expect(result.state.effects.some((candidate) => candidate.payload.kind === 'alarm_ward')).toBe(true);
  });

  it('stores V/S/M flags, material text, and consumption as definition data', () => {
    expect(spellDefinition('shield')?.components).toEqual({ verbal: true, somatic: true, material: null });
    expect(spellDefinition('true-strike')?.components).toEqual({
      verbal: false,
      somatic: true,
      material: {
        text: 'a weapon with which you have proficiency and that is worth 1+ CP',
        consumed: false,
      },
    });
    expect(spellDefinition('bless')?.components.material).toEqual({
      text: 'a Holy Symbol worth 5+ GP',
      consumed: false,
    });
  });

  it('higher-slot Cure Wounds expends that slot and uses its 4d8 scaled effect', () => {
    const definition = spellDefinition('cure-wounds');
    if (definition === null) throw new Error('Cure Wounds definition missing.');
    const { caster, target, state } = fixture(definition);
    const result = reduceEncounter(state, castCommand(definition, caster, target, 2), () => 0);
    const patient = result.state.combatants.find((subject) => subject.profile.id === target.id);
    const levelTwo = result.state.combatants
      .find((subject) => subject.profile.id === caster.id)?.spellSlots
      .find((slot) => slot.level === 2);
    expect(patient?.hitPoints).toBe(8); // 1 + 4d8 rolled as four 1s + spellcasting modifier 3.
    expect(levelTwo).toEqual({ level: 2, maximum: 3, remaining: 2 });
  });

  it('cantrip scaling changes exactly at levels 5, 11, and 17', () => {
    // Fire Bolt, docs/srd/source/spell-descriptions.txt:3193-3200.
    for (const [casterLevel, expectedDamage] of [[4, 1], [5, 2], [10, 2], [11, 3], [16, 3], [17, 4]] as const) {
      const definition = spellDefinition('fire-bolt');
      if (definition === null) throw new Error('Fire Bolt definition missing.');
      const { caster, target, state } = fixture(definition);
      let draw = 0;
      const result = reduceEncounter(
        state,
        { ...castCommand(definition, caster, target), casterLevel },
        () => (draw++ === 0 ? 0.5 : 0),
      );
      const damage = result.events.find((event) => event.type === 'damage_applied');
      expect(damage?.amount, `caster level ${casterLevel}`).toBe(expectedDamage);
    }
  });

  it.each([
    { casterLevel: 5, bonusDice: 1, expectedDamage: 7 },
    { casterLevel: 11, bonusDice: 2, expectedDamage: 8 },
    { casterLevel: 17, bonusDice: 3, expectedDamage: 9 },
  ] as const)(
    'true_strike_keeps_str substitutes spellcasting for attack and damage and adds $bonusDice d6 at level $casterLevel',
    ({ casterLevel, bonusDice, expectedDamage }) => {
      // SRD 5.2.1: docs/srd/source/spell-descriptions.txt:8086-8094.
      // Those lines pin both substitutions, the optional Radiant conversion,
      // and the literal level 5/11/17 progression independently of engine output.
      const definition = spellDefinition('true-strike');
      if (definition === null) throw new Error('True Strike definition missing.');
      const { caster, target, state } = fixture(definition);
      const result = reduceEncounter(state, {
        ...castCommand(definition, caster, target),
        casterLevel,
        attackBonus: 7,
        spellcastingModifier: 5,
        selectedOption: 'Radiant',
        weaponAttack: {
          attackBonus: -30,
          damageType: damageType('Slashing'),
          damageCount: 1,
          damageSides: 8,
          damageModifier: -4,
        },
      }, () => 0);
      const attack = result.events.find((event) => event.type === 'attack_resolved');
      expect(attack).toMatchObject({
        attack: { total: 8, outcome: 'miss' },
      });

      let draw = 0;
      const hitResult = reduceEncounter(state, {
        ...castCommand(definition, caster, target),
        casterLevel,
        attackBonus: 100,
        spellcastingModifier: 5,
        selectedOption: 'Radiant',
        weaponAttack: {
          attackBonus: -30,
          damageType: damageType('Slashing'),
          damageCount: 1,
          damageSides: 8,
          damageModifier: -4,
        },
      }, () => draw++ === 0 ? 0.5 : 0);
      expect(hitResult.events.find((event) => event.type === 'attack_resolved')).toMatchObject({
        attack: { total: 111, outcome: 'hit' },
        damage: {
          total: expectedDamage,
          terms: [
            { type: damageType('Radiant'), roll: { expression: { modifier: 5 } } },
            { type: damageType('Radiant'), roll: { expression: { count: bonusDice, sides: 6 } } },
          ],
        },
      });
    },
  );

  it('beam_count_off_by_level pins Eldritch Blast to 1/2/3/4 beams at levels 1/5/11/17', () => {
    const definition = spellDefinition('eldritch-blast');
    if (definition === null) throw new Error('Eldritch Blast definition missing.');
    expect(definition.operation).toMatchObject({
      kind: 'attack_beams',
      baseBeams: 1,
      additionalBeamLevels: [5, 11, 17],
    });
    for (const [casterLevel, beamCount] of [[1, 1], [5, 2], [11, 3], [17, 4]] as const) {
      const { caster, target, state } = fixture(definition);
      const command = {
        ...castCommand(definition, caster, target),
        casterLevel,
        attackBonus: -30,
        targets: Array.from({ length: beamCount }, () => target.id),
      };
      const result = reduceEncounter(state, command, () => 0);
      expect(
        result.events.filter((event) => event.type === 'attack_resolved'),
        `caster level ${String(casterLevel)}`,
      ).toHaveLength(beamCount);
    }
  });

  it('beams_share_one_roll resolves each Eldritch Blast beam separately and permits different targets', () => {
    const definition = spellDefinition('eldritch-blast');
    if (definition === null) throw new Error('Eldritch Blast definition missing.');
    const caster = playerProfile('caster-eldritch-independent', { initiativeBonus: 20 });
    const firstTarget = monsterProfile('eldritch-first-target', { hitPoints: 200, initiativeBonus: 0 });
    const secondTarget = monsterProfile('eldritch-second-target', { hitPoints: 200, initiativeBonus: -10 });
    let state = createEncounter({
      bounds: { columns: 12, rows: 6 },
      combatants: [caster, firstTarget, secondTarget],
      tokens: [placedToken(caster, 0, 1), placedToken(firstTarget, 1, 1), placedToken(secondTarget, 2, 1)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const draws = [0, 0.999, 0];
    let drawIndex = 0;
    const result = reduceEncounter(state, {
      ...castCommand(definition, caster, firstTarget),
      casterLevel: 5,
      attackBonus: -30,
      targets: [firstTarget.id, secondTarget.id],
    }, () => draws[drawIndex++] ?? 0);
    expect(result.events.filter((event) => event.type === 'attack_resolved')).toMatchObject([
      { target: firstTarget.id, attack: { roll: { faces: [1] }, outcome: 'miss' } },
      { target: secondTarget.id, attack: { roll: { faces: [20] }, outcome: 'critical' } },
    ]);
  });

  it('rejects an out-of-range target before spending its action or slot', () => {
    const definition = spellDefinition('cure-wounds');
    if (definition === null) throw new Error('Cure Wounds definition missing.');
    const { caster, target, state } = fixture(definition);
    const outOfRange = {
      ...state,
      tokens: state.tokens.map((entry) =>
        entry.combatantId === target.id ? { ...entry, position: { column: 3, row: 1 } } : entry),
    };
    expect(() => reduceEncounter(outOfRange, castCommand(definition, caster, target), () => 0.5)).toThrow(
      'out of range',
    );
    expect(outOfRange.combatants.find((subject) => subject.profile.id === caster.id)?.spellSlots[0]).toEqual({
      level: 1,
      maximum: 4,
      remaining: 4,
    });
    expect(outOfRange.combatants.find((subject) => subject.profile.id === caster.id)?.turn.action).toEqual({ kind: 'available' });
  });
});

describe('every implemented cantrip and level-1 spell executes through the encounter reducer', () => {
  it.each(VALUE_PINS)('$id executes its typed $operation mechanics', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const { caster, target, state } = fixture(definition);
    const beforeTarget = state.combatants.find((subject) => subject.profile.id === target.id);
    const result = reduceEncounter(state, castCommand(definition, caster, target), () => 0.5);
    const afterCaster = result.state.combatants.find((subject) => subject.profile.id === caster.id);
    const afterTarget = result.state.combatants.find((subject) => subject.profile.id === target.id);

    expect(result.events.some((event) => event.type === 'spell_cast' && event.spellId === definition.id)).toBe(true);
    if (definition.level > 0) {
      expect(afterCaster?.spellSlots.find((slot) => slot.level === definition.level)?.remaining).toBe(
        definition.level === 1 ? 3 : 2,
      );
    }
    switch (definition.castingTime) {
      case 'action':
        expect(afterCaster?.turn.action).toEqual({ kind: 'spent' });
        break;
      case 'bonus_action':
        expect(afterCaster?.turn.bonusActionAvailable).toBe(false);
        break;
      case 'reaction':
        expect(afterCaster?.turn.reactionAvailable).toBe(false);
        break;
      case 'minute':
      case 'ten_minutes':
      case 'hour':
        expect(result.state.activeCombatant).toBeNull();
        break;
    }
    switch (definition.operation.kind) {
      case 'composition':
      case 'caster_choice':
      case 'random_branch':
      case 'target_branch':
      case 'reevaluated_branch':
      case 'condition_lifecycle':
        expect(result.events.some((event) => event.type === 'spell_cast')).toBe(true);
        break;
      case 'attack_damage':
      case 'attack_damage_over_time':
      case 'attack_rays':
      case 'attack_beams':
      case 'attack_then_save_damage':
      case 'save_damage':
      case 'magic_missiles':
      case 'summoned_weapon_attack':
      case 'lifedrain_attack':
        expect(afterTarget?.hitPoints).toBeLessThan(beforeTarget?.hitPoints ?? 0);
        break;
      case 'weapon_attack_augmentation':
        if (definition.operation.timing === 'during_cast') {
          expect(afterTarget?.hitPoints).toBeLessThan(beforeTarget?.hitPoints ?? 0);
        } else {
          expect(result.state.effects.length).toBeGreaterThan(0);
        }
        break;
      case 'healing':
        expect(afterTarget?.hitPoints).toBeGreaterThan(beforeTarget?.hitPoints ?? 0);
        break;
      case 'temporary_hit_points':
        expect(afterCaster?.temporaryHitPoints).toBeGreaterThan(0);
        break;
      case 'effect':
      case 'hit_point_maximum_increase':
      case 'save_push':
      case 'remove_condition_and_effect':
      case 'save_branch_effect':
      case 'reaction_save_cancel':
      case 'dispel_magic':
      case 'revive':
      case 'save_effect':
        expect(result.state.effects.length).toBeGreaterThan(0);
        break;
      case 'stabilize':
        expect(afterTarget?.life).toBe('stable');
        break;
      case 'utility':
        expect(result.events.some((event) => event.type === 'spell_utility_resolved')).toBe(true);
        break;
      case 'remove_condition':
      case 'remove_curse':
        expect(result.events.some((event) => event.type === 'spell_cast')).toBe(true);
        break;
    }
  });
});
