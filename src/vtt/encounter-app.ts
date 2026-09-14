import { canonicalJson } from '../commands/canonical-json';
import { starterArtCssUrl, starterArtDataUri } from '../assets/starter-art-resolver';
// ART-SEAM (D516): overlay art families and the DM board chrome.
import { OVERLAY_ASSETS } from '../assets/art-sets';
import { OBJECT_GLYPH, type BoardGlyphMode } from '../assets/board-glyphs';
import { renderPixelGlyph } from '../assets/pixel-font';
import {
  CHROME_TILE_PX,
  OBJECT_LABEL_STYLE,
  TERRAIN_LEGEND_LABELS,
  boardChromeMetrics,
  creatureBadgeLayouts,
  renderBoardChrome,
  type BoardChromeTilePx,
  type CreatureBadgeLayout,
} from './board-chrome';
import './styles.css';
import { HumanController, type ControllerRequest } from '../combat/controllers';
import type { EncounterCommand } from '../combat/events';
import {
  MOVEMENT_PATH_DANGER_KINDS,
  REACTION_KINDS,
  type EncounterPhase,
  type MovementPathDangerKind,
  type PendingDecision,
} from '../combat/encounter';
import { HIDDEN_ROLL_CATEGORIES, type HiddenRollCategory } from '../combat/roll-visibility';
import { encounterSessionId, type CombatantId } from '../combat/values';
import {
  ControllerAssignmentError,
  DmEncounterHost,
} from './dm-encounter-host';
import {
  RichEncounterSessionService,
  type RichSessionSnapshot,
} from './encounter-session-service';
import {
  dmWorldObjectLabel,
  playerWorldObjectLabel,
  previewAffectedCellKeys,
  projectedWorldObjectLabel,
} from './encounter-selectors';
import {
  encounterBoardRenderModel,
  encounterBoardTokenRenderModels,
  type EncounterBoardMechanicalLayer,
  type EncounterBoardProjectionShape,
  type EncounterBoardTokenModel,
} from './encounter-board';
import { encounterArtForBoard } from './encounter-art-selection';
import {
  projectStateOnlyBoard,
  type DmMovementPathPreview,
  type DmPendingPlacementRecovery,
  type PlayerBoardProjection,
  type ProjectedControllerRequest,
  type TopDownDmBoardProjection,
  type TopDownPendingPlacementRecovery,
} from './encounter-projections';
import {
  handleTopDownPlayerDecision,
  handleTopDownSubmission,
  isHostWindowMessage,
  isPlayerSubmissionFeedbackMessage,
  playerDecisionMessage,
  playerSubmissionFeedbackMessage,
  type TopDownSubmissionFeedback,
} from './local-window-channel';
import { IndexedDbBrowserSessionStore } from './local-session-store';
import {
  IndexedDbDirectoryHandlePersistence,
  SaveFolderRepository,
} from './save-folder';
import {
  SaveManagerController,
  buildSaveManagerViewModel,
  downloadBrowserFile,
  type SaveManagerEntry,
  type SaveManagerViewModel,
} from './save-manager';
import {
  readAccessibleBoardViewMode,
  renderAccessibleBoard,
  serializeAccessibleBoard,
  writeAccessibleBoardViewMode,
  type AccessibleBoardContext,
  type AccessibleBoardViewMode,
} from './accessible-board';
import { decodeSavedSessionFingerprint } from './session-persistence';
import { IndexedDbSessionLifecycle } from './session-lifecycle';
import type { EncounterSeed } from './session-seed';
import type { StoredCharacterEncounter } from './stored-character-encounter';
import type { StoredCharacterSessionFlow } from './stored-character-encounter';
import {
  REST_INTERRUPTION_DM_CONTROL,
  type LongRestBenefit,
  type RestInterruptionOutcome,
} from './party-session-state';
import {
  REFUSAL_CATEGORIES,
  handlingModesForCategory,
  type RefusalHandlingMode,
} from './refusal-handling';
import { reconcileStableRenderedChildren, stableRenderKey } from './stable-dom-render';
import type { HumanEngineActorOptions } from './encounter-board-projection';
import type { EngineActivationChoiceSlot, EngineOptionId } from './turn-proposal';
import type { OfferedOptionPath } from './offered-option-paths';
import { REFERENCE_PLAYER_IDS } from './reference-encounter';

const HEARTBEAT_INTERVAL_MS = 250;
const HEARTBEAT_TIMEOUT_MS = 1_000;
const LOCAL_PARTY_PLAYER_ID = 'player:local-party';

export type BoardSnapshotInformationMode = 'advice' | 'blind_state';
export type BoardSnapshotRole = 'dm_board' | 'accessible_board_raster' | 'player_board';

export function projectStateOnlyTopDownDmBoard(
  projection: TopDownDmBoardProjection,
): TopDownDmBoardProjection {
  return projectStateOnlyBoard(projection);
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { readonly className?: string; readonly text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
}

function activationChoiceControls(
  actorId: CombatantId,
  optionId: EngineOptionId,
  slot: EngineActivationChoiceSlot,
): readonly HTMLElement[] {
  const targets = slot.kind === 'calm_emotions_per_target' ? slot.targetIds : [null];
  return targets.map((targetId, index) => {
    const label = element('label', { className: 'engine-activation-choice' });
    const choiceIdentity = targetId ?? `single-${String(index)}`;
    label.dataset.renderKey = stableRenderKey(
      'dm', 'engine-options', actorId, optionId, 'activation-choice', slot.kind, choiceIdentity,
      'label',
    );
    const name = slot.kind.replaceAll('_', ' ');
    const prompt = targetId === null ? name : `${name} for ${String(targetId)}`;
    label.append(element('span', { text: `Choose ${prompt} at activation` }));
    const control = element('select');
    control.dataset.renderKey = stableRenderKey(
      'dm', 'engine-options', actorId, optionId, 'activation-choice', slot.kind, choiceIdentity,
      'select',
    );
    control.dataset.optionId = optionId;
    control.dataset.choiceKind = slot.kind;
    if (targetId !== null) control.dataset.targetId = targetId;
    control.setAttribute('aria-label', `Activation choice ${String(index + 1)} for ${optionId}`);
    const undecided = element('option', {
      text: `Not chosen: ${slot.values.join(' or ')}`,
    });
    undecided.value = '';
    control.append(undecided);
    for (const value of slot.values) {
      const choice = element('option', { text: value.replaceAll('_', ' ') });
      choice.value = value;
      control.append(choice);
    }
    label.append(control);
    return label;
  });
}

export function renderHumanEngineOptionCatalog(
  actors: readonly HumanEngineActorOptions[],
): HTMLElement {
  const catalog = element('section', { className: 'dm-engine-options' });
  catalog.dataset.renderKey = stableRenderKey('dm', 'engine-options');
  catalog.append(element('h2', { text: 'Engine options' }));
  if (actors.length === 0) {
    catalog.append(element('p', { text: 'No monster options.' }));
    return catalog;
  }
  for (const actor of actors) {
    const group = element('article');
    group.dataset.renderKey = stableRenderKey('dm', 'engine-options', actor.actorId);
    group.dataset.actorId = actor.actorId;
    group.append(element('h3', { text: actor.actorName }));
    const list = element('ol');
    list.dataset.renderKey = stableRenderKey('dm', 'engine-options', actor.actorId, 'list');
    for (const entry of actor.options) {
      const item = element('li', { text: entry.label });
      item.dataset.renderKey = stableRenderKey(
        'dm', 'engine-options', actor.actorId, String(entry.option.optionId),
      );
      item.dataset.optionAvailability = entry.availability;
      item.dataset.optionId = entry.option.optionId;
      if (entry.availability === 'offerable' && entry.option.activationChoice !== undefined &&
        entry.option.activationChoice !== null) {
        item.append(...activationChoiceControls(
          actor.actorId,
          entry.option.optionId,
          entry.option.activationChoice,
        ));
      }
      list.append(item);
    }
    group.append(list);
    catalog.append(group);
  }
  return catalog;
}

export function renderDmEncounterOutcome(
  conclusion: Extract<EncounterPhase, { readonly kind: 'concluded' }>,
): HTMLElement {
  const side = conclusion.survivingSide === 'player_character'
    ? 'Player characters survive'
    : conclusion.survivingSide === 'monster'
      ? 'Monsters survive'
      : 'No side survives';
  const banner = element('section', {
    className: 'dm-encounter-outcome',
    text: `${conclusion.outcome[0]?.toUpperCase() ?? ''}${conclusion.outcome.slice(1)} — ${side}. Choose the room boundary or rest control to continue.`,
  });
  banner.dataset.encounterOutcome = conclusion.outcome;
  banner.dataset.survivingSide = conclusion.survivingSide ?? 'none';
  banner.setAttribute('role', 'status');
  return banner;
}

function decisionHeading(decision: PendingDecision): string {
  switch (decision.kind) {
    case 'reaction_offer': return decision.reactionKind.replaceAll('_', ' ');
    case 'death_save': return 'death saving throw';
    case 'legendary_action_window': return 'legendary action';
    case 'legendary_resistance': return 'legendary resistance';
    case 'adjudication_prompt': return 'adjudication required';
    default: {
      const exhaustive: never = decision;
      throw new Error(`Unhandled pending decision kind: ${String(exhaustive)}`);
    }
  }
}

function actionLabel(action: EncounterCommand): string {
  switch (action.type) {
    case 'assume_wild_shape': return 'Wild Shape';
    case 'revert_wild_shape': return 'Revert Wild Shape';
    case 'drop_item': return 'Drop item';
    case 'pickup_item': return 'Pick up item';
    case 'equip_item': return 'Equip item';
    case 'stow_item': return 'Stow item';
    case 'move': {
      const destination = action.path.at(-1);
      return destination === undefined
        ? 'Move'
        : `Move to ${destination.column},${destination.row}`;
    }
    case 'hide': return 'Hide';
    case 'search': return 'Search';
    case 'reveal_hidden': return 'Reveal';
    case 'resolve_pending_decision': return action.optionId === 'roll' ? 'Roll death save' : 'Resolve reaction';
    case 'resolve_pending_placement': return 'Resolve pending placement';
    case 'set_hidden_roll_category': return `${action.hidden ? 'Hide' : 'Show'} ${action.category.replaceAll('_', ' ')}`;
    case 'dm_stabilize': return 'DM: Stabilize';
    case 'dm_revive_at_one_hit_point': return 'DM: Revive at 1 HP';
    case 'dm_set_death_save_counts': return 'DM: Set death-save counts';
    case 'dm_mark_dead': return 'DM: Mark dead';
    case 'create_persistent_area':
      return 'Create persistent area';
    case 'move_persistent_area':
      return 'Move persistent area';
    case 'world_operation':
      return 'Change world';
    case 'activate_damage_operation':
      return 'Use damage feature';
    case 'activate_sustained_effect':
      return 'Activate sustained spell';
    case 'arm_weapon_hit_rider':
      return 'Arm weapon rider';
    case 'attack':
      return 'Attack';
    case 'attack_suspected_square':
      return `Attack suspected square ${action.square.column},${action.square.row}`;
    case 'opportunity_attack':
      return 'Use reaction';
    case 'decline_reaction':
      return 'Decline reaction';
    case 'cast_spell':
      return action.spellId === 'shatter'
        ? 'Shatter'
        : action.spellId === 'sacred-flame'
          ? 'Sacred Flame'
          : `Cast ${action.spellId}`;
    case 'end_turn':
      return 'End turn';
    case 'roll_initiative':
      return 'Roll initiative';
    case 'force_save':
      return 'Force save';
    case 'roll_ability_check':
      return 'Ability check';
    case 'dash':
      return 'Dash';
    case 'disengage':
      return 'Disengage';
    case 'dodge':
      return 'Dodge';
    case 'spend_bonus_action':
      return action.purpose;
    case 'spend_reaction':
      return action.purpose;
    case 'activate_action_surge':
      return 'Action Surge';
    case 'activate_timed_spellcasting_mode':
      return 'Activate timed spellcasting';
    case 'heal':
      return 'Heal';
    case 'consume_healing_pool':
      return 'Consume healing resource';
    case 'drink_healing_potion':
      return 'Drink Potion of Healing';
    case 'apply_effect':
      return 'Apply effect';
    case 'grant_temporary_hit_points':
      return 'Grant temporary Hit Points';
    case 'end_concentration':
      return 'End concentration';
    case 'adjudicate':
      return 'ADJUDICATED';
    case 'use_world_object':
      return action.actionId.replaceAll('_', ' ');
    case 'dm_use_world_object':
      return `DM override: ${action.actionId.replaceAll('_', ' ')}`;
  }
}

function actionKey(action: EncounterCommand): string {
  return canonicalJson(action);
}

export type EncounterBoardStackSelection = Map<string, CombatantId>;

function boardPresentationControls(input: {
  readonly audience: 'dm' | 'player';
  readonly mode: AccessibleBoardViewMode;
  readonly context: AccessibleBoardContext;
  readonly setMode: (mode: AccessibleBoardViewMode) => void;
}): HTMLElement {
  const controls = element('section', { className: 'board-presentation-controls' });
  controls.dataset.renderKey = stableRenderKey(input.audience, 'board-presentation');
  controls.setAttribute('aria-label', 'Board presentation');
  const toggle = element('button', {
    text: 'Screen-reader board',
  });
  toggle.type = 'button';
  toggle.dataset.renderKey = stableRenderKey(input.audience, 'board-presentation', 'toggle');
  toggle.setAttribute('aria-pressed', String(input.mode === 'screen_reader'));
  toggle.addEventListener('click', () => {
    input.setMode(input.mode === 'graphic' ? 'screen_reader' : 'graphic');
  });
  const download = element('button', { text: 'Export board as HTML' });
  download.type = 'button';
  download.dataset.renderKey = stableRenderKey(input.audience, 'board-presentation', 'export');
  download.addEventListener('click', () => {
    downloadBrowserFile('board.html', serializeAccessibleBoard(input.context), 'text/html');
  });
  controls.append(toggle, download);
  return controls;
}

export function applyPendingPlacementFocus(
  root: HTMLElement,
  target: 'recovery' | 'active_token',
  activeCombatant: CombatantId | null,
): void {
  if (target === 'recovery') {
    root.querySelector<HTMLElement>('[data-pending-placement-heading="true"]')?.focus();
    return;
  }
  for (const token of Array.from(root.querySelectorAll<HTMLElement>('.encounter-token'))) {
    if (token.dataset.combatantId === activeCombatant) {
      token.focus();
      return;
    }
  }
}

export function renderPendingPlacementRecoveryHeading(
  recovery: DmPendingPlacementRecovery,
): HTMLElement {
  const panel = element('section', { className: 'dm-pending-placement-recovery' });
  panel.dataset.renderKey = stableRenderKey(
    'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason,
  );
  panel.dataset.combatantId = recovery.combatantId;
  panel.dataset.reason = recovery.reason;
  const heading = element('h2', { text: `Place ${recovery.combatantName}` });
  heading.tabIndex = -1;
  heading.dataset.pendingPlacementHeading = 'true';
  heading.dataset.renderKey = stableRenderKey(
    'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'heading',
  );
  panel.append(
    heading,
    element('p', {
      text: `Migration recovery: ${recovery.reason.replaceAll('_', ' ')}. Choose a legal creature space before play resumes.`,
    }),
  );
  return panel;
}

function renderEncounterToken(model: EncounterBoardTokenModel): HTMLButtonElement {
  const token = element('button', { className: 'encounter-token' });
  token.dataset.renderKey = stableRenderKey('board-token', model.id);
  token.type = 'button';
  token.dataset.combatantId = model.id;
  token.dataset.active = String(model.focusAssetId !== null);
  token.dataset.adjudicated = String(model.adjudicatedAssetId !== null);
  token.dataset.kind = model.kind;
  token.dataset.assetId = model.assetId;
  token.dataset.life = model.life;
  token.dataset.marker = model.marker;
  token.dataset.hiddenFromPlayers = String(model.hiddenFromPlayers ?? false);
  token.dataset.column = String(model.position.column);
  token.dataset.row = String(model.position.row);
  token.dataset.columnSpan = String(model.columnSpan);
  token.dataset.rowSpan = String(model.rowSpan);
  token.dataset.stackId = model.stackId;
  token.dataset.stackIndex = String(model.stackIndex);
  token.dataset.stackSize = String(model.stackSize);
  token.setAttribute('aria-label', model.stackSize === 1
    ? `${model.name}, ${model.effectiveSize}, column ${String(model.position.column)}, row ${String(model.position.row)}`
    : `${model.name}, occupant ${String(model.stackIndex + 1)} of ${String(model.stackSize)}, ${model.effectiveSize}, column ${String(model.position.column)}, row ${String(model.position.row)}`);
  const sprite = element('img', { className: 'encounter-token-sprite' });
  sprite.alt = '';
  sprite.setAttribute('aria-hidden', 'true');
  sprite.src = starterArtDataUri(model.assetId);
  token.append(sprite);
  for (const [role, assetId] of [
    ['focus', model.focusAssetId],
    ['adjudicated', model.adjudicatedAssetId],
  ] as const) {
    if (assetId === null) continue;
    const overlay = element('img', { className: `encounter-token-overlay encounter-token-${role}` });
    overlay.alt = '';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.src = starterArtDataUri(assetId);
    overlay.dataset.assetId = assetId;
    token.append(overlay);
  }
  token.append(element('span', {
    className: 'encounter-token-label',
    text: model.marker === 'corpse' ? `† ${model.name}` : model.name,
  }));
  return token;
}

const OPTION_PATH_DANGER_CLASSES: Readonly<Record<MovementPathDangerKind, string>> = {
  opportunity_attack: 'encounter-option-segment-opportunity-attack',
  burning_surface: 'encounter-option-segment-burning-surface',
  // MUTATION hazard_cells_not_red: replace this with a non-red class.
  persistent_area_damage: 'encounter-option-segment-persistent-area-damage',
  difficult_terrain: 'encounter-option-segment-difficult-terrain',
};

function optionPathDangerCells(path: OfferedOptionPath): string {
  return path.annotations.map((annotation) =>
    `${String(annotation.cell.column)},${String(annotation.cell.row)}:${annotation.dangers.join('+')}`,
  ).join(';');
}

function optionPathOffset(index: number, count: number): { readonly x: number; readonly y: number } {
  const band = index - (count - 1) / 2;
  return { x: band * 0.045, y: -band * 0.045 };
}

interface OptionBadgeRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

const OPTION_BADGE_WIDTH_CELLS = 0.5;
const OPTION_BADGE_HEIGHT_CELLS = 0.68;
const OPTION_BADGE_TOP_CELLS = 0.22;
const OPTION_BADGE_SHIFT_CELLS = 0.52;

function optionBadgeRect(center: { readonly x: number; readonly y: number }): OptionBadgeRect {
  return {
    x: center.x - OPTION_BADGE_WIDTH_CELLS / 2,
    y: center.y - OPTION_BADGE_TOP_CELLS,
    width: OPTION_BADGE_WIDTH_CELLS,
    height: OPTION_BADGE_HEIGHT_CELLS,
  };
}

function chromeObstacleRect(plate: CreatureBadgeLayout, tilePx: BoardChromeTilePx): OptionBadgeRect {
  return {
    x: plate.x / tilePx,
    y: plate.y / tilePx,
    width: plate.width / tilePx,
    height: plate.height / tilePx,
  };
}

function optionBadgeOverlaps(left: OptionBadgeRect, right: OptionBadgeRect): boolean {
  return left.x < right.x + right.width && right.x < left.x + left.width &&
    left.y < right.y + right.height && right.y < left.y + left.height;
}

function positionOptionBadge(
  origin: { readonly x: number; readonly y: number },
  bounds: EncounterBoardProjectionShape['bounds'],
  chromeObstacles: readonly CreatureBadgeLayout[],
  tilePx: BoardChromeTilePx,
): { readonly center: { readonly x: number; readonly y: number }; readonly rect: OptionBadgeRect } {
  const obstacles = chromeObstacles.map((obstacle) => chromeObstacleRect(obstacle, tilePx));
  const initial = {
    x: Math.max(
      OPTION_BADGE_WIDTH_CELLS / 2,
      Math.min(origin.x, bounds.columns - OPTION_BADGE_WIDTH_CELLS / 2),
    ),
    y: Math.max(
      OPTION_BADGE_TOP_CELLS,
      Math.min(origin.y, bounds.rows - (OPTION_BADGE_HEIGHT_CELLS - OPTION_BADGE_TOP_CELLS)),
    ),
  };
  const maximumRing = 2 * Math.max(bounds.columns, bounds.rows);
  for (let ring = 0; ring <= maximumRing; ring += 1) {
    for (let vertical = -ring; vertical <= ring; vertical += 1) {
      for (let horizontal = -ring; horizontal <= ring; horizontal += 1) {
        if (Math.max(Math.abs(horizontal), Math.abs(vertical)) !== ring) continue;
        const center = {
          x: initial.x + horizontal * OPTION_BADGE_SHIFT_CELLS,
          y: initial.y + vertical * OPTION_BADGE_SHIFT_CELLS,
        };
        const rect = optionBadgeRect(center);
        if (rect.x < 0 || rect.y < 0 || rect.x + rect.width > bounds.columns ||
          rect.y + rect.height > bounds.rows) continue;
        if (obstacles.some((obstacle) => optionBadgeOverlaps(rect, obstacle))) continue;
        return { center, rect };
      }
    }
  }
  throw new Error('Unable to place offered-option badge without covering board chrome.');
}

function svgElement<K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] {
  return document.createElementNS('http://www.w3.org/2000/svg', tag);
}

