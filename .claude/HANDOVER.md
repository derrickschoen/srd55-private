# 2026-07-31 — HANDOVER: opus + sol finish v1 (rulings through D133)

ON APPROVAL, THE FIRST ACTION IS: copy this file to
`/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/HANDOVER.md`,
commit it, and from then on UPDATE THAT COPY after every merge, dispatch, gate
result, and owner ruling (gate ritual step 10 below). The repo copy is the
authoritative resume point when this session's credits run out; an incoming
Opus session starts by reading it top to bottom. This plan was dry-run-reviewed
by an Opus agent against the live repo; all 19 findings are incorporated.

Audience: an Opus-model supervisor ("opus"), with a second read-only Opus
agent ("sol") used only where this document says "sol pass". You are stepping
into a running machine. DO NOT redesign anything. Every decision is made and
written down; your job is dispatch, verify, merge, update the handover file,
repeat. HANDOVER CONVENTION for anything not covered here: take the reversible
option and record it in `.claude/handover/lane-state.md` as
"Taken for now: X. Seam: Y. Cost to flip: Z." — then keep going. Only the HARD
STOPS in §1 justify waiting for the owner.

## 0. Who does what — never deviate

- **codex implements** everything:
  `codex exec --sandbox workspace-write -C <worktree> - < <brief> > <log> 2>&1`
  (background). You never write production code or tests. Codex out of
  credits → STOP ALL WORK, tell the owner loudly, never substitute a Claude
  agent for the codex role.
- **You (opus) supervise**: briefs, gates, arbitration, merges, state files.
  Verification is NON-DELEGABLE. "codex reports green" and "I ran it" are
  different sentences — keep them different in every report.
- **sol** = one general-purpose agent, model=opus, read-only, only where
  named. Never spawn Fable/Mythos agents.
- **STUCK PROTOCOL (D136)**: no automatic strike limit. When you judge
  yourself stuck (a failed gate you cannot diagnose, contradictory specs, a
  re-dispatch that came back wrong again), do NOT loop: spawn opus + sol
  read-only agents with DIFFERENT lenses on the problem (one on the failing
  artifact, one on the spec/ruling chain), reconcile their analyses, then
  decide: continue, re-dispatch with a corrected brief, or stop that track
  with a full finding in HANDOVER.md while other tracks continue. D137: the
  whole queue including HA/CI is yours to attempt — no check-in gate.
- **The owner rules.** `.claude/decisions.md` is law and supervisor-only.
  Answers become the next D-number IMMEDIATELY: PREPEND the new entry under
  the file header (newest-first layout — never append at the bottom, never
  edit or delete an existing entry), byte-scan
  `python3 -c "assert b'\x00' not in open('.claude/decisions.md','rb').read()"`,
  commit it alone.

## 1. HARD STOPS and non-stops

STOP for: (1) LICENSING — never commit content we are not authorized to
redistribute; only what lands in git matters. (2) DESTRUCTION — history
rewrite, force-push, bulk deletion. (3) OUTWARD-FACING — push, publish,
deploy, tunnel, creating ANY remote repo or Cloudflare project. Per
D121/D127/D128: publish prep is built locally and STOPS; the owner's ngrok
sitting comes first; even at go, Cloudflare Git-integration auto-publish is
never wired.

NOT stops: local commits (commit at every green boundary), data-shape changes
(D110 holds until the owner announces the flip), questions that don't block
the unit in front of you.

FORBIDDEN PATHS TO GREEN: `any`, `@ts-ignore`, `@ts-expect-error`, `.skip`,
`.todo`, config edits (vite/vitest/playwright/tsconfig/package.json),
weakened assertions, deleting a test to pass (stated strict-superset
replacement is the only legal removal), regenerating an expectation from our
own output.

## 2. Exact state at handover

- main = `6a114de` (W-A+W-A2 merged). FLOORS: vitest 3,079 tests / 189 files,
  Playwright 88 tests / 20 spec files, build exit 0. Frozen: migrations
  0000–0025, wire v1–v16, and every existing `a7-v*` schema_version
  assertion in tests (see §3 step 4 for how that is checked).
