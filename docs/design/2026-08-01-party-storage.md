# PARTY-0 — shared party storage over user-owned repositories

Status: design only, 2026-08-01. This document makes no source, test, migration,
configuration, or repository change.

## 1. Binding boundary and load-bearing model

The governing decisions were re-read in `.claude/decisions.md` before this
design:

- D145 requires a table to share a library and characters through a repository
  the table owns on GitHub, GitLab, or Codeberg, public or private, using a token
  pasted by the user. It requires one storage port, three adapters, inside v1.
- D144 keeps the app on Cloudflare Pages as static assets. There is no Worker,
  OAuth callback, token exchange, or server-side secret.
- D139 makes the portable character document carry that character's own
  non-SRD reference closure and defines a separate whole-or-selected library
  document. **Those two documents are the repository file bodies. PARTY-0 does
  not define a wrapper, manifest payload, patch format, or third serialization.**
- D81/D82 make external content converge by derived identity. Re-importing the
  same content creates no content rows and only non-trivial matches require the
  adoption review. D62 remains independently true: importing a character makes
  a fresh character clone.
- D59 is an authorization rule for what this project redistributes. A party
  repository is the user's redistribution channel; the app must not imply that
  content is licensed merely because it can upload it.
- D4, D33, D108, D109, and D110 govern hostile strings, honest absence/failure,
  accessible interaction, the Chromium-only tested browser matrix, and the
  pre-alpha posture. Structural replacement is cheap; credential exposure and
  silent remote overwrite are not.
- D138's usage-list idea is useful here as a read model: repository observation
  state should index where a local character came from or was published, not
  become character truth and not silently retarget a character.

The load-bearing insight is that this is **file distribution, not sync**.
Almost every published object is single-writer: one player owns a character and
one designated person writes the relatively quiet party library. The repository
distributes complete export snapshots at stable paths. Existing convergent import reconciles
content. Therefore there is no CRDT, field merge, background bidirectional sync,
last-write-wins policy, or server.

```text
OPFS SQLite (truth) ── export existing document ──> repository file
       ^                                             |
       |                                             | explicit refresh
       └──── preview + existing import/clone <───────┘
```

## 2. Assumptions proved from the current tree

These are observations, not claims that the whole D139/D82 portability path is
already complete.

1. **The portable character document is produced and consumed through one
   existing backup boundary.** `CharacterBackupDocument` currently contains the
   header, root character, character tables, references, and carried spell
   definitions (`src/backup/character-backup.ts:104-113`).
   `exportCharacterBackup` selects the local aggregate and constructs and
   validates that document (`src/backup/character-backup.ts:1571-1681`), while
   `importCharacterBackup` validates first and restores content, references, a
   new character, and its rows in one transaction
   (`src/backup/character-backup.ts:2845-2905`). The Worker exposes those exact
   functions as `backup.exportCharacter` and `backup.importCharacter`
   (`src/worker/handlers/backup.ts:75-86`), the typed client consumes them
   (`src/backup/client.ts:8-39`), and the character-list controller serializes
   the export as indented JSON and parses an imported JSON file
   (`src/ui/screens/character-list/import-backup-controls.ts:135-156`). PARTY
   publishing must call this document producer; refresh must call its eventual
   plan/commit importer, not duplicate either SQL path.
2. **The current character document is not yet D139-complete, and a separate
   library document is not present.** The current carried-definition member is
   only `spell_definitions` (`src/backup/character-backup.ts:100-113`), and its
   selector includes only referenced user/import spell versions and their child
   rows (`src/backup/character-backup.ts:1481-1568`). No `LibraryExportDocument`
   or library export/import implementation exists under `src/`. PARTY's write
   UI must remain gated on the D139 document units described in section 12; it
   must not publish today's incomplete document under a misleading “complete”
   label.
3. **D62 cloning is the current import behavior.** Generic portable insertion
   removes the source `id` before INSERT
   (`src/backup/character-backup.ts:1755-1773`), character import inserts the
   root before its children (`src/backup/character-backup.ts:2861-2873`), and
   source-instance UUIDs are regenerated
   (`src/backup/character-backup.ts:2017-2041`). A refreshed remote character
   can therefore be imported as a newer clone; it cannot silently update a
   previously imported local character.
4. **CI-2a's resolver is implemented as a closed result, but production
   portability call sites are not wired to it yet.** Exact stored keys and
   byte-identical derived-primary self-matches adopt without review; metadata
   conflicts, aliases, compatible fingerprints, and SRD fingerprint fallbacks
   require review; missing and ambiguous are explicit outcomes
   (`src/catalog/content-registry.ts:53-85,130-194,196-305`). Resolution order is
   exact, then alias, then fingerprint, then missing
   (`src/catalog/content-registry.ts:308-343`). Equal digests with different
   canonical bytes throw `ContentIdentityCollision`
   (`src/catalog/content-registry.ts:87-92,175-178,276-281`). References use the
   same resolver (`src/catalog/content-registry.ts:382-399`), and reviewed
   match/clone receipts are readable, writable, and forgettable
   (`src/catalog/content-registry.ts:507-583`). Current production code has no
   caller of those resolver/receipt functions outside their tests, so the D139
   import planning unit must wire them before PARTY refresh can claim convergent
   import.
