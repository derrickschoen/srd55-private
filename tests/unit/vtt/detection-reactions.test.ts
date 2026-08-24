import { describe, expect, it } from 'vitest';
import {
  createEncounter,
  detectCombatant,
  PendingDecisionRuleError,
  REACTION_KINDS,
  reduceEncounter,
  VisionTargetingRuleError,
  type EncounterState,
  type DetectionRulesEdition,
  type ReactionPolicy,
} from '../../../src/combat/encounter';
import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import type { EncounterCommand } from '../../../src/combat/events';
import { HOMEBREW_BEAST_ROSTER } from '../../../src/combat/statblocks/homebrew-beast-families';
import { feetPoint } from '../../../src/combat/templates';
import { damageType, dieSides, feet } from '../../../src/combat/values';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

function withRules(
  profile: CombatantProfile,
  patch: Partial<CombatantProfile['rules']>,
): CombatantProfile {
  const rules = { ...profile.rules, ...patch };
  return profile.kind === 'player_character'
    ? { ...profile, rules }
    : { ...profile, rules };
}

function face(value: number): () => number {
  return () => (value - 0.5) / 20;
}

function sequence(...values: readonly number[]): () => number {
  let index = 0;
  return () => {
    const value = values[index] ?? values.at(-1) ?? 10;
    index += 1;
    return (value - 0.5) / 20;
  };
}

function darkEnvironment(...cells: readonly { readonly column: number; readonly row: number }[]) {
  return {
    lightRegions: [{ id: 'darkness', cells, level: 'darkness' as const }],
    obscurementRegions: [], difficultTerrainRegions: [], movementRegions: [],
  };
}

function startedEncounter(options: {
  readonly actor?: CombatantProfile;
  readonly reactor?: CombatantProfile;
  readonly actorColumn?: number;
  readonly reactorColumn?: number;
  readonly edition?: DetectionRulesEdition;
  readonly policy?: ReactionPolicy;
  readonly darkness?: readonly { readonly column: number; readonly row: number }[];
} = {}): { readonly state: EncounterState; readonly actor: CombatantProfile; readonly reactor: CombatantProfile } {
  const actor = options.actor ?? playerProfile('detection-actor', { initiativeBonus: 20, spellSlots: [{ level: 1, maximum: 1 }] });
  const reactor = options.reactor ?? monsterProfile('detection-reactor', { initiativeBonus: -20 });
  const initial = createEncounter({
    ...(options.edition === undefined ? {} : { rulesEdition: options.edition }),
    bounds: { columns: 20, rows: 3 },
    combatants: [actor, reactor],
    tokens: [placedToken(actor, options.actorColumn ?? 1, 1), placedToken(reactor, options.reactorColumn ?? 0, 1)],
    ...(options.darkness === undefined ? {} : { environment: darkEnvironment(...options.darkness) }),
    ...(options.policy === undefined ? {} : {
      reactionPolicies: [{ combatant: reactor.id, reactionKind: 'opportunity_attack', policy: options.policy }],
    }),
  });
  return { state: reduceEncounter(initial, { type: 'roll_initiative' }, face(10)).state, actor, reactor };
}

function basicAttack(actor: CombatantProfile, target: CombatantProfile, requiresSight = false): Extract<EncounterCommand, { readonly type: 'attack' }> {
  return {
    type: 'attack', actor: actor.id, target: target.id, attackBonus: 0,
    criticalFloor: 20, rollMode: 'normal', attackerCanSeeTarget: true, targetCanSeeAttacker: true,
    ...(requiresSight ? { requiresSight: true as const } : {}),
    damage: {
      terms: [{ type: damageType('Slashing'), dice: { count: 0, sides: dieSides(6), modifier: 1 } }],
      critical: false, responses: [],
    },
  };
}

