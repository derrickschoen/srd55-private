# OFFERS B19 — sol report (fresh session 01a0a872-57d9-78f2-8242-a8dcea7ecbeb, exit 0)

Implemented B19. Environment provenance is now required on every `ProposedTurnResolution`, persisted with proposals, validated as lowercase 64-hex when decoded, and checked before authoritative re-resolution.

Key changes are in [engine-envelopes.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/engine-envelopes.ts:30), [engine-server.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/engine-server.ts:3334), and [ai-dm-conversation.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tools/ai-dm-conversation.ts:4056).

### Type-system probe

With the field required but construction sites not yet fixed:

```text
src/vtt/blind-intent-resolver.ts(646,3): TS2741
src/vtt/mcp/engine-server.ts(3339,319): TS2322
src/vtt/mcp/engine-server.ts(3432,13): TS2322
src/vtt/mcp/engine-server.ts(3519,313): TS2741
tests/unit/tools/ai-dm-conversation.test.ts(2071,48)
tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts(63,3)
tests/unit/vtt/engine-state-capsule.test.ts(538,7)
tests/unit/vtt/engine-state-capsule.test.ts(617,21)
tests/unit/vtt/turn-exhaustion-coordinator.test.ts(136,19)
tools/ai-dm-conversation.ts(6503,15)
```

All were missing `offerEnvironmentDigest`. After populating them from their actual environments:

```text
npx tsc -p tsconfig.app.json --noEmit   # exit 0
npx tsc -p tsconfig.node.json --noEmit  # exit 0
```

### Test-first reds

Initial focused command:

```text
npx vitest run --configLoader runner tests/unit/tools/ai-dm-conversation.test.ts \
  -t 'divergence refuses a stored resolution produced under a different offer environment|rejects stored proposal resolutions with missing or non-64-hex environment digests|re-resolves independently specified stored mechanics before reporting divergence'
```

Before production changes: 1 passed, 2 failed.

```diff
- expected exact digest-mismatch divergence
+ received []

- expected false
+ received true
```

The SIMULATED authorized-round test also failed before production wiring:

```text
npx vitest run --configLoader runner \
  tests/unit/tools/local-openai-conversation.SIMULATED.test.ts \
  -t 'drives a full authorized round through context, frontier expansion, and submission'
```

```diff
- expected stored digest observations > 0
+ received 0
```

After implementation, the focused conversation tests passed 3/3 and the SIMULATED test passed 1/1.

### Required production mutants

Each mutant was applied after copying the production file, killed by the named test, restored with `cp`, and the restored SHA was verified.

| Mutant | SHA pristine → mutant → restored | Kill |
|---|---|---|
| Fresh legacy divergence environment | `5e5bc1c…` → `6ae5a548…` → `5e5bc1c…` | `divergence refuses a stored resolution produced under a different offer environment`: expected `[]`, received the exact stored/authoritative digest mismatch |
| Wrong stored digest in round constructor | `cfff0bcd…` → `1319cb9a…` → `cfff0bcd…` | SIMULATED authorized-round test expected three `0c2e08e…4afb` digests, received three zero digests |
| Digest comparison skipped | `e7a60144…` → `9f199dbe…` → `e7a60144…` | Digest-divergence test expected the mismatch diagnostic, received `[]` |
| `DIVERGENCE_TRUSTS_STORED_RESOLUTION` | `e7a60144…` → `2abe41ea…` → `e7a60144…` | Existing independently specified mechanics test expected the divergence diagnostic, received `[]` |
| Decoder skips stored-resolution validation | `e7a60144…` → `b63e2dd8…` → `e7a60144…` | Missing-digest assertion expected `false`, received `true` |

### D569 pin normalization

Exactly three serialized identity pins changed. Running the legacy-invariance test with each old pin produced:

```diff
- round:7b4c62cbfd6c10f561d936bc874fb194cbe990cf48b53977
+ round:b5cd275486dc8cbd44ae88d978b35e63b11e3d3e94125ec8

- ef06523ae111d9b9120138eea8a179b64e54917ab267544be0458286d4499e52
+ 3170b38053d7e0be8b96d2ee886f80e32bd2fad84d153d858c9a7c571677944e

- 01f3d6e008c69f0e30af64c45fdd2b6a21aac16e4d68e17bbea325cd569e7988
+ dd37aa41b78945f2eeddc98b7c46b3bbe20b0445897dc4975c61841851862425
```

The retained test strips only `offerEnvironmentDigest` and independently proves all three pre-B19 pins, demonstrating that the changes derive solely from the added field.

### Green receipts

Static gates:

```text
node scripts/check-command-outcomes.mjs                         # exit 0
node scripts/check-offer-environment-architecture.mjs --self-test
  # exit 0; 77 active fixtures
  # 1622 TypeScript files checked
  # runtime export allowlist: buildOfferEnvironment only
npx sg scan                                                     # exit 0
npx sg test                                                     # exit 0; 0 failed
```

Touched suites:

```text
8 files passed; 173 tests passed
```

Per file:

```text
109 tests/unit/tools/ai-dm-conversation.test.ts
 10 tests/unit/tools/ai-dm-legacy-invariance.test.ts
 15 tests/unit/tools/engine-mcp-server.test.ts
  2 tests/unit/tools/engine-mcp-golden.test.ts
  4 tests/unit/tools/local-openai-conversation.SIMULATED.test.ts
  8 tests/unit/vtt/adjustment-exhaustion-coordinator.test.ts
 11 tests/unit/vtt/engine-state-capsule.test.ts
 14 tests/unit/vtt/turn-exhaustion-coordinator.test.ts
```

Ten 3B suites:

```text
10 files passed; 374 tests passed
```

Per file: `8, 58, 17, 21, 109, 19, 7, 2, 129, 4`.

The 26-suite set passed:

```text
26 files passed; 308 tests passed
```

Broad required union:

```text
npx vitest run --configLoader runner tests/unit/vtt tests/unit/tools tests/integration/vtt
```

```text
207 files total
204 passed, 3 timed out
3379 tests total
3373 passed, 6 timed out
no assertion failures
```

The three timeout files were rerun alone exactly once:

```text
tests/unit/vtt/experiment-orchestrator.test.ts
  1 file passed; 52/52 tests; exit 0

tests/unit/tools/d583-contract-inventory.test.ts
  1 file passed; 17/17 tests; exit 0

tests/unit/tools/ai-dm-arena.test.ts
  1 file passed; 58/58 tests; exit 0
```

Final hygiene:

```text
git diff --check                    # exit 0
added lines over 120 characters     # 0
added forbidden suppressions/any    # 0
added skips/todos/env hiding        # 0
```

Frozen contract remains:

```text
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1
```

Worktree remains at `80411ca2736a9be0885435f3ded1f8b7c9358b14` on `claude/p-offer-help`, with 12 modified files, all within the allowed production/test scope. No git write command was used.

B19 DONE
