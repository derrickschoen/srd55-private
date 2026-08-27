/**
 * Negative compile probes for D391.2 Waves 2 and 3. Every exported statement
 * is deliberately invalid and must produce exactly one TypeScript diagnostic.
 */
import { exactOrder, exactValues } from '../../src/domain/exact-table';
import type {
  PartyPackRule,
  PartyPackValidationIssue,
} from '../../src/vtt/party-pack';
import type {
  VaneWarrenTpkEnemyRosterId,
} from '../../src/vtt/vane-warren';
import type { GridCell } from '../../src/combat/grid';

// Report IDs 1831, 2000, 2357, and 2692: erased validator bodies return void.
export const erasedAttackRule: PartyPackRule<unknown> = (_value): readonly PartyPackValidationIssue[] => {};
export const erasedWorldOperationRule: PartyPackRule<unknown> = (_value): readonly PartyPackValidationIssue[] => {};
export const erasedFeatureEffectRule: PartyPackRule<unknown> = (_value): readonly PartyPackValidationIssue[] => {};
export const erasedMemberRule: PartyPackRule<unknown> = (_value): readonly PartyPackValidationIssue[] => {};

// Report IDs 1949, 1963, and 1976: an emptied closed schema vocabulary.
export const emptyWorldObjectKinds = exactValues<'barrier' | 'cover'>()();
export const emptyRemovalReasons = exactValues<'destroyed' | 'dismissed'>()();
export const emptyRollModes = exactValues<'normal' | 'advantage' | 'disadvantage'>()();

// Report ID 7136 and the exact-table/order gate cases.
export const emptyEnemyPositionTable: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>> = {};
export const missingEnemyPosition: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>> = {
  ashmaw: { column: 0, row: 0 },
};
const completeEnemyPositions = {
  ashmaw: { column: 0, row: 0 },
  'cinder-guard-b': { column: 0, row: 0 },
  'cinder-wave-1-a': { column: 0, row: 0 },
  'cinder-wave-2-a': { column: 0, row: 0 },
  'doomed-crocodile': { column: 0, row: 0 },
  'doomed-crocodile-second': { column: 0, row: 0 },
  'doomed-crocodile-third': { column: 0, row: 0 },
  'doomed-crocodile-fourth': { column: 0, row: 0 },
  'doomed-crocodile-fifth': { column: 0, row: 0 },
  'doomed-crocodile-sixth': { column: 0, row: 0 },
} as const satisfies Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>>;
export const extraEnemyPosition: Readonly<Record<VaneWarrenTpkEnemyRosterId, GridCell>> = { ...completeEnemyPositions, invented: { column: 0, row: 0 } };

const orderedTable = { first: 1, second: 2 } as const;
export const duplicateOrder = exactOrder(orderedTable, ['first', 'first'] as const);
export const incompleteOrder = exactOrder(orderedTable, ['first'] as const);
