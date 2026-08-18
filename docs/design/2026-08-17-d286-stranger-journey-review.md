# D286 stranger-journey self-review — Cleric 1→5, desktop and mobile

**Date:** 2026-08-17
**Ruling walked:** D286 (supervisor performs the review itself), against the
D285 stranger spec, at both viewports per D293/D295.
**Persona:** knows 5e-2014, has never seen this app, is building a Cleric.
**Target:** the already-running production preview at `http://localhost:4173/`
(verified: `200`, 2225-byte shell, hashed `./assets/index-B97HAwyd.js`).
**Not rebuilt, not restarted.** No app `src/` or `tests/` file was touched.

Everything below was executed by this lane in Playwright-driven Chromium and
read out of the resulting page text and screenshots. Nothing is repeated from
the earlier lane's logs. The earlier lane's `lib.mjs` / `steps.mjs` / `p24.mjs`
were reused as the drive harness (copied to `/tmp/claude-1000/d286/`, `SHOTS`
repointed); every observation was re-produced here.

Severity bar, as instructed: **MAJOR** = dead end, wrong number, or an unknown
the app does not say is unknown. Everything else is **minor**.

---

## Pass 1 — desktop (1280×1200)

**39 steps walked**, cold profile each run (a fresh browser context per script,
so IndexedDB starts empty):

cold open → class list → Cleric + name → ability scores → species → background
→ Acolyte preview → Origin feat (Magic Initiate, Cleric list, WIS) → apply →
skills → **duplicate skill attempt** → skill recovery → level-1 spells →
**duplicate spell attempt** → equipment ×2 → backup nudge → level-1 sheet →
**reload on `/characters/1/sheet`** → level-up screen 1 → level-up review →
**reload mid-level-up** → manual recovery → planner → Divine Order → resume
build → order cantrip → level 2 → level 3 (subclass) → level 4 (feat/ASI) →
level 5 → level-5 sheet → planner duplicate warnings → export backup → fresh
profile → **import** → sheet comparison → **double import (declined)** →
**double import (accepted)**.

Scripts: `dA` `dB` `dC` `dD` `dE` `dF` `dG` `dH` `dI` `dJ` `dK` `dL` in
`/tmp/claude-1000/d286/`; screenshots in `/tmp/claude-1000/d286/shots/`.

### Numbers — all correct

Cleric 1, Dwarf, Acolyte, standard array STR 12 DEX 13 CON 14 INT 8 WIS 15,
background +2 WIS / +1 CON:

| Sheet says | Check |
|---|---|
| Proficiency bonus +2 | level 1 |
| Hit point maximum 11 | 8 + CON 2 = 10 class subtotal, + 1 Dwarven Toughness |
| Armor Class 16 | Chain Shirt `13 + DEX (maximum 2)` = 14, + 2 shield |
| Initiative +1 | DEX +1 |
| Passive Perception 13 | 10 + WIS 3, not proficient |
| Level 1 spell slots 2 | caster level 1 |
| WIS save +5, CHA save +3 at L5 | mod + PB, Cleric's two saves |
| Save DC 13 · attack +5 | 8 + 3 + 2 / 3 + 2 |
| Cleric cantrips 3, prepared 4 | 2024 table |

At Cleric 5 (STR raised to 14 by the level-4 ASI):

| Sheet says | Check |
|---|---|
| Proficiency bonus +3 | total level 5 |
| Hit point maximum 43 | 10 + 4×(5+2) = 38 class, + 5 species |
| Spell slots 4 / 3 / 2 | caster level 5 |
| Save DC 14 · attack +6 | 8 + 3 + 3 / 3 + 3 |
| Channel Divinity 2 | "exact sourced table row at class level 5" |
| Life Domain features at level 3 | Disciple of Life, Life Domain Spells, Preserve Life |
| Prepared ceiling 9 at level 5 | matches `STANDARD_PREPARED` and the 2024 table |

Ability provenance is the best thing on the sheet: every score prints
`Score path: base 15; after increases 17`, so the persona can see where an
increase came from without being told.

I found **no wrong number anywhere on either sheet**.

### MAJOR — desktop

**D-M1. Reloading or deep-linking any nested route leaves a permanently dead
page. This is the mandated misstep 2, and it fails.**

At `/characters/1/level-up`, pressing reload gives:

```
SRD-55
Starting local database…
Requesting browser eviction protection…
```

…forever. Console: `Failed to load module script: Expected a
JavaScript-or-Wasm module script but the server responded with a MIME type of
"text/html"`. No error is shown to the user, no retry, no link out. The only
escape is knowing to hand-edit the URL back to `/`.

Root cause, confirmed outside the browser:

```
$ curl -s http://localhost:4173/ | grep -oE 'src="[^"]+"'
src="./assets/index-B97HAwyd.js"
$ curl -s -o /dev/null -w "%{http_code} %{content_type}\n" \
    http://localhost:4173/characters/1/assets/index-B97HAwyd.js
200 text/html
```

`vite.config.ts:223` sets `base: './'`. Relative asset URLs plus history
routing plus SPA fallback means a nested route resolves its entry module to
`/characters/1/assets/…`, gets `index.html` back, and never boots. Any static
host with SPA fallback behaves the same way; this is not a preview-server
artefact.

