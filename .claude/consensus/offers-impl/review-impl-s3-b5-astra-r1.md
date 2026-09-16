# OFFERS-IMPL-S3-BUILDER B5 review r1 — gpt-6-astra (read-only)

Reviewed 0f5e3bea. Session 01a0a204-dbca-79c1-ad1f-f6cc4161230e. Log .tmp/runs/fanout/review-impl-s3-b5-r1.log.

## REJECT B5

**Blocking list: IBE1-F1, IBE1-F2.** Oracle integrity passes; two callers remain incompatible with the planned contractions.

Reviewed `0f5e3beabf25afc18163e30519afc8c975426029`; worktree remained clean.

### IBE1-F1 — P1, BLOCKING: Scenario-menu caller still omits its environment

**Location:** [engine-mcp-handler.test.ts:804](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/engine-mcp-handler.test.ts:804).

```ts
const menu = buildHostScenarioMenu(state, actors, players);
```

This still uses the transitional legacy default, whereas its runtime helper supplies `BOUND_OFFER_ENVIRONMENT`.

**Probe:** In-memory CompilerHost applying the planned provider contractions:

```text
engine-mcp-handler.test.ts:804
TS2554: Expected 4 arguments, but got 3.
```

**Minimal change:**

```ts
const menu = buildHostScenarioMenu(state, actors, players, BOUND_OFFER_ENVIRONMENT);
```

B5 must migrate this caller before B14 removes the default.

### IBE1-F2 — P1, BLOCKING: SIMULATED widens builder results to the obsolete structural type

**Locations:** [SIMULATED.test.ts:249](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/local-openai-conversation.SIMULATED.test.ts:249), comparison at **:255**.

`constructedEnvironments` explicitly uses `EngineOptionEnvironment` imported from the old codec module. Once the runtime parameter becomes branded, `consumedEnvironments.includes(environment)` rejects that structural value.

**Same contraction probe:**

```text
local-openai-conversation.SIMULATED.test.ts:255
TS2345: Argument of type 'EngineOptionEnvironment' is not assignable
to parameter of type 'RuntimeOfferEnvironment'.
Property '#brand' is missing.
```

**Minimal change:** Type the array as `readonly ReturnType<typeof buildOfferEnvironment>[]` and remove the obsolete type import.

**Verification:** Applying both minimal fixes solely in memory reduced B5 diagnostics from **2 to 0**.

### Dimension → verdict

| Dimension | Verdict and evidence |
|---|---|
| **Oracle integrity** | **PASS.** Audited all **12 removed / 17 added** assertion lines; no independent behavior oracle weakened. |
| **Child and SIMULATED references** | **PASS by inspection and bounded replay.** Both references use known fixture/configuration inputs, independent metadata and separately prepared capsules. |
| **Named mutants** | **PASS within replay limits below.** Exact reported source mutations reproduced their expected failures. |
| **Future signatures** | **FAIL — IBE1-F1/F2.** Eight files clean; two files have one diagnostic each. |
| **Public option generation** | **PASS.** Adjustment setup now generates and resolves real registered options; fabricated option objects were removed without changing coordinator assertions. |
| **Scaffolds and codecs** | Seven principal construction/identity scaffolds remain. The obsolete divergence getter interception is replaced by explicit invocation and an independent oracle. Binding codec retention is explicitly permitted by plan **:97–99**. |
| **Scope / B6 readiness** | Exactly ten test files, **+483/−185**, no production changes. No separate B6 prerequisite missing; the two B5 migration gaps require correction. |

### Oracle audit

| Changed assertion group | Removed → added | Assessment |
|---|---:|---|
| Conversation divergence | **5 → 5** | Tautological self-comparison replaced; explicit different-binding refusal retained; obsolete getter cleanup removed with its subject. |
| MCP golden | **1 → 5** | Cleanup retargeted to builder; independent child handle, proposal count, acceptance and clean exit added. |
| SIMULATED | **2 → 3** | Cleanup now checks the sole observed builder; independent row-binding and exposed-handle comparisons added. |
| Challenge fixtures | **4 → 4** | Query source changed; exact geometry and option-label expectations retained. |

The new divergence oracle at [ai-dm-conversation.test.ts:2114](/home/vagrant/PhpstormProjects/dnd-wt-p-offer-help/tests/unit/tools/ai-dm-conversation.test.ts:2114) specifies:

