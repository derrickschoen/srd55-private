# D104 flavor fields — technical design

**Status:** design only. This document proposes implementation; it changes no
schema, source, tests, migration registry, or wire registry.

## 1. Governing scope

D104 permits exactly four optional character-root text fields: `alignment`,
`appearance`, `backstory`, and `notes`. They are stored, exported, and printed
when present. It excludes portraits and XP tracking; D88 separately keeps play
state off the stored character. D4 governs every rendering: hostile text remains
visible and is marked as unverified, but it never enters structured facts.

This design also preserves D37: character `notes` remains opt-in for a share
link. D104 does not repeal that privacy decision. The three new flavor fields
travel in a share when present; notes travels only when the existing `notes`
option is true.

## 2. Assumptions proved from the current code

| Assumption | Evidence and consequence |
|---|---|
| The character aggregate root is `characters`. | `db/schema/character.ts:58-64` calls it the aggregate root and states that owned tables cascade from it. Root columns are declared at `db/schema/character.ts:67-103`. Flavor belongs here, not in a one-row satellite table. |
| `notes` already exists; D104 requires three new columns, not four. | `db/schema/character.ts:100` declares nullable `notes: sqlText()('notes')`. `src/domain/models.ts:99-118` and `src/queries/character-crud.ts:57-84` already carry it as `string | null`. Add `alignment`, `appearance`, and `backstory`; retain and regularize `notes`. |
| Nullable prose uses `sqlText()` with no `.notNull()`. | `db/schema/columns.ts:38-42` defines the `TEXT` custom type. Character/source notes use it at `db/schema/character.ts:100,200,226`. The custom type is build-time typing, not runtime validation (`db/schema/columns.ts:18-24`). |
| There is no existing nullable-text length-CHECK helper. | Existing nullable CHECK helpers are integer/enum-oriented (`db/schema/columns.ts:166-167,345`); nonempty SQL text uses `length(...)` directly (`db/schema/catalog-content.ts:54-67,98-100`). The new fields therefore need one shared nullable-text helper rather than three handwritten predicates. Existing `characters.notes` has no length CHECK. |
| Text limits are owned in one domain module and reused by every boundary. | `src/authoring/limits.ts:3-22` says a form, RPC validator, projector, and exporter must read the same limit. `src/domain/character-limits.ts:1-34` already owns the 2,000-character `notes` limit and explains why an inline share-only cap is invalid. Extend this module rather than placing numbers in UI or wire code. |
| Portable character backup serializes the whole root row and validates a closed root shape. | `exportCharacterBackup()` reads `SELECT * FROM characters` at `src/backup/character-backup.ts:1522-1533`, puts that row in `document.character` at `:1618-1632`, and validates its own output. Import validates exact root keys at `:1014-1077`, applies the generated row contract at `:1142-1146`, and inserts a fresh root in `importCharacterBackup()` at `:2748-2769`. A root-column addition therefore forces an explicit backup schema evolution. |
| Old documents distinguish absence from an asserted empty value. | Snapshot parsing requires the columns owned by that historical version (`src/backup/character-backup.ts:414-434`). Its sparse-table commentary states that absent is not empty (`:136-155`). D104 migrations must map fields an old format could not carry to `NULL`, never `''` or invented prose. |
| Share already carries optional root text and has an opt-in precedent. | `ShareCharacter.notes?: string` is defined at `src/sharing/schema.ts:153-188`; validation uses the shared character limit at `:2019-2027`. Export sends a nonempty note only when `options.notes === true` (`src/sharing/character-share.ts:986-999`) and import maps absence to SQL `NULL` (`:1572-1601`). `src/sharing/client.ts:23-47` and `src/worker/handlers/sharing.ts:32-72` carry the flag across RPC. |
| The compact share wire is an append-only frozen registry, currently through v15. | `src/sharing/wire-schemas/index.ts:27-55` forbids editing an existing tuple and registers versions 1–15. v13 changes an accepted value without changing positions (`v13.ts:12-23`); v14 appends/replaces tuple structure (`v14.ts:12-71`); v15 appends a root section (`v15.ts:12-65`). Adjacent migrations preserve absence with null padding at `index.ts:837-920`; every historical step is composed through `MIGRATIONS` at `:923-946`. Historical module bytes are SHA-256 checked at `tests/unit/sharing/wire-schema-registry.test.ts:535-540,845-856`, as required by F24. |
| Character-root snapshot columns are versioned independently of table membership. | `src/character/character-state.ts:320-370` freezes historical root column sets and declares live `CHARACTER_STATE_COLUMNS`; the per-version registry is at `:372-407`. Adding undoable flavor fields requires the next free snapshot schema version and a frozen predecessor, even though no owned table is added. |
| The sheet is read-only; the planner is the established editing surface. | `src/ui/screens/sheet/screen.ts:7-15` explicitly says every displayed input is edited in the planner and rejects a second sheet writer. The planner already writes through the command session (`src/ui/screens/planner/screen.ts:533-542`). Flavor editing belongs in a planner “Character details” panel. |
| Optional prose already becomes an optional printable sheet section. | `CharacterSheet.printed_features` is prose deliberately excluded from facts (`src/queries/character-sheet-builder.ts:327-369`). `sheetSections()` emits “Features and traits” only when rows exist and marks every stored string as free text (`src/ui/screens/sheet/sheet-view.ts:537-569`). The same sheet DOM is reflowed for print by the one-column print stylesheet (`src/ui/screens/sheet/styles.css:100-149`), implementing D89. |
| Hostile strings have a concrete safe-rendering primitive. | `freeTextSpan()` creates a span, adds `data-free-text="unverified-origin"`, and assigns only `textContent` (`src/ui/free-text.ts:1-27`). The sheet renderer routes marked cells through it (`src/ui/screens/sheet/sheet-view.ts:940-947`). The sheet explicitly excludes all free text from its JSON facts (`:31-42,723-731`) and serializes only `sheetFacts()` at `:1026-1039`. |

