import { bundledSrdSubclassDefinitionContentKeys } from './srd-subclass-content';

/** Every bundled subclass definition key, independent of progression shape. */
export function bundledSubclassDefinitionContentKeys(): readonly string[] {
  return Object.freeze([
    ...bundledSrdSubclassDefinitionContentKeys(),
  ]);
}
