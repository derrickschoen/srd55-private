import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { readFileSync } from '../../helpers/test-filesystem';
import {
  applySizeSteps,
  autoRelocatePlacement,
  creatureSpace,
  effectSequence,
  minimumSpaceDistance,
  minimumSpaceLine,
  narrowOpeningRegion,
  newlyEnteredSpaceCells,
  normalPlacementFor,
  placementFor,
  sizedCombatantState,
  spaceFitsBounds,
  spacesIntersect,
  spaceTouchesCellSet,
  squeezedPlacementFor,
  type CreatureSpace,
  type KnownCreatureSize,
} from '../../../src/combat/creature-space';
import type { GridCell } from '../../../src/combat/grid';

const SIZE_FIXTURES = [
  { size: 'Tiny', width: 1 },
  { size: 'Small', width: 1 },
  { size: 'Medium', width: 1 },
  { size: 'Large', width: 2 },
  { size: 'Huge', width: 3 },
  { size: 'Gargantuan', width: 4 },
] as const satisfies readonly {
  readonly size: KnownCreatureSize;
  readonly width: 1 | 2 | 3 | 4;
}[];

const EXPECTED_CELLS = {
  Tiny: [{ column: 3, row: 5 }],
  Small: [{ column: 3, row: 5 }],
  Medium: [{ column: 3, row: 5 }],
  Large: [
    { column: 3, row: 5 }, { column: 4, row: 5 },
    { column: 3, row: 6 }, { column: 4, row: 6 },
  ],
  Huge: [
    { column: 3, row: 5 }, { column: 4, row: 5 }, { column: 5, row: 5 },
    { column: 3, row: 6 }, { column: 4, row: 6 }, { column: 5, row: 6 },
    { column: 3, row: 7 }, { column: 4, row: 7 }, { column: 5, row: 7 },
  ],
  Gargantuan: [
    { column: 3, row: 5 }, { column: 4, row: 5 }, { column: 5, row: 5 }, { column: 6, row: 5 },
    { column: 3, row: 6 }, { column: 4, row: 6 }, { column: 5, row: 6 }, { column: 6, row: 6 },
    { column: 3, row: 7 }, { column: 4, row: 7 }, { column: 5, row: 7 }, { column: 6, row: 7 },
    { column: 3, row: 8 }, { column: 4, row: 8 }, { column: 5, row: 8 }, { column: 6, row: 8 },
  ],
} as const satisfies Readonly<Record<KnownCreatureSize, readonly GridCell[]>>;

const ORACLE_WIDTHS = {
  Tiny: 1,
  Small: 1,
  Medium: 1,
  Large: 2,
  Huge: 3,
  Gargantuan: 4,
} as const satisfies Readonly<Record<KnownCreatureSize, 1 | 2 | 3 | 4>>;

function normalSpace(
  size: KnownCreatureSize,
  anchor: GridCell,
): CreatureSpace<KnownCreatureSize> {
  const combatant = sizedCombatantState(size);
  const mode = normalPlacementFor(combatant);
  return creatureSpace(combatant, placementFor(combatant, anchor, mode));
}

function cartesianDistanceOracle(
  left: readonly GridCell[],
  right: readonly GridCell[],
): number {
  let minimum = Number.POSITIVE_INFINITY;
  for (const leftCell of left) {
    for (const rightCell of right) {
      const horizontalSteps = Math.abs(leftCell.column - rightCell.column);
      const verticalSteps = Math.abs(leftCell.row - rightCell.row);
      minimum = Math.min(minimum, Math.max(horizontalSteps, verticalSteps) * 5);
    }
  }
  return minimum;
}

function oracleCells(size: KnownCreatureSize, anchor: GridCell): readonly GridCell[] {
  const cells: GridCell[] = [];
  for (let rowOffset = 0; rowOffset < ORACLE_WIDTHS[size]; rowOffset += 1) {
    for (let columnOffset = 0; columnOffset < ORACLE_WIDTHS[size]; columnOffset += 1) {
      cells.push({
        column: anchor.column + columnOffset,
        row: anchor.row + rowOffset,
      });
    }
  }
  return cells;
}

