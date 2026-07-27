import { freeTextSpan } from '../../free-text';
import type { CharacterSheet } from '../../../queries/character-sheet-builder';

/**
 * THE CHARACTER SHEET, PROJECTED ONCE AND RENDERED TWICE.
 *
 * 1. {@link sheetSections} — the readable form, as labelled rows;
 * 2. {@link sheetFacts} — the same facts as a JSON object.
 *
 * `renderSheet` turns the FIRST into the page and drops the SECOND into a
 * `<script type="application/json">` beside it. Both are pure functions of one
 * `CharacterSheet`, which is what lets `tests/unit/ui/sheet-view.test.ts` pin
 * every field of the JSON to a labelled row of the readable form WITHOUT A DOM
 * — the arrangement `agent-reference.ts` established, and the reason this is
 * shaped this way rather than as one render function that happens to emit both.
 *
 * THE D20 LESSON IS WHY THAT MATTERS. That defect was one screen building two
 * lists independently, and the test covering it could not fail because both
 * lists were read from the same place the code wrote them. Two projections of
 * one input, compared against each other, is the shape that can fail.
 *
 * D4, ON THE SAME STRICT TERMS AS `agent-reference-panel.ts`: both forms are in
 * the ordinary document, neither is hidden from a person, nothing here is
 * `display: none`, off-screen or transparent, and nothing addresses a reader in
 * the imperative. The JSON states FACTS about this character and gives no
 * instructions.
 *
 * FREE TEXT NEVER ENTERS THE JSON. A character name, a class name, an armour
 * name and an adjustment note can all arrive from a stranger's share link. They
 * are marked `free_text` in the readable projection — where `renderSheet` gives
 * them the `unverified-origin` provenance marker — and are omitted from the
 * structured form entirely. An enum-checked value may cross that boundary; a
 * user-typed string may not.
 */

export const SHEET_JSON_SCRIPT_ID = 'character-sheet-facts';

/** One run of text in the readable form. `free_text` means the author is unverified. */
export interface SheetCell {
  readonly text: string;
  readonly free_text?: true;
}

export interface SheetRow {
  /** A stable machine key, never localised and never reordered. */
  readonly id: string;
  readonly label: readonly SheetCell[];
  /** The number as printed, or `null` for a row that carries only prose. */
  readonly value: string | null;
  /** How the number was reached, in the source's own terms. */
  readonly detail: readonly SheetCell[];
}

export interface SheetSection {
  readonly caption: string;
  readonly rows: readonly SheetRow[];
}

function plain(text: string): SheetCell[] {
  return [{ text }];
}

function signed(value: number): string {
  return value >= 0 ? `+${String(value)}` : String(value);
}

function numberRow(
  entry: {
    readonly id: string;
    readonly label: string;
    readonly value: number;
    readonly formula: string;
  },
  signedValue: boolean,
): SheetRow {
  return {
    id: entry.id,
    label: plain(entry.label),
    value: signedValue ? signed(entry.value) : String(entry.value),
    detail: plain(entry.formula),
  };
}

/**
 * The readable projection: every number on the sheet as a labelled row.
 *
 * Each row's `id` is the same key its counterpart uses in {@link sheetFacts}
 * wherever the two describe one fact, so the test can pair them without a
 * lookup table that could itself be wrong.
 */