- Worktrees (all on their own branch, sharing NOTHING at runtime — see §6):
  `~/PhpstormProjects/dnd-wt-attunement` = wt/attunement, THE MINT LANE
  (all migration/wire/backup/snapshot version mints, serial);
  `~/PhpstormProjects/dnd-wt-print` = wt/print; `~/PhpstormProjects/dnd-wt-pwa`
  = wt/pwa. All merges serial through you, via the script in §3.
- **wt/attunement is at `e0a9726` holding D91-M: implemented, ALREADY
  COMMITTED in-lane (a supervisor commit — codex never commits), UNGATED.**
  It owns migration 0026 (`class_resources` + `class_resource_formulas`,
  160 ladder + 18 formula rows). Codex CLAIMS (unverified): 191 files /
  3,117 vitest, 88/88 Playwright on port 44468, build 0. Read-only scans
  passed already; its `tests/browser/attribution.spec.ts` edits are
  legitimate contention timeouts.
- Session artifacts (THIS session's scratchpad —
  `/tmp/claude-1000/-home-vagrant-PhpstormProjects-dnd-multiclass-spells-static/e611bae3-1730-4d7f-9b3f-d95ddcc44739/scratchpad`
  — a path that will NOT exist for a fresh session): dispatch briefs
  (`<unit>-dispatch.md`, lowercase log names like `d91m.log` /
  `d91m-dispatch.md` — lowercased, hyphens dropped), 24 `mutate-*.py`
  saved-copy mutation scripts, `lane-state.md` (STALE — shows f6c8fcb/3070;
  Step 0 fixes this). Step 0 rescues what matters into the repo.
- Rulings D1–D133 recorded. Load-bearing for remaining work: D118 (Epic Boon:
  offer resolve-now AND proceed), D119 (unknown hit die → class option
  disabled; sole-class case → terminal `no_guideable_class`), D120+D123
  (formula resources; print shape-by-type), D122 (Letter paper), D124 (ONE
  flavor-share opt-in toggle + link-size error + URL-capacity experiment),
  D125 (print attribution fixlet), D126 (MIT + CC-BY split), D127
  (curated-squash public repo), D128 (ngrok localhost sitting), D129 (banner
  + noindex + build id), D130 (responsive pass in queue), D131 (second
  walkthrough script), D132 (issues on, PRs no), D133 (no homebrew classes —
  the HA design already keeps classes bundled-only; subclass authoring
  stays; D106 whole-queue gate stands).

## Step 0 — one-time setup (before ANY dispatch)

1. Copy this plan to `.claude/HANDOVER.md`; create `.claude/handover/` and
   move into it: a REWRITTEN `lane-state.md` (main 6a114de, floors
   3,079/189 + 88/20, in-flight table per §5), plus copies of these mutation
   scripts from the session scratchpad if it still exists (else skip — §3
   step 5 shows the pattern to recreate): `mutate-wa2-guideable.py`,
   `mutate-lu2-atomic.py`, `mutate-lu1-invent.py`. Commit.
2. Create `orchestration/merge-to-main.sh` (below), `chmod +x`, commit.
3. Baseline proof: on main, `npm run build` (unpiped exit), full
   `npx vitest run` (expect 189/3,079), full Playwright on
   **PLAYWRIGHT_PORT=44469** (expect 88). If any baseline number falls short,
   STOP and report — do not gate anything on a broken baseline.

```bash
#!/usr/bin/env bash
set -euo pipefail
BRANCH="$1"; MSG_FILE="$(readlink -f "$2")"
MAIN=/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static
[ -f "$MSG_FILE" ] || { echo "NO MSG FILE"; exit 1; }
cd "$MAIN"
[ "$(git rev-parse --show-toplevel)" = "$MAIN" ] || { echo "NOT MAIN TREE"; exit 1; }
[ "$(git rev-parse --abbrev-ref HEAD)" = "main" ] || { echo "NOT ON main"; exit 1; }
git rev-parse --verify "$BRANCH" >/dev/null || { echo "NO SUCH BRANCH"; exit 1; }
git diff --quiet && git diff --cached --quiet || { echo "DIRTY MAIN"; exit 1; }
BEFORE=$(git rev-parse HEAD)
git merge --no-ff "$BRANCH" -F "$MSG_FILE"
[ "$(git rev-parse HEAD)" != "$BEFORE" ] || { echo "NO-OP MERGE (Already up to date = you merged nothing)"; exit 1; }
LEFT=$(git log main.."$BRANCH" --oneline | wc -l)
[ "$LEFT" = "0" ] || { echo "CONTAINMENT FAIL: $LEFT commits unmerged"; exit 1; }
echo "MERGED $(git log --oneline -1)"
```

