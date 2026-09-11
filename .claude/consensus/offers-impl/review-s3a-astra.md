**S3A-F1 — High: The production board loses all offered-option paths.**  
[offered-option-paths.ts:120](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offered-option-paths.ts:120) creates a fresh legacy environment when generating options; [line 139](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/offered-option-paths.ts:139) creates another when projecting their paths. The new WeakMap check compares instance identity and rejects that second environment at [intent-resolver.ts:550](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/intent-resolver.ts:550). Path projection silently discards every rejected option.

This is the existing production sequence: [encounter-projections.ts:397](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/encounter-projections.ts:397) generates options without an environment, then [line 411](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/encounter-projections.ts:411) projects them without one. Consequently, moving options lose their paths and associated hazard overlays. Preserve one environment across this sequence; the transitional surfaces cannot introduce this regression.

**S3A-F2 — Medium: The reported mutation proofs are not existing-test coverage.**  
All three reported killing tests reside exclusively in the ignored [.tmp/offers-s3a-environment-identity.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/.tmp/offers-s3a-environment-identity.test.ts:42). They are neither committed nor included by [vitest.config.ts:34](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/vitest.config.ts:34).

The nearest existing tests do not establish the required identity guarantees:

- **“falls through an unavailable primary option to its complete fallback option”** uses the query-only singleton resolver, so its options have no WeakMap environment binding. [snippets.test.ts:417](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/snippets.test.ts:417).
- **“projects the resolver path with all four engine-owned danger kinds and omits a no-movement option”** generates options through the query-only API, bypassing the production two-environment failure above. [offered-option-paths.test.ts:105](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/offered-option-paths.test.ts:105).
- `team-scorer.test.ts` exercises precomputed evaluations through `scoreTeamPlanEvaluations`, rather than the migrated `scoreTeamPlans` resolution path. [team-scorer.test.ts:4](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/vtt/team-scorer.test.ts:4).

The scratch-harness red/green evidence is useful, but does not prove committed coverage. **3B must add the three identity regressions—and the production board sequence—before the migration’s acceptance targets can be considered covered.** I have not established whether unrelated integration assertions incidentally kill individual mutants.

Verified:

- Exactly the roadmap’s ten source files changed; no tests changed. Plan SHA matches.
- Explicit-environment calls in the migrated resolver, scoring and MCP paths forward the received instance. Query extraction remains for mechanical queries and transitional APIs.
- The entrypoint retains its explicit immutable legacy default at [entrypoint.ts:321](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/src/vtt/mcp/entrypoint.ts:321).
- Registration remains standard-only. Submission schemas, revision-dependent option hashing, frozen contracts and the D545 schema-4 register are unchanged. No new model-controlled coordinates, paths or dice authority was introduced.
- No tests, builds or agents were invoked.

**REJECT 3A — blocking findings: S3A-F1 and S3A-F2.**