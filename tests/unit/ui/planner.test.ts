import { describe, expect, it } from 'vitest';
import type { CharacterCommandPayload } from '../../../src/domain/command-contracts';
import type {
  Workspace,
  WorkspaceSlot,
} from '../../../src/domain/read-models';
import type { OperationHistory } from '../../../src/queries/operation-history';
import type { CharacterCommandResult } from '../../../src/commands/character-command-executor';
import {
  defaultGridFilters,
  filterAndSortSlots,
} from '../../../src/ui/screens/planner/planner-grid';
import {
  PlannerSession,
  type PlannerCommandClient,
  type PlannerQueryClient,
} from '../../../src/ui/screens/planner/screen';

function slot(
  changes: Partial<WorkspaceSlot> = {},
): WorkspaceSlot {
  return {
    id: 1,
    slot_key: 'wizard:cantrip:1',
    source: 'Wizard 1',
    source_type: 'class',
    label: 'Cantrip Known 1',
    bucket: 'cantrip_known',
    level_min: 0,
    level_max: 0,
    spell_id: 10,
    spell_name: 'Mage Hand',
    spell_level: 0,
    spell_edition: '2024',
    ability: 'intelligence',
    attack_bonus: null,
    save_dc: null,
    ritual: false,
    concentration: false,
    duplicate_status: 'none',
    state: 'active',
    eligibility: 'valid',
    invalid_reason: null,
    orphan_reason: null,
    override_note: null,
    locked: false,
    ...changes,
  };
}

function workspace(
  revision: number,
  wisdom: number,
  allowLegacy: boolean,
): Workspace {
  const emptyHistory = {
    spellbook: [],
    prepared: [],
    ritual_only: [],
    explanation: 'No wizard spellbook.',
  };
  return {
    revision,
    report: {
      character: {
        id: 7,
        name: 'Persisted Planner',
        character_level: 1,
        proficiency_bonus: 2,
        abilities: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 14,
          wisdom,
          charisma: 10,
        },
      },
      caster: { caster_level: 1, slots: [], pact_magic: null },
      classes: [],
      preparation_callout: 'Class levels set preparation limits.',
      access_routes: [],
      duplicate_assessments: [],
      wizard: emptyHistory,
      invalid_selections: [],
      summary: {
        unique_spells: 1,
        access_routes: 1,
        warning_count: 0,
      },
    },
    classes: [],
    available_classes: [],
    allow_legacy: allowLegacy,
    configurable_sources: [],
    order_sources: [],
    source_catalog: { feat: [], species: [], background: [] },
    removable_sources: [],
    spell_lists: ['Cleric', 'Druid', 'Wizard'],
    slots: [
      slot(),
      slot({
        id: 2,
        source: 'Cleric 1',
        label: 'Prepared 1',
        spell_id: null,
        spell_name: null,
        spell_level: null,
        ritual: true,
        duplicate_status: 'wasteful',
        eligibility: 'unselected',
      }),
    ],
    save_points: [],
  };
}

const noHistory: OperationHistory = { operations: [], changes: [] };

describe('planner persisted workflow', () => {
  it('filters deterministically and refreshes persisted command, undo, and redo state', async () => {
    let persisted = {
      revision: 0,
      wisdom: 10,
      allowLegacy: false,
    };
    const queries: PlannerQueryClient = {
      workspace: async () =>
        workspace(
          persisted.revision,
          persisted.wisdom,
          persisted.allowLegacy,
        ),
      operationHistory: async () => noHistory,
      eligibleSpells: async () => [],
      createSavePoint: async () =>
        workspace(
          persisted.revision,
          persisted.wisdom,
          persisted.allowLegacy,
        ),
      savePointRestoreCommand: async () => ({
        type: 'update_ability',
        ability: 'wisdom',
        score: 10,
      }),
    };
    const commands: PlannerCommandClient = {
      execute: async (
        _characterId: number,
        expectedRevision: number,
        command: CharacterCommandPayload,
      ): Promise<CharacterCommandResult> => {
        expect(expectedRevision).toBe(persisted.revision);
        if (command.type !== 'update_ability') {
          throw new Error('Unexpected test command.');
        }
        const inverse: CharacterCommandPayload = {
          type: 'update_ability',
          ability: command.ability,
          score: persisted.wisdom,
        };
        persisted = {
          ...persisted,
          revision: persisted.revision + 1,
          wisdom: command.score,
        };
        return {
          inverse,
          revision: persisted.revision,
          idempotent_replay: false,
        };
      },
    };
    const session = new PlannerSession(7, queries, commands);
    await session.load();

    const filters = {
      ...defaultGridFilters,
      selection: 'empty' as const,
      trait: 'rituals' as const,
    };
    expect(
      filterAndSortSlots(session.workspace!.slots, filters).map(
        (item) => item.id,
      ),
    ).toEqual([2]);

    await session.execute({
      type: 'update_ability',
      ability: 'wisdom',
      score: 18,
    });
    expect(persisted).toEqual({
      revision: 1,
      wisdom: 18,
      allowLegacy: false,
    });
    expect(session.workspace?.report.character.abilities.wisdom).toBe(18);

    await session.undo();
    expect(persisted).toEqual({
      revision: 2,
      wisdom: 10,
      allowLegacy: false,
    });
    await session.redo();
    expect(persisted).toEqual({
      revision: 3,
      wisdom: 18,
      allowLegacy: false,
    });
  });
});
