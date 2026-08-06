import {
  BUNDLED_SUBCLASS_OVERRIDE_SCHEDULE_CONTENT_KEYS,
} from './class-progression-lookup';
import { bundledSrdSubclassDefinitionContentKeys } from './srd-subclass-content';
import {
  bundledVeteranSubclassDefinitionContentKeys,
} from './veteran-subclass-content';

/** Every bundled subclass definition key, independent of progression shape. */
export function bundledSubclassDefinitionContentKeys(): readonly string[] {
  return Object.freeze([
    ...bundledSrdSubclassDefinitionContentKeys(),
    ...BUNDLED_SUBCLASS_OVERRIDE_SCHEDULE_CONTENT_KEYS,
    ...bundledVeteranSubclassDefinitionContentKeys(),
  ]);
}
