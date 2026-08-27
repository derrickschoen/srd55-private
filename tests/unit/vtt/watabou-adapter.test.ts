import { describe, expect, it } from 'vitest';
import { reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  adaptWatabouDungeon,
  decodeWatabouDungeon,
} from '../../../src/vtt/watabou-adapter';
import { declareTestInputs } from '../../helpers/test-inputs';

const FIXTURE = 'tests/fixtures/watabou/one-page-dungeon-sample.json' as const;
const inputs = declareTestInputs({ fixtures: [FIXTURE] });

describe('Watabou One Page Dungeon adapter', () => {
  it('maps documented rectangles, doors, notes, and provenance into reducer state', () => {
    const source: unknown = JSON.parse(inputs.fixtures.readText(FIXTURE));
    const decoded = decodeWatabouDungeon(source);
    const encounter = adaptWatabouDungeon(source, { seed: 1_143_801_683 });

    expect(decoded.rects).toHaveLength(2);
    expect(encounter.provenance).toEqual({
      source: 'watabou',
      licenseTag: 'LicenseRef-Watabou-Output-Free-Use',
      seed: 1_143_801_683,
    });
    expect(encounter.state.bounds).toEqual({ columns: 14, rows: 12 });
    expect(encounter.state.worldObjects).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'door', position: { column: 7, row: 4 } }),
      expect.objectContaining({ kind: 'door', position: { column: 0, row: 2 } }),
    ]));
    expect(encounter.state.dmNotes).toContain('1: A brazier marks the old crossing.');

    const started = reduceEncounter(encounter.state, { type: 'roll_initiative' }, mulberry32(7));
    expect(started.state.revision).toBe(1);
  });
});