Why: the wrong-cwd self-merge ("Already up to date.") happened three times
this project. Never hand-merge a lane.

## 3. The gate ritual — run for EVERY finished dispatch, no step optional

1. Read codex's report: `tail -100 <log>` (log paths are recorded per unit in
   `.claude/handover/lane-state.md` at dispatch time — always absolute).
   Codex exited 0 with no answer → `codex exec resume --last` and tell it to
   stop reading and answer (flags go BEFORE `resume`; they are not
   inherited). Codex reporting an infeasible gate is a FINDING, not a
   failure — fix the brief or take it to the owner.
2. Touched-set check. Uncommitted lane: `git status --porcelain` must match
   the report's file list exactly. Already-committed lane (like D91-M):
   `git diff --name-only main...HEAD` against the report's Files section.
   Unexplained files = re-dispatch, never silent cleanup.
3. Commit lane work (you, not codex). If main moved since dispatch, merge
   main INTO the lane; resolve only mechanical conflicts (import unions,
   adjacent additions) yourself; semantic conflicts go back to codex with a
   brief quoting both sides.
4. Scans on the lane diff vs main, via a python script (never shell grep —
   quoting eats `$`, backticks, `**`):
   - forbidden regexes over ADDED lines only:
     `@ts-ignore|@ts-expect-error|\.skip\(|\.todo\(|:\s*any\b|\bas any\b`
   - config files untouched; no mint files outside the unit's declared mint
   - frozen migrations + historical wire modules: EMPTY diff
   - frozen snapshots: no test file may CHANGE an existing `a7-v*`
     schema_version assertion (python: collect `a7-v\d+` occurrences per
     file on both sides of the diff; existing occurrences must survive
     unchanged; only the minting unit may add the next one)
   - ?raw: walk each Playwright spec's import graph; only EXECUTABLE
     imports count — `import type` chains are stripped by Playwright and
     must NOT be flagged.
5. Personal gates in the worktree:
   - `npm run build` — exit read UNPIPED (never `cmd | tail; echo $?`).
   - `npx vitest run > <log> 2>&1; echo EXIT=$?` — numbers must meet-or-
     exceed the floor AND match the lane's claim; paste them.
   - ONE negative control minimum, saved-copy pattern
     (`.claude/handover/mutate-*.py` are the models): assert anchor
     count==1 → save copy → apply → assert applied → run the target test
     file → the NAMED test fails for the predicted reason → revert from
     copy → assert clean → re-run green. A mutation landing in a comment or
     an applied-check that didn't run proves nothing — verify the
     instrument before believing any result.
   - Full Playwright: `PLAYWRIGHT_PORT=<unit's port> npx playwright test
     --workers=1` (env var is PLAYWRIGHT_PORT — the TEST_PORT spelling
     silently uses default 4173, possibly against the wrong tree; verify
     the listener with `ss -ltnp | grep <port>` when in doubt).
5b. CODEX REVIEW (EVERY unit — D135): before merging, run a read-only codex
   review: `codex exec --sandbox read-only -C <worktree> -` with a brief
   saying "Review the diff `git diff main...HEAD` against <binding plan +
   amendments>. Critique from several perspectives. Report defects with
   file:line." Arbitrate by verification: legitimate findings become a fix
   dispatch (same unit, same lane); rejected findings recorded with reasons
   in lane-state. Cap 3 rounds per unit.
6. Contention: exactly one heavy test timing out while neighbors pass slowly
   AND another suite ran concurrently = contention. Re-run the FULL suite
   uncontended; a second failure is real. The remedy for a slow test is a
   per-test `, 20_000)` timeout with the measured alone-time in a comment —
   never a config edit.
