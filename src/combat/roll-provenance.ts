import type { Brand } from '../domain/ids';
import type { DiceExpression } from './resolution';
import type { RollMode } from './saving-throw-outcomes';
import type { RngCheckpoint, TransactionalRng } from './random';
import { dieSides, type CombatantId, type DieSides } from './values';

export type RollOccurrenceId = Brand<string, 'RollOccurrenceId'>;
export type RollOperationPath = Brand<string, 'RollOperationPath'>;
export type RollComponentId = Brand<string, 'RollComponentId'>;
export type DrawSlotId = Brand<number, 'DrawSlotId'>;
export type DrawAttemptId = Brand<number, 'DrawAttemptId'>;

export type RollDrawRole =
  | Readonly<{ kind: 'ordinary_face'; dieIndex: number }>
  | Readonly<{ kind: 'reroll_replacement'; dieIndex: number; attempt: 1 }>
  | Readonly<{ kind: 'explosion'; dieIndex: number; explosion: 1 }>
  | Readonly<{ kind: 'd20_candidate'; candidate: 1 | 2 }>
  | Readonly<{ kind: 'branch_selection' }>;

export interface RollProvenanceRequest {
  readonly occurrenceId: RollOccurrenceId;
  readonly operationPath: RollOperationPath;
  readonly source: CombatantId | null;
  readonly targets: readonly CombatantId[];
}

export type RollComponentSpec =
  | Readonly<{ kind: 'dice_expression'; expression: DiceExpression }>
  | Readonly<{ kind: 'd20_selection'; mode: RollMode }>
  | Readonly<{ kind: 'discrete_branch'; outcomes: readonly DiscreteTotalOutcome[] }>;

export interface RollComponentRef extends RollProvenanceRequest {
  readonly componentId: RollComponentId;
  readonly execution: number;
  readonly spec: RollComponentSpec;
}

export interface DieRequest {
  readonly sides: DieSides;
  readonly provenance: RollComponentRef;
  readonly role: RollDrawRole;
}

export interface DrawRecord extends DieRequest {
  readonly face: number;
  readonly streamSlot: DrawSlotId;
  readonly attemptId: DrawAttemptId;
}

export interface ComponentTotalRecord {
  readonly component: RollComponentRef;
  readonly total: number;
  readonly drawAttempts: readonly DrawAttemptId[];
}

export interface RollbackRecord {
  readonly checkpointOrdinal: number;
  readonly revertedAttempts: readonly DrawAttemptId[];
  readonly revertedComponents: readonly RollComponentId[];
}

export type ExactFraction = Brand<Readonly<{
  readonly numerator: bigint;
  readonly denominator: bigint;
}>, 'ExactFraction'>;
export type ExactWeight = Brand<ExactFraction, 'ExactWeight'>;

export interface SlotInterval {
  readonly streamSlot: DrawSlotId;
  readonly lowerInclusive: ExactWeight;
  readonly upperExclusive: ExactWeight;
}

export interface RollTrace {
  readonly attempts: readonly DrawRecord[];
  readonly committedDraws: readonly DrawRecord[];
  readonly committedComponents: readonly ComponentTotalRecord[];
  readonly rollbacks: readonly RollbackRecord[];
  readonly slotIntervals: readonly SlotInterval[];
}

export type RollPrefix = Brand<Readonly<{
  readonly expectedAttempts: readonly DrawRecord[];
  readonly slotIntervals: readonly SlotInterval[];
}>, 'RollPrefix'>;

export interface RollSource {
  beginComponent(request: RollProvenanceRequest, spec: RollComponentSpec): RollComponentRef;
  draw(request: DieRequest): number;
  finishComponent(component: RollComponentRef, total: number): void;
}

export interface TransactionalRollRng extends TransactionalRng, RollSource {
  trace(): RollTrace;
}

export type RollProvenanceErrorCode =
  | 'anonymous_draw'
  | 'foreign_checkpoint'
  | 'stale_component'
  | 'component_already_finished'
  | 'malformed_prefix'
  | 'prefix_request_mismatch'
  | 'prefix_not_consumed'
  | 'invalid_weight'
  | 'invalid_component';

export class RollProvenanceError extends Error {
  readonly code: RollProvenanceErrorCode;

  constructor(code: RollProvenanceErrorCode, message: string) {
    super(message);
    this.name = 'RollProvenanceError';
    this.code = code;
  }
}

function bigintGcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function exactFraction(numerator: bigint, denominator: bigint): ExactFraction {
  if (denominator === 0n) throw new RollProvenanceError('invalid_weight', 'A fraction denominator cannot be zero.');
  const sign = denominator < 0n ? -1n : 1n;
  const divisor = bigintGcd(numerator, denominator);
  return {
    numerator: (numerator / divisor) * sign,
    denominator: (denominator / divisor) * sign,
  } as ExactFraction;
}

