import { canonicalJson } from '../../commands/canonical-json';
import type {
  DecisionProgram,
  MonsterRoundProgram,
  PlanAction,
} from '../dm-bridge/contracts';

export interface RankedRoundCandidate {
  readonly programs: readonly MonsterRoundProgram[];
  readonly score: number;
  readonly stableSortKey: string;
}

export interface EquivalenceCollapse {
  readonly representatives: readonly RankedRoundCandidate[];
  readonly originalCount: number;
  readonly collapsedCount: number;
  readonly collapseFactor: number;
}

function actionKey(action: PlanAction): string {
  switch (action.kind) {
    case 'attack':
    case 'bonus_attack':
    case 'force_save':
    case 'move_toward':
      return canonicalJson({ kind: action.kind, target: action.target });
    case 'retreat_toward':
      return canonicalJson({ kind: action.kind, destination: action.destination });
    case 'use_action':
      return canonicalJson({ kind: action.kind, action: action.action });
  }
}

function movementSensitive(program: DecisionProgram): boolean {
  switch (program.kind) {
    case 'action':
      return program.action.kind === 'move_toward' || program.action.kind === 'retreat_toward';
    case 'if':
      return movementSensitive(program.then) || movementSensitive(program.else);
    case 'priority':
      return program.choices.some(movementSensitive);
  }
}

function programKey(program: DecisionProgram): string {
  switch (program.kind) {
    case 'action': {
      const riders = (program.riders ?? [])
        .map((rider) => `${rider.kind}:${actionKey(rider.followUpAction)}`)
        .sort();
      return canonicalJson({ kind: program.kind, action: actionKey(program.action), riders });
    }
    case 'if':
      return canonicalJson({
        kind: program.kind,
        predicate: program.predicate,
        then: programKey(program.then),
        else: programKey(program.else),
      });
    case 'priority': {
      const choices = program.choices.map(programKey);
      if (!movementSensitive(program)) choices.sort();
      return canonicalJson({ kind: program.kind, choices });
    }
  }
}

export function roundEquivalenceKey(programs: readonly MonsterRoundProgram[]): string {
  const movementChangesResolution = programs.some((entry) => movementSensitive(entry.program));
  const entries = programs.map((entry) => canonicalJson({
    actor: entry.monsterId,
    program: programKey(entry.program),
  }));
  if (!movementChangesResolution) entries.sort();
  return canonicalJson(entries);
}

export function collapseEquivalentCandidates(
  candidates: readonly RankedRoundCandidate[],
): EquivalenceCollapse {
  const seen = new Set<string>();
  const representatives: RankedRoundCandidate[] = [];
  for (const candidate of candidates) {
    const key = roundEquivalenceKey(candidate.programs);
    if (seen.has(key)) continue;
    seen.add(key);
    representatives.push(candidate);
  }
  return {
    representatives,
    originalCount: candidates.length,
    collapsedCount: representatives.length,
    collapseFactor: representatives.length === 0 ? 1 : candidates.length / representatives.length,
  };
}
