import { canonicalJson } from '../commands/canonical-json';
import { starterArtDataUri } from '../assets/starter-art-resolver';
import './styles.css';
import { HumanController, type ControllerRequest } from '../combat/controllers';
import type { EncounterCommand } from '../combat/events';
import { previewAffectedCells } from '../combat/templates';
import type { CombatantId } from '../combat/values';
import { DmEncounterHost } from './dm-encounter-host';
import {
  encounterBoardRenderModel,
  type EncounterBoardProjectionShape,
} from './encounter-board';
import type {
  DmBoardProjection,
  PlayerBoardProjection,
  ProjectedControllerRequest,
} from './encounter-projections';
import {
  decodePlayerDecision,
  isHostWindowMessage,
  playerDecisionMessage,
} from './local-window-channel';
import { LocalStorageBrowserSessionStore } from './local-session-store';
import { REFERENCE_ENCOUNTER_ART } from './reference-encounter-art';

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

function actionLabel(action: EncounterCommand): string {
  switch (action.type) {
    case 'move': {
      const destination = action.path.at(-1);
      return destination === undefined
        ? 'Move'
        : `Move to ${destination.column},${destination.row}`;
    }
    case 'create_persistent_area':
      return 'Create persistent area';
    case 'move_persistent_area':
      return 'Move persistent area';
    case 'world_operation':
      return 'Change world';
    case 'activate_damage_operation':
      return 'Use damage feature';
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
): HTMLDivElement {
  const board = element('div', { className: 'encounter-board' });
  board.style.setProperty('--encounter-columns', String(projection.bounds.columns));
  board.dataset.artPackage = REFERENCE_ENCOUNTER_ART.id;
  for (const model of encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART)) {
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
    if (model.token !== null) {
      const token = element('div', { className: 'encounter-token' });
      token.dataset.combatantId = model.token.id;
      token.dataset.active = String(model.token.focusAssetId !== null);
      token.dataset.adjudicated = String(model.token.adjudicatedAssetId !== null);
      token.dataset.kind = model.token.kind;
      token.dataset.assetId = model.token.assetId;
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
      cell.append(token);
    }
    board.append(cell);
  }
  return board;
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
      const item = element('li', {
        text: event.type === 'adjudicated'
          ? `ADJUDICATED — visible consequence: ${event.consequence.kind}`
          : event.type.replaceAll('_', ' '),
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
  readonly #host: DmEncounterHost;
  readonly #channel: BroadcastChannel;
  readonly #shell = element('main', { className: 'encounter-shell dm-encounter' });
  #projection: DmBoardProjection | null = null;
  #channelError: string | null = null;
  readonly #heartbeat: number;
  readonly #unsubscribe: () => void;
  readonly #onBeforeUnload = (): void => this.#host.close();

  constructor(
    private readonly root: HTMLElement,
    private readonly sessionId: string,
  ) {
    this.#host = new DmEncounterHost(sessionId, this.#store);
    this.#channel = new BroadcastChannel(`srd55:vtt:${sessionId}`);
    this.#channel.addEventListener('message', this.#onMessage);
    this.#unsubscribe = this.#host.subscribe((snapshot) => {
      this.#projection = snapshot.dm;
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
    this.#host.submitHumanDecision(pending.actorId, {
      requestId: pending.requestId,
      encounterRevision: pending.encounterRevision,
      action,
    });
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
    controls.append(interrupt, resume, undo);
    this.#shell.append(controls);

    const playerShape = {
      bounds: projection.encounter.bounds,
      combatants: projection.encounter.combatants,
      highlightedCombatant: projection.encounter.activeCombatant,
      adjudicatedTargets: projection.adjudicatedTargets,
      foggedCells: projection.encounter.dmOnly.foggedCells,
    };
    this.#shell.append(renderBoard(playerShape));

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
      if (actor?.kind === 'monster') {
        for (const action of projection.pendingRequest.legalActions.actions) {
          const button = element('button', { text: actionLabel(action) });
          button.type = 'button';
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
  options: { readonly view: 'player' | 'dm'; readonly sessionId: string },
): EncounterVttMount {
  const mounted = options.view === 'dm'
    ? new DmEncounterView(root, options.sessionId)
    : new PlayerEncounterView(root, options.sessionId);
  mounted.mount();
  return { close: () => mounted.close() };
}
