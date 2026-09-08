import { describe, expect, it } from 'vitest';
import { coverBetweenCombatants, traceCombatantLine, type CreatureLineOptions } from '../../../src/combat/cover';
import { canCombatantSee, createEncounter, type EncounterState } from '../../../src/combat/encounter';
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
