# Sheet spell section and print appendix — technical design

**Status:** design document only. This document changes no production code,
tests, migrations, persistence registries, portable formats, or commits.

## 1. Ruling chain and proven assumptions

### 1.1 Binding ruling

D149 is the governing ruling and is quoted verbatim from
`.claude/decisions.md:76-85`:

> Closes the D87/D54.4 bar gap the panel found (no queued unit built the
> spell section). Chosen shape: a compact section on the sheet (name, level,
> prepared/known marker, save DC and spell attack stated once); PRINTING
> appends full spell text as appendix pages after the sheet, the same
> pattern D141 gave long flavor text — one stapled document per player.
> OWNER ADDITION, verbatim requirement: "print multiclass spells grouped by
> class, order by level and name" — the printed spell section and appendix
> group by contributing class, ordered by level then name within each class.
> The legacy /characters/:id/print route RETIRES (its stale PHP-era import
> instruction dies with it).

The owner's addition is therefore not an implementation preference. Both the
compact section as printed and the full-text appendix use the same class groups,
and each group sorts by spell level and then spell name.

The supporting chain is:

- D54 requires a right-numbered sheet whose unknowns say unknown, including a
  caster spell section (`.claude/decisions.md:740-747`).
- D87 assigns spell choices to the existing `spell_selection_slots` and grant
  machinery and explicitly puts the section in the v1 bar
  (`.claude/decisions.md:528-532`).
- D89 makes the sheet route itself the print document, not a second template
  (`.claude/decisions.md:517-521`).
- D141 says long flavor text uses print-only appendix pages after the sheet
  (`.claude/decisions.md:173-179`).
- D122 pins `@page` to US Letter (`.claude/decisions.md:238-240`).
- D125 requires the SRD notice and origin line on the last printed page
  (`.claude/decisions.md:259-265`).
- D91 says resource maxima, including slots, are computed from sourced class
  tables and marked on paper (`.claude/decisions.md:505-509`). This change adds
  no spell-slot arithmetic and does not alter D91-R/D143a's whole-section
  validity rule.
- D43 says “SRD 5.2 spells are CC-BY like everything else bundled”
  (`.claude/decisions.md:856-859`); D45 makes those SRD rows read-only and makes
  customization a fork (`.claude/decisions.md:830-835`).

### 1.2 Current-tree evidence

Every statement in this table was checked against the current tree. Quoted text
is current source text, not a proposed implementation.

