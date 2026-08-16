import { describe, expect, it } from 'vitest';
import {
  BUNDLED_SRD_5_2_1_PATH,
  bundledSrdPath,
  projectOwnedSourcePath,
} from '../../../src/simulation/contracts';

const TRAVERSAL_MESSAGE =
  'Project-owned source path must be a repository-relative path without traversal.';
const SHAPE_MESSAGE =
  'Project-owned source path must be a nonempty, trimmed string without NUL bytes.';

/**
 * Both rejection arms of {@link projectOwnedSourcePath} throw `TypeError`, so a
 * bare `toThrow()` cannot tell "rejected as a traversal" from "rejected as
 * unregistered". Every near-miss below is a path that only ONE clause of the
 * shape guard rejects, and the message is asserted exactly, so weakening that
 * clause makes the call fall through to the registry check and change the
 * message rather than silently staying red.
 */
const thrownTypeErrorMessage = (act: () => unknown): string => {
  try {
    act();
  } catch (error: unknown) {
    expect(error).toBeInstanceOf(TypeError);
    if (error instanceof Error) {
      return error.message;
    }
    throw new Error('Thrown value was a TypeError without a message.');
  }
  throw new Error('Expected the call to throw, but it returned normally.');
};

describe('bundled SRD path guard near misses', () => {
  it('accepts the one bundled SRD path it is pinned to', () => {
    expect(bundledSrdPath('docs/srd/full/srd-5.2.1.txt')).toBe(
      BUNDLED_SRD_5_2_1_PATH,
    );
  });

  it('rejects sibling paths that differ only in the file name', () => {
    expect(thrownTypeErrorMessage(() =>
      bundledSrdPath('docs/srd/full/srd-5.2.0.txt'),
    )).toBe(`Bundled SRD path must be ${BUNDLED_SRD_5_2_1_PATH}.`);
  });

  it('rejects a path that only differs by a directory level', () => {
    expect(() => bundledSrdPath('docs/srd/srd-5.2.1.txt')).toThrow(TypeError);
    expect(() => bundledSrdPath('')).toThrow(TypeError);
    expect(() => bundledSrdPath(undefined)).toThrow(TypeError);
  });
});

describe('project-owned source path guard near misses', () => {
  it('still accepts the registered repository-relative paths', () => {
    expect(projectOwnedSourcePath('src/simulation/contracts.ts')).toBe(
      'src/simulation/contracts.ts',
    );
    expect(
      projectOwnedSourcePath(
        'docs/design/2026-08-14-dpr-sim-as-app-feature.md',
      ),
    ).toBe('docs/design/2026-08-14-dpr-sim-as-app-feature.md');
  });

  it('labels the shape rejection with the field name', () => {
    expect(thrownTypeErrorMessage(() => projectOwnedSourcePath(''))).toBe(
      SHAPE_MESSAGE,
    );
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath(' src/simulation/contracts.ts'),
      ),
    ).toBe(SHAPE_MESSAGE);
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('src/simulation/contracts.ts\u0000'),
      ),
    ).toBe(SHAPE_MESSAGE);
  });

  it('rejects a POSIX-absolute path as a traversal, not as unregistered', () => {
    // Leading '/' only: no backslash anywhere, no drive letter, no '..'
    // segment, and it does not end in '/'. The absolute-path clause is the
    // only clause that can reject it.
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('/src/simulation/contracts.ts'),
      ),
    ).toBe(TRAVERSAL_MESSAGE);
  });

  it('rejects a forward-slash Windows drive path as a traversal', () => {
    // 'C:/...' trips the drive-letter regex only: it has no backslash and no
    // leading separator, so the other clauses cannot account for it.
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('C:/src/simulation/contracts.ts'),
      ),
    ).toBe(TRAVERSAL_MESSAGE);
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('c:/src/simulation/contracts.ts'),
      ),
    ).toBe(TRAVERSAL_MESSAGE);
  });

  it('rejects an interior backslash as a traversal', () => {
    // No leading separator and no drive letter: only the includes('\\')
    // clause rejects this one.
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('src\\simulation\\contracts.ts'),
      ),
    ).toBe(TRAVERSAL_MESSAGE);
  });

  it('rejects an interior parent segment as a traversal', () => {
    // Only one of several '/'-separated segments is '..', so a guard that
    // demanded every segment be '..' would let this through, as would one
    // that split on '' or compared against ''.
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('src/sim/../simulation/contracts.ts'),
      ),
    ).toBe(TRAVERSAL_MESSAGE);
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('..'),
      ),
    ).toBe(TRAVERSAL_MESSAGE);
  });

  it('does not treat a near-miss parent segment as traversal', () => {
    // '...' and '..foo' are not parent segments; these are rejected by the
    // registry, which pins the equality in `segment === '..'`.
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('src/.../simulation/contracts.ts'),
      ),
    ).toBe(
      'Project-owned source path is not registered: src/.../simulation/contracts.ts.',
    );
  });

  it('names the unregistered path in the registry rejection', () => {
    // Well-formed, repository-relative, traversal-free, and still not ours.
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('src/private-engine/rules.ts'),
      ),
    ).toBe(
      'Project-owned source path is not registered: src/private-engine/rules.ts.',
    );
    expect(
      thrownTypeErrorMessage(() =>
        projectOwnedSourcePath('src/simulation/contracts.tsx'),
      ),
    ).toBe(
      'Project-owned source path is not registered: src/simulation/contracts.tsx.',
    );
  });

  it('rejects inherited Object.prototype keys as unregistered', () => {
    // `Object.hasOwn` rather than `in`: 'toString' is reachable on the
    // registry's prototype but is not a registered source.
    expect(
      thrownTypeErrorMessage(() => projectOwnedSourcePath('toString')),
    ).toBe('Project-owned source path is not registered: toString.');
    expect(
      thrownTypeErrorMessage(() => projectOwnedSourcePath('constructor')),
    ).toBe('Project-owned source path is not registered: constructor.');
  });
});
