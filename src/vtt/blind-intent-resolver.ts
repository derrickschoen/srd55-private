import { canonicalJson } from '../commands/canonical-json';
import { combatantSpace, combatantSpaceAt } from '../combat/combat-rules';
import { minimumSpaceDistance, minimumSpaceDistanceToCells } from '../combat/creature-space';
import type { EncounterState } from '../combat/encounter';
import { isCellInside, type GridCell } from '../combat/grid';
import type { AreaTemplate, Direction, FeetPoint } from '../combat/templates';
import { combatantId, type CombatantId, type WorldObjectId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  blindRoundIntentEnvelopeSchema,
  type BlindActionKind,
  type BlindActorReference,
  type BlindArea,
  type BlindIntent,
  type BlindIntentRejectionCode,
  type BlindLegalAlternative,
  type BlindRepairArm,
  type BlindRoundIntentEnvelope,
  type CompassDirection,
  type NamedBoardEntity,
} from './blind-dm-contract';
import type { ProposedTurnResolution } from './engine-envelopes';
import type { EngineStateCapsule } from './engine-state-capsule';
import {
  canonicalEngineQueryPort,
  monsterBonusActions,
  type EngineQueryPort,
} from './engine-query-port';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
  resolveEngineActorOption,
} from './intent-resolver';
import { spellDefinition } from '../combat/spells/definitions';
import type {
  EngineActionSlotUse,
  EngineOfferableOption,
  EngineProposalResolution,
  EngineTurnProposal,
  PureTurnProposalResolver,
  ResolvedTurnMechanics,
} from './turn-proposal';
import type {
  BlindResolvedActorMovement,
  BoardDisplayIdentity,
  EngineBlindTurnProjection,
} from './blind-turn-context';

export const BLIND_RESOLVER_VERSION = 'blind-intent-resolver-v1' as const;
export const BLIND_LIVE_WALL_MS = 180_000 as const;

type PreliminaryOptionResolution = ReturnType<typeof resolveEngineActorOption>;

export interface BlindResolverDependencies {
  readonly queries?: EngineQueryPort;
  readonly availableOptions?: (
    state: EncounterState,
    actorId: CombatantId,
    queries: EngineQueryPort,
    revision: number,
  ) => readonly EngineOfferableOption[];
  readonly resolveOption?: (
    state: EncounterState,
    option: EngineOfferableOption,
    queries: EngineQueryPort,
  ) => PreliminaryOptionResolution;
  readonly proposalResolver?: PureTurnProposalResolver;
}

export interface BlindResolverInput {
  readonly state: EncounterState;
  readonly capsule: EngineStateCapsule;
  readonly blindProjection: EngineBlindTurnProjection;
  readonly envelope: unknown;
  readonly attempt: number;
  readonly repairArm: BlindRepairArm;
  readonly dependencies?: BlindResolverDependencies;
}

export interface BlindResolvedActorIntent {
  readonly actor: BlindActorReference;
  readonly intent: BlindIntent;
  readonly semanticFingerprint: string;
  readonly semanticDigest: string;
  readonly selectedOptionId: string;
  readonly resolution: ProposedTurnResolution;
}

export interface BlindResolutionAccepted {
  readonly status: 'accepted';
  readonly attempt: number;
  readonly envelope: BlindRoundIntentEnvelope;
  readonly actors: readonly BlindResolvedActorIntent[];
  readonly modelResult: {
    readonly status: 'accepted';
    readonly attempt: number;
  };
}

export interface BlindResolutionRejected {
  readonly status: 'rejected';
  readonly attempt: number;
  readonly actor?: BlindActorReference;
  readonly codes: readonly BlindIntentRejectionCode[];
  readonly legalAlternative?: BlindLegalAlternative;
  readonly modelResult:
    | {
        readonly status: 'rejected';
        readonly attempt: number;
        readonly actor?: BlindActorReference;
        readonly codes: readonly BlindIntentRejectionCode[];
      }
    | {
        readonly status: 'rejected';
        readonly attempt: number;
        readonly actor?: BlindActorReference;
        readonly codes: readonly BlindIntentRejectionCode[];
        readonly legal_alternative?: BlindLegalAlternative;
      };
}

