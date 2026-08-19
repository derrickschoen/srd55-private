# SQL traffic corpus — 2026-08-18

Measured locally on 2026-08-17 at 23:18 America/New_York with
`@sqlite.org/sqlite-wasm` 3.53.0-build1 and Vitest 4.1.10. This is a traffic
corpus, not an optimization patch. The hook lives entirely under
`tests/helpers`; no production source or application bundle was changed. With
`DND_SQL_TRACE` absent, connection setup returns before inspecting or wrapping
the database.

## Run and interpretation

- Command: `DND_SQL_TRACE=.tmp/sql-trace npx vitest run --configLoader runner tests/integration/authoring/bundled-homebrew-installer.test.ts tests/integration/builder tests/integration/catalog`
- Result: **27/27 files passed; 318/318 tests passed**. Vitest wall duration was
  **66.28 s**; summed test time was **266.28 s** because files ran in parallel.
- Captured **3,635,787 executions**, **1,712 globally distinct normalized
  statements**, **13,701 per-file aggregates**, **48,891 ms** of SQLite PROFILE
  time, **1,503,347 FULLSCAN_STEPs**, and **254,449,446 VM steps**.
- Scope includes per-test schema creation, application seeding, fixture setup,
  and the application/test queries. Counts therefore describe the actual
  requested test traffic, not production-only traffic.
- SQL comes from `sqlite3_sql()`, so bind values are never expanded into the
  corpus; placeholders remain `?`. Normalization trims and collapses whitespace.
- SQLite PROFILE values in this WASM build were observed in 1,000 µs increments.
  A recorded `0 µs` means below profiler resolution, not free. Totals below
  retain the measured values without extrapolation.
- Statement IDs are the first 10 hexadecimal characters of SHA-256 over the
  complete normalized SQL. The ignored raw files in `.tmp/sql-trace/` carry the
  full SQL and all counters.

## Top 30 statements by total SQLite time

