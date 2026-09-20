# SRD-55

A local-first SRD 5.2.1 character builder, spell planner, printable sheet, and
experimental shared tabletop.

## What this is

SRD-55 is a browser app for creating and levelling characters against the
SRD 5.2.1 rules. It guides a level 1 build, supports multiclassing and later
level-ups, calculates spell access and spell slots, shows warnings instead of
quietly guessing at missing rules, and produces a detailed character sheet.
Characters, imported content, and homebrew are stored locally in an SQLite
database in your browser; there is no application account or hosted character
server.

**This is pre-alpha software.** It is useful enough to try, but the interface,
data formats, and database schema can still change. Some paths are polished and
some are prototypes. A bug or update could make browser-local data unreadable,
and clearing site data will remove it. Export backups early and often. If you
want a stable, finished character manager or cannot tolerate rebuilding from a
backup, this is not ready for you.

## Requirements

- Git and about 1 GB of free disk space for the checkout, dependencies, and
  build output.
- Node.js **22.12 or newer**. Node's TypeScript-stripping tools used by this
  repository require Node 22.6 or newer, while the locked Vite version raises
  the practical minimum to Node 22.12. The commands in this README were checked
  with Node 24.13.0.
- npm (npm 11.6.2 was used for this README).
- A current Chromium-family desktop browser. Chromium is the tested path. The
  app warns on untested engines because its SQLite storage depends on browser
  OPFS support.

No database server, Cloudflare account, or environment file is required.

## Quick start

Clone the repository and enter it, then run the five setup and startup commands
from the repository root:

```bash
git clone https://github.com/derrickschoen/srd55-private.git
cd srd55-private
node --version
npm --version
npm ci
npm run build
npm run dev
```

Open the URL Vite prints, normally <http://localhost:5173>. Stop the server with
`Ctrl+C`; the first database-seeding load may take longer than later loads.

## Install and build

`npm ci` installs the exact dependency versions in `package-lock.json`; use it
instead of updating dependencies for a first run. `npm run build` type-checks
the project and prepares a production `dist/` bundle.

The production build step maintains a verified cache: it restores a
content-digested `dist/` only when the commit, lockfile, Node/platform,
environment, and worktree inputs match; otherwise it runs the validated
TypeScript/Vite build, checks that development-only material did not ship, and
caches the result.

## Run it in a browser

### Development server

The final Quick start command runs Vite with live reload. It normally listens
on port 5173 and prints the exact URL. This is the convenient mode while trying
or changing the app.

The following option makes Vite listen on all network interfaces:

```bash
npm run dev -- --host
```

This exposes the HTML server to the network, but it does **not** make the app
usable at a plain HTTP URL using a non-loopback LAN or WSL2 IP address. Browser
OPFS storage requires a secure context, so the local database will not initialize
at that origin. HTTP `localhost` and `127.0.0.1` URLs on any port are secure
contexts and are supported. Using the app from another device requires a trusted
HTTPS origin, which this README does not set up. To move the development server
off a busy default port:

```bash
npm run dev -- --port 5174
```

With WSL2, use the printed `localhost` URL through WSL2 localhost forwarding.
HTTP `localhost` and `127.0.0.1` URLs are secure contexts on any port. A plain
HTTP URL using a non-loopback WSL2 IP is not a working fallback for this app
because the browser refuses OPFS there.

### Production build server

To exercise the bundled app rather than Vite's development modules, stop the
development server and run:

```bash
npm run serve
```

This prepares or restores a verified production build before listening at
<http://127.0.0.1:4173>. It serves only on loopback; it is not a LAN or public
deployment server. A different loopback port can be selected with:

```bash
npm run serve -- --port 4200
```

The production path matters because Web Worker and SQLite WebAssembly assets
are resolved differently after bundling. For more detail, see
[local development](LOCAL-DEV.md) and [local serving](docs/serving.md).

## Using the app

### Build a first character

1. Open `/`. On **Characters**, choose **Create a character**. The secondary
   **Advanced: create a blank character** path skips the guided flow and is not
   the best first experience.
2. Choose a class, enter the character name, and create the character.
3. Follow the guided steps for ability scores, species, background, skills,
   equipment, class-specific choices, and spells where applicable. The screen
   advances according to what that character still needs rather than showing
   every possible step.
4. Return to **Characters** when the level 1 build is complete. An unfinished
   card shows **Resume build**; a completed one shows **Level Up**.

For a click-by-click example, use **New player? Start here** on the Characters
page or read the [player build and sharing guide](docs/guides/player-build-and-share.md).

### Work on classes, multiclassing, and spells

Choose **Open workspace** on a character card. The workspace autosaves and is
the detailed editing surface. Its panels let you edit base character details,
add classes or other sources, make spell choices, manage a Wizard spellbook and
spell loadouts where relevant, record equipment and effects, inspect derived
attack profiles, and review warnings and completeness gaps.

