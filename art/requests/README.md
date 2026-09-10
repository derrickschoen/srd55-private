# Art asset requests

Two folders form a one-way pipeline between this project and an
image-generation assistant.

| Folder | Holds | Tracked in git |
| --- | --- | --- |
| `art/requests/` | one JSON request per asset, plus this README, the schema and the scaffolder | yes |
| `art/incoming/` | the finished assets the assistant delivers, plus any `-source` reference images | no (everything but its README is ignored) |

Every request has a UUIDv7 id. The id is the filename prefix of the request
**and** of every asset delivered for it, so the pairing is visible in a
directory listing and files sort by creation time:

```
art/requests/<uuidv7>-<slug>.json
art/incoming/<uuidv7>-<slug>.png
```

## Workflow

1. **Create a request.** `node art/requests/new-request.mjs <kebab-slug>`
   writes `art/requests/<uuidv7>-<slug>.json` from the template. Replace every
   `REPLACE` placeholder. A request must carry: the full prompt, the asset's
   purpose in the app, dimensions and aspect ratio, style (with paths of
   existing assets to match), background and transparency requirements, and
   acceptance criteria that a reviewer can check one by one. The schema is
   `request.schema.json`; `node art/requests/new-request.mjs --check`
   validates every request and its delivered assets.
2. **Hand the request to the image-generation assistant.** Point it at the
   JSON file and at `art/incoming/`. The assistant saves the result as
   `art/incoming/<id>-<slug>.<format>` using the `deliverable.filename` from the
   request, and nothing else in that folder. It never writes into
   `public/assets/art/`.
3. **Review against the acceptance criteria.** Open the asset next to the
   `style.references`. Set `status` to `delivered` when the file lands,
   `accepted` when every criterion holds, `rejected` (with a `notes` entry
   saying which criterion failed) otherwise. A rejected request is re-run
   with an amended prompt under the **same id**; the old asset is deleted.
4. **Promote an accepted asset** into the app in a normal reviewed change.
   Promotion is deliberate because the served art directory is pinned:
   `tests/unit/assets/starter-art.test.ts` asserts the exact inventory of
   `public/assets/art/` and `tests/unit/source-is-greppable.test.ts` rejects
   any tracked raster outside its exemption list. A promotion therefore
   changes the asset's name to the project's `<kind>-<name>-v<n>.png`
   convention, registers it in the art manifest, extends both tests with the
   reasoning they require, and records provenance (see below).

## Licensing and provenance

Every delivered asset is dedicated to the public domain under
[CC0 1.0](../../LICENSE-ART), the same dedication as the repository's
generated art; the `license` field is fixed to `CC0-1.0` and `--check`
enforces it. Prompts must not name third-party games, artists, studios or
products, and must not describe another game's specific visual designs;
the licensing wall that keeps external material out of this public
repository applies to prompts too.

[ART-PROVENANCE.md](../../ART-PROVENANCE.md) currently describes only art
produced by the repository's own generators from clean-room design
principles. An asset made by an image-generation assistant has a different
provenance (an external model, prompted by us) and is **not** covered by
that statement. Promoting such an asset requires adding a section to
ART-PROVENANCE.md naming the tool, the request id and the prompt, so the
provenance record stays truthful.

## Conventions the assistant must follow

- Filename exactly as `deliverable.filename`; format as `deliverable.format`.
- Dimensions exactly as requested; for pixel art, `dimensions.pixelGrid`
  logical pixels per output pixel, no anti-aliasing, no resampling.
- `background.transparent: true` means a real alpha channel, not a keyed
  colour; nothing outside the subject may carry non-zero alpha unless the
  request names a drop shadow.
- No text, watermark, signature or border unless the prompt asks for it.
- One asset per request. Variants get their own requests.
- A `batch` field groups requests issued together; `redoOf` names the
  current asset a request replaces one-for-one. List a batch with
  `grep -l '"batch": "redo-starter-art-v1"' art/requests/*.json`.

## Reference facts about the existing art

- Board tiles and tokens are 128 × 128 PNG, 8-bit RGBA, top-down pixel art;
  tokens and terrain features sit on a circular dark drop shadow over a
  transparent background (see `public/assets/art/terrain-crate-v1.png`).
- The palette is generated from one rule (`src/assets/palette.ts`): eight hue
  ramps (stone, wood, earth, moss, cloth-warm, cloth-cool, metal, skin) of
  seven steps each, shadows turning toward blue-violet and lights toward
  yellow, plus nine cool-grey neutrals. New assets should read as belonging to
  that palette even though a generated image cannot be pinned to it.
- Asset ids in the app follow `art.<kind>.<name>.v<n>` (`src/assets/ids.ts`).

## Reference screenshots

`art/requests/screenshots/` holds captures of the real board so a request can
point at what the asset has to sit inside. The folder is gitignored (tracked
rasters are rejected by `tests/unit/source-is-greppable.test.ts`); regenerate
the captures with the script instead of committing them:

```
npm run build                      # or build in a worktree and pass --dist
node art/requests/capture-screenshots.mjs --dist dist --port 4590 --mode plain
node art/requests/capture-screenshots.mjs --dist dist --port 4591 --mode emberkeep
```

