# DISPATCH P1-CB — Codeberg/Gitea storage adapter (M, MINT-FREE, wt/party, PLAYWRIGHT_PORT=44513)

THE BINDING PLAN is docs/design/2026-08-01-party-storage.md: section 4 (one
typed storage port and three adapters — the `StorageResult`/`WriteCondition`
unions, the single `RepositoryRevision` concept, and the "not claimed here"
paragraph at the end), section 5 (read-token-write and delete semantics),
section 6's "Checkable seam" subsection, section 9 (failure and honesty
table), section 13 (test strategy), section 14's `src/party/storage/codeberg.ts`
row, and the unit row **P1-CB in section 12**. Implement exactly P1-CB.

The unit row, verbatim:

> | **P1-CB — Codeberg adapter spike/implementation** | M | No | Gitea contents operations and SHA mapping | Same adapter gate, independently from GitHub despite dialect similarity |

"Same adapter gate" is P1-GH's exit criterion, verbatim: **"Every request and
result matches sanitized fixtures; conflict refuses; no live test"**. Both
halves bind you, and so does "independently from GitHub": see ISOLATION below.

## AMENDMENTS (these WIN over the doc)

- **D146 (2026-08-01)** postdates the design and CLOSES section 15's open
  questions. It takes the recommended default on all of them, and one is
  material to you: **default branch only** — OQ-5 option A, no app-managed
  branch. You implement NO branch create/select/protection call. Where a
  Gitea contents call takes an optional branch/ref and P0's
  `RepositoryConfig` does not carry one, OMIT it and pin, in the fixture's
  provenance comment, the documented statement that omission means the
  repository's default branch. If you cannot establish that from
  documentation, STOP and report — do not assume it.
- D146 also confirms v1 ships library AND characters and that credentials
  live in sessionStorage. Neither changes your code: you never see a raw
  token (section 6) and you never see a document (section 4 — the port
  "knows nothing about characters, libraries, import, or OPFS").
- D145's supervisor-proven dialect facts stand: Codeberg is Gitea,
  `codeberg.org/api/v1`, `contents/{path}`, blob `sha` as the optimistic
  concurrency token, `access-control-allow-origin: *`. Everything else about
  the dialect is UNPROVEN — see FIXTURES.
- No other ruling postdates the doc. D146 is the newest entry in
  `.claude/decisions.md`.

## MINT-FREE

Section 12 marks this unit **Mint? No**. You mint NOTHING: no DB migration,
no wire version, no character-backup document version, no character-state
snapshot schema version, no new registry entry of any kind. Every frozen
artifact on the lane-state list shows an EMPTY diff against your merge base.
If your work appears to need a mint, that is a finding — STOP and report it.

## PRECONDITIONS (check first; a failure here is a correct outcome)

`src/party/storage/contracts.ts` must already exist with the section-4 port,
the seven-arm `StorageResult`, `WriteCondition`, `CredentialState`, the
`RepositoryRevision`/`RepositoryPath` brands, `RepositoryConfig`, the
credential-lease type, and the recorded-fixture/mock-fetch harness. That is
**P0**, and it is not yours. If it is absent or incomplete, STOP and report —
it gates this unit. Do NOT author, widen, or "temporarily" stub those types;
do not add a `Forge` member; do not touch `create-storage.ts` beyond what P0
already dispatches to (if P0's factory has no `codeberg` arm wired to your
class, report that as the one contract change you needed and stop).

`src/party/storage/github.ts` and `gitlab.ts` are P1-GH and P1-GL. Not yours.
`src/party/credentials.ts` is P2. Not yours. No UI, no `_headers` change (P6),
no `party_document_states` table (P3), no publish/refresh orchestration (P4).

## ARCHITECTURE (non-negotiable)

1. One new source file, `src/party/storage/codeberg.ts`, exporting the
   Codeberg adapter class only. It implements P0's `PartyStorage` and imports
   from `contracts.ts` and the credential-lease type — nothing else from
   `src/party/`.
2. **ISOLATION.** The adapter does not import, extend, subclass, wrap, or
   share a base/helper module with the GitHub adapter, and does not add one.
   The exit says "independently from GitHub despite dialect similarity" — the
   similarity is the trap, not the shortcut. If P1-GH has already merged and
   the duplication looks wasteful, that is a later refactor unit gated on both
   fixture suites being green; it is not this unit's licence.
3. Exactly one private request wrapper performs `fetch`. It applies the
   credential lease's headers, logs nothing (no request, header, body, or
   thrown object), never puts a token in a URL or a body, and never rethrows a
   provider object. Every arm of every switch over `kind`, `CredentialState`,
   and `WriteCondition` is exhaustive with no `default:`. Response bodies
   start as `unknown` and are narrowed by hand — no cast into a shape.
4. Operations: list a directory prefix, read one path, create (`create-only`),
   update (`replace(expected)`), delete (requires an observed revision).
   Update and delete are UNREPRESENTABLE without a revision (section 5) —
   enforce that in the type, not with a runtime check.
5. `RepositoryRevision` wraps the **blob** `sha` from the contents response,
   not a commit sha and not a tree sha. Section 4: "Provider tokens never
   escape the adapter as provider-shaped data" — no Gitea-shaped field reaches
   a caller.
