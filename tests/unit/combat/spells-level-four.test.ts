import { describe, expect, it } from 'vitest';
import type { SpellSlotCapacity, SpellSlotLevel } from '../../../src/combat/combatant';
import type { EffectPayload } from '../../../src/combat/effects';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { IMPLEMENTED_SPELL_DEFINITIONS, spellDefinition } from '../../../src/combat/spells/definitions';
import { referencePartySpellSlots } from '../../../src/combat/spells/resources';
import type { EffectData, ScaledDice, SpellCastCommand, SpellCastingTime, SpellDefinition } from '../../../src/combat/spells/types';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, feet } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

interface LevelFourPin {
  readonly id: string;
  readonly source: `spell-descriptions.txt:${number}`;
  readonly targeting: SpellDefinition['targeting'];
  readonly operation: SpellDefinition['operation'];
}

interface ComponentPin {
  readonly id: string;
  readonly castingTime: SpellCastingTime;
  readonly components: 'V' | 'VS' | 'VSM';
  readonly material: string | null;
  readonly consumed: boolean;
  readonly ritual: boolean;
}

function dice(baseCount: number, sides: number, options: { readonly perSlotCount?: number } = {}): ScaledDice {
  return { baseCount, sides, modifier: 0, perSlotCount: options.perSlotCount ?? 0, perSlotModifier: 0, cantripUpgrade: false };
}

function effect(payload: EffectPayload, options: {
  readonly target?: 'self' | 'targets'; readonly concentration?: boolean;
  readonly durationRounds?: number | null; readonly expiresAt?: EffectData['expiresAt'];
  readonly repeatedSave?: EffectData['repeatedSave'];
} = {}): EffectData {
  return {
    payload, target: options.target ?? 'targets', concentration: options.concentration ?? false,
    durationRounds: options.durationRounds ?? 1, expiresAt: options.expiresAt ?? 'source_start',
    ...(options.repeatedSave === undefined ? {} : { repeatedSave: options.repeatedSave }),
  };
}

