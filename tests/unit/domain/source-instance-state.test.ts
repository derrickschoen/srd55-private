import { describe, expect, it } from 'vitest';
import {
  skillGrantStates,
  slotStates,
  sourceInstanceStates,
  spellbookAcquisitionStates,
  type SourceInstanceState,
} from '../../../src/domain/enums';

/**
 * THE PIN FOR `character_source_instances.state`.
 *
 * The column carried the schema's longest "no CHECK here" comment because its
 * vocabulary had no owner: `'tombstoned'` is not a member of `slotStates`, so
 * the obvious constraint would have broken class removal on its first write,
 * and a CHECK transcribed from a grep of the writers would have been a second,
 * unowned copy. D13 fixed the order — declare the enum, type the column, then
 * constrain — and `sourceInstanceStates` is that declaration.
 *
 * These are membership and DISJOINTNESS assertions, not a re-run of the CHECK.
 * What the constraint does is proved behaviourally against a real database in
 * `tests/unit/schema-check-constraints.test.ts`; what is pinned here is the set
 * itself, and specifically that it has not been quietly merged with one of the
 * three other `state` vocabularies it shares a word with.
 */
describe('sourceInstanceStates', () => {
  it('is exactly the two members the taken-source lifecycle has', () => {
    expect(sourceInstanceStates).toEqual(['active', 'tombstoned']);
  });

  it('is not slotStates, and the difference runs in both directions', () => {
    // Merging the two would let a source be stored `discarded` or
    // `kept_override` — states no reader of this table counts, which is the
    // silent-disable failure the slot CHECK's own comment warns about.
    expect(
      slotStates.filter((state) =>
        !(sourceInstanceStates as readonly string[]).includes(state),
      ),
    ).toEqual(['orphaned', 'discarded', 'kept_override']);
    // And constraining this column to `slotStates` — the constraint that looked
    // obvious for a year — would have refused the value class removal writes.
    expect(
      sourceInstanceStates.filter((state) =>
        !(slotStates as readonly string[]).includes(state),
      ),
    ).toEqual(['tombstoned']);
  });

  it('owns `tombstoned` alone among every state vocabulary', () => {
    const neighbours: readonly (readonly string[])[] = [
      slotStates,
      skillGrantStates,
      spellbookAcquisitionStates,
    ];
    for (const vocabulary of neighbours) {
      expect(vocabulary).not.toContain('tombstoned');
    }
    // The one member they all share, which is why sharing a name proves nothing.
    for (const vocabulary of neighbours) {
      expect(vocabulary).toContain('active');
    }
  });

  it('narrows an assignment at compile time', () => {
    // The lane's value in one line, and it bit while this test was being
    // written: a `SourceInstanceState` compared against a literal it cannot be
    // is now `TS2367`, not a silently-false comparison. So the check has to go
    // through a widened value — which is exactly the shape a decoded row has.
    const decoded: string = 'tombstoned';
    const state = decoded as SourceInstanceState;
    expect((sourceInstanceStates as readonly string[]).includes(state))
      .toBe(true);
    // @ts-expect-error a state outside the vocabulary is not assignable
    const typo: SourceInstanceState = 'tombstoend';
    expect(typo).toBe('tombstoend');
  });
});
