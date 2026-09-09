import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import { combatantConditions } from '../../../src/combat/combat-rules';
import { mulberry32 } from '../../../src/combat/random';
import { UNICORN } from '../../../src/combat/statblocks/monsters';
import { combatantId, effectStackingIdentity } from '../../../src/combat/values';
import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
import { mechanicsWithChoice } from '../../../src/vtt/intent-resolver';
import { createEngineMcpRuntime } from '../../../src/vtt/mcp/entrypoint';
import { freshMonsterPlanningState } from '../../../src/vtt/monster-planning-state';
import {
  engineActionId,
  engineOptionId,
  engineSpellId,
  type EngineActivationChoice,
  type EngineOfferableOption,
  type ResolvedTurnMechanics,
} from '../../../src/vtt/turn-proposal';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const UNICORN_ID = combatantId('combatant:unicorn-consistency');
const ALLY_ID = combatantId('combatant:ally-consistency');

function fixture(conditioned: boolean): EncounterState {
  const unicornBase = monsterCombatantProfile(UNICORN, {
    combatantId: UNICORN_ID,
    tokenId: 'token:unicorn-consistency',
  });
  const unicorn = {
    ...unicornBase,
    rules: { ...unicornBase.rules, initiativeBonus: 100 },
  };
  const ally = monsterProfile('ally-consistency', { hitPoints: 20, initiativeBonus: -10 });
  const enemy = playerProfile('unicorn-consistency-enemy', {
    hitPoints: 50,
    initiativeBonus: -100,
  });
  let state = createEncounter({
    bounds: { columns: 20, rows: 8 },
    combatants: [unicorn, ally, enemy],
    tokens: [
      placedToken(unicorn, 2, 2),
      placedToken(ally, 4, 2),
      placedToken(enemy, 10, 2),
    ],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  state = {
    ...state,
    combatants: state.combatants.map((combatant) => combatant.profile.id === ally.id
      ? { ...combatant, hitPoints: 1 }
      : combatant),
  };
  if (conditioned) {
    state = reduceEncounter(state, {
      type: 'apply_effect',
      actor: unicorn.id,
      cost: 'none',
      effect: {
        targets: [ally.id],
        duration: { kind: 'permanent' },
        concentration: false,
        stackingIdentity: effectStackingIdentity('test:unicorn-blessing-poisoned'),
        stacking: 'replace_any_source',
        repeatedSave: null,
        payload: { kind: 'condition', condition: 'Poisoned' },
      },
    }, () => 0.5).state;
  }
  return freshMonsterPlanningState(state);
}

function executeCureWounds(state: EncounterState): void {
  const runtime = createEngineMcpRuntime(state, {
    requestedActorIds: [UNICORN_ID],
    revision: 1,
  });
  const capsule = runtime.feed.current();
  const context = runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
  });
  const actor = capsule.projection.combatants.find((entry) => entry.id === UNICORN_ID);
  const primary = actor?.options.find((option) =>
    option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'cast_spell' &&
      slot.use.sourceActionId === 'spellcasting') &&
    option.actionSlots.some((slot) => slot.slot === 'bonus' && slot.use.kind === 'cast_spell' &&
      slot.use.sourceActionId === 'unicorns-blessing'));
  if (primary === undefined) throw new Error('Unicorn composite spell option is absent.');
  const fallback = actor?.options.find((option) => option.label === 'Dodge');
  if (fallback === undefined) throw new Error('Unicorn Dodge fallback is absent.');
  const result = runtime.toolSurface.execute('engine.submit_round_proposals', {
    state_ref: typeof context === 'object' && context !== null && 'state_ref' in context
      ? context.state_ref
      : null,
    request_id: capsule.request?.requestId,
    phase: 'initial',
    idempotency_key: 'unicorn-blessing-consistency-0001',
    proposals: [{
      actor_id: UNICORN_ID,
      expected_revision: capsule.revision,
      primary_option_id: primary.optionId,
      fallback_option_id: fallback.optionId,
      reason: 'Conceal the group while restoring the wounded ally.',
      override_justification: { kind: 'objective' },
      activation_choice: { kind: 'unicorns_blessing_spell', value: 'cure-wounds' },
    }],
  });
  if (typeof result !== 'object' || result === null || !('status' in result) || result.status !== 'proposed') {
    throw new Error(`Unicorn MCP proposal was not accepted: ${JSON.stringify(result)}`);
  }
  const envelope = runtime.proposals[0];
  if (envelope?.kind !== 'round_turn_proposal') throw new Error('Accepted Unicorn round envelope is absent.');
  const accepted = envelope.resolutions[0];
  if (accepted === undefined) throw new Error('Accepted Unicorn resolution is absent.');
  expect(accepted.mechanics.actionSlots.filter((slot) => slot.kind === 'cast_spell').map((slot) => ({
    slot: slot.slot,
    actionId: slot.actionId,
    spellId: slot.spellId,
    choiceKind: slot.activationChoice?.kind ?? null,
  }))).toEqual([
    { slot: 'main', actionId: 'spellcasting', spellId: 'entangle', choiceKind: null },
    {
      slot: 'bonus', actionId: 'unicorns-blessing', spellId: 'cure-wounds',
      choiceKind: 'unicorns_blessing_spell',
    },
  ]);
  const session = new EngineRoundSession(state, mulberry32(6_208_005), {
    kind: 'unattended', askDefault: 'decline',
  });
  session.applyResolvedMechanics([accepted], null);
  const after = session.currentState();
  expect(after.combatants.find((entry) => entry.profile.id === ALLY_ID)?.hitPoints).toBeGreaterThan(1);
  expect(after.eventLog).toContainEqual(expect.objectContaining({
    type: 'spell_cast', caster: UNICORN_ID, spellId: 'cure-wounds', targets: [ALLY_ID],
  }));
}