Adding another class in the workspace creates a multiclass character. The app
checks multiclass prerequisites unless you explicitly enable its displayed
house-rule override. Spell slots, Pact Magic, preparation, casting routes, and
duplicate spell access are recalculated after saves. Use the searchable spell
choice controls rather than assuming every imported spell is eligible.

For a completed character, **Level Up** starts a one-level-at-a-time review. It
previews the class level, hit-point choice, features, feats or ability-score
changes, proficiencies, and spell choices before committing them.

### Read and print the sheet

From the workspace choose **Character sheet**. The sheet shows sourced and
derived character facts, attacks, equipment, resources, features, spell data,
and explicit warnings for facts the app cannot establish.

Choose **Print character sheet** to open the browser print dialog. When the
sheet offers them, **Print options** can add the full written-text appendix and
the full spell-text appendix. The read-only build report is also reachable at
`/characters/<id>/report`; it focuses on class and spell math, provenance,
casting routes, and invalid selections.

### Share a character by link

On the Characters page, choose **Share link** on a character card. Review the
three opt-in checkboxes: warning acknowledgements, loadouts, and written text
are excluded unless selected. Choose **Create share link**, then **Copy link**
or the browser's share action.

Generated links retain the sender's origin. In particular, a localhost link
points to the recipient's own machine and port, not the sender's server. The
recipient should run a compatible version of SRD-55 on their own machine, open
the Characters page, find **Open a shared character**, paste the complete URL
into **Character share link**, and choose **Preview link**. After reviewing the
**Shared character preview**, choose **Add to my characters**. The fragment is a
copy, not a live connection to the original; nothing is imported merely by
previewing it. Referenced external content is embedded when it fits, and the app
warns when a link is too large or needs matching content.

### Back up, restore, and move data

On the Characters page, open **Import and backups**.

- **Download database backup** is the safest routine backup. It contains the
  complete SQLite database: every character, catalog and homebrew row, history,
  and supporting state. **Restore database backup** replaces all local app data
  after confirmation.
- **Download character backup** exports the selected character as portable
  JSON, including the external content that character references. Importing it
  creates another local character after validation and content review.
- **Download library JSON** preserves installed external/homebrew library
  content. It does not replace a complete database backup.
- **Import catalog** accepts the supported catalog JSON format. Use it only for
  content you trust and are allowed to use. The schema and supported record
  kinds are described in [catalog import](docs/CATALOG-IMPORT.md).

The formats intentionally serve different purposes; see
[backup formats](docs/BACKUP-FORMATS.md) for the technical contracts.

### Author local homebrew

Choose **Homebrew library** from the Characters page or a character workspace,
or open `/homebrew`. The current authoring UI can create, autosave, validate,
and publish local drafts for **species, subclasses, and backgrounds**. Published
entries become reusable catalog content for characters. The library also keeps
version history and provides explicit replacement, archive, and deletion
reviews because an existing character may still reference an older version.

This is a detailed but rough authoring surface. There is no general in-app form
for every catalog kind; spell and other catalog JSON import is a separate path.
Repository design drafts under [homebrew documents](docs/homebrew/README.md) are
not automatically installed into the app.

### Try the shared tabletop (`spike-vtt`)

Open `/vtt` directly. This component is named **spike-vtt**; the current screen
calls itself a **Phase 1 prototype**. Its basic shared table can create or join
a room, synchronize a grid and tokens peer-to-peer, paint visual fog, and keep a
shared dice log. The default connection uses public Nostr relays to introduce
peers; board updates then travel peer-to-peer. The room code is a shared secret,
not an account or a strong security boundary. Fog is visual concealment only,
because every connected browser receives the shared document, and the board
exists only while a peer keeps the page open.

The same page links to more rules-heavy experiments:

- **Compose a rules encounter from stored characters** selects three to five
  local characters and opens a DM encounter.
- **Load the bundled sample dungeon** opens the multi-room sample.
- **Choose a Vane Warren leader fight** opens the separate encounter chain.

