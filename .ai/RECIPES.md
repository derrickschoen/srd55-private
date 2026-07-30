# Recipes

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

These are the things that keep being got wrong. Each one is written as steps you
can run, with the failure it prevents named.

| # | Recipe |
|---|---|
| [1](#1-add-a-table) | Add a table |
| [2](#2-add-an-enum-or-tighten-a-field) | Add an enum, or tighten a field |
| [3](#3-add-a-column-that-must-survive-backup-share-and-snapshot) | Add a column that must survive backup, share and snapshot |
| [4](#4-source-srd-content) | Source SRD content |
| [5](#5-add-a-query) | Add a query |
| [6](#6-run-the-browser-suite-in-a-worktree) | Run the browser suite in a worktree |
| [7](#7-make-a-new-invariant-compile-time-provable) | Make a new invariant compile-time-provable |
| [8](#8-add-a-command) | Add a command (with its inverse) |
| [9](#9-add-a-homebrew-fixture) | Add a homebrew fixture |

---

## 1. Add a table

**The failure this prevents:** editing `src/db/schema.sql` by hand. It is
generated; your edit is silently reverted on the next `npm run db:schema`, and
`tests/unit/schema-generation.test.ts` fails in the meantime with a diff nobody
asked for.

1. **Declare it in TypeScript**, in the right file under `db/schema/` —
   `character.ts` for the character aggregate, `catalog-*.ts` for catalog
   content, `sheet-inputs.ts` for stored sheet inputs, and so on. Use the column
   primitives from `db/schema/columns.ts`.

2. **Re-export it from `db/schema/index.ts`** if the module is new. Not optional:
   `scripts/compose-schema.ts` passes that namespace to drizzle-kit and
   `src/domain/contracts/tables.ts` derives `AnyTableName` from it.
   `tests/unit/schema-modules.test.ts` fails if a file is not re-exported.

3. **Classify it** in `src/domain/contracts/tables.ts`: `TABLE_SCOPES` (`:165`). You
   do not get to skip this — verified by probe on this tree:

   ```
   src/domain/contracts/tables.ts(789,12): error TS1360:
     Property 'recipe_probe' is missing in type … but required in type …
   ```

   Six fields: `role`, `snapshot`, `backupDirect`, `backup`, `share`,
   `backupReference`. `backupDirect: true` is itself compile-gated on the table
   having a `character_id` column, because the direct pass selects
   `WHERE character_id = ?`.

4. **Regenerate, both artifacts:**

   ```sh
   npm run db:schema      # → src/db/schema.sql
   npm run db:contracts   # → src/domain/contracts/generated/column-facts.ts
   ```

5. **Refine any degraded column.** drizzle-zod emits `z.any()` for every
   `customType`; the refinement map in `src/domain/contracts/rows.ts` is
   `satisfies Record<DegradedColumnKey, …>`, so an unrefined one is a compile
   error. If the column holds serialized JSON, its contract is its SHAPE — add it
   to `src/domain/contracts/json-columns.ts`, not a "parses as JSON" check.

6. **Add ordering** if the table is in a scope that needs it —
   `CHARACTER_STATE_TABLES` / `DELETE_ORDER` for snapshots, `BACKUP_TABLES`,
   `SHARE_TABLES`. These are ordered constants, and delete order has to respect
   foreign keys.

7. **Verify:**

   ```sh
   npx tsc -b && npm test && npm run build
   grep -c '^CREATE TABLE' src/db/schema.sql   # should have gone up by one
   ```

8. **If it is `character_owned`, go to [recipe 3](#3-add-a-column-that-must-survive-backup-share-and-snapshot).**
   Classification is not the same as working.

---

## 2. Add an enum, or tighten a field

**The failure this prevents: a closed enum over user data is a DATA-LOSS BUG.**

Making `spell_versions.school` an 8-member enum rejects an imported homebrew
spell whose school is "Chronomancy". The user can see the record in their own
file. Either the import refuses the document or the value is silently gone.
Over-strictness at a boundary is not safety.

**Decide first, using F8's three verdicts.** Ask: *can homebrew extend this set?*

| Verdict | When | How |
|---|---|---|
| **CLOSE** | The SRD closes the set and homebrew will not extend it — spell `level` 0..9, `provenance` | A real `as const` tuple in `src/domain/enums.ts` plus a CHECK in the schema |
| **OPEN** | Known values recognised, unknown ones PRESERVED — `school`, `action_type` | Keep the storage type wide; recognise known values at the point of use |
| **VALUE OBJECT** | A free string holding structured data — `range`, `components`, `casting_time` | Parse with fallback into SEPARATE columns; the raw column is untouched and still prints. `src/domain/spell-range.ts` is the worked example |

**If you close it:**

1. Declare it in `src/domain/enums.ts` as `['a', 'b'] as const` plus
   `type X = (typeof x)[number]`.
2. Say in a comment WHY the set is closed — what would be wrong if a value
   outside it were stored. `speciesTraitEffectKinds`
   (`src/domain/enums.ts:323`) is the model: four members, each because it moves
   a derived number and a sheet that ignored it would simply be wrong.
3. Add the matching CHECK constraint so the database enforces it too.
4. Use `isEnumValue(…)` at the boundary, and decide explicitly what happens to a
   value that fails — the sheet's `enumOr(…, fallback, note)` pattern in
   `src/queries/character-sheet-builder.ts` substitutes a value AND emits a
   warning naming the column, the rejected value and the substitute, rather than
   throwing or silently coercing.

**The shape to reach for instead of a closed enum:** a bounded set of mechanical
KINDS plus free text. Adding a new kind is a deliberate change; adding a new
*thing* is not. Q4 (weapon toggles), D12 (species/background traits) and F8 all
land on it.

---

## 3. Add a column that must survive backup, share and snapshot

**This is the Q8 lesson, and D24 is the record of applying it rather than
repeating it. Q8's bug was believing CLASSIFICATION was the same as WORKING.**

The four arms, named. A column has to reach each one, and each one gets its own
test:

| Arm | Where the column has to be added | Its test |
|---|---|---|
| **Storage** | `db/schema/*.ts`, then `npm run db:schema` + `npm run db:contracts` | `tests/unit/schema-generation.test.ts`, `tests/unit/contracts/column-facts-generation.test.ts` |
| **Snapshot** (undo/redo) | Covered by `TABLE_SCOPES` for an owned TABLE. For a column on `characters`, `src/character/character-state.ts`: `CHARACTER_STATE_COLUMNS` (`:318`) — BY HAND | a save-point restore test |
| **Backup** (portable character) | `src/backup/character-backup.ts`, and `docs/BACKUP-FORMATS.md` | a **column-for-column** round trip |
| **Share** (compressed URL fragment) | `src/sharing/schema.ts` + `src/sharing/character-share.ts`, and `docs/sharing/SCHEMA.md` | a round trip **through the fragment**, plus an OLD-payload test |

### The trap: `characters` is classified all-false

The root is serialized through its own path — `CHARACTER_STATE_COLUMNS` for
snapshots and `document.character` for backups — never through a table loop. **A
new column on `characters` is picked up by NONE of the table-scope machinery.**
Nothing will tell you. Add it to each path by hand.

### The old-payload test is the one people skip

A link or backup minted before your column must still import. The mechanism is
in `tests/unit/sharing/codec.test.ts`: `PRE_SHEET_WIRE` (`:1828`) — the frozen
pre-sheet-inputs wire tuple is asserted to be THIRTEEN elements, so regenerating
that literal from current code (which would make it fourteen) fails loudly
instead of letting the suite quietly test the new format against itself. And a
save point that predates the column **leaves it alone** rather than clearing it.

The assertion to write is *"absent, not empty"*. An empty list would be this
build putting words in an old payload's mouth.

### Checklist

```sh
npx tsc -b
npm test
npm run build
PLAYWRIGHT_PORT=4195 npx playwright test
```

Then, per arm, delete the code that carries your column and confirm the
corresponding test goes red. If any of the three passes, that arm is untested —
see [DEEP_REF_PROOF_TOOLKIT.md](DEEP_REF_PROOF_TOOLKIT.md) §5.

---

## 4. Source SRD content

**The failure this prevents:** a rules value that traces back to somebody's
memory instead of a document — and a truncated extract that silently undercounts.

1. **Re-derive the extract** exactly as `docs/srd/SOURCE.md` § "How to re-derive
   the extracts" says:

   ```sh
   curl -sSLO https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf
   sha256sum SRD_CC_v5.2.1.pdf     # must match the table in SOURCE.md
   pdftotext -layout SRD_CC_v5.2.1.pdf srd.txt
   ```

   `-layout` matters: without it the two-column pages interleave. Slice columns
   **by character, not by byte** — the SRD uses curly quotes and a byte-wise
   `cut -c` splits one, producing invalid UTF-8. Stop at the real column
   boundary, or a value is truncated mid-word and becomes fabricated data.

2. **Check the extract is COMPLETE, not just present.** This is the failure that
   caused per-file checksums to exist: `species-descriptions.txt` began thirteen
   lines late and lost two Dragonborn traits, while the PDF's own checksum
   matched throughout and always would have.

3. **Add its row to `docs/srd/SOURCE.md`** — file, what it covers, page numbers,
   SHA-256. `tests/unit/rules/srd-extract-provenance.test.ts` asserts the table
   and the directory are equal AS SETS IN BOTH DIRECTIONS, so a file with no row
   fails and a row with no file fails.

4. **Check the licence obligation before bundling anything that is not the SRD.**
   `docs/srd/ATTRIBUTION.md` § "What may be bundled". The test is the OBLIGATION,
   not the licence family — CC-BY-SA does not qualify. Do not paraphrase the
   notice anywhere. See [DEEP_REF_LICENSING.md](DEEP_REF_LICENSING.md).

5. **Content that fails the test stays user-supplied through catalog import.**
   That boundary does not move.

---

## 5. Add a query

1. Write the SQL and the codec **together**. `db.all` / `db.one` take three
   arguments and the third is required:

   ```ts
   const rows = db.all(
     'SELECT id, name, hit_die FROM class_definitions WHERE id = ?',
     [classId],
     (row) => ({
       id: sqlInteger(row, 'id'),
       name: sqlString(row, 'name'),
       hit_die: sqlNullableInteger(row, 'hit_die'),  // NULL for a homebrew class
     }),
   );
   ```

   Pass an explicit `undefined` for `bind` when there is nothing to bind.

2. **Hoist and name the codec** if it is used more than once, or if a column
   needs explaining. A named codec is the place to say what a column MEANS.
   `sqlNullableInteger` on `hit_die` above is the whole D24 finding in one field.

3. **Nullable is a decision, not an oversight.** `sqlNullableString` says the
   column can be NULL; `sqlString` says it cannot and throws if it is. Picking
   the wrong one is caught immediately — the codec requirement's first catch on
   this tree was `source_page` typed as a string when the column is
   `integer('source_page')`.

4. **If the column set is decided at runtime, use `allRaw` / `oneRaw`** and say
   why in a comment. Never `(row) => row` — it type-checks, decodes nothing, and
   `tests/unit/db/codec-slot-is-never-an-identity.test.ts` will fail.

5. **`SELECT` only the columns the codec reads.** A codec that decodes five
   columns from a `SELECT *` invites the two to drift.

Full reference: [DEEP_REF_DATA_LAYER.md](DEEP_REF_DATA_LAYER.md).

---

## 6. Run the browser suite in a worktree

```sh
PLAYWRIGHT_PORT=4195 npx playwright test
```

**Pick a port no other checkout is using.** Every worktree defaulted to 4173, and
`reuseExistingServer: false` makes a collision a hard error rather than a silent
reuse. Port contention is the only condition under which the flake recorded as
F5 has ever reproduced (`playwright.config.ts:5-18`).

The default is deliberately unchanged, so a lone checkout behaves exactly as
before and F5 stays reproducible on demand by starting a second dev server by
hand.

Notes:

- The suite starts its own dev server with `AI_BRIDGE_FAKE=1` — a deterministic
  offline stand-in speaking the real stream-json shape. No network, no login, no
  paid call.
- `fullyParallel: false`, `workers: 1`. It is meant to be serial.
- Traces are retained on failure; output goes to `PLAYWRIGHT_OUTPUT_DIR` or a
  tmpdir.
- Run `npm run build` first if you changed anything the build generates.

---

## 7. Make a new invariant compile-time-provable

**Use when:** the claim is "X cannot happen", and you want the compiler rather
than a reviewer to be the one enforcing it.

1. **Express it in a type.** Required parameter, `satisfies`, exhaustive mapped
   type, branded id. `TABLE_SCOPES`'s
   `satisfies { [N in AnyTableName]: ScopesFor<N> }` is the model — declaring a
   table becomes `TS1360` until it is classified.

2. **Do NOT use overloads on anything you intend to prove.** `Parameters<F>`
   resolves to the LAST overload only, so an assertion would silently cover one
   signature and let the other rot.

3. **Write the type test** as a POSITIVE assertion about a NEGATIVE property —
   `@ts-expect-error` is forbidden here. Put it in `tests/types/*.type-test.ts`:
   `tsconfig.node.json` includes `tests`, so `tsc -b` compiles it and the
   `-test.ts` suffix keeps vitest from collecting it. Copy the `Assert` / `Exact`
   pair from `tests/types/codec-required.type-test.ts`.

4. **Measure it in BOTH directions before committing.** Break the invariant,
   confirm the exact errors, restore it, confirm silence. Record the observed
   error count and codes in the file's docstring. A type test never seen failing
   is not known to be able to fail.

5. **If types cannot see it, write an artifact guard instead** — ask
   `git ls-files`, the built bundle, or the tracked source text. Give it a
   longhand allowlist and a self-test.

Everything above with the commands: [DEEP_REF_PROOF_TOOLKIT.md](DEEP_REF_PROOF_TOOLKIT.md).

---

## 8. Add a command

Every write goes through `src/commands/`. One class per command.

1. **Add the payload** to `src/domain/command-contracts.ts`.
2. **Write the class** in `src/commands/`, with `apply(characterId)` and
   `inverse()`. The inverse is what undo replays, so it must be derivable from
   what `apply` observed — capture it DURING apply, not after.
3. **Register it** with `CharacterCommandExecutor`
   (`src/commands/character-command-executor.ts`).
4. **Snapshot before mutating** if the command is not trivially invertible:
   `CharacterState.capture(characterId)`. Several commands do this instead of
   computing an inverse by hand.
5. **Idempotency.** Replay is keyed on `operation_uuid`; a replayed command
   returns the stored result rather than applying twice.
6. **Test**: apply, inverse, apply-then-inverse-then-compare, and replay. There
   are existing suites to copy in `tests/integration/commands/`.

---

## 9. Add a homebrew fixture

Fixtures live in `tests/fixtures/homebrew-catalog/`. Read its `README.md` first.

**The rule is narrow: reuse a NAME when the mechanic requires it, never a
SENTENCE.** A homebrew *Bard* subclass that never says "Bard" would not exercise
the thing under test, and mechanic names are SRD 5.2 material which
`docs/srd/ATTRIBUTION.md` records as bundleable. The WORDING is not.

That distinction was not always honoured — review found one feature's prose
sitting verbatim from `docs/srd/source/attack-class-features.txt`, identical but
for two commas, inside a file claiming to be wholly invented. It was rewritten,
and `tests/integration/homebrew/homebrew-catalog-fixture.test.ts` now fails if
any fixture sentence reappears in the SRD source text.

Steps:

1. Write the document in the **existing catalog format** — do not invent a
   variant. `docs/CATALOG-IMPORT.md` is the format.
2. Make it exercise something no other fixture does, and say what in the
   README's table.
3. Import it through the **real `catalog.import` RPC** — dry run, real run,
   re-run — so idempotency is covered.
4. Never put scraped bytes in `tests/`. `tools/scrape/` writes only into the
   gitignored `scraped/` directory under sentinel-stamped filenames, and
   `tests/unit/tools/scraped-output-is-never-committed.test.ts` fails if any of
   that becomes tracked.
