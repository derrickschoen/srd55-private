# DISPATCH SC-4 — level-up/sheet subclass projection (M, MINT-FREE, PLAYWRIGHT_PORT=44543)

You are in <worktree assigned at dispatch>, fast-forwarded to main by the
supervisor. `.claude/decisions.md` is law and wins over every other guidance
file, including the binding plan below.

THE BINDING PLAN is `docs/design/2026-08-01-srd-subclass-seed.md`. BOUND:
section 5.3 in full (sheet and level-up behavior), the unit row **SC-4** in
section 8, section 7 (persistence/MINT), and the section-9.1 rows for
`tests/integration/commands/level-up-class.test.ts`,
`tests/fixtures/level-up-mutations.mjs`,
`tests/integration/queries/character-sheet.test.ts`,
`tests/unit/ui/sheet-view.test.ts`, `tests/unit/ui/agent-reference.test.ts`,
`tests/browser/agent-reference.spec.ts` and
`tests/unit/rules/class-level-features-srd.test.ts`, plus the whole of section
9.2. Sections 1-4 (the ruling chain, the extract plan, the row-shape precedent
and the per-subclass mechanical inventory) are supervisor-reviewed context —
build on them, do not re-derive them, do not re-litigate the inventory.

## PRECONDITION — check this FIRST, before writing a line

**HARD PREREQUISITE: SC-3 must be MERGED TO MAIN.** SC-4's dependency cell in
section 8 is SC-3, and every assertion you are asked to write reads rows SC-3
seeds. The supervisor verified at main `aa06973` when this brief was written
that SC-3 had **not** landed:

- `src/rules/class-progression-lookup.ts:180-195` — `bundledClassContentKeys()`
  still returns exactly two subclass keys,
  `EK_CONTENT_KEY` and `AT_CONTENT_KEY`
  (declared at `:180-181`).
- `src/rules/sheet-srd.ts:644-652` still states "no subclass feature is seeded
  anywhere", and `git grep` finds no `subclass_features` INSERT under `src/`.

Before anything else, prove in YOUR merge base that all of the following are
true after bootstrap:

1. Twelve SRD subclass definitions exist, one per base class, from SC-3's
   dedicated SRD manifest/seeder module (section 5.1) — **not** appended to
   `bundledClassContentKeys().subclasses`, which section 5.2 forbids.
2. 58 `subclass_features` rows exist with `description = ''` and SRD sort
   order.
3. 40 definition-level fixed-spell grant rules exist on
   `subclass_definitions.grant_rules` for the four caster-parent subclasses
   (Life Domain, Oath of Devotion, Draconic Sorcery, Fiend Patron).
4. The two legacy definitions and all 40 `subclass_progressions` rows survive
   untouched.

**If any of the four is absent: STOP and report, naming which one.** A blocked
report is the CORRECT outcome. Do NOT seed catalog rows yourself, do NOT write
a parser, do NOT invent a fixture that fakes the seed so the projection can be
written "in parallel" — an expectation built on a fixture nobody seeds is the
defect SC-3 exists to prevent. If SC-3 landed under different symbol names,
consume those names after a local seam audit and say so in your report.

## NOT YOURS

**SC-1** (the `docs/srd/source/subclasses.txt` extract, the `SOURCE.md` row and
digest, the provenance test). **SC-2** (the typed manifest/parser and
`tests/unit/rules/srd-subclasses.test.ts`). **SC-3** (the seeder, the repair
guard, the collision policy, `tests/integration/rules/class-progression.test.ts`,
`tests/integration/db/bootstrap.test.ts`, `tests/browser/bundled-content.spec.ts`,
`tests/integration/catalog/subclass-provenance.test.ts`,
`tests/integration/homebrew/homebrew-catalog-fixture.test.ts`,
`tests/browser/catalog-import.spec.ts`). **SC-5** (the split definition/override
key inventories as an asserted contract, the CI-2a trigger-state assertions, the
CI-3s handoff). **SC-6** (the full regression sweep and the remaining stale-doc
cleanup). The CI chain, HA chain and the SS print chain are all elsewhere.

