/**
 * Storage-boundary limits for feature-value contribution rows.
 *
 * This is deliberately not the E1 domain module. It is the small leaf shared
 * by migration-0042's SQL CHECKs and the untrusted-row decoder, so the database
 * and the storage validator cannot drift on byte/key limits while E1 lands in
 * parallel.
 *
 * The storage gate is deliberately STRICTER than E1's in-memory evaluator:
 * E1 admits 16,384 encoded bytes, depth 16, cumulative list breadth 128,
 * safe-integer literals, and any non-empty class content key. Persistence uses
 * 4,096 bytes, depth 8, per-array plus total-visit limits of 100, magnitude
 * 1,000, and 200-code-point keys. Thus every stored expression remains legal
 * to E1 at read time. A future storage widening must never exceed E1's
 * corresponding domain boundary.
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
