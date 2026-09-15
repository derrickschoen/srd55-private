## Round 2 result

Hash verified: `0d3666644cbfa0894fd4dd064fa6bad0224ffe823bb686e2bc0d1f8b77cd6f01`.

Most round-one corrections are incorporated. **The batch execution order still cannot pass its promised TypeScript checkpoints.**

### F1 — P1: Two compiled fog consumers remain until after field deletion

[Plan:180](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp-plans/2026-09-15-visibility-field-plan.md:180) deletes runtime/setup fog in B2, but these consumers are editable only in the subsequent B6:

- `tests/unit/vtt/semantic-board-payload.test.ts:55–60` passes an explicit `foggedCells` property to `createEncounter`.
- `tests/unit/vtt/blind-context-source-binding.test.ts:679–686` returns an explicitly typed `EncounterState` containing `foggedCells`.

Both become excess-property errors when B2 removes the declarations. Their presence in the overall manifest does not resolve this execution dependency.

**Fix:** authorize their compile-only cleanup in B5, before B2. B5 would have seven files, still below the cap, with no increase in unique files. Keep their semantic work in B6.

The operation-schema blocker **is resolved**: plan **153** includes `content-pack-operation-schema.ts` in B1, alongside the new payload variant. That correctly covers its exhaustive inventory at **109–114** and form-sense schema at **595–600**.

### F2 — P2: Cover remains coupled through source-corner selection

Plan **109,168** separates physical cover from optical blocking during aggregation. That resolves `cover.ts:343–349`, but another coupling remains:

```text
cover.ts:377–381
compareCornerTraces:
  blocksSight first,
  then cover rank,
  then corner order
```

`traceSpaces` returns that selected trace at **465–470**. Consequently, fog can make the formerly preferred physical-cover corner optically blocked, causing selection of another corner with a different physical cover tier—even after the aggregation boolean is separated.

**Fix:** explicitly preserve independent physical-cover selection while deriving optical LOS. Extend `SIGHT_ONLY_BLOCKER_PRESERVES_COVER` with unequal-cover source corners where added fog changes the preferred optical corner. The existing proposed all-fog/no-terrain case would not catch this.

### F3 — P2: The D569 normalization strategy is sound, but its causal claim is unverified and misleading

Plan **230** states that removing canonical-state fog “genuinely changes only” the state-handle digest. The current source does **not** establish that mechanism:

- `engine-state-capsule.ts:924–938` hashes the capsule body.
- `projectEngineEncounterState`, **750–814**, explicitly constructs its projection without `foggedCells` or a full-state checksum.
- Option IDs hash the offer body, not canonical state: `option-modeling.ts:26–30`; `offers/offer-envelope.ts:78–90`.
- The ordinary full context explicitly serializes selected facts at `mcp/engine-server.ts:1968–2015`, not a state snapshot.
- Its external capsule reference is `state_ref.state_handle`: **433–434**.
- Context hashes at **2741–2753** belong to delta delivery; the first D569 request has no delta base (`ai-dm-conversation.ts:4261,4309`).

Thus, **removing an otherwise unused fog property does not itself require even the capsule handle to change**. Full fixture serialization changes (`engine-round-session.ts:142–153`), but those bytes are not embedded in this raw context.

The seed fixture has empty authored fog, no obscurement regions, and no sense-granting effect (`tests/fixtures/arena-basis/seed-3943001.json:1`). I found no additional raw-context digest or snapshot that necessarily changes solely because that property disappears. I cannot certify the complete revised implementation’s historical bytes from line reads.

**Disposition:** the round-one P1 about replacing independent pins is closed by retaining the historical hashes and sizes plus unrelated-content negative controls. Correct plan **230** to require demonstrated differences rather than asserting them. Try the unchanged historical check first; normalize only a demonstrated handle change. Keep **256**’s stop-on-mismatch rule. No broader normalization is justified.

## Closure of the requested checks