export function exactWeight(numerator: bigint, denominator: bigint): ExactWeight {
  const value = exactFraction(numerator, denominator);
  if (value.numerator < 0n) throw new RollProvenanceError('invalid_weight', 'An exact weight cannot be negative.');
  return value as ExactWeight;
}

export const ZERO_FRACTION = exactFraction(0n, 1n);
export const ONE_FRACTION = exactFraction(1n, 1n);

export function addFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  return exactFraction(
    left.numerator * right.denominator + right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function subtractFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  return exactFraction(
    left.numerator * right.denominator - right.numerator * left.denominator,
    left.denominator * right.denominator,
  );
}

export function multiplyFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  return exactFraction(left.numerator * right.numerator, left.denominator * right.denominator);
}

export function multiplyFractionInteger(value: ExactFraction, scalar: number): ExactFraction {
  if (!Number.isSafeInteger(scalar)) throw new RollProvenanceError('invalid_weight', 'Fraction scalar must be a safe integer.');
  return exactFraction(value.numerator * BigInt(scalar), value.denominator);
}

export function powerFraction(value: ExactFraction, exponent: number): ExactFraction {
  if (!Number.isSafeInteger(exponent) || exponent < 0) {
    throw new RollProvenanceError('invalid_weight', 'Fraction exponent must be a non-negative safe integer.');
  }
  return exactFraction(value.numerator ** BigInt(exponent), value.denominator ** BigInt(exponent));
}

function compareFractions(left: ExactFraction, right: ExactFraction): number {
  const difference = left.numerator * right.denominator - right.numerator * left.denominator;
  return difference < 0n ? -1 : difference > 0n ? 1 : 0;
}

function equalFractions(left: ExactFraction, right: ExactFraction): boolean {
  return left.numerator === right.numerator && left.denominator === right.denominator;
}

function divideFractions(left: ExactFraction, right: ExactFraction): ExactFraction {
  if (right.numerator === 0n) throw new RollProvenanceError('invalid_weight', 'Cannot divide by zero weight.');
  return exactFraction(left.numerator * right.denominator, left.denominator * right.numerator);
}

function assertNonemptyString(value: string, label: string): void {
  if (value.trim().length === 0) throw new RollProvenanceError('invalid_component', `${label} must be non-empty.`);
}

export function rollOccurrenceId(value: string): RollOccurrenceId {
  assertNonemptyString(value, 'Roll occurrence id');
  return value as RollOccurrenceId;
}

export function rollOperationPath(value: string): RollOperationPath {
  assertNonemptyString(value, 'Roll operation path');
  if (!value.split('/').every((segment) => segment.length > 0)) {
    throw new RollProvenanceError('invalid_component', 'Roll operation path contains an empty segment.');
  }
  return value as RollOperationPath;
}

export function rollComponentId(value: string): RollComponentId {
  assertNonemptyString(value, 'Roll component id');
  return value as RollComponentId;
}

function drawSlotId(value: number): DrawSlotId {
  if (!Number.isSafeInteger(value) || value < 0) throw new RollProvenanceError('malformed_prefix', 'Invalid draw slot.');
  return value as DrawSlotId;
}

function drawAttemptId(value: number): DrawAttemptId {
  if (!Number.isSafeInteger(value) || value < 0) throw new RollProvenanceError('malformed_prefix', 'Invalid draw attempt.');
  return value as DrawAttemptId;
}

function faceInterval(sides: DieSides, face: number): Readonly<{ lower: ExactWeight; upper: ExactWeight }> {
  if (!Number.isSafeInteger(face) || face < 1 || face > sides) {
    throw new RollProvenanceError('malformed_prefix', `Face ${String(face)} is invalid for d${String(sides)}.`);
  }
  return {
    lower: exactWeight(BigInt(face - 1), BigInt(sides)),
    upper: exactWeight(BigInt(face), BigInt(sides)),
  };
}

function intersectSlotInterval(
  lower: ExactWeight,
  upper: ExactWeight,
  requestLower: ExactWeight,
  requestUpper: ExactWeight,
): Readonly<{ lower: ExactWeight; upper: ExactWeight }> | null {
  const nextLower = compareFractions(lower, requestLower) >= 0 ? lower : requestLower;
  const nextUpper = compareFractions(upper, requestUpper) <= 0 ? upper : requestUpper;
  return compareFractions(nextLower, nextUpper) < 0 ? { lower: nextLower, upper: nextUpper } : null;
}

