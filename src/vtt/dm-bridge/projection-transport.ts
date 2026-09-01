import { canonicalJson } from '../../commands/canonical-json';
import { sha256 } from '../../crypto/sha256';
import type { EncounterSessionId } from '../../combat/values';
import type { DmBoardProjection } from '../encounter-projections';
import type { DmBridgeRequest } from './contracts';

export type ProjectionTransportMode =
  | 'full'
  | 'verified_full'
  | 'compact_lossless'
  | 'revision_delta';

export type RevisionDeltaOperation =
  | {
      readonly kind: 'set';
      readonly path: readonly string[];
      readonly value: unknown;
    }
  | {
      readonly kind: 'delete';
      readonly path: readonly string[];
    };

export type ProjectionDeltaOperation = RevisionDeltaOperation;

type CompactProjectionView =
  Omit<DmBoardProjection, 'audience' | 'history' | 'coordinator'> & {
    readonly coordinator: Omit<DmBoardProjection['coordinator'], 'pendingRequest'>;
  };

export type ProjectionTransfer =
  | {
      readonly kind: 'full_projection';
      readonly revision: number;
      readonly stateHash: string;
      readonly projection: DmBoardProjection;
    }
  | {
      readonly kind: 'compact_projection';
      readonly revision: number;
      readonly stateHash: string;
      readonly projectionFields: readonly string[];
      readonly view: CompactProjectionView;
    }
  | {
      readonly kind: 'projection_delta';
      readonly baseRevision: number;
      readonly baseHash: string;
      readonly revision: number;
      readonly stateHash: string;
      readonly operations: readonly ProjectionDeltaOperation[];
    };

export interface ProjectionTransportTelemetry {
  readonly bytesSent: number;
  readonly snapshotBytes: number;
  readonly deltaBytes: number;
  readonly fullSnapshots: number;
  readonly deltaSnapshots: number;
  readonly reconstructionFailures: number;
}

type ProjectionRequest = Extract<DmBridgeRequest, { readonly projection: DmBoardProjection }>;
type WireProjectionRequest<Request extends ProjectionRequest = ProjectionRequest> =
  Request extends ProjectionRequest
    ? Omit<Request, 'projection'> & { readonly projectionTransfer: ProjectionTransfer }
    : never;

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function projectionHash(projection: DmBoardProjection): string {
  return sha256(canonicalJson(projection));
}

function assertProjectionFields(
  projection: DmBoardProjection,
  expectedFields: readonly string[],
): void {
  const actualFields = Object.keys(projection);
  const missing = expectedFields.filter((field) => !(field in projection));
  const unexpected = actualFields.filter((field) => !expectedFields.includes(field));
  if (missing.length === 0 && unexpected.length === 0) return;
  throw new TypeError(
    `Compact projection field mismatch; missing: ${missing.join(', ') || 'none'}; ` +
    `unexpected: ${unexpected.join(', ') || 'none'}.`,
  );
}

function diffValues(
  before: unknown,
  after: unknown,
  path: readonly string[] = [],
  granularArrays = false,
): readonly RevisionDeltaOperation[] {
  if (canonicalJson(before) === canonicalJson(after)) return [];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (!granularArrays) {
      return [{ kind: 'set', path, value: structuredClone(after) }];
    }
    const shared = Math.min(before.length, after.length);
    const changed = before.slice(0, shared).flatMap((value, index) =>
      diffValues(value, after[index], [...path, String(index)], true));
    const removed = Array.from({ length: Math.max(0, before.length - after.length) }, (_value, index) => ({
      kind: 'delete' as const,
      path: [...path, String(before.length - index - 1)],
    }));
    const inserted = after.slice(shared).map((value, index) => ({
      kind: 'set' as const,
      path: [...path, String(shared + index)],
      value: structuredClone(value),
    }));
    return [...changed, ...removed, ...inserted];
  }
  if (!isRecord(before) || !isRecord(after)) {
    return [{ kind: 'set', path, value: structuredClone(after) }];
  }
  const operations: RevisionDeltaOperation[] = [];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    if (!(key in after)) {
      operations.push({ kind: 'delete', path: [...path, key] });
    } else if (!(key in before)) {
      operations.push({ kind: 'set', path: [...path, key], value: structuredClone(after[key]) });
    } else {
      operations.push(...diffValues(before[key], after[key], [...path, key], granularArrays));
    }
  }
  return operations;
}

export function diffRevisionValues(
  before: unknown,
  after: unknown,
  path: readonly string[] = [],
): readonly RevisionDeltaOperation[] {
  return diffValues(before, after, path);
}

export function diffTurnContextValues(
  before: unknown,
  after: unknown,
): readonly RevisionDeltaOperation[] {
  return diffValues(before, after, [], true);
}

function mutableContainer(value: unknown, label: string): Record<string, unknown> | unknown[] {
  if (!isRecord(value) && !Array.isArray(value)) throw new TypeError(`${label} is not a container.`);
  return value as Record<string, unknown> | unknown[];
}

function containerValue(container: Record<string, unknown> | unknown[], segment: string): unknown {
  if (!Array.isArray(container)) return container[segment];
  const index = Number(segment);
  if (!Number.isSafeInteger(index) || index < 0 || index >= container.length) {
    throw new TypeError('Revision delta array index is invalid.');
  }
  return container[index];
}