/** Independent SRD-transcribed oracle; every targeting and operation field is retained. */
const LEVEL_FOUR_PINS: readonly LevelFourPin[] = [
  { id: 'arcane-eye', source: 'spell-descriptions.txt:398', targeting: { kind: 'utility', rangeFeet: 30 }, operation: { kind: 'utility', effect: { kind: 'arcane_eye', darkvisionFeet: 30, moveFeetPerBonusAction: 30, minimumOpeningInches: 1, invisible: true, invulnerable: true, hovers: true, seesEveryDirection: true, blockedBySolidBarriers: true }, concentration: true, durationRounds: 600 } },
  { id: 'aura-of-life', source: 'spell-descriptions.txt:624', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'aura_of_life', radiusFeet: 30, resistanceType: 'Necrotic', preventsHitPointMaximumReduction: true, startTurnHealingAtZero: 1 }, { target: 'self', concentration: true, durationRounds: 100 }) } },
  { id: 'banishment', source: 'spell-descriptions.txt:686', targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'save_effect', ability: 'charisma', rollMode: 'normal', effect: effect({ kind: 'banishment', condition: 'Incapacitated', nativePlaneCreatureTypes: ['Aberration', 'Celestial', 'Elemental', 'Fey', 'Fiend'], permanentAfterRounds: 10 }, { concentration: true, durationRounds: 10 }) } },
  { id: 'black-tentacles', source: 'spell-descriptions.txt:784', targeting: { kind: 'area', rangeFeet: 90, shape: 'cube', baseSizeFeet: 20, sizePerSlotFeet: 0, surface: 'ground_square' }, operation: { kind: 'save_damage_and_effect', ability: 'strength', onSuccess: 'none', damageType: damageType('Bludgeoning'), dice: dice(3, 6), effect: effect({ kind: 'black_tentacles_area', placement: 'selected_when_cast', squareFeet: 20, difficultTerrain: true, saveAbility: 'strength', damageCount: 3, damageSides: 6, damageType: 'Bludgeoning', failureCondition: 'Restrained', escapeCheckSkill: 'Athletics', oncePerTurn: true }, { target: 'self', concentration: true, durationRounds: 10 }) } },
  { id: 'blight', source: 'spell-descriptions.txt:842', targeting: { kind: 'single', rangeFeet: 30, willing: false }, operation: { kind: 'save_damage', ability: 'constitution', onSuccess: 'half', damageType: damageType('Necrotic'), dice: dice(8, 8, { perSlotCount: 1 }), riderOnFailure: null, pushFeetOnFailure: 0 } },
  { id: 'charm-monster', source: 'spell-descriptions.txt:1025', targeting: { kind: 'multiple', rangeFeet: 30, baseMaximum: 1, additionalPerSlot: 1 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'charm_monster', condition: 'Charmed', hostileSaveMode: 'advantage', attitude: 'Friendly', endsWhenDamagedByCasterOrAllies: true, targetKnowsAfterward: true }, { durationRounds: 600 }) } },
  { id: 'confusion', source: 'spell-descriptions.txt:1358', targeting: { kind: 'area', rangeFeet: 90, shape: 'sphere', baseSizeFeet: 10, sizePerSlotFeet: 5 }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'confusion_area', placement: 'selected_when_cast', behaviorDieSides: 10, directionDieSides: 4, bonusActionsAllowed: false, reactionsAllowed: false }, { concentration: true, durationRounds: 10, expiresAt: 'target_end', repeatedSave: { ability: 'wisdom', rollMode: 'normal', timing: 'target_end' } }) } },
  { id: 'conjure-minor-elementals', source: 'spell-descriptions.txt:1516', targeting: { kind: 'area', rangeFeet: 0, shape: 'emanation', baseSizeFeet: 15, sizePerSlotFeet: 0 }, operation: { kind: 'effect', effect: effect({ kind: 'conjure_minor_elementals', radiusFeet: 15, damageTypes: ['Acid', 'Cold', 'Fire', 'Lightning'], damageCount: 2, damageSides: 8, damagePerSlotCount: 1, difficultTerrainForEnemies: true }, { target: 'self', concentration: true, durationRounds: 100 }) } },
  { id: 'control-water', source: 'spell-descriptions.txt:1660', targeting: { kind: 'area', rangeFeet: 300, shape: 'cube', baseSizeFeet: 100, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'control_water', placement: 'selected_when_cast', cubeFeet: 100, modes: ['flood', 'part_water', 'redirect_flow', 'whirlpool'], floodRiseFeet: 20, capsizePercent: 25, whirlpoolMinimumSquareFeet: 50, whirlpoolMinimumDepthFeet: 25, whirlpoolBaseFeet: 5, whirlpoolTopFeet: 50, whirlpoolHeightFeet: 25, pullRadiusFeet: 25, pullFeet: 10, damageCount: 2, damageSides: 8, onSuccess: 'half', saveAbility: 'strength', escapeCheckAbility: 'strength', escapeCheckSkill: 'Athletics' }, concentration: true, durationRounds: 100 } },
  { id: 'death-ward', source: 'spell-descriptions.txt:1992', targeting: { kind: 'single', rangeFeet: 5, willing: false }, operation: { kind: 'effect', effect: effect({ kind: 'death_ward', replacementHitPoints: 1, negatesInstantDeath: true, consumedOnTrigger: true }, { durationRounds: 4800 }) } },
  { id: 'dimension-door', source: 'spell-descriptions.txt:2156', targeting: { kind: 'utility', rangeFeet: 500 }, operation: { kind: 'utility', effect: { kind: 'dimension_door', maximumDistanceFeet: 500, maximumPassengers: 1, passengerStartFeet: 5, passengerDestinationFeet: 5, failureDamageCount: 4, failureDamageSides: 6, failureDamageType: 'Force', passengerMustBeWilling: true }, concentration: false, durationRounds: null } },
  { id: 'divination', source: 'spell-descriptions.txt:2312', targeting: { kind: 'utility', rangeFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'divination', forecastDays: 7, noAnswerChancePerExtraCastingPercent: 25 }, concentration: false, durationRounds: null } },
  { id: 'fabricate', source: 'spell-descriptions.txt:2852', targeting: { kind: 'utility', rangeFeet: 120 }, operation: { kind: 'utility', effect: { kind: 'fabricate', standardCubeFeet: 10, connectedCubes: 8, mineralCubeFeet: 5, requiresArtisanToolProficiencyForSkilledItems: true, createsCreaturesOrMagicItems: false }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'faithful-hound', source: 'spell-descriptions.txt:2902', targeting: { kind: 'utility', rangeFeet: 30 }, operation: { kind: 'utility', effect: { kind: 'faithful_hound', maximumSeparationFeet: 300, triggerRadiusFeet: 30, truesightFeet: 30, biteReachFeet: 5, saveAbility: 'dexterity', damageCount: 4, damageSides: 8, damageType: 'Force', moveFeetPerMagicAction: 30, triggerMinimumSize: 'Small', intangible: true, invulnerable: true }, concentration: false, durationRounds: 4800, stateful: true } },
  { id: 'fire-shield', source: 'spell-descriptions.txt:3202', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'fire_shield', brightFeet: 10, dimFeet: 10, resistanceTypes: ['Cold', 'Fire'], retaliationReachFeet: 5, retaliationDamageCount: 2, retaliationDamageSides: 8, retaliationDamageTypes: ['Fire', 'Cold'] }, { target: 'self', durationRounds: 100 }) } },
  { id: 'freedom-of-movement', source: 'spell-descriptions.txt:3520', targeting: { kind: 'multiple', rangeFeet: 5, baseMaximum: 1, additionalPerSlot: 1, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'freedom_of_movement', ignoresDifficultTerrain: true, preventsMagicalSpeedReduction: true, preventedConditions: ['Paralyzed', 'Restrained'], swimSpeedEqualsSpeed: true, nonmagicalEscapeMovementFeet: 5 }, { durationRounds: 600 }) } },
  { id: 'greater-invisibility', source: 'spell-descriptions.txt:3898', targeting: { kind: 'single', rangeFeet: 5, willing: false }, operation: { kind: 'effect', effect: effect({ kind: 'condition', condition: 'Invisible' }, { concentration: true, durationRounds: 10 }) } },
  { id: 'guardian-of-faith', source: 'spell-descriptions.txt:3927', targeting: { kind: 'utility', rangeFeet: 30 }, operation: { kind: 'utility', effect: { kind: 'guardian_of_faith', size: 'Large', triggerRadiusFeet: 10, saveAbility: 'dexterity', damage: 20, damageType: 'Radiant', onSuccess: 'half', maximumTotalDamage: 60, invulnerable: true }, concentration: false, durationRounds: 4800, stateful: true } },
  { id: 'hallucinatory-terrain', source: 'spell-descriptions.txt:4101', targeting: { kind: 'area', rangeFeet: 300, shape: 'cube', baseSizeFeet: 150, sizePerSlotFeet: 0 }, operation: { kind: 'utility', effect: { kind: 'hallucinatory_terrain', placement: 'selected_when_cast', cubeFeet: 150, sensoryModes: ['visual', 'sound', 'smell'], tactileUnchanged: true, investigationAgainstSpellDc: true }, concentration: false, durationRounds: 14400 } },
  { id: 'ice-storm', source: 'spell-descriptions.txt:4453', targeting: { kind: 'area', rangeFeet: 300, shape: 'cylinder', baseSizeFeet: 20, sizePerSlotFeet: 0, secondarySizeFeet: 40 }, operation: { kind: 'save_multi_damage', ability: 'dexterity', onSuccess: 'half', terms: [{ damageType: damageType('Bludgeoning'), dice: dice(2, 10, { perSlotCount: 1 }) }, { damageType: damageType('Cold'), dice: dice(4, 6) }], effect: effect({ kind: 'ice_storm_terrain', placement: 'selected_when_cast', difficultTerrain: true }, { target: 'self', durationRounds: 2, expiresAt: 'source_end' }) } },
  { id: 'locate-creature', source: 'spell-descriptions.txt:4858', targeting: { kind: 'self' }, operation: { kind: 'effect', effect: effect({ kind: 'locate_creature', radiusFeet: 1000, familiarityDistanceFeet: 30, blockedByLead: true, failsForDifferentForm: true }, { target: 'self', concentration: true, durationRounds: 600 }) } },
  { id: 'phantasmal-killer', source: 'spell-descriptions.txt:5733', targeting: { kind: 'single', rangeFeet: 120, willing: false }, operation: { kind: 'save_damage', ability: 'wisdom', onSuccess: 'half', damageType: damageType('Psychic'), dice: dice(4, 10, { perSlotCount: 1 }), riderOnFailure: effect({ kind: 'phantasmal_killer', disadvantagedTests: ['ability_check', 'attack_roll'], repeatSaveAbility: 'wisdom', repeatDamageCount: 4, repeatDamageSides: 10, repeatDamagePerSlotCount: 1, repeatDamageType: 'Psychic' }, { concentration: true, durationRounds: 10, expiresAt: 'target_end', repeatedSave: { ability: 'wisdom', rollMode: 'normal', timing: 'target_end' } }), pushFeetOnFailure: 0 } },
  { id: 'polymorph', source: 'spell-descriptions.txt:5939', targeting: { kind: 'single', rangeFeet: 60, willing: false }, operation: { kind: 'save_effect', ability: 'wisdom', rollMode: 'normal', effect: effect({ kind: 'polymorph', formType: 'Beast', maximumChallengeRating: 'target_cr_or_level', temporaryHitPoints: 'beast_hit_points', endsAtTemporaryHitPoints: 0, canSpeak: false, canCastSpells: false, gearMelds: true, retainedStatistics: ['alignment', 'personality', 'creature_type', 'hit_points', 'hit_point_dice'] }, { concentration: true, durationRounds: 600 }) } },
  { id: 'private-sanctum', source: 'spell-descriptions.txt:6213', targeting: { kind: 'area', rangeFeet: 120, shape: 'cube', baseSizeFeet: 100, sizePerSlotFeet: 100 }, operation: { kind: 'utility', effect: { kind: 'private_sanctum', placement: 'selected_when_cast', minimumCubeFeet: 5, maximumCubeFeet: 100, cubeFeetPerSlot: 100, protections: ['sound', 'vision', 'divination_sensors', 'divination_targeting', 'teleportation', 'planar_travel'], permanentAfterDailyCastings: 365 }, concentration: false, durationRounds: 14400 } },
  { id: 'resilient-sphere', source: 'spell-descriptions.txt:6513', targeting: { kind: 'single', rangeFeet: 30, willing: false }, operation: { kind: 'save_effect', ability: 'dexterity', rollMode: 'normal', willingTargetSkipsSave: true, effect: effect({ kind: 'resilient_sphere', maximumSize: 'Large', blocksPhysicalObjectsEnergyAndSpells: true, immuneToDamage: true, rollSpeedMultiplier: 0.5, destroyedBy: 'Disintegrate' }, { concentration: true, durationRounds: 10 }) } },
  { id: 'secret-chest', source: 'spell-descriptions.txt:6755', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'secret_chest', chestDimensionsFeet: [3, 2, 2], capacityCubicFeet: 12, recallDistanceFeet: 5, riskBeginsAfterDays: 60, dailyCumulativeChancePerDayPercent: 5, chestMinimumGp: 5000, replicaMinimumGp: 50 }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'stone-shape', source: 'spell-descriptions.txt:7413', targeting: { kind: 'utility', rangeFeet: 5 }, operation: { kind: 'utility', effect: { kind: 'stone_shape', maximumObjectSize: 'Medium', maximumDimensionFeet: 5, maximumHinges: 2, permitsLatch: true }, concentration: false, durationRounds: null, stateful: true } },
  { id: 'stoneskin', source: 'spell-descriptions.txt:7429', targeting: { kind: 'single', rangeFeet: 5, willing: true }, operation: { kind: 'effect', effect: effect({ kind: 'damage_resistances', damageTypes: [damageType('Bludgeoning'), damageType('Piercing'), damageType('Slashing')] }, { concentration: true, durationRounds: 600 }) } },
  { id: 'vitriolic-sphere', source: 'spell-descriptions.txt:8196', targeting: { kind: 'area', rangeFeet: 150, shape: 'sphere', baseSizeFeet: 20, sizePerSlotFeet: 0 }, operation: { kind: 'save_damage_over_time', ability: 'dexterity', onSuccess: 'half_initial', damageType: damageType('Acid'), initialDice: dice(10, 4, { perSlotCount: 2 }), laterDice: dice(5, 4), laterTiming: 'target_end' } },
  { id: 'wall-of-fire', source: 'spell-descriptions.txt:8217', targeting: { kind: 'area', rangeFeet: 120, shape: 'line', baseSizeFeet: 60, sizePerSlotFeet: 0, secondarySizeFeet: 1 }, operation: { kind: 'save_damage_and_effect', ability: 'dexterity', onSuccess: 'half', damageType: damageType('Fire'), dice: dice(5, 8, { perSlotCount: 1 }), effect: effect({ kind: 'wall_of_fire', placement: 'selected_when_cast', maximumLengthFeet: 60, heightFeet: 20, thicknessFeet: 1, ringDiameterFeet: 20, damagingSideDistanceFeet: 10, damageCount: 5, damageSides: 8, damagePerSlotCount: 1, damageType: 'Fire', opaque: true, requiresSolidSurface: true }, { target: 'self', concentration: true, durationRounds: 10 }) } },
];

