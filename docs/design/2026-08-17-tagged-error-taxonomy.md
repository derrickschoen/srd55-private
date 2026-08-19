# Tagged defect and refusal taxonomy (D274/D276/D278)

D274 replaced prose-only failures with structured data whose messages are
derived from their parameters, and D276 extended that work from one module to
everywhere. D278 subsequently separated the two semantic channels: expected
policy refusals return `Outcome<T>` with a member of the shared `Refusal` union
in `src/refusals/`; thrown tagged classes are reserved for defects. This
document is the mechanical rule set later lanes follow, plus the inventory that
says how much is left.

Zero dependencies. No error library and no `zod`. Refusals use the hand-rolled
`Outcome<T>` type; defects use a class extending `TypeError` (or `Error`) and
nothing else.

## 1. The shape

```ts
export class CatalogFieldLengthError extends TypeError {
  override readonly name = 'CatalogFieldLengthError' as const;
  constructor(
    readonly field: string,
    readonly maximum_length: number,
  ) {
    super(
      `Catalog field '${field}' must contain at most ${String(maximum_length)} characters.`,
    );
  }
}
```

Five rules, all load-bearing:

1. **`override readonly name = 'X' as const`** — a literal TYPE, not just a
   literal value. Mutating the tag to `''` or to another class's tag must fail
   `tsc`, not merely fail a test. `as const` on the initializer is what makes
   the declared type the literal; dropping it widens `name` to `string` and the
   mutant compiles.
2. **The constructor takes FACTS, never a message.** A parameter named
   `message`, or a parameter that exists only to be interpolated verbatim,
   defeats the point: the caller is still writing prose, just through a class.
   The one admitted exception is a `reason` that came from OUTSIDE the program —
   `CatalogDocumentJsonParseError` carries the engine's `JSON.parse` text
   because we did not write it and cannot derive it.
3. **Parameters are `readonly` parameter properties, in `snake_case`.**
   `snake_case` because the parameters are error DATA — the same vocabulary the
   RPC layer serializes (`src/worker/character-command-errors.ts`) — not
   ordinary local identifiers.
4. **Base class carries meaning.** `TypeError` means "the input is wrong".
   `Error` means "this build is wrong": exhaustiveness `never` arms, unreachable
   states. Do not promote a build bug to `TypeError` for uniformity.
5. **The message text is preserved byte-for-byte on migration.** A migration is
   not the moment to reword a refusal. Every existing test asserting the old
   substring must keep passing untouched before the assertions are strengthened.

## 2. Family versus instance — the grouping rule

The target is dozens of classes across the codebase, not hundreds. The rule
that gets there:

> **One class per GUARD FAMILY. One parameter per thing that varies. A new
> class only when the FACTS are different, never when only the wording is.**

Concretely, ask what the guard knows:

- Same facts, different wording → **same class, add a token parameter.**
  `CatalogFieldTypeError(field, expected)` covers sixteen throw sites whose
  only difference was "a string" versus "a list" versus "boolean". The
  `expected` token is a literal union; a `Readonly<Record<Shape, string>>`
  maps token to phrase, so adding a token without a phrase fails `tsc`.
- Different facts → **different class.** A bound (`minimum`, `maximum`) is not
  a shape; an enum (`allowed`) is not a bound; a cross-field disagreement has
  no field at all. These are four classes, not one class with four optional
  parameters.
- A sentence stem shared with one word swapped → **same class, `issue`
  parameter.** `CatalogTierTwoRecordError(document_number, issue)` formats both
  "contains a non-object record" and "contains an invalid versionKey".
- Two genuinely different sentences about the same subject → **two classes.**
  "Tier 2 description for K must be a non-empty string" and "Tier 2 has
  conflicting descriptions for K" share only `version_key`; folding them into
  one class with an `issue` parameter buys nothing and hides which happened.

A useful negative test: if a reader of the class name cannot predict the
sentence's SHAPE, the family is too broad.

### Presence and polarity as parameters, not classes

