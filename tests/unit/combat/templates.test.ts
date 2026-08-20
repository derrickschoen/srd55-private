import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  affectedCells,
  coneAffectedCells,
  creatureOccupiesAffectedCell,
  cubeAffectedCells,
  cylinderAffectedCells,
  emanationAffectedCells,
  feetPoint,
  lineAffectedCells,
  previewAffectedCells,
  resolutionAffectedCells,
  sphereAffectedCells,
  type AreaTemplate,
  type TemplateGrid,
} from '../../../src/combat/templates';
import { feet } from '../../../src/combat/values';

const pointSchema = z.object({ x: z.number(), y: z.number() }).strict();
const directionSchema = z.object({ x: z.number(), y: z.number() }).strict();
const cellSchema = z.object({
  column: z.number().int(),
  row: z.number().int(),
}).strict();
const creatureSchema = z.object({
  id: z.string(),
  occupiedCells: z.array(cellSchema),
  affected: z.boolean(),
}).strict();
const caseFields = {
  name: z.string(),
  bounds: z.object({ columns: z.number().int(), rows: z.number().int() }).strict(),
  blockedCells: z.array(cellSchema),
  expectedCells: z.array(cellSchema),
  tangentIncluded: cellSchema.nullable(),
  outsideExcluded: cellSchema,
  creatures: z.array(creatureSchema),
};

const coneCaseSchema = z.object({
  ...caseFields,
  template: z.object({
    origin: pointSchema,
    direction: directionSchema,
    length: z.number(),
    includeOrigin: z.boolean(),
  }).strict(),
}).strict();
const cubeCaseSchema = z.object({
  ...caseFields,
  template: z.object({
    origin: pointSchema,
    center: pointSchema,
    axis: directionSchema,
    size: z.number(),
    includeOrigin: z.boolean(),
  }).strict(),
}).strict();
const cylinderCaseSchema = z.object({
  ...caseFields,
  template: z.object({
    origin: pointSchema,
    radius: z.number(),
    height: z.number(),
  }).strict(),
}).strict();
const emanationCaseSchema = z.object({
  ...caseFields,
  template: z.object({
    origin: pointSchema,
    radius: z.number(),
    includeOrigin: z.boolean(),
  }).strict(),
}).strict();
const lineCaseSchema = z.object({
  ...caseFields,
  template: z.object({
    origin: pointSchema,
    direction: directionSchema,
    length: z.number(),
    width: z.number(),
    includeOrigin: z.boolean(),
  }).strict(),
}).strict();
const sphereCaseSchema = z.object({
  ...caseFields,
  template: z.object({
    origin: pointSchema,
    radius: z.number(),
  }).strict(),
}).strict();

const fixtureFileSchema = z.discriminatedUnion('shape', [
  z.object({ shape: z.literal('cone'), cases: z.array(coneCaseSchema) }).strict(),
  z.object({ shape: z.literal('cube'), cases: z.array(cubeCaseSchema) }).strict(),
  z.object({ shape: z.literal('cylinder'), cases: z.array(cylinderCaseSchema) }).strict(),
  z.object({ shape: z.literal('emanation'), cases: z.array(emanationCaseSchema) }).strict(),
  z.object({ shape: z.literal('line'), cases: z.array(lineCaseSchema) }).strict(),
  z.object({ shape: z.literal('sphere'), cases: z.array(sphereCaseSchema) }).strict(),
]);

type FixtureFile = z.infer<typeof fixtureFileSchema>;
type LoadedFixture =
  | { readonly shape: 'cone'; readonly fixture: z.infer<typeof coneCaseSchema> }
  | { readonly shape: 'cube'; readonly fixture: z.infer<typeof cubeCaseSchema> }
  | { readonly shape: 'cylinder'; readonly fixture: z.infer<typeof cylinderCaseSchema> }
  | { readonly shape: 'emanation'; readonly fixture: z.infer<typeof emanationCaseSchema> }
  | { readonly shape: 'line'; readonly fixture: z.infer<typeof lineCaseSchema> }
  | { readonly shape: 'sphere'; readonly fixture: z.infer<typeof sphereCaseSchema> };

const fixtureNames = [
  'cone',
  'cube',
  'cylinder',
  'emanation',
  'line',
  'sphere',
] as const;

