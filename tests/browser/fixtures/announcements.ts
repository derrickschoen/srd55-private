import type { Page } from '@playwright/test';

const STORAGE_KEY = 'ha12-accessibility-announcements';

/**
 * Records text presented through a connected live region. This is installed
 * before application code so a test proves the action-time mutation, not just
 * the eventual presence of an aria-live attribute.
 */
export async function installAnnouncementRecorder(page: Page): Promise<void> {
  await page.addInitScript((storageKey) => {
    const read = (): string[] => {
      const stored = sessionStorage.getItem(storageKey);
      if (stored === null) return [];
      const value: unknown = JSON.parse(stored);
      return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
        ? value
        : [];
    };
    const record = (region: Element): void => {
      const message = region.textContent?.trim() ?? '';
      if (message === '') return;
      const messages = read();
      if (messages.at(-1) === message) return;
      messages.push(message);
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    };
    const liveSelector = '[aria-live], [role="status"], [role="alert"]';
    const observe = (): void => {
      const root = document.documentElement;
      if (root === null) return;
      new MutationObserver((records) => {
        const regions = new Set<Element>();
        for (const mutation of records) {
          const target = mutation.target instanceof Element
            ? mutation.target
            : mutation.target.parentElement;
          const containing = target?.closest(liveSelector);
          if (containing !== null && containing !== undefined) regions.add(containing);
          for (const node of Array.from(mutation.addedNodes)) {
            if (!(node instanceof Element)) continue;
            if (node.matches(liveSelector)) regions.add(node);
            for (const region of Array.from(node.querySelectorAll(liveSelector))) {
              regions.add(region);
            }
          }
        }
        for (const region of regions) record(region);
      }).observe(root, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['aria-live', 'role'],
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', observe, { once: true });
    } else {
      observe();
    }
  }, STORAGE_KEY);
}

export async function clearAnnouncements(page: Page): Promise<void> {
  await page.evaluate((storageKey) => sessionStorage.removeItem(storageKey), STORAGE_KEY);
}

export async function announcedMessages(page: Page): Promise<readonly string[]> {
  return page.evaluate((storageKey) => {
    const stored = sessionStorage.getItem(storageKey);
    if (stored === null) return [];
    const value: unknown = JSON.parse(stored);
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
      ? value
      : [];
  }, STORAGE_KEY);
}
