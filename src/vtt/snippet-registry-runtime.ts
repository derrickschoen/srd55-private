import { z } from 'zod';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import { verifyEngineStateCapsule, type EngineStateCapsule } from './engine-state-capsule';
import type { EngineOptionId, EngineTurnProposal } from './turn-proposal';
import { createSnippetRegistry, PLAY_NAMES, type SnippetSchema } from './snippets/registry';

const combatantIdSchema = z.custom<CombatantId>((value) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200);
const optionIdSchema = z.custom<EngineOptionId>((value) =>
  typeof value === 'string' && value.startsWith('option:') && value.length <= 200);
const overrideJustificationSchema: z.ZodType<EngineTurnProposal['overrideJustification']> = z.union([
  z.null(),
  z.object({
    reason: z.enum(['morale', 'objective', 'roleplay', 'resource_conservation', 'unknown_engine_gap']),
    note: z.string().min(1).max(500).optional(),
  }).strict().transform((value): NonNullable<EngineTurnProposal['overrideJustification']> =>
    value.note === undefined ? { reason: value.reason } : { reason: value.reason, note: value.note }),
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

export { PLAY_NAMES };
export type { AdvertisedPlay, PlayName, SnippetDefinition } from './snippets/registry';
