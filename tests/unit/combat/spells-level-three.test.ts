import { describe, expect, it } from 'vitest';
import type { SpellSlotLevel } from '../../../src/combat/combatant';
import type { EffectPayload } from '../../../src/combat/effects';
import { createEncounter, reduceEncounter, RevivifyRuleError } from '../../../src/combat/encounter';
import { IMPLEMENTED_SPELL_DEFINITIONS, spellDefinition } from '../../../src/combat/spells/definitions';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type { EffectData, ScaledDice, SpellCastCommand, SpellDefinition } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, feet } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

interface LevelThreePin {
  readonly id: string;
  readonly source: `spell-descriptions.txt:${number}`;
  readonly targeting: SpellDefinition['targeting'];
  readonly operation: SpellDefinition['operation'];
}

function dice(baseCount: number, sides: number, options: { readonly perSlotCount?: number } = {}): ScaledDice {
  return { baseCount, sides, modifier: 0, perSlotCount: options.perSlotCount ?? 0, perSlotModifier: 0, cantripUpgrade: false };
}

function effect(payload: EffectPayload, options: {
  readonly target?: 'self' | 'targets'; readonly concentration?: boolean;
  readonly durationRounds?: number | null; readonly expiresAt?: EffectData['expiresAt'];
  readonly repeatedSave?: EffectData['repeatedSave']; readonly durationRoundsPerSlot?: number;
  readonly slotDurationTiers?: EffectData['slotDurationTiers'];
} = {}): EffectData {
  return {
    payload, target: options.target ?? 'targets', concentration: options.concentration ?? false,
    durationRounds: options.durationRounds ?? 1, expiresAt: options.expiresAt ?? 'source_start',
    ...(options.repeatedSave === undefined ? {} : { repeatedSave: options.repeatedSave }),
    ...(options.durationRoundsPerSlot === undefined ? {} : { durationRoundsPerSlot: options.durationRoundsPerSlot }),
    ...(options.slotDurationTiers === undefined ? {} : { slotDurationTiers: options.slotDurationTiers }),
  };
}

