# Full-profile index adjudication

Date: 2026-08-26

## Ruling and method

D393 is the adoption rule: frequency orders the work but does not veto an
index. A candidate is adopted when `EXPLAIN QUERY PLAN` on the application-
seeded database proves a scan-to-search transition, a covering lookup, or sort
elimination for at least one captured shape, unless a measured endpoint check
shows a regression.

`scripts/perf/full-profile-index-audit.ts` replans every statement from
`reports/perf/fullsuite-sql/sql-profile.json` before and after each candidate,
with only that candidate changed. The corpus contains 3,893 distinct
statements. SQLite planned 3,847 against the shipped schema. The other 46 are
test-local schema mutations or statements that require a temporary test table,
future-column fixture, deliberately missing trigger, or deliberately invalid
row; none is a production query shape and none can be planned against the
application schema in isolation.

The post-adoption scan census found one missed uncovered production shape,
U1: definition-first reads of `character_source_instances`. U1 improves 36
captured shapes (2,533 executions, 121.60 ms total). All remaining scans are
complete snapshot/digest/catalog reads, bounded recursive/virtual-table scans,
or the already measured-and-rejected bare `spell_loadouts(character_id)`
shape.

## Adjudication, ordered by captured total time improved

The plan snippets below are verbatim `detail` nodes. “No change” means the
complete before and after node arrays were identical.

