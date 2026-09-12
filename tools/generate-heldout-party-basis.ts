import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';
import schema from '../src/db/schema.sql?raw';
import { applicationSeed } from '../src/db/bootstrap';
import { DatabaseContext, prepareConnection } from '../src/db/database';
import { registerSqliteQueryEngine } from '../src/db/query';
import { EXPECTED_BUNDLED_CONTENT_DIGEST_V1 } from '../src/catalog/bundled-content-digest-v1.expected';
import {
  allocateGuidedAbilities,
  applyGuidedOrigin,
  assignGuidedSpell,
  createGuidedCharacter,
  fillGuidedExpertiseGrant,
  fillGuidedSkillGrant,
  guidedEligibleSpells,
  guidedExpertiseStepState,
  guidedSkillsStepState,
  guidedSpellsStepState,
} from '../src/builder/guided-creation';
import { applyGuidedEquipment } from '../src/builder/equipment-step';
import { guidedRequiredFighterChoicesState } from '../src/builder/required-fighter-choices';
import { CharacterCommandExecutor } from '../src/commands/character-command-executor';
import { CharacterCommandIntegrity } from '../src/commands/integrity';
import { LevelUpClassCommand } from '../src/commands/level-up-class';
import { canonicalJson } from '../src/commands/canonical-json';
import { SPELL_MANIFEST } from '../src/combat/spells/manifest';
import { sha256 } from '../src/crypto/sha256';
import type { Ability } from '../src/domain/enums';
import { WeaponQueries } from '../src/queries/weapons';
import { weaponFromTemplate } from '../src/ui/screens/planner/weapons';
import type { HeldoutPartyLevel } from '../src/vtt/heldout-evaluation';
import {
  loadExternalPartyPackBytes,
  type ExternalPartyPackMember,
} from '../src/vtt/party-pack';
import {
  StoredCharacterPartyPackExporter,
  type StoredCharacterPartyPackExport,
} from '../src/vtt/stored-character-party-member';

export const HELDOUT_PARTY_RECIPE_ID = 'heldout-party-v1' as const;
export const HELDOUT_PARTY_LEVELS = [3, 4, 5, 6] as const satisfies readonly HeldoutPartyLevel[];

export const HELDOUT_PARTY_RECIPES = [
  { seat: 0, classKey: '2024:class:fighter', className: 'Fighter', subclass: '2024:subclass:champion', ability: 'strength' as Ability, scores: { strength: 15, dexterity: 12, constitution: 14, intelligence: 10, wisdom: 13, charisma: 8 } },
  { seat: 1, classKey: '2024:class:cleric', className: 'Cleric', subclass: '2024:subclass:life-domain', ability: 'wisdom' as Ability, scores: { strength: 10, dexterity: 12, constitution: 14, intelligence: 8, wisdom: 15, charisma: 13 } },
  { seat: 2, classKey: '2024:class:rogue', className: 'Rogue', subclass: '2024:subclass:thief', ability: 'dexterity' as Ability, scores: { strength: 10, dexterity: 15, constitution: 14, intelligence: 13, wisdom: 12, charisma: 8 } },
  { seat: 3, classKey: '2024:class:wizard', className: 'Wizard', subclass: '2024:subclass:evoker', ability: 'intelligence' as Ability, scores: { strength: 8, dexterity: 14, constitution: 13, intelligence: 15, wisdom: 12, charisma: 10 } },
] as const;

export interface HeldoutPartyGenerationConfig {
  readonly levels: readonly HeldoutPartyLevel[];
  readonly outPath: string;
}

export interface HeldoutPartyLevelResult {
  readonly level: HeldoutPartyLevel;
  readonly path: string;
  readonly bytes: string;
  readonly sha256: string;
  readonly memberSha256: readonly string[];
  readonly spellAssignments: number;
  readonly fighterMastery: { readonly selected: number; readonly required: number };
}

export interface HeldoutPartyGenerationResult {
  readonly recipeId: typeof HELDOUT_PARTY_RECIPE_ID;
  readonly recipeSha256: string;
  readonly bundledContentSha256: typeof EXPECTED_BUNDLED_CONTENT_DIGEST_V1;
  readonly levels: readonly HeldoutPartyLevelResult[];
}

export class HeldoutPartyGenerationError extends Error {
  constructor(readonly refusal: {
    readonly level: HeldoutPartyLevel;
    readonly seat: number;
    readonly field: string;
    readonly detail: string;
  }) {
    super(JSON.stringify(refusal));
    this.name = 'HeldoutPartyGenerationError';
  }
}

