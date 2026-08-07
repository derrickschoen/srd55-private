# Way of the Psionic Fist

A Monastic Tradition for the Monk, converted from the **Psionic Fist** prestige
class in the 3.5 System Reference Document.

Status: **provisional, ready for design review only.** No playtest has been run.

> **Licence.** This document is Open Game Content distributed under the Open
> Game License 1.0a. A copy of the licence is in this folder as
> `OGL-1.0a.txt`. See the Open Game Content declaration and the Section 15
> copyright chain at the foot of this document.

## Why this document is OGL and not CC-BY

This is a genuine adaptation of OGL material — Route B/D in
[`LICENSING.md`](LICENSING.md) — so it cannot ship CC-BY. OGL 1.0a §2 forbids
applying other terms to Open Game Content.

It targets **SRD 5.1**, not SRD 5.2, on the owner's ruling of 2026-08-06. The
reason is structural rather than stylistic: SRD 5.1 is released under *both* the
OGL 1.0a and CC-BY-4.0, so it can be taken under the OGL and combined with 3.5
SRD material in one document under one licence with one Section 15 chain. SRD
5.2 is CC-BY-only and can never be taken under the OGL, so any 2024 mechanic
would force this document into a mixed-licence state.

**Consequence, stated plainly: this is a 2014-rules subclass.** It is not
compatible with the 2024 Monk, and that is deliberate, not an oversight.

### SRD 5.2-only mechanics deliberately avoided

| 2024 mechanic | Why excluded | Used instead |
|---|---|---|
| Focus Points | 5.2-only name for the Monk's pool | **Ki points** |
| Weapon Mastery, Nick / Slow / Topple / Vex | Introduced in 5.2 | nothing |
| Discipline Focus, Uncanny Metabolism, Heightened Focus | 2024 Monk features | nothing |
| 2024 Unarmed Strike (Grapple/Shove options) | 5.2 restructure | 2014 unarmed strike |
| Bastion, Weapon Juggler, 2024 conditions rework | 5.2-only | nothing |

Every chassis element below is verified present in `srd-5.1/srd-5.1-ogl.txt`:
Monastic Tradition features at 3rd, 6th, 11th and 17th level; the Martial Arts
die at d4/d6/d8/d10 from levels 1/5/11/17; ki points equal to Monk level; and
**"Ki save DC = 8 + your proficiency bonus + your Wisdom modifier"**, quoted
from the SRD.

## Identity

A Psionic Fist has turned the monastery's inward discipline outward as raw
psionic force. Where another monk channels ki into speed or stillness, this one
learns to shape it into manifest power — armour of pure thought, a body that
blurs between one instant and the next, a strike that lands with the weight of
an idea. The powers are not studied or prayed for. They are simply known, and
they cost the same well of energy that fuels every other thing the monk does,
so every manifestation is a decision not to move, not to flurry, not to dodge.

## Conversion map

What the source does, and what it became. The prestige class is a 10-level
add-on for an existing monk; the subclass is a 17-level progression, so the
mapping is structural rather than one-for-one.

| Psionic Fist (3.5 SRD) | Way of the Psionic Fist (5.1) |
|---|---|
| Power Points/Day, 1 → 71 over ten levels, plus bonus points for high Wisdom | **Ki points.** The Monk already owns a Wisdom-flavoured personal pool; adding a second would be a chassis mismatch. Powers cost ki equal to their level. |
| Powers Known — one psychic warrior power per level, ten total, no preparation | **Powers Known** — five total at 3rd/6th/11th/17th, chosen from a fixed list, never prepared |
| Maximum Power Level Known — 1st through 5th at odd levels | **Maximum power level** — 1st/2nd/3rd/4th at Monk 3/6/11/17 |
| Save DC 10 + power level + Wisdom modifier | **Ki save DC**, the host chassis's own formula |
| Bonus psionic feat at 5th and 10th, the eponymous feat being *Psionic Fist* (expend focus for extra unarmed damage) | **Psionic Fist** at 6th and **Greater Psionic Fist** at 11th, carrying the namesake feats' effect onto the Monk's own strike |
| Monk Abilities — class levels stack for unarmed damage, AC and unarmored speed | **Dropped.** This clause exists only to patch 3.5 multiclassing; a subclass never leaves the Monk progression, so there is nothing to repair. |
| Weapon and Armor Proficiency: none | **Dropped.** Redundant on a Monk. |
| Requirements: BAB +4, Concentration 9 ranks, Wild Talent, Still Mind | **Dropped.** Subclasses have no entry requirements. |

## Features

### 3rd Level: Psionic Powers

Your discipline has become manifest force. You know two powers of your choice
from the Psionic Fist Powers table, and you learn another at 6th, 11th and 17th
level.

**Manifesting.** To manifest a power, you spend a number of ki points equal to
the power's level. You do not prepare powers and you do not use spell slots.
The highest-level power you can manifest is shown below.

| Monk level | Powers known | Maximum power level |
|---:|---:|---:|
| 3rd | 2 | 1st |
| 6th | 3 | 2nd |
| 11th | 4 | 3rd |
| 17th | 5 | 4th |

A power's casting time, range, duration and effect are those of the spell of the
same name. Wisdom is your manifesting ability, and the saving throw DC for a
power is your ki save DC.