/** Independent SRD-transcribed oracle; no literal is projected away. */
const LEVEL_THREE_PINS: readonly LevelThreePin[] = [
  { id: 'animate-dead', source: 'spell-descriptions.txt:219', targeting: { kind: 'utility', rangeFeet: 10 }, operation: { kind: 'utility', effect: { kind: 'summoned_undead', forms: ['Skeleton', 'Zombie'], createdCreatures: 1, createdCreaturesPerSlot: 2, reassertedCreatures: 4, reassertedCreaturesPerSlot: 2, commandRangeFeet: 60, controlDurationRounds: 14400 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'beacon-of-hope', source: 'spell-descriptions.txt:726', targeting: { kind: 'all_in_range', rangeFeet: 30 }, operation: { kind: 'effect', effect: effect({ kind: 'beacon_of_hope', wisdomSaveMode: 'advantage', deathSaveMode: 'advantage', maximizesHealing: true }, { concentration: true, durationRounds: 10 }) } },
  { id: 'bestow-curse', source: 'spell-descriptions.txt:753', targeting: { kind: 'single', rangeFeet: 5, willing: false }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'bestow_curse', options: ['ability_disadvantage', 'attacks_against_caster_disadvantage', 'forced_dodge', 'extra_necrotic_damage'], extraDamageCount: 1, extraDamageSides: 8 }, { concentration: true, durationRounds: 10, slotDurationTiers: [{ minimumSlot: 4, durationRounds: 100, concentration: true }, { minimumSlot: 5, durationRounds: 4800, concentration: false }, { minimumSlot: 7, durationRounds: 14400, concentration: false }, { minimumSlot: 9, durationRounds: null, concentration: false }] }) } },
  { id: 'blink', source: 'spell-descriptions.txt:878', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'blink', dieSides: 6, etherealMinimum: 4, etherealVisionFeet: 60, returnSpaceFeet: 10 }, { target: 'self', durationRounds: 10 }) } },
  { id: 'clairvoyance', source: 'spell-descriptions.txt:1121', targeting: { kind: 'utility', rangeFeet: 5280 }, operation: { kind: 'utility', effect: { kind: 'clairvoyance_sensor', rangeFeet: 5280, senses: ['hearing', 'seeing'], switchCost: 'bonus_action', locationEligibility: 'familiar_or_obvious', intangible: true, invulnerable: true }, concentration: true, durationRounds: 100 } },
  { id: 'counterspell', source: 'spell-descriptions.txt:1767', targeting: { kind: 'single', rangeFeet: 60, willing: false }, operation: { kind: 'reaction_save_cancel', ability: 'constitution', trigger: 'visible_creature_casts_spell_with_components' } },
  { id: 'create-food-and-water', source: 'spell-descriptions.txt:1781', targeting: { kind: 'utility', rangeFeet: 30 }, operation: { kind: 'utility', effect: { kind: 'created_food_and_water', foodPounds: 45, waterGallons: 30, foodSpoilsAfterRounds: 14400 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'daylight', source: 'spell-descriptions.txt:1967', targeting: { kind: 'area', rangeFeet: 60, shape: 'sphere', baseSizeFeet: 60, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'daylight_area', placement: 'selected_when_cast', brightRadiusFeet: 60, additionalDimFeet: 60, dispelsDarknessSpellLevelAtMost: 3 }, concentration: false, durationRounds: 600 } },
  { id: 'dispel-magic', source: 'spell-descriptions.txt:2268', targeting: { kind: 'single', rangeFeet: 120, willing: false }, operation: { kind: 'dispel_magic', baseAutomaticLevel: 3, checkDcBase: 10 } },
  { id: 'fear', source: 'spell-descriptions.txt:2945', targeting: { kind: 'area', rangeFeet: 0, shape: 'cone', baseSizeFeet: 30, sizePerSlotFeet: 0 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'fear', condition: 'Frightened', dropsHeldObjects: true, forcedAction: 'dash_away', repeatSaveAbility: 'wisdom', repeatSaveRequiresNoLineOfSight: true }, { concentration: true, durationRounds: 10 }) } },
  { id: 'fireball', source: 'spell-descriptions.txt:3160', targeting: { kind: 'area', rangeFeet: 150, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'half', damageType: damageType('Fire'), dice: dice(8, 6, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 } },
  { id: 'fly', source: 'spell-descriptions.txt:3375', targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'flight', speedFeet: 60, canHover: true, fallsWhenEffectEnds: true }, { concentration: true, durationRounds: 100 }) } },
  { id: 'gaseous-form', source: 'spell-descriptions.txt:3590', targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'gaseous_form', flySpeedFeet: 10, canHover: true, physicalResistanceTypes: ['Bludgeoning', 'Piercing', 'Slashing'], proneImmune: true, physicalSaveMode: 'advantage', canAttackOrCast: false }, { concentration: true, durationRounds: 600 }) } },
  { id: 'glyph-of-warding', source: 'spell-descriptions.txt:3802', targeting: { kind: 'area', rangeFeet: 5, shape: 'sphere', baseSizeFeet: 5, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'glyph_of_warding', placement: 'selected_when_cast', maximumDiameterFeet: 10, movementBreakDistanceFeet: 10, explosiveRadiusFeet: 20, explosiveDamageTypes: ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'], explosiveDamageCount: 5, explosiveDamageSides: 8, explosiveDamagePerSlotCount: 1, storedSpellMaximumLevel: 3 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'haste', source: 'spell-descriptions.txt:4143', targeting: { kind: 'single', rangeFeet: 30, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'haste', speedMultiplier: 2, armorClassBonus: 2, dexteritySaveMode: 'advantage', extraActionOptions: ['attack_once', 'dash', 'disengage', 'hide', 'utilize'], lethargyCondition: 'Incapacitated', lethargySpeedFeet: 0, lethargyRounds: 1 }, { concentration: true, durationRounds: 10 }) } },
  { id: 'hypnotic-pattern', source: 'spell-descriptions.txt:4410', targeting: { kind: 'area', rangeFeet: 120, shape: 'cube', baseSizeFeet: 30, sizePerSlotFeet: 0 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'hypnotic_pattern', conditions: ['Charmed', 'Incapacitated'], speedFeet: 0, endsOnDamage: true, wakeAction: true }, { concentration: true, durationRounds: 10 }) } },
  { id: 'lightning-bolt', source: 'spell-descriptions.txt:4831', targeting: { kind: 'area', rangeFeet: 0, shape: 'line', baseSizeFeet: 100, sizePerSlotFeet: 0, secondarySizeFeet: 5 }, operation: { kind: 'save_damage', ability: 'dexterity', onSuccess: 'half', damageType: damageType('Lightning'), dice: dice(8, 6, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 } },
  { id: 'magic-circle', source: 'spell-descriptions.txt:4952', targeting: { kind: 'area', rangeFeet: 10, shape: 'cylinder', baseSizeFeet: 10, sizePerSlotFeet: 0, secondarySizeFeet: 20 }, operation: { kind: 'utility', effect: { kind: 'magic_circle', placement: 'selected_when_cast', radiusFeet: 10, heightFeet: 20, creatureTypes: ['Celestial', 'Elemental', 'Fey', 'Fiend', 'Undead'], reversible: true }, concentration: false, durationRounds: 600, durationRoundsPerSlot: 600 } },
  { id: 'major-image', source: 'spell-descriptions.txt:5150', targeting: { kind: 'area', rangeFeet: 120, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'major_image', placement: 'selected_when_cast', maximumCubeFeet: 20, sensoryModes: ['visual', 'sound', 'smell', 'temperature'], movableByMagicAction: true, investigationAgainstSpellDc: true }, concentration: true, durationRounds: 100, becomesPermanentAtSlot: 4, losesConcentrationAtSlot: 4 } },
  { id: 'mass-healing-word', source: 'spell-descriptions.txt:5226', targeting: { kind: 'multiple', rangeFeet: 60, baseMaximum: 6, additionalPerSlot: 0 }, operation: { kind: 'healing', dice: dice(2, 4, { perSlotCount: 1 }), addSpellcastingModifier: true } },
  { id: 'meld-into-stone', source: 'spell-descriptions.txt:5289', targeting: { kind: 'self' }, operation: { kind: 'utility', effect: { kind: 'meld_into_stone', exitMovementFeet: 5, partialDestructionDamageCount: 6, partialDestructionDamageSides: 6, totalDestructionDamage: 50, expelledCondition: 'Prone' }, concentration: false, durationRounds: 4800 } },
  { id: 'nondetection', source: 'spell-descriptions.txt:5647', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'nondetection', blocksDivinationTargeting: true, blocksMagicalScryingSensors: true, maximumObjectDimensionFeet: 10 }, { durationRounds: 4800 }) } },
  { id: 'phantom-steed', source: 'spell-descriptions.txt:5758', targeting: { kind: 'utility', rangeFeet: 30 }, operation: { kind: 'utility', effect: { kind: 'phantom_steed', speedFeet: 100, travelMilesPerHour: 13, equipmentVanishDistanceFeet: 10, fadeRounds: 10 }, concentration: false, durationRounds: 600 } },
  { id: 'protection-from-energy', source: 'spell-descriptions.txt:6322', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'energy_protection', damageTypes: ['Acid', 'Cold', 'Fire', 'Lightning', 'Thunder'], selectedDamageType: 'chosen_when_cast' }, { concentration: true, durationRounds: 600 }) } },
  { id: 'remove-curse', source: 'spell-descriptions.txt:6499', targeting: { kind: 'single', rangeFeet: 5, willing: false }, operation: { kind: 'remove_curse' } },
  { id: 'revivify', source: 'spell-descriptions.txt:6604', targeting: { kind: 'single', rangeFeet: 5, willing: false, allowDead: true }, operation: { kind: 'revive', hitPoints: 1, maximumDeathAgeRounds: 10, oldAgeEligible: false, restoresMissingBodyParts: false } },
  { id: 'sending', source: 'spell-descriptions.txt:6825', targeting: { kind: 'remote', range: 'unlimited' }, operation: { kind: 'utility', effect: { kind: 'sending', maximumWords: 25, crossPlaneFailurePercent: 5, recipientBlockRounds: 4800 }, concentration: false, durationRounds: null } },
  { id: 'sleet-storm', source: 'spell-descriptions.txt:7119', targeting: { kind: 'area', rangeFeet: 150, shape: 'cylinder', baseSizeFeet: 20, sizePerSlotFeet: 0, secondarySizeFeet: 40 }, operation: { kind: 'utility', effect: { kind: 'sleet_storm_area', placement: 'selected_when_cast', radiusFeet: 20, heightFeet: 40, obscurement: 'heavy', difficultTerrain: true, saveAbility: 'dexterity', failureCondition: 'Prone', failureBreaksConcentration: true }, concentration: true, durationRounds: 10 } },
  { id: 'slow', source: 'spell-descriptions.txt:7140', targeting: { kind: 'area_selected', rangeFeet: 120, shape: 'cube', baseSizeFeet: 40, sizePerSlotFeet: 0, baseMaximum: 6, additionalPerSlot: 0 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'slow', speedMultiplier: 0.5, armorClassPenalty: 2, dexteritySavePenalty: 2, reactionsAllowed: false, actionOrBonusOnly: true, attacksPerAction: 1, somaticSpellFailurePercent: 25 }, { concentration: true, durationRounds: 10, expiresAt: 'target_end', repeatedSave: { ability: 'wisdom', rollMode: 'normal', timing: 'target_end' } }) } },
  { id: 'speak-with-dead', source: 'spell-descriptions.txt:7214', targeting: { kind: 'utility', rangeFeet: 10 }, operation: { kind: 'utility', effect: { kind: 'speak_with_dead', maximumQuestions: 5, sameCorpseLockoutRounds: 144000 }, concentration: false, durationRounds: 100 } },
  { id: 'spirit-guardians', source: 'spell-descriptions.txt:7324', targeting: { kind: 'area', rangeFeet: 0, shape: 'emanation', baseSizeFeet: 15, sizePerSlotFeet: 0 }, operation: {
    kind: 'persistent_area', origin: 'anchored_to_caster', shape: { kind: 'emanation', radius: feet(15) },
    durationRounds: 100, concentration: true, targetFilter: 'enemies', includeOwner: false,
    difficultTerrain: false, movableFeet: null, initialEffects: [],
    hooks: [
      ...(['on_enter', 'on_end_of_turn_inside'] as const).map((hook) => ({ hook, frequency: 'once_per_turn' as const, effect: {
        kind: 'save_gated' as const, ability: 'wisdom' as const, rollMode: 'normal' as const, onSuccess: 'half' as const,
        payload: { kind: 'damage' as const, damageType: 'spirit_guardians_alignment' as const, dice: dice(3, 8, { perSlotCount: 1 }) },
      } })),
      { hook: 'on_enter', frequency: 'every_trigger', effect: { kind: 'automatic', payload: {
        kind: 'effect', payload: { kind: 'movement_modifier', speedChange: { kind: 'reduce', reduction: { kind: 'multiplier', multiplier: 0.5 } }, modeGrants: [], difficultTerrainImmunity: false, magicalSpeedReductionImmunity: false }, lifetime: { kind: 'while_inside' },
      } } },
    ],
  } },
  { id: 'stinking-cloud', source: 'spell-descriptions.txt:7391', targeting: { kind: 'area', rangeFeet: 90, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'stinking_cloud_area', placement: 'selected_when_cast', radiusFeet: 20, obscurement: 'heavy', dispersedByStrongWind: true, saveAbility: 'constitution', failureCondition: 'Poisoned', actionsAllowedOnFailure: false }, concentration: true, durationRounds: 10 } },
  { id: 'tiny-hut', source: 'spell-descriptions.txt:7908', targeting: { kind: 'area', rangeFeet: 0, shape: 'emanation', baseSizeFeet: 10, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'tiny_hut', placement: 'selected_when_cast', radiusFeet: 10, blocksOutsideCreaturesAndObjects: true, blocksSpellLevelAtMost: 3, opaqueFromOutside: true, transparentFromInside: true }, concentration: false, durationRounds: 4800 } },
  { id: 'tongues', source: 'spell-descriptions.txt:7932', targeting: { kind: 'single', rangeFeet: 5, willing: false }, operation: { kind: 'effect', effect: effect({ kind: 'universal_language', understandsSpokenAndSigned: true, understoodByAnyLanguageSpeaker: true }, { durationRounds: 600 }) } },
  { id: 'vampiric-touch', source: 'spell-descriptions.txt:8158', targeting: { kind: 'single', rangeFeet: 5, willing: false }, operation: { kind: 'lifedrain_attack', damageType: damageType('Necrotic'), dice: dice(3, 6, { perSlotCount: 1 }), healingDivisor: 2, effect: effect({ kind: 'vampiric_touch', repeatAttackCost: 'magic_action' }, { target: 'self', concentration: true, durationRounds: 10 }) } },
  { id: 'water-breathing', source: 'spell-descriptions.txt:8415', targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 10, additionalPerSlot: 0, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'water_breathing', retainsNormalRespiration: true }, { durationRounds: 14400 }) } },
  { id: 'water-walk', source: 'spell-descriptions.txt:8429', targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 10, additionalPerSlot: 0, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'water_walk', surfaces: ['water', 'acid', 'mud', 'snow', 'quicksand', 'lava'], transitionCost: 'bonus_action' }, { durationRounds: 600 }) } },
];

