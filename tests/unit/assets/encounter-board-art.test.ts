import { readFileSync } from '../../helpers/test-filesystem';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { combatantId } from '../../../src/combat/values';
import { encounterBoardRenderModel } from '../../../src/vtt/encounter-board';
import { decodeEncounterArtPackage } from '../../../src/vtt/encounter-package';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const fighter = combatantId('combatant:fighter');
const ogre = combatantId('combatant:training-brute');
const projection = {
  bounds: { columns: 10, rows: 7 },
  combatants: [
    {
      id: fighter, name: 'Reference Fighter', kind: 'player_character' as const,
      placementStatus: 'placed' as const,
      position: { column: 2, row: 3 },
      effectiveSize: 'Medium' as const,
      placementMode: { kind: 'normal' as const, actual: 'Medium' as const },
      footprint: [{ column: 2, row: 3 }] as const,
    },
    {
      id: ogre, name: 'Training Brute', kind: 'monster' as const,
      placementStatus: 'placed' as const,
      position: { column: 6, row: 3 },
      effectiveSize: 'Medium' as const,
      placementMode: { kind: 'normal' as const, actual: 'Medium' as const },
      footprint: [{ column: 6, row: 3 }] as const,
    },
  ],
  highlightedCombatant: fighter,
  adjudicatedTargets: [ogre],
};

describe('encounter package asset-id consumption', () => {
  it('renders player and DM models through stable ids while keeping fog DM-only', () => {
    const player = encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART);
    const dm = encounterBoardRenderModel({
      ...projection,
      foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }],
    }, REFERENCE_ENCOUNTER_ART);

    expect(player).toHaveLength(70);
    expect(player.flatMap((cell) => cell.layers).some((layer) => layer.role === 'fog')).toBe(false);
    expect(dm.flatMap((cell) => cell.layers).filter((layer) => layer.role === 'fog'))
      .toHaveLength(2);
    expect(player.find((cell) => cell.token?.id === fighter)?.token).toEqual(
      expect.objectContaining({
        assetId: 'art.token.pc.fighter.v1',
        focusAssetId: 'art.focus.active-pc.v1',
        adjudicatedAssetId: null,
      }),
    );
    expect(player.find((cell) => cell.token?.id === ogre)?.token).toEqual(
      expect.objectContaining({
        assetId: 'art.token.monster.ogre.v1',
        focusAssetId: null,
        adjudicatedAssetId: 'art.event.adjudicated.v1',
      }),
    );
    expect(player.flatMap((cell) => cell.layers).map((layer) => layer.assetId))
      .toEqual(expect.arrayContaining([
        'art.map.floor.stone.v1',
        'art.map.wall.stone.v1',
        'art.map.door.wood.v1',
        'art.terrain.rubble.v1',
        'art.terrain.crate.v1',
        'art.terrain.pillar.v1',
        'art.terrain.hazard.v1',
      ]));
  });

  it('rejects unknown package asset ids and incomplete combatant mappings', () => {
    const invalid = structuredClone(REFERENCE_ENCOUNTER_ART) as unknown as {
      room: { floor: string };
    };
    invalid.room.floor = 'art.map.nonexistent.v1';
    expect(() => decodeEncounterArtPackage(invalid)).toThrow(/Unknown starter-art asset id/u);

    const wrongKind = structuredClone(REFERENCE_ENCOUNTER_ART) as unknown as {
      room: { floor: string };
    };
    wrongKind.room.floor = 'art.token.pc.fighter.v1';
    expect(() => decodeEncounterArtPackage(wrongKind)).toThrow(/must be map, not token/u);

    const missingToken = structuredClone(REFERENCE_ENCOUNTER_ART);
    delete missingToken.combatantTokens['combatant:training-brute'];
    expect(() => encounterBoardRenderModel(projection, missingToken))
      .toThrow(/has no token/u);
  });

  it('wires the phase-2 DOM board to the pure model and data-only resolver', () => {
    const source = readFileSync(
      `${repositoryRoot}src/vtt/encounter-app.ts`,
      'utf8',
    );
    expect(source).toContain('projection.bounds.columns === VANE_WARREN_ART.room.columns');
    expect(source).toContain('encounterBoardRenderModel(projection, packageForBounds)');
    expect(source).toContain('starterArtDataUri(layer.assetId)');
    expect(source).toContain('encounterBoardTokenRenderModels(projection, art)');
    expect(source).toContain('starterArtDataUri(model.assetId)');
    expect(source).toContain('projection.encounter.dmOnly.foggedCells');
  });
});
