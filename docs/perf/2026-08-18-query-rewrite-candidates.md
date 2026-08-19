# Query rewrite candidates (2026-08-18)

This is evidence only. No query in `src/` was changed.

## Method

Run the harness from the repository root:

```sh
node scripts/perf/run-explain-queries.mjs > /tmp/explain-queries.json
```

`scripts/perf/explain-queries.mjs` opens the application database through the
existing RPC/test lifecycle and extends the existing report fixture. The
measured character has 4 held classes, 8 active sources, 1 species row,
1 background row, 8 selected spell slots, 5 spellbook entries, and 1 selected
placeholder spell. Its Wizard is level 3 so the level-up state must project an
ASI feat choice. The wrapper exists only to run the TypeScript application/test
helpers through Vite without loading the production Vite config.

The harness records every read issued by the requested builders and the source
rule reader, runs `EXPLAIN QUERY PLAN` against the same seeded database, and
executes each proposed SQL shape. The proposed and current row sets are compared
without using either as a stored expectation. All five comparisons reported
below were identical and non-empty.

Measured builder totals:

| Reader | Statements | Distinct SQL shapes | Outcome |
|---|---:|---:|---|
| `CharacterSheetBuilder` | 192 | 81 | completed |
| `CharacterSpellSectionBuilder` | 88 | 25 | completed |
| `CharacterCompletenessQueries` | 17 | 16 | completed |
| `CharacterWorkspaceBuilder` | 196 | 78 | completed |
| `LevelUpStateQuery` | 1,156 | 100 | completed |
| `SourceRuleReader` over 8 active sources | 19 | 5 | completed |

The ranking uses eliminated statement executions first, then correlated
subquery and temporary b-tree plan nodes. It is not a wall-clock benchmark.

## Ranked summary

| Rank | Candidate | Measured structural change |
|---:|---|---|
| 1 | Batch and cache level-up feat definitions | 1 selectable-key read + 93 definition point reads to 1 read; 2 correlated plan nodes to 0 |
| 2 | Batch spell-access eligibility inputs | 38 point reads (15 version + 15 legacy + 8 collection) to 3 reads |
| 3 | Batch workspace subclass options | 4 statements to 1; 8 correlated plan nodes to 0; 4 temp b-trees to 1 |
| 4 | Split placeholder reference collection from filtering | 20 plan rows to 12 across two statements; 4 temp b-trees to 1 |
| 5 | Batch class saving throws | 4 indexed statements to 1 indexed statement |

## 1. Batch and cache level-up feat definitions

Location: `LevelUpStateQuery.#featCandidates()` selects keys and then calls
`levelFeatDefinitionFromDatabase()` for every candidate and application. On the
seeded ASI projection, 18 selectable feats caused 93 executions of the full-row
point query during one `LevelUpStateQuery.build()`.

Current SQL (one key scan, then 93 point reads):

```sql
SELECT definition.content_key
FROM feat_definitions AS definition
WHERE NOT EXISTS (
  SELECT 1
  FROM catalog_content_identities AS selectable_identity
  WHERE selectable_identity.content_kind = 'feat'
    AND selectable_identity.content_key = definition.content_key
    AND NOT (
      selectable_identity.archived_at IS NULL
      AND selectable_identity.visibility IN ('listed')
    )
)
AND NOT EXISTS (
  SELECT 1
  FROM catalog_content_supersessions AS supersession
  WHERE supersession.content_kind = 'feat'
    AND supersession.superseded_content_key = definition.content_key
)
ORDER BY definition.id;

SELECT definition.id, definition.content_key, definition.name,
       definition.category, definition.min_level,
       definition.ability_points, definition.ability_increase_abilities,
       definition.ability_increase_maximum, definition.repeatable,
       definition.prerequisites, definition.grant_rules, definition.notes,
       identity.catalog_layer
FROM feat_definitions AS definition
LEFT JOIN catalog_content_identities AS identity
  ON identity.content_kind = 'feat'
 AND identity.content_key = definition.content_key
WHERE definition.content_key = ?;
```

Current plans:

```text
-- selectable-key query (1 execution)
SCAN definition
CORRELATED SCALAR SUBQUERY 1
SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
CORRELATED SCALAR SUBQUERY 2
SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)

-- full-row point query (93 executions)
SEARCH definition USING INDEX feat_definitions_content_key_unique (content_key=?)
SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
```

