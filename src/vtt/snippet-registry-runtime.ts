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
const overrideJustificationValueSchema = z.discriminatedUnion('reason', [
  z.object({
    reason: z.enum(['morale', 'roleplay', 'resource_conservation']),
    note: z.string().min(1).max(500).optional(),
  }).strict(),
  z.object({
    reason: z.literal('objective'),
    playToken: z.string().min(1).max(200).nullable(),
    note: z.string().min(1).max(500).optional(),
  }).strict(),
  z.object({
    reason: z.literal('unknown_engine_gap'),
    metric: z.enum(ENGINE_OPTION_METRICS).nullable(),
    note: z.string().min(1).max(500).optional(),
  }).strict(),
]).transform((value): NonNullable<EngineTurnProposal['overrideJustification']> => {
  if (value.reason === 'objective') return value.note === undefined
    ? { reason: value.reason, playToken: value.playToken === null ? null : enginePlayToken(value.playToken) }
    : { reason: value.reason, playToken: value.playToken === null ? null : enginePlayToken(value.playToken), note: value.note };
  if (value.reason === 'unknown_engine_gap') return value.note === undefined
    ? { reason: value.reason, metric: value.metric }
    : { reason: value.reason, metric: value.metric, note: value.note };
  return value.note === undefined
    ? { reason: value.reason }
    : { reason: value.reason, note: value.note };
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
