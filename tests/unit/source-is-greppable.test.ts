import { execFileSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
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
 * break — and nothing here sees any of that. Every tracked file in this
 * repository is text today, so there is no binary exemption list to get wrong;
 * if one is ever committed (an image, a font) this test is where the exemption
 * has to be argued, deliberately, rather than being assumed.
 */

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

  it('contains no literal NUL byte anywhere', () => {
    const offenders = files
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
