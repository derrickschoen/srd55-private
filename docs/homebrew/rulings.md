# Owner rulings — subclass sessions

Rulings made in subclass sessions, newest first, recorded verbatim. The
supervision loop folds these into `.claude/decisions.md` at merge; this file
is the only decisions-writer inside a subclass session (one writer per
append-only file).

## 2026-08-07 — Barbed Court: the third-caster slot table stays, with its derivation recipe printed and sourced to the SRD 5.2.1 Multiclass Spellcaster table

Owner's question and ruling, verbatim:

> Also, am I ok to use the 1/3 caster chart from the phb in cc-by license? Or am
> I safer using the 1/2 caster table?

> Ok, keep the third-caster table, print the derivation recipe in the design
> notes, and cite the SRD 5.2.1 Multiclass Spellcaster table as its source.

Facts established by grep before answering, not from folklore:

- **The third-caster table is in neither SRD.** "Eldritch Knight" and "Arcane
  Trickster": zero hits in SRD 5.1 and SRD 5.2.1. Even the PHB multiclass
  clause "a third of your Fighter or Rogue levels" is absent — the SRD 5.2.1
  multiclass Spell Slots rule counts only full casters and "Half your levels
  (round up) in the Paladin and Ranger classes". The PHB EK/AT table as a
  *source* is therefore off-limits under D59/D191.
- **The table's numbers are fully derivable from CC-BY text.** The Multiclass
  Spellcaster table is in SRD 5.2.1 (its own example: caster level 5 → four
  level-1, three level-2, two level-3 slots). Recipe: **caster level =
  one-third your Monk level, rounded up; read that row of the Multiclass
  Spellcaster table, columns 1–4.** Every row of the draft's table verified as
  an exact match: ceil(3/3)=1 → 2; ceil(6/3)=2 → 3; ceil(7/3)=3 → 4/2;
  ceil(13/3)=5 → 4/3/2; ceil(19/3)=7 → 4/3/3/1. "Rounded up" is our own design
  choice — it is what makes slots exist at Monk 3 when the subclass arrives.

Rationale recorded — two independent layers: (1) a slot progression is a game
mechanic outside copyright (17 U.S.C. §102(b), *Baker v. Selden*) — no
protectable expression in the numbers; (2) the clean-room layer the project
actually relies on — the table is independently generated from licensed SRD
5.2.1 content by a stated one-line formula, so the PHB containing the same
numbers is a fact about arithmetic, not about copying.

The half-caster alternative was assessed and declined: the Paladin/Ranger
progression is licensed verbatim, but it is a different chassis — 2nd-level
slots at Monk 5, 3rd at 9, 5th-level slots at 17 (reintroducing what the
refresh ruling just abolished), fifteen total slots at 17 against ten. The
legal delta is the difference between "verbatim licensed" and "derivable from
licensed by one line of arithmetic", which layer (1) makes close to nothing.

Applied: the derivation recipe and SRD 5.2.1 citation added as a design note
under the slot table in `cc-by/2026-08-03-monk-barbed-court.md`. The note is
written to survive the pending full rewrite.

## 2026-08-07 — Barbed Court: Focus conversion becomes slot REFRESH — native slots only, no 5th-level slots; rate/row-alignment/action still open

Owner's rulings, verbatim — first the rate directive rejecting the
long-rest-refresh option, then the model change:

> Once per long rest is too weird to match with short rest point refresh. Make
> the cost 2 and it will be more useful at higher levels.
>
> Or come up with a sliding scale (ex 1point - 1st level, 3/2,5/3,…) brainstorm
> and play around with the numbers

> Also, make it so that we are spending points to refresh spell slots, so no
> more 5th level spell slots and we are limited by the 1 leveled spell per turn

Effect — the conversion no longer *creates* slots, it **regains expended slots
from the monk's own third-caster table**. Highest slot ever: 2nd at Monk 7, 3rd
at 13, 4th at 19. Superseded by construction: the 2nd/3rd/5th cap ladder, the
5th-level ceiling at Monk 17, and the "converted slots only upcast" clause —
there is nothing above the native table to cap. The burst limiter the owner
named is native SRD 5.2.1 law, quoted: *"On a turn, you can expend only one
spell slot to cast a spell"* (One Spell with a Spell Slot per Turn); the doc
need only not contradict it.

Two open ambiguities from earlier entries die with the model: whether a
converted slot raises what can be *prepared* (preparation now follows the
native table), and the 5th-level nova (top effect at Monk 17 is a 3rd-level
slot, so casting volume stops being the dangerous number).

**Correction to this session's own arithmetic, recorded at full length:** the
daily figures previously reported for the creation model — 9/11/10 castings at
Monk 6/11/17 — were wrong in the design's favour. They divided the *daily*
Focus total by the slot cost, silently banking Focus across short rests; Focus
refreshes *to* Monk level and does not accumulate, so the correct method is
3 × floor(pool ÷ cost) and the correct figures were 9/9/9. The same division
error appears in the 2026-08-06 entries ("13 third-level castings at Monk 13"
— actually 12; "10 fifth-level castings at Monk 17" — actually 9). Those
entries stand as written per the append-only rule; this paragraph is the
correction.

Rate exploration run at the owner's direction (creation model, then refresh
model). Creation model: ×2 through ×5 collapse to a cliff — ×2 and ×3 are
mechanically identical (one top-tier casting per window at every tier), ×4/×5
make the printed caps unreachable in principle. Refresh model at the two live
rates, castings/day of the top native slot (native + 3 windows of refreshes),
theoretical ceiling with the pool uncontested:

| Monk | Top slot | Native | ×2 flat (2/4/6/8) | Odd (1/3/5/7) |
|---:|---|---:|---:|---:|
| 6 | 1st | 3 | 12 | 21 |
| 7 | 2nd | 2 | 5 | 8 |
| 11 | 2nd | 3 | 9 | 12 |
| 13 | 3rd | 2 | 8 | 8 |
| 17 | 3rd | 3 | 9 | 12 |
| 19 | 4th | 1 | 7 | 7 |

Recommendation reversed under the new model and the reversal recorded: the odd
scale's virtue (a 5th-level slot at half-pool) is unemployed with no 5th-level
slots, and its 1-point 1st-level refresh yields 21 castings/day at Monk 6.
**×2 flat recommended** — one clause, "2 Focus Points per level of the slot
regained". The *Shield*-for-1-Focus identity is dead under refresh either way
(the spell is cast with a slot; Focus only regains the slot afterwards).

**The structural coupling from the realignment entry breaks, and the break is
the open decision.** Refresh cannot regain a slot level the table has not yet
granted, so the granted Court Spells rows go dead on arrival: the Monk-6 row
(2nd-level) is castable at 7, the Monk-11 row (3rd) at 13, the Monk-17 row
(4th) at **19**. Options put to the owner: (a) move the granted rows to the
slot-arrival levels 3/7/13/19 on the SRD Paladin-oath pattern (recommended —
features stay at 3/6/11/17, only the spell grants move; partially walks back
the realignment ruling for this one table and needs the owner's word); (b)
keep 6/11/17 and accept 1–2 level dead windows, worst at 17→19 which most
tables never see; (c) downshift the row contents, which costs *Compulsion*
outright (recommended against).

**Still open to close this ruling: the rate (×2 recommended), the granted-rows
fix (a recommended), and the refresh's action cost (Bonus Action per the SRD's
own Font of Magic pattern recommended — the tension with Flurry does real
balancing work).** Doc text unchanged pending those three; the model itself is
settled.

## 2026-08-07 — ki and Focus Points are one resource; the Psionic Fist doc brought to full OGL compliance

Owner's rulings, verbatim:

> Make sure to fulfill all section 15 requirements under the ogl for the psionic
> fist monk

> Treat ki and focus points as 2 different names for the same thing

### Ki = Focus Points

Recorded as a project-wide equivalence, not a per-document note: they are one
resource renamed between rules revisions. `way-of-the-psionic-fist.md` continues
to say *ki* in its rules text, because that is the name used by the revision it
targets, and a new commentary subsection states the equivalence so a table on
the newer revision can read every "ki point" as its own term with no other
change. The pool equals Monk level, returns on a short rest, and funds the same
competing options under either name.

The equivalence was deliberately placed in the **declared non-Open-Game-Content
commentary** rather than the rules text. Naming a rules term to state an
equivalence is not reproduction of expression — a two-word term carries no
copyright — and it is not a §7 claim of compatibility with a trademark, since it
names a resource rather than a product. Keeping it out of the OGC portion means
the licensed rules text never references a term from the CC-BY-only revision.

Cross-document consequence: the Barbed Court's Focus-to-slot conversion and this
subclass's ki-cost manifestation are the same mechanic in two vocabularies.

### OGL compliance audit

The document was audited clause by clause against the licence text rather than
assumed compliant. **Three real gaps were found and fixed:**

