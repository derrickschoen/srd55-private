---
name: dm-round
description: Coordinate and submit a compact multi-actor DM round when the arena supplies ranked choices, initiative order, and an advertised decision schema.
---

# DM round

Use this procedure only for the supplied arena turn. Treat the root knowledge base and the current engine context as the complete rules sources; do not introduce rules or tactics from elsewhere.

## Decision contract

Read the complete current context. Cover every required actor exactly once. For each actor choose one revision-bound offered primary option and, for an initial decision, a different offered fallback that is independently usable if the primary is refused. Corrections use a null fallback.

Leave `override_justification` null unless the selected option exposes a concrete gap in the engine's displayed comparison. If so, identify that specific gap with an advertised reason; preference alone is not a gap.

Call the advertised round-submission tool with exactly `proposals` and optional `reaction_guidance`. Each proposal contains only `actor_id`, `expected_revision`, `primary_option_id`, `fallback_option_id`, `override_justification`, and `activation_choice` when required by the offered option. Do not restate launcher-owned state, request, phase, idempotency, resolved mechanics, or reducer metadata.

## Compact round algorithm

1. Inspect each actor's ranked offered choices before selecting.
2. Walk actors in initiative order and coordinate later selections with the already selected earlier actions. Still include every required actor once in the single decision object.
3. Handle reaction guidance deliberately: omit it to inherit the persisted guidance, or provide a complete advertised replacement only when the current round warrants a change.
4. Submit once. If rejected, use the engine's rejection details to repair the refused scope once; do not make a second repair.
5. For an advertised adjustment request, change only actors whose prior plan is materially invalidated and emit only the adjustment fields the engine requests. For a correction, change only the refused scope. Do not repeat engine-owned metadata in either response.

Return no alternative plan or prose in place of the required tool call.