7. Merge: `orchestration/merge-to-main.sh wt/<lane> <absolute msgfile>`.
8. Post-merge FULL vitest on main; paste numbers.
9. Fast-forward all idle lanes (`git merge --ff-only main`); never touch a
   worktree codex is currently using.
10. UPDATE `.claude/HANDOVER.md` (§2 state + §5 queue position) and
    `.claude/handover/lane-state.md`; commit them with the merge.
11. Report tersely: what codex did, what YOU verified (distinct), real
    numbers pasted. Findings against our own work — including your own
    mistakes — at FULL LENGTH, always.

## 4. Dispatch brief template

Copy the template exactly as it appears in `.claude/handover/`
(brief-template.md, created in Step 0 from the block below), fill every <>:

```
# DISPATCH <UNIT> — <title> (<size>, MINT|MINT-FREE)
You are working in /home/vagrant/PhpstormProjects/<worktree> (branch
<branch>, fast-forwarded to main <SHA>). `.claude/decisions.md` is law and
wins over every other guidance file.
THE BINDING PLAN is <design doc path, SECTION NUMBERS>. Implement exactly
<unit>. <adjacent units> are NOT yours.
AMENDMENTS TO THE BINDING PLAN (rulings newer than the doc — these WIN):
<list every D-ruling that supersedes any bound section, naming the exact
sections overridden — see per-unit notes in §5; never bind a section a
ruling has contradicted without stating the override>
FLOORS (never lower): vitest <N> exit 0 (<F> files), Playwright <P> exit 0
(<S> specs), build 0. Frozen: migrations 0000-<M>, wire v1-v<W>, existing
a7-v* snapshot assertions — vs merge base <SHA>. [MINT ONLY: you own
migration <M+1>/wire v<W+1>/backup v<B+1> as needed — verify the registries
still end at <M>/<W>/<B> before minting.]
## Scope
<numbered, concrete, quoting the design doc's mechanics — never paraphrase>
EXIT: <the design doc's exit criteria, quoted>
## Process rules (all mandatory)
1. Spec TABLE for all <S> Playwright spec files: Spec | Affected | Why —
   a bare list is a re-dispatch.
2. No Vite ?raw import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on PLAYWRIGHT_PORT=<port>. Full
   vitest too. Paste real numbers.
4. Any test >1.5s alone gets a per-test timeout (20_000) with the measured
   alone-time in a comment. Never a config edit. Other lanes run suites
   concurrently; contention is the norm.
5. No any/@ts-ignore/@ts-expect-error/.skip/.todo, no config edits, no
   weakened assertions, no deleting a test to pass (stated strict-superset
   replacements only), never regenerate an expectation from output.
6. Name a negative-control mutation per load-bearing new assertion, with
   the exact test name that fails.
7. The supervisor re-runs everything and merges. Do NOT commit.
Report: what you did, real numbers pasted, the spec table, files
created/modified, negative-control candidates with exact test names.
```

## 5. THREE PARALLEL TRACKS — worktree-per-track, isolated state

Isolation facts making full parallelism safe (§6 explains why): every
Playwright run creates fresh browser contexts, each with its OWN OPFS
database seeded from scratch at boot; every vitest integration file builds
its own fresh in-memory seeded database; worktrees are separate checkouts
sharing only CPU. Cross-lane interference is TIMING ONLY (handled by §3
step 6), never state. Port allocation: each unit line below carries its
port; never reuse a port while another suite may be live; baseline uses
44469.

### TRACK M — wt/attunement (mint lane; strictly serial; every unit here may mint)

M0. **Gate D91-M now** (port 44470). It is already committed in-lane, so
    start at §3 step 2 (already-committed variant), and note its log/brief
    live in THIS session's scratchpad as `d91m.log` / `d91m-dispatch.md` —
    if that path is gone, codex's claims are restated in §2 and the gate
    stands on YOUR runs alone. Negative control (dry-run-corrected — the
    originally named anchor does not exist): the parser's testability seam.
    `src/rules/class-resources-srd.ts:279`
    `parseSrdClassResourceManifest(source: string = classLevelTables)` —
    mutation inserts `source = classLevelTables;` (with a `// MUTANT`
    comment) as the FIRST statement of the function body, so injected test
    sources are ignored. That kills the named test
    `SRD class resource source parsers > negative control: Barbarian level 6
    Rage 4-to-5 breaks the pinned vector` (its injected 4→5 source becomes
    a no-op and `not.toEqual` fails). Do NOT mutate the test-side
    `expectedLadders` (illegal) or the SRD text file (kills a different
    test, `pins all eight sourced ladders and all 160 exact level rows`).
