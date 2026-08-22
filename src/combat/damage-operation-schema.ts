import { z } from 'zod';
import { abilities, creatureSizes, damageTypes } from '../domain/enums';
import { conditionNames } from './conditions';

const integer = z.number().int().safe();
const nonNegative = integer.min(0).max(1_000_000);
const positive = integer.min(1).max(1_000_000);
const dieSides = integer.min(2).max(100);
const nonExhaustionConditions = conditionNames.filter((condition) => condition !== 'Exhaustion');

export const operationDiceSchema = z.strictObject({
  baseCount: nonNegative.max(100),
  sides: dieSides,
  modifier: integer.min(-100_000).max(100_000),
  perSlotCount: nonNegative.max(100),
  perSlotModifier: integer.min(-100_000).max(100_000),
  cantripUpgrade: z.boolean(),
  minimumTotal: nonNegative.optional(),
  maximumTotal: nonNegative.optional(),
  rerollBelow: z.strictObject({
    threshold: integer.min(2).max(100),
    maximumRerollsPerDie: z.literal(1),
  }).optional(),
}).superRefine((dice, context) => {
  if (
    dice.minimumTotal !== undefined &&
    dice.maximumTotal !== undefined &&
    dice.minimumTotal > dice.maximumTotal
  ) {
    context.addIssue({ code: 'custom', message: 'Minimum damage cannot exceed maximum damage.' });
  }
  if (dice.rerollBelow !== undefined && dice.rerollBelow.threshold > dice.sides) {
    context.addIssue({ code: 'custom', message: 'Reroll threshold cannot exceed the die size.' });
  }
});

const damageTypeOperationSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('fixed'), damageType: z.enum(damageTypes) }),
  z.strictObject({
    kind: z.literal('conversion'),
    from: z.enum(damageTypes),
    to: z.enum(damageTypes),
  }),
]).superRefine((operation, context) => {
  if (operation.kind === 'conversion' && operation.from === operation.to) {
    context.addIssue({ code: 'custom', message: 'Damage conversion must change the damage type.' });
  }
});

const sizeDiceShape = Object.fromEntries(
  creatureSizes.map((size) => [size, nonNegative.max(100)]),
) as Record<(typeof creatureSizes)[number], typeof nonNegative>;

const targetScalingSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('none') }),
  z.strictObject({
    kind: z.literal('target_size'),
    additionalDiceBySize: z.strictObject(sizeDiceShape),
  }),
  z.strictObject({
    kind: z.literal('target_missing_hit_points'),
    hitPointsPerAdditionalDie: positive,
    maximumAdditionalDice: nonNegative.max(100),
  }),
]);

const thresholdRiderSchema = z.strictObject({
  minimumDamage: nonNegative,
  condition: z.enum(nonExhaustionConditions),
  durationRounds: positive,
  expiresAt: z.enum(['target_start', 'target_end']),
});

export const damageOperationPacketSchema = z.strictObject({
  damageType: damageTypeOperationSchema,
  dice: operationDiceSchema,
  scaling: targetScalingSchema,
  thresholdRider: thresholdRiderSchema.nullable(),
});

const damageDeliverySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('automatic') }),
  z.strictObject({
    kind: z.literal('save'),
    ability: z.enum(abilities),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
    onSuccess: z.enum(['none', 'half']),
  }),
]);

const damageTimingSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('immediate') }),
  z.strictObject({
    kind: z.literal('recurring'),
    initial: z.enum(['none', 'immediate']),
    tick: z.enum(['target_start', 'target_end']),
    durationRounds: positive,
    concentration: z.boolean(),
  }),
]);

export const damageOperationSpecSchema = z.strictObject({
  delivery: damageDeliverySchema,
  instancesPerTarget: positive.max(100),
  packets: z.array(damageOperationPacketSchema).min(1).max(20),
  timing: damageTimingSchema,
});

export const armedWeaponHitRiderShape = {
  damage: damageOperationPacketSchema.nullable(),
  durationRounds: positive,
  concentration: z.boolean(),
  persistence: z.enum(['consume_on_hit', 'duration']),
  saveGatedRider: z.strictObject({
    ability: z.enum(abilities),
    rollMode: z.enum(['normal', 'advantage', 'disadvantage']),
    condition: z.enum(nonExhaustionConditions),
    durationRounds: positive,
    expiresAt: z.enum(['target_start', 'target_end']),
  }).nullable(),
} as const;