```ts
const expectedSummary = `${actor.profile.id} expands Dodge into 1 ordered use(s) after 0 feet`;
expect(proposalTime.summary).toBe(expectedSummary);
expect(proposalTime.mechanics).toMatchObject({
  actorId: actor.profile.id,
  movementCostFeet: 0,
  path: [],
  finalPosition: actorToken.position,
  actionSlots: [{ slot: 'main', kind: 'dodge', actionId: 'dodge' }],
});
```

The expected diagnostic uses `expectedSummary`, not another resolver result. Position comes from the fixture token.

SIMULATED’s reference session uses the independently loaded fixture, fixed RNG seed **8,274,113**, fixed request identifiers, and `REFERENCE_OFFER_ENVIRONMENT`. Submitted actor IDs affect subsequent option checks, **not reference-capsule construction**. Construction/consumption observations and advertised→submitted→accepted comparisons remain intact.

**Merge preservation against `0e2eb984`:**

- Conversation: **108 → 108 expanded tests**; only the intended divergence declaration changed.
- Knowledge base: **20 → 20**, all test declarations byte-identical.
- D569-labelled/contextual declarations: **13 → 13** conversation and **7 → 7** knowledge base, all byte-identical. The complete comparison also preserves the reconciled timeout/test changes.

### Mutation evidence

Every listed baseline passed and corresponding mutation failed. Applied hashes matched the report exactly.

| Mutation identifier | Replay result |
|---|---|
| Child binding `e7c792b7…` | Expected handle `engine-state:aecd0298…`; mutant returned `engine-state:8bba290f…`. Baseline also accepted advertised proposals. |
| SIMULATED binding `6c43ca33…` | Reference capsule and authorization: revision **6**, digest `c059035e…`; mutant produced `1f457418…`. |
| Divergence `7236e37f…` | Expected independent diagnostic; received `[]`. |
| Equal-binding `2786d46e…` | **Boundary and handler tests** each failed: valid resolution instead of mismatch refusal. |
| Adjustment fallback `e49e173e…` | Correction accepted instead of retaining the baseline. |
| Brutal-B range `5dd3d6f9…` | Expected final seed **6206010**, received **6206011**. |
| Challenge geometry `29266435…` | Expected distance **5**, received **10**. |

**Replay limitation:** No native child/HTTP run or filesystem-writing suite was executed. Child replay exercised the actual decoder, reconstruction, runtime and MCP handlers in process. SIMULATED replay exercised its independent reference against the production environment/session-construction segment. Full real-child and real-SIMULATED execution remains supervisor evidence.

### Compilation and checks

The forward overlay made **66 provider edits** and removed four old runtime factories:

```text
B5 group: 2 diagnostics — handler:804, SIMULATED:255
Other eight files: 0 diagnostics
After both proposed fixes in memory: all ten files 0 diagnostics
```

The broader overlay had **346 diagnostics**, reduced to **344** after these fixes; remaining diagnostics belong outside B5 to uncontracted callers/implementations.

Commands:

```text
git show --stat --oneline HEAD
git diff --unified=3 HEAD^ HEAD
git diff --unified=0 HEAD^ HEAD
git diff --check HEAD^ HEAD
git diff --numstat HEAD^ HEAD
git diff HEAD^ HEAD -- src tools package-lock.json
git status --short
node node_modules/typescript/bin/tsc -p tsconfig.app.json --noEmit --pretty false
node node_modules/typescript/bin/tsc -p tsconfig.node.json --noEmit --pretty false
sg scan --config sgconfig.yml src tools tests
node scripts/check-offer-environment-architecture.mjs
npx vitest list --configLoader runner --filesOnly --json
```

Compiler overlays and mutation replays used `node -` with stdin-only scripts.

Current-tree tsc: **both exit 0, zero diagnostics**. SG: **0 findings**. Architecture: **1,621 files**, builder plus exactly five transitional exports. Discovery: **643 unique files / 0 fixture paths**. Residual named-import grep: **0**. Added-line maximum: **114**, **0 over 120**. Diff check: **exit 0**.

Verified plan SHA `fa3c80167d9391bcf1c390582b33b11f372c82452cd1c6f2af5a9d36226418a4` and frozen contracts SHA `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`. Builder and lockfile remain unchanged.

**REJECT B5 — fix IBE1-F1 and IBE1-F2.**

S3 B5 REVIEW R1 DONE