function codePointCompare(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function revision(db: DatabaseContext, id: number): number {
  const value = db.scalar('SELECT revision FROM characters WHERE id = ?', [id]);
  if (value === null) throw new Error(`Character ${String(id)} has no revision.`);
  return Number(value);
}

function classId(db: DatabaseContext, key: string): number {
  const value = db.scalar<number>('SELECT id FROM class_definitions WHERE content_key = ?', [key]);
  if (value === null) throw new Error(`Missing class ${key}.`);
  return value;
}

function operationUuid(sequence: number): string {
  return `00000000-0000-4000-8000-${String(sequence).padStart(12, '0')}`;
}

function refuse(
  level: HeldoutPartyLevel,
  seat: number,
  field: string,
  detail: unknown,
): never {
  throw new HeldoutPartyGenerationError({
    level,
    seat,
    field,
    detail: detail instanceof Error ? detail.message : String(detail),
  });
}

export function requireHeldoutPartyMemberExport(
  level: HeldoutPartyLevel,
  seat: number,
  result: StoredCharacterPartyPackExport,
): ExternalPartyPackMember {
  if (result.status === 'refused') {
    refuse(level, seat, result.refusal.field, result.refusal.detail);
  }
  return result.member;
}

async function buildMember(
  db: DatabaseContext,
  level: HeldoutPartyLevel,
  recipe: (typeof HELDOUT_PARTY_RECIPES)[number],
  integrity: CharacterCommandIntegrity,
  nextOperationUuid: () => string,
): Promise<{
  readonly member: ExternalPartyPackMember;
  readonly spellAssignments: number;
  readonly fighterMastery: { readonly selected: number; readonly required: number } | null;
}> {
  let characterId = 0;
  try {
    characterId = createGuidedCharacter(db, {
      name: `heldout-v1-${String(level)}-${String(recipe.seat)}`,
      class_content_key: recipe.classKey,
    }, integrity).id;
    await allocateGuidedAbilities(db, {
      character_id: characterId,
      method: 'standard_array',
      scores: recipe.scores,
      operation_uuid: nextOperationUuid(),
      expected_revision: revision(db, characterId),
    }, integrity);
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: '2024:species:human',
    });
    applyGuidedEquipment(db, {
      character_id: characterId,
      kind: 'class',
      content_key: recipe.classKey,
      option: 'a',
    });
  } catch (error: unknown) {
    refuse(level, recipe.seat, 'creation', error);
  }

  const definitionId = classId(db, recipe.classKey);
  for (let target = 2; target <= level; target += 1) {
    const needsAsi = target === 4 || (recipe.className === 'Fighter' && target === 6);
    const outcome = new LevelUpClassCommand(db, {
      type: 'level_up_class',
      class_definition_id: definitionId,
      target_level: target,
      ...(target === 3 ? { subclass_content_key: recipe.subclass } : {}),
      ...(needsAsi ? {
        feat_choice: {
          kind: 'feat' as const,
          feat_content_key: '2024:feat:ability-score-improvement',
          config: {},
          ability_increases: [{ ability: recipe.ability, amount: 2 }],
        },
      } : {}),
    }, integrity).apply(characterId);
    if (outcome.kind !== 'ok') refuse(level, recipe.seat, `level-${String(target)}`, canonicalJson(outcome));
  }

  while (true) {
    const state = guidedSkillsStepState(db, characterId);
    const choice = [...state.class_choices, ...state.species_choices][0];
    if (choice === undefined) break;
    const skill = [...choice.available].sort(codePointCompare)[0];
    if (skill === undefined) refuse(level, recipe.seat, 'skill', 'No eligible skill.');
    const outcome = await fillGuidedSkillGrant(db, {
      character_id: characterId,
      grant_id: choice.grant_id,
      skill,
      operation_uuid: nextOperationUuid(),
      expected_revision: state.revision,
    }, integrity);
    if (outcome.kind !== 'ok') refuse(level, recipe.seat, 'skill', canonicalJson(outcome));
  }

  while (true) {
    const state = guidedExpertiseStepState(db, characterId);
    const choice = state.choices[0];
    if (choice === undefined) break;
    const skill = [...choice.available].sort(codePointCompare)[0];
    if (skill === undefined) refuse(level, recipe.seat, 'expertise', 'No eligible skill.');
    fillGuidedExpertiseGrant(db, {
      character_id: characterId,
      grant_id: choice.grant_id,
      skill,
      operation_uuid: nextOperationUuid(),
      expected_revision: state.revision,
    });
  }

  let fighterMastery: { readonly selected: number; readonly required: number } | null = null;
  const fighter = guidedRequiredFighterChoicesState(db, characterId).fighter;
  if (fighter !== null) {
    const executor = new CharacterCommandExecutor(db, integrity);
    const style = [...fighter.fighting_style.options].sort((left, right) =>
      codePointCompare(left.content_key, right.content_key))[0];
    if (style === undefined) refuse(level, recipe.seat, 'fighting-style', 'No eligible fighting style.');
    const styleOutcome = await executor.execute({
      character_id: characterId,
      operation_uuid: nextOperationUuid(),
      expected_revision: revision(db, characterId),
      command: { type: 'choose_fighting_style', feat_content_key: style.content_key },
    });
    if (styleOutcome.kind !== 'ok') refuse(level, recipe.seat, 'fighting-style', canonicalJson(styleOutcome));
    if (fighter.weapon_mastery.state !== 'known') {
      refuse(level, recipe.seat, 'weapon-mastery', 'Mastery choices are unavailable.');
    }
    const heldNames = new Set(fighter.weapon_mastery.options.map((weapon) => weapon.weapon_name));
    while (true) {
      const current = guidedRequiredFighterChoicesState(db, characterId).fighter;
      if (current === null || current.weapon_mastery.state !== 'known') {
        refuse(level, recipe.seat, 'weapon-mastery', 'Mastery choices disappeared.');
      }
      if (current.weapon_mastery.options.length >= current.weapon_mastery.required_count) break;
      const template = new WeaponQueries(db).templates()
        .filter((weapon) => weapon.mastery_property !== null && !heldNames.has(weapon.name))
        .sort((left, right) => codePointCompare(left.name, right.name) ||
          codePointCompare(left.content_key, right.content_key))[0];
      if (template === undefined) refuse(level, recipe.seat, 'weapon-mastery', 'No missing mastery template.');
      heldNames.add(template.name);
      const addOutcome = await executor.execute({
        character_id: characterId,
        operation_uuid: nextOperationUuid(),
        expected_revision: revision(db, characterId),
        command: { type: 'add_weapon', weapon: weaponFromTemplate(template) },
      });
      if (addOutcome.kind !== 'ok') refuse(level, recipe.seat, 'weapon-mastery-top-up', canonicalJson(addOutcome));
    }
    const refreshed = guidedRequiredFighterChoicesState(db, characterId).fighter;
    if (refreshed === null || refreshed.weapon_mastery.state !== 'known') {
      refuse(level, recipe.seat, 'weapon-mastery', 'Refreshed mastery choices are unavailable.');
    }
    const weapons = [...refreshed.weapon_mastery.options]
      .sort((left, right) => codePointCompare(left.weapon_name, right.weapon_name) ||
        left.weapon_id - right.weapon_id)
      .slice(0, refreshed.weapon_mastery.required_count);
    for (const weapon of weapons) {
      const masteryOutcome = await executor.execute({
        character_id: characterId,
        operation_uuid: nextOperationUuid(),
        expected_revision: revision(db, characterId),
        command: { type: 'set_weapon_mastery', weapon_id: weapon.weapon_id, selected: true },
      });
      if (masteryOutcome.kind !== 'ok') refuse(level, recipe.seat, 'weapon-mastery', canonicalJson(masteryOutcome));
    }
    fighterMastery = { selected: weapons.length, required: refreshed.weapon_mastery.required_count };
  }

  const implementedSpellNames = new Set(
    SPELL_MANIFEST.filter((row) => row.status === 'implemented').map((row) => row.name),
  );
  let spellAssignments = 0;
  while (true) {
    const state = guidedSpellsStepState(db, characterId);
    const choice = state.choices.find((candidate) => candidate.selected_spell_name === null);
    if (choice === undefined) break;
    const spell = guidedEligibleSpells(db, {
      character_id: characterId,
      address: { kind: choice.kind, id: choice.id },
      query: '',
    }).filter((candidate) => implementedSpellNames.has(candidate.name))
      .sort((left, right) => left.level - right.level || codePointCompare(left.name, right.name))[0];
    if (spell === undefined) refuse(level, recipe.seat, 'spell', `No eligible implemented spell for ${choice.label}.`);
    try {
      assignGuidedSpell(db, {
        character_id: characterId,
        address: { kind: choice.kind, id: choice.id },
        spell_version_id: spell.id,
        operation_uuid: nextOperationUuid(),
        expected_revision: state.revision,
      });
    } catch (error: unknown) {
      refuse(level, recipe.seat, 'spell', error);
    }
    spellAssignments += 1;
  }

  const exported = new StoredCharacterPartyPackExporter(db).export(characterId);
  return {
    member: requireHeldoutPartyMemberExport(level, recipe.seat, exported),
    spellAssignments,
    fighterMastery,
  };
}

