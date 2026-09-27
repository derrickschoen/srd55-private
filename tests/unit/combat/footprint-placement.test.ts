import { describe, expect, it } from 'vitest';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { CreatureSizeRuleError } from '../../../src/combat/combat-rules';
import { combatToken, type CombatantProfile } from '../../../src/combat/combatant';
import { narrowOpeningId } from '../../../src/combat/creature-space';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { EncounterRuleError } from '../../../src/combat/encounter-rule-error';
import { OffGridBodyError, type FootprintSide, type GridCell } from '../../../src/combat/grid';
import { EMPTY_ENCOUNTER_ENVIRONMENT } from '../../../src/combat/world-objects';
import type { KnownCreatureSize } from '../../../src/domain/enums';
import { monsterProfile, playerProfile } from './fixtures';

// FOOTPRINT (owner D900): a creature's whole body is on the map at placement. createEncounter mints every
// token through the placement checks (src/combat/token-placement.ts): the anchor on the grid, the mode of
// the effective size, then the whole square the mode controls on the grid. Every expectation here is
// hand-derived from the SRD 5.2.1 Creature Size table (D511): Huge 3 x 3, Gargantuan 4 x 4, Large 2 x 2;
// a squeezed creature controls the square of its `sizedFor` size (creature-space.ts).

function sized(key: string, size: KnownCreatureSize): CombatantProfile {
  const profile = monsterProfile(key);
  return { ...profile, rules: { ...profile.rules, sizeCategory: size } };
}

function encounterWith(
  bounds: { readonly columns: number; readonly rows: number },
  monster: CombatantProfile,
  anchor: GridCell,
  overrides: Partial<Parameters<typeof createEncounter>[0]> = {},
): EncounterState {
  const pc = playerProfile('footprint-pc');
  return createEncounter({
    bounds,
    combatants: [monster, pc],
    tokens: [combatToken(monster, anchor), combatToken(pc, { column: 0, row: 0 })],
    ...overrides,
  });
}

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

function thrown(action: () => unknown): unknown {
  try {
    action();
  } catch (error) {
    return error;
  }
  return undefined;
}

/** The refusal names the body it refused: label, anchor, side, size and the grid. */
function offGridBody(
  error: unknown,
  label: string,
  anchor: GridCell,
  side: FootprintSide,
  size: KnownCreatureSize,
  bounds: { readonly columns: number; readonly rows: number },
): boolean {
  return error instanceof OffGridBodyError && error instanceof EncounterRuleError && error.refusalClass === 'validation' &&
    error.label === label && canonicalJson(error.anchor) === canonicalJson(anchor) && error.side === side &&
    error.size === size && error.bounds.columns === bounds.columns && error.bounds.rows === bounds.rows;
}

describe('FOOTPRINT: createEncounter places whole bodies only', () => {
  const grid = { columns: 19, rows: 20 };

  it('W1: refuses a Huge body one column (17,3) or one row (16,18) past the 19 x 20 grid, naming it', () => {
    // Huge at (17,3) covers columns 17-19; column 19 is off a 19-column grid. At (16,18) it covers rows 18-20.
    for (const anchor of [{ column: 17, row: 3 }, { column: 16, row: 18 }]) {
      const error = thrown(() => encounterWith(grid, sized('footprint-huge', 'Huge'), anchor));
      expect(offGridBody(error, 'Token token:footprint-huge', anchor, 3, 'Huge', grid), `${canonicalJson(anchor)}: ${String(error)}`)
        .toBe(true);
    }
  });

  it('W2: accepts a flush Huge (16,17) and a flush Gargantuan (15,16) on the 19 x 20 grid', () => {
    // Huge (16,17): columns 16-18, rows 17-19. Gargantuan (15,16): columns 15-18, rows 16-19. Both touch both far edges.
    const huge = accepted(() => encounterWith(grid, sized('footprint-huge', 'Huge'), { column: 16, row: 17 }));
    expect(huge.tokens[0]).toMatchObject({ position: { column: 16, row: 17 }, placementMode: { kind: 'normal', actual: 'Huge' } });
    const gargantuan = accepted(() => encounterWith(grid, sized('footprint-gargantuan', 'Gargantuan'), { column: 15, row: 16 }));
    expect(gargantuan.tokens[0]).toMatchObject({
      position: { column: 15, row: 16 }, placementMode: { kind: 'normal', actual: 'Gargantuan' },
    });
  });

  it('a mode of another size is refused before the body is measured', () => {
    const large = sized('footprint-large', 'Large');
    const pc = playerProfile('footprint-pc');
    const error = thrown(() => createEncounter({
      bounds: grid,
      combatants: [large, pc],
      tokens: [
        { ...combatToken(large, { column: 18, row: 19 }), placementMode: { kind: 'normal', actual: 'Huge' } },
        combatToken(pc, { column: 0, row: 0 }),
      ],
    }));
    expect(error instanceof CreatureSizeRuleError && error.code === 'placement_size_mismatch', String(error)).toBe(true);
  });

  it('W4: a squeezed Large controls a Medium square: (5,0) inside a Medium opening is placed; a normal Large there leaves the grid', () => {
    // 6 x 3 grid; a Medium-sized narrow opening fills column 5. A squeezed Large (sizedFor Medium) at (5,0)
    // controls the 1 x 1 square (5,0), inside the opening. A normal Large at (5,0) covers columns 5-6: off the grid.
    const bounds = { columns: 6, rows: 3 };
    const large = sized('footprint-squeezer', 'Large');
    const environment = {
      ...EMPTY_ENCOUNTER_ENVIRONMENT,
      narrowOpeningRegions: [{
        id: narrowOpeningId('opening:column-5'), sizedFor: 'Medium' as const,
        cells: [{ column: 5, row: 0 }, { column: 5, row: 1 }, { column: 5, row: 2 }] as const,
      }],
    };
    const squeezedToken = {
      ...combatToken(large, { column: 5, row: 0 }),
      placementMode: { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' } as const,
    };
    const pc = playerProfile('footprint-pc');
    const placed = accepted(() => createEncounter({
      bounds, combatants: [large, pc], environment,
      tokens: [squeezedToken, combatToken(pc, { column: 0, row: 0 })],
    }));
    expect(placed.tokens[0]).toMatchObject({
      position: { column: 5, row: 0 }, placementMode: { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' },
    });
    const normal = thrown(() => encounterWith(bounds, large, { column: 5, row: 0 }, { environment }));
    expect(offGridBody(normal, 'Token token:footprint-squeezer', { column: 5, row: 0 }, 2, 'Large', bounds), String(normal)).toBe(true);
  });
});
