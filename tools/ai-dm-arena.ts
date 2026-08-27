import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { appendFile, readFile } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import type { EncounterState } from '../src/combat/encounter';
import { adjacentCells, gridDistance, isCellInside, type GridCell } from '../src/combat/grid';
import type { MonsterAction, MonsterAttackAction } from '../src/combat/statblock';
import { STARTER_MONSTER_ROSTER } from '../src/combat/statblocks/roster';
import { SPELL_MANIFEST } from '../src/combat/spells/manifest';
import type { CombatantId } from '../src/combat/values';
import {
  JSON_ROUND_PLAN_SURFACE,
  renderArenaPrompt,
  type ArenaPromptEnvelope,
} from '../src/vtt/arena-prompt';
import {
  DM_BRIDGE_PROTOCOL_VERSION,
  type DecisionProgram,
  type PlanAction,
  type RoundPlan,
  type TargetSelector,
} from '../src/vtt/dm-bridge/round-plan-contract';
import { generateRoom } from '../src/vtt/room-generator';

export const ARENA_EFFORTS = ['low', 'medium', 'high', 'xhigh'] as const;
export type ArenaEffort = (typeof ARENA_EFFORTS)[number];

export interface ArenaConfig {
  readonly rooms: number;
  /** Repetitions are successive rounds in one persistent fight session. */
  readonly reps: number;
  readonly seed: number;
  readonly kbPath: string;
  readonly model: string;
  readonly effort: ArenaEffort;
  readonly outPath: string;
  readonly dryRun: boolean;
  readonly cwd: string;
  readonly codexBin: string;
}

export interface ArenaTokenCounts {
  readonly input: number;
  readonly cachedInput: number;
  readonly output: number;
  readonly reasoning: number;
}

export interface ArenaRow {
  readonly seed: number;
  readonly room: number;
  readonly round: number;
  readonly kbHash: string;
  readonly wall: number;
  readonly tokens: ArenaTokenCounts;
  readonly refusals: readonly string[];
  readonly plan: RoundPlan | null;
}

interface CodexResult {
  readonly sessionId: string;
  readonly reply: unknown;
  readonly tokens: ArenaTokenCounts;
}

function requiredValue(argv: readonly string[], index: number, option: string): string {
  const value = argv[index + 1];
  if (value === undefined || value.startsWith('--')) throw new TypeError(`${option} requires a value.`);
  return value;
}

function positiveInteger(value: string, option: string): number {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) throw new TypeError(`${option} must be a positive integer.`);
  return parsed;
}

function pathIsInside(parent: string, candidate: string): boolean {
  const path = relative(resolve(parent), resolve(candidate));
  return path === '' || (!path.startsWith('..') && !isAbsolute(path));
}

export function parseArenaArgs(argv: readonly string[], cwd = process.cwd()): ArenaConfig {
  const values = new Map<string, string>();
  let dryRun = false;
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (!['--rooms', '--reps', '--seed', '--kb', '--model', '--effort', '--out', '--codex-bin'].includes(option ?? '')) {
      throw new TypeError(`Unknown arena option ${option ?? '<missing>'}.`);
    }
    const value = requiredValue(argv, index, option ?? '<missing>');
    values.set(option ?? '', value);
    index += 1;
  }
  const rooms = positiveInteger(values.get('--rooms') ?? '', '--rooms');
  const reps = positiveInteger(values.get('--reps') ?? '', '--reps');
  const seed = Number(values.get('--seed'));
  if (!Number.isSafeInteger(seed)) throw new TypeError('--seed must be a safe integer.');
  const kbPath = resolve(values.get('--kb') ?? '');
  const outPath = resolve(values.get('--out') ?? '');
  if ((values.get('--kb') ?? '').length === 0) throw new TypeError('--kb is required.');
  if ((values.get('--out') ?? '').length === 0) throw new TypeError('--out is required.');
  if (pathIsInside(cwd, outPath)) throw new TypeError('--out must be outside the repository working tree.');
  const model = values.get('--model') ?? '';
  if (model.trim().length === 0) throw new TypeError('--model is required.');
  const effort = values.get('--effort');
  if (!ARENA_EFFORTS.includes(effort as ArenaEffort)) {
    throw new TypeError('--effort must be low, medium, high, or xhigh.');
  }
  return {
    rooms,
    reps,
    seed,
    kbPath,
    model,
    effort: effort as ArenaEffort,
    outPath,
    dryRun,
    cwd: resolve(cwd),
    codexBin: values.get('--codex-bin') ?? 'codex',
  };
}

