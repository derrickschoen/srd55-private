import { describe, expect, it } from 'vitest';
import { monsterStatblock } from '../../../src/combat/statblock';
import type {
  DecodedField,
  MonsterAction,
  MonsterAttackAction,
  MonsterAttackMechanic,
  MonsterBonusAction,
  MonsterDice,
  MonsterReaction,
  MonsterSavingThrowAction,
  MonsterSavingThrowMechanic,
  MonsterSourceDetailsInput,
  MonsterTrait,
} from '../../../src/combat/statblock';
import {
  AIR_ELEMENTAL,
  ANIMATED_ARMOR,
  BLACK_PUDDING,
  DOPPELGANGER,
  EARTH_ELEMENTAL,
  GARGOYLE,
  GHOST,
  GIANT_RAT,
  MIMIC,
  ROC,
  STIRGE,
  WILL_O_WISP,
  ASTRALDENDON,
  ASTRALMYCON,
  ANIMATED_BROOM,
  ANIMATED_STATUE,
  FAMILIAR,
  ASTRAL_TOWER_MONSTER_ROSTER,
  ASTRAL_TOWER_UNSUPPORTED_ENTRIES,
} from '../../../src/combat/statblocks/astral-tower';

function required<T>(field: DecodedField<T>, label: string): T {
  if (field.kind === 'absent') throw new Error(`${label} unexpectedly absent: ${field.note}`);
  return field.value;
}

function attack(statblock: { readonly sourceDetails: { readonly actions: DecodedField<readonly MonsterAction[]> } }, id: string) {
  const found = required(statblock.sourceDetails.actions, `${id} actions`).find((action) => action.kind === 'attack' && action.id === id);
  if (found?.kind !== 'attack') throw new Error(`Missing attack ${id}.`);
  return found;
}

function dice(die: MonsterDice): string {
  const modifier = die.modifier === 0 ? '' : die.modifier > 0 ? ` + ${String(die.modifier)}` : ` - ${String(Math.abs(die.modifier))}`;
  return `${String(die.count)}d${String(die.sides)}${modifier}`;
}

const VOCABULARY_SOURCE = { path: 'docs/srd/full/srd-5.2.1.txt', lineStart: 16783, lineEnd: 22544 } as const;
const ZERO_ABILITY = { score: 10, modifier: 0, saveBonus: 0 } as const;

function decodeVocabulary(options: {
  readonly challenge?: MonsterSourceDetailsInput['challenge'];
  readonly traits?: readonly MonsterTrait[];
  readonly actions?: readonly MonsterAction[];
  readonly bonusActions?: readonly MonsterBonusAction[];
  readonly reactions?: readonly MonsterReaction[];
}) {
  return monsterStatblock({
    id: 'test:vocabulary-decode', name: 'Vocabulary Decode Fixture', armorClass: 10,
    hitPointMaximum: 4, speedFeet: 30, initiativeBonus: 0,
    savingThrowBonuses: { strength: 0, dexterity: 0, constitution: 0, intelligence: 0, wisdom: 0, charisma: 0 },
    sourceDetails: {
      source: [VOCABULARY_SOURCE],
      classification: { sizes: ['Medium'], type: 'Monstrosity', subtype: null, alignment: 'Neutral' },
      challenge: options.challenge ?? { rating: '1/8', experiencePoints: 25, proficiencyBonus: 2 },
      hitPointDice: { count: 1, sides: 8, modifier: 0 },
      movement: [{ kind: 'walk', feet: 30, hover: false }],
      abilities: {
        strength: ZERO_ABILITY, dexterity: ZERO_ABILITY, constitution: ZERO_ABILITY,
        intelligence: ZERO_ABILITY, wisdom: ZERO_ABILITY, charisma: ZERO_ABILITY,
      },
      skills: { kind: 'present', value: [] }, gear: { kind: 'present', value: [] },
      senses: { kind: 'present', value: [] }, passivePerception: 10,
      languages: { kind: 'present', value: [] }, damageResponses: { kind: 'present', value: [] },
      conditionImmunities: { kind: 'present', value: [] },
      traits: { kind: 'present', value: options.traits ?? [] }, actions: options.actions ?? [],
      bonusActions: { kind: 'present', value: options.bonusActions ?? [] },
      reactions: { kind: 'present', value: options.reactions ?? [] },
    },
  });
}

const unavailable = (lineStart: number, lineEnd: number) => ({
  source: { path: 'docs/srd/full/srd-5.2.1.txt', lineStart, lineEnd } as const,
  execution: { kind: 'absent' as const, note: 'The typed mechanic is unavailable to the current reducer.' },
});