Concretely: you seed no row, you write no repair guard, you assert no global
subclass-definition COUNT anywhere, and you touch no `docs/srd/` file. You
change projection, presentation and evidence code only.

## AMENDMENTS — read this section, it is not boilerplate

**One ruling postdates the design doc, and it is load-bearing.** Verified by
commit order: the design is `083037b` (merged `c2d708e`); D169-D172 are
`582ecdc`, which is NOT an ancestor of the design — `git merge-base
--is-ancestor 582ecdc 083037b` returns false, so the doc was written first.
D161-D168 all precede it and are already reflected. D170 (update-prompt
backup + changelog), D171 (copy-a-bug-report button) and D172 (AI panel ships
documented) touch nothing in SC-4.

### D169 — the fourteen-subclass shape in the plan is already superseded

D169 verbatim: *"Replace eldrich knight and trickster rogue with a made up
third caster monk sub."* The ruling records the consequence: the final bundled
set is **the twelve SRD subclasses PLUS ONE owner-original Monk subclass
carrying a dense third-caster progression**; EK and Arcane
Trickster **retire in the same unit that lands the replacement**; and that
subclass's *"NAME, features, and spell list are DRAFTED by us and PRESENTED TO
THE OWNER for approval before seeding"*. This amends the design's OQ-1
(section 10) and the additive-fourteen shape asserted in sections 1, 5.2 and 6.

CONSEQUENCES FOR YOU, all of them:

1. **You do not retire anything and you invent nothing.** EK/AT stay exactly
   as they are in your tree. Drafting a Monk subclass name, features or spell
   list is owner-taste, not yours, and it is a different unit. If you find
   yourself editing `class-progression-lookup.ts`'s legacy seeds, stop.
2. **Fourteen is today's true state, not a durable fact — never encode it.**
   In the surfaces you own, no closed count and no naming of EK/AT as the
   bundled subclass set may appear in a type, a user-facing sentence, or an
   assertion. A swap that removes two keys and adds one must be a data edit,
   not a rewrite of your code or your tests.
3. **Per-class availability, never per-class cardinality.** Your exit claim is
   that every class offers its SRD option. Assert that each of the twelve
   classes offers **at least** its SRD subclass — never "exactly one option per
   class". Monk gets a second option when D169's replacement lands, and an
   exactly-one assertion would then fail on correct content.
4. **Feat evidence stays list-shaped.** `BUNDLED_SPELLCASTING_SUBCLASS_KEYS`
   (`src/rules/class-level-features-srd.ts:264-267`) currently holds exactly the
   two legacy keys. Keep it a data set, keep those two as the only
   subclass-granted Spellcasting positives per section 5.3, and add the twelve
   as KNOWN keys in a separate set. Do not assert "exactly two subclasses grant
   Spellcasting" and do not fold the two sets into one branch — D169 adds a
   third positive and removes both current ones.
5. **D80 is the retirement mechanism too.** The D80 omission/empty controls you
   are required to keep green (section 9.2) are the same machinery that will
   cover characters stranded on a retired EK/AT. Weakening them now costs that
   ruling its landing gear.

### The rulings the plan already binds, restated because they are easy to lose

- **D152 is bound and it is the point of this unit.** Feature NAMES print;
  feature TEXT does not exist to print. `description` is `''` on every seeded
  row, the projection carries `text=null`, and the view must NOT reuse today's
  generic null-text sentence — section 5.3: *"It must not reuse today's generic
  null-text sentence, 'No description is recorded,' because D152 says the
  absence is a deliberate product boundary, not missing data."*
- **D153 does not put WebKit in your suite.** Chromium only (D109). Adding a
  webkit project is a config edit and a re-dispatch.
- **D162/D159 are the SS print chain's, not yours.** You touch `sheet-view.ts`,
  so be explicit: this unit writes nothing — no print preference, no storage,
  no command, no query param. Read-only projection and presentation.