function cloneComponent(component: RollComponentRef): RollComponentRef {
  return { ...component, targets: [...component.targets] };
}

function cloneDraw(record: DrawRecord): DrawRecord {
  return { ...record, provenance: cloneComponent(record.provenance), role: { ...record.role } };
}

function sameJson(left: unknown, right: unknown): boolean {
  const stringify = (value: unknown): string => JSON.stringify(
    value,
    (_key, nested: unknown) => typeof nested === 'bigint' ? `${String(nested)}n` : nested,
  );
  return stringify(left) === stringify(right);
}

function canonicalIntervals(attempts: readonly DrawRecord[]): readonly SlotInterval[] {
  const bySlot = new Map<DrawSlotId, { lower: ExactWeight; upper: ExactWeight }>();
  for (const attempt of attempts) {
    const partition = faceInterval(attempt.sides, attempt.face);
    const prior = bySlot.get(attempt.streamSlot) ?? {
      lower: exactWeight(0n, 1n), upper: exactWeight(1n, 1n),
    };
    const intersection = intersectSlotInterval(prior.lower, prior.upper, partition.lower, partition.upper);
    if (intersection === null) {
      throw new RollProvenanceError('malformed_prefix', `Contradictory faces for stream slot ${String(attempt.streamSlot)}.`);
    }
    bySlot.set(attempt.streamSlot, intersection);
  }
  return [...bySlot.entries()]
    .sort(([left], [right]) => left - right)
    .map(([streamSlot, interval]) => ({
      streamSlot, lowerInclusive: interval.lower, upperExclusive: interval.upper,
    }));
}

export function emptyRollPrefix(): RollPrefix {
  return { expectedAttempts: [], slotIntervals: [] } as unknown as RollPrefix;
}

export function rollPrefix(value: Readonly<{
  readonly expectedAttempts: readonly DrawRecord[];
  readonly slotIntervals: readonly SlotInterval[];
}>): RollPrefix {
  let priorAttempt = -1;
  for (const attempt of value.expectedAttempts) {
    drawAttemptId(attempt.attemptId);
    drawSlotId(attempt.streamSlot);
    dieSides(attempt.sides);
    if (attempt.attemptId <= priorAttempt) {
      throw new RollProvenanceError('malformed_prefix', 'Expected attempt ids must be strictly increasing.');
    }
    priorAttempt = attempt.attemptId;
  }
  const canonical = canonicalIntervals(value.expectedAttempts);
  if (canonical.length !== value.slotIntervals.length) {
    throw new RollProvenanceError('malformed_prefix', 'Prefix intervals must be backed by expected attempts.');
  }
  for (let index = 0; index < canonical.length; index += 1) {
    const expected = canonical[index];
    const supplied = value.slotIntervals[index];
    if (expected === undefined || supplied === undefined || expected.streamSlot !== supplied.streamSlot ||
      !equalFractions(expected.lowerInclusive, supplied.lowerInclusive) ||
      !equalFractions(expected.upperExclusive, supplied.upperExclusive)) {
      throw new RollProvenanceError('malformed_prefix', 'Prefix interval is not the canonical face intersection.');
    }
  }
  return {
    expectedAttempts: value.expectedAttempts.map(cloneDraw),
    slotIntervals: canonical,
  } as unknown as RollPrefix;
}

export function prefixFromTrace(trace: RollTrace): RollPrefix {
  return rollPrefix({ expectedAttempts: trace.attempts, slotIntervals: trace.slotIntervals });
}

interface OpenComponent {
  readonly ref: RollComponentRef;
  readonly handleGeneration: number;
  readonly drawAttempts: DrawAttemptId[];
  finished: boolean;
}

interface ProvenanceCheckpointState {
  readonly owner: RollProvenance;
  readonly base: RngCheckpoint | null;
  readonly ordinal: number;
  readonly streamCursor: number;
  readonly committedAttemptCount: number;
  readonly committedComponentCount: number;
  readonly executionCounts: ReadonlyMap<string, number>;
  readonly open: readonly OpenComponent[];
}

class ReplayForkSignal {
  readonly request: DieRequest;
  readonly branches: readonly ReplayBranch[];

  constructor(request: DieRequest, branches: readonly ReplayBranch[]) {
    this.request = request;
    this.branches = branches;
  }
}

const provenanceCheckpoints = new WeakMap<RngCheckpoint, ProvenanceCheckpointState>();
const rollRngOwners = new WeakMap<TransactionalRollRng, RollProvenance>();

export function isTransactionalRollRng(rng: unknown): rng is TransactionalRollRng {
  return typeof rng === 'function' && rollRngOwners.has(rng as TransactionalRollRng);
}

