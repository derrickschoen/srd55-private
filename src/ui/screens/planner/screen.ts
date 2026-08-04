import './styles.css';
import type { CharacterCommandPayload } from '../../../domain/command-contracts';
import type {
  Ability,
  StandaloneSourceType,
} from '../../../domain/enums';
import type { JsonObject } from '../../../domain/models';
import type {
  CharacterClass,
  Workspace,
  WorkspaceSlot,
} from '../../../domain/read-models';
import type {
  CharacterCommandPreviewWarning,
  CharacterCommandResult,
} from '../../../commands/character-command-executor';
import { createCommandsClient } from '../../../commands/client';
import type {
  CompletenessResult,
} from '../../../queries/character-completeness';
import {
  createQueriesClient,
  type QueriesClient,
} from '../../../queries/client';
import type { OperationHistory } from '../../../queries/operation-history';
import { RpcError } from '../../../rpc/protocol';
import { freeTextSpan } from '../../free-text';
import { defineScreen } from '../../screen';
import type { ScreenContext } from '../../screen';
import { buildAgentReference } from './agent-reference';
import { renderAgentReference } from './agent-reference-panel';
import { renderCompleteness } from './completeness';
import { renderDiceHelper } from './dice';
import {
  renderEditors,
  type PlannerEditorActions,
} from './editors';
import {
  defaultGridFilters,
  renderPlannerGrid,
  type GridFilters,
} from './planner-grid';
import {
  renderHistory,
  type PlannerHistoryActions,
} from './history';
import { renderWarnings } from './warnings';
import {
  renderWeapons,
  type PlannerWeaponActions,
} from './weapons';
import type {
  ItemFields,
  WeaponFields,
} from '../../../domain/command-contracts';
import type {
  AttunementOccupant,
  AttunementSlot,
} from '../../../domain/attunement';
import {
  activateAttunementReplacementModal, renderItems, type AttunementReplacement,
  type PlannerItemActions,
} from './items';

export interface PlannerCommandClient {
  execute(
    characterId: number,
    expectedRevision: number,
    command: CharacterCommandPayload,
    operationUuid?: string,
  ): Promise<CharacterCommandResult>;
}

export interface PlannerQueryClient
  extends Pick<
    QueriesClient,
    | 'workspace'
    | 'completeness'
    | 'eligibleSpells'
    | 'createSavePoint'
    | 'savePointRestoreCommand'
    | 'operationHistory'
  > {}

export class PlannerSession {
  workspace: Workspace | null = null;
  completeness: CompletenessResult | null = null;
  history: OperationHistory | null = null;
  saving = false;
  error: string | null = null;
  stale = false;
  previewWarnings: readonly CharacterCommandPreviewWarning[] = [];
  attunementReplacement: AttunementReplacement | null = null;
  readonly #undo: CharacterCommandPayload[] = [];
  readonly #redo: CharacterCommandPayload[] = [];

  constructor(
    readonly characterId: number,
    readonly queries: PlannerQueryClient,
    readonly commands: PlannerCommandClient,
  ) {}

  get canUndo(): boolean {
    return this.#undo.length > 0 && !this.saving;
  }

  get canRedo(): boolean {
    return this.#redo.length > 0 && !this.saving;
  }

  async load(): Promise<void> {
    await this.#refresh();
  }

  async execute(command: CharacterCommandPayload): Promise<boolean> {
    if (this.saving || this.workspace === null) return false;
    this.saving = true;
    this.error = null;
    this.previewWarnings = [];
    try {
      const result = await this.commands.execute(
        this.characterId,
        this.workspace.revision,
        command,
      );
      this.#undo.push(result.inverse);
      this.#redo.length = 0;
      this.previewWarnings = result.preview_warnings ?? [];
      this.attunementReplacement = null;
      await this.#refresh();
      return true;
    } catch (error) {
      const replacement = attunementReplacement(error, command);
      if (replacement !== null) {
        this.attunementReplacement = replacement;
        return false;
      }
      this.#recordError(error, 'The change could not be saved.');
      return false;
    } finally {
      this.saving = false;
    }
  }

  cancelAttunementReplacement(): void {
    this.attunementReplacement = null;
  }

