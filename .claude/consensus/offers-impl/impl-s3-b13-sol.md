Implemented B13 successfully. All nine authorized files changed; no caller outside the amended manifest required edits.

### Changes

| File | Pristine SHA | Final SHA | Summary |
|---|---|---|---|
| `src/vtt/dm-encounter-host.ts` | `bcfb911c…` | `9dca6c8b…` | Required branded environment; removed optional options/default legacy construction from old lines 393–409. |
| `src/vtt/encounter-board-projection.ts` | `6664a70c…` | `7c7f5024…` | Removed module-level legacy environment; fourth projector argument is required. |
| `src/vtt/encounter-projections.ts` | `281dfa9a…` | `0bbf2193…` | `projectDmBoard` requires the environment; removed old line-483 canonical/legacy fallback. |
| `src/vtt/engine-round-session.ts` | `c2b5b177…` | `48039d52…` | Constructor environment is required; removed old line-358 initializer. |
| `src/vtt/mcp/entrypoint.ts` | `47a4b994…` | `9826cea6…` | Required launcher binding/runtime environment; removed handler overloads and server/line/request defaults; switched to branded type. |
| `src/vtt/offered-option-paths.ts` | `849cac18…` | `52a8c345…` | Removed singleton/defaults from old lines 63/131/150; actor/path APIs require an environment. |
| `tools/ai-dm-arena.ts` | `2dc06081…` | `8025f195…` | Required root environment configuration and unconditional conversation threading. |
| `tools/ai-dm-conversation.ts` | `0e7ab470…` | `b7a94b6d…` | Required root configuration and divergence environment; rebuilt launcher bindings; threaded the environment through planning, rebasing, speculative adoption, catalogs, materiality, blind projection, and local resolvers. Removed all canonical/default-resolver uses. |
| `tests/unit/vtt/offer-environment-board-sequence.test.ts` | `ee6e6a1f…` | `27e81cae…` | Passed the existing environment to `projectDmBoard`; added legacy/revision digest-conservation assertions without changing existing assertions. |

No transitional seam was added.

The revision witness explicitly enables only `helpAttack`; `readyAttack`, `unarmedControl`, and `reposition` are disabled, with an unrepresented empty threat catalog.

The digest pins were independently calculated by SHA-256 over manually authored canonical binding bodies, including independently calculated policy/catalog digests:

| Pin | Before | After |
|---|---|---|
| Disabled policy | `a1572528052c75afbc8578372ed8307b1a982afc77a1d71b5c908a1b8a5ee28a` | unchanged |
| Unrepresented catalog | `0a892f9afb0bb2c0a6017de582b6756b1c604e57c816c91682feee1835d12d57` | unchanged |
| Legacy environment | `fb1c39f00b4caeea7c5ad92af428132e1f3cb6c44a61a59ba6551d22c90c275b` | unchanged/newly cross-pinned |
| Represented catalog | `31cec41a1f02589bb6c653877dc684f18ede160f882cee5f69e39961bde67061` | unchanged |
| Represented environment | `0fd2d8c790331e2e4bc6a622dda69569607b3d7d5d8b3487e26f8d59aa311074` | unchanged |
| New revision witness | — | `e93555826672102b37c9bcb16d53f743cffa90134c037ec015d5828e3ea1d3a2` |

The existing identity refusal remains unchanged at `offer-environment-identity.test.ts:74`: differently bound paths throw `OfferedOptionEnvironmentMismatchError`.

### Required-surface proof

Command:

```text
node scripts/check-offer-environment-architecture.mjs --self-test --stage required-surfaces
```

Exit `0`:

```text
offer-environment architecture self-test: 39 active fixtures passed
IB1-F1 probes: allowed-helper=0, indirect-canonical=1, type-of-value=1
IB2-F1 probes: namespace-export=1, imported-namespace-export=1, unrelated-namespace-export=0
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
```

The 11 activated fixtures cover:

1. `EngineRoundSession` constructor
2. `DmEncounterHost` options
3. `projectHumanEngineOptions`
4. `projectDmBoard`
5. `offeredOptionActorsForState`
6. `offeredOptionPaths`
7. `createEngineMcpRuntime`
8. `createEngineMcpHandler`
9. `handleMcpRequest`
10. `runEngineMcpServer`
11. `runEngineMcpLines`

Stage-live mutant:

```text
52a8c345… -> 0fbe8fb9…
offered-paths-missing-environment.ts:3: omitted real-symbol dependency compiled
```

Restored to `52a8c345…`.

### Mutant proof

