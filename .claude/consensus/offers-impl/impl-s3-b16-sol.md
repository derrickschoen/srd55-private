# OFFERS-IMPL-S3-BUILDER B16 — sol report (round 4, fresh session 01a0a7e8-b362-70d2-b6f8-8e3fb143c9bb, exit 0)

B16 is complete. The worktree contains only the ten authorized test-file changes: 102 insertions, 510 deletions, with no production changes remaining.

### Per-file changes

- `dm-encounter-host-live-path.test.ts`: removed `offerEnvironmentIdentityChecked` (old 43), `expectOfferEnvironmentIdentity` (45–69), and the runtime constructor spy/restoration block (75–87). Kept direct runtime binding and all host behavior. Added the D617.12 mismatched DM-digest rejection test.
- `ai-dm-arena.test.ts`: removed the flag (93), helper (95–117), runtime spy/restoration (125–137), obsolete equal-binding test (787–790), and its import-time failing assertion at old line 113. Kept direct capsule binding and all 58 named query/legality cases; they now collect and run.
- `ai-dm-board-delivery.test.ts`: removed both identity flags (66–67), helper (69–93), runtime call registry/restoration (99–111), launcher identity interception (205–208), and obsolete test (266–269). Kept launcher reconstruction, direct capsule binding, delivery behavior, and pins.
- `ai-dm-board-snapshot.test.ts`: removed helper (62–86) and runtime spy/restoration (298–309). Kept all 21 tests, runtime capsule binding, state-byte preservation, geometry, and freshness checks.
- `ai-dm-conversation.test.ts`: removed `LEGACY_OFFER_ENVIRONMENT` (123–126), flag (127), helper (129–153), runtime registry/restoration (159–171), obsolete test (888–891), and resolver-produced expected data (2109 onward). Kept direct binding and 107 behavior cases; restored an independent divergence oracle.
- `ai-dm-knowledge-base.test.ts`: removed flag (84), helper (86–110), runtime spy/restoration (116–128), and obsolete test (200–203). Kept KB limits, pins, behavior, and direct runtime binding.
- `engine-mcp-boundary.test.ts`: removed flag (35), helper (37–61), runtime spy/restoration (67–79), and obsolete test (136–139). Kept malformed-launcher, fallback-routing, digest, and protocol controls.
- `engine-mcp-golden.test.ts`: removed the legacy helper environment (38–41), identity helper (105–125), disconnected identity test (128–139), parent constructor registries/restoration (231–242), and later helper invocation (271–275). Kept both real-child goldens, all raw pins, exact reference handle, and proposal acceptance.
- `engine-mcp-handler.test.ts`: removed flag (66), helper (68–92), runtime spy/restoration (98–110), and obsolete test (549–552). Kept the complete 129-test MCP surface and direct capsule binding.
- `local-openai-conversation.SIMULATED.test.ts`: removed `environmentConstructor`, `runtimeConstructor`, `constructedEnvironments`, `consumedEnvironments`, restoration checks (old 243–269), and equal-object rejection assertions (337–363). Kept all four real-run cases, independent capsule/authorization reference, observed handle, advertised/submitted/accepted IDs, and transport assertions.

Seven obsolete identity-only tests were removed, while the host negative test was added. No other test was deleted, no pin changed, and no assertion was weakened.

### Divergence oracle

The room `3943006` fixture now supplies stored mechanics independently:

- A hand-authored 5-foot move to an adjacent cell.
- One Dodge main action with explicit slot fields.
- A deliberately false all-zero resolution digest.
- A stored summary ending in “after 5 feet.”

Authoritative resolution independently produces the fixture’s stationary Dodge—zero movement at the original token position, summarized as “after 0 feet.” The assertion expects the exact action/movement divergence diagnostic and does not derive its stored mechanics from a second resolver invocation.

### Mutant ledger