  async undo(): Promise<boolean> {
    if (!this.canUndo || this.workspace === null) return false;
    const command = this.#undo.pop();
    if (command === undefined) return false;
    this.saving = true;
    this.error = null;
    this.previewWarnings = [];
    try {
      const result = await this.commands.execute(
        this.characterId,
        this.workspace.revision,
        command,
      );
      this.#redo.push(result.inverse);
      this.previewWarnings = result.preview_warnings ?? [];
      await this.#refresh();
      return true;
    } catch (error) {
      this.#undo.push(command);
      this.#recordError(error, 'Undo failed.');
      return false;
    } finally {
      this.saving = false;
    }
  }

  async redo(): Promise<boolean> {
    if (!this.canRedo || this.workspace === null) return false;
    const command = this.#redo.pop();
    if (command === undefined) return false;
    this.saving = true;
    this.error = null;
    this.previewWarnings = [];
    try {
      const result = await this.commands.execute(
        this.characterId,
        this.workspace.revision,
        command,
      );
      this.#undo.push(result.inverse);
      this.previewWarnings = result.preview_warnings ?? [];
      await this.#refresh();
      return true;
    } catch (error) {
      this.#redo.push(command);
      this.#recordError(error, 'Redo failed.');
      return false;
    } finally {
      this.saving = false;
    }
  }

  async createSavePoint(label: string): Promise<boolean> {
    if (this.saving) return false;
    this.saving = true;
    this.error = null;
    try {
      this.workspace = await this.queries.createSavePoint(
        this.characterId,
        label.trim(),
      );
      this.history = await this.queries.operationHistory(
        this.characterId,
      );
      return true;
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : 'Save point failed.';
      return false;
    } finally {
      this.saving = false;
    }
  }

  async restoreSavePoint(id: number): Promise<boolean> {
    try {
      const command = await this.queries.savePointRestoreCommand(
        this.characterId,
        id,
      );
      return await this.execute(command);
    } catch (error) {
      this.error =
        error instanceof Error
          ? error.message
          : 'Save point restore failed.';
      return false;
    }
  }

  async #refresh(): Promise<void> {
    const [workspace, history, completeness] = await Promise.all([
      this.queries.workspace(this.characterId),
      this.queries.operationHistory(this.characterId),
      // Completeness is an informational adjunct. Losing it must never cost
      // the user the planner itself, so it degrades to an unavailable panel.
      this.queries.completeness(this.characterId).then(
        (result) => result,
        () => null,
      ),
    ]);
    this.workspace = workspace;
    this.history = history;
    this.completeness = completeness;
  }

  #recordError(error: unknown, fallback: string): void {
    this.error = error instanceof Error ? error.message : fallback;
    if (
      error instanceof RpcError &&
      error.code === 'handler_error' &&
      error.data !== null &&
      typeof error.data === 'object' &&
      !Array.isArray(error.data) &&
      Number.isSafeInteger(error.data.current_revision)
    ) {
      this.stale = true;
    }
  }
}

function attunementReplacement(
  error: unknown,
  command: CharacterCommandPayload,
): AttunementReplacement | null {
  if (
    command.type !== 'attune_item' ||
    !(error instanceof RpcError) ||
    error.code !== 'handler_error' ||
    error.data === null ||
    typeof error.data !== 'object' ||
    Array.isArray(error.data) ||
    error.data.reason !== 'attunement_slots_full' ||
    !Array.isArray(error.data.occupants)
  ) {
    return null;
  }
  const occupants: AttunementOccupant[] = [];
  for (const value of error.data.occupants) {
    if (
      value === null ||
      typeof value !== 'object' ||
      Array.isArray(value) ||
      ![1, 2, 3].includes(Number(value.slot)) ||
      !Number.isSafeInteger(value.item_id) ||
      Number(value.item_id) < 1 ||
      typeof value.name !== 'string'
    ) {
      return null;
    }
    occupants.push({
      slot: Number(value.slot) as AttunementSlot,
      item_id: Number(value.item_id),
      name: value.name,
    });
  }
  return occupants.length === 3
    ? { item_id: command.item_id, occupants }
    : null;
}

function routeCharacterId(context: ScreenContext): number {
  const value = Number(context.route.segments[1]);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Invalid character route.');
  }
  return value;
}