describe('Astral Tower SRD 5.2.1 statblocks', () => {
  const sourceOracles = [
    { name: 'Air Elemental', statblock: AIR_ELEMENTAL, armorClass: 15, hitPoints: 90, hitDice: '12d10 + 24', actionId: 'thunderous-slam', attackBonus: 8, damageAverage: 14, damageDice: '2d8 + 5', challenge: 5 },
    { name: 'Animated Armor', statblock: ANIMATED_ARMOR, armorClass: 18, hitPoints: 33, hitDice: '6d8 + 6', actionId: 'slam', attackBonus: 4, damageAverage: 5, damageDice: '1d6 + 2', challenge: 1 },
    { name: 'Black Pudding', statblock: BLACK_PUDDING, armorClass: 7, hitPoints: 68, hitDice: '8d10 + 24', actionId: 'dissolving-pseudopod', attackBonus: 5, damageAverage: 17, damageDice: '4d6 + 3', challenge: 4 },
    { name: 'Doppelganger', statblock: DOPPELGANGER, armorClass: 14, hitPoints: 52, hitDice: '8d8 + 16', actionId: 'slam', attackBonus: 6, damageAverage: 11, damageDice: '2d6 + 4', challenge: 3 },
    { name: 'Earth Elemental', statblock: EARTH_ELEMENTAL, armorClass: 17, hitPoints: 147, hitDice: '14d10 + 70', actionId: 'slam', attackBonus: 8, damageAverage: 14, damageDice: '2d8 + 5', challenge: 5 },
    { name: 'Ghost', statblock: GHOST, armorClass: 11, hitPoints: 45, hitDice: '10d8', actionId: 'withering-touch', attackBonus: 5, damageAverage: 19, damageDice: '3d10 + 3', challenge: 4 },
    { name: 'Mimic', statblock: MIMIC, armorClass: 12, hitPoints: 58, hitDice: '9d8 + 18', actionId: 'bite', attackBonus: 5, damageAverage: 7, damageDice: '1d8 + 3', challenge: 2 },
    { name: 'Stirge', statblock: STIRGE, armorClass: 13, hitPoints: 5, hitDice: '2d4', actionId: 'proboscis', attackBonus: 5, damageAverage: 6, damageDice: '1d6 + 3', challenge: '1/8' },
    { name: 'Will-o’-Wisp', statblock: WILL_O_WISP, armorClass: 19, hitPoints: 27, hitDice: '11d4', actionId: 'shock', attackBonus: 4, damageAverage: 11, damageDice: '2d8 + 2', challenge: 2 },
  ] as const;

  for (const oracle of sourceOracles) {
    it(`pins ${oracle.name} load-bearing values copied from the SRD text`, () => {
      const primary = attack(oracle.statblock, oracle.actionId);
      const challenge = required(oracle.statblock.sourceDetails.challenge, `${oracle.name} challenge`);
      expect({
        armorClass: oracle.statblock.armorClass,
        hitPoints: oracle.statblock.hitPointMaximum,
        hitDice: dice(required(oracle.statblock.sourceDetails.hitPointDice, `${oracle.name} Hit Dice`)),
        attackBonus: primary.attackBonus,
        damageAverage: primary.damage[0]?.average,
        damageDice: primary.damage[0] === undefined ? null : dice(primary.damage[0].dice),
        challenge: challenge.rating,
      }).toEqual({
        armorClass: oracle.armorClass,
        hitPoints: oracle.hitPoints,
        hitDice: oracle.hitDice,
        attackBonus: oracle.attackBonus,
        damageAverage: oracle.damageAverage,
        damageDice: oracle.damageDice,
        challenge: oracle.challenge,
      });
    });
  }

  it('pins the Roc combat values and decodes its CR 11 vocabulary', () => {
    const beak = attack(ROC, 'beak');
    expect({ armorClass: ROC.armorClass, hitPoints: ROC.hitPointMaximum, hitDice: dice(required(ROC.sourceDetails.hitPointDice, 'Roc Hit Dice')), attackBonus: beak.attackBonus, damageAverage: beak.damage[0]?.average, damageDice: beak.damage[0] === undefined ? null : dice(beak.damage[0].dice) }).toEqual({
      armorClass: 15, hitPoints: 248, hitDice: '16d20 + 80', attackBonus: 13, damageAverage: 28, damageDice: '3d12 + 9',
    });
    expect(required(ROC.sourceDetails.challenge, 'Roc challenge')).toEqual({ rating: 11, experiencePoints: 7_200, proficiencyBonus: 4 });
    expect(ASTRAL_TOWER_UNSUPPORTED_ENTRIES).not.toContainEqual(expect.objectContaining({ monsterId: 'statblock:roc', category: 'challenge' }));
  });

  it('keeps all twelve requested SRD monsters in the Astral Tower registry family', () => {
    const requested = [AIR_ELEMENTAL, ANIMATED_ARMOR, BLACK_PUDDING, DOPPELGANGER, EARTH_ELEMENTAL, GARGOYLE, GHOST, GIANT_RAT, MIMIC, ROC, STIRGE, WILL_O_WISP];
    expect(ASTRAL_TOWER_MONSTER_ROSTER.filter((row) => row.provenance.kind === 'srd_5_2_1_decoded').map((row) => row.statblock)).toEqual(requested);
  });

  it('mutation control rejects a plausible one-point Ghost HP transcription error', () => {
    const retainedOracle = { armorClass: 11, hitPoints: 45, challenge: 4 };
    const plausibleMutation = { ...retainedOracle, hitPoints: 46 };
    const actual = { armorClass: GHOST.armorClass, hitPoints: GHOST.hitPointMaximum, challenge: required(GHOST.sourceDetails.challenge, 'Ghost challenge').rating };
    expect(actual).toEqual(retainedOracle);
    expect(actual).not.toEqual(plausibleMutation);
  });
});

