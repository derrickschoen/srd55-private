# Bundled content digest v1

D229 replaces healthy-boot per-aggregate projection with one rolled-up digest.
This document states the exact freezing claim required by D226. The executable
definition is `DIGEST_SLICES_V1` in
`src/catalog/bundled-content-digest-v1.ts`; this document explains that
definition, but does not widen it.

## Covered aggregates and bytes

The pass starts from every `catalog_content_identities` row whose
`key_kind = 'bundled-stable'` and `catalog_layer = 'bundled'`. It covers the
complete current row bytes for those identities and their one `content-v1`
`current` fingerprint, plus the bundled-owned rows from these table families:

- equipment: `weapon_templates`, `armor_templates`, `item_definitions`, and
  `item_definition_effects`;
- spells: `spell_versions`, `spell_list_memberships`, `spell_version_tags`,
  `spell_version_attack_modes`, `spell_version_save_abilities`,
  `spell_version_upcast_levels`, and
  `spell_version_cantrip_upgrade_levels`;
- classes: `class_definitions`, `class_progressions`, `class_sheet_traits`,
  `class_saving_throw_proficiencies`, `class_skill_options`,
  `class_armor_training`, `class_weapon_proficiencies`,
  `class_extra_attack_grants`, `class_martial_arts_dice`,
  `class_weapon_mastery_grants`, `class_weapon_mastery_counts`,
  `class_equipment_items`, `class_resources`, `class_resource_formulas`,
  `class_feature_effects`, `named_features`, and `named_feature_effects`;
- authored roots: `feat_definitions`, `subclass_definitions`,
  `subclass_progressions`, `subclass_features`,
  `subclass_feature_effects`, `species_definitions`, `species_templates`,
  `species_template_traits`, `species_template_trait_effects`,
  `background_definitions`, `background_templates`,
  `background_template_effects`, and `background_equipment_items`.

Every current column in those rows is covered except the storage-local `id`,
`created_at`, and `updated_at` columns and the numeric ownership/foreign-key
columns named in each slice. Ownership ids are replaced by the owning
aggregate's stable content key. Cross-aggregate ids are replaced by stable
content keys: spell identity, subclass parent class, class/background weapon
and armour references, and background Origin-feat reference. Nested feature or
trait effect ownership is replaced by the parent's stable semantic locator
(level/order/name as applicable). This makes the digest independent of row-id
allocation without dropping relation identity.

The digest is intentionally stricter than a content-v1 fingerprint for root
metadata: persisted columns such as provenance, seed version, and active state
are included. It intentionally does not cover user-owned rows, historical or
compatible fingerprints, timestamps, aliases/import provenance, or the dormant
spell condition/damage/publication tables excluded by the spell projector.
Those bytes are outside the claim "current bundled aggregate".

## Canonical ordering

There is no unordered iteration in the hash input:

1. Aggregate kinds use the fixed order weapon, armor, item, spell, class,
   feat, subclass, species, background.
2. Aggregates of one kind sort by literal UTF-16 content-key bytes (`<`/`>`),
   with no locale collation.
3. Tables within an aggregate sort by literal table name.
4. Rows within a table are converted to content-v1 canonical JSON and sort by
   those exact canonical bytes.
5. Object members use content-v1's Unicode-code-point key ordering.

The healthy path canonicalizes that complete ordered structure and performs
one SHA-256. Per-aggregate SHA-256 values are computed only after a rolled-up
mismatch, to compare with the slow-path name index.

## Build pin and transitive source

`src/catalog/bundled-content-digest-v1.expected.ts` pins the reviewed rolled-up
digest and the per-aggregate slow-path name index. `npm run build` invokes
`scripts/verify-bundled-content-digest.ts`, which creates a fresh in-memory
database, runs the real production `applicationSeed`, canonicalizes the stored
result through the same runtime digest code, and refuses a mismatch.

The freeze therefore covers the transitive seed extracts, parsers, seeders,
and canonicalization behavior to the extent they determine the persisted bytes
listed above: changing any of them in a way that changes a bundled aggregate
changes the freshly derived build digest. The pin does not claim that an inert
comment or code change with identical persisted output is different content.
That is the deliberately precise D226 boundary.
