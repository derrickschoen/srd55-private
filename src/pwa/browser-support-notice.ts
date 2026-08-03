import type { BrowserSupportDecision } from './browser-capability';

const BROWSER_ENGINE_IDENTIFICATION_BOUNDARY = true;

export const CAPABILITY_WARNING_SENTENCE =
  'This browser cannot open the local data store. SRD-55 is tested only in Chromium; continuing may not work and may lose data. Keep backup exports.';

export const UNTESTED_ENGINE_WARNING_SENTENCE =
  '{browser} is not tested here. SRD-55 is tested only in Chromium; it may not work and may lose data. Keep backup exports.';

/**
 * D153's WebKit/iOS wording is pending the supervisor's local WebKit spike.
 * It is deliberately not selected by any shipped branch until that evidence
 * exists and the owner-facing support ruling is updated.
 */
export const PENDING_D153_WEBKIT_IOS_NOTICE_VARIANT =
  'This browser is not tested here. SRD-55 is tested only in Chromium/WebKit; on iOS, keep backup exports.';

type UserAgentData = {
  readonly brands?: readonly { readonly brand: string }[];
};

type NavigatorWithUserAgentData = Navigator & {
  readonly userAgentData?: UserAgentData;
};

export interface BrowserEngineProfile {
  readonly knownTested: boolean;
  readonly noun: string;
}

export function browserEngineProfileFromSignals(
  userAgent: string,
  brands: readonly { readonly brand: string }[] = [],
): BrowserEngineProfile {
  // Every browser on iOS uses WebKit. CriOS identifies Chrome's shell there;
  // it is not evidence that Chromium's engine — our tested engine — is in use.
  const chromeOnIos = /\bCriOS\//u.test(userAgent);
  const knownTested =
    !chromeOnIos &&
    (brands.some(({ brand }) => brand === 'Chromium') ||
      /\b(?:Chrome|Chromium|Edg|OPR)\//u.test(userAgent));
  let noun = 'This browser';
  if (chromeOnIos) {
    noun = 'Chrome on iOS';
  } else if (/Firefox\//u.test(userAgent)) {
    noun = 'Firefox';
  } else if (/Safari\//u.test(userAgent) && !knownTested) {
    noun = 'Safari';
  }
  return { knownTested, noun };
}

export function readBrowserEngineProfile(): BrowserEngineProfile {
  const browserNavigator = navigator as NavigatorWithUserAgentData;
  return browserEngineProfileFromSignals(
    browserNavigator.userAgent,
    browserNavigator.userAgentData?.brands,
  );
}

export interface BrowserSupportNoticeElements {
  readonly container: HTMLElement;
  readonly message: HTMLElement;
  readonly continueButton: HTMLButtonElement;
}

export function browserSupportNoticeElements(): BrowserSupportNoticeElements {
  const container = document.querySelector<HTMLElement>(
    '#browser-support-notice',
  );
  const message = document.querySelector<HTMLElement>(
    '#browser-support-message',
  );
  const continueButton = document.querySelector<HTMLButtonElement>(
    '#browser-support-continue',
  );
  if (container === null || message === null || continueButton === null) {
    throw new Error('Browser support notice markup is missing.');
  }
  return { container, message, continueButton };
}

export function showBrowserSupportNotice(
  elements: BrowserSupportNoticeElements,
  decision: Exclude<BrowserSupportDecision, { readonly kind: 'supported' }>,
  browserNoun: string,
): void {
  switch (decision.kind) {
    case 'capability-warning':
      elements.container.dataset.browserSupportState =
        decision.outcome === 'unavailable'
          ? 'capability-unavailable'
          : 'capability-probe-failed';
      elements.message.textContent = CAPABILITY_WARNING_SENTENCE;
      break;
    case 'untested-engine':
      elements.container.dataset.browserSupportState = 'untested-engine';
      elements.message.textContent = UNTESTED_ENGINE_WARNING_SENTENCE.replace(
        '{browser}',
        browserNoun,
      );
      break;
  }
  elements.container.hidden = false;
}

export function hideBrowserSupportNotice(
  elements: BrowserSupportNoticeElements,
): void {
  elements.container.hidden = true;
  elements.container.dataset.browserSupportState = 'supported';
}

// Referenced by the structural boundary test: this module alone owns UA reads.
void BROWSER_ENGINE_IDENTIFICATION_BOUNDARY;
