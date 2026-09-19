# D694-INTEL-01 boundary plan — astra HIGH review r3 (session 01a0bb70-82be-7031-add8-b0d292498462, plan sha 128644da…)

**REJECT — 1 P1, 4 P2, 2 P3.**

Reviewed `be09e575` and the exact plan SHA supplied. No repository changes or agent/model calls were made.

The saved r1/r2 reviews and fix log are absent from this checkout; `.claude/consensus/d694-intel-01/` is empty. Therefore, the closure assessment below uses the r2 findings enumerated in your request, not the unavailable original review text.

1. **P1 — The promised hidden-blocker execution behavior is not implemented by the existing executor, and no batch owns the necessary change.**

   Plan lines 84–87 promise application through the “existing resolver/executor”; lines 206–218 promise private execution, no authoritative offer generation, partial legal execution, and subsequent perception.

   The corridor probe demonstrates the missing behavior: the same registered local **Dash** resolves successfully without the blocker but returns `OPTION_UNREACHABLE` with it. The existing [session executor](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/engine-round-session.ts:579) then selects fallback, throws for `strictNoFallback`, or **generates authoritative offers** to find Dodge at line 601. It does not execute the legal prefix of the selected local movement or establish the promised perception transition.

   `engine-round-session.ts` and its execution tests are absent from all thirteen batch manifests. Relabeling its result `executed_as_far_as_legal` cannot supply the missing mechanics.

   **Required:** explicitly plan the host execution increment, its caller closure, and reducer-backed witnesses proving legal-prefix execution, no unauthorized fallback/regeneration, blocker discovery, and the next revision’s projected knowledge.

2. **P2 — The mixed perceived-plus-indicated Search requirement conflicts with the unchanged builder’s branching.**

   Plan lines 235–237 explicitly require:

   > “One perceived opponent plus a different indication-only opponent … indication exposes identity/capabilities plus current `KnownIndication` and Move + Search”

   However, [projectTurnKnowledge](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intel/actor-knowledge.ts:278) returns `normal` immediately when any opponent is perceived. The unchanged [D671 declaration builder](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/offer-declarations.ts:436) emits Search only in its separate `pursue_indication` branch.

   I probed a retained capability combatant with an observation-history cue and no token, alongside a perceived Wizard. Result:

   - Fighter knowledge: `suspected`, with the stored cell.
   - Turn branch: `normal`.
   - Offers: Dash, Dodge, End Turn, Spear→Wizard; **no Search**.
   - The supplied offer-audit prototype additionally drops this indicated Fighter because it collects indications only from `turn.branch === 'pursue_indication'`.

   The D757 capability correction is sound, but this mixed-case behavior remains unresolved. Specify how it works while respecting D759’s unchanged-builder constraint, or correct the promised mixed-case offer contract under the appropriate ruling.

3. **P2 — The prescribed mechanics projection is not compatible with the unchanged builder’s history dependencies.**

   Plan line 64 says:

   > “eventLog/dmNotes/hiddenCombatants/adjudicationPending | omit”

   Yet both [offer declaration](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/offers/offer-declarations.ts:524) and [option validation](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/vtt/intent-resolver.ts:539) consult `eventLog` to determine whether a once-use world-object action was spent.

   A probe using a world object validated by `assertWorldObjectInput` produced:

   | Projection | Result |
   |---|---|
   | Actor’s recorded lever use retained | Lever action absent |
   | `eventLog: []` | `pull @ Review lever` reappears |
   | `eventLog` omitted | Runtime exception |

   The offer-audit prototype retains history through `...state`, so its successful results do **not** verify this prescribed omission.

   **Required:** define the safe mechanical representation of already-spent world-object actions and other history-derived availability, with hand-authored positive/negative witnesses. Also explicitly project `worldObjects.classActions.controllerPriority.actor` and `dmOverride.actor/reasoning`: [these fields exist](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/src/combat/world-objects.ts:32), so this collection cannot simply be treated as participant-free.

