import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildTwoRoomFixtures } from '../../src/vtt/handoff/fixtures/two-room';

export const FIXTURE_FILES = {
  source: 'fixtures/scenes/two-room.v1.json',
  snapshots: 'fixtures/scenes/two-room.snapshots.v1.json',
} as const;

function encoded(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function generateTwoRoomFixtureFiles(options: { readonly check: boolean; readonly root?: string }): void {
  const root = options.root ?? process.cwd();
  const fixtures = buildTwoRoomFixtures();
  for (const [key, relative] of Object.entries(FIXTURE_FILES) as readonly (readonly [keyof typeof FIXTURE_FILES, string])[]) {
    const destination = resolve(root, relative);
    const expected = encoded(fixtures[key]);
    if (options.check) {
      let actual: string;
      try { actual = readFileSync(destination, 'utf8'); } catch { throw new Error(`FIXTURE_MISSING: ${relative}`); }
      if (actual !== expected) throw new Error(`FIXTURE_OUT_OF_DATE: ${relative}`);
    } else {
      mkdirSync(dirname(destination), { recursive: true });
      writeFileSync(destination, expected);
    }
  }
}

if (process.argv[1] !== undefined && fileURLToPath(import.meta.url) === process.argv[1]) {
  generateTwoRoomFixtureFiles({ check: process.argv.includes('--check') });
}
