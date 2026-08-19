# D303 final stranger journey — Sorcerer 1 → Sorcerer 3 / Warlock 2

**Run completed:** 2026-08-19  
**Target:** the already-running production preview at `http://localhost:4173/`  
**Viewports:** Chromium 1280×1200; emulated iPhone 13 at 390×844 with touch  
**Severity:** D294 — MAJOR means a dead end, wrong number, or an unknown the
app does not identify as unknown. Everything else is minor.

No server was rebuilt or restarted. The final evidence runs were
`/tmp/claude-1000/d303/desktop-final.mjs` and
`/tmp/claude-1000/d303/mobile-final.mjs`, each in a new browser context with
empty IndexedDB. Screenshots are under `/tmp/claude-1000/d303/shots/`.

The D286 review was read first and its findings were used as the duplicate
baseline. This report does not re-count those findings unless the new
multiclass path exposed a worse form.

## Persona

Mira Vey knows 5e-2014 well but has never seen this app or the 2024 rules. She
wants the app's namesake use case: begin as a Sorcerer, add Warlock, and reach
total level 5 while keeping Spellcasting and Pact Magic intelligible.

Final build:

- Orc; Acolyte; Sorcerer 3 / Warlock 2; Draconic Sorcery.
- Standard array: STR 8, DEX 14, CON 13, INT 10, WIS 12, CHA 15.
- Acolyte increases: +1 WIS and +2 CHA, producing WIS 13 and CHA 17.
- Magic Initiate (Cleric) uses Charisma.
- Sorcerer skills Arcana and Deception; the Acolyte already grants Insight and
  Religion.

## Pass 1 — desktop (1280×1200)

### Steps walked

1. Opened a cold profile with no character and read only the cold-open page.
2. Opened the empty Homebrew library, returned to Characters, and opened the
   bundled-homebrew adoption preview.
3. Confirmed that the preview named exactly Veteran, Warrior of the Barbed
   Court, and Spell Student. It reported 12 subclass records internally but
   exposed only those three listed entries.
4. Imported the bundle, browsed the Subclasses library, and saw exactly Spell
   Student (revision 2), Veteran (revision 3), and Warrior of the Barbed Court
   (revision 5).
5. Searched the adoption preview, library browse, guided class list, and every
   level-up/subclass surface visited for all v3 `ui_hidden` card names: Long
   Grudge, Anchor Point, Patient Volley, Cutting Chorus, Ambush Primitive,
   Vanward, Cold Open, Broken Tooth, Cutting Momentum, and Broken Tempo. None
   appeared.
6. Began the guided builder as Sorcerer and named the character Mira Vey.
7. Assigned the standard array, chose Orc, and applied Acolyte with +2 CHA,
   +1 WIS, and Charisma-based Magic Initiate (Cleric).
8. Deliberately selected Arcana in both Sorcerer skill selectors. Confirming
   the first removed Arcana from the second selector and left
   `deception/intimidation/persuasion`; selected Deception to recover.
9. Filled all nine level-1 spell choices: four Sorcerer cantrips, two Sorcerer
   prepared spells, two Magic Initiate cantrips, and its level-1 spell.
10. Confirmed both Sorcerer and Acolyte equipment packages. The guided builder
    ended with nothing outstanding.
11. Opened the planner. With CHA 17, Warlock was selectable. The same surface
    disabled and explained Barbarian (STR 8), Paladin (STR 8/CHA 17), and
    Wizard (INT 10), proving the prerequisite gate was live.
12. Added Warlock. The planner immediately showed shared slots `L1: 2` and a
    separate `Pact Magic: 1 × level 1`, plus four explicit unfinished Warlock
    spell choices.
13. Followed the card's `Resume build` route and filled the Warlock cantrips
    and prepared spells; returned to a level-2 Sorcerer 1 / Warlock 1 card with
    zero warnings and nothing outstanding.
14. Began Sorcerer 1→2. On the Gains step the wizard showed `+5` HP and
    projected HP 18. Reloaded the nested route mid-flow.
15. Reload booted normally and returned to the held-class choice. Re-selected
    Sorcerer, completed Magic Missile and Sleep, and confirmed Sorcerer 2.
16. Leveled Sorcerer 2→3, chose Draconic Sorcery rather than `Decide later`,
    chose Misty Step and Scorching Ray, and confirmed the subclass.
