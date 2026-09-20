# D694-INTEL-01 B1 — astra MEDIUM review r3 (session 01a0bcc8-9572-7050-b415-a7aa2ee44f16, final message only)

**ACCEPT — no P1, P2, or P3 findings.**

Reviewed the combined nine-file diff `be09e575..ed75b664`, reading R2 first. Both R2 findings are closed.

1. **Encoded-reference leak: closed.** [The parser](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:324) reconstructs complete candidate strings:

   > `if (suffix === `${actorText}:${String(target)}`) matches.push({ actor, target });`

   [Line 327](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:327) explicitly rejects ambiguity:

   > `return matches.length === 1 ? matches[0] ?? null : null;`

   Independent probes confirmed correct handling of `combatant:a` versus `combatant:a:b`, rejection of a string matching two different actor/target pairs—even when all IDs are retained—and acceptance of `none` with a retained target. Absent actors and targets are rejected. The filter reaches both [sustained-effect keys](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:551) and [persistent-area keys](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:594).

   Dropping distinct unsafe keys preserves unambiguous retained-pair consumption. Both [area consumption](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:4435) and [sustained-effect consumption](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:5473) filter to the turn prefix, then test **exact `currentKeys.includes(key)` membership**. Neither uses another target’s consumption, a count, or ordering to decide eligibility. Ambiguous encodings intentionally lose their consumption marker, as requested.

2. **Safe adjudication prompts erased: closed.** [Line 888](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:888) now delegates validation:

   > `return refusalReferencesSurvive(decision.refusal, spatialIds, encounterIds);`

   After validation, [line 904](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:904) retains the prompt:

   > `case 'adjudication_prompt': return structuredClone(decision);`

   The command walk covers 49 union arms through 48 distinct discriminants; both placement variants share one discriminant. All nine refusal classes and five pending-decision kinds are covered, with no default arms and explicit `never` checks.

   I found no omitted typed combatant reference in the nested command shapes. Movement recursively checks opportunity attacks; effect applications check owned combatants, timing, payload references, and consumption keys; area inputs and world-object changes check their embedded references. `GridCell` contains coordinates only, object/item targets are scalar IDs, and these commands do not embed item-contact records. Legendary-resistance checkpoint effects also receive key projection.

No regression found in the R1/R2-confirmed items; their existing later-batch obligations remain unchanged.

Independent validation: **23 in-memory assertions passed** against the committed helper bodies; both TypeScript projects passed with incremental compilation disabled; combined-diff whitespace check passed. Fresh-cache creation failed with **“Read-only file system,”** so Vitest and the reported mutation runs were not independently rerun. No files were modified.

D694-INTEL-01 B1 REVIEW R3 DONE
