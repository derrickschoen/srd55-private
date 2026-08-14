# Deep Reference: The Data Layer

> Parent: [CODEBASE_GUIDE.md](guidelines/CODEBASE_GUIDE.md)
>
> If this file disagrees with `.claude/decisions.md`, decisions.md wins and this
> file is the bug.

---

## 1. Three layers, and where each actually runs

| Layer | Where it runs | What it is for |
|---|---|---|
| **Drizzle** | BUILD TIME ONLY | Authors `src/db/schema.sql`; supplies the TS types the Zod contracts bind against |
| **Zod row contracts** | Untrusted-bytes boundaries | Backup import/export, candidate-image audit, seed parsing |
| **Codecs** | EVERY query | Turning a `SqlRow` into a value this application will reason about |

One-line gloss with the record it belongs to: **F8** measured all three and
concluded the codec is redundant with neither — Drizzle is not there at runtime,
and the Zod contracts guard a different boundary. Read F8 for the reasoning.

**Do not expect the numbers in it to still be true.** F8 recorded 26 files
importing the codecs;
`grep -rl 'db/codecs' --include=*.ts src/ | wc -l` reported 37 on this tree while
this file was being written. That is hub rule 2 in one example — the command
lives in [DEEP_REF_PROOF_TOOLKIT.md](DEEP_REF_PROOF_TOOLKIT.md) §4, and the
number does not live anywhere.

### Drizzle at runtime is a BUILD FAILURE, not a convention

`vite.config.ts` defines `forbidDrizzleAtRuntime` (`:199`), a rollup plugin that
fails the production build if any module in any entry graph resolves into a
`drizzle-*` package.

**It is registered TWICE** — `vite.config.ts:225` for the main graph and
`vite.config.ts:227` for the worker graph — because Vite builds worker graphs
through `config.worker.plugins`, a separate pipeline that does NOT inherit
top-level `plugins`. Registering it only at the top level was verified to leave
the worker unguarded. `tests/unit/db/drizzle-is-build-time-only.test.ts` asserts
on the literal text of both registrations, which is why they must stay spelled
exactly as they are.

Practical consequence: **anything under `src/` may only `import type` from
`db/schema/`.** `verbatimModuleSyntax` erases those entirely.
`src/domain/contracts/tables.ts` is the worked example — every one of its
schema imports is a type import, and it still derives the whole table inventory.

---

## 2. The codec rule

**`db.all` and `db.one` REQUIRE a codec. Omitting one is a compile error.**

`src/db/database.ts`:

- `all` (`:59`) —
  `all<T>(sql: string, bind: QueryBindings | undefined, codec: RowCodec<T>): T[]`
- `one` (`:67`) —
  `one<T>(sql: string, bind: QueryBindings | undefined, codec: RowCodec<T>): T | null`
- `allRaw` (`:76`) —
  `allRaw(sql: string, bind?: QueryBindings): SqlRow[]`
- `oneRaw` (`:80`) —
  `oneRaw(sql: string, bind?: QueryBindings): SqlRow | null`

On the DECODED path `bind` is **positional-required**: pass an explicit
`undefined` when there is nothing to bind. That is what keeps position 2
unambiguously the codec — an optional `bind` would make `db.all(sql, codec)` a
legal two-argument call with the codec in the wrong slot.

On the RAW path it stays optional, and the asymmetry is deliberate. The reason
for requiring it is one-sided: `all`'s required `bind` protects a type-level
proof (§4), and `allRaw` has no codec to protect — its arity is independently
pinned at `1 | 2` by assertion 10 of `tests/types/codec-required.type-test.ts`,
so it cannot quietly grow a third parameter and become a second decoded path.

It is fair to ask whether that hands `allRaw` an ergonomic discount that nudges
people away from codecs. Measured, it does not:

```sh
grep -rono '\.allRaw(\|\.oneRaw(' --include=*.ts src/ tests/ | wc -l         # raw calls
grep -rPno '\.(allRaw|oneRaw)\([^,)]*\)' --include=*.ts src/ tests/ | wc -l  # omitting bind
```

When this was written the second was under a tenth of the first: the
overwhelming majority of raw calls pass a bind anyway, so the optional `bind` is
not where a discount would come from. The real difference between the two paths
is the codec, and that is not a discount — it has a name you have to type.
Requiring `undefined` on the raw path would add a meaningless token to
`PRAGMA table_info(…)` and `SELECT *`, precisely the runtime-shaped reads §3
lists as the legitimate uses.

### Why it is not overloaded

There is no `all(sql, codec)` convenience overload, deliberately.
`Parameters<F>` resolves to the LAST overload only, so an overload pair would
give the type-level proof a blind spot — in exactly the guarantee the signature
exists to make unforgeable. The comment saying so is at `src/db/query.ts:41-51`.

### The raw path has a NAME

`allRaw` / `oneRaw` are for reads where the table or the column set is decided
at runtime, and there is genuinely no fixed shape to write a codec against:

- `PRAGMA table_info("${params.table}")` and the `system.inspectRows` RPC over an
  arbitrary table (`src/worker/handlers/system.ts`)
