# Deep Reference: Licensing

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

## This file is a POINTER. Read the real one.

**`docs/srd/ATTRIBUTION.md` is the licence document. It is complete and correct,
and it must not be paraphrased anywhere — including here.**

A paraphrased licence notice is a licence breach. That is the whole reason this
file is nine lines of pointer instead of a summary: the required notice has to
appear verbatim, and a second, slightly-different copy of it living in an agent
convenience file is the exact failure mode.

---

## The three things to know before you go and read it

1. **The notice is reproduced VERBATIM, never shortened, never paraphrased.**
   `docs/srd/ATTRIBUTION.md` § "Required notice — reproduce verbatim" holds the
   only correct text.

2. **The easy-to-get-wrong constraint runs the OTHER way.** Naming the SRD is
   required; naming Wizards beyond the notice is *not permitted*. No logos, no
   wordmarks, no "official"/"licensed"/"endorsed", no claimed compatibility with
   a named commercial product. `docs/srd/ATTRIBUTION.md` § "Constraint that is
   easy to get wrong".

3. **The test is the OBLIGATION, not the licence family.** CC-BY-4.0 qualifies;
   CC-BY-**SA** does not, despite both being Creative Commons — share-alike is an
   obligation beyond attribution and it propagates to whatever it is combined
   with. "It's Creative Commons" is not sufficient.
   `docs/srd/ATTRIBUTION.md` § "What may be bundled".

Anything failing that test stays **user-supplied through catalog import**, which
remains the mechanism for homebrew and non-free material.

---

## Where this is enforced

- `tests/browser/attribution.spec.ts` — the notice reaches the UI
- `tests/browser/bundled-content.spec.ts` — what ships
- `tests/unit/ui/legal.test.ts`
- `tests/unit/rules/srd-extract-provenance.test.ts` — the extracts trace back to
  a document, not to somebody's memory
- `tools/assert-dist-clean.mjs`, run as the third stage of `npm run build`, plus
  `tests/unit/tools/scraped-output-is-never-committed.test.ts` and
  `scraper-is-never-in-the-bundle.test.ts` — scraped rules text is NOT
  free-licensed and must never reach `dist/`, the repository, an export or a
  share link (D3)

Provenance of the bundled extracts — document, URL, retrieval date, size,
SHA-256, and how to re-derive each file — is `docs/srd/SOURCE.md`. See
[DEEP_REF_DOMAIN.md](DEEP_REF_DOMAIN.md) §1.

Binding decisions: **D3** (SRD is bundled; other content stays imported),
**F1** (SRD-derived data already shipped with no attribution — the finding that
started this), **F6** (the SRD was never actually bundled). Read them in
`.claude/decisions.md`.
