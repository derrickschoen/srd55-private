# D99 archive and duplicate — technical design

**Status:** design only. This document proposes implementation; it changes no
schema, source, tests, migration registry, or wire registry.

## 1. Governing scope

D99 replaces destructive list deletion with a hidden, restorable archive.
Permanent purge exists only inside the archive view. The main character list
gains Duplicate, defined as the D62 export-import clone run locally and named
visibly. D71 keeps double-submit prevention in the UI: destructive or cloning
buttons disable synchronously while their request is in flight.

## 2. Assumptions proved from the current code

| Assumption | Evidence and consequence |
|---|---|
| Delete is currently a real aggregate purge. | The list controller confirms “This cannot be undone” and calls `deleteCharacter()` (`src/ui/screens/character-list/character-list.ts:58-70`). The card labels the action Delete and disables the button during the request (`:352-387`). `CharacterCrud.delete()` executes `DELETE FROM characters WHERE id = ?` (`src/queries/character-crud.ts:129-136`). Because all owned rows cascade from the root (`db/schema/character.ts:58-64`), this is permanent today. |
| The worker exposes the purge directly as ordinary list CRUD. | Client method `deleteCharacter()` calls `queries.characters.delete` (`src/queries/client.ts:68-75,162-166`); the handler maps it straight to `CharacterCrud.delete()` (`src/worker/handlers/queries.ts:193-216`). D99 must remove/replace this public active-list purge path, not merely relabel its button. |
| The current list does not filter lifecycle state. | `CharacterListBuilder.build()` runs `SELECT id, name FROM characters ORDER BY name, id` at `src/queries/character-list-builder.ts:19-29`, then builds report badges. There is no archive predicate. |
| No existing root column can truthfully serve as archive state. | The complete root declaration at `db/schema/character.ts:67-103` has ids, facts, rules preferences, revision, notes, and generic timestamps only. `updated_at` also changes on normal edits; `notes` is user prose; `revision` is optimistic concurrency. None means “archived”. |
| The exact D62 full-fidelity clone engine already exists. | `exportCharacterBackup()` reads the complete root and all backup-scoped rows (`src/backup/character-backup.ts:1522-1556`) and self-validates the document (`:1618-1632`). `importCharacterBackup()` validates first, inserts a fresh root id (`:2748-2769`), remaps every owned row, and returns the new id (`:2770-2808`). It also generates fresh source UUIDs while remapping (`:1966-1989`). These are the exact functions Duplicate must reuse, through the existing backup RPC handlers at `src/worker/handlers/backup.ts:75-86`. |
| The browser already has export/import controller plumbing. | `ImportBackupController.exportCharacter()` and `.importCharacter()` call the existing backup client at `src/ui/screens/character-list/import-backup-controls.ts:135-157`; `BackupClient` exposes both operations at `src/backup/client.ts:8-39`. Duplicate can compose those services locally without inventing a second clone implementation. |
| Character import really is clone semantics, not identity preservation. | Import uses a fresh root autoincrement id (`src/backup/character-backup.ts:2764-2769`) and fresh source UUIDs (`:1971-1978`), matching D62. The source document's UUID/id values are provenance and remap inputs only. |
| Main-list actions already render names without HTML interpretation. | Cards are built with the DOM `element(..., { text: character.name })` helper at `src/ui/screens/character-list/character-list.ts:418-440`; confirmation strings never enter HTML. Archive/duplicate dialogs should additionally use `freeTextSpan()` when displaying a name (`src/ui/free-text.ts:20-27`). |
| Exact routes are screen modules discovered automatically. | `src/ui/app.ts:10-35` discovers every `screens/**/screen.ts`, and renders the first exact matcher at `:66-105`. The current root screen matches only `/` (`src/ui/screens/character-list/screen.ts:5-8`), so `/archive` can be a separate exact screen without changing a central route table. |
| The current modal precedent supplies focus containment. | The attunement dialog is a native `<dialog>` with `aria-modal`, labelled/described ids, focus loop, Escape handling, initial focus, and cleanup (`src/ui/screens/planner/items.ts:90-129,170-223`). Purge confirmation should reuse/extract that behavior. |
| Database-image backup preserves every local lifecycle bit. | `exportDatabaseBackup()` copies the SQLite bytes and import replaces from those bytes (`src/backup/database-backup.ts:78-95`). An `archived_at` column therefore survives database backup automatically after schema migration. |
| Share import always creates a new root from the explicit share DTO. | `ShareCharacter` has an exact optional-key set (`src/sharing/schema.ts:153-188,1934-1952`), and import explicitly names root insert columns (`src/sharing/character-share.ts:1572-1601`). Archive state can be deliberately omitted from share without changing the compact tuple or being accidentally copied. |
| Adding any root column forces an explicit portability choice. | `tests/integration/sharing/column-portability.test.ts:50-79` derives its column map from `ColumnNamesOf<'characters'>`; the current root classifications are at `:206-234`. `archived_at` must be classified `omitted` for share, and the test will prove it does not arrive. |

