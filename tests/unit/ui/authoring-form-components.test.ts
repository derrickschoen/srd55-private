import { describe, expect, it } from 'vitest';
import type { AuthoringValidationIssue } from '../../../src/authoring/contracts';
import type {
  AuthorableEffectKind,
  AuthoringDraftCharacterEffect,
  AuthoringDraftFeatureEffect,
} from '../../../src/authoring/effect-forms';
import type { HomebrewDraftItemUuid, HomebrewDraftUuid } from '../../../src/authoring/ids';
import type { DraftRevision } from '../../../src/authoring/contracts';
import { RpcError } from '../../../src/rpc/protocol';
import { damageType } from '../../../src/domain/enums';
import {
  authoringPathKey,
  createEffectCard,
  createOrderedCardControls,
  effectPreview,
  installDraftBeforeUnloadGuard,
  installDraftNavigationGuard,
  renderValidationSummary,
  type AuthoringEffectDraft,
} from '../../../src/ui/authoring/form-components';
import {
  createDraftConflictDialog,
  draftRevisionConflict,
} from '../../../src/ui/authoring/draft-conflict-dialog';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
} from '../../fixtures/interactive-dom';
import { Router } from '../../../src/ui/router';

function uuid(value: string): HomebrewDraftItemUuid {
  return value as HomebrewDraftItemUuid;
}

const EFFECTS = {
  damage_resistance: {
    kind: 'damage_resistance', draft_item_uuid: uuid('effect-resistance'),
    label: 'Void ward', notes: null, damage_type: damageType('Void'),
  },
  hp_modifier: {
    kind: 'hp_modifier', draft_item_uuid: uuid('effect-hp'),
    label: 'Sturdy', notes: null, hit_points_flat: 2, hit_points_per_level: null,
  },
  speed: {
    kind: 'speed', draft_item_uuid: uuid('effect-speed'),
    label: 'Quick', notes: null, speed_bonus_feet: 5,
  },
  ability_increase: {
    kind: 'ability_increase', draft_item_uuid: uuid('effect-increase'),
    label: 'Mighty', notes: null, ability: 'strength', amount: 2, maximum: 20,
  },
  ability_override: {
    kind: 'ability_override', draft_item_uuid: uuid('effect-override'),
    label: 'Giant strength', notes: null, ability: 'strength', maximum: 23,
  },
  armor_class_bonus: {
    kind: 'armor_class_bonus', draft_item_uuid: uuid('effect-ac-bonus'),
    label: 'Guarded', notes: null, amount: 1,
  },
  armor_class_formula: {
    kind: 'armor_class_formula', draft_item_uuid: uuid('effect-ac-formula'),
    label: 'Natural armor', notes: null, base: 13, ability_1: 'dexterity',
    ability_2: null, allows_shield: true,
  },
  attack_ability_override: {
    kind: 'attack_ability_override', draft_item_uuid: uuid('effect-attack-ability'),
    label: 'Bonded strikes', notes: null, ability: 'charisma',
    weapon_scope: 'one_bonded_weapon',
  },
  weapon_attack_bonus: {
    kind: 'weapon_attack_bonus', draft_item_uuid: uuid('effect-attack'),
    label: 'Accurate', notes: null, amount: 1, weapon_scope: 'any_weapon',
  },
  weapon_damage_bonus: {
    kind: 'weapon_damage_bonus', draft_item_uuid: uuid('effect-damage'),
    label: 'Forceful', notes: null, amount: 1, weapon_scope: 'any_weapon',
  },
  extra_attack: {
    kind: 'extra_attack', draft_item_uuid: uuid('effect-extra'),
    label: 'Extra Attack', notes: null, attack_count: 2,
    weapon_scope: 'any_weapon',
  },
} as const satisfies Readonly<Record<AuthorableEffectKind, AuthoringEffectDraft>>;

function noEffectActions() {
  return {
    onKindChange: () => undefined,
    onCommonChange: () => undefined,
    onFieldChange: () => undefined,
    onMoveUp: () => undefined,
    onMoveDown: () => undefined,
    onRemove: () => undefined,
  };
}

