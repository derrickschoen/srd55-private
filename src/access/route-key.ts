import type { CastingMode } from '../domain/enums';

export interface RouteKeyFields {
  readonly origin: string;
  readonly spell_version_id: number;
  readonly source_instance_id: number | null;
  readonly slot_id: number | null;
  readonly slot_key: string | null;
  readonly casting_mode: CastingMode;
  readonly spellbook_entry_id?: number;
}

/**
 * Identifies one access route by persisted provenance. Presentation and casting
 * math are deliberately absent, so recomputing those values cannot mint a
 * duplicate route. Distinct slots remain distinct duplicate-warning inputs.
 */
export function routeKey(route: RouteKeyFields): string {
  return JSON.stringify([
    route.origin,
    route.spell_version_id,
    route.source_instance_id,
    route.slot_id,
    route.slot_key,
    route.spellbook_entry_id ?? null,
    route.casting_mode,
  ]);
}

export function deduplicateRoutes<T extends RouteKeyFields>(
  routes: readonly T[],
): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const route of routes) {
    const key = routeKey(route);
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(route);
    }
  }
  return unique;
}
