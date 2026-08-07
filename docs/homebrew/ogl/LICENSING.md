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

## 6. The SRD 5.1 route — and why it does not reach 5.5

Researched 2026-08-06 against Wizards' own SRD page and community practice.

**The licensing facts, from [dndbeyond.com/srd](https://www.dndbeyond.com/srd):**

- SRD 5.1 — *"The full contents of SRD 5.1 are now released under **both** the
  terms of OGL 1.0a and the Creative Commons Attribution 4.0 International
  ('CC-BY-4.0')."* Dual-licensed; the creator picks.
- SRD 5.2 — *"All new SRD versions will be released **exclusively** under
  Creative Commons (CC-BY-4.0)."* No OGL option, now or in future.

This makes a fourth route real:

### Route D — build on SRD 5.1, ship the whole thing OGL

Because SRD 5.1 can be taken *under the OGL*, a single document can lawfully
combine 3.5 SRD Open Game Content with 5e Open Game Content, under one licence,
with one Section 15 chain. No mixing problem, no quarantine tension. This is how
third-party 5e publishers operated for the better part of a decade.

**The catch, and it is decisive for us: SRD 5.1 is the 2014 rules.** It has Ki
points, not Focus Points. No Weapon Mastery, so no Nick, Slow or Topple. No 2024
Monk. A Route D conversion is a *2014-compatible* subclass. It cannot be made
5.5-compatible, because every 2024 term it would need lives only in SRD 5.2,
which has no OGL option.

So Route D is clean and genuinely useful — it just answers a different question
than "give me a 5.5 subclass."

### Why you cannot have both

To be 2024-compatible you need SRD 5.2 terms; SRD 5.2 is CC-BY-only; and putting
CC-BY material inside an OGL work is the known trap. Two mechanisms bite:

- **Product Identity.** The OGL lets a publisher designate material as Product
  Identity and withhold it from reuse. CC-BY has no such concept, and CC-BY-4.0
  §2(a)(5)(B) forbids imposing "additional or different terms or conditions… if
  doing so restricts exercise of the Licensed Rights." Wrapping CC-BY material
  in the OGL is exactly such a restriction.
- **Trademark and patent** rights are not licensed under CC-BY at all, so the
  OGL's assumptions about them do not carry over.

Community reading, and it matches the folder policy this repo already adopted:
as long as the two licences are treated as **separate agreements** covering
**separate material**, there is no problem; the moment one work tries to be
under both, it becomes a quagmire. See the
[EN World comparison thread](https://www.enworld.org/threads/compare-and-contrast-cc-and-ogl.694888/)
and the [D&D Beyond OGL vs CC-BY discussion](https://www.dndbeyond.com/forums/d-d-beyond-general/general-discussion/162946-ogl1-0a-vs-cc-by-4-0).

## 7. Do we actually need CC-BY on a 5.5 subclass?

Short answer: **only if the document reproduces SRD 5.2 expression.** Original
text that merely references 2024 rules by name is our own work, licensable
however we like.

The practical guidance the community converged on after 2023 —
[Alphastream's CC guide](https://alphastream.org/index.php/2023/07/18/how-to-use-the-creative-commons/)
is representative — is that *"for most creators and RPG companies, the CC-BY is
a superior option,"* and that the OGL is worth carrying only when you need
someone else's OGL-released material.

For **our** documents the answer is nonetheless yes, for a reason specific to
how they are written: the subclass drafts quote SRD spell text, reproduce table
values, and anchor line references into `srd-5.2.1.txt`. That is reproduction of
expression, and it triggers the attribution requirement. It is also cheap — one
notice, no Product Identity declarations, no Section 15 chain — and it matches
D59's standing posture that the test is authorization, not copyright.

Worth being precise about what CC-BY does **not** demand: it does not require
that our own original text be CC-BY. We could keep our subclass mechanics
proprietary and still satisfy CC-BY by attributing the SRD material we used.
Publishing our own text under CC-BY is a choice this project made (D191), not an
obligation the licence imposes.

## 8. Prior art: has anyone converted the Psionic Fist to 5e?

Searched 2026-08-06 across homebrew hosts, wikis and forums. **No direct,
named conversion of the Psionic Fist prestige class into a 5e monk subclass was
found.** The niche appears genuinely open.

What does exist is a body of *original* psionic monk designs on the same theme,
none of them conversions:

- [Way of the Psion](https://www.dandwiki.com/wiki/Way_of_the_Psion_(5e_Subclass))
  — monk subclass, psychic damage scaling with the Martial Arts die.
- [Way of the Fifth Essence](https://www.gmbinder.com/share/-MMwnvFa3XVHS2i5oIje)
  — psionic monk subclass, GM Binder.
- [Re-Imagining Psionics](https://www.gmbinder.com/share/-L6J_0_PAU0HYvvGUpmT)
  — a Battlemind class the author states is based on the Psychic Warrior from
  the Psionics Handbook and SRD; a class, not a subclass, and a redesign rather
  than a conversion.
- [The Complete Psionics Handbook (5e)](https://www.dmsguild.com/en/product/222641/The-Complete-Psionics-Handbook-5e)
  — DMsGuild, covers Psion and Psychic Warrior, under the DMsGuild licence
  rather than the OGL.

The nearest thing to our commission,
[d20collective's "5 Psionic Prestige Classes WotC should adapt into 5e
Subclasses"](https://d20collective.com/blogs/divinations-from-the-collective/5-psionic-prestige-classes-wotc-should-adapt-into-5e-subclasses),
was read in full: it covers Illumine Soul → Paladin, Illithid Slayer → Ranger,
Zerth Cenobite → Monk, Psicrystal Imprinter → Artificer and Ectopic Adept →
Bard, at concept level only — **and does not include the Psionic Fist.**

For cross-checking our extract against a second copy of the source,
[d20srd.org's Psionic Fist page](https://www.d20srd.org/srd/psionic/prestigeClasses/psionicFist.htm)
is an OGL-compliant reproduction.

## 9. Could the Veteran and the Barbed Court ship under MIT?

Asked 2026-08-06. Short answer: **yes, with low risk — and the risk is
measurable rather than a matter of opinion, because it depends entirely on how
much SRD expression the two documents actually contain.** So it was measured.

### The measurement

Both documents were diffed against `srd-5.2.1.txt` at the n-gram level, with the
licence notice excluded from the comparison.

| Document | Verbatim SRD sentences (≥12 words) | Longest verbatim run |
|---|---:|---:|
| `2026-08-04-rogue-veteran-subclass.md` | 0 | **10 words** |
| `2026-08-03-monk-barbed-court.md` | 0 | **13 words** |

The longest runs are:

- Veteran — *"you can use this feature a number of times equal"* (to your
  Proficiency Bonus).
- Barbed Court — *"table shows how many spell slots you have to cast your
  level 1"* (+ spells).

Both are 5e rules boilerplate: the standard phrasing for a limited-use feature,
and the standard sentence from a spellcasting block. Neither document reproduces
a passage, a feature description, or a table of SRD values. Spell names are
titles, mechanics are systems, and the SRD line-number links are references
rather than reproduction — none of which copyright reaches.

### The conclusion

There is no meaningful body of protected SRD expression in either document, so
CC-BY attribution is **not legally compelled** for them, and licensing our own
text under MIT is available.

Three caveats, in descending order of weight:

1. **MIT is a software licence.** It grants rights in "the Software" and its
   warranty disclaimer is written for code. Applied to a design document it
   works — a licence is a grant of permission and nothing requires a
   content-specific one — but it reads oddly and needs a line defining what "the
   Software" means here. CC0 is the conventional choice when the goal is
   maximum permissiveness for prose. This is a drafting problem, not a legal
   one.
2. **Keep the SRD 5.2 notice anyway.** It costs one paragraph and it is not a
   licence grant over our text — it is an attribution statement, and under D59's
   standing posture ("the test is authorization, not copyright") it is the thing
   that makes our authorization to build on 5.2 unambiguous. MIT-on-our-text and
   the CC-BY notice-for-theirs coexist without conflict; MIT is more permissive
   than CC-BY, so it imposes no downstream restriction CC-BY forbids.
3. **The Barbed Court's 13-word run is the one thing worth rewriting.** It is
   the SRD spellcasting-block template. Rephrasing that single sentence removes
   the only argument anyone could make, and costs nothing.

### The condition that would change the answer

MIT is available **only while these documents stay free of OGL content.** The
Barbed Court was checked against the full 3.5 SRD on 2026-08-06 and cleared — no
taunt or forced-attack mechanic exists in that corpus, no prestige class grants
a comparable unarmoured AC bonus. If either document ever absorbs OGL material
it must move to `ogl/`, and MIT stops being an option, because OGL §2 forbids
applying other terms to Open Game Content.

## 10. What this repo does

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
