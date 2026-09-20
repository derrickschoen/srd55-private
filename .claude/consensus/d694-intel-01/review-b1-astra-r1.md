# D694-INTEL-01 B1 — astra MEDIUM review r1 (session 01a0bc4d-3de1-7a83-a162-f5221741787f, final message only)

**REJECT — 4 P2, 2 P3. No P1.**

Reviewed `ccaab477` against `be09e575`. The frozen plan’s SHA matches. The worktree is clean; all nine changed files are within B1’s manifest. No fixtures, documents, or existing assertions were weakened.

1. **P2 — Collection filters retain absent identities inside nested fields.**  
   [projectMechanics](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:310) checks only effect source, targets, and concentration owner before cloning the entire effect. It misses references such as `payload.againstAttacker`, `payload.source`, and `ownedCombatants`.

   Alerting similarly checks `help_call.caller` but ignores `summoned.summoner`; it also uses `mechanicsIds`, although §2 requires spatial Whole membership.

   An isolated, in-memory execution of the committed projection helpers confirmed that an absent ID survives in both `armor_class_modifier.againstAttacker` and `joinedBy.summoner`. Implement the relevant arm-specific projection and add hand-built absent-reference witnesses. These are leaks in the B1 mechanics accessor, independent of later producer migrations.

2. **P2 — Indication mechanics retain unobserved live resources.**  
   [syntheticIndicationCombatant](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:178) normalizes HP and several resource pools, but clones `turn` and `wildShapeUses` directly. Thus an unchanged indication exposes current movement expenditure, action/reaction availability, and remaining Wild Shape uses through `mechanics()`.

   The isolated helper probe confirmed that changing only an indicated target’s movement expenditure changes local mechanics bytes. Construct this adapter from sanctioned capabilities and the cue, with explicit neutral resource state; add hidden-resource invariance assertions. The current cue tests check participant shape and offer labels, so they miss this.

3. **P2 — Retained mechanics collections are erased unconditionally.**  
   [projectMechanics](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:378) sets `persistentAreas`, `reevaluatedBranches`, and `pendingDecisions` to empty arrays regardless of whether all references survive.

   This differs from §2’s retain-safe-arms contract. For a concrete consequence, a retained actor concentrating through a persistent area loses that information: [engineConcentrationActive](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/engine-query-port.ts:494) explicitly reads those areas. Movement-hazard queries also lose retained area hazards. Project safe entries rather than treating populated collections as empty, and witness a positive retained case as well as redaction.

4. **P2 — Generation counters do not establish the required invocation counts.**  
   [generationCounts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:162) hardcodes `authoritative: 0`; `localGenerations` is manually incremented beside the issuer call. An additional discarded authoritative generation—or an additional local call without another increment—does not change these reported counts.

   The present ingress visibly generates once and tactical annotations reuse cached objects, but the assertion is not a load-bearing proof of that property. Instrument actual builder invocations across runtime construction and consumer access. Negative controls should insert extra calls without editing the instrumentation.

5. **P3 — Resolve or explicitly record the participant-policy exceptions.**  
   [participantsFor](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:415) drops every dead creature and every tokenless monster-side creature.

   Excluding these from spatial collections agrees with the spatial-Whole table restriction. Dropping their identity/capabilities entirely does **not** follow unambiguously from “every monster-side creature is Whole.” In particular, an `absentTokens` entry cannot rescue a creature lacking a regular token. Record the intended exception and its later witness; I do not treat the plan’s representation ambiguity as a B1 blocker.

6. **P3 — Search-memory projection and staging documentation need correction or disposition.**  
   [projectedSearchMemories](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-local-encounter-state.ts:325) clones matching raw rows. [SearchMemory](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/search-memory.ts:53) contains more than `KnownIndication`: policy, observer, cause, lost/expanded rounds, expiry, and suspicion center/radius. It has **no exact-current-position field**, so this is not evidence of a current-cell leak. Nevertheless, it violates the explicit “never copy raw; issue only KnownIndication” contract. Reconstruct the mechanics adapter from sanctioned cue data or record an approved exception.

   The requested conservative-offer/B14 explanation is also absent from the production seam.

Other requested checks:

- **Non-forgeability passes.** Concrete classes are non-exported, privately branded, frozen, and accessor-based, with issuance WeakSets. `tsconfig.node.json` includes the test. An in-memory compiler control replacing the three rejected producer arguments with valid `local` produced exactly three **TS2578 unused-directive errors**, at lines 133/135/137.
- **Issuer/caller grep passes for current source:** issuer definition plus entrypoint import/call; one application definition and one caller. The architecture checker does not itself pin the new issuer restriction.
- **Empty forbidden mechanics fields are acceptable for B1’s adapter.** The opaque local type has no raw-history properties; the unchanged builder requires an `EncounterState` mechanics input. Empty `eventLog`, `dmNotes`, and `hiddenCombatants` do not themselves disclose their authoritative values.
- **Remaining collection audit:** participant-free configuration/environment/content facts are explicitly retained; tokens, initiative, delayed order, reactions, contacts, and shared-space endpoints use spatial IDs; active initiative index is recomputed; equipment uses mechanics IDs. Ground items currently contain only item/position, so raw cloning introduces no owner reference. Class actions already strip DM override and restrict controller priority to retained monster-team actors. Counters are derived/reset, not copied. Concluded phase is cloned rather than derived; ownership/faction snapshotting and complete phase/union witnesses remain later-batch obligations.
- **Offers:** ingress and tactical resolution reuse original registered local objects and the canonical environment. Native environment authentication remains unchanged. Submission paths still call the authoritative regenerating resolver; that is outstanding later-batch work, not a completed B1 property. Existing `OPTION_NOT_SHOWN` handling remains.
- **Spent-object seam:** both named availability consumers use the shared predicate. Local keys contain only object/action IDs and require a spatial Whole actor; absent and indication-only player actors cannot contribute keys. B14’s observed-change evidence remains deferred.
- **Witness integrity:** corridor construction matches `/tmp/d694-corridor-exact.ts`; the offer SHA and labels match the frozen literals. The structural regexes correctly match compact, alphabetically keyed `canonicalJson`. The withdrawn prototype local SHA is not asserted. The seven new tests do not cover the collection/resource defects above; I am not requiring all later-batch §6 witnesses now.

Independent checks passed: both TypeScript projects, architecture self-test **77 fixtures**, architecture scan **1,629 files**, command-outcomes check, and commit diff whitespace. Fresh-cache creation failed with **read-only filesystem**, so I did not rerun Vitest or independently reproduce a blind-Dodge fixture ID. The helper probes and compiler controls ran entirely in memory; no files were modified.

D694-INTEL-01 B1 REVIEW R1 DONE
