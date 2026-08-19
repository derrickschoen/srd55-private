/** Tagged defects raised while decoding or validating stored row payloads. */

export class RowRulesStorageObjectError extends TypeError {
  override readonly name = 'RowRulesStorageObjectError' as const;
  constructor(readonly label: string) {
    super(`${label} must be an object.`);
  }
}

export class RowRulesExactStorageKeysError extends TypeError {
  override readonly name = 'RowRulesExactStorageKeysError' as const;
  constructor(
    readonly label: string,
    readonly required_keys: readonly string[],
    readonly optional_keys: readonly string[],
  ) {
    super(
      `${label} must contain exactly ${required_keys.join(', ')}` +
        (optional_keys.length === 0
          ? '.'
          : ` with optional ${optional_keys.join(', ')}.`),
    );
  }
}

export class RowRulesSafeIntegerRangeError extends TypeError {
  override readonly name = 'RowRulesSafeIntegerRangeError' as const;
  constructor(
    readonly label: string,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(
      `${label} must be a safe integer from ${String(minimum)} to ${String(maximum)}.`,
    );
  }
}

export class RowRulesPositiveIntegerError extends TypeError {
  override readonly name = 'RowRulesPositiveIntegerError' as const;
  constructor(readonly label: string) {
    super(`${label} must be a positive integer.`);
  }
}

export class RowRulesClassLevelError extends TypeError {
  override readonly name = 'RowRulesClassLevelError' as const;
  constructor(
    readonly label: string,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(
      `${label} must be a class level from ${String(minimum)} to ${String(maximum)}.`,
    );
  }
}

export class RowRulesBoundedNonEmptyTextError extends TypeError {
  override readonly name = 'RowRulesBoundedNonEmptyTextError' as const;
  constructor(
    readonly label: string,
    readonly maximum_code_points: number,
  ) {
    super(`${label} must be bounded non-empty text.`);
  }
}

export class RowRulesKnownAbilityError extends TypeError {
  override readonly name = 'RowRulesKnownAbilityError' as const;
  constructor(readonly label: string) {
    super(`${label} must be a known ability.`);
  }
}

export type RowRulesValueSourceKind = 'level' | 'value';

export class RowRulesValueSourceKindError extends TypeError {
  override readonly name = 'RowRulesValueSourceKindError' as const;
  constructor(
    readonly label: string,
    readonly source_kind: RowRulesValueSourceKind,
  ) {
    super(`${label}.kind is not a supported ${source_kind} source.`);
  }
}

export class RowRulesBoundedNonEmptyListError extends TypeError {
  override readonly name = 'RowRulesBoundedNonEmptyListError' as const;
  constructor(
    readonly label: string,
    readonly maximum_entries: number,
  ) {
    super(`${label} must be a bounded non-empty list.`);
  }
}

export class RowRulesLevelBandOrderError extends TypeError {
  override readonly name = 'RowRulesLevelBandOrderError' as const;
  constructor(readonly label: string) {
    super(`${label}.from must not exceed its to level.`);
  }
}

export class RowRulesExpressionBandSequenceError extends TypeError {
  override readonly name = 'RowRulesExpressionBandSequenceError' as const;
  constructor(readonly label: string) {
    super(`${label} must be ordered, contiguous, and non-overlapping.`);
  }
}

export type RowRulesExpressionLimit = 'depth' | 'breadth';

export class RowRulesExpressionLimitError extends TypeError {
  override readonly name = 'RowRulesExpressionLimitError' as const;
  constructor(
    readonly label: string,
    readonly limit: RowRulesExpressionLimit,
    readonly maximum: number,
  ) {
    super(`${label} exceeds the expression ${limit} limit.`);
  }
}

export class RowRulesExpressionRoundError extends TypeError {
  override readonly name = 'RowRulesExpressionRoundError' as const;
  constructor(readonly label: string) {
    super(`${label}.round must be floor or ceiling.`);
  }
}

export class RowRulesClampOrderError extends TypeError {
  override readonly name = 'RowRulesClampOrderError' as const;
  constructor(readonly label: string) {
    super(`${label}.minimum must not exceed maximum.`);
  }
}

export class RowRulesValueExpressionKindError extends TypeError {
  override readonly name = 'RowRulesValueExpressionKindError' as const;
  constructor(
    readonly label: string,
    readonly expression_kind: unknown,
  ) {
    super(`${label}.kind is not a supported value expression.`);
  }
}

export class RowRulesBoundedJsonTextError extends TypeError {
  override readonly name = 'RowRulesBoundedJsonTextError' as const;
  constructor(
    readonly label: string,
    readonly maximum_bytes: number,
  ) {
    super(`${label} must be bounded JSON text.`);
  }
}

export class RowRulesNullableBoundedJsonTextError extends TypeError {
  override readonly name = 'RowRulesNullableBoundedJsonTextError' as const;
  constructor(
    readonly label: string,
    readonly maximum_bytes: number,
  ) {
    super(`${label} must be null or bounded JSON text.`);
  }
}

export class RowRulesJsonParseError extends TypeError {
  override readonly name = 'RowRulesJsonParseError' as const;
  constructor(
    readonly label: string,
    override readonly cause: unknown,
  ) {
    super(`${label} must be valid JSON.`, { cause });
  }
}

export class RowRulesActiveLevelBandError extends TypeError {
  override readonly name = 'RowRulesActiveLevelBandError' as const;
  constructor(
    readonly active_from_level: unknown,
    readonly active_to_level: unknown,
    readonly minimum: number,
    readonly maximum: number,
  ) {
    super(
      `active level band must be ordered within ${String(minimum)} through ${String(maximum)}.`,
    );
  }
}

export type RowRulesContributionTargetKind =
  | 'feature_dice_count'
  | 'resource_maximum';

const CONTRIBUTION_TARGET_CONFIGURATION_MESSAGES: Readonly<
  Record<RowRulesContributionTargetKind, string>
> = {
  feature_dice_count:
    'feature_dice_count requires target_key sneak_attack, op add, and no resource display configuration.',
  resource_maximum:
    'resource_maximum requires a bounded target_key, op add, and complete display configuration.',
};

export class RowRulesContributionTargetConfigurationError extends TypeError {
  override readonly name =
    'RowRulesContributionTargetConfigurationError' as const;
  constructor(readonly target_kind: RowRulesContributionTargetKind) {
    super(CONTRIBUTION_TARGET_CONFIGURATION_MESSAGES[target_kind]);
  }
}

export class RowRulesUnsupportedContributionTargetKindError extends TypeError {
  override readonly name =
    'RowRulesUnsupportedContributionTargetKindError' as const;
  constructor(readonly target_kind: unknown) {
    super('target_kind is not supported.');
  }
}