| Candidate | Profile evidence | EXPLAIN verdict | Decision |
|---|---:|---|---|
| P14 `wizard_spellbook_entries_spell_active_cover` | 35 shapes; 81,601 executions; 14,871.59 ms | `SCAN wizard_spellbook_entries` → `SEARCH wizard_spellbook_entries USING COVERING INDEX wizard_spellbook_entries_spell_active_cover (spell_version_id=?)` | ADOPTED |
| P15 `spell_loadout_entries_spell_loadout_index` | 35; 81,441; 14,865.41 ms | `SCAN spell_loadout_entries USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique` → `SEARCH spell_loadout_entries USING COVERING INDEX spell_loadout_entries_spell_loadout_index (spell_version_id=?)` | ADOPTED; measured separately because it resembles the prior loadout regression |
| P16 `character_spell_preferences_spell_character_index` | 32; 81,123; 14,832.44 ms | `SCAN character_spell_preferences USING COVERING INDEX character_spell_preferences_character_id_spell_version_id_unique` → `SEARCH character_spell_preferences USING COVERING INDEX character_spell_preferences_spell_character_index (spell_version_id=?)` | ADOPTED; measured separately |
| P12 weapon `background_equipment_items_weapon_index` | 3; 11,963; 2,013.05 ms | `SCAN background_equipment_items` → `SEARCH background_equipment_items USING COVERING INDEX background_equipment_items_weapon_index (weapon_template_id=?)` | ADOPTED |
| P13 weapon `class_equipment_items_weapon_index` | 3; 11,963; 2,013.05 ms | `SCAN class_equipment_items` → `SEARCH class_equipment_items USING COVERING INDEX class_equipment_items_weapon_index (weapon_template_id=?)` | ADOPTED |
| P10 `character_class_levels_definition_character_index` | 52; 11,819; 1,146.57 ms | `SCAN character_class_levels USING COVERING INDEX character_class_levels_character_id_class_definition_id_unique` → `SEARCH character_class_levels USING COVERING INDEX character_class_levels_definition_character_index (class_definition_id=?)` | ADOPTED |
| P30 `class_feature_effects_definition_level_name_index` | 33; 14,799; 898.98 ms | `SEARCH class_feature_effects USING INDEX class_feature_effects_class_name_level_unique (class_definition_id=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH class_feature_effects USING INDEX class_feature_effects_definition_level_name_index (class_definition_id=?)` | ADOPTED |
| P11 `character_class_levels_subclass_character_index` | 28; 7,739; 694.37 ms | `SCAN character_class_levels USING COVERING INDEX character_class_levels_character_id_class_definition_id_unique` → `SEARCH character_class_levels USING COVERING INDEX character_class_levels_subclass_character_index (subclass_definition_id=?)` | ADOPTED |
| P12 armor `background_equipment_items_armor_index` | 3; 3,898; 377.60 ms | `SCAN background_equipment_items` → `SEARCH background_equipment_items USING COVERING INDEX background_equipment_items_armor_index (armor_template_id=?)` | ADOPTED |
| P13 armor `class_equipment_items_armor_index` | 3; 3,898; 377.60 ms | `SCAN class_equipment_items` → `SEARCH class_equipment_items USING COVERING INDEX class_equipment_items_armor_index (armor_template_id=?)` | ADOPTED |
| P28 `character_class_levels_character_id_id_index` | 23; 7,622; 342.14 ms | `SEARCH character_class_levels USING INDEX character_class_levels_character_id_class_definition_id_unique (character_id=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH character_class_levels USING INDEX character_class_levels_character_id_id_index (character_id=?)` | ADOPTED |
| U1 `source_instances_definition_state_character_index` | 36; 2,533; 121.60 ms | `SCAN source` → `SEARCH source USING COVERING INDEX source_instances_definition_state_character_index (source_type=? AND source_definition_id=? AND state=?)` | ADOPTED; uncovered profile shape missed by P8–P33 |
| P9 `party_document_states_character_index` | 9; 195; 94.06 ms | `SCAN party_document_states` → `SEARCH party_document_states USING COVERING INDEX party_document_states_character_index (character_id=?)` | ADOPTED |
| P22 `wizard_entries_active_order_index` | 4; 868; 85.66 ms | `SEARCH entry USING INDEX wizard_spellbook_entries_character_id_state_index (character_id=? AND state=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH entry USING INDEX wizard_entries_active_order_index (character_id=?)` | ADOPTED |
| P24 `character_effects_character_sort_index` | 33; 1,457; 68.27 ms | `SEARCH effect USING INDEX character_effects_character_id_index (character_id=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH effect USING INDEX character_effects_character_sort_index (character_id=?)` | ADOPTED |
| P31 `catalog_identities_layer_kind_key_index` | 7; 210; 15.49 ms | `SEARCH identity USING INDEX catalog_content_identities_layer_kind_index (catalog_layer=? AND content_kind=?)` → `SEARCH identity USING COVERING INDEX catalog_identities_layer_kind_key_index (catalog_layer=? AND content_kind=?)` | ADOPTED |
| P25 `character_species_traits_character_sort_index` | 9; 269; 9.09 ms | `SEARCH trait USING INDEX character_species_traits_character_id_index (character_id=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH trait USING INDEX character_species_traits_character_sort_index (character_id=?)` | ADOPTED |
| P27 `character_items_character_name_index` | 2; 204; 6.95 ms | `SEARCH item USING INDEX character_items_character_id_index (character_id=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH item USING INDEX character_items_character_name_index (character_id=?)` | ADOPTED |
| P20 `expertise_grants_active_order_index` | 1; 65; 2.09 ms | `SEARCH ... USING INDEX character_skill_expertise_grants_character_state_index (character_id=? AND state=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH ... USING INDEX expertise_grants_active_order_index (character_id=?)` | ADOPTED with corrected fifth-key intent: `grant_key`, matching the captured order, replaces the brainstorm's non-matching `granted_at_class_level` |
| P19 `skill_grants_active_order_index` | 1; 65; 1.82 ms | `SEARCH ... USING INDEX character_skill_grants_character_id_state_index (character_id=? AND state=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH ... USING INDEX skill_grants_active_order_index (character_id=?)` | ADOPTED |
| P17 `source_instances_active_display_index` | 4; 13; 0.61 ms | `SEARCH t USING INDEX character_source_instances_character_id_state_index (character_id=? AND state=?)` + `USE TEMP B-TREE FOR ORDER BY` → `SEARCH t USING INDEX source_instances_active_display_index (character_id=?)` | ADOPTED |
| P8 `catalog_replacement_choices_successor_index` | 1; 1; 0.40 ms | `SEARCH ... USING COVERING INDEX sqlite_autoindex_catalog_content_replacement_choices_1 (content_kind=?)` → `SEARCH ... USING COVERING INDEX catalog_replacement_choices_successor_index (content_kind=? AND successor_content_key=?)` | ADOPTED |
| P33 `catalog_match_decisions_reviewed_kind_digest_index` | 1; 1; 0.07 ms | `SCAN catalog_content_match_decisions` + `USE TEMP B-TREE FOR ORDER BY` → `SCAN catalog_content_match_decisions USING INDEX catalog_match_decisions_reviewed_kind_digest_index` | ADOPTED; sort eliminated |
| P32 `catalog_archive_members_character_kind_key_index` | 1; 1; 0.03 ms | `SCAN catalog_content_archive_members USING COVERING INDEX sqlite_autoindex_catalog_content_archive_members_1` → `SEARCH catalog_content_archive_members USING COVERING INDEX catalog_archive_members_character_kind_key_index (character_id=?)` | ADOPTED |
| P18 `source_instances_active_id_index` | 0 | Before and after: `SEARCH character_source_instances USING INDEX character_source_instances_character_id_state_index (character_id=? AND state=?)`; the existing index's implicit rowid already supplies `id` order | REJECTED: no plan improvement |
| P21 `spell_slots_active_order_index` | 0 | Before and after active slot builders retain `spell_selection_slots_character_id_state_index` or `spell_selection_slots_source_state_index`; joined source ordering still uses `USE TEMP B-TREE FOR ORDER BY` | REJECTED: no plan improvement |
| P23 `catalog_identities_listed_active_name_index` | 0 | Before and after the listed catalog query uses `catalog_content_identities_layer_kind_index`; its displayed `name` is a `CASE` over joined definition tables, not `normalized_name` | REJECTED: no plan improvement |
| P26 `character_weapons(character_id,id)` | 0 real improvements | Before and after: `SEARCH character_weapons USING INDEX character_weapons_character_id_index (character_id=?)`; SQLite stores rowid after `character_id`, so the proposed explicit `id` repeats the existing order | REJECTED: no plan improvement |
| P29 `character_level_feat_choices(character_id,id)` | 0 | Before and after: `SEARCH character_level_feat_choices USING INDEX character_level_feat_choices_character_id_index (character_id=?)`; implicit rowid already supplies `id` order | REJECTED: no plan improvement |

