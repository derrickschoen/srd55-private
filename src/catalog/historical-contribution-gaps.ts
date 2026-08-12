import type { DatabaseContext } from '../db/database';
import type { ContentKey } from '../domain/ids';
import type { PortableContentAggregate } from '../backup/portable-content';
import type { FeatureValueKey } from '../domain/feature-values';

export interface HistoricalContributionGap {
  readonly kind: 'subclass';
  readonly fingerprintScheme: 'content-v1';
  readonly fingerprintDigest: string;
  readonly contentName: string;
  readonly affectedFacts: readonly ['Sneak Attack', 'Veteran Reflexes'];
  readonly featureValues: readonly {
    readonly key: FeatureValueKey;
    readonly label: 'Sneak Attack';
  }[];
  readonly resources: readonly {
    readonly contributionKey: string;
    readonly label: string;
    readonly markingShape: 'boxes' | 'remaining';
  }[];
  readonly successorContentKey: ContentKey;
}

/**
 * Frozen historical identities whose authored prose promises numeric mechanics
 * that predate structured contributions. This is evidence, never a prose
 * parser: only byte-identified aggregates can withhold sheet values.
 */
export const HISTORICAL_CONTRIBUTION_GAPS = Object.freeze([
  Object.freeze({
    kind: 'subclass' as const,
    fingerprintScheme: 'content-v1' as const,
    fingerprintDigest:
      'ba433201acabb302fac98efa457ed7846392d71c7400c198d00479912422135c',
    contentName: 'Veteran (Bundled revision 2)',
    affectedFacts: Object.freeze(['Sneak Attack', 'Veteran Reflexes'] as const),
    featureValues: Object.freeze([Object.freeze({
      key: 'sneak_attack' as const,
      label: 'Sneak Attack',
    })]),
    resources: Object.freeze([Object.freeze({
      contributionKey: 'veteran-reflexes',
      label: 'Veteran Reflexes',
      markingShape: 'boxes' as const,
    })]),
    successorContentKey:
      '2024:content.subclass:veteran-bundled-revision-3' as ContentKey,
  }),
]);

export function historicalContributionGapForPortable(
  entry: PortableContentAggregate,
): HistoricalContributionGap | null {
  return HISTORICAL_CONTRIBUTION_GAPS.find((gap) =>
    entry.kind === gap.kind &&
    entry.fingerprint_scheme === gap.fingerprintScheme &&
    entry.fingerprint_digest === gap.fingerprintDigest
  ) ?? null;
}

export function historicalContributionGapForInstalledSubclass(
  db: DatabaseContext,
  contentKey: ContentKey,
): HistoricalContributionGap | null {
  const fingerprint = db.oneRaw(
    `SELECT fingerprint_scheme, fingerprint_digest
     FROM catalog_content_fingerprints
     WHERE content_kind = 'subclass' AND content_key = ?
       AND fingerprint_role = 'current'`,
    [contentKey],
  );
  if (fingerprint === null) return null;
  return HISTORICAL_CONTRIBUTION_GAPS.find((gap) =>
    fingerprint.fingerprint_scheme === gap.fingerprintScheme &&
    fingerprint.fingerprint_digest === gap.fingerprintDigest
  ) ?? null;
}
