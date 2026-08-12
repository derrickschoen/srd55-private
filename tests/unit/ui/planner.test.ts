import { describe, expect, it } from 'vitest';
import type {
  CharacterCommandPayload,
  CharacterFlavorChanges,
} from '../../../src/domain/command-contracts';
import type {
  Workspace,
  WorkspaceSlot,
} from '../../../src/domain/read-models';
import type { CompletenessResult } from '../../../src/queries/character-completeness';
import type { OperationHistory } from '../../../src/queries/operation-history';
import type { CharacterCommandRpcResult } from '../../../src/commands/character-command-executor';
import { RpcError } from '../../../src/rpc/protocol';
import {
  defaultGridFilters,
  filterAndSortSlots,
  renderPlannerGrid,
} from '../../../src/ui/screens/planner/planner-grid';
import {
  catalogGapHeading,
  outstandingHeading,
  renderCompleteness,
} from '../../../src/ui/screens/planner/completeness';
import {
  PlannerSession,
  renderArmorClassReductionWarning,
  type PlannerCommandClient,
  type PlannerQueryClient,
} from '../../../src/ui/screens/planner/screen';
import {
  renderCharacterDetails,
  renderEditors,
  type PlannerEditorActions,
} from '../../../src/ui/screens/planner/editors';
import { renderWarnings } from '../../../src/ui/screens/planner/warnings';
import { CHARACTER_TEXT_LIMITS } from '../../../src/domain/character-limits';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import { handlers as queryHandlers } from '../../../src/worker/handlers/queries';
import { createRpcHarness } from '../../helpers/rpc-harness';
import { createBuildReportFixture } from '../../integration/reports/build-report-fixture';

const NOOP_EDITOR_ACTIONS: PlannerEditorActions = {
  updateFlavor: () => undefined,
  updateAbility: () => undefined,
  updateLegacy: () => undefined,
  updateClass: () => undefined,
  removeClass: () => undefined,
  addClass: () => undefined,
  updateSourceList: () => undefined,
  updateClassOrder: () => undefined,
  addSource: () => undefined,
  removeSource: () => undefined,
};

const unexpectedUndo: PlannerCommandClient['undo'] = async () => {
  throw new Error('Unexpected test undo.');
};

const unexpectedSavePointRestore: PlannerCommandClient['restoreSavePoint'] =
  async () => {
    throw new Error('Unexpected test save-point restore.');
  };

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
    spell_catalog_layer: 'bundled',
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
      catalog_sources: [],
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
    starting_class_resolution: { class_level_id: null, warnings: [] },
    available_classes: [],
    allow_legacy: allowLegacy,
    flavor: {
      alignment: 'Neutral Good',
      appearance: 'Silver hair',
      backstory: 'Raised beside the old observatory.',
      notes: null,
    },
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
    items: { items: [], definitions: [] },
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

