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

export type ProjectionDeltaOperation =
  | {
      readonly kind: 'set';
      readonly path: readonly string[];
      readonly value: unknown;
    }
  | {
      readonly kind: 'delete';
      readonly path: readonly string[];
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
      readonly view: {
        readonly encounter: DmBoardProjection['encounter'];
        readonly board: DmBoardProjection['board'];
        readonly coordinator: Omit<DmBoardProjection['coordinator'], 'pendingRequest'>;
        readonly pendingRequest: DmBoardProjection['pendingRequest'];
        readonly humanCommandActions: DmBoardProjection['humanCommandActions'];
        readonly controllers: DmBoardProjection['controllers'];
        readonly adjudicatedTargets: DmBoardProjection['adjudicatedTargets'];
        readonly partySession: DmBoardProjection['partySession'];
        readonly decisionTray: DmBoardProjection['decisionTray'];
      };
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

function delta(
  before: unknown,
  after: unknown,
  path: readonly string[] = [],
): readonly ProjectionDeltaOperation[] {
  if (canonicalJson(before) === canonicalJson(after)) return [];
  if (!isRecord(before) || !isRecord(after)) {
    return [{ kind: 'set', path, value: structuredClone(after) }];
  }
  const operations: ProjectionDeltaOperation[] = [];
  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].sort();
  for (const key of keys) {
    if (!(key in after)) {
      operations.push({ kind: 'delete', path: [...path, key] });
    } else if (!(key in before)) {
      operations.push({ kind: 'set', path: [...path, key], value: structuredClone(after[key]) });
    } else {
      operations.push(...delta(before[key], after[key], [...path, key]));
    }
  }
  return operations;
}

function mutableRecord(value: unknown, label: string): Record<string, unknown> {
  if (!isRecord(value)) throw new TypeError(`${label} is not an object.`);
  return value as Record<string, unknown>;
}

function applyOperation(root: Record<string, unknown>, operation: ProjectionDeltaOperation): void {
  if (operation.path.length === 0) throw new TypeError('Projection delta cannot replace or delete its root.');
  let parent = root;
  for (const segment of operation.path.slice(0, -1)) {
    parent = mutableRecord(parent[segment], 'Projection delta path');
  }
  const leaf = operation.path.at(-1);
  if (leaf === undefined) throw new TypeError('Projection delta path is empty.');
  switch (operation.kind) {
    case 'set':
      parent[leaf] = structuredClone(operation.value);
      break;
    case 'delete':
      delete parent[leaf];
      break;
  }
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
          operations: delta(previous.projection, current.projection),
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
      view: {
        encounter: structuredClone(projection.encounter),
        board: structuredClone(projection.board),
        coordinator: structuredClone(coordinator),
        pendingRequest: structuredClone(projection.pendingRequest),
        humanCommandActions: structuredClone(projection.humanCommandActions),
        controllers: structuredClone(projection.controllers),
        adjudicatedTargets: structuredClone(projection.adjudicatedTargets),
        partySession: structuredClone(projection.partySession),
        decisionTray: structuredClone(projection.decisionTray),
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
      projection = {
        audience: 'dm',
        encounter: structuredClone(transfer.view.encounter),
        board: structuredClone(transfer.view.board),
        coordinator: {
          ...structuredClone(transfer.view.coordinator),
          pendingRequest: structuredClone(transfer.view.pendingRequest),
        },
        pendingRequest: structuredClone(transfer.view.pendingRequest),
        humanCommandActions: structuredClone(transfer.view.humanCommandActions),
        controllers: structuredClone(transfer.view.controllers),
        history: structuredClone(request.history),
        adjudicatedTargets: structuredClone(transfer.view.adjudicatedTargets),
        partySession: structuredClone(transfer.view.partySession),
        decisionTray: structuredClone(transfer.view.decisionTray),
      };
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
      const candidate = mutableRecord(structuredClone(previous.projection), 'Stored projection');
      for (const operation of transfer.operations) applyOperation(candidate, operation);
      projection = candidate as unknown as DmBoardProjection;
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

export const projectionTransportInternals = { applyOperation, delta, projectionHash };