describe('opaque creature space', () => {
  it('maps every size to exact north-west-anchored row-major cells', () => {
    for (const fixture of SIZE_FIXTURES) {
      const space = normalSpace(fixture.size, { column: 3, row: 5 });
      expect(space.cells, fixture.size).toEqual(EXPECTED_CELLS[fixture.size]);
      expect(space.cells).toHaveLength(fixture.width * fixture.width);
      expect(space.anchor).toEqual(space.cells[0]);
      expect(new Set(space.cells.map((cell) => `${String(cell.row)}:${String(cell.column)}`)).size)
        .toBe(space.cells.length);
      expect(Object.isFrozen(space)).toBe(true);
      expect(Object.isFrozen(space.cells)).toBe(true);
      expect(space.cells.every(Object.isFrozen)).toBe(true);
    }
  });

  it('fits complete footprints at every edge of boards sized one through eight', () => {
    let edgePlacements = 0;
    for (let boardSize = 1; boardSize <= 8; boardSize += 1) {
      for (const fixture of SIZE_FIXTURES) {
        if (fixture.width > boardSize) continue;
        const lastAnchor = boardSize - fixture.width;
        for (let row = 0; row <= lastAnchor; row += 1) {
          for (let column = 0; column <= lastAnchor; column += 1) {
            const touchesEdge = row === 0 || column === 0 || row === lastAnchor || column === lastAnchor;
            if (!touchesEdge) continue;
            const space = normalSpace(fixture.size, { column, row });
            expect(spaceFitsBounds(space, { columns: boardSize, rows: boardSize }),
              `${fixture.size} at ${String(column)},${String(row)} on ${String(boardSize)}x${String(boardSize)}`)
              .toBe(true);
            edgePlacements += 1;
          }
        }
        expect(spaceFitsBounds(
          normalSpace(fixture.size, { column: lastAnchor + 1, row: 0 }),
          { columns: boardSize, rows: boardSize },
        )).toBe(false);
      }
    }
    // For anchor span n: one placement when n=0, otherwise a square perimeter of 4n.
    expect(edgePlacements).toBe((3 * 113) + 85 + 61 + 41);
  });

  it('detects intersections and blocked cells through non-anchor footprint cells', () => {
    const large = normalSpace('Large', { column: 2, row: 2 });
    const tailCell = normalSpace('Medium', { column: 3, row: 3 });
    const outside = normalSpace('Medium', { column: 4, row: 4 });

    expect(large.anchor).not.toEqual(tailCell.anchor);
    expect(spacesIntersect(large, tailCell)).toBe(true);
    expect(spacesIntersect(tailCell, large)).toBe(true);
    expect(spacesIntersect(large, outside)).toBe(false);
    expect(spaceTouchesCellSet(large, [{ column: 3, row: 3 }])).toBe(true);
    expect(spaceTouchesCellSet(large, [{ column: 4, row: 4 }])).toBe(false);
  });

  it('checks symmetric nearest-cell distance against an independent Cartesian oracle', () => {
    const anchors = [
      { column: 0, row: 0 },
      { column: 1, row: 4 },
      { column: 5, row: 1 },
      { column: 7, row: 7 },
    ] as const;
    const cases = SIZE_FIXTURES.flatMap((fixture) =>
      anchors.map((anchor) => ({
        size: fixture.size,
        anchor,
        space: normalSpace(fixture.size, anchor),
      })));

    let orderedPairs = 0;
    for (const left of cases) {
      for (const right of cases) {
        const expected = cartesianDistanceOracle(
          oracleCells(left.size, left.anchor),
          oracleCells(right.size, right.anchor),
        );
        expect(minimumSpaceDistance(left.space, right.space)).toBe(expected);
        expect(minimumSpaceDistance(right.space, left.space)).toBe(expected);
        orderedPairs += 1;
      }
    }
    expect(orderedPairs).toBe(576);
  });

  it('selects minimum lines by distance, then source and target row-major order', () => {
    const source = normalSpace('Large', { column: 0, row: 0 });
    const target = normalSpace('Large', { column: 3, row: 0 });

    expect(minimumSpaceLine(source, target)).toEqual({
      distance: 10,
      sourceCell: { column: 1, row: 0 },
      targetCell: { column: 3, row: 0 },
      sourceCenter: { x: 1.5, y: 0.5 },
      targetCenter: { x: 3.5, y: 0.5 },
    });
  });

  it('derives only the five legal squeeze pairs and their smaller controlled spaces', () => {
    const small = sizedCombatantState('Small');
    const medium = sizedCombatantState('Medium');
    const large = sizedCombatantState('Large');
    const huge = sizedCombatantState('Huge');
    const gargantuan = sizedCombatantState('Gargantuan');

    expect(squeezedPlacementFor(small).pair).toEqual({ actual: 'Small', sizedFor: 'Tiny' });
    expect(squeezedPlacementFor(medium).pair).toEqual({ actual: 'Medium', sizedFor: 'Small' });
    expect(squeezedPlacementFor(large).pair).toEqual({ actual: 'Large', sizedFor: 'Medium' });
    expect(squeezedPlacementFor(huge).pair).toEqual({ actual: 'Huge', sizedFor: 'Large' });
    expect(squeezedPlacementFor(gargantuan).pair).toEqual({ actual: 'Gargantuan', sizedFor: 'Huge' });

    const hugeMode = squeezedPlacementFor(huge);
    const hugeSpace = creatureSpace(
      huge,
      placementFor(huge, { column: 2, row: 2 }, hugeMode),
    );
    expect(hugeSpace.actualSize).toBe('Huge');
    expect(hugeSpace.controlledAs).toBe('Large');
    expect(hugeSpace.cells).toEqual([
      { column: 2, row: 2 }, { column: 3, row: 2 },
      { column: 2, row: 3 }, { column: 3, row: 3 },
    ]);
  });

  it('keeps Small and Medium geometry byte-identical while retaining their sizes', () => {
    const small = normalSpace('Small', { column: 4, row: 6 });
    const medium = normalSpace('Medium', { column: 4, row: 6 });
    const oneCellContractBytes = '[{"column":4,"row":6}]';

    expect(JSON.stringify(small.cells)).toBe(oneCellContractBytes);
    expect(JSON.stringify(medium.cells)).toBe(oneCellContractBytes);
    expect(small.actualSize).toBe('Small');
    expect(medium.actualSize).toBe('Medium');
    expect(small.controlledAs).toBe('Small');
    expect(medium.controlledAs).toBe('Medium');
  });

  it('refuses invalid anchors before producing a placement', () => {
    const medium = sizedCombatantState('Medium');
    const mode = normalPlacementFor(medium);
    expect(() => placementFor(medium, { column: -1, row: 0 }, mode)).toThrow(RangeError);
    expect(() => placementFor(medium, { column: 0.5, row: 0 }, mode)).toThrow(RangeError);
    expect(() => placementFor(medium, { column: 0, row: Number.NaN }, mode)).toThrow(RangeError);
  });

  it('orders size effects by their persisted sequence rather than array position', () => {
    expect(applySizeSteps('Gargantuan', [
      { delta: -1, appliedSequence: effectSequence(2) },
      { delta: 1, appliedSequence: effectSequence(1) },
    ])).toBe('Huge');
    expect(() => applySizeSteps('Medium', [
      { delta: 1, appliedSequence: effectSequence(1) },
      { delta: -1, appliedSequence: effectSequence(1) },
    ])).toThrow('unique persisted effect sequences');
  });

  it('returns only newly entered footprint cells in stable row-major order', () => {
    const before = normalSpace('Large', { column: 1, row: 1 });
    const after = normalSpace('Large', { column: 2, row: 1 });
    expect(newlyEnteredSpaceCells(before, after)).toEqual([
      { column: 3, row: 1 },
      { column: 3, row: 2 },
    ]);
  });

  it('validates authored openings and auto-relocates by Chebyshev distance then row-major', () => {
    expect(narrowOpeningRegion({
      id: 'opening:hall', sizedFor: 'Medium', bounds: { columns: 4, rows: 4 },
      cells: [{ column: 2, row: 1 }, { column: 1, row: 1 }],
    }).cells).toEqual([{ column: 1, row: 1 }, { column: 2, row: 1 }]);
    expect(() => narrowOpeningRegion({
      id: 'opening:split', sizedFor: 'Medium', bounds: { columns: 4, rows: 4 },
      cells: [{ column: 0, row: 0 }, { column: 2, row: 0 }],
    })).toThrow('orthogonally connected');

    const large = sizedCombatantState('Large');
    const mode = normalPlacementFor(large);
    const relocation = autoRelocatePlacement(
      large,
      { column: 2, row: 2 },
      mode,
      { columns: 5, rows: 5 },
      (space) => space.anchor.row === 1 && (space.anchor.column === 1 || space.anchor.column === 3),
    );
    expect(relocation.kind).toBe('placed');
    if (relocation.kind === 'placed') expect(relocation.placement.anchor).toEqual({ column: 1, row: 1 });
    expect(autoRelocatePlacement(
      large, { column: 0, row: 0 }, mode, { columns: 1, rows: 1 }, () => true,
    )).toEqual({ kind: 'refused', refusal: { kind: 'no_legal_anchor' } });
  });
});

