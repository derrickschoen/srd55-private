import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { reconcileStableRenderedChildren } from '../../../src/vtt/stable-dom-render';
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
    liveTray.dataset.renderKey = 'decision-tray';
    const liveRow = document.createElement('article');
    liveRow.dataset.renderKey = 'decision:reaction-7';
    const liveButton = document.createElement('button');
    liveButton.dataset.renderKey = 'option:accept';
    const clicked = vi.fn();
    liveButton.addEventListener('click', clicked);
    liveRow.append(liveButton);
    liveTray.append(liveRow);
    live.append(liveTray);
    document.body.append(live);

    const draft = document.createElement('main');
    const nextTray = document.createElement('section');
    nextTray.dataset.renderKey = 'decision-tray';
    const nextRow = document.createElement('article');
    nextRow.dataset.renderKey = 'decision:reaction-7';
    const nextButton = document.createElement('button');
    nextButton.dataset.renderKey = 'option:accept';
    nextButton.textContent = 'Make Opportunity Attack for Vane Spear';
    nextRow.append(nextButton);
    nextTray.append(nextRow);
    draft.append(nextTray);

    reconcileStableRenderedChildren(live, draft);

    const rendered = interactiveElement(live).querySelector('[data-render-key="option:accept"]');
    expect(rendered).toBe(interactiveElement(liveButton));
    expect(interactiveElement(liveButton).isConnected).toBe(true);
    interactiveElement(liveButton).click();
    expect(clicked).toHaveBeenCalledOnce();
  });
});