These encounter screens include DM/player views, a board, initiative and legal
choices, reactions and a decision tray, dice history, rests, and session state,
but they are development-stage tools rather than a finished general-purpose
VTT. A concise player reference is in the
[player's table guide](docs/guides/players-table-guide.md).

### Development-only local AI helper

When using the development server, a small bottom-right helper panel may appear
if the expected local AI command-line tool is installed and authenticated. It
can answer text questions using a limited build reference. It cannot run
character actions or edit a character, and its replies are not a source of
truth. If the local tool is absent, the panel does not appear. The production
build checks that this helper is not included.

## Your data

The app stores its SQLite database in the browser's Origin Private File System
(OPFS), scoped to the exact origin. In practical terms, `localhost:5173`,
`127.0.0.1:4173`, another port, another browser profile, and a deployed site are
different stores. A character created under one of those origins will not
automatically appear under another.

The footer reports whether browser eviction protection was granted, but that is
not a backup. Browser cleanup, profile deletion, storage eviction, a migration
bug, or a pre-alpha format change can still cost local data. Keep downloaded
database backups outside the browser, label them with the date, and make a new
one before updating the checkout or restoring/importing data. Character JSON is
useful for sharing individual characters; the database backup is the recovery
copy.

Only one tab can own this app's SQLite storage pool at a time. If startup says
another tab holds the database, close the other SRD-55 tabs and choose **Try
again**.

## Running a short test

The following focused rules subset is suitable for a quick checkout check:

```bash
npx vitest run --configLoader runner tests/unit/rules
```

The full suite is substantially larger and optional for trying the app. This
README deliberately keeps the quick verification focused; the repository also
contains longer integration, browser, serving, mutation, and gate suites used
during development.

## Troubleshooting

### The port is already in use

Stop the process already using the port, or use the alternate development or
production port forms shown above. Remember that changing the port also changes
the browser storage origin, so the new origin will look like a fresh app until
you import a backup.

### Node reports unsupported syntax or Vite refuses to start

Check the version printed in Quick start. Upgrade to Node 22.12 or newer, keep
`package-lock.json` unchanged, and rerun the documented install and build
sequence.

### Windows cannot open the WSL2 URL

Use the printed localhost URL through WSL2 localhost forwarding. Do not replace
it with a plain HTTP WSL2 IP address: that origin is not secure, so OPFS and the
app database will not initialize. The production server intentionally binds
only to `127.0.0.1`; trusted HTTPS setup is outside this README.

### A production page looks older than the source

Stop the server, rerun the documented build, then restart the production server.
If the page still looks old, close other tabs and reload so the service worker
can activate the new build.

### The app stalls or warns about browser support

Use a current Chromium-family desktop browser. If another tab owns the database,
close it. Treat **Continue anyway** on an unsupported browser as an experiment,
not as assurance that the local data is safe.

## Project layout

- `src/` — application, UI, rules engine, SQLite worker, sharing, authoring, and spike-vtt source.
- `db/`, `drizzle/` — schema source and generated database artifacts.
- `content/`, `fixtures/` — redistributable content inputs and test fixtures.
- `public/` — static assets, app manifest, host headers, and SPA redirects.
- `tests/` — unit, browser, serving, integration, contract, and type tests.
- `tools/`, `scripts/` — build, serving, schema, validation, simulation, and maintenance programs.
- `docs/` — user guides, format references, design notes, research, licensing, and source provenance.
- `contracts/` — checked contracts used at subsystem boundaries.
- `ast-grep-rules/`, `ast-grep-tests/` — structural architecture checks.
- `.ai/` — agent-readable project and rules references.
- `.claude/`, `orchestration/`, `progress/`, `reports/` — the AI-supervised development record and automation evidence; an app user can ignore them.

## Contributing and reporting problems

Issues are welcome at the repository's
[GitHub issue tracker](https://github.com/derrickschoen/srd55-private/issues).
Include your browser and version, Node version, the URL/path where the problem
happened, exact steps, what you expected, what occurred, and whether a database
or character backup can reproduce it. Do not attach private character text or
unlicensed rules content to a public issue.

This repository does **not** currently accept pull requests.

## Licensing

The repository uses a licence split:

- **Code** (everything that is software: `src/`, `db/`, `scripts/`, `tools/`, `tests/`, and build configuration) is licensed under the [MIT License](LICENSE).
- **Game content** — material from the System Reference Document 5.2.1 (embedded
  as catalog data and rules text) and this project's own homebrew documents in
  `docs/homebrew/cc-by/` — is licensed under the Creative Commons Attribution
  4.0 International License; the required attribution is in [NOTICE.md](NOTICE.md).
- **Generated art** — every asset in `public/assets/art/` and every output of the
  repository's art generators, including board glyphs, badges, and pixel-font
  renders — is dedicated to the public domain under [CC0 1.0 Universal](LICENSE-ART).
  The clean-room generation statement is in [ART-PROVENANCE.md](ART-PROVENANCE.md).
- **OGL material** — `docs/homebrew/ogl/` holds Open Game License 1.0a source
  material and derivations; its license and Section 15 chain stay in that folder,
  and its text never crosses into the CC-BY tree.

[NOTICE.md](NOTICE.md) carries the SRD attribution, CC-BY file lists, and
per-source provenance. Generated-art provenance is in [ART-PROVENANCE.md](ART-PROVENANCE.md).