function keydown(key: string, shiftKey = false): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true }) as KeyboardEvent;
  Object.defineProperties(event, {
    key: { value: key },
    shiftKey: { value: shiftKey },
  });
  return event;
}

function routerHarness(initialUrl: string): {
  readonly windowObject: Window;
  readonly popTo: (target: string) => void;
} {
  const events = new EventTarget();
  const location = {
    href: initialUrl,
    origin: new URL(initialUrl).origin,
  };
  let state: unknown = null;
  const moveTo = (target: string | URL): void => {
    location.href = new URL(String(target), location.href).href;
  };
  const history = {
    get state(): unknown {
      return state;
    },
    pushState(nextState: unknown, _unused: string, target?: string | URL | null): void {
      state = nextState;
      if (target !== undefined && target !== null) moveTo(target);
    },
    replaceState(nextState: unknown, _unused: string, target?: string | URL | null): void {
      state = nextState;
      if (target !== undefined && target !== null) moveTo(target);
    },
  };
  return {
    windowObject: {
      location,
      history,
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
        events.addEventListener(type, listener),
      removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) =>
        events.removeEventListener(type, listener),
    } as unknown as Window,
    popTo: (target) => {
      moveTo(target);
      events.dispatchEvent(new Event('popstate'));
    },
  };
}

