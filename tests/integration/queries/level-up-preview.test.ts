import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  LEVEL_UP_RPC,
  type LevelUpPreviewResult,
  type LevelUpStateResult,
} from '../../../src/builder/level-up-wizard';
import { CharacterCommandIntegrity } from '../../../src/commands/integrity';
import { UpdateClassCommand } from '../../../src/commands/update-class';
import type {
  LevelUpClassCommand as LevelUpClassPayload,
  LevelUpPlannedSubchoices,
} from '../../../src/domain/command-contracts';
import { assignSpellSelection } from '../../../src/eligibility/spell-selection-assignment';
import {
  fillSkillGrant,
  mintFilledSkillGrants,
  resolveSkillGrants,
} from '../../../src/grants/skill-grants';
import { applyGuidedOrigin } from '../../../src/builder/guided-creation';
import { CharacterCrud } from '../../../src/queries/character-crud';
import { CharacterSheetBuilder } from '../../../src/queries/character-sheet-builder';
import type { RpcResponse } from '../../../src/rpc/protocol';
import { rpcRegistry } from '../../../src/worker/registry';
import {
  ACCEPTANCE_WIZARD_2_CHOICES,
} from '../../browser/fixtures/level-up-characters';
import { raiseClassLevelForTest } from '../../helpers/class-levels';
import {
  createRpcHarness,
  type RpcHarness,
} from '../../helpers/rpc-harness';

interface AcceptanceFixture {
  readonly characterId: number;
  readonly wizardId: number;
  readonly expectedRevision: number;
  readonly command: LevelUpClassPayload;
}

type DatabaseRows = Readonly<Record<string, readonly Record<string, unknown>[]>>;

/**
 * W-C negative controls:
 *
 * - W-RPC-LIVE `unregister-preview-handler` makes the live method assertion
 *   and valid Preview dispatch fail.
 * - W-PREVIEW-PURE `commit-preview-transaction` makes the full database-row
 *   equality assertion fail in "rolls back every database row...".
 * - W-PREVIEW-PARITY `preview-skips-payload-validator` makes the malformed
 *   error equality assertion fail in "returns byte-identical...".
 * - W-PREVIEW-AUDIT-LINE `register-preview-under-queries` makes the module
 *   boundary assertion fail in "keeps the write-capable rollback...".
 * - W-COMMAND-ATOMIC `force-late-spell-refusal` makes the full database-row
 *   equality assertion fail in "keeps a late invalid locator atomic...".
 * - W-REFUSALS `strip-refusal-data-in-worker` makes the exact three-reason
 *   assertion fail in "preserves all three LU-1 refusal keys...".
 * - W-PLANNED-SPELL `resolve-locator-as-row-id` makes Preview/commit sheet
 *   parity fail in "rolls back every database row...".
 * - W-ACCEPTANCE-ORACLE `change-wizard-2-oracle-name` makes the exact planned
 *   search result fail in "projects the hand-authored Wizard-2 oracle...".
 */
