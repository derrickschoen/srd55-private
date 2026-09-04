---
name: engine-submission
description: Build and submit one complete engine-bound round decision when the arena supplies a turn context and advertised submission schema.
---

# Engine submission

Use this procedure only for the supplied arena turn. Treat the root knowledge base and the current engine context as the complete rules sources; do not introduce rules or tactics from elsewhere.

1. Read the supplied current context completely. Use its required actor set, revision-bound offered option IDs, and generated minimal submission example.
2. Cover every required actor exactly once. For each actor, select one offered primary option and, on an initial decision, a different offered fallback that remains useful if the primary is refused. A correction has a null fallback.
3. Leave `override_justification` null unless the selected option exposes a concrete gap in the engine's displayed comparison. When a gap is exposed, name that specific gap using only an advertised override reason; never use an override merely to express preference.
4. Call the advertised round-submission tool with exactly its decision object: `proposals` and optional `reaction_guidance`. Each proposal contains only the advertised fields: `actor_id`, `expected_revision`, `primary_option_id`, `fallback_option_id`, `override_justification`, and `activation_choice` only when the offered option requires it. Do not restate launcher-owned state, request, phase, idempotency, resolved mechanics, or reducer metadata.
5. Submit once. If the engine rejects the decision, read every rejection, repair the refused scope, and submit one correction. Do not attempt a second repair.

Return no alternative plan or prose in place of the required tool call.
