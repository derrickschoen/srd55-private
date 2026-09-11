Implemented Q-F1 through Q-F9. All requested targeted gates pass; no oracle, preserved-pin, or ledger mismatches occurred.

Key results:

- Oracle importer check: 58/58 verified.
- Generator check: 92 assets plus preview verified.
- Hash emitter: 92 outputs, exactly 58 changed versus HEAD, plus `fixedInputs`.
- Cumulative Vitest: 16 files, 272/272 tests passed.
- Art diff: exactly 58 PNGs; maximum PNG 2,281 bytes.
- Authored graph: 60 files, 441,478 bytes.
- Cold resolver import: 328.659 ms.
- Contact-sheet output: 20 PNGs.
- Frozen contracts hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.
- Updated plan SHA-256: `f7f6712c4d425ca7395fa87710c2d1768b12491cf53fd2226f50967e8a789e0a`.

Implementation highlights:

- Family-specific color ceilings restored: floor 6, wall 7, door/terrain 16, token 20; only the 29 token ledger rows relax them.
- Alpha evaluator now permits only 0/128/255, constrains 128 to neutral-1 shadow ellipses, and requires binary alpha for floor/wall/door.
- Badge, HP, and annulus geometry derives from board-chrome constants.
- Manifest/oracle documents receive strict, complete validation before asset reads or writes; generated metadata uses escaped JSON literals.
- Fixed-input coverage/order/framing is independently derived from the frozen inventory.
- All eight door seam relationships are checked for both states, with a broken-door negative control.
- Probe supports `claude:claude-fable-5-1:high`; Claude routes through `claude --model … -p`, Codex remains on `codex exec -m`. Transport errors produce `blocked`/`score:null` rows and cannot be compared.
- Reusable scene covers all 27 distinct portraits, including all 13 named portraits.
- Review generator emits native, 64 px, and 32 px nearest/area variants, each in color and grayscale, for both scenes.
- Authored decoded pixels remain private; every render returns an independent copy.

Changed `expect(` inventory for this correction round:

- Cache exposure: replaced cache-identity checking with `sha256(first.data) !== expected`, fresh-render digest equality, and `'data' in art === false`.
- Envelope evaluators: production results now assert `authoredAlphaFailures`, `colorEnvelopeFailures`, `nativeDetailEnvelopeFailures`, and `silhouetteEnvelopeFailures` equal `[]`.
- Alpha controls assert outside-ellipse half-alpha, alpha 64, half-alpha floor, missing shared shadow, badge occupancy, and chrome-frame failures are detected.
- Bound controls assert an over-ledger token fails, a seven-color floor yields `above:7>6`, native-detail regression yields `no-detail`/`below-ledger`, and zero silhouette distance yields `below-ledger`.
- Import controls add four escaped-literal assertions and, for invalid UUID/hash/traversing path, both `toThrow()` and `{byteReads:0,writes:0,mkdirs:0}`.
- Fixed inputs replace emitter-helper assertions with ordered inventory equality, independent digest equality, and three negative mutations: byte change, omitted module, and remapped ID.
- Door coverage adds the broken-door-edge inequality; eight missing seam comparisons use the existing strict `expectEdge` assertion.
- Portrait scene replaces nine-portrait coverage with: 27 entries, the exact 13-name prefix, per-cell asset equality, inventory presence, oracle digest equality, and 27 distinct digests.
- Probe adds exact Codex/Claude executable, argument, image, stdin, and parsed-model assertions; blocked classification asserts 14 rows, `score:null`, failed strict gate, blocked summary text, and persisted null scores.

Successful gate commands:

```text
npm run typecheck:fast
sg scan
git diff --check
npm run art:import -- --check --package art/incoming/01a08cc4-06f0-70ab-86cb-7662bba9f8ba-quietstone-classic --oracle .tmp/runs/quietstone/candidate-rgba-oracle.json
npx vite-node --config /tmp/quietstone-vite.config.ts tools/assets/generate-starter-art.ts --check
npx vitest run --configLoader runner tests/unit/assets/*.test.ts tests/unit/source-is-greppable.test.ts tests/unit/vtt/board-chrome.test.ts tests/unit/assets/token-archetypes.test.ts tests/unit/tools/ai-dm-screenshot-probe.test.ts
npx vite-node --config /tmp/quietstone-vite.config.ts tools/assets/generate-classic-contact-sheets.ts --iteration 3 --scene all --out .tmp/runs/quietstone/contact-sheets-r3
```

The bare Vite invocation encountered the known read-only `node_modules/.vite-temp` condition; the `/tmp` config was used without changing behavior. No `npm run build` was run, per supervisor ownership.

Generated matrix files:

```text
iteration-3-contact-sheet-native-color.png
iteration-3-contact-sheet-native-grayscale.png
iteration-3-contact-sheet-64-nearest-color.png
iteration-3-contact-sheet-64-nearest-grayscale.png
iteration-3-contact-sheet-64-area-color.png
iteration-3-contact-sheet-64-area-grayscale.png
iteration-3-contact-sheet-32-nearest-color.png
iteration-3-contact-sheet-32-nearest-grayscale.png
iteration-3-contact-sheet-32-area-color.png
iteration-3-contact-sheet-32-area-grayscale.png
iteration-3-distinct-portraits-native-color.png
iteration-3-distinct-portraits-native-grayscale.png
iteration-3-distinct-portraits-64-nearest-color.png
iteration-3-distinct-portraits-64-nearest-grayscale.png
iteration-3-distinct-portraits-64-area-color.png
iteration-3-distinct-portraits-64-area-grayscale.png
iteration-3-distinct-portraits-32-nearest-color.png
iteration-3-distinct-portraits-32-nearest-grayscale.png
iteration-3-distinct-portraits-32-area-color.png
iteration-3-distinct-portraits-32-area-grayscale.png
```

QUIETSTONE R3 DONE
diff --git a/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md b/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md
index 023669269a6f3156405d9ba900468ef54fc8e520..7326219a7a06528bb62a6b27b53ea2b303d52e43
--- a/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md
+++ b/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md
@@ -208,10 +208,11 @@
   from the contact-sheet tool; full gate `gate-wt4.sh wt-quietstone` (4330) in a quiet window.
 - Probe (executable, comparable): baseline = `tools/ai-dm-screenshot-probe.ts` run in a throwaway detached
   worktree at the branch's merge-base 85168bc5 (same application revision, old art); candidate = the same
-  command on the branch head. Identical args: `--models gpt-5.6-luna:low,gpt-5.6-sol:high --states 24 --seed
+  command on the branch head. Identical args: `--models gpt-5.6-luna:low,gpt-5.6-sol:high,claude:claude-fable-5-1:high --states 24 --seed
   20260910 --primer general --board-glyphs <default> --capture-tile-px 128 --board-input png --generation
