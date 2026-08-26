import {
  isCellInside,
  type GridBounds,
  type GridCell,
  type GridObstacles,
} from './grid';
import { feet, type Feet } from './values';

const GRID_FEET = 5;
const EPSILON = 1e-9;
const FULL_TURN = Math.PI * 2;

export interface FeetPoint {
  readonly x: Feet;
  readonly y: Feet;
}

export interface Direction {
  readonly x: number;
  readonly y: number;
}

export interface TemplateGrid extends GridObstacles {
  readonly bounds: GridBounds;
}

interface OriginChoice {
  readonly origin: FeetPoint;
  /** SRD shapes differ on whether their point of origin belongs to the area. */
  readonly includeOrigin: boolean;
}

export interface ConeTemplate extends OriginChoice {
  readonly direction: Direction;
  readonly length: Feet;
}

export interface CubeTemplate extends OriginChoice {
  readonly center: FeetPoint;
  readonly axis: Direction;
  readonly size: Feet;
}

export interface CylinderTemplate {
  readonly origin: FeetPoint;
  readonly radius: Feet;
  readonly height: Feet;
}

export interface EmanationTemplate extends OriginChoice {
  readonly radius: Feet;
}

export interface LineTemplate extends OriginChoice {
  readonly direction: Direction;
  readonly length: Feet;
  readonly width: Feet;
}

export interface SphereTemplate {
  readonly origin: FeetPoint;
  readonly radius: Feet;
}

export type AreaTemplate =
  | { readonly shape: 'cone'; readonly template: ConeTemplate }
  | { readonly shape: 'cube'; readonly template: CubeTemplate }
  | { readonly shape: 'cylinder'; readonly template: CylinderTemplate }
  | { readonly shape: 'emanation'; readonly template: EmanationTemplate }
  | { readonly shape: 'line'; readonly template: LineTemplate }
  | { readonly shape: 'sphere'; readonly template: SphereTemplate };

interface Point {
  readonly x: number;
  readonly y: number;
}

interface Rectangle {
  readonly minimumX: number;
  readonly maximumX: number;
  readonly minimumY: number;
  readonly maximumY: number;
}

interface CircleArea {
  readonly kind: 'circle';
  readonly center: Point;
  readonly radius: number;
  readonly excludedPoint: Point | null;
}

interface PolygonArea {
  readonly kind: 'polygon';
  readonly vertices: readonly Point[];
  readonly excludedPoint: Point | null;
}

type ContinuousArea = CircleArea | PolygonArea;

interface RayInterval {
  readonly entry: number;
  readonly exit: number;
}

export function feetPoint(x: number, y: number): FeetPoint {
  return { x: feet(x), y: feet(y) };
}

function point(value: FeetPoint): Point {
  return { x: value.x, y: value.y };
}

function nonNegative(value: Feet, label: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError(`${label} must be a finite, non-negative distance.`);
  }
  return value;
}

function positive(value: Feet, label: string): number {
  const checked = nonNegative(value, label);
  if (checked === 0) {
    throw new RangeError(`${label} must be greater than 0 feet.`);
  }
  return checked;
}

function unit(value: Direction): Point {
  if (!Number.isFinite(value.x) || !Number.isFinite(value.y)) {
    throw new RangeError('Template direction must be finite.');
  }
  const magnitude = Math.hypot(value.x, value.y);
  if (magnitude <= EPSILON) {
    throw new RangeError('Template direction must be non-zero.');
  }
  return { x: value.x / magnitude, y: value.y / magnitude };
}

function assertSnappedCenter(value: FeetPoint, label: string): void {
  const xSteps = value.x / GRID_FEET;
  const ySteps = value.y / GRID_FEET;
  if (
    Math.abs(xSteps - Math.round(xSteps)) > EPSILON ||
    Math.abs(ySteps - Math.round(ySteps)) > EPSILON
  ) {
    throw new RangeError(`${label} must snap to a 5-foot grid intersection.`);
  }
}

function rectangleForCell(cell: GridCell): Rectangle {
  return {
    minimumX: cell.column * GRID_FEET,
    maximumX: (cell.column + 1) * GRID_FEET,
    minimumY: cell.row * GRID_FEET,
    maximumY: (cell.row + 1) * GRID_FEET,
  };
}

function corners(rectangle: Rectangle): readonly Point[] {
  return [
    { x: rectangle.minimumX, y: rectangle.minimumY },
    { x: rectangle.maximumX, y: rectangle.minimumY },
    { x: rectangle.maximumX, y: rectangle.maximumY },
    { x: rectangle.minimumX, y: rectangle.maximumY },
  ];
}