| File | Shows |
| --- | --- |
| `current-topdown-ui-page.png` | the DM view as it loads: controls, save manager, initiative timeline (1600 × 1000 viewport) |
| `current-topdown-ui-board.png` | the encounter board of the bundled D365 sample dungeon, room 1, with the shipped starter art, legend and roster |
| `emberkeep-integrated-mock-page.png` / `-board.png` | the same view with the Emberkeep style-study deliveries swapped in **in the browser only** (starter-art data URIs replaced by the delivered PNGs; the app, its manifest and its pins are untouched) |

The mock maps floor, wall, closed door, crate, pillar, rubble and the fighter,
wizard, rogue, cleric, goblin, skeleton, wolf and ogre tokens
(`EMBERKEEP_MAP` in the script). Open-door variants, hazards and the overlay
glyphs keep the shipped art. Never point the script at port 4173.

## Assessment: what fits the top-down board, and what does not

Read against the two board captures.

**What the board is.** A strict plan view. Floor and wall tiles are seen
from directly above; the wall band is the *top* of the wall, so its mortar
pattern reads as a course of stones capping the room, and the eight edge
variants (`map-wall-stone-{n,s,e,w,ne,nw,se,sw}`) let the band turn corners
and meet the floor. Terrain features (crate, pillar, rubble) are single
objects seen from above on a soft circular drop shadow. Overlays are drawn
*on top of* every tile: bright/dim/dark/fog tints, difficult-terrain ridges,
cover glyphs, the yellow selection frame, the coloured faction plate and
the HP bar under each token, and the small light-source wisp. The one
deliberate exception to plan view is the token portrait: a shoulders-up bust
in three-quarter view, drawn on top of a round faction plate (blue party,
red foe) that is part of the token art family, not the board.

**Why the Emberkeep deliveries fight it.** In the mock:

- The floor is a front-lit flagstone slab at far higher contrast and
  saturation than the shipped tile. Every cell reads as a separate slab
  because one tile repeats with no variants (the shipped set has four),
  the grid dominates, and the tints and cover glyphs drawn over it lose
  legibility.
- The wall is a front elevation. Tiled around the room it becomes a striped
  band of bricks that does not turn corners and no longer reads as a wall
  seen from above.
- The token busts themselves fit well (the shipped tokens are also busts),
  but they carry an opaque dark base. That base covers the faction plate,
  so party and foe are no longer distinguishable at a glance, and it
  overlaps the HP bar row.
- Terrain objects (pillar, brazier, crate) are drawn as standing objects in
  three-quarter view; on a plan-view floor they look pasted on rather than
  resting in the cell.

**How to prompt for art that fits.** Put these in `prompt`, `style` and
`acceptanceCriteria` of every board request:

1. **Camera.** "Seen from directly above (plan view / bird's-eye), no
   horizon, no visible side faces except a thin shaded south edge." For
   tokens only: "shoulders-up bust, three-quarter view, centred, no base,
   no plate, no shadow" and let the app draw the plate.
2. **Tiles must tile.** Floors and walls are seamless at all four edges at
   128 px. Ask for a *set*: one base floor plus three variants that differ
   only in small details, and a nine-piece wall set (centre plus eight
   edges) that meets the floor along the matching side. Doors come as
   closed/open × north/south/east/west, the leaf lying across the cell edge.
3. **Contrast budget.** The floor is a background: mid-value, low
   saturation, small value range (the shipped tile lives inside roughly a
   quarter of the value scale). Reserve the darkest and lightest values for
   walls, tokens and overlays. Reject a floor tile that is as contrasty as a
   token.
4. **Lighting.** Top-left key light, cool blue-violet shadows, one step of
   warm light, consistent across the whole set; a south-edge shadow band no
   taller than ~10 px so stacked tiles do not read as steps.
5. **Objects on the floor.** One object per tile, centred, with a circular
   drop shadow of alpha ≤ 60 % that stays inside the tile; nothing else
   non-transparent. Pillars are a shaded disc with a small cap highlight,
   crates a square top, rubble a scatter — all from above.
6. **Palette.** Name the eight ramps in `src/assets/palette.ts` (stone,
   wood, earth, moss, cloth-warm, cloth-cool, metal, skin) and the cool-grey
   neutrals; ask for at most seven steps per ramp and no gradients.
7. **Pixel discipline.** 1 logical pixel = 1 output pixel, hard edges, no
   anti-aliasing, binary alpha except the drop shadow.
8. **Prove it in place.** Before setting `accepted`, capture the board with
   the delivery mapped in (`capture-screenshots.mjs --mode emberkeep`, or a
   copy of it with a different map) and check: floor stays quiet under
   tokens and overlays, walls turn corners, doors align with the wall band,
   busts sit inside the faction plate with the HP bar clear.

Reference pieces that do fit today: `map-floor-stone-v1..3`,
`map-wall-stone-*`, `terrain-crate-v1`, `terrain-pillar-v1` and
`token-pc-fighter-v1` in `public/assets/art/`.
