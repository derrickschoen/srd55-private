# Binding scope decisions

## F5 — The `attribution.spec.ts` flake: measured, unattributed, NOT masked (2026-07-26)

`tests/browser/attribution.spec.ts:16` intermittently fails on `expect(loads).toBe(1)`
with `Received: 2` — a real second page load, so the footer link navigated
instead of being routed. I could neither attribute it to the validation branch
nor exonerate that branch. Recording the measurements rather than a verdict.

| condition | branch | main |
|---|---|---|
| quiet box, single spec | 0 / 20 | 0 / 20 |
| quiet box, single spec (2nd batch) | — | 0 / 6 |
| synthetic CPU load, all 24 cores | 0 / 8 | not run |
| concurrent vite dev server (neighbour worktree) | **1 / 10** | 0 / 10 |
| full suite, box loaded by another worktree | **1 failure** | not run |
| full suite, quiet box | 0 / 2 (48 passed each) | — |

Plus the implementing track's own 6 full runs: 4 green, 2 failed, both while
another worktree's dev server was live; its stashed baseline was 3/3 green.

Tally: the branch has failed roughly 3 times in ~53 runs, main 0 times in 36.
That is NOT significant (p is around 0.25) — but the branch is the only side
that has ever failed, so "pre-existing" is unproven too.

**Hypotheses tested and killed.** (1) Playwright reusing a neighbour's dev
server — killed: `playwright.config.ts:20` sets `reuseExistingServer: false`,
and a collision errors out rather than silently reusing. (2) Vite discovering
`zod` as a new dependency and reloading the page — killed: main already imports
zod at `src/domain/ids.ts`, so it is not new. (3) CPU starvation widening a
handler-attachment race — killed: 0/8 with all 24 cores saturated.

Every failure so far has coincided with a second **vite dev server**, not merely
a loaded box. That is the surviving lead and it is not yet a mechanism.

**Merged anyway, deliberately.** Two full suites green on a quiet box under my
own hand (48 passed each). The flake is disclosed here, not suppressed: no
retry, no `.skip`, no loosened assertion, no `test.fixme`. If it recurs, this
table is the starting point rather than a fresh investigation.

**Addendum, same day, after both merges.** One further failure on merged
`main` at the default port with NO neighbour dev server running, then 0/12 on
re-measurement. Two consequences. First, "only ever with a second dev server"
is now falsified — that was the surviving lead in the table above and it is
dead. Second, the branch-versus-main comparison is spent: merged `main` now
CONTAINS the branch content, so there is no longer a clean control to measure
against. Any future attempt must compare against the pre-merge commit 0a28754
explicitly. Total observed: roughly 4 failures in ~66 runs of content that
includes this work, 0 in 36 runs of 0a28754.

**Contributing infrastructure defect.** `playwright.config.ts` hard-codes port
4173 in every worktree, so parallel tracks contend for it and one run can block
or perturb another. This is what made the flake reproducible at all. Worth
fixing as a separate attributable change — a per-worktree port — but NOT as a
path to green, and not while it is the only lever that reproduces F5.

---

## D8 — Both parallel tracks merged; codex's three audit findings queued, not fixed (2026-07-26)

`main` moved 0a28754 → b7992e7. Independently verified by me, not taken on a
subagent's word: **530 vitest / 66 files, build exit 0, drizzle-at-runtime guard
holding (grep exit 1), 52 Playwright**.

Merged: per-table backup row contracts + quarantined candidate-image audit
(`feat/import-validation`), and the agent-readable reference
(`feat/agent-reference`). The tracks were genuinely disjoint — backup/db versus
planner UI — and integrated with no conflict and no test loss (507 + 23 = 530).

**What codex verified as clean** (the questions that mattered most): no
app-written value is rejected by the row contracts — empty non-key strings,
unicode and long text, ordinal `0`, `0/1` booleans, both timestamp formats and
absent optional JSON keys all still pass; nullability is genuinely derived from
`column.notNull` (`scripts/compose-row-contracts.ts:91`) rather than
hand-asserted; the audit provably cannot mutate stored bytes; and the generated
facts have a real byte-for-byte freshness check. Over-strictness was the
highest-severity failure mode available here — a contract narrower than its
column makes a user's own backup unrestorable — and it did not materialise.

**Three findings accepted as real and queued rather than fixed**, because none
is a regression against main (main had no semantic audit at all) and each wants
its own attributable change:

1. **Medium — quadratic audit work.** `candidate-audit.ts:313`
   `assertNoParentCycle()` walks the ancestor chain from every node, so a valid
   chain of N sources costs about N²/2 lookups, and the backup boundary
   (`database-backup.ts:33`) caps neither bytes nor rows. A hostile image can
   monopolise the worker. Cheap fix: one shared visited set makes it O(N).
   This is genuinely NEW risk in NEW code, so it is first in the queue.
