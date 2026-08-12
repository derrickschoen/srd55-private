import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const repoRoot = fileURLToPath(new URL('../../', import.meta.url));

/**
 * NO TRACKED FILE MAY CONTAIN A LITERAL NUL BYTE.
 *
 * F14: three source files held one as a composite-key separator, and `grep`
 * treats a file with a NUL in it as BINARY. It then finds nothing in it and
 * does not say why — no "Binary file matches", just exit 1:
 *
 *     $ grep -c "equipment and weapons" src/ui/screens/planner/agent-reference.ts
 *     exit=1
 *     $ grep -ac "equipment and weapons" src/ui/screens/planner/agent-reference.ts
 *     1
 *
 * That cost two false negatives in one tick, to the agent who had just written
 * the guidance files, and it was one step from being recorded as "this string
 * does not exist in src".
 *
 * THE SEPARATOR IS RIGHT AND THIS TEST DOES NOT SECOND-GUESS IT. A NUL is the
 * one byte a user-supplied string cannot contain, so two different pairs cannot
 * collide into one key; `tests/unit/rules/attack-cantrip-key-separator.test.ts`
 * is what pins that property. What this test pins is the SPELLING: written as
 * the six-character escape the string is byte-identical at runtime and the file
 * stays plain text, so the primary discovery tool of the agents this repository
 * is explicitly built to be worked on by keeps working.
 *
 * WHY A DOCUMENTED HAZARD WAS NOT ENOUGH. A note in `.ai/` telling agents to
 * pass `-a` relies on every future agent reading it BEFORE their first grep,
 * and the failure is silent, so whoever has not read it never discovers the
 * mistake. F14 rejected that for exactly this reason.
 *
 * WHAT THIS DOES NOT COVER: only NUL. A file can still be hard to search for
 * other reasons — an escape nobody would guess at, a name split across a line
 * break — and nothing here sees any of that. The binary exemption list below is
 * deliberately narrow, and every addition must be argued here rather than
 * assumed; its own assertions fail when an exemption stops being necessary.
 */

// These are PWA manifest raster icons: binary by nature and never grep targets.
// Their SVG source of truth, public/icons/app-icon.svg, remains text and scanned.
//
// The two zips are the OGL-quarantine archives: the 3.0 and 3.5 SRD
// distributions committed as published (e0b8b373), kept binary so their
// Section 15 provenance can be verified against the originals rather than
// trusted. Nobody greps inside a zip; the working extracts that ARE grep
// targets (srd-3.5/psionic-fist.txt, srd-3.5/Legal.txt, the SOURCE.md files)
// are tracked as plain text and remain scanned. Exemption authorized by
// owner ruling 2026-08-11.
const BINARY_EXEMPT: readonly string[] = [
  'public/icons/app-icon-192.png',
  'public/icons/app-icon-512.png',
  'docs/homebrew/ogl/srd-3.0/SRD-3.0-rtf-PARTIAL.zip',
  'docs/homebrew/ogl/srd-3.5/SRD-3.5-rtf.zip',
];

function trackedFiles(): string[] {
  return execFileSync('git', ['ls-files', '-z'], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split('\0')
    .filter((path) => path !== '');
}

/** Where the NUL bytes are in one buffer, as 1-based line numbers. */
function nulLines(contents: Buffer): number[] {
  const lines: number[] = [];
  let line = 1;
  for (const byte of contents) {
    if (byte === 0x0a) line += 1;
    if (byte === 0x00) lines.push(line);
  }
  return lines;
}

describe('tracked source is greppable', () => {
  const files = trackedFiles();

  it('has files to check', () => {
    // Vacuity guard: a `git ls-files` that returned nothing would make the
    // assertion below pass while proving nothing at all.
    expect(files.length).toBeGreaterThan(100);
    expect(files).toContain('src/ui/screens/planner/agent-reference.ts');
    expect(files).toContain('src/rules/attack-cantrips.ts');
    expect(files).toContain('src/queries/character-sheet-builder.ts');
  });

  it('keeps binary exemptions tracked and genuinely binary', () => {
    for (const file of BINARY_EXEMPT) {
      expect(files).toContain(file);
      expect(readFileSync(join(repoRoot, file)).includes(0x00)).toBe(true);
    }
  });

  it('contains no literal NUL byte anywhere', () => {
    const offenders = files
      .filter((file) => !BINARY_EXEMPT.includes(file))
      .filter((file) => statSync(join(repoRoot, file)).isFile())
      .flatMap((file) => {
        const lines = nulLines(readFileSync(join(repoRoot, file)));
        return lines.length === 0
          ? []
          : [
              `${file}: ${String(lines.length)} NUL byte(s) at line(s) ` +
                `${lines.join(', ')} — write the escape instead`,
            ];
      });
    expect(offenders).toEqual([]);
  });

  it('catches a NUL that has been re-introduced', () => {
    // The guard's own test: prove the detector fires, against a buffer built
    // here. Without it a scanner that silently read nothing would look green.
    const withNul = Buffer.from([0x61, 0x0a, 0x62, 0x00, 0x63]);
    expect(nulLines(withNul)).toEqual([2]);
    expect(nulLines(Buffer.from('a\nb\\u0000c', 'utf8'))).toEqual([]);
  });
});

describe('browser capability is decided before user-agent identification', () => {
  const sourceFiles = (function filesUnder(directory: string): string[] {
    return readdirSync(join(repoRoot, directory), { withFileTypes: true })
      .flatMap((entry) => {
        const relative = join(directory, entry.name);
        return entry.isDirectory()
          ? filesUnder(relative)
          : entry.name.endsWith('.ts')
            ? [relative]
            : [];
      });
  })('src');

  it('BROWSER-PROBE-CAPABILITY-FIRST: keeps navigator and UA reads out of the decision module', () => {
    const capability = readFileSync(
      join(repoRoot, 'src/pwa/browser-capability.ts'),
      'utf8',
    );
    expect(capability).not.toMatch(/\bnavigator\b|\bwindow\b|userAgent/iu);
  });

  it('permits UA reads only at the module that feeds the capability classifier', () => {
    const uaReaders = sourceFiles.flatMap((file) => {
      const source = readFileSync(join(repoRoot, file), 'utf8');
      return /\.(?:userAgent|userAgentData)\b/u.test(source)
        ? [{ file, source }]
        : [];
    });
    expect(uaReaders).toHaveLength(1);
    const boundary = uaReaders[0];
    expect(boundary).toBeDefined();
    expect(boundary?.source).toContain(
      'BROWSER_ENGINE_IDENTIFICATION_BOUNDARY',
    );
    expect(boundary?.source).toContain("from './browser-capability'");
    expect(boundary?.source).toContain('BrowserSupportDecision');
  });
});
