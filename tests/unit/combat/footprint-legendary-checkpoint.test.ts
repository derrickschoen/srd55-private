import { describe, expect, it } from 'vitest';
import { combatToken, type CombatantProfile } from '../../../src/combat/combatant';
import { narrowOpeningId, type SerializedPlacementMode } from '../../../src/combat/creature-space';
import { createEncounter, reduceEncounter, type EncounterState } from '../../../src/combat/encounter';
import type { SpellCastCommand } from '../../../src/combat/spells/types';
import { EMPTY_ENCOUNTER_ENVIRONMENT } from '../../../src/combat/world-objects';
import type { GridCell } from '../../../src/combat/grid';
import { shapeCursePack } from '../../helpers/shape-curse-pack';
import { declareTestInputs } from '../../helpers/test-inputs';
import { monsterProfile, playerProfile } from './fixtures';

// FOOTPRINT §6.3 (W13, W13b). A Legendary Resistance checkpoint records the token's anchor AND its placement mode
// at the failed save, because the failure's effect can change both: a form of another size is applied through the
// size transition, which always sets the normal mode of the new size. The spend restores the effects, then the
// creature, then its token in the recorded mode, minted against the restored size. The failing effect here is a
// Polymorph-shaped pack spell (tests/helpers/shape-curse-pack.ts) that turns the target into a Medium form.

const PACK = 'tests/fixtures/content-pack-v1-homebrew.json';
const inputs = declareTestInputs({ fixtures: [PACK] });

function legendary(key: string, size: 'Large' | 'Huge'): CombatantProfile {
  const base = monsterProfile(key, { initiativeBonus: -10 });
  return {
    ...base,
    rules: { ...base.rules, sizeCategory: size, legendary: { actionUsesMaximum: 0, actions: [], resistanceUsesMaximum: 3 } },
  };
}

/** The value `action` returns, asserting that it does not throw (a refusal here is an assertion failure). */
function accepted<T>(action: () => T): T {
  let value: T | undefined;
  expect(() => { value = action(); }).not.toThrow();
  return value as T;
}

/** The legendary target fails its Wisdom save against Shape Curse (d20 3 + 0 < DC 14) and its LR decision waits. */
function cursed(input: {
  readonly bounds: { readonly columns: number; readonly rows: number };
  readonly target: CombatantProfile;
  readonly targetAt: GridCell;
  readonly targetMode?: SerializedPlacementMode;
  readonly casterAt: GridCell;
  readonly environment?: Parameters<typeof createEncounter>[0]['environment'];
  readonly blockedCells?: readonly GridCell[];
}): { readonly state: EncounterState; readonly decisionId: string } {
  const caster = playerProfile('checkpoint-caster', { initiativeBonus: 100, spellSlots: [{ level: 1, maximum: 4 }] });
  const created = createEncounter({
    bounds: input.bounds,
    contentPacks: [shapeCursePack(JSON.parse(inputs.fixtures.readText(PACK)) as Record<string, unknown>, 'Medium')],
    combatants: [caster, input.target],
    tokens: [
      combatToken(caster, input.casterAt),
      input.targetMode === undefined
        ? combatToken(input.target, input.targetAt)
        : { ...combatToken(input.target, input.targetAt), placementMode: input.targetMode },
    ],
    ...(input.environment === undefined ? {} : { environment: input.environment }),
    ...(input.blockedCells === undefined ? {} : { blockedCells: input.blockedCells }),
    reactionPolicies: [{ combatant: input.target.id, reactionKind: 'legendary_resistance', policy: 'ask' }],
  });
  const started = reduceEncounter(created, { type: 'roll_initiative' }, () => 0.5).state;
  const command: SpellCastCommand = {
    type: 'cast_spell', actor: caster.id, spellId: 'greenforge:shape-curse', slotLevel: 1, castAsRitual: false,
    casterLevel: 5, attackBonus: 6, saveDc: 14, spellcastingModifier: 3, targets: [input.target.id], area: null,
    weaponAttack: null, selectedOption: null,
  };
  const state = reduceEncounter(started, command, () => 0.1).state;
  const decision = state.pendingDecisions.find((candidate) => candidate.kind === 'legendary_resistance');
  if (decision === undefined) throw new Error('Expected a pending Legendary Resistance decision.');
  return { state, decisionId: decision.id };
}