2. **Medium — the audit accepts snapshots the restore path cannot restore:**
   duplicate positive `id`s, a slot with both `fixed_` and
   `current_spell_version_id`, and references to inactive spells. The image
   installs and the undo history is unusable. The portable-backup validator
   already checks the first two, so the fix is largely reuse.
3. **Low — `auditCharacterOwnership` is currently theatre on the production
   path.** `PRAGMA foreign_key_check` runs first (`database-lifecycle.ts:276`),
   so an orphan can never reach it; deleting the pass would fail no
   production-path test. Defensible as future-proofing, but it must not be
   counted as a current guarantee.

**Rejected alternative:** hold both branches unmerged until 1-3 were fixed.
Rejected because they are hardening gaps in work that strictly improves on main,
and leaving ~4,000 verified lines unmerged would make every later tick re-derive
this analysis.

---

## D7 — Neither the Laravel app nor this code is worth preserving (2026-07-25)

Owner direction:
> "Don't worry about preserving Laravel version. That was an mvp. Don't worry
>  about preserving this code either. It is only a 2nd draft."

This LOOSENS several constraints that earlier decisions and plans treated as
binding. Where an earlier note conflicts with this, this wins.

**No longer goals:**

- Laravel SCHEMA fidelity. The 38-table inventory, the Laravel-derived metadata
  hash, `VARCHAR`/`DATETIME`/`TINYINT(1)` declared types, Laravel column order,
  and the seven dead infrastructure tables are all inherited MVP artifacts, not
  requirements. Prune, rename, retype and reorder freely where the domain is
  better for it.
- Backward compatibility with existing OPFS images or backups. There are no
  users. A schema-signature break is a non-event.
- Preserving the current TypeScript structure. Read-models, table lists, query
  shapes and module layout are all second-draft and may be restructured.

**Still goals — do not over-read this:**

- **Behavioural correctness.** The parity FIXTURES encode D&D rules — multiclass
  slot tables, caster progression, preparation ceilings. Those expected values
  remain valid regardless of where they came from, and they are the best
  regression suite this project has. Keep them as correctness tests; drop only
  the SCHEMA-METADATA parity that asserts we still look like Laravel.
- **A test must still be able to fail.** If a check is retained, it must remain
  a real oracle. Regenerating expectations from our own output produces a
  measurement that cannot come out wrong — that stays forbidden, not because of
  Laravel, but because a tautological test is worse than no test.
- The untrusted-input boundary (share links, backup/catalog import). Nothing
  here relaxes that.

**Consequences to apply:**

- D6's restructurings become much more viable — variant tables, 1:0..1
  extraction, explicit state columns — since schema shape is no longer pinned to
  Laravel's.
- Nullability tightening is freer: a column nullable only because a Laravel
  migration made it so has no claim to stay nullable.
- Q3 (the seven dead tables) resolves toward pruning. Still do it as a SEPARATE
  change from the Drizzle rewrite so failures stay attributable.
- The Drizzle rewrite already in flight was scoped under the old constraints. Its
  choices remain defensible; later increments may go further.

---


## D6d — Scrutinise nulls in ALL types, not only database columns (2026-07-25)

Owner direction: the six restructurings in D6 are confirmed as the tests for
whether an incomplete thing can be represented without a null column — AND
> "Remember to also scrutinize nulls in all types, not just db columns."

This is a scope expansion, and the non-column layer is arguably the more
important one: a `| null` in a TypeScript type is not forced by storage, it
propagates to every consumer, and it is where the contract incoherence the owner
originally complained about actually lives.

Apply D6 and D6b to every `| null` and every `?:` in:

- `src/domain/read-models.ts` and all DTOs / read models
- Zod contracts and their inferred types
- function and query return types
- domain value objects and command payloads
- RPC request/response shapes

### The highest-value instance, and the fix

`spell_name: string | null`, `spell_level: number | null`, `spell_id: number |
null` appear as three INDEPENDENT nullables on a workspace slot. They are not
three optional facts. They are ONE optional relationship — the `LEFT JOIN` to
the selected spell either matched or did not — smeared across sibling columns.

That is D6's "a value object would absorb it", applied to a projection:

```ts
// today: three nullables, and nothing links them
spell_id: number | null
spell_name: string | null
spell_level: number | null

// better: one optional relation, non-null inside
spell?: { id: SpellVersionId; name: string; level: SpellLevel }
```

