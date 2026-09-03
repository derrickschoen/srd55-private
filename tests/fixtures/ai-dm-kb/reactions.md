# Reactions

A Reaction requires an available reaction resource and its trigger. Guidance selects among legal reactions offered by the engine; it cannot create a trigger, move the actor, or force an illegal Reaction.

- take accepts the offered reaction when legal.
- decline rejects it.
- only_when_target_visible accepts only when the reaction's target is visible.
- only_when_legal_without_moving accepts only when the offered reaction requires no movement.

Use side-wide guidance for one uniform instruction and actor-specific guidance when actors need different instructions. A declaration replaces the prior declaration and persists until replaced. Opportunity Attacks and defensive or spell reactions remain limited to what the engine offers.
