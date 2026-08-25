import { canonicalJson } from '../commands/canonical-json';
import type { AssetId } from '../assets/ids';
import { starterArtDataUri } from '../assets/starter-art-resolver';
import './styles.css';
import { HumanController, type ControllerRequest } from '../combat/controllers';
import type { EncounterCommand } from '../combat/events';
import { MOVEMENT_PATH_DANGER_KINDS, REACTION_KINDS, type PendingDecision } from '../combat/encounter';
import { HIDDEN_ROLL_CATEGORIES, type HiddenRollCategory } from '../combat/roll-visibility';
import { previewAffectedCells } from '../combat/templates';
import { encounterSessionId, type CombatantId } from '../combat/values';
import { DmEncounterHost } from './dm-encounter-host';
import {
  encounterBoardRenderModel,
  type EncounterBoardProjectionShape,
} from './encounter-board';
import type {
  DmBoardProjection,
  DmMovementPathPreview,
  PlayerBoardProjection,
  ProjectedControllerRequest,
} from './encounter-projections';
import {
  decodePlayerDecision,
  isHostWindowMessage,
  playerDecisionMessage,
} from './local-window-channel';
import { LocalStorageBrowserSessionStore } from './local-session-store';
import {
  IndexedDbDirectoryHandlePersistence,
  SaveFolderRepository,
} from './save-folder';
import {
  SaveManagerController,
  buildSaveManagerViewModel,
  type SaveManagerEntry,
  type SaveManagerViewModel,
} from './save-manager';
import { REFERENCE_ENCOUNTER_ART } from './reference-encounter-art';
import { decodeSavedSessionFingerprint } from './session-persistence';
import type { StoredCharacterEncounter } from './stored-character-encounter';
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

const HEARTBEAT_INTERVAL_MS = 250;
const HEARTBEAT_TIMEOUT_MS = 1_000;

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { readonly className?: string; readonly text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
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
    case 'apply_effect':
      return 'Apply effect';
    case 'grant_temporary_hit_points':
      return 'Grant temporary Hit Points';
    case 'end_concentration':
      return 'End concentration';
    case 'adjudicate':
      return 'ADJUDICATED';
  }
}

function actionKey(action: EncounterCommand): string {
  return canonicalJson(action);
}

