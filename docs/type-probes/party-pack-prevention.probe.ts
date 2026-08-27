/**
 * Negative compile probes for D391.2 prevention waves. Every exported statement
 * is deliberately invalid and must produce exactly one TypeScript diagnostic.
 */
import { exactOrder, exactValues } from '../../src/domain/exact-table';
import type {
  ExternalAlwaysOnArmorClassResourceState,
  ExternalAttackId,
  ExternalEffectId,
  ExternalExtraAttackResourceState,
  ExternalHalfSavePayload,
  ExternalPartyPackAttackMastery,
  ExternalPersistentAreaEffectSpec,
  ExternalPersistentAreaPlacement,
  LoadedPartyMember,
  PartyPackRule,
  PartyPackValidationIssue,
} from '../../src/vtt/party-pack';
import { loadedPartySpellCastCommand } from '../../src/vtt/party-pack';
import type { SpellManifestId } from '../../src/combat/spells/manifest';
import type { CombatFeatureEffect } from '../../src/combat/effects';
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

// Wave 4, report IDs 1833 and 1847: mastery and its save DC are one typestate.
export const missingToppleSaveDc: ExternalPartyPackAttackMastery = { masteryProperty: 'Topple' };
export const saveDcWithoutTopple: ExternalPartyPackAttackMastery = { masteryProperty: 'Slow', masterySaveDc: 14 };

// Wave 4, report IDs 2433 and 2566: resource eligibility is kind/trigger-shaped.
export const extraAttackWithResource: ExternalExtraAttackResourceState = { kind: 'extra_attack_count_override', resourcePoolId: 'resource:illegal' };
export const alwaysOnArmorWithResource: ExternalAlwaysOnArmorClassResourceState = { kind: 'armor_class_modifier', trigger: 'always_on', resourcePoolId: 'resource:illegal' };

// Wave 4, report IDs 2603, 2616, and 2634: area placement and save payloads.
export const movingSelfArea: ExternalPersistentAreaPlacement = { origin: 'self', movableFeet: 30 };
export const automaticSaveEnds: ExternalPersistentAreaEffectSpec = { kind: 'automatic', payload: { kind: 'condition', conditionId: 'Prone', lifetime: { kind: 'save_ends', boundary: 'end' } } };
export const halfOnConditionSave: ExternalHalfSavePayload = { kind: 'condition', conditionId: 'Prone', lifetime: { kind: 'while_inside' } };

// Wave 4, report ID 3110: an armed save-gated rider cannot erase its follow-up.
export const erasedArmedFollowUp: Required<Pick<
  Extract<CombatFeatureEffect['payload'], { readonly kind: 'damage_rider' }>,
  'followUp'
>> = {};

// Wave 5, report IDs 4010, 4156, 4283, and 4394: closed spell calls reject "".
declare const loadedMember: LoadedPartyMember;
declare const castDetails: Parameters<typeof loadedPartySpellCastCommand>[2];
export const erasedRevivifyCall = loadedPartySpellCastCommand(loadedMember, '', castDetails);
export const erasedBlessCall = loadedPartySpellCastCommand(loadedMember, '', castDetails);
export const erasedSlowCall = loadedPartySpellCastCommand(loadedMember, '', castDetails);
export const erasedSpiritGuardiansCall = loadedPartySpellCastCommand(loadedMember, '', castDetails);

// Wave 5 cross-domain identity and unknown closed-literal gates.
declare const attackId: ExternalAttackId;
declare const effectId: ExternalEffectId;
export const crossDomainPartyIdComparison = attackId === effectId;
export const unknownManifestSpell: SpellManifestId = 'chronomancy-burst';