function applyOperation(
  root: Record<string, unknown>,
  operation: RevisionDeltaOperation,
): void {
  if (operation.path.length === 0) throw new TypeError('Projection delta cannot replace or delete its root.');
  let parent: Record<string, unknown> | unknown[] = root;
  for (const segment of operation.path.slice(0, -1)) {
    parent = mutableContainer(containerValue(parent, segment), 'Revision delta path');
  }
  const leaf = operation.path.at(-1);
  if (leaf === undefined) throw new TypeError('Projection delta path is empty.');
  const key: string | number = Array.isArray(parent) ? Number(leaf) : leaf;
  if (Array.isArray(parent)) {
    const index = Number(leaf);
    const maximum = operation.kind === 'set' ? parent.length : parent.length - 1;
    if (!Number.isSafeInteger(index) || index < 0 || index > maximum) {
      throw new TypeError('Revision delta array index is invalid.');
    }
  }
  switch (operation.kind) {
    case 'set':
      Reflect.set(parent, key, structuredClone(operation.value));
      break;
    case 'delete':
      if (Array.isArray(parent)) parent.splice(Number(leaf), 1);
      else delete parent[leaf];
      break;
  }
}

export function applyRevisionDelta<T extends Readonly<Record<string, unknown>>>(
  base: T,
  operations: readonly RevisionDeltaOperation[],
): T {
  const candidate = mutableContainer(structuredClone(base), 'Revision delta base');
  if (Array.isArray(candidate)) throw new TypeError('Revision delta base must be an object.');
  for (const operation of operations) applyOperation(candidate, operation);
  return candidate as T;
}

interface StoredProjection {
  readonly revision: number;
  readonly hash: string;
  readonly projection: DmBoardProjection;
}

export class ProjectionTransferSender {
  readonly #sent = new Map<EncounterSessionId, StoredProjection>();

  encode(request: ProjectionRequest, forceFull = false): WireProjectionRequest {
    const current: StoredProjection = {
      revision: request.projection.encounter.revision,
      hash: projectionHash(request.projection),
      projection: structuredClone(request.projection),
    };
    const previous = this.#sent.get(request.encounterId);
    const transfer: ProjectionTransfer = forceFull || previous === undefined
      ? {
          kind: 'full_projection',
          revision: current.revision,
          stateHash: current.hash,
          projection: current.projection,
        }
      : {
          kind: 'projection_delta',
          baseRevision: previous.revision,
          baseHash: previous.hash,
          revision: current.revision,
          stateHash: current.hash,
          operations: diffRevisionValues(previous.projection, current.projection),
        };
    this.#sent.set(request.encounterId, current);
    const { projection: _projection, ...rest } = request;
    return { ...rest, projectionTransfer: transfer } as WireProjectionRequest;
  }

  encodeCompact(request: ProjectionRequest): WireProjectionRequest {
    const { history: _projectionHistory, audience: _audience, ...projection } = request.projection;
    const { pendingRequest: _coordinatorPendingRequest, ...coordinator } = projection.coordinator;
    const transfer: ProjectionTransfer = {
      kind: 'compact_projection',
      revision: projection.encounter.revision,
      stateHash: projectionHash(request.projection),
      projectionFields: Object.keys(request.projection).sort(),
      view: {
        ...structuredClone(projection),
        coordinator: structuredClone(coordinator),
      },
    };
    const { projection: _projection, ...rest } = request;
    return { ...rest, projectionTransfer: transfer } as WireProjectionRequest;
  }
}

export type ProjectionReconstruction =
  | { readonly kind: 'reconstructed'; readonly request: DmBridgeRequest }
  | {
      readonly kind: 'full_projection_required';
      readonly encounterId: EncounterSessionId;
      readonly expectedRevision: number;
    };

export class ProjectionTransferReceiver {
  readonly #received = new Map<EncounterSessionId, StoredProjection>();
  #failures = 0;

  reconstruct(request: WireProjectionRequest): ProjectionReconstruction {
    const transfer = request.projectionTransfer;
    if (request.expectedRevision !== transfer.revision) {
      throw new TypeError('Projection transfer revision disagrees with the bridge request.');
    }
    let projection: DmBoardProjection;
    if (transfer.kind === 'full_projection') {
      projection = structuredClone(transfer.projection);
    } else if (transfer.kind === 'compact_projection') {
      const view = structuredClone(transfer.view);
      projection = {
        ...view,
        audience: 'dm',
        coordinator: {
          ...view.coordinator,
          pendingRequest: view.pendingRequest,
        },
        history: structuredClone(request.history),
      };
      assertProjectionFields(projection, transfer.projectionFields);
    } else {
      const previous = this.#received.get(request.encounterId);
      if (
        previous === undefined ||
        previous.revision !== transfer.baseRevision ||
        previous.hash !== transfer.baseHash
      ) {
        this.#failures += 1;
        return {
          kind: 'full_projection_required',
          encounterId: request.encounterId,
          expectedRevision: transfer.revision,
        };
      }
      projection = applyRevisionDelta(
        previous.projection as unknown as Readonly<Record<string, unknown>>,
        transfer.operations,
      ) as unknown as DmBoardProjection;
    }
    const actualHash = projectionHash(projection);
    if (actualHash !== transfer.stateHash || projection.encounter.revision !== transfer.revision) {
      this.#failures += 1;
      return {
        kind: 'full_projection_required',
        encounterId: request.encounterId,
        expectedRevision: transfer.revision,
      };
    }
    this.#received.set(request.encounterId, {
      revision: transfer.revision,
      hash: transfer.stateHash,
      projection: structuredClone(projection),
    });
    const { projectionTransfer: _projectionTransfer, ...rest } = request;
    return {
      kind: 'reconstructed',
      request: { ...rest, projection } as DmBridgeRequest,
    };
  }

  reconstructionFailures(): number {
    return this.#failures;
  }
}

export const projectionTransportInternals = {
  applyOperation,
  assertProjectionFields,
  delta: diffRevisionValues,
  projectionHash,
};
