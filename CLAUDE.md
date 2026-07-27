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
