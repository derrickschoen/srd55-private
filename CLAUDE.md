# Working on this project

**The project guidance is in [AGENTS.md](AGENTS.md). Read it.**

This file is a pointer, not a copy, and deliberately so. Guidance duplicated
across two files drifts — that happened in this project's own tooling, where a
protocol was maintained in two places until two independent reviews called the
duplication a collision risk and it had to be consolidated. One source, one
place to change.

The two things AGENTS.md says that most change how you should work here:

1. **This is a PRE-ALPHA project — bias towards replacing code rather than
   accommodating it.** Deleting previous work is welcome when the result is
   better. What that does *not* license: deleting a test to reach green,
   regenerating an expectation from our own output, or losing user data.
2. **Describe the rules engine in the type system**, so a wrong program fails to
   compile rather than producing a plausible wrong number.

Before changing anything, read `.claude/decisions.md`. If it disagrees with any
guidance file, **the decisions file wins**.

## How to report

This rule had no home until now. It lived only in the ephemeral cron brief, so
it evaporated between sessions and drifted within them — which is how it ended
up here rather than being a copy of something.

**Reporting on work is terse. Answering a question is not.**

A report — what a dispatch did, what a gate returned, what got merged — is:

- what codex did
- what Claude verified **itself**, as distinct from what codex claimed
- real numbers, pasted

No preamble, no recap of state the owner already has, no framing of the
decision they just made. Incomplete sentences are fine. A tick with nothing to
report is one line, and that is the correct outcome — the loop exists to catch
work landing, not to generate work.

The opposite applies the moment the owner asks something. A question earns
context, examples, and the reasoning behind an answer. "Give me lots of
context" is a real instruction and outranks this section. Terseness is about
not narrating; it was never about withholding.

Two things are never abbreviated, in either mode:

- **The distinction between verified and claimed.** "codex reports green" and
  "I ran the gates" are different sentences and must stay different.
- **A finding against our own work**, including one's own mistakes. F19 records
  a `git checkout` that discarded an unstaged fix and nearly became a false
  report against codex. That belonged in the record at full length.
