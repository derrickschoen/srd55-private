# Chromium share-URL capacity experiment

This document records the D124 experiment that gates FF-A's encoded-link size
guard. Every number below was measured on this machine on 2026-07-31 with
headless **Chromium 149.0.7827.55**, Playwright from this repository, Node
24.13.0, and Linux x64. None is a recalled browser limit.

## Method

The transport probe served a static HTML response from
`http://127.0.0.1:<ephemeral-port>` (22 characters in the measured run). The
server ignored the request query and was given a 64 MiB request-header ceiling
so the Chromium ceiling, rather than Node's default parser ceiling, would be
measured. Payload characters were ASCII `x`, matching the one-byte,
URL-unreserved character shape of the app's base64url fragments. URL character
and UTF-8 byte counts are therefore identical in the transport table.

For each candidate length the probe required all of these checks to preserve
the payload exactly:

1. browser-side assignment (`location.hash = payload` was checked explicitly
   for fragments; `location.assign(fullUrl)` was used for the navigational
   chain);
2. `history.pushState`;
3. reload;
4. an `<a target="_blank">` bookmark-style round trip;
5. navigation of the exact URL in another fresh tab; and
6. another `history.pushState` as intra-app navigation.

Playwright cannot operate Chromium's omnibox, so step 5 is the parser-equivalent
of pasting the retained URL into a fresh tab, not UI automation of the physical
paste gesture. The independent target-blank round trip also proved that the URL
survived storage in and activation from a browser link.

The pass/fail boundary was found by exponential search followed by character-
exact binary search, then both boundary values were rerun. Each successful
boundary run completed in 2.4 seconds for the fragment and 2.8 seconds for the
query; the harness timeout was 20 seconds, so neither result was a timeout
boundary.

## Transport results

| Transport | Maximum payload chars | Maximum complete URL chars / bytes | First failing payload | First failing complete URL | Observed failure |
|---|---:|---:|---:|---:|---|
| `#fragment` | 2,097,128 | 2,097,152 | 2,097,129 | 2,097,153 | Assignment to `location.hash` and `history.pushState` still held all 2,097,153 characters, but reload returned HTTP 200 at `/` and silently dropped the entire pushed path and fragment. It did not preserve or partially truncate the payload. |
| `?share=` | 2,097,122 | 2,097,152 | 2,097,123 | 2,097,153 | `location.assign` was rejected before a useful server round trip; Chromium replaced the page URL with `about:blank#blocked`. No truncation or hang was observed. |

At each maximum, assignment, history, reload, target-blank round trip, fresh-tab
round trip, and intra-app navigation all preserved the payload byte-for-byte.
The different payload counts only reflect the six additional URL characters in
`?share=` versus `#`; Chromium's measured complete-URL ceiling was the same.

### Query server boundary

The static probe above demonstrates that a host can ignore a query's meaning
while still receiving its bytes in the HTTP request target. With its deliberately
raised parser ceiling, that host accepted the query all the way to Chromium's
2,097,152-character URL limit. The repository's real Vite development server
was measured separately with an ephemeral port:

| Vite query result | Payload chars | Complete URL chars / bytes | HTTP status |
|---|---:|---:|---:|
| Last accepted | 15,813 | 15,842 | 200 |
| First rejected | 15,814 | 15,843 | 431 |

Thus query data is irrelevant to the static app but not to intermediaries and
request parsers. A fragment is not sent in the HTTP request and avoids this
15,842-character development-server boundary entirely.

## Real application payloads

These rows used the application's seeded database, `exportCharacterShare`, the
current positional wire conversion, native gzip `CompressionStream`, and
unpadded base64url encoder. Gzip and wire-byte counts were independently read
back from each emitted fragment. The URL columns use the same 22-character
measured origin as the transport experiment.

The heavier fixture is an actual seeded 2024 Wizard raised to level 12, with 28
active spellbook acquisitions drawn from the seeded SRD catalog, filled ability
scores, a weapon, worn armor, four skill proficiencies, and the grants generated
by the app. It approximates a heavier caster rather than claiming to be a
complete guided-builder journey.

| Character payload | Flavor code points / UTF-8 bytes | Positional JSON bytes | Gzip bytes | Encoded chars | `#` URL chars / bytes | `?share=` URL chars / bytes |
|---|---:|---:|---:|---:|---:|---:|
| Minimal level-1 Wizard | 0 / 0 | 560 | 205 | 274 | 298 | 304 |
| Level-12 Wizard approximation | 55 / 55 | 1,832 | 547 | 730 | 754 | 760 |
| Same plus 20,000-code-point flavor approximation | 20,000 / 20,332 | 22,275 | 2,599 | 3,466 | 3,490 | 3,496 |

The flavor columns do not exist yet. For the last row, a `/tmp`-only Vite
transform raised the existing root-notes validator from 2,000 to 20,000 inside
the measurement process; the repository remained unchanged. The heavy document
was exported through the existing `notes: true` opt-in, then its opted-in notes
member was padded with 20,000 code points of deterministic, varied synthetic
prose to approximate FF-A's future backstory member. The production positional
codec, validation path, gzip, and base64url implementation still performed the
encoding. This is worst-case field *length*, not worst-case entropy: a future
encoded-size guard must remain authoritative even though prose compresses well.

## Recommendation

Use the existing fragment transport and set the one encoded-size guard to
**`SHARE_LIMITS.encodedCharacters = 131_072`** (128 Ki characters); on the
measured origin that produces at most a 131,096-character URL, leaving
1,966,056 characters, or 93.75%, of measured Chromium headroom while avoiding
the query transport's much smaller server-parser boundary.

The 20,000-code-point approximation used only 3,466 encoded characters, 2.64%
of the recommended guard. FF-A must surface the guard's refusal explicitly; it
must never truncate a document or mint a link that the encoder has refused.

## Playwright spec impact

This experiment added no repository test or source changes; all browser
automation lived under `/tmp`.

| Spec | Affected | Why |
|---|---|---|
| `acceptance-walkthrough.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `agent-reference.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `ai-chat.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `attribution.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `backup.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `bundled-content.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `catalog-import.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `character-list.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `character-sheet.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `command-rpc.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `database-lifecycle.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `guided-builder.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `multiclass-skills.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `persistence.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `php-feature-parity.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `planner.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `pwa.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `reports-and-print.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `sharing.spec.ts` | No | Doc-only experiment; no application behavior changed. |
| `weapons.spec.ts` | No | Doc-only experiment; no application behavior changed. |

DONE docs/design/2026-08-01-share-url-capacity.md