1. **§10 — the licence was not embedded.** The document pointed at
   `OGL-1.0a.txt` in the same folder. §10 requires "a copy of this License with
   every copy of the Open Game Content You Distribute", and a sibling file does
   not travel with a document that is copied out of the repo. The full licence
   text is now reproduced verbatim in the document.
2. **§2 — no notice was affixed.** §2 requires a notice indicating the Open Game
   Content may only be Used under the licence. Added at the head of the
   document.
3. **§8 — the declaration was incomplete.** It named the commentary sections but
   did not exclude the embedded licence text, which the source documents state
   expressly *"is not Open Game Content"*, and it did not positively identify
   what *is* Open Game Content. The declaration now separates three categories:
   the licence text, our commentary, and the rules content offered as OGC.

**§6 — the Section 15 placeholder is filled.** OGL §6 requires title, copyright
date and copyright holder's name for original Open Game Content. It was
completed from the repository's own git identity (Derrick Schoen) rather than
invented. **The owner must confirm this is the name they intend to publish
under**; it is the one item in this entry that a session cannot verify for
itself.

Verified passing after the fixes, each checked against the source files rather
than from memory: the §2 notice; the 3.5 and 5.1 copyright notices reproduced
exactly as published, diffed against `srd-3.5/Legal.txt` and
`srd-5.1/ogl-page.txt`; both OGL 1.0a notice variants ("Inc." and "LLC"); our
own §6 entry; the §8 boundary; no Product Identity anywhere outside the required
Section 15 notices; no trademark-compatibility claim; the full licence embedded
verbatim with all fifteen sections and END OF LICENSE; and the Section 15 chain
in cumulative source order.

## 2026-08-06 — CC-BY stays for non-OGL subclasses; the Psionic Fist ships OGL against SRD 5.1

Owner's ruling, verbatim:

> Ok, keep the cc-by license for all subclasses not based on ogl material.
>
> We put the panic fist conversion under the ogl in the ogl folder and target
> srd 5.1 and avoid any srd 5.2 only mechanics

("panic fist" read as Psionic Fist.) This settles the MIT question in the entry
below: **MIT is declined, CC-BY stands** for everything in `cc-by/`, including
the Veteran and the Barbed Court. The measurement that MIT would have been
low-risk is left on the record, unused.

The conversion takes **Route D** from `ogl/LICENSING.md` §6.

### Applied

- `ogl/srd-5.1/` — SRD 5.1 fetched from Wizards' own server, **OGL edition**
  (`media.wizards.com/2016/downloads/DND/SRD-OGL_V5.1.pdf`, 4,857,826 bytes,
  SHA-256 `d3f94417…`). The CC edition was also retrieved and checksummed for
  the record but deliberately **not** used: taking 5.1 under CC-BY would
  reintroduce the mixing problem the quarantine exists to prevent, and only the
  OGL edition carries the licence and Section 15 chain in the document.
- `ogl/SECTION-15.md` — extended with the 5.1 chain, read verbatim from the
  PDF's own licence page. Recorded oddity preserved rather than tidied: the 3.5
  chain says "Wizards of the Coast, **Inc.**" and the 5.1 chain says "Wizards of
  the Coast, **LLC**".
