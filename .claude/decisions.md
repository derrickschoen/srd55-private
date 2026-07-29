# Binding scope decisions

## D61 — OWNER: background is REQUIRED, and its feat and ability increases are the player's to choose (2026-07-28)

**The ruling.** *"We should require that every character have a background.
Remember to make an option for the player to customize the origin feat and the
asi because the srd is too restrictive about what combinations of feat and
ability scores are allowed."*

Two rulings. The second is a deliberate departure from the SRD and is recorded as
one, not smuggled in as a feature.

**1. Every character has a background. It is required, not optional.** The
guided builder does not offer a skip, and a character without one is incomplete
rather than merely unfinished. This is stronger than the step order in D55, which
only said where background sits.

**2. The Origin feat and the ability-score increases are CHOSEN BY THE PLAYER,
not dictated by the background.**

In the 2024 rules a background hands you a fixed package: a specific Origin feat,
and +2/+1 (or +1/+1/+1) spread over three named abilities. The owner's judgement
is that the allowed combinations are too restrictive, and the app will not
enforce them.

- The player picks the **Origin feat** from the available origin feats — not only
  the one their background prints.
- The player assigns the **ability increases** themselves.
- The background's printed feat and abilities remain visible as **what the SRD
  suggests**, because that is genuinely useful and is also the licensed content
  we are showing. They are a default and a reference, never a constraint.

**This narrows D11**, and the narrowing is the owner's to make. D11 says the
builder BLOCKS an SRD-illegal choice while import stays tolerant. A feat and
ability spread the SRD does not pair is now a **legal choice in this app**. D11
continues to govern everything it governed before; it no longer reaches the
origin feat/ASI pairing. **Label the deviation where a person can see it** —
someone comparing their sheet against a rulebook must be able to tell that this
combination is ours and not the SRD's.

**Consequence worth stating before it bites: this makes the provenance question
urgent.** Ability scores are six NOT NULL columns defaulting to 10. Once the
background writes increases into them, **two different sources are writing the
same six numbers** — the (unbuilt) abilities step and the background — and
nothing records which contributed what. Without provenance, "what is my base
Strength" becomes unanswerable and re-applying or changing a background cannot
subtract what it added. This is the same provenance record already flagged as
collapsing four of the fourteen forecast blockers; D61 promotes it from
worthwhile to load-bearing.

*Taken for now:* the in-flight A5 dispatch lands as scoped — background copied,
everything unapplied disclosed. **Feat and ASI customization is its own unit
(A5b) immediately after**, because it needs the provenance decision and A5 does
not. *Cost to flip:* fold it into A5 and enlarge a dispatch that is already the
one most likely to ship as a lie.

---

## D60 — OWNER: v1 has no users and no exports, so backward compatibility is not a constraint (2026-07-28)

**The ruling.** *"There are no existing exports, this app has never been used by
a person."*

**This corrects a premise I reasoned from, and the correction is wider than the
thing that prompted it.**

The immediate case: `creation_uuid`, the column that would have given guided
creation real double-submit protection. I dropped it, and told the owner it broke
the backup codec "in both directions". Two reviewers had found three objections
and I repeated all three as though they were equally solid:

1. A **new** export would carry the column and fail `assertExactKeys` on import.
   **Still true, and still a real bug** — export producing something import
   rejects is broken regardless of who has used the app.
2. An **old** backup document would lack the column and fail `assertRowShape`.
   **Void.** There are no old documents. This was the half that made the
   objection sound fatal, and it rested on users who do not exist.
3. Re-importing while the original exists would hit the UNIQUE constraint.
   **Still true**, and a design question rather than a blocker.

Objections 1 and 3 are both answered by one decision a reviewer had already
proposed and I did not carry forward: **make the column non-portable** — the
export projects it away, so nothing carrying it ever reaches import. That is a
projection in the backup export plus the migration itself.

**The general rule, which is the part worth keeping:**

> v1 has zero users, zero real characters and zero exports in existence. An
> argument of the form "this would break existing documents" is **void in v1
> until a real person creates a character.** Wipe-and-reseed is available.

This is the same ground v2-D8 already stands on, and it applies to v1 for the
same reason. It does **not** license breaking round-trips, losing user data once
users exist, or shipping an export that its own importer refuses — those are
defects on their own terms, which is exactly why objection 1 survives and
objection 2 does not.

**What I got wrong, precisely.** Not the decision to drop the column from the
dispatch that was finally making the wizard exist — that sequencing still looks
right, since the migration drags in a drizzle file, snapshot and journal
metadata, a regenerated schema, regenerated column facts and an append-only
checksum registry. What I got wrong was the *reason I gave*: I presented a
compound objection as though every part held, and one part was resting on users
who have never existed. The owner had to supply a fact I already had.

**Taken for now: real double-submit protection lands as its own unit, after the
wizard reaches background and lineage spells.** *Seam:* the migration plus one
projection in the backup export. *Cost to flip:* say the word and it moves ahead
of A5. Until then the class card disabling on submit is the only guard, and the
worst case is a duplicate character the person can delete.

---

## D59 — OWNER: the test is AUTHORIZATION, not copyright (2026-07-28)

**The ruling.** *"I only care about unauthorized works ending up in the git repo.
SRD and other attribution licenses are fine."*

**This corrects D58's wording, which was mine and was wrong.** D58 said
"copyrighted content must never be committed". That is overbroad to the point of
being useless: SRD 5.2 is copyrighted. So is every MIT-licensed dependency. The
question was never whether a work carries copyright — it is whether **we are
authorized to redistribute it**.

**The rule, corrected:**

> Never commit a work we are not licensed to redistribute.

Licensed and therefore fine, in git, permanently:

- **SRD 5.2 under CC-BY-4.0**, with its attribution notice intact — this is the
  whole basis of `docs/srd/**` in both repositories and it was never in doubt.
- **Other attribution-style licences** — CC-BY-SA where compatible, MIT,
  Apache-2.0. This restores D3's original test: bundle content whose licence's
  obligations we actually meet.

Not licensed and therefore never committed: Player's Handbook text and anything
else we hold no redistribution right to. A user importing their own copy into
their own browser is untouched by this — D58 already settled that everything
outside git is not a licensing concern, and that stands.

**What actually changes: nothing in the tree.** `docs/srd/**` was compliant under
D3, under D57, under D58's intent, and under this correction. The attribution
requirement is unchanged and remains binding — an attribution licence is only
satisfied while the attribution is present, which is why v2-F1 exists and why the
notice check in chunk 1's guard is not decoration.

**Recorded because the wording mattered.** Taken literally, D58 would have
condemned the SRD extracts this project is built on. It was caught in the same
conversation and cost nothing. Left standing, it was the kind of rule a later
reader obeys precisely and destroys something with.

---

## D58 — OWNER: the only licensing concern is what lands in git (2026-07-28)

**The ruling.** *"We only need to worry about copyrighted works ending up in our
git repo. Everything else, I don't care. Just can't have it in my personal
GitHub account."*

**This narrows D57, and supersedes the part of it I drew too wide.** D57 already
moved the line from "imported content" to "who is doing the distributing", and
put a share link on our side because we hand it to a third party. The owner has
now drawn it tighter still, and the test is no longer about distribution at all:

**The whole rule: copyrighted content must never be committed to the
repository.** That is the hard stop, and it is the only one licensing has.

What follows, stated plainly so nobody re-derives a stricter rule from first
principles later:

- **Not a licensing concern:** what the user imports, what they export, what a
  share link carries, what the running app renders, or what sits in an
  uncommitted working tree or a build directory. The owner has said, in these
  words, that they do not care.
- **Still a concern, unchanged:** `docs/srd/**` and any bundled rules text in
  either repository. Those are committed, so they are squarely inside the rule
  and stay CC-BY SRD 5.2 with attribution intact.
- **The standing hard-stop item is rewritten to match.** It was "non-SRD-5.2
  content entering either repo". It now reads: **committing copyrighted content
  to git.** Same intent, a smaller and more checkable surface.

**One factual note, offered once and not re-litigated.** A share link is a
distribution channel: content in a link travels to whoever opens it, and that is
a different exposure from a GitHub account. The owner's ruling is recorded as
given and governs the work; this note exists so that the choice is visible as a
choice rather than an oversight, and one sentence from the owner retires it.

**Practical consequence for the tooling.** `tools/assert-dist-clean.mjs` guards
the build output, which D58 says is not a licensing concern. It is cheap, it
already passes, and removing a working guard to satisfy a narrowing is the wrong
direction — it stays, reclassified from licensing gate to hygiene check.

---

## D57 — OWNER: the import ban is about what WE ship, not what the user holds (2026-07-28)

**The ruling.** *"The rule for no imported rules is for development env only. I
can't have it end up in git for GitHub distribution. End user can have whatever
data they want."*

**This resolves the D3 ↔ D46 collision**, which had sat open as a question and
which two separate audits flagged as a genuine A↔A contradiction. It does not
pick a side; it draws the line in a different place than either ruling did, and
the line is *who is doing the distributing*.

**Binding, and narrower than D3 read:**

1. Imported rules text must never reach **the repository, git, or the built
   distribution**. That is the whole of the concern: this project is published
   from GitHub, and shipping someone else's rules text is the thing that cannot
   happen.
2. What the **end user** holds, imports, exports, or saves locally is **their
   own data and their own business**. A full JSON export carrying the homebrew
   they imported themselves is the user handling their own files, not us
   redistributing anything. D46 stands as written.
3. A **share link we mint** is on our side of the line, because we are the ones
   handing it to a third party. D3 continues to govern it.

The practical test, for anyone reading this later: *would this content travel
because WE published it, or because the USER moved their own file?* Ours is
banned. Theirs is not our business.

---

## D56 — OWNER: package-only equipment, lineage spells are real, straight level-up before multiclass (2026-07-28)

Three rulings from one batch.

**1. Starting equipment is the PACKAGE ONLY. No gold alternative.** *"Starting
equipment: package only, no gold."* The SRD offers a class/background equipment
package or a gold sum to buy from; the wizard offers the package and does not
offer the gold. This is a scope reduction and it stands until reversed — the gold
path is not deferred-and-tracked, it is simply not in the product for now.

**2. Lineage spells MUST actually be granted.** *"I think we should be able to
give spells that are sourced from species lineage."*

This raises the bar on the species step. The plan I had written applied a species
by copying template rows, and disclosed that lineage spells were NOT granted
because the grant machinery reads `species_definitions.grant_rules` and nothing
in the repository has ever written a `species_definitions` row. Disclosure is no
longer sufficient: the spells have to arrive.

**What it costs, measured rather than guessed.** The machinery is present and
working — `GrantRuleSlotGenerator` resolves a source type to its definition
table and reads `grant_rules` (`src/grants/grant-rule-slot-generator.ts:345-370`),
and the class path uses it today. What is missing is the bridge, which the design
has always called "designed and never built": seed `species_definitions` rows
carrying `grant_rules`, write a `character_source_instances` row when a species is
applied, then call the existing generator. Three pieces, none of them new
machinery.

*Taken for now, reversible:* this lands as its own unit **immediately after** the
wizard's first five dispatches, NOT folded into the species step. The species
step's template-copy path is proven and lands first; the lineage bridge is
additive on top of it. Sequencing it this way means the wizard exists while the
bridge is built, rather than the bridge blocking the wizard. *Cost to flip:* fold
it into the species step and accept a larger, riskier single dispatch.

**3. Straight-class level-up comes BEFORE multiclass level-up.** *"Defer multi
class level up until straight class level up is finished."*

This is sequencing, and it does not amend D49 — the wizard still handles
multiclassing with a warning rather than a refusal when it gets there. It orders
the work: a person must be able to take a normal level 2 in the wizard before any
effort goes into multiclass entry. The multiclass prerequisite question — whether
the class primary-ability rule becomes structured so an illegal choice can be
blocked (D27 versus D49) — is therefore **not urgent**, and is parked rather than
pressed.

---

## D55 — OWNER: no Roll in Order, abilities come after class, random character is shelved (2026-07-28)

**The ruling.** *"Drop the roll in order and have the wizard do ability scores
after class selection. Shelve the goal that there should be a button to generate
a random character."*

Three things, and the third is what makes the first two clean.

**1. Roll in Order is GONE.** Not moved, not deferred — dropped. This settles the
D47 ↔ D50 collision that three independent readers each resolved differently and
that had been sitting open as a question to the owner. D47 offered four ability
methods including Roll in Order; D50 cut the deliberate builder to three and
parked Roll in Order in random creation. **Neither survives as written.** The
deliberate builder offers the methods that remain — standard array, point buy,
and manual entry — and Roll in Order is not one of them anywhere.

**2. Random character generation is SHELVED.** The "generate a random character"
button is off the goal list. Shelved, not forbidden: nothing may be built that
makes it harder later, but nothing is built for it now. This is what removes Roll
in Order's last home, which is why the two rulings arrived together.

**3. Ability scores come AFTER CLASS SELECTION**, amending D48's step order.
The order becomes:

    class → abilities → species → background → skills → equipment

D48 put abilities after background. The owner has moved them up to sit directly
behind class, and the reason is plain once Roll in Order is gone: if a player
allocates scores deliberately rather than rolling them blind, knowing the class
is exactly what tells them where the numbers go. Choosing first and learning the
class afterwards is the ordering that only made sense when the dice went first.

**The consequence I am flagging rather than burying.** In the 2024 rules the
+2/+1 ability increases ride the BACKGROUND, which now comes after the abilities
step. So the numbers a person sets on the abilities screen are **base scores, and
they are not final** — the background will raise two of them later.

*Taken for now, reversible:* the abilities step allocates base scores only and
says so on the screen; the background step applies its increases on top; the
sheet shows the total. The alternative — hold the abilities step until after
background so the person sees final numbers immediately — would put the step back
where D48 had it and contradict this ruling, so it is not taken. *Cost to flip:*
step order plus one screen's copy. No schema, no data.

**What this does NOT decide**, and remains open: whether the wizard offers the
SRD equipment package or the gold alternative or both, and whether guided
creation needs real double-submit protection. Those are separate questions.

---

## D54 — OWNER: v1 is NOT frozen. Finish it on its current trajectory, to USABLE (2026-07-28)

**The ruling.** *"My intention is to finish v1 based on its current trajectory
and then compare once v2 is done. I may end up liking parts of v1 better, but I
need it usable."*

This REVERSES the freeze. v1 is an active track again, developed on its own
trajectory — not retrofitted toward v2's architecture, because the point is to
have two genuinely different things to compare. v2's rulings (its D1..D8) do NOT
bind here; this file remains v1's law.

**THE BAR IS "USABLE", and that is a higher bar than "green".** v1 is green
today — 139 files / 2290 vitest, build exit 0, 75 Playwright — and still cannot
be used to make a character without expert knowledge of the planner grid. Green
measures the code; usable measures the person holding it.

**Taken for now, as the working definition — reversible, one owner sentence
flips it:** v1 is usable when a person who knows D&D but not this app can, in
one sitting and without hitting a dead end:

1. create a character and choose a class first (D48);
2. get through level 1 with the choices the SRD actually requires — species,
   background, skills, ability scores, starting equipment;
3. level up, including a multiclass level, with the wizard warning rather than
   refusing (D49);
4. read a sheet whose numbers are right, with anything unknown shown as unknown
   rather than guessed (D33);
5. not lose the character on reload.

Anything not on that list is polish for this purpose, however much it is wanted.

**What this makes the queue.** The largest unbuilt thing is still the guided
builder and level-up wizard (D11, D42) — and the blocker audit of 2026-07-28
found that most of what was reported as owner-blocked was not: two independent
reviewers classified 12 to 14 of 16 items as decidable from rulings already in
this file. That audit is the work list. Items 1 and 2 of the guided-builder
design (route and step engine; transactional class-first materialisation) are
unblocked and are the front door.

**The one genuine owner question that remains**, named independently by both
auditors as the single most-unblocking answer: **when does a weapon get the
"relies on True Strike / Shillelagh / Pact of the Blade" badge?** It sits behind
a pure policy seam, so work proceeds with the strict-improvement default and the
badge worded "better with", reversible at zero data and wire cost.

**Comparison, not convergence.** v1 must NOT be reshaped to resemble v2 while
this runs. If v2's design turns out better the owner will say so after seeing
both; a v1 quietly rebuilt in v2's image would destroy the comparison this
ruling exists to enable.

## D53 — OWNER: feats are two numbers plus a grouping, and I had the level-4 rule wrong (2026-07-28)

Asked how to store a feat's category, the owner redesigned instead of picking:
*"Maybe a number for level requirement instead of Boolean. Another for if the asi
is 0, 1, or 2. Not sure why fighting style needs its own category."* Then, when I
argued the app must exclude Alert at level 4: *"you can choose Alert at level
4—but you don't also get +1 Dexterity. Put the origin feats in a separate
category with a warning about the lack of asi."*

### MY PREMISE WAS WRONG, and the source says so

I built a whole question on "the builder must not offer Alert at level 4". The
level-4 class feature reads:

> *You gain the Ability Score Improvement feat (see "Feats") or ANOTHER FEAT OF
> YOUR CHOICE FOR WHICH YOU QUALIFY.*

Origin feats carry no prerequisite, so a character qualifies. Alert is a legal
level-4 pick. I asserted a rule from inference rather than reading the class
feature, which is the same failure F27 is about, committed by me while writing
about it.

### The model

- **`min_level`** — a number, replacing the boolean. General feats 4, Epic Boon
  19, Origin and Fighting Style none. This collapses two of the four SRD
  categories into one field, because General and Epic Boon ARE the same thing at
  different levels: in 2024 an Epic Boon is taken in place of a General feat.
- **`ability_points`** — 0, 1 or 2. Origin feats grant 0 (verified: none of
  Alert, Magic Initiate, Savage Attacker or Skilled contains an ability
  increase). Grappler grants 1. Ability Score Improvement grants 2 — and 2 is
  POINTS, not increases, which is what makes it cover the SRD's actual wording:
  *"Increase one ability score by 2, or increase two ability scores by 1"*, cap
  20.
- **`prerequisites`** — already exists, and it is where the Fighting Style gate
  belongs: *"Prerequisite: Fighting Style Feature"*. It also holds Grappler's
  *"Strength or Dexterity 13+"*.
- **A grouping for Origin feats**, with a warning that they grant no ability
  increase.

### Fighting Style needs no category, and the owner was right to push

Its gate is a class FEATURE, not a level and not a kind. `prerequisites` already
expresses that. A Fighter who has the Fighting Style feature QUALIFIES for
Archery at level 4 and may take it there; a Wizard does not qualify and never
sees it. The prerequisite does all the work, so a category value for it would be
a second expression of a fact already stored — F22's shape.

### The warning is broader than Origin, and that is correct

The owner asked for the warning on origin feats. Measured, it belongs on
`ability_points = 0`, which is Origin **and** Fighting Style: a Fighter taking
Archery at level 4 also gets no ability increase, and should be told so for the
same reason. Driving the warning off the number rather than the grouping makes it
right in a case the instruction did not name.

### Left open, deliberately

Whether the grouping carries all four SRD names (`origin | general |
fighting_style | epic_boon`) or only distinguishes origin from the rest. Using
the source's four costs nothing and matches the document; using two is smaller.
Nothing is blocked on it — the builder's behaviour is identical either way.


## D52 — OWNER: the wizard refuses homebrew classes, and no real character exists yet (2026-07-28)

Two rulings.

### 1. *"Wizard does not build homebrew class."*

The design's own risk section had already found why this is the honest answer:
`ClassProficiencyLookup` deliberately grants NOTHING when a class has no seeded
proficiency rows, rather than guessing "simple". So a user's imported homebrew
class has no provable armour or weapon proficiencies, and the builder — which
BLOCKS an SRD-illegal choice under D11 — cannot tell legal from illegal for it.

A wizard that equipped a homebrew class would be inventing its proficiencies.
Refusing is the same instinct as D33's "a disclosed wrong number is still a wrong
number".

**The tolerance is unaffected.** D11's other half stands: a homebrew class still
IMPORTS, still opens, still works in the planner grid. The wizard declines to
guide it; nothing declines to hold it.

### 2. *"No person has made a character with this tool. Scrap or update any incompatible characters used in tests."*

This retires the question of retrofitting existing characters to the wizard —
there are none. Every character in the repo is a test fixture.

**What this licenses:** changing or deleting fixture DATA whose shape no longer
fits. A fixture character built by the blank-create path that D42 §2 replaces,
or one with no class under D48, can be rebuilt or dropped.

**What it does NOT license, and the distinction is AGENTS.md's own:** deleting a
TEST to reach green. A test may be deleted when its SUBJECT is gone, never to
make something pass. Scrapping an incompatible fixture is fine; scrapping the
assertion that used it because the assertion now fails is not. If a fixture is
rebuilt and its test then fails, that failure is information.

Nor does it license regenerating an expectation from our own output. The fixture
may change; where its expected values came from may not.


## F27 — the class progression numbers LOOK sourced and are not: a citation is doing a checksum's job (2026-07-28)

Asked to explain why I was unsure the builder could enforce per-class spell
counts, I checked instead of speculating. The answer is worse than "not
extracted".

**The numbers exist and are bundled.** `class_progressions` carries
`cantrips_known` and `prepared_count` per class per level
(`schema.sql:519-534`), seeded from a `ClassSeed` literal in
`src/rules/class-progression-lookup.ts` with `cantrips: readonly number[]` and
`prepared: readonly number[]`.

**They are not sourced the way every other SRD number here is.** They are a
hand-written TypeScript literal. The file header states they are *"derived from
the System Reference Document 5.2"* and claims the attribution obligation that
goes with bundled SRD data — but:

- there is NO extract for them under `docs/srd/source/`;
- no test compares them to any document — I grepped the rules tests for a tie
  between these numbers and a source and found none.

Every other SRD number in this repo is pinned to a checksummed file: the
skill-to-ability map, the weapon table, the armour table, ability-score
generation, class starting equipment, the spell catalogue.

### Why this is the hard kind

It does not look like a gap. The numbers carry a citation, they live in
`src/rules/` beside the genuine seeders, and the header reads exactly like the
ones above files that ARE pinned. A reviewer who reads the header and moves on
sees sourced data. **The citation is doing the job a checksum should do.**

F26 was an extract truncated mid-word — bad, but discoverable by looking at the
file. This is worse to find, because there is no file to look at.

### What it blocks

D11 says the builder BLOCKS an SRD-illegal choice. Enforcing spell counts is
therefore required, and it is implementable today — the data is right there. It
would mean the app refusing a player's choice on the authority of numbers nobody
can trace to a document.

Refusing someone's input is the strongest claim an app makes. It should rest on
the strongest evidence we have, not the weakest.

### The demonstration, added because the abstract version did not land

Asked to explain this, I tried to verify ONE number: does a Ranger prepare 2
spells at level 1? `HALF_PREPARED` in the seed starts with `2`, which is the 2024
rule — in 2014 a Ranger got nothing until level 2. So it appears correct.

**But notice how I established that. I recalled it.** There is no extract to
open, so my check consisted of being confident from memory, which is precisely
what this project forbids everywhere else.

Set that beside D34. To verify the Monk's die I COUNTED — twenty rows in
`attack-class-features.txt`, four `1d6`, six `1d8`, six `1d10`, four `1d12`, and
the string `1d4` occurring nowhere. The wrong value had nowhere to hide, and the
`4` that had been sitting in a CHECK constraint was a 2014 leftover.

That `4` came from the same Laravel port these progression numbers came from.

**So the finding is not "these numbers are wrong."** It is: *if any of them is
wrong, nothing in this repository can tell us* — and D11 is about to use them to
refuse a player's choice. Refusing input is the strongest claim the app makes,
stronger than displaying a number, because it overrides the person.

### The fix, and it is the same one that worked five times tonight

Extract the class tables to `docs/srd/source/`, pin the SHA-256 in `SOURCE.md`,
and assert the literal against the extract — the pattern that caught a truncated
Fighter option, an unsourced `1d4` Monk die, and would have caught this. The
ability-methods track is the template.

Until then the builder should not enforce counts it cannot justify.


## D51 — OWNER: the feat model. ASI is a feat, most feats are text, and only three kinds earn structure (2026-07-28)

The owner's ruling, in four parts:

1. *"Asi is a feat the gives 2 +1 asi instead of the usual single +1 plus extra
   effects."* — In the 2024 shape a feat carries an ability bump AND an effect.
   The Ability Score Improvement feat trades the effect for a SECOND +1. It is
   not a separate mechanism beside feats; it is a feat.
2. *"Most feats are just text like we won't model war caster."* — Text, not
   structure.
3. *"A feat that gives a fighting style or weapon mastery or skills needs to be
   modeled."*
4. *"Need a Boolean for if a feat is an origin feat or not. Origin feats do not
   give asi at level 1."*

**Part 3 is D26 as amended by D35, applied exactly.** A value earns structure if
it changes a number on the sheet or makes the catalog searchable. A fighting
style, a weapon mastery and a skill proficiency all do. War Caster's advantage on
concentration saves does not — nothing in this app computes a concentration save.
So the line falls where the existing rule already put it, which is a good sign the
rule is real rather than post-hoc.

### What already exists — measured before writing this

`feat_definitions` is ALREADY IN THE SCHEMA (`schema.sql:609`), carried over from
the Laravel port:

```
content_key, name, rules_edition, category, repeatable,
prerequisites, grant_rules, notes
```

- `grant_rules` is a JSON column, so feats already plug into the six-kind grant
  DSL rather than needing a new effect mechanism.
- It is READ by `character-workspace-builder.ts:499`.
- **Nothing seeds it.** There is no feat seeder and no feat extract under
  `docs/srd/source/`. So the table is real, wired for reading, and empty.

### What does NOT exist, and part 3 needs it

- **Fighting styles are not modelled at all.** Grepping `src/` and `db/` for
  `fighting_style` returns nothing. A feat that grants a fighting style cannot be
  structured until the thing it grants exists.
- **Weapon mastery IS modelled** — `weaponMasteryProperties`, and
  `character_weapons.mastery_property` with its CHECK. Part 3's second case can
  be built today.
- **Skills ARE modelled** — the eighteen, CHECK-closed, plus
  `character_skill_proficiencies`. Third case buildable today.
- **No SRD feats extract.** SRD 5.2.1 does contain feats; we have not pulled
  them. Until we do, any feat content is unsourced, and this project's whole
  posture is that unsourced content does not ship as fact.

### A collision worth naming before it becomes drift

The owner asked for a **Boolean**. `feat_definitions.category` ALREADY EXISTS and
is exactly the kind of column an origin/general distinction would land in.

Two facts now competing for one meaning is how D40's `coin` survived in the
schema for weeks after being dropped, and how F22's one-rule-two-expressions
happened. Taking the ruling literally — a boolean — while `category` sits beside
it unexamined would create the same shape.

**Not decided here.** Either the boolean is added and `category` is documented as
meaning something else, or `category` carries it and the ruling is satisfied by a
closed vocabulary rather than a flag. That is a small question with a real
drift cost, and it should be answered deliberately.

### The order this implies

1. Extract SRD feats — content, sourced, the same discipline as the ability
   methods.
2. Model fighting styles — part 3 cannot be honoured without them.
3. Then the feat structure itself: the ASI shape, the origin flag, and
   `grant_rules` entries for the three structured kinds.

Steps 1 and 2 are prerequisites, not polish. Building the feat structure first
would mean inventing both the content and the thing it grants.


## D50 — OWNER: Roll in Order belongs to a random-character button, not to the deliberate flow (2026-07-28)

The owner's ruling: *"Use the roll in order for choose random class (roll stats)
button."*

### The problem it dissolves

D48 put class FIRST. D47 added Roll in Order, which fixes scores to Strength
through Charisma in the order rolled. Composed, they trap a player: the class is
already committed when the dice land, and the fixed order means a bad result
cannot be rearranged to fit it.

The reroll gate does not rescue this, and D47 claimed it did — see the correction
now recorded there. The gate fires on two scores of 15+ ANYWHERE, so a Wizard
with fifteens in Strength and Dexterity and Intelligence 8 passes it.

**The ruling separates the flows rather than patching either rule:**

- **Deliberate build** — class first (D48), then Standard Array, Point Cost or
  manual entry. All three let the player ALLOCATE, so a chosen class is never
  betrayed by the dice.
- **Random character** — a "roll stats / random class" button. Roll in Order
  lives here and only here. Nothing is trapped, because no class was chosen
  first.

That is why the composition problem disappears instead of being softened: the
two rules never meet.

### What this means for D47

D47's four methods stand, but they are not four options in one list. Three are
offered inside the wizard's ability-score step; the fourth is the mechanism
behind a different button. The house-rule labelling from D47 still applies — the
button is not SRD, says so, and names nobody.

### A sub-question the wording leaves open, flagged not assumed

*"Choose random class"* could mean either:

- the class is picked at RANDOM and the stats rolled in order beside it — a true
  "surprise me"; or
- the class is FITTED to the roll — the app looks at the spread and offers the
  class it suits.

The second is now possible and would be SOURCED rather than invented, because
`Standard Array by Class` (merged `e479549`) gives twelve classes' suggested
spreads and inverts into "which class does this roll resemble". That is a real
capability the extract bought us and it did not exist yesterday.

**Taken for now: random class.** It is the literal reading and the smaller build.
Worth one sentence from the owner if the fitted version was meant, because it is
materially more interesting and the data for it already exists.


## D49 — OWNER: the 2014 edition is real for spells and subclasses, and the level-up wizard multiclasses with a warning (2026-07-28)

Two rulings, verbatim: *"We can have spells and subclasses from 2014"* and
*"Level up wizard should handle multiclass, but warn that it is for advanced
players"*.

### 1. `rules_edition` is a promise, not dead weight

I had asked whether the `'2014' | '2024' | 'expanded'` axis was real or
vestigial, since everything SEEDED is 2024. It is real, and the ruling scopes it:
**spells and subclasses**. Not armour, not backgrounds, not class core traits —
those were not named and are not assumed.

**A distinction the ruling does NOT settle, so it is not being assumed.**
"We can have" could mean the app SUPPORTS 2014 content arriving by import, or
that we SHIP it. Only the first is implied. SRD 5.1 (the 2014 rules) was released
under CC-BY in 2023, so bundling it would be lawful — but `LICENSING ABSOLUTE`
in the standing brief says "only SRD 5.2", and widening that is a separate
decision with real cost: a second extraction pipeline, a second catalogue layer,
and every "which edition is this" question doubling. **Taken for now: the app
supports imported 2014 spells and subclasses; we bundle only 5.2.** Reversible,
and worth asking explicitly if you meant more.

### 2. The wizard multiclasses, and the warning is not the same thing as a block

This resolves a real tension. D11 called it a "guided single-class builder";
D42 §6 described a level-up that ADDS A CLASS and re-reads D28's proficiency
union. The ruling picks: the wizard handles it, with a warning that multiclassing
is for experienced players.

**Warn and block are different mechanisms here and must not be conflated:**

- **Complexity → WARN.** Multiclassing is legal. D28 already ruled "warn rather
  than refuse" for this class of thing, and D11's tolerance was never about
  preventing legal choices.
- **Failed prerequisite → BLOCK.** D11 is explicit that an SRD-illegal choice is
  unavailable in the builder. A character who does not meet the ability minimum
  does not qualify, full stop — that is not complexity, it is illegality.

### THE DEPENDENCY THIS CREATES, measured before recording

The prerequisite rule IS extracted — `docs/srd/source/multiclassing.txt:22`:
*"To qualify for a new class, you must have a score of at least 13 in the primary
ability of the new class"*.

It is **NOT modelled**. Grepping the schema for a multiclass prerequisite,
minimum or ability threshold returns nothing.

Enforcing the block therefore needs each class's PRIMARY ABILITY, and
`docs/design/guided-builder.md` item 8 records an unresolved collision in exactly
that value. So:

- **the warning is buildable now** — it depends on nothing;
- **the block is not**, until item 8's primary-ability collision is resolved and
  the threshold is modelled.

Shipping the warning without the block would leave the wizard permitting an
SRD-illegal multiclass, which contradicts D11. Either item 8 lands first, or the
multiclass step is gated off until it does. It should not ship half-enforced and
silent about which half.


## D48 — OWNER: CLASS IS THE FIRST STEP, and that deletes the draft-state problem rather than solving it (2026-07-28)

Asked what happens when someone starts the builder, picks a species and closes
the tab before choosing a class, the owner did not pick any of the three
answers. The reply was: *"The class should be first."*

That is the better move and it makes the question moot.

### Why the question disappears

D42 §1 ruled class a PRECONDITION — outside the wizard there is no class-less
character. The abandoned-draft question only existed because the proposed order
put species and background ahead of class, so a partial build had to be held
SOMEWHERE that was not the database.

With class first:

- the character row is created the moment a class is chosen;
- everything after that is an ordinary incomplete character, resumed from the
  database like any other;
- abandoning before step one leaves nothing behind, because nothing was created.

The precondition stops needing enforcement machinery. It is satisfied by
construction.

**This deletes a work item.** `docs/design/guided-builder.md` item 1 proposed
keeping "the pre-class draft in versioned session storage" — its own state
format, its own versioning, its own loss modes on cleared site data. None of it
is needed now. Item 1 shrinks to the route and the step contracts.

### The revised order, and what still constrains it

D42 §5 recorded the step order as species/background → class → ability scores →
equipment, and said explicitly that **only the last edge was binding** and the
earlier ones remained free. This ruling fixes an earlier one:

    class → species → background → ability scores → equipment

Two edges are now load-bearing, for different reasons:

- **class first** — this ruling, and it is what makes the precondition free;
- **background before ability scores** — the 2024 rules put the ability score
  increases on the BACKGROUND, so scores cannot be finalised before it is
  chosen. This is a rules constraint, not a preference;
- **equipment last** — D42 §5, because a Dex build and a Str build want opposite
  kits and the SRD's `Choose A or B` cannot be offered before the scores exist.

Species sits between class and background with no mechanical dependency either
way in the 2024 rules; its position is free and chosen for flow.

### A consequence to build deliberately

Choosing a class now happens BEFORE the player has seen anything else, which
means the class step carries the weight of the whole decision. The Standard
Array by Class table (merged `e479549`) matters more under this order than it
did under the old one: it is the only sourced thing the app can show at the
moment the player is choosing blind.


## D47 — OWNER: the builder offers all four ability-score methods, and the fourth is a HOUSE RULE with no source (2026-07-28)

The owner's ruling: all four methods, the fourth being an optional variant that
rolls 4d6 drop the lowest and keeps the order; then, asked whether the reroll
gate was included: **all three parts, labelled a house rule.**

**IT IS CALLED "ROLL IN ORDER" AND NAMES NOBODY.** The owner's later
instruction was to drop the person's name and call it "roll in order". That
instruction is PARAPHRASED here rather than quoted, which is unusual for this
record — quoting it verbatim would print the name and defeat it. The variant is
associated with a particular person in the wider hobby; the
product and this record do not say so. Naming an individual would imply
endorsement we do not have and attach a person to a rule they did not write for
us. The commit that first recorded this decision (`59fa83e`) predates the
instruction and does contain the name; it is left as immutable history rather
than rewritten, and nothing after it repeats it.

### The four methods

Three are SRD 5.2.1 and are extracted, checksummed and enumerated in tests
(`docs/srd/source/ability-score-generation.txt`, merged `e479549`):

- **Standard Array** — `15, 14, 13, 12, 10, 8`
- **Random Generation** — 4d6, total the highest three, six times, assigned freely
- **Point Cost** — 27 points, with the full score-to-cost table

The SRD's own name is **Point Cost**, not "point buy". Naming it from memory
would have put a permanently wrong identifier in an enum, which is the whole
reason the values were extracted rather than typed.

The fourth is not SRD:

- **Roll in order (house rule)** — 4d6 drop lowest; assign to Strength,
  Dexterity, Constitution, Intelligence, Wisdom and Charisma IN THE ORDER
  ROLLED; reroll the entire set if it does not contain at least two scores of
  15 or higher.

**All three parts.** The reroll gate fires when the set lacks two scores of 15 or
higher.

**CORRECTION (D50).** This entry originally justified the gate by saying it gave
recourse to "a Wizard who rolls 8 into Intelligence". **That was wrong and I
recorded it as fact.** The gate tests the SET, not the character: a Wizard
rolling 15, 15, 8, 8, 8, 8 with the fifteens in Strength and Dexterity PASSES the
gate and still has Intelligence 8. The gate protects against a uniformly poor
spread; it does nothing about a spread that is fine for someone else. Codex found
this by reading D47 against D48 rather than trusting my summary of it. D50
resolves the underlying problem by moving the method out of the class-first flow
entirely.

### LICENSING — this one is different from everything else we ship

The house rule is **not SRD content** and must never be dressed as it:

- It does NOT go in `docs/srd/source/`, and it carries NO SRD citation.
- Game PROCEDURES are not copyrightable, so implementing the method is fine.
  Copying anyone's WORDING is not, and neither is implying endorsement.
- It is labelled in the UI as a house rule, so a player can tell at a glance
  which of the four the rules actually license.

D34 is the precedent and it is exact: `dieSizes` is recorded as *"the OWNER'S
list ... rather than dressed up with a citation it does not have"*. A house rule
gets the same honesty.

### Sourcing caveat, recorded because it is weaker than our usual standard

I verified the three SRD methods against a checksummed PDF. I could NOT verify
the house rule that way — what I found were forum descriptions of it, not a
primary source. The rule is implemented because the owner asked for it and can
describe it, not because we confirmed it against a document. That is a different
epistemic footing from every other number in this project and the record should
say so rather than let it blend in.

### What this unblocks

`docs/design/guided-builder.md` item 7 sized this as "S per supported method"
and its risk section warned that ability methods would otherwise be *"recalled
from memory"*. Three are now sourced; the fourth is explicitly not, and is
labelled. The design's step 5 can proceed.


## D46 — OWNER: a share link stays a REFERENCE; the full JSON export carries user-authored content (2026-07-28)