-  quietstone-eval`, images-root and out under `.tmp/runs/quietstone/probe-{baseline,candidate}-images` and
-  `.jsonl`; snapshot port 4591; `--simulate` forbidden; candidate compared with `--compare <baseline.jsonl>
+  quietstone-eval`, images-root under `dnd-slim-runs/quietstone-probe-{baseline,candidate}-images/` and output
+  JSONL under `.tmp/runs/quietstone/probe-{baseline,candidate}.jsonl`; snapshot port 4591; `--simulate`
+  forbidden; candidate compared with `--compare <baseline.jsonl>
   --comparison-mode ablation`, and the supervisor asserts that only art-related dimensions differ (same
   states/seed/primer/glyph mode/queries/truth identity). Predeclared decision: per class, candidate accuracy ≥
   baseline − 0.05, and every class that met the absolute ≥ 0.9 gate at baseline still meets it; any class
@@ -232,7 +233,8 @@
    never rounded floats; rounding is for reports only):
    - `colors`: UPPER bound per id; measured today with the existing `distinctColors`: 29 tokens exceed 20
      (min 21 … max 49; zombie 28; fiend/ooze/construct 10–14 are NOT in the ledger). Row = { id, colors: n };
-     assertion `distinctColors(bitmap) <= n`; ids absent from the ledger must satisfy `<= 20`.
+     assertion `distinctColors(bitmap) <= n`; authored ids absent from the ledger retain their family budget:
+     floor 6, wall 7, door/terrain 16, token 20. Only the 29 enumerated token rows are exceptions.
    - `nativeDetail`: LOWER bound as the rational { changed, opaque } exactly as the existing
      `nativeDetailFraction` computes it (changed pixels vs opaque count). Today: floors changed 96/336/36/362
      of 16384; walls 402/502/471/500/499/502/502/502 of 16384; doors closed 143/141/145/145, open 133/131/135/135
@@ -254,6 +256,22 @@
    The ledger file records each row's measurement provenance (delivered PNG, oracle digest) and the D610 basis.
 A3 (F7) Probe protocol made literal: `--board-glyphs none` (the repository default); snapshot server on
    `BOARD_SNAPSHOT_PREVIEW_PORT=4591`; the baseline run happens in a throwaway detached worktree at 85168bc5 and
+   receives a byte-identical copy of the candidate revision's provider-aware
+   `tools/ai-dm-screenshot-probe.ts` before either run (the copied harness sha256 is recorded, while all app and
+   art sources remain at 85168bc5), so both revisions use the same three-seat harness;
+   both revisions use `--images-root dnd-slim-runs/quietstone-probe-{baseline,candidate}-images`; Codex seats
+   use `model:effort` and the Fable seat uses `claude:claude-fable-5-1:high`, routed through
+   `claude --model claude-fable-5-1 -p`; a transport failure produces a blocked row with no score and blocks
+   comparison rather than contributing a zero;
+   the baseline command (from the detached worktree) is
+   `BOARD_SNAPSHOT_PREVIEW_PORT=4591 npx vite-node tools/ai-dm-screenshot-probe.ts --models
+   gpt-5.6-luna:low,gpt-5.6-sol:high,claude:claude-fable-5-1:high --states 24 --seed 20260910 --primer
+   general --board-glyphs none --capture-tile-px 128 --board-input png --generation quietstone-eval
+   --images-root dnd-slim-runs/quietstone-probe-baseline-images --out
+   .tmp/runs/quietstone/probe-baseline.jsonl`; after copying and hashing that JSONL, the candidate command is
+   identical except `--images-root dnd-slim-runs/quietstone-probe-candidate-images --out
+   .tmp/runs/quietstone/probe-candidate.jsonl --compare .tmp/runs/quietstone/probe-baseline.jsonl
+   --comparison-mode ablation`;
    its JSONL is COPIED into this worktree under `.tmp/runs/quietstone/probe-baseline.jsonl` with its sha256
    recorded before `--compare` (the probe rejects paths outside its repository); the predeclared decision is
    applied separately to EACH model/effort × question class: candidate ≥ baseline − 0.05, with the strict
diff --git a//tmp/quietstone-import-timing.ts b//tmp/quietstone-import-timing.ts
index 8d1168995110edde4cf71e936e36bcdcdc22c5b2..66af175f09318d47884a525e4547a979489003dc
--- a//tmp/quietstone-import-timing.ts
+++ b//tmp/quietstone-import-timing.ts
@@ -1,3 +1,3 @@
 const started = performance.now();
 await import('/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/starter-art-resolver.ts');
-process.stdout.write(`starter-art-resolver cold import: ${(performance.now() - started).toFixed(3)} ms\n`);
+process.stdout.write(`resolver_import_ms ${(performance.now() - started).toFixed(3)}\n`);
diff --git a//tmp/quietstone-vite.config.ts b//tmp/quietstone-vite.config.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8bee073699a7e05f0dbb663a830e0360d92df658
--- /dev/null
+++ b//tmp/quietstone-vite.config.ts
@@ -0,0 +1,4 @@
+export default {
+  root: '/home/vagrant/PhpstormProjects/dnd-wt-quietstone',
+  cacheDir: '/tmp/quietstone-vite-cache',
+};
diff --git a/src/assets/authored/art.ts b/src/assets/authored/art.ts
index 95a823a03f7cf93296d071aea7c48ad1862f73af..f1dead30a3ad349e4196d68bb62ec0cfb1efb64b
--- a/src/assets/authored/art.ts
+++ b/src/assets/authored/art.ts
@@ -15,7 +15,6 @@
   readonly svgSha256: string;
   readonly pngSha256: string;
   readonly rows: readonly string[];
-  readonly data: Uint8Array;
 }
 
 export interface AuthoredPixelArtSource {
@@ -39,6 +38,8 @@
   n: 'neutral',
 } as const);
 
+const DECODED_BY_ART = new WeakMap<AuthoredPixelArt, Uint8Array>();
+
 function decodeColor(code: string, step: number): PaletteColorRef {
   const ramp = RAMP_BY_CODE[code as keyof typeof RAMP_BY_CODE];
   if (ramp === undefined) throw new Error(`Unknown authored-art ramp code ${code}.`);
@@ -94,17 +95,20 @@
 }
 
 export function authoredArt(source: AuthoredPixelArtSource): AuthoredPixelArt {
-  const art: AuthoredPixelArt = {
+  const data = decodeRows(source.rows);
+  const art: AuthoredPixelArt = Object.freeze({
     ...source,
     id: assetId(source.id),
     rows: Object.freeze([...source.rows]),
-    data: decodeRows(source.rows),
-  };
-  return Object.freeze(art);
+  });
+  DECODED_BY_ART.set(art, data);
+  return art;
 }
 
 export function paintAuthoredArt(art: AuthoredPixelArt): Bitmap {
+  const data = DECODED_BY_ART.get(art);
+  if (data === undefined) throw new Error(`Authored art ${art.id} has no decoded cache.`);
   const bitmap = new Bitmap(128, 128);
-  bitmap.data.set(art.data);
+  bitmap.data.set(data);
   return bitmap;
 }
diff --git a/tests/fixtures/authored-art/alpha.expected.ts b/tests/fixtures/authored-art/alpha.expected.ts
index f6ba8c904769dc84a2746ed487883cac205edf8a..53f85e4a6dff0189229d0b9a4e50aa9145876358
--- a/tests/fixtures/authored-art/alpha.expected.ts
+++ b/tests/fixtures/authored-art/alpha.expected.ts
@@ -1,5 +1,5 @@
 /* Generated by tools/assets/import-authored-art.ts. Do not edit. */
-import { authoredArt } from "./art";
+import { authoredArt } from './art';
 
 export const art = authoredArt({
   id: "art.fixture.alpha.v1",
diff --git a/tests/fixtures/authored-art/basic.expected.ts b/tests/fixtures/authored-art/basic.expected.ts
index 94c0a070db784ced174f839fd6c79f7f86999482..b15772ee459f8954f65371be23b9e3b39941708b
--- a/tests/fixtures/authored-art/basic.expected.ts
+++ b/tests/fixtures/authored-art/basic.expected.ts
@@ -1,5 +1,5 @@
 /* Generated by tools/assets/import-authored-art.ts. Do not edit. */
-import { authoredArt } from "./art";
+import { authoredArt } from './art';
 
 export const art = authoredArt({
   id: "art.fixture.basic.v1",
diff --git a/tests/fixtures/authored-art/empty.expected.ts b/tests/fixtures/authored-art/empty.expected.ts
index cf39558c7dcc76bd089ffbc90e7eb10a2c84c17c..e4f8bdd8475c602f3ed8305be2fb24fb3c7378cf
--- a/tests/fixtures/authored-art/empty.expected.ts
+++ b/tests/fixtures/authored-art/empty.expected.ts
@@ -1,5 +1,5 @@
 /* Generated by tools/assets/import-authored-art.ts. Do not edit. */
-import { authoredArt } from "./art";
+import { authoredArt } from './art';
 
 export const art = authoredArt({
   id: "art.fixture.empty.v1",
diff --git a/tests/unit/assets/authored-art-import.test.ts b/tests/unit/assets/authored-art-import.test.ts
index 6bf90d298c05fa82caf687639da61390ed54dd92..4be9d7a917a17c13d249d77a84ddd056bb424f53
--- a/tests/unit/assets/authored-art-import.test.ts
+++ b/tests/unit/assets/authored-art-import.test.ts
@@ -2,6 +2,7 @@
 import { fileURLToPath } from 'node:url';
 import { describe, expect, it } from 'vitest';
 import { parseAuthoredSvg, renderAuthoredModule } from '../../../tools/assets/authored-art-import-core';
+import { importAuthoredPackage, type AuthoredImportIo } from '../../../tools/assets/import-authored-art';
 import { readFileSync } from '../../helpers/test-filesystem';
 
 const fixtureDirectory = fileURLToPath(new URL('../../fixtures/authored-art/', import.meta.url));
@@ -22,6 +23,22 @@
     });
   }
 
+  it('serializes metadata as escaped TypeScript string literals', () => {
+    const source = renderAuthoredModule({
+      id: 'art.fixture."quoted".v1',
+      requestId: 'request\nline',
+      packageId: 'package\\path',
+      svgSha256: 'a'.repeat(64),
+      pngSha256: 'b'.repeat(64),
+      rows: ['.127 "x1'],
+      rgba: new Uint8Array(128 * 128 * 4),
+    });
+    expect(source).toContain('id: "art.fixture.\\"quoted\\".v1"');
+    expect(source).toContain('requestId: "request\\nline"');
+    expect(source).toContain('packageId: "package\\\\path"');
+    expect(source).toContain('    ".127 \\"x1",');
+  });
+
   for (const [name, message] of [
     ['unsupported-element', /unsupported element/u],
     ['non-integer', /non-negative integer/u],
@@ -35,3 +52,74 @@
     });
   }
 });
+
+const EMPTY_MANIFEST = Object.freeze({
+  schemaVersion: 1,
+  packageId: '01a08cc4-06f0-70ab-86cb-7662bba9f8ba',
+  name: 'fixture',
+  status: 'delivered',
+  selectedOption: 'Quietstone',
+  source: 'sources/source.jpg',
+  assets: [],
+  preserved: [],
+});
+
+function invalidPackageAttempt(manifest: unknown, oracle: unknown): {
+  readonly run: () => number;
+  readonly effects: () => { readonly byteReads: number; readonly writes: number; readonly mkdirs: number };
+} {
+  let byteReads = 0;
+  let writes = 0;
+  let mkdirs = 0;
+  const io: AuthoredImportIo = {
+    readText: (path) => path.endsWith('manifest.json') ? JSON.stringify(manifest) : JSON.stringify(oracle),
+    readBytes: () => { byteReads += 1; return new Uint8Array(); },
+    writeText: () => { writes += 1; },
+    mkdir: () => { mkdirs += 1; },
+  };
+  return {
+    run: () => importAuthoredPackage('/package', '/oracle.json', false, '/repository', io),
+    effects: () => ({ byteReads, writes, mkdirs }),
+  };
+}
+
+describe('authored-art package validation', () => {
+  it('rejects an invalid package UUID before reading assets or writing modules', () => {
+    const attempt = invalidPackageAttempt({ ...EMPTY_MANIFEST, packageId: 'not-a-uuid' }, {});
+    expect(attempt.run).toThrow();
+    expect(attempt.effects()).toEqual({ byteReads: 0, writes: 0, mkdirs: 0 });
+  });
+
+  it('rejects an invalid oracle hash before reading assets or writing modules', () => {
+    const attempt = invalidPackageAttempt(EMPTY_MANIFEST, {
+      unexpected: {
+        requestId: '01a08cc4-06f0-70ab-86cb-7662bba9f8ba',
+        rgbaSha256: 'not-a-hash',
+        pngSha256: 'a'.repeat(64),
+        svgSha256: 'b'.repeat(64),
+      },
+    });
+    expect(attempt.run).toThrow();
+    expect(attempt.effects()).toEqual({ byteReads: 0, writes: 0, mkdirs: 0 });
+  });
+
+  it('rejects a traversing asset path before reading assets or writing modules', () => {
+    const asset = {
+      requestId: '01890f1e-7b2c-7abc-8def-0123456789ab',
+      requestFile: 'requests/request.json',
+      replaces: 'public/assets/art/map-floor-stone-v1.png',
+      changed: true,
+      svg: '../outside.svg',
+      png: 'assets/floor.png',
+      width: 128,
+      height: 128,
+      svgSha256: 'a'.repeat(64),
+      pngSha256: 'b'.repeat(64),
+      source: 'fixture',
+      status: 'delivered',
+    };
+    const attempt = invalidPackageAttempt({ ...EMPTY_MANIFEST, assets: [asset] }, {});
+    expect(attempt.run).toThrow();
+    expect(attempt.effects()).toEqual({ byteReads: 0, writes: 0, mkdirs: 0 });
+  });
+});
diff --git a/tests/unit/assets/authored-art.test.ts b/tests/unit/assets/authored-art.test.ts
index d616a62d09284385b27100c9273d4d750e3e425c..ec69c7ce9096f2e9533742d49a659524ec3cfa46
--- a/tests/unit/assets/authored-art.test.ts
+++ b/tests/unit/assets/authored-art.test.ts
@@ -26,10 +26,20 @@
     for (const input of STARTER_ART_INPUTS) {
       if (input.recipe.kind !== 'authored') continue;
       expect(sha256(paintRecipe(input.recipe).data), input.id).toBe(EXPECTED_AUTHORED_RGBA_SHA256[input.id]);
-      expect(input.recipe.art.data, `${input.id} decoded cache`).toBe(input.recipe.art.data);
     }
   });
 
+  it('keeps decoded caches private from mutable rendered copies', () => {
+    const input = STARTER_ART_INPUTS.find((entry) => entry.recipe.kind === 'authored');
+    if (input?.recipe.kind !== 'authored') throw new Error('Missing authored cache control.');
+    const expected = EXPECTED_AUTHORED_RGBA_SHA256[input.id];
+    const first = paintRecipe(input.recipe);
+    first.data.fill(0);
+    expect(sha256(first.data)).not.toBe(expected);
+    expect(sha256(paintRecipe(input.recipe).data)).toBe(expected);
+    expect('data' in input.recipe.art).toBe(false);
+  });
+
   it('keeps all 34 procedural output pins byte-identical to the pre-import revision', () => {
     expect(Object.keys(EXPECTED_PRESERVED_ART_SHA256)).toHaveLength(34);
     for (const [id, digest] of Object.entries(EXPECTED_PRESERVED_ART_SHA256)) {
diff --git a/tests/unit/assets/authored-envelope-ledger.test.ts b/tests/unit/assets/authored-envelope-ledger.test.ts
index 5feaf4a1f0a85bfecb5135011de3fd5be9df17e9..55aebf3985b641548662432e525084ed7e0b8e0a
--- a/tests/unit/assets/authored-envelope-ledger.test.ts
+++ b/tests/unit/assets/authored-envelope-ledger.test.ts
@@ -1,9 +1,19 @@
 import { describe, expect, it } from 'vitest';
 import { Bitmap, type Rgba } from '../../../src/assets/bitmap';
 import { assetId } from '../../../src/assets/ids';
-import { TOKEN_ARCHETYPES, paintRecipe, type TokenArchetype } from '../../../src/assets/pixel-art';
+import { TOKEN_ARCHETYPES, paintRecipe, type ProceduralArtRecipe, type TokenArchetype } from '../../../src/assets/pixel-art';
 import { paletteRgb, type PaletteColorRef } from '../../../src/assets/palette';
-import { STARTER_ART_INPUTS, STARTER_ART_INPUTS_BY_ID, archetypeTokenAssetId } from '../../../src/assets/starter-art-inputs';
+import { STARTER_ART_INPUTS, STARTER_ART_INPUTS_BY_ID, archetypeTokenAssetId, type StarterArtInput } from '../../../src/assets/starter-art-inputs';
+import {
+  CREATURE_BADGE_HEIGHT_PX,
+  CREATURE_BADGE_LEFT_PX,
+  CREATURE_BADGE_TOP_PX,
+  CREATURE_BADGE_WIDTH_PX,
+  HP_BAR_BORDER_PX,
+  HP_BAR_HEIGHT_PX,
+  HP_BAR_WIDTH_PX,
+  hpBarTopPx,
+} from '../../../src/vtt/board-chrome';
 import {
   AUTHORED_COLOR_ENVELOPE, AUTHORED_LIGHT_DIRECTION_ENVELOPE,
   AUTHORED_NATIVE_DETAIL_ENVELOPE, AUTHORED_PALETTE_TWIN_ENVELOPE,
@@ -93,31 +103,60 @@
   return { highlightPixels, shadowPixels, highlight: highlightPixels === 0 ? null : highlightSum / highlightPixels, shadow: shadowPixels === 0 ? null : shadowSum / shadowPixels };
 }
 
-function authoredHardInvariantFailures(bitmap: Bitmap, family: 'token' | 'terrain'): readonly string[] {
+function authoredAlphaFailures(bitmap: Bitmap, family: ProceduralArtRecipe['kind']): readonly string[] {
   const failures: string[] = [];
   let sharedShadow = 0;
   for (let y = 0; y < bitmap.height; y += 1) for (let x = 0; x < bitmap.width; x += 1) {
     const pixel = bitmap.get(x, y);
-    if (rgbaKey(pixel) === colorKey({ ramp: 'neutral', step: 1 }) || rgbaKey(pixel) === colorKey({ ramp: 'neutral', step: 1 }, 128)) sharedShadow += 1;
+    if (rgbaKey(pixel) === colorKey({ ramp: 'neutral', step: 1 }, 128)) sharedShadow += 1;
+    if (pixel.alpha !== 0 && pixel.alpha !== 128 && pixel.alpha !== 255) {
+      failures.push(`alpha:${String(x)},${String(y)}:${String(pixel.alpha)}`);
+      continue;
+    }
     if (pixel.alpha !== 128) continue;
+    if (family !== 'token' && family !== 'terrain') {
+      failures.push(`half-family:${String(x)},${String(y)}`);
+      continue;
+    }
     const region = family === 'token' ? { cx: 69, cy: 96, rx: 51, ry: 29 } : { cx: 69, cy: 72, rx: 44, ry: 42 };
     const inside = ((x + 0.5 - region.cx) / (region.rx + 0.5)) ** 2 + ((y + 0.5 - region.cy) / (region.ry + 0.5)) ** 2 <= 1;
     if (rgbaKey(pixel) !== colorKey({ ramp: 'neutral', step: 1 }, 128) || !inside) failures.push(`half:${String(x)},${String(y)}`);
   }
-  if (sharedShadow <= 12) failures.push('shared-shadow');
+  if ((family === 'token' || family === 'terrain') && sharedShadow <= 12) failures.push('shared-shadow');
   return failures;
 }
 
+const BADGE_RECT = Object.freeze({
+  x: CREATURE_BADGE_LEFT_PX,
+  y: CREATURE_BADGE_TOP_PX,
+  width: CREATURE_BADGE_WIDTH_PX,
+  height: CREATURE_BADGE_HEIGHT_PX,
+});
+const HP_RECT = Object.freeze({
+  x: Math.round((128 - HP_BAR_WIDTH_PX) / 2) - HP_BAR_BORDER_PX,
+  y: hpBarTopPx(),
+  width: HP_BAR_WIDTH_PX + 2 * HP_BAR_BORDER_PX,
+  height: HP_BAR_HEIGHT_PX + 2 * HP_BAR_BORDER_PX,
+});
+
+function insideRect(x: number, y: number, rectangle: typeof BADGE_RECT): boolean {
+  return x >= rectangle.x && x < rectangle.x + rectangle.width && y >= rectangle.y && y < rectangle.y + rectangle.height;
+}
+
 function tokenFrameFailures(bitmap: Bitmap, side: 'party' | 'foe'): readonly string[] {
   const failures: string[] = [];
   for (let coordinate = 0; coordinate < 128; coordinate += 1) {
     if ([bitmap.get(coordinate, 0), bitmap.get(coordinate, 127), bitmap.get(0, coordinate), bitmap.get(127, coordinate)].some((pixel) => pixel.alpha !== 0)) failures.push('margin');
   }
-  for (let y = 4; y < 48; y += 1) for (let x = 34; x < 94; x += 1) if (bitmap.get(x, y).alpha !== 0) failures.push('badge');
-  for (let y = 112; y < 124; y += 1) for (let x = 22; x < 106; x += 1) if (bitmap.get(x, y).alpha !== 0) failures.push('hp');
+  for (let y = BADGE_RECT.y; y < BADGE_RECT.y + BADGE_RECT.height; y += 1)
+    for (let x = BADGE_RECT.x; x < BADGE_RECT.x + BADGE_RECT.width; x += 1)
+      if (bitmap.get(x, y).alpha !== 0) failures.push('badge');
+  for (let y = HP_RECT.y; y < HP_RECT.y + HP_RECT.height; y += 1)
+    for (let x = HP_RECT.x; x < HP_RECT.x + HP_RECT.width; x += 1)
+      if (bitmap.get(x, y).alpha !== 0) failures.push('hp');
   let annulus = 0; let opaque = 0;
   for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
-    if (x >= 22 && x < 106 && y >= 112 && y < 124) continue;
+    if (insideRect(x, y, HP_RECT) || insideRect(x, y, BADGE_RECT)) continue;
     const distance = Math.hypot((x + 0.5 - 64) / 51, (y + 0.5 - 91) / 29);
     if (distance >= 0.92 && distance <= 0.99) { annulus += 1; if (bitmap.get(x, y).alpha === 255) opaque += 1; }
   }
@@ -127,6 +166,57 @@
   return failures;
 }
 
+const FAMILY_COLOR_BUDGET = Object.freeze({ token: 20, floor: 6, wall: 7, door: 16, terrain: 16 });
+const COLOR_ROWS = new Map<string, number>(AUTHORED_COLOR_ENVELOPE.map((row) => [row.id, row.colors]));
+const NATIVE_DETAIL_ROWS = new Map<string, (typeof AUTHORED_NATIVE_DETAIL_ENVELOPE)[number]>(AUTHORED_NATIVE_DETAIL_ENVELOPE.map((row) => [row.id, row]));
+const SILHOUETTE_ROWS = new Map(AUTHORED_SILHOUETTE_ENVELOPE.map((row) => [row.pair.join('/'), row.minimum]));
+
+function authoredFamilyKind(input: StarterArtInput): keyof typeof FAMILY_COLOR_BUDGET {
+  if (input.recipe.kind !== 'authored') throw new Error(`${input.id} is not authored.`);
+  const kind = input.recipe.family.kind;
+  if (kind !== 'token' && kind !== 'floor' && kind !== 'wall' && kind !== 'door' && kind !== 'terrain')
+    throw new Error(`Unsupported authored family ${kind}.`);
+  return kind;
+}
+
+function colorEnvelopeFailures(input: StarterArtInput, bitmap: Bitmap): readonly string[] {
+  const failures: string[] = [];
+  const kind = authoredFamilyKind(input);
+  const actual = distinctColors(bitmap);
+  const row = COLOR_ROWS.get(input.id);
+  if (row !== undefined && kind !== 'token') failures.push('non-token-ledger-row');
+  const bound = row ?? FAMILY_COLOR_BUDGET[kind];
+  if (actual > bound) failures.push(`above:${String(actual)}>${String(bound)}`);
+  if (row !== undefined && actual <= FAMILY_COLOR_BUDGET.token) failures.push('stale');
+  return failures;
+}
+
+function nativeDetailEnvelopeFailures(id: string, bitmap: Bitmap): readonly string[] {
+  const failures: string[] = [];
+  const actual = nativeDetail(bitmap);
+  const row = NATIVE_DETAIL_ROWS.get(id);
+  if (row === undefined) {
+    if (actual.changed / Math.max(1, actual.opaque) < 0.04) failures.push('below-strict');
+    return failures;
+  }
+  if (actual.changed === 0) failures.push('no-detail');
+  if (actual.changed * row.opaque < row.changed * actual.opaque) failures.push('below-ledger');
+  if (actual.changed / Math.max(1, actual.opaque) >= 0.04) failures.push('stale');
+  return failures;
+}
+
+function silhouetteEnvelopeFailures(left: TokenArchetype, right: TokenArchetype, distance: number): readonly string[] {
+  const failures: string[] = [];
+  const minimum = SILHOUETTE_ROWS.get(`${left}/${right}`);
+  if (minimum === undefined) {
+    if (distance <= 0.012) failures.push('below-strict');
+    return failures;
+  }
+  if (distance < minimum) failures.push('below-ledger');
+  if (distance > 0.012) failures.push('stale');
+  return failures;
+}
+
 describe('D610 provisional authored-art envelope ledger', () => {
   const authored = STARTER_ART_INPUTS.filter((input) => input.recipe.kind === 'authored');
 
@@ -140,9 +230,8 @@
     for (const input of authored) {
       if (input.recipe.kind !== 'authored') throw new Error(`${input.id} is not authored.`);
       const family = input.recipe.family;
-      if (family.kind !== 'token' && family.kind !== 'terrain') continue;
       const bitmap = paintRecipe(input.recipe);
-      expect(authoredHardInvariantFailures(bitmap, family.kind), input.id).toEqual([]);
+      expect(authoredAlphaFailures(bitmap, family.kind), input.id).toEqual([]);
       if (family.kind === 'token') expect(tokenFrameFailures(bitmap, family.side), input.id).toEqual([]);
     }
   });
@@ -151,36 +240,54 @@
     const source = productionToken('fighter', 'party');
     const brokenShadow = new Bitmap(128, 128); brokenShadow.data.set(source.data);
     brokenShadow.data.set([42, 44, 48, 128], (1 * 128 + 1) * 4);
-    expect(authoredHardInvariantFailures(brokenShadow, 'token')).toContain('half:1,1');
+    expect(authoredAlphaFailures(brokenShadow, 'token')).toContain('half:1,1');
+    const invalidAlpha = new Bitmap(128, 128); invalidAlpha.data.set(source.data);
+    const opaqueOffset = Array.from({ length: invalidAlpha.data.length / 4 }, (_unused, index) => index)
+      .find((index) => invalidAlpha.data[index * 4 + 3] === 255);
+    if (opaqueOffset === undefined) throw new Error('Token alpha control has no opaque pixel.');
+    invalidAlpha.data[opaqueOffset * 4 + 3] = 64;
+    expect(authoredAlphaFailures(invalidAlpha, 'token').some((failure) => failure.startsWith('alpha:'))).toBe(true);
+    const binaryFamily = new Bitmap(128, 128);
+    binaryFamily.data.set([42, 44, 48, 128], 0);
+    expect(authoredAlphaFailures(binaryFamily, 'floor')).toContain('half-family:0,0');
     const brokenBadge = new Bitmap(128, 128); brokenBadge.data.set(source.data);
-    brokenBadge.data.set([42, 44, 48, 255], (4 * 128 + 34) * 4);
+    brokenBadge.data.set([42, 44, 48, 255], (BADGE_RECT.y * 128 + BADGE_RECT.x) * 4);
     expect(tokenFrameFailures(brokenBadge, 'party')).toContain('badge');
   });
 
   it('exercises negative controls for every provisional classifier and hard token boundary', () => {
     const blank = new Bitmap(128, 128);
-    expect(authoredHardInvariantFailures(blank, 'token')).toContain('shared-shadow');
+    expect(authoredAlphaFailures(blank, 'token')).toContain('shared-shadow');
 
     const source = productionToken('fighter', 'party');
     const brokenFrame = new Bitmap(128, 128); brokenFrame.data.set(source.data);
     putRgba(brokenFrame, 0, 64, { ...paletteRgb({ ramp: 'stone', step: 1 }), alpha: 255 });
-    putRgba(brokenFrame, 22, 112, { ...paletteRgb({ ramp: 'stone', step: 1 }), alpha: 255 });
+    putRgba(brokenFrame, HP_RECT.x, HP_RECT.y, { ...paletteRgb({ ramp: 'stone', step: 1 }), alpha: 255 });
     putRgba(brokenFrame, 50, 110, { ...paletteRgb({ ramp: 'cloth-warm', step: 6 }), alpha: 255 });
     for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
       const distance = Math.hypot((x + 0.5 - 64) / 51, (y + 0.5 - 91) / 29);
-      if (distance >= 0.92 && distance <= 0.99 && !(x >= 22 && x < 106 && y >= 112 && y < 124))
+      if (distance >= 0.92 && distance <= 0.99 && !insideRect(x, y, HP_RECT) && !insideRect(x, y, BADGE_RECT))
         putRgba(brokenFrame, x, y, { red: 0, green: 0, blue: 0, alpha: 0 });
     }
     expect(tokenFrameFailures(brokenFrame, 'party')).toEqual(expect.arrayContaining(['margin', 'hp', 'annulus', 'faction']));
 
-    const overBudget = new Bitmap(128, 128);
-    for (let index = 0; index < 21; index += 1)
-      putRgba(overBudget, index, 0, { red: index, green: 0, blue: 0, alpha: 255 });
-    expect(distinctColors(overBudget)).toBeGreaterThan(20);
+    const fighterInput = STARTER_ART_INPUTS_BY_ID.get(assetId('art.token.party.fighter.v1'));
+    if (fighterInput === undefined) throw new Error('Missing fighter envelope control.');
+    const overBudget = new Bitmap(128, 128); overBudget.data.set(source.data);
+    for (let index = 0; index <= 42; index += 1)
+      putRgba(overBudget, index, 0, { red: index, green: 1, blue: 1, alpha: 255 });
+    expect(colorEnvelopeFailures(fighterInput, overBudget).some((failure) => failure.startsWith('above:'))).toBe(true);
 
+    const floorInput = STARTER_ART_INPUTS_BY_ID.get(assetId('art.map.floor.stone.v1'));
+    if (floorInput === undefined) throw new Error('Missing floor budget control.');
+    const sevenColorFloor = new Bitmap(128, 128);
+    for (let index = 0; index < 7; index += 1)
+      putRgba(sevenColorFloor, index, 0, { red: index, green: 2, blue: 2, alpha: 255 });
+    expect(colorEnvelopeFailures(floorInput, sevenColorFloor)).toContain('above:7>6');
+
     const enlarged = new Bitmap(128, 128);
     enlarged.data.fill(255);
-    expect(nativeDetail(enlarged)).toEqual({ changed: 0, opaque: 16_384 });
+    expect(nativeDetailEnvelopeFailures('art.map.floor.stone.v1', enlarged)).toEqual(expect.arrayContaining(['no-detail', 'below-ledger']));
 
     const twins = new Bitmap(128, 128);
     putRgba(twins, 1, 1, { ...paletteRgb(PALETTE_TWINS['stone1-metal0'][0]), alpha: 255 });
@@ -188,29 +295,19 @@
     expect(offendingTwinPairs(twins)).toContain('stone1-metal0');
 
     const fighter = sharedBustSilhouette(source, productionToken('fighter', 'foe'));
-    expect(descriptorDistance(fighter, fighter)).toBeLessThanOrEqual(0.012);
+    expect(silhouetteEnvelopeFailures('cleric', 'undead', descriptorDistance(fighter, fighter))).toContain('below-ledger');
     expect(lightCensus(blank)).toEqual({ highlightPixels: 0, shadowPixels: 0, highlight: null, shadow: null });
   });
 
   it('applies upper color bounds and makes improved rows stale', () => {
-    const rows = new Map<string, number>(AUTHORED_COLOR_ENVELOPE.map((row) => [row.id, row.colors]));
     for (const input of authored) {
-      const actual = distinctColors(paintRecipe(input.recipe)); const bound = rows.get(input.id);
-      if (bound === undefined) expect(actual, input.id).toBeLessThanOrEqual(20);
-      else { expect(actual, input.id).toBeGreaterThan(20); expect(actual, input.id).toBeLessThanOrEqual(bound); }
+      expect(colorEnvelopeFailures(input, paintRecipe(input.recipe)), input.id).toEqual([]);
     }
   });
 
   it('applies rational native-detail lower bounds and makes improved rows stale', () => {
-    const rows = new Map<string, (typeof AUTHORED_NATIVE_DETAIL_ENVELOPE)[number]>(AUTHORED_NATIVE_DETAIL_ENVELOPE.map((row) => [row.id, row]));
     for (const input of authored) {
-      const actual = nativeDetail(paintRecipe(input.recipe)); const bound = rows.get(input.id);
-      if (bound === undefined) expect(actual.changed / Math.max(1, actual.opaque), input.id).toBeGreaterThanOrEqual(0.04);
-      else {
-        expect(actual.changed, input.id).toBeGreaterThan(0);
-        expect(actual.changed * bound.opaque, input.id).toBeGreaterThanOrEqual(bound.changed * actual.opaque);
-        expect(actual.changed / Math.max(1, actual.opaque), `${input.id} stale row`).toBeLessThan(0.04);
-      }
+      expect(nativeDetailEnvelopeFailures(input.id, paintRecipe(input.recipe)), input.id).toEqual([]);
     }
   });
 
@@ -224,12 +321,10 @@
 
   it('keeps only the two pinned production silhouette pairs below the strict floor', () => {
     const descriptors = new Map(TOKEN_ARCHETYPES.map((archetype) => [archetype, sharedBustSilhouette(productionToken(archetype, 'party'), productionToken(archetype, 'foe'))] as const));
-    const rows = new Map(AUTHORED_SILHOUETTE_ENVELOPE.map((row) => [row.pair.join('/'), row.minimum]));
     for (let left = 0; left < TOKEN_ARCHETYPES.length; left += 1) for (let right = left + 1; right < TOKEN_ARCHETYPES.length; right += 1) {
       const a = TOKEN_ARCHETYPES[left]!; const b = TOKEN_ARCHETYPES[right]!;
-      const actual = descriptorDistance(descriptors.get(a)!, descriptors.get(b)!); const minimum = rows.get(`${a}/${b}`);
-      if (minimum === undefined) expect(actual, `${a}/${b}`).toBeGreaterThan(0.012);
-      else { expect(actual, `${a}/${b}`).toBeGreaterThanOrEqual(minimum); expect(actual, `${a}/${b} stale row`).toBeLessThanOrEqual(0.012); }
+      const actual = descriptorDistance(descriptors.get(a)!, descriptors.get(b)!);
+      expect(silhouetteEnvelopeFailures(a, b, actual), `${a}/${b}`).toEqual([]);
     }
   });
 
diff --git a/tests/unit/assets/encounter-board-art.test.ts b/tests/unit/assets/encounter-board-art.test.ts
index bf12082be6af2e98b702acffdeabce60e4db7ad2..61290af8b7a86f0730eff240431c62fdbbae9c74
--- a/tests/unit/assets/encounter-board-art.test.ts
+++ b/tests/unit/assets/encounter-board-art.test.ts
@@ -12,6 +12,7 @@
 import { assetId } from '../../../src/assets/ids';
 import { EXPECTED_AUTHORED_INVENTORY } from './expected-authored-inventory';
 import { decodeRgbaPng } from '../../helpers/png-decode';
+import { NAMED_PORTRAIT_IDS, distinctPortraitBoardScene } from '../../../tools/assets/distinct-portrait-scene';
 
 const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
 const fighter = combatantId('combatant:fighter');
@@ -45,45 +46,20 @@
 };
 
 describe('encounter package asset-id consumption', () => {
-  it('resolves all nine fixture-named monster portraits through a board scene', () => {
-    const named = [
-      ['goblin-warrior', 'art.token.monster.goblin-warrior.v1'],
-      ['hobgoblin-warrior', 'art.token.monster.hobgoblin-warrior.v1'],
-      ['bandit-captain', 'art.token.monster.bandit-captain.v1'],
-      ['ogre', 'art.token.monster.ogre.v1'],
-      ['priest', 'art.token.monster.priest.v1'],
-      ['priest-acolyte', 'art.token.monster.priest-acolyte.v1'],
-      ['skeleton', 'art.token.monster.skeleton.v1'],
-      ['zombie', 'art.token.monster.zombie.v1'],
-      ['wolf', 'art.token.monster.wolf.v1'],
-    ] as const;
-    const combatants = named.map(([name], index) => ({
-      id: combatantId(`combatant:${name}`), name, kind: 'monster' as const,
-      placementStatus: 'placed' as const, position: { column: 1 + index, row: 2 },
-      effectiveSize: 'Medium' as const, placementMode: { kind: 'normal' as const, actual: 'Medium' as const },
-      footprint: [{ column: 1 + index, row: 2 }] as const,
-    }));
-    const art = decodeEncounterArtPackage({
-      ...REFERENCE_ENCOUNTER_ART,
-      id: 'encounter-art:named-portrait-proof:v1',
-      room: { ...REFERENCE_ENCOUNTER_ART.room, columns: 12, rows: 6, doorCell: { column: 6, row: 5 } },
-      terrain: [],
-      combatantTokens: Object.fromEntries(named.map(([name, id]) => [`combatant:${name}`, id])),
-    });
-    const model = encounterBoardRenderModel({
-      bounds: { columns: 12, rows: 6 },
-      terrainCells: projectEncounterTerrainCells({ columns: 12, rows: 6 }, { blockedCells: [], worldObjects: [] }),
-      combatants, highlightedCombatant: null, adjudicatedTargets: [],
-    }, art);
+  it('resolves every distinct portrait, including all 13 named portraits, through a reusable board scene', () => {
+    const scene = distinctPortraitBoardScene();
+    const model = encounterBoardRenderModel(scene.projection, scene.art);
     const digests = new Set<string>();
-    for (const [name, id] of named) {
-      expect(model.find((cell) => cell.token?.id === `combatant:${name}`)?.token?.assetId).toBe(id);
-      const digest = createHash('sha256').update(decodeRgbaPng(renderStarterArtPng(assetId(id))).data).digest('hex');
-      expect(EXPECTED_AUTHORED_INVENTORY[id]).toBeDefined();
-      expect(digest).toBe(EXPECTED_AUTHORED_INVENTORY[id]!.rgbaSha256);
-      digests.add(EXPECTED_AUTHORED_INVENTORY[id]!.rgbaSha256);
+    expect(scene.entries).toHaveLength(27);
+    expect(scene.entries.slice(0, NAMED_PORTRAIT_IDS.length).map((entry) => entry.id)).toEqual(NAMED_PORTRAIT_IDS);
+    for (const entry of scene.entries) {
+      expect(model.find((cell) => cell.token?.id === entry.combatantId)?.token?.assetId).toBe(entry.id);
+      const digest = createHash('sha256').update(decodeRgbaPng(renderStarterArtPng(entry.id)).data).digest('hex');
+      expect(EXPECTED_AUTHORED_INVENTORY[entry.id]).toBeDefined();
+      expect(digest).toBe(EXPECTED_AUTHORED_INVENTORY[entry.id]!.rgbaSha256);
+      digests.add(EXPECTED_AUTHORED_INVENTORY[entry.id]!.rgbaSha256);
     }
-    expect([...digests]).toHaveLength(9);
+    expect([...digests]).toHaveLength(27);
   });
 
   it('renders player and DM models through stable ids while keeping fog DM-only', () => {
diff --git a/tests/unit/assets/expected-art-hashes.ts b/tests/unit/assets/expected-art-hashes.ts
index 84460c5fce958fc87564283f773c2c78dde2c956..91ad5152226d3a3d36226664bf1c666cbd8a6ad8
--- a/tests/unit/assets/expected-art-hashes.ts
+++ b/tests/unit/assets/expected-art-hashes.ts
@@ -226,7 +226,7 @@
 
 /** Canonical v5 length-framed fixed-input digest; authored output pins are licensed by raw-RGBA oracle checks. */
 export const EXPECTED_FIXED_INPUTS_SHA256 =
-  'fd63baefa90bc2a1951ef7649a5c1596bd5b4e85c00aca7723fb879e01d3e226';
+  'b3264338e27a05624dd8db0c6e61d420661fc3281afcc96b05c45b22db0bd067';
 /** sha256 of src/assets/preview/starter-art-board.svg; the preview embeds all 92 assets at integer scale. */
 export const EXPECTED_PREVIEW_SHA256 =
   '660df187b9f800520ddf048ed0deae0fa1466912617852298343910484825e6d';
diff --git a/tests/unit/assets/pixel-art.test.ts b/tests/unit/assets/pixel-art.test.ts
index 7f99ff505cea8d6ee4fe6acb83aff5234fb43a4a..61a0ea583cd610992edfd8c132c51e7cde62227c
--- a/tests/unit/assets/pixel-art.test.ts
+++ b/tests/unit/assets/pixel-art.test.ts
@@ -105,9 +105,13 @@
     expectEdge('production ne/e', ne.row(last), e.row(last)); expectEdge('production e/se', se.row(0), e.row(0));
     for (const state of DOOR_STATES) {
       expectEdge(`production door-n ${state}`, productionDoor('n', state).column(0), n.column(0));
-      expectEdge(`production door-s ${state}`, productionDoor('s', state).column(last), s.column(last));
+      expectEdge(`production n|door-n ${state}`, productionDoor('n', state).column(last), n.column(last));
+      expectEdge(`production door-s ${state}`, productionDoor('s', state).column(0), s.column(0));
+      expectEdge(`production s|door-s ${state}`, productionDoor('s', state).column(last), s.column(last));
       expectEdge(`production door-w ${state}`, productionDoor('w', state).row(0), w.row(0));
-      expectEdge(`production door-e ${state}`, productionDoor('e', state).row(last), e.row(last));
+      expectEdge(`production w/door-w ${state}`, productionDoor('w', state).row(last), w.row(last));
+      expectEdge(`production door-e ${state}`, productionDoor('e', state).row(0), e.row(0));
+      expectEdge(`production e/door-e ${state}`, productionDoor('e', state).row(last), e.row(last));
     }
   });
 
@@ -127,6 +131,12 @@
     brokenSeam.data.set([0, 0, 0, 0], (127 * 4));
     expect(bytesEqual(brokenSeam.column(127), north.column(127))).toBe(false);
 
+    const northDoor = productionDoor('n', 'closed');
+    const brokenDoorEdge = new Bitmap(TILE_SIZE, TILE_SIZE); brokenDoorEdge.data.set(northDoor.data);
+    const boundaryAlphaIndex = 127 * 4 + 3;
+    brokenDoorEdge.data[boundaryAlphaIndex] = brokenDoorEdge.data[boundaryAlphaIndex] === 0 ? 255 : 0;
+    expect(bytesEqual(brokenDoorEdge.column(127), north.column(127))).toBe(false);
+
     const floor = production('art.map.floor.stone.v1');
     const transparent = new Bitmap(TILE_SIZE, TILE_SIZE); transparent.data.set(floor.data);
     transparent.data[3] = 0;
diff --git a/tests/unit/assets/starter-art.test.ts b/tests/unit/assets/starter-art.test.ts
index 3aec399c2d21797a2ab08711bac16a2c4e3b588b..ac45d617edf8ab6fd25549e3dea43d2b8d5117dc
--- a/tests/unit/assets/starter-art.test.ts
+++ b/tests/unit/assets/starter-art.test.ts
@@ -23,18 +23,19 @@
   starterArtDataUri,
 } from '../../../src/assets/starter-art-resolver';
 import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
+import { AUTHORED_ART_IDS } from '../../../src/assets/authored';
 import { renderLegalPage } from '../../../src/ui/screens/legal/legal';
 import {
   BUNDLED_LICENSE_FILES,
   bundledLicenseAssets,
 } from '../../../tools/licenses/bundled-license-files';
 import { STARTER_ART_PREVIEW_PATH, generateStarterArt, useAsset } from '../../../tools/assets/generate-starter-art';
-import { fixedInputPaths, frameFixedInputs } from '../../../tools/assets/emit-starter-art-hashes';
 import {
   EXPECTED_FIXED_INPUTS_SHA256,
   EXPECTED_PREVIEW_SHA256,
   EXPECTED_STARTER_ART_SHA256,
 } from './expected-art-hashes';
+import { EXPECTED_AUTHORED_INVENTORY } from './expected-authored-inventory';
 
 const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
 
@@ -50,6 +51,29 @@
   return createHash('sha256').update(value).digest('hex');
 }
 
+interface IndependentFixedInput { readonly path: string; readonly bytes: Uint8Array }
+
+function independentAuthoredIds(): readonly string[] {
+  return Object.entries(EXPECTED_AUTHORED_INVENTORY)
+    .sort(([, left], [, right]) => left.requestId.localeCompare(right.requestId))
+    .map(([id]) => id);
+}
+
+function independentFixedInputPaths(): readonly string[] {
+  return [
+    'src/assets/starter-art-inputs.ts',
+    'src/assets/authored/index.ts',
+    ...independentAuthoredIds().map((id) => `src/assets/authored/${id.replace(/^art\./u, '').replaceAll('.', '-')}.ts`),
+  ];
+}
+
+function independentlyFrameFixedInputs(sources: readonly IndependentFixedInput[]): Uint8Array {
+  return Buffer.concat(sources.flatMap(({ path, bytes: sourceBytes }) => [
+    Buffer.from(`${path}\n${String(sourceBytes.byteLength)}\n`, 'utf8'),
+    Buffer.from(sourceBytes),
+  ]));
+}
+
 /** 36 tokens + 43 D516 room/state assets + 8 D525 glyphs + 5 D576 terrain treatment/glyph assets. */
 const EXPECTED_ASSET_COUNT = 92;
 const EXPECTED_TOKEN_COUNT = 36;
@@ -147,15 +171,16 @@
       expect(entry.output.sha256, entry.id).toBe(expected);
       expect(pngDimensions(rendered), entry.id).toEqual({ width: TILE_SIZE, height: TILE_SIZE });
     }
-    const sources = fixedInputPaths().map((path) => ({ path, bytes: bytes(path) }));
-    expect(sha256(frameFixedInputs(sources))).toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    expect(AUTHORED_ART_IDS).toEqual(independentAuthoredIds());
+    const sources = independentFixedInputPaths().map((path) => ({ path, bytes: bytes(path) }));
+    expect(sha256(independentlyFrameFixedInputs(sources))).toBe(EXPECTED_FIXED_INPUTS_SHA256);
     const mutated = sources.map((source, index) => index === 2 ? { ...source, bytes: Buffer.concat([source.bytes, Buffer.from('x')]) } : source);
-    expect(sha256(frameFixedInputs(mutated))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
-    expect(sha256(frameFixedInputs(sources.slice(0, -1)))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    expect(sha256(independentlyFrameFixedInputs(mutated))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    expect(sha256(independentlyFrameFixedInputs(sources.slice(0, -1)))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
     const remapped = sources.map((source) => source.path === 'src/assets/authored/index.ts'
-      ? { ...source, bytes: Buffer.from(source.bytes.toString('utf8').replace("'art.token.pc.fighter.v1'", "'art.token.pc.fighter.v2'"), 'utf8') }
+      ? { ...source, bytes: Buffer.from(source.bytes.toString('utf8').replace('"art.token.pc.fighter.v1"', '"art.token.pc.fighter.v2"'), 'utf8') }
       : source);
-    expect(sha256(frameFixedInputs(remapped))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    expect(sha256(independentlyFrameFixedInputs(remapped))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
   });
 
   it('renders byte-identically from equal fixed inputs', () => {
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index 6a38edd06d1afec5829513ac5b8f60c80a92d5fe..a2de05ee552902612d88323ac4a9b055d62cfa28
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -40,6 +40,7 @@
   parseProbeAnswer,
   parseScreenshotProbeArgs,
   parseScreenshotProbeRescoreArgs,
+  providerAwareScreenshotAnswerer,
   probeAnswerJsonSchema,
   probeCatalogueClassCoverage,
   probeCatalogueLineCoverage,
@@ -55,6 +56,7 @@
   truthAnswer,
   type ProbeSnapshotService,
   type ProbeAnswerRequest,
+  type ProbeCommandInvocation,
   type ProbeLineTracer,
   type ScreenshotFactSheet,
 } from '../../../tools/ai-dm-screenshot-probe';
@@ -440,6 +442,7 @@
     expect(score.hallucinations).toBe(sheet.combatants.length);
     expect(score.confusions).toEqual(['row off by one', 'row off by one']);
     const simulated = await simulatedProbeAnswerer('shifted_row').answer({
+      provider: 'codex',
       model: 'SIMULATED',
       effort: 'low',
       question: 'Q1',
@@ -941,6 +944,52 @@
 });
 
 describe('D519 screenshot comprehension schema and CLI', () => {
+  it('routes Codex and Claude model specifications through their provider CLIs', async () => {
+    const invocations: ProbeCommandInvocation[] = [];
+    const routingSheet = deriveScreenshotFactSheet(everyClassState());
+    const answerer = providerAwareScreenshotAnswerer((invocation) => {
+      invocations.push(invocation);
+      const rawAnswer = JSON.stringify(truthAnswer(routingSheet, 'Q1'));
+      return Promise.resolve({
+        stdout: invocation.executable === 'codex'
+          ? `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: rawAnswer } })}\n`
+          : rawAnswer,
+        stderr: '',
+        code: 0,
+        signal: null,
+        error: null,
+      });
+    });
+    const baseRequest = {
+      effort: 'high',
+      question: 'Q1',
+      prompt: 'answer this fixture',
+      schemaPath: '/tmp/q1.schema.json',
+      imagePath: '/tmp/board.png',
+      truth: truthAnswer(routingSheet, 'Q1'),
+    } as const;
+    await answerer.answer({ ...baseRequest, provider: 'codex', model: 'gpt-5.6-sol' });
+    await answerer.answer({ ...baseRequest, provider: 'claude', model: 'claude-fable-5-1' });
+
+    expect(invocations.map((invocation) => invocation.executable)).toEqual(['codex', 'claude']);
+    expect(invocations[0]?.args).toContain('gpt-5.6-sol');
+    expect(invocations[0]?.args).toContain('/tmp/board.png');
+    expect(invocations[0]?.stdin).toBe('answer this fixture');
+    expect(invocations[1]?.args.slice(0, 3)).toEqual(['--model', 'claude-fable-5-1', '-p']);
+    expect(invocations[1]?.args[3]).toContain('Read the board PNG at /tmp/board.png');
+    expect(invocations[1]?.stdin).toBeNull();
+
+    const parsed = parseScreenshotProbeArgs([
+      '--models', 'gpt-5.6-luna:low,claude:claude-fable-5-1:high',
+      '--states', '1', '--seed', '1', '--images-root', 'dnd-slim-runs/provider-images',
+      '--out', 'dnd-slim-runs/provider.jsonl', '--generation', 'provider-fixture',
+    ]);
+    expect(parsed.models).toEqual([
+      { provider: 'codex', model: 'gpt-5.6-luna', effort: 'low' },
+      { provider: 'claude', model: 'claude-fable-5-1', effort: 'high' },
+    ]);
+  });
+
   it('accepts png, semantic and both board inputs, defaults to png, and rejects others', () => {
     const base = [
       '--models',
@@ -1513,6 +1562,40 @@
     ).toThrow();
   });
 
+  it('classifies model transport failures as blocked without assigning zero scores', async () => {
+    const artifactRoot = resolve('dnd-slim-runs');
+    mkdirSync(artifactRoot, { recursive: true });
+    const directory = await mkdtemp(join(artifactRoot, 'provider-blocked-test-'));
+    const outPath = join(directory, 'blocked.jsonl');
+    try {
+      const config = parseScreenshotProbeArgs([
+        '--models', 'claude:claude-fable-5-1:high', '--states', '1', '--seed', '1',
+        '--images-root', join(directory, 'blocked-images'), '--out', outPath,
+        '--generation', 'blocked-fixture',
+      ]);
+      const rows = await runScreenshotProbe(config, {
+        candidates: [{ id: 'blocked-fixture', state: everyClassState() }],
+        snapshotService: new FakeSnapshotService(),
+        answerer: {
+          answer: () => Promise.resolve({
+            rawAnswer: '', wallMs: 4, tokens: null, error: 'simulated transport failure',
+          }),
+        },
+      });
+      expect(rows).toHaveLength(14);
+      expect(rows.every((row) => row.outcome === 'blocked' && row.score === null)).toBe(true);
+      expect(strictProbeGate(rows)).toBe(false);
+      expect(await readFile(config.summaryPath, 'utf8')).toContain(
+        'BLOCKED — one or more model transports failed; no score is assigned.',
+      );
+      const persisted = (await readFile(outPath, 'utf8')).trim().split('\n').map((line) => JSON.parse(line) as unknown);
+      expect(persisted).toHaveLength(14);
+      expect(persisted.every((row) => typeof row === 'object' && row !== null && 'score' in row && row.score === null)).toBe(true);
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
+  });
+
   it('D576-I5-COMPARISON-IDENTITY separates explicit ablation metadata from exact acceptance pairs', async () => {
     const artifactRoot = resolve('dnd-slim-runs');
     mkdirSync(artifactRoot, { recursive: true });
diff --git a/tools/ai-dm-screenshot-probe.ts b/tools/ai-dm-screenshot-probe.ts
index 38a623de829e6d7f920e645aaafce5c212675c49..20753540bd3758a4fca460abce05372d16a7f90c
--- a/tools/ai-dm-screenshot-probe.ts
+++ b/tools/ai-dm-screenshot-probe.ts
@@ -176,6 +176,7 @@
 export type PrimerMode = 'none' | 'general';
 export type BoardInput = 'png' | 'semantic' | 'both';
 export type ComparisonMode = 'ablation' | 'acceptance';
+export type ProbeProvider = 'codex' | 'claude';
 export type PrimerVersion =
   | typeof PRIMER_VERSION
   | typeof PREVIOUS_PRIMER_VERSION
@@ -350,6 +351,7 @@
     };
 
 export interface ProbeModelSpec {
+  readonly provider: ProbeProvider;
   readonly model: string;
   readonly effort: ProbeEffort;
 }
@@ -402,8 +404,8 @@
     readonly width: number;
     readonly height: number;
   };
-  readonly outcome: 'answered' | 'schema_rejected' | 'call_error';
-  readonly score: number;
+  readonly outcome: 'answered' | 'schema_rejected' | 'blocked';
+  readonly score: number | null;
   readonly hallucinations: number;
   readonly confusions: readonly string[];
   readonly wallMs: number;
@@ -449,6 +451,7 @@
 }
 
 export interface ProbeAnswerRequest {
+  readonly provider: ProbeProvider;
   readonly model: string;
   readonly effort: ProbeEffort;
   readonly question: ScreenshotQuestionId;
@@ -2044,103 +2047,138 @@
   return { rawAnswer, tokens };
 }
 
-export function codexScreenshotAnswerer(): ProbeAnswerer {
+export interface ProbeCommandInvocation {
+  readonly executable: 'codex' | 'claude';
+  readonly args: readonly string[];
+  readonly stdin: string | null;
+  readonly cwd: string;
+  readonly env: NodeJS.ProcessEnv;
+}
+
+export interface ProbeCommandResult {
+  readonly stdout: string;
+  readonly stderr: string;
+  readonly code: number | null;
+  readonly signal: NodeJS.Signals | null;
+  readonly error: string | null;
+}
+
+export type ProbeCommandRunner = (
+  invocation: ProbeCommandInvocation,
+) => Promise<ProbeCommandResult>;
+
+function commandForProbeAnswer(request: ProbeAnswerRequest): ProbeCommandInvocation {
+  if (request.provider === 'claude') {
+    const imageInstruction = request.imagePath === null
+      ? ''
+      : `\n\nRead the board PNG at ${request.imagePath} before answering.`;
+    return {
+      executable: 'claude',
+      args: ['--model', request.model, '-p', `${request.prompt}${imageInstruction}`],
+      stdin: null,
+      cwd: repositoryRoot,
+      env: { ...process.env },
+    };
+  }
+  const imageArguments = request.imagePath === null ? [] : ['-i', request.imagePath];
   return {
-    answer(request) {
+    executable: 'codex',
+    args: [
+      'exec', '-C', repositoryRoot, '--sandbox', 'workspace-write', '--json',
+      '-m', request.model, ...imageArguments, '--output-schema', request.schemaPath,
+      '-c', `model_reasoning_effort=${JSON.stringify(request.effort)}`,
+      '-c', 'approval_policy="never"', '-c', 'project_doc_max_bytes=0',
+      '-c', 'features.plugins=false', '-c', 'skills.include_instructions=false',
+      '-c', 'developer_instructions=""', '-',
+    ],
+    stdin: request.prompt,
+    cwd: repositoryRoot,
+    env: { ...process.env, CODEX_HOME: AI_DM_CODEX_HOME },
+  };
+}
+
+const spawnedProbeCommandRunner: ProbeCommandRunner = (invocation) =>
+  new Promise<ProbeCommandResult>((resolvePromise) => {
+    const child = spawn(invocation.executable, [...invocation.args], {
+      cwd: invocation.cwd,
+      shell: false,
+      stdio: ['pipe', 'pipe', 'pipe'],
+      env: invocation.env,
+    });
+    let stdout = '';
+    let stderr = '';
+    let settled = false;
+    child.stdout.setEncoding('utf8');
+    child.stderr.setEncoding('utf8');
+    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
+    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
+    child.once('error', (error) => {
+      if (settled) return;
+      settled = true;
+      resolvePromise({ stdout, stderr, code: null, signal: null, error: error.message });
+    });
+    child.once('close', (code, signal) => {
+      if (settled) return;
+      settled = true;
+      resolvePromise({ stdout, stderr, code, signal, error: null });
+    });
+    if (invocation.stdin === null) child.stdin.end();
+    else child.stdin.end(invocation.stdin);
+  });
+
+export function providerAwareScreenshotAnswerer(
+  runner: ProbeCommandRunner = spawnedProbeCommandRunner,
+): ProbeAnswerer {
+  return {
+    async answer(request) {
       const started = performance.now();
-      return new Promise<ProbeAnswerResult>((resolvePromise) => {
-        const imageArguments = request.imagePath === null
-          ? []
-          : ['-i', request.imagePath];
-        const child = spawn(
-          'codex',
-          [
-            'exec',
-            '-C',
-            repositoryRoot,
-            '--sandbox',
-            'workspace-write',
-            '--json',
-            '-m',
-            request.model,
-            ...imageArguments,
-            '--output-schema',
-            request.schemaPath,
-            '-c',
-            `model_reasoning_effort=${JSON.stringify(request.effort)}`,
-            '-c',
-            'approval_policy="never"',
-            '-c',
-            'project_doc_max_bytes=0',
-            '-c',
-            'features.plugins=false',
-            '-c',
-            'skills.include_instructions=false',
-            '-c',
-            'developer_instructions=""',
-            '-',
-          ],
-          {
-            cwd: repositoryRoot,
-            shell: false,
-            stdio: ['pipe', 'pipe', 'pipe'],
-            env: { ...process.env, CODEX_HOME: AI_DM_CODEX_HOME },
-          },
-        );
-        let stdout = '';
-        let stderr = '';
-        child.stdout.setEncoding('utf8');
-        child.stderr.setEncoding('utf8');
-        child.stdout.on('data', (chunk: string) => {
-          stdout += chunk;
-        });
-        child.stderr.on('data', (chunk: string) => {
-          stderr += chunk;
-        });
-        child.once('error', (error) =>
-          resolvePromise({
-            rawAnswer: stdout,
-            wallMs: performance.now() - started,
-            tokens: null,
-            error: error instanceof Error ? error.message : String(error),
-          }),
-        );
-        child.once('close', (code, signal) => {
-          const wallMs = performance.now() - started;
-          if (code !== 0) {
-            resolvePromise({
-              rawAnswer: stdout,
-              wallMs,
-              tokens: null,
-              error: `codex exited ${code === null ? `on signal ${signal ?? 'unknown'}` : `with code ${String(code)}`}: ${stderr.slice(-4_000)}`,
-            });
-            return;
-          }
-          try {
-            const decoded = decodeCodexOutput(stdout);
-            resolvePromise({ ...decoded, wallMs, error: null });
-          } catch (error) {
-            resolvePromise({
-              rawAnswer: stdout,
-              wallMs,
-              tokens: null,
-              error: error instanceof Error ? error.message : String(error),
-            });
-          }
-        });
-        child.stdin.end(request.prompt);
-      });
+      const invocation = commandForProbeAnswer(request);
+      const result = await runner(invocation);
+      const wallMs = performance.now() - started;
+      if (result.error !== null || result.code !== 0) {
+        const exit = result.error ?? (result.code === null
+          ? `exited on signal ${result.signal ?? 'unknown'}`
+          : `exited with code ${String(result.code)}`);
+        return {
+          rawAnswer: result.stdout,
+          wallMs,
+          tokens: null,
+          error: `${invocation.executable} ${exit}: ${result.stderr.slice(-4_000)}`,
+        };
+      }
+      try {
+        if (request.provider === 'claude') {
+          const rawAnswer = result.stdout.trim();
+          if (rawAnswer.length === 0) throw new TypeError('Claude emitted no final answer.');
+          return { rawAnswer, wallMs, tokens: null, error: null };
+        }
+        const decoded = decodeCodexOutput(result.stdout);
+        return { ...decoded, wallMs, error: null };
+      } catch (error) {
+        return {
+          rawAnswer: result.stdout,
+          wallMs,
+          tokens: null,
+          error: error instanceof Error ? error.message : String(error),
+        };
+      }
     },
   };
 }
 
+export function codexScreenshotAnswerer(): ProbeAnswerer {
+  return providerAwareScreenshotAnswerer();
+}
+
 function parseModelSpec(value: string): ProbeModelSpec {
   const split = value.split(':');
-  if (split.length !== 2)
+  const provider: ProbeProvider = split[0] === 'claude' ? 'claude' : 'codex';
+  if ((provider === 'claude' && split.length !== 3) || (provider === 'codex' && split.length !== 2))
     throw new TypeError(
-      `Model specification ${value} must use model:effort syntax.`,
+      `Model specification ${value} must use model:effort or claude:model:effort syntax.`,
     );
-  const [model, rawEffort] = split;
+  const model = provider === 'claude' ? split[1] : split[0];
+  const rawEffort = provider === 'claude' ? split[2] : split[1];
   if (
     model === undefined ||
     model.trim().length === 0 ||
@@ -2148,7 +2186,7 @@
   ) {
     throw new TypeError(`Model specification ${value} is incomplete.`);
   }
-  return { model, effort: effortSchema.parse(rawEffort) };
+  return { provider, model, effort: effortSchema.parse(rawEffort) };
 }
 
 function insideRepository(path: string, label: string): string {
@@ -2784,10 +2822,10 @@
   if (result.error !== null) {
     return {
       ...base,
-      outcome: 'call_error',
-      score: 0,
+      outcome: 'blocked',
+      score: null,
       hallucinations: 0,
-      confusions: ['call error'],
+      confusions: ['transport blocked'],
       answer: null,
       normalizedAnswer: null,
       error: result.error,
@@ -2859,7 +2897,7 @@
   readonly semanticPayloadSha256: string | null;
   readonly png: { readonly sha256: string };
   readonly truth: unknown;
-  readonly score: number;
+  readonly score: number | null;
 }
 
 const comparisonProbeRowSchema = z
@@ -2889,7 +2927,7 @@
     semanticPayloadSha256: z.string().regex(/^[0-9a-f]{64}$/u),
     png: z.object({ sha256: z.string().regex(/^[0-9a-f]{64}$/u) }).passthrough(),
     truth: z.unknown(),
-    score: z.number().min(0).max(1),
+    score: z.union([z.number().min(0).max(1), z.null()]),
   })
   .passthrough();
 
@@ -2939,7 +2977,7 @@
         height: z.number().int().positive(),
       })
       .strict(),
-    outcome: z.enum(['answered', 'schema_rejected', 'call_error']),
+    outcome: z.enum(['answered', 'schema_rejected', 'call_error', 'blocked']),
     wallMs: z.number().nonnegative(),
     tokens: z
       .object({
@@ -3029,10 +3067,14 @@
     const selected = rows.filter((row) => row.question === question);
     if (selected.length === 0)
       throw new Error(`Summary has no rows for ${question}.`);
+    const selectedScores = selected.map((row) => {
+      if (row.score === null) throw new Error('Blocked probe rows cannot be scored.');
+      return row.score;
+    });
     const accuracy =
-      selected.reduce((sum, row) => sum + row.score, 0) / selected.length;
+      selectedScores.reduce((sum, score) => sum + score, 0) / selected.length;
     const accuracyInterval95 = bootstrapMeanInterval95(
-      selected.map((row) => row.score),
+      selectedScores,
       labelledSeed(bootstrapSeed, `${question}:accuracy`),
     );
     const previousSelected =
@@ -3043,8 +3085,10 @@
     const previousAccuracy =
       previousSelected === null
         ? null
-        : previousSelected.reduce((sum, row) => sum + row.score, 0) /
-          previousSelected.length;
+        : previousSelected.reduce((sum, row) => {
+            if (row.score === null) throw new Error('Blocked comparison rows cannot be scored.');
+            return sum + row.score;
+          }, 0) / previousSelected.length;
     const pairedDeltas =
       previousSelected === null
         ? null
@@ -3060,6 +3104,8 @@
                 throw new Error(
                   `Previous run has no paired row for ${comparisonKey(row)}.`,
                 );
+              if (previousScore === null || row.score === null)
+                throw new Error('Blocked probe rows cannot be compared.');
               return row.score - previousScore;
             });
           })();
@@ -3072,7 +3118,7 @@
           );
     return {
       question,
-      scoreNumerator: selected.reduce((sum, row) => sum + row.score, 0),
+      scoreNumerator: selectedScores.reduce((sum, score) => sum + score, 0),
       denominator: selected.length,
       accuracy,
       accuracyInterval95,
@@ -3176,6 +3222,9 @@
   previousRows: readonly ComparisonProbeRow[],
   mode: ComparisonMode,
 ): void {
+  if (rows.some((row) => row.score === null) || previousRows.some((row) => row.score === null)) {
+    throw new TypeError('Blocked transport rows cannot be compared.');
+  }
   const keys = rows.map(comparisonKey);
   const previousKeys = previousRows.map(comparisonKey);
   if (new Set(keys).size !== keys.length)
@@ -3230,6 +3279,7 @@
   const groups = groupedRows(rows);
   return (
     rows.every((row) => row.resultKind === 'generated') &&
+    rows.every((row) => row.outcome !== 'blocked' && row.score !== null) &&
     groups.size > 0 &&
     [...groups.values()].every((group) => {
       const expected = group.every((row) => row.boardInput === 'png')
@@ -3257,6 +3307,24 @@
   const resultKind = rows[0]?.resultKind;
   if (resultKind === undefined)
     throw new RangeError('A probe summary requires at least one row.');
+  const blockedRows = rows.filter((row) => row.outcome === 'blocked' || row.score === null);
+  if (blockedRows.length > 0) {
+    if (previousRows !== null)
+      throw new TypeError('Blocked transport rows cannot be compared.');
+    const details = blockedRows.map((row) =>
+      `| ${row.model}:${row.effort} | ${row.stateId} | ${row.question} | ${row.error ?? 'transport failure'} |`,
+    );
+    return `${[
+      '# D576 screenshot comprehension probe',
+      '',
+      '**BLOCKED — one or more model transports failed; no score is assigned.**',
+      '',
+      '| Model | State | Question | Transport error |',
+      '|---|---|---|---|',
+      ...details,
+      '',
+    ].join('\n')}\n`;
+  }
   if (previousRows !== null)
     assertComparableRuns(rows, previousRows, comparisonMode);
   const groups = new Map<string, ScreenshotProbeRow[]>();
@@ -3431,17 +3499,17 @@
     truth,
     rawAnswer: saved.rawAnswer,
   } as const;
-  if (saved.outcome === 'call_error') {
+  if (saved.outcome === 'call_error' || saved.outcome === 'blocked') {
     return {
       ...base,
-      outcome: 'call_error',
-      score: 0,
+      outcome: 'blocked',
+      score: null,
       hallucinations: 0,
-      confusions: ['call error'],
+      confusions: ['transport blocked'],
       answer: null,
       normalizedAnswer: null,
       error:
-        'Saved row recorded a model call error; no answer exists to rescore.',
+        'Saved row recorded a blocked model transport; no answer exists to rescore.',
     };
   }
   let answer: ProbeAnswer;
@@ -3589,7 +3657,7 @@
     dependencies.answerer ??
     (config.simulate
       ? simulatedProbeAnswerer('perfect')
-      : codexScreenshotAnswerer());
+      : providerAwareScreenshotAnswerer());
   try {
     const captured: Array<{
       readonly candidate: ProbeStateCandidate;
diff --git a/tools/assets/authored-art-import-core.ts b/tools/assets/authored-art-import-core.ts
index a03cc252d404d7add28d93277b640c7d3ff19afa..2e1fbf0c0644368821a92d3eefdf4674f68f428c
--- a/tools/assets/authored-art-import-core.ts
+++ b/tools/assets/authored-art-import-core.ts
@@ -121,6 +121,6 @@
 }
 
 export function renderAuthoredModule(art: ImportedAuthoredArt): string {
-  const rows = art.rows.map((row) => `    '${row}',`).join('\n');
-  return `/* Generated by tools/assets/import-authored-art.ts. Do not edit. */\nimport { authoredArt } from './art';\n\nexport const art = authoredArt({\n  id: '${art.id}',\n  requestId: '${art.requestId}',\n  packageId: '${art.packageId}',\n  svgSha256: '${art.svgSha256}',\n  pngSha256: '${art.pngSha256}',\n  rows: [\n${rows}\n  ],\n});\n`;
+  const rows = art.rows.map((row) => `    ${JSON.stringify(row)},`).join('\n');
+  return `/* Generated by tools/assets/import-authored-art.ts. Do not edit. */\nimport { authoredArt } from './art';\n\nexport const art = authoredArt({\n  id: ${JSON.stringify(art.id)},\n  requestId: ${JSON.stringify(art.requestId)},\n  packageId: ${JSON.stringify(art.packageId)},\n  svgSha256: ${JSON.stringify(art.svgSha256)},\n  pngSha256: ${JSON.stringify(art.pngSha256)},\n  rows: [\n${rows}\n  ],\n});\n`;
 }
diff --git a/tools/assets/distinct-portrait-scene.ts b/tools/assets/distinct-portrait-scene.ts
new file mode 100644
index 0000000000000000000000000000000000000000..1c78dcab251266c0777d82d277fb70cada1ed9dd
--- /dev/null
+++ b/tools/assets/distinct-portrait-scene.ts
@@ -0,0 +1,100 @@
+import { createHash } from 'node:crypto';
+import { assetId, type AssetId } from '../../src/assets/ids';
+import { paintRecipe } from '../../src/assets/pixel-art';
+import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';
+import { combatantId } from '../../src/combat/values';
+import { projectEncounterTerrainCells } from '../../src/vtt/encounter-board';
+import { decodeEncounterArtPackage } from '../../src/vtt/encounter-package';
+import { REFERENCE_ENCOUNTER_ART } from '../../src/vtt/reference-encounter-art';
+
+export const DISTINCT_PORTRAIT_COLUMNS = 7;
+export const DISTINCT_PORTRAIT_ROWS = 4;
+
+export const NAMED_PORTRAIT_IDS = Object.freeze([
+  'art.token.pc.fighter.v1',
+  'art.token.pc.cleric.v1',
+  'art.token.pc.wizard.v1',
+  'art.token.pc.rogue.v1',
+  'art.token.monster.goblin-warrior.v1',
+  'art.token.monster.hobgoblin-warrior.v1',
+  'art.token.monster.bandit-captain.v1',
+  'art.token.monster.ogre.v1',
+  'art.token.monster.priest-acolyte.v1',
+  'art.token.monster.priest.v1',
+  'art.token.monster.skeleton.v1',
+  'art.token.monster.zombie.v1',
+  'art.token.monster.wolf.v1',
+] as const);
+
+export interface DistinctPortraitSceneEntry {
+  readonly id: AssetId;
+  readonly combatantId: ReturnType<typeof combatantId>;
+  readonly name: string;
+  readonly side: 'party' | 'foe';
+  readonly column: number;
+  readonly row: number;
+}
+
+function rgbaSha256(id: AssetId): string {
+  const input = STARTER_ART_INPUTS.find((entry) => entry.id === id);
+  if (input === undefined) throw new Error(`Missing portrait input ${id}.`);
+  return createHash('sha256').update(paintRecipe(input.recipe).data).digest('hex');
+}
+
+export function distinctPortraitSceneEntries(): readonly DistinctPortraitSceneEntry[] {
+  const seen = new Set<string>();
+  const distinct = STARTER_ART_INPUTS.filter((input) =>
+    input.id.startsWith('art.token.') && input.recipe.kind === 'authored',
+  ).filter((input) => {
+    const digest = rgbaSha256(input.id);
+    if (seen.has(digest)) return false;
+    seen.add(digest);
+    return true;
+  });
+  return Object.freeze(distinct.map((input, index) => Object.freeze({
+    id: assetId(String(input.id)),
+    combatantId: combatantId(`combatant:distinct-portrait-${String(index + 1)}`),
+    name: String(input.id).replace(/^art\.token\./u, '').replace(/\.v1$/u, ''),
+    side: input.id.includes('.pc.') || input.id.includes('.party.') ? 'party' as const : 'foe' as const,
+    column: index % DISTINCT_PORTRAIT_COLUMNS,
+    row: Math.floor(index / DISTINCT_PORTRAIT_COLUMNS),
+  })));
+}
+
+export function distinctPortraitBoardScene() {
+  const entries = distinctPortraitSceneEntries();
+  const bounds = { columns: DISTINCT_PORTRAIT_COLUMNS, rows: DISTINCT_PORTRAIT_ROWS };
+  const combatants = entries.map((entry) => ({
+    id: entry.combatantId,
+    name: entry.name,
+    kind: entry.side === 'party' ? 'player_character' as const : 'monster' as const,
+    placementStatus: 'placed' as const,
+    position: { column: entry.column, row: entry.row },
+    effectiveSize: 'Medium' as const,
+    placementMode: { kind: 'normal' as const, actual: 'Medium' as const },
+    footprint: [{ column: entry.column, row: entry.row }] as const,
+  }));
+  const art = decodeEncounterArtPackage({
+    ...REFERENCE_ENCOUNTER_ART,
+    id: 'encounter-art:distinct-portrait-proof:v1',
+    room: {
+      ...REFERENCE_ENCOUNTER_ART.room,
+      columns: bounds.columns,
+      rows: bounds.rows,
+      doorCell: { column: 3, row: bounds.rows - 1 },
+    },
+    terrain: [],
+    combatantTokens: Object.fromEntries(entries.map((entry) => [entry.combatantId, entry.id])),
+  });
+  return {
+    entries,
+    art,
+    projection: {
+      bounds,
+      terrainCells: projectEncounterTerrainCells(bounds, { blockedCells: [], worldObjects: [] }),
+      combatants,
+      highlightedCombatant: entries[0]?.combatantId ?? null,
+      adjudicatedTargets: entries[1] === undefined ? [] : [entries[1].combatantId],
+    },
+  };
+}
diff --git a/tools/assets/generate-classic-contact-sheets.ts b/tools/assets/generate-classic-contact-sheets.ts
index 8feacc903405315d6fc280bc3efb1e43abb594dc..38b42010472ecc216479e3c23971cca0bef142a2
--- a/tools/assets/generate-classic-contact-sheets.ts
+++ b/tools/assets/generate-classic-contact-sheets.ts
@@ -7,22 +7,36 @@
   renderCreatureBadgeBitmap,
   renderCreatureRingBitmap,
 } from '../../src/assets/board-chrome-art';
-import { neutral } from '../../src/assets/palette';
-import {
-  TILE_SIZE,
-  paintRecipe,
-} from '../../src/assets/pixel-art';
+import { neutral, ramp } from '../../src/assets/palette';
+import { TILE_SIZE, paintRecipe, type OverlayEffect } from '../../src/assets/pixel-art';
 import { encodePng } from '../../src/assets/png';
 import { STARTER_ART_INPUTS, STARTER_ART_INPUTS_BY_ID, archetypeTokenAssetId } from '../../src/assets/starter-art-inputs';
 import {
   CREATURE_BADGE_COLORS,
   CREATURE_BADGE_LEFT_PX,
   CREATURE_BADGE_TOP_PX,
+  HP_BAR_BORDER_PX,
+  HP_BAR_HEIGHT_PX,
+  HP_BAR_WIDTH_PX,
   creatureBustRingGeometry,
+  hpBarTopPx,
 } from '../../src/vtt/board-chrome';
+import {
+  DISTINCT_PORTRAIT_COLUMNS,
+  DISTINCT_PORTRAIT_ROWS,
+  distinctPortraitBoardScene,
+} from './distinct-portrait-scene';
 
 const GAP = 8;
 const COLUMNS = 10;
+const MATRIX_SIZES = [64, 32] as const;
+const REVIEW_OVERLAYS: readonly (readonly OverlayEffect[])[] = Object.freeze([
+  ['light-bright', 'glyph-fog'],
+  ['light-dim', 'obscurement-heavy'],
+  ['light-darkness', 'terrain-half-cover'],
+  ['light-bright', 'terrain-three-quarters-cover'],
+  ['light-dim', 'difficult'],
+]);
 
 function productionBitmap(id: string): Bitmap {
   const input = STARTER_ART_INPUTS_BY_ID.get(assetId(id));
@@ -30,12 +44,7 @@
   return paintRecipe(input.recipe);
 }
 
-function composite(
-  target: Bitmap,
-  source: Bitmap,
-  originX: number,
-  originY: number,
-): void {
+function composite(target: Bitmap, source: Bitmap, originX: number, originY: number): void {
   for (let y = 0; y < source.height; y += 1)
     for (let x = 0; x < source.width; x += 1) {
       const pixel = source.get(x, y);
@@ -43,119 +52,155 @@
     }
 }
 
-function cellComposite(
-  target: Bitmap,
-  originX: number,
-  originY: number,
-  index: number,
-): void {
-  const variant = index % 4;
-  const floor = productionBitmap(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`);
-  const overlay = paintRecipe({
-    kind: 'overlay',
-    material: 'semantic',
-    effect:
-      index === 0
-        ? 'light-bright'
-        : index === 1
-          ? 'difficult'
-          : index === 2
-            ? 'obscurement-heavy'
-            : 'glyph-fog',
-  });
-  const archetype = ['fighter', 'wizard', 'beast', 'construct'][index] as
-    | 'fighter'
-    | 'wizard'
-    | 'beast'
-    | 'construct';
-  const token = productionBitmap(archetypeTokenAssetId(archetype, index < 2 ? 'party' : 'foe'));
-  const ring = paintRecipe({
-    kind: 'focus',
-    material: 'semantic',
-    mark: index % 2 === 0 ? 'active' : 'hidden',
-  });
-  const identity = CREATURE_BADGE_COLORS[index]!;
+function drawHpBar(target: Bitmap, originX: number, originY: number, index: number): void {
+  const left = originX + Math.round((TILE_SIZE - HP_BAR_WIDTH_PX) / 2) - HP_BAR_BORDER_PX;
+  const top = originY + hpBarTopPx();
+  target.rect(left, top, HP_BAR_WIDTH_PX + 2 * HP_BAR_BORDER_PX, HP_BAR_HEIGHT_PX + 2 * HP_BAR_BORDER_PX, neutral(0));
+  const fillWidth = Math.max(1, Math.round(HP_BAR_WIDTH_PX * [1, 0.55, 0.2][index % 3]!));
+  const fill = index % 3 === 0 ? ramp('moss', 5) : index % 3 === 1 ? ramp('earth', 5) : ramp('cloth-warm', 4);
+  target.rect(left + HP_BAR_BORDER_PX, top + HP_BAR_BORDER_PX, fillWidth, HP_BAR_HEIGHT_PX, fill);
+}
+
+function drawCreatureChrome(target: Bitmap, originX: number, originY: number, index: number): void {
+  const identity = CREATURE_BADGE_COLORS[index % CREATURE_BADGE_COLORS.length]!;
   const ringGeometry = creatureBustRingGeometry(0);
-  const identityRing = renderCreatureRingBitmap(
-    identity.disc,
-    ringGeometry.nativeSize,
-  );
-  const identityBadge = renderCreatureBadgeBitmap(
-    index + 1,
-    identity.disc,
-    identity.numeralInk,
-  );
-  composite(target, floor, originX, originY);
-  composite(target, overlay, originX, originY);
   compositeGeneratedChromeBitmap(
     target,
-    identityRing,
+    renderCreatureRingBitmap(identity.disc, ringGeometry.nativeSize),
     originX + ringGeometry.inset,
     originY + ringGeometry.inset,
   );
   compositeGeneratedChromeBitmap(
     target,
-    identityBadge,
+    renderCreatureBadgeBitmap(index % CREATURE_BADGE_COLORS.length + 1, identity.disc, identity.numeralInk),
     originX + CREATURE_BADGE_LEFT_PX,
     originY + CREATURE_BADGE_TOP_PX,
   );
-  composite(target, token, originX, originY);
-  composite(target, ring, originX, originY);
+  drawHpBar(target, originX, originY, index);
 }
 
