import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import sourceDocument from '../../../docs/srd/SOURCE.md?raw';

/**
 * THE CHECKSUM THAT WOULD HAVE CAUGHT THE TRUNCATED EXTRACT.
 *
 * `docs/srd/SOURCE.md` recorded a SHA-256 for the PDF and for nothing else, and
 * `source/species-descriptions.txt` was nevertheless committed missing the first
 * thirteen lines of printed page 84 — the right-hand column's continuation of
 * Dragonborn, carrying the `Darkvision` and `Draconic Flight` traits. The file
 * said Dragonborn has three traits where the source prints five, and every
 * check in the repository passed: the PDF's checksum says the bytes we sliced
 * FROM are right and says nothing about the range someone sliced OUT of them.
 *
 * So each extract now carries its own SHA-256 in that table, and this test is
 * what makes the record a CLAIM rather than a comment. It reads the table out
 * of the Markdown and hashes the file each row names.
 *
 * IT ALSO ENUMERATES THE DIRECTORY NOW, and the first draft refused to. That
 * refusal argued a checksum is a claim about a NAMED file, so failing on an
 * unlisted one would gate every extract another track adds mid-flight "for a
 * reason that has nothing to do with provenance". The second half is false: an
 * extract with no row in the table has NO provenance, which is exactly this
 * file's subject.
 *
 * The case that changed it is concrete. `main` committed
 * `source/background-descriptions.txt` — page 82, sliced at column 59 — and
 * this track committed `source/backgrounds.txt`, the whole of page 83. They
 * agree on all four backgrounds, so nothing downstream was wrong, but the
 * sliced file carries a slicing artifact: `r-     Tool Proficiency:
 * Calligrapher's Supplies`, where the left column's hyphenated `Calligrapher-`
 * has bled into the value. The full-page extract is therefore the one kept, and
 * under the old rule the loser would have survived the merge as an unparsed,
 * unlisted, unchecked file that still looks authoritative to a reader. It now
 * fails here, by name, until it is deleted.
 *
 * The cost is honest and small: adding an extract means adding its row.
 */

const EXTRACT_ROW =
  /^\|\s*`source\/(?<file>[^`]+)`\s*\|[^|]*\|[^|]*\|\s*`(?<digest>[0-9a-f]{64})`\s*\|/gm;

function extractRows(): { file: string; digest: string }[] {
  return [...sourceDocument.matchAll(EXTRACT_ROW)].map((match) => ({
    file: match.groups?.file as string,
    digest: match.groups?.digest as string,
  }));
}

function sha256(file: string): string {
  const path = fileURLToPath(
    new URL(`../../../docs/srd/source/${file}`, import.meta.url),
  );
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

describe('SRD extract provenance', () => {
  it('records a checksum for every extract the table names', () => {
    const rows = extractRows();
    // Nine rows today. Asserted as a floor rather than an equality so adding an
    // extract does not fail here for the wrong reason — the per-file digests
    // below are what actually bind.
    expect(rows.length).toBeGreaterThanOrEqual(9);
    expect(new Set(rows.map((row) => row.file)).size).toBe(rows.length);
  });

  it('matches the committed bytes of every listed extract', () => {
    for (const row of extractRows()) {
      expect(sha256(row.file), row.file).toBe(row.digest);
    }
  });

  it('leaves no extract on disk without a row in the table', () => {
    const directory = fileURLToPath(
      new URL('../../../docs/srd/source/', import.meta.url),
    );
    const onDisk = readdirSync(directory)
      .filter((entry) => entry.endsWith('.txt'))
      .sort();
    const listed = extractRows()
      .map((row) => row.file)
      .sort();
    // Set equality in both directions: a file with no row has no provenance,
    // and a row with no file is a claim about bytes that are not there.
    expect(onDisk).toEqual(listed);
  });

  it('covers the two extracts the origins catalog is parsed from', () => {
    // Named rather than derived: these are the two files whose truncation this
    // whole arrangement exists to catch, so their coverage is not left to
    // whatever the table happens to contain.
    const listed = extractRows().map((row) => row.file);
    expect(listed).toContain('species-descriptions.txt');
    expect(listed).toContain('backgrounds.txt');
  });

  it('covers the subclass catalog extract by name', () => {
    const listed = extractRows().map((row) => row.file);
    expect(listed).toContain('subclasses.txt');
  });

  it('still records the PDF the extracts were derived from', () => {
    expect(sourceDocument).toContain(
      '8974902d109d6e63672d7c490bde9ccf052410503d9cfa768237154fbc5e3d87',
    );
    expect(sourceDocument).toContain('pdftotext -layout');
  });
});
