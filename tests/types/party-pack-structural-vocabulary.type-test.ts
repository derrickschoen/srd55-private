import type {
  ExternalAttackId,
  ExternalEffectId,
  ExternalPartyPack,
  PartyPackExactFieldRecord,
  PartyPackExactFields,
  PartyPackPath,
} from '../../src/vtt/party-pack';

type Assert<T extends true> = T;
type Exact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  (<Value>() => Value extends Right ? 1 : 2)
    ? (<Value>() => Value extends Right ? 1 : 2) extends
      (<Value>() => Value extends Left ? 1 : 2)
      ? true
      : false
    : false;

type MissingTopLevelField = {
  readonly schemaVersion: true;
  readonly partyId: true;
  readonly allowPartial: true;
};
type ExtraTopLevelField = PartyPackExactFields<ExternalPartyPack> & {
  readonly memberz: true;
};

type _EmptyPathSegmentIsRejected = Assert<
  readonly [''] extends PartyPackPath ? false : true
>;
type _MisspelledPathSegmentIsRejected = Assert<
  readonly ['members', number, 'attackz'] extends PartyPackPath ? false : true
>;
type _AttackAndEffectIdsAreNotInterchangeable = Assert<
  ExternalAttackId extends ExternalEffectId ? false : true
>;
type _MissingExactKeyIsRejected = Assert<
  PartyPackExactFieldRecord<ExternalPartyPack, MissingTopLevelField> extends never
    ? true
    : false
>;
type _ExtraExactKeyIsRejected = Assert<
  PartyPackExactFieldRecord<ExternalPartyPack, ExtraTopLevelField> extends never
    ? true
    : false
>;
type _TopLevelWireKeysStayExact = Assert<
  Exact<
    keyof PartyPackExactFields<ExternalPartyPack>,
    'schemaVersion' | 'partyId' | 'allowPartial' | 'members'
  >
>;

export type PartyPackStructuralVocabularyProof = [
  _EmptyPathSegmentIsRejected,
  _MisspelledPathSegmentIsRejected,
  _AttackAndEffectIdsAreNotInterchangeable,
  _MissingExactKeyIsRejected,
  _ExtraExactKeyIsRejected,
  _TopLevelWireKeysStayExact,
];