export type BlindResolutionResult = BlindResolutionAccepted | BlindResolutionRejected;

interface BoundCreature {
  readonly kind: 'creature';
  readonly id: CombatantId;
  readonly display: BoardDisplayIdentity;
  readonly cells: readonly GridCell[];
}

interface BoundObject {
  readonly kind: 'object';
  readonly id: WorldObjectId;
  readonly name: string;
  readonly cells: readonly GridCell[];
}

type BoundEntity = BoundCreature | BoundObject;

interface SemanticAction {
  readonly kind: BlindActionKind;
  readonly name: string | null;
}

interface SemanticCandidate {
  readonly option: EngineOfferableOption;
  readonly mechanics: ResolvedTurnMechanics;
  readonly actions: readonly SemanticAction[];
  readonly targetIds: readonly CombatantId[];
  readonly objectIds: readonly WorldObjectId[];
  readonly areas: readonly AreaTemplate[];
  readonly fingerprint: string;
  readonly digest: string;
}

interface CandidateFailure {
  readonly codes: readonly BlindIntentRejectionCode[];
}

interface CandidateSuccess {
  readonly candidates: readonly SemanticCandidate[];
}

type CandidateFilter = CandidateFailure | CandidateSuccess;

function normalized(value: string): string {
  return value.normalize('NFKC').trim().replaceAll(/\s+/gu, ' ').toLocaleLowerCase('en-US');
}

function cellLabel(cell: GridCell): string {
  return `${String(cell.column)},${String(cell.row)}`;
}

function parseCellLabel(label: string): GridCell {
  const [column, row] = label.split(',').map(Number);
  if (column === undefined || row === undefined) throw new TypeError('Invalid cell label.');
  return { column, row };
}

function sameCell(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}

function uniqueCodes(codes: readonly BlindIntentRejectionCode[]): readonly BlindIntentRejectionCode[] {
  return [...new Set(codes)];
}

function rejected(
  attempt: number,
  repairArm: BlindRepairArm,
  codes: readonly BlindIntentRejectionCode[],
  actor?: BlindActorReference,
  legalAlternative?: BlindLegalAlternative,
): BlindResolutionRejected {
  const safeCodes = uniqueCodes(codes);
  const common = {
    status: 'rejected' as const,
    attempt,
    ...(actor === undefined ? {} : { actor }),
    codes: safeCodes,
  };
  const modelResult = repairArm === 'minimal_legal_alternative'
    ? {
        ...common,
        ...(legalAlternative === undefined ? {} : { legal_alternative: legalAlternative }),
      }
    : common;
  return {
    ...common,
    ...(legalAlternative === undefined ? {} : { legalAlternative }),
    modelResult,
  };
}

function invalidShapeCodes(value: unknown): readonly BlindIntentRejectionCode[] {
  const parsed = blindRoundIntentEnvelopeSchema.safeParse(value);
  if (parsed.success) return [];
  return parsed.error.issues.some((issue) =>
    issue.path.length >= 3 && issue.path[0] === 'intents' && issue.path[2] === 'actor')
    ? ['MISSING_ACTOR']
    : ['INVALID_INTENT_SHAPE'];
}

function requiredDisplays(
  capsule: EngineStateCapsule,
  projection: EngineBlindTurnProjection,
): readonly BoardDisplayIdentity[] {
  const required = new Set((capsule.request?.actors ?? []).map(String));
  return projection.displays.filter((display) => required.has(display.id));
}

function bindActor(
  reference: BlindActorReference,
  displays: readonly BoardDisplayIdentity[],
): BoundCreature | 'unknown' | 'ambiguous' {
  const matches = displays.filter((display) =>
    normalized(display.name) === normalized(reference.name) && display.badge === reference.badge);
  if (matches.length === 0) return 'unknown';
  if (matches.length > 1) return 'ambiguous';
  const display = matches[0];
  if (display === undefined) return 'unknown';
  return { kind: 'creature', id: combatantId(display.id), display, cells: [] };
}