const LEVEL_FOUR_COMPONENT_PINS: readonly ComponentPin[] = [
  { id: 'arcane-eye', castingTime: 'action', components: 'VSM', material: 'a bit of bat fur', consumed: false, ritual: false },
  { id: 'aura-of-life', castingTime: 'action', components: 'V', material: null, consumed: false, ritual: false },
  { id: 'banishment', castingTime: 'action', components: 'VSM', material: 'a pentacle', consumed: false, ritual: false },
  { id: 'black-tentacles', castingTime: 'action', components: 'VSM', material: 'a tentacle', consumed: false, ritual: false },
  { id: 'blight', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'charm-monster', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'confusion', castingTime: 'action', components: 'VSM', material: 'three nut shells', consumed: false, ritual: false },
  { id: 'conjure-minor-elementals', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'control-water', castingTime: 'action', components: 'VSM', material: 'a mixture of water and dust', consumed: false, ritual: false },
  { id: 'death-ward', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'dimension-door', castingTime: 'action', components: 'V', material: null, consumed: false, ritual: false },
  { id: 'divination', castingTime: 'action', components: 'VSM', material: 'incense worth 25+ GP', consumed: true, ritual: true },
  { id: 'fabricate', castingTime: 'ten_minutes', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'faithful-hound', castingTime: 'action', components: 'VSM', material: 'a silver whistle', consumed: false, ritual: false },
  { id: 'fire-shield', castingTime: 'action', components: 'VSM', material: 'a bit of phosphorus or a firefly', consumed: false, ritual: false },
  { id: 'freedom-of-movement', castingTime: 'action', components: 'VSM', material: 'a leather strap', consumed: false, ritual: false },
  { id: 'greater-invisibility', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'guardian-of-faith', castingTime: 'action', components: 'V', material: null, consumed: false, ritual: false },
  { id: 'hallucinatory-terrain', castingTime: 'ten_minutes', components: 'VSM', material: 'a mushroom', consumed: false, ritual: false },
  { id: 'ice-storm', castingTime: 'action', components: 'VSM', material: 'a mitten', consumed: false, ritual: false },
  { id: 'locate-creature', castingTime: 'action', components: 'VSM', material: 'fur from a bloodhound', consumed: false, ritual: false },
  { id: 'phantasmal-killer', castingTime: 'action', components: 'VS', material: null, consumed: false, ritual: false },
  { id: 'polymorph', castingTime: 'action', components: 'VSM', material: 'a caterpillar cocoon', consumed: false, ritual: false },
  { id: 'private-sanctum', castingTime: 'ten_minutes', components: 'VSM', material: 'a thin sheet of lead', consumed: false, ritual: false },
  { id: 'resilient-sphere', castingTime: 'action', components: 'VSM', material: 'a glass sphere', consumed: false, ritual: false },
  { id: 'secret-chest', castingTime: 'action', components: 'VSM', material: 'a chest, 3 feet by 2 feet by 2 feet, constructed from rare materials worth 5,000+ GP, and a Tiny replica of the chest made from the same materials worth 50+ GP', consumed: false, ritual: false },
  { id: 'stone-shape', castingTime: 'action', components: 'VSM', material: 'soft clay', consumed: false, ritual: false },
  { id: 'stoneskin', castingTime: 'action', components: 'VSM', material: 'diamond dust worth 100+ GP', consumed: true, ritual: false },
  { id: 'vitriolic-sphere', castingTime: 'action', components: 'VSM', material: 'a drop of bile', consumed: false, ritual: false },
  { id: 'wall-of-fire', castingTime: 'action', components: 'VSM', material: 'a piece of charcoal', consumed: false, ritual: false },
];

