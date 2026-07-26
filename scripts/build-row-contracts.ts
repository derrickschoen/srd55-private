import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  composeColumnFacts,
  composeReferenceFacts,
} from './compose-row-contracts';

/**
 * The only writer of the generated schema-fact artifacts. Kept deliberately
 * thin so `tests/unit/contracts/column-facts-generation.test.ts` can import the
 * composers without any chance of regenerating the files it checks.
 *
 * Run with `npm run db:contracts`.
 */
const ARTIFACTS = [
  {
    path: fileURLToPath(
      new URL(
        '../src/domain/contracts/generated/column-facts.ts',
        import.meta.url,
      ),
    ),
    compose: composeColumnFacts,
  },
  {
    path: fileURLToPath(
      new URL(
        '../src/domain/contracts/generated/reference-facts.ts',
        import.meta.url,
      ),
    ),
    compose: composeReferenceFacts,
  },
] as const;

for (const artifact of ARTIFACTS) {
  const source = artifact.compose();
  await writeFile(artifact.path, source, 'utf8');
  process.stdout.write(`Wrote ${artifact.path} (${source.length} bytes)\n`);
}