## 3. Technical approach

Add three nullable root columns beside the existing `notes`, expose all four as
one atomic `CharacterFlavor` value, and use one `update_character_flavor`
command. The command, backup validator, share validator, and form all consume
`CHARACTER_TEXT_LIMITS`. The character sheet projects flavor only into a visible
prose section; `sheetFacts()` remains numeric/closed-vocabulary only.

```text
planner textareas
      │ update_character_flavor (one revision / one inverse)
      ▼
characters.alignment / appearance / backstory / notes
      ├── portable backup root ──► fresh cloned/restored root
      ├── next free share wire ──► fresh share-import root
      └── CharacterSheet.flavor ─► visible sheet section ─► print stylesheet
                                  (never sheetFacts JSON)
```

## 4. Storage and contracts

### 4.1 Root fields and limits

| Field | Schema | Limit (Unicode code points) | Empty form input | Rationale |
|---|---|---:|---|---|
| `alignment` | new nullable `TEXT` | 120 | `NULL` | Alignment is deliberately open prose, not an enum. A short-label bound matches names/open vocabularies without closing homebrew. |
| `appearance` | new nullable `TEXT` | 4,000 | `NULL` | Long-form prose; use the established authored-description ceiling. |
| `backstory` | new nullable `TEXT` | 20,000 | `NULL` | This is the one genuinely long narrative field. The cap bounds hostile documents while remaining well inside the existing character-document budgets. |
| `notes` | existing nullable `TEXT` | 2,000 for every new write/share | `NULL` | Retain `CHARACTER_TEXT_LIMITS.notes` and D37 opt-in sharing. Do not create a second notes column. |

Extend `CHARACTER_TEXT_LIMITS` in `src/domain/character-limits.ts`; UI
`maxlength`, command validation, and share validation must import those values.
The current backup validator applies these limits to the three new fields, but
`notes` remains type-only (`string | null`) there so a grandfathered note longer
than 2,000 characters can still be exported and restored. Count code points with
`[...value].length`, matching the existing name boundary
(`src/queries/character-crud.ts:87-94`) and SQLite `length()` for these strings.
A nonblank value is stored byte-for-byte; trimming is used only to decide whether
the field is absent. No normalization, parsing, or alignment vocabulary is
introduced.

### 4.2 CHECKs

Add a `nullOrTextLengthAtMost(column, maximum)` helper beside the existing CHECK
helpers. For each **new** column it emits the equivalent of:

```sql
field IS NULL OR (
  typeof(field) = 'text'
  AND length(field) BETWEEN 1 AND <shared maximum>
)
```

This rejects non-text SQLite values and forbids the duplicate absence state
`''`; the write command maps blank/whitespace-only input to `NULL` first.

Do **not** retroactively add a 2,000-character length CHECK to existing
`characters.notes`. The current column and portable-backup row contract permit a
longer string (`src/domain/character-limits.ts:26-30`; `src/domain/contracts/rows.ts:127-138`).
Tightening the column would make a previously accepted user's own data
unmigratable, which D25 forbids. New writes remain capped at 2,000; backup remains
lossless for a grandfathered longer note; opted-in share continues to refuse it
loudly instead of truncating it. A type-only `notes IS NULL OR
typeof(notes) = 'text'` CHECK may be added only if the generated migration proves
every accepted old row survives.

### 4.3 Migration and row model

The migration is named **“next free migration number at dispatch time”**. It is
append-only in `src/db/migrations.ts`, with SQL and result-schema SHA-256 values;
the current registry demonstrates that contract at `src/db/migrations.ts:30-52,283-315`.
If D99 lands first, rebase and take the then-next free number; never edit D99's
shipped migration or generate both branches against the same predecessor.

Update:

- the Drizzle declaration and generated `src/db/schema.sql`;
- `CharacterRow` and `decodeCharacter()` with `string | null` fields;
- generated column facts and the strict `characters` row contract;
- schema signature/CHECK tests and candidate-image audit fixtures;
- `CHARACTER_STATE_COLUMNS`, freezing the current version first and minting the
  next free snapshot schema version. Older snapshot versions do not acquire the
  columns retroactively; restore maps their absence to `NULL`.

The generated row contract must continue to reject every non-string/non-null
value. The new SQL CHECKs and boundary validators add length/nonempty semantics;
the generic row contract must not become narrower than the column.

## 5. Backup and share evolution

### 5.1 Portable character backup

Mint the **next free character-backup document version at implementation time**.
The current version is 2 (`src/backup/backup-version.ts:5-8`), but the design does
not reserve a number across parallel mint lanes.

The new version's `character` object requires all three new keys, each containing
`string | null`; `notes` remains required and type-only as it is today. The new
field validators enforce their shared length limits, while current-backup
validation deliberately does not impose the new-write 2,000-character limit on
`notes`. Freeze the v1/v2 root key sets before widening the live set.
Validation/import behavior is:

1. Current document: validate new fields against the SQL/type/length contracts.
2. Historical v1/v2 document: accept its historical exact key set; add
   `alignment: null`, `appearance: null`, and `backstory: null` in a dedicated
   migration step before applying today's row contract.
3. Never turn absence into `''`, “Unspecified”, a guessed alignment, or generated
   backstory. This is the absent-not-invented rule.
4. Keep generic `SELECT *` export and `Object.keys` insertion. A current export
   must validate against its own importer before being returned, as it does now.

Database-image backups need no format bump: they already carry exact SQLite
bytes (`src/backup/database-backup.ts:78-95`), and the database migration runner
upgrades the image.

### 5.2 Share document and compact wire

Mint the **next free share-wire version at implementation time**, not a number
chosen in this document. The implementation must:

- freeze the current v15 module; never add fields to it;
- create a new schema module by appending `alignment`, `appearance`, and
  `backstory` to the character tuple; the existing `notes` position does not
  move;
- add one adjacent current→next migration that validates the frozen current
  character arity, appends exactly three `null` values, and updates only the root
  version slot;
- register the module and adjacent migration, hand-author a frozen fragment, and
  SHA-256 pin every newly historical module, including v15, per F24;
- add the three optional members to `ShareCharacter`, exact-key validation,
  export projection, import SQL, preview, and the compile-exhaustive column
  portability map.

`alignment`, `appearance`, and `backstory` are `verbatim` portability entries:
present nonempty text travels, `NULL`/blank is absent, and import absence becomes
SQL `NULL`. `notes` remains the existing `opt_in` entry keyed to the `notes`
share option (`tests/integration/sharing/column-portability.test.ts:98-117,206-234`).
No new “flavor” boolean is needed. The share UI should state that the link
contains unverified user-written alignment/appearance/backstory when any are
present, while keeping the current separate notes opt-in control.

