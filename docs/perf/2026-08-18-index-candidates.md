# SQLite index candidates

Date: 2026-08-18

Scope: read-only index evidence for the catalog, character-source, grant,
spell-slot, spellbook, fingerprint, catalog-import, and spell-eligibility query
paths. This does not change `src/db/schema.sql` or its Drizzle sources.

## Method and measured fixture

`src/db/schema.sql` currently defines 87 tables, 132 explicit indexes (82
unique), and 20 triggers. I inspected all of it, then audited SQL readers under
`src/queries`, `src/grants`, `src/catalog`, and `src/eligibility`.

The reproducible harness is `scripts/perf/explain-catalog.mjs`, backed by
`scripts/perf/explain-catalog.ts`. Run it from the repository root:

```sh
node scripts/perf/explain-catalog.mjs
```

It opens the schema through the existing `openTestDatabase` helper, installs
the production bundled seed, adds a small character workload, and runs SQLite
3.53.0 `EXPLAIN QUERY PLAN`. The measured database contained 444 identities,
444 fingerprints, 339 spells, 25 character source instances, and 24 spell
slots. For every candidate it records the current plan, starts a transaction,
creates only that candidate (the slot reverse-lookup pair is intentionally
tested together), records the new plan, rolls back, and proves the candidate
index names are absent again.

The plans prove access-path changes, not wall-clock gains. Expected impact is
ranked from query frequency, asymptotic work, row-growth direction, and whether
the candidate removes a scan/sort or merely makes an existing lookup narrower.
Where an `ORDER BY` ends in `id`, the candidate omits an explicit `id` column:
these are rowid tables with `INTEGER PRIMARY KEY`, and SQLite already appends
rowid as the secondary-index tiebreaker. The after plans below prove the sort
still disappears.

## Ranked recommendations

| Rank | Candidate | Current problem | Plan effect |
|---:|---|---|---|
| 1 | `spell_versions_active_level_name_index` | interactive eligibility search filters most active spells then sorts before `LIMIT 50` | removes temp b-tree and adds the level range to the index search |
| 2 | spell-slot reverse-reference pair | catalog reconciliation and selection refresh scan every slot for two reverse FKs | `SCAN` becomes `MULTI-INDEX OR` with two searches |
| 3 | `wizard_spellbook_entries_spell_state_character_index` | reverse spell reference is a table scan | scan becomes a covering search; active membership also becomes covering |
| 4 | `spell_selection_slots_source_state_index` | each source reconciliation scans every character's slots | scan becomes a two-column search |
| 5 | `catalog_content_fingerprints_content_key_index` | integrity checks search every fingerprint of a content kind because `content_key` is fourth in the PK | kind-prefix search becomes exact content-key search |
| 6 | `character_source_instances_parent_index` | granted-child traversal scans the source table at each tree node | scan becomes a parent search |
| 7 | `spell_loadout_entries_spell_loadout_index` | reverse spell reference scans the existing owner-first unique index | covering scan becomes covering search |
| 8 | `character_spell_preferences_spell_character_index` | reverse spell reference scans the existing character-first unique index | covering scan becomes covering search |
| 9 | `spell_loadouts_character_index` | character disclosure/placeholder reads scan all loadouts | scan becomes a covering character search |
| 10 | `spell_versions_catalog_order_index` | full spell browse scans and builds a temp sort | ordered index scan removes temp b-tree |
| 11 | `character_source_instances_character_state_type_name_index` | removable-source browse uses the short prefix index, then sorts | extends the search through type and removes temp b-tree |
| 12 | `character_skill_grants_character_order_index` | resolver searches by character, then sorts | ordered search removes temp b-tree |
| 13 | `character_skill_expertise_grants_character_order_index` | resolver searches by character, then sorts | ordered search removes temp b-tree |

Ranks 2, 3, 7, and 8 are one logical catalog-import family. They are listed
separately because their tables grow independently and each `CREATE INDEX` can
be adopted or rejected independently. The two rank-2 indexes are inseparable
for the actual `OR`: with only one arm indexed SQLite retains the table scan.

## 1. Active spell eligibility order