export function sheetSections(sheet: CharacterSheet): readonly SheetSection[] {
  const sections: SheetSection[] = [];

  const identity: SheetRow[] = [
    {
      id: 'character',
      label: plain('Character'),
      value: null,
      detail: [{ text: sheet.name, free_text: true }],
    },
    {
      id: 'total_level',
      label: plain('Total character level'),
      value: String(sheet.total_level),
      detail: plain(
        'The sum across every class. The proficiency bonus is taken from this ' +
          'and never from the level in one class.',
      ),
    },
  ];
  for (const entry of sheet.classes) {
    identity.push({
      id: `class:${entry.class_name}`,
      label: [
        { text: 'Class — ' },
        { text: entry.class_name, free_text: true },
      ],
      value: String(entry.level),
      detail: plain(
        // NOT "d8" WHEN THE DIE IS UNKNOWN. `hitPointMaximum` assumes one so a
        // number can exist at all, and warns; printing that assumption here as
        // "Hit die d8" would restate the guess as this class's printed value.
        `${
          entry.hit_die === null
            ? 'Hit die not recorded for this class'
            : `Hit die d${String(entry.hit_die)}`
        }. ${
          entry.is_starting_class
            ? 'This is the starting class, so it contributes the level 1 hit point maximum.'
            : 'Not the starting class.'
        } Saving throws: ${
          entry.saving_throws.length === 0
            ? 'none recorded'
            : entry.saving_throws.join(', ')
        }.`,
      ),
    });
  }
  sections.push({ caption: 'Character', rows: identity });

  const core: SheetRow[] = [
    numberRow(sheet.proficiency_bonus, true),
    numberRow(sheet.hit_points, false),
  ];
  if (sheet.species_hit_points !== null) {
    core.push(numberRow(sheet.species_hit_points, true));
    // THE SEAM THAT HAD NO CALLER BEFORE THIS SHEET. `hitPointMaximum` does not
    // include the species contribution and `effectHitPoints` returns it
    // separately by design, so a page printing only the first shows a Dwarf
    // short by their level. Both are printed, and so is their sum.
    core.push({
      id: 'hit_points_with_species',
      label: plain('Hit points including the species contribution'),
      value: String(sheet.hit_points.value + sheet.species_hit_points.value),
      detail: plain(
        'The two above come from different sources and are shown apart; this ' +
          'is their sum.',
      ),
    });
  }
  core.push(numberRow(sheet.armor_class, false));
  core.push(numberRow(sheet.initiative, true));
  core.push(numberRow(sheet.passive_perception, false));
  if (sheet.armor_class_adjustment !== 0) {
    core.push({
      id: 'armor_class_adjustment',
      label: plain('Manual Armor Class adjustment'),
      value: signed(sheet.armor_class_adjustment),
      detail:
        sheet.armor_class_adjustment_note === null
          ? plain('Applied to the Armor Class above. No reason was recorded.')
          : [
              { text: 'Applied to the Armor Class above. Recorded reason: ' },
              { text: sheet.armor_class_adjustment_note, free_text: true },
            ],
    });
  }
  sections.push({ caption: 'Core numbers', rows: core });

  sections.push({
    caption: 'Ability scores',
    rows: sheet.ability_scores.map((entry) => ({
      id: entry.id,
      label: plain(`${entry.label} ${String(entry.score)}`),
      value: signed(entry.value),
      detail: plain(entry.formula),
    })),
  });

  sections.push({
    caption: 'Saving throws',
    rows: sheet.saves.map((save) => ({
      id: save.id,
      label: plain(`${save.label}${save.proficient ? ' (proficient)' : ''}`),
      value: signed(save.value),
      detail: plain(save.formula),
    })),
  });

  sections.push({
    caption: 'Skills',
    rows: sheet.skills.map((skill) => ({
      id: skill.id,
      label: plain(`${skill.label}${skill.proficient ? ' (proficient)' : ''}`),
      value: signed(skill.value),
      detail: plain(skill.formula),
    })),
  });

  const combat: SheetRow[] = [
    {
      id: 'attacks_per_action',
      label: plain('Attacks per Attack action'),
      value: String(sheet.attacks_per_action.count),
      detail: plain(
        'Features granting Extra Attack do not stack; the largest applies. ' +
          'Per-weapon attack profiles are on the planner, beside the weapon ' +
          'list they describe.',
      ),
    },
  ];
  // A grant this application could not apply gets its own row rather than being
  // folded into the count. The count is a number it stands behind.
  sheet.attacks_per_action.unresolved.forEach((grant, index) => {
    grant.unresolved.forEach((reason, position) => {
      combat.push({
        id: `unresolved_attack_grant:${String(index)}:${String(position)}`,
        label: plain('Extra Attack not applied'),
        value: null,
        detail: plain(reason),
      });
    });
  });
  for (const die of sheet.martial_arts) {
    combat.push({
      id: `martial_arts_die:${die.class_name}`,
      label: plain('Martial Arts die'),
      value: `1d${String(die.die)}`,
      detail: [
        { text: 'Resolved at ' },
        { text: die.class_name, free_text: true },
        {
          text:
            ` level ${String(die.class_level)} — that class's own level, not ` +
            'the total character level.',
        },
      ],
    });
  }
  combat.push({
    id: 'walking_speed_feet',
    label: plain('Walking speed'),
    value:
      sheet.walking_speed_feet === null
        ? null
        : `${String(sheet.walking_speed_feet)} feet`,
    detail: plain(
      sheet.walking_speed_feet === null
        ? 'Not recorded: this character has no species speed entered.'
        : 'The species base speed plus every standing bonus.',
    ),
  });
  // THE UNCHOSEN HALF NAMES ITSELF NOW. It used to read "plus 2 whose type this
  // application does not record" — a count, because an effect lived on a trait
  // row and two anonymous resistances were indistinguishable. Each is a row
  // with a `label`, so the page says WHICH grant is waiting on the user, which
  // is the difference between a limitation the reader is told about and a
  // decision they can act on.
  combat.push({
    id: 'damage_resistances',
    label: plain('Damage resistances'),
    value: null,
    detail: plain(
      `${
        sheet.damage_resistances.length === 0
          ? 'None chosen'
          : sheet.damage_resistances.join(', ')
      }${
        sheet.unchosen_damage_resistances.length === 0
          ? '.'
          : `, plus one from ${sheet.unchosen_damage_resistances.join(
              ' and one from ',
            )} whose type is not yet chosen.`
      }`,
    ),
  });
  sections.push({ caption: 'Attacks and movement', rows: combat });

  const recorded: SheetRow[] = [];
  if (sheet.armor.length === 0) {
    recorded.push({
      id: 'armor:none',
      label: plain('Armour and shield'),
      value: null,
      detail: plain(
        'None recorded, so the Armor Class is 10 plus the Dexterity modifier.',
      ),
    });
  }
  for (const row of sheet.armor) {
    recorded.push({
      id: `armor:${row.slot}`,
      label: plain(`Armour — ${row.slot} slot`),
      value: `${row.category === 'shield' ? '+' : ''}${String(row.armor_class)}`,
      detail: [
        { text: row.name, free_text: true },
        {
          text:
            ` — ${row.category}, ${
              row.category === 'shield'
                ? 'a bonus over whatever base applies'
                : 'a base Armor Class'
            }${
              row.strength_requirement === null
                ? ''
                : `, requires Strength ${String(row.strength_requirement)}`
            }${row.stealth_disadvantage ? ', disadvantage on Stealth' : ''}.`,
        },
      ],
    });
  }
  if (sheet.hit_point_rolls.length === 0) {
    recorded.push({
      id: 'hit_point_roll:none',
      label: plain('Hit point rolls'),
      value: null,
      detail: plain(
        'None recorded, so every level after the first uses the printed fixed ' +
          'value for its hit die.',
      ),
    });
  }
  for (const roll of sheet.hit_point_rolls) {
    recorded.push({
      id: `hit_point_roll:${roll.class_name}:${String(roll.class_level)}`,
      label: plain(`Hit point roll — level ${String(roll.class_level)}`),
      value: String(roll.rolled_value),
      detail: [
        { text: 'Rolled for ' },
        { text: roll.class_name, free_text: true },
        {
          text: roll.applies
            ? '.'
            : ' — this character has no class of that name, so it is not counted.',
        },
      ],
    });
  }
  sections.push({ caption: 'What is recorded', rows: recorded });

  // WHAT THE SHEET DOES NOT HAVE, PRINTED RATHER THAN LEFT BLANK. F4: a blank
  // features box reads as "this character has no features", which is false.
  sections.push({
    caption: 'What this sheet does not show',
    rows: sheet.gaps.map((gap) => ({
      id: `gap:${gap.kind}`,
      label: plain(gap.title),
      value: null,
      detail: plain(gap.detail),
    })),
  });

  return sections;
}

