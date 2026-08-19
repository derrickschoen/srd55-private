export type ConfiguredChoiceValueExpectation =
  | 'object'
  | 'non_empty_text'
  | 'dotted_path'
  | 'list'
  | 'non_empty_list'
  | 'unique'
  | 'non_zero_integer'
  | 'unsupported'
  | 'required_and_displayed'
  | 'zero'
  | 'positive';

const EXPECTATION_PHRASES: Readonly<
  Record<ConfiguredChoiceValueExpectation, string>
> = {
  object: 'must be an object',
  non_empty_text: 'must be non-empty text',
  dotted_path: 'must be a non-empty dotted config path',
  list: 'must be a list',
  non_empty_list: 'must be a non-empty list',
  unique: 'must not contain duplicates',
  non_zero_integer: 'must be a non-zero integer',
  unsupported: 'is unsupported',
  required_and_displayed: 'must be required and displayed on the sheet',
  zero: 'must be 0',
  positive: 'must be positive',
};

export class ConfiguredChoiceValueError extends TypeError {
  override readonly name = 'ConfiguredChoiceValueError' as const;
  constructor(
    readonly label: string,
    readonly expected: ConfiguredChoiceValueExpectation,
  ) {
    super(`${label} ${EXPECTATION_PHRASES[expected]}.`);
  }
}

export class ConfiguredChoiceExactKeysError extends TypeError {
  override readonly name = 'ConfiguredChoiceExactKeysError' as const;
  constructor(
    readonly label: string,
    readonly expected_keys: readonly string[],
  ) {
    super(`${label} must contain exactly ${expected_keys.join(', ')}.`);
  }
}

export class ConfiguredChoiceRootContractError extends TypeError {
  override readonly name = 'ConfiguredChoiceRootContractError' as const;
  constructor() {
    super(
      'Configured-choice rule kind must be configured_choice and required must be true.',
    );
  }
}

export class ConfiguredChoiceAbilityOptionsError extends TypeError {
  override readonly name = 'ConfiguredChoiceAbilityOptionsError' as const;
  constructor() {
    super('Configured-choice rule ability options must be supported abilities.');
  }
}

export class ConfiguredChoiceUnknownSheetFieldError extends TypeError {
  override readonly name = 'ConfiguredChoiceUnknownSheetFieldError' as const;
  constructor() {
    super('Configured-choice rule has an unknown sheet field.');
  }
}

export class ConfiguredChoiceProjectedTraitError extends TypeError {
  override readonly name = 'ConfiguredChoiceProjectedTraitError' as const;
  constructor() {
    super('A projected trait requires a structured unknown sheet field.');
  }
}

export class ConfiguredChoiceRepeatedOptionError extends TypeError {
  override readonly name = 'ConfiguredChoiceRepeatedOptionError' as const;
  constructor(readonly option: string) {
    super(`Configured-choice rule repeats option '${option}'.`);
  }
}

export class ConfiguredChoiceNestedRuleError extends TypeError {
  override readonly name = 'ConfiguredChoiceNestedRuleError' as const;
  constructor() {
    super('Configured-choice rules may not be nested.');
  }
}

export class ConfiguredChoiceRepeatedMaterialRuleKeyError extends TypeError {
  override readonly name =
    'ConfiguredChoiceRepeatedMaterialRuleKeyError' as const;
  constructor(readonly rule_key: string) {
    super(`Configured-choice rule repeats material rule_key '${rule_key}'.`);
  }
}

export class ConfiguredChoiceDeclaredDarkvisionError extends TypeError {
  override readonly name = 'ConfiguredChoiceDeclaredDarkvisionError' as const;
  constructor() {
    super('Every option must provide declared Darkvision.');
  }
}

export class ConfiguredChoiceDeclaredDamageResistanceError extends TypeError {
  override readonly name =
    'ConfiguredChoiceDeclaredDamageResistanceError' as const;
  constructor() {
    super('Every option must provide one declared damage resistance.');
  }
}

export class SourceGrantRulesListError extends TypeError {
  override readonly name = 'SourceGrantRulesListError' as const;
  constructor() {
    super('Source grant rules must be a list.');
  }
}

export class SourceGrantRuleKeyError extends TypeError {
  override readonly name = 'SourceGrantRuleKeyError' as const;
  constructor(readonly rule_key: string) {
    super(`Source grant rules repeat rule_key '${rule_key}'.`);
  }
}
