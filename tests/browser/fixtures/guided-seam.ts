import type { Page } from '@playwright/test';

export interface BrowserGuidedSeam {
  readonly newRoute: string;
  readonly panelAttribute: string;
  readonly classChooserPanel: string;
  readonly abilitiesStepPanel: string;
  readonly speciesStepPanel: string;
  readonly backgroundStepPanel: string;
  readonly abilityMethodAttribute: string;
  readonly abilityInputAttribute: string;
  readonly abilityWarningAttribute: string;
  readonly abilitySubmitAttribute: string;
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
      const abilityAttributes = exports['ABILITY_STEP_ATTR'];
      if (typeof abilityAttributes !== 'object' || abilityAttributes === null) {
        throw new Error('The guided seam did not export ability-step locators.');
      }
      const abilityAttributeRecord = abilityAttributes as Record<string, unknown>;
      const newRoute = exports['GUIDED_NEW_ROUTE'];
      const panelAttribute = exports['GUIDED_PANEL_ATTRIBUTE'];
      const classChooserPanel = panelRecord['classChooser'];
      const abilitiesStepPanel = panelRecord['abilitiesStep'];
      const speciesStepPanel = panelRecord['speciesStep'];
      const backgroundStepPanel = panelRecord['backgroundStep'];
      const abilityMethodAttribute = abilityAttributeRecord['method'];
      const abilityInputAttribute = abilityAttributeRecord['input'];
      const abilityWarningAttribute = abilityAttributeRecord['warning'];
      const abilitySubmitAttribute = abilityAttributeRecord['submit'];
      const pathWriter = exports['guidedBuildPath'];
      if (
        typeof newRoute !== 'string' ||
        typeof panelAttribute !== 'string' ||
        typeof classChooserPanel !== 'string' ||
        typeof abilitiesStepPanel !== 'string' ||
        typeof speciesStepPanel !== 'string' ||
        typeof backgroundStepPanel !== 'string' ||
        typeof abilityMethodAttribute !== 'string' ||
        typeof abilityInputAttribute !== 'string' ||
        typeof abilityWarningAttribute !== 'string' ||
        typeof abilitySubmitAttribute !== 'string' ||
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
        abilitiesStepPanel,
        speciesStepPanel,
        backgroundStepPanel,
        abilityMethodAttribute,
        abilityInputAttribute,
        abilityWarningAttribute,
        abilitySubmitAttribute,
        buildPath,
      };
    },
    {
      modulePath: '/src/builder/contracts.ts',
      requestedCharacterId: characterId,
    },
  );
}