describe('HA-6 shared authoring form controls', () => {
  it('HA-EFFECT-EXHAUSTIVE renders a specific field set and preview for every domain effect kind', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const kinds = Object.keys(EFFECTS) as AuthorableEffectKind[];
      const cards = kinds.map((kind, index) => interactiveElement(createEffectCard({
        effect: EFFECTS[kind],
        position: index + 1,
        count: kinds.length,
        allowFeatureOnly: kind === 'extra_attack',
        ...noEffectActions(),
      })));

      expect(cards).toHaveLength(11);
      expect(cards.map((card) => card.getAttribute('data-draft-item-uuid')))
        .toEqual(kinds.map((kind) => EFFECTS[kind].draft_item_uuid));
      for (const [index, card] of cards.entries()) {
        expect(card.getAttribute('aria-label')).toContain(
          `Effect ${String(index + 1)} of 11`,
        );
        const preview = card.querySelector('[aria-label="Effect preview"]');
        expect(preview).not.toBeNull();
        expect(
          preview?.querySelector('[data-free-text="unverified-origin"]')?.textContent,
        ).toBe(effectPreview(EFFECTS[kinds[index]!]!));
        expect(effectPreview(EFFECTS[kinds[index]!]!)).not.toContain('undefined');
        expect(elementText(card as unknown as Node)).not.toContain('Other');
        expect(elementText(card as unknown as Node)).not.toContain('Numeric bonus');
      }
      expect(elementText(cards[0] as unknown as Node)).toContain('Damage type');
      expect(elementText(cards[1] as unknown as Node)).toContain('Flat hit points');
      expect(elementText(cards[6] as unknown as Node)).toContain('Allows a shield');
      expect(elementText(cards[10] as unknown as Node)).toContain('Total attacks');
      expect(elementText(cards[7] as unknown as Node)).toContain(
        'Not applied to sheet numbers until the character has a bonded weapon.',
      );
      const knownCustom = cards[0]?.querySelectorAll('input').find(
        (input) => input.getAttribute('list') !== null,
      );
      expect(knownCustom?.getAttribute('type')).toBe('text');
    } finally {
      restoreDocument();
    }
  });

  it('keeps hostile names and descriptions visible, marked, and inert across every requested string class', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const hostile = '</legend><img data-hostile-authoring src=x> "quoted" 🐉 \u202eRTL\u202c nul\u0000\u0001tail';
      const effect: AuthoringDraftCharacterEffect = {
        ...EFFECTS.damage_resistance,
        label: hostile,
        notes: hostile,
      };
      const card = interactiveElement(createEffectCard({
        effect,
        position: 1,
        count: 1,
        allowFeatureOnly: false,
        ...noEffectActions(),
      }));

      expect(elementText(card as unknown as Node)).toContain(hostile);
      expect(card.querySelectorAll('img')).toHaveLength(0);
      expect(card.querySelectorAll('script')).toHaveLength(0);
      expect(card.querySelectorAll('[data-hostile-authoring]')).toHaveLength(0);
      const marked = card.querySelectorAll('[data-free-text="unverified-origin"]');
      expect(marked.map((node) => node.textContent)).toEqual([
        effectPreview(effect),
        hostile,
      ]);
      expect(card.innerHTML).toBe('');
    } finally {
      restoreDocument();
    }
  });

  it('moves ordered cards only through labelled keyboard-reachable buttons and disables boundaries', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const calls: string[] = [];
      const controls = interactiveElement(createOrderedCardControls({
        accessibleName: 'Aegis', position: 1, count: 2,
        onMoveUp: () => calls.push('up'),
        onMoveDown: () => calls.push('down'),
        onRemove: () => calls.push('remove'),
      }));
      const buttons = controls.querySelectorAll('button');
      expect(buttons.map((button) => button.getAttribute('aria-label'))).toEqual([
        'Move up Aegis, item 1 of 2',
        'Move down Aegis, item 1 of 2',
        'Remove Aegis, item 1 of 2',
      ]);
      expect(buttons[0]?.disabled).toBe(true);
      expect(buttons[1]?.disabled).toBe(false);
      buttons[0]?.click();
      buttons[1]?.click();
      buttons[2]?.click();
      expect(calls).toEqual(['down', 'remove']);
    } finally {
      restoreDocument();
    }
  });

  it('focuses the first invalid labelled field and reports every validation path together', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const form = document.createElement('form');
      const name = document.createElement('input');
      name.dataset.authoringPath = authoringPathKey(['name']);
      const second = document.createElement('input');
      second.dataset.authoringPath = authoringPathKey(['traits', 0, 'name']);
      form.append(name, second);
      const issues: readonly AuthoringValidationIssue[] = [
        { path: ['name'], code: 'required', message: 'Name is required.' },
        { path: ['traits', 0, 'name'], code: 'required', message: 'Trait name is required.' },
        { path: ['effects', 0], code: 'invalid_value', message: 'Effect is incomplete.' },
      ];
      const summary = interactiveElement(renderValidationSummary(form, issues));

      expect(document.activeElement).toBe(name);
      expect(name.getAttribute('aria-invalid')).toBe('true');
      expect(second.getAttribute('aria-invalid')).toBe('true');
      expect(elementText(summary as unknown as Node)).toContain('Name is required.');
      expect(elementText(summary as unknown as Node)).toContain('Trait name is required.');
      expect(elementText(summary as unknown as Node)).toContain('Effect is incomplete.');
      summary.querySelectorAll('a')[1]?.click();
      expect(document.activeElement).toBe(second);
    } finally {
      restoreDocument();
    }
  });

  it('dirty draft guard blocks router.navigate and popstate, keeps the refused route, and allows clean navigation', () => {
    const harness = routerHarness('https://example.test/');
    const router = new Router(harness.windowObject);
    const visited: string[] = [];
    let dirty = true;
    let allow = false;
    router.start();
    const removeGuard = installDraftNavigationGuard(router, {
      isDirty: () => dirty,
      confirmLeave: () => allow,
    });
    const unsubscribe = router.subscribe((route) => visited.push(route.path));

    expect(router.navigate('/homebrew')).toBe(false);
    expect(router.current.path).toBe('/');
    expect(visited).toEqual([]);

    harness.popTo('/characters/7');
    expect(router.current.path).toBe('/');
    expect(visited).toEqual([]);

    dirty = false;
    expect(router.navigate('/homebrew')).toBe(true);
    expect(router.current.path).toBe('/homebrew');
    expect(visited).toEqual(['/homebrew']);

    dirty = true;
    harness.popTo('/');
    expect(router.current.path).toBe('/homebrew');
    expect(visited).toEqual(['/homebrew']);

    dirty = false;
    harness.popTo('/');
    expect(router.current.path).toBe('/');
    expect(visited).toEqual(['/homebrew', '/']);

    unsubscribe();
    removeGuard();
    router.stop();
  });

  it('warns on browser unload only while the draft has unsaved local changes', () => {
    const target = new EventTarget();
    let dirty = true;
    const cleanup = installDraftBeforeUnloadGuard(
      target as unknown as Window,
      () => dirty,
    );
    const blocked = new Event('beforeunload', { cancelable: true });
    target.dispatchEvent(blocked);
    expect(blocked.defaultPrevented).toBe(true);
    dirty = false;
    const clean = new Event('beforeunload', { cancelable: true });
    target.dispatchEvent(clean);
    expect(clean.defaultPrevented).toBe(false);
    cleanup();
  });
});

