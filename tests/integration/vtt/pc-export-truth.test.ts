import { afterEach, describe, expect, it } from 'vitest';
import {
  applyGuidedOrigin,
  createGuidedCharacter,
  fillGuidedSkillGrant,
  guidedSkillsStepState,
  listGuidedClassOptions,
  listGuidedOriginOptions,
} from '../../../src/builder/guided-creation';
import { AllocateAbilitiesCommand } from '../../../src/commands/allocate-abilities';
import { CharacterCommandExecutor } from '../../../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { createEncounter, detectCombatant, reduceEncounter } from '../../../src/combat/encounter';
import type { DatabaseContext } from '../../../src/db/database';
import type { Skill } from '../../../src/domain/enums';
import type { WeaponFields } from '../../../src/domain/command-contracts';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import {
  loadedPartyAttackCommand,
  loadExternalPartyPack,
  type ExternalPartyPackMember,
  type LoadedPartyMember,
} from '../../../src/vtt/party-pack';
import { StoredCharacterPartyPackExporter } from '../../../src/vtt/stored-character-party-member';
import { expectOkOutcome } from '../../helpers/outcome';
import { createSeededRpcHarness, type RpcHarness } from '../../helpers/rpc-harness';
import { monsterProfile, placedToken } from '../../unit/combat/fixtures';

/**
 * PC-EXPORT-TRUTH (D918): a character built in this application must reach
 * combat with the numbers its own sheet states. Every expectation here is
 * derived by hand from the SRD text and the character's recorded choices,
 * never read back from the exporter.
 *
 * The one ability array every character below uses — SRD standard array
 * (15, 14, 13, 12, 10, 8), docs/srd/source/ability-score-generation.txt:20:
 * Str 15 (+2), Dex 13 (+1), Con 12 (+1), Int 10 (+0), Wis 14 (+2), Cha 8 (−1).
 * Level 1, so the Proficiency Bonus is +2 (docs/srd/source/skills-table.txt,
 * "Up to 4 +2").
 */
const SCORES = {
  strength: 15,
  dexterity: 13,
  constitution: 12,
  intelligence: 10,
  wisdom: 14,
  charisma: 8,
} as const;

/**
 * Each skill's ability, docs/srd/source/skills-table.txt:76-93, applied to the
 * modifiers above with no proficiency: Dex +1, Wis +2, Int +0, Str +2, Cha −1.
 */
const UNTRAINED_SKILLS: Readonly<Record<Skill, number>> = {
  acrobatics: 1,
  animal_handling: 2,
  arcana: 0,
  athletics: 2,
  deception: -1,
  history: 0,
  insight: 2,
  intimidation: -1,
  investigation: 0,
  medicine: 2,
  nature: 0,
  perception: 2,
  performance: -1,
  persuasion: -1,
  religion: 0,
  sleight_of_hand: 1,
  stealth: 1,
  survival: 2,
};

/**
 * The Elf's Keen Senses grants Perception here
 * (species-descriptions.txt:115): Wis +2 plus the +2 Proficiency Bonus.
 */
const KEEN_SENSES_PERCEPTION_SKILLS: Readonly<Record<Skill, number>> = {
  ...UNTRAINED_SKILLS,
  perception: 4,
};

const GREATSWORD: WeaponFields = {
  name: 'Greatsword', proficiency_category: 'martial', attack_kind: 'melee',
  damage: { kind: 'dice', dice: '2d6' }, damage_type: 'Slashing',
  versatile_damage: { kind: 'not_applicable' }, finesse: false,
  heavy: true, light: false, loading: false, reach: false, thrown: false,
  two_handed: true, ammunition: false, ammunition_kind: null,
  range: { kind: 'none' }, mastery_property: 'Graze', other_properties: null,
  notes: 'Greatsword: 2d6 Slashing, Heavy, Two-Handed, mastery Graze (docs/srd/full/srd-5.2.1.txt:5510).',
};

const BATTLEAXE: WeaponFields = {
  name: 'Battleaxe', proficiency_category: 'martial', attack_kind: 'melee',
  damage: { kind: 'dice', dice: '1d8' }, damage_type: 'Slashing',
  versatile_damage: { kind: 'dice', dice: '1d10' }, finesse: false,
  heavy: false, light: false, loading: false, reach: false, thrown: false,
  two_handed: false, ammunition: false, ammunition_kind: null,
  range: { kind: 'none' }, mastery_property: 'Topple', other_properties: null,
  notes: 'Battleaxe: 1d8 Slashing, Versatile (1d10), mastery Topple (docs/srd/full/srd-5.2.1.txt:5506).',
};

