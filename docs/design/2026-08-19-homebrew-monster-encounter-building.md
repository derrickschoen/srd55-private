# Clean-room homebrew monster and encounter building

Date: 2026-08-19  
Status: reference design  
Numeric rule-source boundary: SRD 5.2.1, the Lazy GM's 5e Monster Builder
Resource Document, and project simulation derivations only

## 1. Purpose and consumers

This document gives the project one redistribution-safe reference for choosing
monsters, checking encounter danger, and authoring quick homebrew statblocks. It
has three consumers:

1. **VTT phase 2, increment 9.** The encounter generator must build the level-7
   starter skirmish from a validated roster, a required difficulty, a map and
   placements, terrain and fog, DM-only tactics, and provenance. The resulting
   package is approved before it becomes a content-addressed fixture. Increment
   9 scopes the first encounter to 4–6 monsters and roughly 3–5 rounds
   (`docs/design/2026-08-19-vtt-phase2-movement-controllers.md:1709-1747`).
2. **The codex DM generation prompt.** The prompt needs deterministic arithmetic
   and explicit warnings, plus creative room for terrain, goals, roles, and
   tactics. It must never invent a missing rule number.
3. **Future homebrew monster support.** The quick-monster benchmarks supply a
   starting chassis. Authored choices and absent details remain distinguishable
   in the type system.

The owner describes D317.9's difficulty contract as `{ rounds, pressure }`, where
`rounds` is expected length and `pressure` is resource pressure. D317.9 is not
present in this worktree's `.claude/decisions.md`; therefore this document uses
the owner-supplied contract but does not claim any additional D317.9 detail.
Section 6 proposes a project-owned bridge that the increment-9 validator can
implement and later recalibrate against simulation evidence.

### Clean-room boundary

Rules, formulas, tables, and numeric game guidance below come only from:

- the bundled SRD 5.2.1; and
- the Lazy GM's 5e Monster Builder Resource Document (LGMRD).

Project files are used only to describe this application's scope, roster,
types, and simulation-derived calibration. Qualitative encounter-design methods
in sections 2.7 and 4 are fresh clean-room restatements of the ideas digest
identified in section 7.1. Those methods carry no imported tables, formulas,
statblocks, or numeric constants; their source URLs are retained only as further
reading. No
material from the Dungeon Master's Guide or Xanathar's Guide to Everything is
used. Where the licensed numeric sources and project simulation do not answer a
question, section 8 records the gap and a calibration experiment instead of
filling it from memory.

## 2. Encounter building with SRD 5.2.1

### 2.1 Difficulty meanings

The SRD defines three categories:

- **Low:** victory should occur without casualties, though healing might be
  needed.
- **Moderate:** without healing and other resources the encounter can turn
  against the party; weaker characters can be removed from the fight, and a
  death is possible.
- **High:** one or more characters can die unless the party uses good tactics,
  quick decisions, and perhaps luck.