5. **The existing expected-revision conflict presentation refuses, marks stale,
   and offers reload.** The command executor checks the expected revision before
   and inside the transaction and throws rather than overwriting
   (`src/commands/character-command-executor.ts:193-212,231-254`). The Worker
   transports the current revision as structured error data
   (`src/worker/handlers/commands.ts:46-61`). The planner recognizes that data,
   marks its session stale (`src/ui/screens/planner/screen.ts:257-269`), and
   renders an alert with “Reload this character”
   (`src/ui/screens/planner/screen.ts:438-449`). Repository conflicts must reuse
   this refusal/structured-current-state/action presentation by extracting a
   shared conflict notice, with “Refresh from party” as the repository action.
6. **Hostile strings have a named rendering seam.** `freeTextSpan` preserves the
   string with `textContent` and marks it
   `data-free-text="unverified-origin"`; it deliberately does not filter or
   rewrite (`src/ui/free-text.ts:1-27`). The planner already applies it to an
   imported character name (`src/ui/screens/planner/screen.ts:409-418`) and to
   structured warning fields (`src/ui/screens/planner/screen.ts:342-360`). Every
   repository-derived display name, character name, library label, validation
   excerpt, and remote path rendered by PARTY uses that same seam. No remote
   string is interpolated into `innerHTML`, an instruction, or a structured
   sheet fact.
7. **OPFS is the current durable database boundary.** The dedicated Worker opens
   the SQLite file in an OPFS SAH pool (`src/db/worker.ts:24-41`), and the main
   window reaches database behavior only through RPC (`src/main.ts:34-81`). A
   database backup is the complete SQLite image
   (`src/backup/database-backup.ts:11-16,78-87`). Non-secret party observation
   rows may therefore live in SQLite and travel in database backup; a token may
   not.
8. **The deployment currently has no CSP line.** `public/_headers` defines the
   global security block at lines 20-32 but no `Content-Security-Policy` or
   `connect-src`. Section 10 gives the exact addition.

## 3. Repository and file layout

The v1 setup requires an existing repository and an explicit branch/ref. The app
does not create repositories or guess a write branch. The recommended repository
is dedicated to one table, with this top-level layout:

```text
library/
  party-library.json
  <human-label>--<publication-id>.json    # optional selected-subset documents
characters/
  <initial-character-slug>--<publication-id>.json
```

`party-library.json` is the designated full/primary library document. Selected
subsets are separate D139 library documents and use the same human-readable plus
stable-id naming rule. A character's first publish mints a random branded
`PartyPublicationId`, records the path against the local character in OPFS
SQLite, and keeps that path stable. The slug is sanitized for a path and frozen
at first publish; the current, possibly renamed character name remains visible
inside the document. Two characters named “Ash” do not collide because their
publication IDs differ.

Content-addressed filenames are rejected. They would create a new path for every
character edit, strand stale files, make human links churn, and turn deletion of
old snapshots into a second synchronization problem. A stable opaque filename
alone is also rejected because this is the table's repository and browsing it on
the forge should be useful. The chosen hybrid makes the subject recognizable and
keeps its update address stable.

Each body is exactly the corresponding D139 portability document serialized by
the same shared serializer used for download, as UTF-8 indented JSON with a final
newline. There is no party envelope and no secret or repository metadata inside.
The app uses fixed commit messages such as `Publish party character document`
and `Publish party library document`; it does not copy hostile character or
library names into a commit message. A person browsing the forge sees meaningful
directories and filenames, readable JSON with the existing format/version and
content, and ordinary history/diffs. The app never writes or replaces the
owner's `README`, licence file, or files outside `library/` and `characters/`.

## 4. One typed storage port and three adapters

The port lives in the main-window bundle. It accepts bytes and paths, knows
nothing about characters, libraries, import, or OPFS, and is bound to a
credential provider rather than receiving a token argument.