interface ComponentPin {
  readonly id: string; readonly castingTime: SpellDefinition['castingTime'];
  readonly components: 'V' | 'VS' | 'S' | 'VM' | 'SM' | 'VSM';
  readonly material: string | null; readonly consumed: boolean; readonly ritual: boolean;
}

const LEVEL_THREE_COMPONENT_PINS: readonly ComponentPin[] = [
  { id: 'animate-dead', castingTime: 'minute', components: 'VSM', material: 'a drop of blood, a piece of flesh, and a pinch of bone dust', consumed: false, ritual: false },
  { id: 'beacon-of-hope', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'bestow-curse', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'blink', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'clairvoyance', castingTime: 'ten_minutes', components: 'VSM', material: 'a focus worth 100+ GP, either a jeweled horn for hearing or a glass eye for seeing', consumed: false, ritual: false },
  { id: 'counterspell', castingTime: 'reaction', components: 'S', material: null, consumed: false, ritual: false },
  { id: 'create-food-and-water', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'daylight', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'dispel-magic', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'fear', castingTime: 'action', components: 'VSM', material: 'a white feather', consumed: false, ritual: false },
  { id: 'fireball', castingTime: 'action', components: 'VSM', material: 'a ball of bat guano and sulfur', consumed: false, ritual: false },
  { id: 'fly', castingTime: 'action', components: 'VSM', material: 'a feather', consumed: false, ritual: false },
  { id: 'gaseous-form', castingTime: 'action', components: 'VSM', material: 'a bit of gauze', consumed: false, ritual: false },
  { id: 'glyph-of-warding', castingTime: 'hour', components: 'VSM', material: 'powdered diamond worth 200+ GP', consumed: true, ritual: false },
  { id: 'haste', castingTime: 'action', components: 'VSM', material: 'a shaving of licorice root', consumed: false, ritual: false },
  { id: 'hypnotic-pattern', castingTime: 'action', components: 'SM', material: 'a pinch of confetti', consumed: false, ritual: false },
  { id: 'lightning-bolt', castingTime: 'action', components: 'VSM', material: 'a bit of fur and a crystal rod', consumed: false, ritual: false },
  { id: 'magic-circle', castingTime: 'minute', components: 'VSM', material: 'salt and powdered silver worth 100+ GP', consumed: true, ritual: false },
  { id: 'major-image', castingTime: 'action', components: 'VSM', material: 'a bit of fleece', consumed: false, ritual: false },
  { id: 'mass-healing-word', castingTime: 'bonus_action', components: 'V', material: null, consumed: false, ritual: false },
  { id: 'meld-into-stone', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: true },
  { id: 'nondetection', castingTime: 'action', components: 'VSM', material: 'a pinch of diamond dust worth 25+ GP', consumed: true, ritual: false },
  { id: 'phantom-steed', castingTime: 'minute', components: 'VS', material: null, consumed: false, ritual: true },
  { id: 'protection-from-energy', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'remove-curse', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'revivify', castingTime: 'action', components: 'VSM', material: 'a diamond worth 300+ GP', consumed: true, ritual: false },
  { id: 'sending', castingTime: 'action', components: 'VSM', material: 'a copper wire', consumed: false, ritual: false },
  { id: 'sleet-storm', castingTime: 'action', components: 'VSM', material: 'a miniature umbrella', consumed: false, ritual: false },
  { id: 'slow', castingTime: 'action', components: 'VSM', material: 'a drop of molasses', consumed: false, ritual: false },
  { id: 'speak-with-dead', castingTime: 'action', components: 'VSM', material: 'burning incense', consumed: false, ritual: false },
  { id: 'spirit-guardians', castingTime: 'action', components: 'VSM', material: 'a prayer scroll', consumed: false, ritual: false },
  { id: 'stinking-cloud', castingTime: 'action', components: 'VSM', material: 'a rotten egg', consumed: false, ritual: false },
  { id: 'tiny-hut', castingTime: 'minute', components: 'VSM', material: 'a crystal bead', consumed: false, ritual: true },
  { id: 'tongues', castingTime: 'action', components: 'VM', material: 'a miniature ziggurat', consumed: false, ritual: false },
  { id: 'vampiric-touch', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'water-breathing', castingTime: 'action', components: 'VSM', material: 'a short reed', consumed: false, ritual: true },
  { id: 'water-walk', castingTime: 'action', components: 'VSM', material: 'a piece of cork', consumed: false, ritual: true },
];

