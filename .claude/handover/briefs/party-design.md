# DESIGN DISPATCH — PARTY-0: shared party storage over user-owned repos (DOC ONLY)

You are in /home/vagrant/PhpstormProjects/dnd-wt-party (branch wt/party, at
main — the supervisor created and positioned it; run NO git commands). This is
DESIGN ONLY. You write EXACTLY ONE file:

    docs/design/2026-08-01-party-storage.md

No source, test, migration, or config changes. No commits.

## The rulings that govern this (verify each in `.claude/decisions.md`)

- **D145** (new): a table shares a library and characters through a repo THEY
  own, on GitHub, GitLab or Codeberg, public or private, authenticated by a
  token the user pastes. One storage port, three adapters. Ships INSIDE v1.
- **D144** (new): Cloudflare Pages stays the host; NO Worker, NO OAuth
  endpoint, NO server-side secret. Token paste is the only auth mechanism.
- D139: a character export carries its own reference closure; a separate
  library export carries the whole library or a selected subset. **Reuse those
  documents as the on-disk format — do not invent a third serialization.**
- D81: two people exchanging exports converge; re-import duplicates nothing.
  D62: import clones with a fresh identity. CI-2a's resolver already decides
  adoption vs review vs collision.
- D59 licensing: a shared library is a redistribution channel. Nothing in the
  design may encourage carrying content we are not licensed to redistribute;
  say plainly what the app does and does not vouch for.
- D4 hostile strings; D33 computed-or-absent; D108 keyboard/labels/focus;
  D109 Chromium; D110 pre-alpha (data loss tolerated, but a token is NOT
  data we may lose casually — see the security section below).

## Facts the supervisor proved on 2026-08-01 — build on these, do not re-derive

All three forge APIs are browser-callable (curl with an `Origin` header
returned `access-control-allow-origin: *`): `api.github.com` 200,
`codeberg.org/api/v1` 200, `gitlab.com/api/v4` 401-with-CORS-header.
Dialects: GitHub and Gitea/Codeberg use `contents/{path}` returning a blob
`sha`, and take that `sha` back on write for optimistic concurrency;
GitLab uses `repository/files/{path}` with `last_commit_id` and a
`PRIVATE-TOKEN` header.

**The load-bearing insight, which the design must state and exploit:** almost
every document here is SINGLE-WRITER (a character has one owner; the library
is written rarely), and idempotent convergent import already exists. So this
is FILE DISTRIBUTION, not sync. No CRDT, no merge algorithm, no server.

## What the document must contain

1. **Assumptions proven by reading code** (file:line): where export/import
   documents are produced and consumed; how CI-2a's resolver adopts vs
   reviews vs collides on re-import; how the existing expected-revision
   conflict is surfaced in the UI (the repo conflict must reuse that
   presentation, not invent one); where a hostile string is marked.
2. **Repo layout**: proposed paths (e.g. `library/`, `characters/`), file
   naming (content-addressed vs human-readable — argue it), and what a
   human browsing the repo on the web sees. It is THEIR repo; readability is
   a feature.
3. **The storage port**: one typed interface (list / read / write / delete)
   with a closed result union — success, not-found, conflict, unauthorized,
   rate-limited, network-failed, too-large. Three adapters implementing it.
   Exhaustive typed dispatch, no `default:` arm, no `any`. Map GitHub's
   `sha` and GitLab's `last_commit_id` onto ONE conflict token concept.
4. **Conflict semantics**: single-writer means conflicts are rare but real
   (two devices, one person). Specify: read token, write with token, on
   conflict REFUSE and show the same structured presentation the command
   layer already uses — never last-write-wins, never silent overwrite.
5. **Token handling — treat this as the security core of the unit.**
   Where the token lives; a visible "forget token" control; expiry surfaced
   as a named, actionable state, not a generic error. **A token must never
   enter a character export, a library export, a share link, a database
   backup, a log line, or the structured sheet JSON.** Specify the seam that
   makes this checkable, and name the test that proves it.
6. **Publish / refresh model**: OPFS remains the app's real storage; the repo
   is a publish/refresh boundary. Define what "publish my character" and
   "refresh from party" do, what a stale local copy looks like, and how the
   UI states last-refreshed. Reuse the D138 usage-index concept if it helps.
7. **Read-only participation**: a player with no token at all should still be
   able to consume a PUBLIC party library by URL. Say how, and what degrades.
8. **CSP**: the Cloudflare `_headers` file must allow `connect-src` to the
   three API origins. Name the exact change and the test that would catch its
   absence.
9. **Failure and honesty**: offline, rate-limited, revoked token, repo
   deleted, file hand-edited into invalid JSON by a curious human. Each gets
   a stated outcome; nothing silently pretends success (D33 discipline
   applied to storage rather than numbers).
10. **Unit breakdown** sized S/M/L with dependency edges, splitting mint from
    mint-free, and each unit's exit criteria. Note explicitly which units can
    run in parallel lanes.
11. **Test strategy**: adapters tested against RECORDED fixtures — no live
    network in any test, ever. One named negative-control candidate per
    load-bearing assertion, including the token-never-travels control.
12. **Open questions for the owner**, phrased as decisions with options —
    especially anything about who may write what, and whether v1 does
    character writing or library-only.

Verify every decision number you cite against `.claude/decisions.md`. Do not
invent API behaviour: where you are unsure of a forge's exact response shape,
SAY SO and mark it as needing a recorded-fixture spike before implementation.

When finished print exactly:
DONE docs/design/2026-08-01-party-storage.md
followed by a 10-line-max summary of the unit breakdown.