function renderBoard(
  projection: EncounterBoardProjectionShape,
  preview: ReadonlySet<string> = new Set(),
  movementDangerPreview: DmMovementPathPreview | null = null,
): HTMLDivElement {
  const pcFallback = REFERENCE_ENCOUNTER_ART.combatantTokens['combatant:fighter'];
  const monsterFallback = REFERENCE_ENCOUNTER_ART.combatantTokens['combatant:training-brute'];
  if (pcFallback === undefined || monsterFallback === undefined) {
    throw new Error('Reference encounter token art is incomplete.');
  }
  const combatantTokens: Record<string, AssetId> = {};
  for (const combatant of projection.combatants) {
    combatantTokens[combatant.id] =
      REFERENCE_ENCOUNTER_ART.combatantTokens[combatant.id] ??
      (combatant.kind === 'player_character' ? pcFallback : monsterFallback);
  }
  const hasReferenceArt = projection.combatants.every(
    (combatant) => REFERENCE_ENCOUNTER_ART.combatantTokens[combatant.id] !== undefined,
  );
  const art = hasReferenceArt
    ? REFERENCE_ENCOUNTER_ART
    : { ...REFERENCE_ENCOUNTER_ART, combatantTokens };
  const models = hasReferenceArt
    ? encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART)
    : encounterBoardRenderModel(projection, art);
  const board = element('div', { className: 'encounter-board' });
  board.style.setProperty('--encounter-columns', String(projection.bounds.columns));
  board.dataset.artPackage = art.id;
  const dangersByCell = new Map<string, DmMovementPathPreview['annotations'][number]['dangers']>(movementDangerPreview?.annotations.map(
    (annotation) => [`${String(annotation.cell.column)},${String(annotation.cell.row)}`, annotation.dangers] as const,
  ) ?? []);
  for (const model of models) {
    const cell = element('div', { className: 'encounter-cell' });
    cell.dataset.cell = model.key;
    if (preview.has(model.key)) cell.dataset.preview = 'true';
    for (const layer of model.layers) {
      const image = element('img', { className: `encounter-art-layer encounter-art-${layer.role}` });
      image.alt = '';
      image.setAttribute('aria-hidden', 'true');
      image.src = starterArtDataUri(layer.assetId);
      image.dataset.assetId = layer.assetId;
      cell.append(image);
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
    for (const object of model.worldObjects) {
      const placed = element('div', { className: 'encounter-world-object' });
      placed.dataset.objectId = object.id;
      placed.dataset.kind = object.kind;
      placed.dataset.blocksMovement = String(object.blocking.movement);
      placed.dataset.blocksLineOfSight = String(object.blocking.lineOfSight);
      placed.dataset.cover = object.blocking.cover;
      placed.dataset.lightClass = object.lightClass;
      if (
        model.column === object.position.column &&
        model.row === object.position.row
      ) {
        placed.append(element('span', {
          className: 'encounter-world-object-label',
          text: `${object.name} — movement ${object.blocking.movement ? 'blocked' : 'open'}; sight ${object.blocking.lineOfSight ? 'blocked' : 'open'}; cover ${object.blocking.cover}`,
        }));
      }
      cell.append(placed);
    }
    if (model.token !== null) {
      const token = element('div', { className: 'encounter-token' });
      token.dataset.combatantId = model.token.id;
      token.dataset.active = String(model.token.focusAssetId !== null);
      token.dataset.adjudicated = String(model.token.adjudicatedAssetId !== null);
      token.dataset.kind = model.token.kind;
      token.dataset.assetId = model.token.assetId;
      token.dataset.life = model.token.life;
      token.dataset.marker = model.token.marker;
      const sprite = element('img', { className: 'encounter-token-sprite' });
      sprite.alt = '';
      sprite.setAttribute('aria-hidden', 'true');
      sprite.src = starterArtDataUri(model.token.assetId);
      token.append(sprite);
      for (const [role, assetId] of [
        ['focus', model.token.focusAssetId],
        ['adjudicated', model.token.adjudicatedAssetId],
      ] as const) {
        if (assetId === null) continue;
        const overlay = element('img', { className: `encounter-token-overlay encounter-token-${role}` });
        overlay.alt = '';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.src = starterArtDataUri(assetId);
        overlay.dataset.assetId = assetId;
        token.append(overlay);
      }
      token.append(element('span', { className: 'encounter-token-label', text: model.token.name }));
      for (const effect of projection.sustainedEffects ?? []) {
        if (effect.owner !== model.token.id) continue;
        const badge = element('span', { className: 'encounter-sustained-badge', text: effect.badge });
        badge.dataset.effectId = effect.effectId;
        badge.dataset.binding = effect.targetBinding;
        badge.dataset.activationAvailable = String(effect.activationAvailable);
        token.append(badge);
      }
      cell.append(token);
    }
    for (const extra of model.tokens.slice(1)) {
      const marker = element('div', { className: 'encounter-token encounter-token-stacked' });
      marker.dataset.combatantId = extra.id;
      marker.dataset.life = extra.life;
      marker.dataset.marker = extra.marker;
      marker.append(element('span', {
        className: 'encounter-token-label',
        text: extra.marker === 'corpse' ? `† ${extra.name}` : extra.name,
      }));
      cell.append(marker);
    }
    board.append(cell);
  }
  const lines = projection.targetLines ?? [];
  if (lines.length > 0) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.classList.add('encounter-target-lines');
    svg.setAttribute('viewBox', `0 0 ${String(projection.bounds.columns)} ${String(projection.bounds.rows)}`);
    svg.setAttribute('aria-label', 'Bound sustained-effect targets');
    for (const connection of lines) {
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', String(connection.from.column + 0.5));
      line.setAttribute('y1', String(connection.from.row + 0.5));
      line.setAttribute('x2', String(connection.to.column + 0.5));
      line.setAttribute('y2', String(connection.to.row + 0.5));
      line.dataset.effectId = connection.effectId;
      line.dataset.targetId = connection.target;
      svg.append(line);
    }
    board.append(svg);
  }
  return board;
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
  readonly #shell = element('main', { className: 'encounter-shell player-encounter' });
  #projection: PlayerBoardProjection | null = null;
  #staged: EncounterCommand | null = null;
  #aimingSpell = false;
  #lastHeartbeat = 0;
  readonly #heartbeatCheck: number;

  constructor(
    private readonly root: HTMLElement,
    private readonly sessionId: string,
  ) {
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
    const message = playerDecisionMessage(this.sessionId, request, action);
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
    return new Set(
      previewAffectedCells(
        { bounds: projection.bounds, blockedCells: projection.blockedCells },
        staged.area,
      ).map((cell) => `${cell.column},${cell.row}`),
    );
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
    this.#shell.replaceChildren();
    const header = element('header');
    header.append(
      element('p', { className: 'vtt-kicker', text: 'Player-primary board' }),
      element('h1', { text: 'Reference encounter' }),
    );
    const openDm = element('button', { text: 'Open local DM window' });
    openDm.type = 'button';
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
    const board = renderBoard(projection, this.#preview());
    board.addEventListener('pointermove', (event) => this.#aimAt(event));
    this.#shell.append(board);

    const controls = element('section', { className: 'encounter-controls' });
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
  readonly #store = new LocalStorageBrowserSessionStore(localStorage);
  readonly #folder = new SaveFolderRepository(
    new IndexedDbDirectoryHandlePersistence(indexedDB),
    window,
  );
  readonly #host: DmEncounterHost;
  readonly #channel: BroadcastChannel;
  readonly #shell = element('main', { className: 'encounter-shell dm-encounter' });
  #projection: DmBoardProjection | null = null;
  #channelError: string | null = null;
  #saveManagerError: string | null = null;
  #folderSaves: readonly SaveManagerEntry[] = [];
  #pendingDelete: SaveManagerViewModel['pendingDelete'] = null;
  #saveManagerController: SaveManagerController | null = null;
  #movementPreviewKey: string | null = null;
  readonly #heartbeat: number;
  readonly #unsubscribe: () => void;
  readonly #onBeforeUnload = (): void => this.#host.close();

  constructor(
    private readonly root: HTMLElement,
    private readonly sessionId: string,
    encounter?: StoredCharacterEncounter,
  ) {
    this.#host = new DmEncounterHost(sessionId, this.#store, encounter === undefined
      ? {}
      : {
          initialState: encounter.state,
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
    this.#channel = new BroadcastChannel(`srd55:vtt:${sessionId}`);
    this.#channel.addEventListener('message', this.#onMessage);
    this.#unsubscribe = this.#host.subscribe((snapshot) => {
      this.#projection = snapshot.dm;
      if (!snapshot.dm.movementPreviews.some(
        (preview) => preview.commandKey === this.#movementPreviewKey,
      )) this.#movementPreviewKey = null;
      this.#sendPlayerProjection(snapshot.player);
      this.#render();
    });
    this.#heartbeat = window.setInterval(() => {
      const snapshot = this.#host.snapshot();
      const dmChanged =
        this.#projection === null ||
        canonicalJson(this.#projection) !== canonicalJson(snapshot.dm);
      if (dmChanged) {
        this.#projection = snapshot.dm;
        this.#render();
      }
      this.#sendPlayerProjection(snapshot.player);
    }, HEARTBEAT_INTERVAL_MS);
    window.addEventListener('beforeunload', this.#onBeforeUnload);
    void this.#restoreSaveFolder();
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
    const pending = this.#projection?.pendingRequest;
    if (pending === null || pending === undefined) return;
    try {
      const decision = decodePlayerDecision(value, this.sessionId, pending);
      this.#host.submitHumanDecision(pending.actorId, decision);
      this.#channelError = null;
    } catch (error: unknown) {
      if (error instanceof TypeError) {
        this.#channelError = error.message;
        this.#render();
        return;
      }
      throw error;
    }
  }

  mount(): void {
    this.root.replaceChildren(this.#shell);
    this.#render();
    this.#host.start();
  }

  #submitDm(action: EncounterCommand): void {
    const pending = this.#projection?.pendingRequest;
    if (pending === null || pending === undefined) return;
    const controller = this.#projection?.controllers.find(
      (identity) => identity.combatantId === pending.actorId,
    );
    if (controller?.kind !== 'human') return;
    this.#movementPreviewKey = null;
    this.#host.submitHumanDecision(pending.actorId, {
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      action,
    });
  }

  #setMovementPreview(commandKey: string | null): void {
    if (this.#movementPreviewKey === commandKey) return;
    this.#movementPreviewKey = commandKey;
    this.#render();
  }

  #browserSaves(): readonly SaveManagerEntry[] {
    return this.#store.savedSessions().map((save) => ({
      ...save,
      id: `browser:${save.storageId}`,
      source: 'browser',
    }));
  }

  #controller(entries: readonly SaveManagerEntry[]): SaveManagerController {
    return new SaveManagerController(
      new Map(entries.map((entry) => [entry.id, entry])),
      {
        load: (save) => this.#loadSave(save),
        rename: async (save, name) => {
          if (save.source === 'browser') {
            this.#store.renameStored(save.storageId ?? `session:${save.sessionId}`, save.sessionId, name);
          } else {
            await this.#folder.rename(save, name);
            await this.#refreshFolderSaves();
          }
          this.#render();
        },
        delete: async (save) => {
          if (save.source === 'browser') {
            const deletingActiveSession = save.sessionId === encounterSessionId(this.sessionId);
            const storageId = save.storageId ?? `session:${save.sessionId}`;
            const deletingLiveSession = deletingActiveSession && storageId.startsWith('session:');
            if (deletingLiveSession) this.close();
            this.#store.removeStored(storageId, save.sessionId);
            if (deletingLiveSession) {
              const url = new URL(location.href);
              url.searchParams.set('encounter', 'reference');
              url.searchParams.set('view', 'dm');
              url.searchParams.set('session', `${this.sessionId}-new`);
              location.assign(url);
              return;
            }
          } else {
            await this.#folder.delete(save);
            await this.#refreshFolderSaves();
          }
          this.#render();
        },
        exportCopy: (save) => this.#download(save.name, save.bytes),
        saveNow: async () => {
          const sessionId = encounterSessionId(this.sessionId);
          const bytes = this.#store.exported(sessionId);
          const browser = this.#store.savedSessions().find(
            (save) => save.sessionId === sessionId,
          );
          const name = browser?.name ?? sessionId;
          if (this.#folder.mode().kind === 'folder') {
            await this.#folder.write(name, bytes);
            await this.#refreshFolderSaves();
          } else {
            this.#download(name, bytes);
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
      this.#store.restoreStored(save.storageId ?? `session:${save.sessionId}`, save.sessionId);
    }
    if (save.source === 'folder') {
      const existing = this.#store.revisions(save.sessionId);
      if (existing.length === 0) {
        this.#store.import(save.bytes);
      } else {
        const browserFingerprint = decodeSavedSessionFingerprint(
          this.#store.exported(save.sessionId),
        ).fingerprint;
        if (browserFingerprint !== save.fingerprint) {
          throw new Error(
            'This folder save has the same session ID as a different browser autosave. Rename or export the autosave before deleting it; it will not be overwritten.',
          );
        }
      }
    }
    const url = new URL(location.href);
    url.searchParams.set('encounter', 'reference');
    url.searchParams.set('view', 'dm');
    url.searchParams.set('session', save.sessionId);
    location.assign(url);
  }

  #download(name: string, bytes: string): void {
    const anchor = element('a');
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/json' }));
    anchor.href = url;
    anchor.download = `${name}.vtt.json`;
    anchor.click();
    URL.revokeObjectURL(url);
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
        const decoded = decodeSavedSessionFingerprint(bytes);
        if (this.#store.revisions(decoded.sessionId).length !== 0) {
          throw new Error('That uploaded session already exists in browser autosaves.');
        }
        this.#store.import(bytes);
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
    const saveNow = element('button', {
      text: model.primarySaveIntent === 'save_now_to_folder' ? 'Save now' : 'Download save now',
    });
    saveNow.type = 'button';
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
    for (const row of model.rows) {
      const item = element('article', { className: 'dm-save-row' });
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
      for (const action of row.actions) {
        const button = element('button', {
          text: action === 'export_copy' ? 'Export copy' : `${action[0]!.toUpperCase()}${action.slice(1)}`,
        });
        button.type = 'button';
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
        confirmation.append(element('p', {
          text: `Type ${model.pendingDelete.requiredText} to delete this save.`,
        }));
        const typedName = element('input');
        typedName.setAttribute('aria-label', `Type ${row.name} to confirm deletion`);
        const confirm = element('button', { text: 'Confirm delete' });
        confirm.type = 'submit';
        const cancel = element('button', { text: 'Cancel delete' });
        cancel.type = 'button';
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
    this.#shell.replaceChildren(
      element('p', { className: 'vtt-kicker', text: 'DM-local authority' }),
      element('h1', { text: 'DM controls' }),
    );
    const projection = this.#projection;
    if (projection === null) return;
    if (this.#channelError !== null) {
      const error = element('p', { text: this.#channelError });
      error.setAttribute('role', 'alert');
      error.dataset.channelError = 'true';
      this.#shell.append(error);
    }
    const status = element('p', {
      text: projection.coordinator.pause === null
        ? 'Encounter running'
        : `Paused: ${projection.coordinator.pause.kind}`,
    });
    status.dataset.pause = projection.coordinator.pause?.kind ?? 'none';
    this.#shell.append(status);
    this.#shell.append(this.#renderSaveManager());
    if (projection.partySession !== null) {
      const dayEnded = projection.partySession.state.adventuringDayStatus === 'ended_by_long_rest';
      const adventuringDay = element('p', {
        text: dayEnded
          ? `Adventuring day ended by Long Rest · room ${String(projection.partySession.state.room)} · 2024 rules`
          : `Adventuring day — room ${String(projection.partySession.state.room)} of 4 · 2024 rules`,
      });
      adventuringDay.className = 'adventuring-day-status';
      adventuringDay.dataset.room = String(projection.partySession.state.room);
      adventuringDay.dataset.status = projection.partySession.state.adventuringDayStatus;
      this.#shell.append(adventuringDay);
    }

    const controls = element('div', { className: 'encounter-controls dm-controls' });
    const interrupt = element('button', { text: 'Interrupt' });
    interrupt.type = 'button';
    interrupt.addEventListener('click', () => this.#host.interrupt());
    const resume = element('button', { text: 'Resume' });
    resume.type = 'button';
    resume.addEventListener('click', () => this.#host.resume());
    const undo = element('button', { text: 'Undo last' });
    undo.type = 'button';
    undo.addEventListener('click', () => void this.#host.undoLast());
    const skip = element('button', { text: 'Skip turn' });
    skip.type = 'button';
    skip.disabled = projection.timeline.currentCombatant === null;
    skip.addEventListener('click', () => {
      void this.#host.skipTurn().catch((error: unknown) => {
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
    if (later.length > 0) {
      const delay = element('form', { className: 'dm-delay-turn' });
      const target = element('select');
      target.setAttribute('aria-label', 'Delay current turn until after');
      for (const entry of later) {
        const option = element('option', { text: `After ${entry.name}` });
        option.value = entry.combatant;
        target.append(option);
      }
      const submit = element('button', { text: 'Delay turn' });
      submit.type = 'submit';
      delay.append(target, submit);
      delay.addEventListener('submit', (event) => {
        event.preventDefault();
        const selected = later.find((entry) => entry.combatant === target.value);
        if (selected === undefined) return;
        void this.#host.delayTurn(selected.combatant).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Delay turn failed.';
          this.#render();
        });
      });
      controls.append(delay);
    }
    if (projection.partySession !== null && projection.partySession.state.adventuringDayStatus === 'active') {
      const longRest = element('button', { text: 'Complete Long Rest and end adventuring day' });
      longRest.type = 'button';
      longRest.addEventListener('click', () => {
        void this.#host.finishAdventuringDay().catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Long Rest failed.';
          this.#render();
        });
      });
      controls.append(longRest);

      const interruption = element('form', { className: 'dm-rest-interruption' });
      const outcomeLabel = element('label', { text: 'Interruption outcome' });
      const outcomeSelect = element('select');
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
        const input = element('input');
        input.type = 'checkbox';
        input.value = benefit;
        input.setAttribute('aria-label', `Apply ${benefit.replaceAll('_', ' ')}`);
        label.prepend(input);
        interruption.append(label);
        return { benefit, input };
      });
      const interrupted = element('button', { text: REST_INTERRUPTION_DM_CONTROL.label });
      interrupted.type = 'submit';
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
        void this.#host.resolveRestInterruption(outcome).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Rest interruption failed.';
          this.#render();
        });
      });
      controls.append(interruption);
    }
    if (projection.partySession !== null &&
      projection.partySession.state.adventuringDayStatus === 'active' &&
      projection.partySession.state.room < 4) {
      const nextRoom = element('button', { text: 'End room and enter next room' });
      nextRoom.type = 'button';
      nextRoom.addEventListener('click', () => {
        void this.#host.finishRoom(null).catch((error: unknown) => {
          this.#channelError = error instanceof Error ? error.message : 'Room transition failed.';
          this.#render();
        });
      });
      controls.append(nextRoom);
    }
    this.#shell.append(controls);

    const timeline = element('section', { className: 'dm-initiative-timeline' });
    timeline.dataset.round = String(projection.timeline.round);
    timeline.append(element('h2', { text: `Initiative timeline — round ${String(projection.timeline.round)}` }));
    const strip = element('ol', { className: 'dm-initiative-strip' });
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
    rewind.append(element('h3', { text: 'Rewind to round boundary' }));
    for (const boundary of projection.timeline.roundBoundaries) {
      if (boundary.current) continue;
      const button = element('button', { text: `Rewind to round ${String(boundary.round)}` });
      button.type = 'button';
      button.dataset.revision = String(boundary.revision);
      button.addEventListener('click', () => {
        void this.#host.rewindToRound(boundary.round).catch((error: unknown) => {
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
      projection.partySession.state.room < 4) {
      const rest = element('form', { className: 'dm-short-rest' });
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
          label.append(document.createTextNode(
            `${name}: spend d${String(pool.sides)} Hit Point Dice (${String(pool.remaining)} remaining)`,
          ));
          const input = element('input');
          input.type = 'number';
          input.min = '0';
          input.max = String(pool.remaining);
          input.value = '0';
          input.disabled = character.currentHitPoints < 1 || character.life !== 'living';
          input.setAttribute('aria-label', `${name} d${String(pool.sides)} Hit Point Dice to spend`);
          label.append(input);
          rest.append(label);
          requested.push({ combatantId: character.combatantId, sides: pool.sides, input });
        }
      }
      const finishRest = element('button', { text: 'Take Short Rest and enter next room' });
      finishRest.type = 'submit';
      rest.append(finishRest);
      rest.addEventListener('submit', (event) => {
        event.preventDefault();
        const byCombatant = new Map<CombatantId, Array<{ readonly sides: 6 | 8 | 10 | 12; readonly count: number }>>();
        for (const request of requested) {
          const dice = byCombatant.get(request.combatantId) ?? [];
          dice.push({ sides: request.sides, count: Number(request.input.value) });
          byCombatant.set(request.combatantId, dice);
        }
        void this.#host.finishRoom([...byCombatant].map(([combatantId, dice]) => ({
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

    const boardFog = new Set(projection.board.foggedCells.map(
      (cell) => `${String(cell.column)},${String(cell.row)}`,
    ));
    if (projection.encounter.dmOnly.foggedCells.some(
      (cell) => !boardFog.has(`${String(cell.column)},${String(cell.row)}`),
    )) {
      throw new Error('DM board omitted encounter fog.');
    }
    const movementPreview = projection.movementPreviews.find(
      (preview) => preview.commandKey === this.#movementPreviewKey,
    ) ?? null;
    const previewCells = new Set(movementPreview?.path.map(
      (cell) => `${String(cell.column)},${String(cell.row)}`,
    ) ?? []);
    this.#shell.append(renderBoard(projection.board, previewCells, movementPreview));
    if (movementPreview !== null) this.#shell.append(renderMovementDangerLegend(movementPreview));

    const tray = element('section', { className: 'dm-decision-tray' });
    tray.append(element('h2', { text: 'Decision tray' }));
    tray.dataset.boundaryBlocked = String(projection.decisionTray.boundaryRefusal !== null);
    if (projection.decisionTray.boundaryRefusal !== null) {
      const refusal = element('p', {
        className: 'dm-decision-refusal',
        text: projection.decisionTray.boundaryRefusal.message,
      });
      refusal.setAttribute('role', 'alert');
      refusal.dataset.refusalCode = projection.decisionTray.boundaryRefusal.code;
      tray.append(refusal);
    }
    if (projection.decisionTray.actionRefusal !== null) {
      const refusal = element('p', {
        className: 'dm-decision-refusal',
        text: `${projection.decisionTray.actionRefusal.reason} (${projection.decisionTray.actionRefusal.citation})`,
      });
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
      if (entry.kind === 'pending') {
        row.dataset.decisionId = entry.decision.id;
        row.append(
          element('h3', {
            text: `${entry.combatantName} — ${decisionHeading(entry.decision)}`,
          }),
          element('p', { text: entry.triggerContext }),
        );
        if (entry.decision.kind === 'adjudication_prompt') {
          const amount = element('input');
          amount.type = 'number';
          amount.value = '0';
          amount.setAttribute('aria-label', 'DM override hit point delta');
          const button = element('button', { text: `Apply DM override for ${entry.combatantName}` });
          button.type = 'button';
          button.addEventListener('click', () => {
            const parsed = Number(amount.value);
            if (!Number.isSafeInteger(parsed)) return;
            this.#host.resolveRefusalPrompt(
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
          button.addEventListener('click', () => {
            button.disabled = true;
            void this.#host.resolvePendingDecision(entry.decision.id, option.id).catch((error: unknown) => {
              this.#channelError = error instanceof Error ? error.message : 'Decision resolution failed.';
              this.#render();
            });
          });
          row.append(button);
        }
      } else {
        row.dataset.policy = entry.policy;
        row.dataset.sequence = String(entry.sequence);
        row.append(element('p', {
          text: `${entry.combatantName} — ${entry.reactionKind.replaceAll('_', ' ')}: ${entry.policy} automatically ${entry.resolution === 'accept' ? 'accepted' : 'declined'}${entry.autoFired ? ' and fired' : ''}`,
        }));
      }
      tray.append(row);
    }
    this.#shell.append(tray);

    if (projection.partySession !== null) {
      const refusalSettings = element('section', { className: 'dm-refusal-settings' });
      refusalSettings.append(element('h2', { text: 'Refusal handling' }));
      for (const category of REFUSAL_CATEGORIES) {
        const label = element('label');
        label.append(document.createTextNode(category.replaceAll('_', ' ')));
        const select = element('select');
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
          void this.#host.setRefusalHandling(category, mode as RefusalHandlingMode).catch((error: unknown) => {
            this.#channelError = error instanceof Error ? error.message : 'Refusal setting update failed.';
            this.#render();
          });
        });
        label.append(select);
        refusalSettings.append(label);
      }
      this.#shell.append(refusalSettings);

      const preferences = element('section', { className: 'dm-reaction-preferences' });
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
          label.append(document.createTextNode(`${name} — ${reactionKind.replaceAll('_', ' ')}`));
          const select = element('select');
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
            void this.#host.setReactionPreference(character.combatantId, reactionKind, select.value)
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
    hiddenRollSettings.append(element('h2', { text: 'Hidden rolls' }));
    for (const category of HIDDEN_ROLL_CATEGORIES) {
      const label = element('label');
      const checkbox = element('input');
      checkbox.type = 'checkbox';
      checkbox.checked = projection.encounter.hiddenRolls.includes(category);
      checkbox.setAttribute('aria-label', `Hide ${HIDDEN_ROLL_LABELS[category].toLowerCase()}`);
      checkbox.addEventListener('change', () => {
        checkbox.disabled = true;
        void this.#host.setHiddenRollCategory(category, checkbox.checked).catch((error: unknown) => {
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
        for (const action of projection.humanCommandActions) {
          const button = element('button', { text: actionLabel(action) });
          button.type = 'button';
          if (action.type === 'move') {
            const key = actionKey(action);
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

    const adjudication = element('form', { className: 'dm-adjudication' });
    const target = element('select');
    target.setAttribute('aria-label', 'Adjudication target');
    for (const combatant of projection.encounter.combatants) {
      const option = element('option', { text: combatant.name });
      option.value = combatant.id;
      target.append(option);
    }
    const delta = element('input');
    delta.type = 'number';
    delta.value = '-1';
    delta.setAttribute('aria-label', 'Hit Point delta');
    const reasoning = element('textarea');
    reasoning.setAttribute('aria-label', 'DM reasoning');
    const apply = element('button', { text: 'Apply ADJUDICATED override' });
    apply.type = 'submit';
    adjudication.append(
      element('h2', { text: 'Adjudication' }),
      target,
      delta,
      reasoning,
      apply,
    );
    adjudication.addEventListener('submit', (event) => {
      event.preventDefault();
      this.#host.adjudicate({
        type: 'adjudicate',
        target: target.value as CombatantId,
        subject: 'engine:manual-adjudication',
        reasoning: reasoning.value,
        consequence: { kind: 'hit_point_delta', amount: Number(delta.value) },
      });
    });
    this.#shell.append(adjudication);

    const assignments = element('section', { className: 'dm-controller-assignments' });
    assignments.append(element('h2', { text: 'Controller assignment' }));
    for (const identity of projection.controllers) {
      const row = element('label');
      const name = projection.encounter.combatants.find(
        (combatant) => combatant.id === identity.combatantId,
      )?.name ?? identity.combatantId;
      row.append(document.createTextNode(name));
      const select = element('select');
      select.setAttribute('aria-label', `${name} controller`);
      for (const kind of ['human', 'algorithm'] as const) {
        const option = element('option', { text: kind });
        option.value = kind;
        option.selected = identity.kind === kind;
        select.append(option);
      }
      select.disabled = projection.pendingRequest !== null;
      select.addEventListener('change', () => {
        if (select.value === 'human' || select.value === 'algorithm') {
          this.#host.replaceController(identity.combatantId, select.value);
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
    details.append(element('summary', { text: 'Full revision history' }));
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
      log.append(item);
    }
    this.#shell.append(log);
  }

  close(): void {
    window.clearInterval(this.#heartbeat);
    window.removeEventListener('beforeunload', this.#onBeforeUnload);
    this.#unsubscribe();
    this.#channel.removeEventListener('message', this.#onMessage);
    this.#host.close();
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
  },
): EncounterVttMount {
  const mounted = options.view === 'dm'
    ? new DmEncounterView(root, options.sessionId, options.encounter)
    : new PlayerEncounterView(root, options.sessionId);
  mounted.mount();
  return { close: () => mounted.close() };
}
