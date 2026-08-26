import type { CommandsClient } from '../commands/client';
import type { CharacterCommandPayload, WeaponFields } from '../domain/command-contracts';
import type { Ability } from '../domain/enums';
import type { CharacterRow } from '../domain/models';
import type { QueriesClient } from '../queries/client';
import type { RpcClient } from '../rpc/client';
import { createCommandsClient } from '../commands/client';
import { createQueriesClient } from '../queries/client';
import { SPELL_MANIFEST } from '../combat/spells/manifest';
import { loadExternalPartyPack, type LoadedExternalPartyPack } from './party-pack';

export const D365_SAMPLE_PARTY_ID = 'party:d365-representative-level-5' as const;

export interface D365SamplePartyBuild {
  readonly role: 'pact_caster' | 'land_druid' | 'martial' | 'prepared_caster' | 'arcane_controller';
  readonly name: string;
  readonly className: 'Warlock' | 'Druid' | 'Fighter' | 'Cleric' | 'Wizard';
  readonly classContentKey: string;
  readonly subclassName: 'Fiend Patron' | 'Circle of the Land' | 'Champion' | 'Life Domain' | 'Evoker';
  readonly subclassContentKey: string;
  readonly speciesName: 'Human';
  readonly speciesContentKey: '2024:species:human';
  readonly backgroundName: 'Acolyte' | 'Sage' | 'Soldier';
  readonly backgroundContentKey: string;
  readonly originFeatContentKey: '2024:feat:alert';
  readonly abilities: Readonly<Record<Ability, number>>;
  readonly levelFourAbility: Ability;
  readonly requiredCombatSpells: readonly ('Eldritch Blast' | 'Burning Hands' | 'Cure Wounds' | 'Aid' | 'Bless' | 'Command' | 'Spirit Guardians' | 'Revivify' | 'Ray of Frost' | 'Slow')[];
}

export const D365_SAMPLE_PARTY_BUILDS = [
  {
    role: 'pact_caster', name: 'Mirel Ash', className: 'Warlock',
    classContentKey: '2024:class:warlock', subclassName: 'Fiend Patron',
    subclassContentKey: '2024:subclass:fiend-patron', speciesName: 'Human',
    speciesContentKey: '2024:species:human', backgroundName: 'Sage',
    backgroundContentKey: '2024:background:sage', originFeatContentKey: '2024:feat:alert',
    abilities: { strength: 8, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 15 },
    levelFourAbility: 'charisma', requiredCombatSpells: ['Eldritch Blast'],
  },
  {
    role: 'land_druid', name: 'Orin Reed', className: 'Druid',
    classContentKey: '2024:class:druid', subclassName: 'Circle of the Land',
    subclassContentKey: '2024:subclass:circle-of-the-land', speciesName: 'Human',
    speciesContentKey: '2024:species:human', backgroundName: 'Sage',
    backgroundContentKey: '2024:background:sage', originFeatContentKey: '2024:feat:alert',
    abilities: { strength: 8, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 15, charisma: 12 },
    levelFourAbility: 'wisdom', requiredCombatSpells: ['Cure Wounds', 'Aid'],
  },
  {
    role: 'martial', name: 'Brann Vale', className: 'Fighter',
    classContentKey: '2024:class:fighter', subclassName: 'Champion',
    subclassContentKey: '2024:subclass:champion', speciesName: 'Human',
    speciesContentKey: '2024:species:human', backgroundName: 'Soldier',
    backgroundContentKey: '2024:background:soldier', originFeatContentKey: '2024:feat:alert',
    abilities: { strength: 15, dexterity: 14, constitution: 13, intelligence: 10, wisdom: 12, charisma: 8 },
    levelFourAbility: 'strength', requiredCombatSpells: [],
  },
  {
    role: 'prepared_caster', name: 'Sera Dawn', className: 'Cleric',
    classContentKey: '2024:class:cleric', subclassName: 'Life Domain',
    subclassContentKey: '2024:subclass:life-domain', speciesName: 'Human',
    speciesContentKey: '2024:species:human', backgroundName: 'Acolyte',
    backgroundContentKey: '2024:background:acolyte', originFeatContentKey: '2024:feat:alert',
    abilities: { strength: 10, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 15, charisma: 13 },
    levelFourAbility: 'wisdom', requiredCombatSpells: ['Bless', 'Cure Wounds', 'Command', 'Spirit Guardians', 'Revivify'],
  },
  {
    role: 'arcane_controller', name: 'Tamsin Quill', className: 'Wizard',
    classContentKey: '2024:class:wizard', subclassName: 'Evoker',
    subclassContentKey: '2024:subclass:evoker', speciesName: 'Human',
    speciesContentKey: '2024:species:human', backgroundName: 'Sage',
    backgroundContentKey: '2024:background:sage', originFeatContentKey: '2024:feat:alert',
    abilities: { strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 },
    levelFourAbility: 'intelligence', requiredCombatSpells: ['Ray of Frost', 'Slow'],
  },
] as const satisfies readonly D365SamplePartyBuild[];

