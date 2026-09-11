# Quietstone classic art integration — plan (r2)

Unit QUIETSTONE-INTEGRATE-01. Author: supervisor (Claude). Reviewer: Astra (r1 verdict REVISE, F1–F11; this r2
answers every finding). Implementer: codex sol. Worktree `dnd-wt-quietstone`, branch `claude/quietstone-art` off
main 85168bc5. Gate port 4330; capture ports 4590 (board captures) and 4591 (probe snapshots).

**Owner ruling D610 (2026-09-10 20:35):** the Quietstone art is EVALUATED ON THE BRANCH. The pipeline and the
authored asset class are built with the four contested relaxations recorded as PROVISIONAL and branch-only; the
full gate and a same-revision old-vs-new screenshot probe run; the owner decides on the numbers. Nothing lands on
main until the owner rules. Every procedural assertion stays intact, and every provisional envelope is explicit,
enumerated per asset and pinned so it cannot widen silently (§2, "envelope ledger").

Package: `art/incoming/01a08cc4-06f0-70ab-86cb-7662bba9f8ba-quietstone-classic/` (gitignored; copied into this
worktree). Delivery record: `CLAUDE-INTEGRATE.md`, `REPORT.md`, `plan.md`, `manifest.json`, `validation.json`,
`provenance.json`, `prompt-log.md`, `review/*`. Status: delivered, not accepted.

## 1. Facts (supervisor-verified; r1 errors corrected per F1/F2)

- The app renders every asset in memory from `STARTER_ART_INPUTS[id].recipe` via `paintRecipe`; the PNGs under
  `public/assets/art` are generator outputs pinned by `starter-art-output-hashes.ts` (emitter), the independent
  oracle `tests/unit/assets/expected-art-hashes.ts`, and the byte-equality generator run; the preview SVG is pinned.
- Package integrity: 120/120 files match `manifest.json` sha256; 60/60 SVG rectangle runs render pixel-identical
  to their PNGs under Pillow 9.0.1 (`.tmp/runs/quietstone/svg-png-oracle.py`); alphas {128, 255}; every alpha-128
  pixel is neutral step 1 (`#2a2c30`, the shared shadow ink); 62 palette colours; 33 preserved originals
  byte-identical; 59 unique `replaces` + 33 preserved = the 92-file inventory. Per-asset RGBA sha256 (raw
  128×128×4, row-major, Pillow decode) is in `.tmp/runs/quietstone/candidate-rgba-oracle.json`. Astra
  independently re-verified all 120 hashes, the 60 RGBA digests and the 33 preserved files.
- Delivered pixel-identical groups (8): pc/party fighter, cleric, wizard, rogue; ogre/foe-brute;
  priest/foe-cleric; skeleton/foe-undead; wolf/foe-beast. All other ids differ (hobgoblin/bandit-captain,
  priest/priest-acolyte, skeleton/zombie differ by local variants).
