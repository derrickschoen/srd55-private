import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execPath } from 'node:process';
import { describe, expect, it } from 'vitest';

const PROJECT_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const TSC = fileURLToPath(
  new URL('../../node_modules/typescript/bin/tsc', import.meta.url),
);

function declarationCount(directory: string): number {
  return readdirSync(directory, { withFileTypes: true }).reduce(
    (count, entry) =>
      count +
      (entry.isDirectory()
        ? declarationCount(join(directory, entry.name))
        : Number(entry.name.endsWith('.d.ts'))),
    0,
  );
}

/**
 * `tsc -b` and Vite can consume inferred types that TypeScript cannot name in
 * an emitted declaration. Keep a real declaration emit in the default suite so
 * an exported value cannot quietly expose a module-private symbol or type.
 */
describe('the app has an emit-safe public type surface', () => {
  it('emits declarations with zero compiler errors', () => {
    const outputDirectory = mkdtempSync(
      join(tmpdir(), 'dnd-app-declaration-emit-'),
    );
    const result = spawnSync(
      execPath,
      [
        TSC,
        '--declaration',
        '--emitDeclarationOnly',
        '--noEmit',
        'false',
        '--outDir',
        outputDirectory,
        '-p',
        'tsconfig.app.json',
      ],
      {
        cwd: PROJECT_ROOT,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      },
    );
    const emittedDeclarations = declarationCount(outputDirectory);
    rmSync(outputDirectory, { recursive: true });

    const diagnostics = `${result.stdout}${result.stderr}`;
    const remedy =
      'Declaration emit failed. Export every symbol and type referenced by ' +
      'an exported inferred type; do not weaken brands or suppress the error.';

    expect(result.error, `${remedy}\n${diagnostics}`).toBeUndefined();
    expect(result.signal, `${remedy}\n${diagnostics}`).toBeNull();
    expect(result.status, `${remedy}\n${diagnostics}`).toBe(0);
    expect(diagnostics, remedy).toBe('');
    expect(
      emittedDeclarations,
      'Declaration emit produced no useful output; check tsconfig.app.json.',
    ).toBeGreaterThan(100);
  }, 60_000);
});
