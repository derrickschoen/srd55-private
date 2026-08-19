# Seeded application database size audit

Date: 2026-08-19

Scope: `src/db/schema.sql` plus `applicationSeed(db, 'full')`, exactly the
bundled database shared by tests and the production browser application. The
script runs the lifecycle's catalog-data migrations before `applicationSeed`,
so its two current-build migration markers are included. This
lane changes no schema, seed, source, or test file.

## Executive result

The serialized seed is **4,145,152 bytes**: 506 pages at 8,192 bytes, with no
freelist pages. It contains 3,879 rows in 87 application tables (37 non-empty,
50 empty). `dbstat` assigns 3,923,968 bytes to application table/index b-trees,
including 1,507,328 index bytes; `sqlite_schema` occupies 212,992 bytes. The
remaining 8,192-byte page is SQLite-owned bookkeeping.

The best first experiment is a **2 KiB page size**. Building the same schema
and same seed from scratch at 2 KiB produced **2,834,432 bytes**, a measured
reduction of **1,310,720 bytes (31.6%)** from the actual fresh image. A 4 KiB
fallback produced 3,293,184 bytes, saving 851,968 bytes (20.6%). The reason is
visible in the baseline: 50 empty-but-production-required tables account for
1,105,920 allocated bytes because each table and index b-tree pays at least one
8 KiB page.

The best data-model saving is conditional: bundled fingerprint
`canonical_json` occupies 795,093 logical bytes and its table occupies
1,138,688 bytes. Omitting only those values from an isolated packed-image
counterfactual saves **917,504 bytes**. This is not a blind column deletion:
current integrity and collision paths read the exact canonical bytes, so the
safe design is to retain canonical JSON for external content and regenerate it
from bundled stored projections when needed.

There are **no test-only wins recommended**. The measured seed is the production
seed. A reduced test-only corpus would make clones smaller by testing a
different database and would violate the stated shared-image objective. Every
positive proposal below is a production-image win as well as a test-clone win.

Perspective headlines: P1 finds 139,264 bytes of dead seeded timestamp detail,
65,536 bytes of redundant bundled provenance rows, and zero historical/orphan
cleanup; P2 finds 1,310,720 bytes from 2 KiB pages, 917,504 bytes from
single-copy bundled fingerprints, and an estimated 42,624 raw bytes from binary
digests; P3 confirms the timestamp win, measures a 49,152-byte focused
membership-timestamp subset, and rejects both grant-JSON normalization
(65,536 bytes larger) and prose trimming (0 authorized bytes).

## Reproduction and method

Run from the repository root:

```sh
node scripts/perf/db-size-audit.mjs
node scripts/perf/db-size-audit.mjs --json
```

The script invokes the real TypeScript application seed through Vite, exports
the image with `sqlite3_js_db_export`, reads allocated and payload bytes from
SQLite `dbstat`, and measures columns with
`SUM(LENGTH(CAST(column AS BLOB)))`. Table allocation includes each table's
indexes. Column totals are logical value bytes and intentionally exclude record
headers, varints, page slack, and indexes, so column shares must not be summed
against allocated table bytes.

Counterfactuals are isolated clones of the baseline followed by `VACUUM`; the
uniform packed baseline is 4,128,768 bytes. Page-size counterfactuals are fresh
schema-and-seed builds because an in-memory deserialized image cannot reliably
change its page size. Sizes are deterministic across repeated runs; timestamps
change but retain the same byte length.

Summary output from the final run:

```text
Seeded application database: 4,145,152 B (506 pages x 8192 B)
Rows: 3,879 across 87 application tables; freelist: 0 B

Isolated packed-image counterfactuals:
packed baseline (VACUUM only)                         4,128,768 B
4 KiB SQLite pages                                   3,293,184 B
2 KiB SQLite pages                                   2,834,432 B
omit bundled fingerprint canonical_json values      3,211,264 B  (917,504 B saved)
omit bundled provenance rows                         4,063,232 B  (65,536 B saved)
remove/minimize seeded timestamps                    3,989,504 B  (139,264 B saved)
omit spell-list membership timestamps                4,079,616 B  (49,152 B saved)
normalize repeated class progression grant_rules     4,194,304 B  (65,536 B larger)
```

### Largest tables

