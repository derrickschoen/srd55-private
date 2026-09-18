548,915
**PLAN-F12 — P2 — The reduction accidentally drops Search’s execution binding.**  
Location: [r4 line 87](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/.tmp-plans/2026-09-18-blind-01-plan.md:87), with consequences for lines 90–98 and B2’s execution witness.

R3 specified `{kind:'search', targetId, reliance:'sight'}`. R4 replaces this with `{kind:'search'}`, although D671 leaves indication pursuit unchanged.

The existing code requires those facts:

- [Search command](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/combat/events.ts:95) requires both `target` and `reliance`.
- [useTargets](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/intent-resolver.ts:130) and [resolvedUses](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/vtt/intent-resolver.ts:469) receive action uses, without the movement engagement.
- [processSearch](/home/vagrant/PhpstormProjects/dnd-wt-blind-01/src/combat/encounter.ts:4818) consumes the target and reliance.

R4 supplies no replacement binding from the indication to the executed Search. This is an unintended change outside the cover reduction. Type checks alone do not catch it: exhaustive Search handlers returning empty targets can compile.

**Exact amendment:**

> Retain r3’s main-action shape `{kind:'search', targetId, reliance:'sight'}`. Bind `targetId` to the selected actor-known indication, carry it into resolved Search, and execute the existing Search command with that target and sight reliance after movement. B2’s RED witness must assert the executed command’s target and reliance, movement-before-Search ordering, and action expenditure.

This fits the existing manifests and requires no cover work or owner decision.

The other requested checks pass:

| Check | Evidence |
|---|---|
| Cover deletion | No operative cover objective, query, scoring, approach definition, footprint pin, comparator, budget rule, or old relocation fixture survives. Remaining mentions describe deletion. **R3 F4 is moot by deletion.** |
| Unaffected safeguards | B0/KNOW-F1 cases, precedence matrix, injected-query restriction, `hiddenNow` mutant, privacy walker, F2/F3/F10/F11 amendments, ELEVATION ownership, generation gates and blocked-Web negative remain. |
| Typed identity | Real `canonicalOfferBody` preserves the stance/policy; real hashing gives distinct blind and ordinary Dodge IDs. |
| Productivity | Typed origin/`[]`/0/Dodge satisfies rule 3; ordinary stationary Dodge remains false. The v2 trace conjunction remains intact. |
| Pin ledger | Lines 238–252 use the reduced branch/action proofs and explicitly retain COHORT B9 re-derivation. |

The **hidden-distance mutant is killed**. I made the prescribed “unknown unseen PC” concrete with fixed heavy obscurement over the open 12×3 board and empty history/memories. With actor `(1,1)` and PC at `(3,1)` versus `(10,1)`:

- Real knowledge projections are identical: `unknown / never_observed`.
- Canonical menus, bodies/IDs and resolutions are byte-equal.
- Both canonical menus have **2 options**; Dodge resolves to `(1,1)`, `[]`, **0 ft**.
- The distance mutant produces **2 options versus 1**, failing equality.

The prototype used an in-memory declaration overlay with the real producer, offer hashing and resolver; it is evidence for the planned witness, not completed implementation.

Independent recounts:

| Measurement | Result |
|---|---:|
| B0–B7 path counts | **2 / 2 / 10 / 10 / 10 / 10 / 10 / 2** |
| Unique manifest paths | **53** |
| Present at b94 | **51** |
| Correctly identified exceptions | New Dodge test; COHORT v2 prerequisite |
| Initial type expansion, app/node | **15 / 17** |
| After B2-owned repairs | **6 / 8** |
| After B3-owned exhaustive repairs | **0 / 0** |
| D583 baseline/core/final | **148 / 215 / 216** |
| Expected additions | **68**, zero missing or extra |

The cover test leaves, the Dodge test enters, and the query-port test remains inherited without being edited.

Using the **43 frozen fixtures plus ten freshly generated 6209 rooms**, the in-memory typed-Dodge prototype confirms productive blind counts **55/25/40/29/36**, totaling **185/185**, including **36/36** for 6209. This distinction matters: regenerating all families instead yields **189** blind monsters, so those fresh outputs cannot replace the measured fixture population.

The actual prerequisite’s Web predicate again yields: valid resolution **true**, open productivity **true**, blocked productivity **false**, with **half cover and `blocksSight:true`**. Ordinary Dodge resolves validly but remains unproductive.

Verification used read-only Git inspection, `node <<'NODE'` runtime/inventory probes, and `node --max-old-space-size=6144` with in-memory TypeScript overlays. Verified **327 lines**, SHA-256 **`8528fc7f82aad5d25f3a10dcc15a11152b1a6a0705923a0e357a44189a8a00fc`**, branch `claude/blind-01`, HEAD `b94dd73221697e3d03da8991746726563777fa74`. Worktree remains clean; no prohibited tools or suites ran.

VERDICT: REJECT (0 P1, 1 P2, 0 P3)

BLIND-01 REVIEW R4 DONE
