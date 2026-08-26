# Full index-coverage brainstorm

Date: 2026-08-26  
Scope: static, read-only SQL/index audit; no suite or workload was run.

## Executive summary

`src/db/schema.sql` defines 88 tables, 137 explicit indexes (82 UNIQUE, 55
non-unique; 7 partial), and 20 triggers. Primary keys additionally create
rowid lookups or SQLite autoindexes and are included below wherever they serve
a query. The source census found 937 predicate-bearing `SELECT`/`WITH`/
`UPDATE`/`DELETE` call sites in `src/`, `tools/`, and `scripts/`, representing
774 normalized SQL shapes, plus eight imported/runtime-composed SQL families whose
closed builders/allowlists were inspected separately. Write-only INSERTs and schema/transaction control
statements are inventoried separately because they have no read access path to
cover. Test SQL is included only where it exercises a production hot path,
an index/migration plan, or a user-facing read model; fixture-only inserts and
storage assertions do not justify production indexes.

The high-confidence additions are:

1. `character_save_points(character_id, id DESC)`;
2. `character_effects(source_instance_id, character_id)`;
3. reverse spell references on `wizard_spellbook_entries`,
   `spell_loadout_entries`, and `character_spell_preferences`;
4. partial active-row order indexes for spellbook entries, spell slots, skill
   grants, and expertise grants;
5. replacement composites for the simple owner indexes on high-frequency
   character aggregate reads.

Proposal census: 34 numbered groups represent 36 concrete index shapes (P12
and P13 each expand to weapon and armor indexes): 6 single-column and 30
multi-column; 18 are partial; 4 explicit covering shapes/variants are
discussed; 0 new UNIQUE constraints are recommended. Eight narrow proposals
(P1-P7 and P34) are classified safe before profiling, 20 groups (P14-P33) must wait
for profiling, and P8-P13 are low-priority relationship-completeness choices.
Six current indexes are exact-prefix redundant; six more become redundant only
if their proposed replacement composite lands.

The spell reverse-reference indexes and ordered active-source/grant indexes
must still win under the forthcoming SQL query profile. The save-point and
missing `character_effects.source_instance_id` relationship indexes are
obviously safe correctness-shaped coverage. Do **not** add the previously
trialled `spell_loadouts(character_id)` blindly: the 2026-08-19 relationship
trial made its endpoint 4% slower.

## Method and coverage definitions

The census searched `src/`, `tools/`, `scripts/`, and tests for direct
`queryAll`, `queryOne`, `queryAllRaw`, `queryOneRaw`, `queryScalar`, `execute`,
raw `selectObjects`/`selectObject`/`selectValue`, and the corresponding
`DatabaseContext.all`/`one`/`allRaw`/`oneRaw`/`scalar`/`exec` methods. Regex
`.exec` and `Promise.all` calls were excluded by requiring the resolved first
SQL argument to begin with a SQL verb. Local string constants and template
literals were resolved; runtime table/column templates are recorded as query
families over their closed allowlists.

Literal-resolved SQL call census (a `WITH` statement is kept separate from
`SELECT`; write/control verbs have no read-path index mapping):

| Scope | SELECT | WITH | UPDATE | DELETE | INSERT | DDL / PRAGMA / transaction | Total |
|---|---:|---:|---:|---:|---:|---:|---:|
| `src/` | 717 | 6 | 99 | 74 | 179 | 24 | 1,099 |
| `scripts/` | 33 | 0 | 8 | 0 | 17 | 10 | 68 |
| `tools/` | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| all `tests/` (fixture/control census) | 1,929 | 0 | 446 | 114 | 1,237 | 173 | 3,899 |

The 937 production/perf predicate-bearing sites are the first four read/filter
columns for `src/` and `scripts/`. The test matrix intentionally narrows the
2,489 test predicate sites to read-model/eligibility/index-plan hot paths; the
remainder are fixture writes, migration history, or raw storage assertions and
cannot establish production frequency.

Coverage labels used below:

- **COVERED**: equality/range predicates and join probes can use a rowid,
  primary-key autoindex, or the named explicit index. An index may still leave
  a small residual sort.
- **COVERED+ORDER**: the usable left prefix also supplies the requested order.
- **PARTIAL**: every lookup is indexed, but one arm sorts or projects from the
  table, or a dynamic predicate does not always retain the useful prefix.
- **UNCOVERED**: no existing index begins with the lookup column(s).
- **SCAN-INTENTIONAL**: a bounded catalog/build/migration query reads the whole
  table once; adding an index would not avoid that scan.
- **PROFILE**: plausible index, but frequency/cardinality is required before
  accepting its write and WASM-memory cost.

SQLite's left-prefix rule governs all assessments: `(a,b,c)` serves `a`,
`a+b`, and `a+b+c`, but not a lookup on `b` alone. Equality columns precede
range/order columns in proposed composites. A partial index is usable only
when the statement predicate implies its `WHERE` clause. Covering indexes are
suggested only for repeated interactive reads; covering every seed projection
would inflate the database for no endpoint gain.

## Existing-index catalog

This is the complete catalog of all 137 explicit indexes, grouped by table.
“PK only” means the table still has its rowid or primary-key autoindex.

