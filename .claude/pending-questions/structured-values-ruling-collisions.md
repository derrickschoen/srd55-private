# Q13 — Your four structured-value rulings met data they do not cover, in twelve places. Here is what was chosen instead.

**Status: DECIDED under the overnight autonomy grant, and every one is
reversible.** Nothing here blocked; the track proceeded and recorded. This file
exists so you can reverse any of it without archaeology, because several
choices introduce a concept you did not ask for.

Your rulings, verbatim, were the spec:

> "Store distance as a number of feet. Shape Type is a separate enum nullable,
> there are spheres, cylinders, cones, straight line (like lightning bolt)."
> "Spell components are a cost in copper pieces plus text."
> "Spell upcast progression is just a list of levels that can upcast and a text
> description."
> "Background equipment packages should be templates for a list of quantity +
> item (name only unless weapon or armor)."

## 1. RANGE — "Self" and "Touch" have nowhere to go in feet-plus-shape

Both are real and both are in this repository: `Self` appears twice in the
bundled SRD extract, and `Touch` is the value in our own documented import
example. A feet column cannot hold either, and refusing them would be the
D12 data-loss bug.

**Chosen:** a `range_kind` discriminator beside the feet —
`self | touch | ranged | sight | unlimited | special` — with `range_feet`
nullable and meaningful only for `ranged`. Your shape enum shipped exactly as
you listed it: `sphere | cylinder | cone | line`.

**What you did not ask for:** `sight`, `unlimited` and `special` as kinds. They
exist because a real value has to land somewhere that is not a lie.

**Also worth knowing:** a Line has a WIDTH and a Cylinder a HEIGHT, and one feet
number cannot hold both. The bundled text says *"a 15-foot Cone or a 30-foot
Line that is 5 feet wide"*. Only the primary dimension is stored; the width is
not. If that matters, it is a second column and a decision for you.

## 2. COMPONENTS — the ruling describes the wrong half of the field

Measured, not assumed: every real value of `components` in this repo is a V/S/M
list — `V`, `V, S`, `S, M (a rag and a little rosin)`. The copper cost is not
the field; it is a phrase *inside* the M text of some spells.

**Chosen:** the V/S/M text stays in `components` as it always was, the copper
cost becomes its own integer, and `material_component_summary` — a column that
existed and **nothing ever wrote** — becomes the "plus text" half you described.

**What you did not ask for:** a `materialCostKinds` enum, `exact | minimum`. The
bundled True Strike reads *"worth 1+ CP"*. Storing 1 alone silently converts "at
least 1 CP" into "1 CP". If you would rather drop the distinction, that enum is
one column and one parse branch.

## 3. UPCAST — the columns you ruled on have never held anything

`upcast_type` and `upcast_summary` had **zero writers anywhere in the
repository** and one dead reader. The Tier 1 import format has no field for
them. So this was not a migration; it was a design from scratch.

**Chosen:** a `spell_version_upcast_levels` table (your list of levels), plus
`upcast_summary` (your text).

**What you did not ask for, and it is the one I would most like you to look at:**
an `upcastScales` enum, `slot_level | character_level`. "A list of levels" is
ambiguous between two different things — the slot you cast it in, and your own
character level — and **both cantrips this repo actually ships scale by
CHARACTER level** ("when you reach levels 5, 11, and 17"). Without the
discriminator, a stored list of `5, 11, 17` reads as slot levels, which do not
go past 9. The alternative is to pick one meaning and refuse the other.

## 4. BACKGROUND EQUIPMENT — money, parentheticals, and no armour at all

- **Every option B is coin alone** — `50 GP` for all four backgrounds. Under a
  strict quantity+item list that is a package with zero items.
  **Chosen:** `coin` is an item kind, so a package is never empty.
- **`Book (prayers)`, `Parchment (10 sheets)`** — parentheticals that are a
  subject and a sub-unit count, not quantities. **Chosen:** kept in the item
  name rather than parsed, because guessing which parenthetical is a count is
  the guess this project refuses.
- **"unless weapon or armor" has no armour to exercise it.** Across all four
  licensed packages there are four weapon-ish entries and **zero armour**. The
  `armor` kind ships unexercised by real data.
- **The A/B choice is a second structure your ruling does not mention.**
  **Chosen:** an `option` column, so both packages live in one table.

Item kinds shipped as `gear | weapon | armor | coin`.

## 5. And one question your ruling implicitly raises

Under **D26** — a value earns structure only if it changes a number on the sheet
— *range earns nothing today*. Its three readers all echo it verbatim; the only
rendering is the printable spell card. Structuring it buys sorting and
filtering, not a sheet number.

You ruled it, so it was built. But if D26 is the test, range is the one of the
four that does not currently pass it, and it is worth knowing that was noticed
rather than overlooked.

## What to do with this

Nothing, if the choices read right. Each of the three unrequested concepts —
`sight/unlimited/special`, `exact/minimum`, `slot_level/character_level` — is a
small, isolated reversal. The alternative in every case was to drop a real
distinction silently, which is the one thing this project treats as never
acceptable.
