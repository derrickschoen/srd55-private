/**
 * THE PROOF that a decoded read cannot silently skip its codec.
 *
 * This file has no runtime. It is a set of assertions about the TYPES of
 * `DatabaseContext.all` / `.one` and of `queryAll` / `queryOne`, and its whole
 * job is to STOP COMPILING if the codec parameter ever becomes optional again.
 *
 * Why it is shaped this way
 * ------------------------
 * The usual way to test "this call must not compile" is `@ts-expect-error`,
 * which this project forbids — and rightly, since a stray one silences a real
 * error just as happily as a fake one. So instead of writing an illegal call and
 * asserting it fails, every assertion here is a POSITIVE claim about a NEGATIVE
 * property: `undefined extends Parameters<…>[2]` is `false`. A positive claim
 * that is false is a `TS2344`, which no suppression comment is involved in.
 *
 * Why it is not a vitest file
 * ---------------------------
 * A runtime assertion cannot prove this at all. `expect(db.all.length)` reads
 * `Function.prototype.length`, which is erased-at-runtime arity — it says
 * nothing about whether TypeScript would have accepted a two-argument call. The
 * only oracle for "does this compile" is the compiler.
 *
 * Where it runs
 * -------------
 * `tsconfig.node.json` includes `tests`, so `tsc -b` — and therefore both
 * `npm run typecheck` and `npm run build` — already compiles this file. No new
 * script, no new CI step. The `-test.ts` suffix does NOT match vitest's
 * `tests/**\/*.test.ts` include (same trick the `.live-test.ts` files use), so
 * vitest correctly ignores a file with no tests in it.
 *
 * Measured in both directions, by loosening `codec` back to optional in
 * `src/db/database.ts` and `src/db/query.ts` and recompiling:
 *
 *   codec REQUIRED → `npx tsc -p tsconfig.node.json --noEmit` reports nothing here.
 *   codec OPTIONAL → 8 × TS2344 from this file (assertions 1, 2, 3, 4, 5, 6, 7 —
 *                    arity, both codec slots, both free functions, both codec
 *                    shapes).
 *
 * Reverting both files WHOLESALE to the pre-change parent `c162901` gave 12
 * instead: those 8, plus 4 × TS2339 because `allRaw`/`oneRaw` did not exist yet.
 * That extra 4 is a fact about one parent commit, not about these assertions —
 * reproduce the 8, which any checkout can produce.
 *
 * Assertions 8 and 11 correctly stay quiet under the old signature: an optional
 * `bind` still accepts `undefined`, and a uniformly loose `all`/`one` still agree
 * with each other. They guard different regressions. The re-measurement recipe is
 * `.ai/DEEP_REF_PROOF_TOOLKIT.md` §1.
 */
import type { DatabaseContext } from '../../src/db/database';
import type { RowCodec, SqlRow } from '../../src/db/codecs';
import type { queryAll, queryOne } from '../../src/db/query';

/** Compiles only when `T` is exactly `true`. `false` is a TS2344. */
type Assert<T extends true> = T;

/**
 * Invariant-position identity, the standard exact-type test: two conditional
 * types are mutually assignable only when their checked types are identical, so
 * this does not accept a merely-assignable near miss the way `extends` would.
 */
type Exact<A, B> =
  (<G>() => G extends A ? 1 : 2) extends (<G>() => G extends B ? 1 : 2)
    ? true
    : false;

type AllParams = Parameters<DatabaseContext['all']>;
type OneParams = Parameters<DatabaseContext['one']>;
type AllRawParams = Parameters<DatabaseContext['allRaw']>;
type OneRawParams = Parameters<DatabaseContext['oneRaw']>;

/*
 * 1 + 2. ARITY IS FIXED AT THREE.
 *
 * An optional parameter makes the tuple length a union (`2 | 3`), never the
 * literal `3`. This is the early-warning assertion: it also fires if someone
 * re-adds `?` to `bind`, which would reopen the same hole one position to the
 * left.
 */
type _AllArityIsExactlyThree = Assert<Exact<AllParams['length'], 3>>;
type _OneArityIsExactlyThree = Assert<Exact<OneParams['length'], 3>>;

/*
 * 3 + 4. THE LOAD-BEARING PAIR: the codec slot does not admit `undefined`.
 *
 * Arity alone is not enough — `codec: RowCodec<T> | undefined` keeps the length
 * at 3 while still letting a caller write `db.all(sql, bind, undefined)`. These
 * two close that. Together with 1 + 2 they are exactly the statement "there is
 * no way to reach `all`/`one` without naming a codec".
 */
type _AllCodecRejectsUndefined =
  Assert<undefined extends AllParams[2] ? false : true>;