17. Leveled Warlock 1→2, chose Unseen Servant, and confirmed total level 5.
18. Reopened the planner. It showed caster level 3, PB +3, shared slots 4/2,
    separate Pact Magic 2×level 1, Sorcerer max spell level 2, Warlock max
    spell level 1, and zero class/duplicate warnings.
19. Expanded the final character sheet and independently checked its numbers.
20. Downloaded a complete character JSON backup.
21. Opened a second fresh desktop browser context, confirmed it had no
    characters, imported that backup, and expanded the imported sheet.
22. Compared both rendered sheet texts in memory: exact match, 35,271
    characters on each side. No console or page errors occurred in either
    desktop profile.

Key screenshots:

- cold open: `/tmp/claude-1000/d303/shots/d-01-cold-open.png`
- bundled adoption preview: `/tmp/claude-1000/d303/shots/d-03-homebrew-adoption-preview.png`
- post-import browse: `/tmp/claude-1000/d303/shots/d-04-homebrew-subclass-browse.png`
- duplicate recovery: `/tmp/claude-1000/d303/shots/d-10-guided-duplicate-skill-recovered.png`
- Warlock added and pools separated: `/tmp/claude-1000/d303/shots/d-21-warlock-added-separate-pools.png`
- post-reload class screen: `/tmp/claude-1000/d303/shots/d-31-levelup-1-after-reload.png`
- final planner: `/tmp/claude-1000/d303/shots/d-40-final-planner.png`
- original/imported sheets: `/tmp/claude-1000/d303/shots/d-41-final-sheet.png`,
  `/tmp/claude-1000/d303/shots/d-44-imported-sheet.png`

## Pass 2 — mobile (390×844, iPhone 13 emulation)

The mobile pass was an abbreviated re-walk of the same core path, but it still
finished at Sorcerer 3 / Warlock 2, exercised the subclass level-up, and opened
the full final sheet.

### Steps walked

1. Opened a second cold profile and repeated the Sorcerer guided build,
   including the duplicate-skill recovery.
2. Opened the planner, added Warlock through the prerequisite-gated class
   selector, and read the separate shared/Pact pools.
3. Returned through `Resume build` to fill the four Warlock choices. Two
   results accepted ordinary touch taps; two had to be selected with Enter
   because their visible result cards were covered at the tap point.
4. Completed Sorcerer 1→2, Sorcerer 2→3 with Draconic Sorcery, and Warlock
   1→2. Every level-up screen had document `scrollWidth=390`.
5. Expanded the total-level-5 sheet. It also had `scrollWidth=390` and printed
   the same numbers as desktop. There were no console or page errors.

The D286 planner overflow MAJOR did not reproduce: the document remained 390
px wide before and after adding Warlock. The wide reference table is now
contained rather than widening the whole page. The guided builder, level-up
wizard, and sheet likewise stayed within the viewport.

Key screenshots:

- planner before/after multiclass:
  `/tmp/claude-1000/d303/shots/m-20-planner-before-multiclass.png`,
  `/tmp/claude-1000/d303/shots/m-21-planner-warlock-added.png`
- blocked spell-result tap:
  `/tmp/claude-1000/d303/shots/m-22-guided-slot-12-tap-blocked-crop.png`
- subclass level-up:
  `/tmp/claude-1000/d303/shots/m-31-levelup-2-screen-2.png`
- final sheet: `/tmp/claude-1000/d303/shots/m-40-final-sheet.png`

## Number checks — independent 2024 arithmetic

Rules were not recalled from memory. I read `.ai/rules/AGENT_ERRATA.md`, the
relevant R-MC/R-SHEET/R-SPELL entries, and the cited SRD extracts. Because the
normal project helper launches other agents and this lane forbade that, I used
`python3 .ai/rules/srdgrep.py` and the checked source extracts directly.

Primary evidence:

- `docs/srd/source/multiclassing.txt`: both current and new classes require 13
  in their primary abilities; PB uses total character level; Warlock is absent
  from the shared Spellcasting contribution list; a new-class first level uses
  later-level HP.
- `docs/srd/source/class-level-tables.txt`: Sorcerer 3 has 4/2 shared slots,
  six prepared spells, four cantrips, and 3 Sorcery Points; Warlock 2 has two
  level-1 Pact slots, three prepared spells, and two cantrips.
