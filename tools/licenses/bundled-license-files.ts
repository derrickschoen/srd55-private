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
   * A distinctive literal the emitted file must contain. The build guard reads
   * it back out of `dist/`, so an emitter that shipped an empty or truncated
   * file fails the build instead of passing it.
   */
  readonly literal: string;
}

export const BUNDLED_LICENSE_FILES: readonly BundledLicenseFile[] =
  Object.freeze([
    Object.freeze({
      fileName: 'LICENSE.txt',
      sourcePath: 'LICENSE',
      literal: 'MIT License',
    }),
    Object.freeze({
      fileName: 'licenses/CC-BY-4.0.txt',
      sourcePath: 'docs/licenses/CC-BY-4.0.txt',
      literal: 'Creative Commons Attribution 4.0 International Public License',
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