export async function generateHeldoutPartyBasis(
  config: HeldoutPartyGenerationConfig,
): Promise<HeldoutPartyGenerationResult> {
  const sqlite3 = await sqlite3InitModule();
  registerSqliteQueryEngine(sqlite3);
  const connection = new sqlite3.oo1.DB(':memory:', 'c');
  prepareConnection(connection);
  connection.exec(schema);
  const db = new DatabaseContext(connection);
  try {
    applicationSeed(db, 'full', 'full');
    await mkdir(config.outPath, { recursive: true });
    let operationSequence = 0;
    const integrity = new CharacterCommandIntegrity(HELDOUT_PARTY_RECIPE_ID);
    const results: HeldoutPartyLevelResult[] = [];
    for (const level of config.levels) {
      const members: ExternalPartyPackMember[] = [];
      let spellAssignments = 0;
      let fighterMastery: { readonly selected: number; readonly required: number } | null = null;
      for (const recipe of HELDOUT_PARTY_RECIPES) {
        let built: Awaited<ReturnType<typeof buildMember>>;
        try {
          built = await buildMember(
            db,
            level,
            recipe,
            integrity,
            () => operationUuid(++operationSequence),
          );
        } catch (error: unknown) {
          if (error instanceof HeldoutPartyGenerationError) throw error;
          refuse(level, recipe.seat, 'build', error);
        }
        members.push(built.member);
        spellAssignments += built.spellAssignments;
        fighterMastery ??= built.fighterMastery;
      }
      if (fighterMastery === null) refuse(level, 0, 'weapon-mastery', 'Fighter mastery result is absent.');
      const document = {
        schemaVersion: 2 as const,
        partyId: `party:heldout-v1-level-${String(level)}` as const,
        allowPartial: false,
        members,
      };
      const bytes = `${JSON.stringify(document)}\n`;
      const loaded = loadExternalPartyPackBytes(bytes);
      if (loaded.status !== 'loaded') refuse(level, -1, 'party-load', canonicalJson(loaded));
      const loadedLevels = loaded.party.members.map((member) =>
        member.source.classes.reduce((sum, heldClass) => sum + heldClass.level, 0));
      if (loaded.party.members.length !== 4 || loadedLevels.some((memberLevel) => memberLevel !== level)) {
        refuse(level, -1, 'party-load', `Loaded levels ${loadedLevels.join(',')}.`);
      }
      const path = resolve(config.outPath, `level-${String(level)}.json`);
      await writeFile(path, bytes, 'utf8');
      results.push({
        level,
        path,
        bytes,
        sha256: sha256(bytes),
        memberSha256: members.map((member) => sha256(canonicalJson(member))),
        spellAssignments,
        fighterMastery,
      });
    }
    return {
      recipeId: HELDOUT_PARTY_RECIPE_ID,
      recipeSha256: sha256(canonicalJson(HELDOUT_PARTY_RECIPES)),
      bundledContentSha256: EXPECTED_BUNDLED_CONTENT_DIGEST_V1,
      levels: results,
    };
  } finally {
    db.close();
  }
}

