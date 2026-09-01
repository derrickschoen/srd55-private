import { describe, expect, it } from 'vitest';
import { combatantConditions } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import { affectedCells } from '../../../src/combat/templates';
import { combatantId } from '../../../src/combat/values';
import { loadContentPack } from '../../../src/content/content-pack';
import { engineConcentrationActive } from '../../../src/vtt/engine-query-port';
import { EngineRoundSession, type AuthorizedEngineTurnProposal } from '../../../src/vtt/engine-round-session';
import {
  availableEngineActorOptions,
  pureTurnProposalResolver,
  resolveEngineActorOption,
} from '../../../src/vtt/intent-resolver';
import { createEngineMcpRuntime, freshMonsterPlanningState, loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import type { EngineActorOption, EngineTurnProposal } from '../../../src/vtt/turn-proposal';
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
    expect(control).toMatchObject({
      kind: 'cast_spell',
      action_slots: [expect.objectContaining({ kind: 'cast_spell', spell_id: 'hypnotic-pattern' })],
    });
    expect(damage).toMatchObject({ kind: 'attack', action_id: 'multiattack' });
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