describe('level-up rollback preview RPC', () => {
  let harness: RpcHarness;
  let requestId: number;

  beforeEach(async () => {
    harness = await createRpcHarness([]);
    requestId = 0;
  });

  afterEach(() => harness.close());

  async function dispatch(
    method: string,
    params: unknown,
  ): Promise<RpcResponse> {
    requestId += 1;
    return rpcRegistry.dispatch(
      { id: requestId, method, params },
      harness.context,
    );
  }

  function classId(name: string): number {
    return Number(
      harness.context.db.scalar(
        'SELECT id FROM class_definitions WHERE name = ?',
        [name],
      ),
    );
  }

  function databaseRows(): DatabaseRows {
    const names = harness.context.db.allRaw(
      `SELECT name FROM sqlite_schema
       WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
       ORDER BY name`,
    ).map((row) => String(row.name));
    const snapshot: Record<string, readonly Record<string, unknown>[]> = {};
    for (const name of [...names, 'sqlite_sequence']) {
      if (!/^[a-zA-Z0-9_]+$/.test(name)) {
        throw new Error(`Unsafe fixture table name ${name}.`);
      }
      snapshot[name] = harness.context.db.allRaw(
        `SELECT * FROM "${name}" ORDER BY rowid`,
      );
    }
    return snapshot;
  }

  function resultOf<T>(response: RpcResponse): T {
    if (!response.ok) {
      throw new Error(`Expected RPC success, received ${response.error.message}`);
    }
    return response.result as T;
  }

  function errorOf(response: RpcResponse) {
    if (response.ok) throw new Error('Expected RPC failure.');
    return response.error;
  }

  function spellVersionId(name: string): number {
    const id = harness.context.db.scalar<number>(
      `SELECT id FROM spell_versions
       WHERE display_name = ? AND rules_edition = '2024' AND is_active = 1`,
      [name],
    );
    if (id === null) throw new Error(`Missing acceptance spell ${name}.`);
    return Number(id);
  }

  function buildAcceptanceFixture(): AcceptanceFixture {
    const db = harness.context.db;
    const characterId = new CharacterCrud(db).create({
      name: 'Acceptance Dwarf Wizard',
    }).id;
    db.exec(
      `UPDATE characters
       SET strength = 15, dexterity = 14, constitution = 15,
           intelligence = 13, wisdom = 10, charisma = 8
       WHERE id = ?`,
      [characterId],
    );
    const wizardId = classId('Wizard');
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: wizardId },
      new CharacterCommandIntegrity('level-up-preview-fixture-key'),
    ).apply(characterId);
    const dwarfKey = String(
      db.scalar(
        `SELECT content_key FROM species_templates
         WHERE name = 'Dwarf'`,
      ),
    );
    applyGuidedOrigin(db, {
      character_id: characterId,
      kind: 'species',
      content_key: dwarfKey,
    });

    const classSkills = resolveSkillGrants(db, characterId)
      .unfilledClassGrants;
    const firstSkill = classSkills[0];
    const secondSkill = classSkills[1];
    if (firstSkill === undefined || secondSkill === undefined) {
      throw new Error('Wizard fixture did not generate two skill choices.');
    }
    fillSkillGrant(db, characterId, firstSkill.grant_id, 'investigation');
    fillSkillGrant(db, characterId, secondSkill.grant_id, 'medicine');
    const backgroundSkillSource = db.exec(
      `INSERT INTO character_source_instances (
         character_id, instance_uuid, source_type, display_name, state
       ) VALUES (?, ?, 'background', 'Sage', 'active')`,
      [characterId, crypto.randomUUID()],
    ).lastInsertId;
    mintFilledSkillGrants(
      db,
      characterId,
      backgroundSkillSource,
      'background_skill',
      ['arcana', 'history'],
    );

    const levelOneSpellbookNames = [
      'Detect Magic',
      'Feather Fall',
      'Find Familiar',
      'Grease',
      'Jump',
      'Longstrider',
    ] as const;
    const entries = db.allRaw(
      `SELECT id, ordinal FROM wizard_spellbook_entries
       WHERE character_id = ? AND rule_key = 'wizard-spellbook'
       ORDER BY ordinal`,
      [characterId],
    );
    expect(entries).toHaveLength(6);
    for (const [index, name] of levelOneSpellbookNames.entries()) {
      const entry = entries[index];
      if (entry === undefined) throw new Error(`Missing spellbook ordinal ${index + 1}.`);
      assignSpellSelection(db, {
        address: {
          kind: 'spellbook_acquisition',
          id: Number(entry.id),
        },
        character_id: characterId,
        spell_version_id: spellVersionId(name),
      });
    }

    const levelOneSlots = [
      ['wizard-cantrips', ['Mage Hand', 'Ray of Frost', 'Light']],
      ['wizard-prepared', ['Mage Armor', 'Magic Missile', 'Shield', 'Sleep']],
    ] as const;
    for (const [ruleKey, names] of levelOneSlots) {
      const slots = db.allRaw(
        `SELECT id FROM spell_selection_slots
         WHERE character_id = ? AND rule_key = ? ORDER BY ordinal`,
        [characterId, ruleKey],
      );
      expect(slots).toHaveLength(names.length);
      for (const [index, name] of names.entries()) {
        const slot = slots[index];
        if (slot === undefined) throw new Error(`Missing ${ruleKey} ordinal ${index + 1}.`);
        assignSpellSelection(db, {
          address: { kind: 'slot_selection', id: Number(slot.id) },
          character_id: characterId,
          spell_version_id: spellVersionId(name),
        });
      }
    }

    const spells = ACCEPTANCE_WIZARD_2_CHOICES.spells.map((choice) =>
      choice.kind === 'slot_selection'
        ? {
            kind: choice.kind,
            locator: choice.locator,
            spell_version_id: spellVersionId(choice.spell_name),
            mode: choice.mode,
          }
        : {
            kind: choice.kind,
            locator: choice.locator,
            spell_version_id: spellVersionId(choice.spell_name),
          },
    );
    const planned_subchoices: LevelUpPlannedSubchoices = {
      skills: ACCEPTANCE_WIZARD_2_CHOICES.skills,
      expertise: ACCEPTANCE_WIZARD_2_CHOICES.expertise,
      spells,
    };
    const expectedRevision = Number(
      db.scalar('SELECT revision FROM characters WHERE id = ?', [characterId]),
    );
    return {
      characterId,
      wizardId,
      expectedRevision,
      command: {
        type: 'level_up_class',
        class_definition_id: wizardId,
        target_level: 2,
        planned_subchoices,
      },
    };
  }

  it('projects the hand-authored Wizard-2 oracle and proves every spell name through planned search', async () => {
    const fixture = buildAcceptanceFixture();
    const stateResponse = await dispatch(LEVEL_UP_RPC.state, {
      character_id: fixture.characterId,
    });
    const state = resultOf<LevelUpStateResult>(stateResponse);
    if (state.kind !== 'ready') throw new Error('Acceptance Wizard was not ready.');
    const option = state.class_options.find(
      (candidate) => candidate.class_definition_id === fixture.wizardId,
    );
    if (option?.guideability !== 'guideable' || option.planned_choices === undefined) {
      throw new Error('Acceptance Wizard had no guideable planned projection.');
    }
    expect(option.applicable_steps).toEqual([
      'class',
      'gains',
      'expertise',
      'spells',
      'review',
      'complete',
    ]);
    expect(option.planned_choices.skills).toEqual([]);
    expect(option.planned_choices.expertise).toEqual([{
      locator: ACCEPTANCE_WIZARD_2_CHOICES.expertise[0]?.locator,
      source_label: 'Wizard — Scholar',
      source_catalog_layer: 'bundled',
      available_skills: [
        'arcana',
        'history',
        'investigation',
        'medicine',
      ],
    }]);
    expect(option.planned_choices.spells).toEqual(
      ACCEPTANCE_WIZARD_2_CHOICES.spells.map((choice) =>
        choice.kind === 'slot_selection'
          ? {
              kind: 'new_slot',
              locator: choice.locator,
              source_label: 'Wizard',
              source_catalog_layer: 'bundled',
              required: true,
            }
          : {
              kind: choice.kind,
              locator: choice.locator,
              source_label: 'Wizard',
              source_catalog_layer: 'bundled',
            },
      ),
    );

    for (const choice of ACCEPTANCE_WIZARD_2_CHOICES.spells) {
      const response = await dispatch(LEVEL_UP_RPC.plannedEligibleSpells, {
        character_id: fixture.characterId,
        expected_revision: fixture.expectedRevision,
        class_definition_id: fixture.wizardId,
        target_class_level: 2,
        locator: choice.locator,
        query: choice.spell_name,
      });
      expect(resultOf<readonly { readonly name: string }[]>(response)).toEqual([
        expect.objectContaining({ name: choice.spell_name }),
      ]);
    }
  });

  it('rolls back every database row and sequence while Preview after-sheet equals the subsequent commit sheet', async () => {
    const fixture = buildAcceptanceFixture();
    const beforeRows = databaseRows();
    const beforeSheet = new CharacterSheetBuilder(harness.context.db).build(
      fixture.characterId,
    );
    expect(beforeSheet.hit_points.value).toBe(8);
    expect(beforeSheet.species_hit_points?.value).toBe(1);

    const previewResponse = await dispatch(LEVEL_UP_RPC.preview, {
      character_id: fixture.characterId,
      expected_revision: fixture.expectedRevision,
      command: fixture.command,
    });
    const preview = resultOf<LevelUpPreviewResult>(previewResponse);
    expect(databaseRows()).toEqual(beforeRows);
    expect(preview.before).toEqual(beforeSheet);
    expect(preview.after.total_level).toBe(2);
    expect(preview.after.hit_points.value).toBe(14);
    expect(preview.after.species_hit_points?.value).toBe(2);
    expect(preview.command_fingerprint).toContain('level_up_class');

    const commitResponse = await dispatch('commands.execute', {
      character_id: fixture.characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: fixture.expectedRevision,
      command: fixture.command,
    });
    const commit = resultOf<{ readonly revision: number }>(commitResponse);
    expect(commit.revision).toBe(fixture.expectedRevision + 1);
    expect(
      new CharacterSheetBuilder(harness.context.db).build(fixture.characterId),
    ).toEqual(preview.after);
    expect(
      harness.context.db.scalar(
        'SELECT count(*) FROM character_operations WHERE character_id = ?',
        [fixture.characterId],
      ),
    ).toBe(1);
  });

  it('returns byte-identical malformed and stale structured refusals through Preview and Confirm', async () => {
    const fixture = buildAcceptanceFixture();
    const malformed = {
      type: 'level_up_class',
      class_definition_id: fixture.wizardId,
      target_level: 2,
      planned_subchoices: {
        skills: 'not-a-list',
        expertise: [],
        spells: [],
      },
    };
    const malformedPreview = await dispatch(LEVEL_UP_RPC.preview, {
      character_id: fixture.characterId,
      expected_revision: fixture.expectedRevision,
      command: malformed,
    });
    const malformedConfirm = await dispatch('commands.execute', {
      character_id: fixture.characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: fixture.expectedRevision,
      command: malformed,
    });
    expect(errorOf(malformedPreview)).toEqual(errorOf(malformedConfirm));
    expect(errorOf(malformedPreview).data).toEqual({
      reason: 'malformed_planned_subchoice',
      subchoice_kind: 'skill',
      index: null,
      field: 'planned_subchoices.skills',
    });

    harness.context.db.exec(
      'UPDATE characters SET revision = revision + 1 WHERE id = ?',
      [fixture.characterId],
    );
    const stalePreview = await dispatch(LEVEL_UP_RPC.preview, {
      character_id: fixture.characterId,
      expected_revision: fixture.expectedRevision,
      command: fixture.command,
    });
    const staleConfirm = await dispatch('commands.execute', {
      character_id: fixture.characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: fixture.expectedRevision,
      command: fixture.command,
    });
    expect(errorOf(stalePreview)).toEqual(errorOf(staleConfirm));
    expect(errorOf(stalePreview).data).toEqual({
      current_revision: fixture.expectedRevision + 1,
    });
  });

  it('preserves all three LU-1 refusal keys as worker data', async () => {
    const db = harness.context.db;
    const wizardId = classId('Wizard');
    const classless = new CharacterCrud(db).create({ name: 'Classless' }).id;
    const classNotHeld = await dispatch('commands.execute', {
      character_id: classless,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'level_up_class',
        class_definition_id: wizardId,
        target_level: 2,
      },
    });

    const wizard = new CharacterCrud(db).create({ name: 'Nonadjacent' }).id;
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: wizardId },
      new CharacterCommandIntegrity('refusal-fixture-key'),
    ).apply(wizard);
    const nonadjacent = await dispatch('commands.execute', {
      character_id: wizard,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'level_up_class',
        class_definition_id: wizardId,
        target_level: 3,
      },
    });

    const fighter = new CharacterCrud(db).create({ name: 'ASI Refusal' }).id;
    const fighterId = classId('Fighter');
    new UpdateClassCommand(
      db,
      { type: 'update_class', class_definition_id: fighterId },
      new CharacterCommandIntegrity('refusal-fixture-key'),
    ).apply(fighter);
    raiseClassLevelForTest(db, fighter, fighterId, 3);
    const missingFeat = await dispatch('commands.execute', {
      character_id: fighter,
      operation_uuid: crypto.randomUUID(),
      expected_revision: 0,
      command: {
        type: 'level_up_class',
        class_definition_id: fighterId,
        target_level: 4,
      },
    });

    expect([
      errorOf(classNotHeld).data,
      errorOf(nonadjacent).data,
      errorOf(missingFeat).data,
    ]).toEqual([
      { reason: 'class_not_held' },
      { reason: 'level_not_adjacent' },
      { reason: 'ability_increase_required' },
    ]);
  });

  it('keeps a late invalid locator atomic through both preview and executor paths', async () => {
    const fixture = buildAcceptanceFixture();
    const invalidCommand: LevelUpClassPayload = {
      ...fixture.command,
      planned_subchoices: {
        skills: fixture.command.planned_subchoices?.skills ?? [],
        expertise: fixture.command.planned_subchoices?.expertise ?? [],
        spells: [{
          kind: 'spellbook_acquisition',
          locator: {
            source: { kind: 'selected_class' },
            rule_key: 'wizard-spellbook',
            ordinal: 999,
          },
          spell_version_id: spellVersionId('Chromatic Orb'),
        }],
      },
    };
    const before = databaseRows();
    const preview = await dispatch(LEVEL_UP_RPC.preview, {
      character_id: fixture.characterId,
      expected_revision: fixture.expectedRevision,
      command: invalidCommand,
    });
    expect(errorOf(preview).data).toMatchObject({
      reason: 'planned_subchoice_refused',
      subchoice_kind: 'spell',
      issue: 'locator_not_found',
    });
    expect(databaseRows()).toEqual(before);

    const confirm = await dispatch('commands.execute', {
      character_id: fixture.characterId,
      operation_uuid: crypto.randomUUID(),
      expected_revision: fixture.expectedRevision,
      command: invalidCommand,
    });
    expect(errorOf(confirm).data).toEqual(errorOf(preview).data);
    expect(databaseRows()).toEqual(before);
  });

  it('registers exact Preview params and keeps the write-capable rollback exception out of ordinary queries', async () => {
    expect(rpcRegistry.methods).toContain(LEVEL_UP_RPC.preview);
    for (const params of [
      {},
      { character_id: 1, expected_revision: 0 },
      {
        character_id: 0,
        expected_revision: 0,
        command: { type: 'level_up_class' },
      },
      {
        character_id: 1,
        expected_revision: 0,
        command: { type: 'update_ability' },
      },
      {
        character_id: 1,
        expected_revision: 0,
        command: { type: 'level_up_class' },
        extra: true,
      },
    ]) {
      await expect(dispatch(LEVEL_UP_RPC.preview, params)).resolves.toMatchObject({
        ok: false,
        error: { code: 'invalid_params' },
      });
    }

    const previewModule = readFileSync(
      resolve('src/worker/handlers/level-up-preview.ts'),
      'utf8',
    );
    const queryModule = readFileSync(
      resolve('src/worker/handlers/queries.ts'),
      'utf8',
    );
    expect(previewModule).toContain('LEVEL_UP_PREVIEW_ROLLBACK');
    expect(previewModule).toContain('prepared.command.apply');
    expect(queryModule).not.toContain('character-command-preflight');
    expect(queryModule).not.toContain('character-command-factory');
    expect(queryModule).not.toContain("commands/level-up-class");
    expect(queryModule).not.toContain('prepared.command.apply');
    expect(queryModule).not.toContain('previewLevelUp');
  });
});
