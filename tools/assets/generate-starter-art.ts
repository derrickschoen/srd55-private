import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderStarterArtSvg } from '../../src/assets/starter-art-resolver';
import { STARTER_ART_MANIFEST } from '../../src/assets/starter-art-manifest';
import { combatantId } from '../../src/combat/values';
import { encounterBoardRenderModel } from '../../src/vtt/encounter-board';
import { REFERENCE_ENCOUNTER_ART } from '../../src/vtt/reference-encounter-art';

const repositoryRoot = resolve(import.meta.dirname, '../..');
const checkOnly = process.argv.includes('--check');

function svgData(value: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(value, 'utf8').toString('base64')}`;
}

function symbolId(id: string): string {
  return `asset-${id.replaceAll('.', '-')}`;
}

function useAsset(id: string, x: number, y: number, size: number): string {
  return `<use href="#${symbolId(id)}" transform="translate(${String(x)} ${String(y)}) scale(${String(size / 64)})" data-asset-id="${id}"/>`;
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
  const size = 44;
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
      useAsset(id, x + 2, y + 2, size - 4),
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
  ];
  const base = {
    bounds: { columns: 10, rows: 7 },
    combatants: party,
    highlightedCombatant: combatantId('combatant:fighter'),
    adjudicatedTargets: [combatantId('combatant:training-brute')],
  };
  const tokenAssets = STARTER_ART_MANIFEST.assets.filter((asset) => asset.kind === 'token');
  const definitions = STARTER_ART_MANIFEST.assets.map((asset) =>
    `<image id="${symbolId(asset.id)}" href="${svgData(renderStarterArtSvg(asset.id))}" width="64" height="64"/>`,
  ).join('');
  const inventory = tokenAssets.map((asset, index) => {
    const x = 28 + index * 88;
    return `<g data-inventory-asset="${asset.id}">${useAsset(asset.id, x, 56, 64)}<text x="${String(x + 32)}" y="136" class="label" fill="#edf0f7">${escapeXml(asset.title.replace(' silhouette', ''))}</text></g>`;
  }).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="560" viewBox="0 0 1240 560" data-generator="starter-pixel-art" data-generator-version="1.0.0"><defs>${definitions}</defs><style>text{font-family:ui-monospace,monospace}.title{font-size:22px;font-weight:700}.heading{font-size:16px;font-weight:700}.label{font-size:9px;text-anchor:middle}image{image-rendering:pixelated}</style><rect width="1240" height="560" fill="#11131a"/><text x="28" y="30" class="title" fill="#edf0f7">Starter Pixel Art — deterministic fixture preview</text><g data-sprite-inventory="13">${inventory}</g>${boardPreview('Player', base, 86, 205)}${boardPreview('DM', { ...base, foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }] }, 690, 205)}<metadata>pure-procedural-only; cc-by-4.0; focus.active-pc; event.adjudicated; fog.hidden; terrain; one-room; player-projection; dm-projection</metadata></svg>\n`;
}

function materialize(path: string, bytes: string): void {
  const absolute = resolve(repositoryRoot, path);
  if (checkOnly) {
    const current = readFileSync(absolute, 'utf8');
    if (current !== bytes) throw new Error(`Generated starter art drifted: ${path}.`);
    return;
  }
  mkdirSync(resolve(absolute, '..'), { recursive: true });
  writeFileSync(absolute, bytes, 'utf8');
}

for (const asset of STARTER_ART_MANIFEST.assets) {
  materialize(`public/${asset.output.path}`, renderStarterArtSvg(asset.id));
}
materialize('docs/design/assets-preview/starter-art-board.svg', previewSvg());

process.stdout.write(
  `${checkOnly ? 'verified' : 'generated'} ${String(STARTER_ART_MANIFEST.assets.length)} starter-art assets and one preview\n`,
);
