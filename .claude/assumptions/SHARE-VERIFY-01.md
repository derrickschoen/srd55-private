# Assumption register — SHARE-VERIFY-01

Unit: verify the character-share-by-link feature, tidy adversarial test artifacts,
reach a ready-to-commit state. Risk class: **HIGH_RISK** (untrusted-input parsing
boundary + data-contract/versioned wire format).

Authoritative verification source (frozen at unit-plan time): **supervisor rerun
on this machine** of `npm test`, `npm run build`, `npx playwright test`.
Every count reported by any other agent is advisory only.

Environment: node v24.13.0, npm/Vite 7 / TypeScript 5.9 / Vitest 3.2 /
Playwright 1.61. Not ddev, not Docker.

---

## A1 — `npm test` executes the full vitest suite including all sharing specs
**Mark: proved.** Method: supervisor rerun, denominator checked by name, not just
the summary line. Raw evidence: `Test Files 45 passed (45)`, `Tests 343 passed
(343)`, exit 0, with these files enumerated in the run output:
`tests/integration/sharing/adversarial.test.ts (14 tests)`,
`tests/integration/sharing/round-trip.test.ts (7 tests)`,
`tests/unit/sharing/codec.test.ts (4 tests)`,
`tests/unit/sharing/catalog-key.test.ts (3 tests)`.
The 4 sharing files account for 28 tests, so the suite is not silently skipping
the feature under test.

## A2 — the producing agent's count claim (333/6-fail -> 343/0-fail) is accurate
**Mark: proved for vitest only.** Same evidence as A1. The 343/0 figure
reproduces exactly on an independent rerun. See A3 for where the wider "all
green" claim fails.

## A3 — the feature is "green" across the project's own gates
**Mark: DISPROVED.** Method: supervisor rerun of the gate the vitest run does not
cover. `npm run build` exits **2**:

```
tests/integration/sharing/adversarial.test.ts(65,17): error TS2322:
  Type 'Uint8Array<ArrayBufferLike>' is not assignable to type 'BlobPart'.
```

`npm test` cannot catch this: vitest transpiles without typechecking, so a green
vitest run is not evidence that the tree compiles. This is the concrete instance
of the recorded failure mode "a measurement that cannot come out wrong has not
measured anything" — the vitest denominator is real, but it was being read as
proof of a claim it does not address.
Load-bearing for: the "ready to commit" claim. Blocks completion until fixed.

## A4 — the browser-test command is `npm run test:e2e`
**Mark: DISPROVED.** Method: read `package.json`. No `test:e2e` script exists.
The scripts are `test`, `test:unit`, `test:browser` (`playwright test`), and
`test:all`. Verification used `npx playwright test` directly.

## A5 — Playwright results reflect current source, not the stale `dist/`
**Mark: proved.** Method: read `playwright.config.ts`. Its `webServer.command` is
`npm run dev -- --host 127.0.0.1 --port 4173` (Vite dev server, serves `src/`
directly), with `reuseExistingServer: false`. `dist/` is dated 14:39 and was NOT
refreshed by the failing build, but it is never served. So the browser run is
valid evidence about the current tree despite the red build.