export class D365SamplePartyCatalogGap extends Error {
  readonly name = 'D365SamplePartyCatalogGap';

  constructor(
    readonly characterName: string,
    readonly field: string,
    detail: string,
  ) {
    super(`${characterName}: ${field} — ${detail}`);
  }
}

export interface D365SamplePartyLoad {
  readonly party: LoadedExternalPartyPack;
  readonly displayNames: ReadonlyMap<number, string>;
  readonly characterIds: Readonly<Record<D365SamplePartyBuild['role'], number>>;
  readonly builds: typeof D365_SAMPLE_PARTY_BUILDS;
}

type SampleQueries = Pick<QueriesClient,
  | 'guidedClassOptions'
  | 'catalog'
  | 'originOptions'
  | 'backgroundChoiceOptions'
  | 'createGuided'
  | 'applyOrigin'
  | 'applyBackground'
  | 'allocateAbilities'
  | 'getCharacter'
  | 'skillsStep'
  | 'fillSkillGrant'
  | 'spellsStep'
  | 'guidedEligibleSpells'
  | 'assignGuidedSpell'
  | 'partyPackMember'
>;

type SampleCommands = Pick<CommandsClient, 'execute'>;

function operationUuid(characterOrdinal: number, operationOrdinal: number): string {
  const suffix = String(characterOrdinal * 1_000 + operationOrdinal).padStart(12, '0');
  return `d3650000-0000-4000-8000-${suffix}`;
}

async function revision(queries: SampleQueries, characterId: number): Promise<number> {
  return Number((await queries.getCharacter(characterId)).revision);
}

async function execute(
  queries: SampleQueries,
  commands: SampleCommands,
  character: CharacterRow,
  command: CharacterCommandPayload,
  uuid: string,
): Promise<CharacterRow> {
  const outcome = await commands.execute(character.id, Number(character.revision), command, uuid);
  if (outcome.kind === 'refused') {
    throw new D365SamplePartyCatalogGap(
      character.name,
      command.type,
      JSON.stringify(outcome.refusal),
    );
  }
  return queries.getCharacter(character.id);
}

const BATTLEAXE: WeaponFields = {
  name: 'Battleaxe', proficiency_category: 'martial', attack_kind: 'melee',
  damage: { kind: 'dice', dice: '1d8' }, damage_type: 'Slashing',
  versatile_damage: { kind: 'dice', dice: '1d10' }, finesse: false,
  heavy: false, light: false, loading: false, reach: false, thrown: false,
  two_handed: false, ammunition: false, ammunition_kind: null,
  range: { kind: 'none' }, mastery_property: 'Topple', other_properties: null,
  notes: 'D385 defender melee weapon; Topple is sourced at docs/srd/full/srd-5.2.1.txt:12807.',
};

