import { describe, expect, it } from 'vitest';
import type { SerializedPlacementMode } from '../../../src/combat/creature-space';
import type { EncounterState } from '../../../src/combat/encounter';
import { decodeArenaBasisEnvelopeV1 } from '../../../src/vtt/arena-fixture';
import { decodeArenaFixtureText } from '../../../src/vtt/mcp/entrypoint';
import { declareTestInputs } from '../../helpers/test-inputs';

// FOOTPRINT W11 (owner D900, D904): every committed encounter fixture of the arena families decodes through
// the engine's fixture decoder (which now places whole bodies only), and, checked here without the engine's
// placement code, every board body lies on its grid and no two living bodies share a square unless a
// shared-space relation records why. The session fixtures (tests/fixtures/vtt) and the handoff scene
// (fixtures/scenes) are decoded by their own import tests through the same shared token decoder.
const FIXTURES = [
  'tests/fixtures/arena-basis-brutal-2/seed-6207001.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207002.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207003.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207004.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207005.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207006.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207007.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207008.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207009.json',
  'tests/fixtures/arena-basis-brutal-2/seed-6207010.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206001.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206002.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206003.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206004.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206005.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206006.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206007.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206008.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206009.json',
  'tests/fixtures/arena-basis-brutal-b/seed-6206010.json',
  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json',
  'tests/fixtures/arena-basis-brutal/seed-6203004.json',
  'tests/fixtures/arena-basis-brutal/seed-6203005.json',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json',
  'tests/fixtures/arena-basis-brutal/seed-6203007.json',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json',
  'tests/fixtures/arena-basis-challenge/seed-5831001.json',
  'tests/fixtures/arena-basis-challenge/seed-5831002.json',
  'tests/fixtures/arena-basis-challenge/seed-5831003.json',
  'tests/fixtures/arena-basis-challenge/seed-5831004.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118001.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118002.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118003.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118004.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118005.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118006.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118007.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118008.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118009.json',
  'tests/fixtures/arena-basis-hard-2/seed-5118010.json',
  'tests/fixtures/arena-basis-hard/seed-5117001.json',
  'tests/fixtures/arena-basis-hard/seed-5117002.json',
  'tests/fixtures/arena-basis-hard/seed-5117003.json',
  'tests/fixtures/arena-basis-hard/seed-5117004.json',
  'tests/fixtures/arena-basis-hard/seed-5117005.json',
  'tests/fixtures/arena-basis-hard/seed-5117006.json',
  'tests/fixtures/arena-basis-hard/seed-5117007.json',
  'tests/fixtures/arena-basis-hard/seed-5117008.json',
  'tests/fixtures/arena-basis-hard/seed-5117009.json',
  'tests/fixtures/arena-basis-hard/seed-5117010.json',
  'tests/fixtures/arena-basis-hard/seed-5117011.json',
  'tests/fixtures/arena-basis-hard/seed-5117012.json',
  'tests/fixtures/arena-basis-hard/seed-5117013.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762002.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762003.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762101.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762102.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762103.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762201.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762202.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762203.json',
  'tests/fixtures/arena-basis/seed-3943001.json',
  'tests/fixtures/arena-basis/seed-3943002.json',
  'tests/fixtures/arena-basis/seed-3943003.json',
  'tests/fixtures/arena-basis/seed-3943004.json',
  'tests/fixtures/arena-basis/seed-3943005.json',
  'tests/fixtures/arena-basis/seed-3943006.json',
  'tests/fixtures/arena-basis/seed-3943007.json',
  'tests/fixtures/arena-basis/seed-3943008.json',
  'tests/fixtures/arena-basis/seed-3943009.json',
  'tests/fixtures/arena-basis/seed-3943010.json',
  'tests/fixtures/arena-basis/seed-3943011.json',
  'tests/fixtures/arena-basis/seed-3943012.json',
  'tests/fixtures/arena-scenarios/hypnotic-pattern-cc.json',
  'tests/fixtures/room8-repro/seed-5117008.SIMULATED.json',
] as const;

const inputs = declareTestInputs({ fixtures: FIXTURES });

const SIDE = { Tiny: 1, Small: 1, Medium: 1, Large: 2, Huge: 3, Gargantuan: 4 } as const;

function squares(anchor: { readonly column: number; readonly row: number }, mode: SerializedPlacementMode): readonly string[] {
  const side = SIDE[mode.kind === 'squeezed' ? mode.sizedFor : mode.actual];
  const keys: string[] = [];
  for (let row = anchor.row; row < anchor.row + side; row += 1) {
    for (let column = anchor.column; column < anchor.column + side; column += 1) keys.push(`${String(column)},${String(row)}`);
  }
  return keys;
}

describe('FOOTPRINT W11: the committed encounter fixtures', () => {
  it('are 80 arena-family fixtures', () => {
    expect(FIXTURES).toHaveLength(80);
  });

  it.each(FIXTURES)('%s decodes, every body is on its grid, and no living bodies overlap without provenance', (path) => {
    // The challenge rooms are envelopes of the challenge mode; every other family is an engine fixture.
    const text = inputs.fixtures.readText(path);
    const state: EncounterState = path.startsWith('tests/fixtures/arena-basis-challenge/')
      ? decodeArenaBasisEnvelopeV1(JSON.parse(text) as unknown, { mode: 'challenge' }).encounter.state
      : decodeArenaFixtureText(text);
    const living = new Set(state.combatants.filter((entry) => entry.life !== 'dead').map((entry) => entry.profile.id));
    const bodies = state.tokens.map((token) => ({ id: token.combatantId, cells: squares(token.position, token.placementMode) }));
    for (const body of bodies) {
      for (const cell of body.cells) {
        const [column, row] = cell.split(',').map(Number) as [number, number];
        expect(column < state.bounds.columns && row < state.bounds.rows, `${path} ${body.id} square ${cell}`).toBe(true);
      }
    }
    const provenance = new Set(state.sharedSpaceRelations.map((relation) => [relation.first, relation.second].sort().join('|')));
    for (let left = 0; left < bodies.length; left += 1) {
      for (let right = left + 1; right < bodies.length; right += 1) {
        const [first, second] = [bodies[left]!, bodies[right]!];
        if (!living.has(first.id) || !living.has(second.id)) continue;
        const shared = first.cells.some((cell) => second.cells.includes(cell));
        expect(!shared || provenance.has([first.id, second.id].sort().join('|')), `${path} ${first.id} x ${second.id}`).toBe(true);
      }
    }
  });
});
