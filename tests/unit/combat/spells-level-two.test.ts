import { describe, expect, it } from 'vitest';
import type { EffectPayload } from '../../../src/combat/effects';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { IMPLEMENTED_SPELL_DEFINITIONS, spellDefinition } from '../../../src/combat/spells/definitions';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type { EffectData, ScaledDice, SpellCastCommand, SpellCastingTime, SpellDefinition } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, feet } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

interface LevelTwoMechanicsPin {
  readonly id: string;
  readonly source: `spell-descriptions.txt:${number}`;
  readonly targeting: SpellDefinition['targeting'];
  readonly operation: SpellDefinition['operation'];
}

function dice(baseCount: number, sides: number, options: {
  readonly modifier?: number;
  readonly perSlotCount?: number;
  readonly perSlotModifier?: number;
  readonly cantripUpgrade?: boolean;
} = {}): ScaledDice {
  return {
    baseCount,
    sides,
    modifier: options.modifier ?? 0,
    perSlotCount: options.perSlotCount ?? 0,
    perSlotModifier: options.perSlotModifier ?? 0,
    cantripUpgrade: options.cantripUpgrade ?? false,
  };
}

function effect(payload: EffectPayload, options: {
  readonly target?: 'self' | 'targets';
  readonly concentration?: boolean;
  readonly durationRounds?: number | null;
  readonly expiresAt?: EffectData['expiresAt'];
  readonly repeatedSave?: EffectData['repeatedSave'];
} = {}): EffectData {
  return {
    payload,
    target: options.target ?? 'targets',
    concentration: options.concentration ?? false,
    durationRounds: options.durationRounds ?? 1,
    expiresAt: options.expiresAt ?? 'source_start',
    ...(options.repeatedSave === undefined ? {} : { repeatedSave: options.repeatedSave }),
  };
}

