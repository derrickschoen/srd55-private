# DISPATCH P1-GL — GitLab storage adapter (M, MINT-FREE, wt/party, PLAYWRIGHT_PORT=44512)

THE BINDING PLAN is docs/design/2026-08-01-party-storage.md: section 4 (the
one typed port, the three-adapter split, the `RepositoryRevision` concept),
section 5 (read-token-write, delete, no last-write-wins), section 9 (the
failure/honesty table), the unit row **P1-GL** in section 12, and the
negative-control rows in section 13. Implement exactly P1-GL. P1-GH and
P1-CB are NOT yours — do not read from, import, or "generalize" them; the
three adapters run in three parallel lanes and section 12 says no adapter
imports another. P0, P2 (credentials), P3, P4, P5, P6, P7 are not yours.

EXIT, quoted verbatim from the section 12 unit row P1-GL:
> Same adapter gate, including create/update/delete and masked-not-found
> fixtures

"Same adapter gate" is the P1-GH row's exit criteria, quoted verbatim:
> Every request and result matches sanitized fixtures; conflict refuses; no
> live test

MINT-FREE. You mint NOTHING: no migration, no wire version, no backup
document version, no character-state snapshot version, no new format. The
design says it in section 12 and it binds you: "Storage units do not get to
mint an envelope merely because their prerequisite document is late." If your
work appears to need a mint, that is a finding to report, not a number to
take.

AMENDMENTS TO THE BINDING PLAN (D146, 2026-08-01, postdates the doc and WINS):
- D146 closes section 15's open questions 1-5 as the design's recommended
  options. Two of those closures overrule bound text:
  - **Section 3 and section 8's "explicit branch/ref" is overridden**: D146
    takes "default branch only". There is no user-chosen ref and the app
    creates no branch. GitLab's file API still needs a ref on read and a
    branch on write, so the adapter still takes that value from
    `RepositoryConfig` — but it is the repository's DEFAULT branch, resolved
    from proved project metadata. **Never fall back to a literal `main` or
    `master`.** An unresolved default branch is D33 absence, surfaced as an
    honest arm; it is not a guess.
  - Section 15 OQ-3 is settled: sessionStorage plus an explicit Forget
    control. That is P2's build; it constrains you only in that the adapter
    receives P2's `CredentialLease`, never a raw token string and never a
    serializable token object (section 6).
- D145 fixes your dialect: `repository/files/{path}`, `last_commit_id`,
  `PRIVATE-TOKEN` header. D144 forbids any server-side helper — no proxy,
  no Worker, no CORS shim; the browser calls gitlab.com/api/v4 directly.
- Nothing in D139/D81/D82/D62 touches this unit: the adapter carries bytes
  and paths and knows nothing about characters, libraries, or import.

## Prerequisite gate (check FIRST, before writing a line)

P0 (`src/party/storage/contracts.ts`, the exhaustive `create-storage.ts`
dispatch, the recorded-fixture loader and the external-network guard under
`tests/fixtures/party-storage/`) is your declared dependency in section 12's
edge list. At my last check none of it existed on main. If it is absent from
your merge base, **STOP and report** — do not re-declare the port, the
brands, the result union or the fixture harness locally. A second port is a
guaranteed collision with the P0 lane and with your two sibling adapters.
Precedent: FF-A's EXP-URL gate.

`src/party/storage/create-storage.ts` is a three-lane shared file. Replace
ONLY the `case 'gitlab':` arm. Do not touch the github or codeberg arms, do
not add a `default:`, and if P0 shipped no factory at all, do not create it —
report that instead.

## Scope

1. `src/party/storage/gitlab.ts` implements P0's `PartyStorage` for
   `api/v4`: list under a prefix, read, write with both `create-only` and
   `replace(expected)`, and guarded delete. Untrusted JSON enters as
   `unknown` and is narrowed by a schema; nothing is asserted into a type.
   No `any`, no `default:` arm on `kind`, `CredentialState`, `WriteCondition`
   or `Forge`.
2. **`last_commit_id` is the ONLY source of `RepositoryRevision`.** A GitLab
   file response carries several hash-shaped members; picking the wrong one
   compiles, reads fine, and silently destroys optimistic concurrency.
3. **Bytes and revision must come from ONE response.** Do not read the
   revision from one call and the content from another — the pairing would
   be racy and the token could describe a version you never held.
4. Path and project encoding: the project identifier and the file path are
   both URL-encoded (`group/sub/project` and `characters/ash--<id>.json`
   both contain slashes). Prove nested groups and subdirectories, and prove
   you do not double-encode.
