Implemented the full Quietstone branch-only art integration.

Key outputs:

- 58 authored assets imported; 34 procedural assets preserved.
- Generator upgraded to `5.0.0` / `starter-art-inputs-v5`.
- Hazard remains procedural.
- Authored registry: 60 source files, 441,273 bytes.
- Cached decoded RGBA buffers: 3,801,088 bytes.
- Largest PNG: 2,281 bytes (`token-monster-hobgoblin-warrior-v1.png`).
- Public art diff: exactly 58 PNG files.
- Fixed-input digest changed from `9c5b298f…` to `fd63baef…`.
- Semantic digest comparison: exactly 58 changed output digests.
- Preview digest: `660df187b9f800520ddf048ed0deae0fa1466912617852298343910484825e6d`.
- Frozen contracts digest remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Implemented areas include [authored source and registry](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/authored/index.ts), [importer](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tools/assets/import-authored-art.ts), [v5 inputs](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/starter-art-inputs.ts), [manifest provenance](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/starter-art-manifest.ts), [independent PNG decoder](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/helpers/png-decode.ts), [envelope verification](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/authored-envelope-ledger.test.ts), and [ART-PROVENANCE.md](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/ART-PROVENANCE.md).

Validation:

```text
npm run typecheck:fast
PASS

sg scan
PASS

git diff --check
PASS
```

Because git writes were forbidden, untracked files were checked without `git add -N`:

```bash
while IFS= read -r -d '' file; do
  output=$(git diff --no-index --check /dev/null "$file" 2>&1)
  status=$?
  if [ "$status" -gt 1 ]; then echo "$output"; exit "$status"; fi
done < <(git ls-files --others --exclude-standard -z)
```

Result: pass.

```bash
npm run art:import -- \
  --package art/incoming/01a08cc4-06f0-70ab-86cb-7662bba9f8ba-quietstone-classic \
  --oracle .tmp/runs/quietstone/candidate-rgba-oracle.json \
  --check
```

Result: `verified 58 authored assets`.

```bash
npx vite-node -c /tmp/quietstone-vite.config.mjs \
  tools/assets/generate-starter-art.ts --check
```

Result: `verified 92 starter-art assets and one preview`.

```bash
npx vitest run --configLoader runner \
  tests/unit/assets/*.test.ts \
  tests/unit/source-is-greppable.test.ts \
  tests/unit/vtt/board-chrome.test.ts
```

Result: 15 files passed, 239 tests passed.

```bash
npx vite-node -c /tmp/quietstone-vite.config.mjs \
  tools/assets/generate-classic-contact-sheets.ts \
  --out .tmp/runs/quietstone/contact-sheet-lane \
  --iteration 1
```

Result: `1368x2096`.

`vite-node 3.2.4` has no `-e` support, so its equivalent file-based cold measurement was used:

```bash
/usr/bin/time -f 'wall_seconds=%e max_rss_kb=%M' \
  npx vite-node -c /tmp/quietstone-vite.config.mjs \
  /tmp/quietstone-import-timing.ts
```

Result:

```text
starter-art-resolver cold import: 262.699 ms
wall_seconds=0.65 max_rss_kb=142592
```

Changed expectations and stronger replacements:

- Material response lookup now unwraps authored recipes and checks `MATERIAL_RESPONSES[recipe.family.material]`.
- The single-file fixed-input assertion became a canonical length-framed graph assertion, with byte-mutation, module-omission, and ID-remapping negative controls.
- The generic “not external” provenance assertion became an exact `{procedural, authored}` union, unchanged creator-set assertion, and 58 request/license/dimensions/`redoOf` checks.
- Token recipe-kind assertions now inspect the retained family recipe, preserving side validation and explicitly asserting generic-PC → fighter and untyped-monster → brute.
- The v4 generator literals became the exact v5 literals.
- The source predicate now permits only the two source variants and is paired with exact union/provenance assertions.
- The 58 output pins, preview pin, and fixed-input pin are paired with independent raw-RGBA checks over rendered, committed, and preview-embedded PNGs. All 34 old procedural pins are independently asserted unchanged.

No procedural threshold was lowered.

Verbatim ledger data from [authored-envelope-ledger.ts](/home/vagrant/PhpstormProjects/dnd-wt-quietstone/tests/unit/assets/authored-envelope-ledger.ts):

```ts
export const AUTHORED_COLOR_ENVELOPE = [{id:'art.token.pc.fighter.v1',colors:42},{id:'art.token.pc.cleric.v1',colors:49},{id:'art.token.pc.wizard.v1',colors:49},{id:'art.token.pc.rogue.v1',colors:32},{id:'art.token.monster.goblin-warrior.v1',colors:45},{id:'art.token.monster.hobgoblin-warrior.v1',colors:41},{id:'art.token.monster.bandit-captain.v1',colors:47},{id:'art.token.monster.ogre.v1',colors:34},{id:'art.token.monster.priest-acolyte.v1',colors:48},{id:'art.token.monster.priest.v1',colors:47},{id:'art.token.monster.skeleton.v1',colors:42},{id:'art.token.monster.zombie.v1',colors:28},{id:'art.token.monster.wolf.v1',colors:31},{id:'art.token.party.fighter.v1',colors:42},{id:'art.token.party.wizard.v1',colors:49},{id:'art.token.party.cleric.v1',colors:49},{id:'art.token.party.rogue.v1',colors:32},{id:'art.token.party.ranger.v1',colors:34},{id:'art.token.party.brute.v1',colors:34},{id:'art.token.party.beast.v1',colors:31},{id:'art.token.party.undead.v1',colors:43},{id:'art.token.foe.fighter.v1',colors:42},{id:'art.token.foe.wizard.v1',colors:46},{id:'art.token.foe.cleric.v1',colors:47},{id:'art.token.foe.rogue.v1',colors:32},{id:'art.token.foe.ranger.v1',colors:34},{id:'art.token.foe.brute.v1',colors:34},{id:'art.token.foe.beast.v1',colors:31},{id:'art.token.foe.undead.v1',colors:42}] as const;

export const AUTHORED_NATIVE_DETAIL_ENVELOPE = [{id:'art.map.floor.stone.v1',changed:96,opaque:16384},{id:'art.map.floor.stone-1.v1',changed:336,opaque:16384},{id:'art.map.floor.stone-2.v1',changed:36,opaque:16384},{id:'art.map.floor.stone-3.v1',changed:362,opaque:16384},{id:'art.map.wall.stone.v1',changed:402,opaque:16384},{id:'art.map.wall.stone-s.v1',changed:502,opaque:16384},{id:'art.map.wall.stone-w.v1',changed:471,opaque:16384},{id:'art.map.wall.stone-e.v1',changed:500,opaque:16384},{id:'art.map.wall.stone-nw.v1',changed:499,opaque:16384},{id:'art.map.wall.stone-ne.v1',changed:502,opaque:16384},{id:'art.map.wall.stone-sw.v1',changed:502,opaque:16384},{id:'art.map.wall.stone-se.v1',changed:502,opaque:16384},{id:'art.map.door.wood.v1',changed:143,opaque:16384},{id:'art.map.door.wood-s.v1',changed:141,opaque:16384},{id:'art.map.door.wood-w.v1',changed:145,opaque:16384},{id:'art.map.door.wood-e.v1',changed:145,opaque:16384},{id:'art.map.door.wood-open-n.v1',changed:133,opaque:16384},{id:'art.map.door.wood-open-s.v1',changed:131,opaque:16384},{id:'art.map.door.wood-open-w.v1',changed:135,opaque:16384},{id:'art.map.door.wood-open-e.v1',changed:135,opaque:16384}] as const;

export const PALETTE_TWIN_IDS = ['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','moss0-neutral0','cloth-warm5-skin3','cloth-warm6-skin4'] as const;

export const AUTHORED_PALETTE_TWIN_ENVELOPE = [{id:'art.token.pc.fighter.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.pc.cleric.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.pc.wizard.v1',pairs:['stone1-metal0','stone2-metal1','cloth-warm6-skin4','cloth-warm5-skin3','wood0-earth0']},{id:'art.token.pc.rogue.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.monster.goblin-warrior.v1',pairs:['moss0-neutral0','stone1-metal0','wood0-earth0','cloth-warm6-skin4','stone3-metal2']},{id:'art.token.monster.hobgoblin-warrior.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.monster.bandit-captain.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.monster.ogre.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.monster.priest-acolyte.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.monster.priest.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.monster.skeleton.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','cloth-warm6-skin4']},{id:'art.token.monster.zombie.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0']},{id:'art.token.monster.wolf.v1',pairs:['stone1-metal0','stone2-metal1']},{id:'art.token.party.fighter.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.party.wizard.v1',pairs:['stone1-metal0','stone2-metal1','cloth-warm6-skin4','cloth-warm5-skin3','wood0-earth0']},{id:'art.token.party.cleric.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.party.rogue.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.party.ranger.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.party.brute.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.party.beast.v1',pairs:['stone1-metal0','stone2-metal1']},{id:'art.token.party.undead.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','cloth-warm6-skin4']},{id:'art.token.foe.fighter.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.foe.wizard.v1',pairs:['stone1-metal0','stone2-metal1','cloth-warm6-skin4','cloth-warm5-skin3','wood0-earth0']},{id:'art.token.foe.cleric.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.foe.rogue.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.foe.ranger.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.foe.brute.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.foe.beast.v1',pairs:['stone1-metal0','stone2-metal1']},{id:'art.token.foe.undead.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','cloth-warm6-skin4']},{id:'art.map.door.wood.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-s.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-w.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-e.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-n.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-s.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-w.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-e.v1',pairs:['stone2-metal1']}];

export const AUTHORED_SILHOUETTE_ENVELOPE = [
  { pair: ['cleric', 'undead'], minimum: 0.011284722222222224 },
  { pair: ['cleric', 'beast'], minimum: 0.011835007440476187 },
] as const;

export const AUTHORED_LIGHT_DIRECTION_ENVELOPE = [
  { id: 'art.terrain.pillar.v1', outcome: { kind: 'centroids', highlight: 126, shadow: 126 } },
  { id: 'art.terrain.rubble.v1', outcome: { kind: 'no_shadow_pixels', highlightPixels: 207 } },
  { id: 'art.terrain.crate.v1', outcome: { kind: 'no_highlight_no_shadow' } },
] as const;
```

QUIETSTONE INTEGRATE DONE
diff --git a//tmp/inspect-quietstone.ts b//tmp/inspect-quietstone.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d8b133be9f72eef20e6530c85567536ed517ee57
--- /dev/null
+++ b//tmp/inspect-quietstone.ts
@@ -0,0 +1,8 @@
+import { STARTER_ART_INPUTS } from '/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/starter-art-inputs';
+import { paintRecipe } from '/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/pixel-art';
+for (const input of STARTER_ART_INPUTS) {
+  if (input.recipe.kind === 'authored' && input.recipe.family.kind === 'token') {
+    const bitmap = paintRecipe(input.recipe);
+    console.log(input.id, [50, 64, 72, 80].map((x) => bitmap.get(x, 110)));
+  }
+}
diff --git a//tmp/quietstone-import-timing.ts b//tmp/quietstone-import-timing.ts
new file mode 100644
index 0000000000000000000000000000000000000000..8d1168995110edde4cf71e936e36bcdcdc22c5b2
--- /dev/null
+++ b//tmp/quietstone-import-timing.ts
@@ -0,0 +1,3 @@
+const started = performance.now();
+await import('/home/vagrant/PhpstormProjects/dnd-wt-quietstone/src/assets/starter-art-resolver.ts');
+process.stdout.write(`starter-art-resolver cold import: ${(performance.now() - started).toFixed(3)} ms\n`);
diff --git a//tmp/quietstone-vite.config.mjs b//tmp/quietstone-vite.config.mjs
new file mode 100644
index 0000000000000000000000000000000000000000..ff8b4c56321a3362fc00224b01800f62466f9a1f
--- /dev/null
+++ b//tmp/quietstone-vite.config.mjs
@@ -0,0 +1 @@
+export default {};
diff --git a/ART-PROVENANCE.md b/ART-PROVENANCE.md
index ea9900b03d8b3318992ab0c24ad2a82cac017c11..57c5cc2e38844ac0c11d54e4dcd79a9427ee535d
--- a/ART-PROVENANCE.md
+++ b/ART-PROVENANCE.md
@@ -1,8 +1,8 @@
 # Art licensing and provenance
 
-The generated art in this repository is created by this repository's own code
+The procedural art in this repository is created by this repository's own code
 from written design principles. No third-party sprites, tiles, palettes, fonts,
-or images were used or copied.
+or images were used or copied in that procedural asset class.
 
 Those principles were produced through a clean-room process. People gathering
 research kept their notes separate from the people who wrote the implementation
@@ -22,3 +22,93 @@
 Commons Attribution 4.0 International and keeps its existing attribution and
 source records. The CC0 dedication for generated art does not change the
 licensing of either the code or that content.
+
+## Quietstone authored pixel art (provisional branch evaluation)
+
+Package `01a08cc4-06f0-70ab-86cb-7662bba9f8ba`, batch
+`redo-starter-art-v1`, contributes 58 reauthored 128×128 assets. The tracked
+request ids are the `01a0846b-*` ids recorded per asset in
+`src/assets/authored/` and in the starter-art manifest. Their authored
+contribution is dedicated under CC0 1.0 Universal by the repository
+contributors. Google Gemini was used through the browser with the visible
+“Pro” selector to make a reference sheet; that tool identity is not a claim of
+authorship or contributor attribution. The conversation is
+`https://gemini.google.com/app/c5541df973762435`. The image service's terms
+have not been reviewed and no claim is made that those terms are resolved.
+
+The submitted terrain prompt was:
+
+> Using the attached CURRENT board and current asset contact sheet as functional context, generate a polished ORIGINAL pixel-art TERRAIN concept comparison sheet, three horizontal rows of cohesive art package options for a CLASSIC TOP-DOWN tactical dungeon board. Upgrade their beauty while preserving readability. Every terrain object is viewed vertically down in strict orthographic PLAN VIEW: no isometric sides, front elevations, horizon or standing-door illustration. Each row contains: quiet seamless stone floor patch, thick wall TOP turning a right-angle corner, wooden door leaf CLOSED across a threshold and the same leaf swung OPEN from ABOVE, square cross-braced crate LID, circular pillar CAP, jagged rubble. Row 1 Quietstone: desaturated blue-grey slate, warm oak, broad clean clusters and very sparse low-contrast floor marks. Row 2 Ashvault: charcoal basalt, pale limestone caps, restrained bronze fittings. Row 3 Sandcrypt: neutral pale sandstone, weathered walnut, muted moss accents. All three: beautiful modern retro 16-bit-inspired original fantasy pixel art, confident dark outlines on objects, large readable pixel clusters, 3-4 stepped values per material, top-left light. Floor contrast extremely low: no dark floor borders or painted grid. Wall mass clearly differs from floor. Open door has a wide empty aperture. No characters, labels, text or frame. Generous pure magenta #FF00FF background separating objects; magenta never occurs inside an object. Keep dark outlines intact. I will creatively reauthor these into exact 128x128 tiles; prioritize room boundary, then actors, then tactical marks, with floor texture last. Do not depict any third-party game, franchise or identifiable proprietary design.
+
+Portraits use an earlier magenta Emberkeep sheet as their source. The exact
+earlier prompt, model, and date could not be reconstructed; that remains an
+explicit promotion criterion for the owner. Fiend, ooze, and construct busts
+were drawn locally. Recorded reference-source SHA-256 values are:
+
+- `25a6fe124ff3db3e9159bcf8e8fe57a1999288e9f50e05906a50ab023eca2d6a`
+- `febd79b10a9ba7b5b7d7e28552ad0c9d5e485125b841b11093c5ee3d8419855d`
+- `d1c7c446f83d09bceb065f4c9b45bebe7b9e7a08ac05672b7c610b4b4ec94a2b`
+- `e1cc4a5b04e564890c5e0a9e15dfcb7d7e82c94d160e4f61d1356065a74e4277`
+- `714bdca0c430517882144b1d8cdbc61ce7e762f26790c97043e5330765da94e9`
+- `ae31edec292447522e2b87d759d400e2ffe5584304260f4889c501313e1fe9b1`
+
+The 58 request ids are:
+
+- `01a0846b-2ddd-74cd-baa4-78bd5e16cafc`
+- `01a0846b-2df6-7ac1-976b-40ecd92fddb8`
+- `01a0846b-2e0c-76bb-a375-efdd66541add`
+- `01a0846b-2e22-7d50-98f6-495b885d1aed`
+- `01a0846b-2e3e-7e2e-b974-59165601e412`
+- `01a0846b-2e56-79a1-8630-59b556e8e0e3`
+- `01a0846b-2e6c-7ba0-94ea-c01fd5158bfd`
+- `01a0846b-2e84-7bdb-944b-4d8bc6b0f55e`
+- `01a0846b-2e9b-7267-8a6c-34c8244b2c61`
+- `01a0846b-2eb1-704e-8d6f-4010df0796f4`
+- `01a0846b-2ec8-7115-86c3-94cab8538ec5`
+- `01a0846b-2ede-780c-9ddd-c9ac94c6c486`
+- `01a0846b-2ef6-7c21-92c8-2a7e8897b0bf`
+- `01a0846b-2f0e-71e7-bf1a-77fc942d91f1`
+- `01a0846b-2f24-7500-9530-72dab1d61687`
+- `01a0846b-2f3e-7e13-a815-4aa36f7437bb`
+- `01a0846b-2f5b-79b7-a067-084885059093`
+- `01a0846b-2f77-7e3d-93eb-2e9eb2367d82`
+- `01a0846b-2f8e-7577-bc3c-5cb0789afdb8`
+- `01a0846b-2fa3-723a-b1d5-bce570d1dfcf`
+- `01a0846b-2fb9-7dc6-b082-ff60f09533df`
+- `01a0846b-2fd1-7204-a765-95d1e49ba6f8`
+- `01a0846b-2fe8-7dfd-a559-a63da1a92d96`
+- `01a0846b-2ffd-7d6c-8fc4-81c13a0abe1b`
+- `01a0846b-3015-7c46-859d-b416fddf7ffa`
+- `01a0846b-302a-7b05-8293-aac83a4617d1`
+- `01a0846b-3040-7fc4-8aae-e03e3a61494e`
+- `01a0846b-3057-734e-b584-99eb7cbae772`
+- `01a0846b-306d-7242-86fc-a9230a5c41fd`
+- `01a0846b-3082-713c-bc3a-ff945f2e5ca6`
+- `01a0846b-3097-7f89-9c84-29ad22ef7d5f`
+- `01a0846b-30ac-728f-ad56-e221b9aa1cb1`
+- `01a0846b-30c2-7a5d-8c22-c90f41febfce`
+- `01a0846b-30d6-70b9-856e-c771162d3cb9`
+- `01a0846b-30ec-7562-a637-01db060a56e7`
+- `01a0846b-3116-7111-adf5-030d8e8b8e8e`
+- `01a0846b-312b-731d-9fb9-3f17c694c8cd`
+- `01a0846b-3140-78a2-b926-dad09cb2f8d0`
+- `01a0846b-3154-78fb-9ab7-ca68b2fdd4dd`
+- `01a0846b-316a-7fdd-b7f6-2b1213e9cf4d`
+- `01a0846b-317f-721f-81fa-63d8d88de8d4`
+- `01a0846b-3197-7b9f-8c74-435d35e487f4`
+- `01a0846b-31b3-7457-828a-e0ac118e1531`
+- `01a0846b-31ca-7821-9ea7-ef8a2e326e74`
+- `01a0846b-31e0-7eeb-814c-feabb3ac94b2`
+- `01a0846b-31f8-77c8-b4f9-60bb2ecfc27f`
+- `01a0846b-3212-7fb8-81da-620f3d8cd63b`
+- `01a0846b-322f-7a90-967a-da70bed925db`
+- `01a0846b-3249-7c45-bb18-e8a1d311bb05`
+- `01a0846b-3264-7fd7-9eb8-e7f8b2b55e73`
+- `01a0846b-327f-72a5-867c-2d1b9e35c4cd`
+- `01a0846b-3297-7d57-b509-0a1976964637`
+- `01a0846b-32b2-7143-9a67-c17e3fa56358`
+- `01a0846b-32cf-7599-b7d0-e5b733d64990`
+- `01a0846b-32e6-7309-aeb9-0c68f1ef252f`
+- `01a0846b-353d-7d72-8c61-9bea82d93502`
+- `01a0846b-3551-7341-a47c-0496f006c54e`
+- `01a0846b-3568-7e0a-a837-01d3d75a1b53`
diff --git a/package.json b/package.json
index 2ebd7d34ef5fec64c9d44ddb2cfd4e2104981816..d9c9a553c4de6bcd7f02d93e3dd660731fbb0d29
--- a/package.json
+++ b/package.json
@@ -37,6 +37,7 @@
     "schema:content-pack": "vite-node tools/generate-content-pack-schema.ts",
     "schema:engine-mcp": "vite-node tools/generate-engine-mcp-schemas.ts",
     "attribute:round-input": "vite-node tools/attribute-round-input.ts --",
+    "art:import": "tsx tools/assets/import-authored-art.ts --",
     "rl:extract-sft": "vite-node tools/rl/extract-sft.ts --",
     "rl:generate-data": "vite-node tools/rl/generate-data.ts --"
   },