## 6. Authoring and presentation

### 6.1 Editing

Add a “Character details” panel to the planner, near the character heading and
before rules/equipment panels. It contains four labelled controls:

- `Alignment` — text input, not a select;
- `Appearance` — textarea;
- `Backstory` — textarea;
- `Notes` — textarea with “Included in share links only when you opt in.”

The panel says: “Free text only. These words are stored and printed, but never
used to calculate character facts.” Each control uses the shared max length and
shows remaining/maximum characters. One Save button submits the complete four-
field value. Disable it synchronously until the command settles; do not send four
independent writes.

`update_character_flavor` belongs in the existing command union, payload
validator, exhaustive factory, executor inverse switch, and operation history.
It validates all four values before opening the write transaction, updates all
four columns plus `updated_at` together, and creates one revision/history entry.
Its inverse restores the four previous root values from the before-snapshot.
There is no current UI or command writer for root `characters.notes`
(`src/domain/character-limits.ts:6-14`); the new command becomes its sole writer.
Any incidental root-update path found during implementation must be redirected
to this command or narrowed so it cannot write `notes`, preserving one atomic
history boundary.

### 6.2 Sheet and print

Extend `CharacterSheet` with one nested nullable-value object rather than four
unrelated top-level strings:

```ts
interface CharacterFlavor {
  readonly alignment: string | null;
  readonly appearance: string | null;
  readonly backstory: string | null;
  readonly notes: string | null;
}
```

`CharacterSheetBuilder` selects these root columns with nullable string codecs.
`sheetSections()` appends “Character details” only when at least one trimmed value
is present. It emits a row only when that row's own value is non-null and
nonblank after trimming; trimming controls presence but the displayed value is
the original byte-for-byte string. Each emitted row:

- uses a fixed application-owned label;
- includes the visible suffix “— unverified free text”;
- renders the value only through `freeTextSpan()` with `white-space: pre-wrap`;
- remains absent from `sheetFacts()` and from the JSON `<script>`.

Because D89 prints this same sheet route, no second print template or string
interpolator is allowed. The section naturally prints when present and is absent
when all four values are null/blank. Its unverified label and dotted marker remain
visible in print; it is not `.sheet-chrome`. No portrait node, image/blob column,
XP column, current-HP field, or structured alignment fact is added.

## 7. File-change map

| Area | Expected files |
|---|---|
| Schema/migration | `db/schema/character.ts`, `db/schema/columns.ts`, generated `src/db/schema.sql`, next-free `drizzle/*.sql`, `src/db/migrations.ts`, generated column facts |
| Domain/command | `src/domain/character-limits.ts`, `src/domain/models.ts`, `src/domain/command-contracts.ts`, new flavor command, payload validator/factory/executor |
| Snapshot/backup | `src/character/character-state.ts`, `src/backup/backup-version.ts`, `src/backup/character-backup.ts` |
| Share | `src/sharing/schema.ts`, `character-share.ts`, client/worker option plumbing only where needed, new next-free wire module, registry/migration |
| UI | new planner flavor panel, `planner/screen.ts`, `character-sheet-builder.ts`, `sheet-view.ts`, sheet/planner CSS |
| Tests | schema/contracts, command integration, backup/share registry and round trips, sheet unit/browser/print coverage |

## 8. Test strategy and named negative controls

Every assertion below includes a mutation candidate that must make the named
test fail; a green retained test generated from current output is not acceptable.