The guarantee becomes *"if there is a spell, it has an id AND a name AND a
level"* — which is precisely the owner's question, "what is guaranteed to be in
a spell". It also makes the illegal states unrepresentable: today
`spell_name` populated with `spell_level` null is expressible and meaningless.

**Apply this pattern wherever a group of sibling nullables share one cause.**
The nullability belongs on the relationship, once, not on each field.

### Other non-column null sources to check

- **Outer-join projections** — as above. The null means "no matching row", a
  relationship fact, not a property fact.
- **Query-result nulls.** `db.one<T>(): T | null` pushes a null into every
  caller. Where the caller treats absence as impossible, a throwing
  `oneOrThrow` removes the null at the boundary instead of propagating it.
- **`?:` versus `| null` versus `?: T | null`.** Three different statements,
  currently used inconsistently. Pick one convention: `?:` for "the field may be
  absent", `| null` for "the field is present and explicitly empty", and avoid
  the third form unless both genuinely differ.
- **Nullable in the DB does not mean nullable in the domain type.** A column can
  be legitimately nullable while a resolved domain object is not — e.g.
  `subclass_definition_id` is correctly nullable in storage, but a *resolved*
  subclass type should never be `Subclass | null`; the character simply has no
  subclass relation.

### The reverse also holds

Do not push storage nullability into a domain type just because the column
allows it. Resolve it once, at the boundary, and let the domain type express the
real guarantee.

---

## D6c — The DEFENDED nulls, and a resolved tension with codex's test (2026-07-25)

Codex analysed all ~199 nullable columns. **Caveat on provenance:** its required
independent Claude critique failed twice (`API Error: ENOTIMP`) and returned
nothing, so this is codex's evidence-backed findings, NOT a two-agent consensus.
Claude reviewed it afterwards; that review is what follows.

### DEFEND these — do not tighten (agrees with D6b)

- `character_class_levels.subclass_definition_id` — a class can validly have no
  chosen subclass yet. **Exactly D6b criterion 1.**
- `characters.proficiency_bonus_override`,
  `character_class_levels.spellcasting_ability_override` — absence means "derive
  normally", not zero.
- `character_source_instances.parent_source_instance_id` — root source.
- All user-facing `notes` / `note` columns.
- `spell_version_publications.source_page`, `source_reference` — a publication
  can be known without either locator.
- `spell_versions.material_component_summary` — only meaningful for material
  components.
- `spell_versions.short_summary` — optional Tier-2 text; Tier 1 deliberately
  does not erase it.
- `spell_versions.action_type` — a one-minute casting time does not classify as
  Action/Bonus/Reaction. **Exactly D6b criterion 2: the SRD cannot be
  represented without this null.**
- The upcast facet as a whole — many spells do not upcast; its fields should
  move together rather than become individually required.
- `spell_selection_slots.label`, `free_cast`, `override_note`.
- `change_log.reason` — many valid commands need no explanation.
- Lifecycle timestamps such as `invalidated_at` before the transition happens.

### THE TENSION, and how it resolves

Codex's "steady-state witness test" asks: *can a valid, FULLY CONSTRUCTED entity
remain null indefinitely?* If not, it calls the column transient/incomplete —
**not** optional. Its missing-pattern list even says "unknown/incomplete is not
optional".

That would classify most mid-build nulls as illegitimate, which contradicts
D6b criterion 1.

**Resolution: in this app a partially built character IS a valid, steady-state
entity.** It persists in the character list, can be shared, imported, and left
untouched indefinitely. Completeness v1 exists precisely to report on it. So the
two tests agree once "fully constructed" is read as "valid persisted entity"
rather than "every choice made".

Where they still differ, **D6b wins** — it is the owner's direction and it is
the one grounded in this domain.

Practical consequence: codex's "would not yet defend" list includes
`source_definition_id`, `config`, and `acquired_at_character_level`. Before
tightening any of those, check D6b criterion 3 — whether a builder step must be
able to leave it unset. Tighten only if the builder genuinely never needs it.

### Restructurings codex ranks highest — all VERY HIGH cost

1. Typed/versioned grant rules with slots referencing rule identity.
2. Unified source-definition registry with a non-null FK.
3. Separate stable spell reference from resolved spell details.
4. `spell_slot_assignments` as a 1:0..1 relation (medium-high).
5. Class/subclass spellcasting facet (medium-high).

**Do not attempt 1–3 inside the current Drizzle rewrite.** Each touches the
generator, seeding, eligibility, backup and sharing simultaneously. They are
candidate follow-up units, not increments.

Low-cost cleanups that ARE in scope: drop the two dead columns; make `config`,
rule collections and slot-table JSON canonical non-null empties.

