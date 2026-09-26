/**
 * Synthetic variants of an encounter state for the movement-board differentials (PERF-02
 * board3): the permanent bounded one in tests/unit/combat/movement-board.test.ts and the
 * exhaustive experiment in tools/experiments/movement-board/differential.ts.
 *
 * Each variant reaches rules a base state may lack: terrain and narrow openings of every size,
 * resized, dead and squeezed creatures, openings that only together cover a squeezed footprint,
 * Incapacitated, flying and summoned creatures, difficult persistent areas (one anchored to a
 * missing creature), stacked Tiny creatures and a Tiny crowd. They are legal SHAPES, not legal
 * games: createEncounter would refuse some of them (a resized creature whose footprint now
 * leaves the grid), which is the point, because the board must answer exactly as the frozen
 * world does on whatever state it is handed.
 */
import { effectiveCreatureSize } from '../../src/combat/combat-rules';
import type { EncounterState } from '../../src/combat/encounter';
import type { GridCell } from '../../src/combat/grid';
import { onBoard } from './board-cell';

export interface NamedState {
  readonly name: string;
  readonly state: EncounterState;
}

function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SIZES = ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] as const;
type Size = (typeof SIZES)[number];

function randomCells(state: EncounterState, random: () => number, count: number): GridCell[] {
  return Array.from({ length: count }, () => ({
    column: Math.floor(random() * state.bounds.columns),
    row: Math.floor(random() * state.bounds.rows),
  }));
}

function withSizes(state: EncounterState, sizes: ReadonlyMap<string, Size>): EncounterState {
  const combatants = state.combatants.map((combatant) => {
    const size = sizes.get(String(combatant.profile.id));
    return size === undefined || combatant.wildShape !== undefined
      ? combatant
      : { ...combatant, profile: { ...combatant.profile, rules: { ...combatant.profile.rules, sizeCategory: size } } };
  });
  const resized = { ...state, combatants } as EncounterState;
  const tokens = resized.tokens.map((token) => {
    try {
      return { ...token, placementMode: { kind: 'normal', actual: effectiveCreatureSize(resized, token.combatantId) } };
    } catch {
      return token;
    }
  });
  return { ...resized, tokens } as EncounterState;
}

