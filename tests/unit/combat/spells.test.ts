import { describe, expect, it } from 'vitest';
import {
  parseSrdSpellDescriptions,
  parseSrdSpellList,
} from '../../../src/rules/spells-srd';
import {
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import { damageType, feet } from '../../../src/combat/values';
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
  SpellLevel,
} from '../../../src/combat/spells/types';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

const EXPECTED_LEVEL_TOTALS: Readonly<Record<SpellLevel, number>> = {
  0: 20,
  1: 43,
  2: 45,
  3: 37,
  4: 30,
};
const EXPECTED_MANIFEST_TOTAL = 175;
const EXPECTED_IMPLEMENTED = 63;
const EXPECTED_PENDING = 112;

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
  { id: 'true-strike', level: 0, operation: 'weapon_attack', rangeFeet: 5, baseDice: [0, 6], perSlotCount: 0, source: 'spell-descriptions.txt:8079' },
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
  { id: 'grease', level: 1, operation: 'save_effect', rangeFeet: 60, baseDice: null, perSlotCount: 0, source: 'spell-descriptions.txt:3883' },
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
  { id: 'floating-disk', mechanics: [30, 3, 3, 500, 20, 100, 600], source: 'spell-descriptions.txt:3335' },
  { id: 'fog-cloud', mechanics: [120, 20, 20, 20, 600], source: 'spell-descriptions.txt:3396' },
  { id: 'grease', mechanics: [60, 10, 0, 10], source: 'spell-descriptions.txt:3883' },
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

function definitionRange(definition: SpellDefinition): number {
  return definition.targeting.kind === 'self' ? 0 : definition.targeting.rangeFeet;
}

function operationDice(definition: SpellDefinition): readonly [number, number] | null {
  const operation = definition.operation;
  switch (operation.kind) {
    case 'attack_damage':
    case 'save_damage':
    case 'healing':
    case 'temporary_hit_points':
    case 'magic_missiles':
      return [operation.dice.baseCount, operation.dice.sides];
    case 'attack_then_save_damage':
      return [operation.saveDice.baseCount, operation.saveDice.sides];
    case 'weapon_attack':
      return [operation.extraDamage.baseCount, operation.extraDamage.sides];
    case 'effect':
    case 'save_effect':
    case 'stabilize':
    case 'utility':
      return null;
  }
}

function operationPerSlot(definition: SpellDefinition): number {
  const operation = definition.operation;
  switch (operation.kind) {
    case 'attack_damage':
    case 'save_damage':
    case 'healing':
    case 'temporary_hit_points':
      return operation.dice.perSlotCount;
    case 'attack_then_save_damage':
      return operation.saveDice.perSlotCount;
    case 'magic_missiles':
      return operation.dice.perSlotCount;
    case 'weapon_attack':
      return operation.extraDamage.perSlotCount;
    case 'effect':
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
    case 'cylinder':
    case 'emanation':
      throw new Error(`No level-1 batch fixture for ${definition.targeting.shape}.`);
  }
}

