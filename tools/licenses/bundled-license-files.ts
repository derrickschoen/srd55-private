import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * THE LICENCE TEXTS THAT MUST TRAVEL WITH THE BUILD.
 *
 * A deployed `dist/` is a redistribution of this project, and until now it was
 * the one copy that stated no licence at all: MIT requires "the above copyright
 * notice and this permission notice shall be included in all copies or
 * substantial portions of the Software", and the repository discharged that
 * only for people who cloned the repository. Anyone who received the built app
 * — which is how the app is actually delivered — received it with no notice.
 *
 * CC-BY-4.0 sits beside it for the reason `docs/srd/ATTRIBUTION.md` gives: the
 * notice the legal page renders points at the licence, and pointing at a
 * third-party URL is a link, not a copy. The legalcode ships so the built app
 * carries the terms it is redistributed under rather than depending on
 * creativecommons.org still answering.
 *
 * `sourcePath` is the repository file; the emitted bytes are that file's,
 * unmodified, so the two copies cannot drift and there is nothing to keep in
 * sync by hand. `fileName` is where it lands in `dist/`, and
 * `src/ui/screens/legal/legal.ts` links the CC-BY entry by exactly that path —
 * `tests/unit/licensing/bundled-license-files.test.ts` holds the two together.
 */
export interface BundledLicenseFile {
  /** Path within the build output. */
  readonly fileName: string;
  /** Path within the repository, relative to its root. */
  readonly sourcePath: string;
  /**
   * A distinctive literal the emitted file is expected to contain. Kept for
   * readability and as a secondary, human-legible check
   * (`tests/unit/licensing/bundled-license-files.test.ts`); the build guard's
   * pass/fail decision runs on {@link sha256}, not on this.
   */
  readonly literal: string;
  /**
   * SHA-256 of `sourcePath`'s exact bytes, pinned by hand. This is what makes
   * the build guard catch a truncation a substring check cannot: the required
   * `literal` for the CC-BY legalcode occurs 2,982 bytes into an 18,657-byte
   * file, so a copy cut off anywhere after the title but before the end still
   * contains the literal and would pass a `.includes()` check. Exact-byte
   * comparison closes that gap; `tools/assert-dist-clean.mjs` recomputes this
   * digest from what actually landed in `dist/` and fails the build on any
   * mismatch, truncated or not.
   *
   * RE-PIN PROCEDURE: recompute after any deliberate edit to `sourcePath`
   * (`node -e "console.log(require('node:crypto').createHash('sha256')
   * .update(require('node:fs').readFileSync('LICENSE')).digest('hex'))"`, path
   * adjusted per file) and update both this literal and the hand-kept copy in
   * `tools/assert-dist-clean.mjs`'s `LICENSE_REQUIRED`. An un-re-pinned digest
   * after a real edit is exactly the failure this field exists to produce —
   * treat the build breaking as the correct outcome, not a bug to route
   * around.
   */
  readonly sha256: string;
}

export const BUNDLED_LICENSE_FILES: readonly BundledLicenseFile[] =
  Object.freeze([
    Object.freeze({
      fileName: 'LICENSE.txt',
      sourcePath: 'LICENSE',
      literal: 'MIT License',
      sha256:
        'c2e78021e8fefd24038aa4ead9753f6c568bf0a7fbb667c82b8aeba193772c21',
    }),
    Object.freeze({
      fileName: 'licenses/CC-BY-4.0.txt',
      sourcePath: 'docs/licenses/CC-BY-4.0.txt',
      literal: 'Creative Commons Attribution 4.0 International Public License',
      sha256:
        '9ba9550ad48438d0836ddab3da480b3b69ffa0aac7b7878b5a0039e7ab429411',
    }),
  ]);

export interface BundledLicenseAsset {
  readonly fileName: string;
  readonly source: Uint8Array;
}

/** Reads each licence text as a build asset, ready to be emitted into dist/. */
export function bundledLicenseAssets(
  repositoryRoot: string,
): readonly BundledLicenseAsset[] {
  return BUNDLED_LICENSE_FILES.map((file) => ({
    fileName: file.fileName,
    source: readFileSync(resolve(repositoryRoot, file.sourcePath)),
  }));
}
