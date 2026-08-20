# Sweep 7 — late-campaign player findings

Date: 2026-08-13  
Persona: a long-campaign player maintaining a level-15+ multiclass character with upgraded homebrew  
Scope: discovery only; no production changes

## Method and character history

I exercised the real Chromium app on `PLAYWRIGHT_PORT=5110`, through the
production UI and writers. I started from an empty browser profile, imported a
library containing Veteran revision 2, and built **Sable Voss** as a Rogue with
Strength 8, Dexterity 12, Constitution 15, Intelligence 14, Wisdom 13, and
Charisma 10. I then enabled `Waive multiclass ability prerequisites` and added
Fighter while both real requirements were unmet: Rogue required Dexterity 13
but had 12, and Fighter required Strength or Dexterity 13 but had 8/12. The
planner showed both exact shortfalls.

The played timeline was:

1. Rogue 13 / Fighter 2 (total level 15), using Veteran revision 2.
2. Import the newer three-revision lineage and use the real replacement review
   to apply Veteran revision 3. The review previewed Sneak Attack changing from
   `UNKNOWN` to `13d6` and Veteran Reflexes from `UNKNOWN` to `5 uses`; the
   result said `1 character(s) now use the new version; 0 kept`.
3. Rogue 15 / Fighter 2 (total level 17), still on Veteran revision 3.
4. Rogue 17 / Fighter 3 (total level 20), adding Spell Student revision 2 and
   selecting Fire Bolt and Shield through the high-level wizard.
5. Reload, character-backup export/import, and share-link import into separate
   empty browser contexts. All checks after import used the resulting production
   character, not fixture SQL or direct database writes.

The source library and character backup were downloaded through the production
export controls. Temporary driver files lived under `/tmp`; the only worktree
write is this report.

## Rules audit at the requested milestones

| Milestone | Sheet result | Rules-derived result | Verdict |
|---|---:|---:|---|
| Level 15, Rogue 13 / Fighter 2 proficiency | `+5` | `+5` from total level 15 | correct |
| Level 15 hit points | `140` (`125` class + `15` Dwarf) | `140` | correct |
| Level 15 Sneak Attack after v3 | `7d6 + 6d6` | `13d6`, based on Rogue 13, not total 15 | correct |
| Level 15 Veteran Reflexes | `5` | PB-sized pool, `5` | correct |
| Level 15 initiative | `+5` | Dex `+5` plus Alert PB `+5` = `+10` | **wrong** |
| Level 17, Rogue 15 / Fighter 2 proficiency | `+6` | `+6` from total level 17 | correct |
| Level 17 hit points | `158` (`141` class + `17` Dwarf) | `158` | correct |
| Level 17 Sneak Attack | `8d6 + 7d6` | `15d6`, based on Rogue 15 | correct |
| Level 17 Veteran Reflexes | `6` | PB-sized pool, `6` | correct |
| Level 17 initiative | `+5` | Dex `+5` plus Alert PB `+6` = `+11` | **wrong** |
| Level 20, Rogue 17 / Fighter 3 proficiency | `+6` | `+6` from total level 20 | correct |
| Level 20 hit points | `206` (`186` class + `20` Dwarf) | `206`, including retroactive Constitution `+4` per level | correct |
| Level 20 Sneak Attack | `9d6 + 8d6` | `17d6`, based on Rogue 17 | correct |
| Level 20 Veteran Reflexes | `6` | PB-sized pool, `6` | correct |
| Level 20 third-caster slots | `Level 1 spell slots 2` | floor(Fighter 3 / 3) = caster 1, hence two level-1 slots | correct |
| Level 20 initiative | `+5` | Dex `+5` plus Alert PB `+6` = `+11` | **wrong** |

The Rogue table is the source for 7d6 at Rogue 13, 8d6 at Rogue 15, and 9d6
at Rogue 17 (`docs/srd/source/class-level-tables.txt:217-241`). The base
contribution explicitly reads the Rogue class level and uses `ceil(level / 2)`
(`src/rules/class-progression-lookup.ts:175-198`). Veteran revision 3 adds the
amount needed to reach Rogue level and supersedes its older extra die
(`src/authoring/bundled-homebrew-catalog.ts:288-297`). Third-caster contribution
uses `floor(classLevel / 3)` (`src/rules/progression-type.ts:13-40`) and the
shared slot table (`src/rules/spell-slots.ts:71-99`), matching D223
(`.claude/decisions.md:155-170`).

