import { describe, expect, it } from 'vitest';
import type { WeaponFields } from '../../../src/domain/command-contracts';
import type {
  CharacterWeapon,
  WeaponsPanel,
  WeaponTemplate,
} from '../../../src/domain/read-models';
import {
  blankWeapon,
  damageSummary,
  masteryOverselected,
  masteryStatement,
  propertySummary,
  weaponFromTemplate,
  renderWeapons,
} from '../../../src/ui/screens/planner/weapons';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';

function weapon(changes: Partial<CharacterWeapon> = {}): CharacterWeapon {
  return {
    id: 1,
    ...blankWeapon(),
    name: 'Test weapon',
    mastery_selected: false,
    ...changes,
  };
}

function template(changes: Partial<WeaponTemplate> = {}): WeaponTemplate {
  const { notes: _notes, ...profile } = blankWeapon();
  return {
    id: 9,
    content_key: '2024:weapon:longsword',
    srd_group: 'martial_melee',
    catalog_layer: 'bundled',
    ...profile,
    name: 'Longsword',
    damage: { kind: 'dice', dice: '1d8' },
    damage_type: 'Slashing',
    versatile_damage: { kind: 'dice', dice: '1d10' },
    mastery_property: 'Sap',
    ...changes,
  };
}

function panel(changes: Partial<WeaponsPanel> = {}): WeaponsPanel {
  return {
    weapons: [],
    templates: [],
    allowance: { state: 'none', classes: [] },
    selected_count: 0,
    attacks: {
      weapons: [],
      warnings: [],
      attacks_per_action: 1,
      has_extra_attack: false,
    },
    ...changes,
  };
}

it('renders a hostile external reference weapon inert with its exact layer', () => {
  const restoreDocument = installInteractiveDocument();
  try {
    const hostile = '</option><img data-ha10-weapon-template src=x>';
    const view = renderWeapons({
      panel: panel({
        templates: [template({ name: hostile, catalog_layer: 'external' })],
      }),
      actions: {
        addWeapon: () => undefined,
        updateWeapon: () => undefined,
        removeWeapon: () => undefined,
        setWeaponMastery: () => undefined,
      },
      disabled: false,
      editing: 'new',
      onEditingChanged: () => undefined,
    });
    const picker = interactiveElement(view).querySelector(
      '[data-focus-key="weapon-template"]',
    );

    const homebrewGroup = picker?.querySelector('optgroup');
    expect(homebrewGroup?.getAttribute('label')).toBe(
      'Martial Melee — Homebrew · external layer',
    );
    expect(homebrewGroup?.querySelector('option')?.textContent).toBe(hostile);
    expect(
      interactiveElement(view).querySelector('[data-ha10-weapon-template]'),
    ).toBeNull();
  } finally {
    restoreDocument();
  }
});

describe('pre-filling a weapon from a template', () => {
  it('copies every fillable field and adds an empty notes field', () => {
    const source = template();
    const filled = weaponFromTemplate(source);

    // The catalog identity does NOT travel: there is no template id, content
    // key or group on the weapon, which is what makes the copy one-way.
    expect(filled).not.toHaveProperty('id');
    expect(filled).not.toHaveProperty('content_key');
    expect(filled).not.toHaveProperty('srd_group');
    expect(Object.keys(filled).sort()).toEqual(
      Object.keys(blankWeapon()).sort(),
    );
    expect(filled).toMatchObject({
      name: 'Longsword',
      damage: { kind: 'dice', dice: '1d8' },
      damage_type: 'Slashing',
      versatile_damage: { kind: 'dice', dice: '1d10' },
      mastery_property: 'Sap',
      attack_kind: 'melee',
      notes: null,
    });
  });

  it.each([
    ['simple_melee', 'melee'],
    ['simple_ranged', 'ranged'],
    ['martial_melee', 'melee'],
    ['martial_ranged', 'ranged'],
  ] as const)('derives %s as %s', (srd_group, attack_kind) => {
    expect(weaponFromTemplate(template({ srd_group })).attack_kind).toBe(
      attack_kind,
    );
  });

  it('produces a detached copy, so editing the draft cannot reach the catalog', () => {
    const source = template();
    const snapshot = { ...source };
    const filled: WeaponFields = weaponFromTemplate(source);
    filled.name = 'Something else';
    filled.damage = { kind: 'dice', dice: '1d2' };
    filled.mastery_property = null;
    expect(source).toEqual(snapshot);
  });
});

