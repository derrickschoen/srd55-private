# Sweep 6 — import/recipient findings

Date: 2026-08-12  
Persona: a player who authored none of the received material  
Scope: discovery only; no production changes

## Method

I exercised the real Chromium app with `PLAYWRIGHT_PORT=5050` and fresh browser
profiles, then traced observed behavior into production code. The focused walks
included a level-13 Rogue using Veteran revision 3, the same character re-shared
by its recipient, a Veteran revision 2 character followed by a revision 3 share,
whole-library export/import, an archived hostile-name species, a version-1
library document, a reference-only v17 share, and a valid version-5-shaped
character backup containing the pre-contribution Veteran revision 2. The latter
was produced by adapting a current export to the accepted v5 contract because
the repository has no byte-frozen user v5 backup.

Targeted existing Playwright checks also passed:

- `Veteran v3 sheet values and the v2-to-v3 replacement review are visible`
- `v18 names embedded Portable Elf before direct commit and omits the line for SRD-only shares`
- `v17 refusal links through library adoption to the exact restored choice`
- `whole-library download restores authored and imported content into a fresh profile`

## Findings

### S6-01 — Catalog-layer language is implementation terminology, not player-facing provenance

- **What the persona did:** Opened a v18 Veteran revision 3 share in a fresh
  profile and read the preview before accepting it.
- **What happened:** The preview said `Rogue — SRD · bundled layer / Veteran
  (Bundled revision 3) — Homebrew · external layer`, and each incoming version
  repeated `Homebrew · external layer`. These phrases distinguish storage
  layers, but do not answer the recipient's questions: who made this, whether it
  came from the sender, whether it will remain linked to the sender, or whether
  accepting it makes a private copy. The wording comes directly from
  `catalogLayerLabel()` (`src/catalog/catalog-disclosure.ts:44-51`) and is used
  verbatim in share previews (`src/ui/screens/character-list/share-controls.ts:276-300`,
  `src/ui/screens/character-list/share-controls.ts:325-339`).
- **Severity:** minor
- **Proposed fix direction:** Lead with player consequences: for example,
  `Built into the app` and `Received homebrew — a local copy will be added to
  your library`. Keep `bundled`/`external` in an optional technical-details
  disclosure. Do not use a storage layer as a substitute for authorship or
  transfer provenance.

### S6-02 — A one-version character presents three Veteran versions as three unrelated installs

- **What the persona did:** Previewed and accepted a v18 character that uses
  only Veteran revision 3.
- **What happened:** Before acceptance the app listed `Veteran`, `Veteran
  (Bundled revision 2)`, and `Veteran (Bundled revision 3)` as three external
  entries that would be installed. After acceptance, the Subclasses library
  showed three separate cards. Every card said `Subclass · published homebrew
  version`; the first two had no `superseded` badge, successor name, or history
  explanation. The exporter intentionally traverses both ends of every
  supersession edge (`src/backup/portable-content.ts:794-843`), while the card
  renderer only uses `superseded_by` to remove the Edit button
  (`src/ui/screens/homebrew/homebrew-library.ts:284-335`).
- **Severity:** minor
- **Proposed fix direction:** Group a connected lineage as one library item,
  say `Veteran — 3 versions; this character uses revision 3`, and put earlier
  versions behind a History disclosure. At minimum, label old cards
  `Superseded by …` and explain why they arrived.

### S6-03 — A conflict-free whole-library import has no recipient review step

- **What the persona did:** Selected a whole-library JSON file in a fresh
  profile and clicked `Import library`.
- **What happened:** The import committed immediately and only then reported
  `Library imported: 8 published, 0 matched existing.` There was no preview of
  names, kinds, version lineages, dependencies, or archive consequences. The UI
  deliberately bypasses the review dialog whenever the plan has neither
  collisions nor refusals (`src/ui/screens/character-list/import-backup-controls.ts:493-522`).
  By contrast, the bundled-homebrew flow always shows an entry summary before
  commit.
