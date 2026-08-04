import type { NormalizedCatalogRecord } from './catalog-normalize';

/** Shared with the importer so document and stored projection cannot drift. */
export function spellActionType(castingTime: string | null): string | null {
  if (castingTime === null) return null;
  if (/\bbonus action\b/iu.test(castingTime)) return 'Bonus Action';
  if (/\breaction\b/iu.test(castingTime)) return 'Reaction';
  if (/\baction\b/iu.test(castingTime)) return 'Action';
  return null;
}

/**
 * THE DECLARED BOOLEAN IS THE ONLY SOURCE OF THE `ritual` AND `concentration`
 * TAGS. The record's prose is never read for them. Until F13 this inferred
 * both from casting/duration text and could override an author's explicit
 * false. D12/Q4 says user-supplied content wins, so the shared importer and
 * projector seam reads only the closed boolean fields.
 */
export function spellTags(record: NormalizedCatalogRecord): readonly string[] {
  const tags = [...record.tags];
  if (record.ritual) tags.push('ritual');
  if (record.concentration) tags.push('concentration');
  return tags;
}
