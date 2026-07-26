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
//   x-ai-bridge-token    the admission header — protocol.ts, guard.ts, mount.ts
//   child_process        the spawn import — plugin.ts
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
import { join, relative, resolve } from 'node:path';

const FORBIDDEN = [
  'AI_BRIDGE_SENTINEL',
  '/__ai/',
  'x-ai-bridge-token',
  'child_process',
];
const CONTROL = 'staticApp';

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
for (const path of files) {
  const text = readFileSync(path, 'latin1');
  for (const pattern of FORBIDDEN) {
    if (text.includes(pattern)) {
      fail(
        `forbidden literal "${pattern}" found in ${relative(root, path)}. ` +
          'The dev-only AI bridge leaked into the build output.',
      );
    }
  }
  if (text.includes(CONTROL)) {
    controlSeen = true;
  }
}

if (!controlSeen) {
  fail(
    `negative control failed: "${CONTROL}" was not found in any of ` +
      `${files.length} scanned files, so this scan proves nothing.`,
  );
}

process.stdout.write(`dist clean: ${files.length} files scanned, control OK\n`);