Proposed SQL: read and decode the full selectable catalogue once per level-up
build, then reuse a map keyed by `content_key` for every projected application.
Materializing the disqualified keys retains the important “missing identity is
selectable” behavior while removing per-definition correlated subqueries.

```sql
WITH disqualified(content_key) AS MATERIALIZED (
  SELECT content_key
  FROM catalog_content_identities
  WHERE content_kind = ?
    AND NOT (archived_at IS NULL AND visibility IN ('listed'))
  UNION
  SELECT superseded_content_key
  FROM catalog_content_supersessions
  WHERE content_kind = ?
)
SELECT definition.id, definition.content_key, definition.name,
       definition.category, definition.min_level,
       definition.ability_points, definition.ability_increase_abilities,
       definition.ability_increase_maximum, definition.repeatable,
       definition.prerequisites, definition.grant_rules, definition.notes,
       identity.catalog_layer
FROM feat_definitions AS definition
LEFT JOIN catalog_content_identities AS identity
  ON identity.content_kind = 'feat'
 AND identity.content_key = definition.content_key
LEFT JOIN disqualified
  ON disqualified.content_key = definition.content_key
WHERE disqualified.content_key IS NULL
ORDER BY definition.id;
```

Proposed plan (1 execution):

```text
MATERIALIZE disqualified
MERGE (UNION)
LEFT
SEARCH catalog_content_identities USING INDEX catalog_content_identities_kind_key_unique (content_kind=?)
RIGHT
SEARCH catalog_content_supersessions USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=?)
SCAN definition
SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
SEARCH disqualified USING AUTOMATIC COVERING INDEX (content_key=?) LEFT-JOIN
```

Proof: current 18 rows, proposed 18 rows, identical rows `true`.

Risk: decoding moves from a point-read boundary to a batch boundary. The batch
must retain the same throwing behavior for malformed stored feat rows, and the
cache must be scoped to a single read/build so mutations cannot make it stale.
The same disqualified-key shape is reusable for the once-per-workspace feat,
species, background, item, and weapon catalogues, which currently each show two
correlated scalar subqueries.

## 2. Batch spell-access eligibility inputs

Location: the slot loop in `SpellAccessBuilder` calls
`SpellSelectionEligibility.evaluateConstraint()` and
`effectiveSelectionCollectionForSlot()`. For one spell-section build, 7
distinct referenced spell versions caused 15 version point reads, 15 identical
character `allow_legacy` reads, and 8 slot collection point reads.

Current SQL and plans:

```sql
SELECT id, spell_identity_id, rules_edition, level, school, is_active
FROM spell_versions
WHERE id = ?;
-- SEARCH spell_versions USING INTEGER PRIMARY KEY (rowid=?)

SELECT allow_legacy FROM characters WHERE id = ?;
-- SEARCH characters USING INTEGER PRIMARY KEY (rowid=?)

SELECT slot.selection_collection, slot.rule_key,
       definition.content_key AS class_content_key
FROM spell_selection_slots AS slot
INNER JOIN character_source_instances AS source
  ON source.id = slot.source_instance_id
 AND source.character_id = slot.character_id
LEFT JOIN class_definitions AS definition
  ON source.source_type = 'class'
 AND definition.id = source.source_definition_id
WHERE slot.character_id = ? AND slot.id = ?;
-- SEARCH slot USING INTEGER PRIMARY KEY (rowid=?)
-- SEARCH source USING INTEGER PRIMARY KEY (rowid=?)
-- SEARCH definition USING INTEGER PRIMARY KEY (rowid=?) LEFT-JOIN
```

Proposed SQL: load immutable eligibility inputs once for the build. The
effective collection expression can also be projected directly by the existing
slot read instead of being looked up again; it is shown separately here so its
plan is independently measurable.

```sql
SELECT id, spell_identity_id, rules_edition, level, school, is_active
FROM spell_versions
WHERE id IN (?, ?, ?, ?, ?, ?, ?)
ORDER BY id;

SELECT allow_legacy FROM characters WHERE id = ?;

SELECT slot.id,
       CASE
         WHEN slot.selection_collection IS NOT NULL
           THEN slot.selection_collection
         WHEN slot.rule_key = 'wizard-prepared'
          AND definition.content_key = '2024:class:wizard'
           THEN 'wizard_spellbook'
         ELSE NULL
       END AS effective_selection_collection
FROM spell_selection_slots AS slot
INNER JOIN character_source_instances AS source
  ON source.id = slot.source_instance_id
 AND source.character_id = slot.character_id
LEFT JOIN class_definitions AS definition
  ON source.source_type = 'class'
 AND definition.id = source.source_definition_id
WHERE slot.character_id = ?;
```

