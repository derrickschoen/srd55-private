import { describe, expect, it } from 'vitest';
import type { EncounterState } from '../../../src/combat/encounter';
import type { DmView, PlayerView } from '../../../src/combat/visibility';

type AssertTrue<Value extends true> = Value;
type IsAbsent<Shape, Field extends PropertyKey> = Field extends keyof Shape ? false : true;
type IsNotAssignable<Source, Target> = Source extends Target ? false : true;
type PlayerCombatant = PlayerView['combatants'][number];
type PlayerEvent = PlayerView['recentEvents'][number];

const fogIsAbsent: AssertTrue<IsAbsent<PlayerView, 'foggedCells'>> = true;
const notesAreAbsent: AssertTrue<IsAbsent<PlayerView, 'dmNotes'>> = true;
const effectsAreAbsent: AssertTrue<IsAbsent<PlayerView, 'effects'>> = true;
const rulesAreAbsent: AssertTrue<IsAbsent<PlayerCombatant, 'rules'>> = true;
const deathSavesAreAbsent: AssertTrue<IsAbsent<PlayerCombatant, 'deathSaves'>> = true;
const hitPointsAreAbsentFromObservedCombatants: AssertTrue<IsAbsent<PlayerCombatant, 'hitPoints'>> = true;
type PlayerDeathSaveEvent = Extract<PlayerEvent, { readonly type: 'death_save_resolved' }>;
const hiddenDeathSaveRollIsAbsent: AssertTrue<IsAbsent<
  Extract<PlayerDeathSaveEvent, { readonly rollVisibility: 'dm_only' }>,
  'roll'
>> = true;
const visibleDeathSaveRollIsNumber: AssertTrue<
  Extract<PlayerDeathSaveEvent, { readonly rollVisibility: 'player_visible' }>['roll'] extends number
    ? true
    : false
> = true;
const playerViewIsNotCanonicalState: AssertTrue<IsNotAssignable<PlayerView, EncounterState>> = true;
const canonicalStateIsNotDmView: AssertTrue<IsNotAssignable<EncounterState, DmView>> = true;

describe('D359 compile-time view boundary', () => {
  it('pins conditional-type assertions that fail tsc if hidden fields become reachable', () => {
    expect([
      fogIsAbsent,
      notesAreAbsent,
      effectsAreAbsent,
      rulesAreAbsent,
      deathSavesAreAbsent,
      hitPointsAreAbsentFromObservedCombatants,
      hiddenDeathSaveRollIsAbsent,
      visibleDeathSaveRollIsNumber,
      playerViewIsNotCanonicalState,
      canonicalStateIsNotDmView,
    ]).toEqual([true, true, true, true, true, true, true, true, true, true]);
  });
});
