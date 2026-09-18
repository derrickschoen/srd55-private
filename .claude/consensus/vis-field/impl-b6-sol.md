# VIS-FIELD B6 — sol report (r3 final, resumed 01a0ad72…, 506 k tokens)

Implemented and verified B6, including the D635.32 timeout ruling. The final aggregate is green: 760/760 tests across all 30 plan-named suites.

### Delivered

- Added the strict optional v2 `visibility` semantic block, observer/subject transposes, provenance, grades, profiles, and player-output omission.
- Added serializer sentinel preservation, effect obscurement union, Invisible-subject `visible_from`, and the hand-derived fog partition `[[4,0],[3,1]]`.
- Truncation order is explicitly `light → adjacency → objects → visibility`; visibility deletion is audited.
- Regenerated the v2 turn-context schema exclusively through `npm run schema:engine-mcp`.
- Advanced `SIGHT_TRACER_HAS_SINGLE_OWNER` to its final B6 stage.
- Applied only the ruled screenshot-test change: D635.32 comment plus `5_000 → 10_000` timeout at [ai-dm-screenshot-probe.test.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tests/unit/tools/ai-dm-screenshot-probe.test.ts:464). Isolated result: 1 passed, 25 skipped; test 5.27 s.
- Raised `BLIND_SEMANTIC_BOARD_MAX_BYTES` from 8,192 to 32,768 at [blind-turn-context.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/blind-turn-context.ts:35).

### Primer performance mechanism

A cold `defaultProbeStateCandidates()` computes 44 fact sheets:

- 20 eligibility projections: 5 generated bases × 4 cover tiers.
- 24 retained variants: 4 tiers × 6 variants.

Each fact sheet calls both projections at [ai-dm-screenshot-probe.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/tools/ai-dm-screenshot-probe.ts:829):

- `projectDmView`, which derives fog at [visibility.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility.ts:524).
- `projectEncounterBoard`, which derives fog again from the cloned DM state at [encounter-board.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/encounter-board.ts:716).

That is 88 projection calls. WeakMap reuse reduces the original-state computations to 29, but every encounter-board clone is distinct, producing 44 more full computations: 73 fresh derived-fog evaluations. Each scans all cells against eligible observers at [visibility-field.ts](/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/combat/visibility-field.ts:550).

### Blind semantic cap evidence

Exact serialized bytes for the seven retained hard fixtures:

| Seed | With visibility | Without visibility | After light | After adjacency | After objects | After visibility | 8,192 drops |
|---:|---:|---:|---:|---:|---:|---:|---|
| 5117001 | 16,603 | 8,517 | 15,626 | 15,254 | 14,592 | 6,506 | all four |
| 5117002 | 17,597 | 7,514 | 16,494 | 16,122 | 15,588 | 5,505 | all four |
| 5117003 | 14,804 | 7,365 | 13,816 | 13,549 | 12,887 | 5,448 | all four |
| 5117004 | 14,949 | 7,148 | 14,043 | 13,671 | 13,138 | 5,337 | all four |
| 5117005 | 13,406 | 6,690 | 12,416 | 12,149 | 11,617 | 4,901 | all four |
| 5117006 | 13,581 | 6,718 | 12,643 | 12,376 | 11,842 | 4,979 | all four |
| 5117007 | 16,921 | 7,324 | 16,090 | 15,718 | 15,311 | 5,714 | all four |

Why 32,768:

- 16,384 still rejects seeds 5117001, 5117002, and 5117007.
- A visibility-only cap would not protect the complete semantic attachment; seed 5117001 is still 8,517 bytes without visibility.
- 32,768 is the next power-of-two capacity above the measured maximum and remains half of the 65,536-byte blind base-context cap.

The D569 fixture directory remains unchanged: 10 files, combined inventory SHA-256 `3cb2a64978e5b5122733699cbcf33164ffd28709206b4e69851bd89a93d8b740`. `ai-dm-board-delivery.test.ts` is unmodified.

The unchanged D569 command:

```text
npx vitest run --configLoader runner tests/unit/tools/ai-dm-board-delivery.test.ts \
  -t "absent semantic-board and image-off flags preserve the committed raw context and invocation bytes|capture_only_leaks_image_block is killed by off-arm byte identity at every model boundary" \
  --maxWorkers=1
```

Result: 2 passed, 15 skipped, 70.64 s. No E1C normalization was needed; the existing FOOTPRINTS policy/handle normalization remains unchanged.

