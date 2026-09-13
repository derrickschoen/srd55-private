# APP-ANALYSIS-01 — astra round 1 (read-only on main 45f0bc33)

Source: .tmp/runs/fanout/analysis-astra-r1.log (session 01a09c8f-5206-7353-8498-e5482af01033)

# 1. Executive summary

The first improvements should make verification trustworthy, build caching complete, and snapshot reads cheaper.
I found **11 actionable findings**, including reproduced false-green gate verdicts, lossy canonical JSON, and ineffective history caching.
The build cache omits **97 directly imported raw files**, including SQL migrations and bundled reference text.
Strict TypeScript settings are already enabled; the useful next step is preserving domain constraints across specific boundaries.
The MCP interface erases profile-specific argument types, while spell levels remain unrestricted numbers in important read models.
The shared combat engine should remain shared; several dependency directions need correction.
Transport implementations duplicate lifecycle logic and already disagree on observable subscription behavior.
Test volume is substantial. The opportunity is to reduce expensive orchestration inside narrow tests while improving required-test accounting.
No framework migration, wholesale file splitting, or broad reduction in browser coverage is justified by this audit.
All work was read-only, without other agents, Claude, Vitest, Playwright, or repository writes.

# 2. Codebase map as observed

**Revision:** HEAD advanced during analysis, from `e49cf17e` to `a6228ba3`. The final comparison against `45f0bc33` showed no changes in the audited application, tooling, tests, scripts, documentation, package manifest, or principal TypeScript/Vite/test configurations. Owner-side art requests were excluded.

**Counting method:** filesystem enumeration of the named directories; physical lines in files without NUL bytes, including comments, blank lines, generated text, and fixtures. These are size measurements, not logical code counts.

| Area | Files | Physical text lines |
|---|---:|---:|
| `src/` | 722 | 299,836 |
| `tools/` | 154 | 60,457 |
| `tests/` | 985 | 337,850 |
| `scripts/` | 40 | 7,313 |
| `db/` | 19 | 9,361 |
| `drizzle/` | 76 | 61,622 |
| `docs/` | 325 | 390,866 |
| `fixtures/` | 3 | 39,191 |
| `public/` | 98 | 71 |

Documentation totals include substantial reference content. Migration totals include generated artifacts. Binary public assets contribute files but not text lines.

| Application area | Files | Lines |
|---|---:|---:|
| Rules, domain, grants, access, eligibility | 133 | 43,740 |
| Character, builder, commands, queries, duplicates, reports | 80 | 29,003 |
| Database, worker, RPC, catalog, content, authoring, crypto | 99 | 41,673 |
| Sharing, backup, party | 44 | 19,562 |
| Combat and simulation | 72 | 43,149 |
| VTT, including DM, intel, offers, MCP and handoff | 178 | 79,498 |
| UI, assets and PWA | 108 | 41,739 |
| Refusals and source-root files | 8 | 1,472 |

**Test-to-source ratio:** 1.13 physical test-tree lines per source-tree line. Restricting both trees to `.ts/.tsx/.js/.jsx/.mjs/.cjs` gives **333,007 / 291,603 = 1.14**. This includes test helpers and executable fixtures; it is not an assertion or coverage ratio.

| Test area | Files | Lines |
|---|---:|---:|
| Unit | 522 | 214,291 |
| Integration | 133 | 83,973 |
| Browser | 67 | 22,652 |
| Supervisor integration | 3 | 1,741 |
| Type tests | 12 | 1,371 |
| Test fixtures | 214 | 9,625 |
| Helpers | 23 | 3,067 |

Largest individual files include:

| File | Lines |
|---|---:|
| `src/combat/encounter.ts` | 12,967 |
| `tools/ai-dm-conversation.ts` | 7,594 |
| `src/vtt/party-pack.ts` | 4,409 |
| `src/backup/character-backup.ts` | 4,274 |
| `tools/screenshot-probe.ts` | 3,738 |
| `src/vtt/mcp/engine-server.ts` | 3,691 |
| `src/vtt/session-persistence.ts` | 3,527 |
| `src/sharing/character-share.ts` | 3,466 |

Size alone is not a finding against any of these files.

**Observed entry points and dependencies**

The following sketch comes from source imports and call sites:

```text
src/main.ts
 ├─ ui/app.ts → screen modules → RPC client
 │                              ↓ message boundary
 │  db/worker.ts → worker registry/handlers
 │                 → commands / queries / builder / sharing / backup
 │                 → SQLite
 │
 ├─ vtt/encounter-app.ts → DmEncounterHost
 │                        → coordinator + session journal → combat
 │
 └─ handoff worker harness → WorkerSceneTransport → worker-entry.ts
                                                → ProtocolRuntime
                                                → EncounterSessionService
                                                → DmEncounterHost

tools/vtt-handoff/node-runtime-main.ts → Node runtime
                                      → ProtocolRuntime → same session/host core

AI conversation / arena tooling → MCP entrypoint and engine-server
                                → engine queries / offers / intel → combat
```

Additional observations:

- `ui/app.ts:33` eagerly discovers screen modules; the VTT launches in `main.ts` also use explicit dynamic imports.
- `encounter-app.ts:2` imports art resolution, overlays and glyph rendering. Asset provenance and hashes have explicit schemas in `src/assets/starter-art-manifest.ts`.
- Intel exposes resolved/unresolved domain results and branded exact probabilities in `src/vtt/intel/contracts.ts`. The offers registry composes the standard offer capability.
- An AST import census counted **529 VTT-to-combat import declarations**, versus **two direct combat-to-VTT declarations**. Counts include type imports and are not runtime-cost measurements.
- The reverse dependencies are concrete: combat imports VTT refusal vocabulary and a DM bridge decision-program type. Combat also imports content loading, which imports VTT party-pack schemas.
- The build already rejects runtime Drizzle imports and checks emitted assets for development-only content.
- Main browser tests exclude the handoff subtree; supervisor launch tests are also intentionally outside ordinary Vitest discovery.

# 3. Findings

## A-F1 — Gate verdicts can report success despite runner failures

**Category:** tooling-dx

**Evidence:** [gate-vitest.mjs:62](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/gate-vitest.mjs:62) and [gate-playwright.mjs:142](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/gate-playwright.mjs:142) consider reporter-level failure conditionally on whether failed files exist. The phase runner records exit code, signal and spawn error, but these do not govern the final verdict.

I executed the actual verdict statements in an in-memory harness, replacing process execution and report writes with supplied phase results:

| Supplied phase results | Vitest gate | Playwright gate |
|---|---|---|
| Successful reporter, child exit code 2 | Exit 0 | Exit 0 |
| Initial global error plus failed file; successful file retry | Exit 0 | Exit 0 |

