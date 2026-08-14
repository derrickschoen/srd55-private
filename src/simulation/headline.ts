import type { DamageType } from '../domain/enums';
import {
  encounterRoundCount,
  restCadence,
  targetArmorClass,
  type DprRoutineOption,
  type DprScenarioDraft,
  type DprSimulationOptions,
  type HeadlineScenarioResolution,
  type NonEmptyReadonlyArray,
  type SimulationSettings,
  type UnmodelledIssue,
} from './contracts';
import {
  createUnmodelledIssue,
  orderUnmodelledIssues,
} from './coverage';

function distinctDamageTypes(values: readonly DamageType[]): DamageType[] {
  return [...new Set(values)];
}

export function headlineDprSettings(
  damageTypes: readonly DamageType[],
): SimulationSettings {
  return {
    rounds: encounterRoundCount(3),
    resources: {
      kind: 'budget_over_rest_cycle',
      cadence: restCadence({
        encounters_per_rest_block: 1,
        short_rests_before_long_rest: 1,
      }),
    },
    roll_state: 'normal',
    target: {
      armor_class: targetArmorClass(15),
      save_bonuses: [],
      damage_responses: distinctDamageTypes(damageTypes).map((damage_type) => ({
        damage_type,
        response: 'normal',
      })),
    },
  };
}

function selectionIssue(discriminator: string): UnmodelledIssue {
  return createUnmodelledIssue({
    kind: 'routine_selection_required',
    source: null,
    discriminator,
    detail: 'The headline scenario cannot choose between attack routines.',
    why_it_changes_damage: 'Different routines can produce different damage.',
    remedy: 'Choose a routine on the full damage-analysis page.',
  });
}

function saveIssues(
  routine: Extract<DprRoutineOption, { readonly status: 'supported' }>,
): NonEmptyReadonlyArray<UnmodelledIssue> {
  const issues = routine.required_target_saves.map((ability) =>
    createUnmodelledIssue({
      kind: 'target_save_bonus_required',
      source: null,
      discriminator: `${routine.id}:${ability}`,
      detail: `The ${ability} save bonus is required for ${routine.label}.`,
      why_it_changes_damage: 'The save bonus changes the chance of each save outcome.',
      remedy: 'Enter the target save bonus on the full damage-analysis page.',
    }),
  );
  if (issues.length === 0) {
    throw new Error('saveIssues requires a routine with at least one target save.');
  }
  const [first, ...rest] = issues;
  if (first === undefined) {
    throw new Error('Unreachable empty save issue list.');
  }
  return [first, ...rest];
}

function draftFor(
  routine: Extract<DprRoutineOption, { readonly status: 'supported' }> | null,
): DprScenarioDraft {
  return {
    routine: routine?.id ?? null,
    settings: headlineDprSettings(routine?.damage_types ?? []),
  };
}

export function resolveHeadlineScenario(
  options: DprSimulationOptions,
): HeadlineScenarioResolution {
  const supported = options.routines.filter(
    (routine): routine is Extract<DprRoutineOption, { status: 'supported' }> =>
      routine.status === 'supported',
  );
  const headlineEligible = supported.filter(
    (routine) => routine.required_target_saves.length === 0,
  );

  if (headlineEligible.length > 1) {
    return {
      status: 'unavailable',
      character_id: options.character_id,
      character_revision: options.character_revision,
      draft: draftFor(null),
      issues: [selectionIssue('multiple-supported-routines')],
    };
  }

  const onlyEligible = headlineEligible[0];
  if (onlyEligible !== undefined) {
    return {
      status: 'ready',
      request: {
        character_id: options.character_id,
        expected_revision: options.character_revision,
        routine: onlyEligible.id,
        settings: headlineDprSettings(onlyEligible.damage_types),
      },
    };
  }

  if (supported.length > 1) {
    return {
      status: 'unavailable',
      character_id: options.character_id,
      character_revision: options.character_revision,
      draft: draftFor(null),
      issues: [selectionIssue('multiple-save-dependent-routines')],
    };
  }

  const only = supported[0];
  if (only !== undefined) {
    return {
      status: 'unavailable',
      character_id: options.character_id,
      character_revision: options.character_revision,
      draft: draftFor(only),
      issues: saveIssues(only),
    };
  }

  const unavailableIssues = options.routines.flatMap((routine) =>
    routine.status === 'unavailable' ? routine.issues : [],
  );
  const ordered = orderUnmodelledIssues(
    unavailableIssues.length === 0
      ? [selectionIssue('no-routines')]
      : unavailableIssues,
  );
  const [firstIssue, ...remainingIssues] = ordered;
  if (firstIssue === undefined) {
    throw new Error('Headline issue resolution must produce an issue.');
  }
  return {
    status: 'unavailable',
    character_id: options.character_id,
    character_revision: options.character_revision,
    draft: draftFor(null),
    issues: [firstIssue, ...remainingIssues],
  };
}
