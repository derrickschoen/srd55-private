import {
  sqlInteger,
  sqlString,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type { CharacterSummary } from '../domain/read-models';
import { BuildReportBuilder } from '../reports/build-report-builder';
import { ACTIVE_CHARACTER_LIST_QUERY } from './character-lifecycle-queries';

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
        ACTIVE_CHARACTER_LIST_QUERY,
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
            (item) => ({
              name: item.name,
              level: item.class_level,
              catalog_layer: item.class_catalog_layer,
            }),
          ),
          warning_count: duplicates + invalid,
        };
      });
  }
}
