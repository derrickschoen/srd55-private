import { z } from 'zod';
import type { CombatantId } from '../combat/values';
import { sha256 } from '../crypto/sha256';
import {
  verifyEngineStateCapsule,
  type EngineStateCapsule,
} from './engine-state-capsule';
import type { EngineTargetSelector } from './engine-query-port';
import type {
  EngineActionChoice,
  EngineEngagement,
  EngineIntentBranch,
  EngineMovementPreference,
  EngineTurnIntent,
} from './intent-resolver';
import {
  createSnippetRegistry,
  PLAY_NAMES,
  type SnippetSchema,
} from './snippets/registry';

const combatantIdSchema = z.custom<CombatantId>((value) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 200);

const targetSelectorSchema: z.ZodType<EngineTargetSelector> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('combatant'), combatantId: combatantIdSchema }).strict(),
  z.object({ kind: z.literal('nearest_visible_enemy') }).strict(),
  z.object({ kind: z.literal('lowest_hp_visible_enemy') }).strict(),
  z.object({ kind: z.literal('most_injured_visible_ally') }).strict(),
  z.object({ kind: z.literal('current_threat') }).strict(),
  z.object({ kind: z.literal('enemy_threatening_ally'), allyId: combatantIdSchema }).strict(),
]);

const actionChoiceSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('attack'),
    actionId: z.string().min(1).max(200),
    target: targetSelectorSchema,
    resourcePolicy: z.enum(['conserve', 'normal', 'spend_if_useful']).optional(),
  }).strict(),
  z.object({
    kind: z.literal('cast_spell'),
    spellId: z.string().min(1).max(200),
    target: targetSelectorSchema.nullable(),
    slotPolicy: z.enum(['lowest_legal', 'conserve', 'best_effect']).optional(),
  }).strict(),
  z.object({
    kind: z.literal('use_action'),
    actionId: z.string().min(1).max(200),
    target: targetSelectorSchema.nullable(),
  }).strict(),
  z.object({ kind: z.literal('dodge') }).strict(),
  z.object({ kind: z.literal('disengage') }).strict(),
  z.object({ kind: z.literal('dash') }).strict(),
  z.object({ kind: z.literal('end_turn') }).strict(),
]) as unknown as z.ZodType<EngineActionChoice>;

const movementSchema = z.object({
  willingness: z.enum(['none', 'only_if_required', 'for_clear_advantage', 'freely']),
  maximumFeet: z.number().int().min(0).multipleOf(5).optional(),
  opportunityRisk: z.enum(['avoid', 'accept_if_needed', 'accept']),
}).strict() as unknown as z.ZodType<EngineMovementPreference>;

const engagementSchema = z.object({
  stance: z.enum(['hold_position', 'close_to_melee', 'maintain_range', 'withdraw']),
  anchor: targetSelectorSchema.nullable().optional(),
}).strict() as unknown as z.ZodType<EngineEngagement>;

const branchSchema: z.ZodType<EngineIntentBranch> = z.object({
  choice: actionChoiceSchema,
  movement: movementSchema,
  engagement: engagementSchema,
}).strict();

const intentSchema: z.ZodType<EngineTurnIntent> = z.object({
  actorId: combatantIdSchema,
  choice: actionChoiceSchema,
  movement: movementSchema,
  engagement: engagementSchema,
  fallback: branchSchema.nullable(),
}).strict();

const capsuleSchema = z.custom<EngineStateCapsule>((value) => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  try {
    return verifyEngineStateCapsule(value as EngineStateCapsule);
  } catch {
    return false;
  }
});

const outputSchema = z.array(intentSchema).min(1).max(50).readonly();

export const SNIPPET_REGISTRY = createSnippetRegistry({
  inputSchema: capsuleSchema satisfies SnippetSchema<EngineStateCapsule>,
  outputSchema: outputSchema satisfies SnippetSchema<readonly EngineTurnIntent[]>,
  hash: sha256,
});

export { PLAY_NAMES };
export type { AdvertisedPlay, PlayName, SnippetDefinition } from './snippets/registry';
