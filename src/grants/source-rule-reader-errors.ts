export class GrantSourceInstanceStateError extends Error {
  override readonly name = 'GrantSourceInstanceStateError' as const;
  constructor(readonly state: string) {
    super(`Unknown source instance state '${state}'.`);
  }
}

export class GrantRulesJsonContainerError extends TypeError {
  override readonly name = 'GrantRulesJsonContainerError' as const;
  constructor() {
    super('Grant-rule JSON values must decode to arrays or objects.');
  }
}

export class GrantSourceTypeError extends TypeError {
  override readonly name = 'GrantSourceTypeError' as const;
  constructor(readonly source_type: string) {
    super(`Unsupported grant source type '${source_type}'.`);
  }
}

export type GrantRuleRecordLocation =
  | 'class_progression'
  | 'static_subclass'
  | 'subclass_progression';

const RECORD_LOCATION_LABELS: Readonly<Record<GrantRuleRecordLocation, string>> = {
  class_progression: 'Class progression',
  static_subclass: 'Static subclass',
  subclass_progression: 'Subclass progression',
};

export class StoredGrantRuleRecordError extends TypeError {
  override readonly name = 'StoredGrantRuleRecordError' as const;
  constructor(readonly location: GrantRuleRecordLocation) {
    super(`${RECORD_LOCATION_LABELS[location]} grant rules must be objects.`);
  }
}

export type GrantDefinitionSubject = 'source' | 'subclass_source';

export class GrantSourceDefinitionMissingError extends Error {
  override readonly name = 'GrantSourceDefinitionMissingError' as const;
  constructor(
    readonly source_instance_id: number,
    readonly subject: GrantDefinitionSubject,
  ) {
    super(
      subject === 'source'
        ? `Definition for source instance ${String(source_instance_id)} does not exist.`
        : `Definition for subclass source instance ${String(source_instance_id)} does not exist.`,
    );
  }
}

export class GrantSourceRulesListError extends TypeError {
  override readonly name = 'GrantSourceRulesListError' as const;
  constructor(readonly source_instance_id: number) {
    super(
      `Grant rules for source instance ${String(source_instance_id)} must be a list.`,
    );
  }
}

export class GrantRuleClassLevelSourceError extends TypeError {
  override readonly name = 'GrantRuleClassLevelSourceError' as const;
  constructor() {
    super(
      'Rule active_from_class_level requires a class, subclass, or configured class_level source.',
    );
  }
}

export type GrantClassLevelSubject = 'source' | 'class_source';

export class GrantSourceClassLevelMissingError extends Error {
  override readonly name = 'GrantSourceClassLevelMissingError' as const;
  constructor(
    readonly source_instance_id: number,
    readonly subject: GrantClassLevelSubject,
  ) {
    super(
      subject === 'source'
        ? `Source instance ${String(source_instance_id)} has no matching class level.`
        : `Class source instance ${String(source_instance_id)} has no character class level.`,
    );
  }
}