`CatalogFieldEnumError(field, allowed, presence)` appends " when present" for
`'optional'`. `CatalogFieldNullableIntegerRangeError` is a separate class from
`CatalogFieldIntegerRangeError` because "null or an integer from X through Y"
and "an integer from X through Y" are different CONTRACTS a caller may want to
branch on — not merely different wording. Prefer a parameter for a suffix;
prefer a class for a different contract.

## 3. Where defects and refusals live

All policy refusals live in the shared discriminated union under
`src/refusals/`. They are constructed by its exact factories, returned through
`Outcome<T>`, decoded at the client boundary, and rendered there from kind and
parameters. Do not add another thrown policy-refusal class.

**Match the module, do not centralize.** This codebase already declares ~70
defect classes and every one of them is co-located with the code that throws it
and exported from there (`ShareValidationError` in `src/sharing/schema.ts`,
`ContentIdentityCollision` in `src/catalog/content-registry.ts`). There is no
`src/errors/` and one must not be created: a central barrel would import from
every domain and invert the dependency graph.

Two placements, and the choice is mechanical:

- **Fewer than ~8 classes for a module** → declare them in the module file
  itself, above the first function that throws them. This is the existing
  convention and most modules stay here.
- **~8 or more** → a sibling `<module>-errors.ts` file, imported by the module.
  Precedent: `src/worker/character-command-errors.ts`. A 1,457-line parser with
  thirty-four classes bolted to its head is worse than two files.

Never a directory-wide `errors.ts` shared by unrelated modules in the same
folder — that is the central barrel again, one level down.

## 4. Naming

`<Domain><Subject><Failure>Error`, PascalCase, ending in `Error`. The domain
prefix is the module's subject (`Catalog…`, `Share…`, `Srd…`), not the file
name. Existing classes ending in `Refusal` (`SkillGrantRefusal`,
`LevelUpRefusal`) are migration targets: their data moves into `src/refusals/`
and their callers return `Outcome<T>`. New policy refusals are union arms, not
classes. Names ending in `Error` remain for defects.

Do not encode the guard's line, function, or field in the class name. The field
is a parameter; that is the whole idea. `CatalogFieldTypeError` is right;
`CatalogSpellLevelFieldTypeError` is a class that will be written 300 times.

### D278 classification of command payload reasons

`malformed_planned_subchoice` and `invalid_character_flavor` remain **DEFECTS**,
not policy refusals. Both describe malformed command input caught by
`CharacterCommandPayloadValidator`: the former reports an invalid planned
subchoice wire shape, while the latter reports a NUL in a flavor field. The UI
has no recovery branch for either reason; repository search finds them only in
the validator, the worker's generic `handler_error` translation, and transport
or integration assertions. The level-up UI does handle
`planned_subchoice_refused`, which is a different, well-formed policy refusal.

## 5. The tagged-defect test contract

Three assertions, in three places, and they do not overlap:

1. **At the guard** (the module's existing unit test): assert the CLASS and the
   PARAMETERS. `expect(error).toBeInstanceOf(X)` plus `toMatchObject({ field,
   maximum_length })`. Do not assert the message here.
2. **In `<module>-errors.test.ts`**: exactly one formatter test per class,
   asserting the exact `.message`, the `.name` tag, and the parameters that
   produced it. This is the ONLY place a sentence is spelled out.
3. **Nowhere else.** A message substring asserted at a guard is the coupling
   this design exists to remove.

Get the thrown value with a helper rather than `toThrow`, because `toThrow`
cannot see parameters:

```ts
function refusal(run: () => unknown): unknown {
  try {
    run();
  } catch (error) {
    return error;
  }
  return expect.fail('Expected a refusal, but the call returned.');
}
```

**Strictly stronger, never weaker.** An existing `toThrow('120 characters')`
becomes class + `{ field: 'name', maximum_length: 120 }` — which pins more, not
less. If a test asserts a message a DIFFERENT module owns (the content-identity
kernel's "names must not be empty" reaching through the catalog parser), leave
it as a message assertion and say so in a comment; it is not this module's
refusal to tag.

For a union-token family, add a loop over every token asserting the formatted
message contains no `undefined`. That is what catches a token added to the
union without a phrase in the map, in the case where the map is indexed rather
than switched.

## 6. Inventory — bare `throw new Error` / `throw new TypeError` per `src/` module

Counted 2026-08-17 on `lane/err-mig-1`. `src/simulation` does not exist on this
branch. "All throws" includes the ~1,030 sites already throwing one of the ~70
existing tagged classes, most of which still take a prose `message` and are a
SECOND migration wave (see §7).

| Module           | Bare sites | All throws | Dominant guard families |
| ---------------- | ---------: | ---------: | --- |
| `catalog`        | 174 | 225 | document/record shape, field type, enum membership, content-key form, tier conflicts |
| `commands`       | 174 | 195 | payload shape, revision/precondition, policy refusal, exhaustiveness |
| `grants`         |  94 | 114 | stored rule-JSON decode, choice configuration, slot generation bounds |
| `sharing`        |  75 | 266 | wire-schema shape, exact-keys, version compatibility |
| `ui`             |  69 |  73 | missing DOM node, unreachable screen state *(S7-04 lane owns these)* |
| `rules`          |  58 | 366 | SRD extract shape, missing bundled entry, exhaustiveness |
| `authoring`      |  49 | 198 | draft codec shape, publish preconditions, retarget resolution |
| `domain`         |  42 |  56 | value-object bounds, row-contract assertions |
| `queries`        |  35 |  48 | not-found, projection shape |
| `db`             |  21 |  55 | migration/bootstrap preconditions, candidate audit |
| `worker`         |  18 |  47 | handler payload shape, RPC mapping |
| `builder`        |  18 |  28 | step preconditions, choice refusals |
| `character`      |  12 |  13 | state-machine preconditions |
| `eligibility`    |  11 |  13 | selection constraints, not-found |
| `reports`        |   4 |   4 | projection shape |
| `access`         |   3 |   4 | projection shape |
| `backup`         |   3 | 183 | validation shape |
| `party`          |   2 |   4 | credential lease state |
| `pwa`            |   1 |   1 | registration precondition |
| `main.ts`        |   2 |   2 | boot precondition |
| **Total**        | **865** | **1,895** | |

Highest-density single files, for lane sizing: `sharing/wire-schemas/index.ts`
(65), `catalog/catalog-schema.ts` (64, **migrated**),
`catalog/source-catalog-records.ts` (48), `grants/grant-rule.ts` (30),
`domain/contracts/row-rules.ts` (28), `grants/configured-choice-rule.ts` (23),
`commands/add-source.ts` (19), `commands/character-command-executor.ts` (18).

## 7. The second wave, named now so it is not forgotten

Most existing tagged classes are **prose carriers**: `constructor(message:
string)` with a prefix bolted on, `this.name = '…'` assigned in the body rather
than declared as a literal type. `ShareValidationError` (177 sites),
`BackupValidationError` (179), `ClassResourceFormulaDecodeError` (12) are all
this shape. They satisfy "not a bare `TypeError`" and satisfy nothing else: the
caller still writes the sentence, and `name` is a plain `string` so the
`''`-mutant compiles.

They are out of scope for the bare-throw wave and in scope for D276 overall.
When a lane touches such a class it should, in the same commit, convert it to
the §1 shape rather than adding new prose-carrying call sites to it.

## 8. Worked example

`src/catalog/catalog-schema.ts` — 64 bare throws → 34 classes in
`src/catalog/catalog-schema-errors.ts`, with
`tests/unit/catalog/catalog-schema-errors.test.ts` holding one formatter test
per class and `tests/unit/catalog/schema.test.ts` strengthened from message
substrings to class + parameters. Every message byte-identical; all 40 existing
tests in that file passed before a single assertion was strengthened.
