import {
  catalogContentLayers,
  type CatalogContentLayer,
} from './content-registry';

/**
 * What a catalog consumer can honestly say about an entry's publication layer.
 * `unknown` is deliberately distinct from either real layer: a missing or
 * unreadable registry row must never be presented as bundled or homebrew.
 */
export type CatalogLayerDisclosure = CatalogContentLayer | 'unknown';

export type CharacterCatalogSourceKind =
  | 'class'
  | 'subclass'
  | 'feat'
  | 'species'
  | 'background'
  | 'spell'
  | 'weapon'
  | 'armor';

export interface CharacterCatalogDisclosure {
  readonly kind: CharacterCatalogSourceKind;
  readonly name: string;
  readonly content_key: string | null;
  readonly catalog_layer: CatalogLayerDisclosure;
}

/** A catalog name kept inseparable from the layer a consumer must disclose. */
export interface CatalogNamedDisclosure {
  readonly name: string;
  readonly catalog_layer: CatalogLayerDisclosure;
}

export function catalogLayerDisclosure(
  stored: string | null,
): CatalogLayerDisclosure {
  return (catalogContentLayers as readonly string[]).includes(stored ?? '')
    ? stored as CatalogContentLayer
    : 'unknown';
}

export function catalogLayerLabel(layer: CatalogLayerDisclosure): string {
  switch (layer) {
    case 'bundled':
      return 'SRD · bundled layer';
    case 'external':
      return 'Homebrew · external layer';
    case 'unknown':
      return 'Unknown catalog layer';
  }
}
