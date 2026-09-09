# Art asset requests

Two folders form a one-way pipeline between this project and an
image-generation assistant.

| Folder | Holds | Tracked in git |
| --- | --- | --- |
| `art/requests/` | one JSON request per asset, plus this README, the schema and the scaffolder | yes |
| `art/incoming/` | the finished assets the assistant delivers | no (rasters are ignored) |

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
