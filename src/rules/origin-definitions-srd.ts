/**
 * This work includes material from the System Reference Document 5.2.1
 * ("SRD 5.2.1") by Wizards of the Coast LLC, available at
 * https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the Creative
 * Commons Attribution 4.0 International License, available at
 * https://creativecommons.org/licenses/by/4.0/legalcode.
 *
 * ---
 *
 * THE LINEAGE-SPELL BRIDGE'S FIRST HALF (dispatch A6, per D56): the
 * `species_definitions` rows the grant machinery reads. Nothing in this
 * repository ever wrote that table before — `species_templates` carries the
 * printed traits the guided species step copies, and `species_definitions`
 * carries the GRANT RULES `SourceRuleReader` resolves a species source
 * instance against. Two review rounds of the guided-builder plan died on that
 * distinction, so it is restated here where the first writer lives.
 *
 * FOUR SPECIES ARE SEEDED, AND THE FOURTH IS THE RULE'S OWN TEST. The stored
 * configured-choice rules below are the census of bundled species whose
 * lineages grant spells; consumers parse those rows rather than maintaining a
 * parallel species-key set. The rule stands: a definition row carrying an
 * empty rule list and anchoring nothing would make `add_source` succeed while
 * granting nothing — a row that exists only to look complete. When a species
 * gains a real reason, it gains a row — and HUMAN gained one
 * (skills-with-provenance plan §3.4/§3.6):
 * Skillful is a structured skill grant now, the grant requires a species
 * SOURCE INSTANCE to hang on, and the source requires this definition row.
 * Human's `grant_rules` is honestly empty — Skillful is not a spell rule; the
 * generator's SPECIES SKILL ARM (`syncSpeciesSkillGrants`) reads the seam's
 * `SPECIES_SKILL_GRANT_PLANS` by content key. Elf's Keen Senses rides the
 * same arm on the definition Elf already had. The remaining five SRD species
 * still anchor nothing and still get no row.
 *
 * THE SPELL NAMES ARE TRANSCRIBED FROM THE SRD EXTRACT, NOT FROM MEMORY:
 * `docs/srd/source/species-descriptions.txt` — the `Elven Lineages` table
 * (its Drow / High Elf / Wood Elf rows), the Gnome's `Forest Gnome.` /
 * `Rock Gnome.` sub-options, the `Fiendish Legacies` table (Abyssal /
 * Chthonic / Infernal) and the Tiefling's `Otherworldly Presence` trait. Per
 * D59 that extract is the licensing surface: SRD 5.2.1 under CC-BY is
 * authorized to ship, and nothing here is taken from anywhere else.
 *
 * WHAT IS CONDITIONAL AND WHAT IS NOT. Every lineage benefit hangs inside one
 * closed `configured_choice` descriptor. `SourceRuleReader` expands only the
 * option named at {@link LINEAGE_CHOICE_CONFIG_KEY}; an absent choice expands
 * no nested material grant. Exactly one spell in the three species remains a
 * root rule: Tiefling's unconditional Thaumaturgy.
 *
 * TWO LIMITS OF THE RULE VOCABULARY, STATED RATHER THAN PAPERED OVER:
 *
 *  - The level-3 and level-5 spells use `active_from_character_level`, read
 *    from the character's actual total class levels. No species config value
 *    pretends to be character level.
 *  - The Forest Gnome's Speak with Animals allows "a number of times equal
 *    to your Proficiency Bonus" of slot-free casts. `free_cast.uses` is a
 *    fixed positive integer; a literal 2 would be right at level 1 and
 *    silently wrong from level 5 on — a plausible wrong number, which this
 *    project forbids outright. The rule ships `with_slots` and always
 *    prepared, WITHOUT the free-cast pool, and this comment is the record
 *    of what was left out and why.
 */
import { officialSpellKey } from '../catalog/catalog-key';
import { normalizeContentIdentityName } from '../catalog/content-identity';
import { ensureBundledStableContentIdentity } from '../catalog/content-registry';
import {
  sqlNullableString,
  type RowCodec,
} from '../db/codecs';
import type { DatabaseContext } from '../db/database';
import { GrantRule } from '../grants/grant-rule';
import { parseSourceGrantRules } from '../grants/configured-choice-rule';
import { BUNDLED_ORIGIN_RULES_EDITION } from './origins-srd';

type GrantRuleSeed = Readonly<Record<string, unknown>>;

/**
 * The config path a lineage choice will live at, mirroring the Cleric's
 * `divine_order.chosen_option` precedent (`class-progression-lookup.ts`).
 * One key for all three species — the Tiefling's table calls its rows
 * "legacies", but a second name for the same shape is drift by construction.
 * Exported so the unit that eventually RECORDS the choice writes the key the
 * rules already read.
 */
