import { canonicalJson } from '../commands/canonical-json';
import type { GridCell } from '../combat/grid';
import type {
  CombatantId,
  EncounterBranchId,
  EncounterSessionId,
} from '../combat/values';
import { sha256 } from '../crypto/sha256';
import type { DmBoardProjection } from './encounter-projections';

export interface EngineProjectedAction {
  readonly actionId: string;
  readonly kind: 'attack' | 'saving_throw' | 'multiattack' | 'spellcasting';
  readonly rangeFeet: number | null;
}

export interface EngineActionRegistry {
  actionsFor(combatantId: CombatantId): readonly EngineProjectedAction[];
}

export interface EngineProjectionCombatant {
  readonly id: CombatantId;
  readonly name: string;
  readonly side: 'player_character' | 'monster';
  readonly life: 'living' | 'dying' | 'stable' | 'dead';
  readonly hitPoints: number;
  readonly hitPointMaximum: number;
  readonly speedFeet: number;
  readonly reachFeet: number;
  readonly position: GridCell;
  readonly actionAvailable: boolean;
  readonly bonusActionAvailable: boolean;
  readonly reactionAvailable: boolean;
  readonly movementRemainingFeet: number;
  readonly actions: readonly EngineProjectedAction[];
}

export interface EngineDmProjection {
  readonly room: number | null;
  readonly round: number;
  readonly activeSide: 'players' | 'monsters' | 'none';
  readonly activeCombatant: CombatantId | null;
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly blockedCells: readonly GridCell[];
  readonly difficultTerrainCells: readonly GridCell[];
  readonly movementBlockingObjects: readonly {
    readonly id: string;
    readonly name: string;
    readonly cells: readonly GridCell[];
  }[];
  readonly combatants: readonly EngineProjectionCombatant[];
}

export interface EngineHistoryEntry {
  readonly revision: number;
  readonly kind: string;
  readonly branchStatus: 'active' | 'void';
  readonly encounterRound: number;
}

export interface RuleReference {
  readonly ruleId: string;
  readonly sourceLocator: string;
}

export interface EngineStateCapsule {
  readonly format: 'engine-mcp-state-capsule';
  readonly schemaVersion: 1;
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly digest: string;
  readonly generatedAt: string;
  readonly request: null | {
    readonly requestId: string;
    readonly phase: 'initial' | 'correction';
    readonly correctionNumber: 0 | 1;
    readonly actors: readonly CombatantId[];
  };
  readonly projection: EngineDmProjection;
  readonly historyDelta: readonly EngineHistoryEntry[];
  readonly rulesIndex: readonly RuleReference[];
}

export interface EngineStateReference {
  readonly runId: EncounterSessionId;
  readonly stateHandle: string;
  readonly expectedRevision: number;
}

type CapsuleDigestInput = Omit<EngineStateCapsule, 'digest' | 'generatedAt'>;

function boundedText(value: string, label: string, maximum: number): string {
  if (value.trim().length === 0 || value.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/u.test(value)) {
    throw new TypeError(`${label} must be bounded, non-empty text without control characters.`);
  }
  return value;
}

function activeSide(projection: DmBoardProjection): EngineDmProjection['activeSide'] {
  const active = projection.encounter.activeCombatant;
  if (active === null) return 'none';
  const combatant = projection.encounter.combatants.find((candidate) => candidate.id === active);
  return combatant?.kind === 'monster' ? 'monsters' : combatant === undefined ? 'none' : 'players';
}

/** Projects only DM-known query facts; reducer commands and persistence fields have no slot. */
export function projectEngineDmProjection(
  projection: DmBoardProjection,
  registry: EngineActionRegistry,
  room: number | null = null,
): EngineDmProjection {
  const encounter = projection.encounter;
  return {
    room,
    round: encounter.round,
    activeSide: activeSide(projection),
    activeCombatant: encounter.activeCombatant,
    bounds: { ...encounter.bounds },
    blockedCells: encounter.blockedCells.map((cell) => ({ ...cell })),
    difficultTerrainCells: encounter.environment.difficultTerrainRegions
      .flatMap((region) => region.cells)
      .map((cell) => ({ ...cell })),
    movementBlockingObjects: encounter.worldObjects
      .filter((object) => object.blocking.movement)
      .map((object) => ({
        id: boundedText(String(object.id), 'world object id', 200),
        name: boundedText(object.name, 'world object name', 200),
        cells: object.footprint.map((cell) => ({ ...cell })),
      })),
    combatants: encounter.combatants.map((combatant) => ({
      id: combatant.id,
      name: boundedText(combatant.name, 'combatant name', 200),
      side: combatant.kind,
      life: combatant.life,
      hitPoints: combatant.hitPoints,
      hitPointMaximum: combatant.rules.hitPointMaximum,
      speedFeet: combatant.rules.speed,
      reachFeet: combatant.rules.reach,
      position: { ...combatant.position },
      actionAvailable: combatant.turn.action.kind !== 'spent',
      bonusActionAvailable: combatant.turn.bonusActionAvailable,
      reactionAvailable: combatant.turn.reactionAvailable,
      movementRemainingFeet: combatant.turn.movement.remaining,
      actions: registry.actionsFor(combatant.id).map((action) => ({ ...action })),
    })),
  };
}

