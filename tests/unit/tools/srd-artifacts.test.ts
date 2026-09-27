import { describe, expect, it } from 'vitest';
import packageJsonText from '../../../package.json?raw';
import classLevelFeaturesDrift from '../rules/class-level-features-srd-generation.test.ts?raw';
import classResourcesDrift from '../rules/class-resources-srd-generation.test.ts?raw';
import spellsDrift from '../rules/spells-srd-generation.test.ts?raw';
import coverageSourceDrift from '../simulation/coverage-source-generation.test.ts?raw';
import generatorSource from '../../../scripts/generate-srd-artifacts.ts?raw';
import {
  assertSrdArtifactFresh,
  composeSrdArtifact,
  SRD_ARTIFACTS,
  SRD_CORPUS_PATHS,
  SRD_SPELL_LIST_PATHS,
  srdArtifact,
  SrdArtifactError,
  srdCorpusTexts,
  writeSrdArtifacts,
  type SrdArtifact,
} from '../../../scripts/srd-artifacts';

/**
 * The generator and the drift check themselves. The per-artifact drift tests
 * prove each committed artifact fresh; these prove the two mechanisms they rest
 * on can fail: the check reports a stale file, and the writer overwrites one.
 * Synthetic artifacts keep them independent of the SRD parse.
 */
function syntheticArtifact(
  path: string,
  derive: SrdArtifact['derive'] = (read) => ({ rows: read('docs/srd/source/probe.txt').split('\n') }),
): SrdArtifact {
  return {
    path,
    sources: ['docs/srd/source/probe.txt'],
    reader: 'src/probe-reader.ts',
    driftTest: 'tests/probe.test.ts',
    exportName: 'PROBE',
    type: { annotation: 'Probe', name: 'Probe', module: '../probe-reader' },
    derive,
  };
}

const probeCorpus = srdCorpusTexts({ 'docs/srd/source/probe.txt': 'alpha\nbeta' });

describe('the SRD artifact drift check', () => {
  const artifact = syntheticArtifact('src/generated/probe.ts');
  const fresh = composeSrdArtifact(artifact, probeCorpus);

  it('accepts the exact composition', () => {
    expect(fresh).toContain('"beta"');
    expect(() => assertSrdArtifactFresh(artifact, probeCorpus, fresh)).not.toThrow();
  });

  it('reports a one-row loss, naming the file and the first differing line', () => {
    // 14 header lines, the export line, `"rows": [`, then the lost row: line 17.
    const lostRow = fresh.replace('    "alpha",\n', '');
    expect(lostRow).not.toBe(fresh);
    expect(() => assertSrdArtifactFresh(artifact, probeCorpus, lostRow)).toThrow(
      new SrdArtifactError(
        'src/generated/probe.ts is stale at line 17: the SRD text derives "    \\"alpha\\",", ' +
          'the committed file has "    \\"beta\\"". Run `npm run srd:artifacts`; never edit it by hand.',
      ),
    );
  });

  it('reports a file the corpus has since moved away from', () => {
    const edited = srdCorpusTexts({ 'docs/srd/source/probe.txt': 'alpha\ngamma' });
    expect(() => assertSrdArtifactFresh(artifact, edited, fresh)).toThrow(SrdArtifactError);
  });
});

describe('the SRD artifact composer', () => {
  it('refuses a derivation that reads a corpus it does not declare', () => {
    const artifact = syntheticArtifact('src/generated/probe.ts', (read) => read(SRD_CORPUS_PATHS.fullSrd));
    expect(() => composeSrdArtifact(artifact, probeCorpus)).toThrow(
      'src/generated/probe.ts read docs/srd/full/srd-5.2.1.txt, which is not one of its declared sources.',
    );
  });

  it.each([
    ['an undefined property', { kept: 1, dropped: undefined }, 'PROBE.dropped is a undefined'],
    ['a negative zero', { value: -0 }, 'PROBE.value is 0, which JSON cannot carry.'],
    ['a Map', { map: new Map([[1, 2]]) }, 'PROBE.map is not a plain object.'],
  ])('refuses %s, which JSON would silently change', (_label, value, message) => {
    const artifact = syntheticArtifact('src/generated/probe.ts', () => value);
    expect(() => composeSrdArtifact(artifact, probeCorpus)).toThrow(message);
  });
});

