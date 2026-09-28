/** The verdict cache `npm run test:affected` keeps; tests pass their own `cacheRoot`. */
export const CACHE_ROOT: string;

/** A test file's static module closure (repository paths) and the references that make it fail closed. */
export interface ClosureGraph {
  readonly closure: readonly string[];
  readonly unresolved: readonly string[];
}

/** One test file's record from the verdict recorder (`tests/helpers/verdict-fs-recorder-setup.mjs`). */
export interface ObservationRecord {
  readonly version: number;
  readonly testFile: string;
  readonly observedInputs: readonly string[];
  readonly externalInputs: readonly string[];
  readonly declaredInputs?: readonly string[];
  /** Every process.env variable the file's tests read, by name; each keys its verdict by value. */
  readonly environmentInputs: readonly string[];
  /** The file enumerated process.env, which fails it closed. */
  readonly environmentEnumerated: boolean;
}

export interface VerdictEntry {
  readonly testFile: string;
  readonly digest: string;
  readonly closure: readonly string[];
  readonly observedInputs: readonly string[];
  readonly declaredInputs: readonly string[];
  readonly environmentInputs: readonly string[];
  readonly testCount: number;
}

export function buildClosure(testFile: string): ClosureGraph;
/**
 * The salt that keys every verdict. It hashes the bytes of `walker` (the
 * runner by default; a test passes a stand-in) and of every module it loads,
 * and the module inventory of `repository` (this checkout by default).
 */
export function globalSalt(walker?: string, repository?: string): string;
/** The repository paths of `walker` (the runner by default) and of every module it loads. */
export function walkerSources(walker?: string): readonly string[];
/**
 * The hash of every non-directory entry (a link with its target) below the
 * module inventory roots of `repository` (this checkout by default), less
 * TRANSIENT_PROBES, that keys the global salt.
 */
export function moduleInventory(repository?: string): string;
/** The absolute paths of the test files test:affected runs, sorted; none lies in TRANSIENT_PROBES. */
export function testFiles(): readonly string[];
export function observationRecord(record: unknown): ObservationRecord | undefined;
export function failClosedReasons(
  graph: ClosureGraph | undefined, record: ObservationRecord | undefined,
): readonly string[];
export function storeVerdict(options: {
  readonly testFile: string;
  readonly graph: ClosureGraph;
  readonly record: ObservationRecord;
  readonly testCount: number;
  readonly salt: string;
  readonly cacheRoot: string;
}): string | undefined;
export function cachedVerdict(testFile: string, salt: string, cacheRoot: string): VerdictEntry | undefined;
