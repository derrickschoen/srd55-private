import * as Y from 'yjs';
import {
  BOARD_COLUMNS,
  BOARD_ROWS,
  GRID_SIZE,
  abandonRoomInitialization,
  createToken,
  eraseFog,
  fogCells,
  hasFog,
  initializeRoom,
  listDiceRolls,
  listTokens,
  paintFog,
  readRoomMetadata,
  rollDice,
  updateToken,
  type BoardToken,
  type Cell,
  type DiceRoll,
} from './model';
import { bindDocumentToTransport, type SyncBinding } from './sync';
import { ManualTransport } from './transports/manual';
import type { TransportStatus, VttTransport } from './transports/transport';
import { TrysteroTransport } from './transports/trystero';

const CLIENT_IDENTITY_KEY = 'srd55VttClientIdentity';
const PLAYER_FOG_COLOR = '#11131a';

type BoardMode = 'move' | 'paint' | 'erase';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: {
    readonly className?: string;
    readonly text?: string;
    readonly id?: string;
  } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  if (options.id !== undefined) node.id = options.id;
  return node;
}

function labeledControl(
  label: string,
  control: HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement,
): HTMLLabelElement {
  const wrapper = element('label', { className: 'vtt-field' });
  wrapper.append(element('span', { text: label }), control);
  return wrapper;
}

