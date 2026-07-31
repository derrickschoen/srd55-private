/**
 * The PWA boundary for browser-profile state.
 *
 * Guided character state remains derived exclusively from SQLite (D48).
 * D116's deliberately browser-profile-scoped, non-domain hint marker enters
 * through this boundary instead of making the guided flow a storage client.
 */
export function browserProfileStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}