4. **P2 — The execution receipt table contradicts its byte-invariance acceptance test.**

   Plan lines 212–214 distinguish:

   - valid authoritative execution → `executed`;
   - hidden obstacle/conflict → `executed_as_far_as_legal`.

   Lines 219–221 nevertheless require complete execution responses to:

   > “compare identical after deleting exactly `state_ref` … [including] a hidden variant that changes … movement validity”

   The corridor witness exercises precisely this distinction. Those status strings cannot be byte-identical.

   D759 explicitly authorizes the partial-execution outcome; this finding does not challenge that ruling. The plan must distinguish **pre-execution noninterference** from **permitted execution observations**, specify exactly what becomes observable and when, and test each separately. Currently, an implementation cannot satisfy both acceptance clauses.

5. **P2 — Per-batch caller closure remains incomplete, particularly B7/B9.**

   The r2 matrix/scorer omissions were repaired, but further required callers remain:

   - B9 migrates prompt producers to opaque local inputs. [tests/helpers/legacy-advice-surface.ts:115](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/helpers/legacy-advice-surface.ts:115) directly calls `renderEnginePrompt` with an authoritative capsule. This helper is outside **every** manifest and is included through `tsconfig.node.json`’s `tests` coverage.
   - B7’s speculative producer migration must account for `buildHostScenarioMenu` callers in [conversation](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tools/ai-dm-conversation.ts:4688), [handler tests](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/engine-mcp-handler.test.ts:758), and [server tests](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/tools/engine-mcp-server.test.ts:126). None belongs to B7. Their earlier edits do not specify migration of these calls.
   - B9 changes speculative submission’s local digest/input contract, but its direct [speculative-planning test caller](/home/vagrant/PhpstormProjects/dnd-wt-cohort-01/tests/unit/vtt/speculative-planning.test.ts:638) is scheduled in B7, without a stated additive transition.

   Explicitly assign the signature transitions and their callers. An additive host/local split is acceptable where specified; leaving model-producing callers on authoritative inputs is not. Rebalance the ten-file limits and recount the manifests afterward.

6. **P3 — The documented D630 invocation is not executable in this checkout.**

   Installed Vitest is **4.1.10**, consistent with `package.json`. The exact command rejects `--minWorkers`. Removing it reveals that the wrapper config needs an explicit repository root to discover these tests. With that root and `--configLoader runner`, loading then fails on temporary-directory creation under this read-only sandbox.

   Thus **36/36 ≤41 seconds was not verified**. Record a working invocation and supported environment. The final temporary-directory failure is an environment limitation, not evidence of a test regression.

7. **P3 — Preserve the missing review/probe evidence needed to reproduce the claimed audit.**

   Restore or attach the prior reviews/fix log. Neither supplied probe file contains the corridor construction corresponding to the recorded `f4c1d44e…` / `5d3ae0e2…` hashes. My independently constructed corridor reproduces offer invariance, but its hashes differ; I cannot certify the quoted corridor hashes without that exact input.

The requested r2 closure assessment is:

| r2 finding | R3 disposition and plan evidence |
|---|---|
| P1 offer membership | **Closed for local generation/membership.** Lines 73–79: “once per actor per revision” and “authoritative offers … never reach model ingress.” Probe confirms local offer invariance. Host execution remains P1 above. |
| P1 indication/D757/Search | **Partially closed.** Lines 42–46 retain identity/full capabilities while forbidding token/current position. Mixed-case Search remains P2. |
| P2 B3/B7/B11/B12 manifests | **Named repairs confirmed.** B3 includes matrix callers; B7 includes scorer tests; lines 155–156 and 330–343 make host board/capture APIs additive. Broader batch closure remains P2. |
| P2 receipts, IDs, pagination, blind result, player enumeration | **Explicitly addressed, with receipt conflict remaining.** Lines 175–176 restrict `unactedPlayerIds`; 190–204 cover IDs/proofs/cursors and local blind `modelResult`; 219–221 overstate execution invariance. |
| P2 phases/summon collections | **Named omissions closed in the contract.** Lines 56–67 cover phase arms, embedded phase references, and snapshotted summon allegiance. History-dependent mechanics remain a separate gap. |
| P2 generation audit path/controls | **Closed.** Lines 390–408 watch `src/vtt/offers/offer-declarations.ts` and require four negative controls. Runtime controls succeeded. |
| P2 BND-NPC | **Closed as an explicit dependency, not a policy decision.** Line 48 presents both deltas and prohibits silent selection. |
| P3 seed 5117001 derivation | **Closed.** Lines 171–176 derive empty menus from selector-free Dodge, non-movement-flippable self dependencies, and exclusion of the knowledge arm. Source supports that derivation. |

