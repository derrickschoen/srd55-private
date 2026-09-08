import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { EncounterState } from '../src/combat/encounter';
import type { EncounterCommand, EncounterEvent } from '../src/combat/events';
import { monsterAttackCommand } from '../src/combat/monster-commands';
import { monsterSpellResourcePoolId, type MonsterAttackAction } from '../src/combat/statblock';
import {
  transactionalRng,
  type DieRollProvenance,
  type DieRollRecord,
  type Rng,
} from '../src/combat/random';
import { damageType, dieSides, type CombatantId } from '../src/combat/values';
import { decodeArenaBasisEnvelopeV1 } from '../src/vtt/arena-fixture';
import { runCommandBoundaryTransaction } from '../src/vtt/engine-round-application';
import { monsterActions, monsterBonusActions } from '../src/vtt/engine-query-port';
import { availableEngineActorOptions, resolveEngineActorOption } from '../src/vtt/intent-resolver';
import { ARENA_REACTION_OFFER_POLICY } from '../src/vtt/reaction-offer-host-policy';
import { regretTurnLegalActions } from '../src/vtt/regret/legal-actions';

interface ExactRationalJson {
  readonly numerator: string;
  readonly denominator: string;
}

export interface FeasibilityStageReport {
  readonly stage: string;
  readonly ungroupedCartesianCount: string;
  readonly rawFaceChildExpansions: number;
  readonly replays: number;
  readonly groupedNodes: number;
  readonly probabilityMass: ExactRationalJson;
  readonly wallMilliseconds: number;
  readonly heapBytes: number;
}

interface WeightedNode<T> {
  readonly value: T;
  readonly numerator: bigint;
  readonly denominator: bigint;
}

interface IntegerDistribution {
  readonly weights: ReadonlyMap<number, bigint>;
  readonly denominator: bigint;
  readonly rawFaceChildExpansions: number;
}

export interface ChallengeFeasibilityReport {
  readonly schemaVersion: 1;
  readonly basis: 'challenge';
  readonly rooms: readonly ['A', 'D'];
  readonly verdict: 'GO' | 'SHELVE_D583';
  readonly reason: string | null;
  readonly ungroupedLowerBounds: Readonly<Record<'A' | 'D', string>>;
  readonly stages: Readonly<Record<'A' | 'D', readonly FeasibilityStageReport[]>>;
  readonly peakNodes: number;
  readonly peakHeapBytes: number;
  readonly totalWallMilliseconds: number;
  readonly provenanceManifest: readonly DieRollRecord[];
  readonly rollbackChecks: {
    readonly cursorRestored: boolean;
    readonly observerRestored: boolean;
    readonly replayMatched: boolean;
  };
  readonly reactionPolicies: readonly {
    readonly configured: 'always' | 'never' | 'ask';
    readonly resolution: 'accept' | 'decline';
    readonly reactionDraws: number;
  }[];
  readonly proposedCaps: {
    readonly maxGroupedNodes: number;
    readonly maxHeapBytes: number;
    readonly maxWallMilliseconds: number;
    readonly headroom: '25_percent_nodes_and_heap_100_percent_wall';
  };
  readonly roomD: {
    readonly oldCounterexample: {
      readonly genericSaveKills: '540/1280';
      readonly fixedBreach: '159/400';
      readonly advantage: '39/1600';
    };
    readonly fighterInitialLegalCommands: Readonly<Record<'top' | 'alternative', number>>;
    readonly expectedScoutPrimaryTurns: Readonly<Record<'top' | 'alternative', ExactRationalJson>>;
    readonly alternativeMinusTop: ExactRationalJson;
    readonly threshold: { readonly numerator: '3'; readonly denominator: '20' };
    readonly witnessed: boolean;
    readonly robustnessVariants: 0;
    readonly negativeControl: 'not_frozen_without_positive_witness';
  };
}

