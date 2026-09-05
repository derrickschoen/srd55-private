import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { combatToken, type CombatantProfile } from '../../../src/combat/combatant';
import {
  PendingPlacementRuleError,
  createEncounter,
  orderedMigrationPlacementQueue,
  reduceEncounter,
  type EncounterState,
  type MigrationAdjudicationPending,
} from '../../../src/combat/encounter';
import {
  creatureSpace,
  minimumSpaceLine,
  normalPlacementFor,
  placementFor,
  sizedCombatantState,
} from '../../../src/combat/creature-space';
import { combatantId, encounterEffectId, type CombatantId } from '../../../src/combat/values';
import { projectDmView, projectPlayerView } from '../../../src/combat/visibility';
import {
  encounterBoardTokenRenderModels,
  projectEncounterBoard,
  type EncounterBoardPlacedCombatant,
  type EncounterBoardProjectionShape,
} from '../../../src/vtt/encounter-board';
import {
  applyPendingPlacementFocus,
  renderBoard,
  renderPendingPlacementRecoveryHeading,
  type EncounterBoardStackSelection,
} from '../../../src/vtt/encounter-app';
import { projectDmBoard } from '../../../src/vtt/encounter-projections';
import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
import { generateRoom } from '../../../src/vtt/room-generator';
import {
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

const FIGHTER = combatantId('combatant:fighter');
const CLERIC = combatantId('combatant:cleric');

function profile(state: EncounterState, id: CombatantId): CombatantProfile {
  const found = state.combatants.find((entry) => entry.profile.id === id)?.profile;
  if (found === undefined) throw new Error(`Missing test profile ${String(id)}.`);
  return found;
}

function placed(
  id: CombatantId,
  name: string,
  size: EncounterBoardPlacedCombatant['effectiveSize'],
  position: EncounterBoardPlacedCombatant['position'],
  footprint: EncounterBoardPlacedCombatant['footprint'],
  life: NonNullable<EncounterBoardPlacedCombatant['life']> = 'living',
): EncounterBoardPlacedCombatant {
  return {
    id,
    name,
    kind: 'player_character',
    life,
    placementStatus: 'placed',
    position,
    effectiveSize: size,
    placementMode: { kind: 'normal', actual: size },
    footprint,
  };
}

function projection(
  combatants: EncounterBoardProjectionShape['combatants'],
  options: Partial<Pick<EncounterBoardProjectionShape,
    'highlightedCombatant' | 'adjudicatedTargets' | 'sustainedEffects' | 'targetLines'>> = {},
): EncounterBoardProjectionShape {
  return {
    bounds: { columns: 10, rows: 7 },
    combatants,
    highlightedCombatant: options.highlightedCombatant ?? null,
    adjudicatedTargets: options.adjudicatedTargets ?? [],
    sustainedEffects: options.sustainedEffects ?? [],
    targetLines: options.targetLines ?? [],
  };
}

function keydown(key: string): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true });
  Object.defineProperty(event, 'key', { value: key });
  return event as KeyboardEvent;
}

function migrationPendingState(): EncounterState {
  const generated = generateRoom(3_943_001).encounter.state;
  const fighterBase = profile(generated, FIGHTER);
  const cleric = profile(generated, CLERIC);
  const fighter = {
    ...fighterBase,
    rules: { ...fighterBase.rules, sizeCategory: 'Medium' as const },
  };
  const base = createEncounter({
    bounds: { columns: 6, rows: 6 },
    combatants: [fighter, cleric],
    tokens: [combatToken(fighter, { column: 1, row: 1 }), combatToken(cleric, { column: 4, row: 4 })],
  });
  const original = base.tokens.find((token) => token.combatantId === FIGHTER);
  if (original === undefined) throw new Error('Migration test token is missing.');
  const record: MigrationAdjudicationPending = {
    kind: 'legacy_size_required',
    combatant: FIGHTER,
    sourceSizeText: null,
    suggestedAnchor: { column: 1, row: 1 },
    originatingToken: {
      id: original.id,
      combatantId: original.combatantId,
      position: { ...original.position },
    },
  };
  return {
    ...base,
    tokens: base.tokens.filter((token) => token.combatantId !== FIGHTER),
    adjudicationPending: [record],
    phase: {
      kind: 'awaiting_placement',
      combatantId: FIGHTER,
      reason: 'legacy_size_required',
      originatingRecord: record,
      resumePhase: { kind: 'active' },
    },
  };
}