The owner's ruling, verbatim: *"Do the placeholder for a share link and export
all user authored content for the full json export."*

I had offered three options and all three treated the wire and the backup as one
question. They are not. The answer splits by CHANNEL, and the split is the point:

- **A share link is a compact reference.** A spell the recipient's catalogue
  lacks degrades to a placeholder, exactly as today. No wire version bump.
- **The full JSON export is a complete artifact.** It carries all USER-AUTHORED
  content — forks and imported homebrew — so an exported character can be
  restored without the author's catalogue.

### What this settles, and it is more than it looks

**The wire stays at v2 and no licensing determination is needed.** F24 records a
dispatch that reached for wire v3 and put `short_summary`, `upcast_summary` and
the rest into share links; for a fork of a bundled spell that is SRD-derived
prose in a URL, and whether a URL fragment discharges CC-BY attribution is a
question nobody had answered. Under this ruling it never arises for links.

**Design item 12 is unblocked with a shape, not a compromise.** The attack-kind
fact on `character_weapons` is classified omitted for the SHARE, and carried in
the export. D30's guard gets a real answer instead of a coin toss between "lose
it" and "bump the wire".

**Bundled SRD content still does not travel, in either channel.** The recipient
seeds it. Only what the user AUTHORED needs carrying, which is also what keeps
the export honest about the licence: our own bundled text stays ours to seed,
and the user's own work is the user's to move.

### This REFINES overnight decision 4, and I want the change visible

`.claude/pending-questions/overnight-2026-07-28.md` decision 4 said the portable
per-character backup carries references only, "because it never carried
catalogue rows". That was right about SRD rows and wrong about user-authored
ones. The refined rule: SRD rows are seeded by the recipient and never carried;
forks and imported homebrew are carried by the export and NOT by the link.

### Consequence worth stating before it is built

A share link and an export now have DIFFERENT completeness guarantees, and the
UI must not blur them. Someone who shares a link with a friend and expects their
homebrew to arrive will be disappointed unless the app says so at the moment of
sharing. That is a UI obligation this ruling creates, not a defect in it.


## F26 — the class Starting Equipment column is TRUNCATED in a merged extract, and the builder design found it by reading the source (2026-07-28)

The guided-builder design pass (`docs/design/guided-builder.md`) reported that
`class-core-traits.txt` ends the Fighter's equipment option mid-word. I checked
it rather than taking it:

```
143:   Mail, Greatsword, Flail, 8 Jav-
144:
145:   === Core Monk Traits ===
```

The Fighter's option A stops at "8 Jav-" and options B and C are absent
entirely. Sweeping the whole extract for lines ending in a hyphen inside a
Starting Equipment block finds at least five classes cut mid-word — Bard
("En-"), Fighter ("Jav-"), Ranger and Druid ("Ar-", twice), and more.

**This is exactly the failure `docs/srd/SOURCE.md` warns about in its own
words**: *"Stop at the real column boundary, or a value is truncated mid-word
and becomes fabricated data downstream."* The warning was written after the
mistake was made once. It has now been made again, in a file that merged.

**What is and is not affected.** The extract's OTHER columns are fine and are
seeded correctly — hit die, saving throws, skill choices, armour training and
weapon proficiencies all parse, and `class-traits-srd.ts` throws on an
unrecognised shape rather than dropping a class. The damage is confined to
Starting Equipment, which nothing reads yet.

**Which is the only reason this is not worse.** D42 §4 rules that the builder
equips the character, so class starting equipment was the next thing to parse.
A parser run against this extract would have produced twelve plausible classes
with silently missing options — fabricated data of exactly the kind the project
refuses.

BINDING for the re-extraction: Starting Equipment gets its OWN extract, sliced
wide enough for the longest option, with a per-class fixture asserting the
Fighter has THREE options and that no line ends mid-word. A count of twelve
classes is not evidence — F16 — because twelve truncated rows count as twelve.

Credit where due: this came out of a design dispatch reading the source, not out
of any gate. No test could have caught it, because nothing consumes the column
yet.


## F25 — the level divergence was SEVEN sites, not the two on record; and a mutation that silently fails to apply looks exactly like a mutation that survives (2026-07-28)

`chunk/CHARACTER-LEVEL` merged at `b640405`. Verified by me: **2182 vitest / 133
files**, build exit 0 with both dist controls, **72 Playwright** (9.4m, port
5463).

### D40 recorded two. There were seven.

D40's flagged-but-not-asserted note named the divergence as a pair —
`Math.max(1, SUM(level))` at `spell-access-builder.ts:565` against the unfloored
`reduce` at `build-report-builder.ts:414`. I grepped instead of trusting it and
found six:

```
src/access/spell-access-builder.ts:565   Math.max(1, COALESCE(SUM(level), 0))
src/reports/build-report-builder.ts:415  classes.reduce(+class_level, 0)
src/sharing/schema.ts:1618               classes.reduce(+level, 0) > 20
src/commands/add-source.ts:175           COALESCE(SUM(level), 0)
src/commands/add-source.ts:239           COALESCE(SUM(level), 0)
src/commands/update-class.ts:116         COALESCE(SUM(level), 0)
```

Codex then found a SEVENTH my grep had missed — a separate sheet-level helper.
Two in the record, six in my sweep, seven in the code. F16's rule keeps earning
its place: I checked the thing rather than the note, and the thing was still
bigger than I found.

### What landed

`characterLevel()` returns `number | null`, null meaning **no class rows**. That
is AGENTS.md principle 1 applied — "make an absence a type, not a fallback" —
and it is what lets D42 §1's "undetermined" be a real state instead of a display
hack over an invented number. Every consumer handles null explicitly: no class
means no class spellcasting routes; the reports and sheet say undetermined; the
`> 20` validation treats absence as "cannot exceed".

The user-visible defect is gone: a class-less character no longer reports level 0
and proficiency bonus +1.

Mutating the shared function so an empty class list returns `0` instead of `null`
fails **eleven** tests across access, commands, sheet, reports, UI and the
function's own suite. That is the proof F22 asked for and could not previously
be given.

### THE INSTRUMENT FINDING, and it is against me

My first mutation attempt did not apply. The script asserted on a literal
`return null;` that does not exist — the function uses a ternary — so the
assertion threw, and the `npm test` that followed ran on the UNMUTATED tree and
reported 2182 passing.

Read carelessly, that is indistinguishable from "the mutation survives", and it
would have been a false finding against codex's work. What saved it was noticing
the Python traceback sitting above the green summary.

BINDING: **a mutation is not applied until you have proved it applied.** Assert
the replacement count, or grep the mutated file for the vanished text, BEFORE
running the suite. The second attempt did exactly that — `grep -c "? null"`
returned 0 — and only then was the result worth anything.

This is RULE 8 in a place I had not applied it. RULE 8 says verify the instrument
before believing a zero; a mutation harness is an instrument, and "0 tests
failed" is a zero.

## F24 — "v1 is frozen" was never enforced: the guard hashed the OBJECT, so an edit to the frozen FILE passed green (2026-07-28)

`chunk/SPELL-FORK` merged at `fecb2cb` after one refused round. Verified by me:
**2173 vitest / 132 files**, build exit 0 with both dist controls,
`db:migrations` 16/16, **72 Playwright** (9.5m, port 5459).

The forking half was right first time. The round was refused for three things in
a half nobody asked for, and one of them is a hole in a rule this project has
been relying on since D41.

### The hole

D41 says, in a comment repeated twice in `src/sharing/wire-schemas/index.ts`:
*"Never edit an existing version."* The guard for it was:

```ts
createHash('sha256').update(JSON.stringify(SHARE_SCHEMAS[1])).digest('hex')
```

That hashes the schema OBJECT. A dispatch widened a TYPE in the frozen module —
`RootField` gained `| 'forks'` in `v1.ts`, so a new v3 could reuse v1's
declarations — and the object was unchanged, so the fingerprint matched and the
whole suite ran green. **2173 tests passed over an edit to a file the project
treats as immutable.**

This is F16 again in a new costume: I had been checking the SHAPE of the freeze
(does the data still hash the same) rather than the THING (is the file
unchanged). The fingerprint is not wrong; it is just not the guarantee its name
implies.

Fixed by pinning the module BYTES:

```
v1.ts  8a87e9cd8ee49c2beb42f9747dc24025c485fccb63d822179202df29080af449
v2.ts  32e662f3db38f09da5b17320b059c917d26e031456fd0f2c4cefb196a872b269
```

I verified the new guard against the ACTUAL violation rather than a synthetic
one — re-applied the original `| 'forks'` edit verbatim:

```
FAIL keeps every historical schema module byte-for-byte unchanged
Expected: 8a87e9cd8ee49c2beb42f9747dc24025c485fccb63d822179202df29080af449
Received: b3c29861c45d4c0d3126a54a76a37252d700912883cc8cc789c376cb0a3158b8
```

**The general lesson, and it generalises past this file:** a guard over a
DERIVED value protects the derivation, not the source. If the rule is about a
file, pin the file.

### The other two refusals

**Wire v3, unasked and irreversible.** D41 makes a shipped version permanent, so
burning v3 on a design nobody had reviewed — overnight, while the owner slept —
was the wrong kind of autonomous. Removed; the registry is back to v1 and v2.

**SRD prose was about to enter share-link URLs.** The fork payload carried
`short_summary`, `upcast_summary`, `material_component_summary` and
`cantrip_upgrade_summary`. A fork of a bundled spell inherits SRD text, so this
put CC-BY material into URLs, and whether a URL fragment carries its attribution
is a real question the owner has not answered — one already flagged as open in
`.claude/pending-questions/overnight-2026-07-28.md`.

The fix was also the better design: **a fork travels exactly as an imported
homebrew spell already does**, by key. One problem, one answer. Inventing a
second mechanism for forks alone would have left the app with two rules for
"user content the recipient does not have".

### The pre-existing gap codex found and correctly did not fix

Imported homebrew does NOT survive a share link when the recipient lacks the
catalogue entry: the character survives, the spell becomes a placeholder, and for
spellbook-only references even the display name is lost because it is derived
from the key. That now applies identically to forks. Reported, not patched —
patching it for forks alone was exactly the trap.

## F23 — the bundled catalogue merged; and I made the same merge mistake twice in one session, having written the lesson down after the first (2026-07-28)

`chunk/SRD-CATALOG` merged at `3a4b319`. Verified by me: **2166 vitest / 131
files**, build exit 0 with both dist controls, **72 Playwright** (9.4m, port
5453), frozen paths untouched against merge-base.

The app now works on first open. 339 SRD spells and their eight class lists seed
with `provenance = 'srd'`, refuse edit and delete at the command layer, and
survive a user's catalogue import.

### Verified rather than accepted

- **My mutation killed the load-bearing guarantee.** Made the read-only refusal
  unable to fire (`provenance === 'srd'` changed to an impossible value) →
  `FAIL refuses edit and delete commands with the exact read-only message`,
  1 failed / 2165 passed. Restored. D45's whole promise rests on that refusal
  and it is held by a test.
- **"339 spells" is an ENUMERATION, not a count** (F16). The test is
  `expect([...actual].sort()).toEqual(EXPECTED_SPELL_NAMES)`, the seeded rows are
  compared the same way, and the class-list assertion is that list MINUS
  Phantasmal Force. The oracle is hand-enumerated from the printed headings, and
  this branch did not regenerate it — the only deletion in that file is `const`
  becoming `export const`.
- **The import-sweep test carries its own negative control** — imported rows DO
  get tombstoned in the same test — so "SRD rows survived" is not vacuous. That
  was codex's own doing, unprompted, and it is the pattern to keep.

One change I did not expect and checked before merging: the sharing round-trip
fixture renamed `2024:shield` to `2024:fixture-shield`. Legitimate and an
improvement — the fixture had invented a key that is now REAL bundled content, so
it was accidentally testing catalogue collision. The assertions are unchanged;
the fixture merely stopped impersonating a shipped spell.

### THE PROCESS FINDING, and it is against me

I ran `git merge` from inside the worktree. The worktree is checked out on the
branch being merged, so git merged it into itself and reported:

```
Already up to date.
```

Then `git worktree remove` deleted the directory the shell was standing in:

```
fatal: Unable to read current working directory: No such file or directory
```

The commit had landed; the merge silently had not. **I did this identically two
merges earlier on `chunk/SRD-SPELLS`, and reported the lesson at the time.**
Writing it in a report did not stop me repeating it forty minutes later, which is
the actual finding — a procedural lesson that lives only in prose I emit is not
retained, exactly as the `CLAUDE.md` "How to report" section says about the
terseness rule that kept evaporating.

BINDING, so it has a home instead of a mention:

- **Merges run from the main worktree, never from the branch's own worktree.**
- **"Already up to date." from a merge you expect to do work is a FAILURE
  message.** Read it as one. The merge that does nothing is the merge that did
  not happen.
- Remove a worktree only after `git worktree list` shows the merge landed on
  main.

## D45 — OWNER: the SRD catalogue is a read-only bundled layer, and customising a spell FORKS it (2026-07-27)

The owner's ruling, verbatim: *"I like the c idea of forking the srd spell. In
dndbeyond you have to make a homebrew copy of a spell and then customize it and
give it a different name."*

This settles the last blocker on D43. The options put were: A read-only bundled
layer, B seed-then-user-owned, C read-only base plus user overlay, D toggleable
source, E ship a document the user imports.

### FORK IS NOT SHADOW, and the difference removes most of C's cost

I described option C as *shadowing* — a user row with the same identity masking
the SRD row, resolved at read time. The owner described something simpler and
better: a **copy**, customised, under a **different name**. That is a new spell,
not an override.

Everything C's "cons" column listed falls away with it:

- **No layer resolution on any read path.** A fork is an ordinary spell row. No
  query has to ask which layer wins.
- **No "I edited it and nothing changed" bug**, because nothing is masked —
  both spells exist and are separately visible.
- **No new duplicate-detection case from the mechanism itself.** The fork has
  its own identity and its own name.

What survives from C is the part that mattered: the SRD row is never mutated, so
re-seeding the bundled layer after an extraction fix is safe. We already know we
will need that — the Phantasmal Force finding came out of the first extraction,
and a two-column PDF will produce more.

### What this binds

- **SRD rows ship with a distinct provenance and are READ-ONLY.** The user
  cannot edit or delete them. `spell_versions.provenance` already exists
  (`schema.sql:910`, `VARCHAR DEFAULT 'import' NOT NULL`), and the importer's
  tombstone sweep is already scoped to `provenance = 'import'`
  (`catalog-importer.ts:451-457`), so a non-`import` provenance inherits
  immunity from a user's import wiping the catalogue. That protection exists
  because the same class of silent data loss was already fixed once.
- **Customisation is fork-then-edit.** The app copies the SRD spell into a new
  user-owned row; the user edits the copy.
- **The SRD layer is replaceable on upgrade** precisely because nothing
  user-owned lives in it.

### Sub-decisions this raises, NOT decided here

Recorded so they are answered deliberately rather than by whatever the first
implementation happens to do:

1. **Is a different name REQUIRED or merely defaulted?** The owner described
   D&D Beyond's behaviour, which requires one. `spell_versions.content_key` and
   `spell_identities.content_key` are both UNIQUE (`schema.sql:709,929`), but
   `display_name` is NOT — two spells may share a name today. Enforcing a
   distinct name is therefore a NEW constraint, not an existing one.
2. **Does a fork record its ancestry?** Storing "derived from `srd:fireball`"
   costs one nullable column and buys provenance in the UI. Omitting it makes
   the fork indistinguishable from any other homebrew spell.
3. **Do SRD rows travel in a share link, or resolve by key on the recipient's
   side?** Resolving keeps links small and self-healing; carrying survives a
   recipient on an older catalogue. A FORK is user content either way and
   follows whatever rule homebrew spells already follow.
4. **Do SRD rows appear in backups?** Re-derivable content need not be carried,
   but omitting it means a backup restored on an older build can reference
   spells that build lacks.

### Sequencing

Ship the read-only layer first — it is the smaller half, it makes the app usable
on first open, and forking is additive on top of it. The reverse order is not
available: forking has nothing to fork from until the layer exists.

## D44 — OWNER: Q11 answered. The player picks the multiclass skill; instruments are text. And the schema for it already exists (2026-07-27)

The owner's ruling, verbatim: *"For q11, have the ui give the player to select
skills from a multi class addition. The music instruments are just text. The
rogue and ranger skills should come from the enum of acrobatics, perception,
stealth… etc."*

Q11 was the last open item in `.claude/pending-questions/e611bae3-overnight.md`:
three of the twelve "As a Multiclass Character" clauses grant a skill CHOICE
rather than a fixed proficiency, in two different shapes, and nothing made the
choice — so those characters were silently short a proficiency.

### The ruling

- **The UI offers the choice.** A multiclass entry that grants a skill choice
  presents it to the player; it is not auto-picked and not silently dropped.
- **The value is the skills VOCABULARY**, not free text — `skills` at
  `enums.ts:158`, the eighteen closed on `docs/srd/source/skills-table.txt`.
- **Musical instruments are text.** Bard's multiclass clause also grants "one
  Musical Instrument of your choice", over a set this app does not model. It
  stays text rather than becoming a vocabulary nobody sourced. This is D26 and
  D35 applied: an instrument changes no number on the sheet.

### THE MODEL IS ALREADY BUILT, and I checked before assuming it was not

`class_sheet_traits` (`schema.sql:520-533`) already carries:

```sql
`multiclass_skill_choice_count` integer DEFAULT 0 NOT NULL,
`multiclass_skill_choice_pool`  VARCHAR DEFAULT 'none' NOT NULL,
CONSTRAINT "class_sheet_traits_multiclass_skill_choice_check" CHECK(
  typeof(`multiclass_skill_choice_count`) = 'integer'
  AND ((`multiclass_skill_choice_pool` IN ('none')
        AND `multiclass_skill_choice_count` = 0)
    OR (`multiclass_skill_choice_pool` IN ('class_list', 'any')
        AND `multiclass_skill_choice_count` >= 1)))
```

`class_list` and `any` are exactly the two shapes Q11 found: Ranger and Rogue
bound the choice to their own list, Bard does not bound it at all. The CHECK also
makes the incoherent combination — a pool with a zero count, or `none` with a
count — unrepresentable.

The destination exists too: `character_skill_proficiencies`
(`schema.sql:275-285`), whose `skill` column is CHECK-closed to the same
eighteen, with a unique index on `(character_id, skill)` so the same
proficiency cannot be granted twice.

**So Q11 is a UI gap, not a modelling gap.** That is worth stating plainly
because the parked question reads like a schema problem and it is not.

### The reading of "come from the enum", stated so it can be corrected

The owner said the Ranger and Rogue skills come from the vocabulary. I am taking
that as a ruling about the TYPE — enum-valued, not free text — and NOT as
removing the SRD's bound. Ranger and Rogue offer their own class list, drawn
from that vocabulary; Bard offers all eighteen. That is what
`multiclass_skill_choice_pool` already encodes, and D11 Part 2 requires it: the
builder makes an SRD-illegal choice unavailable, and offering a Ranger a skill
outside the Ranger list would be exactly that. If the intent was instead "any of
the eighteen for all three", say so and the pool column collapses to `any`.

### What is NOT closed by this

`character_skill_proficiencies` has no provenance column, so nothing records
WHY a character has a skill — background, class, or multiclass entry. That is
fine for the sheet, which only needs the set, but it means the builder cannot
later show "this one came from your Rogue dip" without a schema change. Noted,
not fixed, and not blocking.

The unique index means a multiclass choice that duplicates an existing
proficiency is a constraint violation rather than a silent no-op. The UI must
therefore exclude already-held skills from the offered list — which is also the
correct behaviour, since picking one you already have wastes the grant.

## F22 — wire v2 merged after three refused rounds, and the boundary between two variants was invisible because ONE RULE IS WRITTEN TWICE (2026-07-27)

`chunk/WIRE-V2` merged at `0160fc7`. Verified by me on the tree: **2154 vitest /
130 files**, build exit 0 with both dist controls, **72 Playwright** (8.2m, port
5449). It took three rounds, and each refusal found something a green suite had
already certified.

### Round 1 — a stale green

Codex reported 2140 passed. My independent run on the same tree:

```
FAIL tests/unit/docs/ai-reference-anchors-resolve.test.ts
  raw: "tests/unit/sharing/codec.test.ts:1330 should name `PRE_SHEET_WIRE`"
  line reads: 'Pzp9Dy15RQcGBKnuAKGzlLTxE1xzifDCh-uTHAv_3y6G4fGT4ggIbXHkg1GA8MTKFDfL' +
Test Files  1 failed | 128 passed (129)
```

Codex ran its gates and then edited. That is the whole failure: not a wrong
change, a green measured before the last edit. Every dispatch since says to run
the full suite AFTER the final edit.

The defect itself is **F17's hazard, in a place F17 did not reach**. F17 moved
`.ai/` anchors into `decisions.md` off line numbers and onto D/F numbers.
Anchors into SOURCE still use line numbers, so any edit above one breaks it
silently. v2 shifted `codec.test.ts` and `PRE_SHEET_WIRE` moved 1330 -> 1334.

Two instrument notes from this round, both mine:

- `grep -rn "codec.test.ts:1330" .ai/` returned NOTHING while the test named
  three exact locations. Not F14, no NUL bytes — the anchor is written as two
  backtick spans, `` `path` ``, `` `SYMBOL` (`:N`) ``, so the literal string I
  searched for does not exist anywhere. I believed a zero from a query that
  could not have matched.
- I piped `npm test` to `tail -5` and got only the summary, so the first run
  told me "1 failed" and nothing else. I had made the same mistake an hour
  earlier piping Playwright to `tail`, where it also cost the exit code. Capture
  to a file; read the file.

The anchor guard itself is sound and I checked its denominator rather than
trusting the count: **34 split-form anchors across `.ai/`**, iterated over every
doc, with `expect(docs.length).toBeGreaterThan(5)` and a named-file assertion
inside it. Green means all 34 resolve.

### Round 2 — the surviving mutation

D41's table says `(n, f), f >= n` is `ranged`. Equality is explicitly ranged.
I changed `>=` to `>` in `src/domain/weapon-range.ts:61`:

```
npx vitest run tests/unit/sharing tests/integration/sharing   7 files, 151 passed
npm test                                                      130 files, 2154 passed
```

Nothing failed. The fixtures covered 20/60, null/60, 60/20, n/null and
null/null — every state, and not one boundary BETWEEN two states. This is the
same shape as F21: the code was right and nothing held it right.

It matters more than an ordinary uncovered branch. `legacy` is the variant that
must be unmintable by a fresh encode; it exists only to carry corrupt historical
pairs. Under the mutation an ordinary weapon recorded 20/20 decodes into that
reserved state, so "we never mint legacy" quietly becomes false for a value a
user can type.

### Round 3 — THE FINDING: one rule, two expressions

The added coverage killed my mutation — but only ONE test failed, where the
dispatch had asked for three layers. Chasing the discrepancy rather than
accepting the kill is what found it: **`weapon-range.ts` states the same rule in
two places.**

- `:61` — storage classification
- `:79`, inside `weaponRangeFromV1Pair` — what the v1->v2 migration calls

Mutating each independently:

```
mutate :61  ->  1 failed  (weapon range boundary mapping)
mutate :79  ->  2 failed  (boundary mapping + the adjacent v1-to-v2 migration)
```

Both are pinned now. But the dispatch had been told, in these words, to reuse
the existing mapper and *not write a second one*. It did not write a second
FILE; it wrote a second EXPRESSION, in the same file, twelve lines apart. That
satisfies the letter of "one mapper" and none of its purpose: the two can drift,
and the only reason we know they currently agree is that I mutated both.

**The rule this yields:** "do not duplicate the logic" is not a reviewable
instruction, because duplication hides at whatever granularity the instruction
did not name. What IS reviewable is the mutation — if two expressions encode one
rule, mutating either must fail a test, and if only one of them does, the other
is unprotected. Ask for that, not for tidiness.

The third layer — `tests/integration/sharing/round-trip.test.ts` — cannot catch
either mutation, and that is CORRECT rather than a gap. Storage records
`range_kind` explicitly, so export reads the recorded kind instead of
reclassifying. What that test proves is that nothing reclassifies on the way
out, which is worth an assertion of its own.

### What landed

v1 unedited. Its complete positional golden is carried verbatim as
`COMPLETE_V1_WIRE` — I confirmed the old asserted array is a byte-for-byte
prefix of the new constant — and now asserts decodability rather than pinning
the encoder, because v1 is no longer what the encoder emits. v2 has its own
hand-authored positional golden. `placeholders` left the character tuple for its
own root element and took its count cap with it; left behind, the cap would have
guarded an index v2 no longer uses.

Codex also reported honestly on coverage it had NOT added: `far = 0` was
previously missing, and the 100000 ceiling was only ever exercised with both
fields set at once. That is the distinction between found and added, kept.

## F21 — the migration runner's foreign-key ordering is correct and completely unprotected: the exact defect F20 documents survives every test (2026-07-27)

The runner landed on `chunk/MIGRATE-RUNNER` with the F20 ordering implemented
properly, and better than asked — `src/db/migrations.ts:101` sets
`PRAGMA foreign_keys = OFF` before `BEGIN EXCLUSIVE` and then READS IT BACK,
throwing if it did not take, rather than trusting a comment. The gates were
green: 2086 tests / 128 files, build exit 0 with both dist controls.

I mutated it anyway, because the ordering is exactly the kind of correctness a
green suite cannot see. Moved the pragma inside the transaction and deleted the
readback guard — the precise defect F20 exists to prevent:

```
tests/unit/db/migrations.test.ts    8 passed
tests/unit/db + tests/integration   52 files, 613 tests passed
```

Nothing failed. Restored, re-ran, green.

**Why it survives**, and this is the part worth keeping: every migration in the
test registry only ADDS AN INDEX. No test migration drops or rebuilds a table
that another table references. So foreign-key enforcement is never load-bearing
in any test, and disabling it correctly or not makes no observable difference to
any assertion. The instrument could not have caught it.

That matters immediately rather than theoretically: the very next migration
drops `weapon_templates`, which `background_equipment_items.weapon_template_id`
references `ON DELETE restrict` (`src/db/schema.sql:61`). The first real use of
this runner is the case none of its tests exercise.

Merge refused pending a fixture migration that rebuilds a RESTRICT parent, so
the ordering becomes load-bearing and the mutation fails.

**Two changes were not in codex's summary.** `src/duplicates/duplicate-warning-detector.ts`
lost 124 lines and `src/crypto/sha256.ts` is new — a hand-rolled SHA-256
extracted so the migration checksum could reuse it. The refactor is right and
the report should have said so. I proved the extraction behaviour-identical to
`node:crypto` across 11 inputs including the 55/56/63/64/65-byte padding
boundaries and multibyte UTF-8, with a negative control confirming the
comparison can fail. It now has two consumers — duplicate fingerprints and
migration checksums — and no test of its own; that is queued with the fixture.

Credit where it is due: `does not execute migrations for a current image, after
proving the probe is live` asserts `migrationExecutions === 1` on an old image
before asserting `0` on a current one. That is RULE 8 built into the test rather
than performed once by the reviewer, and it is the pattern to copy.

## D43 — OWNER: the app ships an SRD spell catalogue. This overturns "repo ships NO spell catalog" (2026-07-27)

The owner's instruction, verbatim: *"You should be able to build a spell
catalogue from the srd spells."*

This supersedes a constraint that has been absolute in every cron brief since
the project began — `LICENSING ABSOLUTE: only SRD 5.2 (CC-BY). No PHB prose.
Repo ships NO spell catalog.` The first two clauses stand. The third does not.

**The constraint was over-broad, not wrong.** SRD 5.2.1 is CC-BY-4.0 and its
spell descriptions are inside it, under the same licence as the weapon and
armour tables this repo already bundles and seeds (F1, F6, D10). There was never
a licensing reason to exclude spells specifically; the rule protected against
PHB prose and then swept up the SRD spells with it. `docs/srd/ATTRIBUTION.md`
already carries the verbatim notice that makes bundling lawful, and the
no-other-attribution constraint (no logos, no wordmarks, no claim of
endorsement) is unchanged.

**What changes for the product.** Until now the headline feature — multiclass
spell planning — required the user to import their own catalogue JSON
(increment 18, `src/catalog/catalog-importer.ts`). A character could be built,
sheeted and shared with an empty spell list. That is why F4's "this is a spell
planner, not a character model" and the sheet work that followed could both be
true at once. A bundled catalogue makes the app usable on first open.

**What does not exist yet.** No spell text, and no class spell lists. The 15
extracts under `docs/srd/source/` are weapons, armour, backgrounds, species,
skills, mastery, multiclassing and sheet math. Nothing spell-related.

**Cost, stated honestly rather than discovered later.** This is the largest
content-extraction job in the project by a wide margin: several hundred spells
with full descriptions plus per-class lists, out of a two-column PDF. The
pipeline is documented and reproducible — `docs/srd/SOURCE.md` pins the PDF by
SHA-256, records `pdftotext -layout`, and warns that column slicing must be done
by CHARACTER not byte because the SRD uses curly quotes and a byte-wise `cut -c`
produces invalid UTF-8. Both of those mistakes were already made once on much
smaller tables. Expect them again at this scale.

The homebrew import path stays. D12/Q4's known-set-plus-passthrough is what lets
a bundled catalogue and a user's Chronomancy spell coexist, and a bundled
catalogue must never make an imported one unopenable.

## D42 — OWNER: the wizard is the front door, class is a precondition, and the builder equips the character (2026-07-27)

Four rulings, asked as blocking questions and answered directly. Together they
settle D11 Part 2, which has been the largest unbuilt thing in the project.

### 1. A class-less character is not a state to render. It is a state to prevent.

The question was what the build report and printable list should print for a
character with no class rows, which today read `character_level = 0` and
`proficiency_bonus = +1` — both illegal in 5e, both user-visible
(`build-report.ts:221`, `printable-list.ts:321`), and both caused by a real
divergence: `spell-access-builder.ts:565` wraps the sum in `Math.max(1, …)`
while `build-report-builder.ts:414` uses a bare `reduce`.

The ruling: *"Use undetermined. It should only be a temporary state until a user
has picked a class. I think we can require selecting a class first before
anything else happens. That simplifies the domain."*

So the answer is **not** a display rule, and that is the point. Flooring to
level 1 would have invented a fact (D33: a disclosed wrong number is still a
wrong number). Printing a placeholder would have made a transient wizard state
into a permanent concept every reader must handle. Making class a PRECONDITION
removes the case instead of describing it: outside the wizard there is no
class-less character, and 'undetermined' is only ever seen mid-flow.

Consequences: both call sites still collapse into one `characterLevel()` so they
cannot drift again; the level floor stops being a defensive guess and becomes an
invariant with an enforcement point; and D41's refusal to put character level on
the wire is reinforced, since level remains derived from the class rows.

The tolerant half of D11 is untouched. An IMPORTED or SHARED character with no
class is still accepted and flagged — the precondition binds the builder, not
the boundary. That is the same asymmetry D11 Part 2 already established, applied
to a new field.

### 2. The wizard REPLACES "New character".

Not a second button beside the existing name field. Every new character starts
in the guided flow. That is the stronger of the options offered and it follows
from ruling 1 — if class is a precondition, a creation path that produces a
class-less row contradicts it.

An escape to a blank row still needs to exist for import, share and test
fixtures, but it is no longer the front door.

### 3. Level 1 first; a comprehensive per-level-up wizard is committed, not optional.

*"Level 1 to start. Want a comprehensive wizard to help with each level up."*

First shipment is species, background, class, ability scores and equipment at
level 1. The level-up flow is the committed second half of the same build, not a
maybe — which means the level-1 wizard must be structured so each level's
choices are a repeatable step rather than a one-off form. It also means the
per-level SRD content D11 explicitly deferred (subclass sets, feature text) is
now on the path rather than off it.

### 4. The builder equips the character. Focus and packs are the player's problem.

*"The wizard should help pick out appropriate weapons and armor for a character.
Most classes wear some sort of armor and all classes normally take some sort of
weapon. I want to just assume the player will figure out any needed spell focus
and sort it out at the table."*

This closes Q13's last open item, the A/B option column, and it closes it by
narrowing what gets modelled: the mechanical items — weapons and armour, the
things that change AC and an attack roll — are structured and offered by the
wizard. Spell focus, packs and the rest are not stored.

One fact that kills the obvious design, found while forming the question:
`class-core-traits.txt:141` is `Choose A, B, or C` (Fighter). Class starting
equipment is NOT binary, so any option column copied from
`background_equipment_items` must carry a label that accepts a third value
rather than a boolean. D40 already dropped the `coin` item kind, so a gold-only
option is a text line item, not a currency value.

Nothing named here exists yet: there is no `class_equipment` table.

### 5. Equipment comes near the END of the wizard (added by the owner after the four rulings above, same session)

*"The wizard should put the weapon and armor selection near the end because a
dex fighter will use medium armor and finesse and ranged weapons vs a str
fighter will use a heavy or versatile weapon and heavy armor."*

This is a dependency, not a preference. Ability scores must be chosen before
equipment, because the same class produces opposite correct kits: a Dexterity
Fighter wants medium armour, finesse and ranged weapons; a Strength Fighter
wants heavy armour and a heavy or versatile weapon. Offering the SRD's
`Choose A or B` package before the scores exist asks the player to decide
without the input the decision depends on.

So the level-1 step order is constrained: species and background, then class,
then ability scores, then equipment. Only the last edge is newly binding — the
earlier ones remain free — and it also removes the case where re-rolling ability
scores silently invalidates an already-chosen kit.

**LEGALITY AND SUITABILITY ARE DIFFERENT FILTERS and the builder must not
conflate them.** What a character MAY take comes from the class's armour and
weapon proficiencies — that is the D11 rule, and an SRD-illegal choice stays
unavailable. What a character SHOULD take comes from the ability scores, and it
is a suggestion. A Strength Fighter picking a rapier is making a legal, merely
suboptimal choice; the builder surfaces the better fit, and does not block it.
Blocking on suitability would be the builder inventing a rule the SRD does not
contain, which is the failure F4 and D33 both guard against.

Practical consequence for the level-up wizard promised in ruling 3: the same
ordering applies at every level where an ability score changes, since an ASI can
move a character from one kit to the other.

### 6. A new class re-opens the kit (owner, same session)

*"The level up wizard also needs to change the recommended kit if a new class is
added. Ie, a sorcerer adding a cleric level."*

The trigger for re-recommending is therefore not only an ability score change
(§5) but any level-up that adds a CLASS. The example is exact: a Sorcerer has no
armour proficiency worth the name and a Sorcerer/Cleric has medium armour and
shields, so the same character with the same ability scores has a different
correct kit the moment the second class lands.

The domain foundation already exists — **D28 ruled that multiclass proficiency
is a UNION across classes**. That union is what the recommendation must read
from. Nothing new is needed to compute what is now LEGAL; what is new is
noticing that the legal set grew and saying so.

**It ADDS a suggestion; it never rewrites a choice.** The character's existing
weapons and armour stay exactly as they are. The wizard surfaces what the new
class makes available and lets the player act on it. Silently swapping a
player's chosen gear because a better option appeared would be the app inventing
a decision, and at worst losing one the player made deliberately — the failure
AGENTS.md names as the one thing "replace freely" never licenses.

### 7. Flag a weapon that only makes sense with an attack cantrip or a pact weapon (owner, same session)

*"For weapons, have the wizard point out weapons that would only work well with
true strike, shillelagh, or pact of the blade are selected when building a
warlock or any other class that can select one of these."*

This is the suitability filter of §5 applied to a case the ability scores alone
get wrong. A Sorcerer with Strength 8 taking a quarterstaff looks like a
mistake, and is not one if Shillelagh is in play — the cantrip rewrites which
ability the attack uses. Without the note the wizard would steer a player away
from a combination the rules explicitly support.

It stays a NOTE. §5 binds: legality comes from proficiencies and blocks,
suitability only speaks.

**What exists.** `src/rules/attack-cantrips.ts` already models exactly this
mechanic — `attackCantrips = ['true_strike', 'shillelagh']`, matched on
`content_key` rather than display name, with the three failure modes written out
(recognised; plainly-the-right-spell under an unknown key, which is REPORTED;
unrelated spell renamed, which is not). D14 and D15 are its rulings.

**What does not exist: Pact of the Blade.** Grep finds it only as an unresolved
prerequisite STRING — `"Level 5+ Warlock, Pact of the Blade"` stored as a
qualifier for Thirsting Blade (`src/rules/extra-attack.ts:54`,
`db/schema/catalog-classes.ts:480`). There is no invocation model, nothing a
character can select, and so nothing the wizard can currently test. This ruling
requires it to be modelled; treat that as new work, not a lookup.

**A dependency this creates.** The note is conditional on the character actually
having access to the cantrip, which is spell-access data. So the equipment step
depends on the spell step as well as the ability-score step, extending §5's
ordering. And it depends on the catalogue: `attack-cantrips.ts` opens by saying
"True Strike and Shillelagh are NOT IN THIS APPLICATION" because the catalogue
was user-supplied. **D43 changes that premise** — once the SRD catalogue ships,
the key stops being a guess for bundled rows, and that comment plus its
guess-handling need revisiting rather than being read as still-current.

## F20 — drizzle-kit DOES emit the SQLite table rebuild, and the two things that would still have broken the migration are the TTY prompt and `PRAGMA foreign_keys=OFF` inside a transaction (2026-07-27)

The load-bearing unknown before implementing the weapon-range storage change was
whether `drizzle-kit` emits SQLite's table-rebuild dance itself, or whether the
migration has to be hand-authored SQL with Drizzle demoted to schema definition.
Claude measured it rather than reasoning about it, with a throwaway probe built
on the same `drizzle-kit/api` entry points `scripts/compose-schema.ts` already
uses. Every statement below is pasted from a run, not recalled.

**It emits the rebuild.** drizzle-kit 0.31.10 puts CHECK constraints in
`CREATE TABLE`, and for ANY column change on a table that carries a CHECK it
emits the full dance rather than `ALTER TABLE … DROP COLUMN`:

```sql
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_weapons` ( … CONSTRAINT "weapons_range_check" CHECK(…) );
INSERT INTO `__new_weapons`("id", …) SELECT "id", … FROM `weapons`;
DROP TABLE `weapons`;
ALTER TABLE `__new_weapons` RENAME TO `weapons`;
PRAGMA foreign_keys=ON;
CREATE INDEX `weapons_owner_index` ON `weapons` (`owner_id`);
```

That closes the question the design was blocked on. Three further facts came out
of the same probe, and each of them would have produced a broken migration.

**1. The diff we actually want cannot be generated without a TTY.** Dropping
`range_normal_feet`/`range_long_feet` and adding `range_kind`/`range_near_feet`/
`range_far_feet` in one step is a drop-plus-add on one table, which is exactly
the shape drizzle-kit resolves by asking a human whether it is a rename:

```
THREW: Interactive prompts require a TTY terminal (process.stdin.isTTY or
process.stdout.isTTY is false).
    at promptColumnsConflicts (drizzle-kit/api.mjs:20971)
```

Add-only and drop-only diffs both generate silently. So the migration is two
generated steps, not one — and the gap between them is the natural home for the
data transform, which drizzle cannot express anyway: its `INSERT … SELECT` is a
straight same-name column copy and can never carry the
`CASE WHEN normal IS NULL AND long IS NULL THEN 'none' …` mapping.

**2. `PRAGMA foreign_keys=OFF` is a silent no-op inside a transaction.**
Measured on SQLite 3.50.4: `BEGIN EXCLUSIVE; PRAGMA foreign_keys=OFF;` then
reading the pragma back returns `{ foreign_keys: 1 }`. It does not error. It
just does not take. Wrapping drizzle's emitted script in `BEGIN EXCLUSIVE` for
atomicity — which is what the design proposed — therefore runs the whole rebuild
with foreign keys still ON, and `DROP TABLE weapon_templates` dies:

```
2. drizzle script INSIDE a transaction (pragma inert)
  THREW FOREIGN KEY constraint failed
```

because `background_equipment_items.weapon_template_id` references it
`ON DELETE restrict` (`src/db/schema.sql:61`).

**3. `PRAGMA defer_foreign_keys=ON` does not rescue it.** It is the pragma that
DOES take inside a transaction, so it is the obvious fix, and it is the wrong
one — RESTRICT is enforced even when the constraint is deferred:

```
3. INSIDE a transaction with defer_foreign_keys=ON
  THREW FOREIGN KEY constraint failed
```

**What works is SQLite's documented ordering**: `foreign_keys=OFF` BEFORE
`BEGIN`, rebuild, `PRAGMA foreign_key_check`, `COMMIT`, `foreign_keys=ON`. That
keeps atomicity and keeps the child row. Verified both ways — on success the
child survives and `foreign_key_check` is empty; on a failure injected after the
rebuild, `ROLLBACK` puts the old columns back:

```
4. SQLite documented order: foreign_keys=OFF BEFORE begin
  OK  child=[{"id":1,"weapon_template_id":7}]
      parent=[{"id":7,"name":"Longbow","range_kind":"ranged",
               "range_near_feet":150,"range_far_feet":600}]
      foreign_key_check=[]
  rolled back on: injected failure after rebuild
  columns now: id, name, range_normal_feet, range_long_feet