const PRE_EDIT_POLICY_LITERALS = Object.freeze({
  sessionSchema: '11',
  replaySchema: '6',
  tactical: 'tactical-evaluator-v3',
  movement: 'movement-eval-v2',
  actorKnowledge: 'actor-knowledge-v2',
  concentration: 'concentration-intel-v2',
  dmTurn: 'dm-turn-intel-v1',
  dmQuery: 'dm-intel-query-v1',
  dmCapture: 'dm-intel-capture-v1',
  renderer: 'turn-context-renderer-v3',
  engineActorKnowledge: 'actor-knowledge-v1',
  engineCapsuleSchema: '2',
  boardSchema: '1',
});

const PLANNED_CHANGED_SURFACES = new Set([
  'src/combat/encounter.ts',
  'src/combat/world-objects.ts',
  'src/combat/tactical-evaluator.ts',
  'src/combat/movement-evaluator.ts',
  'src/combat/concentration-evaluator.ts',
  'src/vtt/session-persistence.ts',
  'src/vtt/replay.ts',
  'src/vtt/mcp/schemas.ts',
  'src/vtt/mcp/engine-server.ts',
  'src/vtt/engine-state-capsule.ts',
  'src/vtt/intel/actor-knowledge.ts',
  'src/vtt/dm-tactical-intel.ts',
  'src/vtt/renderer-profile.ts',
]);

