# Working on this project

Read this first. It is deliberately short; the detail lives elsewhere and is
linked below.

## This is a PRE-ALPHA project. Replace freely.

There are no users, no released version and no backward-compatibility promise.
The instincts you would bring to an established codebase are wrong here.

**Bias towards replacing code, not accommodating it.** If you find a better
structure, take it — even if that means deleting work that already exists and
passes its tests. Deleting or ignoring previous code is WELCOME when the result
is a better codebase. A large diff is not a cost worth avoiding.

Do not:

- preserve an interface because something already calls it;
- add a compatibility layer or an adapter to avoid touching callers;
- keep a column, table or module because removing it would move a test
  expectation;
- write "kept for backward compatibility" about anything.

**The tell to watch for**: code justified by what it PROTECTS rather than what
it DOES. This project accumulated a whole layer of that — machinery proving
fidelity to the Laravel MVP it replaced, which then outlived the replacement and
began taxing every schema change. See F10 in the decisions file. When you find
that shape, say so and remove it.

What this does NOT license:

- **Deleting a test to make something pass.** A test may be deleted when its
  SUBJECT is gone, never to reach green.
- **Regenerating an expectation from our own output.** A retained test must
  still be able to fail. This is the hardest rule here and it has no exceptions.
- **Losing user data.** A contract stricter than its column, an import that
  refuses an older payload, a column that does not survive backup — those are
  the real bugs. Replacing structure is cheap; losing someone's character is not.

## Describe the rules engine IN THE TYPE SYSTEM

The domain is a rules engine. As much of it as is practicable should be stated
in types, so a wrong program fails to compile rather than failing a test — or
worse, silently producing a plausible number.

In rough order of value:

1. **Make an absence a type, not a fallback.** `hit_die: number | null` with the
   assumption made once, visibly, beats `?? 8` scattered at call sites. A guess
   that reaches a consumer indistinguishable from a sourced value is the failure
   this project keeps having.
2. **Brand ids.** `SpellVersionId`, not `number`. The brands exist in
   `src/domain/ids.ts`; use them.
3. **Close the sets that are genuinely closed** — die sizes, damage types,
   ability scores, spell schools. But see the trap below.
4. **Put ranges in the type, not only in a CHECK.** A spell level is 0..9; a
   class level is 1..20. A CHECK catches it at the database; a type catches it
   at the keyboard.
5. **Exhaustive switches with NO default arm**, so a new variant is a compile
   error rather than a silent fallthrough.
6. **Value objects for structured strings.** A range is feet; a duration is
   seconds. `"60 feet"` cannot be sorted, compared or totalled.
7. **Relations in the type**, not a bare foreign-key integer.

**THE TRAP, and it is a data-loss bug**: a closed enum rejects homebrew. Making
a spell school a closed enum refuses an imported spell whose school is
"Chronomancy". Where a user can supply content, the pattern is a KNOWN set plus
passthrough — bounded mechanical kinds plus free text. This project has settled
that shape twice already (D12 for species traits, Q4 for weapon properties).
Follow it rather than re-deciding.

## Where everything else lives

| What | Where |
|---|---|
| **Binding decisions and findings — READ BEFORE CHANGING ANYTHING** | `.claude/decisions.md` (D-numbered decisions, F-numbered findings; highest number is newest) |
| Standing rules for the autonomous build loop | `.claude/supervision.md` (model policy, gates, forbidden paths, hard stops, failure lessons) |
| Open questions for the owner | `.claude/pending-questions/` |
| **D&D rules and spells — NEVER answer from memory** | `.ai/rules/INDEX.md` (answers inline; `.ai/AGENTS.md` has the lookup protocol) |
| Deep reference for agents | `.ai/` |
| Licensing rules for bundled content | `docs/srd/ATTRIBUTION.md` |
| Where SRD content came from | `docs/srd/SOURCE.md` |

If this file and the decisions file disagree, **the decisions file wins**. It is
the record of what was decided and why; this file is only orientation.

## Never state a D&D rule from memory

Look it up before asserting any rule, spell effect, class feature, or number.
The default lookup delegates to codex so the library is read in ITS context
rather than yours — you pay for one line:

```
python3 ~/.claude/skills/verified-kb/scripts/kb_ask.py --kb .ai/rules '<question>'
```

Two readers (codex sol-medium + claude sonnet) answer in parallel and are
compared; `[2/2 agree]` is corroboration, exit 2 is an unresolved disagreement
you must settle yourself by reading the cited entries.

`KB: NOT-IN-KB` means it is genuinely absent — read source and add the entry.
That is a correct answer; a confident guess is not. Grep `.ai/rules/INDEX.md`
directly only when it is already in context and you need one known key.

This is not caution for its own sake. Recall was wrong **three times in one
session** — half-caster multiclass rounding, Channel Divinity recovery, and
Magic Missile dart scaling — on facts sitting in `docs/srd/` the whole time, and
another agent caught every one. `.ai/rules/AGENT_ERRATA.md` lists the wrong
priors already caught; if your belief is on it, your belief is wrong.

Also: **do not `grep` the SRD directly.** It is two-column, so a phrase spanning
a sentence is interleaved with the neighbouring column and plain `grep` returns
nothing for text that is present — silently, and it reads exactly like "no such
rule". Use `python3 .ai/rules/srdgrep.py '<phrase>'`, which normalizes first.