```ts
type Forge = 'github' | 'gitlab' | 'codeberg';
type RepositoryRevision = Brand<string, 'RepositoryRevision'>;
type RepositoryPath = Brand<string, 'RepositoryPath'>;

interface StoredObjectSummary {
  readonly path: RepositoryPath;
  // A list endpoint may not expose the token required for a safe write.
  readonly revision: RepositoryRevision | null;
  readonly byteLength: number | null;
}

interface StoredObject {
  readonly path: RepositoryPath;
  readonly bytes: Uint8Array;
  readonly revision: RepositoryRevision;
}

type WriteCondition =
  | { readonly kind: 'create-only' }
  | { readonly kind: 'replace'; readonly expected: RepositoryRevision };

interface WriteReceipt {
  // Null is permitted only if a provider accepted the write but neither its
  // response nor a safe follow-up read established the new token.
  readonly revision: RepositoryRevision | null;
}

type CredentialState =
  | 'missing'
  | 'expired'
  | 'revoked'
  | 'invalid-expired-or-revoked'
  | 'insufficient-scope';

type StorageResult<T> =
  | { readonly kind: 'success'; readonly value: T }
  | { readonly kind: 'not-found'; readonly at: 'repository' | 'object' | 'unknown' }
  | {
      readonly kind: 'conflict';
      readonly expected: RepositoryRevision | null;
      readonly actual: RepositoryRevision | null;
    }
  | { readonly kind: 'unauthorized'; readonly credentialState: CredentialState }
  | { readonly kind: 'rate-limited'; readonly retryAt: string | null }
  | {
      readonly kind: 'network-failed';
      readonly writeState: 'not-sent' | 'unknown' | 'not-applicable';
    }
  | {
      readonly kind: 'too-large';
      readonly observedBytes: number | null;
      readonly limitBytes: number | null;
    };

interface PartyStorage {
  list(prefix: RepositoryPath): Promise<StorageResult<readonly StoredObjectSummary[]>>;
  read(path: RepositoryPath): Promise<StorageResult<StoredObject>>;
  write(
    path: RepositoryPath,
    bytes: Uint8Array,
    condition: WriteCondition,
  ): Promise<StorageResult<WriteReceipt>>;
  delete(
    path: RepositoryPath,
    expected: RepositoryRevision,
  ): Promise<StorageResult<{ readonly deleted: true }>>;
}
```

All `StorageResult` consumers switch on `kind` exhaustively with no `default:`
arm. `CredentialState`, `WriteCondition`, and the closed `Forge` dispatch receive
the same treatment. Untrusted JSON begins as `unknown`; no party module uses
`any` or asserts a parsed body directly into a document type.

`RepositoryRevision` is the one optimistic-concurrency concept. The GitHub and
Codeberg adapters wrap the contents API's blob `sha`; the GitLab adapter wraps
the repository-file API's `last_commit_id`. Provider tokens never escape the
adapter as provider-shaped data. They are meaningful only with the locally
stored forge/repository/ref/path tuple.

```ts
function createPartyStorage(config: RepositoryConfig): PartyStorage {
  switch (config.forge) {
    case 'github':
      return new GitHubPartyStorage(config);
    case 'gitlab':
      return new GitLabPartyStorage(config);
    case 'codeberg':
      return new CodebergPartyStorage(config);
  }
}
```

The three adapters are deliberately separate:

- GitHub calls `api.github.com` contents endpoints and maps their blob `sha`.
- Codeberg calls `codeberg.org/api/v1` Gitea contents endpoints and maps their
  blob `sha`.
- GitLab calls `gitlab.com/api/v4` repository-file endpoints, supplies its
  `PRIVATE-TOKEN` header when authenticated, and maps `last_commit_id`.

The supervisor has proved those dialect facts and browser CORS reachability.
The exact list pagination, public-repository metadata shape, create/update/delete
methods and bodies, success bodies, conflict statuses, authentication scheme for
GitHub and Codeberg, rate-limit headers, masked-private-repository behavior, and
provider size refusals are **not claimed here**. Each adapter starts with a
one-time recorded-fixture spike. Until the sanitized fixtures pin an exact case,
the adapter must not guess it. No numeric provider limit is invented; unknown
size and retry facts remain null under D33.

## 5. Conflict and delete semantics

Every update is read-token-write:

1. read the exact path and retain its `RepositoryRevision`;
2. build and validate the complete document from current OPFS truth;
3. write with `replace(expected)`; or, after a definite object `not-found`, write
   with `create-only`;
4. record the new remote token only after a confirmed success.

An update without an expected token is unrepresentable. A create may not replace
an existing path. Delete likewise requires the token from an exact read. There
is no force push, unconditional retry, last-write-wins, or silent overwrite.

On `conflict`, the controller refuses the operation and preserves both local and
remote bytes. It performs at most a safe read to populate `actual`; inability to
obtain that token stays explicit as null. The UI uses the command layer's current
shape: an alert, a stale state, structured expected/current revision facts, and
one action. Its text is “This party file changed since you refreshed it. Refresh
from party before trying again.” Its action is “Refresh from party.” The shared
presenter has a closed union for `character-revision` and
`repository-revision`, so repository work reuses the existing interaction rather
than creating a toast or automatic retry.

Single-writer ownership makes this rare, not impossible: the same player can use
two devices, a collaborator can hand-edit JSON, or an assigned writer can be
changed. Optimistic refusal is still the correctness boundary.

## 6. Token handling is the security core

### Location and lifetime

The pasted token lives only in a main-window `PartyCredentialVault` backed by
`sessionStorage`, namespaced by forge plus repository. It survives an ordinary
reload in that tab's browser session, is not durable across an intentionally
ended browser session, and the setup screen says so before save. It never enters
SQLite/OPFS, a Worker message, an RPC request, a repository locator, or an app
domain model. An anonymous vault arm supports public reads without manufacturing
an empty token.

The connected-party header always shows the forge/repository and a labelled,
keyboard-operable **Forget token** button. Forgetting removes the session entry,
invalidates in-memory credential leases, changes the connection to anonymous,
and announces the result. It does not delete OPFS data, repository files, or the
non-secret repository configuration.