/**
 * The structured projection.
 *
 * ENUM-TYPED AND NUMERIC FACTS ONLY. Every key is one this module owns; no
 * user-authored string appears. An armour row contributes its slot, its
 * category and its numbers — the fields a CHECK constraint bounds — and not its
 * name.
 */
export function sheetFacts(sheet: CharacterSheet): Record<string, unknown> {
  return {
    character_id: sheet.character_id,
    total_level: sheet.total_level,
    proficiency_bonus: sheet.proficiency_bonus.value,
    ability_modifiers: sheet.ability_scores.map((entry) => ({
      ability: entry.ability,
      score: entry.score,
      modifier: entry.value,
    })),
    hit_point_maximum: sheet.hit_points.value,
    species_hit_points: sheet.species_hit_points?.value ?? 0,
    armor_class: sheet.armor_class.value,
    armor_class_adjustment: sheet.armor_class_adjustment,
    initiative: sheet.initiative.value,
    passive_perception: sheet.passive_perception.value,
    saving_throws: sheet.saves.map((save) => ({
      ability: save.ability,
      modifier: save.value,
      proficient: save.proficient,
    })),
    skills: sheet.skills.map((skill) => ({
      skill: skill.skill,
      ability: skill.ability,
      modifier: skill.value,
      proficient: skill.proficient,
    })),
    attacks_per_action: sheet.attacks_per_action.count,
    unresolved_attack_grants: sheet.attacks_per_action.unresolved.flatMap(
      (grant) => grant.unresolved,
    ).length,
    martial_arts_dice: sheet.martial_arts.map((die) => ({
      class_level: die.class_level,
      die: die.die,
    })),
    walking_speed_feet: sheet.walking_speed_feet,
    damage_resistances: [...sheet.damage_resistances],
    unchosen_damage_resistances: [...sheet.unchosen_damage_resistances],
    classes: sheet.classes.map((entry) => ({
      level: entry.level,
      hit_die: entry.hit_die,
      is_starting_class: entry.is_starting_class,
      saving_throws: [...entry.saving_throws],
    })),
    armor: sheet.armor.map((row) => ({
      slot: row.slot,
      category: row.category,
      armor_class: row.armor_class,
      dex_bonus: row.dex_bonus,
      dex_bonus_max: row.dex_bonus_max,
      strength_requirement: row.strength_requirement,
      stealth_disadvantage: row.stealth_disadvantage,
    })),
    hit_point_rolls: sheet.hit_point_rolls.map((roll) => ({
      class_level: roll.class_level,
      rolled_value: roll.rolled_value,
      applies: roll.applies,
    })),
    warnings: sheet.warnings.map((warning) => warning.code),
    gaps: sheet.gaps.map((gap) => gap.kind),
  };
}