The hit-point audit used the printed level-1 and fixed-value tables: Rogue starts
at 8 + Constitution, later Rogue levels add 5 + Constitution, and Fighter levels
add 6 + Constitution (`docs/srd/source/sheet-math.txt:28-42`, `:86-114`). No hit
point rolls were recorded. Dwarven Toughness adds one per total level
(`docs/srd/source/species-descriptions.txt:52-62`). At level 20, Constitution 18
therefore gives `(8 + 4) + 16 × (5 + 4) + 3 × (6 + 4) = 186` class hit points,
plus 20 Dwarf hit points. This code intentionally reads Constitution live for
every level (`src/rules/sheet.ts:768-805`) and keeps the species term separate
(`src/queries/character-sheet-builder.ts:1025-1057`).

## Findings

### S7-01 — Alert is present on the sheet but omitted from initiative at every high-level milestone

- **What the persona did:** Took Alert, then checked initiative at levels 15,
  17, and 20 as proficiency moved from +5 to +6.
- **What happened:** Every sheet named `Feat — Alert` but printed only
  `Initiative +5` and explained `The Dexterity modifier (sheet-math.txt).` The
  correct values were +10 at level 15 and +11 at levels 17 and 20. Alert says,
  `When you roll Initiative, you can add your Proficiency Bonus to the roll`
  (`docs/srd/source/feats.txt:28-35`). The feat coverage deliberately classifies
  this as `initiative_proficiency_unmodelled` and marks initiative undetermined
  (`src/rules/feat-application.ts:145-156`), but the sheet ignores that state and
  unconditionally calls the Dexterity-only function
  (`src/queries/character-sheet-builder.ts:1084-1089`,
  `src/rules/sheet.ts:1148-1157`). This also violates the binding rule that every
  initiative-changing source is modeled (`.claude/decisions.md:1744-1749`).
- **Severity:** major
- **Proposed fix direction:** Give initiative the same typed, sourced additive
  contribution model as other derived values. Alert should contribute PB and
  name Alert beside the result. Until that is implemented, the face of the
  sheet must say `UNKNOWN`, not print a confidently incomplete value.

### S7-02 — Finesse weapon rows default to Strength and present the wrong live attack numbers

- **What the persona did:** Opened the level-20 planner's production weapon
  rows for the carried Daggers, Shortsword, and Shortbow.
- **What happened:** Each Finesse melee weapon opened on Strength: Dagger showed
  `To hit: +5 (Strength) · Damage: 1d4 -1 Piercing`, and Shortsword showed
  `To hit: +5 (Strength) · Damage: 1d6 -1 Piercing`. The adjacent selector
  offered the actually useful Dexterity `+11`; with Dexterity 20 the correct
  damage modifiers are +5. Shortbow correctly opened at `+11` and `1d6 +5`.
  The app already stores `finesse: 1`, but `AttackProfileWeapon` does not carry
  that fact (`src/rules/attack-profiles.ts:257-276`). It orders every recorded
  melee weapon Strength-first and explicitly says it does not evaluate weapon
  properties (`src/rules/attack-profiles.ts:433-499`); the renderer then treats
  the first option as the selected live number (`src/ui/screens/planner/attack-profiles.ts:251-279`).
  The disclosure does not cure the wrong default: D33 explicitly says a
  disclosed wrong number is still wrong (`.claude/decisions.md:2034-2039`).
- **Severity:** major
- **Proposed fix direction:** Carry mechanically known properties into the
  attack-profile input. For Finesse, either select the better of Strength or
  Dexterity by default while retaining the table choice, or make the row
  unresolved until the player chooses; never lead with a knowingly inferior
  number as though it were the attack profile.

### S7-03 — The dice calculator hard-codes a 5% critical chance despite the active 18–20 range

- **What the persona did:** Reached Rogue 17 with Veteran revision 3, opened
  the at-the-table dice calculator, and read its live metrics.
- **What happened:** The sheet listed both `Critical Instincts` and its level-17
  successor `Heightened Lethality`, whose rules say 18–20 and explicitly replace
  the 19–20 feature (`src/authoring/bundled-homebrew-catalog.ts:290-298`). The
  calculator nevertheless showed `Critical chance 5.0%`; it only recognizes a
  natural 20 as critical (`src/ui/screens/planner/dice.ts:233-249`) and exposes
  no critical-threshold input in the controls (`src/ui/screens/planner/dice.ts:918-1007`).
  For a normal d20 roll the character's weapon critical chance is 15%, so hit
  partitioning and expected damage are also wrong.
- **Severity:** major
- **Proposed fix direction:** Model critical threshold as a sourced character
  fact with replacement/supersession semantics, feed it into every attack and
  expected-damage calculation, and show the active source. A manual threshold
  is a useful fallback for unstructured homebrew, but this bundled v3 feature
  should arrive structurally.