### RED-first and mutants

The initial targeted run reproduced the two known failures:

- `M576-E3-SEMANTIC-TERRAIN-NOT-A-PARTITION`: 1 red, now 1/1 green.
- `validates emitted adjustment_delta_truncated_board against the handler output schema`: expected only `light`, received `light, adjacency, objects`; now 1/1 green with the hand-calibrated `16,120 → 15,167 → 13,168 → 12,259 → 5,492` arithmetic and all four classes recorded.

All six mutants failed their named assertion, were restored with `cp`, and returned to green:

| Mutant | Baseline SHA → mutant SHA | Killing assertion |
|---|---|---|
| `SEMANTIC_VISIBILITY_RECOMPUTED` | `77cfdb2d…` → `a3703e5d…` | observer visibility sentinel differed |
| `VISIBLE_FROM_USES_SECOND_LADDER` | `77cfdb2d…` → `6bd4a339…` | subject `visible_from` sentinel differed |
| `EFFECT_OBSCUREMENT_OMITTED` | `77cfdb2d…` → `670b1342…` | expected effect cell `[0,0]` was absent |
| `VISIBILITY_TRUNCATION_UNAUDITED` | `b5eccfda…` → `b3ac789d…` | expected four classes, received only light/adjacency/objects |
| `SOURCE_BINDING_VISIBILITY_UNMAPPED` | `b132c39b…` → `78a850c4…` | visibility leaves reported unbound provenance |
| `STRICT_VISIBILITY_SCHEMA_LOOSENED` | `131b1a1a…` → `f8f8fedc…` | unknown visibility key was incorrectly accepted |

Restored baseline SHAs were confirmed after all tests.

### Final verification

Commands and results:

```text
npx tsc -p tsconfig.app.json --noEmit          exit 0
npx tsc -p tsconfig.node.json --noEmit         exit 0
npx tsc -b --force                             exit 0
node scripts/check-offer-environment-architecture.mjs --self-test
                                                  exit 0; 77 fixtures
node scripts/check-command-outcomes.mjs        exit 0; 1/1
```

D630 timing:

```text
/usr/bin/time -p npx vitest run --configLoader runner \
  tests/unit/vtt/replay.test.ts \
  tests/unit/vtt/detection-reactions.test.ts \
  --maxWorkers=1
```

Result: 36/36; Vitest 39.28 s, wall 38.71 s, below the ≈41 s ceiling. Earlier pre-B6 pair: 38.85 s; first post-B6 pair: 38.72 s.

Second aggregate command used `npx vitest run --configLoader runner --maxWorkers=1 --reporter=json` with the following 30 files. Result: 760/760, zero failed/pending, 1,171.07 s.

```text
decision-program                         16/16
creature-cover                            5/5
terrain                                  13/13
visibility-field                         37/37
visibility                               22/22
ai-dm-board-delivery                     17/17
ai-dm-conversation                      110/110
ai-dm-screenshot-probe                   26/26
engine-mcp-boundary                       7/7
engine-mcp-handler                      131/131
engine-mcp-server                        15/15
accessible-board                          6/6
actor-knowledge                           7/7
blind-context-source-binding              6/6
blind-turn-context                       47/47
challenge-room-fixtures                  17/17
content-pack                             27/27
detection-reactions                      17/17
encounter-projections                    11/11
engine-query-port                        17/17
experiment-orchestrator                  53/53
generated-encounter-fixtures             21/21
regret                                    6/6
replay                                   19/19
scene-snapshot                            8/8
semantic-board-payload                   11/11
senses                                   10/10
session-persistence                      22/22
stable-dom-render                        25/25
vane-warren                              31/31
```

Checkpoint results:

- Exactly 36 compiled `foggedCells` references re-enumerated; none is a canonical runtime-state consumer.
- One visibility producer/service owner; semantic payload reaches sight only through `visibility-field.ts`.
- Schema remains `engine-semantic-board-v2`.
- Generator idempotence: schema SHA before/after `npm run schema:engine-mcp` was `a08a735925a8c2a5d4a9d0c005ae2bcea7634a19952665246b595b54e1013fd4`.
- Frozen plan SHA unchanged: `6e8b3237f1876561fad5d18c1d2447eba6c914ef666b2a8e5daef2f97ef8fd2f`.
- `package-lock.json` SHA unchanged: `26711444f689e272f34332c97803c4e354ced137a04edf4796fae35ed0b54867`.
- All 84 legacy fixtures and frozen V1 hashes untouched.
- `git diff --check`: clean.
- Added-line audit: zero lines over 120 columns.
- Status contains 11 modified files, all within the ruled 12-file manifest; the twelfth allowed file, `ai-dm-board-delivery.test.ts`, correctly remains unchanged.