- `docs/srd/source/sheet-math.txt`: Sorcerer level 1 is `6 + CON`; later
  Sorcerer levels are `4 + CON`; later Warlock levels are `5 + CON`; ordinary
  unarmored AC is `10 + DEX`.
- SRD page 69, retrieved with `srdgrep.py`: Draconic Resilience increases HP
  maximum by 3, adds 1 on each later Sorcerer level, and while unarmored sets
  base AC to `10 + DEX + CHA`.
- R-SPELL-013: spell save DC is `8 + casting modifier + PB`; spell attack is
  `casting modifier + PB`.

| Sheet says | Independent check | Verdict |
|---|---|---|
| Total level 5 | Sorcerer 3 + Warlock 2 = 5 | correct |
| PB +3 | total character level 5 → +3 | correct |
| CHA 17 (+3) | base 15 + Acolyte 2 = 17 → +3 | correct |
| WIS 13 (+1) | base 12 + Acolyte 1 = 13 → +1 | correct |
| Shared slots 4 / 2 | shared caster level = Sorcerer 3 + Warlock 0 = 3; row 3 → four L1 and two L2 | correct |
| Pact slots 2 × level 1 | Warlock class level 2 row → two slots, both level 1 | correct |
| Sorcerer, Warlock, and Magic Initiate DC 14 / attack +6 | all use chosen CHA: `8 + 3 + 3 = 14`; `3 + 3 = 6` | correct |
| Initiative +2 | DEX modifier +2 | correct |
| Passive Perception 11 | `10 + WIS 1`; Perception is not proficient | correct |
| CON save +4; CHA save +6; WIS save +1 | starting Sorcerer grants CON/CHA: `1+3=4`, `3+3=6`; multiclass Warlock grants no save, so WIS remains +1 | correct |
| **HP 29** | class subtotal: Sorcerer 1 `6+1=7`; Warlock 1 `5+1=6`; Sorcerer 2 and 3 `2×(4+1)=10`; Warlock 2 `5+1=6`; subtotal 29; **Draconic Resilience +3 → 32** | **WRONG** |
| **AC 12** | ordinary unarmored `10+DEX 2=12`, but selected Draconic Resilience is eligible and gives `10+DEX 2+CHA 3=15` | **WRONG** |

The backup/import comparison faithfully preserved every number, including the
two wrong Draconic Resilience results. Portability passed; correctness did not.

## Findings — MAJOR first

### MAJOR D303-M1 — Draconic Resilience is recorded but silently omitted from both HP and AC

The sheet records `Subclass — Draconic Sorcery`, lists `Draconic Resilience`
under subclass features, and then states:

- `Hit point maximum 29`
- `Armor Class 12`
- `Unarmoured (10 + DEX) is the winning eligible formula`

The SRD calculation is HP 32 and AC 15, as shown above. The structured block
also has an empty `feature_values` array, yet neither the sheet nor its `gaps`
list says these subclass mechanics are unknown or unsupported. This is one
root defect producing two wrong numbers. It reproduced on desktop, on mobile,
and after backup import.

Evidence:

- `/tmp/claude-1000/d303/shots/d-41-final-sheet-core.png`
- `/tmp/claude-1000/d303/shots/m-40-final-sheet.png`

Per D294, this finding automatically joins the v1 blocker list.

### minor d303-m1 — reload preserves the character but discards the in-progress wizard step

Reloading on the Sorcerer 1→2 Gains step now boots correctly; the D286 nested
route dead end is fixed on the desktop path tested. It returns to `Choose a
held class`, so the selected Sorcerer and progress to Gains must be repeated.
The character data is intact and the resume point is obvious, making this
recoverable rather than a dead end, but it does not fully meet D285's
“mid-level-up with nothing lost” wording.

Evidence: `/tmp/claude-1000/d303/shots/d-31-levelup-1-after-reload.png`

### minor d303-m2 — the class summary makes a multiclass save proficiency look granted

The top of the sheet says of the non-starting class:
`Class — Warlock ... Not the starting class. Saving throws: charisma, wisdom.`
The actual save numbers and later proficiency explanation are correct: Wisdom
is +1 and not proficient, while only the starting Sorcerer's Constitution and
Charisma saves are proficient. The early summary is therefore misleading on a
sheet whose later sections correctly say multiclass entry grants no saves.