function confirmAction(message: string, action: () => void): void {
  if (window.confirm(message)) action();
}

function restoreFocus(root: HTMLElement, focusKey: string): void {
  const focusTarget = root.querySelector<HTMLElement>(
    `[data-focus-key="${CSS.escape(focusKey)}"]`,
  );
  focusTarget?.focus();
  if (
    focusTarget instanceof HTMLInputElement &&
    ['text', 'search', 'tel', 'url', 'password', 'email'].includes(
      focusTarget.type,
    )
  ) {
    focusTarget.setSelectionRange(
      focusTarget.value.length,
      focusTarget.value.length,
    );
  }
}

/**
 * The warning is assembled from structured fields so the item name remains in
 * its own provenance-marked node rather than disappearing into an unmarked
 * pre-composed sentence.
 */
export function renderArmorClassReductionWarning(
  warning: CharacterCommandPreviewWarning,
): HTMLDivElement {
  const banner = document.createElement('div');
  banner.className = 'planner-preview-warning';
  banner.setAttribute('role', 'status');
  banner.dataset.testid = 'armor-class-reduction-warning';
  banner.append(
    'Equipping ',
    freeTextSpan(warning.item_name),
    ` reduces Armor Class from ${String(warning.previous_armor_class)} ` +
      `to ${String(warning.new_armor_class)}.`,
  );
  return banner;
}

/**
 * Which weapon form is open, if any.
 *
 * Held next to the grid filters rather than in the session, for the same reason
 * they are: it is view state, it must survive a re-render, and it must NOT
 * survive navigating away.
 */
export type WeaponEditing = number | 'new' | null;
export type ItemEditing = number | 'new' | null;

interface PlannerViewState {
  readonly filters: GridFilters;
  weaponEditing: WeaponEditing;
  itemEditing: ItemEditing;
  attunementReplacementInvokerFocusKey: string | null;
}