| Check | Ruling and evidence |
|---|---|
| **1. Exhaustive manifest** | **Inventory closed; sequencing open under F1.** My independent audit found exactly **36 files**, with no missing or extra §3.5 entries. Counts are **10/10/9/10/5/10**, 50 unique editable files. |
| **2. Unconscious observers** | **Design closed.** Plan **114–115** shares eligibility between concealment and non-owned-creature visibility and excludes Unconscious even with blindsight. This addresses the current insufficient observer filter at `visibility.ts:564–587`. Plan **190–192** names the Unconscious, stable/dying/dead, lone-PC, empty-set, and ownership checks. **Pending and absent observer tests are still not explicitly named**; add them because absence otherwise reaches throwing footprint lookup (`combat-rules.ts:83–86`). |
| **3. D569 pins** | **Independent-oracle correction closed; explanatory claim needs F3.** Plan **230–231** retains historical hashes/sizes, live binding verification, and unrelated actor/action mutations. Existing pins are at `ai-dm-board-delivery.test.ts:555–556,671–682`. No replacement output-generated constants are authorized. |
| **4. Ordinary darkness** | **Default closed; flip instructions incomplete.** Plan **104,155** has target-only ordinary darkness and both requested tests, matching D626.1 **22683**. But changing the policy also requires reversing/replacing mutant **163**, which deliberately makes ordinary darkness intervening. Under the alternative policy it becomes correct behavior and cannot be killed. Therefore **250**’s “only one clause and one test” claim is false. Re-run all field/transpose oracles after a flip. |
| **5. Truesight/fog** | **Closed.** Plan **104–105,155,164** distinguishes material fog from magical darkness. This agrees with SRD **12216–12241**, existing `encounter.ts:2236–2238`, `senses.test.ts:319–320`, and D626.1 **22682**. |
| **6. Reverse eligibility** | **Closed as the documented conditional contract.** Plan **100** explicitly excludes creature-concealment overlays; **155,220** require Invisible-subject eligibility to remain while detection refuses ordinary sight. Existing creature gates are at `encounter.ts:2217–2221`. |
| **7. Additive semantic v2** | **Closed at plan level.** Plan **124–134,220–222,234** retains v2, adds optional strict facts, redacts player output, and requires audited truncation and literal schema tests. This fits the current optional schema structure at `mcp/schemas.ts:742–755`. Parsed generated-schema equality is correctly described; see `engine-mcp-handler.test.ts:1095–1103`. |
| **8. Sense effects** | **Closed.** Plan **120,155,170–171** specifies `targets.includes(observer)`, maximum-range merge, ally casting, removal/expiry, and 120/125-foot boundaries. The existing bug is independently confirmed at `combat-rules.ts:34–41`; the always-on grant seam remains valid at `encounter.ts:1355–1375`. |
| **9. Landing dependencies** | **Closed apart from F1.** Plan **254–256** explicitly gates B2/B6 on `VIS-FIELD-OFFERS-REBASE`, checks shared symbols, repeats the audit/typechecks, and stops on historical-pin mismatch. The cited query and truncation regions exist at `engine-query-port.ts:790–829,1882–1901` and `engine-server.ts:2794–2835`. |
| **10. Empty-set/cache tracer proof** | **Substantially closed; physical selection needs F2.** Plan **109,155,169** covers omitted/empty options, historical expectations, footprints, cache ordering, and all three wrapper signatures. These correspond to actual caches at `cover.ts:420–433,494–525`. |
| **11. Concrete mutants** | **Improved, with two qualifications below.** Most now specify a source operation, wrong substitution, and named killer. |
| **12. Cache transitions** | **Closed.** Plan **155** explicitly names movement, light, obscurement-end, and sense-removal transitions, checking both new results and unchanged old-state fields. This matches the immutable replacement pattern, e.g. `encounter.ts:11775–11782`. |
| **13. Scope growth/simplicity** | **Six added files are justified**, detailed below. No new algorithm, compatibility producer, or v3 migration was introduced. |

### Mutant qualifications

**The serializer sentinel mechanism is real.** `semanticBoardPayload` already accepts a projection (`semantic-board-payload.ts:383–388`). Supplying independently chosen, valid cells that disagree with what geometry would recompute distinguishes encoding from recomputation. Use valid in-bounds sentinels; “impossible” should mean impossible under the fixture’s geometry, not malformed input.

That establishes the two mutations **at the serializer location specified in plan 222**. It does not independently prove that the internal reverse-evaluator implementation contains no duplicated ladder.

**P2:** `GENERATED_FOG_CELLS_RETAINED` at plan **202** references `layout.fog.cells` after the plan removes that schema property. The current typed access is at `generated-encounter-fixtures.ts:812–832`. As specified, this becomes a compile-error control rather than a behavioral mutant killed by the named test. Either label it accordingly or use a compile-valid mutation that improperly accepts an obsolete input property.

