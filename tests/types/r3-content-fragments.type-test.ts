import type {
  BackgroundContentAggregate,
  SpeciesContentAggregate,
  SubclassContentAggregate,
} from '../../src/authoring/contracts';
import type {
  HasContentKey,
  HasEdition,
  HasName,
  HasProvenance,
} from '../../src/catalog/content-contract-fragments';
import type {
  ClassContentAggregateV1,
  FeatContentAggregateV1,
} from '../../src/catalog/source-content-projector-v1';
import type { FeatDefinitionForApplication } from '../../src/builder/level-up-wizard';
import type { SrdFeatDefinition } from '../../src/rules/feats-srd';

type Assert<T extends true> = T;
type Exact<Left, Right> =
  (<T>() => T extends Left ? 1 : 2) extends
  (<T>() => T extends Right ? 1 : 2)
    ? true
    : false;
type OmitsContentKey<T> = 'content_key' extends keyof T ? false : true;

type _HasNameIsOneField = Assert<Exact<keyof HasName, 'name'>>;
type _HasEditionIsOneField = Assert<Exact<keyof HasEdition, 'rules_edition'>>;
type _HasProvenanceIsOneField = Assert<
  Exact<keyof HasProvenance, 'catalog_layer'>
>;
type _HasContentKeyIsOneField = Assert<
  Exact<keyof HasContentKey, 'content_key'>
>;

type _SpeciesIdentityRemainsExternal = Assert<
  OmitsContentKey<SpeciesContentAggregate>
>;
type _BackgroundIdentityRemainsExternal = Assert<
  OmitsContentKey<BackgroundContentAggregate>
>;
type _SubclassIdentityRemainsExternal = Assert<
  OmitsContentKey<SubclassContentAggregate>
>;
type _ClassProjectionIdentityRemainsExternal = Assert<
  OmitsContentKey<ClassContentAggregateV1>
>;
type _FeatProjectionIdentityRemainsExternal = Assert<
  OmitsContentKey<FeatContentAggregateV1>
>;

type _ClassProjectionComposesSharedFields = Assert<
  ClassContentAggregateV1 extends HasName & HasEdition ? true : false
>;
type _FeatProjectionComposesSharedFields = Assert<
  FeatContentAggregateV1 extends HasName & HasEdition ? true : false
>;
type _ApplicationFeatOptsIntoIdentity = Assert<
  FeatDefinitionForApplication extends HasContentKey & HasName & HasProvenance
    ? true
    : false
>;
type _SrdFeatOptsIntoIdentity = Assert<
  SrdFeatDefinition extends HasContentKey & HasName & HasProvenance
    ? true
    : false
>;
