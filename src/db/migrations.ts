import type { Database } from '@sqlite.org/sqlite-wasm';
import baseline from '../../drizzle/0000_skinny_lionheart.sql?raw';
import baselineTriggers from '../../drizzle/0000_skinny_lionheart.triggers.sql?raw';
import weaponRangeAdd from '../../drizzle/0001_weapon_range_add.sql?raw';
import weaponRangeDrop from '../../drizzle/0002_weapon_range_drop.sql?raw';
import spellFork from '../../drizzle/0003_spell_fork.sql?raw';
import retireCoin from '../../drizzle/0004_retire_coin.sql?raw';
import classEquipment from '../../drizzle/0005_class_equipment.sql?raw';
import weaponAttackKind from '../../drizzle/0006_weapon_attack_kind.sql?raw';
import featModel from '../../drizzle/0007_feat_model.sql?raw';
import abilityAllocationMethod from '../../drizzle/0008_ability_allocation_method.sql?raw';
import abilityIncrease from '../../drizzle/0009_ability_increase.sql?raw';
import characterSkillGrants from '../../drizzle/0010_character_skill_grants.sql?raw';
import equipmentProvenance from '../../drizzle/0011_equipment_provenance.sql?raw';
import removeEquipmentProvenance from '../../drizzle/0012_remove_equipment_provenance.sql?raw';
import armorClassItemsAndEffects from '../../drizzle/0013_armor_class_items_and_effects.sql?raw';
import featureEffectProduction from '../../drizzle/0014_feature_effect_production.sql?raw';
import effectEquipmentOwnership from '../../drizzle/0015_effect_equipment_ownership.sql?raw';
import retireArmorClassAdjustment from '../../drizzle/0016_retire_armor_class_adjustment.sql?raw';
import attunementSlots from '../../drizzle/0017_attunement_slots.sql?raw';
import characterItemsQuantity from '../../drizzle/0018_character_items_quantity.sql?raw';
import abilityOverride from '../../drizzle/0019_ability_override.sql?raw';
import contentIdentityRegistry from '../../drizzle/0020_content_identity_registry.sql?raw';
import catalogDataMigrations from '../../drizzle/0021_catalog_data_migrations.sql?raw';
import plannedSpellGrants from '../../drizzle/0022_planned_spell_grants.sql?raw';
import skillExpertiseGrants from '../../drizzle/0023_skill_expertise_grants.sql?raw';
import featApplicationModel from '../../drizzle/0024_feat_application_model.sql?raw';
import characterLevelFeatChoices from '../../drizzle/0025_character_level_feat_choices.sql?raw';
import classResources from '../../drizzle/0026_class_resources.sql?raw';
import characterFlavor from '../../drizzle/0027_character_flavor.sql?raw';
import authorableEffectStorage from '../../drizzle/0028_authorable_effect_storage.sql?raw';
import partyDocumentStates from '../../drizzle/0029_party_document_states.sql?raw';
import subclassReferenceText from '../../drizzle/0030_subclass_reference_text.sql?raw';
import itemDefinitions from '../../drizzle/0031_item_definitions.sql?raw';
import characterArchive from '../../drizzle/0032_character_archive.sql?raw';
import assertedContentKeys from '../../drizzle/0033_asserted_content_keys.sql?raw';
import removeLegacyOpaque from '../../drizzle/0034_remove_legacy_opaque.sql?raw';
import catalogContentDrafts from '../../drizzle/0035_catalog_content_drafts.sql?raw';
import catalogContentArchive from '../../drizzle/0036_catalog_content_archive.sql?raw';
import backgroundDefaultOriginFeatKey from '../../drizzle/0037_background_default_origin_feat_key.sql?raw';
import catalogContentSupersessions from '../../drizzle/0038_catalog_content_supersessions.sql?raw';
import catalogContentSupersessionGuards from '../../drizzle/0039_catalog_content_supersession_guards.sql?raw';
import catalogContentArchiveMembers from '../../drizzle/0040_catalog_content_archive_members.sql?raw';
import contentV2 from '../../drizzle/0041_content_v2.sql?raw';
import { sha256 } from '../crypto/sha256';

