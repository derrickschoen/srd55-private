import { describe, expect, it } from 'vitest';
import { combatToken, monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import {
  combatantConditions,
  createEncounter,
  reduceEncounter,
  type EncounterState,
} from '../../../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../../../src/combat/events';
import {
  monsterAttackCommand,
  monsterSavingThrowCommand,
} from '../../../src/combat/monster-commands';
import type {
  MonsterAction,
  MonsterAttackAction,
  MonsterSavingThrowAction,
  MonsterStatblock,
} from '../../../src/combat/statblock';
import {
  HOMEBREW_BEAST_ROSTER,
  type HomebrewBeastFamily,
} from '../../../src/combat/statblocks/homebrew-beast-families';
import { STARTER_MONSTER_ROSTER } from '../../../src/combat/statblocks/roster';
import { regretTurnLegalActions } from '../../../src/vtt/regret/legal-actions';
import { playerProfile } from '../../unit/combat/fixtures';

function beast(family: HomebrewBeastFamily, challengeRating: 3) {
  const row = HOMEBREW_BEAST_ROSTER.find((candidate) =>
    candidate.design.family === family && candidate.design.challengeRating === challengeRating);
  if (row === undefined) throw new Error(`Missing ${family} CR ${String(challengeRating)} row.`);
  return row;
}

function actions(statblock: MonsterStatblock): readonly MonsterAction[] {
  if (statblock.sourceDetails.actions.kind === 'absent') throw new Error(`${statblock.name} has no actions.`);
  return statblock.sourceDetails.actions.value;
}

function attack(statblock: MonsterStatblock, id: string): MonsterAttackAction {
  const action = actions(statblock).find((candidate): candidate is MonsterAttackAction =>
    candidate.kind === 'attack' && candidate.id === id);
  if (action === undefined) throw new Error(`${statblock.name} has no attack ${id}.`);
  return action;
}

function savingThrowAction(statblock: MonsterStatblock, id: string): MonsterSavingThrowAction {
  const action = actions(statblock).find((candidate): candidate is MonsterSavingThrowAction =>
    candidate.kind === 'saving_throw' && candidate.id === id);
  if (action === undefined) throw new Error(`${statblock.name} has no saving-throw action ${id}.`);
  return action;
}

function knownTarget(key: string): CombatantProfile {
  const target = playerProfile(key, { hitPoints: 250, initiativeBonus: -20 });
  return {
    ...target,
    rules: { ...target.rules, sizeCategory: 'Medium', creatureType: 'Humanoid' },
  };
}

function started(statblock: MonsterStatblock, target = knownTarget('monster-rider-target')): {
  readonly actor: CombatantProfile;
  readonly target: CombatantProfile;
  readonly state: EncounterState;
} {
  const actor = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${statblock.id}:on-hit`,
    tokenId: `token:${statblock.id}:on-hit`,
  });
  const actorSize = actor.rules.sizeCategory;
  if (actorSize === undefined) throw new Error(`${statblock.name} has no mechanical size.`);
  const actorWidth = (() => {
    switch (actorSize) {
      case 'Tiny':
      case 'Small':
      case 'Medium': return 1;
      case 'Large': return 2;
      case 'Huge': return 3;
      case 'Gargantuan': return 4;
    }
  })();
  const created = createEncounter({
    config: { initiativeMode: 'per_combatant' },
    bounds: { columns: actorWidth + 2, rows: actorWidth },
    combatants: [actor, target],
    tokens: [
      combatToken(actor, { column: 0, row: 0 }),
      combatToken(target, { column: actorWidth, row: 0 }),
    ],
  });
  return {
    actor,
    target,
    state: reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state,
  };
}

function hitPoints(state: EncounterState, target: CombatantProfile): number {
  const subject = state.combatants.find((candidate) => candidate.profile.id === target.id);
  if (subject === undefined) throw new Error(`Missing target ${target.id}.`);
  return subject.hitPoints;
}

function attackEvent(events: readonly EncounterEvent[]) {
  const event = events.find((candidate): candidate is Extract<EncounterEvent, { readonly type: 'attack_resolved' }> =>
    candidate.type === 'attack_resolved');
  if (event === undefined) throw new Error('Attack did not resolve.');
  return event;
}

describe('monster statblock effects execute through the encounter reducer', () => {
  it('charge_precondition_unmet: offers the declared base attack without its charge rider', () => {
    // Charge applies only after straight movement immediately before the hit:
    // docs/srd/full/srd-5.2.1.txt:22805-22809.
    const row = beast('pterosaur', 3);
    const subject = started(row.statblock, knownTarget('charge-domain-target'));
    const declared = attack(row.statblock, 'raking-pass');
    expect(declared.damage).toContainEqual(expect.objectContaining({
      trigger: expect.objectContaining({ kind: 'charge', minimumStraightFeet: 20 }),
    }));
    expect(declared.onHit).toContainEqual(expect.objectContaining({
      kind: 'condition', condition: 'Prone', trigger: expect.objectContaining({ kind: 'charge' }),
    }));

    const command = regretTurnLegalActions(subject.state, subject.actor.id).actions.find(
      (candidate): candidate is Extract<EncounterCommand, { readonly type: 'attack' }> =>
        candidate.type === 'attack' && candidate.attackId === 'raking-pass',
    );
    if (command === undefined) throw new Error('The pterosaur base attack is missing from the legal domain.');
    expect(command.damage.terms).toHaveLength(1);
    expect(command.monsterOnHit).toEqual([]);

    const hit = reduceEncounter(subject.state, command, () => 0.5);
    expect(attackEvent(hit.events)).toMatchObject({
      actor: subject.actor.id,
      target: subject.target.id,
      damage: expect.objectContaining({ terms: [expect.objectContaining({ type: 'Piercing' })] }),
    });
    expect(combatantConditions(hit.state, subject.target.id)).not.toContainEqual(
      expect.objectContaining({ name: 'Prone' }),
    );
  });

  it('squeeze_survives_release: bear grapple carries its DC, ticks at target start, and escape ends grapple plus squeeze', () => {
    const row = beast('ursine', 3);
    const subject = started(row.statblock, knownTarget('bear-grapple-target'));
    const command = monsterAttackCommand(
      attack(row.statblock, 'bear-hug'),
      subject.actor.id,
      subject.target.id,
    );
    expect(command.monsterOnHit).toMatchObject([
      { kind: 'condition', condition: 'Grappled', escapeDc: 15, duration: 'until_escape' },
      { kind: 'condition_bound_ongoing_damage', boundCondition: 'Grappled' },
    ]);

    const hit = reduceEncounter(subject.state, command, () => 0.5);
    expect(combatantConditions(hit.state, subject.target.id)).toContainEqual({
      name: 'Grappled', source: subject.actor.id,
    });
    const grapple = hit.state.effects.find((effect) =>
      effect.payload.kind === 'condition' && effect.payload.condition === 'Grappled');
    const squeeze = hit.state.effects.find((effect) => effect.payload.kind === 'ongoing_damage');
    expect(grapple?.escapeCheck).toEqual({ ability: 'strength', skill: 'athletics', dc: 15 });
    expect(squeeze?.parentEffectId).toBe(grapple?.id);

    const afterHitPoints = hitPoints(hit.state, subject.target);
    const targetStart = reduceEncounter(
      hit.state,
      { type: 'end_turn', actor: subject.actor.id },
      () => 0.5,
    );
    const squeezeDamage = targetStart.events.find((event) =>
      event.type === 'damage_applied' && event.target === subject.target.id);
    expect(squeezeDamage).toMatchObject({ source: subject.actor.id, amount: 7 });
    expect(hitPoints(targetStart.state, subject.target)).toBe(afterHitPoints - 7);

    if (grapple === undefined) throw new Error('Grapple effect was not created.');
    const escaped = reduceEncounter(targetStart.state, {
      type: 'roll_ability_check',
      actor: subject.target.id,
      ability: 'strength',
      skill: 'athletics',
      bonus: 100,
      dc: 15,
      rollMode: 'normal',
      cost: 'action',
      escapeEffectId: grapple.id,
    }, () => 0);
    expect(escaped.state.effects.some((effect) =>
      effect.id === grapple.id || effect.parentEffectId === grapple.id)).toBe(false);
    expect(combatantConditions(escaped.state, subject.target.id)).not.toContainEqual(
      expect.objectContaining({ name: 'Grappled' }),
    );

    const afterEscapeHitPoints = hitPoints(escaped.state, subject.target);
    const nextBearTurn = reduceEncounter(
      escaped.state,
      { type: 'end_turn', actor: subject.target.id },
      () => 0.5,
    ).state;
    const nextTargetStart = reduceEncounter(
      nextBearTurn,
      { type: 'end_turn', actor: subject.actor.id },
      () => 0.5,
    );
    expect(hitPoints(nextTargetStart.state, subject.target)).toBe(afterEscapeHitPoints);
    expect(nextTargetStart.events.some((event) =>
      event.type === 'damage_applied' && event.target === subject.target.id)).toBe(false);
  });

  it('applies a real raptor Blinded rider only after its declared DC 15 save fails, then expires at target turn end', () => {
    const row = beast('raptor', 3);
    const subject = started(row.statblock, knownTarget('blinded-rider-target'));
    const command = monsterAttackCommand(
      attack(row.statblock, 'talon-rake'), subject.actor.id, subject.target.id,
    );
    expect(command.monsterOnHit).toContainEqual(expect.objectContaining({
      kind: 'condition', condition: 'Blinded',
      savingThrow: { ability: 'constitution', dc: 15 },
      duration: 'until_end_of_target_next_turn',
    }));
    const hit = reduceEncounter(subject.state, command, () => 0.5);
    expect(hit.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved', target: subject.target.id,
      ability: 'constitution', dc: 15,
      save: expect.objectContaining({ outcome: 'failure' }),
    }));
    expect(combatantConditions(hit.state, subject.target.id)).toContainEqual({ name: 'Blinded' });

    const targetStart = reduceEncounter(
      hit.state, { type: 'end_turn', actor: subject.actor.id }, () => 0.5,
    ).state;
    expect(combatantConditions(targetStart, subject.target.id)).toContainEqual({ name: 'Blinded' });
    const targetEnd = reduceEncounter(
      targetStart, { type: 'end_turn', actor: subject.target.id }, () => 0.5,
    ).state;
    expect(combatantConditions(targetEnd, subject.target.id)).not.toContainEqual({ name: 'Blinded' });
  });

  it('a real spider Web failure restrains, then Venom Bite stacks Piercing and Poison damage with its Poisoned rider', () => {
    const row = beast('arachnid', 3);
    const subject = started(row.statblock, knownTarget('spider-rider-target'));
    const web = monsterSavingThrowCommand(
      savingThrowAction(row.statblock, 'web'), subject.actor.id, subject.target.id,
    );
    expect(web.monsterFailureEffects).toMatchObject([
      { kind: 'condition', condition: 'Restrained', escapeDc: 15, duration: 'until_escape' },
    ]);
    const webbed = reduceEncounter(subject.state, web, () => 0);
    expect(webbed.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved', dc: 15, save: expect.objectContaining({ outcome: 'failure' }),
    }));
    expect(combatantConditions(webbed.state, subject.target.id)).toContainEqual({ name: 'Restrained' });

    const targetTurn = reduceEncounter(
      webbed.state, { type: 'end_turn', actor: subject.actor.id }, () => 0.5,
    ).state;
    const nextSpiderTurn = reduceEncounter(
      targetTurn, { type: 'end_turn', actor: subject.target.id }, () => 0.5,
    ).state;
    const beforeBite = hitPoints(nextSpiderTurn, subject.target);
    const bitten = reduceEncounter(
      nextSpiderTurn,
      monsterAttackCommand(attack(row.statblock, 'venom-bite'), subject.actor.id, subject.target.id),
      () => 0.5,
    );
    const resolved = attackEvent(bitten.events);
    expect(resolved.damage?.terms.map((term) => term.type)).toEqual(['Piercing', 'Poison']);
    expect(hitPoints(bitten.state, subject.target)).toBe(beforeBite - (resolved.damage?.total ?? 0));
    expect(combatantConditions(bitten.state, subject.target.id)).toEqual(expect.arrayContaining([
      { name: 'Restrained' }, { name: 'Poisoned' },
    ]));
  });

  it('rider_applies_on_miss: the same bear, raptor, and spider attacks deal no damage and apply no effects when they miss', () => {
    for (const [family, actionId] of [
      ['ursine', 'bear-hug'],
      ['raptor', 'talon-rake'],
      ['arachnid', 'venom-bite'],
    ] as const) {
      const row = beast(family, 3);
      const subject = started(row.statblock, knownTarget(`${family}-miss-target`));
      const before = hitPoints(subject.state, subject.target);
      const missed = reduceEncounter(
        subject.state,
        monsterAttackCommand(attack(row.statblock, actionId), subject.actor.id, subject.target.id),
        () => 0,
      );
      expect(attackEvent(missed.events).attack.outcome, family).toBe('miss');
      expect(hitPoints(missed.state, subject.target), family).toBe(before);
      expect(missed.state.effects, family).toEqual([]);
      expect(combatantConditions(missed.state, subject.target.id), family).toEqual([]);
    }
  });

  it('declared_effect_skipped: executes Life Drain base effects while omitting its delayed zombie lifecycle', () => {
    const row = STARTER_MONSTER_ROSTER.find((candidate) => candidate.id === 'statblock:wight');
    if (row === undefined) throw new Error('Missing Wight row.');
    const subject = started(row.statblock, knownTarget('zombie-raise-target'));
    const lifeDrain = savingThrowAction(row.statblock, 'life-drain');
    expect(lifeDrain.failure.effects.map((effect) => effect.kind)).toEqual([
      'hit_point_maximum_reduction', 'raises_as_zombie',
    ]);
    const command = monsterSavingThrowCommand(lifeDrain, subject.actor.id, subject.target.id);
    expect(command.monsterFailureEffects).toEqual([
      { kind: 'hit_point_maximum_reduction', amount: 'damage_taken' },
    ]);
    const before = hitPoints(subject.state, subject.target);
    const result = reduceEncounter(
      subject.state,
      command,
      () => 0,
    );
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'save_resolved',
      source: subject.actor.id,
      target: subject.target.id,
      save: expect.objectContaining({ outcome: 'failure' }),
    }));
    expect(hitPoints(result.state, subject.target)).toBe(before - 3);
    expect(result.state.effects).toContainEqual(expect.objectContaining({
      targets: [subject.target.id],
      payload: { kind: 'hit_point_maximum_modifier', amount: -3 },
    }));
  });
});