| ID | Proven assumption | Current-tree evidence and consequence |
|---|---|---|
| **P1** | The sheet is one transient projection and is rendered once into readable and structured forms. | `CharacterSheetBuilder` says “NOTHING IN THIS FILE IS STORED” and “IT IS ONE PROJECTION, RENDERED TWICE” (`src/queries/character-sheet-builder.ts:92-105`). `build()` reads the character, resolved abilities, sourced content, and classes before returning `CharacterSheet` (`src/queries/character-sheet-builder.ts:665-688`). Spells must join this projection; a second print-only query/read model would recreate the retired split. |
| **P2** | The sheet currently carries no spell collection. | The complete `CharacterSheet` interface lists resources, classes, equipment, features, warnings, and gaps but no spells (`src/queries/character-sheet-builder.ts:329-378`). The return object builds `classes`, `items`, and `printed_features` but no spell rows (`src/queries/character-sheet-builder.ts:934-952`). The missing section is real, not merely an unrendered field. |
| **P3** | Prepared/known character assignments are queryable now. | `spell_selection_slots` stores `character_id`, `source_instance_id`, mutually exclusive fixed/current version ids, `bucket`, `always_prepared`, state, and eligibility (`src/db/schema.sql:1230-1276`). Its bucket CHECK is exactly `cantrip_known | prepared | known | spellbook | automatic` (`src/db/schema.sql:1270-1273`). `SpellAccessBuilder.slotRoutes()` already joins slots to active source instances, spell versions, and identities and filters inactive versions (`src/access/spell-access-builder.ts:349-386`), then refuses invalid selections unless they are explicit kept overrides (`src/access/spell-access-builder.ts:388-429`). The sheet projection can reuse that evaluated access result rather than inventing a second eligibility rule. |
| **P4** | Existing access data retains the assignment marker and the contributing source id, but the legacy printable grouping loses class identity. | `SpellAccessRoute` carries `source_instance_id`, `source_name`, and `bucket` (`src/access/spell-access-builder.ts:112-136`). `PrintableSpellListBuilder` groups only by `route.source_name` (`src/reports/printable-spell-list-builder.ts:212-261`), and `PrintableSourceGroup` has only a free-text `source`, ability, statistics, and spells (`src/reports/printable-spell-list-builder.ts:79-85`). What is missing is not storage: the legacy DTO never resolves a source instance to a `ClassDefinitionId` and class name. |
| **P5** | Existing schema can resolve class attribution without a mint. | A slot's composite FK binds its source to the same character (`src/db/schema.sql:1266-1269`). Source instances already have `parent_source_instance_id`, `source_type`, and `source_definition_id` (`src/db/schema.sql:529-545`). A direct class source points to `class_definitions`; a subclass definition already points to its owning class (`src/db/schema.sql:1411-1425`); the character class row binds that class/subclass pair (`src/db/schema.sql:294-308`). The existing acquisition query demonstrates the exact `CASE`: class sources use their definition id and subclass sources use `subclass.class_definition_id` (`src/eligibility/spell-selection-assignment.ts:89-107`). A recursive read through `parent_source_instance_id` also attributes a nested grant to its class ancestor. No column, migration, backup version, snapshot version, or share-wire version is needed. |
| **P6** | Save DC and spell attack already use resolved abilities and total-level proficiency. | `SpellAccessBuilder` resolves the character's ability contributions once (`src/access/spell-access-builder.ts:314-346`) and computes attack bonus and save DC from the effective spellcasting ability plus total-level proficiency (`src/access/spell-access-builder.ts:574-615`). It reads configured ability first, then class/subclass definitions, and returns absence rather than guessing for any other source (`src/access/spell-access-builder.ts:618-646`). The new section reuses these values and states each distinct casting basis once at group level, never once per spell. |
| **P7** | Full bundled spell prose is already stored, despite the misleading column name. | The SRD parser imports the complete spell-description extract and calls the post-metadata prose `description` (`src/rules/spells-srd.ts:8-22`, `src/rules/spells-srd.ts:248-288`). The SRD seed writes that complete prose to `spell_versions.short_summary` (`src/rules/spells-srd.ts:512-570`); the schema stores the field as nullable text (`src/db/schema.sql:1358-1388`). The legacy full renderer reads it as `description` (`src/reports/printable-spell-list-builder.ts:171-196`, `src/reports/printable-spell-list-builder.ts:432-458`) and prints it or “Description unavailable” (`src/ui/screens/print/printable-list.ts:159-176`). The appendix reuses the stored bytes; it does not parse `docs/srd/full/srd-5.2.1.txt` at runtime. |
| **P8** | Bundled text has pinned provenance and licensing obligations. | `docs/srd/SOURCE.md` identifies the official SRD 5.2.1 PDF, checksum, retrieval date, and CC-BY-4.0 license (`docs/srd/SOURCE.md:8-21`), and pins the complete 339-heading spell-description extract (`docs/srd/SOURCE.md:63-72`). `docs/srd/ATTRIBUTION.md` requires the notice in any printed sheet reproducing SRD text (`docs/srd/ATTRIBUTION.md:32-39`). The spell appendix therefore remains before, and covered by, the existing final attribution notice. |
| **P9** | D122 is currently supplied by the legacy print screen's CSS, so deleting that screen without moving the rule would regress page size. | `src/ui/screens/print/styles.css:253-256` declares `@page { size: letter; margin: 0.5in; }`. Screen modules are eagerly discovered (`src/ui/app.ts:33-35`), and the legacy print screen imports that stylesheet (`src/ui/screens/print/screen.ts:1-6`). Route retirement must first move the one `@page` rule to the surviving sheet stylesheet; otherwise removal also removes D122. |
| **P10** | The supplied claim that D141's flavor appendix is implemented is false in this current tree. Its implementation is a prerequisite, not evidence this document can cite as code. | The current `CharacterSheet` has no flavor object (`src/queries/character-sheet-builder.ts:329-378`), `renderSheet()` renders only normal panels and facts (`src/ui/screens/sheet/sheet-view.ts:1188-1283`), and `setSheetPrintContent()` creates only paper HP/XP fields and the attribution notice (`src/ui/screens/sheet/sheet-view.ts:1286-1364`). The queued FF-C dispatch says “Implement exactly FF-C” and specifies the future mechanism: “appendix pages get `break-before: page` and their prose `break-inside: auto`” (`.claude/handover/briefs/ff-c.md:1-16`, `.claude/handover/briefs/ff-c.md:95-113`). SS-3 depends on FF-C and reuses those merged symbols/classes rather than creating a parallel mechanism. |
| **P11** | The current sheet print compositor already inserts print-only DOM and removes it on return to screen media. | `setSheetPrintContent()` removes prior print fields/notice, exits for screen media, and appends new print-only nodes for print media (`src/ui/screens/sheet/sheet-view.ts:1286-1315`, `src/ui/screens/sheet/sheet-view.ts:1317-1364`). `screen.ts` drives that mutator from initial media state, `beforeprint`, `afterprint`, and the print-media listener (`src/ui/screens/sheet/screen.ts:70-94`). The appendix belongs in this compositor, not as hidden screen DOM. |
| **P12** | D125's notice is currently forced onto a new last page and tested as the last child. | The compositor appends the notice last, including the exact notice and `Printed from SRD-55 ${BUILD_ID}` (`src/ui/screens/sheet/sheet-view.ts:1353-1363`). CSS gives it `break-before: page` (`src/ui/screens/sheet/styles.css:232-235`). The browser test asserts both that break and `parentElement.lastElementChild === element` (`tests/browser/character-sheet.spec.ts:625-642`). This assertion stays unchanged; spell/flavor appendices are inserted before the notice. |
| **P13** | Slot presentation already comes from D91-R and must stay independent. | `CharacterSheetBuilder` calls `resolveSheetResources` before building the sheet (`src/queries/character-sheet-builder.ts:684-700`), and the view maps `spell_slot`/`pact_slot` resource results to their existing labels and paper markings (`src/ui/screens/sheet/sheet-view.ts:312-446`). The spell section reads assignments and access statistics only. It does not read `class_progressions.slots`, compute effective caster level, count boxes, or change resource absence behavior. |

### 1.3 Exactly what is and is not missing

The character's prepared/known spells are already queryable per character and
their persisted source is already recorded. Class attribution is also derivable
from existing relations. The missing pieces are transient read-model behavior:

1. `CharacterSheetBuilder` does not ask for spells at all (P2).
2. `SpellAccessRoute` carries a source id but no resolved contributing-class
   relation (P4).