Evidence: `/tmp/claude-1000/d303/shots/d-41-final-sheet-core.png`

### minor m303-m1 — visible multiclass spell results are intermittently untappable

On the resumed mobile level-1 spell page, Eldritch Blast and Chill Touch
accepted touch taps. Hex and Charm Person rendered as visible option cards but
Playwright's real touch tap was repeatedly intercepted by an adjacent
`guided-spell-summary`/listbox subtree. Pressing Enter while the search input
was focused selected each result and allowed the journey to finish, so this is
not a dead end. The screenshot also shows the combined 13-slot page's change
buttons overlapping narrow summary text.

Evidence:

- `/tmp/claude-1000/d303/shots/m-22-guided-slot-12-tap-blocked-crop.png`
- `/tmp/claude-1000/d303/shots/m-22-guided-slot-13-tap-blocked.png`

## Known D286 findings not re-reported

- D286's desktop nested-route reload MAJOR did not reproduce; this review
  records only the remaining loss of transient wizard progress.
- D286's mobile planner page-width MAJOR did not reproduce; document width was
  390 px throughout the planner path.
- D286's duplicate-spell/sheet-warning MAJOR was not repeated because this
  journey deliberately exercised the duplicate-skill recovery instead.
- D286's unfinished-Cleric-choice sheet MAJOR does not apply to this complete
  Sorcerer/Warlock build.
- The cold-page sub-44px controls already listed as D286 `m-m1` were measured
  again (eight in this build) but were not worse and are not counted here.

## What worked

- The 2024 bridge is now present at the moment of surprise: every class card
  says subclass at class level 3, and the species step says ability increases
  come from background rather than species.
- The duplicate skill is prevented at selection time and leaves an obvious
  remaining choice and undo path.
- The prerequisite gate explains each blocked class from the actual scores;
  Warlock is available because both held Sorcerer and new Warlock use the
  already-satisfied CHA 13 prerequisite.
- Shared Spellcasting and Pact Magic remain separate at every checked level,
  with per-class preparation ceilings and a direct explanation that either
  pool can cast an eligible prepared spell without unlocking higher-level
  preparation.
- The level-up wizard shows HP arithmetic before committing it and presents
  the Sorcerer subclass choice at class level 3.
- Bundled homebrew adoption exposes the three listed entries while every
  `ui_hidden` v3 test-card name stays absent from the browsed/picked surfaces.
- Export/import into an empty profile produces an exact rendered-sheet match.
- The desktop and mobile final projections agree digit-for-digit, including
  the same detected Draconic Resilience errors.

## What was NOT covered

- Firefox, Edge, Safari, Android, and real-device behavior; mobile evidence is
  Chromium iPhone-13 emulation only.
- Mobile reload of the nested level-up route; reload was exercised on desktop.
- Homebrew authoring, editing, history replacement, archive/delete, or
  attaching one of the imported homebrew subclasses to this character. This
  journey covered bundled adoption and browse visibility only.
- The prerequisite-waiver house rule, an actual blocked-class add attempt, or
  classes other than Sorcerer/Warlock. Disabled options prevented submitting a
  blocked add, so the displayed refusal text was inspected instead.
- Warlock subclass selection (requires Warlock 3), ASI/feat levels, spell
  replacement, invocation selection, armor/shield equipment, active Mage
  Armor, loadouts, rests, dice simulation, share links, print/PDF, database
  backup restore, or double import.
- Exhaustive spell-rule prose validation. Only the rules needed for the
  independently recomputed sheet numbers were checked.
- Unit/integration tests and build commands. This was a black-box journey
  against the already-running preview; the server was not rebuilt or restarted.

## Tally

| | MAJOR | minor |
|---|---:|---:|
| Desktop/shared | 1 | 2 |
| Mobile-only | 0 | 1 |
| **Total** | **1** | **3** |

## Ran versus assumed

**Ran:** fresh-profile Playwright Chromium journeys at both requested
viewports; screenshots and page-text readouts; console/page-error capture;
mobile width and tap probes; bundled import and hidden-name scans; desktop
character export and fresh-profile import; exact in-memory sheet comparison;
SRD lookup via `srdgrep.py` and direct checked extracts.

**Assumed:** no checked D&D number. Rules arithmetic above comes from the
repository's SRD 5.2.1 sources. Uncovered browsers, devices, classes, and
features are explicitly listed rather than assumed to pass.
