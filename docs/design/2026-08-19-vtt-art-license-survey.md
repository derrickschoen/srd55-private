# VTT starter-art license survey

Date checked: 2026-08-19. This is an authorization and provenance survey for
increment 8, not a download list. No asset file was downloaded or inspected.
Consequently, a source page can establish a family-level license but cannot
establish the identity or digest of the bytes that would eventually be
committed.

## Decision

Use one external visual family: a small, file-by-file selection of
Game-icons.net SVGs, rendered as token medallions. Draw the room, terrain
overlays, fog, active-PC focus, and `ADJUDICATED` highlight with a checked-in,
deterministic, project-native SVG/canvas renderer. Keep a procedural
initial-and-pattern token as the total fallback for any fixture actor without
an approved glyph.

This is the most coherent and least provenance-heavy option: monochrome line
glyphs sit naturally on a two-tone drawn map, every visible state remains
legible without texture, and only one third-party family enters the manifest.
It also does not depend on the still-unselected increment-9 roster.

It is **not ready to commit assets yet**. The current repository ships and pins
CC-BY-4.0 only. Before any Game-icons.net SVG enters the public mirror, the
repository and dist must also ship the unmodified CC-BY-3.0 Unported legal code,
render the per-icon credits on the existing legal screen, add the credits to
`NOTICE.md`, and enforce all of that from the art manifest. The exact selected
SVG bytes and the precise monster-to-glyph rows must then be frozen and hashed.

## License meanings used below