```sql
CREATE INDEX spell_versions_active_level_name_index
ON spell_versions (is_active, level, display_name);
```

Query sites: `src/eligibility/eligible-spell-search.ts:135-144` supplies the
interactive ordered `LIMIT 50`; `:246-263` supplies the active/level predicates
and optional non-sargable name substring. `hasAny` reuses the predicate at
`:194-200`, though it does not need the ordering benefit.

Why current is bad: `spell_versions_is_active_index` can only find all active
rows. SQLite then applies the level and catalog predicates and builds a temp
b-tree for `(level, display_name, id)` before it can honor `LIMIT 50`. The
candidate searches the active level range in result order, so rejected rows
can be streamed and the limit can stop early. `instr(lower(display_name), ...)`
remains non-sargable; this index does not claim to fix substring search.

Expected effect: highest interactive impact. It removes the sort and narrows
the outer candidates before the identity/supersession anti-lookups and list/tag
correlated predicates run.

Downside: three explicit columns on every spell insert/update; changing `level`,
`display_name`, or `is_active` rewrites the index. If adopted, the existing
single-column `spell_versions_is_active_index` is a redundant left prefix and
should be replaced rather than retained by the migration lane.

```text
BEFORE:
  SEARCH version USING INDEX spell_versions_is_active_index (is_active=?)
  CORRELATED SCALAR SUBQUERY 1
  SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  CORRELATED SCALAR SUBQUERY 2
  SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)
  SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
  USE TEMP B-TREE FOR ORDER BY
AFTER:
  SEARCH version USING INDEX spell_versions_active_level_name_index (is_active=? AND level>? AND level<?)
  CORRELATED SCALAR SUBQUERY 1
  SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  CORRELATED SCALAR SUBQUERY 2
  SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)
  SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
```

## 2. Spell-slot reverse references (paired)

```sql
CREATE INDEX spell_selection_slots_fixed_spell_version_index
ON spell_selection_slots (fixed_spell_version_id)
WHERE fixed_spell_version_id IS NOT NULL;

CREATE INDEX spell_selection_slots_current_spell_version_index
ON spell_selection_slots (current_spell_version_id)
WHERE current_spell_version_id IS NOT NULL;
```

Query sites: `src/catalog/catalog-importer.ts:1008-1021` asks whether a spell is
referenced before deactivation; `:1165-1170` finds every affected slot after a
spell change. Both have the same `fixed = ? OR current = ?` access shape.

Why current is bad: every existing slot index begins with `character_id`, so a
reverse lookup by either spell FK has no usable prefix. SQLite scans the whole
slot table. With both partial indexes it uses `MULTI-INDEX OR` and performs two
point/range searches.

Expected effect: high on catalog import/reconciliation, especially as saved
characters and slots grow. The partial predicates omit empty arms; because the
schema forbids a slot from holding both fixed and current assignments, an
assigned slot contributes to at most one of these indexes.

Downside: an assignment/change updates one extra partial index, and two index
roots consume metadata/cache. The pair does not help character-owned slot
lists, which already have character-leading indexes.

```text
BEFORE:
  SCAN spell_selection_slots
AFTER:
  MULTI-INDEX OR
  INDEX 1
  SEARCH spell_selection_slots USING INDEX spell_selection_slots_fixed_spell_version_index (fixed_spell_version_id=?)
  INDEX 2
  SEARCH spell_selection_slots USING INDEX spell_selection_slots_current_spell_version_index (current_spell_version_id=?)
```

## 3. Spellbook reverse reference and active membership

```sql
CREATE INDEX wizard_spellbook_entries_spell_state_character_index
ON wizard_spellbook_entries
  (spell_version_id, state, character_id, source_instance_id)
WHERE spell_version_id IS NOT NULL;
```

Query sites: the reverse reference is
`src/catalog/catalog-importer.ts:1013-1014`. Active collection membership is
`src/eligibility/spell-selection-collection.ts:54-65`; the same shape is used
by the out-of-book integrity check at
`src/queries/character-completeness.ts:1133-1145`.

Why current is bad: the import check has no `character_id`, so neither the
partial `(character_id, spell_version_id)` unique index nor the
`(character_id, state)` index is usable and SQLite scans the table. The
collection query can use the existing partial unique index, but must read the
table for `source_instance_id`. The candidate starts with the reverse FK and
carries every membership predicate/selected column.

