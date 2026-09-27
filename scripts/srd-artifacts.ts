import {
  parseSrdClassLevelFeatures,
} from '../src/rules/class-level-features-srd-reader';
import {
  deriveSrdClassResourceArtifact,
} from '../src/rules/class-resources-srd-reader';
import {
  deriveSrdSpellCatalogArtifact,
  SRD_SPELL_LISTS,
  type SrdSpellList,
} from '../src/rules/spells-srd-reader';
import {
  deriveBundledCoverageSource,
} from '../src/simulation/coverage-source';

/**
 * THE SRD TEXT IS READ AT BUILD TIME, AND ONLY HERE (plus tests).
 *
 * Every rules module used to import its SRD corpus as a `?raw` string and parse
 * it at module evaluation: in every test process, every engine child, and three
 * shipped app chunks that carried the 2.1 MB full SRD. The parsers now take the
 * text as an argument, and this module runs them once per corpus edit:
 * `npm run srd:artifacts` (scripts/generate-srd-artifacts.ts) writes each
 * artifact below, and the runtime modules read the committed artifacts.
 *
 * An artifact is a typed TypeScript module, never edited by hand. Its data is
 * one JSON literal annotated with the reader's own record type, so tsc checks
 * every generated value against the rules vocabulary (a kind, an ability, a
 * damage type) the moment it is written, and the runtime pays no decode for the
 * unbranded majority. Branded values (class content keys, formula levels and
 * counts) are minted back through their validating constructors by the module
 * that reads the artifact.
 *
 * Each artifact has a drift test that re-derives it from the SRD text with the
 * same readers and fails on any byte difference (`assertSrdArtifactFresh`).
 */

/** The SRD corpora the readers parse. Paths are repository-relative. */
export const SRD_CORPUS_PATHS = {
  fullSrd: 'docs/srd/full/srd-5.2.1.txt',
  spellDescriptions: 'docs/srd/source/spell-descriptions.txt',
  classLevelTables: 'docs/srd/source/class-level-tables.txt',
} as const;

export const SRD_SPELL_LIST_PATHS = {
  Bard: 'docs/srd/source/bard-spell-list.txt',
  Cleric: 'docs/srd/source/cleric-spell-list.txt',
  Druid: 'docs/srd/source/druid-spell-list.txt',
  Paladin: 'docs/srd/source/paladin-spell-list.txt',
  Ranger: 'docs/srd/source/ranger-spell-list.txt',
  Sorcerer: 'docs/srd/source/sorcerer-spell-list.txt',
  Warlock: 'docs/srd/source/warlock-spell-list.txt',
  Wizard: 'docs/srd/source/wizard-spell-list.txt',
} as const satisfies Record<SrdSpellList, string>;

/** Returns a corpus's text by its repository-relative path. */
export type SrdCorpusReader = (path: string) => string;

/** A reader over texts already in hand, as the drift tests hold them. */
export function srdCorpusTexts(
  texts: Readonly<Record<string, string>>,
): SrdCorpusReader {
  return (path) => {
    const text = texts[path];
    if (text === undefined) {
      throw new SrdArtifactError(`${path} was not supplied.`);
    }
    return text;
  };
}

export interface SrdArtifact {
  /** Repository-relative path of the generated module. */
  readonly path: string;
  /** The corpora it is derived from: the only paths its derivation may read. */
  readonly sources: readonly string[];
  /** The reader that derives it, for its header. */
  readonly reader: string;
  /** The drift test that re-derives it, for its header. */
  readonly driftTest: string;
  readonly exportName: string;
  /** The record type the export is annotated with, and where it comes from. */
  readonly type: {
    readonly annotation: string;
    readonly name: string;
    readonly module: string;
  };
  derive(read: SrdCorpusReader): unknown;
}

