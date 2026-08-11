import { describe, expect, it } from 'vitest';
import type { AuthoringGrant } from '../../../src/authoring/contracts';
import type {
  AuthoringCharacterEffect,
  AuthoringFeatureEffect,
} from '../../../src/authoring/effect-forms';
import {
  characterEffectKinds,
  featureTemplateEffectKinds,
  grantRuleKinds,
} from '../../../src/domain/enums';
import {
  renderPublishPreviewEffect,
  renderPublishPreviewGrant,
} from '../../../src/ui/screens/homebrew/publish-preview-renderer';
import {
  elementText,
  installInteractiveDocument,
} from '../../fixtures/interactive-dom';

const hostile = '<img data-preview-hostile src=x onerror=window.previewXss=1> Arcana';

function compactText(node: Node): string {
  return elementText(node).replace(/\s+/gu, ' ').replace(/\s+([,.;:])/gu, '$1').trim();
}

const grants = [
  {
    kind: 'fixed_spell', rule_key: 'fixed', count: 1, bucket: 'prepared',
    always_prepared: true, with_slots: true, free_cast: null,
  },
  {
    kind: 'choice_from_list', rule_key: 'list', count: 1, bucket: 'known',
    list: 'Wizard', level_min: 5, level_max: 5, always_prepared: false,
    with_slots: true, free_cast: null,
  },
  {
    kind: 'choice_from_query', rule_key: 'query', count: 2, bucket: 'prepared',
    schools: ['Chronomancy'], tags: [hostile], level_min: 1, level_max: 3,
    always_prepared: false, with_slots: true, free_cast: null,
  },
  {
    kind: 'grant_source', rule_key: 'source', count: 1, source_type: 'feat',
    always_prepared: false, with_slots: true, free_cast: null,
  },
  {
    kind: 'capability', rule_key: 'capability', capability_key: 'ritual-adept',
    collection: 'wizard_spellbook', access_mode: 'ritual_only', tags: ['ritual'],
    always_prepared: false, with_slots: true, free_cast: null,
  },
  {
    kind: 'spellbook_acquisition', rule_key: 'spellbook', count: 2,
    bucket: 'spellbook', list: 'Wizard', level_min: 1, level_max: 3,
    always_prepared: false, with_slots: true, free_cast: null,
  },
  {
    kind: 'fighting_style', rule_key: 'style', style_key: hostile,
    always_prepared: false, with_slots: true, free_cast: null,
  },
  {
    kind: 'weapon_mastery', rule_key: 'mastery', count: 2,
    selection_pool: 'held_weapons', always_prepared: false,
    with_slots: true, free_cast: null,
  },
  {
    kind: 'skill_proficiency', rule_key: 'skills', count: 1,
    skills: ['arcana', hostile], allows_tool_instead: true,
    always_prepared: false, with_slots: true, free_cast: null,
  },
] as const satisfies readonly AuthoringGrant[];

const effects = [
  { kind: 'damage_resistance', label: hostile, notes: hostile, sort_order: 1, damage_type: 'Fire' },
  { kind: 'hp_modifier', label: 'Hardy', notes: null, sort_order: 2, hit_points_flat: 2, hit_points_per_level: 1 },
  { kind: 'speed', label: 'Fleet', notes: null, sort_order: 3, speed_bonus_feet: 10 },
  { kind: 'ability_increase', label: 'Keen', notes: null, sort_order: 4, ability: 'intelligence', amount: 2, maximum: 20 },
  { kind: 'ability_override', label: 'Mighty', notes: null, sort_order: 5, ability: 'strength', maximum: 21 },
  { kind: 'armor_class_bonus', label: 'Ward', notes: null, sort_order: 6, amount: 1 },
  { kind: 'armor_class_formula', label: 'Defense', notes: null, sort_order: 7, base: 10, ability_1: 'dexterity', ability_2: 'wisdom', allows_shield: false },
  { kind: 'attack_ability_override', label: 'Bond', notes: null, sort_order: 8, ability: 'charisma', weapon_scope: 'one_bonded_weapon' },
  { kind: 'weapon_attack_bonus', label: 'Aim', notes: null, sort_order: 9, amount: 1, weapon_scope: 'any_weapon' },
  { kind: 'weapon_damage_bonus', label: 'Force', notes: null, sort_order: 10, amount: 2, weapon_scope: 'any_weapon' },
  { kind: 'extra_attack', label: 'More attacks', notes: null, sort_order: 11, attack_count: 2, weapon_scope: 'any_weapon' },
] as const satisfies readonly (AuthoringCharacterEffect | AuthoringFeatureEffect)[];