Expected effect: turns import checks into covering point searches and makes
active character+spell membership covering too.

Downside: a wide four-column index on every filled spellbook entry. The partial
predicate excludes unselected acquisition rows, but choosing/replacing a spell
still writes it. The existing character-first unique index must remain because
it enforces one active copy per character; this candidate cannot replace it.

```text
REVERSE REFERENCE BEFORE:
  SCAN wizard_spellbook_entries
REVERSE REFERENCE AFTER:
  SEARCH wizard_spellbook_entries USING COVERING INDEX wizard_spellbook_entries_spell_state_character_index (spell_version_id=?)
ACTIVE MEMBERSHIP BEFORE:
  SEARCH collection_entry USING INDEX wizard_spellbook_entries_character_id_spell_version_id_unique (character_id=? AND spell_version_id=?)
  SEARCH collection_source USING INTEGER PRIMARY KEY (rowid=?) LEFT-JOIN
ACTIVE MEMBERSHIP AFTER:
  SEARCH collection_entry USING COVERING INDEX wizard_spellbook_entries_spell_state_character_index (spell_version_id=? AND state=? AND character_id=?)
  SEARCH collection_source USING INTEGER PRIMARY KEY (rowid=?) LEFT-JOIN
```

## 4. Spell-slot reconciliation by source

```sql
CREATE INDEX spell_selection_slots_source_state_index
ON spell_selection_slots (source_instance_id, state);
```

Query sites: `src/grants/grant-rule-slot-generator.ts:787-793` reconciles live
slots for one source and `:915-920` deactivates slots below a removed source.
The composite source ownership FK also makes this the natural child-side
lookup for source deletion.

Why current is bad: all non-PK indexes begin with `character_id`; these reads
have only `source_instance_id` and `state`, so SQLite scans all slots.

Expected effect: exact source/state searches for grant regeneration and source
tree retirement. This scales with one source's slots rather than the database's
slots.

Downside: two additional indexed values per slot and rewrites on source/state
changes. It overlaps no existing usable prefix.

```text
BEFORE:
  SCAN spell_selection_slots
AFTER:
  SEARCH spell_selection_slots USING INDEX spell_selection_slots_source_state_index (source_instance_id=? AND state=?)
```

## 5. Fingerprints by installed content key

```sql
CREATE INDEX catalog_content_fingerprints_content_key_index
ON catalog_content_fingerprints (content_key);
```

Query sites: the integrity seam reads every role for a key at
`src/catalog/content-registry.ts:217-230` and is called before exact/alias/
fingerprint resolution. Current-row lookups at `:285-290`, `:335-340`,
`:353-368`, `:443-458`, and `:684-690` also have content-key predicates, but
the existing partial unique current-row index already handles the strictly
`fingerprint_role = 'current'` cases. This candidate is specifically for the
all-role integrity/update paths, including `:1041-1046` and `:1081-1094`.

Why current is bad: the PK order is `(content_kind, fingerprint_scheme,
fingerprint_digest, content_key)`. With only kind+key, the scheme/digest gap
prevents reaching `content_key`; SQLite searches every row of that kind through
`catalog_content_fingerprints_resolution_index`. The single-column candidate
uses the globally stable key directly.

Expected effect: exact lookup of all historical/current fingerprints for one
installed aggregate. It also gives SQLite a reverse FK index for cascades from
the identity table.

Downside: every fingerprint role adds one entry. It partly overlaps the
existing partial unique `(content_key) WHERE role='current'`, but the partial
index cannot enforce its uniqueness job if removed and cannot serve all-role
queries.

```text
BEFORE:
  SEARCH identity USING COVERING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  SEARCH fingerprint USING INDEX catalog_content_fingerprints_resolution_index (content_kind=?)
AFTER:
  SEARCH identity USING COVERING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  SEARCH fingerprint USING INDEX catalog_content_fingerprints_content_key_index (content_key=?)
```

## 6. Character-source hierarchy

