import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeSrdArtifacts } from './srd-artifacts';

/**
 * The only writer of the generated SRD artifacts. Kept deliberately thin so the
 * drift tests can import the composers from `srd-artifacts.ts` without any
 * chance of regenerating the files they check.
 *
 * Run with `npm run srd:artifacts` after any edit to a corpus under docs/srd or
 * to a reader, then commit the regenerated files with that edit.
 */
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const written = writeSrdArtifacts({
  read: (path) => readFileSync(resolve(root, path), 'utf8'),
  write: (path, text) => {
    const absolute = resolve(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, text, 'utf8');
  },
});
for (const path of written) {
  process.stdout.write(`Wrote ${path}\n`);
}
