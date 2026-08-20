import { z } from 'zod';
import { assetIdSchema, type AssetId } from '../assets/ids';
import { resolveStarterArt } from '../assets/starter-art-resolver';

const packageCellSchema = z.strictObject({
  column: z.number().int().nonnegative(),
  row: z.number().int().nonnegative(),
});

export const encounterArtPackageSchema = z.strictObject({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^encounter-art:[a-z0-9-]+:v\d+$/u),
  room: z.strictObject({
    columns: z.number().int().min(1).max(64),
    rows: z.number().int().min(1).max(64),
    floor: assetIdSchema,
    wall: assetIdSchema,
    door: assetIdSchema,
    doorCell: packageCellSchema,
  }),
  terrain: z.array(z.strictObject({
    cell: packageCellSchema,
    asset: assetIdSchema,
  })),
  fog: z.strictObject({
    hidden: assetIdSchema,
    unexplored: assetIdSchema,
    revealed: assetIdSchema,
  }),
  ui: z.strictObject({
    activePc: assetIdSchema,
    adjudicated: assetIdSchema,
  }),
  combatantTokens: z.record(z.string().min(1), assetIdSchema),
}).superRefine((value, context) => {
  const inBounds = (cell: { readonly column: number; readonly row: number }): boolean =>
    cell.column < value.room.columns && cell.row < value.room.rows;
  if (!inBounds(value.room.doorCell)) {
    context.addIssue({ code: 'custom', path: ['room', 'doorCell'], message: 'The room door must be inside the package bounds.' });
  }
  const terrainCells = new Set<string>();
  value.terrain.forEach((entry, index) => {
    const key = `${String(entry.cell.column)},${String(entry.cell.row)}`;
    if (!inBounds(entry.cell)) {
      context.addIssue({ code: 'custom', path: ['terrain', index, 'cell'], message: 'Terrain must be inside the package bounds.' });
    }
    if (terrainCells.has(key)) {
      context.addIssue({ code: 'custom', path: ['terrain', index, 'cell'], message: `Duplicate terrain cell ${key}.` });
    }
    terrainCells.add(key);
  });
  const ids: readonly (readonly [AssetId, 'token' | 'map' | 'terrain' | 'fog' | 'focus' | 'event'])[] = [
    [value.room.floor, 'map'],
    [value.room.wall, 'map'],
    [value.room.door, 'map'],
    ...value.terrain.map((entry) => [entry.asset, 'terrain'] as const),
    [value.fog.hidden, 'fog'],
    [value.fog.unexplored, 'fog'],
    [value.fog.revealed, 'fog'],
    [value.ui.activePc, 'focus'],
    [value.ui.adjudicated, 'event'],
    ...Object.values(value.combatantTokens).map((id) => [id, 'token'] as const),
  ];
  ids.forEach(([id, expectedKind]) => {
    try {
      const resolved = resolveStarterArt(id);
      if (resolved.manifest.kind !== expectedKind) {
        context.addIssue({ code: 'custom', message: `Asset ${id} must be ${expectedKind}, not ${resolved.manifest.kind}.` });
      }
    } catch (error: unknown) {
      context.addIssue({ code: 'custom', message: error instanceof Error ? error.message : String(error) });
    }
  });
});

export type EncounterArtPackage = z.infer<typeof encounterArtPackageSchema>;

export function decodeEncounterArtPackage(value: unknown): EncounterArtPackage {
  return encounterArtPackageSchema.parse(value);
}