describe('typed Astral Tower vocabulary decoding', () => {
  const traitCases = [
    {
      name: 'Air Form',
      sourceText: 'Air Form. The elemental can enter a creature’s space and stop there.',
      value: {
        kind: 'air_form', canEnterCreatureSpace: true, canStopInCreatureSpace: true,
        narrowestPassageInches: 1, extraMovementCost: false, ...unavailable(16808, 16810),
      } satisfies MonsterTrait,
      malformed: { narrowestPassageInches: 2 },
      error: /Air Form narrowest passage must be 1/,
    },
    {
      name: 'Earth Glide',
      sourceText: 'Earth Glide. The elemental can burrow through nonmagical, unworked earth and stone.',
      value: {
        kind: 'earth_glide', material: ['nonmagical_unworked_earth', 'nonmagical_unworked_stone'],
        disturbsMaterial: false, ...unavailable(18466, 18469),
      } satisfies MonsterTrait,
      malformed: { material: ['nonmagical_unworked_earth'] },
      error: /Earth Glide material must be/,
    },
    {
      name: 'Siege Monster',
      sourceText: 'Siege Monster. The elemental deals double damage to objects and structures.',
      value: {
        kind: 'siege_monster', targetKinds: ['objects', 'structures'], damageMultiplier: 2,
        ...unavailable(18469, 18470),
      } satisfies MonsterTrait,
      malformed: { damageMultiplier: 3 },
      error: /Siege Monster damage multiplier must be 2/,
    },
    {
      name: 'Adhesive',
      sourceText: 'A Huge or smaller creature adhered to the mimic has the Grappled condition (escape DC 13).',
      value: {
        kind: 'adhesive', requiredForm: 'object', trigger: 'anything_touches_monster',
        maximumCreatureSize: 'Huge', condition: 'Grappled', escapeDc: 13,
        escapeChecksHaveDisadvantage: true, ...unavailable(20225, 20229),
      } satisfies MonsterTrait,
      malformed: { escapeDc: 12 },
      error: /Adhesive escape DC must be 13/,
    },
    {
      name: 'Amorphous',
      sourceText: 'The pudding can move through a space as narrow as 1 inch without expending extra movement to do so.',
      value: {
        kind: 'amorphous', narrowestPassageInches: 1, extraMovementCost: false, ...unavailable(17269, 17272),
      } satisfies MonsterTrait,
      malformed: { narrowestPassageInches: 2 },
      error: /Amorphous narrowest passage must be 1/,
    },
    {
      name: 'Corrosive Form',
      sourceText: 'A creature that hits the pudding with a melee attack roll takes 4 (1d8) Acid damage.',
      value: {
        kind: 'corrosive_form',
        meleeAttackerDamage: { average: 4, dice: { count: 1, sides: 8, modifier: 0 }, type: 'Acid', trigger: { kind: 'always' } },
        ammunition: { material: 'nonmagical', destroyed: 'immediately_after_hit_that_deals_damage' },
        weapon: { material: 'nonmagical', trigger: 'after_dealing_damage_with_contact', cumulativeAttackPenalty: -1, destroyedAtPenalty: -5, repair: { spell: 'mending', removesAllPenalty: true } },
        consumption: { durationMinutes: 1, depthFeet: 2, materials: ['nonmagical_wood', 'nonmagical_metal'] },
        ...unavailable(17272, 17287),
      } satisfies MonsterTrait,
      malformed: { consumption: { durationMinutes: 1, depthFeet: 3, materials: ['nonmagical_wood', 'nonmagical_metal'] } },
      error: /Corrosive Form consumption depth must be 2/,
    },
    {
      name: 'Ethereal Sight',
      sourceText: 'The ghost can see 60 feet into the Ethereal Plane when it is on the Material Plane.',
      value: {
        kind: 'ethereal_sight', rangeFeet: 60, seesPlane: 'Ethereal', whileOnPlane: 'Material', ...unavailable(18812, 18813),
      } satisfies MonsterTrait,
      malformed: { rangeFeet: 30 },
      error: /Ethereal Sight range must be 60/,
    },
    {
      name: 'Ephemeral',
      sourceText: 'Ephemeral. The wisp can’t wear or carry anything.',
      value: {
        kind: 'ephemeral', canWearEquipment: false, canCarryEquipment: false, ...unavailable(22518, 22518),
      } satisfies MonsterTrait,
      malformed: { canCarryEquipment: true },
      error: /Ephemeral carry equipment must be false/,
    },
    {
      name: 'Illumination',
      sourceText: 'The wisp sheds Bright Light in a 20-foot radius and Dim Light for an additional 20 feet.',
      value: {
        kind: 'illumination', brightLightFeet: 20, additionalDimLightFeet: 20, ...unavailable(22519, 22520),
      } satisfies MonsterTrait,
      malformed: { additionalDimLightFeet: 10 },
      error: /Illumination dim light must be 20/,
    },
  ] as const;

  for (const fixture of traitCases) {
    it(`decodes the hand-authored ${fixture.name} SRD form`, () => {
      expect(fixture.sourceText).not.toHaveLength(0);
      const decoded = decodeVocabulary({ traits: [fixture.value] });
      expect(required(decoded.sourceDetails.traits, `${fixture.name} traits`)).toEqual([fixture.value]);
    });

    it(`rejects a malformed ${fixture.name} form`, () => {
      const malformed = { ...fixture.value, ...fixture.malformed } as unknown as MonsterTrait;
      expect(() => decodeVocabulary({ traits: [malformed] })).toThrow(fixture.error);
    });
  }

  const bonusActionCases = [
    {
      name: 'humanoid retained-statistics Shape-Shift',
      sourceText: 'Its game statistics, other than its size, are the same in each form.',
      value: {
        kind: 'shape_shift_retained_statistics',
        form: { kind: 'humanoid', sizes: ['Medium', 'Small'], retainedStatistics: 'all_except_size' },
        canReturnToTrueForm: true, equipmentTransforms: false, ...unavailable(18336, 18343),
      } satisfies MonsterBonusAction,
      malformed: { form: { kind: 'humanoid', sizes: ['Medium'], retainedStatistics: 'all_except_size' } },
      error: /Shape-Shift sizes must be/,
    },
    {
      name: 'object retained-statistics Shape-Shift',
      sourceText: 'The mimic shape-shifts to resemble a Medium or Small object while retaining its game statistics.',
      value: {
        kind: 'shape_shift_retained_statistics',
        form: { kind: 'object', sizes: ['Medium', 'Small'], retainedStatistics: 'all' },
        canReturnToTrueForm: true, equipmentTransforms: false, ...unavailable(20247, 20250),
      } satisfies MonsterBonusAction,
      malformed: { form: { kind: 'object', sizes: ['Medium', 'Small'], retainedStatistics: 'all_except_size' } },
      error: /Object Shape-Shift statistics must be "all"/,
    },
    {
      name: 'Swoop',
      sourceText: 'the roc flies up to half its Fly Speed without provoking Opportunity Attacks and drops that creature.',
      value: {
        kind: 'swoop', recharge: { kind: 'recharge_roll', dieSides: 6, minimumRoll: 5 },
        requires: 'creature_grappled_by_monster',
        movement: { kind: 'fly', distance: 'half_speed', provokesOpportunityAttacks: false },
        releases: 'selected_grappled_creature', ...unavailable(21023, 21027),
      } satisfies MonsterBonusAction,
      malformed: { recharge: { kind: 'recharge_roll', dieSides: 6, minimumRoll: 4 } },
      error: /Swoop recharge minimum must be 5/,
    },
    {
      name: 'Consume Life',
      sourceText: 'Failure: The target dies, and the wisp regains 10 (3d6) Hit Points.',
      value: {
        kind: 'consume_life', savingThrow: { ability: 'constitution', dc: 10 },
        target: { kind: 'visible_living_creature', rangeFeet: 5, requiredHitPoints: 0 },
        failure: { targetDies: true, healing: { average: 10, dice: { count: 3, sides: 6, modifier: 0 } } },
        success: { kind: 'none' }, ...unavailable(22535, 22539),
      } satisfies MonsterBonusAction,
      malformed: { target: { kind: 'visible_living_creature', rangeFeet: 5, requiredHitPoints: 1 } },
      error: /Consume Life target Hit Points must be 0/,
    },
    {
      name: 'Vanish',
      sourceText: 'The wisp and its light have the Invisible condition until the wisp’s Concentration ends on this effect.',
      value: {
        kind: 'vanish', appliesInvisibleTo: ['monster', 'monster_light'], duration: 'until_concentration_ends',
        endsEarlyImmediatelyAfter: ['attack_roll', 'consume_life'], ...unavailable(22539, 22544),
      } satisfies MonsterBonusAction,
      malformed: { endsEarlyImmediatelyAfter: ['attack_roll'] },
      error: /Vanish early endings must be/,
    },
  ] as const;

  for (const fixture of bonusActionCases) {
    it(`decodes the hand-authored ${fixture.name} SRD form`, () => {
      expect(fixture.sourceText).not.toHaveLength(0);
      const decoded = decodeVocabulary({ bonusActions: [fixture.value] });
      expect(required(decoded.sourceDetails.bonusActions, `${fixture.name} bonus actions`)).toEqual([fixture.value]);
    });

    it(`rejects a malformed ${fixture.name} form`, () => {
      const malformed = { ...fixture.value, ...fixture.malformed } as unknown as MonsterBonusAction;
      expect(() => decodeVocabulary({ bonusActions: [malformed] })).toThrow(fixture.error);
    });
  }

  const baseAttack: MonsterAttackAction = {
    kind: 'attack', id: 'test-attack', name: 'Test Attack', attackBonus: 5,
    delivery: { kind: 'melee', reachFeet: 5 },
    damage: [{ average: 7, dice: { count: 1, sides: 8, modifier: 3 }, type: 'Piercing', trigger: { kind: 'always' } }],
    attackRollAdvantage: null, onHit: [],
  };
  const attackMechanicCases = [
    {
      name: 'first-round attack advantage',
      sourceText: 'Slam. Melee Attack Roll: +6 (with Advantage during the first round of each combat)',
      value: { kind: 'attack_roll_advantage_window', window: 'first_round_of_each_combat', ...unavailable(18322, 18323) } satisfies MonsterAttackMechanic,
      malformed: { window: 'second_round' }, error: /advantage window must be "first_round_of_each_combat"/,
    },
    {
      name: 'armor corrosion',
      sourceText: 'Nonmagical armor worn by the target takes a −1 penalty to the AC it offers.',
      value: {
        kind: 'equipment_corrosion', equipment: 'nonmagical_armor', trigger: 'after_target_takes_damage',
        cumulativeArmorClassPenalty: -1, destroyedAtArmorClass: 10, repair: { spell: 'mending', removesAllPenalty: true },
        ...unavailable(17291, 17297),
      } satisfies MonsterAttackMechanic,
      malformed: { destroyedAtArmorClass: 11 }, error: /destruction Armor Class must be 10/,
    },
    {
      name: 'conditional Bite damage replacement',
      sourceText: '12 (2d8 + 3) Piercing damage if the target is Grappled by the mimic',
      value: {
        kind: 'conditional_damage_replacement', condition: 'target_grappled_by_attacker', replacesDamageType: 'Piercing',
        replacement: { average: 12, dice: { count: 2, sides: 8, modifier: 3 }, type: 'Piercing', trigger: { kind: 'always' } },
        ...unavailable(20231, 20235),
      } satisfies MonsterAttackMechanic,
      malformed: { replacesDamageType: 'Acid' }, error: /replaced damage type must be "Piercing"/,
    },
    {
      name: 'Pseudopod escape disadvantage',
      sourceText: 'Ability checks made to escape this grapple have Disadvantage.',
      value: {
        kind: 'grapple_escape_disadvantage', appliesToCondition: 'Grappled', appliesToEscapeDc: 13,
        ...unavailable(20236, 20243),
      } satisfies MonsterAttackMechanic,
      malformed: { appliesToEscapeDc: 12 }, error: /escape DC must be 13/,
    },
    {
      name: 'Proboscis attachment',
      sourceText: 'While attached, the stirge can’t make Proboscis attacks, and the target takes 5 (2d4) Necrotic damage at the start of each of the stirge’s turns.',
      value: {
        kind: 'attachment', targetRelation: 'attached_to_target', blocksActionIdWhileAttached: 'proboscis',
        recurringDamage: { average: 5, dice: { count: 2, sides: 4, modifier: 0 }, type: 'Necrotic', trigger: { kind: 'always' } },
        recurringDamageTiming: 'start_of_monster_turn', selfDetachMovementFeet: 5,
        otherDetach: { action: true, rangeFeet: 5, actors: ['target', 'other_creature'] }, ...unavailable(21684, 21693),
      } satisfies MonsterAttackMechanic,
      malformed: { selfDetachMovementFeet: 10 }, error: /self-detach movement must be 5/,
    },
  ] as const;

  for (const fixture of attackMechanicCases) {
    it(`decodes the hand-authored ${fixture.name} SRD form`, () => {
      expect(fixture.sourceText).not.toHaveLength(0);
      const action = { ...baseAttack, mechanics: [fixture.value], execution: { kind: 'absent' as const, note: 'Complete execution unavailable.' } };
      expect(required(decodeVocabulary({ actions: [action] }).sourceDetails.actions, 'actions')).toEqual([action]);
    });

    it(`rejects malformed ${fixture.name}`, () => {
      const mechanic = { ...fixture.value, ...fixture.malformed } as unknown as MonsterAttackMechanic;
      const action = { ...baseAttack, mechanics: [mechanic], execution: { kind: 'absent' as const, note: 'Complete execution unavailable.' } };
      expect(() => decodeVocabulary({ actions: [action] })).toThrow(fixture.error);
    });
  }

  const baseSave: MonsterSavingThrowAction = {
    kind: 'saving_throw', id: 'test-save', name: 'Test Save', savingThrow: { ability: 'wisdom', dc: 13 },
    target: { rangeFeet: 60, maximumSize: null, excludedKinds: [] },
    failure: { damage: [], effects: [] }, success: { kind: 'none' },
  };
  const savingThrowMechanicCases = [
    {
      name: 'Whirlwind recharge and push', sourceText: 'Whirlwind (Recharge 4–6).',
      value: {
        kind: 'whirlwind', recharge: { dieSides: 6, minimumRoll: 4 }, targetLocation: 'in_monster_space',
        failurePush: { maximumFeet: 20, direction: 'straight_away_from_monster' }, ...unavailable(16824, 16826),
      } satisfies MonsterSavingThrowMechanic,
      malformed: { failurePush: { maximumFeet: 25, direction: 'straight_away_from_monster' } }, error: /push distance must be 20/,
    },
    {
      name: 'Unsettling Visage save lifecycle', sourceText: 'After 1 minute, it succeeds automatically.',
      value: {
        kind: 'unsettling_visage', recharge: { dieSides: 6, minimumRoll: 6 },
        targetArea: { kind: 'emanation', feet: 15, requiresSightOfMonster: true },
        repeatSave: { timing: 'end_of_each_target_turn', endsOnSuccess: true }, automaticSuccessAfterMinutes: 1,
        ...unavailable(18325, 18336),
      } satisfies MonsterSavingThrowMechanic,
      malformed: { automaticSuccessAfterMinutes: 2 }, error: /automatic success must be 1/,
    },
    {
      name: 'Horrific Visage success immunity', sourceText: 'Success: The target is immune to this ghost’s Horrific Visage for 24 hours.',
      value: {
        kind: 'horrific_visage', targetArea: { kind: 'cone', feet: 60, requiresSightOfMonster: true },
        successImmunity: { action: 'horrific_visage', sourceMonsterOnly: true, hours: 24 }, ...unavailable(18830, 18836),
      } satisfies MonsterSavingThrowMechanic,
      malformed: { successImmunity: { action: 'horrific_visage', sourceMonsterOnly: true, hours: 12 } }, error: /immunity duration must be 24/,
    },
    {
      name: 'Possession state transfer', sourceText: 'The ghost now controls the body, but the target retains awareness.',
      value: {
        kind: 'possession', recharge: { dieSides: 6, minimumRoll: 6 }, targetKind: 'Humanoid', requiresVisibleTarget: true,
        failure: {
          ghostDisappears: true, targetCondition: 'Incapacitated', targetLosesBodyControl: true,
          targetRetainsAwareness: true, ghostControlsBody: true,
          ghostTargetability: 'only_effects_specifically_targeting_undead', retainedGhostStatistics: true,
          borrowedTargetStatistics: ['speed', 'strength_modifier', 'dexterity_modifier', 'constitution_modifier'],
        },
        endsWhen: ['body_zero_hit_points', 'ghost_bonus_action'],
        onEnd: { ghostAppearsWithinFeet: 5, space: 'unoccupied', targetImmunityHours: 24 }, successImmunityHours: 24,
        ...unavailable(18836, 18858),
      } satisfies MonsterSavingThrowMechanic,
      malformed: { successImmunityHours: 12 }, error: /success immunity must be 24/,
    },
  ] as const;

  for (const fixture of savingThrowMechanicCases) {
    it(`decodes the hand-authored ${fixture.name} SRD form`, () => {
      expect(fixture.sourceText).not.toHaveLength(0);
      const action = { ...baseSave, mechanics: [fixture.value], execution: { kind: 'absent' as const, note: 'Complete execution unavailable.' } };
      expect(required(decodeVocabulary({ actions: [action] }).sourceDetails.actions, 'actions')).toEqual([action]);
    });

    it(`rejects malformed ${fixture.name}`, () => {
      const mechanic = { ...fixture.value, ...fixture.malformed } as unknown as MonsterSavingThrowMechanic;
      const action = { ...baseSave, mechanics: [mechanic], execution: { kind: 'absent' as const, note: 'Complete execution unavailable.' } };
      expect(() => decodeVocabulary({ actions: [action] })).toThrow(fixture.error);
    });
  }

  it('decodes and rejects malformed coupled Multiattack vocabulary', () => {
    const sourceText = 'The doppelganger makes two Slam attacks and uses Unsettling Visage if available.';
    const extra = { ...baseSave, id: 'unsettling-visage' };
    const valid: MonsterAction = {
      kind: 'multiattack', id: 'multiattack', count: 1, actionIds: ['test-attack'], combination: 'fixed',
      mechanics: [{ kind: 'also_uses_action_if_available', actionId: 'unsettling-visage', ...unavailable(18320, 18322) }],
      execution: { kind: 'absent', note: 'Complete execution unavailable.' },
    };
    expect(sourceText).not.toHaveLength(0);
    expect(required(decodeVocabulary({ actions: [baseAttack, extra, valid] }).sourceDetails.actions, 'Multiattack actions')[2]).toEqual(valid);
    const malformed = { ...valid, mechanics: [{ kind: 'also_uses_action_if_available', actionId: '', ...unavailable(18320, 18322) }] } as unknown as MonsterAction;
    expect(() => decodeVocabulary({ actions: [baseAttack, extra, malformed] })).toThrow(/additional action id must be a positive safe integer|trimmed and non-empty/);
  });

  it('decodes and rejects malformed Ghost Etherealness vocabulary', () => {
    const sourceText = 'The ghost is visible on the Material Plane while on the Border Ethereal and vice versa, but it can’t affect or be affected by anything on the other plane.';
    const action: MonsterAction = {
      kind: 'spellcasting', id: 'etherealness', actionEconomy: 'action', ability: 'charisma',
      saveDc: { kind: 'absent', note: 'No save.' }, spellAttackBonus: { kind: 'absent', note: 'No attack.' },
      spells: [{ id: 'etherealness', availability: 'at_will', manifestStatus: 'not_in_manifest' }],
      mechanics: [{ kind: 'ghost_etherealness', crossPlaneVisibility: 'material_and_border_ethereal_mutual', crossPlaneInteraction: 'neither_direction', ...unavailable(18825, 18830) }],
      execution: { kind: 'absent', note: 'Complete execution unavailable.' },
    };
    expect(sourceText).not.toHaveLength(0);
    expect(required(decodeVocabulary({ actions: [action] }).sourceDetails.actions, 'Etherealness actions')).toEqual([action]);
    const malformed = { ...action, mechanics: [{ kind: 'ghost_etherealness', crossPlaneVisibility: 'one_way', crossPlaneInteraction: 'neither_direction', ...unavailable(18825, 18830) }] } as unknown as MonsterAction;
    expect(() => decodeVocabulary({ actions: [malformed] })).toThrow(/visibility must be "material_and_border_ethereal_mutual"/);
  });

  it('decodes the hand-authored Split SRD reaction', () => {
    const sourceText = 'The pudding splits into two new Black Puddings. Each new pudding is one size smaller than the original pudding and acts on its Initiative.';
    const split = {
      kind: 'split', requirements: { sizes: ['Large', 'Medium'], minimumHitPoints: 10 },
      triggers: [{ kind: 'becomes_bloodied' }, { kind: 'takes_damage', types: ['Lightning', 'Slashing'] }],
      replacement: {
        count: 2, statblock: 'same_as_original', size: 'one_smaller_than_original',
        initiative: 'original_initiative', hitPoints: { kind: 'divide_original_evenly', rounding: 'down' },
      },
      ...unavailable(17298, 17309),
    } satisfies MonsterReaction;
    expect(sourceText).not.toHaveLength(0);
    expect(required(decodeVocabulary({ reactions: [split] }).sourceDetails.reactions, 'Split reactions')).toEqual([split]);
  });

  it('rejects a malformed Split SRD reaction', () => {
    const malformed = {
      kind: 'split', requirements: { sizes: ['Large', 'Medium'], minimumHitPoints: 9 },
      triggers: [{ kind: 'becomes_bloodied' }, { kind: 'takes_damage', types: ['Lightning', 'Slashing'] }],
      replacement: { count: 2, statblock: 'same_as_original', size: 'one_smaller_than_original', initiative: 'original_initiative', hitPoints: { kind: 'divide_original_evenly', rounding: 'down' } },
      ...unavailable(17298, 17309),
    } as unknown as MonsterReaction;
    expect(() => decodeVocabulary({ reactions: [malformed] })).toThrow(/Split minimum Hit Points must be 10/);
  });

  it('decodes CR 11 (XP 7,200; PB +4) from the hand-authored Roc SRD line', () => {
    const sourceText = 'CR 11 (XP 7,200; PB +4)';
    expect(sourceText).toBe('CR 11 (XP 7,200; PB +4)');
    expect(required(decodeVocabulary({ challenge: { rating: 11, experiencePoints: 7_200, proficiencyBonus: 4 } }).sourceDetails.challenge, 'challenge')).toEqual({
      rating: 11, experiencePoints: 7_200, proficiencyBonus: 4,
    });
  });

  it('rejects malformed CR 11 XP and proficiency tuples', () => {
    expect(() => decodeVocabulary({ challenge: { rating: 11, experiencePoints: 2_300, proficiencyBonus: 4 } })).toThrow(/XP must match/);
    expect(() => decodeVocabulary({ challenge: { rating: 11, experiencePoints: 7_200, proficiencyBonus: 3 } })).toThrow(/proficiency bonus must match/);
  });

  it('converts every parked SRD vocabulary entry without claiming reducer support', () => {
    expect(required(AIR_ELEMENTAL.sourceDetails.traits, 'Air Elemental traits').map(({ kind }) => kind)).toEqual(['air_form']);
    expect(required(BLACK_PUDDING.sourceDetails.reactions, 'Black Pudding reactions').map(({ kind }) => kind)).toEqual(['split']);
    expect(required(DOPPELGANGER.sourceDetails.bonusActions, 'Doppelganger bonus actions').map(({ kind }) => kind)).toEqual(['shape_shift_retained_statistics']);
    expect(required(EARTH_ELEMENTAL.sourceDetails.traits, 'Earth Elemental traits').map(({ kind }) => kind)).toEqual(['earth_glide', 'siege_monster']);
    expect(required(MIMIC.sourceDetails.traits, 'Mimic traits').map(({ kind }) => kind)).toEqual(['adhesive']);
    expect(required(MIMIC.sourceDetails.bonusActions, 'Mimic bonus actions').map(({ kind }) => kind)).toEqual(['shape_shift_retained_statistics']);
    expect(required(ROC.sourceDetails.bonusActions, 'Roc bonus actions').map(({ kind }) => kind)).toEqual(['swoop']);
    expect(required(WILL_O_WISP.sourceDetails.bonusActions, 'Will-o’-Wisp bonus actions').map(({ kind }) => kind)).toEqual(['consume_life', 'vanish']);
    expect(ASTRAL_TOWER_UNSUPPORTED_ENTRIES).toEqual([]);
    for (const statblock of [AIR_ELEMENTAL, BLACK_PUDDING, DOPPELGANGER, GHOST, MIMIC, STIRGE]) {
      const actions = required(statblock.sourceDetails.actions, `${statblock.name} actions`);
      for (const action of actions.filter((candidate) => candidate.mechanics !== undefined)) {
        expect(action.execution?.kind).toBe('absent');
        expect(action.execution?.note.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('Astral Tower clean-room homebrew statblocks', () => {
  const homebrew = [ASTRALDENDON, ASTRALMYCON, ANIMATED_BROOM, ANIMATED_STATUE, FAMILIAR] as const;

  it('marks every clean-room block with a homebrew id and original-homebrew provenance', () => {
    for (const statblock of homebrew) {
      expect(statblock.id).toMatch(/^homebrew:escape-the-astral-tower\//);
      expect(statblock.provenance.kind).toBe('original_homebrew');
      if (statblock.provenance.kind !== 'original_homebrew') throw new Error(`${statblock.name} lost clean-room provenance.`);
      expect(statblock.provenance.designNote).toContain('original clean-room homebrew');
      expect(statblock.provenance.designNote).toContain('numeric balance skeleton only');
    }
  });

  it('keeps each authored AC, HP, and primary DPR inside its same-CR SRD skeleton bounds', () => {
    for (const statblock of homebrew) {
      if (statblock.provenance.kind !== 'original_homebrew') throw new Error(`${statblock.name} lost clean-room provenance.`);
      const anchor = statblock.provenance.comparableAnchors[0];
      if (anchor === undefined) throw new Error(`${statblock.name} has no numeric skeleton.`);
      const primary = required(statblock.sourceDetails.actions, `${statblock.name} actions`).find((action) => action.kind === 'attack');
      if (primary?.kind !== 'attack') throw new Error(`${statblock.name} has no primary attack.`);
      const attacksPerAction = statblock.attacksPerAction;
      const primaryDpr = primary.damage.reduce((total, term) => total + term.average, 0) * attacksPerAction;
      expect(statblock.armorClass, `${statblock.name} AC`).toBeGreaterThanOrEqual(anchor.allowedArmorClass[0]);
      expect(statblock.armorClass, `${statblock.name} AC`).toBeLessThanOrEqual(anchor.allowedArmorClass[1]);
      expect(statblock.hitPointMaximum, `${statblock.name} HP`).toBeGreaterThanOrEqual(anchor.allowedHitPoints[0]);
      expect(statblock.hitPointMaximum, `${statblock.name} HP`).toBeLessThanOrEqual(anchor.allowedHitPoints[1]);
      expect(primaryDpr, `${statblock.name} DPR`).toBeGreaterThanOrEqual(anchor.allowedDpr[0]);
      expect(primaryDpr, `${statblock.name} DPR`).toBeLessThanOrEqual(anchor.allowedDpr[1]);
    }
  });

  it('matches the mechanical roles visible in the imported fixtures', () => {
    expect(required(ASTRALDENDON.sourceDetails.challenge, 'Astraldendon challenge').rating).toBe('1/8');
    expect(required(ASTRALMYCON.sourceDetails.challenge, 'Astralmycon challenge').rating).toBe('1/8');
    expect(required(ANIMATED_BROOM.sourceDetails.movement, 'Animated Broom movement')).toContainEqual({ kind: 'fly', feet: 40, hover: true });
    expect(ANIMATED_STATUE.hitPointMaximum).toBeGreaterThanOrEqual(40);
    expect(FAMILIAR.hitPointMaximum).toBeLessThanOrEqual(12);
  });
});