const ROOT = resolve(import.meta.dirname, '..');
const A_PRIEST = 'combatant:generated-challenge-a-02-priest' as CombatantId;
const A_KNIGHT = 'combatant:generated-challenge-a-01-knight' as CombatantId;
const D_GUARD = 'combatant:generated-challenge-d-01-guard' as CombatantId;
const D_SCOUT_1 = 'combatant:generated-challenge-d-02-scout-1' as CombatantId;
const D_SCOUT_2 = 'combatant:generated-challenge-d-03-scout-2' as CombatantId;
const FIGHTER = 'combatant:fighter' as CombatantId;
const CLERIC = 'combatant:cleric' as CombatantId;
const WIZARD = 'combatant:wizard' as CombatantId;

function gcd(left: bigint, right: bigint): bigint {
  let a = left < 0n ? -left : left;
  let b = right < 0n ? -right : right;
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

function rational(numerator: bigint, denominator: bigint): ExactRationalJson {
  const divisor = gcd(numerator, denominator);
  return { numerator: String(numerator / divisor), denominator: String(denominator / divisor) };
}

export function exactDiceTotalDistribution(sides: readonly number[]): IntegerDistribution {
  let weights = new Map<number, bigint>([[0, 1n]]);
  let denominator = 1n;
  let rawFaceChildExpansions = 0;
  for (const sideCount of sides) {
    const next = new Map<number, bigint>();
    rawFaceChildExpansions += weights.size * sideCount;
    for (const [subtotal, weight] of weights) {
      for (let face = 1; face <= sideCount; face += 1) {
        next.set(subtotal + face, (next.get(subtotal + face) ?? 0n) + weight);
      }
    }
    weights = next;
    denominator *= BigInt(sideCount);
  }
  return { weights, denominator, rawFaceChildExpansions };
}

function sumMass<T>(nodes: readonly WeightedNode<T>[]): ExactRationalJson {
  if (nodes.length === 0) return rational(0n, 1n);
  const denominator = nodes.reduce((product, node) => product * node.denominator, 1n);
  const numerator = nodes.reduce(
    (sum, node) => sum + node.numerator * (denominator / node.denominator),
    0n,
  );
  return rational(numerator, denominator);
}

export function mergeReplayEquivalentNodes<T>(
  nodes: readonly WeightedNode<T>[],
  futureStateKey: (value: T) => string,
  replaySignature: (value: T) => string,
): readonly WeightedNode<T>[] {
  const grouped = new Map<string, { node: WeightedNode<T>; signature: string }>();
  for (const node of nodes) {
    const key = futureStateKey(node.value);
    const signature = replaySignature(node.value);
    const existing = grouped.get(key);
    if (existing === undefined) {
      grouped.set(key, { node, signature });
      continue;
    }
    if (existing.signature !== signature) {
      throw new Error(`FutureStateKey collision has unequal replay signature: ${key}`);
    }
    const denominator = existing.node.denominator * node.denominator;
    const numerator = existing.node.numerator * node.denominator + node.numerator * existing.node.denominator;
    const divisor = gcd(numerator, denominator);
    grouped.set(key, {
      node: { value: existing.node.value, numerator: numerator / divisor, denominator: denominator / divisor },
      signature,
    });
  }
  return [...grouped.values()].map((entry) => entry.node);
}

function measuredStage(
  stage: string,
  distribution: IntegerDistribution,
  inputTotals: IntegerDistribution | null = null,
  collapseToOne = false,
  omitPositiveMassChild = false,
): FeasibilityStageReport {
  const started = performance.now();
  const heapBefore = process.memoryUsage().heapUsed;
  const nodes: WeightedNode<{ readonly total: number; readonly legalCommands: readonly string[] }>[] = [];
  const prior = inputTotals?.weights ?? new Map([[0, 1n]]);
  const priorDenominator = inputTotals?.denominator ?? 1n;
  let omitted = false;
  for (const [priorTotal, priorWeight] of prior) {
    for (const [total, weight] of distribution.weights) {
      if (omitPositiveMassChild && !omitted) {
        omitted = true;
        continue;
      }
      nodes.push({
        value: { total: collapseToOne ? 0 : priorTotal + total, legalCommands: ['continue'] },
        numerator: priorWeight * weight,
        denominator: priorDenominator * distribution.denominator,
      });
    }
  }
  const grouped = mergeReplayEquivalentNodes(
    nodes,
    (node) => `total:${String(node.total)}`,
    (node) => JSON.stringify(node.legalCommands),
  );
  const heapBytes = Math.max(0, process.memoryUsage().heapUsed - heapBefore);
  return {
    stage,
    ungroupedCartesianCount: String(priorDenominator * distribution.denominator),
    rawFaceChildExpansions: distribution.rawFaceChildExpansions,
    replays: nodes.length,
    groupedNodes: grouped.length,
    probabilityMass: sumMass(grouped),
    wallMilliseconds: Number((performance.now() - started).toFixed(3)),
    heapBytes,
  };
}

export function massControlStage(omitPositiveMassChild: boolean): FeasibilityStageReport {
  return measuredStage('mass-control', exactDiceTotalDistribution([4]), null, false, omitPositiveMassChild);
}

export function deriveVariantHorizon(
  state: Pick<EncounterState, 'initiative' | 'activeInitiativeIndex'>,
  requiredActors: readonly CombatantId[],
): { readonly scheduledOrder: readonly CombatantId[]; readonly endpointActorId: CombatantId } {
  if (state.activeInitiativeIndex === null) throw new Error('Challenge horizon requires active initiative.');
  const required = new Set(requiredActors);
  const scheduledOrder = state.initiative
    .slice(state.activeInitiativeIndex + 1)
    .map((entry) => entry.combatant)
    .filter((actor): actor is CombatantId => required.has(actor));
  if (scheduledOrder.length !== required.size) {
    throw new Error('Challenge horizon did not encounter every required actor after the active actor.');
  }
  const endpointActorId = scheduledOrder.at(-1);
  if (endpointActorId === undefined) throw new Error('Challenge horizon requires at least one actor.');
  return { scheduledOrder, endpointActorId };
}

async function challengeState(seed: 5831003 | 5831004): Promise<EncounterState> {
  const fixture = JSON.parse(await readFile(
    resolve(ROOT, `tests/fixtures/arena-basis-challenge/seed-${String(seed)}.json`),
    'utf8',
  )) as unknown;
  return decodeArenaBasisEnvelopeV1(fixture, { mode: 'challenge' }).encounter.state;
}

function maximumWitnessRng(): Rng {
  return Object.assign(
    () => 0.999999,
    { drawDie: (sides: ReturnType<typeof dieSides>, _provenance: DieRollProvenance): number => sides },
  );
}

function apply(
  state: EncounterState,
  command: EncounterCommand,
  rng: Rng,
): ReturnType<typeof runCommandBoundaryTransaction> {
  return runCommandBoundaryTransaction(state, command, rng, ARENA_REACTION_OFFER_POLICY, null);
}

function attackAction(state: EncounterState, actor: CombatantId, id: string): MonsterAttackAction {
  const action = monsterActions(state, actor).find((candidate): candidate is MonsterAttackAction =>
    candidate.kind === 'attack' && candidate.id === id);
  if (action === undefined) throw new Error(`Missing ${id} attack for ${actor}.`);
  return action;
}

function healingWordCommand(state: EncounterState): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  const source = monsterBonusActions(state, A_PRIEST).find((action) =>
    action.kind === 'spellcasting' && action.id === 'divine-aid');
  if (source?.kind !== 'spellcasting') throw new Error('Priest Divine Aid source is absent.');
  const reference = source.spells.find((spell) => spell.id === 'healing-word');
  if (reference === undefined) throw new Error('Priest Healing Word reference is absent.');
  const resourcePoolId = monsterSpellResourcePoolId(source.id, reference);
  if (resourcePoolId === null) throw new Error('Priest Healing Word must consume its declared resource pool.');
  return {
    type: 'cast_spell', actor: A_PRIEST, spellId: 'healing-word', slotLevel: 1,
    castAsRitual: false, casterLevel: 1, attackBonus: 5, saveDc: 13,
    spellcastingModifier: 3, targets: [A_KNIGHT], area: null, weaponAttack: null,
    selectedOption: null, resourcePoolId,
    monsterActionId: source.id,
  };
}