D285 asks for "reload mid-level-up with nothing lost and an obvious resume
point". Nothing *is* lost — after manually reaching `/`, the card still read
`Level 1 · ✓ 0 warnings · 1 unfinished choice` with a `Level Up` link — so the
state half is fine. The resume point is unreachable by the route the user
actually took.

**D-M2. A duplicate spell pick is accepted silently, and the printed sheet
then shows the shrunken spell list without saying so.**

I filled all three Cleric cantrip slots with Sacred Flame and all four prepared
slots with Cure Wounds. Every pick was offered and accepted; the step marked
itself complete ("Both equipment packages are recorded. Every level 1 step is
complete."). The sheet then prints **one** Sacred Flame and **one** Cure
Wounds — a Cleric 1 with one cantrip where three are due — with no note, and
its own structured block says:

```json
"warnings": [],
```

while at the same moment the character-list card says `⚠ 2 warnings`. Two
surfaces of one character disagree.

The model does know. The planner has a proper `Duplicate warnings · 2` panel
("Sacred Flame consumes limits in more than one selection."), and the slot
table marks each row `⚠ Wasteful`. So the fix is a disclosure gap, not a
modelling gap — but the artefact the player takes to the table is the one that
stays quiet.

Contrast: the same class of mistake **is** handled well elsewhere. Skills
(below) prevent it; the level-4 feat screen refuses a repeated Magic Initiate
list by name — "Chosen List 'Cleric' has already been used for this repeatable
feat."

**D-M3. The character sheet never mentions an unfinished choice.**

Divine Order is a Cleric *level 1* feature here (`class-progression-lookup.ts`
`active_from_class_level: 1`). Three surfaces say it is unchosen — the list
card (`1 unfinished choice`), the planner (`CLERIC 1 — DIVINE ORDER NOT
CHOSEN`, with the pointer "Open Cleric 1 in the planner and choose Protector or
Thaumaturge"), and the level-up wizard's `Character warnings`. The sheet says
nothing: no "Divine Order", no "unfinished", no entry in its `gaps` list. I
re-checked after choosing Thaumaturge with its new cantrip slot still empty —
still silent.

The app knows something is missing and the printed output does not say so.

### minor — desktop

- **d-m1.** The guided builder never offers Divine Order at all, yet ends with
  "Every level 1 step is complete" while the list card next to it reads
  `1 unfinished choice`. Technically true (it is not one of the eight guided
  *steps*) and disclosed in three other places, so not MAJOR — but the two
  sentences contradict each other on adjacent screens.
- **d-m2.** Nothing bridges the 2014 expectations (D285 misstep 4). The species
  screen says of Dwarf only "The SRD offers no further choice for this
  species" — no word that species no longer grant ability increases; the class
  screen says nothing about when a Cleric gets its subclass. The persona meets
  both surprises with no explanation at the point of surprise. Partly redeemed
  after the fact by the sheet's `Score path: base 15; after increases 17` and
  by level 3's `Target-level features: Cleric Subclass`, which is why this is
  not a dead end.
- **d-m3.** A template placeholder leaks into user-facing text on the level-4
  feat screen: "Choose 2 **$config.chosen_list** spells of cantrip". The same
  block prints "Stable grant label: magic-initiate-cantrips", which is internal
  vocabulary.
- **d-m4.** "Choose Cleric skill 2" stays enabled with no skill selected and
  does nothing at all when clicked — the page text was byte-identical before
  and after (`CHANGED: false`). No message, no focus move.
- **d-m5.** At level 5 the card read `nothing outstanding` while its action
  link was `Resume build`, not `Level Up`. The badge and the button disagree.
- **d-m6.** Every cantrip prints "Current cantrip effect: UNKNOWN — not
  recorded." immediately above printed rules text that gives the answer
  ("The damage increases by 1d8 when you reach levels 5 (2d8)…"). Honest, and
  therefore not MAJOR, but nothing says what would make it known.
- **d-m7.** Cold open sits on "Checking database structure…" for ~4.4 s
  (measured to first paint of `Create a character`) with no progress
  indication.
- **d-m8.** After declining the double-import confirm, the status line reads
  "Character import cancelled. Nothing was changed." — correct, but it drops
  the reason the moment the native dialog closes.

### What worked — desktop

- **Misstep 1 (duplicate skill): passes, by prevention.** Acolyte's Insight and
  Religion appear under "Already granted" and are absent from the Cleric skill
  lists, with the rule spelled out: "A skill you already have from your
  background or species never fills a class choice — it only leaves the list."
  Confirming History in slot 1 removes History from slot 2 (`['', 'medicine',
  'persuasion']`) and leaves a `Clear History` undo. The duplicate is not
  refusable because it is not offerable.
- **Misstep 3 (double import): passes.** Export → fresh profile → import gave
  "Character imported as #1", and `diff` of the two sheet dumps
  (`sheetA.txt` vs `sheetC.txt`, 21 740 chars each) was **identical**.
  Importing the same file again raised:

  > This backup appears to have been imported already: a character with the
  > same core saved details as "Brother Aldric" is here. It could be a separate
  > identical character. Create another copy?

  Declining left exactly one card; accepting made a deliberate second copy
  ("Character imported as #2", 2 cards). Honest heuristic, honestly worded,
  user in control, no silent duplicate.
- The background step's "What Apply changes now" / "What stays reference text
  or happens later" split is the clearest thing in the app.
- Level-up arithmetic is shown before it is applied: `Fixed class base 5 ·
  Constitution modifier +2 · Class HP change +7 · Dwarven Toughness 1 → 2 ·
  Current 11 · Projected 19`.
- "Decide later" on the subclass screen states its own consequence.
- Zero console errors across the whole desktop journey except the reload
  failure in D-M1.

---

## Pass 2 — mobile (390×844, `isMobile`, `hasTouch`, iPhone 13 UA)

**31 steps walked**, taps rather than clicks: cold open → class → name →
abilities → species → background → Origin feat → apply → skills → **duplicate
skill attempt** → recovery → spells → search results → spells done → equipment
×2 → list → planner collapsed → planner expanded → **Divine Order on touch** →
sheet collapsed → sheet expanded → **reload probe** → resume build → level 2 →
level 3 (subclass) → final list → **import** → **double import (declined)** →
**double import (accepted)** → imported sheet.

Scripts `m0` `m1` `m2` `m3`. Horizontal overflow and tap-target size were
measured on every screen, not eyeballed.

### MAJOR — mobile

**M-M1. The planner does not fit the viewport, and it is the only route to a
level-1 choice the guided builder never offers.**

Measured `document.documentElement.scrollWidth` against a 390 px viewport:

| Screen | scrollWidth | verdict |
|---|---|---|
| Character list | 390 | fits |
| Guided builder, every step | 390 | fits |
| Character sheet, collapsed and fully expanded | 390 | fits |
| Level-up wizard, every screen at levels 2 and 3 | 390 | fits |
| **Planner, as it opens** | **514** | 32 % too wide |
| **Planner, reference sections expanded** | **4686** | 12 screens wide |

It is not one runaway table pushed into a scroll container: `<section
class="planner-panel">` itself measures 4674 px, so *every* panel inherits the
width. The screenshot shows the first paragraph of Character details cut at
"These words are stored and pr…", and the Divine Order `<select>` measures
4617 px wide. Reading any sentence on that page means panning sideways and
back, per line. The page is also 14 654 px tall — Chromium refused to take a
full-page screenshot of it.

I did verify the screen still *works*: I tapped through to the Divine Order
select, chose Thaumaturge, and the "DIVINE ORDER NOT CHOSEN" warning cleared.
So this is a layout failure, not an unreachable control — but the planner is
where D-M3's mandated recovery lives, and on a phone it is the one screen a
new player cannot read.

**M-M2. The reload dead end reproduces identically on mobile.** Reloading
`/characters/1/sheet` at 390×844 gave the same permanent "Starting local
database…" and the same MIME console error. Same root cause as D-M1; recorded
separately because the review keeps the viewports separate, and because a phone
browser reloads tabs on its own — the user does not have to press anything.

### minor — mobile

- **m-m1.** Checkboxes on the character list measure **13 × 13 CSS px**
  (`Include loadouts`, `Include my written text`, `Include warning
  acknowledgements`). Primary buttons are 36 px tall. 28 controls on the home
  screen are under 44 px.
- **m-m2.** The descriptive paragraph "Open a character or start a new
  character build." is present but not rendered at this width, so the list's
  one-line explanation of itself is desktop-only.
- **m-m3.** Cold open ~4.4–4.9 s, as on desktop.

### What worked — mobile

- The **guided builder, the character sheet and the level-up wizard all fit
  390 px exactly** — no sideways scroll on any of them, collapsed or expanded.
  Whoever did the responsive work did it on the screens that matter most.
- Misstep 1 behaves identically on touch: History disappears from slot 2, the
  `Clear History` undo is present.
- Misstep 3 behaves identically on touch, native confirm text and all; declined
  → 1 card, accepted → 2 cards.
- The imported character's sheet on mobile reads PB +2, HP 11, AC 16,
  initiative +1, passive Perception 13, 2 first-level slots, DC 13 / attack +5
  — the same numbers as desktop, to the digit.
- Zero console errors on mobile other than the reload failure in M-M2.

---

## Tally

| | MAJOR | minor |
|---|---|---|
| Desktop | 3 | 8 |
| Mobile | 2 | 3 |

Per **D294**, all five MAJOR findings join the v1 blocker list without awaiting
owner triage. D-M1 and M-M2 are the same defect at two viewports and one fix
closes both.

The D265 spine held: cold profile, choices and sources shown at every level,
export → re-import into a fresh profile with a byte-identical sheet. Of the
four D285 missteps, **1 (duplicate skill) and 3 (double import) pass cleanly**,
**2 (reload mid-level-up) fails** on the routing dead end while keeping the
data intact, and **4 (2014 expectations) is not met with any UI at the point of
surprise**, though the sheet's per-score provenance means the persona is not
left with a wrong number.
