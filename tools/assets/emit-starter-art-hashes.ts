/**
 * Renders every starter-art input and writes the digest module the manifest
 * reads. This is the ONE sanctioned regeneration (D516): the pins it replaces
 * described the 1.0.0 silhouettes. It deliberately does not import the
 * manifest, so it can run before the digests exist.
 */
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderPixelArtPng } from '../../src/assets/pixel-art';
import { STARTER_ART_INPUTS } from '../../src/assets/starter-art-inputs';

function sha256(bytes: Uint8Array | string): string {
  return createHash('sha256').update(bytes).digest('hex');
}

export interface StarterArtDigests {
  readonly fixedInputs: string;
  readonly outputs: Readonly<Record<string, string>>;
}

export function computeStarterArtDigests(repositoryRoot: string): StarterArtDigests {
  const inputsSource = readFileSync(resolve(repositoryRoot, 'src/assets/starter-art-inputs.ts'), 'utf8');
  const outputs: Record<string, string> = {};
  for (const entry of STARTER_ART_INPUTS) outputs[entry.id] = sha256(renderPixelArtPng(entry.recipe));
  return { fixedInputs: sha256(inputsSource), outputs };
}

export function renderDigestModule(digests: StarterArtDigests): string {
  const rows = Object.entries(digests.outputs)
    .map(([id, digest]) => `    '${id}': '${digest}',`)
    .join('\n');
  return `/**
 * Output digests of the starter-art generator (D516 regeneration of the
 * pins that named the 1.0.0 silhouettes). Written by
 * \`tools/assets/emit-starter-art-hashes.ts\`; the manifest reads them and the
 * independent oracle in tests/unit/assets/expected-art-hashes.ts must agree.
 */
export const STARTER_ART_OUTPUT_SHA256: {
  readonly fixedInputs: string;
  readonly outputs: Readonly<Record<string, string>>;
} = Object.freeze({
  fixedInputs: '${digests.fixedInputs}',
  outputs: Object.freeze({
${rows}
  }),
});
`;
}

/** vite-node puts its own bin in argv[1], so the CLI is keyed on explicit flags rather than the script path. */
if (process.argv.includes('--write') || process.argv.includes('--print')) {
  const root = resolve(import.meta.dirname, '../..');
  const digests = computeStarterArtDigests(root);
  const module = renderDigestModule(digests);
  if (process.argv.includes('--write')) {
    writeFileSync(resolve(root, 'src/assets/starter-art-output-hashes.ts'), module, 'utf8');
    process.stdout.write(`wrote ${String(Object.keys(digests.outputs).length)} digests; inputs ${digests.fixedInputs}\n`);
  } else {
    process.stdout.write(module);
  }
}
