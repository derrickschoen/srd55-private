# Quietstone classic art integration — plan (r1)

Unit QUIETSTONE-INTEGRATE-01. Author: supervisor (Claude). Reviewer: Astra. Implementer: codex sol.
Worktree `dnd-wt-quietstone`, branch `claude/quietstone-art` off main 85168bc5. Gate port 4330; capture ports 4590/4591.

Owner directive (2026-09-10): read the art assistant's `CLAUDE-INTEGRATE.md` and integrate the Quietstone
package into the classic top-down UI. Package: `art/incoming/01a08cc4-06f0-70ab-86cb-7662bba9f8ba-quietstone-classic/`
(copied into this worktree; gitignored). Its `REPORT.md`, `plan.md`, `manifest.json`, `validation.json`,
`provenance.json` and `review/*.json` are the delivery record. Status is **delivered, not accepted**.

## 1. Facts established by the supervisor before this plan

- The app never reads `public/assets/art/*.png`: `starterArtDataUri(id)` renders every asset in memory from
  `STARTER_ART_INPUTS[id].recipe` through `paintRecipe` (src/assets/pixel-art.ts). The PNGs are generator
  outputs pinned three ways: `src/assets/starter-art-output-hashes.ts` (written by
  `tools/assets/emit-starter-art-hashes.ts --write`), `tests/unit/assets/expected-art-hashes.ts` (independent
  oracle), and the byte-equality generator run in `tests/unit/assets/starter-art.test.ts`. The preview
  `src/assets/preview/starter-art-board.svg` embeds every asset and is pinned too.
- Package integrity (supervisor, `.tmp/runs/quietstone/svg-png-oracle.py`, Pillow 9.0.1): 120/120 candidate
  files match `manifest.json` sha256; all 60 SVG rectangle runs render pixel-identical to their PNGs; alpha
  values used are exactly {128, 255}; every alpha-128 pixel is `#2a2c30` = neutral step 1 (the repository's
  shared contact-shadow ink); 62 distinct colours, all inside the generated palette; 33 preserved originals are
  byte-identical to `public/assets/art`; 59 `replaces` targets exist and are unique; 59 + 33 = the 92-file
  inventory. Per-asset RGBA sha256 (raw 128×128×4 buffer, row-major, from Pillow's decode of the delivered
  PNG) is in `.tmp/runs/quietstone/candidate-rgba-oracle.json` (this worktree). Those digests are the
  external oracle for this change; the lane must never recompute them from its own renderer.
- The low wall (`01a08456-…-terrain-low-wall`, `replaces: null`) is a separate request for a new terrain
  feature. It is NOT promoted here (out of scope; not a starter replacement).
- Repository invariant suites run against the candidate bitmaps (throwaway worktree `dnd-wt-qs-diag`,
  `.tmp/runs/quietstone/diag-invariants.log`, `diag-metrics.json`): 18/26 pass, including wall/door seam
  continuity, four distinct opaque floors, distinct wall/door pieces, distinct archetype silhouettes (min
  pair rogue/ranger 0.0146 > 0.012), no speckle, 128-px lattice, party/foe plates differ, determinism.
  Failing (measured, per family):
  - tokens: colours 31–49 vs procedural budget 20 (fiend/ooze/construct 10–14); 236 alpha-128 shadow pixels
    each; plate annulus opaque fraction 0.776 (< 0.97) but 1.000 above the HP box; badge box (34,4,60×44)
    and HP box (22,112,84×12) contain zero non-transparent pixels; 1-px margin clear.
  - floors: nativeDetailFraction 0.002–0.022 (< 0.04); walls 0.025–0.031; doors 0.008–0.009.
  - doors and 37 tokens: minimum RGB distance 4.24/4.47 (< 8) caused by two palette-internal near-twin
    pairs: stone 4 `#6a7381` vs metal 1 `#6b7485`, stone 3 `#515461` vs metal 0 `#535465`.
  - terrain: shadows alpha 128; pillar highlight/shadow centroids 126/126 (no top-left bias); rubble,
    crate, hazard have no highlight pixels by the procedural test's definition.