- `SELECT * FROM "${table}"` over a runtime table list — backup
  (`src/backup/character-backup.ts`), snapshots
  (`src/character/character-state.ts`), share export/import
  (`src/sharing/character-share.ts`)
- rows fed to a **runtime-keyed column diff**: `updateChangedRow` in
  `src/grants/grant-rule-slot-generator.ts` and the version-attribute loop in
  `src/catalog/catalog-importer.ts` compare `row[column]` against a map whose
  keys are chosen at run time. A codec there would close the very column set the
  diff exists to keep open.
- a catalog definition read through `definitionTableForSourceType` — a class, a
  feat and a background share almost nothing but `id` and `content_key`
  (`src/commands/add-source.ts`)

**Never satisfy the requirement with an identity codec.** `(row) => row`
type-checks, decodes nothing, and makes a read look decoded in review while
returning exactly what the codec-less version returned. There is a guard:
`tests/unit/db/codec-slot-is-never-an-identity.test.ts`.

### Codecs and the helpers they are built from

`src/db/codecs.ts`:

- `SqlRow` (`:20`) — `Readonly<Record<string, SqlValue>>`
- `RowCodec<T>` (`:31`) — `(row: SqlRow) => T`
- `rowId` (`:37`) — the shared `SELECT id` codec, the commonest one-column read
- field helpers, each of which THROWS a `TypeError` naming the column when the
  stored value is not what it claims: `sqlNumber` (`:45`), `sqlInteger` (`:53`),
  `sqlNullableInteger` (`:61`), `sqlString` (`:68`), `sqlNullableString` (`:76`),
  `sqlBoolean` (`:153`, SQLite 0/1 only), `sqlJson` (`:224`),
  `sqlNullableJson` (`:231`)
- encoders for the write direction: `encodeBoolean`, `encodeJson`

Where a codec is used more than once, hoist and name it — a named codec is a
place to say what a column MEANS. `sheetClassRow` in
`src/queries/character-sheet-builder.ts` is the worked example: its `hit_die`
field carries the whole D24 finding in one nullable number.

Test-side codecs live in `tests/helpers/row-codecs.ts`, and that file opens by
telling you most tests should not use it — see
[DEEP_REF_TESTING.md](DEEP_REF_TESTING.md) §4.

---

## 3. What the codec requirement is actually worth

Two things it bought, both observed rather than argued:

**It found a wrong assumption the raw path had been carrying.** The first draft
of `spellPublication` in `src/catalog/catalog-importer.ts` typed `source_page` as
a string. Three integration tests failed with
`Column "source_page" must be a string; received 14.` The column is
`integer('source_page')` (`db/schema/catalog-spells.ts:223`). The codec-less read
would have carried the number through untouched and compared it to a number
anyway — nothing would have broken, and nothing would have been checked either.

**It turned an unchecked cast into a real check.** `src/commands/update-character-rules.ts`
held the only genuine unchecked primitive cast in `src/` — `all<{ id: number }>`
asserting a column type nothing had verified, then re-coercing with
`Number(slot.id)` two lines later because the assertion was not trusted. The
same pattern was in 30 test sites. They are `rowId` and real codecs now.

---

## 4. The proof

`tests/types/codec-required.type-test.ts` — fifteen type-level assertions that
stop compiling if the codec parameter ever becomes optional again. It has no
runtime, uses no `@ts-expect-error`, and rides `tsc -b` for free because
`tsconfig.node.json` includes `tests`.

How it is re-measured, and why a runtime assertion cannot do this job at all:
[DEEP_REF_PROOF_TOOLKIT.md](DEEP_REF_PROOF_TOOLKIT.md) §1.

The hole types cannot close — an identity codec — is covered by the artifact
guard named above. §2 of the toolkit explains that shape.

---

## 5. Everything else on `DatabaseContext`

`src/db/database.ts`:

| Member | Line | Note |
|---|---|---|
| `exec(sql, bind?)` | `:47` | Writes. Returns `{ changes, lastInsertId }` |
| `all` / `one` | `:59`, `:67` | Decoded reads. Codec required |
| `allRaw` / `oneRaw` | `:76`, `:80` | Raw reads |
| `scalar<T>(sql, bind?)` | `:84` | One `SqlValue` or `null` |
| `transaction(fn, mode?)` | `:91` | Default `IMMEDIATE`; nesting tracked by `TransactionRunner` |

The free functions behind them are in `src/db/query.ts` (`execute` `:24`,
`queryAll` `:53`, `queryOne` `:63`, `queryAllRaw` `:82`, `queryOneRaw` `:90`,
`queryScalar` `:99`). `DatabaseContext` is their only caller today, but they are
exported, so the type proof asserts on them too.

Below `DatabaseContext`: `database-lifecycle.ts` (open, validate, reset),
`bootstrap.ts` (fresh-database seeding), `candidate-audit.ts` (the quarantined
audit of an imported database image), `schema.sql` (generated — see
[DEEP_REF_SCHEMA.md](DEEP_REF_SCHEMA.md)).
