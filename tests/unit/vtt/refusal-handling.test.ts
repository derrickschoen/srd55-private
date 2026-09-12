import { describe, expect, expectTypeOf, it } from 'vitest';
import { createEncounter, reduceEncounter, REACTION_KINDS, type EncounterState } from '../../../src/combat/encounter';
import type { NonBoundaryRefusalClass } from '../../../src/combat/encounter-rule-error';
import type { EncounterCommand } from '../../../src/combat/events';
import { mulberry32 } from '../../../src/combat/random';
import { damageType, dieSides } from '../../../src/combat/values';
import { DmEncounterHost, type DmEncounterHostSnapshot } from '../../../src/vtt/dm-encounter-host';
import type { PartySessionState } from '../../../src/vtt/party-session-state';
import {
  DEFAULT_REFUSAL_HANDLING_SETTINGS,
  REFUSAL_CATEGORIES,
  REFUSAL_CLASS_CATEGORIES,
  handlingModesForCategory,
  routeActionRefusal,
  type NonBoundaryActionRefusal,
  type RefusalCategory,
  type RefusalHandlingSettings,
} from '../../../src/vtt/refusal-handling';
import {
  REFERENCE_FIGHTER_ID,
  REFERENCE_MONSTER_ID,
  REFERENCE_PLAYER_IDS,
  referenceEncounterSetup,
} from '../../../src/vtt/reference-encounter';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';

function party(settings: RefusalHandlingSettings = DEFAULT_REFUSAL_HANDLING_SETTINGS): PartySessionState {
  const hitPoints = [67, 52, 38] as const;
  return {
    schemaVersion: 1,
    rulesEdition: '2024',
    room: 1,
    adventuringDayStatus: 'active',
    characters: REFERENCE_PLAYER_IDS.map((combatantId, index) => ({
      characterId: index + 1,
      combatantId,
      currentHitPoints: hitPoints[index] ?? 1,
      hitPointMaximum: hitPoints[index] ?? 1,
      exhaustionLevel: 0,
      constitutionModifier: 0,
      life: 'living' as const,
      deathSaves: null,
      spellSlots: [],
      limitedResources: [],
      hitDice: [{ sides: 8 as const, maximum: 1, remaining: 1 }],
      consumables: [],
      aid: null,
      equipment: null,
    })),
    reactionPolicies: REFERENCE_PLAYER_IDS.flatMap((combatant) =>
      REACTION_KINDS.map((reactionKind) => ({ combatant, reactionKind, policy: 'ask' as const }))),
    refusalHandling: settings,
  };
}

function refusal(category: RefusalCategory): NonBoundaryActionRefusal {
  const refusalClass: NonBoundaryRefusalClass = category;
  return {
    refusalClass,
    category,
    reason: `${category} fixture refusal`,
    citation: `engine:${refusalClass}`,
    command: { type: 'end_turn', actor: REFERENCE_FIGHTER_ID },
    combatant: REFERENCE_FIGHTER_ID,
  };
}

function unknownSpell(): Extract<EncounterCommand, { readonly type: 'cast_spell' }> {
  return {
    type: 'cast_spell',
    actor: REFERENCE_FIGHTER_ID,
    spellId: 'missing-refusal-fixture-spell',
    slotLevel: null,
    castAsRitual: false,
    casterLevel: 1,
    attackBonus: 0,
    saveDc: 10,
    spellcastingModifier: 0,
    targets: [REFERENCE_MONSTER_ID],
    area: null,
    weaponAttack: null,
    selectedOption: null,
  };
}

async function submitOnlyAction(host: DmEncounterHost, action: EncounterCommand): Promise<void> {
  const offered = new Promise<NonNullable<DmEncounterHostSnapshot['dm']['pendingRequest']>>((resolve) => {
    let unsubscribe = (): void => {};
    unsubscribe = host.subscribe((snapshot) => {
      const request = snapshot.dm.pendingRequest;
      if (request === null) return;
      unsubscribe();
      resolve(request);
    });
  });
  void host.start();
  const request = await offered;
  await host.submitHumanDecisionTransaction(request.actorId, {
    requestId: request.requestId,
    encounterRevision: request.encounterRevision,
    action,
  });
}