export const LINEAGE_CHOICE_CONFIG_KEY = 'lineage.chosen_option';

interface LineageOption {
  /** The printed row name the config value must equal, verbatim. */
  readonly option: string;
  /** Cantrips the level-1 benefit names ("You (also) know the X cantrip"). */
  readonly cantrips: readonly string[];
  /** The Level 3 / Level 5 table columns: [character level, spell name]. */
  readonly leveled: readonly (readonly [3 | 5, string])[];
}

/** `docs/srd/source/species-descriptions.txt` — the `Elven Lineages` table. */
const ELVEN_LINEAGES: readonly LineageOption[] = [
  {
    option: 'Drow',
    cantrips: ['Dancing Lights'],
    leveled: [
      [3, 'Faerie Fire'],
      [5, 'Darkness'],
    ],
  },
  {
    option: 'High Elf',
    cantrips: ['Prestidigitation'],
    leveled: [
      [3, 'Detect Magic'],
      [5, 'Misty Step'],
    ],
  },
  {
    option: 'Wood Elf',
    cantrips: ['Druidcraft'],
    leveled: [
      [3, 'Longstrider'],
      [5, 'Pass without Trace'],
    ],
  },
];

/**
 * The Gnome's lineage prints no table; its two sub-options live inside the
 * `Gnomish Lineage` trait prose. The Forest Gnome's Speak with Animals is a
 * LEVEL-1 SPELL granted at character level 1 — "You also always have the
 * Speak with Animals spell prepared" — so it rides the always-prepared shape
 * with no level gate; see the header for the free-cast pool it does not get.
 */
const GNOMISH_LINEAGES: readonly LineageOption[] = [
  {
    option: 'Forest Gnome',
    cantrips: ['Minor Illusion'],
    leveled: [],
  },
  {
    option: 'Rock Gnome',
    cantrips: ['Mending', 'Prestidigitation'],
    leveled: [],
  },
];

/** `docs/srd/source/species-descriptions.txt` — the `Fiendish Legacies` table. */
const FIENDISH_LEGACIES: readonly LineageOption[] = [
  {
    option: 'Abyssal',
    cantrips: ['Poison Spray'],
    leveled: [
      [3, 'Ray of Sickness'],
      [5, 'Hold Person'],
    ],
  },
  {
    option: 'Chthonic',
    cantrips: ['Chill Touch'],
    leveled: [
      [3, 'False Life'],
      [5, 'Ray of Enfeeblement'],
    ],
  },
  {
    option: 'Infernal',
    cantrips: ['Fire Bolt'],
    leveled: [
      [3, 'Hellish Rebuke'],
      [5, 'Darkness'],
    ],
  },
];

function slug(name: string): string {
  return name.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-');
}

function spellKey(name: string): string {
  return officialSpellKey(BUNDLED_ORIGIN_RULES_EDITION, name);
}

/**
 * "You (also) know the X cantrip." Known at will, never through slots, and
 * never against a prepared-spell limit (`materializeFixedSpell` defaults
 * `counts_against_limit` off).
 */
function lineageCantripRule(
  speciesSlug: string,
  option: string,
  spell: string,
): GrantRuleSeed {
  return {
    kind: 'fixed_spell',
    rule_key: `${speciesSlug}-lineage-${slug(option)}-${slug(spell)}`,
    spell_version_key: spellKey(spell),
    bucket: 'cantrip_known',
    with_slots: false,
  };
}

/**
 * "You always have that spell prepared. You can cast it once without a spell
 * slot, and you regain the ability to cast it in that way when you finish a
 * Long Rest. You can also cast the spell using any spell slots you have of
 * the appropriate level." — the Warlock Mystic Arcanum free-cast shape plus
 * always-prepared and slots.
 */
function lineageLeveledRule(
  speciesSlug: string,
  option: string,
  characterLevel: 3 | 5,
  spell: string,
): GrantRuleSeed {
  return {
    kind: 'fixed_spell',
    rule_key: `${speciesSlug}-lineage-${slug(option)}-${slug(spell)}`,
    spell_version_key: spellKey(spell),
    bucket: 'prepared',
    always_prepared: true,
    with_slots: true,
    free_cast: {
      uses: 1,
      recovery: 'long_rest',
      pool_scope: 'per_spell',
    },
    active_from_character_level: characterLevel,
  };
}