This is an explicit security/usability choice: localStorage or SQLite would keep
a high-value credential beyond the active browser session; memory-only storage
would lose it on every reload with no meaningful safety gain against script
running in the same page. Durable token storage can be reconsidered only as an
owner decision with a different threat model.

This boundary does not pretend a pure static app can protect a pasted token from
malicious JavaScript already executing on the same origin. Such code could read
sessionStorage or use an in-memory lease against the forge. The UI warns that the
token grants repository access and asks for the narrowest repository permission
the forge supports; exact per-forge scope names wait for the recorded-fixture and
official-documentation spike. The app loads no remote script for PARTY, and every
external forge link uses `rel="noopener noreferrer"`, but these reduce exposure
rather than manufacture an in-browser secret enclave.

### Checkable seam

Only `src/party/credentials.ts` may turn pasted text into an authorization
header. Adapters receive a `CredentialLease` capable of applying headers to a
request; orchestration receives neither the raw string nor a serializable token
object. The adapter fetch wrapper does not log requests, headers, response
bodies, or thrown objects. GitLab's header is `PRIVATE-TOKEN`; the other two
exact header schemes remain fixture-spike facts. Tokens are never placed in a
URL or request body. The generated service worker already returns immediately
for cross-origin requests (`tools/pwa/service-worker.ts:92-99`); a PARTY security
test pins that it never caches, clones, logs, or responds to a forge request.

A sentinel-token integration test named **`PARTY-TOKEN-NEVER-TRAVELS`** pastes a
distinctive value, performs fixture-backed read/write flows, and asserts that
the value is absent from:

1. serialized character export bytes;
2. serialized whole and selected library export bytes;
3. generated character and public-party share URLs;
4. exported database bytes, including the `party_*` tables;
5. captured log/error/analytics arguments; and
6. the structured sheet JSON script.

The test also asserts that the sentinel appears only in the mock request's
authorization header and in sessionStorage before “Forget token,” then nowhere
in storage afterward. A source-boundary test fails if a credential module is
imported by backup, sharing, sheet, Worker, database, or document modules.

### Expiry and rejection

Authentication failure is never a generic “network error.” An explicit provider
expiry signal maps to `unauthorized/expired`; an explicit revocation signal maps
to `unauthorized/revoked`; a response that does not distinguish invalid,
expired, and revoked maps honestly to
`unauthorized/invalid-expired-or-revoked`. The UI names that state and says
“Paste a current token or continue read-only if this repository is public.” An
insufficient permission response gets its own scope state. Exact mappings wait
for each recorded fixture; a 404 that could mean hidden-private or deleted stays
`not-found/unknown`, not a fabricated credential diagnosis.

## 7. Publish, refresh, and local state

OPFS remains the application's real storage. The repository is an explicit
publish/refresh boundary and is never mounted as a database.

### Publish my character

1. The user selects one local character and sees the destination path, local
   revision, last published revision, and whether the remote token is known.
2. The Worker produces the D139-complete character document. The controller
   validates it again through the shared document codec and shared serializer.
3. First publish creates a stable `PartyPublicationId` and uses `create-only`.
   Later publishes first read and then replace with the observed token.
4. Only confirmed success records `last_published_local_revision`, remote token,
   and `published_at`. A success whose provider token is unavailable is shown as
   “Published; refresh required before another publish,” not “up to date.”

If the local character revision exceeds `last_published_local_revision`, the UI
says **Unpublished local changes**. If equality is proved, it says **Published at
revision N from this device**; it does not claim the remote is still current. If
there has never been a successful publish, the state is **Never published**. No
null timestamp is formatted as “just now.”

### Refresh from party

1. List `library/` and `characters/`, then read only new or changed files; an
   exact read is mandatory before any future write.
2. Decode bytes as UTF-8, parse as `unknown`, discriminate by the existing
   character/library format name and version, and run the existing portability
   preview. Storage does not inspect document internals.
3. Library refresh presents the D82 import plan. Exact derived self-matches and
   remembered decisions converge; review-required adoptions remain explicit;
   collisions and invalid graphs write nothing. Removing an aggregate from a
   later repository document does not delete it locally.
4. Character refresh lists changed characters. “Import newer copy” invokes the
   D62 importer and creates a fresh local character identity. It never updates a
   prior clone in place. The prior clone may be archived/deleted only through its
   ordinary explicit local lifecycle.
5. On a second device, an owner may explicitly choose **Continue publishing this
   character from this device** after importing the remote document. That action
   binds the new local clone to the existing path and just-read remote token; it
   does not infer ownership from the character name or source database ID. The
   next write is still conditional, so a concurrent first-device write conflicts.
6. A remote path that disappeared is labelled **No longer published**; its local
   content and characters remain untouched.

The D138-inspired read model is a `party_document_states` index containing only
non-secrets: repository identity/ref, path, document kind, publication ID, local
character ID when applicable, last observed remote token, last imported token,
last published local revision, last successful refresh time, and the most recent
named observation state. Like `ContentUsageList`, it reports relationships; it
does not become a second character or catalog authority.

