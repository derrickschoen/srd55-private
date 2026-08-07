# Converting an OGL prestige class into a CC-BY 5.2 subclass

Research note, 2026-08-06, written against the licence texts held in this
folder and in `docs/srd/ATTRIBUTION.md`. **Not legal advice** — it is a reading
of two licences whose full text is committed here so any claim below can be
checked against the source rather than against somebody's memory.

The question: we want 3.0/3.5 SRD prestige classes as design input for
5e-compatible subclasses. What can actually ship, and under which licence?

## 1. The two licences pull in opposite directions

| | 3.0 / 3.5 SRD | SRD 5.2.1 |
|---|---|---|
| Licence | Open Game License 1.0a | Creative Commons Attribution 4.0 |
| Obligation | Reproduce the whole licence; update and carry the Section 15 chain; identify which portions are Open Game Content | One attribution notice, reproduced verbatim |
| Viral? | **Yes, in effect** | No |
| Can the output be relicensed? | **No** | Yes — any terms you like |

The 3.5 SRD's own legal file states the position plainly: *"Permission to copy,
modify and distribute the files collectively known as the System Reference
Document ('SRD') is granted solely through the use of the Open Gaming License,
Version 1.0a."* **Solely.** There is no second path offered.

## 2. The clause that forbids the conversion

OGL 1.0a §2, verbatim from `OGL-1.0a.txt`:

> No terms may be added to or subtracted from this License except as described
> by the License itself. **No other terms or conditions may be applied to any
> Open Game Content distributed using this License.**

CC-BY-4.0 is "other terms or conditions." So:

**You cannot relicense OGL content as CC-BY. There is no conversion path. The
question as posed has no yes-answer.**

Reinforcing clauses: §3 makes acceptance automatic — *"By Using the Open Game
Content You indicate Your acceptance of the terms of this License"* — where §1(g)
defines "Use" to include *"copy, edit, format, modify, translate and otherwise
create Derivative Material."* Adapting a prestige class into a subclass is
squarely "modify." §10 then requires the full licence to travel with every copy,
and §6 requires the Section 15 chain to be updated and carried.

## 3. What is actually locked up — and what isn't

This is where the useful answer lives, and it turns on a distinction the OGL
itself does not make but copyright law does.

Copyright protects **expression**, not systems. 17 U.S.C. §102(b) excludes from
protection "any idea, procedure, process, system, method of operation, concept,
principle, or discovery," and *Baker v. Selden* is the long-standing authority.
Game mechanics — a class that trades a resource for extra unarmed damage, an
ability that grants a bonus to AC while unarmoured — are systems.

The OGL is a licence, not a statement of what is protected. §1(d) defines Open
Game Content as *"the game mechanic and includes the methods, procedures,
processes and routines"* — Wizards licensing you something a court may well hold
they never controlled. That is why the OGL is best understood as a *safe
harbour*: accept it and you are certainly safe; decline it and you are relying
on the idea/expression line.

The practical consequence:

- Reuse the **text** — sentences, tables, feature names, numbers in sequence —
  and you have made a derivative work. OGL attaches. CC-BY is closed to you.
- Reuse only the **concept** — "a monk who channels inner power into their
  strikes" — and write every word yourself, and you have not copied protected
  expression. The OGL never attaches, and your text is yours to license CC-BY.

The risk is not binary but gradient: the closer the correspondence gets to
feature-for-feature, name-for-name, number-for-number, the more it looks like
copied expression regardless of what you call it.

## 4. The three routes, and what each costs

### Route A — Clean-room concept-only, ships CC-BY

Read the OGL source for concept, then write original expression: own name, own
feature names, own numbers, own structure. Do not carry the OGL, do not add a
Section 15 chain — including them would falsely assert you are distributing
Open Game Content.

- **Lives in:** `../cc-by/`
- **Cost:** you cannot use the source's name, and the design must be genuinely
  re-derived rather than reskinned.
- **This is what D193 chose** for the Warrior of the Waking Will, and what
  D59/D191 codify as "concept-only, one-line disclosure, zero reuse of wording
  or subsystem mechanics."

### Route B — Genuine adaptation, ships OGL

Convert the prestige class properly — keep its name, its feature names, its
structure. The output is Derivative Material under §1(b).

- **Lives in:** this folder.
- **Cost, all mandatory:** the full OGL 1.0a with every copy (§10); an updated
  Section 15 chain (§6) — see `SECTION-15.md`; a clear statement of which
  portions are Open Game Content (§8); and no use of Product Identity (§7).
- **The trap:** the 5e terms the subclass is built from — Focus Points, Flurry
  of Blows, Unarmed Strike — come from **SRD 5.2.1, which is CC-BY, not OGL**.
  A Route B document is therefore a *mixed* work and must carry **both**
  notices, with §8's identification doing the work of saying which is which.
  This is legal but fiddly, and it is the reason D176 quarantines the folder.

### Route C — Don't convert; build native

Design the subclass from SRD 5.2.1 alone and never open the OGL source.
Cleanest of all, and the only route with no residual argument. Costs you the
source's ideas.

## 5. Product Identity — a narrower trap than it looks

§7 forbids using Product Identity. The 3.5 SRD's legal file designates a
specific list: *Dungeons & Dragons, D&D, Player's Handbook, Dungeon Master,
Monster Manual, d20 System, Wizards of the Coast, d20 (when used as a
trademark), Forgotten Realms, … beholder, … mind flayer, illithid, umber hulk,
yuan-ti* — and then says: *"All of the rest of the SRD is Open Game Content."*

So **"Psionic Fist" is Open Game Content, not Product Identity.** The name is
usable — under the OGL. It is *not* usable in a CC-BY document, because that
would be distributing OGC outside its licence, which is §2 again.

Note also §7's second sentence: you may not *indicate compatibility* with a
trademark. Combined with `docs/srd/ATTRIBUTION.md`'s constraint that no
attribution to Wizards may appear beyond the required CC-BY notice, neither
folder may describe itself as compatible with any named commercial product.

## 6. What this repo does

Per D176 — *"Keep ogl stuff in a separate folder with the ogl requirements in
the same folder so ogl doesn't pollute the rest of the repo"* — separation is
physical, not a note in a header:

- `../cc-by/` — Route A and Route C work. CC-BY-4.0 plus the SRD 5.2 notice.
  **No OGL content, no Section 15 chain, no OGL-sourced names or wording.**
- `ogl/` — Route B work and the OGL source material, with the licence, the
  Section 15 chain, and per-document Open Game Content declarations.

The rule that keeps the two apart: **text never moves from `ogl/` to
`cc-by/`.** Concepts may cross; sentences, names and numbers may not. A file
that would need both licences to be lawful belongs in `ogl/`.
