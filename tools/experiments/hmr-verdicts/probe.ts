import { openSeededTestDatabase } from '../../../tests/helpers/open-db';

const MARKER = 'application-seed-overlay';
const LISTENER_CANARY = 'hmr-verdicts-listener-canary';

// A deliberately disposable side effect. Re-evaluating the full reverse cone
// without a dispose contract makes the count grow, exposing listener leakage.
process.on(LISTENER_CANARY, () => undefined);

export function listenerCanaryCount(): number {
  return process.listenerCount(LISTENER_CANARY);
}

export async function markerPresent(): Promise<boolean> {
  const db = await openSeededTestDatabase({ profile: 'test-core' });
  try {
    const markerTableCount = Number(db.selectValue(
      `SELECT count(*)
       FROM sqlite_schema
       WHERE type = 'table' AND name = 'hmr_verdict_markers'`,
    ));
    if (markerTableCount !== 1) return false;
    return Number(db.selectValue(
      `SELECT count(*)
       FROM hmr_verdict_markers
       WHERE marker = $marker`,
      { $marker: MARKER },
    )) === 1;
  } finally {
    db.close();
  }
}

