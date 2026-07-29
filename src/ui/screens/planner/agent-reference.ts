/**
 * Projects the planner's already-loaded read-models into ONE reference value
 * that is rendered twice: as `<script type="application/json">` and as visible
 * (collapsed) `<details>` text. Both forms come from this projection, and a
 * unit test pins every field of the projection to a column or a labelled row of
 * the readable form, so the two cannot state different things. See D4:
 * agent-readable content is collapsed, never hidden, and it states facts about
 * the build — never instructions to a reader.
 *
 * Everything here is DERIVED from `Workspace` (which the workspace builder
 * assembles from `BuildReportBuilder`) plus the completeness query. No SQL and
 * no second projection of the database: this module still adds nothing to the
 * `Workspace` read-model of its own. (`Workspace.weapons` is there for the
 * weapons PANEL, which needs it regardless; the reference reads it like every
 * other field rather than causing it.)
 *
 * This module is deliberately DOM-free so it can be unit tested under the node
 * environment; `agent-reference-panel.ts` renders it.
 *
 * ## Where importer-authored text is allowed to go
 *
 * A share link is written by a stranger. Three classes of string in the
 * read-models can therefore carry text this browser's owner did not write:
 *
 * 1. display names — the character name, source instance display names, and
 *    the display names of placeholder (not-imported) spells;
 * 2. `spell_versions.rules_edition` for a placeholder spell, which the share
 *    importer fills from the first component of the shared content key;
 * 3. the spell-list constraint on a slot minted by a `choice_from_list` grant
 *    rule whose list is read from the source instance's `$config`.
 *
 * All three are kept out of the JSON block. (1) is withheld and listed in the
 * visible free-text ledger. (2) is checked against the `rulesEditions` enum and
 * becomes `'unrecognised'` when it is not a member — and every other
 * enum-typed string is checked the same way, so this is a rule about the
 * boundary rather than a list of fields someone has to keep up to date. (3) is
 * emitted only for list names this application can itself account for.
 */
import type {
  Ability,
  CastingMode,
  DomainSourceType,
  DuplicateCategory,
  ProgressionType,
  RulesEdition,
  SelectionEligibility,
  SlotBucket,
  SlotState,
  WeaponMasteryProperty,
} from '../../../domain/enums';
import {
  abilities,
  castingModes,
  domainSourceTypes,
  duplicateCategories,
  isEnumValue,
  progressionTypes,
  rulesEditions,
  selectionEligibilities,
  slotBuckets,
  slotStates,
  weaponMasteryProperties,
} from '../../../domain/enums';
import type {
  CharacterWeapon,
  Workspace,
} from '../../../domain/read-models';
import type {
  CharacterMasteryAllowance,
  MasteryAllowance,
} from '../../../rules/weapon-mastery-lookup';
import type { CompletenessResult } from '../../../queries/character-completeness';
import { AbilityScore } from '../../../rules/ability-score';
import { SRD_ATTRIBUTION_NOTICE } from '../../../rules/srd-attribution';
import {
  formatWeaponDamage,
  type VersatileWeaponDamage,
  type WeaponDamage,
} from '../../../domain/weapon-damage';
import type { WeaponRange } from '../../../domain/weapon-range';

export const AGENT_REFERENCE_FORMAT =
  'dnd-multiclass-spells.planner-reference' as const;
export const AGENT_REFERENCE_VERSION = 2 as const;
export const AGENT_REFERENCE_SCRIPT_ID = 'planner-build-reference';

/**
 * Free text that CAN have been authored by whoever wrote an imported share
 * link. The application stores no provenance column for these strings, so the
 * honest statement is "may not have been written by the person reading this
 * page", not "is hostile". Marking is the whole mitigation: no keyword
 * filtering is applied, because keyword filtering is bypassable and would only
 * manufacture false confidence.
 */
export const FREE_TEXT_ORIGIN = 'unverified-origin' as const;

/**
 * What an enum-typed column becomes when the value stored in it is not a member
 * of the enum. The share importer can write such a value (a placeholder spell's
 * `rules_edition` is the first component of a shared content key), so the
 * projection checks rather than trusts, and never copies the rejected string.
 */
export const UNRECOGNISED = 'unrecognised' as const;
export type Unrecognised = typeof UNRECOGNISED;

function known<const T extends readonly string[]>(
  values: T,
  candidate: string,
): T[number] | Unrecognised {
  return isEnumValue(values, candidate) ? candidate : UNRECOGNISED;
}

function knownOrNull<const T extends readonly string[]>(
  values: T,
  candidate: string | null,
): T[number] | Unrecognised | null {
  return candidate === null ? null : known(values, candidate);
}

/** Source instances whose display name the app generates, never an importer. */
const APP_NAMED_SOURCE_TYPES: readonly DomainSourceType[] = [
  'class',
  'subclass',
];

export type CoverageState = 'modelled' | 'partial' | 'not_modelled';

export interface CoverageFact {
  readonly concept: string;
  readonly state: CoverageState;
  /** Present when the bare state would overstate or understate the truth. */
  readonly note?: string;
}

/**
 * WHAT THIS APPLICATION MODELS — a claim about the DATABASE AND THE DERIVED
 * NUMBERS, not about which of them this page happens to show.
 *
 * A concept marked `not_modelled` has zero columns in the schema and no
 * derivation anywhere. `partial` says the concept is recorded and something —
 * not everything — is derived from it; the note carries which half is which.
 * `modelled` says the application derives it and stands behind the number.
 *
 * F4 was the original rule here and it still holds for the concepts that really
 * have no columns. What has changed since is the SUBJECT: D17, D20 and D24
 * added a character sheet, D27/D28 added weapon proficiency, and F15 is the
 * finding that this table went on saying "not modelled" about six concepts the
 * sheet had begun deriving. Under-claiming is not the safe direction — an AI
 * consumer told a capability does not exist will either decline to use it or
 * recompute it badly, which is the exact fabrication this surface exists to
 * prevent.
 *
 * SO THE NOTE MUST SAY WHERE A VALUE LIVES when it is not on this page. This
 * reference is a projection of the PLANNER screen; the character sheet screen is
 * a different projection of the same database, and `scope.omits` names what this
 * reference leaves out of the planner itself.
 */