The second case classified the file as a `loadFlake`, losing the independent global failure.

**Why it matters:** a green gate can fail to establish that verification completed successfully. This undermines every subsequent refactoring.

**Replacement:** introduce one shared phase-verdict model that separately retains process failure, reporter/global failure, discovery completeness, and test failures. Permit the authorized retry to resolve attributable test failures only. A retry passing establishes “passed on retry”; attributing the cause to load requires additional evidence.

**Verification:** extend `tests/unit/tools/gate-runners.test.ts` with the two counterexamples, signals, spawn failures, missing inventory, and global errors accompanying failed files. Retain positive tests for a legitimate serial retry.

**Risk:** low–medium; mishandling ordinary assertion-failure exit codes could reject valid retries. **Effort:** M. **Dependencies:** none. **Rulings:** D544, D584.4, D587.3, D620.

## A-F2 — The distribution cache does not describe the complete build input

**Category:** tooling-dx

**Evidence:** [dist-build-cache.mjs:26](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/dist-build-cache.mjs:26) declares input directories; lines 89–113 hash that declaration. Comparing its actual input list with AST-discovered direct `?raw` imports found **97 unique omitted files: 67 under `drizzle/`, 30 under `docs/`**.

Examples include imports in `src/db/migrations.ts:2`, `src/rules/class-resources-srd.ts:9`, and `src/ui/screens/player-guide/screen.ts:1`.

Additionally, [vite.config.ts:114](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/vite.config.ts:114) embeds `git rev-parse HEAD` in the handoff artifact, while the cache key excludes HEAD. A documentation-only commit can therefore reuse an artifact stamped with an earlier commit.

**Why it matters:** cached builds can contain obsolete migrations, reference content or provenance while passing the cache’s internal checksum validation. Those checks establish cached-byte consistency, not correspondence to current inputs.

**Replacement:** hash the complete build dependency closure, including raw imports and build-plugin inputs. Include the provenance inputs required by the emitted artifact. Keep caching, but make its validity contract explicit. Separately close the already-recorded direct-`npm run build` environment inconsistency using the production environment normalization already applied to serve builds.

**Verification:** independently authored cache tests: changing an imported SQL/text file must miss; unchanged inputs must hit; commit-stamped artifacts must match their declared revision. Existing `dist-build-cache.test.ts` currently exercises environment normalization, not dependency completeness.

**Risk:** medium; cache invalidation changes and additional rebuilds. **Effort:** M. **Dependencies:** none; A-F1 improves verification confidence. **Rulings:** D589, D594, D612/D612.1. No Node-version pin is proposed.

## A-F3 — Repeated snapshots bypass the history cache

**Category:** state-and-performance

**Evidence:** [dm-encounter-host.ts:591](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/dm-encounter-host.ts:591) caches by array identity, then treats an empty suffix as a non-linear change requiring full cloning.

However, [session-persistence.ts:2133](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/session-persistence.ts:2133) calls `sessionHistory`, whose line 2437 creates a new array on every read. Thus unchanged history never satisfies the identity check.

I executed the extracted history projection and cache methods with synthetic revisions containing 512-byte event payloads. After warming the cache, **20 reads of the unchanged history** produced:

| Revisions | Entries deep-cloned | Measured elapsed time |
|---:|---:|---:|
| 100 | 2,000 | 10.28 ms |
| 500 | 10,000 | 48.36 ms |
| 1,000 | 20,000 | 82.28 ms |

These are function-level measurements, not complete snapshot or UI latency.

**Why it matters:** ordinary repeated reads recreate full-history work despite the append optimization.

**Replacement:** let the journal own a stable immutable history projection keyed by actual store generation and branch/head state. Reuse it for unchanged state; append detached entries on a genuine linear append; rebuild when ancestry changes. Avoid relying solely on revision number or freshly allocated arrays.

**Verification:** zero additional entry clones after an unchanged-history warm-up; one appended entry cloned on linear append; correct `void` and ancestry changes after undo/branch/restore; previously returned snapshots remain immutable. Exercise the existing host live-path integration tests, then measure complete host snapshots.

**Risk:** medium; incorrect invalidation could expose stale history. **Effort:** M. **Dependencies:** none. **Rulings:** D25, D263, D589. Detached snapshots remain required.

## A-F4 — Canonical JSON silently drops a valid JSON object key

**Category:** type-safety

**Evidence:** [canonical-json.ts:56](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/commands/canonical-json.ts:56) builds its result using `{}` followed by indexed assignment. Assigning the JSON key `__proto__` invokes the inherited setter rather than creating an ordinary own property.

Executing the actual transpiled utility on JSON-parsed input produced:

```text
{"__proto__":{"important":"retained?"},"x":1} → {"x":1}
{"x":1}                                   → {"x":1}
{"nested":{"__proto__":7}}                  → {"nested":{}}
```

`commands/integrity.ts:66` and `:95` use this canonicalization for signed command bytes. `payload-validator.ts:589` accepts a feat configuration object and invokes this utility as validation.

**Why it matters:** distinct accepted JSON values collapse to identical canonical bytes. This is a utility defect with integrity and preservation implications. I did not demonstrate a share-import exploit; sharing has an explicit reserved-key rejection boundary.

**Replacement:** build canonical objects with a null prototype or `Object.fromEntries`, preserving own JSON properties. Keep reserved-key rejection explicit at boundaries that require it.

**Verification:** literal expected outputs for these examples, nested arrays, ordering, cycles and unsupported values; distinct inputs remain distinct; existing integrity and sharing adversarial tests remain meaningful.

**Risk:** medium because canonical bytes have many consumers. Audit frozen-format consumers before changing their encoding; do not silently regenerate fingerprints or resurrect discarded legacy command-history support. **Effort:** S implementation, M including consumer audit. **Dependencies:** none. **Rulings:** D25, D41, D199.

## A-F5 — The MCP API erases profile-specific argument constraints

**Category:** type-safety

**Evidence:** [engine-server.ts:363](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/engine-server.ts:363) exposes:

```ts
execute(name: string, argumentsValue: unknown): unknown;
```

[ai-dm-conversation.ts:2244](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/ai-dm-conversation.ts:2244) accepts `blind: boolean` and an independently optional `baseRevision`, returning `Record<string, unknown>`. The current callers avoid the invalid combination through runtime branching.

An in-memory strict TypeScript probe accepted a context call containing `intel_mode`, `turn_delta`, and `since_revision`; the surface type cannot express whether those arguments are legal for its profile.