```sql
CREATE INDEX character_source_instances_parent_index
ON character_source_instances (parent_source_instance_id)
WHERE parent_source_instance_id IS NOT NULL;
```

Query sites: generated child reconciliation is
`src/grants/grant-rule-slot-generator.ts:881-891`; recursive source retirement
looks up children again at `:905-913`.

Why current is bad: there is no parent-leading index, so every node traversal
scans `character_source_instances`.

Expected effect: one search per parent instead of one full scan per tree node.
The partial predicate omits roots and source rows that have no parent.

Downside: writes only for nested sources, plus maintenance when reparenting or
nulling a parent. Flat characters gain no read benefit and almost no index
footprint.

```text
BEFORE:
  SCAN character_source_instances
AFTER:
  SEARCH character_source_instances USING INDEX character_source_instances_parent_index (parent_source_instance_id=?)
```

## 7. Spell-loadout entry reverse reference

```sql
CREATE INDEX spell_loadout_entries_spell_loadout_index
ON spell_loadout_entries (spell_version_id, spell_loadout_id);
```

Query site: `src/catalog/catalog-importer.ts:1016-1017`.

Why current is bad: the unique index is ordered
`(spell_loadout_id, spell_version_id, role)`, so a spell-only reverse lookup
scans that entire covering index.

Expected effect: covering point search by spell. Including `spell_loadout_id`
also makes the index useful when a reverse result must join back to its owner.

Downside: every loadout entry is represented twice, in opposite key order.
This is a normal cost for bidirectional access; it is still write amplification
on loadout edits.

```text
BEFORE:
  SCAN spell_loadout_entries USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique
AFTER:
  SEARCH spell_loadout_entries USING COVERING INDEX spell_loadout_entries_spell_loadout_index (spell_version_id=?)
```

## 8. Spell-preference reverse reference

```sql
CREATE INDEX character_spell_preferences_spell_character_index
ON character_spell_preferences (spell_version_id, character_id);
```

Query site: `src/catalog/catalog-importer.ts:1019-1020`.

Why current is bad: the enforcing unique index is
`(character_id, spell_version_id)`, so a spell-only lookup scans it.

Expected effect: covering point search by spell while retaining the character
id for possible reverse ownership work.

Downside: every preference is indexed in both directions. The character-first
unique index must remain to enforce the durable uniqueness contract.

```text
BEFORE:
  SCAN character_spell_preferences USING COVERING INDEX character_spell_preferences_character_id_spell_version_id_unique
AFTER:
  SEARCH character_spell_preferences USING COVERING INDEX character_spell_preferences_spell_character_index (spell_version_id=?)
```

## 9. Spell loadouts by character

```sql
CREATE INDEX spell_loadouts_character_index
ON spell_loadouts (character_id);
```

Query sites: the placeholder-spell union branch is
`src/queries/character-workspace-builder.ts:393-397`; character catalog
disclosure uses the same join at
`src/queries/character-catalog-disclosures.ts:200-203`.

Why current is bad: `spell_loadouts` has only its integer PK, so SQLite scans
all loadouts before joining their entries through the existing owner-first
entry index.

Expected effect: covering lookup of a character's loadout rowids, followed by
the already-efficient entry lookup.

Downside: one small entry per loadout and maintenance on character reassignment
(normally immutable ownership). This also improves FK cascade lookup.

```text
BEFORE:
  SCAN loadout
  SEARCH entry USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique (spell_loadout_id=?)
AFTER:
  SEARCH loadout USING COVERING INDEX spell_loadouts_character_index (character_id=?)
  SEARCH entry USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique (spell_loadout_id=?)
```

## 10. Full spell-catalog order

```sql
CREATE INDEX spell_versions_catalog_order_index
ON spell_versions (level, display_name, rules_edition);
```

Query site: `src/queries/catalog-queries.ts:304-348` reads the complete spell
catalog in exactly this order, with correlated list/tag/upgrade aggregates.

Why current is bad: no index matches the order, so SQLite scans all spell rows
and builds a temp b-tree after applying the selectable identity/supersession
anti-lookups.

Expected effect: an ordered scan removes the temp b-tree. It does not reduce
the number of rows visited because this is intentionally a full browse.

