import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StableInteractivePathError,
  StableRenderKeyCollisionError,
  reconcileStableRenderedChildren,
  stableRenderKey,
} from '../../../src/vtt/stable-dom-render';
import {
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

describe('stable VTT control rendering', () => {
  let restoreDocument: () => void;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
  });

  afterEach(() => restoreDocument());

  it('keeps a pending tray option connected and clickable across live publishes', () => {
    const live = document.createElement('main');
    const liveTray = document.createElement('section');
    liveTray.dataset.renderKey = stableRenderKey('dm', 'decision-tray');
    const liveRow = document.createElement('article');
    liveRow.dataset.renderKey = stableRenderKey('dm', 'decision-tray', 'decision', 'reaction-7');
    const liveButton = document.createElement('button');
    liveButton.dataset.renderKey = stableRenderKey(
      'dm', 'decision-tray', 'decision', 'reaction-7', 'option', 'accept',
    );
    const clicked = vi.fn();
    liveButton.addEventListener('click', clicked);
    liveRow.append(liveButton);
    liveTray.append(liveRow);
    live.append(liveTray);
    document.body.append(live);

    const draft = document.createElement('main');
    const nextTray = document.createElement('section');
    nextTray.dataset.renderKey = stableRenderKey('dm', 'decision-tray');
    const nextRow = document.createElement('article');
    nextRow.dataset.renderKey = stableRenderKey('dm', 'decision-tray', 'decision', 'reaction-7');
    const nextButton = document.createElement('button');
    nextButton.dataset.renderKey = stableRenderKey(
      'dm', 'decision-tray', 'decision', 'reaction-7', 'option', 'accept',
    );
    nextButton.textContent = 'Make Opportunity Attack for Vane Spear';
    nextRow.append(nextButton);
    nextTray.append(nextRow);
    draft.append(nextTray);

    reconcileStableRenderedChildren(live, draft);

    const rendered = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey(
        'dm', 'decision-tray', 'decision', 'reaction-7', 'option', 'accept',
      )}"]`,
    );
    expect(rendered).toBe(interactiveElement(liveButton));
    expect(interactiveElement(liveButton).isConnected).toBe(true);
    interactiveElement(liveButton).click();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('keeps controller controls connected while adding a deferred roster member', () => {
    const assignment = (
      combatantId: string,
      kind: 'human' | 'algorithm',
      changed?: () => void,
    ): HTMLElement => {
      const row = document.createElement('label');
      row.dataset.renderKey = stableRenderKey('dm', 'controller-assignments', combatantId);
      const select = document.createElement('select');
      select.dataset.renderKey = stableRenderKey(
        'dm', 'controller-assignments', combatantId, 'kind',
      );
      select.value = kind;
      if (changed !== undefined) select.addEventListener('change', changed);
      row.append(select);
      return row;
    };
    const section = (rows: readonly HTMLElement[]): HTMLElement => {
      const assignments = document.createElement('section');
      assignments.dataset.renderKey = stableRenderKey('dm', 'controller-assignments');
      assignments.append(...rows);
      return assignments;
    };

    const changed = vi.fn();
    const live = document.createElement('main');
    const originalRow = assignment('combatant:cinder-guard-a', 'human', changed);
    const originalSelect = originalRow.children[0];
    if (originalSelect === undefined) throw new Error('Controller select fixture is missing.');
    live.append(section([originalRow]));
    document.body.append(live);

    const draft = document.createElement('main');
    draft.append(section([
      assignment('combatant:cinder-guard-a', 'algorithm'),
      assignment('combatant:cinder-wave-1-a', 'human'),
    ]));
    reconcileStableRenderedChildren(live, draft);

    const renderedRow = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey(
        'dm', 'controller-assignments', 'combatant:cinder-guard-a',
      )}"]`,
    );
    if (renderedRow === null) throw new Error('Original controller row was not reconciled.');
    const renderedOriginal = renderedRow.querySelector(
      `[data-render-key="${stableRenderKey(
        'dm', 'controller-assignments', 'combatant:cinder-guard-a', 'kind',
      )}"]`,
    );
    expect(renderedOriginal).toBe(interactiveElement(originalSelect as HTMLElement));
    expect(interactiveElement(originalSelect as HTMLElement).isConnected).toBe(true);
    expect(Reflect.get(originalSelect, 'value')).toBe('algorithm');
    const renderedSection = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey('dm', 'controller-assignments')}"]`,
    );
    expect(renderedSection?.children).toHaveLength(2);
    interactiveElement(originalSelect as HTMLElement).dispatchEvent(new Event('change'));
    expect(changed).toHaveBeenCalledOnce();
  });

  it('timeline_rewind_control_replaced: keeps the live rewind button connected while the timeline republishes', () => {
    const timeline = (revision: number, button?: HTMLElement): HTMLElement => {
      const section = document.createElement('section');
      section.dataset.renderKey = stableRenderKey('dm', 'initiative-timeline');
      const rewind = document.createElement('div');
      rewind.dataset.renderKey = stableRenderKey('dm', 'initiative-timeline', 'rewind');
      const control = button ?? document.createElement('button');
      control.dataset.renderKey = stableRenderKey(
        'dm', 'initiative-timeline', 'rewind', 'round-1',
      );
      control.setAttribute('data-revision', String(revision));
      rewind.append(control);
      section.append(rewind);
      return section;
    };
    const clicked = vi.fn();
    const liveButton = document.createElement('button');
    liveButton.addEventListener('click', clicked);
    const live = document.createElement('main');
    live.append(timeline(2, liveButton));
    document.body.append(live);
    const draft = document.createElement('main');
    draft.append(timeline(9));

    reconcileStableRenderedChildren(live, draft);

    const rendered = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey(
        'dm', 'initiative-timeline', 'rewind', 'round-1',
      )}"]`,
    );
    expect(rendered).toBe(interactiveElement(liveButton));
    expect(interactiveElement(liveButton).isConnected).toBe(true);
    expect(interactiveElement(liveButton).getAttribute('data-revision')).toBe('9');
    interactiveElement(liveButton).click();
    expect(clicked).toHaveBeenCalledOnce();
  });

  it('rejects a keyed control whose unkeyed wrapper would still replace it', () => {
    const live = document.createElement('main');
    const draft = document.createElement('main');
    const form = document.createElement('form');
    const button = document.createElement('button');
    button.dataset.renderKey = stableRenderKey('dm', 'short-rest', 'submit');
    form.append(button);
    draft.append(form);

    expect(() => reconcileStableRenderedChildren(live, draft)).toThrowError(
      expect.objectContaining<Partial<StableInteractivePathError>>({
        name: 'StableInteractivePathError',
        code: 'unstable_interactive_render_path',
        interactiveTag: 'BUTTON',
        unkeyedTag: 'FORM',
        tree: 'draft',
      }),
    );
    expect(live.children).toHaveLength(0);
  });

  it('keeps every short-rest control connected through its keyed form and labels', () => {
    const renderRest = (room: number, submit?: HTMLElement): HTMLElement => {
      const roomKey = `room-${String(room)}`;
      const rest = document.createElement('form');
      rest.dataset.renderKey = stableRenderKey('dm', 'short-rest', roomKey);
      const label = document.createElement('label');
      label.dataset.renderKey = stableRenderKey('dm', 'short-rest', roomKey, 'mirel', 'd8', 'label');
      const input = document.createElement('input');
      input.dataset.renderKey = stableRenderKey('dm', 'short-rest', roomKey, 'mirel', 'd8', 'input');
      label.append(input);
      const button = submit ?? document.createElement('button');
      button.dataset.renderKey = stableRenderKey('dm', 'short-rest', roomKey, 'submit');
      rest.append(label, button);
      return rest;
    };
    const clicked = vi.fn();
    const liveButton = document.createElement('button');
    liveButton.addEventListener('click', clicked);
    const live = document.createElement('main');
    live.append(renderRest(2, liveButton));
    document.body.append(live);
    const draft = document.createElement('main');
    draft.append(renderRest(2));

    reconcileStableRenderedChildren(live, draft);

    const rendered = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey('dm', 'short-rest', 'room-2', 'submit')}"]`,
    );
    expect(rendered).toBe(interactiveElement(liveButton));
    expect(interactiveElement(liveButton).isConnected).toBe(true);
    interactiveElement(liveButton).click();
    expect(clicked).toHaveBeenCalledOnce();

    const nextRoom = document.createElement('main');
    nextRoom.append(renderRest(3));
    reconcileStableRenderedChildren(live, nextRoom);
    expect(interactiveElement(liveButton).isConnected).toBe(false);
  });

  it('rejects colliding logical identities before mutating the live tree', () => {
    const live = document.createElement('main');
    const draft = document.createElement('main');
    const first = document.createElement('button');
    const second = document.createElement('button');
    const collision = stableRenderKey('dm', 'controls', 'interrupt');
    first.dataset.renderKey = collision;
    second.dataset.renderKey = collision;
    draft.append(first, second);

    expect(() => reconcileStableRenderedChildren(live, draft)).toThrowError(
      expect.objectContaining<Partial<StableRenderKeyCollisionError>>({
        name: 'StableRenderKeyCollisionError',
        code: 'duplicate_stable_render_key',
        key: collision,
        tree: 'draft',
      }),
    );
    expect(live.children).toHaveLength(0);
  });
});
