# DISPATCH WALK-3 — D165 third acceptance walkthrough: librarian publishes → anonymous join by URL → refresh → roster (L, TEST-ONLY / MINT-FREE, <worktree assigned at dispatch>, PLAYWRIGHT_PORT=44546)

You are in <worktree assigned at dispatch>, fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including every design doc named below.

## PRECONDITION — a merged-prerequisites check, FIRST, before you write a line

WALK-3 is a certification instrument. It certifies code that other units own.
It cannot be written against absent code, and it must not stub, mock at the
app layer, or invent a control so the script can run.

**Prove in YOUR merge base that all of the following exist.** Commands, not
assumption: `ls`, `git grep -n`, and open the file.

1. **P3 — the local publication/observation index.** `db/schema/party.ts`
   declaring `party_document_states`, its registration in `db/schema/index.ts`
   and `db/schema/relations.ts`, its migration in `src/db/migrations.ts`, the
   handler `src/worker/handlers/party.ts`, and the client `src/party/client.ts`.
   D163 additionally requires that index to map **publication path → newest
   local clone**; if the index exists but carries no such mapping, say so —
   that is the roster's spine and its absence blocks leg D.
2. **P4 — publish/refresh orchestration.** `src/party/controller.ts`, being
   the only place read-token-write sequencing lives.
3. **P2 — the credential vault.** `src/party/credentials.ts`, with the
   sessionStorage vault, the anonymous lease arm, and the Forget token seam.
4. **P5 — the party screen and the public-reader route.** `src/ui/screens/party/`
   with TWO distinct `matches` arms (owner route + public-reader route,
   D156), the D166 librarian checklist, the D155 warn-once permanence
   statement, and the section-11 licensing disclosure.
5. **P6 — the CSP line.** `Content-Security-Policy: connect-src 'self'
   https://api.github.com https://gitlab.com https://codeberg.org` inside the
   `/*` block of `public/_headers`.
6. **P7 — the integrated honesty gate.** `tests/browser/party.spec.ts` and/or
   `tests/browser/party-honesty.spec.ts` present and green.
7. **THE ROSTER UNIT (D157 + D163).** There is **no design doc and no brief**
   for it — it was ruled after the party design was written and it is queued
   "as a unit after P5". Find its merged implementation by symbol: a read-only
   roster on the party screen rendering, per D157's verbatim field list,
   "name, class/level, AC, HP max, passive Perception, spell save DC". If you
   cannot find it, it has not merged.

Already on main at `a0a5382` when this brief was written, verified by the
supervisor — consume these, do not re-create them:
`src/party/storage/contracts.ts` (brands `Forge`, `RepositoryPath`,
`RepositoryRevision`, `PartyPublicationId`, the `StorageResult` union),
`src/party/storage/create-storage.ts`, `src/party/storage/github.ts`,
`src/party/storage/repository-path.ts` (`primaryLibraryPath`,
`createPublicationPath`, `parseRepositoryPath`, `sanitizeRepositorySlug`),
`src/party/storage/repository-locator.ts`,
`tests/fixtures/party-storage/` (`matcher.ts` with `FORGE_API_ORIGINS`,
`mock-fetch.ts`, `network-guard.ts`, `github/*.http`, `github/fixtures.ts`),
and `tests/browser/fixtures/party-storage-routes.ts` exporting
`installPartyStorageRoutes(page, fixtures, testName)` and its
`assertNoRefusals()` guard.

**If any of the seven prerequisites is absent: STOP and report, naming which
one and what you looked for.** A blocked report is the CORRECT outcome, not a
failure. Do NOT write the missing screen, the missing roster, a fake
controller, a second storage port, or a `page.evaluate` that pokes the
database to fake a state the UI cannot reach. If a control the journey needs
does not exist, that is a finding against the unit that owed it — report it
by name.

## NOT YOURS

- **WALK-1** — D165's extensions to the D112 script (multiclass entry, the
  spell section, a subclass choice) inside
  `tests/browser/acceptance-walkthrough.spec.ts`. You do not open that file.
