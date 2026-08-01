# DISPATCH P1-GH — GitHub contents adapter behind the storage port (M, MINT-FREE, wt/party, PLAYWRIGHT_PORT=44511)

THE BINDING PLAN is docs/design/2026-08-01-party-storage.md (committed on
wt/party as 9713853): section 4 in full — the port types, the exhaustive
`createPartyStorage` dispatch, the GitHub dialect bullet ("GitHub calls
`api.github.com` contents endpoints and maps their blob `sha`"), and the
unclaimed-facts paragraph that closes it — plus section 5 (conflict and
delete semantics), section 6's "Checkable seam" subsection (adapter half
only), the section 9 rows for network-failed / rate-limited / unauthorized /
not-found / conflict / too-large / post-write-token-unknown, unit row P1-GH
in section 12, and the section 13 rows named below. Implement exactly P1-GH.
P1-GL and P1-CB are NOT yours and no adapter imports another adapter. P2
(vault), P3 (`party_document_states`), P4 (publish/refresh), P5 (screen),
P6 (CSP `_headers`) are NOT yours — no UI, no schema, no `public/_headers`.

GATE (check first, before writing anything): P0 must be merged into this
worktree — `src/party/storage/contracts.ts` with the brands, the seven-arm
`StorageResult`, `WriteCondition`, the `PartyStorage` interface, and the
recorded-fixture/mock-fetch harness. If it is absent, or if it is present
but the port as written cannot express something below, STOP and report the
finding. Do NOT author or edit the port; you consume it.

AMENDMENTS (these WIN over the doc). D146 closes five of section 15's open
questions, so section 15 is no longer an open list for them:
- OQ-2 → v1 is library AND characters. The adapter ships full
  list/read/create/update/delete; a read-only GitHub adapter is a
  re-dispatch.
- OQ-5 → default branch only. This SUPERSEDES section 3's "requires an
  existing repository and an explicit branch/ref" and section 8's "optional
  branch/ref": the adapter resolves the repository's default branch (that
  discovery request is itself fixture-pinned per section 8) and pins it in
  the locator. No branch chooser, no app-created branch, no branch
  protection API.
- OQ-4 → one repo per party, top-level `library/` and `characters/`. No
  configurable subdirectory in path construction.
- OQ-1 → librarian writes `library/`, each player writes only their own
  character path. That is an app convention enforced above you; the adapter
  enforces no path ownership and refuses no path on ownership grounds.
- OQ-3 → sessionStorage vault. P2 owns it. You accept P0/P2's
  `CredentialLease` (including its anonymous arm) and never a raw string.
- D144: no Worker, no OAuth, no server-side secret — this is a browser
  `fetch` client, with no proxy, no build-time constant, and no
  same-origin relay.
- D145 supervisor-proved facts you MAY rely on: `api.github.com` answers a
  cross-origin browser call with `access-control-allow-origin: *`, and
  GitHub's dialect is `contents/{path}` returning a blob `sha` that is taken
  back on write for optimistic concurrency. NOTHING else about GitHub is
  proven — see scope 2 and 3.

MINT-FREE. You own no registry number. Section 12 is explicit: "Storage
units do not get to mint an envelope merely because their prerequisite
document is late." No migration, no share-wire version, no backup document
version, no character-state snapshot version, no `db/schema/` file, no
`src/db/migrations.ts` line — every frozen artifact shows an EMPTY diff vs
your merge base. DOC-C/DOC-L being unbuilt is not a licence to invent a
payload; this unit never sees a document, only bytes and paths.

## Scope

1. Files: create `src/party/storage/github.ts`,
   `tests/fixtures/party-storage/github/**`, and unit/integration tests under
   `tests/unit/party/` (and `tests/integration/party/` if a fixture journey
   needs a real transaction — it should not). Register the adapter in P0's
   `createPartyStorage` GitHub arm only if P0 left it unimplemented.