export interface DatabaseMigration {
  /** Stable product identity. Once shipped, this value and its SQL never move. */
  readonly id: string;
  readonly sql: string;
  /** SHA-256 of `sql`, checked synchronously before any image is touched. */
  readonly checksum: string;
  /** SHA-256 of the exact sqlite_schema signature after this chain prefix. */
  readonly resultSchemaChecksum: string;
  /** Exceptional replay handling; absent migrations retain normal execution. */
  readonly replayPolicy?: 'skip_when_result_schema_matches';
}

const baselineSql = [
  baseline.trim(),
  baselineTriggers.trim(),
  '-- migration-bundle-control:0000',
].join('\n\n') + '\n';

/**
 * Append-only product data.
 *
 * A shipped entry is immutable. Schema work adds a generated SQL file and a
 * new entry; it never edits or regenerates an existing migration. The result
 * checksum makes every chain prefix a known source schema for later upgrades.
 */
export const DATABASE_MIGRATIONS: readonly DatabaseMigration[] = Object.freeze([
  Object.freeze({
    id: '0000_skinny_lionheart',
    sql: baselineSql,
    checksum:
      'cfd5b76e09514b890f20990df5cf743c32aeb3a1d41b80cea2370900eed74cfb',
    resultSchemaChecksum:
      'fa9627e3cdef381b97d24aee249867ebee9866941e3fd65e9b739111989da1d9',
  }),
  Object.freeze({
    id: '0001_weapon_range_add',
    sql: weaponRangeAdd,
    checksum:
      'e34aeb2658f3ab88e4cfeb94bfbbeae98530d7e56d1a83e544e7cc4f55679d52',
    resultSchemaChecksum:
      'ef0b8e30f0bade51d3c2784bae9e4b4cebe328ab369cdb584a2bf22e252a228c',
  }),
  Object.freeze({
    id: '0002_weapon_range_drop',
    sql: weaponRangeDrop,
    checksum:
      '9053cce25b59ffc2c22f3f2cd441236219bdfb57c4c3ab195545f39a3bfa0bdf',
    resultSchemaChecksum:
      '6f3b23a58a73cd5daff97044aa31be963b429ac9ed9afe5ec60445f6a12910a0',
  }),
  Object.freeze({
    id: '0003_spell_fork',
    sql: spellFork,
    checksum:
      'f71c10580a314e09791b4cacbbef02b421fc6baa7e95106f8c536fb9f935612e',
    resultSchemaChecksum:
      '098203a2476b0c7f4d646e78a9f0f65da85cfe84eab547f5b8915cca4cfbfcbc',
  }),
  Object.freeze({
    id: '0004_retire_coin',
    sql: retireCoin,
    checksum:
      '9ab23a9810078e3aff5808b145aa3f1df6fce6af933506f487e248d1df0acaab',
    resultSchemaChecksum:
      '801bac9e738d40392178b88f67291230ce51aa1c60c2fdbb9aae4bd95cc1e64d',
  }),
  Object.freeze({
    id: '0005_class_equipment',
    sql: classEquipment,
    checksum:
      '42fef4ecdb27704ba956b7a2dd95b591f84c6670eba212df4547a6a981f58123',
    resultSchemaChecksum:
      'c38a9355b00ddb5adf961e7c40120720bb0d601daadd32ad835444199b99e6fb',
  }),
  Object.freeze({
    id: '0006_weapon_attack_kind',
    sql: weaponAttackKind,
    checksum:
      '0343dc5213461e0186d51b32ebd6f90047a3650e1b1bccb40d181c41a6769991',
    resultSchemaChecksum:
      'c3d1920ddf61b5ecb64563ae0e04dea577d1ab7bf83d17bdcfce24c04a1bb5d7',
  }),
  Object.freeze({
    id: '0007_feat_model',
    sql: featModel,
    checksum:
      '2b6a218077a4efe287234d30b0da1873c29c0ec8523efed283f40efa29ed11ac',
    resultSchemaChecksum:
      'cc2945880764c4a5cba7ba4dd7d85f9f65cf3b7368e6c9d65d7f6ae7b02b489c',
  }),
  Object.freeze({
    id: '0008_ability_allocation_method',
    sql: abilityAllocationMethod,
    checksum:
      'dcc6e5de3a8f7ac44af39e27f53fc7942576ad8734a4c18916b95dfb2b201b27',
    resultSchemaChecksum:
      'd8c6d27baba26254e14f7316797bed69deb0a9e58377b1dfb744ffd7eea44331',
  }),
  Object.freeze({
    id: '0009_ability_increase',
    sql: abilityIncrease,
    checksum:
      '58ec411448ee05a15e25bb782157e905ea08d7bff9ebb996850f14468521309b',
    resultSchemaChecksum:
      '0ecf8c299a6a95d56f5c4824629dd3c2f814cdfcfc7ea64a2c8cdd4e0b3d3645',
  }),
  Object.freeze({
    id: '0010_character_skill_grants',
    sql: characterSkillGrants,
    checksum:
      'f4ddef795542f602699f3e247ea1fa519952238c66e43bbd84185155b44aed27',
    resultSchemaChecksum:
      'ba7cd3692fae389a569fcbec8afb3dc3058f212f129bebb61b4976f31b65c587',
  }),
  Object.freeze({
    id: '0011_equipment_provenance',
    sql: equipmentProvenance,
    checksum:
      'a30d5b0d7e81923dbe0734931e7c2d986babf408a6577567bbd8431264a78d47',
    resultSchemaChecksum:
      'eec2bb4a6d9d1381720152e805f6bca2a828379b6dd36780649aa1a5c0c459fa',
  }),
  // D69: the owner struck equipment provenance four hours after 0011 minted
  // it. The chain is append-only — 0011 is never edited — so this migration
  // recreates both tables WITHOUT `source_instance_id`, discarding the stamp
  // values (pre-alpha, zero users; the rows themselves all survive).
  Object.freeze({
    id: '0012_remove_equipment_provenance',
    sql: removeEquipmentProvenance,
    checksum:
      '42009457e8c61528cfb31c5746899378e75d7315ff9a1af74605f8abde42d8eb',
    // Identical to 0010's result checksum, and that identity is the proof
    // the removal is exact: 0012 restores the pre-0011 schema shape.
    resultSchemaChecksum:
      'ba7cd3692fae389a569fcbec8afb3dc3058f212f129bebb61b4976f31b65c587',
  }),
  // AC-1 (D72): the vocabulary and persistence for Armor Class formulas,
  // bonuses and weapon-scoped modifiers, plus the new `character_items`
  // table. Widens `character_effects` with five new kinds, five new payload
  // columns, and widened `amount`/`ability` kind-scoped CHECKs; creates
  // `character_items` fresh. `docs/design/2026-07-29-armor-class-items-and-effects.md`.
  Object.freeze({
    id: '0013_armor_class_items_and_effects',
    sql: armorClassItemsAndEffects,
    checksum:
      '22cfd200c40d46ffbf698f7a3da92bca49f087bdbfdbee3e21bc07405aa4bf52',
    resultSchemaChecksum:
      'b8b13b323d1eb176c490b688413f2eacb2e8e19c96c4933a6a159165e9dcdfa1',
  }),
  Object.freeze({
    id: '0014_feature_effect_production',
    sql: featureEffectProduction,
    checksum:
      'babf5dd042c78f8865a3cdd9a2b725db75472fe785fa6af9c05a9f0efb667a67',
    resultSchemaChecksum:
      '4fc9e0f01553d7161dd81799466276d2068357598a9fde0a07d69491ed0bd600',
  }),
  Object.freeze({
    id: '0015_effect_equipment_ownership',
    sql: effectEquipmentOwnership,
    checksum:
      'a3471329fd7f62a9637e738437ab977ee1664bea1783784295ac17cb42cd4d3e',
    resultSchemaChecksum:
      '2533e8099b522103359dad23da321304cf3a3dac3b797b8607e29820b39e03eb',
  }),
  // AC-4 (D72): the manual Armor Class escape hatch is now the same
  // `armor_class_bonus` effect every other flat modifier uses. Zero rows
  // produce no effect; the historical table remains as an empty shell so old
  // snapshot table sets stay readable without a cosmetic version mint.
  Object.freeze({
    id: '0016_retire_armor_class_adjustment',
    sql: retireArmorClassAdjustment,
    checksum:
      '872df9e1828d1f36fa69aa491430a3f931be00606cc07ee4393bbbfd98d7731d',
    resultSchemaChecksum:
      '00b25ef999c033d70738ccc1d6e6e354735be9a8801acbef20dc3beeb7247c1d',
  }),
  // D92: invert the unbounded `character_items.attuned` boolean into the
  // owner's exact three-column character-side slot row. Historical true rows
  // fill slots by item id; only the first three survive by explicit ruling.
  Object.freeze({
    id: '0017_attunement_slots',
    sql: attunementSlots,
    checksum:
      'c117e918be830185018ca14deb7b5587e65fd881c200a73e4f32333e44632514',
    resultSchemaChecksum:
      '7e9e69b3b95cffc9013db1b309fae0d033e8bdac806bce781232e0823560bb70',
  }),
  // D86: one item row can now represent multiple identical possessions.
  // Rebuild the table so the positive-integer CHECK is part of the final DDL;
  // historical rows copy with the only quantity they could have meant: one.
  Object.freeze({
    id: '0018_character_items_quantity',
    sql: characterItemsQuantity,
    checksum:
      '420715637dfc3dc8d567fb62c742b33efef3771a2da4c2e2e6c559bbbd8fafd3',
    resultSchemaChecksum:
      'b1638cdde8aa3e968354dcbf29c637f4dd45c0a5179e768e2480c54a1ee7d8f5',
  }),
  // D83: SET-to-score is a character-only effect kind. SQLite cannot alter a
  // CHECK in place, so rebuild character_effects with its kind and shared
  // ability/maximum payload arms widened; every existing row copies exactly.
  Object.freeze({
    id: '0019_ability_override',
    sql: abilityOverride,
    checksum:
      '373193882ed11de782d6a44c480c7b33a5204bcc2d1cd5076201f532f09a029c',
    resultSchemaChecksum:
      '7279592c33987032e30b1421781fe3e7cfe06bba3c5af01077794ecef3e5c05f',
  }),
  // CI-2a (D81/D82/D84): recipient-local identity, fingerprint, alias and
  // reviewed-match registries. Existing roots are registered without semantic
  // projection before their content-key foreign keys are added; semantic
  // rekeying remains the separate CI-4b data migration.
  Object.freeze({
    id: '0020_content_identity_registry',
    sql: contentIdentityRegistry,
    checksum:
      '5b4e5759d14c31cb1c8dfe904222fd07a6a2d56047119079e5047e54f7732492',
    resultSchemaChecksum:
      'c9c571816a0fd85bd6ca5ee26f7b03bc898421e273f93992bc5005eb3ea9e942',
  }),
  // CI-2b: applied markers for append-only TypeScript catalog data migrations.
  // No semantic entry is registered yet; CI-4b adds the first only after every
  // content-v1 aggregate projector it calls exists.
  Object.freeze({
    id: '0021_catalog_data_migrations',
    sql: catalogDataMigrations,
    checksum:
      '3f03fa0949716dc57ca4ee15ae360bbbefaf23837b78a736f0efc4129eff845b',
    resultSchemaChecksum:
      '293e75126e52dfae213ddd10b040d44c2ce60b24951f8f4d4ac6ad85f6ab0f17',
  }),
  // GF-1: generated spell choices now share one logical grant plan. Wizard
  // spellbook acquisitions become nullable/addressable rows; legacy config
  // selections are moved without dropping a selected spell.
  Object.freeze({
    id: '0022_planned_spell_grants',
    sql: plannedSpellGrants,
    checksum:
      'dc47c171ff21160be9dc07e80eedf3b62a0edbc6d12aa36bdb27b4ecc8fc4839',
    resultSchemaChecksum:
      '9726366cbd3e34d6378f17c95d9137c45d2cd897e2982c79237f32c363a4ac5d',
  }),
  Object.freeze({
    id: '0023_skill_expertise_grants',
    sql: skillExpertiseGrants,
    checksum:
      '252d36eaca2040d739010fcab191fc7dc2c9b5f91cad92c33104eb8eacd3bed4',
    resultSchemaChecksum:
      '077eb42c0459e9766ae01119de7baad086c8670364e4e6ed7092bda0e15023b5',
  }),
  // LU-0: the recipient-seeded feat catalog gains all four source groupings,
  // typed ability options/caps and the data needed by the pure eligibility and
  // application planner. No character-owned or portable row changes.
  Object.freeze({
    id: '0024_feat_application_model',
    sql: featApplicationModel,
    checksum:
      'c461e1ade4138f8367ecb44cc070afdb9649a8094f6075639d73336abe53e97a',
    resultSchemaChecksum:
      'b42c12a14a2ea84a04719df186d1c54d7b503af9da0e0a11a2993749fa6d37fb',
  }),
  // LU-1: one durable class-level feat occurrence points at its granting class
  // row and, when resolved, the same-character feat source that owns effects
  // and grants. A null pointer is the D70 Epic Boon defer state.
  Object.freeze({
    id: '0025_character_level_feat_choices',
    sql: characterLevelFeatChoices,
    checksum:
      '4321a4d797d147328b1b91d42422ff94082418d13ddc4bcde33401c0f56b6352',
    resultSchemaChecksum:
      'd6302b837b792ed57d222bce6fb20eee1eab945d38a5689ae25a4a88fc48d026',
  }),
  // D91/D120: sourced exact-level resource maxima and the closed formula
  // catalog. Both are recipient-seeded class content, never character state.
  Object.freeze({
    id: '0026_class_resources',
    sql: classResources,
    checksum:
      'c34ec3c9475ce1d23e0b567164c2748a2c736d5fe62279e5073fc9ee13b818c0',
    resultSchemaChecksum:
      'b3996db678f8633730fc0c399c42b5073098fbd2f978caa054c9523c3c5e10d3',
  }),
  // D104: nullable, bounded character flavor text. Existing notes remain
  // unconstrained so every previously accepted note survives the rebuild.
  Object.freeze({
    id: '0027_character_flavor',
    sql: characterFlavor,
    checksum:
      '0c482287be0043139053c06ae9110d5d8ac8ccf113310b839fe1709adbb633e3',
    resultSchemaChecksum:
      '491aacb86b33ac48e3d3ca3a7da3481d2e8c4915b4c47d500c8afe9e113902fd',
  }),
  Object.freeze({
    id: '0028_authorable_effect_storage',
    sql: authorableEffectStorage,
    checksum:
      'f0979386f21726c89b244a6f0f2109cb6b324bc919bb531315ccff035a389cf4',
    resultSchemaChecksum:
      'aa1e9392364a86074aadeeb1f6796157c36da5b33e9b401297b5ec7765c6f150',
  }),
  // P3: recipient-local publication and repository observations. This table
  // travels in whole database images but in no character backup/share/snapshot.
  Object.freeze({
    id: '0029_party_document_states',
    sql: partyDocumentStates,
    checksum:
      '9969618cf3080d59e6505f15f2f7521ddbea78afb8f82be2a95aa4686cc6e402',
    resultSchemaChecksum:
      'fa60eb43058604c6d865c6f1380e33820c4abaec19d1c732254ed1b1a7c08c9b',
  }),
  Object.freeze({
    id: '0030_subclass_reference_text',
    sql: subclassReferenceText,
    checksum: '52fb1c6787257624b0f8dfc0c2c542b6d65e6d3cf823594c53c03e69c24316aa',
    resultSchemaChecksum:
      'c94ad9c2acdefb444f48e21599fd9f74e3979e403eab786499acbb88bbd89744',
  }),
  Object.freeze({
    id: '0031_item_definitions',
    sql: itemDefinitions,
    checksum:
      '7d70a70dd06e6c2ff3d3c2ac47135b1e897b8b4023c535d42c64ca666ce7b25b',
    resultSchemaChecksum:
      '87728d3017863e34c7570cab7ffa59f8adb2a13e2ba71016c359840c5c73ce2c',
  }),
  // D99: lifecycle is nullable root state, intentionally separate from the
  // undo/save-point projection. Existing roots become active by NULL default.
  Object.freeze({
    id: '0032_character_archive',
    sql: characterArchive,
    checksum:
      '4da268e1ddf1ecacf4cbe50cd090f505dcc34e27e218e8f86992772e8ac37ab0',
    resultSchemaChecksum:
      'b3108351ca445275711c3e208ca6b45166d22a1bd63733a0fa82459f5b41cc91',
  }),
  // D203 / CI-4a: externally asserted portable slug keys receive their own
  // authority class. Existing rows copy byte-for-byte; no CI-4b rekey/backfill
  // occurs. Every fresh root, including spells, must be registered before
  // insertion; no branch is permitted to mint legacy-opaque.
  Object.freeze({
    id: '0033_asserted_content_keys',
    sql: assertedContentKeys,
    checksum:
      '60d15e1ef963e1765f8451cfea25ffd5eed6a0302e7d0fb55bfb294d58f8750b',
    resultSchemaChecksum:
      '88c4c7c8e7498cc7c8e61e400bb356d68e5d493d13e124bbb2975a025a2a4f6d',
  }),
  // D205 / CI-4b: zero-user wipe. Semantic source/history references and
  // recursively owned children are discarded, aggregate details and roots
  // follow, and the empty legacy-opaque authority class leaves the vocabulary.
  Object.freeze({
    id: '0034_remove_legacy_opaque',
    sql: removeLegacyOpaque,
    checksum:
      'f1aaa672d4093fd3eb1e682a15d2b97bf7e28f1838505d4b0a0aea22f6047c7b',
    resultSchemaChecksum:
      '7dda133c3b753483136c86ed8d1163c0bbea6827bf63ad8787ef1cfae8c9212d',
  }),
  // HA-2 / D133 / D139: incomplete local drafts for exactly species,
  // subclass, and background. They may point at a published aggregate for
  // copy/edit context but are excluded from every portable document surface.
  Object.freeze({
    id: '0035_catalog_content_drafts',
    sql: catalogContentDrafts,
    checksum:
      '715574aa7a098a75b7ecb9af8ed0071badd819e6b8007d3b37222e5fb51ba37b',
    resultSchemaChecksum:
      'c95472fb49c52699354169753554973c2edfe7f79a3cd6e440f9de6e16c53293',
  }),
  // D138 / CI-5: published creations have the same archive-state primitive as
  // characters. The later cascade service owns set membership and lifecycle;
  // this column makes the creation half durable in complete database images.
  Object.freeze({
    id: '0036_catalog_content_archive',
    sql: catalogContentArchive,
    checksum:
      '1df1bd509d44f3647dfbfd9ff3a5b9e8040476d21bd0a942f402bc00e6ec1267',
    resultSchemaChecksum:
      'cbf37d18775ad5e489c7adb90df5aa24c04d4194569750de2de86b66844ae066',
  }),
  // HA-4 N1: a printed feat name is display text, not identity. Legacy rows
  // backfill only on an unambiguous edition/name match; current writers store
  // the exact installed Origin feat key.
  Object.freeze({
    id: '0037_background_default_origin_feat_key',
    sql: backgroundDefaultOriginFeatKey,
    checksum:
      '8cc9c87ed1dc24c88e21bda3b55feff4d577977e0ffd9dc90d5957525c6de9b3',
    resultSchemaChecksum:
      'f98f35c6e38eed6755915863bae874c6df4aa50433743289c2e9bfdd23d3a86d',
    replayPolicy: 'skip_when_result_schema_matches',
  }),
  // CI-7: an immutable edit records recipient-local version lineage while
  // leaving both catalog aggregates and every character reference untouched.
  Object.freeze({
    id: '0038_catalog_content_supersessions',
    sql: catalogContentSupersessions,
    checksum:
      '1b52fb3e323c95d751bc3597d559c49af63eb17ae41fbda0d5866c510cde429c',
    resultSchemaChecksum:
      '98b62b5428ca4cfe04e9f9e9a8c9921e5751250a6a2af66ce9c907d3bfa6bb6d',
  }),
  // CI-7: version edges are permanent historical facts. Storage rejects
  // mutation or deletion of an existing edge and any same-kind cycle.
  Object.freeze({
    id: '0039_catalog_content_supersession_guards',
    sql: catalogContentSupersessionGuards,
    checksum:
      'd18e373f4792a7a12259cf9744d8bc9b29502d399626d111a16c6f72a233704d',
    resultSchemaChecksum:
      '406099a77335a08cf23f76d7425d7c6cf8c1a19d7e93c8532cb52497000640ca',
  }),
  // D214 / HA-11: set membership is captured at archive time. The absent
  // character FK is intentional so public character deletion leaves behind
  // the evidence required for an honest all-or-nothing restore refusal.
  Object.freeze({
    id: '0040_catalog_content_archive_members',
    sql: catalogContentArchiveMembers,
    checksum:
      'ad932395613511dba695db38a213d2dcf7269cb415353c40fae4c694c0007258',
    resultSchemaChecksum:
      '08178919ea2115feb15574dcf748226b88a44f99d409e95dcccb623904a05727',
  }),
  // U2-A / D231: admit the content-v2 identity scheme and make "current"
  // unique per content key across every scheme, matching scheme-less export.
  Object.freeze({
    id: '0041_content_v2',
    sql: contentV2,
    checksum:
      '660525ab7c4248d5448ed3bf14d3723b66f57a8dd45b7986f4280341f25bd204',
    resultSchemaChecksum:
      'b2a3e3ae292168f7c5766dde6db26668ea2e2336a0a62879d2b7811ac61a2b08',
  }),
]);

