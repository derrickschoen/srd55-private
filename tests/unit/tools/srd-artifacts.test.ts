import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import packageJsonText from '../../../package.json?raw';
import classLevelFeaturesDrift from '../rules/class-level-features-srd-generation.test.ts?raw';
import classResourcesDrift from '../rules/class-resources-srd-generation.test.ts?raw';
import spellsDrift from '../rules/spells-srd-generation.test.ts?raw';
import coverageSourceDrift from '../simulation/coverage-source-generation.test.ts?raw';
import artifactsFreshDrift from './srd-artifacts-fresh.test.ts?raw';
import generatorSource from '../../../scripts/generate-srd-artifacts.ts?raw';
import {
  assertSrdArtifactFresh,
  composeSrdArtifact,
  SRD_ARTIFACTS,
  SRD_CORPUS_PATHS,
  SRD_SPELL_LIST_PATHS,
  srdArtifact,
  SrdArtifactError,
  srdCorpusFingerprint,
  srdCorpusTexts,
  writeSrdArtifacts,
  type SrdArtifact,
} from '../../../scripts/srd-artifacts';
import { SRD_CORPUS_TEXTS } from '../../helpers/srd-corpora';
import { declareTestInputs } from '../../helpers/test-inputs';

/**
 * The generator and the drift check themselves. The drift tests prove each
 * committed artifact fresh; these prove the mechanisms they rest on can fail:
 * the check reports a stale file and a changed source, the writer overwrites a
 * stale file, and the generator's own import graph never loads an artifact.
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
    type: { satisfies: 'Probe', names: ['Probe'], module: '../probe-reader' },
    derive,
  };
}

const probeCorpus = srdCorpusTexts({ 'docs/srd/source/probe.txt': 'alpha\nbeta' });

/** `printf 'alpha\nbeta' | sha256sum`, computed outside this code. */
const PROBE_SHA256 = 'bbfb79e82216bd2db1ad2c507d44ddf80aeb12f64f9562056afe93aad43154d9';

describe('the SRD artifact drift check', () => {
  const artifact = syntheticArtifact('src/generated/probe.ts');
  const fresh = composeSrdArtifact(artifact, probeCorpus);

  it('accepts the exact composition', () => {
    expect(fresh).toContain('"beta"');
    expect(() => assertSrdArtifactFresh(artifact, probeCorpus, fresh)).not.toThrow();
  });

  it('reports a one-row loss, naming the file and the first differing line', () => {
    // 15 header lines (fix round 3 added the `deepFreeze` import), the export
    // line, `"rows": [`, then the lost row: line 18.
    const lostRow = fresh.replace('    "alpha",\n', '');
    expect(lostRow).not.toBe(fresh);
    expect(() => assertSrdArtifactFresh(artifact, probeCorpus, lostRow)).toThrow(
      new SrdArtifactError(
        'src/generated/probe.ts is stale at line 18: the SRD text derives "    \\"alpha\\",", ' +
          'the committed file has "    \\"beta\\"". Run `npm run srd:artifacts`; never edit it by hand.',
      ),
    );
  });

  it('reports a file the corpus has since moved away from', () => {
    const edited = srdCorpusTexts({ 'docs/srd/source/probe.txt': 'alpha\ngamma' });
    expect(() => assertSrdArtifactFresh(artifact, edited, fresh)).toThrow(SrdArtifactError);
  });
});

