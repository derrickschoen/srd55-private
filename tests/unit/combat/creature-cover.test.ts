import { describe, expect, it } from 'vitest';
import {
  coverBetweenCombatants,
  traceCombatantLine,
  traceCombatantLineToCells,
  type CreatureLineOptions,
} from '../../../src/combat/cover';
import { sharedSpaceRelation } from '../../../src/combat/creature-space';
import { canCombatantSee, createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { terrainBlocking } from '../../../src/combat/terrain';
import { armorClass, worldObjectId, type CombatantId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { monsterProfile, placedToken, playerProfile } from './fixtures';

function coverFixture(): {
  readonly state: EncounterState;
  readonly source: ReturnType<typeof playerProfile>;
  readonly target: ReturnType<typeof monsterProfile>;
  readonly first: ReturnType<typeof playerProfile>;
  readonly second: ReturnType<typeof playerProfile>;
} {
  const source = playerProfile('cover-source');
  const first = playerProfile('cover-first');
  const second = playerProfile('cover-second');
  const target = monsterProfile('cover-target');
  return {
    source,
    first,
    second,
    target,
    state: createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [source, first, second, target],
      tokens: [
        placedToken(source, 0),
        placedToken(first, 1),
        placedToken(second, 2),
        placedToken(target, 4),
      ],
    }),
  };
}

describe('D514 creature cover', () => {
  it('grants one flat Half Cover tier for one or multiple intervening creatures', () => {
    const fixture = coverFixture();
    expect(coverBetweenCombatants(fixture.state, fixture.source.id, fixture.target.id)).toEqual({
      tier: 'half',
      sourceIds: [`creature:${fixture.first.id}`, `creature:${fixture.second.id}`],
    });
  });

  it('counts dying and unconscious occupants but excludes non-occupying dead creatures', () => {
    const fixture = coverFixture();
    const dying: EncounterState = {
      ...fixture.state,
      combatants: fixture.state.combatants.map((combatant) =>
        combatant.profile.id === fixture.first.id
          ? { ...combatant, life: 'dying', hitPoints: 0 }
          : combatant.profile.id === fixture.second.id
            ? { ...combatant, life: 'dead', hitPoints: 0 }
            : combatant),
    };
    expect(coverBetweenCombatants(dying, fixture.source.id, fixture.target.id)).toEqual({
      tier: 'half',
      sourceIds: [`creature:${fixture.first.id}`],
    });

    const removed = {
      ...dying,
      combatants: dying.combatants.map((combatant) => combatant.profile.id === fixture.first.id
        ? { ...combatant, life: 'dead' as const }
        : combatant),
    };
    expect(coverBetweenCombatants(removed, fixture.source.id, fixture.target.id)).toEqual({
      tier: 'none', sourceIds: [],
    });
  });

  it('removes the creature tier variant so living creatures always grant Half Cover', () => {
    const fixture = coverFixture();
    type HasLegacyVariant = 'creaturesGrantThreeQuarters' extends keyof CreatureLineOptions ? true : false;
    const hasLegacyVariant: HasLegacyVariant = false;
    expect(hasLegacyVariant).toBe(false);
    expect(coverBetweenCombatants(fixture.state, fixture.source.id, fixture.target.id).tier).toBe('half');
  });

  it('M576-E1A-MULTICELL-INNER-CORNERS uses only the four outer corners of a Large target space', () => {
    const source = playerProfile('outer-corner-source');
    const baseTarget = monsterProfile('outer-corner-large-target');
    const target = { ...baseTarget, rules: { ...baseTarget.rules, sizeCategory: 'Large' as const } };
    const state = createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [source, target],
      tokens: [placedToken(source, 0, 0), placedToken(target, 3, 0)],
    });
    const trace = traceCombatantLine(state, source.id, target.id);
    expect(trace).toMatchObject({
      sourceCell: { column: 0, row: 0 }, targetCell: { column: 3, row: 0 },
      sourceCorner: { column: 0, row: 0 }, tier: 'none', blocksSight: false,
    });
    expect(trace.lines.map((line) => line.targetCorner)).toEqual([
      { column: 3, row: 0 }, { column: 5, row: 0 },
      { column: 3, row: 2 }, { column: 5, row: 2 },
    ]);
    expect(canCombatantSee(state, source.id, target.id)).toBe(true);
  });

  it('M576-E1A-CENTRE-RAY-SURVIVES counts an intervening living creature on the corner lines', () => {
    const source = playerProfile('corner-ray-source');
    const intervening = monsterProfile('corner-ray-intervening');
    const baseTarget = monsterProfile('corner-ray-large-target');
    const target = { ...baseTarget, rules: { ...baseTarget.rules, sizeCategory: 'Large' as const } };
    const state = createEncounter({
      bounds: { columns: 6, rows: 3 },
      combatants: [source, intervening, target],
      tokens: [placedToken(source, 0, 0), placedToken(intervening, 2, 0), placedToken(target, 3, 0)],
    });
    expect(traceCombatantLine(state, source.id, target.id)).toMatchObject({
      sourceCell: { column: 0, row: 0 }, targetCell: { column: 3, row: 0 },
      tier: 'half', blocksSight: false,
      sourceIds: [`creature:${intervening.id}`],
    });
  });
});

