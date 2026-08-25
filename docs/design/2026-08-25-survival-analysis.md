# D382 survival analysis — D365 through The Last Muster

## Result

The representative party completed **The Last Muster in 22/30 fixed-seed full
chains (73.3%)**, meeting the owner-set two-thirds target. The untreated chain
completed it in **0/30**. Adding the survival package without encounter detuning
was also **0/30**, so consumables and buffs alone did not conceal the structural
encounter problem.

The measured chain is rooms 1–4 of the D365 dungeon followed by The Cinder
Rite, The Iron Voice, and The Last Muster. The survival-package harness takes a
Short Rest after every victory except the final one; Hit Dice are finite and
persist across the chain. Success means defeating The Last Muster, not merely
reaching it. The fixed seeds are 20260801 through 20260830.

## Representative PCs

All four are level 5 Humans with the Alert origin feat. Base HP is shown before
Aid; prepared HP is the current and maximum HP on entering room 1. Aid raises
both values by 5 for 8 hours (`docs/srd/source/spell-descriptions.txt:53-65`).
Each PC carries two distinct, persisted Potion of Healing uses. Drinking one is
a Bonus Action and restores 2d4 + 2 HP
(`docs/srd/full/srd-5.2.1.txt:6022-6028`).

| PC | Full build | Abilities (Str/Dex/Con/Int/Wis/Cha) | AC | Base / prepared HP | Hit Dice | Key attacks, spells, slots, and items |
|---|---|---|---:|---:|---|---|
| Mirel Ash | Human Warlock 5, Fiend Patron, Sage, Alert | 8/14/13/10/12/17 | 12 | 38 / 43 | 5d8 | Eldritch Blast; Burning Hands, Command, Scorching Ray, Suggestion, Fireball, Stinking Cloud; two level-3 Pact slots (Short Rest); 2 Potions of Healing. |
| Orin Reed | Human Druid 5, Circle of the Land, Sage, Alert | 8/14/13/10/17/12 | 12 | 38 / 43 | 5d8 | Cure Wounds; shared slots 4/3/2 at levels 1/2/3; 2 Potions of Healing. |
| Brann Vale | Human Fighter 5, Champion, Soldier, Alert | 17/14/13/10/12/8 | 12 | 44 / 49 | 5d10 | Extra Attack (two attacks); melee weapon +7, 1d8 + 4 Slashing; 2 Potions of Healing. |
| Sera Dawn | Human Cleric 5, Life Domain, Acolyte, Alert | 10/12/14/8/17/13 | 11 | 38 / 43 | 5d8 | Bless, Cure Wounds, Aid, Lesser Restoration, Mass Healing Word, Revivify; shared slots 4/3/2 at levels 1/2/3; 2 Potions of Healing. |

The level-5 Cleric slot budget is 4 level-1, 3 level-2, and 2 level-3 slots
(`docs/srd/source/class-level-tables.txt:64-71`). Sera spends **two level-2
slots** before room 1: the first Aid targets three PCs and the second targets the
fourth. Aid permits no more than three targets per casting, so one casting
cannot cover this party (`docs/srd/source/spell-descriptions.txt:53-65`). The
remaining seven slots—four level-1, one level-2, and two level-3—fund one Bless
opening in each of the seven fights. This measurement assumes the same
adventuring chain consumes less than Aid's eight-hour duration; the simulator
does not invent elapsed wall-clock time between fights.

Bless targets exactly three creatures and adds 1d4 to their attacks and saves
while concentration lasts (`docs/srd/source/spell-descriptions.txt:824-840`).
The policy prioritizes Brann's two attacks, then two other living allies in
range. It never applies Bless to a fourth target. Damage invokes the existing
Constitution save; a failure ends the effect, as required by the concentration
rules (`docs/srd/full/srd-5.2.1.txt:11499-11524`). Across the final 30 chains,
203 Bless castings occurred in reachable fights and 22 concentration breaks
were observed.

The in-fight potion policy drinks only when the PC is alive and strictly below
**40%** of effective maximum HP. It does not drink at or above the threshold.
The sequential controller has no queued ally spell, so its “ally-cast healing
incoming” input is false; the separately tested policy refuses a potion when
that input is true. Potions are not used for between-fight top-ups. The final
sample consumed 102 potions (3.4 per campaign); every use decremented the real
persisted item count before applying healing.

## Final encounters and structural pressure

The ratio is maximum listed hostile ordinary-turn opportunities, plus listed
Legendary Action uses, divided by four PC ordinary turns. Legendary Actions
occur after another creature's turn and use a limited refresh pool
(`docs/srd/full/srd-5.2.1.txt:16703-16716`). Delayed and conditional creatures
count in their own fight even though they are not present in round 1.