2. FIXTURE PROVENANCE — the hard rule of this unit. Every fixture is
   HAND-AUTHORED from GitHub's published REST reference and carries a header
   naming the endpoint, the documented source, and the date it was read.
   You may NOT capture live traffic (the sandbox has no forge token and
   section 13 says "No unit, integration, or browser test contacts a live
   forge—ever"). You may NOT generate a fixture from your own adapter's
   output — that is regenerating an expectation from our own output. You may
   NOT reach for the `*.live-test.ts` opt-in path (excluded from the default
   set at vitest.config.ts:30) for anything touching a forge origin; adding
   one is an escape hatch and a re-dispatch.
3. UNCLAIMED FACTS. Section 4 states these are "not claimed here": "the
   exact list pagination, public-repository metadata shape,
   create/update/delete methods and bodies, success bodies, conflict
   statuses, authentication scheme for GitHub and Codeberg, rate-limit
   headers, masked-private-repository behavior, and provider size refusals".
   Where the published reference settles a case, pin it in a fixture and
   cite it. Where it does not, the adapter must NOT guess: list it as an
   OPEN-FACT in your report with the call site that needs it, and leave the
   corresponding derived value null under D33. An invented status code,
   header name, or byte limit is the failure mode this unit exists to avoid.
4. Operations. `list(prefix)` over `library/` and `characters/` (state and
   fixture-pin the pagination behaviour or declare it OPEN-FACT; a summary
   whose `revision` a list response does not establish stays null, per the
   `StoredObjectSummary` comment). `read(path)` → bytes + `sha` as
   `RepositoryRevision`. `write` with `create-only` (no sha in the body,
   must refuse an existing path) and `replace(expected)` (sha always sent).
   `delete(path, expected)` requires the token from an exact read.
5. BYTES ARE EXACT. base64 encode/decode round-trips the document bytes
   byte-for-byte: no BOM added or stripped, no trailing-newline
   normalization, no re-serialization, no UTF-16 detour that mangles
   astral-plane or lone-surrogate input. Prove it with a hostile-string
   payload fixture and a hash of the original bytes. The adapter never
   parses, validates, or inspects the body — section 7 step 2: "Storage does
   not inspect document internals."
6. RESULT MAPPING. All seven `StorageResult` arms have at least one GitHub
   fixture. Exhaustive `switch` on `kind`, no `default:` arm, no `any`;
   every response body starts as `unknown` and is narrowed by a validator,
   never asserted into a shape. `unauthorized` carries a `CredentialState`
   chosen honestly — a response that does not distinguish the three cases
   maps to `invalid-expired-or-revoked`, and a 404 that could mean
   hidden-private or deleted stays `not-found/unknown`, never a fabricated
   credential diagnosis.
7. CONFLICT REFUSES (section 5). On a stale-sha response the adapter returns
   `conflict` with `expected`/`actual` populated only from proved values and
   null otherwise, performing at most one safe read to populate `actual`. No
   retry, no re-read-then-force, no unconditional fallback API, no
   last-write-wins. A write whose response establishes no new sha returns
   `WriteReceipt.revision = null` (section 9's last row) rather than echoing
   the sha you sent.
8. CREDENTIAL SEAM (section 6). The token reaches the wire only through the
   lease applying a header. Never in a URL, query string, request body,
   commit message, thrown object, or any `console`/error argument — the
   fetch wrapper logs nothing. The anonymous lease path is exercised by a
   public-read fixture. Commit messages are the fixed strings from section 3
   (`Publish party character document` / `Publish party library document`)
   taken as a closed union from the caller; the adapter never interpolates a
   remote or character name into one.
9. SIZE (section 9). `too-large` carries proved `observedBytes`/`limitBytes`
   or explicit nulls. Never truncate, recompress, chunk, or partially
   upload.

Playwright: this unit is expected to add NO browser spec — P5 and P7 own the
Chromium journeys and the cross-origin route interception. The spec TABLE
still covers all existing spec files with the reason each is unaffected, and
you still run the full suite on PLAYWRIGHT_PORT=44511.

NEGATIVE CONTROLS — one named mutation per load-bearing assertion, each with
the exact test name that fails. Required at minimum, using section 13's
names: **PARTY-NO-UNCONDITIONAL-WRITE** (drop the sha from the update body);
**PARTY-CONFLICT-NO-LWW** (on conflict, re-read and rewrite); **PARTY-FORGE-
EXHAUSTIVE** (add a `default:` arm or an unhandled `StorageResult` kind);
**PARTY-CREDENTIAL-STATE** (map an unauthorized response to
`network-failed`); **PARTY-NO-TRUNCATION** (slice the bytes at the size
limit); **PARTY-TOKEN-NEVER-TRAVELS**, adapter half (put the sentinel in the
URL, body, commit message, or a log argument); **PARTY-NO-LIVE-NETWORK** (an
unhandled request to `api.github.com` must throw naming the URL and the
test). Plus one new to this unit: **PARTY-BYTES-EXACT** (normalize the
trailing newline or round-trip through a lossy string decode) — declare it
in your report so it can be added to the doc's table.

EXIT (section 12 unit row P1-GH, quoted): "Every request and result matches
sanitized fixtures; conflict refuses; no live test."