function tokenPosition(state: EncounterState, id: CombatantId): GridCell | null {
  return state.tokens.find((token) => token.combatantId === id)?.position ?? null;
}

function subject(state: EncounterState, id: CombatantId) {
  return state.combatants.find((candidate) => candidate.profile.id === id) ?? null;
}

function sameSide(state: EncounterState, left: CombatantId, right: CombatantId): boolean {
  return subject(state, left)?.profile.kind === subject(state, right)?.profile.kind;
}

function resolveTarget(
  state: EncounterState,
  actor: CombatantId,
  selector: TargetSelector,
): CombatantId | null {
  if (selector.kind === 'combatant') return selector.combatantId;
  const origin = tokenPosition(state, actor);
  const acting = subject(state, actor);
  if (origin === null || acting === null) return null;
  return state.combatants
    .filter((candidate) => candidate.profile.kind !== acting.profile.kind && candidate.life !== 'dead')
    .map((candidate) => ({ id: candidate.profile.id, position: tokenPosition(state, candidate.profile.id) }))
    .filter((candidate): candidate is { readonly id: CombatantId; readonly position: GridCell } => candidate.position !== null)
    .sort((left, right) =>
      gridDistance(origin, left.position) - gridDistance(origin, right.position) ||
      left.id.localeCompare(right.id))[0]?.id ?? null;
}

function monsterActions(state: EncounterState, actor: CombatantId): readonly MonsterAction[] {
  const combatant = subject(state, actor);
  if (combatant?.profile.kind !== 'monster') return [];
  const statblockId = combatant.profile.statblockId;
  const row = STARTER_MONSTER_ROSTER.find((candidate) => candidate.id === statblockId);
  if (row?.statblock.sourceDetails.actions.kind !== 'present') return [];
  return row.statblock.sourceDetails.actions.value;
}

function attackRange(action: MonsterAttackAction): number {
  switch (action.delivery.kind) {
    case 'melee': return action.delivery.reachFeet;
    case 'ranged': return action.delivery.rangeFeet;
    case 'melee_or_ranged': return action.delivery.rangeFeet;
  }
}

function movementCost(
  state: EncounterState,
  actor: CombatantId,
  destination: GridCell,
): number | null {
  const origin = tokenPosition(state, actor);
  if (origin === null || !isCellInside(state.bounds, destination)) return null;
  const occupied = new Set(state.tokens
    .filter((token) => token.combatantId !== actor)
    .map((token) => `${String(token.position.column)},${String(token.position.row)}`));
  const blocked = new Set([
    ...state.blockedCells.map((cell) => `${String(cell.column)},${String(cell.row)}`),
    ...state.worldObjects.filter((object) => object.blocking.movement)
      .flatMap((object) => object.footprint)
      .map((cell) => `${String(cell.column)},${String(cell.row)}`),
  ]);
  const difficult = new Set(state.environment.difficultTerrainRegions
    .flatMap((region) => region.cells)
    .map((cell) => `${String(cell.column)},${String(cell.row)}`));
  const destinationKey = `${String(destination.column)},${String(destination.row)}`;
  if (occupied.has(destinationKey) || blocked.has(destinationKey)) return null;
  const costs = new Map<string, number>([[`${String(origin.column)},${String(origin.row)}`, 0]]);
  const pending: Array<{ readonly cell: GridCell; readonly cost: number }> = [{ cell: origin, cost: 0 }];
  while (pending.length > 0) {
    pending.sort((left, right) => left.cost - right.cost);
    const current = pending.shift();
    if (current === undefined) break;
    const currentKey = `${String(current.cell.column)},${String(current.cell.row)}`;
    if (current.cost !== costs.get(currentKey)) continue;
    if (currentKey === destinationKey) return current.cost;
    for (const next of adjacentCells(state.bounds, current.cell)) {
      const key = `${String(next.column)},${String(next.row)}`;
      if (occupied.has(key) || blocked.has(key)) continue;
      const cost = current.cost + (difficult.has(key) ? 10 : 5);
      if (cost >= (costs.get(key) ?? Number.POSITIVE_INFINITY)) continue;
      costs.set(key, cost);
      pending.push({ cell: next, cost });
    }
  }
  return null;
}

