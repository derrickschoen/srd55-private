Purpose: establish the measurable structural baseline of the twelve SRD 5.2.1 subclasses so a new design matches its host rather than an imagined universal template.

# SRD subclass cadence and anatomy

Derived from SRD 5.2.1, CC-BY-4.0 (see `docs/srd/ATTRIBUTION.md`).

## Corpus and counting rules

The corpus is `docs/srd/full/srd-5.2.1.txt`. A named feature is a `Level N: Feature Name` heading. A choice nested inside that heading remains part of the parent feature. The source text preserves two-column page extraction, so adjacent physical lines are not always natural reading order; the linked envelopes below are the checkable authority.

The twelve subclasses contain 58 named features. Each subclass has four to six. Every subclass begins at level 3, but later levels remain class-specific.

## Cadence baseline

| Class — SRD subclass | Schedule and number of named features | Total | Source envelope |
|---|---|---:|---|
| Barbarian — Path of the Berserker | 3×1, 6×1, 10×1, 14×1 | 4 | [lines 1872–1916](../../srd/full/srd-5.2.1.txt#L1872-L1916) |
| Bard — College of Lore | 3×2, 6×1, 14×1 | 4 | [lines 2166–2203](../../srd/full/srd-5.2.1.txt#L2166-L2203) |
| Cleric — Life Domain | 3×3, 6×1, 17×1 | 5 | [lines 2445–2494](../../srd/full/srd-5.2.1.txt#L2445-L2494) |
| Druid — Circle of the Land | 3×2, 6×1, 10×1, 14×1 | 5 | [lines 2789–2847](../../srd/full/srd-5.2.1.txt#L2789-L2847) |
| Fighter — Champion | 3×2, 7×1, 10×1, 15×1, 18×1 | 6 | [lines 2968–3016](../../srd/full/srd-5.2.1.txt#L2968-L3016) |
| Monk — Warrior of the Open Hand | 3×1, 6×1, 11×1, 17×1 | 4 | [lines 3130–3181](../../srd/full/srd-5.2.1.txt#L3130-L3181) |
| Paladin — Oath of Devotion | 3×2, 7×1, 15×1, 20×1 | 5 | [lines 3364–3451](../../srd/full/srd-5.2.1.txt#L3364-L3451) |
| Ranger — Hunter | 3×2, 7×1, 11×1, 15×1 | 5 | [lines 3649–3711](../../srd/full/srd-5.2.1.txt#L3649-L3711) |
| Rogue — Thief | 3×2, 9×1, 13×1, 17×1 | 5 | [lines 3827–3885](../../srd/full/srd-5.2.1.txt#L3827-L3885) |
| Sorcerer — Draconic Sorcery | 3×2, 6×1, 14×1, 18×1 | 5 | [lines 4167–4245](../../srd/full/srd-5.2.1.txt#L4167-L4245) |
| Warlock — Fiend Patron | 3×2, 6×1, 10×1, 14×1 | 5 | [lines 4565–4607](../../srd/full/srd-5.2.1.txt#L4565-L4607) |
| Wizard — Evoker | 3×2, 6×1, 10×1, 14×1 | 5 | [lines 4902–4958](../../srd/full/srd-5.2.1.txt#L4902-L4958) |

The first-level bundle is a real corpus pattern, not permission to overload entry. Nine subclasses grant two named features at level 3. Life Domain grants three, five of which across the corpus are spell-grant features. Path of the Berserker and Warrior of the Open Hand alone begin with one named feature. A common safe shape is one defining mechanic plus one compact support, spell, proficiency, or ribbon feature.

Only Barbarian, Bard, Druid, Warlock, and Wizard finish at 14. The other seven finish at 15, 17, 18, or 20. Design late features for the tier in which the host actually receives them.

## Action-economy footprint

Primary classification asks how the feature normally enters play, not whether its text contains any subordinate action.

| Primary shape | Features | Share | Design implication |
|---|---:|---:|---|
| Passive or grant | 23 | 39.7% | Much subclass value sits on the sheet or modifies an existing permission. |
| Free rider on an existing attack, cast, or roll | 21 | 36.2% | Attachment to the base loop is the dominant active shape; frequency limits remain essential. |
| Action | 3 | 5.2% | A full Action must create scene-scale value or replace an action the class already wants to take. |
| Bonus Action | 5 | 8.6% | Bonus Action space is used sparingly and must be checked against the parent turn. |
| Reaction | 3 | 5.2% | Reactions are uncommon and should have an obvious trigger to avoid off-turn delay. |
| Event-triggered | 3 | 5.2% | Initiative, dropping a target, or another event may trigger a feature without becoming a chosen action. Audit farmability and frequency. |

Passive plus free-rider features account for 44 of 58 features, about 76%. The baseline therefore favors strengthening an existing class action over adding a new action menu. This is structural evidence, not a command that every new subclass be passive: `03-fun-and-memorability.md` still requires a decision-bearing identity loop.

## Power-kind mix

Tags overlap; one feature may deal damage and provide defense or utility. Counts therefore need not sum to the feature total.

| SRD subclass | Damage | Defense | Healing | Utility | Control | Mobility |
|---|---:|---:|---:|---:|---:|---:|
| Path of the Berserker | 2 | 1 | 0 | 0 | 1 | 0 |
| College of Lore | 0 | 1 | 0 | 3 | 1 | 0 |
| Life Domain | 0 | 1 | 5 | 1 | 0 | 0 |
| Circle of the Land | 2 | 3 | 1 | 3 | 1 | 1 |
| Champion | 3 | 2 | 1 | 2 | 0 | 1 |
| Warrior of the Open Hand | 1 | 0 | 1 | 0 | 2 | 1 |
| Oath of Devotion | 3 | 4 | 1 | 3 | 1 | 1 |
| Hunter | 2 | 2 | 0 | 1 | 0 | 0 |
| Thief | 1 | 1 | 0 | 5 | 0 | 1 |
| Draconic Sorcery | 3 | 3 | 0 | 2 | 1 | 2 |
| Fiend Patron | 2 | 4 | 0 | 2 | 2 | 0 |
| Evoker | 4 | 1 | 0 | 1 | 0 | 0 |

The baseline permits sharp specialization, but most subclasses still touch more than one kind of power. Damage-only is not the default, even for attack-led classes. Utility-heavy subclasses still obtain combat relevance through defense, control, class spells, or the base chassis.

## Resource-costing shapes

### Reuse before invention

Fifty of 58 features have no self-contained uses-per-rest counter. Several are limited by the parent resource instead:

| Parent engine | SRD examples | Source |
|---|---|---|
| Bardic Inspiration | Cutting Words; Peerless Skill | [Lore](../../srd/full/srd-5.2.1.txt#L2166-L2203) |
| Channel Divinity | Preserve Life; Sacred Weapon | [Life](../../srd/full/srd-5.2.1.txt#L2445-L2494), [Devotion](../../srd/full/srd-5.2.1.txt#L3364-L3451) |
| Wild Shape | Land's Aid; Nature's Sanctuary | [Land](../../srd/full/srd-5.2.1.txt#L2789-L2847) |
| Focus Points and Flurry of Blows | Open Hand Technique; Quivering Palm | [Open Hand](../../srd/full/srd-5.2.1.txt#L3130-L3181) |
| Rage | Frenzy scaling and the late reload for Intimidating Presence | [Berserker](../../srd/full/srd-5.2.1.txt#L1872-L1916) |
| Sorcery Points | Dragon Wings reload | [Draconic](../../srd/full/srd-5.2.1.txt#L4167-L4245) |
| Pact Magic or spell slots | Fiend and Evoker high-level features; several healing or protection riders | [Fiend](../../srd/full/srd-5.2.1.txt#L4565-L4607), [Evoker](../../srd/full/srd-5.2.1.txt#L4902-L4958) |
| Hunter's Mark | Hunter's Lore, Hunter's Prey, and Superior Hunter's Prey depend on the base spell rather than a new pool. | [Hunter](../../srd/full/srd-5.2.1.txt#L3649-L3711) |

### Self-contained and reload patterns

- Six named features use fixed Long Rest limits: Intimidating Presence, Natural Recovery, Dragon Wings, Dragon Companion, Hurl Through Hell, and Holy Nimbus. Natural Recovery contains two distinct once-per-Long-Rest permissions.
- Wholeness of Body uses Wisdom-modifier uses per Long Rest; Dark One's Own Luck uses Charisma-modifier uses per Long Rest, each with a minimum of one.
- No SRD subclass feature uses Proficiency Bonus as its number of uses. Proficiency Bonus appears in effects and DCs, not as the local counter.
- Several late features start at once per Long Rest and can be restored with a costly native currency: Rage, Sorcery Points, a high-level spell slot, or a Pact Magic slot.
- Overchannel is the unusual soft limit: further use remains possible but imposes escalating unavoidable self-damage between Long Rests.

The reusable pattern is: introduce no second pool when the class already owns suitable currency; if a late showpiece needs another use, sell the reload for a meaningful amount of native currency.

## Spell-grant patterns

The spell-granting feature is acquired at level 3. The listed additions then arrive automatically at later class levels. The four fixed-list progressions converge on ten prepared spells.

| Feature | Additions by class level | Final access | Preparation shape | Source |
|---|---|---:|---|---|
| Life Domain Spells | 3:+4, 5:+2, 7:+2, 9:+2 | 10 | Fixed list, always prepared after grant. | [Life](../../srd/full/srd-5.2.1.txt#L2445-L2494) |
| Oath of Devotion Spells | 3:+2, 5:+2, 9:+2, 13:+2, 17:+2 | 10 | Fixed list, always prepared after grant. | [Devotion](../../srd/full/srd-5.2.1.txt#L3364-L3451) |
| Draconic Spells | 3:+4, 5:+2, 7:+2, 9:+2 | 10 | Fixed list, always prepared after grant. | [Draconic](../../srd/full/srd-5.2.1.txt#L4167-L4245) |
| Fiend Spells | 3:+4, 5:+2, 7:+2, 9:+2 | 10 | Fixed list, always prepared after grant. | [Fiend](../../srd/full/srd-5.2.1.txt#L4565-L4607) |
| Circle of the Land Spells | 3:+3, 5:+1, 7:+1, 9:+1 | 6 active; 24 entries in four menus | Choose one land after each Long Rest; that land's list is prepared. | [Land](../../srd/full/srd-5.2.1.txt#L2789-L2847) |
| Magical Discoveries | Bard 6:+2 from three class lists | 2 | Chosen, always prepared, replaceable on Bard level-up. | [Lore](../../srd/full/srd-5.2.1.txt#L2166-L2203) |
| Evocation Savant | Wizard 3:+2 of level 2 or lower; +1 at each new slot level | 9 by level 20 | Added to the spellbook, not automatically prepared. | [Evoker](../../srd/full/srd-5.2.1.txt#L4902-L4958) |

A fixed spell list is part of the subclass budget. Count breadth, automatic preparation, off-list access, and future automatic additions; do not treat the list as flavor text beside a full combat feature.

## Rules-text complexity

`Section words` includes the subclass title, framing text, headings, tables, and rules. `Rules words` includes feature rules and spell-table content but excludes headings and flavor. These are descriptive bounds, not writing targets.

| Rank | SRD subclass | Section words | Rules words | Named features | Mean per feature | Median |
|---:|---|---:|---:|---:|---:|---:|
| 1 | Circle of the Land | 630 | 552 | 5 | 110.4 | 103 |
| 2 | Oath of Devotion | 523 | 385 | 5 | 77.0 | 78 |
| 3 | Fiend Patron | 457 | 368 | 5 | 73.6 | 58 |
| 4 | Evoker | 408 | 339 | 5 | 67.8 | 71 |
| 5 | Hunter | 394 | 327 | 5 | 65.4 | 49 |
| 6 | Thief | 407 | 325 | 5 | 65.0 | 45 |
| 7 | Warrior of the Open Hand | 371 | 313 | 4 | 78.2 | 71.5 |
| 8 | Draconic Sorcery | 387 | 293 | 5 | 58.6 | 56 |
| 9 | Life Domain | 411 | 291 | 5 | 58.2 | 59 |
| 10 | Path of the Berserker | 307 | 243 | 4 | 60.8 | 48.5 |
| 11 | College of Lore | 321 | 228 | 4 | 57.0 | 66 |
| 12 | Champion | 287 | 199 | 6 | 33.2 | 25 |
|  | **Corpus** | — | **3,863** | **58** | **66.6** | **59.5** |

Circle of the Land is the density high point; Champion has the most named features and the fewest rules words. Parent-class audience matters more than matching the corpus mean. A new engine can justify text, but every later feature should not require re-reading that engine during a turn.

## Final-feature shapes

| Subclass | Final feature | Level | Structural payoff |
|---|---|---:|---|
| Path of the Berserker | Intimidating Presence | 14 | Limited Bonus Action control with a native-resource reload. |
| College of Lore | Peerless Skill | 14 | A free rider that repairs the user's failed ability or attack roll. |
| Life Domain | Supreme Healing | 17 | A simple magnitude upgrade to the established healing identity. |
| Circle of the Land | Nature's Sanctuary | 14 | Movable protective terrain fueled by Wild Shape. |
| Champion | Survivor | 18 | Passive durability and repeatable recovery. |
| Warrior of the Open Hand | Quivering Palm | 17 | A Focus-funded mark followed by a later attack trade for damage and control. |
| Oath of Devotion | Holy Nimbus | 20 | A limited transformed state combining damage, defense, and utility. |
| Hunter | Superior Hunter's Defense | 15 | A Reaction defense attached to the marked-target engine. |
| Thief | Thief's Reflexes | 17 | Initiative-triggered turn acceleration. |
| Draconic Sorcery | Dragon Companion | 18 | A spell-based companion with one slotless use. |
| Fiend Patron | Hurl Through Hell | 14 | A hit rider combining damage with temporary removal. |
| Evoker | Overchannel | 14 | Maximized spell damage with an escalating cost for repetition. |

The final slot normally culminates an existing identity with one legible effect: stronger healing, stronger durability, a transformed state, roll repair, a defensive reaction, or an upgraded rider. It rarely asks the player to learn a second resource system.

## Scaling attaches to the parent engine

The common scaling method is not a new subclass table. Frenzy inherits Rage Damage; Open Hand features spend Focus or ride Flurry of Blows; Hunter improves an existing marked-target engine; Life features follow slotted healing; several late reloads spend class currency; Champion widens an earlier critical range; Draconic Resilience accumulates with Sorcerer levels. This keeps growth native, makes the feature easier to remember, and reduces multiclass export value.

Use `01-power-budget.md` to decide how much the host needs, `03-fun-and-memorability.md` to make that structure enjoyable, and `05-design-checklist.md` to test a draft against these measured shapes.

---

This work includes material from the System Reference Document 5.2.1
("SRD 5.2.1") by Wizards of the Coast LLC, available at
https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
Commons Attribution 4.0 International License, available at
https://creativecommons.org/licenses/by/4.0/legalcode.