describe('level-3 spell mechanics pins', () => {
  // Independently transcribed from spell-descriptions.txt:5226-5240.
  const sightRequiredPins = new Set(['mass-healing-word']);
  it('has one exact independent pin for every implemented level-3 definition', () => {
    expect(LEVEL_THREE_PINS).toHaveLength(37);
    expect(LEVEL_THREE_PINS.map((pin) => pin.id).sort()).toEqual(
      IMPLEMENTED_SPELL_DEFINITIONS.filter((definition) => definition.level === 3).map((definition) => definition.id).sort(),
    );
  });

  it.each(LEVEL_THREE_PINS)('$id pins every targeting and operation literal from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({ targeting: definition.targeting, operation: definition.operation }).toEqual({
      targeting: sightRequiredPins.has(pin.id) ? { ...pin.targeting, requiresSight: true } : pin.targeting,
      operation: pin.operation,
    });
  });

  it.each(LEVEL_THREE_COMPONENT_PINS)('$id pins every casting and component literal', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const components = `${definition.components.verbal ? 'V' : ''}${definition.components.somatic ? 'S' : ''}${definition.components.material === null ? '' : 'M'}`;
    expect({ castingTime: definition.castingTime, components, material: definition.components.material?.text ?? null,
      consumed: definition.components.material?.consumed ?? false, ritual: definition.ritual === true }).toEqual({
      castingTime: pin.castingTime, components: pin.components, material: pin.material,
      consumed: pin.consumed, ritual: pin.ritual,
    });
  });

  it.each(LEVEL_THREE_PINS)('$id executes its pinned mechanics through the reducer', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const caster = playerProfile(`caster-${pin.id}`, { hitPoints: 200, initiativeBonus: 20, spellSlots: referencePartySpellSlots('Wizard') });
    const target = monsterProfile(`target-${pin.id}`, { hitPoints: 200, initiativeBonus: 0 });
    let state = createEncounter({ bounds: { columns: 50, rows: 30 }, combatants: [caster, target], tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)] });
    if (definition.castingTime !== 'minute' && definition.castingTime !== 'ten_minutes' && definition.castingTime !== 'hour') {
      state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    }
    if (definition.operation.kind === 'healing') {
      state = { ...state, combatants: state.combatants.map((subject) => subject.profile.id === target.id ? { ...subject, hitPoints: 1 } : subject) };
    }
    if (definition.operation.kind === 'revive') {
      state = reduceEncounter(state, { type: 'dm_mark_dead', target: target.id }, () => 0.5).state;
    }
    const selectedTarget = definition.targeting.kind === 'single' || definition.targeting.kind === 'multiple' ||
      definition.targeting.kind === 'all_in_range' || definition.targeting.kind === 'remote' || definition.targeting.kind === 'area_selected';
    const command: SpellCastCommand = {
      type: 'cast_spell', actor: caster.id, spellId: definition.id, slotLevel: 3, castAsRitual: false,
      casterLevel: 7, attackBonus: 100, saveDc: 100, spellcastingModifier: 3,
      targets: selectedTarget ? [target.id] : [], area: levelThreeArea(definition), weaponAttack: null,
      selectedOption: definition.id === 'protection-from-energy'
        ? 'Fire'
        : definition.id === 'spirit-guardians' ? 'Radiant' : null,
    };
    const result = reduceEncounter(state, command, () => 0.5);
    expect(result.events.some((event) => event.type === 'spell_cast' && event.spellId === pin.id)).toBe(true);
    expect(result.state.combatants.find((subject) => subject.profile.id === caster.id)?.spellSlots.find((slot) => slot.level === 3)?.remaining).toBe(2);
  });

  it.each([
    { name: 'inside the window', round: 10, initiativeIndex: 1 },
    { name: 'exactly one minute at the same initiative boundary', round: 11, initiativeIndex: 0 },
  ])('revivify_full_hp: Revivify returns the target at exactly 1 HP $name and consumes one recorded diamond', ({ round, initiativeIndex }) => {
    const caster = playerProfile('revivify-caster', {
      initiativeBonus: 20,
      spellSlots: referencePartySpellSlots('Cleric'),
    });
    const target = monsterProfile('revivify-target', { hitPoints: 47, initiativeBonus: 0 });
    let state = createEncounter({
      bounds: { columns: 5, rows: 5 },
      combatants: [caster, target],
      tokens: [placedToken(caster, 0, 0), placedToken(target, 1, 0)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    state = reduceEncounter(state, { type: 'dm_mark_dead', target: target.id }, () => 0.5).state;
    expect(state.combatants.find((subject) => subject.profile.id === target.id)?.deathAt).toEqual({
      round: 1,
      initiativeIndex: 0,
    });
    state = { ...state, round, activeInitiativeIndex: initiativeIndex };

    const result = reduceEncounter(state, {
      type: 'cast_spell', actor: caster.id, spellId: 'revivify', slotLevel: 3,
      castAsRitual: false, casterLevel: 7, attackBonus: 5, saveDc: 13,
      spellcastingModifier: 3, targets: [target.id], area: null,
      weaponAttack: null, selectedOption: null,
    }, () => 0.5);

    expect(result.state.combatants.find((subject) => subject.profile.id === target.id)).toMatchObject({
      hitPoints: 1,
      life: 'living',
      deathAt: null,
    });
    const consumed = result.events.filter((event) => event.type === 'spell_component_consumed');
    expect(consumed).toEqual([expect.objectContaining({
      caster: caster.id,
      spellId: 'revivify',
      component: {
        kind: 'material', description: 'a diamond worth 300+ GP',
        minimumGoldPieceValue: 300, quantity: 1,
      },
      inventoryTracking: 'recorded_untracked_inventory',
      citation: 'docs/srd/full/srd-5.2.1.txt:10145-10146',
    })]);
  });

  it('revivify_window_off_by_one: refuses the next initiative boundary after exactly one minute with the cited typed refusal', () => {
    const caster = playerProfile('late-revivify-caster', {
      initiativeBonus: 20,
      spellSlots: referencePartySpellSlots('Cleric'),
    });
    const target = monsterProfile('late-revivify-target', { hitPoints: 47, initiativeBonus: 0 });
    let state = createEncounter({
      bounds: { columns: 5, rows: 5 }, combatants: [caster, target],
      tokens: [placedToken(caster, 0, 0), placedToken(target, 1, 0)],
    });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    state = reduceEncounter(state, { type: 'dm_mark_dead', target: target.id }, () => 0.5).state;
    state = { ...state, round: 11, activeInitiativeIndex: 1 };
    const cast = () => reduceEncounter(state, {
      type: 'cast_spell', actor: caster.id, spellId: 'revivify', slotLevel: 3,
      castAsRitual: false, casterLevel: 7, attackBonus: 5, saveDc: 13,
      spellcastingModifier: 3, targets: [target.id], area: null,
      weaponAttack: null, selectedOption: null,
    }, () => 0.5);

    expect(cast).toThrow(RevivifyRuleError);
    try {
      cast();
    } catch (error: unknown) {
      expect(error).toMatchObject({
        code: 'target_dead_too_long',
        citation: 'docs/srd/full/srd-5.2.1.txt:10148-10150',
      });
    }
  });

  it('Revivify definition fixes revival at 1 HP rather than the target maximum', () => {
    const definition = spellDefinition('revivify');
    expect(definition?.operation).toMatchObject({ kind: 'revive', hitPoints: 1 });
    expect(IMPLEMENTED_SPELL_DEFINITIONS.filter(
      (candidate) => candidate.operation.kind === 'revive',
    ).map((candidate) => candidate.id)).toEqual(['revivify']);
  });

  it.each([
    { id: 'fireball', source: 'spell-descriptions.txt:3160' },
    { id: 'lightning-bolt', source: 'spell-descriptions.txt:4831' },
  ] as const)('$id level-4 upcast uses exactly 9d6 through the shared save-for-half resolver from $source', ({ id }) => {
    const definition = spellDefinition(id);
    if (definition === null) throw new Error(`Missing ${id} definition.`);
    const caster = playerProfile(`${id}-upcast-caster`, { initiativeBonus: 20, spellSlots: referencePartySpellSlots('Wizard') });
    const target = monsterProfile(`${id}-upcast-target`, { hitPoints: 200, initiativeBonus: 0 });
    let state = createEncounter({ bounds: { columns: 20, rows: 20 }, combatants: [caster, target], tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)] });
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
    let draw = 0;
    const result = reduceEncounter(state, {
      type: 'cast_spell', actor: caster.id, spellId: id, slotLevel: 4, castAsRitual: false,
      casterLevel: 7, attackBonus: 100, saveDc: 100, spellcastingModifier: 3, targets: [],
      area: levelThreeArea(definition), weaponAttack: null, selectedOption: null,
    }, () => draw++ < 9 ? 0 : 0.5);
    const damage = result.events.find((event) => event.type === 'damage_applied' && event.target === target.id);
    expect(damage?.type === 'damage_applied' ? damage.amount : null).toBe(9);
  });

  it.each([
    { id: 'animate-dead', kind: 'summoned_undead', expected: { createdCreatures: 3, reassertedCreatures: 6 } },
    { id: 'glyph-of-warding', kind: 'glyph_of_warding', expected: { explosiveDamageCount: 6, storedSpellMaximumLevel: 4 } },
  ] as const)('$id level-4 upcast resolves its payload scaling', ({ id, kind, expected }) => {
    const result = castLevelFour(id);
    const payload = result.state.effects.find((candidate) => candidate.payload.kind === kind)?.payload;
    expect(payload).toMatchObject(expected);
  });

  it('Spirit Guardians level-4 upcast resolves exactly 4d8 through its persistent-area damage hook', () => {
    // Upcast damage: docs/srd/source/spell-descriptions.txt:7351.
    const area = castLevelFour('spirit-guardians').state.persistentAreas[0];
    const damage = area?.hooks.find((hook) => hook.effect.payload.kind === 'damage')?.effect.payload;
    expect(damage?.kind === 'damage' ? damage.damage.terms[0]?.dice : null).toMatchObject({ count: 4, sides: 8 });
  });

  it('level-4 Bestow Curse and Magic Circle pin their distinct duration steps', () => {
    const curse = castLevelFour('bestow-curse').state.effects.find((candidate) => candidate.payload.kind === 'bestow_curse');
    const circle = castLevelFour('magic-circle').state.effects.find((candidate) => candidate.payload.kind === 'magic_circle');
    expect(curse?.duration).toMatchObject({ kind: 'turn_boundaries', remaining: 100 });
    expect(circle?.duration).toMatchObject({ kind: 'turn_boundaries', remaining: 1200 });
  });

  it.each([
    { slot: 3, duration: { kind: 'turn_boundaries', remaining: 10 }, concentrates: true },
    { slot: 4, duration: { kind: 'turn_boundaries', remaining: 100 }, concentrates: true },
    { slot: 5, duration: { kind: 'turn_boundaries', remaining: 4800 }, concentrates: false },
    { slot: 6, duration: { kind: 'turn_boundaries', remaining: 4800 }, concentrates: false },
    { slot: 7, duration: { kind: 'turn_boundaries', remaining: 14400 }, concentrates: false },
    { slot: 8, duration: { kind: 'turn_boundaries', remaining: 14400 }, concentrates: false },
    { slot: 9, duration: { kind: 'permanent' }, concentrates: false },
  ] as const)('Bestow Curse slot $slot uses its exact SRD duration and concentration tier', ({ slot, duration, concentrates }) => {
    const result = castBestowCurse(slot);
    const curse = result.state.effects.find((candidate) => candidate.payload.kind === 'bestow_curse');
    expect(curse?.duration.kind).toBe(duration.kind);
    if (duration.kind === 'turn_boundaries') {
      expect(curse?.duration.kind === 'turn_boundaries' ? curse.duration.remaining : null).toBe(duration.remaining);
      expect(curse?.duration.kind === 'turn_boundaries' ? curse.duration.timing.boundary : null).toBe('start');
      expect(curse?.duration.kind === 'turn_boundaries' ? curse.duration.timing.source : null).toBe('docs/srd/source/spell-descriptions.txt:753');
    } else {
      expect(curse?.duration).toEqual({ kind: 'permanent' });
    }
    expect(curse?.concentrationOwner !== null).toBe(concentrates);
  });

  it('level-4 Major Image becomes permanent and loses concentration', () => {
    const image = castLevelFour('major-image').state.effects.find((candidate) => candidate.payload.kind === 'major_image');
    expect(image?.duration).toEqual({ kind: 'permanent' });
    expect(image?.concentrationOwner).toBeNull();
  });
});

