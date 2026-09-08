import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { base64 } from '../../src/assets/png';
import { renderStarterArtPng } from '../../src/assets/starter-art-resolver';
import { STARTER_ART_MANIFEST } from '../../src/assets/starter-art-manifest';
import { TILE_SIZE } from '../../src/assets/pixel-art';
import { combatantId, worldObjectId } from '../../src/combat/values';
import { encounterBoardRenderModel, projectEncounterTerrainCells } from '../../src/vtt/encounter-board';
import { REFERENCE_ENCOUNTER_ART } from '../../src/vtt/reference-encounter-art';

/**
 * The visual-review preview used to live under docs/design/assets-preview;
 * D516's lane may not write docs/**, so the generator now keeps it beside
 * the generator inputs. It embeds every asset once and renders both projections.
 */
export const STARTER_ART_PREVIEW_PATH = 'src/assets/preview/starter-art-board.svg';

function pngData(bytes: Uint8Array): string {
  return `data:image/png;base64,${base64(bytes)}`;
}

function symbolId(id: string): string {
  return `asset-${id.replaceAll('.', '-')}`;
}

export function useAsset(id: string, x: number, y: number, size: number): string {
  const scale = size / TILE_SIZE;
  if (!Number.isSafeInteger(scale) || scale < 1) throw new RangeError('Preview art must use a positive integer scale.');
  return `<use href="#${symbolId(id)}" transform="translate(${String(x)} ${String(y)}) scale(${String(scale)})" data-asset-id="${id}"/>`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function boardPreview(
  title: string,
  projection: Parameters<typeof encounterBoardRenderModel>[0],
  originX: number,
  originY: number,
): string {
  const size = TILE_SIZE;
  const model = encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART);
  const content = model.map((cell) => {
    const x = originX + cell.column * size;
    const y = originY + cell.row * size;
    const layers = cell.layers.map((layer) =>
      `<g data-layer="${layer.role}">${useAsset(layer.assetId, x, y, size)}</g>`,
    ).join('');
    if (cell.token === null) return layers;
    const tokenImages = [
      cell.token.assetId,
      cell.token.focusAssetId,
      cell.token.adjudicatedAssetId,
    ].flatMap((id) => id === null ? [] : [
      useAsset(id, x, y, size),
    ]).join('');
    return `${layers}${tokenImages}`;
  }).join('');
  return `<g data-projection="${title.toLowerCase()}"><text x="${String(originX)}" y="${String(originY - 12)}" class="heading" fill="#edf0f7">${escapeXml(title)} projection</text>${content}</g>`;
}