function loadFixtureFile(name: (typeof fixtureNames)[number]): FixtureFile {
  const source = readFileSync(
    new URL(`./fixtures/templates/${name}.json`, import.meta.url),
    'utf8',
  );
  const decoded: unknown = JSON.parse(source);
  return fixtureFileSchema.parse(decoded);
}

function flattenFixtureFile(file: FixtureFile): readonly LoadedFixture[] {
  switch (file.shape) {
    case 'cone': return file.cases.map((fixture) => ({ shape: file.shape, fixture }));
    case 'cube': return file.cases.map((fixture) => ({ shape: file.shape, fixture }));
    case 'cylinder': return file.cases.map((fixture) => ({ shape: file.shape, fixture }));
    case 'emanation': return file.cases.map((fixture) => ({ shape: file.shape, fixture }));
    case 'line': return file.cases.map((fixture) => ({ shape: file.shape, fixture }));
    case 'sphere': return file.cases.map((fixture) => ({ shape: file.shape, fixture }));
  }
}

const fixtures = fixtureNames.flatMap((name) => flattenFixtureFile(loadFixtureFile(name)));

function areaForFixture(loaded: LoadedFixture): AreaTemplate {
  switch (loaded.shape) {
    case 'cone':
      return {
        shape: loaded.shape,
        template: {
          origin: feetPoint(loaded.fixture.template.origin.x, loaded.fixture.template.origin.y),
          direction: loaded.fixture.template.direction,
          length: feet(loaded.fixture.template.length),
          includeOrigin: loaded.fixture.template.includeOrigin,
        },
      };
    case 'cube':
      return {
        shape: loaded.shape,
        template: {
          origin: feetPoint(loaded.fixture.template.origin.x, loaded.fixture.template.origin.y),
          center: feetPoint(loaded.fixture.template.center.x, loaded.fixture.template.center.y),
          axis: loaded.fixture.template.axis,
          size: feet(loaded.fixture.template.size),
          includeOrigin: loaded.fixture.template.includeOrigin,
        },
      };
    case 'cylinder':
      return {
        shape: loaded.shape,
        template: {
          origin: feetPoint(loaded.fixture.template.origin.x, loaded.fixture.template.origin.y),
          radius: feet(loaded.fixture.template.radius),
          height: feet(loaded.fixture.template.height),
        },
      };
    case 'emanation':
      return {
        shape: loaded.shape,
        template: {
          origin: feetPoint(loaded.fixture.template.origin.x, loaded.fixture.template.origin.y),
          radius: feet(loaded.fixture.template.radius),
          includeOrigin: loaded.fixture.template.includeOrigin,
        },
      };
    case 'line':
      return {
        shape: loaded.shape,
        template: {
          origin: feetPoint(loaded.fixture.template.origin.x, loaded.fixture.template.origin.y),
          direction: loaded.fixture.template.direction,
          length: feet(loaded.fixture.template.length),
          width: feet(loaded.fixture.template.width),
          includeOrigin: loaded.fixture.template.includeOrigin,
        },
      };
    case 'sphere':
      return {
        shape: loaded.shape,
        template: {
          origin: feetPoint(loaded.fixture.template.origin.x, loaded.fixture.template.origin.y),
          radius: feet(loaded.fixture.template.radius),
        },
      };
  }
}

function gridForFixture(loaded: LoadedFixture): TemplateGrid {
  return {
    bounds: loaded.fixture.bounds,
    blockedCells: loaded.fixture.blockedCells,
  };
}

function cellKey(cell: { readonly column: number; readonly row: number }): string {
  return `${cell.column},${cell.row}`;
}