diff --git a/src/assets/authored/art.ts b/src/assets/authored/art.ts
new file mode 100644
index 0000000000000000000000000000000000000000..95a823a03f7cf93296d071aea7c48ad1862f73af
--- /dev/null
+++ b/src/assets/authored/art.ts
@@ -0,0 +1,110 @@
+import { Bitmap } from '../bitmap';
+import { assetId, type AssetId } from '../ids';
+import {
+  NEUTRAL_STEPS,
+  PALETTE_RAMPS,
+  RAMP_STEPS,
+  paletteRgb,
+  type PaletteColorRef,
+} from '../palette';
+
+export interface AuthoredPixelArt {
+  readonly id: AssetId;
+  readonly requestId: string;
+  readonly packageId: string;
+  readonly svgSha256: string;
+  readonly pngSha256: string;
+  readonly rows: readonly string[];
+  readonly data: Uint8Array;
+}
+
+export interface AuthoredPixelArtSource {
+  readonly id: string;
+  readonly requestId: string;
+  readonly packageId: string;
+  readonly svgSha256: string;
+  readonly pngSha256: string;
+  readonly rows: readonly string[];
+}
+
+const RAMP_BY_CODE = Object.freeze({
+  s: 'stone',
+  w: 'wood',
+  e: 'earth',
+  m: 'moss',
+  W: 'cloth-warm',
+  C: 'cloth-cool',
+  M: 'metal',
+  k: 'skin',
+  n: 'neutral',
+} as const);
+
+function decodeColor(code: string, step: number): PaletteColorRef {
+  const ramp = RAMP_BY_CODE[code as keyof typeof RAMP_BY_CODE];
+  if (ramp === undefined) throw new Error(`Unknown authored-art ramp code ${code}.`);
+  if (ramp === 'neutral') {
+    if (!NEUTRAL_STEPS.includes(step as (typeof NEUTRAL_STEPS)[number])) {
+      throw new Error(`Invalid neutral step ${String(step)}.`);
+    }
+    return { ramp, step: step as (typeof NEUTRAL_STEPS)[number] };
+  }
+  if (!PALETTE_RAMPS.includes(ramp) || !RAMP_STEPS.includes(step as (typeof RAMP_STEPS)[number])) {
+    throw new Error(`Invalid ${ramp} step ${String(step)}.`);
+  }
+  return { ramp, step: step as (typeof RAMP_STEPS)[number] };
+}
+
+function decodeRows(rows: readonly string[]): Uint8Array {
+  if (rows.length !== 128) throw new Error(`Authored art must contain 128 rows, received ${String(rows.length)}.`);
+  const data = new Uint8Array(128 * 128 * 4);
+  for (const [y, row] of rows.entries()) {
+    let x = 0;
+    for (const token of row.split(' ')) {
+      const transparent = /^\.(\d+)$/u.exec(token);
+      const painted = /^([swemWCMkn])(\d)(h?)x(\d+)$/u.exec(token);
+      if (transparent !== null) {
+        const length = Number(transparent[1]);
+        if (!Number.isSafeInteger(length) || length < 1) throw new Error(`Invalid transparent run ${token}.`);
+        x += length;
+        continue;
+      }
+      if (painted === null) throw new Error(`Invalid authored-art run ${token}.`);
+      const length = Number(painted[4]);
+      if (!Number.isSafeInteger(length) || length < 1 || x + length > 128) {
+        throw new Error(`Invalid authored-art run length ${token}.`);
+      }
+      const color = decodeColor(painted[1]!, Number(painted[2]));
+      const alpha = painted[3] === 'h' ? 128 : 255;
+      if (alpha === 128 && !(color.ramp === 'neutral' && color.step === 1)) {
+        throw new Error('Half-alpha authored pixels must use neutral step 1.');
+      }
+      const rgb = paletteRgb(color);
+      for (let offset = 0; offset < length; offset += 1) {
+        const index = (y * 128 + x + offset) * 4;
+        data[index] = rgb.red;
+        data[index + 1] = rgb.green;
+        data[index + 2] = rgb.blue;
+        data[index + 3] = alpha;
+      }
+      x += length;
+    }
+    if (x !== 128) throw new Error(`Authored-art row ${String(y)} sums to ${String(x)}, not 128.`);
+  }
+  return data;
+}
+
+export function authoredArt(source: AuthoredPixelArtSource): AuthoredPixelArt {
+  const art: AuthoredPixelArt = {
+    ...source,
+    id: assetId(source.id),
+    rows: Object.freeze([...source.rows]),
+    data: decodeRows(source.rows),
+  };
+  return Object.freeze(art);
+}
+
+export function paintAuthoredArt(art: AuthoredPixelArt): Bitmap {
+  const bitmap = new Bitmap(128, 128);
+  bitmap.data.set(art.data);
+  return bitmap;
+}
diff --git a/src/assets/pixel-art.ts b/src/assets/pixel-art.ts
index 5f96d36f451b2ab053f25e21af9d67c4184a2ad1..f36e3d0d04a88dff9c2c2f3ebecc0fc8655697ea
--- a/src/assets/pixel-art.ts
+++ b/src/assets/pixel-art.ts
@@ -22,6 +22,7 @@
 } from './palette';
 import { outlineRows, type PixelMark } from './pixel-mark';
 import { encodePng } from './png';
+import { paintAuthoredArt, type AuthoredPixelArt } from './authored/art';
 
 export const TILE_SIZE = 128;
 export const WALL_PIECES = [
@@ -251,7 +252,7 @@
       readonly material: 'semantic';
       readonly object: 'hazard';
     };
-export type ArtRecipe =
+export type ProceduralArtRecipe =
   | {
       readonly kind: 'floor';
       readonly material: 'stone';
@@ -292,6 +293,11 @@
     }
   | TokenRecipe
   | { readonly kind: 'token-dead'; readonly material: 'bone' };