| Table | Existing explicit indexes |
|---|---|
| `armor_templates` | `armor_templates_content_key_unique(content_key)` |
| `background_definitions` | `background_definitions_content_key_unique(content_key)`; `background_definitions_name_rules_edition_index(name,rules_edition)` |
| `background_equipment_items` | `background_equipment_items_template_option_sort_order_unique(background_template_id,option,sort_order)`; `background_equipment_items_background_template_id_index(background_template_id)` |
| `background_template_effects` | `background_template_effects_template_sort_unique(background_template_id,sort_order)`; `background_template_effects_background_template_id_index(background_template_id)` |
| `background_templates` | `background_templates_content_key_unique(content_key)`; `background_templates_name_rules_edition_index(name,rules_edition)` |
| `catalog_content_aliases` | `catalog_content_aliases_resolution_index(content_kind,alias_key)`; PK autoindex `(content_kind,alias_key,content_key)` |
| `catalog_content_archive_members` | PK autoindex `(content_kind,content_key,character_id)` |
| `catalog_content_drafts` | `catalog_content_drafts_kind_updated_index(content_kind,updated_at,draft_uuid)`; `catalog_content_drafts_base_content_index(content_kind,base_content_key)`; PK autoindex `(draft_uuid)` |
| `catalog_content_fingerprints` | `catalog_content_fingerprints_current_unique(content_key) WHERE fingerprint_role='current'`; `catalog_content_fingerprints_content_key_index(content_key)`; `catalog_content_fingerprints_resolution_index(content_kind,fingerprint_scheme,fingerprint_digest)`; PK autoindex `(content_kind,fingerprint_scheme,fingerprint_digest,content_key)` |
| `catalog_content_identities` | `catalog_content_identities_kind_key_unique(content_kind,content_key)`; `catalog_content_identities_layer_kind_index(catalog_layer,content_kind)`; `catalog_content_identities_name_index(content_kind,normalized_name)`; `catalog_content_identities_archive_list_index(archived_at DESC,content_kind,normalized_name,content_key)`; PK autoindex `(content_key)` |
| `catalog_content_match_decisions` | PK autoindex `(content_kind,incoming_fingerprint_scheme,incoming_fingerprint_digest)` |
| `catalog_content_provenance` | `catalog_content_provenance_received_index(received,origin_kind,content_kind)`; PK autoindex `(content_kind,content_key)` |
| `catalog_content_replacement_choices` | `catalog_content_replacement_choices_character_index(character_id,content_kind)`; PK autoindex `(content_kind,superseded_content_key,successor_content_key,character_id)` |
| `catalog_content_supersessions` | `catalog_content_supersessions_successor_index(content_kind,successor_content_key)`; PK autoindex `(content_kind,superseded_content_key)` |
| `catalog_data_migrations` | PK autoindex `(id)` |
| `change_log` | `change_log_character_id_sequence_unique(character_id,sequence)`; `change_log_character_id_group_id_index(character_id,group_id)`; `change_log_operation_uuid_index(operation_uuid)` |
| `character_armor` | `character_armor_character_id_slot_unique(character_id,slot)` |
| `character_attunement_slots` | integer PK/rowid `(character_id)` |
| `character_background` | `character_background_character_id_unique(character_id)` |
| `character_class_levels` | `character_class_levels_character_id_class_definition_id_unique(character_id,class_definition_id)`; `character_class_levels_id_character_id_unique(id,character_id)` |
| `character_effects` | `character_effects_character_id_index(character_id)`; `character_effects_character_item_id_index(character_item_id)`; `character_effects_character_weapon_id_index(character_weapon_id)` |
| `character_hit_point_rolls` | `character_hit_point_rolls_character_id_class_name_class_level_unique(character_id,class_name,class_level)` |
| `character_items` | `character_items_character_id_index(character_id)`; `character_items_id_character_id_unique(id,character_id)` |
| `character_level_feat_choices` | `character_level_feat_choices_class_level_kind_unique(character_class_level_id,class_level,choice_kind)`; `character_level_feat_choices_character_id_index(character_id)` |
| `character_operations` | `character_operations_operation_uuid_unique(operation_uuid)`; `character_operations_character_id_resulting_revision_index(character_id,resulting_revision)` |
| `character_rule_overrides` | `character_rule_overrides_character_id_rule_key_unique(character_id,rule_key)` |
| `character_save_points` | integer PK/rowid `(id)` only |
| `character_share_receipts` | `character_share_receipts_local_document_id_unique(local_document_id)`; `character_share_receipts_received_document_id_unique(received_document_id)`; integer PK/rowid `(character_id)` |
| `character_sheet_adjustments` | `character_sheet_adjustments_character_id_unique(character_id)` |
| `character_skill_expertise_grants` | `character_skill_expertise_grants_source_grant_ordinal_unique(source_instance_id,grant_key,ordinal)`; `character_skill_expertise_grants_character_skill_unique(character_id,skill) WHERE skill IS NOT NULL AND state='active'`; `character_skill_expertise_grants_character_state_index(character_id,state)` |
| `character_skill_grants` | `character_skill_grants_source_grant_ordinal_unique(source_instance_id,grant_key,ordinal)`; `character_skill_grants_character_id_skill_unique(character_id,skill) WHERE skill IS NOT NULL AND state='active'`; `character_skill_grants_character_id_state_index(character_id,state)` |
| `character_skill_proficiencies` | `character_skill_proficiencies_character_id_skill_unique(character_id,skill)` |
| `character_source_instances` | `character_source_instances_instance_uuid_unique(instance_uuid)`; `character_source_instances_character_id_state_index(character_id,state)`; `character_source_instances_parent_index(parent_source_instance_id) WHERE parent_source_instance_id IS NOT NULL`; `character_source_instances_id_character_id_unique(id,character_id)` |
| `character_species` | `character_species_character_id_unique(character_id)` |
| `character_species_traits` | `character_species_traits_character_id_index(character_id)` |
| `character_spell_preferences` | `character_spell_preferences_character_id_spell_version_id_unique(character_id,spell_version_id)` |
| `character_weapons` | `character_weapons_id_character_id_unique(id,character_id)`; `character_weapons_character_id_index(character_id)` |
| `characters` | `characters_archive_list_index(archived_at DESC,name,id)`; integer PK/rowid `(id)` |
| `class_armor_training` | `class_armor_training_class_definition_id_category_unique(class_definition_id,category)` |
| `class_definitions` | `class_definitions_content_key_unique(content_key)`; `class_definitions_name_rules_edition_index(name,rules_edition)` |
| `class_equipment_items` | `class_equipment_items_class_option_sort_order_unique(class_definition_id,option,sort_order)`; `class_equipment_items_class_definition_id_index(class_definition_id)` |
| `class_extra_attack_grants` | `class_extra_attack_grants_class_definition_id_class_level_unique(class_definition_id,class_level)` |
| `class_feature_effects` | `class_feature_effects_class_name_level_unique(class_definition_id,name,class_level)` |
| `class_feature_value_contributions` | `class_feature_value_contributions_owner_key_unique(class_definition_id,contribution_key)` |
| `class_martial_arts_dice` | `class_martial_arts_dice_class_definition_id_class_level_unique(class_definition_id,class_level)` |
| `class_progressions` | `class_progressions_class_definition_id_class_level_unique(class_definition_id,class_level)` |
| `class_resource_formulas` | `class_resource_formulas_class_definition_id_resource_kind_unique(class_definition_id,resource_kind)` |
| `class_resources` | `class_resources_class_definition_id_class_level_resource_kind_unique(class_definition_id,class_level,resource_kind)` |
| `class_saving_throw_proficiencies` | `class_saving_throw_proficiencies_class_definition_id_ability_unique(class_definition_id,ability)` |
| `class_sheet_traits` | `class_sheet_traits_class_definition_id_unique(class_definition_id)` |
| `class_skill_options` | `class_skill_options_class_definition_id_skill_unique(class_definition_id,skill)` |
| `class_weapon_mastery_counts` | `class_weapon_mastery_counts_class_definition_id_class_level_unique(class_definition_id,class_level)` |
| `class_weapon_mastery_grants` | `class_weapon_mastery_grants_class_definition_id_unique(class_definition_id)` |
| `class_weapon_proficiencies` | `class_weapon_proficiencies_class_definition_id_category_unique(class_definition_id,category)` |
| `feat_definitions` | `feat_definitions_content_key_unique(content_key)`; `feat_definitions_name_rules_edition_index(name,rules_edition)` |
| `item_definition_effects` | `item_definition_effects_definition_sort_unique(item_definition_id,sort_order)`; `item_definition_effects_definition_index(item_definition_id)` |
| `item_definitions` | `item_definitions_content_key_unique(content_key)`; `item_definitions_name_index(name)` |
| `named_feature_effects` | `named_feature_effects_feature_sort_unique(named_feature_id,sort_order)` |
| `named_features` | `named_features_content_key_unique(content_key)`; `named_features_class_name_rules_edition_unique(class_definition_id,name,rules_edition)` |
| `party_document_states` | PK autoindex `(forge,repository,path)` |
| `species_definitions` | `species_definitions_content_key_unique(content_key)`; `species_definitions_name_rules_edition_index(name,rules_edition)` |
| `species_template_trait_effects` | `species_template_trait_effects_trait_sort_unique(species_template_trait_id,sort_order)` |
| `species_template_traits` | `species_template_traits_template_sort_unique(species_template_id,sort_order)`; `species_template_traits_template_name_unique(species_template_id,name)` |
| `species_templates` | `species_templates_content_key_unique(content_key)`; `species_templates_name_rules_edition_index(name,rules_edition)` |
| `spell_identities` | `spell_identities_content_key_unique(content_key)`; `spell_identities_normalized_name_index(normalized_name)` |
| `spell_identity_aliases` | `spell_identity_aliases_normalized_alias_unique(normalized_alias)` |
| `spell_list_memberships` | `spell_list_memberships_spell_version_id_spell_list_key_unique(spell_version_id,spell_list_key)`; `spell_list_memberships_spell_list_key_index(spell_list_key)` |
| `spell_loadout_entries` | `spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique(spell_loadout_id,spell_version_id,role)` |
| `spell_loadouts` | integer PK/rowid `(id)` only |
| `spell_selection_slots` | `spell_selection_slots_character_id_slot_key_unique(character_id,slot_key)`; `spell_selection_slots_character_id_state_index(character_id,state)`; `spell_selection_slots_character_id_bucket_index(character_id,bucket)`; `spell_selection_slots_source_state_index(source_instance_id,state)`; `spell_selection_slots_fixed_spell_version_index(fixed_spell_version_id) WHERE fixed_spell_version_id IS NOT NULL`; `spell_selection_slots_current_spell_version_index(current_spell_version_id) WHERE current_spell_version_id IS NOT NULL`; `slots_character_collection_index(character_id,selection_collection)` |
| `spell_version_attack_modes` | `spell_version_attack_modes_spell_version_id_attack_mode_unique(spell_version_id,attack_mode)`; `spell_version_attack_modes_attack_mode_index(attack_mode)` |
| `spell_version_cantrip_upgrade_levels` | `spell_version_cantrip_upgrade_levels_spell_version_id_level_unique(spell_version_id,level)` |
| `spell_version_conditions` | `spell_version_conditions_spell_version_id_condition_type_unique(spell_version_id,condition_type)`; `spell_version_conditions_condition_type_index(condition_type)` |
| `spell_version_damage_types` | `spell_version_damage_types_spell_version_id_damage_type_unique(spell_version_id,damage_type)`; `spell_version_damage_types_damage_type_index(damage_type)` |
| `spell_version_publications` | `spell_version_publications_spell_version_id_source_book_unique(spell_version_id,source_book)` |
| `spell_version_save_abilities` | `spell_version_save_abilities_spell_version_id_save_ability_unique(spell_version_id,save_ability)`; `spell_version_save_abilities_save_ability_index(save_ability)` |
| `spell_version_tags` | `spell_version_tags_spell_version_id_tag_unique(spell_version_id,tag)`; `spell_version_tags_tag_index(tag)` |
| `spell_version_upcast_levels` | `spell_version_upcast_levels_spell_version_id_level_unique(spell_version_id,level)` |
| `spell_versions` | `spell_versions_content_key_unique(content_key)`; `spell_versions_spell_identity_id_rules_edition_index(spell_identity_id,rules_edition)`; `spell_versions_rules_edition_level_index(rules_edition,level)`; `spell_versions_active_level_name_index(is_active,level,display_name)` |
| `subclass_definitions` | `subclass_definitions_content_key_unique(content_key)`; `subclass_definitions_class_definition_id_name_rules_edition_index(class_definition_id,name,rules_edition)`; `subclass_definitions_id_class_definition_id_unique(id,class_definition_id)` |
| `subclass_feature_effects` | `subclass_feature_effects_feature_sort_unique(subclass_feature_id,sort_order)` |
| `subclass_feature_value_contributions` | `subclass_feature_value_contributions_owner_key_unique(subclass_feature_id,contribution_key)` |
| `subclass_features` | `subclass_features_subclass_sort_unique(subclass_definition_id,sort_order)`; `subclass_features_subclass_level_name_unique(subclass_definition_id,class_level,name)` |
| `subclass_progressions` | `subclass_progressions_subclass_definition_id_class_level_unique(subclass_definition_id,class_level)` |
| `vtt_session_revisions` | PK autoindex `(session_id,revision)` |
| `warning_acknowledgements` | `warning_acknowledgements_character_id_warning_fingerprint_unique(character_id,warning_fingerprint)` |
| `weapon_templates` | `weapon_templates_content_key_unique(content_key)` |
| `wizard_spellbook_entries` | `wizard_spellbook_entries_source_rule_ordinal_unique(source_instance_id,rule_key,ordinal)`; `wizard_spellbook_entries_character_id_spell_version_id_unique(character_id,spell_version_id) WHERE spell_version_id IS NOT NULL AND state='active'`; `wizard_spellbook_entries_character_id_state_index(character_id,state)` |

## Full query-to-index coverage matrix

The matrix groups statements only when their table, predicate/join prefix, and
ordering requirement are the same. Every production statement site is covered
by one of these families; repeated generated/projector calls are shown as a
closed table family rather than one row per runtime table substitution.

### Catalog, authoring, and rules tables