export function projectEngineHistory(
  projection: DmBoardProjection,
  sinceRevision = 0,
): readonly EngineHistoryEntry[] {
  return projection.history
    .filter((entry) => entry.revision > sinceRevision)
    .map((entry) => ({
      revision: entry.revision,
      kind: boundedText(entry.transition.kind, 'history transition kind', 100),
      branchStatus: entry.void ? 'void' : 'active',
      encounterRound: entry.encounterRound,
    }));
}

function digestFor(input: CapsuleDigestInput): string {
  return sha256(canonicalJson(input));
}

export function createEngineStateCapsule(input: {
  readonly runId: EncounterSessionId;
  readonly branchId: EncounterBranchId;
  readonly revision: number;
  readonly generatedAt: string;
  readonly request: EngineStateCapsule['request'];
  readonly projection: EngineDmProjection;
  readonly historyDelta?: readonly EngineHistoryEntry[];
  readonly rulesIndex?: readonly RuleReference[];
}): EngineStateCapsule {
  if (!Number.isSafeInteger(input.revision) || input.revision < 1) {
    throw new TypeError('Capsule revision must be a positive safe integer.');
  }
  if (Number.isNaN(Date.parse(input.generatedAt))) {
    throw new TypeError('Capsule generatedAt must be an ISO date-time string.');
  }
  const body: CapsuleDigestInput = {
    format: 'engine-mcp-state-capsule',
    schemaVersion: 1,
    runId: input.runId,
    branchId: input.branchId,
    revision: input.revision,
    request: input.request === null ? null : structuredClone(input.request),
    projection: structuredClone(input.projection),
    historyDelta: structuredClone(input.historyDelta ?? []),
    rulesIndex: structuredClone(input.rulesIndex ?? []),
  };
  return deepFreeze({
    ...body,
    digest: digestFor(body),
    generatedAt: new Date(input.generatedAt).toISOString(),
  });
}

export function engineStateHandle(capsule: EngineStateCapsule): string {
  return `engine-state:${capsule.digest}`;
}

export function verifyEngineStateCapsule(capsule: EngineStateCapsule): boolean {
  const { digest, generatedAt: _generatedAt, ...body } = capsule;
  return digest === digestFor(body);
}

export class StaleEngineStateError extends Error {
  override readonly name = 'StaleEngineStateError' as const;

  constructor() {
    super('STALE_STATE');
  }
}

export interface ReadonlyStateCapsuleSource {
  read(reference: EngineStateReference): EngineStateCapsule;
}

function deepFreeze<T>(value: T): T {
  if (typeof value !== 'object' || value === null || Object.isFrozen(value)) return value;
  for (const nested of Object.values(value)) deepFreeze(nested);
  return Object.freeze(value);
}

/** In-memory DI seam for increment 1; filesystem capsule loading belongs to transport wiring. */
export class FixedReadonlyStateCapsuleSource implements ReadonlyStateCapsuleSource {
  readonly #capsule: EngineStateCapsule;

  constructor(capsule: EngineStateCapsule) {
    if (!verifyEngineStateCapsule(capsule)) throw new TypeError('State capsule digest is invalid.');
    this.#capsule = deepFreeze(structuredClone(capsule));
  }

  read(reference: EngineStateReference): EngineStateCapsule {
    if (
      reference.runId !== this.#capsule.runId ||
      reference.expectedRevision !== this.#capsule.revision ||
      reference.stateHandle !== engineStateHandle(this.#capsule) ||
      !verifyEngineStateCapsule(this.#capsule)
    ) throw new StaleEngineStateError();
    return this.#capsule;
  }
}

export const engineStateCapsuleInternals = { digestFor };