I checked all thirteen batch manifests against the relevant definitions/callers:

| Batch | Assessment |
|---|---|
| B1 | Boundary issuance/local-offer scope identified; must resolve history/cue mechanics above. |
| B2 | Registry/play/skill caller set accounted for. |
| B3 | Matrix/capture/calibration callers now accounted for. |
| B4 | Movement caller covered; explicit additive relation API needed to preserve host callers. |
| B5 | Schema/annotation carriers and handler equality gate specified. |
| B6 | Opportunity callers, including conversation and pin tests, accounted for. |
| B7 | Scorer repair confirmed; speculative caller transition incomplete. |
| B8 | Located `.feed.replace` callers are included. |
| B9 | Missing prompt helper and speculative submission transition. |
| B10 | Blind projector callers included; cap-setup approval dependency remains explicit. |
| B11 | Additive board API avoids the prior host-caller break. |
| B12 | Additive capture API avoids the prior host-caller break. |
| B13 | Capture/pin work identified; cannot repair an earlier compile gate retroactively. |

Lines 271–274 put both TypeScript checks, architecture self-test/check, command-outcome check, and serial suites in every V. Lines 255–267 name the requested compile-negative and plausible-value mutants. The remaining issue is executable ownership of the missing behavior and callers.

Verification results:

- **Offers:** reproduced **28/34 identical fixture paths**, including all acting monsters in **5117005**, **Room 8**, and **3943001**. The six changed paths are correctly enumerated: `5117009`, `6209002`, `6209009`, `6210002`, `6210007`, `6210010`. Lines 365–371 require independent derivation, including additions and changed Entangle targets. All three productivity tuples matched.
- **Annotation bytes:** lines 130–136 explicitly withdraw the withheld annotation arm. Current `tacticalOptions` has no `knowledge_status` field, so adding no annotation discriminator supports **zero structural annotation-byte addition**. This does not prove unchanged annotation values or whole-context bytes.
- **5117009 contamination:** HALF/HALF/HALF reproduced. Wizard row SHA: `61f3ddfc8ddcdd8e06a326cad62c52fe7bd957199346d4188b62f4a149a9e56a`. Context excluding `state_ref`: `14223c06f6d1d77aaab1f22a7ce11735f4d3d76e34cd9c4ba8ef153e0e76a2a7`.
- **Room 8:** context excluding `state_ref` reproduced across original/relocated/removed: `2ef8d941cf5b034857846fca1196ee48c4835ba06827a43cec2cc2c4bba52a59`.
- **Independent corridor:** all three variants produced local-state SHA `224c37811f5c21aefc9ca5fc59ed3012ebdd20a906fdea593bd28351340c2e42` and offer SHA `9bf5b2bf9c9a673d12daff517c0fc7fbb3a9b2a12a57337ff3c33e06e81a82a3`.
- **D583:** reproduced recorded **50**, unit **67**, union **93**, closure **218**, SHA `f5bf19bddae37da3bd4a48cc54d253d76026adf09a949902ce4d2187339ca4bb`; sole added spec is `d694-intel-privacy.test.ts`.
- **Generation controls:** all four expected labels appeared exactly once using the specified path matching and an in-memory logging sink. The full 43-file generation comparison was not rerun because it requires filesystem output.

The proposed nominal boundary is sound at the design level: non-exported classes with private `#brand`, opaque aliases, lexical construction, WeakSet issuance checks, and spread/authoritative-input compile negatives prevent ordinary structural forgery. The 27-family inventory covers the MCP/tool producers inspected, and the image contract explicitly covers local PNG/HTML, projection provenance, generation consistency, zero authoritative attachments, and positive local delivery. Never-perceived participants are absent; indicated participants retain D757 capabilities, so the earlier HP/AC/slots-forbidden stub requirement no longer applies to them.

Those improvements do not resolve the execution gap, mixed indication behavior, history-dependent availability, contradictory receipt tests, or remaining caller transitions. The plan should not bind in its current form.

D694-INTEL-01 BOUNDARY PLAN REVIEW R3 DONE
