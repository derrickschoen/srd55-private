import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface CensusReport {
  readonly modules: Readonly<Record<string, {
    readonly class: string;
    readonly sha256: string;
  }>>;
  readonly tests: Readonly<Record<string, {
    readonly unresolved: readonly string[];
  }>>;
}

const digest = (content: string): string =>
  createHash('sha256').update(content).digest('hex');

describe('module-state census', () => {
  it('classifies the four states and records unresolvable dynamic graphs', () => {
    const root = mkdtempSync(join(tmpdir(), 'module-state-census-'));
    mkdirSync(join(root, 'src'), { recursive: true });
    mkdirSync(join(root, 'tests'), { recursive: true });
    const sources = {
      'pure.ts': 'export const answer = 42;\nexport function identity<T>(value: T): T { return value; }\n',
      'cache.ts': [
        'const cache = new Map<string, string>();',
        'export function memo(key: string): string {',
        '  const hit = cache.get(key);',
        '  if (hit !== undefined) return hit;',
        '  cache.set(key, key);',
        '  return key;',
        '}',
        '',
      ].join('\n'),
      'stateful.ts': 'export let current = 0;\n',
      'unknown.ts': 'export const values = [] as const;\n',
    };
    for (const [name, content] of Object.entries(sources)) {
      writeFileSync(join(root, 'src', name), content, 'utf8');
    }
    writeFileSync(join(root, 'tests/classification.test.ts'), [
      "import '../src/pure';",
      "import '../src/cache';",
      "import '../src/stateful';",
      "import '../src/unknown';",
      "const target = '../src/pure';",
      'void import(target);',
      '',
    ].join('\n'), 'utf8');

    execFileSync(
      process.execPath,
      [
        resolve('scripts/module-state-census.mjs'),
        '--root',
        root,
        '--report',
        'reports/census.json',
      ],
      { stdio: 'pipe' },
    );
    const report: CensusReport = JSON.parse(
      readFileSync(join(root, 'reports/census.json'), 'utf8'),
    );

    expect(report.modules).toMatchObject({
      'src/pure.ts': { class: 'PURE', sha256: digest(sources['pure.ts']) },
      'src/cache.ts': {
        class: 'IDEMPOTENT-CACHE',
        sha256: digest(sources['cache.ts']),
      },
      'src/stateful.ts': {
        class: 'STATEFUL',
        sha256: digest(sources['stateful.ts']),
      },
      'src/unknown.ts': {
        class: 'UNKNOWN',
        sha256: digest(sources['unknown.ts']),
      },
    });
    expect(report.tests['tests/classification.test.ts']?.unresolved).toEqual([
      'tests/classification.test.ts -> <dynamic import>',
    ]);
  });
});
