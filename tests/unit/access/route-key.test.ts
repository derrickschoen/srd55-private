import { describe, expect, it } from 'vitest';
import {
  deduplicateRoutes,
  routeKey,
  type RouteKeyFields,
} from '../../../src/access/route-key';

function route(
  overrides: Partial<RouteKeyFields> = {},
): RouteKeyFields & {
  spell_name: string;
  attack_bonus: number;
} {
  return {
    origin: 'slot',
    spell_version_id: 7,
    source_instance_id: 3,
    slot_id: 11,
    slot_key: 'source:prepared:1',
    casting_mode: 'with_slots',
    spell_name: 'Shield',
    attack_bonus: 6,
    ...overrides,
  };
}

describe('spell access route keys', () => {
  it('uses persisted provenance while ignoring presentation and casting math', () => {
    const original = route();
    const recomputed = {
      ...original,
      spell_name: 'Shield (renamed)',
      attack_bonus: 9,
    };

    expect(routeKey(recomputed)).toBe(routeKey(original));
    expect(routeKey(route({ slot_id: 12 }))).not.toBe(routeKey(original));
    expect(
      routeKey(
        route({
          origin: 'capability',
          slot_id: null,
          slot_key: null,
          spellbook_entry_id: 11,
          casting_mode: 'ritual_only',
        }),
      ),
    ).not.toBe(routeKey(original));
  });

  it('keeps the first exact route but preserves distinct persisted slots', () => {
    const first = route();
    const duplicate = {
      ...first,
      spell_name: 'A presentation-only duplicate',
      attack_bonus: 99,
    };
    const otherSlot = route({
      slot_id: 12,
      slot_key: 'source:prepared:2',
    });

    expect(deduplicateRoutes([first, duplicate, otherSlot])).toEqual([
      first,
      otherSlot,
    ]);
  });
});
