import type {
  AuthoringDraftGrant,
  SpellGrantAuthoringReference,
  SpellGrantAuthoringReferences,
} from '../../../authoring/contracts';
import type { ContentKey } from '../../../domain/ids';
import { catalogSelectGroups } from '../../catalog-control-disclosure';
import { element } from '../../dom';

type SpellDraftGrant = Exclude<AuthoringDraftGrant, { readonly kind: 'skill_proficiency' }>;

export interface SpellGrantControlsOptions {
  readonly grant: SpellDraftGrant;
  readonly prefix: string;
  pathAttribute(path: readonly (string | number)[]): Readonly<Record<string, string>>;
  readonly path: readonly (string | number)[];
  readonly references: SpellGrantAuthoringReferences;
  readonly peerRuleKeys: readonly string[];
  readonly ruleKeyScope: 'species' | 'subclass_level';
  change(field: string, value: unknown): void;
}

function slug(value: string): string {
  return value.normalize('NFKD').toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '') || 'spell';
}

function selectedSpell(
  grant: SpellDraftGrant,
  references: SpellGrantAuthoringReferences,
): SpellGrantAuthoringReference | undefined {
  if (grant.kind !== 'fixed_spell' || grant.spell_content_key === null) return undefined;
  return references.spells.find((spell) => spell.content_key === grant.spell_content_key);
}

function generatedBase(
  grant: SpellDraftGrant,
  references: SpellGrantAuthoringReferences,
): string {
  switch (grant.kind) {
    case 'fixed_spell': {
      const spell = selectedSpell(grant, references);
      return spell === undefined ? 'fixed-spell' : `fixed-${slug(spell.name)}`;
    }
    case 'choice_from_list':
      return grant.list === '' ? 'spell-list-choice' : `${slug(grant.list)}-spell-choice`;
    case 'choice_from_query':
      return 'spell-query-choice';
  }
}

function uniqueRuleKey(base: string, peerRuleKeys: readonly string[]): string {
  const occupied = new Set(peerRuleKeys);
  if (!occupied.has(base)) return base;
  let suffix = 2;
  while (occupied.has(`${base}-${String(suffix)}`)) suffix += 1;
  return `${base}-${String(suffix)}`;
}

function isGeneratedFrom(current: string, base: string): boolean {
  return current === base || new RegExp(`^${base.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}-\\d+$`, 'u')
    .test(current);
}

function labelledControl(label: string, id: string, control: HTMLElement): readonly HTMLElement[] {
  return [element('label', { text: label, attributes: { for: id } }), control];
}

/** Shared author-language identity and catalog controls for every spell grant form. */
export function spellGrantControls(options: SpellGrantControlsOptions): readonly HTMLElement[] {
  const { grant } = options;
  const originalBase = generatedBase(grant, options.references);
  if (grant.rule_key.trim() === '') {
    options.change('rule_key', uniqueRuleKey(originalBase, options.peerRuleKeys));
  }
  const ruleKey = element('input', {
    attributes: {
      id: `${options.prefix}-stable-label`,
      type: 'text',
      required: '',
      'aria-describedby': `${options.prefix}-stable-label-help`,
      ...options.pathAttribute([...options.path, 'rule_key']),
    },
  });
  ruleKey.value = grant.rule_key;
  ruleKey.addEventListener('input', () => options.change('rule_key', ruleKey.value));
  const scopeHelp = options.ruleKeyScope === 'subclass_level'
    ? 'Reuse it at another class level to continue one choice slot; use a new label for a new slot. Labels must be unique within one class level.'
    : 'Every grant for this species must use a different label.';
  const help = element('p', {
    className: 'muted authoring-field-help',
    text: `This label identifies the grant across published versions. A label is generated for you. ${scopeHelp}`,
    attributes: { id: `${options.prefix}-stable-label-help` },
  });
  const controls: HTMLElement[] = [
    ...labelledControl('Stable grant label', ruleKey.id, ruleKey),
    help,
  ];

  if (grant.kind === 'fixed_spell') {
    const spell = element('select', {
      attributes: {
        id: `${options.prefix}-spell`,
        required: '',
        ...options.pathAttribute([...options.path, 'spell_content_key']),
      },
    });
    spell.append(element('option', {
      text: 'Choose an installed spell',
      attributes: { value: '' },
    }));
    spell.append(...catalogSelectGroups(options.references.spells.map((entry) => ({
      value: entry.content_key,
      label: entry.name,
      catalogLayer: entry.catalog_layer,
      group: `${entry.level === 0 ? 'Cantrip' : `Level ${String(entry.level)}`} · ${entry.rules_edition}`,
    }))));
    if (
      grant.spell_content_key !== null &&
      !options.references.spells.some((entry) => entry.content_key === grant.spell_content_key)
    ) {
      spell.append(element('option', {
        text: 'Previously selected spell is not installed',
        attributes: { value: grant.spell_content_key },
      }));
    }
    spell.value = grant.spell_content_key ?? '';
    spell.addEventListener('change', () => {
      const previousBase = generatedBase(grant, options.references);
      const nextKey = spell.value === '' ? null : spell.value as ContentKey;
      options.change('spell_content_key', nextKey);
      if (isGeneratedFrom(ruleKey.value, previousBase)) {
        const next = { ...grant, spell_content_key: nextKey };
        const nextBase = generatedBase(next, options.references);
        const generated = uniqueRuleKey(nextBase, options.peerRuleKeys);
        ruleKey.value = generated;
        options.change('rule_key', generated);
      }
    });
    controls.push(...labelledControl('Spell', spell.id, spell));
  } else if (grant.kind === 'choice_from_list') {
    const list = element('select', {
      attributes: {
        id: `${options.prefix}-list`,
        required: '',
        ...options.pathAttribute([...options.path, 'list']),
      },
    });
    list.append(element('option', {
      text: 'Choose an installed spell list',
      attributes: { value: '' },
    }));
    for (const name of options.references.lists) {
      list.append(element('option', { text: name, attributes: { value: name } }));
    }
    if (grant.list !== '' && !options.references.lists.includes(grant.list)) {
      list.append(element('option', {
        text: 'Previously selected spell list is not installed',
        attributes: { value: grant.list },
      }));
    }
    list.value = grant.list;
    list.addEventListener('change', () => {
      const previousBase = generatedBase(grant, options.references);
      options.change('list', list.value);
      if (isGeneratedFrom(ruleKey.value, previousBase)) {
        const next = { ...grant, list: list.value };
        const generated = uniqueRuleKey(generatedBase(next, options.references), options.peerRuleKeys);
        ruleKey.value = generated;
        options.change('rule_key', generated);
      }
    });
    controls.push(...labelledControl('Spell list', list.id, list));
  }

  return controls;
}
