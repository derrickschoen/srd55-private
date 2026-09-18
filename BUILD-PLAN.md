# Static TypeScript Port Build Plan

**Historical plan — completed 2026-07-23.** This file records the original
static-port sequence; it is not current operational guidance or a backlog.
Current operating rules are `.claude/decisions.md` (Part A) under the newest controlling
entries in `.claude/decisions.md`; executable compile configuration lives in
`package.json` and `tsconfig*.json`; implementation evidence lives in
`BUILD-PROGRESS.md`, `progress/`, `PARITY-AUDIT.md`, and the retained tests.
The PHP suite is ancestor/regression evidence, not a binding oracle (D201).

Status values: `not-started`, `in-progress`, `done`.

The PHP domain, Laravel migrations, Pest tests, and former Inertia/Vue screens
were the ancestor references used by this historical port. The retained
PHP-parity suite remains regression cover; adjudicated divergence is allowed
under D201. Tests were moved to the synchronous engine/SQLite boundary or the
asynchronous Worker RPC boundary; the discarded HTTP envelope was not ported.
Every increment includes a deliberate production mutation proving its new tests
fail at the intended persisted-state assertion.

## Ordered increments

| # | Status | Increment | Independently verifiable exit criteria | Evidence |
|---|---|---|---|---|
| 1 | done | Complete final SQLite schema | The final state of every migration is represented: all 38 tables, columns, defaults, indexes, unique constraints, foreign keys/actions, selection eligibility, subclass progressions, operations, simplified Wizard spellbook, assignment CHECK, and two triggers. Metadata and persisted constraint tests pass. | `tests/unit/schema.test.ts`; `progress/B00.md` |
| 2 | done | Catalog and persistence primitives | Synchronous typed SQLite helpers, transactions, row/JSON codecs, catalog/source enums, and seed/test factories work inside the Worker-compatible engine. | `tests/unit/db/query.test.ts`; `tests/unit/db/transaction.test.ts`; `progress/B00.md` |
| 3 | done | Rules value objects and slot math | Ability scores/modifiers, proficiency, attack/save values, progression types, per-class rounding-before-summing caster contributions, multiclass slots, pact slots, and level bounds match the PHP property/unit cases. | `tests/unit/rules/value-objects.test.ts`; `tests/integration/rules/class-progression.test.ts`; `progress/R10.md` |
| 4 | done | Grant-rule DSL model | Parse and validate the six grant kinds (`fixed_spell`, `choice_from_list`, `choice_from_query`, `spellbook_acquisition`, `capability`, `grant_source`) plus free-cast/pool metadata with PHP-equivalent errors. | `tests/unit/grants/grant-rule.test.ts`; `progress/G10.md` |
| 5 | done | Grant-rule slot generator | Materialize, update, reactivate, orphan, and preserve stable keyed slots and Wizard acquisitions synchronously and transactionally; assert persisted rows for all six kinds. | `tests/integration/grants/slot-generator.test.ts`; `progress/G20.md` |
| 6 | done | Selection eligibility refresh/search | Current catalog, edition, list/school/tag/level/collection predicates produce and persist `valid`, `invalid`, or `unselected` with matching reasons; eligible search matches the oracle. | `tests/integration/eligibility/persistence.test.ts`; `progress/E10.md` |
| 7 | done | Spell access/route builder | Build prepared/known/fixed/free-cast/capability routes, deduplicate routes, and implement the `kept_override` house-rule bypass while still excluding inactive versions. | `tests/integration/access/spell-access.test.ts`; `progress/A30.md` |
| 8 | done | Duplicate detection | Same-version, cross-version/same-identity, same-name/different-identity, route, severity, fingerprint, and acknowledgement invalidation behavior matches PHP. | `tests/unit/duplicates/detector.test.ts`; `progress/D10.md` |
| 9 | done | Build-report builder | Character summary, multiclass/pact slots, source sections, spellbook, access routes, warnings, and deterministic ordering match feature fixtures. | `tests/integration/reports/build-report.test.ts`; `progress/R40.md` |
| 10 | done | Printable-list builder | Grouping, route annotations, stats, free-cast wording, descriptions, rituals, deterministic ordering, and completeness validation match PHP. | `tests/browser/reports-and-print.spec.ts`; `progress/P50.md` |
| 11 | done | Command validation and integrity | Typed payload union rejects unknown/ill-typed fields and signs/verifies restore payloads with Web Crypto-compatible deterministic integrity behavior. | `tests/unit/commands/payload-validator.test.ts`; `tests/unit/commands/integrity.test.ts`; `progress/V10.md` |
| 12 | done | Commands 1–5 | Implement `update_ability` and all four `set_slot` modes (`select`, `clear`, `keep_override`, `restore`) with `apply()`/`inverse()` and persisted audit effects. | `tests/integration/commands/ability-and-slot.test.ts`; `progress/C41.md` |
| 13 | done | Commands 6–9 | Implement `update_character_rules`, `update_source_config`, `add_source`, and `remove_source` with `apply()`/`inverse()`, regeneration, nested sources, and rollback. | `tests/integration/commands/rules-and-sources.test.ts`; `progress/C42.md` |
| 14 | done | Commands 10–13 | Implement both `acknowledge_warning` modes, `update_class`, and `restore_snapshot` with `apply()`/`inverse()` and integrity checks. | `tests/integration/commands/warnings-class-and-snapshot.test.ts`; `progress/C43.md` |
| 15 | done | Revision-guarded command executor | Atomic expected-revision checks, operation UUID idempotency, revision increments, inverse-command persistence, audit grouping, and transaction rollback match PHP. | `tests/integration/commands/executor.test.ts`; `tests/integration/commands/idempotency.test.ts`; `progress/X50.md` |
| 16 | done | Typed Worker command RPC | Replace spike RPC with typed request/response/error envelopes, command dispatch, initialization, reset, and lifecycle; all storage-coupled engine calls remain synchronous in the Worker and every connection enables foreign keys. | `tests/browser/command-rpc.spec.ts`; `tests/unit/db/database-worker-boot.test.ts`; `progress/B00.md` |
| 17 | done | Worker query RPC | Character/catalog CRUD, workspace, eligible spells, save points, reports, printable data, and operation/history queries expose typed read models without leaking SQLite objects. | `tests/integration/queries/rpc.test.ts`; `progress/Q60.md` |
| 18 | done | Catalog JSON import | Document the user JSON schema; validate/import transactionally into OPFS SQLite, upsert stable keys, preserve user content, tombstone absent imports, and report actionable record errors. | `tests/integration/catalog/import.test.ts`; `tests/browser/catalog-import.spec.ts`; `progress/C20.md` |
| 19 | done | Database and character backup | Export/import the whole SQLite database plus portable per-character JSON (sources, slots, spellbook, preferences, overrides, acknowledgements, save points); validate versions and restore atomically. | `tests/integration/backup/round-trip.test.ts`; `tests/browser/backup.spec.ts`; `progress/B20.md` |
| 20 | done | Application shell and character list | Lightweight TypeScript DOM/CSS app supports create/open/delete, backup/import entry points, durable-storage status, routing, loading, empty, and error states. | `tests/browser/character-list.spec.ts`; `progress/U70.md` |
| 21 | done | Spreadsheet-grid planner | Faithfully port the Workspace grid, class/ability/rules/source editors, filters, eligible spell picker, invalid/orphan/override flows, undo/save points, warnings, and responsive keyboard-accessible interactions. | `tests/browser/planner.spec.ts`; `progress/U71.md` |
| 22 | done | Reports and print UI | Build report and printable spell-list screens match the current Vue presentation and print behavior, including incomplete-data warnings. | `tests/browser/reports-and-print.spec.ts`; `progress/U72.md` (records the later D149 retirement) |
| 23 | done | PHP Unit parity suite | Re-base all 57 evaluated Unit cases on TypeScript value objects and synchronous engine/SQLite state; maintain a case mapping and sensitivity evidence. | `tests/parity/php-unit-parity.test.ts`; `progress/T80.md` |
| 24 | done | PHP feature-to-e2e parity suite | Re-base the selected 28 end-to-end workflows on command/Worker RPC and persisted OPFS state, covering all user-visible mutation, report, import, backup, reload, and concurrency paths. | `tests/browser/php-feature-parity-commands.spec.ts`; `progress/T81.md` |
| 25 | done | Full parity and durability audit | Run the complete Unit + 28-e2e suite, production build, fresh-profile import/use/export/reload journey, migration/schema diff, oracle coverage map, accessibility smoke, and final sensitivity audit; resolve all material gaps. | `PARITY-AUDIT.md`; `progress/S90.md` |

## Global verification contract

- `npm test` runs after every increment.
- `npm run test:browser` also runs for Worker, UI, OPFS, import/export, or other
  persistence-touching increments.
- Tests assert stored rows whenever behavior has a persisted representation.
- Each increment records exact green → intentional failure → restored green
  evidence in `BUILD-PROGRESS.md`.
- Medium/high complexity increments receive a separate fresh
  `codex exec --sandbox read-only` review, for at most three rounds.