| Query family and statement sites | Predicate / join / order shape | Existing service | Verdict |
|---|---|---|---|
| Registry identity point reads/writes (`content-registry.ts:217-443,685,893,957`; `portable-content.ts:749-866,1127,1815`; registration triggers) | identity `content_key=?`, or `content_kind=? AND content_key=?` | PK `(content_key)`; `catalog_content_identities_kind_key_unique` for the composite FK/guard shape | COVERED |
| Listed catalog identity joins (`catalog-queries.ts:263-384`; `eligible-spell-search.ts:134`; guided/catalog/disclosure builders) | join by `content_key` plus fixed `content_kind`; reject archived/hidden identities | PK and `kind_key_unique`; filter/order work is residual | PARTIAL; proposed partial listed index is PROFILE |
| Identity name resolution (`content-registry.ts:417-519`; source import/adoption) | `content_kind=? AND normalized_name=?`, ordered by `content_key` | `catalog_content_identities_name_index` | COVERED; small tie sort |
| External export/list (`portable-content.ts:894-1166`; `source-content-importer.ts:119`; `stored-content-projector-v1.ts:99`) | `catalog_layer='external'`, then `content_kind,content_key` | `catalog_content_identities_layer_kind_index` supplies equality plus kind only | PARTIAL; extend only after PROFILE |
| Archive library/list and lifecycle (`archive-set-lifecycle.ts:203-240,302,366,532-857`; `draft-service.ts:1084-1169`) | `archived_at IS [NOT] NULL`, kind/name/key order; member lookups by `(kind,key,character)` and sometimes by `character_id` | `catalog_content_identities_archive_list_index`; archive-member PK for owner-first archive queries | COVERED+ORDER except reverse member-by-character is UNCOVERED/PROFILE |
| Catalog aliases (`content-registry.ts`; source import) | `(content_kind,alias_key)` resolution | explicit resolution index and PK autoindex | COVERED; explicit index is shadowed by PK |
| Catalog aliases by target identity | `(content_kind,content_key)` cascade/export | neither PK nor resolution index has `content_key` second | **UNCOVERED**; P34 |
| Spell identity alias export (`portable-content.ts:879`) | `spell_identity_id=? ORDER BY normalized_alias,alias` | only global normalized-alias unique; identity-first scan is absent | **UNCOVERED**; P6 |
| Fingerprint match/current/history (`content-registry.ts:270-353,1053-1103`; publishers; adoption/import) | `(kind,scheme,digest)`, `content_key`, and current-role point reads | resolution index/PK; content-key index; partial current unique | COVERED |
| Match decisions (`content-registry.ts:1171,1232`; `worker/handlers/catalog.ts:122`) | PK point read by `(kind,scheme,digest)`; unfiltered review list `ORDER BY reviewed_at DESC,kind,digest` | PK covers point reads; review list scans/sorts | SCAN-INTENTIONAL while tiny; review-list index is PROFILE |
| Match-decision target purge (`archive-set-lifecycle.ts:775`) | `content_kind=? AND target_content_key IN (...)` | PK is incoming-fingerprint-first | **UNCOVERED**; P7 |
| Provenance (`content-provenance.ts:67`; `recorded-source-provenance.ts:82-141`; size audit) | PK `(kind,key)`; received/origin/kind aggregation | PK and `catalog_content_provenance_received_index` | COVERED |
| Supersession traversal (`portable-content.ts:938-1078`; `archive-set-lifecycle`; recursive trigger) | forward `(kind,superseded_key)` and reverse `(kind,successor_key)` | PK forward; successor index reverse | COVERED |
| Replacement choices (`reference-retarget.ts`; archive lifecycle) | character-first decisions or exact four-column identity | character index and PK | COVERED |
| Replacement successor reverse FK | `content_kind+successor_content_key` | PK is superseded-first | **UNCOVERED**; P8/PROFILE-low |
| Draft get/list/CAS publish (`draft-service.ts:431,482,728-1007`; three publishers) | PK `draft_uuid`; `kind ORDER BY updated_at DESC,draft_uuid`; base `(kind,base_key)`; CAS `uuid+revision` | PK; both explicit draft indexes; CAS uses PK then checks revision | COVERED+ORDER |
| Definition point lookup (`class`, `subclass`, `feat`, `species`, `background`, template and equipment tables throughout import/build/rules) | `id=?` or `content_key=?` | rowid and each table's content-key unique index | COVERED |
| Background default-Origin-feat trigger/FK | `default_origin_feat_content_key=?` | no index begins with this nullable key | **UNCOVERED**; P5 |
| Definition catalog list (`catalog-queries.ts:263-391`; `guided-creation.ts:474-1103,1546-1651`; draft reference choices) | name/edition order, sometimes class owner first | `*_name_rules_edition_index`; subclass owner/name/edition index; item name index | COVERED+ORDER; final `id` tie sort is bounded |
| Class ownership joins (`character_class_levels.class_definition_id`, source `source_definition_id`) | definition rowid probes from already-filtered character owners | definition rowid | COVERED |
| Class armor/saves/skills/weapons/sheet traits | `class_definition_id=?`, ordered by category/ability/skill | the UNIQUE owner/value indexes; sheet-traits owner unique | COVERED+ORDER |
| Class progressions, resources, martial dice, mastery counts, extra attacks | `class_definition_id=?` plus level/range and level/resource order | owner/level UNIQUE indexes | COVERED+ORDER |
| Class feature effects (`sheet-content-lookup.ts`, `generated-feature-effects.ts`) | owner filter; consumers order by `class_level,name` | existing `(class_definition_id,name,class_level)` uses owner but not requested level-first order | COVERED lookup; residual sort. `(class_definition_id,class_level,name)` is PROFILE |
| Class feature value contributions | `class_definition_id=?`, join to feature effects, often order by feature then contribution id | owner/contribution-key unique | COVERED lookup; residual bounded sort |
| Class equipment items (`class-equipment-srd.ts`, display/grants/projectors) | owner, `ORDER BY option,sort_order` | owner/option/sort UNIQUE | COVERED+ORDER; standalone owner index is redundant |
| Background equipment items (`background-equipment.ts`, guided creation/projectors) | owner, option/sort order | owner/option/sort UNIQUE | COVERED+ORDER; standalone owner index is redundant |
| Class/background equipment reverse template FKs | nullable `weapon_template_id` or `armor_template_id` | no template-first child index | **UNCOVERED** for parent deletion; P12/P13 only if runtime deletion exists |
| Background template effects | owner, `ORDER BY sort_order` | owner/sort UNIQUE | COVERED+ORDER; standalone owner index is redundant |
| Item definition effects (`equipment-content-projector-v1.ts`, grants) | owner, `ORDER BY sort_order,id` | owner/sort UNIQUE | COVERED+ORDER except `id` tie; standalone owner index redundant |
| Species template traits/effects (`guided-creation.ts:1285-1324`; projectors) | template owner/sort or trait owner/sort | both owner/sort UNIQUE indexes | COVERED+ORDER |
| Named features/effects | feature content key or `(class,name,edition)`; effects owner/sort | named-feature unique indexes and effect owner/sort UNIQUE | COVERED+ORDER |
| Subclass features/progressions/effects/contributions (`subclass-importer`, publishers, sheet/projectors) | subclass owner + sort or level/name; child effect owner/sort | both subclass-feature UNIQUE indexes; progression/effect/contribution owner indexes | COVERED+ORDER |
| Armor/weapon/item template seed/import upserts | content-key point probes; otherwise one whole SRD table pass | content-key unique | COVERED point access; bulk seed scans are SCAN-INTENTIONAL |
| Catalog data migrations (`catalog-data-migrations.ts:265`) | `ORDER BY id`, point insert/check by id | PK `(id)` | COVERED+ORDER |
| Whole-table digest/projector scans (`bundled-content-digest-v1.ts`; `stored-*-projector-v1.ts`; candidate audit; seed rules) | intentionally enumerate a complete, bounded catalog table once | rowid/content-key order where requested; otherwise no selective predicate | SCAN-INTENTIONAL; do not add scan-only indexes |

### Character aggregate and interactive read models

