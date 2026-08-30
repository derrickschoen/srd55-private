import { readdirSync, readFileSync } from 'node:fs';
import { resolve, sep } from 'node:path';

const testInputBrand: unique symbol = Symbol('test-input');
const recorderStateSymbol = Symbol.for('dnd.verdict-fs-recorder');

type FixturePath = `tests/fixtures/${string}`;
type SchemaSqlPath =
  | `drizzle/${string}.sql`
  | `src/db/${string}.sql`
  | `tests/fixtures/${string}.sql`;
type SrdTextPath = `docs/srd/${string}`;
type GuidePath = `docs/guides/${string}`;
type PublicDataPath = `public/${string}`;
type ContentPath = `content/${string}`;
type ContentDirectoryPath = `content/${string}`;

export interface TestInputSpec {
  readonly fixtures?: readonly FixturePath[];
  readonly schemaSql?: readonly SchemaSqlPath[];
  readonly srdText?: readonly SrdTextPath[];
  readonly guides?: readonly GuidePath[];
  readonly publicData?: readonly PublicDataPath[];
  readonly content?: readonly ContentPath[];
  readonly contentDirectories?: readonly ContentDirectoryPath[];
}

type TestInputCategory = Exclude<keyof TestInputSpec, 'contentDirectories'>;
type DeclaredPath<
  Spec extends TestInputSpec,
  Category extends TestInputCategory,
> = Spec[Category] extends readonly (infer Path extends string)[] ? Path : never;
type DeclaredContentDirectory<Spec extends TestInputSpec> =
  Spec['contentDirectories'] extends readonly (infer Path extends string)[] ? Path : never;

export type TestInputText<
  Category extends TestInputCategory,
  Path extends string,
> = string & {
  readonly [testInputBrand]: {
    readonly category: Category;
    readonly path: Path;
  };
};

export type TestInputBytes<
  Category extends TestInputCategory,
  Path extends string,
> = Uint8Array & {
  readonly [testInputBrand]: {
    readonly category: Category;
    readonly path: Path;
  };
};

export type TestInputDirectoryEntries<Path extends string> = readonly string[] & {
  readonly [testInputBrand]: {
    readonly category: 'contentDirectories';
    readonly path: Path;
  };
};

export interface DeclaredInputReader<
  Category extends TestInputCategory,
  Path extends string,
> {
  readText<Selected extends Path>(
    path: Selected,
    encoding?: 'utf8',
  ): TestInputText<Category, Selected>;
  readBytes<Selected extends Path>(path: Selected): TestInputBytes<Category, Selected>;
}

export interface DeclaredContentDirectoryReader<Path extends string> {
  list<Selected extends Path>(path: Selected): TestInputDirectoryEntries<Selected>;
}

export type DeclaredTestInputs<Spec extends TestInputSpec> = {
  readonly [Category in TestInputCategory]: DeclaredInputReader<
    Category,
    DeclaredPath<Spec, Category>
  >;
} & {
  readonly contentDirectories: DeclaredContentDirectoryReader<DeclaredContentDirectory<Spec>>;
};

interface RecorderFileState {
  declaredInputs?: Set<string>;
  readonly testFile: string;
}

interface RecorderState {
  current?: RecorderFileState;
}

const categoryPrefixes = {
  fixtures: ['tests/fixtures/'],
  schemaSql: ['drizzle/', 'src/db/', 'tests/fixtures/'],
  srdText: ['docs/srd/'],
  guides: ['docs/guides/'],
  publicData: ['public/'],
  content: ['content/'],
} as const satisfies Record<TestInputCategory, readonly string[]>;

function repositoryRoot(): string {
  return process.env.VERDICT_REPOSITORY_ROOT ?? process.cwd();
}

function validatePath(category: TestInputCategory, path: string): void {
  const prefixes = categoryPrefixes[category];
  const hasAllowedPrefix = prefixes.some((prefix) => path.startsWith(prefix));
  if (
    !hasAllowedPrefix ||
    path.includes('\\') ||
    path.split('/').includes('..') ||
    (category === 'schemaSql' && !path.endsWith('.sql'))
  ) {
    throw new TypeError(`Invalid ${category} test input path: ${path}`);
  }
}

