/**
 * THE ATTACK PROFILES, ON THE WEAPONS PANEL.
 *
 * Plain controls only, the same rule the rest of this panel is written under: a
 * real `<select>` per choice, every one with an accessible name that names both
 * the profile and the weapon, so "use Dexterity for Martial Arts with the
 * shortsword" is unambiguous to something driving by name.
 *
 * THE TWO SELECTS ARE THE SRD'S OWN CHOICES, NOT SETTINGS. Nothing they change
 * is saved — there is no command behind them and no column to write to. They
 * exist because the source hands the player a decision ("you can use your
 * Dexterity modifier instead of your Strength modifier"; "it can be Radiant
 * damage or the weapon's normal damage type (your choice)") and printing one
 * side of a choice as though it were the answer would be this application
 * deciding something the rules leave to the table.
 *
 * AND "NOT CHOSEN" IS ITSELF AN ENTRY IN THE DAMAGE-TYPE CONTROL. A `<select>`
 * with no such entry displays its first option whether or not the user picked
 * it, which made the control assert a choice on load — and the number line, on
 * a separate fallback of its own, asserted the OTHER one. `damageTypeChoice`
 * builds both from one function so the page cannot say two things at once.
 *
 * WHERE THE APPLICATION CANNOT DECIDE, THE SENTENCE IS ON THE PAGE. An
 * `undecided` ability list prints why it is undecided; an `unavailable` one
 * prints what is missing instead of a number. That is the posture
 * `masteryStatement` already takes for the mastery allowance.
 *
 * AND THE SELECTED OPTION PRINTS ITS OWN SENTENCE BESIDE THE LIST'S. On an
 * `undecided` Shillelagh row, "this application cannot tell which source
 * applies" describes the LIST, while Strength is on that list because the
 * cantrip grants it outright. One sentence cannot carry both facts, so each
 * option carries its own and the line follows the control.
 *
 * COPY CONSTRAINT: `tests/browser/attribution.spec.ts` asserts that
 * `/D&D|Dungeons|Wizards/` appears in neither the page title nor the body text.
 * Every string here is written under that rule.
 */
import type {
  AbilityOption,
  AttackProfile,
  AttackProfileResult,
  ProfileDamageType,
  WeaponAttackProfiles,
} from '../../../rules/attack-profiles';
import { formatWeaponDamage } from '../../../domain/weapon-damage';
import { freeTextSpan } from '../../free-text';

const ABILITY_LABELS: Readonly<Record<string, string>> = {
  strength: 'Strength',
  dexterity: 'Dexterity',
  constitution: 'Constitution',
  intelligence: 'Intelligence',
  wisdom: 'Wisdom',
  charisma: 'Charisma',
};

function abilityLabel(ability: string): string {
  return ABILITY_LABELS[ability] ?? ability;
}

/** `+7`, `+0`, `-1` — a sign always, because a bare `7` reads as a total. */
export function signed(value: number): string {
  return value < 0 ? String(value) : `+${String(value)}`;
}

/**
 * How many attacks the Attack action gives, in a sentence.
 *
 * D15's display rule is `attacksPerAction(classes).count > 1`, and this is the
 * one place it is spoken. The count is the character's; a profile that gives a
 * different number says so on its own row.
 *
 * THE SENTENCE IS ABOUT EVERY WEAPON, AND AFTER D19 IT SAYS SO WHEN THAT
 * MATTERS. A grant this application could not apply — a pact-weapon grant, an
 * optional feature it cannot confirm — would make an unqualified "gives 2
 * attacks" wrong for the crossbow beside it. The qualification is added only
 * when there is something to qualify, so the ordinary character's sentence is
 * unchanged.
 */
export function attacksStatement(result: AttackProfileResult): string {
  // READ OFF THE WARNINGS, NOT OFF THE PROFILES, and the difference is a real
  // case rather than a preference: a character who owns no weapons and knows
  // neither cantrip has NO profiles at all, and the panel then prints the
  // warning under a sentence that would otherwise still read as the whole
  // answer. The warning is emitted once per unresolved grant either way.
  const unresolved = result.warnings.some(
    (warning) => warning.code === 'unresolved_extra_attack',
  );
  const base = result.has_extra_attack
    ? `The Attack action gives ${String(result.attacks_per_action)} attacks.`
    : 'The Attack action gives one attack.';
  return unresolved
    ? `${base} That is the number for every weapon; features this application ` +
        'cannot apply are listed below and are not counted in it.'
    : base;
}

/** `+7 to hit`, or an honest statement that there is no number. */
export function toHitLabel(
  profile: AttackProfile,
  option: AbilityOption | null,
): string {
  if (option === null) {
    return 'To hit: not available';
  }
  return `To hit: ${signed(option.attack_bonus)} (${abilityLabel(option.ability)})`;
}