### S7-04 — The high-level Expertise step allows a duplicate choice and fails only in Review with internal jargon

- **What the persona did:** At Rogue 6, selected the same eligible skill in both
  new Expertise selectors and continued to Review.
- **What happened:** Both selectors offered the same pool and allowed the same
  skill. Review then rolled back with the exact error:
  `Planned subchoice refused — subchoice_kind: expertise; index: 1; issue:
  skill_already_has_expertise; locator: source=selected_class,
  rule_key=class_expertise_6, ordinal=2.` The page followed with `No character
  data was changed. You can retry this rollback preview.` and `Retry preview`.
  The renderer builds each select independently from its original
  `available_skills` (`src/ui/screens/level-up/planned-choice-steps.ts:145-217`,
  `:256-289`); the production writer correctly refuses the duplicate
  (`src/grants/skill-expertise-grants.ts:409-433`), but the UI formats that
  domain refusal as a raw locator dump (`src/ui/screens/level-up/level-up-wizard.ts:129-147`).
- **Severity:** major
- **Proposed fix direction:** Recompute sibling eligibility as selections
  change, removing or disabling a skill already chosen in another ordinal.
  Also translate any last-line refusal into player language, focus the bad
  selector, and provide a direct Back/Fix action rather than a retry that will
  deterministically fail with the unchanged draft.

### S7-05 — A current upgraded backup imports intact while falsely claiming its values will be UNKNOWN

- **What the persona did:** Exported the fully upgraded level-20 character,
  imported that character JSON into an empty profile, and opened the restored
  sheet.
- **What happened:** Import announced: `Character imported as #1. UNKNOWN
  values: Sneak Attack, Veteran Reflexes. This backup predates structured
  contributions; review the named successor before upgrading.` That statement
  is false. The restored sheet immediately showed Veteran revision 3,
  `Sneak Attack 9d6 + 8d6`, and `Veteran Reflexes 6`; reload retained them. The
  v7 backup contains the revision-3 typed contributions and full supersession
  history. The importer gathers every referenced subclass key, including
  historical revision 2, and emits the old-content warning for any matching
  portable entry (`src/backup/character-backup.ts:3980-4005`) without checking
  which subclass is active. The UI repeats that notice verbatim
  (`src/ui/screens/character-list/import-backup-controls.ts:162-170`).
- **Severity:** major
- **Proposed fix direction:** Evaluate historical gaps only for active
  character references after reference resolution. A carried predecessor kept
  solely to preserve lineage must not poison the active successor's import
  result. Add a round-trip assertion where v2 is in closure, v3 is active, and
  no UNKNOWN notice is returned.

### S7-06 — The level-up wizard sends a Weapon Mastery problem to a spell-catalog remedy

- **What the persona did:** Added Fighter through the multiclass planner and
  opened the next level-up wizard with the resulting incomplete Fighter
  choices.
- **What happened:** The wizard correctly named `Fighter — Weapon Mastery
  requirement unavailable` and explained `The installed rules data cannot
  determine how many Weapon Mastery choices this Fighter receives.` Its only
  remedy was the unrelated link `Import a catalog with eligible spells`.
  Completeness marks this item with the generic `import_catalog` action
  (`src/queries/character-completeness.ts:976-987`), and the wizard maps every
  such action to the spell copy (`src/ui/screens/level-up/warning-remedy.ts:5-16`).
  The planner's separate outstanding panel already has the correct wording,
  `Import or repair Fighter Weapon Mastery rules data`
  (`src/ui/screens/planner/completeness.ts:122-131`).
- **Severity:** minor
- **Proposed fix direction:** Use a typed remedy kind or item-specific label,
  and share the correct planner remedy component with the wizard.

### S7-07 — Replacement-library review describes matched versions as both present and newly added

- **What the persona did:** Imported the newer library after Veteran revision 2
  was already installed and read the mandatory pre-commit review.
- **What happened:** The summary said `subclass: 6 new, 2 matched`, while the
  Veteran line said `Veteran (Bundled revision 3) — subclass; 3 versions —
  already in this library; will be added`. Those clauses refer to different
  versions in the lineage, but the UI attaches both to the lineage as a whole,
  making it sound self-contradictory. The renderer unions per-version outcome
  labels and joins them with semicolons (`src/ui/screens/character-list/import-backup-controls.ts:40-67`);
  an existing unit test explicitly pins the contradictory sentence
  (`tests/unit/ui/character-list.test.ts:1207-1214`).
- **Severity:** minor
- **Proposed fix direction:** Say `3 versions: 2 already present, 1 will be
  added` and put the outcome beside each version inside Version history.

### S7-08 — The Homebrew card renders the same replacement action twice

