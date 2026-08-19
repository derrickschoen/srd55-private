import { z } from 'zod';
import { abilities, damageType } from '../domain/enums';
import type { CharacterId, CharacterRevision } from '../domain/ids';
import {
  characterAttackRoutineId,
  damageResponses,
  encounterRoundCount,
  restCadence,
  rollStates,
  targetArmorClass,
  targetSaveBonus,
  type DprRequestContext,
  type DprScenarioDraft,
  type DprSimulationRequest,
  type ResourcePolicy,
  type SimulationSettings,
  type TargetDamageResponse,
  type TargetSaveSetting,
} from './contracts';

export class DprRequestParseError extends TypeError {
  /**
   * Declared at the literal type rather than assigned into `Error.name`, whose
   * `string` type would accept any other name — including an empty one.
   */
  override readonly name: 'DprRequestParseError' = 'DprRequestParseError';

  readonly issues: readonly string[];

  constructor(issues: readonly string[]) {
    super(`Invalid DPR request: ${issues.join('; ')}`);
    this.issues = issues;
  }
}

const characterIdSchema = z
  .number()
  .int()
  .positive()
  .transform((value) => value as CharacterId);

const characterRevisionSchema = z
  .number()
  .int()
  .nonnegative()
  .transform((value) => value as CharacterRevision);

const routineIdSchema = z
  .string()
  .transform((value, context) => {
    try {
      return characterAttackRoutineId(value);
    } catch (error: unknown) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Invalid routine ID.',
      });
      return z.NEVER;
    }
  });

const damageTypeSchema = z
  .string()
  .min(1)
  .refine((value) => !value.includes('\u0000'), {
    message: 'Damage types cannot contain NUL bytes.',
  })
  .transform(damageType);

const targetSaveSchema = z
  .strictObject({
    ability: z.enum(abilities),
    bonus: z.number().transform((value, context) => {
      try {
        return targetSaveBonus(value);
      } catch (error: unknown) {
        context.addIssue({
          code: 'custom',
          message:
            error instanceof Error ? error.message : 'Invalid target save bonus.',
        });
        return z.NEVER;
      }
    }),
  })
  .transform((value): TargetSaveSetting => value);

const targetDamageResponseSchema = z
  .strictObject({
    damage_type: damageTypeSchema,
    response: z.enum(damageResponses),
  })
  .transform((value): TargetDamageResponse => value);

function noDuplicateKeys<T>(
  values: readonly T[],
  key: (value: T) => string,
): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const candidate = key(value);
    if (seen.has(candidate)) {
      return false;
    }
    seen.add(candidate);
  }
  return true;
}

const cadenceSchema = z
  .strictObject({
    encounters_per_rest_block: z.number(),
    short_rests_before_long_rest: z.number(),
  })
  .transform((value, context) => {
    try {
      return restCadence(value);
    } catch (error: unknown) {
      context.addIssue({
        code: 'custom',
        message: error instanceof Error ? error.message : 'Invalid rest cadence.',
      });
      return z.NEVER;
    }
  });

const resourcePolicySchema = z
  .discriminatedUnion('kind', [
    z.strictObject({
      kind: z.literal('budget_over_rest_cycle'),
      cadence: cadenceSchema,
    }),
    z.strictObject({ kind: z.literal('spend_available_after_long_rest') }),
  ])
  .transform((value): ResourcePolicy => value);

const simulationSettingsSchema = z
  .strictObject({
    rounds: z.number().transform((value, context) => {
      try {
        return encounterRoundCount(value);
      } catch (error: unknown) {
        context.addIssue({
          code: 'custom',
          message:
            error instanceof Error ? error.message : 'Invalid encounter rounds.',
        });
        return z.NEVER;
      }
    }),
    resources: resourcePolicySchema,
    roll_state: z.enum(rollStates),
    target: z.strictObject({
      armor_class: z.number().transform((value, context) => {
        try {
          return targetArmorClass(value);
        } catch (error: unknown) {
          context.addIssue({
            code: 'custom',
            message:
              error instanceof Error ? error.message : 'Invalid target AC.',
          });
          return z.NEVER;
        }
      }),
      save_bonuses: z
        .array(targetSaveSchema)
        .refine(
          (values) => noDuplicateKeys(values, (value) => value.ability),
          { message: 'Target save abilities must be unique.' },
        ),
      damage_responses: z
        .array(targetDamageResponseSchema)
        .refine(
          (values) => noDuplicateKeys(values, (value) => value.damage_type),
          { message: 'Target damage response types must be unique.' },
        ),
    }),
  })
  .transform((value): SimulationSettings => value);

const requestSchema = z
  .strictObject({
    character_id: characterIdSchema,
    expected_revision: characterRevisionSchema,
    routine: routineIdSchema,
    settings: simulationSettingsSchema,
  })
  .transform((value): DprSimulationRequest => value);

const draftSchema = z
  .strictObject({
    routine: routineIdSchema.nullable(),
    settings: simulationSettingsSchema,
  })
  .transform((value): DprScenarioDraft => value);

function parseWithSchema<T>(
  schema: z.ZodType<T>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }
  throw new DprRequestParseError(
    result.error.issues.map((issue) => {
      const path = issue.path.length === 0 ? '<root>' : issue.path.join('.');
      return `${path}: ${issue.message}`;
    }),
  );
}

export function parseSimulationSettings(input: unknown): SimulationSettings {
  return parseWithSchema(simulationSettingsSchema, input);
}

export function parseDprSimulationRequest(
  input: unknown,
): DprSimulationRequest {
  return parseWithSchema(requestSchema, input);
}

export function parseDprScenarioDraft(input: unknown): DprScenarioDraft {
  return parseWithSchema(draftSchema, input);
}

export function parseDprRequestContext(input: unknown): DprRequestContext {
  const envelope = parseWithSchema(
    z.discriminatedUnion('kind', [
      z.strictObject({ kind: z.literal('request'), value: z.unknown() }),
      z.strictObject({
        kind: z.literal('headline_draft'),
        value: z.unknown(),
      }),
    ]),
    input,
  );
  switch (envelope.kind) {
    case 'request':
      return { kind: 'request', value: parseDprSimulationRequest(envelope.value) };
    case 'headline_draft':
      return { kind: 'headline_draft', value: parseDprScenarioDraft(envelope.value) };
  }
}
