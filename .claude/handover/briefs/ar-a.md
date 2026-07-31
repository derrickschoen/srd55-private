# DISPATCH AR-A — D99 archive persistence and portable contract (M, MINT, wt/attunement, PLAYWRIGHT_PORT=44481)

THE BINDING PLAN is docs/design/2026-07-31-d99-archive-and-duplicate.md
sections 3 (storage decision: nullable archived_at, three lifecycle
operations, active-root guard) and 4 (backup/share/duplicate semantics),
unit AR-A in section 8. Implement exactly AR-A. AR-B (query/RPC boundary is
partially yours — read the unit row carefully: AR-A owns the column,
migration, backup semantics, share-portability omission; AR-B owns the
lifecycle methods/handlers/list builders), AR-C/D/E are NOT yours.

AMENDMENTS (these WIN over the doc):
- D138 context (does not change AR-A's schema, but constrains it): homebrew
  cascade-delete will later archive a creation plus its attached characters
  as one restorable set. Your archived_at column and (if the doc's design
  says so) any archive metadata must not preclude grouping archived rows by
  a common cause later — do NOT add speculative columns for it; just avoid
  contracts that would forbid a future nullable group column.
- No share-wire mint (doc section 4.1: share EXCLUDES archive state; the
  column-portability map classifies archived_at as omitted and the test
  proves a shared archived character imports ACTIVE).
- Portable character backup DOES carry archived_at (doc 4.1 table): mint
  the next free backup document version ONLY if FF-A has not already minted
  one that could carry it — check the registry tail; if FF-A's version is
  unmerged/absent, take the next free number yourself; never fold into a
  frozen version.

MINTS YOU OWN: next free DB migration (nullable DATETIME archived_at with
type CHECK `archived_at IS NULL OR typeof(archived_at) = 'text'`, index
per doc 3.1 — prove the query plan or drop the index, doc says measure);
backup version per above. archived_at is NOT in CHARACTER_STATE_COLUMNS
(doc 3.2: lifecycle, not undoable build state — a save-point restore must
not resurrect or archive a root; test that).

Negative controls from doc section 7 rows D99-BACKUP-LIFECYCLE and
D99-SHARE-LOCAL-LIFECYCLE are yours (the others belong to AR-B..E). EXIT
(doc unit AR-A): migration, backup semantics, and share-local-lifecycle
tests pass; historical backups import archived_at = NULL (active).
