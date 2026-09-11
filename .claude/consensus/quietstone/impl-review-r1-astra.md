1. **Q-F1 — High · gap — Authored non-token colour budgets are weakened.**  
   [authored-envelope-ledger.test.ts:199](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/authored-envelope-ledger.test.ts:199) applies `≤ 20` to every off-ledger authored asset. The retained family budgets are floor **6**, wall **7**, door/terrain **16**. An in-memory seven-colour floor passed the implemented ceiling while failing its family budget. Use the retained family’s strict budget; permit the 29 enumerated token exceptions only.

   The provisional negative controls also test metric outputs rather than the bound-checking path. For example, the 21-colour control never exercises a ledger upper bound. Add controls that fail the actual envelope evaluator when a colour bound is exceeded, native detail decreases, or a silhouette falls below its pin.

2. **Q-F2 — Medium · gap — The hard alpha guard accepts forbidden opacity.**  
   [authored-envelope-ledger.test.ts:102](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/authored-envelope-ledger.test.ts:102) ignores every alpha except 128; the calling loop also excludes floors, walls, and doors. The original binary-alpha assertion skips authored inputs. In an in-memory fighter bitmap, replacing one body pixel with neutral-1 at **alpha 64** produced **no hard-invariant or frame failures**.

   Assert `{0,128,255}` explicitly, restrict 128 to the permitted family shadow regions, and require binary alpha for authored families without shadows. Add invalid-alpha controls against that evaluator.

3. **Q-F3 — Medium · plan-conformance — Chrome clearance is hard-coded.**  
   [authored-envelope-ledger.test.ts:116](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/authored-envelope-ledger.test.ts:116) embeds badge and HP coordinates directly; the annulus exclusion repeats them at line 120. R4 explicitly requires the `board-chrome` constants. Derive both rectangles and their negative-control locations from those constants so the assertions measure actual chrome.

4. **Q-F4 — High · correctness — Invalid manifest metadata reaches import writes.**  
   [import-authored-art.ts:40](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/assets/import-authored-art.ts:40) casts parsed JSON without validating its complete shape. In an in-memory filesystem harness, changing only `packageId` to `not-a-uuid` still returned **58 imported assets** and reached **59 write calls**, including 58 modules carrying that invalid ID. The manifest schema rejects it later.

   [authored-art-import-core.ts:125](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/assets/authored-art-import-core.ts:125) also interpolates metadata directly into TypeScript string literals. Validate UUIDs, hashes, paths, and the complete manifest/oracle shapes before generating or writing anything; serialize metadata with proper string escaping. Add package-level invalid-input controls proving zero writes.

5. **Q-F5 — Medium · plan-conformance — The aggregate-digest check is not independent.**  
   [starter-art.test.ts:150](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/starter-art.test.ts:150) imports both `fixedInputPaths()` and `frameFixedInputs()` from the emitter being checked. Its mutations exercise those same helpers. This does not implement S2’s independent aggregate recomputation.

   Derive the expected module paths independently from the frozen inventory, assert complete ordered coverage, and independently hash the specified framing. Keep the existing mutation controls.

6. **Q-F6 — Medium · gap — Production door seam coverage checks only one end.**  
   [pixel-art.test.ts:106](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/pixel-art.test.ts:106) checks north/west doors at one boundary and south/east doors at the other. The existing procedural test checks **both boundaries for every orientation and state**. Add the missing production comparisons and a broken-door-edge control; a broken straight-wall control does not exercise those omitted relationships.

7. **Q-F7 — High · correctness — The planned probe cannot execute unchanged.**  
   [plan:213](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md:213) puts snapshot images under `.tmp/runs/…`. [ai-dm-board-snapshot.ts:274](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-board-snapshot.ts:274) requires them under `dnd-slim-runs/<family>-images/` and rejects the planned location before capture.

   D611 also needs provider routing: [ai-dm-screenshot-probe.ts:2055](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/ai-dm-screenshot-probe.ts:2055) sends every model through `codex exec -m`. The established panel invokes Fable using `claude --model claude-fable-5-1`. Supply a provider-aware answerer/harness for the same three seats on both revisions, correct the image paths, and treat transport failures as blocked evaluation rather than comparable zero scores.

8. **Q-F8 — Medium · gap — The promised visual evaluation artifacts remain incomplete.**  
   [encounter-board-art.test.ts:48](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/encounter-board-art.test.ts:48) creates a test-local scene containing nine named monsters, not the reusable scene containing every distinct portrait. [generate-classic-contact-sheets.ts:156](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/assets/generate-classic-contact-sheets.ts:156) emits one native PNG; it does not generate the promised 64/32 nearest/area and grayscale matrix. The supplied directories contain one contact sheet and the ordinary board/page captures.

   Complete these supervisor-facing artifacts before presenting D610’s visual evidence. Do not describe the full matrix or distinct-portrait capture as completed.

9. **Q-F9 — Low · correctness — The frozen art object exposes mutable cached pixels.**  
   [art.ts:18](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/authored/art.ts:18) exposes `data: Uint8Array`; freezing the containing object at line 103 does not prevent `art.data[index] = …`. Subsequent renders copy those modified bytes despite unchanged source rows. Keep the cache private and expose copying/rendering operations; test that callers cannot mutate subsequent output.

Verification: all **58 committed and preview images** matched the frozen RGBA oracle; **34 preserved files** matched their pins. Ledger counts and colour/native-detail values matched the supplied exact diagnostics. The provenance digest matches both updated declarations. My single Vitest attempt collected no tests because temporary SSR-directory creation failed in this sandbox; it is not evidence of an implementation failure.

**REJECT — blocking findings Q-F1–Q-F7. Q-F8 remains required before the owner’s evaluation; Q-F9 is a residual.**