| Fight | Final composition | Ratio | Hazards and mechanics retained |
|---|---|---:|---|
| Briar Gate Pack | 2 Goblin Warriors, 2 Wolves | 4/4 = 1.0x | Blocked center cell, Pack Tactics, distributed targets. Wolf Pack Tactics/Bite are at `docs/srd/full/srd-5.2.1.txt:24033-24059`; Goblin Warrior is at `docs/srd/full/srd-5.2.1.txt:18985-19018`. |
| Webbed Bear Den | Cave Bear, Ambush Weaver | 2/4 = 0.5x | Two blockers; Bear Hug/Grappled squeeze, Web/Restrained, venom, Spider Climb. These are original statblocks in `src/combat/statblocks/homebrew-beast-families.ts`, balanced against the SRD beast ladder beginning with Wolf/Black Bear/Brown Bear (`docs/srd/full/srd-5.2.1.txt:24033-24059`, `:22727-22748`, `:22811-22833`). |
| Ridgewing Gallery | Scout, Ridgewing Hunter, Storm Raptor | 3/4 = 0.75x | Two blockers; 150/600 Longbow, flight, Raking Pass charge, Talon Rake, Prone riders. Scout is at `docs/srd/full/srd-5.2.1.txt:21130-21164`; the flyers are original statblocks in `src/combat/statblocks/homebrew-beast-families.ts` using that file's cited SRD tier anchors. |
| Ironweb Crown | Ironweb Weaver | 1/4 = 0.25x | Two blockers; Web/Restrained, venom, Spider Climb. Original statblock in `src/combat/statblocks/homebrew-beast-families.ts`; its arachnid ladder uses the SRD Giant Scorpion anchor at `docs/srd/full/srd-5.2.1.txt:23287-23312`. |
| The Cinder Rite | Ashmaw, one Goblin Warrior drummer; round+1 one Goblin Minion; round+2 one Goblin Warrior | 4/4 = 1.0x | The typed once-only alarm and both delayed wave classes remain; war drum, brazier, oil cask, Web, Grease, rubble, dim light, smoke, and ember bed remain. Web's restraint/fire behavior is at `docs/srd/full/srd-5.2.1.txt:11128-11165`; Grease is at `:8631-8646`. |
| The Iron Voice | Marshal Kett alone, with one Legendary Action use | (1+1)/4 = 0.5x | Warlord aura, one between-turn Shielding Order, Legendary Resistance, and all terrain/object classes remain. Legendary timing is at `docs/srd/full/srd-5.2.1.txt:16703-16716`; the original leader is in `src/combat/statblocks/vane-warren.ts`, anchored to Hobgoblin Captain and the Unicorn exemplar (`docs/srd/full/srd-5.2.1.txt:19576-19611`, `:21966-22009`). |
| The Last Muster | Commander Sablehook; one Bloodied-trigger Goblin Warrior reserve | 2/4 = 0.5x | The typed leader-Bloodied deployment and all terrain/object classes remain. Hobgoblin Captain is at `docs/srd/full/srd-5.2.1.txt:19576-19611`; Goblin Warrior is at `:18985-19018`. |

The Vane maps intentionally enable flammable Grease even though the SRD Grease
spell itself is nonflammable; this disclosed original encounter rule and its
Web-derived 2d4 Fire burn are detailed in
`docs/design/vane-warren-difficulty.md`. All maps remain flat—there are no
elevation or falling substitutions.

## NPC statblocks actually used

Damage below is per landed attack before resistance/vulnerability. A
multiattack multiplier is stated explicitly. Control actions without attack
damage are included because they consume the creature's action.