- **WALK-2** — the D131 authoring script plus D165's spell-fork addition
  (`tests/browser/acceptance-authoring-walkthrough.spec.ts`). Separate file,
  separate unit.
- **P3, P4, P5, P6, P7** and **the roster unit** — you consume all six. You
  change no `src/` file. WALK-3 is TEST-ONLY.
- **P1-GL / P1-CB** (GitLab, Codeberg adapters), **DOC-C / DOC-L**.
- **D162's per-character print-appendix preferences**, **D171's bug-report
  button**, **D153's WebKit project** (your matrix is Chromium, D109; adding a
  Playwright project is a config edit and a re-dispatch).

If a prerequisite unit shipped a real defect, **report it — do not fix it
here.** A walkthrough that patches production code to stay green is the exact
failure mode the acceptance instrument exists to detect.

## THERE IS NO SINGLE BINDING DOC — this is the bound set, and it is deliberate

The party design predates every ruling that shaped this journey (design commit
`9713853`, 2026-08-01 12:26; the earliest ruling that touches it, D152-D155,
is `2c52cd4` at 21:23 the same day). **The party design has no WALK-3 unit
row** — WALK-3 did not exist when it was written. So the binding set is:

| Leg / concern | Binding text |
|---|---|
| The mandate and the journey's shape | **D165**, verbatim below |
| Publish, refresh, freshness vocabulary, local state | party design **§7** |
| Anonymous join by URL, public read-only | party design **§8**, as amended by **D154** |
| Repository layout and paths | party design **§3** (+ §5 read-token-write) |
| Failure honesty, every rendered state | party design **§9** |
| Licensing disclosure, hostile strings, a11y | party design **§11** |
| The fixture harness and named controls | party design **§13**, `PARTY-NO-LIVE-NETWORK` |
| Party page and its own routes | **D156** |
| Anon-primary participation | **D154** |
| Warn-once public permanence | **D155** |
| Roster existence | **D157** |
| Roster ROW SEMANTICS | **D163** — the only text that defines them |
| Librarian setup checklist + outbound link | **D166** |
| Script discipline (hand-authored expectations) | **D112 precedent**: `tests/browser/acceptance-walkthrough.spec.ts` |

D165, verbatim, is your mandate:

> Script 1 gains multiclass entry, the spell section, and a subclass choice;
> script 2 gains spell fork authoring; a NEW third script certifies the
> party path end-to-end (librarian publishes -> anonymous join by URL ->
> refresh -> roster), fixture-backed under PARTY-NO-LIVE-NETWORK. All three
> gate before D106. Amends D131's two-script instrument.

## AMENDMENTS — every ruling newer than the bound doc. Read this; it is not boilerplate.

Nineteen rulings postdate the party design. These are the ones that touch
WALK-3, and **they win over the doc**:

- **D154 inverts §8's framing.** The doc titles §8 "Read-only participation
  without a token" and reads as a secondary convenience. D154: "Public repo +
  tokenless anonymous read is the PRIMARY player path (zero setup); tokens are
  for the librarian/owner and any player who wants to self-publish."
  CONSEQUENCE: the anonymous leg is not an edge case you tack on — it is the
  bulk of the journey's user value, and the anonymous participant must reach
  a usable roster with **zero** setup beyond pasting a URL.
- **D155 adds a statement §7's publish sequence does not mention.** One-time,
  per-party, before the FIRST publish to a PUBLIC repo: "public means
  permanent — git history survives deletion." No per-publish confirm.
  CONSEQUENCE: assert it appears on publish #1 and does **not** re-appear on
  publish #2 in the same journey. Both halves, or the control is trivial.
- **D156 pins the routes.** Party features live on their own page under
  `src/ui/screens/party/`, never folded into the character list. Drive the
  journey through those routes.
- **D157 + D163 add a whole leg the doc has no text for.** D163 verbatim:
  > The roster is keyed on the repository publication path and shows the
  > NEWEST imported clone; superseded clones remain in the character list but
  > leave the roster. Never-published members get no row (the option was
  > offered and not taken). Resolves the D157/D62 collision (refresh-clones
  > would otherwise multiply roster rows). P3's index must therefore map
  > publication path -> newest local clone.
  CONSEQUENCE: §7 step 4 ("It never updates a prior clone in place") stands
  unchanged at the import layer — D163 governs the **view**, not the importer.
  If you find yourself asserting that refresh mutated a prior clone, you have
  broken D62 to satisfy D163. The correct shape is: two clones exist, one row.
