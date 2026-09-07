import { describe, expect, it } from 'vitest';
import { coverBetweenCombatants } from '../../../src/combat/cover';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
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
      sourceIds: [fixture.first.id, fixture.second.id],
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
      sourceIds: [fixture.first.id],
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

  it('keeps the three-quarters creature variant opt-in and non-stacking', () => {
    const fixture = coverFixture();
    expect(coverBetweenCombatants(fixture.state, fixture.source.id, fixture.target.id).tier).toBe('half');
    expect(coverBetweenCombatants(fixture.state, fixture.source.id, fixture.target.id, {
      creaturesGrantThreeQuarters: true,
    }).tier).toBe('three_quarters');
  });
});