The party screen shows both **Last refreshed successfully: <time>** and, after a
failure, **Latest refresh attempt: <named failure>**. A failed or partial attempt
does not advance the success time. When no successful observation exists, it
says **Never refreshed**. A successful list with one invalid file records the
repository observation but not that file as imported; the screen names the
invalid path and its observed revision.

There is no polling, background write, service-worker sync, or automatic import
on app boot in v1. Manual refresh is honest offline behavior and keeps repo I/O
out of the OPFS transaction boundary.

## 8. Read-only participation without a token

“Join public party by URL” accepts a forge repository URL plus an optional
branch/ref and stores only the normalized `RepositoryConfig`. The closed URL
parser recognizes GitHub, GitLab, and Codeberg; unknown hosts or ambiguous URLs
are refused. When no token is present the selected adapter performs anonymous
repository metadata/list/read calls. The exact default-branch discovery and
public-file response shapes are pinned by recorded fixtures before this is
implemented.

Public participants can refresh library documents, review/adopt content, and
import character snapshots as fresh clones. They cannot publish or delete; those
controls are absent, not disabled-looking promises. Anonymous requests may have
lower rate limits, and a private or no-longer-public repository cannot be read.
Previously imported OPFS content remains usable offline, while freshness becomes
unknown and the last successful refresh remains visible.

A generated public-party link contains only forge, repository, and ref. It never
contains a token. A private-party link is the same locator and prompts each user
to paste their own token locally.

## 9. Failure and honesty table

| Condition | Result and UI | Local/remote mutation |
|---|---|---|
| Offline/DNS/CORS/transport failure | `network-failed`, with `writeState` distinguishing definitely not sent from unknown outcome; show last successful refresh and “Connection failed” | Never claim refresh/publish success. If write outcome is unknown, read before any retry |
| Rate limited | `rate-limited`; show `retryAt` only when the response proves it, otherwise “Retry time not supplied” | No import or retry loop |
| Token expired/revoked/invalid | Named `unauthorized` credential state; offer “Paste current token,” “Forget token,” and public read-only where applicable | No document or observation-success write |
| Token lacks write scope | `unauthorized/insufficient-scope`; say read may still work and writing needs repository-content permission | No fallback to an unconditional API |
| Repository deleted or renamed | `not-found/repository` when proved; otherwise “Repository not found or no longer visible” from `not-found/unknown` | OPFS data retained; no success timestamp |
| File absent | `not-found/object`; first publish may use `create-only`; refresh marks a previously observed file “No longer published” | Never delete corresponding local data |
| Competing write or hand edit after read | `conflict`; shared stale/revision alert and refresh action | Refuse; preserve both sides; never last-write-wins |
| Provider or local size refusal | `too-large` with proved byte/limit values or explicit unknowns | No truncation, compression substitution, or partial upload |
| Invalid UTF-8/JSON/format/version/row/content graph | Storage read succeeds, document validation reports a named invalid-document state with marked path; D82 preview/import does not run or transaction rolls back | OPFS unchanged; remote bytes untouched; file not marked imported |
| One file fails during multi-file refresh | Show per-file results and a partial-refresh summary | Successfully committed files retain their individual receipts; failed files do not. Full-refresh success time does not advance |
| Post-write response cannot establish a new token | Show “Published; refresh required before another publish” and retain a null token | Never issue another update until an exact read obtains a token |

This applies D33's computed-or-absent discipline to storage: an unavailable
revision, byte count, retry time, repository diagnosis, or freshness fact stays
absent and visible. It is never filled from a guess.

## 10. CSP and static hosting

Add this exact line inside the existing `/*` block in `public/_headers`:

```text
  Content-Security-Policy: connect-src 'self' https://api.github.com https://gitlab.com https://codeberg.org
```

This is the smallest CSP change required by PARTY-0: same-origin app requests
continue, and browser connections are allowed only to the three API origins in
D145. It adds no Worker origin, OAuth endpoint, wildcard, raw-content host, or
server secret. Public files are read through the same forge APIs, not raw-host
shortcuts.

The unit test **`PARTY-CSP-CONNECT-SRC`** parses the global `/*` header block,
requires exactly those three external origins plus `'self'`, rejects `*`, and
checks that the production build copies `_headers` unchanged. Its negative
control deletes each origin in turn; absence of the CSP line or any one forge
must fail before deployment.

## 11. Licensing, hostile content, and accessibility

Before publishing any library document, the preview says plainly:

> Publishing copies this content into a repository you control. You are
> responsible for having permission to redistribute it. The app preserves and
> transports your content; it does not verify or vouch for its licence.

The default library action is a selected-subset preview; “whole library” is an
explicit alternative with the included aggregate names/counts shown before the
write. This reduces accidental over-sharing without claiming that selection is a
licence check. The app ships only content authorized under D59, does not bundle a
non-authorized book as a fixture, does not upload on the user's behalf before
confirmation, and does not label imported content “safe” or “licensed.” A public
repository is explicitly described as public redistribution.

