# DISPATCH UPDATE-PROMPT — backup offer + one changelog line in the refresh-to-update prompt (S/M, MINT-FREE, <worktree assigned at dispatch>, PLAYWRIGHT_PORT=44547)

You are in /home/vagrant/PhpstormProjects/<worktree assigned at dispatch>,
fast-forwarded to main by the supervisor. `.claude/decisions.md` is law and
wins over every other guidance file, including this brief.

## THERE IS NO DESIGN DOC. THIS BRIEF IS THE SPEC.

Do not go looking for a `docs/design/*.md` row for this unit — none exists, and
inventing one is not your job. The ruling below is the whole requirement; the
mechanics in "Scope" are the supervisor's binding reading of it, proved against
the current tree at the file:line quoted. Where this brief and a D-ruling
disagree, the ruling wins and you STOP and report (process rule 7).

**D170, quoted verbatim and in full:**

> ## D170 — OWNER: update prompt offers backup + one changelog line (2026-08-02)
>
> The refresh-to-update prompt gains "Download a backup first" and a
> one-line what-changed keyed to the build id; the owner writes that line
> per deploy (deploys are manual). Does not contradict D116 (first-character
> hint) — recorded as its own surface.

## D116 IS NOT CONTRADICTED — and you must keep it that way

The ruling says so itself, and the supervisor verified the mechanical reason at
the code. These are two different surfaces and they must stay two:

| | D116 hint (EXISTS — not yours) | D170 update prompt (yours) |
|---|---|---|
| Moment | the first character completes level 1 | a new service worker is waiting |
| Surface | `src/ui/screens/guided-builder/backup-hint.ts`, an `<aside class="guided-backup-hint">` inside the guided builder | `#update-ready` in `index.html:34-37`, in the site footer, outside `#app` |
| Payload | that one character's JSON (`exportCharacter`) | the WHOLE database (`exportDatabase`) — there is no character in scope at the update moment |
| Repetition | once per browser profile, claimed atomically in local storage (`BACKUP_HINT_STORAGE_KEY`, `backup-hint.ts:31-47`) | every time an update is waiting, **with zero storage** — see D95 below |
| Button label | `Download a backup` (`backup-hint.ts:72`) | `Download a backup first` (D170's words, exactly) |

You do not touch `backup-hint.ts`, its test, or its storage key. You do not
reuse its element, its class names, or its one-time claim. Copying the claim
would turn a per-update offer into a once-ever offer and would silently
un-implement D170 for every deploy after the first.

## NOT YOURS

- **BANNER** (D129: the persistent pre-alpha banner, the build id visible in
  the site footer, `public/robots.txt` + the noindex meta). Brief exists at
  `.claude/handover/briefs/banner.md`; it is unmerged at writing —
  `git grep -n BUILD_ID` returns only `src/build-id.ts:1` and
  `src/ui/screens/sheet/sheet-view.ts:2,1361`. You add **no** footer build-id
  element and **no** banner. If BANNER has merged into your merge base, you
  neither remove nor duplicate its footer element (see scope item 4).
- **D171** (the in-app "Copy a bug report" button that pre-fills build id,
  browser, screen, character id). It shares the build-id constant with you and
  nothing else. Do not build it, do not generalise for it.
- **D116's hint**, above.
- **The service worker itself and its generator.** `tools/pwa/service-worker.ts`
  and the `appShellServiceWorker` plugin in `vite.config.ts:57-101` are out of
  bounds: the second is a config file (process rule 5) and the first is only
  reachable through it. You change neither, and you add no new message to the
  `SKIP_WAITING` protocol (`register-service-worker.ts:1`,
  `tools/pwa/service-worker.ts:69-73`).
- **D162 print preferences, the SS-* print units, the AI panel (D172).**

## MINT-FREE

You mint nothing: no migration, no share-wire version, no backup document
version, no character-state snapshot version, no column, no table, **no RPC
method**. The backup you offer goes through the RPC that already exists
(`createBackupClient(rpc).exportDatabase`, reached via
`ImportBackupController.exportDatabase`, `import-backup-controls.ts:108-116`).
Frozen with an EMPTY diff vs your merge base: migrations `0000`-`0027`, wire
`v1`-`v17`, `DATABASE_BACKUP_VERSION = 1` / `CHARACTER_BACKUP_VERSION = 3`
(`src/backup/backup-version.ts:1-8`), existing `a7-v*` snapshot assertions. If
your work appears to need a registry number, a column, or a new RPC, that is a
dispatch error — STOP and report (process rule 7).

## FLOORS (never lower)

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative;
meet or exceed whatever it says when you start. At writing it read: **vitest
3,232 exit 0 (201 files), Playwright 93 exit 0, build 0.** The Playwright spec
FILE count is **20** — verified by the supervisor at
`ls tests/browser/*.spec.ts | wc -l` on main `a0a5382`. (An earlier lane-state
line said 22; it was wrong and was corrected. Use 20, and correct it again in
your report if your merge base disagrees.)

## The surfaces you are bound to — current shapes, quoted

**1. `index.html:24-37`** — the prompt markup, deliberately outside `#app`:

```html
    <!-- Outside #app so it survives every screen render: screens replace the
         children of #app whenever they redraw. -->
    <footer class="site-footer">
      <div class="pwa-status">
        <output
          id="persistence-status"
          role="status"
          aria-live="polite"
          data-persistence-state="requesting"
        >Requesting browser eviction protection…</output>
        <div id="update-ready" role="status" hidden>
          <span>Update ready.</span>
          <button id="refresh-update" type="button">Refresh to update</button>
        </div>
      </div>
```

**2. `src/pwa/register-service-worker.ts:13-28` and `:45-53`** — the current
signature, the reveal, and the refresh click:

```ts
export function registerAppServiceWorker(
  serviceWorkers: ServiceWorkerContainer,
  updatePrompt: HTMLElement | null,
  refreshButton: HTMLButtonElement | null,
  reload: () => void,
): void {
  let waitingWorker: ServiceWorker | null = null;
  let observedInstalling: ServiceWorker | null = null;
  let refreshRequested = false;

  const showUpdate = (worker: ServiceWorker): void => {
    waitingWorker = worker;
    if (updatePrompt !== null) {
      updatePrompt.hidden = false;
    }
  };
```

```ts
  refreshButton?.addEventListener('click', () => {
    if (waitingWorker === null) {
      return;
    }
    refreshRequested = true;
    refreshButton.disabled = true;
    refreshButton.textContent = 'Refreshing…';
    waitingWorker.postMessage(UPDATE_MESSAGE);
  });
```

**3. `src/main.ts:25-32`** — the wiring, which today runs BEFORE the worker and
the RPC client exist (`const worker = new Worker(...)` is `:34-36`,
`const rpc = new RpcClient(worker)` is `:37`):

```ts
if ('serviceWorker' in navigator) {
  registerAppServiceWorker(
    navigator.serviceWorker,
    document.querySelector<HTMLElement>('#update-ready'),
    document.querySelector<HTMLButtonElement>('#refresh-update'),
    () => location.reload(),
  );
}
```

**4. The backup entry point — `src/ui/screens/character-list/import-backup-controls.ts:83-93` and `:108-116`:**

```ts
export function defaultImportBackupServices(
  rpc: RpcClient,
): ImportBackupServices {
  return {
    catalog: createCatalogClient(rpc),
    backup: createBackupClient(rpc),
    confirm: (message) => window.confirm(message),
    save: saveBrowserFile,
    now: () => new Date().toISOString(),
  };
}
```

```ts
  async exportDatabase(): Promise<void> {
    const backup = await this.services.backup.exportDatabase();
    this.services.save({
      filename: `srd-55-database-${backup.exported_at.slice(0, 10)}.sqlite3`,
      contents: new Blob([backup.sqlite.slice()], {
        type: 'application/vnd.sqlite3',
      }),
    });
  }
```

That is the entry point you consume. You write no second exporter, no second
`saveBrowserFile`, no second filename rule.

**5. The D129 build id — `src/build-id.ts`, the file in full:**

```ts
export const BUILD_ID = 'srd55-2026-08-01-1';
```

One constant, one file, already imported by the printed sheet's provenance line
(`sheet-view.ts:1361`). The changelog line joins it **here** and nowhere else.

## THE ONE HARD FINDING — read before you design anything

**The page that shows the update prompt is running the OLD build.** The
supervisor verified the mechanism; re-verify it yourself before you write the
copy, because it decides the wording:

- the generated worker serves only its own cache and does not take over until
  it is told to (`tools/pwa/service-worker.ts:92-120` fetch handler consults
  `CACHE_NAME` alone; `:75-90` activate/claim runs only after `SKIP_WAITING`);
- `showUpdate` fires while the OLD worker still controls the document
  (`register-service-worker.ts:36-42` requires `serviceWorkers.controller !==
  null`), so every module on the page — including `src/build-id.ts` — came out
  of the old build's bundle.

**Consequence: a constant compiled into the running bundle can only ever
describe the build the user already has, never the one that is waiting.** So:

- You implement the truthful version: the line is attributed to the RUNNING
  build, by id. Exact copy is mandated in scope item 3.
- **Forbidden wording**, because it would state something we cannot know:
  "What's new", "This update adds…", "Changes in the update", or any phrasing
  that attributes the line to the waiting build. A disclosed guess is still a
  guess (D33), and inventing content is the thing this project does not do.
- **Do not close the gap.** The two closures the supervisor considered are both
  out of scope: (a) bake the line into the generated worker and have the
  waiting worker answer a message — needs `vite.config.ts`, a config edit
  banned by process rule 5; (b) fetch a checked-in JSON at prompt time — an
  app-initiated network read in an offline-first app, which needs an owner
  ruling, not a lane decision.
- **You must report it**, at full length, as an OWNER QUESTION: "the changelog
  line describes the build being left, not the one being installed; closing
  that needs either a service-worker protocol change (config) or a network
  read (ruling)." `lane-state.md:67` already carries "QUESTION ROUND 3 UNASKED:
  update-prompt backup/changelog" — your report is what makes that question
  askable with evidence.

## Scope

1. **The changelog constant lives next to the build id.** `src/build-id.ts`
   gains exactly one export beside `BUILD_ID` — a plain string constant (name
   it `BUILD_CHANGE_LINE`) holding ONE line of hand-written what-changed text,
   edited by the owner per deploy alongside the id. No array, no map keyed by
   version, no history list, no generated file, no build step. A short comment
   in that file states the contract: both values are hand-edited together at
   deploy time, and the line describes the build it ships in. Seed it with the
   real change line for the current build id — one sentence, no invented
   feature claims.
2. **Pure content first, DOM second.** The text is produced by a pure exported
   function of `(buildId, changeLine)` returning `string | null` — `null` when
   the line is blank/whitespace — so vitest pins the copy with no DOM at all.
   The renderer makes no decisions: `null` ⇒ the line element stays `hidden`
   and empty; never an empty paragraph, never a dangling colon, never an em
   dash that reads as "no changes" (D33).
3. **Prompt contents, in this order.** `#update-ready` keeps its id, its
   `role="status"`, its `hidden` default, and its existing two children
   unchanged in text and id, and gains two:
   1. `<span>Update ready.</span>` — unchanged;
   2. the change line, in a new element with a stable id (`update-change-line`),
      `hidden` in the shipped markup, whose text is exactly
      `Current build ${BUILD_ID}: ${BUILD_CHANGE_LINE}` and is set as a **text
      node** (`textContent`), never `innerHTML`;
   3. a new `<button type="button">` labelled exactly **`Download a backup
      first`** with a stable id (`update-backup`);
   4. a status element for that button, plain, inside the prompt;
   5. `<button id="refresh-update">Refresh to update</button>` — unchanged id,
      unchanged label, unchanged behaviour.
   The static markup lives in `index.html` beside the existing prompt, for the
   reason the file's own comment gives at `:24-25`: the footer survives every
   screen render. Text comes from the constants at runtime.
4. **One live region, not three.** `#update-ready` already carries
   `role="status"`; a live region announces its own subtree, so the backup
   status element inside it gets **no** `role`/`aria-live` of its own, and the
   error state is carried by text plus a `data-*` attribute — not by a nested
   `role="alert"`. This deliberately differs from `backup-hint.ts:117,125`,
   which sets `role="status"`/`role="alert"` because that hint is NOT inside a
   live region. Keyboard-operable, labelled controls per D108.
5. **The backup is the WHOLE DATABASE.** There is no character in scope in the
   footer, and the user is about to replace the code that owns every character.
   Consume `ImportBackupController.exportDatabase()`; the file is the existing
   `srd-55-database-YYYY-MM-DD.sqlite3`. No confirm dialog (nothing is
   destroyed), no character picker, no new filename rule.
6. **The offer never blocks the update.** Refresh stays enabled and functional
   throughout: before a backup, during one, and after one that failed. The
   backup button is disabled only while its own call is in flight (D71's
   disabled-control guard) and re-enables when the promise settles either way.
   A successful backup does NOT hide the prompt, because the update is still
   pending — contrast `backup-hint.ts:121`, which hides on success and is right
   to, because there the hint's whole job is done. Status text: an in-flight
   line, a success line, and on rejection the error's message (the
   `error instanceof Error ? error.message : String(error)` shape used at
   `backup-hint.ts:122-124`).
