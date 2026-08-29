import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  writeFileSync,
} from '../../helpers/test-filesystem';

describe('VTT snippet ast-grep purity rule', () => {
  it('rejects a deliberately impure in-memory fixture without storing it in the snippet registry', () => {
    const directory = mkdtempSync(join(tmpdir(), 'snippet-purity-'));
    const snippetDirectory = join(directory, 'src/vtt/snippets');
    mkdirSync(snippetDirectory, { recursive: true });
    const fixture = [
      "import { readFile } from 'node:fs';",
      'export async function badSnippet() {',
      "  Date.now(); Math.random(); new Date(); await fetch('https://invalid.example');",
      '  while (readFile !== undefined) { break; }',
      '}',
    ].join('\n');
    const fixturePath = join(snippetDirectory, 'deliberately-bad.ts');
    writeFileSync(fixturePath, fixture, 'utf8');

    const result = spawnSync('sg', [
      'scan',
      '--rule', resolve('ast-grep-rules/vtt-snippet-purity.yml'),
      'src/vtt/snippets/deliberately-bad.ts',
      '--color', 'never',
    ], { cwd: directory, encoding: 'utf8' });
    expect(result.status).toBe(1);
    expect(`${result.stdout}${result.stderr}`).toContain('vtt-snippet-purity');
  });
});