6. Bytes in, bytes out. The contents API is base64; `Uint8Array` must survive
   the round trip byte-for-byte including multi-byte UTF-8 and a trailing
   newline. `btoa`/`atob` are latin1 and will silently corrupt — whatever you
   use, the hostile-string fixture proves it.
7. Path segments are encoded individually (Gitea keeps `/` as a path
   separator in `contents/{path}`, unlike GitLab's encoded form — pin which,
   with provenance). A path that cannot be represented safely is refused
   before any request.
8. D33 applied to storage, per section 9: `retryAt`, `limitBytes`,
   `observedBytes`, and `byteLength` stay `null` unless the response proves
   them. Do not port GitHub's `x-ratelimit-*` header names into this adapter
   on the assumption Gitea sends them. Do not invent a size limit. A 404 that
   cannot distinguish hidden-private from deleted is
   `not-found/unknown` — never a fabricated diagnosis.

## FIXTURES — the honesty rule for this unit

Section 4 is explicit: list pagination, public-repository metadata shape,
create/update/delete methods and bodies, success bodies, conflict statuses,
**the authentication header scheme**, rate-limit headers, masked-private
behaviour, and size refusals are "not claimed here", and "until the sanitized
fixtures pin an exact case, the adapter must not guess it."

So: build `tests/fixtures/party-storage/codeberg/` by hand from Gitea's
published API documentation, one fixture per case, each carrying a provenance
comment naming the documented endpoint and field it encodes. Tokens are
synthetic sentinels. Any live recording is anonymous, read-only, out-of-test,
and hand-reviewed before it becomes a fixture — **never a real token, never a
test that reaches the network, and never a fixture generated from your own
adapter's output** (section 13). If a case cannot be established without
guessing, leave that arm unimplemented, name it in your report as UNPROVEN,
and stop rather than shipping a plausible invention. An honest "I could not
prove the 409 body" is a correct outcome; a guessed one is the failure this
whole design exists to prevent.

If P0 ships a shared cross-adapter contract suite, run Codeberg through it
UNCHANGED. Needing to edit it to accommodate Gitea is a finding — report it.

## TESTS AND NEGATIVE CONTROLS

New tests under `tests/unit/party/` (add `tests/integration/party/` only if a
case genuinely needs the harness). No browser spec belongs to this unit — the
Chromium journeys are P5 and the CSP artifact test is P6 — so your spec table
is expected to be all-unaffected, with that reason stated. Run the full
Playwright suite on **PLAYWRIGHT_PORT=44513** regardless.

Name a control per load-bearing assertion, each with the exact test name that
fails when the mutation is applied:

| Assertion | Negative-control mutation | Control name |
|---|---|---|
| Update and delete carry the observed blob sha | Drop `sha` from the PUT/DELETE body | **CB-NO-UNCONDITIONAL-WRITE** |
| A stale sha refuses and is not retried | Re-read and retry once after conflict | **CB-CONFLICT-NO-LWW** |
| Create cannot replace an existing path | Fall back to update on create collision | **CB-CREATE-ONLY-REFUSES** |
| Revision is the blob sha | Return the commit sha instead | **CB-REVISION-IS-BLOB-SHA** |
| Bytes survive base64 exactly | Swap in the latin1 `btoa`/`atob` path | **CB-BASE64-ROUNDTRIP** |
| Path segments are encoded; hostile paths refused | Interpolate the raw path | **CB-PATH-ENCODING** |
| 401/403 map to named credential states | Map an auth failure to `network-failed` | **CB-CREDENTIAL-STATE** |
| Unproved facts stay null | Default `limitBytes`/`retryAt` to a constant | **CB-NO-INVENTED-LIMITS** |
| Undiagnosable 404 stays `not-found/unknown` | Diagnose it as `not-found/repository` | **CB-NOT-FOUND-UNKNOWN** |
| Too-large never truncates or retries | Slice or recompress the bytes | **CB-NO-TRUNCATION** |
| The sentinel token appears only in the outgoing header | Include it in a returned result, thrown error, or log | **CB-TOKEN-ONLY-IN-HEADER** |
| No test reaches the network | Leave one request unmocked — the guard throws with URL and test name | **CB-NO-LIVE-NETWORK** |
| The adapter is independent of GitHub | Import from `github.ts` | **CB-ADAPTER-ISOLATION** |

`CB-NO-UNCONDITIONAL-WRITE`, `CB-CONFLICT-NO-LWW`, `CB-NO-TRUNCATION`,
`CB-NO-LIVE-NETWORK` and `CB-TOKEN-ONLY-IN-HEADER` are the Codeberg instances
of the section-13 rows PARTY-NO-UNCONDITIONAL-WRITE, PARTY-CONFLICT-NO-LWW,
PARTY-NO-TRUNCATION, PARTY-NO-LIVE-NETWORK and PARTY-TOKEN-NEVER-TRAVELS —
the full sentinel sweep across exports, share URLs, DB bytes, logs and sheet
JSON stays P2's.

EXIT (unit row P1-CB): every request and result matches the sanitized
fixtures; conflict refuses; no live test; the adapter is independent of the
GitHub adapter; every unproven dialect fact is either pinned by a
documentation-backed fixture or reported as UNPROVEN rather than guessed.