7. **Zero storage, zero writes (D95, and D170's "its own surface").** The
   prompt writes no local-storage key, no dismissal flag, no "seen this build"
   marker, no database row, no command. It is derived from worker state alone,
   so it reappears for every future update — that is the requirement, not a
   side effect. Exporting a backup is a read.
8. **Wiring order in `src/main.ts`.** The export callback needs the RPC client,
   which today is constructed AFTER the registration block. Move the
   `if ('serviceWorker' in navigator)` block below `const rpc = new
   RpcClient(worker);` (`:37`) and inject
   `() => new ImportBackupController(defaultImportBackupServices(rpc)).exportDatabase()`
   (or an equivalent lazily-constructed callback). Two things must remain true
   and you must state that you checked both: registration still happens inside
   the `window.addEventListener('load', …)` deferral
   (`register-service-worker.ts:62`), and the block still runs during module
   evaluation — not inside a promise chain, not after the boot gate at
   `main.ts:202-218`. A boot that never completes must still be able to install
   an update.
9. **A seam that vitest can drive.** Growing `registerAppServiceWorker` to six
   or seven positional parameters is a re-dispatch. Either take a single
   options object, or — preferred — put the prompt in a new
   `src/pwa/update-prompt.ts` that exports the pure content function and a
   dependency-injected controls factory (`exportBackup: () => Promise<void>` on
   the `BackupHintDeps` precedent, `backup-hint.ts:13-16`), and have
   `registerAppServiceWorker` own worker lifecycle only. The unit tests must be
   able to exercise the whole prompt with no `ServiceWorkerContainer` and no
   RPC.
10. **Nothing else moves.** No CSS framework change beyond the styles your new
    elements need, no screen touched, no router change, no new dependency, no
    change to `#persistence-status`, no change to the `SKIP_WAITING` string.

## EXIT

No design doc exists, so the exit criteria are stated here and are binding:

> Exit: (1) a vitest suite proves the prompt's whole behaviour with no service
> worker and no RPC — the change line's exact text from `BUILD_ID` +
> `BUILD_CHANGE_LINE`, the blank-line omission, the backup call, the failure
> path, the refresh path, and that no storage is written; (2) a Chromium test
> proves the real end-to-end backup from the real prompt element against the
> real database, downloading a real `srd-55-database-*.sqlite3` without
> navigating away and without disabling refresh; (3) the existing prompt ids,
> labels and hidden-by-default behaviour are unchanged; (4) the incoming-build
> limitation is reported, not closed.

## Tests

**Unit — `tests/unit/pwa/update-prompt.test.ts` (new), plus additions to
`tests/unit/pwa/register-service-worker.test.ts`.** vitest runs
`environment: 'node'` (`vitest.config.ts`), so use the established DOM fixture
`tests/fixtures/interactive-dom.ts` (`installInteractiveDocument`,
`interactiveElement`, `elementText`) exactly as `tests/unit/ui/backup-hint.test.ts`
does. Named tests (these exact names are load-bearing — the negative-control
table references them):

- **"the change line names the running build and its hand-written line"**
- **"an empty change line renders no line at all"**
- **"the change line is rendered as text, never markup"**
- **"the update prompt offers a database backup before refreshing"**
- **"a failed backup keeps the refresh available and states the failure"**
- **"the update prompt writes no storage"** (inject a storage double whose
  `setItem` throws/records; assert zero calls anywhere in the path)
- **"a first install with no controller shows no update prompt"** (the
  `serviceWorkers.controller !== null` guard, `register-service-worker.ts:36-42`
   — currently unpinned)
- **"refreshing posts SKIP_WAITING once and reloads on controllerchange"**
  (also currently unpinned; the existing file only covers
  `serviceWorkerRegistrationUrl`)

**Browser — `tests/browser/pwa.spec.ts` (Chromium only, D109).** Add ONE test:
**"the update prompt offers a database backup without leaving the page"**.

- Boot with the existing readiness pattern (`#status` `data-ready="true"`, the
  helper shape used at `tests/browser/character-list.spec.ts:4-10`).
- **A disclosed affordance, and it needs a comment in the test explaining
  exactly this:** the dev server serves a NO-OP stub worker
  (`vite.config.ts:64-82`, `self.addEventListener('install', () => undefined)`),
  so a waiting worker cannot exist in the browser suite and the prompt cannot
  be revealed by a real update. The test therefore clears `hidden` on
  `#update-ready` itself and drives the real controls. It is a reveal, not a
  stubbed behaviour: the click, the RPC, the database, the export and the file
  are all real. Do not fake the export, the blob, or the download.
- Scope every locator to `page.locator('#update-ready')`. The character-list
  screen has its own `Download database backup` button
  (`import-backup-controls.ts:277`) and the footer is global — an unscoped
  `getByRole('button', …)` will match the wrong control on some routes.
- Assert: the download filename matches `/^srd-55-database-\d{4}-\d{2}-\d{2}\.sqlite3$/`
  (`Promise.all([page.waitForEvent('download'), …click()])`, the shape at
  `character-list.spec.ts:145-148`); the status text; `#refresh-update` still
  enabled; and that no navigation happened (a sentinel set on `window` before
  the click is still present after it).
- Assert in the same spec that on a plain load `#update-ready` is hidden and
  the change line is not visible.
- Assert the change line's text equals `Current build ${BUILD_ID}: ${BUILD_CHANGE_LINE}`
  by importing both constants from `src/build-id.ts` into the spec. That import
  is legal under process rule 2 — verify it yourself: `src/build-id.ts` is a
  bare constant module with no imports at all, so nothing `?raw` enters the
  node-side executable graph. Say so in your report.
- Leave the existing test **"links the install manifest, registers the worker,
  and reports refused persistence"** untouched.

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| The prompt offers a backup at all | `remove-backup-button`: drop the button from `index.html` | **"the update prompt offers a database backup without leaving the page"** |
| The backup is the whole database | `export-single-character`: call `exportCharacter` instead of `exportDatabase` | **"the update prompt offers a database backup without leaving the page"** (the `srd-55-database-*.sqlite3` filename assertion) |
| The offer never blocks the update | `disable-refresh-during-backup`: disable `#refresh-update` while the export runs, or leave it disabled after a rejection | **"a failed backup keeps the refresh available and states the failure"** |
| The line is keyed to the build id | `hardcode-change-line`: inline a literal in place of `BUILD_CHANGE_LINE`, and separately drop `BUILD_ID` from the rendered text | **"the change line names the running build and its hand-written line"** |
| A blank line renders nothing | `render-empty-change-line`: return `''` instead of `null` and reveal the element | **"an empty change line renders no line at all"** |
| The line is inert text | `set-change-line-innerhtml`: assign `innerHTML` instead of `textContent` | **"the change line is rendered as text, never markup"** |
| No storage (D95, and not D116's claim) | `persist-update-prompt-dismissal`: write a seen/dismissed key on show or on refresh | **"the update prompt writes no storage"** |
| The prompt needs a controller | `show-update-on-first-install`: drop the `serviceWorkers.controller !== null` guard | **"a first install with no controller shows no update prompt"** |
| Refresh still works | `swallow-skip-waiting`: stop posting `SKIP_WAITING`, or reload without waiting for `controllerchange` | **"refreshing posts SKIP_WAITING once and reloads on controllerchange"** |

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (20 at writing): Spec | Affected |
   Why — a bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44547`. Full
   vitest too. Paste real numbers — not "green", the counts.
4. Other lanes run suites concurrently; contention is the norm. Any test >1.5s
   alone gets a per-test timeout (`20_000`) with the MEASURED alone-time in a
   comment. **Never a config edit.**
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files) or seems infeasible as specified,
   STOP and report the finding — that is a correct outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted; the spec table; files
created/modified; negative-control candidates with exact test names; your
verification of the wiring-order claim in scope item 8; confirmation that
`src/build-id.ts` pulls nothing `?raw` into a spec's node graph; and — at full
length, not as a footnote — the incoming-build limitation as an owner question.