| # | ID | Total ms | Executions | Max ms | Files | SQL (first 180 characters) |
|---:|---|---:|---:|---:|---:|---|
| 1 | `a3ec26061c` | 4,761 | 1,989 | 13 | 11 | SELECT * FROM catalog_content_fingerprints ORDER BY 1, 2, 3, 4 |
| 2 | `a73ff10015` | 4,103 | 72,423 | 7 | 21 | SELECT version.*, identity.content_key AS spell_identity_key FROM spell_versions AS version INNER JOIN spell_identities AS identity ON identity.id = version.spell_identity_id WHER… |
| 3 | `f5dafaea88` | 4,090 | 1,989 | 11 | 11 | SELECT * FROM catalog_content_identities ORDER BY 1, 2, 3, 4 |
| 4 | `253e74033e` | 1,995 | 40,280 | 2 | 21 | SELECT fingerprint_digest FROM catalog_content_fingerprints WHERE content_kind = ? AND content_key = ? AND fingerprint_scheme = ? AND fingerprint_role IN ('current', 'compatible')… |
| 5 | `6c1846fb8f` | 1,947 | 71,434 | 8 | 24 | INSERT INTO catalog_content_fingerprints ( content_kind, fingerprint_scheme, fingerprint_digest, canonical_json, content_key, fingerprint_role ) VALUES (?, ?, ?, ?, ?, ?) |
| 6 | `35817b0810` | 1,930 | 56,616 | 4 | 19 | INSERT INTO spell_versions ( content_key, spell_identity_id, display_name, rules_edition, level, school, ritual, concentration, casting_time, action_type, range, range_kind, range… |
| 7 | `076cc1d950` | 1,871 | 750,279 | 6 | 27 | SELECT last_insert_rowid() |
| 8 | `e373cbfd00` | 1,644 | 72,423 | 10 | 21 | SELECT * FROM spell_list_memberships WHERE spell_version_id = ? |
| 9 | `552324210b` | 1,474 | 166 | 17 | 18 | SELECT child.content_key AS digest_owner_key, child.*, identity.content_key AS digest_ref_spell_identity_key FROM spell_versions AS child JOIN catalog_content_identities AS regist… |
| 10 | `a3706c6f65` | 1,467 | 72,659 | 12 | 24 | INSERT INTO catalog_content_identities ( content_key, content_kind, key_kind, catalog_layer, visibility, normalized_name ) VALUES (?, ?, 'bundled-stable', 'bundled', ?, ?) |
| 11 | `3301b797ff` | 997 | 7,730 | 1 | 3 | SELECT DISTINCT identity.content_key FROM catalog_content_fingerprints AS fingerprint JOIN catalog_content_identities AS identity ON identity.content_kind = fingerprint.content_ki… |
| 12 | `8395778b86` | 992 | 72,893 | 5 | 24 | INSERT OR IGNORE INTO catalog_content_provenance ( content_kind, content_key, origin_kind, received, local_derivation, author_label, source_label, license_label, attribution_text … |
| 13 | `518e0e9efa` | 891 | 146,128 | 4 | 19 | INSERT INTO spell_list_memberships ( spell_version_id, spell_list_key, created_at, updated_at ) VALUES (?, ?, ?, ?) |
| 14 | `2ae702c808` | 850 | 166 | 11 | 18 | SELECT root.content_key AS digest_owner_key, child.* FROM spell_list_memberships AS child JOIN spell_versions AS root ON root.id = child.spell_version_id JOIN catalog_content_iden… |
| 15 | `bca16eec2d` | 754 | 77,551 | 5 | 19 | SELECT content_kind, key_kind, catalog_layer FROM catalog_content_identities WHERE content_key = ? |
| 16 | `7cde021415` | 716 | 4,330 | 4 | 21 | SELECT * FROM class_progressions WHERE class_definition_id = ? ORDER BY class_level |
| 17 | `1321a6e186` | 603 | 56,638 | 5 | 19 | SELECT id, canonical_name, normalized_name FROM spell_identities WHERE content_key = ? |
| 18 | `9878bea4c4` | 601 | 166 | 8 | 18 | SELECT fingerprint.* FROM catalog_content_fingerprints AS fingerprint JOIN catalog_content_identities AS registry ON registry.content_kind = fingerprint.content_kind AND registry.… |
| 19 | `dffedce1a9` | 517 | 166 | 6 | 18 | SELECT * FROM catalog_content_identities WHERE key_kind = 'bundled-stable' AND catalog_layer = 'bundled' |
| 20 | `9099fa329d` | 492 | 51,189 | 4 | 18 | SELECT content_kind, key_kind, catalog_layer, normalized_name FROM catalog_content_identities WHERE content_key = ? |
| 21 | `40a1494346` | 476 | 60,003 | 2 | 19 | SELECT display_name AS name FROM spell_versions WHERE content_key = ? |
| 22 | `b1fd1dfd00` | 393 | 77,551 | 1 | 19 | SELECT normalized_name FROM catalog_content_identities WHERE content_kind = ? AND content_key = ? |
| 23 | `a78cdd5075` | 378 | 166 | 4 | 18 | SELECT root.content_key AS digest_owner_key, child.* FROM class_progressions AS child JOIN class_definitions AS root ON root.id = child.class_definition_id JOIN catalog_content_id… |
| 24 | `5eb74d22ed` | 347 | 4,330 | 1 | 21 | SELECT * FROM class_equipment_items WHERE class_definition_id = ? ORDER BY option, sort_order |
| 25 | `f414e77332` | 339 | 51,191 | 1 | 18 | SELECT provenance FROM spell_versions WHERE content_key = ? |
| 26 | `427a7a5bb7` | 326 | 56,616 | 2 | 19 | INSERT INTO spell_identities ( content_key, canonical_name, normalized_name, created_at, updated_at ) VALUES (?, ?, ?, ?, ?) ON CONFLICT(content_key) DO NOTHING |
| 27 | `8a0cd11482` | 311 | 4,330 | 3 | 21 | SELECT * FROM class_resources WHERE class_definition_id = ? ORDER BY class_level, resource_kind |
| 28 | `726e9fa898` | 304 | 70,022 | 1 | 23 | SELECT catalog_layer FROM catalog_content_identities WHERE content_kind = ? AND content_key = ? |
| 29 | `2b997b65ac` | 298 | 6,296 | 3 | 21 | SELECT * FROM weapon_templates WHERE content_key = ? |
| 30 | `4411567687` | 255 | 141 | 20 | 15 | SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE type IN ('table', 'index', 'trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name |

## Top 30 statements by execution count

| # | ID | Total ms | Executions | Max ms | Files | SQL (first 180 characters) |
|---:|---|---:|---:|---:|---:|---|
| 1 | `076cc1d950` | 1,871 | 750,279 | 6 | 27 | SELECT last_insert_rowid() |
| 2 | `518e0e9efa` | 891 | 146,128 | 4 | 19 | INSERT INTO spell_list_memberships ( spell_version_id, spell_list_key, created_at, updated_at ) VALUES (?, ?, ?, ?) |
| 3 | `6624ca2055` | 37 | 133,594 | 1 | 21 | SAVEPOINT oo1 |
| 4 | `fe4ee08f0c` | 235 | 132,415 | 1 | 21 | RELEASE oo1 |
| 5 | `f2d48d23a5` | 219 | 77,562 | 1 | 20 | SELECT fingerprint_scheme, fingerprint_digest, canonical_json FROM catalog_content_fingerprints WHERE content_kind = ? AND content_key = ? AND fingerprint_role = 'current' ORDER B… |
| 6 | `bca16eec2d` | 754 | 77,551 | 5 | 19 | SELECT content_kind, key_kind, catalog_layer FROM catalog_content_identities WHERE content_key = ? |
| 7 | `b1fd1dfd00` | 393 | 77,551 | 1 | 19 | SELECT normalized_name FROM catalog_content_identities WHERE content_kind = ? AND content_key = ? |
| 8 | `39955a8939` | 139 | 75,692 | 1 | 25 | SELECT content_key, key_kind, catalog_layer FROM catalog_content_identities WHERE content_kind = ? AND content_key = ? |
| 9 | `8395778b86` | 992 | 72,893 | 5 | 24 | INSERT OR IGNORE INTO catalog_content_provenance ( content_kind, content_key, origin_kind, received, local_derivation, author_label, source_label, license_label, attribution_text … |
| 10 | `a3706c6f65` | 1,467 | 72,659 | 12 | 24 | INSERT INTO catalog_content_identities ( content_key, content_kind, key_kind, catalog_layer, visibility, normalized_name ) VALUES (?, ?, 'bundled-stable', 'bundled', ?, ?) |
| 11 | `a73ff10015` | 4,103 | 72,423 | 7 | 21 | SELECT version.*, identity.content_key AS spell_identity_key FROM spell_versions AS version INNER JOIN spell_identities AS identity ON identity.id = version.spell_identity_id WHER… |
| 12 | `e373cbfd00` | 1,644 | 72,423 | 10 | 21 | SELECT * FROM spell_list_memberships WHERE spell_version_id = ? |
| 13 | `f76300e7b4` | 53 | 72,423 | 1 | 21 | SELECT * FROM spell_version_tags WHERE spell_version_id = ? |
| 14 | `c22e25d0fb` | 39 | 72,423 | 1 | 21 | SELECT * FROM spell_version_save_abilities WHERE spell_version_id = ? |
| 15 | `cf3473533e` | 35 | 72,423 | 1 | 21 | SELECT * FROM spell_version_cantrip_upgrade_levels WHERE spell_version_id = ? |
| 16 | `bf83ada767` | 25 | 72,423 | 1 | 21 | SELECT * FROM spell_version_upcast_levels WHERE spell_version_id = ? |
| 17 | `fc73bdf423` | 24 | 72,423 | 1 | 21 | SELECT * FROM spell_version_attack_modes WHERE spell_version_id = ? |
| 18 | `6c1846fb8f` | 1,947 | 71,434 | 8 | 24 | INSERT INTO catalog_content_fingerprints ( content_kind, fingerprint_scheme, fingerprint_digest, canonical_json, content_key, fingerprint_role ) VALUES (?, ?, ?, ?, ?, ?) |
| 19 | `726e9fa898` | 304 | 70,022 | 1 | 23 | SELECT catalog_layer FROM catalog_content_identities WHERE content_kind = ? AND content_key = ? |
| 20 | `d80408cc6a` | 109 | 69,589 | 1 | 20 | SELECT canonical_json FROM catalog_content_fingerprints WHERE content_kind = ? AND content_key = ? AND fingerprint_scheme = ? AND fingerprint_digest = ? |
| 21 | `40a1494346` | 476 | 60,003 | 2 | 19 | SELECT display_name AS name FROM spell_versions WHERE content_key = ? |
| 22 | `2fb1a5b117` | 39 | 58,989 | 1 | 19 | SELECT key_kind, catalog_layer, normalized_name FROM catalog_content_identities WHERE content_kind = 'spell' AND content_key = ? |
| 23 | `1321a6e186` | 603 | 56,638 | 5 | 19 | SELECT id, canonical_name, normalized_name FROM spell_identities WHERE content_key = ? |
| 24 | `ba68b55919` | 94 | 56,617 | 1 | 20 | DELETE FROM spell_list_memberships WHERE spell_version_id = ? |
| 25 | `35817b0810` | 1,930 | 56,616 | 4 | 19 | INSERT INTO spell_versions ( content_key, spell_identity_id, display_name, rules_edition, level, school, ritual, concentration, casting_time, action_type, range, range_kind, range… |
| 26 | `427a7a5bb7` | 326 | 56,616 | 2 | 19 | INSERT INTO spell_identities ( content_key, canonical_name, normalized_name, created_at, updated_at ) VALUES (?, ?, ?, ?, ?) ON CONFLICT(content_key) DO NOTHING |
| 27 | `f0857d6864` | 207 | 56,616 | 2 | 19 | SELECT id FROM spell_versions WHERE content_key = ? AND provenance = 'srd' |
| 28 | `37226c6cfb` | 44 | 56,616 | 1 | 19 | SELECT id, provenance FROM spell_versions WHERE content_key = ? |
| 29 | `e44b9bbde5` | 47 | 56,011 | 1 | 18 | SELECT 1 FROM spell_versions WHERE content_key = ? |
| 30 | `f414e77332` | 339 | 51,191 | 1 | 18 | SELECT provenance FROM spell_versions WHERE content_key = ? |

## Scan-scale statements

“Scan-scale” is defined here as SQLite reporting at least **100 FULLSCAN_STEPs
in one execution**. Exactly **27** normalized statements met that measured
threshold; **13** accumulated at least 1,000 steps across the run.
FULLSCAN_STEP is SQLite's rows-visited-by-full-table-scan counter; it is not
result-row count.

| # | ID | Max steps/run | Total steps | Executions | Total ms | SQL (first 180 characters) |
|---:|---|---:|---:|---:|---:|---|
| 1 | `f5dafaea88` | 454 | 684,023 | 1,989 | 4,090 | SELECT * FROM catalog_content_identities ORDER BY 1, 2, 3, 4 |
| 2 | `a3ec26061c` | 454 | 664,377 | 1,989 | 4,761 | SELECT * FROM catalog_content_fingerprints ORDER BY 1, 2, 3, 4 |
| 3 | `4411567687` | 250 | 35,250 | 141 | 255 | SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE type IN ('table', 'index', 'trigger') AND name NOT LIKE 'sqlite_%' ORDER BY type, name |
| 4 | `8442f24960` | 250 | 34,250 | 137 | 9 | SELECT name FROM sqlite_schema WHERE type = 'trigger' |
| 5 | `7e3fd82ab0` | 250 | 33,250 | 133 | 4 | DROP TRIGGER catalog_content_supersessions_refuse_delete_before_delete |
| 6 | `ca27f3c6a2` | 232 | 30,856 | 133 | 15 | SELECT sql FROM sqlite_schema WHERE type = 'trigger' AND name = ? |
| 7 | `fac97fc1e4` | 341 | 2,369 | 7 | 2 | SELECT count(*) FROM spell_list_memberships AS membership INNER JOIN spell_versions AS version ON version.id = membership.spell_version_id WHERE version.provenance = 'srd' |
| 8 | `2fef763af6` | 250 | 1,000 | 137 | 1 | SELECT count(*) FROM sqlite_schema WHERE type = 'table' AND name = 'characters' |
| 9 | `9dac8a9135` | 444 | 888 | 2 | 0 | SELECT fingerprint_scheme, fingerprint_digest, canonical_json, fingerprint_role FROM catalog_content_fingerprints WHERE content_key = ? ORDER BY fingerprint_scheme, fingerprint_di… |
| 10 | `fec6ff128c` | 443 | 886 | 2 | 2 | SELECT content_kind, content_key FROM catalog_content_identities ORDER BY content_kind, content_key |
| 11 | `7c78f36983` | 443 | 886 | 2 | 4 | SELECT content_kind, content_key, fingerprint_scheme, fingerprint_digest, fingerprint_role FROM catalog_content_fingerprints ORDER BY content_kind, content_key, fingerprint_scheme… |
| 12 | `5141be38c4` | 874 | 874 | 1 | 1 | SELECT membership.spell_version_id, membership.spell_list_key FROM spell_list_memberships AS membership JOIN spell_versions AS spell ON spell.id = membership.spell_version_id ORDE… |
| 13 | `d4846267d2` | 443 | 443 | 1 | 0 | SELECT count(*) FROM catalog_content_identities WHERE key_kind &lt;&gt; 'bundled-stable' OR catalog_layer &lt;&gt; 'bundled' |
| 14 | `65d8487dde` | 339 | 339 | 1 | 0 | SELECT count(*) FROM spell_versions WHERE display_name = 'Homebrew Spell' |
| 15 | `0248319003` | 338 | 339 | 8 | 20 | SELECT version.*, identity.catalog_layer, ( SELECT group_concat(value, char(31)) FROM ( SELECT membership.spell_list_key AS value FROM spell_list_memberships AS membership WHERE m… |
| 16 | `3925850739` | 251 | 251 | 1 | 0 | DROP TRIGGER fail_configured_choice_effect |
| 17 | `d89cea1ef0` | 250 | 250 | 1 | 3 | ALTER TABLE background_definitions ADD COLUMN future_root_semantic INTEGER |
| 18 | `06162c4641` | 250 | 250 | 1 | 3 | ALTER TABLE background_equipment_items ADD COLUMN future_child_semantic INTEGER |
| 19 | `e421fc3caf` | 250 | 250 | 1 | 3 | ALTER TABLE background_templates ADD COLUMN future_template_semantic INTEGER |
| 20 | `65bc0968b2` | 250 | 250 | 1 | 4 | ALTER TABLE class_definitions ADD COLUMN future_root_semantic INTEGER |
| 21 | `000497a6ff` | 250 | 250 | 1 | 6 | ALTER TABLE class_resources ADD COLUMN future_child_semantic INTEGER |
| 22 | `f60a62497e` | 250 | 250 | 1 | 3 | ALTER TABLE feat_definitions ADD COLUMN future_root_semantic INTEGER |
| 23 | `e1c40abc48` | 250 | 250 | 1 | 3 | ALTER TABLE species_definitions ADD COLUMN future_root_semantic INTEGER |
| 24 | `7fbed1f48d` | 250 | 250 | 1 | 3 | ALTER TABLE species_template_traits ADD COLUMN future_child_semantic INTEGER |
| 25 | `52c817a485` | 250 | 250 | 1 | 3 | ALTER TABLE species_templates ADD COLUMN future_template_semantic INTEGER |
| 26 | `048034ac5d` | 250 | 250 | 1 | 3 | ALTER TABLE spell_version_tags ADD COLUMN future_tag_mechanic INTEGER |
| 27 | `f9133a3c57` | 250 | 250 | 1 | 5 | ALTER TABLE spell_versions ADD COLUMN future_mechanic INTEGER |

The two dominant scan statements are the test image-equality reads
`SELECT * FROM catalog_content_identities ORDER BY 1, 2, 3, 4` and
`SELECT * FROM catalog_content_fingerprints ORDER BY 1, 2, 3, 4`: together they
account for **1,348,400 / 1,503,347 (89.69%)** measured FULLSCAN_STEPs and
**8,851 / 48,891 ms (18.10%)** of measured SQLite time. Eleven of the
threshold-crossing statements are deliberate `ALTER TABLE` exercises over
seeded test databases, each maxing at 250 steps.

## Per-file SQL totals

| File | Unique statements | Executions | Total ms | Max statement ms | Full-scan steps | Max scan/run | VM steps |
|---|---:|---:|---:|---:|---:|---:|---:|
| `authoring/bundled-homebrew-installer.test.ts` | 824 | 557,698 | 14,781 | 20 | 1,243,890 | 454 | 99,102,356 |
| `builder/guided-species.test.ts` | 821 | 744,926 | 5,851 | 13 | 39,293 | 338 | 37,728,619 |
| `catalog/bundled-content-registry-v1.test.ts` | 534 | 401,334 | 3,699 | 27 | 19,341 | 443 | 19,885,637 |
| `builder/guided-background-choices.test.ts` | 625 | 274,243 | 2,647 | 14 | 18,020 | 443 | 13,972,971 |
| `builder/guided-equipment-step.test.ts` | 671 | 256,344 | 2,316 | 14 | 13,561 | 250 | 12,974,045 |
| `builder/guided-creation.test.ts` | 548 | 214,578 | 2,172 | 17 | 11,286 | 250 | 10,867,222 |
| `catalog/subclass-provenance.test.ts` | 501 | 153,499 | 1,904 | 13 | 58,141 | 363 | 7,009,825 |
| `builder/guided-skill-grants.test.ts` | 606 | 177,556 | 1,753 | 14 | 9,364 | 250 | 8,970,188 |
| `catalog/spell-fork.test.ts` | 620 | 139,106 | 1,734 | 13 | 41,256 | 444 | 7,324,211 |
| `builder/guided-skills-step.test.ts` | 628 | 157,888 | 1,672 | 14 | 8,331 | 250 | 7,975,568 |
| `builder/guided-abilities.test.ts` | 613 | 119,280 | 1,359 | 20 | 6,157 | 250 | 5,981,456 |
| `catalog/stored-authored-content-projector-v2.test.ts` | 523 | 98,053 | 1,309 | 13 | 7,790 | 444 | 5,311,708 |
| `builder/guided-background.test.ts` | 550 | 97,665 | 1,123 | 14 | 5,145 | 250 | 4,944,340 |
| `catalog/bundled-content-digest-v1.test.ts` | 509 | 29,303 | 978 | 17 | 4,382 | 874 | 2,817,464 |
| `catalog/stored-authored-content-projector-v1.test.ts` | 324 | 14,759 | 780 | 7 | 1,500 | 250 | 486,984 |
| `builder/guided-build-state.test.ts` | 497 | 42,128 | 700 | 13 | 2,052 | 250 | 2,077,013 |
| `builder/guided-expertise-and-spells.test.ts` | 625 | 42,231 | 665 | 15 | 2,108 | 250 | 2,161,962 |
| `catalog/content-adoption.test.ts` | 480 | 35,078 | 642 | 12 | 3,897 | 443 | 1,561,706 |
| `catalog/import.test.ts` | 561 | 26,222 | 603 | 11 | 6,426 | 443 | 1,329,090 |
| `catalog/structured-values.test.ts` | 309 | 12,694 | 529 | 8 | 5 | 2 | 345,284 |
| `catalog/species-template-only-projector-v1.test.ts` | 447 | 19,479 | 398 | 16 | 44 | 11 | 975,382 |
| `catalog/source-content-importer.test.ts` | 358 | 6,780 | 278 | 3 | 81 | 2 | 196,851 |
| `catalog/content-registry.test.ts` | 380 | 4,466 | 268 | 11 | 3 | 2 | 125,222 |
| `catalog/source-content-projector-v1.test.ts` | 340 | 3,611 | 256 | 13 | 750 | 250 | 112,450 |
| `catalog/spell-content-projector-v1.test.ts` | 269 | 2,483 | 196 | 5 | 500 | 250 | 72,453 |
| `catalog/equipment-import.test.ts` | 283 | 3,133 | 176 | 5 | 24 | 2 | 104,551 |
| `catalog/stored-equipment-content-projector-v1.test.ts` | 255 | 1,250 | 102 | 7 | 0 | 0 | 34,888 |

## Immediate corpus signals

- The authoring installer file alone generated **557,698 executions** and
  **14,781 ms** of measured SQLite time; guided species generated **744,926
  executions** and **5,851 ms**. Together they account for **35.82% of
  executions** and **42.20% of measured SQLite time** in this corpus.
- `SELECT last_insert_rowid()` ran **750,279** times. It is automatically issued
  after every `DatabaseContext.exec`, including statements where an inserted row
  ID is not useful, and consumed **1,871 ms** measured time.
- Spell-version lookup plus membership lookup each ran **72,423** times; their
  combined measured time was **5,747 ms**.
- The fingerprint-role lookup ran **40,280** times and consumed **1,995 ms**,
  while executing **37,934,389 VM steps**—the largest VM-step total of any
  single normalized statement.
- Full image-equality reads dominate measured scanning; the highest-frequency
  application traffic is dominated by repeated seed/install writes and spell
  catalog lookups. The corpus identifies targets but does not by itself
  establish which repetitions can be removed without changing behavior.