function validateRequest(request: RollProvenanceRequest): void {
  rollOccurrenceId(request.occurrenceId);
  rollOperationPath(request.operationPath);
  if (!Array.isArray(request.targets)) throw new RollProvenanceError('invalid_component', 'Roll targets must be an array.');
}

function validateSpec(spec: RollComponentSpec): void {
  switch (spec.kind) {
    case 'dice_expression':
      validateDiceExpression(spec.expression);
      return;
    case 'd20_selection':
      return;
    case 'discrete_branch': {
      if (spec.outcomes.length === 0) throw new RollProvenanceError('invalid_component', 'A branch needs outcomes.');
      let total = ZERO_FRACTION;
      for (const outcome of spec.outcomes) {
        if (!Number.isFinite(outcome.total)) throw new RollProvenanceError('invalid_component', 'Branch total must be finite.');
        total = addFractions(total, outcome.weight);
      }
      if (!equalFractions(total, ONE_FRACTION)) {
        throw new RollProvenanceError('invalid_weight', 'Discrete branch weights must sum to one.');
      }
    }
  }
}

function validateDiceExpression(expression: DiceExpression): void {
  if (!Number.isSafeInteger(expression.count) || expression.count < 0 || !Number.isFinite(expression.modifier)) {
    throw new RollProvenanceError('invalid_component', 'Invalid dice expression count or modifier.');
  }
  dieSides(expression.sides);
  if (expression.minimumTotal !== undefined && !Number.isSafeInteger(expression.minimumTotal)) {
    throw new RollProvenanceError('invalid_component', 'Minimum total must be a safe integer.');
  }
  if (expression.maximumTotal !== undefined && !Number.isSafeInteger(expression.maximumTotal)) {
    throw new RollProvenanceError('invalid_component', 'Maximum total must be a safe integer.');
  }
  if (expression.minimumTotal !== undefined && expression.maximumTotal !== undefined &&
    expression.minimumTotal > expression.maximumTotal) {
    throw new RollProvenanceError('invalid_component', 'Minimum total cannot exceed maximum total.');
  }
  if (expression.rerollBelow !== undefined &&
    (!Number.isSafeInteger(expression.rerollBelow.threshold) || expression.rerollBelow.threshold < 2 ||
      expression.rerollBelow.threshold > expression.sides || expression.rerollBelow.maximumRerollsPerDie !== 1)) {
    throw new RollProvenanceError('invalid_component', 'Invalid reroll rule.');
  }
  if (expression.explosion !== undefined &&
    (expression.explosion.triggerFace !== 'maximum' || expression.explosion.maximumExplosionsPerDie !== 1)) {
    throw new RollProvenanceError('invalid_component', 'Invalid explosion rule.');
  }
}

export class RollProvenance {
  readonly #mode: 'recording' | 'replay';
  readonly #base: TransactionalRng | null;
  readonly #seedPrefix: RollPrefix;
  readonly #attempts: DrawRecord[] = [];
  readonly #committedAttemptIds: DrawAttemptId[] = [];
  readonly #committedComponents: ComponentTotalRecord[] = [];
  readonly #rollbacks: RollbackRecord[] = [];
  readonly #intervals = new Map<DrawSlotId, { lower: ExactWeight; upper: ExactWeight }>();
  readonly #open: OpenComponent[] = [];
  readonly #executionCounts = new Map<string, number>();
  readonly #finishedHandles = new WeakSet<RollComponentRef>();
  #streamCursor = 0;
  #expectedCursor = 0;
  #nextAttempt = 0;
  #checkpointOrdinal = 0;
  #handleGeneration = 0;
  #rng: TransactionalRollRng | null = null;

