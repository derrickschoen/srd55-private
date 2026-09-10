import type { EngineCatalogEvidence, EngineDispatchId } from './agent-session';
import type { TurnContextDelivery } from './turn-context-delivery';

export interface D569DispatchIntegrityArtifact {
  readonly version: 1;
  readonly kind: 'dispatch_integrity_indeterminate';
  readonly scheduledCellKey: string;
  readonly dispatchId: EngineDispatchId;
  readonly launcherSha256: string;
  readonly processEvidenceSha256: string;
  readonly catalogEvidence: Extract<EngineCatalogEvidence, { readonly status: 'inconclusive' }>;
  readonly delivery: Extract<TurnContextDelivery, { readonly status: 'delivered' | 'indeterminate' }>;
  readonly contextSpool: { readonly recordCount: number; readonly sha256: string };
  readonly proposalSpool: {
    readonly recordCount: number;
    readonly sha256: string;
    readonly stagedUnconsumed: true;
  };
  readonly recordedAtUnixMs: number;
}

export class D569IntegrityStop extends Error {
  override readonly name = 'D569IntegrityStop' as const;
}
