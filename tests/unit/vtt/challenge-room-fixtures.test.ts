import { describe, expect, it } from 'vitest';
import { declareTestInputs } from '../../helpers/test-inputs';
import { canonicalJson } from '../../../src/commands/canonical-json';
import { traceCombatantLine } from '../../../src/combat/cover';
import { encounterMovementWorld } from '../../../src/combat/encounter-movement-world';
import { findPath, findPathToAny } from '../../../src/combat/movement';
import { feet, type CombatantId } from '../../../src/combat/values';
import { defaultEncounterAlertingState } from '../../../src/combat/alerting';
import { decodeArenaBasisEnvelopeV1, decodeSessionSnapshotV1 } from '../../../src/vtt/arena-fixture';
import {
  CHALLENGE_ROOM_IDS,
  decodeChallengeRoomProvenanceV1,
  type ChallengeRoomProvenanceV1,
  type OptionSelectorV1,
} from '../../../src/vtt/challenge-room-fixture';
import {
  LEGACY_BASIS_V1_NORMALIZED_OMISSIONS,
  decodeEncounterStateV1,
} from '../../../src/vtt/encounter-state-codec';
import { canonicalEngineQueryPort } from '../../../src/vtt/engine-query-port';
import { resolveEngineActorOption, availableEngineActorOptions } from '../../../src/vtt/intent-resolver';
import { actorOpportunityReport } from '../../../src/vtt/intel/opportunity-cost';
import { generateRoom, type GeneratedRoom } from '../../../src/vtt/room-generator';

const SEEDS = [5_831_001, 5_831_002, 5_831_003, 5_831_004] as const;
const ENVELOPE_PATHS = {
  5_831_001: 'tests/fixtures/arena-basis-challenge/seed-5831001.json',
  5_831_002: 'tests/fixtures/arena-basis-challenge/seed-5831002.json',
  5_831_003: 'tests/fixtures/arena-basis-challenge/seed-5831003.json',
  5_831_004: 'tests/fixtures/arena-basis-challenge/seed-5831004.json',
} as const;
const SIDECAR_PATHS = {
  5_831_001: 'tests/fixtures/arena-basis-challenge/seed-5831001.provenance.json',
  5_831_002: 'tests/fixtures/arena-basis-challenge/seed-5831002.provenance.json',
  5_831_003: 'tests/fixtures/arena-basis-challenge/seed-5831003.provenance.json',
  5_831_004: 'tests/fixtures/arena-basis-challenge/seed-5831004.provenance.json',
} as const;
const FIXTURE_INPUTS = [
  ...Object.values(ENVELOPE_PATHS),
  ...Object.values(SIDECAR_PATHS),
  'tests/fixtures/arena-basis-brutal/seed-6203001.json',
  'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
] as const;
const testInputs = declareTestInputs({ fixtures: FIXTURE_INPUTS });
type FixtureInputPath = typeof FIXTURE_INPUTS[number];

async function json(path: FixtureInputPath): Promise<unknown> {
  return JSON.parse(testInputs.fixtures.readText(path)) as unknown;
}

async function room(seed: typeof SEEDS[number]): Promise<GeneratedRoom> {
  return decodeArenaBasisEnvelopeV1(await json(ENVELOPE_PATHS[seed]), { mode: 'challenge' });
}

async function sidecar(seed: typeof SEEDS[number]): Promise<ChallengeRoomProvenanceV1> {
  return decodeChallengeRoomProvenanceV1(await json(SIDECAR_PATHS[seed]));
}

function objectClone(value: unknown): Record<string, unknown> {
  const cloned: unknown = structuredClone(value);
  if (typeof cloned !== 'object' || cloned === null || Array.isArray(cloned)) throw new TypeError('Expected object clone.');
  return cloned as Record<string, unknown>;
}

function stateRecord(envelope: Record<string, unknown>): Record<string, unknown> {
  const encounter = objectClone(envelope['encounter']);
  envelope['encounter'] = encounter;
  const state = objectClone(encounter['state']);
  encounter['state'] = state;
  return state;
}

