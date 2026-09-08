import { describe, expect, it } from 'vitest';
import { createEncounter } from '../../../src/combat/encounter';
import { terrainBlocking } from '../../../src/combat/terrain';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import {
  auditEncounterState,
  buildEraAuditReport,
  buildEraAuditReportFromRooms,
  ERA_AUDIT_ROOM_COUNT,
  legacyLineResult,
} from '../../../tools/los-cover-era-audit';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function wallObject(): WorldObject {
  return {
    id: worldObjectId('object:legacy-wall'), name: 'Legacy wall', kind: 'barrier',
    position: { column: 2, row: 0 }, footprint: [{ column: 2, row: 0 }],
    durability: { kind: 'indestructible' }, armorClass: armorClass(10), damageResponses: [],
    blocking: terrainBlocking('wall'), createdRevision: 0,
  };
}

describe('D576 mechanical-era audit', () => {
  it('pins the frozen legacy oracle independently of the production cutover', () => {
    const source = playerProfile('era-source');
    const target = monsterProfile('era-target');
    const base = {
      bounds: { columns: 5, rows: 2 }, combatants: [source, target],
      tokens: [placedToken(source, 0), placedToken(target, 4)],
    };
    const blockedCell = createEncounter({ ...base, blockedCells: [{ column: 2, row: 0 }] });
    expect(legacyLineResult(blockedCell, source.id, target.id)).toEqual({ lineOfSight: true, tier: 'none' });

    const objectWall = createEncounter({ ...base, worldObjects: [wallObject()] });
    expect(legacyLineResult(objectWall, source.id, target.id)).toEqual({ lineOfSight: false, tier: 'total' });

    const intervening = playerProfile('era-intervening');
    const creatureCover = createEncounter({
      ...base,
      combatants: [source, intervening, target],
      tokens: [placedToken(source, 0), placedToken(intervening, 2), placedToken(target, 4)],
    });
    expect(legacyLineResult(creatureCover, source.id, target.id)).toEqual({ lineOfSight: true, tier: 'half' });
  });

  it('M576-E1A-ERA-USES-UNORDERED-PAIRS enumerates ordered distinct living placed pairs and counts either-change once', () => {
    const left = playerProfile('era-left');
    const middle = playerProfile('era-middle');
    const right = monsterProfile('era-right');
    const state = createEncounter({
      bounds: { columns: 7, rows: 6 }, combatants: [left, middle, right],
      tokens: [placedToken(left, 0, 0), placedToken(middle, 0, 4), placedToken(right, 6, 2)],
      // A hand-counted full-height wall separates Right from the two left-side creatures.
      blockedCells: [0, 1, 2, 3, 4, 5].map((row) => ({ column: 3, row })),
    });
    const counts = auditEncounterState(state);
    expect(counts.denominator).toBe(6);
    expect(counts.line_of_sight_changed).toBe(4);
    expect(counts.cover_tier_changed).toBe(4);
    expect(counts.either_changed).toBe(4);
    expect(counts.tier_transitions['none->none']).toBe(2);
    expect(counts.tier_transitions['none->total']).toBe(4);
    expect(Object.values(counts.tier_transitions).reduce((sum, count) => sum + count, 0)).toBe(6);
  });

  it('M576-E1A-ERA-OMITS-UNCHANGED-ROOM reports all 63 rooms, including unchanged rows, in the exact family census', async () => {
    const report = await buildEraAuditReport();
    expect(report.terrain_profiles).toEqual({
      open: { cover_tier: 'none', passability: 'open', blocks_sight: false },
      half_cover: { cover_tier: 'half', passability: 'difficult', blocks_sight: false },
      three_quarters_cover: { cover_tier: 'three_quarters', passability: 'blocked', blocks_sight: false },
      wall: { cover_tier: 'total', passability: 'blocked', blocks_sight: true },
    });
    expect(report.rooms).toHaveLength(ERA_AUDIT_ROOM_COUNT);
    expect(report.rooms.filter((row) => row.family === 'hard')).toHaveLength(13);
    expect(report.rooms.filter((row) => row.family === 'brutal')).toHaveLength(10);
    expect(report.rooms.filter((row) => row.family === 'brutal-b')).toHaveLength(10);
    expect(report.rooms.filter((row) => row.family === 'pool')).toHaveLength(30);
    expect(report.rooms[0]).toMatchObject({ family: 'hard', seed: 5_117_001, room: 1 });
    expect(report.rooms.at(-1)).toMatchObject({ family: 'pool', seed: 6_208_030, room: 30 });
    expect(report.rooms.every((row) => /^[a-f0-9]{64}$/.test(row.fixture_hash))).toBe(true);
    expect(report.overall.denominator).toBe(report.rooms.reduce((sum, row) => sum + row.denominator, 0));
    expect(report.overall.either_changed).toBe(report.rooms.reduce((sum, row) => sum + row.either_changed, 0));
    const leftFixture = playerProfile('era-unchanged-left');
    const rightFixture = monsterProfile('era-unchanged-right');
    const unchanged = createEncounter({
      bounds: { columns: 3, rows: 1 }, combatants: [leftFixture, rightFixture],
      tokens: [placedToken(leftFixture, 0), placedToken(rightFixture, 2)],
    });
    const mixed = buildEraAuditReportFromRooms([
      { family: 'pool', seed: 1, room: 1, fixtureHash: 'a'.repeat(64), state: unchanged },
      { family: 'pool', seed: 2, room: 2, fixtureHash: 'b'.repeat(64), state: createEncounter({
        bounds: { columns: 3, rows: 1 }, combatants: [leftFixture, rightFixture],
        tokens: [placedToken(leftFixture, 0), placedToken(rightFixture, 2)],
        blockedCells: [{ column: 1, row: 0 }],
      }) },
    ]);
    expect(mixed.rooms.map((row) => row.either_changed)).toEqual([0, 2]);
  });
});