describe('D356 full detection vocabulary', () => {
  it('stealth_dc_off_by_one: 2024 Hide succeeds at exactly 15 and fails at 14', () => {
    // Hide DC and prerequisites: docs/srd/full/srd-5.2.1.txt:11774-11789.
    const at = startedEncounter({ darkness: [{ column: 1, row: 1 }] });
    const succeeded = reduceEncounter(at.state, { type: 'hide', actor: at.actor.id }, face(15));
    expect(succeeded.events).toContainEqual(expect.objectContaining({ type: 'hide_resolved', total: 15, outcome: 'hidden' }));
    expect(succeeded.state.hiddenCombatants).toContainEqual(expect.objectContaining({ combatant: at.actor.id, stealthTotal: 15, edition: '2024' }));

    const below = startedEncounter({ darkness: [{ column: 1, row: 1 }] });
    const failed = reduceEncounter(below.state, { type: 'hide', actor: below.actor.id }, face(14));
    expect(failed.events).toContainEqual(expect.objectContaining({ type: 'hide_resolved', total: 14, outcome: 'failed_dc' }));
    expect(failed.state.hiddenCombatants).toEqual([]);
  });

  it('keeps 2014 contested hiding distinct from the 2024 fixed DC under the edition lock', () => {
    // 2014 hiding and passive detection: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:4604-4619,4629-4645.
    const state2014 = startedEncounter({ edition: '2014', darkness: [{ column: 1, row: 1 }] });
    const hidden2014 = reduceEncounter(state2014.state, { type: 'hide', actor: state2014.actor.id }, face(14));
    expect(hidden2014.events).toContainEqual(expect.objectContaining({ type: 'hide_resolved', edition: '2014', total: 14, outcome: 'hidden' }));

    const state2024 = startedEncounter({ edition: '2024', darkness: [{ column: 1, row: 1 }] });
    const hidden2024 = reduceEncounter(state2024.state, { type: 'hide', actor: state2024.actor.id }, face(14));
    expect(hidden2024.events).toContainEqual(expect.objectContaining({ type: 'hide_resolved', edition: '2024', total: 14, outcome: 'failed_dc' }));
  });

  it('passive Perception at the hiding total immediately detects the creature', () => {
    // Passive score and equality gate: docs/srd/full/srd-5.2.1.txt:11781-11789,11965-11979.
    const observer = withRules(monsterProfile('passive-observer', { initiativeBonus: -20 }), {
      passivePerception: 15,
    });
    const setup = startedEncounter({ reactor: observer, darkness: [{ column: 1, row: 1 }] });
    const result = reduceEncounter(setup.state, { type: 'hide', actor: setup.actor.id }, face(15));
    expect(result.events).toContainEqual(expect.objectContaining({
      type: 'hide_resolved', total: 15, outcome: 'passively_detected',
    }));
    expect(result.state.hiddenCombatants).toEqual([]);
  });

  it('hidden attacker has Advantage and making the attack roll reveals it', () => {
    // Unseen attacks and reveal: docs/srd/full/srd-5.2.1.txt:884-894,11784-11789.
    const setup = startedEncounter({ darkness: [{ column: 1, row: 1 }] });
    const hidden: EncounterState = {
      ...setup.state,
      hiddenCombatants: [{ combatant: setup.actor.id, stealthTotal: 18, edition: '2024' }],
    };
    const result = reduceEncounter(hidden, basicAttack(setup.actor, setup.reactor), sequence(18, 2));
    const attack = result.events.find((event) => event.type === 'attack_resolved');
    expect(attack?.attack.roll).toMatchObject({ mode: 'advantage', faces: [18, 2], chosen: 18 });
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'hidden_ended', combatant: setup.actor.id, reason: 'attack_roll' }));
    expect(result.state.hiddenCombatants).toEqual([]);
  });

  it('sight-required attacks and spells return the typed target-not-seen refusal', () => {
    const setup = startedEncounter({ darkness: [{ column: 0, row: 1 }] });
    expect(() => reduceEncounter(setup.state, basicAttack(setup.actor, setup.reactor, true), face(15)))
      .toThrowError(VisionTargetingRuleError);
    expect(() => reduceEncounter(setup.state, {
      type: 'cast_spell', actor: setup.actor.id, spellId: 'magic-missile', slotLevel: 1,
      castAsRitual: false, casterLevel: 1, attackBonus: 3, saveDc: 11, spellcastingModifier: 1,
      targets: [setup.reactor.id, setup.reactor.id, setup.reactor.id], area: null, weaponAttack: null, selectedOption: null,
    }, face(15))).toThrowError(VisionTargetingRuleError);
  });

  it('Keen Sight drives sight-based Search Advantage and Web Sense locates creatures on the same web', () => {
    // Search: docs/srd/full/srd-5.2.1.txt:12010-12024. Keen Sight: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23547-23550.
    // Web Sense: docs/homebrew/ogl/srd-5.1/srd-5.1-ogl.txt:23501-23503.
    const raptorRow = HOMEBREW_BEAST_ROSTER.find((row) => row.design.family === 'raptor');
    const arachnidRow = HOMEBREW_BEAST_ROSTER.find((row) => row.design.family === 'arachnid');
    if (raptorRow === undefined || arachnidRow === undefined) throw new Error('Detection beasts are missing.');
    const raptor = monsterCombatantProfile(raptorRow.statblock, { combatantId: 'combatant:keen-raptor', tokenId: 'token:keen-raptor' });
    const hiddenTarget = playerProfile('keen-target', { initiativeBonus: -20 });
    const keen = startedEncounter({ actor: raptor, reactor: hiddenTarget, actorColumn: 0, reactorColumn: 2 });
    const concealed: EncounterState = {
      ...keen.state,
      hiddenCombatants: [{ combatant: hiddenTarget.id, stealthTotal: 14, edition: '2024' }],
    };
    const searched = reduceEncounter(concealed, {
      type: 'search', actor: raptor.id, target: hiddenTarget.id, reliance: 'sight',
    }, sequence(3, 15));
    expect(searched.events).toContainEqual(expect.objectContaining({ type: 'search_resolved', outcome: 'found' }));
    expect(searched.state.hiddenCombatants).toEqual([]);

    const spider = monsterCombatantProfile(arachnidRow.statblock, { combatantId: 'combatant:web-spider', tokenId: 'token:web-spider' });
    const webTarget = playerProfile('web-target', { initiativeBonus: -20 });
    const caster = playerProfile('web-caster', { initiativeBonus: 30, spellSlots: [{ level: 2, maximum: 1 }] });
    let webState = createEncounter({
      bounds: { columns: 10, rows: 5 }, combatants: [caster, spider, webTarget],
      tokens: [placedToken(caster, 6, 1), placedToken(spider, 1, 1), placedToken(webTarget, 2, 1)],
    });
    webState = reduceEncounter(webState, { type: 'roll_initiative' }, face(10)).state;
    webState = reduceEncounter(webState, {
      type: 'cast_spell', actor: caster.id, spellId: 'web', slotLevel: 2,
      castAsRitual: false, casterLevel: 3, attackBonus: 5, saveDc: 13, spellcastingModifier: 3,
      targets: [], weaponAttack: null, selectedOption: null,
      area: {
        shape: 'cube',
        template: { origin: feetPoint(0, 10), center: feetPoint(10, 10), axis: { x: 1, y: 0 }, size: feet(20), includeOrigin: false },
      },
    }, face(10)).state;
    expect(spider.rules.detectionTraits).toContain('web_sense');
    expect(detectCombatant(webState, spider.id, webTarget.id)).toEqual({ kind: 'located', sense: 'web_sense' });
  });
});

