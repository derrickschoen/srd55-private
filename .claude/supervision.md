# Supervision standing rules

These are the rules the autonomous build loop runs under. They used to live only
in the `/loop` tick brief, which meant they were re-sent — and re-read, and
re-billed — on every single tick, and evaporated between sessions. They are
durable now. **The tick brief must point here, never copy from here.**

Pointers, not copies, for things that already have a home:

| What | Where it actually lives |
|---|---|
| Binding decisions and findings; **wins over every other file** | `.claude/decisions.md` |
| How to report (terse for reports, rich for questions) | `CLAUDE.md` § How to report |
| Never state a D&D rule from memory; the two-column SRD trap | `AGENTS.md` |
| Open questions for the owner | `.claude/pending-questions/` |

## Model policy

Delegate to codex `-p sol` (preferred), `-p sol-medium`, `-p terra` (fallback
only). Prompts **always** via stdin files, never inline. Opus is scarce.

**Codex out of credits → STOP LOUDLY.** Never substitute a Claude agent for the
codex role.

Sonnet is authorized for **KB lookups only**, as the second reader in
`kb_ask.py`. The reason is accuracy, not cost. Hard boundary: sonnet reads the
KB, sonnet decides nothing.

## Effort

**Default is `high`, globally, and that is deliberate.** Fable in particular
stays at `high`. Effort is decided per dispatch, not lowered as a blanket
policy.

`effortLevel` in `settings.json` is a **single global value** — there is no
per-model map (no `effortByModel` anywhere in the CLI). "Fable high, Opus
medium" cannot be expressed as a setting. The levers that do exist:

| Lever | Scope |
|---|---|
| `/effort <low\|medium\|high\|xhigh\|max\|auto>` | current session, interactive |
| `claude --effort <level>` | one launched process |
| `CLAUDE_CODE_EFFORT_LEVEL=<level>` | session-only, overrides settings, saves nothing |
| `Workflow` → `agent({effort})` | one subagent call |
| `Agent` tool | **no effort parameter** — inherits the session |

**On `claude-opus-5`, `medium` and `high` are the same configuration.** The
CLI's per-model effort table resolves both to an identical cell:
`{cell:"o5-bmin", modelEffort:"typed", finderBudgetHint:false,
measuredExternal:true}`. Only `low` (cell `low`), `xhigh` and `max` differ.
Measured across every local transcript, Opus 5 at medium (n=200) shows mean
output 1,197 tokens against high (n=16,558) at 1,060 — medium is not cheaper.
`claude-opus-4-8` is different: it has genuinely distinct cells per level.
Fable 5 is also genuinely graded — high mean 1,165, xhigh mean 2,649.

So: do not reach for `medium` on Opus 5 expecting a saving. It buys nothing.
The real levers are cadence, context size, and delegation.

## Cadence

The prompt cache TTL is **one hour**, measured from the last request. Measured
across 48,643 real inter-request gaps in this machine's transcripts: below
3600s the cache-miss rate is 0.7–4.6%; at 3600s and above it is 78% and median
`cache_read` drops to literally zero while `cache_write` jumps to ~331k.

`ScheduleWakeup` clamps `delaySeconds` to [60, 3600], so **every allowed delay
is inside the window** — but 3600 sits exactly on the cliff. Use **3300s** for
an idle heartbeat: maximum quiet, with headroom for jitter and for the tick's
own runtime.

Do not schedule short wakeups to poll harness-tracked work. Completion
re-invokes the loop automatically; a short poll is pure waste. Short delays are
only for external state the harness cannot see (CI, a deploy, a remote queue).

Caveat: in usage overage the TTL drops to five minutes. Re-measure before
trusting the number above if the account has gone into overage.

## Verification, non-delegable

Run the gates yourself and paste real numbers. Every load-bearing new assertion
gets a negative control: apply, **prove applied**, run, revert, **prove
restoration** by re-running.