function absoluteInputPath(path: string): string {
  const root = resolve(repositoryRoot());
  const absolute = resolve(root, path);
  if (absolute === root || !absolute.startsWith(`${root}${sep}`)) {
    throw new TypeError(`Test input escapes the repository: ${path}`);
  }
  return absolute;
}

function validateContentDirectoryPath(path: string): void {
  if (
    !path.startsWith('content/') ||
    path === 'content/' ||
    path.endsWith('/') ||
    path.includes('\\') ||
    path.split('/').includes('..')
  ) {
    throw new TypeError(`Invalid content test input directory: ${path}`);
  }
}

function reader<
  Category extends TestInputCategory,
  Path extends string,
>(category: Category, allowed: ReadonlySet<string>): DeclaredInputReader<Category, Path> {
  const assertAllowed = (path: string): void => {
    if (!allowed.has(path)) {
      throw new TypeError(`Undeclared ${category} test input: ${path}`);
    }
  };
  return {
    readText<Selected extends Path>(path: Selected): TestInputText<Category, Selected> {
      assertAllowed(path);
      return readFileSync(absoluteInputPath(path), 'utf8') as TestInputText<Category, Selected>;
    },
    readBytes<Selected extends Path>(path: Selected): TestInputBytes<Category, Selected> {
      assertAllowed(path);
      return new Uint8Array(readFileSync(absoluteInputPath(path))) as TestInputBytes<Category, Selected>;
    },
  };
}

function contentDirectoryReader<Path extends string>(
  allowed: ReadonlySet<string>,
): DeclaredContentDirectoryReader<Path> {
  return {
    list<Selected extends Path>(path: Selected): TestInputDirectoryEntries<Selected> {
      if (!allowed.has(path)) {
        throw new TypeError(`Undeclared content test input directory: ${path}`);
      }
      return readdirSync(absoluteInputPath(path), { encoding: 'utf8' }) as unknown as
        TestInputDirectoryEntries<Selected>;
    },
  };
}

/**
 * Declares every stable repository input a test file may read. The returned
 * readers accept only paths enumerated in this spec, and recording runs attach
 * the declaration to the recorder state for the current test file.
 */
export function declareTestInputs<const Spec extends TestInputSpec>(
  spec: Spec,
): DeclaredTestInputs<Spec> {
  const byCategory = {
    fixtures: new Set<string>(spec.fixtures ?? []),
    schemaSql: new Set<string>(spec.schemaSql ?? []),
    srdText: new Set<string>(spec.srdText ?? []),
    guides: new Set<string>(spec.guides ?? []),
    publicData: new Set<string>(spec.publicData ?? []),
    content: new Set<string>(spec.content ?? []),
  } satisfies Record<TestInputCategory, Set<string>>;
  const contentDirectories = new Set<string>(spec.contentDirectories ?? []);

  const declared = new Set<string>();
  for (const category of Object.keys(byCategory) as TestInputCategory[]) {
    for (const path of byCategory[category]) {
      validatePath(category, path);
      const observation = `file:${path}`;
      if (declared.has(observation)) {
        throw new TypeError(`Test input is declared more than once: ${path}`);
      }
      declared.add(observation);
    }
  }
  for (const path of contentDirectories) {
    validateContentDirectoryPath(path);
    const observation = `directory:${path}`;
    if (declared.has(observation)) {
      throw new TypeError(`Test input directory is declared more than once: ${path}`);
    }
    declared.add(observation);
  }

  const recorder = (globalThis as typeof globalThis & {
    [recorderStateSymbol]?: RecorderState;
  })[recorderStateSymbol];
  if (recorder?.current !== undefined) {
    if (recorder.current.declaredInputs !== undefined) {
      throw new Error(`Test inputs were already declared for ${recorder.current.testFile}.`);
    }
    recorder.current.declaredInputs = declared;
  }

  return {
    fixtures: reader('fixtures', byCategory.fixtures),
    schemaSql: reader('schemaSql', byCategory.schemaSql),
    srdText: reader('srdText', byCategory.srdText),
    guides: reader('guides', byCategory.guides),
    publicData: reader('publicData', byCategory.publicData),
    content: reader('content', byCategory.content),
    contentDirectories: contentDirectoryReader(contentDirectories),
  } as DeclaredTestInputs<Spec>;
}