**Why it matters:** the recent profile crash was patched, but another caller can recreate the mistake without a compiler error. This is a remaining structural weakness, not a claim that the patched crash still occurs.

**Replacement:** derive a profile-indexed tool registry from the existing schemas. Preserve literal tool names and input/output types through internal calls, with a separate `unknown` wire adapter. Replace the helper’s independent boolean/options with a discriminated profile input.

**Verification:** negative compiler fixtures reject blind-profile forbidden arguments and invalid profile/tool combinations; runtime tests still reject hostile unknown input. Preserve existing context-byte and D569 invariance tests.

**Risk:** medium; generic typing and call-site migration. **Effort:** M. **Dependencies:** none. **Rulings:** D25, D569, D584.4, D602 and its D586.173 remediation record.

## A-F6 — Spell-level constraints arrive too late in the read pipeline

**Category:** type-safety

**Evidence:** `domain/models.ts:70` declares `SpellVersionRow.level: number`; `domain/read-models.ts:147` exposes `SpellRoute.spell_level: number`. [catalog-queries.ts:217](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/queries/catalog-queries.ts:217) decodes the level as an integer without establishing the domain distinction.

The virtual TypeScript probe accepted both level `42` in `SpellVersionRow` and level `-100` in `SpellRoute`.

There are already two representations: the brand in `domain/ids.ts:263` and the validating class in `rules/spell-level.ts`. The character spell-section builder establishes a known-level/unknown-placeholder distinction at lines 98 and 225.

**Why it matters:** consumers before that final projection can treat an arbitrary integer as a meaningful level. This proves representational weakness, not that the UI currently emits those values.

**Replacement:** consolidate the domain level representation and establish the existing known/placeholder distinction at the catalog/read boundary. Keep raw storage decoding and the imported placeholder sentinel in storage/wire adapters; propagate validated domain values through access and route models.

**Verification:** invalid domain assignments fail compilation; known values and imported placeholders round-trip; invalid stored domain values fail at the defined read boundary. Preserve free-text homebrew schools and other extensible content.

**Risk:** medium; broad read-model consumers and placeholder handling. **Effort:** M–L. **Dependencies:** none. **Rulings:** D11, D25, D30, D41, D235, D269.

## A-F7 — Engine-owned contracts live above the engine

**Category:** architecture

**Evidence:**

- [combat/coordinator.ts:36](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/combat/coordinator.ts:36) imports refusal classification from VTT.
- `combat/controllers.ts:13` imports `DecisionProgram` from the DM bridge.
- `combat/encounter.ts:16` imports content-pack loading.
- [content/content-pack.ts:28](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/content/content-pack.ts:28) imports effect/resource schemas and decoding from VTT party-pack.
- Party-pack imports combat models and functions.

This is a package-level dependency cycle and ownership inversion. I am not claiming a demonstrated initialization failure or bundle-size cost.

**Why it matters:** changing a presentation/import adapter can affect core engine contracts. Independent simulation and handoff consumers inherit that coupling.

**Replacement:** extract three concrete engine-facing modules: refusal vocabulary/classification; decision-program contracts; shared imported effect/resource contracts and decoding. Place them below VTT. Keep DM parsing, UI refusal presentation, and party-pack assembly in their adapters.

**Verification:** extend the existing AST boundary tests to prohibit these reverse edges after migration. Preserve reducer entry-point guards, content-pack/party-pack import tests, controller behavior and replay results.

**Risk:** medium–high because imports span widely used code. **Effort:** L. **Dependencies:** none; A-F5 can consume the clarified contracts. **Rulings:** D269, D388, D586.27, D589.

## A-F8 — Transport lifecycle duplication has observable behavioral drift

**Category:** duplication

**Evidence:** [worker-transport.ts:108](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/handoff/worker-transport.ts:108) returns its initial promise after closure and does not replay the latest event to late subscribers. Its subscription methods also add listeners after termination.

By comparison, [websocket-transport.ts:109](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/handoff/websocket-transport.ts:109) rejects initial reads after termination, avoids retaining new listeners, and replays the latest snapshot. In-process transport follows that pattern.

An AST-extracted execution of the actual Worker class with an in-memory port and identity decoder confirmed:

```text
late subscriber callbacks: 0
initialSnapshot() after close: resolved with revision 1
status: closed
```

The existing conformance helper explicitly asserts late replay at `tests/helpers/vtt-handoff/transport-conformance.ts:412`. Browser parity checks WebSocket late replay at `runtime-parity.spec.ts:347`; the shared scenario-name count is not proof each scenario ran for each transport.

**Replacement:** compose a shared observer/lifecycle state holder with explicit late-subscription and terminal behavior. Retain transport-specific framing, correlation, mutation receipts and session destruction semantics.

**Verification:** extend the existing conformance machinery to execute these lifecycle assertions for all three transports, including the real Worker boundary. Preserve observer-exception isolation and receipt-before-close behavior.

**Risk:** medium; reentrancy and receipt ordering. **Effort:** M. **Dependencies:** A-F9 for complete gate accounting. **Rulings:** D586.27, D589, D593.

## A-F9 — Required verification exists in several incompatible inventories

**Category:** test-strategy

**Evidence:** [package.json:33](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/package.json:33) defines `test:all`, but `playwright.config.ts:43` excludes handoff tests. Separate scripts and supervisor gates cover additional surfaces.

[tools/vtt-handoff/report.ts:18](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/vtt-handoff/report.ts:18) declares required gates as command strings:

- line 35 contains the non-executable placeholder `<S0-S10 targeted specs>`;
- parity and smoke commands at lines 42 and 46 omit `VTT_HANDOFF_ARTIFACT`;
- the referenced Playwright config requires that variable at line 19.

The report declaration is metadata, not proof those commands were executed. These observations do not invalidate a supervisor run that supplied correct commands separately.

**Why it matters:** “all tests” has multiple meanings, and required coverage can depend on manually reconstructing commands and environment.

**Replacement:** make the required inventory executable: structured argv, environment, configuration, expected test set, and execution tier. Have wrappers and reports consume it. Keep supervisor-only launch tests explicitly separate, with missing execution visible rather than silently folded into ordinary Vitest.

**Verification:** manifest commands resolve with complete configuration; placeholder entries fail validation; reports reconcile required, discovered, executed and skipped tests. An affected-test selector supplements this inventory rather than replacing it.

**Risk:** low–medium. **Effort:** M. **Dependencies:** A-F1; A-F2 for trustworthy distribution tests. **Rulings:** D584.4, D589, D603, D620.

## A-F10 — Narrow arena tests pay for complete orchestration

**Category:** test-strategy