Bytes are decimal. The top five requested in the final report are the first
five rows.

| Table | Rows | Allocated bytes | Payload bytes | Index bytes |
|---|---:|---:|---:|---:|
| `catalog_content_fingerprints` | 444 | **1,138,688** | 941,403 | 155,648 |
| `spell_versions` | 339 | **434,176** | 359,400 | 49,152 |
| `catalog_content_identities` | 444 | **188,416** | 99,003 | 131,072 |
| `spell_list_memberships` | 875 | **122,880** | 75,227 | 49,152 |
| `class_progressions` | 240 | **114,688** | 90,101 | 8,192 |
| `catalog_content_provenance` | 444 | 90,112 | 49,085 | 49,152 |
| `spell_identities` | 339 | 65,536 | 42,785 | 16,384 |
| `spell_selection_slots` | 0 | 65,536 | 0 | 57,344 |
| `subclass_definitions` | 12 | 49,152 | 11,183 | 24,576 |
| `character_source_instances` | 0 | 40,960 | 0 | 32,768 |
| `feat_definitions` | 17 | 40,960 | 9,351 | 16,384 |
| `species_template_traits` | 33 | 40,960 | 13,143 | 16,384 |
| `catalog_content_drafts` | 0 | 32,768 | 0 | 24,576 |
| `change_log` | 0 | 32,768 | 0 | 24,576 |
| `character_effects` | 0 | 32,768 | 0 | 24,576 |
| `character_skill_expertise_grants` | 0 | 32,768 | 0 | 24,576 |
| `character_skill_grants` | 0 | 32,768 | 0 | 24,576 |
| `class_resources` | 160 | 32,768 | 14,530 | 8,192 |
| `wizard_spellbook_entries` | 0 | 32,768 | 0 | 24,576 |

The script prints all 87 tables. For completeness, all other non-empty tables
are: `background_definitions` 4/24,576 B,
`background_equipment_items` 30/24,576 B, `background_templates` 4/24,576 B,
`class_definitions` 12/24,576 B, `class_equipment_items` 96/24,576 B,
`named_features` 2/24,576 B, `species_definitions` 4/24,576 B,
`species_templates` 9/24,576 B, `subclass_features` 58/24,576 B,
and the following at 16,384 B each: `armor_templates` (13),
`catalog_data_migrations` (2),
`class_armor_training` (22), `class_extra_attack_grants` (7),
`class_feature_effects` (2), `class_feature_value_contributions` (1),
`class_martial_arts_dice` (20), `class_resource_formulas` (18),
`class_saving_throw_proficiencies` (24), `class_sheet_traits` (12),
`class_skill_options` (78), `class_weapon_mastery_counts` (40),
`class_weapon_mastery_grants` (12), `class_weapon_proficiencies` (18),
`named_feature_effects` (2), `species_template_trait_effects` (4), and
`weapon_templates` (38).

### Column shares for the largest populated tables

| Table | Measured value bytes | Largest columns and share of measured values |
|---|---:|---|
| `catalog_content_fingerprints` | 841,472 | `canonical_json` 795,093 (94.5%); digest 28,416 (3.4%); key 8,100 (1.0%) |
| `spell_versions` | 329,542 | `short_summary` 256,414 (77.8%); timestamps 16,272 (4.9%); components 7,992 (2.4%) |
| `catalog_content_identities` | 35,631 | `created_at` 8,436 (23.7%); key 8,100 (22.7%); key kind 6,216 (17.4%) |
| `spell_list_memberships` | 52,120 | timestamps 42,000 (80.6%); list key 5,254 (10.1%); ids 4,866 (9.3%) |
| `class_progressions` | 86,684 | `grant_rules` 68,133 (78.6%); timestamps 11,520 (13.3%); slots 4,300 (5.0%) |
| `catalog_content_provenance` | 23,291 | recorded time 8,436 (36.2%); key 8,100 (34.8%); origin 3,552 (15.3%) |
| `spell_identities` | 29,583 | timestamps 16,272 (55.0%); canonical/normalized names 8,274 (28.0%); key 4,128 (14.0%) |
| `subclass_definitions` | 10,299 | `grant_rules` 9,099 (88.3%) |
| `feat_definitions` | 8,190 | notes 5,237 (63.9%); grant rules 672 (8.2%) |
| `species_template_traits` | 12,092 | description 9,961 (82.4%); timestamps 1,584 (13.1%) |