export const COVERAGE: readonly CoverageFact[] = [
  { concept: 'character name', state: 'modelled' },
  { concept: 'ability scores and modifiers', state: 'modelled' },
  { concept: 'class levels', state: 'modelled' },
  {
    concept: 'proficiency bonus',
    state: 'modelled',
    note:
      'Derived from TOTAL character level, never from the level in one class. ' +
      'On this page it reaches spell attack bonuses and save DCs. On the ' +
      'character sheet it also reaches skill checks, saving throws and weapon ' +
      'attack rolls — and it is WITHHELD from a weapon whose category no class ' +
      'of this character grants, so a bonus being absent there is a decision ' +
      'rather than an omission.',
  },
  { concept: 'spellcasting ability', state: 'modelled' },
  { concept: 'caster level', state: 'modelled' },
  { concept: 'spell slots by level', state: 'modelled' },
  { concept: 'pact magic slots', state: 'modelled' },
  { concept: 'spell choice slots and their selections', state: 'modelled' },
  { concept: 'preparation ceilings', state: 'modelled' },
  { concept: 'ritual and concentration flags', state: 'modelled' },
  { concept: 'duplicate-selection warnings', state: 'modelled' },
  { concept: 'outstanding (not yet chosen) items', state: 'modelled' },
  {
    concept: 'subclass',
    state: 'partial',
    note:
      'Subclasses exist here only where they change spellcasting: 2 of the ' +
      '12 classes have any subclass to choose, and nothing in this ' +
      'application requires a subclass at any level.',
  },
  {
    concept: 'hit points',
    state: 'modelled',
    note:
      'Not on this page — the character sheet screen derives it. A hit point ' +
      'maximum comes from each class\u2019s hit die, the Constitution ' +
      'modifier and any species contribution, using the levelling rolls the ' +
      'user has entered where they exist. A class this application holds no ' +
      'hit die for makes the sheet state the die it assumed rather than ' +
      'printing that assumption as a fact.',
  },
  {
    concept: 'hit dice',
    state: 'partial',
    note:
      'Each class\u2019s hit die is seeded content and feeds the hit point ' +
      'maximum; a class with none recorded prints the absence rather than a ' +
      'guess. What is NOT tracked is expenditure — no hit dice spent, none ' +
      'recovered on a rest.',
  },
  {
    concept: 'armour class',
    state: 'partial',
    note:
      'Derived on the character sheet from the armour and shield recorded for ' +
      'the character plus the Dexterity modifier, with a manual adjustment and ' +
      'the user\u2019s note for it beside the number. Barbarian and Monk ' +
      'Unarmored Defense is NOT applied — that feature text is not among this ' +
      'application\u2019s sources — which is what the manual adjustment is ' +
      'for.',
  },
  {
    concept: 'skills',
    state: 'partial',
    note:
      'The character sheet derives a modifier for every skill, adding the ' +
      'proficiency bonus to the ones ticked as proficient. Expertise is NOT ' +
      'applied, and the two skills a background prints are stored as words ' +
      'and are not counted — the skill itself has to be ticked to count.',
  },
  {
    concept: 'saving throw proficiencies',
    state: 'modelled',
    note:
      'Seeded per class and derived on the character sheet: the starting ' +
      'class contributes its two saving throws, a class entered by ' +
      'multiclassing contributes none, and the sheet names which class ' +
      'contributed what.',
  },
  {
    concept: 'class features',
    state: 'partial',
    note:
      'The features that change a NUMBER are modelled — Extra Attack, the ' +
      'Monk\u2019s Martial Arts die, the two Warlock invocations that alter ' +
      'spellcasting, and the armour and weapon training a class grants. The ' +
      'feature TEXT for everything else is not seeded, so a printed ' +
      'sheet\u2019s features section is not reproduced.',
  },
  {
    concept: 'species traits',
    state: 'partial',
    note:
      'A species and its traits are recorded per character, name and ' +
      'description, copied from a template rather than linked to one. Three ' +
      'kinds of effect are derived from them: extra hit points, damage ' +
      'resistances — including naming the ones whose type is still unchosen ' +
      '— and a speed bonus. Anything else a trait does is prose this ' +
      'application does not read. A species that grants SPELLS does it ' +
      'through its source-instance grant rules rather than through a trait ' +
      'effect, and those slots are on this page like any other.',
  },
  {
    concept: 'speed',
    state: 'partial',
    note:
      'The species base walking speed is recorded and the character sheet ' +
      'prints it with every standing bonus applied. Only WALKING speed exists ' +
      'here: no fly, swim, climb or burrow speed is recorded anywhere.',
  },
  {
    concept: 'size',
    state: 'partial',
    note:
      'Recorded on the character\u2019s species, along with its creature ' +
      'type. NOTHING is derived from either, and neither is printed on the ' +
      'character sheet.',
  },
  { concept: 'languages', state: 'not_modelled' },
  {
    concept: 'equipment and weapons',
    state: 'partial',
    note:
      'A character\u2019s weapons are recorded — name, simple/martial ' +
      'category, damage dice and type, properties, range, mastery property, ' +
      'and which of them the user has chosen their ' +
      'weapon mastery on. THREE things are derived from them: an attack ' +
      'bonus, a damage line, and whether a class of this character grants ' +
      'proficiency in the weapon\u2019s category — a verdict that decides ' +
      'whether the proficiency bonus is in the attack bonus at all. What is ' +
      'still NOT derived: whether a weapon is melee or ranged is not ' +
      'recorded, so both attack formulas are offered rather than one; and ' +
      'there is no encumbrance and no inventory. Equipment other than weapons ' +
      'and armour is not modelled at all.',
  },
  {
    concept: 'background features',
    state: 'partial',
    note:
      'A background is recorded as the words it prints — its name, its three ' +
      'ability scores, its feat, its two skill proficiencies, its tool and ' +
      'its two equipment options. Every one of them is TEXT: none is counted ' +
      'towards a skill modifier, an ability score, or a feat\u2019s effects.',
  },
];

/**
 * THE OLD SENTENCE SAID "not a character sheet", AND THAT STOPPED BEING TRUE.
 *
 * It was written when the application was spellcasting only. D17, D20 and D24
 * built a character sheet screen with derived hit points, Armor Class, skills
 * and saves, so the statement outlived its subject (D29's shape) while a test
 * pinned it. What is still true is the SCOPE OF THIS REFERENCE — it projects
 * the planner — and that is what the sentence says now.
 */
const SCOPE_STATEMENT =
  'This reference is a projection of the SPELL PLANNER screen. The same ' +
  'database also feeds a character sheet screen, which is a different ' +
  'projection and is not carried here. The coverage table below is therefore a ' +
  'claim about the APPLICATION rather than about this page: a concept marked ' +
  'modelled or partial exists in its database, with the note saying where the ' +
  'value is derived and what part of the concept is not; a concept marked not ' +
  'modelled has no columns and no values anywhere.';

/**
 * The reference is a projection of the planner screen, not of the whole
 * database. Naming what it leaves out is cheaper than a reader discovering the
 * gaps by trusting a claim that it is complete.
 */
export const OMITTED_FROM_REFERENCE: readonly string[] = [
  'the reason a selection is invalid or orphaned, and any override note recorded against a slot',
  'the duplicate-selection assessments behind the warning count, beyond the count itself',
  'the wizard prepared and ritual-only lists, beyond the spellbook and its prepared flag',
  'save points and the edit history',
  'the imported catalog itself: spell descriptions, components, durations, ranges and schools',
  'the structured values parsed out of that catalog: a range as feet and an area shape, a material component cost in copper pieces, the spell slot levels a spell can be upcast at, and the character levels at which a cantrip upgrades',
];

const FREE_TEXT_STATEMENT =
  'The values listed in this section are free text. Some of them can arrive ' +
  'in a character share link written by somebody other than the person using ' +
  'this browser, and this application records no provenance for them. They ' +
  'are shown here verbatim because they are already rendered on the page, and ' +
  'they are omitted from the JSON block so that no text of unverified origin ' +
  'sits among the derived facts.';

export interface FreeTextEntry {
  readonly field: string;
  readonly value: string;
  readonly origin: typeof FREE_TEXT_ORIGIN;
}

