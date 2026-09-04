# Protocol

1. Fetch full turn context and retain its request id and revision.
2. Cover every required actor with one primary and one independent fallback drawn from the current offered ids.
3. Use focused queries for unresolved facts and engine.validate_proposal for unresolved legality.
4. Submit the complete actor set once with the current request id, revision, phase, and idempotency key.
5. If the engine requests correction, change only the refused scope and submit phase correction with a null fallback. Fetch fresh context after a stale-revision response.

| DM decides | Engine resolves |
| --- | --- |
| Offered option ids, semantic intent, primary/fallback, reaction guidance | Targets, coordinates, paths, legality, dice, modifiers, DCs, damage, state reduction |

Do not emit reducer commands or invent mechanics. Reaction guidance belongs on the submission and persists until replaced.
