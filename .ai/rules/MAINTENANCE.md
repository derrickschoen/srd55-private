# Maintaining this library

Designed to be maintained by agents, mid-task, without a human in the loop.
Optimised for the marginal cost of ONE entry, because that is how it will
actually be updated — during other work, not in a documentation session.

## Adding an entry (the common case, ~60 seconds)

1. You looked something up in source because the library lacked it.
2. Append an entry to the right `R_*.md` per `FORMAT.md`. Next free ID in that
   topic; never reuse or renumber.
3. Carry **exactly one** of QUOTE or CHECK.
   - QUOTE must be **verbatim** and **short** — see the length constraint below.
   - Some facts are true by **ABSENCE** — e.g. Warlock contributing nothing to the
     multiclass slot total, established by Warlock being missing from an
     enumeration. No verbatim span can quote a thing that is not there, so those
     entries carry a CHECK instead. `R-MC-008` is the worked example.
4. `python3 .ai/rules/verify_citations.py` → 0 failures. It proves QUOTEs and
   reports CHECK-only entries as **DEFERRED**, never as passed. Then
   `python3 ~/.claude/skills/verified-kb/scripts/kb_verify.py --kb .ai/rules`,
   which actually executes the CHECKs. Exit 0 = every check ran and passed,
   1 = a failure, **2 = something never ran**. Two is not green.
5. **Regenerate `INDEX.md`; never hand-edit it.**
   `python3 ~/.claude/skills/verified-kb/scripts/kb_index.py --kb .ai/rules`
   It is committed rather than gitignored so a fresh clone has it immediately —
   which means **regenerating is part of the change, not a follow-up.**

Do not batch this. An entry added now costs a minute; the same lookup repeated by
the next agent costs that minute again and risks being answered from memory.

## The QUOTE length constraint — this is not style, it is the corpus

The SRD is a **two-column** layout. In the raw file, the left column's text is
followed *on the same line* by unrelated right-column text. A sentence crossing
the column break therefore CANNOT be quoted contiguously — not even after
whitespace normalization, and not even after closing hyphenation, because the
hyphen is followed by the neighbouring column rather than by a newline.

Practical rule: **keep the quote inside one column-line — roughly 45-55
characters.** If the verifier rejects a quote, shorten it before assuming the
source changed. A short decisive span plus a correct one-line A beats a long
quote that cannot be machine-verified.

## Correcting an entry

Change A and QUOTE in place. Then:

- If the old answer was one an agent would plausibly hold from training,
  **add it to `AGENT_ERRATA.md`**. That file is the point of the library; a
  silently-corrected error teaches nothing and recurs next session.
- Keep the ID. IDs are cited from commit messages and briefs.

## Retiring an entry

Never delete. Replace A with `RETIRED — see <new ID>` and keep the ID resolvable.

## Drift detection

`python3 .ai/rules/verify_citations.py` is the detector. It asserts every QUOTE
still occurs in its SRC, and fails on missing fields, duplicate IDs, and a
missing source file. It also fails on **zero entries parsed**, so a format
regression cannot present as a clean run.

Run it:
- after any edit under `rules/`;
- whenever anything under `docs/srd/` changes — an SRD update that moves text is
  exactly the drift this catches;
- before relying on this library for a decision that produces a number.

**Prove the detector works before trusting a green run.** Corrupt one QUOTE, see
it named, restore it, see it clear. That has been done once and the result is
recorded here so the next agent knows what a real failure looks like:

```
FAIL R_MULTICLASS.md:R-MC-002: QUOTE NOT FOUND in docs/srd/source/multiclassing.txt
7 citation(s) checked, 1 failure(s).
```

## What does NOT belong here

- **Paraphrase in place of a quote.** The whole design rests on QUOTE being
  verbatim and checkable.
- **Anything non-redistributable.** This directory is PUBLIC and committed. Per
  D59, private-repo material — the DPR harness, its calibration basis, any
  derived methodology — must never appear, not even summarized. SRD 5.2.1 is
  CC-BY-4.0 and bundled, so short excerpts of it are fine;
  `docs/srd/ATTRIBUTION.md` is the licence document and is never paraphrased.
- **Codebase architecture.** That is `DEEP_REF_*.md`.
- **Session narrative.** Decisions go in `.claude/decisions.md`, which is
  supervisor-only and outranks this directory.

## Scaling

Current tiering: `INDEX.md` answers inline (hot), `R_*.md` hold quotes, CHECKs
and edge cases (cold), source is the floor.

**The hot-tier size worry was mostly wrong, and it cost us correctness.**
`INDEX.md` used to be a hand-curated subset — 37 of 74 entries, kept small so it
would be cheap to read. It drifted: five rows cited entry IDs that belonged to
different entries, and one row asserted a correct answer backed by **no entry at
all**. Every verifier reported green throughout, because index rows are not
entries and were outside what the verifier checked.

It is now GENERATED and covers every entry. That is four times larger, and the
size does not matter the way we assumed: the designated read path
(`kb_ask.py`) loads it in the READER's context and returns one line, and a
`grep` does not care how big the file is. Size only ever mattered if a caller
read the whole thing into its own context, which is exactly what the read path
exists to avoid.

So: **prefer completeness and generation over a small hand-picked tier.** If the
corpus grows large enough that even generation is unwieldy, shard by topic — and
do NOT duplicate every TRAP into a second global section, which is a second copy
that can disagree with the first.