-function renderContactSheet(): Bitmap {
+function drawReviewCell(target: Bitmap, originX: number, originY: number, index: number, tokenId: string): void {
+  const variant = index % 4;
+  composite(target, productionBitmap(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`), originX, originY);
+  for (const effect of REVIEW_OVERLAYS[index % REVIEW_OVERLAYS.length]!) {
+    composite(target, paintRecipe({ kind: 'overlay', material: 'semantic', effect }), originX, originY);
+  }
+  drawCreatureChrome(target, originX, originY, index);
+  composite(target, productionBitmap(tokenId), originX, originY);
+}
+
+export function renderClassicContactSheet(): Bitmap {
   const inventoryRows = Math.ceil(STARTER_ART_INPUTS.length / COLUMNS);
   const inventoryTop = TILE_SIZE * 4 + GAP * 8;
-  const compositesTop =
-    inventoryTop + inventoryRows * (TILE_SIZE + GAP) + GAP * 2;
+  const compositesTop = inventoryTop + inventoryRows * (TILE_SIZE + GAP) + GAP * 2;
   const width = GAP * 2 + COLUMNS * TILE_SIZE + (COLUMNS - 1) * GAP;
   const height = compositesTop + TILE_SIZE + GAP * 2;
   const sheet = new Bitmap(width, height);
   sheet.fill(neutral(0));
-
   for (let variant = 0; variant < 4; variant += 1)
-    composite(
-      sheet,
-      productionBitmap(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`),
-      GAP + variant * TILE_SIZE,
-      GAP,
-    );
-
+    composite(sheet, productionBitmap(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`), GAP + variant * TILE_SIZE, GAP);
   const wallPieces = ['nw', 'n', 'ne', 'w', 'n', 'e', 'sw', 's', 'se'] as const;
-  wallPieces.forEach((piece, index) =>
-    composite(
-      sheet,
-      productionBitmap(piece === 'n' ? 'art.map.wall.stone.v1' : `art.map.wall.stone-${piece}.v1`),
-      GAP + (index % 3) * TILE_SIZE,
-      TILE_SIZE + GAP * 3 + Math.floor(index / 3) * TILE_SIZE,
-    ),
-  );
+  wallPieces.forEach((piece, index) => composite(
+    sheet,
+    productionBitmap(piece === 'n' ? 'art.map.wall.stone.v1' : `art.map.wall.stone-${piece}.v1`),
+    GAP + (index % 3) * TILE_SIZE,
+    TILE_SIZE + GAP * 3 + Math.floor(index / 3) * TILE_SIZE,
+  ));
+  STARTER_ART_INPUTS.forEach((input, index) => composite(
+    sheet,
+    paintRecipe(input.recipe),
+    GAP + (index % COLUMNS) * (TILE_SIZE + GAP),
+    inventoryTop + Math.floor(index / COLUMNS) * (TILE_SIZE + GAP),
+  ));
+  for (let index = 0; index < 4; index += 1) {
+    const archetype = ['fighter', 'wizard', 'beast', 'construct'][index] as 'fighter' | 'wizard' | 'beast' | 'construct';
+    drawReviewCell(sheet, GAP + index * TILE_SIZE, compositesTop, index, archetypeTokenAssetId(archetype, index < 2 ? 'party' : 'foe'));
+  }
+  return sheet;
+}
+
+export function renderDistinctPortraitBoard(): Bitmap {
+  const board = new Bitmap(DISTINCT_PORTRAIT_COLUMNS * TILE_SIZE, DISTINCT_PORTRAIT_ROWS * TILE_SIZE);
+  board.fill(neutral(0));
+  for (const [index, entry] of distinctPortraitBoardScene().entries.entries()) {
+    drawReviewCell(board, entry.column * TILE_SIZE, entry.row * TILE_SIZE, index, entry.id);
+  }
+  return board;
+}
+
+export function resampleNearest(source: Bitmap, size: 64 | 32): Bitmap {
+  const factor = TILE_SIZE / size;
+  const target = new Bitmap(source.width / factor, source.height / factor);
+  for (let y = 0; y < target.height; y += 1)
+    for (let x = 0; x < target.width; x += 1) {
+      const pixel = source.get(x * factor, y * factor);
+      target.data.set([pixel.red, pixel.green, pixel.blue, pixel.alpha], (y * target.width + x) * 4);
+    }
+  return target;
+}
+
+export function resampleArea(source: Bitmap, size: 64 | 32): Bitmap {
+  const factor = TILE_SIZE / size;
+  const target = new Bitmap(source.width / factor, source.height / factor);
+  for (let y = 0; y < target.height; y += 1)
+    for (let x = 0; x < target.width; x += 1) {
+      const totals = [0, 0, 0, 0];
+      for (let dy = 0; dy < factor; dy += 1)
+        for (let dx = 0; dx < factor; dx += 1) {
+          const pixel = source.get(x * factor + dx, y * factor + dy);
+          totals[0]! += pixel.red;
+          totals[1]! += pixel.green;
+          totals[2]! += pixel.blue;
+          totals[3]! += pixel.alpha;
+        }
+      const divisor = factor * factor;
+      target.data.set(totals.map((value) => Math.round(value / divisor)), (y * target.width + x) * 4);
+    }
+  return target;
+}
+
+export function grayscale(source: Bitmap): Bitmap {
+  const target = new Bitmap(source.width, source.height);
+  for (let y = 0; y < source.height; y += 1)
+    for (let x = 0; x < source.width; x += 1) {
+      const pixel = source.get(x, y);
+      const luminance = Math.round(pixel.red * 0.2126 + pixel.green * 0.7152 + pixel.blue * 0.0722);
+      target.data.set([luminance, luminance, luminance, pixel.alpha], (y * source.width + x) * 4);
+    }
+  return target;
+}
 
-  STARTER_ART_INPUTS.forEach((input, index) =>
-    composite(
-      sheet,
-      paintRecipe(input.recipe),
-      GAP + (index % COLUMNS) * (TILE_SIZE + GAP),
-      inventoryTop + Math.floor(index / COLUMNS) * (TILE_SIZE + GAP),
-    ),
-  );
-  for (let index = 0; index < 4; index += 1)
-    cellComposite(sheet, GAP + index * TILE_SIZE, compositesTop, index);
-  return sheet;
+function writeMatrix(outputDirectory: string, prefix: string, native: Bitmap): readonly string[] {
+  const outputs: Array<{ readonly name: string; readonly bitmap: Bitmap }> = [
+    { name: `${prefix}-native-color.png`, bitmap: native },
+    { name: `${prefix}-native-grayscale.png`, bitmap: grayscale(native) },
+  ];
+  for (const size of MATRIX_SIZES) {
+    for (const [filter, bitmap] of [['nearest', resampleNearest(native, size)], ['area', resampleArea(native, size)]] as const) {
+      outputs.push(
+        { name: `${prefix}-${String(size)}-${filter}-color.png`, bitmap },
+        { name: `${prefix}-${String(size)}-${filter}-grayscale.png`, bitmap: grayscale(bitmap) },
+      );
+    }
+  }
+  for (const output of outputs) {
+    writeFileSync(resolve(outputDirectory, output.name), encodePng(output.bitmap.width, output.bitmap.height, output.bitmap.data));
+  }
+  return outputs.map((output) => output.name);
 }
 
 const iterationFlag = process.argv.indexOf('--iteration');
 const iteration = iterationFlag === -1 ? '1' : process.argv[iterationFlag + 1];
-if (iteration === undefined || !/^[1-9][0-9]*$/u.test(iteration))
-  throw new Error('--iteration requires a positive integer.');
+if (iteration === undefined || !/^[1-9][0-9]*$/u.test(iteration)) throw new Error('--iteration requires a positive integer.');
 const outFlag = process.argv.indexOf('--out');
 const requestedOutput = outFlag === -1 ? 'test-results/classic-contact-sheets' : process.argv[outFlag + 1];
 if (requestedOutput === undefined) throw new Error('--out requires a directory.');
+const sceneFlag = process.argv.indexOf('--scene');
+const scene = sceneFlag === -1 ? 'contact-sheet' : process.argv[sceneFlag + 1];
+if (scene !== 'contact-sheet' && scene !== 'distinct-portraits' && scene !== 'all') throw new Error('--scene requires contact-sheet, distinct-portraits, or all.');
 const outputDirectory = resolve(requestedOutput);
 mkdirSync(outputDirectory, { recursive: true });
-const outputPath = resolve(outputDirectory, `iteration-${iteration}.png`);
-const bitmap = renderContactSheet();
-writeFileSync(outputPath, encodePng(bitmap.width, bitmap.height, bitmap.data));
-process.stdout.write(
-  `${outputPath} ${String(bitmap.width)}x${String(bitmap.height)}\n`,
-);
+const written: string[] = [];
+if (scene === 'contact-sheet' || scene === 'all') written.push(...writeMatrix(outputDirectory, `iteration-${iteration}-contact-sheet`, renderClassicContactSheet()));
+if (scene === 'distinct-portraits' || scene === 'all') written.push(...writeMatrix(outputDirectory, `iteration-${iteration}-distinct-portraits`, renderDistinctPortraitBoard()));
+process.stdout.write(`${written.map((name) => resolve(outputDirectory, name)).join('\n')}\n`);
diff --git a/tools/assets/import-authored-art.ts b/tools/assets/import-authored-art.ts
index 6805d9cc617f7b88fc573dc7100847c5117eaff4..e5ad674c77e87c350591986abb8e33360d4e42c8
--- a/tools/assets/import-authored-art.ts
+++ b/tools/assets/import-authored-art.ts
@@ -1,21 +1,68 @@
 import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
-import { resolve } from 'node:path';
+import { basename, resolve } from 'node:path';
+import { z } from 'zod';
 import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';
 import { parseAuthoredSvg, renderAuthoredModule, sha256, type ImportedAuthoredArt } from './authored-art-import-core';
 
-interface PackageAsset {
-  readonly requestId: string;
-  readonly replaces: string | null;
-  readonly svg: string;
-  readonly png: string;
-  readonly width: number;
-  readonly height: number;
-  readonly svgSha256: string;
-  readonly pngSha256: string;
+const uuidV7Schema = z.string().regex(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u);
+const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u);
+const relativePathSchema = z.string().min(1).refine((path) =>
+  !path.startsWith('/') && !path.includes('\\') && !path.split('/').includes('..'),
+  'Package paths must be relative and cannot traverse directories.',
+);
+const packageAssetSchema = z.strictObject({
+  requestId: uuidV7Schema,
+  requestFile: relativePathSchema.regex(/\.json$/u),
+  replaces: z.union([z.string().regex(/^public\/assets\/art\/[a-z0-9]+(?:[.-][a-z0-9]+)*\.png$/u), z.null()]),
+  changed: z.boolean(),
+  svg: relativePathSchema.regex(/\.svg$/u),
+  png: relativePathSchema.regex(/\.png$/u),
+  width: z.literal(128),
+  height: z.literal(128),
+  svgSha256: sha256Schema,
+  pngSha256: sha256Schema,
+  source: z.string().min(1),
+  status: z.literal('delivered'),
+  note: z.string().min(1).optional(),
+});
+const packageManifestSchema = z.strictObject({
+  schemaVersion: z.literal(1),
+  packageId: uuidV7Schema,
+  name: z.string().min(1),
+  status: z.literal('delivered'),
+  selectedOption: z.string().min(1),
+  source: relativePathSchema,
+  assets: z.array(packageAssetSchema),
+  preserved: z.array(z.strictObject({
+    asset: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*\.png$/u),
+    path: relativePathSchema.regex(/\.png$/u),
+    reason: z.string().min(1),
+  })),
+});
+const oracleRowSchema = z.strictObject({
+  requestId: uuidV7Schema,
+  rgbaSha256: sha256Schema,
+  pngSha256: sha256Schema,
+  svgSha256: sha256Schema,
+});
+const oracleSchema = z.record(z.string().min(1), oracleRowSchema);
+type PackageManifest = z.infer<typeof packageManifestSchema>;
+type OracleRow = z.infer<typeof oracleRowSchema>;
+
+export interface AuthoredImportIo {
+  readonly readText: (path: string) => string;
+  readonly readBytes: (path: string) => Uint8Array;
+  readonly writeText: (path: string, source: string) => void;
+  readonly mkdir: (path: string) => void;
 }
-interface PackageManifest { readonly schemaVersion: number; readonly packageId: string; readonly assets: readonly PackageAsset[] }
-interface OracleRow { readonly requestId: string; readonly rgbaSha256: string; readonly pngSha256: string; readonly svgSha256: string }
 
+const NODE_IO: AuthoredImportIo = {
+  readText: (path) => readFileSync(path, 'utf8'),
+  readBytes: (path) => readFileSync(path),
+  writeText: (path, source) => writeFileSync(path, source, 'utf8'),
+  mkdir: (path) => mkdirSync(path, { recursive: true }),
+};
+
 function flag(name: string): string {
   const index = process.argv.indexOf(name);
   const value = process.argv[index + 1];
@@ -36,10 +83,15 @@
 
 function stemForId(id: string): string { return id.replace(/^art\./u, '').replaceAll('.', '-'); }
 
-export function importAuthoredPackage(packageDirectory: string, oraclePath: string, checkOnly: boolean, repositoryRoot: string): number {
-  const manifest = JSON.parse(readFileSync(resolve(packageDirectory, 'manifest.json'), 'utf8')) as PackageManifest;
-  const oracle = JSON.parse(readFileSync(oraclePath, 'utf8')) as Readonly<Record<string, OracleRow>>;
-  if (manifest.schemaVersion !== 1) throw new Error('Authored package schemaVersion must be 1.');
+export function importAuthoredPackage(packageDirectory: string, oraclePath: string, checkOnly: boolean, repositoryRoot: string, io: AuthoredImportIo = NODE_IO): number {
+  const manifest: PackageManifest = packageManifestSchema.parse(JSON.parse(io.readText(resolve(packageDirectory, 'manifest.json'))) as unknown);
+  const oracle: Readonly<Record<string, OracleRow>> = oracleSchema.parse(JSON.parse(io.readText(oraclePath)) as unknown);
+  const expectedOracleKeys = manifest.assets.map((row) => row.replaces ?? `NEW:${basename(row.png)}`);
+  if (new Set(expectedOracleKeys).size !== expectedOracleKeys.length ||
+      Object.keys(oracle).length !== expectedOracleKeys.length ||
+      expectedOracleKeys.some((key) => oracle[key] === undefined)) {
+    throw new Error('Oracle coverage must exactly match the package assets.');
+  }
   const requestIds = new Set<string>();
   const targets = new Set<string>();
   const selected: ImportedAuthoredArt[] = [];
@@ -51,8 +103,8 @@
       targets.add(row.replaces);
     }
     if (row.width !== 128 || row.height !== 128) throw new Error(`Invalid dimensions for ${row.requestId}.`);
-    const svgBytes = readFileSync(resolve(packageDirectory, row.svg));
-    const pngBytes = readFileSync(resolve(packageDirectory, row.png));
+    const svgBytes = io.readBytes(resolve(packageDirectory, row.svg));
+    const pngBytes = io.readBytes(resolve(packageDirectory, row.png));
     if (sha256(svgBytes) !== row.svgSha256 || sha256(pngBytes) !== row.pngSha256) throw new Error(`Package digest mismatch for ${row.requestId}.`);
     if (row.replaces === null || row.replaces.endsWith('/terrain-hazard-v1.png')) continue;
     const expected = oracle[row.replaces];
@@ -60,17 +112,20 @@
     if (expected.requestId !== row.requestId || expected.svgSha256 !== row.svgSha256 || expected.pngSha256 !== row.pngSha256) {
       throw new Error(`Oracle provenance mismatch for ${row.requestId}.`);
     }
-    const parsed = parseAuthoredSvg(svgBytes.toString('utf8'));
+    const parsed = parseAuthoredSvg(new TextDecoder().decode(svgBytes));
     const actualRgba = sha256(parsed.rgba);
     if (actualRgba !== expected.rgbaSha256) throw new Error(`RGBA oracle mismatch for ${row.requestId}: ${actualRgba} != ${expected.rgbaSha256}.`);
     selected.push({ id: idFromOutput(row.replaces), requestId: row.requestId, packageId: manifest.packageId, svgSha256: row.svgSha256, pngSha256: row.pngSha256, ...parsed });
   }
-  const inventory = new Set(STARTER_ART_INPUTS.map((entry) => String(entry.id)));
-  const unknown = selected.filter((entry) => !inventory.has(entry.id)).map((entry) => entry.id);
-  if (selected.length !== 58 || unknown.length > 0) throw new Error(`Selected authored coverage is invalid (${String(selected.length)} rows; unknown ${unknown.join(', ')}).`);
+  const expectedIds = STARTER_ART_INPUTS.filter((entry) => entry.recipe.kind === 'authored').map((entry) => String(entry.id));
+  const selectedIds = selected.map((entry) => entry.id);
+  if (selected.length !== 58 || new Set(selectedIds).size !== 58 ||
+      [...selectedIds].sort().join('\n') !== [...expectedIds].sort().join('\n')) {
+    throw new Error(`Selected authored coverage is invalid (${String(selected.length)} rows).`);
+  }
   const generated = selected.map((entry) => ({ path: resolve(repositoryRoot, 'src/assets/authored', `${stemForId(entry.id)}.ts`), source: renderAuthoredModule(entry) }));
   const imports = selected.map((entry, index) => `import { art as art${String(index)} } from './${stemForId(entry.id)}';`).join('\n');
-  const entries = selected.map((entry, index) => `  ['${entry.id}', art${String(index)}],`).join('\n');
+  const entries = selected.map((entry, index) => `  [${JSON.stringify(entry.id)}, art${String(index)}],`).join('\n');
   const groups = new Map<string, ImportedAuthoredArt[]>();
   for (const entry of selected) groups.set(sha256(entry.rgba), [...(groups.get(sha256(entry.rgba)) ?? []), entry]);
   const equality = [...groups.values()].filter((group) => group.length > 1).map((group) => group.map((entry) => entry.id));
@@ -78,10 +133,10 @@
   generated.push({ path: resolve(repositoryRoot, 'src/assets/authored/index.ts'), source: indexSource });
   for (const output of generated) {
     if (checkOnly) {
-      if (readFileSync(output.path, 'utf8') !== output.source) throw new Error(`Generated authored module drifted: ${output.path}.`);
+      if (io.readText(output.path) !== output.source) throw new Error(`Generated authored module drifted: ${output.path}.`);
     } else {
-      mkdirSync(resolve(output.path, '..'), { recursive: true });
-      writeFileSync(output.path, output.source, 'utf8');
+      io.mkdir(resolve(output.path, '..'));
+      io.writeText(output.path, output.source);
     }
   }
   return selected.length;