describe('level-4 spell mechanics pins', () => {
  it('has one exact independent pin for every implemented level-4 definition', () => {
    expect(LEVEL_FOUR_PINS).toHaveLength(30);
    expect(LEVEL_FOUR_PINS.map((pin) => pin.id).sort()).toEqual(
      IMPLEMENTED_SPELL_DEFINITIONS.filter((definition) => definition.level === 4).map((definition) => definition.id).sort(),
    );
  });

  it.each(LEVEL_FOUR_PINS)('$id pins every targeting and operation literal from $source', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    expect({ targeting: definition.targeting, operation: definition.operation }).toEqual({ targeting: pin.targeting, operation: pin.operation });
  });

  it.each(LEVEL_FOUR_COMPONENT_PINS)('$id pins every casting and component literal', (pin) => {
    const definition = spellDefinition(pin.id);
    if (definition === null) throw new Error(`Missing definition ${pin.id}.`);
    const components = `${definition.components.verbal ? 'V' : ''}${definition.components.somatic ? 'S' : ''}${definition.components.material === null ? '' : 'M'}`;
    expect({ castingTime: definition.castingTime, components, material: definition.components.material?.text ?? null,
      consumed: definition.components.material?.consumed ?? false, ritual: definition.ritual === true }).toEqual({
      castingTime: pin.castingTime, components: pin.components, material: pin.material, consumed: pin.consumed, ritual: pin.ritual,
    });
  });

  it.each(LEVEL_FOUR_PINS)('$id executes its pinned mechanics through the reducer', (pin) => {
    const result = castSpell(pin.id, 4, referencePartySpellSlots('Wizard'));
    expect(result.events.some((event) => event.type === 'spell_cast' && event.spellId === pin.id)).toBe(true);
    expect(result.state.combatants[0]?.spellSlots.find((slot) => slot.level === 4)?.remaining).toBe(0);
  });

  it('Blight level-5 upcast rolls exactly 9d8 rather than the level-4 base 8d8', () => {
    const result = castSpell('blight', 5, [{ level: 5 as SpellSlotLevel, maximum: 1 }], () => 0);
    const damage = result.events.find((event) => event.type === 'damage_applied' && String(event.target).includes('target'));
    expect(damage?.type === 'damage_applied' ? damage.amount : null).toBe(9);
  });

  it('Vitriolic Sphere failed save creates the pinned 5d4 target-end damage', () => {
    const result = castSpell('vitriolic-sphere', 4, referencePartySpellSlots('Wizard'), () => 0);
    const ongoing = result.state.effects.find((candidate) => candidate.payload.kind === 'ongoing_damage');
    expect(ongoing?.payload.kind === 'ongoing_damage' ? ongoing.payload.damage.terms[0]?.dice : null).toEqual({ count: 5, sides: 4, modifier: 0 });
    expect(ongoing?.duration).toMatchObject({ kind: 'turn_boundaries', remaining: 1 });
  });

  it('Resilient Sphere applies to a willing creature without a Dexterity save', () => {
    const result = castSpell('resilient-sphere', 4, referencePartySpellSlots('Wizard'), () => 0.999, 'willing', 2);
    expect(result.events.some((event) => event.type === 'save_resolved')).toBe(false);
    expect(result.state.effects.some((effect) => effect.payload.kind === 'resilient_sphere')).toBe(true);
  });
});

