export type LogicalAssetRole = 'floor' | 'wall' | 'door' | 'prop' | 'player-token' | 'monster-token';

export interface AssetIdMapping {
  readonly assetId: string;
  readonly fallbackUsed: boolean;
  readonly sourceAssetId: string;
}

const FALLBACKS = {
  floor: 'tile.stone.floor',
  wall: 'wall.stone',
  door: 'door.wood',
  prop: 'prop.pillar',
  'player-token': 'token.adventurer',
  'monster-token': 'token.goblin',
} as const satisfies Readonly<Record<LogicalAssetRole, string>>;

export function logicalAssetId(sourceAssetId: string, role: LogicalAssetRole): AssetIdMapping {
  let mapped: string | null = null;
  switch (role) {
    case 'floor':
      if (/^art\.map\.floor\.stone(?:[.-][a-z0-9]+)*\.v\d+$/u.test(sourceAssetId)) mapped = 'tile.stone.floor';
      break;
    case 'wall':
      if (/^art\.map\.wall\.stone(?:[.-][a-z0-9]+)*\.v\d+$/u.test(sourceAssetId)) mapped = 'wall.stone';
      break;
    case 'door':
      if (/^art\.map\.door\.wood(?:[.-][a-z0-9]+)*\.v\d+$/u.test(sourceAssetId)) mapped = 'door.wood';
      break;
    case 'prop':
      if (/crate|barrel/u.test(sourceAssetId)) mapped = 'prop.barrel';
      else if (/table/u.test(sourceAssetId)) mapped = 'prop.table';
      else if (/pillar/u.test(sourceAssetId)) mapped = 'prop.pillar';
      else if (/torch|light/u.test(sourceAssetId)) mapped = 'prop.torch';
      break;
    case 'player-token':
      if (/^art\.token\.pc\./u.test(sourceAssetId)) mapped = 'token.adventurer';
      break;
    case 'monster-token':
      if (/^art\.token\.monster\./u.test(sourceAssetId)) mapped = 'token.goblin';
      break;
  }
  return {
    assetId: mapped ?? FALLBACKS[role],
    fallbackUsed: mapped === null,
    sourceAssetId,
  };
}
