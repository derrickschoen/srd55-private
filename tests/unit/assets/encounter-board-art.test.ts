import { readFileSync } from '../../helpers/test-filesystem';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SHADE_ASSETS } from '../../../src/assets/art-sets';
import { combatantId } from '../../../src/combat/values';
import { encounterBoardRenderModel } from '../../../src/vtt/encounter-board';
import { decodeEncounterArtPackage } from '../../../src/vtt/encounter-package';
import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
const fighter = combatantId('combatant:fighter');
const ogre = combatantId('combatant:training-brute');
const projection = {
  bounds: { columns: 10, rows: 7 },
  combatants: [
    { id: fighter, name: 'Reference Fighter', kind: 'player_character' as const, position: { column: 2, row: 3 } },
    { id: ogre, name: 'Training Brute', kind: 'monster' as const, position: { column: 6, row: 3 } },
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
        'art.map.door.wood-s.v1',
        'art.terrain.rubble.v1',
        'art.terrain.crate.v1',
        'art.terrain.pillar.v1',
        'art.terrain.hazard.v1',
      ]));
  });

  it('D516: picks wall pieces, door orientation, floor variants and shade bands per cell', () => {
    const model = encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART);
    const at = (column: number, row: number) => model.find((cell) => cell.column === column && cell.row === row);
    const wallOf = (column: number, row: number) => at(column, row)?.layers.find((layer) => layer.role === 'wall' || layer.role === 'door')?.assetId;
    expect(wallOf(0, 0)).toBe('art.map.wall.stone-nw.v1');
    expect(wallOf(9, 0)).toBe('art.map.wall.stone-ne.v1');
    expect(wallOf(0, 6)).toBe('art.map.wall.stone-sw.v1');
    expect(wallOf(9, 6)).toBe('art.map.wall.stone-se.v1');
    expect(wallOf(5, 0)).toBe('art.map.wall.stone.v1');
    expect(wallOf(5, 6)).toBe('art.map.wall.stone-s.v1');
    expect(wallOf(0, 3)).toBe('art.map.wall.stone-w.v1');
    expect(wallOf(9, 3)).toBe('art.map.wall.stone-e.v1');
    expect(wallOf(4, 6)).toBe('art.map.door.wood-s.v1');
    expect(wallOf(4, 3)).toBeUndefined();

    const floors = new Set(model.map((cell) => cell.layers[0]?.assetId));
    expect(floors.size).toBe(4);
    expect(model.every((cell) => cell.layers[0]?.role === 'floor')).toBe(true);
    expect(encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART).map((cell) => cell.layers[0]?.assetId))
      .toEqual(model.map((cell) => cell.layers[0]?.assetId));

    const shades = (column: number, row: number) => at(column, row)?.layers.filter((layer) => layer.role === 'shade').map((layer) => layer.assetId) ?? [];
    expect(shades(1, 1)).toEqual([SHADE_ASSETS.n, SHADE_ASSETS.w]);
    expect(shades(8, 5)).toEqual([SHADE_ASSETS.s, SHADE_ASSETS.e]);
    expect(shades(5, 1)).toEqual([SHADE_ASSETS.n]);
    expect(shades(5, 3)).toEqual([]);
    expect(shades(0, 0)).toEqual([]);
  });

  it('D516: the dead show the prone silhouette and unnamed combatants get creature-type busts', () => {
    const dead = encounterBoardRenderModel({
      ...projection,
      combatants: projection.combatants.map((combatant) => combatant.id === ogre ? { ...combatant, life: 'dead' as const } : combatant),
    }, REFERENCE_ENCOUNTER_ART);
    expect(dead.find((cell) => cell.token?.id === ogre)?.token).toEqual(expect.objectContaining({
      assetId: 'art.token.dead.v1',
      marker: 'corpse',
    }));

    const generated = {
      bounds: { columns: 12, rows: 9 },
      combatants: [
        { id: combatantId('combatant:pc-1'), name: 'Mirel Ash', kind: 'player_character' as const, position: { column: 1, row: 1 } },
        { id: combatantId('combatant:m-1'), name: 'Wolf', kind: 'monster' as const, position: { column: 5, row: 5 }, creatureType: 'Beast' },
        { id: combatantId('combatant:m-2'), name: 'Skeleton', kind: 'monster' as const, position: { column: 6, row: 5 }, creatureType: 'Undead' },
        { id: combatantId('combatant:m-3'), name: 'Thing', kind: 'monster' as const, position: { column: 7, row: 5 }, creatureType: 'Chronovore' },
        { id: combatantId('combatant:m-4'), name: 'Untyped', kind: 'monster' as const, position: { column: 8, row: 5 } },
      ],
      highlightedCombatant: null,
      adjudicatedTargets: [],
    };
    const art = encounterArtForBoard(generated);
    expect(art.combatantTokens).toEqual({
      'combatant:pc-1': 'art.token.party.fighter.v1',
      'combatant:m-1': 'art.token.foe.beast.v1',
      'combatant:m-2': 'art.token.foe.undead.v1',
      'combatant:m-3': 'art.token.foe.brute.v1',
      'combatant:m-4': 'art.token.foe.brute.v1',
    });
    expect(art.room.doorCell).toEqual({ column: 6, row: 8 });
    expect(() => encounterBoardRenderModel(generated, art)).not.toThrow();
  });

  it('rejects unknown package asset ids, incomplete combatant mappings and corner doors', () => {
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

    const notAFamily = structuredClone(REFERENCE_ENCOUNTER_ART) as unknown as {
      room: { wall: string };
    };
    notAFamily.room.wall = 'art.map.wall.stone-ne.v1';
    expect(() => decodeEncounterArtPackage(notAFamily)).toThrow(/No wall family/u);

    const cornerDoor = structuredClone(REFERENCE_ENCOUNTER_ART) as unknown as {
      room: { doorCell: { column: number; row: number } };
    };
    cornerDoor.room.doorCell = { column: 0, row: 0 };
    expect(() => decodeEncounterArtPackage(cornerDoor)).toThrow(/not in a wall band/u);

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
    expect(source).toContain('encounterArtForBoard(projection)');
    expect(source).toContain('encounterBoardRenderModel(projection, art)');
    expect(source).toContain('starterArtDataUri(layer.assetId)');
    expect(source).toContain('starterArtDataUri(model.token.assetId)');
    expect(source).toContain('projection.encounter.dmOnly.foggedCells');
    expect(source).toContain('renderMechanicalLayer(layer)');
    expect(source).toContain('renderBoardChrome(board, projection)');
  });
});