  private constructor(mode: 'recording' | 'replay', base: TransactionalRng | null, prefix: RollPrefix) {
    this.#mode = mode;
    this.#base = base;
    this.#seedPrefix = prefix;
    for (const interval of prefix.slotIntervals) {
      this.#intervals.set(interval.streamSlot, {
        lower: interval.lowerInclusive, upper: interval.upperExclusive,
      });
    }
  }

  static recording(base: TransactionalRng): RollProvenance {
    return new RollProvenance('recording', base, emptyRollPrefix());
  }

  static replay(prefix: RollPrefix): RollProvenance {
    return new RollProvenance('replay', null, rollPrefix(prefix));
  }

  asRng(): TransactionalRollRng {
    if (this.#rng !== null) return this.#rng;
    const callable = Object.assign(
      (): number => {
        throw new RollProvenanceError('anonymous_draw', 'Roll provenance RNGs require a named component draw.');
      },
      {
        beginComponent: (request: RollProvenanceRequest, spec: RollComponentSpec): RollComponentRef =>
          this.#beginComponent(request, spec),
        draw: (request: DieRequest): number => this.#draw(request),
        finishComponent: (component: RollComponentRef, total: number): void =>
          this.#finishComponent(component, total),
        checkpoint: (): RngCheckpoint => this.#checkpoint(),
        restoreCheckpoint: (checkpoint: RngCheckpoint): void => this.#restore(checkpoint),
        trace: (): RollTrace => this.trace(),
      },
    );
    this.#rng = callable;
    rollRngOwners.set(callable, this);
    return callable;
  }

  trace(): RollTrace {
    const byId = new Map(this.#attempts.map((attempt) => [attempt.attemptId, attempt]));
    return {
      attempts: this.#attempts.map(cloneDraw),
      committedDraws: this.#committedAttemptIds.map((id) => byId.get(id)).filter(
        (record): record is DrawRecord => record !== undefined,
      ).map(cloneDraw),
      committedComponents: this.#committedComponents.map((record) => ({
        component: cloneComponent(record.component), total: record.total, drawAttempts: [...record.drawAttempts],
      })),
      rollbacks: this.#rollbacks.map((record) => ({
        checkpointOrdinal: record.checkpointOrdinal,
        revertedAttempts: [...record.revertedAttempts],
        revertedComponents: [...record.revertedComponents],
      })),
      slotIntervals: [...this.#intervals.entries()].sort(([left], [right]) => left - right).map(
        ([streamSlot, interval]) => ({
          streamSlot, lowerInclusive: interval.lower, upperExclusive: interval.upper,
        }),
      ),
    };
  }

  #beginComponent(request: RollProvenanceRequest, spec: RollComponentSpec): RollComponentRef {
    validateRequest(request);
    validateSpec(spec);
    const identity = `${request.occurrenceId}:${request.operationPath}`;
    const execution = (this.#executionCounts.get(identity) ?? 0) + 1;
    this.#executionCounts.set(identity, execution);
    const ref: RollComponentRef = {
      ...request,
      targets: [...request.targets],
      componentId: rollComponentId(identity),
      execution,
      spec,
    };
    this.#open.push({ ref, handleGeneration: this.#handleGeneration, drawAttempts: [], finished: false });
    return ref;
  }

  #findOpen(component: RollComponentRef): OpenComponent {
    if (this.#finishedHandles.has(component)) {
      throw new RollProvenanceError('component_already_finished', 'The roll component is already finished.');
    }
    const open = this.#open.find((entry) => entry.ref === component);
    if (open === undefined || open.handleGeneration > this.#handleGeneration) {
      throw new RollProvenanceError('stale_component', 'The roll component is stale or foreign.');
    }
    if (open.finished) throw new RollProvenanceError('component_already_finished', 'The roll component is already finished.');
    return open;
  }

  #draw(request: DieRequest): number {
    const component = this.#findOpen(request.provenance);
    dieSides(request.sides);
    const streamSlot = drawSlotId(this.#streamCursor);
    this.#streamCursor += 1;
    let face: number;
    if (this.#mode === 'recording') {
      if (this.#base === null) throw new RollProvenanceError('invalid_component', 'Recording base is absent.');
      const scalar = this.#base();
      face = Math.floor(scalar * request.sides) + 1;
      const partition = faceInterval(request.sides, face);
      const prior = this.#intervals.get(streamSlot) ?? { lower: exactWeight(0n, 1n), upper: exactWeight(1n, 1n) };
      const intersection = intersectSlotInterval(prior.lower, prior.upper, partition.lower, partition.upper);
      if (intersection === null) throw new RollProvenanceError('prefix_request_mismatch', 'Restored scalar violates its slot interval.');
      this.#intervals.set(streamSlot, intersection);
    } else {
      const expected = this.#seedPrefix.expectedAttempts[this.#expectedCursor];
      if (expected !== undefined) {
        if (expected.streamSlot !== streamSlot || expected.sides !== request.sides ||
          !sameJson(expected.provenance, request.provenance) || !sameJson(expected.role, request.role)) {
          throw new RollProvenanceError('prefix_request_mismatch', 'Replay draw request does not match the prefix.');
        }
        face = expected.face;
        this.#expectedCursor += 1;
      } else {
        const prior = this.#intervals.get(streamSlot) ?? {
          lower: exactWeight(0n, 1n), upper: exactWeight(1n, 1n),
        };
        const candidates: Array<{ face: number; lower: ExactWeight; upper: ExactWeight }> = [];
        for (let candidate = 1; candidate <= request.sides; candidate += 1) {
          const partition = faceInterval(request.sides, candidate);
          const intersection = intersectSlotInterval(prior.lower, prior.upper, partition.lower, partition.upper);
          if (intersection !== null) candidates.push({ face: candidate, ...intersection });
        }
        if (candidates.length !== 1) {
          const priorWidth = subtractFractions(prior.upper, prior.lower);
          const attemptId = drawAttemptId(this.#nextAttempt);
          const branches = candidates.map((candidate): ReplayBranch => {
            const record: DrawRecord = {
              ...request, face: candidate.face, streamSlot, attemptId,
              provenance: cloneComponent(request.provenance), role: { ...request.role },
            };
            const attempts = [...this.#attempts, record];
            return {
              prefix: rollPrefix({ expectedAttempts: attempts, slotIntervals: canonicalIntervals(attempts) }),
              face: candidate.face,
              conditionalWeight: divideFractions(
                subtractFractions(candidate.upper, candidate.lower), priorWidth,
              ) as ExactWeight,
            };
          });
          throw new ReplayForkSignal(request, branches);
        }
        const only = candidates[0];
        if (only === undefined) throw new RollProvenanceError('prefix_request_mismatch', 'No face intersects the slot.');
        face = only.face;
        this.#intervals.set(streamSlot, { lower: only.lower, upper: only.upper });
      }
    }
    const attemptId = drawAttemptId(this.#nextAttempt);
    this.#nextAttempt += 1;
    const record: DrawRecord = {
      ...request, face, streamSlot, attemptId,
      provenance: cloneComponent(request.provenance), role: { ...request.role },
    };
    this.#attempts.push(record);
    this.#committedAttemptIds.push(attemptId);
    component.drawAttempts.push(attemptId);
    return face;
  }

  #finishComponent(component: RollComponentRef, total: number): void {
    const open = this.#findOpen(component);
    if (!Number.isFinite(total)) throw new RollProvenanceError('invalid_component', 'Component total must be finite.');
    const top = this.#open.at(-1);
    if (top !== open) throw new RollProvenanceError('invalid_component', 'Components must finish in stack order.');
    open.finished = true;
    this.#open.pop();
    this.#finishedHandles.add(component);
    this.#committedComponents.push({ component: cloneComponent(component), total, drawAttempts: [...open.drawAttempts] });
  }

  #checkpoint(): RngCheckpoint {
    const checkpoint: RngCheckpoint = { restore: (): void => this.#restore(checkpoint) };
    const snapshot: ProvenanceCheckpointState = {
      owner: this,
      base: this.#base?.checkpoint() ?? null,
      ordinal: this.#checkpointOrdinal,
      streamCursor: this.#streamCursor,
      committedAttemptCount: this.#committedAttemptIds.length,
      committedComponentCount: this.#committedComponents.length,
      executionCounts: new Map(this.#executionCounts),
      open: this.#open.map((entry) => ({
        ref: entry.ref, handleGeneration: entry.handleGeneration, drawAttempts: [...entry.drawAttempts], finished: entry.finished,
      })),
    };
    this.#checkpointOrdinal += 1;
    provenanceCheckpoints.set(checkpoint, snapshot);
    return checkpoint;
  }

  #restore(checkpoint: RngCheckpoint): void {
    const snapshot = provenanceCheckpoints.get(checkpoint);
    if (snapshot === undefined || snapshot.owner !== this) {
      throw new RollProvenanceError('foreign_checkpoint', 'Checkpoint belongs to another roll provenance owner.');
    }
    if (snapshot.base !== null && this.#base !== null) this.#base.restoreCheckpoint(snapshot.base);
    const revertedAttempts = this.#committedAttemptIds.slice(snapshot.committedAttemptCount);
    const revertedComponents = this.#committedComponents.slice(snapshot.committedComponentCount)
      .map((record) => record.component.componentId);
    this.#streamCursor = snapshot.streamCursor;
    this.#committedAttemptIds.length = snapshot.committedAttemptCount;
    this.#committedComponents.length = snapshot.committedComponentCount;
    this.#executionCounts.clear();
    for (const [key, value] of snapshot.executionCounts) this.#executionCounts.set(key, value);
    this.#handleGeneration += 1;
    this.#open.length = 0;
    for (const entry of snapshot.open) {
      this.#finishedHandles.delete(entry.ref);
      this.#open.push({
        ref: entry.ref, handleGeneration: this.#handleGeneration,
        drawAttempts: [...entry.drawAttempts], finished: entry.finished,
      });
    }
    this.#rollbacks.push({ checkpointOrdinal: snapshot.ordinal, revertedAttempts, revertedComponents });
  }

  assertPrefixConsumed(): void {
    if (this.#mode === 'replay' && this.#expectedCursor !== this.#seedPrefix.expectedAttempts.length) {
      throw new RollProvenanceError('prefix_not_consumed', 'Replay completed before consuming every expected attempt.');
    }
  }
}

