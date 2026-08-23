# Content-pack sustained effects (D343)

`sustained_effect` is the content-pack operation for cast-now/use-later spells.
The cast may run one existing `establishment` operation, then creates an
ordinary encounter effect. Its `lifecycle` uses the same duration clock and
concentration ownership as every other encounter effect; there is no separate
activation timer. When that effect expires or concentration ends, its
activation command ceases to exist.

The declaration has four required decisions:

- `lifecycle`: `concentration`, `durationRounds`, and the sourced caster
  boundary (`source_start` or `source_end`).
- `targetBinding`: `reselect`, or `bound` to the cast's combatant targets,
  object targets, or world objects created by establishment.
- `activation.action`: both `phrasing` and `actionType`.
- `activation.targeting` and `activation.operation`: the later-turn selection
  contract and an operation from the existing spell-operation vocabulary.

Owned world objects and activation targets are separate command fields. The
sphere or hand is supplied as `ownedObjectTargets`; a manipulated/heated object
is supplied as `objectTargets`. The reducer verifies ownership before spending
the declared action.

## Converter normalization

An explicit action name is preserved: `Bonus Action` becomes
`{ phrasing: "explicit", actionType: "bonus_action" }`, `Reaction` becomes
`reaction`, and `Magic action` becomes `magic_action`. Vague legacy wording
such as “as an action on a later turn” must be emitted as
`{ phrasing: "vague_action_on_later_turn", actionType: "magic_action" }`.
The schema deliberately has no omitted/default action arm, and it rejects a
vague record paired with `bonus_action` or `reaction`.

This preserves the SRD's explicit later-turn Magic action for Call Lightning
(`docs/srd/source/spell-descriptions.txt:964-966`), Mage Hand
(`docs/srd/source/spell-descriptions.txt:4944-4946`), and Produce Flame
(`docs/srd/source/spell-descriptions.txt:6252-6255`); Heat Metal's explicit
Bonus Action remains a Bonus Action
(`docs/srd/source/spell-descriptions.txt:4200-4204`), as does Flaming Sphere's
movement (`docs/srd/source/spell-descriptions.txt:3290-3294`).

## Binding and refusal

`reselect` permits a genuinely different activation target or point, matching
Call Lightning's same-or-different point wording
(`docs/srd/source/spell-descriptions.txt:964-966`) and Produce Flame's ranged
target selection (`docs/srd/source/spell-descriptions.txt:6252-6255`). `bound`
retains the declared cast identity; Heat Metal selects one manufactured metal
object and later repeats damage through that object
(`docs/srd/source/spell-descriptions.txt:4192-4204`).

Target IDs arrive at runtime, so invalid retargeting cannot be excluded from
the static command union. The reducer refuses it with
`SustainedActivationRuleError` and code `bound_target_mismatch` before it
spends an action or executes an operation. This is the D343.3 typed-refusal
choice.

## Exemplar capability mapping

- Call Lightning establishes its cast-time bolt, then reuses area targeting
  and damage at a newly selected point; its cloud and concentration duration
  are stated at `docs/srd/source/spell-descriptions.txt:950-966`.
- Flaming Sphere establishes an owned world object and lowers later movement
  to the existing `modify_object` world operation; its creation, duration, and
  Bonus Action movement are at
  `docs/srd/source/spell-descriptions.txt:3276-3294`.
- Mage Hand establishes an owned hand, then one Magic action can move that hand
  and apply an ordinary world-object modification to a separately reselected
  object, matching `docs/srd/source/spell-descriptions.txt:4931-4946`.
- Produce Flame establishes a duration-bound capability and later runs the
  existing ranged spell-attack damage operation; its cast, duration, and
  later attack are at `docs/srd/source/spell-descriptions.txt:6242-6258`.
- Heat Metal uses the same effect lifecycle and binds the original object;
  cast-time and later damage remain existing damage operations, sourced at
  `docs/srd/source/spell-descriptions.txt:4181-4211`.

Reaction is a valid explicit vocabulary value. D343 adds no reaction-window or
policy plumbing; activation uses only the encounter reducer's existing
one-Reaction resource path.