| Query family and statement sites | Predicate / join / order shape | Existing service | Verdict |
|---|---|---|---|
| Character point CRUD/revision CAS (commands, `character-crud.ts:132,147`, preflight/executor) | `characters.id=?`, updates commonly `id=? AND revision=?` | integer rowid; revision is checked after point lookup | COVERED |
| Active/archived character lists (`character-lifecycle-queries.ts`; list/completeness builders) | `archived_at IS NULL ORDER BY name,id` or archived DESC/name/id | `characters_archive_list_index` | COVERED+ORDER |
| All-character maintenance enumeration (`character-level-source-reconciliation.ts:130`; candidate audit/system demo) | whole table `ORDER BY id` | rowid order | SCAN-INTENTIONAL |
| Character class levels (sheet/workspace/builder/rules/share) | `character_id=?`, sometimes `class_definition_id=?`, frequent `ORDER BY id` | `(character_id,class_definition_id)` unique covers selection, not id order; `(id,character_id)` serves ownership FK/reverse point | COVERED; residual sort. `(character_id,id)` is PROFILE |
| Class/subclass definition reverse ownership checks | `class_definition_id=?` or nullable `(subclass_definition_id,class_definition_id)` from definition deletion/audit | current owner-first index begins with character; subclass id is not first anywhere | **UNCOVERED** reverse FK; P10/P11 low priority |
| Character background/species/sheet adjustments/attunement slots | one row by `character_id` | unique owner indexes or integer PK for attunement | COVERED |
| Character armor (`character-sheet-builder.ts:1573`; share/backup) | `character_id=? ORDER BY slot` | `(character_id,slot)` unique | COVERED+ORDER |
| Hit-point rolls (`character-sheet-builder.ts:1521`; completeness/share) | `character_id=? ORDER BY class_name,class_level` | owner/class/level unique | COVERED+ORDER |
| Character items (`queries/items.ts:34`; sheet/share/backup; item commands) | owner point/list, usually `ORDER BY name,id` or `id`; ownership FK `(id,character)` | owner index plus `(id,character)` unique | COVERED lookup; residual sort. owner/name/id composite is PROFILE |
| Character items by source (`reference-retarget.ts:979`, source removal) | `source_instance_id IN (...)`, owner guarded | no source-first item index | **UNCOVERED**; P3 |
| Character weapons (`queries/weapons.ts:189`; sheet/share/backup; commands) | owner list `ORDER BY id`; ownership FK | owner index plus `(id,character)` unique | COVERED lookup; residual sort. replace owner index with `(character_id,id)` after PROFILE |
| Character effects by character/item/weapon (`eligible-character-effects.ts`; sheet, equipment commands) | `character_id=? ORDER BY sort_order,id`; reverse item/weapon deletion/retarget | three existing single-column indexes | COVERED lookup; residual sort |
| Character effects by source (`reference-retarget.ts:1228`; source retcon/removal cascades) | `source_instance_id=?` optionally owner-guarded | no source-first index | **UNCOVERED**; add `(source_instance_id,character_id)` |
| Character species traits (`character-sheet-builder.ts:1690`; guided/share/backup) | `character_id=? ORDER BY sort_order,id` | character-only index | COVERED lookup; residual sort. ordered replacement is PROFILE |
| Source instances point/ownership (`guided-creation`, commands, grants, retarget) | `id=?` or `id=? AND character_id=?`; UUID point | rowid, `(id,character_id)` unique, UUID unique | COVERED |
| Active source lists (`spell-access-builder.ts:704`; workspace/disclosures/builders) | `character_id=? AND state='active'`, with either `ORDER BY id` or `source_type,display_name,id` | `(character_id,state)` | COVERED lookup; residual sort. extended composite is PROFILE |
| Source tree traversal (`reference-retarget.ts:852`; recursive removal/retarget) | `parent_source_instance_id=?` | partial parent index | COVERED |
| Character rule overrides | `(character_id,rule_key)` get/upsert/delete | owner/rule unique | COVERED |
| Character save-point list (`save-points.ts:48`) | `character_id=? ORDER BY id DESC` | only rowid on `id`; SQLite must scan/filter | **UNCOVERED**; add `(character_id,id DESC)` |
| Character operation history (`operation-history.ts:72`) | `character_id=? ORDER BY resulting_revision DESC,id DESC` | `(character_id,resulting_revision)` | COVERED+ORDER except id tie; index is almost covering |
| Change history (`operation-history.ts:88`; audit log/executor) | `character_id=? ORDER BY sequence DESC,id DESC`; group and operation UUID probes | unique `(character_id,sequence)` plus group and UUID indexes | COVERED+ORDER except id tie |
| Warning acknowledgement point/list/delete | `(character_id,warning_fingerprint)`; share exports character warnings ordered by fingerprint | owner/fingerprint unique | COVERED+ORDER |
| Character share receipts | point by character/local document/received document | PK and two unique indexes | COVERED |
| Skill proficiency materialization | `(character_id,skill)` and character list ordered by skill | owner/skill unique | COVERED+ORDER |
| Skill grant source reconciliation (`skill-grants.ts:185,446`) | `source_instance_id=?`, optional grant-key set, order grant/ordinal | source/grant/ordinal unique | COVERED+ORDER |
| Skill grant character resolution/share (`skill-grants.ts:113,579`; `character-share.ts:1252`) | `character_id=?`, often active semantics, `ORDER BY source_instance_id,grant_key,ordinal,id` | `(character_id,state)` covers filter only; partial owner/skill unique covers filled active rows only | PARTIAL; partial active order/covering index proposed |
| Expertise source reconciliation (`skill-expertise-grants.ts:144`) | `source_instance_id=? ORDER BY grant_key,ordinal` | source/grant/ordinal unique | COVERED+ORDER |
| Expertise character resolution/share (`skill-expertise-grants.ts:295-324`; share) | `character_id=?`, active semantics, `ORDER BY source_instance_id,granted_at_class_level,ordinal,id` | `(character_id,state)` and partial filled-skill unique | PARTIAL; partial active order/covering index proposed |
| Level feat choices (`level-up-state`, retarget/share, commands) | owner by character or class-level tuple; order id or `(class_level,choice_kind)` | character index and class-level/kind unique | COVERED lookup; residual id order |
| Level feat choices by feat source (`reference-retarget.ts:989`; source-delete trigger) | `feat_source_instance_id IN (...)` | no feat-source-first index | **UNCOVERED**; P4 |
| Item/weapon/effect deletion and backup replacement (`character-share.ts:2322-2337`; command updates/deletes) | `character_id=?`, `id=?`, item/weapon reverse FK cleanup | named owner/reverse indexes and rowid | COVERED |
| Backup dynamic character tables (`character-backup.ts:1830`; candidate audit snapshot; sharing allowlist) | `SELECT/DELETE ... WHERE character_id=? ORDER BY id` over a closed list | every listed owner table has owner-first index **except save points**, whose proposed owner/id index closes the family | PARTIAL until save-point index lands |
| Character list N+1 warning count (`character-list-builder.ts:35`) | per character, slots `character_id=?` with eligibility/state disjunction | character/state index supplies prefix; selection eligibility is residual | COVERED; query rewrite/batching is preferable to another index |

### Spell catalog, selections, loadouts, and access

| Query family and statement sites | Predicate / join / order shape | Existing service | Verdict |
|---|---|---|---|
| Spell version point/content lookup (import/projectors, selection evaluation, backup) | rowid `id=?`; `content_key=?`; `(spell_identity_id,rules_edition)` | rowid, content-key unique, identity/edition index | COVERED |
| Active catalog browse (`catalog-queries.ts:304`; disclosures/workspace) | selectable identities; `ORDER BY level,display_name,rules_edition,id` | `spell_versions_active_level_name_index` when `is_active` is implied | COVERED+ORDER through level/name; bounded tie sort |
| Eligible spell search (`eligible-spell-search.ts:134,193`) | `is_active=1`, level range, optional edition/name substring/school/list/tag; `ORDER BY level,name,id LIMIT 50` | active/level/name index drives outer search; membership/tag subqueries use owner/value uniques and reverse value indexes | COVERED; `instr(lower(name))` is deliberately not B-tree-searchable |
| Identity-equivalent legacy-list arm | join listed version by `spell_identity_id`; membership by spell-list key | spell identity/edition index; membership list-key index then version rowid | COVERED |
| Spell identity name/alias resolution | identity `content_key`/normalized name; alias normalized alias | content-key and normalized-name indexes; alias unique | COVERED |
| Spell list membership owner/value reads | `(spell_version_id,spell_list_key)` and reverse `spell_list_key IN (...)` | owner/value unique and list-key reverse index | COVERED |
| Spell metadata child tables (attack modes, conditions, damage, saves, tags) | owner/value point/list, or reverse value filtering | owner/value uniques plus reverse value indexes | COVERED+ORDER |
| Spell cantrip/upcast/publication children | owner list ordered by level/source | owner/level or owner/source unique | COVERED+ORDER |
| Per-spell projector child reads (`spell-content-projector-v1.ts:565-570`) | six owner queries per spell | child owner indexes all cover | COVERED but N+1; batch rewrite beats new indexes |
| Slot point/owner reads (eligibility, assignment, builders, sharing) | rowid; `(character_id,slot_key)`; `character_id+state`; `character_id+bucket`; source+state; collection | rowid and seven existing slot indexes | COVERED |
| Active slot ordered reads (`guided-creation.ts:2293-2319`; workspace/completeness/share) | active character rows ordered by source, slot sort, ordinal/id | character/state finds rows but does not order them | PARTIAL; partial active order index proposed/PROFILE |
| Reverse fixed/current spell references (`catalog-importer.ts:1007`) | `fixed_spell_version_id=? OR current_spell_version_id=?` | two landed partial reverse indexes | COVERED; keep as two probes/UNION arms for planner clarity |
| Wizard spellbook source reconciliation | `(source_instance_id,rule_key,ordinal)` | source/rule/ordinal unique | COVERED+ORDER |
| Wizard active character membership/list (`spell-access-builder.ts:566-667`; workspace/share/completeness) | `character_id=? AND state='active'`, optional version and source-state join, ordered source/rule/ordinal or spell name | character/state and partial character/spell unique cover lookup, not output order/projection | PARTIAL; active order/covering index proposed/PROFILE |
| Wizard reverse spell reference (`catalog-importer.ts:1007`) | `spell_version_id=?` regardless of character | no spell-first index | **UNCOVERED**; reverse partial/covering index proposed |
| Spell loadout owner reads | `spell_loadouts.character_id=?`; entries by `spell_loadout_id` | loadout rowid only; entry owner/spell/role unique | entries COVERED; owner loadout **UNCOVERED**, but prior trial rejected its index |
| Spell loadout reverse reference/disclosure | `spell_loadout_entries.spell_version_id=?`, then loadout owner | current entry unique is loadout-first | **UNCOVERED**; reverse `(spell_version_id,spell_loadout_id)` proposed/PROFILE |
| Spell preferences owner point/list | `(character_id,spell_version_id)` | owner/spell unique | COVERED |
| Spell preference reverse reference | `spell_version_id=?` | current unique is character-first | **UNCOVERED**; reverse `(spell_version_id,character_id)` proposed/PROFILE |
| Ritual tag fallback (`spell-access-builder.ts:667`) | per spell `EXISTS(owner,tag='ritual')` | tag owner/value unique | COVERED but N+1; project the flag into the main query |
| Import reference UNION (`catalog-importer.ts:1007`) | five reverse arms over slots, spellbook, loadout entries, preferences | slot arms covered; three other arms uncovered as above | PARTIAL until three reverse indexes or a measured rewrite land |

### Maintenance, VTT, scripts, and complete source-site ledger

| Query family and statement sites | Predicate / join / order shape | Existing service | Verdict |
|---|---|---|---|
| Party document state (`worker/handlers/party.ts:253,268,351`) | exact `(forge,repository,path)` and repository/path list | PK autoindex | COVERED+ORDER for exact identity; repository-only enumeration remains a tiny PROFILE candidate |
| Party document character reverse FK | nullable `character_id=?` during character delete/SET NULL | PK is forge/repository/path | **UNCOVERED**; P9 partial |
| VTT session revisions (`session-persistence.ts:305,316,353`) | `(session_id,revision)` point/latest/list ordered by revision | PK `(session_id,revision)` | COVERED+ORDER |
| Database/candidate audit schema metadata | `sqlite_schema`, PRAGMAs, dynamically allowlisted snapshot tables | SQLite system indexes or deliberate complete audit scans | SCAN-INTENTIONAL |
| Migration/retirement scripts | primary-key deletes, catalog-key joins, and one-time complete table rewrites | existing PK/content/owner indexes; whole migrations scan once | COVERED or SCAN-INTENTIONAL; never add an index solely for a one-shot migration |
| SRD/catalog seed synchronization | point upserts by content/owner unique keys; delete-and-reinsert bounded child sets | existing UNIQUE indexes enforce and locate rows | COVERED; write cost occurs at seed time |
| `scripts/perf/explain-catalog.ts` and `explain-queries.mjs` | copies of production hot shapes plus explicit proposed alternatives | mapped in the corresponding rows above | diagnostic, not an independent reason to index |
| `scripts/perf/relationship-index-trials.ts` | measured source/slot/spell reverse candidates | landed indexes named above; rejected loadout-owner candidate remains rejected | evidence-only |
| DB size audit aggregate/full-table queries | `dbstat`, schema objects, grouped catalog summaries | intentional database-wide analysis | SCAN-INTENTIONAL |