3. The legacy printable builder groups by mutable source display name rather than
   by branded class definition id (P4).
4. The current sheet compositor has no shared appendix registry because FF-C has
   not merged (P10).

All four are read/projection concerns. The design is **MINT-FREE**.

## 2. Sheet section anatomy and screen/print behavior

### 2.1 One typed projection

Create `src/queries/character-spell-section-builder.ts` and have
`CharacterSheetBuilder.build()` call it once. The new builder consumes evaluated
`SpellAccessRoute` rows and returns a nested `CharacterSheet.spells` value. It
owns ordering and attribution; the DOM renderer never re-groups or re-sorts.

The contract is a closed, source-carrying shape:

```ts
type SheetSpellMarker = 'prepared' | 'known';

type SheetSpellLevel =
  | { readonly status: 'known'; readonly value: SpellLevel }
  | { readonly status: 'unknown'; readonly reason: 'placeholder_level' };

type SheetSpellcastingStatistic =
  | {
      readonly status: 'computed';
      readonly ability: Ability;
      readonly save_dc: number;
      readonly attack_bonus: number;
    }
  | {
      readonly status: 'absent';
      readonly reason: 'spellcasting_ability_not_recorded';
      readonly detail: string;
    };

interface SheetSpell {
  readonly spell_version_id: SpellVersionId;
  readonly name: string;
  readonly level: SheetSpellLevel;
  readonly marker: SheetSpellMarker;
  readonly reference: SheetSpellReference;
}

type SheetSpellGroup =
  | {
      readonly kind: 'class';
      readonly class_definition_id: ClassDefinitionId;
      readonly class_name: string;
      readonly statistics: readonly SheetSpellcastingStatistic[];
      readonly spells: readonly SheetSpell[];
    }
  | {
      readonly kind: 'other_source';
      readonly source_instance_id: SourceInstanceId;
      readonly source_name: string;
      readonly statistics: readonly SheetSpellcastingStatistic[];
      readonly spells: readonly SheetSpell[];
    };
```

`SheetSpellReference` carries the exact stored full-reference fields needed by
the appendix: edition, school, casting time/action, range, duration, components,
concentration, ritual, upcast/cantrip-upgrade levels and summaries, attack modes,
save abilities, and the full prose from `short_summary`. It uses
`description: string | null`; absence never becomes invented text. The new DTO
threads the existing `SpellVersionId`, `SourceInstanceId`, `ClassDefinitionId`,
and `SpellLevel` brands declared at `src/domain/ids.ts:32-46`,
`src/domain/ids.ts:156-159`, and `src/domain/ids.ts:210-218`.

The prose and free-text names remain out of `sheetFacts()`. D149 asks for a
player-facing reference, not a new agent-facing catalog dump. The compact
spell names are rendered through `freeTextSpan()` because imported/homebrew
names remain unverified text; the appendix prose is also text-node-only.

### 2.2 Assignment selection and marker rules

Use `SpellAccessBuilder.buildForCharacter(characterId)` as the one eligibility
and statistic resolver. Keep only slot-origin routes whose bucket is
`prepared`, `known`, `cantrip_known`, or `automatic`. This includes the
character's current prepared/known/cantrip/fixed selections and excludes:

- empty selection slots;
- orphaned or invalid active selections already rejected by `SpellAccessBuilder`;
- inactive spell versions;
- long-rest catalog candidates, which are choices the character has not made;
- `spellbook` acquisitions, which are stored separately in
  `wizard_spellbook_entries` (`src/db/schema.sql:1590-1636`) and are not, by that
  fact alone, prepared or known;
- unprepared Wizard spellbook entries exposed only through the `ritual_only`
  capability route. Existing tests explicitly state that book membership “is not
  the same as labeling a spell known or prepared”
  (`tests/integration/reports/printable-list.test.ts:350-379`), so D149 does not
  authorize relabeling those rows.

Marker mapping is exhaustive and has no default arm:

| Stored route | Compact marker | Reason |
|---|---|---|
| `bucket === 'prepared'` | **Prepared** | This is the character's current preparation assignment. |
| `always_prepared === true` | **Prepared** | The grant is expressly always prepared even if its bucket is automatic. Extend the access route with this already-stored flag; do not infer it from a rule name. |
| `cantrip_known`, `known`, or remaining `automatic` | **Known** | These are character-held access choices that do not consume a current prepared assignment. |

`spellbook` is an explicit excluded arm, not a default arm. If a future producer
places it in `spell_selection_slots`, the type-directed selector still refuses
to label it Known. This preserves the existing distinction between book
membership and a prepared/known marker.

If the same spell version reaches one group through multiple active slots,
collapse only identical group/version rows and let **Prepared** dominate
**Known**. Do not deduplicate across contributing classes: a spell selected from
both Cleric and Wizard appears under both, because that is the class provenance
D149 orders the printout to preserve.

Placeholder spell versions use `SheetSpellLevel.status = 'unknown'` instead of
printing the storage sentinel `-1` as a level. Known levels sort 0..9, then
unknown levels, then name. This is the only honest extension of “order by level
and name” when imported placeholder content has no level.

### 2.3 Mint-free contributing-class query

Resolve all route source ids in one recursive query, not one query per spell:

```sql
WITH RECURSIVE source_ancestry AS (
  SELECT source.id AS origin_id, source.id, source.parent_source_instance_id,
         source.source_type, source.source_definition_id, 0 AS depth,
         printf('/%d/', source.id) AS visited
  FROM character_source_instances AS source
  WHERE source.character_id = ?
    AND source.id IN (...route source ids...)

  UNION ALL

  SELECT child.origin_id, parent.id, parent.parent_source_instance_id,
         parent.source_type, parent.source_definition_id, child.depth + 1,
         child.visited || printf('%d/', parent.id)
  FROM source_ancestry AS child
  JOIN character_source_instances AS parent
    ON parent.id = child.parent_source_instance_id
   AND parent.character_id = ?
  WHERE instr(child.visited, printf('/%d/', parent.id)) = 0
), class_candidates AS (
  SELECT ancestry.origin_id, ancestry.depth,
         CASE ancestry.source_type
           WHEN 'class' THEN ancestry.source_definition_id
           WHEN 'subclass' THEN subclass.class_definition_id
         END AS class_definition_id
  FROM source_ancestry AS ancestry
  LEFT JOIN subclass_definitions AS subclass
    ON ancestry.source_type = 'subclass'
   AND subclass.id = ancestry.source_definition_id
)
SELECT candidate.origin_id, class.id AS class_definition_id, class.name
FROM class_candidates AS candidate
JOIN class_definitions AS class ON class.id = candidate.class_definition_id
ORDER BY candidate.origin_id, candidate.depth, class.id;
```

The slash-delimited visited path makes integer id `2` distinct from `12` and
terminates self- or mutually-referential corrupt ancestry without an arbitrary
depth cap that could silently cut off valid provenance.

Take the nearest class/subclass ancestor for each origin source. Direct class and
subclass spell grants therefore group under their class; a feat/source granted
as a child of a class also remains under that contributing class. A standalone
feat/species/background has no class ancestor and becomes an `other_source`
group. That fallback is necessary: D56 says lineage spells are real, and calling
one a Wizard spell merely because it uses Intelligence would fabricate
provenance. `other_source` groups render after all class groups, ordered by source
name, and use the same level/name order internally.

Class groups sort by class name with branded id as a deterministic tie-break.
Within every class and other-source group, known level ascending, unknown level
last, then exact spell name, then `SpellVersionId`. Both screen and print consume
this already ordered array.

### 2.4 Save DC and spell attack stated once

Statistics live on the group, never on each compact spell row. Deduplicate them
by `(ability, save_dc, attack_bonus)` while preserving the source order from the
evaluated access routes.

D149's “stated once” means once per distinct mechanically valid casting basis,
not “pick one basis and suppress the others.” For ordinary class data there is
one basis and therefore exactly one line. Multiple lines are permitted only
when the persisted homebrew sources actually resolve to distinct bases.

Normal class groups have one statistic and render one line:

> Save DC 15 · Spell attack +7

An absent ability renders one group-level sentence such as “Save DC and spell
attack are unknown because this source has no spellcasting ability recorded.” It
does not print em dashes that look like zero. If homebrew content produces two
distinct casting bases inside one class group, render a single “Spellcasting
statistics” block with each distinct source-labelled basis once. Never choose
one arbitrarily and never repeat either pair on every spell.

### 2.5 Section anatomy

The sheet section is “Spells” and contains only D149's compact fields:

- one group-level Save DC / spell-attack line as described above;
- each spell's name;
- “Cantrip” or “Level N” (or “Level unknown” for a placeholder);
- exactly one **Prepared** or **Known** marker.

No casting time, range, components, description, slot counts, access-mode prose,
long-rest candidate list, or Wizard-state explanation appears in the compact
section. Those first four belong in the appendix; slots stay in D91-R resources;
the latter report-era material is not the D149 sheet.

The screen and printed main sheet use the same DOM and ordering. Screen never
contains hidden full spell text. Full text exists in the transient JS projection
but appendix DOM is created only when print media is active, matching the current
print-content contract (P11).

### 2.6 Single-class rendering decision

**A single-class caster renders no class group header.** The section title and
one statistics line are followed directly by level/name-ordered spells. Repeating
“Wizard” between the sheet's class identity and a single spell list spends scarce
sheet space without disambiguating anything.

At two or more contributing classes, every class group gets a visible class
heading. Standalone `other_source` groups always retain their source heading; an
unlabelled Magic Initiate or lineage spell would lose real provenance. The same
conditional header rule is used in the compact printed section and appendix, so
single-class print does not acquire a header absent on screen.

## 3. Full-text appendix, page breaks, and attribution

### 3.1 Content source and card anatomy

Printing the sheet always appends the spell appendix when at least one compact
spell exists. There is no reference/full selector and no opt-in: D149 says
printing appends full text.

Each appendix entry reconstructs the complete stored spell entry from
`SheetSpell.reference`:

1. name, level, school, and non-2024 edition marker when applicable;
2. casting time/action, range, duration, components, concentration, and ritual;
3. upcast and cantrip-upgrade lines only when recorded, preserving their distinct
   units;
4. attack modes and save abilities when recorded;
5. the exact stored description prose, preserving line breaks.

`description === null` renders “Full spell text unavailable for this imported or
placeholder spell.” A single appendix-level notice names the affected spells. It
must not claim text is globally uninstalled: bundled SRD text exists by D43 and
P7. In particular, the PHP-era instruction at
`src/ui/screens/print/printable-list.ts:14-18` and
`src/ui/screens/print/printable-list.ts:254-274` is deleted, not rewritten.

The appendix uses the same `SheetSpellGroup[]` and order as the compact section.
There is no renderer-side regrouping and no second comparator. This makes a
mutation of class attribution or level/name ordering fail both projections from
one controlled input rather than allowing two implementations to agree with
themselves.