export interface ReplayBranch {
  readonly prefix: RollPrefix;
  readonly face: number;
  readonly conditionalWeight: ExactWeight;
}

export type ExplorationStep<T> =
  | Readonly<{ kind: 'complete'; value: T; trace: RollTrace }>
  | Readonly<{ kind: 'fork'; request: DieRequest; branches: readonly ReplayBranch[] }>;

export function replayPrefix<T>(
  prefix: RollPrefix,
  run: (rolls: TransactionalRollRng) => T,
): ExplorationStep<T> {
  const owner = RollProvenance.replay(prefix);
  try {
    const value = run(owner.asRng());
    owner.assertPrefixConsumed();
    return { kind: 'complete', value, trace: owner.trace() };
  } catch (error) {
    if (error instanceof ReplayForkSignal) return { kind: 'fork', request: error.request, branches: error.branches };
    throw error;
  }
}

export interface ExplorationBudget {
  readonly maximumNodes: number;
  readonly maximumDepth: number;
}

export interface ExplorationSeed {
  readonly prefix: RollPrefix;
  readonly incomingWeight: ExactWeight;
  readonly depth: number;
}

export function explorationSeed(prefix: RollPrefix, incomingWeight: ExactWeight, depth: number): ExplorationSeed {
  if (!Number.isSafeInteger(depth) || depth < 0) throw new RollProvenanceError('invalid_weight', 'Depth must be non-negative.');
  return { prefix: rollPrefix(prefix), incomingWeight: exactWeight(incomingWeight.numerator, incomingWeight.denominator), depth };
}