M1. **EXP-URL** (doc-only, no port, no mint): Chromium URL-capacity
    experiment per D124. Deliverable
    `docs/design/2026-08-01-share-url-capacity.md`: measured practical
    limits for `?param` vs `#fragment` share payloads (address bar, history
    API, in-app navigation), compressed-size table for a level-1 character
    and a level-12 caster with a 20,000-char backstory, recommended
    max-encoded-size constant with margin. Sol pass optional; supervisor
    verifies the measurements are stated as measured (not recalled) before
    merging.
M2. **FF-A** (mint; port 44480): D104 flavor persistence.
    Binding: `docs/design/2026-07-31-d104-flavor-fields.md` §4–§5, unit
    FF-A in §9. AMENDMENTS the brief must state: D124 replaces §5.2's
    verbatim/opt-in split — ONE share option ("include my written text")
    covers alignment/appearance/backstory/notes, default OFF; the share
    encoder returns a typed too-large refusal using EXP-URL's constant,
    surfaced as an explicit UI error, never a truncated link. Owns next
    free migration + backup version + wire version (verify registries
    first).
M3. **AR-A** (mint; port 44481): D99 archive persistence. Binding:
    `docs/design/2026-07-31-d99-archive-and-duplicate.md` §3–§4, unit AR-A
    in §8. No share-wire mint (the doc says so; hold codex to it).
M4. **HA-1** (mint; port 44482) then the CI/HA chain in the normative edge
    order of `docs/design/2026-07-30-homebrew-authoring-forms.md` **§11**
    ("Dispatches and dependency order", unit list + edges list): HA-1 →
    CI-3a → CI-3c → CI-3b → CI-3s → CI-4a → CI-4b → HA-2 → CI-5 → HA-3 →
    HA-4 → HA-5 → CI-6/7/8. Ports 44483 upward, one per unit. D133 note in
    every HA brief: classes stay bundled-only (already the doc's position —
    any drift toward class authoring is a scope error). BEFORE dispatching
    HA-2: ask the owner deferred question 1 (§7). BEFORE CI-5: deferred
    question 2.

### TRACK W — wt/print (wizard chain; serial within the track; all mint-free)

Binding plan for all: `docs/design/2026-07-31-level-up-wizard-route-ui.md`
(unit rows in §6, test tables in §7). EVERY brief in this track carries this
amendments block verbatim: "LU-W §8 OQ-1/OQ-2 are CLOSED by D118/D119.
D118: a deferred Epic Boon renders READY state with a visible choice —
resolve now, or proceed to the next level (state already exposes both;
`pending_epic_resolution` member). D119: a class option with unknown hit die
is `guideability: 'disabled'` with its explanation and no selection control
(see `src/queries/level-up-state.ts` merged behavior); a character whose
ONLY classes are disabled is the terminal `no_guideable_class` panel. §4.2's
'HP change unknown' sentence is SUPERSEDED for the missing-hit-die case —
that class never reaches Gains; the W-HP-UNKNOWN test row now covers only
non-hit-die missing inputs."

W1. **W-B1** (port 44471): route shell, Class, Gains, Subclass. Bind §3.1,
    §3.3, §3.4, §4.1–4.3 + unit row W-B1 + test rows W-ROUTE-EXACT,
    W-STEP-SOURCE, W-HP-UNKNOWN (narrowed as above), W-FOCUS.