let harness: RpcHarness | null = null;
let operation = 0;

afterEach(() => {
  harness?.close();
  harness = null;
});

function nextOperation(): string {
  operation += 1;
  return `00000000-0000-4000-8000-${String(operation).padStart(12, '0')}`;
}

const integrity = new CharacterCommandIntegrity('pc-export-truth-test-key');

function revision(db: DatabaseContext, characterId: number): number {
  const value = db.scalar<number>('SELECT revision FROM characters WHERE id = ?', [characterId]);
  if (value === null) throw new Error(`No character ${String(characterId)}.`);
  return Number(value);
}

function builtFighter(db: DatabaseContext, name: string, species: string): number {
  const fighter = listGuidedClassOptions(db).find((option) => option.name === 'Fighter');
  if (fighter === undefined) throw new Error('The bundled Fighter is missing.');
  const characterId = createGuidedCharacter(
    db,
    { name, class_content_key: fighter.content_key },
    integrity,
  ).id;
  expectOkOutcome(new AllocateAbilitiesCommand(db, {
    type: 'allocate_abilities',
    method: 'standard_array',
    scores: SCORES,
  }).apply(characterId));
  const option = listGuidedOriginOptions(db, 'species').find((candidate) => candidate.name === species);
  if (option === undefined) throw new Error(`The bundled ${species} is missing.`);
  applyGuidedOrigin(db, { character_id: characterId, kind: 'species', content_key: option.content_key });
  return characterId;
}

/** A thrown refusal is folded into a value, so a red run fails on an assertion. */
async function chooseSpeciesOption(
  db: DatabaseContext,
  characterId: number,
  chosenOption: string,
  spellcastingAbility: 'wisdom' | 'charisma' | null,
): Promise<{ readonly kind: string }> {
  try {
    return await new CharacterCommandExecutor(db, integrity).execute({
      character_id: characterId,
      operation_uuid: nextOperation(),
      expected_revision: revision(db, characterId),
      command: {
        type: 'choose_species_lineage',
        chosen_option: chosenOption,
        ...(spellcastingAbility === null ? {} : { spellcasting_ability: spellcastingAbility }),
      },
    });
  } catch (error: unknown) {
    return { kind: `threw: ${error instanceof Error ? error.message : String(error)}` };
  }
}

async function fillKeenSenses(db: DatabaseContext, characterId: number, skill: Skill): Promise<void> {
  const state = guidedSkillsStepState(db, characterId);
  const grant = state.species_choices.find((choice) => choice.available.includes(skill));
  if (grant === undefined) throw new Error('The Elf has no Keen Senses grant offering that skill.');
  expectOkOutcome(await fillGuidedSkillGrant(db, {
    character_id: characterId,
    grant_id: grant.grant_id,
    skill,
    operation_uuid: nextOperation(),
    expected_revision: state.revision,
  }, integrity));
}

async function addWeapon(
  db: DatabaseContext,
  characterId: number,
  weapon: WeaponFields,
  masterySelected: boolean,
): Promise<void> {
  expectOkOutcome(await new CharacterCommandExecutor(db, integrity).execute({
    character_id: characterId,
    operation_uuid: nextOperation(),
    expected_revision: revision(db, characterId),
    command: { type: 'add_weapon', weapon, mastery_selected: masterySelected },
  }));
}

function exported(db: DatabaseContext, characterId: number) {
  return new StoredCharacterPartyPackExporter(db).export(characterId);
}

function exportedMember(db: DatabaseContext, characterId: number): ExternalPartyPackMember {
  const result = exported(db, characterId);
  expect(result).toMatchObject({ status: 'exported' });
  if (result.status !== 'exported') throw new Error('Export refused.');
  return result.member;
}

function loadedParty(...members: readonly ExternalPartyPackMember[]): readonly LoadedPartyMember[] {
  const loaded = loadExternalPartyPack({
    schemaVersion: 2,
    partyId: 'party:pc-export-truth',
    allowPartial: false,
    members,
  });
  expect(loaded).toMatchObject({ status: 'loaded', gaps: [] });
  if (loaded.status !== 'loaded') throw new Error('The exported party did not load.');
  return loaded.party.members;
}

function statedField(member: ExternalPartyPackMember, field: string): unknown {
  return (member as unknown as Readonly<Record<string, unknown>>)[field];
}

