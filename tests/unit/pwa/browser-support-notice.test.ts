import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it } from 'vitest';
import {
  browserEngineProfileFromSignals,
  CAPABILITY_WARNING_SENTENCE,
  PENDING_D153_WEBKIT_IOS_NOTICE_VARIANT,
  showBrowserSupportNotice,
  UNTESTED_ENGINE_WARNING_SENTENCE,
  type BrowserSupportNoticeElements,
} from '../../../src/pwa/browser-support-notice';
import {
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

let restoreDocument: (() => void) | undefined;

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
});

function noticeElements(): BrowserSupportNoticeElements {
  restoreDocument = installInteractiveDocument();
  const container = document.createElement('section');
  const message = document.createElement('p');
  const continueButton = document.createElement('button');
  continueButton.type = 'button';
  continueButton.textContent = 'Continue anyway';
  container.hidden = true;
  container.append(message, continueButton);
  return { container, message, continueButton };
}

describe('browser support notice', () => {
  it('BROWSER-PROBE-CRIOS-IS-WEBKIT: classifies Chrome on iOS as untested', () => {
    expect(
      browserEngineProfileFromSignals(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/140.0.7339.122 Mobile/15E148 Safari/604.1',
        [{ brand: 'Chromium' }],
      ),
    ).toEqual({ knownTested: false, noun: 'Chrome on iOS' });
  });

  it('renders the capability sentence and a machine-legible state', () => {
    const elements = noticeElements();
    showBrowserSupportNotice(
      elements,
      { kind: 'capability-warning', outcome: 'unavailable' },
      'This browser',
    );
    expect(elements.container.hidden).toBe(false);
    expect(elements.message.textContent).toBe(CAPABILITY_WARNING_SENTENCE);
    expect(elements.container.dataset.browserSupportState).toBe(
      'capability-unavailable',
    );
  });

  it('renders a distinct honest sentence for an untested engine', () => {
    const elements = noticeElements();
    showBrowserSupportNotice(
      elements,
      { kind: 'untested-engine' },
      'Firefox',
    );
    expect(elements.message.textContent).toBe(
      UNTESTED_ENGINE_WARNING_SENTENCE.replace('{browser}', 'Firefox'),
    );
    expect(elements.message.textContent).not.toBe(CAPABILITY_WARNING_SENTENCE);
    expect(elements.container.dataset.browserSupportState).toBe(
      'untested-engine',
    );
  });

  it('BROWSER-PROBE-KEYBOARD: ships a labelled native button', () => {
    const elements = noticeElements();
    const button = interactiveElement(elements.continueButton);
    expect(button.tagName).toBe('button');
    expect(button.type).toBe('button');
    expect(button.textContent).toBe('Continue anyway');
    button.focus();
    expect(document.activeElement).toBe(elements.continueButton);

    const index = readFileSync(
      fileURLToPath(new URL('../../../index.html', import.meta.url)),
      'utf8',
    );
    expect(index).toMatch(
      /<button id="browser-support-continue" type="button">\s*Continue anyway\s*<\/button>/u,
    );
    expect(index).toContain('aria-labelledby="browser-support-heading"');
  });

  it('BROWSER-PROBE-NO-IOS-CLAIM: ships Chromium-only wording while keeping one pending D153 variant inert', () => {
    expect(CAPABILITY_WARNING_SENTENCE).toContain('tested only in Chromium');
    expect(UNTESTED_ENGINE_WARNING_SENTENCE).toContain(
      'tested only in Chromium',
    );
    for (const shipped of [
      CAPABILITY_WARNING_SENTENCE,
      UNTESTED_ENGINE_WARNING_SENTENCE,
    ]) {
      expect(shipped).not.toMatch(/WebKit|iOS|Safari|home screen/iu);
    }
    expect(PENDING_D153_WEBKIT_IOS_NOTICE_VARIANT).toContain(
      'Chromium/WebKit',
    );
    const source = readFileSync(
      fileURLToPath(
        new URL('../../../src/pwa/browser-support-notice.ts', import.meta.url),
      ),
      'utf8',
    );
    expect(
      source.split('PENDING_D153_WEBKIT_IOS_NOTICE_VARIANT').length - 1,
    ).toBe(1);
  });
});