function castLevelFour(id: string): ReturnType<typeof reduceEncounter> {
  const definition = spellDefinition(id);
  if (definition === null) throw new Error(`Missing ${id} definition.`);
  const caster = playerProfile(`${id}-level-four-caster`, { initiativeBonus: 20, spellSlots: referencePartySpellSlots('Wizard') });
  const target = monsterProfile(`${id}-level-four-target`, { hitPoints: 200, initiativeBonus: 0 });
  let state = createEncounter({ bounds: { columns: 50, rows: 30 }, combatants: [caster, target], tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)] });
  if (definition.castingTime !== 'minute' && definition.castingTime !== 'ten_minutes' && definition.castingTime !== 'hour') {
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  }
  const selectsTarget = definition.targeting.kind === 'single' || definition.targeting.kind === 'multiple' ||
    definition.targeting.kind === 'all_in_range' || definition.targeting.kind === 'remote' || definition.targeting.kind === 'area_selected';
  return reduceEncounter(state, {
    type: 'cast_spell', actor: caster.id, spellId: id, slotLevel: 4, castAsRitual: false,
    casterLevel: 7, attackBonus: 100, saveDc: 100, spellcastingModifier: 3,
    targets: selectsTarget ? [target.id] : [], area: levelThreeArea(definition), weaponAttack: null,
    selectedOption: id === 'spirit-guardians' ? 'Radiant' : null,
  }, () => 0.5);
}

