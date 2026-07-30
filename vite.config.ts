import { defineConfig, type Plugin } from 'vite';
import { createHash } from 'node:crypto';
import {
  readFileSync,
  readdirSync,
  realpathSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve } from 'node:path';
import { aiBridge } from './tools/ai-bridge/plugin';
import {
  appShellCacheName,
  appShellUrl,
  serviceWorkerSource,
  type BuildAsset,
} from './tools/pwa/service-worker';

function deployableAssets(
  root: string,
  directory: string = root,
): BuildAsset[] {
  const assets: BuildAsset[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      assets.push(...deployableAssets(root, path));
      continue;
    }
    if (!entry.isFile()) {
      continue;
    }
    const fileName = relative(root, path);
    if (
      fileName === '_headers' ||
      fileName === '_redirects' ||
      fileName === 'service-worker.js'
    ) {
      continue;
    }
    assets.push({ fileName, source: readFileSync(path) });
  }
  return assets;
}

/**
 * Production receives a worker built from the finalized Rollup output. The
 * exact shell filenames and bytes mint its cache name, so each build installs
 * into a distinct cache and cache.addAll can make that install atomic.
 *
 * Development serves a no-fetch worker. That keeps real registration testable
 * without taking requests away from Vite, HMR, or Playwright's page-level
 * network interception. Offline behavior belongs to the emitted production
 * worker and its independently checked artifact transcription.
 */
function appShellServiceWorker(): Plugin {
  let outputDirectory: string | undefined;
  return {
    name: 'app-shell-service-worker',
    configResolved(config) {
      outputDirectory = resolve(config.root, config.build.outDir);
    },
    configureServer(server) {
      server.middlewares.use(
        '/service-worker.js',
        (request, response, next) => {
          if (request.method !== 'GET') {
            next();
            return;
          }
          response.statusCode = 200;
          response.setHeader(
            'Content-Type',
            'text/javascript; charset=utf-8',
          );
          response.setHeader('Cache-Control', 'no-store');
          response.end(
            "self.addEventListener('install', () => undefined);\n",
          );
        },
      );
    },
    closeBundle() {
      if (
        outputDirectory === undefined ||
        !statSync(outputDirectory).isDirectory()
      ) {
        throw new Error('Vite output directory is unavailable for PWA build.');
      }
      const shellAssets = deployableAssets(outputDirectory);
      const cacheName = appShellCacheName(shellAssets);
      const urls = [
        './',
        ...shellAssets.map((asset) => appShellUrl(asset.fileName)),
      ];
      writeFileSync(
        join(outputDirectory, 'service-worker.js'),
        serviceWorkerSource(cacheName, urls),
      );
    },
  };
}

/**
 * ONE DEPENDENCY CACHE PER CHECKOUT.
 *
 * This default used to be a single machine-global path that every git worktree
 * of this repository shared, and two checkouts cannot co-exist in it. Vite's
 * optimizer records the absolute paths of the checkout that last wrote the
 * cache, so the next checkout to start a dev server finds a mismatch and
 * re-optimizes — and a re-optimization changes `browserHash`, which makes Vite
 * tell the connected browser to perform a full reload.
 *
 * That reload is a genuine page load, and it is what made the attribution
 * spec's `expect(loads).toBe(1)` fail intermittently. The assertion was right
 * and the click it guards was fine; the second load was real and had nothing to
 * do with the click. Confirmed A/B/A by replaying a foreign checkout's
 * `_metadata.json` into an otherwise warm cache: consistent cache passes,
 * foreign cache fails with two loads, and Vite rewrites the file back to the
 * running checkout's identity — which is what steals it from the other worktree
 * in turn.
 *
 * playwright.config.ts already gave concurrent checkouts their own PORT for
 * precisely this reason; the cache was the unfixed half of the same problem.
 * Hashing the checkout directory keeps the path stable from run to run, so the
 * cache still stays warm, while making it unique per worktree.
 * `STATIC_APP_CACHE_DIR` still overrides it, as PARALLEL-PLAN.md requires.
 */
const checkoutCacheDir = join(
  tmpdir(),
  `dnd-multiclass-spells-static-vite-${createHash('sha256')
    .update(realpathSync(process.cwd()))
    .digest('hex')
    .slice(0, 12)}`,
);