function creatureEntity(
  state: EncounterState,
  display: BoardDisplayIdentity,
): BoundCreature | null {
  const actorId = combatantId(display.id);
  const token = state.tokens.find((candidate) => candidate.combatantId === actorId);
  if (token === undefined) return null;
  return {
    kind: 'creature',
    id: actorId,
    display,
    cells: combatantSpaceAt(state, actorId, token.position).cells,
  };
}

function entityCandidates(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  reference: NamedBoardEntity,
  kind?: 'creature' | 'object',
): readonly BoundEntity[] {
  const wanted = normalized(reference.name);
  const creatures = kind === 'object' ? [] : projection.displays.flatMap((display): readonly BoundCreature[] => {
    if (normalized(display.name) !== wanted ||
      (reference.badge !== undefined && display.badge !== reference.badge)) return [];
    const entity = creatureEntity(state, display);
    return entity === null ? [] : [entity];
  });
  const objects = kind === 'creature' || reference.badge !== undefined ? [] : state.worldObjects.flatMap((object): readonly BoundObject[] =>
    normalized(object.name) === wanted
      ? [{ kind: 'object', id: object.id, name: object.name, cells: object.footprint }]
      : []);
  return [...creatures, ...objects];
}

function bindEntity(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  reference: NamedBoardEntity,
  kind?: 'creature' | 'object',
): BoundEntity | 'unknown' | 'ambiguous' {
  const matches = entityCandidates(state, projection, reference, kind);
  if (matches.length === 0) return 'unknown';
  if (matches.length > 1) return 'ambiguous';
  return matches[0] ?? 'unknown';
}

function actionDisplayName(
  state: EncounterState,
  actorId: CombatantId,
  slot: EngineActionSlotUse,
  queries: EngineQueryPort,
): string | null {
  const use = slot.use;
  switch (use.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': {
      const sources = slot.slot === 'main'
        ? queries.actions(state, actorId)
        : monsterBonusActions(state, actorId);
      const source = sources.find((action) => 'id' in action && action.id === use.actionId);
      if (source === undefined) return String(use.actionId);
      if ('name' in source && typeof source.name === 'string') return source.name;
      return source.kind === 'multiattack' ? 'Multiattack' : String(use.actionId);
    }
    case 'cast_spell': return spellDefinition(use.spellId)?.name ?? String(use.spellId);
    case 'use_world_object': return String(use.actionId);
    case 'dodge': return 'Dodge';
    case 'disengage': return 'Disengage';
    case 'dash': return 'Dash';
    case 'hide': return 'Hide';
    case 'end_turn': return 'End Turn';
  }
}

function actionKind(slot: EngineActionSlotUse): BlindActionKind {
  switch (slot.use.kind) {
    case 'attack':
    case 'multiattack':
    case 'saving_throw': return 'attack';
    case 'cast_spell': return 'cast';
    case 'use_world_object': return 'interact';
    case 'dodge': return 'dodge';
    case 'disengage': return 'disengage';
    case 'dash': return 'dash';
    case 'hide': return 'hide';
    case 'end_turn': return 'end';
  }
}

function semanticFingerprint(
  option: EngineOfferableOption,
  mechanics: ResolvedTurnMechanics,
  actions: readonly SemanticAction[],
): string {
  return canonicalJson({
    actor: String(mechanics.actorId),
    ordered_slot_kinds: option.actionSlots.map((slot) => ({
      slot: slot.slot,
      kind: slot.use.kind,
      action: actions[option.actionSlots.indexOf(slot)]?.name ?? null,
    })),
    resolved_actions: mechanics.actionSlots,
    final_cell: mechanics.finalPosition,
    movement_cost_feet: mechanics.movementCostFeet,
    path: mechanics.path,
    areas: mechanics.actionSlots.flatMap((slot) => slot.area === undefined ? [] : [slot.area]),
    activation_choice: option.activationChoice ?? null,
    resource_identity: option.resourceCostLabels,
    omitted_riders: option.omittedRiders,
  });
}