Downside: three explicit columns per spell and overlap with the rank-1 index. Name,
edition, or level edits rewrite it. If measurements above plan shape are later
required, test whether the full-catalog sort at roughly hundreds of rows is
worth a second wide spell index; rank 1 should be adopted first.

```text
BEFORE:
  SCAN version
  CORRELATED SCALAR SUBQUERY 1
  SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  CORRELATED SCALAR SUBQUERY 2
  SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)
  USE TEMP B-TREE FOR ORDER BY
AFTER:
  SCAN version USING INDEX spell_versions_catalog_order_index
  CORRELATED SCALAR SUBQUERY 1
  SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  CORRELATED SCALAR SUBQUERY 2
  SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)
```

## 11. Character sources by state, type, and display order

```sql
CREATE INDEX character_source_instances_character_state_type_name_index
ON character_source_instances
  (character_id, state, source_type, display_name);
```

Query site: `src/queries/character-workspace-builder.ts:765-773` builds the
removable-source list. The equality prefix also narrows common source-type
reads at `:707-716`, `src/queries/level-up-state.ts:1018-1027`, and
`src/queries/level-up-planned-choices.ts:348-380`.

Why current is bad: the existing `(character_id, state)` index finds the
character's active rows but does not constrain source type or produce
`(source_type, display_name, id)` order, so SQLite creates a temp b-tree.

Expected effect: ordered type-specific search and no sort for removable
sources.

Downside: wide index on every source. It has the existing character/state index
as a left prefix; if adopted, the migration lane should test replacing that
short index instead of retaining both. It does not optimize queries whose next
predicate is `source_definition_id`; a separate near-duplicate is not justified
at current character-scale cardinalities.

```text
BEFORE:
  SEARCH character_source_instances USING INDEX character_source_instances_character_id_state_index (character_id=? AND state=?)
  USE TEMP B-TREE FOR ORDER BY
AFTER:
  SEARCH character_source_instances USING INDEX character_source_instances_character_state_type_name_index (character_id=? AND state=? AND source_type=?)
```

## 12. Skill-grant resolver order

```sql
CREATE INDEX character_skill_grants_character_order_index
ON character_skill_grants
  (character_id, source_instance_id, grant_key, ordinal);
```

Query site: `src/grants/skill-grants.ts:580-588`.

Why current is bad: SQLite uses `(character_id, state)` only through its first
column because this resolver includes all states, then sorts by source/grant/
ordinal/id.

Expected effect: ordered character search without a temp b-tree. The existing
`(source_instance_id, grant_key, ordinal)` unique index already handles
source-scoped reconciliation and must remain for enforcement.

Downside: four explicit columns per grant; all inserts and ownership/address changes
write both orderings. A character has relatively few skill grants, hence the
low rank despite a clean plan improvement.

```text
BEFORE:
  SEARCH character_skill_grants USING INDEX character_skill_grants_character_id_state_index (character_id=?)
  USE TEMP B-TREE FOR ORDER BY
AFTER:
  SEARCH character_skill_grants USING INDEX character_skill_grants_character_order_index (character_id=?)
```

## 13. Expertise-grant resolver order

```sql
CREATE INDEX character_skill_expertise_grants_character_order_index
ON character_skill_expertise_grants
  (character_id, source_instance_id, granted_at_class_level, ordinal);
```

Query site: `src/grants/skill-expertise-grants.ts:291-304`.

Why current is bad: the `(character_id, state)` index is usable only through
`character_id` for an all-state resolver, and SQLite sorts the result.

Expected effect: ordered character search without a temp b-tree.

Downside: four explicit columns per expertise grant plus existing source-address and
active-skill indexes. Expertise row counts are very small, so this is the
lowest-impact recommendation.

```text
BEFORE:
  SEARCH character_skill_expertise_grants USING INDEX character_skill_expertise_grants_character_state_index (character_id=?)
  USE TEMP B-TREE FOR ORDER BY
AFTER:
  SEARCH character_skill_expertise_grants USING INDEX character_skill_expertise_grants_character_order_index (character_id=?)
```

## Covered by existing indexes; do not add

### Catalog identities: kind/key and visibility

