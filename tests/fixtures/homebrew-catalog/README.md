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
under test. Those are mechanic names from SRD 5.2.1, which
`docs/srd/ATTRIBUTION.md` records as CC-BY-4.0 and therefore bundleable. What is
**not** taken from it is the wording.

That distinction was not always honoured here. Review found one feature's prose
sitting in the College of the Long Road fixture verbatim from
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

## `college-of-the-long-road.subclass.tier1.json`

**This one used to be the file that could not import.** It was
`college-of-the-long-road.d19-gap.json`, and the README here listed three
blockers with a tripwire test on each. All three are gone:

1. ~~There is no importer.~~ `catalog.import` now carries a **subclass record
   kind**. A Tier 1 document is still a bare JSON array; the discriminator went
   on the element, as an optional `kind` whose absence means `spell`.
2. ~~The grant table has no subclass limb.~~ D19 built `subclass_features`,
   keyed on a subclass rather than a class.
3. ~~There is no weapon scope.~~ `subclass_features.effect_weapon_scope` exists,
   and two SRD Warlock invocations are seeded using it.

The tripwire cases were **replaced**, not renamed. The suite that stands where
they were imports this file through the real RPC, reads every stored column back
out of SQLite, and follows the level 6 grant into `attacksPerAction` — because a
row that is stored but never reaches the derivation would pass every other
assertion and mean nothing.

What the file still cannot say, stated in the file itself as well as here:

- **Two of its four features are free text**, and mechanically so. "Marching
  Song" is an always-prepared spell and "Road Trained" grants proficiencies;
  `classFeatureEffectKinds` has exactly one member, `extra_attack`, so both land
  with `effect_kind` NULL. That is the design `src/rules/class-feature-effects.ts`
  states — free text is not an effect, however mechanical the English sounds —
  and the integration test asserts it rather than letting it be assumed.
- **No source book and no flavour paragraph.** `subclass_definitions` has neither
  a publication table nor a description column. The earlier draft carried both;
  they are dropped rather than written into fields that silently vanish.
- **No spellcasting.** An imported subclass is a non-caster: the format has no
  vocabulary for a caster fraction, a slot table or a `grant_rules` blob.

An imported subclass's key is a **three-part imported key**
(`2024:longroad.homebrew:<name>`), and that is load-bearing rather than tidy.
`subclass_definitions` has no `provenance` column, a backup carries the subclass
by content key and by nothing else, and a share link carries one `subclassKey` —
so the key is the only field that crosses all three boundaries. The grammar
(`src/catalog/catalog-key.ts`) requires a dotted owner namespace in the middle,
which every bundled key (`2024:subclass:champion`) fails by shape. A
document therefore cannot name a seeded row even if it tries;
`tests/integration/catalog/subclass-provenance.test.ts` follows one imported
subclass through the database, a backup and a share link to prove it.

## `legacy-pre-subclass.tier1.json`

**A frozen, hand-typed document from before subclasses existed in the format.**
Two spells, no `kind` field anywhere, and none of the three fields the spell
record gained after the earliest documents were written (`tags`, `healing`,
`effectReliabilityCategory`) — plus one unknown field that must be dropped in
silence.

It is **never generated from the current encoder**, and the file says so itself.
A fixture emitted by today's code proves only that today's code agrees with
itself; the compatibility claim is about files users already hold. If this file
ever stops importing, that change has broken every document in the wild, and the
test that reads it is supposed to go red.
