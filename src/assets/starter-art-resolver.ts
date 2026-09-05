import type { AssetId } from './ids';
import { base64 } from './png';
import { renderPixelArtPng } from './pixel-art';
import {
  STARTER_ART_MANIFEST,
  type ArtManifest,
  type ArtManifestAsset,
} from './starter-art-manifest';
import { STARTER_ART_INPUTS_BY_ID, type StarterArtInput } from './starter-art-inputs';

export interface ResolvedStarterArt {
  readonly manifest: ArtManifestAsset;
  readonly input: StarterArtInput;
}

export function resolveStarterArt(
  id: AssetId,
  manifest: ArtManifest = STARTER_ART_MANIFEST,
): ResolvedStarterArt {
  const row = manifest.assets.find((asset) => asset.id === id);
  if (row === undefined) throw new Error(`Unknown starter-art asset id ${id}.`);
  const input = STARTER_ART_INPUTS_BY_ID.get(row.source.inputId);
  if (input === undefined) throw new Error(`Starter-art input ${row.source.inputId} is not checked in.`);
  return Object.freeze({ manifest: row, input });
}

export function renderStarterArtPng(
  id: AssetId,
  manifest: ArtManifest = STARTER_ART_MANIFEST,
): Uint8Array {
  return renderPixelArtPng(resolveStarterArt(id, manifest).input.recipe);
}

const DATA_URI_CACHE = new Map<AssetId, string>();

/** Rendering is pure, so the data URI for an id is memoised for the life of the module. */
export function starterArtDataUri(id: AssetId): string {
  const cached = DATA_URI_CACHE.get(id);
  if (cached !== undefined) return cached;
  const uri = `data:image/png;base64,${base64(renderStarterArtPng(id))}`;
  DATA_URI_CACHE.set(id, uri);
  return uri;
}

/** For CSS custom properties: `url("data:...")`. */
export function starterArtCssUrl(id: AssetId): string {
  return `url("${starterArtDataUri(id)}")`;
}