/**
 * The two sides of the SRD's damage-type choice, and the sentence printed while
 * NEITHER has been picked.
 *
 * ONE FUNCTION FEEDS BOTH THE NUMBER LINE AND THE `<select>`. Built separately
 * they drifted, and the drift was silent: the number line fell back to the
 * weapon's own type while an untouched `<select>` selects its FIRST option, so a
 * Longsword under True Strike loaded reading `Slashing` on one line and
 * `Radiant` on the control beside it. Worse than the mismatch, the line had
 * resolved a choice the player never made — the one thing this module's header
 * says it will not do.
 *
 * "NOT CHOSEN" IS A REAL ENTRY IN THE CONTROL, not the absence of one, because
 * a `<select>` has no empty state to fall back to. Its value is the empty
 * string, which maps back to `null`, so the undecided state is reachable again
 * after a choice is made.
 */
export function damageTypeChoice(damageType: {
  readonly spell_type: string;
  readonly weapon_type: string | null;
}): {
  readonly undecided: string;
  readonly options: readonly { value: string; label: string }[];
} {
  // `weapon_type` is null for two different reasons — the user's weapon records
  // none, and Shillelagh's row is tied to no weapon at all — and this phrase is
  // honest for both: it names the side without claiming what it is.
  const weaponLabel =
    damageType.weapon_type ?? 'the weapon’s normal damage type';
  const undecided = `${damageType.spell_type} or ${weaponLabel}`;
  return {
    undecided,
    options: [
      { value: '', label: `Not chosen: ${undecided}` },
      { value: damageType.spell_type, label: damageType.spell_type },
      { value: weaponLabel, label: weaponLabel },
    ],
  };
}

function damageTypeLabel(
  damageType: ProfileDamageType,
  chosen: string | null,
): string {
  switch (damageType.state) {
    case 'weapon':
      return damageType.damage_type;
    case 'not_recorded':
      return 'damage type not recorded';
    case 'choice':
      return chosen ?? damageTypeChoice(damageType).undecided;
  }
}

/**
 * `1d8 +4 Slashing, plus 2d6 Radiant`, or an honest blank.
 *
 * The ability MODIFIER is added here and the proficiency bonus is not —
 * `docs/srd/source/sheet-math.txt`: "You add the same ability modifier you use
 * for attacks with a weapon to your damage rolls with that weapon."
 */
export function damageLabel(
  profile: AttackProfile,
  option: AbilityOption | null,
  chosenType: string | null,
): string {
  const parts: string[] = [];
  if (profile.damage.amount.kind === 'not_recorded') {
    parts.push('damage not recorded');
  } else {
    parts.push(formatWeaponDamage(profile.damage.amount));
  }
  if (option !== null && option.damage_modifier !== 0) {
    parts.push(signed(option.damage_modifier));
  }
  parts.push(damageTypeLabel(profile.damage.damage_type, chosenType));
  const base = `Damage: ${parts.join(' ')}`;
  const extra = profile.damage.extra
    .map((entry) => `${entry.dice} ${entry.damage_type}`)
    .join(', ');
  return extra === '' ? base : `${base}, plus ${extra}`;
}

function paragraph(text: string, className?: string): HTMLParagraphElement {
  const element = document.createElement('p');
  element.textContent = text;
  if (className !== undefined) {
    element.className = className;
  }
  return element;
}

function list(items: readonly string[], className: string): HTMLElement | null {
  if (items.length === 0) {
    return null;
  }
  const element = document.createElement('ul');
  element.className = className;
  for (const item of items) {
    const entry = document.createElement('li');
    entry.textContent = item;
    element.append(entry);
  }
  return element;
}

function select(
  id: string,
  accessibleName: string,
  options: readonly { value: string; label: string }[],
): HTMLSelectElement {
  const element = document.createElement('select');
  element.id = id;
  element.className = 'planner-input';
  element.dataset.focusKey = id;
  element.setAttribute('aria-label', accessibleName);
  for (const entry of options) {
    const option = document.createElement('option');
    option.value = entry.value;
    option.textContent = entry.label;
    element.append(option);
  }
  return element;
}