describe('the source pin: a byte the derivation never reads still makes the artifact stale', () => {
  // The derivation reads only the second line, so an edit to the first line
  // changes nothing it produces. Only the header's fingerprint can see it.
  const artifact = syntheticArtifact('src/generated/probe.ts', (read) => ({
    rows: read('docs/srd/source/probe.txt').split('\n').slice(1),
  }));
  const fresh = composeSrdArtifact(artifact, probeCorpus);

  it('pins each source by the sha256 of its bytes', () => {
    expect(fresh.split('\n')[2]).toBe(
      `//   docs/srd/source/probe.txt sha256=${PROBE_SHA256}`,
    );
  });

  it.each([
    ['the first byte', 'Alpha\nbeta'],
    ['a byte in the ignored first line', 'alpHa\nbeta'],
    ['one more trailing byte', 'alpha\nbeta\n'],
  ])('fails on %s, and names the corpus', (_label, text) => {
    const edited = srdCorpusTexts({ 'docs/srd/source/probe.txt': text });
    expect(() => assertSrdArtifactFresh(artifact, edited, fresh)).toThrow(
      `src/generated/probe.ts is stale: docs/srd/source/probe.txt is not the corpus it was generated from (pinned sha256=${PROBE_SHA256}, the corpus is now sha256=`,
    );
  });

  it('would pass the edited-first-line corpus without the pin: its derived data lines are identical', () => {
    const edited = srdCorpusTexts({ 'docs/srd/source/probe.txt': 'alpHa\nbeta' });
    const composed = composeSrdArtifact(artifact, edited).split('\n');
    const committed = fresh.split('\n');
    expect(composed.filter((line, index) => line !== committed[index])).toEqual([
      `//   docs/srd/source/probe.txt sha256=${createHash('sha256').update('alpHa\nbeta').digest('hex')}`,
    ]);
  });

  it('refuses a corpus holding U+FFFD, whose text would no longer determine its bytes', () => {
    expect(() => srdCorpusFingerprint('docs/srd/source/probe.txt', 'al�pha')).toThrow(
      'docs/srd/source/probe.txt holds U+FFFD, so its text no longer determines its bytes; fix its encoding.',
    );
  });

  it('pins every committed corpus by the digest of its bytes on disk', () => {
    const inputs = declareTestInputs({
      srdText: Object.keys(SRD_CORPUS_TEXTS) as `docs/srd/${string}`[],
    });
    for (const [path, text] of Object.entries(SRD_CORPUS_TEXTS)) {
      const bytes = inputs.srdText.readBytes(path as `docs/srd/${string}`);
      expect(srdCorpusFingerprint(path, text), path).toBe(
        createHash('sha256').update(bytes).digest('hex'),
      );
    }
  });
});

describe('the SRD artifact composer', () => {
  it('emits the literal as const satisfies its domain type, never an annotation', () => {
    const artifact = syntheticArtifact('src/generated/probe.ts');
    const text = composeSrdArtifact(artifact, probeCorpus);
    expect(text).toContain("import type { Probe } from '../probe-reader';");
    expect(text).toContain('export const PROBE = {');
    expect(text).toMatch(/\n\} as const satisfies Probe;\ndeepFreeze\(PROBE\);\n$/u);
    expect(text).not.toContain('PROBE: Probe');
  });

  /**
   * FROZEN WHERE IT IS DEFINED (fix round 3, P2): the module's last statement
   * freezes the export with the domain's `deepFreeze`, imported relative to the
   * artifact's own directory. Each specifier below was worked out by hand from
   * the two paths.
   */
  it.each([
    ['src/generated/probe.ts', '../domain/deep-freeze'],
    ['src/rules/generated/probe.ts', '../../domain/deep-freeze'],
    ['src/simulation/generated/probe.ts', '../../domain/deep-freeze'],
    ['src/domain/probe.ts', './deep-freeze'],
  ])('freezes the export with deepFreeze, imported from %s as %s', (path, specifier) => {
    const text = composeSrdArtifact(syntheticArtifact(path), probeCorpus);
    expect(text).toContain([
      ` */`,
      `import { deepFreeze } from '${specifier}';`,
      "import type { Probe } from '../probe-reader';",
      '',
      'export const PROBE = {',
    ].join('\n'));
    expect(text).toMatch(/\n\} as const satisfies Probe;\ndeepFreeze\(PROBE\);\n$/u);
  });

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