function candidatesForActor(
  state: EncounterState,
  actorId: CombatantId,
  revision: number,
  dependencies: Required<Pick<BlindResolverDependencies, 'queries' | 'availableOptions' | 'resolveOption'>>,
): { readonly candidates: readonly SemanticCandidate[]; readonly resolutionFailures: number } {
  const options = dependencies.availableOptions(state, actorId, dependencies.queries, revision);
  let resolutionFailures = 0;
  const candidates = options.flatMap((option): readonly SemanticCandidate[] => {
    const resolution = dependencies.resolveOption(state, option, dependencies.queries);
    if (!resolution.valid) {
      resolutionFailures += 1;
      return [];
    }
    const actions = option.actionSlots.map((slot): SemanticAction => ({
      kind: actionKind(slot),
      name: actionDisplayName(state, actorId, slot, dependencies.queries),
    }));
    const fingerprint = semanticFingerprint(option, resolution.mechanics, actions);
    return [{
      option,
      mechanics: resolution.mechanics,
      actions,
      targetIds: [...new Set(resolution.mechanics.actionSlots.flatMap((slot) => slot.targetIds))],
      objectIds: [...new Set(resolution.mechanics.actionSlots.flatMap((slot) =>
        slot.objectId === null ? [] : [slot.objectId]))],
      areas: resolution.mechanics.actionSlots.flatMap((slot) => slot.area === undefined ? [] : [slot.area]),
      fingerprint,
      digest: sha256(fingerprint),
    }];
  });
  return { candidates, resolutionFailures };
}

function actionMatches(intent: BlindIntent, candidate: SemanticCandidate): boolean {
  return candidate.actions.length === 1 && candidate.actions.some((action) => action.kind === intent.action.kind &&
    (!('name' in intent.action) || intent.action.name === undefined || action.name !== null &&
      normalized(action.name) === normalized(intent.action.name)));
}

function movementForActor(
  projection: EngineBlindTurnProjection,
  actorId: CombatantId,
): BlindResolvedActorMovement | null {
  return projection.resolvedMovement.find((entry) => entry.actorId === actorId) ?? null;
}

function distanceFrom(
  state: EncounterState,
  actorId: CombatantId,
  destination: GridCell,
  entity: BoundEntity,
): number {
  const actorSpace = combatantSpaceAt(state, actorId, destination);
  return entity.kind === 'creature'
    ? minimumSpaceDistance(actorSpace, combatantSpace(state, entity.id))
    : minimumSpaceDistanceToCells(actorSpace, entity.cells);
}

function relativeDestination(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  actorId: CombatantId,
  intent: BlindIntent,
): GridCell | CandidateFailure {
  const current = state.tokens.find((token) => token.combatantId === actorId)?.position;
  if (current === undefined) return { codes: ['DESTINATION_INVALID'] };
  const request = intent.destination;
  if (request === undefined || request.kind === 'relative' && request.relation === 'hold') return current;
  const movement = movementForActor(projection, actorId);
  if (movement === null) return { codes: ['DESTINATION_INVALID'] };
  if (request.kind === 'cell_label') {
    const cell = parseCellLabel(request.label);
    return isCellInside(state.bounds, cell) && movement.cells.some((entry) => entry.label === request.label)
      ? cell
      : { codes: ['DESTINATION_INVALID'] };
  }
  const anchor = bindEntity(state, projection, request.anchor);
  if (anchor === 'unknown') return { codes: ['UNKNOWN_TARGET'] };
  if (anchor === 'ambiguous') return { codes: ['AMBIGUOUS_TARGET'] };
  const from = request.relation === 'behind'
    ? bindEntity(state, projection, request.from)
    : null;
  if (from === 'unknown') return { codes: ['UNKNOWN_TARGET'] };
  if (from === 'ambiguous') return { codes: ['AMBIGUOUS_TARGET'] };
  let choices = movement.cells.map((entry) => ({
    ...entry,
    anchorDistance: distanceFrom(state, actorId, entry.cell, anchor),
    fromDistance: from === null ? 0 : distanceFrom(state, actorId, entry.cell, from),
  }));
  if (request.relation === 'adjacent_to' || request.relation === 'behind') {
    choices = choices.filter((entry) => entry.anchorDistance === 5);
  }
  choices.sort((left, right) => {
    const geometric = request.relation === 'away_from' || request.relation === 'behind'
      ? (request.relation === 'behind' ? right.fromDistance - left.fromDistance : right.anchorDistance - left.anchorDistance)
      : left.anchorDistance - right.anchorDistance;
    return geometric || left.costFeet - right.costFeet || left.label.localeCompare(right.label);
  });
  return choices[0]?.cell ?? { codes: ['DESTINATION_INVALID'] };
}