5. Anonymous mode (section 8): with no credential lease the request carries
   NO `PRIVATE-TOKEN` header — not an empty one, not a placeholder.
6. Masked not-found (your row names it explicitly): where GitLab answers a
   private-or-absent object identically, the result is
   `not-found` with `at: 'unknown'`. Never fabricate a credential diagnosis
   out of an ambiguous status; section 6 forbids exactly that.
7. Failure mapping follows the section 9 table: named `unauthorized`
   credential states, `rate-limited` with `retryAt` null unless the response
   proves it, `network-failed` with an honest `writeState`, `too-large` with
   null bytes/limit unless proved. An answered request is never
   `network-failed`.
8. The adapter's fetch wrapper logs nothing — not the request, not headers,
   not the response body, not a thrown object (section 6).

## Fixtures — the honesty constraint that decides this unit

Section 13: no test ever contacts a live forge, and "manually recording a new
fixture is a separate implementation spike, never a test mode." Section 4
lists what is explicitly NOT claimed and must not be guessed: list
pagination, public-repository metadata shape, create/update/delete methods
and bodies, success bodies, conflict statuses, rate-limit headers,
masked-private behaviour, and provider size refusals.

Therefore every fixture file carries a provenance header naming ONE of:
(a) the exact command and date it was recorded against a real forge, or
(b) the exact official GitLab API documentation anchor it was transcribed
from. **Never the adapter's own output** — that is the regenerated-expectation
failure wearing a new hat. A fixture whose shape you can establish neither
way is a STOP-and-report, not a hand-wave: say which case you could not pin.
Add a test that fails when any fixture in your directory lacks provenance.

If the fixture spike turns up a real response that maps to none of the seven
result arms, do NOT force-fit it — report it as a port gap for P0. Forcing it
into `network-failed` or `conflict` would look like a safe refusal while
hiding a real error.

Byte/base64 conversion: if P0 exposes byte helpers, use them.
`src/sharing/codec.ts:1128-1150` has module-private base64url helpers for URL
fragments — a different alphabet and a different purpose; do not import them
and do not silently triplicate a decoder across three adapter lanes. If you
must write one locally, say so in the report as a cross-lane dedup finding.

## Negative controls — one per load-bearing assertion, each with the exact
## failing test name

Section 13 already names the ones you inherit; you own these instances of
them plus the GitLab-specific ones. For EACH, apply the mutation, run it,
paste the test name that went red, and revert:

- **PARTY-GL-LAST-COMMIT-ID** (new, yours) — map `blob_id` (or any other
  hash member) instead of `last_commit_id`; the conflict fixture must stop
  refusing and the test must fail.
- **PARTY-GL-DEFAULT-BRANCH** (new, yours, from the D146 amendment) —
  hardcode `'main'`; a fixture whose default branch is not `main` must fail.
- **PARTY-GL-PATH-ENCODING** (new, yours) — encode with `encodeURI` instead
  of per-segment component encoding; the nested-group and subdirectory URL
  contract must fail.
- **PARTY-GL-ANONYMOUS-HEADER** (new, yours) — send `PRIVATE-TOKEN: ''` when
  no lease exists; the anonymous public-read header-absence assertion must
  fail.
- **PARTY-GL-MASKED-NOT-FOUND** (new, yours, named by your exit row) — map
  the masked response to `unauthorized`; the not-found/unknown assertion must
  fail.
- **PARTY-NO-UNCONDITIONAL-WRITE** (section 13) — omit the expected token on
  update or delete; the request contract must fail.
- **PARTY-CONFLICT-NO-LWW** (section 13) — retry the write without a
  re-read; the call-count and preserved-bytes assertions must fail.
- **PARTY-CREDENTIAL-STATE** (section 13) — map a proved unauthorized
  response to `network-failed`; the exact-union/label test must fail.
- **PARTY-NO-LIVE-NETWORK** (section 13) — let one request reach the real
  guard unhandled; it must throw naming the URL and the test.
- **PARTY-FORGE-EXHAUSTIVE** (section 13) — add a `default:` arm to your
  `kind` dispatch; the source/type probe must fail.

## Playwright

Run the full suite on PLAYWRIGHT_PORT=44512 and give the Spec | Affected |
Why table for every spec in lane-state.md's list. The expected honest answer
is that P1-GL affects none of them: no route, no screen, no CSP (that is P6),
no browser-reachable code path changes in this unit. If you find yourself
needing to touch a browser spec, that is a scope finding — report it. Note
that the fetch/network guard must live inside your test files: a vitest
`setupFiles` addition is a config edit and is forbidden.
