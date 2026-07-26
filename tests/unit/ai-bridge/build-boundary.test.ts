/**
 * The edit-time companion to `tools/assert-dist-clean.mjs`, in the same shape as
 * tests/unit/db/drizzle-is-build-time-only.test.ts: that one pins the rollup
 * drizzle guard at the source level and leaves the bundle to the build, and this
 * one pins the four bridge gates at the source level and leaves the bytes to the
 * dist scan. It catches a leak before anyone waits for a build.
 *
 * It also pins the two properties that are policy rather than packaging: the
 * bridge has NO write path back into the application, and the dist scan is
 * looking for literals that genuinely exist.
 */
import { describe, expect, it } from 'vitest';
import { SCRAPE_SENTINEL } from '../../../tools/scrape/provenance';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

function read(relative: string): Promise<string> {
  return readFile(join(repoRoot, relative), 'utf8');
}

/** The literal list the dist scan actually runs with, read out of the scanner. */
async function forbiddenLiterals(): Promise<string[]> {
  const scanner = await read('tools/assert-dist-clean.mjs');
  const list = /const FORBIDDEN = \[([^\]]*)\]/.exec(scanner)?.[1] ?? '';
  return [...list.matchAll(/'([^']+)'/g)].map((match) => match[1] ?? '');
}

async function typeScriptFilesUnder(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await typeScriptFilesUnder(path)));
    } else if (entry.name.endsWith('.ts')) {
      files.push(path);
    }
  }
  return files;
}

describe('gate 1: the plugin is registered only for `serve`', () => {
  it('puts aiBridge() in plugins under a command check and nowhere else', async () => {
    const config = await read('vite.config.ts');
    expect(config).toContain("command === 'serve'");
    expect(config).toContain('plugins: [...shared.plugins, aiBridge()]');
    // Exactly one registration, inside the conditional.
    expect(config.split('aiBridge()').length - 1).toBe(1);
  });

  it('leaves the drizzle guard registrations spelled exactly as they were', async () => {
    // Restated here because this change is the likeliest thing to disturb them:
    // the worker is a separate rollup pipeline and needs its own registration.
    const config = await read('vite.config.ts');
    expect(config).toContain('plugins: [forbidDrizzleAtRuntime()]');
    expect(config).toContain('plugins: () => [forbidDrizzleAtRuntime()]');
  });

  it('disables the dev server’s CORS, which is what makes the preflight barrier hold', async () => {
    expect(await read('vite.config.ts')).toContain('cors: false');
  });
});

describe('gate 2: the plugin declares itself dev-only', () => {
  it('applies to serve', async () => {
    expect(await read('tools/ai-bridge/plugin.ts')).toContain("apply: 'serve'");
  });
});

