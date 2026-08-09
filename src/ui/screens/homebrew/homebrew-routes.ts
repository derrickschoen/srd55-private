import type {
  AuthoredContentKind,
  PublishResult,
} from '../../../authoring/contracts';

export const HOMEBREW_ROUTE = '/homebrew';
export const HOMEBREW_ARCHIVE_ROUTE = `${HOMEBREW_ROUTE}/archive`;

export const HOMEBREW_MISSING_DRAFT_NOTICE = 'draft-no-longer-exists';

export function homebrewPublishedPath(
  contentKind: AuthoredContentKind,
  result: PublishResult,
  previousContentKey: string | null,
): string {
  const query = new URLSearchParams();
  if (contentKind !== 'species') query.set('tab', contentKind);
  query.set('publishOutcome', result.outcome);
  query.set('publishedKey', result.content_key);
  query.set('publishedName', result.name);
  query.set('publishedLayer', result.catalog_layer);
  query.set('previousUsageCount', String(result.previous_key_usage_count));
  if (
    previousContentKey !== null &&
    previousContentKey !== result.content_key &&
    result.previous_key_usage_count > 0
  ) {
    query.set('previousKey', previousContentKey);
  }
  return `${HOMEBREW_ROUTE}?${query.toString()}`;
}

export function homebrewMissingDraftPath(): string {
  const query = new URLSearchParams({
    tab: 'drafts',
    notice: HOMEBREW_MISSING_DRAFT_NOTICE,
  });
  return `${HOMEBREW_ROUTE}?${query.toString()}`;
}

export function homebrewReplacementPath(
  oldContentKey: string,
  newContentKey: string,
): string {
  return `${HOMEBREW_ROUTE}/replacements/${encodeURIComponent(oldContentKey)}/${encodeURIComponent(newContentKey)}`;
}

export function homebrewDeletePath(contentKey: string): string {
  return `${HOMEBREW_ROUTE}/delete/${encodeURIComponent(contentKey)}`;
}
