# DISPATCH BROWSER-PROBE — capability probe + honest non-Chromium notice (M, MINT-FREE, wt/hyg2, PLAYWRIGHT_PORT=44536)

You are in /home/vagrant/PhpstormProjects/dnd-wt-hyg2 (branch wt/hyg2).

**THERE IS NO DESIGN DOC. THIS BRIEF IS THE SPEC.** Do not go looking for one
under `docs/design/` and do not write one. `.claude/decisions.md` is law and
wins over every other guidance file; the ruling below is the whole of the
owner's instruction and is quoted in full so nothing is paraphrased.

## THE BINDING RULING — D153, quoted verbatim from `.claude/decisions.md`

> ## D153 — OWNER: target iOS Safari; probe + banner for the rest (2026-08-01)
>
> Owner's words: "Can we make the app work on iOS Safari as well? (probe+
> banner for Firefox and others)". Ruling as taken: iOS Safari becomes a
> SUPPORT TARGET pending a local WebKit feasibility spike — the supervisor
> runs the existing Playwright suite under the WebKit engine (a local run,
> nothing outward; the project addition to playwright config is owner-ordered
> scope, not a forbidden path-to-green edit) and reports what breaks. If
> feasible, WebKit joins the tested matrix for core flows (amends D109's
> chromium-only) and the iOS story is documented as install-to-home-screen
> plus backup exports (Safari's 7-day eviction exemption). Every OTHER
> non-Chromium browser gets a boot-time capability probe + honest banner
> ("tested only in Chromium/WebKit; your browser may not work and may lose
> data") with a proceed-anyway path. A silent broken page is outlawed (D33).

BOUND: the last two sentences only — the boot-time capability probe, the
honest notice, the proceed-anyway path, and D33's outlawing of a silent
broken page.

NOT YOURS — every other clause of D153 and every adjacent unit:

- **The WebKit feasibility spike is the SUPERVISOR's** (lane-state: "D153
  SUPERVISOR TASK … next quiet browser slot"). You add NO `webkit` project to
  `playwright.config.ts`. You touch no Playwright/vite/vitest/tsconfig/
  package.json file at all. The owner-ordered config scope in D153 is the
  supervisor's grant, not yours.
- **The iOS support story** (install-to-home-screen, the 7-day eviction
  exemption, any documentation of Safari) is downstream of that spike. Not
  yours, and see AMENDMENTS for what your strings may not say.
- **BANNER** (D129 pre-alpha banner + build id in footer + robots/noindex, in
  wt/pwa, brief `banner.md`) is a DIFFERENT banner and a different unit. If its
  markup is already in your merge base, sit alongside it and modify none of it;
  if it is not, do not build it. Your notice is not the pre-alpha line.
- **RESP-1** (responsive pass), **P0–P7** (party storage; P5 owns
  `src/ui/screens/party/`), **W-C/W-D/W-E/W-F** and **W-MC-1..6** (wizard),
  **SS-1..5** (spell section), **FF-A/B/C/D** (flavor), **AR-\***, **HA-\***,
  **CI-\***, **DOC-C/DOC-L**, **SUBCL-SEED** (D151), **compact-print** (D159),
  **EXP-URL**, **HYG-2/HYG-3** (the measured-timeout hygiene work this
  worktree previously carried) — none of them are yours. Do not annotate a
  timeout you did not measure in this unit's own run.
- The worker's **degraded-boot recovery path** (`src/worker/boot.ts`,
  `DEGRADED_SAFE_METHODS`, `schema_mismatch`) already exists and is correct.
  You add a notice in front of a browser that cannot store at all; you do not
  rewrite, re-route or absorb the schema-mismatch story.

## AMENDMENTS — rulings that govern this unit, and how they interact

There is no design doc for a ruling to postdate, so this is the full ruling
stack. Where two rulings pull, the resolution below is binding.

- **D153 amends D109** ("browser matrix is CHROMIUM ONLY, TESTED … Firefox/
  Safari/mobile are explicitly unsupported") only to the extent of adding the
  probe and the notice, and — CONDITIONALLY, pending the spike — WebKit to the
  tested matrix. **The spike has not run.** Therefore: the strings you ship
  name **Chromium only**. D153's parenthetical says "Chromium/WebKit"; that
  half is not yet true, and shipping it would be a promise the project cannot
  keep. **The banner text must not promise iOS or Safari support**, must not
  name WebKit as tested, and must not mention install-to-home-screen. Put the
  WebKit/iOS wording variant in a single named constant with a comment naming
  D153's pending supervisor spike, unreferenced by any branch. `BROWSER-PROBE-NO-IOS-CLAIM`
  is the test that keeps it honest.
- **D33 ("a DISCLOSED wrong number is still a wrong number") is the reason
  this unit exists** — D153 cites it. A page that boots into a store it cannot
  write, or a page that shows a spinner forever because the probe never
  answered, is the silent broken page D33 outlaws. Honest-and-stated beats
  quiet-and-plausible every time here.
- **D95 ("warnings are PERMANENT — no acknowledgment state") constrains
  D153's proceed-anyway path, and this is the sharpest reading in the brief.**
  D95: "Full size for as long as the condition holds… Zero warning-state
  storage. A warning leaves only when its condition stops being true."
  RESOLUTION: **proceed ≠ dismiss.** "Continue anyway" releases the boot hold
  and nothing else. The notice STAYS on screen at full size afterwards. No
  localStorage/sessionStorage/IndexedDB/cookie/in-memory acknowledgment is
  written, and a reload re-probes and re-shows. The only thing that removes
  the notice is the condition becoming false (see scope 6, late-ok).
- **D108 (a11y = keyboard + labels, no audit)** applies to the one control you
  build: a real focusable `<button>`, a labelled region, a status announcement
  that does not rely on colour.
- **D110/D129** — pre-alpha data-loss tolerance holds; your notice is about a
  browser that may lose data, which is a different claim from D129's "updates
  can break saved characters". Both may be true at once; neither absorbs the
  other.
- **D98** (`navigator.storage.persist()` with HONEST UI when refused) is the
  in-repo precedent for exactly this shape — `src/pwa/storage-persistence.ts`
  returns `granted | refused | unavailable` and `persistentStorageLabel`
  turns it into a sentence. **Follow it; do not invent a second idiom.** It is
  also NOT a substitute for your probe: `persist()` says nothing about whether
  a sync access handle can be opened.
- **D130** (Chromium on ANY viewport) means the notice must not break the
  responsive layout; it is chrome, not a modal takeover.

## MINT-FREE

You mint nothing: no migration, no share-wire version, no character-backup
document version, no character-state snapshot version, no schema change. Every
frozen artifact in lane-state.md shows an EMPTY diff vs your merge base. If
your work appears to need a table, a column, a version or a config edit, that
is a dispatch error — STOP and report (process rule 6).

## FLOORS

**Read `.claude/handover/lane-state.md` IN THIS WORKTREE after the supervisor's
fast-forward — it governs.** Do not copy numbers out of this brief; there are
none here on purpose, because this brief was written while the cascade was
still merging and any number in it would be stale by dispatch time. Meet or
exceed every floor there: vitest tests/files, Playwright tests/specs, build 0,
migrations, wire versions, existing a7-v* assertions. Your unit ADDS one
Playwright spec file, so your Playwright spec count is the floor's + 1 and your
test count strictly exceeds the floor.

## Scope

1. **`src/pwa/browser-capability.ts` — the decision module. It reads no
   user-agent string, ever.** It exports a closed union of probe outcomes —
   `'available' | 'unavailable' | 'probe-failed'` — and an exhaustive
   classifier with **no `default:` arm** (the repo's standing idiom; see
   `persistentStorageLabel`'s exhaustive switch). It owns the deadline logic
   and takes the probe as an INJECTED port, so unit tests drive every arm
   without a browser. No DOM, no `navigator`, no `window` in this file.
2. **The probe itself runs in a WORKER and exercises the real capability.**
   Presence-checking `'storage' in navigator` or `typeof
   FileSystemFileHandle.prototype.createSyncAccessHandle` is a lie detector
   that fails open — engines have shipped the property without a working
   handle. The probe must: get the OPFS root, create a file, **open a sync
   access handle**, close it, and remove the file. Anything thrown, rejected
   or absent is a failure.
   - It runs in a **dedicated, tiny probe worker** — the `new
     Worker(new URL('./…', import.meta.url), { type: 'module' })` form already
     in `src/main.ts:34` — and it **must not** be a method on the sqlite
     worker (`src/db/worker.ts`). Reason, and it is the load-bearing one: the
     sqlite worker's `initialize()` awaits `sqlite3InitModule()` and
     `installOpfsSAHPoolVfs` (`src/db/worker.ts:29-33`), which is precisely
     the thing that fails or hangs on an unsupported engine. A probe that
     waits on it can only report after the failure it exists to pre-empt.
     Your probe imports no sqlite wasm.
   - It uses its **own directory** (e.g. `/srd55-capability-probe/`) and
     removes it. It must never touch `/dnd-multiclass-spells-sahpool` or
     `/dnd-multiclass-spells.sqlite3` (`src/db/worker.ts:25` and `:32`) — writing
     into the pool's directory while the pool is installing is a real
     corruption hazard, not a hypothetical one. `BROWSER-PROBE-TOUCHES-NO-DB-FILE`
     asserts the paths.
3. **Two arms, one ordering rule, and the rule is the invariant.**
   `notice = probeFailedOrUnavailable || engineNotKnownTested`.
   - Arm A (**primary, capability**): outcome is `unavailable` or
     `probe-failed` → notice, and boot is HELD (scope 5).
   - Arm B (**untested engine**): outcome is `available` but the engine is not
     a recognised-tested one → notice, boot is **not** held; the app starts
     normally.
   - **The invariant: no user-agent value may ever suppress a notice.** UA may
     only ADD one (arm B) and choose wording. A UA claiming Chrome with a
     failed probe still shows the notice. That is `BROWSER-PROBE-UA-NEVER-SUPPRESSES`,
     and it is the test that makes "capability first" mean something.
4. **`src/pwa/browser-support-notice.ts` — the ONLY module in `src/` permitted
   to read `navigator.userAgent` or `navigator.userAgentData`,** and only to
   choose a noun for the wording and to feed arm B's engine check. Enforce
   that structurally with a greppable test in the exact style of
   `tests/unit/source-is-greppable.test.ts`: no other file under `src/`
   introduces a UA read, and `browser-capability.ts` contains none.
   Write it as a rule over the decision module, not a filename allowlist.
   - Markup: a container in `index.html` **outside `#app`**, next to the
     existing `#persistence-status` block — the file already states why
     (screens replace the children of `#app` whenever they redraw). Mirror the
     existing shape: `role="status"`, `hidden` until needed, and a
     `data-browser-support-state` attribute carrying the arm, exactly as
     `data-persistence-state` does today. That attribute is what the browser
     spec asserts on.
   - D108: a real `<button type="button">` for Continue anyway, reachable and
     activatable by keyboard, with a visible accessible label; the state is
     legible from text and the data attribute, never from colour alone.
   - Unit-test it through `installInteractiveDocument()` in
     `tests/fixtures/interactive-dom.ts` (or `tests/fixtures/minimal-dom.ts`
     if that is the closer fit).
5. **The boot hold, and the two things it must never break.** In arm A,
   `startApplication()` is not called until Continue anyway is pressed; the
   loading shell is replaced by the notice, never left as a spinner.
   - **`/legal` is never held.** `src/main.ts` already exempts it at
     `src/main.ts:194-206` ("The licence route reads nothing from the database,
     so it must not wait for one") — that exemption survives your change intact.
   - **`routeFooterLinks` still runs during module evaluation**, ahead of any
     gate, for the reason the comment at `src/main.ts:88-111` gives at length (the call is `src/main.ts:173`).
     Do not move it behind the probe.
   - The existing `system.info().catch(…)` status-text path stays. You ADD a
     notice; you do not delete or weaken the failure text that exists.
6. **A hard failure of the probe still shows the notice, never a dead screen.**
   Three failure shapes, all of which land on the notice: the probe throws;
   the probe worker fails to construct or errors; **the probe never answers**.
   The last one is a bounded deadline. Requirements:
   - Measure the probe's real completion time yourself, in dev (the Playwright
     server runs `npm run dev`) and against `npm run build`; put BOTH measured
     numbers in the comment beside the constant. Do not pick a round number
     and call it conservative.
   - **Late-ok withdraws.** If the deadline fires and the probe subsequently
     resolves `available`, the notice is removed and the hold released
     automatically — the condition stopped being true, which is the only exit
     D95 allows. `BROWSER-PROBE-LATE-OK-WITHDRAWS`.
7. **Wording.** Shipped strings say Chromium and nothing more (see
   AMENDMENTS). They state the risk in plain words — untested here, may not
   work, may lose data, keep exports — and the Continue-anyway control never
   claims it will work. Arm A and arm B get DIFFERENT sentences: arm A knows
   the browser cannot open the store; arm B only knows it is untested.
   Conflating them would be a disclosed wrong statement (D33).
8. **The test seam is DEV-only and provably absent from `dist/`.** The
   injected-failing-probe seam (scope 9) is gated behind `import.meta.env.DEV`
   — the same gate the AI bridge uses at `src/main.ts:187` — and its sentinel
   literal is added to the forbidden-literal list in
   `tools/assert-dist-clean.mjs`, which reads the shipped bytes and is chained
   into `npm run build`. That file is a tools script, not config; extending its
   list is in scope and is the whole point of it existing. Report the scan's
   pasted output. `BROWSER-PROBE-SEAM-DEV-ONLY`.

## Playwright coverage — the seam is the requirement, not an implementation detail

New spec `tests/browser/browser-support.spec.ts`. **Drive the probe-failure
path through the injected seam of scope 8, never by breaking OPFS for the
suite.** Concretely forbidden: deleting or redefining
`createSyncAccessHandle`/`getDirectory` on a prototype for the whole run,
anything in a shared `beforeEach` that outlives your spec, any global fixture,
any config edit. The legal precedents for a scoped injection are
`tests/browser/pwa.spec.ts:4-10` (`addInitScript` + `defineProperty`, per-spec)
and `tests/browser/sharing.spec.ts:15-27` (`window.__nativeShareCalls`). Cases:

| Case | Assertion |
|---|---|
| Chromium, no seam | notice absent, `#status` reaches `data-ready="true"`, boot unchanged from today |
| Seam: probe reports unavailable | notice visible with the exact arm-A sentence, `data-browser-support-state` set, boot held |
| Seam: probe never resolves | notice appears within the measured deadline; no spinner-forever, no blank `#app` |
| Continue anyway | keyboard-reachable, activating it starts the app, **and the notice is still on screen afterwards** (D95) |
| Reload after Continue | notice is back, boot held again — no stored acknowledgment |
| Seam: UA spoofed to Chrome + failing probe | notice still shown |
| Seam: UA spoofed to a non-Chromium engine + passing probe | arm-B notice, app boots normally |
| `/legal` under a failing probe | the licence route still renders |

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| Chromium is untouched | make the classifier return `probe-failed` for a passing probe | `BROWSER-PROBE-CHROMIUM-SILENT` |
| A failed probe is never silent | return early without rendering when the outcome is `unavailable` | `BROWSER-PROBE-FAILS-SHOWS-NOTICE` |
| A hang is not a dead screen | remove the deadline and await the probe unconditionally | `BROWSER-PROBE-HANG-NOT-DEAD-SCREEN` |
| Late success withdraws the warning | leave the notice mounted after a post-deadline `available` | `BROWSER-PROBE-LATE-OK-WITHDRAWS` |
| Capability outranks UA | let a Chrome-shaped UA short-circuit the decision before the probe outcome is read | `BROWSER-PROBE-UA-NEVER-SUPPRESSES` |
| UA lives in one module | add a `navigator.userAgent` read to `src/pwa/browser-capability.ts` | `BROWSER-PROBE-CAPABILITY-FIRST` |
| Untested engines are told | drop arm B and warn only on probe failure | `BROWSER-PROBE-UNTESTED-ENGINE-NOTICE` |
| Proceed is a real path | render the notice with no Continue control, or leave the hold in place after activation | `BROWSER-PROBE-PROCEED-ANYWAY` |
| Proceed is not dismiss | hide the notice on Continue, or persist the choice across a reload | `BROWSER-PROBE-NO-DISMISS-STATE` |
| No iOS/WebKit promise | swap in D153's literal "Chromium/WebKit" string, or add an iOS sentence | `BROWSER-PROBE-NO-IOS-CLAIM` |
| Keyboard-operable, labelled | replace the button with a click-only `<div>`, or drop its label | `BROWSER-PROBE-KEYBOARD` |
| Probe touches no database file | point the probe at `/dnd-multiclass-spells-sahpool` | `BROWSER-PROBE-TOUCHES-NO-DB-FILE` |
| Seam never ships | remove the `import.meta.env.DEV` gate from the seam | `BROWSER-PROBE-SEAM-DEV-ONLY` (and `npm run build` exits non-zero) |
| Exhaustive classifier | add a `default:` arm to the outcome switch | the `tsc`/build no-fallthrough proof named in your report |

## Process rules (all mandatory)

1. **Spec TABLE for ALL Playwright spec files in your tree** (count them
   yourself after the fast-forward; lane-state's spec count is the floor):
   Spec | Affected | Why. A bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on **PLAYWRIGHT_PORT=44536**. Full
   vitest too. **Paste real numbers.** Other lanes run suites concurrently —
   contention is the norm. Run ONE full vitest at a time and one Playwright
   suite at a time; lane-state records that two full vitest suites contend
   with each other exactly as Playwright suites do.
4. Any test over 1.5s alone gets a per-test timeout (`20_000`) with the
   **measured alone-time in a comment**. Never a config edit.
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`,
   no config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset
   replacement is the only legal removal), never regenerate an expectation
   from our own output — expectations are hand-reviewed values.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails. The table above is the starting set, not the
   ceiling.
7. If the scope seems to require touching a forbidden area (a frozen artifact,
   any config file, another unit's files) or seems infeasible as specified,
   STOP and report the finding — that is a correct outcome.
8. Do NOT run git merge/branch/checkout. The supervisor re-runs everything and
   merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted (vitest, Playwright, build,
`assert-dist-clean`); the spec table; the two measured probe times and the
deadline you set from them; files created/modified; negative-control
candidates with exact test names; and any place where D153's text and the
shipped strings had to differ, named explicitly rather than quietly resolved.
