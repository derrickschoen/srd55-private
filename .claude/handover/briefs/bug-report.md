# DISPATCH BUG-REPORT — footer "Copy a bug report" button (M, MINT-FREE, <worktree assigned at dispatch>, PLAYWRIGHT_PORT=44548)

You are in `<worktree assigned at dispatch>`, fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including this brief.

## THERE IS NO DESIGN DOC. THIS BRIEF IS THE SPEC.

Every other dispatch this session binds a section of a merged design document
and forbids paraphrase. This unit has none: D171 is four days old, small, and
was queued without a doc. So the mechanics below are not a summary of a plan
you can go read — **they are the plan**, and where they are silent the correct
move is process rule 6 (STOP and report), not invention. If you find yourself
deciding a question this brief does not answer, that is a finding.

## THE RULING, quoted verbatim — this is the whole of the owner's instruction

> ## D171 — OWNER: in-app "Copy a bug report" button + GitHub issues (2026-08-02)
>
> Footer control pre-fills build id, browser, current screen, character id
> into the clipboard for pasting into chat; the D132 issue channel stays for
> account-holders. Small unit joins the queue.

Read the field list as CLOSED. Four things go in, and the phrase "for pasting
into chat" is what the button is for — a person pastes it to the owner. It is
not a submission, not a network call, not a pre-filled issue form.

## The second ruling this unit touches, also verbatim

> ## D132 — OWNER: issues ON, PRs NOT ACCEPTED (2026-07-31)
>
> The public repo opens issues with a template (browser, build id, steps).
> CONTRIBUTING states PRs are not accepted and why (supervised protocol; every
> change needs a ruling). The app footer links to the repo. SRD stays pinned at
> 5.2.1 until the owner rules otherwise.

**The footer repo link does not exist today and you are NOT the unit that adds
it.** Verified by the supervisor when this brief was written:
`grep -rIn "github.com" src/` returns three hits and all three are party
storage plumbing — `src/party/storage/github.ts:31` (`API_ORIGIN`) and
`src/party/storage/repository-locator.ts:28,35` (host→forge map). Nothing under
`src/ui/`. See AMENDMENTS for why you must not add one.

## Scope

The exit criteria in this brief are the exit criteria; there is no row to
quote. Numbered items are mechanics, not suggestions.