const LONGBOW: WeaponFields = {
  name: 'Longbow', proficiency_category: 'martial', attack_kind: 'ranged',
  damage: { kind: 'dice', dice: '1d8' }, damage_type: 'Piercing',
  versatile_damage: { kind: 'not_applicable' }, finesse: false,
  heavy: true, light: false, loading: false, reach: false, thrown: false,
  two_handed: true, ammunition: true, ammunition_kind: 'Arrow',
  range: { kind: 'ranged', near_feet: 150, far_feet: 600 },
  mastery_property: 'Slow', other_properties: null,
  notes: 'D385 defender ranged weapon; table source docs/srd/source/weapons-table.txt:0.',
};

export const D385_WIZARD_CANTRIPS = ['Ray of Frost', 'Fire Bolt', 'Mage Hand', 'Prestidigitation'] as const;
export const D385_WIZARD_SPELLBOOK = [
  'Mage Armor', 'Shield', 'Magic Missile', 'Detect Magic', 'Feather Fall', 'Thunderwave',
  'Sleep', 'Grease', 'Misty Step', 'Web', 'Invisibility', 'Counterspell', 'Fireball', 'Slow',
] as const;
export const D385_WIZARD_PREPARED = [
  'Mage Armor', 'Shield', 'Magic Missile', 'Thunderwave', 'Misty Step', 'Web',
  'Counterspell', 'Fireball', 'Slow',
] as const;

async function fillSkills(
  queries: SampleQueries,
  character: CharacterRow,
  characterOrdinal: number,
  operationOrdinal: { value: number },
): Promise<CharacterRow> {
  while (true) {
    const state = await queries.skillsStep(character.id);
    const choice = [...state.class_choices, ...state.species_choices][0];
    if (choice === undefined) return queries.getCharacter(character.id);
    const skill = choice.available[0];
    if (skill === undefined) {
      throw new D365SamplePartyCatalogGap(character.name, 'skills', 'An owed skill choice has no accepted option.');
    }
    operationOrdinal.value += 1;
    const outcome = await queries.fillSkillGrant({
      character_id: character.id,
      grant_id: choice.grant_id,
      skill,
      operation_uuid: operationUuid(characterOrdinal, operationOrdinal.value),
      expected_revision: state.revision,
    });
    if (outcome.kind !== 'ok') {
      throw new D365SamplePartyCatalogGap(
        character.name,
        'skills',
        JSON.stringify(outcome.kind === 'refused' ? outcome.refusal : outcome),
      );
    }
  }
}

async function assignRequiredCombatSpell(
  queries: SampleQueries,
  character: CharacterRow,
  build: D365SamplePartyBuild,
  characterOrdinal: number,
  operationOrdinal: { value: number },
): Promise<CharacterRow> {
  let current = character;
  for (const requiredSpell of build.requiredCombatSpells) {
    if (!SPELL_MANIFEST.some((spell) =>
      spell.status === 'implemented' && spell.name === requiredSpell)) {
      throw new D365SamplePartyCatalogGap(
        current.name,
        'requiredCombatSpell',
        `${requiredSpell} is not implemented by the combat manifest.`,
      );
    }
    const state = await queries.spellsStep(current.id);
    let assigned = false;
    for (const choice of state.choices.filter((candidate) => candidate.selected_spell_name === null)) {
      const eligible = await queries.guidedEligibleSpells({
        character_id: current.id,
        address: { kind: choice.kind, id: choice.id },
        query: '',
      });
      const selected = eligible.find((spell) => spell.name === requiredSpell);
      if (selected === undefined) continue;
      operationOrdinal.value += 1;
      await queries.assignGuidedSpell({
        character_id: current.id,
        address: { kind: choice.kind, id: choice.id },
        spell_version_id: Number(selected.id),
        operation_uuid: operationUuid(characterOrdinal, operationOrdinal.value),
        expected_revision: state.revision,
      });
      current = await queries.getCharacter(current.id);
      assigned = true;
      break;
    }
    if (!assigned) {
      throw new D365SamplePartyCatalogGap(
        current.name,
        'requiredCombatSpell',
        `${requiredSpell} is not accepted by generated choices: ${state.choices.map((choice) => choice.label).join(', ') || '(none)'}.`,
      );
    }
  }
  return current;
}

