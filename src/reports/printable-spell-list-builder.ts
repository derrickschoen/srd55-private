import {
  sqlBoolean,
  sqlInteger,
  sqlNullableString,
  sqlString,
  type SqlRow,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import type {
  Ability,
  CastingMode,
  RulesEdition,
  UpcastScale,
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
  readonly school: string;
  readonly casting_time: string | null;
  readonly action_type: string | null;
  readonly range: string | null;
  readonly duration: string | null;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly components: string | null;
  /**
   * THE UPCAST PROGRESSION — the one structured value in this change that puts
   * information on the card a player did not already have.
   *
   * The parsed range and material cost deliberately do NOT appear beside their
   * printed lines: those lines already say the same thing in the words the
   * author chose, and a second rendering of them would be D26 structure for its
   * own sake. Nothing has ever printed an upcast progression, because until now
   * nothing has ever STORED one.
   *
   * `upcast_levels` is EMPTY when the catalog document did not say, which is
   * not the same as "this spell cannot be upcast" — the card prints nothing at
   * all in that case rather than asserting either.
   */
  readonly upcast_scale: UpcastScale | null;
  readonly upcast_levels: number[];
  readonly upcast_summary: string | null;
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
  readonly school: string;
  readonly casting_time: string | null;
  readonly action_type: string | null;
  readonly range: string | null;
  readonly duration: string | null;
  readonly concentration: boolean;
  readonly ritual: boolean;
  readonly components: string | null;
  readonly description: string | null;
  readonly upcast_scale: UpcastScale | null;
  readonly upcast_levels: number[];
  readonly upcast_summary: string | null;
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

function decodeFacts(row: SqlRow): Omit<
  SpellFacts,
  'attack_modes' | 'save_abilities' | 'upcast_levels'
> {
  const castingTime = sqlNullableString(row, 'casting_time');
  return {
    spell_version_id: sqlInteger(row, 'id'),
    name: sqlString(row, 'display_name'),
    edition: sqlString(row, 'rules_edition') as RulesEdition,
    level: sqlInteger(row, 'level'),
    school: sqlString(row, 'school'),
    casting_time: castingTime,
    action_type:
      sqlNullableString(row, 'action_type') ?? actionType(castingTime),
    range: sqlNullableString(row, 'range'),
    duration: sqlNullableString(row, 'duration'),
    concentration: sqlBoolean(row, 'concentration'),
    ritual: sqlBoolean(row, 'ritual'),
    components: sqlNullableString(row, 'components'),
    description: sqlNullableString(row, 'short_summary'),
    upcast_scale: sqlNullableString(row, 'upcast_scale') as UpcastScale | null,
    upcast_summary: sqlNullableString(row, 'upcast_summary'),
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
    const upcastLevels = this.groupedUpcastLevels(bindings);
    const facts = new Map<number, SpellFacts>();

    for (const row of this.db.all(
      `SELECT id, display_name, rules_edition, level, school,
              casting_time, action_type, range, duration, concentration,
              ritual, components, short_summary, upcast_scale, upcast_summary
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
      });
    }
    return facts;
  }

  /**
   * The upcast levels for every spell in one query, ASCENDING.
   *
   * SEPARATE FROM `groupedStrings` FOR THE REASON `#syncUpcastLevels` IS
   * SEPARATE FROM `#syncSimplePivot` ONE MODULE OVER: that helper's `ORDER BY`
   * is over a TEXT column, and ordering levels as text puts `11` before `2`. A
   * list of levels printed `2, 11, 17` and one printed `11, 17, 2` are the same
   * set and only one of them is readable.
   */
  private groupedUpcastLevels(
    versionIds: readonly number[],
  ): Map<number, number[]> {
    const grouped = new Map<number, number[]>();
    for (const row of this.db.all(
      `SELECT spell_version_id, level
       FROM spell_version_upcast_levels
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