## 3. Storage decision

### 3.1 Choose nullable `archived_at`, reject a status enum

Add one nullable `DATETIME` column to `characters`:

```text
archived_at NULL     => active character
archived_at timestamp => archived at that instant
no row                => permanently purged
```

Recommend `archived_at` over `status` because D99 currently has exactly one
reversible transition and one terminal absence. A status enum would duplicate
the null/existence distinction, require a second timestamp to answer when the
archive happened, and create meaningless values such as `purged` on a row that
must no longer exist. A timestamp is also a useful archive-view sort key.

Use `datetime()` and the project's normal timestamp writer. Do not impose a
single ISO-format CHECK: the row-contract code records that existing timestamp
writers legitimately use both SQLite and ISO spellings (`src/domain/contracts/rows.ts:127-133`).
A nullable type CHECK (`archived_at IS NULL OR typeof(archived_at) = 'text'`) is
safe. Add an index supporting the two lists, preferably
`(archived_at, name, id)`; prove the actual SQLite query plans before retaining
it, because the expected character count is small and an unmeasured index may be
noise.

The migration is named **“next free migration number at dispatch time”** and is
appended to `src/db/migrations.ts` with immutable SQL/result hashes. If D104 lands
first, D99 rebases and takes the then-next free number; it never edits or folds
into D104's shipped migration.

### 3.2 State transitions and API boundaries

Replace `CharacterCrud.delete()` and `queries.characters.delete` with three
explicit operations:

| Operation | SQL predicate | Result |
|---|---|---|
| `archive(characterId)` | `UPDATE ... SET archived_at=?, updated_at=? WHERE id=? AND archived_at IS NULL` | active → archived; owned rows untouched |
| `restore(characterId)` | `UPDATE ... SET archived_at=NULL, updated_at=? WHERE id=? AND archived_at IS NOT NULL` | archived → active |
| `purgeArchived(characterId)` | `DELETE FROM characters WHERE id=? AND archived_at IS NOT NULL` | archived row and cascades removed permanently |

Each method returns `{ id, changed }`; zero changes becomes a named not-found or
wrong-state result, never a success inferred from current UI state. Purge's SQL
predicate is the server-side enforcement of “only inside archive”: even a forged
RPC cannot purge an active character. No general-purpose delete handler remains.

The main list query becomes:

```sql
SELECT id, name FROM characters
WHERE archived_at IS NULL
ORDER BY name, id
```

The archive query uses `WHERE archived_at IS NOT NULL ORDER BY archived_at DESC,
name, id` and returns an `ArchivedCharacterSummary` with `id`, `name`, and
`archived_at` (plus class summary only if the UI shows it). Normal direct
character routes must treat an archived id as unavailable and offer a link to
`/archive`. Enforce archived read-only state below the UI: every character
command-session start and root-mutating query/RPC resolves an active root with
`archived_at IS NULL` inside the worker/database boundary and rejects an archived
id before mutation. Restore, Duplicate, and Purge are the only operations whose
worker handlers intentionally accept archived roots, and only the archive view
exposes them.