- Visual review (supervisor, review sheets + real board captures): room boundary reads first, blue/red
  plates visible, floor subordinate, doors read as openings with a visible leaf, props in plan view; at
  32 px busts become role-blobs (goblin green, wolf grey, fiend red), individual faces do not survive.
- `terrain-hazard` has recipe material `semantic` in pixel-art.ts. The package's own rule was "semantic
  assets unchanged pending the AI comprehension probe"; it misclassified hazard as a prop.

## 2. Rulings (supervisor; recorded in .claude/decisions.md; owner may override)

R1 Scope: promote **58** assets (the 59 `replaces` minus `terrain-hazard`, R7). Preserved set becomes 34.
R2 Authored art is a new asset class, `kind: 'authored'`, rendered from checked-in palette-run source. The
   procedural painters, recipes and their technique tests stay untouched (rollback path, and they still
   test code that exists). Tests that iterate `STARTER_ART_INPUTS` get an authored-class branch with the
   invariants below; nothing procedural is loosened.
R3 Contact shadow: authored assets may use alpha 128 only for pixels whose colour is neutral step 1
   (the shared shadow ink); every other pixel is alpha 0 or 255. The "shared contact-shadow colour"
   invariant counts neutral-1 pixels at alpha 128 or 255 (≥ 12) for tokens/terrain. Reason: the owner's
   D588.1 requests specified a ≤60 % drop shadow; on the composited board a half-alpha shadow still
   grounds the object (primer wording unchanged).
R4 Plate under chrome: authored tokens must be alpha 0 inside the primary badge box and the HP box
   (chrome-aware, from board-chrome constants, not literals) and keep the plate ring ≥ 0.97 opaque in the
   annulus ABOVE the HP box (measured 1.000). The old test demanded paint under the HP bar; this contract is
   stronger where it matters and identical elsewhere. Chrome is not moved.
R5 Colour budget: authored tokens ≤ 50 colours (measured max 49), other authored kinds keep the procedural
   budgets (measured within them). Reason: the 20-colour budget encodes the procedural bust technique;
   image-derived busts carry more steps; readability is judged by the 32/64 review and the probe, and a
   v2 re-delivery finding asks for ≤ 24. Palette membership stays absolute.
R6 Minimum RGB distance ≥ 8 stays, excluding only the palette's own near-twin pairs. A new palette test
   pins that the generated palette has exactly two pairs closer than 8 (the pairs above) so the exclusion
   cannot silently grow.