type _OneCodecRejectsUndefined =
  Assert<undefined extends OneParams[2] ? false : true>;

/*
 * 5 + 6. THE FREE FUNCTIONS BEHIND THE METHODS CARRY THE SAME RULE.
 *
 * `DatabaseContext` is the only caller of `queryAll`/`queryOne` today, but the
 * module exports them; asserting only on the class would let the exported
 * function relax without any assertion noticing.
 */
type _QueryAllCodecRejectsUndefined =
  Assert<undefined extends Parameters<typeof queryAll>[3] ? false : true>;
type _QueryOneCodecRejectsUndefined =
  Assert<undefined extends Parameters<typeof queryOne>[3] ? false : true>;

/*
 * 7. THE CODEC SLOT IS A CODEC.
 *
 * Guards against "required, but widened to `unknown`", which would satisfy 3 + 4
 * while accepting anything at all.
 */
type _AllCodecIsARowCodec =
  Assert<AllParams[2] extends RowCodec<unknown> ? true : false>;
type _OneCodecIsARowCodec =
  Assert<OneParams[2] extends RowCodec<unknown> ? true : false>;

/*
 * 8. `bind` IS POSITIONAL-REQUIRED BUT ACCEPTS AN EXPLICIT `undefined`.
 *
 * Two halves, and they pull in opposite directions on purpose:
 *
 *  - Required is assertion 1 — an optional `bind` would make `length` `2 | 3`,
 *    which is what would let `db.all(sql, codec)` become a legal two-argument
 *    call with the codec landing in the wrong slot.
 *  - Accepting `undefined` is asserted here, and is what makes "required" livable
 *    for the ~90 bind-less queries: they write `undefined` rather than being
 *    pushed back toward an optional parameter.
 *
 * Note the asymmetry with assertions 3 + 4: `undefined extends` is TRUE here and
 * FALSE there. If the two ever agree, someone has copied the wrong shape across.
 */
type _AllBindAcceptsExplicitUndefined =
  Assert<undefined extends AllParams[1] ? true : false>;
type _OneBindAcceptsExplicitUndefined =
  Assert<undefined extends OneParams[1] ? true : false>;

/*
 * 9. THE RAW PATH EXISTS, IS NAMED, AND IS TYPED AS RAW.
 *
 * The required codec is only honest if there is somewhere legitimate to go when
 * the column set is decided at runtime. Without these, the pressure release is
 * an identity codec — `(row) => row` — which type-checks and proves nothing.
 * `allRaw` must return `SqlRow`s (not `T`), so a caller cannot get a decoded
 * type out of the undecoded door.
 */
type _AllRawReturnsRawRows = Assert<Exact<ReturnType<DatabaseContext['allRaw']>, SqlRow[]>>;
type _OneRawReturnsRawRow =
  Assert<Exact<ReturnType<DatabaseContext['oneRaw']>, SqlRow | null>>;

/*
 * 10. THE RAW PATH TAKES NO CODEC.
 *
 * `allRaw` is at most `(sql, bind?)`. Were it to grow a third parameter it
 * would become a second decoded path with none of the guarantees above.
 */
type _AllRawTakesAtMostTwo = Assert<Exact<AllRawParams['length'], 1 | 2>>;
type _OneRawTakesAtMostTwo = Assert<Exact<OneRawParams['length'], 1 | 2>>;

/*
 * 11. `all` AND `one` AGREE WITH EACH OTHER.
 *
 * They are two doors onto one rule; a change that loosens one and not the other
 * is the likeliest way for this to rot.
 */
type _AllAndOneTakeTheSameParameters = Assert<Exact<AllParams, OneParams>>;

/**
 * `export {}` is not needed (`moduleDetection: force`), but the type aliases
 * above are otherwise unreferenced and `noUnusedLocals` is off — they are
 * checked by being DECLARED, since instantiating `Assert<false>` is the error.
 * Re-exporting them makes that explicit to a reader and immune to a future
 * `noUnusedLocals`.
 */
export type CodecRequirementProof = [
  _AllArityIsExactlyThree,
  _OneArityIsExactlyThree,
  _AllCodecRejectsUndefined,
  _OneCodecRejectsUndefined,
  _QueryAllCodecRejectsUndefined,
  _QueryOneCodecRejectsUndefined,
  _AllCodecIsARowCodec,
  _OneCodecIsARowCodec,
  _AllBindAcceptsExplicitUndefined,
  _OneBindAcceptsExplicitUndefined,
  _AllRawReturnsRawRows,
  _OneRawReturnsRawRow,
  _AllRawTakesAtMostTwo,
  _OneRawTakesAtMostTwo,
  _AllAndOneTakeTheSameParameters,
];