/** Independent literal oracle transcribed from each cited SRD entry. */
const LEVEL_TWO_MECHANICS_PINS: readonly LevelTwoMechanicsPin[] = [
  { id: 'acid-arrow', source: 'spell-descriptions.txt:20', targeting: { kind: 'single', rangeFeet: 90, willing: false }, operation: { kind: 'attack_damage_over_time', attackKind: 'ranged', damageType: damageType('Acid'), initialDice: dice(4, 4, { perSlotCount: 1 }), missDamage: 'half_initial', laterDice: dice(2, 4, { perSlotCount: 1 }), laterTiming: 'target_end' } },
  { id: 'aid', source: 'spell-descriptions.txt:53', targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 3, additionalPerSlot: 0 }, operation: { kind: 'hit_point_maximum_increase', baseAmount: 5, additionalPerSlot: 5 } },
  { id: 'alter-self', source: 'spell-descriptions.txt:101', targeting: { kind: 'self' }, operation: { kind: 'utility', effect: { kind: 'form_alteration', options: ['aquatic_adaptation', 'change_appearance', 'natural_weapons'], naturalWeaponCount: 1, naturalWeaponSides: 6 }, concentration: true, durationRounds: 600 } },
  { id: 'arcane-lock', source: 'spell-descriptions.txt:479', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'arcane_lock', passwordRangeFeet: 5, passwordUnlockRounds: 10 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'arcanists-magic-aura', source: 'spell-descriptions.txt:527', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'magic_aura', options: ['mask', 'false_aura'], permanentAfterDailyCastings: 30 }, concentration: false, durationRounds: 14400 } },
  { id: 'augury', source: 'spell-descriptions.txt:595', targeting: { kind: 'self' }, operation: { kind: 'utility', effect: { kind: 'augury', forecastMinutes: 30, noAnswerChancePerExtraCastingPercent: 25 }, concentration: false, durationRounds: null } },
  { id: 'blindness-deafness', source: 'spell-descriptions.txt:859', targeting: { kind: 'multiple', rangeFeet: 120, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'save_effect', ability: 'constitution', rollMode: 'normal', effect: effect({ kind: 'condition_choice', conditions: ['Blinded', 'Deafened'] }, { durationRounds: 10, expiresAt: 'target_end', repeatedSave: { ability: 'constitution', rollMode: 'normal', timing: 'target_end' } }) } },
  { id: 'blur', source: 'spell-descriptions.txt:907', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'attacks_against_target_roll_mode', mode: 'disadvantage', bypassedBy: ['Blindsight', 'Truesight'] }, { target: 'self', concentration: true, durationRounds: 10 }) } },
  { id: 'calm-emotions', source: 'spell-descriptions.txt:972', targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'save_effect', ability: 'charisma', rollMode: 'normal', effect: effect({ kind: 'calm_emotions', options: ['suppress_charmed_frightened', 'indifferent'] }, { concentration: true, durationRounds: 10 }) } },
  { id: 'continual-flame', source: 'spell-descriptions.txt:1647', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'light_source', brightFeet: 20, dimFeet: 20, maximumLights: 1, moveFeetPerBonusAction: 0 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'darkness', source: 'spell-descriptions.txt:1929', targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 15, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'obscured_area', placement: 'selected_when_cast', radiusFeet: 15, obscurement: 'magical_darkness', dispersedByStrongWind: false, blocksDarkvision: true, suppressesLightSpellLevelAtMost: 2 }, concentration: true, durationRounds: 100 } },
  { id: 'darkvision', source: 'spell-descriptions.txt:1952', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'darkvision', rangeFeet: 150 }, { durationRounds: 4800 }) } },
  { id: 'detect-thoughts', source: 'spell-descriptions.txt:2119', targeting: { kind: 'self' }, operation: { kind: 'utility', effect: { kind: 'detect_thoughts', radiusFeet: 30, probeSaveAbility: 'wisdom', escapeCheckAbility: 'intelligence', escapeCheckSkill: 'Arcana' }, concentration: true, durationRounds: 10 } },
  { id: 'dragons-breath', source: 'spell-descriptions.txt:2492', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'granted_breath', damageTypes: ['Acid', 'Cold', 'Fire', 'Lightning', 'Poison'], coneFeet: 15, saveAbility: 'dexterity', onSuccess: 'half', dice: { baseCount: 3, sides: 6, perSlotCount: 1 } }, { concentration: true, durationRounds: 10 }) } },
  { id: 'enhance-ability', source: 'spell-descriptions.txt:2660', targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'effect', effect: effect({ kind: 'ability_check_advantage', ability: 'chosen_when_cast' }, { concentration: true, durationRounds: 600 }) } },
  { id: 'enlarge-reduce', source: 'spell-descriptions.txt:2679', targeting: { kind: 'single', rangeFeet: 30, willing: false }, operation: { kind: 'effect', effect: effect({ kind: 'size_alteration', options: ['enlarge', 'reduce'], sizeCategoryDelta: 1, damageDieCount: 1, damageDieSides: 4 }, { concentration: true, durationRounds: 10 }) } },
  { id: 'find-traps', source: 'spell-descriptions.txt:3131', targeting: { kind: 'utility', rangeFeet: 120 }, operation: { kind: 'utility', effect: { kind: 'trap_detection', rangeFeet: 120, revealsLocation: false }, concentration: false, durationRounds: null } },
  { id: 'flaming-sphere', source: 'spell-descriptions.txt:3276', targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 2.5, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'flaming_sphere', placement: 'selected_when_cast', diameterFeet: 5, damageCount: 2, damageSides: 6, damagePerSlotCount: 1, moveFeetPerBonusAction: 30, brightFeet: 20, dimFeet: 20 }, concentration: true, durationRounds: 10 } },
  { id: 'gentle-repose', source: 'spell-descriptions.txt:3682', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'corpse_preservation', preventsDecayAndUndeath: true }, concentration: false, durationRounds: 144000 } },
  { id: 'gust-of-wind', source: 'spell-descriptions.txt:4027', targeting: { kind: 'area', rangeFeet: 0, shape: 'line', baseSizeFeet: 60, sizePerSlotFeet: 0 }, operation: { kind: 'save_push', ability: 'strength', pushFeetOnFailure: 15, effect: effect({ kind: 'gust_of_wind_area', placement: 'selected_when_cast', widthFeet: 10, movementCostMultiplierTowardSource: 2, dispersesGas: true, unprotectedFlameExtinguished: true }, { target: 'self', concentration: true, durationRounds: 10 }) } },
  { id: 'hold-person', source: 'spell-descriptions.txt:4342', targeting: { kind: 'multiple', rangeFeet: 60, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'condition', condition: 'Paralyzed' }, { concentration: true, durationRounds: 10, expiresAt: 'target_end', repeatedSave: { ability: 'wisdom', rollMode: 'normal', timing: 'target_end' } }) } },
  { id: 'invisibility', source: 'spell-descriptions.txt:4691', targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'effect', effect: effect({ kind: 'condition', condition: 'Invisible' }, { concentration: true, durationRounds: 600 }) } },
  { id: 'knock', source: 'spell-descriptions.txt:4734', targeting: { kind: 'utility', rangeFeet: 60 }, operation: { kind: 'utility', effect: { kind: 'object_unlock', arcaneLockSuppressionRounds: 100, audibleRangeFeet: 300, unlocksOneLock: true }, concentration: false, durationRounds: null } },
  { id: 'lesser-restoration', source: 'spell-descriptions.txt:4774', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'remove_condition', conditions: ['Blinded', 'Deafened', 'Paralyzed', 'Poisoned'] } },
  { id: 'levitate', source: 'spell-descriptions.txt:4788', targeting: { kind: 'single', rangeFeet: 60, willing: false }, operation: { kind: 'save_effect', ability: 'constitution', rollMode: 'normal', effect: effect({ kind: 'levitation', initialRiseFeet: 20, maximumWeightPounds: 500, altitudeChangeFeetPerTurn: 20 }, { concentration: true, durationRounds: 100 }) } },
  { id: 'locate-object', source: 'spell-descriptions.txt:4881', targeting: { kind: 'self' }, operation: { kind: 'utility', effect: { kind: 'object_location', radiusFeet: 1000, familiarityDistanceFeet: 30, blockedByLead: true }, concentration: true, durationRounds: 100 } },
  { id: 'magic-mouth', source: 'spell-descriptions.txt:5048', targeting: { kind: 'utility', rangeFeet: 30 }, operation: { kind: 'utility', effect: { kind: 'magic_mouth', maximumWords: 25, maximumMessageRounds: 100, triggerRadiusFeet: 30 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'magic-weapon', source: 'spell-descriptions.txt:5081', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'magic_weapon', baseBonus: 1, levelThreeBonus: 2, levelSixBonus: 3 }, { target: 'self', durationRounds: 600 }) } },
  { id: 'mind-spike', source: 'spell-descriptions.txt:5398', targeting: { kind: 'single', rangeFeet: 120, willing: false }, operation: { kind: 'save_damage', ability: 'wisdom', onSuccess: 'half', damageType: damageType('Psychic'), dice: dice(3, 8, { perSlotCount: 1 }), riderOnFailure: effect({ kind: 'location_tracking', samePlaneOnly: true, negatesHiddenAndInvisibleBenefits: true }, { concentration: true, durationRounds: 600 }), pushFeetOnFailure: 0 } },
  { id: 'mirror-image', source: 'spell-descriptions.txt:5481', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'mirror_images', duplicates: 3, interceptionDieSides: 6, interceptionMinimum: 3 }, { target: 'self', durationRounds: 10 }) } },
  { id: 'misty-step', source: 'spell-descriptions.txt:5523', targeting: { kind: 'self' }, operation: { kind: 'utility', effect: { kind: 'teleport', maximumDistanceFeet: 30, requiresVisibleUnoccupiedSpace: true }, concentration: false, durationRounds: null } },
  { id: 'prayer-of-healing', source: 'spell-descriptions.txt:6014', targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 5, additionalPerSlot: 0 }, operation: { kind: 'healing', dice: dice(2, 8, { perSlotCount: 1 }), addSpellcastingModifier: false } },
  { id: 'protection-from-poison', source: 'spell-descriptions.txt:6359', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'remove_condition_and_effect', condition: 'Poisoned', effect: effect({ kind: 'poison_protection', saveMode: 'advantage', resistanceType: 'Poison' }, { durationRounds: 600 }) } },
  { id: 'ray-of-enfeeblement', source: 'spell-descriptions.txt:6407', targeting: { kind: 'single', rangeFeet: 60, willing: false }, operation: { kind: 'save_branch_effect', ability: 'constitution', successEffect: effect({ kind: 'ray_enfeeblement', branch: 'success', damagePenaltyCount: 0, damagePenaltySides: 8 }, { concentration: true, durationRounds: 1, expiresAt: 'source_start' }), failureEffect: effect({ kind: 'ray_enfeeblement', branch: 'failure', damagePenaltyCount: 1, damagePenaltySides: 8 }, { concentration: true, durationRounds: 10, expiresAt: 'target_end', repeatedSave: { ability: 'constitution', rollMode: 'normal', timing: 'target_end' } }) } },
  { id: 'rope-trick', source: 'spell-descriptions.txt:6619', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'rope_trick', portalWidthFeet: 3, portalHeightFeet: 5, maximumCreatures: 8 }, concentration: false, durationRounds: 600 } },
  { id: 'scorching-ray', source: 'spell-descriptions.txt:6678', targeting: { kind: 'multiple', rangeFeet: 120, baseMaximum: 3, additionalPerSlot: 1 }, operation: { kind: 'attack_rays', baseRays: 3, additionalPerSlot: 1, damageType: damageType('Fire'), dice: dice(2, 6) } },
  { id: 'see-invisibility', source: 'spell-descriptions.txt:6784', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'see_invisibility', seesEtherealPlane: true }, { target: 'self', durationRounds: 600 }) } },
  { id: 'shatter', source: 'spell-descriptions.txt:6921', targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 10, sizePerSlotFeet: 0 }, operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Thunder'), dice: dice(3, 8, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 } },
  { id: 'silence', source: 'spell-descriptions.txt:7026', targeting: { kind: 'area', rangeFeet: 120, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'silence_area', placement: 'selected_when_cast', radiusFeet: 20, thunderImmune: true, verbalComponentsImpossible: true }, concentration: true, durationRounds: 100 } },
  { id: 'spider-climb', source: 'spell-descriptions.txt:7278', targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'effect', effect: effect({ kind: 'spider_climb', climbSpeedEqualsSpeed: true, handsFree: true }, { concentration: true, durationRounds: 600 }) } },
  { id: 'spiritual-weapon', source: 'spell-descriptions.txt:7353', targeting: { kind: 'single', rangeFeet: 60, willing: false }, operation: { kind: 'summoned_weapon_attack', damageType: damageType('Force'), dice: dice(1, 8, { perSlotCount: 1 }), addSpellcastingModifier: true, attackReachFeet: 5, moveFeetPerBonusAction: 20, effect: effect({ kind: 'spiritual_weapon', moveFeetPerBonusAction: 20, attackReachFeet: 5 }, { target: 'self', concentration: true, durationRounds: 10 }) } },
  { id: 'suggestion', source: 'spell-descriptions.txt:7477', targeting: { kind: 'single', rangeFeet: 30, willing: false }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'condition', condition: 'Charmed' }, { concentration: true, durationRounds: 4800 }) } },
  { id: 'warding-bond', source: 'spell-descriptions.txt:8388', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'warding_bond', maximumDistanceFeet: 60, armorClassBonus: 1, savingThrowBonus: 1, resistanceToAllDamage: true, mirrorsDamageToSource: true }, { durationRounds: 600 }) } },
  { id: 'web', source: 'spell-descriptions.txt:8453', targeting: { kind: 'area', rangeFeet: 60, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'save_effect', ability: 'dexterity', rollMode: 'normal', effect: effect({ kind: 'web_area', placement: 'selected_when_cast', cubeFeet: 20, flatDepthFeet: 5, fireDamageCount: 2, fireDamageSides: 4 }, { concentration: true, durationRounds: 600 }) } },
  { id: 'zone-of-truth', source: 'spell-descriptions.txt:8699', targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 15, sizePerSlotFeet: 0 }, operation: { kind: 'save_effect', ability: 'charisma', rollMode: 'normal', effect: effect({ kind: 'truth_zone', placement: 'selected_when_cast', radiusFeet: 15, saveAbility: 'charisma' }, { durationRounds: 100 }) } },
];

