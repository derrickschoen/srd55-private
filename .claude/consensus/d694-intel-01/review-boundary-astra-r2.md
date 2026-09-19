# D694-INTEL-01 boundary plan — astra HIGH review r2 (session 01a0bb47-490e-7ab0-a9ff-f1163c48f3cf, plan sha cb9452e8…)

**VERDICT: REJECT — 2 P1, 5 P2, 1 P3.**

Reviewed `claude/cohort-01@be09e5757d4c86c8a30a1d4af19186eb06d433d5`. The [400-line plan](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/.tmp-plans/2026-09-19-d694-intel-01-boundary-plan.md) matches SHA `cb9452e8b52b0d11064067e8150e1dabe3ab7fc6b951adddd4f7aa28b671ce4f`.

I found and read the boundary r1 review, three earlier reviews, and current rulings in the main checkout; those records are absent or stale in this worktree. No files were changed, agents invoked, or model calls made.

1. **P1 — Authenticated authoritative offers still leak hidden occupancy through offer membership.**

   Plan lines 92–106 retain original registered offers and expose a target-visible subsequence. But [availableEngineActorOptions](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver.ts:734) first filters declarations using **authoritative resolution**:

   ```ts
   .filter((option) => resolveEngineActorOption(state, option, environment).valid)
   ```

   An option removed there cannot be recovered by the proposed boundary filter.

   **New runtime witness:** using the seed-5117009 Guard/Wizard/Fighter profiles, construct a six-column corridor with Guard `(1,1)`, perceived Wizard `(4,1)`, and a living, never-perceived Fighter `(2,1)`. Move Fighter to the isolated free cell `(0,0)`, then remove Fighter completely.

   | Measurement | Blocking Fighter | Relocated Fighter | Removed Fighter |
   |---|---|---|---|
   | Actor-local state SHA | `f4c1d44ec7351143d7fe840676f1a6268be992df4cc6030c3e6df84fd49c5590` | Same | Same |
   | Safe authoritative offers | Dodge, End Turn, Spear→Wizard | **Dash**, Dodge, End Turn, Spear→Wizard | Same as relocated |
   | Offer-array SHA | `e5e3fe889018bf637ff9ba3e8d613acd5326f937bc6e90ff298cb257332c5ce0` | `5d3ae0e2c125fb9b043d08eba2e35f8763a1fec95d718096415068fcb97940c4` | Same as relocated |

   Dash has no absent target, so the plan’s subsequence filter retains this discriminator. This violates its removal-invariance contract without exposing any Fighter-targeted option.

   **Required:** distinguish authenticated declaration cores from authoritative availability. Specify how local availability can include an authenticated core that authoritative resolution excluded, while preserving the applicable byte/ID guarantees and zero local regeneration requirement. Add this targetless-Dash witness. The current frozen-offer design cannot satisfy all its stated invariants.

2. **P1 — The indication contract contradicts D757 and makes preserved Search offers unusable.**

   Plan lines 61–70 give indications only a cue and explicitly say they expose “no current position or stats”; lines 234–236 require they “never reveal current cell/stat.” D757 expressly grants an indicated character’s identity **and capabilities**, including D694 omniscience. Only current position remains restricted.

   There is also an internal mechanical contradiction:

   - Lines 77–81 exclude indications from `mechanics.combatants`.
   - Lines 103–106 retain only cores “whose every target exists in that actor’s local mechanics,” yet promise cue-pursuit cores remain unchanged.
   - Search explicitly targets the indicated character.
   - [Search validation](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver.ts:544) requires that target to exist as a combatant.

   **Runtime confirmation:** adding an observation-history cue to Room 8 produces an authentic Search offer. Resolving that original registered offer against the proposed filtered mechanics returns:

   ```text
   SEARCH_UNAVAILABLE
   ```

   **Required:** separate known capabilities from current spatial knowledge in the indication type. Preserve an authenticated Search path that consumes the sanctioned cue without requiring or inventing current target geometry. Add positive capability-exposure witnesses for both indication sources, alongside current-position negatives. The old “all stats must be a compile error” requirement is superseded for indications by D757.

