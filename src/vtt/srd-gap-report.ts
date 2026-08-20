import { z } from 'zod';
import { conditionNames } from '../combat/conditions';
import { SPELL_MANIFEST } from '../combat/spells/manifest';
import type { Brand } from '../domain/ids';
import { SRD_CLASS_NAMES } from '../rules/class-traits-srd';

export const engineRefusalReasons = [
  'invalid_party_pack_structure',
  'field_not_in_engine_vocabulary',
  'value_not_in_engine_vocabulary',
  'capability_not_implemented',
  'manifest_spell_not_implemented',
  'non_engine_adjudication_subject',
] as const;

export type EngineRefusalReason = (typeof engineRefusalReasons)[number];
export type EngineVocabularyId = Brand<string, 'EngineVocabularyId'>;

const boundedIdentifierSchema = z.string()
  .min(1)
  .max(200)
  .regex(/^[A-Za-z0-9][A-Za-z0-9:._/-]*$/u);

export const gapReportSchema = z.strictObject({
  packEntry: boundedIdentifierSchema,
  featurePath: boundedIdentifierSchema,
  requestedCapability: boundedIdentifierSchema,
  engineRefusalReason: z.enum(engineRefusalReasons),
});

export interface GapReport extends z.infer<typeof gapReportSchema> {}

const ENGINE_VOCABULARY = new Set<string>([
  'engine:hit-points',
  'engine:position',
  'engine:manual-adjudication',
  ...SRD_CLASS_NAMES.map((name) => `class:${name}`),
  ...conditionNames.map((name) => `condition:${name}`),
  ...SPELL_MANIFEST.map((spell) => `spell:${spell.id}`),
]);

export function isEngineVocabularyId(value: string): value is EngineVocabularyId {
  return ENGINE_VOCABULARY.has(value);
}

export function engineVocabularyId(value: string): EngineVocabularyId {
  if (!isEngineVocabularyId(value)) {
    throw new RangeError(`${value} is not an engine-vocabulary id.`);
  }
  return value;
}

export function createGapReport(value: GapReport): GapReport {
  return Object.freeze(gapReportSchema.parse(value));
}

export function adjudicationSubjectGap(input: {
  readonly target: string;
  readonly subject: string;
}): GapReport | null {
  if (isEngineVocabularyId(input.subject)) return null;
  return createGapReport({
    packEntry: input.target,
    featurePath: 'adjudicated.subject',
    requestedCapability: 'adjudication:external-mechanic',
    engineRefusalReason: 'non_engine_adjudication_subject',
  });
}

export function deduplicateGapReports(reports: readonly GapReport[]): readonly GapReport[] {
  const byIdentity = new Map<string, GapReport>();
  for (const report of reports) {
    const decoded = gapReportSchema.parse(report);
    const key = [
      decoded.packEntry,
      decoded.featurePath,
      decoded.requestedCapability,
      decoded.engineRefusalReason,
    ].join('\u0000');
    byIdentity.set(key, decoded);
  }
  return [...byIdentity.values()];
}