function castCommand(
  definition: SpellDefinition,
  caster: ReturnType<typeof playerProfile>,
  target: ReturnType<typeof monsterProfile>,
  slotLevel: number | null = definition.level === 0 ? null : 1,
): SpellCastCommand {
  const operation = definition.operation;
  let targets = definition.targeting.kind === 'single' ? [target.id] : [];
  if (definition.targeting.kind === 'multiple') {
    const count = operation.kind === 'magic_missiles'
      ? operation.baseDarts + operation.additionalPerSlot * ((slotLevel as number) - definition.level)
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
      : definition.id === 'guidance' ? 'Arcana' : null,
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
  if (definition.castingTime !== 'minute' && definition.castingTime !== 'hour') {
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
  it('is the exact source-list union through level 4 with pinned per-level totals', () => {
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

    expect(SPELL_MANIFEST).toHaveLength(EXPECTED_MANIFEST_TOTAL);
    expect(new Set(SPELL_MANIFEST.map((row) => row.id)).size).toBe(EXPECTED_MANIFEST_TOTAL);
    expect(SPELL_MANIFEST.map((row) => row.name).sort()).toEqual([...expected.keys()].sort());
    for (const level of [0, 1, 2, 3, 4] as const) {
      expect(SPELL_MANIFEST.filter((row) => row.level === level), `level ${level}`).toHaveLength(EXPECTED_LEVEL_TOTALS[level]);
    }
    for (const row of SPELL_MANIFEST) {
      expect(row.memberships.map((membership) => membership.list).sort()).toEqual(
        [...(expected.get(row.name) ?? [])].sort(),
      );
      expect(row.memberships.every((membership) =>
        /^docs\/srd\/source\/(?:cleric|wizard)-spell-list\.txt:\d+$/u.test(membership.source))).toBe(true);
      if ('partial' in row) expect(row.partial.trim().length).toBeGreaterThan(20);
    }
  });

  it('pins the burn-down at exactly 63 implemented and 112 pending rows', () => {
    expect(SPELL_MANIFEST.filter((row) => row.status === 'implemented')).toHaveLength(EXPECTED_IMPLEMENTED);
    expect(SPELL_MANIFEST.filter((row) => row.status === 'pending')).toHaveLength(EXPECTED_PENDING);
    expect(IMPLEMENTED_SPELL_DEFINITIONS).toHaveLength(EXPECTED_IMPLEMENTED);
    expect(() => assertSpellManifestBurnDown(SPELL_MANIFEST, spellDefinition)).not.toThrow();
  });

  it('burn-down rejects marking a pending row implemented without a definition', () => {
    const pendingIndex = SPELL_MANIFEST.findIndex((row) => row.status === 'pending');
    const mutated: SpellManifestRow[] = SPELL_MANIFEST.map((row, index) =>
      index === pendingIndex ? { ...row, status: 'implemented' } : row);
    expect(() => assertSpellManifestBurnDown(mutated, spellDefinition)).toThrow(
      'has no definition',
    );
  });
});

describe('spell foundations and implemented value pins', () => {
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

describe('every implemented spell executes through the encounter reducer', () => {
  it.each(VALUE_PINS)('$id executes its typed $operation mechanics', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const { caster, target, state } = fixture(definition);
    const beforeTarget = state.combatants.find((subject) => subject.profile.id === target.id);
    const result = reduceEncounter(state, castCommand(definition, caster, target), () => 0.5);
    const afterCaster = result.state.combatants.find((subject) => subject.profile.id === caster.id);
    const afterTarget = result.state.combatants.find((subject) => subject.profile.id === target.id);

    expect(result.events.some((event) => event.type === 'spell_cast' && event.spellId === definition.id)).toBe(true);
    if (definition.level === 1) {
      expect(afterCaster?.spellSlots.find((slot) => slot.level === 1)?.remaining).toBe(3);
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
      case 'hour':
        expect(result.state.activeCombatant).toBeNull();
        break;
    }
    switch (definition.operation.kind) {
      case 'attack_damage':
      case 'attack_then_save_damage':
      case 'save_damage':
      case 'magic_missiles':
      case 'weapon_attack':
        expect(afterTarget?.hitPoints).toBeLessThan(beforeTarget?.hitPoints ?? 0);
        break;
      case 'healing':
        expect(afterTarget?.hitPoints).toBeGreaterThan(beforeTarget?.hitPoints ?? 0);
        break;
      case 'temporary_hit_points':
        expect(afterCaster?.temporaryHitPoints).toBeGreaterThan(0);
        break;
      case 'effect':
      case 'save_effect':
        expect(result.state.effects.length).toBeGreaterThan(0);
        break;
      case 'stabilize':
        expect(afterTarget?.life).toBe('stable');
        break;
      case 'utility':
        expect(result.events.some((event) => event.type === 'spell_utility_resolved')).toBe(true);
        break;
    }
  });
});