| Statblock (encounters) | AC / HP | Attacks and damage math |
|---|---:|---|
| Goblin Warrior (Briar, Cinder waves/reserve) | 15 / 10 | Scimitar or Shortbow +4: 1d6+2 (avg 5), plus 1d4 (avg 2) only with attack-roll Advantage. SRD `docs/srd/full/srd-5.2.1.txt:18985-19018`. |
| Goblin Minion (Cinder first beat) | 12 / 7 | Dagger +4: 1d4+2 Piercing (avg 4). SRD `docs/srd/full/srd-5.2.1.txt:18957-18983`. |
| Wolf (Briar) | 12 / 11 | Bite +4: 1d6+2 Piercing (avg 5), with its listed Prone rider; Pack Tactics. SRD `docs/srd/full/srd-5.2.1.txt:24033-24059`. |
| Scout (Ridgewing) | 13 / 16 | Two attacks: Shortsword +4 for 1d6+2 (avg 5) or Longbow +4 for 1d8+2 (avg 6); maximum two-hit average 12. SRD `docs/srd/full/srd-5.2.1.txt:21130-21164`. |
| Hobgoblin Captain / Commander Sablehook (Last Muster) | 17 / 58 | Two attacks: Greatsword +4 for 2d6+2 Slashing +1d6 Poison (avg 12) or Longbow +4 for 1d8+2 Piercing +2d4 Poison (avg 11); maximum two-hit average 24. SRD `docs/srd/full/srd-5.2.1.txt:19576-19611`. |
| Cave Bear (Webbed Bear Den) | 12 / 23 | Bear Hug +4: 1d6+4 Bludgeoning (avg 7), Grappled (escape DC 12), then 1d6 ongoing squeeze (avg 3) at the target's turn start. Original statblock: `src/combat/statblocks/homebrew-beast-families.ts`; SRD bear comparables `docs/srd/full/srd-5.2.1.txt:22727-22833`. |
| Ambush Weaver (Webbed Bear Den) | 13 / 16 | Venom Bite +4: 2d6+1 Piercing +1d6−1 Poison (avg 10 total); DC 12 Constitution Poisoned rider. Web is a DC 12 Dexterity save or Restrained (escape DC 12). Original statblock: `src/combat/statblocks/homebrew-beast-families.ts`; SRD arachnid comparable ladder cited there. |
| Ridgewing Hunter (Ridgewing) | 12 / 22 | Raking Pass +5: 2d6+3 Piercing (avg 10), plus 1d6+1 Slashing (avg 4) and DC 13 Strength Prone after a 20-foot straight charge; charged total avg 14. Original statblock: `src/combat/statblocks/homebrew-beast-families.ts`; SRD tier anchors cited there. |
| Storm Raptor (Ridgewing) | 12 / 21 | Talon Rake +5: 3d6+4 Slashing (avg 14), DC 13 Strength or Prone. Original statblock: `src/combat/statblocks/homebrew-beast-families.ts`; SRD tier anchors cited there. |
| Ironweb Weaver (Ironweb Crown) | 14 / 38 | Venom Bite +6: 3d6+5 Piercing +1d6+1 Poison (avg 19 total), DC 14 Constitution Poisoned rider. Web is DC 14 Dexterity or Restrained (escape DC 14). Original statblock: `src/combat/statblocks/homebrew-beast-families.ts`; SRD Giant Scorpion anchor `docs/srd/full/srd-5.2.1.txt:23287-23312`. |
| Ashmaw, Cinder Votary (Cinder) | 15 / 82 | Two Cinder Mauls +5, each 2d6+3 Bludgeoning (avg 10; two-hit avg 20); alternatively Command (DC 13) or Hold Person (DC 13); bonus-action Healing Word. Original statblock: `src/combat/statblocks/vane-warren.ts`; SRD comparables Bugbear Warrior/Priest at `docs/srd/full/srd-5.2.1.txt:17728-17761`, `:20704-20766`; spell rules at `:7105-7123`, `:8874-8893`, `:8757-8768`. |
| Marshal Kett, the Iron Voice (Iron) | 17 / 58 | One Iron Greatsword +6 for 2d6+3 Slashing +1d6 Poison (avg 13), or Longbow +5 for 1d8+3 Piercing +2d4 Poison (avg 12); one Shielding Order Legendary Action and one Legendary Resistance/day. Original statblock: `src/combat/statblocks/vane-warren.ts`; SRD Hobgoblin Captain/Unicorn anchors at `docs/srd/full/srd-5.2.1.txt:19576-19611`, `:21966-22009`. |

## Diagnosis: where the untreated PCs died

The read-only live rehearsal reports in the sibling worktree repeatedly show
the same transition failure: after a room victory the automation could not
complete **“Take Short Rest and enter next room”** because the button detached
or became unstable. Runs 10, 15, and 16 are representative. Run 23 won room 1
and then lost room 2. Therefore live rehearsals did not receive their scheduled
recovery and compounded attrition. The original headless baseline deliberately
applied no Short Rests to reproduce that observed chain state.

Across 30 untreated fixed seeds, rooms 1–2 were stable, room 3 began the drop
spiral, and room 4 was the hard wall:

| Untreated fight | Wins / attempts | Aggregate party HP entering → leaving (mean) | Incoming / outgoing damage (mean) | In-combat healing / Short Rest (mean) | Realized PC / enemy turns (mean) | PC drops |
|---|---:|---:|---:|---:|---:|---:|
| Briar Gate Pack | 30/30 | 158.00 → 150.27 | 30.93 / 56.13 | 23.20 / 0 | 9.07 / 5.63 | 0 |
| Webbed Bear Den | 30/30 | 150.27 → 140.93 | 23.17 / 46.97 | 13.83 / 0 | 7.00 / 2.43 | 0 |
| Ridgewing Gallery | 30/30 | 140.93 → 102.23 | 107.97 / 91.87 | 55.13 / 0 | 12.57 / 8.53 | 23 |
| Ironweb Crown (original roster) | 1/30 | 102.23 → 3.90 | 346.67 / 48.50 | 38.80 / 0 | 8.97 / 11.77 | 107 |
| The Cinder Rite | 0/1 reached | 117.00 → 0 | 217.00 / 66.00 | 0 / 0 | — | party wipe |