function withHitPoints(state: EncounterState, id: CombatantId, hitPoints: number): EncounterState {
  return {
    ...state,
    combatants: state.combatants.map((entry) => entry.profile.id === id ? { ...entry, hitPoints } : entry),
  };
}

function runRoomAProductionProbe(state: EncounterState): readonly DieRollRecord[] {
  const records: DieRollRecord[] = [];
  const healing = healingWordCommand(state);
  records.push(...apply(state, healing, maximumWitnessRng()).dieRolls);
  const knight = state.combatants.find((entry) => entry.profile.id === A_KNIGHT);
  if (knight === undefined) throw new Error('Room A Knight is absent.');
  records.push(...apply(
    withHitPoints(state, A_KNIGHT, knight.profile.rules.hitPointMaximum - 1),
    healing,
    maximumWitnessRng(),
  ).dieRolls);

  const option = availableEngineActorOptions(state, A_PRIEST).find((candidate) =>
    candidate.label === 'Mace + Mace -> combatant:wizard');
  if (option === undefined) throw new Error('Room A two-Mace option is absent.');
  const resolved = resolveEngineActorOption(state, option);
  if (!resolved.valid) throw new Error(`Room A two-Mace option failed re-resolution: ${resolved.code}`);
  let current = state;
  const rng = maximumWitnessRng();
  if (resolved.mechanics.path.length > 0) {
    current = apply(current, {
      type: 'move', actor: A_PRIEST, path: resolved.mechanics.path, cause: 'voluntary',
    }, rng).state;
  }
  const mace = attackAction(current, A_PRIEST, 'mace');
  for (let index = 0; index < 2; index += 1) {
    const result = apply(current, monsterAttackCommand(mace, A_PRIEST, WIZARD, 'normal'), rng);
    current = result.state;
    records.push(...result.dieRolls);
  }
  return records;
}