function expectOriginPair(
  shape: LoadedFixture['shape'],
  excludedName: string,
  includedName: string,
): void {
  const excluded = fixtures.find(
    (candidate) => candidate.shape === shape && candidate.fixture.name === excludedName,
  );
  const included = fixtures.find(
    (candidate) => candidate.shape === shape && candidate.fixture.name === includedName,
  );
  expect(excluded).toBeDefined();
  expect(included).toBeDefined();
  if (excluded === undefined || included === undefined) {
    throw new Error(`${shape} origin fixture pair is incomplete.`);
  }
  const excludedCells = affectedCells(gridForFixture(excluded), areaForFixture(excluded));
  const includedCells = affectedCells(gridForFixture(included), areaForFixture(included));
  expect(excludedCells).toEqual(excluded.fixture.expectedCells);
  expect(includedCells).toEqual(included.fixture.expectedCells);
  expect(included.fixture.tangentIncluded).not.toBeNull();
  if (included.fixture.tangentIncluded === null) {
    throw new Error(`${shape} included-origin fixture lacks its origin-only square.`);
  }
  expect(excluded.fixture.outsideExcluded).toEqual(included.fixture.tangentIncluded);
  expect(new Set(excludedCells.map(cellKey)).has(cellKey(included.fixture.tangentIncluded))).toBe(false);
  expect(new Set(includedCells.map(cellKey)).has(cellKey(included.fixture.tangentIncluded))).toBe(true);
}

describe('continuous SRD template fixtures', () => {
  for (const loaded of fixtures) {
    it(`${loaded.shape}: ${loaded.fixture.name}`, () => {
      const cells = affectedCells(gridForFixture(loaded), areaForFixture(loaded));
      expect(cells).toEqual(loaded.fixture.expectedCells);
      const keys = new Set(cells.map(cellKey));
      if (loaded.fixture.tangentIncluded !== null) {
        expect(keys.has(cellKey(loaded.fixture.tangentIncluded))).toBe(true);
      }
      expect(keys.has(cellKey(loaded.fixture.outsideExcluded))).toBe(false);
      for (const creature of loaded.fixture.creatures) {
        expect(
          creatureOccupiesAffectedCell(creature.occupiedCells, cells),
          creature.id,
        ).toBe(creature.affected);
      }
    });
  }
});