function actionRefusals(
  action: PlanAction,
  actor: CombatantId,
  state: EncounterState,
): readonly string[] {
  const acting = subject(state, actor);
  const origin = tokenPosition(state, actor);
  if (acting?.profile.kind !== 'monster' || origin === null) return [`${actor}: actor is not a placed monster`];
  const actions = monsterActions(state, actor);
  const refusals: string[] = [];
  if (action.kind === 'retreat_toward') {
    const budget = action.maximumFeet ?? acting.profile.rules.speed;
    if (budget > acting.profile.rules.speed) refusals.push(`${actor}: movement exceeds speed`);
    const cost = movementCost(state, actor, action.destination);
    if (cost === null) refusals.push(`${actor}: destination is blocked, occupied, or unreachable`);
    else if (cost > budget) refusals.push(`${actor}: route costs ${String(cost)} feet including difficult terrain`);
    return refusals;
  }
  if (action.kind === 'move_toward') {
    if ((action.maximumFeet ?? acting.profile.rules.speed) > acting.profile.rules.speed) {
      refusals.push(`${actor}: movement exceeds speed`);
    }
  }
  if (action.kind === 'use_action' && action.action === 'action_surge') {
    const available = acting.profile.rules.featureEffects?.some(
      (effect) => effect.payload.kind === 'action_surge',
    ) ?? false;
    if (!available) refusals.push(`${actor}: Action Surge is absent from the combatant profile`);
  }
  if (!('target' in action) || action.target === null) return refusals;
  const target = resolveTarget(state, actor, action.target);
  if (target === null || subject(state, target) === null) return [...refusals, `${actor}: target is absent`];
  if (sameSide(state, actor, target)) refusals.push(`${actor}: target is on the actor's side`);
  const targetPosition = tokenPosition(state, target);
  if (targetPosition === null) return [...refusals, `${actor}: target has no token`];
  const distance = gridDistance(origin, targetPosition);
  if (action.kind === 'attack' || action.kind === 'bonus_attack') {
    const selected = action.kind === 'attack' && action.attackId !== undefined
      ? actions.find((candidate): candidate is MonsterAttackAction =>
          candidate.kind === 'attack' && candidate.id === action.attackId)
      : actions.find((candidate): candidate is MonsterAttackAction => candidate.kind === 'attack');
    if (selected === undefined) refusals.push(`${actor}: attack is absent from the statblock`);
    else if (distance > attackRange(selected)) refusals.push(`${actor}: target is outside ${selected.id} reach/range`);
  }
  if (action.kind === 'force_save') {
    const selected = actions.find((candidate) => candidate.kind === 'saving_throw');
    if (selected === undefined) refusals.push(`${actor}: saving-throw action is absent from the statblock`);
    else if (distance > selected.target.rangeFeet) refusals.push(`${actor}: save target is outside action range`);
  }
  if (action.kind === 'cast_spell') {
    const spellcasting = actions.find((candidate) =>
      candidate.kind === 'spellcasting' && candidate.spells.some((spell) => spell.id === action.spellId));
    if (spellcasting === undefined) refusals.push(`${actor}: spell is absent from the statblock`);
  }
  return refusals;
}

function slotCost(action: PlanAction): 0 | 1 {
  if (action.kind !== 'cast_spell') return 0;
  return SPELL_MANIFEST.find((spell) => spell.id === action.spellId)?.level === 0 ? 0 : 1;
}

function maximumSlotActions(program: DecisionProgram): number {
  switch (program.kind) {
    case 'action':
      return slotCost(program.action) +
        (program.riders ?? []).reduce((total, rider) =>
          total + slotCost(rider.followUpAction), 0);
    case 'if':
      return Math.max(maximumSlotActions(program.then), maximumSlotActions(program.else));
    case 'priority':
      return Math.max(...program.choices.map(maximumSlotActions));
  }
}

