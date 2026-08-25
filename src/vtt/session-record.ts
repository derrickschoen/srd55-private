import type { EncounterEvent } from '../combat/events';
import type { EncounterPhase } from '../combat/encounter';
import type { CombatantId, LimitedResourcePoolId } from '../combat/values';
import type { SessionRevision } from './session-persistence';

export interface SessionRecordResourceSummary {
  readonly spellSlots: readonly { readonly level: number; readonly count: number }[];
  readonly legendaryActionUses: number;
  readonly wildShapeUses: number;
  readonly limitedResources: readonly {
    readonly resourcePoolId: LimitedResourcePoolId;
    readonly count: number;
  }[];
}

export interface SessionRecordCombatantSummary {
  readonly combatant: CombatantId;
  readonly name: string;
  readonly damageDealt: number;
  readonly damageTaken: number;
  readonly resourcesSpent: SessionRecordResourceSummary;
}

export interface SessionRecordDeath {
  readonly combatant: CombatantId;
  readonly eventSequence: number;
  readonly cause: 'damage' | 'death_save' | 'dm_override';
}

export interface SessionRecordDeathSave {
  readonly combatant: CombatantId;
  readonly eventSequence: number;
  readonly outcome: Extract<EncounterEvent, { readonly type: 'death_save_resolved' }>['outcome'];
  readonly successes: number;
  readonly failures: number;
  readonly lifeState: Extract<EncounterEvent, { readonly type: 'death_save_resolved' }>['lifeState'];
}

export interface SessionRecordRulingCard {
  readonly revision: number;
  readonly eventSequence: number;
  readonly target: CombatantId;
  readonly subject: string;
  readonly reasoning: string;
  readonly consequence: Extract<EncounterEvent, { readonly type: 'adjudicated' }>['consequence'];
}

interface SessionEncounterRecordBase {
  readonly encounter: number;
  readonly room: number | null;
  readonly roundsElapsed: number;
  readonly combatants: readonly SessionRecordCombatantSummary[];
  readonly deaths: readonly SessionRecordDeath[];
  readonly deathSaves: readonly SessionRecordDeathSave[];
  readonly dmRulings: readonly SessionRecordRulingCard[];
}

export type SessionEncounterRecord = SessionEncounterRecordBase & (
  | {
      readonly status: 'open';
      readonly conclusion: null;
    }
  | {
      readonly status: 'closed';
      readonly conclusion: Extract<EncounterPhase, { readonly kind: 'concluded' }> & {
        readonly journalRevision: number;
      };
    }
);

export interface SessionRecord {
  readonly kind: 'end_of_session_summary';
  readonly journalRevisionCount: number;
  readonly encounters: readonly SessionEncounterRecord[];
}

interface MutableCombatantSummary {
  name: string;
  damageDealt: number;
  damageTaken: number;
  legendaryActionUses: number;
  wildShapeUses: number;
  readonly spellSlots: Map<number, number>;
  readonly limitedResources: Map<LimitedResourcePoolId, number>;
}

function eventsOf(revision: SessionRevision): readonly EncounterEvent[] {
  switch (revision.transition.kind) {
    case 'reducer_applied':
    case 'turn_skipped':
    case 'turn_delayed':
      return revision.transition.events;
    case 'session_started':
    case 'session_ended':
    case 'party_state_captured':
    case 'reaction_preference_changed':
    case 'refusal_handling_changed':
    case 'short_rest_completed':
    case 'long_rest_completed':
    case 'room_composed':
    case 'head_moved':
    case 'controller_request_issued':
    case 'controller_response_received':
    case 'controller_request_cancelled':
    case 'controller_replaced':
    case 'reaction_policy_resolved':
    case 'controller_response_refused':
    case 'coordinator_paused':
    case 'coordinator_resumed':
      return [];
  }
}

function mutableCombatant(
  summaries: Map<CombatantId, MutableCombatantSummary>,
  combatant: CombatantId,
  names: ReadonlyMap<CombatantId, string>,
): MutableCombatantSummary {
  const existing = summaries.get(combatant);
  if (existing !== undefined) return existing;
  const created: MutableCombatantSummary = {
    name: names.get(combatant) ?? String(combatant),
    damageDealt: 0,
    damageTaken: 0,
    legendaryActionUses: 0,
    wildShapeUses: 0,
    spellSlots: new Map(),
    limitedResources: new Map(),
  };
  summaries.set(combatant, created);
  return created;
}

