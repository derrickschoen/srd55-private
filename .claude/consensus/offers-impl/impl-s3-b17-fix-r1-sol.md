Implemented both B17 fix findings. Only `legendary-windows.test.ts` changed.

### Changes

- Strengthened [legendary-windows.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:165) with three living enemies and forward/reversed combatant orders.
- Explicitly documents the Large Unicorn footprint and canonical distances: `alpha=5`, `beta=10`, `gamma=10`.
- Controlled distances are independently authored as `10,5,10`.
- Both orders assert controlled nearest `beta` and canonical nearest `alpha`.
- Added [the shared-port witness](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/legendary-windows.test.ts:214), passing one `EngineQueryPort` object to both `evaluateScenarioFact` and `provideLegendaryWindows`.
- Placed the shared witness here because this suite already owns the Unicorn/timeline setup; only the speculative evaluator and fact type needed importing.
- The other four B17 files remain byte-identical to `9761d22f`.

File SHA:

```text
before  243cbdd6812a1261414abf6e44b3ecd030830a8f8795c527f24e4989f9197a6b
after   c7a153af444ae50652877b738f7941ff66bd1a897426a7adc8497b5185c71c6e
```

Fix delta: 86 insertions, 19 deletions. Maximum added line length: 112; zero added lines over 120.

### Mutant proofs

All used:

```text
npx vitest run --configLoader runner tests/unit/vtt/legendary-windows.test.ts -t '<title>'
```

| Mutation | Mutant SHA | Killing result |
|---|---|---|
| Left operand uses canonical port | `4bb89e6bcbad5682da0533010d76a9f6d203fc35419bef85b9936986a13ce9fd` | Expected `legendary-distance-beta`; received `legendary-distance-alpha`. |
| Right operand uses canonical port | `f03f49ee582398d81d3a94d0533188118eb00fa4799ee81210e06653862848df` | Expected `legendary-distance-beta`; received `legendary-distance-alpha`. |
| Left operand replaced with `15` | `8afcf0248f0df5c8948185e6119d88a37ddf7be36c001d12075209734d639a7c` | Expected `legendary-distance-beta`; received `legendary-distance-alpha`. |
| Right operand replaced with `15` | `d24bf84053e89ae37ddef65ed6b241341fd3b36da6f0aa2353ea443c1fdc93bb` | Expected `legendary-distance-beta`; received `legendary-distance-gamma`. |
| Both operands use canonical port | `47fa556156357f5fab4e8cb7d453d26bd124b19952e9bfc7219df0f24dbe17c0` | Expected `legendary-distance-beta`; received `legendary-distance-alpha`. |
| Comparator returns only ID tie-breaker | `90168b4ded23b768ca4b8222c3c7899cf78f07557fff493f3fbb5d93cee573ce` | Expected `legendary-distance-beta`; received `legendary-distance-alpha`. |
| Legendary full bypass against shared witness | `47fa556156357f5fab4e8cb7d453d26bd124b19952e9bfc7219df0f24dbe17c0` | Expected `shared-distance-controlled`; received `shared-distance-canonical`. |
| Speculative full bypass against shared witness | `179e4b3dab2f0a714375d1c69930d027145f254518cd6d1a2314ebcdddb223d6` | Expected `{ matches: true, actual: true }`; received `{ matches: false, actual: false, failure: "FACT_FALSE" }`. |
| Arena canonical bypass, unchanged witness | `43de1a3572a4be0da61008a3bd61dee567bcf0850e695b8ab2b1ca0925abaf91` | Expected the exact scimitar-range refusal; received `[]`. |

Each production mutation was restored by `cp` from its pristine `/tmp` copy. Restored SHAs:

```text
3047630f4ada93ae566f1ec16b45ba2d1f280ce4e227d7b8ca3aeceadddef172  src/vtt/intel/legendary-windows.ts
d4887b9b9fb578a5d2b38fdee56dbda67032894981122ca47b062058ff5972f1  src/vtt/speculative-planning.ts
57aa47395b7e45a47dab1e26c09a07cc1f133bb38742eaee3f2261b048063ab6  src/vtt/arena-legality.ts
```

### Final green

TypeScript:

```text
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
exit 0

node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
exit 0
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
legendary-windows.test.ts           6/6
projected-movement-options.test.ts  3/3
ai-dm-arena.test.ts                59/59
blind-intent-resolver.test.ts      12/12
speculative-planning.test.ts       23/23
```

Full arena duration: `350.38s`, using its existing fakes/fixtures.

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

Forward-contraction overlay:

```text
node /tmp/s3-b6-forward-overlay.mjs

providerEdits=66 removedFactories=4
outsideCallerManifest=0
tests/unit/vtt/legendary-windows.test.ts=0
tests/unit/vtt/projected-movement-options.test.ts=0
tests/unit/tools/ai-dm-arena.test.ts=0
tests/unit/vtt/blind-intent-resolver.test.ts=0
tests/unit/vtt/speculative-planning.test.ts=0
```

Additional checks:

```text
git diff --check
exit 0

npx vitest list --configLoader runner --filesOnly --json
643
```

The residual grep over all five B17 files was empty.

Integrity:

```text
26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867  package-lock.json
0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1  src/vtt/intel/contracts.ts
fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4  .tmp-plans/2026-09-14-offer-environment-single-builder-plan.md
```

Final status:

```text
 M tests/unit/vtt/legendary-windows.test.ts
```

S3 B17 FIX R1 DONE