`archived_at` is library lifecycle, not undoable build state. Do not add it to
`CHARACTER_STATE_COLUMNS`; restoring a build save point must not resurrect or
archive the root. Archive/restore live in list CRUD, outside the character command
history and revision counter, just as current root deletion does.

## 4. Backup, share, and duplicate semantics

### 4.1 Which exports carry archive state

The channels intentionally differ:

| Channel | Archive state | Reason |
|---|---|---|
| Database-image backup | **Preserved** | It is a backup of the local library, so hiding/restorability is user state and the raw SQLite bytes already carry it. |
| Portable character backup | **Preserved** | D99 says archive is restorable, and a portable full-character backup is the lossless character channel. Export the root `archived_at`; importing an archived backup creates an archived clone and the UI links to the archive view. |
| Share link | **Excluded; import is active** | D62 says import creates a new clone, while D99's archive is local list lifecycle. A recipient did not archive the new clone. Classify `archived_at` as `omitted` in the exhaustive portability map and do not mint a share-wire version for D99. |
| Duplicate | **Forced active** | D99 requires a visibly named duplicate in the main list. The local clone document clears `archived_at` before import even when duplicating from the archive view. |

This is not an unresolved owner question: D99 makes archive a local reversible
list operation, and D62 makes imports new characters. Preserving archive in true
backups while excluding it from shares and clearing it for Duplicate satisfies
both texts without inventing recipient intent.

Because the portable backup root uses `SELECT *` and a closed exact-key list,
D99 mints the **next free character-backup document version at implementation
time** unless D104's already-merged next version has explicitly included
`archived_at`. Freeze older root key sets; historical backups map absent
`archived_at` to `NULL` (active), because they could not record an archive. Do not
reserve a numeric version in this document or make two parallel lanes mint the
same successor.

Add `archived_at` to the current portable-backup root key/row contract as a
lifecycle field independently of `CHARACTER_STATE_COLUMNS`. The latter remains
the undo/save-point field set; sharing one generated list here would
accidentally make archive state undoable or silently omit it from backup.

D99 causes **no compact share-wire mint**: `ShareCharacter`, its tuple, and its
accepted values do not gain `archived_at`. The compile-exhaustive portability
entry documents and tests the omission.

### 4.2 Duplicate is the D62 engine, not copied SQL

The main list and archive view call one `duplicateCharacter()` UI/controller
operation:

1. Call existing `BackupClient.exportCharacter(source.id)`, backed by exact
   `exportCharacterBackup()`.
2. Create a new document object by changing only root `name` and `archived_at`.
   Do not edit tables, reference maps, spell definitions, ids, or UUIDs.
3. Call existing `BackupClient.importCharacter(document)`, backed by exact
   `importCharacterBackup()`.
4. Reload the active list and announce `Duplicated <source> as <copy> (#id)`.

No new clone SQL, table inventory, remapper, or transaction walker is permitted.
An integration spy must prove the controller calls the existing export then the
existing import, and a database test must prove the imported aggregate has fresh
root/owned ids and source UUIDs while retaining the same character content.

### 4.3 Visible naming

The first candidate is `<original> (copy)`, then `<original> (copy 2)`, `(copy
3)`, and so on, comparing against both active and archived names. Preserve the
original spelling. For every candidate, compute that candidate's complete
suffix, trim only enough trailing original-name code points to keep that suffix
inside the existing 120-character name limit, then compare the **final trimmed
candidate** against both active and archived names. A collision advances the
counter and repeats suffix construction, trimming, and comparison; do not assume
that pre-truncation uniqueness survives truncation. The chosen name is written
into the exported document before import, so the clone is never briefly stored
under the source name. The resulting active card and live-region message make
the rename visible.

## 5. UI design

### 5.1 Main character list

On each active card:

- replace `Delete` with `Archive`;
- add `Duplicate` beside Share;
- add an `Archived characters` link near the list heading/status.

Archive confirmation is reversible and must say so: “Archive <name>? It will be
hidden from this list and can be restored from Archived characters.” Display the
name through a text node/free-text span. Disable Archive and Duplicate
synchronously on click and keep them disabled until success/failure settles, per
D71. A second click must not issue a second RPC/import.

### 5.2 Archive view

Create an exact `/archive` screen under
`src/ui/screens/character-archive/screen.ts`. It has:

- a back link to `/`;
- a clear “Archived characters” heading and empty state;
- archive date, unverified-marked character name, and actions Restore,
  Duplicate, Permanently purge;
- a status/error live region and pending-button disable behavior matching the
  main list.

Restore immediately returns the row to the active list and removes it from the
archive view. Duplicate creates an active named copy but leaves the archived
source untouched. The success message links to/open the new active character.

### 5.3 Permanent purge confirmation

Purge exists only in the archive screen's controller and rendered card. It opens
a native modal dialog following the current focus-trap/restore precedent. The
dialog:

- visibly shows the unverified character name;
- states that the character and all of its data will be permanently removed and
  cannot be restored;
- requires the user to type the fixed token `PURGE` exactly;
- keeps the destructive submit disabled until the token matches;
- disables submit synchronously once invoked and closes only after success;
- returns focus to the invoking card/control on cancel/error.

The fixed token avoids making a hostile/very long character name part of the
confirmation parser. The worker still checks `archived_at IS NOT NULL`; route
placement and a dialog are not the security/integrity boundary.

## 6. File-change map

| Area | Expected files |
|---|---|
| Schema/migration | `db/schema/character.ts`, generated schema SQL, next-free `drizzle/*.sql`, `src/db/migrations.ts`, generated column facts |
| Domain/query/RPC | `CharacterRow`, archive summary type, `character-crud.ts`, list/archive builders, query client, worker handler validation |
| Backup/share classification | character backup version/root migrations, backup controller helper, share column portability test; no wire module |
| UI | main character-list controller/cards/styles; new `character-archive` screen/controller/styles; shared accessible confirmation dialog if extracted |
| Tests | schema/migration, CRUD/list/RPC, backup/share portability, controller/unit, Chromium list/archive/duplicate journeys |

## 7. Test strategy and named negative controls