These are paraphrases of
[SRD 5.2.1, lines 12972–12995](../srd/full/srd-5.2.1.txt#L12972-L12995).
They describe risk, not promised outcomes.

### 2.2 XP budget per character

The following table is reproduced from
[SRD 5.2.1, lines 12950–12977](../srd/full/srd-5.2.1.txt#L12950-L12977)
under CC-BY-4.0.

| Party level | Low | Moderate | High |
|---:|---:|---:|---:|
| 1 | 50 | 75 | 100 |
| 2 | 100 | 150 | 200 |
| 3 | 150 | 225 | 400 |
| 4 | 250 | 375 | 500 |
| 5 | 500 | 750 | 1,100 |
| 6 | 600 | 1,000 | 1,400 |
| 7 | 750 | 1,300 | 1,700 |
| 8 | 1,000 | 1,700 | 2,100 |
| 9 | 1,300 | 2,000 | 2,600 |
| 10 | 1,600 | 2,300 | 3,100 |
| 11 | 1,900 | 2,900 | 4,100 |
| 12 | 2,200 | 3,700 | 4,700 |
| 13 | 2,600 | 4,200 | 5,400 |
| 14 | 2,900 | 4,900 | 6,200 |
| 15 | 3,300 | 5,400 | 7,800 |
| 16 | 3,800 | 6,100 | 9,800 |
| 17 | 4,500 | 7,200 | 11,700 |
| 18 | 5,000 | 8,700 | 14,200 |
| 19 | 5,500 | 10,700 | 17,200 |
| 20 | 6,400 | 13,200 | 22,000 |

### 2.3 Procedure

1. Choose Low, Moderate, or High from the risk descriptions above.
2. Find the party level and chosen category in the table. Multiply that
   per-character value by the number of characters.
3. Add creatures by subtracting the XP printed in each statblock. Do not exceed
   the budget. A small amount may remain unspent.

This condenses the SRD's procedure and examples at
[lines 12975–13013](../srd/full/srd-5.2.1.txt#L12975-L13013). The budget is a
ceiling; the source does not define a lower bound for a category.

The generator must also retain the SRD's cautions:

- many creatures increase swing risk; when there are more than two enemies per
  character, some should be fragile;
- absence of a player can justify removing creatures, and reinforcement or
  retreat can adjust a live encounter;
- two or three different statblocks are usually easier to run than a larger
  variety;
- a creature above party level can remove a character with one action; and
- avoid a creature whose unusual feature lower-level characters cannot readily
  overcome.

Source:
[SRD 5.2.1, lines 13008–13039](../srd/full/srd-5.2.1.txt#L13008-L13039).
Elevation, defensive positions, mixed groups, and reasons to move are also
licensed encounter ingredients
([lines 12950–12971](../srd/full/srd-5.2.1.txt#L12950-L12971)).

### 2.4 The current starter roster

The roster is nine reusable **statblock types**, not a limit of one creature per
type. Each monster combatant has its own combatant and token identity while
retaining the shared statblock id (`src/combat/combatant.ts:165-193`). CR, XP,
and PB agree with the SRD tables: CR 1/4 is 50 XP, CR 1/2 is 100 XP, and CR 2 is
450 XP; all use PB +2
([SRD 5.2.1, lines 16637–16690](../srd/full/srd-5.2.1.txt#L16637-L16690)).

| Roster statblock | CR | XP | Useful generated role |
|---|---:|---:|---|
| Goblin Warrior | 1/4 | 50 | skirmisher or ambusher |
| Hobgoblin Warrior | 1/2 | 100 | defender |
| Bandit Captain | 2 | 450 | durable boss or defender |
| Ogre | 2 | 450 | bruiser |
| Priest Acolyte | 1/4 | 50 | light leader or artillery |
| Priest | 2 | 450 | leader or artillery |
| Skeleton | 1/4 | 50 | artillery or line combatant |
| Zombie | 1/4 | 50 | defender |
| Wolf | 1/4 | 50 | bruiser or controller |

The role column is project synthesis from the decoded mechanics in
`src/combat/statblocks/monsters.ts:80-197`, using the LGMRD role vocabulary; it
does not alter CR or XP. The authoritative roster and SRD spans are in
`src/combat/statblocks/roster.ts:12-22`.

### 2.5 Level-7 budgets

| Party | Low | Moderate | High | Lazy deadly line |
|---|---:|---:|---:|---:|
| 3 level-7 PCs | 2,250 XP | 3,900 XP | 5,100 XP | total monster CR > 10 |
| 4 level-7 PCs | 3,000 XP | 5,200 XP | 6,800 XP | total monster CR > 14 |

The XP values are `party size × {750, 1,300, 1,700}` from the SRD table. The
Lazy values use section 3's formula: `floor((party size × 7) / 2)`.

### 2.6 Concrete encounters from the roster

All examples obey increment 9's 4–6-creature limit and use no statblock outside
the nine-type roster.

| Example | Creatures | XP result | Lazy result | Reading |
|---|---|---:|---:|---|
| Light Low, 3 PCs | 2 Ogres, 1 Priest Acolyte, 1 Wolf | 1,000 ≤ 2,250 | CR 4.5 ≤ 10 | Valid Low-budget encounter, deliberately far below its ceiling. |
| Full Low, 3 PCs | 3 Ogres, 1 Bandit Captain, 1 Priest | 2,250 = 2,250 | CR 10 = 10 | Exactly fills Low; the Lazy warning uses `>`, so equality is not over the line. |
| Moderate/red, 3 PCs | 4 Ogres, 1 Bandit Captain, 1 Priest | 2,700: above Low, below Moderate 3,900 | CR 12 > 10 | Moderate under the project banding in section 6, but potentially deadly by the Lazy cross-check. For 4 PCs the same encounter is still within Low and CR 12 ≤ 14. |

This exposes a real constraint rather than a calculation error. Six CR-2
creatures are the roster's maximum 4–6-creature package: 2,700 XP and total CR
12. Therefore:

- three PCs can receive Low or Moderate by section 6's non-overlapping XP bands,
  but not High;
- four PCs can receive only Low; and
- the generator cannot honestly satisfy Moderate or High for four PCs, or High
  for three PCs, without increasing creature count, adding higher-CR approved
  statblocks, or changing the request.

The validator must return an explicit `unbuildable_difficulty` result in those
cases. It must not silently underfill a requested category.

### 2.7 Interpreting an encounter estimate

The arithmetic is a warning instrument, not an outcome guarantee (EM-001).
Start with opponents and circumstances that belong in the fiction, then use the
warning to decide whether to expose the danger, alter the situation, or prepare
a survivable failure path (EM-002, EM-006). Across a campaign, deliberate
contrast is useful: routine victories, uncertain struggles, and threats the
characters should avoid teach more than forcing every scene toward the same
label (EM-005).

Calibration belongs to the actual party. Teamwork, available options, player
experience, equipment, and resources already spent can all move observed
pressure away from a generic estimate (EM-003). Enemy count must therefore be
recorded separately from summed XP or CR: additional bodies provide more
targeting choices, positions, and chances to affect the fight (EM-004). Section
6 extends that observation into simulated opportunity counts.

For homebrew evaluation, durability and offense cannot be judged as isolated
advantages. Staying active creates further chances to apply the creature's
offense, so the simulator should measure total harm delivered before the
creature is neutralized (EM-007). Statistical trends inferred from a thin part
of a benchmark remain hypotheses; an extreme observation is not a new baseline
until broader simulation supports it (EM-008).

Further reading: [Sly Flourish encounter building](https://slyflourish.com/5e_encounter_building.html),
[The Finished Book monster analysis](https://tomedunn.github.io/the-finished-book/monsters/monster-manual-2024/),
and [Blog of Holding monster statistics](https://www.blogofholding.com/?p=8469).

## 3. Lazy Encounter Benchmark cross-check

The LGMRD benchmark is a warning gauge, not a replacement XP system. For party
members of level 5 or higher:

```text
benchmark = floor(sum of character levels / 2)
potentially deadly when sum of monster CRs > benchmark
```

For levels 1–4 the divisor is 4. The source explicitly calls the benchmark
rough, uses the strict `>` comparison, and does not assign easy/medium/hard
bands. See `lgmrd-monster-builder.md:884-912`.

For the starter case:

- three level-7 PCs: `floor(21 / 2) = 10`;
- four level-7 PCs: `floor(28 / 2) = 14`;
- five CR-2 monsters: total CR 10, not over the three-PC line;
- six CR-2 monsters: total CR 12, over the three-PC line but below the four-PC
  line.

The cross-check intentionally preserves disagreement. The LGMRD's separate hard
combination table calls six CR-2 creatures a hard challenge for four level-7
characters (`lgmrd-monster-builder.md:806-818`), while the SRD XP total of 2,700
does not reach that party's 3,000-XP Low ceiling. The benchmark itself is not
red because 12 is below 14. None of those signals is silently promoted to
ground truth; the simulation and owner approval settle the fixture.

For a single creature, the LGMRD also warns that it might be deadly when CR is
at least 1.5 times average character level for characters of level 5 or higher
(`lgmrd-monster-builder.md:922-926`). Increment 9's roster cannot approach that
line for level 7, but future homebrew validation should retain the check.

## 4. Homebrew monster building

### 4.1 Quick-monster method

The LGMRD method is:

1. choose CR from the creature's fictional power or the equivalent-character
   column;
2. copy the row's baseline statistics;
3. choose the abilities in which the creature is proficient and use the row's
   proficient ability bonus for those saves/checks and for attacks; and
4. assign nonproficient ability modifiers from -2 through +4 based on the
   creature's fiction, using +0 when no stronger choice is justified.

The AC/DC value serves both as typical AC and as the typical save DC. DPR is the
total expected damage in one round and is divided across the listed number of
attacks. An effect that targets two or more characters uses half the listed DPR.
Source: `lgmrd-monster-builder.md:41-95`.

The table below reproduces the mechanical benchmark columns under CC-BY-4.0 and
omits only the source's example-monster column. Source:
`lgmrd-monster-builder.md:97-134`.

| CR | Equivalent character level | AC / DC | HP (suggested range) | Proficient ability / attack bonus | DPR | Attacks | Average damage per attack (dice) |
|---:|---:|---:|---:|---:|---:|---:|---:|
| 0 | <1 | 10 | 3 (2–4) | +2 | 2 | 1 | 2 (1d4) |
| 1/8 | <1 | 11 | 9 (7–11) | +3 | 3 | 1 | 4 (1d6 + 1) |
| 1/4 | 1 | 11 | 13 (10–16) | +3 | 5 | 1 | 5 (1d6 + 2) |
| 1/2 | 2 | 12 | 22 (17–28) | +4 | 8 | 2 | 4 (1d4 + 2) |
| 1 | 3 | 12 | 33 (25–41) | +5 | 12 | 2 | 6 (1d8 + 2) |
| 2 | 5 | 13 | 45 (34–56) | +5 | 17 | 2 | 9 (2d6 + 2) |
| 3 | 7 | 13 | 65 (49–81) | +5 | 23 | 2 | 12 (2d8 + 3) |
| 4 | 9 | 14 | 84 (64–106) | +6 | 28 | 2 | 14 (3d8 + 1) |
| 5 | 10 | 15 | 95 (71–119) | +7 | 35 | 3 | 12 (3d6 + 2) |
| 6 | 11 | 15 | 112 (84–140) | +7 | 41 | 3 | 14 (3d6 + 4) |
| 7 | 12 | 15 | 130 (98–162) | +7 | 47 | 3 | 16 (3d8 + 3) |
| 8 | 13 | 15 | 136 (102–170) | +7 | 53 | 3 | 18 (3d10 + 2) |
| 9 | 15 | 16 | 145 (109–181) | +8 | 59 | 3 | 19 (3d10 + 3) |
| 10 | 16 | 17 | 155 (116–194) | +9 | 65 | 4 | 16 (3d8 + 3) |
| 11 | 17 | 17 | 165 (124–206) | +9 | 71 | 4 | 18 (3d10 + 2) |
| 12 | 18 | 17 | 175 (131–219) | +9 | 77 | 4 | 19 (3d10 + 3) |
| 13 | 19 | 18 | 184 (138–230) | +10 | 83 | 4 | 21 (4d8 + 3) |
| 14 | 20 | 19 | 196 (147–245) | +11 | 89 | 4 | 22 (4d10) |
| 15 | >20 | 19 | 210 (158–263) | +11 | 95 | 5 | 19 (3d10 + 3) |
| 16 | >20 | 19 | 229 (172–286) | +11 | 101 | 5 | 21 (4d8 + 3) |
| 17 | >20 | 20 | 246 (185–308) | +12 | 107 | 5 | 22 (3d12 + 3) |
| 18 | >20 | 21 | 266 (200–333) | +13 | 113 | 5 | 23 (4d10 + 1) |
| 19 | >20 | 21 | 285 (214–356) | +13 | 119 | 5 | 24 (4d10 + 2) |
| 20 | >20 | 21 | 300 (225–375) | +13 | 132 | 5 | 26 (4d12) |
| 21 | >20 | 22 | 325 (244–406) | +14 | 150 | 5 | 30 (4d12 + 4) |
| 22 | >20 | 23 | 350 (263–438) | +15 | 168 | 5 | 34 (4d12 + 8) |
| 23 | >20 | 23 | 375 (281–469) | +15 | 186 | 5 | 37 (6d10 + 4) |
| 24 | >20 | 23 | 400 (300–500) | +15 | 204 | 5 | 41 (6d10 + 8) |
| 25 | >20 | 24 | 430 (323–538) | +16 | 222 | 5 | 44 (6d10 + 11) |
| 26 | >20 | 25 | 460 (345–575) | +17 | 240 | 5 | 48 (6d10 + 15) |
| 27 | >20 | 25 | 490 (368–613) | +17 | 258 | 5 | 52 (6d10 + 19) |
| 28 | >20 | 25 | 540 (405–675) | +17 | 276 | 5 | 55 (6d10 + 22) |
| 29 | >20 | 26 | 600 (450–750) | +18 | 294 | 5 | 59 (6d10 + 26) |
| 30 | >20 | 27 | 666 (500–833) | +19 | 312 | 5 | 62 (6d10 + 29) |

For faster interpolation, the same source offers these formulas:

```text
AC = 12 + half CR
HP = (15 × CR) + 15
proficient saves and skills = 4 + half CR
attack bonus = 4 + half CR
save DC = 12 + half CR
DPR = (7 × CR) + 5
```

Start with one attack, adding one at CR 2, 7, 11, and 15, and split DPR across
the attacks. Source: `lgmrd-monster-builder.md:428-444`. The table remains the
canonical benchmark for this document; formula results are a quick fallback and
must not overwrite a table row.

The LGMRD also supplies reskinnable Minion, Soldier, Brute, Specialist,
Myrmidon, Sentinel, and Champion chassis at CR 1/8, 1/2, 2, 4, 7, 11, and 15
(`lgmrd-monster-builder.md:164-384`). They are useful authored starting points,
not extra rows in the project's SRD starter roster.

Use those rows as an envelope around a purpose, not as the purpose itself.
Decide first what danger the creature represents and what it attempts during
play, then select statistics and actions that make that behavior possible
(MS-001). Every creature still needs a dependable ordinary action so it remains
operable when its signature tool is unavailable (MS-005).

Review offense and defense separately before considering their interaction
(MS-002). A glass-cannon or tank variation should exchange strength on one axis
for a weakness on another rather than lifting the entire chassis (MS-007).
Reliable traits count in the same evaluation as printed attack and defense
values; prose that repeatedly changes accuracy, output, avoidance, or endurance
is not mechanically free (MS-003). Prefer durability that behaves consistently
over protection that becomes overwhelming or irrelevant depending on whether a
party owns a particular answer (MS-008).

Finally, treat the row as a starting hypothesis and tune against party-specific
simulation and play evidence (MS-004). When comparison data suggests that
offense and basic defenses change at different rates across tiers, investigate
each axis independently instead of inflating every statistic together (MS-006).
Do not extrapolate a numeric adjustment from either qualitative observation;
section 6.4 defines the required calibration work.

Further reading: [Angry GM monster building](https://theangrygm.com/monster-building-202/),
[Giffyglyph making monsters](https://giffyglyph.com/monstermaker/grimoire/2.1.2/en/making_monsters.html),
[The Finished Book monster analysis](https://tomedunn.github.io/the-finished-book/monsters/monster-manual-2024/),
and [Blog of Holding monster statistics](https://www.blogofholding.com/?p=8469).

### 4.2 Roles

Roles are tactical descriptions, not new rules and not CR modifiers. The source
expressly treats them as flexible labels (`lgmrd-monster-builder.md:505-513`).

| Role | Mechanical tendency | Generator use |
|---|---|---|
| Ambusher | avoids retaliation, often exchanges durability for a strong hidden opener | begin concealed or with an escape route; do not let repeated hiding drag out every fight |
| Artillery | accurate ranged damage, usually less durable | use cover or elevation, but keep it reachable within about one round of movement |
| Bruiser | high close-range damage, offset by lower defense, accuracy, or HP | place on the front line and expose the danger clearly |
| Controller | conditions, forced positioning, grapples, or other impediments | pair with a damage dealer; avoid repeatedly removing the same PC's agency |
| Defender | higher durability and lower offense, sometimes able to hold enemies nearby | protect a vulnerable leader or artillery creature; use sparingly to avoid a slog |
| Leader | improves, heals, or moves allies, usually with an offensive or defensive tradeoff | place centrally or behind defenders and make its support legible |
| Skirmisher | mobility, disengagement, and repositioning, often with lighter defenses | start where movement matters and provide routes through the map |

Sources by role: `lgmrd-monster-builder.md:515-595`.

A role is useful only when it tells the GM what the creature tries to accomplish
on its turn (RL-001), and the statblock must supply the access, movement,
protection, control, or range that the label promises (RL-002). Compose roles
that create opportunities for each other: a blocker can preserve an exposed
ranged threat, while forced movement can deliver a target to a close-range
attacker (RL-003).

Keep the encounter's role vocabulary within the GM's working capacity; variety
is lost when overload reduces every statblock to its default attack (RL-004).
For recurring factions, repeat a recognizable family mechanic while giving
specialists different jobs (RL-005). An intelligent leader's choice and
placement of allies should cover its weaknesses or exploit known party habits,
making planning visible through the roster itself (RL-006).

Further reading: [Angry GM monster building](https://theangrygm.com/monster-building-202/),
[Giffyglyph encounter building](https://giffyglyph.com/monstermaker/grimoire/2.1.2/en/building_an_encounter.html),
and [The Monsters Know intelligent tactics](https://www.themonstersknow.com/intelligent-enemy-tactics/).

### 4.3 Bosses, minions, and encounter composition

Use “boss” and “minion” as encounter jobs, not hidden statistical exceptions.
The LGMRD supplies three reusable composition shapes:

- one boss plus a few lower-CR monsters;
- one boss plus several underlings; or
- one boss, two lieutenants, and a larger minion group.

It also supplies same-CR groups of two, four, six, eight, or twelve. Its tables
are hard-challenge approximations for parties of four, five, or six and warn
that scaling remains approximate (`lgmrd-monster-builder.md:764-804`). For four
level-7 characters, its row includes six CR-2 monsters
(`lgmrd-monster-builder.md:806-818`). Always retain the SRD XP calculation and
the Lazy benchmark beside a composition-table result.

A boss needs enough actions or allies to participate across the round. Minions
should make the boss's role clearer, create movement choices, and give PCs
targets they can remove. Do not invent one-hit minion behavior: neither licensed
source establishes a universal one-hit rule.

#### Boss progressions and alternative chassis

Prefer a small dramatic script to a catalogue of interchangeable powers: an
entrance that establishes the threat, a way to answer encirclement, and a
thematic escalation when the conflict turns against the boss (BM-001). A phase
change must alter player decisions through movement, priorities, cover,
hazards, or role; merely restoring endurance does not create a new scene
(BM-002).

A visible, consistently applied phase boundary may clear control effects that
would otherwise suppress the boss for the remainder of the encounter. This
keeps those effects valuable within the phase while preventing an early success
from removing the entire climax (BM-003). An alternative chassis represents the
boss as linked components with separate endurance and activity. Disabling a
component then removes some of the boss's presence and makes progress visible
before final defeat (BM-004). Both are authored mechanics requiring simulation,
not implicit benefits attached to the word “boss.”

Lair activity should express the villain's preparation and nature, allowing the
location to participate without lengthening the boss's main action menu
(BM-008). Treat legendary or otherwise elite offense as a separate aggregation
risk when combining such creatures; a printed encounter signal does not prove
that several offense-weighted elites behave like ordinary peers (BM-007).

#### Minion patterns

Low-endurance followers can add obstruction, motion, and spectacle without
turning the end of the fight into prolonged cleanup. Keep their procedure
uniform enough to run as a group (BM-005). Their identity and job must follow
from the boss: they might screen an approach, work a location feature, threaten
an exposed character, or compensate for a known weakness (BM-006). “Minion”
does not authorize a hidden hit-point rule or a free budget adjustment.

Further reading: [Sly Flourish action-oriented monsters](https://slyflourish.com/action_oriented_monsters.html),
[Giffyglyph elites and solos](https://giffyglyph.com/monstermaker/grimoire/2.1.2/en/minions_elites_solos.html),
[Angry GM paragon boss design](https://theangrygm.com/return-of-the-son-of-the-dd-boss-fight-now-in-5e/),
[Kobold Press boss fights](https://koboldpress.com/boss-fights-the-duelist/),
[The Monsters Know encounter construction](https://www.themonstersknow.com/thoughts-constructing-encounters/),
and [The Finished Book monster analysis](https://tomedunn.github.io/the-finished-book/monsters/monster-manual-2024/).

### 4.4 Encounter prompt checklist

For a set piece, the codex DM considers the licensed checklist below and chooses
only the elements that serve the encounter:

- interesting monsters;
- a fantastic location;
- zone-wide effects;
- traps or hazards;
- advantageous positions;
- interactive objects;
- cover;
- difficult or fantastic terrain; and
- a goal beyond defeating every enemy.

The checklist is reproduced under CC-BY-4.0 from
`lgmrd-monster-builder.md:652-668`; its detailed guidance runs through line 763.
The prompt should normally select two or three creature types, state each role,
give every terrain element a playable purpose, and keep DM-only tactics out of
the player projection.

### 4.5 Action economy and realized pressure

Compare each side's material opportunities, not only its strongest attack.
Additional useful turns improve the ability to reposition, recover after a
miss, impose control, and finish a vulnerable target (AE-001). Initiative also
changes realized output: an actor that moves before it is disabled has a better
chance to complete its plan, so initiative behavior belongs in simulation
evidence for elite threats (AE-007).

A solo can remain responsive by acting or moving between character turns rather
than concentrating all influence into its scheduled turn (AE-002, AE-004).
Another model treats a solo as linked functional components sharing a body;
lost components reduce both endurance and available activity as the party makes
progress (AE-003). Either design changes pressure and must be represented as
explicit mechanics, never as an unrecorded boss privilege.

Minions can raise the enemy's opportunity count, occupy routes, and demand
attention without importing the endurance or decision burden of standard foes
(AE-005). Reinforcements and waves provide a conditional version of the same
control, but arrival must follow a player-visible cause such as an alarm,
summoning act, or nearby reserve (AE-006). Section 6 records opportunity counts
and requires simulation before any of these patterns receives numeric tuning.

Further reading: [Sly Flourish encounter building](https://slyflourish.com/5e_encounter_building.html),
[Sly Flourish action-oriented monsters](https://slyflourish.com/action_oriented_monsters.html),
[Angry GM paragon boss design](https://theangrygm.com/return-of-the-son-of-the-dd-boss-fight-now-in-5e/),
[Giffyglyph elites and solos](https://giffyglyph.com/monstermaker/grimoire/2.1.2/en/minions_elites_solos.html),
[Lazy GM monster building](https://slyflourish.com/lazy_5e_monster_building_resource_document.html),
and [The Finished Book monster analysis](https://tomedunn.github.io/the-finished-book/monsters/monster-manual-2024/).

### 4.6 Pacing and encounter exit

Match preparation and procedure to the scene's importance. A minor fight should
not inherit the map detail, role variety, and layered hazards reserved for a set
piece unless those elements earn their table time (PC-001). Introduce a
creature family's shared behavior in a clear encounter before combining it with
new specialists, so later complexity tests learned knowledge rather than pure
surprise (PC-002).

Write likely exit behavior before play. Surrender, flight, dispersal, or the
fall of a commander may bring a settled conflict to a prompt close before every
pool is exhausted (PC-003). Waves can keep a large battle legible and let later
pressure respond to demonstrated party capability without rewriting creatures
already present (PC-004). The trigger and possible arrivals remain visible
fictional facts, not secret balance corrections.

An environmental escalation that threatens every side can move a stalled fight
toward resolution, provided the characters can influence or stop it (PC-005).
A climax is defined by consequence, novelty, and visible change rather than by
budget alone; a benchmark-ordinary encounter may still close an important arc
(PC-006).

Further reading: [Angry GM practical encounter design](https://theangrygm.com/how-to-f-cr-practical-example-2/),
[Lazy GM monster building](https://slyflourish.com/lazy_5e_monster_building_resource_document.html),
and [Sly Flourish zone effects](https://slyflourish.com/zone_effects.html).

### 4.7 Telegraphing dangerous changes

Before an exceptional attack resolves, reveal its source, threatened space, and
timing so the threat becomes a positioning problem rather than unavoidable
punishment (TG-001). The map must contain a credible response: escape, cover,
interruption, or another way to change the outcome (TG-002).

Charging the attack should cost the monster some immediately useful activity,
opening a real window in which the party can move, interfere, or press an
advantage (TG-003). A temporary exposed component can turn that window into an
active team objective (TG-004). Across encounters, repeat recognizable faction
or creature-family signals while varying their application; correctly reading
a learned pattern should confer tactical value (TG-005).

Further reading: [Giffyglyph overkill attacks](https://giffyglyph.com/monstermaker/grimoire/2.1.2/en/overkill_attacks.html)
and [Angry GM monster building](https://theangrygm.com/monster-building-202/).

### 4.8 Terrain and objectives

Define each side's purpose before treating extermination as the default.
Delaying, escaping, capturing, protecting, stealing, or interrupting produce
different movement and target choices (TO-001). A win condition should remain
independent of enemy survival, so surviving opponents may withdraw, pursue
another aim, or cease to matter after the objective resolves (TO-005). An active
threat or deadline keeps the alternative objective from becoming ordinary
attrition under another name (TO-006).

Build the location as if its inhabitants selected or prepared it. Routes,
observation, concealment, bottlenecks, and hazards should support their method
(TO-002). A site's structure, scars, contents, and vertical spaces can reveal
history while shaping movement, cover, and control (TO-003). Include a
meaningful non-attack interaction—operating a mechanism, relocating an object,
extracting a captive, or altering a danger—that competes for combat attention
(TO-004).

Prefer a broad environmental rule that applies to everyone, with its uneven
advantages emerging through the creatures' individual traits (TO-007).
Difficulty can change because a side gains or loses access to its plan:
favorable ground and complementary
allies strengthen it, while broken formation or unsuitable terrain weaken it
(TO-008). There is no licensed numeric XP adjustment for those relationships;
section 6.4 leaves the value to simulation.

Further reading: [The Monsters Know encounter construction](https://www.themonstersknow.com/thoughts-constructing-encounters/),
[D&D Beyond tactical encounters](https://www.dndbeyond.com/posts/794-new-players-guide-how-to-build-tactical-encounters),
[Lazy GM monster building](https://slyflourish.com/lazy_5e_monster_building_resource_document.html),
[Sly Flourish zone effects](https://slyflourish.com/zone_effects.html),
and [Angry GM choosing enemies](https://theangrygm.com/the-angry-guide-to-akicking-combats-part-1-picking-your-enemies/).

### 4.9 Table-running representation

Put related attacks and the information needed to resolve them together, so the
creature's intended behavior survives contact with the table (TR-001). When a
broad spell catalogue contributes little flexibility during the expected
scene, replace it with self-contained thematic actions rather than requiring
lookup and option scanning (TR-002). Use fixed results for routine monster
procedures when an extra roll creates work but no meaningful suspense (TR-003).

For hordes, pool or average repetitive resolution while retaining individual
figures wherever location has player-facing consequences (TR-004). Abstraction
removes bookkeeping; it must not erase targets, routes, or effects the players
can perceive.

Attach a compact tactical script to each encounter role: objective, preferred
target, opening approach, fallback, and exit condition (TR-005). The script's
adaptability follows the creature's intelligence. An instinctive foe can repeat
a successful pattern; a clever foe can recognize weakness, remember prior
contact, and prepare a response (TR-006).

Further reading: [D&D Beyond statblock design](https://www.dndbeyond.com/posts/1890-preview-the-new-stat-block-design-in-the-2024),
[Sly Flourish action-oriented monsters](https://slyflourish.com/action_oriented_monsters.html),
[Lazy GM monster building](https://slyflourish.com/lazy_5e_monster_building_resource_document.html),
[Sly Flourish running hordes](https://slyflourish.com/running_hordes.html),
and [The Monsters Know intelligent tactics](https://www.themonstersknow.com/intelligent-enemy-tactics/).

## 5. Mapping a homebrew monster to `src/combat/statblock.ts`

The benchmark supplies only a combat chassis. A field not supplied by the
benchmark must be authored or represented as absent; it must never receive a
plausible-looking default.

| Typed field | Source or authored value | Mapping rule |
|---|---|---|
| `id` | authored | Stable homebrew statblock identity; do not derive identity from display text alone. |
| `name` | authored | Required non-empty display name. |
| `armorClass` | AC/DC column | Use the row's AC unless the author intentionally changes the chassis. |
| `hitPointMaximum` | HP column | Use the baseline or an intentional value in the licensed range. |
| `speedFeet` | authored | The quick table supplies no speed. Require a value; do not default it from another monster. |
| `initiativeBonus` | authored Dexterity modifier | The source permits story-based nonproficient modifiers; do not confuse its optional static initiative score with this modifier field. |
| `savingThrowBonuses` | proficient bonus plus authored nonproficient modifiers | Mark chosen proficient abilities with the table bonus. Author all remaining modifiers; the current model requires six values. |
| `attacksPerAction` | `# Attacks` column | Must match a detailed Multiattack count when one exists. |
| `reachFeet` | authored attack delivery | The benchmark supplies no reach. A ranged action belongs in detailed action delivery, not in this melee reach field. |
| `damageResponses` | authored or absent | No benchmark column. Use an empty operational list and typed `absent` source detail when unlisted. |
| `conditionImmunities` | authored or absent | Same rule as damage responses. |
| `usesDeathSaves` | project monster policy | Always `false` for a monster, including homebrew. Never inherit the PC value. |
| `sourceDetails.challenge.rating` | chosen CR | The CR selected in step 1. |
| `sourceDetails.challenge.experiencePoints` | SRD CR/XP table | XP comes from SRD 5.2.1, not from the quick benchmark. |
| `sourceDetails.challenge.proficiencyBonus` | SRD CR/PB table | PB comes from SRD 5.2.1. The LGMRD's “proficient ability bonus” is the final check/save/attack bonus, not PB itself. |
| `sourceDetails.hitPointDice` | authored or absent | The benchmark supplies HP but no Hit Dice. Do not reverse-engineer dice merely to fill the field. |
| `sourceDetails.movement` | authored or absent | If present, walking speed must equal `speedFeet`; other modes require authored values. |
| `sourceDetails.abilities` | authored or absent | The benchmark gives final modifiers/bonuses, not six ability scores. Do not fabricate scores. |
| `sourceDetails.actions` | attack/DC/DPR columns plus authored delivery and damage type | Sum the standard-round action averages to DPR, split over the listed attacks. An authored save effect uses AC/DC as DC. |
| `skills`, `gear`, `senses`, `passivePerception`, `languages`, `traits`, `bonusActions`, `reactions` | authored or absent | None is supplied by the benchmark. Preserve typed absence for every unlisted field. |
| `classification` | authored or absent | Size, type, subtype, and alignment are fictional choices, not benchmark outputs. |

The SRD statblock overview confirms that optional details simply do not appear
when a monster lacks them
([SRD 5.2.1, lines 16505–16540](../srd/full/srd-5.2.1.txt#L16505-L16540)).
Its statblock conventions cover HP and Hit Dice, speeds, abilities, skills,
resistances/vulnerabilities, senses, languages, CR/XP/PB, traits, actions,
damage notation, Multiattack, spellcasting, bonus actions, reactions, legendary
actions, and limited usage
([lines 16546–16744](../srd/full/srd-5.2.1.txt#L16546-L16744)).

### Current model gaps before broad homebrew support

The current types intentionally fit the starter roster, not the full quick
table:

- `ChallengeRating` permits only 1/4, 1/2, 1, 2, and 3;
- `MonsterChallenge.experiencePoints` permits only 50, 100, 200, 450, and 700;
- monster PB is fixed at +2; and
- `SourceSpan.path` permits only the bundled SRD path;
- `MonsterAction` permits attacks, Multiattack, and spellcasting, but no generic
  save action, recharge action, or legendary action; and
- the current trait, bonus-action, reaction, damage-trigger, and on-hit unions
  enumerate only the mechanics needed by the starter roster.

See `src/combat/statblock.ts:26-34,79-152`. Broad homebrew support must replace
those closed starter-only types with ranged/branded CR, XP, PB, provenance, and
extensible mechanical action types while preserving the SRD CR-to-XP and
CR-to-PB relations. It must not add a compatibility wrapper around the starter
restriction.

Today, omitting `sourceDetails` produces typed absence for every detailed field
(`src/combat/statblock.ts:311-320`). That is honest for a quick operational
chassis, but it also hides authored actions and challenge detail. Future
homebrew storage therefore needs a provenance variant for owner-authored data,
so authored presence is not mislabeled as SRD-decoded presence and is not
discarded as absence.

## 6. Difficulty semantics bridge for increment 9

This section is **original project policy**, not a rule from either licensed
source. Its purpose is to turn the sources' warning systems into a validator
contract without presenting invented calibration as D&D rules.

### 6.1 Request and deterministic budget gate

```ts
type EncounterDifficultyRequest = {
  readonly rounds: 3 | 4 | 5;
  readonly pressure: 'low' | 'moderate' | 'high';
};
```

The round values come from increment 9's first-skirmish scope
(`docs/design/2026-08-19-vtt-phase2-movement-controllers.md:1709-1747`).
Pressure maps to non-overlapping XP bands derived only from the SRD ceilings:

| Requested pressure | Project XP band |
|---|---|
| `low` | `encounter XP <= Low budget` |
| `moderate` | `Low budget < encounter XP <= Moderate budget` |
| `high` | `Moderate budget < encounter XP <= High budget` |

The exclusive lower boundary for each higher band is derived from the preceding
SRD ceiling. The SRD does not itself define these non-overlapping bands. The
project classification prevents an underfilled encounter from receiving every
difficulty label.

The deterministic validator:

1. derives all three budgets from party levels and size;
2. sums statblock XP and checks the requested band;
3. enforces 4–6 monsters and approved statblock ids;
4. computes the Lazy benchmark and records `dangerCrossCheck: true` when total
   CR is strictly over the line; and
5. returns `unbuildable_difficulty` when no roster combination can satisfy all
   constraints.

The Lazy flag never changes `pressure` by itself because its source explicitly
does not define easy, medium, or hard measurements.

### 6.2 Simulation gate

The simulation is authoritative for expected length and observed resource use;
XP and CR are proposal heuristics.

For length, store the complete simulated terminal-round distribution and its
expectation. No rounding tolerance or acceptance interval is licensed. The
validator therefore reports round evidence but cannot claim that a candidate
matches `request.rounds` until the rounds experiment in section 6.4 derives a
versioned classification rule.

For resource pressure, compute only dimensions the simulator can prove it
modeled:

```text
hpLossFraction       = expected unrecovered party HP loss at encounter end / starting party HP
healingSpendFraction = expected healing resources spent / available healing resources
limitedSpendFraction = expected limited-use resources spent / available limited-use resources
```

When a denominator is unavailable or the party has no resource of that kind,
the component is typed absent. If every component is absent, validation refuses
rather than claiming pressure. Do not collapse the vector into a scalar or map
it to Low, Moderate, or High until the pressure experiment in section 6.4 has
derived and versioned the aggregation and cut points.

The simulator also reports knockout probability, death probability, party-win
probability, and unsupported mechanics separately; those safety signals are
never compressed into the resource vector. D245's existing honesty rule still
applies: an unmodeled load-bearing mechanic makes the numeric result unavailable.

#### Material-opportunity evidence

Record party and enemy material opportunities by round. A material opportunity
is a scheduled or triggered chance to damage, move, protect, heal, control, or
advance an objective; purely cosmetic triggers do not count. Preserve the
source of each opportunity—normal turn, off-turn boss activity, reaction,
minion, reinforcement, hazard, or objective interaction—and record whether it
resolved before its actor was neutralized.

This evidence sharpens `{ rounds, pressure }`: more opportunities can increase
pressure even when nominal XP and peak attack damage are unchanged, while early
initiative can increase the share of scheduled activity that actually resolves.
For component bosses, record how the available opportunity schedule changes as
components are disabled. No opportunity ratio is a difficulty multiplier until
the paired simulation in section 6.4 derives one.

Until the rounds and pressure calibration TODOs are complete, a candidate may
pass the deterministic XP gate but is not eligible for final owner approval as
a verified `{ rounds, pressure }` fixture. Store the exact request, arithmetic,
simulation inputs and version, terminal-round distribution, resource vector,
opportunity evidence, safety outputs, Lazy cross-check, and owner decision with
the content-addressed package.

### 6.3 Generator prompt contract

The codex DM receives:

- party count and levels;
- required `{ rounds, pressure }` with no default;
- allowed statblock and asset ids;
- the computed XP band and Lazy line;
- the encounter checklist from section 4.4; and
- required package fields from increment 9.

It returns a candidate, not an approved fixture. The prompt should ask for two
or three complementary creature types, roles, placements, terrain interactions,
a non-extermination goal when appropriate, and DM-only tactics. Mechanical
fields must reference an approved statblock; prose cannot override the typed
mechanics. The validator, simulation, projections, and owner approval occur
after generation.

The prompt also states each side's objective, encounter exit conditions,
reinforcement causes, telegraphed threats and responses, and a compact tactical
script for every role. A boss proposal must enumerate every scheduled and
off-turn opportunity; a minion or phase rule must be explicit typed mechanics.
The generator may propose those relationships but may not attach an uncited
number or convert one into XP, CR, rounds, or pressure.

### 6.4 TODO(sim-calibration) experiments

These experiments close numeric gaps; the qualitative methods in section 4 do
not supply their results.

- **TODO(sim-calibration: rounds):** For every buildable starter-roster package
  and supported party snapshot, run the simulator across its registered random
  seeds. Persist the terminal-round distribution. Have the owner label which
  request-round values each distribution satisfies, then derive acceptance
  intervals from those labels. Validate the resulting rule on held-out roster
  packages before placing it in versioned configuration.
- **TODO(sim-calibration: pressure):** From the same runs, persist each resource
  fraction, knockout and death outcomes, win outcome, and pre-encounter resource
  state. Obtain owner Low/Moderate/High labels without showing a proposed
  formula, fit candidate aggregation rules and boundaries, and select only a
  rule that holds on held-out packages. Keep safety probabilities beside the
  label rather than absorbing them into it.
- **TODO(sim-calibration: action economy and initiative):** Construct paired
  encounters with the same party, XP, benchmark DPR, benchmark endurance, map,
  and tactics while varying enemy material-opportunity schedules, initiative
  ordering, and off-turn activity. Compare realized opportunities,
  terminal-round distributions, resource vectors, and safety outcomes. Derive
  an adjustment only if the paired effect is stable across roster compositions.
- **TODO(sim-calibration: bosses and minions):** Compare a standard group with
  explicit solo-phase, linked-component, lair-activity, and low-endurance-minion
  variants while holding the licensed chassis totals fixed wherever the model
  permits. Measure whether phase clearing, component loss, and minion removal
  change realized opportunities and total harm. Derive endurance, activity, and
  budget treatment separately; do not assume a universal one-hit minion.
- **TODO(sim-calibration: waves, terrain, and objectives):** Simulate paired
  maps and scripts that vary reinforcement timing, access to role strengths,
  symmetric environmental effects, interactive objects, and non-extermination
  goals. Add objective completion and time-to-objective to the result. Derive no
  XP or pressure adjustment unless the effect replicates across encounter
  families.
- **TODO(sim-calibration: homebrew stat axes):** Starting from each licensed
  quick-table chassis, vary offense, defense, reliable traits, initiative, and
  conditional protection independently and in combinations. Measure total harm
  before neutralization as well as terminal and safety outcomes. Use the result
  to test tradeoffs and extrapolation, not to claim an official CR calculator.

## 7. Licensing and public-repository safety

### 7.1 Source inventory

| Source | Local/provenance location | Material used | License |
|---|---|---|---|
| System Reference Document 5.2.1 | `docs/srd/full/srd-5.2.1.txt`; 2,147,059 bytes; SHA-256 `d2425fa863247509c9af77cd4856e254a9ad4216661b948fc99daa67db69c918`; upstream provenance in `docs/srd/SOURCE.md:9-22` | CR meaning; encounter budgets and procedure; troubleshooting; statblock, XP, and PB conventions | Creative Commons Attribution 4.0 International (CC-BY-4.0) |
| The Lazy GM's 5e Monster Builder Resource Document, updated 2024-01-18, by Scott Fitzgerald Gray, Teos Abadía, and Michael E. Shea | `/home/vagrant/.claude/jobs/c68ffdd0/tmp/lgmrd-monster-builder.md`; 127,651 bytes; SHA-256 `63d334e8430803ab8970d3d675e4acd51950a3d385a100610fe7da8bef8da666`; [Crit.Tech LGMRD repository](https://github.com/crit-tech/LGMRD) | quick-monster table and formulas; generic chassis; roles; bosses/minions; encounter checklist and combinations; Lazy benchmark | Creative Commons Attribution 4.0 International (CC-BY-4.0) |
| Clean-room encounter and monster design ideas digest | `/home/vagrant/.claude/jobs/c68ffdd0/tmp/ideas-digest.md:5-92` | nonnumeric relationships restated in fresh language in sections 2.7 and 4; source URLs retained as further reading | No source prose, tables, formulas, statblocks, or numeric benchmarks reproduced; underlying sources retain their own terms |

Relevant SRD spans are
`docs/srd/full/srd-5.2.1.txt:11426-11448,12950-13039,16505-16744`. Relevant
LGMRD spans are `lgmrd-monster-builder.md:1-17,33-384,505-930`.

The digest's licensing note points to the
[Giffyglyph Monster Maker FAQ](https://giffyglyph.com/monstermaker/grimoire/2.1.2/en/FAQ.html).
This guide uses the digest's independently phrased, nonnumeric relationships;
it does not reproduce Monster Maker rules or infer redistribution permission
from the link.

### 7.2 Required SRD 5.2.1 attribution

> This work includes material from the System Reference Document 5.2.1
> ("SRD 5.2.1") by Wizards of the Coast LLC, available at
> https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
> Commons Attribution 4.0 International License, available at
> https://creativecommons.org/licenses/by/4.0/legalcode.

This is reproduced verbatim from `docs/srd/ATTRIBUTION.md:7-16`.

### 7.3 Required Lazy GM attribution

> This work includes material taken from the [Lazy GM's 5e Monster Builder Resource Document](https://slyflourish.com/lazy_5e_monster_building_resource_document.html) written by Teos Abadía of [Alphastream.org](https://alphastream.org), Scott Fitzgerald Gray of [Insaneangel.com](https://insaneangel.com), and Michael E. Shea of [SlyFlourish.com](https://slyflourish.com), available under a [Creative Commons Attribution 4.0 International License](http://creativecommons.org/licenses/by/4.0/).

This is reproduced verbatim from the LGMRD header at
`lgmrd-monster-builder.md:11`.

### 7.4 D59 disposition

D59 says never commit a work the project is not licensed to redistribute;
CC-BY material is allowed when attribution remains intact
(`.claude/decisions.md:2663-2669`). This document contains only:

- attributed CC-BY-4.0 source material;
- facts about this repository's own code and owner request;
- independently worded descriptions of nonnumeric methods delivered through the
  clean-room digest, with source URLs retained as factual further-reading links;
  and
- original project synthesis, simulation TODOs, and proposed validator policy.

Accordingly, this document and derivatives that preserve both required notices
are public-repository-safe under D59. The digest does not authorize copying the
linked pages, importing their numbers, or treating a link as a license. This
conclusion does not authorize adding material from an unlisted source.

## 8. Explicit gaps and non-sources

The clean-room digest closes several **conceptual** gaps. Sections 2.7 and
4.5–4.9 now explain how to reason about enemy opportunities, responsive solos,
component bosses, minion jobs, encounter exits, waves, telegraphs, terrain,
objectives, and table procedure. Section 4.1 also explains the interaction of
offense, defense, reliable traits, and initiative. These are design
relationships only; none supplies a numeric adjustment.

The following gaps remain:

1. The 2014 DMG's Easy/Medium/Hard/Deadly XP thresholds and creature-count
   multipliers are absent. This document neither reproduces nor reconstructs
   them. Enemy-count and action-schedule effects remain
   **TODO(sim-calibration: action economy and initiative)** in section 6.4.
2. No official offensive-CR/defensive-CR procedure here derives CR from AC, HP,
   accuracy, DPR, save DC, or special features. The LGMRD quick table is an
   attributed third-party benchmark, not an official CR calculator. Tradeoff
   evidence remains **TODO(sim-calibration: homebrew stat axes)**.
3. No source provides a daily adventuring XP budget, prescribed encounter count
   per day, or rest schedule for this guide.
4. No licensed numeric conversion maps Low/Moderate/High to expected rounds,
   resource-spend fractions, knockout chance, death chance, or win chance. The
   prior provisional rounding and fractional bands have been removed. The
   required derivations are **TODO(sim-calibration: rounds)** and
   **TODO(sim-calibration: pressure)**.
5. The LGMRD has no hard-combination row for three characters. Its rows cover
   four, five, and six characters; the three-PC case continues to use the SRD
   budget and Lazy benchmark only.
6. There is no universal one-hit minion rule, phase-transition value, precise
   boss opportunity adjustment, or numeric CR cost for roles. The guide now
   supplies qualitative boss and minion patterns, while their values remain
   **TODO(sim-calibration: bosses and minions)**.
7. There is no prescribed XP adjustment for terrain, cover, hazards, surprise,
   objectives, favorable positioning, reinforcement timing, or waves. The guide
   now supplies methods for using them, while their values remain
   **TODO(sim-calibration: waves, terrain, and objectives)**.
8. No source reconciles disagreements among the SRD budget, the LGMRD
   hard-combination table, and the Lazy benchmark. The level-7 six-CR-2 example
   demonstrates the disagreement; simulation evidence and owner approval remain
   the project resolution.
9. The current 4–6-creature starter roster lacks enough CR to satisfy every
   requested pressure. Moderate and High for four PCs and High for three PCs
   remain impossible under the non-overlapping SRD-derived XP bands.
10. D317.9's full local decision text is absent. Only the owner-supplied
    `{ rounds, pressure }` meaning is available in this lane.
11. The project lacks a typed storage and provenance model for homebrew CR above
    3 and owner-authored detailed statblocks, as well as general typed actions
    for save effects, recharge abilities, and legendary actions. Section 5
    identifies the required type replacement but does not specify a persistence
    schema.