## A6 — `docs/sharing/SCHEMA.md` is authoritative AND matches the implementation
**Mark: DISPROVED.** Method: read both. SCHEMA.md states the wire records have
fixed lengths ("Optional/default record fields occupy `null` positions so record
lengths remain fixed") and documents character=10, classes=7, sources=5.
`src/sharing/codec.ts` accepts variable lengths:
- `codec.ts:134` character `tupleOfLengths(root[2], [10, 11], ...)`
- `codec.ts:224-228` classes `tupleOfLengths(value, [7, 8], ...)`
- `codec.ts:243-247` sources `tupleOfLengths(value, [5, 6], ...)`
The extra trailing positions carry `placeholders` (`codec.ts:177`),
`subclassConfig` (`codec.ts:237`, `schema.ts:45`), and a source `name`
(`codec.ts:100`). None of the three appear anywhere in SCHEMA.md's object form or
wire form. The bug fixes grew the wire format without updating the document that
governs it, and did so in a way that contradicts the format's own stated
invariant, while leaving `version` at 1.
Load-bearing for: the data-contract claim. Unresolved — see the pending question.

## A7 — the count-limit test proves the count limit rejects otherwise-valid input
**Mark: DISPROVED as written (the test passes, but not for the stated reason).**
Method: read `codec.ts` ordering plus the fixtures. `assertListLimit` runs at
`codec.ts:161-176`, before the per-record `tupleOfLengths` calls at
`codec.ts:223+`, so an over-long list of malformed records still reaches the
count error. `adversarial.test.ts` builds positions 3 and 4 from valid records
but positions 5, 7, 8, 9, 10 from `() => []`. Those five cases therefore assert
the right message using records that could never validate. This is a weak test,
not a masking one — it would fail loudly, not silently, if the ordering changed.
Load-bearing for: test-strength claim. Fix is in scope (task 2b).

## A8 — `importCharacterShare` validates before touching the database
**Mark: proved.** Method: read `character-share.ts:595-600` — `validateShareDocument(input)`
is called before `db.transaction(...)` is entered. This is why the
`{} as DatabaseContext` fixture in `adversarial.test.ts` passes at all. It also
means a real connection can be substituted and the test can additionally assert
zero rows written, which is the property actually worth proving.
Load-bearing for: the "never mutates on invalid input" security claim, currently
proved by code reading only. Fix is in scope (task 2c).

## A9 — the two fixed product bugs have dedicated regression tests
**Mark: proved.** Method: enumerated the `it(...)` titles in
`tests/integration/sharing/round-trip.test.ts`. Bug 1 is covered by "applies
byte-faithful subclass config before regenerating configured slots" (line 285);
bug 2 by "keeps the shared name of a placeholder referenced only by a loadout"
(line 526). Both are in the 7 tests confirmed executing under A1.

## A10 — the vitest runner actually fails when the product code is broken
**Mark: proved, but the result exposed A12.** Method: negative control. Backed up
`src/sharing/codec.ts`, mutated line 89 from `row.config ?? null` to `null`
(dropping class config from the wire), ran the 28 sharing tests, restored.
Raw evidence: `Test Files 2 failed | 2 passed (4)`, `Tests 2 failed | 26 passed
(28)`. Restore verified by checksum — before and after both
`1122534d359abf66fa83c66e10ba69da8089c9e93bd53a64b8c6155973df6573`.
The assertions can fail, so "343 passed" is a real measurement. But only 2 of 28
sharing tests noticed a deliberately broken wire encoder — see A12.

## A11 — `npx playwright test` covers the sharing feature
**Mark: DISPROVED.** Method: supervisor rerun plus enumeration. Raw evidence:
`39 passed (3.7m)`, all in `php-feature-parity.spec.ts`, `planner.spec.ts`, and
`reports-and-print.spec.ts`. No browser spec constructs `createShareControls`,
clicks a share button, renders a QR code, or opens a share link. The 39 passes
are regression coverage for the rest of the app; they are not evidence about this
feature. Corroborated independently by codex.
Load-bearing for: nothing anymore — the browser gate must not be cited as
evidence that sharing works end to end.

## A12 — the sharing integration "round-trip" tests exercise the wire codec
**Mark: DISPROVED.** Two independent methods agree.
(1) Measurement: the A10 negative control broke the positional encoder and 26 of
28 sharing tests still passed. Only `codec.test.ts` noticed.
(2) Code reading (codex, confirmed by me): `round-trip.test.ts:257-275` and most
of `adversarial.test.ts` call `exportCharacterShare` and pass the resulting
OBJECT straight to `importCharacterShare`, never touching
`encodeShareFragment`/`decodeShareFragment`. They can pass with a broken
positional serializer, gzip transport, or base64url decoder.
Load-bearing for: the round-trip correctness claim, which was the whole point of
the feature. This is the single most important finding of the unit.

## A13 — `sourcePath` is a live field of the share contract
**Mark: DISPROVED — it is a defect, and it breaks real links.** Method:
executable probe (temporary test file, since removed), not code reading.
`sourcePath` is declared at `schema.ts:64`, accepted at `schema.ts:489`,
length-checked at `schema.ts:530-536`, and forms part of the duplicate-identity
key at `schema.ts:544`. It appears in NEITHER the 6-position selection encoder
(`codec.ts:102-108`) nor the decoder (`codec.ts:258`), is never read by
export/import, and no test mentions it. Probe results:
- PROBE A: `sourcePath: 'child-a'` is silently dropped by encode -> decode.
  Decoded selection came back as `{ref,ruleKey,ordinal,spellKey}`.
- PROBE B: two selections differing ONLY by `sourcePath` validate fine as an
  object, then the encoded link FAILS TO DECODE AT ALL:
  `Invalid character share: selections contains duplicate records`
  (`schema.ts:267` via `codec.ts:315` via `codec.ts:487`). A character that
  exports cleanly produces a link nobody can open.
Load-bearing for: correctness. Must be resolved before commit — implement it as a
real wire position or remove it from the contract.

## A14 — the shipped `docs/sharing/` artifacts describe the implemented format
**Mark: DISPROVED.** Method: executable probe (PROBE C) plus reading.
`docs/sharing/minimal-share-example.json` is REJECTED by the live validator:
`Invalid character share: character contains unknown field notes`. So the
worked example shipped alongside the authoritative schema is not a valid share
document. Codex additionally reports `format-comparison.md` still concludes that
trimmed keyed JSON should be retained although production uses positional JSON,
and `measure-formats.mjs` encodes a stale field order. The drift is not confined
to SCHEMA.md.

## A16 — the implementation round reached green on all three gates
**Mark: proved.** Method: supervisor rerun of every command after codex's
implementation, not codex's own numbers. Raw evidence:
- `npm test` -> `Test Files 45 passed (45)`, `Tests 347 passed (347)`
- `npm run build` -> full vite output, `BUILD EXIT: 0` (was exit 2)
- `npx playwright test` -> `39 passed (3.9m)`
Codex's claimed T6 negative control (2/28 -> 7/32 failing under the line-89
mutation) is NOT yet independently reproduced here. **unproved**, and
load-bearing for the claim that the integration tests now exercise the codec.
Re-run it before completion.