```

BINDING for the migration runner: the pragma is set outside the transaction, not
inside it; `PRAGMA foreign_key_check` runs before `COMMIT` and a non-empty
result aborts; and no migration step may assume drizzle's `INSERT … SELECT`
carried a value transform. The probe was deleted; this entry is the record.

## D41 — OWNER: the share wire is versioned by a frozen registry; v1 freezes exactly as shipped, and v2 is weapon range plus the placeholders move (2026-07-27)

The owner's ruling, verbatim in two parts: *"With the ordered tuples, do we ship
the schema with each so that if the order changes between versions, that we need
to be able to migrate. Store the triple schemas in the code under a version
number. Make a comment somewhere that each time we change the schema, to store it
under an incremented version number"* and *"We need to version the schema for the
tuples so we just need to ship the schema version number with each export"*.

### What that settles

**One version per export, carried on `root[1]`.** Not one per nested tuple. The
root version governs the whole schema atomically; per-tuple versions would
enlarge every link and admit incoherent combinations such as root-v2 with
weapon-v1.

**Version 1 freezes exactly as shipped.** Its root arities (11 -> 12 -> 13 -> 14
-> 15) and its weapon tuple lengths (19, 20, 22) are *part of v1*, not debt to be
tidied on the way past. Every link already in the wild must still decode
byte-identically.

This SUPERSEDES the reasoning block at `src/sharing/codec.ts:40-60`, which argued
the opposite and had been followed four times:

> *"eleven elements is still a valid document carrying no weapons...
> `CHARACTER_SHARE_VERSION` deliberately stays at 1: a version bump buys nothing
> here and would reject every old link on the way in... this format has already
> grown 11 -> 12 -> 13 -> 14 with the version pinned."*

That argument was not wrong about its own case — appending a nullable element
genuinely is compatible. It was wrong about where it ended. Growing arity while
pinning the version means the version number describes nothing, and the only
record of what v1 ever meant is whichever decoder happens to be checked out.
**The next schema change bumps to 2 and gets a migration; it does not append.**

### The structural landing

Registry infrastructure lands FIRST and alone, changing no wire bytes:
literal, deeply-frozen `src/sharing/wire-schemas/v1.ts` built from `as const`
field lists rather than spreads of live constants (spreading a live constant
means editing that constant silently rewrites history), a hand-written SHA-256
fingerprint per historical schema, a `VERSION_FIXTURES` table whose keys are
compared against the registry's at runtime so a `satisfies` cast cannot hide a
missing fixture, and an empty `MIGRATIONS` table typed so that adding v2 makes
`1: migrateV1ToV2` mandatory at compile time.

`WEAPON_TUPLE_LENGTHS` stops being a standalone constant and survives as the
three explicit field lists inside v1; accepted lengths are derived from them.

The binding comment lives immediately above `CURRENT_CHARACTER_SHARE_VERSION` in
`src/sharing/wire-schemas/index.ts` — the point every format change must touch.
Not `.ai/` (too optional) and not `AGENTS.md` (too far from the edit).

### v2, chosen for migration coverage rather than convenience

A migration that only copies fields forward proves nothing. v2 was picked to
force every edge at once — add, remove, meaning-change, cross-tuple move,
narrowing, and legal-but-nonsense v1 states:

- **Weapon range** becomes one structured value instead of the two independent
  nullable integers `range_normal_feet` / `range_long_feet`. This is the owner's
  own queued ask: *"For ranged weapons, attach 2 separate distances to each.
  (Near vs far with disadvantage)."* `reach` is ALREADY a boolean in
  `SHARE_WEAPON_FLAGS`, so v2 does NOT get a melee-reach distance variant — that
  would duplicate a shipped field. Melee weapons carry no range.
- **`placeholders` moves out of the character tuple.** `document.placeholders` is
  document-level data encoded at index 10 *inside* the character tuple
  (`codec.ts:526`). It becomes its own root element; the character tuple goes
  12 -> 11. This is the only genuine cross-tuple move the format offers.

Rejected for v2: explicit character level on the wire. It is derived (sum of
class levels), and the unresolved divergence between `Math.max(1, SUM(level))` at
`spell-access-builder.ts:565` and the unfloored `reduce` at
`build-report-builder.ts:414` would be frozen into a format we have just promised
never to edit. Also rejected: class starting equipment (needs a table, catalog
and UI first) and a synthetic throwaway v2 (burns a version number on nothing and
skips the hard edges).

### The nonsense states are the point

`schema.sql:372-373` declares both range columns as bare nullable integers with
**no CHECK and no cross-field validation** — verified by reading the schema, not
inferred. So v1 already permits, and may already have shipped, pairs that the v2
domain cannot express. Per D12/Q4 and the narrowing rule, those are carried, not
coerced and not rejected:

| v1 `(normal, long)` | v2 | why |
| --- | --- | --- |
| `(null, null)` | `none` | no range recorded |
| `(n, null)` | `ranged { near: n, far: null }` | meaningful: no disadvantage band |
| `(n, f)`, `f >= n` | `ranged { near: n, far: f }` | clean |
| `(null, f)` | `legacy { normal: null, long: f }` | long with no normal — nonsense, but user data |
| `(n, f)`, `f < n` | `legacy { normal: n, long: f }` | inverted — nonsense, but user data |

The `legacy` variant must be unconstructible by a fresh v2 encode. v2 may only
EMIT it while migrating v1 data, never mint it.

**Rejecting an old link is not an acceptable migration.** Neither is dropping a
field: a removed field is still read by the old decoder, and its migrator must
either map it to a replacement or discard it through a dedicated assertion and
fixture proving the intended result.

---

## F19 — a green suite and a green build BOTH certified a build that `tsc --declaration` rejects, and the mutation pilot found the class of defect neither gate can see (2026-07-27)

`chore/stryker-pilot` merged as `9b7473c`. Gates on the merged tree, run by the
supervisor: **2074 vitest / 126 files** (from 2073/125), build exit 0, dist clean
9 files.

StrykerJS 9.6.1, vitest runner, typescript checker, scoped to
`src/{access,eligibility,grants,rules}/**` minus `*-srd.ts`. `thresholds.break`
stays `null` and nothing runs it in CI. It is a tool you point at code you
distrust, not a gate.

### The finding the pilot was not looking for

`passthroughVocabulary` and `PassthroughVocabulary` — the brand D38 introduced —
were module-private while an exported inferred type referenced them. So
`tsc --declaration` failed TS4023 on both `COLUMN_REFINEMENTS`
(`rows.ts:293`) and `REFINEMENTS` (`rows.ts:488`).

Neither `npm test` nor `npm run build` emits declarations. **Both were green over
this for as long as D38 has been merged.** Only Stryker's typescript checker,
which does emit, saw it.

I did not take that on report. I reproduced it on plain `tsc` myself — and my
first two attempts returned exit 0 with no output, which I nearly recorded as a
refutation. The third check showed the reason: **0 `.d.ts` files emitted**.
`tsconfig.json` is a solution file with `"files": []`, so it compiles nothing,
and a compilation of nothing reports zero errors. Probing `tsconfig.app.json`
emitted 179 declarations and produced exactly the two TS4023 errors.

That is RULE 8 with the instrument nearly winning: a zero from an instrument
pointed at nothing looks identical to a zero from a clean build. The guard now in
the default suite (`tests/unit/declaration-emit.test.ts`) therefore asserts BOTH
that the emit produced no diagnostics AND that it produced more than 100 `.d.ts`
files. The second assertion exists because of this specific near-miss.

I mutation-checked that guard rather than trusting it: removing the two `export`
keywords fails it with the exact TS4023 pair, and restoring them returns green.

### The gap the pilot was looking for

Scoped baseline: 4,011 mutants, **76.99%** total / **81.03%** covered, 2,062
killed, 6 timed out, **484 survived**, 134 no-coverage, 1,325 compile errors,
28m35s at concurrency 4. Codex classified the top survivors as seven genuine gaps
and three equivalent mutants.

I independently confirmed one rather than accepting the list. At
`class-progression-lookup.ts:575`, `classLevel < 10` -> `<= 10` gives third-casters
the wrong level-10 slots. I applied it and ran the full suite: **2013 passed**.
It survives because the breakpoint test samples 3, 7, 13 and 19 and steps over
10 — the tests check the shape of the progression, not the boundary that defines
it. F16 again, in test design rather than in a finding.

### My own error, recorded because it nearly produced a false result

Between the two mutations I ran `git checkout src/domain/enums.ts` to "restore"
the file. The export fix was UNSTAGED, so checkout discarded it and reinstated
the defect. The next run failed — and the failure looked exactly like the
progression mutation being killed, which would have been reported as codex
overclaiming a gap. It was my restore that broke it.

The lesson is narrow and mechanical: **`git checkout <path>` restores to HEAD,
not to the state you were holding.** When the working tree carries uncommitted
work under test, restore a mutation by inverting the exact edit, never by
checkout. Read which test failed before concluding what the failure means.

---

## D40 — OWNER: the structured-values ruling collisions (Q13), answered (2026-07-27)

Parked in `.claude/pending-questions/structured-values-ruling-collisions.md`.
Answered in question mode, one at a time, at the owner's request.

| collision | ruling |
| --- | --- |
| `range_text` original wording | **Leave as is.** The raw string survives in `spell_versions.range` (`schema.sql:866`) alongside the structured columns. |
| area of effect dimensions | **Add a nullable secondary dimension.** A cylinder needs radius and height; one number cannot carry both. |
| area shapes | **Six, not four.** `spellAreaShapes` at `enums.ts:766` lists sphere, cylinder, cone and line. Emanation and Cube are missing and are printed SRD 5.2 Range lines — `Self (15-foot Emanation)` and `Self (15-foot Cube)`. |
| material component cost | **Boolean plus text.** Drop the cp integer and the exact/minimum distinction. Rationale from the owner: *"A lot of material costs are gte. Not just true strike. Revivify requires a diamond value gte 50000cp."* A boolean "has a material cost" plus the verbatim material text carries every case without modelling comparison operators. |
| `coin` equipment kind | **Dropped.** *"I don't want to keep track of coins. Just make a 50gp package with 50gp as a line item text the same as a bedroll."* |
| `armor` equipment kind | **Kept.** *"We need armor in the domain to calculate ac. Make leather armor as an example of light armor, scale for medium, chain mail for heavy."* Already seeded in `armor_templates` with `src/rules/armor-srd.ts` and `docs/srd/source/armor-table.txt` (Leather 11+Dex, Scale Mail 14+Dex max 2, Chain Mail 16 / Str 13). |
| parenthetical qualifiers | **Keep verbatim** — exactly what shipped. |
| ranged weapon distances | **Two per weapon, near and far with disadvantage.** Now the substance of D41's v2. |

**Still unasked:** the A/B option column, which turned out to be entangled with
class starting equipment. That is unmodelled — there is no `starting_equipment`
or `class_equipment` table, despite `class-core-traits.txt:59` printing
`Choose A or B: (A) Leather`. Do not treat this table as the complete set of Q13
answers; it is the answered ones.

### Two things flagged and deliberately NOT asserted

- The `armor_templates` row count. A comment says thirteen; my own count of the
  extract found ten items plus three category headers. I have not proven which
  reading the seeder implements, so I am not recording either as fact.
- The total-level divergence between `Math.max(1, SUM(level))` at
  `spell-access-builder.ts:565` and the unfloored `reduce` at
  `build-report-builder.ts:414`. Real, unresolved, and the reason D41 refuses to
  put character level on the wire.

---

## D39 — weapon damage is a discriminated union, and the arity that describes every link already in the wild was untested (2026-07-27)

Merged as `9fc00fa`. Gates on the merged tree, run by the supervisor:
**2073 vitest / 125 files** (from 2012/124), build exit 0, **72 Playwright
passed** in 8.2m, 59 tables.

Weapon damage stops being a nullable string and becomes
`dice | flat | custom | not_recorded`. `not_recorded` is a distinct member, not a
synonym for null: a weapon whose damage nobody has entered is a different fact
from a weapon that deals no damage, and the versatile slot needs a third answer
again — `not_applicable`, for a weapon that is not versatile at all. Free text
that parses as neither dice nor a flat number survives verbatim under `custom`
rather than being coerced or dropped, which is D12/Q4 applied to a value instead
of a vocabulary.

### The merge I refused

The branch added `WEAPON_TUPLE_LENGTH_PRE_DAMAGE_UNION` and reported green. I
mutation-checked it before merging: **deleting that constant passed all 2,071
tests.**

It is not a spare. It is the arity `main` was emitting at the time — 
`WEAPON_TUPLE_LENGTH = LEGACY + 1` — which is to say **every share link already in
the wild**. A suite that cannot tell whether the current production wire format
is still accepted is not testing the thing it exists to test. The gap was
invisible precisely because the constant was new: nothing had been written
against it yet, and green looked like coverage.

I sent it back rather than merging on the report. The revise added a frozen
20-element fixture at `tests/unit/sharing/codec.test.ts:1040`, minted from
`main`'s own encoder at `d31468b` and pinned as a literal base64url string — not
generated by the encoder under test. After the revise my same mutation fails
exactly one test, with the honest message:

> `Invalid character share: wire weapons[0] must be a tuple of length 19 or 22.`

Three accepted arities now, each meaning something specific: **19** legacy,
**20** pre-damage-union (production at the time), **22** with the damage and
versatile-damage unions. D41 supersedes the practice that produced that list —
under the frozen registry those three become the explicit field lists inside
schema v1, and the next change bumps the version instead of adding a fourth
number.

### What this is evidence for

Twice in one day a constant or an export was added, reported green, and was
load-bearing for something no test touched — this, and the TS4023 brand in F19.
Both were caught by mutating the new thing rather than by reading the report.
A new symbol arriving with a green suite is the case where green means least.

---

## D38 — the five remaining domain vocabularies are typed PER TABLE, not per vocabulary: a CHECK where only our seeder writes, passthrough where a user can reach (2026-07-27)

School, damage type, condition, creature type and size were bare `varchar`.
Merged as `541883d`. Gates on the merged tree: **2012 vitest / 124 files** (from
1992/123), build exit 0, **72 Playwright**, 59 tables.

### The decision the task did not anticipate

The queue item said "remaining approved enums", which sounds like five closed
sets. D12/Q4 forbids exactly that: a closed enum a user can reach is a DATA-LOSS
bug. But the naive reading — make all five passthrough — throws away a real
constraint on tables a user CANNOT reach.

The unit of the decision is therefore the **table**, not the vocabulary. The same
word is CHECK-constrained on an SRD-seeded template table and passthrough on the
user-editable character copy:

| vocabulary | closed where | open where |
|---|---|---|
| size, creature type | `species_templates` | the character's own copy |
| damage type | SRD-only weapon and species templates | spell pivots, character weapons and effects |
| school, condition | — | user-importable catalog throughout |

**The premise was verified, not assumed.** A CHECK on a table a user can reach
is precisely the data-loss bug, so the closed side stands or falls on
unreachability: `species_templates` is written only by `src/rules/origins-srd.ts`
(the seeder), and nothing in `src/catalog/` touches it.

### Passthrough is branded per vocabulary, which is the part worth keeping

There was no existing scalar passthrough type in the repo — only paired
raw/recognised columns — so one pattern now serves all five:
`string & { readonly [sym]: 'SpellSchool' }`. Two consequences, both wanted. A
bare `string` cannot flow into the column without going through the named
conversion function, so every widening is a visible call site. And a custom
damage type cannot be passed where a custom school belongs merely because both
are strings. The brand changes no stored value; the passthrough is byte-for-byte.

### Values came from the SRD, and this was checked rather than trusted

`docs/srd/source/domain-vocabularies.txt`, pages 104, 179-180 and 188, verbatim
extract with a per-extract checksum in `docs/srd/SOURCE.md` (`ef5e8cce...`,
confirmed by the supervisor). 8 schools, 13 damage types, 15 conditions, 14
creature types, 6 sizes — each list compared MEMBER BY MEMBER against the
extract, not merely confirmed to exist. This is the D34 failure mode: that entry
shipped an unsourced Martial Arts `d4` because the list's shape looked right.

### Both directions mutation-proved, and the instrument checked first

Passthrough — making `spellSchool()` reject an unknown value:

```
× round-trips an unknown spell school through catalog, codec, slot list and Zod rows
```

Closed — deleting `species_templates_size_check` from the Drizzle schema and
regenerating, with the constraint counted **1 -> 0 -> 1** across mutate, regen and
revert so the edit could not be the silent no-op that made a green run
meaningless earlier the same day:

```
× species_templates_size_check > rejects a homebrew size in the SRD-only catalog
× leaves no CHECK constraint in the schema untested
× keeps a character size open while template size and nullable alternate size stay closed
```

That second failure is a pre-existing meta-guard in
`tests/unit/schema-check-constraints.test.ts` — a CHECK cannot be added to this
schema without a test naming it. It caught the deletion without being asked to.

**Rejected: close all five.** It reads the queue item literally and reintroduces
the D12 bug on every column a homebrew document can reach.
**Rejected: open all five.** It is safe and it discards a constraint that holds
on the tables where our own seeder is the only writer — the one place a closed
set costs nothing.
**Rejected: a single shared passthrough type.** It compiles, and it lets a
custom condition be assigned to a school column, which is the class of bug the
branded IDs exist to prevent.

---

## D37 — OWNER: a character's own notes travel opt-in, and the portability map gains an honest third state (2026-07-27)

Q12 answered: *"Opt-in, like loadouts."* Merged as `6078058`.
Baseline **1990 vitest / 123 files**, build exit 0, 72 Playwright, 59 tables.

### The question, and why it was one

The share format drops private notes consistently, EXCEPT here. Every dropped
note is WORKING STATE — a preference, an override, an acknowledgement, a
loadout. Every note on the BUILD travels — weapon, species, background, armour,
effect. `characters.notes` sits on the build side and behaved like the other
side, and **nothing in this log recorded whether that was deliberate**, so it
could not be settled by archaeology.

Opt-in resolves it without forcing either reading: a character's own notes are
the likeliest place for genuinely private text, and the sharer decides.
**Default OFF**, because a link minted before this change carries no notes and
the default must mean what those links already mean.

### The part worth keeping: the map gained a third state, not a fudge

`verbatim` claims every link carries a column. `omitted` claims none does.
Neither can say "only when asked" without lying, and a wrong classification here
PASSES the guard while being false — which is the one failure mode D30's whole
design is aimed at.

`opt_in` is keyed by the `ShareExportOptions` flag name, so a non-existent flag
is a compile error, and the engine runs **two real round trips of the same
character** — one with the flag, one on the defaults. It cannot decay into a
synonym for `omitted`: a column that never travels fails the opted-in trip, and
one that always travels fails the opted-out trip.

**A distinction the implementation drew that the question had not.**
`warning_acknowledgements` and `spell_loadouts` are opt-in as ROWS — with the
flag off, no row of theirs reaches the wire at all. This is a column whose ROW
travels regardless and whose VALUE is the sharer's choice. Those stay
`verbatim`, and the file now says why, so the next reader does not "fix" them.

### The live hazard, caught before it shipped

The character tuple was `tuple(root[2], 11, …)` — EXACT LENGTH. That is D33/F18's
weapon defect one level up: a twelfth element would have made every link already
pasted into a chat decode an old link's placeholder array AS ITS NOTES STRING.
Now variable arity with notes appended last. Reverting to exact length fails
**19 tests**, including all three frozen link fixtures and a real database
import.

**Rejected: carry notes unconditionally.** Consistent with the other build-side
notes, and it publishes the field most likely to hold something private.
**Rejected: leave them behind permanently.** Consistent with privacy, and it
silently loses part of the build with no way for the sharer to say otherwise.

---

## D36 — OWNER: upcasting is SLOT levels and the list is the point; the Cantrip Upgrade is a different mechanic with its own table (2026-07-27)

Owner ruling, given on waking, correcting the model shipped hours earlier:

> *"Some spells can be upcast every spell slot level, others only upcast every
> other spell slot level (ex. Spiritual weapon)"*

Merged as `6078058`.

### What the ruling settles

**The LIST is right, and this is why.** A spell that gains an effect at every
slot level above its base stores every level; one that gains an effect every
OTHER slot level stores only those. A threshold-plus-boolean cannot express the
second. The list was already built; the ruling explains what it is FOR.

**Upcasting is measured in SLOT levels, so the bound is 1..9.** It had shipped as
`BETWEEN 1 AND 20`, which existed only to let one column also hold character
levels. Every other spell or slot level in this schema is bounded `0..9`.

**Cantrip scaling is NOT upcasting.** The SRD calls it Cantrip Upgrade and
measures it in CHARACTER level. It gets its own table, bounded 1..20. Folding it
into "upcast" behind a discriminator is what made the shipped model ambiguous,
and `upcast_scale` is deleted.

### The mutation that isolates the ruling, and it is the best one this session

Replacing the list with a threshold leaves the every-slot-level spell
round-tripping **fine** — that assertion still passes — and fails ONLY the
every-other-level case:

```
× round-trips a spell that upcasts at EVERY slot level and one that upcasts at every OTHER slot level
  → expected [ 3, 4, 5, 6, 7, 8, 9 ] to deeply equal [ 3, 5, 7, 9 ]
```

The whole argument for a list, isolated into one failing assertion.

Both bounds probed by the supervisor against the generated schema, where the
failure MODE is the evidence — a row the CHECK admits is stopped only by the
foreign key:

```
slot    level  9  FK only (CHECK passed)      cantrip level 17  FK only (CHECK passed)
slot    level 17  CHECK constraint failed     cantrip level 20  FK only (CHECK passed)
slot    level 20  CHECK constraint failed     cantrip level 21  CHECK constraint failed
```

### `upcastScale` is REFUSED BY NAME, not silently dropped

Unknown fields are dropped everywhere else in this document format. Dropping
this one would import `{"upcastScale":"character_level","upcastLevels":[5]}` as
**slot level 5** — a number the document never stated. This is not the D12 case:
both meanings remain modelled, under names that say which. An explicit
`"upcastScale": null` is accepted and ignored, because the project's own scraper
emits one.

### What the ruling still cannot hold, stated rather than papered over

- **The list says THAT something changes at a level, never WHAT.** `[3,5,7,9]`
  plus free text. Under D26-as-amended (D35) that is fine — the structure buys
  ordering and completeness, and the table adjudicates the effect.
- **Nothing forbids a level-0 spell carrying upcast levels, or one spell
  carrying both ladders.** A child CHECK cannot see the parent's level, and a
  cross-table rule was deliberately not added — D11 part 2: the boundary
  tolerates rather than losing a whole document over one debatable row. The
  both-ladders case is TESTED AS WORKING rather than forbidden, because the
  schema genuinely does not make them exclusive.
- **Neither ladder has bundled content.** The repo ships no spell catalog. The
  two SRD Cantrip Upgrade ladders cited are already modelled elsewhere under D14
  and are NOT wired to the new table; they justify the bound, they are not seeds.

---

## D35 — OWNER: D26 is AMENDED. A value earns structure if it changes a number on the sheet OR makes the catalog searchable. (2026-07-27)

Owner ruling, given on waking, in answer to a question this project raised
against its own rule.

### The question that forced it

D26 says a value earns structure ONLY if it changes a number on the sheet. The
structured-values track built spell RANGE as an integer plus a shape enum, per
the owner's own earlier ruling — and then noticed that range **fails D26's
test**. Measured, not argued: all three readers of `spell_versions.range` echo
it verbatim, and the only rendering is the printable spell card. Structuring it
changes no number anywhere.

So the project had a ruling and a rule that contradicted each other, and the
contradiction was surfaced rather than resolved quietly in either direction.

### The amendment

> **A value earns structure if it changes a number on the sheet, OR if it makes
> the catalog searchable.**

The owner chose to widen the rule rather than revert the range work, and
explicitly so that "the next case is decided in advance" instead of being
re-argued each time.

### What this does and does not license

**DOES**: sorting, filtering and searching the catalog are now first-class
reasons to give a value structure. A player looking for "every spell with a
range of 60 feet or less" is a use this application exists to serve, and range
being text made that impossible.

**DOES NOT**: it is still not a simulator. D26's core stands — the table
adjudicates, and nothing here licenses inventory, gold, session state, or
modelling a value because it appears in the source. The second limb asks a
specific question: **would a player plausibly search or sort by this?** A
duration of "Concentration, up to 1 minute" arguably yes; a spell's flavour
paragraph no.

### Why the amendment is better than the alternatives, recorded

**Rejected: revert range to text.** It applies D26 strictly and undoes work that
is already correct and already handles "Self" and "Touch". The rule was the
thing that was too narrow, not the code.

**Rejected: keep both and treat range as an exception.** An unexplained
exception in a binding rule is how a rule stops being followed. The next value
in the same position would be argued from scratch, which is exactly what the
owner said they wanted to avoid.

D26 is not superseded; it is widened. Every earlier decision that cited D26 to
REFUSE structure — concentration conflict, gold, inventory, session state,
casting time and duration as text — still holds, because none of those was
refused for being unsearchable. They were refused for being adjudication, and
adjudication is still the table's.

---

> **NUMBERING.** Two entries were written as F17 concurrently: this one on
> `main` (the `.ai/` anchor drift) and the structured-values track's own
> (the NUL byte and the two unreachable values). The track's is renumbered
> **F18** below. One code comment cited it —
> `src/queries/background-equipment.ts` — and was updated with it; checked
> before renumbering, per the standing rule.


## F18 — `feat/structured-values` revised against review: a NUL byte made a new file invisible AND red, and two of the four structured values could not reach a player (2026-07-27)

Eleven findings against `079ef20`. **Nine fixed, two rejected with the reason
recorded.** Re-verified by me on the revised tree: **1966 vitest / 123 files,
build exit 0, 72 Playwright.** The reported `1960/1960` for `079ef20` was NOT
reproducible — that tree is red, and the reason is item 1.

### 1. F14 REGRESSED IN A BRAND-NEW FILE, and `git add` is what turned the suite red

`src/queries/background-equipment.ts:130` wrote its composite-key separator as a
LITERAL 0x00 instead of the `\u0000` escape F14 mandated. `file(1)` reported the
new file as `data`, plain `grep` could not see any of its 154 lines, and
`git diff --stat` showed `Bin 0 -> 5840 bytes` — **so the file never appeared in
the review diff at all.** `tests/unit/source-is-greppable.test.ts` exists for
exactly this and it fires; the implementer's green run must have happened while
the file was still untracked, since the guard reads `git ls-files`.

**`npm run build` was GREEN throughout, and could not have caught it**: the
module has zero production importers, so nothing from it reaches `dist` and the
dist-clean gate has nothing to scan. That is the general lesson worth keeping —
**a file written ahead of its caller is outside the build gate's reach, so the
source-level guards are the only ones covering it.** One-character fix.

### 2. THE COLLAPSE `range_kind` WAS ADDED TO PREVENT, HAPPENING TO REAL 5.2 SPELLS

`src/domain/enums.ts` states this column's purpose as keeping `Self`, `Touch`
and "the author left Range blank" from being one storage state. Measured through
the importer, that claim was FALSE for every self-origin spell whose area word
is outside the four-member shape list:

```
"Self (15-foot Emanation)" => {range_kind: null, area_shape: null, area_feet: null}
"Self (15-foot Cube)"      => {range_kind: null, area_shape: null, area_feet: null}
""                         => {range_kind: null, area_shape: null, area_feet: null}
```

Emanation and Cube are two of SRD 5.2's six areas of effect and
`Self (N-foot Emanation)` is the printed Range form of a large family of spells.
`parseSpellRange` matched `Self` unambiguously and then **threw the whole line
away** because the PARENTHETICAL was unreadable, while the bare-word path one
branch above yields the kind quite happily.

**The parse is now PARTIAL where it reads part.** `Self (…)` keeps its `self`
kind and stores no area; the unread area survives in the verbatim `range` text
that prints. Partial is not a guess — every field written was read. The old
behaviour was pinned by `tests/unit/domain/spell-range.test.ts:167`, so it would
never have been found by accident; that assertion moved to a new test that
enumerates six such lines. **The four-member shape list itself is NOT widened**:
it is the owner's ruling, the repo bundles no spell text to check a fifth member
against, and D26 says an unmodelled area changes no number on the sheet.

### 3. THE ONE STRUCTURED VALUE THAT REACHES A SCREEN COULD NOT REACH ANY SPELL A CHARACTER USES

A referenced spell version is frozen — `docs/CATALOG-IMPORT.md`: *"its imported
rules and pivots are preserved byte-for-byte"* — and the upcast progression was
inside that freeze. **Upcast is NET-NEW**, so no existing version carries it; a
version is referenced exactly when a character uses it; and the printable card
renders only spells attached to a character. The three facts compose into: the
only spells that could ever print an upcast line are the ones nobody plays, and
a user re-importing an improved document is told `updated: 0`.

**Fixed as a FILL, never an overwrite, and ALL-OR-NOTHING.** The exemption
requires `upcast_scale IS NULL` **and** zero `spell_version_upcast_levels` rows.
Per-column filling was rejected and the rejection is the load-bearing part: a
stored `slot_level` would have kept its scale while accepting a document's
CHARACTER-level ladder and printed `slot levels 5, 11, 17` — a new wrong number
invented by the fix for an absence. This is the same distinction `short_summary`
has always been exempt on: supplying a fact that was never stored is not
changing one. Mutation-verified both ways — as an overwrite, 1 fails; frozen
again, 1 fails.

### 4. THE PRINTABLE CARD PRINTED THE LITERAL WORD `undefined`

`scaleWord` is an exhaustive switch with no `default` arm, and
`printable-spell-list-builder.ts` CAST `upcast_scale` instead of validating it.
A cast cannot fail, so an out-of-vocabulary value fell through the switch to
`undefined` and `upcastLine` interpolated it. Reproduced on the pre-CHECK image
(F11's state, reached with `PRAGMA ignore_check_constraints`):

```
STORED  upcast_scale = "planar_level"
PRINTED Upcast line   = "undefined 2, 3, 4 · One additional creature per slot level above 2."
```

The docblock claiming the fallback prints the bare word `levels` was true for
NULL and false for the case a corrupt image actually produces. Now validated
with `isEnumValue`, so the docblock's claim is true — and it is executed by a
test rather than asserted. The four sibling casts in `catalog-queries.ts`
(`material_cost_kind`, `range_kind`, `area_shape`, `upcast_scale`) were closed
the same way, with a test that corrupts all four and proves the NUMBERS and the
printed text beside them are untouched.

**Stated fairly:** unchecked enum casts at the SQL boundary are pre-existing
house style, 18+ sites at merge-base. What was new here is that one of them fed
a no-default switch whose fall-through reached the player.

### 5. THE QUANTITY WAS STORED TWICE, so the only renderer said it twice

`2 Daggers` parsed to `{item_name: '2 Daggers', quantity: 2}` — the count in two
columns — and `describeBackgroundEquipmentItem` printed
`2 Daggers (×2) — weapon`, with a test pinning that string.

**Fixed in the STORAGE, not the renderer**, which is the opposite of what the
finding proposed, and the reason is that the renderer fix loses information: a
row with `quantity: 3` and a name carrying no numeral would print no count at
all. The owner's ruling is *"a list of quantity + item"* — two fields, one
count. The printed line is not lost (`background_templates.equipment_option_a`
holds the whole package verbatim, already pinned), and the PLURAL is kept
(`Daggers`, not `Dagger`), which is what makes the weapon link a declaration
rather than a name match (D15). Coin is untouched: `50 GP` keeps its numeral
because that number is money, not a count of items.

### 6. THE TOLERANT DROP WAS D34 §1's DEFECT, ONE FILE OVER

`backgroundEquipmentPackages` promised in its docblock that a row outside its
vocabulary is DROPPED. The reviewer neutered the guard and **64 tests across
four files stayed green** — verbatim the correction D34 had to make to itself:
*"The section above STATES the degradation as though stating it were pinning
it."* Pinned now by D34's own remedy: the table is rebuilt WITHOUT its CHECKs
(the pre-CHECK image is the only state the guard is reachable in — F11), an
`item_kind = 'tool'` row and an `option = 'c'` row are inserted, and both are
asserted dropped AND asserted not to mint a package heading. Re-run under the
reviewer's mutation: it fails.

### 7. TWO PARSERS READING ONE AUTHOR DISAGREED ABOUT A COMMA

`parseSpellComponents` read `worth 1,000+ GP`; `parseSpellRange` stored nothing
for `1,000 feet`. Closed with a shared `AMOUNT` fragment. **The grouping is
STRICT** — `1,00 feet` is still refused rather than read as 100, because
guessing where the author meant the comma to go is the shape of guess this
parser exists to refuse — and the six-digit ceiling is unchanged.

### 8. A CORRECTION TO THE `079ef20` COMMIT MESSAGE, which claimed the opposite

That message says *"the generated text for the existing constraints is
unchanged"* after the `columns.ts` parenthesisation fix. **FOURTEEN pre-existing
CHECK bodies changed** — eight `nullOrOneOf`, six `nullOrIntegerAtLeast`,
enumerated in the helper's docblock. The reviewer said fifteen; the fifteenth is
`spell_versions_effect_reliability_category_check`, whose CHECK body is
byte-identical and which merely stopped being the last constraint and gained a
comma. **Measured, not counted from the diff's line count** — which is the F16
discipline, and it moved the number.

The added parens are semantically inert, but `databaseSchemaSignature()` compares
this exact text, so "unchanged" is a claim about which stored images still
validate. It costs nothing here ONLY because the same change adds seven columns
to `spell_versions` and moves the signature regardless; the docblock now says so
in the place a future reader will be standing.

### 9. A docblock cited a test file that does not exist

`src/domain/coin.ts` cited `tests/unit/domain/coin.test.ts`. The five exchange
rates ARE pinned — at `tests/unit/domain/spell-components.test.ts:24-29` — so
the substance held and the pointer did not. Worth fixing because the paragraph's
whole argument is that unsourced constants are safe BECAUSE a named test guards
them, and a reader who checked the name would conclude nothing does.

### REJECTED, with the reasons

**`src/queries/background-equipment.ts` has zero production importers — NOT a
defect, and the module STAYS.** True as measured, and now stated in the file's
own header rather than left to be discovered. Deleting it was considered and
refused: it is the only reader of `background_equipment_items` anywhere, so
deleting it leaves a new table with no reader at all, and it carries the
compile-time exhaustiveness guard that makes adding a fifth `item_kind` a
deliberate change. The "no second line of defence" objection was real and is
answered by item 6 rather than by deletion. The copy path onto a character
remains the named gap it was declared as.

**Widening `spellAreaShapes` to admit Emanation, Cube and Radius.** The
four-member list is the owner's ruling verbatim, the repository ships no spell
catalog to check a fifth member against, and under D26 an area a player measures
on the table changes no number on the sheet. Item 2 keeps the ORIGIN, which is
the part that was being lost; the area word survives in the printed text.

### WHAT A SUPERVISOR SHOULD CHECK FIRST

`file src/queries/background-equipment.ts` — it must not say `data` — and then
`npm test` on a tree with everything `git add`ed, because that is the exact
combination under which the original report's numbers were not reproducible.

---

## F17 — `.ai/` anchors into `.claude/decisions.md` BY LINE NUMBER, and the newest-first convention invalidates every one of them by construction (2026-07-27)

Found by measuring the candidate audit parked last tick instead of asserting it
— and the assertion I was going to make was already wrong, twice over.

### What I was going to claim, and why it was wrong

The parked note said "`.ai` docs use line-number anchors; symbol-name anchors
would be stable". `tests/unit/docs/ai-reference-anchors-resolve.test.ts` already
says that, in its own header: it defines three anchor classes, calls the
symbol-verified one "the strong one", and states the guidance *"Where an anchor
matters and can be written as class 3, prefer class 3."* Writing it up as a
finding would have re-reported the test's own docstring as news.

### What is actually true, measured

53 anchors in `.ai/`: **20 symbol-verified** (strong — line N must CONTAIN the
named symbol) and **33 line-only** (weak — the test can only bound the line
number). The strong ones are concentrated in two files; six of eight have none.

Of the 33 weak anchors, **9 point at a declaration** and could be upgraded to
the verified form today. 19 point at prose or a comment and genuinely cannot be.

**A weak anchor can be wrong with the suite green — proven by mutation, not
argued.** `.ai/DEEP_REF_TESTING.md` cites `playwright.config.ts:5`, the port
docstring. Rewritten to `:44` — inside the `env` block, a different subject
entirely — the anchors test still passes 5/5, because the file has 54 lines.
Reverted.

### THE LIVE DEFECT, and this session caused it

Four `.ai/` anchors point into `.claude/decisions.md` by line:

| anchor | what the doc says it shows | what is there NOW |
|---|---|---|
| `:375` | "the opposite outcome when a split was badly scoped" | a blank line |
| `:390` | "a test that covered a real defect and could not fail" | a TypeScript error string from D34's die-size probe |
| `:490` | cited as evidence in `CODEBASE_GUIDE.md` | a sentence from D32 |

`decisions.md` was **untracked at session start** and is **3914 lines** now.
Every entry this session was inserted NEWEST FIRST, at the TOP. So every line
anchor into that file was invalidated the first time an entry was added above
its target, and has drifted further with each one since.

The anchors test cannot catch this and was never going to: it bounds the line
number, and a file that only grows is always long enough.

### The collision is between two conventions, both of which are right

The decisions file is append-at-top by design — highest number is newest, and
`AGENTS.md` says so. Line anchors are stable only in a file that grows at the
BOTTOM. Nothing was done wrong; two correct conventions were composed without
anyone noticing that one destroys the other. That is F10's shape exactly:
machinery that silently taxes every change made elsewhere.

The anchors test's header reasons carefully about why `.claude/` must NOT be
held to the tree — it is a chronological record, and rewriting its anchors to
satisfy a lint "would be falsifying the log". Correct, and it does not consider
the reverse direction: `.ai/` anchoring INTO that chronological file.

### Decision: anchor into the decisions log by D/F NUMBER, never by line

`D29` names an entry for as long as the entry exists. `:390` names a position
that the next insertion moves. The log already has stable identifiers, designed
for exactly this, used everywhere else in the project's prose.

The anchors test can then verify a `decisions.md#D29`-style reference resolves
to a real heading — which is class-3 strength (the target must CONTAIN the
identifier) rather than class-2 bounding, so it becomes a stronger check than
the one it replaces, not a weaker one.

**Rejected: stop anchoring from `.ai/` into `.claude/` entirely.** It severs a
genuinely useful link — the deep references cite decisions to explain WHY a rule
exists, and that is the reference library working as intended.

**Rejected: renumber the anchors whenever the log grows.** That is the F10 tax
made explicit and permanent, on a file that grew 3914 lines in one session.

**Rejected: append the decisions log at the BOTTOM instead.** It would fix the
anchors and break the thing the convention exists for — a reader opening the
file sees the newest binding decision first, and `AGENTS.md` promises that.

### IMPLEMENTED — merged as `243ac01`, and this was the first task codex authored

Gates run by the supervisor on the merged tree: **1992 vitest / 123 files**,
build exit 0, **72 Playwright**. Footprint 7 files; this file and the frozen
fixture untouched; no forbidden path.

Counts moved: weak line anchors **33 → 17**, symbol-contained **20 → 34**,
decisions-number references **2 → 6**. Twelve declaration anchors were upgraded,
not the nine this entry predicted — the estimate was made by sampling, the
implementation by enumerating. F16 again, in the harmless direction.

**The risk was converting blind, and it was real.** All four line anchors were
ALREADY wrong when the work started. Converting each to whatever entry now sits
at its line would have laundered a broken anchor into a confident correct-looking
one — strictly worse than leaving it visibly stale, because the new form asserts
containment and would have passed. The instruction given was therefore to read
the sentence the doc is MAKING and find the entry that supports it. Three
resolved to `D20`, one to `D19`, and the supervisor read D20's body to confirm it
genuinely contains both claims cited against it: *"the test covering it could not
fail. Mutation proved it: deleting the resolution left 1087 of 1087 passing"* and
*"against D18, where a badly-scoped split cost an hour of seam repair."*

**Both new guards mutation-proved by the supervisor**, and the FIRST attempt
proved nothing — the edit silently did not apply, so the green run was
meaningless. Redone with an append; both then failed correctly:

```
× resolves every decisions.md D/F reference to a real heading
    detail: ".claude/decisions.md has no ## D999999 heading"
× forbids file:line anchors into the append-at-top decisions log
    detail: "use a stable decisions.md D/F reference instead"
```

The replacement is stronger than what it replaced, as predicted: a line anchor
only had to be ≤ the file's length; a D/F reference must exist as a heading.

**A defect in this finding, left visible rather than edited away.** The table
above says "Four `.ai/` anchors" and then lists THREE. The count was right and
the enumeration was short — precisely the F16 failure, committed inside the
entry that sits two headings below F16. It is corrected here rather than in
place, because the wrong version is the evidence.

---

## F16 — I verified the SHAPE of a thing instead of the thing, three times in one night, and each time it reached the binding record (2026-07-27)

Not a defect in the code. A defect in how findings were produced, written down
because three tracks in a row had to correct the finding they were implementing,
and the correction was the same mistake every time.

| Finding | What was checked | What was NOT checked | What it cost |
|---|---|---|---|
| **F12** | that the two die CHECKs describe different SUBJECTS | whether either SET matches the source | `1d4` is absent from the Martial Arts extract; the `4` was an unsourced 2014 memory sitting in a CHECK whose stated purpose is that a mis-parse fails the seed |
| **F11** | a count of level columns carrying a bound | the columns themselves, enumerated | "nine carry the CHECK" is EIGHT, and an eleventh level-bearing column was missed entirely |
| **F15** | the six `kind:` values of `SHEET_GAPS` | the `detail` prose those kinds carry | the PLAYER-facing sheet said the proficiency bonus "is included in both, whatever the Proficiencies section says" — D33 had withheld it |

In all three the instrument worked, the sweep ran, and the conclusion was wrong,
because the question asked was one step away from the question that mattered.
F15 is the sharpest: the entry it appears in explicitly claims "the user-facing
surface is CORRECT", and that claim was made after LOOKING at `SHEET_GAPS` —
just at its enumeration rather than its content.

### Why this is not the same as "verify your instrument"

The instrument rule (added earlier tonight, after a NUL detector that reported
every file and a bash pattern that collapsed to empty) catches a sweep that
CANNOT find anything. This is the opposite failure: a sweep that finds exactly
what it was asked for, where the asking was wrong. A validated instrument
pointed at the wrong question returns a confident, checkable, wrong answer —
and it is more dangerous than a broken one, because the evidence looks good.

### The rule

**Before recording a finding, state the claim as a sentence about BEHAVIOUR and
ask what would have to be read to falsify it.** Then read that.

- "the two sets are different" is a claim about sets. "no character can have a
  d4 Martial Arts die" is a claim about behaviour, and falsifying it means
  reading the extract.
- "nine columns carry a bound" is a count. "no level column can hold 21" is
  behaviour, and falsifying it means enumerating them.
- "`SHEET_GAPS` has no weapon-proficiency entry" is a claim about a list.
  "nothing on the sheet tells the player something false about the proficiency
  bonus" is behaviour, and falsifying it means reading every `detail` string.

The three tracks caught all three because they were implementing, and
implementation forces contact with content that reading-for-a-summary does not.
That is a reason to keep dispatching work rather than only auditing, and a
reason the review phases keep earning their cost.

### What was NOT concluded

That the findings were worthless. All three named a real defect and all three
were implemented; F11's core measurement reproduced exactly, F15's central claim
understated the problem rather than inventing it, and F12 correctly overturned
the brief it was written against. The failure is in the SUPPORTING detail, which
is exactly where a reader stops checking — and supporting detail in a binding
file is read as established fact by whoever comes next.

---

## F15 — The agent reference tells an AI that this app derives no attack bonus and no weapon proficiency. Both are false, and a test PINS the false claim (2026-07-27)

### IMPLEMENTED as `aa078bf`, and it was WORSE than filed.

Nine further false claims were found while fixing it: eight `COVERAGE` entries
saying `not_modelled` for concepts with tables the sheet derives from, and
`SCOPE_STATEMENT` calling the app "not a character sheet" with
`src/ui/screens/sheet/` on disk. **And this entry's own claim that "the
user-facing surface is CORRECT" was FALSE** — see F16. The guard
(`tests/unit/docs/ai-reference-claims-agree.test.ts`) binds the doc gap list to
`SHEET_GAPS` in order; mutation-verified against this entry's exact defect with
both lists still six items long. Its limits are stated in the test file.

`src/ui/screens/planner/agent-reference.ts:176-183` ships this to an AI consumer
as ground truth about what the application models:

> A character's weapons are recorded — name, damage, properties, range, mastery
> property, and which of them the user has chosen their weapon mastery on.
> **NOTHING is derived from them: no attack bonus, no damage roll, no weapon
> proficiency**, no encumbrance, and no inventory.

Three of those clauses are now wrong:

- **"no attack bonus"** — `src/rules/attack-profiles.ts` computes one. The
  browser suite asserts the rendered string
  `To hit: +0 (Strength) · Damage: 2d6 Slashing`.
- **"no damage roll"** — the same line carries the damage.
- **"no weapon proficiency"** — D32/D33 built it tonight, including WITHHOLDING
  the bonus, and the sheet now has a Proficiencies section.

And `tests/unit/ui/agent-reference.test.ts:738` asserts
`expect(equipment?.note).toContain('no weapon proficiency')`, so the false
statement is pinned by a passing test. The comment above it reads "The note must
keep saying so" — true when written, false now.

### Why this is worse than an ordinary stale comment

D4 built this surface so an AI assistant could state facts about a build without
inventing them. A coverage note that UNDER-claims tells the assistant a
capability does not exist, so it will either decline to use it or recompute it
badly. It is a fabrication surface pointed at the exact consumer the feature
exists to serve.

D29's shape — a statement outliving its subject. Note the first clause was
ALREADY false before tonight: attack profiles predate this session. Tonight only
added the third.

### SECOND INSTANCE, found the next tick: `.ai/DEEP_REF_DOMAIN.md` says it too

`.ai/DEEP_REF_DOMAIN.md:116-120` enumerates what `SHEET_GAPS` contains. Compared
against the live list (read with `grep -a` — this is one of F14's three
invisible files, so a plain grep returns nothing):

| live `SHEET_GAPS` | the doc's claim |
|---|---|
| `no_class_feature_text` | no class feature text |
| `partial_subclass_catalog` | partial subclass catalog |
| `no_unarmored_defense` | no unarmoured defence |
| `no_expertise` | no Expertise |
| **`weapon_reach_not_recorded`** | **"no weapon proficiency"** |
| `background_skills_are_text` | background skills as text |

**The doc names one gap that does not exist and misses one that does.** And note
why it survived review: BOTH LISTS HAVE SIX ITEMS. A reader checking the count
sees agreement; only an item-by-item comparison catches it.

### The user-facing surface is CORRECT — only the agent-facing ones are stale

`SHEET_GAPS` itself carries no weapon-proficiency entry, so the character sheet
does not contradict its own Proficiencies section. The false claim lives only in
the two places built FOR AI CONSUMERS: the agent reference and the `.ai/` deep
reference. That is the opposite of the usual staleness pattern, where docs rot
and code is right — here the code was corrected and both of its descriptions
were not, because nothing links them.

### Why `tests/unit/docs/ai-reference-anchors-resolve.test.ts` cannot catch this

That test proves every anchor RESOLVES — that a doc's reference points at
something real. It says nothing about whether the CLAIM is true. A doc can cite
a live symbol and describe it wrongly and stay green forever. This is the same
distinction D30 drew for columns: existence is not agreement.

**The guard this wants** is the D30 shape: derive the gap list from
`SHEET_GAPS` and fail when a doc's enumeration disagrees with it, so a gap added
or removed forces both descriptions to move in the same diff. Not built yet —
scoped with the F15 fix, since fixing the prose without the guard just resets
the clock.

NOT YET FIXED — `src/ui/screens/planner/agent-reference.ts` and
`tests/unit/ui/**` are owned by the in-flight `feat/die-size-type` track. The
fix must rewrite the note AND the assertion together; changing only the
assertion to match new prose would be regenerating an expectation from our own
output.

---

## F14 — Three source files are INVISIBLE to plain `grep`, and it cost two false negatives in one tick (2026-07-27)

### IMPLEMENTED as `aa078bf`.

Ten NUL bytes, not the nine counted here. Zero NULs now across all 454 tracked
files; all three read as UTF-8 text; plain `grep` works. `src/sharing/schema.ts`
already used the escape form, so the convention existed and these three sites
were simply not following it. `tests/unit/source-is-greppable.test.ts` scans
every tracked file and self-tests that its detector fires.

```
src/queries/character-sheet-builder.ts     1 NUL byte    file(1): data
src/rules/attack-cantrips.ts               3 NUL bytes   file(1): data
src/ui/screens/planner/agent-reference.ts  6 NUL bytes   file(1): data
```

Plain `grep` finds nothing in them and does not say why — no "Binary file
matches" warning, just exit 1:

```
$ grep -c "equipment and weapons" src/ui/screens/planner/agent-reference.ts
exit=1
$ grep -ac "equipment and weapons" src/ui/screens/planner/agent-reference.ts
1
```

This was hit TWICE in one tick — searching for `SHEET_GAPS` in
`character-sheet-builder.ts`, and for the coverage array in
`agent-reference.ts`. Both returned empty; both strings were there. It was one
step from being recorded as "this string does not exist in src".

### The bytes are DELIBERATE, and the technique is sound

They are composite-key separators — `${warning.code}\u0000${warning.message}`,
`typed\u0000${sourceType}\u0000${name}` — chosen because a NUL is the one byte a
user-supplied string cannot contain, so two different pairs cannot collide into
one key. That is careful work. The finding is NOT that the separator is wrong.

### The finding is that it is written as a LITERAL byte rather than an ESCAPE

Writing `\u0000` in the source produces the identical runtime string while
leaving the file plain text. Measured:

```
"x\u0000y"   charCodeAt(1) = 0      <- identical string
file type:    ASCII text
NUL bytes:    0
greppable for the separator?  1
```

against the current form, which `file(1)` reports as `data`.

**Decision: rewrite the six sites as `\u0000` escapes.** Zero behaviour
change, the separator and its collision-resistance untouched, and three files
stop being invisible to the primary discovery tool of the agents this repository
is explicitly built to be worked on by (`.ai/`, `AGENTS.md`, and the agent
reference itself).

**Rejected: change the separator to a printable sentinel** such as `|` or `::`.
That would make the files greppable AND destroy the property the NUL was chosen
for — a user's warning message may contain any printable string, so keys could
collide. The separator is right; only its spelling is wrong.

**Rejected: document the hazard and move on.** A note in `.ai/` telling agents
to pass `-a` relies on every future agent reading it BEFORE their first grep.
The failure is silent, so those who have not read it never discover the mistake.
That happened twice tonight to the agent that wrote the guidance files.

### A second-order note worth keeping

The Bash tool itself refused a command containing a literal control character
("command contains control characters that would be hidden in the approval
dialog"). The tooling already treats a literal NUL in a command as a hazard; the
repository should treat it the same way in a source file.

---

> **NUMBERING.** These two entries were written as D30 and D31 on
> `feat/multiclass-grants` while `main` independently recorded a different
> D30 (the column-portability guard). They are renumbered D32 and D33 here;
> their bodies' self-references were updated with them. No code referenced
> either number — checked before renumbering.

## D34 — `DieSize` exists; the two subsets stay two; and F12 was right about the subjects and wrong about the values (2026-07-27)

`feat/die-size-type`, implementing F12 item (c). Verified by me on the tree:
**1797 vitest / 116 files, build exit 0, 72 Playwright.**

### What was built

`dieSizes = [4, 6, 8, 10, 12, 20, 100]` in `src/domain/enums.ts`, with
`hitDieSizes` and `martialArtsDieSizes` declared beside it `as const satisfies
readonly DieSize[]`. Six enumerated sets were authored in this repository and
they are now three declarations and their consumers:

| was | now |
|---|---|
| `dice.ts:837` `[4, 6, 8, 10, 12, 20, 100]` loop literal | `for (const size of dieSizes)` |
| `dice.ts:970` `boundedInteger(…, 2, 100)` | `selectedDieSize`, over `dieSizes` |
| `sheet.ts:190` `hit_die IN (6, 8, 10, 12)` | `integerOneOf('hit_die', hitDieSizes)` |
| `sheet.ts:530` `martial_arts_die IN (4, 6, 8, 10, 12)` | `integerOneOf(…, martialArtsDieSizes)` |
| `class-traits-srd.ts:325` `![6, 8, 10, 12].includes` | `isHitDieSize` |
| `class-traits-srd.ts:650` `![4, 6, 8, 10, 12].includes` | `isMartialArtsDieSize` |

`integerOneOf` had to be written because `oneOf` quotes its members, and
`hit_die IN ('6', …)` is a CHECK that parses and rejects every row we write. It
regenerated the `hit_die` constraint BYTE-IDENTICAL, which is the evidence that
the helper replaced the transcription rather than changing it.

### THE ONE VALUE THAT CHANGED, AND IT CORRECTS F12

**`martial_arts_die` no longer admits 4.** `docs/srd/source/attack-class-features
.txt:15-35` is the whole twenty-row Martial Arts column — four `1d6`, six `1d8`,
six `1d10`, four `1d12` — and the string `1d4` **does not occur anywhere in the
file** (`grep -c '1d4'` -> 0). The 4 is the 2014 edition's Monk, not a fact about
the bundled 5.2 extract.

F12 wrote of the two CHECKs: *"Those are different DOMAINS, not two answers to
one question. No class has a d4 hit die, so excluding 4 from `hit_die` is
correct."* That is RIGHT about the subjects and RIGHT about the direction of the
risk. It is WRONG about which constraint carried the defect: measured against the
source, the two subjects have the SAME four members, and the CHECKs differed by
exactly the one value neither of them has. Acting on F12 as written would have
frozen an unsourced 4 into the type system on the grounds that it was a
legitimate distinction — which is why this entry exists in a binding file rather
than in a commit message.

**AND NOTHING PINNED IT IN EITHER DIRECTION.** The mirror case for `hit_die` HAS
been pinned since D13 (`schema-check-constraints.test.ts`, "a d4 hit die"), so
the asymmetry was visible and had never been looked at. Removing the 4 broke no
test. It is pinned now, in three places, and restoring it fails six.

### The subsets stay SUBSETS, and TypeScript only half expresses that

`as const satisfies readonly DieSize[]` states the relation and makes a typo in
either list a compile error — verified: `[6, 8, 7, 12]` gives `TS2322: Type '7'
is not assignable to type '6 | 4 | 8 | 10 | 12 | 20 | 100'`.

**WHAT IT DOES NOT BUY, SAID PLAINLY: TypeScript is structural, so `HitDieSize`
and `MartialArtsDieSize` are the same type today and mixing them up compiles.**
A phantom brand would fix that and was rejected: every construction site would
need a cast, `$type<>()` would carry a non-primitive into drizzle-zod's contract
derivation, and the mix-up it would catch cannot produce a wrong number while the
two sets are member-for-member equal. The two remain SEPARATE DECLARATIONS
anyway, which is F12's surviving point — they are sourced from different tables
and a widening of one is not a widening of the other.

### `fixedHitPointsPerLevel`: the guard did not stay, it MOVED

The old guard was `hitDie >= 2`, which admits every integer above it — F12
measured d7 -> 4.5, d13 -> 7.5, d1001 -> 501.5 hit points per level. The function
now takes a `HitDieSize` and has NO runtime check, and that is a decision:

- a guard there could only fire for a value TypeScript never let through, which
  is "code justified by what it protects", the shape `AGENTS.md` says to remove;
- but the thing it reached for is real, and **F11 is the finding that a contract
  which merely trusts a CHECK is not a contract** — a CHECK constrains no image
  created before it existed and no hand-edited one.

So the runtime test moved to the boundary an untrusted integer actually crosses.
`hitDieOrAbsent` in `src/rules/sheet.ts` reads a stored value that is not a hit
die as **NO hit die**, which routes it into machinery that already tells the
truth: `ASSUMED_HIT_DIE` plus an `assumed_hit_die` warning. A stored 7 now gives
24 hit points and says a die was assumed, where it used to give 22 with a
fractional per-level value hidden inside a whole number. Throwing was rejected
(D11 part 2 — the reader tolerates and states); passing through is the defect.

**THE PRICE, STATED: the sheet cannot distinguish "no `class_sheet_traits` row"
from "a row holding a value the CHECK forbids".** Both read as absent. Separating
them needs a warning code carrying the rejected value, through a codec with no
channel for one. `SheetContentLookup.martialArtsDice` degrades the same way, by
dropping the level.

### D12 DECIDED: no user path supplies a die SIZE, so the closed type is safe — and the trap lands one field over, where it is already respected

The question is not whether a user supplies DICE. They do. It is whether any of
those inputs is a SIZE that a closed set could reject. Checked rather than
assumed, four inputs at a time:

1. **`character_weapons.damage_dice` / `versatile_damage_dice` — FULLY OPEN, and
   `DieSize` must never touch it.** It is not a size, it is a whole expression:
   the source's own Blowgun does `1` damage with no die (`weapons-table.txt:46`),
   Shillelagh's level-17 step is `2d6` (`weapon-attack-cantrips.txt:53-54`) and
   True Strike varies the COUNT at a fixed d6 (`:29`). Free `textInput`,
   length-only validation whose comment already states the policy, travels on the
   share wire, nothing in the repo splits it. **This is the D12/Q4 site and it
   was already decided the D12/Q4 way.** Closing it is the data-loss bug.
2. **`character_hit_point_rolls.rolled_value` — user-TYPED, and not a size.** It
   is a FACE, 1..12 from `SHEET_ROLL_BOUNDS`, whose ceiling merely HAPPENS to
   equal a die size. Unified with `hitDieSizes` it would have become a set of
   four legal rolls.
3. **`DiceConfig.basicDieSize` — user-chosen FROM OUR LIST.** A `<select>`: the
   user picks and cannot type, so closing the set loses nothing a user could have
   entered. This is the one die size a user supplies and the one place the
   closure costs zero.
4. **`class_sheet_traits.hit_die` and `class_martial_arts_dice.martial_arts_die`
   — OURS, and I checked the scopes rather than assuming them.** Both are scoped
   `catalog_class` with snapshot, backup, backupDirect, share and backupReference
   ALL false (`tables.ts:605-611`, `:653-659`), so no backup, share or snapshot
   document can carry them and **the F11 hand-edited-document path does not reach
   these columns**. Neither table is in `RowContractTable`. The only writers are
   the bundled seeders. `src/catalog/**` never writes either.

**THE HOMEBREW CASE IS ALREADY MODELLED, AND NOT AS A STRANGE DIE.** A
user-authored class arrives with NO `class_sheet_traits` row at all — which is
why `hit_die` is `number | null` and why D24 made that absence a type. Homebrew
expresses itself here as a MISSING ROW, which the type already carries, not as a
d7 a closed set would reject and lose. That is the whole reason the D12 trap does
not land on these two columns.

**Rejected: known-set-plus-passthrough for the die size.** There is no user path
to pass anything through on. A passthrough limb would be an untestable branch
whose only reachable input is a corrupt image, and it would re-open exactly the
hole `fixedHitPointsPerLevel` had.

**The residual risk, named so a reviewer does not have to find it:** if 2014
content is ever bundled, `martialArtsDieSizes` gains a 4 and `hitDieSizes` does
not. That is a one-line deliberate edit with a failing test to prompt it, which
is the D12 mechanism working rather than failing.

### The compile-time proof is a FILE THAT MUST NOT COMPILE

`docs/type-probes/die-size.probe.ts` holds thirteen statements that are each
expected to be rejected, and `tests/unit/rules/die-sizes.test.ts` runs `tsc` over
it and asserts an error on every `export const` line, no error on any other file,
and four specific messages. It lives under `docs/` because a file whose purpose
is to be rejected cannot sit inside a compiled project — `tsconfig.node.json`
includes `db`, `scripts`, `tests` and `tools`, and excluding it from a tsconfig
instead would have been a config edit made to reach green.

```
die-size.probe.ts(29,42): error TS2345: Argument of type '7' is not assignable to parameter of type '6 | 8 | 10 | 12'.
die-size.probe.ts(31,45): error TS2345: Argument of type '1001' is not assignable to parameter of type '6 | 8 | 10 | 12'.
die-size.probe.ts(38,14): error TS2322: Type '4' is not assignable to type '6 | 8 | 10 | 12'.
die-size.probe.ts(43,14): error TS2322: Type '7' is not assignable to type '6 | 4 | 8 | 10 | 12 | 20 | 100'.
die-size.probe.ts(47,59): error TS2322: Type '7' is not assignable to type '6 | 4 | 8 | 10 | 12 | 20 | 100'.
die-size.probe.ts(51,14): error TS2322: Type 'number' is not assignable to type '6 | 8 | 10 | 12'.
die-size.probe.ts(58,28): error TS2322: Type '7' is not assignable to type '6 | 4 | 8 | 10 | 12 | 20 | 100'.
```

That last one is the SUBSET clause itself, probed rather than assumed.

### Mutation-tested, six ways, run by me and reverted

- the unsourced `4` back in `martialArtsDieSizes`: **6 tests fail** across three
  files, including one nobody wrote for it;
- `7` added to `dieSizes`: **5 fail**;
- `fixedHitPointsPerLevel` widened back to `number`: **1 fails** — the probe, and
  nothing else, which is the honest measure of what a type buys;
- `hitDieOrAbsent` passing a stored 7 through: **2 fail**;
- the `boundedInteger(…, 2, 100)` clamp restored on the die-size read: **2 fail**;
- the `<select>` populated from a literal missing `d100`: the browser spec fails.

### What was NOT done

- **`dice.ts` still hardcodes the d20, the Bless/Bane d4 and the Sorcerous Burst
  d8 ten different ways**, including `9/2` written as a constant rather than
  derived from the size. Those are one specific die each, not a vocabulary, and
  neither Bless nor Bane nor Sorcerous Burst appears in `docs/srd/source/` at
  all — so there is nothing to cite them against and nothing to close.
- **`'1d' + size` is still formatted in two places** (`attack-profiles.ts:851`,
  `sheet-view.ts:315`). A `MartialArtsDie` value object would collapse them; it
  is not a die-size question.
- **`SHEET_ROLL_BOUNDS.maximum = 12` is still an independent constant**, and
  deliberately: it is a FACE, and tying it to `max(hitDieSizes)` would state a
  relation the source does not.

### REVISED AFTER REVIEW — three findings, two of them corrections to what is written above

Re-verified on a clean tree after the revision: **1803 vitest / 116 files, build
exit 0, 72 Playwright.**

**1. "It is pinned now, in three places" was true of the VALUE and false of the
GUARD.** The removal of the unsourced 4 is pinned three ways, as claimed. The
RUNTIME half of the same rule was not: `SheetContentLookup.martialArtsDice`
filters every stored value through `isMartialArtsDieSize`, and the reviewer
neutered that filter to `isMartialArtsDieSize(row.value) || true` with the whole
suite still green — 1797/1797 — while the mirror `hitDieOrAbsent` fails two tests
under the identical mutation. The section above STATES the degradation
("`SheetContentLookup.martialArtsDice` degrades the same way, by dropping the
level") as though stating it were pinning it. **That is the asymmetry this entry
claims to have closed, reappearing one method over.** Pinned now by
`tests/integration/rules/attack-profiles.test.ts`, which rebuilds
`class_martial_arts_dice` WITHOUT its CHECK — the pre-CHECK image is the only
state in which the guard is reachable, which is F11's point applied to this
table — writes a `1d7` at Monk level 5 and asserts the level is DROPPED and that
a Monk 5 falls back to the level 4 d6. Re-run under the reviewer's own mutation:
it fails.

**2. The `integerOneOf` comment's justification was FACTUALLY WRONG, and the
CHECKs were right anyway.** `db/schema/columns.ts` said the `typeof` limb was
needed because "a REAL `8.0` compares equal to 8 and would otherwise pass" a bare
`IN` list. It does not: `hit_die` and `martial_arts_die` are declared `integer`,
so INTEGER AFFINITY CONVERTS THE REAL BEFORE THE CHECK RUNS. Measured over 24
values, as bound parameters and as literals — 8, 8.0, 8.5, 6.0, `'8'`, `'8.0'`,
`' 8 '`, `'8e0'`, `'eight'`, `x'38'`, 2^53, NaN, Infinity, 1e19 and the rest —
`typeof(c) = 'integer' AND c IN (…)` and a bare `c IN (…)` agree in **every**
case. Zero behavioural defect; a stated reason that would not survive being run.

**The limb STAYS, and the corrected reason is EXECUTED rather than asserted.**
The mechanism is real where nothing converts: on a BLOB or affinity-less column
`8.0` stays a REAL and `8.0 IN (6, 8, 10, 12)` is TRUE, so the bare list stores a
REAL in a column whose vocabulary is four integers. The limb is what makes the
HELPER's guarantee — "an INTEGER equal to one of these" — independent of its
callers' declared types. `tests/unit/schema-check-constraints.test.ts` cuts the
guarded expression out of the live DDL, derives the bare form by deleting the
limb, and runs both against an `integer` column and a `BLOB` column: inert on the
first, load-bearing on the second. It also probes a REAL on both die columns for
the first time (8.0 accepted, 8.5 refused), which is the gap that let the wrong
reason stand — and which `insert` could not have covered, since JavaScript has
one number type and sqlite-wasm binds an integral one as an INTEGER.

**3. The compile-time proof reported a TOOL failure as a TYPE regression.** In
one full-suite run out of fifteen, the probe test failed with lines 29, 31, 33
and 35 missing — the four `fixedHitPointsPerLevel` statements, the only ones
whose error depends on `../../src/rules/sheet` RESOLVING. Not reproduced in
fourteen further runs or twelve direct invocations, so the root cause is not
established and is not claimed here. What IS established is the signal: with that
import made unresolvable on purpose, tsc emits `TS2307` and exactly those four
lines stop erroring, which is byte-for-byte what widening the parameter back to
`number` would look like. The test now checks the tool-level causes FIRST —
errors in other files, then `TS2307` — before comparing the line set, and every
failure message carries tsc's exit status, signal, stdout and stderr instead of
discarding stderr.

---

## D33 — A disclosed wrong number is still a wrong number: the attack profile withholds the proficiency bonus (2026-07-27)

`feat/multiclass-grants`, revising D32 against a review. Verified by me on a
clean tree: **1730 vitest / 114 files, build exit 0, 72 Playwright.**

### The finding that changed the most, and why the deferral was wrong

D32 shipped a live contradiction and SAID SO: the sheet's Proficiencies section
printed "Not proficient" for a Wizard's Greatsword while the attack profile
beside it added the proficiency bonus. The reasoning was that threading the
verdict through every profile builder was its own change.

**Disclosure is not a substitute for not shipping it.** The contradiction was
NEW on this branch — before it, no screen claimed non-proficiency at all — so
the branch created the disagreement and then documented it. The bonus is now
withheld, which is D28 §1 applied rather than quoted, and both screens answer
from ONE union.

**FOUR VERDICTS, TWO STATES, AND TWO OF THE MAPPINGS ARE DECISIONS.**
`profileProficiency` is exhaustive with no `default` arm.

- `not_proficient` -> WITHHELD. The plain case, and the one D28 §1 names.
- `category_not_stated` -> INCLUDED, with the assumption printed. D27 governs:
  *"where it is null the sheet keeps its current stated assumption."* Withholding
  would have taken the bonus off every weapon on every character imported before
  that column existed — a NEW wrong number, invented by the fix for the old one.
- `qualifier_not_evaluated` -> WITHHELD, matching the assumption the sheet
  already states. Only an imported class reaches this arm.
- The DERIVED Shillelagh row has no weapon record and therefore no verdict. It
  keeps the bonus and says it was not checked; synthesising a `simple` weapon to
  check against would be the name-matching D15 refused.

`damage_modifier` does not move in any of them — the source puts the bonus in
the attack roll only, and taking it off both would be a second wrong number.

### ONE READER, AND THE ORDER IS PART OF THE ANSWER

`ClassProficiencyLookup` is the single reader of `class_armor_training` and
`class_weapon_proficiencies`, used by the sheet builder AND the weapons panel.
Its class query repeats `ORDER BY definition.name, level.id` deliberately:
`startingClass` degrades by PICKING, so two readers that ordered differently
would give a character with no starting class a bonus on one screen and withhold
it on the other. `weapon-proficiency-agreement.test.ts` asserts the degraded case
for exactly that reason.

### The subset invariant is in the TYPE now, not only in the query

`ClassProficiencySources` was two independent `ClassProficiencies`. The review
was right that the invariant held only because one query happened to filter both
lists out of the same rows — a test helper or a homebrew importer could build an
`on_entry` naming a category `initial` does not, and it compiled. It is now ONE
row list with `on_entry` per row, read only through `classProficienciesFor`.
That is the same argument the branch used to reject a parallel TABLE, applied to
the type. Its price is stated in both places: an entry grant inherits the initial
row's qualifier and cannot differ from it.

### Two lookups that were object literals are Maps, and the reason is a real bug

`QUALIFIER_WORDS['constructor']` was a FUNCTION, not `undefined`. An imported
class qualified "constructor" walked past the `unevaluated` arm and was silently
DROPPED — the one outcome that module's contract forbids. `SKILL_COUNT_WORDS`
had the same shape with a worse end: a function carried as a skill `count`
towards an integer column. `__proto__` reaches both (`\w+` matches it). Fixed by
construction with `Map`, not by a guard someone must remember.

### What the review measured that no test could see

The sheet's whole Proficiencies section could be INVERTED — a not-proficient
weapon labelled "Proficient", the armour list emptied, "Full" swapped with
"Multiclass entry", every qualifier dropped — with the entire suite green,
because the only assertions were row-ID existence checks. Both
`unmade_multiclass_skill_choice` branches in `agent-reference.ts` were equally
unexecuted, along with both of their siblings.

Re-run against the reviewer's own mutations: the sheet-view inversion now fails
**4** tests, the agent-reference one **2**. There is browser coverage of the
section for the first time, and it asserts the number and the word together.

### Corrections to D32 itself

- **A manufactured correction was WITHDRAWN.** D32 claimed the brief said
  Barbarian's initial traits are "Light and Medium". The brief says "*include*
  Light and Medium", which is not exhaustive and is true. The SRD fact D32 stated
  was right; the attribution was invented, and it sat in a binding file. The
  other two corrections were re-verified and hold.
- **`no_starting_class` printed TWICE.** THREE derivations go through
  `startingClass` and the dedup filter compared only two of them. It now
  deduplicates the whole list on code+message — never on code alone, because two
  weapons that are both not proficient are two facts.

### Rejected, with the reason recorded

**Filtering `unmade_multiclass_skill_choice`'s ticked count to class-sourced
ticks.** `character_skill_proficiencies` has no provenance column, so a
background-sourced tick can silence the item. Fixing it means a schema change
with its own backup, share and snapshot arms (D24) and a decision about what an
imported tick with no provenance means; guessing provenance from a skill's name
is the name-matching this application refuses. The error direction is safe — it
under-reports and never invents — and the printed sentence now names the
limitation instead of leaving it in a doc comment.

---

## D32 — The multiclass entry grants are content now, and D28's "honest interim" is superseded (2026-07-27)

`feat/multiclass-grants`. Verified by me on a clean tree: **1707 vitest / 113
files, build exit 0, 71 Playwright.**

`docs/srd/source/multiclass-entry-grants.txt` had been committed and checksummed
since 3737f1c and read by NOTHING — no `?raw` import, no parser, no seed. It is
now parsed, seeded, and applied to the sheet, which closes the gap D28 §3 named
as the reason its own rule could not be computed correctly.

### The grant table was re-derived before anything was seeded, and it held

Twelve rows, six columns, checked against the extract by me and independently by
a proof agent: ZERO cell-level disagreements with the track brief. Four cells
each contradict a plausible guess and each is now pinned by its own test:
Barbarian gets Shields and NOT Light (L24-25); no class grants Simple on entry
(four grant Martial, and the word "Simple" does not occur in the file); Monk,
Sorcerer and Wizard grant the hit die alone; Bard and Ranger both grant exactly
one skill and differ only in the pool.

**TWO claims in the brief's supporting PROSE were wrong and are corrected
here**, because both were stated evidence for the design. A THIRD correction was
recorded here and has been WITHDRAWN — see the note under the two.

- The brief justified the per-row flag partly by "a parallel table would
  duplicate every qualifier (including the Monk's and Rogue's)". **No entry grant
  carries a qualifier at all** — the Monk's clause grants no weapons and the
  Rogue's grants none either. That argument is empty. The flag is still right,
  for the other two reasons: the unique indexes already exist, and the subset
  invariant becomes structural.
- "The entry grant is a PROPER subset of the initial grant" is false for six of
  twelve. Bard, Cleric, Druid, Ranger, Rogue and Warlock grant on entry exactly
  the armour training their Core Traits row grants. Harmless for the flag; not an
  invariant to assert.

**WITHDRAWN, 2026-07-27, and the withdrawal is the entry worth keeping.** This
paragraph also said: *"The brief said Barbarian's initial traits are 'Light and
Medium'. They are Light, Medium and Shields."* **The brief said no such thing.**
Its words (`.claude/TRACK-BRIEF.md:33-34`) are "**Barbarian gets Shields but NOT
Light armour** on entry, though its initial traits *include* Light and Medium" —
`include`, which is not exhaustive and is true. Barbarian's Core Traits row is
Light, Medium and Shields (`class-core-traits.txt:29-30`), and nothing in that
sentence contradicts it.

So a correction was manufactured against a claim nobody made, and it sat in a
BINDING file where a later reader would take it as a fact about the brief. The
fact it asserts about the SRD is right; the attribution is not, and a decisions
file that misquotes its own source is worse than one that says less. The other
two corrections above were verified again on the same pass and both hold.

### The invariant is structural, and that decided the shape

Armour and weapons: a per-row boolean on the EXISTING set tables. Both lists are
read off the SAME rows, `on_entry` taking only the flagged ones — so a category
the class does not train in has no row to flag and can appear in NEITHER list. A
parallel table could have held the Barbarian entering with Heavy armour and
nothing would have refused it.

Skills CANNOT use a flag and the Bard is why: "one skill of your choice"
(L37-38) is unbounded, and the Bard has no `class_skill_options` rows for a flag
to sit on. So two scalars on `class_sheet_traits`, with a CHECK tying them in
both directions — `pool='none', count=1` and `pool='any', count=0` are both
UNSTORABLE. In TypeScript the parse returns a discriminated union where `none`
carries no count at all, so the meaningless pair does not typecheck either.

**A mis-parse fails the seed.** `parseSrdMulticlassEntryGrants` checks every
entry grant against the class's own Core Traits parse and throws on a non-subset;
the seeder calls it inside the transaction. The boot health check compares the
flagged SETS member for member rather than counting rows — a database in which
every flag defaulted to 0 would pass any existence check while telling a
Fighter/Barbarian they have no shield training.

### What the extract does to a naive parser, measured

Four hazards, none of which `class-traits-srd.ts` had to handle. Every Martial
grant is hyphenated across a line break (`Mar-`/`tial`), so a line-oriented
reader extracts the category `Mar`. Five blocks break a sentence across a BLANK
LINE. Cleric and Wizard have NO bullet glyphs — their slices are taken at the
file's two highest column offsets and the cut lands right of the bullet column —
so "count the bullets" is not a safe parse. And the file's own header claim
"Nothing is edited out" is not literally true: L174 reads `izard Class Features`.
The answer is to read one SENTENCE, not one line; every hazard is a line-level
artifact and none survives the join.

### D27 landed, and the share wire needed fixing before it could

`character_weapons` has a nullable `simple | martial`, folded once from
`weapon_templates.srd_group` by an exhaustive switch with no default arm. The
comment asserting "A character's weapon has no category, before or after" was
CORRECTED rather than left standing beside a schema that contradicts it.

**The weapon share tuple had no backward tolerance and nobody had noticed.**
`weaponFromPositional` used the exact-length `tuple()`, unlike the document
level, which has used `variableTuple()` since links existed — so appending a
field would have made EVERY existing link containing a weapon fail to decode. It
now accepts both arities, and the new field is APPENDED: inserting it beside
`name` would have shifted the eighteen fields after it and decoded an old link's
damage dice into its damage type.

**The symmetric backup case had no mechanism either.** `RETIRED_ROW_COLUMNS`
accepts-and-drops a column a document carries and the schema no longer has;
nothing handled a column the schema has and an older document does not, and
`rows.ts` rejects a missing key by design. `ADDED_ROW_COLUMNS` is the mirror,
and the distinction that makes it safe is the same historical one: when the
document was written the column did not exist, so absence is not a partial row.

### Q11, and a live wrong number it replaced

The multiclass skill choice is a completeness item naming the class AND its
pool. Building it turned up a defect nobody was looking for:
`noSkillProficiencies` computed entitlement as `sum(skill_choice_count)` across
every class with no reference to `is_starting_class`, so a Fighter 5 / Bard 1 was
told they owed **5** skills where the SRD grants 3. It also fired only at zero,
so ticking one skill silenced it forever.

The fix reuses `startingClass` rather than reading the flag — the brief's
instruction, and the resolver was made GENERIC in place rather than copied, since
the completeness check holds no hit die and no proficiency set. Its query needed
a LEFT JOIN, and the outer-ness is load-bearing: an inner join drops a homebrew
class before the resolver sees it, promotes the Bard to starting class, and
credits it with its full "Choose any 3" — turning an unknown into a wrong number
about a different class.

### Tool proficiencies are parsed and dropped at the SEED, not at the parse

D26 excludes them: no tool vocabulary exists and neither changes a number. But
dropping them at the PARSE would have made the omission invisible, and a later
reader could not tell "the source grants no tool" from "we chose not to model
it". The parser reads them; the seeder discards them with the reason written
there. The two are also different SHAPES — the Bard's is a choice, the Rogue's a
fixed item — which a single nullable string would have flattened.

### What was NOT done here, and was CLOSED in the review round — see D33

**The attack profile still added the proficiency bonus unconditionally.** D28 §1
wants it WITHHELD from a weapon no class grants; the character sheet's new
Proficiencies section said "not proficient" while the attack profile beside it
printed a bonus. Threading the verdict into every profile builder and revising the
printed formulas was deferred as its own change with its own surface.

**The deferral did not survive review, and the reviewer was right.** Disclosing a
live wrong number is not the same as not shipping one, and the contradiction was
NEW on this branch: before it, no screen claimed non-proficiency at all. D33
records the fix.

**Also left:** `SheetWarning` has no subject field, so the four new codes name
their weapon in prose only; a consumer cannot group them without parsing English.
Widening the type for one family would make the other seven carry a field they
have no subject for.

### Mutation-tested, three ways

- `classProficiencyGrants` giving every class its FULL row: **6 tests fail**
  across both new files.
- The seeder flagging every armour row: **11 fail**, including three in
  `sheet-content.test.ts` that nobody wrote for this.
- The Rogue qualifier read as `every` instead of `some` — "Finesse AND Light":
  **2 fail**, one unit and one integration.

---

## F13 — The concentration and ritual regexes override an EXPLICIT false, and only for the spelling the SRD does not use (2026-07-27)

Found while measuring queue item (b) rather than trusting the brief's account of
it. The brief says the spell text fields need no parsing work because they are
already text. They are — with one exception nobody listed.

`src/catalog/catalog-importer.ts:296-308` derives two tags from free text:

```ts
if (record.ritual || /(?:^|\s)(?:or\s+)?R(?:$|\s)/iu.test(record.castingTime ?? '')) tags.push('ritual');
if (record.concentration || /^C(?:,|\s)/iu.test(record.duration ?? '')) tags.push('concentration');
```

### Both regexes read only the ABBREVIATION, and miss the spelled-out form

Run, not reasoned about:

```
"Concentration, up to 1 minute"  ->  .              <-- the SRD's own format
"C, up to 1 minute"              ->  CONCENTRATION
"C"                              ->  .
"Conc., 1 hour"                  ->  .

"1 action or Ritual"             ->  .
"1 action or R"                  ->  RITUAL
```

`^C(?:,|\s)` requires a comma or space immediately after the `C`, so
`Concentration,` fails on the `o`. The safety net has a hole exactly where the
most likely input sits.

### The real defect is not the hole — it is that the net exists at all

`src/catalog/catalog-schema.ts:229` makes BOTH booleans **required**: a catalog
document that omits `concentration` or `ritual` is refused with
`Catalog field 'concentration' must be boolean.` So the regex never fills an
absence. The only case it can change is a document that says `false` and whose
text says otherwise — and there it OVERRIDES THE AUTHOR'S EXPLICIT DECLARATION,
for one spelling and not the other.

### Decision, under the autonomy grant: the boolean is authoritative; the regexes go

- The field is required, so there is nothing to infer.
- D12/Q4: where a user supplies content, the user's content wins. A homebrew
  variant that deliberately says `concentration: false` should get `false`, not
  our reading of its prose.
- D15 refused exactly this shape — deciding a mechanical fact by matching text.
- And an inference that fires for `C,` but not for `Concentration,` is not a
  safety net; it is a coin flip that depends on the author's abbreviation habit.

**Rejected: fix the regexes to match both spellings.** It makes the override
consistent rather than removing it, and a consistent override of an explicit
declaration is worse — it would silently correct every catalog author who
disagreed with us, where today it only catches the ones who abbreviate.

**Rejected: keep them as a warning rather than a tag.** There is no absence to
warn about. A document that sets the flag has answered the question.

### IMPLEMENTED as `faf0bab`. The pre-check found the defect LIVE.

The check this entry demanded first — does anything rely on the fallback? — was
run, and the answer was better than "no":

- **The repo ships no spell catalog at all.** `docs/srd/source/` holds thirteen
  extracts and none of them is spells; the only catalog documents in the tree
  are test fixtures. All 7 spell-shaped fixture records were scanned
  independently by the supervisor: **0 rely on the fallback.**
- **The project's own scraper could never produce a reliant record.**
  `tools/scrape/parse-spell.ts` derives both booleans from the SPELLED-OUT
  words, which is exactly the spelling the importer's regexes could not see. The
  two inference layers were disjoint, and the importer's only ever fired on
  hand-written abbreviations.
- **But one fixture was being mis-tagged in exactly the way this entry
  predicted.** `tests/browser/fixtures/php-parity.ts` `catalogRecord()` defaults
  `castingTime: 'Action or R'` and `duration: 'C, up to 1 minute'` with both
  booleans `true`. The Journey Spell overrode both to `false` and inherited that
  prose — so it carried `ritual` and `concentration` tags AGAINST ITS OWN
  EXPLICIT DECLARATION. Nothing asserted those tags, so nothing caught it. It is
  now correctly untagged.

So the failure mode was not hypothetical: it was live in the tree, in the one
place where a record disagreed with its own prose. That is the entire case this
decision rests on, found rather than argued.

### The test pins the DECISION, not the code

Verified by the supervisor: mutating the importer with the **fixed** regex — the
alternative this entry rejected, matching both spellings — still fails.

```
AssertionError: expected [ 'base', 'concentration', 'ritual' ] to deeply equal [ 'base' ]
  295|  expect(tagsOf('declared-false-spelled-out')).toEqual(['base']);
```

Re-adding either the original regex or a corrected one is caught. A future
reader who thinks the hole was the problem will fail the test that says it was
not.

No test was deleted — none existed whose subject was the regex. The paragraph in
`docs/CATALOG-IMPORT.md` claiming tags are also inferred from source notation
was corrected; it became false the moment the regexes went.

---

## F12 — Queue item (c) is not the shape the brief describes, and the die vocabulary the owner asked for does not exist as a type (2026-07-27)

The cron brief says four competing die definitions exist, including "two
disagreeing CHECKs". **The two CHECKs do not disagree**, and acting on that
framing would have collapsed a correct distinction:

```
class_martial_arts_dice.martial_arts_die  IN (4, 6, 8, 10, 12)
class_sheet_traits.hit_die                IN (6, 8, 10, 12)
```

Those are different DOMAINS, not two answers to one question. No class has a d4
hit die, so excluding 4 from `hit_die` is correct, and merging them would widen
a constraint to match a different constraint's subject. The brief was written
from a count, not from a reading.

> **CORRECTED BY D34 — read that before acting on the paragraph above.** The
> DOMAINS claim holds. The implied claim that both value sets are therefore
> CORRECT does not: `1d4` appears **zero times** in
> `docs/srd/source/attack-class-features.txt`, so the `4` in
> `class_martial_arts_dice` was unsourced and has been dropped. This entry made
> the same mistake it accuses the brief of — it reasoned about the two sets
> being different instead of checking either against the source. Two further
> corrections in D34: a FIFTH literal exists at `class-traits-srd.ts:325`, and
> two occurrences of ONE subject genuinely do disagree
> (`dice.ts:837` versus `dice.ts:970`), which the section below denies.

### What is actually true

1. **The die vocabulary the owner asked for exists exactly once, in a UI file,
   as a loop literal**: `src/ui/screens/planner/dice.ts:837`,
   `for (const size of [4, 6, 8, 10, 12, 20, 100])`. The owner's words were "Do
   we have an enum for dice type? We only should have 4,6,8,10,12,20,100." The
   answer is no — the set exists as a `<select>` populator and nowhere in the
   domain.
2. **A fourth literal** at `src/rules/class-traits-srd.ts:650` re-states
   `[4, 6, 8, 10, 12]` as a runtime guard.
3. **`fixedHitPointsPerLevel` guards `hitDie >= 2`**, so it returns fractional
   hit points for any even-adjacent integer. Proven by running it:

```
d2     -> 2 HP/level          d7     -> 4.5 HP/level
d3     -> 2.5 HP/level        d13    -> 7.5 HP/level
d6     -> 4 HP/level          d100   -> 51 HP/level
d8     -> 5 HP/level          d1001  -> 501.5 HP/level
```

### Is it reachable? NO — and that is the point, not the defence

`class_sheet_traits.hit_die` carries `IN (6, 8, 10, 12)`, so no database can
hold a 7 and no live path produces 4.5. The defect is that the only thing
standing between a character sheet and a fractional Hit Point maximum is a CHECK
in one table, while the FUNCTION's parameter is `number`. D25 asks for the
opposite: close the set in the type so a wrong program fails to compile. A
`DieSize` type would make `fixedHitPointsPerLevel(7)` a compile error instead of
4.5, and the two CHECKs above would become subsets OF that type rather than
independent literals that happen to be right.

**So item (c) is one addition, not a reconciliation**: introduce the die type,
express the existing subsets in terms of it, and keep them different — because
they are different.

### The audit that found nothing, recorded because a zero is a result

Two systematic sweeps over contract-vs-CHECK agreement returned zero
divergences, and the instrument was validated before the zeros were believed
(6 `BETWEEN` and 12 `IN(...)` columns are contract-covered, so the parser was
finding things):

- no column whose CHECK range disagrees with its contract's range;
- no column whose CHECK enumerates values while its contract accepts any string.

All 23 refinement helpers in `rows.ts` are applied at least once; none is dead.
That makes **F11 the single exception in the whole layer**, and it is the
exception precisely because its column has no CHECK to agree with.

---

## D30 — A column's portability is now a DECISION made in the diff that adds it, not an oversight found later (2026-07-27)

Merged as `c8c3395`. Baseline moves to **1667 vitest / 110 files**, build exit 0,
71 Playwright, 56 tables.

### The gap, measured before it was built

`src/sharing/character-share.ts` READS shared tables with `SELECT *` and WRITES
them with hand-enumerated column lists. So a column added to a shared table is
read and then silently dropped on import, with every test still green. This has
already happened once — Q8/D24, where weapons and the stored sheet inputs did
not survive backup, share and snapshot — and it was found by a person looking.

An audit of every share table's columns against `src/sharing/*.ts` found **no
live drop today**. The 20 unnamed `spell_selection_slots` columns are correct:
slots are derived state, regenerated by the recipient's own grant rules, with
only the selection travelling. So this is not a bug fix. It closes the gap for
TOMORROW's columns, and D27's weapon category will be the first to hit it.

### What was built, and the two things that make it bite

A real round trip in `tests/integration/sharing/column-portability.test.ts`: a
distinctive value in **every column of all 18 share tables plus the character
root**, exported, compressed and decompressed through the actual fragment codec,
imported into a second database whose autoincrement sequences are pushed to 5000
first so no identifier can match by luck, then compared column by column.
209 columns — 96 carry, 113 declared as not travelling with a reason each.

1. **The map is keyed by `ColumnNamesOf<N>`, derived from the Drizzle
   declaration**, so an unclassified column is a COMPILE error before it is a
   test failure. Verified by deleting one classification:
   `TS2741: Property 'name' is missing … but required in type
   'Readonly<Record<ColumnNamesOf<"character_weapons">, Portability>>'`.
2. **Both directions bite with no separate mechanism.** A carried column that
   stops being carried fails because the recipient's value stops equalling the
   sender's; an exception-listed column that STARTS being carried fails because
   the sender's decoy turns up downstream. Verified by dropping
   `ammunition_kind` from `SHARE_WEAPON_TEXT`:
   `character_weapons.ammunition_kind did not survive the link: expected
   [ null ] to deeply equal [ 'bolt' ]`.

Both mutations were run BY THE SUPERVISOR, not taken from the agent's report,
and reverted. The branch touches exactly one file and no production code, which
is itself evidence that the agent's own mutation experiments left nothing behind.

### Rejected: a second hand-written roster of exceptions

The `SNAPSHOT_ADDITIONS` shape in `tests/unit/contracts/table-scopes.test.ts` was
the obvious precedent and it does NOT transfer. That literal earns its keep by
being an INDEPENDENTLY TRANSCRIBED oracle — it predates the derivation it
checks. A roster here would be transcribed FROM the map it is meant to check,
which is the "compare our own artifact to a hand-copy of itself" failure this
file names elsewhere. One classification, type-bound to the schema, is stronger
than two lists that can only agree with each other.

### Rejected: a source-text search over `src/sharing/*.ts`

Far cheaper, and satisfied by a column name appearing in a COMMENT. It would
have passed on a column that is named and then dropped, which is the exact
defect.

### THE LIMITATION, stated rather than glossed

**The guard cannot tell a deliberate omission from a forgotten one**, because
that difference does not exist in the code — classifying a genuinely-forgotten
column as `omitted` passes. What it guarantees is that the thought must HAPPEN:
a compile error until classified, a reason required, in the diff at the moment
the column is added. That is a smaller claim than "no column is ever dropped"
and it is the true one.

### Backup and snapshot: covered differently, and the difference is the point

The map did not generalise — it would have been ~200 entries of `verbatim`,
near-zero information. Both those paths read `SELECT *` AND build their INSERT
from `Object.keys(row)`, so the share path's drift is structurally impossible
there. They get a genericity proof instead: the same fixture through a backup
export/import and through a snapshot capture/wipe/restore, comparing every
column with NO hand-classification, exclusions by regex rule. Mutating either
write path to filter one column out fails them.

---

## F11 — The character's OWN level is the least-constrained level in the database, and two untrusted boundaries disagree about it (2026-07-27)

### IMPLEMENTED as `af5fb7e`, with two corrections to this entry.

**EIGHT columns carry the bound, not nine**, and there is an ELEVENTH
level-bearing column this entry missed: `character_source_instances.
acquired_at_character_level`. That one is contract-covered, falls back to
any-integer, and LOOKS like the same gap — but it holds the character's TOTAL
level, which this very decision deliberately tolerates above 20. Tightening it
would refuse values the app's own writers produce.

The strongest argument for the change was in neither the finding nor the brief:
these contracts gate EXPORT too, so a stored 21 is now refused on the way OUT.
No state exists where export emits a document its own importer would refuse.

Found by an audit of my own choosing during an autonomous tick, not from the
queue. Proven by execution on both sides; nothing here is argued.

### The measurement

Ten columns in this schema hold a level. **Nine carry `CHECK (class_level
BETWEEN 1 AND 20)`.** The tenth is `character_class_levels.level` — the number
every sheet computation runs off — and it carries no CHECK at all. That is
deliberate and its reason is recorded in `db/schema/character.ts`: a test inserts
level 21 on purpose to force a missing progression row, so the proof phase
classified the bound BLOCKED rather than accepted.

The CHECK is not the only place a bound could live, and this is where the two
boundaries part company:

| Boundary | What it does with `level` | Proven by |
|---|---|---|
| Share import | refuses 21 and 9999, AND refuses a combined total over 20 | `validateShareDocument`, run |
| Backup import | accepts 21, 9999, and 1,099,511,627,776 | `rowContractError`, run |

```
level=0              refused: probe.level: Too small: expected number to be >=1.
level=1              ACCEPTED by row contract
level=20             ACCEPTED by row contract
level=21             ACCEPTED by row contract
level=9999           ACCEPTED by row contract
level=1099511627776  ACCEPTED by row contract
```

```
level=21     refused: Invalid character share: classes[0].level must be an integer from 1 to 20.
level=9999   refused: Invalid character share: classes[0].level must be an integer from 1 to 20.
```

The contract for that column is `positiveInt` (`z.int().min(1)`, no maximum),
while a `classLevel` refinement — `z.int().min(1).max(20)` — already exists in
the same file and is applied to the two other contract-covered level columns.
The tight one was written and then not used on the column that matters most.

### Why it matters, stated exactly

`src/backup/character-backup.ts` says in its own header that a backup document is
"a foreign artifact written into SQLite verbatim by column name" — that is the
whole reason the contracts exist there. A hand-edited backup therefore lands an
unbounded level, and no CHECK stops it. It does not error; it flows into the
proficiency bonus, the Hit Point total and the multiclass slot table and
produces plausible wrong numbers. That is the failure this project keeps naming.

### SIX FINDINGS I ALMOST REPORTED AND DID NOT

`class_extra_attack_grants`, `class_martial_arts_dice`, `class_progressions`,
`named_features`, `subclass_features` and `subclass_progressions` all have a
1..20 CHECK and no contract refinement. That looks like the same gap six more
times. It is not: none of them is in `RowContractTable`, so having no refinement
is correct, and reporting them would have been F7 and F8's mistake a third time
— claiming a gap without first checking whether the thing was ever in scope.
Checking scope before counting is the habit; it cost one command here and would
have cost the credibility of the one real finding.

### The decision, taken under the overnight autonomy grant

**The per-row bound belongs in the contract; the combined-total rule does not.**

- `character_class_levels.level` moves from `positiveInt` to `classLevel`. It
  matches all nine other level columns, no production writer can emit a value
  outside it (three writers bound it), and a document carrying level 21 is not a
  document any version of this app produced.
- The combined `total <= 20` rule stays OUT of backup import, becoming a sheet
  warning instead. D11 says the boundary tolerates and the builder blocks; a
  multiclass total is exactly the kind of thing an import must accept and the
  sheet must surface. Refusing the whole document would lose a character over a
  number the sheet can simply state.

**Rejected: adding the CHECK to the column.** It is the obvious fix and it is
blocked for a recorded reason — `tests/integration/rules/class-progression.test.ts`
inserts level 21 deliberately. Unblocking it means rewriting that fixture, which
is a separate decision and a bigger one; the contract gets the same value at the
boundary that actually receives foreign documents.

**Rejected: leaving it, on the argument that only a hand-edited file reaches it.**
That argument would retire the entire contract layer, which exists for precisely
that input.

NOT YET IMPLEMENTED — recorded now because two tracks are in flight and this
touches `src/domain/contracts/rows.ts`. The `classLevel` comment's own safety
argument ("no database can hold a row outside the range, so tightening cannot
lose data") does NOT transfer to this column, since it has no CHECK; whoever
implements it must say so rather than reusing that sentence.

---

## D29 — The Laravel parity scaffolding is gone, and the review found ONE real residue in it (2026-07-26)

NUMBERING: `main` gained D27 and D28 while this branch was in flight, so this
entry is D29. It belongs ABOVE both on merge — it is the newest — and the
conflict at the top of this file is expected.

`feat/retire-parity`, implementing F10 items 1-3. Verified by me on a clean
tree: **1625 vitest / 109 files, build exit 0, 71 Playwright.**

### What went, and why each was pile (a)

- **The Laravel column-metadata hash over the live schema**, its
  `laravelTableNames` filter, and the third hash link (one `it`). Subject:
  fidelity to the Laravel migrations. Retired by D7.
- **Column ORDER**, the Laravel/native inventory SPLIT, two inventory COUNTS,
  and a duplicated merge fragment that `main` had carried since D18.
- **`laravelDefault`** — 67 defaults now written plainly. Proved by execution
  rather than inferred, which is what F10 said this needed: every one of the 67
  defaulted columns was probed with `INSERT … DEFAULT VALUES` before and after,
  and both `typeof(c)` and the value are identical in 67 of 67.
- **`spell_selection_slots.orphaned_by_change_group_id`**, dormant since it was
  written, with accept-and-drop on the way in so no existing backup file stops
  opening.

Nothing in pile (b) was deleted. Exactly one `it` was removed across the branch.

### THE RESIDUE, and it is the entry worth keeping

The deleted hash covered `(name, type, notnull, dflt_value, pk)`. Four of those
five were re-homed and WIDENED — `notnull` and `dflt_value` to all 56 tables,
`pk` to `schema-autoincrement`, all with the parallel native inventory gone. The
fifth, **declared TYPE, was re-homed nowhere**, and `main`'s own comment in
`db/schema/columns.ts` had said out loud that no other expectation read one.

Measured, both directions, not argued: retyping `change_log.reason` from
`VARCHAR` to `integer` passed **all 1624 tests and the build**; on `main` the
deleted `it` caught it. That is a real change — the string `'2024'` stops being
stored as a string.

**Restored as AFFINITY, not as the declared keyword, and the distinction is the
whole decision.** D7 names `VARCHAR`/`DATETIME`/`TINYINT(1)` as inherited
spellings and licenses renaming them freely; pinning the keyword would rebuild
exactly the tax F10 measured. What is behaviour is the affinity the keyword
resolves to. So `expectedColumns` now files every column under its affinity:
`VARCHAR` -> `TEXT` costs nothing, `VARCHAR` -> `integer` costs one deliberate
line. Both directions verified by mutation (`VARCHAR` -> `integer`, and
`DATETIME` -> `VARCHAR`), and the classifier is proved against the ENGINE — every
declared type the schema uses is executed and its storage class checked — rather
than against a reading of the documentation.

**One of the review's two probes is NOT a defect, and the difference is worth
recording.** `invalidated_at` `DATETIME` -> `integer` changes NOTHING that is
stored: INTEGER and NUMERIC affinity are identical on write and differ only
inside a `CAST`. Measured — `'2024'`, `'2024.5'`, `'x'` and `5.0` produce
identical storage classes in both, and differ from `VARCHAR` in three of the
four. The grouping still separates them, because they are separate
declarations; a column moving between those two groups is a one-line re-filing
rather than a bug, and the test says so.

### Two corrections

- The deletion of the dropped-table absence loop was justified by a link that
  does not exist: `tests/unit/contracts/table-scopes.test.ts` asserts over
  `Object.keys(TABLE_SCOPES)` and `APPLICATION_TABLES` — TypeScript literals —
  and never reads `sqlite_master`. The coverage does survive, by a longer chain:
  `column-facts-generation.test.ts` pins `COLUMN_FACTS` to `APPLICATION_TABLES`
  under a byte-for-byte freshness check, and `schema.test.ts` still compares live
  `sqlite_master` against the inventory. The deletion stands; the reason was
  wrong and the commit message is corrected.
- `RETIRED_ROW_COLUMNS` was keyed by a parameter that also received a
  `ReferenceKind` — and every reference kind IS a real table name, so two name
  spaces shared one key space with nothing enforcing that they never collide.
  Now `BackupTable | SnapshotTable | null`, which makes passing a reference kind
  a COMPILE ERROR (verified: `Type '"class_definitions"' is not assignable`).

### The shape to carry forward

F10 named the pattern — a constraint adopted to prove fidelity, outliving the
thing it proved. This adds the counterpart: **when that machinery is removed,
enumerate what it happened to cover and re-home each piece deliberately.** Four
of five were re-homed here by accident of where they already fitted; the fifth
was not, and nothing in the suite noticed for three commits. The audit is the
work, not the deletion.

---

## D28 — OWNER: warn rather than refuse; the Rogue qualifier is a union; multiclass proficiency is a UNION across classes (2026-07-26)

> "I think it is fine to just warn when a monk adds a non light martial weapon.
>  Rogue finesse or light property could be treated as a union of all weapons
>  with light and all weapons with finesse."
> "Remember for multiclass that a character only needs proficiency in a type of
>  weapon from one of its classes to be proficient."

### 1. WARN, do not refuse — and this is more correct D&D than D27 read

D27 said the builder BLOCKS an SRD-illegal choice, and the owner's Wizard/Heavy
Crossbow example sat behind it. This narrows that, and the narrowing is right:
**anyone may CARRY any weapon.** Owning a Heavy Crossbow as a Wizard is legal;
what a Wizard does not get is the PROFICIENCY BONUS on the attack.

So the app never refuses to record a weapon. It withholds the proficiency bonus
and says why. "Block the wizard from using a heavy crossbow" means "stop
printing a proficiency bonus they do not have", not "refuse the row".

**Reading recorded rather than assumed:** the guided BUILDER may still steer —
not offering a non-proficient weapon as a suggested choice — while the weapons
PANEL accepts anything and warns. That keeps D11's shape (builder guides, import
tolerates) without inventing a refusal the rules do not support. If the owner
meant something stronger for the builder specifically, this is the line to
correct.

### 2. The Rogue qualifier is a set union, not a predicate language

"Martial weapons that have the Finesse or Light property" is exactly: martial
AND (finesse OR light). Both flags are already stored as booleans on the weapon.
No expression parser, no AST — codex proposed a small predicate AST and the
owner's simpler reading is sufficient for the only two qualifiers the SRD prints
(Rogue: Finesse or Light; Monk: Light).

### 3. MULTICLASS PROFICIENCY IS A UNION — and there is a wrinkle we do not have content for

The owner's rule: proficiency in a weapon type from ANY one class makes the
character proficient. A Wizard/Fighter is proficient with martial weapons
because Fighter grants it. A naive implementation checking only the first class,
or intersecting across classes, would be wrong — and the app already keys
saving throws off the FIRST class only, so the two rules differ and must not be
copied from each other.

**THE WRINKLE, sourced and verified rather than assumed** —
`docs/srd/source/multiclassing.txt:78-82`:

> "When you gain your first level in a class other than your initial class, you
>  gain only SOME of the new class's starting proficiencies, as detailed in each
>  class's description."

Each class has an "As a Multiclass Character" clause naming a SUBSET. The
Barbarian's, verbatim from the SRD: *"Gain the following traits from the Core
Barbarian Traits table: Hit Point Die, proficiency with Martial weapons, and
training with Shields."* — note it grants martial weapons but NOT the class's
skill proficiencies or saving throws.

So the union is over **what each class actually granted THIS character**, which
depends on whether that class was the initial one or a multiclass entry. That
per-class subset is content `docs/srd/source/` does not yet hold, and the twelve
"As a Multiclass Character" clauses would need extracting before the union can
be computed correctly.

**Until that content exists**, computing the union over each class's FULL
proficiency list would over-grant — a Barbarian dip would wrongly confer the
Barbarian's skill proficiencies. The honest interim is to compute the union over
weapon proficiencies only (which the Barbarian clause does grant) and state that
skills and saving throws from a multiclass entry are not modelled.

---

## D27 — OWNER: a character's weapon carries simple/martial. This AMENDS D1b. (2026-07-26)

> "We need to have simple/martial in order to build a character. Need to block
>  wizards from using heavy crossbows."

### Why this overrides D1b, and why the owner's reason is better than mine

D1b deliberately gave a character's weapon NO category — `db/schema/weapons.ts`
says "A character's weapon has no category, before or after" — because a
character stores VALUES, not a reference to the template it was filled from.
That reasoning was sound for its purpose and is now outweighed.

I raised this as a wrong NUMBER: every printed attack adds the proficiency bonus,
so a Rogue holding a Greatsword reads too high. The owner's reason is the
BUILDER (D11): a Wizard is proficient with Simple weapons only, and the builder
must be able to BLOCK a Heavy Crossbow rather than print a wrong bonus for it.
Blocking an illegal choice is the product's stated job; correcting a bonus after
the fact is a consolation.

**Group is a VALUE, not a reference.** `simple | martial` copied onto the
character's weapon keeps D1b's actual principle — no live link back to a
template, nothing to upgrade in place. Only the claim that a character's weapon
needs no category falls.

### The shape, following D11 exactly

- **The builder BLOCKS.** A class's weapon proficiencies are known content;
  choosing a weapon outside them is refused at the point of choosing, with the
  requirement stated.
- **Import TOLERATES.** An imported or older character with no group recorded
  keeps working. Absence is a real state, not a defect — a custom weapon someone
  typed may genuinely have no group.
- So the column is NULLABLE, and null means NOT STATED. Where it is null the
  sheet keeps its current stated assumption; where it is set the sheet is right.
  That is D24's rule again: an assumption is never printed as a fact.

### What it unlocks beyond the Wizard case

The Rogue and Monk qualifier becomes evaluable. Sourced from the Core Traits
extract: Rogue is proficient with "Simple weapons and Martial weapons that have
the Finesse or Light property"; Monk the same with Light. The weapon already
stores `finesse` and `light` as booleans, so the only missing fact was the group.
Every other class is unconditional — Barbarian simple and martial, Bard simple —
so only two classes need the qualifier at all.

**My error, recorded:** I called this candidate low-cost on codex's ranking
without checking whether the app held the fact it needed. It did not, and D1b
had removed it on purpose. Repeating a cost estimate without verifying its
premise is the same failure as F7 and F8.

### Also decided this round

- **Primary ability expression: TEXT ONLY.** It changes no number on the sheet;
  under D26 it is out. Class recommendation is builder guidance, not a sheet fact.
- **Feature prerequisites: add INVOCATION SELECTION FIRST, then parse.** The
  owner chose the path that makes the number right rather than the one that
  defers. Thirsting Blade's Extra Attack stays conditional-and-stated until a
  character can record whether they took Pact of the Blade — there is no
  invocation selection anywhere in the app today (`tables.ts:532`).

---

## D26 — OWNER: the sheet is a REFERENCE, not a simulator. Most candidates become text. (2026-07-26)

> **AMENDED BY D35 (2026-07-27) — read that before applying the rule below.**
> The test is now "changes a number on the sheet **OR** makes the catalog
> searchable". The core of this entry stands: the sheet is a reference, the
> table adjudicates, and every value refused below was refused for being
> ADJUDICATION rather than for being unsearchable — so none of those refusals
> is reopened by the amendment.

> "'Concentration conflict' this is really beyond the scope of a character
>  sheet. Sheet just needs the info that lets the player play at the table."

This is the sharpest scope line drawn so far and it invalidates work I was about
to recommend. **The table adjudicates.** The sheet's job is to hand a player the
information they need in front of them — not to simulate play, track session
state, or decide rules interactions two people would just settle.

What the sheet owes: numbers a player would otherwise compute by hand and get
wrong; what they HAVE; what they are MISSING or have not chosen (the
missed-selection problem this project exists for); and honesty about what it
does not know.

What it does not owe: anything needing situational knowledge the app cannot
have — who is mounted, what else is concentrating, what the DM ruled.

### Rulings on the twelve value-object candidates

| # | candidate | ruling |
|---|---|---|
| 1 | spell range | **STRUCTURED**: integer feet, plus a SEPARATE nullable shape enum — sphere, cylinder, cone, straight line |
| 2 | spell duration | **TEXT** |
| 3 | weapon proficiency qualifier | not yet ruled |
| 4 | casting time | **TEXT** |
| 5 | spell components | **cost in COPPER PIECES + text** |
| 6 | material cost / consumption | folded into 5; no inventory model |
| 7 | background equipment | **template list of quantity + item**, name only unless weapon or armour |
| 8 | background tools | **TEXT-only templates** |
| 9 | primary ability expression | not yet ruled |
| 10 | upcast progression | **list of levels that can upcast + text description** |
| 11 | feature prerequisites | not yet ruled |
| 12 | exceptional weapon properties | **TEXT for now.** "Let the lance be one handed and they can figure it out at the table" |

### The general rule underneath them

> "We don't need to keep track of costs outside spell components. We don't track
>  user gold or inventory outside of what affects numbers on the character sheet."

**A value only earns structure if it changes a number on the sheet.** Copper
pieces for a spell component qualify, because a component you cannot afford
changes whether you can cast. Gold, inventory and equipment valuation do not.
That is a cleaner test than my payoff/cost ranking, and it disqualifies most of
what I ranked highly.

Range survives because it is a NUMBER a player compares. Duration does not,
because tracking it is the table's job — and I had ranked it second largely on a
concentration-conflict warning that this decision removes outright.

**Rejected: my own ranking.** I ordered by what each unlocked technically. The
owner's test is narrower and better — does it move a number the sheet prints?

**Note on 12:** treating the Lance as one-handed is a deliberate, stated
simplification, not an oversight. The printed text still travels, so the table
has what it needs.

---

## D25 — OWNER: pre-alpha, replace freely; and put the rules engine in the type system (2026-07-26)

Two standing directions, now written into `AGENTS.md` with `CLAUDE.md` pointing
at it. Neither file existed before.

### 1. Pre-alpha: bias towards REPLACING code

> "this is a pre-alpha project and to bias towards replacing existing code if we
>  come up with a better structure or similar change to the codebase. Unlike in
>  an established project, deleting and/or ignoring previous code is welcome if
>  it leads to a better codebase."

This inverts the default instinct, and it retroactively justifies a lot of what
F10 found: the Laravel fidelity machinery survived because each individual
change would have moved a test expectation, and nobody was authorised to just
delete the expectation. Now they are.

**Explicit non-licences, recorded because "replace freely" is easy to
overread.** It does NOT permit deleting a test to reach green (a test may go
when its SUBJECT is gone, never to make something pass), regenerating an
expectation from our own output (the hardest rule here, no exceptions), or
losing user data. Structure is cheap to replace; a user's character is not.

### 2. As much of the rules engine as practicable stated in TYPES

> "I want as much of the rules engine to be described in the type system as well."

Recorded as an ordered list in AGENTS.md rather than a slogan, because a slogan
would be applied inconsistently. In value order: absence as a type rather than a
fallback; branded ids; closed sets closed; ranges in the type not only in a
CHECK; exhaustive switches with no default arm; value objects for structured
strings; relations in the type rather than a bare foreign key.

**The exemplar is already in the codebase** and is why the list starts where it
does: D24's `hit_die: number | null`. The query used to substitute `?? 8`, so a
guess arrived downstream indistinguishable from a sourced value and the agent
block asserted it as fact. Moving the absence into the TYPE made the assumption
a single visible decision.

**The trap is recorded with the rule, not separately**, because it is a
data-loss bug and would otherwise be discovered the hard way: a closed enum
REJECTS homebrew. This project settled the shape twice already — D12 (species
traits: bounded mechanical kinds plus free text) and Q4 (weapon properties:
known toggles plus free text). Where a user supplies content, the pattern is
known-set-plus-passthrough, not a closed enum.

### On the files themselves

`CLAUDE.md` is a POINTER to `AGENTS.md`, not a copy. The project's own tooling
demonstrated why: the consensus protocol was maintained in two files until it
drifted and two reviews called the duplication a collision risk. One source, one
place to change. Both files defer to this decisions file on any disagreement.

**Rejected:** duplicating the guidance into both files so each tool reads its
native one. Convenient, and exactly the failure already documented here.

---

## F10 — Archaeology: what else survives only because the MVP did it that way (2026-07-26)

The owner, on the VARCHAR mimicry: *"having something that renames string to
varchar seems really dumb and useless"* — and asked what else is like that.
Codex scan, read-only, plus my own verification of the concrete items.

### 1. The Laravel inventory-and-hash machinery — HIGHEST ongoing cost

`tests/unit/schema.test.ts:12-179`, `:941-1001`, `:1100-1175`.

It freezes the Laravel table and column inventory, column ORDER, declared types,
nullability, quoted defaults, and a SHA-256 derived from the old migrations. Its
own header calls the value "still Laravel-derived".

**D7 retires precisely this goal**, and the machinery has since spread BEYOND
Laravel: new native tables were forced into a parallel `expectedNativeColumns`
inventory (`:181-213`) to fit the inherited structure.

**This is the thing that has been taxing every change all session, and I can
name the receipts.** D18 records an hour of merge repair that was almost
entirely hand-updating inventories and counts across two branches; D23 and D24
each had to move table counts again. Every table, column, reorder, nullability
or default change means updating hand-maintained lists.

Deleting it breaks NO runtime behaviour. But the same file also tests real
indexes, foreign keys, cascades and uniqueness — those are behavioural and must
survive. The parity scaffolding is what goes, not the file.

### 2. `laravelDefault` — every ordinary default routed through a Laravel escape hatch

`db/schema/columns.ts:76-82`, called throughout six schema modules.

Its comment gives its only reason: Laravel emitted `DEFAULT '0'` with quotes and
the parity oracle pins the quotes verbatim. It enforces no domain rule. So a
plain default cannot be written plainly — `tinyint1('finesse').notNull()
.default(laravelDefault('0'))` is the shape of every boolean in the schema.

Replacing it changes generated SQL, moves the hash, and changes stored images —
all of which D7 sanctions. Codex INFERRED, but did not execute, that SQLite
affinity makes the runtime values equivalent; that must be proved before the
change, not assumed.

### 3. A dormant, type-incoherent column whose own comment says to drop it

`db/schema/character.ts:300-304`. `spell_selection_slots.orphaned_by_change_group_id`
is an INTEGER with no foreign key, naming `change_log.group_id`, which is a
VARCHAR uuid. **I verified it myself: zero readers and zero writers** — the only
occurrences outside generated files are a type declaration and a test fixture
setting it to null.

Its own comment: *"It deserves to be dropped, but not in this change: dropping a
column moves the Laravel parity hash and would confuse the cutover."* The cutover
is long finished and D7 retired the hash. It is inert, so low cost — but it
misrepresents a relationship that does not exist.

### What codex flagged as UNSURE, and was right to

- **The frozen `tests/fixtures/schema-pre-drizzle.sql`** — do NOT delete or
  regenerate. D9 records why: it is the independent artifact the historical
  hashes derive from. The COMPARISON against current schema is vestigial; the
  fixture is not.
- **The pre-Drizzle rejection tests** — their backward-compat subject is retired,
  but they also exercise untrusted-image rejection, degraded boot and recovery.
  Replace that coverage with a non-Laravel malformed fixture before touching them.
- **`spell_version_damage_types` / `spell_version_conditions`** — dormant, but
  they have real foreign keys in the shape a catalog import could write. D23
  already noted subclass removal needs similar columns. Not safe to call dead.
- **The `tests/parity/` PHP maps** — inherited NAMES, but D7 expressly preserves
  the behavioural D&D-rule fixtures. Renaming is not the same as deleting.

### The shape worth naming

Every item here follows one pattern: **a constraint adopted to prove fidelity to
the thing being replaced, which then outlived the replacement.** The tell is a
comment that justifies the code by what it protects rather than by what it does.
When the protected thing is retired, nothing goes looking for its protectors.

**Sequencing:** item 1 is the expensive one and should lead, because it is what
makes every other schema change cost more than it should. Item 2 rides along
with it (same tests move). Item 3 is a one-line deletion that can wait for
either.

---

## F9 — Codex on the customType migration: worth doing, and it corrected me three more times (2026-07-26)

Read-only consult, session `019fa08b`. I gave it my framing and asked to be
refuted rather than agreed with. It refuted three parts, and one of the
corrections is a landmine I would have walked into.

### Corrections to MY framing — all verified against the code

1. **"The contracts are correct" is still too strong.** The compile guard covers
   degraded columns in `RowContractTable` only — backup tables, `characters`, and
   seven native tables (`rows.ts:291,341`). **Uncontracted catalog and
   query-only tables can and do remain degraded.** So "no contracted degraded
   column reaches Zod as `z.any()`" is the true statement; mine was broader.
2. **The 257 entries are not "257 base schemas."** They are column-to-shared-schema
   MAPPINGS, and many carry genuine domain narrowing — positive ids, ranges,
   enums, non-empty. Native columns would delete only the ones that merely
   restate string / timestamp-string / integer / boolean. Most must remain. My
   "delete 257 hand-written lines" framing oversold the prize.
3. **There are 23 JSON classifications, not 8** (`json-columns.ts:64`). The prose
   at `rows.ts:47` is stale in three separate numbers now.

### The trap neither of us had seen

Native `integer({ mode: 'boolean' })` describes the value **after Drizzle
decodes it** — a boolean. But **Drizzle never runs here**, so the app sees raw
sqlite-wasm `0`/`1`. Native boolean's drizzle-zod schema therefore CANNOT be used
directly as the raw-row contract; the generator must map it to `0 | 1`
explicitly. A naive search-and-replace of `tinyint1` would produce contracts that
reject every row the database actually holds — the data-loss failure mode, from
the one direction we had not considered.

### Verdict: worth doing, but not as advertised

**Yes**, as a focused foundational migration. NOT sold as "delete 257 lines",
and NOT combined with the codec-generator rewrite.

For: 353 of 526 degraded is a permanent maintenance smell protecting a retired
goal; every ordinary new text column needs redundant manual registration before
contracts will build; and it is the precondition for generated runtime codecs.

Against: contracts are already guarded and tested; the real deletion is much
smaller than 257; boolean storage semantics make it more than mechanical.

### Migration, by family — codex's order, which I endorse

1. Teach the facts generator to represent `string`, `integer`,
   `boolean-storage` and `degraded`.
2. `datetime` first (lowest risk).
3. `varchar` and `sqlText`.
4. `tinyint1` LAST, with explicit raw `0|1` handling.
5. Delete only refinements PROVEN equivalent to the newly derived base. Keep
   enums, ranges, brands, non-empty, JSON policy.
6. `laravelDefault` separately — default quoting is its own change.

**Two different guards per increment, and the distinction matters:** a frozen
column-facts diff proves SCOPE, not correctness. Correctness needs the existing
hand-written accept/reject cases run against the newly derived schemas BEFORE
any mapping is deleted.

**And the rule that governs it:** do NOT compute a replacement metadata hash
from the new SQL. RETIRE the generated-schema-to-Laravel assertions
(`schema.test.ts:987`, `:1162`). The frozen fixture and its two historical
derivations (`:1138`, `:1144`) stay untouched — D9 records why that fixture can
never be rewritten.

### The prize is reachable

One description CAN generate both the Zod contract and the runtime codec.
Drizzle being build-time-only is not the blocker — the project already crosses
that boundary by emitting plain generated facts. A descriptor
(`sqliteBoolean()`, `integer({min:0})`, `brandedInteger<SpellVersionId>()`,
`json({shape:'array'})`) would emit two views: a strict storage schema, and a
decoder returning the domain value including `0|1 → boolean`, JSON parsing and
brands. Native Drizzle columns supply the structural base; the descriptor
supplies what Drizzle cannot know — raw sqlite-wasm representation, JSON
semantics, domain narrowing, projection shape.

Joins and computed expressions would still need a small per-query projection
description. That is the honest limit.

---

## F8 — 223 columns are degraded to `z.any()` to protect a goal D7 retired (measured 2026-07-26)

Investigated in response to the owner asking what a "codec" is and whether
Drizzle and Zod should have made it unnecessary. The answer turned up the
largest available lever in the type story.

### The three layers, and where each actually runs

| layer | runs | reach (measured) |
|---|---|---|
| Drizzle | BUILD-TIME ONLY — a vite plugin fails the build if it reaches runtime | authors `schema.sql`, provides TS types |
| Zod row contracts (`rows.ts`) | untrusted-bytes boundaries | **6 files** — backup import/export, candidate audit, seed parsing |
| Codecs (`codecs.ts`) | every query | **26 files** |

So the codec is NOT redundant with Drizzle: Drizzle is not there at runtime.
And it is not redundant with the Zod contracts either — different boundary.

**But two of them describe the same columns twice.** `spell_versions.level` is
described by `sqlInteger(row,'level')` in a codec AND by a Zod entry in
`rows.ts`. Two hand-written sources of truth for one column, free to drift.
`db/schema/columns.ts` states the intent plainly: *"Runtime decoding is INTENDED
to become Zod's job at the query boundaries. That does not exist yet."*

### CORRECTION (2026-07-26, same day): this entry overstated the defect

As first written this entry said the degraded columns "cannot describe
themselves". **That is false and was never checked before writing.** The
`z.any()` schemas are NEVER SHIPPED: `src/domain/contracts/rows.ts`
compile-forces a hand-written refinement for every degraded column —
`REFINEMENTS satisfies Record<RequiredRefinementKey, ...>` fails the build if one
is missing — and `.$type<Brand>()` means `InferSelectModel` still carries the
domain type, so the over-tightening guard is not weakened either. The contracts
are CORRECT today.

Corrected counts: **353 of 526** columns degrade, not 223 of 332 — that figure
came from the comment at `rows.ts:48`, written before ~20 tables landed, and is
itself now stale.

**The real cost, stated accurately:** 257 base schemas are written BY HAND
rather than derived, every new column pays that tax, and an opaque `customType`
is exactly what blocks deriving the codec and the contract from ONE description.
That last point is this entry's two-sources-of-truth problem and is the only
part with strategic weight.

**Revised sequencing, replacing "the highest-leverage first move":** the enum
and value-object work is the better first move — visible correctness, no
prerequisite. Dropping the mimicry is the ENABLER for merging the codec and
contract layers, which is a project rather than a move, and it is not urgent
while the contracts are correct.

### Why drizzle-zod degrades 353 of 526 columns

Every text-ish column is a Drizzle `customType` carrying only
`dataType: () => 'VARCHAR'`, with `toDriver`/`fromDriver` deliberately absent.
drizzle-zod builds a schema by inspecting the column; a customType tells it
nothing about the data, so it emits `z.any()`.

**Why those customTypes exist:** to reproduce Laravel's declared type strings —
`VARCHAR`, `DATETIME`, `TINYINT(1)` — so the Laravel-derived metadata hash would
not move. `db/schema/columns.ts` says so in its opening paragraph.

**That goal is retired.** D7: Laravel schema fidelity is NOT a goal; keep only
the rule fixtures. So 223 columns cannot describe themselves in order to protect
an oracle the owner has already released. Switching them to native `text()` /
`integer()` would let drizzle-zod produce real schemas for most.

Cost, stated honestly: it moves the metadata hash. D7 sanctions dropping the
schema-metadata parity, and D9 demonstrates how to retire such an oracle
honestly — re-derive from the frozen fixture, never regenerate from our own
output. 277 Laravel-style declared types remain in the generated schema today.

### Did the rewrite describe the DOMAIN? Half

**The schema does:** 50 relation blocks, branded ids, 25 enums, 71 CHECKs.

**The types do not.** `SpellVersionRow` (`src/domain/models.ts:41`) is
table-shaped: `school: string`, `level: number`, `provenance: string`,
`casting_time | action_type | range | duration | upcast_type: string | null`,
and `spell_identity_id: number` — a bare unbranded number where a
`SpellIdentityId` brand already exists. It answers "what columns does
`spell_versions` have", not "what is a spell". D6d prescribed the fix and it was
applied elsewhere, not here.

### Tightening, and THE TRAP that governs all of it

**A closed enum is a data-loss bug for homebrew.** Making `school` a
`z.enum([...8 SRD schools])` rejects an imported homebrew spell whose school is
"Chronomancy" — the exact over-strictness failure D13 spent its effort avoiding.
This project has already solved that shape twice: D12 (bounded mechanical kinds
plus free text) and Q4 (known weapon toggles plus free text). Same answer.

- **CLOSE** where the SRD closes the set and homebrew will not extend it:
  `level` → 0..9 (the CHECK already enforces it; only the TYPE says `number`),
  `provenance` → enum, and brand `spell_identity_id`.
- **OPEN** — known values recognised, unknown preserved: `school`,
  `action_type`, `upcast_type`. There is no `spellSchools` enum today; verified.
- **VALUE OBJECTS**: `casting_time`, `range`, `duration` are free strings holding
  structured data ("60 feet", "Concentration, up to 1 minute"). Parse with
  fallback — structured when recognised, raw retained always. D6's "a value
  object would absorb it", and what would let a sheet sort by range.
- **STRUCTURAL**, still outstanding from D6d: replace the three nullable
  `spell_*` columns with one optional relation, non-null inside.

**Recommended first move:** drop the Laravel declared-type mimicry. It is the
thing preventing 223 columns from describing themselves, and it is protecting a
goal nobody holds.

---

## D24 — Q9 closed: the character sheet exists, and an assumption is never printed as a fact (2026-07-26)

`main` be5188c. Verified by me: **1582 vitest / 107 files, build exit 0,
70 Playwright, 54 tables.**

The app finally shows a character sheet. HP, AC, saving throws, skill
modifiers, initiative and passive Perception were computed and tested since D17
but reached nothing; they reach a screen now, and the four things a player
supplies — armour, recorded hit-point rolls, skill proficiencies, a manual AC
adjustment — are stored.

### The Q8 lesson was applied rather than repeated

I checked this myself rather than reading the report, because it is the failure
this project keeps having. All four new tables are `character_owned` with
`snapshot`, `backup` and `share` all true — and classification is not the same
as working, which was exactly Q8's bug. Each arm has its own test: a
column-for-column backup round trip, a share round trip through the compressed
fragment, and a save-point restore.

Old payloads still import. A link minted before these inputs decodes with no
sheet section, and its guard asserts the frozen fragment is THIRTEEN elements —
so regenerating it from current code, which would make it fourteen, fails loudly
instead of quietly testing the new format against itself. A save point that
predates the inputs leaves them alone rather than clearing them. The test says
"absent, not empty", because an empty list would be this build putting words in
the link's mouth.

### The finding worth keeping

A homebrew class has no seeded traits and therefore no hit die. The query was
substituting `?? 8` — so a guess arrived downstream indistinguishable from a
sourced value, and the D4 agent block asserted `hit_die: 8` as fact about a
class nobody had recorded one for.

The absence now lives in the TYPE (`hit_die: number | null`), the assumption is
made at the single place the number is produced, and it emits a warning naming
the class. This is the D21 shape again: derive the reason where the value is
computed, rather than annotating it at call sites.

**Its test is the part I would keep.** It pairs the assumed-die case with a
known-d8 twin that reaches the IDENTICAL total and warns about nothing — so the
arithmetic alone cannot distinguish them and the warning is proved load-bearing.
That is how to test a degradation that does not change a number.

A recorded roll larger than the class's die is counted IN FULL and flagged.
Clamping would silently rewrite a number the player typed; refusing it would
make an imported character unopenable (D11). And it fires only where the die is
KNOWN — an assumed d8 must not convict a roll of 11 that a homebrew d12 would
allow. That non-compounding has its own test.

**Rejected, with reasoning I agree with:** routing the missing-hit-die case
through the completeness registry. `character-completeness.ts` draws the line at
"an outstanding item is something the USER must decide"; a missing catalog row
is not that. The comment promising a completeness item was deleted rather than
left to imply a mechanism that does not exist.

It also corrected an inherited falsehood: 8 is not "the median of the four hit
die sizes" (the median of 6/8/10/12 is 9). It is the MODE — six of twelve
classes print d8 — and that is checkable against the class-traits test.

---

## D23 — Q10 closed: a subclass can be imported, and a real sweep bug was found doing it (2026-07-26)

`main` a17e4e1. Verified by me: **1467 vitest / 103 files, build exit 0,
66 Playwright.**

The owner's goal — "we need to test it for if the phb gets imported" — is now
met end to end. Their own legally obtained content travels through catalog
import; nothing is bundled that is not SRD 5.2.

**The test that existed to name the gap became the test that proves it closed.**
`is not in the catalog format, and catalog.import rejects it outright` is gone,
replaced by assertions that the fixture imports, lands every field, and **raises
the attack count at Bard 6 and not at Bard 5** — the D19 grant reaching the
derivation. Renaming a failing-by-design test to keep it green was the specific
failure mode here, and the brief called it out in advance.

### The bug it found, which nobody asked it to look for

Importing an EMPTY spell document alongside a subclass document swept nothing,
while the same empty document ALONE swept correctly. Emptiness was inferred from
the whole parse (`records.kinds.size === 0`), so an empty file's meaning survived
only when it was the only file — and the multi-file picker makes the mixed
selection ordinary.

A user clearing their spell catalog while importing a subclass would have been
told nothing happened, and it would have looked like the empty file was ignored.
The fix moves the declaration to where it belongs: a document declares its own
kind. The special case collapsed and the now-unreachable branch was deleted
rather than left as uncovered dead code. The regression test was written FIRST
and confirmed red before the fix.

### Cross-kind safety, tested rather than assumed

Import is a full replacement, which makes silent deletion the obvious hazard.
Spells survive a subclass import; subclasses survive a spell import; both are
tested by name. A bundled SRD subclass cannot be targeted by an imported
document, by key or by name — so a user's import cannot overwrite free-licensed
content it did not supply.

### A finding it REJECTED, correctly

The review claimed the tests coupled to another track's in-flight files. Wrong,
and disproved rather than argued: all five symbols resolve at HEAD via
`git show`, and the `?? src/sharing/` the reviewer had seen was the OTHER
worktree's untracked files. Depending on committed shared API is normal.
Rejecting a wrong finding with evidence is the behaviour the protocol wants.

### Left open, and named

Subclass REMOVAL is still impossible: there is no way to retire an imported
subclass. It needs `provenance` and `is_active` columns on
`subclass_definitions`, which are `db/schema/` changes this track was scoped
away from. Now stated in the user-facing `docs/CATALOG-IMPORT.md` rather than
only in a source comment.

---

## F7 — Queue item (a) is far smaller than its brief says: 122 of 122 call sites already pass a codec (measured 2026-07-26)

Measured before starting the work, because the brief carries a number I put
there and numbers age.

```
real db .all/.one call sites in src/: 122
  WITH a codec:    122
  WITHOUT a codec: 0
```

Codex's original ranking — and every brief since — described "about 116 call
sites where a raw SQLite row and a decoded domain object share one API, so a
missing codec is invisible to the type checker". Earlier in this session its AST
scan found 116 calls, 46 with codecs and **70 without**. That was true when
written. The Drizzle+Zod contract work and everything after it closed all 70.

**So the practical problem is already solved.** No call site is silently
returning an undecoded row today.

### What actually remains, and it is a real defect

`codec?: RowCodec<T>` is OPTIONAL (`src/db/database.ts:52,60`,
`src/db/query.ts:45,58`). A NEW call site can omit it, default `T` to `SqlRow`,
and compile. The 122 are correct by discipline, not by construction — and
discipline is what the type system is supposed to replace.

So (a) is not a 116-site refactor. It is an API-shape change: make the decoded
path require a codec, give the genuinely-raw path its own name, and let the
compiler refuse the third option. The existing raw helpers already exist and are
used — `exec` 143, `scalar` 37, `selectValue` 6, `selectObjects` 5,
`selectObject` 4, `selectValues` 2 — so the raw side needs naming, not building.

### Why this matters beyond saving effort

The brief said (a) "NEEDS A QUIET WINDOW: run it alone", which was sound advice
for a 116-file sweep and is now over-cautious for what is closer to a signature
change plus its fallout. It can share a window with an unrelated track.

**And a caution against the obvious shortcut:** the fix is NOT to delete the
optional parameter and let 122 sites keep working by inference. If a call site
can still compile without naming its codec, nothing has been gained — the change
must make the omission a compile ERROR, and the proof is a deliberately
codec-less call that fails to build.

---

## D22 — OWNER: invert the effect model. Effects belong to the CHARACTER; the trait is provenance (2026-07-26)

I offered three options for the Tiefling two-effect problem. The owner rejected
all three and gave a fourth, which is better than any of them:

> "Can we just invert it and record that a character has resistance and then the
>  trait is that the resistance came from? Same with cantrip and others. The
>  character sheet needs to know which resistance and cantrips it has. We only
>  need to know the source when we check it."

### Why this is the right shape and my options were not

Every option I offered modelled effects as belonging to a TRAIT — one per trait,
a set per trait, or swapping which one survives. All three optimise for the
writer. The consumer is a character SHEET, and it never asks "what does this
trait do"; it asks **"what resistances does this character have"** and "what
cantrips do they know". Provenance is an audit question, answered rarely.

Inverting it dissolves the original problem rather than accommodating it. A
trait granting two effects is no longer a special case, because a trait is not
what an effect hangs from. It also fixes a bug I had not raised: effects can
come from a SUBCLASS, a FEAT or a background, not only a species, and the
trait-owned model would have needed the same fix again for each.

### The provenance mechanism already exists

`character_source_instances` carries a polymorphic `source_type` over
`class | subclass | feat | species | …` (`src/domain/enums.ts:78`,
`db/schema/character.ts:163`). That IS "where it came from". So the inversion
reuses the app's oldest machinery rather than adding a parallel one — a source
instance answers the audit question, and the effect row answers the sheet's.

### Consequences to work out when it is built

- A character-level effects table keyed by effect KIND, referencing the source
  instance. The closed compile-checked kind set and the per-kind CHECK
  constraints survive unchanged (D12, D13).
- The catalog side still needs to say what a template GRANTS; the character side
  records what was granted. Those are different questions and should not share a
  table.
- Granted spells already flow through source instances and grant rules, so the
  spell half may need no new storage at all — worth proving before building.
- The `KNOWN GAP: the Tiefling's resistance is recorded nowhere` test becomes
  the acceptance test for this work rather than a pinned defect.

**NOT started.** Two tracks are mid-implementation in the same contracts files
and D18 records what happens when three tracks contend there. Queued.

### Also decided this round

- **Next after the sheet and subclass import: SPLIT RAW VS DECODED QUERY APIs**
  — the owner chose codex's last hardening item over the guided builder. It
  touches 116 call sites, so it needs a genuinely quiet window.
- **CHASE THE F5 FLAKE** with a dedicated track, rather than leaving it
  recorded. The owner's reasoning is sound and I had underweighted it: `loads: 2`
  means the SPA router did not intercept a click, and a race that fires for a
  test can fire for a person on a slow phone.
- **The recurring cron brief is to be rewritten** to match reality — it still
  named three deleted worktrees and still said the AI bridge was blocked after
  Q1 was answered and merged.

---

## D21 — D19 built; and a review's over-redaction was reverted (2026-07-26)

`main` 703b9fb. Verified by me: **1440 vitest / 101 files, build exit 0,
65 Playwright, 50 tables.**

Extra Attack can now be granted by a class, a SUBCLASS, or a NAMED FEATURE, and
a grant can be scoped to one weapon. Thirsting Blade and Devouring Blade ship as
bundled SRD content — the real proof, since they are free-licensed and the
owner's own example is not.

**The best fix in the change was structural, not local.** A review found the
bonded-weapon guard applied at two construction sites, so a grant built anywhere
else would be counted. The obvious repair — refuse it in the combinator — would
have been WORSE: the grant would have vanished with no reason printed. Instead
the reason is derived from the field, at the single place the number is
produced, with an exhaustive switch making a third scope a compile error. Both
hand-written branches were deleted and the helper has no importer outside that
module, so a grant cannot arrive pre-annotated and be annotated twice. Mutating
either half now fails seven tests across two files; before, it failed one.

### A finding I REJECTED, and why

The review redacted "College of Valour" from D19 — including from a verbatim
quotation of the owner — citing D3's rule that imported rules text must not
reach the repository. **Reverted.**

The line runs between CONTENT and CITATION, not at every proper noun. Naming a
subclass in order to say it is NOT bundleable is nominative reference, the same
act as naming the Player's Handbook itself, which the same review kept on
exactly that reasoning. What may not enter this repository is imported rules
TEXT: prose, flavour text, feature descriptions, fixture content reproducing
them. A name identifying what is excluded reproduces nothing.

Two concrete harms decided it. It **rewrote the owner's own words inside
quotation marks**, which is a worse fault than the one it avoided. And it left
D19 unverifiable: a reader could no longer check "it is not in SRD 5.2" without
knowing which subclass.

The surface that actually matters was clean and I verified it separately — no
PHB prose in any fixture, test or source file.

**Rejected alternative:** accepting the redaction because it was the cautious
option. Over-redaction has costs, and a decision log that cannot be checked is
not a safer decision log.

### The gap this did NOT close, and it is the one the owner asked about

A subclass still **cannot be imported**. The model can express a
subclass-granted Extra Attack; the catalog import DOCUMENT format cannot carry a
subclass at all — `catalog.import` rejects the fixture outright, and the test
says so in its name rather than skipping. The owner's stated goal was "we need
to test it for if the phb gets imported", so this is the next increment: a
catalog format that can carry subclasses and their features.

---

## D20 — Attack profiles merged, and the sheet core is PARTLY wired after all (2026-07-26)

`main` ce9c5f2. Verified by me: **1242 vitest / 90 files, build exit 0,
64 Playwright, 48 tables.** The merge with the origins branch was conflict-free,
which is what the file-ownership split between concurrent tracks was for — worth
noting against D18, where a badly-scoped split cost an hour of seam repair.

D14 and D15 delivered: every weapon carries the ordered ways this character can
attack with it, each with its own bonus, dice, damage type and the ability used.
Shillelagh appears for anyone who knows the cantrip and is DERIVED, so nothing
is written to `character_weapons` and D1b still holds.

**The defect worth remembering.** The panel built its damage-type sentence and
its `<select>` from two independently-constructed lists, so the text read
"Slashing" while the control read "Radiant" — a CHOICE the SRD grants, silently
resolved two different ways on one screen. Both now come from one function, and
"not chosen" is a real first option, because a `<select>` has no empty state and
without it the undecided case became unreachable after any pick.

**And the test covering it could not fail.** Mutation proved it: deleting the
resolution left 1087 of 1087 passing. It was written at level 5, where True
Strike's extra clause supplies "Radiant" and the weapon supplies "Slashing"
whatever the code does — the expectation was true for reasons unrelated to the
behaviour. Rewritten at level 4, where no extra clause exists, so each
expectation names one type and denies the other. Four mutants now die.

The track also read D19 mid-flight and **declined to implement it**, because the
decisions file said that increment was not its. Correct.

### Q9 was overstated, and the correction matters

Q9 said `src/rules/sheet.ts` "has no production caller". Measured today, that is
no longer true and the shape is more useful than the summary:

- **LIVE:** `attacksPerAction` and `sheetProficiencyBonus`, reached from the
  planner through the attack-profile path.
- **NOT REACHED FROM ANYWHERE:** `hitPointMaximum`, `armorClass`,
  `savingThrowModifier`, `skillModifier`, `initiative`, `passivePerception` —
  zero callers outside `src/rules/`.
- **No HP, AC or passive-perception surface exists in the UI at all** — nothing
  in `src/ui/` so much as names them.

So the wiring gap is not "the sheet core is dead code". It is: the derivations
another feature happened to need got wired by that feature, and the six that
only a character SHEET would use are still waiting for a sheet to exist. That is
a smaller and better-defined piece of work than Q9 implied, and it is the next
increment once the running tracks land.

---

## D19 — Extra Attack is not keyed on (class, level), and the SRD already proves it (2026-07-26)

Owner: *"Add to the extra attack model that some subclasses can add extra attack
at level 6. Ie. college of valor bard (2024 phb)."*

**A NOTE ON NAMING, because a review redacted this quote and the redaction was
reverted.** The line runs between CONTENT and CITATION, not at every proper
noun. Naming a subclass in order to say it is NOT bundleable is nominative
reference — the same act as naming the Player's Handbook itself, which nobody
proposed to redact. What may not enter this repository is imported rules TEXT:
prose, flavour text, feature descriptions, and fixture content that reproduces
them. A name used to identify what is excluded reproduces nothing.

The redaction also rewrote the owner's own words inside quotation marks, which
is a worse fault than the one it was avoiding, and left D19 unverifiable — a
reader could no longer check "it is not in SRD 5.2" without knowing which
subclass. Restored verbatim.

Correct, and the case is broader than the example. `class_extra_attack_grants`
is keyed on `class_definition_id` + `class_level`, which can express only a
class-table row. Three things break that, and two of them are in the SRD today.

### 1. A SUBCLASS can grant it — the owner's case

College of Valour grants Extra Attack at Bard level 6. **It is NOT in SRD 5.2**,
which carries exactly one subclass per class — College of Lore for the Bard,
plus Berserker, Champion, Circle of the Land, Hunter, Fiend Patron and the rest.

So this is a MODEL requirement, not a content one. D3 governs: the model must be
able to express it so imported or homebrew content can, and the bundled seed
must not contain it, because it is not free-licensed. Building the model without
shipping the data is exactly the right split.

### 2. An INVOCATION can grant it, and the SRD has one

**Thirsting Blade** — *"Prerequisite: Level 5+ Warlock, Pact of the Blade …
You gain the Extra Attack feature FOR YOUR PACT WEAPON ONLY."* And **Devouring
Blade** — *"Prerequisite: Level 12+ Warlock, Thirsting Blade … The Extra Attack
of your Thirsting Blade invocation confers two extra attacks rather than one."*

Both are sourced in `docs/srd/source/extra-attack-other-sources.txt`. This
matters more than the subclass case for us, because it is content we could
legitimately bundle today and the current model cannot hold it.

### 3. It can be WEAPON-SCOPED, which the model has no notion of

Thirsting Blade grants Extra Attack *for the pact weapon only*. The current
derivation answers a single question — `attacksPerAction(classes)` — with one
number for the character. It cannot say "two attacks, but only with this
weapon", and a sheet that prints two attacks for every weapon a Warlock holds
would be wrong.

This lands squarely on the attack-profiles work: a profile already knows which
weapon it belongs to, so attack COUNT belongs on the profile rather than beside
it.

### Consequences, not yet implemented

- The grant needs a source that is a class, a subclass, or a named feature —
  and a prerequisite level that is a CLASS level, not a character level.
- Grants may be weapon-scoped; the count belongs with the attack profile.
- The multiclass rule still governs and is the thing most likely to be got
  wrong: Extra Attack **does not stack**, and the SRD says so about Thirsting
  Blade explicitly — it "doesn't give you additional attacks if you also have
  Extra Attack". A model that sums grants from class, subclass and invocation
  would be plausible and wrong.
- Devouring Blade shows a grant can UPGRADE another grant rather than add to it.

**Deliberately not implemented in this tick.** The attack-profiles track is
mid-revision and owns `attacksPerAction` and the profile shape. Changing the
model underneath it would conflict for no gain. Recorded now, with the evidence
sourced, and implemented as the next increment.

---

## D18 — Species and background templates merged; a two-effect gap parked (2026-07-26)

`main` 14936b3. Verified by me: **1167 vitest / 86 files, build exit 0,
62 Playwright**, schema regenerates byte-identically, and the Laravel-derived
oracle still bites. 48 tables: 30 surviving Laravel plus 18 native — 4 weapons,
8 sheet core, 6 origins.

D12 as the owner specified it: templates in the D1b sense, most traits plain
free text, a closed compile-checked set of effects for the ones that move a
number. The Elf's four-hour trance is a sentence; Dwarven Toughness, Goliath
speed and species-granted spells carry real effects.

### Dwarven Toughness was off by one, and the data was the bug

The trait reads "increases by 1, and it increases by 1 again whenever you gain a
level". The opening clause IS the level-1 grant, so the total is exactly the
character's level. It had been seeded flat=1 plus per-level=1, counting level 1
twice. Three tests had locked the wrong value in. The formula was right; only
the data was wrong — which is the failure mode a test written alongside the data
cannot catch, because it agrees with it.

### A gap that is pinned rather than hidden

A trait carries ONE effect. The Tiefling's Fiendish Legacy grants BOTH a
resistance and a cantrip, so modelling it as granted spells leaves the
resistance invisible — and swapping which half is visible only moves the
silence. The real fix is two tables plus a change to a positional share format
deliberately pinned at version 1, which is too large to do blind and was
mid-flight beside another track.

So the gap is stated at the seed site with source line numbers and **pinned by a
test that FAILS if someone silently "fixes" it**, with the design filed for the
owner. That is the right shape for a known limitation: not a TODO, an assertion.

### Two more corrections to my own extraction work

- **The 35-foot base speed is the GOLIATH, not the Wood Elf** as an earlier
  commit message of mine claimed.
- **My `background-descriptions.txt` was superseded and deleted.** I had sliced
  it at a column boundary that was too narrow on hyphenated lines, so `r-` — the
  tail of "char-" — bled into the right column. A full-width page extract has no
  such failure mode. The provenance test now asserts set equality over the
  extract directory in BOTH directions, so an unlisted or stray extract fails by
  name.

### The merge was the expensive part, and my method caused most of it

Two tracks added tables simultaneously, so every inventory assertion conflicted.
I resolved the additive conflicts with a mechanical keep-both, and that was the
wrong tool for several of them: it produced two `it(` openings with one closing,
a duplicated `toContain` argument pair, a lost array terminator, a comment body
without its opener, and a duplicated provenance table. Every one was a SYNTAX or
duplication error rather than a wrong number, so the suite caught them all — but
the lesson is that keep-both is only safe for genuinely list-shaped conflicts,
and each conflict needs classifying before a rule is applied.

Counts were derived from the two independent deltas rather than read back from
the schema: 36 FK edges before either track, origins +4, sheet +7, so 47 across
49 rows. Verified afterwards that the oracle still fails when a Laravel column
changes.

---

## D17 — The sheet core landed, and SIX of its numbers had no source until now (2026-07-26)

D11 part 1 and D12, implemented. Eight native tables, three parsers, one pure
derivation module. 42 tables (34 + 8). Verified by me after review:
**925 vitest / 75 files, build exit 0, 56 Playwright.**

### Review corrections (2026-07-26)

Three findings, all fixed. No content value was wrong — the parse, the SRD
transcription and the multiclass arithmetic were all checked by hand and held.

- **A schema comment described a safety mechanism that did not exist.**
  `armor_templates.armor_class` justified meaning "base AC" for armour and
  "+2 bonus" for the Shield on the promise that `armorClassFrom` dispatched on
  `category` with an exhaustive switch. That function did not exist, `SheetArmor`
  had no `category` field at all, and a Shield passed as worn armour computed
  AC **2**. The dispatch is now real: `category` is a REQUIRED field on
  `SheetArmor`, `armorClassFrom` switches on it with no `default` arm, and the
  role of a row is decided by WHAT IT IS rather than which argument it arrived
  in — crossed slots give the right number and a stated `armor_slot_mismatch`
  warning, per D11 part 2. **The comment was made true rather than deleted**,
  because its argument against a second `shield_bonus` column is sound.
- **The one test named for hit-point roll substitution could not fail.** Rolls of
  9 and 3 at Fighter levels 2 and 3 average to the fixed 6, so its expected total
  matched the no-rolls case asserted nine lines earlier. Rolls that do not
  average to the fixed value now discriminate, and the per-CLASS keying — which
  nothing covered, since every rolls case used one class — has its own multiclass
  case with the leak value (48) pinned as a negative control.
- **`armor_templates` was filed as `catalog_weapon`.** That role's own comment
  says labelling a table with a role it does not have "would make the role field
  lie"; armour is not a weapon. Added `catalog_armor` — additive, one union
  member — rather than merging both into `catalog_equipment`, since the role
  names what a table HOLDS and no consumer wants "weapons or armour" as one set.

Also strengthened, raised as a consistency note rather than a defect:
`hasBundledSheetContent` counted armour keys and traits rows only, so a database
with all twelve traits rows and an emptied `class_skill_options` reported healthy
and was never repaired. It now also requires the set tables to be non-empty per
class — **measured, not assumed**: saving throws (2 for all twelve) and weapon
proficiencies (1–2 for all twelve) unconditionally, skill options only where
`skill_choice_from_any` is false, because the **Bard's zero rows are correct
content** ("Choose any 3 skills", no list). `class_armor_training` is excluded
for the same reason: Monk, Sorcerer and Wizard print "Armor Training: None".

### The finding that changed the work: the extracts did not cover the sheet

A review of what a sheet actually needs against what `docs/srd/source/` held
found **six numbers with no source in this repository at all**:

- the skill-to-ability map (the only pairing anywhere was one incidental
  `Strength (Athletics)` inside a Champion feature);
- the level-1 and per-level Hit Point arithmetic;
- unarmoured Armor Class;
- Initiative;
- Passive Perception;
- the multiclass rules for Proficiency Bonus and for which proficiencies carry.

Every one was recallable from memory and none was written down. Writing the code
first would have produced values that look right and cannot be checked — F6's
exact failure. **Three extracts were added before any production code**:
`skills-table.txt`, `sheet-math.txt`, `multiclassing.txt`, re-derived from the
same PDF whose SHA-256 `SOURCE.md` records (verified matching before use).

Two measured corrections fell out of it:

- **`Performance` is in the Skills table and in NO class's skill list.** The
  twelve Core Traits tables name only seventeen skills between them. A vocabulary
  "closed on evidence" the way `weaponMasteryProperties` is would have been
  seventeen and silently wrong. `skills` is closed on the printed Skills table
  instead, and a negative-control test pins the measurement.
- **The Armor table is TWELVE armours plus Shield — 13 rows.** `SOURCE.md:40`
  said "13 armours plus Shield". Fixed, and the count is asserted as 12 + 1 so
  the off-by-one cannot return.

### Extra Attack could not be attributed, and was re-extracted rather than guessed

The committed Extra Attack section carried its seven granting rows with **no
class names**. Deciding that "Extra Attack, Tactical Shift" is a Fighter row
means recognising the feature from memory, and one row carried no distinguishing
feature name at all. The section was re-extracted with each class's Features
table title and column headers above its own rows; the parser keys on that title
and on nothing else.

The attack COUNTS are sourced too, not inferred from feature names: the Fighter's
own text says "attack twice", "attack three times", "attack four times". Reading
3 out of the words "Two Extra Attacks" would have been arithmetic on a name.

### Shape decisions worth keeping

- **`class_sheet_traits` is a separate 1:0..1 table, and its ROW'S EXISTENCE is
  the record that a class was parsed.** That is what distinguishes "Armor
  Training: None" — which Monk, Sorcerer and Wizard print in that word — from
  "we never parsed this class". Both are zero rows in `class_armor_training`.
  One table disambiguates all four set tables at once, and it buys a null-free
  `hit_die NOT NULL` where a column on `class_definitions` would have needed a
  null standing for OUR TRANSCRIPTION STATE (the D6-forbidden kind).
- **Sets are rows, not sibling columns.** N is exactly 2 for every class's saving
  throws today; a `saving_throw_1`/`saving_throw_2` pair would still be the
  correlated-null smell, order-dependent for something with no order.
- **Heavy armour is `dex_bonus = 'none'`, NOT a cap of zero.** `min(dexMod, 0)`
  SUBTRACTS for a negative modifier, so a Dexterity 6 character in Chain Mail
  would come out at 14 where the table prints a flat 16. This is a real bug the
  vocabulary prevents, and it has its own test.
- **Weapon proficiency carries a qualifier.** A bare `simple | martial` set is a
  lie about two of twelve classes — the Monk's "Martial weapons that have the
  Light property" and the Rogue's "Finesse or Light". It is displayed, never
  interpreted.
- **Extra Attack combines with `max`, never `sum`.** Fighter 5 / Ranger 5 makes
  TWO attacks. Summing per-class grants is the plausible-looking bug in exactly
  the multiclass case this app specialises in, and it is asserted against.

### The parse hazard that the file's own instructions get wrong

`class-core-traits.txt` says to "read the left column". **That is wrong for five
of twelve classes** — Monk, Ranger, Rogue, Sorcerer and Warlock have their table
in the RIGHT column. Measured, with three more hazards from the same layout:
`Hit Point Die` occurs 17 times for 12 classes (multiclass bullets bleeding in),
the Warlock's left column is the SORCERER's Draconic Spells table, and
`Tool Proficiencies` exists for only four classes and sits mid-table.

The answer is a column WINDOW taken from each block's own title line, bounded on
the right by the facing column. The bound's threshold is measured rather than
chosen: intra-table value offsets are 24..29, page-column offsets are 61..67, so
anything in 30..60 separates them and 45 is the midpoint.

### The starting-class defects are handled, not assumed away

`is_starting_class` has no uniqueness or existence constraint; `update-class.ts`
deletes a class without promoting a replacement, so a character can end up with
NO starting class; and share import writes the flag per row with no cross-row
check, so it can have several. Per D11 part 2 the import tolerance is CORRECT, so
the derivation degrades to a deterministic pick with a STATED warning rather than
throwing. Both cases have tests.

### What was deliberately NOT built, and why

**Persistence of the three stored inputs** — worn armour, shield, manual AC
adjustment, per-level HP rolls. A character-scoped table has a **36-file surface**
here (backup, share, snapshot, delete order, row contracts, candidate audit,
commands, browser tests), and a character's armour that did not survive a backup
would be a data-loss bug rather than a partial feature. The derivation functions
take all four as PARAMETERS already, so the next change adds persistence without
reshaping anything. Also excluded and said rather than half-built: class feature
text, the ten missing subclass sets, Unarmored Defense (feature text not in
`docs/srd/source/`), Expertise, and the D14/D15 attack profiles.
**Numbering note:** written as D16 in its own worktree, which branched before
the bridge decision existed. Renumbered to D17 at merge; the two are unrelated
and both are kept in full.

---

## D16 — The claude-only bridge is merged, dev-only and provably unshipped (2026-07-26)

`main` c2f8ac3. Verified by me: **850 vitest / 77 files, build exit 0, 62
Playwright**, and a clean rebuild of `dist/` grepped by hand for `ai-bridge`,
`tool_use`, `claude`, the port and `spawn` — zero hits across nine files. The
production bundle contains no bridge code at all, which is the strongest form of
"the page works without it": there is nothing there to fail.

D12 said the build "must not rely on that flag alone". It does not.

### What I verified rather than accepted

- **Prompt on stdin, argv a frozen constant.** No request-derived value reaches
  argv, and `spawn` is called with an array and `shell: false`.
- **`server.cors: false` is really set** (`vite.config.ts:71`) — barrier 2
  depends on it.
- **The production bundle is clean**, rebuilt from scratch by me.

### The measurement that justifies the argv discipline

`--tools` is VARIADIC and an empty string is an ENTRY, not a reset. The track
measured `--tools "" Bash` starting the CLI with `tools: ['Bash']`. One stray
argv token after that flag therefore grants a tool. That is why keeping
request-derived data off argv is a mitigation rather than a style preference —
and why the stream parser ASSERTS containment from the CLI's own init event
instead of trusting the flag.

### The finding I would have missed

Slash commands SURVIVE `--setting-sources ""` — 45 of them, `update-config`
included. Containment is PROMPT POSITION: text at offset 0 is intercepted by the
CLI; the same text on line 2 reaches the model as prose. Established by
experiment, not argument — the intercepted run reports model `<synthetic>`,
`num_turns: 0` and zero cost, while the un-intercepted one calls the model and
costs money. Seven unit tests now assert offset 0 is never request-derived for
any message shape.

The live assertions read the stream's `<synthetic>`/`num_turns` signals rather
than rendered text, because the un-intercepted run asks a language model about
`/context` and could quote the table's wording back. Asserting on prose would
have flaked.

### The guard that was silently a no-op

The dist-cleanliness scanner searched for `x-ai-bridge-token` while the injected
meta tag is `ai-bridge-token`. A build carrying a live session secret in
`index.html` scanned clean and exited 0 — reproduced before fixing. The tests
now DERIVE the forbidden literal from `protocol.ts` rather than restating it, so
renaming the tag re-opens the hole and fails.

### The honest gap, recorded because it is real

Any local process running as this user can call the bridge with a forged Origin
and a secret scraped from the dev server's own HTML. That is no escalation —
such a process could run the `claude` CLI directly. The guard's own comments say
this rather than overselling four barriers as a sandbox.

### Codex remains dropped

Not gated, not re-added. F2 proved `codex --sandbox read-only` executes
arbitrary commands and reads outside its working directory. The archived
codex+claude attempt stays on `feat/local-ai-bridge`, committed for preservation
and never merged.

**Rejected alternative:** merging the archived branch. Fifteen commits behind,
unreviewed, and built around the half that failed containment.

---

## D15 — Owner: model Extra Attack and Martial Arts; Shillelagh is a weapon row unconditionally (2026-07-26)

Answers to the two questions D14 raised. Both go further than the options I
offered, and both are right.

### Extra Attack becomes MODELLED, not worked around

> "Model extra attack and only show the non true strike weapon if the character
>  actually has extra attack. Also this seems like a related area to monk dice
>  for martial arts."

I offered three ways to paper over not knowing whether a character has Extra
Attack. The owner rejected all three and said to model it. That is the better
answer: every option I gave was a proxy for a fact the app could simply hold,
and the class-list proxy in particular was the kind of shortcut that rots.

So the sheet's default becomes precise rather than hedged: **if the character
has Extra Attack, show the normal weapon attack too; if they do not, True Strike
simply replaces it.** No advisory note about a case the app can now decide.

**This amends D11.** D11 deferred "class FEATURE text (Rage, Sneak Attack)".
Extra Attack is not text — it is a number that changes what the sheet prints, so
it belongs with the MECHANICAL set, exactly as D12 drew the line for species
traits: free text stays text, anything that moves a derived number gets modelled.

### The owner's connection: Martial Arts is the same shape

Monk's Martial Arts is another class feature that rewrites a weapon attack — it
substitutes a die, permits DEX where the weapon would demand STR, and scales by
level. That is structurally identical to what True Strike and Shillelagh do.

So there is ONE family, not two features: **things that modify a weapon attack
profile.** Some come from cantrips (True Strike, Shillelagh), some from class
features (Martial Arts, Extra Attack). Building them as one bounded, extensible
set is the design; building the cantrips alone and bolting on Martial Arts later
is how the second one ends up special-cased.

### Shillelagh appears unconditionally

> "Any character with shillelagh should have the stats of that on the sheet as
>  if it was a weapon. Assume the character can make it work at the table."

Not conditional on owning a Club or Quarterstaff. If the character knows the
cantrip, the sheet shows the Shillelagh attack with its full statistics — the
owner's judgement being that any real player can produce a stick.

This overrides my recommendation, which required an owned weapon to attach to,
and it is a defensible call: the alternative hides a real capability behind
inventory bookkeeping the app does not otherwise do. It does mean the app
generates a weapon row the user did not enter, which sits in tension with D1b's
"weapons are user-defined" — resolved by DERIVING the row rather than inserting
one. Nothing is written to `character_weapons`; the row is computed from the
known cantrip, like any other derived sheet value.

### Consequences

- Extra Attack and Martial Arts need per-class, per-level content, sourced from
  the SRD like the mastery counts (F6) — never recalled.
- The attack-profile family is the unit of work, not four separate features.
- All of it lands with the sheet core (D11/D12), which needs the attack and
  damage derivation none of this can exist without.

---

## D14 — Cantrips that change how a weapon attack is rolled (2026-07-26)

Owner's request, verbatim in substance: a Wizard with -1 Strength should not be
shown swinging a quarterstaff with Strength when True Strike exists; the sheet
should replace the to-hit and damage and add the extra dice. And Shillelagh
should appear as a weapon, assumed always active.

This is right, and it is exactly the "confusing tools hide the better option"
problem this project exists for. Rules SOURCED, not recalled — extracted to
`docs/srd/source/weapon-attack-cantrips.txt`.

### True Strike, as the SRD actually writes it

Divination Cantrip — **Bard, Sorcerer, Warlock, Wizard** (not Druid, not
Cleric). Action, Range Self. Material component: **a weapon you are proficient
with** worth 1+ CP.

> "you make one attack with the weapon used in the spell's casting. The attack
>  uses your spellcasting ability for the attack and damage rolls instead of
>  using Strength or Dexterity."

Damage type is **a CHOICE** — Radiant *or* the weapon's normal type — not forced
Radiant. **Cantrip Upgrade:** extra *Radiant* damage at levels 5 (1d6), 11
(2d6), 17 (3d6), regardless of which type was chosen.

Three consequences that change the implementation:
- It replaces **Strength OR Dexterity**, so it can beat a finesse weapon's DEX
  too, not just a bad STR.
- It requires **proficiency with that weapon**. A Wizard qualifies with a
  quarterstaff and does NOT with a greatsword.
- It is **one attack as an Action**. A character with Extra Attack who uses it
  LOSES attacks — so "always replace" is wrong for them. Extra Attack is not
  modelled (F4), so the app cannot currently detect this case.

### Shillelagh, as the SRD actually writes it

Transmutation Cantrip — **Druid only**. Bonus Action, 1 minute, V/S/M
(mistletoe). Applies to **a Club or Quarterstaff you are holding**, and only to
**melee** attacks with it.

Replaces **Strength only** (not Dexterity — moot, since neither weapon is
Finesse). Damage die becomes **d8**, damage type Force *or* normal (choice).
Ends early if recast or if you let go of the weapon.

**It scales, which I would have got wrong from memory:** Cantrip Upgrade changes
the die at levels 5 (d10), 11 (d12), 17 (2d6).

### The model this implies

A weapon gains ATTACK PROFILES — a derived, ordered set of ways to attack with
it. Not stored: computed from the character's known cantrips, class spellcasting
ability, proficiency, and level.

- `normal` — STR, or DEX where Finesse/ranged allows; weapon die; weapon type.
- `true_strike` — spellcasting ability; weapon die plus the level-scaled Radiant
  dice; damage type a choice.
- `shillelagh` — spellcasting ability; the upgraded die; Force or normal.

Eligibility is derived per weapon, so a Wizard's greatsword offers no True
Strike profile while their quarterstaff does. This generalises the D12 pattern
of a bounded set of mechanical effects one level further: a spell that modifies
a weapon attack, rather than a species trait that modifies a derived number.

This is SHEET-CORE work (D11) and lands with it, because it needs the attack and
damage derivation that does not exist yet.

**Assumption recorded, per the owner: Shillelagh is treated as always active.**
Its one-minute duration and Bonus Action cost are not tracked — this app has no
combat-round model and inventing one to gate a sheet row would be worse than the
assumption.

---

## D13 — Twenty-four CHECK constraints merged; two silent-no-op traps measured (2026-07-26)

`main` 05c836f. Verified by me, not on the track's word: **729 vitest / 72 files,
build exit 0, 56 Playwright**, schema regenerates byte-identically, and the
Laravel-derived signature oracle still bites (mutating `characters.name` to
nullable fails it).

**The oracle is untouched by design, not by luck:** CHECK constraints do not
appear in `PRAGMA table_info`, which is what the signature hashes. So this
change could not have moved the constant even if it tried — worth knowing before
someone "fixes" a future hash drift by regenerating it.

**I verified the over-strictness risk myself** rather than accepting the report,
because a CHECK narrower than reality turns saving into an exception: all
thirteen enum CHECKs match their array in `src/domain/enums.ts` EXACTLY, by
set comparison. Zero transcription drift. That was the failure mode with the
teeth here and it did not occur.

### Two traps, both found by measurement rather than reasoning

1. **An unquoted reserved word is a PARSE error.** `CHECK(grant IN (…))` does
   not fail one table — it fails schema application wholesale. Column references
   now route through a validating helper that backtick-quotes them.
2. **A bare `>= 0` does not fire on TEXT.** `'abc' >= 0` is TRUE in SQLite, and
   text really can reach an INTEGER column (binding `'abc'` stores
   `typeof=text`; binding `'7'` stores `integer` 7). Three constraints were bare
   lower bounds and now carry a `typeof(...) = 'integer'` limb.

   Deliberately NOT applied uniformly: the `BETWEEN` forms already reject text
   and blobs on their upper limb, leaving only a non-integral REAL inside the
   window, which no writer produces. Drawing that line and recording it beats
   fifteen more limbs for a value class that misbehaves nowhere.

3. **A CHECK evaluating to NULL is ACCEPTED by SQLite.** `spell_versions_level_check`
   compared provenance with `=`, so a NULL would have disabled the whole
   constraint. Changed to `IS`, identical on every reachable row and safer on the
   unreachable one.

### Deliberately unconstrained, and why that is right

`character_source_instances.state` has no CHECK, because adding one BREAKS CLASS
REMOVAL on the first write — four writers emit `'tombstoned'`
(`remove-source.ts:53`, `update-class.ts:250` and `:337`,
`grant-rule-slot-generator.ts:724`). The prerequisite is declaring that
vocabulary in `enums.ts` so a constraint reads ONE source rather than a
transcribed second copy. That is a separate change and is the right order.

### One divergence handed off, not resolved

`class_weapon_mastery_counts.class_level` is `BETWEEN 1 AND 20` in the schema
but unbounded in its row contract (`src/domain/contracts/rows.ts`). The track
REJECTED loosening the CHECK — nothing shows it rejecting legitimate data, and
`PROGRESSION_LEVELS` is 20 — and refused to edit the backup contract module
because another track owned it. Correct call on both counts. Reconciliation
belongs to whoever next owns `src/domain/contracts/`, and must tighten the
contract rather than loosen the constraint. Note `class_progressions_class_level_check`
carries the identical bound and drew no complaint only because that table has no
row contract at all.

---

## D12 — Owner's answers on HP, armour, species/backgrounds, and the AI bridge (2026-07-26)

Four direct answers. Three confirm the recommendation; the third changes the
design and is the most interesting.

### HP — computed average, with a per-level override

Default to the SRD fixed value (hit-die average, rounded up) plus CON modifier
per level, COMPUTED and never stored, per D11's derive-don't-store rule. A
player who rolled instead may enter that level's actual roll, and THAT is
stored — a die roll is real information the app cannot recompute, which is
exactly the line D6d draws between derived and given. Rejected: storing every
level (twenty entries, most of them the average we could compute) and a single
manual total (derives nothing, cannot warn).

### Armour — SRD templates, the weapons pattern again

Bundle the SRD armour table as TEMPLATES that pre-fill editable fields, exactly
the D1b mechanism already built and reviewed. AC derives: base + DEX capped by
category + shield + manual adjustment. Rejected: a manual AC field, which cannot
warn about a Strength requirement or an impossible number.

### Species and backgrounds — TEMPLATES, mostly free text, with a NAMED set of mechanical traits

The owner, verbatim:

> "Make species and backgrounds templates like for weapons. I want most things
>  just text boxes without mechanics like elf 4 hour sleep, we will need to add
>  mechanical things like Certain things we have to model like dwarf resistance
>  and hp as well as elf movement speed and spells"

This is neither of the options I offered and it is better than both. The split:

- **Species and backgrounds become templates**, the same D1b shape as weapons:
  they pre-fill editable fields, the character stores VALUES, and there is no
  live reference back to the template.
- **Most traits are FREE TEXT with no mechanics.** An Elf's four-hour trance is
  a sentence on the sheet. It is not modelled, not computed against, and not
  validated. This is the majority case and must stay cheap.
- **A BOUNDED set of traits is MECHANICAL**, because it moves a derived number
  and a sheet that ignores it is simply wrong. Named by the owner:
  damage resistance (Dwarven Resilience), HP modification (Dwarven Toughness,
  +1 per level), movement speed (Elf), and granted spells.

So a trait is free text PLUS an optional mechanical effect drawn from a closed,
compile-checked set. Adding a new mechanical KIND is a deliberate change; adding
a new trait is not. That is the same shape as the weapon property toggles plus
free text (Q4), applied one level up — and it avoids both failure modes: no
modelling every trait in the SRD, and no sheet quietly showing the wrong speed.

Granted spells are the one mechanical kind that already has machinery: species
and background spell grants are what `character_source_instances` and the
grant-rule system were built for. Reuse before inventing.

### Q1 ANSWERED — build the Claude-only bridge

The owner chose the claude-only option after I stated the residual risk plainly.
Q1 is no longer blocked and the standing "do not resume" instruction is
DISCHARGED for the claude-only shape only.

**Codex is dropped entirely, not gated.** F2 proved `codex --sandbox read-only`
executes arbitrary commands and reads outside its working directory, including
SSH keys. That is the half that failed containment, and it does not come back.
`claude -p --tools ""` is the half verified contained: zero tool_use blocks and
no file written under adversarial prompting.

**Residual risk stated, not buried**, because the owner accepted it knowingly:
a local endpoint a web page can reach still exists, and "no tools" is a flag
whose meaning a future version could change. The build must therefore not rely
on that flag alone.

---

## D11 — Q6 ANSWERED BY THE OWNER: derivable sheet core first; builder blocks, import tolerates (2026-07-26)

Not a consensus recommendation — the owner's own decision, asked directly and
answered. It supersedes the interim Option 2 that earlier ticks were following.

### Part 1 — build the derivable sheet core, then the guided flow

Add the bounded per-class SRD content that everything else derives from: hit
die, saving-throw proficiencies, skill list, armour and weapon proficiencies.
Roughly twelve classes' worth, all sourceable from the CC-BY SRD 5.2.1 already
committed under `docs/srd/` (F6).

**Then compute rather than store.** HP, AC, save DCs, skill modifiers, passive
scores and initiative are DERIVED from ability scores, level and proficiency.
Storing them would create a second source of truth that drifts from the first —
the same reasoning D6d applies to nullable columns, one level up.

**What this deliberately does NOT include:** class FEATURE text (Rage, Sneak
Attack) and the ten missing subclass sets. The sheet says what it has and stays
silent about the rest rather than inventing — F4's rule, and the same rule the
weapons track already follows for unsourced mastery counts (D10).

**Rejected: the full SRD character model first.** Correct and complete, but
larger than everything built this session combined, and dominated by content
entry rather than code. **Also rejected: the guided builder over today's model.**
It ships fastest and is honest, but cannot produce a character sheet, which is
the owner's stated goal.

### Part 2 — the builder BLOCKS, the boundary TOLERATES

An SRD-illegal choice is **unavailable in the guided builder** — hidden or
disabled at the point of choosing, with the requirement stated. But anything
arriving by **import, share link or catalog is still accepted**, flagged with a
warning, never rejected.

**This tightens the earlier standing guidance** ("big obvious warnings, remember
to be homebrew tolerant") for the BUILDER specifically. The tolerance was never
about letting the app help you make an illegal choice; it was about never making
existing data unopenable. Those are different obligations and now have different
answers.

**It also resolves Q2.** A share link MAY carry a selection the app would not
let you make by hand — that is the tolerant half, working as intended, not a
defect.

Consequence for the completeness system (D2, v1 merged): a blocked choice is not
a completeness WARNING, because it can no longer be reached from the builder.
Completeness keeps reporting what is MISSING; legality is a separate concern
enforced at a different place.

---

## D10 — Weapons merged; Q4 settled; the workflow's last agent died and I finished it (2026-07-26)

`main` a26b64d. Verified by me: **613 vitest / 71 files, build exit 0, 56
Playwright, drizzle-at-runtime guard holding.** Schema is 34 tables — 30
surviving Laravel plus 4 native.

**The final Revise agent died on an API 529**, so the review's findings were
never acted on. I completed the revision myself rather than re-running the
workflow, and dispatched no fresh review of my own edits beyond the mutation
tests below — worth knowing when reading this entry.

### What the review got right, and the one thing it got wrong

**Right, and urgent:** the entire 1,409-line change was UNCOMMITTED, and the
reviewer proved the cost accidentally — a `git checkout` during its own mutation
testing silently skipped untracked files and reverted a tracked one to main. It
restored by hand. Committed first, before anything else.

**Right:** `content_missing` was folded in with `unsourced`, so a class with no
grant row printed "<class> grants it, but we lack the count" — asserting a grant
on no evidence, which is the exact error this module exists to prevent, one
level up. Now has its own sentence claiming nothing. Mutation-verified: the old
predicate turns the new test red.

**Right:** an assertion that could not fail — `JSON.stringify(allowance)` was
searched for a `0`, but `{"state":"content_missing"}` contains no `0` however
the code behaves.

**WRONG, and rejected with evidence.** It asked for a
`renderWeapons(...).textContent` assertion in the scopes test, having correctly
proved the file stays green when the render call is deleted. But vitest runs
unit tests with `environment: 'node'`, so there is no DOM and `renderWeapons`
cannot be called there at all. Satisfying the finding would mean changing the
test environment to make a comment true — backwards, and a config edit rule 6
forbids. The render IS covered by `tests/browser/weapons.spec.ts`. So the defect
was the header claiming to pin something it never pinned; the header now states
what it pins, what it does not, and where the real coverage lives.

### The merge was the interesting part

Two tracks moved the table inventory in opposite directions — main pruned eight,
this added four — so every inventory assertion conflicted, and the two sides had
chosen DIFFERENT mechanisms for keeping the column-metadata hash an oracle. main
re-derives the expectation from the frozen pre-Drizzle fixture; weapons excluded
native tables from the signature so a table with no Laravel migration could not
move a Laravel constant. Both are right and they compose: the artifact is hashed
with the four native tables excluded, against the value derived from the fixture
minus the eight.

Counted both halves separately rather than one total of 34, because a single
number lets one side grow while the other shrinks unnoticed.

**Verified the oracle still bites rather than assuming the merge preserved it:**
making `characters.name` nullable fails both the inventory test and the
Laravel-derived hash. That check is the whole point of D7's "a retained test
must still be able to FAIL".

### Q4 answered by implementation

Weapon "other properties" ships as the recommendation predicted: eight known
boolean toggles plus a free-text field, not an open key/value blob. Every toggle
defaults to off, because "this weapon is not Finesse" is the overwhelming
majority and a NULL there would mean nothing a user could act on — D6b applied
to a new table rather than inherited from one.

**No fabricated SRD data**, which was the risk I rated highest. All 38 templates
parse from the committed CC-BY extract, and the reviewer checked every row
against the source by eye including the awkward ones — Blowgun's flat 1 damage,
Lance's conditional two-handed, Sling's absent weight.

---

## D9 — Audit hardening merged; Q3 resolved by pruning EIGHT tables, not seven (2026-07-26)

`main` d2960c3. Verified by me, not on the track's word: **540 vitest / 66 files,
build exit 0, 52 Playwright, drizzle-at-runtime guard holding, and
`src/db/schema.sql` regenerating byte-identical from `db/schema/*.ts`.**

### Q3 is answered: pruned, and the brief's count was wrong

Every tick's brief said SEVEN dead Laravel tables. There are **eight** — `cache`
belongs with `cache_locks`, and Q3's list simply omitted it. The track said so
explicitly instead of quietly matching my number, which is the correct handling
of a brief that disagrees with the artefact. Schema is now 30 tables, was 38.

**The interesting part is what it did to the schema-signature test.** That test
compares a SHA-256 over ordered `PRAGMA table_info` metadata against a value
produced by running the ORIGINAL LARAVEL MIGRATIONS — an independent oracle.
Recomputing the expectation from the artefact under test would have converted it
into a tautology, which rule 6 forbids and which is the exact failure D7 warns
about. Instead it is re-derived from the FROZEN pre-Drizzle fixture, with all
three links asserted: the old hash still matches the fixture at 38 tables
(proving the fixture IS the Laravel artefact), the new hash matches the fixture
minus the eight, and that equals the generated schema. Both links can fail — a
column type change breaks one, editing the fixture breaks the other. The fixture
is deliberately NOT pruned, because being the historical artefact is its entire
job.

Two schema-generation tests were DELETED rather than adapted: their whole
subject was the rationale for tables that no longer exist. Deleting a test whose
subject is gone is right; keeping it as a hollow shell would have been worse.

### The three findings, all confirmed and fixed

1. **Quadratic audit — REAL, and worse than codex estimated.** Measured against a
   no-parent linear control: 24,000 chained sources took 16.6 s versus 18.8 ms;
   a 5.6 MB image with a 50,000 chain blocked the worker for **80.5 seconds**.
   `validateBytes` is synchronous inside the app's one worker, so that is 80
   seconds with every other RPC queued behind it. Now linear via a `settled` set
   — 0.10 s on the same image.

   I verified the algorithm myself rather than trusting the prose: a node joins
   `settled` only on a walk that TERMINATED, so no node on a cyclic chain is ever
   settled and no cycle can be skipped. Traced a pure cycle, a cycle with a tail,
   a self-loop, and a diamond; the diamond does not false-positive.

   The regression guard counts **Map lookups, not wall-clock** — a timing budget
   would flake on a loaded box, and lookups are what the complexity claim is
   actually about. Verified by reverting the fix and watching it fail at exactly
   50,004,999.

2. **The audit now refuses two things restore refuses** — duplicate snapshot ids
   and a slot carrying both `fixed_` and `current_spell_version_id`. Both rules
   are IMPORTED from the portable-backup validator rather than reimplemented, so
   a document and an image cannot drift apart.

   **Why rejecting is correct here and skipping was correct for stale save
   points** — the distinction matters and is easy to get backwards. A legitimate
   backup CAN contain a stale-version save point, so rejecting the image would
   make a real user's own backup unrestorable (D6b). A legitimate image CANNOT
   contain either of these two, because a PRIMARY KEY and a named CHECK plus two
   triggers forbid them on every write. And refusing an import destroys nothing:
   the audit runs while quarantined, so the user keeps the database they have.

3. **The ownership pass is honest about being future-proofing** rather than
   counted as a current guarantee.

**Rejected: a byte or row cap at the backup boundary.** The denial of service
was the algorithm, not the size; cost is now ~10 ms per megabyte. A cap's only
failure mode is refusing a legitimate import, and there is no honest number —
the database grows with the catalog AND with unbounded undo history. Declining
to add a limit you cannot justify is the better engineering answer.

**One assertion was weakened and I checked it rather than assuming:**
`CHARACTER_OWNED_TABLES.length === 11` became `> 0`. Legitimate — a test forty
lines earlier pins the exact eleven names with `toEqual`, fixing contents and
length together, so the count was strictly redundant. What remains is a
non-vacuity guard so that an empty `UNENFORCED_OWNERSHIP_TABLES` is a fact about
foreign keys rather than about an empty table set.

---

## F6 — The SRD was never actually bundled, and D1b's open question is answered (2026-07-26)

**Proved by inspection, then by fetching the document.**

`docs/srd/` contained ATTRIBUTION.md and nothing else. Grepping the whole
repository for `longsword|greataxe|shortbow|warhammer` and for the mastery
terms `cleave|graze|topple|vex|nick|sap` matched exactly ONE file:
`.claude/decisions.md` — my own notes. D3 says "the SRD is bundled" and the
owner asked to "include the SRD with the required attribution", but no SRD
content had ever landed. Spell data reached the app through the Laravel seed
(F1); nothing else did.

That is a trap rather than a gap: a track told to build SRD weapons with no
local source will reconstruct the table from model memory and it will look
entirely plausible. For licensed reference data that is both a correctness and
a provenance failure, and it is very hard to review after the fact.

**Now sourced.** Official CC-BY-4.0 SRD 5.2.1 PDF, SHA-256
`8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87`,
6,031,375 bytes. Verbatim extracts committed under `docs/srd/source/` with
`docs/srd/SOURCE.md` recording URL, checksum, the exact `pdftotext -layout`
command and page numbers. All 38 weapons extracted cleanly with damage,
properties, mastery, weight and cost.

**Rejected alternative:** committing the 6 MB PDF. We never modify it, and a
checksum proves an identical source without carrying it in every clone. Also
rejected: hand-transcribing the table into app seed format here — that would
collide with the weapons track, which owns the schema. This commit deliberately
ships raw evidence, not a parsed dataset.

### Two corrections to F6 as first written, found by the weapons track

Both are my errors, caught by the track reading the artefact rather than the
claim, which is the point of committing evidence at all.

1. **38 weapons, not 37.** The original F6 text and the `6bbeef2` commit message
   both said 37. Counting the committed extract gives 38:
   `awk 'NR>7' docs/srd/source/weapons-table.txt | grep -E '^ {6}[A-Z]' | wc -l`.
2. **I asserted the Paladin/Ranger/Rogue counts without committing their
   evidence.** SOURCE.md stated the flat-two, but `docs/srd/source/` held only
   the Barbarian and Fighter tables — zero lines mentioning the other three. A
   provenance document that asserts an unevidenced fact is exactly the failure
   it exists to prevent. Fixed by committing
   `source/weapon-mastery-flat-classes.txt` with the three feature-text extracts.

The shape of the answer is unchanged; only its evidence was incomplete.

### D1b's parked question, answered — and the answer is awkward

D1b required proof, not assumption, of whether mastery count is derivable from
existing class data. **It is not, and it has no single shape:**

- **Barbarian and Fighter** carry a Weapon Mastery COLUMN in their class tables;
  the count rises with level (Fighter 3 at levels 1-3, 4 at 4-9, 5 at 10-15,
  6 at 16-20).
- **Paladin, Ranger and Rogue** have NO such column. Their count is a flat two,
  stated only in the level-1 feature text.

So it is neither a constant nor a single progression column, and a design that
assumes either will be wrong for three classes or for two. Nothing in
`class_progressions` carries it, because that table models spellcasting alone
(F4). Every weapon carries exactly one mastery property; the property belongs to
the weapon, the PERMISSION belongs to the character — which is why D1b models
mastery as a per-character choice rather than a weapon attribute.

### A licence correction, from the owner's own instruction

ATTRIBUTION.md listed CC-BY-SA as bundleable "where compatible". Share-alike is
an obligation BEYOND attribution and propagates to whatever it is combined with,
so it fails the owner's stated test — "only include Creative Commons with
attribution or any other free legal license that only requires attribution".
Corrected: the test is the obligation, not the licence family. "It's Creative
Commons" is not sufficient.

---

## F5 — The `attribution.spec.ts` flake: measured, unattributed, NOT masked (2026-07-26)

`tests/browser/attribution.spec.ts:16` intermittently fails on `expect(loads).toBe(1)`
with `Received: 2` — a real second page load, so the footer link navigated
instead of being routed. I could neither attribute it to the validation branch
nor exonerate that branch. Recording the measurements rather than a verdict.

| condition | branch | main |
|---|---|---|
| quiet box, single spec | 0 / 20 | 0 / 20 |
| quiet box, single spec (2nd batch) | — | 0 / 6 |
| synthetic CPU load, all 24 cores | 0 / 8 | not run |
| concurrent vite dev server (neighbour worktree) | **1 / 10** | 0 / 10 |
| full suite, box loaded by another worktree | **1 failure** | not run |
| full suite, quiet box | 0 / 2 (48 passed each) | — |

Plus the implementing track's own 6 full runs: 4 green, 2 failed, both while
another worktree's dev server was live; its stashed baseline was 3/3 green.

Tally: the branch has failed roughly 3 times in ~53 runs, main 0 times in 36.
That is NOT significant (p is around 0.25) — but the branch is the only side
that has ever failed, so "pre-existing" is unproven too.

**Hypotheses tested and killed.** (1) Playwright reusing a neighbour's dev
server — killed: `playwright.config.ts:20` sets `reuseExistingServer: false`,
and a collision errors out rather than silently reusing. (2) Vite discovering
`zod` as a new dependency and reloading the page — killed: main already imports
zod at `src/domain/ids.ts`, so it is not new. (3) CPU starvation widening a
handler-attachment race — killed: 0/8 with all 24 cores saturated.

Every failure so far has coincided with a second **vite dev server**, not merely
a loaded box. That is the surviving lead and it is not yet a mechanism.

**Merged anyway, deliberately.** Two full suites green on a quiet box under my
own hand (48 passed each). The flake is disclosed here, not suppressed: no
retry, no `.skip`, no loosened assertion, no `test.fixme`. If it recurs, this
table is the starting point rather than a fresh investigation.

**Addendum, same day, after both merges.** One further failure on merged
`main` at the default port with NO neighbour dev server running, then 0/12 on
re-measurement. Two consequences. First, "only ever with a second dev server"
is now falsified — that was the surviving lead in the table above and it is
dead. Second, the branch-versus-main comparison is spent: merged `main` now
CONTAINS the branch content, so there is no longer a clean control to measure
against. Any future attempt must compare against the pre-merge commit 0a28754
explicitly. Total observed: roughly 4 failures in ~66 runs of content that
includes this work, 0 in 36 runs of 0a28754.

**Contributing infrastructure defect.** `playwright.config.ts` hard-codes port
4173 in every worktree, so parallel tracks contend for it and one run can block
or perturb another. This is what made the flake reproducible at all. Worth
fixing as a separate attributable change — a per-worktree port — but NOT as a
path to green, and not while it is the only lever that reproduces F5.

### RESOLVED (2026-07-26, dedicated flake track + independent verification)

Root cause found, reproduced on demand at **100%**, and fixed. The mechanism is
a Vite dev-server page reload. It has nothing to do with the footer click, the
router, or the validation branch this was originally suspected of.

**The mechanism.** `zod` is invisible to Vite's startup dependency scan. The
scanner crawls `index.html` and what is statically reachable from it; the only
runtime `import { z } from 'zod'` is `src/domain/contracts/rows.ts`, reachable
only through `src/db/worker.ts`, which is referenced as
`new Worker(new URL('./db/worker.ts', import.meta.url))` and therefore never
crawled. So whenever the dep cache does not already contain `zod`, the browser
connects, the worker loads, Vite discovers `zod` late and logs

    ✨ new dependencies optimized: zod
    ✨ optimized dependencies changed. reloading

and reloads the page. That reload is the second `load` event. `loads` becomes 2
and `expect(loads).toBe(1)` fails. The assertion was always right.

**Hypothesis (2) above was killed on a false premise, and was in fact correct.**
It was dismissed because "main already imports zod at `src/domain/ids.ts`". That
line is `import type { core } from 'zod'` — a *type-only* import, erased at
compile time. It creates no runtime dependency and does not make `zod`
scannable. The one hypothesis that was right is the one that got struck out.

**Why it looked like 1-in-10, and why it correlated with a neighbour dev
server.** `vite.config.ts` defaulted `cacheDir` to a single machine-global path
shared by every worktree. When another checkout runs against it, Vite finds the
recorded absolute paths foreign, performs a **full** re-optimize, and in doing
so discards the cached `zod` entry — re-arming the late discovery for exactly
one run. The next run is self-consistent again and passes. Hence: rare,
correlated with a second dev server, and self-healing — precisely the signature
the table above recorded. The addendum's neighbour-free failure fits the same
rule, because *any* cold cache (fresh clone, cleared `/tmp`, a config change)
does it too.

**Measured, with a strict-port harness** (an earlier harness let killed servers
survive, so the probe hit stale warm servers; those readings were discarded):

| vite config | dep-cache state | trials | `loads != 1` |
|---|---|---|---|
| pre-fix | cold | 6 | **6 / 6** |
| pre-fix | warm, self-consistent | 5 | 0 / 5 |
| pre-fix | just stomped by a neighbour worktree | 4 | **1 / 4** (first run only, then self-heals) |
| fixed | cold | 4 | 0 / 4 |
| fixed | just stomped by a neighbour worktree | 4 | 0 / 4 |

At the spec level, running the real `attribution.spec.ts`:

| condition | runs | failed |
|---|---|---|
| pre-fix `vite.config.ts`, cache cold each run | 10 | **10 / 10** — always `attribution.spec.ts:16`, `Received: 2` |
| fixed, cache cold each run | 40 | **0 / 40** |
| fixed, warm cache, neighbour dev server restarting throughout | 20 | **0 / 20** |

So the rate went from a historical 1-in-10 — and 10-in-10 once the real
condition was identified — to **0 in 60**. Not narrowed. Closed.

**The fix.** `optimizeDeps.include: ['zod']` in `vite.config.ts` makes the
optimizer handle it during startup, so nothing is discovered late and there is
nothing to reload for. This alone is sufficient: proved by the fixed/stomped row
above, where the re-optimize still happens at startup but no reload follows.
`cacheDir` was additionally made per-checkout (hashed realpath,
`STATIC_APP_CACHE_DIR` still overrides), removing the trigger rather than the
symptom. Note PARALLEL-PLAN.md rule 7 *already* required per-chunk cache
isolation via that env var; this flake is what happens when tracks run dev
servers and Playwright without it. The change makes the safe behaviour the
default instead of relying on every runner remembering.

**A SECOND, GENUINELY SEPARATE APP DEFECT was found — and it is NOT what made
this test flake.** `routeFooterLinks` only ran from `startApplication()`, behind
the `system.info()` boot gate, while the footer is static markup in
`index.html`. For the 1.5–3.7 s the worker takes to instantiate wasm and
provision OPFS, the attribution link was visible, live and unhandled: clicking
it was a full navigation that destroyed the half-booted worker. Fixed by
attaching a delegated listener on `.site-footer` during module evaluation, ahead
of the gate, with `startApplication` made idempotent.

Being explicit, because it would be easy to over-claim: **this defect cannot
have caused any recorded F5 failure.** `attribution.spec.ts:16` waits for
`#status[data-ready=true]` (30 s) before clicking, so it waits the vulnerable
window out entirely. Verified directly — with `src/main.ts` already fixed and
only `vite.config.ts` reverted, the flake still reproduced 10/10. The app defect
is real and worth fixing on its own merits; it is not the flake.

**Real-user impact of that defect:** a user on a cold cache, a slow disk, or a
first visit who clicked "Licences and attribution" while the app was still
starting got a full page reload. They still reached the notice, so nothing was
unreachable — the cost was a discarded worker mid-`installOpfsSAHPoolVfs` and a
boot restarted from zero, i.e. a slow page made slower. Low severity, real.

**The SPA guarantee the fix protects still holds.** Verified with two throwaway
probes (run, then deleted): after a pre-boot footer click, the database still
opens on the same worker — `staticApp.countCharacters()` resolves, the marker
set on `window` survives, `loads` is 1, and exactly one screen is rendered into
`#app`, so the idempotence guard is doing its job. A boot failure arriving
*after* a pre-boot click also does not clobber the already-rendered notice.

**Nothing was suppressed.** No retry, no `test.describe.configure`, no `.skip`,
no `.fixme`, no loosened assertion, no added wait. `retries` is unset in
`playwright.config.ts` (default 0), so every result above is a first attempt.
The only assertion change was *strengthening*: `expect(loads).toBe(1)` added to
the boot-failure test. Both new/changed tests were proved sensitive by reverting
`src/main.ts` and watching them fail (`Expected: true / Received: false` at
`attribution.spec.ts:93`; `Expected: 1 / Received: 2` at line 168).

**Gates:** 1440 vitest / 101 files, build exit 0, 66 Playwright (65 baseline + 1
new), all green.

**Residual, honestly.** (1) `vitest.config.ts` still defaults to a
machine-global cache dir. Harmless for *this* flake — vitest performs no HMR
page reload — but it is the same latent cross-worktree sharing, and two
concurrent vitest runs will still thrash it. Left for the B00 owner. (2)
`vite.config.ts` is a B00-owned config file under rules 5–6; this track edited
it because that is where the flake actually lives. It is the change most worth a
second look. (3) `qrcode` is the other optimized dep and *is* statically
reachable, so it needs no entry today — but any future runtime dependency
reachable only through the worker graph will reintroduce this exact flake, and
nothing currently guards against that.

---

## D8 — Both parallel tracks merged; codex's three audit findings queued, not fixed (2026-07-26)

`main` moved 0a28754 → b7992e7. Independently verified by me, not taken on a
subagent's word: **530 vitest / 66 files, build exit 0, drizzle-at-runtime guard
holding (grep exit 1), 52 Playwright**.

Merged: per-table backup row contracts + quarantined candidate-image audit
(`feat/import-validation`), and the agent-readable reference
(`feat/agent-reference`). The tracks were genuinely disjoint — backup/db versus
planner UI — and integrated with no conflict and no test loss (507 + 23 = 530).

**What codex verified as clean** (the questions that mattered most): no
app-written value is rejected by the row contracts — empty non-key strings,
unicode and long text, ordinal `0`, `0/1` booleans, both timestamp formats and
absent optional JSON keys all still pass; nullability is genuinely derived from
`column.notNull` (`scripts/compose-row-contracts.ts:91`) rather than
hand-asserted; the audit provably cannot mutate stored bytes; and the generated
facts have a real byte-for-byte freshness check. Over-strictness was the
highest-severity failure mode available here — a contract narrower than its
column makes a user's own backup unrestorable — and it did not materialise.

**Three findings accepted as real and queued rather than fixed**, because none
is a regression against main (main had no semantic audit at all) and each wants
its own attributable change:

1. **Medium — quadratic audit work.** `candidate-audit.ts:313`
   `assertNoParentCycle()` walks the ancestor chain from every node, so a valid
   chain of N sources costs about N²/2 lookups, and the backup boundary
   (`database-backup.ts:33`) caps neither bytes nor rows. A hostile image can
   monopolise the worker. Cheap fix: one shared visited set makes it O(N).
   This is genuinely NEW risk in NEW code, so it is first in the queue.
2. **Medium — the audit accepts snapshots the restore path cannot restore:**
   duplicate positive `id`s, a slot with both `fixed_` and
   `current_spell_version_id`, and references to inactive spells. The image
   installs and the undo history is unusable. The portable-backup validator
   already checks the first two, so the fix is largely reuse.
3. **Low — `auditCharacterOwnership` is currently theatre on the production
   path.** `PRAGMA foreign_key_check` runs first (`database-lifecycle.ts:276`),
   so an orphan can never reach it; deleting the pass would fail no
   production-path test. Defensible as future-proofing, but it must not be
   counted as a current guarantee.

**Rejected alternative:** hold both branches unmerged until 1-3 were fixed.
Rejected because they are hardening gaps in work that strictly improves on main,
and leaving ~4,000 verified lines unmerged would make every later tick re-derive
this analysis.

---

## D7 — Neither the Laravel app nor this code is worth preserving (2026-07-25)

Owner direction:
> "Don't worry about preserving Laravel version. That was an mvp. Don't worry
>  about preserving this code either. It is only a 2nd draft."

This LOOSENS several constraints that earlier decisions and plans treated as
binding. Where an earlier note conflicts with this, this wins.

**No longer goals:**

- Laravel SCHEMA fidelity. The 38-table inventory, the Laravel-derived metadata
  hash, `VARCHAR`/`DATETIME`/`TINYINT(1)` declared types, Laravel column order,
  and the seven dead infrastructure tables are all inherited MVP artifacts, not
  requirements. Prune, rename, retype and reorder freely where the domain is
  better for it.
- Backward compatibility with existing OPFS images or backups. There are no
  users. A schema-signature break is a non-event.
- Preserving the current TypeScript structure. Read-models, table lists, query
  shapes and module layout are all second-draft and may be restructured.

**Still goals — do not over-read this:**

- **Behavioural correctness.** The parity FIXTURES encode D&D rules — multiclass
  slot tables, caster progression, preparation ceilings. Those expected values
  remain valid regardless of where they came from, and they are the best
  regression suite this project has. Keep them as correctness tests; drop only
  the SCHEMA-METADATA parity that asserts we still look like Laravel.
- **A test must still be able to fail.** If a check is retained, it must remain
  a real oracle. Regenerating expectations from our own output produces a
  measurement that cannot come out wrong — that stays forbidden, not because of
  Laravel, but because a tautological test is worse than no test.
- The untrusted-input boundary (share links, backup/catalog import). Nothing
  here relaxes that.

**Consequences to apply:**

- D6's restructurings become much more viable — variant tables, 1:0..1
  extraction, explicit state columns — since schema shape is no longer pinned to
  Laravel's.
- Nullability tightening is freer: a column nullable only because a Laravel
  migration made it so has no claim to stay nullable.
- Q3 (the seven dead tables) resolves toward pruning. Still do it as a SEPARATE
  change from the Drizzle rewrite so failures stay attributable.
- The Drizzle rewrite already in flight was scoped under the old constraints. Its
  choices remain defensible; later increments may go further.

---


## D6d — Scrutinise nulls in ALL types, not only database columns (2026-07-25)

Owner direction: the six restructurings in D6 are confirmed as the tests for
whether an incomplete thing can be represented without a null column — AND
> "Remember to also scrutinize nulls in all types, not just db columns."

This is a scope expansion, and the non-column layer is arguably the more
important one: a `| null` in a TypeScript type is not forced by storage, it
propagates to every consumer, and it is where the contract incoherence the owner
originally complained about actually lives.

Apply D6 and D6b to every `| null` and every `?:` in:

- `src/domain/read-models.ts` and all DTOs / read models
- Zod contracts and their inferred types
- function and query return types
- domain value objects and command payloads
- RPC request/response shapes

### The highest-value instance, and the fix

`spell_name: string | null`, `spell_level: number | null`, `spell_id: number |
null` appear as three INDEPENDENT nullables on a workspace slot. They are not
three optional facts. They are ONE optional relationship — the `LEFT JOIN` to
the selected spell either matched or did not — smeared across sibling columns.

That is D6's "a value object would absorb it", applied to a projection:

```ts
// today: three nullables, and nothing links them
spell_id: number | null
spell_name: string | null
spell_level: number | null

// better: one optional relation, non-null inside
spell?: { id: SpellVersionId; name: string; level: SpellLevel }
```

The guarantee becomes *"if there is a spell, it has an id AND a name AND a
level"* — which is precisely the owner's question, "what is guaranteed to be in
a spell". It also makes the illegal states unrepresentable: today
`spell_name` populated with `spell_level` null is expressible and meaningless.

**Apply this pattern wherever a group of sibling nullables share one cause.**
The nullability belongs on the relationship, once, not on each field.

### Other non-column null sources to check

- **Outer-join projections** — as above. The null means "no matching row", a
  relationship fact, not a property fact.
- **Query-result nulls.** `db.one<T>(): T | null` pushes a null into every
  caller. Where the caller treats absence as impossible, a throwing
  `oneOrThrow` removes the null at the boundary instead of propagating it.
- **`?:` versus `| null` versus `?: T | null`.** Three different statements,
  currently used inconsistently. Pick one convention: `?:` for "the field may be
  absent", `| null` for "the field is present and explicitly empty", and avoid
  the third form unless both genuinely differ.
- **Nullable in the DB does not mean nullable in the domain type.** A column can
  be legitimately nullable while a resolved domain object is not — e.g.
  `subclass_definition_id` is correctly nullable in storage, but a *resolved*
  subclass type should never be `Subclass | null`; the character simply has no
  subclass relation.

### The reverse also holds

Do not push storage nullability into a domain type just because the column
allows it. Resolve it once, at the boundary, and let the domain type express the
real guarantee.

---

## D6c — The DEFENDED nulls, and a resolved tension with codex's test (2026-07-25)

Codex analysed all ~199 nullable columns. **Caveat on provenance:** its required
independent Claude critique failed twice (`API Error: ENOTIMP`) and returned
nothing, so this is codex's evidence-backed findings, NOT a two-agent consensus.
Claude reviewed it afterwards; that review is what follows.

### DEFEND these — do not tighten (agrees with D6b)

- `character_class_levels.subclass_definition_id` — a class can validly have no
  chosen subclass yet. **Exactly D6b criterion 1.**
- `characters.proficiency_bonus_override`,
  `character_class_levels.spellcasting_ability_override` — absence means "derive
  normally", not zero.
- `character_source_instances.parent_source_instance_id` — root source.
- All user-facing `notes` / `note` columns.
- `spell_version_publications.source_page`, `source_reference` — a publication
  can be known without either locator.
- `spell_versions.material_component_summary` — only meaningful for material
  components.
- `spell_versions.short_summary` — optional Tier-2 text; Tier 1 deliberately
  does not erase it.
- `spell_versions.action_type` — a one-minute casting time does not classify as
  Action/Bonus/Reaction. **Exactly D6b criterion 2: the SRD cannot be
  represented without this null.**
- The upcast facet as a whole — many spells do not upcast; its fields should
  move together rather than become individually required.
- `spell_selection_slots.label`, `free_cast`, `override_note`.
- `change_log.reason` — many valid commands need no explanation.
- Lifecycle timestamps such as `invalidated_at` before the transition happens.

### THE TENSION, and how it resolves

Codex's "steady-state witness test" asks: *can a valid, FULLY CONSTRUCTED entity
remain null indefinitely?* If not, it calls the column transient/incomplete —
**not** optional. Its missing-pattern list even says "unknown/incomplete is not
optional".

That would classify most mid-build nulls as illegitimate, which contradicts
D6b criterion 1.

**Resolution: in this app a partially built character IS a valid, steady-state
entity.** It persists in the character list, can be shared, imported, and left
untouched indefinitely. Completeness v1 exists precisely to report on it. So the
two tests agree once "fully constructed" is read as "valid persisted entity"
rather than "every choice made".

Where they still differ, **D6b wins** — it is the owner's direction and it is
the one grounded in this domain.

Practical consequence: codex's "would not yet defend" list includes
`source_definition_id`, `config`, and `acquired_at_character_level`. Before
tightening any of those, check D6b criterion 3 — whether a builder step must be
able to leave it unset. Tighten only if the builder genuinely never needs it.

### Restructurings codex ranks highest — all VERY HIGH cost

1. Typed/versioned grant rules with slots referencing rule identity.
2. Unified source-definition registry with a non-null FK.
3. Separate stable spell reference from resolved spell details.
4. `spell_slot_assignments` as a 1:0..1 relation (medium-high).
5. Class/subclass spellcasting facet (medium-high).

**Do not attempt 1–3 inside the current Drizzle rewrite.** Each touches the
generator, seeding, eligibility, backup and sharing simultaneously. They are
candidate follow-up units, not increments.

Low-cost cleanups that ARE in scope: drop the two dead columns; make `config`,
rule collections and slot-table JSON canonical non-null empties.

### Traps codex proved — heed these

- **Slot assignment is a hot join.** Access, reports, completeness and workspace
  all resolve via `COALESCE(fixed, current)`. An assignment table adds a join to
  hot queries — benchmark, do not assume.
- **Grant-rule normalisation must preserve stable slot identity.** Slot keys are
  `{source UUID}:{rule key}:{ordinal}` and regeneration REVIVES existing rows
  rather than replacing them. A design assigning fresh rule IDs per seed/import
  would break revival.
- **Portable backup exports raw rows by column name.** New tables require a new
  backup version or a compatibility adapter.

---

## D6b — THE TEST for whether a null is legitimate (2026-07-25)

Owner-supplied, and it GOVERNS D6. Where D6's restructuring patterns conflict
with this test, this test wins. Apply it first; reach for restructuring only
when all three say the null is not real.

> 1. "If nobody decided option X while building a character, and that being
>     undecided is a state that needs to be allowed in order for someone to
>     build or import a character, then that is a truly optional thing."
>
> 2. "If the SRD can't be represented fully without the null, then that is a
>     good sign."
>
> 3. "If something needs to be nullable for the purposes of going through the
>     steps of the character builder, I want it nullable if the only alternative
>     is to mangle the structure of the codebase to get it there."

### Why this is the right test for THIS app

**"Undecided" is a first-class domain state here, not an accident.** The guided
builder is progressive: a character exists, and is persisted, before every
choice is made. A share link can arrive mid-build. So a column that looks like
it "obviously should be non-null" is often correctly nullable, because the
alternative is forbidding a legitimate half-built character.

This is the same concept completeness v1 already models. Completeness detection
answers "what has not been decided yet" — and nullability is *how that is
stored*. **A nullable column that completeness reports on is correctly
nullable.** The two features are two views of one idea, and they should agree:
if the detector can meaningfully warn about a column being unset, that column
must be allowed to be unset.

### Applying it

For each nullable column, ask in order:

1. **Can a character legitimately exist, be saved, or be imported with this
   unset?** If yes → truly optional. Keep the null. Stop; do not restructure.
2. **Does the SRD require the absence?** A rule that genuinely has no value for
   some cases (no subclass before level 3; no spellcasting ability for a
   non-caster) is real optionality, and the SRD failing to fit without a null is
   evidence FOR the null, not against it.
3. **Does the builder flow need it?** If a step must be able to leave this
   unset to function, keep it nullable.
4. **Only if all three are no** — then it is a candidate for D6's
   restructurings, or for plain tightening.

### The explicit anti-over-engineering clause

Point 3 is a guard, and it overrides D6's patterns. **Do not extract a 1:0..1
table, invent a variant type, or reshape a module merely to delete a null the
builder genuinely needs.** Contorting the structure to win a type argument is a
worse outcome than the null. If the restructuring is not independently better
for the domain, do not do it.

### What this changes about the audit

The audit's output is no longer mainly "which columns can we tighten". It is:

- columns representing an **undecided state** → stay nullable, and should be
  reported by completeness;
- columns nullable only because a **Laravel migration** made them so (D7) → real
  candidates;
- columns nullable only **transiently during construction** → the persisted
  contract may still be non-null;
- columns where a restructuring is **independently better for the domain** → do
  it for that reason, not to remove the null.

---

## D6 — Treat nullability as a design smell to be investigated, not a type to declare (2026-07-25)

Owner direction:
> "When you add nullability, take some time to review and brainstorm possible
>  ways to refactor or restructure to not need the nullability. Nullability
>  still makes sense sometimes like when something is truly optional."

So the rule is **not** "eliminate null". It is: **a nullable column must be
justified as genuinely optional in the domain, after actively considering the
restructurings that would remove it.** Declaring `| null` is the last step, not
the first.

Before accepting a nullable column, consider at minimum:

- **Is this table actually two things?** A column that is null for one kind of
  row and populated for another usually means a missing type distinction —
  extract a variant table, or model a sum type.
- **Would a 1:0..1 related table be truer?** Optional data extracted to its own
  table makes absence a row that does not exist, rather than a column that is
  null, and removes the null from every consumer.
- **Is it a state machine wearing a nullable timestamp?** `completed_at NULL`
  usually wants an explicit status plus a separate completions record.
- **Is the null standing in for a default?** If every reader substitutes the
  same fallback, that is a default, not an absence.
- **Is the null only transient during construction?** Then the persisted
  contract is non-null; the transient shape belongs to the builder, not the row.
- **Would a value object absorb it?** Optionality inside a small object beats
  optionality spread across several sibling columns.

Legitimate optionality remains legitimate — an override that may not be set, a
subclass not yet chosen, a user-supplied note. Those are real and stay nullable.

**A wrong tightening is a data-loss bug, not a type improvement.** Every
proposed `.notNull()` needs evidence from the actual writers, and the review
gate's first job is to defeat it with a legitimate case.

**Distinguish migration-forced nullability from domain nullability.** Observed in
`verifast-core-api`: 10 of 15 column declarations across its 9 incremental
migrations are `nullable()`, because adding a column to a populated table forces
nullable-or-default. That is a migration artifact and says nothing about whether
the domain considers the value optional. Only domain nullability belongs in a
contract; migration-forced nullability should be tightened once backfilled.

---


Owner decisions that override anything a planning track produced earlier.
Apply these at consolidation; a plan contradicting one is wrong.

---

## F4 — This is a SPELL PLANNER, not a character model (proved 2026-07-26)

F0's successor gate, and larger than F0 was. Seeding the twelve classes made a
fresh install usable **as a spell planner**. It did not make it a character
builder, and the distance is bigger than the class seeding suggested.

**Evidence — `class_definitions` carries only:**
`content_key, name, rules_edition, spellcasting_ability, progression_type,
caster_fraction, caster_rounding, prepares_or_knows, supports_ritual_casting,
ritual_casting_mode, primary_ability_expression, notes`.

Every one of those is a *spellcasting* attribute. Grepping the whole 616-line
schema for character-sheet concepts:

| concept | occurrences in schema.sql |
|---|---|
| hit dice | 0 |
| hit points | 0 |
| armour class | 0 |
| skills | 0 |
| class features | 0 |
| traits | 0 |
| speed | 0 |
| size | 0 |
| languages | 0 |
| subclass level | 0 |
| proficiency | 1 (spellcasting proficiency bonus only) |

**Subclass coverage is 2 of 12 classes, and that is not an oversight.** The only
seeded subclasses are EK (Fighter) and AT (Rogue) —
precisely the two third-caster subclasses. Champion, Thief and the rest were
never modelled because they do not cast spells. A Wizard can be created and has
no subclass options at all.

Nothing enforces "a subclass is required at level 3" either; the concept does
not exist.

### What this means for the guided builder

A builder over the current model can walk a user through: name, ability scores,
class, level, and spell choices. It **cannot** produce a character sheet,
because the data for one does not exist — no HP, no AC, no skills, no
proficiencies, no features, and no subclass for ten of the twelve classes.

Two honest options, both larger than the builder UI itself:

1. **Model expansion first** (the planned track): add the sheet domain, then
   build the guided flow over it. Correct, and substantial.
2. **Ship a spell-focused builder now**: a guided flow for exactly what the app
   models today, honest about being a spell planner rather than a full sheet.
   Delivers something usable quickly; risks the owner expecting more.

**Recommendation: (2) first, then (1).** The owner's stated motivation is that
their friends miss selections in confusing tools — that pain is real for spell
selection alone, and completeness v1 already addresses it. Shipping a working
spell-focused builder proves the flow before the sheet domain is built.

Parked as Q6 for the owner rather than decided autonomously: this changes what
"character builder" means and is a product decision, not a technical one.

---

## F3 — Two latent bugs in committed code (proved 2026-07-25, model track)

Both predate this session's work and are worth fixing regardless of which
plan lands.

**F3a — the payload validator has a hole the type system does not catch.**
`src/commands/payload-validator.ts:335-378` switches over an already-narrowed
`type` and RETURNS after the switch. A missing `case` arm therefore ships an
**unvalidated payload with a clean typecheck**. The command factory switch
(`character-command-factory.ts:52-108`) and the `prepareInverse` switch
(`character-command-executor.ts:314-351`) ARE compile-enforced — TS2366 on a
missing arm — so the inconsistency is easy to miss. Any new command type that
forgets its validator arm silently bypasses validation entirely.
Fix shape: make the validator switch exhaustive-by-construction the way the
other two are, so omission is a compile error rather than a security hole.

**F3b — backup import writes `character_rule_overrides.value` verbatim.**
`src/backup/character-backup.ts:1034-1038` performs no JSON validation;
`validateCharacterRows` (`:272-286`) covers only `CHARACTER_STATE_TABLES`, which
does not include that table. Today the table has no production writer, so the
exposure is theoretical. It stops being theoretical the moment sheet data lives
there — which is exactly what the model plan proposes.

---

## R1 — RECONCILIATION: model plan contradicts D1 on weapons

The model-expansion plan specifies weapons as
`{ name, category: "simple"|"martial", enhancement: 0..3, note }`.

That is the SUPERSEDED wording. **D1** replaced it after that track started:
the user names the weapon themselves and sets its attributes — damage dice,
range, light, other properties. No catalog, no category, and no separate
enhancement concept (it is just another attribute).

Apply at implementation: drop `category`, drop `enhancement`, add the attribute
fields. Prefer a small set of known property toggles plus a free-text field over
an open key/value blob, so the sheet can render them and an agent can read them.

The correction is downward — strictly less machinery than planned.

---

## F2 — `codex --sandbox read-only` is NOT containment (proved by execution 2026-07-25)

Measured, not read from documentation. With
`-C <empty mktemp dir> --ephemeral --ignore-user-config --ignore-rules
--skip-git-repo-check`, codex:

- **executed `id`**, returning `uid=1000(vagrant)`;
- **read a file outside its `-C` root** — the repo's `package.json`.

Only writes were blocked (`Read-only file system`). So `--sandbox read-only`
constrains the FILESYSTEM to reads; it does not prevent command execution and
does not confine reads. `-C` is a working directory, not a boundary. Anything
reachable by the `vagrant` user is reachable: `~/.ssh`,
`~/.claude/.credentials.json`, `~/.codex/auth.json`.

By contrast `claude -p --tools ""` IS capability-contained. Verified
adversarially: asked to write a file and run `id`, the stream contained zero
`tool_use` blocks, no file was created, and the turn ended mid-sentence for
want of a tool to call.

**Why this matters beyond the bridge:** an earlier draft of that plan asserted
both CLIs "cannot edit the repo, read the repo, or run commands", and that claim
was load-bearing for its entire prompt-injection defence. Two thirds of it was
false. It surfaced only because the agent was instructed to RUN the CLIs rather
than recite their flags.

Applies to this project's own practice too: read-only codex dispatches
throughout this session were containment for WRITES only. That was sufficient
for review work, but it was never the isolation the flag name suggests.

Consequence adopted: containment is not the defence for the CLI bridge. The
defence is the input boundary — no text authored by anyone but the local user
reaches a prompt; only integers and strings resolved from the local active
catalog (`is_active = 1`, `provenance <> 'placeholder'`).

---

## F1 — SRD-derived data ALREADY ships, with no attribution (proved 2026-07-25)

Surfaced by the catalog track; verified independently here.

`src/rules/class-progression-lookup.ts` (646 lines) contains D&D class names
and cantrip/slot progression tables. `src/rules/spell-slots.ts` contains the
multiclass slot table. The only attribution text in the repository is
`docs/srd/ATTRIBUTION.md`, written today — a document *about* attribution, not
a notice attached to the data, and it does not ship in the application.

**Stated carefully:** the catalog plan called this "a present breach". That is
stronger than the evidence supports and stronger than I am qualified to assert.
Class names are not copyrightable and tables of numbers are thin expression.
What is certain: SRD-derived material is present, no notice accompanies it, and
shipping the notice is nearly free. Do that and the question stops needing an
answer.

Actions:
- The notice must reach the RUNNING APP, reachable from any screen rendering
  this content — CC-BY attaches to the distributed work, not to a repo doc.
- It must also appear in exported/printed character sheets and in any
  machine-readable reference block emitted for AI agents.
- This is not blocked on the SRD bundle track. It applies to data already in
  the tree today and should land in the first increment that touches the UI.

---

## F0 — GROUND TRUTH: the shipped app has no class content (proved 2026-07-25)

Not a decision — a proved fact that several tracks are planning against
wrongly, and which changes what "minimum viable" means.

`seedClassProgressions` (`src/rules/class-progression-lookup.ts:543`) is the
ONLY writer of `class_definitions`, `class_progressions`,
`subclass_definitions`, `subclass_progressions`. **Every caller is under
`tests/`.** Nothing in `src/` calls it. Production bootstrap
(`src/db/worker.ts:20-36`) applies `schema.sql` and nothing else; `public/`
contains only `_headers` and `_redirects`. `CatalogImporter` writes spell
tables only (`src/catalog/catalog-importer.ts:140,310,454,545`).

**Therefore a fresh production install has zero classes, subclasses, feats,
species and backgrounds.** The only route by which that content reaches a
production database today is a full database restore
(`src/db/database-lifecycle.ts:15-50`).

Consequences:

- Bundling the SRD is not a convenience feature. It is the difference between
  a usable app and an empty one on first run.
- The generalised non-spell importer is the other half of the same problem, not
  an independent nicety.
- The guided builder has nothing to guide anyone through until one of those
  lands. This is a hard ordering constraint, not a preference.
- Grant-rule content is user-supplied and unvalidated for internal consistency,
  so `required: false` is reachable in production. Checks must filter on the
  column, never assume it is uniformly 1.

---

## D1b — SRD weapons ship as TEMPLATES; custom weapons stay; masteries are a choice (2026-07-25)

**Amends D1.** D1 removed the weapon catalog entirely. That went one step too
far: bundling the SRD weapons as *templates* costs little, saves the user
retyping a longsword's statistics, and is already permitted by D3 (SRD 5.2 is
CC-BY-4.0 and is being bundled anyway).

Three parts:

1. **SRD weapons as templates.** Bundled reference rows the user picks to
   PRE-FILL a weapon's attributes. A template is a starting point, not a
   binding: once chosen, every field stays editable. There is no "this weapon
   is officially a Longsword" relationship to maintain, and no upgrade-in-place
   problem, because the character stores the resulting VALUES, not a reference
   to the template. Templates are catalog data; weapons on a character are not.
2. **Custom weapons remain fully user-defined** — name plus attributes (damage
   dice, range, light, other properties), exactly as D1 said. A custom weapon
   is just one whose fields were typed rather than pre-filled.
3. **WEAPON MASTERY is a per-character CHOICE and must be modelled as one.**
   Previously omitted entirely. In the 2024 rules each weapon has a mastery
   property (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex), and a
   character with the Weapon Mastery feature selects a limited number of
   weapons whose mastery they may use. The COUNT is derived from class and
   level, not chosen freely.

Consequences to apply:

- The weapon template shape gains a mastery property; the character's weapon
  entry gains "mastery selected for this weapon" state.
- The mastery COUNT is class/level-derived, so it is the same shape of problem
  the grant-rule system already solves for spells: "choose N from a set."
  **Evaluate reusing the grant-rule machinery before inventing a parallel
  selection mechanism** — but do not force it if the fit is poor.
- Mastery selection becomes a COMPLETENESS CHECK candidate: N slots available,
  fewer chosen. That is a real missed-selection of exactly the kind this work
  exists to surface. It belongs in the deferred completeness list until the
  model lands, not in v1.
- Whether mastery count is derivable from existing `class_progressions` data,
  or needs new content, is an OPEN QUESTION to prove — not assume — before
  designing it.

Supersedes: the `category: simple|martial` and `enhancement: 0..3` fields from
the model plan (see R1), which remain wrong. Enhancement is still just an
attribute.

---

## D1 — Weapons are fully user-defined, with no catalog (2026-07-25) — AMENDED BY D1b

**Supersedes** the earlier direction ("select from the basic and martial weapons
with manual input on name and if it is +1 or 2 or 3"). The model-expansion track
was planning against that older wording and must be corrected.

The user types the weapon **name** themselves and selects its **attributes**:

- damage dice
- range
- light
- other properties

There is **no weapon list, no weapon catalog, and no weapon import**. Nothing to
bundle, nothing to import, and no licence question for weapon data — statistics
a user enters themselves are their own input.

Consequences to apply:

- Drop any weapon-catalog table, import format, seed data, or picker UI.
- Weapons do **not** depend on the catalog-agnostic import track landing.
- The `+1/+2/+3` enhancement from the earlier wording is subsumed: it is just
  another attribute the user sets, not a separate concept.
- "Other properties" wants a deliberate representation. Prefer a small set of
  known toggles plus a free-text field over an open key/value blob, so the
  character sheet can render them and an AI agent can read them as text.

Rationale: consistent with the owner's repeated "minimum viable / let people
sort it out at the table". It removes an entire content pipeline.

---

## D2 — Completeness ships before the builder (2026-07-25)

Completeness detection covers **only what the committed code can already
detect**. Guidance and warnings for equipment, hit points, armour class, skills
and proficiencies wait until the model expansion lands, because those are
structurally absent from the schema today.

The extension seam is designed now; the later checks are not.

---

## D3 — SRD is bundled; other content stays imported (2026-07-25)

Bundle only content whose licence's **sole obligation is attribution** — SRD 5.2
under CC-BY-4.0, plus CC-BY-SA where compatible, MIT, Apache-2.0. Verbatim
notice per `docs/srd/ATTRIBUTION.md`, and no attribution to Wizards beyond that
exact notice.

Everything else — Player's Handbook and similar — is the user's own copy,
imported locally, never redistributed. Rendering it in the user's own browser
for their own AI agent is use, not distribution. Imported rules text must never
reach `dist/`, the repository, an export, or a share link.

---

## D4 — Agent-readable content is collapsed, never hidden (2026-07-25)

`<details>` and/or `<script type="application/json">`, identical content for
humans and machines. No CSS-hidden divs, zero-opacity spans, off-screen
elements, comments, meta tags, or `data-*` cloaking — that is the signature of
indirect prompt injection (OWASP's #1 AI threat for 2026) and gets sites
classified as hostile.

Emit reference **data**. Never emit text phrased as an **instruction to the
agent** — that is injection even on one's own site.

---

## D5 — Multiclass stays with the planner (2026-07-25)

The guided builder covers **single-class** creation and hands off to the
existing planner, which already handles multiclass. The builder does not
reimplement it.

---

## H1 — Candidate-image hardening: the quadratic, the two new refusals, and the one cap NOT added (2026-07-26)

**Finding 1 — the audit's cycle detection was O(N²) and is now O(N).**
`assertNoParentCycle` allocated a fresh visited set per start node and re-walked
the whole ancestor chain from every key. Measured before, on one parent chain of
N `character_source_instances` in one image, against the identical rows with no
parent as the linear control:

| N | chained | flat control | after the fix |
|---|---|---|---|
| 3,000 | 116.9 ms | 3.3 ms | 9.4 ms |
| 6,000 | 628.9 ms | 5.2 ms | 17.4 ms |
| 12,000 | 3,349.0 ms | 9.5 ms | 31.8 ms |
| 24,000 | 16,574.1 ms | 18.8 ms | 69.6 ms |
| 50,000 (5.6 MB image) | **80.5 s** | — | **0.10 s** |
| 2,000 × 20 save points (11.9 MB) | 1.15 s | — | 0.133 s |

`validateBytes` is synchronous inside the app's one dedicated worker, so the
80.5 s was 80.5 s of every other RPC queued behind it. The fix is a `settled`
set shared across start nodes; a node joins it only on a walk that ENDED, so a
cyclic chain can never be settled and the reported id is unchanged.

**The guard is a lookup count, not a stopwatch.** A wall-clock budget would be a
flake on a box running four worktrees. `tests/unit/db/candidate-audit.test.ts`
counts `Map.get` calls on a 10,000-node chain and requires fewer than 40,000;
the old implementation makes 50,004,999 — verified by reverting the fix and
watching the assertion fail with that number.

**Finding 2 — two refusals added, one gap kept deliberately.**
REJECTED now, because neither can occur in an image this application produced,
so there is no legitimate import to destroy: (1) two snapshot rows sharing one
`id` — the live table has a PRIMARY KEY, and restore dies with
`SQLITE_CONSTRAINT_PRIMARYKEY`; (2) a snapshot slot holding both
`fixed_spell_version_id` and `current_spell_version_id` — the CHECK and the two
triggers forbid it on every INSERT/UPDATE, and restore dies with
`SQLITE_CONSTRAINT_TRIGGER`. Both rules are IMPORTED from the portable-backup
validator (`src/domain/contracts/row-rules.ts`) rather than written twice.

NOT REJECTED, deliberately: a snapshot referencing a `spell_versions` row with
`is_active = 0`. `CharacterState.validateSnapshot` refuses it, but unlike the
other two this state is reachable in a legitimate database — `CatalogImporter`
tombstones a version on every re-import that stops naming its `content_key`
(`src/catalog/catalog-importer.ts:266`), and save points captured earlier keep
pointing at it. Refusing the image would mean a user who took a catalog update
can no longer restore their own backup. The skip is inert and proved so:
`restore` calls `validateSnapshot` BEFORE opening its transaction, so the
snapshot cannot become an INSERT, and the test asserts the rows are unchanged
after the refusal.

**Finding 3 — the ownership pass is future-proofing, and now says so in a test.**
`auditCharacterOwnership` catches nothing today: every character-owned
`character_id` carries an FK, so `PRAGMA foreign_key_check` reaches every orphan
first. `UNENFORCED_OWNERSHIP_TABLES` derives that claim from the generated FK
facts and a test asserts it is EMPTY, so the day someone adds a character-owned
table without that FK the claim fails loudly instead of ageing into a lie. The
pass is kept — it costs nothing and the audit is contracted on the
classification, not on the FKs — but it is no longer counted as a guarantee.

**No byte or row cap at the backup boundary, and why.** The DoS was the
algorithm, not the size. Post-fix cost is linear at roughly 10 ms per megabyte,
so a 100 MB import costs about a second. A cap's only failure mode is refusing a
real user's import (D6b), and there is no honest number to set it at: the
database grows with the catalog AND with unbounded undo history. Recorded in
`src/backup/database-backup.ts` with the measurements, so the next person does
not have to re-derive it.