| Load-bearing assertion | Positive proof | Named negative-control candidate |
|---|---|---|
| New columns are nullable text, bounded, and empty has one representation. | Schema/CHECK integration inserts null and exact-limit strings; rejects non-text, empty, and limit+1. | **D104-TEXT-CHECK** — remove the `typeof` or upper-bound limb for `backstory`; `character flavor CHECKs reject non-text and limit+1` must fail. |
| One save edits all four fields atomically and undo restores all four. | Command test verifies one revision/history operation and exact inverse. | **D104-FLAVOR-ATOMIC** — update `alignment` before validation of an oversized backstory; `update_character_flavor is all-or-nothing` must fail with a partially changed row. |
| Historical snapshots/backups invent no flavor. | Frozen pre-D104 snapshot and v1/v2 backup restore all three new fields as `NULL`. | **D104-ABSENT-NOT-INVENTED** — replace one migration null with `''` or “Unspecified”; `historical flavor absence remains null` must fail. |
| Current backup round-trips every value losslessly. | Export/import/re-export compares all four fields, including newlines and hostile punctuation. | **D104-BACKUP-ROOT** — omit `appearance` from the current exact-key list or import insert; `current flavor backup round-trips root text` must fail. |
| The next wire appends fields without changing old positions. | Hand-authored current frozen fragment migrates through next; old members compare position-for-position and new members decode absent. | **D104-WIRE-NULLPAD** — append `''` or insert before notes; `current wire migrates flavor by trailing nulls only` must fail. |
| Notes remains opt-in while other flavor travels. | Two real share round trips with notes off/on; alignment/appearance/backstory equal in both, notes only in the opted-in recipient. | **D104-NOTES-OPT-IN** — export notes unconditionally or gate backstory on notes; `flavor portability separates notes privacy` must fail. |
| Hostile prose is text, never markup. | Browser/unit render backstory `</script><img src=x onerror=...>` and assert the literal is visible, marked, and creates no image/script/event. | **D104-BACKSTORY-DOM-SINK** — replace `textContent`/`freeTextSpan` with `innerHTML`; `hostile backstory remains visible inert text` must fail. |
| Flavor never enters structured facts. | Parse `#character-sheet-facts`; assert none of the four keys or hostile sentinel appears. | **D104-NO-FLAVOR-FACTS** — add `backstory` to `sheetFacts`; `sheet JSON excludes all flavor text` must fail. |
| Print is presence-sensitive and keeps the warning. | Print-media browser test covers one populated plus one blank/whitespace field in the same character, and a second all-null character; it asserts only the populated row and section print. | **D104-PRINT-PRESENCE** — remove the section or per-row presence guard, or add the section to `.sheet-chrome`; `print shows only present flavor with unverified label` must fail. |
| Scope stays text-only. | Schema/type inventory asserts the exact D104 set and no blob/image/XP storage. | **D104-TEXT-ONLY-SCOPE** — add `portrait`, `experience_points`, or a fifth flavor column; `D104 root flavor columns are exact` must fail. |

Run the compile gate against `tsconfig.app.json`, then focused Vitest suites and
the Chromium sheet/print/share/backup journeys. The final browser assertion must
reload the imported/edited character before printing so persistence, not in-
memory state, is proved.

## 9. Implementation units

| Unit | Size | Mint status | Contents and exit condition |
|---|---:|---|---|
| **FF-A — persistence and frozen contracts** | L | **Mint-carrying; serialize** | Next-free DB migration, central limits, row model/contracts, next-free snapshot version, next-free backup version, next-free share wire module/migration/frozen fixture/SHA-256 pins, lossless old-document migrations. Exit: schema, compile, backup, wire-registry, and round-trip tests pass. This is the only D104 unit allowed to mint. |
| **FF-B — atomic authoring** | M | **Mint-free after FF-A** | `update_character_flavor`, validation/inverse/history, planner panel, client/session wiring, UI disabled-submit behavior. Exit: one save is one revision and undo restores all four fields. |
| **FF-C — sheet and print projection** | M | **Mint-free after FF-A** | CharacterSheet flavor object, optional visible section, hostile-text marker, pre-wrap styling, structured-facts exclusion, print presence behavior. Exit: DOM-sink and print negative controls pass. |
| **FF-D — integration closeout** | S | **Mint-free** | Full focused backup/share/reload/browser matrix, scope inventory, documentation checks. Exit: all named negative controls are demonstrated and no portrait/XP state exists. |

FF-B and FF-C may proceed in parallel after FF-A's contracts merge. Under D105,
FF-A must not overlap another wire-mint lane; if D99's schema/backup mint lands
first, FF-A rebases and takes the then-next free identifiers.

## 10. Open questions

None blocks implementation. The only privacy exception is already decided:
notes remains D37 opt-in; the other three D104 fields are ordinary exported
character flavor.
