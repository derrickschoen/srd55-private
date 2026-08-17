import type { RulesEdition } from '../domain/enums';
import type { ContentKey } from '../domain/ids';
import type { CatalogLayerDisclosure } from './catalog-disclosure';

export interface HasName {
  readonly name: string;
}

export interface HasEdition {
  readonly rules_edition: RulesEdition;
}

export interface HasProvenance {
  readonly catalog_layer: CatalogLayerDisclosure;
}

/** Opt-in identity only. Authored and projected aggregates derive identity externally. */
export interface HasContentKey {
  readonly content_key: ContentKey;
}