describe('reading a weapon back as a sentence', () => {
  it('renders damage with its versatile die', () => {
    expect(
      damageSummary(
        weapon({
          damage: { kind: 'dice', dice: '1d8' },
          damage_type: 'Slashing',
          versatile_damage: { kind: 'dice', dice: '1d10' },
        }),
      ),
    ).toBe('1d8 Slashing (Versatile 1d10)');
  });

  it('says a half-entered weapon is not recorded rather than inventing one', () => {
    expect(damageSummary(weapon())).toBe('not recorded');
    expect(
      damageSummary(weapon({ damage: { kind: 'dice', dice: '1d6' } })),
    ).toBe('1d6');
  });

  it('lists properties as words, with the ammunition kind and the range', () => {
    expect(
      propertySummary(
        weapon({
          loading: true,
          ammunition: true,
          ammunition_kind: 'Needle',
          range: { kind: 'ranged', near_feet: 25, far_feet: 100 },
        }),
      ),
    ).toBe('Loading, Ammunition (Needle), Range 25/100 ft');
  });

  it('keeps a qualified property verbatim beside its toggle', () => {
    expect(
      propertySummary(
        weapon({
          heavy: true,
          reach: true,
          two_handed: true,
          other_properties: 'Two-Handed (unless mounted)',
        }),
      ),
    ).toBe('Heavy, Reach, Two-Handed, Two-Handed (unless mounted)');
  });

  it('says "none" rather than showing an empty cell', () => {
    expect(propertySummary(weapon())).toBe('none');
  });

  it('labels an imported legacy range as requiring repair', () => {
    expect(
      propertySummary(
        weapon({
          range: { kind: 'legacy', near_feet: null, far_feet: 60 },
        }),
      ),
    ).toBe('Legacy range —/60 ft (repair required)');
  });
});

describe('the mastery statement', () => {
  it('states plainly when no class grants it', () => {
    expect(masteryStatement(panel())).toContain('none of this character');
  });

  it('states the count and where it came from', () => {
    const statement = masteryStatement(
      panel({
        selected_count: 2,
        allowance: {
          state: 'known',
          count: 4,
          classes: [
            {
              class_definition_id: 1,
              class_name: 'Fighter',
              class_level: 5,
              allowance: { state: 'known', count: 4 },
            },
          ],
        },
      }),
    );
    expect(statement).toContain('2 of 4 chosen');
    expect(statement).toContain('Fighter, level 5');
  });

  it('names the class whose count it does not have, and shows no number for it', () => {
    const statement = masteryStatement(
      panel({
        selected_count: 1,
        allowance: {
          state: 'unknown',
          classes: [
            {
              class_definition_id: 2,
              class_name: 'Rogue',
              class_level: 3,
              allowance: { state: 'unsourced' },
            },
          ],
        },
      }),
    );
    expect(statement).toContain('Rogue grants it');
    expect(statement).toContain('does not have the count for Rogue');
    // The failure this guards against: printing "0 of 0 chosen" and reading as
    // an entitlement of none.
    expect(statement).not.toContain('of 0');
  });

  /**
   * `unsourced` and `content_missing` both land in the `unknown` state and they
   * are NOT the same ignorance. `unsourced` is a sourced fact — the class does
   * grant Weapon Mastery and only the number is missing — so naming the grant
   * is honest. `content_missing` can mean there is no grant row at all, which
   * is what an un-seeded database looks like, and there the app does not know
   * whether anything is granted. Claiming a grant would assert precisely the
   * thing that is missing.
   */
  it('does not claim a grant it has no row for', () => {
    const statement = masteryStatement(
      panel({
        selected_count: 1,
        allowance: {
          state: 'unknown',
          classes: [
            {
              class_definition_id: 3,
              class_name: 'Paladin',
              class_level: 4,
              allowance: { state: 'content_missing' },
            },
          ],
        },
      }),
    );
    expect(statement).toContain('Paladin');
    expect(statement).not.toContain('grants it');
    expect(statement).toContain('1 chosen');
    expect(statement).not.toContain('of 0');
  });

  it('lists each class separately when several grant it, and never adds them up', () => {
    const statement = masteryStatement(
      panel({
        selected_count: 0,
        allowance: {
          state: 'unresolved',
          classes: [
            {
              class_definition_id: 1,
              class_name: 'Fighter',
              class_level: 5,
              allowance: { state: 'known', count: 4 },
            },
            {
              class_definition_id: 3,
              class_name: 'Barbarian',
              class_level: 4,
              allowance: { state: 'known', count: 3 },
            },
          ],
        },
      }),
    );
    expect(statement).toContain('Fighter grants 4');
    expect(statement).toContain('Barbarian grants 3');
    expect(statement).toContain('does not know how these combine');
    // Neither the sum nor the maximum is presented as the answer.
    expect(statement).not.toContain('7');
    expect(statement).not.toMatch(/allowance is 4\b/);
  });
});

describe('the over-selection warning', () => {
  const knownFour = (selected: number): WeaponsPanel =>
    panel({
      selected_count: selected,
      allowance: {
        state: 'known',
        count: 4,
        classes: [
          {
            class_definition_id: 1,
            class_name: 'Fighter',
            class_level: 5,
            allowance: { state: 'known', count: 4 },
          },
        ],
      },
    });

  it('warns only when the application is certain', () => {
    expect(masteryOverselected(knownFour(4))).toBe(false);
    expect(masteryOverselected(knownFour(5))).toBe(true);
  });

  it('never warns from a state the application cannot defend', () => {
    for (const allowance of [
      { state: 'unknown' as const, classes: [] },
      { state: 'unresolved' as const, classes: [] },
      { state: 'none' as const, classes: [] },
    ]) {
      expect(
        masteryOverselected(panel({ selected_count: 99, allowance })),
        allowance.state,
      ).toBe(false);
    }
  });
});