describe('footprint Increment 4 board and migration placement recovery', () => {
  let restoreDocument: (() => void) | null = null;

  beforeEach(() => {
    restoreDocument = installInteractiveDocument();
  });

  afterEach(() => {
    restoreDocument?.();
    restoreDocument = null;
  });

  it('dom_token_forced_to_one_by_one: renders one exact footprint-sized DOM token at every edge', () => {
    const cases = [
      placed(combatantId('combatant:tiny-edge'), 'Tiny Edge', 'Tiny', { column: 9, row: 6 }, [{ column: 9, row: 6 }]),
      placed(combatantId('combatant:small-edge'), 'Small Edge', 'Small', { column: 0, row: 6 }, [{ column: 0, row: 6 }]),
      placed(combatantId('combatant:medium-edge'), 'Medium Edge', 'Medium', { column: 9, row: 0 }, [{ column: 9, row: 0 }]),
      placed(combatantId('combatant:large-edge'), 'Large Edge', 'Large', { column: 0, row: 5 }, [
        { column: 0, row: 5 }, { column: 1, row: 5 },
        { column: 0, row: 6 }, { column: 1, row: 6 },
      ]),
      placed(combatantId('combatant:huge-edge'), 'Huge Edge', 'Huge', { column: 7, row: 4 }, [
        { column: 7, row: 4 }, { column: 8, row: 4 }, { column: 9, row: 4 },
        { column: 7, row: 5 }, { column: 8, row: 5 }, { column: 9, row: 5 },
        { column: 7, row: 6 }, { column: 8, row: 6 }, { column: 9, row: 6 },
      ]),
      placed(combatantId('combatant:gargantuan-edge'), 'Gargantuan Edge', 'Gargantuan', { column: 6, row: 0 }, [
        { column: 6, row: 0 }, { column: 7, row: 0 }, { column: 8, row: 0 }, { column: 9, row: 0 },
        { column: 6, row: 1 }, { column: 7, row: 1 }, { column: 8, row: 1 }, { column: 9, row: 1 },
        { column: 6, row: 2 }, { column: 7, row: 2 }, { column: 8, row: 2 }, { column: 9, row: 2 },
        { column: 6, row: 3 }, { column: 7, row: 3 }, { column: 8, row: 3 }, { column: 9, row: 3 },
      ]),
    ] as const;
    const expectedSpans = [1, 1, 1, 2, 3, 4] as const;

    cases.forEach((combatant, index) => {
      const board = renderBoard(
        projection([combatant]),
        new Set(),
        null,
        { revision: 1, round: 1, stateDigest: `footprint:${String(index)}` },
      );
      const tokens = interactiveElement(board).querySelectorAll('.encounter-token');
      expect(tokens).toHaveLength(1);
      expect(board.dataset.boardChrome).toBe('on');
      expect(interactiveElement(board).querySelectorAll('.encounter-nameplate')).toHaveLength(1);
      expect(tokens[0]?.dataset.columnSpan).toBe(String(expectedSpans[index]));
      expect(tokens[0]?.dataset.rowSpan).toBe(String(expectedSpans[index]));
      expect(tokens[0]?.getAttribute('aria-label')).toBe(
        `${combatant.name}, ${combatant.effectiveSize}, column ${String(combatant.position.column)}, row ${String(combatant.position.row)}`,
      );
    });
  });

  it('keeps adjacent Large hit regions independent and every overlay inside the same 2x2 button', () => {
    const left = placed(FIGHTER, 'Left Large', 'Large', { column: 0, row: 0 }, [
      { column: 0, row: 0 }, { column: 1, row: 0 }, { column: 0, row: 1 }, { column: 1, row: 1 },
    ]);
    const right = placed(CLERIC, 'Right Large', 'Large', { column: 2, row: 0 }, [
      { column: 2, row: 0 }, { column: 3, row: 0 }, { column: 2, row: 1 }, { column: 3, row: 1 },
    ]);
    const board = renderBoard(projection([left, right], {
      highlightedCombatant: FIGHTER,
      adjudicatedTargets: [FIGHTER],
      sustainedEffects: [{
        effectId: encounterEffectId('effect:board-overlay'),
        owner: FIGHTER,
        ownerName: left.name,
        spellId: 'test:overlay',
        targetBinding: 'bound_combatants',
        badge: 'test overlay — bound',
        boundTargets: [],
        activationAvailable: true,
      }],
    }));
    const tokens = interactiveElement(board).querySelectorAll('.encounter-token');
    expect(tokens.map((token) => [token.dataset.combatantId, token.dataset.stackSize])).toEqual([
      [FIGHTER, '1'], [CLERIC, '1'],
    ]);
    expect(tokens.map((token) => token.tabIndex)).toEqual([0, 0]);
    expect(tokens[0]?.querySelectorAll('.encounter-token-overlay')).toHaveLength(2);
    expect(tokens[0]?.querySelectorAll('.encounter-sustained-badge')).toHaveLength(1);
    expect(tokens[0]?.dataset.columnSpan).toBe('2');

    const dyingBoard = renderBoard(projection([
      placed(FIGHTER, 'Dying Large', 'Large', { column: 0, row: 0 }, left.footprint, 'dying'),
      placed(CLERIC, 'Dead Large', 'Large', { column: 2, row: 0 }, right.footprint, 'dead'),
    ]));
    const lifeTokens = interactiveElement(dyingBoard).querySelectorAll('.encounter-token');
    expect(lifeTokens.map((token) => [
      token.dataset.life,
      token.dataset.marker,
      token.dataset.columnSpan,
      token.getAttribute('aria-label'),
    ])).toEqual([
      ['dying', 'token', '2', 'Dying Large, Large, column 0, row 0'],
      ['dead', 'corpse', '2', 'Dead Large, Large, column 2, row 0'],
    ]);
  });

  it('cycles two forced overlaps and four Tiny occupants in stable pointer and keyboard order', () => {
    const forced = [
      placed(FIGHTER, 'Forced First', 'Medium', { column: 2, row: 2 }, [{ column: 2, row: 2 }]),
      placed(CLERIC, 'Forced Second', 'Medium', { column: 2, row: 2 }, [{ column: 2, row: 2 }]),
    ];
    expect(encounterBoardTokenRenderModels(projection(forced), {
      ...REFERENCE_ENCOUNTER_ART,
      combatantTokens: REFERENCE_ENCOUNTER_ART.combatantTokens,
    }).map((model) => [model.id, model.stackIndex, model.stackSize])).toEqual([
      [FIGHTER, 0, 2], [CLERIC, 1, 2],
    ]);

    const occupants = [FIGHTER, CLERIC,
      combatantId('combatant:tiny-c'), combatantId('combatant:tiny-d')].map((id, index) =>
      placed(id, `Occupant ${String(index + 1)}`, 'Tiny', { column: 4, row: 3 }, [{ column: 4, row: 3 }]));
    const selection: EncounterBoardStackSelection = new Map();
    const board = renderBoard(projection(occupants), new Set(), null, undefined, null, selection);
    const root = interactiveElement(board);
    const tokens = root.querySelectorAll('.encounter-token');
    const listbox = root.querySelector('[role="listbox"]');
    expect(tokens).toHaveLength(4);
    expect(tokens.map((token) => token.tabIndex)).toEqual([0, -1, -1, -1]);
    expect(tokens.map((token) => token.getAttribute('aria-label'))).toEqual([
      'Occupant 1, occupant 1 of 4, Tiny, column 4, row 3',
      'Occupant 2, occupant 2 of 4, Tiny, column 4, row 3',
      'Occupant 3, occupant 3 of 4, Tiny, column 4, row 3',
      'Occupant 4, occupant 4 of 4, Tiny, column 4, row 3',
    ]);
    tokens[0]?.click();
    expect(tokens.map((token) => token.tabIndex)).toEqual([-1, 0, -1, -1]);
    tokens[1]?.dispatchEvent(keydown('ArrowRight'));
    expect(tokens.map((token) => token.tabIndex)).toEqual([-1, -1, 0, -1]);
    tokens[2]?.dispatchEvent(keydown('Enter'));
    expect(listbox?.hidden).toBe(false);
    expect(listbox?.querySelectorAll('[role="option"]')).toHaveLength(4);
    tokens[2]?.dispatchEvent(keydown('Escape'));
    expect(listbox?.hidden).toBe(true);
  });

  it('renders the minimum equal-distance row-major center pair as exact SVG coordinates', () => {
    const large = sizedCombatantState('Large');
    const source = creatureSpace(large, placementFor(
      large, { column: 0, row: 0 }, normalPlacementFor(large),
    ));
    const target = creatureSpace(large, placementFor(
      large, { column: 3, row: 0 }, normalPlacementFor(large),
    ));
    const line = minimumSpaceLine(source, target);
    expect(line).toEqual({
      distance: 10,
      sourceCell: { column: 1, row: 0 },
      targetCell: { column: 3, row: 0 },
      sourceCenter: { x: 1.5, y: 0.5 },
      targetCenter: { x: 3.5, y: 0.5 },
    });
    const board = renderBoard(projection([], {
      targetLines: [{
        effectId: encounterEffectId('effect:equal-distance'),
        from: line.sourceCenter,
        to: line.targetCenter,
        target: FIGHTER,
      }],
    }));
    const rendered = interactiveElement(board).querySelector('line');
    expect(rendered?.getAttribute('x1')).toBe('1.5');
    expect(rendered?.getAttribute('y1')).toBe('0.5');
    expect(rendered?.getAttribute('x2')).toBe('3.5');
    expect(rendered?.getAttribute('y2')).toBe('0.5');
  });

  it('projects pending roster entries without hit regions and exposes hand-validated legal anchors', () => {
    const state = migrationPendingState();
    const board = projectEncounterBoard(projectDmView(state));
    expect(board.combatants.find((entry) => entry.id === FIGHTER)).toEqual({
      id: FIGHTER,
      name: profile(state, FIGHTER).name,
      kind: 'player_character',
      life: 'living',
      hitPointBand: { kind: 'perceived_band', band: 'uninjured' },
      hiddenFromPlayers: false,
      placementStatus: 'placement_pending',
      pendingReason: 'legacy_size_required',
    });
    expect(encounterBoardTokenRenderModels(board, REFERENCE_ENCOUNTER_ART)
      .some((entry) => entry.id === FIGHTER)).toBe(false);
    expect(projectPlayerView(state, { seatId: 'seat:fighter', combatantId: FIGHTER }).combatants)
      .toContainEqual(expect.objectContaining({
        id: FIGHTER,
        placementStatus: 'placement_pending',
        pendingReason: 'legacy_size_required',
      }));
    const dm = projectDmBoard({
      view: projectDmView(state),
      coordinator: {
        requestSequence: 1,
        pendingRequest: null,
        pendingCommand: null,
        continuation: { kind: 'idle' },
        pause: null,
      },
      controllers: [],
      history: [],
    });
    expect(dm.pendingPlacementRecovery).toEqual(expect.objectContaining({
      combatantId: FIGHTER,
      reason: 'legacy_size_required',
      suggestedAnchor: { column: 1, row: 1 },
      sizeInput: 'required',
    }));
    expect(dm.pendingPlacementRecovery?.sizeOptions.find((entry) => entry.size === 'Large')
      ?.legalAnchors).toContainEqual({
        anchor: { column: 0, row: 0 },
        effectiveSize: 'Large',
        placementMode: { kind: 'normal', actual: 'Large' },
        footprint: [
          { column: 0, row: 0 }, { column: 1, row: 0 },
          { column: 0, row: 1 }, { column: 1, row: 1 },
        ],
      });

    const recovery = dm.pendingPlacementRecovery;
    if (recovery === null) throw new Error('DM recovery projection is missing.');
    const recoveryPanel = renderPendingPlacementRecoveryHeading(recovery);
    document.body.append(recoveryPanel);
    applyPendingPlacementFocus(document.body, 'recovery', null);
    expect(interactiveElement(document.activeElement as Node).dataset.pendingPlacementHeading)
      .toBe('true');

    const resumedBoard = renderBoard(projection([
      placed(CLERIC, 'Active Cleric', 'Medium', { column: 4, row: 4 }, [{ column: 4, row: 4 }]),
    ], { highlightedCombatant: CLERIC }));
    document.body.replaceChildren(resumedBoard);
    applyPendingPlacementFocus(document.body, 'active_token', CLERIC);
    expect(interactiveElement(document.activeElement as Node).dataset.combatantId).toBe(CLERIC);
  });

  it('freezes other commands, returns typed placement refusals, resolves atomically, and resumes', () => {
    const state = migrationPendingState();
    expect(() => reduceEncounter(state, { type: 'end_turn', actor: FIGHTER }, () => 10))
      .toThrow(new PendingPlacementRuleError('placement_resolution_required', FIGHTER));
    expect(() => reduceEncounter(state, {
      type: 'resolve_pending_placement',
      combatant: FIGHTER,
      reason: 'legacy_size_required',
      size: 'Large',
      anchor: { column: 5, row: 5 },
    }, () => 10)).toThrow(new PendingPlacementRuleError('outside_bounds', FIGHTER));

    const resolution = reduceEncounter(state, {
      type: 'resolve_pending_placement',
      combatant: FIGHTER,
      reason: 'legacy_size_required',
      size: 'Large',
      anchor: { column: 0, row: 0 },
    }, () => 10);
    expect(resolution.events).toEqual([expect.objectContaining({
      type: 'pending_placement_resolved',
      combatant: FIGHTER,
      reason: 'legacy_size_required',
      effectiveSize: 'Large',
      position: { column: 0, row: 0 },
      placementMode: { kind: 'normal', actual: 'Large' },
    })]);
    expect(resolution.state.phase).toEqual({ kind: 'active' });
    expect(resolution.state.adjudicationPending).toEqual([]);
    expect(resolution.state.tokens.find((token) => token.combatantId === FIGHTER)).toEqual({
      id: 'token:fighter',
      combatantId: FIGHTER,
      position: { column: 0, row: 0 },
      placementMode: { kind: 'normal', actual: 'Large' },
    });
    expect(profile(resolution.state, FIGHTER).rules.sizeCategory).toBe('Large');

    const withoutOriginRecord: MigrationAdjudicationPending = {
      kind: 'legacy_size_required',
      combatant: FIGHTER,
      sourceSizeText: null,
      suggestedAnchor: null,
      originatingToken: null,
    };
    const withoutOrigin: EncounterState = {
      ...state,
      adjudicationPending: [withoutOriginRecord],
      phase: {
        kind: 'awaiting_placement',
        combatantId: FIGHTER,
        reason: 'legacy_size_required',
        originatingRecord: withoutOriginRecord,
        resumePhase: { kind: 'active' },
      },
    };
    expect(reduceEncounter(withoutOrigin, {
      type: 'resolve_pending_placement',
      combatant: FIGHTER,
      reason: 'legacy_size_required',
      size: 'Medium',
      anchor: { column: 0, row: 0 },
    }, () => 10).state.tokens.find((token) => token.combatantId === FIGHTER)?.id)
      .toBe('token:fighter');
  });

  it('orders the migration recovery queue by initiative and then branded id', () => {
    const records: readonly MigrationAdjudicationPending[] = [
      { kind: 'legacy_size_required', combatant: FIGHTER, sourceSizeText: null, suggestedAnchor: null, originatingToken: null },
      { kind: 'legacy_size_required', combatant: CLERIC, sourceSizeText: null, suggestedAnchor: null, originatingToken: null },
      { kind: 'legacy_size_required', combatant: combatantId('combatant:alpha'), sourceSizeText: null, suggestedAnchor: null, originatingToken: null },
    ];
    expect(orderedMigrationPlacementQueue(records, [
      { combatant: CLERIC, total: 18, roll: 15, bonus: 3, slot: 0 },
      { combatant: FIGHTER, total: 18, roll: 16, bonus: 2, slot: 0 },
    ]).map((record) => record.combatant)).toEqual([
      CLERIC, FIGHTER, combatantId('combatant:alpha'),
    ]);
  });
});
