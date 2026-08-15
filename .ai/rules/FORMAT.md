# Entry format — machine-parseable, not prose

Not written for humans. No narrative, no motivation paragraphs, no transitions.
Fixed field order so a single `grep -A6` returns a complete answer without
reading the file.

```
### <ID> <slug>
Q: <the question an agent would actually ask, lowercase, keyword-dense>
A: <the answer, one line, no hedging>
QUOTE: "<verbatim span from SRC, <=120 chars, whitespace-normalized>"
SRC: <repo-relative path>
CODE: <repo path + symbol implementing it, or NONE>
TRAP: <the wrong answer recall produces, or NONE>
```

## Field rules

- **ID** — `R-<TOPIC>-<NNN>`. Stable forever. Never renumber; retire instead.
- **Q** — write the query, not the topic. Multiple phrasings on one line is fine;
  this line is the retrieval surface and exists to be grepped.
- **A** — one line. If it needs two, it is two entries.
- **QUOTE** — VERBATIM from SRC. Never paraphrase. This is the whole point: a
  paraphrase is a second copy that can silently diverge from source, which is the
  exact failure this library exists to catch. Keep it short — enough to be
  decisive, no more. Whitespace-normalized (the SRD is two-column; raw spans
  break across columns).
- **SRC** — the file the QUOTE is verbatim from. Machine-checked.
- **CODE** — where the app implements it, so a rules question and a code question
  resolve to the same place. `NONE` if unimplemented.
- **TRAP** — the wrong answer a model produces from memory. `NONE` if there is no
  known trap. **This field is the only content here that exists nowhere else** —
  everything else is retrievable from source, this is not.

## Why QUOTE is verbatim and machine-checked

`verify_citations.py` reads every entry, normalizes whitespace in SRC, and
asserts the QUOTE occurs in it. An entry whose quote no longer appears is a
FAILURE, not a warning. That makes staleness mechanically detectable instead of
a thing someone remembers to check — the same discipline as the bundled-content
digest and the spell-registry completeness test.

It also bounds the damage from a bad entry: A can be wrong, but A is
one line sitting next to the verbatim text it claims to summarize, so the
disagreement is visible at a glance.

## Licensing

QUOTE spans are short excerpts of SRD 5.2.1 under CC-BY-4.0, already bundled in
this repo. `docs/srd/ATTRIBUTION.md` is the licence document and must not be
paraphrased — see `.ai/DEEP_REF_LICENSING.md`. Nothing from a non-redistributable
source may be quoted here. Per D59 that includes anything derived from private
material; this directory is PUBLIC.