Proposed plans (1 execution each):

```text
SEARCH spell_versions USING INTEGER PRIMARY KEY (rowid=?)

SEARCH characters USING INTEGER PRIMARY KEY (rowid=?)

SEARCH slot USING INDEX slots_character_collection_index (character_id=?)
SEARCH source USING INTEGER PRIMARY KEY (rowid=?)
SEARCH definition USING INTEGER PRIMARY KEY (rowid=?) LEFT-JOIN
```

Proof: version rows 7/7 identical; effective collection rows 9/9 identical;
the one character legacy value is reused. The measured statement count changes
from 38 to 3.

Risk: the eligibility evaluator currently owns its own reads. Accepting a
preloaded, already-decoded version and legacy flag needs a typed internal
contract so callers cannot accidentally supply facts for a different character
or spell. The existing slot query already carries most collection columns, so
folding the `CASE` into it is preferable to adding the third proposed query.

## 3. Batch workspace subclass options

Location: `CharacterWorkspaceBuilder.classes()` maps held classes and calls
`classOptions(classDefinitionId)` inside the row decoder. Four held classes
therefore issue this statement four times.

Current SQL:

```sql
SELECT subclass.id, subclass.name, identity.catalog_layer
FROM subclass_definitions AS subclass
LEFT JOIN catalog_content_identities AS identity
  ON identity.content_kind = 'subclass'
 AND identity.content_key = subclass.content_key
WHERE subclass.class_definition_id = ?
  AND NOT EXISTS (
    SELECT 1
    FROM catalog_content_identities AS selectable_identity
    WHERE selectable_identity.content_kind = 'subclass'
      AND selectable_identity.content_key = subclass.content_key
      AND NOT (
        selectable_identity.archived_at IS NULL
        AND selectable_identity.visibility IN ('listed')
      )
  )
  AND NOT EXISTS (
    SELECT 1
    FROM catalog_content_supersessions AS supersession
    WHERE supersession.content_kind = 'subclass'
      AND supersession.superseded_content_key = subclass.content_key
  )
ORDER BY subclass.name, subclass.id;
```

Current plan (4 executions):

```text
SEARCH subclass USING INDEX subclass_definitions_class_definition_id_name_rules_edition_index (class_definition_id=?)
CORRELATED SCALAR SUBQUERY 1
SEARCH selectable_identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?)
CORRELATED SCALAR SUBQUERY 2
SEARCH supersession USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=? AND superseded_content_key=?)
SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
USE TEMP B-TREE FOR LAST TERM OF ORDER BY
```

Proposed SQL:

```sql
WITH disqualified(content_key) AS MATERIALIZED (
  SELECT content_key
  FROM catalog_content_identities
  WHERE content_kind = ?
    AND NOT (archived_at IS NULL AND visibility IN ('listed'))
  UNION
  SELECT superseded_content_key
  FROM catalog_content_supersessions
  WHERE content_kind = ?
)
SELECT subclass.class_definition_id, subclass.id, subclass.name,
       identity.catalog_layer
FROM subclass_definitions AS subclass
LEFT JOIN catalog_content_identities AS identity
  ON identity.content_kind = 'subclass'
 AND identity.content_key = subclass.content_key
LEFT JOIN disqualified
  ON disqualified.content_key = subclass.content_key
WHERE subclass.class_definition_id IN (?, ?, ?, ?)
  AND disqualified.content_key IS NULL
ORDER BY subclass.class_definition_id, subclass.name, subclass.id;
```

Proposed plan (1 execution):

```text
MATERIALIZE disqualified
MERGE (UNION)
LEFT
SEARCH catalog_content_identities USING INDEX catalog_content_identities_kind_key_unique (content_kind=?)
RIGHT
SEARCH catalog_content_supersessions USING COVERING INDEX sqlite_autoindex_catalog_content_supersessions_1 (content_kind=?)
SEARCH subclass USING INDEX subclass_definitions_class_definition_id_name_rules_edition_index (class_definition_id=?)
SEARCH identity USING INDEX catalog_content_identities_kind_key_unique (content_kind=? AND content_key=?) LEFT-JOIN
SEARCH disqualified USING AUTOMATIC COVERING INDEX (content_key=?) LEFT-JOIN
USE TEMP B-TREE FOR LAST TERM OF ORDER BY
```

