import type { CatalogDataMigrationMarkerDisagreementError } from '../catalog/catalog-data-migrations-errors';
import type { JsonValue } from '../domain/models';

/**
 * WHY the worker booted degraded, by type, on BOTH sides of the worker
 * boundary.
 *
 * The worker decides the reason once (`DatabaseBoot` in
 * `src/worker/boot.ts`). The main thread needs the same reason to render a
 * remedy the owner can act on — a stale catalog marker is recovered by a reset
 * the owner accepted in pre-alpha (D923 Q11), and a "Failed: …" line with no
 * action is not a recovery path. A structured clone keeps only JSON across
 * that boundary, so the reason travels as RpcError `data` in the wire shape
 * below and is DECODED back into this type, never read as prose.
 *
 * `catalog_data_marker_disagreement`: the image ran a catalog data migration
 * whose frozen sources this build changed. The remedy is stated —
 * `system.reset`, after an optional `system.exportDatabase`.
 * `image_rejected`: any other refusal of the stored image. Its recovery pair
 * is the same two methods; only the explanation differs.
 */
export type DegradedBootReason =
  | {
      readonly kind: 'catalog_data_marker_disagreement';
      readonly migrationId: string;
      readonly remedy: DegradedBootRemedy;
    }
  | { readonly kind: 'image_rejected' };

export type DegradedBootRemedy = CatalogDataMigrationMarkerDisagreementError['remedy'];

/**
 * Typed against the error's own literal, so a remedy renamed on the error
 * fails to compile here rather than silently decoding nothing.
 */
const RESET_LOCAL_DATABASE: DegradedBootRemedy = 'reset_local_database';

/** The JSON form a degraded rejection carries as its RpcError `data`. */
export type DegradedBootReasonData =
  | {
      readonly reason: 'catalog_data_marker_disagreement';
      readonly migration_id: string;
      readonly remedy: DegradedBootRemedy;
    }
  | { readonly reason: 'image_rejected' };

export function degradedBootReasonData(
  reason: DegradedBootReason,
): DegradedBootReasonData {
  switch (reason.kind) {
    case 'catalog_data_marker_disagreement':
      return {
        reason: reason.kind,
        migration_id: reason.migrationId,
        remedy: reason.remedy,
      };
    case 'image_rejected':
      return { reason: reason.kind };
  }
}

/**
 * The reason a `schema_mismatch` rejection carries, or `null` when its `data`
 * is not exactly one of the wire shapes above.
 *
 * Strict on purpose: the main thread offers a DESTRUCTIVE action on the
 * strength of this value, so anything it cannot read exactly — a missing
 * marker id, an unknown remedy, an extra key — is not a reason, and the boot
 * falls back to the generic failure presentation with its detail intact.
 */
export function decodeDegradedBootReason(
  data: JsonValue | undefined,
): DegradedBootReason | null {
  if (data === undefined || data === null || typeof data !== 'object' || Array.isArray(data)) {
    return null;
  }
  const record: { readonly [key: string]: JsonValue } = data;
  const keys = Object.keys(record);
  switch (record.reason) {
    case 'catalog_data_marker_disagreement': {
      const migrationId = record.migration_id;
      if (
        keys.length !== 3 ||
        typeof migrationId !== 'string' ||
        migrationId.trim() === '' ||
        record.remedy !== RESET_LOCAL_DATABASE
      ) {
        return null;
      }
      return {
        kind: 'catalog_data_marker_disagreement',
        migrationId,
        remedy: RESET_LOCAL_DATABASE,
      };
    }
    case 'image_rejected':
      return keys.length === 1 ? { kind: 'image_rejected' } : null;
    default:
      return null;
  }
}