The eight SQL-bearing calls whose first argument remains imported or
runtime-composed after
local constant/template resolution are:

| Site | Builder/value | Coverage |
|---|---|---|
| `archive-set-lifecycle.ts:182` | `contentQuery('identity.content_key = ?')` | identity PK/content-key definition indexes; COVERED |
| `bundled-content-digest-v1.ts:455` | closed `slice.sql` digest slices | owner/content indexes or SCAN-INTENTIONAL whole slice |
| `bundled-content-registry-v1.ts:206` | registry query selected from a closed kind table | definition content-key/name indexes; COVERED |
| `content-adoption.ts:729` | scalar query from the closed adoption table plan | content/owner indexes; complete-row comparison scans intentional |
| `db/candidate-audit.ts:181` | shared `selectObject(sql)` audit helper | caller shapes are PK/metadata checks or SCAN-INTENTIONAL audits |
| `character-list-builder.ts:23` | imported `ACTIVE_CHARACTER_LIST_QUERY` | `characters_archive_list_index`; COVERED+ORDER |
| `class-progression-lookup.ts:259` | closed progression/resource lookup SQL | class owner/level indexes; COVERED |
| `origins-srd.ts:1145` | closed seed synchronization scalar | content/owner unique key; COVERED |

The following ledger is the completeness cross-check. It lists every resolved
production/perf predicate-bearing SQL call site used to form the family matrix.
Multiple sites on one line can normalize to the same query. The ledger total is
937 sites; 774 normalized shapes remain after literal/whitespace normalization.

| Module | Sites | Call lines |
|---|---:|---|
| `src/access/spell-access-builder.ts` | 7 | 371, 407, 566, 625, 667, 704, 838 |
| `src/authoring/archive-set-lifecycle.ts` | 20 | 203, 221, 240, 302, 366, 583, 596, 637, 644, 651, 684, 715, 747, 763, 768, 775, 784, 821, 829, 857 |
| `src/authoring/background-publisher.ts` | 3 | 168, 408, 457 |
| `src/authoring/bundled-homebrew-installer.ts` | 3 | 144, 184, 285 |
| `src/authoring/draft-service.ts` | 14 | 431, 482, 728, 799, 833, 866, 885, 968, 1007, 1084, 1103, 1119, 1169, 1265 |
| `src/authoring/reference-retarget.ts` | 45 | 122, 149, 188, 196, 308, 358, 620, 659, 732, 766, 852, 915, 934, 954, 979, 989, 1004, 1027, 1096, 1228, 1234, 1240, 1256, 1282, 1289, 1315, 1328, 1334, 1360, 1406, 1441, 1460, 1480, 1503, 1527, 1546, 1566, 1584, 1592, 1612, 1626, 1637, 1649, 1666, 1680 |
| `src/authoring/species-publisher.ts` | 4 | 114, 129, 602, 655 |
| `src/authoring/subclass-publisher.ts` | 3 | 579, 830, 873 |
| `src/backup/character-backup.ts` | 20 | 1830, 1937, 1969, 1994, 2092, 2110, 2162, 2233, 2512, 2529, 2704, 2716, 2875, 2918, 2966, 3012, 3597, 3607, 3658, 4230 |
| `src/backup/portable-content.ts` | 24 | 749, 765, 789, 804, 866, 879, 894, 926, 938, 1012, 1078, 1106, 1127, 1155, 1601, 1618, 1690, 1692, 1810, 1815, 1841, 2004, 2096, 2257 |
| `src/builder/equipment-step.ts` | 1 | 163 |
| `src/builder/guided-creation.ts` | 56 | 197, 224, 377, 402, 434, 467, 474, 527, 563, 571, 579, 593, 638, 735, 783, 945, 973, 1025, 1103, 1177, 1207, 1252, 1261, 1265, 1285, 1293, 1316, 1394, 1403, 1446, 1461, 1526, 1546, 1589, 1613, 1651, 1747, 1760, 1778, 1843, 1870, 1998, 2068, 2114, 2157, 2177, 2235, 2261, 2274, 2293, 2295, 2363, 2485, 2508, 2530, 2565 |
| `src/builder/required-fighter-choices.ts` | 8 | 28, 52, 97, 131, 150, 236, 247, 276 |
| `src/builder/species-choice.ts` | 6 | 50, 104, 198, 229, 261, 371 |
| `src/catalog/authoring-lifecycle.ts` | 3 | 75, 81, 128 |
| `src/catalog/bundled-content-digest-v1.ts` | 3 | 136, 397, 423 |
| `src/catalog/bundled-content-registry-v1.ts` | 4 | 295, 321, 364, 409 |
| `src/catalog/bundled-source-membership.ts` | 1 | 57 |
| `src/catalog/catalog-data-migrations.ts` | 1 | 265 |
| `src/catalog/catalog-importer.ts` | 24 | 386, 393, 542, 556, 579, 590, 625, 685, 779, 793, 812, 819, 828, 879, 941, 976, 991, 1007, 1033, 1068, 1090, 1117, 1150, 1165 |
| `src/catalog/catalog-lineage-delete-guard.ts` | 1 | 36 |
| `src/catalog/content-adoption.ts` | 7 | 299, 489, 741, 768, 808, 852, 999 |
| `src/catalog/content-provenance.ts` | 1 | 67 |
| `src/catalog/content-registry.ts` | 19 | 217, 246, 270, 285, 335, 353, 417, 443, 505, 685, 893, 957, 1053, 1077, 1092, 1103, 1131, 1171, 1232 |
| `src/catalog/equipment-content-projector-v1.ts` | 4 | 408, 457, 493, 499 |
| `src/catalog/equipment-importer.ts` | 1 | 397 |
| `src/catalog/historical-contribution-gaps.ts` | 1 | 65 |
| `src/catalog/reconcile-species-lineage-content-v2.ts` | 3 | 46, 62, 83 |
| `src/catalog/recorded-source-provenance.ts` | 3 | 82, 116, 141 |
| `src/catalog/retire-non-srd-bundled-subclasses-v1.ts` | 11 | 67, 88, 93, 103, 117, 126, 137, 148, 156, 165, 174 |
| `src/catalog/source-content-importer.ts` | 7 | 119, 257, 371, 443, 455, 620, 656 |
| `src/catalog/source-content-projector-v1.ts` | 4 | 530, 678, 865, 875 |
| `src/catalog/spell-catalog-disclosure.ts` | 1 | 24 |
| `src/catalog/spell-content-projector-v1.ts` | 14 | 377, 388, 393, 398, 403, 408, 413, 552, 565, 566, 567, 568, 569, 570 |
| `src/catalog/spell-fork.ts` | 2 | 150, 290 |
| `src/catalog/stored-authored-content-projector-v1.ts` | 21 | 477, 517, 550, 1330, 1348, 1375, 1379, 1387, 1422, 1491, 1498, 1505, 1658, 1662, 1666, 1726, 1907, 1929, 1970, 2046, 2149 |
| `src/catalog/stored-content-projector-v1.ts` | 1 | 99 |
| `src/catalog/subclass-importer.ts` | 7 | 118, 177, 223, 315, 358, 395, 412 |
| `src/character/character-state.ts` | 5 | 713, 728, 794, 818, 1049 |
| `src/commands/acknowledge-warning.ts` | 2 | 104, 121 |
| `src/commands/add-source.ts` | 3 | 65, 150, 229 |
| `src/commands/allocate-abilities.ts` | 2 | 55, 63 |
| `src/commands/audit-log.ts` | 1 | 51 |
| `src/commands/character-command-executor.ts` | 16 | 674, 719, 745, 891, 910, 967, 986, 1022, 1027, 1074, 1107, 1157, 1240, 1252, 1279, 1289 |
| `src/commands/character-command-preflight.ts` | 4 | 108, 121, 158, 173 |
| `src/commands/choose-fighting-style.ts` | 4 | 86, 128, 155, 172 |
| `src/commands/choose-species-lineage.ts` | 6 | 113, 192, 203, 207, 239, 246 |
| `src/commands/delete-warning-acknowledgement.ts` | 2 | 58, 71 |
| `src/commands/equipment-effects.ts` | 5 | 195, 211, 236, 243, 328 |
| `src/commands/items.ts` | 10 | 80, 114, 121, 132, 161, 285, 310, 371, 441, 509 |
| `src/commands/level-feat-choice.ts` | 5 | 159, 183, 223, 268, 280 |
| `src/commands/level-up-class.ts` | 12 | 120, 129, 142, 177, 195, 217, 252, 297, 424, 535, 550, 563 |
| `src/commands/level-up-spell-replacement.ts` | 1 | 13 |
| `src/commands/remove-source.ts` | 2 | 41, 66 |
| `src/commands/resolve-level-feat-choice.ts` | 2 | 38, 77 |
| `src/commands/set-multiclass-prerequisite-house-rule.ts` | 1 | 16 |
| `src/commands/set-slot/restore.ts` | 1 | 34 |
| `src/commands/set-slot/shared.ts` | 2 | 123, 163 |
| `src/commands/sheet-inputs.ts` | 4 | 181, 192, 256, 263 |
| `src/commands/srd-spell-policy.ts` | 5 | 31, 49, 59, 81, 113 |
| `src/commands/update-ability.ts` | 2 | 47, 72 |
| `src/commands/update-character-flavor.ts` | 3 | 72, 100, 136 |
| `src/commands/update-character-rules.ts` | 3 | 30, 39, 50 |
| `src/commands/update-class.ts` | 13 | 107, 142, 192, 214, 230, 271, 329, 349, 364, 403, 444, 463, 472 |
| `src/commands/update-source-config.ts` | 8 | 108, 135, 170, 185, 199, 218, 237, 263 |
| `src/commands/weapons.ts` | 4 | 220, 462, 526, 564 |
| `src/db/application-seed-profile.ts` | 1 | 46 |
| `src/db/candidate-audit.ts` | 9 | 213, 223, 255, 267, 409, 648, 685, 694, 837 |
| `src/db/database-lifecycle.ts` | 1 | 185 |
| `src/db/database.ts` | 1 | 31 |
| `src/eligibility/eligible-spell-search.ts` | 4 | 134, 193, 207, 237 |
| `src/eligibility/spell-selection-assignment.ts` | 7 | 99, 130, 146, 195, 205, 229, 244 |
| `src/eligibility/spell-selection-collection.ts` | 4 | 88, 108, 168, 219 |
| `src/eligibility/spell-selection-eligibility.ts` | 11 | 92, 101, 169, 181, 237, 251, 277, 300, 323, 337, 360 |
| `src/eligibility/spell-selection-service.ts` | 1 | 61 |
| `src/grants/character-level-source-reconciliation.ts` | 5 | 27, 47, 69, 110, 130 |
| `src/grants/configured-choice-material-reader.ts` | 1 | 43 |
| `src/grants/equipment-grants.ts` | 13 | 144, 152, 163, 205, 243, 263, 279, 283, 315, 351, 395, 464, 488 |
| `src/grants/grant-rule-slot-generator.ts` | 22 | 373, 381, 397, 446, 454, 530, 605, 703, 765, 787, 804, 831, 852, 881, 905, 915, 928, 949, 964, 997, 1028, 1054 |
| `src/grants/skill-expertise-grants.ts` | 12 | 106, 144, 190, 205, 223, 257, 277, 295, 311, 335, 409, 450 |
| `src/grants/skill-grants.ts` | 25 | 113, 136, 185, 201, 241, 258, 288, 296, 329, 397, 415, 446, 485, 502, 522, 541, 554, 579, 605, 613, 660, 779, 833, 851, 884 |
| `src/grants/source-rule-reader.ts` | 8 | 193, 232, 256, 273, 314, 325, 347, 365 |
| `src/queries/background-equipment.ts` | 1 | 100 |
| `src/queries/catalog-queries.ts` | 4 | 263, 282, 304, 384 |
| `src/queries/character-catalog-disclosures.ts` | 6 | 35, 90, 121, 151, 183, 240 |
| `src/queries/character-completeness.ts` | 9 | 420, 691, 731, 864, 928, 1039, 1105, 1289, 1317 |
| `src/queries/character-crud.ts` | 2 | 132, 147 |
| `src/queries/character-list-builder.ts` | 1 | 35 |
| `src/queries/character-sheet-builder.ts` | 12 | 825, 1007, 1368, 1403, 1458, 1483, 1511, 1521, 1573, 1619, 1653, 1690 |
| `src/queries/character-spell-section-builder.ts` | 6 | 494, 673, 696, 774, 811, 843 |
| `src/queries/character-workspace-builder.ts` | 11 | 272, 293, 369, 378, 425, 489, 517, 585, 707, 738, 766 |
| `src/queries/class-proficiency-lookup.ts` | 3 | 90, 120, 174 |
| `src/queries/items.ts` | 2 | 34, 67 |
| `src/queries/level-up-planned-choices.ts` | 6 | 277, 300, 358, 384, 404, 433 |
| `src/queries/level-up-planned-eligible-spells.ts` | 7 | 100, 129, 211, 220, 292, 311, 343 |
| `src/queries/level-up-progress.ts` | 3 | 53, 71, 79 |
| `src/queries/level-up-state.ts` | 8 | 479, 508, 562, 596, 857, 893, 1038, 1113 |
| `src/queries/multiclass-primary-ability.ts` | 1 | 58 |
| `src/queries/operation-history.ts` | 2 | 72, 88 |
| `src/queries/order-sources.ts` | 1 | 12 |
| `src/queries/print-appendix-preferences.ts` | 3 | 53, 83, 104 |
| `src/queries/save-points.ts` | 3 | 48, 62, 85 |
| `src/queries/weapons.ts` | 2 | 189, 222 |
| `src/reports/build-report-builder.ts` | 9 | 446, 546, 587, 597, 638, 672, 694, 784, 929 |
| `src/rules/background-definitions-srd.ts` | 2 | 120, 157 |
| `src/rules/character-level.ts` | 2 | 52, 60 |
| `src/rules/class-equipment-srd.ts` | 4 | 247, 256, 304, 311 |
| `src/rules/class-level-features-srd.ts` | 1 | 315 |
| `src/rules/class-progression-lookup.ts` | 6 | 314, 372, 423, 611, 676, 686 |
| `src/rules/class-resources-srd.ts` | 7 | 774, 809, 858, 889, 904, 936, 950 |
| `src/rules/eligible-character-effects.ts` | 1 | 212 |
| `src/rules/equipment-package-display.ts` | 3 | 78, 85, 93 |
| `src/rules/equipment-packages.ts` | 1 | 163 |
| `src/rules/feats-srd.ts` | 2 | 455, 502 |
| `src/rules/generated-feature-effects.ts` | 5 | 119, 182, 188, 213, 230 |
| `src/rules/legacy-level-feat-choices.ts` | 6 | 69, 78, 98, 111, 119, 143 |
| `src/rules/multiclass-prerequisite-gate.ts` | 3 | 206, 233, 263 |
| `src/rules/multiclass-prerequisite-house-rule.ts` | 3 | 71, 84, 110 |
| `src/rules/origin-definitions-srd.ts` | 2 | 441, 477 |
| `src/rules/origins-srd.ts` | 5 | 1263, 1271, 1373, 1469, 1478 |
| `src/rules/sheet-content-lookup.ts` | 9 | 173, 204, 240, 270, 296, 332, 347, 398, 410 |
| `src/rules/sheet-feature-values.ts` | 3 | 258, 273, 464 |
| `src/rules/sheet-srd.ts` | 15 | 95, 119, 130, 137, 165, 209, 227, 370, 394, 606, 706, 751, 765, 775, 818 |
| `src/rules/source-effect-retcon.ts` | 1 | 12 |
| `src/rules/spells-srd.ts` | 19 | 432, 445, 590, 613, 702, 711, 738, 753, 766, 771, 790, 801, 836, 864, 976, 999, 1004, 1010, 1019 |
| `src/rules/srd-subclass-content.ts` | 11 | 226, 267, 287, 355, 377, 385, 427, 444, 448, 550, 569 |
| `src/rules/weapon-mastery-lookup.ts` | 3 | 88, 104, 120 |
| `src/rules/weapons-srd.ts` | 5 | 566, 576, 583, 589, 769 |
| `src/sharing/character-share.ts` | 54 | 359, 737, 774, 791, 798, 804, 914, 940, 950, 993, 1039, 1051, 1069, 1079, 1085, 1142, 1153, 1159, 1170, 1180, 1204, 1211, 1228, 1234, 1240, 1252, 1275, 1299, 1479, 1490, 1643, 1821, 1930, 2020, 2245, 2266, 2322, 2325, 2331, 2337, 2354, 2362, 2603, 2650, 2663, 2695, 2708, 2763, 2791, 2835, 2859, 2893, 3327, 3342 |
| `src/vtt/session-persistence.ts` | 3 | 305, 316, 353 |
| `src/worker/handlers/catalog.ts` | 1 | 122 |
| `src/worker/handlers/party.ts` | 3 | 253, 268, 351 |
| `src/worker/handlers/system.ts` | 3 | 152, 183, 275 |
| `scripts/perf/explain-catalog.ts` | 5 | 37, 88, 151, 187, 496 |
| `scripts/perf/explain-queries.mjs` | 27 | 98, 108, 114, 120, 145, 337, 344, 365, 555, 566, 567, 574, 584, 589, 594, 596, 600, 605, 621, 625, 629, 730, 767, 772, 778, 782, 786 |
| `scripts/perf/measure-seed-profiles.test.ts` | 1 | 31 |
| `scripts/perf/relationship-index-trials.ts` | 8 | 217, 228, 248, 269, 458, 464, 495, 529 |

