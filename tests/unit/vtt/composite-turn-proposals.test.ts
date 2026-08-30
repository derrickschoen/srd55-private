import { describe, expect, it } from 'vitest';
import { monsterCombatantProfile, type CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  monsterSpellResourcePoolId,
  type MonsterSpellcastingAction,
} from '../../../src/combat/statblock';
import { SCOUT, SPY } from '../../../src/combat/statblocks/mercenary-company';
import { PRIEST } from '../../../src/combat/statblocks/monsters';
import { armorClass, worldObjectId } from '../../../src/combat/values';
import type { WorldObject } from '../../../src/combat/world-objects';
import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import {
  availableEngineActorOptions,
  pureTurnProposalResolver,
  resolveEngineActorOption,
} from '../../../src/vtt/intent-resolver';
import {
  engineActionId,
  engineOptionId,
  type EngineActorOption,
  type EngineTurnProposal,
} from '../../../src/vtt/turn-proposal';
import { placedToken, playerProfile } from '../combat/fixtures';

function monsterProfile(
  statblock: typeof SCOUT | typeof SPY | typeof PRIEST,
  key: string,
  initiativeBonus = 100,
): CombatantProfile {
  const profile = monsterCombatantProfile(statblock, {
    combatantId: `combatant:${key}`,
    tokenId: `token:${key}`,
  });
  return { ...profile, rules: { ...profile.rules, initiativeBonus } };
}

function encounter(
  monsters: readonly { readonly profile: CombatantProfile; readonly column: number; readonly row: number }[],
  targetColumn: number,
  worldObjects: readonly WorldObject[] = [],
): EncounterState {
  const target = playerProfile('target', { hitPoints: 200, initiativeBonus: -100 });
  return freshMonsterPlanningState(createEncounter({
    bounds: { columns: 40, rows: 10 },
    combatants: [...monsters.map((entry) => entry.profile), target],
    tokens: [
      ...monsters.map((entry) => placedToken(entry.profile, entry.column, entry.row)),
      placedToken(target, targetColumn, 2),
    ],
    worldObjects,
  }));
}

function proposalFor(state: EncounterState, option: EngineActorOption): EngineTurnProposal {
  return {
    actorId: option.actorId,
    expectedRevision: option.revision,
    primaryOptionId: option.optionId,
    fallbackOptionId: null,
    overrideJustification: null,
  };
}

