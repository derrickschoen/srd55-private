import { describe, expect, it } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = fileURLToPath(new URL('../../../', import.meta.url));

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

/**
 * `drizzle-orm` and `drizzle-kit` are devDependencies, which is a packaging
 * fact, not an enforcement boundary. The production guard is the
 * `forbid-drizzle-at-runtime` rollup plugin in vite.config.ts, which fails the
 * build. This test is the cheap edit-time companion: it catches a value import
 * before anyone waits for a bundle.
 */
describe('drizzle is build-time only', () => {
  it('never value-imports drizzle from src/', async () => {
    const files = await typeScriptFilesUnder(join(repoRoot, 'src'));
    expect(files.length).toBeGreaterThan(0);

    const offenders: string[] = [];
    for (const file of files) {
      const source = await readFile(file, 'utf8');
      for (const [index, line] of source.split('\n').entries()) {
        // A value import is any `import`/`export ... from 'drizzle-*'` that is
        // not spelled `import type` / `export type`, plus dynamic `import()`.
        const mentionsDrizzle = /['"]drizzle-[a-z-]+/.test(line);
        if (!mentionsDrizzle) {
          continue;
        }
        const isTypeOnly = /^\s*(?:import|export)\s+type\b/.test(line);
        if (!isTypeOnly) {
          offenders.push(
            `${file.slice(repoRoot.length)}:${index + 1}: ${line.trim()}`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('wires the rollup leak guard into BOTH entry graphs', async () => {
    const config = await readFile(join(repoRoot, 'vite.config.ts'), 'utf8');
    // The worker is a separate rollup build with its own plugin pipeline; a
    // top-level registration alone was verified NOT to guard it.
    expect(config).toContain('plugins: [forbidDrizzleAtRuntime()]');
    expect(config).toContain('plugins: () => [forbidDrizzleAtRuntime()]');
  });
});