describe('human publish-preview renderer', () => {
  it('renders every grant kind through the exhaustive seam and phrases the level-five choice', () => {
    const restore = installInteractiveDocument();
    try {
      expect(grants.map((grant) => grant.kind)).toEqual(grantRuleKinds);
      const root = document.createElement('ul');
      for (const grant of grants) {
        root.append(renderPublishPreviewGrant(grant, {
          catalogNameForGrant: (candidate) => candidate.kind === 'fixed_spell'
            ? { name: hostile, catalog_layer: 'external' }
            : candidate.kind === 'grant_source'
              ? { name: 'Alert', catalog_layer: 'bundled' }
              : null,
        }));
      }
      const text = compactText(root);
      expect(text).toContain(
        'Choose 1 Wizard spell of level 5; the spell is known and uses spell slots.',
      );
      expect(text).toContain('the spells are prepared and use spell slots.');
      expect(text).toContain(`${hostile} · Homebrew · external layer`);
      expect(text).toContain('Alert · SRD · bundled layer');
      expect(text).toContain('Choose 1 skill proficiency from Arcana or');
      expect(text).not.toContain('rule_key');
      expect(text).not.toContain('{"kind"');
      expect(root.querySelectorAll('code')).toHaveLength(0);
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('[data-preview-hostile]')).toHaveLength(0);
      expect(root.querySelectorAll('[data-free-text="unverified-origin"]').length)
        .toBeGreaterThanOrEqual(5);
      const incomplete = renderPublishPreviewGrant({
        kind: 'choice_from_list',
        rule_key: 'incomplete',
      });
      expect(compactText(incomplete)).toBe('1 configured grant (spell choice).');
      expect(incomplete.querySelectorAll('code')).toHaveLength(0);
    } finally {
      restore();
    }
  });

  it('renders every effect kind as field facts and keeps authored labels and notes inert', () => {
    const restore = installInteractiveDocument();
    try {
      expect(effects.map((effect) => effect.kind)).toEqual([
        ...characterEffectKinds,
        ...featureTemplateEffectKinds.filter((kind) =>
          !(characterEffectKinds as readonly string[]).includes(kind)
        ),
      ]);
      const root = document.createElement('ul');
      for (const effect of effects) root.append(renderPublishPreviewEffect(effect));
      const text = compactText(root);
      expect(text).toContain('Resistance to Fire damage.');
      expect(text).toContain('+2 Intelligence, to a maximum score of 20.');
      expect(text).toContain('Armor Class 10 + Dexterity modifier + Wisdom modifier; shields are not allowed.');
      expect(text).toContain(
        'This application cannot identify the bonded weapon, so it does not apply this number yet.',
      );
      expect(text).toContain('Make 2 attacks with any weapon when taking the Attack action.');
      expect(text).not.toContain('{"kind"');
      expect(root.querySelectorAll('code')).toHaveLength(0);
      expect(root.querySelectorAll('img')).toHaveLength(0);
      expect(root.querySelectorAll('[data-preview-hostile]')).toHaveLength(0);
      expect(root.querySelectorAll('[data-free-text="unverified-origin"]').length)
        .toBeGreaterThanOrEqual(2);
    } finally {
      restore();
    }
  });
});