## Measured regression check for the reverse spell-reference family

The scaled endpoint fixture has 50 characters, 2,000 source instances, 6,000
selection slots, 2,500 wizard entries, 150 loadouts, 3,000 loadout entries, and
1,000 spell preferences. Nine alternating-order repetitions measured the exact
catalog import/deactivation reference endpoint:

| Candidate | Median before | Median after | Change | Full-scan steps | VM steps |
|---|---:|---:|---:|---:|---:|
| P14 | 0.47156 ms | 0.43841 ms | -7.0% | 12,496 → 9,997 | 49,526 → 42,028 |
| P15 | 0.48612 ms | 0.41187 ms | -15.3% | 12,496 → 9,497 | 49,526 → 40,528 |
| P16 | 0.47140 ms | 0.43539 ms | -7.6% | 12,496 → 11,497 | 49,526 → 46,528 |

P15 therefore does not repeat the 2026-08-19 `spell_loadouts(character_id)`
regression. The new index is on the reverse `spell_version_id` arm and improves
the measured endpoint.

## Six conditional exact-prefix removals

No existing index is removed in this lane. Each comparison replanned all 3,847
schema-runnable corpus statements with both indexes, then again after dropping
only the shorter index.

| New proposal | Existing shorter index | Removal verdict |
|---|---|---|
| P24 | `character_effects_character_id_index` | KEEP; dropping it worsens 9 shapes / 165.51 ms because owner-plus-`id` reads lose rowid order |
| P25 | `character_species_traits_character_id_index` | KEEP; dropping it worsens 3 shapes / 52.76 ms |
| P26 | `character_weapons_character_id_index` | KEEP; P26 itself is rejected |
| P27 | `character_items_character_id_index` | KEEP; dropping it worsens 10 shapes / 27.60 ms because name-order and id-order consumers need different indexes |
| P29 | `character_level_feat_choices_character_id_index` | KEEP; P29 itself is rejected |
| P31 | `catalog_content_identities_layer_kind_index` | RECOMMEND REMOVAL in a separate lane; the covering composite is adopted and dropping the shorter index worsens 0 of 3,847 planned shapes |

## Counts

- 28 concrete P8–P33 index shapes adjudicated.
- 23 P8–P33 shapes adopted; 5 rejected.
- 1 uncovered profile shape found and adopted (U1).
- 24 indexes added by migration 0060.
- 1 of 6 conditional redundant indexes recommended for later removal; none
  removed here.

## Validation

- `npx tsc -b`: exit 0, no TypeScript diagnostics.
- `sg scan`: exit 0, no findings.
- Migration and schema tests: 4 files, 85 tests passed in 40.03 s.
- Full `npm test`: 471 files, 8,491 tests passed in 74.30 s.
- Cold `npm run test:affected`: 0 cached-green skipped / 471 run; 8,491
  tests passed; 81.82 s total.
- Warm `npm run test:affected`: 455 cached-green skipped / 16 fail-closed
  files run; 186 tests passed; 16.60 s total.
