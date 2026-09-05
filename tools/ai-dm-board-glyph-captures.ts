/**
 * D525: captures the same reference states under each board-glyph mode
 * through the real snapshot service (production build, headless Chromium)
 * and copies the PNGs to test-results/ so the supervisor can run the
 * comprehension probe on each. No model is called here.
 *
 *   npx vite-node tools/ai-dm-board-glyph-captures.ts -- [--modes light,full]
 *
 * The 'reference-vocabulary' state is the hidden-monster reference room with
 * an open and a closed door and an obscurement patch added, so one picture
 * shows every glyph family the 'full' vocabulary has.
 */
import { copyFile, mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { BOARD_GLYPH_MODES, isBoardGlyphMode, type BoardGlyphMode } from '../src/assets/board-glyphs';
import { canonicalJson } from '../src/commands/canonical-json';
import { createEncounter, type EncounterState } from '../src/combat/encounter';
import { armorClass, worldObjectId } from '../src/combat/values';
import type { WorldObject } from '../src/combat/world-objects';
import { loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { REFERENCE_MONSTER_ID, referenceEncounterSetup } from '../src/vtt/reference-encounter';
import { BoardSnapshotService, boardStateDigest, type BoardImageArtifact } from './ai-dm-board-snapshot';

const repositoryRoot = resolve(new URL('../', import.meta.url).pathname);

interface ReferenceState {
  readonly id: string;
  readonly state: EncounterState;
}

function door(id: string, name: string, column: number, row: number, open: boolean): WorldObject {
  const position = { column, row };
  return {
    id: worldObjectId(`world-object:${id}`),
    name,
    kind: 'door',
    position,
    footprint: [position],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(15),
    damageResponses: [],
    blocking: { movement: !open, lineOfSight: !open, cover: open ? 'none' : 'total' },
    createdRevision: 0,
  };
}

export async function referenceStates(): Promise<readonly ReferenceState[]> {
  const arena = await loadArenaFixture(join(repositoryRoot, 'tests/fixtures/arena-basis-brutal/seed-6203002.json'));
  const reference = createEncounter(referenceEncounterSetup());
  const referenceWithHidden: EncounterState = {
    ...reference,
    hiddenCombatants: [{ combatant: REFERENCE_MONSTER_ID, stealthTotal: 20, edition: reference.rulesEdition }],
  };
  const referenceVocabulary: EncounterState = {
    ...referenceWithHidden,
    worldObjects: [
      ...referenceWithHidden.worldObjects,
      door('capture-open-door', 'Open Oak Door', 1, 5, true),
      door('capture-closed-door', 'Closed Iron Door', 8, 4, false),
    ],
    environment: {
      ...referenceWithHidden.environment,
      obscurementRegions: [
        ...referenceWithHidden.environment.obscurementRegions,
        { id: 'capture-smoke', obscurement: 'heavy', cells: [{ column: 5, row: 2 }, { column: 6, row: 2 }, { column: 8, row: 2 }] },
      ],
    },
  };
  return [
    { id: 'arena-brutal-6203002', state: arena },
    { id: 'reference-hidden', state: referenceWithHidden },
    { id: 'reference-vocabulary', state: referenceVocabulary },
  ];
}

function parseModes(argv: readonly string[]): readonly BoardGlyphMode[] {
  const index = argv.indexOf('--modes');
  if (index < 0) return BOARD_GLYPH_MODES;
  const value = argv[index + 1];
  if (value === undefined) throw new TypeError('--modes requires a comma-separated value.');
  return value.split(',').map((entry) => {
    if (!isBoardGlyphMode(entry)) throw new TypeError(`Unknown board-glyph mode ${entry}.`);
    return entry;
  });
}

export interface BoardGlyphCapture {
  readonly mode: BoardGlyphMode;
  readonly stateId: string;
  readonly artifact: BoardImageArtifact;
  readonly outputPath: string;
}

export async function captureBoardGlyphModes(
  modes: readonly BoardGlyphMode[],
  outputDirectory: string,
): Promise<readonly BoardGlyphCapture[]> {
  const states = await referenceStates();
  await mkdir(outputDirectory, { recursive: true });
  const captures: BoardGlyphCapture[] = [];
  for (const mode of modes) {
    const imagesRoot = join(repositoryRoot, 'dnd-slim-runs', `d525-glyphs-${mode}-images`);
    const service = await BoardSnapshotService.start({ outputDirectory: imagesRoot, boardGlyphs: mode });
    try {
      for (const [index, candidate] of states.entries()) {
        const artifact = await service.capture({
          state: candidate.state,
          source: {
            room: index + 1,
            round: candidate.state.round,
            revision: candidate.state.revision,
            stateDigest: boardStateDigest(candidate.state),
          },
        });
        const outputPath = join(outputDirectory, `d525-glyphs-${mode}-${candidate.id}.png`);
        await copyFile(join(imagesRoot, artifact.relativePath), outputPath);
        captures.push({ mode, stateId: candidate.id, artifact, outputPath });
      }
    } finally {
      await service.close();
    }
  }
  await writeFile(join(outputDirectory, 'd525-board-glyph-captures.json'), `${canonicalJson(captures)}\n`, 'utf8');
  return captures;
}

const invokedPath = process.argv[1];
if (process.env['VITEST'] !== 'true' && invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-board-glyph-captures.ts') ||
  invokedPath.endsWith('/vite-node') || invokedPath.endsWith('/vite-node.mjs')
)) {
  const captures = await captureBoardGlyphModes(parseModes(process.argv), join(repositoryRoot, 'test-results'));
  for (const capture of captures) {
    process.stdout.write(`${capture.mode} ${capture.stateId} ${String(capture.artifact.width)}x${String(capture.artifact.height)} ${String(capture.artifact.bytes)} B sha256 ${capture.artifact.sha256} -> ${capture.outputPath}\n`);
  }
}