- `ogl/way-of-the-psionic-fist.md` — the conversion. Monastic Tradition at
  3/6/11/17: Psionic Powers (five powers known, manifested by spending ki equal
  to the power's level, max power level 1st/2nd/3rd/4th), Psionic Fist at 6th,
  Greater Psionic Fist at 11th, Perfect Manifestation at 17th. Carries its own
  OGL §8 Open Game Content declaration and the full four-entry Section 15 chain.

### Conversion decisions worth recording

- **Power points became ki, not a second pool.** The Monk already owns a
  Wisdom-flavoured personal resource; a parallel pool would be an imported-
  chassis mismatch. The source's binding constraint was power-point scarcity,
  and ki contention reproduces it — a 3rd-level power at Monk 11 costs three ki,
  which is a Flurry, a Dodge and a Stunning Strike foregone.
- **Three source clauses were dropped as 3.5 plumbing with no 5e referent:**
  the Monk-ability stacking clause (a multiclass patch; a subclass never leaves
  the Monk progression), the no-weapon-or-armour proficiency line, and the entry
  requirements.
- **The namesake was preserved.** The eponymous 3.5 *Psionic Fist* feat —
  expend focus for extra unarmed damage — became the 6th-level feature, and
  *Greater Psionic Fist* the 11th, so the subclass's name is earned by a
  mechanic rather than only by flavour.

### Verified against the source, not memory

Every chassis value was read out of `srd-5.1/srd-5.1-ogl.txt`: *"Ki save DC = 8
+ your proficiency bonus + your Wisdom modifier"* quoted directly; Martial Arts
die d4/d6/d8/d10 at 1/5/11/17; ki points equal to Monk level; Monastic Tradition
at 3/6/11/17; and all fifteen powers confirmed present. A reading caveat is
recorded in `srd-5.1/SOURCE.md`: the 5.1 PDF's two-column layout interleaves
across the gutter and its spell headers use soft hyphens, so the Section 15
chain reads as gibberish under `pdftotext -layout` and had to be re-extracted
page-by-page. Spell levels must not be inferred from adjacent text on the
spell-list pages.

### Open

- **Section 15's final entry is a placeholder.** OGL §6 requires title,
  copyright date and copyright holder's name for original Open Game Content.
  Guessing a legal name is not something this session will do; the owner must
  set it before the document is distributed.
- Componentless manifestation is the least-tested clause — it lets powers work
  while Silenced, grappled or restrained. Faithful to the fiction, unpriced,
  labeled amber with a stated fallback.
- No playtest. Status is "ready for design review only", as with every other
  draft.

## 2026-08-06 — licensing research: the SRD 5.1 route, the CC-BY question, Psionic Fist prior art, and MIT for two docs

Owner's questions, verbatim:

> Research Reddit and user forums about how people are handling making homebrew
> from ogl sources and making it 5.5 compatible. Do we really need to publish a
> subclass for 5.5 under the cc license?
>
> One way around would be to make the subclass for the 5e srd which I think was
> ogl.
>
> Research if someone already converted psionic fist to a 5e kink subclass

> My preference would be to publish the veteran and barbed court monk under the
> mit license if it does not cause legal risk

Findings written up in full in `ogl/LICENSING.md` §6–§9. Summary:

- **The owner's 5.1 idea is correct and becomes Route D.** Wizards' own SRD page
  states SRD 5.1 is released "under **both** the terms of OGL 1.0a and the
  Creative Commons Attribution 4.0 International", while "all new SRD versions
  will be released **exclusively** under Creative Commons". So a single OGL
  document may lawfully combine 3.5 SRD and SRD 5.1 Open Game Content, one
  licence, one Section 15 chain — no quarantine tension. **The catch is
  decisive: SRD 5.1 is the 2014 rules.** Ki points not Focus Points, no Weapon
  Mastery, no 2024 Monk. Route D yields a 2014-compatible subclass and cannot
  be made 5.5-compatible, because every 2024 term lives only in the CC-BY-only
  SRD 5.2.
- **Mixing is the known trap, and the folder quarantine is the standard
  answer.** Product Identity has no CC-BY equivalent, and CC-BY-4.0
  §2(a)(5)(B) forbids imposing additional terms that restrict the licensed
  rights. Community reading: treat the two as separate agreements over separate
  material and there is no problem; put one work under both and it is a
  quagmire. D176's physical split already implements this.
- **CC-BY is not compelled for a 5.5 subclass** — only for documents that
  reproduce SRD 5.2 expression. Original text referencing 2024 rules by name is
  ours.
- **No prior conversion of the Psionic Fist to a 5e subclass exists.** Searched
  across homebrew hosts, wikis and forums. What exists is original psionic-monk
  design (Way of the Psion, Way of the Fifth Essence, the Battlemind in
  Re-Imagining Psionics, DMsGuild's Complete Psionics Handbook). The nearest
  article — d20collective's "5 Psionic Prestige Classes WotC should adapt into
  5e Subclasses" — was read in full and covers Illumine Soul, Illithid Slayer,
  Zerth Cenobite, Psicrystal Imprinter and Ectopic Adept, at concept level, and
  **does not include the Psionic Fist**. The niche is open.

### MIT — measured, not estimated

Both documents were diffed against `srd-5.2.1.txt` at n-gram level with the
licence notice excluded. **Zero verbatim SRD sentences of 12 words or more in
either.** Longest verbatim run: **10 words** in the Veteran ("you can use this
feature a number of times equal"), **13 words** in the Barbed Court ("table
shows how many spell slots you have to cast your level 1"). Both are 5e rules
boilerplate — a limited-use clause and a spellcasting-block sentence.

Conclusion: no meaningful protected SRD expression is present, CC-BY is not
legally compelled for these two, and **MIT on our own text carries low risk**.
Three caveats recorded: MIT is a software licence and needs a line defining what
"the Software" means for a design document (CC0 is the conventional choice for
prose); the SRD 5.2 notice should be kept regardless, because it is an
attribution statement rather than a licence grant and D59's posture is
"authorization, not copyright"; and the Barbed Court's 13-word run should be
rephrased, which costs nothing and removes the only available argument.

**Standing condition:** MIT holds only while these documents stay free of OGL
content. The Barbed Court was cleared against the full 3.5 SRD on 2026-08-06. If
either ever absorbs OGL material it moves to `ogl/` and MIT ceases to be
available, per OGL §2.

Not applied — the owner's preference is conditional on this assessment, and the
relicensing itself awaits their ruling.

## 2026-08-06 — homebrew/ split by licence; OGL quarantine built; Barbed Court cleared against the 3.5 SRD

Owner's rulings, verbatim:

> Make an ogl separate folder and include the 3 and 3.5 srd

> Maybe make subfolders for different licenses in homebrew.
> Put the psionic fist in the ogl subfolder with the 3 and 3.5 srd and the
> appropriate attributes and licenses.
> Put the non 3e/3.5 subclasses in a appropriately named folder as long as they
> do not have any ogl content in them

> Double check the barbed court monk for similarities to ogl prestige classes

> Maybe zip the rtf files

> Research how the license works converting an ogl prestige class into a 5.2
> cc-4 srd compatible subclass

**Scope note.** This session was framed "nothing outside `docs/homebrew/`". The
owner directed the work; placing the quarantine at `docs/homebrew/ogl/` rather
than `docs/ogl/` keeps it inside the session boundary and is permitted by D176's
own wording ("docs/ogl/ **unless implementation finds better**").

### Applied

- `docs/homebrew/cc-by/` — the ten subclass docs and inputs moved by `git mv`,
  with their relative SRD links repaired (`../srd/` → `../../srd/`). Carries
  CC-BY-4.0 and the SRD 5.2 notice; no OGL content, no Section 15 chain.
- `docs/homebrew/ogl/` — `OGL-1.0a.txt` (verbatim), `SECTION-15.md` (the
  copyright chain), `README.md` (quarantine rules), `LICENSING.md` (the research
  below), and `srd-3.5/` with the SRD zipped, its `Legal.txt`, the extracted
  Psionic Fist text, and a `SOURCE.md` carrying URL, size, SHA-256 and a
  re-derivation recipe.
- The 3.5 SRD was **fetched, not written from memory** — Wizards' own download
  paths are dead (404) and the Open Gaming Foundation's SRD page now reads only
  "This page is no longer maintained." The surviving official RTF distribution
  is the Internet Archive item `dnd35srd`; SHA-256
  `a8ccb96c8acbe0c9f70aaa04157433bb8f71f31cfcf6c74fc32043d88bab95ea`. Committed
  zipped per the owner's suggestion (2.3 MB rather than 20 MB expanded).

### Licensing research — the headline

**There is no conversion path. OGL content cannot become CC-BY.** OGL 1.0a §2:
"No other terms or conditions may be applied to any Open Game Content
distributed using this License." The 3.5 SRD's own legal file says permission is
granted "**solely** through the use of the Open Gaming License."

What is actually available is the idea/expression line: copyright does not
protect systems (17 U.S.C. §102(b)), so reusing a *concept* and writing original
expression never triggers the OGL, while reusing *text, names, tables or number
sequences* does. Three routes, set out in full in `ogl/LICENSING.md`: clean-room
concept-only shipping CC-BY (what D193 did for Waking Will); genuine adaptation
shipping OGL and staying in the quarantine; or building native from SRD 5.2.1
alone.

One finding worth flagging: **"Psionic Fist" is Open Game Content, not Product
Identity.** The 3.5 SRD's legal file designates a specific PI list — D&D, d20,
beholder, illithid and so on — then says "all of the rest of the SRD is Open
Game Content." So the name is usable **under the OGL**, and unusable in a CC-BY
document.

### Barbed Court cleared against the 3.5 SRD

Checked by grepping the converted 3.5 SRD text, not from memory. Results:

- **No taunt or forced-attack mechanic exists anywhere in the 3.5 SRD.** The
  only match for "must attack" in the whole corpus is a cursed-item random
  effect in `MagicItemsVI`. The goad and the duel-binding have **no OGL
  prestige-class ancestor**.
- **No "AC bonus while unarmoured" prestige-class text matched.** The nearest
  analogues are Duelist's Canny Defense (Intelligence bonus to AC per class
  level, melee weapon required) and Dwarven Defender's Defensive stance
  (racial, alignment-gated, uses/day) — neither resembles Warding Image, which
  is a flat +2 conditioned on a creature being goaded.
- *Mirror image* and *displacement* appear only as monster spell-like
  abilities, never as a prestige-class feature.
- Psionic Fist itself: monk-ability stacking, power points, bonus psionic feats.
  No overlap with the Barbed Court's kit.

**Verdict: clear.** The Barbed Court has no similarity to any OGL prestige class
beyond the generic "martial character who also casts," which is a system and not
protectable expression. It stays in `cc-by/`.

### Outstanding

- The **3.0 SRD** was not obtained in this sitting. No zip survives on Wizards,
  the Internet Archive or the Wayback Machine; the only surviving copy is the
  Open Gaming Foundation's individual RTFs in the Wayback Machine, being fetched
  file-by-file. `ogl/srd-3.0/` is created but its contents and `SOURCE.md` are
  pending, and it will be recorded as partial if the set is incomplete.
- The Psionic Fist **conversion doc** itself is not written. The source extract
  is staged at `ogl/srd-3.5/psionic-fist.txt`; the owner must first pick a route
  from `ogl/LICENSING.md`, since Route A and Route B produce different documents
  in different folders under different licences.

## 2026-08-06 — Barbed Court: every progression row realigned to the 3/6/11/17 subclass levels

Owner's ruling, verbatim:

> I got the monk subclass levels wrong. Re align everything that was below 9 to
> 6 and everything 9 to 15 to 11 and anything 16 and above to 17

Interpretation stated explicitly, because one reading is impossible: features
already sitting at **Monk 3 stay at Monk 3**. A Monk gains its subclass at
level 3 and must have a feature there, so "below 9 → 6" is read as applying to
the *non-subclass* levels this design had been using — 7, 13 and 19, inherited
from the third-caster slot table — rather than sweeping level 3 into 6.

Applied to every progression row:

**Court Spells (granted, always prepared)** — was 3 / 7 / 13 / 19:

| Monk level | Court Spells |
|---:|---|
| 3 | *Shield*, *Dissonant Whispers*, *Command* |
| 6 | *Mirror Image*, *Misty Step*, *Silence* |
| 11 | *Hypnotic Pattern*, *Fear* |
| 17 | *Compulsion* |

**Focus-to-slot conversion cap** — was 6 / 7 / 13 / 17:

| Monk level | Highest slot you can create | Focus cost |
|---:|---:|---:|
| 6 | 2nd | 2 |
| 11 | 3rd | 3 |
| 17 | 5th | 5 |

**Chosen prepared spells** — increments snapped to the subclass cadence:
3 at Monk 3, 5 at Monk 6, 7 at Monk 11, 9 at Monk 17.

Consequence, and it is a good one — recorded because it changes the reading of
an earlier finding rather than merely restating it:

- **The realignment makes the conversion structural instead of a bolt-on.**
  Each granted Court Spells row now becomes castable exactly when the
  conversion tier that funds it arrives. The Monk-6 row is 2nd-level spells and
  native 2nd-level slots do not exist until Monk 7; the Monk-11 row is
  3rd-level and native slots arrive at 13; the Monk-17 row is 4th-level and
  native slots arrive at 19. In every case the Focus conversion is what makes
  the granted spell usable on schedule. Without it each row would sit dead for
  one to two levels.
- **The flip side, stated plainly:** the conversion is therefore running ahead
  of the third-caster chassis at every tier — one level ahead at Monk 6, two at
  Monk 11, four at Monk 17. That is the intended effect of the owner's
  level-6-loading directive, not an oversight, but it means the conversion can
  no longer be removed or repriced without leaving three granted spells
  uncastable.
- The open conversion-rate question (recorded below) is unchanged in kind but
  its cheapest tier now buys 2nd-level rather than 1st-level castings from Monk
  6: 18 Focus/day at Monk 6 buys **9 second-level castings**, against a Wizard
  6's three 2nd-level slots.

## 2026-08-06 — Barbed Court drops the Psionic Fist ancestry; a straight Psionic Fist conversion is commissioned separately

Owner's ruling, verbatim:

> I think this is now distinct from the psionic fist.
>
> Make a separate monk subclass that is a straight conversion of the psionic
> fist

**Part one — applied.** The concept-ancestry disclosure line is removed from
`2026-08-03-monk-barbed-court.md`. After the arcane-tank redesign the Barbed
Court is a Wisdom-cast abjuration/illusion taunt-tank with no self-buff
mind-body content; the disclosure would now be inaccurate rather than cautious.
The line approved 2026-08-05 is superseded.

**Part two — not applied; blocked on a path decision and outside this session's
scope.** Three findings, all from the decisions record:

1. **The commissioned artifact already exists.** D193 (2026-08-03) commissioned
   `2026-08-03-monk-waking-will.md` as "a fourth third-caster monk, the
   FAITHFUL adaptation of the 3.5 SRD Psionic Fist… Focus in the power-point
   seat, mind-body fusion identity." It ships CC-BY under an original name with
   a one-line ancestry disclosure, and it carries a full set of open
   OWNER-APPROVAL items in `pending-rulings.md`. A second doc on the same
   source would duplicate it unless the owner intends Waking Will to be
   retired or re-angled.
2. **D193 already anticipated this exact request and named the flip:** "the
   alternative — carrying the 'Psionic Fist' name as OGL-attributed content in
   the D176 quarantine folder — is the flip if the owner prefers name
   fidelity."
3. **A *straight* conversion cannot live in `docs/homebrew/`.** D176 is
   binding: "Any content derived-with-text or reused from OGL 1.0a sources
   lives under a dedicated folder (docs/ogl/…) containing the OGL 1.0a license
   text and the full Section 15 chain for exactly what that folder holds. The
   rest of the repo stays CC-BY/MIT with no OGL obligations." A straight
   conversion reuses subsystem mechanics by definition, so it is OGL-derived
   and must be quarantined. `docs/ogl/` does not exist yet, and this session is
   scoped to `docs/homebrew/` only.

Additional practical finding: **the repo contains no 3.5 SRD source.**
`docs/srd/` holds only `full/srd-5.2.1.txt`. A faithful feature-for-feature
conversion has nothing to check itself against, which is the accuracy failure
the clean-room process exists to prevent. A 3.5 SRD text would need to land in
the repo first.

Three paths were put to the owner: work Waking Will's open rulings as the
answer; build the OGL-quarantined straight conversion in a session scoped to
`docs/ogl/` after a 3.5 SRD source lands; or commission a third,
deliberately-differentiated psionics monk clean-room in `docs/homebrew/`.

## 2026-08-06 — Barbed Court: Focus-to-slot conversion starts at Monk 6

Owner's ruling, verbatim:

> Make the Focus→slot conversion start at Monk 6

Effect: conversion is a level-6 feature, not level 3 and not level 13. Combined
with the earlier 13/17 caps the ladder is:

| Monk level | Highest slot you can create | Focus cost |
|---:|---:|---:|
| 6 | 1st | 1 |
| 7 | 2nd | 2 |
| 13 | 3rd | 3 |
| 17 | 5th | 5 |

There is no 4th-level cap tier; 4th-level slots become creatable at Monk 17
when the cap moves to 5th. Converted slots still grant no new preparation
(ruling below) — they only upcast prepared level 1–4 spells.

Consequences:

- **This is a fifth thing landing at level 6**, alongside Court Forms, Warding
  Image, Spellwoven Strike and Unshaken Aim. That is consistent with the
  owner's directive to overload level 6 because most tables never reach 12+,
  and conversion is arguably the heaviest of the five.
- **Court Ward reopens as a question.** When conversion was assumed to start at
  Monk 3, "cast *Shield* for 1 Focus" was simply the general rule and the
  bespoke clause disappeared. With conversion at 6, levels 3–5 have no
  conversion, so either *Shield*-for-Focus waits until Monk 6 (one rule, no
  exception) or Court Ward returns as a level-3 exception. Recommended to the
  owner: drop Court Ward — *Shield* is on the Court Spells list at Monk 3 and
  castable with the two native slots, and Faces of the Court already carries
  the level-3 defence budget.
- **The rate remains the open exposure, and it now starts five levels earlier
  than the earlier entry measured.** Focus equals Monk level over three
  short-rest windows: 18/day at Monk 6 buying up to **18 first-level
  castings** against a Wizard 6's seven (four slots plus Arcane Recovery); 21
  at Monk 7 buying **10 second-level castings**; 39 at Monk 13 buying **13
  third-level castings** against a Wizard 13's three. The *Shield* case is
  self-limiting because the Reaction caps it at one per round regardless of
  supply; the multi-target upcast case is not.

## 2026-08-06 — Barbed Court: the provocation's form is the player's choice, spoken or physical

Owner's ruling, verbatim:

> Let the player decide if it is a spoken insult or one done with body language

Effect: the F14 Bounced Flavor Cheque raised when the hearing clause was
dropped is resolved without changing a mechanic. The goad's fiction is
player-declared — a spoken barb, a curled lip, a dismissive gesture — and no
rule gates on speech, language or hearing. The name **Warrior of the Barbed
Court** survives: courtly contempt is as often silent as spoken, so a
body-language reading is on-theme rather than a concession.

Consequences:

- The identity paragraph, open since the start of this session and twice
  invalidated by goad redesigns, is rebuilt around **provoke** rather than
  **expose**, with the player's choice of form stated in the text. Draft
  presented to the owner for approval at this sitting.
- Goading creatures that share no language with the monk, or that are mindless
  or deafened, is now flavour-consistent rather than an unexplained gap.
- The concept-only 3.5 SRD Psionic Fist ancestry line is unaffected and stands
  as approved 2026-08-05.

## 2026-08-06 — Barbed Court: the duel is a Focus-cost feature, not a spell (supersedes the Barbed Challenge draft)

Owner's ruling, verbatim:

> Changed my mind. Since compelled duel is not in the srd. Recreate it as a
> non-spell effect that costs focus. Do not put compelled duel in the spells
> known list.
>
> It should have the same effect as the spell, but has to be on a melee hit,
> not ranged and doesn't require concentration

Effect: the *Barbed Challenge* spell drafted in the entry below is **withdrawn**
before it was ever written into the doc. The duel returns to being the goad's
1-Focus option, gated on the melee hit that already triggers the goad. Nothing
is added to the spells-known or Court Spells list. This resolves the licensing
problem by construction — there is no longer any spell to name, grant, or seed.

Authored text, from SRD primitives only:

> **Level 3: Barbed Goad**
>
> Once each round, when you hit a creature with a melee attack, you can goad it
> until the end of your next turn. While goaded by you, the first attack roll it
> makes against a creature other than you on each of its turns has Disadvantage.
>
> When you goad a creature, you can expend 1 Focus Point to bind it to a duel
> with you. The creature makes a Wisdom saving throw against your Focus Point
> save DC. On a failed save, for 1 minute it has Disadvantage on attack rolls
> against creatures other than you, and it can't willingly move to a space more
> than 30 feet away from you.
>
> The duel ends early if you have the Incapacitated condition, if you end your
> turn more than 30 feet from the creature, or if you make an attack roll
> against a creature other than it. You can have only one creature bound in this
> way at a time.

Measured consequences, recorded not corrected:

- **Dropping Concentration removes the single largest bound the spell form
  had.** As a feature the duel now runs *alongside* *Blur*, *Hypnotic Pattern*,
  *Hold Person*, *Fear* or *Silence* rather than instead of one of them. It
  also no longer costs a Bonus Action, so the turn's Flurry survives, and it
  can no longer be Counterspelled or Dispelled.
- **The remaining bounds are the Wisdom save, and the single-target
  restriction.** "Ends if you make an attack roll against a creature other than
  it" is load-bearing and deliberate: a monk with six attacks a turn must spend
  the entire duel on one target, forgoing Topple spread and every other
  creature in the fight. That restriction, not the Focus cost, is what the
  player actually pays.
- **Value:** against a boss making three attacks a round, Disadvantage takes a
  65% hit chance to 42.25%, so a bound target prevents roughly **8.2 damage per
  round** — about 33 over a four-round fight — for **1 Focus Point**, plus the
  30-foot leash. The duration exceeds most fights, so this is effectively one
  Focus per encounter.
- **No repeat saves.** The spell form was bounded by Concentration instead; with
  Concentration gone and no end-of-turn save, one failed Wisdom save locks a
  creature for the full minute. Adding end-of-turn saves — the pattern the
  draft's own level-17 feature already used — was offered to the owner, not
  applied.
- **Level 17 still has no job.** Unanswerable Challenge was this effect at 3
  Focus with repeat saves and a leash; the whole payload now sits at level 3 for
  1 Focus. The capstone needs replacing.

## 2026-08-06 — Barbed Court: goad once per round; the duel becomes an ordinary spell; hearing clause dropped

Owner's rulings, verbatim:

> Goad once per round.
> Compelled duel is cast with normal rules
> Drop the hear and understand, most monk things are around hitting in melee

Effect:

- Barbed Goad fires **once each round**, not once on each of your turns. The
  distinction is deliberate and preserved: because the limit is per round
  rather than per turn, an Opportunity Attack can carry the goad, but only if
  the round's goad is unspent. This also preserves Scandalous Echo at level 11,
  which a per-hit trigger would have made worthless.
- The duel-binding effect is **cast as an ordinary spell**, with a normal
  casting time, saving throw, Concentration and end conditions, paid for with
  1 Focus Point rather than treated as a free feature rider.
- The "can hear and understand you" clause is **dropped**, on the owner's
  stated reasoning that Monk features are built around connecting in melee.

Licensing consequence — this one constrains the deliverable, not just the risk
labelling. The 2014 spell the owner is naming is **absent from SRD 5.2.1**, so
the doc cannot grant it: naming a spell whose text exists only in a non-SRD
book *is* using that book as a source, which D59/D191 forbids, and it could
never be seeded into app content either. The only legal route is an original
subclass spell with our own name and wording delivering the same function. The
draft below is authored from SRD primitives:

> **Barbed Challenge**
> *Level 1 Enchantment*
> **Casting Time:** Bonus Action · **Range:** 30 feet · **Components:** V, S ·
> **Duration:** Concentration, up to 1 minute
>
> Choose one creature you can see within range. It makes a Wisdom saving throw.
> On a failed save, it is bound to you for the duration: it has Disadvantage on
> attack rolls against creatures other than you, and it can't willingly move to
> a space more than 30 feet away from you.
>
> The spell ends early if you have the Incapacitated condition, if you end your
> turn more than 30 feet from the target, or if you make an attack roll against
> a creature other than the target.

Measured consequences, recorded not corrected:

- **Casting it as a spell adds three real bounds the feature version had none
  of:** it costs a **Bonus Action**, which for a Monk is the Flurry of Blows /
  Patient Defense / Step of the Wind slot, so binding a target costs the turn's
  Flurry; it takes **Concentration**, so it competes with *Blur*, *Hold
  Person*, *Hypnotic Pattern*, *Fear* and *Silence*; and it can be
  Counterspelled or Dispelled. This is a materially better-priced version of
  the same effect.
- The "ends if you attack another creature" clause is the load-bearing
  balancer and is kept deliberately. Without it the monk could lock a boss and
  then freely attack elsewhere.
- **Ruling H is now load-bearing.** If Focus-to-slot conversion begins at Monk
  3 with a 1st-level cap, then "1 Focus casts *Barbed Challenge*" and "1 Focus
  casts *Shield*" are both simply the general conversion rule, and Court Ward
  disappears as a special case. If conversion stays at 13/17 only, the subclass
  needs two bespoke 1-Focus casting exceptions instead. Recommended to the
  owner: start conversion at Monk 3.
- **F14 Bounced Flavor Cheque, raised for the owner.** With the hearing clause
  gone and the trigger a melee hit, no mechanic in the subclass involves speech
  any more, while the subclass is named for a court of insults and its whole
  identity paragraph is built on verbal taunting. The identity text — already
  awaiting a rewrite from earlier in this session — now needs rebuilding around
  a physical, not verbal, provocation, or the name needs to change.
- Dropping hearing removes the goad's only natural immunities: deafened,
  mindless and language-less creatures are now goadable.

## 2026-08-06 — Barbed Court: the goad triggers on a melee hit; 1 Focus buys the duel-binding effect

Owner's ruling, verbatim:

> Make goad on melee hit. 1 point to cast compelled duel

Effect: Barbed Goad stops being a save-gated verbal taunt and becomes an
on-hit rider. The 1-Focus "sharpen" option is replaced by the full
duel-binding effect the owner has asked for twice.

**Licensing, restated because the phrase recurs in owner instructions.**
"Compelled Duel" is a non-SRD 2014 spell and is **absent from SRD 5.2.1**
(grep-verified). Under D59/D191 it may be named as a distance marker only,
never used as a source or mechanical template, and it will not appear in the
subclass doc. The effect is expressed in original wording built from SRD
primitives (Disadvantage, a Wisdom save, a distance clause, Concentration).

Measured consequences, recorded not corrected:

- **The goad becomes effectively automatic.** With a 65% hit chance the
  probability that at least one melee attack connects in a turn is 95.7% at
  Monk 3 (three attacks), 99.5% at Monk 6 (five) and 99.8% from Monk 11 (six).
  The Wisdom save is gone, so nothing resists it.
- **Warding Image's price defence is void.** The +2 AC was justified as
  conditional, averaging about +1.2 AC at roughly 55–65% goad uptime. At ~99%
  uptime it is a **flat, unconditional +2 AC from Monk 6**, against SRD *Shield
  of Faith*, which charges a 1st-level slot, a Bonus Action and Concentration
  for the same bonus. Likewise Court Ward's "while a creature is goaded by
  you" gate on *Shield*-for-1-Focus is now nominal.
- **The goad loses range and gains reliability.** A melee-hit trigger means the
  monk can no longer taunt at a distance, and the "can hear and understand
  you" clause becomes mechanically inert — deafened, mindless and
  language-less creatures were the goad's only natural immunities and are
  immune no longer unless the clause is deliberately kept.
- **Three collisions the ruling creates**, put to the owner rather than
  resolved in session:
  1. The 1-Focus sharpen is superseded by the duel effect.
  2. **Level 17's Unanswerable Challenge was the duel effect** — 3 Focus, one
     minute, Disadvantage on attacks against others, 30-foot leash. Moving that
     to a 1-Focus level-3 option leaves the capstone with no job.
  3. If the goad fires on *every* melee hit rather than once per turn, a
     six-attack turn can goad up to six creatures, which makes **Scandalous
     Echo** — 1 Focus for one extra target at level 11 — pointless.
- Retained by construction: *Shocking Grasp* is a melee spell attack, so it
  still delivers the goad provided the clause reads "melee attack" rather than
  "melee weapon attack." The earlier no-save *Shocking Grasp* delivery rider is
  now redundant and folds away.

## 2026-08-06 — Barbed Court: Scandalous Echo keeps its first paragraph only

Owner's ruling, verbatim:

> Keep the first paragraph for scandalous echo only

Effect: the shared-sharpening clause is cut. Level 11 is the second-target
carry and nothing else. Under the taunt goad the feature reads:

> When you goad a creature with Barbed Goad, you can expend 1 Focus Point to
> carry the taunt to a second creature of your choice within 30 feet of the
> goaded creature that can hear you. Until the start of your next turn, that
> creature is also goaded by you.

The trailing exposure clause in the draft's first paragraph ("the first attack
roll made against it has Advantage") goes with it — the goad's effect is
defined once at level 3 and Echo inherits it, per the rule-stated-once
standard. The rework floated in this session (free sharpening at 11, a Focus
refund when a goaded creature hits you) is declined by this ruling.

Recorded, not corrected:

- **Level 11 is now the thinnest slot in the kit** — one clause, 1 Focus, one
  extra target. This is consistent with the owner's stated rationale that most
  tables never reach level 12+ and the subclass must be competitive by level 6,
  but it is a deliberate low point rather than an oversight.
- The second goaded creature receives only the **baseline** taunt (its first
  attack each turn against a creature other than you has Disadvantage); the
  1-Focus sharpen still applies to the original target alone.
- The incoming-damage exposure stands as measured: a second goaded creature at
  Monk 11 is roughly **+18 damage per round aimed at the monk**, bought with
  the player's own Focus. It is an opt-in tank risk, owner-ruled, sitting on
  top of *Mirror Image*, Warding Image's +2 AC, *Shield*, and Topple's Prone.

## 2026-08-06 — Barbed Court: converted slots grant no new preparation, only upcasting

Owner's ruling, verbatim:

> Converting focus points to spells does not let you prepare new spells. Just
> get the slots to let you upcast prepared 1,2,3,4 lvl spells up to fifth level

Effect: the Focus-to-slot conversion creates slots only. The level of spell a
Barbed Court monk may **prepare** is still governed by the third-caster slot
table (3rd level from Monk 13, 4th from Monk 19), so a converted 5th-level slot
can only be spent upcasting a prepared level 1–4 spell. This closes the
preparation ambiguity flagged in the conversion entry below: *Hold Monster*,
*Dominate Person*, *Mislead*, *Wall of Force* and every other level 5 spell
remain out of reach.

Measured consequence, recorded because it materially lowers the risk this
session had flagged as the design's largest number:

- **Most of this kit's signature spells do not upcast at all.** *Shield*,
  *Mirror Image*, *Misty Step*, *Silence*, *Hypnotic Pattern*, *Fear* and
  *Compulsion* have no higher-level clause, so paying 5 Focus for a 5th-level
  slot buys them exactly what 1–3 Focus already bought. The 5th-level cap is
  close to a trap for the granted list.
- **Damage upcasts are also a bad trade**, because two base-level casts beat
  one upcast at this rate: *Fireball* is 8d6 (28) for 3 Focus against 10d6 (35)
  for 5; *Dissonant Whispers* is 3d6 (10.5) for 1 Focus against 7d6 (24.5) for
  5. A rational player never upcasts for damage.
- **Multi-target upcasts are the one live use, and they are genuinely strong:**
  *Command* affects one additional creature per slot level above 1 (5 targets
  at 5th) and *Hold Person* one per level above 2 (4 targets at 5th). Three to
  four of those a day at Monk 17 is a real 5th-level-tier control button.
- **The remaining exposure is the rate, not the cap.** At 1 Focus per spell
  level with Short Rest recovery, Monk 13 still converts 39 Focus/day into as
  many as **13 third-level castings**, against a Wizard 13's three 3rd-level
  slots. The Monk-17 tier is largely self-limiting after this ruling; the
  Monk-13 tier is not. The bound question stays open.

## 2026-08-06 — Barbed Court: the school names are guidance, not a restriction; Misty Step kept

Owner's ruling, verbatim:

> Keep misty step. School names were guidelines

Effect: "basically abjuration, enchantment and illusion spells" was flavour
direction, not a rules gate. The player's Wizard-list choices are **not**
school-restricted, and *Misty Step* (Conjuration) joins the granted Court
Spells. This supersedes the school clause proposed in the chooseable-list
entry below, and closes the *Misty Step* question and the Distance Checklist
rule #1 amendment together.

Findings recorded, not corrected:

- **Scope.** Without the school gate the subclass is a Wisdom-based caster with
  access to the entire Wizard list at its slot levels. No SRD third-caster has
  unrestricted access to a full arcane list; the school restriction was the
  only thing holding the design to a thematic slice. Combined with the Monk-17
  conversion to 5th-level slots, a Barbed Court monk can prepare and cast
  *Fireball*, *Counterspell*, *Wall of Force*, *Greater Invisibility*, *Haste*,
  and *Fly* — none of which are in the stated theme and none of which the
  earlier power-budget worksheet priced.
- **Distance Checklist rule #1 is now formally void.** It read "the fixed list
  is a bardic pressure, mockery, and social-control slice rather than a general
  arcane list." The list is now a general arcane list by owner ruling. The rule
  is rewritten to a flavour guideline in the doc rather than deleted, so the
  record shows what changed and when.
- The bard-list grant keeps its purpose: nine in-school spells remain
  bard-but-not-wizard (*Bane*, *Command*, *Dissonant Whispers*, *Heroism*,
  *Calm Emotions*, *Enthrall*, *Silence*, *Zone of Truth*, *Compulsion*) and
  are reachable only through the granted Court Spells table.
- The two free Wizard cantrip picks now carry no school caveat, so *Fire Bolt*
  or *Ray of Frost* is an ordinary choice and the Unshaken Aim close-combat
  clause is reliably live.

## 2026-08-06 — Barbed Court: Faces of the Court kept; Vex replaced with Topple; Court Cantrips capped at one cantrip per turn

Owner's ruling, verbatim:

> Keep the mirror image. Replace vex with topple. Keep the court cantrips but
> add that you can only cast one cantrip per turn.

Effect on three open items, all now closed:

- **Faces of the Court stays** — innate *Mirror Image* at Monk 3, PB free casts
  per Long Rest, alongside the granted Court Spells row. The defence budget is
  therefore *Mirror Image* + Warding Image (+2 AC) + *Shield*, owner-ruled.
- **Court Forms menu is Nick / Slow / Topple.** The F5 Advantage-Faucet
  objection to Vex is resolved by removal, not by a cap.
- **Court Cantrips is capped at one cantrip per turn**, which removes the
  stacking ceiling of two (Focus rider plus an Action cast or replaced attack).

Measured consequences, recorded not corrected:

- **Topple is not a downgrade from Vex; it is a sideways move that trades
  self-accuracy for party accuracy and defence.** SRD Topple: on a hit, a
  Constitution save (DC 8 + the ability modifier used for the attack roll +
  Proficiency Bonus) or the target has the Prone condition — DC 17 at Monk 11,
  DC 19 at Monk 17. With six attacks per turn (2 + Nick + Flurry 3) the target
  is Prone about 90% of the time by end of turn. Prone grants Advantage to
  **every** melee attacker rather than only the monk, imposes Disadvantage on
  the prone creature's own attack rolls, and taxes half its movement to stand;
  against it, ranged allies attack at Disadvantage. It also synergises with the
  taunt: a goaded creature that comes for the monk arrives Prone, attacking at
  Disadvantage into +2 AC and *Shield*. Benchmark: Warrior of the Open Hand's
  Open Hand Technique offers Prone only on Flurry hits and only with a save;
  Topple here applies to every attack.
- **Slow is now the dead option.** Prone strictly exceeds a 10-foot,
  non-stacking Speed reduction for a subclass whose goal is to keep the target
  adjacent. The live menu is Nick (damage) versus Topple (control); Slow needs
  a reason to exist or should be dropped.
- **The cantrip cap brings Court Cantrips inside the guideline band.** Measured
  against a full at-will turn including the Nick strike, one free cantrip
  (*Chill Touch*) is worth 19% of the turn at Monk 3, 22% at 6, 22% at 11 and
  26% at 17 — under the 25–33% band for a substantial rider at every tier
  except the top, where it sits at the low end. The earlier +38% figure omitted
  the Nick attack and allowed two cantrips. No move to level 6 is needed.
- **Spellwoven Strike is now largely redundant** and is flagged, not changed:
  with one cantrip per turn, spending Focus and taking the free rider strictly
  beats giving up an attack for the same cantrip. Its only live use is a turn
  on which no Focus is spent. As a level-6 feature it is thin; replacing it was
  offered to the owner.

## 2026-08-06 — Barbed Court: spellcasting becomes a chooseable Wizard list plus granted Court Spells; Focus converts to spell slots at 13/17

Owner's rulings, verbatim:

> Let 1/3 caster spells come from the wizard list and the player can choose just
> like ek/at.

> Give extra spells known from the bard list and the important ones like shield
> and mirror image to help reinforce the theme. Have the spells that can be
> spent with focus points also given I. The spells known section. I am ok with
> giving spells known to this subclass like the paladins and ranger also get

> For monk 13, let the player exchange focus points for spell slots(1 point per
> spell level, max 3rd level)
> For 17 raise the limit to 5th level

Effect: the curated fixed list frozen by D191 is **withdrawn**. Spellcasting
becomes two parts — a player-chosen Wizard-list pool, plus a granted
always-prepared Court Spells table on the SRD Paladin-oath / Ranger-subclass
pattern carrying the bard-list picks and the thematic guarantees (*Shield*,
*Mirror Image*). The Monk-13 Focus-castable spell menu proposed earlier is
superseded by a general Focus-to-slot conversion at 1 Focus Point per spell
level, capped at level 3 from Monk 13 and level 5 from Monk 17.

Findings reported at ruling time, recorded not corrected:

- **Licensing.** Eldritch Knight and Arcane Trickster are **not in SRD 5.2.1**
  (grep-verified, zero hits). Under D59/D191 they may be named as distance
  markers only, never used as a source or mechanical template — their prepared-
  spell tables and wording cannot be copied. The structure the owner asked for
  has SRD-native precedents that the doc will cite instead: Bard **Magical
  Secrets** ("you can choose any of your new prepared spells from the Bard,
  Cleric, Druid, and Wizard spell lists, and the chosen spells count as Bard
  spells for you"), College of Lore **Magical Discoveries**, and the **Magic
  Initiate** feat. The always-prepared subclass table follows the SRD Paladin
  oath pattern the owner named.
- **The bard grant is narrower than it looks.** Nine in-school spells exist on
  the bard list and not the wizard list: *Bane*, *Command*, *Dissonant
  Whispers*, *Heroism* (level 1); *Calm Emotions*, *Enthrall*, *Silence*,
  *Zone of Truth* (level 2); *Compulsion* (level 4). Everything else the owner
  named — including *Shield* and *Mirror Image* — is already on the Wizard
  list and therefore already chooseable; putting those two in the granted
  table guarantees them rather than adding them.
- **The conversion rate is the largest number in the design.** SRD Font of
  Magic prices slots at 2/3/5/6/7 Sorcery Points for levels 1–5, and Sorcery
  Points return only on a **Long Rest**. Focus Points equal Monk level and
  return on **every Short Rest**. At 1 Focus per spell level: a Monk 13 with two
  Short Rests has 39 Focus/day, buying **13 third-level slots**, against a
  Sorcerer 13's 3. A Monk 17 has 51 Focus/day, buying **10 fifth-level slots**,
  against a Sorcerer 17's 3 — and against a Wizard 17's 2 printed fifth-level
  slots. Bound options were put to the owner; none applied.
- **Self-consistency gain.** At 1 Focus per spell level, "cast *Shield* for 1
  Focus Point" is exactly the conversion rate rather than a special exception,
  which resolves the open Shield-for-Focus pricing ruling by construction.
- **Open ambiguity flagged:** whether a converted slot also raises the level of
  spell a Barbed Court monk may *prepare*. If it does, Monk 17 unlocks
  5th-level Wizard spells (*Hold Monster*, *Dominate Person*, *Mislead*,
  *Modify Memory*, *Seeming*), six levels ahead of the third-caster chassis.
- **Distance Checklist rule #1 is broken by this ruling** — it reads "the fixed
  list is a bardic pressure, mockery, and social-control slice rather than a
  general arcane list." A school-restricted but player-chosen Wizard list is a
  general arcane list. The rule needs an owner-ruled amendment.

## 2026-08-06 — Barbed Court: power-budget directive — front-load level 6, add Focus-cast high-level spells at 13/17, remove close-combat ranged Disadvantage

Owner's rulings, verbatim:

> I want to eliminate the disadvantage on ranged spell attacks as well. Give
> some free high level spells that cost a focus point at 13 and 17. The monk
> needs a lot of help to keep up with paladins and fighters.

> I want to load up level 6 more than usual because most don't see level 12+ so
> that fighters and paladins aren't overpowering what the monk can do

Effect — three bindings, all raising the subclass's power budget deliberately:

1. **Stated design intent, now on the record:** this subclass is allowed to sit
   above the Monk's usual budget, because the owner judges the Monk behind the
   Paladin and Fighter. The guidelines' comparators still get measured and
   reported; they no longer function as a ceiling. This supersedes the "adds no
   damage die, attack, armor, or save-DC bonus" posture in the draft's
   power-budget section.
2. **Level 6 is deliberately overloaded**, with the reason recorded: most
   tables never reach level 12+, so the subclass's competitiveness has to be
   delivered by level 6 rather than at 11/17. This resolves the open ruling on
   level-6 feature count — the deviation from the SRD Monk corpus (one named
   feature per subclass level; four proposed here) is **approved by design
   rationale, not overlooked**.
3. **Close-combat ranged Disadvantage removed.** SRD "Ranged Attacks in Close
   Combat" reads: "When you make a ranged attack roll with a weapon, a spell,
   or some other means, you have Disadvantage on the roll if you are within 5
   feet of an enemy who can see you and doesn't have the Incapacitated
   condition." The subclass cancels that.
4. **Focus-cast high-level spells at Monk 13 and 17.** Higher-level spells
   castable for 1 Focus Point instead of a spell slot, at Monk levels 13 and
   17 — levels the third-caster slot table already advances on, so this is
   printed as a clause of the Spellcasting feature rather than a new feature
   slot.

Findings reported to the owner at ruling time, recorded not corrected:

- The close-combat clause is **inert against the current spell grants**. All
  three granted cantrips are Touch or Self (*Shocking Grasp*, *Chill Touch*
  melee spell attacks; *True Strike* Self), and the curated
  abjuration/enchantment/illusion list is saves and utility — SRD 5.2.1 has
  **no ranged-attack cantrip in those three schools** on the wizard or bard
  list. As written the clause only bites on thrown Monk weapons (Dagger,
  Handaxe, Javelin, Light Hammer, Spear are Simple Melee with Thrown) and on
  ranged attacks acquired elsewhere. F14 Bounced Flavor Cheque risk; the fix
  (grant an out-of-school attack cantrip) was offered, not applied.
- **Focus-cast spells break the draft's own Delivery Distance rule #2**, which
  states "no Focus-to-upcast, concentration-scaled strike damage, or
  Focus-bought spell menu exists." A Focus-bought spell menu is precisely what
  this is. The distance checklist needs an owner-ruled amendment, the way
  Faces of the Court already amended it once.
- Uncapped, "1 Focus Point" is not a bound: Focus equals Monk level and returns
  on a Short Rest (33 points/day at 13, 51 at 17 across three windows). The
  cost that actually binds is a per-rest use limit; the specific limit is the
  open ruling.

Implementation (which spells, which use limit, and the exact level-6 roster)
was presented to the owner with numbers at the same sitting and is pending
approval; the directives above are settled.

## 2026-08-06 — Barbed Court: Unarmed Strikes gain the Light and Finesse properties so Nick works

Context: the owner opened a fundamental redesign of the Barbed Court (arcane
tank: abjuration/enchantment/illusion list, *Shield* for Focus, taunt goad,
weapon-mastery choice on Unarmed Strikes, cantrip engine). During the
brainstorm both reviewers confirmed that **Nick as printed does nothing on an
Unarmed Strike** — Nick relocates "the extra attack of the *Light property*,"
and Unarmed Strikes have no Light property, so there is no attack to relocate.
Martial Arts' Bonus Action Unarmed Strike is a separate class permission and is
not the Light-property attack.

Owner's ruling, verbatim:

> Give the unarmed strikes the light and finesse properties so that it can use
> nick to free up the bonus action

Effect: the subclass grants Unarmed Strikes the Light and Finesse properties.
Nick becomes live. Two clauses must be printed explicitly for the chain to
function, because the SRD wording does not cover fists:

- Two Unarmed Strikes count as **different Light weapons** for the Light
  property (the SRD requires "a different Light weapon" for the extra attack).
- *True Strike*'s material component exception (already required) is unchanged.

Measured consequences, recorded not corrected:

- The Light property's extra attack **adds no ability modifier to damage**
  (SRD, verbatim). The Nick attack is therefore a bare Martial Arts die:
  expected +2.3 / +2.9 / +3.6 / +4.2 damage per turn at Monk 3/6/11/17 at a
  65% hit rate — about **53% of a normal Unarmed Strike** (d10+5 = 6.8 expected
  at Monk 11). It is a real extra attack, not merely a freed Bonus Action:
  Martial Arts already gave the Bonus Action strike for free, so the net is
  **+1 attack per turn** (3→4 free attacks at Monk 5, 5→6 with Flurry at 10+).
- **Finesse is redundant for the Monk itself** — Dexterous Attacks already
  allows Dexterity on Unarmed Strikes. What Finesse adds is that an Unarmed
  Strike becomes a Finesse-weapon attack, and **Rogue Sneak Attack requires
  "a Finesse or a Ranged weapon."** A Rogue/Monk 3 dip can therefore apply
  Sneak Attack to Unarmed Strikes, including Flurry strikes. Labeled F3
  amber-high; the guard (a clause limiting the properties to this subclass's
  own features) was offered to the owner, not applied.
- The ruling makes the Court Forms mastery menu closer to a real choice: Nick
  +3.6/turn at Monk 11 against uncapped Vex +7.4. Vex still wins roughly 2:1
  uncapped; capped to the first hit per turn (+2.4) Nick becomes the damage
  pick. The Vex cap remains an open ruling.
- Bound worth noting: at Monk 3, replacing the Attack action's only attack with
  a cantrip means no Light-weapon attack was made, so no Nick attack follows.

## 2026-08-05 — Barbed Court: EXPOSURE goad adopted, monk included; Challenge goes Disadvantage

Resolving the goad redesign floated in the previous entry. Rulings,
verbatim:

- Exposure goad (Advantage against the goaded creature; baseline first
  attack, sharpened = every attack for the round) — "Yes, monk included."
  The allies-only F5 guard was offered and declined; the monk's own attacks
  share the Advantage. F5 Advantage-Faucet is now the kit's primary labeled
  risk (VM-in-Flurry can advantage the Flurry's own remaining strike from
  level 6), owner-ruled, labeled not changed.
- Unanswerable Challenge (17) — "Disadvantage (Recommended)": its attack
  rolls against targets other than you have Disadvantage for 1 minute,
  repeat end-of-turn Wisdom saves, hearing/Incapacitated outs, one target.
  Replaces the per-attack d12 subtraction for table speed.

Consequences applied to the doc: identity paragraph redrafted around
"expose" (needs re-approval — the prior approval covered the
choice-pressure identity); Scandalous Echo's text inherits the exposure
effect (its 30-ft/Focus structure keeps its approval); the goad-magnet
survivability rationale softens (nothing aims the foe at the monk any
more) while Faces of the Court stays as ruled; the vs-others form and its
2026-08-05 morning ruling are superseded by this entry.

## 2026-08-05 — Barbed Court approvals round: identity, 6, 11 approved; 17 to flat/Disadvantage; goad direction reopened

Rulings, verbatim:

- Identity paragraph, concept-ancestry line, and the "Faces of the Court"
  feature name — "Approve all three."
- Spellwoven Flurry (6) text + Vicious Mockery note — "Approve as written."
- Scandalous Echo (11) — "Approve as written."
- Unanswerable Challenge (17) — "Make it a flat penalty or disadvantage to
  keep it faster to play at the table." (Rolling a Martial Arts die per
  enemy attack is the objection; the redesign lands in a follow-up ruling.)

Immediately after, the owner floated a goad redesign (same message thread,
verbatim): "Bard vicious mocker and bane reduce attacks against everyone.
Dissonant whispers and command force movements or incapacitate. I kind of
like the idea of making the enemy confused or reckless and giving allies
advantage on attacks against it when goaded." Direction under discussion at
recording time: the goad may flip from penalizing the target's attacks on
others to granting allies Advantage against the target — which would reopen
the just-approved identity wording and Scandalous Echo's inherited text.
Resolution recorded in the next entry once ruled.

## 2026-08-05 — Barbed Court survivability: goad stays vs-others; free Mirror Image PB/Long Rest at 3

Context: the owner raised "the monk is not durable enough to be a tank for
enemies damage" against the Barbed Court goad's attack-me incentive, then
directed "Can we do something with mirror image to help survivability?
Maybe a single target bane."

Rulings, verbatim answers in order:

- Reshape Barbed Goad to a single-target-Bane form (penalty on all attack
  rolls)? — "No, keep vs-others only." The choice-pressure identity stays.
- Mirror Image on the level-7 spell row? — "Not as a spell because it comes
  in too late for a 1/3 caster." It arrives as a level-3 feature instead.
- Delivery shape — "Free Mirror image prof bonus times per long rest."

Effect: the level-3 bundle gains an innate-casting feature: Mirror Image
always prepared, castable without a slot PB times per Long Rest (2 uses at
Monk 3 rising to 6 at 17). This is an owner amendment to the D190-frozen
level-3 bundle. Sibling-overlap note due in both monk docs: duplicates are
the Ten Selves' engine centerpiece; here they are printed defense only.
The goad-gated free Patient Defense option was then declined — "No —
Mirror Image is enough." Survivability rides on the images alone; the
dodge idea is dropped. Follow-on risk noted at recording time: the free
casts scale with Proficiency Bonus (character level), so a 3-level dip
exports PB-scaling free Mirror Images — labeled F3 amber in the doc, not
changed.

## 2026-08-04 — Veteran: Master of Experience uses the BROAD reading (all 18 skills)

Asked: whether Master of Experience (17) grants Expertise only in already-
proficient skills (~9 natively) or implies proficiency in every skill first.
Owner's answer: "Broad: all 18 skills" — the feature grants proficiency in
every skill first, then Expertise in all, matching the superseded D196
Skill Mastery intent. Applied to the doc as a one-sentence proficiency
grant preceding the owner's verbatim Expertise sentence.

## 2026-08-04 — VETERAN: owner-authored full kit replaces the Executioner draft

Interrupting the session's follow-up questions, the owner supplied the
complete subclass themselves. The text below is the ruling, verbatim and
owner-frozen in its entirety — name, identity, and every feature. It
supersedes the Executioner kit (D194–D196 arc): the once-per-round boundary
is now the level-3 drawback "Too Old for This" (on-turn only), the doubled
pool stays at 9, the old level-3 19–20 critical range moves to level 13 and
becomes 18–20 at 17, and D196's Skill Mastery / floor-15 features are
replaced by the level-13 and level-17 blocks below.

> # Veteran
>
> Veterans survive through practiced technique, broad experience, and the
> ability to perform reliably under pressure. Some are retired soldiers,
> seasoned scouts, professional adventurers, bounty hunters, or survivors
> who have learned a little about nearly everything.
>
> A Veteran rarely relies on luck. Their attacks find vulnerable openings
> even when they fall short, and their years of experience eventually make
> them capable in almost any situation.
>
> ## Level 3: Seasoned Professional
>
> You gain proficiency in one skill of your choice.
>
> ## Level 3: Too Old for This
>
> You can only deal Sneak Attack damage on your turn. You cannot apply
> Sneak Attack on reactions or any effect outside your turn.
>
> ## Level 3: Deuces Are Wild
>
> When you roll damage for a weapon attack or Sneak Attack, you can reroll
> any damage die that shows a 2. You must use the new roll.
>
> ## Level 3: Sure Strike
>
> Once per round, on your turn, when you miss a creature with an attack
> using a Finesse or Ranged weapon, you can deal your Sneak Attack damage
> to that target as if the attack had hit, provided all Sneak Attack
> requirements are met.
>
> You must be able to see the target, and the attack must not have been
> made with disadvantage. You must also satisfy all normal conditions for
> Sneak Attack (including that you have not already dealt Sneak Attack
> damage this turn).
>
> The damage dealt by this feature has the same type as the weapon's normal
> damage.
>
> ## Level 9: Veteran's Strike
>
> Your Sneak Attack damage dice are doubled.
>
> For example, if your Sneak Attack is normally 5d6, it becomes 10d6.
>
> This applies to your Sneak Attack dice pool in all cases, with no
> exceptions.
>
> Using Cunning Action or any other bonus action feature does not increase
> the opportunity cost of Sneak Attack; you still only expend Sneak Attack
> once per turn as normal.
>
> ## Level 9: Extensive Experience
>
> You gain proficiency in two skills of your choice.
>
> In addition, choose two of your skill proficiencies. You gain Expertise
> in those skills.
>
> You can choose skills in which you gained proficiency from this feature.
>
> ## Level 13: Veteran Reflexes
>
> When a creature you can see hits you with an attack, you can use your
> reaction to increase your Armor Class by a number equal to your
> proficiency bonus, potentially causing the attack to miss.
>
> You can use this feature a number of times equal to your proficiency
> bonus, and you regain all expended uses when you finish a long rest.
>
> ## Level 13: Critical Instincts
>
> Your weapon attacks score a critical hit on a roll of 19–20.
>
> ## Level 13: Fighting Style
>
> You adopt a particular style of fighting. Choose one Fighting Style
> option from the Fighter class. You can't take a Fighting Style option
> more than once, even if you later gain another.
>
> ## Level 17: Master of Experience
>
> You gain Expertise in every skill in which you don't already have
> Expertise.
>
> ## Level 17: Heightened Lethality
>
> Your weapon attacks score a critical hit on a roll of 18–20. This
> replaces the Critical Instincts feature you gained at 13th level.
>
> ## Level 17: Blindsight
>
> You gain blindsight out to a range of 10 feet.

Effect: the design doc is rebuilt around this kit as an owner-frozen input;
the session's job is honest math and labeled risk, not rebalance. One
wording question left open for the owner (recorded in the doc's wording
notes): whether Master of Experience implies proficiency in every skill —
SRD Expertise attaches to skills you are proficient in, and the Veteran
reaches roughly nine proficiencies without outside sources, so the strict
and broad readings differ across about half the skill list.

## 2026-08-04 — Rogue rename to VETERAN; new level-3 miss-Sneak engine; ribbon and level 17 to be redrafted (SUPERSEDED same day by the full owner kit above)

Owner opened a refinement pass on the Executioner (all four areas: name &
identity, feature names/wording, level 17, mechanics). Rulings, verbatim:

- Name question — owner's answer: "Veteran. I want top focus more on
  guaranteed outcomes. level 3, apply sneak attack damage if you miss as
  long as you can see the target and do not have disadvantage"
- Weapon Reader — "Replace with a reliability ribbon" (session drafts
  candidates for owner pick).
- Practiced Certainty (17) — "Replace — show me alternatives" (session
  drafts 2–3 simpler capstone options against the budget).
- "Something mechanical" — "Nothing specific" beyond the above.

Effect: subclass renamed Executioner → Veteran; identity re-centers on
guaranteed outcomes. A new OWNER-SPECIFIED level-3 engine exists: Sneak
Attack damage applies on a miss when the rogue can see the target and the
attack roll lacked Disadvantage (owner-frozen mechanic; wording, once-per-
round/turn interaction, and its relationship to the frozen 19–20 critical
range to be settled in follow-up). Weapon Reader and Practiced Certainty
are withdrawn pending replacement drafts.

## 2026-08-04 — Monk seed-scope call DEFERRED to seeding time

Asked (second round, after the record search below confirmed no buried
ruling): which monk subclasses seed as app content vs. one taking D169's
replace-EK/AT slot.

Owner's answer (via the supervision record, pasted as the ruling): "defer
the seed-scope call to seeding time ... and let the homebrew session proceed
through the per-doc mechanics rulings in pending-rulings.md first — you'll
know far more about which designs survive review when the seeding decision
actually gates something. If you'd rather settle it now, the record best
supports: one bake-off winner takes the D169 slot, the others remain
published docs, with Waking Will ruled on separately."

Supporting context the answer supplied: nothing is seedable yet regardless
(all four drafts sit at "ready for design review only"); the bake-off packet
was structured to pick one winner; Waking Will was commissioned separately
under D193 and can be ruled on its own terms.

Effect: seed-scope stays OPEN, re-asked at seeding time, not before. It
leaves the active session queue; the per-doc mechanics rulings proceed.

## 2026-08-04 — All four monk working names approved (D169 name clause closed)

Asked: "Which working names are approved as final under D169? (Leave one
unselected and add a note if you want it renamed.)"

Owner's answer, verbatim: "Warrior of the Barbed Court, Warrior of the Ten
Selves, Warrior of the Hundred Knots, Warrior of the Waking Will" — all four
selected, none left out, no rename notes.

Effect: the four subclass names are final. The bake-off's three "Working
name — owner approval pending under D169" markers and the Waking Will draft's
name marker are resolved; identity paragraphs, curated lists, feature text,
and all other OWNER-APPROVAL items remain open.

Same round, the seeding question (D191's open flag: all monks seeded as app
content, or one takes D169's replace-EK/AT slot, and which) was answered
"you look for it" — searched `.claude/decisions.md`, `.claude/pending-questions/`,
and both prior session logs; no existing ruling found (D191 recorded it OPEN
and nothing later touches it). Re-presented to the owner; still open.
