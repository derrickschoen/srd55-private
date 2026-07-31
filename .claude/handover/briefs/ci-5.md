# DISPATCH CI-5 — portable export v3: reference closure + library export (L, MINT, wt/attunement, PLAYWRIGHT_PORT=44487)

THE BINDING PLAN is docs/design/2026-07-30-homebrew-authoring-forms.md,
unit CI-5 in section 11 (the v3 backup/export format freeze), as amended:

AMENDMENTS (these WIN over the doc — the doc's reading of D81's "all" is
SUPERSEDED):
- D139: a single-character export carries exactly the character's homebrew
  REFERENCE CLOSURE (its species/background/subclass/effects and everything
  those reference, computed via the closure vocabulary HA-1 pinned) — NOT
  the whole local library. Unreferenced library content stays home.
- D139: a SEPARATE library-export operation exists at the service level
  (UI later): export the whole library or an explicitly selected subset of
  creations, as its own document kind (not a character document).
- D138: archived cascade sets (creation + attached characters archived
  together) must survive a database-image backup untouched; the PORTABLE
  character export of an archived character carries archived_at per D99's
  table (AR-A precedent) and its closure like any other.
- D81's acceptance stands: two users exchanging exports converge — opening
  each other's exports duplicates nothing (CI-2a resolver handles identity
  matching on import).

MINTS YOU OWN: the v3 portable format version (freeze v2 first), plus the
library-export document kind. Absent-not-invented for older documents:
importing a v1/v2 export never invents closure entries — it imports what
the document carries and resolves identities.

CONTROLS the supervisor will demand: (1) closure exactness — a library with
N creations, a character referencing 2: the export carries exactly those 2
plus transitive references, proven by enumerating the document (a count is
not an enumeration); (2) convergence — export from DB-A, import into DB-B
twice: second import duplicates nothing; (3) selected-subset library export
round-trips; (4) v2 document imports absent-not-invented.
EXIT: the unit row's exit criteria + the four controls named with exact
test names.