function cells(parts: readonly SheetCell[], into: HTMLElement): void {
  for (const part of parts) {
    if (part.free_text === true) {
      into.append(freeTextSpan(part.text));
    } else {
      into.append(part.text);
    }
  }
}

export function renderSheet(sheet: CharacterSheet): HTMLElement {
  const shell = document.createElement('div');
  shell.className = 'sheet-shell';
  shell.dataset.screen = 'character-sheet';

  const header = document.createElement('header');
  header.className = 'sheet-header';
  const home = document.createElement('a');
  home.href = '/';
  home.dataset.routerLink = 'true';
  home.className = 'button-secondary';
  home.textContent = 'All characters';
  const planner = document.createElement('a');
  planner.href = `/characters/${String(sheet.character_id)}`;
  planner.dataset.routerLink = 'true';
  planner.className = 'button-secondary';
  planner.textContent = 'Open planner';
  const heading = document.createElement('h1');
  heading.append('Character sheet — ');
  heading.append(freeTextSpan(sheet.name));
  header.append(home, planner, heading);
  shell.append(header);

  // THE WARNINGS COME FIRST AND ARE NOT COLLAPSIBLE. Each describes a
  // degradation of a number printed below it — a crossed armour slot, an unmet
  // Strength requirement, no starting class — so a reader who sees the number
  // without the warning has been told something false.
  if (sheet.warnings.length > 0) {
    const warnings = document.createElement('section');
    warnings.className = 'sheet-panel';
    warnings.setAttribute('role', 'alert');
    const warningHeading = document.createElement('h2');
    warningHeading.textContent = 'Warnings about these numbers';
    const list = document.createElement('ul');
    for (const warning of sheet.warnings) {
      const item = document.createElement('li');
      item.dataset.warningCode = warning.code;
      item.textContent = warning.message;
      list.append(item);
    }
    warnings.append(warningHeading, list);
    shell.append(warnings);
  }

  for (const section of sheetSections(sheet)) {
    const element = document.createElement('section');
    element.className = 'sheet-panel';
    const caption = document.createElement('h2');
    caption.textContent = section.caption;
    const list = document.createElement('dl');
    list.className = 'sheet-numbers';
    for (const row of section.rows) {
      const container = document.createElement('div');
      container.className = 'sheet-number';
      container.dataset.sheetId = row.id;
      const label = document.createElement('dt');
      cells(row.label, label);
      const value = document.createElement('dd');
      if (row.value !== null) {
        const figure = document.createElement('span');
        figure.className = 'sheet-figure';
        figure.dataset.sheetValue = row.id;
        figure.textContent = row.value;
        value.append(figure);
      }
      const detail = document.createElement('p');
      detail.className = 'sheet-formula';
      cells(row.detail, detail);
      value.append(detail);
      container.append(label, value);
      list.append(container);
    }
    element.append(caption, list);
    shell.append(element);
  }

  const facts = document.createElement('section');
  facts.className = 'sheet-panel';
  const factsHeading = document.createElement('h2');
  factsHeading.textContent = 'These numbers as structured data';
  const factsNote = document.createElement('p');
  factsNote.className = 'sheet-note';
  factsNote.textContent =
    'The same facts as above, as JSON. Nothing is here that is not printed ' +
    'on this page, and no free text is included.';
  const script = document.createElement('script');
  script.type = 'application/json';
  script.id = SHEET_JSON_SCRIPT_ID;
  script.textContent = JSON.stringify(sheetFacts(sheet), null, 2);
  facts.append(factsHeading, factsNote, script);
  shell.append(facts);

  return shell;
}
