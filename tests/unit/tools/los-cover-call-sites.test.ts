import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
    expect(source('src/vtt/encounter-app.ts')).toContain('blockedCells: terrainWallCells({');
  });

  it('keeps movement consumers on typed passability rather than raw object movement flags', () => {
    expect(MOVEMENT_CONSUMERS.flatMap((path) =>
      source(path).includes('blocking.movement') ? [path] : [],
    )).toEqual([]);
  });
});