describe('HA-6 stale draft conflict dialog', () => {
  it('attaches before showModal, recognizes revision-CAS errors, and traps/restores focus', async () => {
    const conflict = draftRevisionConflict(new RpcError(
      'handler_error',
      'Draft revision is stale.',
      {
        reason: 'stale_draft_revision',
        draft_uuid: 'draft-conflict',
        expected_revision: 3,
        actual_revision: 4,
      },
    ));
    expect(conflict).toEqual({
      draft_uuid: 'draft-conflict', expected_revision: 3, actual_revision: 4,
    });
    if (conflict === null) throw new Error('Conflict was not recognized.');

    const restoreDocument = installInteractiveDocument();
    try {
      const invoker = document.createElement('button');
      document.body.append(invoker);
      invoker.focus();
      const choices: string[] = [];
      const rendered = createDraftConflictDialog({
        conflict,
        mount: document.body,
        restoreFocus: () => invoker.focus(),
        onLoadSaved: () => { choices.push('load'); },
        onKeepLocal: () => { choices.push('keep'); },
      });
      const dialog = interactiveElement(rendered.element);
      const buttons = dialog.querySelectorAll('button');

      expect(dialog.getAttribute('aria-modal')).toBe('true');
      expect(dialog.isConnected).toBe(true);
      expect(dialog.getAttribute('aria-labelledby')).toBe('authoring-conflict-heading');
      expect(elementText(dialog as unknown as Node)).toContain(
        'revision 3, but revision 4 is now saved. Nothing was overwritten.',
      );
      expect(elementText(dialog as unknown as Node)).not.toContain('Overwrite');
      expect(document.activeElement).toBe(buttons[0]);
      dialog.dispatchEvent(keydown('Tab', true));
      expect(document.activeElement).toBe(buttons[1]);
      dialog.dispatchEvent(keydown('Tab'));
      expect(document.activeElement).toBe(buttons[0]);
      dialog.dispatchEvent(keydown('Escape'));
      await rendered.whenSettled();
      expect(choices).toEqual(['keep']);
      expect(document.activeElement).toBe(invoker);
      rendered.cleanup();
    } finally {
      restoreDocument();
    }
  });

  it('refuses malformed lookalike conflict data', () => {
    expect(draftRevisionConflict(new RpcError(
      'handler_error',
      'bad',
      { reason: 'stale_draft_revision', draft_uuid: 'draft', expected_revision: '3', actual_revision: 4 },
    ))).toBeNull();
    expect(draftRevisionConflict(new Error('Draft revision is stale.'))).toBeNull();
  });
});

// Compile-only witnesses keep both effect unions exercised by this test file.
const characterWitness: AuthoringDraftCharacterEffect = EFFECTS.ability_override;
const featureWitness: AuthoringDraftFeatureEffect = EFFECTS.extra_attack;
const draftUuidWitness = 'draft' as HomebrewDraftUuid;
const revisionWitness = 1 as DraftRevision;
void characterWitness;
void featureWitness;
void draftUuidWitness;
void revisionWitness;