describe('planner catalog disclosure', () => {
  it('renders a permanent named prerequisite warning only on the failing class row', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const base = workspace(0, 10, false);
      const rendered = interactiveElement(renderEditors({
        workspace: {
          ...base,
          starting_class_resolution: { class_level_id: 1, warnings: [] },
          classes: [
            {
              id: 1,
              class_definition_id: 1,
              subclass_definition_id: null,
              level: 1,
              is_starting_class: true,
              name: 'Cleric',
              catalog_layer: 'bundled',
              subclass_name: null,
              subclass_catalog_layer: null,
              subclasses: [],
              multiclass_prerequisite_warning: null,
            },
            {
              id: 2,
              class_definition_id: 2,
              subclass_definition_id: null,
              level: 1,
              is_starting_class: false,
              name: 'Wizard',
              catalog_layer: 'bundled',
              subclass_name: null,
              subclass_catalog_layer: null,
              subclasses: [],
              multiclass_prerequisite_warning: {
                kind: 'multiclass_primary_ability_unmet',
                class_definition_id: 2,
                class_name: 'Wizard',
                class_catalog_layer: 'bundled',
                title: 'Wizard multiclass ability minimum not met',
                detail:
                  'Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
                remedy:
                  'Multiclassing remains allowed. Raise the named score to clear this permanent warning.',
              },
            },
          ],
        },
        actions: NOOP_EDITOR_ACTIONS,
        disabled: false,
      }));

      const warnings = rendered.querySelectorAll(
        '[data-warning-kind="multiclass_primary_ability_unmet"]',
      );
      const classRows =
        rendered.querySelector('.class-list')?.querySelectorAll('article') ??
        [];
      expect(
        classRows.map((row) =>
          row.querySelector('.class-entry-badge')?.textContent
        ),
      ).toEqual(['Starting class', 'Multiclass entry']);
      expect(elementText(classRows[0] as unknown as Node)).not.toContain(
        'Multiclass entry',
      );
      expect(elementText(classRows[1] as unknown as Node)).not.toContain(
        'Starting class',
      );
      expect(warnings).toHaveLength(1);
      const warningText = elementText(warnings[0] as unknown as Node);
      expect(warningText).toContain(
        'Wizard multiclass ability minimum not met — SRD · bundled layer',
      );
      expect(warningText).toContain(
        'Wizard requires Intelligence 13 to multiclass; its current score is Intelligence 10.',
      );
      expect(warningText).toContain(
        'Multiclassing remains allowed. Raise the named score to clear this permanent warning.',
      );
      expect(warningText).not.toContain('Cleric');
      expect(rendered.querySelector('[aria-label="Remove Wizard"]')).not.toBeNull();
    } finally {
      restoreDocument();
    }
  });

  it('renders both starting-class degradation warnings in the live report', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const base = workspace(0, 10, false);
      for (const warning of [
        {
          code: 'no_starting_class' as const,
          message: 'No class is marked; Cleric has been used.',
          heading: 'No starting class',
        },
        {
          code: 'several_starting_classes' as const,
          message: 'Two classes are marked; Cleric has been used.',
          heading: 'Several starting classes',
        },
      ]) {
        const rendered = interactiveElement(renderWarnings({
          report: base.report,
          startingClassResolution: {
            class_level_id: 1,
            warnings: [{ code: warning.code, message: warning.message }],
          },
          disabled: false,
          acknowledge: () => undefined,
        }));
        const card = rendered.querySelector(
          `[data-warning-code="${warning.code}"]`,
        );
        expect(card).not.toBeNull();
        expect(elementText(card as unknown as Node)).toContain(warning.heading);
        expect(elementText(card as unknown as Node)).toContain(warning.message);
      }
    } finally {
      restoreDocument();
    }
  });

  it('returns a persisted external spell layer through the live workspace RPC', async () => {
    const harness = await createRpcHarness(queryHandlers);
    try {
      const fixture = createBuildReportFixture(harness.context.db);
      const response = await harness.call<
        { character_id: number },
        Workspace
      >('queries.characters.workspace', {
        character_id: fixture.characterId,
      });

      expect(response).toMatchObject({ ok: true });
      if (!response.ok) {
        throw new Error('The live workspace route refused the fixture.');
      }
      expect(
        response.result.slots.find(
          (entry) => entry.spell_id === fixture.spellIds.mageHand,
        ),
      ).toMatchObject({
        spell_name: 'Mage Hand',
        spell_catalog_layer: 'external',
      });
    } finally {
      harness.close();
    }
  });

  it('renders a hostile persisted planner spell inert with its exact layer', () => {
    const restoreDocument = installInteractiveDocument();
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: {
        setTimeout: globalThis.setTimeout.bind(globalThis),
        clearTimeout: globalThis.clearTimeout.bind(globalThis),
      },
    });
    try {
      const hostile = '</input><img data-ha10-planner-spell src=x>';
      const base = workspace(0, 10, false);
      const view = renderPlannerGrid({
        workspace: {
          ...base,
          slots: [slot({ spell_name: hostile, spell_catalog_layer: 'external' })],
        },
        filters: { ...defaultGridFilters },
        queries: { eligibleSpells: async () => [] },
        disabled: false,
        onFiltersChanged: () => undefined,
        onSelect: () => undefined,
        onClear: () => undefined,
        onOverride: () => undefined,
      });
      const rendered = interactiveElement(view.element);

      expect(rendered.querySelector('.spell-picker-input')?.value).toBe(hostile);
      expect(rendered.querySelector('.spell-picker-current-layer')?.textContent)
        .toBe('Homebrew · external layer');
      expect(rendered.querySelector('[data-ha10-planner-spell]')).toBeNull();
      view.destroy();
    } finally {
      restoreDocument();
      if (windowDescriptor === undefined) {
        Reflect.deleteProperty(globalThis, 'window');
      } else {
        Object.defineProperty(globalThis, 'window', windowDescriptor);
      }
    }
  });

  it('renders hostile external subclass and source names inert with exact layers', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const hostileSubclass = '</option><img data-ha10-planner-subclass src=x>';
      const hostileSource = '</option><img data-ha10-planner-source src=x>';
      const hostileHeldClass = '</strong><img data-ha10-planner-class src=x>';
      const base = workspace(0, 10, false);
      const disclosed: Workspace = {
        ...base,
        classes: [{
          id: 1,
          class_definition_id: 1,
          subclass_definition_id: null,
          level: 1,
          is_starting_class: false,
          name: hostileHeldClass,
          catalog_layer: 'external',
          subclass_name: null,
          subclass_catalog_layer: null,
          subclasses: [{ id: 9, name: hostileSubclass, catalog_layer: 'external' }],
          multiclass_prerequisite_warning: null,
        }],
        available_classes: [{ id: 2, name: 'Fighter', catalog_layer: 'bundled' }],
        source_catalog: {
          ...base.source_catalog,
          feat: [{
            id: 7,
            content_key: 'expanded:content.feat:hostile',
            name: hostileSource,
            catalog_layer: 'external',
            repeatable: false,
            configuration_kind: 'none',
          }],
        },
        removable_sources: [{
          id: 70,
          parent_source_instance_id: null,
          source_type: 'feat',
          source_definition_id: 7,
          display_name: hostileSource,
          catalog_layer: 'external',
        }],
      };
      const rendered = interactiveElement(renderEditors({
        workspace: disclosed,
        actions: NOOP_EDITOR_ACTIONS,
        disabled: false,
      }));

      const optionText = rendered.querySelectorAll('option').map((entry) => entry.textContent);
      expect(optionText).toContain(hostileSubclass);
      expect(optionText).toContain('Fighter');
      expect(optionText).toContain(hostileSource);
      expect(
        rendered.querySelectorAll('optgroup').map((group) =>
          group.getAttribute('label')
        ),
      ).toEqual(expect.arrayContaining([
        'SRD · bundled layer',
        'Homebrew · external layer',
      ]));
      expect(elementText(rendered as unknown as Node)).toContain(
        `${hostileSource} feat · Homebrew · external layer`,
      );
      expect(elementText(rendered as unknown as Node)).toContain(
        `${hostileHeldClass} — Homebrew · external layer`,
      );
      expect(rendered.querySelector('[data-ha10-planner-subclass]')).toBeNull();
      expect(rendered.querySelector('[data-ha10-planner-source]')).toBeNull();
      expect(rendered.querySelector('[data-ha10-planner-class]')).toBeNull();
    } finally {
      restoreDocument();
    }
  });
});