/**
 * Drizzle is a BUILD-TIME-ONLY dependency: it authors `src/db/schema.sql` and
 * supplies the types the runtime Zod contracts are bound against. A
 * devDependency is not by itself an enforcement boundary — one accidental value
 * import would bundle the whole query builder into the shipped app.
 *
 * This plugin is the real boundary. It fails the production build if any module
 * in any entry graph resolves into a `drizzle-*` package. `apply: 'build'`
 * keeps it out of the dev server and out of vitest, where build-time modules
 * legitimately import Drizzle.
 *
 * IT MUST BE REGISTERED TWICE. This project ships TWO rollup entry graphs —
 * `index` and the sqlite worker — and Vite builds worker graphs through
 * `config.worker.plugins`, a SEPARATE pipeline that does not inherit top-level
 * `plugins`. Registering it only at the top level was verified to leave the
 * worker graph unguarded: a value import in `src/db/worker.ts` bundled
 * drizzle-orm and grew the worker chunk by ~7.4 kB with a clean exit code.
 */
function forbidDrizzleAtRuntime(): Plugin {
  const forbidden = /[\\/]node_modules[\\/](\.vite[\\/]deps[\\/])?drizzle-/;
  return {
    name: 'forbid-drizzle-at-runtime',
    apply: 'build',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      const resolved = await this.resolve(source, importer, {
        ...options,
        skipSelf: true,
      });
      if (resolved !== null && forbidden.test(resolved.id)) {
        this.error(
          `Drizzle must never reach the runtime bundle. "${source}" resolved ` +
            `to "${resolved.id}" from "${importer ?? '<entry>'}". Import ` +
            'Drizzle types with `import type` only.',
        );
      }
      return resolved;
    },
  };
}

const core = {
  base: './',
  cacheDir: process.env.STATIC_APP_CACHE_DIR ?? checkoutCacheDir,
  plugins: [forbidDrizzleAtRuntime()],
  worker: {
    plugins: () => [forbidDrizzleAtRuntime()],
  },
  server: {
    fs: {
      allow: [process.cwd(), realpathSync('node_modules')],
    },
    /**
     * Load-bearing, not decorative. Vite's DEFAULT `cors` reflects any
     * loopback-ish `Origin`, which would let a hostile page in this browser
     * complete the CORS preflight that the AI bridge's custom request header
     * forces — and that preflight is the single barrier a web page cannot get
     * past. Loopback binding stops remote HOSTS; it does nothing about another
     * tab. Turning CORS off means the preflight is never answered, so the real
     * cross-origin request is never sent. Nothing in this app fetches the dev
     * server cross-origin, so there is nothing else to lose.
     */
    cors: false,
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
    /**
     * `zod` reaches the browser ONLY through the worker's module graph
     * (src/db/worker.ts → handlers → src/domain/contracts/rows.ts), and the
     * worker is referenced as `new Worker(new URL('./db/worker.ts', …))`, not
     * as a static import. Vite's startup dependency scanner crawls index.html
     * and the modules statically reachable from it, so it does not see that
     * graph: `zod` was instead discovered when the worker actually loaded,
     * which is after the browser has connected. The dev server then logged
     *
     *     ✨ new dependencies optimized: zod
     *     ✨ optimized dependencies changed. reloading
     *
     * and reloaded the page. That is a second, real page load on every cold
     * cache — the other half of the attribution spec's intermittent
     * `expect(loads).toBe(1)` failure, and the half a per-checkout cache does
     * not address, because a fresh clone or a cleared temp directory is cold by
     * definition.
     *
     * Naming it here makes the optimizer process it during startup, before the
     * first request is served, so there is nothing left to discover late and
     * nothing to reload for. This is Vite's documented remedy for deps a static
     * crawl cannot reach; it is not a timing adjustment.
     */
    include: ['zod'],
  },
};

const shared = {
  ...core,
  plugins: [...core.plugins, appShellServiceWorker()],
};

/**
 * The AI bridge is DEV-ONLY and is registered here ONLY for `command === 'serve'`.
 *
 * That is the outermost of four independent gates; the others are `apply: 'serve'`
 * on the plugin itself, `import.meta.env.DEV` around the browser half in
 * src/main.ts, and the `dist/` byte scan chained onto `npm run build`. This
 * config file is never bundled, so importing the module costs a build nothing
 * and ships nothing; what matters is that a build never puts it in `plugins`.
 * (A dynamic `import()` inside the branch would be tidier still, but
 * `--configLoader runner` closes its module runner before the exported function
 * is called, so it fails outright.)
 *
 * The two `forbidDrizzleAtRuntime()` registrations above are left spelled
 * exactly as they were: tests/unit/db/drizzle-is-build-time-only.test.ts asserts
 * on that literal text, and relaxing it to accommodate this change would trade a
 * proven guard for a convenience.
 */
export default defineConfig(({ command }) =>
  command === 'serve'
    ? { ...shared, plugins: [...shared.plugins, aiBridge()] }
    : shared,
);