**Evidence:** [ai-dm-arena.test.ts:79](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/tools/ai-dm-arena.test.ts:79) loads nine arena states at module evaluation. Its intel-mode case at line 1326 invokes full `runArena` three times. The round-robin case at line 1758 configures an eight-cell arena through the real runner to assert scheduling and tags.

D606 records **25.32 seconds in isolation** for the intel-mode case; D613 records additional marginal tests and explicitly queues cost reduction. Those are historical recorded timings, not fresh measurements from this audit.

**Why it matters:** scheduler and attribution checks inherit engine/setup cost, making narrow failures expensive to investigate and increasing pressure to raise timeout walls.

**Replacement:** extract an arena cell-execution port beneath the scheduler. Test scheduling and row attribution with deterministic supplied cell results. Retain focused real launcher→conversation→engine→row tests for profile bytes and integration behavior. Load large fixtures only for the tests that consume them.

**Verification:** preserve independently specified assertions and a before/after test census. Measure collection, setup and execution separately; report repeated named-test timings. Confirm scheduler-only tests no longer execute full conversations while retained integration tests still do.

**Risk:** medium; excessive mocking could remove valuable integration coverage. **Effort:** M. **Dependencies:** A-F1; A-F5 helps preserve typed profile coverage. **Rulings:** D200, D584.4, D606, D613.

This does **not** establish a new runtime for the roughly 54-minute browser suite. Browser/OPFS/Worker boundaries still need browser tests.

## A-F11 — Operational guidance contradicts current binding decisions

**Category:** docs

**Evidence:** [supervision.md:99](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/supervision.md:99) prescribes app-only compilation, while D263 requires checking tests/tooling through build-mode typechecking. Lines 103–104 state concurrency restrictions subsequently modified by D587.3.

[BUILD-PLAN.md:17](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/BUILD-PLAN.md:17) still marks implemented areas as `not-started` and describes PHP equivalence as their acceptance condition. D29/D201 changed that role.

`domain/ids.ts:260` says the spell-level brand is unapplied and nothing narrows the sentinel; the character spell-section builder now does.

**Why it matters:** agents or contributors following prominent guidance can run an incomplete compile gate, reconstruct obsolete work, or misunderstand current contracts.

**Replacement:** mark historical root plans as historical and link current guidance. Maintain a concise operational index pointing to the controlling D-number and executable command. Update stale type comments. Preserve the decision history rather than rewriting it.

**Verification:** check listed commands against package/configuration and the A-F9 inventory; ensure guidance explicitly records later overrides.

**Risk:** low. **Effort:** S–M. **Dependencies:** A-F9 for command generation; A-F6 for final type wording. **Rulings:** D29, D201, D263, D544, D587.3.

# 4. Top 10 by value ÷ risk

1. **A-F1 — Gate verdicts.** Outranks caching because every other change depends on trustworthy verification.
2. **A-F2 — Build-input completeness.** Outranks snapshot optimization because stale builds can invalidate both delivered behavior and test evidence.
3. **A-F3 — History caching.** Outranks canonicalization on demonstrated routine execution frequency and a bounded measurable fix.
4. **A-F4 — Canonical JSON preservation.** Outranks the MCP typing migration because it fixes a reproduced lossy primitive with a small implementation.
5. **A-F5 — Profile-indexed MCP types.** Outranks inventory consolidation because it directly prevents recurrence of an established costly failure class.
6. **A-F9 — Executable verification inventory.** Outranks test-cost work because complete coverage accounting should precede changing test execution.
7. **A-F10 — Arena test cost.** Outranks broader domain migration because it targets an already-recorded recurring expense through a narrow seam.
8. **A-F6 — Spell-level domain types.** Outranks transport consolidation because the unrestricted values flow through broader application read paths.
9. **A-F8 — Transport lifecycle composition.** Outranks engine extraction because observable divergence gives it a more precise acceptance target.
10. **A-F7 — Engine contract ownership.** Outranks documentation cleanup in long-term structural value, but should follow the smaller correctness fixes.

These are qualitative rankings, not fabricated numerical ROI scores.

# 5. Do not do

- **Do not introduce another combat engine or handoff-specific rules implementation.** D388/D589 require shared authority; the existing entry-point guards are valuable.
- **Do not split `encounter.ts` simply because it is large.** Extract the identified owned contracts first; no measured benefit supports arbitrary file subdivision.
- **Do not replace SQLite, the DOM UI, Zod, or the build framework without a demonstrated defect that the replacement solves.**
- **Do not remove snapshot freezing to improve performance.** Fix cache invalidation while preserving the D263/D589 boundary.
- **Do not close homebrew vocabularies or reject imported placeholder content to simplify types.** D11/D12/D25 require preservation and extensibility.
- **Do not substitute an absent/fixed/unavailable DC union for the planned formula representation.** D268 explicitly rejected that approach.
- **Do not revive Laravel fidelity scaffolding or grandfathered command-history machinery.** D29/D201 make parity reference-oriented; D199 removed legacy history acceptance.
- **Do not turn all retries into success, add unlimited retries, or apply blanket timeout increases.** Existing exceptions are named and bounded.
- **Do not remove browser journeys merely because the suite is long.** Preserve storage, Worker, networking, rendering and user-flow assertions; D200 requires an unchanged assertion census for its authorized split.
- **Do not regenerate expected bytes from the refactored implementation.** Retained tests must remain independent.
- **Do not pin Node as the response to build variability.** D594 explicitly declines that policy.
- **Do not reopen exhaustive static held-out policing, settled challenge enumeration, or deferred art changes as generic cleanup.** D597/D598/D607 and D616/D619 constrain those directions.

# 6. Open questions for the owner

**None are required to make these proposals concrete.** The identified fixes can proceed within existing rulings. This round proposes no change to wire compatibility, supported content, engine authority, transport choice, or test acceptance policy.

# 7. What I could not assess

- I did not semantically read every line of the roughly 300,000-line application. This was a complete size/import census plus targeted implementation and test inspection; absence of a finding is not certification of an area.
- No fresh full-suite pass, browser-suite duration, browser rendering measurement, memory profile, or complete host latency benchmark was obtained.
- Snapshot timings are synthetic function-level measurements. Gate and Worker probes used actual extracted code with supplied external-boundary behavior.
- Compiler probes checked selected invalid constructions; they were not a whole-project typecheck.
- I did not evaluate AI model quality, paid arena outcomes, visual art quality, or Windows/Godot behavior.
- I did not inspect `.tmp/`, `dnd-slim-runs/`, sibling worktrees, owner art requests, or the other analyst’s report.
- I did not establish exploitability for the canonicalization defect or exhaustively audit every versioned canonical-byte consumer.
- No independent review occurred in this round, as instructed.