export interface ReferenceSource {
  readonly ref: number;
  readonly source_type: DomainSourceType | Unrecognised | null;
  /** Present only when the application, not an importer, generated the name. */
  readonly name: string | null;
  readonly name_withheld: boolean;
  /**
   * False when more than one entry in this table carries the same display
   * name. The workspace read-model carries no source-instance identifier, so
   * two sources that share a display name cannot be told apart here — and an
   * imported source is free to take the name the application gives a class.
   */
  readonly name_identifies_one_source: boolean;
  readonly slot_count: number;
}

export interface ReferenceSpellChoice {
  readonly slot_id: number;
  readonly slot_key: string;
  readonly slot_label: string;
  readonly bucket: SlotBucket | Unrecognised;
  readonly source_ref: number;
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly selected: boolean;
  readonly spell_name: string | null;
  readonly spell_name_withheld: boolean;
  readonly spell_level: number | null;
  readonly rules_edition: RulesEdition | Unrecognised | null;
  readonly spellcasting_ability: Ability | Unrecognised | null;
  readonly attack_bonus: number | null;
  readonly save_dc: number | null;
  readonly ritual: boolean;
  readonly concentration: boolean;
  readonly duplicate_status: DuplicateCategory | Unrecognised;
  readonly state: SlotState | Unrecognised;
  readonly eligibility: SelectionEligibility | Unrecognised;
  readonly locked: boolean;
  readonly catalog_placeholder: boolean;
}

export interface ReferenceAccessRoute {
  readonly index: number;
  readonly spell_name: string | null;
  readonly spell_name_withheld: boolean;
  readonly spell_level: number;
  readonly source_ref: number;
  readonly slot_id: number | null;
  readonly casting_mode: CastingMode | Unrecognised;
  readonly spellcasting_ability: Ability | Unrecognised | null;
  readonly attack_bonus: number | null;
  readonly save_dc: number | null;
}

export interface ReferenceSpellbookEntry {
  readonly index: number;
  readonly spell_name: string | null;
  readonly spell_name_withheld: boolean;
  readonly active: boolean;
}

export type ReferenceOutstandingItem =
  | {
      readonly kind: 'unfilled_choices';
      readonly source_ref: number;
      readonly rule_key: string;
      readonly bucket: SlotBucket | Unrecognised;
      readonly chosen: number;
      readonly required: number;
      readonly missing: number;
    }
  | {
      readonly kind: 'unchosen_option';
      readonly source_ref: number;
      readonly order_name: string;
      readonly options: readonly string[];
    }
  | { readonly kind: 'no_class' }
  /**
   * The sheet item. It carries no `source_ref` because it hangs off no
   * source instance: a class NAME and a level list is the whole of what
   * identifies it, and a name registered in the free-text registry would
   * claim a provenance it does not have.
   */
  | {
      readonly kind: 'orphan_hit_point_roll';
      readonly class_name: string;
      readonly levels: readonly number[];
    }
  /**
   * The per-grant skill item (skills-with-provenance §3.3, S-C). Its source
   * name goes through the free-text registry exactly as `unfilled_choices`'
   * does; the available skills are closed-vocabulary values and travel
   * verbatim. Grants are addressable — `grant_id` is what `fill_skill_grant`
   * takes — so an agent reading this block can act on a specific ordinal.
   */
  | {
      readonly kind: 'unfilled_skill_grants';
      readonly source_ref: number;
      readonly grant_key: string;
      readonly chosen: number;
      readonly required: number;
      readonly missing: number;
      readonly grants: readonly {
        readonly grant_id: number;
        readonly ordinal: number;
        readonly available_skills: readonly string[];
      }[];
    };

export interface ReferenceCatalogGap {
  /**
   * Only the list names this application can account for: a list it offers as
   * a Magic Initiate choice, or the name of a class this character has levels
   * in. A `choice_from_list` grant rule can read its list from the source
   * instance's `$config`, which a share link supplies verbatim, so any other
   * name is counted rather than copied and appears in the free-text ledger.
   */
  readonly spell_lists: readonly string[];
  readonly spell_lists_withheld_count: number;
  readonly spell_schools: readonly string[];
  readonly spell_tags: readonly string[];
  readonly spell_level_min: number;
  readonly spell_level_max: number;
  readonly source_refs: readonly number[];
}

/**
 * One weapon, with its NAME WITHHELD like every other free text on this page.
 *
 * Weapon names are user-authored — "Grandfather's sword" — and by D4 the JSON
 * block carries reference data, never a string an agent might act on. The name
 * travels in the free-text ledger with its provenance instead.
 */
export interface ReferenceWeapon {
  readonly index: number;
  readonly name_withheld: true;
  readonly damage: WeaponDamage;
  readonly damage_type: string | null;
  readonly versatile_damage: VersatileWeaponDamage;
  readonly properties: readonly string[];
  readonly range: WeaponRange;
  readonly mastery_property: WeaponMasteryProperty | Unrecognised | null;
  readonly mastery_selected: boolean;
}

/**
 * The mastery allowance, as a STATE rather than a number.
 *
 * `unknown` and `unresolved` are carried through deliberately: an agent reading
 * this must be able to tell "the allowance is four" from "we do not have the
 * number" and from "two classes grant it and we do not know how they combine".
 * Collapsing any of those to a number would be this application asserting a
 * rule it cannot source.
 */
export interface ReferenceWeaponMastery {
  readonly state: CharacterMasteryAllowance['state'];
  readonly count: number | null;
  readonly selected_count: number;
  readonly by_class: readonly {
    readonly class_name: string;
    readonly class_level: number;
    readonly allowance_state: MasteryAllowance['state'];
    readonly count: number | null;
  }[];
}

export interface AgentReference {
  readonly format: typeof AGENT_REFERENCE_FORMAT;
  readonly version: typeof AGENT_REFERENCE_VERSION;
  readonly derived_from: string;
  readonly scope: {
    readonly statement: string;
    readonly coverage: readonly CoverageFact[];
    readonly omits: readonly string[];
  };
  readonly free_text: {
    readonly statement: string;
    readonly origin: typeof FREE_TEXT_ORIGIN;
    readonly omitted_fields: readonly string[];
    readonly omitted_count: number;
  };
  readonly srd_attribution: string;
  readonly character: {
    readonly id: number;
    readonly name_withheld: true;
    readonly character_level: number | null;
    readonly proficiency_bonus: number | null;
    readonly revision: number;
    readonly allow_legacy: boolean;
    readonly abilities: Readonly<
      Record<Ability, { readonly score: number; readonly modifier: number }>
    >;
  };
  readonly classes: readonly {
    readonly name: string;
    readonly subclass: string | null;
    readonly class_level: number;
    readonly spellcasting_ability: Ability | Unrecognised | null;
    readonly progression_type: ProgressionType | Unrecognised;
    readonly prepared_count: number;
    readonly max_preparable_level: number;
  }[];
  readonly caster: {
    readonly caster_level: number;
    readonly spell_slots: readonly {
      readonly level: number;
      readonly count: number;
    }[];
    readonly pact_magic: {
      readonly level: number;
      readonly count: number;
    } | null;
    readonly preparation_callout: string;
  };
  readonly sources: readonly ReferenceSource[];
  readonly spell_choices: readonly ReferenceSpellChoice[];
  readonly access_routes: readonly ReferenceAccessRoute[];
  readonly wizard_spellbook: readonly ReferenceSpellbookEntry[];
  readonly weapons: readonly ReferenceWeapon[];
  readonly weapon_mastery: ReferenceWeaponMastery;
  readonly summary: {
    readonly unique_spells: number;
    readonly access_routes: number;
    readonly warning_count: number;
    readonly slot_count: number;
    readonly filled_slot_count: number;
    readonly empty_slot_count: number;
  };
  readonly outstanding: {
    readonly available: boolean;
    readonly count: number | null;
    readonly items: readonly ReferenceOutstandingItem[];
    readonly catalog_gap_count: number | null;
    readonly catalog_gaps: readonly ReferenceCatalogGap[];
  };
}