function castBestowCurse(slot: SpellSlotLevel): ReturnType<typeof reduceEncounter> {
  const definition = spellDefinition('bestow-curse');
  if (definition === null) throw new Error('Missing bestow-curse definition.');
  const caster = playerProfile(`bestow-curse-${slot}-caster`, {
    initiativeBonus: 20,
    spellSlots: [{ level: slot, maximum: 1 }],
  });
  const target = monsterProfile(`bestow-curse-${slot}-target`, { initiativeBonus: 0 });
  let state = createEncounter({
    bounds: { columns: 20, rows: 20 },
    combatants: [caster, target],
    tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  return reduceEncounter(state, {
    type: 'cast_spell', actor: caster.id, spellId: definition.id, slotLevel: slot, castAsRitual: false,
    casterLevel: 7, attackBonus: 100, saveDc: 100, spellcastingModifier: 3,
    targets: [target.id], area: null, weaponAttack: null, selectedOption: null,
  }, () => 0.5);
}

function levelThreeArea(definition: SpellDefinition): SpellCastCommand['area'] {
  const targeting = definition.targeting;
  if (targeting.kind !== 'area' && targeting.kind !== 'area_selected') return null;
  const size = targeting.baseSizeFeet;
  switch (targeting.shape) {
    case 'sphere': return { shape: 'sphere', template: { origin: feetPoint(10, 10), radius: feet(size) } };
    case 'cone': return { shape: 'cone', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(size), includeOrigin: false } };
    case 'cube': return { shape: 'cube', template: { origin: feetPoint(0, size / 2), center: feetPoint(size / 2, size / 2), axis: { x: 1, y: 0 }, size: feet(size), includeOrigin: false } };
    case 'line': return { shape: 'line', template: { origin: feetPoint(5, 5), direction: { x: 1, y: 0 }, length: feet(size), width: feet(targeting.secondarySizeFeet ?? 5), includeOrigin: false } };
    case 'cylinder': return { shape: 'cylinder', template: { origin: feetPoint(10, 10), radius: feet(size), height: feet(targeting.secondarySizeFeet ?? size) } };
    case 'emanation': return { shape: 'emanation', template: { origin: feetPoint(5, 5), radius: feet(size), includeOrigin: true } };
  }
}