### 3.2 D141 mechanism and dependency

There is no current flavor-appendix implementation to cite (P10). The binding
FF-C implementation contract nevertheless states exactly how its appendix will
paginate:

> “appendix pages get `break-before: page` and their prose `break-inside: auto`”
> (`.claude/handover/briefs/ff-c.md:107-113`).

SS-3 starts only after FF-C merges. It reuses FF-C's merged pure appendix-content
factory/compositor and shared appendix classes. If FF-C lands under different
symbol names, SS-3 consumes those names after a local seam audit; it does not
copy the mechanism under spell-specific names.

The spell appendix applies the same rule:

- one appendix root begins with `break-before: page`;
- group and spell headings use `break-after: avoid`;
- a short heading/facts block avoids splitting;
- spell prose uses `break-inside: auto`, `orphans: 3`, and `widows: 3`, so a long
  spell can continue naturally rather than overflowing or wasting a page;
- the whole spell card is **not** `break-inside: avoid` in full-text mode.

This is “same pattern” in both DOM lifecycle and pagination: pure appendix
content, materialized only for print, one forced start page, and splittable long
prose.

### 3.3 Document order and the D125 last element

The print compositor owns one explicit order:

```text
main character sheet (including compact spell section)
  -> optional D141 full-written-text appendix
  -> D149 full-spell-text appendix
  -> D125 SRD attribution notice + origin line (always last)
```

On every synchronization, remove previously generated print nodes, create the
enabled appendices in that order, then append the attribution notice. Do not let
an appendix append itself after the notice. This keeps the existing assertion at
`tests/browser/character-sheet.spec.ts:638-642` unchanged. Amend that same named
browser test by adding two assertions: the spell appendix precedes the notice,
and the notice remains `lastElementChild` with `break-before: page`.

The notice's own page break remains. This may place attribution on a separate
last page, exactly as D125 currently requires.

### 3.4 US Letter ownership

Before deleting `src/ui/screens/print/styles.css`, move its sole global page rule
verbatim to `src/ui/screens/sheet/styles.css`:

```css
@page {
  size: letter;
  margin: 0.5in;
}
```

There must be exactly one `@page` rule after retirement. The current browser
assertion that scans loaded stylesheets for `size: letter`
(`tests/browser/character-sheet.spec.ts:522-530`) stays unchanged and runs with
the spell appendix present.

## 4. Legacy `/characters/:id/print` retirement

### 4.1 Runtime and documentation inventory

The route is convention-discovered rather than centrally registered: the
application eagerly discovers every `screen.ts` and renders the first matcher
(`src/ui/app.ts:10-35`, `src/ui/app.ts:66-99`). Retirement therefore means
deleting its screen module, not adding a compatibility redirect.

| Current reference | Action |
|---|---|
| `src/ui/screens/print/screen.ts:8-25`, `src/ui/screens/print/screen.ts:27-98` | **Delete file.** Removes the exact route matcher, variant parsing, printable RPC, variant navigation, and legacy print-button listener. No redirect or route alias replaces it. |
| `src/ui/screens/print/printable-list.ts:1-334` | **Delete file.** The D149 sheet renderer/appendix replaces its relevant character-spell presentation. This also deletes the stale PHP import instruction at `src/ui/screens/print/printable-list.ts:14-18` and `src/ui/screens/print/printable-list.ts:254-274`. |
| `src/ui/screens/print/styles.css:1-325` | **Delete after moving the D122 `@page` rule.** Spell appendix styles live with the sheet; no retired screen CSS remains in the eager bundle. |
| `src/ui/screens/planner/screen.ts:425-435` | **Remove** the “Print spells” `/print` link. Keep “Character sheet”; add or relabel a sheet action only if needed to make print discoverable. The sheet header gets a labelled `.sheet-chrome` **Print character sheet** button wired to `window.print()` by the sheet screen. |
| `src/ui/screens/build-report/build-report.ts:210-215` | **Replace** “Printable spell list” with “Character sheet” linking to `/characters/:id/sheet`. The build report remains read-only and otherwise unchanged. |
| `src/ui/screens/sheet/screen.ts:17-21` | **Update stale comment** so it no longer describes matcher priority against `/print`; retain the exact `/sheet` matcher. |
| `src/queries/client.ts:47-50`, `src/queries/client.ts:101-104`, `src/queries/client.ts:252-262` | **Remove** printable types and `QueriesClient.printable()`. `sheet()` now returns the one spell-bearing projection. |
| `src/worker/handlers/queries.ts:24-27`, `src/worker/handlers/queries.ts:54-56`, `src/worker/handlers/queries.ts:227-235`, `src/worker/handlers/queries.ts:345-353` | **Remove** printable builder import, params guard, and `queries.reports.printable` handler. No replacement RPC is minted; `queries.characters.sheet` is extended. |
| `src/reports/printable-spell-list-builder.ts:1-552` | **Delete after extracting only reusable access/fact reading into the new character spell builder.** Do not preserve `PrintableVariant`, unprepared long-rest catalog sections, or a compatibility DTO. |
| `src/reports/printable-ordering.ts:1-104` | **Delete or rename to a sheet-spell ordering module only if another current caller remains.** The D149 comparator is level → name → branded-id, not legacy source-natural/mode ordering. |
| `progress/U72.md:7-21` | **Retain as historical delivery record**, but add a short retirement note pointing to D149 and this design when implementation lands; do not rewrite history as though the route never existed. |
| `.claude/decisions.md:74-85` and `.claude/handover/lane-state.md:25-27` | **Retain.** These are the binding ruling and queue record, not stale product references. |