export function databaseSchemaChecksum(signature: string): string {
  return sha256(signature);
}

export function validateMigrationRegistry(
  migrations: readonly DatabaseMigration[],
): void {
  const ids = new Set<string>();
  for (const migration of migrations) {
    if (ids.has(migration.id)) {
      throw new Error(`Duplicate database migration id "${migration.id}".`);
    }
    ids.add(migration.id);

    const actual = sha256(migration.sql);
    if (actual !== migration.checksum) {
      throw new Error(
        `Database migration "${migration.id}" checksum mismatch: ` +
          `expected ${migration.checksum}, got ${actual}.`,
      );
    }
  }
}

export function appliedMigrationCount(
  schemaChecksum: string,
  migrations: readonly DatabaseMigration[],
): number | null {
  const index = migrations.findIndex(
    (migration) => migration.resultSchemaChecksum === schemaChecksum,
  );
  return index === -1 ? null : index + 1;
}

function foreignKeyFailure(db: Database): string | null {
  const violation = db.selectObject('PRAGMA foreign_key_check');
  if (violation === undefined) {
    return null;
  }
  return `table ${String(violation.table)}`;
}

/**
 * Applies one suffix as a single atomic unit.
 *
 * `foreign_keys=OFF` must precede `BEGIN`; SQLite silently ignores it inside a
 * transaction. The check and target-signature comparison deliberately happen
 * before COMMIT so either failure restores the exact source image.
 */