function renderPlanner(
  context: ScreenContext,
  session: PlannerSession,
  view: PlannerViewState,
  rerender: () => void,
): () => void {
  const filters = view.filters;
  const workspace = session.workspace;
  if (workspace === null) throw new Error('Planner workspace is not loaded.');
  const priorFocus = (
    context.root.contains(document.activeElement)
      ? document.activeElement
      : null
  ) as HTMLElement | null;
  const focusKey = priorFocus?.dataset.focusKey;
  context.root.replaceChildren();
  const shell = document.createElement('div');
  shell.className = 'planner-shell';
  const header = document.createElement('header');
  header.className = 'planner-header';
  const identity = document.createElement('div');
  const home = document.createElement('a');
  home.href = '/';
  home.textContent = '← Characters';
  home.addEventListener('click', (event) => {
    event.preventDefault();
    context.router.navigate('/');
  });
  const heading = document.createElement('h1');
  // The name can have arrived in a share link somebody else wrote, and nothing
  // records which. Mark it where it is rendered rather than filtering it.
  heading.append(freeTextSpan(workspace.report.character.name));
  const subtitle = document.createElement('p');
  subtitle.textContent =
    `Level ${
      workspace.report.character.character_level === null
        ? 'undetermined'
        : String(workspace.report.character.character_level)
    } · revision ${workspace.revision}`;
  identity.append(home, heading, subtitle);
  const status = document.createElement('output');
  status.id = 'planner-status';
  status.setAttribute('role', 'status');
  status.dataset.ready = 'true';
  status.value = session.saving ? 'Saving…' : 'Autosaved';
  const sheet = document.createElement('a');
  sheet.href = `/characters/${session.characterId}/sheet`;
  sheet.className = 'button-secondary';
  sheet.textContent = 'Character sheet';
  const actions = document.createElement('div');
  actions.className = 'planner-header-actions';
  actions.append(status, sheet);
  header.append(identity, actions);
  shell.append(header);
  if (session.error !== null) {
    const error = document.createElement('div');
    error.className = 'planner-error';
    error.setAttribute('role', 'alert');
    error.textContent = `Could not save: ${session.error}`;
    if (session.stale) {
      const reload = document.createElement('a');
      reload.href = `/characters/${session.characterId}`;
      reload.textContent = 'Reload this character';
      error.append(' ', reload);
    }
    shell.append(error);
  }
  for (const warning of session.previewWarnings) {
    shell.append(renderArmorClassReductionWarning(warning));
  }
  if ((workspace.placeholder_spells?.length ?? 0) > 0) {
    const placeholderBanner = document.createElement('div');
    placeholderBanner.className = 'placeholder-banner';
    placeholderBanner.setAttribute('role', 'status');
    // These names came from the share link itself, so they are marked in place.
    placeholderBanner.append('Shared spell data not imported: ');
    (workspace.placeholder_spells ?? []).forEach((spell, index) => {
      if (index > 0) placeholderBanner.append(', ');
      placeholderBanner.append(freeTextSpan(spell.name));
    });
    placeholderBanner.append(
      '. These inactive placeholders contain no rules text. Import the matching catalog to upgrade them.',
    );
    shell.append(placeholderBanner);
  }
  const layout = document.createElement('main');
  layout.className = 'planner-layout';
  const primary = document.createElement('div');
  primary.className = 'planner-primary';
  const mutate = async (
    operation: () => Promise<boolean>,
  ): Promise<void> => {
    const activeFocusKey = (
      document.activeElement as HTMLElement | null
    )?.dataset.focusKey;
    const replacingAttunedItem = session.attunementReplacement !== null;
    const mutationFocusKey = replacingAttunedItem
      ? view.attunementReplacementInvokerFocusKey ?? undefined
      : activeFocusKey;
    const pending = operation();
    rerender();
    await pending;
    if (
      !replacingAttunedItem &&
      session.attunementReplacement !== null &&
      mutationFocusKey !== undefined
    ) {
      view.attunementReplacementInvokerFocusKey = mutationFocusKey;
    }
    rerender();
    if (
      mutationFocusKey !== undefined &&
      session.attunementReplacement === null &&
      context.root.querySelector('.planner-shell') !== null
    ) {
      restoreFocus(context.root, mutationFocusKey);
      if (replacingAttunedItem) {
        view.attunementReplacementInvokerFocusKey = null;
      }
    }
  };
  primary.append(
    renderCompleteness(
      session.completeness,
      {
        fillSkillGrant: (grantId, skill) =>
          void mutate(() =>
            session.execute({
              type: 'fill_skill_grant',
              grant_id: grantId,
              skill,
            }),
          ),
      },
      session.saving,
    ),
    renderAgentReference(
      buildAgentReference(workspace, session.completeness),
    ),
    renderDiceHelper(
      workspace.slots,
      workspace.report.character.character_level,
      workspace.report.character.abilities,
    ),
  );
  const editorActions: PlannerEditorActions = {
    updateAbility: (ability: Ability, score: number) =>
      void mutate(() =>
        session.execute({
          type: 'update_ability',
          ability,
          score,
        }),
      ),
    updateLegacy: (allowLegacy: boolean) =>
      void mutate(() =>
        session.execute({
          type: 'update_character_rules',
          allow_legacy: allowLegacy,
        }),
      ),
    // `level` is gone from `update_class` (level-up plan §3): the planner can
    // set a subclass, enter a class at level 1, or remove one — levelling
    // belongs to the one guarded `level_up_class` path.
    updateClass: (
      entry: CharacterClass,
      changes: {
        subclass_definition_id?: number | null;
      },
    ) =>
      void mutate(() =>
        session.execute({
          type: 'update_class',
          class_definition_id: entry.class_definition_id,
          subclass_definition_id:
            changes.subclass_definition_id === undefined
              ? entry.subclass_definition_id
              : changes.subclass_definition_id,
        }),
      ),
    removeClass: (entry: CharacterClass) =>
      confirmAction(
        `Remove ${entry.name} and orphan its spell choices?`,
        () =>
          void mutate(() =>
            session.execute({
              type: 'update_class',
              class_definition_id: entry.class_definition_id,
              remove: true,
            }),
          ),
      ),
    addClass: (classDefinitionId: number) =>
      void mutate(() =>
        session.execute({
          type: 'update_class',
          class_definition_id: classDefinitionId,
          subclass_definition_id: null,
        }),
      ),
    updateSourceList: (sourceId: number, list: string) =>
      void mutate(() =>
        session.execute({
          type: 'update_source_config',
          source_instance_id: sourceId,
          chosen_list: list,
        }),
      ),
    updateClassOrder: (sourceId: number, option: string) =>
      void mutate(() =>
        session.execute({
          type: 'update_source_config',
          source_instance_id: sourceId,
          chosen_option: option,
        }),
      ),
    addSource: (
      sourceType: StandaloneSourceType,
      sourceDefinitionId: number,
      config: JsonObject,
    ) =>
      void mutate(() =>
        session.execute({
          type: 'add_source',
          source_type: sourceType,
          source_definition_id: sourceDefinitionId,
          config,
        }),
      ),
    removeSource: (sourceId: number, displayName: string) =>
      confirmAction(
        `Remove ${displayName}? Its spell choices will be preserved as orphaned slots until you undo or replace them.`,
        () =>
          void mutate(() =>
            session.execute({
              type: 'remove_source',
              source_instance_id: sourceId,
            }),
          ),
      ),
  };
  primary.append(
    renderEditors({
      workspace,
      actions: editorActions,
      disabled: session.saving,
    }),
  );
  const weaponActions: PlannerWeaponActions = {
    addWeapon: (weapon: WeaponFields) =>
      void mutate(() => session.execute({ type: 'add_weapon', weapon })),
    updateWeapon: (weaponId: number, weapon: WeaponFields) =>
      void mutate(() =>
        session.execute({
          type: 'update_weapon',
          weapon_id: weaponId,
          weapon,
        }),
      ),
    removeWeapon: (weaponId: number, name: string) =>
      confirmAction(`Remove ${name} from this character?`, () =>
        void mutate(() =>
          session.execute({ type: 'remove_weapon', weapon_id: weaponId }),
        ),
      ),
    setWeaponMastery: (weaponId: number, selected: boolean) =>
      void mutate(() =>
        session.execute({
          type: 'set_weapon_mastery',
          weapon_id: weaponId,
          selected,
        }),
      ),
  };
  primary.append(
    renderWeapons({
      panel: workspace.weapons,
      actions: weaponActions,
      disabled: session.saving,
      editing: view.weaponEditing,
      onEditingChanged: (editing) => {
        view.weaponEditing = editing;
        rerender();
      },
    }),
  );
  const itemActions: PlannerItemActions = {
    addItem: (item: ItemFields) =>
      void mutate(() => session.execute({ type: 'add_item', item })),
    updateItem: (itemId: number, item: ItemFields) =>
      void mutate(() =>
        session.execute({ type: 'update_item', item_id: itemId, item }),
      ),
    removeItem: (itemId: number, name: string) =>
      confirmAction(`Remove ${name} from this character?`, () =>
        void mutate(() =>
          session.execute({ type: 'remove_item', item_id: itemId }),
        ),
      ),
    updateQuantity: (itemId, quantity) => {
      const item = workspace.items.items.find((candidate) => candidate.id === itemId);
      if (item === undefined) return;
      void mutate(() =>
        session.execute({
          type: 'update_item',
          item_id: itemId,
          item: {
            name: item.name,
            description: item.description,
            quantity,
            requires_attunement: item.requires_attunement,
            source_instance_id: item.source_instance_id,
          },
        }),
      );
    },
    attune: (itemId) =>
      void mutate(() =>
        session.execute({ type: 'attune_item', item_id: itemId }),
      ),
    unattune: (itemId) =>
      void mutate(() =>
        session.execute({ type: 'unattune_item', item_id: itemId }),
      ),
    replace: (itemId, replacedItemId) =>
      void mutate(() =>
        session.execute({
          type: 'replace_attuned_item',
          item_id: itemId,
          replaced_item_id: replacedItemId,
        }),
      ),
    cancelReplacement: () => {
      session.cancelAttunementReplacement();
      rerender();
    },
  };
  primary.append(
    renderItems({
      panel: workspace.items,
      replacement: session.attunementReplacement,
      actions: itemActions,
      disabled: session.saving,
      editing: view.itemEditing,
      onEditingChanged: (editing) => {
        view.itemEditing = editing;
        rerender();
      },
    }),
  );
  const grid = renderPlannerGrid({
    workspace,
    filters,
    queries: session.queries,
    disabled: session.saving,
    onFiltersChanged: rerender,
    onSelect: (slot, spell) =>
      void mutate(() =>
        session.execute({
          type: 'set_slot',
          slot_id: slot.id,
          mode: 'select',
          spell_version_id: spell.id,
        }),
      ),
    onClear: (slot: WorkspaceSlot) =>
      confirmAction(
        `Clear ${slot.spell_name ?? 'this selection'} from ${slot.label}?`,
        () =>
          void mutate(() =>
            session.execute({
              type: 'set_slot',
              slot_id: slot.id,
              mode: 'clear',
            }),
          ),
      ),
    onOverride: (slot: WorkspaceSlot, note: string) =>
      void mutate(() =>
        session.execute({
          type: 'set_slot',
          slot_id: slot.id,
          mode: 'keep_override',
          note,
        }),
      ),
  });
  primary.append(grid.element);
  const historyActions: PlannerHistoryActions = {
    undo: () => void mutate(() => session.undo()),
    redo: () => void mutate(() => session.redo()),
    createSavePoint: (label: string) =>
      void mutate(() => session.createSavePoint(label)),
    restoreSavePoint: (id: number, label: string) =>
      confirmAction(
        `Restore “${label}”? Current unsaved history will be replaced, but this restore can be undone.`,
        () => void mutate(() => session.restoreSavePoint(id)),
      ),
  };
  primary.append(
    renderHistory({
      workspace,
      history: session.history,
      canUndo: session.canUndo,
      canRedo: session.canRedo,
      disabled: session.saving,
      actions: historyActions,
    }),
  );
  layout.append(
    primary,
    renderWarnings({
      report: workspace.report,
      disabled: session.saving,
      acknowledge: (fingerprint, note) =>
        void mutate(() =>
          session.execute({
            type: 'acknowledge_warning',
            warning_fingerprint: fingerprint,
            note,
          }),
        ),
    }),
  );
  shell.append(layout);
  context.root.append(shell);
  if (focusKey !== undefined) {
    restoreFocus(context.root, focusKey);
  }
  const replacementDialog = context.root.querySelector<HTMLDialogElement>(
    '[data-testid="attunement-replace-modal"]',
  );
  let destroyReplacementDialog = (): void => undefined;
  if (replacementDialog !== null) {
    view.attunementReplacementInvokerFocusKey ??= focusKey ?? null;
    const invokerFocusKey = view.attunementReplacementInvokerFocusKey;
    destroyReplacementDialog = activateAttunementReplacementModal(
      replacementDialog,
      {
        cancel: () => {
          session.cancelAttunementReplacement();
          view.attunementReplacementInvokerFocusKey = null;
          rerender();
        },
        restoreFocus: () => {
          if (invokerFocusKey !== null) {
            restoreFocus(context.root, invokerFocusKey);
          }
        },
      },
    );
  }
  return () => {
    destroyReplacementDialog();
    grid.destroy();
  };
}