Mean gross incoming damage for the untreated campaign was 515.97 against
245.67 outgoing and 130.97 in-combat healing, leaving a **385.00-point gross
healing gap** with zero Hit-Die recovery. The problem was not only low healing:
the original room 4 roster survived long enough to take more enemy turns than
the PCs (11.77 vs 8.97) while dealing 346.67 mean incoming damage. It stopped
29/30 runs there; the only survivor entered Cinder already depleted and wiped.

## Changes and detune sequence

1. Added two real Potion of Healing uses to each PC and the strict below-40%
   emergency policy. The reducer spends the Bonus Action, decrements the item,
   rolls 2d4+2, then heals.
2. Added two pre-chain level-2 Aid castings through party-session state, covering
   all four PCs once and consuming two slots. Added one honest three-target
   Bless opening per reachable fight; existing concentration saves can and do
   end it.
3. Measured the package against the original encounters: **0/30** still
   completed The Last Muster.
4. Trimmed adds while retaining encounter classes: removed one room-3 Scout;
   replaced room 4's Dreadweb Weaver + 2 Bugbear Stalkers with one Ironweb
   Weaver; reduced Cinder from Ashmaw + Bugbear + 4 guards + two four-add waves
   to Ashmaw + drummer + two one-add waves; removed Iron's four retainers and
   reduced Marshal Kett from 88 to 58 HP, two attacks to one, and three
   Legendary Action uses to one; reduced Last Muster from commander + 3
   standing guards + 2 Bugbear reserves to commander + one Goblin Warrior
   Bloodied reserve. An intermediate detune measured **17/30**; the final leader
   and add tuning measured **22/30**.

No alarm, delayed-wave, Legendary Action/Resistance, Bloodied-reserve,
persistent-area, or hazard class was removed. The final honest ratios are
recorded in `docs/design/d365-dungeon-difficulty.md` and
`docs/design/vane-warren-difficulty.md`.

## Final fixed-seed evidence

| Final fight | Wins / attempts | Aggregate party HP entering → leaving (mean) | Incoming / outgoing damage (mean) | In-combat healing / Short Rest (mean) | Realized PC / enemy turns (mean) | Potions / Bless / concentration breaks | PC drops |
|---|---:|---:|---:|---:|---:|---:|---:|
| Briar Gate Pack | 30/30 | 178.00 → 156.53 | 29.00 / 57.43 | 7.53 / 26.43 | 8.50 / 5.23 | 4 / 30 / 3 | 0 |
| Webbed Bear Den | 30/30 | 176.70 → 159.83 | 21.77 / 46.67 | 4.90 / 21.53 | 5.90 / 2.40 | 1 / 29 / 1 | 0 |
| Ridgewing Gallery | 30/30 | 175.80 → 139.57 | 54.50 / 70.53 | 14.10 / 26.33 | 8.80 / 4.30 | 12 / 30 / 6 | 5 |
| Ironweb Crown | 30/30 | 161.17 → 144.70 | 29.70 / 42.47 | 12.90 / 14.33 | 5.53 / 1.57 | 10 / 28 / 1 | 1 |
| The Cinder Rite | 30/30 | 156.63 → 130.33 | 80.33 / 100.00 | 44.53 / 10.33 | 15.63 / 5.93 | 20 / 30 / 0 | 10 |
| The Iron Voice | 26/30 | 139.20 → 103.87 | 91.30 / 56.00 | 41.83 / 11.43 | 13.93 / 4.77 | 31 / 30 / 3 | 16 |
| The Last Muster | 22/26 | 130.65 → 94.50 | 92.23 / 69.27 | 34.77 / 0 | 14.08 / 6.27 | 24 / 26 / 8 | 21 |

Twenty-six campaigns reached The Last Muster and 22 won it. The four earlier
failures stopped at The Iron Voice; four more lost The Last Muster. Across all
30 campaigns the final package recorded 11,596 incoming damage, 12,994 outgoing
damage, 4,678 in-combat healing, and 3,312 Short-Rest healing. Per starting
campaign, that is 386.53 incoming, 433.13 outgoing, 155.93 in-combat healing,
and 110.40 Short-Rest healing. The gross healing gap fell from 385.00 to
**120.20**, while Aid raised room-1 aggregate entry HP from 158 to 178.

The deterministic harness is `src/vtt/survival-harness.ts`, its CLI is
`tools/rehearsal/survival-headless.ts`, and the pinned acceptance is in
`tests/integration/vtt/survival-policy.test.ts`.