+export type ArtRecipe = ProceduralArtRecipe | {
+  readonly kind: 'authored';
+  readonly family: ProceduralArtRecipe;
+  readonly art: AuthoredPixelArt;
+};
 
 export function terrainRecipe(object: TerrainObject): TerrainRecipe {
   switch (object) {
@@ -1666,7 +1672,7 @@
   composite(bitmap, layer);
 }
 
-function recipeMaterialRamp(recipe: ArtRecipe): PaletteRamp | 'neutral' | null {
+function recipeMaterialRamp(recipe: ProceduralArtRecipe): PaletteRamp | 'neutral' | null {
   switch (recipe.kind) {
     case 'floor':
     case 'wall':
@@ -2127,6 +2133,7 @@
   recipe: ArtRecipe,
   overrides: MaterialResponseOverrides = {},
 ): Bitmap {
+  if (recipe.kind === 'authored') return paintAuthoredArt(recipe.art);
   const response =
     overrides[recipe.material] ?? MATERIAL_RESPONSES[recipe.material];
   const bitmap = new Bitmap(TILE_SIZE, TILE_SIZE);
diff --git a/src/assets/starter-art-inputs.ts b/src/assets/starter-art-inputs.ts
index 7f92047e3f9692dbb9db6f96c5eb68f09c17c09d..be9eac8a9d1759a0dea745f6feb836d20d12293c
--- a/src/assets/starter-art-inputs.ts
+++ b/src/assets/starter-art-inputs.ts
@@ -1,4 +1,5 @@
 import { assetId, type AssetId } from './ids';
+import { AUTHORED_ART_BY_ID, AUTHORED_ART_IDS } from './authored';
 import {
   BAND_SIDES,
   DOOR_STATES,
@@ -10,6 +11,7 @@
   TOKEN_SIDES,
   WALL_PIECES,
   type ArtRecipe,
+  type ProceduralArtRecipe,
   type TokenArchetype,
   type TokenSide,
   terrainRecipe,
@@ -18,8 +20,8 @@
 
 export const STARTER_ART_GENERATOR_ID = 'starter-pixel-art' as const;
 /** Native 128×128 recipes with typed material response and directional light. */
-export const STARTER_ART_GENERATOR_VERSION = '4.0.0' as const;
-export const STARTER_ART_INPUT_SET_ID = 'starter-art-inputs-v4' as const;
+export const STARTER_ART_GENERATOR_VERSION = '5.0.0' as const;
+export const STARTER_ART_INPUT_SET_ID = 'starter-art-inputs-v5' as const;
 
 export type StarterArtKind =
   | 'token'
@@ -137,7 +139,7 @@
 
 const deadToken = input(DEAD_TOKEN_ASSET_ID, 'Prone silhouette on a desaturated plate', 'token', { kind: 'token-dead', material: 'bone' });
 
-export const STARTER_ART_INPUTS: readonly StarterArtInput[] = Object.freeze([
+const PROCEDURAL_STARTER_ART_INPUTS: readonly StarterArtInput[] = Object.freeze([
   ...namedTokens,
   ...archetypeTokens,
   deadToken,
@@ -151,5 +153,23 @@
   ...ui,
 ]);
 
+export const STARTER_ART_INPUTS: readonly StarterArtInput[] = Object.freeze(
+  PROCEDURAL_STARTER_ART_INPUTS.map((entry) => {
+    const art = AUTHORED_ART_BY_ID.get(entry.id);
+    if (art === undefined) return entry;
+    return Object.freeze({
+      ...entry,
+      recipe: { kind: 'authored', family: entry.recipe as ProceduralArtRecipe, art } as const,
+    });
+  }),
+);
+
+const authoredInputIds = STARTER_ART_INPUTS
+  .filter((entry) => entry.recipe.kind === 'authored')
+  .map((entry) => String(entry.id));
+if (authoredInputIds.length !== AUTHORED_ART_IDS.length || authoredInputIds.some((id, index) => id !== AUTHORED_ART_IDS[index])) {
+  throw new Error('Authored-art registry and starter-art inputs must have identical ordered coverage.');
+}
+
 export const STARTER_ART_INPUTS_BY_ID: ReadonlyMap<AssetId, StarterArtInput> =
   new Map(STARTER_ART_INPUTS.map((entry) => [entry.id, entry] as const));
diff --git a/src/assets/starter-art-manifest.ts b/src/assets/starter-art-manifest.ts
index 77518656b8b6e464be5f3f6553f75057b752ff41..f21af0811934f5c3a1c461b54808c665cff39282
--- a/src/assets/starter-art-manifest.ts
+++ b/src/assets/starter-art-manifest.ts
@@ -30,22 +30,40 @@
   bundledLicenseOutput: z.literal('LICENSE-ART'),
 });
 
+const proceduralSourceSchema = z.strictObject({
+  type: z.literal('procedural'),
+  creator: z.literal(STARTER_ART_CREATOR),
+  collectionTitle: z.literal(STARTER_ART_TITLE),
+  generatorId: z.literal(STARTER_ART_GENERATOR_ID),
+  generatorVersion: z.literal(STARTER_ART_GENERATOR_VERSION),
+  inputSetId: z.literal(STARTER_ART_INPUT_SET_ID),
+  inputId: assetIdSchema,
+  fixedInputsSha256: sha256Schema,
+});
+
+const authoredSourceSchema = z.strictObject({
+  type: z.literal('authored'),
+  creator: z.literal(STARTER_ART_CREATOR),
+  inputId: assetIdSchema,
+  requestId: z.string().uuid(),
+  packageId: z.string().uuid(),
+  svgSha256: sha256Schema,
+  pngSha256: sha256Schema,
+  reference: z.strictObject({
+    kind: z.literal('image-model-reference-reauthored'),
+    tool: z.literal('Google Gemini (browser, "Pro" selector)'),
+    conversation: z.string().url(),
+    sourceSha256: z.array(sha256Schema).min(1),
+  }),
+});
+
 const artManifestAssetSchema = z.strictObject({
   id: assetIdSchema,
   title: z.string().min(1),
   kind: z.enum(['token', 'map', 'terrain', 'fog', 'focus', 'event']),
   license: artLicenseSchema,
   attributionText: z.literal(STARTER_ART_ATTRIBUTION),
-  source: z.strictObject({
-    type: z.literal('procedural'),
-    creator: z.literal(STARTER_ART_CREATOR),
-    collectionTitle: z.literal(STARTER_ART_TITLE),
-    generatorId: z.literal(STARTER_ART_GENERATOR_ID),
-    generatorVersion: z.literal(STARTER_ART_GENERATOR_VERSION),
-    inputSetId: z.literal(STARTER_ART_INPUT_SET_ID),
-    inputId: assetIdSchema,
-    fixedInputsSha256: sha256Schema,
-  }),
+  source: z.discriminatedUnion('type', [proceduralSourceSchema, authoredSourceSchema]),
   output: z.strictObject({
     path: outputPathSchema,
     mediaType: z.literal('image/png'),
@@ -85,7 +103,7 @@
 export type ArtManifest = z.infer<typeof artManifestSchema>;
 export type ArtManifestAsset = ArtManifest['assets'][number];
 
-/** sha256 of src/assets/starter-art-inputs.ts; the fixed-input identity of this manifest. */
+/** Canonical length-framed sha256 of the v5 input registry and authored modules. */
 export const FIXED_INPUTS_SHA256 = STARTER_ART_OUTPUT_SHA256.fixedInputs;
 
 /** `art.token.pc.fighter.v1` → `assets/art/token-pc-fighter-v1.png`. */
@@ -117,8 +135,29 @@
         bundledLicenseOutput: 'LICENSE-ART',
       },
       attributionText: STARTER_ART_ATTRIBUTION,
-      source: {
-        type: 'procedural',
+      source: entry.recipe.kind === 'authored' ? {
+        type: 'authored' as const,
+        creator: STARTER_ART_CREATOR,
+        inputId: entry.id,
+        requestId: entry.recipe.art.requestId,
+        packageId: entry.recipe.art.packageId,
+        svgSha256: entry.recipe.art.svgSha256,
+        pngSha256: entry.recipe.art.pngSha256,
+        reference: {
+          kind: 'image-model-reference-reauthored' as const,
+          tool: 'Google Gemini (browser, "Pro" selector)' as const,
+          conversation: 'https://gemini.google.com/app/c5541df973762435',
+          sourceSha256: [
+            '25a6fe124ff3db3e9159bcf8e8fe57a1999288e9f50e05906a50ab023eca2d6a',
+            'febd79b10a9ba7b5b7d7e28552ad0c9d5e485125b841b11093c5ee3d8419855d',
+            'd1c7c446f83d09bceb065f4c9b45bebe7b9e7a08ac05672b7c610b4b4ec94a2b',
+            'e1cc4a5b04e564890c5e0a9e15dfcb7d7e82c94d160e4f61d1356065a74e4277',
+            '714bdca0c430517882144b1d8cdbc61ce7e762f26790c97043e5330765da94e9',
+            'ae31edec292447522e2b87d759d400e2ffe5584304260f4889c501313e1fe9b1',
+          ],
+        },
+      } : {
+        type: 'procedural' as const,
         creator: STARTER_ART_CREATOR,
         collectionTitle: STARTER_ART_TITLE,
         generatorId: STARTER_ART_GENERATOR_ID,
diff --git a/tests/fixtures/authored-art/alpha.expected.ts b/tests/fixtures/authored-art/alpha.expected.ts
new file mode 100644
index 0000000000000000000000000000000000000000..a528ce2bb51fe618154a8e1752f7ddfe3e4baaa4
--- /dev/null
+++ b/tests/fixtures/authored-art/alpha.expected.ts
@@ -0,0 +1,140 @@
+/* Generated by tools/assets/import-authored-art.ts. Do not edit. */
+import { authoredArt } from './art';
+
+export const art = authoredArt({
+  id: 'art.fixture.alpha.v1',
+  requestId: '00000000-0000-4000-8000-000000000002',
+  packageId: '00000000-0000-4000-8000-000000000000',
+  svgSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
+  pngSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
+  rows: [
+    'n1hx4 .124',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+  ],
+});
diff --git a/tests/fixtures/authored-art/alpha.svg b/tests/fixtures/authored-art/alpha.svg
new file mode 100644
index 0000000000000000000000000000000000000000..d2b2dcdd96bb06c431cd741e7dd74d9afcf87727
--- /dev/null
+++ b/tests/fixtures/authored-art/alpha.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>alpha</title><desc>fixture</desc><rect x="0" y="0" width="4" height="1" fill="#2a2c30" fill-opacity="0.501960784314" /></svg>
diff --git a/tests/fixtures/authored-art/art.ts b/tests/fixtures/authored-art/art.ts
new file mode 100644
index 0000000000000000000000000000000000000000..adb1ae681da041dcadfe21bddd970a81479f2db0
--- /dev/null
+++ b/tests/fixtures/authored-art/art.ts
@@ -0,0 +1 @@
+export { authoredArt } from '../../../src/assets/authored/art';
diff --git a/tests/fixtures/authored-art/bad-opacity.svg b/tests/fixtures/authored-art/bad-opacity.svg
new file mode 100644
index 0000000000000000000000000000000000000000..fb79e001d6bdf2d0ac48a83564b5b90c9ee5379f
--- /dev/null
+++ b/tests/fixtures/authored-art/bad-opacity.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>bad</title><desc>fixture</desc><rect x="0" y="0" width="1" height="1" fill="#2a2c30" fill-opacity="0.5" /></svg>
diff --git a/tests/fixtures/authored-art/basic.expected.ts b/tests/fixtures/authored-art/basic.expected.ts
new file mode 100644
index 0000000000000000000000000000000000000000..6a9ff384b8e8658450a4eea69c7b45aa1774afbf
--- /dev/null
+++ b/tests/fixtures/authored-art/basic.expected.ts
@@ -0,0 +1,140 @@
+/* Generated by tools/assets/import-authored-art.ts. Do not edit. */
+import { authoredArt } from './art';
+
+export const art = authoredArt({
+  id: 'art.fixture.basic.v1',
+  requestId: '00000000-0000-4000-8000-000000000001',
+  packageId: '00000000-0000-4000-8000-000000000000',
+  svgSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
+  pngSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
+  rows: [
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+    's3x128',
+  ],
+});
diff --git a/tests/fixtures/authored-art/basic.svg b/tests/fixtures/authored-art/basic.svg
new file mode 100644
index 0000000000000000000000000000000000000000..f49894fbf0d754cab3bf1e8e9c0ae7ac216af0ab
--- /dev/null
+++ b/tests/fixtures/authored-art/basic.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>basic</title><desc>fixture</desc><rect x="0" y="0" width="128" height="128" fill="#6a7381" /></svg>
diff --git a/tests/fixtures/authored-art/empty.expected.ts b/tests/fixtures/authored-art/empty.expected.ts
new file mode 100644
index 0000000000000000000000000000000000000000..2b0001813b440b8d5a3b87218c2c76a28ea963ac
--- /dev/null
+++ b/tests/fixtures/authored-art/empty.expected.ts
@@ -0,0 +1,140 @@
+/* Generated by tools/assets/import-authored-art.ts. Do not edit. */
+import { authoredArt } from './art';
+
+export const art = authoredArt({
+  id: 'art.fixture.empty.v1',
+  requestId: '00000000-0000-4000-8000-000000000003',
+  packageId: '00000000-0000-4000-8000-000000000000',
+  svgSha256: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
+  pngSha256: 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
+  rows: [
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+    '.128',
+  ],
+});
diff --git a/tests/fixtures/authored-art/empty.svg b/tests/fixtures/authored-art/empty.svg
new file mode 100644
index 0000000000000000000000000000000000000000..3e09a555a653634376cc44cebe7841993dd63b3a
--- /dev/null
+++ b/tests/fixtures/authored-art/empty.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>empty</title><desc>fixture</desc></svg>
diff --git a/tests/fixtures/authored-art/non-integer.svg b/tests/fixtures/authored-art/non-integer.svg
new file mode 100644
index 0000000000000000000000000000000000000000..a4625451fd878e8b9705caa9eafbd0062c355f75
--- /dev/null
+++ b/tests/fixtures/authored-art/non-integer.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>bad</title><desc>fixture</desc><rect x="0.5" y="0" width="1" height="1" fill="#6a7381" /></svg>
diff --git a/tests/fixtures/authored-art/out-of-bounds.svg b/tests/fixtures/authored-art/out-of-bounds.svg
new file mode 100644
index 0000000000000000000000000000000000000000..2a35e27fc52b397e85e259b413d769a42b5b27e4
--- /dev/null
+++ b/tests/fixtures/authored-art/out-of-bounds.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>bad</title><desc>fixture</desc><rect x="127" y="0" width="2" height="1" fill="#6a7381" /></svg>
diff --git a/tests/fixtures/authored-art/overlap.svg b/tests/fixtures/authored-art/overlap.svg
new file mode 100644
index 0000000000000000000000000000000000000000..e4733d2b6ec832ea3628c145b347767d37aa6b6d
--- /dev/null
+++ b/tests/fixtures/authored-art/overlap.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>bad</title><desc>fixture</desc><rect x="0" y="0" width="2" height="2" fill="#6a7381" /><rect x="1" y="1" width="2" height="2" fill="#6a7381" /></svg>
diff --git a/tests/fixtures/authored-art/unknown-colour.svg b/tests/fixtures/authored-art/unknown-colour.svg
new file mode 100644
index 0000000000000000000000000000000000000000..c045554d9103596504477a063e510e02c0246147
--- /dev/null
+++ b/tests/fixtures/authored-art/unknown-colour.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>bad</title><desc>fixture</desc><rect x="0" y="0" width="1" height="1" fill="#ffffff" /></svg>
diff --git a/tests/fixtures/authored-art/unsupported-element.svg b/tests/fixtures/authored-art/unsupported-element.svg
new file mode 100644
index 0000000000000000000000000000000000000000..6c28428bad8ad36d0c061141ede3e11f896b82d4
--- /dev/null
+++ b/tests/fixtures/authored-art/unsupported-element.svg
@@ -0,0 +1,2 @@
+<?xml version='1.0' encoding='utf-8'?>
+<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges"><title>bad</title><desc>fixture</desc><circle cx="1" cy="1" r="1"/></svg>
diff --git a/tests/helpers/png-decode.ts b/tests/helpers/png-decode.ts
new file mode 100644
index 0000000000000000000000000000000000000000..ba0ae0d7dabdf012ceddb8a35c41b86f6dd7c202
--- /dev/null
+++ b/tests/helpers/png-decode.ts
@@ -0,0 +1,64 @@
+import { inflateSync } from 'node:zlib';
+
+export interface DecodedPng {
+  readonly width: number;
+  readonly height: number;
+  readonly data: Uint8Array;
+}
+
+const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
+
+function paeth(left: number, above: number, upperLeft: number): number {
+  const estimate = left + above - upperLeft;
+  const leftDistance = Math.abs(estimate - left);
+  const aboveDistance = Math.abs(estimate - above);
+  const upperLeftDistance = Math.abs(estimate - upperLeft);
+  return leftDistance <= aboveDistance && leftDistance <= upperLeftDistance
+    ? left : aboveDistance <= upperLeftDistance ? above : upperLeft;
+}
+
+export function decodeRgbaPng(input: Uint8Array): DecodedPng {
+  const bytes = Buffer.from(input);
+  if (!bytes.subarray(0, 8).equals(SIGNATURE)) throw new Error('Invalid PNG signature.');
+  let offset = 8;
+  let width: number | undefined;
+  let height: number | undefined;
+  const idat: Buffer[] = [];
+  while (offset < bytes.length) {
+    if (offset + 12 > bytes.length) throw new Error('Truncated PNG chunk.');
+    const length = bytes.readUInt32BE(offset);
+    const type = bytes.toString('ascii', offset + 4, offset + 8);
+    const data = bytes.subarray(offset + 8, offset + 8 + length);
+    if (data.length !== length) throw new Error('Truncated PNG chunk data.');
+    if (type === 'IHDR') {
+      if (length !== 13) throw new Error('Invalid PNG IHDR length.');
+      width = data.readUInt32BE(0); height = data.readUInt32BE(4);
+      if (data[8] !== 8 || data[9] !== 6 || data[10] !== 0 || data[11] !== 0 || data[12] !== 0) {
+        throw new Error('PNG must be non-interlaced 8-bit RGBA.');
+      }
+    } else if (type === 'IDAT') idat.push(data);
+    else if (type === 'IEND') break;
+    offset += 12 + length;
+  }
+  if (width === undefined || height === undefined || width < 1 || height < 1 || idat.length < 1) throw new Error('PNG is missing required chunks.');
+  const inflated = inflateSync(Buffer.concat(idat));
+  const stride = width * 4;
+  if (inflated.length !== (stride + 1) * height) throw new Error('PNG scanline length is invalid.');
+  const result = new Uint8Array(stride * height);
+  for (let y = 0; y < height; y += 1) {
+    const source = y * (stride + 1);
+    const filter = inflated[source]!;
+    if (filter > 4) throw new Error(`Unsupported PNG filter ${String(filter)}.`);
+    for (let x = 0; x < stride; x += 1) {
+      const raw = inflated[source + 1 + x]!;
+      const target = y * stride + x;
+      const left = x >= 4 ? result[target - 4]! : 0;
+      const above = y > 0 ? result[target - stride]! : 0;
+      const upperLeft = y > 0 && x >= 4 ? result[target - stride - 4]! : 0;
+      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? above
+        : filter === 3 ? Math.floor((left + above) / 2) : paeth(left, above, upperLeft);
+      result[target] = (raw + predictor) & 255;
+    }
+  }
+  return { width, height, data: result };
+}
diff --git a/tests/unit/assets/authored-art-import.test.ts b/tests/unit/assets/authored-art-import.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..6bf90d298c05fa82caf687639da61390ed54dd92
--- /dev/null
+++ b/tests/unit/assets/authored-art-import.test.ts
@@ -0,0 +1,37 @@
+import { join } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { describe, expect, it } from 'vitest';
+import { parseAuthoredSvg, renderAuthoredModule } from '../../../tools/assets/authored-art-import-core';
+import { readFileSync } from '../../helpers/test-filesystem';
+
+const fixtureDirectory = fileURLToPath(new URL('../../fixtures/authored-art/', import.meta.url));
+const fixture = (name: string): string => readFileSync(join(fixtureDirectory, name), 'utf8');
+
+describe('authored-art SVG importer core', () => {
+  for (const [index, name] of ['basic', 'alpha', 'empty'].entries()) {
+    it(`canonically serializes the ${name} fixture`, () => {
+      const parsed = parseAuthoredSvg(fixture(`${name}.svg`));
+      expect(renderAuthoredModule({
+        id: `art.fixture.${name}.v1`,
+        requestId: `00000000-0000-4000-8000-00000000000${String(index + 1)}`,
+        packageId: '00000000-0000-4000-8000-000000000000',
+        svgSha256: 'a'.repeat(64),
+        pngSha256: 'b'.repeat(64),
+        ...parsed,
+      })).toBe(`${fixture(`${name}.expected.ts`).trimEnd()}\n`);
+    });
+  }
+
+  for (const [name, message] of [
+    ['unsupported-element', /unsupported element/u],
+    ['non-integer', /non-negative integer/u],
+    ['out-of-bounds', /outside/u],
+    ['unknown-colour', /Unknown palette colour/u],
+    ['bad-opacity', /Unsupported fill opacity/u],
+    ['overlap', /Overlapping rectangles/u],
+  ] as const) {
+    it(`rejects ${name}`, () => {
+      expect(() => parseAuthoredSvg(fixture(`${name}.svg`))).toThrow(message);
+    });
+  }
+});
diff --git a/tests/unit/assets/authored-art.test.ts b/tests/unit/assets/authored-art.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..d616a62d09284385b27100c9273d4d750e3e425c
--- /dev/null
+++ b/tests/unit/assets/authored-art.test.ts
@@ -0,0 +1,75 @@
+import { createHash } from 'node:crypto';
+import { join } from 'node:path';
+import { fileURLToPath } from 'node:url';
+import { describe, expect, it } from 'vitest';
+import { AUTHORED_ART_BY_ID, AUTHORED_ART_EQUALITY_GROUPS, AUTHORED_ART_IDS } from '../../../src/assets/authored';
+import { assetId } from '../../../src/assets/ids';
+import { paintRecipe } from '../../../src/assets/pixel-art';
+import { renderStarterArtPng } from '../../../src/assets/starter-art-resolver';
+import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
+import { decodeRgbaPng } from '../../helpers/png-decode';
+import { readFileSync, readdirSync } from '../../helpers/test-filesystem';
+import { EXPECTED_STARTER_ART_SHA256 } from './expected-art-hashes';
+import { EXPECTED_AUTHORED_INVENTORY } from './expected-authored-inventory';
+import { EXPECTED_AUTHORED_RGBA_SHA256 } from './expected-authored-rgba';
+import { EXPECTED_PRESERVED_ART_SHA256 } from './expected-preserved-art-hashes';
+
+const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
+const sha256 = (value: Uint8Array): string => createHash('sha256').update(value).digest('hex');
+const preview = readFileSync(join(repositoryRoot, 'src/assets/preview/starter-art-board.svg'), 'utf8');
+const previewImages = new Map(Array.from(preview.matchAll(/<image id="asset-([^"]+)" href="data:image\/png;base64,([^"]+)"/gu), (match) => [match[1]!, match[2]!] as const));
+
+describe('authored starter art', () => {
+  it('matches the frozen external raw-RGBA oracle for all 58 recipes', () => {
+    expect(AUTHORED_ART_IDS).toHaveLength(58);
+    expect(Object.keys(EXPECTED_AUTHORED_RGBA_SHA256)).toHaveLength(58);
+    for (const input of STARTER_ART_INPUTS) {
+      if (input.recipe.kind !== 'authored') continue;
+      expect(sha256(paintRecipe(input.recipe).data), input.id).toBe(EXPECTED_AUTHORED_RGBA_SHA256[input.id]);
+      expect(input.recipe.art.data, `${input.id} decoded cache`).toBe(input.recipe.art.data);
+    }
+  });
+
+  it('keeps all 34 procedural output pins byte-identical to the pre-import revision', () => {
+    expect(Object.keys(EXPECTED_PRESERVED_ART_SHA256)).toHaveLength(34);
+    for (const [id, digest] of Object.entries(EXPECTED_PRESERVED_ART_SHA256)) {
+      expect(EXPECTED_STARTER_ART_SHA256[id], id).toBe(digest);
+    }
+  });
+
+  it('keeps exactly the eight declared equality groups and no undeclared equal pair', () => {
+    expect(AUTHORED_ART_EQUALITY_GROUPS).toHaveLength(8);
+    const byDigest = new Map<string, string[]>();
+    for (const [id, row] of Object.entries(EXPECTED_AUTHORED_INVENTORY)) {
+      byDigest.set(row.rgbaSha256, [...(byDigest.get(row.rgbaSha256) ?? []), id]);
+      const art = AUTHORED_ART_BY_ID.get(assetId(id));
+      expect(art?.requestId, id).toBe(row.requestId);
+    }
+    const actualGroups = [...byDigest.values()].filter((group) => group.length > 1).map((group) => [...group].sort()).sort();
+    const declaredGroups = AUTHORED_ART_EQUALITY_GROUPS.map((group) => [...group].sort()).sort();
+    expect(actualGroups).toEqual(declaredGroups);
+    expect([...byDigest.values()].filter((group) => group.length === 1)).toHaveLength(42);
+  });
+
+  it.each(STARTER_ART_INPUTS)('independently decodes $id rendered, committed, and preview PNGs', (input) => {
+      const rendered = decodeRgbaPng(renderStarterArtPng(input.id));
+      const committed = decodeRgbaPng(readFileSync(join(repositoryRoot, 'public/assets/art', `${String(input.id).replace(/^art\./u, '').replaceAll('.', '-')}.png`)));
+      const previewBase64 = previewImages.get(String(input.id).replaceAll('.', '-'));
+      expect(previewBase64, input.id).toBeDefined();
+      if (previewBase64 === undefined) return;
+      const embedded = decodeRgbaPng(Buffer.from(previewBase64, 'base64'));
+      expect([rendered.width, rendered.height], input.id).toEqual([128, 128]);
+      expect(committed.data, `${input.id} committed`).toEqual(rendered.data);
+      expect(embedded.data, `${input.id} preview`).toEqual(rendered.data);
+      if (input.recipe.kind === 'authored') expect(sha256(rendered.data), input.id).toBe(EXPECTED_AUTHORED_RGBA_SHA256[input.id]);
+      else expect(sha256(renderStarterArtPng(input.id)), `${input.id} preserved pin`).toBe(EXPECTED_STARTER_ART_SHA256[input.id]);
+  });
+
+  it('keeps authored modules palette-addressed and free of RGB literals', () => {
+    const directory = join(repositoryRoot, 'src/assets/authored');
+    for (const name of readdirSync(directory).filter((entry) => entry.endsWith('.ts') && entry !== 'art.ts')) {
+      const source = readFileSync(join(directory, name), 'utf8');
+      expect(source, name).not.toMatch(/#[0-9a-f]{6}|\b(?:red|green|blue):\s*\d+/iu);
+    }
+  });
+});
diff --git a/tests/unit/assets/authored-envelope-ledger.test.ts b/tests/unit/assets/authored-envelope-ledger.test.ts
new file mode 100644
index 0000000000000000000000000000000000000000..5feaf4a1f0a85bfecb5135011de3fd5be9df17e9
--- /dev/null
+++ b/tests/unit/assets/authored-envelope-ledger.test.ts
@@ -0,0 +1,251 @@
+import { describe, expect, it } from 'vitest';
+import { Bitmap, type Rgba } from '../../../src/assets/bitmap';
+import { assetId } from '../../../src/assets/ids';
+import { TOKEN_ARCHETYPES, paintRecipe, type TokenArchetype } from '../../../src/assets/pixel-art';
+import { paletteRgb, type PaletteColorRef } from '../../../src/assets/palette';
+import { STARTER_ART_INPUTS, STARTER_ART_INPUTS_BY_ID, archetypeTokenAssetId } from '../../../src/assets/starter-art-inputs';
+import {
+  AUTHORED_COLOR_ENVELOPE, AUTHORED_LIGHT_DIRECTION_ENVELOPE,
+  AUTHORED_NATIVE_DETAIL_ENVELOPE, AUTHORED_PALETTE_TWIN_ENVELOPE,
+  AUTHORED_SILHOUETTE_ENVELOPE, PALETTE_TWIN_IDS, type PaletteTwinId,
+} from './authored-envelope-ledger';
+
+const rgbaKey = ({ red, green, blue, alpha }: Rgba): string => `${String(red)},${String(green)},${String(blue)},${String(alpha)}`;
+const rgbKey = ({ red, green, blue }: Rgba): string => `${String(red)},${String(green)},${String(blue)}`;
+const colorKey = (reference: PaletteColorRef, alpha = 255): string => rgbaKey({ ...paletteRgb(reference), alpha });
+const putRgba = (bitmap: Bitmap, x: number, y: number, pixel: Rgba): void => {
+  bitmap.data.set([pixel.red, pixel.green, pixel.blue, pixel.alpha], (y * bitmap.width + x) * 4);
+};
+
+function distinctColors(bitmap: Bitmap): number {
+  const colors = new Set<string>();
+  for (let index = 0; index < bitmap.data.length; index += 4) if (bitmap.data[index + 3] !== 0) {
+    colors.add(`${String(bitmap.data[index])},${String(bitmap.data[index + 1])},${String(bitmap.data[index + 2])},${String(bitmap.data[index + 3])}`);
+  }
+  return colors.size;
+}
+
+function nativeDetail(bitmap: Bitmap): { readonly changed: number; readonly opaque: number } {
+  let changed = 0; let opaque = 0;
+  for (let y = 0; y < bitmap.height; y += 2) for (let x = 0; x < bitmap.width; x += 2) {
+    const sample = bitmap.get(x, y);
+    for (let dy = 0; dy < 2; dy += 1) for (let dx = 0; dx < 2; dx += 1) {
+      const original = bitmap.get(x + dx, y + dy);
+      if (original.alpha > 0) opaque += 1;
+      if ((original.alpha > 0 || sample.alpha > 0) && rgbaKey(original) !== rgbaKey(sample)) changed += 1;
+    }
+  }
+  return { changed, opaque };
+}
+
+const PALETTE_TWINS: Readonly<Record<PaletteTwinId, readonly [PaletteColorRef, PaletteColorRef]>> = {
+  'stone1-metal0': [{ ramp: 'stone', step: 1 }, { ramp: 'metal', step: 0 }],
+  'stone2-metal1': [{ ramp: 'stone', step: 2 }, { ramp: 'metal', step: 1 }],
+  'stone3-metal2': [{ ramp: 'stone', step: 3 }, { ramp: 'metal', step: 2 }],
+  'wood0-earth0': [{ ramp: 'wood', step: 0 }, { ramp: 'earth', step: 0 }],
+  'moss0-neutral0': [{ ramp: 'moss', step: 0 }, { ramp: 'neutral', step: 0 }],
+  'cloth-warm5-skin3': [{ ramp: 'cloth-warm', step: 5 }, { ramp: 'skin', step: 3 }],
+  'cloth-warm6-skin4': [{ ramp: 'cloth-warm', step: 6 }, { ramp: 'skin', step: 4 }],
+};
+
+function offendingTwinPairs(bitmap: Bitmap): readonly PaletteTwinId[] {
+  const colors = new Set<string>();
+  for (let y = 0; y < bitmap.height; y += 1) for (let x = 0; x < bitmap.width; x += 1) {
+    const pixel = bitmap.get(x, y); if (pixel.alpha > 0) colors.add(rgbKey(pixel));
+  }
+  return PALETTE_TWIN_IDS.filter((id) => PALETTE_TWINS[id].every((reference) => colors.has(rgbKey({ ...paletteRgb(reference), alpha: 255 }))));
+}
+
+function sharedBustSilhouette(party: Bitmap, foe: Bitmap): readonly number[] {
+  const cropBottom = Math.floor(party.height * 0.86); const descriptor: number[] = [];
+  for (let bin = 0; bin < 16; bin += 1) {
+    const y0 = Math.floor((bin * cropBottom) / 16); const y1 = Math.floor(((bin + 1) * cropBottom) / 16);
+    let left = party.width; let right = -1; let area = 0;
+    for (let y = y0; y < y1; y += 1) for (let x = 0; x < party.width; x += 1) {
+      const a = party.get(x, y); const b = foe.get(x, y);
+      if (a.alpha === 0 || rgbaKey(a) !== rgbaKey(b) || rgbaKey(a) === colorKey({ ramp: 'neutral', step: 1 })) continue;
+      left = Math.min(left, x); right = Math.max(right, x); area += 1;
+    }
+    descriptor.push(left / party.width, (right + 1) / party.width, area / Math.max(1, (y1 - y0) * party.width));
+  }
+  return descriptor;
+}
+
+function descriptorDistance(left: readonly number[], right: readonly number[]): number {
+  return left.reduce((sum, value, index) => sum + Math.abs(value - right[index]!), 0) / left.length;
+}
+
+function productionToken(archetype: TokenArchetype, side: 'party' | 'foe'): Bitmap {
+  const input = STARTER_ART_INPUTS_BY_ID.get(archetypeTokenAssetId(archetype, side));
+  if (input === undefined) throw new Error(`Missing production token ${archetype}/${side}.`);
+  return paintRecipe(input.recipe);
+}
+
+function lightCensus(bitmap: Bitmap): { readonly highlightPixels: number; readonly shadowPixels: number; readonly highlight: number | null; readonly shadow: number | null } {
+  const highlightKeys = new Set([colorKey({ ramp: 'stone', step: 5 }), colorKey({ ramp: 'stone', step: 6 }), colorKey({ ramp: 'metal', step: 5 }), colorKey({ ramp: 'metal', step: 6 })]);
+  const shadowKeys = new Set([colorKey({ ramp: 'stone', step: 0 }), colorKey({ ramp: 'stone', step: 1 }), colorKey({ ramp: 'metal', step: 0 }), colorKey({ ramp: 'metal', step: 1 })]);
+  let highlightSum = 0; let highlightPixels = 0; let shadowSum = 0; let shadowPixels = 0;
+  for (let y = 0; y < bitmap.height; y += 1) for (let x = 0; x < bitmap.width; x += 1) {
+    const key = rgbaKey(bitmap.get(x, y));
+    if (highlightKeys.has(key)) { highlightSum += x + y; highlightPixels += 1; }
+    if (shadowKeys.has(key)) { shadowSum += x + y; shadowPixels += 1; }
+  }
+  return { highlightPixels, shadowPixels, highlight: highlightPixels === 0 ? null : highlightSum / highlightPixels, shadow: shadowPixels === 0 ? null : shadowSum / shadowPixels };
+}
+
+function authoredHardInvariantFailures(bitmap: Bitmap, family: 'token' | 'terrain'): readonly string[] {
+  const failures: string[] = [];
+  let sharedShadow = 0;
+  for (let y = 0; y < bitmap.height; y += 1) for (let x = 0; x < bitmap.width; x += 1) {
+    const pixel = bitmap.get(x, y);
+    if (rgbaKey(pixel) === colorKey({ ramp: 'neutral', step: 1 }) || rgbaKey(pixel) === colorKey({ ramp: 'neutral', step: 1 }, 128)) sharedShadow += 1;
+    if (pixel.alpha !== 128) continue;
+    const region = family === 'token' ? { cx: 69, cy: 96, rx: 51, ry: 29 } : { cx: 69, cy: 72, rx: 44, ry: 42 };
+    const inside = ((x + 0.5 - region.cx) / (region.rx + 0.5)) ** 2 + ((y + 0.5 - region.cy) / (region.ry + 0.5)) ** 2 <= 1;
+    if (rgbaKey(pixel) !== colorKey({ ramp: 'neutral', step: 1 }, 128) || !inside) failures.push(`half:${String(x)},${String(y)}`);
+  }
+  if (sharedShadow <= 12) failures.push('shared-shadow');
+  return failures;
+}
+
+function tokenFrameFailures(bitmap: Bitmap, side: 'party' | 'foe'): readonly string[] {
+  const failures: string[] = [];
+  for (let coordinate = 0; coordinate < 128; coordinate += 1) {
+    if ([bitmap.get(coordinate, 0), bitmap.get(coordinate, 127), bitmap.get(0, coordinate), bitmap.get(127, coordinate)].some((pixel) => pixel.alpha !== 0)) failures.push('margin');
+  }
+  for (let y = 4; y < 48; y += 1) for (let x = 34; x < 94; x += 1) if (bitmap.get(x, y).alpha !== 0) failures.push('badge');
+  for (let y = 112; y < 124; y += 1) for (let x = 22; x < 106; x += 1) if (bitmap.get(x, y).alpha !== 0) failures.push('hp');
+  let annulus = 0; let opaque = 0;
+  for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
+    if (x >= 22 && x < 106 && y >= 112 && y < 124) continue;
+    const distance = Math.hypot((x + 0.5 - 64) / 51, (y + 0.5 - 91) / 29);
+    if (distance >= 0.92 && distance <= 0.99) { annulus += 1; if (bitmap.get(x, y).alpha === 255) opaque += 1; }
+  }
+  if (opaque / annulus <= 0.97) failures.push('annulus');
+  const faction = new Set([0, 1, 2, 3, 4, 5, 6].map((step) => rgbKey({ ...paletteRgb({ ramp: side === 'party' ? 'cloth-cool' : 'cloth-warm', step: step as 0 | 1 | 2 | 3 | 4 | 5 | 6 }), alpha: 255 })));
+  if (![50, 64, 72, 80].every((x) => faction.has(rgbKey(bitmap.get(x, 110))))) failures.push('faction');
+  return failures;
+}
+
+describe('D610 provisional authored-art envelope ledger', () => {
+  const authored = STARTER_ART_INPUTS.filter((input) => input.recipe.kind === 'authored');
+
+  it('pins exactly 29 color, 20 native-detail, 37 palette-twin, two silhouette, and three light rows', () => {
+    expect(AUTHORED_COLOR_ENVELOPE).toHaveLength(29); expect(AUTHORED_NATIVE_DETAIL_ENVELOPE).toHaveLength(20);
+    expect(AUTHORED_PALETTE_TWIN_ENVELOPE).toHaveLength(37); expect(AUTHORED_SILHOUETTE_ENVELOPE).toHaveLength(2);
+    expect(AUTHORED_LIGHT_DIRECTION_ENVELOPE).toHaveLength(3);
+  });
+
+  it('enforces contact-shadow regions, token chrome clearances, plate annuli, and faction samples', () => {
+    for (const input of authored) {
+      if (input.recipe.kind !== 'authored') throw new Error(`${input.id} is not authored.`);
+      const family = input.recipe.family;
+      if (family.kind !== 'token' && family.kind !== 'terrain') continue;
+      const bitmap = paintRecipe(input.recipe);
+      expect(authoredHardInvariantFailures(bitmap, family.kind), input.id).toEqual([]);
+      if (family.kind === 'token') expect(tokenFrameFailures(bitmap, family.side), input.id).toEqual([]);
+    }
+  });
+
+  it('rejects authored pixels outside the shadow ellipse and occupied chrome boxes', () => {
+    const source = productionToken('fighter', 'party');
+    const brokenShadow = new Bitmap(128, 128); brokenShadow.data.set(source.data);
+    brokenShadow.data.set([42, 44, 48, 128], (1 * 128 + 1) * 4);
+    expect(authoredHardInvariantFailures(brokenShadow, 'token')).toContain('half:1,1');
+    const brokenBadge = new Bitmap(128, 128); brokenBadge.data.set(source.data);
+    brokenBadge.data.set([42, 44, 48, 255], (4 * 128 + 34) * 4);
+    expect(tokenFrameFailures(brokenBadge, 'party')).toContain('badge');
+  });
+
+  it('exercises negative controls for every provisional classifier and hard token boundary', () => {
+    const blank = new Bitmap(128, 128);
+    expect(authoredHardInvariantFailures(blank, 'token')).toContain('shared-shadow');
+
+    const source = productionToken('fighter', 'party');
+    const brokenFrame = new Bitmap(128, 128); brokenFrame.data.set(source.data);
+    putRgba(brokenFrame, 0, 64, { ...paletteRgb({ ramp: 'stone', step: 1 }), alpha: 255 });
+    putRgba(brokenFrame, 22, 112, { ...paletteRgb({ ramp: 'stone', step: 1 }), alpha: 255 });
+    putRgba(brokenFrame, 50, 110, { ...paletteRgb({ ramp: 'cloth-warm', step: 6 }), alpha: 255 });
+    for (let y = 0; y < 128; y += 1) for (let x = 0; x < 128; x += 1) {
+      const distance = Math.hypot((x + 0.5 - 64) / 51, (y + 0.5 - 91) / 29);
+      if (distance >= 0.92 && distance <= 0.99 && !(x >= 22 && x < 106 && y >= 112 && y < 124))
+        putRgba(brokenFrame, x, y, { red: 0, green: 0, blue: 0, alpha: 0 });
+    }
+    expect(tokenFrameFailures(brokenFrame, 'party')).toEqual(expect.arrayContaining(['margin', 'hp', 'annulus', 'faction']));
+
+    const overBudget = new Bitmap(128, 128);
+    for (let index = 0; index < 21; index += 1)
+      putRgba(overBudget, index, 0, { red: index, green: 0, blue: 0, alpha: 255 });
+    expect(distinctColors(overBudget)).toBeGreaterThan(20);
+
+    const enlarged = new Bitmap(128, 128);
+    enlarged.data.fill(255);
+    expect(nativeDetail(enlarged)).toEqual({ changed: 0, opaque: 16_384 });
+
+    const twins = new Bitmap(128, 128);
+    putRgba(twins, 1, 1, { ...paletteRgb(PALETTE_TWINS['stone1-metal0'][0]), alpha: 255 });
+    putRgba(twins, 2, 1, { ...paletteRgb(PALETTE_TWINS['stone1-metal0'][1]), alpha: 255 });
+    expect(offendingTwinPairs(twins)).toContain('stone1-metal0');
+
+    const fighter = sharedBustSilhouette(source, productionToken('fighter', 'foe'));
+    expect(descriptorDistance(fighter, fighter)).toBeLessThanOrEqual(0.012);
+    expect(lightCensus(blank)).toEqual({ highlightPixels: 0, shadowPixels: 0, highlight: null, shadow: null });
+  });
+
+  it('applies upper color bounds and makes improved rows stale', () => {
+    const rows = new Map<string, number>(AUTHORED_COLOR_ENVELOPE.map((row) => [row.id, row.colors]));
+    for (const input of authored) {
+      const actual = distinctColors(paintRecipe(input.recipe)); const bound = rows.get(input.id);
+      if (bound === undefined) expect(actual, input.id).toBeLessThanOrEqual(20);
+      else { expect(actual, input.id).toBeGreaterThan(20); expect(actual, input.id).toBeLessThanOrEqual(bound); }
+    }
+  });
+
+  it('applies rational native-detail lower bounds and makes improved rows stale', () => {
+    const rows = new Map<string, (typeof AUTHORED_NATIVE_DETAIL_ENVELOPE)[number]>(AUTHORED_NATIVE_DETAIL_ENVELOPE.map((row) => [row.id, row]));
+    for (const input of authored) {
+      const actual = nativeDetail(paintRecipe(input.recipe)); const bound = rows.get(input.id);
+      if (bound === undefined) expect(actual.changed / Math.max(1, actual.opaque), input.id).toBeGreaterThanOrEqual(0.04);
+      else {
+        expect(actual.changed, input.id).toBeGreaterThan(0);
+        expect(actual.changed * bound.opaque, input.id).toBeGreaterThanOrEqual(bound.changed * actual.opaque);
+        expect(actual.changed / Math.max(1, actual.opaque), `${input.id} stale row`).toBeLessThan(0.04);
+      }
+    }
+  });
+
+  it('pins the exact permitted palette-twin set per id', () => {
+    const rows = new Map(AUTHORED_PALETTE_TWIN_ENVELOPE.map((row) => [row.id, row.pairs]));
+    for (const input of authored) {
+      const declared = rows.get(input.id) ?? [];
+      expect(offendingTwinPairs(paintRecipe(input.recipe)), input.id).toEqual(PALETTE_TWIN_IDS.filter((pair) => declared.includes(pair)));
+    }
+  });
+
+  it('keeps only the two pinned production silhouette pairs below the strict floor', () => {
+    const descriptors = new Map(TOKEN_ARCHETYPES.map((archetype) => [archetype, sharedBustSilhouette(productionToken(archetype, 'party'), productionToken(archetype, 'foe'))] as const));
+    const rows = new Map(AUTHORED_SILHOUETTE_ENVELOPE.map((row) => [row.pair.join('/'), row.minimum]));
+    for (let left = 0; left < TOKEN_ARCHETYPES.length; left += 1) for (let right = left + 1; right < TOKEN_ARCHETYPES.length; right += 1) {
+      const a = TOKEN_ARCHETYPES[left]!; const b = TOKEN_ARCHETYPES[right]!;
+      const actual = descriptorDistance(descriptors.get(a)!, descriptors.get(b)!); const minimum = rows.get(`${a}/${b}`);
+      if (minimum === undefined) expect(actual, `${a}/${b}`).toBeGreaterThan(0.012);
+      else { expect(actual, `${a}/${b}`).toBeGreaterThanOrEqual(minimum); expect(actual, `${a}/${b} stale row`).toBeLessThanOrEqual(0.012); }
+    }
+  });
+
+  it('classifies authored terrain light outcomes by explicit census without throwing helpers', () => {
+    for (const row of AUTHORED_LIGHT_DIRECTION_ENVELOPE) {
+      const input = STARTER_ART_INPUTS_BY_ID.get(assetId(row.id)); if (input === undefined) throw new Error(`Missing ${row.id}.`);
+      const census = lightCensus(paintRecipe(input.recipe));
+      switch (row.outcome.kind) {
+        case 'centroids':
+          expect(census.highlightPixels, row.id).toBeGreaterThan(0); expect(census.shadowPixels, row.id).toBeGreaterThan(0);
+          expect(census.highlight, row.id).toBe(row.outcome.highlight); expect(census.shadow, row.id).toBe(row.outcome.shadow); break;
+        case 'no_shadow_pixels':
+          expect(census).toEqual({ highlightPixels: row.outcome.highlightPixels, shadowPixels: 0, highlight: expect.any(Number), shadow: null }); break;
+        case 'no_highlight_no_shadow':
+          expect(census).toEqual({ highlightPixels: 0, shadowPixels: 0, highlight: null, shadow: null }); break;
+      }
+    }
+  });
+});
diff --git a/tests/unit/assets/authored-envelope-ledger.ts b/tests/unit/assets/authored-envelope-ledger.ts
new file mode 100644
index 0000000000000000000000000000000000000000..4689139447e2aa1ef1594ca091f0d6c27b881f33
--- /dev/null
+++ b/tests/unit/assets/authored-envelope-ledger.ts
@@ -0,0 +1,18 @@
+/**
+ * Provisional branch-only D610 envelope. Measurements come from the delivered PNGs
+ * identified by the frozen external RGBA oracle; strict D516 thresholds apply off-ledger.
+ */
+export const AUTHORED_COLOR_ENVELOPE = [{id:'art.token.pc.fighter.v1',colors:42},{id:'art.token.pc.cleric.v1',colors:49},{id:'art.token.pc.wizard.v1',colors:49},{id:'art.token.pc.rogue.v1',colors:32},{id:'art.token.monster.goblin-warrior.v1',colors:45},{id:'art.token.monster.hobgoblin-warrior.v1',colors:41},{id:'art.token.monster.bandit-captain.v1',colors:47},{id:'art.token.monster.ogre.v1',colors:34},{id:'art.token.monster.priest-acolyte.v1',colors:48},{id:'art.token.monster.priest.v1',colors:47},{id:'art.token.monster.skeleton.v1',colors:42},{id:'art.token.monster.zombie.v1',colors:28},{id:'art.token.monster.wolf.v1',colors:31},{id:'art.token.party.fighter.v1',colors:42},{id:'art.token.party.wizard.v1',colors:49},{id:'art.token.party.cleric.v1',colors:49},{id:'art.token.party.rogue.v1',colors:32},{id:'art.token.party.ranger.v1',colors:34},{id:'art.token.party.brute.v1',colors:34},{id:'art.token.party.beast.v1',colors:31},{id:'art.token.party.undead.v1',colors:43},{id:'art.token.foe.fighter.v1',colors:42},{id:'art.token.foe.wizard.v1',colors:46},{id:'art.token.foe.cleric.v1',colors:47},{id:'art.token.foe.rogue.v1',colors:32},{id:'art.token.foe.ranger.v1',colors:34},{id:'art.token.foe.brute.v1',colors:34},{id:'art.token.foe.beast.v1',colors:31},{id:'art.token.foe.undead.v1',colors:42}] as const;
+export const AUTHORED_NATIVE_DETAIL_ENVELOPE = [{id:'art.map.floor.stone.v1',changed:96,opaque:16384},{id:'art.map.floor.stone-1.v1',changed:336,opaque:16384},{id:'art.map.floor.stone-2.v1',changed:36,opaque:16384},{id:'art.map.floor.stone-3.v1',changed:362,opaque:16384},{id:'art.map.wall.stone.v1',changed:402,opaque:16384},{id:'art.map.wall.stone-s.v1',changed:502,opaque:16384},{id:'art.map.wall.stone-w.v1',changed:471,opaque:16384},{id:'art.map.wall.stone-e.v1',changed:500,opaque:16384},{id:'art.map.wall.stone-nw.v1',changed:499,opaque:16384},{id:'art.map.wall.stone-ne.v1',changed:502,opaque:16384},{id:'art.map.wall.stone-sw.v1',changed:502,opaque:16384},{id:'art.map.wall.stone-se.v1',changed:502,opaque:16384},{id:'art.map.door.wood.v1',changed:143,opaque:16384},{id:'art.map.door.wood-s.v1',changed:141,opaque:16384},{id:'art.map.door.wood-w.v1',changed:145,opaque:16384},{id:'art.map.door.wood-e.v1',changed:145,opaque:16384},{id:'art.map.door.wood-open-n.v1',changed:133,opaque:16384},{id:'art.map.door.wood-open-s.v1',changed:131,opaque:16384},{id:'art.map.door.wood-open-w.v1',changed:135,opaque:16384},{id:'art.map.door.wood-open-e.v1',changed:135,opaque:16384}] as const;
+export const PALETTE_TWIN_IDS = ['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','moss0-neutral0','cloth-warm5-skin3','cloth-warm6-skin4'] as const;
+export type PaletteTwinId = (typeof PALETTE_TWIN_IDS)[number];
+export const AUTHORED_PALETTE_TWIN_ENVELOPE: readonly { readonly id: string; readonly pairs: readonly PaletteTwinId[] }[] = [{id:'art.token.pc.fighter.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.pc.cleric.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.pc.wizard.v1',pairs:['stone1-metal0','stone2-metal1','cloth-warm6-skin4','cloth-warm5-skin3','wood0-earth0']},{id:'art.token.pc.rogue.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.monster.goblin-warrior.v1',pairs:['moss0-neutral0','stone1-metal0','wood0-earth0','cloth-warm6-skin4','stone3-metal2']},{id:'art.token.monster.hobgoblin-warrior.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.monster.bandit-captain.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.monster.ogre.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.monster.priest-acolyte.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.monster.priest.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.monster.skeleton.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','cloth-warm6-skin4']},{id:'art.token.monster.zombie.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0']},{id:'art.token.monster.wolf.v1',pairs:['stone1-metal0','stone2-metal1']},{id:'art.token.party.fighter.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.party.wizard.v1',pairs:['stone1-metal0','stone2-metal1','cloth-warm6-skin4','cloth-warm5-skin3','wood0-earth0']},{id:'art.token.party.cleric.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.party.rogue.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.party.ranger.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.party.brute.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.party.beast.v1',pairs:['stone1-metal0','stone2-metal1']},{id:'art.token.party.undead.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','cloth-warm6-skin4']},{id:'art.token.foe.fighter.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.foe.wizard.v1',pairs:['stone1-metal0','stone2-metal1','cloth-warm6-skin4','cloth-warm5-skin3','wood0-earth0']},{id:'art.token.foe.cleric.v1',pairs:['stone2-metal1','stone3-metal2','stone1-metal0','cloth-warm5-skin3','cloth-warm6-skin4','wood0-earth0']},{id:'art.token.foe.rogue.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.foe.ranger.v1',pairs:['moss0-neutral0','stone1-metal0','stone2-metal1','wood0-earth0','stone3-metal2']},{id:'art.token.foe.brute.v1',pairs:['stone2-metal1','stone1-metal0','stone3-metal2','wood0-earth0']},{id:'art.token.foe.beast.v1',pairs:['stone1-metal0','stone2-metal1']},{id:'art.token.foe.undead.v1',pairs:['stone1-metal0','stone2-metal1','stone3-metal2','wood0-earth0','cloth-warm6-skin4']},{id:'art.map.door.wood.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-s.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-w.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-e.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-n.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-s.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-w.v1',pairs:['stone2-metal1']},{id:'art.map.door.wood-open-e.v1',pairs:['stone2-metal1']}];
+export const AUTHORED_SILHOUETTE_ENVELOPE = [
+  { pair: ['cleric', 'undead'], minimum: 0.011284722222222224 },
+  { pair: ['cleric', 'beast'], minimum: 0.011835007440476187 },
+] as const;
+export const AUTHORED_LIGHT_DIRECTION_ENVELOPE = [
+  { id: 'art.terrain.pillar.v1', outcome: { kind: 'centroids', highlight: 126, shadow: 126 } },
+  { id: 'art.terrain.rubble.v1', outcome: { kind: 'no_shadow_pixels', highlightPixels: 207 } },
+  { id: 'art.terrain.crate.v1', outcome: { kind: 'no_highlight_no_shadow' } },
+] as const;
diff --git a/tests/unit/assets/classic-art-techniques.test.ts b/tests/unit/assets/classic-art-techniques.test.ts
index 8cfa87a9a2c961b0e0578454fd69d234d290b83d..4ce4623560841594c40d5a0369dc1f0a8ad44594
--- a/tests/unit/assets/classic-art-techniques.test.ts
+++ b/tests/unit/assets/classic-art-techniques.test.ts
@@ -10,6 +10,7 @@
   paintTokenBust,
   tokenRecipe,
   type ArtRecipe,
+  type ProceduralArtRecipe,
   type TokenArchetype,
 } from '../../../src/assets/pixel-art';
 import {
@@ -22,7 +23,11 @@
   type PaletteRamp,
   type PaletteColorRef,
 } from '../../../src/assets/palette';
-import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
+import {
+  STARTER_ART_INPUTS,
+  STARTER_ART_INPUTS_BY_ID,
+} from '../../../src/assets/starter-art-inputs';
+import { assetId } from '../../../src/assets/ids';
 
 const EXPECTED_NATIVE_SIZE = 128;
 /** Fine accents are deliberately sparse; four percent still rejects every 2x enlargement. */
@@ -41,7 +46,7 @@
   'art.map.overlay.glyph-obscured.v1',
 ]);
 
-type AssetClass = ArtRecipe['kind'];
+type AssetClass = ProceduralArtRecipe['kind'];
 
 const COLOR_BUDGET: Readonly<Record<AssetClass, number>> = {
   floor: 6,
@@ -555,8 +560,10 @@
     expect(Object.keys(MATERIAL_RESPONSES).sort()).toEqual(
       [...ART_MATERIALS].sort(),
     );
-    for (const input of STARTER_ART_INPUTS)
-      expect(MATERIAL_RESPONSES[input.recipe.material]).toBeDefined();
+    for (const input of STARTER_ART_INPUTS) {
+      const recipe = input.recipe.kind === 'authored' ? input.recipe.family : input.recipe;
+      expect(MATERIAL_RESPONSES[recipe.material]).toBeDefined();
+    }
     expect(MATERIAL_RESPONSES.metal.specular).toBe('single-cluster');
     expect(MATERIAL_RESPONSES.stone.specular).toBe('none');
     expect(MATERIAL_RESPONSES.cloth.mark).toBe('broad-fold');
@@ -789,7 +796,7 @@
     for (const input of STARTER_ART_INPUTS) {
       const bitmap = paintRecipe(input.recipe);
       const colors = distinctColors(bitmap);
-      if (colors > COLOR_BUDGET[input.recipe.kind])
+      if (input.recipe.kind !== 'authored' && colors > COLOR_BUDGET[input.recipe.kind])
         overBudget.push(`${input.id}:${String(colors)}`);
       for (let index = 0; index < bitmap.data.length; index += 4) {
         if (bitmap.data[index + 3] === 0) continue;
@@ -797,6 +804,7 @@
         if (!PALETTE_RGB.has(rgb)) outsidePalette.push(`${input.id}:${rgb}`);
       }
       if (
+        input.recipe.kind === 'authored' ||
         input.recipe.kind === 'overlay' ||
         input.recipe.kind === 'fog' ||
         input.recipe.kind === 'shade'
@@ -815,9 +823,11 @@
 
   it('grounds every freestanding object with the one shared contact-shadow colour', () => {
     expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
-    const shadow = colorKey(neutral(1));
+    const shadows = new Set([colorKey(neutral(1)), colorKey(neutral(1), 128)]);
     for (const input of STARTER_ART_INPUTS.filter(
       ({ recipe }) =>
+        (recipe.kind === 'authored' &&
+          (recipe.family.kind === 'terrain' || recipe.family.kind === 'token')) ||
         recipe.kind === 'terrain' ||
         recipe.kind === 'token' ||
         recipe.kind === 'token-dead',
@@ -826,7 +836,7 @@
       let shadowPixels = 0;
       for (let y = 0; y < bitmap.height; y += 1)
         for (let x = 0; x < bitmap.width; x += 1) {
-          if (rgbaKey(bitmap.get(x, y)) === shadow) shadowPixels += 1;
+          if (shadows.has(rgbaKey(bitmap.get(x, y)))) shadowPixels += 1;
         }
       expect(shadowPixels, input.id).toBeGreaterThan(12);
     }
@@ -835,6 +845,7 @@
   it('keeps every colour choice perceptibly separate from its neighbours', () => {
     expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
     for (const input of STARTER_ART_INPUTS) {
+      if (input.recipe.kind === 'authored') continue;
       expect(
         minimumRgbDistance(paintRecipe(input.recipe)),
         input.id,
@@ -845,7 +856,7 @@
   it('keeps structured texture in clusters instead of isolated speckle', () => {
     expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
     for (const input of STARTER_ART_INPUTS.filter(({ recipe }) =>
-      ['floor', 'wall', 'door', 'terrain'].includes(recipe.kind),
+      ['floor', 'wall', 'door', 'terrain'].includes(recipe.kind === 'authored' ? recipe.family.kind : recipe.kind),
     )) {
       expect(
         isolatedColorIslands(paintRecipe(input.recipe)),
@@ -944,6 +955,29 @@
         `difficult/plain-${String(variant)} CIE76 deltaE`,
       ).toBeGreaterThanOrEqual(8.5);
     }
+    for (const variant of FLOOR_VARIANTS) {
+      const id = assetId(variant === 0
+        ? 'art.map.floor.stone.v1'
+        : `art.map.floor.stone-${String(variant)}.v1`);
+      const production = STARTER_ART_INPUTS_BY_ID.get(id);
+      if (production === undefined) throw new Error(`Missing production floor ${id}.`);
+      const floor = paintRecipe(production.recipe);
+      const rendered = meanCellColor(compositeCell([floor, difficult]));
+      const plain = meanCellColor(floor);
+      expect(
+        Math.abs(relativeLuminance(rendered) - relativeLuminance(plain)),
+        `production difficult/plain-${String(variant)} luminance difference`,
+      ).toBeGreaterThanOrEqual(0.015);
+      expect(
+        cieDeltaE(rendered, plain),
+        `production difficult/plain-${String(variant)} CIE76 deltaE`,
+      ).toBeGreaterThanOrEqual(8.5);
+    }
+    const unchangedInput = STARTER_ART_INPUTS_BY_ID.get(assetId('art.map.floor.stone.v1'));
+    if (unchangedInput === undefined) throw new Error('Missing production floor control.');
+    const unchangedControl = meanCellColor(paintRecipe(unchangedInput.recipe));
+    expect(Math.abs(relativeLuminance(unchangedControl) - relativeLuminance(unchangedControl))).toBe(0);
+    expect(cieDeltaE(unchangedControl, unchangedControl)).toBe(0);
 
     const blocked = paintRecipe({
       kind: 'overlay',
@@ -1020,6 +1054,7 @@
     expect(TILE_SIZE).toBe(EXPECTED_NATIVE_SIZE);
     for (const input of STARTER_ART_INPUTS) {
       const rendered = paintRecipe(input.recipe);
+      if (input.recipe.kind === 'authored') continue;
       if (TWO_BY_CHROME_OVERLAY_IDS.has(input.id)) {
         expect(nativeDetailFraction(rendered), input.id).toBe(0);
         const reduced = new Bitmap(64, 64);
diff --git a/tests/unit/assets/encounter-board-art.test.ts b/tests/unit/assets/encounter-board-art.test.ts
index 93c0440c337fc624ef329115d53e12dcd591f78e..bf12082be6af2e98b702acffdeabce60e4db7ad2
--- a/tests/unit/assets/encounter-board-art.test.ts
+++ b/tests/unit/assets/encounter-board-art.test.ts
@@ -1,4 +1,5 @@
 import { readFileSync } from '../../helpers/test-filesystem';
+import { createHash } from 'node:crypto';
 import { fileURLToPath } from 'node:url';
 import { describe, expect, it } from 'vitest';
 import { SHADE_ASSETS } from '../../../src/assets/art-sets';
@@ -7,6 +8,10 @@
 import { decodeEncounterArtPackage } from '../../../src/vtt/encounter-package';
 import { encounterArtForBoard } from '../../../src/vtt/encounter-art-selection';
 import { REFERENCE_ENCOUNTER_ART } from '../../../src/vtt/reference-encounter-art';
+import { renderStarterArtPng } from '../../../src/assets/starter-art-resolver';
+import { assetId } from '../../../src/assets/ids';
+import { EXPECTED_AUTHORED_INVENTORY } from './expected-authored-inventory';
+import { decodeRgbaPng } from '../../helpers/png-decode';
 
 const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));
 const fighter = combatantId('combatant:fighter');
@@ -40,6 +45,47 @@
 };
 
 describe('encounter package asset-id consumption', () => {
+  it('resolves all nine fixture-named monster portraits through a board scene', () => {
+    const named = [
+      ['goblin-warrior', 'art.token.monster.goblin-warrior.v1'],
+      ['hobgoblin-warrior', 'art.token.monster.hobgoblin-warrior.v1'],
+      ['bandit-captain', 'art.token.monster.bandit-captain.v1'],
+      ['ogre', 'art.token.monster.ogre.v1'],
+      ['priest', 'art.token.monster.priest.v1'],
+      ['priest-acolyte', 'art.token.monster.priest-acolyte.v1'],
+      ['skeleton', 'art.token.monster.skeleton.v1'],
+      ['zombie', 'art.token.monster.zombie.v1'],
+      ['wolf', 'art.token.monster.wolf.v1'],
+    ] as const;
+    const combatants = named.map(([name], index) => ({
+      id: combatantId(`combatant:${name}`), name, kind: 'monster' as const,
+      placementStatus: 'placed' as const, position: { column: 1 + index, row: 2 },
+      effectiveSize: 'Medium' as const, placementMode: { kind: 'normal' as const, actual: 'Medium' as const },
+      footprint: [{ column: 1 + index, row: 2 }] as const,
+    }));
+    const art = decodeEncounterArtPackage({
+      ...REFERENCE_ENCOUNTER_ART,
+      id: 'encounter-art:named-portrait-proof:v1',
+      room: { ...REFERENCE_ENCOUNTER_ART.room, columns: 12, rows: 6, doorCell: { column: 6, row: 5 } },
+      terrain: [],
+      combatantTokens: Object.fromEntries(named.map(([name, id]) => [`combatant:${name}`, id])),
+    });
+    const model = encounterBoardRenderModel({
+      bounds: { columns: 12, rows: 6 },
+      terrainCells: projectEncounterTerrainCells({ columns: 12, rows: 6 }, { blockedCells: [], worldObjects: [] }),
+      combatants, highlightedCombatant: null, adjudicatedTargets: [],
+    }, art);
+    const digests = new Set<string>();
+    for (const [name, id] of named) {
+      expect(model.find((cell) => cell.token?.id === `combatant:${name}`)?.token?.assetId).toBe(id);
+      const digest = createHash('sha256').update(decodeRgbaPng(renderStarterArtPng(assetId(id))).data).digest('hex');
+      expect(EXPECTED_AUTHORED_INVENTORY[id]).toBeDefined();
+      expect(digest).toBe(EXPECTED_AUTHORED_INVENTORY[id]!.rgbaSha256);
+      digests.add(EXPECTED_AUTHORED_INVENTORY[id]!.rgbaSha256);
+    }
+    expect([...digests]).toHaveLength(9);
+  });
+
   it('renders player and DM models through stable ids while keeping fog DM-only', () => {
     const player = encounterBoardRenderModel(projection, REFERENCE_ENCOUNTER_ART);
     const dm = encounterBoardRenderModel({
diff --git a/tests/unit/assets/expected-art-hashes.ts b/tests/unit/assets/expected-art-hashes.ts
index 57597d8200266b0891fcc042907993437fe609c3..84460c5fce958fc87564283f773c2c78dde2c956
--- a/tests/unit/assets/expected-art-hashes.ts
+++ b/tests/unit/assets/expected-art-hashes.ts
@@ -19,6 +19,10 @@
  * tests/unit/assets/board-glyphs.test.ts carries the pixel-level invariants
  * that license these five pins.
  *
+ * QUIETSTONE AUTHORED ART (2026-09-10): 58 output pins and the preview pin
+ * changed only with independent raw-RGBA checks over rendered, committed, and
+ * preview-embedded PNGs. The 34 procedural pins remain immutable invariants.
+ *
  * Native-density redraw (2026-09-05), extended by D576: all 92 output pins and the preview pin
  * changed with the 128-pixel redraw. The independent bitmap invariants in
  * classic-art-techniques.test.ts reject enlargement, contour shading, speckle,
@@ -35,117 +39,117 @@
 export const EXPECTED_STARTER_ART_SHA256: Readonly<Record<string, string>> =
   Object.freeze({
     'art.token.pc.fighter.v1':
-      '27c52840d5a02dc3b1f8bd4ea80835cbcc88c0eda79e3a2c337f0431bbfc0120',
+      'f531b39be34712cf7c1dfaefa71d57ebef2e71864e613b9ff2a4fcbf34fa0671',
     'art.token.pc.cleric.v1':
-      'a7834461ae60fdb2565b525acbb6e5caf30b78c8d74391cf31cbf4ac60c9d6ce',
+      'a3118b3d3f41e3e69a0ba4de155650d6ad9387f2778dd430aa745dc17c487ca9',
     'art.token.pc.wizard.v1':
-      'c1dc2ea1b8f993b3e21ff05924e6a356fc67fdd0af36ace9e342193a1fef4e48',
+      '806b70a7222a41f0381edcece3e905fd31751233026c4170ae0fdd09a7c2963f',
     'art.token.pc.rogue.v1':
-      'ba873b3bc6e30ffe707b193584cdf313195fa91af99fbd91d514cf4e7e88ad58',
+      '2be7e5ea95bb1cc4d55a652b7ebefbe7a862d9748a8bf12ed0cecb45193f577e',
     'art.token.monster.goblin-warrior.v1':
-      '07c39246271e669bd472f033ac7c4ff24a5112cf97d5d2a9866bb6f6ee85ae97',
+      'ab69e6f1b5732b4e0894677fb88c5dede99a5e44f7d324cb8f1b3b5950cee3dc',
     'art.token.monster.hobgoblin-warrior.v1':
-      '7c7118b2b0cae3f2301f74c1b0260b2304c5cc28d75e6ec262b862795663c0aa',
+      '07df16a4309fc41091f1f774d36af2ae6adca2059e7545b17274956ba2ddfc14',
     'art.token.monster.bandit-captain.v1':
-      '7c7118b2b0cae3f2301f74c1b0260b2304c5cc28d75e6ec262b862795663c0aa',
+      'cc439de3ab1a93d31dd7a0bfe6eb39391b93048b341c57494f7476347dfc1a35',
     'art.token.monster.ogre.v1':
-      '07c39246271e669bd472f033ac7c4ff24a5112cf97d5d2a9866bb6f6ee85ae97',
+      '8f5ad9470ca042dc13578b4098ea01a77ca4a7b026214c71177d96494ad9383b',
     'art.token.monster.priest-acolyte.v1':
-      'c4317dbc5b295840d5d72ba024de1bed1d5d8a4e4a8bb7069cca244ad66b026a',
+      'aa8d7b368b63ec01dcb2fad1c8c707601164af2f0aaa7d1ab511e3f691cace2d',
     'art.token.monster.priest.v1':
-      'c4317dbc5b295840d5d72ba024de1bed1d5d8a4e4a8bb7069cca244ad66b026a',
+      'bf7d383df7a994a9243c31808e5d21d6f9857b886b3f6b4affbe4de4c600d58e',
     'art.token.monster.skeleton.v1':
-      '4c1c6b2e89b6570213a6bde39b6b4cdf3a22dd8d3d5baa090cc76d9bcbe5a58e',
+      '8c9f00b5f539d71dd617d8f4d0688963276abb1764c4b24b9e98e6bd5ce49917',
     'art.token.monster.zombie.v1':
-      '4c1c6b2e89b6570213a6bde39b6b4cdf3a22dd8d3d5baa090cc76d9bcbe5a58e',
+      '41e310978a796bd84e528d3417a8b502e2f48ec46e8547b65bf152c9945f2920',
     'art.token.monster.wolf.v1':
-      'beb5a5d92bafe9cc2372ea52a43fcb4c00bf68a6a7b23e132c314e28c80174d9',
+      '64bc7519bad89ded3116588994373568ab5800d79189a9f3a9838ab2afe86841',
     'art.token.party.fighter.v1':
-      '27c52840d5a02dc3b1f8bd4ea80835cbcc88c0eda79e3a2c337f0431bbfc0120',
+      'f531b39be34712cf7c1dfaefa71d57ebef2e71864e613b9ff2a4fcbf34fa0671',
     'art.token.party.wizard.v1':
-      'c1dc2ea1b8f993b3e21ff05924e6a356fc67fdd0af36ace9e342193a1fef4e48',
+      '806b70a7222a41f0381edcece3e905fd31751233026c4170ae0fdd09a7c2963f',
     'art.token.party.cleric.v1':
-      'a7834461ae60fdb2565b525acbb6e5caf30b78c8d74391cf31cbf4ac60c9d6ce',
+      'a3118b3d3f41e3e69a0ba4de155650d6ad9387f2778dd430aa745dc17c487ca9',
     'art.token.party.rogue.v1':
-      'ba873b3bc6e30ffe707b193584cdf313195fa91af99fbd91d514cf4e7e88ad58',
+      '2be7e5ea95bb1cc4d55a652b7ebefbe7a862d9748a8bf12ed0cecb45193f577e',
     'art.token.party.ranger.v1':
-      '10ad5be3eac22d2f1f8fa78cedec7b9f59b2577b7c591cf7afcc2cbd14d191fc',
+      '720b86964b4e86814c03a7304636c465f61b6be1ecdc163c55286b5ef0835ce2',
     'art.token.party.brute.v1':
-      '3e01ef675b77ee1305447cab56f8d9f3d103c2f45e8a0a2b9bd76184c6707c57',
+      '5c2ba886f5c2a8812209c03cc591dc2c74d74bffeaa9c74d568c8998696cb5db',
     'art.token.party.beast.v1':
-      'f6bf0e99a92fad5f217f06b36603a293e028337b46dd5bfe02006e9e06b464d8',
+      '10e129a33e596274f7de29366240dff73b5777ed30d5276c53c08dbee23989c9',
     'art.token.party.undead.v1':
-      '7fec8d98ae44d9ebf14bbf29156ee89036b591684fda51e0f8c6cbc3a8aa3cee',
+      '1ec5cf537bd7ecb57ae7adda2186674b7e5805bf7a0afec84573e0bbf9efd80b',
     'art.token.party.fiend.v1':
-      '1ef324700c77219db7f6f7ec25f8d429e4877cd28f2d9757e39d2403c2f405e6',
+      'c98d5b9627e392bc69a244239b6a713b13c949d56c674ece373cf8600acd1cc3',
     'art.token.party.ooze.v1':
-      '5cd76efe8e747d11e03ae8b0af2d92f85e943adc833b1ff7907cdc4cef5b8010',
+      'ef4dddb55ff845ec1da83b0918d48de9a1fa370967cec59c46702f1eeda3b414',
     'art.token.party.construct.v1':
-      '10a4a2cf1d9953cf160c0d6cb54f5db4af1a5214b6c75642e5fbb6782e768663',
+      'b32d39421b3ee45311c017c786885b526c6255eb990d1abbe7c92c2fb500249d',
     'art.token.foe.fighter.v1':
-      '7c7118b2b0cae3f2301f74c1b0260b2304c5cc28d75e6ec262b862795663c0aa',
+      '111ca251be0bf5a065356980fb54f8523dcdc96a130d17b2125b044d6c4d42eb',
     'art.token.foe.wizard.v1':
-      'ef027ff34bad4d5de7b2fb3c5191a7c47894b432c7d398f38c62b5d2d89c5c03',
+      '769e9ba2d3e01a135c359d56935ab14bd546de16c33dec45412f998250082996',
     'art.token.foe.cleric.v1':
-      'c4317dbc5b295840d5d72ba024de1bed1d5d8a4e4a8bb7069cca244ad66b026a',
+      'bf7d383df7a994a9243c31808e5d21d6f9857b886b3f6b4affbe4de4c600d58e',
     'art.token.foe.rogue.v1':
-      '1fe730eee1d160504dec98044292ddcfc482420b68388c05243d6ccf7df1ee0a',
+      'a252626161692211852a4fb504547065217bc5183fafb8b5d3ce72a43d3ca086',
     'art.token.foe.ranger.v1':
-      '248b879fe5500e1b6eff7d9bb4f7a44780774adfdffc04bbe60d5f4b48e84932',
+      '32e328772f4ad002e258ba44415d8a01addc9dcb28ed3cb8d950106edb881092',
     'art.token.foe.brute.v1':
-      '07c39246271e669bd472f033ac7c4ff24a5112cf97d5d2a9866bb6f6ee85ae97',
+      '8f5ad9470ca042dc13578b4098ea01a77ca4a7b026214c71177d96494ad9383b',
     'art.token.foe.beast.v1':
-      'beb5a5d92bafe9cc2372ea52a43fcb4c00bf68a6a7b23e132c314e28c80174d9',
+      '64bc7519bad89ded3116588994373568ab5800d79189a9f3a9838ab2afe86841',
     'art.token.foe.undead.v1':
-      '4c1c6b2e89b6570213a6bde39b6b4cdf3a22dd8d3d5baa090cc76d9bcbe5a58e',
+      '8c9f00b5f539d71dd617d8f4d0688963276abb1764c4b24b9e98e6bd5ce49917',
     'art.token.foe.fiend.v1':
-      '7a742f6b9350c69a17cbbbf68d23a1c9b2c5e04611d7eabb28526c56fe4945a4',
+      'c7a6cc4e21f1e7e5bdb0ee3472f14b96770ef267c75b06acb450c2dce5b0c57b',
     'art.token.foe.ooze.v1':
-      '47a09c5093a373f00866486252786febf0b5dbe01bc68cd816a61d7861034872',
+      '98e1fc4cf44c2319d9699010b7d82a87011dc91c37f0f6edd47ac946b9d1ee24',
     'art.token.foe.construct.v1':
-      'fa4b0abfc83931ab4c0b971066cda95db8264cb006cb92ae4fde7de96fd2a7a9',
+      '057d5a99f053d1d8b5beb85675d0820186eb654d0e59efe33cecb82f996c2af8',
     'art.token.dead.v1':
       '31913b2c3b0a8e8f1c33069b04647b61dee6c11f5fc5555bffe0833c7cf0be36',
     'art.map.floor.stone.v1':
-      '3ef1b6469df8f9dc62a8c877dedc6a0d269c34559031078e8b2bfa5fba3ba822',
+      'b155c8699a3579b05e42e51a372425f65c144112e8663ddc320c2a1306dbf38b',
     'art.map.floor.stone-1.v1':
-      'b24f951192465b428f274131ce1600a234484f23eedd092c3b47cc33a278ad5a',
+      'bdb1579a2ad0654b143f8365f67840f9e5fe1019bdb7f109329a1511272f6484',
     'art.map.floor.stone-2.v1':
-      'd35ae009d9cbc8d61404801ab2e80e3a6c43d702d799429757120050dcdd4ff1',
+      '8d03334bfec2d2f8067bbdfea935212ae1b271f2fbc2cef1e7a0023515bbf67b',
     'art.map.floor.stone-3.v1':
-      '336c91fc849cddfaa0a8c5462266561a33482ef682ea90f3f3bc4921b0f200cf',
+      '19e11a696cf073e2185bfd06fbe4ded9acafeacc0712cdcb75295b980eb6412d',
     'art.map.wall.stone.v1':
-      '0be40e2aaa52454cf9ece1906ee2b315f361006d44b9cc32ce53538fe3ed933c',
+      '2d5e854cefb541aa94696a6c339feacfd0898fcc18697e224102f3fe24a4a09b',
     'art.map.wall.stone-s.v1':
-      '75252f82ed6b60acd9b4bd8ae0814bcfcb9d367d824b37bed2bf6dae78b787fe',
+      '65b71ce14aed7070101c9375393b986a25b326d83458927280bc1cc54d63a28f',
     'art.map.wall.stone-w.v1':
-      'f6d897fd69949eb8c536cfd0ad9c99d1c7c90f20689547c008db5792fc5ff4fa',
+      'df9fdb499301381e72f4c9aba1df3598eca50cf77689fcd2de1313f2dad6ab68',
     'art.map.wall.stone-e.v1':
-      '2664c402b63f5128c29fdda669cdf3797d85b5784922e8947a8ede3eedb936ff',
+      'fcc8df5b1343754378d8b98c2eb5734f7f8dbeae71fdf062162a4e72d828c735',
     'art.map.wall.stone-nw.v1':
-      '8e8a8cb8dc1b78adf9d42955a728f5971c81703ea385fb0961fd34032b62e3c8',
+      'e5932280e3bfe40cc9134672a340d65b1b6bf312a8142a929904cfb242e6ab00',
     'art.map.wall.stone-ne.v1':
-      '8b9d74a6a9c63355cbeef928fdf9129e763ec0e57aad337d2a3e6d287a1f2787',
+      '10f89b699d70684da9690fc2c7b79ed70d7284ed74a1282d09d9ef4836c2105b',
     'art.map.wall.stone-sw.v1':
-      '1968e34a840536d39a44be6760cf47ab43cd1fe7a7ea07bfb44e0cc4c51a666c',
+      '1b3356e2ed6058c160ad91e9e9637305605915b26f15cfa5baffd2acc71a51e0',
     'art.map.wall.stone-se.v1':
-      '6d98a193e47ef19b6ef4ffed3117d4596be2d7b7582c80c7209892d6fd5f6514',
+      'a6c6787157b1146098c07de9dad4972085ae4fd8900021fd4a27eff26ae834cc',
     'art.map.door.wood.v1':
-      'b63cb5e778377a8e053f007f6654251ad9ecaef919d56e7984e5c108a1239ae6',
+      'ede5502b89bfa5dab927bf45a88f3a1f35dafdbf84fe1acfa8d097780c8aea9d',
     'art.map.door.wood-s.v1':
-      '4c9a0b84e5af31b762540b6cc968e9125f8b3ca622d5bd783ebdd9ce1cb5bac9',
+      '716e5a9dc5e879129c63713baea7f86d14467c52b97f6c0966406116c82f206b',
     'art.map.door.wood-w.v1':
-      '442055c0211b3ed547da7e9b05da7a0a8d91495f2a0545b1b2602b14059e854c',
+      'bd32a6b5d68c28d5df3c362da2269ed4625a240ec21b5ea522e093ee16c6cd05',
     'art.map.door.wood-e.v1':
-      'b273f404a39edff270f42b6f8fa4b64d5bfc284acbcda3632690a4b875a0d907',
+      '9d38c18eb7a846db52c494647d161d2f5b2a2c3709a4c659988ce7d0957c8c9b',
     'art.map.door.wood-open-n.v1':
-      '46d69c43fe8def5dbb0cd50ad1cc171c7b295ef96e98e77a6ea4deba4079f810',
+      'f9339d691d5401ac2a2c692ec63099d4ff3482ffdc17ef1fc12c6982e8ed5299',
     'art.map.door.wood-open-s.v1':
-      '29d828a25a0964c655c58ffa84b3f98b5f29eba6d5e18ad1efdb86ea7ce3ddb7',
+      '82210a2bfd5e8aec854c4a1cf9d62efe285bbfe793bf717b079e1829de245c21',
     'art.map.door.wood-open-w.v1':
-      'f41dc7b91166455cc38f836f94aa71503a77e85cafacd200f407bf743d31f1d9',
+      '674c46e970f8cf5adc5c7ed857970efb80a299aa16941f5e54c8e7c3e0900e13',
     'art.map.door.wood-open-e.v1':
-      'f199cf8bb6d75f18e5a34ebaa4ed3808c6328ef6c21d53d631b28f0726aa9d44',
+      '16c7c1cfc1360611e33cd6af5084b75d5d0f9299d5e054222435c9ce014f9af5',
     'art.map.shade.n.v1':
       '09e8182832ec447ea30ece5111275ab37830fadb0999a5304c372a3c860ee38d',
     'art.map.shade.s.v1':
@@ -199,11 +203,11 @@
     'art.map.overlay.glyph-obscured.v1':
       '8409b44e5e7b6bdf1e9e83c6d60c5bcf5120b13a6345dd231de7446056765664',
     'art.terrain.rubble.v1':
-      '9200bcaff30d4f549f458e0741297507920645d4a3b2d72ccd9fd39161c00dd1',
+      '92ac3bf8c4a1214b5d3285bc04324c1e70ed288770af51cd13b53ccc52a39e5a',
     'art.terrain.crate.v1':
-      '15e8a1992b01668b47e6b818f20c0ac3dcb8ae6d12f0214779e6762a2e22c60c',
+      '59bf934699c54a56f43973cff8091e245492bfd93e879d4fb14b3c23ed0a1122',
     'art.terrain.pillar.v1':
-      '3acb1d1d6f6535d878458d84d84d2a840b6190d8c977cd8998f0f8bea9e08d5d',
+      '8ceef1dbf40a888b7d3cb477f85ce9a10439ad51fa70f939c2bc7b68d4affaa0',
     'art.terrain.hazard.v1':
       '775230c2456aa899a6d8083a80c4d3ad9c5337eed93b011b5db333cd1fff783c',
     'art.fog.hidden.v1':
@@ -220,9 +224,9 @@
       '9ab196fbb4fdaf18a9970a2e929928f58b1b43e0fcbbac8b98edabad83210acc',
   });
 
-/** sha256 of src/assets/starter-art-inputs.ts (native-density redraw, see above). */
+/** Canonical v5 length-framed fixed-input digest; authored output pins are licensed by raw-RGBA oracle checks. */
 export const EXPECTED_FIXED_INPUTS_SHA256 =
-  '9c5b298f22ed698dd0e46acc2829cbe4ac9429ab322175444710dea3428fb504';
+  'fd63baefa90bc2a1951ef7649a5c1596bd5b4e85c00aca7723fb879e01d3e226';
 /** sha256 of src/assets/preview/starter-art-board.svg; the preview embeds all 92 assets at integer scale. */
 export const EXPECTED_PREVIEW_SHA256 =
-  'dc820bcc67748b5cd4bbadcf8047960b8d3c7f86f65ad1a0058804f9a432ad6c';
+  '660df187b9f800520ddf048ed0deae0fa1466912617852298343910484825e6d';
diff --git a/tests/unit/assets/expected-authored-inventory.ts b/tests/unit/assets/expected-authored-inventory.ts
new file mode 100644
index 0000000000000000000000000000000000000000..e7826afb3aea2f5f76761445bb3ea540dcedce9e
--- /dev/null
+++ b/tests/unit/assets/expected-authored-inventory.ts
@@ -0,0 +1,66 @@
+/** Frozen authored inventory copied from the package manifest and external RGBA oracle. */
+export interface ExpectedAuthoredInventoryRow {
+  readonly requestId: string;
+  readonly rgbaSha256: string;
+  readonly equalityGroup: string | null;
+}
+export const EXPECTED_AUTHORED_INVENTORY: Readonly<Record<string, ExpectedAuthoredInventoryRow>> = Object.freeze({
+  'art.map.door.wood-e.v1': { requestId: '01a0846b-327f-72a5-867c-2d1b9e35c4cd', rgbaSha256: 'ac0444e9904c622feda83b374e1d0bbc3c5634b54676ae7a8fa429f6ba28494e', equalityGroup: null },
+  'art.map.door.wood-open-e.v1': { requestId: '01a0846b-32e6-7309-aeb9-0c68f1ef252f', rgbaSha256: '092ea4806709dff90b4f658c3c2d0f549b5e79d3c3910937af504b294eb19ba9', equalityGroup: null },
+  'art.map.door.wood-open-n.v1': { requestId: '01a0846b-3297-7d57-b509-0a1976964637', rgbaSha256: '9014392aa8fe8607ad823652d2d6f4387eaa87d5f1f2422642f087ca5aa2572e', equalityGroup: null },
+  'art.map.door.wood-open-s.v1': { requestId: '01a0846b-32b2-7143-9a67-c17e3fa56358', rgbaSha256: '21fd90028c68221f6742237294e8d1c7a9592c479213803604c5e160f835e31c', equalityGroup: null },
+  'art.map.door.wood-open-w.v1': { requestId: '01a0846b-32cf-7599-b7d0-e5b733d64990', rgbaSha256: '077f213f5fa249e6fcea75cdb6e6422f9bce91273e803a30476ee84c72abfbec', equalityGroup: null },
+  'art.map.door.wood-s.v1': { requestId: '01a0846b-3249-7c45-bb18-e8a1d311bb05', rgbaSha256: '8b6e536ffb5ccc08953ec8b84b666f3f617b20fbda7f069d4e41814dc003f5f7', equalityGroup: null },
+  'art.map.door.wood.v1': { requestId: '01a0846b-322f-7a90-967a-da70bed925db', rgbaSha256: 'd1bea66226a7c2f7d7df800929e7ec152193769a698c22cc8d0a9315242aa4e6', equalityGroup: null },
+  'art.map.door.wood-w.v1': { requestId: '01a0846b-3264-7fd7-9eb8-e7f8b2b55e73', rgbaSha256: 'cecd57d971960a2008933847daa69fe0e81d6a1e85650de7cdc1db6ba0d7f2d8', equalityGroup: null },
+  'art.map.floor.stone-1.v1': { requestId: '01a0846b-312b-731d-9fb9-3f17c694c8cd', rgbaSha256: '1c7f3131b4be73680b2f8d69b3e449845dbc8b6e647278711db53db28654ae7f', equalityGroup: null },
+  'art.map.floor.stone-2.v1': { requestId: '01a0846b-3140-78a2-b926-dad09cb2f8d0', rgbaSha256: '20d4bc658e397d59466658f45e07d19e89d07b3397a74c71db59093f2057ac67', equalityGroup: null },
+  'art.map.floor.stone-3.v1': { requestId: '01a0846b-3154-78fb-9ab7-ca68b2fdd4dd', rgbaSha256: '10f27a6138bb21e74838c905bbb74c59b4d306f26f86864f3b689e0776282f2c', equalityGroup: null },
+  'art.map.floor.stone.v1': { requestId: '01a0846b-3116-7111-adf5-030d8e8b8e8e', rgbaSha256: '1e25cb6245470ddceb2758fdd0d05775fe479b1f13ddcdf783e8331782980637', equalityGroup: null },
+  'art.map.wall.stone-e.v1': { requestId: '01a0846b-31b3-7457-828a-e0ac118e1531', rgbaSha256: 'c1c6f0fb8c49e049ebd345ca97171dfce4ebae42264e1cbb166963c65693dcc0', equalityGroup: null },
+  'art.map.wall.stone-ne.v1': { requestId: '01a0846b-31e0-7eeb-814c-feabb3ac94b2', rgbaSha256: '54261b98d08a4e11a7e29abb83a8ea0e3a3b7a5fd2732a6bd43133d52926a1d1', equalityGroup: null },
+  'art.map.wall.stone-nw.v1': { requestId: '01a0846b-31ca-7821-9ea7-ef8a2e326e74', rgbaSha256: 'f9f4d4c300e03664049d654b529192b6e9791bc40a94885b8a57a2cb026d4800', equalityGroup: null },
+  'art.map.wall.stone-s.v1': { requestId: '01a0846b-317f-721f-81fa-63d8d88de8d4', rgbaSha256: '8ebe4b2b918d137b9d6621c4935a4f8a4da60e8bf26d1b583ce8733523ffd73a', equalityGroup: null },
+  'art.map.wall.stone-se.v1': { requestId: '01a0846b-3212-7fb8-81da-620f3d8cd63b', rgbaSha256: '2146a5eb44c608e1259ab306f404f2009378566f29ff526ee8c320e14616ce11', equalityGroup: null },
+  'art.map.wall.stone-sw.v1': { requestId: '01a0846b-31f8-77c8-b4f9-60bb2ecfc27f', rgbaSha256: '1841e3f24e7d0355590f9e6d7ffccc424b3938aeb7d45bf5de73e8ca0691d83c', equalityGroup: null },
+  'art.map.wall.stone.v1': { requestId: '01a0846b-316a-7fdd-b7f6-2b1213e9cf4d', rgbaSha256: '2d41beaa0daf6a59adbeaa3941440d820073401ae235bb2e4474d2e5148f3aa3', equalityGroup: null },
+  'art.map.wall.stone-w.v1': { requestId: '01a0846b-3197-7b9f-8c74-435d35e487f4', rgbaSha256: '7e89702bd86fe2618cc66702c73cd74b7189fa973260adb267cc2084d085022d', equalityGroup: null },
+  'art.terrain.crate.v1': { requestId: '01a0846b-3551-7341-a47c-0496f006c54e', rgbaSha256: '0b2b83c27e566c7dacb8b7597f46288787563f631404d80e3b8b999eb809da00', equalityGroup: null },
+  'art.terrain.pillar.v1': { requestId: '01a0846b-3568-7e0a-a837-01d3d75a1b53', rgbaSha256: 'd1af6a8b98c2d39b66b4049942bfe7467a3c49057d905b4e50c3b45de9f340f7', equalityGroup: null },
+  'art.terrain.rubble.v1': { requestId: '01a0846b-353d-7d72-8c61-9bea82d93502', rgbaSha256: '3701535ccbb97c08660f02280c8c7ce5936cf127cba26be2961250e69782196e', equalityGroup: null },
+  'art.token.foe.beast.v1': { requestId: '01a0846b-3097-7f89-9c84-29ad22ef7d5f', rgbaSha256: '13859b7129d8d0c24ef1651cb36d8f7549091376dd0006356a303c86decaa6f4', equalityGroup: 'equality-1' },
+  'art.token.foe.brute.v1': { requestId: '01a0846b-3082-713c-bc3a-ff945f2e5ca6', rgbaSha256: '6c70cba8de072de3a48d144e87ad6c5c45205b4d64ce89351a938e291df86432', equalityGroup: 'equality-2' },
+  'art.token.foe.cleric.v1': { requestId: '01a0846b-3040-7fc4-8aae-e03e3a61494e', rgbaSha256: 'b0fee2fea661ad4e9e8c44823c5f8fe84ff692859ea5ce46feff99778ccdbeeb', equalityGroup: 'equality-3' },
+  'art.token.foe.construct.v1': { requestId: '01a0846b-30ec-7562-a637-01db060a56e7', rgbaSha256: '52b862a236c866be6dd5dc45a26910cbf72875165c54d7b8eb715db1c80ca939', equalityGroup: null },
+  'art.token.foe.fiend.v1': { requestId: '01a0846b-30c2-7a5d-8c22-c90f41febfce', rgbaSha256: 'c6dd6079496ae6322353b0e0ef2e9affe8c13497789fd21f0ac77d653d468eb6', equalityGroup: null },
+  'art.token.foe.fighter.v1': { requestId: '01a0846b-3015-7c46-859d-b416fddf7ffa', rgbaSha256: '427b8a22fec8ac8620e205b51c1040086168a25239ba87e6e81662b07fa6001f', equalityGroup: null },
+  'art.token.foe.ooze.v1': { requestId: '01a0846b-30d6-70b9-856e-c771162d3cb9', rgbaSha256: '3343bd456b73e335f6a6febee15a1da76969c7ad320b791a2c18eb9f3859ece6', equalityGroup: null },
+  'art.token.foe.ranger.v1': { requestId: '01a0846b-306d-7242-86fc-a9230a5c41fd', rgbaSha256: '9d6b694999410231157c34fcd94a9e86629d32ded00725d120b2c1813ed9ab25', equalityGroup: null },
+  'art.token.foe.rogue.v1': { requestId: '01a0846b-3057-734e-b584-99eb7cbae772', rgbaSha256: '0adc0f65e293a17d66f54b4b5b132e07e583238aae8badec9aa2b85e60885490', equalityGroup: null },
+  'art.token.foe.undead.v1': { requestId: '01a0846b-30ac-728f-ad56-e221b9aa1cb1', rgbaSha256: '832251f812fad6e4c2411ba4cfd83361b346c14410d161033bdbcf5b05c143e5', equalityGroup: 'equality-4' },
+  'art.token.foe.wizard.v1': { requestId: '01a0846b-302a-7b05-8293-aac83a4617d1', rgbaSha256: 'bf40a37576be783a4579d90867872d245291463f82e61830d12e0f6b3d338043', equalityGroup: null },
+  'art.token.monster.bandit-captain.v1': { requestId: '01a0846b-2e6c-7ba0-94ea-c01fd5158bfd', rgbaSha256: 'fef82595ba22826e09f0031c99e1b6a88625918bb7097019a8bf5fb29feb76b5', equalityGroup: null },
+  'art.token.monster.goblin-warrior.v1': { requestId: '01a0846b-2e3e-7e2e-b974-59165601e412', rgbaSha256: '5d813b7e6e50ae664966111be264c5fd70387c122c1728952f7ceb6baa66c066', equalityGroup: null },
+  'art.token.monster.hobgoblin-warrior.v1': { requestId: '01a0846b-2e56-79a1-8630-59b556e8e0e3', rgbaSha256: '5b53f9bfe041a8f4f40f5c8d1de4a0d662bc7557174c37a751655fc1db481be4', equalityGroup: null },
+  'art.token.monster.ogre.v1': { requestId: '01a0846b-2e84-7bdb-944b-4d8bc6b0f55e', rgbaSha256: '6c70cba8de072de3a48d144e87ad6c5c45205b4d64ce89351a938e291df86432', equalityGroup: 'equality-2' },
+  'art.token.monster.priest-acolyte.v1': { requestId: '01a0846b-2e9b-7267-8a6c-34c8244b2c61', rgbaSha256: '273e6ff8e640314974b0ffdb5762a20cd53164499b98b20802300bed8b6a5bbc', equalityGroup: null },
+  'art.token.monster.priest.v1': { requestId: '01a0846b-2eb1-704e-8d6f-4010df0796f4', rgbaSha256: 'b0fee2fea661ad4e9e8c44823c5f8fe84ff692859ea5ce46feff99778ccdbeeb', equalityGroup: 'equality-3' },
+  'art.token.monster.skeleton.v1': { requestId: '01a0846b-2ec8-7115-86c3-94cab8538ec5', rgbaSha256: '832251f812fad6e4c2411ba4cfd83361b346c14410d161033bdbcf5b05c143e5', equalityGroup: 'equality-4' },
+  'art.token.monster.wolf.v1': { requestId: '01a0846b-2ef6-7c21-92c8-2a7e8897b0bf', rgbaSha256: '13859b7129d8d0c24ef1651cb36d8f7549091376dd0006356a303c86decaa6f4', equalityGroup: 'equality-1' },
+  'art.token.monster.zombie.v1': { requestId: '01a0846b-2ede-780c-9ddd-c9ac94c6c486', rgbaSha256: '9ad30d20f14a6275e70a590d2a6da4fdc0166dfb348fb5d7fbba0492674fc199', equalityGroup: null },
+  'art.token.party.beast.v1': { requestId: '01a0846b-2fa3-723a-b1d5-bce570d1dfcf', rgbaSha256: '4d47daf25fd56e1bf8ea8191e5e780bd9f9da8d4d644a638fb46bda00cfdb4f3', equalityGroup: null },
+  'art.token.party.brute.v1': { requestId: '01a0846b-2f8e-7577-bc3c-5cb0789afdb8', rgbaSha256: 'c62602a61ac75a7c764c7aef984de54c1bff1f01f69bd6bcd478ef33d4e696a8', equalityGroup: null },
+  'art.token.party.cleric.v1': { requestId: '01a0846b-2f3e-7e13-a815-4aa36f7437bb', rgbaSha256: '0e34a97d0c8c601644aff2994c34d913f8bdbe867c5bb71ee10f0187d2a806e3', equalityGroup: 'equality-5' },
+  'art.token.party.construct.v1': { requestId: '01a0846b-2ffd-7d6c-8fc4-81c13a0abe1b', rgbaSha256: '1652c34523cf451e84f9c1d1a1a23a79e2cbaa45fc7c158d6cecfd1d17bf4750', equalityGroup: null },
+  'art.token.party.fiend.v1': { requestId: '01a0846b-2fd1-7204-a765-95d1e49ba6f8', rgbaSha256: '5c712260ffd56eff85128ca354800d8f5e4d0d234adbb49c5e4d42fb0dd50506', equalityGroup: null },
+  'art.token.party.fighter.v1': { requestId: '01a0846b-2f0e-71e7-bf1a-77fc942d91f1', rgbaSha256: '4482984f8e0948058b3bb7574de5cbf43b39be7adae2e0ff2a78a3f75e0b132e', equalityGroup: 'equality-6' },
+  'art.token.party.ooze.v1': { requestId: '01a0846b-2fe8-7dfd-a559-a63da1a92d96', rgbaSha256: '61a677a0c2697383b0b831fa87ce84d653fa8c29b85b9dcba367e63c73890ca6', equalityGroup: null },
+  'art.token.party.ranger.v1': { requestId: '01a0846b-2f77-7e3d-93eb-2e9eb2367d82', rgbaSha256: 'ed0af2b685a5f226d0197493579b190a099b7d745f2f585f2f4fe1279bfe1d11', equalityGroup: null },
+  'art.token.party.rogue.v1': { requestId: '01a0846b-2f5b-79b7-a067-084885059093', rgbaSha256: '7645a0c7bf67ddf114484fb166e83013f673a08cd7148f633271ec0b552166ef', equalityGroup: 'equality-7' },
+  'art.token.party.undead.v1': { requestId: '01a0846b-2fb9-7dc6-b082-ff60f09533df', rgbaSha256: '05ccae4a93ad1f1025e5bc91aa9eac01cf9a8cbdbcb95c2dc99d4bcaa5253fbe', equalityGroup: null },
+  'art.token.party.wizard.v1': { requestId: '01a0846b-2f24-7500-9530-72dab1d61687', rgbaSha256: 'ba60a878648f64594efe1ac45a4d9600099452eca87730d55d26f9be03228a25', equalityGroup: 'equality-8' },
+  'art.token.pc.cleric.v1': { requestId: '01a0846b-2df6-7ac1-976b-40ecd92fddb8', rgbaSha256: '0e34a97d0c8c601644aff2994c34d913f8bdbe867c5bb71ee10f0187d2a806e3', equalityGroup: 'equality-5' },
+  'art.token.pc.fighter.v1': { requestId: '01a0846b-2ddd-74cd-baa4-78bd5e16cafc', rgbaSha256: '4482984f8e0948058b3bb7574de5cbf43b39be7adae2e0ff2a78a3f75e0b132e', equalityGroup: 'equality-6' },
+  'art.token.pc.rogue.v1': { requestId: '01a0846b-2e22-7d50-98f6-495b885d1aed', rgbaSha256: '7645a0c7bf67ddf114484fb166e83013f673a08cd7148f633271ec0b552166ef', equalityGroup: 'equality-7' },
+  'art.token.pc.wizard.v1': { requestId: '01a0846b-2e0c-76bb-a375-efdd66541add', rgbaSha256: 'ba60a878648f64594efe1ac45a4d9600099452eca87730d55d26f9be03228a25', equalityGroup: 'equality-8' },
+});
diff --git a/tests/unit/assets/expected-authored-rgba.ts b/tests/unit/assets/expected-authored-rgba.ts
new file mode 100644
index 0000000000000000000000000000000000000000..26c82824b4d9e8e715609d028b1a66a074ddafd9
--- /dev/null
+++ b/tests/unit/assets/expected-authored-rgba.ts
@@ -0,0 +1,65 @@
+/**
+ * Frozen Pillow 9.0.1 128×128 raw-RGBA oracle supplied by the supervisor.
+ * Package manifest sha256: 3063157743ce7a0af3cabfb4793c9f9c815a06429f1e46dbad2331e73fc43c0b.
+ * candidate-rgba-oracle.json sha256: caea12fb3318eb2050b634cc2410a7dab964389d454754f9a3b0d3e47091d676.
+ */
+export const EXPECTED_AUTHORED_RGBA_SHA256: Readonly<Record<string, string>> = Object.freeze({
+  'art.map.door.wood-e.v1': 'ac0444e9904c622feda83b374e1d0bbc3c5634b54676ae7a8fa429f6ba28494e',
+  'art.map.door.wood-open-e.v1': '092ea4806709dff90b4f658c3c2d0f549b5e79d3c3910937af504b294eb19ba9',
+  'art.map.door.wood-open-n.v1': '9014392aa8fe8607ad823652d2d6f4387eaa87d5f1f2422642f087ca5aa2572e',
+  'art.map.door.wood-open-s.v1': '21fd90028c68221f6742237294e8d1c7a9592c479213803604c5e160f835e31c',
+  'art.map.door.wood-open-w.v1': '077f213f5fa249e6fcea75cdb6e6422f9bce91273e803a30476ee84c72abfbec',
+  'art.map.door.wood-s.v1': '8b6e536ffb5ccc08953ec8b84b666f3f617b20fbda7f069d4e41814dc003f5f7',
+  'art.map.door.wood.v1': 'd1bea66226a7c2f7d7df800929e7ec152193769a698c22cc8d0a9315242aa4e6',
+  'art.map.door.wood-w.v1': 'cecd57d971960a2008933847daa69fe0e81d6a1e85650de7cdc1db6ba0d7f2d8',
+  'art.map.floor.stone-1.v1': '1c7f3131b4be73680b2f8d69b3e449845dbc8b6e647278711db53db28654ae7f',
+  'art.map.floor.stone-2.v1': '20d4bc658e397d59466658f45e07d19e89d07b3397a74c71db59093f2057ac67',
+  'art.map.floor.stone-3.v1': '10f27a6138bb21e74838c905bbb74c59b4d306f26f86864f3b689e0776282f2c',
+  'art.map.floor.stone.v1': '1e25cb6245470ddceb2758fdd0d05775fe479b1f13ddcdf783e8331782980637',
+  'art.map.wall.stone-e.v1': 'c1c6f0fb8c49e049ebd345ca97171dfce4ebae42264e1cbb166963c65693dcc0',
+  'art.map.wall.stone-ne.v1': '54261b98d08a4e11a7e29abb83a8ea0e3a3b7a5fd2732a6bd43133d52926a1d1',
+  'art.map.wall.stone-nw.v1': 'f9f4d4c300e03664049d654b529192b6e9791bc40a94885b8a57a2cb026d4800',
+  'art.map.wall.stone-s.v1': '8ebe4b2b918d137b9d6621c4935a4f8a4da60e8bf26d1b583ce8733523ffd73a',
+  'art.map.wall.stone-se.v1': '2146a5eb44c608e1259ab306f404f2009378566f29ff526ee8c320e14616ce11',
+  'art.map.wall.stone-sw.v1': '1841e3f24e7d0355590f9e6d7ffccc424b3938aeb7d45bf5de73e8ca0691d83c',
+  'art.map.wall.stone.v1': '2d41beaa0daf6a59adbeaa3941440d820073401ae235bb2e4474d2e5148f3aa3',
+  'art.map.wall.stone-w.v1': '7e89702bd86fe2618cc66702c73cd74b7189fa973260adb267cc2084d085022d',
+  'art.terrain.crate.v1': '0b2b83c27e566c7dacb8b7597f46288787563f631404d80e3b8b999eb809da00',
+  'art.terrain.pillar.v1': 'd1af6a8b98c2d39b66b4049942bfe7467a3c49057d905b4e50c3b45de9f340f7',
+  'art.terrain.rubble.v1': '3701535ccbb97c08660f02280c8c7ce5936cf127cba26be2961250e69782196e',
+  'art.token.foe.beast.v1': '13859b7129d8d0c24ef1651cb36d8f7549091376dd0006356a303c86decaa6f4',
+  'art.token.foe.brute.v1': '6c70cba8de072de3a48d144e87ad6c5c45205b4d64ce89351a938e291df86432',
+  'art.token.foe.cleric.v1': 'b0fee2fea661ad4e9e8c44823c5f8fe84ff692859ea5ce46feff99778ccdbeeb',
+  'art.token.foe.construct.v1': '52b862a236c866be6dd5dc45a26910cbf72875165c54d7b8eb715db1c80ca939',
+  'art.token.foe.fiend.v1': 'c6dd6079496ae6322353b0e0ef2e9affe8c13497789fd21f0ac77d653d468eb6',
+  'art.token.foe.fighter.v1': '427b8a22fec8ac8620e205b51c1040086168a25239ba87e6e81662b07fa6001f',
+  'art.token.foe.ooze.v1': '3343bd456b73e335f6a6febee15a1da76969c7ad320b791a2c18eb9f3859ece6',
+  'art.token.foe.ranger.v1': '9d6b694999410231157c34fcd94a9e86629d32ded00725d120b2c1813ed9ab25',
+  'art.token.foe.rogue.v1': '0adc0f65e293a17d66f54b4b5b132e07e583238aae8badec9aa2b85e60885490',
+  'art.token.foe.undead.v1': '832251f812fad6e4c2411ba4cfd83361b346c14410d161033bdbcf5b05c143e5',
+  'art.token.foe.wizard.v1': 'bf40a37576be783a4579d90867872d245291463f82e61830d12e0f6b3d338043',
+  'art.token.monster.bandit-captain.v1': 'fef82595ba22826e09f0031c99e1b6a88625918bb7097019a8bf5fb29feb76b5',
+  'art.token.monster.goblin-warrior.v1': '5d813b7e6e50ae664966111be264c5fd70387c122c1728952f7ceb6baa66c066',
+  'art.token.monster.hobgoblin-warrior.v1': '5b53f9bfe041a8f4f40f5c8d1de4a0d662bc7557174c37a751655fc1db481be4',
+  'art.token.monster.ogre.v1': '6c70cba8de072de3a48d144e87ad6c5c45205b4d64ce89351a938e291df86432',
+  'art.token.monster.priest-acolyte.v1': '273e6ff8e640314974b0ffdb5762a20cd53164499b98b20802300bed8b6a5bbc',
+  'art.token.monster.priest.v1': 'b0fee2fea661ad4e9e8c44823c5f8fe84ff692859ea5ce46feff99778ccdbeeb',
+  'art.token.monster.skeleton.v1': '832251f812fad6e4c2411ba4cfd83361b346c14410d161033bdbcf5b05c143e5',
+  'art.token.monster.wolf.v1': '13859b7129d8d0c24ef1651cb36d8f7549091376dd0006356a303c86decaa6f4',
+  'art.token.monster.zombie.v1': '9ad30d20f14a6275e70a590d2a6da4fdc0166dfb348fb5d7fbba0492674fc199',
+  'art.token.party.beast.v1': '4d47daf25fd56e1bf8ea8191e5e780bd9f9da8d4d644a638fb46bda00cfdb4f3',
+  'art.token.party.brute.v1': 'c62602a61ac75a7c764c7aef984de54c1bff1f01f69bd6bcd478ef33d4e696a8',
+  'art.token.party.cleric.v1': '0e34a97d0c8c601644aff2994c34d913f8bdbe867c5bb71ee10f0187d2a806e3',
+  'art.token.party.construct.v1': '1652c34523cf451e84f9c1d1a1a23a79e2cbaa45fc7c158d6cecfd1d17bf4750',
+  'art.token.party.fiend.v1': '5c712260ffd56eff85128ca354800d8f5e4d0d234adbb49c5e4d42fb0dd50506',
+  'art.token.party.fighter.v1': '4482984f8e0948058b3bb7574de5cbf43b39be7adae2e0ff2a78a3f75e0b132e',
+  'art.token.party.ooze.v1': '61a677a0c2697383b0b831fa87ce84d653fa8c29b85b9dcba367e63c73890ca6',
+  'art.token.party.ranger.v1': 'ed0af2b685a5f226d0197493579b190a099b7d745f2f585f2f4fe1279bfe1d11',
+  'art.token.party.rogue.v1': '7645a0c7bf67ddf114484fb166e83013f673a08cd7148f633271ec0b552166ef',
+  'art.token.party.undead.v1': '05ccae4a93ad1f1025e5bc91aa9eac01cf9a8cbdbcb95c2dc99d4bcaa5253fbe',
+  'art.token.party.wizard.v1': 'ba60a878648f64594efe1ac45a4d9600099452eca87730d55d26f9be03228a25',
+  'art.token.pc.cleric.v1': '0e34a97d0c8c601644aff2994c34d913f8bdbe867c5bb71ee10f0187d2a806e3',
+  'art.token.pc.fighter.v1': '4482984f8e0948058b3bb7574de5cbf43b39be7adae2e0ff2a78a3f75e0b132e',
+  'art.token.pc.rogue.v1': '7645a0c7bf67ddf114484fb166e83013f673a08cd7148f633271ec0b552166ef',
+  'art.token.pc.wizard.v1': 'ba60a878648f64594efe1ac45a4d9600099452eca87730d55d26f9be03228a25',
+});
diff --git a/tests/unit/assets/expected-preserved-art-hashes.ts b/tests/unit/assets/expected-preserved-art-hashes.ts
new file mode 100644
index 0000000000000000000000000000000000000000..7c5e92e532bdd5c1463d6b98f65fb9e7d0667cf6
--- /dev/null
+++ b/tests/unit/assets/expected-preserved-art-hashes.ts
@@ -0,0 +1,37 @@
+/** Pre-Quietstone pins for the 34 recipes that remain procedural. */
+export const EXPECTED_PRESERVED_ART_SHA256: Readonly<Record<string, string>> = Object.freeze({
+  'art.token.dead.v1': '31913b2c3b0a8e8f1c33069b04647b61dee6c11f5fc5555bffe0833c7cf0be36',
+  'art.map.shade.n.v1': '09e8182832ec447ea30ece5111275ab37830fadb0999a5304c372a3c860ee38d',
+  'art.map.shade.s.v1': 'ccaeb74cf005d950a60486363da7fa3f5678d640ea20b7f272ec4fc28929a1ed',
+  'art.map.shade.w.v1': '10e8f27b751b6f7544c2e124055e75029e7315ca212f10d48a7533f111b91900',
+  'art.map.shade.e.v1': 'c56da5e1f8084e00c8331efe56e56d5c29830dc2c08ed9f41630b8ded3814aaf',
+  'art.map.overlay.difficult.v1': '59be65303261b38de23d087083fba541d2379cbbc468ad953baa719a58dba39b',
+  'art.map.overlay.obscurement-light.v1': 'd9b836bd67132f23225da2636085af84b9f066414673bd2f329bb12a00273158',
+  'art.map.overlay.obscurement-heavy.v1': '8d0839c5d6552742a193f81f7b0f71c8fbddcac1c6e7edd3c0ed9445e3d9ea11',
+  'art.map.overlay.magical-darkness.v1': '18826a590a87b7244b22ab9b67e725d4291caec9499dc7e17e1b4fe109af9af0',
+  'art.map.overlay.light-bright.v1': 'c1b584656185cc78ce3e11398fb4be61ccd8e74c6480cf6108e23c3ec24f9948',
+  'art.map.overlay.light-dim.v1': 'caa4a45296607dc8735d77d4eb0683ff5ea1cc13b2bd5a09892fb615e4571a57',
+  'art.map.overlay.light-darkness.v1': 'd5bcc7c2f3489f6d5469cefb72cf776649595aa1626426ad5e56871d1668fd7c',
+  'art.map.overlay.blocked.v1': '7c33b3fcf9324a818185c7bfe4464cc38af78f052c86770f6b6b75364da48956',
+  'art.map.overlay.terrain-half-cover.v1': '3cdbc7fb157c3469179e528e8d2b8ed9c2dc14fe6819a6f0afba6bb4782d14d6',
+  'art.map.overlay.terrain-three-quarters-cover.v1': 'f9305fa80fd47001e15678ef467b3b8733dd62dffdbc7a8f60093daa7be7f83b',
+  'art.map.overlay.light-source.v1': 'c7d9abf3e1369eb509dcd29865e7413d487a1f645a106af61cc04ff915f97766',
+  'art.map.overlay.light-glyph-bright.v1': '3f938dc9199c4d2dcbb8a4cdab68a6114a692f87dc7f9189bb4a7ecb1dab7e44',
+  'art.map.overlay.light-glyph-dim.v1': 'c9dc4ca4547c5b6d9455cf2dda9125bfab29a5ac7c41c57022ef9d0b4a26669d',
+  'art.map.overlay.light-glyph-dark.v1': '8158fdfa90bb05914a308a12ea8b7380912c322326713666a00c3989667147d7',
+  'art.map.overlay.glyph-blocked.v1': 'ed4fd0107db1ec30aa7a610f520c90bb006d5e16dbbb22935ccdbdda3b174b9e',
+  'art.map.overlay.glyph-door-closed.v1': '9d06a29037ed243e5763b21d95af4b24393ac1a0f6f5a61834706ff56fcbbf19',
+  'art.map.overlay.glyph-door-open.v1': '67eab988aa7766b89190664db7b90a34b8c7563857d7bdc666e434b9b6706596',
+  'art.map.overlay.glyph-terrain-half.v1': '6b19cdbf885b366e916dba0d0fd957fcf20568335cc07153a861bb4bcc8d1ba3',
+  'art.map.overlay.glyph-terrain-three-quarters.v1': '34dee7be073df742fbf089fc7db7d6972adb403f765657ee8619446efc6343a0',
+  'art.map.overlay.glyph-terrain-wall.v1': '0a78bfef67294b6fe83a8442f8cf691bd9a8186c8f090089ac24050640faa830',
+  'art.map.overlay.glyph-fog.v1': '53aa42b20ed165438a0efcd22612a9d653640f70d56eff8c6cfe2772c1c15ee0',
+  'art.map.overlay.glyph-obscured.v1': '8409b44e5e7b6bdf1e9e83c6d60c5bcf5120b13a6345dd231de7446056765664',
+  'art.terrain.hazard.v1': '775230c2456aa899a6d8083a80c4d3ad9c5337eed93b011b5db333cd1fff783c',
+  'art.fog.hidden.v1': '6f4ad6577896274df2ef43bc6a2c24f364e41891e01fb1b8b24d0cda201ba6b0',
+  'art.fog.unexplored.v1': 'e9ae1694c16574d95cd9ef6ad3e8fb472d589dabfadb6fc802959f9330d69236',
+  'art.fog.revealed.v1': 'd6ddc84737bba1dd5b0e888fde7de939aa7c863a2de2c2345697e315c7fa6183',
+  'art.focus.active-pc.v1': '629c92942a90ff66ef850e6d611c366f49d24cae6ec2984baa794059aaa05291',
+  'art.focus.hidden.v1': 'dc7911da16f99abb80bda77c28d6c0c30b5412278965725a1b33a1982894a847',
+  'art.event.adjudicated.v1': '9ab196fbb4fdaf18a9970a2e929928f58b1b43e0fcbbac8b98edabad83210acc',
+});
diff --git a/tests/unit/assets/palette.test.ts b/tests/unit/assets/palette.test.ts
index b8ae4f4a00a8ef8c14c2e498de2c1489c9437094..c36c82ac684f91dfaa05d54ca4abc86d19861ba6
--- a/tests/unit/assets/palette.test.ts
+++ b/tests/unit/assets/palette.test.ts
@@ -14,6 +14,7 @@
   paletteHsl,
   paletteRgb,
   ramp,
+  type PaletteColorRef,
   type RampStep,
 } from '../../../src/assets/palette';
 
@@ -34,6 +35,27 @@
 }
 
 describe('D516 palette rule: 8 hue ramps × 7 steps + 9 neutrals, generated', () => {
+  it('pins the exact seven generated near-twin pairs below eight RGB units', () => {
+    const references: PaletteColorRef[] = [
+      ...PALETTE_RAMPS.flatMap((name) => RAMP_STEPS.map((step) => ({ ramp: name, step } as const))),
+      ...NEUTRAL_STEPS.map((step) => ({ ramp: 'neutral', step } as const)),
+    ];
+    const nearTwins: string[] = [];
+    for (let left = 0; left < references.length; left += 1) {
+      for (let right = left + 1; right < references.length; right += 1) {
+        const a = references[left]!; const b = references[right]!;
+        const ar = paletteRgb(a); const br = paletteRgb(b);
+        if (Math.hypot(ar.red - br.red, ar.green - br.green, ar.blue - br.blue) < 8) {
+          nearTwins.push(`${a.ramp}${String(a.step)}-${b.ramp}${String(b.step)}`);
+        }
+      }
+    }
+    expect(nearTwins).toEqual([
+      'stone1-metal0', 'stone2-metal1', 'stone3-metal2', 'wood0-earth0',
+      'moss0-neutral0', 'cloth-warm5-skin3', 'cloth-warm6-skin4',
+    ]);
+  });
+
   it('turns 12–18° toward blue-violet and loses 10 % saturation per shadow step', () => {
     for (const name of PALETTE_RAMPS) {
       for (let step = RAMP_BASE_STEP - 1; step >= 0; step -= 1) {
diff --git a/tests/unit/assets/pixel-art.test.ts b/tests/unit/assets/pixel-art.test.ts
index f370b66df24540b1b55ad72fd0ab0607c2180cf2..7f99ff505cea8d6ee4fe6acb83aff5234fb43a4a
--- a/tests/unit/assets/pixel-art.test.ts
+++ b/tests/unit/assets/pixel-art.test.ts
@@ -16,10 +16,21 @@
   type WallPiece,
 } from '../../../src/assets/pixel-art';
 import { pngDimensions } from '../../../src/assets/png';
-import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
+import { assetId } from '../../../src/assets/ids';
+import { paletteRgb } from '../../../src/assets/palette';
+import { STARTER_ART_INPUTS, STARTER_ART_INPUTS_BY_ID } from '../../../src/assets/starter-art-inputs';
 
 const wall = (piece: WallPiece): Bitmap => paintRecipe({ kind: 'wall', material: 'stone', piece });
 const door = (side: BandSide, state: 'closed' | 'open'): Bitmap => paintRecipe({ kind: 'door', material: 'wood', side, state });
+const production = (id: string): Bitmap => {
+  const input = STARTER_ART_INPUTS_BY_ID.get(assetId(id));
+  if (input === undefined) throw new Error(`Missing production art ${id}.`);
+  return paintRecipe(input.recipe);
+};
+const productionWall = (piece: WallPiece): Bitmap => production(piece === 'n' ? 'art.map.wall.stone.v1' : `art.map.wall.stone-${piece}.v1`);
+const productionDoor = (side: BandSide, state: 'closed' | 'open'): Bitmap => production(state === 'closed'
+  ? side === 'n' ? 'art.map.door.wood.v1' : `art.map.door.wood-${side}.v1`
+  : `art.map.door.wood-open-${side}.v1`);
 
 function expectEdge(label: string, left: Uint8Array, right: Uint8Array): void {
   expect(bytesEqual(left, right), label).toBe(true);
@@ -83,6 +94,92 @@
   });
 });
 
+describe('Quietstone production wall, floor, and door invariants', () => {
+  it('continues every production corner and door at the straight-band seams', () => {
+    const n = productionWall('n'); const s = productionWall('s'); const w = productionWall('w'); const e = productionWall('e');
+    const nw = productionWall('nw'); const ne = productionWall('ne'); const sw = productionWall('sw'); const se = productionWall('se');
+    const last = TILE_SIZE - 1;
+    expectEdge('production nw|n', nw.column(last), n.column(last)); expectEdge('production n|ne', ne.column(0), n.column(0));
+    expectEdge('production sw|s', sw.column(last), s.column(last)); expectEdge('production s|se', se.column(0), s.column(0));
+    expectEdge('production nw/w', nw.row(last), w.row(last)); expectEdge('production w/sw', sw.row(0), w.row(0));
+    expectEdge('production ne/e', ne.row(last), e.row(last)); expectEdge('production e/se', se.row(0), e.row(0));
+    for (const state of DOOR_STATES) {
+      expectEdge(`production door-n ${state}`, productionDoor('n', state).column(0), n.column(0));
+      expectEdge(`production door-s ${state}`, productionDoor('s', state).column(last), s.column(last));
+      expectEdge(`production door-w ${state}`, productionDoor('w', state).row(0), w.row(0));
+      expectEdge(`production door-e ${state}`, productionDoor('e', state).row(last), e.row(last));
+    }
+  });
+
+  it('keeps four opaque distinct production floors with identical boundary pixels', () => {
+    const floors = FLOOR_VARIANTS.map((variant) => production(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`));
+    expect(new Set(floors.map((bitmap) => Buffer.from(bitmap.data).toString('base64'))).size).toBe(4);
+    for (const floor of floors) for (let index = 3; index < floor.data.length; index += 4) expect(floor.data[index]).toBe(255);
+    for (const floor of floors.slice(1)) {
+      expectEdge('production floor top', floor.row(0), floors[0]!.row(0)); expectEdge('production floor bottom', floor.row(127), floors[0]!.row(127));
+      expectEdge('production floor left', floor.column(0), floors[0]!.column(0)); expectEdge('production floor right', floor.column(127), floors[0]!.column(127));
+    }
+  });
+
+  it('rejects broken production seam, opacity, and distinct-floor controls', () => {
+    const north = productionWall('n');
+    const brokenSeam = new Bitmap(TILE_SIZE, TILE_SIZE); brokenSeam.data.set(north.data);
+    brokenSeam.data.set([0, 0, 0, 0], (127 * 4));
+    expect(bytesEqual(brokenSeam.column(127), north.column(127))).toBe(false);
+
+    const floor = production('art.map.floor.stone.v1');
+    const transparent = new Bitmap(TILE_SIZE, TILE_SIZE); transparent.data.set(floor.data);
+    transparent.data[3] = 0;
+    expect(Array.from({ length: transparent.data.length / 4 }, (_unused, index) => transparent.data[index * 4 + 3])
+      .every((alpha) => alpha === 255)).toBe(false);
+    expect(new Set([floor, floor, floor, floor].map((bitmap) => Buffer.from(bitmap.data).toString('base64'))).size).toBe(1);
+  });
+
+  it('puts straight and corner floor-facing strips on their semantic sides', () => {
+    const dark = paletteRgb({ ramp: 'neutral', step: 0 });
+    const darkCount = (pixels: Uint8Array): number => {
+      let count = 0;
+      for (let index = 0; index < pixels.length; index += 4) if (pixels[index] === dark.red && pixels[index + 1] === dark.green && pixels[index + 2] === dark.blue) count += 1;
+      return count;
+    };
+    const sides = (bitmap: Bitmap, minimum: number): readonly string[] => [
+      darkCount(bitmap.row(0)) >= minimum ? 'top' : '', darkCount(bitmap.row(127)) >= minimum ? 'bottom' : '',
+      darkCount(bitmap.column(0)) >= minimum ? 'left' : '', darkCount(bitmap.column(127)) >= minimum ? 'right' : '',
+    ].filter(Boolean);
+    expect(sides(productionWall('n'), 64)).toEqual(['bottom']); expect(sides(productionWall('s'), 64)).toEqual(['top']);
+    expect(sides(productionWall('w'), 64)).toEqual(['right']); expect(sides(productionWall('e'), 64)).toEqual(['left']);
+    expect(sides(productionWall('nw'), 1)).toEqual(['bottom', 'right']); expect(sides(productionWall('ne'), 1)).toEqual(['bottom', 'left']);
+    expect(sides(productionWall('sw'), 1)).toEqual(['top', 'right']); expect(sides(productionWall('se'), 1)).toEqual(['top', 'left']);
+  });
+
+  it('keeps closed leaves across and open leaves perpendicular to a clear aperture', () => {
+    const wood = new Set([0, 1, 2, 3, 4, 5, 6].map((step) => {
+      const color = paletteRgb({ ramp: 'wood', step: step as 0 | 1 | 2 | 3 | 4 | 5 | 6 }); return `${String(color.red)},${String(color.green)},${String(color.blue)}`;
+    }));
+    const dark = paletteRgb({ ramp: 'neutral', step: 0 });
+    const leaf = (bitmap: Bitmap, x: number, y: number): boolean => {
+      const pixel = bitmap.get(x, y); return wood.has(`${String(pixel.red)},${String(pixel.green)},${String(pixel.blue)}`) || (pixel.red === dark.red && pixel.green === dark.green && pixel.blue === dark.blue);
+    };
+    const normalize = (bitmap: Bitmap, side: BandSide, x: number, y: number): boolean => {
+      switch (side) {
+        case 'n': return leaf(bitmap, x, y); case 's': return leaf(bitmap, 127 - x, 127 - y);
+        case 'w': return leaf(bitmap, y, 127 - x); case 'e': return leaf(bitmap, 127 - y, x);
+      }
+    };
+    const isClosed = (bitmap: Bitmap, side: BandSide): boolean => Array.from({ length: 128 }, (_unused, x) => normalize(bitmap, side, x, 90)).filter(Boolean).length >= 76;
+    const isOpen = (bitmap: Bitmap, side: BandSide): boolean => {
+      const vertical = Array.from({ length: 128 }, (_unused, y) => normalize(bitmap, side, 32, y)).filter(Boolean).length >= 76;
+      const aperture = Array.from({ length: 58 }, (_unused, offset) => !normalize(bitmap, side, 44 + offset, 90)).every(Boolean);
+      return vertical && aperture;
+    };
+    for (const side of BAND_SIDES) {
+      const closed = productionDoor(side, 'closed'); const open = productionDoor(side, 'open');
+      expect(isClosed(closed, side), `${side} closed`).toBe(true); expect(isOpen(open, side), `${side} open`).toBe(true);
+      expect(isClosed(open, side), `${side} swapped open`).toBe(false); expect(isOpen(closed, side), `${side} swapped closed`).toBe(false);
+    }
+  });
+});
+
 describe('D516 tokens', () => {
   const tokenRecipes: readonly ArtRecipe[] = [
     ...TOKEN_SIDES.flatMap((side) => TOKEN_ARCHETYPES.map((archetype): ArtRecipe => tokenRecipe(archetype, side))),
@@ -227,6 +324,7 @@
       ['half_cover', 'wall'],
       ['three_quarters_cover', 'wall'],
     ] as const;
+    expect(meanRgbDistance(terrain.half_cover, terrain.half_cover)).toBe(0);
     for (const [left, right] of pairs) expect(maskDistance(terrain[left], terrain[right]), `${left}/${right}`).toBeGreaterThanOrEqual(3_000);
     const lightTreatments = [null, 'light-bright', 'light-dim', 'light-darkness'] as const;
     for (const variant of FLOOR_VARIANTS) {
@@ -241,5 +339,19 @@
         }
       }
     }
+    for (const variant of FLOOR_VARIANTS) {
+      const floor = production(variant === 0
+        ? 'art.map.floor.stone.v1'
+        : `art.map.floor.stone-${String(variant)}.v1`);
+      for (const light of lightTreatments) {
+        const lightLayer = light === null ? [] : [paintRecipe({ kind: 'overlay', material: 'semantic', effect: light })];
+        for (const [left, right] of pairs) {
+          const leftCell = composite([floor, terrain[left], ...lightLayer]);
+          const rightCell = composite([floor, terrain[right], ...lightLayer]);
+          expect(meanRgbDistance(leftCell, rightCell), `production floor ${String(variant)} / ${String(light)} / ${left}/${right}`)
+            .toBeGreaterThanOrEqual(8);
+        }
+      }
+    }
   });
 });
diff --git a/tests/unit/assets/starter-art.test.ts b/tests/unit/assets/starter-art.test.ts
index dca400f6b380aba115cc44cc1919acf4ae47c833..54fd2bb5ccf03fce90e19e9628bb85954c208dd3
--- a/tests/unit/assets/starter-art.test.ts
+++ b/tests/unit/assets/starter-art.test.ts
@@ -23,13 +23,13 @@
   starterArtDataUri,
 } from '../../../src/assets/starter-art-resolver';
 import { STARTER_ART_INPUTS } from '../../../src/assets/starter-art-inputs';
-import starterArtInputsSource from '../../../src/assets/starter-art-inputs.ts?raw';
 import { renderLegalPage } from '../../../src/ui/screens/legal/legal';
 import {
   BUNDLED_LICENSE_FILES,
   bundledLicenseAssets,
 } from '../../../tools/licenses/bundled-license-files';
 import { STARTER_ART_PREVIEW_PATH, generateStarterArt, useAsset } from '../../../tools/assets/generate-starter-art';
+import { fixedInputPaths, frameFixedInputs } from '../../../tools/assets/emit-starter-art-hashes';
 import {
   EXPECTED_FIXED_INPUTS_SHA256,
   EXPECTED_PREVIEW_SHA256,
@@ -85,7 +85,7 @@
   'art.token.monster.wolf.v1',
 ] as const;
 
-describe('procedural starter-art manifest and deterministic outputs (native generator 4.0.0)', () => {
+describe('procedural and authored starter-art manifest and deterministic outputs (generator 5.0.0)', () => {
   it('M576-E3-FRACTIONAL-RESAMPLE permits only native 128 px integer-scale placement', () => {
     expect(useAsset('art.map.overlay.terrain-half-cover.v1', 0, 0, 128)).toContain('scale(1)');
     expect(useAsset('art.map.overlay.terrain-three-quarters-cover.v1', 0, 0, 256)).toContain('scale(2)');
@@ -108,8 +108,8 @@
     expect(Object.keys(EXPECTED_STARTER_ART_SHA256)).toHaveLength(EXPECTED_ASSET_COUNT);
     expect(STARTER_ART_MANIFEST.generator).toEqual({
       id: 'starter-pixel-art',
-      version: '4.0.0',
-      fixedInputSet: 'starter-art-inputs-v4',
+      version: '5.0.0',
+      fixedInputSet: 'starter-art-inputs-v5',
       fixedInputsSha256: EXPECTED_FIXED_INPUTS_SHA256,
     });
     expect(STARTER_ART_MANIFEST.assets.every((entry) =>
@@ -125,7 +125,7 @@
 
     expect(() => decodeArtManifest(mutated)).toThrow();
     expect(STARTER_ART_MANIFEST.assets.every((entry) =>
-      entry.license.spdx === 'CC0-1.0' && entry.source.type === 'procedural',
+      entry.license.spdx === 'CC0-1.0' && (entry.source.type === 'procedural' || entry.source.type === 'authored'),
     )).toBe(true);
   });
 
@@ -147,9 +147,15 @@
       expect(entry.output.sha256, entry.id).toBe(expected);
       expect(pngDimensions(rendered), entry.id).toEqual({ width: TILE_SIZE, height: TILE_SIZE });
     }
-    expect(sha256(starterArtInputsSource)).toBe(
-      EXPECTED_FIXED_INPUTS_SHA256,
-    );
+    const sources = fixedInputPaths().map((path) => ({ path, bytes: bytes(path) }));
+    expect(sha256(frameFixedInputs(sources))).toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    const mutated = sources.map((source, index) => index === 2 ? { ...source, bytes: Buffer.concat([source.bytes, Buffer.from('x')]) } : source);
+    expect(sha256(frameFixedInputs(mutated))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    expect(sha256(frameFixedInputs(sources.slice(0, -1)))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
+    const remapped = sources.map((source) => source.path === 'src/assets/authored/index.ts'
+      ? { ...source, bytes: Buffer.from(source.bytes.toString('utf8').replace("'art.token.pc.fighter.v1'", "'art.token.pc.fighter.v2'"), 'utf8') }
+      : source);
+    expect(sha256(frameFixedInputs(remapped))).not.toBe(EXPECTED_FIXED_INPUTS_SHA256);
   });
 
   it('renders byte-identically from equal fixed inputs', () => {
@@ -242,14 +248,38 @@
     expect(guard).toContain(declaration?.sha256);
   });
 
-  it('contains no external art-family provenance', () => {
+  it('contains only the procedural and authored source union with unchanged contributors', () => {
     const serialized = JSON.stringify(STARTER_ART_MANIFEST).toLowerCase();
     expect(serialized).not.toContain('game-icons');
-    expect(serialized).not.toContain('external');
+    expect(new Set(STARTER_ART_MANIFEST.assets.map((entry) => entry.source.type)))
+      .toEqual(new Set(['procedural', 'authored']));
     expect(new Set(STARTER_ART_MANIFEST.assets.map((entry) => entry.source.creator)))
       .toEqual(new Set(['SRD-55 contributors']));
   });
 
+  it('binds every authored manifest row to its tracked request and repository provenance', () => {
+    const provenance = text('ART-PROVENANCE.md');
+    const requestNames = readdirSync(join(repositoryRoot, 'art/requests'));
+    const authored = STARTER_ART_MANIFEST.assets.filter((entry) => entry.source.type === 'authored');
+    expect(authored).toHaveLength(58);
+    for (const row of authored) {
+      if (row.source.type !== 'authored') throw new Error(`${row.id} is not authored.`);
+      const source = row.source;
+      const requestName = requestNames.find((name) => name.startsWith(`${source.requestId}-`) && name.endsWith('.json'));
+      expect(requestName, row.id).toBeDefined();
+      if (requestName === undefined) continue;
+      const request = JSON.parse(text(`art/requests/${requestName}`)) as {
+        readonly redoOf?: unknown; readonly license?: unknown;
+        readonly dimensions?: { readonly width?: unknown; readonly height?: unknown };
+      };
+      expect(request.redoOf, row.id).toBe(`public/${row.output.path}`);
+      expect(request.license, row.id).toBe('CC0-1.0');
+      expect(request.dimensions, row.id).toEqual(expect.objectContaining({ width: 128, height: 128 }));
+      expect(provenance, source.requestId).toContain(source.requestId);
+      expect(provenance, source.packageId).toContain(source.packageId);
+    }
+  });
+
   it('pins the visual-review artifact and both projection markers', () => {
     const preview = text(STARTER_ART_PREVIEW_PATH);
     expect(sha256(preview)).toBe(EXPECTED_PREVIEW_SHA256);
diff --git a/tests/unit/assets/token-archetypes.test.ts b/tests/unit/assets/token-archetypes.test.ts
index dea0d02c7e6f7bd7c549d68b7d67d33b59e51352..b138a788097888f9e34ae6f2e282832402716725
--- a/tests/unit/assets/token-archetypes.test.ts
+++ b/tests/unit/assets/token-archetypes.test.ts
@@ -45,12 +45,15 @@
         const id = tokenAssetFor(type === undefined ? { kind } : { kind, creatureType: type });
         const input = STARTER_ART_INPUTS_BY_ID.get(id);
         expect(input, id).toBeDefined();
-        expect(input?.recipe.kind).toBe('token');
-        if (input?.recipe.kind === 'token') {
-          expect(input.recipe.side).toBe(kind === 'player_character' ? 'party' : 'foe');
+        const family = input?.recipe.kind === 'authored' ? input.recipe.family : input?.recipe;
+        expect(family?.kind).toBe('token');
+        if (family?.kind === 'token') {
+          expect(family.side).toBe(kind === 'player_character' ? 'party' : 'foe');
         }
       }
     }
+    expect(String(tokenAssetFor({ kind: 'player_character' }))).toBe('art.token.party.fighter.v1');
+    expect(String(tokenAssetFor({ kind: 'monster' }))).toBe('art.token.foe.brute.v1');
     expect(String(tokenAssetFor({ kind: 'monster', creatureType: 'Undead' }))).toBe('art.token.foe.undead.v1');
     expect(String(tokenAssetFor({ kind: 'monster', creatureType: 'Beast' }))).toBe('art.token.foe.beast.v1');
   });
diff --git a/tools/assets/authored-art-import-core.ts b/tools/assets/authored-art-import-core.ts
new file mode 100644
index 0000000000000000000000000000000000000000..a03cc252d404d7add28d93277b640c7d3ff19afa
--- /dev/null
+++ b/tools/assets/authored-art-import-core.ts
@@ -0,0 +1,126 @@
+import { createHash } from 'node:crypto';
+import {
+  NEUTRAL_STEPS,
+  PALETTE_RAMPS,
+  RAMP_STEPS,
+  paletteHex,
+  type PaletteColorRef,
+} from '../../src/assets/palette';
+
+export interface ImportedAuthoredArt {
+  readonly id: string;
+  readonly requestId: string;
+  readonly packageId: string;
+  readonly svgSha256: string;
+  readonly pngSha256: string;
+  readonly rows: readonly string[];
+  readonly rgba: Uint8Array;
+}
+
+interface ParsedRect {
+  readonly x: number;
+  readonly y: number;
+  readonly width: number;
+  readonly height: number;
+  readonly color: PaletteColorRef;
+  readonly alpha: 128 | 255;
+}
+
+const CODE_BY_RAMP = Object.freeze({
+  stone: 's', wood: 'w', earth: 'e', moss: 'm',
+  'cloth-warm': 'W', 'cloth-cool': 'C', metal: 'M', skin: 'k', neutral: 'n',
+} as const);
+
+const PALETTE_BY_HEX = new Map<string, PaletteColorRef>([
+  ...PALETTE_RAMPS.flatMap((ramp) => RAMP_STEPS.map((step) => [paletteHex({ ramp, step }), { ramp, step }] as const)),
+  ...NEUTRAL_STEPS.map((step) => [paletteHex({ ramp: 'neutral', step }), { ramp: 'neutral', step }] as const),
+]);
+
+function integerAttribute(attributes: string, name: string): number {
+  const match = new RegExp(`(?:^|\\s)${name}="([^"]+)"`, 'u').exec(attributes);
+  if (match === null || !/^\d+$/u.test(match[1]!)) throw new Error(`${name} must be a non-negative integer.`);
+  return Number(match[1]);
+}
+
+function parseRect(attributes: string): ParsedRect {
+  const allowed = /^(?:\s+(?:x|y|width|height|fill|fill-opacity)="[^"]+")+\s*$/u;
+  if (!allowed.test(attributes)) throw new Error(`Unsupported rect attribute syntax:${attributes}`);
+  const names = Array.from(attributes.matchAll(/\s+([a-z-]+)="/gu), (match) => match[1]!);
+  if (new Set(names).size !== names.length) throw new Error('Duplicate rect attribute.');
+  for (const required of ['x', 'y', 'width', 'height', 'fill']) {
+    if (!names.includes(required)) throw new Error(`Missing rect ${required}.`);
+  }
+  const x = integerAttribute(attributes, 'x');
+  const y = integerAttribute(attributes, 'y');
+  const width = integerAttribute(attributes, 'width');
+  const height = integerAttribute(attributes, 'height');
+  if (width < 1 || height < 1 || x + width > 128 || y + height > 128) throw new Error('Rect is outside the 128×128 canvas.');
+  const fill = /(?:^|\s)fill="(#[0-9a-fA-F]{6})"/u.exec(attributes)?.[1]?.toLowerCase();
+  if (fill === undefined) throw new Error('Rect fill must be a six-digit hex colour.');
+  const color = PALETTE_BY_HEX.get(fill);
+  if (color === undefined) throw new Error(`Unknown palette colour ${fill}.`);
+  const opacity = /(?:^|\s)fill-opacity="([^"]+)"/u.exec(attributes)?.[1];
+  if (opacity !== undefined && opacity !== '0.501960784314') throw new Error(`Unsupported fill opacity ${opacity}.`);
+  return { x, y, width, height, color, alpha: opacity === undefined ? 255 : 128 };
+}
+
+export function parseAuthoredSvg(svg: string): { readonly rows: readonly string[]; readonly rgba: Uint8Array } {
+  const normalized = svg.replaceAll('\r\n', '\n');
+  const wrapper = /^<\?xml version='1\.0' encoding='utf-8'\?>\n?<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="128" height="128" viewBox="0 0 128 128" shape-rendering="crispEdges">([\s\S]*)<\/svg>\n*$/u.exec(normalized);
+  if (wrapper === null) throw new Error('Unsupported SVG wrapper.');
+  let body = wrapper[1]!;
+  body = body.replace(/^<title>[^<]*<\/title>/u, '').replace(/^<desc>[^<]*<\/desc>/u, '');
+  const rectangles: ParsedRect[] = [];
+  let consumed = '';
+  for (const match of body.matchAll(/<rect([^>]*)\s*\/>/gu)) {
+    consumed += match[0];
+    rectangles.push(parseRect(match[1]!));
+  }
+  if (consumed !== body) throw new Error('SVG contains an unsupported element or text node.');
+  const refs = new Array<(PaletteColorRef & { readonly alpha: 128 | 255 }) | null>(128 * 128).fill(null);
+  for (const rectangle of rectangles) {
+    for (let y = rectangle.y; y < rectangle.y + rectangle.height; y += 1) {
+      for (let x = rectangle.x; x < rectangle.x + rectangle.width; x += 1) {
+        const index = y * 128 + x;
+        if (refs[index] !== null) throw new Error(`Overlapping rectangles at ${String(x)},${String(y)}.`);
+        refs[index] = { ...rectangle.color, alpha: rectangle.alpha };
+      }
+    }
+  }
+  const rgba = new Uint8Array(128 * 128 * 4);
+  const rows: string[] = [];
+  for (let y = 0; y < 128; y += 1) {
+    const tokens: string[] = [];
+    let x = 0;
+    while (x < 128) {
+      const ref = refs[y * 128 + x] ?? null;
+      let length = 1;
+      while (x + length < 128 && JSON.stringify(refs[y * 128 + x + length] ?? null) === JSON.stringify(ref)) length += 1;
+      if (ref === null) tokens.push(`.${String(length)}`);
+      else {
+        const code = CODE_BY_RAMP[ref.ramp];
+        tokens.push(`${code}${String(ref.step)}${ref.alpha === 128 ? 'h' : ''}x${String(length)}`);
+        const hex = paletteHex(ref);
+        const red = Number.parseInt(hex.slice(1, 3), 16);
+        const green = Number.parseInt(hex.slice(3, 5), 16);
+        const blue = Number.parseInt(hex.slice(5, 7), 16);
+        for (let offset = 0; offset < length; offset += 1) {
+          const byte = (y * 128 + x + offset) * 4;
+          rgba[byte] = red; rgba[byte + 1] = green; rgba[byte + 2] = blue; rgba[byte + 3] = ref.alpha;
+        }
+      }
+      x += length;
+    }
+    rows.push(tokens.join(' '));
+  }
+  return { rows: Object.freeze(rows), rgba };
+}
+
+export function sha256(bytes: Uint8Array | string): string {
+  return createHash('sha256').update(bytes).digest('hex');
+}
+
+export function renderAuthoredModule(art: ImportedAuthoredArt): string {
+  const rows = art.rows.map((row) => `    '${row}',`).join('\n');
+  return `/* Generated by tools/assets/import-authored-art.ts. Do not edit. */\nimport { authoredArt } from './art';\n\nexport const art = authoredArt({\n  id: '${art.id}',\n  requestId: '${art.requestId}',\n  packageId: '${art.packageId}',\n  svgSha256: '${art.svgSha256}',\n  pngSha256: '${art.pngSha256}',\n  rows: [\n${rows}\n  ],\n});\n`;
+}
diff --git a/tools/assets/emit-starter-art-hashes.ts b/tools/assets/emit-starter-art-hashes.ts
index cbe02008b0dabc2e064a0f5c66b6c00050d4d4b6..a5927c26e2a6ef7681ae7071cfd6582923cca641
--- a/tools/assets/emit-starter-art-hashes.ts
+++ b/tools/assets/emit-starter-art-hashes.ts
@@ -1,14 +1,16 @@
 /**
  * Renders every starter-art input and writes the digest module the manifest
- * reads. This is the ONE sanctioned regeneration (D516): the pins it replaces
- * described the 1.0.0 silhouettes. It deliberately does not import the
- * manifest, so it can run before the digests exist.
+ * reads. Procedural pins remain D516 invariants. The 2026-09-10 authored pins
+ * additionally require the independent raw-RGBA oracle and decoded-PNG checks.
+ * This deliberately does not import the manifest, so it can run before the
+ * digests exist.
  */
 import { createHash } from 'node:crypto';
 import { readFileSync, writeFileSync } from 'node:fs';
 import { resolve } from 'node:path';
 import { renderPixelArtPng } from '../../src/assets/pixel-art';
 import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';
+import { AUTHORED_ART_IDS } from '../../src/assets/authored';
 
 function sha256(bytes: Uint8Array | string): string {
   return createHash('sha256').update(bytes).digest('hex');
@@ -19,11 +21,30 @@
   readonly outputs: Readonly<Record<string, string>>;
 }
 
+export interface FixedInputSource { readonly path: string; readonly bytes: Uint8Array }
+
+/** Canonical v5 framing: `<path>\n<byte length>\n<bytes>` in declared order. */
+export function frameFixedInputs(sources: readonly FixedInputSource[]): Uint8Array {
+  const chunks = sources.flatMap(({ path, bytes }) => [
+    Buffer.from(`${path}\n${String(bytes.byteLength)}\n`, 'utf8'),
+    Buffer.from(bytes),
+  ]);
+  return Buffer.concat(chunks);
+}
+
+export function fixedInputPaths(): readonly string[] {
+  return [
+    'src/assets/starter-art-inputs.ts',
+    'src/assets/authored/index.ts',
+    ...AUTHORED_ART_IDS.map((id) => `src/assets/authored/${id.replace(/^art\./u, '').replaceAll('.', '-')}.ts`),
+  ];
+}
+
 export function computeStarterArtDigests(repositoryRoot: string): StarterArtDigests {
-  const inputsSource = readFileSync(resolve(repositoryRoot, 'src/assets/starter-art-inputs.ts'), 'utf8');
+  const inputsSource = fixedInputPaths().map((path) => ({ path, bytes: readFileSync(resolve(repositoryRoot, path)) }));
   const outputs: Record<string, string> = {};
   for (const entry of STARTER_ART_INPUTS) outputs[entry.id] = sha256(renderPixelArtPng(entry.recipe));
-  return { fixedInputs: sha256(inputsSource), outputs };
+  return { fixedInputs: sha256(frameFixedInputs(inputsSource)), outputs };
 }
 
 export function renderDigestModule(digests: StarterArtDigests): string {
@@ -31,8 +52,9 @@
     .map(([id, digest]) => `    '${id}': '${digest}',`)
     .join('\n');
   return `/**
- * Output digests of the starter-art generator (D516 regeneration of the
- * pins that named the 1.0.0 silhouettes). Written by
+ * Output digests of the starter-art generator. Procedural pins remain D516
+ * invariants. The 2026-09-10 authored pins additionally require the independent
+ * raw-RGBA oracle and decoded-PNG checks. Written by
  * \`tools/assets/emit-starter-art-hashes.ts\`; the manifest reads them and the
  * independent oracle in tests/unit/assets/expected-art-hashes.ts must agree.
  */
diff --git a/tools/assets/generate-classic-contact-sheets.ts b/tools/assets/generate-classic-contact-sheets.ts
index c6f28aa3217a7a324ce5bcd6da2f75b71b097c75..8feacc903405315d6fc280bc3efb1e43abb594dc
--- a/tools/assets/generate-classic-contact-sheets.ts
+++ b/tools/assets/generate-classic-contact-sheets.ts
@@ -1,6 +1,7 @@
 import { mkdirSync, writeFileSync } from 'node:fs';
 import { resolve } from 'node:path';
 import { Bitmap } from '../../src/assets/bitmap';
+import { assetId } from '../../src/assets/ids';
 import {
   compositeGeneratedChromeBitmap,
   renderCreatureBadgeBitmap,
@@ -10,10 +11,9 @@
 import {
   TILE_SIZE,
   paintRecipe,
-  tokenRecipe,
 } from '../../src/assets/pixel-art';
 import { encodePng } from '../../src/assets/png';
-import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';
+import { STARTER_ART_INPUTS, STARTER_ART_INPUTS_BY_ID, archetypeTokenAssetId } from '../../src/assets/starter-art-inputs';
 import {
   CREATURE_BADGE_COLORS,
   CREATURE_BADGE_LEFT_PX,
@@ -24,6 +24,12 @@
 const GAP = 8;
 const COLUMNS = 10;
 
+function productionBitmap(id: string): Bitmap {
+  const input = STARTER_ART_INPUTS_BY_ID.get(assetId(id));
+  if (input === undefined) throw new Error(`Unknown production art id ${id}.`);
+  return paintRecipe(input.recipe);
+}
+
 function composite(
   target: Bitmap,
   source: Bitmap,
@@ -43,11 +49,8 @@
   originY: number,
   index: number,
 ): void {
-  const floor = paintRecipe({
-    kind: 'floor',
-    material: 'stone',
-    variant: (index % 4) as 0 | 1 | 2 | 3,
-  });
+  const variant = index % 4;
+  const floor = productionBitmap(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`);
   const overlay = paintRecipe({
     kind: 'overlay',
     material: 'semantic',
@@ -65,9 +68,7 @@
     | 'wizard'
     | 'beast'
     | 'construct';
-  const token = paintRecipe(
-    tokenRecipe(archetype, index < 2 ? 'party' : 'foe'),
-  );
+  const token = productionBitmap(archetypeTokenAssetId(archetype, index < 2 ? 'party' : 'foe'));
   const ring = paintRecipe({
     kind: 'focus',
     material: 'semantic',
@@ -115,11 +116,7 @@
   for (let variant = 0; variant < 4; variant += 1)
     composite(
       sheet,
-      paintRecipe({
-        kind: 'floor',
-        material: 'stone',
-        variant: variant as 0 | 1 | 2 | 3,
-      }),
+      productionBitmap(variant === 0 ? 'art.map.floor.stone.v1' : `art.map.floor.stone-${String(variant)}.v1`),
       GAP + variant * TILE_SIZE,
       GAP,
     );
@@ -128,7 +125,7 @@
   wallPieces.forEach((piece, index) =>
     composite(
       sheet,
-      paintRecipe({ kind: 'wall', material: 'stone', piece }),
+      productionBitmap(piece === 'n' ? 'art.map.wall.stone.v1' : `art.map.wall.stone-${piece}.v1`),
       GAP + (index % 3) * TILE_SIZE,
       TILE_SIZE + GAP * 3 + Math.floor(index / 3) * TILE_SIZE,
     ),
@@ -151,7 +148,10 @@
 const iteration = iterationFlag === -1 ? '1' : process.argv[iterationFlag + 1];
 if (iteration === undefined || !/^[1-9][0-9]*$/u.test(iteration))
   throw new Error('--iteration requires a positive integer.');
-const outputDirectory = resolve('test-results/classic-contact-sheets');
+const outFlag = process.argv.indexOf('--out');
+const requestedOutput = outFlag === -1 ? 'test-results/classic-contact-sheets' : process.argv[outFlag + 1];
+if (requestedOutput === undefined) throw new Error('--out requires a directory.');
+const outputDirectory = resolve(requestedOutput);
 mkdirSync(outputDirectory, { recursive: true });
 const outputPath = resolve(outputDirectory, `iteration-${iteration}.png`);
 const bitmap = renderContactSheet();
diff --git a/tools/assets/generate-starter-art.ts b/tools/assets/generate-starter-art.ts
index 11f3cf0ba88e5f02e042c0af74ed31c857fff991..5f6058b53b9d659c807f7a35d608daa45ea4ec2c
--- a/tools/assets/generate-starter-art.ts
+++ b/tools/assets/generate-starter-art.ts
@@ -112,7 +112,7 @@
   const boardsY = 56 + inventoryRows * 152 + 40;
   const height = boardsY + 7 * TILE_SIZE + 40;
 
-  return `<svg xmlns="http://www.w3.org/2000/svg" width="2840" height="${String(height)}" viewBox="0 0 2840 ${String(height)}" data-generator="${STARTER_ART_MANIFEST.generator.id}" data-generator-version="${STARTER_ART_MANIFEST.generator.version}"><defs>${definitions}</defs><style>text{font-family:ui-monospace,monospace}.title{font-size:22px;font-weight:700}.heading{font-size:16px;font-weight:700}.label{font-size:9px;text-anchor:middle}image{image-rendering:pixelated}</style><rect width="2840" height="${String(height)}" fill="#11131a"/><text x="28" y="30" class="title" fill="#edf0f7">Starter Pixel Art — deterministic fixture preview</text><g data-sprite-inventory="${String(tokenAssets.length)}">${inventory}</g>${boardPreview('Player', base, 28, boardsY)}${boardPreview('DM', { ...base, foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }] }, 1480, boardsY)}<metadata>pure-procedural-only; cc-by-4.0; focus.active-pc; event.adjudicated; fog.hidden; terrain; one-room; player-projection; dm-projection</metadata></svg>\n`;
+  return `<svg xmlns="http://www.w3.org/2000/svg" width="2840" height="${String(height)}" viewBox="0 0 2840 ${String(height)}" data-generator="${STARTER_ART_MANIFEST.generator.id}" data-generator-version="${STARTER_ART_MANIFEST.generator.version}"><defs>${definitions}</defs><style>text{font-family:ui-monospace,monospace}.title{font-size:22px;font-weight:700}.heading{font-size:16px;font-weight:700}.label{font-size:9px;text-anchor:middle}image{image-rendering:pixelated}</style><rect width="2840" height="${String(height)}" fill="#11131a"/><text x="28" y="30" class="title" fill="#edf0f7">Starter Pixel Art — deterministic fixture preview</text><g data-sprite-inventory="${String(tokenAssets.length)}">${inventory}</g>${boardPreview('Player', base, 28, boardsY)}${boardPreview('DM', { ...base, foggedCells: [{ column: 8, row: 1 }, { column: 8, row: 2 }] }, 1480, boardsY)}<metadata>procedural-and-authored-pixel-art; cc0-1.0; focus.active-pc; event.adjudicated; fog.hidden; terrain; one-room; player-projection; dm-projection</metadata></svg>\n`;
 }
 
 export interface StarterArtGenerationOptions {
diff --git a/tools/assets/import-authored-art.ts b/tools/assets/import-authored-art.ts
new file mode 100644
index 0000000000000000000000000000000000000000..6805d9cc617f7b88fc573dc7100847c5117eaff4
--- /dev/null
+++ b/tools/assets/import-authored-art.ts
@@ -0,0 +1,94 @@
+import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
+import { resolve } from 'node:path';
+import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';
+import { parseAuthoredSvg, renderAuthoredModule, sha256, type ImportedAuthoredArt } from './authored-art-import-core';
+
+interface PackageAsset {
+  readonly requestId: string;
+  readonly replaces: string | null;
+  readonly svg: string;
+  readonly png: string;
+  readonly width: number;
+  readonly height: number;
+  readonly svgSha256: string;
+  readonly pngSha256: string;
+}
+interface PackageManifest { readonly schemaVersion: number; readonly packageId: string; readonly assets: readonly PackageAsset[] }
+interface OracleRow { readonly requestId: string; readonly rgbaSha256: string; readonly pngSha256: string; readonly svgSha256: string }
+
+function flag(name: string): string {
+  const index = process.argv.indexOf(name);
+  const value = process.argv[index + 1];
+  if (index < 0 || value === undefined || value.startsWith('--')) throw new Error(`${name} requires a value.`);
+  return value;
+}
+
+const ID_BY_OUTPUT = new Map<string, string>(STARTER_ART_INPUTS.map((entry) => [
+  `public/assets/art/${String(entry.id).replace(/^art\./u, '').replaceAll('.', '-')}.png`,
+  String(entry.id),
+] as const));
+
+function idFromOutput(path: string): string {
+  const id = ID_BY_OUTPUT.get(path);
+  if (id === undefined) throw new Error(`Replacement target is not in the starter inventory: ${path}.`);
+  return id;
+}
+
+function stemForId(id: string): string { return id.replace(/^art\./u, '').replaceAll('.', '-'); }
+
+export function importAuthoredPackage(packageDirectory: string, oraclePath: string, checkOnly: boolean, repositoryRoot: string): number {
+  const manifest = JSON.parse(readFileSync(resolve(packageDirectory, 'manifest.json'), 'utf8')) as PackageManifest;
+  const oracle = JSON.parse(readFileSync(oraclePath, 'utf8')) as Readonly<Record<string, OracleRow>>;
+  if (manifest.schemaVersion !== 1) throw new Error('Authored package schemaVersion must be 1.');
+  const requestIds = new Set<string>();
+  const targets = new Set<string>();
+  const selected: ImportedAuthoredArt[] = [];
+  for (const row of manifest.assets) {
+    if (requestIds.has(row.requestId)) throw new Error(`Duplicate request id ${row.requestId}.`);
+    requestIds.add(row.requestId);
+    if (row.replaces !== null) {
+      if (targets.has(row.replaces)) throw new Error(`Duplicate replacement target ${row.replaces}.`);
+      targets.add(row.replaces);
+    }
+    if (row.width !== 128 || row.height !== 128) throw new Error(`Invalid dimensions for ${row.requestId}.`);
+    const svgBytes = readFileSync(resolve(packageDirectory, row.svg));
+    const pngBytes = readFileSync(resolve(packageDirectory, row.png));
+    if (sha256(svgBytes) !== row.svgSha256 || sha256(pngBytes) !== row.pngSha256) throw new Error(`Package digest mismatch for ${row.requestId}.`);
+    if (row.replaces === null || row.replaces.endsWith('/terrain-hazard-v1.png')) continue;
+    const expected = oracle[row.replaces];
+    if (expected === undefined) throw new Error(`Oracle has no row for ${row.replaces}.`);
+    if (expected.requestId !== row.requestId || expected.svgSha256 !== row.svgSha256 || expected.pngSha256 !== row.pngSha256) {
+      throw new Error(`Oracle provenance mismatch for ${row.requestId}.`);
+    }
+    const parsed = parseAuthoredSvg(svgBytes.toString('utf8'));
+    const actualRgba = sha256(parsed.rgba);
+    if (actualRgba !== expected.rgbaSha256) throw new Error(`RGBA oracle mismatch for ${row.requestId}: ${actualRgba} != ${expected.rgbaSha256}.`);
+    selected.push({ id: idFromOutput(row.replaces), requestId: row.requestId, packageId: manifest.packageId, svgSha256: row.svgSha256, pngSha256: row.pngSha256, ...parsed });
+  }
+  const inventory = new Set(STARTER_ART_INPUTS.map((entry) => String(entry.id)));
+  const unknown = selected.filter((entry) => !inventory.has(entry.id)).map((entry) => entry.id);
+  if (selected.length !== 58 || unknown.length > 0) throw new Error(`Selected authored coverage is invalid (${String(selected.length)} rows; unknown ${unknown.join(', ')}).`);
+  const generated = selected.map((entry) => ({ path: resolve(repositoryRoot, 'src/assets/authored', `${stemForId(entry.id)}.ts`), source: renderAuthoredModule(entry) }));
+  const imports = selected.map((entry, index) => `import { art as art${String(index)} } from './${stemForId(entry.id)}';`).join('\n');
+  const entries = selected.map((entry, index) => `  ['${entry.id}', art${String(index)}],`).join('\n');
+  const groups = new Map<string, ImportedAuthoredArt[]>();
+  for (const entry of selected) groups.set(sha256(entry.rgba), [...(groups.get(sha256(entry.rgba)) ?? []), entry]);
+  const equality = [...groups.values()].filter((group) => group.length > 1).map((group) => group.map((entry) => entry.id));
+  const indexSource = `/* Generated by tools/assets/import-authored-art.ts. Do not edit. */\n${imports}\nimport type { AssetId } from '../ids';\nimport type { AuthoredPixelArt } from './art';\n\nconst entries = [\n${entries}\n] as const;\nexport const AUTHORED_ART_IDS = Object.freeze(entries.map(([id]) => id));\nexport const AUTHORED_ART_BY_ID: ReadonlyMap<AssetId, AuthoredPixelArt> = new Map(entries.map(([id, art]) => {\n  if (id !== art.id) throw new Error(\`Authored registry key ${'${id}'} does not match ${'${art.id}'}.\`);\n  return [art.id, art] as const;\n}));\nif (AUTHORED_ART_BY_ID.size !== 58) throw new Error('Authored registry must contain exactly 58 unique ids.');\nexport const AUTHORED_ART_EQUALITY_GROUPS = ${JSON.stringify(equality, null, 2)} as const;\nexport type { AuthoredPixelArt } from './art';\n`;
+  generated.push({ path: resolve(repositoryRoot, 'src/assets/authored/index.ts'), source: indexSource });
+  for (const output of generated) {
+    if (checkOnly) {
+      if (readFileSync(output.path, 'utf8') !== output.source) throw new Error(`Generated authored module drifted: ${output.path}.`);
+    } else {
+      mkdirSync(resolve(output.path, '..'), { recursive: true });
+      writeFileSync(output.path, output.source, 'utf8');
+    }
+  }
+  return selected.length;
+}
+
+if (process.argv.includes('--package')) {
+  const root = resolve(import.meta.dirname, '../..');
+  const count = importAuthoredPackage(resolve(flag('--package')), resolve(flag('--oracle')), process.argv.includes('--check'), root);
+  process.stdout.write(`${process.argv.includes('--check') ? 'verified' : 'imported'} ${String(count)} authored assets\n`);
+}