function initiativeState(): EncounterState {
  return reduceEncounter(createEncounter(referenceEncounterSetup()), { type: 'roll_initiative' }, mulberry32(9)).state;
}

describe('D377.10 refusal handling', () => {
  it('owner_ruled_defaults: every refusal category defaults to hard refusal with citation', () => {
    expect(DEFAULT_REFUSAL_HANDLING_SETTINGS).toEqual({
      rule_gap: 'refuse_with_citation',
      unmodeled_interaction: 'refuse_with_citation',
      validation: 'refuse_with_citation',
    });
  });

  it('unmapped_refusal_class_fails_to_compile: the class inventory maps exhaustively onto the closed categories', () => {
    expectTypeOf(REFUSAL_CLASS_CATEGORIES).toMatchTypeOf<Readonly<Record<NonBoundaryRefusalClass, RefusalCategory>>>();
    expect(Object.keys(REFUSAL_CLASS_CATEGORIES).length).toBe(9);
  });

  it.each(REFUSAL_CATEGORIES)('category_ignores_setting: %s routes to its selected hard-refusal and tray behaviors', (category) => {
    const hard = { ...DEFAULT_REFUSAL_HANDLING_SETTINGS, [category]: 'refuse_with_citation' } as RefusalHandlingSettings;
    const tray = { ...DEFAULT_REFUSAL_HANDLING_SETTINGS, [category]: 'tray_fiat_prompt' } as RefusalHandlingSettings;
    expect(routeActionRefusal(hard, refusal(category)).kind).toBe('hard_refusal');
    expect(routeActionRefusal(tray, refusal(category)).kind).toBe('fiat_prompt');
  });

  it('validation exposes no default_and_log capability while both defaultable categories route typed defaults', () => {
    expect(handlingModesForCategory('validation')).toEqual(['tray_fiat_prompt', 'refuse_with_citation']);
    for (const category of ['rule_gap', 'unmodeled_interaction'] as const) {
      const settings = { ...DEFAULT_REFUSAL_HANDLING_SETTINGS, [category]: 'default_and_log' };
      expect(routeActionRefusal(settings, refusal(category))).toEqual(expect.objectContaining({
        kind: 'documented_default', outcome: { kind: 'no_effect' },
      }));
    }
  });

  it('tray prompt resolution produces a DM-override ruling card and unblocks the prompt', async () => {
    const action = unknownSpell();
    const host = new DmEncounterHost('session:refusal-tray', new MemoryBrowserSessionStore(), {
      initialState: initiativeState(),
      initialPartyState: party({ ...DEFAULT_REFUSAL_HANDLING_SETTINGS, rule_gap: 'tray_fiat_prompt' }),
      turnLegalActions: () => ({ actions: [action] }),
    });
    try {
      await submitOnlyAction(host, action);
      const entry = host.snapshot().dm.decisionTray.entries.find(
        (candidate) => candidate.kind === 'pending' && candidate.decision.kind === 'adjudication_prompt',
      );
      if (entry?.kind !== 'pending' || entry.decision.kind !== 'adjudication_prompt') {
        throw new Error('Expected an adjudication prompt.');
      }
      host.resolveRefusalPrompt(entry.decision.id, { kind: 'no_effect' }, 'The DM rules that nothing changes.');
      const after = host.snapshot();
      expect(after.dm.decisionTray.entries.some(
        (candidate) => candidate.kind === 'pending' && candidate.decision.kind === 'adjudication_prompt',
      )).toBe(false);
      expect(after.dm.encounter.recentEvents.at(-1)).toEqual(expect.objectContaining({
        type: 'adjudicated',
        subject: 'dm-override:refusal:rule_gap',
        consequence: { kind: 'no_effect' },
      }));
    } finally {
      host.close();
    }
  });

  it('untouched_settings_hard_refuse: a rule gap keeps its citation out of the tray', async () => {
    const action = unknownSpell();
    const host = new DmEncounterHost('session:refusal-untouched-defaults', new MemoryBrowserSessionStore(), {
      initialState: initiativeState(),
      initialPartyState: party(),
      turnLegalActions: () => ({ actions: [action] }),
    });
    try {
      await submitOnlyAction(host, action);
      const after = host.snapshot();
      expect(after.dm.decisionTray.actionRefusal).toEqual(expect.objectContaining({
        category: 'rule_gap',
        citation: 'engine:rule_gap',
      }));
      expect(after.dm.decisionTray.entries.some(
        (candidate) => candidate.kind === 'pending' && candidate.decision.kind === 'adjudication_prompt',
      )).toBe(false);
    } finally {
      host.close();
    }
  });

  it('default_unlogged: default_and_log emits the visible assumed-X ruling entry', async () => {
    const action = unknownSpell();
    const host = new DmEncounterHost('session:refusal-default', new MemoryBrowserSessionStore(), {
      initialState: initiativeState(),
      initialPartyState: party({ ...DEFAULT_REFUSAL_HANDLING_SETTINGS, rule_gap: 'default_and_log' }),
      turnLegalActions: () => ({ actions: [action] }),
    });
    try {
      await submitOnlyAction(host, action);
      expect(host.snapshot().dm.encounter.recentEvents.at(-1)).toEqual(expect.objectContaining({
        type: 'adjudicated',
        reasoning: expect.stringContaining('Assumed the action has no mechanical effect'),
        consequence: { kind: 'no_effect' },
      }));
    } finally {
      host.close();
    }
  });

  it('setting_not_persisted: per-category settings survive host resume', async () => {
    const store = new MemoryBrowserSessionStore();
    const first = new DmEncounterHost('session:refusal-persist', store, { initialPartyState: party() });
    await first.setRefusalHandling('rule_gap', 'tray_fiat_prompt');
    await first.setRefusalHandling('unmodeled_interaction', 'default_and_log');
    first.close();
    const resumed = new DmEncounterHost('session:refusal-persist', store);
    expect(resumed.snapshot().dm.partySession?.state.refusalHandling).toEqual({
      rule_gap: 'tray_fiat_prompt',
      unmodeled_interaction: 'default_and_log',
      validation: 'refuse_with_citation',
    });
    resumed.close();
  });

  it('boundary_swallowed: a turn-boundary refusal remains outside category routing', async () => {
    const state = initiativeState();
    const blocked: EncounterState = {
      ...state,
      pendingDecisions: [{
        kind: 'reaction_offer',
        id: 'boundary-fixture',
        combatant: REFERENCE_MONSTER_ID,
        boundary: { activeCombatant: REFERENCE_FIGHTER_ID, round: state.round },
        reactionKind: 'opportunity_attack',
        options: [{ id: 'accept', label: 'Accept' }, { id: 'decline', label: 'Decline' }],
        opportunityAttack: {
          mover: REFERENCE_FIGHTER_ID,
          from: { column: 2, row: 3 },
          to: { column: 2, row: 4 },
          command: {
            type: 'opportunity_attack',
            actor: REFERENCE_MONSTER_ID,
            target: REFERENCE_FIGHTER_ID,
            attackBonus: 0,
            criticalFloor: 20,
            rollMode: 'normal',
            attackerCanSeeTarget: true,
            targetCanSeeAttacker: true,
            damage: {
              terms: [{
                type: damageType('Bludgeoning'),
                dice: { count: 0, sides: dieSides(4), modifier: 1 },
              }],
              critical: false,
              responses: [],
            },
          },
        },
      }],
    };
    const action = { type: 'end_turn', actor: REFERENCE_FIGHTER_ID } as const;
    const allTray = {
      rule_gap: 'tray_fiat_prompt',
      unmodeled_interaction: 'tray_fiat_prompt',
      validation: 'tray_fiat_prompt',
    } as const;
    const host = new DmEncounterHost('session:refusal-boundary', new MemoryBrowserSessionStore(), {
      initialState: blocked,
      initialPartyState: party(allTray),
      turnLegalActions: () => ({ actions: [action] }),
    });
    try {
      await submitOnlyAction(host, action);
      expect(host.snapshot().dm.decisionTray.boundaryRefusal?.code).toBe('turn_boundary_blocked');
      expect(host.snapshot().dm.decisionTray.entries.some(
        (candidate) => candidate.kind === 'pending' && candidate.decision.kind === 'adjudication_prompt',
      )).toBe(false);
    } finally {
      host.close();
    }
  });
});
