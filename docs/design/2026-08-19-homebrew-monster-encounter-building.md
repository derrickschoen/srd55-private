# Clean-room homebrew monster and encounter building

Date: 2026-08-19  
Status: reference design  
Rule-source boundary: SRD 5.2.1 and the Lazy GM's 5e Monster Builder Resource
Document only

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

Project files are used only to describe this application's scope, roster, and
types. All other advice is original synthesis. No material from the Dungeon
Master's Guide, Xanathar's Guide to Everything, or third-party blogs is used.
Where the licensed sources do not answer a commonly expected question, section
8 records the gap instead of filling it from memory.

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

The round values come from increment 9's first-skirmish scope. Pressure maps to
non-overlapping XP bands derived from the SRD ceilings:

| Requested pressure | Project XP band |
|---|---|
| `low` | `0 < encounter XP <= Low budget` |
| `moderate` | `Low budget < encounter XP <= Moderate budget` |
| `high` | `Moderate budget < encounter XP <= High budget` |

The lower bounds are project classification, not SRD text; the SRD defines only
the ceilings. This banding prevents one underfilled encounter from being called
all three difficulties.

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

For length, accept a candidate when
`Math.floor(simulatedExpectedTerminalRound + 0.5)` equals `request.rounds`.
This positive-number half-up rule is project calibration. The fixture stores
the unrounded expectation and simulation version, so later calibration drift is
visible.

For an initial resource-pressure calibration, compute only from resources the
simulator can prove it modeled:

```text
hpLossFraction       = expected unrecovered party HP loss at encounter end / starting party HP
healingSpendFraction = expected healing resources spent / available healing resources
limitedSpendFraction = expected limited-use resources spent / available limited-use resources
resourcePressure     = max(all present fractions)
```

Zero-denominator components are typed absent, not zero. If every component is
absent, validation refuses rather than claiming a pressure. The initial
project-owned bands are:

| Requested pressure | Simulated `resourcePressure` |
|---|---:|
| `low` | `0 through 1/3` |
| `moderate` | `over 1/3 through 2/3` |
| `high` | `over 2/3 through 1` |

These fractions are a proposed product calibration, not licensed game numbers.
They must live in versioned configuration, not be described as SRD thresholds.
The simulator also reports knockout probability, death probability, party-win
probability, and unsupported mechanics separately; those safety signals are
never compressed into the resource score. D245's existing honesty rule still
applies: an unmodeled load-bearing mechanic makes the numeric result unavailable.

A package is eligible for owner approval only when the XP band, requested-round
gate, and simulated resource band all pass. A Lazy danger flag is displayed in
the approval evidence but is not an automatic rejection. Store the exact
request, arithmetic, simulation inputs/version/result, cross-check, and owner
decision with the content-addressed package.

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

## 7. Licensing and public-repository safety

### 7.1 Source inventory

| Source | Local/provenance location | Material used | License |
|---|---|---|---|
| System Reference Document 5.2.1 | `docs/srd/full/srd-5.2.1.txt`; 2,147,059 bytes; SHA-256 `d2425fa863247509c9af77cd4856e254a9ad4216661b948fc99daa67db69c918`; upstream provenance in `docs/srd/SOURCE.md:9-22` | CR meaning; encounter budgets and procedure; troubleshooting; statblock, XP, and PB conventions | Creative Commons Attribution 4.0 International (CC-BY-4.0) |
| The Lazy GM's 5e Monster Builder Resource Document, updated 2024-01-18, by Scott Fitzgerald Gray, Teos Abadía, and Michael E. Shea | `/home/vagrant/.claude/jobs/c68ffdd0/tmp/lgmrd-monster-builder.md`; 127,651 bytes; SHA-256 `63d334e8430803ab8970d3d675e4acd51950a3d385a100610fe7da8bef8da666`; [Crit.Tech LGMRD repository](https://github.com/crit-tech/LGMRD) | quick-monster table and formulas; generic chassis; roles; bosses/minions; encounter checklist and combinations; Lazy benchmark | Creative Commons Attribution 4.0 International (CC-BY-4.0) |

Relevant SRD spans are
`docs/srd/full/srd-5.2.1.txt:11426-11448,12950-13039,16505-16744`. Relevant
LGMRD spans are `lgmrd-monster-builder.md:1-17,33-384,505-930`.

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
- facts about this repository's own code and owner request; and
- original project synthesis and proposed validator policy.

Accordingly, this document and derivatives that preserve both required notices
are public-repository-safe under D59. This conclusion does not authorize adding
material from an unlisted source.

## 8. Explicit gaps and non-sources

The two licensed sources do **not** cleanly provide the following, so this
document does not invent them:

1. The 2014 DMG's Easy/Medium/Hard/Deadly XP thresholds or its creature-count
   multipliers. They do not appear here.
2. An official offensive-CR/defensive-CR procedure for deriving CR from AC, HP,
   accuracy, DPR, save DC, or special features. The LGMRD quick table is an
   attributed third-party benchmark, not an official CR calculator.
3. A daily adventuring XP budget, prescribed encounter count per day, or rest
   schedule for encounter building.
4. A licensed numeric conversion from Low/Moderate/High to expected rounds,
   resource-spend percentages, knockout chance, death chance, or win chance.
   Section 6's round and fractional-resource gates are explicitly original
   project calibration.
5. A three-character hard-combination table in the LGMRD. Its combination
   tables cover four, five, and six characters; the three-PC case uses the SRD
   budget and Lazy benchmark only.
6. A universal one-hit minion rule, a precise boss action-economy adjustment, or
   a numeric CR cost for monster roles.
7. A prescribed XP adjustment for terrain, cover, hazards, surprise, unusual
   objectives, or favorable positioning. Those factors are warnings and design
   inputs, then simulation inputs where modeled.
8. A reconciliation rule for disagreements among the SRD budget, the LGMRD
   hard-combination table, and the Lazy benchmark. The level-7 six-CR-2 example
   demonstrates that disagreement; simulation evidence and owner approval are
   the project resolution.
9. Enough CR in the current 4–6-creature starter roster to satisfy every
   requested pressure. Moderate and High for four PCs and High for three PCs are
   impossible under the proposed non-overlapping XP bands.
10. D317.9's full local decision text. Only the owner-supplied
    `{ rounds, pressure }` meaning is available in this lane.
11. A current typed storage/provenance model for homebrew CR above 3 or for
    owner-authored detailed statblocks, nor general typed actions for save
    effects, recharge abilities, or legendary actions. Section 5 identifies the
    required type replacement but does not specify a persistence schema.
