import { defineConfig, type Plugin } from 'vite';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { aiBridge } from './tools/ai-bridge/plugin';

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

const shared = {
  base: './',
  cacheDir:
    process.env.STATIC_APP_CACHE_DIR ??
    join(tmpdir(), 'dnd-multiclass-spells-static-vite'),
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
  },
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