| Mutant | SHA transition | Killing control and failure |
|---|---|---|
| `FALLBACK_USES_LEGACY_ONLY` | `31fb0d82… → 7d990bfa…` | `resolver fallback reuses the primary environment instance`: expected `{valid:true, selectedBranch:'fallback'}`, received `{valid:false, selectedBranch:'none'}`. |
| `BOARD_DIFFERENT_POLICY` | `0bbf2193… → 3a634705…` | Board-sequence test expected `e9355582…`, received legacy `fb1c39f0…`. |
| Host digest inversion | `9dca6c8b… → 8d46b9a6…` | `journals an engine adjudication request...`: `TypeError: DM board projection offer environment digest does not match the host environment.` |
| Human/offerable rank reversal | `7c7f5024… → e90b72f7…` | `human_only_sorted_last...`: `expect(actor.options.map(...)).toEqual(expected.candidates.map(...))` failed with human-only IDs first. |
| Round resolves primary instead of fallback | `48039d52… → df8ca825…` | `falls back after a forced displacement...`: expected `appliedBranch: 'fallback'`, fallback option ID and change codes; received Dodge/primary behavior. |
| MCP capsule uses a fresh legacy binding | `9826cea6… → ba505401…` | `external MCP reconstructs the same immutable environment`: `TypeError: Engine MCP application offer environment does not match its launch capsule.` |
| Path distance `+5` | `52a8c345… → 230762e0…` | `projects the resolver path...`: `expect(farAttack.distanceFeet).toBe(30)` received `35`. |
| Arena wall `180000 → 179999` | `8025f195… → 4ffbfba2…` | `parses the exact promo180 wall...`: expected `roundWallMs: 180000`, received `179999`. |
| Conversation protocol `3 → 4` | `b7a94b6d… → 2ca6fe6f…` | `starts the persistent SIMULATED session...`: `roundProtocolVersion: 3` received `4`. |

Every mutant was restored from its pristine `/tmp` copy and its restored SHA verified.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0
```

Architecture command:

```text
node scripts/check-command-outcomes.mjs
exit 0
```

Last four lines:

```text
staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

Forward contraction:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
src/vtt/dm-encounter-host.ts=0
src/vtt/encounter-board-projection.ts=0
src/vtt/encounter-projections.ts=0
src/vtt/engine-round-session.ts=0
src/vtt/mcp/entrypoint.ts=0
src/vtt/offered-option-paths.ts=0
tools/ai-dm-arena.ts=0
tools/ai-dm-conversation.ts=0
tests/unit/vtt/offer-environment-board-sequence.test.ts=0
```

Caller suites, with unchanged pre/post test counts:

```text
dm-encounter-host-live-path.test.ts     7/7
encounter-board-projection.test.ts     12/12
encounter-projections.test.ts          11/11
engine-round-session.test.ts           21/21
offered-option-paths.test.ts            4/4
engine-mcp-boundary.test.ts              8/8
engine-mcp-golden.test.ts                3/3
engine-mcp-handler.test.ts             130/130
engine-mcp-server.test.ts               14/14
ai-dm-arena.test.ts                     59/59
ai-dm-conversation.test.ts             108/108
```

The conversation 3B scaffold remains at its required current 54 lines; its pre-merge reference is 53. No test definition was removed.

Environment suites:

```text
offer-environment.test.ts                11/11
offer-environment-identity.test.ts         3/3
offer-environment-board-sequence.test.ts   1/1
Total                                     15/15
```

M-3 suites:

```text
handoff-bootstrap.test.ts          5/5
handoff-contract.test.ts           5/5
handoff-examples.test.ts           6/6
handoff-package-contract.test.ts   1/1
handoff-publish.test.ts            6/6
handoff-report.test.ts            49/49
Total                             72/72
```

Other checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
643 rows; no new spec

package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

.tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Added-line formatting:

```text
dm-encounter-host.ts max=80 over120=0
encounter-board-projection.ts max=80 over120=0
encounter-projections.ts max=80 over120=0
engine-round-session.ts max=80 over120=0
mcp/entrypoint.ts max=113 over120=0
offered-option-paths.ts max=80 over120=0
ai-dm-arena.ts max=51 over120=0
ai-dm-conversation.ts max=115 over120=0
offer-environment-board-sequence.test.ts max=112 over120=0
```

Residual canonical/obsolete-type grep over all nine files was empty.

Final status:

```text
 M src/vtt/dm-encounter-host.ts
 M src/vtt/encounter-board-projection.ts
 M src/vtt/encounter-projections.ts
 M src/vtt/engine-round-session.ts
 M src/vtt/mcp/entrypoint.ts
 M src/vtt/offered-option-paths.ts
 M tests/unit/vtt/offer-environment-board-sequence.test.ts
 M tools/ai-dm-arena.ts
 M tools/ai-dm-conversation.ts
```

S3 B13 DONE