export interface WeightedCompletion<T> {
  readonly value: T;
  readonly trace: RollTrace;
  readonly weight: ExactWeight;
}

export type ExplorationResult<T> =
  | Readonly<{
      kind: 'complete'; inputWeight: ExactWeight; leaves: readonly WeightedCompletion<T>[];
      resolvedWeight: ExactWeight;
    }>
  | Readonly<{
      kind: 'incomplete'; reason: 'node_budget' | 'depth_budget'; inputWeight: ExactWeight;
      leaves: readonly WeightedCompletion<T>[]; pending: readonly ExplorationSeed[];
      resolvedWeight: ExactWeight; unresolvedWeight: ExactWeight;
    }>;

export function exploreRolls<T>(
  run: (rolls: TransactionalRollRng) => T,
  budget: ExplorationBudget,
  seed: ExplorationSeed = explorationSeed(emptyRollPrefix(), exactWeight(1n, 1n), 0),
): ExplorationResult<T> {
  if (!Number.isSafeInteger(budget.maximumNodes) || budget.maximumNodes < 1 ||
    !Number.isSafeInteger(budget.maximumDepth) || budget.maximumDepth < seed.depth) {
    throw new RollProvenanceError('invalid_weight', 'Exploration budget is invalid.');
  }
  const queue: ExplorationSeed[] = [seed];
  const leaves: WeightedCompletion<T>[] = [];
  let visited = 0;
  let depthLimited = false;
  while (queue.length > 0 && visited < budget.maximumNodes) {
    const current = queue.shift();
    if (current === undefined) break;
    if (current.depth >= budget.maximumDepth) {
      queue.push(current);
      depthLimited = true;
      break;
    }
    visited += 1;
    const step = replayPrefix(current.prefix, run);
    if (step.kind === 'complete') {
      leaves.push({ value: step.value, trace: step.trace, weight: current.incomingWeight });
      continue;
    }
    for (const branch of step.branches) {
      queue.push(explorationSeed(
        branch.prefix,
        multiplyFractions(current.incomingWeight, branch.conditionalWeight) as ExactWeight,
        current.depth + 1,
      ));
    }
  }
  const resolvedWeight = leaves.reduce(
    (sum, leaf) => addFractions(sum, leaf.weight), ZERO_FRACTION,
  ) as ExactWeight;
  if (queue.length === 0) return { kind: 'complete', inputWeight: seed.incomingWeight, leaves, resolvedWeight };
  const unresolvedWeight = queue.reduce(
    (sum, pending) => addFractions(sum, pending.incomingWeight), ZERO_FRACTION,
  ) as ExactWeight;
  return {
    kind: 'incomplete', reason: depthLimited ? 'depth_budget' : 'node_budget',
    inputWeight: seed.incomingWeight, leaves, pending: queue, resolvedWeight, unresolvedWeight,
  };
}

