# .ai/ — agent reference library

Machine-readable. Not written for humans, not maintained for them. No narrative,
fixed field order, greppable keys, answers inline where they fit.

> If this directory disagrees with `.claude/decisions.md`, decisions.md wins and
> this directory is the bug.

## BINDING RULE — D&D rules and spells

**Never state a D&D rule, spell effect, class feature, or number from memory.**
Check `.ai/rules/` first. It costs one grep. Recall has been wrong three times in
a single session on facts that were sitting in `docs/srd/`, and every one was
caught by another agent rather than by the agent that asserted it.

**DEFAULT LOOKUP — delegate to codex so the KB is read in ITS context, not yours:**

```
python3 ~/.claude/skills/verified-kb/scripts/kb_ask.py --kb .ai/rules '<question>'
```

TWO readers (codex sol-medium + claude sonnet) read it in parallel in THEIR
contexts and their answers are compared. `[2/2 agree]` means both independently
landed on the same entry. **Exit 2 = unresolved disagreement** — both answers and
the cited entry IDs are printed and YOU break the tie by reading those entries.
Do not average them and do not pick the more confident one.

Returns ONE line: `KB: <answer> [<ID> in <file>]`, plus the entry's TRAP. Exit 1
with `KB: NOT-IN-KB` means it is genuinely absent — then read source yourself and
ADD the entry. **NOT-IN-KB is a correct answer; a confident guess is not.** The
reader is instructed never to answer from its own training, because delegating a
lookup to another model otherwise just moves whose memory you are trusting.

Grep directly ONLY when INDEX.md is already in context and you need one known
key — otherwise the round-trip is cheaper than loading the files:

```
grep -i '<keyword>' .ai/rules/INDEX.md          # hot tier: answers inline
grep -i '^Q:.*<keyword>' .ai/rules/R_*.md       # topic entries
python3 .ai/rules/srdgrep.py '<phrase>'         # source of truth
```

**Do not `grep` the SRD directly.** It is a two-column layout: a phrase that
spans a sentence is interleaved with the neighbouring column, so plain `grep`
returns nothing for text that is present — and a silent empty result reads
exactly like "the rule does not exist". `srdgrep.py` normalizes first.

**Read `.ai/rules/AGENT_ERRATA.md` before asserting anything about character
building.** It lists wrong priors already caught. If your belief is on that list,
it is wrong.

**If another agent contradicts you on a rule, check source before defending.**
Every recorded instance so far, the other agent was right.

## Layout

| Path | Tier | Read when |
|---|---|---|
| `rules/INDEX.md` | HOT | any rules question — start here, answers are inline |
| `rules/AGENT_ERRATA.md` | HOT | before asserting any character-building rule |
| `rules/R_*.md` | COLD | the index was insufficient; you need the quote or an edge case |
| `rules/GLOSSARY.md` | COLD | vocabulary, not rules |
| `rules/FORMAT.md` | — | adding an entry |
| `rules/MAINTENANCE.md` | — | adding, correcting, or retiring an entry |
| `DEEP_REF_*.md` | COLD | codebase subsystems (schema, domain, testing, licensing, proof toolkit) |
| `RECIPES.md` | COLD | how to perform a recurring task here |
| `guidelines/CODEBASE_GUIDE.md` | COLD | orientation |

## The invariant that makes this trustworthy

Every rules entry carries a **verbatim** QUOTE from a cited in-repo source, never
a paraphrase, and `python3 .ai/rules/verify_citations.py` proves every quote
still occurs in its source. An entry whose quote has drifted is a FAILURE, not a
warning.

That is deliberate. A paraphrased rules library is a second copy of the rules
that can silently diverge from the source — which is the exact failure this
library exists to prevent, reintroduced one level up. The same reasoning governs
`DEEP_REF_LICENSING.md`, which refuses to paraphrase the licence notice.

Run the verifier after ANY edit to `rules/`. It is the drift detector and it is
the only thing standing between this library and confidently-wrong documentation.

## Feeding back

If you looked something up in source because the library did not have it, **add
it**. A lookup that does not feed back is a lookup the next agent pays for again.
`MAINTENANCE.md` has the procedure.
