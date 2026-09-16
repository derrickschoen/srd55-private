import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StableInteractivePathError,
  StableRenderKeyCollisionError,
  StableRenderKeyFormatError,
  reconcileStableRenderedChildren,
  stableRenderKey,
} from '../../../src/vtt/stable-dom-render';
import {
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import { renderHumanEngineOptionCatalog } from '../../../src/vtt/encounter-app';
import { projectHumanEngineOptions } from '../../../src/vtt/encounter-board-projection';
import { generateRoom } from '../../../src/vtt/room-generator';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import { statblockId } from '../../../src/combat/values';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });

describe('stable VTT control rendering', () => {
  let restoreDocument: () => void;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
  });

  afterEach(() => restoreDocument());

  it('human_only_sorted_last_dom: renders offerable entries before every labeled no-effect entry', () => {
    const generated = generateRoom(3_943_001).encounter.state;
    const monster = generated.combatants.find((combatant) => combatant.profile.kind === 'monster');
    if (monster === undefined) throw new Error('Generated DOM fixture has no monster.');
    const state = freshMonsterPlanningState({
      ...generated,
      combatants: generated.combatants.map((combatant) => combatant.profile.id === monster.profile.id
        ? { ...combatant, profile: { ...combatant.profile, statblockId: statblockId('statblock:doppelganger') } }
        : combatant),
    });
    const catalog = renderHumanEngineOptionCatalog(
      projectHumanEngineOptions(state, [monster.profile.id], state.revision, OFFER_ENVIRONMENT),
    );
    const entries = interactiveElement(catalog).querySelectorAll('li');
    const availability = entries.map((entry) => entry.dataset['optionAvailability']);
    const firstHumanOnly = availability.indexOf('human_only');

    expect(firstHumanOnly).toBeGreaterThan(0);
    expect(availability.slice(0, firstHumanOnly).every((value) => value === 'offerable')).toBe(true);
    expect(availability.slice(firstHumanOnly).every((value) => value === 'human_only')).toBe(true);
    expect(entries.map((entry) => entry.textContent)).toEqual(expect.arrayContaining([
      expect.stringContaining('not modeled: detect thoughts has no in-combat effect'),
      expect.stringContaining('no effect here: no movement to disengage with'),
    ]));
  });

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

  it('does not orphan a pressed tray option when a preview rerenders before click', () => {
    const tray = (button: HTMLElement): HTMLElement => {
      const section = document.createElement('section');
      section.dataset.renderKey = stableRenderKey('dm', 'pending-request');
      section.append(button);
      return section;
    };
    const actionKey = stableRenderKey('dm', 'pending-request', 'turn-7', 'move-4-3');
    const clicked = vi.fn();
    const liveButton = document.createElement('button');
    liveButton.dataset.renderKey = actionKey;
    liveButton.addEventListener('click', clicked);
    const live = document.createElement('main');
    const liveBoard = document.createElement('div');
    liveBoard.dataset.preview = 'false';
    live.append(liveBoard, tray(liveButton));
    document.body.append(live);

    let pointerIsDown = false;
    let orphanedWhilePressed = false;
    const pressedTarget = interactiveElement(liveButton);
    const remove = pressedTarget.remove.bind(pressedTarget);
    vi.spyOn(pressedTarget, 'remove').mockImplementation(() => {
      if (pointerIsDown && pressedTarget.isConnected) orphanedWhilePressed = true;
      remove();
    });
    pressedTarget.dispatchEvent(new Event('pointerdown'));
    pointerIsDown = true;

    const draft = document.createElement('main');
    const previewBoard = document.createElement('div');
    previewBoard.dataset.preview = 'true';
    const nextButton = document.createElement('button');
    nextButton.dataset.renderKey = actionKey;
    draft.append(previewBoard, tray(nextButton));
    reconcileStableRenderedChildren(live, draft);

    pressedTarget.dispatchEvent(new Event('pointerup'));
    pointerIsDown = false;
    if (!orphanedWhilePressed && pressedTarget.isConnected) pressedTarget.click();
    expect(orphanedWhilePressed).toBe(false);
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

  it('keeps the encounter pause acknowledgement connected while its state changes', () => {
    const status = (pause: 'none' | 'interrupted'): HTMLElement => {
      const node = document.createElement('p');
      node.dataset.renderKey = stableRenderKey('dm', 'encounter-status');
      node.dataset.pause = pause;
      node.textContent = pause === 'none' ? 'Encounter running' : 'Paused: interrupted';
      return node;
    };
    const live = document.createElement('main');
    const liveStatus = status('interrupted');
    live.append(liveStatus);
    document.body.append(live);
    const draft = document.createElement('main');
    draft.append(status('none'));

    reconcileStableRenderedChildren(live, draft);

    const rendered = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey('dm', 'encounter-status')}"]`,
    );
    expect(rendered).toBe(interactiveElement(liveStatus));
    expect(interactiveElement(liveStatus).getAttribute('data-pause')).toBe('none');
    expect(interactiveElement(liveStatus).textContent).toBe('Encounter running');
  });

  it('keeps a boundary-refusal surface connected while its message republishes', () => {
    const refusal = (text: string): HTMLElement => {
      const node = document.createElement('p');
      node.dataset.renderKey = stableRenderKey('dm', 'decision-tray', 'boundary-refusal');
      node.dataset.refusalCode = 'turn_boundary_blocked';
      node.textContent = text;
      return node;
    };
    const live = document.createElement('main');
    const liveRefusal = refusal('first boundary message');
    live.append(liveRefusal);
    document.body.append(live);
    const draft = document.createElement('main');
    draft.append(refusal('current boundary message'));

    reconcileStableRenderedChildren(live, draft);

    const rendered = interactiveElement(live).querySelector(
      `[data-render-key="${stableRenderKey('dm', 'decision-tray', 'boundary-refusal')}"]`,
    );
    expect(rendered).toBe(interactiveElement(liveRefusal));
    expect(interactiveElement(liveRefusal).textContent).toBe('current boundary message');
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
        message: 'Interactive BUTTON has an unkeyed FORM ancestor in the draft tree.',
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

  it('encodes every key segment and reports the rejected identity verbatim', () => {
    expect(stableRenderKey('dm controls', 'turn/7', 'option:accept')).toBe(
      'dm%20controls:turn%2F7:option%3Aaccept',
    );

    expect(() => stableRenderKey('dm', '', 'accept')).toThrowError(
      expect.objectContaining<Partial<StableRenderKeyFormatError>>({
        name: 'StableRenderKeyFormatError',
        code: 'invalid_stable_render_key',
        key: 'dm::accept',
        message: 'Stable render key dm::accept must contain a namespace and logical identity.',
      }),
    );

    const live = document.createElement('main');
    const draft = document.createElement('main');
    const malformed = document.createElement('div');
    malformed.dataset.renderKey = 'missing-namespace';
    draft.append(malformed);
    expect(() => reconcileStableRenderedChildren(live, draft)).toThrowError(
      expect.objectContaining<Partial<StableRenderKeyFormatError>>({
        key: 'missing-namespace',
      }),
    );
  });

  it('uses native attribute names when available and synchronizes additions, changes, and removals', () => {
    const removed: string[] = [];
    const installNativeAttributes = (
      element: HTMLElement,
      initial: Readonly<Record<string, string>>,
    ): Map<string, string> => {
      const values = new Map(Object.entries(initial));
      Object.defineProperty(element, 'attributes', { configurable: true, value: {} });
      Reflect.set(element, 'getAttributeNames', () => [...values.keys()]);
      Reflect.set(element, 'getAttribute', (name: string) => values.get(name) ?? null);
      Reflect.set(element, 'setAttribute', (name: string, value: string) => values.set(name, value));
      Reflect.set(element, 'removeAttribute', (name: string) => {
        removed.push(name);
        values.delete(name);
      });
      return values;
    };
    const liveRoot = document.createElement('main');
    const draftRoot = document.createElement('main');
    const live = document.createElement('div');
    const draft = document.createElement('div');
    const key = stableRenderKey('dm', 'native-attributes');
    live.dataset.renderKey = key;
    draft.dataset.renderKey = key;
    const liveAttributes = installNativeAttributes(live, {
      'data-render-key': key,
      'data-retained': 'old',
      'data-stale': 'remove-me',
    });
    installNativeAttributes(draft, {
      'data-render-key': key,
      'data-retained': 'new',
      'aria-label': 'current label',
    });
    liveRoot.append(live);
    draftRoot.append(draft);

    reconcileStableRenderedChildren(liveRoot, draftRoot);

    expect(Object.fromEntries(liveAttributes)).toEqual({
      'data-render-key': key,
      'data-retained': 'new',
      'aria-label': 'current label',
    });
    expect(removed).toEqual(['data-stale']);
  });

  it('ignores non-string fallback attribute keys', () => {
    const key = stableRenderKey('dm', 'fallback-attributes');
    const live = document.createElement('main');
    const liveChild = document.createElement('div');
    liveChild.dataset.renderKey = key;
    live.append(liveChild);
    const draft = document.createElement('main');
    const draftChild = document.createElement('div');
    draftChild.dataset.renderKey = key;
    draft.append(draftChild);
    expect(Reflect.apply(
      Map.prototype.set,
      interactiveElement(draftChild).attributes,
      [17, 'numeric'],
    )).toBe(interactiveElement(draftChild).attributes);

    reconcileStableRenderedChildren(live, draft);

    expect(Reflect.apply(Map.prototype.has, interactiveElement(liveChild).attributes, [17])).toBe(false);
  });

  it('treats an unavailable fallback attribute collection as empty', () => {
    const key = stableRenderKey('dm', 'no-attribute-collection');
    const liveRoot = document.createElement('main');
    const draftRoot = document.createElement('main');
    const live = document.createElement('div');
    const draft = document.createElement('div');
    live.dataset.renderKey = key;
    draft.dataset.renderKey = key;
    live.setAttribute('Stryker was here', 'must be removed');
    const liveValues = interactiveElement(live).attributes;
    Object.defineProperty(draft, 'attributes', { configurable: true, value: {} });
    Reflect.set(draft, 'getAttribute', () => null);
    liveRoot.append(live);
    draftRoot.append(draft);

    reconcileStableRenderedChildren(liveRoot, draftRoot);

    expect(liveValues).toEqual(new Map());
  });

  it('copies mutable state only when that property exists on both relevant controls', () => {
    const key = stableRenderKey('dm', 'stateful-control');
    const live = document.createElement('main');
    const liveControl = document.createElement('input');
    liveControl.dataset.renderKey = key;
    liveControl.disabled = false;
    liveControl.hidden = false;
    liveControl.checked = true;
    Reflect.set(liveControl, 'selected', false);
    liveControl.value = 'old';
    live.append(liveControl);

    const draft = document.createElement('main');
    const draftControl = document.createElement('input');
    draftControl.dataset.renderKey = key;
    draftControl.disabled = true;
    draftControl.hidden = true;
    draftControl.checked = false;
    Reflect.set(draftControl, 'selected', true);
    draftControl.value = 'new';
    Reflect.deleteProperty(draftControl, 'checked');
    Reflect.deleteProperty(liveControl, 'selected');
    draft.append(draftControl);

    reconcileStableRenderedChildren(live, draft);

    expect(liveControl).toMatchObject({
      disabled: true,
      hidden: true,
      checked: true,
      value: 'new',
    });
    expect('selected' in liveControl).toBe(false);
  });

  it('ignores child-shaped non-elements instead of trying to reconcile them', () => {
    const live = document.createElement('main');
    const draft = document.createElement('main');
    expect(Reflect.apply(Array.prototype.push, interactiveElement(draft).children, [
      null,
      { tagName: 'DIV' },
      { append: (): void => undefined },
    ])).toBe(3);

    expect(() => reconcileStableRenderedChildren(live, draft)).not.toThrow();
    expect(live.children).toHaveLength(0);
  });

  it.each(['button', 'input', 'select', 'textarea', 'summary'])(
    'recognizes an unkeyed %s as interactive',
    (tag) => {
      const live = document.createElement('main');
      const draft = document.createElement('main');
      draft.append(document.createElement(tag));
      expect(() => reconcileStableRenderedChildren(live, draft)).toThrowError(
        expect.objectContaining<Partial<StableInteractivePathError>>({
          interactiveTag: tag.toUpperCase(),
          unkeyedTag: tag.toUpperCase(),
          tree: 'draft',
        }),
      );
    },
  );

  it('distinguishes linked anchors and tabindex controls from inert lookalikes', () => {
    const reconcileOne = (element: HTMLElement): void => {
      const live = document.createElement('main');
      const draft = document.createElement('main');
      draft.append(element);
      reconcileStableRenderedChildren(live, draft);
    };
    const inertAnchor = document.createElement('a');
    expect(() => reconcileOne(inertAnchor)).not.toThrow();
    const linkedAnchor = document.createElement('a');
    linkedAnchor.setAttribute('href', '/encounter');
    expect(() => reconcileOne(linkedAnchor)).toThrowError(
      expect.objectContaining({ interactiveTag: 'A' }),
    );
    const hrefDiv = document.createElement('div');
    hrefDiv.setAttribute('href', '/not-a-link');
    expect(() => reconcileOne(hrefDiv)).not.toThrow();
    const tabStop = document.createElement('div');
    tabStop.setAttribute('tabindex', '0');
    expect(() => reconcileOne(tabStop)).toThrowError(
      expect.objectContaining({ interactiveTag: 'DIV' }),
    );
  });

  it('reports a duplicate in the live tree before applying the draft', () => {
    const collision = stableRenderKey('dm', 'live-collision');
    const live = document.createElement('main');
    for (let index = 0; index < 2; index += 1) {
      const child = document.createElement('div');
      child.dataset.renderKey = collision;
      live.append(child);
    }
    const draft = document.createElement('main');

    expect(() => reconcileStableRenderedChildren(live, draft)).toThrowError(
      expect.objectContaining<Partial<StableRenderKeyCollisionError>>({
        key: collision,
        tree: 'live',
        message: `Stable render key ${collision} is duplicated in the live tree.`,
      }),
    );
    expect(live.children).toHaveLength(2);
  });

  it('reorders retained nodes, inserts a new node, and removes stale and tag-mismatched nodes', () => {
    const keyed = (tag: 'div' | 'section', identity: string): HTMLElement => {
      const element = document.createElement(tag);
      element.dataset.renderKey = stableRenderKey('dm', identity);
      return element;
    };
    const live = document.createElement('main');
    const first = keyed('div', 'first');
    const second = keyed('div', 'second');
    const stale = keyed('div', 'stale');
    const wrongTag = keyed('div', 'replace-tag');
    live.append(first, second, stale, wrongTag);
    const firstRemove = vi.spyOn(interactiveElement(first), 'remove');
    const insertBefore = vi.spyOn(interactiveElement(live), 'insertBefore');
    document.body.append(live);

    const draft = document.createElement('main');
    const nextSecond = keyed('div', 'second');
    nextSecond.textContent = 'second-current';
    const nextFirst = keyed('div', 'first');
    const inserted = keyed('div', 'inserted');
    const replacement = keyed('section', 'replace-tag');
    draft.append(nextSecond, nextFirst, inserted, replacement);

    reconcileStableRenderedChildren(live, draft);

    expect(Array.from(live.children)).toEqual([second, first, inserted, replacement]);
    expect(second.textContent).toBe('second-current');
    expect(stale.isConnected).toBe(false);
    expect(wrongTag.isConnected).toBe(false);
    expect(first.isConnected).toBe(true);
    expect(second.isConnected).toBe(true);
    expect(firstRemove).not.toHaveBeenCalled();
    expect(insertBefore).toHaveBeenCalledWith(interactiveElement(inserted), null);
  });

  it('removes a trailing stale node that never occupies a desired index', () => {
    const key = stableRenderKey('dm', 'retained');
    const live = document.createElement('main');
    const retained = document.createElement('div');
    retained.dataset.renderKey = key;
    const trailing = document.createElement('aside');
    trailing.dataset.renderKey = stableRenderKey('dm', 'trailing-stale');
    live.append(retained, trailing);
    document.body.append(live);
    const draft = document.createElement('main');
    const desired = document.createElement('div');
    desired.dataset.renderKey = key;
    draft.append(desired);

    reconcileStableRenderedChildren(live, draft);

    expect(Array.from(live.children)).toEqual([retained]);
    expect(trailing.isConnected).toBe(false);
  });
});