**APP-ANALYSIS R1 DONE — 11 findings**
tokens used
362,249
# 1. Executive summary

The first improvements should make verification trustworthy, build caching complete, and snapshot reads cheaper.
I found **11 actionable findings**, including reproduced false-green gate verdicts, lossy canonical JSON, and ineffective history caching.
The build cache omits **97 directly imported raw files**, including SQL migrations and bundled reference text.
Strict TypeScript settings are already enabled; the useful next step is preserving domain constraints across specific boundaries.
The MCP interface erases profile-specific argument types, while spell levels remain unrestricted numbers in important read models.
The shared combat engine should remain shared; several dependency directions need correction.
Transport implementations duplicate lifecycle logic and already disagree on observable subscription behavior.
Test volume is substantial. The opportunity is to reduce expensive orchestration inside narrow tests while improving required-test accounting.
No framework migration, wholesale file splitting, or broad reduction in browser coverage is justified by this audit.
All work was read-only, without other agents, Claude, Vitest, Playwright, or repository writes.

# 2. Codebase map as observed

**Revision:** HEAD advanced during analysis, from `e49cf17e` to `a6228ba3`. The final comparison against `45f0bc33` showed no changes in the audited application, tooling, tests, scripts, documentation, package manifest, or principal TypeScript/Vite/test configurations. Owner-side art requests were excluded.

**Counting method:** filesystem enumeration of the named directories; physical lines in files without NUL bytes, including comments, blank lines, generated text, and fixtures. These are size measurements, not logical code counts.

| Area | Files | Physical text lines |
|---|---:|---:|
| `src/` | 722 | 299,836 |
| `tools/` | 154 | 60,457 |
| `tests/` | 985 | 337,850 |
| `scripts/` | 40 | 7,313 |
| `db/` | 19 | 9,361 |
| `drizzle/` | 76 | 61,622 |
| `docs/` | 325 | 390,866 |
| `fixtures/` | 3 | 39,191 |
| `public/` | 98 | 71 |

Documentation totals include substantial reference content. Migration totals include generated artifacts. Binary public assets contribute files but not text lines.

| Application area | Files | Lines |
|---|---:|---:|
| Rules, domain, grants, access, eligibility | 133 | 43,740 |
| Character, builder, commands, queries, duplicates, reports | 80 | 29,003 |
| Database, worker, RPC, catalog, content, authoring, crypto | 99 | 41,673 |
| Sharing, backup, party | 44 | 19,562 |
| Combat and simulation | 72 | 43,149 |
| VTT, including DM, intel, offers, MCP and handoff | 178 | 79,498 |
| UI, assets and PWA | 108 | 41,739 |
| Refusals and source-root files | 8 | 1,472 |

**Test-to-source ratio:** 1.13 physical test-tree lines per source-tree line. Restricting both trees to `.ts/.tsx/.js/.jsx/.mjs/.cjs` gives **333,007 / 291,603 = 1.14**. This includes test helpers and executable fixtures; it is not an assertion or coverage ratio.

| Test area | Files | Lines |
|---|---:|---:|
| Unit | 522 | 214,291 |
| Integration | 133 | 83,973 |
| Browser | 67 | 22,652 |
| Supervisor integration | 3 | 1,741 |
| Type tests | 12 | 1,371 |
| Test fixtures | 214 | 9,625 |
| Helpers | 23 | 3,067 |

Largest individual files include:

| File | Lines |
|---|---:|
| `src/combat/encounter.ts` | 12,967 |
| `tools/ai-dm-conversation.ts` | 7,594 |
| `src/vtt/party-pack.ts` | 4,409 |
| `src/backup/character-backup.ts` | 4,274 |
| `tools/screenshot-probe.ts` | 3,738 |
| `src/vtt/mcp/engine-server.ts` | 3,691 |
| `src/vtt/session-persistence.ts` | 3,527 |
| `src/sharing/character-share.ts` | 3,466 |

Size alone is not a finding against any of these files.

**Observed entry points and dependencies**

The following sketch comes from source imports and call sites:

```text
src/main.ts
 ├─ ui/app.ts → screen modules → RPC client
 │                              ↓ message boundary
 │  db/worker.ts → worker registry/handlers
 │                 → commands / queries / builder / sharing / backup
 │                 → SQLite
 │
 ├─ vtt/encounter-app.ts → DmEncounterHost
 │                        → coordinator + session journal → combat
 │
 └─ handoff worker harness → WorkerSceneTransport → worker-entry.ts
                                                → ProtocolRuntime
                                                → EncounterSessionService
                                                → DmEncounterHost

tools/vtt-handoff/node-runtime-main.ts → Node runtime
                                      → ProtocolRuntime → same session/host core

AI conversation / arena tooling → MCP entrypoint and engine-server
                                → engine queries / offers / intel → combat
```

Additional observations:

- `ui/app.ts:33` eagerly discovers screen modules; the VTT launches in `main.ts` also use explicit dynamic imports.
- `encounter-app.ts:2` imports art resolution, overlays and glyph rendering. Asset provenance and hashes have explicit schemas in `src/assets/starter-art-manifest.ts`.
- Intel exposes resolved/unresolved domain results and branded exact probabilities in `src/vtt/intel/contracts.ts`. The offers registry composes the standard offer capability.
- An AST import census counted **529 VTT-to-combat import declarations**, versus **two direct combat-to-VTT declarations**. Counts include type imports and are not runtime-cost measurements.
- The reverse dependencies are concrete: combat imports VTT refusal vocabulary and a DM bridge decision-program type. Combat also imports content loading, which imports VTT party-pack schemas.
- The build already rejects runtime Drizzle imports and checks emitted assets for development-only content.
- Main browser tests exclude the handoff subtree; supervisor launch tests are also intentionally outside ordinary Vitest discovery.

# 3. Findings

## A-F1 — Gate verdicts can report success despite runner failures

**Category:** tooling-dx

**Evidence:** [gate-vitest.mjs:62](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/gate-vitest.mjs:62) and [gate-playwright.mjs:142](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/gate-playwright.mjs:142) consider reporter-level failure conditionally on whether failed files exist. The phase runner records exit code, signal and spawn error, but these do not govern the final verdict.

I executed the actual verdict statements in an in-memory harness, replacing process execution and report writes with supplied phase results:

| Supplied phase results | Vitest gate | Playwright gate |
|---|---|---|
| Successful reporter, child exit code 2 | Exit 0 | Exit 0 |
| Initial global error plus failed file; successful file retry | Exit 0 | Exit 0 |

The second case classified the file as a `loadFlake`, losing the independent global failure.