The retired URL becomes an unmatched route and receives the application's normal
unmatched-route shell (`src/ui/app.ts:70-88`). This is intentional pre-alpha
replacement behavior. A redirect would preserve the retired interface and is
forbidden by D149.

### 4.2 Test/source inventory

| Current test/reference | Action and replacement |
|---|---|
| `tests/browser/reports-and-print.spec.ts:173-262` | **Remove** the legacy browser test. Its strict-superset replacement is `tests/browser/character-sheet.spec.ts` test **“spell section and print appendix replace the legacy print route without writes”**; assertion-by-assertion mapping is below. Keep the build-report browser test at `tests/browser/reports-and-print.spec.ts:83-171`. |
| `tests/browser/character-sheet.spec.ts:1023-1040` | **Replace** the printable/sheet shadow test with **“legacy print route retires while the exact sheet route remains reachable”**. It asserts `/print` mounts no printable or sheet screen and `/sheet` mounts exactly the sheet. |
| `tests/browser/php-feature-parity.spec.ts:2378-2520` | **Retain and amend**, do not remove. Replace the printable RPC/route assertions with the sheet RPC, compact section, print-media appendix, grouped statistics, marker, and no-write assertions. The test keeps its existing name so its persisted-fixture oracle remains recognizable. |
| `tests/unit/ui/level-up-wizard.test.ts:275-291` | Replace `/characters/7/print` in the negative route list with another real non-level-up route such as `/characters/7/report`; its subject is exact level-up matching, not print existence. |
| `tests/unit/ui/reports.test.ts:58-84`, `tests/unit/ui/reports.test.ts:161-327` | Keep the build-report half. Move retained spell projection/rendering assertions into `tests/unit/ui/sheet-view.test.ts` and new query integration coverage; delete variant and PHP-warning assertions whose subject retired. |
| `tests/integration/reports/printable-list.test.ts:1-444` | Replace with `tests/integration/queries/character-sheet-spells.test.ts`. Retain controlled-row, deterministic-build, class/source grouping, statistics, description absence, Wizard prepared, no-write, and ordering proofs. Remove long-rest candidate/reference-variant subjects rather than pretending they are character spells. |
| `tests/integration/reports/printable-list-fixture.ts:1-495` | Rename/adapt to `tests/integration/queries/character-sheet-spells-fixture.ts`; keep the useful multiclass, hostile source, missing-text, free-cast, and mixed-stat facts, and add explicit known/prepared/always-prepared/placeholder rows. |
| `tests/integration/queries/rpc.test.ts:264-271` | Remove `queries.reports.printable` call and assert the extended `queries.characters.sheet` result instead. |
| `tests/browser/fixtures/php-parity.ts:20-21`, `tests/browser/fixtures/php-parity.ts:608` | Point the parity fixture at the renamed sheet-spell fixture. |

### 4.3 Strict-superset browser assertion mapping

Removed browser coverage is legal only with these named replacements.

| Removed assertion | Named strict-superset replacement |
|---|---|
| `/print` defaults to a reference variant, title is the spell list, variant selector and Print button are visible (`tests/browser/reports-and-print.spec.ts:182-189`). | **“spell section and print appendix replace the legacy print route without writes”** opens `/sheet`, asserts the character-sheet title, compact spell section, labelled **Print character sheet** button, no variant selector, and full appendix on print. This covers the user action while proving D149's stronger always-full behavior. |
| Source headings are naturally ordered as Cleric, Druid, Gift 2, Gift 10, Wizard (`tests/browser/reports-and-print.spec.ts:190-198`). | The same replacement asserts class groups are class-attributed, every class's spells are level/name ordered, and standalone Gift 2/Gift 10 rows remain in ordered **Other sources** groups. It also uses a same-spell/two-class fixture so grouping cannot be faked by global ordering. |
| Command shows route-specific access and DC; Misty Step shows slots-plus-free-cast (`tests/browser/reports-and-print.spec.ts:200-210`). | The same replacement asserts Command's Cleric group states Save DC/attack exactly once and the row is Prepared; Misty Step remains present under its truthful non-class source with a Known marker and its source-level statistics once. Access-mode prose is intentionally replaced by D149's prepared/known marker, and the test proves the controlling stored free-cast row still remains unchanged. |
| Selecting full changes URL/variant, shows the partial warning, prints Command text, and marks missing Goodberry text (`tests/browser/reports-and-print.spec.ts:212-230`). | The same replacement has no selector or URL variant; on print it asserts the appendix is always present, Command's exact full prose appears, Goodberry states text unavailable, the appendix-level missing-text notice names Goodberry, and no PHP instruction exists anywhere in the DOM. |
| Print controls hide, full grid becomes one column, and a card avoids splitting (`tests/browser/reports-and-print.spec.ts:232-242`). | The same replacement asserts all `.sheet-chrome` controls hide, the appendix root starts a page, headings/facts avoid separation, and long prose is `break-inside: auto` with widows/orphans. This is stricter than the legacy whole-card `avoid` assertion and covers the D141 mechanism. |
| Character/slot rows and the full database are unchanged (`tests/browser/reports-and-print.spec.ts:244-262`). | The same replacement captures/export-compares the full database before and after screen render, print-media entry/exit, and a reload. It retains exact character/slot/free-cast row assertions and adds the no-write proof across the actual surviving route. |
| `/print` mounts printable and `/sheet` mounts sheet (`tests/browser/character-sheet.spec.ts:1033-1039`). | **“legacy print route retires while the exact sheet route remains reachable”** asserts `/print` mounts neither retired nor sheet screen, then `/sheet` mounts exactly one sheet. This proves retirement and exact route ownership rather than keeping the old route alive for a shadow test. |