### Largest individual values

Nineteen of the top 20 values are fingerprint canonical JSON. The only other
entry is the user-facing Wish description in `spell_versions.short_summary`.

| Bytes | Location | Rowid / identified content |
|---:|---|---|
| 21,562 | fingerprint canonical JSON | 402 / Wizard |
| 21,062 | fingerprint canonical JSON | 401 / Warlock |
| 20,919 | fingerprint canonical JSON | 393 / Cleric |
| 20,902 | fingerprint canonical JSON | 394 / Druid |
| 14,004 | fingerprint canonical JSON | 400 / Sorcerer |
| 12,261 | fingerprint canonical JSON | 392 / Bard |
| 10,647 | fingerprint canonical JSON | 398 / Ranger |
| 10,579 | fingerprint canonical JSON | 397 / Paladin |
| 8,388 | fingerprint canonical JSON | 395 / Fighter |
| 6,634 | fingerprint canonical JSON | 396 / Monk |
| 6,417 | fingerprint canonical JSON | 391 / Barbarian |
| 6,204 | fingerprint canonical JSON | 440 / Tiefling |
| 5,993 | fingerprint canonical JSON | 434 / Elf |
| 5,335 | fingerprint canonical JSON | 399 / Rogue |
| 4,704 | fingerprint canonical JSON | 337 / Wish |
| 4,693 | fingerprint canonical JSON | 241 / Prismatic Wall |
| 3,976 | fingerprint canonical JSON | 307 / Teleport |
| 3,853 | fingerprint canonical JSON | 304 / Symbol |
| 3,842 | fingerprint canonical JSON | 428 / Oath of Devotion |
| 3,841 | `spell_versions.short_summary` | 337 / Wish |

## P1 — Dead or outdated data

### P1.1 Remove seeded timestamps from immutable bundled rows

**Recommendation: do it; measured 139,264-byte packed-image saving, low to
medium risk.** The seeded image stores 5,980 timestamp values totaling 139,070
logical bytes. The bundled digest deliberately removes `created_at` and `updated_at`
before canonicalization (`src/catalog/bundled-content-digest-v1.ts:364-379`),
the class projector does the same (`src/catalog/source-content-projector-v1.ts:542-567`),
and the spell projector excludes them (`src/catalog/spell-content-projector-v1.ts:174-193`).
They are written by the seeders but do not distinguish bundled content.

The narrowest proof is `spell_list_memberships`: eligibility reads only
`spell_version_id` and `spell_list_key`
(`src/eligibility/eligible-spell-search.ts:264-286`), while the seeder writes
two timestamps per row (`src/rules/spells-srd.ts:695-705`). Those 1,750 values
are 42,000 logical bytes; nulling just them saves 49,152 physical bytes.

Code impact: stop populating catalog timestamps on bundled inserts and relax or
separate the catalog row contracts/schema where timestamps are required only
for mutable external content. Tests that compare raw rows or generated
contracts change; production behavior should not. These values are dead in
production but may be pinned as raw storage detail in tests. This changes seed bytes, so
regenerate and review the bundled digest pin even though v1 currently omits
timestamps and is expected to retain the same semantic digest.

### P1.2 Do not persist default provenance rows for bundled identities

**Recommendation: do it; measured 65,536-byte packed-image saving, low risk.**
All 444 rows are exactly `catalog_layer=bundled`, `origin_kind=built_in`,
`received=0`, `local_derivation=0`; every optional label and attribution field
is null. Registration writes this row unconditionally
(`src/catalog/content-registry.ts:846-868`), but the production reader already
left-joins it and derives `built_in` from `catalog_layer=bundled` when the row
is absent (`src/catalog/content-provenance.ts:62-102`). This is behaviorally
redundant in production, but it is **not** dead in tests that assert raw stored
rows; external/user provenance rows remain.

Code impact: remove the `recordContentProvenance` call from bundled stable
registration and update the 11 test files that mention provenance/built-in
storage. D59 is unaffected: the database currently stores **zero attribution
text bytes**, while shipped SRD attribution remains in its required shared
licence asset. Treat this seed change as requiring digest regeneration/review.