- **D4 free text still applies to catalog names.** An imported homebrew
  subclass name reaches your label. Names go through the existing free-text
  marking (`free_text: true` label parts, `src/ui/free-text.ts`), never raw
  interpolation and never `innerHTML`; they stay out of `sheetFacts()`.

## FLOORS

`.claude/handover/lane-state.md` IN YOUR WORKTREE governs and is authoritative;
it will be HIGHER than this brief once SC-3 merges. At writing its highest
recorded floor was: vitest 3,232 exit 0 (201 files), Playwright 93 exit 0,
build 0 — and main has since merged W-D, SS-1 and P1-GH, so your worktree's
floor is higher than that line. Meet or exceed whatever it says when you start.

**Spec-file count: 20, verified by the supervisor at `aa06973`**
(`ls tests/browser/*.spec.ts | wc -l` → 20). lane-state records this as an
explicit correction: an earlier line said 22 and was wrong; the 93-test floor
was and is verified. Your spec table has 20 rows unless your merge base adds a
file — count it yourself and say the number you counted.

## MINT-FREE

You mint nothing. Section 7 is explicit: *"No migration, snapshot-version
increment, generated schema edit or frozen pre-Drizzle fixture edit is
permitted in SC-1..SC-6."* Frozen with an EMPTY diff vs your merge base:
migrations 0000-0027 (tail verified: `drizzle/0027_character_flavor.sql`), wire
v1-v17 (tail verified: `src/sharing/wire-schemas/v17.ts`), existing a7-v*
snapshot assertions, `tests/unit/schema.test.ts` and
`tests/unit/db/schema-signature.test.ts` (section 9.2: *"Any edit here would be
evidence of an accidental mint"*). No column, no table, no RPC method. If your
work appears to need one, that is a dispatch error — STOP and report (process
rule 7).

## Scope

The unit row, quoted verbatim from section 8 (Implementation units):

> | **SC-4 — level-up/sheet projection** | M | SC-3 | **NO** | All twelve
> classes offer their SRD option; reached feature names print without prose;
> partial-catalog gap retires; D80 omission/empty controls remain green. |

Section 5.3, quoted verbatim, is the mechanics half and binds every item below:

> Extend `SheetPrintedFeature.source` with `subclass_feature` and project
> reached feature names with `text=null`. The view labels them “Subclass
> feature — {subclass} — {feature}” and renders no detail row for this source.
> It must not reuse today's generic null-text sentence, “No description is
> recorded,” because D152 says the absence is a deliberate product boundary,
> not missing data.
>
> Keep and revise `no_class_feature_text`: it says class/subclass **rules
> text** is not printed, while reached subclass feature names and the four
> supported spell tables are catalog facts. Delete `partial_subclass_catalog`
> from the gap union and global list because its subject—the absence of any
> bundled option for ten classes—is gone. The agent-reference subclass row
> becomes `modelled` for catalog selection; its separate `class features` row
> remains partial for unprinted/unmodeled rules text.
>
> Do not change command semantics. A Wizard reaching level 3 with Evoker
> available may still omit the key; it levels successfully and retains a null
> subclass. The synthetic empty-list wizard also retains its Continue action.
> These are D80's negative controls for genuinely unmade, imported, filtered or
> future content. Only their stale “Wizard is unseeded” comments change.
>
> Finally, widen the known-bundled subclass set used by feat-prerequisite
> evidence. Keep the two legacy keys as the only subclass-granted Spellcasting
> positives, but classify all twelve SRD keys as known rather than
> imported/unknown; otherwise choosing Champion would incorrectly turn a
> provable negative into `unprovable`.

1. **The projection union widens; the shape does not.**
   `SheetPrintedFeature.source` is `'background' | 'species_trait'` today
   (`src/queries/character-sheet-builder.ts:188-193`, the union on `:189`). Add
   `'subclass_feature'`. `source_name` carries the subclass name, `name` the
   feature name, `text` is `null` — always, for this source. Nothing else on
   the interface changes.
2. **You are the FIRST consumer of `all_subclass_features`, and the level
   filter is yours.** Verified: `git grep all_subclass_features` returns three
   hits, all inside `src/rules/sheet-content-lookup.ts` (`:153`, `:257`,
   `:475`) — no production reader exists. The lookup deliberately returns every
   level and says so (`:252-262`: *"NO LEVEL FILTER, AND NO LEVEL TO FILTER ON…
   the filter lives in the combinator instead"*). Filter
   `class_level <= the held class level` in the sheet builder, per class held.
   Do not add a filter to `SheetContentLookup` and do not change its contract.
3. **Multiclass is the normal case here.** A character holding two classes with
   two subclasses prints both sets, each filtered against ITS OWN class level —
   not the character level. Getting this wrong is silent and plausible, so it
   gets its own assertion.
4. **Presentation: name-only rows.** In `src/ui/screens/sheet/sheet-view.ts`
   the features section builds label parts and a `detail`
   (`:730-755`); the current null branch emits
   `plain('No description is recorded.')` at `:752-754` (the call is on
   `:753`). For
   `subclass_feature`, emit the label "Subclass feature — {subclass} —
   {feature}" with the subclass and feature names as `free_text: true` parts,
   and **no detail row at all**. The generic sentence must be unreachable for
   this source.
5. **Gap vocabulary: one deletion, one revision.** Delete
   `'partial_subclass_catalog'` from the `SheetGap['kind']` union
   (`src/queries/character-sheet-builder.ts:299-307`, the member at `:306`) and
   its `SHEET_GAPS` entry (`:501-509`, whose detail currently reads *"Two
   subclasses are bundled — EK and AT"*). Its subject
   is gone, which is what makes the deletion legal — it is not a test-passing
   deletion. Revise `no_class_feature_text` (`:492-500`) so it claims what
   remains true: rules TEXT is not printed. Per D169, its replacement wording
   must not assert a bundled-subclass count or name EK/AT.
6. **Agent reference: separate selection coverage from prose coverage.**
   `src/ui/screens/planner/agent-reference.ts:183-189` currently states the
   `subclass` concept as `partial` with the note *"2 of the 12 classes have any
   subclass to choose"*. It becomes `modelled` for catalog selection, with a
   note phrased as per-class availability. `class features` (`:241-248`) stays
   `partial` — that row is about unprinted rules text and D152 keeps it true.
7. **Feat-prerequisite evidence widens without gaining a positive.**
   `src/rules/class-level-features-srd.ts:264-312`: today an unknown subclass
   key sets `hasUnknownFeatureSource`, so once Champion is selectable a provable
   negative would silently become `unprovable`. Add the twelve SRD keys as
   KNOWN (they prove absence), keep the two legacy keys as the only
   Spellcasting positives, keep imported keys unprovable. Two sets, per D169.
8. **Command semantics are frozen.** No refusal is added, no default subclass
   is chosen, nothing new is written at level 3. The only edits in
   `src/commands/level-up-class.ts:218-232`, `src/builder/level-up.ts:48-59`,
   `src/rules/sheet-srd.ts:644-652` and `tests/fixtures/homebrew-subclass.ts:3-33`
   are the stale factual premises ("only two subclasses are seeded", "no
   subclass feature is seeded anywhere") — the surrounding D70/D80/D19
   reasoning stays, and no fixture prose is deleted merely to make a test pass
   (section 9.1 closing note).
9. **Level-up options.** `src/queries/level-up-state.ts:451` `#subclassOptions`
   and `:649-651` `subclass_choice` already read the catalog; the expectation is
   that twelve classes start offering options with NO code change here. If a
   change IS needed, it belongs inside that projection, never as a new filter,
   a hardcoded key list, or a per-class special case — and say so in your
   report.
10. **Read-only and Chromium.** No storage, no preference, no migration, no
    config edit, no new listener path.

EXIT (the same row, deliverable/exit half, quoted verbatim):

> All twelve classes offer their SRD option; reached feature names print
> without prose; partial-catalog gap retires; D80 omission/empty controls
> remain green.

## Tests

Exact names, verified in the tree at `aa06973`. Existing tests are AMENDED
under their existing names — renaming one breaks section 9.1's mapping and is a
re-dispatch.

**Amended:**

- `tests/integration/queries/character-sheet.test.ts:757`
  **"names application-wide gaps without adding language/tool noise"** — remove
  ONLY `'partial_subclass_catalog'` from the expected kind array at `:769-773`.
  The other three members stay in order.
- `tests/unit/ui/agent-reference.test.ts:719`
  **"states what the application models, including what only the sheet
  derives"** — the subclass assertions at `:768-771`
  (`expect(stateOf('subclass')).toBe('partial')` and
  `.note).toContain('2 of the')`) change; the `class features` membership in
  the `partial` loop at `:740-749` must REMAIN and is load-bearing. Note the
  file's whole-table equality at `:722`
  (`expect(reference.scope.coverage).toEqual(COVERAGE)`): `COVERAGE` is a
  hand-written expectation — edit it by hand, never regenerate it from our own
  output (process rule 5).
- `tests/browser/agent-reference.spec.ts:215`
  **"the build reference sections are collapsed, present in the DOM, and never
  hidden"** — the subclass row assertions at `:308-315` assert BOTH the rendered
  word `partly` and the typed state `partial`; both change together. Add a
  retained assertion in the same test that `class features` is still `partial`
  (it is asserted only in the unit test today — strengthening is legal and
  expected).
- `tests/unit/rules/class-level-features-srd.test.ts:165`
  **"counts bundled subclass Spellcasting and withholds imported subclass
  negatives"** — add a Champion case (known, `spellcasting: 'absent'`) and one
  SRD caster-parent subclass case; RETAIN both legacy positives and the
  `homebrew:subclass:rune-singer` unprovable case unchanged.
- `tests/integration/commands/level-up-class.test.ts:248`
  **"proceeds through level 3 without a subclass — the choice is owed, never
  refused (D70)"** — the comment premise at `:249-251` ("No seeded Wizard
  subclass exists") only. Assertions unchanged.
- `tests/fixtures/level-up-mutations.mjs:134-152` — the `subclass-refusal`
  comment ("a Wizard (unseeded subclass)") becomes "available but omitted". The
  mutation body stays **byte-equivalent**; verify by re-running it.

**New (name them exactly these, so the controls below resolve):**

- integration, in `tests/integration/queries/level-up-wizard.test.ts`:
  **"every one of the twelve classes offers its SRD subclass at level 3"** —
  loop the twelve base classes, assert each `subclass_choice.options` contains
  that class's SRD key. At-least, never exactly-one (D169 consequence 3).
- integration, in `tests/integration/queries/character-sheet.test.ts`:
  **"prints reached subclass feature names, hides later ones, and prints no
  description"** — a level-3 character sees its level-3 names, not its level-6
  or level-17 names, every `text` is `null`, and a two-class character filters
  each subclass against its own class level.
- unit, in `tests/unit/ui/sheet-view.test.ts`:
  **"renders a subclass feature as a name-only row without the
  missing-description sentence"** — assert the label prefix, that the row has no
  detail, that the string "No description is recorded." is absent from the
  rendered features section, and that a HOSTILE subclass/feature name is marked
  free text and stays out of `sheetFacts()` (the file's existing `HOSTILE_*`
  fixture at `:199-218` is the precedent to extend).

Unchanged and must stay unchanged (section 9.2):
`tests/unit/ui/level-up-wizard.test.ts:999`
**"keeps an empty subclass catalog traversable with a Continue action"** — its
synthetic `options: []` is the D80 negative case; an empty catalog is still
reachable through imported/filtered content. Do not "fix" it because the
bundled catalog is no longer empty.

## Negative controls — one per load-bearing assertion, with the failing test

| Assertion | Mutation | Test that must fail |
|---|---|---|
| Every class offers its SRD option | `drop-champion-from-options`: filter the Fighter's SRD key out of `#subclassOptions` | **"every one of the twelve classes offers its SRD subclass at level 3"** |
| Reached-only filter | `print-all-subclass-features`: drop the `class_level <= held level` filter in the builder | **"prints reached subclass feature names, hides later ones, and prints no description"** |
| Per-class, not per-character, level | `filter-by-character-level`: filter against total character level | same test, its multiclass arm |
| D152 — no prose | `project-description-as-text`: pass the seeded `description` through instead of `null` | same test |
| No generic missing-data sentence | `route-subclass-through-generic-null-branch`: reuse the `plain('No description is recorded.')` branch | **"renders a subclass feature as a name-only row without the missing-description sentence"** |
| Names are inert free text (D4) | `interpolate-subclass-name-unmarked`: build the label by string concatenation without `free_text` | same test |
| The retired gap is gone | `keep-partial-subclass-catalog`: leave the entry in `SHEET_GAPS` | **"names application-wide gaps without adding language/tool noise"** |
| The surviving gap is not collateral | `delete-no-class-feature-text`: remove that entry too | same test |
| Selection vs prose coverage stay separate | `mark-class-features-modelled` | **"states what the application models, including what only the sheet derives"** |
| Known negatives are provable | `drop-champion-from-known-subclass-keys`: Champion falls back to unknown | **"counts bundled subclass Spellcasting and withholds imported subclass negatives"** |
| No new Spellcasting positive | `add-champion-to-spellcasting-positives` | same test |
| D80 omission still proceeds | the existing `subclass-refusal` mutation in `tests/fixtures/level-up-mutations.mjs` | **"proceeds through level 3 without a subclass — the choice is owed, never refused (D70)"** |

Run the `subclass-refusal` mutation and paste its kill line — it is the proof
that your comment edit did not disarm it.

## Process rules (all mandatory)

1. Spec TABLE for ALL Playwright spec files (20 at writing — count yours):
   Spec | Affected | Why. A bare list is a re-dispatch.
2. No Vite `?raw` import reachable from any Playwright spec's node-side
   EXECUTABLE import graph (type-only imports are fine).
3. Run the FULL Playwright suite yourself on `PLAYWRIGHT_PORT=44543`. Full
   vitest too. Paste real numbers — not "green", the counts.
4. Other lanes run suites concurrently; contention is the norm. **At most ONE
   full suite of ANY kind machine-wide** (lane-state, 2026-08-02: a full vitest
   beside a full Playwright produced three false reds in files the unit never
   touched). Any test >1.5s alone gets a per-test timeout (20_000) with the
   MEASURED alone-time in a comment. **Never a config edit.**
5. No `any`, no `@ts-ignore`, no `@ts-expect-error`, no `.skip`, no `.todo`, no
   config edits (vite/vitest/playwright/tsconfig/package.json), no weakened
   assertions, no deleting a test to pass (a stated strict-superset replacement
   is the only legal removal), never regenerate an expectation from our own
   output — expectations are hand-reviewed values. This bites twice here:
   `COVERAGE` in `agent-reference.test.ts` and the gap-kind array in
   `character-sheet.test.ts`.
6. Name a negative-control mutation per load-bearing new assertion, with the
   exact test name that fails.
7. If the unit's scope seems to require touching a forbidden area (frozen
   artifact, config, another unit's files) or seems infeasible as specified,
   STOP and report the finding — that is a correct outcome.
8. The supervisor re-runs everything and merges. **Do NOT commit.**

REPORT: what you did; real numbers pasted; the spec table; files
created/modified; negative-control candidates with exact test names and the
`subclass-refusal` kill line; the SC-3 seam audit (which seeded symbols you
consumed and under what names); whether `#subclassOptions` needed any change;
and anything you found where D169's coming swap would have forced a rewrite of
what you wrote.