Proof: current 4 rows, proposed 4 rows, identical rows `true`. Across the four
current executions this removes 8 correlated plan nodes and reduces 4 temp
b-trees to 1.

Risk: callers currently receive subclass arrays while decoding each class row.
The rewrite should build `Map<ClassDefinitionId, SubclassOption[]>` before the
class projection. Preserve classes with zero subclasses and the precise
`unknown` catalog-layer behavior.

## 4. Split placeholder reference collection from filtering

Location: `CharacterWorkspaceBuilder.build()` unions four sources of referenced
spell ids inside one `IN` predicate. SQLite creates four temporary b-trees for
the compound `UNION` and ordering.

Current SQL:

```sql
SELECT DISTINCT version.content_key, version.display_name
FROM spell_versions AS version
WHERE version.provenance = 'placeholder'
  AND version.id IN (
    SELECT current_spell_version_id
    FROM spell_selection_slots
    WHERE character_id = ?
    UNION
    SELECT spell_version_id
    FROM wizard_spellbook_entries
    WHERE character_id = ?
    UNION
    SELECT spell_version_id
    FROM character_spell_preferences
    WHERE character_id = ?
    UNION
    SELECT entry.spell_version_id
    FROM spell_loadout_entries AS entry
    INNER JOIN spell_loadouts AS loadout
      ON loadout.id = entry.spell_loadout_id
    WHERE loadout.character_id = ?
  )
ORDER BY version.display_name, version.content_key;
```

Current plan:

```text
SEARCH version USING INTEGER PRIMARY KEY (rowid=?)
LIST SUBQUERY 4
MERGE (UNION)
LEFT
MERGE (UNION)
LEFT
SEARCH spell_selection_slots USING INDEX slots_character_collection_index (character_id=?)
USE TEMP B-TREE FOR ORDER BY
RIGHT
SEARCH wizard_spellbook_entries USING INDEX wizard_spellbook_entries_character_id_state_index (character_id=?)
USE TEMP B-TREE FOR ORDER BY
RIGHT
MERGE (UNION)
LEFT
SEARCH character_spell_preferences USING COVERING INDEX character_spell_preferences_character_id_spell_version_id_unique (character_id=?)
RIGHT
SCAN loadout
SEARCH entry USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique (spell_loadout_id=?)
USE TEMP B-TREE FOR ORDER BY
USE TEMP B-TREE FOR ORDER BY
```

Proposed split: collect ids with `UNION ALL`, deduplicate them in a JavaScript
`Set`, then query only the distinct ids. This exchanges one complex statement
for two simple statements.

```sql
SELECT current_spell_version_id AS spell_version_id
FROM spell_selection_slots WHERE character_id = ?
UNION ALL
SELECT spell_version_id
FROM wizard_spellbook_entries WHERE character_id = ?
UNION ALL
SELECT spell_version_id
FROM character_spell_preferences WHERE character_id = ?
UNION ALL
SELECT entry.spell_version_id
FROM spell_loadout_entries AS entry
JOIN spell_loadouts AS loadout ON loadout.id = entry.spell_loadout_id
WHERE loadout.character_id = ?;

SELECT content_key, display_name
FROM spell_versions
WHERE provenance = 'placeholder'
  AND id IN (?, ?, ?, ?, ?, ?, ?)
ORDER BY display_name, content_key;
```

Proposed plans:

```text
COMPOUND QUERY
LEFT-MOST SUBQUERY
SEARCH spell_selection_slots USING INDEX slots_character_collection_index (character_id=?)
UNION ALL
SEARCH wizard_spellbook_entries USING INDEX wizard_spellbook_entries_character_id_state_index (character_id=?)
UNION ALL
SEARCH character_spell_preferences USING COVERING INDEX character_spell_preferences_character_id_spell_version_id_unique (character_id=?)
UNION ALL
SCAN loadout
SEARCH entry USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique (spell_loadout_id=?)

SEARCH spell_versions USING INTEGER PRIMARY KEY (rowid=?)
USE TEMP B-TREE FOR ORDER BY
```

Proof: current 1 row, proposed 1 row, identical rows `true`. Plan rows fall
from 20 to 12 and temp b-trees from 4 to 1. The full `spell_loadouts` scan
remains; this rewrite does not pretend otherwise.