### P1.3 Historical, superseded, and orphan cleanup has no current win

**Recommendation: no change; 0 bytes available.** Measured facts:

- fingerprints: 441 content-v1 current + 3 content-v2 current; **zero**
  compatible or bundled-historical rows;
- spell versions: 339 active, **zero** inactive/superseded versions;
- spell identities: 339, **zero** without a version and **zero** with multiple
  versions;
- archive, supersession, alias, and replacement tables: zero seeded rows;
- `PRAGMA foreign_key_check`: zero violations.

The fingerprint table is therefore not historical debris. Production reads it
for exact resolution and collision checking (`src/catalog/content-registry.ts:205-235`),
and D84 still requires digest fallback. Tests exercise the same behavior. No
row deletion is justified here.

## P2 — More efficient storage of the same information

### P2.1 Use a smaller page size for newly built images

**Recommendation: trial 2 KiB first; 1,310,720 bytes measured, medium risk.**

| Fresh build | Image bytes | Saving vs 8 KiB |
|---|---:|---:|
| 8 KiB baseline | 4,145,152 | — |
| 4 KiB | 3,293,184 | 851,968 (20.6%) |
| 2 KiB | 2,834,432 | 1,310,720 (31.6%) |

This retains every row, value, index, constraint, and table. It attacks b-tree
minimum-page slack, especially the 50 empty tables and their indexes. Code
would set `PRAGMA page_size` before the first schema statement in the new-image
path (`src/db/database-lifecycle.ts:261-290`) and in reset/test-image builders.
Existing images need an explicit rebuild/VACUUM path; the new per-worker image
can simply be built correctly. Risks are more b-tree pages (1,384 at 2 KiB vs
506 at 8 KiB), potentially more page-cache work and overflow pages on large
fingerprints. Gate with clone timing, seed timing, representative read/write
queries, and image equivalence. No bundled content digest re-pin should be
needed because logical content is unchanged.

### P2.2 Store bundled fingerprint canonical data once

**Recommendation: design, then implement; 917,504 bytes measured, high semantic
risk.** `canonical_json` is 795,093 logical bytes (94.5% of measured values in
the largest table), is already fully minified (measured whitespace saving:
zero), and largely repeats rows that remain in their source tables—including
the 256,414 bytes of user-facing spell descriptions.

Current readers are real, not vestigial:

- the rolled-up bundled digest includes the complete fingerprint row
  (`src/catalog/bundled-content-digest-v1.ts:423-450`);
- exact resolution hashes/compares canonical bytes to detect collisions
  (`src/catalog/content-registry.ts:210-235` and `:352-381`);
- spell repair checks canonical-byte integrity
  (`src/rules/spells-srd.ts:810-837`);
- portable external content re-projects and compares stored canonical JSON
  (`src/backup/portable-content.ts:804-829`).

Safe shape: retain full canonical JSON for external/current/compatible history;
for `catalog_layer=bundled`, store the 32-byte digest and regenerate canonical
bytes from the stored aggregate/projector only on collision/integrity fallback.
The normal D229 fast path can hash the authoritative stored rows once rather
than hashing both those rows and their duplicate canonical copy. D33/D59 and
D84 semantics remain; collision detection must still compare regenerated exact
bytes. This affects 36 fingerprint-focused test files and requires re-pinning
all moved bundled aggregates in the expected digest artifact.

### P2.3 Prefer binary digests over 64-character hex in storage

**Recommendation: consider after P2.2; estimated 42,624 raw bytes, medium risk,
not physically measured.** The 444 digest values use 28,416 table-value bytes.
A 32-byte BLOB would halve that to 14,208. The digest also appears in the
primary-key and resolution indexes, so the raw table+two-index estimate is
3 × 14,208 = 42,624 bytes before page packing. Code changes cover SHA-256
encoding/comparison, Zod/row codecs, import/export boundaries, query bindings,
and human-readable diagnostics. Keep wire/export digests hex if readability is
part of that contract. This is a schema and seeded-content representation
change, so re-pin the bundled digest. The estimate is explicitly not used in
the measured total or ranking above.

## P3 — More detail than consumers need

### P3.1 Timestamp precision is the only clear over-detail win

