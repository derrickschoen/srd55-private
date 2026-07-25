import type {
  CatalogGapItem,
  CompletenessItem,
  CompletenessResult,
} from '../../../queries/character-completeness';

function entry(item: CompletenessItem | CatalogGapItem): HTMLElement {
  const listItem = document.createElement('li');
  const heading = document.createElement('h3');
  heading.textContent = item.title;
  const detail = document.createElement('p');
  detail.textContent = item.detail;
  const remedy = document.createElement('p');
  remedy.className = 'outstanding-remedy';
  remedy.textContent = item.remedy;
  listItem.append(heading, detail, remedy);
  return listItem;
}

function countLabel(count: number, noun: string): string {
  return `${count} ${count === 1 ? noun : `${noun}s`}`;
}

// The panel renders only once the workspace has loaded, so a null count means
// the completeness query failed, not that it is still in flight.
export function outstandingHeading(count: number | null): string {
  if (count === null) {
    return 'Not chosen yet — unavailable for this character.';
  }
  return count === 0
    ? 'Not chosen yet — nothing outstanding.'
    : `Not chosen yet — ${countLabel(count, 'item')}`;
}

export function catalogGapHeading(count: number): string {
  return `Catalog gaps — ${countLabel(count, 'item')}`;
}

export function renderCompleteness(
  result: CompletenessResult | null,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'planner-panel outstanding-panel';
  const heading = document.createElement('h2');
  heading.textContent = outstandingHeading(
    result === null ? null : result.outstanding_count,
  );
  section.append(heading);
  if (result === null) {
    return section;
  }
  if (result.items.length > 0) {
    const list = document.createElement('ol');
    list.className = 'outstanding-list';
    for (const item of result.items) {
      list.append(entry(item));
    }
    section.append(list);
  }
  if (result.catalog_gaps.length > 0) {
    const gapHeading = document.createElement('h2');
    gapHeading.textContent = catalogGapHeading(result.catalog_gap_count);
    const explanation = document.createElement('p');
    explanation.className = 'muted';
    explanation.textContent =
      'These are missing from your catalog rather than unfinished on this character, so they are not counted above.';
    const list = document.createElement('ol');
    list.className = 'outstanding-list';
    for (const gap of result.catalog_gaps) {
      list.append(entry(gap));
    }
    section.append(gapHeading, explanation, list);
  }
  return section;
}