**Why it matters:** a green gate can fail to establish that verification completed successfully. This undermines every subsequent refactoring.

**Replacement:** introduce one shared phase-verdict model that separately retains process failure, reporter/global failure, discovery completeness, and test failures. Permit the authorized retry to resolve attributable test failures only. A retry passing establishes “passed on retry”; attributing the cause to load requires additional evidence.

**Verification:** extend `tests/unit/tools/gate-runners.test.ts` with the two counterexamples, signals, spawn failures, missing inventory, and global errors accompanying failed files. Retain positive tests for a legitimate serial retry.

**Risk:** low–medium; mishandling ordinary assertion-failure exit codes could reject valid retries. **Effort:** M. **Dependencies:** none. **Rulings:** D544, D584.4, D587.3, D620.

## A-F2 — The distribution cache does not describe the complete build input

**Category:** tooling-dx

**Evidence:** [dist-build-cache.mjs:26](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/dist-build-cache.mjs:26) declares input directories; lines 89–113 hash that declaration. Comparing its actual input list with AST-discovered direct `?raw` imports found **97 unique omitted files: 67 under `drizzle/`, 30 under `docs/`**.

Examples include imports in `src/db/migrations.ts:2`, `src/rules/class-resources-srd.ts:9`, and `src/ui/screens/player-guide/screen.ts:1`.

Additionally, [vite.config.ts:114](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/vite.config.ts:114) embeds `git rev-parse HEAD` in the handoff artifact, while the cache key excludes HEAD. A documentation-only commit can therefore reuse an artifact stamped with an earlier commit.

**Why it matters:** cached builds can contain obsolete migrations, reference content or provenance while passing the cache’s internal checksum validation. Those checks establish cached-byte consistency, not correspondence to current inputs.

**Replacement:** hash the complete build dependency closure, including raw imports and build-plugin inputs. Include the provenance inputs required by the emitted artifact. Keep caching, but make its validity contract explicit. Separately close the already-recorded direct-`npm run build` environment inconsistency using the production environment normalization already applied to serve builds.

**Verification:** independently authored cache tests: changing an imported SQL/text file must miss; unchanged inputs must hit; commit-stamped artifacts must match their declared revision. Existing `dist-build-cache.test.ts` currently exercises environment normalization, not dependency completeness.

**Risk:** medium; cache invalidation changes and additional rebuilds. **Effort:** M. **Dependencies:** none; A-F1 improves verification confidence. **Rulings:** D589, D594, D612/D612.1. No Node-version pin is proposed.

## A-F3 — Repeated snapshots bypass the history cache

**Category:** state-and-performance

**Evidence:** [dm-encounter-host.ts:591](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/dm-encounter-host.ts:591) caches by array identity, then treats an empty suffix as a non-linear change requiring full cloning.

However, [session-persistence.ts:2133](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/session-persistence.ts:2133) calls `sessionHistory`, whose line 2437 creates a new array on every read. Thus unchanged history never satisfies the identity check.

I executed the extracted history projection and cache methods with synthetic revisions containing 512-byte event payloads. After warming the cache, **20 reads of the unchanged history** produced:

| Revisions | Entries deep-cloned | Measured elapsed time |
|---:|---:|---:|
| 100 | 2,000 | 10.28 ms |
| 500 | 10,000 | 48.36 ms |
| 1,000 | 20,000 | 82.28 ms |

These are function-level measurements, not complete snapshot or UI latency.

**Why it matters:** ordinary repeated reads recreate full-history work despite the append optimization.

**Replacement:** let the journal own a stable immutable history projection keyed by actual store generation and branch/head state. Reuse it for unchanged state; append detached entries on a genuine linear append; rebuild when ancestry changes. Avoid relying solely on revision number or freshly allocated arrays.

**Verification:** zero additional entry clones after an unchanged-history warm-up; one appended entry cloned on linear append; correct `void` and ancestry changes after undo/branch/restore; previously returned snapshots remain immutable. Exercise the existing host live-path integration tests, then measure complete host snapshots.

**Risk:** medium; incorrect invalidation could expose stale history. **Effort:** M. **Dependencies:** none. **Rulings:** D25, D263, D589. Detached snapshots remain required.

## A-F4 — Canonical JSON silently drops a valid JSON object key

**Category:** type-safety

**Evidence:** [canonical-json.ts:56](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/commands/canonical-json.ts:56) builds its result using `{}` followed by indexed assignment. Assigning the JSON key `__proto__` invokes the inherited setter rather than creating an ordinary own property.

Executing the actual transpiled utility on JSON-parsed input produced:

```text
{"__proto__":{"important":"retained?"},"x":1} → {"x":1}
{"x":1}                                   → {"x":1}
{"nested":{"__proto__":7}}                  → {"nested":{}}
```

`commands/integrity.ts:66` and `:95` use this canonicalization for signed command bytes. `payload-validator.ts:589` accepts a feat configuration object and invokes this utility as validation.

**Why it matters:** distinct accepted JSON values collapse to identical canonical bytes. This is a utility defect with integrity and preservation implications. I did not demonstrate a share-import exploit; sharing has an explicit reserved-key rejection boundary.

**Replacement:** build canonical objects with a null prototype or `Object.fromEntries`, preserving own JSON properties. Keep reserved-key rejection explicit at boundaries that require it.

**Verification:** literal expected outputs for these examples, nested arrays, ordering, cycles and unsupported values; distinct inputs remain distinct; existing integrity and sharing adversarial tests remain meaningful.

**Risk:** medium because canonical bytes have many consumers. Audit frozen-format consumers before changing their encoding; do not silently regenerate fingerprints or resurrect discarded legacy command-history support. **Effort:** S implementation, M including consumer audit. **Dependencies:** none. **Rulings:** D25, D41, D199.

## A-F5 — The MCP API erases profile-specific argument constraints

**Category:** type-safety

**Evidence:** [engine-server.ts:363](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/mcp/engine-server.ts:363) exposes:

```ts
execute(name: string, argumentsValue: unknown): unknown;
```

[ai-dm-conversation.ts:2244](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/ai-dm-conversation.ts:2244) accepts `blind: boolean` and an independently optional `baseRevision`, returning `Record<string, unknown>`. The current callers avoid the invalid combination through runtime branching.

An in-memory strict TypeScript probe accepted a context call containing `intel_mode`, `turn_delta`, and `since_revision`; the surface type cannot express whether those arguments are legal for its profile.

**Why it matters:** the recent profile crash was patched, but another caller can recreate the mistake without a compiler error. This is a remaining structural weakness, not a claim that the patched crash still occurs.