export const SRD_ARTIFACTS: readonly SrdArtifact[] = [
  {
    path: 'src/rules/generated/class-level-features-srd.ts',
    sources: [SRD_CORPUS_PATHS.classLevelTables],
    reader: 'src/rules/class-level-features-srd-reader.ts',
    driftTest: 'tests/unit/rules/class-level-features-srd-generation.test.ts',
    exportName: 'BUNDLED_SRD_CLASS_LEVEL_FEATURES',
    type: {
      annotation: 'readonly SrdClassLevelFeatures[]',
      name: 'SrdClassLevelFeatures',
      module: '../class-level-features-srd-reader',
    },
    derive: (read) => parseSrdClassLevelFeatures(
      read(SRD_CORPUS_PATHS.classLevelTables),
    ),
  },
  {
    path: 'src/rules/generated/class-resources-srd.ts',
    sources: [SRD_CORPUS_PATHS.classLevelTables, SRD_CORPUS_PATHS.fullSrd],
    reader: 'src/rules/class-resources-srd-reader.ts',
    driftTest: 'tests/unit/rules/class-resources-srd-generation.test.ts',
    exportName: 'BUNDLED_SRD_CLASS_RESOURCES',
    type: {
      annotation: 'SrdClassResourceArtifact',
      name: 'SrdClassResourceArtifact',
      module: '../class-resources-srd-reader',
    },
    derive: (read) => deriveSrdClassResourceArtifact(
      read(SRD_CORPUS_PATHS.fullSrd),
      read(SRD_CORPUS_PATHS.classLevelTables),
    ),
  },
  {
    path: 'src/rules/generated/spells-srd.ts',
    sources: [
      SRD_CORPUS_PATHS.spellDescriptions,
      ...SRD_SPELL_LISTS.map((list) => SRD_SPELL_LIST_PATHS[list]),
    ],
    reader: 'src/rules/spells-srd-reader.ts',
    driftTest: 'tests/unit/rules/spells-srd-generation.test.ts',
    exportName: 'BUNDLED_SRD_SPELL_CATALOG',
    type: {
      annotation: 'SrdSpellCatalogArtifact',
      name: 'SrdSpellCatalogArtifact',
      module: '../spells-srd-reader',
    },
    derive: (read) => deriveSrdSpellCatalogArtifact(
      read(SRD_CORPUS_PATHS.spellDescriptions),
      Object.fromEntries(SRD_SPELL_LISTS.map((list) =>
        [list, read(SRD_SPELL_LIST_PATHS[list])],
      )) as Record<SrdSpellList, string>,
    ),
  },
  {
    path: 'src/simulation/generated/coverage-source.ts',
    sources: [SRD_CORPUS_PATHS.fullSrd, SRD_CORPUS_PATHS.spellDescriptions],
    reader: 'src/simulation/coverage-source.ts',
    driftTest: 'tests/unit/simulation/coverage-source-generation.test.ts',
    exportName: 'BUNDLED_COVERAGE_SOURCE',
    type: {
      annotation: 'BundledCoverageSource',
      name: 'BundledCoverageSource',
      module: '../coverage-source',
    },
    derive: (read) => deriveBundledCoverageSource(
      read(SRD_CORPUS_PATHS.fullSrd),
      read(SRD_CORPUS_PATHS.spellDescriptions),
    ),
  },
];

export function srdArtifact(path: string): SrdArtifact {
  const artifact = SRD_ARTIFACTS.find((candidate) => candidate.path === path);
  if (artifact === undefined) {
    throw new Error(`${path} is not a generated SRD artifact.`);
  }
  return artifact;
}

export class SrdArtifactError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SrdArtifactError';
  }
}

/**
 * Refuses a value JSON would change on the way to the artifact: an `undefined`
 * property (dropped), a non-finite number or -0 (rewritten), a Map, Set or
 * class instance (flattened to `{}`). The artifact must read back as exactly
 * what the reader derived.
 */
