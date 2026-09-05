import { describe, expect, it } from 'vitest';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { EffectApplication } from '../../../src/combat/effects';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import { effectStackingIdentity, type CombatantId } from '../../../src/combat/values';
import { projectEncounterBoard, type EncounterBoardProjectionShape } from '../../../src/vtt/encounter-board';
import { projectPlayerBoard } from '../../../src/vtt/encounter-projections';
import {
  readAccessibleBoardViewMode,
  serializeAccessibleBoard,
  writeAccessibleBoardViewMode,
} from '../../../src/vtt/accessible-board';
import {
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import { loadArenaFixture } from '../../../src/vtt/mcp/entrypoint';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const IDLE = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' as const },
  pause: null,
};

function assertSmallHtmlParserAccepts(html: string): void {
  const voidElements = new Set(['meta']);
  const stack: string[] = [];
  const tags = html.matchAll(/<\/?([a-z][a-z0-9-]*)(?:\s[^<>]*?)?>/giu);
  for (const match of tags) {
    const whole = match[0];
    const name = match[1]?.toLowerCase();
    if (name === undefined || voidElements.has(name)) continue;
    if (whole.startsWith('</')) {
      expect(stack.pop(), `closing ${name}`).toBe(name);
    } else {
      stack.push(name);
    }
  }
  expect(stack).toEqual([]);
  expect(html).toMatch(/^<!doctype html>\n<html lang="en">/u);
  expect(html).toContain('<meta charset="utf-8">');
  expect(html).toContain('<main aria-label="Screen-reader encounter board">');
  expect(html).toMatch(/<article[^>]+lang="en"[^>]+title="[^"]+"[^>]+aria-label="[^"]+"/u);
  expect(html).toContain('<header aria-label="Encounter summary">');
  expect(html).not.toMatch(/<(?:img|svg|style|script)\b/gu);
  expect([...html.matchAll(/<table>/gu)]).toHaveLength([...html.matchAll(/<caption>/gu)].length);
  for (const heading of html.matchAll(/<th(?:\s[^>]*)?>/gu)) {
    expect(heading[0]).toMatch(/\sscope="(?:col|row)"/u);
  }
}

function factCellKeys(board: EncounterBoardProjectionShape): readonly string[] {
  const keys = new Set<string>();
  const add = (cell: { readonly column: number; readonly row: number }): void => {
    keys.add(`${String(cell.column)},${String(cell.row)}`);
  };
  for (const cell of board.blockedCells ?? []) add(cell);
  for (const region of board.difficultTerrainRegions ?? []) for (const cell of region.cells) add(cell);
  for (const region of board.obscurementRegions ?? []) for (const cell of region.cells) add(cell);
  for (const region of board.environmentLightRegions ?? []) for (const cell of region.cells) add(cell);
  for (const cell of board.foggedCells ?? []) add(cell);
  for (const cell of board.concealedCells ?? []) add(cell);
  for (const object of board.worldObjects ?? []) for (const cell of object.cells) add(cell);
  for (const area of board.areas ?? []) for (const cell of area.cells) add(cell);
  for (const light of board.lightOverlays ?? []) {
    for (const cell of light.brightCells) add(cell);
    for (const cell of light.dimCells) add(cell);
  }
  return [...keys].sort();
}

function renderedFactCellKeys(html: string): readonly string[] {
  return [...html.matchAll(/<tr data-cell="(\d+,\d+)">/gu)]
    .map((match) => match[1] ?? '')
    .sort();
}

function hiddenReferenceState(): EncounterState {
  const state = createEncounter(referenceEncounterSetup());
  return {
    ...state,
    hiddenCombatants: [{ combatant: REFERENCE_MONSTER_ID, stealthTotal: 18, edition: '2024' }],
  };
}

function conditionPrivacyState(): {
  readonly state: EncounterState;
  readonly viewer: CombatantId;
  readonly target: CombatantId;
} {
  const baseViewer = playerProfile('accessible-condition-viewer');
  const viewer = {
    ...baseViewer,
    rules: {
      ...baseViewer.rules,
      senses: [...baseViewer.rules.senses, { kind: 'truesight' as const, rangeFeet: 60 }],
    },
  };
  const target = monsterProfile('accessible-condition-target');
  let state = createEncounter({
    bounds: { columns: 4, rows: 2 },
    combatants: [viewer, target],
    tokens: [placedToken(viewer, 0), placedToken(target, 1)],
  });
  state = reduceEncounter(state, { type: 'roll_initiative' }, () => 0.5).state;
  const apply = (key: string, condition: 'Charmed' | 'Invisible' | 'Prone'): void => {
    const effect: EffectApplication = {
      targets: [target.id],
      duration: { kind: 'permanent' },
      concentration: false,
      stackingIdentity: effectStackingIdentity(`accessible:${key}`),
      stacking: 'coexist',
      repeatedSave: null,
      payload: { kind: 'condition', condition },
    };
    state = reduceEncounter(
      state,
      { type: 'apply_effect', actor: viewer.id, effect, cost: 'none' },
      () => 0.5,
    ).state;
  };
  apply('charmed', 'Charmed');
  apply('invisible', 'Invisible');
  apply('prone', 'Prone');
  return { state, viewer: viewer.id, target: target.id };
}