**Replacement:** derive a profile-indexed tool registry from the existing schemas. Preserve literal tool names and input/output types through internal calls, with a separate `unknown` wire adapter. Replace the helper’s independent boolean/options with a discriminated profile input.

**Verification:** negative compiler fixtures reject blind-profile forbidden arguments and invalid profile/tool combinations; runtime tests still reject hostile unknown input. Preserve existing context-byte and D569 invariance tests.

**Risk:** medium; generic typing and call-site migration. **Effort:** M. **Dependencies:** none. **Rulings:** D25, D569, D584.4, D602 and its D586.173 remediation record.

## A-F6 — Spell-level constraints arrive too late in the read pipeline

**Category:** type-safety

**Evidence:** `domain/models.ts:70` declares `SpellVersionRow.level: number`; `domain/read-models.ts:147` exposes `SpellRoute.spell_level: number`. [catalog-queries.ts:217](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/queries/catalog-queries.ts:217) decodes the level as an integer without establishing the domain distinction.

The virtual TypeScript probe accepted both level `42` in `SpellVersionRow` and level `-100` in `SpellRoute`.

There are already two representations: the brand in `domain/ids.ts:263` and the validating class in `rules/spell-level.ts`. The character spell-section builder establishes a known-level/unknown-placeholder distinction at lines 98 and 225.

**Why it matters:** consumers before that final projection can treat an arbitrary integer as a meaningful level. This proves representational weakness, not that the UI currently emits those values.

**Replacement:** consolidate the domain level representation and establish the existing known/placeholder distinction at the catalog/read boundary. Keep raw storage decoding and the imported placeholder sentinel in storage/wire adapters; propagate validated domain values through access and route models.

**Verification:** invalid domain assignments fail compilation; known values and imported placeholders round-trip; invalid stored domain values fail at the defined read boundary. Preserve free-text homebrew schools and other extensible content.

**Risk:** medium; broad read-model consumers and placeholder handling. **Effort:** M–L. **Dependencies:** none. **Rulings:** D11, D25, D30, D41, D235, D269.

## A-F7 — Engine-owned contracts live above the engine

**Category:** architecture

**Evidence:**

- [combat/coordinator.ts:36](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/combat/coordinator.ts:36) imports refusal classification from VTT.
- `combat/controllers.ts:13` imports `DecisionProgram` from the DM bridge.
- `combat/encounter.ts:16` imports content-pack loading.
- [content/content-pack.ts:28](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/content/content-pack.ts:28) imports effect/resource schemas and decoding from VTT party-pack.
- Party-pack imports combat models and functions.

This is a package-level dependency cycle and ownership inversion. I am not claiming a demonstrated initialization failure or bundle-size cost.

**Why it matters:** changing a presentation/import adapter can affect core engine contracts. Independent simulation and handoff consumers inherit that coupling.

**Replacement:** extract three concrete engine-facing modules: refusal vocabulary/classification; decision-program contracts; shared imported effect/resource contracts and decoding. Place them below VTT. Keep DM parsing, UI refusal presentation, and party-pack assembly in their adapters.

**Verification:** extend the existing AST boundary tests to prohibit these reverse edges after migration. Preserve reducer entry-point guards, content-pack/party-pack import tests, controller behavior and replay results.

**Risk:** medium–high because imports span widely used code. **Effort:** L. **Dependencies:** none; A-F5 can consume the clarified contracts. **Rulings:** D269, D388, D586.27, D589.

## A-F8 — Transport lifecycle duplication has observable behavioral drift

**Category:** duplication

**Evidence:** [worker-transport.ts:108](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/handoff/worker-transport.ts:108) returns its initial promise after closure and does not replay the latest event to late subscribers. Its subscription methods also add listeners after termination.

By comparison, [websocket-transport.ts:109](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/src/vtt/handoff/websocket-transport.ts:109) rejects initial reads after termination, avoids retaining new listeners, and replays the latest snapshot. In-process transport follows that pattern.

An AST-extracted execution of the actual Worker class with an in-memory port and identity decoder confirmed:

```text
late subscriber callbacks: 0
initialSnapshot() after close: resolved with revision 1
status: closed
```

The existing conformance helper explicitly asserts late replay at `tests/helpers/vtt-handoff/transport-conformance.ts:412`. Browser parity checks WebSocket late replay at `runtime-parity.spec.ts:347`; the shared scenario-name count is not proof each scenario ran for each transport.

**Replacement:** compose a shared observer/lifecycle state holder with explicit late-subscription and terminal behavior. Retain transport-specific framing, correlation, mutation receipts and session destruction semantics.

**Verification:** extend the existing conformance machinery to execute these lifecycle assertions for all three transports, including the real Worker boundary. Preserve observer-exception isolation and receipt-before-close behavior.

**Risk:** medium; reentrancy and receipt ordering. **Effort:** M. **Dependencies:** A-F9 for complete gate accounting. **Rulings:** D586.27, D589, D593.

## A-F9 — Required verification exists in several incompatible inventories

**Category:** test-strategy

**Evidence:** [package.json:33](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/package.json:33) defines `test:all`, but `playwright.config.ts:43` excludes handoff tests. Separate scripts and supervisor gates cover additional surfaces.

[tools/vtt-handoff/report.ts:18](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tools/vtt-handoff/report.ts:18) declares required gates as command strings:

- line 35 contains the non-executable placeholder `<S0-S10 targeted specs>`;
- parity and smoke commands at lines 42 and 46 omit `VTT_HANDOFF_ARTIFACT`;
- the referenced Playwright config requires that variable at line 19.

The report declaration is metadata, not proof those commands were executed. These observations do not invalidate a supervisor run that supplied correct commands separately.

**Why it matters:** “all tests” has multiple meanings, and required coverage can depend on manually reconstructing commands and environment.

**Replacement:** make the required inventory executable: structured argv, environment, configuration, expected test set, and execution tier. Have wrappers and reports consume it. Keep supervisor-only launch tests explicitly separate, with missing execution visible rather than silently folded into ordinary Vitest.

**Verification:** manifest commands resolve with complete configuration; placeholder entries fail validation; reports reconcile required, discovered, executed and skipped tests. An affected-test selector supplements this inventory rather than replacing it.

**Risk:** low–medium. **Effort:** M. **Dependencies:** A-F1; A-F2 for trustworthy distribution tests. **Rulings:** D584.4, D589, D603, D620.

## A-F10 — Narrow arena tests pay for complete orchestration

**Category:** test-strategy

**Evidence:** [ai-dm-arena.test.ts:79](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/tests/unit/tools/ai-dm-arena.test.ts:79) loads nine arena states at module evaluation. Its intel-mode case at line 1326 invokes full `runArena` three times. The round-robin case at line 1758 configures an eight-cell arena through the real runner to assert scheduling and tags.