function castSpell(
  id: string,
  slotLevel: number,
  spellSlots: readonly SpellSlotCapacity[],
  rng: () => number = () => 0.5,
  selectedOption: string | null = null,
  saveDc = 100,
): ReturnType<typeof reduceEncounter> {
  const definition = spellDefinition(id);
  if (definition === null) throw new Error(`Missing ${id} definition.`);
  const caster = playerProfile(`caster-${id}`, { hitPoints: 500, initiativeBonus: 20, spellSlots });
  const target = monsterProfile(`target-${id}`, { hitPoints: 500, initiativeBonus: 0 });
  let state = createEncounter({ bounds: { columns: 80, rows: 80 }, combatants: [caster, target], tokens: [placedToken(caster, 0, 1), placedToken(target, 1, 1)] });
  if (definition.castingTime !== 'minute' && definition.castingTime !== 'ten_minutes' && definition.castingTime !== 'hour') {
    state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  }
  const selectsTarget = definition.targeting.kind === 'single' || definition.targeting.kind === 'multiple' ||
    definition.targeting.kind === 'all_in_range' || definition.targeting.kind === 'remote' || definition.targeting.kind === 'area_selected';
  return reduceEncounter(state, {
    type: 'cast_spell', actor: caster.id, spellId: id, slotLevel, castAsRitual: false,
    casterLevel: 7, attackBonus: 100, saveDc, spellcastingModifier: 3,
    targets: selectsTarget ? [target.id] : [], area: spellArea(definition), weaponAttack: null, selectedOption,
  }, rng);
}

function spellArea(definition: SpellDefinition): SpellCastCommand['area'] {
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