**Recommendation: P1.1; 139,264 bytes measured.** Exact per-row instants on an
immutable, transactionally installed corpus are more detail than any bundled
consumer needs. If retaining auditability is desired, one seed-installation
timestamp/build stamp supplies the information once. A focused first increment
can remove only `spell_list_memberships` timestamps for a measured 49,152-byte
win; that saving is a subset of 139,264 and is not additive.

### P3.2 Do not normalize class progression grant JSON for size

**Recommendation: reject.** The 240 rows contain 68,133 grant-rule bytes but
128 distinct values totaling 55,317 bytes: only 12,816 logical bytes are
duplicates. An intentionally favorable counterfactual stored one copy of each
distinct JSON value, nulled the inline values, and did not even charge the 240
foreign-key references. The image still **grew 65,536 bytes** because the new
table and unique index cost more pages than the deduplication saved. Consumers
need the exact rules at each level; inline storage is currently smaller.

### P3.3 Do not trim user-facing prose or attribution

**Recommendation: reject; 0 authorized bytes.** `spell_versions.short_summary`
is 256,414 logical bytes, but the sheet contract explicitly exposes the exact
stored bytes and maps them to the displayed description
(`src/queries/character-spell-section-builder.ts:125-136` and `:345-360`).
Species trait descriptions and feat notes likewise feed catalog/sheet content.
Passing structural tests would not make a prose-stripped production image
correct.

There is no repeated attribution text to normalize in this seed:
`catalog_content_provenance.attribution_text`, `author_label`, `source_label`,
and `license_label` total zero bytes. D59 attribution remains required and is
stored once in the shipped licence assets, not repeated per catalog row. If
future seeders add per-row identical attribution, reference one required shared
attribution record rather than removing it.

## Risk-adjusted proposal ranking

Savings are isolated and **not additive** where noted. Page-size savings use a
fresh 8 KiB baseline; other physical savings use the packed 4,128,768-byte
baseline.

| Rank | Proposal | Production + test saving | Risk | Digest cost | Decision |
|---:|---|---:|---|---|---|
| 1 | Build new images at 2 KiB pages | **1,310,720 measured** | Medium: page/cache performance | None expected | Trial first |
| 2 | Remove/minimize bundled timestamps | **139,264 measured** | Low-medium: raw-row contracts | Rebuild/review pin; semantic digest expected unchanged | Implement |
| 3 | Omit default bundled provenance rows | **65,536 measured** | Low: fallback already implements behavior | Rebuild/review pin | Implement |
| 4 | Omit bundled canonical JSON; regenerate on fallback | **917,504 measured** | High: D84/D229 collision integrity | Full repin/redesign | Design after low-risk wins |
| 5 | 4 KiB pages if 2 KiB query gates regress | **851,968 measured** | Low-medium | None expected | Fallback, mutually exclusive with rank 1 |
| 6 | Store fingerprint digests as BLOB | ~42,624 raw estimate | Medium: representation boundary | Repin | Optional follow-up |
| — | Normalize progression grant JSON | **−65,536 measured** | Adds indirection | Repin | Reject |
| — | Trim SRD/user-facing prose | 0 authorized | Breaks production completeness | Repin | Forbidden/reject |

## Assumptions and limits

- Physical counterfactuals blank/delete values while preserving the present
  schema unless stated. A final schema redesign may pack a few pages
  differently; only the measured counterfactual size is claimed.
- The 2 KiB result measures size, not runtime. Read/write/clone latency and
  memory must be benchmarked before adoption.
- Digest-as-BLOB savings are an estimate from table and two index occurrences,
  not a rebuilt-schema measurement.
- The timestamp counterfactual uses one byte for NOT NULL timestamps and null
  for nullable timestamps. Removing the columns entirely could save slightly
  more; preserving a single installation timestamp could save slightly less.
- `dbstat` allocation is page-granular. Logical column bytes explain content
  concentration but cannot predict exact released pages independently.
- No claim is made that empty tables are dead. They are empty because this is a
  pristine production image, but production and tests write them. The two
  catalog-data-migration ledger rows are included. Their bytes
  motivate page-size tuning, not table deletion.
- Every proposal that changes seeded logical bytes must run the required
  bundled-content digest regeneration/review workflow. D33 and D59 semantics
  are untouched; user-facing SRD content is not trimmed.