function renderOfferedOptionPathOverlay(
  projection: EncounterBoardProjectionShape,
  paths: readonly OfferedOptionPath[],
  chromeObstacles: readonly CreatureBadgeLayout[],
  tilePx: BoardChromeTilePx,
): SVGSVGElement {
  const svg = svgElement('svg');
  svg.classList.add('encounter-option-paths');
  svg.setAttribute('viewBox', `0 0 ${String(projection.bounds.columns)} ${String(projection.bounds.rows)}`);
  svg.setAttribute('aria-label', 'Engine offered movement options');
  const defs = svgElement('defs');
  const marker = svgElement('marker');
  marker.id = 'encounter-option-oa-arrowhead';
  marker.setAttribute('viewBox', '0 0 10 10');
  marker.setAttribute('refX', '9');
  marker.setAttribute('refY', '5');
  marker.setAttribute('markerWidth', '5');
  marker.setAttribute('markerHeight', '5');
  marker.setAttribute('orient', 'auto-start-reverse');
  const arrowHead = svgElement('path');
  arrowHead.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
  marker.append(arrowHead);
  defs.append(marker);
  svg.append(defs);

  const tokenPositions = new Map(projection.combatants.flatMap((combatant) =>
    combatant.placementStatus === 'placed'
      ? [[combatant.id, combatant.position] as const]
      : []));
  const destinationCounts = new Map<string, number>();
  paths.forEach((path, pathIndex) => {
    const offset = optionPathOffset(pathIndex, paths.length);
    const dangerCells = optionPathDangerCells(path);
    const group = svgElement('g');
    group.classList.add('encounter-option-path');
    group.style.setProperty(
      '--encounter-option-color',
      `hsl(${String((205 + pathIndex * 67) % 360)}deg 32% 72%)`,
    );
    group.dataset.optionOrdinal = String(path.optionOrdinal);
    group.dataset.dangerCells = dangerCells;
    group.dataset.optionId = path.optionId;
    group.setAttribute('aria-label', `Option ${String(path.optionOrdinal)}: ${path.summaryLabel}, ${String(path.distanceFeet)} feet`);
    const polyline = svgElement('polyline');
    polyline.classList.add('encounter-option-polyline');
    polyline.dataset.optionOrdinal = String(path.optionOrdinal);
    polyline.setAttribute('points', path.path.map((cell) =>
      `${String(cell.column + 0.5 + offset.x)},${String(cell.row + 0.5 + offset.y)}`).join(' '));
    group.append(polyline);
    let movementSpent = 0;
    for (const step of path.steps) {
      const segment = svgElement('path');
      segment.classList.add('encounter-option-segment');
      segment.dataset.optionOrdinal = String(path.optionOrdinal);
      segment.dataset.dangerCells = dangerCells;
      segment.dataset.dangers = step.dangers.join(',');
      segment.setAttribute(
        'd',
        `M ${String(step.from.column + 0.5 + offset.x)} ${String(step.from.row + 0.5 + offset.y)} ` +
          `L ${String(step.to.column + 0.5 + offset.x)} ${String(step.to.row + 0.5 + offset.y)}`,
      );
      movementSpent += step.costFeet;
      if (movementSpent > path.movementRemainingFeet) {
        segment.classList.add('encounter-option-segment-beyond-movement');
      }
      for (const danger of step.dangers) segment.classList.add(OPTION_PATH_DANGER_CLASSES[danger]);
      if (step.dangers.length > 0) segment.classList.add('encounter-option-segment-hazard');
      group.append(segment);

      for (const reactorId of step.opportunityAttackReactors) {
        const reactor = tokenPositions.get(reactorId);
        if (reactor === undefined) continue;
        const arrow = svgElement('path');
        arrow.classList.add('encounter-option-opportunity-arrow');
        arrow.dataset.optionOrdinal = String(path.optionOrdinal);
        arrow.dataset.dangerCells = dangerCells;
        arrow.dataset.reactorId = reactorId;
        arrow.setAttribute(
          'd',
          `M ${String(reactor.column + 0.5)} ${String(reactor.row + 0.5)} ` +
            `L ${String(step.from.column + 0.5 + offset.x)} ${String(step.from.row + 0.5 + offset.y)}`,
        );
        arrow.setAttribute('marker-end', 'url(#encounter-option-oa-arrowhead)');
        // MUTATION opportunity_arrow_missing: remove this append while retaining the red segment.
        group.append(arrow);
      }
    }
    const destination = path.path.at(-1);
    if (destination === undefined) throw new Error('Offered movement path has no destination.');
    const destinationKey = `${String(destination.column)},${String(destination.row)}`;
    const stack = destinationCounts.get(destinationKey) ?? 0;
    destinationCounts.set(destinationKey, stack + 1);
    const stackOffset = stack === 0
      ? 0
      : Math.ceil(stack / 2) * (stack % 2 === 1 ? -0.52 : 0.52);
    const badgePosition = positionOptionBadge({
      x: destination.column + 0.5 + offset.x,
      y: destination.row + 0.5 + offset.y + stackOffset,
    }, projection.bounds, chromeObstacles, tilePx);
    const badge = svgElement('g');
    badge.classList.add('encounter-option-destination');
    badge.dataset.optionOrdinal = String(path.optionOrdinal);
    badge.dataset.dangerCells = dangerCells;
    badge.setAttribute(
      'transform',
      `translate(${String(badgePosition.center.x)} ${String(badgePosition.center.y)})`,
    );
    const circle = svgElement('circle');
    circle.setAttribute('r', '0.18');
    const ordinal = svgElement('text');
    ordinal.classList.add('encounter-option-ordinal');
    ordinal.setAttribute('text-anchor', 'middle');
    ordinal.setAttribute('y', '0.055');
    ordinal.textContent = String(path.optionOrdinal);
    const distance = svgElement('text');
    distance.classList.add('encounter-option-distance');
    distance.setAttribute('text-anchor', 'middle');
    distance.setAttribute('y', '0.36');
    distance.textContent = `${String(path.distanceFeet)} ft`;
    badge.append(circle, ordinal, distance);
    group.append(badge);
    svg.append(group);
  });
  return svg;
}

function renderOfferedOptionLegend(): HTMLElement {
  const legend = element('aside', { className: 'encounter-option-path-legend' });
  legend.dataset.optionPathLegend = 'true';
  legend.append(element('strong', { text: 'Movement options' }));
  for (const [className, text] of [
    ['encounter-option-legend-solid', 'solid = within movement'],
    ['encounter-option-legend-dashed', 'dashed = beyond movement (Dash)'],
    ['encounter-option-legend-arrow', 'arrow = Opportunity Attack'],
    ['encounter-option-legend-hatch', 'hatching = Difficult Terrain'],
    ['encounter-option-legend-flame', '♨ = damaging terrain'],
    ['encounter-option-legend-ordinal', 'N = option N'],
  ] as const) {
    legend.append(element('span', { className, text }));
  }
  return legend;
}