/** The strings kept out of the JSON, keyed so the text form can render them. */
export interface WithheldText {
  readonly character_name: string;
  readonly source_names: ReadonlyMap<number, string>;
  readonly slot_spell_names: ReadonlyMap<number, string>;
  readonly access_route_spell_names: ReadonlyMap<number, string>;
  readonly spellbook_spell_names: ReadonlyMap<number, string>;
  readonly weapon_names: ReadonlyMap<number, string>;
}

export interface AgentReferenceProjection {
  readonly reference: AgentReference;
  readonly withheld: WithheldText;
  /** Provenance ledger: every withheld value, keyed by where it was withheld. */
  readonly free_text: readonly FreeTextEntry[];
}

interface RegistrySource {
  ref: number;
  source_type: DomainSourceType | Unrecognised | null;
  display: string;
  slot_count: number;
}

/**
 * Gives every source instance on the page a small integer the JSON can refer to
 * instead of a display name.
 *
 * Identity is `(source type, display name)`, NOT the display name alone: an
 * imported feat is free to call itself `Wizard 3`, which is exactly what the
 * application names a class source, and merging the two would attribute
 * importer-granted slots to a class the application named. Where a reference
 * carries only a name — an access route, a completeness item — it resolves to
 * an entry only when exactly one entry bears that name; otherwise it gets its
 * own entry, because the read-model gives no way to say which was meant.
 */
class SourceRegistry {
  readonly #entries: RegistrySource[] = [];
  readonly #byKey = new Map<string, RegistrySource>();

  register(
    name: string,
    sourceType: DomainSourceType | Unrecognised | null,
  ): number {
    if (sourceType === null) return this.#resolveByName(name).ref;
    return this.#ensure(`typed\u0000${sourceType}\u0000${name}`, name, sourceType)
      .ref;
  }

  registerSlot(
    name: string,
    sourceType: DomainSourceType | Unrecognised,
  ): number {
    const entry = this.#ensure(
      `typed\u0000${sourceType}\u0000${name}`,
      name,
      sourceType,
    );
    entry.slot_count += 1;
    return entry.ref;
  }

  entries(): ReferenceSource[] {
    return this.#entries.map((entry) => ({
      ref: entry.ref,
      source_type: entry.source_type,
      name: this.#appNamed(entry.source_type) ? entry.display : null,
      name_withheld: !this.#appNamed(entry.source_type),
      name_identifies_one_source: this.#bearers(entry.display).length === 1,
      slot_count: entry.slot_count,
    }));
  }

  /** ref -> display name, for every source the application did not name. */
  withheldNames(): Map<number, string> {
    return new Map(
      this.#entries
        .filter((entry) => !this.#appNamed(entry.source_type))
        .map((entry) => [entry.ref, entry.display]),
    );
  }

  #resolveByName(name: string): RegistrySource {
    const bearers = this.#bearers(name);
    if (bearers.length === 1) return bearers[0] as RegistrySource;
    // Zero bearers: nothing typed this source, so it becomes its own entry.
    // Two or more: the name is ambiguous and this reference cannot be
    // attributed to either of them, so it also becomes its own entry rather
    // than being silently folded into whichever was registered first.
    const key = bearers.length === 0 ? `named\u0000${name}` : `ambiguous\u0000${name}`;
    return this.#ensure(key, name, null);
  }

  #bearers(name: string): RegistrySource[] {
    return this.#entries.filter((entry) => entry.display === name);
  }

  #ensure(
    key: string,
    display: string,
    sourceType: DomainSourceType | Unrecognised | null,
  ): RegistrySource {
    const existing = this.#byKey.get(key);
    if (existing !== undefined) return existing;
    const entry: RegistrySource = {
      ref: this.#entries.length + 1,
      source_type: sourceType,
      display,
      slot_count: 0,
    };
    this.#entries.push(entry);
    this.#byKey.set(key, entry);
    return entry;
  }

  #appNamed(sourceType: DomainSourceType | Unrecognised | null): boolean {
    return (
      sourceType !== null &&
      sourceType !== UNRECOGNISED &&
      APP_NAMED_SOURCE_TYPES.includes(sourceType)
    );
  }
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

/**
 * Spell display names that arrived in a share link rather than from a catalog
 * the reader imported themselves. The workspace marks these two ways — a
 * per-slot `placeholder` flag and a `placeholder_spells` roster — and the
 * roster is the only handle available for the wizard spellbook and the access
 * routes, which carry names but no provenance flag.
 */
function placeholderSpellNames(workspace: Workspace): ReadonlySet<string> {
  return new Set(
    (workspace.placeholder_spells ?? []).map((spell) => spell.name),
  );
}

/**
 * Spell-list names this application can account for on its own: the lists it
 * offers as a Magic Initiate choice, plus the names of the classes this
 * character has levels in. Both come from `class_definitions`, which only the
 * local seed writes.
 */
function accountableSpellLists(workspace: Workspace): ReadonlySet<string> {
  return new Set([
    ...workspace.spell_lists,
    ...workspace.report.classes.map((entry) => entry.name),
  ]);
}