1. **A pure payload builder first, DOM and clipboard second.** Put the payload
   in a new module — `src/ui/bug-report.ts` — as a pure function of an input
   record (build id, user agent, route path, character id or absence). It
   returns the exact string that gets copied. The DOM shell reads nothing on
   its own and formats nothing on its own; it hands the function the four
   values and copies the result. That is what makes the unit suite able to pin
   the payload with no browser, on the precedent of
   `src/ui/screens/guided-builder/backup-hint.ts` +
   `tests/unit/ui/backup-hint.test.ts` (pure claim/format functions, DOM built
   against `tests/fixtures/interactive-dom`'s `installInteractiveDocument`).

2. **The payload is EXACTLY four fields and nothing else. Say this out loud in
   the code.** In:
   - build id — read `BUILD_ID` from `src/build-id.ts` (one source; it is
     hand-edited per deploy and D170 keys a changelog line to it). Do not
     re-derive it, do not hardcode the current value.
   - browser — `navigator.userAgent`, verbatim, as text.
   - current screen — the route (see item 4).
   - character id — the integer from the route when one is open (item 5).

   Out, and this list is not exhaustive because the rule is a whitelist, not a
   blacklist: **no notes, no backstory, no appearance, no character name, no
   class/subclass/level, no ability scores, no spell or item names, no counts
   of anything, no localStorage contents, no database rows, no RPC call, no
   error/console log, no timestamps, no screen dimensions, no storage-quota
   figures.** A person pastes this into a chat window they may not control; the
   only defensible payload is the one the owner named. **Adding a fifth field —
   however useful it would be for diagnosis — is a ruling request. STOP and
   report it; do not ship it and mention it afterwards.**

3. **THE HASH IS THE TRAP, AND IT IS A REAL ONE.** Verified at
   `src/ui/screens/character-list/character-list.ts:518`:

   ```ts
   initialFragment: location.hash.slice(1),
   ```

   The URL fragment on `/` carries an **entire encoded character** — that is
   how share links work in this app (`fragmentFromShareLink`,
   `share-controls.ts:88-103`; the link is built as `${baseUrl}#${fragment}` at
   `:368`). So a bug report copied while a share link is open, if it copied the
   URL, would copy somebody's whole character into a chat window.

   THEREFORE: the route field is **`location.pathname` only**. Never
   `location.href`, never `location.hash`, never `location.search`, never
   `document.URL`, never `router.current` serialized whole (`Route` carries a
   `query` — `src/ui/router.ts:1-5`). One browser test exists specifically to
   prove this and one negative control exists specifically to kill it.

4. **"Current screen" = the route path, plus the screen id only if you can get
   it honestly.** `location.pathname` is always available, including before the
   application starts, and it is the screen's address. The rendered screen's
   `id` (`src/ui/screen.ts:12-16`; ids are matched and chosen in
   `src/ui/app.ts` `#render`) is nicer prose but is only knowable once the
   Application has rendered.

   **Do NOT re-implement screen matching in your module.** A second route table
   that can disagree with `app.ts` is the defect here. Two legal outcomes:
   (a) ship the path alone, and report the screen-id gap; or (b) read the id
   from a seam set in exactly ONE place — the Application's own render — and
   state absence ("screen: application not started") when there is none. If (b)
   costs more than a single assignment, take (a). Whichever you take, say which
   in your report and why.

5. **Character id comes from the path, never from the database.** Every
   id-carrying route in this app is `/characters/<id>/...` with the id matching
   `/^[1-9]\d*$/` — verified across all four parsers:
   `src/ui/screens/sheet/screen.ts:23-35` (`.../sheet`),
   `src/ui/screens/print/screen.ts:8` (`.../print`),
   `src/ui/screens/build-report/screen.ts:7-20` (`.../report`),
   `src/builder/level-up-wizard.ts:555-570` (`.../level-up`), and
   `src/builder/contracts.ts:281-299` (`characters/new` — segment 1 is the
   literal `new`, so it correctly yields no id; and `characters/:id/build/
   levels/1`).

   You need a PREFIX-shaped parser (segments[0] === 'characters' and
   segments[1] matches the numeric pattern), which is deliberately unlike the
   four EXACT parsers above — those are exact because `app.ts` renders the
   first path-sorted match and looseness there would steal routes
   (`sheet/screen.ts:17-22` documents exactly that hazard). Write one parser,
   in your module, with a comment saying why it is not a fifth copy of theirs,
   and name the duplication in your report rather than silently adding it.

   No open character is **stated**, never rendered as `0`, never an em dash,
   never omitted-so-the-reader-guesses (D33: a disclosed wrong number is still
   a wrong number). "No character open" is the correct text.

6. **Where it lives: the existing footer, in `index.html`.** The footer is
   static markup at `index.html:26-40` — `<footer class="site-footer">` holding
   the `.pwa-status` block and the single `/legal` link. Your control is a
   `<button type="button">` in that same static markup with a stable
   `data-testid` (convention: `[data-testid="srd-attribution"]`,
   `attribution.spec.ts:32`). Not a new floating widget, not a screen-owned
   control — screens replace `#app`'s children and the footer deliberately sits
   outside it (the comment at `index.html:24-25` says so).

7. **Wire it during module evaluation, ahead of the boot gate — for a reason
   already proven in this repo.** `src/main.ts:88-111` documents at length why
   footer wiring happens before the gate: the footer paints in tens of
   milliseconds while the worker spends ~1.5s (prod) to 3.7s (dev) bringing up
   sqlite wasm and OPFS, and a click inside that window used to destroy the
   boot. **The bug-report button has a stronger version of the same
   requirement: the moment a person most needs to report a bug is the moment
   the app failed to start.** `attribution.spec.ts` already proves the footer
   works with the wasm aborted ("the notice stays reachable when the database
   never starts") — your button must clear the same bar.

   The existing delegated listener (`routeFooterLinks`, `main.ts:112-145`)
   handles `a[data-router-link]` only. Do not repurpose it to dispatch a
   button, and **do not call `startApplication()`** from your handler — copying
   a bug report is not a navigation and must not boot the app. Add one
   dedicated listener, in the same pre-gate position, with a comment pointing
   at the `main.ts:88-111` rationale rather than restating it.

8. **Clipboard access reuses the existing capability probe.** The shape is
   already in the tree at
   `src/ui/screens/character-list/share-controls.ts:74-86`: probe
   `navigator.clipboard?.writeText === undefined` and OMIT the capability
   rather than exposing a method that throws, injected through an options seam
   so tests never touch a real clipboard. Follow that shape. Do not add a
   second ad-hoc `navigator.clipboard` reach-in, and do not implement copying
   with an off-screen textarea plus `document.execCommand('copy')` as the
   primary path.

9. **The refusal fallback is a VISIBLE, SELECTABLE text block — name it, build
   it, test it.** Clipboard write can fail three ways: the API is absent, the
   permission is denied, or the promise rejects (document not focused is the
   common real-world one). All three land on the same fallback: render the
   payload into a visible, user-selectable block in the footer region — a
   `readonly <textarea>` or a `<pre>` that is genuinely selectable — with one
   stated line telling the reader to copy it by hand, and select its contents
   where the platform allows. Requirements:
   - **Byte-identical to what the clipboard would have received.** ONE producer
     (item 1's pure function) feeds both paths. A second formatter for the
     fallback is a defect with its own negative control.
   - Filled by `textContent` / `value`. **No `innerHTML` anywhere in this
     path** — `navigator.userAgent` is browser-supplied text, not our markup.
   - **Never CSS-hidden, never off-screen, never `hidden`** (D4: agent-readable
     content is collapsed, never hidden; a payload staged in a hidden node is
     precisely the cloaking that ruling forbids). Collapsing behind a
     `<details>` is acceptable; `display:none` is not.
   - Never a silent failure, never a `console.error` as the only signal, never
     `prompt()`.

10. **State what it copies, before it is copied.** The control carries a short
    visible statement of the four fields it will copy. This is not decoration:
    the app's posture is stated absence and legible provenance, and a button
    that silently harvests is the thing that posture exists to prevent. Confirm
    the copy through a live region — precedent in the same footer:
    `#persistence-status` uses `role="status" aria-live="polite"` and
    `#update-ready` uses `role="status"` (`index.html:28-37`).

11. **Read-only, and that includes preferences.** No storage write, no
    `localStorage` key, no database write, no command, no RPC, no query
    parameter, no service-worker interaction, no counter of how many reports
    were copied. The button must work with no database open at all (item 7),
    which it can only do if it needs nothing from one.

12. **Print.** `src/ui/styles/base.css:133-136` hides `.site-footer` under
    `@media print`, and `tests/browser/character-sheet.spec.ts:585` asserts it:
    `await expect(page.locator('.site-footer')).toBeHidden();` inside the test
    named **"print media keeps the sheet and warnings, adds paper fields, and
    ends with attribution"** (`test(` at :545). Keep the button inside the
    footer so it inherits that, add no print-visible copy, and leave that test
    green **unchanged** — see the cross-lane hazard below.

13. **MINT-FREE.** No migration, no share-wire version, no backup document
    version, no character-state snapshot version, no column, no table, no RPC
    method. Every frozen artifact shows an EMPTY diff vs your merge base. If
    this unit appears to need a registry number, that is a dispatch error —
    STOP and report (process rule 6).

## EXIT

- A footer button copies a report containing exactly: build id, browser user
  agent, route path (+ screen id if item 4(b) was taken), and either the open
  character's id or a stated "no character open".
- A browser test proves the copy round-trips through the real Chromium
  clipboard with permissions granted in the spec.
- A browser test proves that with a share fragment and a query string in the
  URL, **neither appears** in the copied text.
- A browser test proves the fallback path renders the identical payload as
  visible selectable text when the clipboard write is refused.
- A browser test proves the button works when the database never opens.
- A unit test pins the payload's field set exactly, and pins that the fallback
  string and the clipboard string come from one producer.
- Full vitest and full Playwright at or above the floors, pasted.

## NOT YOURS

- **D170's update prompt** ("Download a backup first" + a one-line
  what-changed keyed to the build id). It touches the same footer block
  (`#update-ready`, `#refresh-update` in `index.html:34-37`, wired at
  `src/main.ts:25-32`). You change none of it, and you do not "tidy" it.
- **D132's public-repo work**: the issue template, CONTRIBUTING, the footer
  repo link, the public squash (D127). Publish prep owns all of it.
- **D172's cloner documentation** for the AI panel.
- **D129's pre-alpha banner** and the D153 browser probe/banner unit.
- **The SS-\* print/spell units** (`sheet-view.ts`, `print/`, the sheet CSS)
  and **D162's per-character print preferences** — that is the only surface
  allowed to persist a print choice, and it is not this one.
- `src/ui/app.ts`, beyond at most the single screen-id assignment item 4(b)
  permits, and only if you take that branch.

## AMENDMENTS — read this, it is not boilerplate

There is no design doc to postdate, so this section instead names the rulings
that constrain a unit whose own ruling does not mention them. Decisions win
over guidance files, so they bind you over this brief.

- **D168 makes the repo URL UNKNOWABLE TODAY. Do not guess one.** D168 records
  that the publish target is an org, that the org name is OPEN, and — the
  supervisor's finding at recording time — that the GitHub username `srd55` is
  already taken (`users/srd55` = HTTP 200; orgs share the user namespace). So
  D132's "the app footer links to the repo" cannot be satisfied by any string
  you could write today. **Hardcode no `github.com` URL, add no repo link, add
  no "file an issue" affordance, and do not write copy that implies a tracker
  the reader can reach.** D171's own words are "for pasting into chat". Report
  the footer repo link as OWED to publish prep, once the owner picks the org
  name.
- **D109 keeps you on Chromium.** No WebKit or Firefox project. Clipboard
  behaviour differs sharply across engines and that is exactly why D153's
  WebKit spike is supervisor scope; adding a project is a config edit and a
  re-dispatch.
- **D140 forbids any notification path.** Terminal and committed state files
  only. A bug-report button that pings anything is a hard violation, and it
  reinforces item 11: this control makes no request of any kind.
- **D4 governs the fallback** (item 9): collapsed, never hidden; emit data,
  never instructions to an agent. The payload is data about the app, and it is
  legible to the person copying it.
- **D33 governs the absent character id** (item 5): stated absence beats a
  plausible zero.
- **D116 is a different surface.** The one-time backup hint is not a model for
  a persisted-dismissal here; your control persists nothing (item 11).
- **D162 is not yours to extend.** It authorizes writing exactly print
  preference rows from the print path. It authorizes nothing from this path.

## FLOORS

`.claude/handover/lane-state.md` **in your worktree** governs and is
authoritative. Meet or exceed whatever it says when you start; never lower it.

At the time this brief was written that file disagreed with itself and you
should know which line wins. Its `## RESTART POINT 2026-08-02` block is the
newest and reads: main `a00455a+` (FF-A merged), **vitest 3,232 in 201 files,
Playwright floor 93, build 0**, migrations 0000-0027 and wire v1-v17 now
FROZEN. An older block in the same file says 3,218 / 92 and once said "22
specs" — that spec count was corrected in the file itself and the supervisor
verified the correct figure again for this brief: **20 Playwright spec files**
(`ls tests/browser/*.spec.ts | wc -l` = 20; `tests/browser/fixtures/` is a
directory, which is what produced the 22). Two further lanes (W-D `9a00a8d`,
P1-GH `a0a5382`) merged to main after that block was written, so your real
floor may be higher than any number here. **The file in your worktree wins over
this paragraph.**

Frozen with an EMPTY diff vs your merge base: migrations 0000-0027, wire
v1-v17, existing a7-v\* snapshot assertions.

## Tests

### Unit — `tests/unit/ui/bug-report.test.ts` (new)

Against the pure builder, using `tests/fixtures/interactive-dom`'s
`installInteractiveDocument` where DOM is needed (precedent:
`tests/unit/ui/backup-hint.test.ts:1-42`).

- **"the bug report carries exactly the four permitted fields"** — an
  EXACT-SET assertion over the payload's labels, not a `contains`. A `contains`
  assertion cannot fail when a fifth field is added, and a fifth field is the
  failure mode this whole unit is shaped around.
- **"no open character is stated, never rendered as zero"**.
- **"the fallback block shows the same bytes as the clipboard payload"** —
  one producer, asserted on a payload containing a UA with punctuation.
- Route path handling: a path with an id, a path without, `/characters/new`
  (no id).

### Browser — `tests/browser/bug-report.spec.ts` (new, Chromium)

This takes the spec-file count from 20 to 21. Adding a spec is meeting the
floor, not lowering it; your spec table must then cover 21 files.

Permissions are granted **in the spec**, per test, on the `context` fixture —
`await context.grantPermissions(['clipboard-read', 'clipboard-write'])`. Do NOT
add `use: { permissions: [...] }` to `playwright.config.ts`; that is a config
edit and a re-dispatch (process rule 5). `http://127.0.0.1` is a secure origin,
so `navigator.clipboard` is present; read back with
`page.evaluate(() => navigator.clipboard.readText())`.

1. **"the footer copies a bug report with the build id, browser, route and
   character id"** — on a `/characters/:id/sheet` route with a seeded
   character; assert all four fields and that the id equals the one in the URL.
2. **"a bug report copied from a share link carries no character data"** — load
   `/` with a long sentinel fragment and a sentinel query parameter present in
   the URL, copy, and assert the copied text contains **neither** sentinel.
   This is the privacy proof and it is the most important test in the unit.
3. **"the bug report falls back to selectable text when the clipboard is
   refused"** — use `page.addInitScript` to make `navigator.clipboard.writeText`
   reject, and a second arm with the property removed entirely. Assert a
   visible element carrying the identical payload, assert it is visible and
   selectable (not `hidden`, not `display:none`), and assert no unhandled page
   error.
4. **"the bug report works when the database never starts"** — the
   `page.route('**/*.wasm', (route) => route.abort())` precedent from
   `tests/browser/attribution.spec.ts` ("the notice stays reachable when the
   database never starts"); assert the four fields still copy.
5. **"copying a bug report writes nothing"** — snapshot `Object.keys(localStorage)`
   and `window.staticApp.countCharacters()` before and after; both unchanged.

### CROSS-LANE HAZARD — name it, do not resolve it

**SS-3 (wt/pwa, in flight) amends the same named test you must leave alone**:
"print media keeps the sheet and warnings, adds paper fields, and ends with
attribution" (`tests/browser/character-sheet.spec.ts:545`). You need exactly
one thing from that test — its `.site-footer` hidden assertion at :585 stays
green with your button in the footer. **Do not rename it, do not restructure
it, do not add assertions to it**; a merge conflict in that test between two
lanes is a supervisor problem you should not create. If your change turns it
red, that is a real finding: report it, do not edit the test.

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| Payload is exactly four fields | `add-character-name-to-report`: include the open character's name | **"the bug report carries exactly the four permitted fields"** |
| No fragment/query leakage | `copy-full-url`: use `location.href` in place of `location.pathname` | **"a bug report copied from a share link carries no character data"** |
| Refusal is handled visibly | `swallow-clipboard-rejection`: catch the rejection and do nothing | **"the bug report falls back to selectable text when the clipboard is refused"** |
| Fallback is not hidden | `hide-fallback-block`: `display:none` on the fallback | **"the bug report falls back to selectable text when the clipboard is refused"** |
| One producer for both paths | `rebuild-fallback-text`: a second string builder for the fallback | **"the fallback block shows the same bytes as the clipboard payload"** |
| Works before/without boot | `mount-bug-report-after-boot`: wire it inside `startApplication` instead of at module evaluation | **"the bug report works when the database never starts"** |
| Absent id is stated | `report-zero-character-id`: emit `0` when no character is open | **"no open character is stated, never rendered as zero"** |
| Read-only | `persist-bug-report-count`: write a `localStorage` counter on each copy | **"copying a bug report writes nothing"** |
| Stays hidden on paper | `move-bug-report-out-of-footer`: mount the button outside `.site-footer` | **"print media keeps the sheet and warnings, adds paper fields, and ends with attribution"** — the `.site-footer` hidden assertion at :585 |
| Copying does not navigate | `start-application-on-copy`: call `startApplication()` from the handler | **"the bug report works when the database never starts"** |

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (20 existing + your new one = 21):
   Spec | Affected | Why — a bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44548`. Full
   vitest too. Paste real numbers — not "green", the counts.
4. Other lanes run suites concurrently; contention is the norm. Any test >1.5s
   alone gets a per-test timeout (20_000) with the MEASURED alone-time in a
   comment. **Never a config edit.** (The wasm-abort test in item 4 of the
   browser list will be slow — measure it alone and annotate it.)
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files) or seems infeasible as specified,
   STOP and report the finding — that is a correct outcome. Because this unit
   has no design doc, this rule carries more weight than usual: an unanswered
   question is a finding, not a licence to decide.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted; the 21-row spec table; files
created/modified; negative-control candidates with exact test names; which
branch of item 4 you took for the screen id and why; the route-parser
duplication you added (item 5) named explicitly; and the footer repo link
recorded as OWED to publish prep under D168.