function materialRulesForLineage(
  speciesSlug: string,
  lineage: LineageOption,
): GrantRuleSeed[] {
  const rules: GrantRuleSeed[] = [];
  for (const cantrip of lineage.cantrips) {
    if (!(speciesSlug === 'elf' && lineage.option === 'High Elf')) {
      rules.push(lineageCantripRule(speciesSlug, lineage.option, cantrip));
    }
  }
  for (const [characterLevel, spell] of lineage.leveled) {
    rules.push(
      lineageLeveledRule(speciesSlug, lineage.option, characterLevel, spell),
    );
  }
  return rules;
}

function configuredChoiceRule(
  speciesSlug: 'elf' | 'gnome' | 'tiefling',
  label: string,
  lineages: readonly LineageOption[],
): GrantRuleSeed {
  const unknownSheetFields = speciesSlug === 'elf'
    ? ['walking_speed_feet', 'darkvision_feet']
    : speciesSlug === 'tiefling'
      ? ['damage_resistances']
      : [];
  return {
    kind: 'configured_choice',
    rule_key: `${speciesSlug}-lineage`,
    label,
    config_key: LINEAGE_CHOICE_CONFIG_KEY,
    required: true,
    ability_choice: {
      config_key: 'spellcasting_ability',
      options: ['intelligence', 'wisdom', 'charisma'],
    },
    unknown_sheet_fields: unknownSheetFields,
    projected_trait_names: speciesSlug === 'elf' ? ['Darkvision'] : [],
    options: lineages.map((lineage) => {
      const effects = speciesSlug === 'elf' && lineage.option === 'Wood Elf'
        ? [{ kind: 'speed', label: 'Wood Elf Speed', speed_bonus_feet: 5 }]
        : speciesSlug === 'tiefling'
          ? [{
              kind: 'damage_resistance',
              label: `${lineage.option} Legacy`,
              damage_type: lineage.option === 'Abyssal'
                ? 'Poison'
                : lineage.option === 'Chthonic'
                  ? 'Necrotic'
                  : 'Fire',
            }]
          : [];
      return {
        value: lineage.option,
        label: lineage.option,
        sheet: speciesSlug === 'elf'
          ? { darkvision_feet: lineage.option === 'Drow' ? 120 : 60 }
          : {},
        effects,
        grants: [
          ...materialRulesForLineage(speciesSlug, lineage),
          ...(speciesSlug === 'gnome' && lineage.option === 'Forest Gnome'
            ? [forestGnomeSpeakWithAnimalsRule()]
            : []),
        ],
        replaceable_spell_choice:
          speciesSlug === 'elf' && lineage.option === 'High Elf'
            ? {
                config_key: 'lineage.high_elf_cantrip',
                label: 'High Elf cantrip',
                required: true,
                spell_list: 'Wizard',
                spell_level: 0,
                initial_spell_version_key: spellKey('Prestidigitation'),
                display_on_sheet: true,
              }
            : null,
      };
    }),
  };
}

/**
 * "You also always have the Speak with Animals spell prepared." — Forest
 * Gnome, level 1, no level gate. See the header for the missing PB-scaling
 * free-cast pool.
 */
function forestGnomeSpeakWithAnimalsRule(): GrantRuleSeed {
  return {
    kind: 'fixed_spell',
    rule_key: 'gnome-lineage-forest-gnome-speak-with-animals',
    spell_version_key: spellKey('Speak with Animals'),
    bucket: 'prepared',
    always_prepared: true,
    with_slots: true,
  };
}

/**
 * "Otherworldly Presence. You know the Thaumaturgy cantrip." — every
 * Tiefling, no legacy required. The one unconditional rule in this file, and
 * therefore the one spell the guided builder grants today.
 */
function otherworldlyPresenceRule(): GrantRuleSeed {
  return {
    kind: 'fixed_spell',
    rule_key: 'tiefling-otherworldly-presence-thaumaturgy',
    spell_version_key: spellKey('Thaumaturgy'),
    bucket: 'cantrip_known',
    with_slots: false,
  };
}

export interface BundledSpeciesDefinition {
  readonly content_key: string;
  readonly name: string;
  readonly grant_rules: readonly GrantRuleSeed[];
}

/**
 * The definitions, every source rule validated through the closed union parser
 * before it can be seeded — a typo'd kind or a malformed gate throws at boot
 * instead of sitting in the database until `SourceRuleReader` trips on it in
 * the middle of someone's species application.
 */