describe('gate 3: the browser half is behind import.meta.env.DEV', () => {
  it('is imported from exactly one place, inside the DEV branch', async () => {
    const main = await read('src/main.ts');
    const branch = main.indexOf('if (import.meta.env.DEV) {');
    expect(branch).toBeGreaterThan(-1);
    const importAt = main.indexOf("import('./ui/ai-chat/mount')");
    expect(importAt).toBeGreaterThan(branch);
    expect(main.indexOf('}', importAt)).toBeGreaterThan(importAt);
    expect(main.split("import('./ui/ai-chat/mount')").length - 1).toBe(1);
  });

  it('is referenced by no other module in src/', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'src'));
    expect(files.length).toBeGreaterThan(0);
    const offenders: string[] = [];
    for (const file of files) {
      if (
        file.includes(join('src', 'ui', 'ai-chat')) ||
        file.endsWith(join('src', 'main.ts'))
      ) {
        continue;
      }
      const source = await readFile(file, 'utf8');
      if (source.includes('ai-chat')) {
        offenders.push(file.slice(repoRoot.length));
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe('gate 4: the dist scan is chained onto the build and can actually fire', () => {
  it('runs on every build, so every deploy path runs it', async () => {
    const pkg = JSON.parse(await read('package.json')) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts['build']).toContain('node tools/assert-dist-clean.mjs');
  });

  it('looks for literals that really do occur in the sources they guard', async () => {
    const forbidden = await forbiddenLiterals();
    // The scanner now guards TWO dev-only subgraphs: the AI bridge, and the
    // local-only scraper under tools/scrape, whose output is not free-licensed
    // and must never reach dist/. The list is asserted whole so neither half can
    // be dropped silently, and each literal is then checked against the sources
    // it is meant to catch — a pattern nothing emits would make the scan a no-op
    // that always passes.
    const bridgeLiterals = [
      'AI_BRIDGE_SENTINEL',
      '/__ai/',
      'ai-bridge-token',
      'child_process',
    ];
    // Taken from the module that DEFINES it rather than restated, so this also
    // catches drift between that definition and the hand-kept copy in
    // assert-dist-clean.mjs (which is plain .mjs and cannot import the .ts).
    const scrapeLiterals = [SCRAPE_SENTINEL];
    expect(forbidden).toEqual([...bridgeLiterals, ...scrapeLiterals]);

    const bridgeSources = (
      await Promise.all(
        [
          'src/ui/ai-chat/mount.ts',
          'src/ui/ai-chat/protocol.ts',
          'tools/ai-bridge/plugin.ts',
          'tools/ai-bridge/guard.ts',
        ].map(read),
      )
    ).join('\n');
    for (const literal of bridgeLiterals) {
      expect(bridgeSources, `forbidden literal ${literal}`).toContain(literal);
    }

    // The scrape sentinel is defined in one module that every other module under
    // tools/scrape imports for its output naming, so its presence in a bundle
    // means some part of the scraper was reachable from an entry graph.
    const scrapeSource = await read('tools/scrape/provenance.ts');
    for (const literal of scrapeLiterals) {
      expect(scrapeSource, `forbidden literal ${literal}`).toContain(literal);
    }
  });

  it('covers the plugin’s HTML injection, not only its JS modules', async () => {
    // The regression this pins, found by review and reproduced before fixing:
    // the scan once forbade only the HEADER spelling `x-ai-bridge-token`, while
    // the plugin's ONLY build-reachable side effect — `transformIndexHtml` —
    // emits `<meta name="ai-bridge-token" content="…">`, a string in which that
    // spelling does not occur. A dist carrying a live session secret in
    // index.html therefore scanned clean. Every other forbidden literal lives in
    // a JS module, so this hook was the one shape nothing covered.
    //
    // Built from the sources rather than restated, so renaming the meta name or
    // narrowing the literal re-opens the hole and fails here.
    const protocol = await read('src/ui/ai-chat/protocol.ts');
    const metaName = /AI_BRIDGE_TOKEN_META = '([^']+)'/.exec(protocol)?.[1];
    expect(metaName).toBeTruthy();
    expect(await read('tools/ai-bridge/plugin.ts')).toContain(
      'attrs: { name: AI_BRIDGE_TOKEN_META, content: token }',
    );

    const injected = `<meta name="${String(metaName)}" content="deadbeef">`;
    const forbidden = await forbiddenLiterals();
    const catches = forbidden.filter((literal) => injected.includes(literal));
    expect(catches, `nothing in FORBIDDEN matches ${injected}`).not.toEqual([]);
  });

  it('keeps a negative control that proves the scan read shipped bytes', async () => {
    const scanner = await read('tools/assert-dist-clean.mjs');
    expect(scanner).toContain("const CONTROL = 'staticApp'");
    // A runtime property assignment, so minification cannot remove it.
    expect(await read('src/main.ts')).toContain('window.staticApp = system;');
  });

  it('stamps the sentinel into the DOM rather than into a comment', async () => {
    const mount = await read('src/ui/ai-chat/mount.ts');
    expect(mount).toContain(
      "export const AI_BRIDGE_SENTINEL = 'AI_BRIDGE_SENTINEL'",
    );
    expect(mount).toContain('element.dataset.aiBridge = AI_BRIDGE_SENTINEL;');
  });
});

describe('the bridge has no write path back into the application', () => {
  it('imports only from a closed allowlist, so it cannot reach a mutation', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'src/ui/ai-chat'));
    expect(files.length).toBeGreaterThan(0);

    // Every import in this directory, type or value, must be one of these. The
    // planner's agent reference is read-only by construction, and rpc/protocol
    // supplies an error TYPE and nothing that can send anything.
    const allowed = new Set([
      './protocol',
      '../screens/planner/agent-reference',
      '../../rpc/protocol',
    ]);
    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const match of source.matchAll(/from '([^']+)'|import\('([^']+)'\)/g)) {
        const specifier = match[1] ?? match[2] ?? '';
        if (!allowed.has(specifier)) {
          offenders.push(`${file.slice(repoRoot.length)}: ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it('mentions no command, executor or rpc client at all', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'src/ui/ai-chat'));
    const forbidden = [
      'rpc/client',
      'RpcClient',
      'command-executor',
      'commands/',
      'PlannerSession',
      'innerHTML',
      'outerHTML',
      'insertAdjacentHTML',
      'eval(',
      'Function(',
    ];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const pattern of forbidden) {
        expect(source, `${file.slice(repoRoot.length)} / ${pattern}`).not.toContain(
          pattern,
        );
      }
    }
  });
});

describe('there is exactly one agent and it is claude', () => {
  it('never names another CLI anywhere under tools/ai-bridge', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'tools/ai-bridge'));
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      // Comments explain WHY codex was dropped; no code may invoke it.
      const code = source
        .split('\n')
        .filter((line) => !/^\s*(\/\/|\*|\/\*)/.test(line))
        .join('\n');
      expect(code, file.slice(repoRoot.length)).not.toContain('codex');
    }
  });

  it('never builds a command string or asks for a shell', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'tools/ai-bridge'));
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      expect(source, file.slice(repoRoot.length)).not.toContain('execSync');
      expect(source, file.slice(repoRoot.length)).not.toContain('exec(');
      expect(source, file.slice(repoRoot.length)).not.toContain('shell: true');
    }
    // The one spawn site is explicit about it.
    expect(await read('tools/ai-bridge/plugin.ts')).toContain('shell: false');
  });
});