const PRE_EDIT_SOURCE_HASHES = Object.freeze({
  'src/combat/encounter.ts': '9e69d044e2123723f804a8b455538fbb6bf8485a153e8a9457c8ea9bcd1ec5d0',
  'src/combat/world-objects.ts': '4875cf69fb5b530b8ba67560664aa537c3663572e0f086afc2dd6487985660d9',
  'src/combat/tactical-evaluator.ts': 'fc5043845be1bff3f08d1da9bae143221eb550e4ebda8dc3b920998e5dca50ce',
  'src/combat/movement-evaluator.ts': '13d711190174399b21e9db15fe13092fa6fc0b3ed92045811da5f49803589383',
  'src/combat/concentration-evaluator.ts': 'cf4e7c87a99f89a24499f350c6f75b8eb236846b3e1b443053ecc4a33d493f64',
  'src/vtt/session-persistence.ts': 'aa82fead85f87124a5b3a723b2dfb622e050288dc8d0fea24306ba8e0ad1b981',
  'src/vtt/replay.ts': '8a45e2da7372871faa7bdffe7ef91fd5472804477a95a0ffa4205b71e06267ac',
  'src/vtt/intel/actor-knowledge.ts': '53044063036e9d0838654ff8a1b1d33d015acab8469a71843044f94b096b51dc',
  'src/vtt/dm-tactical-intel.ts': 'beaca6f573e1ed34379d3cc243dd603bf1a347a57448cd16e0cefddf1ee29a9e',
  'src/vtt/renderer-profile.ts': '8b8a76ee440ef02279970c961a1bf1dbba5df165c47b55c4ac2ef423a782f7b0',
  'src/vtt/mcp/schemas.ts': 'bb21108e384f7abba21f9648de4b3516b151293ce0fc9a9f95f06b8e03e71a34',
  'src/vtt/mcp/engine-server.ts': 'd1492466ce17dcd4f7412c71a952a4e332ea193adf31661caa995f934d545c35',
  'src/vtt/engine-state-capsule.ts': 'ac68f62d20fbc399596cd601ba2a63a6da4027f253b9d4c87a4cfd5613c0c51c',
  'src/vtt/model.ts': '5673beb5b77812eef0e1f30d560b2bb67ab9f6e5a685b0728101e40fd0ce3387',
  'src/vtt/intel/contracts.ts': '0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1',
});

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('hand-authored serialized-surface change register', () => {
  it('keeps every unapproved registered implementation surface byte-identical', () => {
    for (const [path, expected] of Object.entries(PRE_EDIT_SOURCE_HASHES)) {
      if (PLANNED_CHANGED_SURFACES.has(path)) {
        expect(sha256(path), `${path} must contain its registered Increment 2 change`).not.toBe(expected);
      } else {
        expect(sha256(path), path).toBe(expected);
      }
    }
  });

  it('records the exact existing schema and policy literals', () => {
    const captured = {
      sessionSchema: /VTT_SESSION_SCHEMA_VERSION = (\d+)/u.exec(source('src/vtt/session-persistence.ts'))?.[1],
      replaySchema: /VTT_REPLAY_SCHEMA_VERSION = (\d+)/u.exec(source('src/vtt/replay.ts'))?.[1],
      tactical: /TACTICAL_EVALUATOR_POLICY = '([^']+)'/u.exec(source('src/combat/tactical-evaluator.ts'))?.[1],
      movement: /MOVEMENT_EVALUATOR_POLICY = '([^']+)'/u.exec(source('src/combat/movement-evaluator.ts'))?.[1],
      actorKnowledge: /intelPolicyVersion\('([^']+)'\)/u.exec(source('src/vtt/intel/actor-knowledge.ts'))?.[1],
      concentration: /CONCENTRATION_INTEL_POLICY = '([^']+)'/u.exec(source('src/combat/concentration-evaluator.ts'))?.[1],
      dmTurn: /DM_TURN_INTEL_POLICY = '([^']+)'/u.exec(source('src/vtt/dm-tactical-intel.ts'))?.[1],
      dmQuery: /DM_INTEL_QUERY_POLICY = '([^']+)'/u.exec(source('src/vtt/dm-tactical-intel.ts'))?.[1],
      dmCapture: /DM_INTEL_CAPTURE_POLICY = '([^']+)'/u.exec(source('src/vtt/dm-tactical-intel.ts'))?.[1],
      renderer: /RENDERER_POLICY_VERSION = '([^']+)'/u.exec(source('src/vtt/renderer-profile.ts'))?.[1],
      engineActorKnowledge: /ENGINE_ACTOR_KNOWLEDGE_POLICY = '([^']+)'/u.exec(source('src/vtt/mcp/schemas.ts'))?.[1],
      engineCapsuleSchema: /readonly schemaVersion: (\d+);/u.exec(source('src/vtt/engine-state-capsule.ts'))?.[1],
      boardSchema: /VTT_SCHEMA_VERSION = (\d+)/u.exec(source('src/vtt/model.ts'))?.[1],
    };
    expect(captured).toEqual({
      ...PRE_EDIT_POLICY_LITERALS,
      actorKnowledge: 'actor-knowledge-v3',
      dmTurn: 'dm-turn-intel-v2-creature-space',
      dmQuery: 'dm-intel-query-v2-creature-space',
      dmCapture: 'dm-intel-capture-v2-creature-space',
      renderer: 'turn-context-renderer-v4-creature-space',
      engineActorKnowledge: 'actor-knowledge-v2-creature-space',
    });
  });

  it('pins the public combatant summary footprint contract', () => {
    const schemas = source('src/vtt/mcp/schemas.ts');
    const summary = /const placedCombatantSummary = z\.object\(\{([\s\S]*?)\}\)\.strict\(\);/u.exec(schemas)?.[1];
    expect(summary).toContain('combatant_id: identifier');
    expect(summary).toContain('effective_size');
    expect(summary).toContain('placement_mode');
    expect(summary).toContain('footprint');
    const pending = /const placementPendingCombatantSummary = z\.object\(\{([\s\S]*?)\}\)\.strict\(\);/u.exec(schemas)?.[1];
    expect(pending).toContain("placement_status: z.literal('placement_pending')");
    expect(pending).not.toContain('footprint');
  });
});