### Traps codex proved — heed these

- **Slot assignment is a hot join.** Access, reports, completeness and workspace
  all resolve via `COALESCE(fixed, current)`. An assignment table adds a join to
  hot queries — benchmark, do not assume.
- **Grant-rule normalisation must preserve stable slot identity.** Slot keys are
  `{source UUID}:{rule key}:{ordinal}` and regeneration REVIVES existing rows
  rather than replacing them. A design assigning fresh rule IDs per seed/import
  would break revival.
- **Portable backup exports raw rows by column name.** New tables require a new
  backup version or a compatibility adapter.

---

## D6b — THE TEST for whether a null is legitimate (2026-07-25)

Owner-supplied, and it GOVERNS D6. Where D6's restructuring patterns conflict
with this test, this test wins. Apply it first; reach for restructuring only
when all three say the null is not real.

> 1. "If nobody decided option X while building a character, and that being
>     undecided is a state that needs to be allowed in order for someone to
>     build or import a character, then that is a truly optional thing."
>
> 2. "If the SRD can't be represented fully without the null, then that is a
>     good sign."
>
> 3. "If something needs to be nullable for the purposes of going through the
>     steps of the character builder, I want it nullable if the only alternative
>     is to mangle the structure of the codebase to get it there."

### Why this is the right test for THIS app

**"Undecided" is a first-class domain state here, not an accident.** The guided
builder is progressive: a character exists, and is persisted, before every
choice is made. A share link can arrive mid-build. So a column that looks like
it "obviously should be non-null" is often correctly nullable, because the
alternative is forbidding a legitimate half-built character.

This is the same concept completeness v1 already models. Completeness detection
answers "what has not been decided yet" — and nullability is *how that is
stored*. **A nullable column that completeness reports on is correctly
nullable.** The two features are two views of one idea, and they should agree:
if the detector can meaningfully warn about a column being unset, that column
must be allowed to be unset.

### Applying it

For each nullable column, ask in order:

1. **Can a character legitimately exist, be saved, or be imported with this
   unset?** If yes → truly optional. Keep the null. Stop; do not restructure.
2. **Does the SRD require the absence?** A rule that genuinely has no value for
   some cases (no subclass before level 3; no spellcasting ability for a
   non-caster) is real optionality, and the SRD failing to fit without a null is
   evidence FOR the null, not against it.
3. **Does the builder flow need it?** If a step must be able to leave this
   unset to function, keep it nullable.
4. **Only if all three are no** — then it is a candidate for D6's
   restructurings, or for plain tightening.

### The explicit anti-over-engineering clause

Point 3 is a guard, and it overrides D6's patterns. **Do not extract a 1:0..1
table, invent a variant type, or reshape a module merely to delete a null the
builder genuinely needs.** Contorting the structure to win a type argument is a
worse outcome than the null. If the restructuring is not independently better
for the domain, do not do it.

### What this changes about the audit

The audit's output is no longer mainly "which columns can we tighten". It is:

- columns representing an **undecided state** → stay nullable, and should be
  reported by completeness;
- columns nullable only because a **Laravel migration** made them so (D7) → real
  candidates;
- columns nullable only **transiently during construction** → the persisted
  contract may still be non-null;
- columns where a restructuring is **independently better for the domain** → do
  it for that reason, not to remove the null.

---

## D6 — Treat nullability as a design smell to be investigated, not a type to declare (2026-07-25)

Owner direction:
> "When you add nullability, take some time to review and brainstorm possible
>  ways to refactor or restructure to not need the nullability. Nullability
>  still makes sense sometimes like when something is truly optional."

So the rule is **not** "eliminate null". It is: **a nullable column must be
justified as genuinely optional in the domain, after actively considering the
restructurings that would remove it.** Declaring `| null` is the last step, not
the first.

Before accepting a nullable column, consider at minimum:

- **Is this table actually two things?** A column that is null for one kind of
  row and populated for another usually means a missing type distinction —
  extract a variant table, or model a sum type.
- **Would a 1:0..1 related table be truer?** Optional data extracted to its own
  table makes absence a row that does not exist, rather than a column that is
  null, and removes the null from every consumer.
- **Is it a state machine wearing a nullable timestamp?** `completed_at NULL`
  usually wants an explicit status plus a separate completions record.
- **Is the null standing in for a default?** If every reader substitutes the
  same fallback, that is a default, not an absence.
- **Is the null only transient during construction?** Then the persisted
  contract is non-null; the transient shape belongs to the builder, not the row.
- **Would a value object absorb it?** Optionality inside a small object beats
  optionality spread across several sibling columns.

