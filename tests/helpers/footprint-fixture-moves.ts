import { canonicalJson } from '../../src/commands/canonical-json';

/**
 * FOOTPRINT (owner rulings D900, D904 Q1, D907 Q7): the literal anchor moves that repaired the 19 illegal
 * starting placements of eight committed fixtures, one overhang (seed-6203009's Huge Skyspear Hunter at
 * (17, 3) on 19 columns) and 18 overlapping pairs, by the D514 rule: every token legal against all the others
 * stays; every other token, in token order, keeps its anchor if that is legal against the tokens already fixed,
 * else takes the first legal anchor by Chebyshev distance, then row-major.
 *
 * The table was derived by an independent python oracle that runs no repo code
 * (.tmp/runs/footprint/plan-r2/geometry.py, re-run at 0d3ef291) and applied by a script that only transcribes it.
 * Its committed evidence is the footprint-fixture-repair test (a test-local restatement of the rule) and the
 * room-roster preflight, which rebuilds each pre-repair fixture's sha256 from the repaired bytes and this table.
 *
 * The seven arena-basis-brutal repairs are INTERIM (D911): the brutal cohort is regenerated under the final rules
 * by COVER-EDGE + REGEN. seed-3943006 (arena-basis, not a study cohort) is permanent.
 */
export interface FootprintFixtureMove {
  readonly combatantId: `combatant:generated-${string}`;
  readonly from: { readonly column: number; readonly row: number };
  readonly to: { readonly column: number; readonly row: number };
}

export const FOOTPRINT_FIXTURE_MOVES = {
  'tests/fixtures/arena-basis-brutal/seed-6203001.json': [
    { combatantId: 'combatant:generated-6203001-monster-2', from: { column: 16, row: 1 }, to: { column: 15, row: 0 } },
    { combatantId: 'combatant:generated-6203001-monster-4', from: { column: 16, row: 3 }, to: { column: 15, row: 2 } },
  ],
  'tests/fixtures/arena-basis-brutal/seed-6203002.json': [
    { combatantId: 'combatant:generated-6203002-monster-2', from: { column: 14, row: 1 }, to: { column: 13, row: 0 } },
  ],
  'tests/fixtures/arena-basis-brutal/seed-6203003.json': [
    { combatantId: 'combatant:generated-6203003-monster-2', from: { column: 9, row: 1 }, to: { column: 8, row: 0 } },
    { combatantId: 'combatant:generated-6203003-monster-4', from: { column: 9, row: 3 }, to: { column: 8, row: 2 } },
    { combatantId: 'combatant:generated-6203003-monster-6', from: { column: 9, row: 5 }, to: { column: 8, row: 4 } },
  ],
  'tests/fixtures/arena-basis-brutal/seed-6203006.json': [
    { combatantId: 'combatant:generated-6203006-monster-2', from: { column: 18, row: 1 }, to: { column: 17, row: 2 } },
    { combatantId: 'combatant:generated-6203006-monster-3', from: { column: 19, row: 3 }, to: { column: 20, row: 2 } },
    { combatantId: 'combatant:generated-6203006-monster-4', from: { column: 18, row: 3 }, to: { column: 16, row: 5 } },
  ],
  'tests/fixtures/arena-basis-brutal/seed-6203008.json': [
    { combatantId: 'combatant:generated-6203008-monster-2', from: { column: 13, row: 1 }, to: { column: 12, row: 2 } },
  ],
  'tests/fixtures/arena-basis-brutal/seed-6203009.json': [
    { combatantId: 'combatant:generated-6203009-monster-2', from: { column: 16, row: 1 }, to: { column: 15, row: 2 } },
    { combatantId: 'combatant:generated-6203009-monster-3', from: { column: 17, row: 3 }, to: { column: 14, row: 6 } },
    { combatantId: 'combatant:generated-6203009-monster-4', from: { column: 16, row: 3 }, to: { column: 14, row: 1 } },
  ],
  'tests/fixtures/arena-basis-brutal/seed-6203010.json': [
    { combatantId: 'combatant:generated-6203010-monster-2', from: { column: 12, row: 1 }, to: { column: 11, row: 2 } },
    { combatantId: 'combatant:generated-6203010-monster-3', from: { column: 13, row: 3 }, to: { column: 11, row: 5 } },
  ],
  'tests/fixtures/arena-basis/seed-3943006.json': [
    { combatantId: 'combatant:generated-3943006-monster-2', from: { column: 9, row: 1 }, to: { column: 8, row: 0 } },
  ],
} as const satisfies Readonly<Record<`tests/fixtures/${string}.json`, readonly [FootprintFixtureMove, ...FootprintFixtureMove[]]>>;

export type FootprintRepairedFixturePath = keyof typeof FOOTPRINT_FIXTURE_MOVES;

export const FOOTPRINT_REPAIRED_FIXTURE_PATHS = Object.keys(FOOTPRINT_FIXTURE_MOVES) as readonly FootprintRepairedFixturePath[];