export function applyMigrationSuffix(
  db: Database,
  migrations: readonly DatabaseMigration[],
  appliedCount: number,
  expectedSignature: string,
  signatureOf: (database: Database) => string,
): void {
  const pending = migrations.slice(appliedCount);
  if (pending.length === 0) {
    return;
  }

  db.exec('PRAGMA foreign_keys = OFF');
  if (Number(db.selectValue('PRAGMA foreign_keys')) !== 0) {
    throw new Error(
      'Database migration could not disable foreign-key enforcement.',
    );
  }

  let transactionOpen = false;
  try {
    db.exec('BEGIN EXCLUSIVE');
    transactionOpen = true;
    try {
      for (const migration of pending) {
        // 0037 alone declares that an explicit replay against its own result,
        // or against the already-reached target schema of a later chain, is a
        // no-op. Every other migration retains normal suffix execution.
        if (
          migration.replayPolicy === 'skip_when_result_schema_matches' &&
          (
            databaseSchemaChecksum(signatureOf(db)) ===
              migration.resultSchemaChecksum ||
            signatureOf(db) === expectedSignature
          )
        ) {
          continue;
        }
        db.exec(migration.sql);
      }

      const foreignKeyProblem = foreignKeyFailure(db);
      if (foreignKeyProblem !== null) {
        throw new Error(
          `Database migration foreign-key check failed for ${foreignKeyProblem}.`,
        );
      }

      if (signatureOf(db) !== expectedSignature) {
        throw new Error(
          'Migrated database schema does not match the application schema.',
        );
      }

      db.exec('COMMIT');
      transactionOpen = false;
    } catch (error) {
      if (transactionOpen) {
        db.exec('ROLLBACK');
        transactionOpen = false;
      }
      throw error;
    }
  } finally {
    if (transactionOpen) {
      db.exec('ROLLBACK');
    }
    db.exec('PRAGMA foreign_keys = ON');
    if (Number(db.selectValue('PRAGMA foreign_keys')) !== 1) {
      throw new Error(
        'Database migration could not re-enable foreign-key enforcement.',
      );
    }
  }
}