async function assignWizardSpellPlan(
  queries: SampleQueries,
  character: CharacterRow,
  characterOrdinal: number,
  operationOrdinal: { value: number },
): Promise<CharacterRow> {
  const plans = [
    { label: 'cantrip', spells: D385_WIZARD_CANTRIPS },
    { label: 'spellbook spell', spells: D385_WIZARD_SPELLBOOK },
    { label: 'prepared spell', spells: D385_WIZARD_PREPARED },
  ] as const;
  let current = character;
  for (const plan of plans) {
    for (const spellName of plan.spells) {
      const state = await queries.spellsStep(current.id);
      const choices = state.choices.filter((candidate) =>
        candidate.selected_spell_name === null && candidate.label.includes(plan.label));
      let assigned = false;
      for (const choice of choices) {
        const eligible = await queries.guidedEligibleSpells({
          character_id: current.id,
          address: { kind: choice.kind, id: choice.id },
          query: spellName,
        });
        const selected = eligible.find((spell) => spell.name === spellName);
        if (selected === undefined) continue;
        operationOrdinal.value += 1;
        await queries.assignGuidedSpell({
          character_id: current.id,
          address: { kind: choice.kind, id: choice.id },
          spell_version_id: Number(selected.id),
          operation_uuid: operationUuid(characterOrdinal, operationOrdinal.value),
          expected_revision: state.revision,
        });
        current = await queries.getCharacter(current.id);
        assigned = true;
        break;
      }
      if (!assigned) {
        throw new D365SamplePartyCatalogGap(
          current.name,
          'wizardSpellPlan',
          `${spellName} could not fill an empty Wizard ${plan.label} choice.`,
        );
      }
    }
  }
  const final = await queries.spellsStep(current.id);
  const unfilled = final.choices.filter((choice) => choice.selected_spell_name === null);
  if (unfilled.length > 0) {
    throw new D365SamplePartyCatalogGap(
      current.name,
      'wizardSpellPlan',
      `The level-5 Wizard plan left choices empty: ${unfilled.map((choice) => choice.label).join(', ')}.`,
    );
  }
  return current;
}

