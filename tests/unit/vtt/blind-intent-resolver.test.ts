import { beforeAll, describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { readFileSync } from '../../helpers/test-filesystem';
import { z } from 'zod';
import { canonicalJson } from '../../../src/commands/canonical-json';
import type { EncounterState } from '../../../src/combat/encounter';
import type { GridCell } from '../../../src/combat/grid';
import { feetPoint, type AreaTemplate } from '../../../src/combat/templates';
import { feet, type CombatantId } from '../../../src/combat/values';
import { sha256 } from '../../../src/crypto/sha256';
import {
  BLIND_INTENT_REJECTION_CODES,
  BLIND_INTENT_VERSION,
  blindActionKinds,
  type BlindIntent,
  type BlindIntentRejectionCode,
  type BlindRoundIntentEnvelope,
} from '../../../src/vtt/blind-dm-contract';
import {
  resolveBlindRoundIntents,
  type BlindResolverDependencies,
  type BlindResolutionResult,
} from '../../../src/vtt/blind-intent-resolver';
import {
  projectEngineBlindTurn,
  type EngineBlindTurnProjection,
} from '../../../src/vtt/blind-turn-context';
import type { EngineStateCapsule } from '../../../src/vtt/engine-state-capsule';
import {
  createEngineMcpRuntime,
  freshMonsterPlanningState,
  loadArenaFixture,
} from '../../../src/vtt/mcp/entrypoint';
import {
  engineActionId,
  engineOptionId,
  engineSpellId,
  type EngineActionSlotUse,
  type EngineOfferableOption,
  type EngineProposalResolution,
  type EngineTurnProposal,
  type ResolvedActionSlotUse,
  type ResolvedTurnMechanics,
} from '../../../src/vtt/turn-proposal';
import { EngineRoundSession } from '../../../src/vtt/engine-round-session';
import { mulberry32 } from '../../../src/combat/random';
import {
  availableEngineActorOptions,
  createPureTurnProposalResolver,
} from '../../../src/vtt/intent-resolver';
import { engineSchemaInternals } from '../../../src/vtt/mcp/schemas';
import {
  buildOfferEnvironment,
  type EngineOptionEnvironment,
} from '../../../src/vtt/offers/build-offer-environment';
import { ENGINE_OFFER_FAMILY_POLICY_FORMAT } from '../../../src/vtt/offers/offer-codec-primitives';
import { createEngineOfferFamilyPolicy } from '../../../src/vtt/offers/offer-environment';
import { createUnrepresentedPartyThreatCatalog } from '../../../src/vtt/offers/party-threat-catalog';

const FIXTURE = 'tests/fixtures/arena-basis/seed-3943001.json';
const OFFER_ENVIRONMENT = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const POLICY_OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'revision_bound',
  familyPolicy: createEngineOfferFamilyPolicy({
    format: ENGINE_OFFER_FAMILY_POLICY_FORMAT,
    helpAttack: 'enabled',
    readyAttack: 'disabled',
    unarmedControl: 'disabled',
    reposition: 'disabled',
  }),
  partyThreatCatalog: createUnrepresentedPartyThreatCatalog(),
});

interface Subject {
  readonly state: EncounterState;
  readonly capsule: EngineStateCapsule;
  readonly projection: EngineBlindTurnProjection;
  readonly actorId: CombatantId;
  readonly actor: { readonly name: string; readonly badge: number };
  readonly current: GridCell;
}

let subject: Subject;

beforeAll(async () => {
  const state = freshMonsterPlanningState(await loadArenaFixture(FIXTURE));
  const first = state.combatants.find((entry) => entry.profile.kind === 'monster' && entry.life === 'living');
  if (first === undefined) throw new Error('Blind resolver fixture has no monster.');
  const runtime = createEngineMcpRuntime(state, {
    dmMode: 'blind', toolProfile: 'blind', requestedActorIds: [first.profile.id],
    offerEnvironment: OFFER_ENVIRONMENT,
  });
  const capsule = runtime.feed.current();
  const projection = projectEngineBlindTurn(state, capsule, OFFER_ENVIRONMENT.queries);
  const display = projection.displays.find((entry) => entry.id === first.profile.id);
  const current = OFFER_ENVIRONMENT.queries.tokenPosition(state, first.profile.id);
  if (display === undefined || current === null) throw new Error('Blind resolver actor is not displayed.');
  subject = {
    state,
    capsule,
    projection,
    actorId: first.profile.id,
    actor: { name: display.name, badge: display.badge },
    current,
  };
});

function envelope(intent: BlindIntent): BlindRoundIntentEnvelope {
  return { intent_version: BLIND_INTENT_VERSION, intents: [intent] };
}