function pointCell(point: FeetPoint): GridCell | null {
  const column = Number(point.x) / 5;
  const row = Number(point.y) / 5;
  return Number.isSafeInteger(column) && Number.isSafeInteger(row) ? { column, row } : null;
}

function areaAnchor(area: AreaTemplate): GridCell | null {
  switch (area.shape) {
    case 'cube': return pointCell(area.template.center);
    case 'cone':
    case 'cylinder':
    case 'emanation':
    case 'line':
    case 'sphere': return pointCell(area.template.origin);
  }
}

const DIRECTION_VECTORS: Readonly<Record<CompassDirection, readonly [number, number]>> = Object.freeze({
  north: [0, -1],
  north_east: [1, -1],
  east: [1, 0],
  south_east: [1, 1],
  south: [0, 1],
  south_west: [-1, 1],
  west: [-1, 0],
  north_west: [-1, -1],
});

function directionMatches(actual: Direction, requested: CompassDirection): boolean {
  const expected = DIRECTION_VECTORS[requested];
  const normalizePart = (value: number): number => value === 0 ? 0 : value > 0 ? 1 : -1;
  return normalizePart(actual.x) === expected[0] && normalizePart(actual.y) === expected[1];
}

function areaDirection(area: AreaTemplate): Direction | null {
  switch (area.shape) {
    case 'cone':
    case 'line': return area.template.direction;
    case 'cube': return area.template.axis;
    case 'cylinder':
    case 'emanation':
    case 'sphere': return null;
  }
}

function requestedAreaCell(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  actorId: CombatantId,
  area: BlindArea,
): GridCell | CandidateFailure {
  if (area.kind === 'cell_label') {
    const cell = parseCellLabel(area.label);
    const movement = movementForActor(projection, actorId);
    return isCellInside(state.bounds, cell) && movement?.cells.some((entry) => entry.label === area.label) === true
      ? cell
      : { codes: ['AREA_INVALID'] };
  }
  const target = bindEntity(state, projection, area.target);
  if (target === 'unknown') return { codes: ['UNKNOWN_TARGET'] };
  if (target === 'ambiguous') return { codes: ['AMBIGUOUS_TARGET'] };
  return target.cells[0] ?? { codes: ['AREA_INVALID'] };
}

function filterArea(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  actorId: CombatantId,
  intent: BlindIntent,
  candidates: readonly SemanticCandidate[],
): CandidateFilter {
  const withArea = candidates.filter((candidate) => candidate.areas.length > 0);
  if (intent.area === undefined) {
    const withoutArea = candidates.filter((candidate) => candidate.areas.length === 0);
    return withoutArea.length > 0
      ? { candidates: withoutArea }
      : { codes: ['AREA_REQUIRED'] };
  }
  if (withArea.length === 0) return { codes: ['AREA_NOT_ALLOWED'] };
  const requestedCell = requestedAreaCell(state, projection, actorId, intent.area);
  if ('codes' in requestedCell) return requestedCell;
  const anchored = withArea.filter((candidate) => candidate.areas.some((area) => {
    const anchor = areaAnchor(area);
    return anchor !== null && sameCell(anchor, requestedCell);
  }));
  if (anchored.length === 0) return { codes: ['AREA_INVALID'] };
  const shapes = anchored.flatMap((candidate) => candidate.areas.map((area) => area.shape));
  const directionalRequired = shapes.some((shape) => shape === 'cone' || shape === 'line');
  const cubeDirections = new Set(anchored.flatMap((candidate) => candidate.areas.flatMap((area) => {
    if (area.shape !== 'cube') return [];
    const direction = areaDirection(area);
    return direction === null ? [] : [`${String(Math.sign(direction.x))},${String(Math.sign(direction.y))}`];
  })));
  if (intent.area.direction === undefined && (directionalRequired || cubeDirections.size > 1)) {
    return { codes: ['AREA_UNDERSPECIFIED'] };
  }
  if (intent.area.direction !== undefined && anchored.some((candidate) =>
    candidate.areas.some((area) => areaDirection(area) === null))) {
    return { codes: ['AREA_INVALID'] };
  }
  const directed = intent.area.direction === undefined ? anchored : anchored.filter((candidate) =>
    candidate.areas.some((area) => {
      const direction = areaDirection(area);
      return direction !== null && directionMatches(direction, intent.area?.direction ?? 'north');
    }));
  return directed.length === 0 ? { codes: ['AREA_INVALID'] } : { candidates: directed };
}