3. **P2 — Thirteen batches still do not form executable compile boundaries.**

   All manifests meet their stated ten-file limits, but several omit callers compiled by `tsconfig.node.json`.

   | Batch | Static closure assessment |
   |---|---|
   | B1 | Named application constructors are covered. Authentication design remains blocked by findings 1–2. |
   | B2 | Direct registry callers found by grep are represented. |
   | **B3** | Changes `exactDmIntelMatrix`, but [monster-feature-support.test.ts:76](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/monster-feature-support.test.ts:76) and [footprint-increment-three.test.ts:205](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/footprint-increment-three.test.ts:205) migrate only in B4. B3 cannot pass its node compile gate. |
   | B4 | Direct `movementOptionsIntel` consumers are covered; this cannot repair B3 retroactively. |
   | B5 | Generated turn-context schema and its equality test are now included. |
   | B6 | Previously omitted opportunity-report callers are now included. |
   | **B7** | Boundary-only team scoring leaves authoritative calls in [offer-environment-identity.test.ts:121](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/offer-environment-identity.test.ts:121) and [hypnotic-pattern-probe.test.ts:248](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/hypnotic-pattern-probe.test.ts:248), neither in B7. |
   | B8 | Located `.feed.replace` callers are represented. |
   | B9 | Named ordinary submission/resource callers are represented; public-channel omissions remain below. |
   | B10 | Named blind projector/resolver callers and cap setup are represented. |
   | **B11** | Renaming `projectEncounterBoard` leaves callers outside this batch and outside the union: `combat/visibility.test.ts`, `board-chrome.test.ts`, `detection-ui.test.ts`, `footprint-increment-four.test.ts`, `ai-dm-screenshot-probe.ts`, and `ai-dm-blind-board-snapshot-check.ts`, among others. |
   | **B12** | Renaming authoritative capture to `captureHostBoard` leaves `.capture(...)` callers in [ai-dm-board-snapshot-check.ts:64](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-board-snapshot-check.ts:64), [ai-dm-board-glyph-captures.ts:112](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-board-glyph-captures.ts:112), and [ai-dm-screenshot-probe.ts:3601](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-screenshot-probe.ts:3601), outside its manifest and union. |
   | B13 | Cannot retroactively repair earlier compile gates. |

   **Required:** rebatch exact signature changes and renames with their callers. Distinguish additive local APIs from renamed host APIs explicitly. Recount the union afterward.

4. **P2 — Additional public receipt and pagination producers remain unspecified.**

   The original nineteen producer families and r1’s capsule readers are represented, but the expanded inventory still does not concretely close these paths:

   - [Adjudication receipts](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3561) hash authoritative `capsule.digest` **and the input containing `state_ref`**.
   - [Speculative submission](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:3455) returns `envelope.speculativePlanId`; [its producer](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/speculative-plan-submission.ts:47) hashes the authoritative-bound plan.
   - [Application pagination](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/mcp/engine-server.ts:1647), separately from journal pagination, hashes authoritative digest into exposed cursors.
   - Blind submission still returns `resolveBlindRoundIntents(...).modelResult`; its authoritative acceptance/refusal behavior needs an explicit disposition under the new private-host-outcome contract.

   **Runtime confirmation:** the same adjudication request across original/relocated/removed hidden Fighter states returns three different IDs after excluding `state_ref`:

   ```text
   adjudication:5e7ac77fb69c52ce4aef77b3e96254ba46484982f5cd7586
   adjudication:7793910d53aa724ecf1e69ac1704923b2fd796ee0f4cf92a
   adjudication:f422f00e35c0421081570722ceb889c89a6803a72264f6f4
   ```

   Section 5 explicitly contracts single/round/adjustment responses; it does not specify these additional results. “All non-state_ref provenance” is the right invariant, but needs endpoint coverage and witnesses.

   Also bound `computeHostSplitCandidates`’ ordinary `unactedPlayerIds` enumeration, not just the removed blind-Dodge exception. Its normal influence loop at `speculative-planning.ts:650–657` still merits an actor-local/shared-knowledge disposition.

5. **P2 — The collection projection table contains an unsafe retention assumption.**

   Plan line 76 retains `phase` on the premise that this group contains no participant facts. [EncounterPhase](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/encounter.ts:393) has an `awaiting_placement` arm containing:

   ```text
   combatantId
   originatingRecord
   ```

   Retaining that arm can carry a never-perceived PC’s identity into the local state, despite omitting `adjudicationPending`.

   Blanket reference-based deletion also needs semantic checks. For example, [combatantSide](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/allies.ts:25) derives a summon’s allegiance from its ownership effect. Deleting an effect because its owner is absent can change a retained summon’s side.

   **Required:** project phase exhaustively and preserve sanctioned relationship semantics independently of forbidden owner identity. Add hand-built phase and summon-allegiance witnesses. A root brand authenticates issuance; it does not establish safe contents.

6. **P2 — The supplied generation instrumentation watches the wrong offer-declaration path.**

   Plan line 368 and the supplied `/tmp/d694-generation-audit/vite.config.ts` watch:

   ```text
   /src/vtt/offer-declarations.ts
   ```

   That file does not exist. The actual module is:

   ```text
   /src/vtt/offers/offer-declarations.ts
   ```

   Therefore “0 forbidden evaluations” does not establish that offer declarations were unevaluated. A generator sentinel only proves the sentinel matched.

   **Required:** correct the path and add a negative control demonstrating detection for every forbidden module. Supplying the config closes r1’s missing-artifact problem, but not this measurement defect.

7. **P2 — BND-NPC remains open; the plan silently binds one answer.**

   Line 5 says “No owner question,” while line 65 makes **every** never-perceived opponent absent.

   - **If the owner chooses PCs and hostile NPCs alike:** that generalization is appropriate, subject to the other findings.
   - **If the owner chooses PCs only:** absence must be conditioned on the PC policy. Fully known hostile NPCs need an explicit participant/provenance classification and must remain available to applicable target selection, counts, initiative, team sets, occupancy, reactions, and PNG/HTML. The shared intersection must use that policy too, rather than requiring visual perception for every hostile.

   **Required:** mark this as an unresolved binding dependency and state both implementation deltas. Add paired PC/hostile-NPC witnesses. Do not present the broader policy as already owner-approved.

