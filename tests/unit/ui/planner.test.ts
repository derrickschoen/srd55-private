import { describe, expect, it } from 'vitest';
import type { CharacterCommandPayload } from '../../../src/domain/command-contracts';
import type {
  Workspace,
  WorkspaceSlot,
} from '../../../src/domain/read-models';
import type { CompletenessResult } from '../../../src/queries/character-completeness';
import type { OperationHistory } from '../../../src/queries/operation-history';
import type { CharacterCommandResult } from '../../../src/commands/character-command-executor';
import { RpcError } from '../../../src/rpc/protocol';
import {
  defaultGridFilters,
  filterAndSortSlots,
} from '../../../src/ui/screens/planner/planner-grid';
import {
  catalogGapHeading,
  outstandingHeading,
} from '../../../src/ui/screens/planner/completeness';
import {
  PlannerSession,
  type PlannerCommandClient,
  type PlannerQueryClient,
} from '../../../src/ui/screens/planner/screen';
import {
  renderEditors,
  type PlannerEditorActions,
} from '../../../src/ui/screens/planner/editors';
import {
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

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
          intelligence: 17,
          wisdom,
          charisma: 10,
        },
        abilities_base: {
          strength: 10,
          dexterity: 10,
          constitution: 10,
          intelligence: 15,
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
    weapons: {
      weapons: [],
      templates: [],
      allowance: { state: 'none', classes: [] },
      selected_count: 0,
      attacks: {
        weapons: [],
        warnings: [],
        attacks_per_action: 1,
        has_extra_attack: false,
      },
    },
  };
}

const noHistory: OperationHistory = { operations: [], changes: [] };

const emptyCompleteness: CompletenessResult = {
  character_id: 7,
  outstanding_count: 0,
  catalog_gap_count: 0,
  items: [],
  catalog_gaps: [],
};

describe('planner ability editor', () => {
  it('displays base before editing and keeps the resolved total separate', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const initial = workspace(0, 10, false);
      let update: { ability: string; score: number } | null = null;
      const actions: PlannerEditorActions = {
        updateAbility: (ability, score) => {
          update = { ability, score };
        },
        updateLegacy: () => undefined,
        updateClass: () => undefined,
        removeClass: () => undefined,
        addClass: () => undefined,
        updateSourceList: () => undefined,
        updateClassOrder: () => undefined,
        addSource: () => undefined,
        removeSource: () => undefined,
      };
      const firstRender = interactiveElement(
        renderEditors({ workspace: initial, actions, disabled: false }),
      );
      const intelligence = firstRender.querySelector(
        '[data-focus-key="ability-intelligence"]',
      );
      if (intelligence === null) {
        throw new Error('The planner did not render the Intelligence editor.');
      }

      // LOAD-BEARING PRE-EDIT OBSERVABLE: base 15 plus a +2 contribution
      // resolves to 17. Reading resolved totals in the editor changes this
      // value to 17 before the user has edited anything.
      expect(intelligence.value).toBe('15');
      expect(firstRender.querySelector('.ability-total')?.textContent).toBe(
        'total 17 (+3)',
      );

      intelligence.value = '16';
      intelligence.dispatchEvent(new Event('change'));
      expect(update).toEqual({ ability: 'intelligence', score: 16 });

      const refreshed = workspace(1, 10, false);
      refreshed.report.character.abilities_base.intelligence = 16;
      refreshed.report.character.abilities.intelligence = 18;
      const secondRender = interactiveElement(
        renderEditors({ workspace: refreshed, actions, disabled: false }),
      );
      expect(
        secondRender.querySelector(
          '[data-focus-key="ability-intelligence"]',
        )?.value,
      ).toBe('16');
      expect(secondRender.querySelector('.ability-total')?.textContent).toBe(
        'total 18 (+4)',
      );
    } finally {
      restoreDocument();
    }
  });
});

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
      completeness: async () => emptyCompleteness,
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

  it('marks revision conflicts stale and preserves durable state for reload', async () => {
    const durable = {
      revision: 4,
      wisdom: 16,
      allowLegacy: false,
    };
    const queries: PlannerQueryClient = {
      workspace: async () =>
        workspace(
          durable.revision,
          durable.wisdom,
          durable.allowLegacy,
        ),
      operationHistory: async () => noHistory,
      completeness: async () => emptyCompleteness,
      eligibleSpells: async () => [],
      createSavePoint: async () =>
        workspace(
          durable.revision,
          durable.wisdom,
          durable.allowLegacy,
        ),
      savePointRestoreCommand: async () => ({
        type: 'update_ability',
        ability: 'wisdom',
        score: 10,
      }),
    };
    const commands: PlannerCommandClient = {
      execute: async () => {
        throw new RpcError(
          'handler_error',
          'This character changed in another tab. Reload before trying again.',
          { current_revision: 5 },
        );
      },
    };
    const session = new PlannerSession(7, queries, commands);
    await session.load();

    await expect(
      session.execute({
        type: 'update_ability',
        ability: 'wisdom',
        score: 18,
      }),
    ).resolves.toBe(false);

    expect(session.stale).toBe(true);
    expect(session.error).toBe(
      'This character changed in another tab. Reload before trying again.',
    );
    expect(durable).toEqual({
      revision: 4,
      wisdom: 16,
      allowLegacy: false,
    });
    expect(session.workspace?.revision).toBe(4);
  });
});