### Hot-path query strings in tests

These test statements either create the data shape and then call a production
read model, or directly inspect the rows behind that read model. Their SELECTs
are storage oracles, not extra production workload, so a test-only predicate
does not by itself justify an index. They corroborate the character, spell,
catalog, and eligibility families above. Exact hot-path call-site ledger:

| Test module | SQL call lines | Coverage family |
|---|---|---|
| `tests/integration/eligibility/has-any.test.ts` | 24, 32, 48, 81, 86, 90, 120, 126 | eligible spell/slot point/search; COVERED |
| `tests/integration/eligibility/persistence.test.ts` | 101, 149, 162, 171, 175, 185, 204, 214, 225 | slot owner/state/reverse; COVERED |
| `tests/integration/eligibility/planned-durable-equivalence.test.ts` | 121, 182 | slot point and spell candidate; COVERED |
| `tests/integration/queries/character-sheet-feature-values.test.ts` | 50, 249, 263, 295, 315, 327, 353, 362, 367 | feature/contribution owner reads; COVERED, bounded sorts |
| `tests/integration/queries/character-sheet-resources.test.ts` | 38, 67, 238, 251, 289 | class resource owner/level; COVERED+ORDER |
| `tests/integration/queries/character-sheet-spells-fixture.ts` | 198, 361, 551, 879, 905 | spell slot/book fixture state; mapped to spell families |
| `tests/integration/queries/character-sheet-spells.test.ts` | 79, 181, 525, 554 | spellbook/slot read models; PARTIAL ordered active rows |
| `tests/integration/queries/character-sheet.test.ts` | 43, 76, 88, 119, 136, 162, 175, 188, 195, 230, 397, 419, 461, 624, 649, 1036, 1045, 1082, 1113, 1134, 1145, 1163, 1255, 1298 | aggregate owner reads; COVERED except proposed ordered composites |
| `tests/integration/queries/completeness.test.ts` | 142, 157, 164, 368, 522 | sources/slots/spellbook; PARTIAL ordered active rows |
| `tests/integration/queries/crud-and-history.test.ts` | 23, 68, 80, 84, 105, 137, 191, 198, 319 | rowid CRUD and history indexes; COVERED+ORDER |
| `tests/integration/queries/level-up-preview.test.ts` | 91, 99, 109, 142, 156, 171, 213, 238, 275, 395, 433, 477, 500 | class/source/feat/spell candidate families; COVERED |
| `tests/integration/queries/level-up-wizard.test.ts` | 247, 260, 333, 366, 396, 453, 461, 475, 486, 539, 615, 791, 809, 870, 875, 895, 1034, 1043, 1079, 1174, 1247, 1297, 1465 | spellbook/slot hot path; three reverse/active-order proposals |
| `tests/integration/queries/list-and-workspace.test.ts` | 69, 111, 137, 159, 173, 185, 196, 321, 351, 414, 480, 492, 506, 510, 558 | character list/workspace catalog and owner reads |
| `tests/integration/queries/multiclass-primary-ability.test.ts` | 25, 82, 171, 180, 256, 280, 292, 309, 332, 390, 406 | class-level/source point joins; COVERED |
| `tests/integration/queries/multiclass-skill-completeness.test.ts` | 100, 123, 158, 245, 365, 386 | skill grant owner/source families; PARTIAL order |
| `tests/integration/queries/rpc.test.ts` | 111, 129, 145, 180, 265, 369, 413, 430, 504, 539, 555 | same read models through RPC; no new shape |
| `tests/integration/queries/weapon-proficiency-agreement.test.ts` | 35 | class weapon owner/category; COVERED+ORDER |
| `tests/unit/queries/selectable-catalog-content.test.ts` | 116, 125, 131 | identity selectable predicate; PK join plus archive/list indexes |