R7 `terrain-hazard` keeps its procedural recipe (semantic material) with the 33 preserved semantics.
R8 Native detail: authored assets require nativeDetailFraction > 0 (rejects an exact 2× enlargement, the
   metric's stated purpose) plus the seam/silhouette invariants; the ≥ 0.04 floor stays procedural-only.
   Reason: the metric cannot separate a quiet plan-view surface (the README's stated goal) from an
   upscale; the candidate's 2-px clustering is deliberate for 2–4× downscale readability.
R9 Light direction (pillar centroids equal) is a v2 re-delivery finding, not a gate: the procedural
   directional tests stay procedural-only; authored props are judged by the probe.
R10 Acceptance: request JSON status flips to `accepted` (owner-side files, D595, supervisor edits in the
   main checkout only) after the full gate AND the screenshot comprehension probe show no regression
   against the same-seed baseline. Landing on main follows the same rule. Until then: delivered.
R11 Provenance is stated truthfully: reference imagery from a browser image model (Google Gemini, "Pro"
   selector; conversation URL in provenance.json); final pixels reauthored by the assistant's Python
   pipeline; busts adapted from the earlier owner-approved magenta sheet whose exact prompt is not
   reconstructed; fiend/ooze/construct drawn locally; CC0 for the authored contribution; the image
   service's terms are unreviewed. No relabelling as hand-drawn; no claim the terms are resolved.

## 3. Design

### S1 — Authored pixel source and importer
- New module family `src/assets/authored/*.ts` (one per asset, named by the output file stem, e.g.
  `token-pc-fighter-v1.ts`) plus `src/assets/authored/index.ts`. Each module exports one frozen
  `AuthoredPixelArt` built by a checked constructor: `{ id, requestId, packageId, svgSha256, pngSha256,
  rows }` where `rows` is exactly 128 strings, each a space-separated run list summing to 128 pixels.
  Run grammar (codex may refine, must stay greppable text and palette-addressed, never RGB literals):
  `.N` transparent ×N; `<ramp><step>xN` opaque; `<ramp><step>hxN` half alpha (only `n1h…` is legal per
  R3). Ramp letters: s stone, w wood, e earth, m moss, W cloth-warm, C cloth-cool, M metal, k skin,
  n neutral. Constructor validation at module load: 128 rows, 128 px per row, valid ramp/step, R3 alpha
  rule; violations throw with the asset id and row.
- `tools/assets/import-authored-art.ts` (`npm run art:import -- --package <dir> [--check]`): reads the
  package `manifest.json`, parses each SVG's `<rect>` runs (the only SVG shape used), verifies the SVG
  sha256 against the manifest, maps hex → (ramp, step) via `paletteRgb` (unknown colour = hard error),
  applies the id list (58, hazard excluded by name), writes the modules deterministically; `--check`
  re-derives and diffs. The importer is the documented, re-runnable command; modules are never hand-edited.
- `ArtRecipe` gains `{ kind: 'authored'; material: 'authored'; art: AuthoredPixelArt }` (or an equivalent
  typed shape); `paintRecipe` blits the rows and skips the material-response pass for this kind. Types
  must make an unknown asset id, a wrong row count or an RGB literal a compile or load-time failure.

### S2 — Inputs, manifest, digests
- `starter-art-inputs.ts`: the 58 ids switch to authored recipes; the four hazard/semantic/fog/focus/event
  and `token-dead` inputs stay procedural. `STARTER_ART_INPUT_SET_ID` → `starter-art-inputs-v5`,
  `STARTER_ART_GENERATOR_VERSION` → `5.0.0` (the generator is now a pure function of inputs + authored
  modules). `computeStarterArtDigests.fixedInputs` covers `starter-art-inputs.ts` plus every authored
  module in id order (documented in the emitter header).
- Manifest `source`: discriminated union — `procedural` rows unchanged; `authored` rows add `requestId`,
  `packageId`, `svgSha256`, `pngSha256`, `reference: 'image-model reference, script-reauthored'`. Creator,
  collection title, license, attribution unchanged (CC0, SRD-55 contributors).
- Regenerate through the documented commands only: `emit-starter-art-hashes.ts --write`,
  `generate-starter-art.ts --generate` (58 PNGs + preview). No hand edits to generated files.

### S3 — Tests (no deletions; every changed assertion listed with its stronger replacement)
- New `tests/unit/assets/authored-art.test.ts`:
  (a) for every authored input, sha256 of `paintRecipe(recipe).data` equals the RGBA oracle from
      `tests/unit/assets/expected-authored-rgba.ts` (values copied verbatim from the supervisor's
      `candidate-rgba-oracle.json`; header states the Pillow provenance) — this licenses the 58 PNG pins;
  (b) importer `--check` is clean against the package (skipped only with an explicit BLOCKED message if the
      package directory is absent — never a silent pass; in CI the package is absent, so the check runs as
      a supervisor command and the test asserts the modules' recorded svgSha256 match the manifest copy
      embedded in the index);
  (c) identity: the 13 named monster ids and the archetype×side ids each resolve to their own module;
      goblin≠ogre, skeleton≠zombie, priest≠acolyte, hobgoblin≠bandit-captain, wolf≠… differ in RGBA;
      the pc/party twins are byte-equal by design (recorded);
  (d) R3/R4 chrome-aware token contract using board-chrome constants; (e) floors share all boundary pixels;
  (f) wall/door orientation: the generic wall's floor-facing edge strip is on the south edge, and each
      `-side` piece is the rotation of it (matches `wallPieceAt`/`doorSideAt` semantics);
  (g) R5/R6/R8 authored invariants; (h) hazard remains procedural.
- `classic-art-techniques.test.ts` and `pixel-art.test.ts`: loops over `STARTER_ART_INPUTS` branch on
  `recipe.kind === 'authored'` to the authored contract (R3–R8); procedural assertions unchanged.
- `palette.test.ts`: pin the exact near-twin pairs (R6).
- `starter-art.test.ts`: generator version/input-set literals; `source.type` union; the "no external
  art-family provenance" case is rewritten to its intent: every source type ∈ {procedural, authored},
  every authored row's requestId names a tracked `art/requests/<id>-*.json` whose `license` is CC0-1.0,
  and ART-PROVENANCE.md names the packageId; counts (92 assets, 36 tokens) unchanged.
- `expected-art-hashes.ts`: 58 output pins + preview + fixedInputs updated, with a dated header paragraph
  naming the licensing invariant (S3a). PNG size < 12 000 bytes stays; if any authored PNG exceeds it,
  STOP BLOCKED with the number (never raise the limit).
- `source-is-greppable.test.ts` unchanged (92 PNGs, text modules).

### S4 — Provenance and docs (lane may edit repo-root files, not docs/**, .claude/**, art/**)
- `ART-PROVENANCE.md`: new section per R11 listing the package id, the 58 request ids (by batch
  `redo-starter-art-v1` and file list), the terrain prompt verbatim from `prompt-log.md`, the bust source
  note, and the unreviewed-terms statement. `LICENSE-ART` unchanged (package copy is byte-identical).
- `art/requests/README.md` is owner-edited and uncommitted in the main checkout (D595): do not edit it here.

### S5 — Supervisor verification (not the lane)
- Fresh `npm run build`; `art/requests/capture-screenshots.mjs --dist dist --port 4590 --mode plain`
  (the shipped art is now Quietstone) and the preview SVG rasterised; contact sheets via
  `tools/assets/generate-classic-contact-sheets.ts` into `.tmp`; compare with the package captures.
- Full gate `gate-wt4.sh wt-quietstone` (port 4330) in a quiet window; browser suite included.
- Screenshot comprehension probe (`tools/ai-dm-screenshot-probe.ts`, same seed/states/models as the
  D573 baseline) on the new build vs the baseline rows; regression = hold (R10).
- Request statuses (main checkout, uncommitted) → `accepted` only after R10 holds; else delivered with
  the findings section below appended to `notes`.

## 4. Findings for a v2 re-delivery (recorded, not gated)
F-A pillar/props lack a measurable top-left light bias; F-B token colour count 31–49 (target ≤ 24);
F-C two palette near-twin pairs used in one asset; F-D skeleton/zombie, priest/acolyte,
hobgoblin/bandit are near-identical variants (no regression: the procedural set had them byte-equal);
F-E hazard misclassified as a prop; F-F terrain-low-wall root compatibility copy differs from the package
copy (earlier delivery, documented by the package).

## 5. Verification contract for the lane
`npm run typecheck:fast`; `sg scan`; `git diff --check`; importer `--check`; `emit-starter-art-hashes --print`
diff shows exactly 58 changed digests + fixedInputs; `generate-starter-art --check` verified 92 + preview;
vitest: authored-art, starter-art, classic-art-techniques, pixel-art, palette, encounter-board-art,
board-glyphs, light-encoding, source-is-greppable, token-archetypes, board-chrome (list counts);
`git diff --stat` for public/assets/art shows exactly 58 PNGs changed. Report every changed `expect(` with
its replacement. End with `QUIETSTONE INTEGRATE DONE` or `BLOCKED: <reason>`.

## 6. Non-goals / rollback
No renderer, chrome, coordinate, fixture, primer, glyph or legend changes. No Godot/isometric work. No
low wall. Rollback = revert the branch; procedural recipes and pins are untouched in history.