- **D160 narrows which forge you may certify.** GitHub only was live-spiked
  via the owner's `gh` session; "GitLab and Codeberg adapters ship
  fixtures-roughed-in ONLY — explicitly marked unverified-against-live."
  CONSEQUENCE: drive this journey on **GitHub**. The design's §12 P5 exit row
  says "Chromium journey passes for all three fixture-backed adapters" — that
  is P5's claim about P5's own spec, and WALK-3 neither re-certifies nor
  contradicts it. Do not add a GitLab/Codeberg arm to this script; if you
  believe the acceptance instrument needs one, that is a finding for the
  owner, not a scope decision.
- **D166 adds the librarian's on-ramp.** "an outbound github.com/new link,
  exact settings listed, then paste-the-URL-back", and it grants the mini-
  ruling that a USER-CLICKED external navigation link is not an outward action
  "(the app itself still makes no un-consented request)". CONSEQUENCE, and get
  this exactly right: **assert the link, never follow it.** Assert its `href`,
  its `rel="noopener noreferrer"`, its accessible name, and the settings list
  beside it. A `click()` that navigates the page to github.com is a live
  request, breaks `PARTY-NO-LIVE-NETWORK`, and is a re-dispatch.
- **D164 is why this script matters more than usual.** The sitting is a solo
  disposable dry run through an ngrok tunnel; "nothing built there is kept."
  So the walkthrough scripts, not the sitting, are the durable certification.
  D106's gate now needs all three green (D165).
- **D146 (pre-dates the doc but closes its §15) still binds you:** default
  branch only — no branch/ref field anywhere in the journey; one repo per
  party with top-level `library/` and `characters/`; the librarian writes
  `library/`, each player writes only their own character path.
- **§15 OQ-6 (delete UI) and OQ-7 (multiple subset files) remain OPEN.** No
  ruling took them. So: assert **no delete affordance** exists on either
  route, and if the fixture repo holds `party-library.json` plus a named
  subset, assert both are listed and individually selectable with nothing
  imported silently.
- **D168 leaves the org name OPEN** (`srd55` is taken on GitHub). Your fixture
  repository owner/name is arbitrary test data. Do NOT bake a candidate org
  name into fixtures — it will read as a decision that has not been made.
- **The lane-state finding of 2026-08-02 binds your fixture paths.** The D150
  spike's repo layout was IMPROVISED by the supervisor
  (`library/species/<file>.json`, `characters/<player>/<file>.json`) and does
  **not** conform to §3's flat layout. Ruling as recorded: "captured response
  SHAPES are law; path/identifier VALUES are sanitizable when renamed
  consistently per request/response pair with disclosure." Your fixture paths
  are §3's: `library/party-library.json` and
  `characters/<slug>--<publication-id>.json`, and they must survive
  `parseRepositoryPath`.

## MINT-FREE, and TEST-ONLY

You mint nothing and you change no `src/` file. No migration, no share-wire
version, no character-backup document version, no character-state snapshot
version, no column, no table, no RPC method, no route, no `_headers` edit, no
config edit. Frozen with an EMPTY diff vs your merge base: `src/**`, `db/**`,
`public/_headers`, `drizzle/**`, every wire version, existing `a7-v*` snapshot
assertions. Do not quote a migration/wire tail from this brief — P3 mints a
migration between it and you; read the tails in your own merge base and show
them as unchanged. If the journey appears to need a production change, that is
a finding — process rule 7.