function samePoint(left: Point, right: Point): boolean {
  return Math.hypot(left.x - right.x, left.y - right.y) <= EPSILON;
}

function cross(left: Point, right: Point): number {
  return left.x * right.y - left.y * right.x;
}

function subtract(left: Point, right: Point): Point {
  return { x: left.x - right.x, y: left.y - right.y };
}

function signedArea(vertices: readonly Point[]): number {
  let area = 0;
  for (let index = 0; index < vertices.length; index += 1) {
    const current = vertices[index];
    const next = vertices[(index + 1) % vertices.length];
    if (current !== undefined && next !== undefined) {
      area += cross(current, next);
    }
  }
  return area / 2;
}

function counterClockwise(vertices: readonly Point[]): readonly Point[] {
  return signedArea(vertices) < 0 ? [...vertices].reverse() : vertices;
}

function clipPolygon(
  vertices: readonly Point[],
  inside: (candidate: Point) => boolean,
  intersection: (from: Point, to: Point) => Point,
): readonly Point[] {
  if (vertices.length === 0) return [];
  const output: Point[] = [];
  for (let index = 0; index < vertices.length; index += 1) {
    const from = vertices[index];
    const to = vertices[(index + 1) % vertices.length];
    if (from === undefined || to === undefined) continue;
    const fromInside = inside(from);
    const toInside = inside(to);
    if (fromInside && toInside) {
      output.push(to);
    } else if (fromInside) {
      output.push(intersection(from, to));
    } else if (toInside) {
      output.push(intersection(from, to), to);
    }
  }
  return output;
}

function interpolateAtX(from: Point, to: Point, x: number): Point {
  const fraction = (x - from.x) / (to.x - from.x);
  return { x, y: from.y + (to.y - from.y) * fraction };
}

function interpolateAtY(from: Point, to: Point, y: number): Point {
  const fraction = (y - from.y) / (to.y - from.y);
  return { x: from.x + (to.x - from.x) * fraction, y };
}

function polygonInRectangle(
  vertices: readonly Point[],
  rectangle: Rectangle,
): readonly Point[] {
  let clipped = clipPolygon(
    vertices,
    (candidate) => candidate.x >= rectangle.minimumX - EPSILON,
    (from, to) => interpolateAtX(from, to, rectangle.minimumX),
  );
  clipped = clipPolygon(
    clipped,
    (candidate) => candidate.x <= rectangle.maximumX + EPSILON,
    (from, to) => interpolateAtX(from, to, rectangle.maximumX),
  );
  clipped = clipPolygon(
    clipped,
    (candidate) => candidate.y >= rectangle.minimumY - EPSILON,
    (from, to) => interpolateAtY(from, to, rectangle.minimumY),
  );
  return clipPolygon(
    clipped,
    (candidate) => candidate.y <= rectangle.maximumY + EPSILON,
    (from, to) => interpolateAtY(from, to, rectangle.maximumY),
  );
}