- Compile gate is `npx tsc -p tsconfig.app.json --noEmit`. **Never** the root
  `tsconfig.json` — it is a solution file with `files:[]` and exits 0
  unconditionally, checking nothing.
- Never read an exit code through a pipe.
- One browser suite machine-wide, unique port, never vitest during one.
- One suite-running lane at a time.
- Fresh worktrees need `npm ci`.
- `git commit` always `-F msgfile`. Commit by **explicit path**.
- Python, not shell, for text checks — the shell mangles `**`, backticks and `$`.

## Forbidden paths to green

Never tune to pass. Budgets are law. No weakened assertions. No `.skip`,
`.todo`, `@ts-ignore`, `@ts-expect-error`, or `any`. No config edits to reach
green. Never delete a test to pass. **Never regenerate an expectation from our
own output.**

A validator that refuses everything is not a fix. A guard is proven by
executing it, never by a pasted claim.

## Hard stops

1. **Licensing (D59).** Copyrighted or derived content lives in the private repo
   only — never an artifact, never public. SRD 5.2.1 is CC-BY and is the
   exception. A public doc may state a licensing gate *outcome* but never the
   audit evidence.
2. **Destroying work.** History rewrite, force-push, bulk deletion.
   `.claude/decisions.md` is supervisor-only and append-only.
3. **Outward-facing actions.** Push, publish, send. Local commits are not
   outward-facing.

Data loss is **not** a stop condition (D60) — v1 has zero users. That does not
license shipping an export its own importer refuses.

Never commit into the owner's work repo while their index is loaded.

`KILL BY PID, NEVER BY PATTERN.` Owner codex PIDs 2764 and 2771 are never
touched. Never use `pgrep`.

## Failure lessons — all of them mine

1. **Pre-merge:** `git status --porcelain` zero, and the tip must contain a
   signature symbol from the fix.
2. Never read an exit code through a pipe.
3. Never state a D&D rule from recall. The two-column SRD defeats plain grep
   *silently* — and it defeated our own extractor the same way.
4. Sweep **all** files after correcting a claim; correct the governing copy first.
5. Never point a generator at a directory a lane owns.
6. **A mid-flight state is not a verdict. A completion notification is not a
   verdict either.**
7. Deletion proves absence; the failure that ships is a **well-formed wrong
   value**. A passing mutation can mean the test is vacuous.
8. Truncated listings are not evidence of absence. Nor is a missing object key.
9. **My validators over-refused five times**, every one caught only by a
   valid-case control. Every matcher change needs a lawful-payload accept case.
10. Kill by PID, never by pattern.
11. Measure the baseline yourself before briefing it.
12. Baseline a repo before dispatching into it.
13. **Skipped is not passed, and exit 0 lies.**
14. Never commit into the owner's work repo when their index is loaded.
15. Do not inflate the mistake register either.
16. Check whether the maintenance doc is teaching the defect.
17. A sandbox can fake a failure.
18. **A fix can introduce the inverse bug.** Round 7's alias fix began merging
    distinct pools. After every "we now reject X", ask what lawful thing is now
    wrongly rejected or merged.
19. A brief that is re-sent every tick is re-billed every tick. This file exists
    because of that.

## Roles (D5/D6)

Opus writes plans with the full assumption list, provable ones proven *before*
the plan is final. Independent review, cap 3 rounds — except new subsystems,
which are reviewed **until clean, no cap** (D247).

Pin the contract in the seam file (`src/builder/contracts.ts`). Production and
test agents work in parallel and neither owns the seam. Ratify the
implementer's value *before* tests are written, never after.

The supervisor gates, verifies and merges. That is never delegated.

## Merge ritual

worktree clean → full vitest (**read the verdict**) → `npm run build` →
Playwright on a unique port, expect 170 → codex review → `merge-to-main.sh` →
post-merge vitest → `git push mirror main` → prune.