Remote filenames, paths, character names, content names, notes, and validation
excerpts are unverified free text. They render via `freeTextSpan`/`textContent`.
Structured sheet JSON continues to omit unverified prose rather than promoting
it to agent instructions. Repository JSON is data, never instruction text.

Under D108 every setup, paste, forget, publish, refresh, preview, review, and
conflict control is labelled and keyboard-operable. Adoption/licensing dialogs
trap focus and restore it to the invoking control; status and alert semantics do
not rely on color. Under D109 the adapter UI, sessionStorage lifecycle, CSP, and
fixture-backed browser journeys are tested in Chromium only; no Firefox, WebKit,
or mobile support is implied.

## 12. Implementation units, dependencies, and parallel lanes

“Mint” below means minting or changing a portability document format/version.
Storage units do not get to mint an envelope merely because their prerequisite
document is late.

| Unit | Size | Mint? | Scope | Exit criteria |
|---|---:|---|---|---|
| **DOC-C — D139 character closure** | L | Yes, existing character format's next version | Replace the current spell-only carried section with the exact external reference closure and wire preview/commit through CI-2a | Fresh DB imports full mechanics; repeat import adds no content and creates a fresh character each time; legacy readers remain explicit; frozen fixtures pass |
| **DOC-L — D139 library document** | L | Yes, first library format | Whole/selected `LibraryExportDocument`, same portable aggregate DTO/projectors and D82 plan/commit as DOC-C | Whole and subset round-trip; repeat import adds zero content; no characters/drafts/receipts/tokens; invalid graph is atomic |
| **P0 — storage contracts and fixture harness** | M | No | Brands, locator parser, result unions, exhaustive factory, mock fetch/recorded-fixture loader, byte/path rules | Typecheck; no `any`/default arms; all seven result arms have fixture tests; external network guard is green |
| **P1-GH — GitHub adapter spike/implementation** | M | No | Contents list/read/create/update/delete, SHA mapping, auth/rate/error/size fixtures | Every request and result matches sanitized fixtures; conflict refuses; no live test |
| **P1-GL — GitLab adapter spike/implementation** | M | No | Repository files, encoded project/path/ref, `PRIVATE-TOKEN`, `last_commit_id` mapping | Same adapter gate, including create/update/delete and masked-not-found fixtures |
| **P1-CB — Codeberg adapter spike/implementation** | M | No | Gitea contents operations and SHA mapping | Same adapter gate, independently from GitHub despite dialect similarity |
| **P2 — credential vault and boundary** | M | No | sessionStorage vault, anonymous lease, forget control, source import boundary, redaction/error policy | `PARTY-TOKEN-NEVER-TRAVELS` and forget/reload/expiry tests pass; token never crosses Worker RPC |
| **P3 — local publication/observation index** | M | No | `party_document_states`, branded publication IDs, non-secret Worker RPC/client and D138-style read model | Schema/backup/restore tests pass; source character remains truth; unknown facts stay null; no credential column/key exists |
| **P4 — publish/refresh orchestration** | L | No | Existing document serializers and plan/commit clients, read-token-write, D62 clone refresh, partial results, conflict presenter reuse | Character/library fixture journeys prove no wrapper, no overwrite, convergence, honest last-refreshed, and no local deletion from remote absence |
| **P5 — party screen and public-reader route** | L | No | Setup URL/ref, token paste/forget, publish/refresh previews, licensing disclosure, public anonymous mode, a11y | Chromium journey passes for all three fixture-backed adapters; public mode has no write/delete controls; focus/labels/status pass |
| **P6 — Cloudflare CSP** | S | No | Exact `_headers` `connect-src` addition and artifact test | `PARTY-CSP-CONNECT-SRC` passes against source and production output |
| **P7 — integrated honesty gate** | M | No | Cross-forge negative controls, offline/rate/revoked/deleted/invalid/conflict/too-large flows, build and Chromium | `npm run test`, build, and Chromium party specs pass with all external origins intercepted; no live network ever |

Dependency edges:

```text
CI-2a/projectors ──> DOC-C ─┐
                 └─> DOC-L ─┼──────────────> P4 ──> P5 ──> P7
P0 ──> P1-GH ───────────────┤                ^
  ├──> P1-GL ───────────────┤                |
  └──> P1-CB ───────────────┘          P2 ───┤
P0 ───────────────────────────────────> P3 ───┘
P6 ─────────────────────────────────────────────────> P7
```

Parallel lanes are explicit:

- DOC-C and DOC-L can run in parallel once their shared portable aggregate
  projectors/CI-2a plan-and-commit contract is frozen.
- P1-GH, P1-GL, and P1-CB run in three parallel lanes after P0; no adapter imports
  another adapter.
- P2, P3, and P6 can run in parallel with adapter work. P2 depends only on P0's
  credential-facing contract; P3 depends only on P0's non-secret brands; P6 is
  independent.
- P4 waits for both document units, all three adapters, P2, and P3. P5 waits for
  P4. P7 is the serial integration gate.

If the owner amends D145 to library-only for v1, DOC-C's PARTY integration and
character-writing portions of P4/P5 can move behind v1, but P0-P3, DOC-L,
library publish/refresh, public read, CSP, and the relevant P7 gates remain.