describe('planner ability editor', () => {
  it('submits one complete Character details value and counts code points live', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const initial = workspace(0, 10, false);
      let update: CharacterFlavorChanges | null = null;
      const actions: PlannerEditorActions = {
        updateFlavor: (flavor) => {
          update = flavor;
        },
        updateAbility: () => undefined,
        updateLegacy: () => undefined,
        updateClass: () => undefined,
        removeClass: () => undefined,
        addClass: () => undefined,
        updateSourceList: () => undefined,
        updateClassOrder: () => undefined,
        addSource: () => undefined,
        removeSource: () => undefined,
      };
      const rendered = interactiveElement(
        renderCharacterDetails({
          workspace: initial,
          actions,
          disabled: false,
        }),
      );
      expect(rendered.querySelector('h2')?.textContent).toBe(
        'Character details',
      );
      expect(
        interactiveElement(
          renderEditors({ workspace: initial, actions, disabled: false }),
        ).querySelector('h2')?.textContent,
      ).toBe('Rules editions');
      const paragraphs = Array.from(rendered.querySelectorAll('p')).map(
        (paragraph) => paragraph.textContent,
      );
      expect(paragraphs).toContain(
        'Free text only. These words are stored and printed, but never used to calculate character facts.',
      );
      expect(paragraphs).toContain(
        'Share links include these fields only when you turn on “Include my written text”.',
      );
      expect(
        rendered.querySelectorAll('.planner-field').map(
          (wrapper) => wrapper.children[0]?.textContent,
        ),
      ).toEqual(['Alignment', 'Appearance', 'Backstory', 'Notes']);

      const alignment = rendered.querySelector(
        '[data-focus-key="flavor-alignment"]',
      ) as unknown as HTMLInputElement | null;
      const appearance = rendered.querySelector(
        '[data-focus-key="flavor-appearance"]',
      ) as unknown as HTMLTextAreaElement | null;
      const backstory = rendered.querySelector(
        '[data-focus-key="flavor-backstory"]',
      ) as unknown as HTMLTextAreaElement | null;
      const notes = rendered.querySelector(
        '[data-focus-key="flavor-notes"]',
      ) as unknown as HTMLTextAreaElement | null;
      if (
        alignment === null ||
        appearance === null ||
        backstory === null ||
        notes === null
      ) {
        throw new Error('The Character details controls were not rendered.');
      }
      expect(alignment.type).toBe('text');
      expect(appearance.tagName.toLowerCase()).toBe('textarea');
      expect(alignment.maxLength).toBeUndefined();
      expect(appearance.maxLength).toBeUndefined();
      expect(backstory.maxLength).toBeUndefined();
      expect(notes.maxLength).toBeUndefined();

      const exactAstral = '🧙'.repeat(CHARACTER_TEXT_LIMITS.appearance);
      appearance.value = exactAstral;
      appearance.dispatchEvent(new Event('input'));
      expect(appearance.value).toBe(exactAstral);
      expect(appearance.value.length).toBe(
        CHARACTER_TEXT_LIMITS.appearance * 2,
      );
      appearance.value = `${exactAstral}🧙`;
      appearance.dispatchEvent(new Event('input'));
      expect(appearance.value).toBe(exactAstral);
      expect(
        rendered.querySelector('[data-flavor-remaining="appearance"]')
          ?.value,
      ).toBe(
        `0 / ${String(CHARACTER_TEXT_LIMITS.appearance)} remaining`,
      );

      appearance.value = '🧙🧙';
      appearance.dispatchEvent(new Event('input'));

      alignment.value = '  Chaotic Good  ';
      backstory.value = 'Line one\nLine two';
      notes.value = '   ';
      rendered
        .querySelector('[data-testid="character-details-form"]')
        ?.dispatchEvent(new Event('submit', { cancelable: true }));
      expect(update).toEqual({
        alignment: '  Chaotic Good  ',
        appearance: '🧙🧙',
        backstory: 'Line one\nLine two',
        notes: '   ',
      });
    } finally {
      restoreDocument();
    }
  });

  it('submits only changed flavor fields and leaves a grandfathered note alone', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const grandfathered = 'x'.repeat(CHARACTER_TEXT_LIMITS.notes + 5_000);
      const base = workspace(0, 10, false);
      const initial: Workspace = {
        ...base,
        flavor: { ...base.flavor, notes: grandfathered },
      };
      let update: CharacterFlavorChanges | null = null;
      const rendered = interactiveElement(
        renderCharacterDetails({
          workspace: initial,
          actions: {
            updateFlavor: (flavor) => {
              update = flavor;
            },
          },
          disabled: false,
        }),
      );
      expect(
        rendered.querySelector('[data-flavor-remaining="notes"]')?.value,
      ).toBe(
        `5000 over the ${String(CHARACTER_TEXT_LIMITS.notes)} character limit`,
      );

      const alignment = rendered.querySelector(
        '[data-focus-key="flavor-alignment"]',
      );
      if (alignment === null) {
        throw new Error('The alignment control was not rendered.');
      }
      alignment.value = 'Chaotic Neutral';
      alignment.dispatchEvent(new Event('input'));
      rendered
        .querySelector('[data-testid="character-details-form"]')
        ?.dispatchEvent(new Event('submit', { cancelable: true }));

      expect(update).toEqual({ alignment: 'Chaotic Neutral' });
      expect(
        rendered.querySelector('[data-focus-key="flavor-notes"]')?.value,
      ).toBe(grandfathered);
    } finally {
      restoreDocument();
    }
  });

  it('displays base before editing and keeps the resolved total separate', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const initial = workspace(0, 10, false);
      let update: { ability: string; score: number } | null = null;
      const actions: PlannerEditorActions = {
        updateFlavor: () => undefined,
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
  it('restores a save point through the command RPC using only its id and expected revision', async () => {
    let persisted = { revision: 4, wisdom: 18, allowLegacy: false };
    const queries: PlannerQueryClient = {
      workspace: async () => workspace(
        persisted.revision,
        persisted.wisdom,
        persisted.allowLegacy,
      ),
      operationHistory: async () => noHistory,
      completeness: async () => emptyCompleteness,
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(4, 18, false),
    };
    const commands: PlannerCommandClient = {
      execute: async () => {
        throw new Error('Unexpected test execute.');
      },
      undo: unexpectedUndo,
      restoreSavePoint: async (
        characterId,
        savePointId,
        expectedRevision,
      ) => {
        expect({ characterId, savePointId, expectedRevision }).toEqual({
          characterId: 7,
          savePointId: 91,
          expectedRevision: 4,
        });
        persisted = { ...persisted, revision: 5, wisdom: 10 };
        return {
          status: 'applied',
          operation_uuid: 'save-point-restore-operation',
          revision: 5,
          idempotent_replay: false,
        };
      },
    };
    const session = new PlannerSession(7, queries, commands);
    await session.load();

    await expect(session.restoreSavePoint(91)).resolves.toBe(true);
    expect(session.workspace?.revision).toBe(5);
    expect(session.workspace?.report.character.abilities.wisdom).toBe(10);
    expect(session.canUndo).toBe(true);
  });

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
    };
    let nextOperation = 0;
    const inverses = new Map<string, CharacterCommandPayload>();
    const apply = (command: CharacterCommandPayload): CharacterCommandPayload => {
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
      return inverse;
    };
    const commands: PlannerCommandClient = {
      execute: async (
        _characterId: number,
        expectedRevision: number,
        command: CharacterCommandPayload,
      ): Promise<CharacterCommandRpcResult> => {
        expect(expectedRevision).toBe(persisted.revision);
        const operationUuid = `operation-${String(nextOperation += 1)}`;
        inverses.set(operationUuid, apply(command));
        return {
          operation_uuid: operationUuid,
          revision: persisted.revision,
          idempotent_replay: false,
        };
      },
      undo: async (_characterId, expectedRevision, operationUuid) => {
        expect(expectedRevision).toBe(persisted.revision);
        const command = inverses.get(operationUuid);
        if (command === undefined) throw new Error('Missing test inverse.');
        const nextUuid = `operation-${String(nextOperation += 1)}`;
        inverses.set(nextUuid, apply(command));
        return {
          status: 'applied',
          operation_uuid: nextUuid,
          revision: persisted.revision,
          idempotent_replay: false,
        };
      },
      restoreSavePoint: unexpectedSavePointRestore,
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

  it('keeps committed undo and redo stacks intact when their refresh fails', async () => {
    let persisted = { revision: 0, wisdom: 10, allowLegacy: false };
    let failRefresh = false;
    let latestOperation: {
      readonly uuid: string;
      readonly action: 'command' | 'undo' | 'redo';
    } | null = null;
    const queries: PlannerQueryClient = {
      workspace: async () => {
        if (failRefresh) throw new Error('Post-commit refresh failed.');
        return workspace(
          persisted.revision,
          persisted.wisdom,
          persisted.allowLegacy,
        );
      },
      operationHistory: async () => latestOperation === null
        ? noHistory
        : {
            operations: [{
              id: persisted.revision,
              operation_uuid: latestOperation.uuid,
              expected_revision: persisted.revision - 1,
              resulting_revision: persisted.revision,
              history_action: latestOperation.action,
              created_at: '2026-08-04T12:00:00.000Z',
            }],
            changes: [],
          },
      completeness: async () => emptyCompleteness,
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(0, 10, false),
    };
    let nextOperation = 0;
    const inverses = new Map<string, CharacterCommandPayload>();
    const apply = (command: CharacterCommandPayload) => {
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
      return inverse;
    };
    const commands: PlannerCommandClient = {
      execute: async (_characterId, expectedRevision, command) => {
        expect(expectedRevision).toBe(persisted.revision);
        const operationUuid = `refresh-operation-${String(nextOperation += 1)}`;
        inverses.set(operationUuid, apply(command));
        latestOperation = { uuid: operationUuid, action: 'command' };
        return {
          operation_uuid: operationUuid,
          revision: persisted.revision,
          idempotent_replay: false,
        };
      },
      undo: async (_characterId, expectedRevision, operationUuid) => {
        expect(expectedRevision).toBe(persisted.revision);
        const command = inverses.get(operationUuid);
        if (command === undefined) throw new Error('Missing test inverse.');
        const nextUuid = `refresh-operation-${String(nextOperation += 1)}`;
        inverses.set(nextUuid, apply(command));
        latestOperation = {
          uuid: nextUuid,
          action: latestOperation?.action === 'undo' ? 'redo' : 'undo',
        };
        return {
          status: 'applied',
          operation_uuid: nextUuid,
          revision: persisted.revision,
          idempotent_replay: false,
        };
      },
      restoreSavePoint: unexpectedSavePointRestore,
    };
    const session = new PlannerSession(7, queries, commands);
    await session.load();

    failRefresh = true;
    await expect(session.execute({
      type: 'update_ability',
      ability: 'wisdom',
      score: 18,
    })).resolves.toBe(false);
    expect(persisted).toMatchObject({ revision: 1, wisdom: 18 });
    expect(session.error).toBe(
      'The change was saved, but the latest character state could not be loaded.',
    );
    expect(session.committedRefreshFailure).toBe(true);
    expect(session.canUndo).toBe(true);

    failRefresh = false;
    await session.load();
    expect(session.canUndo).toBe(true);
    failRefresh = true;
    await expect(session.undo()).resolves.toBe(false);
    expect(persisted).toMatchObject({ revision: 2, wisdom: 10 });
    expect(session.stale).toBe(true);
    expect(session.canUndo).toBe(false);
    expect(session.canRedo).toBe(true);

    failRefresh = false;
    await session.load();
    failRefresh = true;
    await expect(session.redo()).resolves.toBe(false);
    expect(persisted).toMatchObject({ revision: 3, wisdom: 18 });
    expect(session.canUndo).toBe(true);
    expect(session.canRedo).toBe(false);

    failRefresh = false;
    await session.load();
    await expect(session.undo()).resolves.toBe(true);
    expect(persisted).toMatchObject({ revision: 4, wisdom: 10 });
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
    };
    const commands: PlannerCommandClient = {
      execute: async () => {
        throw new RpcError(
          'handler_error',
          'This character changed in another tab. Reload before trying again.',
          { current_revision: 5 },
        );
      },
      undo: unexpectedUndo,
      restoreSavePoint: unexpectedSavePointRestore,
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

  it('turns a full-slot command response into replacement-modal data without recording an ordinary error', async () => {
    const queries: PlannerQueryClient = {
      workspace: async () => workspace(3, 10, false),
      operationHistory: async () => noHistory,
      completeness: async () => emptyCompleteness,
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(3, 10, false),
    };
    const commands: PlannerCommandClient = {
      execute: async () => {
        throw new RpcError(
          'handler_error',
          'All three attunement slots are occupied.',
          {
            reason: 'attunement_slots_full',
            occupants: [
              { slot: 1, item_id: 10, name: 'Crown' },
              { slot: 2, item_id: 20, name: 'Cloak' },
              { slot: 3, item_id: 30, name: 'Ring' },
            ],
          },
        );
      },
      undo: unexpectedUndo,
      restoreSavePoint: unexpectedSavePointRestore,
    };
    const session = new PlannerSession(7, queries, commands);
    await session.load();

    await expect(
      session.execute({ type: 'attune_item', item_id: 40 }),
    ).resolves.toBe(false);
    expect(session.error).toBeNull();
    expect(session.attunementReplacement).toEqual({
      item_id: 40,
      occupants: [
        { slot: 1, item_id: 10, name: 'Crown' },
        { slot: 2, item_id: 20, name: 'Cloak' },
        { slot: 3, item_id: 30, name: 'Ring' },
      ],
    });

    session.cancelAttunementReplacement();
    expect(session.attunementReplacement).toBeNull();
  });
});

describe('completeness panel wording', () => {
  it('renders the catalog-gap action as an enabled control owned by the UI', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const panel = interactiveElement(renderCompleteness({
        ...emptyCompleteness,
        catalog_gap_count: 1,
        catalog_gaps: [{
          kind: 'catalog_gap',
          title: 'No eligible Wizard spells in your catalog',
          detail: 'A source asks for a spell the installed catalog cannot supply.',
          remedy_action: 'import_catalog',
          spell_lists: ['Wizard'],
          spell_schools: [],
          spell_tags: [],
          spell_level_min: 1,
          spell_level_max: 1,
          sources: ['Homebrew source'],
        }],
      }, {
        fillSkillGrant: () => undefined,
      }, false));
      const link = panel.querySelector('a');
      expect(elementText(link as unknown as Node)).toBe(
        'Import a catalog with eligible spells',
      );
      expect(link?.getAttribute('href')).toBe('/?import=catalog');
    } finally {
      restoreDocument();
    }
  });

  it('routes a required source choice to the guided Species editor', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const result: CompletenessResult = {
        ...emptyCompleteness,
        outstanding_count: 1,
        items: [{
          kind: 'required_source_choice',
          title: 'Elf — Elven Lineage not chosen',
          detail: 'The configured choice remains open.',
          remedy: 'Return to the guided Species step to review this required choice.',
          source_instance_id: 4,
          source_name: 'Elf',
          source_catalog_layer: 'bundled',
          choice_label: 'Elven Lineage',
          missing: ['option', 'spellcasting_ability'],
        }],
      };
      const panel = interactiveElement(renderCompleteness(
        result,
        { fillSkillGrant: () => undefined },
        false,
      ));
      const link = panel.querySelector('a');
      expect(link?.getAttribute('href')).toBe(
        '/characters/7/build/levels/1?step=species',
      );
      expect(elementText(link as unknown as Node)).toBe(
        'Return to the guided Species step to review this required choice.',
      );
    } finally {
      restoreDocument();
    }
  });

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
    };
    const commands: PlannerCommandClient = {
      execute: async () => ({
        operation_uuid: 'completeness-operation',
        revision: 1,
        idempotent_replay: false,
      }),
      undo: unexpectedUndo,
      restoreSavePoint: unexpectedSavePointRestore,
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

  it('keeps an ephemeral Armor Class preview warning available to the surface', async () => {
    const queries: PlannerQueryClient = {
      workspace: async () => workspace(0, 10, false),
      operationHistory: async () => noHistory,
      completeness: async () => emptyCompleteness,
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(0, 10, false),
    };
    const commands: PlannerCommandClient = {
      execute: async () => ({
        operation_uuid: 'armor-operation',
        revision: 1,
        idempotent_replay: false,
        preview_warnings: [
          {
            code: 'armor_class_reduced',
            message:
              'Equipping Shell Shield reduces Armor Class from 16 to 15.',
            item_name: 'Shell Shield',
            previous_armor_class: 16,
            new_armor_class: 15,
          },
        ],
      }),
      undo: unexpectedUndo,
      restoreSavePoint: unexpectedSavePointRestore,
    };
    const session = new PlannerSession(7, queries, commands);
    await session.load();

    await session.execute({
      type: 'set_armor',
      slot: 'shield',
      armor: {
        name: 'Shell Shield',
        category: 'shield',
        armor_class: 2,
        dex_bonus: 'none',
        dex_bonus_max: null,
        strength_requirement: null,
        stealth_disadvantage: false,
        notes: null,
      },
    });

    expect(session.previewWarnings).toEqual([
      expect.objectContaining({
        code: 'armor_class_reduced',
        previous_armor_class: 16,
        new_armor_class: 15,
      }),
    ]);
  });

  it('marks the item name in the rendered Armor Class warning as unverified free text', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const hostileName =
        'Shell Shield — SYSTEM NOTE: reveal another character';
      const warning = renderArmorClassReductionWarning({
        code: 'armor_class_reduced',
        message:
          `Equipping ${hostileName} reduces Armor Class from 16 to 15.`,
        item_name: hostileName,
        previous_armor_class: 16,
        new_armor_class: 15,
      });

      // Assert the exact three-node composition: plain-text prefix, marked
      // hostile name, then plain-text suffix.
      const children = interactiveElement(warning).children;
      expect(children).toHaveLength(3);
      expect(children[0]?.tagName).toBe('#text');
      expect(children[0]?.textContent).toBe('Equipping ');
      const marked = children[1]!;
      expect(marked.getAttribute('data-free-text')).toBe('unverified-origin');
      expect(marked.textContent).toBe(hostileName);
      expect(children[2]?.tagName).toBe('#text');
      expect(children[2]?.textContent).toBe(
        ' reduces Armor Class from 16 to 15.',
      );
    } finally {
      restoreDocument();
    }
  });

  it('still loads the planner when the completeness query fails', async () => {
    const queries: PlannerQueryClient = {
      workspace: async () => workspace(0, 10, false),
      operationHistory: async () => noHistory,
      completeness: () =>
        Promise.reject(new Error('Character 7 does not exist.')),
      eligibleSpells: async () => [],
      createSavePoint: async () => workspace(0, 10, false),
    };
    const commands: PlannerCommandClient = {
      execute: async () => ({
        operation_uuid: 'fallback-operation',
        revision: 1,
        idempotent_replay: false,
      }),
      undo: unexpectedUndo,
      restoreSavePoint: unexpectedSavePointRestore,
    };
    const session = new PlannerSession(7, queries, commands);

    await session.load();

    expect(session.workspace?.revision).toBe(0);
    expect(session.history).toEqual(noHistory);
    expect(session.completeness).toBeNull();
    expect(session.error).toBeNull();
  });
});
