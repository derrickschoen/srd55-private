export const HOMEBREW_ROUTE = '/homebrew';
export const HOMEBREW_ARCHIVE_ROUTE = `${HOMEBREW_ROUTE}/archive`;

export function homebrewReplacementPath(
  oldContentKey: string,
  newContentKey: string,
): string {
  return `${HOMEBREW_ROUTE}/replacements/${encodeURIComponent(oldContentKey)}/${encodeURIComponent(newContentKey)}`;
}

export function homebrewDeletePath(contentKey: string): string {
  return `${HOMEBREW_ROUTE}/delete/${encodeURIComponent(contentKey)}`;
}
