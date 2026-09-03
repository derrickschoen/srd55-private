import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import type {
  AiDmKbBundle,
  KbSubject,
  RepoRelativeKbPath,
} from '../knowledge-base-contract';
import { KB_SUBJECTS } from '../knowledge-base-contract';

export const KB_READ_LIMIT = 2 as const;

export type KbReadOrdinal = 1 | 2;
export type KbReadCallPhase = 'initial' | 'correction' | 'adjustment';

export interface KbReadRecord {
  readonly subject: KbSubject;
  readonly repoRelativePath: RepoRelativeKbPath;
  readonly sha256: string;
  readonly byteCount: number;
  readonly ordinal: KbReadOrdinal;
  readonly callPhase: KbReadCallPhase;
}

export interface KbSubjectSource {
  readonly repoRelativePath: RepoRelativeKbPath;
  readonly absolutePath: string;
  readonly sha256: string;
  readonly byteCount: number;
}

export type KbSubjectSources = Readonly<Record<KbSubject, KbSubjectSource>>;

export interface KbReadSuccess {
  readonly kind: 'kb_subject';
  readonly subject: KbSubject;
  readonly text: string;
  readonly sha256: string;
  readonly byteCount: number;
}

export interface KbReadBudgetExhausted {
  readonly kind: 'kb_read_budget_exhausted';
  readonly allowed: typeof KB_READ_LIMIT;
}

export type KbReadResult = KbReadSuccess | KbReadBudgetExhausted;

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function assertInitialRecords(records: readonly KbReadRecord[]): void {
  if (records.length > KB_READ_LIMIT || records.some((record, index) => record.ordinal !== index + 1)) {
    throw new TypeError('KB read records must contain at most two consecutive ordinals.');
  }
}

export class KbReadBudget {
  readonly #sources: KbSubjectSources;
  readonly #records: KbReadRecord[];
  readonly #onRead: (record: KbReadRecord) => void;

  constructor(
    sources: KbSubjectSources,
    initialRecords: readonly KbReadRecord[] = [],
    onRead: (record: KbReadRecord) => void = () => undefined,
  ) {
    assertInitialRecords(initialRecords);
    this.#sources = sources;
    this.#records = initialRecords.map((record) => structuredClone(record));
    this.#onRead = onRead;
  }

  read(subject: KbSubject, callPhase: KbReadCallPhase): KbReadResult {
    if (this.#records.length >= KB_READ_LIMIT) {
      return { kind: 'kb_read_budget_exhausted', allowed: KB_READ_LIMIT };
    }
    const source = this.#sources[subject];
    const bytes = readFileSync(source.absolutePath);
    const actualHash = sha256(bytes);
    if (bytes.byteLength !== source.byteCount || actualHash !== source.sha256) {
      throw new TypeError(`KB subject ${subject} no longer matches its launcher-pinned bytes.`);
    }
    const ordinal = (this.#records.length + 1) as KbReadOrdinal;
    const record: KbReadRecord = {
      subject,
      repoRelativePath: source.repoRelativePath,
      sha256: source.sha256,
      byteCount: source.byteCount,
      ordinal,
      callPhase,
    };
    this.#onRead(record);
    this.#records.push(record);
    return {
      kind: 'kb_subject',
      subject,
      text: bytes.toString('utf8'),
      sha256: source.sha256,
      byteCount: source.byteCount,
    };
  }

  records(): readonly KbReadRecord[] {
    return this.#records.map((record) => structuredClone(record));
  }
}

export function kbSubjectSources(bundle: AiDmKbBundle): KbSubjectSources {
  return Object.fromEntries(KB_SUBJECTS.map((subject) => {
    const component = bundle.subjects[subject];
    return [subject, {
      repoRelativePath: component.repoRelativePath,
      absolutePath: component.absolutePath,
      sha256: component.sha256,
      byteCount: component.byteCount,
    }];
  })) as unknown as KbSubjectSources;
}

export function isKbSubjectSources(value: unknown): value is KbSubjectSources {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const sources = value as Readonly<Record<string, unknown>>;
  return Object.keys(sources).length === KB_SUBJECTS.length && KB_SUBJECTS.every((subject) => {
    const candidate = sources[subject];
    if (typeof candidate !== 'object' || candidate === null || Array.isArray(candidate)) return false;
    const source = candidate as Readonly<Record<string, unknown>>;
    return typeof source['repoRelativePath'] === 'string' && source['repoRelativePath'].length > 0 &&
      typeof source['absolutePath'] === 'string' && source['absolutePath'].length > 0 &&
      typeof source['sha256'] === 'string' && /^[a-f0-9]{64}$/u.test(source['sha256']) &&
      typeof source['byteCount'] === 'number' && Number.isSafeInteger(source['byteCount']) &&
      source['byteCount'] >= 0;
  });
}

export function isKbReadRecord(value: unknown): value is KbReadRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const record = value as Readonly<Record<string, unknown>>;
  return KB_SUBJECTS.some((subject) => subject === record['subject']) &&
    typeof record['repoRelativePath'] === 'string' &&
    typeof record['sha256'] === 'string' && /^[a-f0-9]{64}$/u.test(record['sha256']) &&
    typeof record['byteCount'] === 'number' && Number.isSafeInteger(record['byteCount']) &&
    (record['ordinal'] === 1 || record['ordinal'] === 2) &&
    (record['callPhase'] === 'initial' || record['callPhase'] === 'correction' ||
      record['callPhase'] === 'adjustment');
}

export function decodeKbReadRecords(source: string): readonly KbReadRecord[] {
  const records = source.split('\n').filter((line) => line.trim().length > 0)
    .map((line): unknown => JSON.parse(line) as unknown);
  if (!records.every(isKbReadRecord)) throw new TypeError('KB read spool contains an invalid record.');
  assertInitialRecords(records);
  return records.map((record) => structuredClone(record));
}
