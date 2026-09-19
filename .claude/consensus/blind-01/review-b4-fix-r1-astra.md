131,861
**REJECT — 0 P1, 2 P2, 0 P3.** Reviewed only `a5389bdc` against `f73da384`.

1. **P2 — Unseen current mobility/conditions still affect model-visible speculation.**  
   [speculative-planning.ts:661](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/speculative-planning.ts:661) calls `maximumInfluenceRadiusFeet` for unseen subjects, then publishes its result through candidate retention, radius and score.

   Through the actual advice MCP handler, changing the unseen PC:
   - Speed 30→15 changes published radius/score 60→30.
   - Speed 30→0 removes its candidate.
   - Adding Paralyzed removes its candidate, changing two candidates/three scenarios to one/two.

   The Paralyzed variant has **byte-identical `projectActorKnowledge` output** but different serialized request bytes. Permission for exact PC capabilities/resources does not establish permission to disclose an unobserved current condition; the actor-knowledge producer exposes condition markers only for seen targets. Static profile speed alone is therefore not the decisive finding—the concealed condition is.

2. **P2 — Token-presence filtering reveals an unseen opponent’s board absence.**  
   [speculative-planning.ts:388](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/speculative-planning.ts:388) excludes opponents without a token. Removing the unseen PC’s token while retaining its roster entry—and moving the token into `absentTokens`—changes the serialized request from two candidates/three scenarios to one/two. Again, **actor knowledge remains identical**.

   This distinguishes “unseen somewhere on-board” from “absent from the board” without an observation. Known roster identity does not authorize that information. The probe exercised absent-token state, not a complete Banishment cast.

Both findings require eliminating unauthorized state-dependent retention/scoring from the published no-cue menu, or establishing an appropriate host/model serialization boundary. Add condition and presence witnesses alongside relocation.

The other requested checks:

- **Original relocation witness passes for the request.** On the 40×5 map, `(6,1)` versus `(30,1)` now produces identical serialized request bytes and two candidates/three scenarios each. **Whole resource bytes differ only in `state_ref`**, the opaque state handle; the committed test correctly names and compares the request portion.
- **Identity:** Renaming the roster identity changes request bytes while preserving counts. That is legitimate roster information, unlike the two findings above.
- **Meaningful speculation:** Confirmed. The baseline selected `no_material_change`; moving the opponent into sight selected `single_candidate_flip`. These are conservative visibility hypotheses rather than proven reachable changes. They are not vacuous, although capacity filtering means the menu is not actually derived from posture alone.
- **Equality/dedup/digests:** The new tag participates in dependency merging but not candidate-ID hashing. Ordinary untagged dependencies retain their previous behavior. Mixed tagged/untagged duplicates would be first-entry-dependent, but I found no production path generating them for the same observer/subject fact. Changed menu membership/order can change scenario IDs and capsule digests; resolution digests are unaffected. No existing exact pins were rewritten.
- **Witness quality:** It calls actual `resources/list` and `resources/read`, parses the handler’s returned text, and compares the serialized request. Its pre-fix candidate-count difference targets the original reachability leak, not incidental state-handle differences. I did not repeat the supervisor’s mutant or test suites.

No files were changed.

BLIND-01 REVIEW B4 FIX R1 DONE
