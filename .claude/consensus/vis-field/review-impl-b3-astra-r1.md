No remaining P1/P2 findings. **B3 satisfies the frozen plan and D626.7–D626.10 amendments.**

### Scope and semantics — read and verified

- Diff contains exactly **7 files, 432 insertions / 31 deletions**. No tests deleted.
- Frozen-plan SHA matches `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- `visibility-field.test.ts:1223` changes only the stage-aware import assertion and its comment. Query-port, actor-knowledge and semantic serializer boundaries remain enforced.
- The D359 test retains its exact title at `visibility.test.ts:526`; its creature-exclusion assertion at `:557` still kills `fogged_cell_leaks`. The corresponding ledger entry remains at `mutation-ledger.test.ts:362–385`.

The shared eligibility predicate at `visibility-field.ts:437–451` requires a placed, living, non-pending observer without effective Unconscious. Its callers correctly apply:

| Path | Evidence |
|---|---|
| DM view: eligible player characters | `visibility.ts:505–506,523` |
| Seat concealment: eligible owned characters | `visibility.ts:563–567` |
| Non-owned creature visibility: those same eligible IDs | `visibility.ts:593–594` |
| DM board fog | `encounter-board.ts:614,716` |

Hidden redaction remains separate. The authored-fog footprint veto is removed. `visibility.test.ts:366–375` asserts **set equality**, with an independent literal expected fog set.

### Snapshot pins — independently reproduced

I loaded the exact pre-B3 `visibility.ts` from `d341a9fe` through an in-memory module transform and used the unchanged snapshot fixture. All three historical hashes reproduced:

```text
pendingRequestHash a0e19e534b070ffc1a82b2f303588573578852bc75720abd780af7e749e0d44a
coordinatorHash    336fc59733a7f90a51b0cb1dbe95ce690a411ef0dab428fc5ef3c9f1e5344f22
revisionChecksum   519a01b4fdcc4f02bf8f8c925c8ec70acd09443924944bac454dcb293a751d3d
```

The complete field comparison found **only `cells` and `concealedCells` changed**. Restoring those two fields restored byte-identical view/coordinator serialization and all three historical hashes. The independent probe passed: **1 passed, 8 skipped**.

The new concealed set is exactly `{(4,3)}`: **69 visible cells, 1 concealed**. Fixture evidence: `reference-encounter.ts:112–126` and `scene-snapshot.test.ts:33–57`.

Requested corner rays from the fighter’s footprint:

| Target | Clear ray |
|---|---|
| `(7,3)` | `(3,3) → (7,3)` |
| `(8,3)` | `(3,3) → (8,3)` |
| `(8,4)` | `(3,4) → (8,4)` |

The first two run along blocker boundaries at `y=3`; the third follows the shared boundary at `y=4`. They do not enter blocker interiors. **The edge-touch rule clears them**, as implemented at `cover.ts:71–98`.

Cells above/below the blockers have rays passing above/below their interiors; nearer columns need not cross them. Only the dark target `(4,3)` remains unseen. Ordinary darkness there does not obstruct rays to other targets.

The unrelated-content checksum negative control remains at `scene-snapshot.test.ts:251–265`.

### Caches and performance — read

`visibility-field.ts:339–358` caches actual observer evaluations by **state identity, observer ID and cell**. `:454–471` caches derived fog by **state identity and observer-ID key**, and `.some()` short-circuits after the first seeing observer.

Pairwise sight, full fields and fog reuse actual observer-cell evaluations. Virtual observers bypass that cache. Also, `projectDmView` creates a new state root (`visibility.ts:509`), so subsequent board projection can repeat equivalent geometry under a **different state identity**; it does not violate the per-state bound.

I found no supported production path mutating the cached state in place. Reducer paths replace roots and affected collections; the new diff introduces no mutation path. This remains an identity-cache contract, not runtime deep-freezing.

**Supervisor timing evidence, not rerun by me:** 38.0 seconds, approximately **13.1% above main**, below D630’s **42-second** ceiling.

### In-memory mutations — ran

All seven were applied and killed; **zero survivors**. Each targeted run produced **1 failed / 21 skipped**, exit 1.

| Mutation | Killing test |
|---|---|
| `FOG_STILL_AUTHORED` | `AUTHORED_FOG_CANNOT_CHANGE_PROJECTION` |
| `UNCONSCIOUS_OBSERVER_INCLUDED` | `UNCONSCIOUS_BLINDSIGHT_REVEALS_NOTHING` |
| `NONLIVING_OBSERVER_INCLUDED` | `STABLE_PC_REVEALS_NOTHING` |
| Own: board drops a derived fog cell | `DM_BOARD_FOG_EQUALS_DM_VIEW_FOG` |
| Own: creature visibility uses all owned IDs | `NON_OWNED_CREATURE_VISIBILITY_USES_IDENTICAL_ELIGIBLE_IDS` |
| Own: fog cache ignores observer set | `SEAT_USES_ONLY_OWNED_FIELDS` |
| D359: `fogged_cell_leaks` | Retained exact-title boundary test |

### Validation — ran

```bash
git diff --check d341a9fe 78ee31b0
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