// ART-SEAM (D516): exported so the DM-with-chrome / player-without DOM identity is testable.
export function renderBoard(
  projection: EncounterBoardProjectionShape,
  preview: ReadonlySet<string> = new Set(),
  movementDangerPreview: DmMovementPathPreview | null = null,
  provenance?: {
    readonly revision: number;
    readonly round: number;
    readonly stateDigest: string;
  },
  // ART-SEAM (D525): the snapshot page overrides the package's glyph mode from its URL.
  boardGlyphs?: BoardGlyphMode,
  boardSnapshotMode = false,
  boardChromeTilePx?: BoardChromeTilePx,
  offeredPaths: readonly OfferedOptionPath[] | null = null,
  stackSelection: EncounterBoardStackSelection = new Map(),
  worldObjectLabels?: ReadonlyMap<string, string>,
): HTMLDivElement {
  const tilePx = boardChromeTilePx ?? CHROME_TILE_PX;
  const chromeMetrics = boardChromeMetrics(tilePx);
  const art = encounterArtForBoard(projection, boardGlyphs);
  const models = encounterBoardRenderModel(projection, art);
  const board = element('div', { className: 'encounter-board' });
  board.dataset.renderKey = stableRenderKey('encounter-board', art.id);
  board.style.setProperty('--encounter-columns', String(projection.bounds.columns));
  // ART-SEAM (D516): overlay art reaches the mechanical-layer CSS through custom properties.
  for (const [effect, assetId] of Object.entries(OVERLAY_ASSETS)) {
    board.style.setProperty(`--art-overlay-${effect}`, starterArtCssUrl(assetId));
  }
  board.dataset.artPackage = art.id;
  board.dataset.boardGlyphs = art.boardGlyphs;
  board.dataset.boardAudience = provenance === undefined ? 'player' : 'dm';
  if (boardSnapshotMode) board.dataset.boardSnapshot = 'true';
  if (provenance !== undefined) {
    board.dataset.sourceRevision = String(provenance.revision);
    board.dataset.sourceRound = String(provenance.round);
    board.dataset.sourceStateDigest = provenance.stateDigest;
  }
  if (offeredPaths !== null) board.dataset.optionPaths = String(offeredPaths.length);
  const dangersByCell = new Map<string, DmMovementPathPreview['annotations'][number]['dangers']>(movementDangerPreview?.annotations.map(
    (annotation) => [`${String(annotation.cell.column)},${String(annotation.cell.row)}`, annotation.dangers] as const,
  ) ?? []);
  const optionDifficultCells = new Map<string, OfferedOptionPath[]>();
  const optionDamageCells = new Map<string, OfferedOptionPath[]>();
  const optionThreats = new Set(offeredPaths?.flatMap((path) =>
    path.steps.flatMap((step) => step.opportunityAttackReactors)) ?? []);
  for (const path of offeredPaths ?? []) {
    for (const annotation of path.annotations) {
      const key = `${String(annotation.cell.column)},${String(annotation.cell.row)}`;
      if (annotation.dangers.includes('difficult_terrain')) {
        optionDifficultCells.set(key, [...optionDifficultCells.get(key) ?? [], path]);
      }
      if (annotation.dangers.includes('burning_surface') ||
        annotation.dangers.includes('persistent_area_damage')) {
        optionDamageCells.set(key, [...optionDamageCells.get(key) ?? [], path]);
      }
    }
  }
  for (const model of models) {
    const cell = element('div', { className: 'encounter-cell' });
    cell.dataset.renderKey = stableRenderKey('encounter-board', art.id, 'cell', model.key);
    cell.dataset.cell = model.key;
    cell.dataset.terrainKind = model.terrain.kind;
    cell.dataset.terrainSources = model.terrain.sourceIds.join(',');
    if (preview.has(model.key)) cell.dataset.preview = 'true';
    for (const layer of model.layers) {
      const image = element('img', { className: `encounter-art-layer encounter-art-${layer.role}` });
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.src = starterArtDataUri(layer.assetId);
      image.dataset.assetId = layer.assetId;
      cell.append(image);
    }
    for (const layer of model.mechanicalLayers) cell.append(renderMechanicalLayer(layer));
    // ART-SEAM (D525): light glyphs under 'light' and 'full'; 'none' marks nothing, so its DOM is unchanged.
    if (model.light.mark !== null) {
      const mark = element('div', { className: 'encounter-light-mark' });
      mark.setAttribute('aria-hidden', 'true');
      mark.dataset.lightLevel = model.light.level;
      mark.dataset.lightMark = model.light.mark;
      cell.append(mark);
    }
    // ART-SEAM (D525): the 'full' vocabulary, one element per mark in the cell's corners.
    for (const glyph of model.glyphs) {
      const mark = element('div', { className: 'encounter-board-glyph' });
      mark.setAttribute('aria-hidden', 'true');
      mark.dataset.glyphKind = glyph.kind;
      mark.dataset.glyphEffect = glyph.effect;
      cell.append(mark);
    }
    for (const light of model.lightOverlays) {
      const overlay = element('div', { className: `encounter-light encounter-light-${light.level}` });
      overlay.dataset.lightId = light.overlay.id;
      overlay.dataset.presentation = light.overlay.presentation;
      overlay.setAttribute('aria-label', light.overlay.label);
      if (
        model.column === light.overlay.origin.column &&
        model.row === light.overlay.origin.row
      ) {
        overlay.append(element('span', { className: 'encounter-light-label', text: light.overlay.label }));
      }
      cell.append(overlay);
    }
    for (const area of model.areas) {
      const overlay = element('div', { className: `encounter-area encounter-area-${area.kind}` });
      overlay.dataset.areaId = area.id;
      overlay.dataset.ownerId = area.owner;
      overlay.dataset.shape = area.shape.kind;
      overlay.title = `${area.kind === 'persistent' ? 'Persistent area' : 'Movement region'} — owner: ${area.ownerName}`;
      cell.append(overlay);
    }
    for (const danger of dangersByCell.get(model.key) ?? []) {
      const marker = element('span', { className: `encounter-path-danger encounter-path-danger-${danger}` });
      marker.dataset.danger = danger;
      marker.setAttribute('aria-label', danger.replaceAll('_', ' '));
      cell.append(marker);
    }
    for (const path of optionDifficultCells.get(model.key) ?? []) {
      const hatch = element('span', { className: 'encounter-option-difficult-hatch' });
      hatch.dataset.optionOrdinal = String(path.optionOrdinal);
      hatch.dataset.danger = 'difficult_terrain';
      cell.append(hatch);
    }
    for (const path of optionDamageCells.get(model.key) ?? []) {
      const flame = element('span', { className: 'encounter-option-damage-flame', text: '♨' });
      flame.dataset.optionOrdinal = String(path.optionOrdinal);
      flame.dataset.danger = 'damaging_terrain';
      flame.setAttribute('aria-label', 'Damaging terrain');
      cell.append(flame);
    }
    for (const object of model.worldObjects) {
      const placed = element('div', { className: 'encounter-world-object' });
      placed.dataset.objectId = object.id;
      placed.dataset.kind = object.kind;
      placed.dataset.blocksMovement = String(object.blocking.movement);
      placed.dataset.blocksLineOfSight = String(object.blocking.lineOfSight);
      placed.dataset.cover = object.blocking.cover;
      placed.dataset.terrainKind = object.terrainKind;
      placed.dataset.lightClass = object.lightClass;
      if (art.boardGlyphs === 'full' && object.kind !== 'door' && object.lightClass !== 'light-source') {
        const rendered = renderPixelGlyph(
          'object',
          OBJECT_GLYPH.rows,
          OBJECT_GLYPH.ink,
          chromeMetrics.latticeScale,
          OBJECT_GLYPH.outline,
        );
        const sigil = element('img', { className: 'encounter-world-object-sigil' });
        sigil.alt = '';
        sigil.setAttribute('aria-hidden', 'true');
        sigil.src = rendered.dataUri;
        sigil.dataset.objectId = object.id;
        sigil.setAttribute('style', `width:${String(rendered.cssWidth)}px;height:${String(rendered.cssHeight)}px`);
        placed.append(sigil);
      }
      if (!boardSnapshotMode &&
        model.column === object.position.column &&
        model.row === object.position.row
      ) {
        const mechanicalLabel = worldObjectLabels?.get(object.id) ?? projectedWorldObjectLabel(object).text;
        const namePrefix = `${object.name} — `;
        const mechanicalDetails = mechanicalLabel.startsWith(namePrefix)
          ? mechanicalLabel.slice(namePrefix.length)
          : mechanicalLabel;
        placed.append(element('span', {
          className: 'encounter-world-object-label',
          text: `${object.name} — ${TERRAIN_LEGEND_LABELS[object.terrainKind]} — ${mechanicalDetails}`,
        }));
        const label = placed.querySelector<HTMLElement>('.encounter-world-object-label');
        if (label !== null) label.dataset.labelStyle = OBJECT_LABEL_STYLE;
      }
      cell.append(placed);
    }
    board.append(cell);
  }
  const tokenLayer = element('div', { className: 'encounter-token-layer' });
  tokenLayer.dataset.renderKey = stableRenderKey('encounter-board', art.id, 'tokens');
  tokenLayer.style.setProperty('--encounter-columns', String(projection.bounds.columns));
  const tokenModels = encounterBoardTokenRenderModels(projection, art);
  const tokensByStack = new Map<string, EncounterBoardTokenModel[]>();
  const tokenElements = new Map<CombatantId, HTMLButtonElement>();
  for (const model of tokenModels) {
    const members = tokensByStack.get(model.stackId) ?? [];
    members.push(model);
    tokensByStack.set(model.stackId, members);
    const token = renderEncounterToken(model);
    if (optionThreats.has(model.id)) token.classList.add('encounter-option-threat');
    for (const effect of projection.sustainedEffects ?? []) {
      if (effect.owner !== model.id) continue;
      const badge = element('span', { className: 'encounter-sustained-badge', text: effect.badge });
      badge.dataset.effectId = effect.effectId;
      badge.dataset.binding = effect.targetBinding;
      badge.dataset.activationAvailable = String(effect.activationAvailable);
      token.append(badge);
    }
    tokenElements.set(model.id, token);
    const creatureSpace = element('div', { className: 'encounter-token-space' });
    creatureSpace.dataset.renderKey = stableRenderKey('board-token-space', model.id);
    creatureSpace.dataset.cell = `${String(model.position.column)},${String(model.position.row)}`;
    creatureSpace.dataset.combatantId = model.id;
    creatureSpace.dataset.columnSpan = String(model.columnSpan);
    creatureSpace.dataset.rowSpan = String(model.rowSpan);
    creatureSpace.style.gridColumn = `${String(model.position.column + 1)} / span ${String(model.columnSpan)}`;
    creatureSpace.style.gridRow = `${String(model.position.row + 1)} / span ${String(model.rowSpan)}`;
    creatureSpace.append(token);
    tokenLayer.append(creatureSpace);
  }
  for (const [stackId, members] of tokensByStack) {
    const memberIds = new Set(members.map((member) => member.id));
    let selected = stackSelection.get(stackId);
    if (selected === undefined || !memberIds.has(selected)) selected = members[0]?.id;
    if (selected === undefined) continue;
    stackSelection.set(stackId, selected);
    const listbox = element('div', { className: 'encounter-token-listbox' });
    listbox.dataset.renderKey = stableRenderKey('board-stack', stackId);
    listbox.id = `encounter-stack-${encodeURIComponent(stackId)}`;
    listbox.setAttribute('role', 'listbox');
    listbox.setAttribute('aria-label', `Occupants at shared creature space ${stackId}`);
    listbox.hidden = true;
    const first = members[0];
    if (first === undefined) continue;
    listbox.style.gridColumn = `${String(first.position.column + 1)} / span ${String(first.columnSpan)}`;
    listbox.style.gridRow = `${String(first.position.row + 1)} / span ${String(first.rowSpan)}`;
    const applySelection = (next: CombatantId, focus: boolean): void => {
      stackSelection.set(stackId, next);
      for (const member of members) {
        const token = tokenElements.get(member.id);
        if (token === undefined) continue;
        const active = member.id === next;
        token.tabIndex = active ? 0 : -1;
        token.dataset.selected = String(active);
        token.style.zIndex = active ? '30' : String(10 + member.stackIndex);
        token.setAttribute('aria-expanded', String(!listbox.hidden && active));
      }
      for (const option of Array.from(listbox.querySelectorAll<HTMLElement>('[role="option"]'))) {
        option.setAttribute('aria-selected', String(option.dataset.combatantId === next));
      }
      if (focus) tokenElements.get(next)?.focus();
    };
    members.forEach((member) => {
      const token = tokenElements.get(member.id);
      if (token === undefined) return;
      if (members.length > 1) {
        token.setAttribute('aria-haspopup', 'listbox');
        token.setAttribute('aria-controls', listbox.id);
      }
      token.addEventListener('click', () => {
        const currentIndex = members.findIndex((candidate) =>
          candidate.id === stackSelection.get(stackId));
        const next = members[(currentIndex + 1) % members.length];
        if (next !== undefined) applySelection(next.id, true);
      });
      token.addEventListener('keydown', (event) => {
        if (event.key === 'Enter' && members.length > 1) {
          event.preventDefault();
          listbox.hidden = !listbox.hidden;
          applySelection(stackSelection.get(stackId) ?? member.id, false);
          if (!listbox.hidden) listbox.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
          return;
        }
        if (event.key === 'Escape') {
          listbox.hidden = true;
          applySelection(stackSelection.get(stackId) ?? member.id, true);
          return;
        }
        const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown'
          ? 1
          : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
            ? -1
            : 0;
        if (direction === 0 || members.length === 1) return;
        event.preventDefault();
        const currentIndex = members.findIndex((candidate) =>
          candidate.id === stackSelection.get(stackId));
        const next = members[(currentIndex + direction + members.length) % members.length];
        if (next !== undefined) applySelection(next.id, true);
      });
      const option = element('div', { text: member.name });
      option.dataset.renderKey = stableRenderKey('board-stack', stackId, 'option', member.id);
      option.tabIndex = -1;
      option.dataset.combatantId = member.id;
      option.setAttribute('role', 'option');
      option.addEventListener('click', () => {
        listbox.hidden = true;
        applySelection(member.id, true);
      });
      option.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        event.preventDefault();
        listbox.hidden = true;
        applySelection(stackSelection.get(stackId) ?? member.id, true);
      });
      listbox.append(option);
    });
    applySelection(selected, false);
    if (members.length > 1) tokenLayer.append(listbox);
  }
  board.append(tokenLayer);
  const lines = projection.targetLines ?? [];
  if (lines.length > 0) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('encounter-target-lines');
    svg.setAttribute('viewBox', `0 0 ${String(projection.bounds.columns)} ${String(projection.bounds.rows)}`);
    svg.setAttribute('aria-label', 'Bound sustained-effect targets');
    for (const connection of lines) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(connection.from.x));
      line.setAttribute('y1', String(connection.from.y));
      line.setAttribute('x2', String(connection.to.x));
      line.setAttribute('y2', String(connection.to.y));
      line.dataset.effectId = connection.effectId;
      line.dataset.targetId = connection.target;
      svg.append(line);
    }
    board.append(svg);
  }
  if (offeredPaths !== null) {
    const chromeObstacles = provenance === undefined
      ? []
      : creatureBadgeLayouts(
          projection.combatants.filter((combatant) => combatant.placementStatus === 'placed'),
          tilePx,
        );
    board.append(renderOfferedOptionPathOverlay(projection, offeredPaths, chromeObstacles, tilePx));
    board.append(renderOfferedOptionLegend());
  }
  // ART-SEAM (D516): the DM board gains names, HP bars, coordinates and a legend; the player board does not.
  if (provenance !== undefined)
    renderBoardChrome(board, projection, art.boardGlyphs, models, boardSnapshotMode, boardChromeTilePx);
  return board;
}

function renderMechanicalLayer(layer: EncounterBoardMechanicalLayer): HTMLDivElement {
  const rendered = element('div', {
    className: `encounter-mechanical-layer encounter-mechanical-${layer.kind}`,
  });
  rendered.setAttribute('aria-hidden', 'true');
  switch (layer.kind) {
    case 'terrain':
      rendered.dataset.mechanicalKind = layer.kind;
      rendered.dataset.terrainKind = layer.terrainKind;
      return rendered;
    case 'difficult_terrain':
      rendered.dataset.mechanicalKind = layer.kind;
      rendered.dataset.regionId = layer.regionId;
      return rendered;
    case 'obscurement':
      rendered.dataset.mechanicalKind = layer.kind;
      rendered.dataset.regionId = layer.regionId;
      rendered.dataset.obscurement = layer.obscurement;
      return rendered;
    case 'illumination':
      rendered.dataset.mechanicalKind = layer.kind;
      rendered.dataset.regionId = layer.regionId;
      rendered.dataset.lightLevel = layer.level;
      return rendered;
  }
  const exhaustive: never = layer;
  throw new Error(`Unhandled encounter mechanical layer ${String(exhaustive)}`);
}

const MOVEMENT_DANGER_LABELS: Readonly<Record<
  DmMovementPathPreview['annotations'][number]['dangers'][number],
  string
>> = {
  opportunity_attack: 'Leaving provokes an Opportunity Attack',
  burning_surface: 'Entering a burning surface',
  persistent_area_damage: 'Entering persistent-area damage',
  difficult_terrain: 'Entering Difficult Terrain',
};

const HIDDEN_ROLL_LABELS: Readonly<Record<HiddenRollCategory, string>> = {
  death_saves: 'Death saves',
  monster_attack_rolls: 'Monster attack rolls',
  monster_saving_throws: 'Monster saving throws',
};

function renderMovementDangerLegend(preview: DmMovementPathPreview): HTMLElement {
  const legend = element('section', { className: 'encounter-path-danger-legend' });
  legend.append(element('h2', { text: 'Movement path dangers' }));
  const kinds = new Set(preview.annotations.flatMap((annotation) => annotation.dangers));
  const list = element('ul');
  for (const kind of MOVEMENT_PATH_DANGER_KINDS) {
    if (!kinds.has(kind)) continue;
    const item = element('li', { text: MOVEMENT_DANGER_LABELS[kind] });
    item.dataset.danger = kind;
    list.append(item);
  }
  legend.append(list);
  return legend;
}

function projectedAction(
  request: ProjectedControllerRequest,
  key: string,
): EncounterCommand | null {
  return request.legalActions.find((action) => actionKey(action) === key) ?? null;
}

class PlayerEncounterView {
  readonly #channel: BroadcastChannel;
  #shell = element('main', { className: 'encounter-shell player-encounter' });
  #projection: PlayerBoardProjection | null = null;
  #staged: EncounterCommand | null = null;
  #aimingSpell = false;
  #lastHeartbeat = 0;
  #submissionError: string | null = null;
  #pendingSubmissionRequestId: string | null = null;
  readonly #stackSelection: EncounterBoardStackSelection = new Map();
  readonly #heartbeatCheck: number;
  #boardView: AccessibleBoardViewMode;

  constructor(
    private readonly root: HTMLElement,
    private readonly sessionId: string,
  ) {
    this.#boardView = readAccessibleBoardViewMode(localStorage, 'player');
    this.#channel = new BroadcastChannel(`srd55:vtt:${sessionId}`);
    this.#channel.addEventListener('message', this.#onMessage);
    this.#heartbeatCheck = window.setInterval(() => {
      if (this.#projection === null) return;
      if (Date.now() - this.#lastHeartbeat > HEARTBEAT_TIMEOUT_MS) this.#render();
    }, HEARTBEAT_INTERVAL_MS);
  }

