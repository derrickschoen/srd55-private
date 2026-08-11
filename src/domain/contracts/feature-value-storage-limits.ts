/**
 * Storage-boundary limits for feature-value contribution rows.
 *
 * This is deliberately not the E1 domain module. It is the small leaf shared
 * by migration-0042's SQL CHECKs and the untrusted-row decoder, so the database
 * and the storage validator cannot drift on byte/key limits while E1 lands in
 * parallel.
 */
export const FEATURE_VALUE_CONTRIBUTION_LIMITS = Object.freeze({
  keyCodePoints: 200,
  valueJsonBytes: 4_096,
  supersedesJsonBytes: 512,
  expressionDepth: 8,
  expressionNodes: 100,
  expressionListEntries: 100,
  magnitude: 1_000,
});