export function bundledSpeciesDefinitions(): readonly BundledSpeciesDefinition[] {
  const definitions: readonly BundledSpeciesDefinition[] = [
    {
      content_key: `${BUNDLED_ORIGIN_RULES_EDITION}:species:elf`,
      name: 'Elf',
      grant_rules: [configuredChoiceRule('elf', 'Elven Lineage', ELVEN_LINEAGES)],
    },
    {
      content_key: `${BUNDLED_ORIGIN_RULES_EDITION}:species:gnome`,
      name: 'Gnome',
      grant_rules: [configuredChoiceRule('gnome', 'Gnomish Lineage', GNOMISH_LINEAGES)],
    },
    {
      content_key: `${BUNDLED_ORIGIN_RULES_EDITION}:species:tiefling`,
      name: 'Tiefling',
      grant_rules: [
        otherworldlyPresenceRule(),
        configuredChoiceRule('tiefling', 'Fiendish Legacy', FIENDISH_LEGACIES),
      ],
    },
    {
      // HUMAN CARRIES NO SPELL RULES AND THAT IS THE POINT of its row: it
      // exists so the guided species apply mints a SOURCE INSTANCE for the
      // Skillful skill grant to hang on (skills-with-provenance §3.4 — "Human
      // gets a species source instance"). The grant itself is minted by the
      // generator's species skill arm from the seam's
      // `SPECIES_SKILL_GRANT_PLANS`, keyed by this content key; see the
      // header for why an empty rule list is honest here and nowhere else.
      content_key: `${BUNDLED_ORIGIN_RULES_EDITION}:species:human`,
      name: 'Human',
      grant_rules: [],
    },
  ];
  for (const definition of definitions) {
    parseSourceGrantRules(definition.grant_rules);
  }
  return definitions;
}

const grantRulesColumn: RowCodec<{ readonly grant_rules: string | null }> = (
  row,
) => ({ grant_rules: sqlNullableString(row, 'grant_rules') });

/**
 * True when every bundled definition is present AND carries exactly the rules
 * this build authors. Comparing the rules — not merely counting keys — is
 * what lets a rule correction in a later build actually deploy; the bundled
 * content keys are bundle-owned (imports mint namespaced keys,
 * `src/catalog/catalog-key.ts`), so rewriting a drifted row is repair, not
 * overwriting user content. User-authored species live under their own keys
 * and are never touched; a user-authored NAME collision is yielded to below.
 */
export function hasBundledSpeciesDefinitions(db: DatabaseContext): boolean {
  for (const definition of bundledSpeciesDefinitions()) {
    const row = db.one(
      `SELECT grant_rules FROM species_definitions WHERE content_key = ?`,
      [definition.content_key],
      grantRulesColumn,
    );
    if (
      row === null ||
      row.grant_rules !== JSON.stringify(definition.grant_rules)
    ) {
      return false;
    }
  }
  return true;
}

/** Boot-time entry point. Returns whether it wrote anything. */
export function ensureBundledSpeciesDefinitions(db: DatabaseContext): boolean {
  if (hasBundledSpeciesDefinitions(db)) {
    return false;
  }
  seedSpeciesDefinitions(db);
  return true;
}

/**
 * Upserts the three definitions, YIELDING when the `(name, rules_edition)`
 * slot is held by a DIFFERENT content key — the same non-destructive rule as
 * `upsertClass` (`class-progression-lookup.ts`), for the same reason: the
 * table is unique on both `content_key` and `(name, rules_edition)`, so a
 * user-authored "Elf" and the bundled one cannot coexist, and the bundled row
 * has no claim to win.
 */
export function seedSpeciesDefinitions(db: DatabaseContext): void {
  db.transaction(() => {
    const timestamp = new Date().toISOString();
    for (const definition of bundledSpeciesDefinitions()) {
      const holder = db.scalar<string>(
        `SELECT content_key FROM species_definitions
         WHERE name = ? AND rules_edition = ?`,
        [definition.name, BUNDLED_ORIGIN_RULES_EDITION],
      );
      if (holder !== null && holder !== definition.content_key) {
        continue;
      }
      ensureBundledStableContentIdentity(db, {
        kind: 'species',
        contentKey: definition.content_key,
        normalizedName: normalizeContentIdentityName(definition.name),
      });
      db.exec(
        `INSERT INTO species_definitions (
           content_key, name, rules_edition, repeatable, grant_rules,
           created_at, updated_at
         ) VALUES (?, ?, ?, 0, ?, ?, ?)
         ON CONFLICT(content_key) DO UPDATE SET
           name = excluded.name,
           rules_edition = excluded.rules_edition,
           repeatable = excluded.repeatable,
           grant_rules = excluded.grant_rules,
           updated_at = excluded.updated_at`,
        [
          definition.content_key,
          definition.name,
          BUNDLED_ORIGIN_RULES_EDITION,
          JSON.stringify(definition.grant_rules),
          timestamp,
          timestamp,
        ],
      );
    }
  });
}