- **Severity:** minor
- **Proposed fix direction:** Always show a read-only library manifest and an
  explicit final commit action. Collision choices can remain conditional, but
  a clean plan should still show what will be added, grouped by lineage and
  lifecycle state.

### S6-04 — Whole-library export turns archived content back into live content

- **What the persona did:** Published a species, archived it through `Delete` →
  `Archive creation and all listed characters`, downloaded the whole library,
  and imported that file into a fresh profile.
- **What happened:** The sender's Archive showed the species as archived. The
  export did include the species, but neither the document root nor its content
  entry carried `archived_at`. The recipient got `Library imported: 1
  published, 0 matched existing`; the species appeared as a live `Species ·
  published homebrew version` with Edit and Delete controls, its stored
  `archived_at` was `null`, and the recipient Archive said `The archive is
  empty.` The root query exports every external identity without filtering or
  projecting archive state (`src/backup/portable-content.ts:974-1028`), while
  the wire types have no lifecycle field (`src/backup/portable-content.ts:115-155`).
  The actual archive is explicitly restorable state
  (`src/ui/screens/homebrew/homebrew-library.ts:643-739`), so reactivation is not
  a harmless display difference.
- **Severity:** major
- **Proposed fix direction:** Mint a library format that carries archive-set
  membership and archive timestamps, then restores archived lineages as
  archived, atomically. If library export is intentionally live-content-only,
  exclude archived identities and label the control honestly; do not include
  them while dropping their lifecycle state.

### S6-05 — An updated share creates a duplicate character instead of an upgrade decision

- **What the persona did:** Accepted `Updated Veteran` while it used Veteran
  revision 2. The sender retargeted that same character to revision 3 and sent a
  new share link. The persona opened and accepted the updated link.
- **What happened:** The second preview again offered only `Add to my
  characters`. After acceptance, the profile contained two characters with the
  exact name `Updated Veteran`: character 1 still used revision 2 and character
  2 used revision 3. Nothing identified the link as an update, offered to
  replace the existing received character, or explained the resulting clone.
  The wire character has no durable source/share identity
  (`src/sharing/schema.ts:161-199`), and every commit unconditionally inserts a
  new character (`src/sharing/character-share.ts:2040-2081`). The UI likewise
  has only the add action (`src/ui/screens/character-list/share-controls.ts:181-205`,
  `src/ui/screens/character-list/share-controls.ts:477-495`).
- **Severity:** major
- **Proposed fix direction:** Give shared characters a stable sender-scoped
  document identity plus a received-revision marker. When a later share matches
  a prior receipt, show `Update existing`, `Keep existing`, and `Add as a copy`,
  with a before/after review. Preserve clone import for genuinely unrelated or
  explicitly copied documents.

### S6-06 — Imported supersession history has no discoverable replacement path

- **What the persona did:** Accepted the revision-2 share, which installed all
  three Veteran versions and their supersession edges, then opened the Homebrew
  library looking for the upgrade/fix flow.
- **What happened:** There was no `Review character fixes` link anywhere in the
  imported library. Revision 2 merely lacked an Edit button. Manually typing
  `/homebrew/replacements/<v2-key>/<v3-key>` loaded a working replacement plan,
  proving the backend state was sufficient; the route was simply unreachable
  from the recipient UI. The link is only emitted from the transient result of
  locally publishing a new version (`src/ui/screens/homebrew/homebrew-library.ts:895-916`,
  `src/ui/screens/homebrew/homebrew-routes.ts:11-30`), not from imported
  supersession rows or published cards.
- **Severity:** major
- **Proposed fix direction:** Derive replacement affordances from persisted
  supersession edges and actual character usage. A superseded library card
  should name its successor and offer `Review updates for N characters`; the
  affordance must survive reload and library import.

### S6-07 — The replacement “review” does not explain the rules change

- **What the persona did:** Opened the otherwise hidden Veteran revision 2 → 3
  replacement route from the recipient profile.