export function buildAgentReference(
  workspace: Workspace,
  completeness: CompletenessResult | null,
): AgentReferenceProjection {
  const report = workspace.report;
  const placeholders = placeholderSpellNames(workspace);
  const accountableLists = accountableSpellLists(workspace);
  const registry = new SourceRegistry();

  // Every TYPED registration happens before every name-only one, so a name-only
  // reference is resolved against a complete picture of which names collide.
  for (const slot of workspace.slots) {
    registry.registerSlot(slot.source, known(domainSourceTypes, slot.source_type));
  }
  for (const source of workspace.removable_sources) {
    registry.register(
      source.display_name,
      known(domainSourceTypes, source.source_type),
    );
  }
  for (const source of workspace.configurable_sources) {
    registry.register(source.display_name, 'feat');
  }
  for (const source of workspace.order_sources) {
    registry.register(source.display_name, 'class');
  }
  for (const route of report.access_routes) {
    registry.register(route.source_name, null);
  }
  for (const item of completeness?.items ?? []) {
    if (item.kind === 'unfilled_choices' || item.kind === 'unchosen_option') {
      registry.register(item.source_name, null);
    }
  }
  for (const gap of completeness?.catalog_gaps ?? []) {
    for (const name of gap.sources) registry.register(name, null);
  }

  const slotSpellNames = new Map<number, string>();
  const spellChoices = workspace.slots.map((slot): ReferenceSpellChoice => {
    const withheld =
      slot.spell_name !== null &&
      (slot.placeholder === true || placeholders.has(slot.spell_name));
    if (withheld && slot.spell_name !== null) {
      slotSpellNames.set(slot.id, slot.spell_name);
    }
    return {
      slot_id: slot.id,
      slot_key: slot.slot_key,
      slot_label: slot.label,
      bucket: known(slotBuckets, slot.bucket),
      source_ref: registry.register(
        slot.source,
        known(domainSourceTypes, slot.source_type),
      ),
      spell_level_min: slot.level_min,
      spell_level_max: slot.level_max,
      selected: slot.spell_id !== null,
      spell_name: withheld ? null : slot.spell_name,
      spell_name_withheld: withheld,
      spell_level: slot.spell_level,
      rules_edition: knownOrNull(rulesEditions, slot.spell_edition),
      spellcasting_ability: knownOrNull(abilities, slot.ability),
      attack_bonus: slot.attack_bonus,
      save_dc: slot.save_dc,
      ritual: slot.ritual,
      concentration: slot.concentration,
      duplicate_status: known(duplicateCategories, slot.duplicate_status),
      state: known(slotStates, slot.state),
      eligibility: known(selectionEligibilities, slot.eligibility),
      locked: slot.locked,
      catalog_placeholder: slot.placeholder === true,
    };
  });

  const routeSpellNames = new Map<number, string>();
  const accessRoutes = report.access_routes.map(
    (route, index): ReferenceAccessRoute => {
      const withheld = placeholders.has(route.spell_name);
      if (withheld) routeSpellNames.set(index, route.spell_name);
      return {
        index,
        spell_name: withheld ? null : route.spell_name,
        spell_name_withheld: withheld,
        spell_level: route.spell_level,
        source_ref: registry.register(route.source_name, null),
        slot_id: route.slot_id,
        casting_mode: known(castingModes, route.casting_mode),
        spellcasting_ability: knownOrNull(
          abilities,
          route.spellcasting_ability,
        ),
        attack_bonus: route.attack_bonus,
        save_dc: route.save_dc,
      };
    },
  );

  const spellbookNames = new Map<number, string>();
  const spellbook = report.wizard.spellbook.map(
    (entry, index): ReferenceSpellbookEntry => {
      const withheld = placeholders.has(entry.spell_name);
      if (withheld) spellbookNames.set(index, entry.spell_name);
      return {
        index,
        spell_name: withheld ? null : entry.spell_name,
        spell_name_withheld: withheld,
        active: entry.active,
      };
    },
  );

  const outstandingItems = (completeness?.items ?? []).map(
    (item): ReferenceOutstandingItem => {
      if (item.kind === 'no_class') return { kind: 'no_class' };
      if (item.kind === 'unchosen_option') {
        return {
          kind: 'unchosen_option',
          source_ref: registry.register(item.source_name, null),
          order_name: item.order_name,
          options: [...item.options],
        };
      }
      if (item.kind === 'orphan_hit_point_roll') {
        return {
          kind: 'orphan_hit_point_roll',
          class_name: item.class_name,
          levels: [...item.levels],
        };
      }
      if (item.kind === 'unfilled_skill_grants') {
        return {
          kind: 'unfilled_skill_grants',
          source_ref: registry.register(item.source_name, null),
          grant_key: item.grant_key,
          chosen: item.chosen,
          required: item.required,
          missing: item.missing,
          grants: item.grants.map((grant) => ({
            grant_id: grant.grant_id,
            ordinal: grant.ordinal,
            available_skills: [...grant.available_skills],
          })),
        };
      }
      return {
        kind: 'unfilled_choices',
        source_ref: registry.register(item.source_name, null),
        rule_key: item.rule_key,
        bucket: known(slotBuckets, item.bucket),
        chosen: item.chosen,
        required: item.required,
        missing: item.missing,
      };
    },
  );

  const withheldListNames: FreeTextEntry[] = [];
  const catalogGaps = (completeness?.catalog_gaps ?? []).map(
    (gap, index): ReferenceCatalogGap => {
      const accountable = gap.spell_lists.filter((name) =>
        accountableLists.has(name),
      );
      gap.spell_lists
        .filter((name) => !accountableLists.has(name))
        .forEach((name, position) => {
          withheldListNames.push({
            field: `outstanding.catalog_gaps[${String(index)}].spell_lists[${String(
              position,
            )}]`,
            value: name,
            origin: FREE_TEXT_ORIGIN,
          });
        });
      return {
        spell_lists: accountable,
        spell_lists_withheld_count: gap.spell_lists.length - accountable.length,
        spell_schools: [...gap.spell_schools],
        spell_tags: [...gap.spell_tags],
        spell_level_min: gap.spell_level_min,
        spell_level_max: gap.spell_level_max,
        source_refs: gap.sources.map((name) => registry.register(name, null)),
      };
    },
  );

  // Weapon property text is BUILT FROM THE BOOLEANS, never from a stored
  // sentence, so nothing user-authored reaches this list — except
  // `other_properties`, which is free text and is therefore withheld along with
  // the name rather than printed here.
  const weaponProperties = (weapon: CharacterWeapon): string[] => {
    const parts: string[] = [];
    if (weapon.finesse) parts.push('Finesse');
    if (weapon.heavy) parts.push('Heavy');
    if (weapon.light) parts.push('Light');
    if (weapon.loading) parts.push('Loading');
    if (weapon.reach) parts.push('Reach');
    if (weapon.thrown) parts.push('Thrown');
    if (weapon.two_handed) parts.push('Two-Handed');
    if (weapon.ammunition) parts.push('Ammunition');
    return parts;
  };

  const weaponNames = new Map<number, string>();
  const weapons = workspace.weapons.weapons.map(
    (weapon, index): ReferenceWeapon => {
      weaponNames.set(index, weapon.name);
      return {
        index,
        name_withheld: true,
        damage: weapon.damage,
        damage_type: weapon.damage_type,
        versatile_damage: weapon.versatile_damage,
        properties: weaponProperties(weapon),
        range: weapon.range,
        mastery_property: knownOrNull(
          weaponMasteryProperties,
          weapon.mastery_property,
        ),
        mastery_selected: weapon.mastery_selected,
      };
    },
  );

  const allowance = workspace.weapons.allowance;
  const weaponMastery: ReferenceWeaponMastery = {
    state: allowance.state,
    // A number ONLY in the one state where the application is entitled to one.
    count: allowance.state === 'known' ? allowance.count : null,
    selected_count: workspace.weapons.selected_count,
    by_class: allowance.classes.map((entry) => ({
      class_name: entry.class_name,
      class_level: entry.class_level,
      allowance_state: entry.allowance.state,
      count:
        entry.allowance.state === 'known' ? entry.allowance.count : null,
    })),
  };

  const sourceNames = registry.withheldNames();
  const freeText: FreeTextEntry[] = [
    {
      field: 'character.name',
      value: report.character.name,
      origin: FREE_TEXT_ORIGIN,
    },
    ...[...sourceNames.entries()]
      .sort(([left], [right]) => left - right)
      .map(([ref, value]) => ({
        field: `sources[ref=${String(ref)}].display_name`,
        value,
        origin: FREE_TEXT_ORIGIN,
      })),
    // Indexed, never keyed: a placeholder spell's content key is itself
    // importer-supplied text, so using it as a field name would smuggle that
    // text back into the JSON through `free_text.omitted_fields`.
    ...(workspace.placeholder_spells ?? []).map((spell, index) => ({
      field: `placeholder_spells[${String(index)}].name`,
      value: spell.name,
      origin: FREE_TEXT_ORIGIN,
    })),
    // Indexed for the same reason placeholder spells are: a weapon's name is
    // the user's own text and must not become a field name.
    ...[...weaponNames.entries()]
      .sort(([left], [right]) => left - right)
      .map(([index, value]) => ({
        field: `weapons[${String(index)}].name`,
        value,
        origin: FREE_TEXT_ORIGIN,
      })),
    ...workspace.weapons.weapons
      .map((weapon, index) => ({ weapon, index }))
      .filter(({ weapon }) => weapon.other_properties !== null)
      .map(({ weapon, index }) => ({
        field: `weapons[${String(index)}].other_properties`,
        value: weapon.other_properties as string,
        origin: FREE_TEXT_ORIGIN,
      })),
    ...withheldListNames,
  ];

  const filled = spellChoices.filter((choice) => choice.selected).length;
  const abilityScores = Object.fromEntries(
    abilities.map((ability) => {
      const score = report.character.abilities[ability];
      return [ability, { score, modifier: new AbilityScore(score).modifier() }];
    }),
  ) as AgentReference['character']['abilities'];

  const reference: AgentReference = {
    format: AGENT_REFERENCE_FORMAT,
    version: AGENT_REFERENCE_VERSION,
    derived_from:
      'the character workspace read-model (built by BuildReportBuilder) and ' +
      'the character completeness query, both already loaded by this screen',
    scope: {
      statement: SCOPE_STATEMENT,
      coverage: COVERAGE,
      omits: OMITTED_FROM_REFERENCE,
    },
    free_text: {
      statement: FREE_TEXT_STATEMENT,
      origin: FREE_TEXT_ORIGIN,
      omitted_fields: freeText.map((entry) => entry.field),
      omitted_count: freeText.length,
    },
    srd_attribution: SRD_ATTRIBUTION_NOTICE,
    character: {
      id: report.character.id,
      name_withheld: true,
      character_level: report.character.character_level,
      proficiency_bonus: report.character.proficiency_bonus,
      revision: workspace.revision,
      allow_legacy: workspace.allow_legacy,
      abilities: abilityScores,
    },
    classes: report.classes.map((entry) => ({
      name: entry.name,
      subclass: entry.subclass,
      class_level: entry.class_level,
      spellcasting_ability: knownOrNull(abilities, entry.spellcasting_ability),
      progression_type: known(progressionTypes, entry.progression_type),
      prepared_count: entry.prepared_count,
      max_preparable_level: entry.max_preparable_level,
    })),
    caster: {
      caster_level: report.caster.caster_level,
      spell_slots: report.caster.slots.map((slot) => ({ ...slot })),
      pact_magic:
        report.caster.pact_magic === null
          ? null
          : { ...report.caster.pact_magic },
      preparation_callout: report.preparation_callout,
    },
    sources: registry.entries(),
    spell_choices: spellChoices,
    access_routes: accessRoutes,
    wizard_spellbook: spellbook,
    weapons,
    weapon_mastery: weaponMastery,
    summary: {
      unique_spells: report.summary.unique_spells,
      access_routes: report.summary.access_routes,
      warning_count: report.summary.warning_count,
      slot_count: spellChoices.length,
      filled_slot_count: filled,
      empty_slot_count: spellChoices.length - filled,
    },
    outstanding: {
      available: completeness !== null,
      count: completeness?.outstanding_count ?? null,
      items: outstandingItems,
      catalog_gap_count: completeness?.catalog_gap_count ?? null,
      catalog_gaps: catalogGaps,
    },
  };

  return {
    reference,
    withheld: {
      character_name: report.character.name,
      source_names: sourceNames,
      slot_spell_names: slotSpellNames,
      access_route_spell_names: routeSpellNames,
      spellbook_spell_names: spellbookNames,
      weapon_names: weaponNames,
    },
    free_text: freeText,
  };
}