**Fixtures you may add**, under `tests/fixtures/party-storage/github/`:
compositions built from the SHAPES already recorded in that directory
(`get-repository`, `list-directory`, `get-file`, `get-not-found`, `put-create`,
`put-update`, `put-conflict`, `put-identical`, `anonymous-read`,
`anonymous-private-not-found`, `bad-token-401`, …), with path and identifier
VALUES renamed consistently per request/response pair and the rename disclosed
in the file. Any status, header or body shape **not** present in the recorded
corpus is marked `SYNTHETIC` in the fixture, exactly as
`synthetic-rate-limited.http` and `synthetic-too-large.http` already are.
**Recording a new live fixture is a separate D150/D160 spike, never a test
mode**, and requires the owner's pre-shown request list.

## FLOORS

`.claude/handover/lane-state.md` **in your worktree** governs and is
authoritative; it will be HIGHER than this brief by the time you run. At
writing, its own sections disagreed (3,154 / 3,218 / 3,232 tests; Playwright
92 vs 93; "22 specs" corrected by the supervisor to 20 spec FILES). Take the
highest, which is the RESTART POINT line: **vitest 3,232 exit 0 (201 files),
Playwright 93 exit 0, build 0** — and P1-GH has merged since, so expect more.
Spec FILE count was **20** on main at writing and will be higher after
WALK-1/WALK-2/P5/P7 land: **count them yourself in your worktree.** A stale
spec count in your table is a re-dispatch.

## Scope

The journey is ONE continuous test in a NEW file,
`tests/browser/acceptance-party-walkthrough.spec.ts`, named exactly:

> **`a table publishes, an anonymous player joins by URL, refreshes, and reads the roster`**

That exact name is load-bearing — the negative controls below reference it.
Do not extend either existing walkthrough script, and do not split the journey
into independent tests that each rebuild state; the point of an acceptance
walkthrough is that the state is carried, as in the D112 script.

### 0. Discipline — hand-authored expectations only (the D112 precedent)

`tests/browser/acceptance-walkthrough.spec.ts` is the model and you should
read it before starting. What it does, and you do:

- Acts through **user-visible affordances by role and label**
  (`getByRole('button', { name: … })`, `getByLabel(…)`), not through
  test-only hooks where a role or label exists.
- **Every expectation is hand-authored.** No snapshot of our own output, no
  value regenerated from a run, no "assert the roster equals what the roster
  rendered". The AC, HP max, passive Perception and spell save DC you assert
  in leg D are computed BY HAND from the fixture character document and
  written as literals, with a comment showing the arithmetic.
- The one legal capture-then-compare is the D112 **reload-stability** pattern
  (capture rendered numbers, reload, assert identical) — and it is legal only
  because those numbers were independently pinned first. Capturing an
  unpinned value and asserting it equals itself proves nothing.
- Absence is asserted as absence (`toHaveCount(0)`), never as
  "disabled-looking".

### 1. Leg A — the librarian publishes

1. Install `installPartyStorageRoutes(page, fixtures, testName)` before the
   first navigation, for ALL THREE origins in `FORGE_API_ORIGINS`, and call
   `assertNoRefusals()` at the end of the journey. An unhandled forge request
   must fail the test with the URL and the test name.
2. Reach the party page through its own route (D156).
3. **D166 checklist, without leaving the app:** assert the outbound
   `https://github.com/new` link is present, labelled, keyboard-reachable, and
   carries `rel="noopener noreferrer"`; assert the exact settings list is
   rendered beside it. **Never click it.** Then paste the repository URL back
   into the setup field — no branch/ref field exists (D146).
