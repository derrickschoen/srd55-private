import type { EffectPayload } from '../effects';
import { damageType } from '../values';
import type {
  EffectData,
  ScaledDice,
  SpellComponentsData,
  SpellDefinition,
} from './types';

const V: SpellComponentsData = { verbal: true, somatic: false, material: null };
const VS: SpellComponentsData = { verbal: true, somatic: true, material: null };
const S_M_WEAPON: SpellComponentsData = {
  verbal: false,
  somatic: true,
  material: {
    text: 'a weapon with which you have proficiency and that is worth 1+ CP',
    consumed: false,
  },
};

function material(text: string, consumed = false): SpellComponentsData {
  return { verbal: true, somatic: true, material: { text, consumed } };
}

function dice(
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

function effect(
  payload: EffectPayload,
  options: {
    readonly target?: 'self' | 'targets';
    readonly concentration?: boolean;
    readonly durationRounds?: number | null;
    readonly expiresAt?: EffectData['expiresAt'];
  } = {},
): EffectData {
  return {
    payload,
    target: options.target ?? 'targets',
    concentration: options.concentration ?? false,
    durationRounds: options.durationRounds ?? 1,
    expiresAt: options.expiresAt ?? 'source_start',
  };
}

const cantripDamage = (baseCount: number, sides: number): ScaledDice =>
  dice(baseCount, sides, { cantripUpgrade: true });

/**
 * First 4b-i executable batch. Every value below is pinned independently in
 * tests/unit/combat/spells.test.ts against the cited bundled-SRD lines.
 */
export const IMPLEMENTED_SPELL_DEFINITIONS: readonly SpellDefinition[] = [
  {
    id: 'acid-splash', name: 'Acid Splash', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:37-51',
    castingTime: 'action', components: VS,
    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere' },
    operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'none', damageType: damageType('Acid'), dice: cantripDamage(1, 6), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'chill-touch', name: 'Chill Touch', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:1066',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'melee', damageType: damageType('Necrotic'), dice: cantripDamage(1, 10), rider: effect({ kind: 'cannot_regain_hit_points' }) },
  },
  {
    id: 'dancing-lights', name: 'Dancing Lights', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:1906',
    castingTime: 'action', components: material('a bit of phosphorus'),
    targeting: { kind: 'utility', rangeFeet: 120 },
    operation: { kind: 'utility', effect: { kind: 'light_source', brightFeet: 0, dimFeet: 10, maximumLights: 4, moveFeetPerBonusAction: 60 }, concentration: true, durationRounds: 10 },
  },
  {
    id: 'elementalism', name: 'Elementalism', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:2630',
    castingTime: 'action', components: VS,
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'minor_magic', spell: 'Elementalism', options: ['beckon_air', 'beckon_earth', 'beckon_fire', 'beckon_water', 'sculpt_element'], maximumActive: 1 }, concentration: false, durationRounds: null },
  },
  {
    id: 'fire-bolt', name: 'Fire Bolt', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:3184-3200',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 120, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Fire'), dice: cantripDamage(1, 10), rider: null },
  },
  {
    id: 'guidance', name: 'Guidance', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:4000',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: effect({ kind: 'ability_check_modifier', count: 1, sides: 4, sign: 1, skill: 'chosen_when_cast' }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'light', name: 'Light', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:4816',
    castingTime: 'action', components: { verbal: true, somatic: false, material: { text: 'a firefly or phosphorescent moss', consumed: false } },
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'light_source', brightFeet: 20, dimFeet: 20, maximumLights: 1, moveFeetPerBonusAction: 0 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'mage-hand', name: 'Mage Hand', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:4931',
    castingTime: 'action', components: VS,
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'conjured_hand', maximumDistanceFeet: 30, moveFeetPerAction: 30, carryPounds: 10 }, concentration: false, durationRounds: 10 },
  },
  {
    id: 'mending', name: 'Mending', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:5322',
    castingTime: 'minute', components: material('two lodestones'),
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'object_repair', maximumBreakFeet: 1, restoresMagic: false }, concentration: false, durationRounds: null },
  },
  {
    id: 'message', name: 'Message', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:5341',
    castingTime: 'action', components: { verbal: false, somatic: true, material: { text: 'a copper wire', consumed: false } },
    targeting: { kind: 'single', rangeFeet: 120, willing: false },
    operation: { kind: 'utility', effect: { kind: 'communication_link', rangeFeet: 120, permitsReply: true, blockedByMagicalSilence: true }, concentration: false, durationRounds: 1 },
  },
  {
    id: 'minor-illusion', name: 'Minor Illusion', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:5420',
    castingTime: 'action', components: { verbal: false, somatic: true, material: { text: 'a bit of fleece', consumed: false } },
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'illusion', modes: ['sound', 'image'], maximumCubeFeet: 5 }, concentration: false, durationRounds: 10 },
  },
  {
    id: 'poison-spray', name: 'Poison Spray', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:5925',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 30, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Poison'), dice: cantripDamage(1, 12), rider: null },
  },
  {
    id: 'prestidigitation', name: 'Prestidigitation', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:6034',
    castingTime: 'action', components: VS,
    targeting: { kind: 'utility', rangeFeet: 10 },
    operation: { kind: 'utility', effect: { kind: 'minor_magic', spell: 'Prestidigitation', options: ['sensory', 'fire_play', 'clean_or_soil', 'minor_sensation', 'magic_mark', 'minor_creation'], maximumActive: 3 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'ray-of-frost', name: 'Ray of Frost', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:6427',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Cold'), dice: cantripDamage(1, 8), rider: effect({ kind: 'movement_modifier', speedDeltaFeet: -10 }) },
  },
  {
    id: 'resistance', name: 'Resistance', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:6540',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: effect({ kind: 'damage_reduction', damageType: 'chosen_when_cast', count: 1, sides: 4, oncePerTurn: true }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'sacred-flame', name: 'Sacred Flame', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:6645',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'none', damageType: damageType('Radiant'), dice: cantripDamage(1, 8), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'shocking-grasp', name: 'Shocking Grasp', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:7006',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'melee', damageType: damageType('Lightning'), dice: cantripDamage(1, 8), rider: effect({ kind: 'opportunity_attacks_disabled' }) },
  },
  {
    id: 'spare-the-dying', name: 'Spare the Dying', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:7181',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 30, willing: true },
    operation: { kind: 'stabilize' },
  },
  {
    id: 'thaumaturgy', name: 'Thaumaturgy', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:7842',
    castingTime: 'action', components: V,
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'minor_magic', spell: 'Thaumaturgy', options: ['altered_eyes', 'booming_voice', 'fire_play', 'invisible_hand', 'phantom_sound', 'tremors'], maximumActive: 3 }, concentration: false, durationRounds: 10 },
  },
  {
    id: 'true-strike', name: 'True Strike', level: 0,
    source: 'docs/srd/source/spell-descriptions.txt:8079',
    castingTime: 'action', components: S_M_WEAPON,
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'weapon_attack', extraDamage: dice(0, 6, { cantripUpgrade: true }), extraDamageType: damageType('Radiant') },
  },
  {
    id: 'bane', name: 'Bane', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:670',
    castingTime: 'action', components: material('a drop of blood'),
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 3, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'charisma', rollMode: 'normal', effect: effect({ kind: 'd20_test_modifier', tests: ['attack_roll', 'saving_throw'], count: 1, sides: 4, sign: -1 }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'charm-person', name: 'Charm Person', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1046',
    castingTime: 'action', components: VS,
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'advantage', effect: effect({ kind: 'condition', condition: 'Charmed' }, { durationRounds: 600 }) },
  },
  {
    id: 'bless', name: 'Bless', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:824',
    castingTime: 'action', components: material('a Holy Symbol worth 5+ GP'),
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 3, additionalPerSlot: 1 },
    operation: { kind: 'effect', effect: effect({ kind: 'd20_test_modifier', tests: ['attack_roll', 'saving_throw'], count: 1, sides: 4, sign: 1 }, { concentration: true, durationRounds: 10 }) },
  },
  {
    id: 'burning-hands', name: 'Burning Hands', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:924',
    castingTime: 'action', components: VS,
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cone' },
    operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'half', damageType: damageType('Fire'), dice: dice(3, 6, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'cure-wounds', name: 'Cure Wounds', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1895',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'healing', dice: dice(2, 8, { perSlotCount: 2 }), addSpellcastingModifier: true },
  },
  {
    id: 'false-life', name: 'False Life', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2930',
    castingTime: 'action', components: material('a drop of alcohol'),
    targeting: { kind: 'self' },
    operation: { kind: 'temporary_hit_points', dice: dice(2, 4, { modifier: 4, perSlotModifier: 5 }) },
  },
  {
    id: 'guiding-bolt', name: 'Guiding Bolt', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4011',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 120, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Radiant'), dice: dice(4, 6, { perSlotCount: 1 }), rider: effect({ kind: 'attack_roll_mode_modifier', mode: 'advantage', appliesTo: 'next_attack_against_target' }) },
  },
  {
    id: 'healing-word', name: 'Healing Word', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4169',
    castingTime: 'bonus_action', components: V,
    targeting: { kind: 'single', rangeFeet: 60, willing: true },
    operation: { kind: 'healing', dice: dice(2, 4, { perSlotCount: 2 }), addSpellcastingModifier: true },
  },
  {
    id: 'inflict-wounds', name: 'Inflict Wounds', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4593',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 5, willing: false },
    operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Necrotic'), dice: dice(2, 10, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 },
  },
  {
    id: 'magic-missile', name: 'Magic Missile', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:5033',
    castingTime: 'action', components: VS,
    targeting: { kind: 'multiple', rangeFeet: 120, baseMaximum: 3, additionalPerSlot: 1 },
    operation: { kind: 'magic_missiles', baseDarts: 3, additionalPerSlot: 1, damageType: damageType('Force'), dice: dice(1, 4, { modifier: 1 }) },
  },
  {
    id: 'shield', name: 'Shield', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:6937',
    castingTime: 'reaction', components: VS,
    targeting: { kind: 'self' },
    operation: { kind: 'effect', effect: effect({ kind: 'shield_defense', armorClassBonus: 5, magicMissileImmune: true }, { target: 'self', durationRounds: 1 }) },
  },
  {
    id: 'shield-of-faith', name: 'Shield of Faith', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:6956',
    castingTime: 'bonus_action', components: material('a prayer scroll'),
    targeting: { kind: 'single', rangeFeet: 60, willing: true },
    operation: { kind: 'effect', effect: effect({ kind: 'armor_class_modifier', amount: 2 }, { concentration: true, durationRounds: 100 }) },
  },
  {
    id: 'thunderwave', name: 'Thunderwave', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:7868',
    castingTime: 'action', components: VS,
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cube' },
    operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Thunder'), dice: dice(2, 8, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 10 },
  },
] as const;

const definitionsById = new Map(
  IMPLEMENTED_SPELL_DEFINITIONS.map((definition) => [definition.id, definition] as const),
);

export function spellDefinition(id: string): SpellDefinition | null {
  return definitionsById.get(id) ?? null;
}