Legitimate optionality remains legitimate — an override that may not be set, a
subclass not yet chosen, a user-supplied note. Those are real and stay nullable.

**A wrong tightening is a data-loss bug, not a type improvement.** Every
proposed `.notNull()` needs evidence from the actual writers, and the review
gate's first job is to defeat it with a legitimate case.

**Distinguish migration-forced nullability from domain nullability.** Observed in
`verifast-core-api`: 10 of 15 column declarations across its 9 incremental
migrations are `nullable()`, because adding a column to a populated table forces
nullable-or-default. That is a migration artifact and says nothing about whether
the domain considers the value optional. Only domain nullability belongs in a
contract; migration-forced nullability should be tightened once backfilled.

---


Owner decisions that override anything a planning track produced earlier.
Apply these at consolidation; a plan contradicting one is wrong.

---

## F4 — This is a SPELL PLANNER, not a character model (proved 2026-07-26)

F0's successor gate, and larger than F0 was. Seeding the twelve classes made a
fresh install usable **as a spell planner**. It did not make it a character
builder, and the distance is bigger than the class seeding suggested.

**Evidence — `class_definitions` carries only:**
`content_key, name, rules_edition, spellcasting_ability, progression_type,
caster_fraction, caster_rounding, prepares_or_knows, supports_ritual_casting,
ritual_casting_mode, primary_ability_expression, notes`.

Every one of those is a *spellcasting* attribute. Grepping the whole 616-line
schema for character-sheet concepts:

| concept | occurrences in schema.sql |
|---|---|
| hit dice | 0 |
| hit points | 0 |
| armour class | 0 |
| skills | 0 |
| class features | 0 |
| traits | 0 |
| speed | 0 |
| size | 0 |
| languages | 0 |
| subclass level | 0 |
| proficiency | 1 (spellcasting proficiency bonus only) |

**Subclass coverage is 2 of 12 classes, and that is not an oversight.** The only
seeded subclasses are Eldritch Knight (Fighter) and Arcane Trickster (Rogue) —
precisely the two third-caster subclasses. Champion, Thief and the rest were
never modelled because they do not cast spells. A Wizard can be created and has
no subclass options at all.

Nothing enforces "a subclass is required at level 3" either; the concept does
not exist.

### What this means for the guided builder

A builder over the current model can walk a user through: name, ability scores,
class, level, and spell choices. It **cannot** produce a character sheet,
because the data for one does not exist — no HP, no AC, no skills, no
proficiencies, no features, and no subclass for ten of the twelve classes.

Two honest options, both larger than the builder UI itself:

1. **Model expansion first** (the planned track): add the sheet domain, then
   build the guided flow over it. Correct, and substantial.
2. **Ship a spell-focused builder now**: a guided flow for exactly what the app
   models today, honest about being a spell planner rather than a full sheet.
   Delivers something usable quickly; risks the owner expecting more.

**Recommendation: (2) first, then (1).** The owner's stated motivation is that
their friends miss selections in confusing tools — that pain is real for spell
selection alone, and completeness v1 already addresses it. Shipping a working
spell-focused builder proves the flow before the sheet domain is built.

Parked as Q6 for the owner rather than decided autonomously: this changes what
"character builder" means and is a product decision, not a technical one.

---

## F3 — Two latent bugs in committed code (proved 2026-07-25, model track)

Both predate this session's work and are worth fixing regardless of which
plan lands.

**F3a — the payload validator has a hole the type system does not catch.**
`src/commands/payload-validator.ts:335-378` switches over an already-narrowed
`type` and RETURNS after the switch. A missing `case` arm therefore ships an
**unvalidated payload with a clean typecheck**. The command factory switch
(`character-command-factory.ts:52-108`) and the `prepareInverse` switch
(`character-command-executor.ts:314-351`) ARE compile-enforced — TS2366 on a
missing arm — so the inconsistency is easy to miss. Any new command type that
forgets its validator arm silently bypasses validation entirely.
Fix shape: make the validator switch exhaustive-by-construction the way the
other two are, so omission is a compile error rather than a security hole.

**F3b — backup import writes `character_rule_overrides.value` verbatim.**
`src/backup/character-backup.ts:1034-1038` performs no JSON validation;
`validateCharacterRows` (`:272-286`) covers only `CHARACTER_STATE_TABLES`, which
does not include that table. Today the table has no production writer, so the
exposure is theoretical. It stops being theoretical the moment sheet data lives
there — which is exactly what the model plan proposes.

---

## R1 — RECONCILIATION: model plan contradicts D1 on weapons

The model-expansion plan specifies weapons as
`{ name, category: "simple"|"martial", enhancement: 0..3, note }`.