function authorize(state: EncounterState, option: EngineActorOption): AuthorizedEngineTurnProposal {
  const proposal = proposalFor(state, option);
  const resolution = pureTurnProposalResolver.resolve(state, proposal);
  if (!resolution.valid) {
    throw new Error(`Composite fixture was refused: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
  }
  return {
    proposal,
    option: resolution.option,
    primaryOption: resolution.primaryOption,
    fallbackOption: resolution.fallbackOption,
    mechanics: resolution.mechanics,
    selectedBranch: resolution.selectedBranch,
  };
}

function mainMultiattack(option: EngineActorOption, actionId: string, count: number): boolean {
  return option.actionSlots.some((slot) => slot.slot === 'main' && slot.use.kind === 'multiattack' &&
    slot.use.components.length === count && slot.use.components.every((component) => component.actionId === actionId));
}

describe('complete action economy and composite turn proposals', () => {
  it('projects fresh options for every requested generated-room monster turn', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis-hard/seed-5117005.json');
    const scoutId = 'combatant:generated-5117005-monster-3';
    const runtime = createEngineMcpRuntime(state, { revision: 1 });
    const scout = runtime.feed.current().projection.combatants.find((actor) => actor.id === scoutId);
    const labels = scout?.options.map((option) => option.label) ?? [];

    expect(labels).toContain('Longbow + Longbow -> combatant:fighter');
    expect(labels).toContain('Longbow + Longbow -> combatant:cleric');
    expect(labels).toContain('Longbow + Longbow -> combatant:wizard');
    expect(labels).toContain('Dodge');
  });

  it('offers and executes Scout Longbow twice in one main action', () => {
    const scout = monsterProfile(SCOUT, 'scout');
    const state = encounter([{ profile: scout, column: 0, row: 2 }], 20);
    const option = availableEngineActorOptions(state, scout.id)
      .find((candidate) => mainMultiattack(candidate, 'longbow', 2) && candidate.actionSlots.length === 1);
    if (option === undefined) throw new Error('Scout Longbow ×2 option is absent.');

    expect(option.label).toBe('Longbow + Longbow -> combatant:target');
    const authorized = authorize(state, option);
    expect(authorized.mechanics.actionSlots.map((use) => ({ slot: use.slot, kind: use.kind, actionId: use.actionId })))
      .toEqual([
        { slot: 'main', kind: 'attack', actionId: 'longbow' },
        { slot: 'main', kind: 'attack', actionId: 'longbow' },
      ]);

    const session = new EngineRoundSession(state, mulberry32(418_201), { kind: 'unattended', askDefault: 'decline' });
    session.applyResolvedMechanics([authorized], null);
    expect(session.currentState().eventLog.filter((event) =>
      event.type === 'attack_resolved' && event.actor === scout.id))
      .toHaveLength(2);
  });

  it('executes Priest movement, Radiant Flame twice, and Divine Aid Bless in one turn', () => {
    const priest = monsterProfile(PRIEST, 'priest');
    const state = encounter([{ profile: priest, column: 0, row: 2 }], 13);
    const option = availableEngineActorOptions(state, priest.id).find((candidate) =>
      mainMultiattack(candidate, 'radiant-flame', 2) &&
      candidate.actionSlots.some((slot) => slot.slot === 'bonus' && slot.use.kind === 'cast_spell' &&
        slot.use.sourceActionId === 'divine-aid' && slot.use.spellId === 'bless'));
    if (option === undefined) throw new Error('Priest Radiant Flame ×2 + Divine Aid Bless option is absent.');

    expect(option.label).toBe(
      'Radiant Flame + Radiant Flame -> combatant:target + divine-aid/bless (3/3)',
    );
    const authorized = authorize(state, option);
    expect(authorized.mechanics.movementCostFeet).toBe(5);
    expect(authorized.mechanics.actionSlots.map((use) => ({
      slot: use.slot,
      kind: use.kind,
      actionId: use.actionId,
      spellId: use.spellId,
    }))).toEqual([
      { slot: 'main', kind: 'attack', actionId: 'radiant-flame', spellId: null },
      { slot: 'main', kind: 'attack', actionId: 'radiant-flame', spellId: null },
      { slot: 'bonus', kind: 'cast_spell', actionId: 'divine-aid', spellId: 'bless' },
    ]);

    const session = new EngineRoundSession(state, mulberry32(418_202), { kind: 'unattended', askDefault: 'decline' });
    session.applyResolvedMechanics([authorized], null);
    const after = session.currentState();
    expect(after.eventLog.filter((event) =>
      event.type === 'attack_resolved' && event.actor === priest.id))
      .toHaveLength(2);
    expect(after.eventLog).toContainEqual(expect.objectContaining({
      type: 'spell_cast', caster: priest.id, spellId: 'bless', targets: [priest.id],
    }));
    expect(after.tokens.find((token) => token.combatantId === priest.id)?.position.column).toBe(1);
    expect(after.combatants.find((combatant) => combatant.profile.id === priest.id)?.limitedResources)
      .toContainEqual(expect.objectContaining({ id: 'monster-spell:divine-aid:bless', remaining: 2 }));
  });

  it('spends the correct slot for Cunning Action utilities and applies Dash before movement', () => {
    const spy = monsterProfile(SPY, 'spy');
    const adjacent = encounter([{ profile: spy, column: 0, row: 2 }], 1);
    const disengage = availableEngineActorOptions(adjacent, spy.id).find((candidate) =>
      candidate.label === 'Shortsword -> combatant:target + Cunning Action/Disengage');
    if (disengage === undefined) throw new Error('Spy attack + bonus Disengage option is absent.');

    const disengageSession = new EngineRoundSession(
      adjacent,
      mulberry32(418_203),
      { kind: 'unattended', askDefault: 'decline' },
    );
    disengageSession.applyResolvedMechanics([authorize(adjacent, disengage)], null);
    const resourceEvents = disengageSession.currentState().eventLog.flatMap((event) =>
      event.type === 'resource_spent' && event.combatant === spy.id ? [event.resource] : []);
    expect(resourceEvents).toEqual(['action', 'bonus_action']);
    expect(disengageSession.currentState().eventLog).toContainEqual(expect.objectContaining({
      type: 'stance_started', combatant: spy.id, stance: 'disengaging',
    }));

    const distant = encounter([{ profile: spy, column: 0, row: 2 }], 10);
    const attackAndDash = availableEngineActorOptions(distant, spy.id).find((candidate) =>
      candidate.label === 'Shortsword -> combatant:target + Cunning Action/Dash');
    if (attackAndDash === undefined) throw new Error('Spy attack + bonus Dash option is absent.');
    expect(attackAndDash.movement.preference.maximumFeet).toBe(60);

    const dashSession = new EngineRoundSession(
      distant,
      mulberry32(418_204),
      { kind: 'unattended', askDefault: 'decline' },
    );
    dashSession.applyResolvedMechanics([authorize(distant, attackAndDash)], null);
    expect(dashSession.currentState().tokens.find((token) => token.combatantId === spy.id)?.position.column)
      .toBe(9);
    expect(dashSession.currentState().eventLog.flatMap((event) =>
      event.type === 'resource_spent' && event.combatant === spy.id ? [event.resource] : []))
      .toEqual(['bonus_action', 'action']);
  });

  it('excludes spent main slots, spent bonus slots, and exhausted limited spell uses', () => {
    const priest = monsterProfile(PRIEST, 'priest-spent');
    const available = encounter([{ profile: priest, column: 0, row: 2 }], 8);
    const spentMain: EncounterState = {
      ...available,
      combatants: available.combatants.map((combatant) => combatant.profile.id === priest.id
        ? { ...combatant, turn: { ...combatant.turn, action: { kind: 'spent' } } }
        : combatant),
    };
    expect(availableEngineActorOptions(spentMain, priest.id)).toEqual([]);

    const spentBonus: EncounterState = {
      ...available,
      combatants: available.combatants.map((combatant) => combatant.profile.id === priest.id
        ? { ...combatant, turn: { ...combatant.turn, bonusActionAvailable: false } }
        : combatant),
    };
    expect(availableEngineActorOptions(spentBonus, priest.id).every((option) =>
      option.actionSlots.every((slot) => slot.slot === 'main'))).toBe(true);

    const reference = PRIEST.sourceDetails.bonusActions.kind === 'present'
      ? PRIEST.sourceDetails.bonusActions.value
          .find((action): action is MonsterSpellcastingAction =>
            action.kind === 'spellcasting' && action.id === 'divine-aid')?.spells
          .find((spell) => spell.id === 'bless')
      : undefined;
    if (reference === undefined) throw new Error('Priest Bless reference is absent.');
    const poolId = monsterSpellResourcePoolId('divine-aid', reference);
    if (poolId === null) throw new Error('Priest Bless should have a limited resource pool.');
    const priestResources = available.combatants.find((combatant) => combatant.profile.id === priest.id)
      ?.limitedResources;
    if (priestResources === undefined) throw new Error('Priest limited resources are absent.');
    const exhausted: EncounterState = {
      ...available,
      combatants: available.combatants.map((combatant) => combatant.profile.id === priest.id
        ? {
            ...combatant,
            limitedResources: priestResources.map((pool) =>
              pool.id === poolId ? { ...pool, remaining: 0 } : pool),
          }
        : combatant),
    };
    expect(availableEngineActorOptions(exhausted, priest.id).some((option) =>
      option.actionSlots.some((slot) => slot.use.kind === 'cast_spell' && slot.use.spellId === 'bless')))
      .toBe(false);
  });

  it('rejects a multiattack when even one declared component is illegal', () => {
    const scout = monsterProfile(SCOUT, 'partial-scout');
    const state = encounter([{ profile: scout, column: 0, row: 2 }], 8);
    const illegal: EngineActorOption = {
      optionId: engineOptionId('option:partial-illegal'),
      actorId: scout.id,
      revision: state.revision,
      label: 'Longbow plus homebrew missing attack',
      movement: {
        preference: { willingness: 'only_if_required', maximumFeet: 30, opportunityRisk: 'avoid' },
        engagement: {
          stance: 'maintain_range',
          anchor: { kind: 'combatant', combatantId: playerProfile('target').id },
        },
      },
      actionSlots: [{
        slot: 'main',
        use: {
          kind: 'multiattack',
          actionId: engineActionId('multiattack'),
          components: [
            { kind: 'attack', actionId: engineActionId('longbow'), target: { kind: 'combatant', combatantId: playerProfile('target').id } },
            { kind: 'attack', actionId: engineActionId('homebrew-missing'), target: { kind: 'combatant', combatantId: playerProfile('target').id } },
          ],
        },
      }],
      resourceCostLabels: [],
    };
    expect(resolveEngineActorOption(state, illegal)).toEqual({
      valid: false,
      code: 'MULTIATTACK_COMBINATION_ILLEGAL',
      summary: 'combatant:partial-scout: Longbow plus homebrew missing attack is unavailable',
    });
  });

  it('offers eligible world-object class actions, omits ineligible ones, and never exposes the DM override command', () => {
    const scout = monsterProfile(SCOUT, 'object-scout');
    const actorObject: WorldObject = {
      id: worldObjectId('world-object:signal-bell'),
      name: 'Signal Bell',
      kind: 'generic',
      position: { column: 1, row: 2 },
      footprint: [{ column: 1, row: 2 }],
      durability: { kind: 'indestructible' },
      armorClass: armorClass(12),
      damageResponses: [],
      blocking: { movement: false, lineOfSight: false, cover: 'none' },
      classActions: [{
        id: 'ring-signal-bell',
        label: 'Ring the signal bell',
        cost: 'action',
        reach: 'adjacent',
        uses: 'once',
        eligibleActor: 'monster',
        dmOverride: { actor: scout.id, reasoning: 'The encounter script may force the alarm.' },
      }],
      createdRevision: 0,
    };
    const eligible = encounter([{ profile: scout, column: 0, row: 2 }], 8, [actorObject]);
    const offered = availableEngineActorOptions(eligible, scout.id)
      .find((option) => option.actionSlots.some((slot) =>
        slot.use.kind === 'use_world_object' && slot.use.actionId === 'ring-signal-bell'));
    expect(offered?.label).toBe('ring-signal-bell @ Signal Bell');
    expect(JSON.stringify(offered)).not.toContain('dm_use_world_object');

    const classActions = actorObject.classActions;
    if (classActions === undefined) throw new Error('Signal Bell class actions are absent.');
    const ineligibleObject: WorldObject = {
      ...actorObject,
      classActions: classActions.map((action) => ({
        ...action,
        eligibleActor: 'player_character' as const,
      })),
    };
    const ineligible = encounter([{ profile: scout, column: 0, row: 2 }], 8, [ineligibleObject]);
    expect(availableEngineActorOptions(ineligible, scout.id).some((option) =>
      option.actionSlots.some((slot) => slot.use.kind === 'use_world_object'))).toBe(false);
  });

  it('names both complete Scout and Priest sequences in projected options and MCP context', () => {
    const scout = monsterProfile(SCOUT, 'r02-scout');
    const priest = monsterProfile(PRIEST, 'r02-priest');
    const state = encounter([
      { profile: scout, column: 0, row: 1 },
      { profile: priest, column: 0, row: 3 },
    ], 10);
    const runtime = createEngineMcpRuntime(state, { revision: 42 });
    const capsule = runtime.feed.current();
    const labels = capsule.projection.combatants.flatMap((actor) => actor.options.map((option) => option.label));
    expect(labels).toContain('Longbow + Longbow -> combatant:target');
    expect(labels).toContain(
      'Radiant Flame + Radiant Flame -> combatant:target + divine-aid/bless (3/3)',
    );

    const context = runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: 42,
      scope: 'round',
    });
    expect(JSON.stringify(context)).toContain('Longbow + Longbow -> combatant:target');
    expect(JSON.stringify(context)).toContain(
      'Radiant Flame + Radiant Flame -> combatant:target + divine-aid/bless (3/3)',
    );
  });
});
