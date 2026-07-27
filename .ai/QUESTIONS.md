# Questions — INDEX ONLY

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

## This file holds no questions. It points at the two places that do.

There were already two homes for questions before `.ai/` existed, both tracked
in git:

| Where | What it holds |
|---|---|
| `.claude/pending-questions/*.md` | The OPEN ones, with the evidence gathered for each |
| `.claude/decisions.md` | The CLOSED ones — every `Q<n>` is closed inside the `D<n>` that answers it |

A third home would be the collision this library exists to avoid, so this file is
an index and nothing more. **Do not write a question here. Write it in
`.claude/pending-questions/` and add a row below.**

`.claude/plans/` and `.claude/assumptions/` get the same treatment: linked, never
mirrored.

---

## Open

| Id | One line | Lives in |
|---|---|---|
| Q4 | How a weapon's "other properties" is stored. Recommendation being followed: known toggles plus free text | [`.claude/pending-questions/e611bae3-overnight.md`](../.claude/pending-questions/e611bae3-overnight.md) § Q4 |
| Q5 | A standing invitation to revisit anything the overnight consensus decided. Each entry in `decisions.md` names its evidence and its rejected alternative | same file, § Q5 |
| Q7 | `tests/browser/attribution.spec.ts:36` — `expect(loads).toBe(1)` intermittently receives `2`. Disclosed, not suppressed: no retry, no skip, no loosened assertion. F5 recorded it as UNATTRIBUTED; worktree port contention is the only condition it has since reproduced under, and `PLAYWRIGHT_PORT` is the mitigation | same file, § Q7 |

## Closed, and where the answer is

| Id | Closed by |
|---|---|
| Q1 | D12, D16 — claude-only bridge built and merged; codex dropped entirely, not gated (F2) |
| Q2 | D11 — yes, a share link may carry a selection the builder would not let you make by hand |
| Q3 | D9 — pruned, and there were EIGHT tables, not seven |
| Q6 | D11 — derivable sheet core first; the builder blocks, the boundary tolerates |
| Q8 | Implementation on `feat/portability` — weapons survive backup, share and snapshot. **The lesson is [RECIPES.md](RECIPES.md) §3** |
| Q9 | D24 — the character sheet exists and its inputs persist |
| Q10 | D23 — subclasses import |

## Other open items, not questions

| What | Where |
|---|---|
| The three audit findings D8 accepted as real and QUEUED rather than fixed — quadratic audit walk, audit accepts unrestorable snapshots, `auditCharacterOwnership` is currently theatre on the production path | `.claude/decisions.md` D8 |
| F8's recommended first move — drop the Laravel declared-type mimicry in `db/schema/columns.ts`, which is what degrades 223 columns to `z.any()` to protect a goal D7 retired | `.claude/decisions.md` F8 |
| Assumption registers | `.claude/assumptions/` |
| Plans | `.claude/plans/` |

## How to close one

Answer it in `.claude/decisions.md` as part of the decision that resolves it —
that is the binding record. Then move its row from Open to Closed here, and mark
the section in `.claude/pending-questions/` as resolved with a pointer to the
decision. The existing files show the convention: a `## Qn — RESOLVED <date>:
<one line> (see Dn)` heading with the original text kept underneath for the
evidence it gathered.