function filterTarget(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  intent: BlindIntent,
  candidates: readonly SemanticCandidate[],
): CandidateFilter {
  const directTargetCount = (candidate: SemanticCandidate): number => candidate.areas.length > 0
    ? 0
    : candidate.targetIds.length + candidate.objectIds.length;
  const targetCounts = candidates.map(directTargetCount);
  if (intent.target === undefined) {
    const withoutTarget = candidates.filter((candidate) => directTargetCount(candidate) === 0);
    if (withoutTarget.length > 0) return { candidates: withoutTarget };
    if (targetCounts.some((count) => count > 1)) return { codes: ['MULTI_TARGET_UNDERSPECIFIED'] };
    return { codes: ['TARGET_REQUIRED'] };
  }
  if (targetCounts.every((count) => count === 0)) return { codes: ['TARGET_NOT_ALLOWED'] };
  const target = bindEntity(state, projection, intent.target, intent.target.kind);
  if (target === 'unknown') return { codes: ['UNKNOWN_TARGET'] };
  if (target === 'ambiguous') return { codes: ['AMBIGUOUS_TARGET'] };
  const selected = candidates.filter((candidate) => target.kind === 'creature'
    ? candidate.targetIds.includes(target.id)
    : candidate.objectIds.includes(target.id));
  if (selected.some((candidate) => directTargetCount(candidate) > 1)) {
    return { codes: ['MULTI_TARGET_UNDERSPECIFIED'] };
  }
  return selected.length === 0 ? { codes: ['NO_MATCHING_OPTION'] } : { candidates: selected };
}

function safeAlternative(
  state: EncounterState,
  projection: EngineBlindTurnProjection,
  candidates: readonly SemanticCandidate[],
): BlindLegalAlternative | undefined {
  const ordered = [...candidates].sort((left, right) =>
    left.fingerprint.localeCompare(right.fingerprint) ||
    String(left.option.optionId).localeCompare(String(right.option.optionId)));
  const selected = ordered[0];
  const action = selected?.actions[0];
  if (selected === undefined || action === undefined) return undefined;
  const targetId = selected.targetIds.length === 1 ? selected.targetIds[0] : undefined;
  const targetDisplay = targetId === undefined
    ? undefined
    : projection.displays.find((display) => display.id === targetId);
  if (targetDisplay !== undefined) {
    return {
      action_kind: action.kind,
      target: { name: targetDisplay.name, badge: targetDisplay.badge },
    };
  }
  const objectId = selected.objectIds.length === 1 ? selected.objectIds[0] : undefined;
  const object = objectId === undefined ? undefined : state.worldObjects.find((entry) => entry.id === objectId);
  return {
    action_kind: action.kind,
    ...(object === undefined ? {} : { target: { name: object.name } }),
  };
}

function proposedResolution(
  intent: BlindIntent,
  selected: SemanticCandidate,
  revision: number,
  proposalResolver: PureTurnProposalResolver,
  state: EncounterState,
): ProposedTurnResolution | null {
  const proposal: EngineTurnProposal = {
    actorId: selected.option.actorId,
    expectedRevision: revision,
    primaryOptionId: selected.option.optionId,
    fallbackOptionId: null,
    reason: intent.reason ?? '',
    activationChoice: null,
    overrideJustification: null,
  };
  const resolution: EngineProposalResolution = proposalResolver.resolve(state, proposal);
  if (!resolution.valid || resolution.selectedBranch !== 'primary') return null;
  return {
    proposal,
    option: resolution.option,
    primaryOption: resolution.primaryOption,
    fallbackOption: null,
    mechanics: resolution.mechanics,
    selectedBranch: 'primary',
    resolutionDigest: resolution.resolutionDigest,
    summary: resolution.summary,
    strictNoFallback: true,
  };
}