describe('D368.3 opportunity attacks and fork #18 decisions', () => {
  it('closes the unified reaction vocabulary over exactly five trigger kinds', () => {
    expect(REACTION_KINDS).toEqual([
      'hit_by_attack', 'damaged_by_creature', 'taking_damage_of_type',
      'creature_casts_spell', 'opportunity_attack',
    ]);
  });
  it('fires the fifth reaction trigger when a seen creature voluntarily leaves reach', () => {
    // Opportunity Attack trigger: docs/srd/full/srd-5.2.1.txt:933-956.
    const setup = startedEncounter();
    const moved = reduceEncounter(setup.state, {
      type: 'move', actor: setup.actor.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20));
    expect(moved.state.pendingDecisions).toHaveLength(1);
    expect(moved.state.pendingDecisions[0]).toMatchObject({ kind: 'reaction_offer', reactionKind: 'opportunity_attack', combatant: setup.reactor.id });
  });

  it('does not trigger on Disengage, teleport, or forced movement', () => {
    // Exemptions: docs/srd/full/srd-5.2.1.txt:941-956.
    const disengaging = startedEncounter();
    const disengaged = reduceEncounter(disengaging.state, { type: 'disengage', actor: disengaging.actor.id }, face(10)).state;
    expect(reduceEncounter(disengaged, {
      type: 'move', actor: disengaging.actor.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20)).state.pendingDecisions).toEqual([]);
    for (const cause of ['teleport', 'forced'] as const) {
      const setup = startedEncounter();
      expect(reduceEncounter(setup.state, {
        type: 'move', actor: setup.actor.id, path: [{ column: 2, row: 1 }], cause,
      }, face(20)).state.pendingDecisions, cause).toEqual([]);
    }
  });

  it('hidden_still_provokes: a Hidden mover does not provoke because the reactor cannot see it', () => {
    const setup = startedEncounter({ darkness: [{ column: 1, row: 1 }] });
    const hidden = reduceEncounter(setup.state, { type: 'hide', actor: setup.actor.id }, face(15)).state;
    expect(hidden.hiddenCombatants).toHaveLength(1);
    const moved = reduceEncounter(hidden, {
      type: 'move', actor: setup.actor.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20));
    expect(moved.state.pendingDecisions).toEqual([]);
  });

  it('always_policy_silent: always and never auto-resolve with explicit records', () => {
    const always = startedEncounter({ policy: 'always' });
    const fired = reduceEncounter(always.state, {
      type: 'move', actor: always.actor.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20));
    expect(fired.events).toContainEqual(expect.objectContaining({
      type: 'reaction_policy_auto_resolved', policy: 'always', resolution: 'accept', autoFired: true,
    }));
    expect(fired.events.some((event) => event.type === 'attack_resolved')).toBe(true);

    const never = startedEncounter({ policy: 'never' });
    const declined = reduceEncounter(never.state, {
      type: 'move', actor: never.actor.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20));
    expect(declined.events).toContainEqual(expect.objectContaining({
      type: 'reaction_policy_auto_resolved', policy: 'never', resolution: 'decline', autoFired: false,
    }));
    expect(declined.events.some((event) => event.type === 'attack_resolved')).toBe(false);
  });

  it('advance_past_pending: an unresolved ask decision blocks its turn boundary until explicitly resolved', () => {
    const setup = startedEncounter();
    const moved = reduceEncounter(setup.state, {
      type: 'move', actor: setup.actor.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20)).state;
    expect(() => reduceEncounter(moved, { type: 'end_turn', actor: setup.actor.id }, face(10)))
      .toThrowError(PendingDecisionRuleError);
    const decision = moved.pendingDecisions[0];
    if (decision === undefined) throw new Error('Expected queued OA decision.');
    const resolved = reduceEncounter(moved, {
      type: 'resolve_pending_decision', decisionId: decision.id, optionId: 'decline',
    }, face(10));
    expect(resolved.events).toContainEqual(expect.objectContaining({ type: 'pending_decision_resolved', optionId: 'decline' }));
    expect(resolved.state.pendingDecisions).toEqual([]);
    expect(reduceEncounter(resolved.state, { type: 'end_turn', actor: setup.actor.id }, face(10)).state.activeCombatant)
      .toBe(setup.reactor.id);
  });

  it('Flyby suppresses the real movement-triggered opportunity attack', () => {
    // Flyby: docs/srd/full/srd-5.2.1.txt:23236-23237.
    const row = HOMEBREW_BEAST_ROSTER.find((candidate) => candidate.design.family === 'pterosaur');
    if (row === undefined) throw new Error('Flyby pterosaur missing.');
    const flyer = monsterCombatantProfile(row.statblock, { combatantId: 'combatant:flyby', tokenId: 'token:flyby' });
    const reactor = withRules(playerProfile('flyby-reactor', { initiativeBonus: -20 }), { passivePerception: 20 });
    const setup = startedEncounter({ actor: flyer, reactor });
    expect(flyer.rules.detectionTraits).toContain('flyby');
    const moved = reduceEncounter(setup.state, {
      type: 'move', actor: flyer.id, path: [{ column: 2, row: 1 }], cause: 'voluntary',
    }, face(20));
    expect(moved.state.pendingDecisions).toEqual([]);
    expect(moved.events.some((event) => event.type === 'attack_resolved')).toBe(false);
  });
});
