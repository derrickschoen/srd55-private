import { z } from 'zod';
import type { Brand } from '../domain/ids';

export type AssetId = Brand<string, 'AssetId'>;

export const assetIdSchema = z
  .string()
  .regex(
    /^art\.(?:token|map|terrain|fog|focus|event)\.[a-z0-9]+(?:[.-][a-z0-9]+)*\.v\d+$/,
    'Asset ids must be lowercase, semantic, versioned art ids.',
  )
  .brand<'AssetId'>();

export function assetId(value: string): AssetId {
  return assetIdSchema.parse(value);
}