describe('completeness panel wording', () => {
  it('states the count in words and stays free of warning vocabulary', () => {
    expect(outstandingHeading(null)).toBe(
      'Not chosen yet — unavailable for this character.',
    );
    expect(outstandingHeading(0)).toBe(
      'Not chosen yet — nothing outstanding.',
    );
    expect(outstandingHeading(1)).toBe('Not chosen yet — 1 item');
    expect(outstandingHeading(3)).toBe('Not chosen yet — 3 items');
    expect(catalogGapHeading(1)).toBe('Catalog gaps — 1 item');
    expect(catalogGapHeading(2)).toBe('Catalog gaps — 2 items');
    for (const heading of [
      outstandingHeading(0),
      outstandingHeading(3),
      catalogGapHeading(1),
    ]) {
      expect(heading).not.toMatch(/warning|⚠|✓/i);
    }
  });

  it('loads completeness alongside the workspace and refreshes it after a command', async () => {
    let built = 0;
    const queries: PlannerQueryClient = {
      workspace: async () => workspace(0, 10, false),
      operationHistory: async () => noHistory,
      completeness: async () => {
        built += 1;
        return { ...emptyCompleteness, outstanding_count: built };
      },
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(0, 10, false),
      savePointRestoreCommand: async () => ({
        type: 'update_ability',
        ability: 'wisdom',
        score: 10,
      }),
    };
    const commands: PlannerCommandClient = {
      execute: async () => ({
        inverse: { type: 'update_ability', ability: 'wisdom', score: 10 },
        revision: 1,
        idempotent_replay: false,
      }),
    };
    const session = new PlannerSession(7, queries, commands);

    await session.load();
    expect(session.completeness?.outstanding_count).toBe(1);

    await session.execute({
      type: 'update_ability',
      ability: 'wisdom',
      score: 12,
    });
    expect(session.completeness?.outstanding_count).toBe(2);
  });

  it('still loads the planner when the completeness query fails', async () => {
    const queries: PlannerQueryClient = {
      workspace: async () => workspace(0, 10, false),
      operationHistory: async () => noHistory,
      completeness: () =>
        Promise.reject(new Error('Character 7 does not exist.')),
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(0, 10, false),
      savePointRestoreCommand: async () => ({
        type: 'update_ability',
        ability: 'wisdom',
        score: 10,
      }),
    };
    const commands: PlannerCommandClient = {
      execute: async () => ({
        inverse: { type: 'update_ability', ability: 'wisdom', score: 10 },
        revision: 1,
        idempotent_replay: false,
      }),
    };
    const session = new PlannerSession(7, queries, commands);

    await session.load();

    expect(session.workspace?.revision).toBe(0);
    expect(session.history).toEqual(noHistory);
    expect(session.completeness).toBeNull();
    expect(session.error).toBeNull();
  });
});