/** The sha256 of each repaired fixture (canonical JSON + LF), as committed by FOOTPRINT C1. */
export const FOOTPRINT_REPAIRED_FIXTURE_DIGESTS = {
  'tests/fixtures/arena-basis-brutal/seed-6203001.json': '83f133343d10260bc42d5e713c803baa679ca94b0893eecf5ffcc6a421efd3b4',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json': '24b41ffd38355e6309f219dfa8c4c356302d8a873a3e7ba15fb1805fad8d160e',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json': 'bcd4989588f09075bc1965e63ffa232b702554b79b2b0dad3cf08cd84293ac38',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json': '43e1f490ec237ba37ce890b9d094046a0db30fa7be626b20d4451fddea9473fd',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json': '63f1de5c69c2ee5c230de166cef02c6f79b8ed449766caa0287d2811a9a8a1ff',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json': 'a87abda8ae7af70814a562d0484161ec9c090195d7f95b7a01eaed48cc1701dd',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json': '1a24ee6939e4fde3c55b9773b1054d5aa758afca96e9f007acadee576e8e2a4d',
  'tests/fixtures/arena-basis/seed-3943006.json': 'a889fa0ce689a727285c2df07ded09c6327f77fc683e315e1aa498bdff9dfcb4',
} as const satisfies Readonly<Record<FootprintRepairedFixturePath, string>>;

/** The sha256 each fixture had before the repair, at 0b688fbe (and unchanged to 0d3ef291). */
export const FOOTPRINT_SUPERSEDED_FIXTURE_DIGESTS = {
  'tests/fixtures/arena-basis-brutal/seed-6203001.json': '3f737f1ddf714b0381abdc0e822b3a07cda4c55287a4bc0b1a97cd4d7d71d63b',
  'tests/fixtures/arena-basis-brutal/seed-6203002.json': '8a7738bd2606792bae65da8f39f709ffad5b0bb5487f8e5749cecac4f29f9860',
  'tests/fixtures/arena-basis-brutal/seed-6203003.json': 'd54761b2864fcdc1a777f645ade96279da751b3247bca1e042fb997326dc060f',
  'tests/fixtures/arena-basis-brutal/seed-6203006.json': '3e6818fe70e276e9ee7407d76b01e3afab7254cc1c27e649d5f445a5f6a6480c',
  'tests/fixtures/arena-basis-brutal/seed-6203008.json': 'b067b1aa081f368859979415c468d997b6fa504cad6ad70dc6998c90eeb3207c',
  'tests/fixtures/arena-basis-brutal/seed-6203009.json': '9780276cdec0ee71c99cc13217d73376990866f5ab3ab471c7a793196665f7ce',
  'tests/fixtures/arena-basis-brutal/seed-6203010.json': '2ec7f3c1298e7b6f3519cf765bcb88f36be3426e02cf7572730a77af9e32114d',
  'tests/fixtures/arena-basis/seed-3943006.json': '39e33c47c0d3f5671b22466f4f605f48ac492bbf5ddd0c70a08604bd87422022',
} as const satisfies Readonly<Record<FootprintRepairedFixturePath, string>>;

type JsonToken = { readonly combatantId: unknown; readonly position: unknown; readonly [field: string]: unknown };
type JsonRoom = { readonly encounter: { readonly state: { readonly tokens: readonly JsonToken[] } } };

function samePosition(value: unknown, cell: FootprintFixtureMove['from']): boolean {
  return typeof value === 'object' && value !== null &&
    Reflect.get(value, 'column') === cell.column && Reflect.get(value, 'row') === cell.row;
}

/**
 * The fixture bytes with each listed move applied ('apply', from -> to) or undone ('revert', to -> from), as
 * canonical JSON + LF. Throws when a listed token is not at the anchor the move starts from, so a stale table
 * cannot silently leave a token in place.
 */
export function withFootprintMoves(
  bytes: string,
  moves: readonly FootprintFixtureMove[],
  direction: 'apply' | 'revert',
): string {
  const room = JSON.parse(bytes) as JsonRoom;
  const tokens = room.encounter.state.tokens.map((token) => {
    const move = moves.find((candidate) => candidate.combatantId === token.combatantId);
    if (move === undefined) return token;
    const [start, end] = direction === 'apply' ? [move.from, move.to] : [move.to, move.from];
    if (!samePosition(token.position, start)) {
      throw new Error(`${move.combatantId} is not at ${JSON.stringify(start)}: ${JSON.stringify(token.position)}.`);
    }
    return { ...token, position: { column: end.column, row: end.row } };
  });
  for (const move of moves) {
    if (!room.encounter.state.tokens.some((token) => token.combatantId === move.combatantId)) {
      throw new Error(`${move.combatantId} has no token in the fixture.`);
    }
  }
  return `${canonicalJson({ ...room, encounter: { ...room.encounter, state: { ...room.encounter.state, tokens } } })}\n`;
}
