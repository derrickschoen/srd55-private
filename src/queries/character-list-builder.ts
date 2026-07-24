import {
  sqlInteger,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterSummary } from '../domain/read-models';
import { BuildReportBuilder } from '../reports/build-report-builder';

export class CharacterListBuilder {
  readonly #reports: BuildReportBuilder;

  constructor(
    private readonly db: DatabaseContext,
    reports?: BuildReportBuilder,
  ) {
    this.#reports = reports ?? new BuildReportBuilder(db);
  }

  build(): CharacterSummary[] {
    return this.db
      .all(
        'SELECT id, name FROM characters ORDER BY name, id',
        undefined,
        (row) => ({
          id: sqlInteger(row, 'id'),
          name: sqlString(row, 'name'),
        }),
      )
      .map((character): CharacterSummary => {
        const report = this.#reports.build(character.id);
        const invalid = Number(
          this.db.scalar(
            `SELECT count(*)
             FROM spell_selection_slots
             WHERE character_id = ?
               AND (
                 selection_eligibility = 'invalid'
                 OR state IN ('orphaned', 'kept_override')
               )`,
            [character.id],
          ) ?? 0,
        );
        const duplicates = report.duplicate_assessments.filter(
          (assessment) => assessment.category !== 'none',
        ).length;

        return {
          id: character.id,
          name: character.name,
          level: report.character.character_level,
          classes: report.classes.map(
            (item) => `${item.name} ${item.class_level}`,
          ),
          warning_count: duplicates + invalid,
        };
      });
  }
}