That is the SUPERSEDED wording. **D1** replaced it after that track started:
the user names the weapon themselves and sets its attributes — damage dice,
range, light, other properties. No catalog, no category, and no separate
enhancement concept (it is just another attribute).

Apply at implementation: drop `category`, drop `enhancement`, add the attribute
fields. Prefer a small set of known property toggles plus a free-text field over
an open key/value blob, so the sheet can render them and an agent can read them.

The correction is downward — strictly less machinery than planned.

---

## F2 — `codex --sandbox read-only` is NOT containment (proved by execution 2026-07-25)

Measured, not read from documentation. With
`-C <empty mktemp dir> --ephemeral --ignore-user-config --ignore-rules
--skip-git-repo-check`, codex:

- **executed `id`**, returning `uid=1000(vagrant)`;
- **read a file outside its `-C` root** — the repo's `package.json`.

Only writes were blocked (`Read-only file system`). So `--sandbox read-only`
constrains the FILESYSTEM to reads; it does not prevent command execution and
does not confine reads. `-C` is a working directory, not a boundary. Anything
reachable by the `vagrant` user is reachable: `~/.ssh`,
`~/.claude/.credentials.json`, `~/.codex/auth.json`.

By contrast `claude -p --tools ""` IS capability-contained. Verified
adversarially: asked to write a file and run `id`, the stream contained zero
`tool_use` blocks, no file was created, and the turn ended mid-sentence for
want of a tool to call.

**Why this matters beyond the bridge:** an earlier draft of that plan asserted
both CLIs "cannot edit the repo, read the repo, or run commands", and that claim
was load-bearing for its entire prompt-injection defence. Two thirds of it was
false. It surfaced only because the agent was instructed to RUN the CLIs rather
than recite their flags.

Applies to this project's own practice too: read-only codex dispatches
throughout this session were containment for WRITES only. That was sufficient
for review work, but it was never the isolation the flag name suggests.

Consequence adopted: containment is not the defence for the CLI bridge. The
defence is the input boundary — no text authored by anyone but the local user
reaches a prompt; only integers and strings resolved from the local active
catalog (`is_active = 1`, `provenance <> 'placeholder'`).

---

## F1 — SRD-derived data ALREADY ships, with no attribution (proved 2026-07-25)

Surfaced by the catalog track; verified independently here.

`src/rules/class-progression-lookup.ts` (646 lines) contains D&D class names
and cantrip/slot progression tables. `src/rules/spell-slots.ts` contains the
multiclass slot table. The only attribution text in the repository is
`docs/srd/ATTRIBUTION.md`, written today — a document *about* attribution, not
a notice attached to the data, and it does not ship in the application.

**Stated carefully:** the catalog plan called this "a present breach". That is
stronger than the evidence supports and stronger than I am qualified to assert.
Class names are not copyrightable and tables of numbers are thin expression.
What is certain: SRD-derived material is present, no notice accompanies it, and
shipping the notice is nearly free. Do that and the question stops needing an
answer.

Actions:
- The notice must reach the RUNNING APP, reachable from any screen rendering
  this content — CC-BY attaches to the distributed work, not to a repo doc.
- It must also appear in exported/printed character sheets and in any
  machine-readable reference block emitted for AI agents.
- This is not blocked on the SRD bundle track. It applies to data already in
  the tree today and should land in the first increment that touches the UI.

---

## F0 — GROUND TRUTH: the shipped app has no class content (proved 2026-07-25)

Not a decision — a proved fact that several tracks are planning against
wrongly, and which changes what "minimum viable" means.

`seedClassProgressions` (`src/rules/class-progression-lookup.ts:543`) is the
ONLY writer of `class_definitions`, `class_progressions`,
`subclass_definitions`, `subclass_progressions`. **Every caller is under
`tests/`.** Nothing in `src/` calls it. Production bootstrap
(`src/db/worker.ts:20-36`) applies `schema.sql` and nothing else; `public/`
contains only `_headers` and `_redirects`. `CatalogImporter` writes spell
tables only (`src/catalog/catalog-importer.ts:140,310,454,545`).

**Therefore a fresh production install has zero classes, subclasses, feats,
species and backgrounds.** The only route by which that content reaches a
production database today is a full database restore
(`src/db/database-lifecycle.ts:15-50`).

Consequences:

- Bundling the SRD is not a convenience feature. It is the difference between
  a usable app and an empty one on first run.
- The generalised non-spell importer is the other half of the same problem, not
  an independent nicety.
- The guided builder has nothing to guide anyone through until one of those
  lands. This is a hard ordering constraint, not a preference.
