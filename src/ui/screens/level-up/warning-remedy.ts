import type { LevelUpPermanentWarning } from '../../../builder/level-up-wizard';
import { element } from '../../dom';
import { CATALOG_IMPORT_ROUTE } from '../character-list/import-backup-controls';

export function levelUpWarningRemedy(warning: LevelUpPermanentWarning): HTMLElement {
  if (warning.remedy_action === 'import_catalog') {
    return element('p', {}, [element('a', {
      text: 'Import a catalog with eligible spells',
      attributes: {
        href: CATALOG_IMPORT_ROUTE,
        'data-router-link': 'true',
        class: 'button-secondary',
      },
    })]);
  }
  return element('p', { text: warning.remedy });
}
