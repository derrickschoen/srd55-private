/**
 * The licences have to survive the trip into `dist/`, and the page that offers
 * them has to point at where they actually land. Neither half is provable by
 * running a build in a unit test, so both halves are pinned to the one list
 * that the build reads: `tools/licenses/bundled-license-files.ts`.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  BUNDLED_LICENSE_FILES,
  bundledLicenseAssets,
} from '../../../tools/licenses/bundled-license-files';
import { renderLegalPage } from '../../../src/ui/screens/legal/legal';

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url));

/**
 * The CC-BY-4.0 legalcode as Creative Commons publishes it, retrieved from
 * https://creativecommons.org/licenses/by/4.0/legalcode.txt on 2026-08-13.
 * The licence text is immutable by the licensor's own policy, so this is a
 * fixed identity rather than a snapshot of anything of ours: if the committed
 * file stops matching, the file was edited, not the licence.
 */
const CC_BY_4_0_SHA256 =
  '9ba9550ad48438d0836ddab3da480b3b69ffa0aac7b7878b5a0039e7ab429411';

function repositoryFile(path: string): string {
  return readFileSync(join(repositoryRoot, path), 'utf8');
}

function repositoryFileSha256(path: string): string {
  return createHash('sha256')
    .update(readFileSync(join(repositoryRoot, path)))
    .digest('hex');
}

describe('the licence texts the build ships', () => {
  it('reads every declared source file out of the repository', () => {
    const assets = bundledLicenseAssets(repositoryRoot);

    expect(assets.map((asset) => asset.fileName)).toEqual(
      BUNDLED_LICENSE_FILES.map((file) => file.fileName),
    );
    for (const [index, file] of BUNDLED_LICENSE_FILES.entries()) {
      const emitted = assets[index];
      expect(emitted).toBeDefined();
      expect(new TextDecoder().decode(emitted?.source)).toBe(
        repositoryFile(file.sourcePath),
      );
    }
  });

  it('emits bytes that contain the literal the build guard reads back', () => {
    for (const asset of bundledLicenseAssets(repositoryRoot)) {
      const declared = BUNDLED_LICENSE_FILES.find(
        (file) => file.fileName === asset.fileName,
      );
      expect(declared).toBeDefined();
      expect(new TextDecoder().decode(asset.source)).toContain(
        declared?.literal,
      );
    }
  });

  it('pins the exact sha256 of every declared source file, not just a substring', () => {
    // The literal alone is not enough: the CC-BY legalcode's required title
    // sits 2,982 bytes into an 18,657-byte file, so a copy truncated anywhere
    // after the title would still contain it. This is the digest
    // tools/assert-dist-clean.mjs recomputes from dist/ and compares against
    // its own hand-kept copy of these same values.
    for (const file of BUNDLED_LICENSE_FILES) {
      expect(repositoryFileSha256(file.sourcePath)).toBe(file.sha256);
    }
  });

  it('carries the CC-BY-4.0 legalcode whole, not a summary of it', () => {
    const legalcode = repositoryFile('docs/licenses/CC-BY-4.0.txt');

    // A paraphrase or a truncation is the failure worth catching: the notice
    // the app renders promises these terms, and a partial copy would state
    // obligations the licence does not, or drop ones it does.
    for (const section of [
      'Section 1 -- Definitions.',
      'Section 2 -- Scope.',
      'Section 3 -- License Conditions.',
      'Section 4 -- Sui Generis Database Rights.',
      'Section 5 -- Disclaimer of Warranties and Limitation of Liability.',
      'Section 6 -- Term and Termination.',
      'Section 7 -- Other Terms and Conditions.',
      'Section 8 -- Interpretation.',
    ]) {
      expect(legalcode).toContain(section);
    }
    // Cross-checked against the independently retrieved canonical digest
    // above, not only against the repo's own pin in bundled-license-files.ts —
    // the two are recorded from different sources and agreeing is the proof.
    expect(repositoryFileSha256('docs/licenses/CC-BY-4.0.txt')).toBe(
      CC_BY_4_0_SHA256,
    );
    const ccByEntry = BUNDLED_LICENSE_FILES.find(
      (file) => file.sourcePath === 'docs/licenses/CC-BY-4.0.txt',
    );
    expect(ccByEntry?.sha256).toBe(CC_BY_4_0_SHA256);
  });

  it('is the same list the plain-node build guard enforces', () => {
    const guard = repositoryFile('tools/assert-dist-clean.mjs');

    for (const file of BUNDLED_LICENSE_FILES) {
      expect(guard).toContain(`'${file.fileName}'`);
      expect(guard).toContain(file.sha256);
    }
  });
});

describe('the legal screen points at the licences that ship', () => {
  it('links each bundled licence at the path the build emits it to', () => {
    const markup = renderLegalPage();

    for (const file of BUNDLED_LICENSE_FILES) {
      expect(markup).toContain(`href="./${file.fileName}"`);
    }
  });

  it('links the legalcode from the section that renders the notice', () => {
    const markup = renderLegalPage();
    const noticeSection = /<h2>System Reference Document 5\.2\.1<\/h2>([\s\S]*?)<\/section>/
      .exec(markup)?.[1];

    expect(noticeSection).toBeDefined();
    expect(noticeSection).toContain('href="./licenses/CC-BY-4.0.txt"');
  });
});