function closest(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function circleIntersectsRectangle(
  circle: CircleArea,
  rectangle: Rectangle,
): boolean {
  const x = closest(circle.center.x, rectangle.minimumX, rectangle.maximumX);
  const y = closest(circle.center.y, rectangle.minimumY, rectangle.maximumY);
  return Math.hypot(x - circle.center.x, y - circle.center.y) <= circle.radius + EPSILON;
}

function cellIntersectionPoints(
  area: ContinuousArea,
  rectangle: Rectangle,
): readonly Point[] {
  if (area.kind === 'polygon') {
    return polygonInRectangle(area.vertices, rectangle);
  }

  const result: Point[] = [];
  const add = (candidate: Point): void => {
    if (
      candidate.x >= rectangle.minimumX - EPSILON &&
      candidate.x <= rectangle.maximumX + EPSILON &&
      candidate.y >= rectangle.minimumY - EPSILON &&
      candidate.y <= rectangle.maximumY + EPSILON &&
      !result.some((existing) => samePoint(existing, candidate))
    ) {
      result.push(candidate);
    }
  };
  for (const candidate of corners(rectangle)) {
    if (
      Math.hypot(candidate.x - area.center.x, candidate.y - area.center.y) <=
      area.radius + EPSILON
    ) {
      add(candidate);
    }
  }
  for (const x of [rectangle.minimumX, rectangle.maximumX]) {
    const horizontal = x - area.center.x;
    const remainder = area.radius ** 2 - horizontal ** 2;
    if (remainder >= -EPSILON) {
      const vertical = Math.sqrt(Math.max(0, remainder));
      add({ x, y: area.center.y - vertical });
      add({ x, y: area.center.y + vertical });
    }
  }
  for (const y of [rectangle.minimumY, rectangle.maximumY]) {
    const vertical = y - area.center.y;
    const remainder = area.radius ** 2 - vertical ** 2;
    if (remainder >= -EPSILON) {
      const horizontal = Math.sqrt(Math.max(0, remainder));
      add({ x: area.center.x - horizontal, y });
      add({ x: area.center.x + horizontal, y });
    }
  }
  for (const candidate of [
    area.center,
    { x: area.center.x - area.radius, y: area.center.y },
    { x: area.center.x + area.radius, y: area.center.y },
    { x: area.center.x, y: area.center.y - area.radius },
    { x: area.center.x, y: area.center.y + area.radius },
  ]) {
    add(candidate);
  }
  return result;
}

function rayRectangle(
  origin: Point,
  direction: Point,
  rectangle: Rectangle,
): RayInterval | null {
  let entry = 0;
  let exit = Number.POSITIVE_INFINITY;
  for (const [position, delta, minimum, maximum] of [
    [origin.x, direction.x, rectangle.minimumX, rectangle.maximumX],
    [origin.y, direction.y, rectangle.minimumY, rectangle.maximumY],
  ] as const) {
    if (Math.abs(delta) <= EPSILON) {
      if (position < minimum - EPSILON || position > maximum + EPSILON) return null;
      continue;
    }
    const first = (minimum - position) / delta;
    const second = (maximum - position) / delta;
    entry = Math.max(entry, Math.min(first, second));
    exit = Math.min(exit, Math.max(first, second));
  }
  return exit + EPSILON >= entry && exit >= -EPSILON
    ? { entry: Math.max(0, entry), exit }
    : null;
}

function rayCircle(
  origin: Point,
  direction: Point,
  circle: CircleArea,
): RayInterval | null {
  const offset = subtract(origin, circle.center);
  const projection = offset.x * direction.x + offset.y * direction.y;
  const discriminant = projection ** 2 - (offset.x ** 2 + offset.y ** 2 - circle.radius ** 2);
  if (discriminant < -EPSILON) return null;
  const root = Math.sqrt(Math.max(0, discriminant));
  const entry = -projection - root;
  const exit = -projection + root;
  return exit >= -EPSILON ? { entry: Math.max(0, entry), exit } : null;
}

function rayPolygon(
  origin: Point,
  direction: Point,
  vertices: readonly Point[],
): RayInterval | null {
  const polygon = counterClockwise(vertices);
  let entry = 0;
  let exit = Number.POSITIVE_INFINITY;
  for (let index = 0; index < polygon.length; index += 1) {
    const from = polygon[index];
    const to = polygon[(index + 1) % polygon.length];
    if (from === undefined || to === undefined) continue;
    const edge = subtract(to, from);
    const constant = cross(edge, subtract(origin, from));
    const slope = cross(edge, direction);
    if (Math.abs(slope) <= EPSILON) {
      if (constant < -EPSILON) return null;
      continue;
    }
    const boundary = (-EPSILON - constant) / slope;
    if (slope > 0) entry = Math.max(entry, boundary);
    else exit = Math.min(exit, boundary);
  }
  return exit + EPSILON >= entry && exit >= -EPSILON
    ? { entry: Math.max(0, entry), exit }
    : null;
}

function intersectIntervals(
  left: RayInterval | null,
  right: RayInterval | null,
): RayInterval | null {
  if (left === null || right === null) return null;
  const entry = Math.max(left.entry, right.entry);
  const exit = Math.min(left.exit, right.exit);
  return exit + EPSILON >= entry ? { entry, exit } : null;
}

function targetRayInterval(
  area: ContinuousArea,
  rectangle: Rectangle,
  origin: Point,
  direction: Point,
): RayInterval | null {
  const cell = rayRectangle(origin, direction, rectangle);
  const shape =
    area.kind === 'circle'
      ? rayCircle(origin, direction, area)
      : rayPolygon(origin, direction, area.vertices);
  return intersectIntervals(cell, shape);
}

function normalizedAngle(value: number): number {
  const result = value % FULL_TURN;
  return result < 0 ? result + FULL_TURN : result;
}

function visibilityAngles(
  area: ContinuousArea,
  rectangle: Rectangle,
  origin: Point,
  obstacles: readonly Rectangle[],
): readonly number[] {
  const critical: number[] = [];
  const addPoint = (candidate: Point): void => {
    if (samePoint(candidate, origin)) return;
    critical.push(normalizedAngle(Math.atan2(candidate.y - origin.y, candidate.x - origin.x)));
  };
  for (const candidate of cellIntersectionPoints(area, rectangle)) addPoint(candidate);
  for (const obstacle of obstacles) {
    for (const candidate of corners(obstacle)) addPoint(candidate);
  }
  critical.sort((left, right) => left - right);
  const unique = critical.filter(
    (angle, index) => index === 0 || Math.abs(angle - (critical[index - 1] ?? angle)) > EPSILON,
  );
  if (unique.length === 0) return [0];

  const result: number[] = [];
  for (let index = 0; index < unique.length; index += 1) {
    const current = unique[index];
    const next = unique[(index + 1) % unique.length];
    if (current === undefined || next === undefined) continue;
    result.push(current);
    const adjustedNext = index === unique.length - 1 ? next + FULL_TURN : next;
    result.push(normalizedAngle((current + adjustedNext) / 2));
  }
  return result;
}

function locationIsVisible(
  area: ContinuousArea,
  rectangle: Rectangle,
  origin: Point,
  obstacles: readonly Rectangle[],
): boolean {
  for (const angle of visibilityAngles(area, rectangle, origin, obstacles)) {
    const direction = { x: Math.cos(angle), y: Math.sin(angle) };
    const target = targetRayInterval(area, rectangle, origin, direction);
    if (target === null) continue;
    const blocked = obstacles.some((obstacle) => {
      const obstruction = rayRectangle(origin, direction, obstacle);
      return obstruction !== null && obstruction.entry <= target.entry + EPSILON;
    });
    if (!blocked) return true;
  }
  return false;
}

function cellKey(cell: GridCell): string {
  return `${cell.column},${cell.row}`;
}

function enumerateAffectedCells(
  grid: TemplateGrid,
  origin: Point,
  area: ContinuousArea,
  candidates?: readonly GridCell[],
): readonly GridCell[] {
  const blockedKeys = new Set<string>();
  const obstacles: Rectangle[] = [];
  for (const blockedCell of grid.blockedCells) {
    if (!isCellInside(grid.bounds, blockedCell)) {
      throw new RangeError('A blocked template cell is outside the grid.');
    }
    const key = cellKey(blockedCell);
    if (!blockedKeys.has(key)) {
      blockedKeys.add(key);
      obstacles.push(rectangleForCell(blockedCell));
    }
  }

  const considered = candidates === undefined
    ? Array.from({ length: grid.bounds.rows }, (_row, row) =>
        Array.from({ length: grid.bounds.columns }, (_column, column) => ({ column, row }))).flat()
    : [...new Map(candidates.map((cell) => [cellKey(cell), cell] as const)).values()];
  const affected: GridCell[] = [];
  for (const cell of considered) {
    if (!isCellInside(grid.bounds, cell)) {
      throw new RangeError('A candidate template cell is outside the grid.');
    }
    if (blockedKeys.has(cellKey(cell))) continue;
    const rectangle = rectangleForCell(cell);
    const intersections = cellIntersectionPoints(area, rectangle);
    const excludedPoint = area.excludedPoint;
    const geometricallyIncluded =
      area.kind === 'circle'
        ? circleIntersectsRectangle(area, rectangle) &&
          intersections.length > 0 &&
          (excludedPoint === null ||
            intersections.some((candidate) => !samePoint(candidate, excludedPoint)))
        : intersections.length > 0 &&
          (excludedPoint === null ||
            intersections.some((candidate) => !samePoint(candidate, excludedPoint)));
    if (
      geometricallyIncluded &&
      locationIsVisible(area, rectangle, origin, obstacles)
    ) {
      affected.push(cell);
    }
  }
  return affected;
}

function polygonArea(
  vertices: readonly Point[],
  excludedPoint: Point | null,
): PolygonArea {
  return { kind: 'polygon', vertices: counterClockwise(vertices), excludedPoint };
}

/**
 * SRD Cone: straight lines from an origin in a chosen direction; width equals
 * distance from the origin, which is optional (SRD 5.2.1 lines 11546-11561).
 */
export function coneAffectedCells(
  grid: TemplateGrid,
  template: ConeTemplate,
  candidates?: readonly GridCell[],
): readonly GridCell[] {
  const origin = point(template.origin);
  const direction = unit(template.direction);
  const perpendicular = { x: -direction.y, y: direction.x };
  const length = positive(template.length, 'Cone length');
  const end = {
    x: origin.x + direction.x * length,
    y: origin.y + direction.y * length,
  };
  const halfWidth = length / 2;
  return enumerateAffectedCells(
    grid,
    origin,
    polygonArea(
      [
        origin,
        { x: end.x + perpendicular.x * halfWidth, y: end.y + perpendicular.y * halfWidth },
        { x: end.x - perpendicular.x * halfWidth, y: end.y - perpendicular.y * halfWidth },
      ],
      template.includeOrigin ? null : origin,
    ),
    candidates,
  );
}

/**
 * SRD Cube: straight lines from an origin anywhere on a face; side length is
 * the specified size and the origin is optional (SRD 5.2.1 lines 11543-11550).
 * D315.3 PRODUCT RULE: the placeable center snaps to a grid intersection.
 */
function cubeContinuousArea(
  template: CubeTemplate,
): { readonly origin: Point; readonly area: PolygonArea } {
  assertSnappedCenter(template.center, 'Cube center');
  const center = point(template.center);
  const origin = point(template.origin);
  const axis = unit(template.axis);
  const perpendicular = { x: -axis.y, y: axis.x };
  const half = positive(template.size, 'Cube size') / 2;
  const offset = subtract(origin, center);
  const along = offset.x * axis.x + offset.y * axis.y;
  const across = offset.x * perpendicular.x + offset.y * perpendicular.y;
  const onFace =
    (Math.abs(Math.abs(along) - half) <= EPSILON && Math.abs(across) <= half + EPSILON) ||
    (Math.abs(Math.abs(across) - half) <= EPSILON && Math.abs(along) <= half + EPSILON);
  if (!onFace) {
    throw new RangeError('Cube origin must be located on one of the Cube faces.');
  }
  return {
    origin,
    area: polygonArea(
      [
        { x: center.x - axis.x * half - perpendicular.x * half, y: center.y - axis.y * half - perpendicular.y * half },
        { x: center.x + axis.x * half - perpendicular.x * half, y: center.y + axis.y * half - perpendicular.y * half },
        { x: center.x + axis.x * half + perpendicular.x * half, y: center.y + axis.y * half + perpendicular.y * half },
        { x: center.x - axis.x * half + perpendicular.x * half, y: center.y - axis.y * half + perpendicular.y * half },
      ],
      template.includeOrigin ? null : origin,
    ),
  };
}

export function cubeAffectedCells(
  grid: TemplateGrid,
  template: CubeTemplate,
): readonly GridCell[] {
  const continuous = cubeContinuousArea(template);
  return enumerateAffectedCells(grid, continuous.origin, continuous.area);
}

/** Exact Cube geometry restricted to named cells; avoids scanning an entire board for target selection. */
export function cubeAffectedCellsAmong(
  grid: TemplateGrid,
  template: CubeTemplate,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  const continuous = cubeContinuousArea(template);
  return enumerateAffectedCells(grid, continuous.origin, continuous.area, candidates);
}

/**
 * SRD Cylinder: radius and height extend from the included origin at a circular
 * top/bottom center (SRD 5.2.1 lines 11565-11573). This board kernel computes
 * its exact horizontal footprint; height remains checked data for 3D consumers.
 * D315.3 PRODUCT RULE: the placeable center snaps to a grid intersection.
 */
export function cylinderAffectedCells(
  grid: TemplateGrid,
  template: CylinderTemplate,
  candidates?: readonly GridCell[],
): readonly GridCell[] {
  assertSnappedCenter(template.origin, 'Cylinder center');
  positive(template.height, 'Cylinder height');
  const origin = point(template.origin);
  return enumerateAffectedCells(grid, origin, {
    kind: 'circle',
    center: origin,
    radius: positive(template.radius, 'Cylinder radius'),
    excludedPoint: null,
  }, candidates);
}

/**
 * SRD Emanation: straight lines in every direction from a creature/object and
 * an optional origin (SRD 5.2.1 lines 11647-11658).
 */
export function emanationAffectedCells(
  grid: TemplateGrid,
  template: EmanationTemplate,
  candidates?: readonly GridCell[],
): readonly GridCell[] {
  const origin = point(template.origin);
  const radius = nonNegative(template.radius, 'Emanation distance');
  return enumerateAffectedCells(grid, origin, {
    kind: 'circle',
    center: origin,
    radius,
    excludedPoint: template.includeOrigin ? null : origin,
  }, candidates);
}

/**
 * SRD Line: a straight path with specified length/width and an optional origin
 * (SRD 5.2.1 lines 11873-11879).
 */
export function lineAffectedCells(
  grid: TemplateGrid,
  template: LineTemplate,
  candidates?: readonly GridCell[],
): readonly GridCell[] {
  const origin = point(template.origin);
  const direction = unit(template.direction);
  const perpendicular = { x: -direction.y, y: direction.x };
  const length = positive(template.length, 'Line length');
  const halfWidth = positive(template.width, 'Line width') / 2;
  const end = {
    x: origin.x + direction.x * length,
    y: origin.y + direction.y * length,
  };
  return enumerateAffectedCells(
    grid,
    origin,
    polygonArea(
      [
        { x: origin.x - perpendicular.x * halfWidth, y: origin.y - perpendicular.y * halfWidth },
        { x: end.x - perpendicular.x * halfWidth, y: end.y - perpendicular.y * halfWidth },
        { x: end.x + perpendicular.x * halfWidth, y: end.y + perpendicular.y * halfWidth },
        { x: origin.x + perpendicular.x * halfWidth, y: origin.y + perpendicular.y * halfWidth },
      ],
      template.includeOrigin ? null : origin,
    ),
    candidates,
  );
}

/**
 * SRD Sphere: straight lines in every direction for the stated radius; its
 * origin is included (SRD 5.2.1 lines 12082-12088).
 * D315.3 PRODUCT RULE: the placeable center snaps to a grid intersection.
 */
export function sphereAffectedCells(
  grid: TemplateGrid,
  template: SphereTemplate,
  candidates?: readonly GridCell[],
): readonly GridCell[] {
  assertSnappedCenter(template.origin, 'Sphere center');
  const origin = point(template.origin);
  return enumerateAffectedCells(grid, origin, {
    kind: 'circle',
    center: origin,
    radius: positive(template.radius, 'Sphere radius'),
    excludedPoint: null,
  }, candidates);
}

/**
 * D315.3 PRODUCT RULES (not SRD): exact continuous templates include a square
 * when they touch any part of it, and creatures are affected when any occupied
 * square is included. Results are clipped to the board and sorted row-major.
 *
 * SRD Total Cover: a location is excluded when every straight line from the
 * origin is blocked by Total Cover (SRD 5.2.1 lines 11331-11346). Grid blocked
 * cells supply those opaque obstructions, shared with the movement kernel.
 */
export function affectedCells(
  grid: TemplateGrid,
  area: AreaTemplate,
): readonly GridCell[] {
  switch (area.shape) {
    case 'cone': return coneAffectedCells(grid, area.template);
    case 'cube': return cubeAffectedCells(grid, area.template);
    case 'cylinder': return cylinderAffectedCells(grid, area.template);
    case 'emanation': return emanationAffectedCells(grid, area.template);
    case 'line': return lineAffectedCells(grid, area.template);
    case 'sphere': return sphereAffectedCells(grid, area.template);
  }
}

/** Exact template geometry restricted to named cells; callers retain the canonical shape implementation. */
export function affectedCellsAmong(
  grid: TemplateGrid,
  area: AreaTemplate,
  candidates: readonly GridCell[],
): readonly GridCell[] {
  switch (area.shape) {
    case 'cone': return coneAffectedCells(grid, area.template, candidates);
    case 'cube': return cubeAffectedCellsAmong(grid, area.template, candidates);
    case 'cylinder': return cylinderAffectedCells(grid, area.template, candidates);
    case 'emanation': return emanationAffectedCells(grid, area.template, candidates);
    case 'line': return lineAffectedCells(grid, area.template, candidates);
    case 'sphere': return sphereAffectedCells(grid, area.template, candidates);
  }
}

/** Both preview and confirmed resolution are deliberately the same function. */
export const previewAffectedCells = affectedCells;
export const resolutionAffectedCells = affectedCells;

export function creatureOccupiesAffectedCell(
  occupiedCells: readonly GridCell[],
  templateCells: readonly GridCell[],
): boolean {
  const affected = new Set(templateCells.map(cellKey));
  return occupiedCells.some((cell) => affected.has(cellKey(cell)));
}
