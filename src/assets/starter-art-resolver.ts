import type { AssetId } from './ids';
import { renderPixelArtSvg } from './pixel-art';
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

export function renderStarterArtSvg(
  id: AssetId,
  manifest: ArtManifest = STARTER_ART_MANIFEST,
): string {
  return renderPixelArtSvg(resolveStarterArt(id, manifest).input);
}

export function starterArtDataUri(id: AssetId): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(renderStarterArtSvg(id))}`;
}