4. Paste a **sentinel token** with a distinctive value (P2's vault). Assert
   the connected-party header shows the forge/repository and a labelled
   **Forget token** button (§6).
5. **D155 warn-once:** assert the public-permanence statement appears before
   the first publish to the public fixture repository, and that the user must
   pass it to continue.
6. **§11 licensing disclosure before any library write**, quoted from the
   design:
   > Publishing copies this content into a repository you control. You are
   > responsible for having permission to redistribute it. The app preserves
   > and transports your content; it does not verify or vouch for its licence.
7. Publish the library, then publish one character. Assert the destination
   **paths** the UI shows are §3's: `library/party-library.json` and
   `characters/<slug>--<publication-id>.json`. Assert the write was
   conditional (the fixture corpus proves the expected-revision request; a
   `put-create` for first publish, a `put-update` for the second).
8. Assert the post-publish state string is one of §7's named states —
   **Published at revision N from this device**, or **Published; refresh
   required before another publish** when the fixture withholds the new token.
   Never "up to date", never a formatted null timestamp.
9. Publish a second time and assert the D155 statement does **not** re-appear.

### 2. Leg B — an anonymous player joins by URL (D154: the primary path)

1. Open a **second browser context** so the anonymous participant has its own
   origin storage and genuinely no token and no prior OPFS data. Creating it
   inside the same test keeps the journey continuous.
2. Join with the public party URL only. §8: "A generated public-party link
   contains only forge, repository, and ref. It never contains a token."
   Assert the sentinel token from leg A appears nowhere in the anonymous
   context — not in the URL, not in its storage, not in the DOM.
3. Assert **zero setup**: no token paste is required to reach party content.
4. Assert publish and delete controls are **ABSENT**, per §8: "those controls
   are absent, not disabled-looking promises." `toHaveCount(0)`, not
   `toBeDisabled()`.

### 3. Leg C — refresh, honestly

1. Before any refresh, assert **Never refreshed**.
2. Refresh. §7: list `library/` and `characters/`, read only new or changed
   files. The library import runs the existing D82 preview/plan; the character
   arm's "Import newer copy" invokes the D62 importer and creates a **fresh
   local character identity**.
3. Assert **Last refreshed successfully: <time>** appears after a fully
   successful refresh.
4. Include at least one file-level failure in the fixture corpus (an invalid
   or truncated document body, §9's "Invalid UTF-8/JSON/format/version/row/
   content graph" row) and assert the partial-refresh behaviour: per-file
   results, the invalid path and its observed revision named, **Latest refresh
   attempt: <named failure>**, and the success time **not advanced**. This is
   `PARTY-NO-FALSE-FRESHNESS` inside the journey.
5. Assert at least one hostile remote string (a hostile character name,
   library label, or path in the fixtures) renders through the
   `freeTextSpan` seam — `data-free-text="unverified-origin"`
   (`src/ui/free-text.ts:20-27`) — and is not interpolated.
6. **Reload** the anonymous context. Assert imported content survives (OPFS is
   truth) and that the reload issues **no forge request at all** — no polling,
   no boot-time import (§7: "There is no polling, background write,
   service-worker sync, or automatic import on app boot in v1"). Prove it from
   the route guard's observed request count, not from a screenshot.

### 4. Leg D — the roster (D163)

1. Assert one row per published character path, carrying D157's verbatim
   field list: "name, class/level, AC, HP max, passive Perception, spell save
   DC". Hand-pinned literals with the arithmetic in a comment.
2. **The clone-multiplication proof, which is the whole point of D163:**
   publish an updated character from the librarian context, refresh the
   anonymous context a second time, and assert:
   - a SECOND local clone now exists in the character list (D62 held — the
     importer did not update in place);
   - the roster still shows **ONE** row for that publication path;
   - the row shows the **newest** clone (assert a value that changed between
     the two published revisions);
   - the superseded clone is still present in the character list and
     **absent** from the roster.
3. Create (or carry) one purely local, never-published character and assert it
   has **no roster row**.
4. Reload once more and re-assert the load-bearing roster values.

EXIT (no design-doc row exists for WALK-3; this is D165's mandate made
testable, and the supervisor gates against it):

> The single named journey passes in Chromium on `PLAYWRIGHT_PORT=44546`
> with every forge request served from sanitized fixtures and
> `assertNoRefusals()` clean; librarian publish (D166 link asserted not
> followed, D155 warned once, §11 disclosed, §3 paths, conditional write),
> anonymous zero-setup join with no write/delete controls and no token
> present, refresh with honest freshness including one partial failure,
> reload with zero forge requests, and a D163-correct roster across a second
> imported clone. All three walkthrough scripts green together (D165, D106).

## Negative controls — one per load-bearing assertion

Every one of these fails the same test —
**`a table publishes, an anonymous player joins by URL, refreshes, and reads the roster`**
— so name the exact assertion that dies, not just the test.

| Assertion | Mutation | Assertion inside the journey that must fail |
|---|---|---|
| No live network (§13 `PARTY-NO-LIVE-NETWORK`) | `drop-one-fixture`: delete one fixture the journey needs | `assertNoRefusals()` throws with the URL AND the test name. **Prove the guard fires — absence of failure is not proof** |
| The D166 link is user-clicked only | `app-navigates-to-github-new`: make the checklist navigate on its own | the route guard records a request / the `rel` + href assertion |
| Permanence warned exactly once (D155) | `warn-every-publish` **and**, separately, `never-warn` | the "appears on publish #1" and "absent on publish #2" assertions — both mutations must fail, on opposite assertions |
| Licensing disclosure precedes the write (§11) | `publish-before-confirm` | the disclosure-then-write ordering assertion |
| §3 layout, not the spike's improvised layout | `spike-layout-paths`: point fixtures at `library/species/…` | the destination-path assertions / `parseRepositoryPath` refusal |
| Writes are conditional (§5) | `unconditional-write`: drop the expected revision | the fixture request contract for `put-update` |
| Anonymous needs no token (D154) | `require-token-for-anonymous-read` | the zero-setup join assertion in leg B |
| Public mode cannot write (§8) | `render-publish-in-public-mode` | the `toHaveCount(0)` on publish/delete controls |
| Token never reaches the public context (§6) | `put-token-in-public-url` | the sentinel-absent assertions in leg B |
| Freshness is only a proved success (§7, §9) | `advance-success-time-on-partial` | **Latest refresh attempt** / unchanged success-time assertion |
| No boot-time fetch (§7) | `auto-refresh-on-boot` | the post-reload request-count assertion |
| Remote strings stay data (D4, §11) | `interpolate-remote-name` | the `data-free-text="unverified-origin"` assertion |
| Roster is one row per publication path (D163) | `roster-row-per-clone`: key the roster on local character id | the "ONE row after the second import" assertion |
| Roster shows the NEWEST clone (D163) | `roster-shows-oldest-clone` | the changed-value assertion on the row |
| Superseded clone leaves the roster (D163) | `keep-superseded-clone-in-roster` | the superseded-absent assertion |
| Never-published gets no row (D163) | `roster-includes-unpublished` | the local-only character's `toHaveCount(0)` |
| D62 still clones (§7 step 4) | `update-clone-in-place` | the "a SECOND local clone exists" assertion |

## Process rules (all mandatory)

1. **Spec TABLE for ALL Playwright spec files** in your worktree (20 on main
   at writing; more once WALK-1/WALK-2/P5/P7 land — count them): Spec |
   Affected | Why. A bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44546`. Full
   vitest too. **Paste real numbers — not "green", the counts**, and state
   plainly what you ran versus what you are quoting from elsewhere.
4. Other lanes run suites concurrently; contention is the norm. Any test >1.5s
   alone gets a per-test timeout (20_000) with the **MEASURED** alone-time in
   a comment. **Never a config edit.** This journey drives two contexts, a
   publish, two refreshes and two reloads — it will exceed the 30s default:
   measure it alone, set `test.setTimeout(...)` with the measurement in the
   comment, exactly as the D112 script does at its top. Machine-wide rule from
   lane-state (2026-08-02): **at most ONE full suite of ANY kind at a time**;
   single-FILE vitest runs are the only thing allowed beside a running suite.
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`,
   no config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset
   replacement is the only legal removal), never regenerate an expectation
   from our own output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact failing test name and the exact assertion that dies.
7. If the unit's scope seems to require touching a forbidden area (any `src/`
   file, a frozen artifact, config, another unit's files) or seems infeasible
   as specified, **STOP and report the finding — that is a correct outcome.**
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted (vitest and Playwright, with the
measured alone-time for the journey); the spec table; files created/modified;
the fixture inventory with every SYNTHETIC one marked and every sanitized
path rename disclosed; the prerequisite audit (which of the seven you found,
under what symbol names, and any that differed from this brief); the negative
controls with exact test names and assertions; and any defect you found in a
prerequisite unit, reported rather than fixed.