describe('Unicorn’s Blessing offer/acceptance/execution consistency', () => {
  it.each([
    {
      choice: { kind: 'command_word', value: 'halt' },
      spellId: 'command',
    },
    {
      choice: { kind: 'dispel_evil_and_good_mode', value: 'dismissal' },
      spellId: 'dispel-evil-and-good',
    },
    {
      choice: {
        kind: 'calm_emotions_per_target',
        selections: [{ targetId: ALLY_ID, mode: 'suppress_charmed_frightened' }],
      },
      spellId: 'calm-emotions',
    },
  ] satisfies readonly { readonly choice: EngineActivationChoice; readonly spellId: string }[])(
    'attaches $choice.kind to its owning spell when an earlier cast exists',
    ({ choice, spellId }) => {
      const option: EngineOfferableOption = {
        optionId: engineOptionId('option:choice-owner-audit'),
        actorId: UNICORN_ID,
        revision: 1,
        label: 'Choice ownership audit',
        movement: {
          preference: { willingness: 'none', maximumFeet: 0, opportunityRisk: 'avoid' },
          engagement: { stance: 'hold_position' },
        },
        actionSlots: [
          {
            slot: 'main',
            use: {
              kind: 'cast_spell', sourceActionId: engineActionId('earlier-source'),
              spellId: engineSpellId('entangle'), targets: [], area: null,
            },
          },
          {
            slot: 'bonus',
            use: {
              kind: 'cast_spell', sourceActionId: engineActionId('choice-owner'),
              spellId: engineSpellId(spellId), targets: [], area: null,
            },
          },
        ],
        resourceCostLabels: [],
        omittedRiders: [],
      };
      const mechanics: ResolvedTurnMechanics = {
        actorId: UNICORN_ID,
        optionId: option.optionId,
        movementCostFeet: 0,
        path: [],
        finalPosition: { column: 0, row: 0 },
        actionSlots: option.actionSlots.map((slot) => ({
          slot: slot.slot,
          kind: 'cast_spell' as const,
          actionId: slot.use.kind === 'cast_spell' ? slot.use.sourceActionId : engineActionId('unreachable'),
          spellId: slot.use.kind === 'cast_spell' ? slot.use.spellId : null,
          targetIds: [], objectId: null, omittedRiders: [],
        })),
        omittedRiders: [],
      };

      const resolved = mechanicsWithChoice(mechanics, choice, option);

      expect(resolved.actionSlots.map((slot) => slot.activationChoice?.kind ?? null))
        .toEqual([null, choice.kind]);
    },
  );

  it('executes Cure Wounds from the bonus source after a main Spellcasting cast', () => {
    executeCureWounds(fixture(true));
  });

  it('accepts the legacy Lesser Restoration choice and executes its engine-offered condition', () => {
    const state = fixture(true);
    const runtime = createEngineMcpRuntime(state, {
      requestedActorIds: [UNICORN_ID],
      revision: 1,
    });
    const capsule = runtime.feed.current();
    const context = runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
    });
    const actor = capsule.projection.combatants.find((entry) => entry.id === UNICORN_ID);
    const primary = actor?.options.find((option) =>
      option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'dodge') &&
      option.actionSlots.some((slot) => slot.slot === 'bonus' && slot.use.kind === 'cast_spell' &&
        slot.use.sourceActionId === 'unicorns-blessing'));
    const fallback = actor?.options.find((option) => option.label === 'Dodge');
    if (primary === undefined || fallback === undefined) throw new Error('Unicorn MCP options are absent.');
    expect(primary.activationChoice).toMatchObject({
      kind: 'unicorns_blessing_spell',
      values: ['cure-wounds', 'lesser-restoration'],
    });
    expect(primary.label).toContain('Lesser Restoration condition: Poisoned');
    expect(JSON.stringify(context)).toContain('Lesser Restoration condition: Poisoned');
    expect(JSON.stringify(context)).not.toContain('"conditions"');
    expect(actor?.options.some((option) => option.label.includes('condition: Frightened'))).toBe(false);
    const result = runtime.toolSurface.execute('engine.submit_round_proposals', {
      state_ref: typeof context === 'object' && context !== null && 'state_ref' in context
        ? context.state_ref
        : null,
      request_id: capsule.request?.requestId,
      phase: 'initial',
      idempotency_key: 'unicorn-restoration-consistency-0001',
      proposals: [{
        actor_id: UNICORN_ID,
        expected_revision: capsule.revision,
        primary_option_id: primary.optionId,
        fallback_option_id: fallback.optionId,
        reason: 'Conceal the group while curing the poisoned ally.',
        override_justification: { kind: 'objective' },
        activation_choice: { kind: 'unicorns_blessing_spell', value: 'lesser-restoration' },
      }],
    });
    if (typeof result !== 'object' || result === null || !('status' in result) || result.status !== 'proposed') {
      throw new Error(`Unicorn MCP proposal was not accepted: ${JSON.stringify(result)}`);
    }
    const envelope = runtime.proposals[0];
    if (envelope?.kind !== 'round_turn_proposal') throw new Error('Accepted Unicorn round envelope is absent.');
    const accepted = envelope.resolutions[0];
    if (accepted === undefined) throw new Error('Accepted Unicorn resolution is absent.');
    expect(accepted.mechanics.actionSlots.find((slot) => slot.slot === 'bonus')).toMatchObject({
      actionId: 'unicorns-blessing',
      spellId: 'lesser-restoration',
      selectedCondition: 'Poisoned',
      activationChoice: { kind: 'unicorns_blessing_spell', value: 'lesser-restoration' },
    });
    const session = new EngineRoundSession(state, mulberry32(6_208_011), {
      kind: 'unattended', askDefault: 'decline',
    });
    session.applyResolvedMechanics([accepted], null);
    expect(combatantConditions(session.currentState(), ALLY_ID).map((condition) => condition.name))
      .not.toContain('Poisoned');
  });

  it('does not offer Lesser Restoration when the chosen ally has no removable condition', () => {
    const state = fixture(false);
    const runtime = createEngineMcpRuntime(state, {
      requestedActorIds: [UNICORN_ID],
      revision: 1,
    });
    const actor = runtime.feed.current().projection.combatants.find((entry) => entry.id === UNICORN_ID);
    const blessingOptions = actor?.options.filter((option) => option.actionSlots.some((slot) =>
      slot.slot === 'bonus' && slot.use.kind === 'cast_spell' &&
      slot.use.sourceActionId === 'unicorns-blessing')) ?? [];
    expect(blessingOptions.length).toBeGreaterThan(0);
    expect(blessingOptions.every((option) =>
      option.activationChoice?.kind !== 'unicorns_blessing_spell')).toBe(true);
    expect(blessingOptions.every((option) => option.actionSlots.some((slot) =>
      slot.slot === 'bonus' && slot.use.kind === 'cast_spell' && slot.use.spellId === 'cure-wounds'))).toBe(true);
    expect(blessingOptions.every((option) => !option.label.includes('Lesser Restoration'))).toBe(true);
  });
});
