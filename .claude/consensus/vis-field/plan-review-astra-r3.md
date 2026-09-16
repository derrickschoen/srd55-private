**No blocking findings remain. Accept with the binding P2 implementation note below.**

Verified plan SHA-256: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.

Plan references below refer to [.tmp-plans/2026-09-15-visibility-field-plan.md](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/.tmp-plans/2026-09-15-visibility-field-plan.md).

## Round-two findings

### 1. F1 — manifest and removal sequencing: closed

The two previously stranded consumers are real typed inputs:

- `tests/unit/vtt/semantic-board-payload.test.ts:55–60`: `createEncounter({ … foggedCells … })`.
- `tests/unit/vtt/blind-context-source-binding.test.ts:679–686`: explicitly typed `EncounterState` return containing `foggedCells`.

Both now belong to B5, with their exact cleanup specified at **plan:218–226**, before B2 deletes the field.

I independently reran the compiled-reference audit and compared its paths against §3.5: **36 files, zero missing, zero extra**.

The source-level boundary walk is sound:

| Boundary | Why field removal does not break compilation |
|---|---|
| B1 | Retains the declaration and existing consumers; includes operation-schema changes alongside the new payload/sense variants. |
| B3 | Removes projection/test consumption while retaining the state shape. |
| B4 | Removes authored setup inputs; the setup property remains optional temporarily. |
| B5 | Cleans remaining tool and test consumers, including both previously missed properties. |
| B2 | Removes final runtime readers and the declaration atomically. |
| B6 | Adds semantic projection/schema behavior without reintroducing runtime fog. |

Evidence: **plan:178,190,202,214,226,238**. The operation schema belongs in B1: its exhaustive inventory at `src/content/content-pack-operation-schema.ts:109–114` and sense union at `:595–600` must change with those variants.

This verifies structural feasibility, **not executed TypeScript success**.

### 2. F2 — cover selection coupling: closed

Current code couples sight to cover twice:

- `src/combat/cover.ts:343–349`: blocked sight produces total cover.
- `:377–381,465–468`: sight status influences the selected source corner.

**Plan:110** now specifies an implementable separation: physical rank/corner ordering selects physical results; optical visibility aggregates across all source corners; optical comparison supplies blocker evidence only. **Plan:169–170** supplies separate mutations for aggregation and corner selection.

The required unequal-cover fixture explicitly makes fog change the preferred optical corner while preserving physical corner/tier. That catches the previously missed coupling.

The empty-set equivalence is also credible: under existing physical-only aggregation, blocked aggregates receive total cover, while unblocked aggregates are capped at three-quarters (`cover.ts:347–352`). Consequently, removing the redundant sight-first ordering preserves the old ordering when optical blockers are absent. The full-trace test and cache transition remain required at **plan:110,156,171**.

### 3. F3 — D569 causal claim and pins: closed

**Plan:244–245** now requires unchanged historical checks first and makes normalization conditional on demonstrated evidence.

This matches the source:

- `tests/unit/tools/ai-dm-board-delivery.test.ts:549–556` checks live capsule binding, 31,995 bytes, and the historical hash.
- `:669–682` preserves the existing scoped policy/handle substitutions and historical 32,000-byte/hash checks.
- Ordinary context uses selected facts at `src/vtt/mcp/engine-server.ts:1968–2015`; capsule projection uses explicit fields at `src/vtt/engine-state-capsule.ts:750–814,924–938`.

The revised plan correctly avoids asserting that removing canonical fog necessarily changes the handle.

The stop condition is sufficient: changed length, another parsed field, or protected-content mismatch stops implementation. Retaining the historical hash also catches same-length serialization/order differences. Unrelated actor/action mutations must still fail. No new constants or broader normalization are authorized.

### 4–7. Remaining explicit corrections: closed

| Item | Verified closure |
|---|---|
| Darkness flip | **Plan:264** names the inverse mutant and inverse killing test, requires all affected oracle families to rerun, and withdraws the “one clause and one test” claim. |
| Pending/absent observers | **Plan:196** names both tests, including no-throw behavior. This matters because `src/combat/combat-rules.ts:83–86` throws for absent placement. |
| Generated fog control | **Plan:210** correctly labels it a compile-time negative control, with a separate runtime contract assertion. The current typed layout/property use is at `src/vtt/generated-encounter-fixtures.ts:144–149,828–832`. |
| Nine audit-only files | **Plan:240** matches the audit: accessible-board/app, accessible-board test, two asset tests, starter-art generator, two historical fixture modules, and projection-types test. Their references are projection properties, untyped historical inputs, or an absence assertion—not surviving `EncounterState` readers. |

### 8. Serializer scope: closed, with one binding note

**Plan:232–234** now correctly limits the sentinel proof. Independently chosen, valid cells that contradict geometry detect serializer recomputation; they do not prove that no internal duplicate evaluator exists. The existing projection/serialization seam at `src/vtt/semantic-board-payload.ts:383–388` supports this test.

**P2 — make the architecture assertion stage-aware and call-path-specific.**

The full `SIGHT_TRACER_HAS_SINGLE_OWNER` scope cannot pass during B1: the query-port detector still directly traces at `src/vtt/engine-query-port.ts:795–800` until B2. Moreover, banning the tracer import throughout that file would incorrectly reject legitimate physical-cover calls at `:1223` and `:1597`.

Carry these requirements into implementation:

- B1 checks migrated field/detection paths.
- B2 extends the assertion to query detection and actor knowledge.
- B6 covers semantic projection and serialization.
- Enumerate `visibility-field.ts`, `encounter.ts`, `visibility.ts`, `engine-query-port.ts`, `intel/actor-knowledge.ts`, and `semantic-board-payload.ts`; inspect relevant calls/delegation, allowing physical-cover callers.
- Verify actual-observer and virtual-observer aggregation reach the same internal evaluator. An import-only assertion cannot establish that fact.

The already-allowed test files can host these staged checks. This clarification needs no additional producer, compatibility layer, or manifest expansion.

## Compliance and regression assessment

- **270 lines; eight sections; batches 10/10/9/10/7/10; 50 unique editable files.**
- All batches specify RED tests and both TypeScript commands.
- The six additions over r1 address schema exhaustiveness and existing compiled consumers; they are justified cleanup, not additional architecture.
- B2/B6 remain gated on `VIS-FIELD-OFFERS-REBASE`; landing order remains offers → visibility → actor knowledge (**plan:268–270**).
- No new conflict found with D626/D626.1/D627, the owner’s simplicity mandate, or the prohibition on regenerating retained expectations.

**Commands/evidence:** `sha256sum`, numbered `nl -ba … | sed -n …` source reads, and the specified `rg -l foggedCells …` audit with a read-only Python manifest comparison. No tests, edits, model calls, or git writes were performed.

ACCEPT PLAN
