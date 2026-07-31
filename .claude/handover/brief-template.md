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