/**
 * Serialises for embedding in `<script type="application/json">`. `<` is
 * escaped so that no substring of the payload can terminate the element, which
 * is the only injection risk a JSON island actually has. The escape is valid
 * JSON, so the block still parses with a plain `JSON.parse`.
 *
 * The escape is a belt on top of braces, not the reason importer-authored text
 * is safe here: escaping stops an element ending early, it does not stop a
 * reader treating the text as a fact. Withholding, above, is what does that.
 */
export function agentReferenceJson(reference: AgentReference): string {
  return JSON.stringify(reference, null, 2).replaceAll('<', '\\u003c');
}

export interface ReferenceCell {
  readonly text: string;
  /** True when the text is free text of unverified origin (see D4 / sharing). */
  readonly free_text?: true;
}

export interface ReferenceTable {
  readonly caption: string;
  readonly columns: readonly string[];
  readonly rows: readonly (readonly ReferenceCell[])[];
}

export interface ReferenceSection {
  readonly id: string;
  readonly heading: string;
  readonly notes: readonly string[];
  readonly tables: readonly ReferenceTable[];
}

/**
 * The allowance in one sentence, matching what the weapons panel shows.
 *
 * Never a bare number for the `unknown` and `unresolved` states: a reader who
 * sees only a number cannot tell a sourced allowance from a guess.
 */
function weaponMasterySentence(mastery: ReferenceWeaponMastery): string {
  const chosen = `${String(mastery.selected_count)} selected`;
  switch (mastery.state) {
    case 'none':
      return 'Weapon Mastery is not granted by any of this character\u2019s classes.';
    case 'known':
      return `Weapon Mastery allowance is ${String(mastery.count)}; ${chosen}.`;
    case 'unknown':
      return (
        'Weapon Mastery is granted, but this application does not hold the ' +
        `count for the granting class; ${chosen}.`
      );
    case 'unresolved':
      return (
        'More than one class grants Weapon Mastery. This application has no ' +
        `sourced rule for how the allowances combine and does not add them; ${chosen}.`
      );
  }
}

function cell(text: string): ReferenceCell {
  return { text };
}

function freeCell(text: string): ReferenceCell {
  return { text, free_text: true };
}

function optionalNumber(value: number | null): string {
  return value === null ? 'not applicable' : String(value);
}

function referenceWeaponRange(range: WeaponRange): string {
  switch (range.kind) {
    case 'none':
      return 'not applicable';
    case 'ranged':
      return range.far_feet === null
        ? `${range.near_feet}/not recorded`
        : `${range.near_feet}/${range.far_feet}`;
    case 'legacy':
      return `legacy ${range.near_feet ?? 'not recorded'}/${range.far_feet}`;
  }
}

function yesNo(value: boolean): string {
  return value ? 'yes' : 'no';
}

const COVERAGE_STATE_TEXT: Readonly<Record<CoverageState, string>> = {
  modelled: 'yes',
  partial: 'partly',
  not_modelled: 'no',
};

function sourceCell(
  projection: AgentReferenceProjection,
  ref: number,
): ReferenceCell {
  const source = projection.reference.sources.find(
    (entry) => entry.ref === ref,
  );
  if (source?.name != null) return cell(source.name);
  const withheld = projection.withheld.source_names.get(ref);
  return withheld === undefined
    ? cell(`source ${String(ref)}`)
    : freeCell(withheld);
}

/** Joins several source cells into one, keeping the free-text marking. */
function sourceListCell(
  projection: AgentReferenceProjection,
  refs: readonly number[],
): ReferenceCell {
  const parts = refs.map((ref) => sourceCell(projection, ref));
  const text = parts.map((part) => part.text).join('; ');
  return parts.some((part) => part.free_text === true)
    ? freeCell(text)
    : cell(text);
}