## Audit-only dispositions and added files

All nine actual audit-only references can remain:

- Renderer/projection consumers: `accessible-board.ts:182`, `encounter-app.ts:2199–2203`, `accessible-board.test.ts:57–67`.
- Renderer fixtures: `board-glyphs.test.ts:572`, `encounter-board-art.test.ts:43–53`, `generate-starter-art.ts:115`.
- Untyped historical serialized fixtures: `creature-space-migration-fixtures.ts:1–26`, `pre-last-seen-v11-save.ts:1–30`.
- Player-boundary type assertion: `projection-types.test.ts:12`.

**Plan 226 says 11 audit-only files; the actual count is nine.** Correct the bookkeeping.

The increase from 44 to 50 editable files is justified:

| Added file | Concrete reason |
|---|---|
| `src/content/content-pack-operation-schema.ts` | Exhaustive payload inventory **109–114**, form senses **595–600**. |
| `tools/vtt-soak.ts` | Removed setup property read at **174**. |
| `tools/vtt-experiment.ts` | Removed runtime property read at **1339**. |
| `tests/unit/vtt/experiment-orchestrator.test.ts` | Obsolete runtime expectation at **1102**. |
| `tools/ai-dm-screenshot-probe.ts` | Synthetic runtime fog mutation at **2414**; compile cleanup is necessary. |
| `tools/ai-dm-blind-board-snapshot-check.ts` | Runtime fog comparison at **116** must consume the projection; that file already uses the DM projection at **120**. |

## Verification performed

Executed `sha256sum`, numbered source/plan/decision reads, targeted `rg`, and a Python comparison of the lexical audit against §3.5 and the batch manifests.

Results: **256 lines, eight numbered sections, 50 unique editable files, 36/36 audited references assigned, nine audit-only references**. No tests were retried, no files were edited, and the working tree remained clean.

**REJECT PLAN — Findings: P1 B2 deletes fog before two B6 test consumers are cleaned up. P2 remaining cover-selection coupling, unsupported D569 causal claim, incomplete darkness-flip/mutant instructions, and missing explicit pending/absent observer tests.**
tokens used
224,260
## Round 2 result

Hash verified: `0d3666644cbfa0894fd4dd064fa6bad0224ffe823bb686e2bc0d1f8b77cd6f01`.

Most round-one corrections are incorporated. **The batch execution order still cannot pass its promised TypeScript checkpoints.**

### F1 — P1: Two compiled fog consumers remain until after field deletion

[Plan:180](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp-plans/2026-09-15-visibility-field-plan.md:180) deletes runtime/setup fog in B2, but these consumers are editable only in the subsequent B6:

- `tests/unit/vtt/semantic-board-payload.test.ts:55–60` passes an explicit `foggedCells` property to `createEncounter`.
- `tests/unit/vtt/blind-context-source-binding.test.ts:679–686` returns an explicitly typed `EncounterState` containing `foggedCells`.

Both become excess-property errors when B2 removes the declarations. Their presence in the overall manifest does not resolve this execution dependency.

**Fix:** authorize their compile-only cleanup in B5, before B2. B5 would have seven files, still below the cap, with no increase in unique files. Keep their semantic work in B6.

The operation-schema blocker **is resolved**: plan **153** includes `content-pack-operation-schema.ts` in B1, alongside the new payload variant. That correctly covers its exhaustive inventory at **109–114** and form-sense schema at **595–600**.

### F2 — P2: Cover remains coupled through source-corner selection

Plan **109,168** separates physical cover from optical blocking during aggregation. That resolves `cover.ts:343–349`, but another coupling remains:

```text
cover.ts:377–381
compareCornerTraces:
  blocksSight first,
  then cover rank,
  then corner order
```

`traceSpaces` returns that selected trace at **465–470**. Consequently, fog can make the formerly preferred physical-cover corner optically blocked, causing selection of another corner with a different physical cover tier—even after the aggregation boolean is separated.

**Fix:** explicitly preserve independent physical-cover selection while deriving optical LOS. Extend `SIGHT_ONLY_BLOCKER_PRESERVES_COVER` with unequal-cover source corners where added fog changes the preferred optical corner. The existing proposed all-fog/no-terrain case would not catch this.