- **What the persona did:** Opened the Veteran card's History after importing
  revision 3, before applying the character replacement.
- **What happened:** The card contained two identical links labeled `Review
  next version for 1 character`, both leading to the same replacement review.
  One is emitted beside the superseded version in History
  (`src/ui/screens/homebrew/homebrew-library.ts:374-395`); a second is generated
  from the same available-update edge in the summary
  (`src/ui/screens/homebrew/homebrew-library.ts:398-420`).
- **Severity:** polish
- **Proposed fix direction:** Keep one primary update action in the card
  summary. In History, render the relationship as non-action text or point to
  the one primary control without duplicating it.

## Verified non-findings

- **The waiver was genuine, visible, and durable.** Before the first ASI the
  app named both unmet requirements (Rogue Dexterity 12; Fighter Strength 8 /
  Dexterity 12). The sheet at levels 15, 17, and 20 said `Multiclass ability
  prerequisites are waived for this character.` Both backup import and a share
  into a fresh profile retained that disclosure, matching D147
  (`.claude/decisions.md:1160-1172`).
- **Replacement was explicit and preserved active mechanics.** The v2 sheet
  honestly showed Sneak Attack and Veteran Reflexes as `UNKNOWN`; the review
  previewed both v3 values before Apply. The active v3 reference and computed
  values survived reload, character backup, and fresh-profile share. The share
  recipient's Subclasses library showed `History — 3 versions`, so the lineage
  edge survived as well, matching D219 (`.claude/decisions.md:289-301`).
- **Sneak Attack used Rogue level, never total level.** The post-upgrade values
  were 13d6 at Rogue 13 / total 15, 15d6 at Rogue 15 / total 17, and 17d6 at
  Rogue 17 / total 20. Applied and superseded terms were separately visible.
- **High-PB resources scaled correctly.** Veteran Reflexes was 5 at total 15
  and 6 at totals 17 and 20. Second Wind remained 2 at Fighter 2/3 and Action
  Surge remained 1. The Fighter table's `Second Wind` column prints 2 at class
  levels 1–3, and its level-2 feature row says `Action Surge (one use)`
  (`docs/srd/source/class-level-tables.txt:114-135`).
- **Third-caster slots and spell numbers were correct.** Fighter 3 / Spell
  Student contributed effective caster level 1, producing two level-1 slots.
  Fire Bolt and Shield survived both transfer paths. Spell save DC 17 and spell
  attack +9 correctly used Intelligence +3 and PB +6.
- **Other core numbers stayed coherent.** AC was 16 from Leather Armor 11 plus
  Dexterity 5. Passive Perception was 21 at PB +5 and 23 at PB +6 with
  Perception Expertise. Starting-class saves remained Rogue's Dexterity and
  Intelligence saves; the Fighter multiclass entry did not incorrectly grant
  its saves. Hit points and Dwarven Toughness matched at all three milestones.
- **Weapon inventory and proficiency survived.** All six package-generated
  weapon rows survived backup and share: four Daggers, one Shortsword, and one
  Shortbow. Simple/martial proficiency was correct. The Finesse default-number
  defect is S7-02, not a persistence or proficiency loss.
- **The high-level wizard completed every level.** The one-level-at-a-time flow
  handled ASIs, Rogue Expertise, subclass feature levels, Fighter subclass
  selection, and Spell Student spell choices without losing a committed level.
  The duplicate-Expertise dead end in S7-04 rolled back atomically; selecting
  distinct skills then completed normally.
- **The planner still gave useful high-level facts.** At level 20 it reported
  caster level 1, PB +6, two unique spells, two access routes, two level-1
  slots, and per-class preparation ceilings. Its separate outstanding panel
  correctly retained the two Fighter choices and gave the correct Weapon
  Mastery repair wording. Combat advice remains materially wrong where covered
  by S7-02 and S7-03.
- **No egregious deep-character performance regression appeared.** Individual
  level-up commits, including choice-bearing levels, took approximately
  2.2–3.8 seconds in headless Chromium. A restored level-20 sheet reload took
  about 2.6 seconds. The sheet and planner stayed interactive; there were no
  freezes, timeouts, or progressive slowdowns across levels 15–20. This is a
  smell-level observation only, not profiling.
- **The transfer payload size was workable.** The self-contained share URL was
  about 6.95 KB and warned that it was too long for a reliable QR code, but it
  imported successfully in a fresh profile. The complete character backup also
  restored without content installation prerequisites. S7-05 concerns only the
  false import announcement.

## Severity totals

- BLOCKER: 0
- major: 5
- minor: 2
- polish: 1
- **Total: 8**