All exited **0**. Added-line maximum: **109 columns**, none above 120.

Programmatic `vitest/node.startVitest` with in-memory configuration, thread pool and cache disabled: **13 files, 214/214 passed**. These comprised the eight acceptance suites plus senses, terrain, creature-cover, detection-reactions and mutation-ledger. No full gate/build/Playwright run.

The seven authorized intermediate reds remain downstream obligations under D626.10; I did not rerun or suppress them.

Production SHA-256 values were printed before and after the probes and remained identical:

```text
visibility-field.ts d926d535a9e9cedddb3d1cafcc201f9f38c8f246f68d1f32a6be711d71292460
visibility.ts       cc283475f84c409d3cbfacc50bd7f9ca1f318fd4ef1ffd91542b3a02d9acc23e
encounter-board.ts  92d43b5c2f6f4f35d81de2ffba0a957fd0c60dff79fe52dc45bedd6d169acedf
```

Working tree remained clean.

ACCEPT B3
tokens used
754,237
No remaining P1/P2 findings. **B3 satisfies the frozen plan and D626.7–D626.10 amendments.**

### Scope and semantics — read and verified

- Diff contains exactly **7 files, 432 insertions / 31 deletions**. No tests deleted.
- Frozen-plan SHA matches `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- `visibility-field.test.ts:1223` changes only the stage-aware import assertion and its comment. Query-port, actor-knowledge and semantic serializer boundaries remain enforced.
- The D359 test retains its exact title at `visibility.test.ts:526`; its creature-exclusion assertion at `:557` still kills `fogged_cell_leaks`. The corresponding ledger entry remains at `mutation-ledger.test.ts:362–385`.

The shared eligibility predicate at `visibility-field.ts:437–451` requires a placed, living, non-pending observer without effective Unconscious. Its callers correctly apply:

| Path | Evidence |
|---|---|
| DM view: eligible player characters | `visibility.ts:505–506,523` |
| Seat concealment: eligible owned characters | `visibility.ts:563–567` |
| Non-owned creature visibility: those same eligible IDs | `visibility.ts:593–594` |
| DM board fog | `encounter-board.ts:614,716` |

Hidden redaction remains separate. The authored-fog footprint veto is removed. `visibility.test.ts:366–375` asserts **set equality**, with an independent literal expected fog set.

### Snapshot pins — independently reproduced

I loaded the exact pre-B3 `visibility.ts` from `d341a9fe` through an in-memory module transform and used the unchanged snapshot fixture. All three historical hashes reproduced:

```text
pendingRequestHash a0e19e534b070ffc1a82b2f303588573578852bc75720abd780af7e749e0d44a
coordinatorHash    336fc59733a7f90a51b0cb1dbe95ce690a411ef0dab428fc5ef3c9f1e5344f22
revisionChecksum   519a01b4fdcc4f02bf8f8c925c8ec70acd09443924944bac454dcb293a751d3d
```

The complete field comparison found **only `cells` and `concealedCells` changed**. Restoring those two fields restored byte-identical view/coordinator serialization and all three historical hashes. The independent probe passed: **1 passed, 8 skipped**.

The new concealed set is exactly `{(4,3)}`: **69 visible cells, 1 concealed**. Fixture evidence: `reference-encounter.ts:112–126` and `scene-snapshot.test.ts:33–57`.

Requested corner rays from the fighter’s footprint:

| Target | Clear ray |
|---|---|
| `(7,3)` | `(3,3) → (7,3)` |
| `(8,3)` | `(3,3) → (8,3)` |
| `(8,4)` | `(3,4) → (8,4)` |

The first two run along blocker boundaries at `y=3`; the third follows the shared boundary at `y=4`. They do not enter blocker interiors. **The edge-touch rule clears them**, as implemented at `cover.ts:71–98`.

Cells above/below the blockers have rays passing above/below their interiors; nearer columns need not cross them. Only the dark target `(4,3)` remains unseen. Ordinary darkness there does not obstruct rays to other targets.

The unrelated-content checksum negative control remains at `scene-snapshot.test.ts:251–265`.

### Caches and performance — read

`visibility-field.ts:339–358` caches actual observer evaluations by **state identity, observer ID and cell**. `:454–471` caches derived fog by **state identity and observer-ID key**, and `.some()` short-circuits after the first seeing observer.

Pairwise sight, full fields and fog reuse actual observer-cell evaluations. Virtual observers bypass that cache. Also, `projectDmView` creates a new state root (`visibility.ts:509`), so subsequent board projection can repeat equivalent geometry under a **different state identity**; it does not violate the per-state bound.

I found no supported production path mutating the cached state in place. Reducer paths replace roots and affected collections; the new diff introduces no mutation path. This remains an identity-cache contract, not runtime deep-freezing.

**Supervisor timing evidence, not rerun by me:** 38.0 seconds, approximately **13.1% above main**, below D630’s **42-second** ceiling.

### In-memory mutations — ran

All seven were applied and killed; **zero survivors**. Each targeted run produced **1 failed / 21 skipped**, exit 1.

| Mutation | Killing test |
|---|---|
| `FOG_STILL_AUTHORED` | `AUTHORED_FOG_CANNOT_CHANGE_PROJECTION` |
| `UNCONSCIOUS_OBSERVER_INCLUDED` | `UNCONSCIOUS_BLINDSIGHT_REVEALS_NOTHING` |
| `NONLIVING_OBSERVER_INCLUDED` | `STABLE_PC_REVEALS_NOTHING` |
| Own: board drops a derived fog cell | `DM_BOARD_FOG_EQUALS_DM_VIEW_FOG` |
| Own: creature visibility uses all owned IDs | `NON_OWNED_CREATURE_VISIBILITY_USES_IDENTICAL_ELIGIBLE_IDS` |
| Own: fog cache ignores observer set | `SEAT_USES_ONLY_OWNED_FIELDS` |
| D359: `fogged_cell_leaks` | Retained exact-title boundary test |

### Validation — ran

```bash
git diff --check d341a9fe 78ee31b0
npx tsc -p tsconfig.app.json --noEmit
npx tsc -p tsconfig.node.json --noEmit
```

All exited **0**. Added-line maximum: **109 columns**, none above 120.

Programmatic `vitest/node.startVitest` with in-memory configuration, thread pool and cache disabled: **13 files, 214/214 passed**. These comprised the eight acceptance suites plus senses, terrain, creature-cover, detection-reactions and mutation-ledger. No full gate/build/Playwright run.

The seven authorized intermediate reds remain downstream obligations under D626.10; I did not rerun or suppress them.

Production SHA-256 values were printed before and after the probes and remained identical:

```text
visibility-field.ts d926d535a9e9cedddb3d1cafcc201f9f38c8f246f68d1f32a6be711d71292460
visibility.ts       cc283475f84c409d3cbfacc50bd7f9ca1f318fd4ef1ffd91542b3a02d9acc23e
encounter-board.ts  92d43b5c2f6f4f35d81de2ffba0a957fd0c60dff79fe52dc45bedd6d169acedf
```

Working tree remained clean.

ACCEPT B3