function assertJsonFaithful(value: unknown, at: string): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new SrdArtifactError(`${at} is ${String(value)}, which JSON cannot carry.`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      assertJsonFaithful(entry, `${at}[${String(index)}]`);
    });
    return;
  }
  if (typeof value === 'object') {
    const prototype: unknown = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new SrdArtifactError(`${at} is not a plain object.`);
    }
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key !== 'string') {
        throw new SrdArtifactError(`${at} has a symbol key.`);
      }
      assertJsonFaithful(
        (value as Record<string, unknown>)[key],
        `${at}.${key}`,
      );
    }
    return;
  }
  throw new SrdArtifactError(`${at} is a ${typeof value}, which JSON cannot carry.`);
}

const SRD_ATTRIBUTION = [
  'This work includes material from the System Reference Document 5.2.1',
  '("SRD 5.2.1") by Wizards of the Coast LLC, available at',
  'https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative',
  'Commons Attribution 4.0 International License, available at',
  'https://creativecommons.org/licenses/by/4.0/legalcode.',
] as const;

/** The artifact's complete source text, derived from the corpora `read` returns. */
export function composeSrdArtifact(
  artifact: SrdArtifact,
  read: SrdCorpusReader,
): string {
  const value = artifact.derive((path) => {
    if (!artifact.sources.includes(path)) {
      throw new SrdArtifactError(
        `${artifact.path} read ${path}, which is not one of its declared sources.`,
      );
    }
    return read(path);
  });
  assertJsonFaithful(value, artifact.exportName);
  return [
    '// GENERATED FILE — DO NOT EDIT BY HAND.',
    `// Source of truth, read by ${artifact.reader}:`,
    ...artifact.sources.map((source) => `//   ${source}`),
    '// Regenerate with `npm run srd:artifacts`.',
    `// ${artifact.driftTest} fails if it drifts.`,
    '/**',
    ...SRD_ATTRIBUTION.map((line) => ` * ${line}`),
    ' */',
    `import type { ${artifact.type.name} } from '${artifact.type.module}';`,
    '',
    `export const ${artifact.exportName}: ${artifact.type.annotation} = ${JSON.stringify(value, null, 2)};`,
    '',
  ].join('\n');
}

/**
 * The drift check every artifact's test runs: the committed text must be
 * byte-for-byte what the readers derive from the SRD text now.
 */
export function assertSrdArtifactFresh(
  artifact: SrdArtifact,
  read: SrdCorpusReader,
  committed: string,
): void {
  const composed = composeSrdArtifact(artifact, read);
  if (composed === committed) {
    return;
  }
  const composedLines = composed.split('\n');
  const committedLines = committed.split('\n');
  const line = composedLines.findIndex(
    (text, index) => text !== committedLines[index],
  );
  const at = line < 0 ? committedLines.length : line;
  throw new SrdArtifactError(
    `${artifact.path} is stale at line ${String(at + 1)}: the SRD text derives ` +
      `${JSON.stringify(composedLines[at] ?? '<end of file>')}, the committed file has ` +
      `${JSON.stringify(committedLines[at] ?? '<end of file>')}. Run \`npm run srd:artifacts\`; never edit it by hand.`,
  );
}

export interface SrdArtifactFiles {
  read(path: string): string;
  write(path: string, text: string): void;
}

/**
 * Writes every artifact freshly composed from the corpora `files` reads. An
 * artifact already on disk is never consulted: a stale one is overwritten.
 * Returns the paths written, in table order.
 */
export function writeSrdArtifacts(
  files: SrdArtifactFiles,
  artifacts: readonly SrdArtifact[] = SRD_ARTIFACTS,
): readonly string[] {
  const composed = artifacts.map((artifact) => ({
    path: artifact.path,
    text: composeSrdArtifact(artifact, (path) => files.read(path)),
  }));
  for (const { path, text } of composed) {
    files.write(path, text);
  }
  return composed.map(({ path }) => path);
}