function resolveActorIntent(
  input: BlindResolverInput,
  envelope: BlindRoundIntentEnvelope,
  intent: BlindIntent,
  actor: BoundCreature,
  dependencies: Required<Pick<BlindResolverDependencies, 'queries' | 'availableOptions' | 'resolveOption' | 'proposalResolver'>>,
): BlindResolvedActorIntent | CandidateFailure & { readonly alternative?: BlindLegalAlternative } {
  const failed = (
    codes: readonly BlindIntentRejectionCode[],
    candidates: readonly SemanticCandidate[],
  ): CandidateFailure & { readonly alternative?: BlindLegalAlternative } => {
    const alternative = safeAlternative(input.state, input.blindProjection, candidates);
    return alternative === undefined ? { codes } : { codes, alternative };
  };
  const built = candidatesForActor(
    input.state,
    actor.id,
    input.capsule.revision,
    dependencies,
  );
  if (built.candidates.length === 0) {
    return { codes: [built.resolutionFailures > 0 ? 'OPTION_RESOLUTION_FAILED' : 'ACTION_UNAVAILABLE'] };
  }
  let candidates = built.candidates.filter((candidate) => actionMatches(intent, candidate));
  if (candidates.length === 0) {
    return failed(['ACTION_UNAVAILABLE'], built.candidates);
  }
  const withoutActivationChoice = candidates.filter((candidate) =>
    candidate.option.activationChoice === undefined || candidate.option.activationChoice === null);
  if (withoutActivationChoice.length === 0) return failed(['ACTIVATION_CHOICE_REQUIRED'], candidates);
  candidates = withoutActivationChoice;
  const targetFilter = filterTarget(input.state, input.blindProjection, intent, candidates);
  if ('codes' in targetFilter) {
    return failed(targetFilter.codes, candidates);
  }
  candidates = [...targetFilter.candidates];
  const areaFilter = filterArea(input.state, input.blindProjection, actor.id, intent, candidates);
  if ('codes' in areaFilter) {
    return failed(areaFilter.codes, candidates);
  }
  candidates = [...areaFilter.candidates];
  const destination = relativeDestination(input.state, input.blindProjection, actor.id, intent);
  if ('codes' in destination) {
    return failed(destination.codes, candidates);
  }
  const destinationMatches = candidates.filter((candidate) => sameCell(candidate.mechanics.finalPosition, destination));
  if (destinationMatches.length === 0) {
    const current = dependencies.queries.tokenPosition(input.state, actor.id);
    const omittedOrHold = intent.destination === undefined ||
      intent.destination.kind === 'relative' && intent.destination.relation === 'hold';
    const actionCanMove = candidates.some((candidate) => candidate.option.movement.preference.willingness !== 'none');
    return failed([omittedOrHold && current !== null ? 'DESTINATION_REQUIRED'
      : !actionCanMove ? 'DESTINATION_NOT_ALLOWED' : 'NO_MATCHING_OPTION'], candidates);
  }
  const groups = new Map<string, SemanticCandidate[]>();
  for (const candidate of destinationMatches) {
    const group = groups.get(candidate.fingerprint) ?? [];
    group.push(candidate);
    groups.set(candidate.fingerprint, group);
  }
  if (groups.size !== 1) {
    return failed(['AMBIGUOUS_INTENT'], destinationMatches);
  }
  const identical = [...groups.values()][0] ?? [];
  const selected = [...identical].sort((left, right) =>
    String(left.option.optionId).localeCompare(String(right.option.optionId)))[0];
  if (selected === undefined) return { codes: ['NO_MATCHING_OPTION'] };
  const resolution = proposedResolution(
    intent,
    selected,
    input.capsule.revision,
    dependencies.proposalResolver,
    input.state,
  );
  if (resolution === null) return { codes: ['OPTION_RESOLUTION_FAILED'] };
  return {
    actor: intent.actor,
    intent,
    semanticFingerprint: selected.fingerprint,
    semanticDigest: selected.digest,
    selectedOptionId: String(selected.option.optionId),
    resolution,
  };
}