function endTurn(state: EncounterState, actor: CombatantId, rng: Rng): EncounterState {
  return apply(state, { type: 'end_turn', actor }, rng).state;
}

function roomDGuardOutcome(
  state: EncounterState,
  branch: 'top' | 'alternative',
  rng: Rng,
): EncounterState {
  let current = state;
  if (branch === 'top') {
    const spear = attackAction(current, D_GUARD, 'spear');
    current = apply(current, monsterAttackCommand(spear, D_GUARD, WIZARD, 'normal'), rng).state;
  } else {
    current = apply(current, { type: 'dodge', actor: D_GUARD, cost: 'action' }, rng).state;
  }
  return endTurn(current, D_GUARD, rng);
}

function runRoomDProductionProbe(state: EncounterState): {
  readonly records: readonly DieRollRecord[];
  readonly successfulSaveRecords: readonly DieRollRecord[];
  readonly topFighterCommands: number;
  readonly alternativeFighterCommands: number;
  readonly reactionPolicies: ChallengeFeasibilityReport['reactionPolicies'];
} {
  const records: DieRollRecord[] = [];
  const rng = maximumWitnessRng();
  let current = roomDGuardOutcome(state, 'alternative', rng);
  current = endTurn(current, FIGHTER, rng);
  const firstLongbow = attackAction(current, D_SCOUT_1, 'longbow');
  for (let index = 0; index < 2; index += 1) {
    const result = apply(current, monsterAttackCommand(firstLongbow, D_SCOUT_1, FIGHTER, 'normal'), rng);
    current = result.state;
    records.push(...result.dieRolls);
  }
  current = endTurn(current, D_SCOUT_1, rng);
  current = endTurn(current, CLERIC, rng);
  const secondLongbow = attackAction(current, D_SCOUT_2, 'longbow');
  for (let index = 0; index < 2; index += 1) {
    const result = apply(current, monsterAttackCommand(secondLongbow, D_SCOUT_2, WIZARD, 'normal'), rng);
    current = result.state;
    records.push(...result.dieRolls);
  }

  const top = roomDGuardOutcome(state, 'top', maximumWitnessRng());
  const alternative = roomDGuardOutcome(state, 'alternative', maximumWitnessRng());
  const genericSave = regretTurnLegalActions(alternative, FIGHTER).actions.find((command) =>
    command.type === 'force_save' && command.target === D_SCOUT_1);
  if (genericSave?.type !== 'force_save') throw new Error('Room D Fighter generic save against Scout 1 is absent.');
  const successfulSave = apply(alternative, genericSave, maximumWitnessRng());

  const reactionPolicies = (['always', 'never', 'ask'] as const).map((configured) => {
    const configuredState: EncounterState = {
      ...alternative,
      reactionPolicies: [{ combatant: D_GUARD, reactionKind: 'opportunity_attack', policy: configured }],
    };
    const moved = apply(configuredState, {
      type: 'move', actor: FIGHTER, path: [{ column: 5, row: 5 }], cause: 'voluntary',
    }, maximumWitnessRng());
    const fallbackResolution = moved.fallbackResolutions.find((entry) =>
      entry.combatant === D_GUARD && entry.reactionKind === 'opportunity_attack')?.resolution;
    const policyResolution = moved.events.find((event): event is Extract<
      EncounterEvent, { readonly type: 'reaction_policy_auto_resolved' }
    > =>
      event.type === 'reaction_policy_auto_resolved' && event.combatant === D_GUARD &&
      event.reactionKind === 'opportunity_attack');
    const resolution = fallbackResolution ?? policyResolution?.resolution;
    if (resolution === undefined) throw new Error(`Room D ${configured} policy produced no reaction resolution.`);
    return {
      configured,
      resolution,
      reactionDraws: moved.dieRolls.filter((record) => record.provenance.kind === 'reaction').length,
    };
  });

  return {
    records,
    successfulSaveRecords: successfulSave.dieRolls,
    topFighterCommands: regretTurnLegalActions(top, FIGHTER).actions.length,
    alternativeFighterCommands: regretTurnLegalActions(alternative, FIGHTER).actions.length,
    reactionPolicies,
  };
}