The selectable anti-lookup is defined at
`src/queries/selectable-catalog-content.ts:45-51`. The schema already has both
the globally unique `content_key` PK and
`catalog_content_identities_kind_key_unique (content_kind, content_key)`.
Every picker reaches the one possible identity row with a two-column `SEARCH`,
then evaluates `archived_at` and `visibility` on that single row.

I tested the tempting covering extension below and SQLite ignored it in both
the anti-lookup and the adjacent disclosure join. It adds write amplification
with no plan change, so it is rejected:

```sql
CREATE INDEX catalog_content_identities_selectable_index
ON catalog_content_identities
  (content_kind, content_key, archived_at, visibility);
```

```text
BEFORE AND AFTER:
  SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
  SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
```

An index beginning with `visibility` would help a query that starts from all
listed identities, but no audited user-facing picker has that shape: definition
tables drive the browse and identity is a correlated point lookup.

### Catalog supersessions: kind/superseded key

The second anti-lookup is
`src/queries/selectable-catalog-content.ts:52-56`. The table's primary key is
already exactly `(content_kind, superseded_content_key)`. Adding the same index
would be pure duplication.

```text
CURRENT:
  SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)
```

The separate existing `(content_kind, successor_content_key)` index remains
necessary for successor-side lineage and FK work.

### Fingerprint scheme/digest resolution

Resolution queries at `src/catalog/source-content-importer.ts:119-130`,
`src/catalog/content-adoption.ts:481-489`,
`src/catalog/stored-content-projector-v1.ts:99-107`, and
`src/catalog/subclass-importer.ts:223-230` already match the first three PK
columns `(content_kind, fingerprint_scheme, fingerprint_digest)` and receive a
`SEARCH`. The PK's fourth `content_key` column also supplies the requested
order.

I tested a partial resolvable-role copy:

```sql
CREATE INDEX catalog_content_fingerprints_resolvable_index
ON catalog_content_fingerprints
  (content_kind, fingerprint_scheme, fingerprint_digest, content_key)
WHERE fingerprint_role IN ('current', 'compatible');
```

It merely switches one indexed search to another indexed search; it removes no
scan or temp b-tree. The smaller role subset is not worth duplicating four key
columns without timing evidence, so it is rejected. The recommended
single-column content-key index addresses the genuinely missing access
direction instead.

```text
BEFORE:
  SEARCH catalog_content_fingerprints USING INDEX sqlite_autoindex_catalog_content_fingerprints_1 (content_kind=? AND fingerprint_scheme=? AND fingerprint_digest=?)
AFTER TEST ONLY:
  SEARCH catalog_content_fingerprints USING INDEX catalog_content_fingerprints_resolvable_index (content_kind=? AND fingerprint_scheme=? AND fingerprint_digest=?)
```

### Other spell relations and eligibility pivots

No additional candidate is justified for these audited paths:

- `spell_list_memberships`: direct checks at
  `src/eligibility/eligible-spell-search.ts:268-284` use the unique
  `(spell_version_id, spell_list_key)` index; list-first browsing has the
  existing `spell_list_key` index. Legacy identity lookup can also start from
  `spell_versions_spell_identity_id_rules_edition_index` and probe the unique
  membership index.
- `spell_version_tags`: required-tag checks at
  `src/eligibility/eligible-spell-search.ts:296-302` exactly match the unique
  `(spell_version_id, tag)` index; tag-first reads have the existing `tag`
  index.
- `wizard_spellbook_entries` source reconciliation at
  `src/grants/grant-rule-slot-generator.ts:831-835` already uses the left prefix
  of `(source_instance_id, rule_key, ordinal)`.
- active skill/expertise lists already use the partial unique
  `(character_id, skill) WHERE skill IS NOT NULL AND state='active'` indexes.
  The two grant candidates above target the different all-state ordered
  resolver shape.

## Adoption order

The migration lane should first adopt ranks 1-6, replace any redundant short
left-prefix indexes noted above, and measure database-image/index bytes plus
catalog-import and eligibility-search wall time. Ranks 7-9 become increasingly
valuable with user-created spell organization. Ranks 10-13 are proven sort
removals but should wait for timings because their current result sets are
bounded in the hundreds or lower.