### F3 — P2: The D569 normalization strategy is sound, but its causal claim is unverified and misleading

Plan **230** states that removing canonical-state fog “genuinely changes only” the state-handle digest. The current source does **not** establish that mechanism:

- `engine-state-capsule.ts:924–938` hashes the capsule body.
- `projectEngineEncounterState`, **750–814**, explicitly constructs its projection without `foggedCells` or a full-state checksum.
- Option IDs hash the offer body, not canonical state: `option-modeling.ts:26–30`; `offers/offer-envelope.ts:78–90`.
- The ordinary full context explicitly serializes selected facts at `mcp/engine-server.ts:1968–2015`, not a state snapshot.
- Its external capsule reference is `state_ref.state_handle`: **433–434**.
- Context hashes at **2741–2753** belong to delta delivery; the first D569 request has no delta base (`ai-dm-conversation.ts:4261,4309`).

Thus, **removing an otherwise unused fog property does not itself require even the capsule handle to change**. Full fixture serialization changes (`engine-round-session.ts:142–153`), but those bytes are not embedded in this raw context.

The seed fixture has empty authored fog, no obscurement regions, and no sense-granting effect (`tests/fixtures/arena-basis/seed-3943001.json:1`). I found no additional raw-context digest or snapshot that necessarily changes solely because that property disappears. I cannot certify the complete revised implementation’s historical bytes from line reads.

**Disposition:** the round-one P1 about replacing independent pins is closed by retaining the historical hashes and sizes plus unrelated-content negative controls. Correct plan **230** to require demonstrated differences rather than asserting them. Try the unchanged historical check first; normalize only a demonstrated handle change. Keep **256**’s stop-on-mismatch rule. No broader normalization is justified.

## Closure of the requested checks

| Check | Ruling and evidence |
|---|---|
| **1. Exhaustive manifest** | **Inventory closed; sequencing open under F1.** My independent audit found exactly **36 files**, with no missing or extra §3.5 entries. Counts are **10/10/9/10/5/10**, 50 unique editable files. |
| **2. Unconscious observers** | **Design closed.** Plan **114–115** shares eligibility between concealment and non-owned-creature visibility and excludes Unconscious even with blindsight. This addresses the current insufficient observer filter at `visibility.ts:564–587`. Plan **190–192** names the Unconscious, stable/dying/dead, lone-PC, empty-set, and ownership checks. **Pending and absent observer tests are still not explicitly named**; add them because absence otherwise reaches throwing footprint lookup (`combat-rules.ts:83–86`). |
| **3. D569 pins** | **Independent-oracle correction closed; explanatory claim needs F3.** Plan **230–231** retains historical hashes/sizes, live binding verification, and unrelated actor/action mutations. Existing pins are at `ai-dm-board-delivery.test.ts:555–556,671–682`. No replacement output-generated constants are authorized. |
| **4. Ordinary darkness** | **Default closed; flip instructions incomplete.** Plan **104,155** has target-only ordinary darkness and both requested tests, matching D626.1 **22683**. But changing the policy also requires reversing/replacing mutant **163**, which deliberately makes ordinary darkness intervening. Under the alternative policy it becomes correct behavior and cannot be killed. Therefore **250**’s “only one clause and one test” claim is false. Re-run all field/transpose oracles after a flip. |
| **5. Truesight/fog** | **Closed.** Plan **104–105,155,164** distinguishes material fog from magical darkness. This agrees with SRD **12216–12241**, existing `encounter.ts:2236–2238`, `senses.test.ts:319–320`, and D626.1 **22682**. |
| **6. Reverse eligibility** | **Closed as the documented conditional contract.** Plan **100** explicitly excludes creature-concealment overlays; **155,220** require Invisible-subject eligibility to remain while detection refuses ordinary sight. Existing creature gates are at `encounter.ts:2217–2221`. |
| **7. Additive semantic v2** | **Closed at plan level.** Plan **124–134,220–222,234** retains v2, adds optional strict facts, redacts player output, and requires audited truncation and literal schema tests. This fits the current optional schema structure at `mcp/schemas.ts:742–755`. Parsed generated-schema equality is correctly described; see `engine-mcp-handler.test.ts:1095–1103`. |
| **8. Sense effects** | **Closed.** Plan **120,155,170–171** specifies `targets.includes(observer)`, maximum-range merge, ally casting, removal/expiry, and 120/125-foot boundaries. The existing bug is independently confirmed at `combat-rules.ts:34–41`; the always-on grant seam remains valid at `encounter.ts:1355–1375`. |
| **9. Landing dependencies** | **Closed apart from F1.** Plan **254–256** explicitly gates B2/B6 on `VIS-FIELD-OFFERS-REBASE`, checks shared symbols, repeats the audit/typechecks, and stops on historical-pin mismatch. The cited query and truncation regions exist at `engine-query-port.ts:790–829,1882–1901` and `engine-server.ts:2794–2835`. |
| **10. Empty-set/cache tracer proof** | **Substantially closed; physical selection needs F2.** Plan **109,155,169** covers omitted/empty options, historical expectations, footprints, cache ordering, and all three wrapper signatures. These correspond to actual caches at `cover.ts:420–433,494–525`. |
| **11. Concrete mutants** | **Improved, with two qualifications below.** Most now specify a source operation, wrong substitution, and named killer. |
| **12. Cache transitions** | **Closed.** Plan **155** explicitly names movement, light, obscurement-end, and sense-removal transitions, checking both new results and unchanged old-state fields. This matches the immutable replacement pattern, e.g. `encounter.ts:11775–11782`. |
| **13. Scope growth/simplicity** | **Six added files are justified**, detailed below. No new algorithm, compatibility producer, or v3 migration was introduced. |

