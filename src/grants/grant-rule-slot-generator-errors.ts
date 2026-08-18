export class GrantGenerationSourceMissingError extends TypeError {
  override readonly name = 'GrantGenerationSourceMissingError' as const;
  constructor(readonly source_instance_id: number) {
    super(`Source instance ${String(source_instance_id)} does not exist.`);
  }
}

export class GrantSourceConfigShapeError extends TypeError {
  override readonly name = 'GrantSourceConfigShapeError' as const;
  constructor(readonly source_instance_id: number) {
    super(`Grant source ${String(source_instance_id)} config must be an object.`);
  }
}

export class PlannedGrantRuleMissingError extends Error {
  override readonly name = 'PlannedGrantRuleMissingError' as const;
  constructor(readonly rule_key: string) {
    super(`Planned grant rule '${rule_key}' disappeared before generation.`);
  }
}

export class GrantSelectedSkillsConfigError extends TypeError {
  override readonly name = 'GrantSelectedSkillsConfigError' as const;
  constructor(readonly rule_key: string) {
    super(
      `Grant rule '${rule_key}' config 'selected_skills' must contain only known skills.`,
    );
  }
}

export type GrantSpellVersionIssue = 'missing' | 'inactive';

export class GrantSpellVersionReferenceError extends Error {
  override readonly name = 'GrantSpellVersionReferenceError' as const;
  constructor(
    readonly rule_key: string,
    readonly issue: GrantSpellVersionIssue,
  ) {
    super(
      issue === 'missing'
        ? `Grant rule '${rule_key}' references a spell version that does not exist.`
        : `Grant rule '${rule_key}' references an inactive spell version.`,
    );
  }
}

export class GrantSourceDefinitionResolutionError extends Error {
  override readonly name = 'GrantSourceDefinitionResolutionError' as const;
  constructor(readonly rule_key: string) {
    super(`Grant-source rule '${rule_key}' could not resolve its definition.`);
  }
}

export class GrantSourceChildConfigError extends TypeError {
  override readonly name = 'GrantSourceChildConfigError' as const;
  constructor(readonly rule_key: string) {
    super(`Grant-source rule '${rule_key}' child config must be an object.`);
  }
}

export class GrantDistinctConfigMissingError extends TypeError {
  override readonly name = 'GrantDistinctConfigMissingError' as const;
  constructor(
    readonly rule_key: string,
    readonly config_path: string,
  ) {
    super(`Grant rule '${rule_key}' requires config '${config_path}'.`);
  }
}
