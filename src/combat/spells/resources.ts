import type { SpellSlotCapacity, SpellSlotLevel } from '../combatant';
import { slotsForCasterLevel } from '../../rules/spell-slots';

export type ReferencePartyClass = 'Fighter' | 'Cleric' | 'Wizard';

function spellSlotLevel(value: number): SpellSlotLevel {
  if (!Number.isSafeInteger(value) || value < 1 || value > 9) {
    throw new RangeError('Spell slot level must be an integer from 1 through 9.');
  }
  return value as SpellSlotLevel;
}

/**
 * D260's reference party is level 7. Cleric and Wizard are full casters and
 * therefore share the level-7 row 4/3/3/1. The independent printed rows are
 * docs/srd/source/class-level-tables.txt:73 and :311; the reusable licensed
 * ladder is src/rules/spell-slots.ts.
 */
export function referencePartySpellSlots(
  className: ReferencePartyClass,
): readonly SpellSlotCapacity[] {
  if (className === 'Fighter') return [];
  return Object.entries(slotsForCasterLevel(7)).map(([level, maximum]) => ({
    level: spellSlotLevel(Number(level)),
    maximum,
  }));
}

export function validateSpellSlotCapacities(
  capacities: readonly SpellSlotCapacity[],
): readonly SpellSlotCapacity[] {
  const levels = new Set<SpellSlotLevel>();
  return capacities.map((capacity) => {
    if (levels.has(capacity.level)) throw new RangeError('Spell slot levels must be unique.');
    if (!Number.isSafeInteger(capacity.maximum) || capacity.maximum < 1) {
      throw new RangeError('Spell slot maximum must be a positive safe integer.');
    }
    levels.add(capacity.level);
    return { ...capacity };
  });
}