- Repository encoder PNG size for every candidate ≤ 2,281 bytes (Astra) — the 12,000-byte limit is not at risk.
- The 58 selected assets hold 61,149 rectangles = 68,849 horizontal runs as full rows.
- Invariant measurements BY EXPLICIT ASSET ID (`.claude/consensus/quietstone/diag-byid-r1.json`,
  `diag-metrics-r1.json`; r1's recipe-keyed lookup was wrong and is retired):
  - tokens: 31–49 colours (fiend/ooze/construct 10–14) vs procedural budget 20; 236 alpha-128 shadow pixels
    each; plate annulus 0.776 opaque overall and 1.000 outside the exact HP rectangle (22,112,84×12); badge
    rectangle (34,4,60×44) and HP rectangle contain zero non-transparent pixels; 1-px margin clear.
  - silhouettes (party+foe descriptor, existing test definition): cleric/undead 0.01128 and cleric/beast
    0.01184 FAIL the existing `> 0.012`; next lowest rogue/ranger 0.01459, beast/undead 0.01596.
  - floors: nativeDetailFraction 0.002–0.022; walls 0.025–0.031; doors 0.008–0.009 (floor 0.04).
  - the generated palette itself has SEVEN pairs closer than 8 RGB: stone1/metal0 4.690, stone2/metal1 4.472,
    stone3/metal2 4.243, wood0/earth0 7.550, moss0/neutral0 6.481, cloth-warm5/skin3 6.000,
    cloth-warm6/skin4 4.690; 29 tokens and 8 doors use at least one such pair.
  - terrain: shadows alpha 128; pillar highlight/shadow centroids 126/126; rubble, crate, hazard have no
    highlight pixels under the procedural test's definition.
  - passing as delivered: wall/door seam continuity, four distinct opaque floors, distinct wall/door pieces,
    no speckle, 128-px lattice, party/foe plates differ, determinism.
- `terrain-hazard` is `material: 'semantic'` in pixel-art.ts; the package replaced it against its own rule.
- Walls are NOT rotations of the north wall: `build_art.py` keeps the cap pattern fixed and varies the edge
  treatment; corners carry two edges. Orientation is defined by the floor-facing edge strip (north wall: south
  edge), matching `wallPieceAt`/`doorSideAt`.
- The repository has 13 fixture-named tokens: four PCs and nine monsters. Runtime selection gives generic PCs the
  fighter archetype (`token-archetypes.ts`); named mappings come from encounter package art maps.
- Provenance today: `ART-PROVENANCE.md` opens with a blanket "no third-party images were used" statement and the
  preview generator emits `pure-procedural-only; cc-by-4.0` metadata — both must change (F11).

## 2. Rulings (supervisor; D609/D610; Astra r1 dispositions applied)

R1 KEEP — promote exactly 58 assets (59 `replaces` minus `terrain-hazard`); preserved set = 34. Both sets are
   pinned by id in `tests/unit/assets/expected-authored-inventory.ts` (id → requestId → RGBA digest → equality
   group). The low wall (`replaces: null`) is out of scope.
R2 TIGHTEN — authored recipes keep the visual family: `{ kind: 'authored'; family: <the procedural recipe this
   asset replaces>; art: AuthoredPixelArt }`. `family` is the exact procedural recipe (token archetype+side, floor
   variant, wall piece, door side+state, terrain object), so budgets, seam relations, plate/side checks and
   orientation are recoverable and typed. Every applicable production invariant runs against production ids
   (`STARTER_ART_INPUTS`), not only against `tokenRecipe()`/literal procedural recipes (F4). Procedural painters
   and their technique tests are untouched.
R3 TIGHTEN — authored assets may use alpha 128 only for pixels that are (a) neutral step 1 AND (b) inside the
   contact-shadow region of their family: tokens — ellipse centre (69,96) radii (51,29); terrain — ellipse centre
   (69,72) radii (44,42) (both from the delivery's `plan.md`/`build_art.py`, cross-checked on the bitmaps). All
   other pixels are alpha 0 or 255. Shared-shadow count keeps the strict `> 12` on neutral-1 at alpha 128 or 255.
R4 TIGHTEN — authored tokens: zero non-transparent pixels inside the badge rectangle and the HP rectangle
   (taken from `board-chrome` constants); plate annulus `> 0.97` opaque over the annulus MINUS the exact HP
   rectangle only; 1-px margins transparent; faction colour: plate sample points on the ring belong to the
   cloth-cool ramp for party and cloth-warm for foe (the existing party/foe row-110 difference stays).
R5 PROVISIONAL (D610) — token colour budget: strict 20 remains the assertion for procedural inputs; authored
   tokens are asserted against the provisional envelope ≤ 50 AND their strict-budget outcome is pinned per id in
   the envelope ledger (32 ids over 20 today, values pinned; a higher count or a new id in the ledger fails).
R6 PROVISIONAL (D610) — minimum RGB distance ≥ 8 stays; a new `palette.test.ts` case pins the exact seven
   near-twin pairs of the generated palette; authored assets are asserted with those seven pairs excluded AND the
   ledger pins which 37 ids use which pair. Palette membership stays absolute.
R7 KEEP — hazard stays procedural; its pin and the 33 other preserved pins are asserted unchanged (34 pins).
R8 PROVISIONAL (D610) — native detail: strict ≥ 0.04 remains for procedural inputs; authored inputs are asserted
   `> 0` (rejects an exact 2× enlargement) AND `≥` their pinned measured value in the ledger (floors 0.0022–0.0221,
   walls 0.0245–0.0306, doors 0.0080–0.0089; tokens/terrain all ≥ 0.04 and are asserted at the strict floor).
R9 PROVISIONAL (D610) — light direction: the procedural centroid test stays procedural; the ledger pins the
   authored pillar centroid pair and the three props with no highlight pixels; no acceptance claim is made.
   Silhouettes: strict `> 0.012` stays for procedural; the ledger pins cleric/undead 0.01128 and cleric/beast
   0.01184 and asserts no pair falls below its pinned value; all other pairs are asserted at `> 0.012`.
R10 TIGHTEN — acceptance criteria and the probe protocol are executable (§5); request statuses stay
   `delivered` until the owner rules; the main landing needs the owner's ruling plus the full gate.
R11 TIGHTEN — provenance made consistent (§4): ART-PROVENANCE's clean-room statement scoped to procedural
   assets; preview metadata emitted by the generator describes both classes under CC0; tool identity recorded
   separately from contributor attribution; the unavailable portrait prompt is an explicit unresolved criterion
   in the ledger; no relabelling, no claim that the image service's terms are resolved.

The envelope ledger is `tests/unit/assets/authored-envelope-ledger.ts` + its test: one row per (id, invariant)
where the strict D516 threshold is not met, with the measured value. The test asserts (i) every authored id not in
the ledger meets the strict threshold, (ii) every ledger row still holds at least its pinned value (no regression),
(iii) no row is stale (an improved asset must be removed from the ledger). The ledger is the owner's decision
input and is reproduced verbatim in the final report.

## 3. Design

### S1 — Authored pixel source, typed shape, importer (F8, F10)
- `src/assets/authored/<output-stem>.ts` (58 modules) + `src/assets/authored/index.ts` (frozen id → module map,
  the 58-id list and the 8 equality groups). Each module exports one `AuthoredPixelArt` built by
  `authoredArt({ id, requestId, packageId, svgSha256, pngSha256, rows })`: `rows` is exactly 128 strings of
  space-separated runs summing to 128 px; grammar `.N` transparent, `<ramp><step>xN` opaque, `<ramp><step>hxN`
  half-alpha; ramp letters s stone, w wood, e earth, m moss, W cloth-warm, C cloth-cool, M metal, k skin,
  n neutral. Constructor (load-time) checks: id is a starter inventory member and equals the index key; 128
  rows × 128 px; positive bounded runs; palette-only tokens; half-alpha only `n1h` (R3 region check lives in the
  invariant test); rows decoded ONCE into a cached `Uint8Array` (no re-parsing per render). Modules are
  generated text, never hand-edited; RGB literals cannot appear (type + test).
- `tools/assets/import-authored-art.ts` (`npm run art:import -- --package <dir> [--check]`): validates the
  package manifest (schemaVersion 1, unique request ids and `replaces` targets, exact selected-set coverage =
  the 58, every listed svg/png present with matching sha256), parses only `<rect>` elements with bounded integer
  x/y/width/height inside 128×128, hex fill, optional `fill-opacity` of exactly 0.501960784314 → 128; any other
  element, attribute form, colour outside `paletteRgb`, opacity value or overlap ambiguity is a hard error
  (overlaps resolved in document order, later rect wins, and the importer asserts the result equals the
  package's PNG-derived RGBA digest from the oracle file it is given with `--oracle <json>`); canonical
  serialization (stable key order, LF, trailing newline); all validation before any write; `--check` re-derives
  and diffs. The pure parse/serialize core is a separate module tested in CI with committed text fixtures under
  `tests/fixtures/authored-art/` (three small synthetic SVGs + expected modules + malformed-input controls:
  unsupported element, non-integer geometry, out-of-bounds, unknown colour, bad opacity, overlapping rects).
  The full-package `--check` is a supervisor command (§5), not a CI test, and the CI test never skips.
- `ArtRecipe` gains the authored variant of R2; `paintRecipe` narrows on `kind === 'authored'` BEFORE the
  material-response lookup and blits the cached buffer; no material response is invented for authored art.

### S2 — Inputs, manifest, digests (F9)
- `starter-art-inputs.ts`: the 58 ids switch to `{ kind: 'authored', family, art }`; 34 stay procedural.
  `STARTER_ART_INPUT_SET_ID` → `starter-art-inputs-v5`; `STARTER_ART_GENERATOR_VERSION` → `5.0.0`.
- Fixed-inputs digest becomes canonical and versioned: sha256 over, for each path in this exact order —
  `src/assets/starter-art-inputs.ts`, `src/assets/authored/index.ts`, then every authored module in index
  order — the bytes `<relative path>\n<byte length>\n<file bytes>`. `emit-starter-art-hashes.ts` documents it;
  `palette.ts`, `bitmap.ts`, `pixel-art.ts` are generator dependencies (covered by the output pins), not fixed
  inputs. `starter-art.test.ts` replaces the single-file assertion with an independent recomputation of the
  aggregate plus mutation controls (edit one module byte, omit one module, remap one id → digest changes).
- Manifest `source` is a discriminated union: `procedural` rows unchanged; `authored` rows carry `requestId`,
  `packageId`, `svgSha256`, `pngSha256`, `reference: { kind: 'image-model-reference-reauthored', tool: 'Google
  Gemini (browser, "Pro" selector)', conversation: <url>, sourceSha256: [...] }`. Common validation (input id
  membership, CC0 license, attribution) applies to both variants.
- Regeneration only through `emit-starter-art-hashes.ts --write` and `generate-starter-art.ts --generate`;
  the preview metadata string is changed in the generator to name both classes and CC0 (F11).

### S3 — Tests (no deletions; every changed assertion listed with its stronger replacement) (F4–F7)
- `tests/unit/assets/expected-authored-rgba.ts`: the 58 RGBA digests, copied verbatim from the supervisor's
  oracle (header states the Pillow provenance and the package sha256s). `authored-art.test.ts` asserts
  `sha256(paintRecipe(input.recipe).data)` equals the oracle for all 58 — this licenses the 58 PNG pins — and that
  the 34 preserved ids render to their existing pins byte-for-byte.
- `expected-authored-inventory.ts`: id → requestId → digest → equality group (8 groups); test asserts the
  groups are exactly pixel-equal and every other pair differs; the named/generic selection is tested through the
  board model: encounter package art maps resolve goblin-warrior, hobgoblin, bandit-captain, ogre, priest,
  acolyte, skeleton, zombie, wolf to their own ids and the resolved image digest matches the inventory; generic
  PC → `art.token.party.fighter.v1`, untyped monster → `art.token.foe.brute.v1` (existing policy, asserted, not
  changed). A board-model scene fixture places one of each distinct portrait and asserts the resolved per-cell
  digests (this scene is also captured in §5).
- Production-id invariants (`classic-art-techniques.test.ts`, `pixel-art.test.ts` gain loops over
  `STARTER_ART_INPUTS` that branch on `recipe.kind`): seams (wall/corner/door continuity on production ids),
  four opaque distinct floors sharing all boundary pixels, plate/badge/HP (R4), shadow (R3), speckle, terrain
  overlay visibility on the new floors (existing half/three-quarters/wall composite distances ≥ 8 and the
  difficult-terrain luminance/ΔE floors re-run on production floors), archetype silhouettes on production ids,
  colour budget/alpha/palette, native detail, the no-2× control. Each new assertion has a negative control
  (a deliberately broken authored bitmap fails it).
- Orientation (F6): north wall's floor-facing strip is on the south edge and the other three straight pieces
  have theirs on their own floor-facing edge; corners carry exactly two strips; door assets per side and state:
  closed leaf spans ≥ 76 px across the aperture at the wall-facing side, open leaf parked perpendicular with a
  clear aperture ≥ 58 px, and swapping open/closed ids fails; glyph/legend agreement: the render model's door
  cell emits the open-door asset together with the open-door glyph and the closed pair together (asserted on
  the reference encounter).
- `palette.test.ts`: pins the exact seven near-twin pairs (R6). Envelope ledger test (§2).
- `starter-art.test.ts`: version/input-set literals; source union; the "no external art-family provenance" case
  becomes: every `source.type ∈ {procedural, authored}`; every authored row's requestId names a tracked
  `art/requests/<id>-*.json` whose `redoOf` equals the row's output path, `license` is CC0-1.0, dimensions
  128×128; `ART-PROVENANCE.md` names the packageId and every requestId; no `game-icons`; creator set unchanged.
- `expected-art-hashes.ts`: 58 output pins + preview + fixedInputs updated, dated header naming the licensing
  invariant; the 34 preserved pins are asserted unchanged by id.
- Contact sheets: `generate-classic-contact-sheets.ts` resolves shipped inputs (production ids) and takes
  `--out <dir>` (default unchanged); supervisor runs it into `.tmp`.
- `source-is-greppable.test.ts` unchanged (92 PNGs; text modules).

### S4 — Provenance (F11; lane may edit repo-root files, not docs/**, .claude/**, art/**)
- `ART-PROVENANCE.md`: the opening statement is scoped to procedural assets; a new section for the authored
  set: packageId, batch `redo-starter-art-v1`, the 58 request ids, the terrain prompt verbatim from
  `prompt-log.md`, the bust source note (earlier magenta sheet, exact prompt not reconstructed — listed as an
  unresolved README promotion criterion), fiend/ooze/construct drawn locally, source file sha256s, tool identity
  (Gemini, browser, "Pro" selector, conversation URL) separate from the CC0 contributor attribution, and the
  statement that the image service's terms are unreviewed. `LICENSE-ART` unchanged.

## 4. Findings for a v2 re-delivery (recorded; the ledger is the machine-readable form)
F-A pillar/props lack a measurable top-left light bias; F-B token colour count 31–49 (target ≤ 20); F-C seven
palette near-twin pairs used across 37 assets; F-D cleric/undead and cleric/beast silhouettes below 0.012;
F-E skeleton/zombie, priest/acolyte, hobgoblin/bandit near-identical variants (no regression vs procedural);
F-F hazard misclassified as a prop; F-G floors/walls/doors below the 0.04 native-detail floor by design;
F-H terrain-low-wall root compatibility copy differs from the package copy (earlier delivery).

## 5. Supervisor verification and the probe protocol (F7)
- Lane gates: `npm run typecheck:fast`; `sg scan`; `git diff --check`; importer core spec; `art:import --check
  --package <dir> --oracle .tmp/runs/quietstone/candidate-rgba-oracle.json` clean; `emit-starter-art-hashes
  --print` diff = exactly 58 changed digests + fixedInputs; `generate-starter-art --check` verified 92 + preview;
  vitest: authored-art, envelope ledger, starter-art, classic-art-techniques, pixel-art, palette,
  encounter-board-art, board-glyphs, light-encoding, source-is-greppable, token-archetypes, board-chrome; `git
  diff --stat public/assets/art` = exactly 58 PNGs; measured: total authored module bytes, bundle delta, module
  init time. Report every changed `expect(` with its replacement. End `QUIETSTONE INTEGRATE DONE` / `BLOCKED:`.
- Supervisor: fresh `npm run build`; `art/requests/capture-screenshots.mjs --dist dist --port 4590 --mode
  plain`; the distinct-portrait scene and the preview SVG rasterised; contact sheets into `.tmp`; the review
  matrix at 128/64/32 nearest+area, grayscale, and crowded overlays (light/fog/cover marks over the new floors)
  from the contact-sheet tool; full gate `gate-wt4.sh wt-quietstone` (4330) in a quiet window.
- Probe (executable, comparable): baseline = `tools/ai-dm-screenshot-probe.ts` run in a throwaway detached
  worktree at the branch's merge-base 85168bc5 (same application revision, old art); candidate = the same
  command on the branch head. Identical args: `--models gpt-5.6-luna:low,gpt-5.6-sol:high --states 24 --seed
  20260910 --primer general --board-glyphs <default> --capture-tile-px 128 --board-input png --generation
  quietstone-eval`, images-root and out under `.tmp/runs/quietstone/probe-{baseline,candidate}-images` and
  `.jsonl`; snapshot port 4591; `--simulate` forbidden; candidate compared with `--compare <baseline.jsonl>
  --comparison-mode ablation`, and the supervisor asserts that only art-related dimensions differ (same
  states/seed/primer/glyph mode/queries/truth identity). Predeclared decision: per class, candidate accuracy ≥
  baseline − 0.05, and every class that met the absolute ≥ 0.9 gate at baseline still meets it; any class
  breaking either rule = regression → hold. The numbers, the ledger and the captures go to the owner.
- Request statuses stay `delivered` (owner-side files) until the owner rules.

## 6. Non-goals / rollback
No renderer, chrome, coordinate, fixture, primer, glyph or legend changes; no Godot/isometric work; no low
wall; no main landing under this plan. Rollback = revert the branch; procedural recipes and pins untouched.
