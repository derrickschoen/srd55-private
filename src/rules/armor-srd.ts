/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * The bundled armour catalog: twelve armours plus Shield, parsed from
 * `docs/srd/source/armor-table.txt` AT BUILD TIME by `armor-srd-reader.ts` and
 * read here from the generated artifact (`generated/armor-srd.ts`, written by
 * `npm run srd:artifacts`). This module imports no SRD text.
 */
import { deepFreeze } from '../domain/deep-freeze';
import {
  recordedContentKeys,
  type RecordedContentKey,
} from '../domain/recorded-content-keys';
import type { SrdArmorTemplate } from './armor-srd-reader';
import {
  BUNDLED_SRD_ARMOR_TEMPLATES,
  type BundledSrdArmorContentKeyText,
} from './generated/armor-srd';

/** A bundled armour's key: one the build recorded, earned as a `ContentKey`. */
export type BundledArmorContentKey =
  RecordedContentKey<BundledSrdArmorContentKeyText>;

/** A bundled armour template, keyed by a bundled armour key. */
export type BundledArmorTemplate = SrdArmorTemplate<BundledArmorContentKey>;

const ARMOR_KEYS = recordedContentKeys(
  'armor',
  BUNDLED_SRD_ARMOR_TEMPLATES.map((template) => template.content_key),
);

/** Mints a bundled armour key; refuses a key the build did not record. */
export function bundledArmorContentKey(value: string): BundledArmorContentKey {
  return ARMOR_KEYS.key(value);
}

const BUNDLED_ARMOR_TEMPLATES: readonly BundledArmorTemplate[] = deepFreeze(
  BUNDLED_SRD_ARMOR_TEMPLATES.map((template) => ({
    ...template,
    content_key: bundledArmorContentKey(template.content_key),
  })),
);

/** The thirteen bundled armour rows, in table order, shared and deeply frozen. */
export function bundledArmorTemplates(): readonly BundledArmorTemplate[] {
  return BUNDLED_ARMOR_TEMPLATES;
}
