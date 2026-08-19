# Circle of the Broken Tooth

**Visibility:** `ui_hidden`

**Intended content kind / parent:** compact subclass fixture; Druid parent.

## Mechanic facts

- Entering the recovered Wild Shape package supplies two natural-weapon attacks.
- Each attack uses one damage die plus Wisdom: d8 with +3 at level 5, d10 with
  +4 at level 11, and d12 with +5 at level 17 in the validator.
- The attack modifier is proficiency bonus plus Wisdom.
- Transformation grants temporary Hit Points equal to Druid level.
- The preserved damage result is total form damage, not marginal subclass
  damage. Temporary Hit Points were tracked but never assigned damage value.

## Required structured effects

- An active-form attack profile containing attack count, damage die, attack
  ability, and damage ability.
- Level-scaled natural-weapon die size.
- Temporary Hit Points equal to Druid level when the form is entered.
- A form-active state that owns and removes the package.

## Deliberately unsupported mechanics

- Temporary Hit Points do not contribute to a damage claim.
- No form Armor Class, Speed, size, senses, utility, or defensive valuation is
  invented.
- The validator's exact Wisdom modifiers are test chassis values, not grants.

## MISSING FACTS

- Feature acquisition level, transformation action, duration, uses, and
  recovery cadence.
- Natural-weapon damage type, reach, attack name, and valid targets.
- Whether the die changes at exactly levels 5/11/17 or on another progression.
- Temporary-Hit-Point replacement/stacking behavior and whether repeated form
  entry refreshes them.
- How the package interacts with another form's attacks and statistics.
