# The front door: guided-builder items 1 and 2

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **REVISION 3** — rewritten after four independent NOT-READY reviews
across two rounds. Round 2 of 3 closed. This is the final round.

Law: `.claude/decisions.md` D1..D54. Binding here: **D48** (class is the FIRST
step, and it deletes the session-storage draft), **D11** (builder BLOCKS an
SRD-illegal choice, import stays tolerant), **D42** (wizard is the front door;
blank creation survives as an escape hatch), **D52** (the wizard refuses to guide
homebrew classes), **D33** (an unknown says unknown), **D54** (the bar is usable,
not green), **D55** (no Roll in Order; abilities sit directly after class), **D56**
(package-only equipment; lineage spells are granted, not merely disclosed;
straight level-up before multiclass), **D57** (the import ban governs what WE
ship, not the user's own files).

**D54's convergence rule applies to this plan:** v1 is developed on its own
trajectory. Nothing here may be reshaped toward v2's architecture.

---

## 0. What revision 1 got wrong

Both reviewers returned NOT-READY and converged, independently, on the same two
blockers. Recorded because the record is the point.

1. **The plan pinned no contract at all.** Production and test code are written
   in parallel by two agents and neither owns the seam, so the plan is required
   to pin names, signatures, error shapes and paths. Revision 1 pinned none.
   Section 8 now does.

2. **"No actionable post-class step" was written as a contingency. It is a
   certainty.** Revision 1 said "if none is, A3 reports that rather than shipping
   a shell." Both reviewers established from the code that none can exist under
   revision 1's scope, so A3 was guaranteed to end in the report-a-finding
   branch. That is a wasted dispatch discovered late. Section 4 now adds **A4**.

Also wrong, and corrected below: A6 and A11 were stated more strongly than their
evidence supports (§2); there was a **third** silently-decided point, creation
idempotency, while §3 claimed there were two (§3.3); two of the four negative
controls could not fire as worded (§9); and the blast radius omitted the two
browser journeys that actually break (§7).

The reviewers disagreed on exactly one point, arbitrated in §3.1.

### What revision 2 got wrong

Round 2 returned two more NOT-READY verdicts, and the reviewers **contradicted
each other** on the load-bearing fact. Arbitrated by the supervisor:

**A4 could not persist a species at all.** Revision 2 routed it through
`add_source`. `AddSourceCommand` resolves the source through the *definition*
table and throws when the row is absent (`src/commands/add-source.ts:144-152`),
and **nothing in the repository writes `species_definitions` or
`background_definitions`** — a `grep -rE "INSERT INTO (species|background)_definitions" src/ db/`
returns nothing. The origin seeder writes `species_templates`,
`species_template_traits`, `species_template_trait_effects`,
`background_templates` and `background_equipment_items` only. The schema says so
about itself (`db/schema/origins.ts:654-662`): *"the table is empty after a full
application seed … the planner's species picker is fed from it and offers an
empty list … the other half of picking a species — which was designed and never
built."*

This is **the same error I made in revision 1 and was corrected for**. There, I
treated a bundled content key as proof a row existed (A11). Here, one section
later and inside the fix for it, I treated `add-source.ts:26` — species being an
accepted source *type* — as proof a definition row existed. Checking the shape
of a thing instead of the thing is F16, and I did it twice in consecutive
revisions of the same document.

**One reviewer defended the `add_source` path** by citing
`src/rules/origins-srd.ts:249-251`, which says lineage spells *"come from
`species_definitions.grant_rules` through `src/grants/`"*. That comment states a
design intent while explaining why trait entries were removed; it is not
evidence that any row exists, and the grep above disproves it. That is **F27** —
a citation standing in for source verification. The finding was rejected on
evidence, not on authority.

**A4 is rescuable, and revision 3 rebuilds it on the tables that are actually
populated.** `src/rules/origins.ts` exports five pure, already-tested copy
helpers — `speciesFromTemplate`, `speciesTraitFromTemplate`, `effectsFromTemplate`,
`backgroundFromTemplate`, `characterEffects` — which map template rows to
character-owned rows and have **zero callers in `src/`**. The guided step writes
`character_species`, `character_species_traits` and `character_effects` directly
from the templates the seeder fills. The species is therefore genuinely
*applied*: the sheet reads speed from `character_species`
(`src/queries/character-sheet-builder.ts:546-554`) and effects from
`character_effects` (`:506-545`), so a person sees a consequence. Background
mirrors it exactly, which is why revision 3 adds **A5**.

Also accepted and fixed below: A4 was added in revision 2 without extending the
§8 contract that revision 2 existed to add (the same defect, one dispatch
later); `hit_die` is not in `class_definitions` or the progressions but in
`class_sheet_traits` (`src/db/schema.sql:551`) and is absent-able with an
`ASSUMED_HIT_DIE` fallback (`src/rules/sheet.ts:238`); `exactKeys` and `isUuid`
are module-private so the "cannot drift" validation reuse was unachievable
without editing files §8 excluded; the idempotency default needed a migration
whose paths nothing allocated; `src/queries/client.ts` was unallocated; and
`buildState`'s not-found shape was never pinned.

Rejected, with reason: the claim that A1-STEP's advanced fixture required A4.
It does not — the fixture can be built through existing commands — but A4's
justification does not rest on that, and §4 now states reason 1 as primary.

---

## 1. What this is for

v1 passes 2290 tests and a person still cannot make a character without expert
knowledge of the planner grid. This plan builds the front door: choose a class,
get a character, land on a step that actually does something, and continue.

## 2. Assumptions

Surveyed against the real code and re-verified by two independent reviewers.
Three came back DISPROVED; two more were **over-stated** and are restated here.

| # | Assumption | Status |
|---|---|---|
| A1 | `/characters/new` does not exist | **PROVEN** — the planner route requires a numeric second segment (`src/ui/screens/planner/screen.ts:637-642`) |
| A2 | No wizard or step engine exists | **PROVEN** — screens are auto-discovered modules (`src/ui/app.ts:33-46`); none defines a build route or step registry |
| A3 | No session-storage draft is needed | **BINDING** — D48 deletes that work outright (`.claude/decisions.md:453-456`) |
| A4 | Blank creation must survive | **BINDING** — D42 keeps it as an escape hatch (`:1248-1256`) |
| A5 | Blank creation writes only `characters` | **PROVEN** — `CharacterCrud.create()` is a single insert (`src/queries/character-crud.ts:73-83`) |
| **A6** | **Existing class code runs inside an outer transaction** | **OVER-STATED.** Nested transactions do become savepoints (`src/db/transaction.ts:18-25`) and the executor wraps command application (`src/commands/character-command-executor.ts:184-186`). But `UpdateClassCommand` does **not** guarantee an outer transaction — a caller invoking it directly gets only its own. **A2 must explicitly own one transaction spanning character insert and class application.** |
| A7 | `UpdateClassCommand` builds the class/source/grant graph | **PROVEN** (`src/commands/update-class.ts:142-163`, `:174-233`) |
| **A8** | **Existing class validation enforces D52** | **DISPROVED** — it checks only that the id exists (`src/commands/update-class.ts:95-102`). Confirmed independently by both reviewers and by the supervisor. Guided creation needs its own bundled-class gate |
| **A9** | **The ordinary catalog query is safe as the guided class list** | **DISPROVED** — `SELECT * FROM class_definitions` with no predicate (`src/queries/catalog-queries.ts:239-243`). `class_definitions` has **no provenance column at all** (`src/db/schema.sql:447-465`); bundled-vs-imported for classes is distinguishable *only* by content-key membership |
| **A10** | **Standard-array-by-class guidance is production-ready** | **DISPROVED** — hand-enumerated and parsed only inside a unit test (`tests/unit/rules/srd-ability-score-generation-extract.test.ts:28-46`). **Out of scope**; see §7 for what replaces "meaningful" |
| **A11** | **A stable bundled-class identity exists** | **PROVEN, but it does not mean what revision 1 used it for.** `bundledClassContentKeys()` derives the twelve keys (`src/rules/class-progression-lookup.ts:187-195`) and `content_key` is unique. **But seeding deliberately SKIPS a bundled class when a homebrew row already holds its `(name, rules_edition)` slot** (`:289-303`, and the doc comment says so explicitly). A bundled key is therefore **not** a promise that a row exists. The gate must query actual rows and treat a bundled key with no row as `unknown_class` |
| A12 | Step completion can detect whether materialisation happened | **PROVEN but binary** — `characterLevel()` returns null with no class rows (`src/rules/character-level.ts:32-35`) and completeness reports `no_class` (`src/queries/character-completeness.ts:570-586`). Sufficient to tell `/characters/new` from a materialised run; **not** sufficient to derive a step beyond the first. A4 is what makes it sufficient |
| A13 | No real characters need migrating | **BINDING owner fact** — D52; every character in the repo is a fixture |

## 3. The undecided points, and the defaults I am taking

Per the raised threshold: recorded, reversible, not asked. Revision 1 claimed
there were two. There were three.

### 3.1 Name versus class ordering

**Taken for now: the class choice is presented first and alone. The name field
appears only after a class is chosen, on the same screen, and both are submitted
in ONE transaction. Nothing persists until both exist.** No temporary generated
name — a generated name is user-visible garbage someone has to notice and fix,
and it makes "did the user name this?" unanswerable.

**Reviewer disagreement, arbitrated.** One reviewer called this reversible at the
claimed seam; the other called the claim a BLOCKER because flipping reverses D48
itself and `characters.name` is non-null (`db/schema/character.ts:56-62`).

They are arbitrating different flips, and revision 1's wording was loose enough
to permit both readings. Splitting the difference honestly:

- **Cheap flip** — show the name field alongside the class from the outset, still
  persisting nothing until both exist. UI reorder plus the same RPC params.
  Genuinely trivial. It also rewrites the `A3-FIRST` control, which is fine.
- **Expensive flip** — persist on name submission, before a class is chosen. This
  **reverses D48**, not a seam, and needs a nullable name, a temporary name, or
  the revived draft state D48 deleted. It is an owner decision, not a default.

Revision 1 said "cost to flip: trivial, no schema." That was true only of the
first. *Seam:* screen ordering plus one RPC parameter, **for the cheap flip
only.*

### 3.2 Revision and history for initial materialisation

**Taken for now: guided creation produces revision 0 with NO audit or history
entry**, matching share import (`src/sharing/character-share.ts:1270`) and
consistent with the executor's `expected_revision >= 0` guard
(`src/worker/handlers/commands.ts:33-34`). Creation is not a mutation of an
existing character, and there is nothing to undo *to* — undoing a creation is
deleting the character, which the character list already offers.

*Seam:* the revision contract at the creation boundary. *Cost to flip:* higher
than revision 1 claimed. One reviewer showed that moving to an audited revision 1
later would change the RPC result, every subsequent `expected_revision`, and
undo semantics, and would leave already-created characters with no reconstructable
before-state. The default stands, but its reversal needs an explicit
non-retroactive rule, not a one-line change.

### 3.3 Creation idempotency — the point revision 1 decided without noticing

By taking "no audit/history", revision 1 also decided that guided creation
bypasses `commands.execute` and therefore has **no `operation_uuid` and no
replay protection** (`src/commands/character-command-executor.ts:151-176`).
Blank creation has the same gap (`src/worker/handlers/queries.ts:76-86`), but the
wizard makes it far likelier to bite: the class click *is* the moment of
persistence, on an async RPC, so a double-click creates two characters.

**Taken for now — REVERSED at round 3: guided creation is NOT idempotent.
No `operation_uuid`, no new column, no migration.** Double submission is
prevented in the UI only: the class card disables on submit.

Revision 3 proposed `characters.creation_uuid` as a nullable unique column. The
round-3 review showed that is not "just a migration" in this repository, and one
consequence is genuinely dangerous: **backup export does `SELECT * FROM characters`
(`src/backup/character-backup.ts:1276`) while backup validation requires an exact
key set (`:859`)**. Adding any column to `characters` without also changing the
backup codec makes newly exported backups invalid under their own format — a
data-loss-shaped defect introduced to fix a double-click.

The column also drags in `db/schema/character.ts`, a regenerated
`src/db/schema.sql`, a new `drizzle/0008_*` with snapshot and journal metadata,
regenerated column facts, and an append-only checksum registry
(`src/db/migrations.ts:29`). That is a schema change wearing a convenience
feature's clothes, and it is not on the path to D54.

*Seam:* one params field and the UI's submit guard. *Cost to flip:* adding real
idempotency later costs the migration surface above plus the backup codec — real,
but it buys a full unit of work now and is **an open question for the owner**,
not a default I should take unilaterally.

### 3.4 Species choices the SRD requires but this group does not model

Two owner questions are open here and neither is answered, so per the raised
threshold these are recorded defaults rather than a stop.

Several bundled species require a choice the template tables cannot carry: an Elf
picks a lineage, a spellcasting ability and one of three skills; a Human gets a
free skill and an Origin feat. A4 copies the template. It does not model those
choices, and there is no table for them.

**Taken for now: A4 applies the species and DISCLOSES every required choice it
has not made.** The step advances on the `character_species` row existing —
otherwise the wizard dead-ends, which D54 forbids outright — but the panel and
the sheet must name each unmade choice as unmade. A species that arrives looking
finished while its lineage, skill and feat were never chosen is the D33 violation
this project keeps rediscovering: a default presented as a fact.

*Seam:* the disclosure list and the step's completion predicate. *Cost to flip:*
when the choice model is built, the completion predicate tightens and the
disclosures for the modelled choices are deleted rather than reworded — they
exist only while the choices are unmakeable.

**Explicitly NOT taken:** making the step refuse to advance until the choices
exist. That converts an honest gap into a dead end, and it is the exact shape
§5's trap describes.

**Also open and NOT decided here:** whether to add the provenance record — one
"chosen by this grant at this level" row — that four of the fourteen forecast
blockers each need separately. It does not gate A4, because `character_species`
is its own table with its own shape. It binds at the skills step, and deciding it
early and wrongly would be worse than deciding it late.

## 4. Four dispatches, not three

Revision 1 had three and guaranteed the third would fail. The design's "M" for
items 1+2 is wrong regardless: item 2 **as literally written** copies complete
origins, which depends on the origin writers/source bridge the design itself
classifies as L (`docs/design/guided-builder.md:554-561`). Full origin copying
stays with that L item.

**A1 — build contracts and route shell.**
Exit: `/characters/new` and `/characters/:id/build/levels/1` match exactly; step
order begins with class; no session storage is read or written; reloading a
persisted run selects its step from character state alone. **A1 also owns the
guided-state query and its client contract** — revision 1 left that unowned.

**A2 — transactional class-first materialisation.**
Exit: one validated RPC call creates a character with exactly one bundled
starting class, its class source, and generated grants; a homebrew class is
REFUSED; every injected failure leaves zero rows belonging to the attempted
character. **A2 also owns the
filtered bundled-class list query** — revision 1 left that unowned too, and A9's
disproof means the ordinary catalog cannot feed it.

**A3 — front-door integration.**
Exit: the primary character-list action opens the guided class screen; choosing a
bundled class completes the transaction and lands on the persisted build route;
browser navigation and reload preserve the character and the current step; blank
creation remains reachable only via the advanced escape hatch. **A3 owns moving
or building that escape hatch**, which revision 1 asserted was reachable without
anyone building it.

**A4 — the species step.**
Exit: a person who has just chosen a class is offered a species, chooses one,
and the species is **applied** — `character_species`, `character_species_traits`
and `character_effects` are written from `species_templates` /
`species_template_traits` / `species_template_trait_effects` via the existing
pure helpers `speciesFromTemplate`, `speciesTraitFromTemplate` and
`effectsFromTemplate` (`src/rules/origins.ts:175-244`). The derived step
advances; a reload lands on the next step; the sheet shows the species' speed
and effects, because that is what it reads (`src/queries/character-sheet-builder.ts:506-554`).

**It does not go through `add_source`.** Revision 2's fatal error; see §0. The
definition tables that path resolves against are never written by anything in
the repository, so the template tables are the only populated source.

**A5 — the background step (NEW).**
Exit: **`character_background` only**, copied via `backgroundFromTemplate`,
advancing the derived step past background.

**Background's only consequence in this group is step advancement, and that must
be disclosed.** Verified by the supervisor: **nothing in production reads
`character_background`** — the sole mention in `src/queries/` or `src/ui/` is a
comment (`src/queries/background-equipment.ts:19`). So unlike species, which
visibly changes speed and effects on the sheet, an applied background is
invisible everywhere. The step is honest only if the terminal panel says the
feat, the two skills, the tool and the equipment are recorded but not yet
granted. §9's disclosure control covers it.

**Equipment package choice is explicitly OUT of A5.** Revision 3 said "via
`background_equipment_items`", which permits two incompatible implementations.
Those are catalog rows carrying **two alternative packages**
(`db/schema/origins.ts:883`), `applyOrigin` has no option parameter, and the only
existing reader states that it does not put items on a character
(`src/queries/background-equipment.ts:11`). A5 copies the background's printed
fields and nothing else; choosing and applying a package is its own later unit.

**Per D56 that later unit offers the PACKAGE ONLY — there is no gold
alternative.** The SRD's buy-with-gold path is not deferred-and-tracked; it is
out of the product until the owner reverses it. That removes the A-or-B selection
parameter the reviewers wanted pinned: the background's package is applied, not
chosen between.

Background is load-bearing rather than optional: the 2024 ability-score increases
ride it. **Under D55 that dependency now runs backwards** — abilities are chosen
before background, so the abilities step allocates BASE scores and the background
raises two of them afterwards. The abilities screen must say so; a screen showing
numbers a later step silently changes is a D33 violation dressed as a total.

A group that stopped at species would relocate §5's trap one step right rather
than clearing it — the reviewers' point, accepted.

**A6 — the lineage-spell bridge (NEW, per D56).**
Exit: choosing Elf, Gnome or Tiefling **actually grants the lineage spells**, and
they appear on the sheet with their provenance.

D56 raises this from a disclosure to a requirement. The route is the bridge the
design has always called designed-and-never-built, and the supervisor measured it
rather than guessing: seed `species_definitions` rows carrying `grant_rules`,
write a `character_source_instances` row on apply, then call the **existing**
`GrantRuleSlotGenerator`, which already resolves a source type to its definition
table and reads `grant_rules` (`src/grants/grant-rule-slot-generator.ts:345-370`)
and which the class path uses today. No new machinery.

**A6 is additive on top of A4, and sequenced after it.** A4's template-copy path
is proven and ships first; A6 adds the source instance and the grants beside it.
Folding the bridge into A4 would put a never-built path inside the dispatch that
finally makes the wizard exist. When A6 lands, §4's D33 disclosure for lineage
spells is deleted rather than reworded — the disclosure exists only because the
spells were missing.

**Why A4 and A5 are in this group at all.** Without them the group has no
actionable post-class step, so A3 cannot honestly pass. That is the primary
reason and it stands on its own.

A secondary benefit, corrected from revision 2: they give `A1-STEP` a fixture
whose derived step differs from any constant. Revision 2 claimed no such fixture
could exist without A4; a reviewer showed one can be built through existing
commands, so that claim is withdrawn. A4's justification does not need it.

**Honest limitation, disclosed rather than hidden — and it is wider than
revision 3 admitted.** Writing character-owned rows directly means no
`character_source_instances` row. Revision 3 disclosed only lineage spells; the
round-3 review enumerated the rest, and D33 requires the sheet to say each is
unknown rather than imply it is absent:

- **Lineage spells** and every other grant-rule consequence — fixed spells,
  spell choices, recursively granted child sources such as feats, spellbook
  entries (`src/grants/grant-rule-slot-generator.ts:180`, `:340`).
- **Source removal and workspace configuration**, which operate on persisted
  source instances (`src/commands/remove-source.ts:34`,
  `src/queries/character-workspace-builder.ts:493`). A species applied this way
  cannot yet be removed by that path.
- **From the background:** `backgroundFromTemplate` copies names and printed
  options only (`src/rules/origins.ts:89`, `:247`). It does **not** apply the
  2024 ability increases, create the origin feat, add skill proficiencies,
  resolve the tool, or equip anything. The sheet already discloses that
  background skill words are not counted (`src/queries/character-sheet-builder.ts:413`);
  the rest must be disclosed the same way.
- **Languages are not modelled at all** (`src/ui/screens/planner/agent-reference.ts:278`).

None of this can work today regardless of path, because the definition rows the
grant machinery reads are never written. The point is that the wizard must say
so rather than present a half-applied origin as complete.

**None of the five counts as usable progress on its own.** The group's
definition of done is the browser proof in §5, extended through background.

## 5. The trap, and the proof that answers it

The likely false success, named by one reviewer and confirmed by the other: **a
technically sound transaction feeding a dead-end wizard shell.** It passes route
unit tests, RPC validation, class/source/slot assertions and rollback tests, then
redirects a person to `/characters/1/build/levels/1`, which says "Species
incomplete" and offers no species picker. A second variant: the old name form
stays effectively first, satisfying database tests while violating D48's
user-visible invariant.

**Revision 1 treated this as a risk. It is the established state of the code.**
Verified independently by both reviewers and by the supervisor:

- The complete screen tree is `build-report, character-list, legal, planner,
  print, sheet` (`src/ui/screens/`, globbed at `src/ui/app.ts:33-35`). There is
  no species, background, ability or equipment screen.
- Writers exist but are surfaced **only in the expert planner grid** — origins at
  `src/ui/screens/planner/screen.ts:485-492`, abilities at
  `src/ui/screens/planner/editors.ts:99-129`. That is the exact surface the trap
  forbids landing in.
- Species/background helpers are pure copy functions whose only row-writing
  callers live in tests (`src/rules/origins.ts:175-200`, `tests/integration/rules/origins.test.ts:91-125`).

That is why A4 exists.

**The group's exit is a browser proof, not a row count.** From an empty database:
a person clicks the primary action, sees a bundled-class choice, **chooses a class
before anything is persisted**, lands on a species step that accepts a choice,
reloads, and continues — without falling into the expert planner grid.

D54 says green is not the bar. This is where that has teeth.

## 6. Blast radius

Revision 1 understated this. The browser suite drives the name-first form
directly in two journeys — `tests/browser/character-list.spec.ts:63-66` and
`:92-103` — and both break the moment the front door changes. They must be
rewritten to the new flow, keeping a separate proof for the blank-create escape
hatch.

Also touched: `tests/unit/ui/character-list.test.ts`, the executor's rollback
assertions (`tests/integration/commands/executor.test.ts:338-375`), and
`tests/integration/commands/rules-and-sources.test.ts:468-569`.

**Nobody modifies `queries.characters.create`.** Six parity journeys call it
directly (`tests/browser/php-feature-parity.spec.ts:617`, `:1420`, `:1485`,
`:1662`, `:2543`, `:2636`) and D42 preserves it. The guided path is a new method
beside it, never a replacement.

Screen discovery selects the FIRST matching route and throws on duplicate screen
ids (`src/ui/app.ts:25-27`, `src/ui/screens/sheet/screen.ts:17-21`), so new
matchers must be exact or they will shadow existing screens.

## 7. What "a meaningful class choice" means

A10's cut removed the only guidance D48 named for the blind-choice moment
(`.claude/decisions.md:478-484`), which leaves "meaningful" untestable as an
assertion. **Pinned: each class card shows the class name and its hit die.** The hit die is
**not** in `class_definitions` or the progression tables — it lives in
`class_sheet_traits` (`src/db/schema.sql:551`), seeded separately by
`src/rules/sheet-srd.ts`, and the row **can be absent**, which is why
`ASSUMED_HIT_DIE` exists (`src/rules/sheet.ts:238`). Revision 2 pinned this
wrongly and a reviewer caught it. The contract therefore carries
`hit_die: number | null`, and per **D33** a null renders as "unknown" — never as
the assumed 8, which would present a guess as a fact at the moment of choosing.
Ability-spread guidance returns when it is real.

## 8. The pinned contract

Production and test code are written in parallel and **neither agent owns the
seam**. The supervisor lands the seam file first; neither agent edits it.

**Seam file (supervisor-owned): `src/builder/contracts.ts`**

```ts
type BuildStep =
  | 'class' | 'abilities' | 'species' | 'background' | 'skills' | 'equipment';

const GUIDED_LEVEL_ONE_STEP_ORDER: readonly BuildStep[];   // D55's order, amending D48

interface GuidedClassOption {
  content_key: string;      // the gate's identity — see A11
  name: string;
  hit_die: number | null;   // null => render "unknown" (§7, D33)
}

interface GuidedOriginOption {   // species AND background
  content_key: string;
  name: string;
  grants_lineage_spells: boolean;   // drives the D33 disclosure (§4)
}

interface GuidedCreateParams {
  name: string;                // trimmed non-empty, <= 120 code points
  class_content_key: string;   // KEY, not id — see below
}
```

**Params carry the content key, not a class id.** The gate is key-membership
(A11), and routing an id through the unfiltered catalog to recover its key
re-opens A9 at the one place it must not be re-opened. Name validation matches
`isCreateCharacterParams` exactly (`src/worker/handlers/queries.ts:76-86`),
including the `exactKeys` guard (`:50-60`), so the two paths cannot drift.

**RPC methods**, registered beside `queries.characters.create` and never
replacing it:

- `queries.characters.guidedClassOptions` → `readonly GuidedClassOption[]`
- `queries.characters.createGuided` → the created `CharacterRow`
- `queries.characters.buildState` → `{ character_id, current_step }` or not-found

**Error shape.** `RpcErrorCode` is a **closed six-member union with no domain
code** (`src/rpc/protocol.ts:11-22`) — verified by the supervisor. Domain
refusals therefore ride `handler_error` with structured `data`, exactly the
`RevisionConflict` precedent (`src/worker/handlers/commands.ts:52-56`):

```ts
throw new RpcError('handler_error', message, { reason: 'class_not_bundled' });
// reason ∈ 'class_not_bundled' | 'unknown_class' | 'invalid_name'
```

Malformed structural input stays `invalid_params`; unexpected SQL or generator
failures stay bare `handler_error`. Without this the production agent throws a
bare `TypeError` and the test agent asserts a discriminator that does not exist.

**A4/A5 origin contract** — revision 2 added A4 without extending this section,
which is the very defect this section exists to prevent.

- `queries.characters.originOptions` → params `{ kind: 'species' | 'background' }`,
  result `readonly GuidedOriginOption[]`, read from the **template** tables only.
- `queries.characters.applyOrigin` → params
  `{ character_id, kind: 'species' | 'background', content_key }`,
  result the updated `{ character_id, current_step }`.
- Refusal reasons extend to `unknown_origin`.
- **The completion rule is pinned:** species is complete when a
  `character_species` row exists for the character; background when a
  `character_background` row exists. **Not** a `character_source_instances` row —
  that table is not on this path at all (§4). Two agents guessing differently
  here is exactly how the derivation and its fixtures diverge.
- **The origin list is gated to bundled content**, on the same principle as the
  class gate. Revision 2 left this implicit, which a reviewer correctly called a
  fourth silently-decided point.
- **`grants_lineage_spells` is a pinned classification, not an inferred one.**
  No template column carries it, the spell-marker effects were deliberately
  removed, and trait-text sniffing would let two agents disagree about which
  species return `true`. Pinned: the supervisor's seam file exports
  `LINEAGE_SPELL_CONTENT_KEYS`, a literal set naming the bundled species whose
  lineage grants spells, with a comment citing the SRD entries it came from.
  **Backgrounds are always `false`.** Note the honest limit this leaves:
  `A4-LINEAGE` proves the disclosure renders, not that the classification is
  correct — the set itself is reviewed by eye, once.
- **`applyOrigin` mutation semantics are pinned.** All writes for one origin —
  parent row, traits, effects — happen in **one transaction**. Both parent
  tables enforce one row per character (`db/schema/origins.ts:508`, `:1012`), so
  a plain retry would otherwise surface as a raw uniqueness violation. Applying
  an origin when one already exists **replaces it** (delete-then-insert inside
  the same transaction), and is therefore idempotent under retry. Replacement is
  the right default because the wizard's back button must be able to change a
  species; refusing would strand a person on a choice they can see is wrong.

**A class-less character at the build route is pinned.** Blank creation survives
under D42, so `/characters/:id/build/levels/1` is URL-reachable for a row with no
class. `characterLevel()` returns null there (`src/rules/character-level.ts:32-35`),
so `current_step` is `'class'` — but the wizard's class step exists only
pre-persistence at `/characters/new`, and `applyOrigin` has no `kind: 'class'`.
Pinned: the build screen renders an explicit panel offering a link to
`/characters/new`, and **no link into the planner** — its locator must be worded
so it does not collide with `A3-TERMINAL`'s assertion that no planner link
exists.

**`buildState` not-found is pinned**, because "or not-found" was not a contract:
params `{ character_id: number }`; an absent character returns
`{ kind: 'not_found' }` as a **successful** result, never an RPC error. The
existing `CharacterNotFoundError` path degrades to a bare `handler_error` with no
structured reason (`src/worker/registry.ts:95-103`), which the test agent cannot
discriminate on.

**Validation lives in the seam, not in `queries.ts`.** `exactKeys`
(`src/worker/handlers/queries.ts:50-60`) and `isUuid`
(`src/worker/handlers/commands.ts:15`) are **module-private**, so revision 2's
"matches `isCreateCharacterParams` exactly" was unachievable without editing
files this section excludes — reuse by copying is drift by construction. Pinned:
the supervisor lands the params validators in `src/builder/contracts.ts`
alongside the types, and `queries.ts` is not touched.

**There is no idempotency and no migration.** §3.3 reversed this at round 3:
adding any column to `characters` breaks the backup codec in both directions, so
guided creation is not idempotent and the class card disables on submit instead.

*This paragraph previously pinned the opposite, and §4's A2 exit criterion and
§8's params block did too — three passages left standing when §3.3 was reversed.
The A2 implementer found the contradiction and followed the seam, which is the
tiebreaker and has never carried an `operation_uuid`. The lesson is mine:
reversing a decision means sweeping every passage that depended on it, not just
the one that stated it.*

**The terminal state is pinned, not left to invention.** Under **D55** the order
is class → abilities → species → background → skills → equipment, so after
background the derived step is **`skills`**. D54 names level-one skills
explicitly, and revision 3's step union omitted them, which would have stepped
permanently over a required choice. The database already models the chosen set
(`db/schema/sheet-inputs.ts:264`) and the sheet reads it (`src/queries/character-sheet-builder.ts:881`),
so the omission was in the contract, not the data. This group does not build the
skills screen; The build route
renders an explicit panel saying those steps are not built yet. **It must not
link into the planner grid** — the most natural invention is "go finish in the
planner", which is precisely the surface §5's trap forbids. The browser proof
asserts that panel's presence and the absence of any planner link.

**Route matchers.** `/characters/new` — `segments.length === 2`, `[0]==='characters'`,
`[1]==='new'`. Build route — `segments.length === 5`, `['characters', id,
'build', 'levels', level]`, `id` matching `/^[1-9]\d*$/` (the **sheet's** regex,
`src/ui/screens/sheet/screen.ts:30`, not the planner's laxer `/^\d+$/` which
accepts `0` and `007` — supervisor-verified), and **`level` pinned to `'1'`
only**. A matcher accepting `/build/levels/7` today is a dead route. Screen id:
`'build'`.

**The gate has exactly one enforcement point**, in the worker:
`class_definitions.content_key ∈ bundledClassContentKeys().classes` **and the row
exists**. The UI list is served by a worker query applying the same predicate —
never a second client-side copy of the key list, which would drift.

**Exclusive paths.** Supervisor: `src/builder/contracts.ts`. Production:
`src/queries/client.ts` (unallocated in revision 2 — it is where every RPC
wrapper lands, `:63-102`), the A2 migration paths above,
`src/builder/guided-creation.ts`,
`src/worker/handlers/guided.ts` (a new handler file, so nothing collides in
`queries.ts`), `src/ui/screens/guided-builder/**`,
`src/ui/screens/character-list/character-list.ts`. Tests:
`tests/integration/builder/**`, `tests/unit/ui/guided-builder.test.ts`,
`tests/unit/ui/character-list.test.ts`, `tests/browser/guided-builder.spec.ts`,
`tests/browser/character-list.spec.ts`.

## 9. Verification

Gates run by the supervisor: `npm test`, `npm run build`, and one browser suite
on a unique port. Every load-bearing new assertion gets a negative control,
applied-checked with a non-zero grep before the suite runs (F25).

Two of revision 1's four controls could not fire as worded. Corrected:

- **A2-HOMEBREW** *(strongest, unchanged)* — remove the bundled-key predicate;
  a test that inserts a non-bundled class row and calls the **real RPC** must
  fail. It must not merely assert the UI omitted the option.
- **A2-ROLLBACK** *(was under-specified — C1-COUNT's defect)* — "commit before
  grant generation" does not fire as written, because grant generation runs
  inside `UpdateClassCommand`'s own transaction (`src/commands/update-class.ts:92`,
  `:224-233`), which simply becomes outermost and still rolls back its own rows.
  **Pinned:** remove the guided creator's outer `db.transaction` wrapper so
  `CharacterCrud.create()` commits before `UpdateClassCommand.apply()` begins,
  inject the failure inside grant generation, and require the assertion to cover
  the **`characters` table itself** — that row is the only orphan the mutation
  produces.
- **A1-STEP** *(was unfireable — this is why A4 exists)* — replace state-derived
  step selection with a constant. **Pinned:** the reload test must include a
  character advanced past species, so the constant is wrong for at least one
  fixture. Without A4 there is no such fixture and the control is theatre.
- **A3-FIRST** *(was too weak)* — asserting the class element precedes the name
  element passes even when both are visible. **Pinned:** assert the name textbox
  is **absent** before a class is selected and **present** after. Then a mutation
  exposing it initially reliably fails. This is D48's user-visible invariant.

- **A4-APPLIED** *(new)* — make the species step write only a
  `character_source_instances` row and skip `character_species`. The sheet test
  asserting the species' speed must fail. This is the control that proves
  revision 2's defect cannot return: selection metadata is not an applied
  species, and only the sheet can tell the difference.
- **A4-LINEAGE** *(new)* — remove the D33 lineage-spell disclosure. The test
  asserting a lineage species discloses that its spells are not yet granted must
  fail. Without this the plan legislates a D33 duty in §4 and assigns it to
  nobody, which a reviewer caught in revision 2.
- **A5-BACKGROUND** *(new)* — make background completion read the species table.
  The step-derivation test must fail. Cheap, and it catches the copy-paste that
  this symmetry invites.
- **A3-TERMINAL** *(new)* — add a planner link to the not-built-yet panel. The
  browser proof must fail. §5's trap is a link away at all times.

Forbidden paths to green as always: no `any`, `@ts-ignore`, `@ts-expect-error`,
`.skip`, no config edits, no weakened assertions, and never regenerate an
expectation from our own output.

## 10. Open, not blocking

The bundled-key gate rests on an invariant worth stating: the bundled seeder runs
before any import can insert classes. If that is ever false, a homebrew row could
hold a bundled key. A4's tests should carry a one-line proof of it.
