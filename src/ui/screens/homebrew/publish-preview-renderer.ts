import type { CatalogNamedDisclosure } from '../../../catalog/catalog-disclosure';
import { catalogLayerLabel } from '../../../catalog/catalog-disclosure';
import type {
  AuthoringDraftGrant,
  AuthoringGrant,
  SpellGrantAuthoringReferences,
} from '../../../authoring/contracts';
import type {
  AuthoringCharacterEffect,
  AuthoringFeatureEffect,
} from '../../../authoring/effect-forms';
import {
  isEnumValue,
  skills,
  slotBuckets,
  type ExtraAttackWeaponScope,
  type SlotBucket,
} from '../../../domain/enums';
import { SKILL_LABELS } from '../../../rules/skills';
import { element } from '../../dom';
import { freeTextSpan } from '../../free-text';
import { abilityLabel } from '../../human-labels';

export interface PublishPreviewGrantContext {
  readonly catalogNameForGrant?: (
    grant: AuthoringGrant,
  ) => CatalogNamedDisclosure | null;
}

/** Resolves a portable fixed-spell fingerprint back through the saved draft. */
export function spellCatalogNameForGrant(
  grant: AuthoringGrant,
  draftGrants: readonly AuthoringDraftGrant[],
  references: SpellGrantAuthoringReferences,
): CatalogNamedDisclosure | null {
  if (grant.kind !== 'fixed_spell') return null;
  const draft = draftGrants.find((candidate) =>
    candidate.kind === 'fixed_spell' && candidate.rule_key === grant.rule_key
  );
  if (draft?.kind !== 'fixed_spell' || draft.spell_content_key === null) return null;
  const reference = references.spells.find((candidate) =>
    candidate.content_key === draft.spell_content_key
  );
  return reference === undefined
    ? null
    : { name: reference.name, catalog_layer: reference.catalog_layer };
}

function appendCatalogName(
  target: HTMLElement,
  disclosure: CatalogNamedDisclosure,
): void {
  target.append(
    freeTextSpan(disclosure.name),
    ` · ${catalogLayerLabel(disclosure.catalog_layer)}`,
  );
}

function signed(value: number): string {
  return value >= 0 ? `+${String(value)}` : String(value);
}

function countField(grant: AuthoringGrant, fallback: number | null): number | null {
  return Number.isSafeInteger(grant.count) && Number(grant.count) > 0
    ? Number(grant.count)
    : fallback;
}

function numberField(grant: AuthoringGrant, field: string): number | null {
  const value = grant[field];
  return Number.isSafeInteger(value) ? Number(value) : null;
}

