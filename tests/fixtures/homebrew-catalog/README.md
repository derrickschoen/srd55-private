# Hand-written homebrew catalog fixture

Every name and every sentence of rules prose in this directory was written for
this repository. There are no scraped bytes here, and there must never be:
`tools/scrape/` writes only into the gitignored `scraped/` directory, under
sentinel-stamped filenames, and
`tests/unit/tools/scraped-output-is-never-committed.test.ts` fails if any of that
ever becomes tracked.

**One precise exception, stated rather than glossed.** These fixtures name
existing game concepts where a fixture cannot do its job without them — "Bard",
"Extra Attack", "Bardic Inspiration", the spell schools, the ability names. A
homebrew *Bard* subclass that never says "Bard" would not exercise the thing
under test. Those are mechanic names from SRD 5.2, which
`docs/srd/ATTRIBUTION.md` records as CC-BY-4.0 and therefore bundleable. What is
**not** taken from it is the wording.

That distinction was not always honoured here. Review found one feature's prose
sitting in `college-of-the-long-road.d19-gap.json` verbatim from
`docs/srd/source/attack-class-features.txt` — identical but for two commas —
inside a file that claimed to be wholly invented. It has been rewritten, and
`tests/integration/homebrew/homebrew-catalog-fixture.test.ts` now fails if any
fixture sentence reappears in the SRD source text. The rule is the narrow one:
reuse a **name** when the mechanic requires it, never a **sentence**.

## `long-road-spells.tier1.json` / `long-road-spells.tier2.json`

Five homebrew Bard-flavoured spells in the **existing** catalog format,
unmodified. Between them they exercise every branch worth exercising:

| spell | what it covers |
| --- | --- |
| Roadmender's Cadence | concentration, `modifier_scaled`, a non-empty `tags` |
| Coinbite | level 0 (cantrip), `saveAbilities`, two spell lists |
| Milepost Vigil | `ritual: true`, `ritual_utility` |
| Fiddler's Poultice | `healing: true`, `Bonus Action` casting time |
| Crossroads Bargain | `attackModes`, `mixed` reliability, concentration |

`tests/integration/homebrew/homebrew-catalog-fixture.test.ts` imports them
through the real `catalog.import` RPC — dry run, real run, re-run — and asserts
the tombstoning behaviour that makes an import a full replacement.

Version keys use the three-part homebrew grammar
(`expanded:longroad.homebrew:<name>`), which matters: the importer accepts any
non-empty string, but the share/export path enforces the grammar and throws.

## `college-of-the-long-road.d19-gap.json`

**This one does not import, and that is the point.**

The brief asked for a fixture exercising a Bard-like subclass that grants Extra
Attack at level 6 — the D19 shape. The current model cannot express it, so this
is the fixture that shows the gap rather than one that hides it. Three separate
things block it, and the integration test proves each one instead of asserting
it:

1. **There is no importer.** `catalog.import` is the only content-import RPC in
   the entire surface, and its record is a spell. `class_definitions` and
   `subclass_definitions` are written only by `ensureBundledClassContent`
   (`src/rules/class-progression-lookup.ts`), which is bundled-seed-only.
2. **The grant table has no subclass limb.** `class_extra_attack_grants` is
   keyed on `(class_definition_id, class_level)`. Attributing this grant to the
   Bard *class* at level 6 would be a different and wrong rule — every Bard would
   get it.
3. **There is no weapon scope.** D19 records that Thirsting Blade grants Extra
   Attack for the pact weapon only. That field has no column, and it is needed
   for SRD content the project could legitimately bundle, not only for homebrew.

When D19 lands, the integration test's `it('...D19 has not landed yet')` cases
go red. That is deliberate: they are a tripwire on the gap closing, not a
permanent statement about the model.