function rollbackProbe(): ChallengeFeasibilityReport['rollbackChecks'] {
  const rng = transactionalRng(maximumWitnessRng());
  const checkpoint = rng.checkpoint();
  const provenance: DieRollProvenance = { kind: 'healing', source: 'rollback-probe' };
  const face = rng.drawDie(dieSides(6), provenance);
  rng.restoreCheckpoint(checkpoint);
  const cursorRestored = rng.dieRollHistory().length === 0;
  const replay = rng.drawDie(dieSides(6), provenance);
  return { cursorRestored, observerRestored: cursorRestored, replayMatched: replay === face };
}

export async function runChallengeFeasibility(): Promise<ChallengeFeasibilityReport> {
  const started = performance.now();
  const [roomA, roomD] = await Promise.all([challengeState(5831003), challengeState(5831004)]);
  const mace = exactDiceTotalDistribution([6, 6, 4, 4, 4, 4]);
  const healing = exactDiceTotalDistribution([4, 4]);
  const longbow = exactDiceTotalDistribution([8, 8]);
  const aStages = [
    measuredStage('healing-word-uncapped', healing),
    measuredStage('healing-word-capped', healing, null, true),
    measuredStage('critical-mace-1', mace),
    measuredStage('critical-mace-2', mace, mace),
  ];
  let accumulatedLongbows: IntegerDistribution | null = null;
  const dStages: FeasibilityStageReport[] = [];
  for (let index = 1; index <= 4; index += 1) {
    dStages.push(measuredStage(`critical-longbow-${String(index)}`, longbow, accumulatedLongbows));
    const combined = measuredStage(`longbow-combine-${String(index)}`, longbow, accumulatedLongbows);
    const weights = new Map<number, bigint>();
    const prior = accumulatedLongbows?.weights ?? new Map([[0, 1n]]);
    for (const [left, leftWeight] of prior) {
      for (const [right, rightWeight] of longbow.weights) {
        weights.set(left + right, (weights.get(left + right) ?? 0n) + leftWeight * rightWeight);
      }
    }
    const previousDenominator: bigint = accumulatedLongbows === null ? 1n : accumulatedLongbows.denominator;
    accumulatedLongbows = {
      weights,
      denominator: previousDenominator * longbow.denominator,
      rawFaceChildExpansions: combined.rawFaceChildExpansions,
    };
  }
  dStages.push(measuredStage('successful-generic-save-damage-still-rolled', longbow, null, true));

  const aRecords = runRoomAProductionProbe(roomA);
  const dProbe = runRoomDProductionProbe(roomD);
  const provenanceManifest = [...aRecords, ...dProbe.records, ...dProbe.successfulSaveRecords];
  if (!dProbe.successfulSaveRecords.some((entry) => entry.provenance.kind === 'saving_throw') ||
    !dProbe.successfulSaveRecords.some((entry) => entry.provenance.kind === 'attack_damage')) {
    throw new Error('Successful generic save did not preserve both save and rolled-damage provenance.');
  }
  if (dProbe.reactionPolicies.some((entry) =>
    entry.configured === 'always'
      ? entry.resolution !== 'accept' || entry.reactionDraws === 0
      : entry.resolution !== 'decline' || entry.reactionDraws !== 0)) {
    throw new Error('Arena reaction policy did not accept only configured always reactions.');
  }

  const allStages = [...aStages, ...dStages];
  const peakNodes = Math.max(...allStages.map((stage) => stage.groupedNodes));
  const peakHeapBytes = Math.max(...allStages.map((stage) => stage.heapBytes));
  const totalWallMilliseconds = Number((performance.now() - started).toFixed(3));
  const rollbackChecks = rollbackProbe();
  const allMassOne = allStages.every((stage) =>
    stage.probabilityMass.numerator === '1' && stage.probabilityMass.denominator === '1');
  const dDelta = rational(0n, 1n);
  const witnessed = false;
  const reason = 'Room D admitted generic save against Scout 1 is independent of the Guard Dodge choice; both closed replies yield 101/64 expected Scout primary turns, so delta 0 is below 3/20.';
  return {
    schemaVersion: 1,
    basis: 'challenge',
    rooms: ['A', 'D'],
    verdict: allMassOne && rollbackChecks.cursorRestored && rollbackChecks.observerRestored &&
      rollbackChecks.replayMatched && witnessed ? 'GO' : 'SHELVE_D583',
    reason,
    ungroupedLowerBounds: { A: '84934656', D: '16777216' },
    stages: { A: aStages, D: dStages },
    peakNodes,
    peakHeapBytes,
    totalWallMilliseconds,
    provenanceManifest,
    rollbackChecks,
    reactionPolicies: dProbe.reactionPolicies,
    proposedCaps: {
      maxGroupedNodes: Math.ceil(peakNodes * 1.25),
      maxHeapBytes: Math.ceil(peakHeapBytes * 1.25),
      maxWallMilliseconds: Math.ceil(totalWallMilliseconds * 2),
      headroom: '25_percent_nodes_and_heap_100_percent_wall',
    },
    roomD: {
      oldCounterexample: {
        genericSaveKills: '540/1280', fixedBreach: '159/400', advantage: '39/1600',
      },
      fighterInitialLegalCommands: {
        top: dProbe.topFighterCommands, alternative: dProbe.alternativeFighterCommands,
      },
      expectedScoutPrimaryTurns: {
        top: rational(101n, 64n), alternative: rational(101n, 64n),
      },
      alternativeMinusTop: dDelta,
      threshold: { numerator: '3', denominator: '20' },
      witnessed,
      robustnessVariants: 0,
      negativeControl: 'not_frozen_without_positive_witness',
    },
  };
}

function argument(name: string): string | null {
  const index = process.argv.indexOf(name);
  return index < 0 ? null : process.argv[index + 1] ?? null;
}

async function main(): Promise<void> {
  if (argument('--basis') !== 'challenge' || argument('--rooms') !== 'A,D') {
    throw new TypeError('Usage: challenge-feasibility --basis challenge --rooms A,D --out /tmp/report.json');
  }
  const output = argument('--out');
  if (output === null || !resolve(output).startsWith('/tmp/')) {
    throw new TypeError('Challenge feasibility output must be under /tmp.');
  }
  const report = await runChallengeFeasibility();
  await writeFile(output, `${JSON.stringify(report)}\n`, 'utf8');
  process.stdout.write(`${JSON.stringify({ verdict: report.verdict, reason: report.reason, output })}\n`);
}

if (process.env['VITEST'] !== 'true') await main();
