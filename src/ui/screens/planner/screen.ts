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
import type { CharacterCommandResult } from '../../../commands/character-command-executor';
import { createCommandsClient } from '../../../commands/client';
import {
  createQueriesClient,
  type QueriesClient,
} from '../../../queries/client';
import type { OperationHistory } from '../../../queries/operation-history';
import { RpcError } from '../../../rpc/protocol';
import { defineScreen } from '../../screen';
import type { ScreenContext } from '../../screen';
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
    | 'eligibleSpells'
    | 'createSavePoint'
    | 'savePointRestoreCommand'
    | 'operationHistory'
  > {}

export class PlannerSession {
  workspace: Workspace | null = null;
  history: OperationHistory | null = null;
  saving = false;
  error: string | null = null;
  stale = false;
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
    const [workspace, history] = await Promise.all([
      this.queries.workspace(this.characterId),
      this.queries.operationHistory(this.characterId),
    ]);
    this.workspace = workspace;
    this.history = history;
  }

  async execute(command: CharacterCommandPayload): Promise<boolean> {
    if (this.saving || this.workspace === null) return false;
    this.saving = true;
    this.error = null;
    try {
      const result = await this.commands.execute(
        this.characterId,
        this.workspace.revision,
        command,
      );
      this.#undo.push(result.inverse);
      this.#redo.length = 0;
      await this.#refresh();
      return true;
    } catch (error) {
      this.#recordError(error, 'The change could not be saved.');
      return false;
    } finally {
      this.saving = false;
    }
  }

  async undo(): Promise<boolean> {
    if (!this.canUndo || this.workspace === null) return false;
    const command = this.#undo.pop();
    if (command === undefined) return false;
    this.saving = true;
    this.error = null;
    try {
      const result = await this.commands.execute(
        this.characterId,
        this.workspace.revision,
        command,
      );
      this.#redo.push(result.inverse);
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
    try {
      const result = await this.commands.execute(
        this.characterId,
        this.workspace.revision,
        command,
      );
      this.#undo.push(result.inverse);
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
    const [workspace, history] = await Promise.all([
      this.queries.workspace(this.characterId),
      this.queries.operationHistory(this.characterId),
    ]);
    this.workspace = workspace;
    this.history = history;
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

function renderPlanner(
  context: ScreenContext,
  session: PlannerSession,
  filters: GridFilters,
  rerender: () => void,
): () => void {
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
  heading.textContent = workspace.report.character.name;
  const subtitle = document.createElement('p');
  subtitle.textContent = `Level ${workspace.report.character.character_level} · revision ${workspace.revision}`;
  identity.append(home, heading, subtitle);
  const status = document.createElement('output');
  status.id = 'planner-status';
  status.setAttribute('role', 'status');
  status.dataset.ready = 'true';
  status.value = session.saving ? 'Saving…' : 'Autosaved';
  const print = document.createElement('a');
  print.href = `/characters/${session.characterId}/print`;
  print.className = 'button-secondary';
  print.textContent = 'Print spells';
  const actions = document.createElement('div');
  actions.className = 'planner-header-actions';
  actions.append(status, print);
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
  const layout = document.createElement('main');
  layout.className = 'planner-layout';
  const primary = document.createElement('div');
  primary.className = 'planner-primary';
  primary.append(
    renderDiceHelper(
      workspace.slots,
      workspace.report.character.character_level,
      workspace.report.character.abilities,
    ),
  );

  const mutate = async (
    operation: () => Promise<boolean>,
  ): Promise<void> => {
    const mutationFocusKey = (
      document.activeElement as HTMLElement | null
    )?.dataset.focusKey;
    const pending = operation();
    rerender();
    await pending;
    rerender();
    if (
      mutationFocusKey !== undefined &&
      context.root.querySelector('.planner-shell') !== null
    ) {
      restoreFocus(context.root, mutationFocusKey);
    }
  };
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
    updateClass: (
      entry: CharacterClass,
      changes: {
        level?: number;
        subclass_definition_id?: number | null;
      },
    ) =>
      void mutate(() =>
        session.execute({
          type: 'update_class',
          class_definition_id: entry.class_definition_id,
          level: changes.level ?? entry.level,
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
              level: null,
            }),
          ),
      ),
    addClass: (classDefinitionId: number) =>
      void mutate(() =>
        session.execute({
          type: 'update_class',
          class_definition_id: classDefinitionId,
          level: 1,
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
  return grid.destroy;
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
    const filters: GridFilters = { ...defaultGridFilters };
    let destroyGrid: (() => void) | undefined;
    let active = true;
    const rerender = (): void => {
      if (!active) return;
      destroyGrid?.();
      destroyGrid = renderPlanner(context, session, filters, rerender);
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
