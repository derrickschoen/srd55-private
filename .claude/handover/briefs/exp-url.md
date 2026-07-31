# DISPATCH EXP-URL — Chromium share-URL capacity experiment (S, DOC-ONLY, wt/pwa or wt/attunement, no port)

Deliverable: EXACTLY ONE new file,
docs/design/2026-08-01-share-url-capacity.md. No source/test/migration
changes. This doc gates FF-A's size-guard constant (D124).

MEASURE, do not recall. Use a headless Chromium via the repo's installed
Playwright (`node` script driving playwright's chromium is fine — write it
under /tmp, not the repo). Measure the practical maximum length of:
1. a `#fragment` URL: assignable to location.hash, survives
   history.pushState, reload, bookmark round-trip (paste into a fresh tab),
   and intra-app navigation without truncation;
2. a `?param` URL: same tests plus server round-trip irrelevance (static
   host ignores it — note any dev-server limit encountered);
3. real share payloads: use the app's own encoder (import
   src/sharing/character-share.ts machinery in a vitest-style node harness
   or drive the running app) to produce actual encoded links for (a) a
   minimal level-1 character, (b) a heavier character approximating a
   level-12 caster, (c) the same plus a 20,000-code-point backstory (D124's
   worst case once FF-A lands — approximate by padding the notes field
   through the existing opt-in path if flavor columns do not exist yet, and
   SAY that is the approximation).
Report measured byte/char numbers in a table, the failure mode observed at
each limit (truncation? rejection? hang?), and RECOMMEND one
max-encoded-size constant with an explicit safety margin and one sentence
of reasoning. State every number as measured-on-this-machine with the
Chromium version. End with: DONE <path>.