describe('PC-EXPORT-TRUTH: a built character reaches combat with its sheet', () => {
  it('pc_skills_exported: skill bonuses and passive Perception are the sheet\'s, not +0 and 10', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const elf = builtFighter(db, 'Keen Elf', 'Elf');
    await fillKeenSenses(db, elf, 'perception');
    expect(await chooseSpeciesOption(db, elf, 'Drow', 'wisdom')).toMatchObject({ kind: 'ok' });
    const dwarf = builtFighter(db, 'Plain Dwarf', 'Dwarf');
    const human = builtFighter(db, 'Plain Human', 'Human');

    // The sheet already states the SRD formula (sheet-math.txt: Passive
    // Perception = 10 + Wisdom (Perception) check modifier): 10 + 4.
    expect(new CharacterSheetBuilder(db).build(elf).passive_perception.value).toBe(14);

    const elfMember = exportedMember(db, elf);
    const dwarfMember = exportedMember(db, dwarf);
    expect(statedField(elfMember, 'skillBonuses')).toEqual(KEEN_SENSES_PERCEPTION_SKILLS);
    expect(statedField(dwarfMember, 'skillBonuses')).toEqual(UNTRAINED_SKILLS);

    const [loadedElf, loadedDwarf, loadedHuman] = loadedParty(elfMember, dwarfMember, exportedMember(db, human));
    expect(loadedElf?.profile.rules.skillBonuses).toEqual(KEEN_SENSES_PERCEPTION_SKILLS);
    expect(loadedElf?.profile.rules.passivePerception).toBe(14);
    // Untrained Perception is still the Wisdom modifier: 10 + 2, not 10.
    expect(loadedDwarf?.profile.rules.passivePerception).toBe(12);
    expect(loadedHuman?.profile.rules.skillBonuses?.stealth).toBe(1);
  });

  it('pc_senses_exported: species Darkvision reaches the engine with its range', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const drow = builtFighter(db, 'Drow Sight', 'Elf');
    expect(await chooseSpeciesOption(db, drow, 'Drow', 'charisma')).toMatchObject({ kind: 'ok' });
    const dwarf = builtFighter(db, 'Dwarf Sight', 'Dwarf');
    const human = builtFighter(db, 'Human Sight', 'Human');

    // species-descriptions.txt: the Drow lineage "The range of your Darkvision
    // increases to 120 feet" (:100); the Dwarf's Darkvision is 120 feet
    // (:53-55); the Human prints no Darkvision trait.
    const drowSenses = [{ kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 120 }];
    const dwarfSenses = [{ kind: 'normal_sight' }, { kind: 'darkvision', rangeFeet: 120 }];
    const humanSenses = [{ kind: 'normal_sight' }];
    const drowMember = exportedMember(db, drow);
    const dwarfMember = exportedMember(db, dwarf);
    const humanMember = exportedMember(db, human);
    expect(statedField(drowMember, 'senses')).toEqual(drowSenses);
    expect(statedField(dwarfMember, 'senses')).toEqual(dwarfSenses);
    expect(statedField(humanMember, 'senses')).toEqual(humanSenses);

    const [loadedDrow, loadedDwarf, loadedHuman] = loadedParty(drowMember, dwarfMember, humanMember);
    expect(loadedDrow?.profile.rules.senses).toEqual(drowSenses);
    expect(loadedDwarf?.profile.rules.senses).toEqual(dwarfSenses);
    expect(loadedHuman?.profile.rules.senses).toEqual(humanSenses);

    // Darkvision (docs/srd/full/srd-5.2.1.txt:11582-11588): within its range
    // the observer sees in Darkness. A target 100 feet away — beyond 60,
    // within 120 — stands in Darkness.
    const detection = (observer: LoadedPartyMember | undefined) => {
      if (observer === undefined) throw new Error('A loaded observer is missing.');
      const target = monsterProfile('pc-export-truth-target');
      const state = reduceEncounter(createEncounter({
        bounds: { columns: 25, rows: 3 },
        combatants: [observer.profile, target],
        tokens: [placedToken(observer.profile, 1, 1), placedToken(target, 21, 1)],
        environment: {
          narrowOpeningRegions: [],
          lightRegions: [{ id: 'darkness', cells: [{ column: 21, row: 1 }], level: 'darkness' }],
          obscurementRegions: [], difficultTerrainRegions: [], movementRegions: [],
        },
      }), { type: 'roll_initiative' }, () => 0.5).state;
      return detectCombatant(state, observer.profile.id, target.id);
    };
    expect(detection(loadedDrow)).toEqual({ kind: 'seen', sense: 'darkvision' });
    expect(detection(loadedHuman)).toEqual({ kind: 'undetected', reason: 'darkness' });
  });

  it('dragonborn_exported: a chosen Draconic Ancestry exports its resistance', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const dragonborn = builtFighter(db, 'Red Dragonborn', 'Dragonborn');
    const fillerOne = builtFighter(db, 'Filler One', 'Human');
    const fillerTwo = builtFighter(db, 'Filler Two', 'Human');

    // Unchosen, the resistance type is genuinely unknown and the export says so.
    expect(exported(db, dragonborn)).toEqual({
      status: 'refused',
      refusal: {
        kind: 'stored_character_party_pack_refusal',
        field: 'passives.damageResponses',
        detail: 'A damage-resistance type remains unchosen.',
      },
    });

    // Draconic Ancestors table, species-descriptions.txt:63-71: Red → Fire.
    // Draconic Ancestry is not a spellcasting choice, so no ability is sent.
    expect(await chooseSpeciesOption(db, dragonborn, 'Red', null)).toMatchObject({ kind: 'ok' });
    const sheet = new CharacterSheetBuilder(db).build(dragonborn);
    expect(sheet.damage_resistances).toEqual(['Fire']);
    expect(sheet.unchosen_damage_resistances).toEqual([]);

    const member = exportedMember(db, dragonborn);
    expect(statedField(member, 'passives')).toEqual({
      damageResponses: [{ damageTypeId: 'Fire', response: 'resistant' }],
    });
    // "Darkvision. You have Darkvision with a range of 60 feet." (species-descriptions.txt:35-36)
    expect(statedField(member, 'senses')).toEqual([
      { kind: 'normal_sight' },
      { kind: 'darkvision', rangeFeet: 60 },
    ]);
    const [loaded] = loadedParty(member, exportedMember(db, fillerOne), exportedMember(db, fillerTwo));
    expect(loaded?.profile.rules.damageResponses).toEqual([{ type: 'Fire', response: 'resistant' }]);
  });

  it('ability_matches_choice: the lineage command refuses an ability the choice does not ask for, and a missing one it does', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const dragonborn = builtFighter(db, 'Ability Dragonborn', 'Dragonborn');
    const elf = builtFighter(db, 'Abilityless Elf', 'Elf');
    const refusedWith = { kind: 'refused', refusal: { reason: 'invalid_spellcasting_ability' } };
    expect(await chooseSpeciesOption(db, dragonborn, 'Red', 'charisma')).toMatchObject(refusedWith);
    expect(await chooseSpeciesOption(db, elf, 'Drow', null)).toMatchObject(refusedWith);
    expect(new CharacterSheetBuilder(db).build(dragonborn).unchosen_damage_resistances)
      .toEqual(['Damage Resistance']);
  });

  it('unsourced_species_refused: a hand-entered species states no senses, so the export refuses rather than guess', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const fighter = listGuidedClassOptions(db).find((option) => option.name === 'Fighter');
    if (fighter === undefined) throw new Error('The bundled Fighter is missing.');
    const characterId = createGuidedCharacter(
      db,
      { name: 'Hand Entered', class_content_key: fighter.content_key },
      integrity,
    ).id;
    db.exec(
      `INSERT INTO character_species (character_id, name, creature_type, size, base_speed_feet)
       VALUES (?, 'Human', 'Humanoid', 'Medium', 30)`,
      [characterId],
    );
    expect(exported(db, characterId)).toEqual({
      status: 'refused',
      refusal: {
        kind: 'stored_character_party_pack_refusal',
        field: 'senses.species',
        detail: 'Human is not one catalog species source, so its senses are not recorded.',
      },
    });
  });

  it('tiefling_exported: a chosen Fiendish Legacy resolves the species resistance it names', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const tiefling = builtFighter(db, 'Infernal Tiefling', 'Tiefling');
    const fillerOne = builtFighter(db, 'Filler One', 'Human');
    const fillerTwo = builtFighter(db, 'Filler Two', 'Human');

    // Fiendish Legacies table, species-descriptions.txt:233-238: Infernal →
    // "You have Resistance to Fire damage." ONE resistance, whose type the
    // legacy names; the Fiendish Legacy trait does not grant a second one.
    expect(await chooseSpeciesOption(db, tiefling, 'Infernal', 'charisma')).toMatchObject({ kind: 'ok' });
    const sheet = new CharacterSheetBuilder(db).build(tiefling);
    expect(sheet.damage_resistances).toEqual(['Fire']);
    expect(sheet.unchosen_damage_resistances).toEqual([]);

    const member = exportedMember(db, tiefling);
    expect(statedField(member, 'passives')).toEqual({
      damageResponses: [{ damageTypeId: 'Fire', response: 'resistant' }],
    });
    const [loaded] = loadedParty(member, exportedMember(db, fillerOne), exportedMember(db, fillerTwo));
    expect(loaded?.profile.rules.damageResponses).toEqual([{ type: 'Fire', response: 'resistant' }]);
  });

  it('mastery_carried: a selected Graze reaches the loaded attack as sourced, not executed, and never as null', async () => {
    harness = await createSeededRpcHarness([]);
    const db = harness.context.db;
    const fighter = builtFighter(db, 'Mastery Fighter', 'Human');
    await addWeapon(db, fighter, GREATSWORD, true);
    await addWeapon(db, fighter, BATTLEAXE, true);
    const fillerOne = builtFighter(db, 'Filler One', 'Human');
    const fillerTwo = builtFighter(db, 'Filler Two', 'Human');

    const member = exportedMember(db, fighter);
    // Str +2 plus the +2 Proficiency Bonus; Topple's DC is 8 + that ability
    // modifier + the Proficiency Bonus (docs/srd/full/srd-5.2.1.txt:5468-5474).
    expect(member.attacks.map((attack) => ({
      damage: attack.damage,
      attackBonus: attack.attackBonus,
      masteryProperty: attack.masteryProperty,
      masterySaveDc: attack.masterySaveDc,
    }))).toEqual([
      {
        damage: [{ damageTypeId: 'Slashing', count: 2, sides: 6, modifier: 2 }],
        attackBonus: 4,
        masteryProperty: 'Graze',
        masterySaveDc: undefined,
      },
      {
        damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 2 }],
        attackBonus: 4,
        masteryProperty: 'Topple',
        masterySaveDc: 12,
      },
    ]);

    const [loaded] = loadedParty(member, exportedMember(db, fillerOne), exportedMember(db, fillerTwo));
    if (loaded === undefined) throw new Error('The mastery fighter did not load.');
    expect(loaded.attacks.map((attack) => attack.mastery)).toEqual([
      { property: 'Graze', status: 'sourced_not_executed', awaiting: 'weapon_mastery_execution' },
      { property: 'Topple', saveDc: 12 },
    ]);
    const target = monsterProfile('pc-export-truth-mastery-target');
    const [greatsword, battleaxe] = loaded.attacks;
    if (greatsword === undefined || battleaxe === undefined) throw new Error('Loaded attacks are missing.');
    // Graze awaits WEAPON-EXEC: the command carries no rider the engine cannot run.
    expect('weaponMastery' in loadedPartyAttackCommand(loaded, greatsword.attackId, target.id)).toBe(false);
    expect(loadedPartyAttackCommand(loaded, battleaxe.attackId, target.id).weaponMastery)
      .toEqual({ property: 'Topple', saveDc: 12 });
  });

  it('mastery_not_null: every stated mastery the engine cannot run yet loads typed, not null', () => {
    const properties = ['Cleave', 'Graze', 'Nick', 'Push', 'Sap', 'Vex'] as const;
    const member = (index: number) => ({
      combatantId: `combatant:mastery-${String(index)}`,
      tokenId: `token:mastery-${String(index)}`,
      characterId: index,
      classes: [{ classId: 'Fighter', level: 1 }],
      abilities: SCORES,
      armorClass: 11,
      hitPointMaximum: 11,
      walkingSpeedFeet: 30,
      initiativeBonus: 1,
      savingThrowBonuses: { strength: 4, dexterity: 1, constitution: 3, intelligence: 0, wisdom: 2, charisma: -1 },
      attacksPerAction: 1,
      sizeCategory: 'Medium',
      attacks: properties.map((masteryProperty) => ({
        attackId: `attack:${masteryProperty.toLowerCase()}-${String(index)}`,
        kind: 'melee',
        attackBonus: 4,
        criticalFloor: 20,
        reachFeet: 5,
        rangeFeet: 5,
        damage: [{ damageTypeId: 'Slashing', count: 1, sides: 8, modifier: 2 }],
        masteryProperty,
      })),
      startingConditions: [],
    });
    const loaded = loadExternalPartyPack({
      schemaVersion: 2,
      partyId: 'party:mastery-status',
      allowPartial: false,
      members: [member(1), member(2), member(3)],
    });
    expect(loaded).toMatchObject({ status: 'loaded', gaps: [] });
    if (loaded.status !== 'loaded') throw new Error('The mastery pack did not load.');
    expect(loaded.party.members[0]?.attacks.map((attack) => attack.mastery)).toEqual(
      properties.map((property) => ({
        property,
        status: 'sourced_not_executed',
        awaiting: 'weapon_mastery_execution',
      })),
    );
  });
});
