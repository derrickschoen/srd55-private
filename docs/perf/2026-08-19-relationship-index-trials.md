# Relationship reverse-index trials

Date: 2026-08-19

## Verdict

Ranks 2, 4, and 6 pass. Rank 9 is killed.

The passing DDL is:

```sql
CREATE INDEX spell_selection_slots_fixed_spell_version_index
ON spell_selection_slots (fixed_spell_version_id)
WHERE fixed_spell_version_id IS NOT NULL;

CREATE INDEX spell_selection_slots_current_spell_version_index
ON spell_selection_slots (current_spell_version_id)
WHERE current_spell_version_id IS NOT NULL;

CREATE INDEX spell_selection_slots_source_state_index
ON spell_selection_slots (source_instance_id, state);

CREATE INDEX character_source_instances_parent_index
ON character_source_instances (parent_source_instance_id)
WHERE parent_source_instance_id IS NOT NULL;
```

The rank-2 indexes remain an atomic pair. Measuring or adopting only one arm
does not repair SQLite's `fixed = ? OR current = ?` access path.

`spell_loadouts_character_index` is not adopted. It changes the intended plan
shape and removes scan steps, but does not improve the workspace endpoint at
this scale.

## Reproduction

The ignored standalone harness is
`scripts/perf/relationship-index-trials.mjs`, backed by the adjacent TypeScript
file. It is not collected by Vitest and does not affect the normal suite.

Run from the repository root:

```sh
node scripts/perf/relationship-index-trials.mjs
```

The harness uses the production schema, `applicationSeed`, the existing test
database opener, and the existing character/class fixture builders. It creates
one in-memory database with:

| Row kind | Count |
|---|---:|
| Characters | 50 |
| Character class rows | 150 |
| Character source instances | 2,000 |
| Spell selection slots | 6,000 |
| Wizard spellbook entries | 2,500 |
| Spell loadouts | 150 |
| Spell loadout entries | 3,000 |

Every character has Wizard, Cleric, and Fighter levels; a four-level,
three-way granted-source tree; three slots per source; 50 spellbook entries;
and three 20-entry loadouts. One assigned spell is marked as placeholder so
the workspace placeholder union is populated. A different active spell is
deliberately unreferenced so the catalog deactivation check must exhaust every
reverse-reference arm.

Every operation has nine timed samples, after warm-up. Indexed and unindexed
samples alternate order to remove the cache-order bias seen in an initial
one-direction run. Source regeneration and retirement run through the
production `GrantRuleSlotGenerator` inside rollback-only outer transactions;
workspace timing runs the production `CharacterWorkspaceBuilder`. Wall times
are medians from `performance.now()`. `FULLSCAN_STEP` and VM-step counts come
from SQLite statement profiling and are summed across every statement in the
operation before taking the median.

Index bytes are the change in used pages, `(page_count - freelist_count) *
page_size`, after creating only that candidate on a vacuumed baseline. The
SQLite build does not need the optional `dbstat` module for this method.

## Measurements

Times are milliseconds. Scan steps and VM steps are median operation totals.

| Rank | Operation | Without index | With index | Change | Full-scan steps without → with | VM steps without → with | Index bytes | Verdict |
|---:|---|---:|---:|---:|---:|---:|---:|---|
| 2 | Catalog import/deactivation reference check | 0.455 | 0.210 | -53.8% | 11,497 → 5,498 | 46,526 → 16,536 | 81,920 | PASS |
| 2 | `#refreshAffectedSelections` reverse lookup | 0.271 | 0.029 | -89.3% | 5,999 → 0 | 30,009 → 21 | included above | PASS |
| 4 | Source regeneration slot reconciliation | 1.863 | 1.809 | -2.9% | 7,998 → 1,999 | 26,550 → 8,604 | 114,688 | PASS |
| 6 | Source regeneration with recursive retirement | 48.752 | 45.820 | -6.0% | 319,920 → 239,960 | 1,032,682 → 792,843 | 32,768 | PASS |
| 9 | Placeholder workspace construction | 28.666 | 29.805 | +4.0% | 368 → 70 | 81,320 → 80,434 | 8,192 | KILL |