- **CC0 1.0 Universal:** no attribution is required. The affirmer waives the
  covered copyright and related rights to the extent possible and supplies a
  broad public-license fallback; copying, modification, and redistribution in
  a public repository and a built dist are permitted. CC0 does not clear
  trademarks, patents, privacy/publicity rights, or rights the affirmer did not
  own ([deed](https://creativecommons.org/publicdomain/zero/1.0/),
  [legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode)).
- **CC BY 3.0 Unported:** public-repository and dist redistribution, including
  commercial redistribution and adaptations, are permitted. Each distributed
  copy must carry the license or its URI and preserve license/disclaimer
  notices. Reasonable credit must include, when supplied, the original author,
  title, associated source URI, and an adaptation statement; it must not imply
  endorsement. Effective technological restrictions may not be imposed on the
  licensed work ([deed](https://creativecommons.org/licenses/by/3.0/),
  [sections 3–4 of the legal code](https://creativecommons.org/licenses/by/3.0/legalcode)).
- **CC BY 4.0 International:** repo and dist redistribution and adaptation are
  permitted subject to appropriate credit, a license link, retention of
  supplied notices, and an indication of modifications. This repository
  already pins that legal code for SRD material, but an art row still needs its
  own title, creator, source, and modification record.

“Repo: yes; dist: yes” below means the named license grants both permissions if
its conditions are met. It does not mean the uninspected bytes have passed D59.

## A. Candidate sets

### CC0 candidates

| Family | Source and author | Exact license; required attribution | Repo / dist | Coherence and increment-9 coverage | Gaps and verdict |
|---|---|---|---|---|---|
| Kenney **Scribble Dungeons**, pack 1.0 | [Kenney source page](https://kenney.nl/assets/scribble-dungeons); author/publisher: **Kenney**. The page identifies 256 2D top-down files at 64×64. The [OpenGameArt mirror description](https://opengameart.org/content/scribble-dungeons) says the pack also contains characters, weapons/items, vector sources, sheets, and a sample map. | **CC0 1.0 Universal**. None required; optional credit should be “Kenney,” not the Kenney logo, per [Kenney support](https://kenney.nl/support). | **Yes / yes.** | Strongest drawn-map candidate: one hand-sketched style for floor, walls, props, and whatever characters the pack contains. It plainly covers a one-room dungeon and terrain dressing. It would mix well with monochrome token glyphs and procedural pencil-hatch fog. | The primary page does not enumerate filenames or say how many PC/monster figures exist. It does not establish 3 distinct class-readable PCs, 4–6 distinct encounter monsters, fog, or state UI. **Eligible, but file-level coverage unverified; not the recommendation.** |
| Kenney **Roguelike/RPG pack** 1.0 plus **Roguelike Characters** 2.0 | [Roguelike/RPG pack](https://kenney.nl/assets/roguelike-rpg-pack) and [Roguelike Characters](https://kenney.nl/assets/roguelike-characters); author/publisher: **Kenney**. The pages identify 1,700 16×16 RPG/tile/furniture/button/panel files and 450 character files respectively. | **CC0 1.0 Universal**. None required; optional “Kenney” credit. | **Yes / yes.** | A broad, internally compatible pixel-art route with map pieces, furniture/UI categories, and many characters. It is the likeliest Kenney-only route to enough distinct actors for one 3-PC/4–6-monster skirmish. | The primary pages do not enumerate exact creatures or establish fog coverage. Sixteen-pixel figures are less portrait-like and less readable at VTT token scale than vector glyphs. Exact content and byte provenance remain unverified. **Eligible alternative.** |
| Quaternius **Modular Dungeons Pack** | [Quaternius source page](https://quaternius.com/packs/modulardungeon.html); author/publisher: **Quaternius** (published pseudonym). The page identifies 48 modular models in FBX, OBJ, and Blend formats. | **CC0 1.0 Universal**; the [publisher FAQ](https://quaternius.com/faq.html) expressly says all models are CC0, may be modified, and need no attribution. | **Yes / yes.** | Coherent low-poly walls/props could produce an attractive fixed-camera room if rendered offline from checked-in source with fixed camera, light, palette, and renderer version. | It is a 3D environment pack, not a ready 2D VTT set. It supplies no proved 2D PC/monster token family, fog, or UI and adds a model-to-sprite build pipeline. **Eligible but disproportionate.** |
| Dungeon Crawl Stone Soup **CC0 export** | [Dedicated `crawl/tiles` repository](https://github.com/crawl/tiles), maintained by Chris Hamons for the Dungeon Crawl Stone Soup developers/artists; the [artist approvals](https://github.com/crawl/tiles/blob/master/ARTISTS.md) list the contributors who approved CC0 release. The [OpenGameArt package page](https://opengameart.org/content/dungeon-crawl-32x32-tiles) names Chris Hamons as maintainer and describes terrain, walls, decor, monsters, GUI, items, and player avatars. | The dedicated export represents included tiles as **CC0 1.0 Universal**; no attribution required. | **Conditional yes / conditional yes.** Only the dedicated CC0 export, never an arbitrary copy from the live game tree. | It is the only surveyed family claiming all map, terrain, player, monster, effects, and GUI categories in one pixel-art corpus, easily enough in breadth for the skirmish. | The official game license says the tile history is complex and only “the majority” are CC0. The export keeps a large [unknown/ineligible filename list](https://github.com/crawl/tiles/blob/master/TILES_UNDER_UNKNOWN_LICENSE.md), including old player, monster, terrain, and GUI files. The export says those are excluded, but this survey could not inspect a release archive or prove selected bytes are from the clean export. Collaborative eras also reduce visual consistency. **Reject unless every selected file is pinned to a clean export release and checked against the exclusion list.** |

All Kenney asset-page licenses above are corroborated by Kenney’s own support
statement that all assets on its asset pages are CC0 and usable commercially,
with no mandatory credit. A site footer saying “all rights reserved” does not
override the asset page’s specific CC0 grant, but the downloaded pack’s included
license file must still be retained as provenance evidence when inspected.

### CC-BY candidates

| Family | Source and author | Exact license; required attribution | Repo / dist | Coherence and increment-9 coverage | Gaps and verdict |
|---|---|---|---|---|---|
| **Game-icons.net** SVG library | [Game-icons.net](https://game-icons.net/); authors are **per icon**, not “Game-icons.net.” The [about page](https://game-icons.net/about.html) identifies Lorc, Delapouite, and the other contributors, and the [FAQ](https://game-icons.net/faq.html) requires author credit. | **Creative Commons Attribution 3.0 Unported (CC BY 3.0)**. For every chosen icon, retain its supplied title and author; link the icon page and license; say what changed. The site accepts the pattern “Icons made by {author}. Available on https://game-icons.net,” but CC BY 3.0’s fuller title/source/change form should be used here. | **Yes / yes**, provided the same attribution is present in `NOTICE.md`, the in-app legal page, and dist; CC-BY-3.0’s legal code/URI travels with the work; and the SVG is not placed behind effective DRM. | The library reports 4,180 scalable, deliberately homogeneous monochrome icons, including 122 creature/monster and 142 GUI icons. It gives clear, high-contrast token portraits at any board scale. A single medallion template, PC/enemy palette, pattern, and letter badge can distinguish 3 PCs and 4–6 monsters while retaining a coherent family. | It has no dungeon tiles. Per-icon authorship means a family-level credit is insufficient. The exact increment-9 roster is not frozen, so the final monster subset cannot yet be closed. **Recommended for tokens only.** |
| Dungeon Scrawl-generated maps | [Current Roll20/Dungeon Scrawl commercial-use policy](https://help.roll20.net/hc/en-us/articles/36165245156247-Commercial-Use-Policy); generator publisher: **Roll20 / Dungeon Scrawl**. | Base maps are stated as **CC BY 4.0**, with required text: “Maps created with Dungeon Scrawl (https://dungeonscrawl.com) — used under CC BY 4.0 license.” Commercial use additionally requires a Pro subscription active when the map is created. Inserted art has separate licenses, including CC BY 3.0, CC BY 4.0, CC0, and CC BY-NC 4.0. | **Not presently proved / not presently proved.** It could be yes for a base-only map created under a verified Pro entitlement with the prescribed credit. | Good hand-drawn map coherence, but it covers only the room/map side. | Owner entitlement, generation date, and exact included layers are unknown. Any BY-NC layer is outside the clean CC0/CC-BY target and unsuitable for an unrestricted public artifact. The generator is not needed at runtime and must never be fetched there. **Reject for this bundle.** |

### Procedural candidates

| Generator | Source and author | Authorization | Repo / dist | Coverage and gaps | Verdict |
|---|---|---|---|---|---|
| Project-native line-art room/fog/token renderer | Not written yet; future checked-in source by **dnd-lane-art contributors** under this repository’s MIT software license. | Project-owned source is authorized under MIT once committed. Do not claim that MIT automatically licenses separately committed art exports: either avoid committing exports, or explicitly grant those outputs CC0-1.0 or CC-BY-4.0 in `NOTICE.md` and the manifest. | **Yes / yes**, after the output-license choice is explicit. | Deterministic grid-aligned floor/wall hatching, doors, pillars, rubble, crates, difficult/hazard terrain, hidden/unexplored fog masks, revealed desaturation, active-PC halo, enemy/PC rings, `ADJUDICATED` amber pulse, and initial/pattern fallback tokens. It covers every mechanical visual state and both projections without external bytes. It does not create illustrative portraits on its own. | **Recommended** for the room, terrain overlays, fog, state UI, and total fallback. |
| Watabou One Page Dungeon output | [Watabou’s own FAQ](https://watabou.github.io/faq.html); author: **Watabou**. | Custom permission, not a named CC license: generated maps may be copied, modified, and used commercially; attribution is appreciated but not required. The generator code itself is generally not open source. | A generated image appears redistributable in repo/dist under the quoted permission, but the generator cannot be bundled on that basis. | Good one-page dungeon output, but much more than the required one room. No token or UI family. | No immutable generator version/source, fixed seed contract, or reproducible offline pipeline was confirmed. The informal “license” also expresses disapproval of selling bare generated maps. **Reject: provenance and reproducibility are weaker than a small local renderer.** |

## B. Recommended bundle

### 1. Procedural “ink-room” board

Use a project-native renderer for everything whose meaning comes from encounter
state rather than illustration. This prevents decorative art from becoming a
second source of truth.

Fixed generation inputs:

```ts
interface InkRoomV1Inputs {
  readonly generator: 'ink-room-v1';
  readonly seed: number; // unsigned 32-bit integer
  readonly grid: { readonly columns: number; readonly rows: number };
  readonly cells: readonly {
    readonly x: number;
    readonly y: number;
    readonly floor: 'stone' | 'earth' | 'wood';
    readonly terrain:
      | 'clear'
      | 'difficult-rubble'
      | 'cover-crate'
      | 'cover-pillar'
      | 'hazard';
  }[];
  readonly walls: readonly GridEdge[];
  readonly doors: readonly GridEdge[];
  readonly palette: 'parchment-ink-v1';
  readonly hatchDensity: 1 | 2 | 3;
}
```

The seed controls only cosmetic hatch jitter; geometry comes exclusively from
the fixture. The player renderer receives only its filtered fog projection.
Fog is an opaque state-derived mask with a stable stipple edge, not a partially
transparent texture over secret board data. Use shape as well as color:
solid/dashed/dotted terrain boundaries, PC/enemy ring shapes, a double active-PC
halo, and an amber crosshatch plus log marker for `ADJUDICATED`. That satisfies
terrain legibility, fog, active-PC focus, and adjudication review without any
third-party map/UI asset.

Per-asset reasons:

- `board.floor.stone.ink-v1`, `board.wall.ink-v1`, and
  `board.door.ink-v1`: deterministic one-room map base.
- `terrain.rubble.ink-v1`, `terrain.crate.ink-v1`,
  `terrain.pillar.ink-v1`, and `terrain.hazard.ink-v1`: mechanical terrain
  stays grid-exact and distinguishable in monochrome.
- `fog.hidden.ink-v1`, `fog.unexplored.ink-v1`, and
  `fog.revealed.ink-v1`: projection-derived secrecy styling.
- `focus.active-pc.ink-v1` and `event.adjudicated.ink-v1`: satisfy increment
  6/8 emphasis without relying on token art.
- `token.fallback.initial-pattern-v1`: total deterministic coverage when no
  licensed portrait is registered; inputs are actor display initial, side,
  size, stable actor id, and palette. It never derives from a remote image.

### 2. Game-icons.net token medallions

Use the original SVG path in a locally generated circular medallion; modifications
are “cropped/padded to a square viewBox, recolored, and composited with a
project-original ring, side palette, pattern, and actor badge.” Preserve the
original SVG separately only if the implementation needs it; otherwise manifest
the transformed SVG and its upstream source digest.

The initial PC selection is exact:

| Stable asset id | Icon, source, author | Reason |
|---|---|---|
| `token.pc.fighter.broadsword-v1` | [Broadsword](https://game-icons.net/1x1/lorc/broadsword.html), **Lorc**, CC BY 3.0 | Immediate weapon-role silhouette; distinct from both casters. |
| `token.pc.cleric.holy-symbol-v1` | [Holy Symbol](https://game-icons.net/lorc/originals/holy-symbol.html), **Lorc**, CC BY 3.0 | Class-readable sacred emblem without using a third-party setting mark. |
| `token.pc.wizard.wizard-face-v1` | [Wizard Face](https://game-icons.net/1x1/delapouite/wizard-face.html), **Delapouite**, CC BY 3.0 | The only face-form PC glyph; visually distinct at a glance. |

The monster reserve below proves the family has more than the 4–6 simultaneous
token distinctions required by increment 9. It is **not a claim that these are
the final SRD roster**. Increment 9 must bind only roster-matching rows and may
replace/add rows from the same family before approval.

| Stable asset id | Icon, source, author |
|---|---|
| `token.monster.goblin-v1` | [Goblin](https://game-icons.net/1x1/caro-asercion/goblin.html), **Caro Asercion** |
| `token.monster.ogre-v1` | [Ogre](https://game-icons.net/1x1/delapouite/ogre.html), **Delapouite** |
| `token.monster.zombie-v1` | [Shambling Zombie](https://game-icons.net/1x1/delapouite/shambling-zombie.html), **Delapouite** |
| `token.monster.skeleton-v1` | [Skeleton](https://game-icons.net/1x1/skoll/skeleton.html), **Skoll** |
| `token.monster.wolf-v1` | [Wolf Head](https://game-icons.net/1x1/lorc/wolf-head.html), **Lorc** |
| `token.monster.orc-v1` | [Orc Head](https://game-icons.net/1x1/delapouite/orc-head.html), **Delapouite** |
| `token.monster.snake-v1` | [Snake](https://game-icons.net/1x1/lorc/snake.html), **Lorc** |
| `token.monster.spider-v1` | [Spider](https://game-icons.net/1x1/carl-olsen/spider-alt.html), **Carl Olsen** |

Every one is CC BY 3.0 according to its individual source page. Duplicate
creatures receive generated `A`–`F` badges and distinct ring dashes derived from
stable actor ids, so six identical monsters remain distinguishable without six
copies of the artwork.

The per-icon credit must take this form in the manifest and generated notices:

> “{Title}” by {Author}, from {individual icon URL}, licensed under CC BY 3.0
> Unported (https://creativecommons.org/licenses/by/3.0/). Modified: cropped or
> padded, recolored, and composited into a token medallion.

Do not collapse this to “icons by Game-icons.net”; that loses the supplied
title and original author and would not satisfy the license.

## C. Manifest schema and mutation checks

Extend the existing licensing path; do not build a parallel art-credit system.
[`NOTICE.md`](../../NOTICE.md) is the repository inventory.
[`docs/srd/SOURCE.md`](../srd/SOURCE.md) demonstrates source URL, retrieval
fact, exact digest, named modifications, and source/output set equality.
[`tools/licenses/bundled-license-files.ts`](../../tools/licenses/bundled-license-files.ts)
is the typed emission list, while
[`tools/assert-dist-clean.mjs`](../../tools/assert-dist-clean.mjs) independently
checks exact emitted bytes. The existing
[`attribution.spec.ts`](../../tests/browser/attribution.spec.ts) proves that
real notice text remains reachable on the legal screen, including during boot
failure. Art should add data and checks to that chain, not a second screen or
hand-maintained list.

The repository convention is readonly TypeScript contracts, Zod-established
brands at decoding boundaries, closed mechanical sets, and content identity
that is independent of storage names. The art manifest should follow it rather
than treating a filename as an id.

```ts
import type { Brand } from '../../domain/ids';

export type AssetId = Brand<string, 'AssetId'>;
export type Sha256 = Brand<string, 'Sha256'>;

type ArtLicense =
  | {
      readonly spdx: 'CC0-1.0';
      readonly version: '1.0 Universal';
      readonly authorizationUrl:
        'https://creativecommons.org/publicdomain/zero/1.0/legalcode';
      readonly attributionRequired: false;
    }
  | {
      readonly spdx: 'CC-BY-3.0';
      readonly version: '3.0 Unported';
      readonly authorizationUrl:
        'https://creativecommons.org/licenses/by/3.0/legalcode';
      readonly attributionRequired: true;
      readonly bundledLicenseOutput: 'licenses/CC-BY-3.0.txt';
    }
  | {
      readonly spdx: 'CC-BY-4.0';
      readonly version: '4.0 International';
      readonly authorizationUrl:
        'https://creativecommons.org/licenses/by/4.0/legalcode';
      readonly attributionRequired: true;
      readonly bundledLicenseOutput: 'licenses/CC-BY-4.0.txt';
    }
  | {
      readonly spdx: 'MIT';
      readonly version: 'MIT';
      readonly authorizationUrl: './LICENSE.txt';
      readonly attributionRequired: true;
      readonly bundledLicenseOutput: 'LICENSE.txt';
    };

interface BundledOutputV1 {
  readonly path: `assets/art/${string}`;
  readonly mediaType: 'image/svg+xml' | 'image/png';
  readonly sha256: Sha256;
  readonly width: number;
  readonly height: number;
}

type ModificationV1 =
  | { readonly state: 'unmodified' }
  | { readonly state: 'modified'; readonly description: string };

type AssetSourceV1 =
  | {
      readonly type: 'external';
      readonly sourceUrl: `https://${string}`;
      readonly title: string;
      readonly authors: readonly [string, ...string[]];
      readonly upstreamFileName: string;
      readonly upstreamSha256: Sha256;
      readonly retrievedOn: `${number}-${number}-${number}`;
    }
  | {
      readonly type: 'procedural';
      readonly sourceUrl: `https://${string}`; // canonical public repo source URL
      readonly title: string;
      readonly authors: readonly ['dnd-lane-art contributors'];
      readonly generatorId: 'ink-room-v1' | 'initial-pattern-token-v1';
      readonly generatorSources: readonly [{
        readonly path: string;
        readonly sha256: Sha256;
      }, ...{
        readonly path: string;
        readonly sha256: Sha256;
      }[]];
      readonly fixedInputsSha256: Sha256;
    };

interface ArtAssetCommonV1 {
  readonly id: AssetId;
  readonly kind: 'map' | 'terrain' | 'token' | 'fog' | 'ui';
  readonly license: ArtLicense;
  readonly modifications: ModificationV1;
  readonly attributionText: string | null;
}

export type ArtAssetV1 = ArtAssetCommonV1 & (
  | {
      readonly source: Extract<AssetSourceV1, { readonly type: 'external' }>;
      readonly outputs: readonly [BundledOutputV1, ...BundledOutputV1[]];
    }
  | {
      readonly source: Extract<AssetSourceV1, { readonly type: 'procedural' }>;
      // Empty means generated only at runtime; every materialized bundled
      // output, if any, must still be listed and hashed here.
      readonly outputs: readonly BundledOutputV1[];
    }
);

export interface ArtManifestV1 {
  readonly schemaVersion: 1;
  readonly assets: readonly ArtAssetV1[];
}
```

Decoder refinements must require unique ids and output paths; lowercase stable
ids; HTTPS upstream pages; nonempty author/title; exact 64-hex digests; positive
dimensions; and output paths confined to the art directory.
An external row must have at least one output; a procedural row may have none
only when it is generated at runtime, and every materialized procedural output
must still be listed. For `CC0-1.0`, attribution may be null. For either CC-BY
version, it must be nonempty and contain every supplied author/title/source URL,
the canonical license URL, and the modification statement when modified.
Procedural provenance uses the canonical public repository URL, exact source
paths, and exact source-file digests. It must not try to embed the current
commit's permalink in a manifest that is itself part of that commit.

Named checks that kill increment-8 mutations:

1. **51 `asset_without_authorization` —
   `art-manifest-authorization-completeness`:** parse every row through the
   closed `ArtLicense` union; reject missing/unknown licenses, missing source
   pages, missing authorization URLs, absent source/output SHA-256 values, and
   any bundled art file not owned by exactly one row. A source URL without an
   allowed redistribution grant fails.
2. **52 `ccby_attribution_omitted` —
   `art-attribution-reaches-repo-and-dist`:** derive the required notices from
   the manifest; compare them exactly with the art section of `NOTICE.md` and
   the legal-screen model; require the pinned CC-BY-3.0 legal code in
   `BUNDLED_LICENSE_FILES`; inspect dist for the exact notice and exact-license
   digest. A CC-BY row with null/partial credit, or a build lacking that credit,
   fails.
3. **53 `asset_id_resolves_by_filename` —
   `fixture-assets-resolve-through-stable-id`:** decode every fixture reference
   as branded `AssetId`, resolve through a manifest map, and then verify the
   selected output path and digest. Tests rename an output while leaving the id
   intact and update the manifest path: resolution must still succeed. Direct
   fixture paths, basename lookup, duplicate ids, and orphan paths fail.
4. **54 `fixture_fetches_remote_texture` —
   `approved-fixture-renders-offline-with-local-assets-only`:** allow `https:`
   only in inert provenance fields; the runtime resolver returns bundled bytes
   or the procedural fallback and has no network-capable branch. A browser test
   blocks all post-navigation network and renders both projections; a static
   import/AST check rejects `fetch`, remote `src`/CSS URLs, or dynamic URL
   construction in the resolver. The fixed fixture’s render digest must be
   identical across two clean loads.

Additional load-bearing checks should assert manifest ↔ art-directory set
equality, exact output digests, one notice per attribution-required source,
stable canonical ordering of generated notice text, and that the same manifest
drives the build emitter, legal screen, resolver, and dist guard. This matches
the existing `BUNDLED_LICENSE_FILES` pattern: one typed list emits bytes while
independent tests pin the list to `tools/assert-dist-clean.mjs` and to the legal
screen.

## D. D59 public-mirror analysis

| Recommended material | May live in the public mirror? | D59 status |
|---|---|---|
| Project-native renderer source | **Yes**, under the repository MIT license. | No external blocker. Keep generated exports out of git unless their output license is expressly declared and manifested. |
| Project-native runtime renderings | **Yes** as runtime output; they are not bundled third-party files. | If screenshots, pre-rendered SVG/PNG, or fixture thumbnails are committed, add explicit project-art authorization and manifest rows first. Current `NOTICE.md` licenses software and named homebrew/SRD corpora, not a future art-output corpus. |
| The 3 PC Game-icons.net SVGs listed above | **Yes**, under CC BY 3.0 Unported. | **Blocked in the current repo until** CC-BY-3.0 legal code, complete per-icon notice, legal-screen output, dist emission, and exact byte/source digests exist. The license itself is not ambiguous. |
| Monster Game-icons.net SVGs | **Yes**, under CC BY 3.0 Unported, file by file. | Same attribution/dist blocker. Additionally, the increment-9 roster is not frozen, so the listed reserve is not yet the final selected set. Do not commit a semantically mismatched reserve merely to fill the manifest. |
| Procedural fallback token | **Yes**, under project authorization. | Its fixed-input identity and output-license treatment must be explicit in the manifest. |

No recommended third-party family is rejected for ambiguous licensing or an
unclear author: every selected Game-icons.net page names its individual author
and CC-BY-3.0 license. The blockers are repository integration and as-yet
unfrozen bytes/roster, not missing permission.

Rejected or conditional candidate D59 findings:

- **DCSS:** blocker unless the exact selected file is proved to come from the
  dedicated clean export and not the official unknown-license list. “Most
  tiles” is not authorization for a particular file.
- **Dungeon Scrawl:** blocker because the owner’s Pro-at-generation entitlement
  and exact layer provenance are unknown; any included BY-NC art is rejected.
- **Watabou:** output permission is readable, but immutable generator/version
  provenance and reproducibility were not found; reject rather than infer.
- **Kenney packs:** family-level permission is clear. File identity, included
  license bytes, checksums, and exact token coverage remain unverified until an
  authorized implementation task may inspect the archive. Nothing should be
  committed on the strength of the web preview alone.
- **Quaternius:** family-level permission and published author are clear. The
  gap is suitability and a deterministic 3D render pipeline, not D59.

## E. AI-generated imagery

Do not use AI-generated starter art for this increment. No provider, account
terms, model, or generation entitlement has been selected, so there is no
asset-specific authorization/provenance record to test. “AI-generated” is not a
license.

As one provider example, OpenAI’s individual [Terms of Use effective
2026-01-01](https://openai.com/policies/terms-of-use/) say that, as between the
user and OpenAI and to the extent allowed by law, the user owns output and
OpenAI assigns any right it has; they also make the user responsible for having
all rights in inputs and warn that output may not be unique. That is useful
contract evidence, not a warranty that a particular image is free of third-party
rights. Another provider or account class can have different terms.

The U.S. Copyright Office concludes that generative output is protectable only
where a human determined sufficient expressive elements; prompts alone are not
enough, while human selection, arrangement, or modification may be protected
([2025 report summary](https://www.copyright.gov/newsnet/2025/1060.html?loclr=licop),
[2023 registration guidance](https://www.copyright.gov/ai/ai_policy_guidance.pdf)).
That U.S. copyrightability rule does not grant permission to copied input/output
elements, settle other jurisdictions, or establish provenance.

An AI image could pass D59 only if its manifest additionally records:

- provider, product, model/version, account class, generation date, and an
  archived or pinned copy/digest of the governing terms that expressly permit
  redistribution of output;
- prompt, seed/job id, settings, original output digest, and every input or
  reference image with its own authorization and digest;
- the person/account entitled to the output and authority to contribute it to
  this public project;
- all human modifications and the license applied to the contributed result;
- a human similarity/trademark/publicity review, with no prompt requesting a
  living artist’s style, protected character, brand, or unlicensed reference;
  and
- the same repo notice, dist notice/license, output hash, and no-runtime-fetch
  controls required of drawn art.

If any link in that chain is unavailable, the image is a D59 rejection. The
owner’s uncertain access means the chain is unavailable now; AI imagery is not
part of the recommended bundle.

## F. Unverified claims and exact confirmation pages

The following were not confirmed from the actual distributable bytes, either
because the page does not expose the fact or because this task prohibited asset
downloads:

1. **Kenney archive contents and checksums:** confirm in the included license
   file and exact filenames from the downloads linked by
   [Scribble Dungeons](https://kenney.nl/assets/scribble-dungeons),
   [Roguelike/RPG pack](https://kenney.nl/assets/roguelike-rpg-pack), and
   [Roguelike Characters](https://kenney.nl/assets/roguelike-characters).
   Specifically unverified: whether Scribble Dungeons alone has 3 readable PC
   and 4–6 monster tokens, and which files provide terrain.
2. **Quaternius archive identity and renderer fitness:** confirm the included
   license/readme and model inventory in the download linked by
   [Modular Dungeons Pack](https://quaternius.com/packs/modulardungeon.html).
3. **DCSS clean-export bytes:** confirm a specifically versioned archive under
   [`crawl/tiles` releases](https://github.com/crawl/tiles/tree/master/releases),
   its digest, its `ARTISTS.md`, and zero selected-name intersection with
   [`TILES_UNDER_UNKNOWN_LICENSE.md`](https://github.com/crawl/tiles/blob/master/TILES_UNDER_UNKNOWN_LICENSE.md).
4. **Game-icons.net source bytes:** each individual page confirms title, author,
   and license, but the SVG bytes, upstream filename, and digest were not
   downloaded. Confirm those on the exact individual URLs listed in section B
   and record their digests before committing.
5. **Final monster art coverage:** the increment-9 SRD roster is not yet
   selected. The exact page that will confirm this is the future approved
   encounter/starter-roster fixture; no current page can.
6. **Project-original rendered-output license:** no art-output grant exists yet.
   Confirm it in the future art section of repository `NOTICE.md` and the
   manifest row before committing any pre-rendered output.
7. **Dungeon Scrawl entitlement/layers:** confirm the owner’s active Pro receipt
   at generation time and the saved map’s layer inventory against the
   [current policy](https://help.roll20.net/hc/en-us/articles/36165245156247-Commercial-Use-Policy).
8. **Watabou reproducibility:** the [author FAQ](https://watabou.github.io/faq.html)
   confirms output use but says the generators generally are not open source;
   no page establishing an immutable One Page Dungeon generator version and
   reproducible seed pipeline was found.
9. **AI image authorization:** no provider/account/output exists. For an OpenAI
   generation, the applicable account terms on the generation date would be
   confirmed at [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/)
   (or the applicable business agreement), plus the generation record itself.

## Sources actually read

Primary or publisher-controlled pages used for the decision:

- Creative Commons: [CC0 deed](https://creativecommons.org/publicdomain/zero/1.0/),
  [CC0 legal code](https://creativecommons.org/publicdomain/zero/1.0/legalcode),
  [CC BY 3.0 deed](https://creativecommons.org/licenses/by/3.0/), and
  [CC BY 3.0 legal code](https://creativecommons.org/licenses/by/3.0/legalcode).
- Kenney: [Scribble Dungeons](https://kenney.nl/assets/scribble-dungeons),
  [Roguelike/RPG pack](https://kenney.nl/assets/roguelike-rpg-pack),
  [Roguelike Characters](https://kenney.nl/assets/roguelike-characters),
  [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon),
  [Roguelike Caves & Dungeons](https://kenney.nl/assets/roguelike-caves-dungeons),
  [Modular Dungeon Kit](https://www.kenney.nl/assets/modular-dungeon-kit), and
  [support/license FAQ](https://kenney.nl/support).
- Game-icons.net: [home/library summary](https://game-icons.net/),
  [about/authors/license](https://game-icons.net/about.html),
  [attribution FAQ](https://game-icons.net/faq.html), and every individual icon
  page linked in section B. The [Fog icon](https://game-icons.net/1x1/delapouite/fog.html)
  was also read but not selected; state-derived fog is safer and clearer.
- Quaternius: [Modular Dungeons Pack](https://quaternius.com/packs/modulardungeon.html)
  and [license FAQ](https://quaternius.com/faq.html).
- Dungeon Crawl Stone Soup: [official game license](https://github.com/crawl/crawl/blob/master/LICENSE),
  [dedicated tiles export](https://github.com/crawl/tiles),
  [artist approvals](https://github.com/crawl/tiles/blob/master/ARTISTS.md),
  [unknown-license exclusions](https://github.com/crawl/tiles/blob/master/TILES_UNDER_UNKNOWN_LICENSE.md),
  [release directory](https://github.com/crawl/tiles/tree/master/releases), and
  [OpenGameArt package description](https://opengameart.org/content/dungeon-crawl-32x32-tiles).
- Other generators: [Watabou FAQ](https://watabou.github.io/faq.html) and
  [Dungeon Scrawl commercial-use policy](https://help.roll20.net/hc/en-us/articles/36165245156247-Commercial-Use-Policy).
- AI: [OpenAI Terms of Use](https://openai.com/policies/terms-of-use/),
  [U.S. Copyright Office 2025 report summary](https://www.copyright.gov/newsnet/2025/1060.html?loclr=licop),
  [2025 report](https://www.copyright.gov/ai/Copyright-and-Artificial-Intelligence-Part-2-Copyrightability-Report.pdf?highlight=2025),
  [2023 guidance](https://www.copyright.gov/ai/ai_policy_guidance.pdf), and the
  [Copyright Office AI landing page](https://www.copyright.gov/ai/).

Secondary inventory pages read only to understand pack breadth, not to replace
the publisher’s license grant: [OpenGameArt Scribble Dungeons](https://opengameart.org/content/scribble-dungeons),
[OpenGameArt DCSS tiles](https://opengameart.org/content/dungeon-crawl-32x32-tiles),
[OpenGameArt Isometric Stone Soup](https://opengameart.org/content/isometric-stone-soup),
and [OpenGameArt top-down dungeon tiles](https://opengameart.org/content/top-down-dungeon-tiles-64x64).