The retained PHP parity browser test is amended in place: its existing route card
assertions at `tests/browser/php-feature-parity.spec.ts:2507-2519` become sheet
compact/appendix assertions against the same controlled database and keep the
final byte-equivalence assertion.

## 5. Dispatch-sized units, dependencies, and exits

Every unit is **MINT-FREE**. No unit may edit database migrations, schema
declarations, backup versions, character-state versions, share-wire modules, or
frozen portable fixtures.

```text
FF-C (D141 appendix mechanism) -----> SS-3 --------+
                                           \       \
SS-1 query/projection -> SS-2 compact UI ---> SS-4 -> SS-5
```

| Unit | Size | MINT | Dependency | Contents and exit criteria |
|---|---:|---|---|---|
| **SS-1 — typed character-spell projection** | M | **None** | None | Add the spell-section builder, branded DTO, evaluated route reuse, `always_prepared` route field, recursive class attribution, Other sources fallback, marker reduction, placeholder-level absence, full text read, and one canonical comparator. Exit: controlled integration fixture proves direct class, subclass, class-child, standalone source, prepared/known/always-prepared, duplicate collapse, cross-class non-collapse, missing text, statistics, and level/name order; repeated builds change no database bytes. |
| **SS-2 — compact sheet section** | M | **None** | SS-1 | Extend `CharacterSheet`, `sheetSections`, DOM rendering, free-text handling, and sheet header Print button. Omit the single-class group header; show multiclass headers; state each distinct statistics basis once. Keep prose out of `sheetFacts`. Exit: pure unit and DOM tests prove exact anatomy, screen visibility, no hidden appendix, safe hostile names, and zero slot-math changes. |
| **SS-3 — print appendix composition** | M | **None** | SS-1 + merged FF-C | Reuse FF-C's pure appendix/compositor and page-break classes; add full spell cards, missing-text disclosure, class/level/name order, long-prose splitting, explicit appendix order, and D125-before/last behavior. Move the single Letter `@page` rule to sheet CSS. Exit: print-media browser test proves Letter, screen↔print lifecycle, flavor→spell→notice ordering, notice-last assertion unchanged, and full stored prose. If FF-C is still absent, this unit is blocked rather than minting a second mechanism. |
| **SS-4 — legacy route and printable-report retirement** | M | **None** | SS-2 + SS-3 | Delete print screen/renderer/CSS, printable builder/RPC/client types, stale PHP message, and `/print` links; repoint build report to sheet; adapt fixtures and all affected unit/integration/browser/RPC/parity tests. Exit: repository search finds no runtime `/characters/:id/print`, printable screen, printable RPC, variant, or PHP instruction; the two named browser replacements pass. Historical decision/progress records remain explicitly marked. |
| **SS-5 — closeout and D149 acceptance** | S | **None** | SS-4 | Run focused projection/view/browser tests, typecheck/build/full suites, and a source inventory proving zero mint files changed. Exercise single-class, multiclass, non-class source, missing ability/text, hostile text, placeholder level, print lifecycle, reload, and no-write behavior. Exit: every negative control below has a named test, removed browser assertions have the mapped replacement, D91-R resource output is byte-for-byte unchanged for the fixture, and no owner question remains. |

## 6. Test strategy and named negative controls

The tables follow LU-W's format: each load-bearing assertion has an ID and a
specific production mutation that must kill one exact named test. Expectations
are hand-authored from controlled rows and rulings; no expectation is generated
from the production projection it tests.

### 6.1 Unit tests

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **SS-MARKER** | Prepared, always-prepared, and known buckets reduce to the exact two-member marker type; Prepared dominates duplicate Known access in one group. | `map-all-buckets-to-known`: remove the prepared/always-prepared arms; **“spell markers distinguish prepared, always prepared, and known access”** must fail. |
| **SS-SINGLE-HEADER** | Exactly one contributing class omits its class header; two classes show both; Other sources always retain labels. | `always-render-class-heading`: force the one-class heading; **“single-class spells omit only the redundant class group header”** must fail. |
| **SS-STATS-ONCE** | A normal group prints one Save DC/attack line and no compact spell repeats it. | `render-stats-per-spell`: move statistics into the spell loop; **“normal spellcasting statistics render once at group level”** must fail on count assertions. |
| **SS-MIXED-STATS** | A homebrew group with two genuinely distinct casting bases prints each labelled basis once and does not choose one arbitrarily. | `take-first-statistic`: collapse the group to its first route's statistic; **“mixed spellcasting bases remain distinct and render once each”** must fail on its second-basis assertion. |
| **SS-COMPACT-EXACT** | The main section contains name, level, marker, and group statistics, but no description/casting/range/components. | `leak-description-into-sheet`: append reference prose to compact rows; **“compact spell rows contain only D149 fields”** must fail. |
| **SS-TEXT-SAFE** | Hostile spell/source names and prose remain inert text; full prose does not enter `sheetFacts`. | `append-spell-html`: replace text-node/free-text rendering with `innerHTML`; **“hostile spell text is visible inert and absent from sheet facts”** must fail. |
| **SS-APPENDIX-ORDER** | The pure appendix projection uses the same group and level/name order as the compact section. | `sort-appendix-by-name-only`: add an appendix-local comparator; **“compact and appendix projections share class level name order”** must fail. |
| **SS-MISSING-TEXT** | Null full text is explicit and names the affected spell; it never emits the PHP-era instruction. | `hide-null-description-card`: omit the card/notice; **“missing imported spell text is stated without PHP instructions”** must fail. |