function tinyMonster(key: string) {
  const profile = monsterProfile(key);
  return { ...profile, rules: { ...profile.rules, sizeCategory: 'Tiny' as const } };
}

function slit(cell: GridCell): WorldObject {
  return {
    id: worldObjectId('object:slit'),
    name: 'slit',
    kind: 'cover',
    position: cell,
    footprint: [cell],
    durability: { kind: 'indestructible' },
    armorClass: armorClass(10),
    damageResponses: [],
    blocking: terrainBlocking('three_quarters_cover'),
    createdRevision: 0,
  };
}

/** The same encounter with the mover's token really standing at the anchor. */
function withMoverAt(state: EncounterState, mover: CombatantId, anchor: GridCell): EncounterState {
  return {
    ...state,
    tokens: state.tokens.map((token) => token.combatantId === mover ? { ...token, position: { ...anchor } } : token),
  };
}

// Owner ruling 2026-09-24 ("Fix as its own unit"): a line traced from a hypothetical anchor must not
// count the mover's own CURRENT body as a creature giving cover. Every expected value below is
// derived by hand from D576.3 (outer corners; a line counts a cell only when it crosses the cell's
// interior; count 0 none / 1-2 half / 3 three_quarters, clamped by the strongest crossed tier and
// three_quarters; least-protective source corner, ties by row then column).
describe('COVERSELF a mover never takes cover behind its own current body', () => {
  it('COVERSELF-GOBLIN-STEP a goblin that steps from A to B and attacks the fighter gets no cover from A', () => {
    // Board 6 x 1. Goblin now at A = (1,0), fighter at (3,0); the goblin considers attacking from B = (0,0).
    // Source corners of B: (0,0) (1,0) (0,1) (1,1); target corners (3,0) (4,0) (3,1) (4,1).
    // The only creature cell strictly between them is A. From (0,0): lines to (3,0) and (4,0) run
    // along the row-0 boundary (no interior crossing); to (3,1) y = x/3 and to (4,1) y = x/4 pass
    // A's interior for x in (1,2). The other three corners are the same by symmetry. So:
    //   counting A (the defect): 2 obstructed lines at every corner -> half.
    //   A empty (the goblin's body went with it to B): 0 obstructed lines -> none, corner (0,0).
    const goblin = monsterProfile('coverself-goblin');
    const fighter = playerProfile('coverself-fighter');
    const state = createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [goblin, fighter],
      tokens: [placedToken(goblin, 1), placedToken(fighter, 3)],
    });
    const anchor = { column: 0, row: 0 };
    const trace = traceCombatantLine(state, goblin.id, fighter.id, { sourceAnchor: anchor });
    expect(trace).toMatchObject({
      tier: 'none', blocksSight: false, sourceIds: [], sources: [],
      sourceCorner: { column: 0, row: 0 }, sourceCell: { column: 0, row: 0 }, targetCell: { column: 3, row: 0 },
      interveningCells: [],
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'none', 'none']);
    expect(coverBetweenCombatants(state, goblin.id, fighter.id, { sourceAnchor: anchor })).toEqual({
      tier: 'none', sourceIds: [],
    });
    // The anchored line is the line the goblin really has once it stands at B.
    expect(trace).toEqual(traceCombatantLine(withMoverAt(state, goblin.id, anchor), goblin.id, fighter.id));
  });

  it('COVERSELF-THREE-QUARTERS the mover\'s own body cannot lift Half Cover behind a slit to Three-Quarters', () => {
    // Board 3 x 3. Goblin now at A = (1,1), fighter at T = (2,2), a three-quarters slit at O = (1,2);
    // the goblin considers attacking from B = (0,0). Target corners (2,2) (3,2) (2,3) (3,3).
    // Cells each line crosses (interior only, endpoints' own cells omitted):
    //   Corner (0,0): ->(2,2) y=x: A; ->(3,2) y=2x/3: (1,0) A (2,1); ->(2,3) y=3x/2: (0,1) A O;
    //     ->(3,3) y=x: A. O on 1 line.
    //   Corner (1,0): ->(2,2): (1,0) A; ->(3,2) y=x-1: (1,0) (2,1); ->(2,3): (1,0) A O;
    //     ->(3,3): (1,0) A (2,1). O on 1 line.
    //   Corner (0,1): ->(2,2) y=1+x/2: (0,1) A; ->(3,2) y=1+x/3: (0,1) A (2,1); ->(2,3) y=1+x: (0,1) O;
    //     ->(3,3) y=1+2x/3: (0,1) A O. O on 2 lines.
    //   Corner (1,1): ->(2,2): A; ->(3,2): A (2,1); ->(2,3): A O; ->(3,3): A. O on 1 line.
    // Counting A (the defect): every corner has 3 or 4 obstructed lines, strongest three_quarters
    //   -> three_quarters.
    // A empty: every corner has 1 or 2 obstructed lines, all by O -> half; the tie selects corner
    //   (0,0), whose lines are none, none, three_quarters, none.
    const goblin = monsterProfile('coverself-slit-goblin');
    const fighter = playerProfile('coverself-slit-fighter');
    const state = createEncounter({
      bounds: { columns: 3, rows: 3 },
      combatants: [goblin, fighter],
      tokens: [placedToken(goblin, 1, 1), placedToken(fighter, 2, 2)],
      worldObjects: [slit({ column: 1, row: 2 })],
    });
    const anchor = { column: 0, row: 0 };
    const trace = traceCombatantLine(state, goblin.id, fighter.id, { sourceAnchor: anchor });
    expect(trace).toMatchObject({
      tier: 'half', blocksSight: false, sourceIds: ['object:object:slit'],
      sourceCorner: { column: 0, row: 0 },
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'three_quarters', 'none']);
    expect(trace).toEqual(traceCombatantLine(withMoverAt(state, goblin.id, anchor), goblin.id, fighter.id));
  });

  it('COVERSELF-BY-ID a Tiny creature sharing the mover\'s current cell still gives Half Cover', () => {
    // Board 6 x 1. Tiny goblin and Tiny rat share A = (1,0); fighter at (3,0); the goblin considers
    // B = (0,0). Geometry as COVERSELF-GOBLIN-STEP: every source corner of B has 2 lines through A's
    // interior. The goblin's body left A, the rat's did not: 2 obstructed lines at every corner
    // -> half, from the rat only; corner (0,0), lines none, none, half, half.
    const goblin = tinyMonster('coverself-tiny-goblin');
    const rat = tinyMonster('coverself-tiny-rat');
    const fighter = playerProfile('coverself-tiny-fighter');
    const state = createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [goblin, rat, fighter],
      tokens: [placedToken(goblin, 1), placedToken(rat, 1), placedToken(fighter, 3)],
      sharedSpaceRelations: [sharedSpaceRelation({
        left: goblin.id, right: rat.id, provenance: 'tiny_capacity', originatingId: 'setup:coverself-tiny-cell',
      })],
    });
    const trace = traceCombatantLine(state, goblin.id, fighter.id, { sourceAnchor: { column: 0, row: 0 } });
    expect(trace).toMatchObject({
      tier: 'half', blocksSight: false, sourceIds: [`creature:${rat.id}`],
      sourceCorner: { column: 0, row: 0 }, interveningCells: [{ column: 1, row: 0 }],
    });
    expect(trace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'half', 'half']);
  });

  it('COVERSELF-ORIGINATOR-KEY a creature really standing at the anchor keeps the mover\'s body as cover, in either query order', () => {
    // Board 6 x 1. Goblin at A = (1,0), hobgoblin really at B = (0,0), fighter at (3,0).
    // The hobgoblin's line from B crosses the goblin at A on 2 lines per corner -> half (this is also
    // the geometry control for COVERSELF-GOBLIN-STEP). The goblin's line from anchor B, over the same
    // cells, crosses nothing -> none.
    for (const [suffix, goblinFirst] of [['goblin-last', false], ['goblin-first', true]] as const) {
      const goblin = monsterProfile(`coverself-key-goblin-${suffix}`);
      const hobgoblin = monsterProfile(`coverself-key-hobgoblin-${suffix}`);
      const fighter = playerProfile(`coverself-key-fighter-${suffix}`);
      const state = createEncounter({
        bounds: { columns: 6, rows: 1 },
        combatants: [goblin, hobgoblin, fighter],
        tokens: [placedToken(goblin, 1), placedToken(hobgoblin, 0), placedToken(fighter, 3)],
      });
      const goblinLine = () =>
        traceCombatantLine(state, goblin.id, fighter.id, { sourceAnchor: { column: 0, row: 0 } });
      const hobgoblinLine = () => traceCombatantLine(state, hobgoblin.id, fighter.id);
      const fromGoblin = goblinFirst ? goblinLine() : undefined;
      const fromHobgoblin = hobgoblinLine();
      const goblinTrace = fromGoblin ?? goblinLine();
      expect(fromHobgoblin, suffix).toMatchObject({ tier: 'half', sourceIds: [`creature:${goblin.id}`] });
      expect(goblinTrace, suffix).toMatchObject({ tier: 'none', sourceIds: [] });
    }
  });

  it('COVERSELF-TO-CELLS an anchored line to a bare cell drops the mover\'s current body and keeps another creature\'s', () => {
    // traceCombatantLineToCells with sourceAnchor. Board 6 x 1. Goblin now at A = (1,0); the goblin
    // considers a line from B = (0,0) to the bare cell T = (3,0), where no creature stands.
    // Source corners of B: (0,0) (1,0) (0,1) (1,1); corners of T: (3,0) (4,0) (3,1) (4,1). The corner
    // box spans columns 0..4, so only (1,0) and (2,0) can be crossed ((5,0) is outside it).
    //   From (0,0): ->(3,0) and ->(4,0) run along the row-0 boundary (no interior crossing);
    //     ->(3,1) y = x/3 and ->(4,1) y = x/4 cross the interiors of (1,0) and (2,0).
    //   From (1,0): the same; ->(3,1) y = (x-1)/2 and ->(4,1) y = (x-1)/3 cross both.
    //   From (0,1): ->(3,0) y = 1-x/3 and ->(4,0) y = 1-x/4 cross both; the other two run along row 1.
    //   From (1,1): ->(3,0) and ->(4,0) cross both; the other two run along row 1.
    // So every source corner has exactly 2 lines through (1,0) and (2,0), and 2 lines through neither.
    const anchor = { column: 0, row: 0 };
    const bare = [{ column: 3, row: 0 }];

    // Case 1: the goblin's own body is the only creature in the box (a fighter stands at (5,0)).
    //   Counting A (the defect): 2 obstructed lines at every corner -> half, from the goblin.
    //   A empty (the body went with the goblin to B): 0 obstructed lines -> none, corner (0,0).
    const goblin = monsterProfile('coverself-cells-goblin');
    const fighter = playerProfile('coverself-cells-fighter');
    const alone = createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [goblin, fighter],
      tokens: [placedToken(goblin, 1), placedToken(fighter, 5)],
    });
    const aloneTrace = traceCombatantLineToCells(alone, goblin.id, bare, { sourceAnchor: anchor });
    expect(aloneTrace).toMatchObject({
      tier: 'none', blocksSight: false, sourceIds: [], sources: [], firstBlockingCell: null,
      sourceCorner: { column: 0, row: 0 }, sourceCell: { column: 0, row: 0 }, targetCell: { column: 3, row: 0 },
      interveningCells: [],
    });
    expect(aloneTrace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'none', 'none']);
    expect(aloneTrace).toEqual(traceCombatantLineToCells(withMoverAt(alone, goblin.id, anchor), goblin.id, bare));

    // Case 2: a hobgoblin really stands at H = (2,0). A is empty, H still counts: 2 obstructed lines at
    //   every corner -> half, from the hobgoblin only; the tie selects corner (0,0), whose lines are
    //   none, none, half, half and whose crossed cells are H alone. (Counting A as well names the goblin
    //   too and adds (1,0); counting no creature at all gives none.)
    const moverWithCompany = monsterProfile('coverself-cells-company-goblin');
    const hobgoblin = monsterProfile('coverself-cells-hobgoblin');
    const company = createEncounter({
      bounds: { columns: 6, rows: 1 },
      combatants: [moverWithCompany, hobgoblin],
      tokens: [placedToken(moverWithCompany, 1), placedToken(hobgoblin, 2)],
    });
    const companyTrace = traceCombatantLineToCells(company, moverWithCompany.id, bare, { sourceAnchor: anchor });
    expect(companyTrace).toMatchObject({
      tier: 'half', blocksSight: false, sourceIds: [`creature:${hobgoblin.id}`], firstBlockingCell: null,
      sourceCorner: { column: 0, row: 0 }, interveningCells: [{ column: 2, row: 0 }],
    });
    expect(companyTrace.lines.map((line) => line.tier)).toEqual(['none', 'none', 'half', 'half']);
    expect(companyTrace).toEqual(
      traceCombatantLineToCells(withMoverAt(company, moverWithCompany.id, anchor), moverWithCompany.id, bare),
    );
  });
});