describe('screen-reader board HTML', () => {
  it('redacts private non-owned conditions from player HTML while the DM HTML names them', () => {
    const fixture = conditionPrivacyState();
    const playerBoard = projectPlayerBoard(projectPlayerView(fixture.state, {
      seatId: 'seat:accessible-condition-viewer', combatantId: fixture.viewer,
    }), IDLE);
    const playerHtml = serializeAccessibleBoard({
      encounterName: 'Condition privacy', audience: 'player', round: fixture.state.round,
      activeCombatant: fixture.state.activeCombatant, board: playerBoard,
    });
    const dmHtml = serializeAccessibleBoard({
      encounterName: 'Condition privacy', audience: 'dm', round: fixture.state.round,
      activeCombatant: fixture.state.activeCombatant,
      board: projectEncounterBoard(projectDmView(fixture.state)),
    });

    expect(playerBoard.combatants.find((combatant) => combatant.id === fixture.target)?.conditions)
      .toEqual(['Prone']);
    expect(playerHtml).toContain('<td>Prone</td>');
    expect(playerHtml).not.toContain('Charmed');
    expect(playerHtml).not.toContain('Invisible');
    expect(dmHtml).toContain('<td>Charmed, Invisible, Prone</td>');
    expect(dmHtml).toContain('Charmed');
    expect(dmHtml).toContain('Invisible');
    expect(dmHtml).toContain('Prone');
  });

  it('persists the typed presentation mode independently for each audience', () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    };
    expect(readAccessibleBoardViewMode(storage, 'dm')).toBe('graphic');
    expect(readAccessibleBoardViewMode(storage, 'player')).toBe('graphic');
    writeAccessibleBoardViewMode(storage, 'dm', 'screen_reader');
    expect(readAccessibleBoardViewMode(storage, 'dm')).toBe('screen_reader');
    expect(readAccessibleBoardViewMode(storage, 'player')).toBe('graphic');
    values.set('srd55:vtt:board-view:player', 'unsupported');
    expect(readAccessibleBoardViewMode(storage, 'player')).toBe('graphic');
  });

  it('renders every reference-room creature at its exact cell and computes creature-space adjacency', () => {
    const state = hiddenReferenceState();
    const board = projectEncounterBoard(projectDmView(state));
    const html = serializeAccessibleBoard({
      encounterName: 'Reference room', audience: 'dm', round: state.round,
      activeCombatant: state.activeCombatant, board,
    });

    for (const combatant of board.combatants) {
      if (combatant.placementStatus !== 'placed') continue;
      expect(html).toContain(`data-creature-id="${combatant.id}"`);
      expect(html).toContain(`(${String(combatant.position.column)},${String(combatant.position.row)})`);
    }
    const fighterNumber = board.combatants.findIndex((combatant) => combatant.id === REFERENCE_FIGHTER_ID) + 1;
    const monsterNumber = board.combatants.findIndex((combatant) => combatant.id === REFERENCE_MONSTER_ID) + 1;
    expect(html).toContain(`<h3 id="adjacency-${String(fighterNumber)}">Reference Fighter</h3>`);
    expect(html).toContain(`${String(monsterNumber)}. Training Brute`);
    expect(html).toContain('Hidden from players');
    expect(renderedFactCellKeys(html)).toEqual(factCellKeys(board));
    expect(html).toContain('Coordinates are zero-based (column,row), the origin is at the top-left, and each cell represents 5 feet.');
    assertSmallHtmlParserAccepts(html);
  });

  it('player_export_leaks_hidden_creature guards the audience boundary and hidden cell', () => {
    const state = hiddenReferenceState();
    const player = projectPlayerBoard(projectPlayerView(state, {
      seatId: 'seat:accessible-board',
      combatantId: REFERENCE_FIGHTER_ID,
      ownedCombatantIds: REFERENCE_PLAYER_IDS,
    }), IDLE);
    const html = serializeAccessibleBoard({
      encounterName: 'Reference room', audience: 'player', round: player.round,
      activeCombatant: player.activeCombatant, board: player,
    });
    const hiddenToken = state.tokens.find((token) => token.combatantId === REFERENCE_MONSTER_ID);
    if (hiddenToken === undefined) throw new Error('Reference hidden creature has no token.');

    expect(player.combatants.map((combatant) => combatant.id)).not.toContain(REFERENCE_MONSTER_ID);
    expect(html).not.toContain('Training Brute');
    expect(html).not.toContain(`data-creature-id="${REFERENCE_MONSTER_ID}"`);
    expect(html).not.toContain(`data-cell="${String(hiddenToken.position.column)},${String(hiddenToken.position.row)}"`);
    expect(html).not.toContain('<td>Hidden from players</td>');
    expect(renderedFactCellKeys(html)).toEqual(factCellKeys(player));
  });

  it('renders every arena fact cell and produces byte-identical HTML for the same state', async () => {
    const state = await loadArenaFixture('tests/fixtures/arena-basis-brutal/seed-6203001.json');
    const board = projectEncounterBoard(projectDmView(state));
    const context = {
      encounterName: 'Arena room 1', audience: 'dm' as const, round: state.round,
      activeCombatant: state.activeCombatant, board,
    };
    const first = serializeAccessibleBoard(context);
    const second = serializeAccessibleBoard(structuredClone(context));

    expect(second).toBe(first);
    expect(renderedFactCellKeys(first)).toEqual(factCellKeys(board));
    expect(first).toContain('Hazard: Unstable Arcane Vent');
    expect(first).toContain('Light source: Runed Brazier');
    expect(first).toContain('Difficult terrain: difficult:generated-6203001-approach');
    for (const combatant of board.combatants) {
      if (combatant.placementStatus !== 'placed') continue;
      expect(first).toContain(`data-creature-id="${combatant.id}"`);
      expect(first).toContain(`(${String(combatant.position.column)},${String(combatant.position.row)})`);
    }
    assertSmallHtmlParserAccepts(first);
  });
});
