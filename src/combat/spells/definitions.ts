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

function materialWith(
  text: string,
  flags: { readonly verbal: boolean; readonly somatic: boolean },
  consumed = false,
): SpellComponentsData {
  return { ...flags, material: { text, consumed } };
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
    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
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
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cone', baseSizeFeet: 15, sizePerSlotFeet: 0 },
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
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cube', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Thunder'), dice: dice(2, 8, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 10 },
  },
  {
    id: 'alarm', name: 'Alarm', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:70',
    castingTime: 'minute', ritual: true, components: material('a bell and silver wire'),
    targeting: { kind: 'area', rangeFeet: 30, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0 },
    operation: { kind: 'utility', effect: { kind: 'alarm_ward', placement: 'selected_when_cast', maximumCubeFeet: 20, audibleRangeFeet: 60, mentalRangeFeet: 5280 }, concentration: false, durationRounds: 4800 },
  },
  {
    id: 'chromatic-orb', name: 'Chromatic Orb', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1079',
    castingTime: 'action', components: material('a diamond worth 50+ GP'),
    targeting: { kind: 'single', rangeFeet: 90, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: [damageType('Acid'), damageType('Cold'), damageType('Fire'), damageType('Lightning'), damageType('Poison'), damageType('Thunder')], dice: dice(3, 8, { perSlotCount: 1 }), rider: null },
  },
  {
    id: 'color-spray', name: 'Color Spray', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1193',
    castingTime: 'action', components: material('a pinch of colorful sand'),
    targeting: { kind: 'area', rangeFeet: 0, shape: 'cone', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'save_effect', ability: 'constitution', rollMode: 'normal', effect: effect({ kind: 'condition', condition: 'Blinded' }, { durationRounds: 2, expiresAt: 'source_end' }) },
  },
  {
    id: 'command', name: 'Command', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1209',
    castingTime: 'action', components: V,
    targeting: { kind: 'multiple', rangeFeet: 60, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'commanded_action', options: ['approach', 'drop', 'flee', 'grovel', 'halt'] }, { durationRounds: 1, expiresAt: 'target_end' }) },
  },
  {
    id: 'comprehend-languages', name: 'Comprehend Languages', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1304',
    castingTime: 'action', ritual: true, components: material('a pinch of soot and salt'),
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'language_comprehension', secondsPerPage: 60, decodesSecretMessages: false }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'create-or-destroy-water', name: 'Create or Destroy Water', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:1797',
    castingTime: 'action', components: material('a mix of water and sand'),
    targeting: { kind: 'area', rangeFeet: 30, shape: 'cube', baseSizeFeet: 30, sizePerSlotFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'environmental_water', placement: 'selected_when_cast', gallons: 10, gallonsPerSlot: 10, cubeFeet: 30, cubeFeetPerSlot: 5 }, concentration: false, durationRounds: null },
  },
  {
    id: 'detect-evil-and-good', name: 'Detect Evil and Good', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2068',
    castingTime: 'action', components: VS,
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'creature_types_and_hallow', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'detect-magic', name: 'Detect Magic', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2085',
    castingTime: 'action', ritual: true, components: VS,
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'magic', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'detect-poison-and-disease', name: 'Detect Poison and Disease', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2103',
    castingTime: 'action', ritual: true, components: material('a yew leaf'),
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'detection_sense', detects: 'poison_and_disease', radiusFeet: 30 }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'disguise-self', name: 'Disguise Self', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2185',
    castingTime: 'action', components: VS,
    targeting: { kind: 'self' },
    operation: { kind: 'utility', effect: { kind: 'appearance_illusion', maximumHeightChangeFeet: 1, investigationAgainstSpellDc: true }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'expeditious-retreat', name: 'Expeditious Retreat', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2810',
    castingTime: 'bonus_action', components: VS,
    targeting: { kind: 'self' },
    operation: { kind: 'effect', effect: effect({ kind: 'bonus_action_dash', immediateDash: true }, { target: 'self', concentration: true, durationRounds: 100 }) },
  },
  {
    id: 'feather-fall', name: 'Feather Fall', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2964',
    castingTime: 'reaction', components: materialWith('a small feather or piece of down', { verbal: true, somatic: false }),
    targeting: { kind: 'multiple', rangeFeet: 60, baseMaximum: 5, additionalPerSlot: 0 },
    operation: { kind: 'effect', effect: effect({ kind: 'falling_protection', descentFeetPerRound: 60, preventsLandingDamage: true }, { durationRounds: 10 }) },
  },
  {
    id: 'find-familiar', name: 'Find Familiar', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:2979',
    castingTime: 'hour', ritual: true, components: material('burning incense worth 10+ GP', true),
    targeting: { kind: 'utility', rangeFeet: 10 },
    operation: { kind: 'utility', effect: { kind: 'summoned_familiar', forms: ['Bat', 'Cat', 'Frog', 'Hawk', 'Lizard', 'Octopus', 'Owl', 'Rat', 'Raven', 'Spider', 'Weasel', 'other CR 0 Beast'], telepathyFeet: 100 }, concentration: false, durationRounds: null, stateful: true },
  },
  {
    id: 'floating-disk', name: 'Floating Disk', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:3335',
    castingTime: 'action', ritual: true, components: material('a drop of mercury'),
    targeting: { kind: 'utility', rangeFeet: 30 },
    operation: { kind: 'utility', effect: { kind: 'floating_disk', diameterFeet: 3, heightFeet: 3, capacityPounds: 500, followDistanceFeet: 20, maximumDistanceFeet: 100 }, concentration: false, durationRounds: 600 },
  },
  {
    id: 'fog-cloud', name: 'Fog Cloud', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:3396',
    castingTime: 'action', components: VS,
    targeting: { kind: 'area', rangeFeet: 120, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 20 },
    operation: { kind: 'utility', effect: { kind: 'obscured_area', placement: 'selected_when_cast', radiusFeet: 20, obscurement: 'heavy', dispersedByStrongWind: true }, concentration: true, durationRounds: 600 },
  },
  {
    id: 'grease', name: 'Grease', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:3883',
    castingTime: 'action', components: material('a bit of pork rind or butter'),
    targeting: { kind: 'area', rangeFeet: 60, shape: 'cube', baseSizeFeet: 10, sizePerSlotFeet: 0 },
    operation: { kind: 'save_effect', ability: 'dexterity', rollMode: 'normal', effect: effect({ kind: 'condition', condition: 'Prone' }, { durationRounds: 10, expiresAt: 'target_end' }) },
  },
  {
    id: 'hideous-laughter', name: 'Hideous Laughter', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4294',
    castingTime: 'action', components: material('a tart and a feather'),
    targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'condition_bundle', conditions: ['Prone', 'Incapacitated'] }, { concentration: true, durationRounds: 10, expiresAt: 'target_end' }) },
  },
  {
    id: 'ice-knife', name: 'Ice Knife', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4430',
    castingTime: 'action', components: materialWith('a drop of water or a piece of ice', { verbal: false, somatic: true }),
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'attack_then_save_damage', attackKind: 'ranged', attackDamageType: damageType('Piercing'), attackDice: dice(1, 10), saveAbility: 'dexterity', saveDamageType: damageType('Cold'), saveDice: dice(2, 6, { perSlotCount: 1 }), onSaveSuccess: 'none', burstShape: 'sphere', burstRadiusFeet: 5 },
  },
  {
    id: 'identify', name: 'Identify', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4476',
    castingTime: 'minute', ritual: true, components: material('a pearl worth 100+ GP'),
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'magic_identification', identifiesPropertiesChargesAndSpells: true }, concentration: false, durationRounds: null },
  },
  {
    id: 'illusory-script', name: 'Illusory Script', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4495',
    castingTime: 'minute', ritual: true, components: materialWith('ink worth 10+ GP', { verbal: false, somatic: true }, true),
    targeting: { kind: 'utility', rangeFeet: 5 },
    operation: { kind: 'utility', effect: { kind: 'illusory_script', truesightReadsHiddenMessage: true }, concentration: false, durationRounds: 144000 },
  },
  {
    id: 'jump', name: 'Jump', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4710',
    castingTime: 'bonus_action', components: material('a grasshopper\'s hind leg'),
    targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'effect', effect: effect({ kind: 'jump_movement', jumpFeet: 30, movementCostFeet: 10, usesPerTurn: 1 }, { durationRounds: 10 }) },
  },
  {
    id: 'longstrider', name: 'Longstrider', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4904',
    castingTime: 'action', components: material('a pinch of dirt'),
    targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1 },
    operation: { kind: 'effect', effect: effect({ kind: 'movement_modifier', speedDeltaFeet: 10 }, { durationRounds: 600 }) },
  },
  {
    id: 'mage-armor', name: 'Mage Armor', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:4920',
    castingTime: 'action', components: material('a piece of cured leather'),
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: effect({ kind: 'base_armor_class', base: 13, addsDexterityModifier: true, requiresUnarmored: true }, { durationRounds: 4800 }) },
  },
  {
    id: 'protection-from-evil-and-good', name: 'Protection from Evil and Good', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:6337',
    castingTime: 'action', components: material('a flask of Holy Water worth 25+ GP', true),
    targeting: { kind: 'single', rangeFeet: 5, willing: true },
    operation: { kind: 'effect', effect: effect({ kind: 'creature_type_protection', creatureTypes: ['Aberration', 'Celestial', 'Elemental', 'Fey', 'Fiend', 'Undead'] }, { concentration: true, durationRounds: 100 }) },
  },
  {
    id: 'purify-food-and-drink', name: 'Purify Food and Drink', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:6369',
    castingTime: 'action', ritual: true, components: VS,
    targeting: { kind: 'area', rangeFeet: 10, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
    operation: { kind: 'utility', effect: { kind: 'food_purification', placement: 'selected_when_cast', radiusFeet: 5, removesPoisonAndRot: true }, concentration: false, durationRounds: null },
  },
  {
    id: 'ray-of-sickness', name: 'Ray of Sickness', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:6456',
    castingTime: 'action', components: VS,
    targeting: { kind: 'single', rangeFeet: 60, willing: false },
    operation: { kind: 'attack_damage', attackKind: 'ranged', damageType: damageType('Poison'), dice: dice(2, 8, { perSlotCount: 1 }), rider: effect({ kind: 'condition', condition: 'Poisoned' }, { durationRounds: 2, expiresAt: 'source_end' }) },
  },
  {
    id: 'sanctuary', name: 'Sanctuary', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:6662',
    castingTime: 'bonus_action', components: material('a shard of glass from a mirror'),
    targeting: { kind: 'single', rangeFeet: 30, willing: true },
    operation: { kind: 'effect', effect: effect({ kind: 'sanctuary', saveAbility: 'wisdom' }, { durationRounds: 10 }) },
  },
  {
    id: 'silent-image', name: 'Silent Image', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:7042',
    castingTime: 'action', components: material('a bit of fleece'),
    targeting: { kind: 'area', rangeFeet: 60, shape: 'cube', baseSizeFeet: 15, sizePerSlotFeet: 0 },
    operation: { kind: 'utility', effect: { kind: 'image_illusion', placement: 'selected_when_cast', maximumCubeFeet: 15, movableByMagicAction: true, investigationAgainstSpellDc: true }, concentration: true, durationRounds: 100 },
  },
  {
    id: 'sleep', name: 'Sleep', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:7103',
    castingTime: 'action', components: material('a pinch of sand or rose petals'),
    targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 },
    operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'sleep_sequence', initial: 'Incapacitated', failedRepeat: 'Unconscious' }, { concentration: true, durationRounds: 10, expiresAt: 'target_end' }), excludeCaster: true },
  },
  {
    id: 'unseen-servant', name: 'Unseen Servant', level: 1,
    source: 'docs/srd/source/spell-descriptions.txt:8131',
    castingTime: 'action', ritual: true, components: material('a bit of string and of wood'),
    targeting: { kind: 'utility', rangeFeet: 60 },
    operation: { kind: 'utility', effect: { kind: 'unseen_servant', armorClass: 10, hitPoints: 1, strength: 2, moveFeetPerBonusAction: 15, maximumDistanceFeet: 60 }, concentration: false, durationRounds: 600 },
  },
] as const;

const definitionsById = new Map(
  IMPLEMENTED_SPELL_DEFINITIONS.map((definition) => [definition.id, definition] as const),
);

export function spellDefinition(id: string): SpellDefinition | null {
  return definitionsById.get(id) ?? null;
}