function previewSvg(): string {
  const party = [
    { id: combatantId('combatant:fighter'), name: 'Fighter', kind: 'player_character' as const, position: { column: 2, row: 3 } },
    { id: combatantId('combatant:cleric'), name: 'Cleric', kind: 'player_character' as const, position: { column: 1, row: 4 } },
    { id: combatantId('combatant:wizard'), name: 'Wizard', kind: 'player_character' as const, position: { column: 1, row: 2 } },
    { id: combatantId('combatant:training-brute'), name: 'Training Brute', kind: 'monster' as const, position: { column: 6, row: 3 } },
  ].map((combatant) => ({
    ...combatant,
    placementStatus: 'placed' as const,
    effectiveSize: 'Medium' as const,
    placementMode: { kind: 'normal' as const, actual: 'Medium' as const },
    footprint: [{ ...combatant.position }] as const,
  }));
  const base = {
    bounds: { columns: 10, rows: 7 },
    terrainCells: projectEncounterTerrainCells(
      { columns: 10, rows: 7 },
      { blockedCells: [{ column: 4, row: 6 }], worldObjects: [] },
    ),
    combatants: party,
    highlightedCombatant: combatantId('combatant:fighter'),
    adjudicatedTargets: [combatantId('combatant:training-brute')],
    // D525: previewed door art must be backed by the same engine object the board projects.
    worldObjects: [{
      id: worldObjectId('world-object:starter-art-preview-south-door'),
      name: 'South Door',
      kind: 'door' as const,
      position: { column: 4, row: 6 },
      cells: [{ column: 4, row: 6 }],
      blocking: { movement: true, lineOfSight: true, cover: 'total' as const },
      terrainKind: 'wall' as const,
      lightClass: 'none' as const,
    }],
  };
  const tokenAssets = STARTER_ART_MANIFEST.assets.filter((asset) => asset.kind === 'token');
  const definitions = STARTER_ART_MANIFEST.assets.map((asset) =>
    `<image id="${symbolId(asset.id)}" href="${pngData(renderStarterArtPng(asset.id))}" width="${String(TILE_SIZE)}" height="${String(TILE_SIZE)}"/>`,
  ).join('');
  const perRow = 12;
  const inventory = tokenAssets.map((asset, index) => {
    const x = 28 + (index % perRow) * 136;
    const y = 56 + Math.floor(index / perRow) * 152;
    return `<g data-inventory-asset="${asset.id}">${useAsset(asset.id, x, y, TILE_SIZE)}<text x="${String(x + 64)}" y="${String(y + 142)}" class="label" fill="#edf0f7">${escapeXml(asset.title.replace(' bust', ''))}</text></g>`;
  }).join('');
  const inventoryRows = Math.ceil(tokenAssets.length / perRow);
  const boardsY = 56 + inventoryRows * 152 + 40;
  const height = boardsY + 7 * TILE_SIZE + 40;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="2840" height="${String(height)}" viewBox="0 0 2840 ${String(height)}" data-generator="${STARTER_ART_MANIFEST.generator.id}" data-generator-version="${STARTER_ART_MANIFEST.generator.version}"><defs>${definitions}</defs><style>text{font-family:ui-monospace,monospace}.title{font-size:22px;font-weight:700}.heading{font-size:16px;font-weight:700}.label{font-size:9px;text-anchor:middle}image{image-rendering:pixelated}</style><rect width="2840" height="${String(height)}" fill="#11131a"/><text x="28" y="30" class="title" fill="#edf0f7">Starter Pixel Art — deterministic fixture preview</text><g data-sprite-inventory="${String(tokenAssets.length)}">${inventory}</g>${boardPreview('Player', base, 28, boardsY)}${boardPreview('DM', { ...base, foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }] }, 1480, boardsY)}<metadata>pure-procedural-only; cc-by-4.0; focus.active-pc; event.adjudicated; fog.hidden; terrain; one-room; player-projection; dm-projection</metadata></svg>\n`;
}

export interface StarterArtGenerationOptions {
  readonly outputRoot: string;
  readonly checkOnly: boolean;
}

export interface StarterArtGenerationResult {
  readonly assetCount: number;
  readonly previewCount: 1;
}

export function generateStarterArt(
  options: StarterArtGenerationOptions,
): StarterArtGenerationResult {
  const materialize = (path: string, generatedBytes: Uint8Array | string): void => {
    const absolute = resolve(options.outputRoot, path);
    if (options.checkOnly) {
      const current = readFileSync(absolute);
      const expected = typeof generatedBytes === 'string' ? Buffer.from(generatedBytes, 'utf8') : Buffer.from(generatedBytes);
      if (!current.equals(expected)) {
        throw new Error(`Generated starter art drifted: ${path}.`);
      }
      return;
    }
    mkdirSync(resolve(absolute, '..'), { recursive: true });
    writeFileSync(absolute, generatedBytes);
  };

  for (const asset of STARTER_ART_MANIFEST.assets) {
    materialize(`public/${asset.output.path}`, renderStarterArtPng(asset.id));
  }
  materialize(STARTER_ART_PREVIEW_PATH, previewSvg());

  return Object.freeze({
    assetCount: STARTER_ART_MANIFEST.assets.length,
    previewCount: 1,
  });
}

/** vite-node puts its own bin in argv[1], so the CLI is keyed on explicit flags rather than the script path. */
if (process.argv.includes('--generate') || process.argv.includes('--check')) {
  const checkOnly = process.argv.includes('--check');
  const result = generateStarterArt({
    outputRoot: resolve(import.meta.dirname, '../..'),
    checkOnly,
  });
  process.stdout.write(
    `${checkOnly ? 'verified' : 'generated'} ${String(result.assetCount)} starter-art assets and one preview\n`,
  );
}