function renderProfile(
  profile: AttackProfile,
  weapon: WeaponAttackProfiles,
  index: number,
): HTMLElement {
  const block = document.createElement('div');
  block.className = 'attack-profile';
  block.dataset.testid = 'attack-profile';
  block.dataset.kind = profile.kind;

  const heading = document.createElement('h5');
  heading.textContent = profile.label;
  block.append(heading);

  const options =
    profile.abilities.state === 'unavailable' ? [] : profile.abilities.options;
  let chosenOption: AbilityOption | null = options[0] ?? null;
  let chosenType: string | null = null;

  const numbers = document.createElement('p');
  numbers.className = 'attack-profile-numbers';
  numbers.dataset.testid = 'attack-profile-numbers';

  // WHY THIS ABILITY, as against why the LIST. On an `undecided` list the two
  // are different facts, and only the second was ever printed: "this
  // application cannot tell which source applies" explains the list, while
  // "Strength, which a melee weapon attack uses when the cantrip is not
  // applied" explains why THAT entry is on it. Showing the list sentence alone
  // filed an entitlement the rules grant under this application's own
  // ignorance. This line follows the control, so every entry is attributable.
  const optionReason = document.createElement('p');
  optionReason.className = 'attack-profile-reason';
  optionReason.dataset.testid = 'attack-profile-option-reason';

  const redraw = (): void => {
    numbers.textContent = `${toHitLabel(profile, chosenOption)} · ${damageLabel(
      profile,
      chosenOption,
      chosenType,
    )}`;
    optionReason.textContent = chosenOption?.reason ?? '';
    optionReason.hidden = chosenOption === null;
  };

  // The identifier is per weapon and per profile so two weapons' selects never
  // collide, and so focus survives a re-render through `data-focus-key`.
  const key = `attack-${String(weapon.weapon_id ?? 'derived')}-${profile.kind}-${String(index)}`;

  if (options.length > 1) {
    const control = select(
      `${key}-ability`,
      `Ability for ${profile.label} with ${weapon.weapon_name}`,
      options.map((option) => ({
        value: option.ability,
        label: `${abilityLabel(option.ability)} (${signed(option.attack_bonus)})`,
      })),
    );
    control.addEventListener('change', () => {
      chosenOption =
        options.find((option) => option.ability === control.value) ?? null;
      redraw();
    });
    block.append(control);
  }

  block.append(numbers);

  const damageType = profile.damage.damage_type;
  if (damageType.state === 'choice') {
    const control = select(
      `${key}-damage-type`,
      `Damage type for ${profile.label} with ${weapon.weapon_name}`,
      damageTypeChoice(damageType).options,
    );
    control.addEventListener('change', () => {
      chosenType = control.value === '' ? null : control.value;
      redraw();
    });
    block.append(control);
  }

  redraw();

  // A `fixed` list has no sentence of its own — the single option carries it,
  // and `optionReason` below prints exactly that. Every other state has a
  // sentence explaining the choice or the ignorance, and that sentence is the
  // point of the state existing.
  if (profile.abilities.state !== 'fixed') {
    block.append(paragraph(profile.abilities.reason, 'attack-profile-reason'));
  }
  block.append(optionReason);

  if (profile.damage.versatile_note !== null) {
    block.append(
      paragraph(profile.damage.versatile_note, 'attack-profile-reason'),
    );
  }

  block.append(
    paragraph(
      profile.attacks_per_action === 1
        ? 'One attack.'
        : `${String(profile.attacks_per_action)} attacks.`,
      'attack-profile-count',
    ),
  );

  // The ignorance, ON THE ROW IT WOULD HAVE CHANGED. The panel-level warning
  // already names the grant once; this is what tells the reader that THIS
  // weapon is one of the ones the answer might be short for.
  const unresolved = list(
    profile.unresolved_attacks.map(
      (grant) =>
        `${grant.source_name} would give ${String(grant.attack_count)} ` +
        `attacks. ${grant.unresolved.join(' ')}`,
    ),
    'attack-profile-unresolved',
  );
  if (unresolved !== null) {
    block.append(unresolved);
  }

  const preconditions = list(profile.preconditions, 'attack-profile-conditions');
  if (preconditions !== null) {
    block.append(preconditions);
  }
  const notes = list(profile.notes, 'attack-profile-notes');
  if (notes !== null) {
    block.append(notes);
  }
  return block;
}

function renderWeapon(weapon: WeaponAttackProfiles): HTMLElement {
  const block = document.createElement('div');
  block.className = 'attack-weapon';
  block.dataset.testid = 'attack-weapon';
  if (weapon.weapon_id !== null) {
    block.dataset.weaponId = String(weapon.weapon_id);
  }
  block.dataset.derived = String(weapon.derived);

  const heading = document.createElement('h4');
  if (weapon.derived) {
    // This application wrote the name, so it is not free text — and saying so
    // matters, because the row exists without a weapon behind it.
    heading.textContent = weapon.weapon_name;
  } else {
    heading.append(freeTextSpan(weapon.weapon_name));
  }
  block.append(heading);

  if (weapon.derived) {
    block.append(
      paragraph(
        'Derived: this row is computed from a cantrip this character knows. ' +
          'No weapon has been added to the list above to produce it.',
        'attack-weapon-derived',
      ),
    );
  }

  weapon.profiles.forEach((profile, index) => {
    block.append(renderProfile(profile, weapon, index));
  });
  return block;
}

export function renderAttackProfiles(
  result: AttackProfileResult,
): HTMLElement {
  const section = document.createElement('section');
  section.className = 'attack-profiles';
  section.dataset.testid = 'attack-profiles';

  const heading = document.createElement('h3');
  heading.textContent = 'Attack profiles';
  section.append(heading);
  section.append(paragraph(attacksStatement(result)));

  for (const warning of result.warnings) {
    const element = paragraph(warning.message, 'attack-profile-warning');
    element.setAttribute('role', 'status');
    element.dataset.testid = 'attack-profile-warning';
    element.dataset.code = warning.code;
    section.append(element);
  }

  if (result.weapons.length === 0) {
    section.append(
      paragraph(
        'No attack profiles: this character owns no weapons and knows neither ' +
          'of the two cantrips that supply an attack of their own.',
      ),
    );
    return section;
  }

  for (const weapon of result.weapons) {
    section.append(renderWeapon(weapon));
  }
  return section;
}
