import { describe, expect, it } from 'vitest';
import type { EncounterEffect } from '../../../src/combat/effects';
import type { EncounterState } from '../../../src/combat/encounter';
import {
  effectStackingIdentity,
  encounterEffectId,
  type CombatantId,
} from '../../../src/combat/values';
import {
  heldoutEncounterOutcome,
  heldoutSideHp,
  pcNeutralized,
} from '../../../src/vtt/heldout-evaluation';
import { generateRoom } from '../../../src/vtt/room-generator';

function fixture(): EncounterState {
  return generateRoom(5_860_001).encounter.state;
}

function playerIds(state: EncounterState): readonly CombatantId[] {
  return state.combatants.flatMap((subject) =>
    subject.profile.kind === 'player_character' ? [subject.profile.id] : []);
}

function unconsciousEffect(state: EncounterState, target: CombatantId, ordinal: number): EncounterEffect {
  const source = state.combatants.find((subject) => subject.profile.kind === 'monster')?.profile.id;
  if (source === undefined) throw new Error('Held-out fixture has no monster.');
  return {
    id: encounterEffectId(`effect:heldout-unconscious-${String(ordinal)}`),
    source,
    targets: [target],
    createdRevision: state.revision,
    duration: { kind: 'permanent' },
    concentrationOwner: null,
    stackingIdentity: effectStackingIdentity(`heldout:unconscious:${String(ordinal)}`),
    stacking: 'replace_same_source',
    repeatedSave: null,
    damageBreak: null,
    payload: { kind: 'condition', condition: 'Unconscious' },
  };
}

function unconsciousSuppressionEffect(
  state: EncounterState,
  target: CombatantId,
): EncounterEffect {
  const source = state.combatants.find((subject) => subject.profile.kind === 'monster')?.profile.id;
  if (source === undefined) throw new Error('Held-out fixture has no monster.');
  const conditions = ['Unconscious'] as unknown as readonly ['Charmed', 'Frightened'];
  return {
    id: encounterEffectId('effect:heldout-unconscious-suppression'),
    source,
    targets: [target],
    createdRevision: state.revision,
    duration: { kind: 'permanent' },
    concentrationOwner: null,
    stackingIdentity: effectStackingIdentity('heldout:unconscious-suppression'),
    stacking: 'replace_same_source',
    repeatedSave: null,
    damageBreak: null,
    payload: { kind: 'condition_suppression', conditions, grantsImmunity: true },
  };
}

describe('held-out encounter scoring', () => {
  it('counts every positive-HP living PC with effective Unconscious as monster win', () => {
    const initial = fixture();
    const ids = playerIds(initial);
    const final = {
      ...initial,
      effects: [...initial.effects, ...ids.map((id, index) => unconsciousEffect(initial, id, index))],
    };

    expect(final.combatants.filter((subject) =>
      subject.profile.kind === 'player_character').every((subject) =>
      subject.life === 'living' && subject.hitPoints > 0)).toBe(true);
    expect(ids.every((id) => pcNeutralized(final, id))).toBe(true);
    expect(heldoutEncounterOutcome(initial, final, 2)).toEqual({
      result: 'monster_win',
      monsterWin: 1,
      neutralizedPcIds: ids,
      effectiveUnconsciousPcIds: ids,
      capturedCount: 0,
      roundsCompleted: 2,
    });
  });

  it('mixed dead/unconscious/living is not win', () => {
    const initial = fixture();
    const [deadId, unconsciousId, livingId] = playerIds(initial);
    if (deadId === undefined || unconsciousId === undefined || livingId === undefined) {
      throw new Error('Held-out fixture needs three PCs.');
    }
    const final: EncounterState = {
      ...initial,
      combatants: initial.combatants.map((subject) => subject.profile.id === deadId
        ? { ...subject, life: 'dead', hitPoints: 0 }
        : subject),
      effects: [...initial.effects, unconsciousEffect(initial, unconsciousId, 1)],
    };

    expect(pcNeutralized(final, livingId)).toBe(false);
    expect(heldoutEncounterOutcome(initial, final, 4)).toMatchObject({
      result: 'round_cap',
      monsterWin: 0,
      neutralizedPcIds: [deadId, unconsciousId],
      effectiveUnconsciousPcIds: [unconsciousId],
    });
  });

  it('removing or effectively suppressing Unconscious restores a living PC', () => {
    const initial = fixture();
    const target = playerIds(initial)[0];
    if (target === undefined) throw new Error('Held-out fixture has no PC.');
    const affected = { ...initial, effects: [...initial.effects, unconsciousEffect(initial, target, 1)] };
    const restored = { ...affected, effects: affected.effects.filter((effect) =>
      effect.payload.kind !== 'condition' || effect.payload.condition !== 'Unconscious') };
    const suppressed = {
      ...affected,
      effects: [...affected.effects, unconsciousSuppressionEffect(initial, target)],
    };

    expect(pcNeutralized(affected, target)).toBe(true);
    expect(pcNeutralized(restored, target)).toBe(false);
    expect(pcNeutralized(suppressed, target)).toBe(false);
  });

  it('capture remains rejected and cap, flight, and objective are not wins', () => {
    const initial = fixture();
    const final = {
      ...initial,
      tokens: initial.tokens.filter((token) => {
        const subject = initial.combatants.find((candidate) => candidate.profile.id === token.combatantId);
        return subject?.profile.kind !== 'player_character';
      }),
    };

    expect(heldoutEncounterOutcome(initial, final, 10)).toMatchObject({
      result: 'round_cap', monsterWin: 0, capturedCount: 0,
    });
  });

  it('gives PC neutralization precedence when both sides terminate', () => {
    const initial = fixture();
    const final: EncounterState = {
      ...initial,
      combatants: initial.combatants.map((subject) => ({
        ...subject,
        life: 'dead',
        hitPoints: 0,
      })),
    };

    expect(heldoutEncounterOutcome(initial, final, 3).result).toBe('monster_win');
  });

  it('computes normalized side HP from initial maxima', () => {
    const initial = fixture();
    const final = {
      ...initial,
      combatants: initial.combatants.map((subject) => ({
        ...subject,
        hitPoints: subject.profile.kind === 'monster'
          ? 0
          : subject.profile.rules.hitPointMaximum,
      })),
    };

    expect(heldoutSideHp(initial, final)).toEqual({
      monsterRemaining: 0,
      partyRemaining: 1,
      difference: -1,
    });
  });

  it('does not upper-clamp current HP when computing the preregistered side metric', () => {
    const source = fixture();
    const initial = {
      ...source,
      combatants: source.combatants.map((subject) => subject.profile.kind === 'monster'
        ? {
            ...subject,
            hitPoints: 20,
            profile: {
              ...subject.profile,
              rules: { ...subject.profile.rules, hitPointMaximum: 20 },
            },
          }
        : subject),
    };
    const final = {
      ...initial,
      combatants: initial.combatants.map((subject) => ({
        ...subject,
        hitPoints: subject.profile.kind === 'monster'
          ? 25
          : subject.profile.rules.hitPointMaximum,
      })),
    };

    expect(heldoutSideHp(initial, final)).toEqual({
      monsterRemaining: 1.25,
      partyRemaining: 1,
      difference: 0.25,
    });
  });
});