## A16b — CORRECTION to A16's negative-control status
**Mark: superseded, NOT verified — recorded so the distinction is not lost.**
A16 recorded codex's claimed negative control (2/32 -> 7/32 failing under the
line-89 mutation) as unproved and load-bearing. It was never independently
reproduced: later rounds rewrote the tests underneath it, so the specific
measurement is no longer reproducible even in principle.
What replaced it is stronger, not weaker: twelve real defects were found and
fixed, every test file was checksum-verified against tampering across three
producer runs, and the final suite is 367 vitest + 41 Playwright green with the
wire codec genuinely exercised by the integration round-trips.
"Superseded by better evidence" is not "verified". Recorded as such.

## A19 — a placeholder SOURCE can be upgraded in place by a later catalog import
**Mark: DISPROVED — and this was the supervisor's own assumption.**
Method: codex read-only investigation of `CatalogImporter`, dispatched with an
explicit instruction to verify rather than accept the claim.
I asserted, in the tolerance-plan spec, that extending the placeholder-spell
pattern to sources would let a later catalog import upgrade the stub in place
"the way placeholder spells are". **The current catalog importer imports SPELLS
ONLY.** It cannot install feat, species, background, or homebrew subclass
definitions, so there is today no mechanism by which a placeholder source could
ever be resolved.
Consequences accepted into the plan:
- the existing spell-catalog UI must NOT claim it resolves source gaps;
- the work must add a common attach/upsert/reconciliation seam across all five
  source tables, used by `CatalogImporter` and `seedClassProgressions` alike;
- missing standalone content stays character-local and detachable rather than
  becoming a permanent global stub.
Load-bearing for: the entire "degrade now, repair later" story. Had this shipped
unchecked, users would have accumulated permanently unresolvable stubs with a UI
implying they were fixable.

## A17 — a share document contains no database identifiers
**Mark: DISPROVED — this is a live data-corruption defect (D1).**
Method: code reading along the full path, plus reachability check.
`materializeSpellbookEntries` (`grant-rule-slot-generator.ts:401-432`) reads
wizard acquisitions out of `source.config` — the portable field — and resolves
them with `let spellVersionId = acquisition.spell_version_id`, PREFERRING the
raw row ID and consulting `spell_version_key` only when the ID is absent.
Export copies source config verbatim: `userConfig()`
(`character-share.ts:68-71`) only drops an empty object; it sanitizes nothing.
Reachable through the normal command path — `add-source.ts:218-219` stores
user-supplied `wizard_spellbook_acquisitions` unchanged, and
`tests/integration/grants/wizard-acquisitions.test.ts:102` uses exactly the
`{ spell_version_id: N }` form.
Consequence: a share link can carry the sender's row IDs, and the recipient's
generator resolves row N to whatever row N is in THEIR database — silently
acquiring the wrong spell. Contradicts the stated design intent that shares
carry only user choices, never database identifiers.
Load-bearing for: correctness AND the copyright-safety story. Must be fixed.
Surfaced by codex's test brainstorm at ~100% predicted failure; confirmed here.

## A18 — `ordinal: 0` is a valid selection address
**Mark: DISPROVED (D2).** Method: code reading. `schema.ts` validates ordinal
as `integer(row.ordinal, ..., 0, 1_000)`, accepting 0, while every generator
loop is one-based (`grant-rule-slot-generator.ts:153`). A document with ordinal
0 passes the contract and then dies at import with "resolved to 0 slots"
(`character-share.ts:781`). The validator should reject it up front.
Load-bearing for: input-contract tightness at the untrusted boundary.

## A15 — `spell_versions` owner registration is enforced on import
**Mark: DISPROVED (documentation overstates enforcement).** Method: codex code
reading, spot-checked by me. SCHEMA.md:63-67 says unregistered owners are
rejected. Share import validates via `isSpellVersionKey` (`schema.ts:193-202`),
which checks reverse-DNS grammar only (`catalog-key.ts:18-31`). The owner
registry is consulted only by `homebrewSpellKey` (`catalog-key.ts:40-60`), which
share import never calls. A syntactically valid unknown owner is accepted.
Load-bearing for: a security/copyright-safety claim in the authoritative doc.
Unproved whether this is intended; the doc and code must agree either way.
