import {
  sqlBoolean,
  sqlInteger,
  sqlNullableString,
  sqlSpellSchool,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import {
  type Ability,
  type CastingMode,
  type RulesEdition,
  type SpellSchool,
} from '../domain/enums';
import { SpellAccessBuilder, type SpellAccessRoute } from '../access/spell-access-builder';
import {
  BuildReportBuilder,
  type BuildReportResult,
} from './build-report-builder';
import {
  compareLongRestSpells,
  comparePrintableSourceGroups,
  comparePrintableSpells,
} from './printable-ordering';

export type PrintableVariant = 'reference' | 'full';
export type PrintableTextStatus =
  | 'not_requested'
  | 'unavailable'
  | 'partial'
  | 'available';

export interface PrintableSpell {
  readonly spell_version_id: number;
  readonly spell_identity_id: number;
  readonly name: string;
  readonly edition: RulesEdition;
  readonly level: number;
  readonly school: SpellSchool;
  readonly casting_time: string | null;
  readonly action_type: string | null;
  readonly range: string | null;
  readonly duration: string | null;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly components: string | null;
  /**
   * THE TWO PROGRESSIONS — the structured values in this area that put
   * information on the card a player did not already have.
   *
   * `upcast_levels` is SPELL SLOT LEVELS: what a bigger slot buys.
   * `cantrip_upgrade_levels` is CHARACTER LEVELS: the SRD's Cantrip Upgrade,
   * which spends no slot. They are two fields because they are two mechanics,
   * and the card prints them as two lines for the same reason.
   *
   * The parsed range and material cost deliberately do NOT appear beside their
   * printed lines: those lines already say the same thing in the words the
   * author chose, and a second rendering of them would be D26 structure for its
   * own sake.
   *
   * Either list is EMPTY when the catalog document did not say, which is not
   * the same as "this spell has no such progression" — the card prints nothing
   * at all in that case rather than asserting either.
   */
  readonly upcast_levels: number[];
  readonly upcast_summary: string | null;
  readonly cantrip_upgrade_levels: number[];
  readonly cantrip_upgrade_summary: string | null;
  readonly attack_modes: string[];
  readonly save_abilities: string[];
  readonly casting_mode: CastingMode;
  readonly spellcasting_ability: Ability | null;
  readonly attack_bonus: number | null;
  readonly save_dc: number | null;
  readonly description: string | null;
}

export interface PrintableSourceGroup {
  readonly source: string;
  readonly ability: Ability | null;
  readonly attack_bonus: number | null;
  readonly save_dc: number | null;
  readonly spells: PrintableSpell[];
}

export interface PrintableUnpreparedSection {
  readonly class_name: 'Cleric' | 'Druid' | 'Wizard';
  readonly title: string;
  readonly ability: Ability | null;
  readonly max_level: number;
  readonly cantrip_note: string;
  readonly spells: PrintableSpell[];
}

export interface PrintableSpellList {
  readonly variant: PrintableVariant;
  readonly text_status: PrintableTextStatus;
  readonly character: BuildReportResult['character'];
  readonly source_groups: PrintableSourceGroup[];
  readonly unprepared_sections: PrintableUnpreparedSection[];
  readonly wizard: BuildReportResult['wizard'];
}

interface SpellFacts {
  readonly spell_version_id: number;
  readonly name: string;
  readonly edition: RulesEdition;
  readonly level: number;
  readonly school: SpellSchool;
  readonly casting_time: string | null;
  readonly action_type: string | null;
  readonly range: string | null;
  readonly duration: string | null;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly components: string | null;
  readonly description: string | null;
  readonly upcast_levels: number[];
  readonly upcast_summary: string | null;
  readonly cantrip_upgrade_levels: number[];
  readonly cantrip_upgrade_summary: string | null;
  readonly attack_modes: string[];
  readonly save_abilities: string[];
}

interface LongRestCandidate {
  readonly spell_version_id: number;
  readonly spell_identity_id: number;
  readonly casting_mode: 'available_on_long_rest';
  readonly spellcasting_ability: Ability | null;
  readonly attack_bonus: number | null;
  readonly save_dc: number | null;
}

interface UnpreparedCandidates
  extends Omit<PrintableUnpreparedSection, 'spells'> {
  readonly spells: LongRestCandidate[];
}

const longRestClassNames = ['Cleric', 'Druid', 'Wizard'] as const;
const cantripNote =
  'Unprepared cantrips are not listed because cantrips cannot be swapped on a long rest.';

function placeholders(values: readonly unknown[]): string {
  return values.map(() => '?').join(', ');
}

function actionType(castingTime: string | null): string | null {
  if (castingTime === null) {
    return null;
  }
  for (const action of ['Bonus Action', 'Reaction', 'Action']) {
    if (new RegExp(`\\b${action}\\b`, 'i').test(castingTime)) {
      return action;
    }
  }
  return null;
}

/*
 * `decodeUpcastScale` USED TO SIT HERE and its subject is gone with
 * `spell_versions.upcast_scale`. It validated the stored scale rather than
 * casting it, because `scaleWord` one module over was an exhaustive switch with
 * no `default` arm and an out-of-vocabulary value fell through it to print the
 * literal word `undefined` on a player's card. There is no vocabulary left to
 * fall out of: which levels a list holds is now the table it is stored in, and
 * a table name cannot be corrupted into a third value.
 */

function decodeFacts(row: SqlRow): Omit<
  SpellFacts,
  | 'attack_modes'
  | 'save_abilities'
  | 'upcast_levels'
  | 'cantrip_upgrade_levels'
> {
  const castingTime = sqlNullableString(row, 'casting_time');
  return {
    spell_version_id: sqlInteger(row, 'id'),
    name: sqlString(row, 'display_name'),
    edition: sqlString(row, 'rules_edition') as RulesEdition,
    level: sqlInteger(row, 'level'),
    school: sqlSpellSchool(row, 'school'),
    casting_time: castingTime,
    action_type:
      sqlNullableString(row, 'action_type') ?? actionType(castingTime),
    range: sqlNullableString(row, 'range'),
    duration: sqlNullableString(row, 'duration'),
    concentration: sqlBoolean(row, 'concentration'),
    ritual: sqlBoolean(row, 'ritual'),
    components: sqlNullableString(row, 'components'),
    description: sqlNullableString(row, 'short_summary'),
    upcast_summary: sqlNullableString(row, 'upcast_summary'),
    cantrip_upgrade_summary: sqlNullableString(row, 'cantrip_upgrade_summary'),
  };
}

export class PrintableSpellListBuilder {
  readonly #reports: BuildReportBuilder;
  readonly #access: SpellAccessBuilder;

  constructor(
    private readonly db: DatabaseContext,
    reports?: BuildReportBuilder,
    access?: SpellAccessBuilder,
  ) {
    this.#reports = reports ?? new BuildReportBuilder(db);
    this.#access = access ?? new SpellAccessBuilder(db);
  }

  build(characterId: number, withText = false): PrintableSpellList {
    const report = this.#reports.build(characterId);
    const routes = this.#access.buildForCharacter(characterId);
    const unprepared = this.unpreparedClassSpells(
      characterId,
      report,
      routes,
    );
    const versionIds = [
      ...new Set([
        ...routes.map((route) => route.spell_version_id),
        ...unprepared.flatMap((section) =>
          section.spells.map((spell) => spell.spell_version_id),
        ),
      ]),
    ];
    const facts = this.spellFacts(versionIds);
    const groupedRoutes = new Map<string, SpellAccessRoute[]>();
    for (const route of routes) {
      const sourceRoutes = groupedRoutes.get(route.source_name);
      if (sourceRoutes === undefined) {
        groupedRoutes.set(route.source_name, [route]);
      } else {
        sourceRoutes.push(route);
      }
    }

    const groups = [...groupedRoutes.entries()]
      .map(([source, sourceRoutes]): PrintableSourceGroup => {
        const uniqueRoutes = new Map<string, SpellAccessRoute>();
        for (const route of sourceRoutes) {
          const key = `${route.spell_version_id}:${route.casting_mode}`;
          if (!uniqueRoutes.has(key)) {
            uniqueRoutes.set(key, route);
          }
        }
        const first = sourceRoutes[0]!;
        return {
          source,
          ability: first.spellcasting_ability,
          attack_bonus: first.attack_bonus,
          save_dc: first.save_dc,
          spells: [...uniqueRoutes.values()]
            .map((route) =>
              this.spellEntry(route, facts, withText),
            )
            .sort(comparePrintableSpells),
        };
      })
      .sort(comparePrintableSourceGroups);

    const unpreparedSections = unprepared.map(
      (section): PrintableUnpreparedSection => ({
        ...section,
        spells: section.spells
          .map((spell) =>
            this.spellEntry(spell, facts, withText),
          )
          .sort(compareLongRestSpells),
      }),
    );

    const displayedSpells = [
      ...groups.flatMap((group) => group.spells),
      ...unpreparedSections.flatMap((section) => section.spells),
    ];
    const described = displayedSpells.filter(
      (spell) =>
        typeof spell.description === 'string' &&
        spell.description.trim() !== '',
    ).length;
    const textStatus: PrintableTextStatus = !withText
      ? 'not_requested'
      : described === 0
        ? 'unavailable'
        : described === displayedSpells.length
          ? 'available'
          : 'partial';

    return {
      variant: withText ? 'full' : 'reference',
      text_status: textStatus,
      character: report.character,
      source_groups: groups,
      unprepared_sections: unpreparedSections,
      wizard: report.wizard,
    };
  }

  private unpreparedClassSpells(
    characterId: number,
    report: BuildReportResult,
    routes: readonly SpellAccessRoute[],
  ): UnpreparedCandidates[] {
    const sections: UnpreparedCandidates[] = [];
    for (const className of longRestClassNames) {
      const characterClass = report.classes.find(
        (entry) => entry.name === className,
      );
      if (
        characterClass === undefined ||
        characterClass.max_preparable_level < 1
      ) {
        continue;
      }

      const source = this.db.one(
        `SELECT source.id
         FROM character_source_instances AS source
         INNER JOIN class_definitions AS class
           ON class.id = source.source_definition_id
         WHERE source.character_id = ?
           AND source.source_type = 'class'
           AND source.state = 'active'
           AND class.name = ?
         ORDER BY source.id
         LIMIT 1`,
        [characterId, className],
        (row) => ({ id: sqlInteger(row, 'id') }),
      );
      if (source === null) {
        continue;
      }

      const preparedIdentityIds = [
        ...new Set(
          routes
            .filter(
              (route) =>
                route.source_instance_id === source.id &&
                route.bucket === 'prepared',
            )
            .map((route) => route.spell_identity_id),
        ),
      ];
      const excluded =
        preparedIdentityIds.length === 0
          ? ''
          : `AND version.spell_identity_id NOT IN (${placeholders(preparedIdentityIds)})`;
      const maxLevel = characterClass.max_preparable_level;
      const candidates = this.db.all(
        `SELECT version.id, version.spell_identity_id
         FROM spell_versions AS version
         INNER JOIN spell_list_memberships AS membership
           ON membership.spell_version_id = version.id
         WHERE membership.spell_list_key = ?
           AND version.rules_edition = '2024'
           AND version.is_active = 1
           AND version.level BETWEEN 1 AND ?
           ${excluded}
         ORDER BY version.level, version.display_name, version.id`,
        [className, maxLevel, ...preparedIdentityIds],
        (row): LongRestCandidate => {
          const ability = characterClass.spellcasting_ability;
          const modifier =
            ability === null
              ? null
              : Math.floor((report.character.abilities[ability] - 10) / 2);
          return {
            spell_version_id: sqlInteger(row, 'id'),
            spell_identity_id: sqlInteger(row, 'spell_identity_id'),
            casting_mode: 'available_on_long_rest',
            spellcasting_ability: ability,
            attack_bonus:
              modifier === null
                ? null
                : report.character.proficiency_bonus + modifier,
            save_dc:
              modifier === null
                ? null
                : 8 + report.character.proficiency_bonus + modifier,
          };
        },
      );

      sections.push({
        class_name: className,
        title: `${className} — not prepared (available to swap in on a long rest)`,
        ability: characterClass.spellcasting_ability,
        max_level: maxLevel,
        cantrip_note: cantripNote,
        spells: candidates,
      });
    }
    return sections;
  }

  private spellFacts(versionIds: readonly number[]): Map<number, SpellFacts> {
    if (versionIds.length === 0) {
      return new Map();
    }
    const bindings = [...versionIds];
    const inList = placeholders(bindings);
    const attackModes = this.groupedStrings(
      'spell_version_attack_modes',
      'attack_mode',
      bindings,
    );
    const saveAbilities = this.groupedStrings(
      'spell_version_save_abilities',
      'save_ability',
      bindings,
    );
    const tags = this.groupedStrings(
      'spell_version_tags',
      'tag',
      bindings,
    );
    const upcastLevels = this.groupedLevels(
      'spell_version_upcast_levels',
      bindings,
    );
    const cantripUpgradeLevels = this.groupedLevels(
      'spell_version_cantrip_upgrade_levels',
      bindings,
    );
    const facts = new Map<number, SpellFacts>();

    for (const row of this.db.all(
      `SELECT id, display_name, rules_edition, level, school,
              casting_time, action_type, range, duration, concentration,
              ritual, components, short_summary, upcast_summary,
              cantrip_upgrade_summary
       FROM spell_versions
       WHERE id IN (${inList})
       ORDER BY id`,
      bindings,
      // `decodeFacts` was already a `RowCodec` in everything but its position.
      decodeFacts,
    )) {
      const base = row;
      const versionTags = tags.get(base.spell_version_id) ?? [];
      facts.set(base.spell_version_id, {
        ...base,
        concentration:
          base.concentration || versionTags.includes('concentration'),
        ritual: base.ritual || versionTags.includes('ritual'),
        attack_modes: attackModes.get(base.spell_version_id) ?? [],
        save_abilities: saveAbilities.get(base.spell_version_id) ?? [],
        upcast_levels: upcastLevels.get(base.spell_version_id) ?? [],
        cantrip_upgrade_levels:
          cantripUpgradeLevels.get(base.spell_version_id) ?? [],
      });
    }
    return facts;
  }

  /**
   * One of the two level ladders for every spell in one query, ASCENDING.
   *
   * SEPARATE FROM `groupedStrings` FOR THE REASON `#syncLevels` IS SEPARATE
   * FROM `#syncSimplePivot` ONE MODULE OVER: that helper's `ORDER BY` is over a
   * TEXT column, and ordering levels as text puts `11` before `2`. A list of
   * levels printed `2, 11, 17` and one printed `11, 17, 2` are the same set and
   * only one of them is readable — and `11` is a real Cantrip Upgrade step, so
   * this is not a hypothetical.
   */
  private groupedLevels(
    table:
      | 'spell_version_upcast_levels'
      | 'spell_version_cantrip_upgrade_levels',
    versionIds: readonly number[],
  ): Map<number, number[]> {
    const grouped = new Map<number, number[]>();
    for (const row of this.db.all(
      `SELECT spell_version_id, level
       FROM ${table}
       WHERE spell_version_id IN (${placeholders(versionIds)})
       ORDER BY spell_version_id, level`,
      [...versionIds],
      (stored) => ({
        spell_version_id: sqlInteger(stored, 'spell_version_id'),
        level: sqlInteger(stored, 'level'),
      }),
    )) {
      const levels = grouped.get(row.spell_version_id);
      if (levels === undefined) {
        grouped.set(row.spell_version_id, [row.level]);
      } else {
        levels.push(row.level);
      }
    }
    return grouped;
  }

  private groupedStrings(
    table:
      | 'spell_version_attack_modes'
      | 'spell_version_save_abilities'
      | 'spell_version_tags',
    column: 'attack_mode' | 'save_ability' | 'tag',
    versionIds: readonly number[],
  ): Map<number, string[]> {
    const grouped = new Map<number, string[]>();
    for (const row of this.db.all(
      `SELECT spell_version_id, ${column} AS value
       FROM ${table}
       WHERE spell_version_id IN (${placeholders(versionIds)})
       ORDER BY spell_version_id, ${column}`,
      [...versionIds],
      (stored) => ({
        spell_version_id: sqlInteger(stored, 'spell_version_id'),
        value: sqlString(stored, 'value'),
      }),
    )) {
      const values = grouped.get(row.spell_version_id);
      if (values === undefined) {
        grouped.set(row.spell_version_id, [row.value]);
      } else {
        values.push(row.value);
      }
    }
    return grouped;
  }

  private spellEntry(
    route: SpellAccessRoute | LongRestCandidate,
    facts: ReadonlyMap<number, SpellFacts>,
    withText: boolean,
  ): PrintableSpell {
    const spellFacts = facts.get(route.spell_version_id);
    if (spellFacts === undefined) {
      throw new Error(
        `Missing printable facts for spell version ${route.spell_version_id}.`,
      );
    }
    return {
      ...spellFacts,
      spell_identity_id: route.spell_identity_id,
      casting_mode: route.casting_mode,
      spellcasting_ability: route.spellcasting_ability,
      attack_bonus:
        spellFacts.attack_modes.length === 0 ? null : route.attack_bonus,
      save_dc:
        spellFacts.save_abilities.length === 0 ? null : route.save_dc,
      description: withText ? spellFacts.description : null,
    };
  }
}