function stringField(grant: AuthoringGrant, field: string): string | null {
  const value = grant[field];
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

function stringListField(grant: AuthoringGrant, field: string): readonly string[] {
  const value = grant[field];
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
    ? value
    : [];
}

function levelPhrase(minimum: number | null, maximum: number | null): string {
  if (minimum === 0 && maximum === 0) return 'cantrip';
  if (minimum !== null && minimum === maximum) {
    return `level ${String(minimum)}`;
  }
  if (minimum !== null && maximum !== null) {
    return `levels ${String(minimum)}–${String(maximum)}`;
  }
  if (minimum !== null) return `level ${String(minimum)} or higher`;
  if (maximum !== null) return `up to level ${String(maximum)}`;
  return 'a configured level';
}

function spellAgreement(count: number): {
  readonly noun: 'spell' | 'spells';
  readonly article: 'the spell' | 'the spells';
  readonly verb: 'is' | 'are';
  readonly slotVerb: 'uses' | 'use';
  readonly slotlessVerb: 'does not use' | 'do not use';
} {
  return count === 1
    ? {
        noun: 'spell', article: 'the spell', verb: 'is',
        slotVerb: 'uses', slotlessVerb: 'does not use',
      }
    : {
        noun: 'spells', article: 'the spells', verb: 'are',
        slotVerb: 'use', slotlessVerb: 'do not use',
      };
}

function bucketField(grant: AuthoringGrant): SlotBucket | null {
  return isEnumValue(slotBuckets, grant.bucket) ? grant.bucket : null;
}

function appendSpellAccess(
  target: HTMLElement,
  grant: AuthoringGrant,
  count: number,
): void {
  const agreement = spellAgreement(count);
  const bucket = bucketField(grant);
  const alwaysPrepared = grant.always_prepared === true;
  const withSlots = grant.with_slots === true;
  target.append('; ');
  switch (bucket) {
    case 'cantrip_known':
      target.append(`${agreement.article} ${agreement.verb} known as ${count === 1 ? 'a cantrip' : 'cantrips'}`);
      break;
    case 'prepared':
      target.append(`${agreement.article} ${agreement.verb} ${alwaysPrepared ? 'always prepared' : 'prepared'}`);
      break;
    case 'known':
      target.append(`${agreement.article} ${agreement.verb} known`);
      break;
    case 'automatic':
      target.append(`${agreement.article} ${agreement.verb} granted automatically`);
      break;
    case 'spellbook':
      target.append(`${agreement.article} ${agreement.verb} added to the spellbook`);
      break;
    case null:
      target.append(`${agreement.article} ${agreement.verb} a configured spell grant`);
      break;
  }
  target.append(withSlots
    ? ` and ${agreement.slotVerb} spell slots`
    : ` and ${agreement.slotlessVerb} spell slots`);
}

function appendFreeCast(target: HTMLElement, grant: AuthoringGrant): void {
  const freeCast = grant.free_cast;
  if (freeCast === null || typeof freeCast !== 'object' || Array.isArray(freeCast)) {
    return;
  }
  const uses = Reflect.get(freeCast, 'uses');
  const recovery = Reflect.get(freeCast, 'recovery');
  if (!Number.isSafeInteger(uses) || Number(uses) < 1 || typeof recovery !== 'string') {
    return;
  }
  const recoveryText = (() => {
    switch (recovery) {
      case 'long_rest': return 'per Long Rest';
      case 'short_rest': return 'per Short Rest';
      case 'dawn': return 'until the next dawn';
      case 'at_will': return 'at will';
      default: return 'with the configured recovery';
    }
  })();
  target.append(
    `. It can also be cast ${String(uses)} ${Number(uses) === 1 ? 'time' : 'times'} ` +
      `without a spell slot ${recoveryText}`,
  );
}

function appendActivation(target: HTMLElement, grant: AuthoringGrant): void {
  const classLevel = numberField(grant, 'active_from_class_level');
  const characterLevel = numberField(grant, 'active_from_character_level');
  if (classLevel !== null) {
    target.append(` Available from class level ${String(classLevel)}.`);
  } else if (characterLevel !== null) {
    target.append(` Available from character level ${String(characterLevel)}.`);
  }
  if (grant.active_if_config !== null && grant.active_if_config !== undefined) {
    target.append(' Available only when its configured option is active.');
  }
}

function genericGrant(grant: AuthoringGrant, kind: string): HTMLLIElement {
  const item = element('li');
  const count = countField(grant, 1) ?? 1;
  item.append(
    `${String(count)} configured ${count === 1 ? 'grant' : 'grants'} `,
    `(${kind.replaceAll('_', ' ')}).`,
  );
  const minimum = numberField(grant, 'level_min');
  const maximum = numberField(grant, 'level_max');
  if (minimum !== null || maximum !== null) {
    item.append(` Spell level: ${levelPhrase(minimum, maximum)}.`);
  }
  const bucket = bucketField(grant);
  if (bucket !== null) item.append(` Spell access: ${bucket.replaceAll('_', ' ')}.`);
  return item;
}

/**
 * Renders every closed grant-rule kind as author-facing D&D language.
 * The unreachable tail is both the runtime D33 fallback and the compile-time
 * exhaustiveness guard when GrantRuleKind gains a member.
 */
export function renderPublishPreviewGrant(
  grant: AuthoringGrant,
  context: PublishPreviewGrantContext = {},
): HTMLLIElement {
  const item = element('li');
  const catalogName = context.catalogNameForGrant?.(grant) ?? null;
  switch (grant.kind) {
    case 'fixed_spell': {
      item.append('Gain ');
      if (catalogName === null) item.append('the configured spell');
      else appendCatalogName(item, catalogName);
      appendSpellAccess(item, grant, 1);
      appendFreeCast(item, grant);
      item.append('.');
      appendActivation(item, grant);
      return item;
    }
    case 'choice_from_list': {
      const count = countField(grant, null);
      const list = stringField(grant, 'list');
      if (count === null || list === null) return genericGrant(grant, 'spell choice');
      const agreement = spellAgreement(count);
      item.append(`Choose ${String(count)} `, freeTextSpan(list), ` ${agreement.noun} of ${levelPhrase(
        numberField(grant, 'level_min'),
        numberField(grant, 'level_max'),
      )}`);
      appendSpellAccess(item, grant, count);
      appendFreeCast(item, grant);
      item.append('.');
      appendActivation(item, grant);
      return item;
    }
    case 'choice_from_query': {
      const count = countField(grant, null);
      if (count === null) return genericGrant(grant, 'filtered spell choice');
      const agreement = spellAgreement(count);
      item.append(
        `Choose ${String(count)} ${agreement.noun} of ${levelPhrase(
          numberField(grant, 'level_min'),
          numberField(grant, 'level_max'),
        )}`,
      );
      const schools = stringListField(grant, 'schools');
      if (schools.length > 0) {
        item.append(' from ');
        schools.forEach((school, index) => {
          if (index > 0) item.append(index === schools.length - 1 ? ' or ' : ', ');
          item.append(freeTextSpan(school));
        });
        item.append(schools.length === 1 ? ' school' : ' schools');
      }
      const tags = stringListField(grant, 'tags');
      if (tags.length > 0) {
        item.append(` with ${tags.length === 1 ? 'the tag ' : 'the tags '}`);
        tags.forEach((tag, index) => {
          if (index > 0) item.append(index === tags.length - 1 ? ' and ' : ', ');
          item.append(freeTextSpan(tag));
        });
      }
      appendSpellAccess(item, grant, count);
      appendFreeCast(item, grant);
      item.append('.');
      appendActivation(item, grant);
      return item;
    }
    case 'grant_source': {
      const count = countField(grant, 1) ?? 1;
      item.append(`${count === 1 ? 'Gain' : `Gain ${String(count)} copies of`} `);
      if (catalogName === null) {
        const sourceType = stringField(grant, 'source_type');
        item.append(sourceType === null ? 'the configured content' : `the configured ${sourceType}`);
      } else {
        appendCatalogName(item, catalogName);
      }
      item.append(', including its configured grants.');
      appendActivation(item, grant);
      return item;
    }
    case 'capability': {
      const mode = stringField(grant, 'access_mode');
      const tags = stringListField(grant, 'tags');
      item.append(mode === 'ritual_only' ? 'Gain ritual-only access' : 'Gain configured access');
      if (tags.length > 0) {
        item.append(' to entries tagged ');
        tags.forEach((tag, index) => {
          if (index > 0) item.append(index === tags.length - 1 ? ' and ' : ', ');
          item.append(freeTextSpan(tag));
        });
      }
      item.append('.');
      appendActivation(item, grant);
      return item;
    }
    case 'spellbook_acquisition': {
      const count = countField(grant, null);
      const list = stringField(grant, 'list');
      if (count === null || list === null) return genericGrant(grant, 'spellbook acquisition');
      const agreement = spellAgreement(count);
      item.append(`Add ${String(count)} `, freeTextSpan(list), ` ${agreement.noun} of ${levelPhrase(
        numberField(grant, 'level_min'),
        numberField(grant, 'level_max'),
      )} to the spellbook.`);
      appendActivation(item, grant);
      return item;
    }
    case 'fighting_style': {
      const style = stringField(grant, 'style_key');
      item.append('Gain the ');
      if (style === null) item.append('configured fighting style');
      else item.append(freeTextSpan(style.replaceAll('_', ' ')), ' fighting style');
      item.append('.');
      appendActivation(item, grant);
      return item;
    }
    case 'weapon_mastery': {
      const count = countField(grant, null);
      if (count === null) return genericGrant(grant, 'weapon mastery choice');
      item.append(`Choose ${String(count)} weapon ${count === 1 ? 'mastery' : 'masteries'} from the configured weapon pool.`);
      appendActivation(item, grant);
      return item;
    }
    case 'skill_proficiency': {
      const count = countField(grant, null);
      if (count === null) return genericGrant(grant, 'skill proficiency choice');
      const configuredSkills = stringListField(grant, 'skills');
      item.append(`Choose ${String(count)} skill ${count === 1 ? 'proficiency' : 'proficiencies'}`);
      if (configuredSkills.length > 0) {
        item.append(' from ');
        configuredSkills.forEach((skill, index) => {
          if (index > 0) item.append(index === configuredSkills.length - 1 ? ' or ' : ', ');
          item.append(isEnumValue(skills, skill) ? SKILL_LABELS[skill] : freeTextSpan(skill));
        });
      }
      if (grant.allows_tool_instead === true) item.append('; a tool proficiency may be chosen instead');
      item.append('.');
      appendActivation(item, grant);
      return item;
    }
  }
  const unhandled: never = grant.kind;
  return genericGrant(grant, String(unhandled));
}

function scopeLabel(scope: ExtraAttackWeaponScope): string {
  switch (scope) {
    case 'any_weapon':
      return 'any weapon';
    case 'one_bonded_weapon':
      return 'one bonded weapon';
  }
}

function appendUnresolvedScope(target: HTMLElement, scope: ExtraAttackWeaponScope): void {
  if (scope === 'one_bonded_weapon') {
    target.append(
      ' This application cannot identify the bonded weapon, so it does not apply this number yet.',
    );
  }
}

/** Render every authorable effect kind without exposing its storage payload. */
export function renderPublishPreviewEffect(
  effect: AuthoringCharacterEffect | AuthoringFeatureEffect,
): HTMLLIElement {
  const item = element('li');
  item.append(freeTextSpan(effect.label), ': ');
  const appendMechanic = (): void => {
    switch (effect.kind) {
      case 'damage_resistance':
        item.append('Resistance to ', freeTextSpan(effect.damage_type), ' damage.');
        return;
      case 'hp_modifier': {
        const facts: string[] = [];
        if (effect.hit_points_flat !== null) facts.push(`${signed(effect.hit_points_flat)} Hit Points`);
        if (effect.hit_points_per_level !== null) facts.push(`${signed(effect.hit_points_per_level)} Hit Points per character level`);
        item.append(facts.length === 0 ? 'Configured Hit Point modifier.' : `${facts.join(' and ')}.`);
        return;
      }
      case 'speed':
        item.append(`${signed(effect.speed_bonus_feet)} feet to walking speed.`);
        return;
      case 'ability_increase':
        item.append(`${signed(effect.amount)} ${abilityLabel(effect.ability)}, to a maximum score of ${String(effect.maximum)}.`);
        return;
      case 'ability_override':
        item.append(`${abilityLabel(effect.ability)} becomes at least ${String(effect.maximum)}.`);
        return;
      case 'armor_class_bonus':
        item.append(`${signed(effect.amount)} Armor Class.`);
        return;
      case 'armor_class_formula':
        item.append(
          `Armor Class ${String(effect.base)} + ${abilityLabel(effect.ability_1)} modifier`,
          effect.ability_2 === null ? '' : ` + ${abilityLabel(effect.ability_2)} modifier`,
          effect.allows_shield ? '; shields are allowed.' : '; shields are not allowed.',
        );
        return;
      case 'attack_ability_override':
        item.append(`Use ${abilityLabel(effect.ability)} for attacks with ${scopeLabel(effect.weapon_scope)}.`);
        appendUnresolvedScope(item, effect.weapon_scope);
        return;
      case 'weapon_attack_bonus':
        item.append(`${signed(effect.amount)} to attack rolls with ${scopeLabel(effect.weapon_scope)}.`);
        appendUnresolvedScope(item, effect.weapon_scope);
        return;
      case 'weapon_damage_bonus':
        item.append(`${signed(effect.amount)} to damage rolls with ${scopeLabel(effect.weapon_scope)}.`);
        appendUnresolvedScope(item, effect.weapon_scope);
        return;
      case 'extra_attack':
        item.append(`Make ${String(effect.attack_count)} attacks with ${scopeLabel(effect.weapon_scope)} when taking the Attack action.`);
        appendUnresolvedScope(item, effect.weapon_scope);
        return;
    }
    const unhandled: never = effect;
    return unhandled;
  };
  appendMechanic();
  if (effect.notes !== null) item.append(' Notes: ', freeTextSpan(effect.notes));
  return item;
}