function monsterId(loaded: GeneratedRoom, suffix: string): CombatantId {
  const found = loaded.encounter.state.combatants.find((entry) => String(entry.profile.id).endsWith(suffix));
  if (found === undefined) throw new Error(`Missing monster ${suffix}.`);
  return found.profile.id;
}

function selectorMatches(
  state: GeneratedRoom['encounter']['state'],
  actorId: CombatantId,
  selector: OptionSelectorV1,
): readonly ReturnType<typeof availableEngineActorOptions>[number][] {
  return availableEngineActorOptions(state, actorId, canonicalEngineQueryPort, state.revision).filter((option) => {
    const main = option.actionSlots.find((slot) => slot.slot === 'main');
    const bonus = option.actionSlots.find((slot) => slot.slot === 'bonus');
    if (main === undefined || main.use.kind !== selector.requiredMainKind) return false;
    const mainActionId = main.use.kind === 'attack' || main.use.kind === 'multiattack'
      ? main.use.actionId
      : null;
    const components = main.use.kind === 'multiattack'
      ? main.use.components.map((component) => ({
          kind: component.kind,
          actionId: component.actionId,
          targetIds: component.target.kind === 'combatant' ? [component.target.combatantId] : [],
        }))
      : main.use.kind === 'attack'
        ? [{
            kind: main.use.kind,
            actionId: main.use.actionId,
            targetIds: main.use.target.kind === 'combatant' ? [main.use.target.combatantId] : [],
          }]
        : [];
    const bonusSpellId = bonus?.use.kind === 'cast_spell' ? bonus.use.spellId : null;
    const bonusTargetIds = bonus?.use.kind === 'cast_spell'
      ? bonus.use.targets.flatMap((target) => target.kind === 'combatant' ? [target.combatantId] : [])
      : [];
    const resolved = resolveEngineActorOption(state, option, canonicalEngineQueryPort);
    if (!resolved.valid) return false;
    return mainActionId === selector.mainActionId && canonicalJson(components) === canonicalJson(selector.orderedComponents) &&
      bonusSpellId === selector.requiredBonusSpellId && canonicalJson(bonusTargetIds) === canonicalJson(selector.bonusTargetIds) &&
      selector.activationChoice === null &&
      (selector.movement === 'hold' ? resolved.mechanics.movementCostFeet === 0 : resolved.mechanics.movementCostFeet > 0);
  });
}

