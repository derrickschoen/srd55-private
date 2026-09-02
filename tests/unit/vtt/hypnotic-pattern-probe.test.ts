import { describe, expect, it } from 'vitest';
import { combatantConditions } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { affectedCells } from '../../../src/combat/templates';
import { combatantId } from '../../../src/combat/values';
import { loadContentPack } from '../../../src/content/content-pack';
import { engineConcentrationActive } from '../../../src/vtt/engine-query-port';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
import {
  availableEngineActorOptions,
  pureTurnProposalResolver,
  resolveEngineActorOption,
} from '../../../src/vtt/intent-resolver';
import { createEngineMcpRuntime, freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import type { EngineActorOption, EngineTurnProposal } from '../../../src/vtt/turn-proposal';
import { actorOpportunityReport, submissionDominance } from '../../../src/vtt/intel/opportunity-cost';
import { scoreTeamPlans } from '../../../src/vtt/intel/team-scorer';
import {
  DEFAULT_RENDERER_PROFILE,
  renderProseTurnContext,
  renderTurnContextProfile,
} from '../../../src/vtt/renderer-profile';
import { readFileSync } from '../../helpers/test-filesystem';

const FIXTURE = 'tests/fixtures/arena-scenarios/hypnotic-pattern-cc.json';
const CASTER = combatantId('combatant:d432-incubus');
const PC_IDS = [
  'combatant:d432-cleric',
  'combatant:d432-fighter',
  'combatant:d432-rogue',
  'combatant:d432-wizard',
] as const;

function record(value: unknown, label: string): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${label} must be an object.`);
  }
  return value as Readonly<Record<string, unknown>>;
}

function mainUse(option: EngineActorOption) {
  return option.actionSlots.find((slot) => slot.slot === 'main')?.use;
}

function hypnoticOption(options: readonly EngineActorOption[]): EngineActorOption {
  const option = options.find((candidate) => {
    const use = mainUse(candidate);
    return use?.kind === 'cast_spell' && use.spellId === 'hypnotic-pattern';
  });
  if (option === undefined) throw new Error('Hypnotic Pattern option is absent.');
  return option;
}

function damageOption(options: readonly EngineActorOption[]): EngineActorOption {
  const option = options.find((candidate) => {
    const use = mainUse(candidate);
    return use?.kind === 'multiattack' && use.components.every((component) =>
      component.actionId === 'restless-touch' && component.target.kind === 'combatant' &&
      component.target.combatantId === 'combatant:d432-wizard');
  });
  if (option === undefined) throw new Error('Restless Touch damage option is absent.');
  return option;
}

function proposal(stateRevision: number, option: EngineActorOption): EngineTurnProposal {
  return {
    actorId: CASTER,
    expectedRevision: stateRevision,
    primaryOptionId: option.optionId,
    fallbackOptionId: null,
    overrideJustification: null,
  };
}

describe('D432 Hypnotic Pattern control probe', () => {
  it('loads the frozen SRD-sourced caster fixture with its prepared use and level-3 slot', async () => {
    const state = await loadArenaFixture(FIXTURE);
    const caster = state.combatants.find((candidate) => candidate.profile.id === CASTER);
    if (caster?.profile.kind !== 'monster') throw new Error('Fixture Incubus is absent.');

    expect(caster.profile).toMatchObject({ name: 'Incubus', statblockId: 'd432_srd:incubus' });
    expect(caster.profile.rules.spellSlots).toContainEqual({ level: 3, maximum: 1 });
    expect(caster.spellSlots).toContainEqual({ level: 3, maximum: 1, remaining: 1 });
    expect(caster.limitedResources).toContainEqual({
      id: 'monster-spell:spellcasting:hypnotic-pattern',
      maximum: 1,
      recharge: 'long_rest',
      remaining: 1,
    });

    const decoded = record(JSON.parse(readFileSync(FIXTURE, 'utf8')) as unknown, 'fixture');
    const encounter = record(decoded['encounter'], 'fixture encounter');
    const rawState = record(encounter['state'], 'fixture state');
    const packs = rawState['contentPacks'];
    if (!Array.isArray(packs)) throw new TypeError('Fixture content packs are absent.');
    const pack = record(packs[0], 'fixture content pack');
    expect(record(pack['provenance'], 'fixture content provenance')).toMatchObject({
      sourceName: 'System Reference Document 5.2.1',
      sourceKind: 'srd',
    });
    const reloaded = loadContentPack(pack['pack']);
    expect(reloaded.status).toBe('loaded');
    if (reloaded.status !== 'loaded') throw new Error(`SRD fixture pack was refused: ${reloaded.refusal.reason}.`);
    expect(reloaded.content.monsters[0]?.actions).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: 'multiattack', id: 'multiattack' }),
      expect.objectContaining({ kind: 'spellcasting', id: 'spellcasting' }),
    ]));
  });

  it('advertises a legal friendly-safe 30-foot cube covering all four separated PCs and legal damage', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const options = availableEngineActorOptions(state, CASTER);
    const control = hypnoticOption(options);
    const damage = damageOption(options);
    const use = mainUse(control);
    if (use?.kind !== 'cast_spell' || use.area?.shape !== 'cube') {
      throw new Error('Hypnotic Pattern did not retain its cube placement.');
    }

    expect(control.label).toBe(
      'spellcasting/hypnotic-pattern (1/1) [30-ft cube -> combatant:d432-cleric, combatant:d432-fighter, combatant:d432-rogue, combatant:d432-wizard]',
    );
    expect(use.area.template.size).toBe(30);
    expect(use.targets.map((selector) => selector.kind === 'combatant' ? selector.combatantId : null))
      .toEqual(PC_IDS);
    const cells = new Set(affectedCells({ bounds: state.bounds, blockedCells: [] }, use.area)
      .map((cell) => `${String(cell.column)},${String(cell.row)}`));
    const affected = state.tokens.filter((token) =>
      cells.has(`${String(token.position.column)},${String(token.position.row)}`))
      .map((token) => token.combatantId)
      .sort((left, right) => left.localeCompare(right));
    expect(affected).toEqual(PC_IDS);
    expect(affected).not.toContain(CASTER);

    const controlResolution = resolveEngineActorOption(state, control);
    const damageResolution = resolveEngineActorOption(state, damage);
    expect(controlResolution.valid).toBe(true);
    expect(damageResolution.valid).toBe(true);
    if (!damageResolution.valid) throw new Error(damageResolution.summary);
    expect(new Set(damageResolution.mechanics.actionSlots.flatMap((slot) => slot.targetIds)))
      .toEqual(new Set(['combatant:d432-wizard']));
    expect(damageResolution.mechanics.movementCostFeet).toBe(0);

    const positions = new Map(state.tokens.map((token) => [token.combatantId, token.position] as const));
    for (const left of PC_IDS) {
      for (const right of PC_IDS) {
        if (left >= right) continue;
        const a = positions.get(combatantId(left));
        const b = positions.get(combatantId(right));
        if (a === undefined || b === undefined) throw new Error('PC position is absent.');
        const distance = Math.max(Math.abs(a.column - b.column), Math.abs(a.row - b.row)) * 5;
        expect(distance).toBeGreaterThanOrEqual(25);
      }
    }
  });

  it('renders both candidate actions in a no-model turn context', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const runtime = createEngineMcpRuntime(state);
    const capsule = runtime.feed.current();
    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
      run_id: capsule.runId,
      expected_revision: capsule.revision,
      scope: 'round',
      granularity: 'full',
      intel_mode: 'full',
    }), 'turn context');
    const actors = context['actors'];
    if (!Array.isArray(actors)) throw new TypeError('Turn-context actors are absent.');
    const actor = actors.map((entry) => record(entry, 'turn-context actor'))
      .find((entry) => entry['actor_id'] === CASTER);
    if (actor === undefined || !Array.isArray(actor['options'])) throw new Error('Incubus options are absent.');
    const options = actor['options'].map((entry) => record(entry, 'advertised option'));
    const control = options.find((option) => option['label'] ===
      'spellcasting/hypnotic-pattern (1/1) [30-ft cube -> combatant:d432-cleric, combatant:d432-fighter, combatant:d432-rogue, combatant:d432-wizard]');
    const damage = options.find((option) => option['label'] ===
      'Restless Touch + Restless Touch -> combatant:d432-wizard');
    if (control === undefined) throw new Error('Hypnotic Pattern option is absent.');
    expect(control).toMatchObject({
      kind: 'cast_spell',
      action_slots: [expect.objectContaining({ kind: 'cast_spell', spell_id: 'hypnotic-pattern' })],
      expectation: {
        kind: 'hard_control',
        resolvable: true,
        metric: 'control',
        expected_initially_affected: 3.2,
        expected_control_burden: 6.214656,
        expected_disabled_turns: 4.816896,
        expected_wake_actions: 1.39776,
        resource_penalty: 0.5,
        net_action_equivalents: 5.714656,
        policy: 'option-outcome-v1',
        target_fail_probabilities: expect.arrayContaining([
          expect.objectContaining({ probability: 0.8, side: 'hostile' }),
        ]),
        initial_count_distribution: [
          { numerator: 1, denominator: 625 },
          { numerator: 16, denominator: 625 },
          { numerator: 96, denominator: 625 },
          { numerator: 256, denominator: 625 },
          { numerator: 256, denominator: 625 },
        ],
        assumption_codes: expect.any(Array),
        expected_initially_affected_exact: { numerator: 16, denominator: 5 },
        expected_control_burden_exact: { numerator: 97104, denominator: 15625 },
        expected_disabled_turns_exact: { numerator: 75264, denominator: 15625 },
        expected_wake_actions_exact: { numerator: 4368, denominator: 3125 },
        resource_penalty_exact: { numerator: 1, denominator: 2 },
        net_action_equivalents_exact: { numerator: 178583, denominator: 31250 },
        horizon_rounds: 3,
        concentration_survival_exact: { numerator: 4, denominator: 5 },
        concentration_exposure: 'exposed',
      },
    });
    expect(damage).toMatchObject({ kind: 'attack', action_id: 'multiattack' });
    expect(damage).toMatchObject({
      usable_now: true,
      usable_after_movement: true,
      minimum_movement_feet: 0,
      expectation: expect.objectContaining({
        kind: 'damage',
        resolvable: true,
        metric: 'damage',
        expected_value: 21.2,
        expected_value_exact: { numerator: 106, denominator: 5 },
        kill_probability_exact: { numerator: 14329861, denominator: 54419558400 },
        net_action_equivalents_exact: { numerator: 2310764334427, denominator: 6530347008000 },
      }),
    });

    const opportunity = actorOpportunityReport(state, CASTER, canonicalEngineQueryPort, state.revision);
    const controlOption = hypnoticOption(availableEngineActorOptions(state, CASTER));
    const damageEngineOption = damageOption(availableEngineActorOptions(state, CASTER));
    expect(opportunity.defaultOption.optionId).toBe(controlOption.optionId);
    expect(opportunity.frontierResolution).toBe('fully_resolved');
    expect(opportunity.options.flatMap((entry) => entry.status === 'unresolved' ? entry.reasons : []))
      .not.toContain('cast_spell_outcome_unresolved');
    expect(submissionDominance(opportunity, damageEngineOption.optionId)).toMatchObject({
      status: 'dominated',
      alternative: { option: { optionId: controlOption.optionId } },
    });
    expect(submissionDominance(opportunity, controlOption.optionId).status).toBe('not_dominated');

    const team = scoreTeamPlans(state, [
      { candidateId: 'control', label: 'Control', proposals: [proposal(state.revision, controlOption)] },
      { candidateId: 'damage', label: 'Damage', proposals: [proposal(state.revision, damageEngineOption)] },
    ], canonicalEngineQueryPort);
    expect(team.frontierResolution).toBe('fully_resolved');
    expect(team.frontier.map((entry) => entry.candidate.candidateId)).toEqual(['control']);
    expect(team.removed).toEqual([
      expect.objectContaining({
        candidate: expect.objectContaining({ candidate: expect.objectContaining({ candidateId: 'damage' }) }),
        dominatedBy: expect.objectContaining({ candidate: expect.objectContaining({ candidateId: 'control' }) }),
      }),
    ]);

    const filtered = renderTurnContextProfile(context, {
      ...DEFAULT_RENDERER_PROFILE,
      format: 'structured',
    });
    for (const style of ['regular_prose', 'caveman_prose'] as const) {
      const rendered = renderProseTurnContext(filtered.context, style, filtered.optionRefs, 10 * 1024 * 1024);
      const document = String(rendered.context['document']);
      expect(document).toContain(String(control['option_id']));
      expect(document).toContain('3.2 caught initially');
      expect(document).toContain('6.214656 expected enemy actions');
      expect(document).toContain('4.816896 lost turns');
      expect(document).toContain('1.39776 wake actions');
      expect(document).toContain('0.5 limited-use penalty');
      expect(document).toContain('5.714656 net action-equivalents');
      expect(document).toContain('21.2 damage');
    }
  });

  it('keeps a friendly caught by geometry in the mechanical target selectors', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const crowded = {
      ...state,
      bounds: { columns: 6, rows: 6 },
      blockedCells: [],
      tokens: state.tokens.map((token, index) => ({
        ...token,
        position: { column: index, row: index },
      })),
    };
    const option = hypnoticOption(availableEngineActorOptions(crowded, CASTER));
    const cast = option.actionSlots.find((slot) => slot.use.kind === 'cast_spell')?.use;
    if (cast?.kind !== 'cast_spell') throw new Error('Crowded control option has no spell use.');
    expect(cast.targets).toContainEqual({ kind: 'combatant', combatantId: CASTER });
    expect(option.label).toContain(`allies ${CASTER}`);
  });

  it('resolves the advertised cube into Charmed plus Incapacitated effects and concentration', async () => {
    const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
    const option = hypnoticOption(availableEngineActorOptions(state, CASTER));
    const declared = proposal(state.revision, option);
    const resolution = pureTurnProposalResolver.resolve(state, declared);
    if (!resolution.valid) {
      throw new Error(`Hypnotic Pattern was not authorizable: ${resolution.refusals.map((entry) => entry.code).join(', ')}`);
    }
    const authorized: AuthorizedEngineTurnProposal = {
      proposal: declared,
      option: resolution.option,
      primaryOption: resolution.primaryOption,
      fallbackOption: resolution.fallbackOption,
      mechanics: resolution.mechanics,
      selectedBranch: resolution.selectedBranch,
    };
    const session = new EngineRoundSession(state, mulberry32(2), { kind: 'unattended', askDefault: 'decline' });
    session.applyResolvedMechanics([authorized], null);
    const after = session.currentState();

    expect(PC_IDS.map((id) => combatantConditions(after, combatantId(id)).map((condition) => condition.name).sort()))
      .toEqual(PC_IDS.map(() => ['Charmed', 'Incapacitated']));
    expect(engineConcentrationActive(after, CASTER)).toBe(true);
    expect(after.effects.filter((effect) => effect.concentrationOwner === CASTER)
      .flatMap((effect) => effect.targets).sort((left, right) => left.localeCompare(right)))
      .toEqual(PC_IDS);
    expect(after.combatants.find((candidate) => candidate.profile.id === CASTER)?.limitedResources)
      .toContainEqual(expect.objectContaining({ id: 'monster-spell:spellcasting:hypnotic-pattern', remaining: 0 }));
    expect(after.combatants.find((candidate) => candidate.profile.id === CASTER)?.spellSlots)
      .toContainEqual({ level: 3, maximum: 1, remaining: 1 });
  });

  it('mints the same placement and option ids from repeated fixture loads', async () => {
    const first = availableEngineActorOptions(
      freshMonsterPlanningState(await loadArenaFixture(FIXTURE)),
      CASTER,
    );
    const second = availableEngineActorOptions(
      freshMonsterPlanningState(await loadArenaFixture(FIXTURE)),
      CASTER,
    );
    expect(second).toEqual(first);
    expect(hypnoticOption(second).optionId).toBe(hypnoticOption(first).optionId);
  });
});