In addition, `tests/unit/db/migrations.test.ts` has 139 predicate-bearing
schema/migration statements, including the landed relationship-index and
active-spell-index plan checks. Those statements validate DDL/history and are
not endpoint traffic. The broad authoring/catalog/builder fixture surface has
684 more predicate-bearing test call sites; it is deliberately excluded from
index demand because those are setup/storage assertions. Any test query that
exactly duplicates a production statement inherits the matrix result above.

## Proposed new indexes

### A. Obviously safe relationship and missing-owner coverage

These close an observed query or an unindexed child-key lookup. For composite
foreign keys, the most selective referenced id is first; `character_id` is
second as an ownership guard. Nullable relationships use partial indexes so
null rows do not consume pages.

| ID | Proposed DDL | Serves / reason | Adoption |
|---|---|---|---|
| P1 | `CREATE INDEX character_save_points_character_id_id_index ON character_save_points(character_id,id DESC);` | list by character in `save-points.ts:48`; equality owner first, then requested descending order | **ADOPT**; obvious gap |
| P2 | `CREATE INDEX character_effects_source_character_index ON character_effects(source_instance_id,character_id) WHERE source_instance_id IS NOT NULL;` | retarget/source-owned effect reads and deletes; source id is selective, character closes ownership | **ADOPT** |
| P3 | `CREATE INDEX character_items_source_character_index ON character_items(source_instance_id,character_id) WHERE source_instance_id IS NOT NULL;` | `reference-retarget.ts` source-owned item enumeration and composite FK/cascade checks | **ADOPT** |
| P4 | `CREATE INDEX character_level_feat_choices_source_character_index ON character_level_feat_choices(feat_source_instance_id,character_id) WHERE feat_source_instance_id IS NOT NULL;` | retarget query and source-delete trigger | **ADOPT** |
| P5 | `CREATE INDEX background_templates_default_origin_feat_index ON background_templates(default_origin_feat_content_key) WHERE default_origin_feat_content_key IS NOT NULL;` | feat-category preservation trigger and FK checks | **ADOPT**; tiny seed-time write cost |
| P6 | `CREATE INDEX spell_identity_aliases_identity_alias_index ON spell_identity_aliases(spell_identity_id,normalized_alias,alias);` | portable-content alias export `WHERE spell_identity_id=? ORDER BY normalized_alias,alias`; also FK reverse lookup | **ADOPT**; covering ordered read |
| P7 | `CREATE INDEX catalog_match_decisions_target_index ON catalog_content_match_decisions(content_kind,target_content_key);` | archive-set purge by kind/target and FK reverse restriction | **ADOPT** |
| P34 | `CREATE INDEX catalog_content_aliases_target_index ON catalog_content_aliases(content_kind,content_key,alias_key);` | identity delete/cascade and target export; kind equality then target key, with alias key for stable covering enumeration | **ADOPT** |
| P8 | `CREATE INDEX catalog_replacement_choices_successor_index ON catalog_content_replacement_choices(content_kind,successor_content_key,character_id);` | reverse successor FK/delete checks; PK only covers superseded key | **ADOPT** if replacement rows can scale; otherwise PROFILE-low |
| P9 | `CREATE INDEX party_document_states_character_index ON party_document_states(character_id) WHERE character_id IS NOT NULL;` | `characters` delete/SET NULL child lookup | **ADOPT** if party state is retained; tiny partial index |
| P10 | `CREATE INDEX character_class_levels_definition_character_index ON character_class_levels(class_definition_id,character_id);` | class-definition reverse FK/delete checks and definition-first audits | **ADOPT** for complete FK coverage; low urgency |
| P11 | `CREATE INDEX character_class_levels_subclass_character_index ON character_class_levels(subclass_definition_id,character_id) WHERE subclass_definition_id IS NOT NULL;` | subclass composite FK reverse checks | **ADOPT** for complete FK coverage; low urgency |
| P12 | `CREATE INDEX background_equipment_items_weapon_index ON background_equipment_items(weapon_template_id) WHERE weapon_template_id IS NOT NULL;` and analogous `armor_template_id` | equipment template reverse FKs | safe but seed-only/low priority |
| P13 | `CREATE INDEX class_equipment_items_weapon_index ON class_equipment_items(weapon_template_id) WHERE weapon_template_id IS NOT NULL;` and analogous `armor_template_id` | equipment template reverse FKs | safe but seed-only/low priority |

P12/P13 should not be justified as endpoint indexes: those tables are normally
built and read as complete per-definition packages at seed/build time. Their
only case is complete foreign-key reverse coverage. If template deletion is
not a supported runtime operation, call them out and do not add them.

### B. Reverse spell-reference indexes

| ID | Proposed DDL | Column-order / covering rationale | Adoption |
|---|---|---|---|
| P14 | `CREATE INDEX wizard_spellbook_entries_spell_active_cover ON wizard_spellbook_entries(spell_version_id,state,character_id,source_instance_id) WHERE spell_version_id IS NOT NULL;` | `spell_version_id` is the reverse probe; state next supports active membership; character/source make the import probe covering | **PROFILE**, highest measured candidate |
| P15 | `CREATE INDEX spell_loadout_entries_spell_loadout_index ON spell_loadout_entries(spell_version_id,spell_loadout_id);` | reverse spell probe first; loadout id covers owner join | **PROFILE** |
| P16 | `CREATE INDEX character_spell_preferences_spell_character_index ON character_spell_preferences(spell_version_id,character_id);` | exact reverse of existing owner-first unique; both columns cover reference test | **PROFILE**; probably small absolute win |

These are not redundant with owner-first UNIQUE indexes: B-tree direction is
not reversible across the left-prefix rule. P14-P16 directly close three
UNCOVERED arms in `CatalogImporter.#isReferenced()`.

### C. Partial ordered indexes for active interactive state

| ID | Proposed DDL | Column-order / coverage rationale | Adoption |
|---|---|---|---|
| P17 | `CREATE INDEX source_instances_active_display_index ON character_source_instances(character_id,source_type,display_name,id) WHERE state='active';` | partial predicate removes the low-selectivity state column; owner equality then disclosure order | PROFILE; compare with current `(character_id,state)` before replacing it |
| P18 | `CREATE INDEX source_instances_active_id_index ON character_source_instances(character_id,id) WHERE state='active';` | alternate for the more common owner/id order | PROFILE; choose P17 **or** P18 from query counts, not both initially |
| P19 | `CREATE INDEX skill_grants_active_order_index ON character_skill_grants(character_id,source_instance_id,grant_key,ordinal,id) WHERE state='active';` | owner equality, then exact resolver/share order | PROFILE |
| P20 | `CREATE INDEX expertise_grants_active_order_index ON character_skill_expertise_grants(character_id,source_instance_id,granted_at_class_level,ordinal,id) WHERE state='active';` | owner equality, then exact resolver/share order | PROFILE |
| P21 | `CREATE INDEX spell_slots_active_order_index ON spell_selection_slots(character_id,source_instance_id,sort_order,ordinal,id) WHERE state='active';` | active character slot builders order/group by source and slot order | PROFILE |
| P22 | `CREATE INDEX wizard_entries_active_order_index ON wizard_spellbook_entries(character_id,source_instance_id,rule_key,ordinal,id,spell_version_id) WHERE state='active';` | active owner read ordered by source/rule/ordinal; spell id makes the common membership projection covering | PROFILE; wide |
| P23 | `CREATE INDEX catalog_identities_listed_active_name_index ON catalog_content_identities(content_kind,normalized_name,content_key) WHERE archived_at IS NULL AND visibility='listed';` | fixed kind equality then UI name/key order; excludes hidden/archived catalog rows | PROFILE; catalog is read-heavy so write cost is trivial |

P17/P18 are mutually exclusive alternatives. If P17 replaces
`character_source_instances_character_id_state_index`, verify every query that
asks for tombstoned rows: a partial active index cannot serve it. Likewise,
P19-P22 supplement rather than automatically replace all-state indexes.

### D. Owner-plus-order replacement composites

These are complete-coverage candidates for residual sorts. They are not all
worth landing: most character aggregates contain tens, not thousands, of rows.
The shorter existing owner index should be removed only when the replacement
has the same first column and endpoint/write trials win.

| ID | Proposed DDL | Existing index potentially subsumed | Adoption |
|---|---|---|---|
| P24 | `character_effects(character_id,sort_order,id)` | `character_effects_character_id_index` | PROFILE; common sheet/effect order |
| P25 | `character_species_traits(character_id,sort_order,id)` | `character_species_traits_character_id_index` | PROFILE-low |
| P26 | `character_weapons(character_id,id)` | `character_weapons_character_id_index` | PROFILE-low; row counts small |
| P27 | `character_items(character_id,name,id)` | `character_items_character_id_index` | PROFILE; benefits sheet/item display, but id-ordered consumers still sort |
| P28 | `character_class_levels(character_id,id)` | none; owner/class-definition UNIQUE remains an invariant | PROFILE-low |
| P29 | `character_level_feat_choices(character_id,id)` | `character_level_feat_choices_character_id_index` | PROFILE-low |
| P30 | `class_feature_effects(class_definition_id,class_level,name)` | existing owner/name/level unique cannot be removed because it enforces a different invariant | PROFILE-low; catalog-sized |
| P31 | `catalog_content_identities(catalog_layer,content_kind,content_key)` | `catalog_content_identities_layer_kind_index` | PROFILE for external export ordering |
| P32 | `catalog_content_archive_members(character_id,content_kind,content_key)` | none | PROFILE; only archive UI/purge benefits |
| P33 | `catalog_content_match_decisions(reviewed_at DESC,content_kind,incoming_fingerprint_digest)` | none | PROFILE; only if review list becomes material |