### 6.2 Integration tests

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **SS-CLASS-ANCESTRY** | Direct class, subclass, and class-child sources resolve to the existing class id; standalone feat/species remain Other sources. | `stop-source-ancestry-at-origin`: remove the recursive arm; **“sheet spells resolve nearest contributing class without inventing one”** must fail for the class-child row. |
| **SS-CROSS-CLASS** | The same spell selected under two classes appears once in each class group, not once globally. | `dedupe-before-grouping`: deduplicate by version id before attribution; **“multiclass duplicate spell preserves both class contributions”** must fail. |
| **SS-LEVEL-NAME** | Within each class: level asc, name asc, version id tie-break; placeholder level is unknown and sorts after known levels. | `sort-spells-by-route-name`: reuse access-route name ordering; **“class spell order is level then name with unknown level last”** must fail. |
| **SS-ACCESS-FILTER** | Inactive, invalid, orphaned, and empty slots stay out; kept overrides stay in; unprepared ritual-only book entries are not mislabeled. | `read-slots-without-access-builder`: query raw slots directly; **“sheet spells use evaluated current access only”** must fail. |
| **SS-FULL-TEXT-SOURCE** | Bundled and imported stored `short_summary` bytes arrive losslessly as appendix description; null stays null. | `trim-or-reparse-description`: trim/parse prose in the builder; **“sheet spell reference preserves stored full text bytes”** must fail on whitespace/newline sentinel. |
| **SS-NO-WRITE** | Building the sheet repeatedly changes no row, revision, sequence, or database export. | `cache-spell-order-in-database`: add any write in the builder; **“character spell projection is deterministic and byte-read-only”** must fail. |
| **SS-NO-SLOT-MATH** | Adding spell rows changes `sheet.spells` only; the pre/post D91-R `resources` value is identical. | `derive-slot-count-from-selected-spells`: alter resources from selected spell levels; **“spell section does not alter D91 resource maxima”** must fail. |
| **SS-RPC-ONE-PROJECTION** | `queries.characters.sheet` returns spells and `queries.reports.printable` is absent from the live registry. | `retain-printable-handler`: leave the handler registered; **“sheet is the sole printable character projection”** must fail the exact method inventory. |

### 6.3 Focused browser tests (Chromium)

| Assertion ID | Load-bearing assertion | Named negative-control candidate |
|---|---|---|
| **SS-SCREEN-PRINT** | Screen shows only compact spells; print adds full text; returning to screen removes appendix DOM; reload repeats the same data. | `append-spell-dom-at-render`: create appendix during `renderSheet`; **“spell section and print appendix replace the legacy print route without writes”** must fail its pre-print/after-print counts. |
| **SS-MULTICLASS-PRINT** | Compact print and appendix both group by contributing class and order level/name within each class. | `flatten-print-spells`: render one global list; the same named replacement test must fail its exact headings/order assertions. |
| **SS-LETTER** | The surviving sheet bundle contains exactly one Letter `@page` rule with 0.5in margin. | `delete-page-rule-with-print-css`: remove legacy CSS without moving the rule; **“print media keeps the sheet and warnings, adds paper fields, and ends with attribution”** must fail its stylesheet assertion. |
| **SS-NOTICE-LAST** | Flavor appendix, spell appendix, then attribution is the exact DOM order; attribution remains the last element and starts a page. | `append-spells-after-notice`: append the spell appendix at the end; the amended attribution test must fail both sibling-order and `lastElementChild` assertions. |
| **SS-LONG-PROSE** | Spell appendix starts a page, headings stay with facts, and long prose may split with widows/orphans. | `avoid-whole-spell-card`: apply `break-inside: avoid` to a long card; **“spell appendix paginates long prose with the D141 mechanism”** must fail computed CSS assertions. |
| **SS-ROUTE-RETIRED** | `/characters/:id/print` mounts no screen while `/characters/:id/sheet` remains exact and printable. | `keep-print-screen-module`: retain the discovered screen; **“legacy print route retires while the exact sheet route remains reachable”** must fail. |
| **SS-STALE-MESSAGE-GONE** | Missing text is stated, but the DOM contains neither `php artisan` nor Tier 2 installation advice. | `reuse-legacy-text-notice`: import the old warning; **“spell section and print appendix replace the legacy print route without writes”** must fail its forbidden-text assertion. |
| **SS-BROWSER-NO-WRITE** | Rendering, entering/leaving print media, clicking Print with an injected print spy, and reload do not change persisted bytes. | `persist-print-preference`: write a variant/print flag; the strict-superset replacement's database export equality must fail. |

Final verification for SS-5 is:

```text
npm run typecheck
npm test
npm run build
npm run test:browser
```

The implementation review must also compare an explicit pre/post checksum
manifest for migration, wire, backup-version, and snapshot-version paths and
report no changes. That proof does not require Git.

## 7. Owner questions

None. D149 decides the compact shape, print appendix, multiclass grouping,
level/name order, and route retirement. Single-class header behavior and truthful
handling of non-class sources are implementation-level consequences of compactness
and existing provenance, not reopened product questions.

The only prerequisite is not an owner question: FF-C's D141 appendix mechanism is
absent from the current tree and must merge before SS-3.