**Powers require no verbal or somatic components**, since they are shaped by
thought rather than word or gesture. A power that has a material component
consumed by the spell cannot be manifested.

Whenever you gain a Monk level, you can replace one power you know with another
from the table.

#### Psionic Fist Powers

| Power level | Powers |
|---:|---|
| 1st | *expeditious retreat*, *false life*, *jump*, *longstrider*, *shield* |
| 2nd | *blur*, *enhance ability*, *mirror image*, *misty step*, *spider climb* |
| 3rd | *blink*, *haste*, *protection from energy* |
| 4th | *freedom of movement*, *stoneskin* |

All fifteen are present in SRD 5.1. The list is deliberately self-directed: the
psychic warrior's discipline sharpens its own body and never reaches out to
command another mind.

### 6th Level: Psionic Fist

You can drive raw psionic force through a blow. Once on each of your turns when
you hit a creature with an unarmed strike, you can spend 1 ki point to deal
extra force damage to the target equal to two rolls of your Martial Arts die.

### 11th Level: Greater Psionic Fist

The force you carry has become difficult to stand against. The extra damage of
your Psionic Fist increases to three rolls of your Martial Arts die, and when
you deal it, the target must succeed on a Strength saving throw against your ki
save DC or be pushed up to 10 feet directly away from you.

### 17th Level: Perfect Manifestation

Your powers no longer cost you anything to reach. When you manifest a power, you
can do so without spending ki points. Once you manifest a power in this way, you
can't do so again until you finish a short or long rest.

## Design notes and open risks

Numbers use a 65% hit chance and the 2014 Martial Arts die.

- **Psionic Fist damage.** Two Martial Arts dice at Monk 6 (d6) is 7.0 average,
  or 4.6 expected per attempt, for 1 ki. At 11th (d8) three dice is 13.5, and at
  17th (d10) three dice is 16.5. Comparator on the same chassis: Way of the Open
  Hand's Quivering Palm costs 3 ki for 10d10 with a save. Once-per-turn and the
  ki cost are the bounds.
- **Ki contention is the real cost and is intended.** Ki equals Monk level and
  funds Flurry of Blows, Patient Defense, Step of the Wind, Stunning Strike and
  now every power. A 3rd-level power at Monk 11 is three ki — a Flurry, a Dodge
  and a Stunning Strike foregone. This mirrors the source, where power points
  were the binding constraint.
- **Componentless manifestation is the least-tested clause.** It means powers
  work while Silenced, grappled, restrained or with both hands occupied. It is
  faithful to the fiction and it is a real, unpriced benefit. **Amber; the
  fallback is to require somatic components and drop only the verbal.**
- **Perfect Manifestation** at 17th is modelled on the SRD's own once-per-rest
  free-cast pattern. A free 4th-level power on a short rest cycle is roughly
  3–4 uses per adventuring day; that may be too generous and is flagged rather
  than pre-nerfed.
- **F3 dip check.** Three Monk levels buy two 1st-level powers manifested for
  1 ki each, from a pool equal to character level — *shield* and *false life* on
  a large pool is the exposure. Levels 6, 11 and 17 hold everything else.
  **Amber; outsider builds untested.**
- **Niche trespass.** The self-buff register overlaps the Eldritch Knight's
  abjurations and any defensive caster. The list carries no attack, no healing
  and no control, which is the intended containment.

## Open Game Content declaration (OGL §8)

The whole of this document is Open Game Content **except** the following, which
are our commentary and are not offered under the OGL: the sections "Why this
document is OGL and not CC-BY", "Conversion map", and "Design notes and open
risks", together with this declaration and the headings that introduce them.

No Product Identity is used. No compatibility with any trademark is claimed or
implied.

## Section 15 — Copyright Notice

    Open Game License v 1.0a Copyright 2000, Wizards of the Coast, Inc.

    System Reference Document Copyright 2000-2003, Wizards of the Coast, Inc.;
    Authors Jonathan Tweet, Monte Cook, Skip Williams, Rich Baker, Andy Collins,
    David Noonan, Rich Redman, Bruce R. Cordell, John D. Rateliff, Thomas Reid,
    James Wyatt, based on original material by E. Gary Gygax and Dave Arneson.

    Open Game License v 1.0a Copyright 2000, Wizards of the Coast, LLC.

    System Reference Document 5.1 Copyright 2016, Wizards of the Coast, Inc.;
    Authors Mike Mearls, Jeremy Crawford, Chris Perkins, Rodney Thompson, Peter
    Lee, James Wyatt, Robert J. Schwalb, Bruce R. Cordell, Chris Sims, and Steve
    Townshend, based on original material by E. Gary Gygax and Dave Arneson.

    Way of the Psionic Fist Copyright 2026, <COPYRIGHT HOLDER — TO BE SET BY
    THE OWNER>; Author <AUTHOR — TO BE SET BY THE OWNER>.

Both Wizards entries are reproduced exactly as published — the 3.5 chain from
`srd-3.5/Legal.txt`, the 5.1 chain from `srd-5.1/ogl-page.txt`. Note that the
two spell "Wizards of the Coast" differently (Inc. and LLC); that difference is
in the sources and is preserved rather than tidied.

**The final entry is a placeholder and must be completed before this document is
distributed.** OGL §6 requires the title, the copyright date and the copyright
holder's name for original Open Game Content, and guessing a legal name is not
something this session will do.