### E. Covering-index variants

SQLite has no `INCLUDE`, so every covered projection becomes a key column.
These variants trade table lookups for larger B-trees and should wait for
`count + totalMs` evidence:

- P1-cover: `(character_id,id DESC,label,created_at)` covers the save-point
  list. Prefer lean P1 unless the list is measurably hot.
- P17-cover: `(character_id,source_type,display_name,id,source_definition_id,
  config)` `WHERE state='active'` covers ritual/source disclosure; `config` can
  be large, so omit it unless table lookups dominate.
- P19/P20/P22 cover their lookup and ordering keys, but payload columns still
  require table visits. Do not append note/timestamp/error text columns merely
  to force full covering status.
- P14 is deliberately covering for the reverse reference and active membership
  checks.
- Do not build a covering spell catalog index containing summaries/components:
  those text values would dwarf the table and the active level/name index
  already finds the first 50 candidates.

### F. UNIQUE indexes and invariants

No new UNIQUE index is justified solely by this audit. The schema's 84 existing
UNIQUE indexes already encode the real identities: content keys, one owned
background/species/adjustment row, one class definition per character, sourced
grant ordinals, one active filled skill/spell per character, and ordered child
identities. A violation of one of those means two rows claim the same domain
identity and reads become ambiguous; retaining those indexes is non-negotiable.

Tempting new uniqueness constraints were rejected:

- `UNIQUE(character_id,name)` on spell loadouts or save points would mean a
  user cannot intentionally reuse a display label; that is not an invariant.
- `UNIQUE(name,rules_edition)` on user-authorable definitions would reject two
  homebrew objects with the same display name, causing import/data loss.
- `UNIQUE(spell_identity_id,rules_edition)` on spell versions would reject
  legitimate alternate/forked versions.
- review/publication identifiers were not proven globally unique by the schema
  or calling code. Add such an index only with an explicit domain decision and
  migration policy; a violation would otherwise abort valid user data import.

## Redundant and shadowed existing indexes

### Existing indexes already shadowed

The following explicit non-unique indexes duplicate the exact left prefix of a
UNIQUE/primary-key B-tree and are removal candidates even without any new
index. Confirm with `EXPLAIN QUERY PLAN` and the migration path before removal;
SQLite autoindex names are implementation-generated, but their key order is
fixed by the declared primary/unique constraint.

| Removal candidate | Shadowing index | Reason / caution |
|---|---|---|
| `catalog_content_aliases_resolution_index(kind,alias)` | PK `(kind,alias,key)` | exact left prefix; PK also covers resolution |
| `catalog_content_fingerprints_resolution_index(kind,scheme,digest)` | PK `(kind,scheme,digest,key)` | exact left prefix |
| `background_equipment_items_background_template_id_index` | UNIQUE `(background_template_id,option,sort_order)` | exact owner prefix |
| `background_template_effects_background_template_id_index` | UNIQUE `(background_template_id,sort_order)` | exact owner prefix |
| `class_equipment_items_class_definition_id_index` | UNIQUE `(class_definition_id,option,sort_order)` | exact owner prefix |
| `item_definition_effects_definition_index` | UNIQUE `(item_definition_id,sort_order)` | exact owner prefix |

`catalog_content_identities_kind_key_unique` is **not** a removal candidate
even though `content_key` is the primary key: SQLite composite foreign keys
reference `(content_kind,content_key)` and require an exactly matching parent
key declaration. Likewise `(id,character_id)` owner UNIQUE indexes remain for
composite foreign keys even when rowid already identifies `id`.

### Existing indexes shadowed only if a proposal lands

| New index | Candidate removal | Gate |
|---|---|---|
| P24 effects owner/sort/id | `character_effects_character_id_index` | new index has same first column; verify write and all-state reads |
| P25 species traits owner/sort/id | `character_species_traits_character_id_index` | same prefix |
| P26 weapons owner/id | `character_weapons_character_id_index` | same prefix; keep `(id,character_id)` UNIQUE |
| P27 items owner/name/id | `character_items_character_id_index` | same prefix; id-order queries may still sort but lookup remains covered |
| P29 feat choices owner/id | `character_level_feat_choices_character_id_index` | same prefix |
| P31 identity layer/kind/key | `catalog_content_identities_layer_kind_index` | exact old prefix |

P17-P22 are partial `state='active'` indexes and therefore do **not** shadow
the existing all-state owner/state indexes. Do not remove an all-state index
merely because the active endpoint improves.

## Write amplification and storage cost

This database has two very different write profiles:

- Bundled/catalog data is read-heavy and is mostly built once during seed or
  import. An extra narrow B-tree on definition/child metadata has nearly
  trivial steady-state write amplification; the costs are seed time, database
  bytes, and WASM page-cache memory. P5-P8 and the optional P12/P13 live here.
- Character state is mutated interactively and transactionally. Every added
  owner/order index makes inserts, level-up, retarget, import, undo/redo, and
  sharing replacement update another B-tree. P17-P29 therefore need endpoint
  and write trials even when `EXPLAIN` looks cleaner.

Partial indexes keep tombstoned/orphaned/null rows out and are the preferred
shape for active-state and nullable-FK coverage. Covering indexes save table
lookups but multiply key bytes; text/JSON columns (`config`, summaries, notes,
snapshots) should almost never be included. P1 is narrow; its covering variant
is not automatically better.

The prior relationship trial is the cautionary example: four landed reverse
indexes added about 8.7% to a 1,000-write trial while delivering large endpoint
wins for the slot reverse pair; `spell_loadouts(character_id)` made the tested
endpoint 4% slower and was rejected. Measure alternating order, VM steps,
database bytes, and writes—not only planner choice.

### Intentionally unindexed complete scans

Do not add indexes for these statements: an index cannot avoid reading every
row, and several are executed only once while building/verifying seed data.

- `src/db/application-seed-profile.ts:46` table counts;
- `src/catalog/bundled-content-digest-v1.ts:136,397,423` complete canonical
  digest passes;
- `src/catalog/content-adoption.ts:299` allowlisted `SELECT * ... ORDER BY
  rowid` snapshot;
- complete SRD reconciliation scans in `src/rules/*-srd.ts` when they compare
  or rebuild an entire bounded definition table;
- `src/db/candidate-audit.ts` full snapshot/integrity passes;
- `scripts/perf/db-size-audit.mjs` `dbstat` and full grouped summaries;
- retirement/migration rewrites in
  `retire-non-srd-bundled-subclasses-v1.ts` and catalog migrations.

Tables such as armor/weapon templates and the class/background equipment
packages are normally populated at seed time and read as a complete package
for one owner. Their existing content/owner indexes are sufficient. P12/P13
are listed only for foreign-key reverse completeness; if template deletion is
seed-only, skip them rather than indexing a once-per-seed scan.

## Priority and validation gates

Priority is tied to `docs/perf/2026-08-26-test-suite-value-audit.md`: integration
accounts for roughly 70-80% of sampled test time, and its highest-value merge
groups are guided builder, character read models, catalog projectors, and
backup/share database pairs. Indexes should accelerate production behavior,
not be selected merely to shorten test fixture assertions.

1. **Land after normal schema review, no profile required:** P1-P7 and P34. They close
   actual uncovered owner/reverse paths and are narrow. P8-P13 are the same
   relationship shape but lower urgency; omit P12/P13 if deletion is seed-only.
2. **First profile-driven trial:** P14, P15, P16. They are exactly the three
   remaining uncovered spell-reference arms already ranked 1-3 by the test
   audit. Trial each independently and together; preserve the landed slot
   reverse indexes.
3. **Builder/read-model trial:** choose P17 versus P18, then independently test
   P19-P22. These target the audit's guided-builder merge group and character
   read-model merge group. Do not land all five as a bundle because attribution
   would be impossible.
4. **Catalog/read-heavy trial:** P23 and P31. Seed-time write cost is cheap, but
   validate that UI catalog statements retain predicates that imply the partial
   index. Pair this with the catalog projector merge group.
5. **Residual-sort trial:** P24-P30, P32, P33. Most operate on small owned sets
   and should wait unless the profile reports material total time or very high
   counts. Remove shadowed owner indexes in the same change when a replacement
   wins.
6. **Never resurrect without contrary endpoint evidence:** bare
   `spell_loadouts(character_id)`. The existing trial rejected it.

The next baseline suite run will provide a `SQL_QUERY_LOG` profile from
`src/db/query-log.ts`, aggregated as **count + totalMs per normalized
statement**. Use it to validate this order:

- **May proceed before profile:** P1-P7, P34, and removal of the six exact-prefix
  duplicates, subject to schema/migration verification.
- **Must wait for profile:** P14-P33 and all covering variants.
- **Profile questions:** Is the import reference UNION frequent enough for all
  three reverse indexes? Are active source/grant/slot reads common enough to
  dominate writes? Are residual per-character sorts visible at all? Does the
  catalog list retain `is_active`/visibility predicates consistently?

For each candidate, capture baseline/candidate `EXPLAIN QUERY PLAN`, statement
count and totalMs, endpoint wall time, VM steps if available, database bytes,
and a representative 1,000-write cost. An index wins only if the endpoint or a
real maintenance operation improves; an `EXPLAIN` plan change alone is not a
success criterion.

Before adding still more indexes, also test the three query rewrites called out
by the audit: fold the ritual-tag N+1 into the main wizard entry projection;
split/short-circuit the five-arm import reference test; and batch the six
per-spell projector child reads. Removing statement executions usually beats
making each repeated statement microscopically faster.
