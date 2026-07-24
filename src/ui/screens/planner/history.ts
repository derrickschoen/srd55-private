import type { Workspace } from '../../../domain/read-models';
import type { OperationHistory } from '../../../queries/operation-history';

export interface PlannerHistoryActions {
  undo(): void;
  redo(): void;
  createSavePoint(label: string): void;
  restoreSavePoint(id: number, label: string): void;
}

export function renderHistory(options: {
  workspace: Workspace;
  history: OperationHistory | null;
  canUndo: boolean;
  canRedo: boolean;
  disabled: boolean;
  actions: PlannerHistoryActions;
}): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel';
  const header = document.createElement('div');
  header.className = 'panel-heading';
  const heading = document.createElement('h2');
  heading.textContent = 'History and save points';
  const controls = document.createElement('div');
  controls.className = 'history-controls';
  const undo = document.createElement('button');
  undo.type = 'button';
  undo.className = 'button-secondary';
  undo.textContent = '↶ Undo';
  undo.title = 'Ctrl+Z';
  undo.disabled = options.disabled || !options.canUndo;
  undo.addEventListener('click', options.actions.undo);
  const redo = document.createElement('button');
  redo.type = 'button';
  redo.className = 'button-secondary';
  redo.textContent = '↷ Redo';
  redo.title = 'Ctrl+Shift+Z';
  redo.disabled = options.disabled || !options.canRedo;
  redo.addEventListener('click', options.actions.redo);
  controls.append(undo, redo);
  header.append(heading, controls);
  section.append(header);
  const form = document.createElement('form');
  form.className = 'save-point-form';
  const label = document.createElement('label');
  label.className = 'planner-field';
  const caption = document.createElement('span');
  caption.textContent = 'Save point name';
  const input = document.createElement('input');
  input.className = 'planner-input';
  input.maxLength = 120;
  input.required = true;
  input.placeholder = 'Before changing Wizard levels';
  input.dataset.focusKey = 'save-point-label';
  const save = document.createElement('button');
  save.type = 'submit';
  save.className = 'button-primary';
  save.textContent = 'Save snapshot';
  save.disabled = options.disabled;
  label.append(caption, input);
  form.append(label, save);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (value !== '') options.actions.createSavePoint(value);
  });
  section.append(form);
  if (options.workspace.save_points.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'muted';
    empty.textContent =
      'No save points yet. Use one before a large multiclass experiment.';
    section.append(empty);
  } else {
    const list = document.createElement('ul');
    list.className = 'save-point-list';
    for (const point of options.workspace.save_points) {
      const item = document.createElement('li');
      const text = document.createElement('span');
      const name = document.createElement('strong');
      name.textContent = point.label;
      const date = document.createElement('small');
      date.textContent = point.created_at;
      text.append(name, ' ', date);
      const restore = document.createElement('button');
      restore.type = 'button';
      restore.className = 'button-secondary';
      restore.textContent = 'Restore';
      restore.disabled = options.disabled;
      restore.addEventListener('click', () =>
        options.actions.restoreSavePoint(point.id, point.label),
      );
      item.append(text, restore);
      list.append(item);
    }
    section.append(list);
  }
  const details = document.createElement('details');
  const summary = document.createElement('summary');
  summary.textContent = `Persisted operation history · ${
    options.history?.operations.length ?? 0
  } operations`;
  details.append(summary);
  if (options.history !== null) {
    const list = document.createElement('ol');
    list.className = 'operation-list';
    for (const operation of options.history.operations.slice(0, 20)) {
      const item = document.createElement('li');
      const related = options.history.changes.filter(
        (change) =>
          change.operation_uuid === operation.operation_uuid,
      );
      item.textContent = `Revision ${operation.resulting_revision} · ${
        related[0]?.action_type ?? 'operation'
      } · ${operation.created_at}`;
      list.append(item);
    }
    details.append(list);
  }
  section.append(details);
  return section;
}
