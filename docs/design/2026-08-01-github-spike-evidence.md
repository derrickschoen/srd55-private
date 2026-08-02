# D150/D160 GitHub live-spike evidence (2026-08-01)

Supervisor-run under the owner's direct instruction ("Use the gh command to
create what a DM would so you can thoroughly test"), authenticated as the
owner's `gh` session (account `derrickschoen`, token scopes gist/read:org/
repo/workflow). Everything below is MEASURED against api.github.com on
2026-08-01, not recalled from documentation. Raw captures with full headers
live in the session scratchpad (`spike/01..19-*.txt`); the fixture-grade
bodies must be sanitized from those captures when P1-GH is dispatched.

## Outward-facing actions taken (complete list)

Two throwaway repositories were created under the owner's account and REMAIN
(the token lacks `delete_repo`; the owner deletes them, or grants
`gh auth refresh -s delete_repo` and asks for cleanup):

- `derrickschoen/srd55-party-spike-public` (public)
- `derrickschoen/srd55-party-spike-private` (private)

All writes went only to those repos. Full request list: create x2 repo;
GET repo metadata; PUT create library file; GET file; PUT identical bytes;
PUT changed bytes with current sha; PUT with stale sha; PUT 27KB character;
GET directory listing x2; GET missing file; GET missing repo; PUT + DELETE
unicode/space path; DELETE with stale sha; anonymous GET public file (CORS
origin header); anonymous GET private file; anonymous GET via
raw.githubusercontent.com; GET character for round-trip proof.

## Measured findings (each with its capture file)

1. **Optimistic concurrency works as designed, with one trap.** PUT with a
   stale `sha` → **409** with body
   `{"message":"<path> does not match <sha>","documentation_url":…,"status":"409"}`
   (07b). DELETE with a stale sha → the same 409 shape (15). THE TRAP (06/07,
   found by supervisor error): writing BYTE-IDENTICAL content does not change
   the blob sha — git content-addressing — so a "stale" sha that points at
   identical bytes still succeeds with 200. An adapter must never infer
   "someone else wrote" from success, and a no-op publish returns 200 with the
   same sha, not a conflict.
2. **PUT create → 201; PUT update → 200** (04, 06b). Response carries
   `content.sha` (new blob) and `commit` object. The next write's sha comes
   from the previous response — no extra GET needed.
3. **Reads round-trip byte-identical**: 20,156-byte character document
   (20,000-code-point backstory) came back `encoding: base64`, decoded
   byte-identical (19). Contents-API 1MB response limit not approached; the
   documented >1MB behavior remains UNVERIFIED and must stay a stated
   assumption in the adapter.
4. **Directory listing** GET on a directory → 200 JSON array of entries
   (09, 10). No `Link` pagination header at table-realistic sizes (a party's
   worth of files). The documented 1,000-entries-per-directory API limit is
   UNVERIFIED — out of realistic party range.
5. **404 shapes**: missing file and missing repo both →
   `{"message":"Not Found","documentation_url":…,"status":"404"}` (11, 12).
   An anonymous read of a PRIVATE repo is also a plain **404**, not 403 (17)
   — private existence does not leak, and the adapter cannot distinguish
   "private" from "absent" without auth.
6. **Anonymous public read is browser-viable**: 200 with
   `access-control-allow-origin: *`, `x-ratelimit-limit: 60` per IP/hour,
   and `x-ratelimit-remaining` exposed to JS via
   `access-control-expose-headers` (16). D154's anon-primary mode can show a
   real remaining-requests number. `raw.githubusercontent.com` also serves
   CORS `*` (18) as a higher-limit read-only alternative; its rate limits are
   not enumerated in headers and remain UNVERIFIED.
7. **Authenticated rate limit**: `x-ratelimit-limit: 5000`, resource `core`
   (04, 09). A refreshing party of five tokened users is nowhere near it; the
   60/hr anonymous budget is the only one that needs UI-visible budgeting.
8. **Unicode + spaces in paths work** URL-encoded: PUT to
   `characters/derrick/%C3%86lfric%20the%20Bold.json` → 201 with
   `"path":"characters/derrick/Ælfric the Bold.json"`; DELETE by the same
   encoding → 200 (13, 14). Adapter must percent-encode path segments and
   treat the DECODED form as canonical.

## Scope not covered (stays fixtures-only per D160)

GitLab and Codeberg were NOT touched (owner has no accounts). Their adapters
ship roughed-in against authored fixtures, explicitly marked
unverified-against-live in their disclosure, until accounts exist.