export interface DiscreteTotalOutcome {
  readonly total: number;
  readonly weight: ExactWeight;
}

export interface ExactTotalDistribution {
  readonly componentIds: readonly RollComponentId[];
  readonly outcomes: readonly DiscreteTotalOutcome[];
}

function groupOutcomes(outcomes: readonly DiscreteTotalOutcome[]): readonly DiscreteTotalOutcome[] {
  const grouped = new Map<number, ExactFraction>();
  for (const outcome of outcomes) grouped.set(
    outcome.total,
    addFractions(grouped.get(outcome.total) ?? ZERO_FRACTION, outcome.weight),
  );
  return [...grouped.entries()].sort(([left], [right]) => left - right).map(
    ([total, weight]) => ({ total, weight: weight as ExactWeight }),
  );
}

function singleDieOutcomes(expression: DiceExpression): readonly DiscreteTotalOutcome[] {
  const outcomes: DiscreteTotalOutcome[] = [];
  const sideWeight = exactWeight(1n, BigInt(expression.sides));
  for (let first = 1; first <= expression.sides; first += 1) {
    const replacements = expression.rerollBelow !== undefined && first < expression.rerollBelow.threshold
      ? Array.from({ length: expression.sides }, (_, index) => index + 1)
      : [first];
    for (const replacement of replacements) {
      const baseWeight = replacements.length === 1 ? sideWeight : multiplyFractions(sideWeight, sideWeight) as ExactWeight;
      if (expression.explosion?.triggerFace === 'maximum' && replacement === expression.sides) {
        for (let explosion = 1; explosion <= expression.sides; explosion += 1) {
          outcomes.push({
            total: replacement + explosion,
            weight: multiplyFractions(baseWeight, sideWeight) as ExactWeight,
          });
        }
      } else {
        outcomes.push({ total: replacement, weight: baseWeight });
      }
    }
  }
  return groupOutcomes(outcomes);
}

function convolveOutcomeLists(
  left: readonly DiscreteTotalOutcome[],
  right: readonly DiscreteTotalOutcome[],
): readonly DiscreteTotalOutcome[] {
  return groupOutcomes(left.flatMap((leftOutcome) => right.map((rightOutcome) => ({
    total: leftOutcome.total + rightOutcome.total,
    weight: multiplyFractions(leftOutcome.weight, rightOutcome.weight) as ExactWeight,
  }))));
}

export function componentTotals(componentId: RollComponentId, spec: RollComponentSpec): ExactTotalDistribution {
  validateSpec(spec);
  let outcomes: readonly DiscreteTotalOutcome[];
  switch (spec.kind) {
    case 'discrete_branch':
      outcomes = groupOutcomes(spec.outcomes);
      break;
    case 'd20_selection': {
      const raw: DiscreteTotalOutcome[] = [];
      const candidates = spec.mode === 'normal' ? 1 : 2;
      const denominator = 20n ** BigInt(candidates);
      for (let first = 1; first <= 20; first += 1) {
        if (candidates === 1) raw.push({ total: first, weight: exactWeight(1n, denominator) });
        else for (let second = 1; second <= 20; second += 1) raw.push({
          total: spec.mode === 'advantage' ? Math.max(first, second) : Math.min(first, second),
          weight: exactWeight(1n, denominator),
        });
      }
      outcomes = groupOutcomes(raw);
      break;
    }
    case 'dice_expression': {
      let current: readonly DiscreteTotalOutcome[] = [{ total: 0, weight: exactWeight(1n, 1n) }];
      const oneDie = singleDieOutcomes(spec.expression);
      for (let index = 0; index < spec.expression.count; index += 1) {
        current = convolveOutcomeLists(current, oneDie);
      }
      outcomes = groupOutcomes(current.map((outcome) => ({
        total: Math.min(
          spec.expression.maximumTotal ?? Number.POSITIVE_INFINITY,
          Math.max(spec.expression.minimumTotal ?? Number.NEGATIVE_INFINITY, outcome.total + spec.expression.modifier),
        ),
        weight: outcome.weight,
      })));
      break;
    }
  }
  return { componentIds: [componentId], outcomes };
}

export function convolveIndependentDistributions(
  left: ExactTotalDistribution,
  right: ExactTotalDistribution,
): ExactTotalDistribution {
  const identities = new Set(left.componentIds);
  if (right.componentIds.some((id) => identities.has(id))) {
    throw new RollProvenanceError('invalid_component', 'Independent distributions cannot share component ids.');
  }
  return {
    componentIds: [...left.componentIds, ...right.componentIds],
    outcomes: convolveOutcomeLists(left.outcomes, right.outcomes),
  };
}
