export type BuildReportAbilitySource =
  | 'class'
  | 'subclass'
  | 'configured';

const BUILD_REPORT_ABILITY_SOURCE_LABELS: Readonly<
  Record<BuildReportAbilitySource, string>
> = {
  class: 'class spellcasting ability',
  subclass: 'subclass spellcasting ability',
  configured: 'configured spellcasting ability',
};

/** A persisted spellcasting ability falls outside the closed ability set. */
export class BuildReportUnknownAbilityError extends Error {
  override readonly name = 'BuildReportUnknownAbilityError' as const;
  constructor(
    readonly source: BuildReportAbilitySource,
    readonly value: string,
  ) {
    super(`Unknown ${BUILD_REPORT_ABILITY_SOURCE_LABELS[source]} '${value}'.`);
  }
}

/** A stored subclass caster contribution cannot be represented by the rules. */
export class BuildReportUnsupportedCasterFractionError extends Error {
  override readonly name =
    'BuildReportUnsupportedCasterFractionError' as const;
  constructor(
    readonly fraction: string,
    readonly rounding: string | null,
  ) {
    super(
      `Unsupported caster fraction ${fraction} rounded ${rounding ?? ''}.`,
    );
  }
}

/** A ritual-only route violates the spellbook provenance invariant. */
export class BuildReportRitualRouteSpellbookEntryError extends Error {
  override readonly name =
    'BuildReportRitualRouteSpellbookEntryError' as const;
  constructor(readonly spell_version_id: number) {
    super(
      `Ritual-only route ${String(spell_version_id)} has no spellbook entry.`,
    );
  }
}