describe('template placement contracts and shared consumers', () => {
  it('mutation 27: sphere preserves an intersection center instead of forcing a cell center', () => {
    const sphere = fixtures.find(
      (candidate) => candidate.shape === 'sphere' && candidate.fixture.blockedCells.length === 0,
    );
    expect(sphere).toBeDefined();
    if (sphere === undefined) throw new Error('Sphere fixture inventory is incomplete.');
    expect(affectedCells(gridForFixture(sphere), areaForFixture(sphere))).toEqual(
      sphere.fixture.expectedCells,
    );
    expect(() => sphereAffectedCells(
      gridForFixture(sphere),
      { origin: feetPoint(2.5, 2.5), radius: feet(5) },
    )).toThrow('grid intersection');
  });

  it('mutation 28: exact tangencies are included while the next square is excluded for every shape', () => {
    for (const loaded of fixtures.filter((candidate) => candidate.fixture.blockedCells.length === 0)) {
      const cells = affectedCells(gridForFixture(loaded), areaForFixture(loaded));
      const keys = new Set(cells.map(cellKey));
      if (loaded.fixture.tangentIncluded !== null) {
        expect(keys.has(cellKey(loaded.fixture.tangentIncluded)), loaded.shape).toBe(true);
      }
      expect(keys.has(cellKey(loaded.fixture.outsideExcluded)), loaded.shape).toBe(false);
    }
  });

  it('mutation 29: preview and confirmed resolution expose the identical affected-cells function', () => {
    expect(previewAffectedCells).toBe(affectedCells);
    expect(resolutionAffectedCells).toBe(affectedCells);
    expect(previewAffectedCells).toBe(resolutionAffectedCells);
  });

  it('mutation 30: Total Cover excludes every geometrically covered location behind the wall', () => {
    for (const loaded of fixtures.filter((candidate) => candidate.fixture.blockedCells.length > 0)) {
      expect(affectedCells(gridForFixture(loaded), areaForFixture(loaded))).toEqual(
        loaded.fixture.expectedCells,
      );
    }
  });

  it('mutation 31: cone width equals distance rather than twice the distance', () => {
    const cone = fixtures.find(
      (candidate) => candidate.shape === 'cone' && candidate.fixture.blockedCells.length === 0,
    );
    expect(cone).toBeDefined();
    if (cone === undefined) throw new Error('Cone fixture inventory is incomplete.');
    expect(affectedCells(gridForFixture(cone), areaForFixture(cone))).toEqual(
      cone.fixture.expectedCells,
    );
  });

  it('mutation 32: line width is centered as two exact half-widths', () => {
    const line = fixtures.find(
      (candidate) => candidate.shape === 'line' && candidate.fixture.blockedCells.length === 0,
    );
    expect(line).toBeDefined();
    if (line === undefined) throw new Error('Line fixture inventory is incomplete.');
    expect(affectedCells(gridForFixture(line), areaForFixture(line))).toEqual(
      line.fixture.expectedCells,
    );
  });

  it('origin inclusion mutant: cone always-included origin is killed', () => {
    expectOriginPair(
      'cone',
      'cone excluded origin removes apex-only western squares',
      'cone included origin adds both apex-only western squares',
    );
  });

  it('origin inclusion mutant: cube always-included origin is killed', () => {
    expectOriginPair(
      'cube',
      'cube excluded corner origin removes its diagonal-only square',
      'cube included corner origin adds its diagonal-only square',
    );
  });

  it('origin inclusion mutant: emanation always-included origin is killed', () => {
    expectOriginPair(
      'emanation',
      'zero-distance emanation with excluded origin touches no square',
      'zero-distance emanation with included origin touches four squares',
    );
  });

  it('origin inclusion mutant: line always-included origin is killed', () => {
    expectOriginPair(
      'line',
      'diagonal line with excluded origin removes southwest apex-only square',
      'diagonal line with included origin adds southwest apex-only square',
    );
  });

  it('SRD fixed-origin Cylinder and Sphere keep their included centers', () => {
    for (const shape of ['cylinder', 'sphere'] as const) {
      const loaded = fixtures.find(
        (candidate) => candidate.shape === shape && candidate.fixture.blockedCells.length === 0,
      );
      expect(loaded).toBeDefined();
      if (loaded === undefined) throw new Error(`${shape} fixture inventory is incomplete.`);
      expect(affectedCells(gridForFixture(loaded), areaForFixture(loaded))).toEqual(
        loaded.fixture.expectedCells,
      );
    }
  });

  it('validates every shape-specific public function without a second geometry path', () => {
    const grid: TemplateGrid = { bounds: { columns: 2, rows: 2 }, blockedCells: [] };
    expect(coneAffectedCells(grid, {
      origin: feetPoint(0, 5), direction: { x: 1, y: 0 }, length: feet(5), includeOrigin: false,
    })).toEqual(affectedCells(grid, {
      shape: 'cone', template: {
        origin: feetPoint(0, 5), direction: { x: 1, y: 0 }, length: feet(5), includeOrigin: false,
      },
    }));
    expect(cubeAffectedCells(grid, {
      origin: feetPoint(0, 5), center: feetPoint(5, 5), axis: { x: 1, y: 0 }, size: feet(10), includeOrigin: false,
    })).toEqual(affectedCells(grid, {
      shape: 'cube', template: {
        origin: feetPoint(0, 5), center: feetPoint(5, 5), axis: { x: 1, y: 0 }, size: feet(10), includeOrigin: false,
      },
    }));
    expect(cylinderAffectedCells(grid, {
      origin: feetPoint(5, 5), radius: feet(5), height: feet(10),
    })).toEqual(affectedCells(grid, {
      shape: 'cylinder', template: { origin: feetPoint(5, 5), radius: feet(5), height: feet(10) },
    }));
    expect(emanationAffectedCells(grid, {
      origin: feetPoint(5, 5), radius: feet(5), includeOrigin: false,
    })).toEqual(affectedCells(grid, {
      shape: 'emanation', template: { origin: feetPoint(5, 5), radius: feet(5), includeOrigin: false },
    }));
    expect(lineAffectedCells(grid, {
      origin: feetPoint(0, 5), direction: { x: 1, y: 0 }, length: feet(5), width: feet(5), includeOrigin: false,
    })).toEqual(affectedCells(grid, {
      shape: 'line', template: {
        origin: feetPoint(0, 5), direction: { x: 1, y: 0 }, length: feet(5), width: feet(5), includeOrigin: false,
      },
    }));
    expect(sphereAffectedCells(grid, {
      origin: feetPoint(5, 5), radius: feet(5),
    })).toEqual(affectedCells(grid, {
      shape: 'sphere', template: { origin: feetPoint(5, 5), radius: feet(5) },
    }));
  });
});