- **What happened:** The entire substantive review was `subclass content
  reference`, `Before: Veteran (Bundled revision 2)`, and `After Apply: Veteran
  (Bundled revision 3)`. It did not disclose that revision 3 adds the typed
  Deeper Cuts/Veteran's Strike Sneak Attack calculation or the Veteran Reflexes
  resource pool. The renderer only lists generic changed paths and the target
  name (`src/ui/screens/homebrew/homebrew-library.ts:397-427`); it has no rules
  summary or sheet-impact delta. This is not enough information for a recipient
  to decide whether to change a live character.
- **Severity:** major
- **Proposed fix direction:** Include an authored changelog when available and
  a generated mechanical delta: added/removed/changed features, choices,
  contributions, resources, and affected sheet values. For this case, preview
  the old and new Sneak Attack line and the new Reflexes maximum before apply.

### S6-08 — Declining replacement is implicit, and replacement is all-or-nothing

- **What the persona did:** Read the replacement route and tried to decline it.
- **What happened:** The page correctly said `Each listed character keeps the
  previous version unless you explicitly apply every change below.` Navigating
  away left revision 2 unchanged, so the safe default works. However, the only
  action on the page was `Apply to all listed characters`; there was no
  `Keep current version`, Cancel/Back action, or per-character choice. The
  renderer creates one apply-all button after listing every plan
  (`src/ui/screens/homebrew/homebrew-library.ts:520-555`).
- **Severity:** minor
- **Proposed fix direction:** Add an explicit `Keep current versions` action
  that records/announces the no-change result and returns to the library. Allow
  per-character Apply/Keep choices, with Apply All as a convenience rather than
  the only commit shape.

### S6-09 — Old reference-only shares send players to a generic importer with only an internal key

- **What the persona did:** Opened a valid v17 reference-only Veteran revision
  3 share in a fresh profile.
- **What happened:** The app refused atomically, hid `Add to my characters`, and
  said: `your catalog has no subclass
  '2024:content.subclass:veteran-bundled-revision-3'. Import subclass
  '2024:content.subclass:veteran-bundled-revision-3', then open the link again.`
  The link only opened/focused the generic Library JSON importer. It did not use
  the player-visible name already present in the share, offer the app's own
  bundled-homebrew installer for this known entry, or tell the recipient to ask
  the sender for a library export. Diagnostics are constructed entirely from
  the content key (`src/sharing/import-issues.ts:77-114`) and the UI maps all
  missing-content issues to the same generic route
  (`src/ui/screens/character-list/share-controls.ts:367-401`).
- **Severity:** major
- **Proposed fix direction:** Say `Veteran (Bundled revision 3)` first and put
  the key in details. For known bundled content, offer `Import bundled
  homebrew`. For arbitrary external content, say explicitly `Ask the sender for
  a library JSON containing this subclass`, retain the share fragment across
  the detour, and offer `Retry share` after import.

### S6-10 — The old-share adoption choices contradict the review facts

- **What the persona did:** Imported the needed library, reopened the v17 link,
  clicked Add, and read the required adoption dialog.
- **What happened:** The dialog first said `The share supplied only a reference,
  not incoming rules`, then offered `Match — Discards the incoming rules` and
  `Clone — Installs the incoming rules under a new name`. There are no incoming
  rules to discard or install. The code already has correct reference-specific
  copy (`src/ui/content-decision-copy.ts:22-27`), but the common adoption dialog
  always requests the ordinary `adoption` wording
  (`src/ui/content-adoption-dialog.ts:312-315`,
  `src/ui/content-adoption-dialog.ts:363-375`).
- **Severity:** major
- **Proposed fix direction:** Select copy by review shape. A reference-only
  choice should say `Use this local Veteran for the imported character` versus
  `Create a private copy of this local Veteran and attach the imported
  character`. Never claim that absent rules are being installed or discarded.

### S6-11 — A pre-contribution backup imports cleanly but silently produces an incomplete sheet

- **What the persona did:** Imported a valid version-5-shaped character backup
  for a level-13 Veteran revision 2. Its two carried Veteran aggregates had no
  `contributions` fields, matching the accepted pre-contribution content shape.
