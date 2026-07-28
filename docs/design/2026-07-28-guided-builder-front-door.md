# The front door: guided-builder items 1 and 2

Plan author: Claude Opus (supervisor). Track A, toward D54's "usable" bar.
Status: **REVISION 2** — rewritten after two independent NOT-READY reviews.
Round 1 of 3 closed. Awaiting re-review.

Law: `.claude/decisions.md` D1..D54. Binding here: **D48** (class is the FIRST
step, and it deletes the session-storage draft), **D11** (builder BLOCKS an
SRD-illegal choice, import stays tolerant), **D42** (wizard is the front door;
blank creation survives as an escape hatch), **D52** (the wizard refuses to guide
homebrew classes), **D33** (an unknown says unknown), **D54** (the bar is usable,
not green).

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

**Taken for now: the params carry a client-generated `operation_uuid`, and a
replay of the same uuid returns the SAME character rather than creating a
second.** A disabled button is a UI courtesy, not a transaction-level policy.
This is cheap now and expensive to retrofit once characters exist.

*Seam:* one params field and one uniqueness check. *Cost to flip:* dropping it
later is trivial; adding it later is not.

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
REFUSED; a replayed `operation_uuid` returns the same character; every injected
failure leaves zero rows belonging to the attempted character. **A2 also owns the
filtered bundled-class list query** — revision 1 left that unowned too, and A9's
disproof means the ordinary catalog cannot feed it.

**A3 — front-door integration.**
Exit: the primary character-list action opens the guided class screen; choosing a
bundled class completes the transaction and lands on the persisted build route;
browser navigation and reload preserve the character and the current step; blank
creation remains reachable only via the advanced escape hatch. **A3 owns moving
or building that escape hatch**, which revision 1 asserted was reachable without
anyone building it.

**A4 — the species step (NEW).**
Exit: a person who has just chosen a class is offered a species, chooses one, the
choice persists via `add_source` (`src/commands/add-source.ts:26`), the derived
step advances past species, and a reload lands on the next step.

A4 exists for two reasons, and the second is the one that matters:

1. Without it the group has no actionable post-class step (§5), so A3 cannot
   honestly pass. D48 fixes the order as class → species → background →
   abilities → equipment (`.claude/decisions.md:458-473`), so species cannot be
   skipped for a step that happens to exist.
2. **Without it `A1-STEP` cannot fire.** Both reviewers found this independently.
   If nothing can advance a character past class, every character's derived step
   is the same constant, and a mutation replacing state-derived selection with
   that constant still passes. A4 is what creates a second persisted completion
   state, which is what makes the control real. A4 is not scope creep; it is the
   instrument.

**Scoped honestly:** A4 delivers species *selection*, not species *application*.
No complete writer copies species traits, effects or ability increases — the
design records that as designed-and-never-built (`docs/design/guided-builder.md:554-561`).
Per **D33**, the sheet must say those are unknown rather than imply zero. A4 that
silently showed a species with no traits and no marker would be a D33 violation.

**None of the four counts as usable progress on its own.** The group's definition
of done is A3's browser proof, extended by A4's.

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
assertion. **Pinned: each class card shows the class name and its hit die**, both
read from the bundled progressions already in the database. That is a checkable
assertion, not a vibe. Ability-spread guidance returns when it is real.

## 8. The pinned contract

Production and test code are written in parallel and **neither agent owns the
seam**. The supervisor lands the seam file first; neither agent edits it.

**Seam file (supervisor-owned): `src/builder/contracts.ts`**

```ts
type BuildStep = 'class' | 'species' | 'background' | 'abilities' | 'equipment';

const GUIDED_LEVEL_ONE_STEP_ORDER: readonly BuildStep[];   // D48's order

interface GuidedClassOption {
  content_key: string;   // the gate's identity — see A11
  name: string;
  hit_die: number;       // §7 makes this assertable
}

interface GuidedCreateParams {
  operation_uuid: string;      // §3.3
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

**Exclusive paths.** Production: `src/builder/guided-creation.ts`,
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

Forbidden paths to green as always: no `any`, `@ts-ignore`, `@ts-expect-error`,
`.skip`, no config edits, no weakened assertions, and never regenerate an
expectation from our own output.

## 10. Open, not blocking

The bundled-key gate rests on an invariant worth stating: the bundled seeder runs
before any import can insert classes. If that is ever false, a homebrew row could
hold a bundled key. A4's tests should carry a one-line proof of it.