The rank-2 reference check retains 5,498 scan steps because its exact
production compound query also scans wizard spellbook entries, loadout
entries, and spell preferences. Those are ranks 3, 7, and 8 from the candidate
report and were intentionally not smuggled into this independent rank-2 trial.

Likewise, the remaining rank-4 scan steps are the independent parent-source
scan, and most remaining rank-6 steps are independent slot-by-source scans.
Each trial installs only its own candidate, so these residuals are expected and
make the measured endpoint improvements conservative.

## EXPLAIN shape

Rank 2 changes the slot arm in both catalog operations from:

```text
SCAN spell_selection_slots
```

to:

```text
MULTI-INDEX OR
INDEX 1
SEARCH spell_selection_slots USING INDEX spell_selection_slots_fixed_spell_version_index (fixed_spell_version_id=?)
INDEX 2
SEARCH spell_selection_slots USING INDEX spell_selection_slots_current_spell_version_index (current_spell_version_id=?)
```

Rank 4 changes:

```text
SCAN spell_selection_slots
```

to:

```text
SEARCH spell_selection_slots USING INDEX spell_selection_slots_source_state_index (source_instance_id=? AND state=?)
```

Rank 6 changes:

```text
SCAN character_source_instances
```

to:

```text
SEARCH character_source_instances USING INDEX character_source_instances_parent_index (parent_source_instance_id=?)
```

Rank 9 changes the loadout arm from:

```text
SCAN loadout
SEARCH entry USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique (spell_loadout_id=?)
```

to:

```text
SEARCH loadout USING COVERING INDEX spell_loadouts_character_index (character_id=?)
SEARCH entry USING COVERING INDEX spell_loadout_entries_spell_loadout_id_spell_version_id_role_unique (spell_loadout_id=?)
```

That last plan improvement is real, but the whole workspace median is not. It
therefore fails the explicit kill metric.

## Write amplification

The write trial alternates the no-candidate and all-candidate states over nine
rollback-only samples. “All” includes rank 9 even though it is killed, so this
is the requested upper-bound comparison of all four candidates against none.
Each sample creates 250 nested source/slot pairs, updates every slot's
assignment and state, and updates every source's parent: 1,000 write
statements.

| Candidate state | Median | Full-scan steps | VM steps |
|---|---:|---:|---:|
| None | 34.179 ms | 0 | 196,258 |
| All four | 37.167 ms | 0 | 209,758 |
| Difference | +2.988 ms (+8.7%) | 0 | +13,500 (+6.9%) |

Rank 9 does not index either written table and therefore contributes no direct
cost to this particular slot/source write batch. The measured amplification is
from the rank-2 pair plus ranks 4 and 6.

## Persistence and assumptions

The passing indexes are declared in the Drizzle schema source and fresh
`schema.sql`, with hand-written schema inventory and exact partial-predicate
expectations. Persisted images receive the same four indexes through migration
`0049_relationship_indexes`; the migration-chain signature is checked against
the independently generated fresh schema.

This is an in-memory SQLite-WASM trial on SQLite 3.53.0. It measures database
CPU and application query/codec work without filesystem latency. The fixture
is plausible growth, not a prediction of an average user: 50 local characters,
15 total class levels per character, four source levels, and dense spell data.
The pass decision assumes a stable repeated median reduction at that stated
scale is endpoint evidence; it does not require a minimum absolute millisecond
threshold beyond the task's kill rule. Rank 9 was repeated with alternating
order specifically because its apparent gain changed sign under the earlier
one-direction sampling method.

## Gates

After the schema and persisted-image migration changed:

| Gate | Result |
|---|---|
| `npx tsc -p tsconfig.app.json --noEmit` | exit 0 |
| `npx tsc -p tsconfig.node.json --noEmit` | exit 0 |
| `npx vitest run --configLoader runner tests/integration tests/unit` | exit 0; 323 files passed; 5,306 tests passed; zero failures |

The focused schema-generation, schema-inventory, and migration checks also ran
before the full gate: 9 selected tests passed across 3 files.