function programActions(program: DecisionProgram): readonly PlanAction[] {
  switch (program.kind) {
    case 'action': return [program.action, ...(program.riders ?? []).map((rider) => rider.followUpAction)];
    case 'if': return [...programActions(program.then), ...programActions(program.else)];
    case 'priority': return program.choices.flatMap(programActions);
  }
}

export function validateArenaPlan(
  plan: RoundPlan,
  state: EncounterState,
  envelope?: ArenaPromptEnvelope,
): readonly string[] {
  const refusals: string[] = [];
  if (envelope !== undefined && (
    plan.encounterId !== envelope.encounterId ||
    plan.requestId !== envelope.requestId ||
    plan.expectedRevision !== envelope.expectedRevision ||
    plan.round !== envelope.round
  )) refusals.push('round-plan envelope does not match the actual room request');
  const expected = state.combatants.flatMap((combatant) =>
    combatant.profile.kind === 'monster' && combatant.life !== 'dead'
      ? [combatant.profile.id]
      : []);
  const actual = plan.monsters.map((entry) => entry.monsterId);
  if (new Set(actual).size !== actual.length) refusals.push('monster programs contain duplicate actors');
  for (const id of expected) if (!actual.includes(id)) refusals.push(`${id}: living monster program is missing`);
  for (const entry of plan.monsters) {
    if (!expected.includes(entry.monsterId)) refusals.push(`${entry.monsterId}: actor is not a living monster`);
    if (maximumSlotActions(entry.program) > 1) refusals.push(`${entry.monsterId}: program can spend more than one slot`);
    for (const action of programActions(entry.program)) {
      refusals.push(...actionRefusals(action, entry.monsterId, state));
    }
  }
  return refusals;
}

function dryRunPlan(state: EncounterState, envelope: ArenaPromptEnvelope): RoundPlan {
  return {
    kind: 'round_plan',
    protocolVersion: DM_BRIDGE_PROTOCOL_VERSION,
    encounterId: envelope.encounterId as RoundPlan['encounterId'],
    requestId: envelope.requestId,
    expectedRevision: envelope.expectedRevision,
    round: envelope.round,
    monsters: state.combatants.flatMap((subject) => {
      if (subject.profile.kind !== 'monster' || subject.life === 'dead') return [];
      const attack = monsterActions(state, subject.profile.id)
        .find((action): action is MonsterAttackAction => action.kind === 'attack');
      const target = resolveTarget(state, subject.profile.id, { kind: 'nearest_enemy' });
      const origin = tokenPosition(state, subject.profile.id);
      const destination = target === null ? null : tokenPosition(state, target);
      const inRange = attack !== undefined && origin !== null && destination !== null &&
        gridDistance(origin, destination) <= attackRange(attack);
      return [{
        monsterId: subject.profile.id,
        program: inRange
          ? {
              kind: 'action' as const,
              action: {
                kind: 'attack' as const,
                target: { kind: 'nearest_enemy' as const },
                attackId: attack.id,
              },
            }
          : {
              kind: 'action' as const,
              action: {
                kind: 'move_toward' as const,
                target: { kind: 'nearest_enemy' as const },
                maximumFeet: subject.profile.rules.speed,
              },
            },
      }];
    }),
  };
}