export const screen = defineScreen({
  id: 'planner',
  matches: (route) =>
    route.segments.length === 2 &&
    route.segments[0] === 'characters' &&
    /^\d+$/.test(route.segments[1] ?? ''),
  render: async (context) => {
    const characterId = routeCharacterId(context);
    const session = new PlannerSession(
      characterId,
      createQueriesClient(context.rpc),
      createCommandsClient(context.rpc),
    );
    await session.load();
    const view: PlannerViewState = {
      filters: { ...defaultGridFilters },
      weaponEditing: null,
      itemEditing: null,
      attunementReplacementInvokerFocusKey: null,
    };
    let destroyGrid: (() => void) | undefined;
    let active = true;
    const rerender = (): void => {
      if (!active) return;
      destroyGrid?.();
      destroyGrid = renderPlanner(context, session, view, rerender);
    };
    rerender();
    const keyboard = (event: KeyboardEvent): void => {
      if (
        !(event.ctrlKey || event.metaKey) ||
        event.key.toLowerCase() !== 'z'
      ) {
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.matches(
          'input, textarea, select, [contenteditable="true"]',
        )
      ) {
        return;
      }
      event.preventDefault();
      void (event.shiftKey ? session.redo() : session.undo()).then(
        rerender,
      );
    };
    window.addEventListener('keydown', keyboard);
    return () => {
      active = false;
      destroyGrid?.();
      window.removeEventListener('keydown', keyboard);
    };
  },
});
