export const ENGINE_FAILURE_MODES_POLICY = 'failure-modes-v1' as const;

export type EngineFailureModeCode =
  | 'no_repeated_player_pattern_memory'
  | 'no_help_calling_plan'
  | 'no_invisibility_search_plan'
  | 'rigid_engagement_objectives'
  | 'summon_economy_unscored';

export interface EngineFailureMode {
  readonly code: EngineFailureModeCode;
  readonly watch: string;
}

export interface EngineFailureModesManifest {
  readonly policy: typeof ENGINE_FAILURE_MODES_POLICY;
  readonly modes: readonly EngineFailureMode[];
}

/** Engine-authored negative capability list; shrink it when the named gaps close. */
const ENGINE_FAILURE_MODE_ROWS: readonly EngineFailureMode[] = [
  {
    code: 'no_repeated_player_pattern_memory',
    watch: 'No persistent tactical memory of repeated player patterns.',
  },
  {
    code: 'no_help_calling_plan',
    watch: 'No option generation for calling nearby allies for help.',
  },
  {
    code: 'no_invisibility_search_plan',
    watch: 'No deliberate search behavior for an undetected invisible target.',
  },
  {
    code: 'rigid_engagement_objectives',
    watch: 'Engagement stances do not model flexible leash or aggro changes.',
  },
  {
    code: 'summon_economy_unscored',
    watch: 'Future action economy from summons is not scored as tactical value.',
  },
];

export const ENGINE_FAILURE_MODES: EngineFailureModesManifest = Object.freeze({
  policy: ENGINE_FAILURE_MODES_POLICY,
  modes: Object.freeze(ENGINE_FAILURE_MODE_ROWS),
});

export function renderEngineFailureModes(): Readonly<Record<string, unknown>> {
  return {
    policy: ENGINE_FAILURE_MODES.policy,
    modes: ENGINE_FAILURE_MODES.modes.map((mode) => `${mode.code}:${mode.watch}`),
  };
}