### Mutant qualifications

**The serializer sentinel mechanism is real.** `semanticBoardPayload` already accepts a projection (`semantic-board-payload.ts:383–388`). Supplying independently chosen, valid cells that disagree with what geometry would recompute distinguishes encoding from recomputation. Use valid in-bounds sentinels; “impossible” should mean impossible under the fixture’s geometry, not malformed input.

That establishes the two mutations **at the serializer location specified in plan 222**. It does not independently prove that the internal reverse-evaluator implementation contains no duplicated ladder.

**P2:** `GENERATED_FOG_CELLS_RETAINED` at plan **202** references `layout.fog.cells` after the plan removes that schema property. The current typed access is at `generated-encounter-fixtures.ts:812–832`. As specified, this becomes a compile-error control rather than a behavioral mutant killed by the named test. Either label it accordingly or use a compile-valid mutation that improperly accepts an obsolete input property.

## Audit-only dispositions and added files

All nine actual audit-only references can remain:

- Renderer/projection consumers: `accessible-board.ts:182`, `encounter-app.ts:2199–2203`, `accessible-board.test.ts:57–67`.
- Renderer fixtures: `board-glyphs.test.ts:572`, `encounter-board-art.test.ts:43–53`, `generate-starter-art.ts:115`.
- Untyped historical serialized fixtures: `creature-space-migration-fixtures.ts:1–26`, `pre-last-seen-v11-save.ts:1–30`.
- Player-boundary type assertion: `projection-types.test.ts:12`.

**Plan 226 says 11 audit-only files; the actual count is nine.** Correct the bookkeeping.

The increase from 44 to 50 editable files is justified:

| Added file | Concrete reason |
|---|---|
| `src/content/content-pack-operation-schema.ts` | Exhaustive payload inventory **109–114**, form senses **595–600**. |
| `tools/vtt-soak.ts` | Removed setup property read at **174**. |
| `tools/vtt-experiment.ts` | Removed runtime property read at **1339**. |
| `tests/unit/vtt/experiment-orchestrator.test.ts` | Obsolete runtime expectation at **1102**. |
| `tools/ai-dm-screenshot-probe.ts` | Synthetic runtime fog mutation at **2414**; compile cleanup is necessary. |
| `tools/ai-dm-blind-board-snapshot-check.ts` | Runtime fog comparison at **116** must consume the projection; that file already uses the DM projection at **120**. |

## Verification performed

Executed `sha256sum`, numbered source/plan/decision reads, targeted `rg`, and a Python comparison of the lexical audit against §3.5 and the batch manifests.

Results: **256 lines, eight numbered sections, 50 unique editable files, 36/36 audited references assigned, nine audit-only references**. No tests were retried, no files were edited, and the working tree remained clean.

**REJECT PLAN — Findings: P1 B2 deletes fog before two B6 test consumers are cleaned up. P2 remaining cover-selection coupling, unsupported D569 causal claim, incomplete darkness-flip/mutant instructions, and missing explicit pending/absent observer tests.**
