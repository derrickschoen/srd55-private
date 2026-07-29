# Armor Class, items, and one effect vocabulary

Binding law: **D72** (items are things, effects are the one vocabulary), **D73**
(resolver + proficiency), **D74** (a broken condition excludes outright), **D75**
(a shield changes the base), **D76** (warn only on a strict reduction), **D79**
(armadillo, not turtle), D33, D35, D49, D67, D7.

## 0. What is true now, each read rather than recalled

- **`armorClass` already exists** — `src/rules/sheet.ts:770` — taking
  `{ armor?, shield?, scores, adjustment? }` and returning a result with
  warnings.
- **Its own comment names the gap this unit closes** (`sheet.ts:754-759):
  *"WHAT THIS DOES NOT MODEL, and says so rather than guessing: Unarmored Defense
  (Barbarian, Monk) and any other class feature offering an alternative
  calculation… The manual adjustment is the honest escape hatch until it is."*
  **D72 is the "until it is."**
- **The sheet already discloses it** — gap kind `no_unarmored_defense`, titled
  *"Unarmored Defense is not calculated"* (`character-sheet-builder.ts:409-412`).
  When this unit lands, that disclosure is **DELETED, not reworded**.
- **A highest-wins-and-say-so precedent ALREADY SHIPS.** `sheet.ts:791-793`: two
  rows both claiming to be worn armour cannot both apply, *"the SRD has no rule
  for layering, so the better of the two is used and stated."* D74's resolver
  **extends an existing pattern rather than inventing one** — worth knowing before
  anyone designs a resolver from scratch.
- **`character_effects` has four kinds** — `damage_resistance`, `hp_modifier`,
  `speed`, `ability_increase` — with kind-scoped nullable payload columns,
  `source_instance_id`, and a `label`. The CHECK is closed, so new kinds are a
  migration.
- **`hp_modifier` already carries `hit_points_flat` AND `hit_points_per_level`.**
  The Armadillo Paladin's *"+3, and +1 whenever you gain another paladin level"*
  is **one existing row with no new schema.**
- **`character_sheet_adjustments.armor_class_adjustment`** is a single integer
  ±20 with a free-text note and **no source**.
- **There is no attunement anywhere.** Zero matches for `attun` in
  `src/db/schema.sql`. `character_items` and its attunement flags are entirely new.

## 1. The shape (D72)

`character_armor` and `character_weapons` **stay** — they carry dex caps, stealth
disadvantage, strength requirements, damage dice, mastery, range. A shield is
`character_armor.slot = 'shield'` and gets no table.

**`character_items` is new**: name, description, `requires_attunement`,
`attuned`, `source_instance_id`. **No `ac_change`, no `to_hit_change`, no
`flat_damage_bonus`** — D72 rejected that; every future modifier would be a new
column and one "+1 AC" would wear three shapes.

**Every numeric change is a `character_effects` row.** New kinds:

| kind | payload | covers |
|---|---|---|
| `armor_class_bonus` | `amount` | Cloak of the Armadillo, Ring of Shell |
| `armor_class_formula` | `base`, `ability_1`, `ability_2`, `allows_shield` | Monk, Barbarian, Armadillo Paladin (10+CON+CHA), Armadillo species (13+DEX) |
| `attack_ability_override` | `ability`, `weapon_scope` | Pact of the Blade |
| `weapon_attack_bonus` | `amount`, `weapon_scope` | +1 weapon |
| `weapon_damage_bonus` | `amount`, `weapon_scope` | flat damage |

## 2. The resolver — eligibility first, value second

**PINNED, per D74 and D75, in this order:**

1. **The floor always exists**: `base 10, ability_1 dexterity, allows_shield true`,
   eligible whenever unarmoured. Without it, excluding every formula leaves the
   sheet with no Armor Class at all.
2. **Evaluate CONDITIONS.** Wearing armour breaks *"while you aren't wearing
   armour"*. Carrying a shield breaks a formula whose `allows_shield` is false.
3. **Discard ineligible formulas OUTRIGHT** — not scored low, not tie-break
   losers. **A lower total is a legitimate outcome** and the app honours it.
4. **Highest total wins** among what remains.
5. **Tie-break: worn armour → species → subclass → class → item, then
   alphabetically by label.** *Not* by acquisition order: `source_instance_id` is
   **remapped on import** (D62 clones), so an id-ordered tie would break
   differently in a clone than in the original — the same character with two
   Armor Classes. This ordering is stable under remapping, which is the property
   that matters.
6. **Bonuses and the shield apply on top of the winner** — they are not in the
   competition. But **the shield is part of step 2**, so equipping one can lower
   the base while adding +2.

**The worked case that catches a wrong implementation** (D75): Monk, DEX +3,
WIS +3. No shield → Monk 16 beats the floor 13, **AC 16**. Shield → Monk formula
excluded, floor 13 wins, +2 shield, **AC 15**. A resolver that adds +2 to the
winning base without re-running eligibility reports **18**.

## 3. Proficiency (D73)

**Proficiency does NOT gate an effect; it changes consequences.**

- **Armour you are not proficient with STILL GIVES ITS AC.** The SRD penalty is
  Disadvantage on STR/DEX D20 tests and no spellcasting. Withholding the AC would
  be a wrong number, which D33 forbids more strongly than an unwelcome one. **The
  sheet states the penalty.**
- A weapon you are not proficient with loses the proficiency bonus — **already
  built and already proven**: `tests/browser/weapons.spec.ts` asserts a Wizard's
  Greatsword loses it and *both screens say so*, and `attack-profiles.ts:40`
  records a past bug where the label and the number disagreed. **That is the
  standard: label and number must agree.**
- **Attunement is a separate gate.** An unattuned item requiring attunement grants
  nothing. Both gates are checked; neither is confused for the other.

## 4. What the sheet says

- **The excluded formula and its reason, always** (D74, D75): *"Armadillo Shell
  (13 + DEX) does not apply while you are wearing armour."* A number that falls
  when a person picks something up is indistinguishable from a bug otherwise.
- **A tie that was broken**, naming winner, loser and rule (D73).
- **The non-proficiency penalty** (D73).
- **`no_unarmored_defense` is DELETED** — the disclosure's reason expires.
- Under **D67** these are reveal content for Armor Class; under **D70** an owed
  choice is a gap. Different surfaces, and §7's trap keeps them apart.

## 5. The warning (D76)

**Predicate: `new total < previous total`. Strictly less.** Not "a formula was
excluded", not "the tie-break moved", not "the base changed while the total held.
A tie is not a reduction **even when the tie-break flips the winner**. Warn,
never block, never auto-swap.

## 6. `armor_class_adjustment` is retired

A single integer ±20 with a note and **no source** cannot answer D67's reveal, and
leaving it beside the effects layer is two mechanisms for one rule. **Taken for
now: retired into an `armor_class_bonus` effect carrying its note as the label.**
*Seam:* one column, one migration. *Cost to flip:* keep the column as a labelled
effect source.

## 7. The traps

**Trap 1 — ranking by value before checking conditions.** Passes every
higher-is-better test. Fails only D74's lower-AC-in-armour case and D75's
Monk-with-shield case.

**Trap 2 — wiring the warning and the disclosure to one predicate.** Wire the
disclosure to the warning's predicate and every tie silently loses its
explanation. Wire the warning to the disclosure's predicate and it cries on every
tie. **They share the resolver's output and nothing else.**

**Trap 3 — a second effect vocabulary for items.** D72 rejected it by name. One
rule in two places is F22, which has already bitten this project.

## 8. Controls

- **AC-ELIGIBILITY** — mutate the resolver to rank before filtering. Must fail:
  an Armadillo-species character **in light armour** shows the armour's total, not
  the higher unarmoured formula.
- **AC-SHIELD-BASE** — mutate the shield to a late addend. Must fail: the Monk
  with a shield is **15, not 18**.
- **AC-FLOOR** — mutate the floor away. Must fail: a character whose only formula
  is excluded still has an Armor Class.
- **AC-TIE-STABLE** — mutate the tie-break to order by `source_instance_id`. Must
  fail: a **clone** (D62) resolves the same tie the same way as its original.
- **AC-WARN-STRICT** — mutate the warning to fire on exclusion. Must fail: a tie
  with a flipped winner **does not warn** while the sheet **still explains** the
  exclusion. One mutation, both halves asserted.
- **AC-PROFICIENCY** — mutate non-proficient armour to withhold its AC. Must
  fail: the AC applies **and** the penalty is stated.
- **AC-ATTUNEMENT** — mutate the attunement gate away. Must fail: an unattuned
  item requiring attunement grants nothing.
- **AC-ONE-VOCABULARY** — mutate an item to carry its own `ac_change` column.
  Must fail: the resolver reads effects only.

**Every fixture must make its mutation observable.** A character whose armoured
and unarmoured totals are equal cannot exercise AC-ELIGIBILITY; a Monk with DEX +0
cannot exercise AC-SHIELD-BASE.

## 9. Fixtures (D79 names)

**Armadillo species** — `armor_class_formula` base 13, DEX, allows shield.
**Armadillo Paladin** — `hp_modifier` flat 3 / per-level 1, **plus**
`armor_class_formula` base 10, CON, CHA, allows shield.

Shell Plate (heavy), Carapace Mail (medium, DEX capped 2), Scute Wrap (light),
Shell Shield; Cloak of the Armadillo (+1 AC, attunement), Ring of Shell (+1 AC,
none — proves attunement is not required for an effect to exist), Staff of the
Armadillo (weapon **and** +1 AC — one thing, two effects), Armadillo Blade
(+2 damage), Pact Shell Blade (`attack_ability_override` CHA, self-scoped),
Amulet of the Burrow (`hp_modifier` flat +5), Band of Growth (per-level +1).

**The collision fixture that matters most:** Armadillo species **+** Armadillo
Paladin **+** Shell Shield **+** Cloak of the Armadillo, unarmoured — two
formulas, a shield and a flat bonus at once.

**Licensing:** all ours, so committing is fine under D59 — the test is
authorization and we are the author.

## 10. Dispatches

- **AC-A — the vocabulary and the resolver.** The new effect kinds and their
  migration, `character_items`, the resolver with eligibility-then-value, the
  retirement of `armor_class_adjustment`, proficiency and attunement gates, and
  every persistence contract: row contracts, snapshot, backup, and the share wire
  **version mint** (D41 ritual — read the current version, do not assume it).
- **AC-B — the surfaces.** The sheet's exclusion reasons, tie disclosure and
  proficiency penalty; the strict-reduction warning; deletion of
  `no_unarmored_defense`; and the fixtures.

AC-A owns the vocabulary and every contract; AC-B consumes them.

## 11. NOT in this unit

Score-**setting** items (Belt of Giant Strength) — `ability_increase` is additive
with a cap and cannot say *"your Strength is 21"*; an `ability_override` kind is
its own decision and is **open with the owner**. General inventory for
non-modifying possessions (a rope, a potion) — **also open with the owner**; D65's
"gear is not itemised" stands until then. Conditions, rests, current hit points
(D26). The D67 reveal surface itself.