describe('D583 challenge room fixtures', () => {
  it('accepts the D583 challenge basis in B C A D seed order', async () => {
    const decoded = await Promise.all(SEEDS.map(async (seed) => ({ room: await room(seed), sidecar: await sidecar(seed) })));
    expect(decoded.map((entry) => entry.sidecar.roomId)).toEqual(CHALLENGE_ROOM_IDS);
    expect(decoded.map((entry) => entry.room.spec.seed)).toEqual(SEEDS);
  });

  it('rejects a challenge snapshot that violates state or spec agreement', async () => {
    const envelope = objectClone(await json(ENVELOPE_PATHS[5_831_001]));
    const spec = objectClone(envelope['spec']);
    envelope['spec'] = spec;
    spec['blockedCells'] = [];
    expect(() => decodeArenaBasisEnvelopeV1(envelope, { mode: 'challenge' }))
      .toThrow('spec and state blocked cells do not agree');
  });

  it('rejects duplicate ids illegal occupancy and inconsistent active initiative', async () => {
    const original = await json(ENVELOPE_PATHS[5_831_001]);
    const duplicate = objectClone(original);
    const duplicateState = stateRecord(duplicate);
    const combatants = structuredClone(duplicateState['combatants']) as unknown[];
    const first = objectClone(combatants[0]);
    const second = objectClone(combatants[1]);
    second['profile'] = structuredClone(first['profile']);
    combatants[1] = second;
    duplicateState['combatants'] = combatants;
    expect(() => decodeArenaBasisEnvelopeV1(duplicate, { mode: 'challenge' })).toThrow('Combatant ids must be unique');

    const occupied = objectClone(original);
    const occupiedState = stateRecord(occupied);
    const tokens = structuredClone(occupiedState['tokens']) as unknown[];
    const firstToken = objectClone(tokens[0]);
    const secondToken = objectClone(tokens[1]);
    secondToken['position'] = structuredClone(firstToken['position']);
    tokens[1] = secondToken;
    occupiedState['tokens'] = tokens;
    expect(() => decodeArenaBasisEnvelopeV1(occupied, { mode: 'challenge' })).toThrow('have illegal occupancy');

    const inconsistent = objectClone(original);
    stateRecord(inconsistent)['activeInitiativeIndex'] = 1;
    expect(() => decodeArenaBasisEnvelopeV1(inconsistent, { mode: 'challenge' })).toThrow('Active initiative');
  });

  it('room B proves no-cover Fighter half-cover Wizard and a 20 foot Medium-only gate path', async () => {
    const loaded = await room(5_831_001);
    const state = loaded.encounter.state;
    const ogre = monsterId(loaded, '-ogre');
    expect(traceCombatantLine(state, ogre, 'combatant:fighter' as CombatantId)).toMatchObject({ tier: 'none', blocksSight: false });
    expect(traceCombatantLine(state, ogre, 'combatant:wizard' as CombatantId)).toMatchObject({ tier: 'half', blocksSight: false });
    expect(canonicalEngineQueryPort.reach(state, { actorId: ogre, targetId: 'combatant:fighter' as CombatantId, actionId: 'javelin' })).toMatchObject({ legal: true, distanceFeet: 25 });
    expect(canonicalEngineQueryPort.reach(state, { actorId: ogre, targetId: 'combatant:wizard' as CombatantId, actionId: 'javelin' })).toMatchObject({ legal: true, distanceFeet: 30 });
    expect(actorOpportunityReport(state, ogre, canonicalEngineQueryPort, 0).defaultOption.label).toBe('Javelin -> combatant:wizard');
    expect(findPath(encounterMovementWorld(state), {
      actorId: 'combatant:fighter' as CombatantId,
      start: { column: 9, row: 5 }, goal: { column: 5, row: 5 }, maximumCost: feet(30),
    })).toEqual({ kind: 'found', cells: [{ column: 8, row: 4 }, { column: 7, row: 5 }, { column: 6, row: 4 }, { column: 5, row: 5 }], cost: 20 });
    expect(findPath(encounterMovementWorld(state), {
      actorId: ogre, start: { column: 3, row: 4 }, goal: { column: 9, row: 5 }, maximumCost: feet(200),
    }).kind).toBe('unreachable');
  });

  it('room C canonical corner traces prove total cover before and exposure after approach in all three placements', async () => {
    const base = await room(5_831_002);
    const ogre = monsterId(base, '-ogre');
    const placements = [
      { wizard: { column: 11, row: 4 }, end: { column: 9, row: 4 } },
      { wizard: { column: 12, row: 4 }, end: { column: 10, row: 4 } },
      { wizard: { column: 12, row: 5 }, end: { column: 10, row: 4 } },
    ] as const;
    for (const placement of placements) {
      const state = {
        ...structuredClone(base.encounter.state),
        tokens: base.encounter.state.tokens.map((token) => token.combatantId === 'combatant:wizard'
          ? { ...structuredClone(token), position: { ...placement.wizard } }
          : structuredClone(token)),
      };
      const fighterTrace = traceCombatantLine(state, 'combatant:fighter' as CombatantId, ogre);
      const clericTrace = traceCombatantLine(state, 'combatant:cleric' as CombatantId, ogre);
      expect(fighterTrace).toMatchObject({ tier: 'total', blocksSight: true });
      expect(clericTrace).toMatchObject({ tier: 'total', blocksSight: true });
      expect(fighterTrace.lines).toHaveLength(4);
      expect(fighterTrace.lines.every((line) => line.blocksSight)).toBe(true);
      expect(clericTrace.lines).toHaveLength(4);
      expect(clericTrace.lines.every((line) => line.blocksSight)).toBe(true);
      expect(traceCombatantLine(state, ogre, 'combatant:wizard' as CombatantId)).toMatchObject({ tier: 'none', blocksSight: false });
      const defaultOption = actorOpportunityReport(state, ogre, canonicalEngineQueryPort, state.revision).defaultOption;
      expect(defaultOption.label).toBe('Greatclub -> combatant:wizard');
      const resolved = resolveEngineActorOption(state, defaultOption, canonicalEngineQueryPort);
      expect(resolved.valid).toBe(true);
      if (!resolved.valid) throw new Error(resolved.summary);
      expect(resolved.mechanics.finalPosition).toEqual(placement.end);
      const world = encounterMovementWorld(state);
      const fighterReply = findPath(world, {
        actorId: 'combatant:fighter' as CombatantId,
        start: { column: 12, row: 1 }, goal: { column: 11, row: 3 }, maximumCost: feet(30),
      });
      const clericReply = findPathToAny(world, {
        actorId: 'combatant:cleric' as CombatantId,
        start: { column: 12, row: 8 }, maximumCost: feet(30),
        isGoal: (cell) => cell.column === 11 && cell.row === 6,
      });
      expect(fighterReply).toMatchObject({ kind: 'found', cost: 10 });
      expect(clericReply).toMatchObject({ kind: 'found', cost: 10 });
      const approached = {
        ...state,
        tokens: state.tokens.map((token) => token.combatantId === ogre
          ? { ...token, position: { ...placement.end } }
          : token),
      };
      expect(traceCombatantLine(approached, 'combatant:fighter' as CombatantId, ogre, {
        sourceAnchor: { column: 11, row: 3 },
      })).toMatchObject({ tier: 'none', blocksSight: false });
      expect(traceCombatantLine(approached, 'combatant:cleric' as CombatantId, ogre, {
        sourceAnchor: { column: 11, row: 6 },
      })).toMatchObject({ tier: 'none', blocksSight: false });
    }
  });

  it('room A offers identical attacks with and without Knight-targeted Healing Word', async () => {
    const loaded = await room(5_831_003);
    const state = loaded.encounter.state;
    const priest = monsterId(loaded, '-priest');
    const knight = monsterId(loaded, '-knight');
    const livingAllies = state.combatants.filter((entry) => entry.profile.kind === 'monster' && entry.profile.id !== priest && entry.life === 'living')
      .map((entry) => entry.profile.id).sort((left, right) => left.localeCompare(right));
    expect(livingAllies[0]).toBe(knight);
    const options = availableEngineActorOptions(state, priest, canonicalEngineQueryPort, state.revision);
    const maceOptions = options.filter((option) => option.label.startsWith('Mace + Mace -> combatant:wizard'));
    const withoutHealing = maceOptions.find((option) => option.actionSlots.length === 1);
    const withHealing = maceOptions.find((option) => option.actionSlots.some((slot) =>
      slot.slot === 'bonus' && slot.use.kind === 'cast_spell' && slot.use.spellId === 'healing-word' &&
      slot.use.targets.length === 1 && slot.use.targets[0]?.kind === 'combatant' &&
      slot.use.targets[0].combatantId === knight));
    expect(withoutHealing).toBeDefined();
    expect(withHealing).toBeDefined();
    expect(withHealing?.actionSlots[0]).toEqual(withoutHealing?.actionSlots[0]);
    const healing = state.combatants.find((entry) => entry.profile.id === priest)?.limitedResources
      ?.find((resource) => String(resource.id).endsWith(':healing-word'));
    expect(healing).toMatchObject({ maximum: 3, remaining: 3 });
  });

  it('room D has exactly one Guard-occupied passage and two Scout firing lanes', async () => {
    const loaded = await room(5_831_004);
    const state = loaded.encounter.state;
    const guard = monsterId(loaded, '-guard');
    const scouts = state.combatants.filter((entry) => entry.profile.kind === 'monster' && entry.profile.name === 'Scout')
      .map((entry) => entry.profile.id).sort((left, right) => left.localeCompare(right));
    expect(Array.from({ length: 12 }, (_unused, row) => row).filter((row) =>
      !state.blockedCells.some((cell) => cell.column === 7 && cell.row === row))).toEqual([5]);
    expect(state.tokens.find((token) => token.combatantId === guard)?.position).toEqual({ column: 7, row: 5 });
    expect(actorOpportunityReport(state, guard, canonicalEngineQueryPort, 0).defaultOption.label).toBe('Spear -> combatant:wizard');
    expect(traceCombatantLine(state, scouts[0]!, 'combatant:fighter' as CombatantId)).toMatchObject({ tier: 'half', blocksSight: false });
    expect(traceCombatantLine(state, scouts[1]!, 'combatant:wizard' as CombatantId)).toMatchObject({ tier: 'three_quarters', blocksSight: false });
  });

  it('all challenge rooms expose complete bright lighting and D576 terrain profiles', async () => {
    for (const seed of SEEDS) {
      const loaded = await room(seed);
      const state = loaded.encounter.state;
      const brightCells = new Set(state.environment.lightRegions.filter((region) => region.level === 'bright')
        .flatMap((region) => region.cells.map((cell) => `${String(cell.column)},${String(cell.row)}`)));
      expect(brightCells.size).toBe(180);
      expect(loaded.spec.terrain.filter((feature) => feature.kind === 'wall').length).toBeGreaterThan(0);
      expect(loaded.spec.terrain.filter((feature) => feature.kind === 'cover-object').length).toBeGreaterThan(0);
    }
  });

  it('retained brutal basis accepts only documented v1 omissions and round trips canonical state', async () => {
    expect(LEGACY_BASIS_V1_NORMALIZED_OMISSIONS).toEqual([
      'combatants[].profile.rules.sizeCategory for the three reference PCs and bundled monsters',
      'tokens[].placementMode',
      'environment.narrowOpeningRegions',
      'sharedSpaceRelations',
      'adjudicationPending',
      'observationHistory',
    ]);
    const raw = objectClone(await json('tests/fixtures/arena-basis-brutal/seed-6203001.json'));
    for (const fixturePath of [
      'tests/fixtures/arena-basis-brutal/seed-6203001.json',
      'tests/fixtures/arena-basis-los-cover-v1/seed-5762001.json',
    ] as const) {
      const envelope = objectClone(await json(fixturePath));
      const loaded = decodeArenaBasisEnvelopeV1(envelope, { mode: 'legacy_basis' });
      const fixtureState = stateRecord(envelope);
      expect(canonicalJson(decodeEncounterStateV1(fixtureState, 'legacy_basis'))).toBe(canonicalJson(loaded.encounter.state));
    }
    const rawState = stateRecord(raw);
    delete rawState['bounds'];
    expect(() => decodeEncounterStateV1(rawState, 'legacy_basis')).toThrow('missing key bounds');
  });

  it('fresh generated pre-initiative basis keeps empty initiative', () => {
    const generated = generateRoom(394_302);
    const loaded = decodeArenaBasisEnvelopeV1(generated, { mode: 'legacy_basis' });
    expect(loaded.encounter.state.initiative).toEqual([]);
    expect(loaded.encounter.state.activeCombatant).toBeNull();
    expect(loaded.encounter.state.activeInitiativeIndex).toBeNull();
  });

  it('session snapshot round trips without RoomSpec', async () => {
    const state = (await room(5_831_001)).encounter.state;
    const snapshot = { encounter: { state } };
    expect(canonicalJson(decodeSessionSnapshotV1(JSON.parse(canonicalJson(snapshot)) as unknown))).toBe(canonicalJson(state));
    expect(() => decodeSessionSnapshotV1({ spec: {}, ...snapshot })).toThrow('unknown key spec');

    const nearbyNpc = state.initiative[0]?.combatant;
    if (nearbyNpc === undefined) throw new Error('Challenge fixture omitted its active monster.');
    const alerting = defaultEncounterAlertingState(state.combatants.map((entry) => entry.profile.id));
    const participantInitiative = state.initiative.slice(1);
    const participantState = {
      ...structuredClone(state),
      alerting: {
        ...alerting,
        membership: alerting.membership.map((entry) => entry.combatant === nearbyNpc
          ? { kind: 'nearby_npc' as const, combatant: nearbyNpc }
          : entry),
      },
      initiative: participantInitiative,
      activeCombatant: participantInitiative[0]?.combatant ?? null,
      activeInitiativeIndex: participantInitiative.length === 0 ? null : 0,
    };
    expect(canonicalJson(decodeSessionSnapshotV1({ encounter: { state: participantState } })))
      .toBe(canonicalJson(participantState));
    expect(() => decodeEncounterStateV1(participantState, 'challenge'))
      .toThrow('challenge initiative must contain every encounter participant exactly once');
  });

  it('launcher-written EngineRoundSession snapshot uses the session entry point', async () => {
    const state = (await room(5_831_002)).encounter.state;
    const bytes = canonicalJson({ encounter: { state } });
    expect(canonicalJson(decodeSessionSnapshotV1(JSON.parse(bytes) as unknown))).toBe(canonicalJson(state));
  });

  it('challenge requires complete initiative and zero omissions', async () => {
    const empty = objectClone(await json(ENVELOPE_PATHS[5_831_001]));
    const state = stateRecord(empty);
    state['initiative'] = [];
    state['activeCombatant'] = null;
    state['activeInitiativeIndex'] = null;
    expect(() => decodeArenaBasisEnvelopeV1(empty, { mode: 'challenge' })).toThrow('requires nonempty complete initiative');
    const omitted = objectClone(await json(ENVELOPE_PATHS[5_831_001]));
    const omittedState = stateRecord(omitted);
    const tokens = structuredClone(omittedState['tokens']) as unknown[];
    const token = objectClone(tokens[0]);
    delete token['placementMode'];
    tokens[0] = token;
    omittedState['tokens'] = tokens;
    expect(() => decodeArenaBasisEnvelopeV1(omitted, { mode: 'challenge' })).toThrow('missing key placementMode');
  });

  it('sidecars match envelope seed room and family', async () => {
    const expected = [
      ['B', 1, 'interrupt_imminent_threat'], ['C', 4, 'retain_safe_firing_position'],
      ['A', 2, 'preserve_allied_turn'], ['D', 5, 'hold_bottleneck'],
    ] as const;
    for (const [index, seed] of SEEDS.entries()) {
      const loaded = await room(seed);
      const provenance = await sidecar(seed);
      expect([provenance.roomId, provenance.flawFamily, provenance.flawName]).toEqual(expected[index]);
      expect(provenance.seed).toBe(loaded.spec.seed);
      expect(provenance.robustness.kind).toBe(provenance.certification === 'feasibility_candidate' ? 'pending_spike' : 'validated');
      expect(loaded.encounter.state.combatants.some((entry) => entry.profile.id === provenance.actorId)).toBe(true);
      expect(selectorMatches(loaded.encounter.state, provenance.actorId, provenance.engineTop)).toHaveLength(1);
      expect(selectorMatches(loaded.encounter.state, provenance.actorId, provenance.certifiedAlternative)).toHaveLength(1);
    }
    const mutant = objectClone(await json(SIDECAR_PATHS[5_831_001]));
    mutant['seed'] = 5_831_002;
    expect(() => decodeChallengeRoomProvenanceV1(mutant)).toThrow('do not correspond');
  });
});
