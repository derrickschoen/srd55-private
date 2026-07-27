/**
 * Codecs the tests read through, when they read through one at all.
 *
 * MOST TESTS SHOULD NOT USE THIS FILE. A test asserting on what is in storage
 * belongs on `db.allRaw` / `db.oneRaw`: reading a row back through the same
 * decoder the production path uses would make the assertion agree with the
 * decoder rather than with the database, which is the one thing a storage
 * assertion exists to rule out. The named raw path is the honest answer there.
 *
 * These exist for the other case — a test that needs a VALUE (an id to pass
 * along, a name to compare to a string) rather than a row to assert on. They
 * replace type parameters like `db.all<{ id: number }>(…)`, which asserted a
 * column's type without checking a single one, and were then re-coerced with
 * `Number(row.id)` at the point of use anyway.
 */
import {
  sqlInteger,
  sqlString,
  type RowCodec,
} from '../../src/db/codecs';

export interface SlotIdentity {
  readonly id: number;
  readonly slot_key: string;
}

export const slotIdentity: RowCodec<SlotIdentity> = (row) => ({
  id: sqlInteger(row, 'id'),
  slot_key: sqlString(row, 'slot_key'),
});