function parseLevels(value: string): readonly HeldoutPartyLevel[] {
  const levels = value.split(',').map((entry) => Number(entry));
  if (levels.length === 0 || levels.some((level) =>
    !HELDOUT_PARTY_LEVELS.includes(level as HeldoutPartyLevel))) {
    throw new TypeError('--levels must contain only comma-separated levels 3,4,5,6.');
  }
  return levels as HeldoutPartyLevel[];
}

export function parseHeldoutPartyGenerationArgs(argv: readonly string[]): HeldoutPartyGenerationConfig {
  const args = argv[0] === '--' ? argv.slice(1) : argv;
  const values = new Map<string, string>();
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    if (option === undefined || !['--levels', '--out'].includes(option)) {
      throw new TypeError(`Unknown held-out party option ${option ?? '<missing>'}.`);
    }
    if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
    values.set(option, value);
  }
  const out = values.get('--out');
  if (out === undefined) throw new TypeError('--out is required.');
  return {
    levels: parseLevels(values.get('--levels') ?? '3,4,5,6'),
    outPath: resolve(out),
  };
}

async function main(argv: readonly string[]): Promise<void> {
  try {
    const result = await generateHeldoutPartyBasis(parseHeldoutPartyGenerationArgs(argv));
    process.stdout.write(`${canonicalJson({
      ...result,
      levels: result.levels.map(({ bytes: _bytes, ...level }) => level),
    })}\n`);
  } catch (error: unknown) {
    if (!(error instanceof HeldoutPartyGenerationError)) throw error;
    process.stderr.write(`${canonicalJson(error.refusal)}\n`);
    process.exitCode = 1;
  }
}

const scriptIndex = process.argv.findIndex((argument) =>
  argument.endsWith('/generate-heldout-party-basis.ts') ||
  argument.endsWith('\\generate-heldout-party-basis.ts'));
if (scriptIndex >= 0) await main(process.argv.slice(scriptIndex + 1));
else if (process.argv.includes('--levels')) {
  await main(process.argv.slice(2));
}