VIS-FIELD B6 DONE
diff --git a//tmp/measure-vis-field-b6-cap.ts b//tmp/measure-vis-field-b6-cap.ts
new file mode 100644
index 0000000000000000000000000000000000000000..3bbef37ac3cdd8fe32ad2489c8cac8a1899b71d3
--- /dev/null
+++ b//tmp/measure-vis-field-b6-cap.ts
@@ -0,0 +1,70 @@
+import {
+  createEngineMcpRuntime,
+  loadArenaFixture,
+} from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/mcp/entrypoint.ts';
+import { buildOfferEnvironment } from '/home/vagrant/PhpstormProjects/dnd-wt-vis-field/src/vtt/offers/build-offer-environment.ts';
+
+const CAP = 8_192;
+const encoder = new TextEncoder();
+
+function bytes(value: unknown): number {
+  return encoder.encode(JSON.stringify(value)).byteLength;
+}
+
+function record(value: unknown, label: string): Record<string, unknown> {
+  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
+    throw new TypeError(`${label} must be an object.`);
+  }
+  return value as Record<string, unknown>;
+}
+
+async function main(): Promise<void> {
+  const offerEnvironment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
+  for (let seed = 5_117_001; seed <= 5_117_013; seed += 1) {
+    const loaded = await loadArenaFixture(
+      `tests/fixtures/arena-basis-hard/seed-${String(seed)}.json`,
+    );
+    const runtime = createEngineMcpRuntime(loaded, {
+      dmMode: 'blind',
+      toolProfile: 'blind',
+      blindFacts: true,
+      offerEnvironment,
+    });
+    const capsule = runtime.feed.current();
+    const context = record(runtime.toolSurface.execute('engine.get_turn_context', {
+      run_id: capsule.runId,
+      expected_revision: capsule.revision,
+      scope: 'round',
+      granularity: 'full',
+    }), 'blind context');
+    const semantic = record(context['semantic_board'], 'semantic board');
+    const withoutVisibility = structuredClone(semantic);
+    delete withoutVisibility['visibility'];
+    const candidate = structuredClone(semantic);
+    const steps: { readonly factClass: string; readonly bytes: number }[] = [];
+    for (const factClass of ['light', 'adjacency', 'objects', 'visibility'] as const) {
+      if (bytes(candidate) <= CAP) break;
+      if (factClass === 'light') {
+        delete record(candidate['cells'], 'semantic cells')['light'];
+        delete candidate['light_sources'];
+      } else if (factClass === 'adjacency') {
+        delete candidate['adjacency_pairs'];
+        delete candidate['reach_range_summaries'];
+      } else if (factClass === 'objects') {
+        delete candidate['objects'];
+        delete candidate['doors'];
+      } else {
+        delete candidate['visibility'];
+      }
+      steps.push({ factClass, bytes: bytes(candidate) });
+    }
+    process.stdout.write(`${JSON.stringify({
+      seed,
+      withVisibility: bytes(semantic),
+      withoutVisibility: bytes(withoutVisibility),
+      steps,
+    })}\n`);
+  }
+}
+
+void main();
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index 7eb971aacb3ad8149d04fc87496c84260d918856..f6bde7cffa15233374c42303aceabab5fc63ceaa
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -461,6 +461,7 @@
 });
 
 describe('D524 general screenshot primer', () => {
+  // D635.32: Derived visibility makes this primer catalogue test a measured 5.1-5.3 s workload.
   it('is versioned, uses generic classic-board conventions, and leaks no non-rendered probe identity', async () => {
     const primerPrompt = screenshotQuestionPrompt('Q1', 'general');
     expect(primerPrompt).toContain(
@@ -543,7 +544,7 @@
         );
       }
     }
-  });
+  }, 10_000);
 
   it('D525: appends the light sentence per mode plus one sentence per glyph family under full, chosen by --board-glyphs, defaulting to none', () => {
     expect(PRIMER_VERSION).toBe('d576-general-board-primer-v12');