| Load-bearing assertion | Positive proof | Named negative-control candidate |
|---|---|---|
| Archive never deletes owned rows. | Create a character with representative owned rows, archive, restore, and compare all ids/values. | **D99-ARCHIVE-NOT-DELETE** — replace the archive UPDATE with current DELETE; `archive and restore preserve the complete aggregate` must fail. |
| Main list hides archived rows and archive view shows only them. | Query integration with active and archived fixtures checks disjoint/exhaustive sets and ordering. | **D99-LIST-PARTITION** — remove either `IS NULL` predicate; `active and archive lists partition characters` must fail. |
| Direct active routes and forged mutation RPCs cannot edit archived rows. | RPC/browser test archives an open character, reloads its planner/sheet URL, then invokes a representative command handler directly and proves both read surface and mutation reject it. | **D99-ARCHIVED-ROUTE-GUARD** — remove the worker/database active-root predicate and mutate the archived root; `archived character is unavailable to active routes and commands` must fail. |
| Restore clears only lifecycle state. | Compare root/owned content before archive and after restore; only archive/update timestamps may differ. | **D99-RESTORE-EXACT** — reset revision/name during restore; `restore changes no character facts` must fail. |
| Purge cannot target active characters, even through forged RPC. | Call purge handler directly for an active id and assert zero deletion; then purge archived id and assert root/cascades gone. | **D99-PURGE-ARCHIVE-ONLY** — remove `archived_at IS NOT NULL` from SQL; `purge refuses active character` must fail. |
| Purge action cannot exist outside archive UI. | DOM/controller inventory asserts main-list action names and no purge client method is exposed there. | **D99-NO-MAIN-PURGE** — add/wire purge on an active card; `main list exposes archive but never purge` must fail. |
| D71 double-submit discipline prevents duplicate writes. | Dispatch two rapid clicks; service spy resolves later and records exactly one archive/duplicate/purge call. | **D99-DOUBLE-SUBMIT** — move `button.disabled = true` after the await; `pending character action submits once` must fail. |
| Duplicate uses the D62 export/import path and is visibly renamed. | Controller spy proves export→document transform→import; DB test proves fresh ids/UUIDs, same content, active state, per-candidate truncation, collision retry across active/archived names, and copy suffix. | **D99-DUPLICATE-D62** — replace import with a root-only INSERT, retain source name/archive timestamp, or compare names before suffix-aware truncation; `duplicate is a full active visibly named clone` must fail. |
| Portable/database backups preserve archive, old backups become active. | Raw DB round trip and current portable archived-character round trip remain archived; frozen historical portable backup imports `archived_at = NULL`. | **D99-BACKUP-LIFECYCLE** — omit `archived_at` from current backup or default a historical file to now; `backup archive state is preserved without inventing old state` must fail. |
| Share does not transmit archive state. | Share an archived root through the low-level exporter, import, and assert the recipient clone is active; portability probe sees no sender timestamp. | **D99-SHARE-LOCAL-LIFECYCLE** — add `archived_at` to `ShareCharacter`/wire or importer; `share import never inherits sender archive state` must fail. |
| Purge confirmation is deliberate and accessible. | Browser test covers exact token, Escape/cancel, focus restoration, and disabled pending state. | **D99-PURGE-CONFIRMATION** — accept any nonempty token or remove focus restoration; `permanent purge requires PURGE and restores focus` must fail. |

Run `tsconfig.app.json` compilation, focused Vitest schema/query/backup/share/UI
suites, then Chromium character-list/archive/backup journeys. The final duplicate
browser test must reload the app before asserting the copy, so persistence and
active-list filtering are both proved.

## 8. Implementation units

| Unit | Size | Mint status | Contents and exit condition |
|---|---:|---|---|
| **AR-A — archive persistence and portable contract** | M | **Mint-carrying; serialize** | `archived_at`, next-free migration/registry hashes, root row/contracts, archive backup semantics and next-free backup version if not already supplied by D104, historical-null migration, share portability omission. Exit: migration, backup, and share-local-lifecycle tests pass. No share-wire mint. |
| **AR-B — lifecycle query/RPC boundary** | M | **Mint-free after AR-A** | Archive/restore/purge methods, active/archive list builders, active-route guard, client/worker handlers, removal of generic delete. Exit: list partition and forged-active-purge tests pass. |
| **AR-C — D62 duplicate orchestration** | M | **Mint-free after AR-A** | Collision-safe copy naming, backup export/document transform/import composition, controller/client status result, aggregate-fidelity tests. Exit: the D62 negative control proves no copied clone SQL exists. |
| **AR-D — list and archive UI** | L | **Mint-free after AR-B; AR-C for Duplicate** | Main Archive/Duplicate actions, exact `/archive` screen, Restore/Duplicate/Purge cards, accessible typed confirmation, focus and disabled-submit behavior, styles and unit tests. |
| **AR-E — browser closeout** | S | **Mint-free** | Reload-stable archive/restore/duplicate/purge journeys, backup/share lifecycle matrix, scope inventory. Exit: every named negative control is demonstrated. |

AR-B and AR-C may proceed in parallel after AR-A; AR-D integrates both. If D104
owns the active mint lane, AR-A waits and then rebases. It may reuse an already
planned current backup root version only when that version explicitly contains
both D104 flavor and D99 archive fields; otherwise it takes the then-next free
backup version.

## 9. Open questions

None blocks implementation. The export distinction is resolved above: backups
preserve local archive state; share and Duplicate create active recipient/local
clones.