function randomRoomCode(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return `table-${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function clientIdentity(): string {
  const existing = sessionStorage.getItem(CLIENT_IDENTITY_KEY);
  if (existing !== null) return existing;
  const created = crypto.randomUUID();
  sessionStorage.setItem(CLIENT_IDENTITY_KEY, created);
  return created;
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'The VTT action failed.';
}

function rollText(roll: DiceRoll): string {
  const detail = roll.dice.join(', ');
  return `${roll.expression} = ${String(roll.total)} [${detail}]`;
}

export interface VttMount {
  close(): void;
}

export function mountVtt(root: HTMLElement): VttMount {
  const app = new VttApplication(root, clientIdentity());
  app.mount();
  return Object.freeze({ close: () => app.close() });
}

class VttApplication {
  readonly #doc = new Y.Doc();
  readonly #cleanups: Array<() => void> = [];
  #transport: VttTransport | null = null;
  #sync: SyncBinding | null = null;
  #selectedTokenId: string | null = null;
  #dragTokenId: string | null = null;
  #dragCell: Cell | null = null;
  #pointerDown = false;
  #lastPointerCellKey: string | null = null;
  #mode: BoardMode = 'move';
  #createdRoom = false;
  #starting = false;
  #syncError: string | null = null;
  #actionError: string | null = null;
  #transportError: string | null = null;
  #lastAnnouncedRollId: string | null = null;
  #editorTokenId: string | null = null;

  readonly #shell = element('main', { className: 'vtt-shell' });
  readonly #transportStatus = element('output', {
    className: 'vtt-status',
    id: 'vtt-transport-status',
  });
  readonly #error = element('output', {
    className: 'vtt-error',
    id: 'vtt-error',
  });
  readonly #role = element('output', { className: 'vtt-role', id: 'vtt-role' });
  readonly #connectionPanel = element('section', {
    className: 'vtt-panel vtt-connection',
  });
  readonly #manualPanel = element('section', {
    className: 'vtt-panel vtt-manual',
  });
  readonly #workspace = element('section', { className: 'vtt-workspace' });
  readonly #transportSelect = element('select');
  readonly #roomCode = element('input');
  readonly #canvas = element('canvas');
  readonly #fogControls = element('div', { className: 'vtt-fog-controls' });
  readonly #tokenList = element('ul', { className: 'vtt-token-list' });
  readonly #diceLog = element('ol', { className: 'vtt-dice-log' });
  readonly #diceAnnouncement = element('output', {
    className: 'vtt-visually-hidden',
    id: 'vtt-dice-announcement',
  });
  readonly #selectedLabel = element('input');
  readonly #selectedColor = element('input');
  readonly #createRoomButton = element('button', { text: 'Create room' });
  readonly #joinRoomButton = element('button', { text: 'Join room' });

  constructor(
    private readonly root: HTMLElement,
    private readonly localClientId: string,
  ) {}

  mount(): void {
    this.root.replaceChildren(this.#shell);
    this.root.setAttribute('aria-busy', 'false');
    this.#shell.append(
      element('header', { className: 'vtt-header' }),
      this.#connectionPanel,
      this.#workspace,
    );
    const header = this.#shell.querySelector<HTMLElement>('.vtt-header');
    if (header === null) throw new Error('VTT header did not mount.');
    header.append(
      element('p', { className: 'vtt-kicker', text: 'Phase 1 prototype' }),
      element('h1', { text: 'Shared tabletop' }),
      element('p', {
        text: 'A live grid, tokens, visual fog, and a shared dice log. The board exists only while a peer keeps this page open.',
      }),
    );
    const compose = element('a', { text: 'Compose a rules encounter from stored characters' });
    compose.href = '/vtt?compose=stored';
    header.append(compose);
    this.#buildConnectionPanel();
    this.#buildWorkspace();
    this.#workspace.hidden = true;
    const onDocumentUpdate = (): void => this.#renderBoard();
    this.#doc.on('update', onDocumentUpdate);
    this.#cleanups.push(() => this.#doc.off('update', onDocumentUpdate));
  }

  close(): void {
    this.#sync?.close();
    this.#transport?.close();
    this.#doc.destroy();
    for (const cleanup of this.#cleanups.splice(0)) cleanup();
  }

  #buildConnectionPanel(): void {
    this.#connectionPanel.setAttribute('aria-labelledby', 'vtt-connect-heading');
    this.#connectionPanel.append(
      element('h2', { id: 'vtt-connect-heading', text: 'Connect the table' }),
    );
    const trysteroOption = element('option', { text: 'Trystero (default)' });
    trysteroOption.value = 'trystero';
    const manualOption = element('option', {
      text: 'Manual offer / answer (same network)',
    });
    manualOption.value = 'manual';
    this.#transportSelect.append(trysteroOption, manualOption);
    this.#transportSelect.setAttribute('aria-label', 'Transport');
    this.#roomCode.type = 'text';
    this.#roomCode.value = randomRoomCode();
    this.#roomCode.pattern = '[a-zA-Z0-9-]{3,64}';
    this.#roomCode.autocomplete = 'off';
    const setupFields = element('div', { className: 'vtt-setup-fields' });
    setupFields.append(
      labeledControl('Transport', this.#transportSelect),
      labeledControl('Room code', this.#roomCode),
    );
    this.#createRoomButton.type = 'button';
    this.#joinRoomButton.type = 'button';
    const actions = element('div', { className: 'vtt-actions' });
    actions.append(this.#createRoomButton, this.#joinRoomButton);
    const networkNote = element('p', {
      className: 'vtt-network-note',
      text: 'Trystero uses public Nostr relays only to introduce peers; board updates travel peer-to-peer. A room code is a shared secret, not an account or security boundary.',
    });
    this.#transportStatus.setAttribute('role', 'status');
    this.#transportStatus.setAttribute('aria-live', 'polite');
    this.#transportStatus.value = 'Choose Create or Join.';
    this.#transportStatus.dataset.state = 'idle';
    this.#error.setAttribute('role', 'alert');
    this.#connectionPanel.append(
      setupFields,
      actions,
      networkNote,
      this.#transportStatus,
      this.#error,
      this.#manualPanel,
    );
    this.#manualPanel.hidden = true;
    this.#createRoomButton.addEventListener('click', () => {
      void this.#start(true);
    });
    this.#joinRoomButton.addEventListener('click', () => {
      void this.#start(false);
    });
  }

  async #start(creator: boolean): Promise<void> {
    if (this.#starting || this.#transport !== null) return;
    this.#starting = true;
    this.#createRoomButton.disabled = true;
    this.#joinRoomButton.disabled = true;
    this.#setError(null);
    try {
      if (creator) {
        initializeRoom(this.#doc, this.#roomCode.value, this.localClientId);
        this.#createdRoom = true;
      } else if (!/^[a-zA-Z0-9-]{3,64}$/.test(this.#roomCode.value.trim())) {
        throw new Error('Room code must be 3–64 letters, numbers, or hyphens.');
      }
      this.#transportSelect.disabled = true;
      this.#roomCode.disabled = true;
      this.#workspace.hidden = false;
      if (this.#transportSelect.value === 'manual') {
        await this.#startManual(creator);
      } else {
        this.#activateTransport(new TrysteroTransport(this.#roomCode.value.trim()));
      }
      this.#renderBoard();
    } catch (error) {
      this.#setError(message(error));
      if (this.#transport === null) {
        if (creator && this.#createdRoom) {
          abandonRoomInitialization(this.#doc);
          this.#createdRoom = false;
        }
        this.#transportSelect.disabled = false;
        this.#roomCode.disabled = false;
        this.#workspace.hidden = true;
      }
    } finally {
      this.#starting = false;
      const connectedAttempt = this.#transport !== null;
      this.#createRoomButton.disabled = connectedAttempt;
      this.#joinRoomButton.disabled = connectedAttempt;
    }
  }

  async #startManual(creator: boolean): Promise<void> {
    const manual = new ManualTransport(creator ? 'offerer' : 'answerer');
    let createdOffer: string | null = null;
    try {
      if (creator) createdOffer = await manual.createOffer();
    } catch (error) {
      manual.close();
      throw error;
    }
    this.#activateTransport(manual);
    this.#manualPanel.hidden = false;
    this.#manualPanel.replaceChildren(
      element('h3', { text: creator ? 'Send an offer' : 'Answer an offer' }),
    );
    if (creator) {
      const offer = element('textarea');
      offer.readOnly = true;
      offer.rows = 5;
      offer.setAttribute('aria-label', 'Manual SDP offer');
      const answer = element('textarea');
      answer.rows = 5;
      answer.setAttribute('aria-label', 'Manual SDP answer to apply');
      const apply = element('button', { text: 'Apply answer' });
      apply.type = 'button';
      apply.addEventListener('click', () => {
        void manual.acceptAnswer(answer.value).catch((error: unknown) => {
          this.#setError(message(error));
        });
      });
      this.#manualPanel.append(
        labeledControl('Copy this offer to the player', offer),
        labeledControl('Paste the player answer', answer),
        apply,
      );
      offer.value = createdOffer ?? '';
    } else {
      const offer = element('textarea');
      offer.rows = 5;
      offer.setAttribute('aria-label', 'Manual SDP offer to answer');
      const answer = element('textarea');
      answer.readOnly = true;
      answer.rows = 5;
      answer.setAttribute('aria-label', 'Manual SDP answer');
      const createAnswer = element('button', { text: 'Create answer' });
      createAnswer.type = 'button';
      createAnswer.addEventListener('click', () => {
        void manual
          .acceptOfferAndCreateAnswer(offer.value)
          .then((value) => {
            answer.value = value;
          })
          .catch((error: unknown) => {
            this.#setError(message(error));
          });
      });
      this.#manualPanel.append(
        labeledControl('Paste the DM offer', offer),
        createAnswer,
        labeledControl('Copy this answer to the DM', answer),
      );
    }
  }

  #activateTransport(transport: VttTransport): void {
    this.#transport = transport;
    this.#sync = bindDocumentToTransport(this.#doc, transport, {
      onFatal: (error) => {
        this.#syncError = error;
        this.#setError(error);
        this.#renderBoard();
      },
      onTransient: (error) => {
        this.#setTransportError(error);
      },
    });
    transport.onStatus((status) => this.#showTransportStatus(status));
  }

  #showTransportStatus(status: TransportStatus): void {
    this.#transportStatus.value = status.message;
    this.#transportStatus.dataset.state = status.state;
  }

  #buildWorkspace(): void {
    this.#workspace.setAttribute('aria-labelledby', 'vtt-board-heading');
    const heading = element('div', { className: 'vtt-board-heading' });
    heading.append(element('div'));
    const headingCopy = heading.firstElementChild;
    if (!(headingCopy instanceof HTMLElement)) {
      throw new Error('VTT board heading did not mount.');
    }
    headingCopy.append(
      element('h2', { id: 'vtt-board-heading', text: 'Board' }),
      this.#role,
    );
    this.#role.setAttribute('role', 'status');
    this.#role.setAttribute('aria-live', 'polite');
    const visualWarning = element('p', {
      className: 'vtt-fog-warning',
      text: 'Phase 1 fog is visual concealment at the table, not a security boundary: every connected browser receives the shared document.',
    });
    const manualWarning = element('p', {
      className: 'vtt-fog-warning',
      text: 'Manual offer / answer uses host-only WebRTC candidates and is intended for peers on the same local network. Use Trystero across the internet.',
    });
    this.#canvas.width = BOARD_COLUMNS * GRID_SIZE;
    this.#canvas.height = BOARD_ROWS * GRID_SIZE;
    this.#canvas.className = 'vtt-canvas';
    this.#canvas.tabIndex = 0;
    this.#canvas.setAttribute('role', 'img');
    this.#canvas.setAttribute(
      'aria-label',
      'Shared sixteen by twelve square grid board. Use the token list for keyboard movement.',
    );
    const boardRegion = element('div', { className: 'vtt-board-region' });
    boardRegion.append(this.#canvas);
    const moveMode = element('button', { text: 'Move tokens' });
    moveMode.type = 'button';
    const paintMode = element('button', { text: 'Paint fog' });
    paintMode.type = 'button';
    const eraseMode = element('button', { text: 'Erase fog' });
    eraseMode.type = 'button';
    this.#fogControls.append(moveMode, paintMode, eraseMode);
    const setMode = (mode: BoardMode): void => {
      this.#mode = mode;
      for (const [button, candidate] of [
        [moveMode, 'move'],
        [paintMode, 'paint'],
        [eraseMode, 'erase'],
      ] as const) {
        button.setAttribute('aria-pressed', String(mode === candidate));
      }
    };
    moveMode.addEventListener('click', () => setMode('move'));
    paintMode.addEventListener('click', () => setMode('paint'));
    eraseMode.addEventListener('click', () => setMode('erase'));
    setMode('move');
    this.#installCanvasInteractions();
    const sidebar = this.#buildSidebar();
    this.#workspace.append(heading, visualWarning, manualWarning, this.#fogControls);
    const layout = element('div', { className: 'vtt-board-layout' });
    layout.append(boardRegion, sidebar);
    this.#workspace.append(layout);
  }

  #buildSidebar(): HTMLElement {
    const sidebar = element('aside', { className: 'vtt-sidebar' });
    const addForm = element('form', { className: 'vtt-token-form' });
    const addLabel = element('input');
    addLabel.type = 'text';
    addLabel.maxLength = 40;
    addLabel.value = 'Hero';
    addLabel.required = true;
    const addColor = element('input');
    addColor.type = 'color';
    addColor.value = '#b7472a';
    const addButton = element('button', { text: 'Add token' });
    addButton.type = 'submit';
    addForm.append(
      element('h3', { text: 'Tokens' }),
      labeledControl('New token label', addLabel),
      labeledControl('New token color', addColor),
      addButton,
    );
    addForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.#runBoardAction(() => {
        const token = createToken(this.#doc, addLabel.value, addColor.value);
        this.#selectedTokenId = token.id;
      });
    });
    this.#tokenList.setAttribute('aria-label', 'Visible tokens and positions');
    const editor = element('form', { className: 'vtt-token-editor' });
    this.#selectedLabel.type = 'text';
    this.#selectedLabel.maxLength = 40;
    this.#selectedColor.type = 'color';
    const apply = element('button', { text: 'Update selected token' });
    apply.type = 'submit';
    editor.append(
      element('h4', { text: 'Selected token' }),
      labeledControl('Selected token label', this.#selectedLabel),
      labeledControl('Selected token color', this.#selectedColor),
      apply,
    );
    editor.addEventListener('submit', (event) => {
      event.preventDefault();
      if (this.#selectedTokenId === null) return;
      this.#runBoardAction(() => {
        updateToken(this.#doc, this.#selectedTokenId ?? '', {
          label: this.#selectedLabel.value,
          color: this.#selectedColor.value,
        });
      });
    });
    const diceForm = element('form', { className: 'vtt-dice-form' });
    const expression = element('input');
    expression.type = 'text';
    expression.value = '1d20+0';
    expression.required = true;
    expression.setAttribute('aria-describedby', 'vtt-dice-help');
    const diceHelp = element('small', {
      id: 'vtt-dice-help',
      text: 'Use XdY+Z or XdY-Z; up to 100 dice with 2–1000 sides.',
    });
    const rollButton = element('button', { text: 'Roll dice' });
    rollButton.type = 'submit';
    diceForm.append(
      element('h3', { text: 'Shared dice log' }),
      labeledControl('Dice expression', expression),
      diceHelp,
      rollButton,
    );
    diceForm.addEventListener('submit', (event) => {
      event.preventDefault();
      this.#runBoardAction(() => {
        rollDice(this.#doc, expression.value, this.localClientId);
      });
    });
    this.#diceLog.setAttribute('aria-label', 'Dice rolls');
    this.#diceAnnouncement.setAttribute('role', 'status');
    this.#diceAnnouncement.setAttribute('aria-live', 'polite');
    sidebar.append(
      addForm,
      this.#tokenList,
      editor,
      diceForm,
      this.#diceAnnouncement,
      this.#diceLog,
    );
    return sidebar;
  }

  #installCanvasInteractions(): void {
    const actOnFog = (cell: Cell): void => {
      if (!this.#isDm()) return;
      if (this.#mode === 'paint') paintFog(this.#doc, cell);
      if (this.#mode === 'erase') eraseFog(this.#doc, cell);
    };
    this.#canvas.addEventListener('pointerdown', (event) => {
      if (this.#syncError !== null) return;
      const cell = this.#eventCell(event);
      this.#pointerDown = true;
      this.#lastPointerCellKey = `${String(cell.column)},${String(cell.row)}`;
      this.#canvas.setPointerCapture(event.pointerId);
      if (this.#mode !== 'move') {
        this.#runBoardAction(() => actOnFog(cell));
        return;
      }
      const token = [...this.#visibleTokens()].reverse().find(
        (candidate) =>
          candidate.cell.column === cell.column && candidate.cell.row === cell.row,
      );
      if (token !== undefined) {
        this.#selectedTokenId = token.id;
        this.#dragTokenId = token.id;
        this.#dragCell = cell;
        this.#renderBoard();
      }
    });
    this.#canvas.addEventListener('pointermove', (event) => {
      if (!this.#pointerDown) return;
      const cell = this.#eventCell(event);
      if (this.#mode !== 'move') {
        const key = `${String(cell.column)},${String(cell.row)}`;
        if (key === this.#lastPointerCellKey) return;
        this.#lastPointerCellKey = key;
        this.#runBoardAction(() => actOnFog(cell));
        return;
      }
      if (this.#dragTokenId !== null) {
        this.#dragCell = cell;
        this.#drawCanvas();
      }
    });
    const finishDrag = (event: PointerEvent): void => {
      if (!this.#pointerDown) return;
      this.#pointerDown = false;
      this.#lastPointerCellKey = null;
      if (this.#canvas.hasPointerCapture(event.pointerId)) {
        this.#canvas.releasePointerCapture(event.pointerId);
      }
      const tokenId = this.#dragTokenId;
      const cell = this.#dragCell;
      this.#dragTokenId = null;
      this.#dragCell = null;
      if (tokenId !== null && cell !== null) {
        this.#runBoardAction(() => updateToken(this.#doc, tokenId, { cell }));
      } else {
        this.#renderBoard();
      }
    };
    this.#canvas.addEventListener('pointerup', finishDrag);
    this.#canvas.addEventListener('pointercancel', finishDrag);
  }

  #eventCell(event: PointerEvent): Cell {
    const bounds = this.#canvas.getBoundingClientRect();
    const x = ((event.clientX - bounds.left) / bounds.width) * this.#canvas.width;
    const y = ((event.clientY - bounds.top) / bounds.height) * this.#canvas.height;
    return Object.freeze({
      column: Math.max(0, Math.min(BOARD_COLUMNS - 1, Math.floor(x / GRID_SIZE))),
      row: Math.max(0, Math.min(BOARD_ROWS - 1, Math.floor(y / GRID_SIZE))),
    });
  }

  #runBoardAction(action: () => void): void {
    this.#setError(null);
    try {
      if (this.#syncError !== null) throw new Error(this.#syncError);
      if (readRoomMetadata(this.#doc) === null) {
        throw new Error('Waiting for the room document from the DM.');
      }
      action();
      this.#renderBoard();
    } catch (error) {
      this.#setError(message(error));
    }
  }

  #renderBoard(): void {
    try {
      this.#renderBoardUnsafe();
    } catch (error) {
      this.#setError(`Board render failed: ${message(error)}`);
    }
  }

  #renderBoardUnsafe(): void {
    let metadata;
    try {
      metadata = readRoomMetadata(this.#doc);
    } catch (error) {
      this.#syncError = message(error);
      this.#setError(this.#syncError);
      metadata = null;
    }
    const role = metadata === null
      ? 'waiting'
      : metadata.dmClientId === this.localClientId
        ? 'dm'
        : 'player';
    this.#role.value = role === 'dm' ? 'Role: DM' : role === 'player' ? 'Role: Player' : 'Role: waiting for DM';
    this.#role.dataset.role = role;
    if (
      this.#createdRoom &&
      metadata !== null &&
      metadata.dmClientId !== this.localClientId
    ) {
      this.#setError('Another creator won room authority; this browser is now a player.');
    }
    this.#fogControls.hidden = role !== 'dm';
    this.#canvas.dataset.role = role;
    this.#canvas.dataset.fogCount = String(fogCells(this.#doc).length);
    this.#renderTokenList();
    this.#renderDiceLog();
    this.#drawCanvas();
  }

  #renderTokenList(): void {
    const focusedTokenId =
      document.activeElement instanceof HTMLElement &&
      this.#tokenList.contains(document.activeElement)
        ? document.activeElement.dataset.tokenId ?? null
        : null;
    const tokens = this.#visibleTokens();
    this.#tokenList.replaceChildren();
    for (const token of tokens) {
      const item = element('li');
      const button = element('button', {
        text: `${token.label} — column ${String(token.cell.column)}, row ${String(token.cell.row)}`,
      });
      button.type = 'button';
      button.dataset.tokenId = token.id;
      button.dataset.column = String(token.cell.column);
      button.dataset.row = String(token.cell.row);
      button.style.setProperty('--token-color', token.color);
      button.setAttribute('aria-pressed', String(token.id === this.#selectedTokenId));
      button.addEventListener('click', () => {
        this.#selectedTokenId = token.id;
        this.#renderBoard();
      });
      button.addEventListener('keydown', (event) => {
        const delta = keyboardDelta(event.key);
        if (delta === null) return;
        event.preventDefault();
        const cell = Object.freeze({
          column: Math.max(0, Math.min(BOARD_COLUMNS - 1, token.cell.column + delta.column)),
          row: Math.max(0, Math.min(BOARD_ROWS - 1, token.cell.row + delta.row)),
        });
        this.#runBoardAction(() => updateToken(this.#doc, token.id, { cell }));
      });
      item.append(button);
      this.#tokenList.append(item);
    }
    if (focusedTokenId !== null) {
      const replacement = Array.from(
        this.#tokenList.querySelectorAll<HTMLButtonElement>('button'),
      )
        .find((button) => button.dataset.tokenId === focusedTokenId);
      replacement?.focus();
    }
    const selected = tokens.find((token) => token.id === this.#selectedTokenId);
    this.#selectedLabel.disabled = selected === undefined;
    this.#selectedColor.disabled = selected === undefined;
    if (selected === undefined) {
      this.#editorTokenId = null;
      this.#selectedLabel.value = '';
      this.#selectedColor.value = '#777777';
    } else if (
      selected.id !== this.#editorTokenId ||
      (document.activeElement !== this.#selectedLabel &&
        document.activeElement !== this.#selectedColor)
    ) {
      this.#editorTokenId = selected.id;
      this.#selectedLabel.value = selected.label;
      this.#selectedColor.value = selected.color;
    }
  }

  #visibleTokens(): readonly BoardToken[] {
    const tokens = listTokens(this.#doc);
    return this.#isDm()
      ? tokens
      : tokens.filter((token) => !hasFog(this.#doc, token.cell));
  }

  #renderDiceLog(): void {
    this.#diceLog.replaceChildren();
    for (const roll of listDiceRolls(this.#doc)) {
      const item = element('li', { text: rollText(roll) });
      item.dataset.rollId = roll.id;
      item.dataset.expression = roll.expression;
      item.dataset.total = String(roll.total);
      this.#diceLog.append(item);
    }
    const latest = listDiceRolls(this.#doc).at(-1);
    if (latest !== undefined && latest.id !== this.#lastAnnouncedRollId) {
      this.#lastAnnouncedRollId = latest.id;
      this.#diceAnnouncement.value = `New roll: ${rollText(latest)}`;
    }
  }

  #drawCanvas(): void {
    const context = this.#canvas.getContext('2d');
    if (context === null) throw new Error('Canvas 2D rendering is unavailable.');
    context.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    context.fillStyle = '#f4efe4';
    context.fillRect(0, 0, this.#canvas.width, this.#canvas.height);
    context.strokeStyle = '#afa692';
    context.lineWidth = 1;
    for (let column = 0; column <= BOARD_COLUMNS; column += 1) {
      context.beginPath();
      context.moveTo(column * GRID_SIZE + 0.5, 0);
      context.lineTo(column * GRID_SIZE + 0.5, this.#canvas.height);
      context.stroke();
    }
    for (let row = 0; row <= BOARD_ROWS; row += 1) {
      context.beginPath();
      context.moveTo(0, row * GRID_SIZE + 0.5);
      context.lineTo(this.#canvas.width, row * GRID_SIZE + 0.5);
      context.stroke();
    }
    for (const token of this.#visibleTokens()) {
      const cell = token.id === this.#dragTokenId && this.#dragCell !== null
        ? this.#dragCell
        : token.cell;
      const centerX = cell.column * GRID_SIZE + GRID_SIZE / 2;
      const centerY = cell.row * GRID_SIZE + GRID_SIZE / 2;
      context.beginPath();
      context.arc(centerX, centerY, GRID_SIZE * 0.36, 0, Math.PI * 2);
      context.fillStyle = token.color;
      context.fill();
      context.strokeStyle = token.id === this.#selectedTokenId ? '#fff4bd' : '#2d2620';
      context.lineWidth = token.id === this.#selectedTokenId ? 4 : 2;
      context.stroke();
      context.fillStyle = '#ffffff';
      context.font = 'bold 12px system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      const shortLabel = token.label.length > 8 ? `${token.label.slice(0, 7)}…` : token.label;
      context.fillText(shortLabel, centerX, centerY, GRID_SIZE - 6);
    }
    for (const cell of fogCells(this.#doc)) {
      const x = cell.column * GRID_SIZE;
      const y = cell.row * GRID_SIZE;
      if (this.#isDm()) {
        context.fillStyle = 'rgba(17, 19, 26, 0.16)';
        context.fillRect(x, y, GRID_SIZE, GRID_SIZE);
        context.strokeStyle = 'rgba(17, 19, 26, 0.35)';
        context.lineWidth = 2;
        for (let offset = -GRID_SIZE; offset < GRID_SIZE * 2; offset += 12) {
          context.beginPath();
          context.moveTo(x + offset, y);
          context.lineTo(x + offset + GRID_SIZE, y + GRID_SIZE);
          context.stroke();
        }
      } else {
        context.fillStyle = PLAYER_FOG_COLOR;
        context.fillRect(x, y, GRID_SIZE, GRID_SIZE);
      }
    }
  }

  #isDm(): boolean {
    try {
      return readRoomMetadata(this.#doc)?.dmClientId === this.localClientId;
    } catch {
      return false;
    }
  }

  #setError(value: string | null): void {
    this.#actionError = value;
    this.#renderError();
  }

  #setTransportError(value: string | null): void {
    this.#transportError = value;
    this.#renderError();
  }

  #renderError(): void {
    const value = this.#actionError ?? this.#transportError;
    this.#error.value = value ?? '';
    this.#error.hidden = value === null;
  }
}

function keyboardDelta(key: string): Cell | null {
  switch (key) {
    case 'ArrowLeft':
      return Object.freeze({ column: -1, row: 0 });
    case 'ArrowRight':
      return Object.freeze({ column: 1, row: 0 });
    case 'ArrowUp':
      return Object.freeze({ column: 0, row: -1 });
    case 'ArrowDown':
      return Object.freeze({ column: 0, row: 1 });
    default:
      return null;
  }
}
