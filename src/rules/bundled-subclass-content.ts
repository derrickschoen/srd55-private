import type { ContentKey } from '../domain/ids';
import { bundledSrdSubclassDefinitionContentKeys } from './srd-subclass-content';

/** Every bundled subclass definition key, independent of progression shape. */
export function bundledSubclassDefinitionContentKeys(): readonly ContentKey[] {
  return Object.freeze([
    ...bundledSrdSubclassDefinitionContentKeys(),
  ]);
}
