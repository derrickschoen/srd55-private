import {
  catalogLayerLabel,
  type CatalogLayerDisclosure,
} from '../catalog/catalog-disclosure';

export interface CatalogSelectOption {
  readonly value: string;
  readonly label: string;
  readonly catalogLayer: CatalogLayerDisclosure;
  readonly selected?: boolean;
  readonly disabled?: boolean;
  /** Optional mechanical grouping that remains visible beside provenance. */
  readonly group?: string;
}

/**
 * Native option groups keep provenance visible and screen-reader reachable
 * without changing the option's selectable name.
 */
export function catalogSelectGroups(
  entries: readonly CatalogSelectOption[],
): readonly HTMLOptGroupElement[] {
  const groups = new Map<string, HTMLOptGroupElement>();
  for (const entry of entries) {
    const layer = catalogLayerLabel(entry.catalogLayer);
    const groupLabel = entry.group === undefined
      ? layer
      : `${entry.group} — ${layer}`;
    let group = groups.get(groupLabel);
    if (group === undefined) {
      group = document.createElement('optgroup');
      group.label = groupLabel;
      group.setAttribute('label', groupLabel);
      groups.set(groupLabel, group);
    }
    const option = document.createElement('option');
    option.value = entry.value;
    option.setAttribute('value', entry.value);
    option.textContent = entry.label;
    option.selected = entry.selected ?? false;
    if (option.selected) option.setAttribute('selected', '');
    option.disabled = entry.disabled ?? false;
    if (option.disabled) option.setAttribute('disabled', '');
    group.append(option);
  }
  return [...groups.values()];
}

/**
 * Connect a control to visible provenance while preserving its accessible
 * name as the catalog item's name.
 */
export function catalogControlDescription(
  control: HTMLElement,
  id: string,
  layer: CatalogLayerDisclosure,
): HTMLSpanElement {
  control.setAttribute('aria-describedby', id);
  const description = document.createElement('span');
  description.id = id;
  description.setAttribute('id', id);
  description.className = 'catalog-layer-disclosure';
  description.textContent = catalogLayerLabel(layer);
  return description;
}