- **What happened:** The UI reported only `Character imported as #1.` with no
  notice. The preserved revision-2 prose says Veteran's Strike makes Sneak
  Attack dice equal Rogue level and Veteran Reflexes has proficiency-bonus uses
  (`src/authoring/bundled-homebrew-catalog.ts:288-293`), but the imported sheet
  showed only `Sneak Attack 7d6` and had no Veteran Reflexes pool. Historical
  contribution absence is intentionally accepted and becomes zero stored
  contribution rows (`tests/integration/backup/portable-content.test.ts:529-556`);
  version 5 also carries no supersession edges
  (`src/backup/character-backup.ts:1547-1556`). Refusing to invent typed rules is
  correct. Presenting the resulting numbers as complete is not.
- **Severity:** major
- **Proposed fix direction:** During import, detect mechanically meaningful
  authored features that predate the structured contribution layer. Mark the
  affected sheet values absent/UNKNOWN with a named warning rather than showing
  plausible incomplete totals. When an exact known successor is available,
  offer a reviewed upgrade to it; never parse or guess mechanics from prose.

### S6-12 — Received content loses origin/author provenance and is re-shared as indistinguishable homebrew

- **What the persona did:** Accepted the Veteran v18 share, opened the Homebrew
  library, then created a new share link for the received character and opened
  it in a third fresh profile.
- **What happened:** The recipient's cards called all received revisions
  `published homebrew version` and allowed `Edit as new version` on revision 3.
  Re-sharing produced the same three `Homebrew · external layer` disclosures as
  the original sender. The downstream recipient could not tell that the current
  sharer had received rather than authored the rules, who the original author
  was, or what attribution/license should follow the content. The registry
  stores only key, kind, layer, normalized name, timestamps, and archive state
  (`db/schema/catalog-content.ts:71-85`); portable entries carry rules identity
  but no creator/source/license provenance (`src/backup/portable-content.ts:115-155`).
  The library success summary further calls every created import `published`
  (`src/ui/screens/character-list/import-backup-controls.ts:360-368`).
- **Severity:** major
- **Proposed fix direction:** Model transfer provenance separately from rules
  identity: original author/source label, license/attribution payload, received
  document identity, and local derivation history. Label cards `Received
  homebrew` versus `Authored here`; label import outcomes `added to library`,
  not `published`; and preserve the provenance chain on backup/share/re-export.

### S6-13 — Successful share import reports an internal row number instead of a useful next action

- **What the persona did:** Accepted both new and old-format character shares.
- **What happened:** Success was reported as `Character added as #1.` (and later
  `#2`). The database id is not meaningful to a player, and the status offered
  no `Open sheet` or `Review imported character` action. Both direct and
  reviewed paths construct this message from `characterId`
  (`src/ui/screens/character-list/share-controls.ts:453-463`,
  `src/ui/screens/character-list/share-controls.ts:477-495`).
- **Severity:** polish
- **Proposed fix direction:** Report the character name and link directly to
  its sheet: `Recipient Veteran v3 was added. Open character.` Keep the numeric
  id out of normal UI.

## Verified non-findings

- The v18 preview was non-mutating: the fresh profile had no character or
  Veteran rows until the explicit Add action.
- Contribution bytes survived the v18 transfer. At level 13 the imported sheet
  showed `7d6 + 6d6 (Veteran's Strike)`, explained the superseded Deeper Cuts
  term, and rendered five Veteran Reflexes boxes. The focused portability test
  also pins contributions through library, character backup, and v18 share
  (`tests/integration/backup/portable-content.test.ts:462-527`).
- A version-1 library document remained accepted, and absence of historical
  contribution fields was not replaced with invented values.
- Hostile labels remained inert in share/library/archive surfaces. The literal
  `<img data-s6-hostile ... onerror=alert(1)>` name rendered as text and created
  zero matching DOM elements. Shared free text is assigned through
  `textContent` (`src/ui/free-text.ts:20-27`), and compatibility issue text uses
  the same inert discipline (`src/ui/screens/character-list/share-controls.ts:380-396`).

## Severity totals

- BLOCKER: 0
- major: 8
- minor: 4
- polish: 1
- total: 13