## 13. Test strategy and negative controls

No unit, integration, or browser test contacts a live forge—ever. Adapter tests
use sanitized recorded fixtures containing request method/URL/body, status,
relevant headers, and response body. Tokens are synthetic. Browser tests
intercept all three API origins and fulfill from the same fixture corpus. A test
guard fails any unhandled request to those origins; manually recording a new
fixture is a separate implementation spike, never a test mode.

| Load-bearing assertion | Proof | Named negative-control candidate |
|---|---|---|
| Repository files are existing D139 documents, not a third payload | Compare download and repository serializers and validate top-level exact keys | **PARTY-NO-THIRD-SERIALIZATION** — wrap a document in `{party: ...}`; codec/byte test fails |
| Character export carries exactly its reference closure | Cross-content fixture with one referenced and one unrelated aggregate | **PARTY-CHARACTER-CLOSURE** — include unrelated content or omit a referenced child; fixture fails |
| Library whole/subset uses the library document | Independent whole and selected import fixtures | **PARTY-LIBRARY-SUBSET** — silently export the whole library for a selected request; expected keys fail |
| CI-2a makes repeated content imports converge while D62 still clones characters | Alice/Bob databases with different IDs and two imports | **PARTY-CONVERGE-NOT-UPDATE** — insert duplicate content or update the first local character; counts/IDs fail |
| Resolver never chooses an ambiguous target or digest collision | Existing CI-2a collision/ambiguity fixtures plus party refresh rollback | **PARTY-COLLISION-ATOMIC** — choose first candidate; unchanged DB image assertion fails |
| Every update and delete uses an observed revision | Request fixture asserts SHA/last-commit mapping and expected token | **PARTY-NO-UNCONDITIONAL-WRITE** — omit the token; request contract fails |
| A conflict refuses and uses the existing stale presentation | Two-device fixture and shared conflict-notice DOM test | **PARTY-CONFLICT-NO-LWW** — retry without reread; one-call expectation and preserved bytes fail |
| Forge dialects remain isolated behind one port | Contract suite runs unchanged against all adapters | **PARTY-FORGE-EXHAUSTIVE** — add a forge member or `default:` arm; type probe/source guard fails |
| Token exists only in the credential/request seam | Sentinel across all listed serialization/log surfaces | **PARTY-TOKEN-NEVER-TRAVELS** — inject sentinel into any document, DB row, URL, log, sheet JSON, or RPC; scan fails |
| Forget token is real and visible | sessionStorage + in-memory lease + DOM/status test | **PARTY-FORGET-TOKEN** — clear UI only; storage and next-request assertions fail |
| Expiry/revocation is actionable, not a generic failure | Per-forge unauthorized fixtures and UI state assertions | **PARTY-CREDENTIAL-STATE** — map 401/known expiry to `network-failed`; exact union/label test fails |
| Public users need no token and cannot write | Anonymous public fixtures and route journey | **PARTY-PUBLIC-READ-ONLY** — require auth on read or render publish/delete; request/DOM test fails |
| OPFS remains truth and refresh is explicit | Offline reload after prior import; no boot-time external requests | **PARTY-OPFS-IS-TRUTH** — derive current character from remote or auto-fetch on boot; request-count/state test fails |
| Last-refreshed is only a proved successful observation | success, partial, invalid, offline, and never fixtures | **PARTY-NO-FALSE-FRESHNESS** — advance success timestamp on a partial failure; exact state test fails |
| Invalid hand-edited JSON cannot partly import | Valid storage response with malformed/truncated/unknown-field bodies and DB-image comparison | **PARTY-HAND-EDIT-ROLLBACK** — parse-cast or commit before full validation; image differs and test fails |
| Provider size refusal never truncates | Too-large fixture and exact original-byte hash | **PARTY-NO-TRUNCATION** — slice/recompress/retry bytes; hash/request-count test fails |
| All remote strings remain data with marked provenance | Hostile names/paths/notes fixture in DOM and structured-sheet checks | **PARTY-HOSTILE-STRING-MARK** — interpolate or omit `data-free-text`; DOM/sheet test fails |
| CSP permits exactly the required APIs | Parse source and built `_headers` | **PARTY-CSP-CONNECT-SRC** — remove one origin or add `*`; artifact test fails |
| No test has a live-network escape hatch | Global fetch guard and Playwright route fallback | **PARTY-NO-LIVE-NETWORK** — unhandled forge request throws with URL and test name |
| Licensing disclosure precedes library write | Controller/DOM test asserts acknowledgement and included subset before adapter call | **PARTY-LICENSING-NO-SILENT-PUBLISH** — call write before explicit confirm; call-order test fails |
| Keyboard/focus/status behavior follows D108 in Chromium | Unit DOM focus tests and one Playwright journey | **PARTY-FOCUS-RESTORE** — close adoption/conflict dialog without restoring invoker focus; browser assertion fails |

Recorded success fixtures are not generated from adapter output, and expected
document identities/counts are hand-pinned or independently authored. Retained
tests must remain capable of failing; snapshots are not regenerated merely
because production output changed.