/** The synthetic variants of one base; the seed makes them reproducible. */
export function movementBoardVariants(base: NamedState, seed: number): NamedState[] {
  const random = mulberry(seed);
  const state = base.state;
  const out: NamedState[] = [];
  const ids = state.combatants.map((combatant) => combatant.profile.id);
  const tokenIds = state.tokens.map((token) => String(token.combatantId));

  // Terrain: a difficult region, blocked and allowed movement regions, narrow openings of every size.
  out.push({ name: `${base.name}+terrain`, state: {
    ...state,
    environment: {
      ...state.environment,
      difficultTerrainRegions: [...state.environment.difficultTerrainRegions,
        { id: 'board3-difficult', cells: randomCells(state, random, 18) }],
      movementRegions: [...(state.environment.movementRegions ?? []),
        { id: 'board3-blocked', entry: 'blocked', cells: randomCells(state, random, 6) },
        { id: 'board3-open', entry: 'allowed', cells: randomCells(state, random, 6) }],
      narrowOpeningRegions: [...state.environment.narrowOpeningRegions,
        ...SIZES.map((sizedFor, index) => ({ id: `board3-opening-${String(index)}`, sizedFor, cells: randomCells(state, random, 5) }))],
    },
  } as unknown as EncounterState });

  // Sizes, deaths and one squeezed token with an opening at its position.
  const sizes = new Map<string, Size>();
  for (const id of tokenIds) if (random() >= 0.4) sizes.set(id, SIZES[Math.floor(random() * SIZES.length)] as Size);
  let sized = withSizes(state, sizes);
  sized = { ...sized, combatants: sized.combatants.map((combatant, index) =>
    index % 4 === 3 ? { ...combatant, life: 'dead' } : combatant) } as EncounterState;
  const squeezable = sized.tokens.findIndex((token) => token.placementMode.kind === 'normal' && token.placementMode.actual !== 'Tiny');
  if (squeezable >= 0) {
    const token = sized.tokens[squeezable];
    if (token !== undefined) {
      const actual = token.placementMode.actual;
      const sizedFor = SIZES[SIZES.indexOf(actual as Size) - 1];
      sized = { ...sized, tokens: sized.tokens.map((candidate, index) => index === squeezable
        ? { ...candidate, placementMode: { kind: 'squeezed', actual, sizedFor } } : candidate),
        environment: { ...sized.environment, narrowOpeningRegions: [...sized.environment.narrowOpeningRegions,
          { id: 'board3-squeeze', sizedFor, cells: [token.position, ...randomCells(sized, random, 8)] }] } } as unknown as EncounterState;
    }
  }
  out.push({ name: `${base.name}+sizes`, state: sized });

  // Squeezing through openings of one size that only together cover a footprint. A Huge
  // creature squeezes into a Large (2x2) space; each split opening covers half of a 2x2 block,
  // a whole opening covers another block, and a Medium opening covers a third.
  const squeezer = state.tokens[0];
  if (squeezer !== undefined && state.bounds.columns >= 8 && state.bounds.rows >= 4) {
    const huge = withSizes(state, new Map([[String(squeezer.combatantId), 'Huge' as Size]]));
    const column = Math.floor(random() * (state.bounds.columns - 7));
    const row = Math.floor(random() * (state.bounds.rows - 3));
    const block = (left: number, top: number): GridCell[] => [
      { column: left, row: top }, { column: left + 1, row: top }, { column: left, row: top + 1 }, { column: left + 1, row: top + 1 },
    ];
    const split = block(column, row);
    const whole = block(column + 3, row);
    const medium = block(column + 6, row + 2);
    out.push({ name: `${base.name}+squeeze-split`, state: {
      ...huge,
      tokens: huge.tokens.map((token) => token.combatantId === squeezer.combatantId
        ? { ...token, position: onBoard(huge.bounds, { column: column + 3, row }), placementMode: { kind: 'squeezed', actual: 'Huge', sizedFor: 'Large' } }
        : token),
      environment: { ...huge.environment, narrowOpeningRegions: [...huge.environment.narrowOpeningRegions,
        { id: 'board3-split-left', sizedFor: 'Large', cells: [split[0], split[2]] },
        { id: 'board3-split-right', sizedFor: 'Large', cells: [split[1], split[3]] },
        { id: 'board3-whole', sizedFor: 'Large', cells: [...whole, { column: column + 5, row }, { column: column + 5, row: row + 1 }] },
        { id: 'board3-medium', sizedFor: 'Medium', cells: medium }] },
    } as unknown as EncounterState });
  }

  // Effects: Incapacitated, flying (ignores difficult terrain), a summon side flip, persistent areas.
  const [first, second, third] = [ids[0], ids[1], ids[ids.length - 1]];
  const effects = [...state.effects,
    { id: 'board3-incap', source: first, targets: [second], payload: { kind: 'condition', condition: 'Incapacitated' } },
    { id: 'board3-fly', source: first, targets: [first], payload: { kind: 'movement_modifier', modeGrants: [{ mode: 'flying' }], difficultTerrainImmunity: false } },
    { id: 'board3-summon', source: first, targets: [], ownedCombatants: [third], payload: { kind: 'movement_modifier', modeGrants: [], difficultTerrainImmunity: false } },
  ];
  const areaBase = { owner: first, duration: { kind: 'rounds', remaining: 3 }, targetFilter: { kind: 'all' }, material: null,
    hooks: [], movable: null, burningCells: [], burnedAwayCells: [], members: [], consumedTurnKeys: [] };
  const point = randomCells(state, random, 1)[0] as GridCell;
  const second2 = randomCells(state, random, 1)[0] as GridCell;
  const persistentAreas = [...state.persistentAreas,
    { ...areaBase, id: 'board3-area-fixed', sequence: 9001, difficultTerrain: true,
      origin: { kind: 'fixed', point: { x: point.column * 5, y: point.row * 5 } }, shape: { kind: 'sphere', radius: 15 } },
    { ...areaBase, id: 'board3-area-emanation', sequence: 9002, difficultTerrain: true,
      origin: { kind: 'anchored', combatant: second }, shape: { kind: 'emanation', radius: 10 } },
    { ...areaBase, id: 'board3-area-plain', sequence: 9003, difficultTerrain: false,
      origin: { kind: 'fixed', point: { x: 0, y: 0 } }, shape: { kind: 'cube', size: 20 } },
    { ...areaBase, id: 'board3-area-second', sequence: 9004, difficultTerrain: true,
      origin: { kind: 'fixed', point: { x: second2.column * 5, y: second2.row * 5 } }, shape: { kind: 'cube', size: 10 } },
  ];
  out.push({ name: `${base.name}+effects`, state: { ...state, effects, persistentAreas } as unknown as EncounterState });

  // An anchored difficult area whose anchor creature is absent: the frozen world throws only when it is reached.
  out.push({ name: `${base.name}+orphan-area`, state: { ...state, persistentAreas: [...state.persistentAreas,
    { ...areaBase, id: 'board3-area-orphan', sequence: 9005, difficultTerrain: true,
      origin: { kind: 'anchored', combatant: 'combatant:board3-missing' }, shape: { kind: 'emanation', radius: 10 } }] } as unknown as EncounterState });

  // Stacked Tiny creatures sharing one cell.
  const stackIds = new Map(tokenIds.slice(0, 4).map((id) => [id, 'Tiny' as Size]));
  let stacked = withSizes(state, stackIds);
  const target = stacked.tokens[0]?.position;
  stacked = { ...stacked, tokens: stacked.tokens.map((token, index) =>
    index < 3 && target !== undefined ? { ...token, position: target } : token) } as EncounterState;
  out.push({ name: `${base.name}+tiny-stack`, state: stacked });

  // A Tiny crowd: four living Tiny creatures on one square (SRD: four per square) and a fifth beside it.
  const crowdIds = state.combatants.filter((combatant) => combatant.wildShape === undefined).slice(0, 5).map((combatant) => String(combatant.profile.id));
  let crowd = withSizes({ ...state, combatants: state.combatants.map((combatant) => crowdIds.includes(String(combatant.profile.id))
    ? { ...combatant, life: combatant.life === 'dead' ? 'living' : combatant.life } : combatant) } as EncounterState,
  new Map(crowdIds.map((id) => [id, 'Tiny' as Size])));
  const crowdTarget = crowd.tokens.find((token) => crowdIds.includes(String(token.combatantId)))?.position;
  let slot = 0;
  crowd = { ...crowd, tokens: crowd.tokens.map((token) => {
    if (!crowdIds.includes(String(token.combatantId)) || crowdTarget === undefined) return token;
    const position = slot < 4 ? crowdTarget : onBoard(crowd.bounds, { column: crowdTarget.column === 0 ? 1 : crowdTarget.column - 1, row: crowdTarget.row });
    slot += 1;
    return { ...token, position };
  }) } as EncounterState;
  out.push({ name: `${base.name}+tiny-crowd`, state: crowd });
  return out;
}
