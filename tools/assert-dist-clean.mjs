// Build-output assertion: the DEV-ONLY AI bridge must never reach a deployable
// artifact. Chained into `npm run build`, so every documented deploy path — the
// Cloudflare Pages build command, `wrangler pages deploy`, CI and `test:all` —
// runs it without anyone having to remember to.
//
// This is the gate that does not rely on believing anything. `apply: 'serve'`,
// the `command === 'serve'` import branch and `import.meta.env.DEV` are three
// good reasons to expect the bridge to be absent; this reads the bytes.
//
// The forbidden literals between them cover every bridge file:
//   AI_BRIDGE_SENTINEL   stamped by src/ui/ai-chat/mount.ts, the single entry
//                        point of the browser-side subgraph (protocol.ts is
//                        reachable only through it)
//   /__ai/               the route prefix — protocol.ts, guard.ts, plugin.ts
//   ai-bridge-token      BOTH token spellings at once, deliberately. It is the
//                        meta NAME the plugin's `transformIndexHtml` hook injects
//                        into the served HTML, and — as a substring — the
//                        `x-ai-bridge-token` admission header in protocol.ts,
//                        guard.ts and mount.ts. Scanning for the header alone
//                        left a blind spot exactly where the plugin's only
//                        build-reachable side effect is: the header spelling
//                        does NOT occur in `<meta name="ai-bridge-token"
//                        content="…">`, so a build that shipped a live session
//                        secret in index.html was reported clean. Measured, not
//                        theorised. The shorter literal subsumes both.
//   child_process        the spawn import — plugin.ts
//
// The last literal guards a SECOND dev-only subgraph, tools/scrape/. Scraped
// rules text is not free-licensed, and D3 says it must never reach dist/, the
// repository, an export or a share link. Every module under tools/scrape imports
// tools/scrape/provenance.ts for its output naming, so the sentinel is present in
// any bundle that pulled in any part of the scraper — one literal covers the
// whole subgraph, exactly as AI_BRIDGE_SENTINEL does for the bridge. It also
// catches the other route in: a scraped file dropped into public/, which is
// copied verbatim into dist/. That is a live hazard rather than a hypothetical
// one — dist/_headers and dist/_redirects arrive that way today.
//
// THE SCAN MATCHES THE FILENAME AS WELL AS THE CONTENTS, and the filename is the
// half that does the work for the largest artifact class. Cached HTML is 84 of
// the 88 files the scraper writes, and provenance.ts states outright why it
// carries the sentinel ONLY in its name: it "has nowhere else to carry a stamp
// without corrupting the very bytes the parser reads". A contents-only scan is
// therefore structurally blind to exactly the files most likely to be dropped
// into public/ by hand. Measured, not theorised: copying one cached page into
// public/ and building produced "dist clean: 10 files scanned, control OK" and
// exit 0 while shipping real scraped rules text in dist/.
//
// String literals survive minification, which is what makes the scan meaningful.
// Files are read as latin1 rather than utf8: it is a byte-faithful 1:1 mapping,
// so the .wasm asset is searched exactly rather than being mangled into
// replacement characters that could hide an ASCII match straddling them.
//
// The negative control proves the scan actually read the bytes that ship: if
// `staticApp` — a runtime property assignment in src/main.ts, so it cannot be
// minified away — is absent from every file, the scan is looking at the wrong
// place and says so instead of passing.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

const FORBIDDEN = [
  'AI_BRIDGE_SENTINEL',
  '/__ai/',
  'ai-bridge-token',
  'child_process',
  // Kept in sync BY HAND with SCRAPE_SENTINEL in tools/scrape/provenance.ts.
  // This file is plain .mjs run by bare node, so it cannot import the .ts module
  // that defines it. The duplication is not left to trust: both
  // tests/unit/tools/scraper-is-never-in-the-bundle.test.ts and
  // tests/unit/ai-bridge/build-boundary.test.ts import the constant and assert
  // it appears in this array, so the two copies cannot drift apart silently.
  'NOT-FREE-LICENSED-DO-NOT-COMMIT',
];
const CONTROL = 'staticApp';
const MIGRATION_CONTROL = 'migration-bundle-control:0000';

function walk(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...walk(path));
    } else if (entry.isFile()) {
      found.push(path);
    }
  }
  return found;
}

function fail(message) {
  process.stderr.write(`assert-dist-clean: ${message}\n`);
  process.exit(1);
}

const root = resolve(process.argv[2] ?? 'dist');

let stats;
try {
  stats = statSync(root);
} catch {
  fail(`${root} does not exist — run the build first.`);
}
if (!stats.isDirectory()) {
  fail(`${root} is not a directory.`);
}

const files = walk(root);
if (files.length === 0) {
  fail(`${root} is empty — run the build first.`);
}

let controlSeen = false;
let migrationControlSeen = false;
for (const path of files) {
  const text = readFileSync(path, 'latin1');
  const name = basename(path);
  for (const pattern of FORBIDDEN) {
    const inName = name.includes(pattern);
    if (text.includes(pattern) || inName) {
      // The two subgraphs fail for different reasons and want different next
      // steps, so they say different things. A shared message sent a reader
      // hunting the AI bridge for a scraped-content leak — measured, not
      // theorised: it is what this guard printed the first time it caught one.
      const cause =
        pattern === 'NOT-FREE-LICENSED-DO-NOT-COMMIT'
          ? 'Scraped, non-free-licensed content leaked into the build output. ' +
            'Nothing under scraped/ may be committed or copied into public/.'
          : 'The dev-only AI bridge leaked into the build output.';
      fail(
        `forbidden literal "${pattern}" found in ${
          inName ? 'the FILENAME of' : 'the contents of'
        } ${relative(root, path)}. ${cause}`,
      );
    }
  }
  if (text.includes(CONTROL)) {
    controlSeen = true;
  }
  if (text.includes(MIGRATION_CONTROL)) {
    migrationControlSeen = true;
  }
}

if (!controlSeen) {
  fail(
    `negative control failed: "${CONTROL}" was not found in any of ` +
      `${files.length} scanned files, so this scan proves nothing.`,
  );
}

if (!migrationControlSeen) {
  fail(
    `migration control failed: "${MIGRATION_CONTROL}" was not found in any ` +
      `of ${files.length} scanned files, so the migration SQL was not bundled.`,
  );
}

process.stdout.write(
  `dist clean: ${files.length} files scanned, ` +
    'control OK, migration control OK\n',
);