interface LevelTwoComponentPin {
  readonly id: string;
  readonly castingTime: SpellCastingTime;
  readonly components: 'V' | 'VS' | 'S' | 'VM' | 'VSM';
  readonly material: string | null;
  readonly consumed: boolean;
  readonly ritual: boolean;
  readonly source: `spell-descriptions.txt:${number}`;
}

/** Independent casting/component oracle transcribed from the same cited SRD headings. */
const LEVEL_TWO_COMPONENT_PINS: readonly LevelTwoComponentPin[] = [
  { id: 'acid-arrow', castingTime: 'action', components: 'VSM', material: 'powdered rhubarb leaf', consumed: false, ritual: false, source: 'spell-descriptions.txt:20' },
  { id: 'aid', castingTime: 'action', components: 'VSM', material: 'a strip of white cloth', consumed: false, ritual: false, source: 'spell-descriptions.txt:53' },
  { id: 'alter-self', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:101' },
  { id: 'arcane-lock', castingTime: 'action', components: 'VSM', material: 'gold dust worth 25+ GP', consumed: true, ritual: false, source: 'spell-descriptions.txt:479' },
  { id: 'arcanists-magic-aura', castingTime: 'action', components: 'VSM', material: 'a small square of silk', consumed: false, ritual: false, source: 'spell-descriptions.txt:527' },
  { id: 'augury', castingTime: 'minute', components: 'VSM', material: 'specially marked sticks, bones, cards, or other divinatory tokens worth 25+ GP', consumed: false, ritual: true, source: 'spell-descriptions.txt:595' },
  { id: 'blindness-deafness', castingTime: 'action', components: 'V', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:859' },
  { id: 'blur', castingTime: 'action', components: 'V', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:907' },
  { id: 'calm-emotions', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:972' },
  { id: 'continual-flame', castingTime: 'action', components: 'VSM', material: 'ruby dust worth 50+ GP', consumed: true, ritual: false, source: 'spell-descriptions.txt:1647' },
  { id: 'darkness', castingTime: 'action', components: 'VM', material: 'bat fur and a piece of coal', consumed: false, ritual: false, source: 'spell-descriptions.txt:1929' },
  { id: 'darkvision', castingTime: 'action', components: 'VSM', material: 'a dried carrot', consumed: false, ritual: false, source: 'spell-descriptions.txt:1952' },
  { id: 'detect-thoughts', castingTime: 'action', components: 'VSM', material: '1 Copper Piece', consumed: false, ritual: false, source: 'spell-descriptions.txt:2119' },
  { id: 'dragons-breath', castingTime: 'bonus_action', components: 'VSM', material: 'a hot pepper', consumed: false, ritual: false, source: 'spell-descriptions.txt:2492' },
  { id: 'enhance-ability', castingTime: 'action', components: 'VSM', material: 'fur or a feather', consumed: false, ritual: false, source: 'spell-descriptions.txt:2660' },
  { id: 'enlarge-reduce', castingTime: 'action', components: 'VSM', material: 'a pinch of powdered iron', consumed: false, ritual: false, source: 'spell-descriptions.txt:2679' },
  { id: 'find-traps', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:3131' },
  { id: 'flaming-sphere', castingTime: 'action', components: 'VSM', material: 'a ball of wax', consumed: false, ritual: false, source: 'spell-descriptions.txt:3276' },
  { id: 'gentle-repose', castingTime: 'action', components: 'VSM', material: '2 Copper Pieces', consumed: true, ritual: true, source: 'spell-descriptions.txt:3682' },
  { id: 'gust-of-wind', castingTime: 'action', components: 'VSM', material: 'a legume seed', consumed: false, ritual: false, source: 'spell-descriptions.txt:4027' },
  { id: 'hold-person', castingTime: 'action', components: 'VSM', material: 'a straight piece of iron', consumed: false, ritual: false, source: 'spell-descriptions.txt:4342' },
  { id: 'invisibility', castingTime: 'action', components: 'VSM', material: 'an eyelash in gum arabic', consumed: false, ritual: false, source: 'spell-descriptions.txt:4691' },
  { id: 'knock', castingTime: 'action', components: 'V', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:4734' },
  { id: 'lesser-restoration', castingTime: 'bonus_action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:4774' },
  { id: 'levitate', castingTime: 'action', components: 'VSM', material: 'a metal spring', consumed: false, ritual: false, source: 'spell-descriptions.txt:4788' },
  { id: 'locate-object', castingTime: 'action', components: 'VSM', material: 'a forked twig', consumed: false, ritual: false, source: 'spell-descriptions.txt:4881' },
  { id: 'magic-mouth', castingTime: 'minute', components: 'VSM', material: 'jade dust worth 10+ GP', consumed: true, ritual: true, source: 'spell-descriptions.txt:5048' },
  { id: 'magic-weapon', castingTime: 'bonus_action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:5081' },
  { id: 'mind-spike', castingTime: 'action', components: 'S', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:5398' },
  { id: 'mirror-image', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:5481' },
  { id: 'misty-step', castingTime: 'bonus_action', components: 'V', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:5523' },
  { id: 'prayer-of-healing', castingTime: 'ten_minutes', components: 'V', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:6014' },
  { id: 'protection-from-poison', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:6359' },
  { id: 'ray-of-enfeeblement', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:6407' },
  { id: 'rope-trick', castingTime: 'action', components: 'VSM', material: 'a segment of rope', consumed: false, ritual: false, source: 'spell-descriptions.txt:6619' },
  { id: 'scorching-ray', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:6678' },
  { id: 'see-invisibility', castingTime: 'action', components: 'VSM', material: 'a pinch of talc', consumed: false, ritual: false, source: 'spell-descriptions.txt:6784' },
  { id: 'shatter', castingTime: 'action', components: 'VSM', material: 'a chip of mica', consumed: false, ritual: false, source: 'spell-descriptions.txt:6921' },
  { id: 'silence', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: true, source: 'spell-descriptions.txt:7026' },
  { id: 'spider-climb', castingTime: 'action', components: 'VSM', material: 'a drop of bitumen and a spider', consumed: false, ritual: false, source: 'spell-descriptions.txt:7278' },
  { id: 'spiritual-weapon', castingTime: 'bonus_action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:7353' },
  { id: 'suggestion', castingTime: 'action', components: 'VM', material: 'a drop of honey', consumed: false, ritual: false, source: 'spell-descriptions.txt:7477' },
  { id: 'warding-bond', castingTime: 'action', components: 'VSM', material: 'a pair of platinum rings worth 50+ GP each, which you and the target must wear for the duration', consumed: false, ritual: false, source: 'spell-descriptions.txt:8388' },
  { id: 'web', castingTime: 'action', components: 'VSM', material: 'a bit of spiderweb', consumed: false, ritual: false, source: 'spell-descriptions.txt:8453' },
  { id: 'zone-of-truth', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false, source: 'spell-descriptions.txt:8699' },
];

describe('level-2 spell mechanics pins', () => {
  it('has one exact independent pin for every implemented level-2 definition', () => {
    const implemented = IMPLEMENTED_SPELL_DEFINITIONS.filter((definition) => definition.level === 2);
    expect(LEVEL_TWO_MECHANICS_PINS).toHaveLength(45);
    expect(LEVEL_TWO_MECHANICS_PINS.map((pin) => pin.id).sort()).toEqual(
      implemented.map((definition) => definition.id).sort(),
    );
  });

  it.each(LEVEL_TWO_MECHANICS_PINS)('$id pins every targeting and operation literal from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({ targeting: definition.targeting, operation: definition.operation }).toEqual({
      targeting: pin.targeting,
      operation: pin.operation,
    });
  });

  it.each(LEVEL_TWO_COMPONENT_PINS)('$id pins casting time and components from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const components = `${definition.components.verbal ? 'V' : ''}${definition.components.somatic ? 'S' : ''}${definition.components.material === null ? '' : 'M'}`;
    expect({
      castingTime: definition.castingTime,
      components,
      material: definition.components.material?.text ?? null,
      consumed: definition.components.material?.consumed ?? false,
      ritual: definition.ritual === true,
    }).toEqual({
      castingTime: pin.castingTime,
      components: pin.components,
      material: pin.material,
      consumed: pin.consumed,
      ritual: pin.ritual,
    });
  });

  it.each(LEVEL_TWO_MECHANICS_PINS)('$id executes its pinned mechanics through the reducer', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const caster = playerProfile(`caster-${pin.id}`, {
      hitPoints: 200,
      initiativeBonus: 20,
      spellSlots: referencePartySpellSlots('Wizard'),
    });
    const target = monsterProfile(`target-${pin.id}`, { hitPoints: 200, initiativeBonus: 0 });
    let state = createEncounter({
      bounds: { columns: 20, rows: 10 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)],
    });
    if (definition.castingTime !== 'minute' && definition.castingTime !== 'ten_minutes') {
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    }
    if (definition.operation.kind === 'healing') {
      state = {
        ...state,
        combatants: state.combatants.map((subject) =>
          subject.profile.id === target.id ? { ...subject, hitPoints: 1 } : subject),
      };
    }
    const operation = definition.operation;
    const projectileCount = operation.kind === 'attack_rays' ? operation.baseRays : 1;
    const targets = definition.targeting.kind === 'single'
      ? [target.id]
      : definition.targeting.kind === 'multiple'
        ? Array.from({ length: projectileCount }, () => target.id)
        : [];
    const command: SpellCastCommand = {
      type: 'cast_spell', actor: caster.id, spellId: definition.id, slotLevel: 2,
      castAsRitual: false, casterLevel: 7, attackBonus: 100, saveDc: 100,
      spellcastingModifier: 3, targets, area: levelTwoArea(definition), weaponAttack: null,
      selectedOption: definition.id === 'blindness-deafness' ? 'Blinded'
        : definition.id === 'lesser-restoration' ? 'Poisoned' : null,
    };
    const result = reduceEncounter(state, command, () => 0.5);
    expect(result.events.some((event) => event.type === 'spell_cast' && event.spellId === pin.id)).toBe(true);
    expect(result.state.combatants.find((subject) => subject.profile.id === caster.id)
      ?.spellSlots.find((slot) => slot.level === 2)?.remaining).toBe(2);
  });

  it('Aid level-3 upcast increases current and effective maximum HP by exactly 10', () => {
    // Aid, docs/srd/source/spell-descriptions.txt:53: +5 HP for each slot above 2.
    const definition = spellDefinition('aid');
    if (definition === null) throw new Error('Missing Aid definition.');
    const caster = playerProfile('aid-upcast-caster', { spellSlots: referencePartySpellSlots('Cleric') });
    const target = monsterProfile('aid-upcast-target', { hitPoints: 200 });
    let state = createEncounter({
      bounds: { columns: 4, rows: 4 }, combatants: [caster, target],
      tokens: [placedToken(caster, 0, 0), placedToken(target, 1, 0)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    const result = reduceEncounter(state, {
      type: 'cast_spell', actor: caster.id, spellId: 'aid', slotLevel: 3,
      castAsRitual: false, casterLevel: 7, attackBonus: 100, saveDc: 100,
      spellcastingModifier: 3, targets: [target.id], area: null, weaponAttack: null, selectedOption: null,
    }, () => 0.5);
    expect(result.state.combatants.find((subject) => subject.profile.id === target.id)?.hitPoints).toBe(210);
    expect(result.state.effects.find((candidate) => candidate.payload.kind === 'hit_point_maximum_modifier')?.payload)
      .toEqual({ kind: 'hit_point_maximum_modifier', amount: 10 });
  });
});

function levelTwoArea(definition: SpellDefinition): SpellCastCommand['area'] {
  if (definition.targeting.kind !== 'area') return null;
  const size = definition.targeting.baseSizeFeet;
  switch (definition.targeting.shape) {
    case 'sphere':
      return { shape: 'sphere', template: { origin: feetPoint(10, 10), radius: feet(size) } };
    case 'cube':
      return { shape: 'cube', template: { origin: feetPoint(0, 10), center: feetPoint(10, 10), axis: { x: 1, y: 0 }, size: feet(size), includeOrigin: false } };
    case 'line':
      return { shape: 'line', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(size), width: feet(10), includeOrigin: false } };
    case 'cone':
      return { shape: 'cone', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(size), includeOrigin: false } };
    case 'cylinder':
    case 'emanation':
      throw new Error(`No level-2 spell uses a ${definition.targeting.shape} template.`);
  }
}
