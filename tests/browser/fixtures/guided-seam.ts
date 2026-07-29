import type { Page } from '@playwright/test';

export interface BrowserGuidedSeam {
  readonly newRoute: string;
  readonly panelAttribute: string;
  readonly classChooserPanel: string;
  readonly speciesStepPanel: string;
  readonly backgroundStepPanel: string;
  readonly buildPath: string | null;
}

export async function readGuidedSeam(
  page: Page,
  characterId?: number,
): Promise<BrowserGuidedSeam> {
  return page.evaluate(
    async ({ modulePath, requestedCharacterId }) => {
      const imported: unknown = await import(modulePath);
      if (typeof imported !== 'object' || imported === null) {
        throw new Error('The guided seam module did not export an object.');
      }
      const exports = imported as Record<string, unknown>;
      const panels = exports['GUIDED_PANEL'];
      if (typeof panels !== 'object' || panels === null) {
        throw new Error('The guided seam did not export its panels.');
      }
      const panelRecord = panels as Record<string, unknown>;
      const newRoute = exports['GUIDED_NEW_ROUTE'];
      const panelAttribute = exports['GUIDED_PANEL_ATTRIBUTE'];
      const classChooserPanel = panelRecord['classChooser'];
      const speciesStepPanel = panelRecord['speciesStep'];
      const backgroundStepPanel = panelRecord['backgroundStep'];
      const pathWriter = exports['guidedBuildPath'];
      if (
        typeof newRoute !== 'string' ||
        typeof panelAttribute !== 'string' ||
        typeof classChooserPanel !== 'string' ||
        typeof speciesStepPanel !== 'string' ||
        typeof backgroundStepPanel !== 'string' ||
        typeof pathWriter !== 'function'
      ) {
        throw new Error('The guided seam exports have unexpected shapes.');
      }
      const buildPath =
        requestedCharacterId === undefined
          ? null
          : (pathWriter as (id: number) => unknown)(requestedCharacterId);
      if (buildPath !== null && typeof buildPath !== 'string') {
        throw new Error('The guided build-path writer returned a non-string.');
      }
      return {
        newRoute,
        panelAttribute,
        classChooserPanel,
        speciesStepPanel,
        backgroundStepPanel,
        buildPath,
      };
    },
    {
      modulePath: '/src/builder/contracts.ts',
      requestedCharacterId: characterId,
    },
  );
}