W2. **W-B2** (port 44472): Feat/ASI + Epic cards (17-card renderer, D118
    choice surface). W3. **W-C** (port 44473): LU-2 projection + rollback
    preview — dedicated `level-up-preview` worker handler, identity-sentinel
    rollback copied from the precedent at `src/sharing/character-share.ts`
    (the LU-W doc's §2 assumptions table row "P27" cites the exact lines);
    never calls commands.execute; ALSO hand-author the
    `ACCEPTANCE_WIZARD_2_CHOICES` oracle (LU-2 is merged; provable now).
W4. **W-D** (port 44474): planned Skills/Expertise/Spells UI.
W5. **W-E** (port 44475): review, atomic confirm, complete.
W6. **W-F** (port 44476): entry points + the D112 walkthrough item-3
    extension per LU-W §7.4 EXACTLY (HP 9→16 oracle, Arcana Expertise +5,
    revision +1, reload) — bar item 3 closes here.

### TRACK S — wt/pwa (mint-free side units, in this order unless blocked)

S1. **D91-R** (port 44477): resource computation/sheet/print. Bind D91 doc
    §4–§6 for mechanics and **§7 Unit R** for scope/exit. AMENDMENTS the
    brief must state: D122 — this unit adds `size: letter` to the existing
    `@page` rule in `src/ui/screens/print/styles.css`. D123 REPLACES the
    30-box threshold EVERYWHERE it appears in the doc — §2.5, §5.1's
    `maximum <= 30`/`> 30` branch, §6's large-point-pool test row, §7's
    Unit R steps — with shape-by-type: boxes at EVERY level for
    rage, channel_divinity, wild_shape, second_wind, favored_enemy,
    bardic_inspiration, action_surge, indomitable, uncanny_metabolism,
    persistent_rage_recovery, divine_intervention,
    wild_resurgence_conversion, nature_magician_conversion, paladins_smite,
    faithful_steed, tireless, natures_veil, stroke_of_luck, innate_sorcery,
    sorcerous_restoration, magical_cunning, contact_patron;
    `Remaining: ____ / N` at EVERY level for the three point pools:
    lay_on_hands, sorcery_points, and focus_points (owner-ruled D134).
    Note: uncanny_metabolism and sorcerous_restoration are 1-use RESTORE
    gates, not the pools they refill — they stay on the boxes list.
S2. **FIX-ATTR** (port 44478): D125. (a) `src/build-id.ts` exporting a
    checked-in constant (e.g. `srd55-2026-08-01`), bumped by hand at each
    publish — NO vite config edit, NO define, NO env plumbing; (b) printed
    sheet gains a final print-only notice block: the same SRD attribution
    text `/legal` renders, plus "Printed from SRD-55 <build id>"; (c)
    `src/ui/screens/legal/legal.ts` — correct the sentence claiming spell
    rules text comes only from user imports (spell text is bundled SRD
    5.2.1 per D43/D45); (d) `reports-and-print` browser proof: notice
    prints, screen sheet does NOT show it. Control: remove the notice
    block → named test fails.
S3. **RESP-1** (port 44484): D130 responsive pass, guided builder + sheet
    usable at 390px; the planner's existing 70/48/34rem breakpoints are the
    pattern; browser tests at a phone viewport.
S4. **BANNER** (port 44485): D129 — persistent "Pre-alpha. Updates can
    break saved characters. Export a backup." banner; build id in footer
    (reuse S2's); `public/robots.txt` disallow + noindex meta; removed only
    at the owner-announced D60 flip.
S5. **FF-B/FF-C/FF-D** after FF-A merges (D104 doc §9; ports 44486-88).
S6. **AR-B/AR-C/AR-D/AR-E** after AR-A merges (D99 doc §8; ports 44489-92).
S7. **HA-6..HA-9 forms** after their backends merge (HA doc §11; ports
    44493+). If Track S backs up, create a FOURTH worktree
    (`git worktree add ~/PhpstormProjects/dnd-wt-forms -b wt/forms main`) —
    D105 allows as many as needed; register it in the handover state file
    with its own port range (44500+).
S8. **WALK-2** LAST (port 44499), after HA-7 + AR-D + D91-R: the D131
    second walkthrough — author a species in the form, build a character
    with it, archive, duplicate, print — hand-authored expectations only.

### Gate (D106) and publish prep

Queue drained + BOTH walkthrough scripts green (D112 + D131) → build the
publish-prep set: LICENSE (MIT + explicit docs/srd/** CC-BY-4.0 statement,
D126), README (what SRD-55 is, D109/D130 support statement, local-data
disclosure, attribution), CONTRIBUTING + issue template (browser + build id
+ steps; PRs not accepted with the one-paragraph why; D132),
`orchestration/publish-squash.sh` (fresh tree: code + docs/srd + user-facing
docs ONLY — no .claude/, no orchestration/, no progress/, no internal design
docs, no history — as ONE initial commit; D127), `orchestration/sitting.sh`
(build + serve dist locally + print a checklist mirroring D112's items plus
the KNOWN-ABSENT list: no current-HP tracking D88, no languages/tools D102,
no wizard multiclass D107, no XP D88, no class authoring D133). Then report
the gate is reached and STOP (D121/D128). Repo creation, tunnel, deploy:
owner-triggered only.

## 6. Database isolation (why parallel suites are state-safe)

- Browser (Playwright): the app's SQLite lives in OPFS inside each browser
  profile; Playwright creates fresh contexts per test run, so every suite
  execution boots an empty OPFS, runs migrations 0000–current, and seeds
  bundled content from scratch. Two suites in two worktrees touch two
  disjoint throwaway profiles. Port uniqueness is only about dev servers.
- vitest integration: each test file constructs its own in-memory database
  via the shared helpers (fresh migrate + seed per file). No files on disk.
- Therefore: NEVER share a port between live suites, ALWAYS expect timing
  contention (§3 step 6), and NEVER conclude cross-lane state corruption —
  there is no shared state to corrupt.

## 7. Owner questions — protocol and queued items

Ask context-rich via AskUserQuestion (terse is for reports, never for
questions); record answers as D-numbers immediately (prepend; §0). Queued:
1. At HA-2 dispatch: homebrew publish lifecycle — may an author delete
   unreferenced published content, and does the fix-review screen get an
   explicit "apply to all listed characters" action? (Design: no deletion,
   per-character review only.)
2. At CI-5 dispatch: D81 export scope — reference closure vs whole local
   library (the CI design flags its own reading as resting on one word).
3. When upstream SRD moves (not before): errata semantics — in-place with
   D95-style notices vs version-pinned coexistence.

## 8. Trap encyclopedia (every one fired for real; know the signatures)

- "Already up to date." on a lane merge → wrong cwd or nothing to merge;
  the script now hard-fails on it. Never hand-merge.
- `cmd | tail; echo $?` → tail's exit, not the command's. Redirect to a log.
- PLAYWRIGHT_TEST_PORT → wrong env name; suite runs port 4173, possibly the
  wrong tree. It is PLAYWRIGHT_PORT; check the listener when in doubt.
- One heavy timeout during concurrent suites → contention; full uncontended
  re-run before believing it (it cleared W-A2's gate exactly this way).
- ?raw flagged in a spec chain → check for `import type` before acting.
- Codex 0-exit with no answer → resume the session; flags BEFORE `resume`.
- Codex blocked with "cannot lock ref … Read-only file system" on a git
  command → NEVER instruct codex to run git merge/branch ops in a worktree:
  worktree metadata lives under the MAIN repo's .git/worktrees/, outside its
  sandbox. The supervisor fast-forwards BEFORE dispatch; briefs say "already
  fast-forwarded — do not run git merge/branch commands".
- A negative control that "proves" robustness → verify the mutation landed
  in executed production code and the applied-assert ran; a control aimed at
  a test-side expectation or a comment is aimed at nothing (the original
  Step A control in this very plan had that defect — found by dry-run).
- python-edited decisions.md → byte-scan for NULs before committing.
- Codex numbers ≠ your numbers → floors are meet-or-exceed AND match the
  lane's claim; any shortfall is investigated, never hand-waved.

## 9. Verification of the handover itself

Step 0.3's baseline (build + vitest + Playwright on 44469 matching §2's
floors) is the proof the incoming supervisor's machine works. If the
baseline fails in a way this document does not explain, report to the owner
instead of improvising. After Step 0 and the D91-M gate (M0), the machine is
in steady state: three tracks, dispatch-gate-merge-update, until §5's gate
section says STOP.