  readonly #onMessage = (event: MessageEvent<unknown>): void => {
    this.#acceptHostMessage(event.data);
  };

  #acceptHostMessage(value: unknown): void {
    if (isPlayerSubmissionFeedbackMessage(value, this.sessionId)) {
      if (value.requestId !== this.#pendingSubmissionRequestId) return;
      this.#pendingSubmissionRequestId = null;
      this.#submissionError = value.feedback.kind === 'error' ? value.feedback.message : null;
      this.#render();
      return;
    }
    if (!isHostWindowMessage(value, this.sessionId)) return;
    this.#lastHeartbeat = Date.now();
    const unchanged =
      this.#projection !== null &&
      canonicalJson(this.#projection) === canonicalJson(value.projection);
    if (unchanged) return;
    this.#projection = value.projection;
    const pending = this.#projection.pendingRequest;
    const staged = this.#staged;
    if (
      staged !== null &&
      (pending === null || !pending.legalActions.some(
        (action) => actionKey(action) === actionKey(staged),
      ))
    ) {
      this.#staged = null;
      this.#aimingSpell = false;
    }
    this.#render();
  }

  mount(): void {
    this.root.replaceChildren(this.#shell);
    this.#render();
  }

  #openDm(): void {
    const url = new URL(location.href);
    url.searchParams.set('encounter', 'reference');
    url.searchParams.set('view', 'dm');
    url.searchParams.set('session', this.sessionId);
    window.open(url, `vtt-dm-${this.sessionId}`);
  }

  #submit(action: EncounterCommand): void {
    const request = this.#projection?.pendingRequest;
    if (request === null || request === undefined) return;
    const actionIndex = request.legalActions.findIndex(
      (candidate) => actionKey(candidate) === actionKey(action),
    );
    const selectedOfferedActionId = request.offeredActionIds[actionIndex];
    if (selectedOfferedActionId === undefined) return;
    const message = playerDecisionMessage(this.sessionId, request, selectedOfferedActionId);
    this.#pendingSubmissionRequestId = request.requestId;
    this.#submissionError = null;
    this.#channel.postMessage(message);
    this.#staged = null;
    this.#aimingSpell = false;
    this.#render();
  }

  #preview(): ReadonlySet<string> {
    const projection = this.#projection;
    const staged = this.#staged;
    if (projection === null || staged?.type !== 'cast_spell' || staged.area === null) {
      return new Set();
    }
    const preview = previewAffectedCellKeys(projection, staged.area);
    return new Set(preview.kind === 'available' ? preview.cellKeys : []);
  }

  #aimAt(event: PointerEvent): void {
    const projection = this.#projection;
    const request = projection?.pendingRequest;
    if (!this.#aimingSpell || projection === null || request === null || request === undefined) return;
    const board = event.currentTarget;
    if (!(board instanceof HTMLElement)) return;
    const bounds = board.getBoundingClientRect();
    const column = Math.max(
      0,
      Math.min(projection.bounds.columns, Math.round(((event.clientX - bounds.left) / bounds.width) * projection.bounds.columns)),
    );
    const row = Math.max(
      0,
      Math.min(projection.bounds.rows, Math.round(((event.clientY - bounds.top) / bounds.height) * projection.bounds.rows)),
    );
    const action = request.legalActions.find(
      (candidate) =>
        candidate.type === 'cast_spell' &&
        candidate.spellId === 'shatter' &&
        candidate.area?.template.origin.x === column * 5 &&
        candidate.area.template.origin.y === row * 5,
    );
    if (action !== undefined) {
      this.#staged = action;
      this.#render();
    }
  }

  #render(): void {
    const live = this.#shell;
    const draft = element('main', { className: 'encounter-shell player-encounter' });
    this.#shell = draft;
    try {
      this.#renderFresh();
    } finally {
      this.#shell = live;
    }
    reconcileStableRenderedChildren(live, draft);
  }

  #renderFresh(): void {
    this.#shell.replaceChildren();
    const header = element('header');
    header.dataset.renderKey = stableRenderKey('player', 'header');
    header.append(
      element('p', { className: 'vtt-kicker', text: 'Player-primary board' }),
      element('h1', { text: 'Reference encounter' }),
    );
    const openDm = element('button', { text: 'Open local DM window' });
    openDm.type = 'button';
    openDm.dataset.renderKey = stableRenderKey('player', 'header', 'open-dm');
    openDm.addEventListener('click', () => this.#openDm());
    header.append(openDm);
    this.#shell.append(header);
    const projection = this.#projection;
    if (projection === null) {
      this.#shell.append(element('p', {
        className: 'encounter-authority-status',
        text: 'Hard paused — open the local DM window to recover authority.',
      }));
      return;
    }
    const connected = Date.now() - this.#lastHeartbeat <= HEARTBEAT_TIMEOUT_MS;
    const authority = element('p', {
      className: 'encounter-authority-status',
      text: connected ? 'DM authority connected' : 'Hard paused — DM window is unavailable',
    });
    authority.dataset.state = connected ? 'connected' : 'hard-paused';
    this.#shell.append(authority);
    if (this.#submissionError !== null) {
      const error = element('p', { text: this.#submissionError });
      error.dataset.submissionError = 'true';
      error.setAttribute('role', 'alert');
      this.#shell.append(error);
    }
    const active = projection.combatants.find(
      (combatant) => combatant.id === projection.activeCombatant,
    );
    const activePanel = element('section', { className: 'active-pc-panel' });
    activePanel.append(element('h2', {
      text: active?.kind === 'player_character'
        ? `Active PC: ${active.name}`
        : active === undefined ? 'Waiting for initiative' : `DM turn: ${active.name}`,
    }));
    if (projection.activePcResources !== null) {
      const resources = projection.activePcResources;
      activePanel.append(element('p', {
        text: `Action: ${resources.action.kind}; Bonus action: ${resources.bonusActionAvailable ? 'available' : 'spent'}; Reaction: ${resources.reactionAvailable ? 'available' : 'spent'}; Movement: ${resources.movement.remaining} ft`,
      }));
    }
    this.#shell.append(activePanel);
    const boardContext: AccessibleBoardContext = {
      encounterName: 'Reference encounter',
      audience: 'player',
      round: projection.round,
      activeCombatant: projection.activeCombatant,
      board: projection,
    };
    this.#shell.append(boardPresentationControls({
      audience: 'player',
      mode: this.#boardView,
      context: boardContext,
      setMode: (mode) => {
        this.#boardView = mode;
        writeAccessibleBoardViewMode(localStorage, 'player', mode);
        this.#render();
      },
    }));
    if (this.#boardView === 'screen_reader') {
      this.#shell.append(renderAccessibleBoard(boardContext));
    } else {
      const board = renderBoard(
        projection,
        this.#preview(),
        null,
        undefined,
        undefined,
        false,
        undefined,
        null,
        this.#stackSelection,
        new Map(projection.worldObjects.map((object) => {
          const label = playerWorldObjectLabel(projection, String(object.id));
          if (label === null) throw new Error(`Missing player world-object label for ${String(object.id)}.`);
          return [label.objectId, label.text] as const;
        })),
      );
      board.addEventListener('pointermove', (event) => this.#aimAt(event));
      this.#shell.append(board);
    }

    const controls = element('section', { className: 'encounter-controls' });
    controls.dataset.renderKey = stableRenderKey('player', 'controls');
    controls.append(element('h2', { text: 'Legal choices' }));
    const request = projection.pendingRequest;
    if (!connected) {
      controls.append(element('p', { text: 'Authority is hard paused.' }));
    } else if (request === null) {
      controls.append(element('p', { text: 'Waiting for the DM-side controller.' }));
    } else if (request.kind === 'reaction') {
      for (const action of request.legalActions) {
        const button = element('button', { text: actionLabel(action) });
        button.type = 'button';
        button.dataset.renderKey = stableRenderKey(
          'player', 'controls', request.requestId, actionKey(action),
        );
        button.addEventListener('click', () => this.#submit(action));
        controls.append(button);
      }
    } else {
      const firstByLabel = new Map<string, EncounterCommand>();
      for (const action of request.legalActions) {
        const label = actionLabel(action);
        if (!firstByLabel.has(label)) firstByLabel.set(label, action);
      }
      for (const [label, action] of firstByLabel) {
        const button = element('button', { text: label });
        button.type = 'button';
        button.dataset.renderKey = stableRenderKey(
          'player', 'controls', request.requestId, actionKey(action),
        );
        button.addEventListener('click', () => {
          if (action.type === 'cast_spell' && action.spellId === 'shatter') {
            this.#aimingSpell = true;
            this.#staged = action;
          } else {
            this.#aimingSpell = false;
            this.#staged = projectedAction(request, actionKey(action));
          }
          this.#render();
        });
        controls.append(button);
      }
      const confirm = element('button', { text: 'Confirm choice' });
      confirm.type = 'button';
      confirm.dataset.renderKey = stableRenderKey(
        'player', 'controls', request.requestId, 'confirm',
      );
      confirm.disabled = this.#staged === null;
      confirm.addEventListener('click', () => {
        if (this.#staged !== null) this.#submit(this.#staged);
      });
      controls.append(confirm);
    }
    this.#shell.append(controls);

    const log = element('ol', { className: 'encounter-log' });
    for (const event of projection.events.slice(-12)) {
      const eventText = event.type === 'adjudicated'
        ? `ADJUDICATED — visible consequence: ${event.consequence.kind}`
        : event.type === 'attack_resolved' && event.rollVisibility === 'dm_only'
          ? `Monster attack roll hidden — ${event.outcome}`
          : event.type === 'save_resolved' && event.rollVisibility === 'dm_only'
            ? `Monster saving throw hidden — ${event.outcome}`
            : event.type.replaceAll('_', ' ');
      const item = element('li', {
        text: eventText,
      });
      item.dataset.eventType = event.type;
      log.append(item);
    }
    this.#shell.append(log);
  }

  close(): void {
    window.clearInterval(this.#heartbeatCheck);
    this.#channel.removeEventListener('message', this.#onMessage);
    this.#channel.close();
  }
}

class DmEncounterView {
  readonly #store: IndexedDbBrowserSessionStore;
  readonly #folder = new SaveFolderRepository(
    new IndexedDbDirectoryHandlePersistence(indexedDB),
    window,
  );
  readonly #session: RichEncounterSessionService;
  readonly #lifecycle: IndexedDbSessionLifecycle;
  readonly #channel: BroadcastChannel;
  #shell = element('main', { className: 'encounter-shell dm-encounter' });
  #projection: TopDownDmBoardProjection | null = null;
  #playerProjection: PlayerBoardProjection | null = null;
  #channelError: string | null = null;
  #saveManagerError: string | null = null;
  #folderSaves: readonly SaveManagerEntry[] = [];
  #pendingDelete: SaveManagerViewModel['pendingDelete'] = null;
  #saveManagerController: SaveManagerController | null = null;
  #movementPreviewKey: string | null = null;
  readonly #stackSelection: EncounterBoardStackSelection = new Map();
  #recoverySelection: {
    readonly key: string;
    readonly size: DmPendingPlacementRecovery['sizeOptions'][number]['size'];
    readonly anchorKey: string;
  } | null = null;
  #focusAfterRender: 'recovery' | 'active_token' | null = null;
  #showOfferedOptionPaths = false;
  #boardView: AccessibleBoardViewMode;
  readonly #sessionFlow: StoredCharacterSessionFlow | null;
  #endSessionExported = false;
  #pendingSnapshot: RichSessionSnapshot | null = null;
  #dmOfferedActionIds: readonly string[] = [];
  #browserSaveEntries: readonly SaveManagerEntry[] = [];
  #acknowledgingSnapshots = false;
  #flushCount = 0;
  #flushTotalMs = 0;
  #flushMaximumMs = 0;
  #renderCount = 0;
  #renderTotalMs = 0;
  #renderMaximumMs = 0;
  #coalescedSnapshotCount = 0;
  #closed = false;
  readonly #heartbeat: number;
  readonly #unsubscribe: () => void;
  readonly #onBeforeUnload = (): void => this.close();

  constructor(
    private readonly root: HTMLElement,
    private readonly sessionId: string,
    store: IndexedDbBrowserSessionStore,
    encounter?: StoredCharacterEncounter,
    initialSeed?: EncounterSeed,
    private readonly boardSnapshotMode = false,
    private readonly loadBoardSnapshotSession?: (sessionId: string) => Promise<void>,
    private readonly boardGlyphs?: BoardGlyphMode,
    private readonly captureTilePx?: BoardChromeTilePx,
    private readonly boardSnapshotInformation: BoardSnapshotInformationMode = 'advice',
    private readonly boardSnapshotRole: BoardSnapshotRole = 'dm_board',
  ) {
    this.#boardView = readAccessibleBoardViewMode(localStorage, 'dm');
    this.#store = store;
    this.#sessionFlow = encounter?.sessionFlow ?? null;
    const playerIds = encounter?.playerIds ?? REFERENCE_PLAYER_IDS;
    const observerCombatantId = playerIds[0];
    if (observerCombatantId === undefined) throw new TypeError('Top-down player preview requires a player seat.');
    const host = new DmEncounterHost(sessionId, this.#store, encounter === undefined
      ? (initialSeed === undefined ? {} : { initialSeed })
      : {
          initialState: encounter.state,
          ...(initialSeed === undefined ? {} : { initialSeed }),
          ...(encounter.partyState === null ? {} : { initialPartyState: encounter.partyState }),
          partyMembers: encounter.members,
          partyDisplayNames: encounter.displayNames,
          ...(encounter.composeNextRoom === undefined
            ? {}
            : { composeRoom: encounter.composeNextRoom }),
          initialControllers: encounter.controllers,
          playerIds: encounter.playerIds,
          turnLegalActions: encounter.turnLegalActions,
          reactionLegalActions: () => [],
        });
    const controlled = new Set(playerIds);
    this.#session = new RichEncounterSessionService(host, [{
      playerId: LOCAL_PARTY_PLAYER_ID,
      seatId: 'seat:local-party',
      observerCombatantId,
      ownedCombatantIds: playerIds,
      controlledTokenIds: host.rendererTokenBindings()
        .filter((binding) => controlled.has(binding.combatantId))
        .map((binding) => binding.tokenId),
    }]);
    this.#lifecycle = new IndexedDbSessionLifecycle(this.#store, {
      sessionId: () => encounterSessionId(this.sessionId),
      close: () => this.#detach(),
    });
    if (encounter?.startPaused === true) this.#session.interrupt();
    this.#channel = new BroadcastChannel(`srd55:vtt:${sessionId}`);
    this.#channel.addEventListener('message', this.#onMessage);
    this.#unsubscribe = this.#session.subscribeTopDown(
      LOCAL_PARTY_PLAYER_ID,
      (snapshot) => this.#queueSnapshot(snapshot),
    );
    this.#heartbeat = window.setInterval(() => {
      const snapshot = this.#session.topDownSnapshot(LOCAL_PARTY_PLAYER_ID);
      if (snapshot === null) return;
      const dmChanged =
        this.#projection === null ||
        canonicalJson(this.#projection) !== canonicalJson(snapshot.dm);
      if (dmChanged) {
        this.#queueSnapshot(snapshot);
      }
    }, HEARTBEAT_INTERVAL_MS);
    window.addEventListener('beforeunload', this.#onBeforeUnload);
    void this.#restoreSaveFolder();
  }

  static async create(
    root: HTMLElement,
    sessionId: string,
    encounter?: StoredCharacterEncounter,
    initialSeed?: EncounterSeed,
    boardSnapshotMode = false,
    loadBoardSnapshotSession?: (sessionId: string) => Promise<void>,
    boardGlyphs?: BoardGlyphMode,
    captureTilePx?: BoardChromeTilePx,
    boardSnapshotInformation: BoardSnapshotInformationMode = 'advice',
    boardSnapshotRole: BoardSnapshotRole = 'dm_board',
  ): Promise<DmEncounterView> {
    const store = await IndexedDbBrowserSessionStore.open(indexedDB, localStorage);
    const view = new DmEncounterView(
      root,
      sessionId,
      store,
      encounter,
      initialSeed,
      boardSnapshotMode,
      loadBoardSnapshotSession,
      boardGlyphs,
      captureTilePx,
      boardSnapshotInformation,
      boardSnapshotRole,
    );
    await view.#initializeLifecycle();
    return view;
  }

  async #initializeLifecycle(): Promise<void> {
    await this.#lifecycle.dispatch({ kind: 'flush' });
    await this.#refreshBrowserSaves();
  }

  async #refreshBrowserSaves(): Promise<void> {
    const result = await this.#lifecycle.dispatch({ kind: 'list' });
    if (result.kind !== 'listed') throw new Error('Session lifecycle returned an invalid list result.');
    this.#browserSaveEntries = result.saves.map((save) => ({
      ...save,
      id: `browser:${save.storageId}`,
      source: 'browser',
    }));
  }

  #queueSnapshot(snapshot: RichSessionSnapshot): void {
    this.#pendingSnapshot = snapshot;
    if (this.#acknowledgingSnapshots) return;
    this.#acknowledgingSnapshots = true;
    void this.#drainSnapshots();
  }

  async #drainSnapshots(): Promise<void> {
    try {
      while (this.#pendingSnapshot !== null) {
        const snapshot = this.#pendingSnapshot;
        this.#pendingSnapshot = null;
        const flushStartedAt = performance.now();
        await this.#lifecycle.dispatch({ kind: 'flush' });
        await this.#refreshBrowserSaves();
        const flushMs = performance.now() - flushStartedAt;
        this.#flushCount += 1;
        this.#flushTotalMs += flushMs;
        this.#flushMaximumMs = Math.max(this.#flushMaximumMs, flushMs);
        // The coordinator can publish many transitions while IndexedDB is
        // flushing. Render only the newest projection instead of replaying a
        // stale DOM render for every intermediate transition.
        if (this.#pendingSnapshot !== null) {
          this.#coalescedSnapshotCount += 1;
          continue;
        }
        const previousRecovery = this.#projection?.pendingPlacementRecovery ?? null;
        const nextRecovery = snapshot.dm.pendingPlacementRecovery;
        const previousKey = previousRecovery === null
          ? null : `${previousRecovery.combatantId}:${previousRecovery.reason}`;
        const nextKey = nextRecovery === null
          ? null : `${nextRecovery.combatantId}:${nextRecovery.reason}`;
        if (previousKey !== nextKey) {
          this.#recoverySelection = null;
          this.#focusAfterRender = nextKey === null ? 'active_token' : 'recovery';
        }
        this.#projection = this.boardSnapshotInformation === 'blind_state'
          ? projectStateOnlyTopDownDmBoard(snapshot.dm)
          : snapshot.dm;
        this.#playerProjection = snapshot.player;
        this.#dmOfferedActionIds = snapshot.dmOfferedActionIds;
        if (!snapshot.dm.movementPreviews.some(
          (preview) => preview.commandKey === this.#movementPreviewKey,
        )) this.#movementPreviewKey = null;
        this.#sendPlayerProjection(snapshot.player);
        this.#saveManagerError = null;
        this.#render();
      }
    } catch (error: unknown) {
      this.#saveManagerError = error instanceof Error
        ? error.message
        : 'Browser session storage failed.';
      this.#render();
    } finally {
      this.#acknowledgingSnapshots = false;
      if (this.#pendingSnapshot !== null) this.#queueSnapshot(this.#pendingSnapshot);
    }
  }

  async #restoreSaveFolder(): Promise<void> {
    try {
      await this.#folder.restore();
      await this.#refreshFolderSaves();
    } catch (error: unknown) {
      this.#saveManagerError = error instanceof Error
        ? error.message
        : 'The default save folder could not be restored.';
      this.#render();
    }
  }

  async #refreshFolderSaves(): Promise<void> {
    this.#folderSaves = await this.#folder.list();
    this.#render();
  }

  #sendPlayerProjection(projection: PlayerBoardProjection): void {
    const message = {
      kind: 'player_projection' as const,
      sessionId: this.sessionId,
      projection,
    };
    this.#channel.postMessage(message);
  }

  readonly #onMessage = (event: MessageEvent<unknown>): void => {
    this.#acceptDecision(event.data);
  };

  #acceptDecision(value: unknown): void {
    void handleTopDownPlayerDecision(
      value,
      this.sessionId,
      this.#projection?.pendingRequest ?? null,
      (pending, decision) => this.#session.submitTopDownOfferedAction(
        pending.actorId,
        decision.requestId,
        decision.encounterRevision,
        decision.offeredActionId,
      ),
      (message) => {
        this.#channelError = message.feedback.kind === 'error' ? message.feedback.message : null;
        this.#channel.postMessage(message);
        this.#render();
      },
    );
  }

  mount(): void {
    this.root.replaceChildren(this.#shell);
    this.#render();
    void this.#session.start().catch((error: unknown) => {
      this.#saveManagerError = error instanceof Error ? error.message : 'Browser session storage failed.';
      this.#render();
    });
  }

  #submitDm(action: EncounterCommand): void {
    const pending = this.#projection?.pendingRequest;
    if (pending === null || pending === undefined) return;
    const controller = this.#projection?.controllers.find(
      (identity) => identity.combatantId === pending.actorId,
    );
    if (controller?.kind !== 'human') return;
    this.#movementPreviewKey = null;
    const actionIndex = this.#projection?.humanCommandActions.findIndex(
      (candidate) => actionKey(candidate) === actionKey(action),
    ) ?? -1;
    const selectedOfferedActionId = this.#dmOfferedActionIds[actionIndex];
    if (selectedOfferedActionId === undefined) return;
    this.#submitTopDown(() => this.#session.submitTopDownOfferedAction(
      pending.actorId,
      pending.requestId,
      pending.encounterRevision,
      selectedOfferedActionId,
    ));
  }

  #submitTopDown(
    submit: () => ReturnType<RichEncounterSessionService['submitTopDownOfferedAction']>,
    playerRequestId?: string,
    onError?: () => void,
  ): void {
    void handleTopDownSubmission(submit, (feedback: TopDownSubmissionFeedback) => {
      this.#channelError = feedback.kind === 'error' ? feedback.message : null;
      if (feedback.kind === 'error') onError?.();
      if (playerRequestId !== undefined) {
        this.#channel.postMessage(playerSubmissionFeedbackMessage(
          this.sessionId,
          playerRequestId,
          feedback,
        ));
      }
      this.#render();
    });
  }

  #setMovementPreview(commandKey: string | null): void {
    if (this.#movementPreviewKey === commandKey) return;
    this.#movementPreviewKey = commandKey;
    this.#render();
  }

  #browserSaves(): readonly SaveManagerEntry[] {
    return this.#browserSaveEntries;
  }

  #controller(entries: readonly SaveManagerEntry[]): SaveManagerController {
    return new SaveManagerController(
      new Map(entries.map((entry) => [entry.id, entry])),
      {
        load: (save) => this.#loadSave(save),
        rename: async (save, name) => {
          if (save.source === 'browser') {
            await this.#lifecycle.dispatch({
              kind: 'rename',
              storageId: save.storageId ?? `session:${save.sessionId}`,
              sessionId: save.sessionId,
              name,
            });
            await this.#refreshBrowserSaves();
          } else {
            await this.#folder.rename(save, name);
            await this.#refreshFolderSaves();
          }
          this.#render();
        },
        delete: async (save) => {
          if (save.source === 'browser') {
            const storageId = save.storageId ?? `session:${save.sessionId}`;
            const result = await this.#lifecycle.dispatch({
              kind: 'delete', storageId, sessionId: save.sessionId,
            });
            if (result.kind !== 'deleted') throw new Error('Session lifecycle returned an invalid delete result.');
            if (result.navigation?.kind === 'open_new_session') {
              const url = new URL(location.href);
              url.searchParams.set('encounter', 'reference');
              url.searchParams.set('view', 'dm');
              url.searchParams.set('session', `${this.sessionId}-new`);
              location.assign(url);
              return;
            }
            await this.#refreshBrowserSaves();
          } else {
            await this.#folder.delete(save);
            await this.#refreshFolderSaves();
          }
          this.#render();
        },
        exportCopy: async (save) => {
          const exported = save.source === 'browser'
            ? await this.#lifecycle.dispatch({
                kind: 'export',
                storageId: save.storageId ?? `session:${save.sessionId}`,
                sessionId: save.sessionId,
              })
            : null;
          const bytes = exported?.kind === 'exported' ? exported.bytes : save.bytes;
          if (bytes === undefined) throw new Error('Folder save has no file contents.');
          this.#download(save.name, bytes);
        },
        saveNow: async () => {
          await this.#lifecycle.dispatch({ kind: 'flush' });
          const sessionId = encounterSessionId(this.sessionId);
          const exported = await this.#lifecycle.dispatch({
            kind: 'export', storageId: `session:${sessionId}`, sessionId,
          });
          if (exported.kind !== 'exported') throw new Error('Session lifecycle returned an invalid export result.');
          await this.#refreshBrowserSaves();
          const browser = this.#browserSaveEntries.find(
            (save) => save.sessionId === sessionId,
          );
          const name = browser?.name ?? sessionId;
          if (this.#folder.mode().kind === 'folder') {
            await this.#folder.write(name, exported.bytes);
            await this.#refreshFolderSaves();
          } else {
            this.#download(name, exported.bytes);
          }
        },
        chooseFolder: async () => {
          await this.#folder.choose();
          await this.#refreshFolderSaves();
        },
        uploadFile: () => this.#openUpload(),
      },
    );
  }

  async #loadSave(save: SaveManagerEntry): Promise<void> {
    if (save.source === 'browser') {
      const restored = await this.#lifecycle.dispatch({
        kind: 'restore',
        storageId: save.storageId ?? `session:${save.sessionId}`,
        sessionId: save.sessionId,
      });
      if (restored.kind !== 'restored') throw new Error('Session lifecycle returned an invalid restore result.');
    }
    if (save.source === 'folder') {
      if (save.bytes === undefined) throw new Error('Folder save has no file contents.');
      const imported = await this.#lifecycle.dispatch({ kind: 'import', bytes: save.bytes });
      if (imported.kind === 'conflict') {
        throw new Error(
          'This folder save has the same session ID as a different browser autosave. Rename or export the autosave before deleting it; it will not be overwritten.',
        );
      }
      if (imported.kind !== 'imported' && imported.kind !== 'duplicate') {
        throw new Error('Session lifecycle returned an invalid import result.');
      }
      await this.#refreshBrowserSaves();
    }
    if (this.boardSnapshotMode) {
      if (this.loadBoardSnapshotSession === undefined) {
        throw new Error('Snapshot-mode save loading has no session remount handler.');
      }
      await this.loadBoardSnapshotSession(save.sessionId);
      return;
    }
    const url = new URL(location.href);
    url.searchParams.set('encounter', 'reference');
    url.searchParams.set('view', 'dm');
    url.searchParams.set('session', save.sessionId);
    location.assign(url);
  }

  #download(name: string, bytes: string): void {
    downloadBrowserFile(`${name}.vtt.json`, bytes, 'application/json');
  }

  #openUpload(): void {
    const input = element('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.hidden = true;
    input.addEventListener('change', () => {
      const file = input.files?.[0];
      input.remove();
      if (file === undefined) return;
      void this.#runSaveManagerAction(async () => {
        const bytes = await file.text();
        const result = await this.#lifecycle.dispatch({ kind: 'import', bytes });
        if (result.kind === 'duplicate' || result.kind === 'conflict') {
          throw new Error('That uploaded session already exists in browser autosaves.');
        }
        if (result.kind !== 'imported') throw new Error('Session lifecycle returned an invalid import result.');
        await this.#refreshBrowserSaves();
        this.#render();
      });
    }, { once: true });
    this.#shell.append(input);
    input.click();
  }

  async #runSaveManagerAction(action: () => void | Promise<void>): Promise<void> {
    try {
      await action();
      this.#saveManagerError = null;
    } catch (error: unknown) {
      this.#saveManagerError = error instanceof Error
        ? error.message
        : 'The save-manager action failed.';
      this.#render();
    }
  }

  #renderSaveManager(): HTMLElement {
    const browser = this.#browserSaves();
    const entries = [...browser, ...this.#folderSaves];
    if (this.#pendingDelete === null || this.#saveManagerController === null) {
      this.#saveManagerController = this.#controller(entries);
    }
    const controller = this.#saveManagerController;
    const model = buildSaveManagerViewModel({
      browser,
      folder: this.#folderSaves,
      mode: this.#folder.mode(),
      pendingDelete: this.#pendingDelete,
    });
    const manager = element('section', { className: 'dm-save-manager' });
    manager.dataset.renderKey = stableRenderKey('dm', 'save-manager');
    manager.dataset.mode = model.mode.kind;
    manager.append(element('h2', { text: 'Save manager' }));
    manager.append(element('p', {
      className: 'dm-last-autosave',
      text: model.lastAutosaveAt === null
        ? 'Last browser autosave: never'
        : `Last browser autosave: ${new Date(model.lastAutosaveAt).toLocaleString('en-US')}`,
    }));
    manager.append(element('p', {
      className: 'dm-save-mode',
      text: model.mode.kind === 'folder'
        ? `Default folder: ${model.mode.folderName}`
        : `Download/upload fallback (${model.mode.reason.replaceAll('_', ' ')})`,
    }));
    if (this.#saveManagerError !== null) {
      const error = element('p', { className: 'dm-save-error', text: this.#saveManagerError });
      error.setAttribute('role', 'alert');
      manager.append(error);
    }
    const toolbar = element('div', { className: 'dm-save-toolbar' });
    toolbar.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'toolbar');
    const saveNow = element('button', {
      text: model.primarySaveIntent === 'save_now_to_folder' ? 'Save now' : 'Download save now',
    });
    saveNow.type = 'button';
    saveNow.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'toolbar', 'save-now');
    saveNow.dataset.intent = model.primarySaveIntent;
    saveNow.addEventListener('click', () => {
      void this.#runSaveManagerAction(() => controller.dispatch({ kind: 'save_now' }));
    });
    toolbar.append(saveNow);
    for (const intent of model.transferIntents) {
      const button = element('button', {
        text: intent === 'choose_folder' ? 'Choose default folder' : 'Upload save file',
      });
      button.type = 'button';
      button.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'toolbar', 'transfer', intent);
      button.dataset.intent = intent;
      button.addEventListener('click', () => {
        void this.#runSaveManagerAction(() => controller.dispatch({
          kind: intent === 'choose_folder' ? 'choose_folder' : 'upload_file',
        }));
      });
      toolbar.append(button);
    }
    manager.append(toolbar);

    const list = element('div', { className: 'dm-save-list' });
    list.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'list');
    for (const row of model.rows) {
      const item = element('article', { className: 'dm-save-row' });
      item.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'save', row.id);
      item.dataset.saveId = row.id;
      item.dataset.source = row.badge;
      item.append(
        element('h3', { text: row.name }),
        element('span', { className: 'dm-save-badge', text: row.badge }),
        element('span', { className: 'dm-save-pool', text: row.poolLabel }),
        element('time', { text: row.timestampLabel }),
        element('p', { className: 'dm-save-summary', text: row.summary }),
      );
      const actions = element('div', { className: 'dm-save-row-actions' });
      actions.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'save', row.id, 'actions');
      for (const action of row.actions) {
        const button = element('button', {
          text: action === 'export_copy' ? 'Export copy' : `${action[0]!.toUpperCase()}${action.slice(1)}`,
        });
        button.type = 'button';
        button.dataset.renderKey = stableRenderKey('dm', 'save-manager', 'save', row.id, 'action', action);
        button.dataset.intent = action;
        button.addEventListener('click', () => {
          if (action === 'rename') {
            const renamed = window.prompt('Save name', row.name);
            if (renamed !== null) {
              void this.#runSaveManagerAction(() => controller.dispatch({
                kind: 'rename', saveId: row.id, name: renamed,
              }));
            }
            return;
          }
          if (action === 'delete') {
            void this.#runSaveManagerAction(async () => {
              await controller.dispatch({ kind: 'request_delete', saveId: row.id });
              this.#pendingDelete = controller.pendingDelete();
              this.#render();
            });
            return;
          }
          void this.#runSaveManagerAction(() => controller.dispatch({
            kind: action === 'export_copy' ? 'export_copy' : 'load',
            saveId: row.id,
          }));
        });
        actions.append(button);
      }
      item.append(actions);
      if (model.pendingDelete?.saveId === row.id) {
        const confirmation = element('form', { className: 'dm-save-delete-confirmation' });
        confirmation.dataset.renderKey = stableRenderKey(
          'dm',
          'save-manager',
          'save',
          row.id,
          'delete-confirmation',
        );
        confirmation.append(element('p', {
          text: `Type ${model.pendingDelete.requiredText} to delete this save.`,
        }));
        const typedName = element('input');
        typedName.dataset.renderKey = stableRenderKey(
          'dm', 'save-manager', 'save', row.id, 'delete-confirmation', 'name',
        );
        typedName.setAttribute('aria-label', `Type ${row.name} to confirm deletion`);
        const confirm = element('button', { text: 'Confirm delete' });
        confirm.type = 'submit';
        confirm.dataset.renderKey = stableRenderKey(
          'dm', 'save-manager', 'save', row.id, 'delete-confirmation', 'confirm',
        );
        const cancel = element('button', { text: 'Cancel delete' });
        cancel.type = 'button';
        cancel.dataset.renderKey = stableRenderKey(
          'dm', 'save-manager', 'save', row.id, 'delete-confirmation', 'cancel',
        );
        cancel.addEventListener('click', () => {
          void this.#runSaveManagerAction(async () => {
            await controller.dispatch({ kind: 'cancel_delete' });
            this.#pendingDelete = null;
            this.#saveManagerController = null;
            this.#render();
          });
        });
        confirmation.addEventListener('submit', (event) => {
          event.preventDefault();
          void this.#runSaveManagerAction(async () => {
            await controller.dispatch({
              kind: 'confirm_delete', saveId: row.id, typedName: typedName.value,
            });
            this.#pendingDelete = controller.pendingDelete();
            if (this.#pendingDelete === null) this.#saveManagerController = null;
            this.#render();
          });
        });
        confirmation.append(typedName, confirm, cancel);
        item.append(confirmation);
      }
      list.append(item);
    }
    manager.append(list);
    return manager;
  }

  #render(): void {
    const startedAt = performance.now();
    const live = this.#shell;
    const draft = element('main', { className: 'encounter-shell dm-encounter' });
    this.#shell = draft;
    try {
      this.#renderFresh();
    } finally {
      this.#shell = live;
    }
    reconcileStableRenderedChildren(live, draft);
    const renderMs = performance.now() - startedAt;
    this.#renderCount += 1;
    this.#renderTotalMs += renderMs;
    this.#renderMaximumMs = Math.max(this.#renderMaximumMs, renderMs);
    live.dataset.persistenceFlushCount = String(this.#flushCount);
    live.dataset.persistenceFlushTotalMs = String(this.#flushTotalMs);
    live.dataset.persistenceFlushMaximumMs = String(this.#flushMaximumMs);
    live.dataset.renderCount = String(this.#renderCount);
    live.dataset.renderTotalMs = String(this.#renderTotalMs);
    live.dataset.renderMaximumMs = String(this.#renderMaximumMs);
    live.dataset.coalescedSnapshotCount = String(this.#coalescedSnapshotCount);
    live.dataset.sessionRevision = String(this.#projection?.history.at(-1)?.revision ?? 0);
    if (this.#focusAfterRender !== null) applyPendingPlacementFocus(
      live,
      this.#focusAfterRender,
      this.#projection?.board.activeCombatant ?? null,
    );
    this.#focusAfterRender = null;
  }

  #renderPendingPlacementRecovery(recovery: TopDownPendingPlacementRecovery): HTMLElement {
    const panel = renderPendingPlacementRecoveryHeading(recovery);

    const key = `${recovery.combatantId}:${recovery.reason}`;
    const firstSize = recovery.sizeOptions[0];
    if (firstSize === undefined) throw new Error('Pending placement recovery has no size options.');
    const currentSize = this.#recoverySelection?.key === key
      ? recovery.sizeOptions.find((entry) => entry.size === this.#recoverySelection?.size) ?? firstSize
      : firstSize;
    const suggestedKey = recovery.suggestedAnchor === null
      ? null
      : `${String(recovery.suggestedAnchor.column)},${String(recovery.suggestedAnchor.row)}`;
    const preferredAnchor = this.#recoverySelection?.key === key
      ? currentSize.legalAnchors.find((entry) =>
          `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}` ===
          this.#recoverySelection?.anchorKey)
      : currentSize.legalAnchors.find((entry) =>
          `${String(entry.anchor.column)},${String(entry.anchor.row)}` === suggestedKey);
    const currentAnchor = preferredAnchor ?? currentSize.legalAnchors[0] ?? null;
    this.#recoverySelection = {
      key,
      size: currentSize.size,
      anchorKey: currentAnchor === null
        ? ''
        : `${String(currentAnchor.anchor.column)},${String(currentAnchor.anchor.row)}:${currentAnchor.placementMode}`,
    };

    const form = element('form');
    form.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'form',
    );
    const sizeLabel = element('label', { text: 'Creature size' });
    sizeLabel.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'size-label',
    );
    const size = element('select');
    size.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'size',
    );
    size.setAttribute('aria-label', `Creature size for ${recovery.combatantName}`);
    size.disabled = recovery.sizeInput === 'fixed';
    for (const entry of recovery.sizeOptions) {
      const option = element('option', { text: entry.size });
      option.value = entry.size;
      option.selected = entry.size === currentSize.size;
      size.append(option);
    }
    size.addEventListener('change', () => {
      const selected = recovery.sizeOptions.find((entry) => entry.size === size.value);
      if (selected === undefined) return;
      const firstAnchor = selected.legalAnchors[0] ?? null;
      this.#recoverySelection = {
        key,
        size: selected.size,
        anchorKey: firstAnchor === null
          ? ''
          : `${String(firstAnchor.anchor.column)},${String(firstAnchor.anchor.row)}:${firstAnchor.placementMode}`,
      };
      this.#render();
    });
    sizeLabel.append(size);

    const anchorLabel = element('label', { text: 'Legal anchor' });
    anchorLabel.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'anchor-label',
    );
    const anchor = element('select');
    anchor.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'anchor',
    );
    anchor.setAttribute('aria-label', `Legal anchor for ${recovery.combatantName}`);
    for (const entry of currentSize.legalAnchors) {
      const anchorKey = `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}`;
      const option = element('option', {
        text: `${String(entry.anchor.column)},${String(entry.anchor.row)} (${entry.placementMode})`,
      });
      option.value = anchorKey;
      option.selected = anchorKey === this.#recoverySelection.anchorKey;
      anchor.append(option);
    }
    anchor.disabled = currentSize.legalAnchors.length === 0;
    anchor.addEventListener('change', () => {
      this.#recoverySelection = { key, size: currentSize.size, anchorKey: anchor.value };
      this.#render();
    });
    anchorLabel.append(anchor);

    const submit = element('button', { text: 'Place combatant and continue' });
    submit.dataset.renderKey = stableRenderKey(
      'dm', 'pending-placement-recovery', recovery.combatantId, recovery.reason, 'submit',
    );
    submit.type = 'submit';
    submit.disabled = currentAnchor === null;
    form.append(sizeLabel, anchorLabel, submit);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const selectedSize = recovery.sizeOptions.find((entry) => entry.size === size.value);
      const selectedAnchor = selectedSize?.legalAnchors.find((entry) =>
        `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}` === anchor.value);
      if (selectedSize === undefined || selectedAnchor === undefined) return;
      this.#submitTopDown(
        () => this.#session.submitTopDownPlacement(selectedAnchor.offeredActionId),
        undefined,
        () => { this.#focusAfterRender = 'recovery'; },
      );
    });
    panel.append(form);
    return panel;
  }

  #renderDmBoard(projection: TopDownDmBoardProjection): void {
    const boardFog = new Set(projection.board.foggedCells.map(
      (cell) => `${String(cell.column)},${String(cell.row)}`,
    ));
    if (projection.encounter.dmOnly.foggedCells.some(
      (cell) => !boardFog.has(`${String(cell.column)},${String(cell.row)}`),
    )) {
      throw new Error('DM board omitted encounter fog.');
    }
    const movementPreview = this.boardSnapshotInformation === 'blind_state'
      ? null
      : projection.movementPreviews.find(
          (preview) => preview.commandKey === this.#movementPreviewKey,
        ) ?? null;
    const previewCells = new Set(movementPreview?.path.map(
      (cell) => `${String(cell.column)},${String(cell.row)}`,
    ) ?? []);
    if (
      this.boardSnapshotInformation !== 'blind_state' &&
      projection.pendingPlacementRecovery !== null
    ) {
      this.#shell.append(this.#renderPendingPlacementRecovery(projection.pendingPlacementRecovery));
      const selection = this.#recoverySelection;
      const sizeOption = selection === null
        ? undefined
        : projection.pendingPlacementRecovery.sizeOptions.find(
            (entry) => entry.size === selection.size,
          );
      const legalAnchor = sizeOption?.legalAnchors.find((entry) =>
        `${String(entry.anchor.column)},${String(entry.anchor.row)}:${entry.placementMode}` ===
        selection?.anchorKey);
      for (const cell of legalAnchor?.footprint ?? []) {
        previewCells.add(`${String(cell.column)},${String(cell.row)}`);
      }
    }
    if (!this.boardSnapshotMode) {
      const boardContext: AccessibleBoardContext = {
        encounterName: this.#sessionFlow?.name ?? 'Reference encounter',
        audience: 'dm',
        round: projection.board.round,
        activeCombatant: projection.board.activeCombatant,
        board: projection.board,
      };
      this.#shell.append(boardPresentationControls({
        audience: 'dm',
        mode: this.#boardView,
        context: boardContext,
        setMode: (mode) => {
          this.#boardView = mode;
          writeAccessibleBoardViewMode(localStorage, 'dm', mode);
          this.#render();
        },
      }));
      const toggle = element('label', { className: 'dm-option-path-toggle' });
      toggle.dataset.renderKey = stableRenderKey('dm', 'option-path-toggle', 'label');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this.#showOfferedOptionPaths;
      checkbox.dataset.renderKey = stableRenderKey('dm', 'option-path-toggle', 'input');
      checkbox.addEventListener('change', () => {
        this.#showOfferedOptionPaths = checkbox.checked;
        this.#render();
      });
      toggle.append(checkbox, element('span', { text: 'Show engine movement options' }));
      this.#shell.append(toggle);
      if (this.#boardView === 'screen_reader') {
        this.#shell.append(renderAccessibleBoard(boardContext));
        return;
      }
    }
    const renderedBoard = renderBoard(projection.board, previewCells, movementPreview, {
      revision: projection.encounter.revision,
      round: projection.board.round,
      stateDigest: projection.stateDigest,
    }, this.boardGlyphs, this.boardSnapshotMode, this.captureTilePx,
    this.boardSnapshotInformation !== 'blind_state' &&
      (this.boardSnapshotMode || this.#showOfferedOptionPaths)
      ? projection.offeredOptionPaths
      : null, this.#stackSelection, new Map(projection.board.worldObjects.map((object) => {
        const label = dmWorldObjectLabel(projection, String(object.id));
        if (label === null) throw new Error(`Missing DM world-object label for ${String(object.id)}.`);
        return [label.objectId, label.text] as const;
      })));
    if (this.boardSnapshotInformation === 'blind_state') {
      renderedBoard.dataset.blindSnapshotCapture = 'true';
      renderedBoard.dataset.blindSnapshotRole = 'dm_board';
    }
    this.#shell.append(renderedBoard);
    if (movementPreview !== null) this.#shell.append(renderMovementDangerLegend(movementPreview));
  }

  #markBlindSnapshotCapture(
    element: HTMLElement,
    projection: TopDownDmBoardProjection,
    role: BoardSnapshotRole,
  ): void {
    element.dataset.blindSnapshotCapture = 'true';
    element.dataset.blindSnapshotRole = role;
    element.dataset.boardAudience = role === 'player_board' ? 'player' : 'dm';
    element.dataset.sourceRevision = String(projection.encounter.revision);
    element.dataset.sourceRound = String(projection.board.round);
    element.dataset.sourceStateDigest = projection.stateDigest;
    element.dataset.boardGlyphs = encounterArtForBoard(
      projection.board,
      this.boardGlyphs,
    ).boardGlyphs;
  }

  #renderBlindStateSnapshot(projection: TopDownDmBoardProjection): void {
    switch (this.boardSnapshotRole) {
      case 'dm_board':
        this.#renderDmBoard(projection);
        return;
      case 'accessible_board_raster': {
        const accessible = renderAccessibleBoard({
          encounterName: this.#sessionFlow?.name ?? 'Reference encounter',
          audience: 'dm',
          round: projection.board.round,
          activeCombatant: projection.board.activeCombatant,
          board: projection.board,
        });
        // D571 leaves action/target-specific reach conclusions to the model.
        accessible.querySelector('#reach-heading')?.closest('section')?.remove();
        this.#markBlindSnapshotCapture(accessible, projection, 'accessible_board_raster');
        this.#shell.append(accessible);
        return;
      }
      case 'player_board': {
        const player = this.#playerProjection;
        if (player === null) return;
        const board = renderBoard(player, new Set(), null, undefined, this.boardGlyphs);
        this.#markBlindSnapshotCapture(board, projection, 'player_board');
        this.#shell.append(board);
        return;
      }
    }
  }

  #renderFresh(): void {
    this.#shell.replaceChildren(
      element('p', { className: 'vtt-kicker', text: 'DM-local authority' }),
      element('h1', { text: 'DM controls' }),
    );
    const projection = this.#projection;
    if (projection === null) return;
    if (this.boardSnapshotMode) {
      this.#shell.replaceChildren();
      if (this.boardSnapshotInformation === 'blind_state') {
        this.#renderBlindStateSnapshot(projection);
      } else {
        this.#renderDmBoard(projection);
      }
      this.#shell.append(this.#renderSaveManager());
      return;
    }
    if (this.#channelError !== null) {
      const error = element('p', { text: this.#channelError });
      error.setAttribute('role', 'alert');
      error.dataset.channelError = 'true';
      this.#shell.append(error);
    }
    const status = element('p', {
      text: projection.encounter.phase.kind === 'concluded'
        ? `Encounter concluded: ${projection.encounter.phase.outcome}`
        : projection.coordinator.pause === null
          ? 'Encounter running'
          : `Paused: ${projection.coordinator.pause.kind}`,
    });
    status.dataset.renderKey = stableRenderKey('dm', 'encounter-status');
    status.dataset.pause = projection.coordinator.pause?.kind ?? 'none';
    this.#shell.append(status);
    if (projection.encounter.phase.kind === 'concluded') {
      this.#shell.append(renderDmEncounterOutcome(projection.encounter.phase));
    }
    this.#shell.append(this.#renderSaveManager());
    if (projection.partySession !== null) {
      const dayEnded = projection.partySession.state.adventuringDayStatus === 'ended_by_long_rest';
      const adventuringDay = element('p', {
        text: this.#sessionFlow === null
          ? dayEnded
            ? `Adventuring day ended by Long Rest · room ${String(projection.partySession.state.room)} · 2024 rules`
            : `Adventuring day — room ${String(projection.partySession.state.room)} of 4 · 2024 rules`
          : `${this.#sessionFlow.name} — encounter ${String(projection.partySession.state.room)} of ${String(this.#sessionFlow.encounterCount)} · 2024 rules`,
      });
      adventuringDay.className = 'adventuring-day-status';
      adventuringDay.dataset.room = String(projection.partySession.state.room);
      adventuringDay.dataset.status = projection.partySession.state.adventuringDayStatus;
      this.#shell.append(adventuringDay);
    }

    const controls = element('div', { className: 'encounter-controls dm-controls' });
    controls.dataset.renderKey = stableRenderKey('dm', 'controls');
    const interrupt = element('button', { text: 'Interrupt' });
    interrupt.type = 'button';
    interrupt.dataset.renderKey = stableRenderKey('dm', 'controls', 'interrupt');
    interrupt.addEventListener('click', () => this.#session.interrupt());
    const resume = element('button', { text: 'Resume' });
    resume.type = 'button';
    resume.dataset.renderKey = stableRenderKey('dm', 'controls', 'resume');
    resume.addEventListener('click', () => this.#session.resume());
    const undo = element('button', { text: 'Undo last' });
    undo.type = 'button';
    undo.dataset.renderKey = stableRenderKey('dm', 'controls', 'undo-last');
    undo.addEventListener('click', () => void this.#session.undoLast());
    const skip = element('button', { text: 'Skip turn' });
    skip.type = 'button';
    skip.dataset.renderKey = stableRenderKey('dm', 'controls', 'skip-turn');
    skip.disabled = projection.timeline.currentCombatant === null || projection.timeline.phase.kind === 'concluded';
    skip.addEventListener('click', () => {
      void this.#session.skipTurn().catch((error: unknown) => {
        this.#channelError = error instanceof Error ? error.message : 'Skip turn failed.';
        this.#render();
      });
    });
    controls.append(interrupt, resume, undo, skip);
    const currentPosition = projection.timeline.initiative.find(
      (entry) => entry.current,
    )?.position;
    const later = projection.timeline.initiative.filter(
      (entry) => currentPosition !== undefined && entry.position > currentPosition && entry.life !== 'dead',
    );
    if (later.length > 0 && projection.timeline.phase.kind === 'active') {
      const delay = element('form', { className: 'dm-delay-turn' });
      delay.dataset.renderKey = stableRenderKey(
        'dm',
        'controls',
        'delay-turn',
        projection.timeline.currentCombatant ?? 'none',
      );
      const target = element('select');
      target.dataset.renderKey = stableRenderKey(
        'dm',
        'controls',
        'delay-turn',
        projection.timeline.currentCombatant ?? 'none',
        'target',
      );
      target.setAttribute('aria-label', 'Delay current turn until after');
      for (const entry of later) {
        const option = element('option', { text: `After ${entry.name}` });
        option.value = entry.combatant;
        target.append(option);
      }
      const submit = element('button', { text: 'Delay turn' });
      submit.type = 'submit';
      submit.dataset.renderKey = stableRenderKey(
        'dm',
        'controls',
        'delay-turn',
        projection.timeline.currentCombatant ?? 'none',
        'submit',
      );
      delay.append(target, submit);
      delay.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = later.find((entry) => entry.combatant === target.value);
        if (selected === undefined) return;
        void this.#session.delayTurn(selected.combatant).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Delay turn failed.';
          this.#render();
        });
      });
      controls.append(delay);
    }
    if (projection.partySession !== null && projection.partySession.state.adventuringDayStatus === 'active') {
      const longRest = element('button', { text: 'Complete Long Rest and end adventuring day' });
      longRest.type = 'button';
      longRest.dataset.renderKey = stableRenderKey('dm', 'controls', 'long-rest');
      longRest.addEventListener('click', () => {
        void this.#session.finishAdventuringDay().catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Long Rest failed.';
          this.#render();
        });
      });
      controls.append(longRest);

      const interruption = element('form', { className: 'dm-rest-interruption' });
      interruption.dataset.renderKey = stableRenderKey('dm', 'controls', 'rest-interruption');
      const outcomeLabel = element('label', { text: 'Interruption outcome' });
      outcomeLabel.dataset.renderKey = stableRenderKey(
        'dm', 'controls', 'rest-interruption', 'outcome-label',
      );
      const outcomeSelect = element('select');
      outcomeSelect.dataset.renderKey = stableRenderKey(
        'dm', 'controls', 'rest-interruption', 'outcome',
      );
      outcomeSelect.setAttribute('aria-label', 'Rest interruption outcome');
      for (const outcome of REST_INTERRUPTION_DM_CONTROL.outcomes) {
        const option = element('option', { text: outcome.replaceAll('_', ' ') });
        option.value = outcome;
        outcomeSelect.append(option);
      }
      outcomeLabel.append(outcomeSelect);
      interruption.append(outcomeLabel);
      const benefitInputs = REST_INTERRUPTION_DM_CONTROL.partialBenefitChecklist.map((benefit) => {
        const label = element('label', { text: benefit.replaceAll('_', ' ') });
        label.dataset.renderKey = stableRenderKey(
          'dm', 'controls', 'rest-interruption', 'benefit', benefit, 'label',
        );
        const input = element('input');
        input.type = 'checkbox';
        input.dataset.renderKey = stableRenderKey(
          'dm', 'controls', 'rest-interruption', 'benefit', benefit, 'input',
        );
        input.value = benefit;
        input.setAttribute('aria-label', `Apply ${benefit.replaceAll('_', ' ')}`);
        label.prepend(input);
        interruption.append(label);
        return { benefit, input };
      });
      const interrupted = element('button', { text: REST_INTERRUPTION_DM_CONTROL.label });
      interrupted.type = 'submit';
      interrupted.dataset.renderKey = stableRenderKey(
        'dm', 'controls', 'rest-interruption', 'submit',
      );
      interruption.append(interrupted);
      interruption.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = outcomeSelect.value;
        let outcome: RestInterruptionOutcome;
        if (selected === 'no_benefit') outcome = { kind: 'no_benefit' };
        else if (selected === 'resumed') outcome = { kind: 'resumed' };
        else if (selected === 'partial_per_dm') {
          outcome = {
            kind: 'partial_per_dm',
            benefits: benefitInputs.flatMap(({ benefit, input }): readonly LongRestBenefit[] =>
              input.checked ? [benefit] : []),
          };
        } else {
          throw new Error(`Unknown Rest interruption outcome ${selected}.`);
        }
        void this.#session.resolveRestInterruption(outcome).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Rest interruption failed.';
          this.#render();
        });
      });
      controls.append(interruption);
    }
    if (projection.partySession !== null &&
      projection.partySession.state.adventuringDayStatus === 'active' &&
      projection.partySession.state.room < (this.#sessionFlow?.encounterCount ?? 4)) {
      const nextRoom = element('button', { text: 'End room and enter next room' });
      nextRoom.type = 'button';
      nextRoom.dataset.renderKey = stableRenderKey('dm', 'controls', 'next-room');
      nextRoom.addEventListener('click', () => {
        void this.#session.finishRoom(null).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Room transition failed.';
          this.#render();
        });
      });
      controls.append(nextRoom);
    }
    if (projection.partySession !== null && this.#sessionFlow !== null &&
      projection.partySession.state.room === this.#sessionFlow.encounterCount) {
      const endSession = element('button', { text: this.#sessionFlow.endControlLabel });
      endSession.type = 'button';
      endSession.dataset.renderKey = stableRenderKey('dm', 'controls', 'end-session');
      endSession.dataset.intent = 'end_session';
      endSession.disabled = this.#endSessionExported || this.#session.sessionEnded();
      endSession.addEventListener('click', () => {
        endSession.disabled = true;
        void this.#runSaveManagerAction(async () => {
          await this.#session.endSession();
          const sessionId = encounterSessionId(this.sessionId);
          const exported = await this.#lifecycle.dispatch({
            kind: 'export', storageId: `session:${sessionId}`, sessionId,
          });
          if (exported.kind !== 'exported') throw new Error('Session lifecycle returned an invalid export result.');
          decodeSavedSessionFingerprint(exported.bytes);
          this.#download(sessionId, exported.bytes);
          this.#endSessionExported = true;
          this.#render();
        });
      });
      controls.append(endSession);
      if (this.#endSessionExported || this.#session.sessionEnded()) {
        const routed = element('p', {
          className: 'dm-end-session-export-status',
          text: 'Session finalized. The complete session export is ready in the save manager and was downloaded.',
        });
        routed.setAttribute('role', 'status');
        controls.append(routed);
      }
    }
    this.#shell.append(controls);

    const timeline = element('section', { className: 'dm-initiative-timeline' });
    timeline.dataset.renderKey = stableRenderKey('dm', 'initiative-timeline');
    timeline.dataset.round = String(projection.timeline.round);
    timeline.dataset.encounterStatus = projection.timeline.phase.kind;
    timeline.append(element('h2', { text: `Initiative timeline — round ${String(projection.timeline.round)}` }));
    const strip = element('ol', { className: 'dm-initiative-strip' });
    strip.dataset.encounterStatus = projection.timeline.phase.kind;
    strip.dataset.concluded = String(projection.timeline.phase.kind === 'concluded');
    for (const entry of projection.timeline.initiative) {
      const item = element('li', {
        text: `${entry.name}${entry.delayedThisRound ? ' (delayed)' : ''}`,
      });
      item.dataset.combatantId = entry.combatant;
      item.dataset.current = String(entry.current);
      item.dataset.delayed = String(entry.delayedThisRound);
      strip.append(item);
    }
    timeline.append(strip);
    const preview = element('ol', { className: 'dm-next-event-preview' });
    for (const upcoming of projection.timeline.upcoming) {
      const boundaryName = projection.timeline.initiative.find(
        (entry) => entry.combatant === upcoming.boundary.combatant,
      )?.name ?? upcoming.boundary.combatant;
      let text: string;
      switch (upcoming.kind) {
        case 'legendary_action_window':
          text = `Round ${String(upcoming.boundary.round)}, after ${boundaryName}: legendary-action window`;
          break;
        case 'effect_expiry':
          text = `Round ${String(upcoming.boundary.round)}, ${boundaryName} ${upcoming.boundary.boundary}: effect ${upcoming.effectId} expires`;
          break;
        case 'burn_away':
          text = `Round ${String(upcoming.boundary.round)}, ${boundaryName} start: ${String(upcoming.cells.length)} burning surface cell(s) burn away`;
          break;
        case 'repeated_save_prompt':
          text = `Round ${String(upcoming.boundary.round)}, ${boundaryName} ${upcoming.boundary.boundary}: ${upcoming.ability} save DC ${String(upcoming.dc)}`;
          break;
      }
      const item = element('li', { text });
      item.dataset.eventKind = upcoming.kind;
      item.dataset.round = String(upcoming.boundary.round);
      preview.append(item);
    }
    if (projection.timeline.upcoming.length === 0) {
      preview.append(element('li', { text: 'No mechanically scheduled events.' }));
    }
    timeline.append(element('h3', { text: 'Next-event preview' }), preview);
    const rewind = element('div', { className: 'dm-round-rewind' });
    rewind.dataset.renderKey = stableRenderKey('dm', 'initiative-timeline', 'rewind');
    rewind.append(element('h3', { text: 'Rewind to round boundary' }));
    for (const boundary of projection.timeline.roundBoundaries) {
      if (boundary.current) continue;
      const button = element('button', { text: `Rewind to round ${String(boundary.round)}` });
      button.type = 'button';
      button.dataset.renderKey = stableRenderKey(
        'dm', 'initiative-timeline', 'rewind', `round-${String(boundary.round)}`,
      );
      button.dataset.revision = String(boundary.revision);
      button.addEventListener('click', () => {
        void this.#session.rewindToRound(boundary.round).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Round rewind failed.';
          this.#render();
        });
      });
      rewind.append(button);
    }
    for (const branch of projection.timeline.branchPoints) {
      const marker = element('p', {
        text: `Branch at round ${String(branch.round)}: revision ${String(branch.sourceRevision)} → ${String(branch.targetRevision)}`,
      });
      marker.dataset.branchRevision = String(branch.revision);
      rewind.append(marker);
    }
    timeline.append(rewind);
    this.#shell.append(timeline);
    for (const entry of projection.history) {
      if (entry.void || entry.transition.kind !== 'party_state_captured' ||
        entry.transition.restInterruption === undefined) continue;
      const card = element('section', { className: 'rest-interruption-ruling-card' });
      card.dataset.revision = String(entry.revision);
      card.dataset.choice = entry.transition.restInterruption.ruling.choice;
      card.append(
        element('h2', { text: `Rest interrupted — ${entry.transition.restInterruption.ruling.choice.replaceAll('_', ' ')}` }),
        element('p', { text: entry.transition.restInterruption.ruling.reasoning }),
      );
      this.#shell.append(card);
    }

    if (projection.partySession !== null &&
      projection.partySession.state.adventuringDayStatus === 'active' &&
      projection.partySession.state.room < (this.#sessionFlow?.encounterCount ?? 4)) {
      const roomKey = `room-${String(projection.partySession.state.room)}`;
      const rest = element('form', { className: 'dm-short-rest' });
      rest.dataset.renderKey = stableRenderKey('dm', 'short-rest', roomKey);
      rest.append(element('h2', { text: 'Short Rest before next room' }));
      const requested: Array<{
        readonly combatantId: CombatantId;
        readonly sides: 6 | 8 | 10 | 12;
        readonly input: HTMLInputElement;
      }> = [];
      for (const character of projection.partySession.state.characters) {
        const name = projection.encounter.combatants.find(
          (candidate) => candidate.id === character.combatantId,
        )?.name ?? character.combatantId;
        for (const pool of character.hitDice) {
          const label = element('label');
          label.dataset.renderKey = stableRenderKey(
            'dm', 'short-rest', roomKey, character.combatantId, `d${String(pool.sides)}`, 'label',
          );
          label.append(document.createTextNode(
            `${name}: spend d${String(pool.sides)} Hit Point Dice (${String(pool.remaining)} remaining; ${String(character.currentHitPoints)} of ${String(character.hitPointMaximum)} HP)`,
          ));
          const input = element('input');
          input.type = 'number';
          input.dataset.renderKey = stableRenderKey(
            'dm', 'short-rest', roomKey, character.combatantId, `d${String(pool.sides)}`, 'input',
          );
          input.min = '0';
          input.max = String(pool.remaining);
          input.value = '0';
          input.dataset.combatantId = character.combatantId;
          input.dataset.currentHitPoints = String(character.currentHitPoints);
          input.dataset.hitPointMaximum = String(character.hitPointMaximum);
          input.disabled = character.currentHitPoints < 1 || character.life !== 'living';
          input.setAttribute('aria-label', `${name} d${String(pool.sides)} Hit Point Dice to spend`);
          label.append(input);
          rest.append(label);
          requested.push({ combatantId: character.combatantId, sides: pool.sides, input });
        }
      }
      const finishRest = element('button', { text: 'Take Short Rest and enter next room' });
      finishRest.type = 'submit';
      finishRest.dataset.renderKey = stableRenderKey('dm', 'short-rest', roomKey, 'submit');
      rest.append(finishRest);
      rest.addEventListener('submit', (event) => {
        event.preventDefault();
        const byCombatant = new Map<CombatantId, Array<{ readonly sides: 6 | 8 | 10 | 12; readonly count: number }>>();
        for (const request of requested) {
          const dice = byCombatant.get(request.combatantId) ?? [];
          dice.push({ sides: request.sides, count: Number(request.input.value) });
          byCombatant.set(request.combatantId, dice);
        }
        void this.#session.finishRoom([...byCombatant].map(([combatantId, dice]) => ({
          combatantId,
          dice,
        }))).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Short Rest failed.';
          this.#render();
        });
      });
      this.#shell.append(rest);
    }

    for (const entry of projection.history) {
      if (entry.void || entry.transition.kind !== 'long_rest_completed') continue;
      const card = element('section', { className: 'long-rest-summary-card' });
      card.dataset.revision = String(entry.revision);
      card.append(element('h2', {
        text: `Long Rest completed — ${String(entry.transition.summary.durationHours)} hours`,
      }));
      const restored = element('ul');
      for (const character of entry.transition.summary.characters) {
        const name = projection.encounter.combatants.find(
          (candidate) => candidate.id === character.combatantId,
        )?.name ?? character.combatantId;
        const hitDice = character.hitDiceRestored.length === 0
          ? '0 Hit Point Dice'
          : character.hitDiceRestored.map((die) => `${String(die.count)}d${String(die.sides)}`).join(', ');
        const slots = character.spellSlotsRestored.length === 0
          ? '0 spell slots'
          : character.spellSlotsRestored.map((slot) =>
            `${slot.pool} level ${String(slot.level)} × ${String(slot.count)}`).join(', ');
        const resources = character.limitedResourcesRestored.length === 0
          ? '0 long-rest feature uses'
          : character.limitedResourcesRestored.map((resource) =>
            `${resource.id} × ${String(resource.count)}`).join(', ');
        restored.append(element('li', {
          text: `${name}: ${String(character.hitPointsRestored)} HP; ${hitDice}; ${slots}; Exhaustion −${String(character.exhaustionLevelsRemoved)}; ${resources}; ${character.lifeBefore} → ${character.lifeAfter}`,
        }));
      }
      card.append(restored);
      const citations = element('p', {
        text: `Rules: ${Object.values(entry.transition.summary.citations).join('; ')}. Stable-at-0 eligibility resolves through the cited natural recovery before Long Rest benefits. Interruption handling is deferred.`,
      });
      citations.className = 'long-rest-citations';
      card.append(citations);
      this.#shell.append(card);
    }

    this.#renderDmBoard(projection);

    const tray = element('section', { className: 'dm-decision-tray' });
    tray.dataset.renderKey = stableRenderKey('dm', 'decision-tray');
    tray.append(element('h2', { text: 'Decision tray' }));
    tray.dataset.boundaryBlocked = String(projection.decisionTray.boundaryRefusal !== null);
    if (projection.decisionTray.boundaryRefusal !== null) {
      const refusal = element('p', {
        className: 'dm-decision-refusal',
        text: projection.decisionTray.boundaryRefusal.message,
      });
      refusal.dataset.renderKey = stableRenderKey('dm', 'decision-tray', 'boundary-refusal');
      refusal.setAttribute('role', 'alert');
      refusal.dataset.refusalCode = projection.decisionTray.boundaryRefusal.code;
      tray.append(refusal);
    }
    if (projection.decisionTray.actionRefusal !== null) {
      const refusal = element('p', {
        className: 'dm-decision-refusal',
        text: `${projection.decisionTray.actionRefusal.reason} (${projection.decisionTray.actionRefusal.citation})`,
      });
      refusal.dataset.renderKey = stableRenderKey('dm', 'decision-tray', 'action-refusal');
      refusal.setAttribute('role', 'alert');
      refusal.dataset.refusalCategory = projection.decisionTray.actionRefusal.category;
      tray.append(refusal);
    }
    if (projection.decisionTray.entries.length === 0) {
      tray.append(element('p', { text: 'No queued or automatic decisions.' }));
    }
    for (const entry of projection.decisionTray.entries) {
      const row = element('article', { className: `dm-decision-entry dm-decision-${entry.kind}` });
      row.dataset.entryKind = entry.kind;
      if (entry.kind === 'engine_adjudication') {
        row.dataset.decisionId = entry.request.adjudicationRequestId;
        row.dataset.decisionKind = 'engine_adjudication';
        row.dataset.renderKey = stableRenderKey(
          'dm', 'decision-tray', 'engine-adjudication', entry.request.adjudicationRequestId,
        );
        row.append(
          element('h3', { text: `${entry.combatantName} — DM adjudication requested` }),
          element('p', { text: `${entry.request.subject}: ${entry.request.reason}` }),
        );
        for (const outcome of entry.request.suggestedOutcomes) {
          row.append(element('p', { text: `Suggested: ${outcome}` }));
        }
        const amount = element('input');
        amount.type = 'number';
        amount.value = '0';
        amount.setAttribute('aria-label', 'Engine adjudication hit point delta');
        const reasoning = element('input');
        reasoning.value = 'DM verdict for the engine adjudication request.';
        reasoning.setAttribute('aria-label', 'Engine adjudication reasoning');
        const apply = element('button', { text: `Apply DM verdict for ${entry.combatantName}` });
        apply.type = 'button';
        apply.addEventListener('click', () => {
          const parsed = Number(amount.value);
          if (!Number.isSafeInteger(parsed) || reasoning.value.trim().length === 0) return;
          this.#session.resolveEngineAdjudication(
            entry.request.adjudicationRequestId,
            { kind: 'hit_point_delta', amount: parsed },
            reasoning.value,
          );
        });
        row.append(amount, reasoning, apply);
        tray.append(row);
        continue;
      }
      if (entry.kind === 'pending') {
        row.dataset.decisionId = entry.decision.id;
        row.dataset.decisionKind = entry.decision.kind;
        row.dataset.renderKey = stableRenderKey('dm', 'decision-tray', 'decision', entry.decision.id);
        row.append(
          element('h3', {
            text: `${entry.combatantName} — ${decisionHeading(entry.decision)}`,
          }),
          element('p', { text: entry.triggerContext }),
        );
        if (entry.decision.kind === 'adjudication_prompt') {
          const amount = element('input');
          amount.type = 'number';
          amount.dataset.renderKey = stableRenderKey(
            'dm', 'decision-tray', 'decision', entry.decision.id, 'override-amount',
          );
          amount.value = '0';
          amount.setAttribute('aria-label', 'DM override hit point delta');
          const button = element('button', { text: `Apply DM override for ${entry.combatantName}` });
          button.type = 'button';
          button.dataset.renderKey = stableRenderKey(
            'dm',
            'decision-tray',
            'decision',
            entry.decision.id,
            'option',
            entry.decision.options[0]?.id ?? 'rule_manually',
          );
          button.addEventListener('click', () => {
            const parsed = Number(amount.value);
            if (!Number.isSafeInteger(parsed)) return;
            this.#session.resolveRefusalPrompt(
              entry.decision.id,
              { kind: 'hit_point_delta', amount: parsed },
              'DM manually resolved the refused action.',
            );
          });
          row.append(amount, button);
          tray.append(row);
          continue;
        }
        for (const option of entry.decision.options) {
          const button = element('button', { text: `${option.label} for ${entry.combatantName}` });
          button.type = 'button';
          button.dataset.renderKey = stableRenderKey(
            'dm',
            'decision-tray',
            'decision',
            entry.decision.id,
            'option',
            option.id,
          );
          button.addEventListener('click', () => {
            button.disabled = true;
            void this.#session.resolvePendingDecision(entry.decision.id, option.id).catch((error: unknown) => {
              this.#channelError = error instanceof Error ? error.message : 'Decision resolution failed.';
              this.#render();
            });
          });
          row.append(button);
        }
      } else {
        row.dataset.policy = entry.policy;
        row.dataset.sequence = String(entry.sequence);
        row.dataset.renderKey = stableRenderKey(
          'dm',
          'decision-tray',
          'automatic',
          String(entry.sequence),
        );
        row.append(element('p', {
          text: `${entry.combatantName} — ${entry.reactionKind.replaceAll('_', ' ')}: ${entry.policy} automatically ${entry.resolution === 'accept' ? 'accepted' : 'declined'}${entry.autoFired ? ' and fired' : ''}`,
        }));
      }
      tray.append(row);
    }
    this.#shell.append(tray);

    if (projection.partySession !== null) {
      const refusalSettings = element('section', { className: 'dm-refusal-settings' });
      refusalSettings.dataset.renderKey = stableRenderKey('dm', 'refusal-settings');
      refusalSettings.append(element('h2', { text: 'Refusal handling' }));
      for (const category of REFUSAL_CATEGORIES) {
        const label = element('label');
        label.dataset.renderKey = stableRenderKey('dm', 'refusal-settings', category, 'label');
        label.append(document.createTextNode(category.replaceAll('_', ' ')));
        const select = element('select');
        select.dataset.renderKey = stableRenderKey('dm', 'refusal-settings', category, 'select');
        select.setAttribute('aria-label', `${category} refusal handling`);
        for (const mode of handlingModesForCategory(category)) {
          const option = element('option', { text: mode });
          option.value = mode;
          option.selected = projection.partySession.state.refusalHandling[category] === mode;
          select.append(option);
        }
        select.addEventListener('change', () => {
          const mode = handlingModesForCategory(category).find((candidate) => candidate === select.value);
          if (mode === undefined) return;
          select.disabled = true;
          void this.#session.setRefusalHandling(category, mode as RefusalHandlingMode).catch((error: unknown) => {
            this.#channelError = error instanceof Error ? error.message : 'Refusal setting update failed.';
            this.#render();
          });
        });
        label.append(select);
        refusalSettings.append(label);
      }
      this.#shell.append(refusalSettings);

      const preferences = element('section', { className: 'dm-reaction-preferences' });
      preferences.dataset.renderKey = stableRenderKey('dm', 'reaction-preferences');
      preferences.append(element('h2', { text: 'Reaction preferences' }));
      for (const character of projection.partySession.state.characters) {
        const name = projection.encounter.combatants.find(
          (candidate) => candidate.id === character.combatantId,
        )?.name ?? character.combatantId;
        for (const reactionKind of REACTION_KINDS) {
          const current = projection.partySession.state.reactionPolicies.find(
            (entry) => entry.combatant === character.combatantId && entry.reactionKind === reactionKind,
          );
          if (current === undefined) throw new Error('Party reaction preference coverage is incomplete.');
          const label = element('label');
          label.dataset.renderKey = stableRenderKey(
            'dm', 'reaction-preferences', character.combatantId, reactionKind, 'label',
          );
          label.append(document.createTextNode(`${name} — ${reactionKind.replaceAll('_', ' ')}`));
          const select = element('select');
          select.dataset.renderKey = stableRenderKey(
            'dm', 'reaction-preferences', character.combatantId, reactionKind, 'select',
          );
          select.setAttribute('aria-label', `${name} ${reactionKind} reaction policy`);
          for (const policy of ['ask', 'always', 'never'] as const) {
            const option = element('option', { text: policy });
            option.value = policy;
            option.selected = current.policy === policy;
            select.append(option);
          }
          select.addEventListener('change', () => {
            if (select.value !== 'ask' && select.value !== 'always' && select.value !== 'never') return;
            select.disabled = true;
            void this.#session.setReactionPreference(character.combatantId, reactionKind, select.value)
              .catch((error: unknown) => {
                this.#channelError = error instanceof Error ? error.message : 'Reaction preference update failed.';
                this.#render();
              });
          });
          label.append(select);
          preferences.append(label);
        }
      }
      this.#shell.append(preferences);
    }

    const hiddenRollSettings = element('section', { className: 'dm-hidden-roll-settings' });
    hiddenRollSettings.dataset.renderKey = stableRenderKey('dm', 'hidden-roll-settings');
    hiddenRollSettings.append(element('h2', { text: 'Hidden rolls' }));
    for (const category of HIDDEN_ROLL_CATEGORIES) {
      const label = element('label');
      label.dataset.renderKey = stableRenderKey('dm', 'hidden-roll-settings', category, 'label');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.renderKey = stableRenderKey(
        'dm', 'hidden-roll-settings', category, 'checkbox',
      );
      checkbox.checked = projection.encounter.hiddenRolls.includes(category);
      checkbox.setAttribute('aria-label', `Hide ${HIDDEN_ROLL_LABELS[category].toLowerCase()}`);
      checkbox.addEventListener('change', () => {
        checkbox.disabled = true;
        void this.#session.setHiddenRollCategory(category, checkbox.checked).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Hidden-roll setting failed.';
          this.#render();
        });
      });
      label.append(checkbox, document.createTextNode(HIDDEN_ROLL_LABELS[category]));
      hiddenRollSettings.append(label);
    }
    this.#shell.append(hiddenRollSettings);

    const initiative = element('section', { className: 'dm-initiative' });
    initiative.append(element('h2', { text: `Initiative — round ${String(projection.board.round)}` }));
    const initiativeList = element('ol');
    for (const entry of projection.board.initiative) {
      const item = element('li', { text: `${entry.name}: ${String(entry.total)}` });
      item.dataset.combatantId = entry.combatant;
      item.dataset.active = String(entry.active);
      item.dataset.life = entry.life;
      initiativeList.append(item);
    }
    initiative.append(initiativeList);
    this.#shell.append(initiative);

    const pending = element('section', { className: 'dm-pending-request' });
    pending.dataset.renderKey = stableRenderKey('dm', 'pending-request');
    pending.append(element('h2', { text: 'Pending request' }));
    if (projection.pendingRequest === null) {
      pending.append(element('p', { text: 'None' }));
    } else {
      const actor = projection.encounter.combatants.find(
        (candidate) => candidate.id === projection.pendingRequest?.actorId,
      );
      pending.append(element('p', {
        text: `${projection.pendingRequest.kind}: ${actor?.name ?? projection.pendingRequest.actorId}`,
      }));
      if (projection.humanCommandActions.length > 0) {
        for (const [actionIndex, action] of projection.humanCommandActions.entries()) {
          const button = element('button', { text: actionLabel(action) });
          button.type = 'button';
          button.dataset.renderKey = stableRenderKey(
            'dm',
            'pending-request',
            projection.pendingRequest.requestId,
            actionKey(action),
          );
          const selectedOfferedActionId = this.#dmOfferedActionIds[actionIndex];
          if (selectedOfferedActionId !== undefined) {
            button.dataset.offeredActionId = selectedOfferedActionId;
            button.dataset.encounterRevision = String(projection.pendingRequest.encounterRevision);
            button.dataset.actorId = String(projection.pendingRequest.actorId);
          }
          if (action.type === 'move') {
            const key = actionKey(action);
            const destination = action.path.at(-1);
            const actor = projection.board.combatants.find(
              (combatant) => combatant.id === action.actor,
            );
            const actorPosition = actor?.placementStatus === 'placed' ? actor.position : undefined;
            if (destination !== undefined) {
              button.dataset.destinationColumn = String(destination.column);
              button.dataset.destinationRow = String(destination.row);
            }
            if (actorPosition !== undefined) {
              button.dataset.anchorColumn = String(actorPosition.column);
              button.dataset.anchorRow = String(actorPosition.row);
            }
            button.addEventListener('pointerenter', () => this.#setMovementPreview(key));
            button.addEventListener('pointerleave', () => this.#setMovementPreview(null));
            button.addEventListener('focus', () => this.#setMovementPreview(key));
            button.addEventListener('blur', () => this.#setMovementPreview(null));
          }
          button.addEventListener('click', () => this.#submitDm(action));
          pending.append(button);
        }
      }
    }
    this.#shell.append(pending);
    this.#shell.append(renderHumanEngineOptionCatalog(projection.humanEngineOptions));

    const objectControls = element('section', { className: 'dm-world-object-controls' });
    objectControls.dataset.renderKey = stableRenderKey('dm', 'world-object-controls');
    objectControls.append(element('h2', { text: 'World-object controls' }));
    if (projection.worldObjectControls.length === 0) {
      objectControls.append(element('p', { text: 'No available object overrides.' }));
    } else {
      for (const control of projection.worldObjectControls) {
        const button = element('button', { text: `${control.label} — ${control.objectName}` });
        button.type = 'button';
        button.dataset.renderKey = stableRenderKey(
          'dm', 'world-object-controls', control.objectId, control.offeredActionId,
        );
        button.dataset.objectId = control.objectId;
        button.addEventListener('click', () => {
          this.#submitTopDown(() => this.#session.submitTopDownWorldObject(control.offeredActionId));
        });
        objectControls.append(button);
      }
    }
    this.#shell.append(objectControls);

    const adjudication = element('form', { className: 'dm-adjudication' });
    adjudication.dataset.renderKey = stableRenderKey('dm', 'adjudication');
    const target = element('select');
    target.dataset.renderKey = stableRenderKey('dm', 'adjudication', 'target');
    target.setAttribute('aria-label', 'Adjudication target');
    for (const combatant of projection.encounter.combatants) {
      const option = element('option', { text: combatant.name });
      option.value = combatant.id;
      target.append(option);
    }
    const delta = element('input');
    delta.type = 'number';
    delta.dataset.renderKey = stableRenderKey('dm', 'adjudication', 'delta');
    delta.value = '-1';
    delta.setAttribute('aria-label', 'Hit Point delta');
    const reasoning = element('textarea');
    reasoning.dataset.renderKey = stableRenderKey('dm', 'adjudication', 'reasoning');
    reasoning.setAttribute('aria-label', 'DM reasoning');
    const apply = element('button', { text: 'Apply ADJUDICATED override' });
    apply.type = 'submit';
    apply.dataset.renderKey = stableRenderKey('dm', 'adjudication', 'apply');
    adjudication.append(
      element('h2', { text: 'Adjudication' }),
      target,
      delta,
      reasoning,
      apply,
    );
    adjudication.addEventListener('submit', (event) => {
      event.preventDefault();
      this.#submitTopDown(() => this.#session.applyTopDownAdjudication({
        target: target.value as CombatantId,
        hitPointDelta: Number(delta.value),
        reasoning: reasoning.value,
      }));
    });
    this.#shell.append(adjudication);

    const assignments = element('section', { className: 'dm-controller-assignments' });
    assignments.dataset.renderKey = stableRenderKey('dm', 'controller-assignments');
    assignments.append(element('h2', { text: 'Controller assignment' }));
    for (const identity of projection.controllers) {
      const row = element('label');
      row.dataset.renderKey = stableRenderKey(
        'dm',
        'controller-assignments',
        identity.combatantId,
      );
      const name = projection.encounter.combatants.find(
        (combatant) => combatant.id === identity.combatantId,
      )?.name ?? identity.combatantId;
      row.append(document.createTextNode(name));
      const select = element('select');
      select.dataset.renderKey = stableRenderKey(
        'dm',
        'controller-assignments',
        identity.combatantId,
        'kind',
      );
      select.setAttribute('aria-label', `${name} controller`);
      for (const kind of ['human', 'algorithm'] as const) {
        const option = element('option', { text: kind });
        option.value = kind;
        option.selected = identity.kind === kind;
        select.append(option);
      }
      select.value = identity.kind;
      select.addEventListener('change', () => {
        if (select.value === 'human' || select.value === 'algorithm') {
          try {
            this.#session.replaceController(identity.combatantId, select.value);
            this.#channelError = null;
          } catch (error: unknown) {
            if (!(error instanceof ControllerAssignmentError)) throw error;
            this.#channelError = error.message;
            this.#render();
          }
        }
      });
      row.append(select);
      assignments.append(row);
    }
    this.#shell.append(assignments);

    const hidden = element('ol', { className: 'dm-hidden-rolls' });
    for (const event of projection.encounter.recentEvents) {
      if (event.type !== 'death_save_resolved') continue;
      const item = element('li', {
        text: `Hidden death save: ${event.roll} (${event.outcome})`,
      });
      item.dataset.hiddenRoll = 'death-save';
      hidden.append(item);
    }
    this.#shell.append(hidden);

    const dice = element('ol', { className: 'encounter-dice-log' });
    for (const entry of projection.board.log) {
      let text: string;
      if (entry.kind === 'roll') {
        const branch = entry.branches.map((value) => `${value.target}: ${value.label}`).join('; ');
        text = `${entry.rollKind}: ${entry.faces.join('/')} → ${String(entry.total)} (${entry.outcome})${branch.length === 0 ? '' : ` — branch ${branch}`}`;
      } else if (entry.kind === 'sustained_activation') {
        text = `Sustained activation: ${entry.spellId} (${entry.effectId})`;
      } else {
        text = `Composition refused: ${entry.reason}; ${entry.propagation}`;
      }
      const item = element('li', { text });
      item.dataset.outcomeKind = entry.kind;
      item.dataset.sequence = String(entry.sequence);
      dice.append(item);
    }
    this.#shell.append(dice);

    const details = element('details');
    details.dataset.renderKey = stableRenderKey('dm', 'revision-history');
    const summary = element('summary', { text: 'Full revision history' });
    summary.dataset.renderKey = stableRenderKey('dm', 'revision-history', 'summary');
    details.append(summary);
    const history = element('ol');
    for (const entry of projection.history) {
      const item = element('li', {
        text: `Revision ${entry.revision}: ${entry.transition.kind}${entry.void ? ' (void)' : ''}`,
      });
      item.dataset.revision = String(entry.revision);
      item.dataset.void = String(entry.void);
      history.append(item);
    }
    details.append(history);
    this.#shell.append(details);

    const log = element('ol', { className: 'encounter-log dm-log' });
    for (const event of projection.encounter.recentEvents.slice(-16)) {
      const item = element('li', {
        text: event.type === 'adjudicated'
          ? `ADJUDICATED — ${event.reasoning}`
          : event.type.replaceAll('_', ' '),
      });
      item.dataset.eventType = event.type;
      if (event.type === 'spell_cast') {
        item.dataset.spellId = event.spellId;
        item.dataset.targets = event.targets.join(',');
      }
      if (event.type === 'adjudicated') {
        item.dataset.adjudicationSubject = event.subject;
        item.dataset.target = event.target;
      }
      log.append(item);
    }
    this.#shell.append(log);
  }

  close(): void {
    if (this.#closed) return;
    this.#detach();
    void this.#lifecycle.dispatch({ kind: 'flush' }).finally(() => this.#store.close());
  }

  #detach(): void {
    if (this.#closed) return;
    this.#closed = true;
    window.clearInterval(this.#heartbeat);
    window.removeEventListener('beforeunload', this.#onBeforeUnload);
    this.#unsubscribe();
    this.#channel.removeEventListener('message', this.#onMessage);
    this.#session.close();
    this.#channel.close();
  }
}

export interface EncounterVttMount {
  close(): void;
}

export function mountEncounterVtt(
  root: HTMLElement,
  options: {
    readonly view: 'player' | 'dm';
    readonly sessionId: string;
    readonly encounter?: StoredCharacterEncounter;
    readonly initialSeed?: EncounterSeed;
    readonly boardSnapshotMode?: boolean;
    readonly boardSnapshotInformation?: BoardSnapshotInformationMode;
    readonly boardSnapshotRole?: BoardSnapshotRole;
    /** D525: the snapshot page's `boardGlyphs` URL parameter; absent, the art package decides. */
    readonly boardGlyphs?: BoardGlyphMode;
    /** D561: snapshot-only chrome lattice pitch; absent keeps the 128-px app default. */
    readonly captureTilePx?: BoardChromeTilePx;
  },
): EncounterVttMount {
  if (options.view === 'player') {
    const mounted = new PlayerEncounterView(root, options.sessionId);
    mounted.mount();
    return { close: () => mounted.close() };
  }
  let mounted: DmEncounterView | null = null;
  let closed = false;
  root.replaceChildren(element('p', { className: 'dm-save-loading', text: 'Opening browser saves…' }));
  const openDmSession = async (
    sessionId: string,
    encounter?: StoredCharacterEncounter,
    initialSeed?: EncounterSeed,
  ): Promise<void> => {
    mounted?.close();
    mounted = null;
    const view = await DmEncounterView.create(
      root,
      sessionId,
      encounter,
      initialSeed,
      options.boardSnapshotMode,
      options.boardSnapshotMode === true
        ? async (nextSessionId) => {
            const url = new URL(location.href);
            url.searchParams.set('session', nextSessionId);
            history.replaceState(history.state, '', url);
            await openDmSession(nextSessionId);
          }
        : undefined,
      options.boardGlyphs,
      options.captureTilePx,
      options.boardSnapshotInformation,
      options.boardSnapshotRole,
    );
    if (closed) {
      view.close();
      return;
    }
    mounted = view;
    view.mount();
  };
  void openDmSession(options.sessionId, options.encounter, options.initialSeed).catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Browser session storage failed.';
    const alert = element('p', { className: 'dm-save-error', text: message });
    alert.setAttribute('role', 'alert');
    root.replaceChildren(alert);
  });
  return {
    close: () => {
      closed = true;
      mounted?.close();
    },
  };
}