/**
 * The readable twin of the JSON block: the SAME projection, so a reader that
 * parses text rather than JSON receives the same facts. It additionally shows
 * the free-text values the JSON withholds — those are rendered elsewhere on the
 * page regardless, and listing them under an explicit provenance heading is the
 * only honest way to make their origin legible.
 */
export function agentReferenceSections(
  projection: AgentReferenceProjection,
): readonly ReferenceSection[] {
  const reference = projection.reference;
  const sections: ReferenceSection[] = [];

  sections.push({
    id: 'scope',
    heading: 'What this application models',
    notes: [
      reference.scope.statement,
      `Machine-readable twin: format ${reference.format}, version ${String(
        reference.version,
      )}, derived from ${reference.derived_from}.`,
      reference.srd_attribution,
    ],
    tables: [
      {
        caption: 'Coverage',
        // NOT "Modelled here": the column answers for the application, and a
        // value the character sheet derives is modelled even though this page
        // does not show it. The note is where "here" gets said.
        columns: ['Concept', 'Modelled', 'Note'],
        rows: reference.scope.coverage.map((fact) => [
          cell(fact.concept),
          cell(COVERAGE_STATE_TEXT[fact.state]),
          cell(fact.note ?? '—'),
        ]),
      },
      {
        caption: 'Not carried by this reference',
        columns: ['Left out'],
        rows: reference.scope.omits.map((entry) => [cell(entry)]),
      },
    ],
  });

  sections.push({
    id: 'character',
    heading: 'Character and casting numbers',
    notes: [reference.caster.preparation_callout],
    tables: [
      {
        caption: 'Ability scores',
        columns: ['Ability', 'Score', 'Modifier'],
        rows: abilities.map((ability) => [
          cell(ability),
          cell(String(reference.character.abilities[ability].score)),
          cell(signed(reference.character.abilities[ability].modifier)),
        ]),
      },
      {
        caption: 'Build totals',
        columns: ['Fact', 'Value'],
        rows: [
          [cell('character id'), cell(String(reference.character.id))],
          [
            cell('character name is free text of unverified origin'),
            cell(yesNo(reference.character.name_withheld)),
          ],
          [
            cell('character level'),
            cell(
              reference.character.character_level === null
                ? 'undetermined'
                : String(reference.character.character_level),
            ),
          ],
          [
            cell('proficiency bonus'),
            cell(
              reference.character.proficiency_bonus === null
                ? 'undetermined'
                : signed(reference.character.proficiency_bonus),
            ),
          ],
          [cell('workspace revision'), cell(String(reference.character.revision))],
          [
            cell('2014 legacy spell versions allowed'),
            cell(yesNo(reference.character.allow_legacy)),
          ],
          [cell('caster level'), cell(String(reference.caster.caster_level))],
          [
            cell('unique spells reachable'),
            cell(String(reference.summary.unique_spells)),
          ],
          [
            cell('casting routes'),
            cell(String(reference.summary.access_routes)),
          ],
          [
            cell('spell choice slots'),
            cell(String(reference.summary.slot_count)),
          ],
          [
            cell('slots with a spell chosen'),
            cell(String(reference.summary.filled_slot_count)),
          ],
          [
            cell('slots still empty'),
            cell(String(reference.summary.empty_slot_count)),
          ],
          [
            cell('duplicate and invalid-selection warnings'),
            cell(String(reference.summary.warning_count)),
          ],
        ],
      },
      {
        caption: 'Spell slots by level',
        columns: ['Slot level', 'Slots', 'Pool'],
        rows: [
          ...reference.caster.spell_slots.map((slot) => [
            cell(String(slot.level)),
            cell(String(slot.count)),
            cell('spellcasting'),
          ]),
          ...(reference.caster.pact_magic === null
            ? []
            : [
                [
                  cell(String(reference.caster.pact_magic.level)),
                  cell(String(reference.caster.pact_magic.count)),
                  cell('pact magic'),
                ],
              ]),
        ],
      },
    ],
  });

  sections.push({
    id: 'classes',
    heading: 'Classes',
    notes: [],
    tables: [
      {
        caption: 'Class levels and preparation',
        columns: [
          'Class',
          'Level',
          'Subclass',
          'Spellcasting ability',
          'Progression',
          'Prepared',
          'Highest preparable spell level',
        ],
        rows: reference.classes.map((entry) => [
          cell(entry.name),
          cell(String(entry.class_level)),
          cell(entry.subclass ?? 'none'),
          cell(entry.spellcasting_ability ?? 'none'),
          cell(entry.progression_type),
          cell(String(entry.prepared_count)),
          cell(String(entry.max_preparable_level)),
        ]),
      },
    ],
  });

  sections.push({
    id: 'sources',
    heading: 'Spell sources',
    notes: [
      'Every spell choice slot belongs to one of these sources. A name the ' +
        'application did not generate is shown as free text. A name shared by ' +
        'more than one source does not identify which is meant, because the ' +
        'workspace read-model carries no source-instance identifier.',
    ],
    tables: [
      {
        caption: 'Sources',
        columns: ['Ref', 'Type', 'Name', 'Name identifies one source', 'Slots'],
        rows: reference.sources.map((source) => [
          cell(String(source.ref)),
          cell(source.source_type ?? 'unrecorded'),
          sourceCell(projection, source.ref),
          cell(yesNo(source.name_identifies_one_source)),
          cell(String(source.slot_count)),
        ]),
      },
    ],
  });

  sections.push({
    id: 'spell-choices',
    heading: 'Spell choice slots and selections',
    notes: [],
    tables: [
      {
        caption: 'Spell choice slots',
        columns: [
          'Slot id',
          'Slot key',
          'Slot',
          'Source',
          'Bucket',
          'Slot spell levels',
          'Chosen spell',
          'Spell level',
          'Rules edition',
          'Ability',
          'Attack',
          'Save DC',
          'Ritual',
          'Concentration',
          'Duplicate',
          'State',
          'Eligibility',
          'Locked',
          'Spell came from a share link',
        ],
        rows: reference.spell_choices.map((choice) => [
          cell(String(choice.slot_id)),
          cell(choice.slot_key),
          cell(choice.slot_label),
          sourceCell(projection, choice.source_ref),
          cell(choice.bucket),
          cell(`${choice.spell_level_min}–${choice.spell_level_max}`),
          choice.spell_name !== null
            ? cell(choice.spell_name)
            : choice.spell_name_withheld
              ? freeCell(
                  projection.withheld.slot_spell_names.get(choice.slot_id) ??
                    'not imported',
                )
              : cell('none chosen'),
          cell(optionalNumber(choice.spell_level)),
          cell(choice.rules_edition ?? 'not applicable'),
          cell(choice.spellcasting_ability ?? 'not applicable'),
          cell(
            choice.attack_bonus === null
              ? 'not applicable'
              : signed(choice.attack_bonus),
          ),
          cell(optionalNumber(choice.save_dc)),
          cell(yesNo(choice.ritual)),
          cell(yesNo(choice.concentration)),
          cell(choice.duplicate_status),
          cell(choice.state),
          cell(choice.eligibility),
          cell(yesNo(choice.locked)),
          cell(yesNo(choice.catalog_placeholder)),
        ]),
      },
    ],
  });

  if (reference.access_routes.length > 0) {
    sections.push({
      id: 'access-routes',
      heading: 'How each spell can be cast',
      notes: [],
      tables: [
        {
          caption: 'Casting routes',
          columns: [
            'Spell',
            'Spell level',
            'Source',
            'Slot id',
            'Casting mode',
            'Ability',
            'Attack',
            'Save DC',
          ],
          rows: reference.access_routes.map((route) => [
            route.spell_name !== null
              ? cell(route.spell_name)
              : freeCell(
                  projection.withheld.access_route_spell_names.get(
                    route.index,
                  ) ?? 'not imported',
                ),
            cell(String(route.spell_level)),
            sourceCell(projection, route.source_ref),
            cell(optionalNumber(route.slot_id)),
            cell(route.casting_mode),
            cell(route.spellcasting_ability ?? 'not applicable'),
            cell(
              route.attack_bonus === null
                ? 'not applicable'
                : signed(route.attack_bonus),
            ),
            cell(optionalNumber(route.save_dc)),
          ]),
        },
      ],
    });
  }

  if (reference.wizard_spellbook.length > 0) {
    sections.push({
      id: 'wizard-spellbook',
      heading: 'Wizard spellbook',
      notes: [],
      tables: [
        {
          caption: 'Spellbook entries',
          columns: ['Spell', 'Prepared'],
          rows: reference.wizard_spellbook.map((entry) => [
            entry.spell_name !== null
              ? cell(entry.spell_name)
              : freeCell(
                  projection.withheld.spellbook_spell_names.get(entry.index) ??
                    'not imported',
                ),
            cell(yesNo(entry.active)),
          ]),
        },
      ],
    });
  }

  sections.push({
    id: 'weapons',
    heading: `Weapons — ${String(reference.weapons.length)}`,
    notes: [
      weaponMasterySentence(reference.weapon_mastery),
      'No attack bonus, damage roll, weapon proficiency or inventory is ' +
        'derived from these rows. They are a record of what the character ' +
        'carries and which masteries were chosen, nothing more.',
    ],
    tables: [
      {
        caption: 'Weapons',
        columns: [
          'Weapon',
          'Damage',
          'Versatile',
          'Properties',
          'Range (normal/long ft)',
          'Mastery property',
          'Mastery selected',
        ],
        rows: reference.weapons.map((weapon) => [
          freeCell(
            projection.withheld.weapon_names.get(weapon.index) ?? 'unnamed',
          ),
          cell(
            [
              weapon.damage.kind === 'not_recorded'
                ? null
                : formatWeaponDamage(weapon.damage),
              weapon.damage_type,
            ]
              .filter((part): part is string => part !== null)
              .join(' ') || 'not recorded',
          ),
          cell(
            weapon.versatile_damage.kind === 'not_applicable'
              ? 'not applicable'
              : formatWeaponDamage(weapon.versatile_damage),
          ),
          cell(weapon.properties.join(', ') || 'none'),
          cell(referenceWeaponRange(weapon.range)),
          cell(weapon.mastery_property ?? 'none'),
          cell(yesNo(weapon.mastery_selected)),
        ]),
      },
      {
        caption: 'Weapon mastery allowance by class',
        columns: ['Class', 'Class level', 'Allowance', 'Count'],
        rows: reference.weapon_mastery.by_class.map((entry) => [
          cell(entry.class_name),
          cell(String(entry.class_level)),
          cell(entry.allowance_state),
          // `content_missing` and `unsourced` print as words, never as 0. The
          // difference between "none allowed" and "we do not know" is the whole
          // reason this table has a state column at all.
          cell(entry.count === null ? 'not available' : String(entry.count)),
        ]),
      },
    ],
  });

  sections.push({
    id: 'outstanding',
    heading: reference.outstanding.available
      ? `Not chosen yet — ${String(reference.outstanding.count)} item(s)`
      : 'Not chosen yet — unavailable for this character',
    notes: reference.outstanding.available
      ? [
          `${String(
            reference.outstanding.catalog_gap_count,
          )} slot constraint(s) match no spell in the imported catalog.`,
        ]
      : ['The completeness query did not answer for this character.'],
    tables: [
      {
        caption: 'Outstanding items',
        columns: ['Kind', 'Source', 'Detail'],
        rows: reference.outstanding.items.map((item) => {
          if (item.kind === 'no_class') {
            return [
              cell('no_class'),
              cell('not applicable'),
              cell('no class levels have been added'),
            ];
          }
          if (item.kind === 'unchosen_option') {
            return [
              cell('unchosen_option'),
              sourceCell(projection, item.source_ref),
              cell(
                `${item.order_name} not chosen; options are ${item.options.join(
                  ' or ',
                )}`,
              ),
            ];
          }
          // The sheet item names a class rather than a source instance, so
          // the middle cell says which class and the detail says the rest —
          // the same facts the JSON block carries, in the same order, so
          // neither form can state more than the other.
          if (item.kind === 'orphan_hit_point_roll') {
            return [
              cell('orphan_hit_point_roll'),
              cell(item.class_name),
              cell(
                `hit point rolls recorded at level ${item.levels.join(
                  ', ',
                )} for a class this character does not have; they are not counted`,
              ),
            ];
          }
          if (item.kind === 'unfilled_skill_grants') {
            return [
              cell('unfilled_skill_grants'),
              sourceCell(projection, item.source_ref),
              cell(
                `${String(item.chosen)} of ${String(item.required)} skill ` +
                  `choices filled; ${String(item.missing)} still unchosen ` +
                  `(grant key ${item.grant_key}, grant id${
                    item.grants.length === 1 ? '' : 's'
                  } ${item.grants
                    .map((grant) => String(grant.grant_id))
                    .join(', ')})`,
              ),
            ];
          }
          return [
            cell('unfilled_choices'),
            sourceCell(projection, item.source_ref),
            cell(
              `${String(item.chosen)} of ${String(item.required)} ${
                item.bucket
              } chosen; ${String(item.missing)} still empty (rule ${
                item.rule_key
              })`,
            ),
          ];
        }),
      },
      {
        caption: 'Catalog gaps',
        columns: [
          'Spell lists',
          'Spell lists of unverified origin',
          'Schools',
          'Tags',
          'Spell levels',
          'Sources',
        ],
        rows: reference.outstanding.catalog_gaps.map((gap) => [
          cell(gap.spell_lists.join(', ') || 'any'),
          cell(String(gap.spell_lists_withheld_count)),
          cell(gap.spell_schools.join(', ') || 'any'),
          cell(gap.spell_tags.join(', ') || 'any'),
          cell(`${gap.spell_level_min}–${gap.spell_level_max}`),
          sourceListCell(projection, gap.source_refs),
        ]),
      },
    ],
  });

  sections.push({
    id: 'free-text',
    heading: `Free text on this page — ${String(
      projection.free_text.length,
    )} value(s)`,
    notes: [reference.free_text.statement],
    tables: [
      {
        caption: 'Free-text values',
        columns: ['Field', 'Value', 'Origin'],
        rows: projection.free_text.map((entry) => [
          cell(entry.field),
          freeCell(entry.value),
          cell(entry.origin),
        ]),
      },
    ],
  });

  return sections;
}