D606 records **25.32 seconds in isolation** for the intel-mode case; D613 records additional marginal tests and explicitly queues cost reduction. Those are historical recorded timings, not fresh measurements from this audit.

**Why it matters:** scheduler and attribution checks inherit engine/setup cost, making narrow failures expensive to investigate and increasing pressure to raise timeout walls.

**Replacement:** extract an arena cell-execution port beneath the scheduler. Test scheduling and row attribution with deterministic supplied cell results. Retain focused real launcher→conversation→engine→row tests for profile bytes and integration behavior. Load large fixtures only for the tests that consume them.

**Verification:** preserve independently specified assertions and a before/after test census. Measure collection, setup and execution separately; report repeated named-test timings. Confirm scheduler-only tests no longer execute full conversations while retained integration tests still do.

**Risk:** medium; excessive mocking could remove valuable integration coverage. **Effort:** M. **Dependencies:** A-F1; A-F5 helps preserve typed profile coverage. **Rulings:** D200, D584.4, D606, D613.

This does **not** establish a new runtime for the roughly 54-minute browser suite. Browser/OPFS/Worker boundaries still need browser tests.

## A-F11 — Operational guidance contradicts current binding decisions

**Category:** docs

**Evidence:** [supervision.md:99](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/.claude/supervision.md:99) prescribes app-only compilation, while D263 requires checking tests/tooling through build-mode typechecking. Lines 103–104 state concurrency restrictions subsequently modified by D587.3.

[BUILD-PLAN.md:17](/home/vagrant/PhpstormProjects/dnd-multiclass-spells-static/BUILD-PLAN.md:17) still marks implemented areas as `not-started` and describes PHP equivalence as their acceptance condition. D29/D201 changed that role.

`domain/ids.ts:260` says the spell-level brand is unapplied and nothing narrows the sentinel; the character spell-section builder now does.

**Why it matters:** agents or contributors following prominent guidance can run an incomplete compile gate, reconstruct obsolete work, or misunderstand current contracts.

**Replacement:** mark historical root plans as historical and link current guidance. Maintain a concise operational index pointing to the controlling D-number and executable command. Update stale type comments. Preserve the decision history rather than rewriting it.

**Verification:** check listed commands against package/configuration and the A-F9 inventory; ensure guidance explicitly records later overrides.

**Risk:** low. **Effort:** S–M. **Dependencies:** A-F9 for command generation; A-F6 for final type wording. **Rulings:** D29, D201, D263, D544, D587.3.

# 4. Top 10 by value ÷ risk

1. **A-F1 — Gate verdicts.** Outranks caching because every other change depends on trustworthy verification.
2. **A-F2 — Build-input completeness.** Outranks snapshot optimization because stale builds can invalidate both delivered behavior and test evidence.
3. **A-F3 — History caching.** Outranks canonicalization on demonstrated routine execution frequency and a bounded measurable fix.
4. **A-F4 — Canonical JSON preservation.** Outranks the MCP typing migration because it fixes a reproduced lossy primitive with a small implementation.
5. **A-F5 — Profile-indexed MCP types.** Outranks inventory consolidation because it directly prevents recurrence of an established costly failure class.
6. **A-F9 — Executable verification inventory.** Outranks test-cost work because complete coverage accounting should precede changing test execution.
7. **A-F10 — Arena test cost.** Outranks broader domain migration because it targets an already-recorded recurring expense through a narrow seam.
8. **A-F6 — Spell-level domain types.** Outranks transport consolidation because the unrestricted values flow through broader application read paths.
9. **A-F8 — Transport lifecycle composition.** Outranks engine extraction because observable divergence gives it a more precise acceptance target.
10. **A-F7 — Engine contract ownership.** Outranks documentation cleanup in long-term structural value, but should follow the smaller correctness fixes.

These are qualitative rankings, not fabricated numerical ROI scores.

# 5. Do not do

- **Do not introduce another combat engine or handoff-specific rules implementation.** D388/D589 require shared authority; the existing entry-point guards are valuable.
- **Do not split `encounter.ts` simply because it is large.** Extract the identified owned contracts first; no measured benefit supports arbitrary file subdivision.
- **Do not replace SQLite, the DOM UI, Zod, or the build framework without a demonstrated defect that the replacement solves.**
- **Do not remove snapshot freezing to improve performance.** Fix cache invalidation while preserving the D263/D589 boundary.
- **Do not close homebrew vocabularies or reject imported placeholder content to simplify types.** D11/D12/D25 require preservation and extensibility.
- **Do not substitute an absent/fixed/unavailable DC union for the planned formula representation.** D268 explicitly rejected that approach.
- **Do not revive Laravel fidelity scaffolding or grandfathered command-history machinery.** D29/D201 make parity reference-oriented; D199 removed legacy history acceptance.
- **Do not turn all retries into success, add unlimited retries, or apply blanket timeout increases.** Existing exceptions are named and bounded.
- **Do not remove browser journeys merely because the suite is long.** Preserve storage, Worker, networking, rendering and user-flow assertions; D200 requires an unchanged assertion census for its authorized split.
- **Do not regenerate expected bytes from the refactored implementation.** Retained tests must remain independent.
- **Do not pin Node as the response to build variability.** D594 explicitly declines that policy.
- **Do not reopen exhaustive static held-out policing, settled challenge enumeration, or deferred art changes as generic cleanup.** D597/D598/D607 and D616/D619 constrain those directions.

# 6. Open questions for the owner

**None are required to make these proposals concrete.** The identified fixes can proceed within existing rulings. This round proposes no change to wire compatibility, supported content, engine authority, transport choice, or test acceptance policy.

# 7. What I could not assess

- I did not semantically read every line of the roughly 300,000-line application. This was a complete size/import census plus targeted implementation and test inspection; absence of a finding is not certification of an area.
- No fresh full-suite pass, browser-suite duration, browser rendering measurement, memory profile, or complete host latency benchmark was obtained.
- Snapshot timings are synthetic function-level measurements. Gate and Worker probes used actual extracted code with supplied external-boundary behavior.
- Compiler probes checked selected invalid constructions; they were not a whole-project typecheck.
- I did not evaluate AI model quality, paid arena outcomes, visual art quality, or Windows/Godot behavior.
- I did not inspect `.tmp/`, `dnd-slim-runs/`, sibling worktrees, owner art requests, or the other analyst’s report.
- I did not establish exploitability for the canonicalization defect or exhaustively audit every versioned canonical-byte consumer.
- No independent review occurred in this round, as instructed.

**APP-ANALYSIS R1 DONE — 11 findings**