function baseIntent(action: BlindIntent['action'] = { kind: 'dodge' }): BlindIntent {
  return { actor: subject.actor, action, reason: 'Hold the line.' };
}

interface SyntheticCandidate {
  readonly option: EngineOfferableOption;
  readonly mechanics: ResolvedTurnMechanics;
}

function candidate(input: {
  readonly id: string;
  readonly use?: EngineActionSlotUse['use'];
  readonly resolved?: ResolvedActionSlotUse;
  readonly final?: GridCell;
  readonly path?: readonly GridCell[];
  readonly activationChoice?: EngineOfferableOption['activationChoice'];
}): SyntheticCandidate {
  const use = input.use ?? { kind: 'dodge' as const };
  const resolved = input.resolved ?? {
    slot: 'main' as const,
    kind: 'dodge' as const,
    actionId: engineActionId('dodge'),
    spellId: null,
    targetIds: [],
    objectId: null,
    omittedRiders: [],
  };
  const final = input.final ?? subject.current;
  const path = input.path ?? [];
  const option: EngineOfferableOption = {
    optionId: engineOptionId(input.id),
    actorId: subject.actorId,
    revision: subject.capsule.revision,
    label: 'Private synthetic catalog entry',
    movement: {
      preference: {
        willingness: path.length === 0 ? 'none' : 'freely',
        opportunityRisk: 'avoid',
      },
      engagement: { stance: path.length === 0 ? 'hold_position' : 'withdraw' },
    },
    actionSlots: [{ slot: resolved.slot, use } as EngineActionSlotUse],
    resourceCostLabels: [],
    omittedRiders: [],
    ...(input.activationChoice === undefined ? {} : { activationChoice: input.activationChoice }),
  };
  return {
    option,
    mechanics: {
      actorId: subject.actorId,
      optionId: option.optionId,
      movementCostFeet: path.length * 5,
      path,
      finalPosition: final,
      actionSlots: [resolved],
      omittedRiders: [],
    },
  };
}

function dependencies(
  catalog: readonly SyntheticCandidate[],
  resolveFailure = false,
): BlindResolverDependencies {
  const byId = new Map(catalog.map((entry) => [entry.option.optionId, entry] as const));
  return {
    availableOptions: () => catalog.map((entry) => entry.option),
    resolveOption: (_state, option) => {
      const entry = byId.get(option.optionId);
      return resolveFailure || entry === undefined
        ? { valid: false, code: 'SYNTHETIC_FAILURE', summary: 'Synthetic resolution failure.' }
        : { valid: true, mechanics: entry.mechanics };
    },
    proposalResolver: {
      resolve(_state: EncounterState, proposal: EngineTurnProposal): EngineProposalResolution {
        const entry = byId.get(proposal.primaryOptionId);
        if (entry === undefined) {
          return {
            valid: false, selectedBranch: 'none',
            refusals: [{ branch: 'primary', code: 'OPTION_NOT_OFFERED', summary: 'Not offered.' }],
          };
        }
        return {
          valid: true,
          selectedBranch: 'primary',
          resolutionDigest: sha256(canonicalJson(entry.mechanics)),
          summary: 'Authoritative synthetic resolution.',
          refusals: [],
          mechanics: entry.mechanics,
          option: entry.option,
          primaryOption: entry.option,
          fallbackOption: null,
        };
      },
    },
  };
}

function resolve(
  intent: BlindIntent,
  catalog: readonly SyntheticCandidate[],
  input: {
    readonly projection?: EngineBlindTurnProjection;
    readonly resolverDependencies?: BlindResolverDependencies;
    readonly repairArm?: 'code_only' | 'minimal_legal_alternative';
  } = {},
): BlindResolutionResult {
  return resolveBlindRoundIntents({
    state: subject.state,
    capsule: subject.capsule,
    blindProjection: input.projection ?? subject.projection,
    envelope: envelope(intent),
    attempt: 1,
    repairArm: input.repairArm ?? 'code_only',
    dependencies: input.resolverDependencies ?? dependencies(catalog),
    offerEnvironment: OFFER_ENVIRONMENT,
  });
}

function expectCode(result: BlindResolutionResult, code: BlindIntentRejectionCode): void {
  expect(result.status, JSON.stringify(result)).toBe('rejected');
  if (result.status === 'accepted') throw new Error(`Expected ${code}, received acceptance.`);
  expect(result.codes).toContain(code);
}

function targetDisplay(index = 0): { readonly id: string; readonly name: string; readonly badge: number } {
  const monsters = new Set(subject.capsule.request?.actors.map(String) ?? []);
  const displays = subject.projection.displays.filter((entry) => !monsters.has(entry.id));
  const selected = displays[index];
  if (selected === undefined) throw new Error('Blind resolver fixture omitted a target display.');
  return selected;
}

