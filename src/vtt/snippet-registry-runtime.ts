import { z } from 'zod';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import { verifyEngineStateCapsule, type EngineStateCapsule } from './engine-state-capsule';
import {
  ENGINE_OPTION_METRICS,
  enginePlayToken,
  type EngineOptionId,
  type EngineTurnProposal,
} from './turn-proposal';
import { createSnippetRegistry, PLAY_NAMES, SKILL_NAMES, type SnippetSchema } from './snippets/registry';

const combatantIdSchema = z.custom<CombatantId>((value) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200);
const optionIdSchema = z.custom<EngineOptionId>((value) =>
  typeof value === 'string' && value.startsWith('option:') && value.length <= 200);
const overrideJustificationValueSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.enum(['objective', 'morale', 'roleplay', 'resource_conservation', 'unknown_engine_gap']),
  }).strict(),
  z.object({
    kind: z.literal('engine_play'),
    token: z.string().min(1).max(200).nullable(),
  }).strict(),
  z.object({
    kind: z.literal('missing_metric'),
    id: z.enum(ENGINE_OPTION_METRICS).nullable(),
  }).strict(),
]).transform((value): NonNullable<EngineTurnProposal['overrideJustification']> => {
  if (value.kind === 'engine_play') {
    return { kind: value.kind, token: value.token === null ? null : enginePlayToken(value.token) };
  }
  return value;
});
const overrideJustificationSchema = z.union([
  z.null(),
  overrideJustificationValueSchema,
]);

const proposalSchema: z.ZodType<EngineTurnProposal> = z.object({
  actorId: combatantIdSchema,
  expectedRevision: z.number().int().min(0),
  primaryOptionId: optionIdSchema,
  fallbackOptionId: optionIdSchema.nullable(),
  reason: z.string().min(1).max(240).refine((value) => value.trim().length > 0),
  overrideJustification: overrideJustificationSchema,
}).strict();

const capsuleSchema = z.custom<EngineStateCapsule>((value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  try {
    return verifyEngineStateCapsule(value as EngineStateCapsule);
  } catch {
    return false;
  }
});

const outputSchema = z.array(proposalSchema).min(1).max(50).readonly();

export const SNIPPET_REGISTRY = createSnippetRegistry({
  inputSchema: capsuleSchema satisfies SnippetSchema<EngineStateCapsule>,
  outputSchema: outputSchema satisfies SnippetSchema<readonly EngineTurnProposal[]>,
  hash: sha256,
});

export { PLAY_NAMES, SKILL_NAMES };
export type {
  AdvertisedPlay,
  AdvertisedSkill,
  LoadedSkill,
  PlayName,
  PlayShadowIssue,
  PlayShadowRun,
  SkillName,
  SnippetDefinition,
} from './snippets/registry';