- Grant-rule content is user-supplied and unvalidated for internal consistency,
  so `required: false` is reachable in production. Checks must filter on the
  column, never assume it is uniformly 1.

---

## D1b — SRD weapons ship as TEMPLATES; custom weapons stay; masteries are a choice (2026-07-25)

**Amends D1.** D1 removed the weapon catalog entirely. That went one step too
far: bundling the SRD weapons as *templates* costs little, saves the user
retyping a longsword's statistics, and is already permitted by D3 (SRD 5.2 is
CC-BY-4.0 and is being bundled anyway).

Three parts:

1. **SRD weapons as templates.** Bundled reference rows the user picks to
   PRE-FILL a weapon's attributes. A template is a starting point, not a
   binding: once chosen, every field stays editable. There is no "this weapon
   is officially a Longsword" relationship to maintain, and no upgrade-in-place
   problem, because the character stores the resulting VALUES, not a reference
   to the template. Templates are catalog data; weapons on a character are not.
2. **Custom weapons remain fully user-defined** — name plus attributes (damage
   dice, range, light, other properties), exactly as D1 said. A custom weapon
   is just one whose fields were typed rather than pre-filled.
3. **WEAPON MASTERY is a per-character CHOICE and must be modelled as one.**
   Previously omitted entirely. In the 2024 rules each weapon has a mastery
   property (Cleave, Graze, Nick, Push, Sap, Slow, Topple, Vex), and a
   character with the Weapon Mastery feature selects a limited number of
   weapons whose mastery they may use. The COUNT is derived from class and
   level, not chosen freely.

Consequences to apply:

- The weapon template shape gains a mastery property; the character's weapon
  entry gains "mastery selected for this weapon" state.
- The mastery COUNT is class/level-derived, so it is the same shape of problem
  the grant-rule system already solves for spells: "choose N from a set."
  **Evaluate reusing the grant-rule machinery before inventing a parallel
  selection mechanism** — but do not force it if the fit is poor.
- Mastery selection becomes a COMPLETENESS CHECK candidate: N slots available,
  fewer chosen. That is a real missed-selection of exactly the kind this work
  exists to surface. It belongs in the deferred completeness list until the
  model lands, not in v1.
- Whether mastery count is derivable from existing `class_progressions` data,
  or needs new content, is an OPEN QUESTION to prove — not assume — before
  designing it.

Supersedes: the `category: simple|martial` and `enhancement: 0..3` fields from
the model plan (see R1), which remain wrong. Enhancement is still just an
attribute.

---

## D1 — Weapons are fully user-defined, with no catalog (2026-07-25) — AMENDED BY D1b

