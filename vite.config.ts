import { defineConfig, type Plugin } from 'vite';
import { realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

export default defineConfig({
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
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
});