function attackCandidate(targets: readonly string[], id = 'option:synthetic:attack'): SyntheticCandidate {
  const targetIds = targets.map((target) => target as ResolvedActionSlotUse['targetIds'][number]);
  return candidate({
    id,
    use: {
      kind: 'attack', actionId: engineActionId('synthetic-strike'),
      target: { kind: 'combatant', combatantId: targetIds[0] ?? subject.actorId },
    },
    resolved: {
      slot: 'main', kind: 'attack', actionId: engineActionId('synthetic-strike'), spellId: null,
      targetIds, objectId: null, omittedRiders: [],
    },
  });
}

function areaCandidate(
  id: string,
  area: AreaTemplate,
): SyntheticCandidate {
  return candidate({
    id,
    use: {
      kind: 'cast_spell', sourceActionId: engineActionId('synthetic-casting'),
      spellId: engineSpellId('entangle'), targets: [], area,
    },
    resolved: {
      slot: 'main', kind: 'cast_spell', actionId: engineActionId('synthetic-casting'),
      spellId: engineSpellId('entangle'), targetIds: [], objectId: null, omittedRiders: [], area,
    },
  });
}

describe('D569 deterministic blind intent resolver', () => {
  it('resolves the real public option catalog through the explicit environment', () => {
    const result = resolveBlindRoundIntents({
      state: subject.state,
      capsule: subject.capsule,
      blindProjection: subject.projection,
      envelope: envelope(baseIntent({ kind: 'dodge' })),
      attempt: 1,
      repairArm: 'code_only',
      offerEnvironment: OFFER_ENVIRONMENT,
    });

    expect(result.status).toBe('accepted');
    if (result.status === 'rejected') throw new Error('The real environment-bound Dodge was refused.');
    expect(result.actors).toHaveLength(1);
    expect(result.actors[0]?.resolution.mechanics.actionSlots).toContainEqual(
      expect.objectContaining({ kind: 'dodge' }),
    );
  });

  it('keeps blind option provenance on the supplied policy environment', () => {
    const runtime = createEngineMcpRuntime(subject.state, {
      dmMode: 'blind',
      toolProfile: 'blind',
      requestedActorIds: [subject.actorId],
      offerEnvironment: POLICY_OFFER_ENVIRONMENT,
    });
    const capsule = runtime.feed.current();
    const projection = projectEngineBlindTurn(
      subject.state,
      capsule,
      POLICY_OFFER_ENVIRONMENT.queries,
    );
    const display = projection.displays.find((entry) => entry.id === subject.actorId);
    if (display === undefined) throw new Error('Policy-bound actor is not displayed.');
    const input = {
      state: subject.state,
      capsule,
      blindProjection: projection,
      envelope: envelope({
        actor: { name: display.name, badge: display.badge },
        action: { kind: 'dodge' },
        reason: 'Hold the line.',
      }),
      attempt: 1,
      repairArm: 'code_only' as const,
      dependencies: {
        availableOptions: (
          state: EncounterState,
          actorId: CombatantId,
          _environment: EngineOptionEnvironment,
          revision: number,
        ) =>
          availableEngineActorOptions(state, actorId, POLICY_OFFER_ENVIRONMENT, revision),
        proposalResolver: createPureTurnProposalResolver(POLICY_OFFER_ENVIRONMENT),
      },
    };

    expect(resolveBlindRoundIntents({
      ...input,
      offerEnvironment: POLICY_OFFER_ENVIRONMENT,
    }).status).toBe('accepted');
    expect(resolveBlindRoundIntents({
      ...input,
      offerEnvironment: OFFER_ENVIRONMENT,
    })).toMatchObject({
      status: 'rejected',
      codes: ['OPTION_RESOLUTION_FAILED'],
    });
  });

  it('covers every closed rejection code through a concrete resolver boundary', async () => {
    const observed = new Set<BlindIntentRejectionCode>();
    const observe = (result: BlindResolutionResult): void => {
      if (result.status === 'rejected') result.codes.forEach((code) => observed.add(code));
    };
    observe(resolveBlindRoundIntents({
      state: subject.state, capsule: subject.capsule, blindProjection: subject.projection,
      envelope: { intent_version: BLIND_INTENT_VERSION, intents: [{ action: { kind: 'dodge' } }] },
      attempt: 1, repairArm: 'code_only',
      offerEnvironment: OFFER_ENVIRONMENT,
    }));
    observe(resolveBlindRoundIntents({
      state: subject.state, capsule: subject.capsule, blindProjection: subject.projection,
      envelope: { intent_version: 'invalid', intents: [baseIntent()] },
      attempt: 1, repairArm: 'code_only',
      offerEnvironment: OFFER_ENVIRONMENT,
    }));

    const twoRuntime = createEngineMcpRuntime(subject.state, {
      dmMode: 'blind', toolProfile: 'blind', requestedActorCount: 2,
      offerEnvironment: OFFER_ENVIRONMENT,
    });
    const twoCapsule = twoRuntime.feed.current();
    observe(resolveBlindRoundIntents({
      state: subject.state,
      capsule: twoCapsule,
      blindProjection: projectEngineBlindTurn(subject.state, twoCapsule, OFFER_ENVIRONMENT.queries),
      envelope: envelope(baseIntent()), attempt: 1, repairArm: 'code_only',
      offerEnvironment: OFFER_ENVIRONMENT,
    }));
    observe(resolveBlindRoundIntents({
      state: subject.state, capsule: subject.capsule, blindProjection: subject.projection,
      envelope: { intent_version: BLIND_INTENT_VERSION, intents: [baseIntent(), baseIntent()] },
      attempt: 1, repairArm: 'code_only',
      offerEnvironment: OFFER_ENVIRONMENT,
    }));
    observe(resolve({ ...baseIntent(), actor: { name: 'Unknown', badge: 999 } }, []));
    observe(resolve(baseIntent(), [], {
      projection: { ...subject.projection, displays: [...subject.projection.displays,
        { ...subject.projection.displays.find((entry) => entry.id === subject.actorId)! }] },
    }));

    const attack = attackCandidate([targetDisplay().id]);
    observe(resolve(baseIntent({ kind: 'help' }), [attack]));
    observe(resolve(baseIntent({ kind: 'attack', name: 'synthetic-strike' }), [attack]));
    observe(resolve({ ...baseIntent(), target: { kind: 'creature', name: targetDisplay().name, badge: targetDisplay().badge } }, [candidate({ id: 'option:no-target' })]));
    observe(resolve({ ...baseIntent({ kind: 'attack', name: 'synthetic-strike' }), target: { kind: 'creature', name: 'Unknown' } }, [attack]));
    const ambiguousProjection = {
      ...subject.projection,
      displays: subject.projection.displays.map((entry) =>
        entry.id === targetDisplay().id || entry.id === targetDisplay(1).id ? { ...entry, name: 'Twin' } : entry),
    };
    observe(resolve({ ...baseIntent({ kind: 'attack', name: 'synthetic-strike' }), target: { kind: 'creature', name: 'Twin' } }, [attack], { projection: ambiguousProjection }));

    const moved = subject.projection.resolvedMovement[0]?.cells.find((entry) => !same(entry.cell, subject.current));
    if (moved === undefined) throw new Error('Fixture actor has no reachable moved cell.');
    const movedAttack = {
      ...attack,
      option: { ...attack.option, movement: { preference: { willingness: 'freely' as const, opportunityRisk: 'avoid' as const }, engagement: { stance: 'withdraw' as const } } },
      mechanics: { ...attack.mechanics, finalPosition: moved.cell, path: moved.path, movementCostFeet: moved.costFeet },
    };
    const attackIntent = {
      ...baseIntent({ kind: 'attack', name: 'synthetic-strike' }),
      target: { kind: 'creature' as const, name: targetDisplay().name, badge: targetDisplay().badge },
    };
    observe(resolve(attackIntent, [movedAttack]));
    observe(resolve({ ...baseIntent(), destination: { kind: 'cell_label', label: moved.label } }, [candidate({ id: 'option:hold' })]));
    observe(resolve({ ...baseIntent(), destination: { kind: 'cell_label', label: '999,999' } }, [candidate({ id: 'option:bounds' })]));
    observe(resolve({ ...attackIntent, destination: { kind: 'cell_label', label: cell(subject.current) } }, [movedAttack]));

    const center = feetPoint(subject.current.column * 5, subject.current.row * 5);
    const sphere = areaCandidate('option:area:sphere', { shape: 'sphere', template: { origin: center, radius: feet(10) } });
    observe(resolve(baseIntent({ kind: 'cast', name: 'Entangle' }), [sphere]));
    observe(resolve({ ...baseIntent(), area: { kind: 'cell_label', label: cell(subject.current) } }, [candidate({ id: 'option:no-area' })]));
    observe(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area: { kind: 'cell_label', label: '999,999' } }, [sphere]));
    const cone = areaCandidate('option:area:cone', { shape: 'cone', template: { origin: center, direction: { x: 1, y: 0 }, length: feet(15), includeOrigin: false } });
    observe(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area: { kind: 'cell_label', label: cell(subject.current) } }, [cone]));
    observe(resolve({ ...baseIntent({ kind: 'attack', name: 'synthetic-strike' }), target: { kind: 'creature', name: targetDisplay().name } }, [attackCandidate([targetDisplay().id, targetDisplay(1).id])]));
    observe(resolve(baseIntent(), [candidate({ id: 'option:choice', activationChoice: { kind: 'command_word', values: ['approach', 'flee', 'grovel', 'halt', 'drop'] } })]));

    const differentTarget = attackCandidate([targetDisplay(1).id], 'option:different-target');
    observe(resolve({ ...attackIntent, target: { kind: 'creature', name: targetDisplay(1).name, badge: targetDisplay(1).badge } }, [attack]));
    const alternatePath = moved.path.length > 1 ? [...moved.path].reverse() : [subject.current, moved.cell];
    observe(resolve({ ...attackIntent, destination: { kind: 'cell_label', label: moved.label } }, [
      movedAttack,
      { ...movedAttack, option: { ...movedAttack.option, optionId: engineOptionId('option:path:other') }, mechanics: { ...movedAttack.mechanics, optionId: engineOptionId('option:path:other'), path: alternatePath } },
    ]));
    observe(resolve(attackIntent, [attack], { resolverDependencies: dependencies([attack], true) }));

    const staleProjection = {
      ...subject.projection,
      revision: subject.projection.revision + 1,
    };
    observe(resolve(baseIntent(), [candidate({ id: 'option:stale' })], { projection: staleProjection }));

    expect(observed).toEqual(new Set(BLIND_INTENT_REJECTION_CODES));
  });

  it('supports every grammar action without silently inventing Help, Ready, or a bonus-action companion', () => {
    const target = targetDisplay();
    const object = subject.state.worldObjects.find((entry) => entry.name === 'Unstable Arcane Vent');
    if (object === undefined) throw new Error('Unique object action target missing.');
    const supported = new Map<BlindIntent['action']['kind'], {
      readonly intent: BlindIntent;
      readonly offer: SyntheticCandidate;
    }>();
    supported.set('attack', {
      intent: {
        ...baseIntent({ kind: 'attack', name: 'synthetic-strike' }),
        target: { kind: 'creature', name: target.name, badge: target.badge },
      },
      offer: attackCandidate([target.id]),
    });
    supported.set('cast', {
      intent: baseIntent({ kind: 'cast', name: 'Blur' }),
      offer: candidate({
        id: 'option:action:cast',
        use: {
          kind: 'cast_spell', sourceActionId: engineActionId('synthetic-casting'),
          spellId: engineSpellId('blur'), targets: [], area: null,
        },
        resolved: {
          slot: 'main', kind: 'cast_spell', actionId: engineActionId('synthetic-casting'),
          spellId: engineSpellId('blur'), targetIds: [], objectId: null, omittedRiders: [],
        },
      }),
    });
    supported.set('interact', {
      intent: {
        ...baseIntent({ kind: 'interact', name: 'synthetic-use' }),
        target: { kind: 'object', name: object.name },
      },
      offer: candidate({
        id: 'option:action:interact',
        use: { kind: 'use_world_object', objectId: object.id, actionId: engineActionId('synthetic-use') },
        resolved: {
          slot: 'main', kind: 'use_world_object', actionId: engineActionId('synthetic-use'),
          spellId: null, targetIds: [], objectId: object.id, omittedRiders: [],
        },
      }),
    });
    for (const kind of ['dash', 'dodge', 'disengage', 'end'] as const) {
      const engineKind = kind === 'end' ? 'end_turn' as const : kind;
      supported.set(kind, {
        intent: baseIntent({ kind }),
        offer: candidate({
          id: `option:action:${kind}`,
          use: { kind: engineKind },
          resolved: {
            slot: 'main', kind: engineKind, actionId: engineActionId(engineKind),
            spellId: null, targetIds: [], objectId: null, omittedRiders: [],
          },
        }),
      });
    }
    supported.set('hide', {
      intent: baseIntent({ kind: 'hide' }),
      offer: candidate({
        id: 'option:action:hide', use: { kind: 'hide' },
        resolved: {
          slot: 'bonus', kind: 'hide', actionId: engineActionId('hide'), spellId: null,
          targetIds: [], objectId: null, omittedRiders: [],
        },
      }),
    });
    const actionResults = blindActionKinds.map((kind) => {
      const entry = supported.get(kind);
      if (entry !== undefined) return resolve(entry.intent, [entry.offer]);
      if (kind !== 'help' && kind !== 'ready') throw new Error(`Missing supported action ${kind}.`);
      return resolve(baseIntent({ kind }), [candidate({ id: `option:unrelated:${kind}` })]);
    });
    expect(actionResults).toHaveLength(blindActionKinds.length);
    for (const [kind, entry] of supported) {
      expect(actionResults[blindActionKinds.indexOf(kind)]?.status, kind).toBe('accepted');
      expect(entry.offer.option.actionSlots).toHaveLength(1);
    }
    expectCode(actionResults[blindActionKinds.indexOf('help')]!, 'ACTION_UNAVAILABLE');
    expectCode(actionResults[blindActionKinds.indexOf('ready')]!, 'ACTION_UNAVAILABLE');
  });

  it('defaults omitted destinations to hold and collapses only byte-identical mechanics by lexical private id', () => {
    const first = candidate({ id: 'option:z-identical' });
    const second = {
      option: { ...first.option, optionId: engineOptionId('option:a-identical') },
      mechanics: { ...first.mechanics, optionId: engineOptionId('option:a-identical') },
    };
    const forward = resolve(baseIntent(), [first, second]);
    const reverse = resolve(baseIntent(), [second, first]);
    expect(forward.status).toBe('accepted');
    expect(reverse.status).toBe('accepted');
    if (forward.status === 'rejected' || reverse.status === 'rejected') throw new Error('Identity collapse rejected.');
    expect(forward.actors[0]?.selectedOptionId).toBe('option:a-identical');
    expect(reverse.actors[0]?.selectedOptionId).toBe('option:a-identical');

    const moved = subject.projection.resolvedMovement[0]?.cells.find((entry) => !same(entry.cell, subject.current));
    if (moved === undefined) throw new Error('Fixture actor has no moved cell.');
    const movedOnly = candidate({ id: 'option:moved', final: moved.cell, path: moved.path });
    expectCode(resolve(baseIntent(), [movedOnly]), 'DESTINATION_REQUIRED');
  });

  it('selects only a stationary same-target attack when destination is omitted and preserves explicit ambiguity', () => {
    const target = targetDisplay();
    const intent = {
      ...baseIntent({ kind: 'attack', name: 'synthetic-strike' }),
      target: { kind: 'creature' as const, name: target.name, badge: target.badge },
    };
    const stationary = attackCandidate([target.id], 'option:shortbow:stationary');
    const movement = subject.projection.resolvedMovement[0]?.cells.find((entry) =>
      !same(entry.cell, subject.current));
    if (movement === undefined) throw new Error('Shortbow fixture has no move-first endpoint.');
    const moved = {
      ...stationary,
      option: {
        ...stationary.option,
        optionId: engineOptionId('option:shortbow:moved'),
        movement: {
          preference: { willingness: 'freely' as const, opportunityRisk: 'avoid' as const },
          engagement: { stance: 'withdraw' as const },
        },
      },
      mechanics: {
        ...stationary.mechanics,
        optionId: engineOptionId('option:shortbow:moved'),
        finalPosition: movement.cell,
        path: movement.path,
        movementCostFeet: movement.costFeet,
      },
    };
    const held = resolve(intent, [moved, stationary]);
    expect(held.status).toBe('accepted');
    if (held.status === 'rejected') throw new Error('Stationary attack was not selected.');
    expect(held.actors[0]?.selectedOptionId).toBe('option:shortbow:stationary');

    const resourceVariant = {
      ...moved,
      option: {
        ...moved.option,
        optionId: engineOptionId('option:shortbow:resource'),
        resourceCostLabels: ['synthetic-resource:1'],
      },
      mechanics: { ...moved.mechanics, optionId: engineOptionId('option:shortbow:resource') },
    };
    expectCode(resolve({
      ...intent,
      destination: { kind: 'cell_label', label: movement.label },
    }, [resourceVariant, moved]), 'AMBIGUOUS_INTENT');
  });

  it('keeps distinct paths semantically ambiguous even when every other execution field matches', () => {
    const movement = subject.projection.resolvedMovement[0]?.cells.find((entry) =>
      !same(entry.cell, subject.current) && entry.path.length > 1);
    if (movement === undefined) throw new Error('Path ambiguity fixture has no multi-step endpoint.');
    const first = candidate({ id: 'option:path:first', final: movement.cell, path: movement.path });
    const alternatePath = [movement.path[0]!, ...movement.path.slice(1).reverse()];
    const second = candidate({ id: 'option:path:second', final: movement.cell, path: alternatePath });
    expectCode(resolve({
      ...baseIntent(), destination: { kind: 'cell_label', label: movement.label },
    }, [first, second]), 'AMBIGUOUS_INTENT');
  });

  it('resolves every documented relative convention geometrically and ignores catalog order', () => {
    const movement = subject.projection.resolvedMovement[0];
    if (movement === undefined) throw new Error('Fixture movement cache missing.');
    const catalog = movement.cells.map((entry, index) => candidate({
      id: `option:relative:${String(index).padStart(4, '0')}`,
      final: entry.cell,
      path: entry.path,
    }));
    const anchor = targetDisplay();
    const from = targetDisplay(1);
    const relations: BlindIntent['destination'][] = [
      { kind: 'relative', relation: 'hold' },
      { kind: 'relative', relation: 'adjacent_to', anchor: { name: anchor.name, badge: anchor.badge } },
      { kind: 'relative', relation: 'toward', anchor: { name: anchor.name, badge: anchor.badge } },
      { kind: 'relative', relation: 'away_from', anchor: { name: anchor.name, badge: anchor.badge } },
      { kind: 'relative', relation: 'near', anchor: { name: anchor.name, badge: anchor.badge } },
      { kind: 'relative', relation: 'behind', anchor: { name: anchor.name, badge: anchor.badge }, from: { name: from.name, badge: from.badge } },
    ];
    for (const destination of relations) {
      const forward = resolve({ ...baseIntent(), destination }, catalog);
      const reverse = resolve({ ...baseIntent(), destination }, [...catalog].reverse());
      expect(reverse).toEqual(forward);
      if (forward.status === 'accepted') {
        const selected = movement.cells.find((entry) => same(entry.cell, forward.actors[0]!.resolution.mechanics.finalPosition));
        expect(forward.actors[0]?.resolution.mechanics.path).toEqual(selected?.path);
      } else {
        expect(destination?.kind === 'relative' && destination.relation === 'adjacent_to' ||
          destination?.kind === 'relative' && destination.relation === 'behind').toBe(true);
        expect(forward.codes).toContain('DESTINATION_INVALID');
      }
    }
  });

  it('keeps displayed reach and resolver reach bidirectionally identical at one digest', () => {
    const movement = subject.projection.resolvedMovement[0];
    const shown = subject.projection.legalMovement.actors[0];
    if (movement === undefined || shown === undefined) throw new Error('Fixture reach projection missing.');
    expect(subject.projection.legalMovement.provenance.state_digest).toBe(subject.capsule.digest);
    expect(shown.cells.map((entry) => entry.label)).toEqual(movement.cells.map((entry) => entry.label));
    for (const reachable of movement.cells) {
      const result = resolve({
        ...baseIntent(), destination: { kind: 'cell_label', label: reachable.label },
      }, [candidate({ id: `option:reach:${reachable.label}`, final: reachable.cell, path: reachable.path })]);
      expect(result.status, reachable.label).toBe('accepted');
    }
  });

  it('matches sphere, fixed cube, cylinder, and emanation anchors but requires directional templates to be specified', () => {
    const center = feetPoint(subject.current.column * 5, subject.current.row * 5);
    const area = { kind: 'cell_label' as const, label: cell(subject.current) };
    const sufficient = [
      areaCandidate('option:sphere', { shape: 'sphere', template: { origin: center, radius: feet(10) } }),
      areaCandidate('option:cube', { shape: 'cube', template: { origin: center, center, axis: { x: 1, y: 0 }, size: feet(10), includeOrigin: false } }),
      areaCandidate('option:cylinder', { shape: 'cylinder', template: { origin: center, radius: feet(10), height: feet(20) } }),
    ];
    for (const entry of sufficient) {
      expect(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area }, [entry]).status).toBe('accepted');
    }
    const selfArea = { kind: 'centered_on' as const, target: subject.actor };
    const emanation = areaCandidate('option:emanation', { shape: 'emanation', template: { origin: center, radius: feet(10), includeOrigin: true } });
    expect(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area: selfArea }, [emanation]).status).toBe('accepted');
    expectCode(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area }, []), 'ACTION_UNAVAILABLE');

    for (const directional of [
      areaCandidate('option:cone', { shape: 'cone', template: { origin: center, direction: { x: 1, y: 0 }, length: feet(15), includeOrigin: false } }),
      areaCandidate('option:line', { shape: 'line', template: { origin: center, direction: { x: 1, y: 0 }, length: feet(20), width: feet(5), includeOrigin: false } }),
    ]) {
      expectCode(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area }, [directional]), 'AREA_UNDERSPECIFIED');
      expect(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area: { ...area, direction: 'east' } }, [directional]).status).toBe('accepted');
    }
    const rotated = [
      areaCandidate('option:cube:east', { shape: 'cube', template: { origin: center, center, axis: { x: 1, y: 0 }, size: feet(10), includeOrigin: false } }),
      areaCandidate('option:cube:north', { shape: 'cube', template: { origin: center, center, axis: { x: 0, y: -1 }, size: feet(10), includeOrigin: false } }),
    ];
    expectCode(resolve({ ...baseIntent({ kind: 'cast', name: 'Entangle' }), area }, rotated), 'AREA_UNDERSPECIFIED');
  });

  it('keeps code-only repairs fact-free and labels one lexical minimal hint as advice-assisted data', () => {
    const end = candidate({
      id: 'option:z-end',
      use: { kind: 'end_turn' },
      resolved: {
        slot: 'main', kind: 'end_turn', actionId: engineActionId('end-turn'), spellId: null,
        targetIds: [], objectId: null, omittedRiders: [],
      },
    });
    const alternatives = [end, candidate({ id: 'option:a-dodge' })];
    const codeOnly = resolve(baseIntent({ kind: 'help' }), alternatives);
    expect(codeOnly.status).toBe('rejected');
    if (codeOnly.status === 'accepted') throw new Error('Help unexpectedly resolved.');
    expect(codeOnly.modelResult).toEqual({
      status: 'rejected', attempt: 1, actor: subject.actor, codes: ['ACTION_UNAVAILABLE'],
    });
    expect(JSON.stringify(codeOnly.modelResult)).not.toMatch(/legal|option|target|destination|path|score/iu);

    const hinted = resolve(baseIntent({ kind: 'help' }), alternatives, {
      repairArm: 'minimal_legal_alternative',
    });
    expect(hinted.status).toBe('rejected');
    if (hinted.status === 'accepted') throw new Error('Help unexpectedly resolved.');
    expect(hinted.modelResult).toEqual({
      status: 'rejected', attempt: 1, actor: subject.actor, codes: ['ACTION_UNAVAILABLE'],
      legal_alternative: { action_kind: 'dodge' },
    });
    const reverseHinted = resolve(baseIntent({ kind: 'help' }), [...alternatives].reverse(), {
      repairArm: 'minimal_legal_alternative',
    });
    expect(reverseHinted.modelResult).toEqual(hinted.modelResult);
  });

  it('refuses unavailable blind execution atomically instead of applying the engine Dodge fallback', () => {
    const real = availableEngineActorOptions(subject.state, subject.actorId, OFFER_ENVIRONMENT)
      .find((entry) => entry.actionSlots.length === 1 &&
        entry.actionSlots[0]?.slot === 'main' && entry.actionSlots[0].use.kind === 'dodge');
    if (real === undefined) throw new Error('Fixture engine Dodge option missing.');
    const proposal: EngineTurnProposal = {
      actorId: subject.actorId, expectedRevision: real.revision,
      primaryOptionId: engineOptionId('option:forged-unavailable'), fallbackOptionId: null,
      reason: '', overrideJustification: null,
    };
    const mechanics = candidate({ id: 'option:forged-unavailable' }).mechanics;
    const unavailable: EngineOfferableOption = {
      ...real,
      optionId: engineOptionId('option:forged-unavailable'),
      actionSlots: [{
        slot: 'main',
        use: {
          kind: 'attack', actionId: engineActionId('missing-attack'),
          target: { kind: 'combatant', combatantId: subject.actorId },
        },
      }],
    };
    const session = new EngineRoundSession(
      subject.state,
      mulberry32(123),
      { kind: 'unattended', askDefault: 'decline' },
      OFFER_ENVIRONMENT,
    );
    const before = session.currentState();
    expect(() => session.applyResolvedMechanics([{
      proposal, option: unavailable, primaryOption: unavailable, fallbackOption: null,
      mechanics, selectedBranch: 'primary', strictNoFallback: true,
    }], null)).toThrow('Blind proposal became unavailable');
    expect(session.currentState()).toEqual(before);
  });

  it('pins generated blind input/output schemas and the frozen intel contract hash', () => {
    const generated = (schema: z.ZodType<unknown>): unknown => z.toJSONSchema(schema, {
      target: 'draft-2020-12', io: 'output', reused: 'ref',
    });
    expect(JSON.parse(readFileSync('docs/specs/engine-blind-round-intent.schema.json', 'utf8')) as unknown)
      .toEqual(generated(engineSchemaInternals.blindRoundIntentEnvelopeSchema));
    expect(JSON.parse(readFileSync('docs/specs/engine-blind-round-intent-result.schema.json', 'utf8')) as unknown)
      .toEqual(generated(engineSchemaInternals.blindIntentSubmissionOutputSchema));
    expect(createHash('sha256').update(readFileSync('src/vtt/intel/contracts.ts')).digest('hex'))
      .toBe('0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1');
  });
});

function cell(value: GridCell): string {
  return `${String(value.column)},${String(value.row)}`;
}

function same(left: GridCell, right: GridCell): boolean {
  return left.column === right.column && left.row === right.row;
}