function tokenOf(state: EncounterState, profile: CombatantProfile) {
  return state.tokens.find((token) => token.combatantId === profile.id);
}

describe('FOOTPRINT: the Legendary Resistance checkpoint restores anchor and mode', () => {
  it('W13: a Huge creature cursed into a Medium form is restored {normal, Huge} at its anchor', () => {
    // 8 x 6 open map; the Huge target at (3,1) covers columns 3-5, rows 1-3. The failed save turns it Medium at (3,1).
    const huge = legendary('checkpoint-huge', 'Huge');
    const { state, decisionId } = cursed({ bounds: { columns: 8, rows: 6 }, target: huge, targetAt: { column: 3, row: 1 }, casterAt: { column: 0, row: 2 } });
    expect(tokenOf(state, huge)).toMatchObject({ position: { column: 3, row: 1 }, placementMode: { kind: 'normal', actual: 'Medium' } });
    const decision = state.pendingDecisions.find((candidate) => candidate.id === decisionId);
    expect(decision?.kind === 'legendary_resistance' ? decision.checkpoint.tokenPlacement : null).toEqual({
      kind: 'recorded', anchor: { column: 3, row: 1 }, placementMode: { kind: 'normal', actual: 'Huge' },
    });
    const spent = accepted(() => reduceEncounter(state, { type: 'resolve_pending_decision', decisionId, optionId: 'spend' }, () => 0.5).state);
    expect(tokenOf(spent, huge)).toMatchObject({ position: { column: 3, row: 1 }, placementMode: { kind: 'normal', actual: 'Huge' } });
    expect(spent.combatants.find((entry) => entry.profile.id === huge.id)?.form).toBeUndefined();
  });

  it('W13b: a squeezed Large in a walled Medium opening is restored squeezed, where a normal Large would cover walls', () => {
    // 6 x 3; walls (2,0) (3,0) (2,2) (3,2); a Medium opening {(2,1), (3,1)}. The Large starts squeezed at (2,1): it
    // controls the Medium square (2,1), inside the opening. Cursed Medium, its normal 1 x 1 at (2,1) is unblocked,
    // so the size transition leaves it {normal, Medium} there. A normal Large at (2,1) would cover (2,2) and (3,2).
    const large = legendary('checkpoint-squeezer', 'Large');
    const squeezed = { kind: 'squeezed', actual: 'Large', sizedFor: 'Medium' } as const;
    const { state, decisionId } = cursed({
      bounds: { columns: 6, rows: 3 }, target: large, targetAt: { column: 2, row: 1 }, targetMode: squeezed,
      casterAt: { column: 0, row: 1 },
      environment: {
        ...EMPTY_ENCOUNTER_ENVIRONMENT,
        narrowOpeningRegions: [{ id: narrowOpeningId('opening:medium'), sizedFor: 'Medium', cells: [{ column: 2, row: 1 }, { column: 3, row: 1 }] }],
      },
      blockedCells: [{ column: 2, row: 0 }, { column: 3, row: 0 }, { column: 2, row: 2 }, { column: 3, row: 2 }],
    });
    expect(tokenOf(state, large)).toMatchObject({ position: { column: 2, row: 1 }, placementMode: { kind: 'normal', actual: 'Medium' } });
    const decision = state.pendingDecisions.find((candidate) => candidate.id === decisionId);
    expect(decision?.kind === 'legendary_resistance' ? decision.checkpoint.tokenPlacement : null).toEqual({
      kind: 'recorded', anchor: { column: 2, row: 1 }, placementMode: squeezed,
    });
    const spent = accepted(() => reduceEncounter(state, { type: 'resolve_pending_decision', decisionId, optionId: 'spend' }, () => 0.5).state);
    expect(tokenOf(spent, large)).toMatchObject({ position: { column: 2, row: 1 }, placementMode: squeezed });
  });
});
