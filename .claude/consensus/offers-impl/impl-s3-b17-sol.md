Implemented B17 across exactly the five allowed test files.

### File changes

| File | Pristine SHA | Final SHA | Added-line max |
|---|---|---|---:|
| [legendary-windows.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:23) | `51e20836c21f8713b5aa4b8e1c5227b4ee5c31c7d8d2104af2bab42e763c4aa6` | `243cbdd6812a1261414abf6e44b3ecd030830a8f8795c527f24e4989f9197a6b` | 111 |
| [projected-movement-options.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/projected-movement-options.test.ts:18) | `38b75f8785c028d02d4232071f1dd4a23209e2c74a3a7d4278d9d8431ed1e787` | `2e9802ecf07dc1e2d397d46420aa7b64a2ecec957fef6c095c6ea70ea9de2493` | 100 |
| [ai-dm-arena.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-arena.test.ts:741) | `3f56927223d8c1af79b0f7f28dc6be76724bc5d67f367c9ae1da3b5c580774ce` | `2c9a13b82f530604f1fcb271066c05be025837ad8bc4a95f19856f9366f753f6` | 95 |
| [blind-intent-resolver.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/blind-intent-resolver.test.ts:258) | `6c1fbf51b6edb8fa1690e530f79d5b6a7fc2e75612edccb526b1b1cf29a209cf` | `82731b1501e94b79fc7dc9f3aca35f131b9fb61d317caefbeff8fba37251d1fd` | 103 |
| [speculative-planning.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/speculative-planning.test.ts:147) | `92e0373c8e84fef60316d50b638a02e03e6c8f61d3b51a4890354d4110e3deaf` | `381e8b8413343891501656d650dfb354e9b2b39321f71fe09b2d38161b15f42f` | 106 |

No added line exceeds 120 characters.

Migrated sites:

- Legendary requests now receive `OFFER_ENVIRONMENT.queries` at lines 57, 64, 232, and 242.
- Projected movement uses environment queries at lines 127, 159, 191, and 220.
- Blind resolution’s real public boundary receives `OFFER_ENVIRONMENT` at line 266; synthetic matcher providers remain intact.
- Arena and speculative controlled-query witnesses use typed `EngineQueryPort` doubles without forging an environment.
- All prohibited canonical imports were removed.

New witnesses:

- `uses the supplied distance policy to select the nearest legendary-action enemy`
- `uses the supplied distance policy for adjacency facts`
- `uses the supplied distance policy for attack-range legality`
- `resolves the real public option catalog through the explicit environment`

Expected outcomes are hand-authored and compare controlled behavior against concrete canonical outcomes, not against the test port itself.

### Mutant proofs

| Mutant | Production SHA before → mutant | Killing control and failure |
|---|---|---|
| Legendary canonical bypass | `3047630f…` → `47fa5561…` | Distance witness: expected `combatant:legendary-distance-controlled`, received `combatant:legendary-distance-canonical`. |
| Speculative canonical bypass | `d4887b9b…` → `179e4b3d…` | Adjacency witness: expected `{ matches: true, actual: true }`, received `{ matches: false, actual: false, failure: "FACT_FALSE" }`. |
| Arena canonical bypass | `57aa4739…` → `43de1a35…` | Range witness: expected `["combatant:arena-distance-goblin: target is outside scimitar reach/range"]`, received `[]`. |
| Legendary action-use corruption | `3047630f…` → `ad733ff9…` | `mutation_guard: reports two remaining legendary uses after one declared-use action`: expected remaining `2`, received `3`. |
| Large-footprint collapse | `4344c0f2…` → `49252d72…` | `uses the complete Large footprint for blocked tails, hazards, and opportunity annotations`: `TypeError: Serialized placement mode does not belong to the sized combatant.` |
| Arena slot-cost deletion | `57aa4739…` → `ff630dcc…` | `rejects occupied movement and more than one slot-spending action on a path`: missing `${monster.id}: program can spend more than one slot`. |
| Blind rejection-code substitution | `fa011ea6…` → `ef9c34ed…` | `covers every closed rejection code through a concrete resolver boundary`: resulting set lacked `MISSING_ACTOR`. |
| Speculative influence-radius corruption | `d4887b9b…` → `59eb696c…` | `uses canonical active speed modifiers for unacted-player influence`: expected `40`, received `60`. |

Every mutant was restored using its pristine `/tmp` copy. Restored production SHAs:

```text
3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172  src/vtt/intel/legendary-windows.ts
d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1  src/vtt/speculative-planning.ts
57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6  src/vtt/arena-legality.ts
4344c0f23dbd359035bfaa99168d5dbbaed56b6482e901242d3165000fe131f5  src/vtt/engine-query-port.ts
fa011ea68733cdd24186933cd422707579d1124565a561db4954c7d5c0f96fa7  src/vtt/blind-intent-resolver.ts
```

No existing boundary fixture was rebuilt in B17, so no additional rebuilt-fixture shortcut mutant applied. `QUERY_DEFAULT_REINTRODUCED` compile fixtures remain deferred to B14/B18 as required.

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0
```

Forward-contraction overlay:

```text
providerEdits=66 removedFactories=4
outsideCallerManifest=0
tests/unit/vtt/legendary-windows.test.ts=0
tests/unit/vtt/projected-movement-options.test.ts=0
tests/unit/tools/ai-dm-arena.test.ts=0
tests/unit/vtt/blind-intent-resolver.test.ts=0
tests/unit/vtt/speculative-planning.test.ts=0
```

Command outcomes:

```text
node scripts/check-command-outcomes.mjs
exit 0

staged real-symbol fixture groups: required-surfaces:11, resolver:6, final-query:14
staged format fixtures: offers-format-env-retyped.ts, offers-format-policy-retyped.ts, offers-format-catalog-retyped.ts, offers-format-imported.ts
offer-environment architecture: 1621 TypeScript files checked
runtime export allowlist: builder plus exactly five transitional factories/wrappers
```

B17 specs:

```text
legendary-windows.test.ts                5/5
projected-movement-options.test.ts       3/3
ai-dm-arena.test.ts                     59/59
blind-intent-resolver.test.ts           12/12
speculative-planning.test.ts            23/23
```

The complete arena suite took `348.37s`; the other four suites reconfirmed together at `43/43`.

Environment suites:

```text
Test Files  3 passed
Tests       15 passed
```

M-3 handoff suites:

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
643 files
```

The residual grep for old factories, `canonicalEngineQueryPort`, ambient resolver, convenience constructors, and obsolete `EngineOptionEnvironment` produced no output.

Integrity:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
```

Final status:

```text
 M tests/unit/tools/ai-dm-arena.test.ts
 M tests/unit/vtt/blind-intent-resolver.test.ts
 M tests/unit/vtt/legendary-windows.test.ts
 M tests/unit/vtt/projected-movement-options.test.ts
 M tests/unit/vtt/speculative-planning.test.ts
```

S3 B17 DONE
