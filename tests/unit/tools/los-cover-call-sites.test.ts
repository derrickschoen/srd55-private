import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';
import { feet, worldObjectId } from '../../../src/combat/values';
import { feetPoint } from '../../../src/combat/templates';
import { previewAffectedCellKeys } from '../../../src/vtt/encounter-selectors';
import type { PlayerBoardProjection } from '../../../src/vtt/encounter-projections';

const RUNTIME_CONSUMERS = [
  'src/combat/encounter.ts',
  'src/combat/encounter-movement-world.ts',
  'src/vtt/engine-query-port.ts',
  'src/vtt/intent-resolver.ts',
  'src/vtt/turn-option-registry.ts',
  'src/vtt/party-pack.ts',
  'src/vtt/reference-encounter.ts',
  'src/vtt/regret/legal-actions.ts',
] as const;

const MOVEMENT_CONSUMERS = [
  'src/combat/encounter.ts',
  'src/combat/encounter-movement-world.ts',
  'src/vtt/engine-state-capsule.ts',
  'src/vtt/watabou-adapter.ts',
  'src/vtt/vane-warren.ts',
  'src/vtt/regret/legal-actions.ts',
] as const;

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('D576 exhaustive runtime call-site cutover', () => {
  it('keeps rasterization and sight-blocking interpretation inside the canonical trace', () => {
    const violations = RUNTIME_CONSUMERS.flatMap((path) => {
      const text = source(path);
      return [
        ...(text.includes('rasterizeInterveningCells') ? [`${path}: local rasterizer use`] : []),
        ...(text.includes('blocking.lineOfSight') ? [`${path}: raw sight flag use`] : []),
      ];
    });
    expect(violations).toEqual([]);
    expect(source('src/vtt/engine-query-port.ts')).not.toContain('function hasLineOfSight');
    expect(source('src/combat/cover.ts')).toContain('export function traceTerrainLine');
    expect(source('src/combat/cover.ts')).toContain('export function traceCombatantLine');
    expect(source('src/combat/cover.ts')).toContain('export function outerCorners');
    expect(source('src/combat/cover.ts')).toContain('export function cornerLineCrossesCell');
    expect(source('src/combat/cover.ts')).toContain('export function rasterizeCornerLine');
    expect(source('src/combat/cover.ts')).not.toContain('canonical centre-to-centre trace');
    expect(source('src/vtt/encounter-selectors.ts')).toContain(`const walls = terrainWallCells({
    blockedCells: projection.blockedCells,
    worldObjects: projection.worldObjects.map((object) => ({`);
    expect(source('src/vtt/encounter-app.ts')).toContain(
      'const preview = previewAffectedCellKeys(projection, staged.area);',
    );
    expect(source('src/vtt/encounter-app.ts')).not.toContain('terrainWallCells');
    expect(source('src/vtt/encounter-app.ts')).not.toContain('affectedCellsAmong');

    const visibleCells = Array.from({ length: 3 }, (_unused, row) =>
      Array.from({ length: 5 }, (_anotherUnused, column) => ({ column, row }))).flat();
    const projection: PlayerBoardProjection = {
      audience: 'player',
      revision: 0,
      round: 1,
      bounds: { columns: 5, rows: 3 },
      blockedCells: [],
      terrainCells: [],
      visibleCells,
      concealedCells: [],
      activeCombatant: null,
      highlightedCombatant: null,
      combatants: [],
      lastSeen: [],
      worldObjects: [{
        id: worldObjectId('object:preview-wall'),
        name: 'Preview wall',
        kind: 'barrier',
        position: { column: 1, row: 0 },
        cells: [
          { column: 1, row: 0 },
          { column: 1, row: 1 },
          { column: 1, row: 2 },
        ],
        blocking: { movement: true, lineOfSight: true, cover: 'total' },
        terrainKind: 'wall',
        lightClass: 'none',
      }],
      activePcResources: null,
      pendingRequest: null,
      events: [],
      adjudicatedTargets: [],
      authorityStatus: 'connected',
      partySession: null,
    };
    expect(previewAffectedCellKeys(projection, {
      shape: 'sphere', template: { origin: feetPoint(0, 5), radius: feet(30) },
    })).toEqual({
      kind: 'available',
      cellKeys: ['0,0', '0,1', '0,2'],
    });
  });

  it('keeps movement consumers on typed passability rather than raw object movement flags', () => {
    expect(MOVEMENT_CONSUMERS.flatMap((path) =>
      source(path).includes('blocking.movement') ? [path] : [],
    )).toEqual([]);
  });
});
