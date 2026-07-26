# Binding scope decisions

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
seeded subclasses are Eldritch Knight (Fighter) and Arcane Trickster (Rogue) —
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