Risk: this adds a second statement and JavaScript deduplication. It is valuable
only if removing three temporary sort/de-dup structures beats the extra dispatch
on the browser/WASM boundary. The remaining `SCAN loadout` may make an index on
`spell_loadouts(character_id)` a better independent follow-up, but this lane is
query rewrites only.

## 5. Batch class saving throws

Location: `CharacterSheetBuilder.#classes()` explicitly queries saving throws
inside the class map. The current query is already optimal in isolation; the
waste is four statement executions.

Current SQL and plan (4 executions):

```sql
SELECT ability
FROM class_saving_throw_proficiencies
WHERE class_definition_id = ?
ORDER BY ability;
```

```text
SEARCH class_saving_throw_proficiencies USING COVERING INDEX class_saving_throw_proficiencies_class_definition_id_ability_unique (class_definition_id=?)
```

Proposed SQL and plan (1 execution):

```sql
SELECT class_definition_id, ability
FROM class_saving_throw_proficiencies
WHERE class_definition_id IN (?, ?, ?, ?)
ORDER BY class_definition_id, ability;
```

```text
SEARCH class_saving_throw_proficiencies USING COVERING INDEX class_saving_throw_proficiencies_class_definition_id_ability_unique (class_definition_id=?)
```

Proof: current 8 rows, proposed 8 rows, identical rows `true`.

Risk: low. Build a map before projecting classes and retain the enum validation
currently applied to every returned ability. This is ranked last because it
changes only dispatch count, not the optimizer plan.

## Cross-cutting findings

### Full scans and temporary b-trees

- Full definition scans are expected when returning an entire catalogue, but
  `selectableCatalogContentSql()` adds two correlated index probes for every
  scanned definition. This appeared for feat, species, background, item,
  weapon, and subclass catalogues. Candidate 1 removes the correlation and is
  generalizable.
- The avoidable full table scan found in a top workspace query is
  `SCAN loadout` in the placeholder query. Candidate 4 removes three temp
  b-trees but leaves that scan visible.
- Many character-scoped queries use an index for filtering and a small temp
  b-tree for presentation order. Those were not ranked merely for sorting a
  handful of character rows. The high-value exception is the placeholder
  compound query, which builds four temp b-trees in one statement.

### OR-connected predicates

No measured OR-connected predicate defeated its useful leading index on this
fixture:

- Wizard prepared-slot state uses
  `slot.state = 'kept_override' OR (...)`; the plan still uses
  `spell_selection_slots_character_id_bucket_index`.
- Active spellbook-source tests use
  `entry.source_instance_id IS NULL OR book_source.state = ?`; the plan still
  uses the unique `(character_id, spell_version_id)` spellbook index.
- Source-order exclusions use an OR between species/background note markers;
  the plan still uses `character_source_instances_character_id_state_index`.

These predicates are therefore not rewrite candidates from this evidence. The
correlated spellbook membership check is still executed 16 times from spell
eligibility; it belongs with candidate 2's batching work, not an OR rewrite.

### Other query-in-loop shapes observed

- Sheet class projection issued 4 reads each for saving throws, extra-attack
  grants, martial-arts dice, class feature contributions, named features,
  resources, and class source lookup. Saving throws are the smallest safe first
  batch; the others should be grouped by their owning read model rather than
  combined into one wide join.
- Workspace projection issued 4 subclass catalogue queries and repeated source
  catalog-resolution point reads. Candidate 3 is directly proven; batching the
  heterogeneous feat/species/background provenance resolver needs a separate
  typed design.
- `SourceRuleReader` over 8 sources issued 19 statements: 8 source point reads,
  4 class progression reads, 4 class-level reads, and 2 feat-definition reads.
  All plans were indexed and the API is deliberately source-scoped, so it is
  not ranked above the proven builder-local batches. A future multi-source
  reader could batch the 8 source rows first without changing rule semantics.
- Completeness issued 17 statements across 16 SQL shapes; its only repeated
  shape was the skill-grant row read (2 executions). No completeness rewrite
  outranked the five candidates above.

## What this does not prove

The harness proves statement counts, optimizer plans, and fixture-row
equivalence. It does not measure browser wall time, heap impact of caching, or
behavior on a large imported/homebrew catalogue. Candidate 4 in particular
needs a timed browser/WASM A/B before implementation because it trades one SQL
dispatch for two.