export function resolveBlindRoundIntents(input: BlindResolverInput): BlindResolutionResult {
  const shapeCodes = invalidShapeCodes(input.envelope);
  if (shapeCodes.length > 0) return rejected(input.attempt, input.repairArm, shapeCodes);
  const envelope = blindRoundIntentEnvelopeSchema.parse(input.envelope);
  if (input.capsule.request === null || input.capsule.request.phase === 'speculative' ||
    input.capsule.request.kind === 'plan_adjustment' ||
    input.blindProjection.revision !== input.capsule.revision ||
    input.blindProjection.legalMovement.provenance.state_digest !== input.capsule.digest) {
    return rejected(input.attempt, input.repairArm, ['STALE_REVISION']);
  }
  const displays = requiredDisplays(input.capsule, input.blindProjection);
  const bound = envelope.intents.map((intent) => ({ intent, actor: bindActor(intent.actor, displays) }));
  const unknown = bound.find((entry) => entry.actor === 'unknown');
  if (unknown !== undefined) {
    return rejected(input.attempt, input.repairArm, ['UNKNOWN_ACTOR'], unknown.intent.actor);
  }
  const ambiguous = bound.find((entry) => entry.actor === 'ambiguous');
  if (ambiguous !== undefined) {
    return rejected(input.attempt, input.repairArm, ['AMBIGUOUS_ACTOR'], ambiguous.intent.actor);
  }
  const actors = bound.map((entry) => entry.actor).filter((actor): actor is BoundCreature =>
    actor !== 'unknown' && actor !== 'ambiguous');
  const duplicate = actors.find((actor, index) => actors.findIndex((entry) => entry.id === actor.id) !== index);
  if (duplicate !== undefined) {
    return rejected(input.attempt, input.repairArm, ['DUPLICATE_ACTOR'], {
      name: duplicate.display.name,
      badge: duplicate.display.badge,
    });
  }
  const expected = new Set((input.capsule.request.actors ?? []).map(String));
  if (actors.length !== expected.size || actors.some((actor) => !expected.has(actor.id))) {
    return rejected(input.attempt, input.repairArm, ['INTENT_SET_INCOMPLETE']);
  }
  const queries = input.dependencies?.queries ?? canonicalEngineQueryPort;
  const dependencies = {
    queries,
    availableOptions: input.dependencies?.availableOptions ?? availableEngineActorOptions,
    resolveOption: input.dependencies?.resolveOption ?? resolveEngineActorOption,
    proposalResolver: input.dependencies?.proposalResolver ?? createPureTurnProposalResolver(queries),
  };
  const resolved: BlindResolvedActorIntent[] = [];
  for (const [index, entry] of bound.entries()) {
    const actor = actors[index];
    if (actor === undefined) return rejected(input.attempt, input.repairArm, ['MISSING_ACTOR']);
    const result = resolveActorIntent(input, envelope, entry.intent, actor, dependencies);
    if ('codes' in result) {
      return rejected(
        input.attempt,
        input.repairArm,
        result.codes,
        entry.intent.actor,
        result.alternative,
      );
    }
    resolved.push(result);
  }
  const byRequiredOrder = input.capsule.request.actors.map((actorId) =>
    resolved.find((entry) => entry.resolution.proposal.actorId === actorId));
  if (byRequiredOrder.some((entry) => entry === undefined)) {
    return rejected(input.attempt, input.repairArm, ['INTENT_SET_INCOMPLETE']);
  }
  return {
    status: 'accepted',
    attempt: input.attempt,
    envelope,
    actors: byRequiredOrder.filter((entry): entry is BlindResolvedActorIntent => entry !== undefined),
    modelResult: { status: 'accepted', attempt: input.attempt },
  };
}