**Supersedes** the earlier direction ("select from the basic and martial weapons
with manual input on name and if it is +1 or 2 or 3"). The model-expansion track
was planning against that older wording and must be corrected.

The user types the weapon **name** themselves and selects its **attributes**:

- damage dice
- range
- light
- other properties

There is **no weapon list, no weapon catalog, and no weapon import**. Nothing to
bundle, nothing to import, and no licence question for weapon data — statistics
a user enters themselves are their own input.

Consequences to apply:

- Drop any weapon-catalog table, import format, seed data, or picker UI.
- Weapons do **not** depend on the catalog-agnostic import track landing.
- The `+1/+2/+3` enhancement from the earlier wording is subsumed: it is just
  another attribute the user sets, not a separate concept.
- "Other properties" wants a deliberate representation. Prefer a small set of
  known toggles plus a free-text field over an open key/value blob, so the
  character sheet can render them and an AI agent can read them as text.

Rationale: consistent with the owner's repeated "minimum viable / let people
sort it out at the table". It removes an entire content pipeline.

---

## D2 — Completeness ships before the builder (2026-07-25)

Completeness detection covers **only what the committed code can already
detect**. Guidance and warnings for equipment, hit points, armour class, skills
and proficiencies wait until the model expansion lands, because those are
structurally absent from the schema today.

The extension seam is designed now; the later checks are not.

---

## D3 — SRD is bundled; other content stays imported (2026-07-25)

Bundle only content whose licence's **sole obligation is attribution** — SRD 5.2
under CC-BY-4.0, plus CC-BY-SA where compatible, MIT, Apache-2.0. Verbatim
notice per `docs/srd/ATTRIBUTION.md`, and no attribution to Wizards beyond that
exact notice.

Everything else — Player's Handbook and similar — is the user's own copy,
imported locally, never redistributed. Rendering it in the user's own browser
for their own AI agent is use, not distribution. Imported rules text must never
reach `dist/`, the repository, an export, or a share link.

---

## D4 — Agent-readable content is collapsed, never hidden (2026-07-25)

`<details>` and/or `<script type="application/json">`, identical content for
humans and machines. No CSS-hidden divs, zero-opacity spans, off-screen
elements, comments, meta tags, or `data-*` cloaking — that is the signature of
indirect prompt injection (OWASP's #1 AI threat for 2026) and gets sites
classified as hostile.

Emit reference **data**. Never emit text phrased as an **instruction to the
agent** — that is injection even on one's own site.

---

## D5 — Multiclass stays with the planner (2026-07-25)

The guided builder covers **single-class** creation and hands off to the
existing planner, which already handles multiclass. The builder does not
reimplement it.

---

## H1 — Candidate-image hardening: the quadratic, the two new refusals, and the one cap NOT added (2026-07-26)

**Finding 1 — the audit's cycle detection was O(N²) and is now O(N).**
`assertNoParentCycle` allocated a fresh visited set per start node and re-walked
the whole ancestor chain from every key. Measured before, on one parent chain of
N `character_source_instances` in one image, against the identical rows with no
parent as the linear control:

| N | chained | flat control | after the fix |
|---|---|---|---|
| 3,000 | 116.9 ms | 3.3 ms | 9.4 ms |
| 6,000 | 628.9 ms | 5.2 ms | 17.4 ms |
| 12,000 | 3,349.0 ms | 9.5 ms | 31.8 ms |
| 24,000 | 16,574.1 ms | 18.8 ms | 69.6 ms |
| 50,000 (5.6 MB image) | **80.5 s** | — | **0.10 s** |
| 2,000 × 20 save points (11.9 MB) | 1.15 s | — | 0.133 s |

`validateBytes` is synchronous inside the app's one dedicated worker, so the
80.5 s was 80.5 s of every other RPC queued behind it. The fix is a `settled`
set shared across start nodes; a node joins it only on a walk that ENDED, so a
cyclic chain can never be settled and the reported id is unchanged.

**The guard is a lookup count, not a stopwatch.** A wall-clock budget would be a
flake on a box running four worktrees. `tests/unit/db/candidate-audit.test.ts`
counts `Map.get` calls on a 10,000-node chain and requires fewer than 40,000;
the old implementation makes 50,004,999 — verified by reverting the fix and
watching the assertion fail with that number.

**Finding 2 — two refusals added, one gap kept deliberately.**
REJECTED now, because neither can occur in an image this application produced,
so there is no legitimate import to destroy: (1) two snapshot rows sharing one
`id` — the live table has a PRIMARY KEY, and restore dies with
`SQLITE_CONSTRAINT_PRIMARYKEY`; (2) a snapshot slot holding both
`fixed_spell_version_id` and `current_spell_version_id` — the CHECK and the two
triggers forbid it on every INSERT/UPDATE, and restore dies with
`SQLITE_CONSTRAINT_TRIGGER`. Both rules are IMPORTED from the portable-backup
validator (`src/domain/contracts/row-rules.ts`) rather than written twice.

NOT REJECTED, deliberately: a snapshot referencing a `spell_versions` row with
`is_active = 0`. `CharacterState.validateSnapshot` refuses it, but unlike the
other two this state is reachable in a legitimate database — `CatalogImporter`
tombstones a version on every re-import that stops naming its `content_key`
(`src/catalog/catalog-importer.ts:266`), and save points captured earlier keep
pointing at it. Refusing the image would mean a user who took a catalog update
can no longer restore their own backup. The skip is inert and proved so:
`restore` calls `validateSnapshot` BEFORE opening its transaction, so the
snapshot cannot become an INSERT, and the test asserts the rows are unchanged
after the refusal.

**Finding 3 — the ownership pass is future-proofing, and now says so in a test.**
`auditCharacterOwnership` catches nothing today: every character-owned
`character_id` carries an FK, so `PRAGMA foreign_key_check` reaches every orphan
first. `UNENFORCED_OWNERSHIP_TABLES` derives that claim from the generated FK
facts and a test asserts it is EMPTY, so the day someone adds a character-owned
table without that FK the claim fails loudly instead of ageing into a lie. The
pass is kept — it costs nothing and the audit is contracted on the
classification, not on the FKs — but it is no longer counted as a guarantee.

**No byte or row cap at the backup boundary, and why.** The DoS was the
algorithm, not the size. Post-fix cost is linear at roughly 10 ms per megabyte,
so a 100 MB import costs about a second. A cap's only failure mode is refusing a
real user's import (D6b), and there is no honest number to set it at: the
database grows with the catalog AND with unbounded undo history. Recorded in
`src/backup/database-backup.ts` with the measurements, so the next person does
not have to re-derive it.