export async function installD365SamplePartyThroughRpc(
  queries: SampleQueries,
  commands: SampleCommands,
): Promise<D365SamplePartyLoad> {
  const [classes, catalog, species, backgroundOptions] = await Promise.all([
    queries.guidedClassOptions(),
    queries.catalog(),
    queries.originOptions('species'),
    queries.backgroundChoiceOptions(),
  ]);
  const human = species.find((candidate) => candidate.content_key === '2024:species:human');
  const alert = backgroundOptions.origin_feats.find((candidate) => candidate.content_key === '2024:feat:alert');
  if (human === undefined) throw new D365SamplePartyCatalogGap('party', 'species', 'Bundled Human is missing.');
  if (alert === undefined) throw new D365SamplePartyCatalogGap('party', 'originFeat', 'Bundled Alert is missing.');

  const exported = [];
  const roleIds: Partial<Record<D365SamplePartyBuild['role'], number>> = {};
  for (const [buildIndex, build] of D365_SAMPLE_PARTY_BUILDS.entries()) {
    const characterOrdinal = buildIndex + 1;
    const operationOrdinal = { value: 0 };
    const classOption = classes.find((candidate) => candidate.content_key === build.classContentKey);
    const classDefinition = catalog.classes.find((candidate) => candidate.content_key === build.classContentKey);
    const background = backgroundOptions.backgrounds.find(
      (candidate) => candidate.content_key === build.backgroundContentKey,
    );
    if (classOption === undefined) {
      throw new D365SamplePartyCatalogGap(build.name, 'class', `${build.className} is missing from guidedClassOptions.`);
    }
    if (classDefinition === undefined) {
      throw new D365SamplePartyCatalogGap(build.name, 'classDefinition', `${build.className} has no catalog row.`);
    }
    if (background === undefined) {
      throw new D365SamplePartyCatalogGap(build.name, 'background', `${build.backgroundName} is missing from backgroundChoiceOptions.`);
    }
    let character = await queries.createGuided(build.name, classOption.content_key);
    await queries.applyOrigin(character.id, 'species', human.content_key);
    await queries.applyBackground({
      character_id: character.id,
      content_key: background.content_key,
      increases: [
        { ability: build.levelFourAbility, amount: 2 },
        { ability: 'constitution', amount: 1 },
      ],
      origin_feat_content_key: alert.content_key,
      origin_feat_config: {},
    });
    operationOrdinal.value += 1;
    const allocation = await queries.allocateAbilities({
      character_id: character.id,
      method: 'standard_array',
      scores: build.abilities,
      operation_uuid: operationUuid(characterOrdinal, operationOrdinal.value),
      expected_revision: await revision(queries, character.id),
    });
    if (allocation.kind === 'refused') {
      throw new D365SamplePartyCatalogGap(build.name, 'abilities', JSON.stringify(allocation.refusal));
    }
    character = await queries.getCharacter(character.id);
    for (let targetLevel = 2; targetLevel <= 5; targetLevel += 1) {
      operationOrdinal.value += 1;
      character = await execute(queries, commands, character, {
        type: 'level_up_class',
        class_definition_id: Number(classDefinition.id),
        target_level: targetLevel,
        ...(targetLevel === 3 ? { subclass_content_key: build.subclassContentKey } : {}),
        ...(targetLevel === 4 ? {
          feat_choice: {
            kind: 'feat',
            feat_content_key: '2024:feat:ability-score-improvement',
            config: {},
            ability_increases: [{ ability: build.levelFourAbility, amount: 2 }],
          },
        } : {}),
      }, operationUuid(characterOrdinal, operationOrdinal.value));
    }
    character = await fillSkills(queries, character, characterOrdinal, operationOrdinal);
    character = build.role === 'arcane_controller'
      ? await assignWizardSpellPlan(queries, character, characterOrdinal, operationOrdinal)
      : await assignRequiredCombatSpell(queries, character, build, characterOrdinal, operationOrdinal);
    if (build.role === 'martial') {
      operationOrdinal.value += 1;
      character = await execute(queries, commands, character, {
        type: 'choose_fighting_style', feat_content_key: '2024:feat:defense',
      }, operationUuid(characterOrdinal, operationOrdinal.value));
      operationOrdinal.value += 1;
      character = await execute(queries, commands, character, {
        type: 'add_weapon', weapon: BATTLEAXE, mastery_selected: true,
      }, operationUuid(characterOrdinal, operationOrdinal.value));
      operationOrdinal.value += 1;
      character = await execute(queries, commands, character, {
        type: 'add_weapon', weapon: LONGBOW, mastery_selected: true,
      }, operationUuid(characterOrdinal, operationOrdinal.value));
    }
    const partyMember = await queries.partyPackMember(character.id);
    if (partyMember.status === 'refused') {
      throw new D365SamplePartyCatalogGap(
        build.name,
        partyMember.refusal.field,
        partyMember.refusal.detail,
      );
    }
    roleIds[build.role] = Number(character.id);
    exported.push(partyMember);
  }

  const loaded = loadExternalPartyPack({
    schemaVersion: 2,
    partyId: D365_SAMPLE_PARTY_ID,
    allowPartial: false,
    members: exported.map((entry) => entry.member),
  });
  if (loaded.status !== 'loaded') {
    throw new D365SamplePartyCatalogGap('party', 'partyPack', loaded.refusal.reason);
  }
  const characterIds = roleIds as Record<D365SamplePartyBuild['role'], number>;
  return {
    party: loaded.party,
    displayNames: new Map(exported.map((entry) => [entry.member.characterId, entry.displayName])),
    characterIds,
    builds: D365_SAMPLE_PARTY_BUILDS,
  };
}

export function loadD365SampleParty(rpc: RpcClient): Promise<D365SamplePartyLoad> {
  return installD365SamplePartyThroughRpc(createQueriesClient(rpc), createCommandsClient(rpc));
}