export function deriveSessionRecord(revisions: readonly SessionRevision[]): SessionRecord {
  const byRevision = new Map(revisions.map((revision) => [revision.revision, revision] as const));
  const activeRevisionNumbers = new Set<number>();
  let cursor = revisions.at(-1)?.revision ?? null;
  while (cursor !== null) {
    activeRevisionNumbers.add(cursor);
    const revision = byRevision.get(cursor);
    if (revision === undefined) throw new Error('Session record ancestry is incomplete.');
    cursor = revision.parentRevision;
  }
  const active = revisions.filter((revision) => activeRevisionNumbers.has(revision.revision));
  const ordinalByRevision = new Map<number, number>();
  for (const revision of active) {
    const parentOrdinal = revision.parentRevision === null
      ? 1
      : ordinalByRevision.get(revision.parentRevision);
    if (parentOrdinal === undefined) throw new Error('Session record encounter ancestry is incomplete.');
    ordinalByRevision.set(
      revision.revision,
      revision.transition.kind === 'room_composed' ? parentOrdinal + 1 : parentOrdinal,
    );
  }
  const encounterOrdinals = [...new Set(ordinalByRevision.values())];
  const encounters = encounterOrdinals.map((encounter): SessionEncounterRecord => {
    const segment = active.filter(
      (revision) => ordinalByRevision.get(revision.revision) === encounter,
    );
    const names = new Map<CombatantId, string>();
    for (const revision of segment) {
      for (const subject of revision.encounterState.combatants) {
        names.set(subject.profile.id, subject.profile.name);
      }
    }
    const summaries = new Map<CombatantId, MutableCombatantSummary>();
    for (const [combatant] of names) mutableCombatant(summaries, combatant, names);
    const deaths: SessionRecordDeath[] = [];
    const deathSaves: SessionRecordDeathSave[] = [];
    const dmRulings: SessionRecordRulingCard[] = [];
    for (const revision of segment) {
      for (const event of eventsOf(revision)) {
        switch (event.type) {
          case 'damage_applied':
            mutableCombatant(summaries, event.source, names).damageDealt += event.amount;
            mutableCombatant(summaries, event.target, names).damageTaken += event.amount;
            if (event.lifeState === 'dead') {
              deaths.push({ combatant: event.target, eventSequence: event.sequence, cause: 'damage' });
            }
            break;
          case 'spell_slot_spent': {
            const slots = mutableCombatant(summaries, event.combatant, names).spellSlots;
            slots.set(event.slotLevel, (slots.get(event.slotLevel) ?? 0) + 1);
            break;
          }
          case 'legendary_action_used':
            mutableCombatant(summaries, event.combatant, names).legendaryActionUses += event.cost;
            break;
          case 'wild_shape_assumed':
            mutableCombatant(summaries, event.combatant, names).wildShapeUses += 1;
            break;
          case 'limited_resource_spent': {
            const resources = mutableCombatant(summaries, event.combatant, names).limitedResources;
            resources.set(event.resourcePoolId, (resources.get(event.resourcePoolId) ?? 0) + 1);
            break;
          }
          case 'death_save_resolved':
            deathSaves.push({
              combatant: event.combatant,
              eventSequence: event.sequence,
              outcome: event.outcome,
              successes: event.successes,
              failures: event.failures,
              lifeState: event.lifeState,
            });
            if (event.lifeState === 'dead') {
              deaths.push({ combatant: event.combatant, eventSequence: event.sequence, cause: 'death_save' });
            }
            break;
          case 'adjudicated':
            dmRulings.push({
              revision: revision.revision,
              eventSequence: event.sequence,
              target: event.target,
              subject: event.subject,
              reasoning: event.reasoning,
              consequence: structuredClone(event.consequence),
            });
            if (event.consequence.kind === 'death_override' && event.consequence.after.lifeState === 'dead') {
              deaths.push({ combatant: event.target, eventSequence: event.sequence, cause: 'dm_override' });
            }
            break;
          default:
            break;
        }
      }
    }
    const last = segment.at(-1);
    const concluded = segment.find((revision) => revision.encounterState.phase.kind === 'concluded');
    const conclusion = concluded?.encounterState.phase.kind === 'concluded'
      ? { ...concluded.encounterState.phase, journalRevision: concluded.revision }
      : null;
    const base: SessionEncounterRecordBase = {
      encounter,
      room: last?.partyState?.room ?? null,
      roundsElapsed: segment.reduce(
        (maximum, revision) => Math.max(maximum, revision.encounterState.round),
        0,
      ),
      combatants: [...summaries].sort(([left], [right]) => left.localeCompare(right)).map(
        ([combatant, summary]) => ({
          combatant,
          name: summary.name,
          damageDealt: summary.damageDealt,
          damageTaken: summary.damageTaken,
          resourcesSpent: {
            spellSlots: [...summary.spellSlots].sort(([left], [right]) => left - right).map(
              ([level, count]) => ({ level, count }),
            ),
            legendaryActionUses: summary.legendaryActionUses,
            wildShapeUses: summary.wildShapeUses,
            limitedResources: [...summary.limitedResources]
              .sort(([left], [right]) => left.localeCompare(right))
              .map(([resourcePoolId, count]) => ({ resourcePoolId, count })),
          },
        }),
      ),
      deaths,
      deathSaves,
      dmRulings,
    };
    return conclusion === null
      ? { ...base, status: 'open', conclusion: null }
      : { ...base, status: 'closed', conclusion };
  });
  return {
    kind: 'end_of_session_summary',
    journalRevisionCount: revisions.length,
    encounters,
  };
}