| Mutant | SHA transition | Killing evidence |
|---|---|---|
| `CONSUMER_DROPS_BOUND_ENV` | `526a3171…3524d` → `ef9b3161…d0cb6` → `526a3171…3524d` | SIMULATED “drives a full authorized round…” failed at line 295: expected reference digest `c059035e…`, received legacy `1f457418…`. |
| `MCP_CHILD_IGNORES_SERIALIZED_BINDING` / child-binding red | `0fb7e21e…63e79` → `746192f2…7fe5d` → `0fb7e21e…63e79` | Real-child golden failed at line 170: expected `engine-state:aecd0298…`, received `engine-state:8bba290f…`. |
| `DIVERGENCE_TRUSTS_STORED_RESOLUTION` | `526a3171…3524d` → `eea540ed…2151c` → `526a3171…3524d` | Conversation divergence test failed at line 2096: expected the exact independently authored diagnostic, received `[]`. |
| `HOST_SKIPS_DM_DIGEST_CHECK` | `9dca6c8b…983b4` → `5603d21c…1869d` → `9dca6c8b…983b4` | Host test failed at line 183: expected the DM-digest `TypeError`, but no error was thrown. |
| Same-binding second allocation, required green | `526a3171…3524d` → `7eec7cc5…00351` → `526a3171…3524d` | Nested second builder allocation passed the actual SIMULATED run: 1 passed, 3 filtered. Assertions at lines 295, 305, 315–324, and 326 remained green. |

Every production mutant was backed up first and restored with `cp`; post-restore SHAs match pristine. The D617.34 fresh-legacy divergence variant was not run because it is explicitly retired as equivalent.

### Final verification

Static gates:

```text
tsc app: exit 0, zero diagnostics
tsc node: exit 0, zero diagnostics
bash scripts/check-command-outcomes.sh: exit 0
unqualified architecture --self-test: exit 0, 77 fixtures
architecture repository scan: 1,622 TypeScript files
runtime export allowlist: buildOfferEnvironment only
sg scan: exit 0
sg test: exit 0, 1 passed / 0 failed
```

Single combined ten-file run:

| File | Result |
|---|---:|
| dm-encounter-host-live-path | 8/8 |
| ai-dm-arena | 58/58 |
| ai-dm-board-delivery | 17/17 |
| ai-dm-board-snapshot | 21/21 |
| ai-dm-conversation | 107/107 |
| ai-dm-knowledge-base | 19/19 |
| engine-mcp-boundary | 7/7 |
| engine-mcp-golden | 2/2 |
| engine-mcp-handler | 129/129 |
| local-openai-conversation.SIMULATED | 4/4 |
| **Total** | **372/372; 0 failed, 0 skipped** |

Other checkpoints:

```text
26 files: 307/307, 0 failed, 0 pending
Six M-3 handoff files: 72/72
Discovery: 643 rows, 643 unique, 0 fixture paths, 0 new specs
git diff --check: exit 0
Added-line maximum: 107 characters
Added lines over 120: 0
Forbidden additions / skips / todos / TS suppressions: none
```

Broad union command:

```text
npx vitest run --configLoader runner tests/unit/vtt tests/unit/tools tests/integration/vtt
```

Initial result: 202/207 files and 3,369/3,377 tests passed. All eight failures were timeouts:

- `ai-dm-arena.test.ts:1489`
- `ai-dm-screenshot-probe.test.ts:459`
- `d583-contract-inventory.test.ts:73,85,127,142`
- `engine-mcp-server.test.ts:208`
- `experiment-orchestrator.test.ts:488`

Each timed-out file was rerun alone exactly once:

```text
ai-dm-arena:                 58/58
ai-dm-screenshot-probe:      26/26
d583-contract-inventory:     17/17
engine-mcp-server:           15/15
experiment-orchestrator:     52/52
```

Thus the cumulative union is 3,377/3,377 after the permitted isolated timeout reruns, with no assertion defect.

Integrity hashes:

```text
package-lock.json
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867

src/vtt/intel/contracts.ts
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1

frozen plan
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4
```

Final status is exactly the ten authorized modified test files, with no untracked or production files.

B16 DONE