describe('the recorded key unions', () => {
  function keyed(value: unknown, satisfies = 'Probe<ProbeKey>'): SrdArtifact {
    return {
      ...syntheticArtifact('src/generated/probe.ts', () => value),
      type: { satisfies, names: ['Probe'], module: '../probe-reader' },
      keyUnions: [{ name: 'ProbeKey', member: 'probe key', rows: ['rows'] }],
    };
  }

  it('emits the recorded keys, in record order, as a literal union the satisfies type names', () => {
    const text = composeSrdArtifact(
      keyed({ rows: [{ content_key: '2024:beta' }, { content_key: '2024:alpha' }] }),
      probeCorpus,
    );
    expect(text).toContain([
      "import type { Probe } from '../probe-reader';",
      '',
      '/** Every probe key this artifact records: the closed set the runtime mints `ContentKey` from. */',
      'export type ProbeKey =',
      '  | "2024:beta"',
      '  | "2024:alpha";',
      '',
      'export const PROBE = {',
    ].join('\n'));
    expect(text).toMatch(/\n\} as const satisfies Probe<ProbeKey>;\ndeepFreeze\(PROBE\);\n$/u);
  });

  it.each([
    ['a key recorded twice', { rows: [{ content_key: 'a' }, { content_key: 'a' }] }, 'PROBE.rows records a content_key twice.'],
    ['a row without a string key', { rows: [{ content_key: 1 }] }, 'PROBE.rows[0] has no string content_key.'],
    ['no rows', { rows: [] }, 'PROBE.rows is not a non-empty array of rows.'],
    ['a path the value does not have', { other: [] }, 'PROBE.rows is not in the derived value.'],
  ])('refuses %s', (_label, value, message) => {
    expect(() => composeSrdArtifact(keyed(value), probeCorpus)).toThrow(new SrdArtifactError(message));
  });

  it('refuses a union its satisfies type does not name, which would leave the contract open', () => {
    expect(() => composeSrdArtifact(keyed({ rows: [{ content_key: 'a' }] }, 'Probe'), probeCorpus)).toThrow(
      new SrdArtifactError('src/generated/probe.ts emits ProbeKey, which its satisfies type does not name.'),
    );
  });

  it('records the five key sets the runtime brands, each instantiating its artifact contract', () => {
    expect(SRD_ARTIFACTS.flatMap((artifact) =>
      (artifact.keyUnions ?? []).map((union) => [artifact.path, union.name, artifact.type.satisfies]),
    )).toEqual([
      ['src/rules/generated/spells-srd.ts', 'BundledSrdSpellContentKeyText', 'SrdSpellCatalogArtifact<BundledSrdSpellContentKeyText>'],
      ['src/rules/generated/armor-srd.ts', 'BundledSrdArmorContentKeyText', 'readonly SrdArmorTemplate<BundledSrdArmorContentKeyText>[]'],
      ['src/rules/generated/origins-srd.ts', 'BundledSrdSpeciesContentKeyText', 'SrdOriginsArtifact<BundledSrdSpeciesContentKeyText, BundledSrdBackgroundContentKeyText>'],
      ['src/rules/generated/origins-srd.ts', 'BundledSrdBackgroundContentKeyText', 'SrdOriginsArtifact<BundledSrdSpeciesContentKeyText, BundledSrdBackgroundContentKeyText>'],
      ['src/rules/generated/weapons-srd.ts', 'BundledSrdWeaponContentKeyText', 'SrdWeaponsArtifact<BundledSrdWeaponContentKeyText>'],
    ]);
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
    expect(written.get('src/generated/second.ts')).toContain('export const PROBE = 10 as const satisfies Probe;\ndeepFreeze(PROBE);');
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

describe('the generator never loads what it generates', () => {
  afterEach(() => {
    for (const artifact of SRD_ARTIFACTS) {
      vi.doUnmock(`../../../${artifact.path}`);
    }
    vi.resetModules();
  });

  it('imports its readers without reaching a generated artifact, so a stale or missing one cannot block regeneration', async () => {
    vi.resetModules();
    const loaded: string[] = [];
    for (const artifact of SRD_ARTIFACTS) {
      vi.doMock(`../../../${artifact.path}`, () => {
        loaded.push(artifact.path);
        return {};
      });
    }
    const generator = await import('../../../scripts/srd-artifacts');
    expect(generator.SRD_ARTIFACTS.map((artifact) => artifact.path)).toEqual(
      SRD_ARTIFACTS.map((artifact) => artifact.path),
    );
    expect(loaded).toEqual([]);
  });
});

describe('the SRD artifact table', () => {
  const driftTests: Readonly<Record<string, string>> = {
    'tests/unit/rules/class-level-features-srd-generation.test.ts': classLevelFeaturesDrift,
    'tests/unit/rules/class-resources-srd-generation.test.ts': classResourcesDrift,
    'tests/unit/rules/spells-srd-generation.test.ts': spellsDrift,
    'tests/unit/simulation/coverage-source-generation.test.ts': coverageSourceDrift,
    'tests/unit/tools/srd-artifacts-fresh.test.ts': artifactsFreshDrift,
  };

  it('generates all eighteen runtime SRD catalogs from exactly their corpora', () => {
    const corpus = SRD_CORPUS_PATHS;
    expect(SRD_ARTIFACTS.map((artifact) => [artifact.path, artifact.sources])).toEqual([
      ['src/rules/generated/class-level-features-srd.ts', [corpus.classLevelTables]],
      ['src/rules/generated/class-resources-srd.ts', [corpus.classLevelTables, corpus.fullSrd]],
      ['src/rules/generated/spells-srd.ts', [corpus.spellDescriptions, ...Object.values(SRD_SPELL_LIST_PATHS)]],
      ['src/simulation/generated/coverage-source.ts', [corpus.fullSrd, corpus.spellDescriptions]],
      ['src/rules/generated/ability-score-generation-srd.ts', [corpus.abilityScoreGeneration]],
      ['src/rules/generated/armor-srd.ts', [corpus.armorTable]],
      ['src/rules/generated/class-choice-entitlements-srd.ts', [corpus.classExpertise, corpus.classSpellReplacement, corpus.classLevelTables]],
      ['src/rules/generated/class-equipment-srd.ts', [corpus.classStartingEquipment, corpus.weaponsTable, corpus.armorTable]],
      ['src/rules/generated/class-traits-srd.ts', [corpus.classCoreTraits, corpus.attackClassFeatures]],
      ['src/rules/generated/draconic-resilience-srd.ts', [corpus.draconicResilience]],
      ['src/rules/generated/extra-attack-srd.ts', [corpus.extraAttackOtherSources]],
      ['src/rules/generated/feats-srd.ts', [corpus.feats]],
      ['src/rules/generated/multiclass-entry-srd.ts', [corpus.multiclassEntryGrants, corpus.classCoreTraits]],
      ['src/rules/generated/origins-srd.ts', [corpus.speciesDescriptions, corpus.backgrounds]],
      ['src/rules/generated/skills.ts', [corpus.skillsTable]],
      ['src/rules/generated/srd-subclasses.ts', [corpus.subclasses]],
      ['src/rules/generated/unarmored-defense-srd.ts', [corpus.unarmoredDefense]],
      ['src/rules/generated/weapons-srd.ts', [corpus.weaponsTable, corpus.weaponMasteryProgression]],
    ]);
    expect(() => srdArtifact('src/rules/generated/nothing.ts')).toThrow(
      'src/rules/generated/nothing.ts is not a generated SRD artifact.',
    );
  });

  it('reads 29 of the 34 SRD corpora; the corpus helper lists exactly the .txt files under docs/srd', () => {
    const onDisk = Object.keys(import.meta.glob('../../../docs/srd/**/*.txt'))
      .map((path) => path.replace(/^(?:\.\.\/){3}/u, ''))
      .sort();
    expect(Object.keys(SRD_CORPUS_TEXTS).sort()).toEqual(onDisk);
    expect(onDisk).toHaveLength(34);
    const read = new Set(SRD_ARTIFACTS.flatMap((artifact) => artifact.sources));
    expect(read.size).toBe(29);
    expect(onDisk.filter((path) => !read.has(path))).toEqual([
      'docs/srd/source/domain-vocabularies.txt',
      'docs/srd/source/multiclassing.txt',
      'docs/srd/source/sheet-math.txt',
      'docs/srd/source/weapon-attack-cantrips.txt',
      'docs/srd/source/weapon-mastery-flat-classes.txt',
    ]);
  });

  it('has a drift test for every artifact that checks that artifact against its committed text', () => {
    for (const artifact of SRD_ARTIFACTS) {
      const test = driftTests[artifact.driftTest];
      expect(test, artifact.driftTest).toBeDefined();
      if (artifact.driftTest === 'tests/unit/tools/srd-artifacts-fresh.test.ts') {
        expect(test).toContain(`../../../${artifact.path}?raw';`);
        expect(test).toContain(`'${artifact.path}': `);
        expect(test).toContain('assertSrdArtifactFresh(artifact, read, committed(artifact))');
      } else {
        expect(test, artifact.driftTest).toContain(
          `${artifact.path.replace(/^src\/[a-z]+\//u, '')}?raw';`,
        );
        expect(test, artifact.driftTest).toContain(`srdArtifact('${artifact.path}')`);
        expect(test, artifact.driftTest).toContain('assertSrdArtifactFresh(artifact, read, committed)');
      }
    }
  });
});
