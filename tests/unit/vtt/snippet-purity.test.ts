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
  it('accepts a clean fixture and reports every banned construct in an impure fixture', () => {
    const directory = mkdtempSync(join(tmpdir(), 'snippet-purity-'));
    const snippetDirectory = join(directory, 'src/vtt/snippets');
    mkdirSync(snippetDirectory, { recursive: true });
    const cleanFixturePath = join(snippetDirectory, 'deliberately-clean.ts');
    writeFileSync(cleanFixturePath, [
      "import type { EngineStateCapsule } from '../engine-state-capsule';",
      'export function cleanSnippet(capsule: EngineStateCapsule) {',
      '  return capsule;',
      '}',
    ].join('\n'), 'utf8');

    const badFixture = [
      "import { readFile } from 'node:fs';",
      'export async function badSnippet() {',
      '  Date.now();',
      '  Math.random();',
      '  new Date();',
      "  fetch('https://invalid.example');",
      '  await Promise.resolve();',
      '  while (readFile !== undefined) { break; }',
      '}',
    ].join('\n');
    const badFixturePath = join(snippetDirectory, 'deliberately-bad.ts');
    writeFileSync(badFixturePath, badFixture, 'utf8');

    const scan = (fixtureName: string) => spawnSync('sg', [
      'scan',
      '--rule', resolve('ast-grep-rules/vtt-snippet-purity.yml'),
      `src/vtt/snippets/${fixtureName}`,
      '--color', 'never',
    ], { cwd: directory, encoding: 'utf8' });

    const cleanResult = scan('deliberately-clean.ts');
    expect(cleanResult.status).toBe(0);
    expect(`${cleanResult.stdout}${cleanResult.stderr}`).toBe('');

    const badResult = scan('deliberately-bad.ts');
    const findings = `${badResult.stdout}${badResult.stderr}`;
    expect(badResult.status).not.toBe(0);
    expect(findings).toContain('vtt-snippet-purity');
    for (const bannedConstruct of [
      'Date.now()',
      'Math.random()',
      'new Date()',
      "fetch('https://invalid.example')",
      'await Promise.resolve()',
      'while (readFile !== undefined)',
    ]) {
      expect(findings).toContain(bannedConstruct);
    }
  });
});
