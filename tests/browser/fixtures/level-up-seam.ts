import type { Page } from '@playwright/test';

export interface BrowserLevelUpSeam {
  readonly path: string;
  readonly panelAttribute: string;
  readonly stepAttribute: string;
  readonly panels: {
    readonly class: string;
    readonly gains: string;
    readonly subclass: string;
    readonly feat: string;
    readonly epicBoon: string;
    readonly skills: string;
    readonly expertise: string;
    readonly spells: string;
    readonly review: string;
    readonly complete: string;
  };
}

export async function readLevelUpSeam(
  page: Page,
  characterId: number,
): Promise<BrowserLevelUpSeam> {
  return page.evaluate(
    async ({ modulePath, requestedCharacterId }) => {
      const imported: unknown = await import(modulePath);
      if (typeof imported !== 'object' || imported === null) {
        throw new Error('The level-up seam module did not export an object.');
      }
      const exports = imported as Record<string, unknown>;
      const pathWriter = exports['levelUpPath'];
      const panelAttribute = exports['LEVEL_UP_PANEL_ATTRIBUTE'];
      const attributes = exports['LEVEL_UP_ATTR'];
      const panels = exports['LEVEL_UP_PANEL'];
      if (
        typeof pathWriter !== 'function' ||
        typeof panelAttribute !== 'string' ||
        typeof attributes !== 'object' ||
        attributes === null ||
        typeof panels !== 'object' ||
        panels === null
      ) {
        throw new Error('The level-up seam exports have unexpected shapes.');
      }
      const path = (pathWriter as (id: number) => unknown)(
        requestedCharacterId,
      );
      const stepAttribute = (attributes as Record<string, unknown>)['step'];
      const panelRecord = panels as Record<string, unknown>;
      const panelValues = {
        class: panelRecord['class'],
        gains: panelRecord['gains'],
        subclass: panelRecord['subclass'],
        feat: panelRecord['feat'],
        epicBoon: panelRecord['epicBoon'],
        skills: panelRecord['skills'],
        expertise: panelRecord['expertise'],
        spells: panelRecord['spells'],
        review: panelRecord['review'],
        complete: panelRecord['complete'],
      };
      if (
        typeof path !== 'string' ||
        typeof stepAttribute !== 'string' ||
        Object.values(panelValues).some((value) => typeof value !== 'string')
      ) {
        throw new Error('The level-up seam returned a non-string locator.');
      }
      return {
        path,
        panelAttribute,
        stepAttribute,
        panels: panelValues as BrowserLevelUpSeam['panels'],
      };
    },
    {
      modulePath: '/src/builder/level-up-wizard.ts',
      requestedCharacterId: characterId,
    },
  );
}
