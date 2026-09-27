import { describe, expect, it } from 'vitest';
import { createEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { feet } from '../../../src/combat/values';
import { REFERENCE_FIGHTER_ID, referenceEncounterSetup, referenceTurnLegalActions } from '../../../src/vtt/reference-encounter';
import { movedTo, onBoard } from '../../helpers/board-cell';

// PERF-02 board3. Movement questions take a BoardCell (src/combat/grid.ts), so a caller decodes each
// step before it asks. referenceTurnLegalActions, the DM host's default, used to ask the
// string-keyed world about column -1 and threw RangeError for any actor on column 0 or row 0.

describe('reference movement actions on the grid edge', () => {
  it('lists the Fighter\'s in-grid steps from column 0 and from the corner instead of throwing', () => {
    // Expected steps come from referenceEncounterSetup: a 10x7 grid, Wizard at (1,2) and Cleric at
    // (1,4) (allies: passable, but no mover may end in their space, SRD 5.2.1 "Moving around Other
    // Creatures"), Training Brute at (3,3), the only blocked cell (7,2). Order is the caller's loop:
    // column step -1..1, then row step -1..1.
    const created = createEncounter(referenceEncounterSetup());
    const fighterAt = (column: number, row: number): EncounterState => ({
      ...created,
      combatants: created.combatants.map((combatant) => combatant.profile.id === REFERENCE_FIGHTER_ID
        ? { ...combatant, turn: { ...combatant.turn, movement: { ...combatant.turn.movement, remaining: feet(30) } } }
        : combatant),
      tokens: created.tokens.map((token) => token.combatantId === REFERENCE_FIGHTER_ID ? movedTo(created, token, { column, row }) : token),
    });
    const steps = (state: EncounterState): readonly GridCell[] => referenceTurnLegalActions(state, REFERENCE_FIGHTER_ID).actions
      .flatMap((action) => action.type === 'move' ? action.path : []);
    expect(steps(fighterAt(0, 3))).toEqual([{ column: 0, row: 2 }, { column: 0, row: 4 }, { column: 1, row: 3 }]);
    expect(steps(fighterAt(0, 0))).toEqual([{ column: 0, row: 1 }, { column: 1, row: 0 }, { column: 1, row: 1 }]);
  });
});