8. **P3 — Record the actual 5117001 hand derivation, not only its replacement literals.**

   Lines 182–191 correctly specify zero opponent-keyed dependencies, no radius exception, exact empty menu/scenario arrays, and separately authorized N4. Lines 344–346 identify the affected tests.

   The derivation should explicitly record: typed Dodge has no target selectors; remaining self life/resource/concentration dependencies are not movement-flippable; the actor-knowledge dependency is not a scenario-fact candidate; therefore no positive-volatility candidate remains and `compileHostScenarios([])` produces `[]`.

   This is locally supported by `speculative-planning.ts:342–348,525–527,584–585,736+`. N3’s invalid base rank and sealed entries are correctly acknowledged; this unit must not silently preserve them.

**Boundary r1 closure audit**

All quotations below refer to the reviewed plan.

| r1 finding | Revision-2 evidence | Disposition |
|---|---|---|
| P1: authoritative capsule channel | L108–114: “It has no `EngineStateCapsule`, authoritative `projection`, `digest`…”; explicitly names registry/play/skill/candidate consumers. L159–162 covers resource provenance. | Original named channels addressed at design level; overall closure remains blocked by findings 1 and 4. |
| P2: spread-forgeable brand | L39–45: constructors “lexically unavailable,” private WeakSets, and three compile negatives. | **Closed at mechanism level.** Independent in-memory TypeScript probe rejected raw state, spread overwrite, and actor rebinding; all three `@ts-expect-error` directives were consumed. |
| P2: cloned offer authentication | L94–102: “original registered objects before cloning,” wrong-environment rejection, canonical equality, and “exactly **0**” local materializations. | Clone-authentication defect addressed; complete offer contract remains blocked by findings 1–2. |
| P2: batch executability | L289–297 includes schema and opportunity callers; L314–317 permits minimal cap setup changes. | Original named omissions addressed; **still open** because of finding 3. |
| P2: incomplete submission contract | L205–215: public receipts derive locally; authoritative outcomes “never change” public responses or replay. | Ordinary single/round/adjustment contract substantially closed; additional public paths remain in finding 4. |
| P3: missing generation config | L364–374 supplies source. | Artifact omission closed; incorrect matcher remains finding 6. |
| P3: narrow witnesses | L225–249 includes removal, multiple actors, hidden stats, dead/absent/adjacent variants, indications, embedded references, narration and images. | Requested witness families are present. Indication expectations need D757 correction. |

**Reproduced probes and gate assessment**

The requested prototype results reproduce across original, relocated, and removed Fighter:

| Measurement | Result |
|---|---|
| Room 8 context, excluding exactly `state_ref` | `2ef8d941cf5b034857846fca1196ee48c4835ba06827a43cec2cc2c4bba52a59` |
| Mixed context, excluding exactly `state_ref` | `14223c06f6d1d77aaab1f22a7ce11735f4d3d76e34cd9c4ba8ef153e0e76a2a7` |
| Perceived Wizard cover | **HALF / HALF / HALF** |
| Wizard row | `61f3ddfc8ddcdd8e06a326cad62c52fe7bd957199346d4188b62f4a149a9e56a` |

Unlike the previous prototype, this revision does not delete stub-target rows after serialization. However, it constructs a runtime from filtered state and regenerates offers there. It therefore demonstrates local evaluation, **not** the frozen-authoritative-offer contract.

The normal Vite invocation failed on a read-only temporary-config write. I reproduced the probes with an in-memory Node TypeScript loader from the permitted wrapper cwd. No repository edits were needed.

D583 independently matches:

```text
recorded paths: 50
unit paths:     64
unique union:  90
baseline:     217
closure:      218
closure SHA:  f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb
```

The sole addition is `tests/unit/vtt/d694-intel-privacy.test.ts`; no accepted tests drop. This recount must be repeated after correcting the manifests.

D753 is correctly folded into the design: actor-local PNG/HTML stay on, host rendering is separate, and projection-digest/generation binding plus positive creature, cue, DOM and image mutants are specified. A zero-**all-attachments** witness is superseded; require zero authoritative attachments alongside positive actor-local delivery.

The zero annotation-suffix arithmetic is valid because neither discriminator arm is added. It does **not** prove unchanged complete annotation/context bytes. Section 8 names the prior pin dispositions and independent arithmetic requirements; findings 1–2 must be resolved before those dispositions can bind.

Every V includes the D705 checks. Red-first work, compile-negative mutants, plausible wrong-cover mutants and image mutants are specified. D630’s **36/36 within 41 seconds** and the frozen **43-fixture** pre/post gate are stated; I did not rerun those suites or generation and do not claim they passed this review.

**REJECT.** The revised shape addresses substantial r1 defects, but its current offer and indication contracts cannot satisfy the owner’s requirements, and the batches cannot yet reach their own gates.

D694-INTEL-01 BOUNDARY PLAN REVIEW R2 DONE