function parseCodexOutput(stdout: string, priorSessionId: string | null): CodexResult {
  let sessionId = priorSessionId;
  let reply: unknown = null;
  let tokens: ArenaTokenCounts = { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
  for (const line of stdout.split('\n').filter((candidate) => candidate.trim().length > 0)) {
    const value: unknown = JSON.parse(line);
    if (typeof value !== 'object' || value === null || Array.isArray(value)) continue;
    const event = value as Readonly<Record<string, unknown>>;
    if (event['type'] === 'thread.started' && typeof event['thread_id'] === 'string') sessionId = event['thread_id'];
    if (event['type'] === 'item.completed' && typeof event['item'] === 'object' && event['item'] !== null) {
      const item = event['item'] as Readonly<Record<string, unknown>>;
      if (item['type'] === 'agent_message' && typeof item['text'] === 'string') reply = JSON.parse(item['text']);
    }
    if (event['type'] === 'turn.completed' && typeof event['usage'] === 'object' && event['usage'] !== null) {
      const usage = event['usage'] as Readonly<Record<string, unknown>>;
      const count = (key: string): number => typeof usage[key] === 'number' && Number.isSafeInteger(usage[key])
        ? usage[key]
        : 0;
      tokens = {
        input: count('input_tokens'),
        cachedInput: count('cached_input_tokens'),
        output: count('output_tokens'),
        reasoning: count('reasoning_tokens'),
      };
    }
  }
  if (sessionId === null) throw new Error('Codex output did not contain a persistent session id.');
  return { sessionId, reply, tokens };
}

async function runCodex(
  config: ArenaConfig,
  prompt: string,
  sessionId: string | null,
): Promise<CodexResult> {
  const args = [
    'exec',
    '-C', config.cwd,
    '--sandbox', 'read-only',
    '--json',
    '-m', config.model,
    '-c', `model_reasoning_effort="${config.effort}"`,
    ...(sessionId === null ? [] : ['resume', sessionId]),
    '-',
  ];
  const stdout = await new Promise<string>((resolvePromise, reject) => {
    const child = spawn(config.codexBin, args, { cwd: config.cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let output = '';
    let errorOutput = '';
    child.stdout.on('data', (chunk: Buffer) => { output += chunk.toString('utf8'); });
    child.stderr.on('data', (chunk: Buffer) => { errorOutput += chunk.toString('utf8'); });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) resolvePromise(output);
      else reject(new Error(`codex exec exited ${String(code)}: ${errorOutput}`));
    });
    child.stdin.end(prompt);
  });
  return parseCodexOutput(stdout, sessionId);
}

export async function runArena(config: ArenaConfig): Promise<readonly ArenaRow[]> {
  const knowledgeBase = await readFile(config.kbPath, 'utf8');
  const kbHash = createHash('sha256').update(knowledgeBase).digest('hex');
  const rows: ArenaRow[] = [];
  for (let room = 1; room <= config.rooms; room += 1) {
    const roomSeed = (config.seed + room - 1) >>> 0;
    const generated = generateRoom(roomSeed);
    let sessionId: string | null = null;
    for (let round = 1; round <= config.reps; round += 1) {
      const envelope: ArenaPromptEnvelope = {
        encounterId: `encounter:arena-${String(roomSeed)}`,
        requestId: `arena-${String(roomSeed)}-round-${String(round)}`,
        expectedRevision: generated.encounter.state.revision,
        round,
      };
      const prompt = renderArenaPrompt({
        state: generated.encounter.state,
        envelope,
        knowledgeBase,
        surface: JSON_ROUND_PLAN_SURFACE,
      });
      const started = performance.now();
      let plan: RoundPlan | null = null;
      let tokens: ArenaTokenCounts = { input: 0, cachedInput: 0, output: 0, reasoning: 0 };
      const refusals: string[] = [];
      try {
        if (config.dryRun) {
          plan = JSON_ROUND_PLAN_SURFACE.decode(dryRunPlan(generated.encounter.state, envelope));
        } else {
          const result = await runCodex(config, prompt, sessionId);
          sessionId = result.sessionId;
          tokens = result.tokens;
          plan = JSON_ROUND_PLAN_SURFACE.decode(result.reply);
        }
        refusals.push(...validateArenaPlan(plan, generated.encounter.state, envelope));
      } catch (error) {
        refusals.push(error instanceof Error ? error.message : String(error));
      }
      const row: ArenaRow = {
        seed: roomSeed,
        room,
        round,
        kbHash,
        wall: performance.now() - started,
        tokens,
        refusals,
        plan,
      };
      rows.push(row);
      await appendFile(config.outPath, `${JSON.stringify(row)}\n`, 'utf8');
    }
  }
  return rows;
}

async function main(): Promise<void> {
  await runArena(parseArenaArgs(process.argv.slice(2)));
}

const invokedPath = process.argv[1];
if (invokedPath !== undefined && (
  invokedPath.endsWith('/ai-dm-arena.ts') ||
  invokedPath.endsWith('\\ai-dm-arena.ts') ||
  ((
    invokedPath.endsWith('/vite-node') ||
    invokedPath.endsWith('\\vite-node') ||
    invokedPath.endsWith('/vite-node.mjs') ||
    invokedPath.endsWith('\\vite-node.mjs')
  ) && process.argv.includes('--rooms'))
)) {
  await main();
}