describe('the SRD artifact writer', () => {
  it('writes each artifact freshly composed over a stale file, reading only the corpora', () => {
    const artifacts = [
      syntheticArtifact('src/generated/first.ts'),
      syntheticArtifact('src/generated/second.ts', (read) => read('docs/srd/source/probe.txt').length),
    ];
    const written = new Map<string, string>();
    const reads: string[] = [];
    const paths = writeSrdArtifacts({
      read: (path) => {
        reads.push(path);
        return path.startsWith('docs/') ? 'alpha\nbeta' : 'STALE';
      },
      write: (path, text) => { written.set(path, text); },
    }, artifacts);
    expect(paths).toEqual(['src/generated/first.ts', 'src/generated/second.ts']);
    expect([...written.keys()]).toEqual(paths);
    for (const artifact of artifacts) {
      expect(written.get(artifact.path)).toBe(composeSrdArtifact(artifact, probeCorpus));
    }
    expect(written.get('src/generated/second.ts')).toContain('export const PROBE: Probe = 10;');
    expect(reads.every((path) => path.startsWith('docs/srd/'))).toBe(true);
  });

  it('writes nothing when one artifact cannot be derived', () => {
    const written: string[] = [];
    expect(() => writeSrdArtifacts({
      read: () => 'alpha',
      write: (path) => { written.push(path); },
    }, [
      syntheticArtifact('src/generated/first.ts'),
      syntheticArtifact('src/generated/broken.ts', () => { throw new SrdArtifactError('broken'); }),
    ])).toThrow('broken');
    expect(written).toEqual([]);
  });

  it('is the one command the repository runs, over the real artifact table', () => {
    const packageJson = JSON.parse(packageJsonText) as {
      readonly scripts: Readonly<Record<string, string>>;
    };
    expect(packageJson.scripts['srd:artifacts']).toBe('vite-node scripts/generate-srd-artifacts.ts');
    expect(generatorSource).toContain('writeSrdArtifacts({');
  });
});

describe('the SRD artifact table', () => {
  const driftTests: Readonly<Record<string, string>> = {
    'tests/unit/rules/class-level-features-srd-generation.test.ts': classLevelFeaturesDrift,
    'tests/unit/rules/class-resources-srd-generation.test.ts': classResourcesDrift,
    'tests/unit/rules/spells-srd-generation.test.ts': spellsDrift,
    'tests/unit/simulation/coverage-source-generation.test.ts': coverageSourceDrift,
  };

  it('generates the four runtime SRD catalogs from exactly their corpora', () => {
    expect(SRD_ARTIFACTS.map((artifact) => [artifact.path, artifact.sources])).toEqual([
      ['src/rules/generated/class-level-features-srd.ts', [SRD_CORPUS_PATHS.classLevelTables]],
      ['src/rules/generated/class-resources-srd.ts', [SRD_CORPUS_PATHS.classLevelTables, SRD_CORPUS_PATHS.fullSrd]],
      ['src/rules/generated/spells-srd.ts', [SRD_CORPUS_PATHS.spellDescriptions, ...Object.values(SRD_SPELL_LIST_PATHS)]],
      ['src/simulation/generated/coverage-source.ts', [SRD_CORPUS_PATHS.fullSrd, SRD_CORPUS_PATHS.spellDescriptions]],
    ]);
    expect(() => srdArtifact('src/rules/generated/nothing.ts')).toThrow(
      'src/rules/generated/nothing.ts is not a generated SRD artifact.',
    );
  });

  it('has a drift test for every artifact that checks that artifact against its committed text', () => {
    for (const artifact of SRD_ARTIFACTS) {
      const test = driftTests[artifact.driftTest];
      expect(test, artifact.driftTest).toBeDefined();
      const fromTest = artifact.path.replace(/^src\/[a-z]+\//u, '');
      expect(test, artifact.driftTest).toContain(`srdArtifact('${artifact.path}')`);
      expect(test, artifact.driftTest).toContain(`${fromTest}?raw';`);
      expect(test, artifact.driftTest).toContain('assertSrdArtifactFresh(artifact, read, committed)');
    }
  });
});