## 14. Proposed implementation files

This is a future implementation inventory, not work performed by this design.

| Path | Action | Responsibility |
|---|---|---|
| `src/party/storage/contracts.ts` | Create | Port, result/condition unions, brands, repository locators |
| `src/party/storage/github.ts` | Create | GitHub adapter only |
| `src/party/storage/gitlab.ts` | Create | GitLab adapter only |
| `src/party/storage/codeberg.ts` | Create | Codeberg adapter only |
| `src/party/storage/create-storage.ts` | Create | Exhaustive forge dispatch |
| `src/party/credentials.ts` | Create | sessionStorage vault and request-header lease; sole raw-token seam |
| `src/party/controller.ts` | Create | Publish/refresh orchestration over document clients and storage port |
| `src/party/client.ts` | Create | Non-secret party observation RPC client |
| `db/schema/party.ts` | Create | `party_document_states`; no credential fields |
| `db/schema/index.ts`, `db/schema/relations.ts`, `src/db/migrations.ts` | Modify | Register/index the non-secret local read model |
| `src/worker/handlers/party.ts` | Create | Read/write non-secret observation state only |
| `src/ui/conflict-notice.ts` | Create | Shared character/repository stale presentation |
| `src/ui/screens/planner/screen.ts` | Modify | Consume shared conflict notice without changing command refusal semantics |
| `src/ui/screens/party/` | Create | Setup, token, publish, refresh, review, public-reader UI |
| `src/ui/app.ts` | Modify | Register party/public-reader routes |
| `src/backup/character-backup.ts` and D139 library modules | Modify/create in DOC-C/DOC-L | Portability documents PARTY consumes; no PARTY envelope |
| `public/_headers` | Modify | Exact `connect-src` CSP line from section 10 |
| `tests/fixtures/party-storage/` | Create | Sanitized recorded fixtures; no credentials or non-redistributable book content |
| `tests/unit/party/`, `tests/integration/party/`, `tests/browser/party.spec.ts` | Create | Contract, security, orchestration, and Chromium gates |

## 15. Open owner decisions

These do not authorize guessing. The recommended option is the design default;
changing a binding D145 implication requires an explicit amendment.

1. **Who may write which paths?**
   - **A — designated librarian writes `library/`; each player writes only their
     assigned character path (recommended).** This matches the single-writer
     model and gives the clearest UI. Forge collaborators may still have
     repository-wide permission; path ownership is an app convention and cannot
     prevent hand edits outside the app.
   - **B — repository owner writes every file.** Strongest effective control,
     but players must send exports to that owner rather than publish directly.
   - **C — every collaborator may write every path.** Simplest permissions, but
     conflict frequency and accidental library replacement rise; optimistic
     refusal still prevents silent overwrite.
2. **Does v1 write characters or only the library?**
   - **A — library and character publishing/refresh both ship in v1
     (recommended and the current reading of D145).** Complete PARTY gate above.
   - **B — library-only in v1; character repository writing moves later.** This
     requires explicitly amending D145's statement that a table shares “a
     library and characters” inside v1; D62 character consumption could remain
     via manual files meanwhile.
3. **How durable should pasted credentials be?**
   - **A — sessionStorage only with explicit Forget token (recommended).** Reload
     survives in-session; ending the browser session forgets it.
   - **B — memory only.** Smallest persistence surface, but every reload requires
     another paste.
   - **C — durable browser-profile storage.** Most convenient and highest theft/
     backup-boundary risk; requires a separate threat model and is not designed
     here.
4. **Is the repository dedicated to one party?**
   - **A — yes, use top-level `library/` and `characters/` (recommended).** Best
     forge readability and simplest URL.
   - **B — allow a configured subdirectory.** Supports mixed-purpose repos but
     expands locator/path validation and collision tests.
5. **What is the branch policy?**
   - **A — connect to one existing explicit ref and never create branches
     (recommended).** Readability and optimistic tokens remain straightforward.
   - **B — app-managed party branch.** Requires additional forge APIs and exact
     branch-create/protection fixtures before implementation.
6. **May the app delete published files?**
   - **A — expose explicit delete only to the locally bound publisher, with an
     exact read token and confirmation (recommended).** Remote deletion never
     deletes local data.
   - **B — no delete UI in v1.** The port still supports guarded delete and users
     manage files on the forge.
7. **How should multiple library subset files be consumed?**
   - **A — `party-library.json` is primary; additional named subsets are all
     listed and individually selectable on refresh (recommended).** Nothing is
     silently imported twice; D81 convergence handles overlap.
   - **B — exactly one library file per party.** Simpler, but gives up D139's
     selected-subset distribution within the party repository.

## Design result

PARTY-0 is a static-browser distribution boundary over one typed storage port and
three fixture-pinned forge adapters. It keeps tokens out of every durable/domain
serialization, keeps OPFS authoritative, refuses remote conflicts, reuses D139
documents and CI-2a/D62 import semantics, supports anonymous public readers, and
names every state it cannot prove.
