# Static TypeScript Port Build Plan

Status values: `not-started`, `in-progress`, `done`.

The PHP domain, Laravel migrations, Pest tests, and current Inertia/Vue screens are
the parity oracle. Tests are moved to the synchronous engine/SQLite boundary or
the asynchronous Worker RPC boundary; the discarded HTTP envelope is not ported.
Every increment includes a deliberate production mutation proving its new tests
fail at the intended persisted-state assertion.

## Ordered increments

| # | Status | Increment | Independently verifiable exit criteria |
|---|---|---|---|
| 1 | done | Complete final SQLite schema | The final state of every migration is represented: all 38 tables, columns, defaults, indexes, unique constraints, foreign keys/actions, selection eligibility, subclass progressions, operations, simplified Wizard spellbook, assignment CHECK, and two triggers. Metadata and persisted constraint tests pass. |
| 2 | not-started | Catalog and persistence primitives | Synchronous typed SQLite helpers, transactions, row/JSON codecs, catalog/source enums, and seed/test factories work inside the Worker-compatible engine. |
| 3 | not-started | Rules value objects and slot math | Ability scores/modifiers, proficiency, attack/save values, progression types, per-class rounding-before-summing caster contributions, multiclass slots, pact slots, and level bounds match the PHP property/unit cases. |
| 4 | not-started | Grant-rule DSL model | Parse and validate the six grant kinds (`fixed_spell`, `choice_from_list`, `choice_from_query`, `spellbook_acquisition`, `capability`, `grant_source`) plus free-cast/pool metadata with PHP-equivalent errors. |
| 5 | not-started | Grant-rule slot generator | Materialize, update, reactivate, orphan, and preserve stable keyed slots and Wizard acquisitions synchronously and transactionally; assert persisted rows for all six kinds. |
| 6 | not-started | Selection eligibility refresh/search | Current catalog, edition, list/school/tag/level/collection predicates produce and persist `valid`, `invalid`, or `unselected` with matching reasons; eligible search matches the oracle. |
| 7 | not-started | Spell access/route builder | Build prepared/known/fixed/free-cast/capability routes, deduplicate routes, and implement the `kept_override` house-rule bypass while still excluding inactive versions. |
| 8 | not-started | Duplicate detection | Same-version, cross-version/same-identity, same-name/different-identity, route, severity, fingerprint, and acknowledgement invalidation behavior matches PHP. |
| 9 | not-started | Build-report builder | Character summary, multiclass/pact slots, source sections, spellbook, access routes, warnings, and deterministic ordering match feature fixtures. |
| 10 | not-started | Printable-list builder | Grouping, route annotations, stats, free-cast wording, descriptions, rituals, deterministic ordering, and completeness validation match PHP. |
| 11 | not-started | Command validation and integrity | Typed payload union rejects unknown/ill-typed fields and signs/verifies restore payloads with Web Crypto-compatible deterministic integrity behavior. |
| 12 | not-started | Commands 1–5 | Implement `update_ability` and all four `set_slot` modes (`select`, `clear`, `keep_override`, `restore`) with `apply()`/`inverse()` and persisted audit effects. |
| 13 | not-started | Commands 6–9 | Implement `update_character_rules`, `update_source_config`, `add_source`, and `remove_source` with `apply()`/`inverse()`, regeneration, nested sources, and rollback. |
| 14 | not-started | Commands 10–13 | Implement both `acknowledge_warning` modes, `update_class`, and `restore_snapshot` with `apply()`/`inverse()` and integrity checks. |
| 15 | not-started | Revision-guarded command executor | Atomic expected-revision checks, operation UUID idempotency, revision increments, inverse-command persistence, audit grouping, and transaction rollback match PHP. |
| 16 | not-started | Typed Worker command RPC | Replace spike RPC with typed request/response/error envelopes, command dispatch, initialization, reset, and lifecycle; all storage-coupled engine calls remain synchronous in the Worker and every connection enables foreign keys. |
| 17 | not-started | Worker query RPC | Character/catalog CRUD, workspace, eligible spells, save points, reports, printable data, and operation/history queries expose typed read models without leaking SQLite objects. |
| 18 | not-started | Catalog JSON import | Document the user JSON schema; validate/import transactionally into OPFS SQLite, upsert stable keys, preserve user content, tombstone absent imports, and report actionable record errors. |
| 19 | not-started | Database and character backup | Export/import the whole SQLite database plus portable per-character JSON (sources, slots, spellbook, preferences, overrides, acknowledgements, save points); validate versions and restore atomically. |
| 20 | not-started | Application shell and character list | Lightweight TypeScript DOM/CSS app supports create/open/delete, backup/import entry points, durable-storage status, routing, loading, empty, and error states. |
| 21 | not-started | Spreadsheet-grid planner | Faithfully port the Workspace grid, class/ability/rules/source editors, filters, eligible spell picker, invalid/orphan/override flows, undo/save points, warnings, and responsive keyboard-accessible interactions. |
| 22 | not-started | Reports and print UI | Build report and printable spell-list screens match the current Vue presentation and print behavior, including incomplete-data warnings. |
| 23 | not-started | PHP Unit parity suite | Re-base all 57 evaluated Unit cases on TypeScript value objects and synchronous engine/SQLite state; maintain a case mapping and sensitivity evidence. |
| 24 | not-started | PHP feature-to-e2e parity suite | Re-base the selected 28 end-to-end workflows on command/Worker RPC and persisted OPFS state, covering all user-visible mutation, report, import, backup, reload, and concurrency paths. |
| 25 | not-started | Full parity and durability audit | Run the complete Unit + 28-e2e suite, production build, fresh-profile import/use/export/reload journey, migration/schema diff, oracle coverage map, accessibility smoke, and final sensitivity audit; resolve all material gaps. |

## Global verification contract

- `npm test` runs after every increment.
- `npm run test:browser` also runs for Worker, UI, OPFS, import/export, or other
  persistence-touching increments.
- Tests assert stored rows whenever behavior has a persisted representation.
- Each increment records exact green → intentional failure → restored green
  evidence in `BUILD-PROGRESS.md`.
- Medium/high complexity increments receive a separate fresh
  `codex exec --sandbox read-only` review, for at most three rounds.
