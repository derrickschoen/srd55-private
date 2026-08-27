import { describe, expect, it } from 'vitest';
import type { CombatantProfile } from '../../../src/combat/combatant';
import { createEncounter, reduceEncounter } from '../../../src/combat/encounter';
import { mulberry32 } from '../../../src/combat/random';
import {
  encounterBranchId,
  encounterSessionId,
  statblockId,
} from '../../../src/combat/values';
import { createWildShapeCharacterSheet, decodeWildShapeOverlay } from '../../../src/combat/wild-shape';
import type { PersistedCoordinatorState } from '../../../src/combat/coordinator';
import {
  EncounterSessionJournal,
  MemoryBrowserSessionStore,
  MemoryMirrorSink,
  exportSavedSession,
  importSavedSession,
} from '../../../src/vtt/session-persistence';
import { monsterProfile, placedToken, playerProfile } from '../combat/fixtures';

const COORDINATOR: PersistedCoordinatorState = {
  requestSequence: 1,
  pendingRequest: null,
  pendingCommand: null,
  continuation: { kind: 'idle' },
  pause: null,
};

function shapedEncounter() {
  const base = playerProfile('persist-wild-druid', { hitPoints: 24, initiativeBonus: 20 });
  if (base.kind !== 'player_character') throw new Error('Wild Shape persistence fixture is not a PC.');
  const druid: Extract<CombatantProfile, { readonly kind: 'player_character' }> = {
    ...base,
    wildShape: createWildShapeCharacterSheet(2, [
      'statblock:wolf',
      'statblock:boar',
      'statblock:homebrew-beast/brush-bear',
      'statblock:homebrew-beast/threadling-weaver',
    ]),
  };
  const enemy = monsterProfile('persist-wild-enemy', { initiativeBonus: -20 });
  const started = reduceEncounter(createEncounter({
    bounds: { columns: 4, rows: 2 },
    combatants: [druid, enemy],
    tokens: [placedToken(druid, 0), placedToken(enemy, 1)],
  }), { type: 'roll_initiative' }, () => 0).state;
  const shaped = reduceEncounter(started, {
    type: 'assume_wild_shape',
    actor: druid.id,
    formId: statblockId('statblock:wolf'),
    equipmentDisposition: 'merged_into_form',
  }, () => 0).state;
  return { druid, shaped };
}

describe('Wild Shape session persistence', () => {
  it('round-trips a wildshaped combatant through export, strict decode, import, replay, and resume', () => {
    const fixture = shapedEncounter();
    const source = new MemoryBrowserSessionStore();
    const sessionId = encounterSessionId('session:wild-shape-round-trip');
    EncounterSessionJournal.create({
      sessionId,
      branchId: encounterBranchId('branch:wild-shape-main'),
      encounterState: fixture.shaped,
      coordinatorState: COORDINATOR,
      controllers: [],
      rng: mulberry32(4242),
      store: source,
      mirror: new MemoryMirrorSink(),
    });
    const destination = new MemoryBrowserSessionStore();
    expect(importSavedSession(destination, exportSavedSession(source, sessionId))).toBe(sessionId);
    const resumed = EncounterSessionJournal.resume(sessionId, destination, new MemoryMirrorSink());
    const restored = resumed.encounterState.combatants.find((entry) => entry.profile.id === fixture.druid.id);
    expect(restored?.wildShape).toEqual(
      fixture.shaped.combatants.find((entry) => entry.profile.id === fixture.druid.id)?.wildShape,
    );
    expect(restored?.wildShapeUses).toEqual({ kind: 'wild_shape_uses', maximum: 2, remaining: 1 });
  });

  it('closed_union_decode: refuses an unrecognized persisted overlay kind instead of widening it', () => {
    const fixture = shapedEncounter();
    const overlay = fixture.shaped.combatants.find((entry) => entry.profile.id === fixture.druid.id)?.wildShape;
    if (overlay === undefined) throw new Error('Wild Shape overlay fixture is absent.');
    expect(() => decodeWildShapeOverlay({ ...overlay, kind: 'wild_shape_from_the_future' }))
      .toThrow('unknown kind');
  });
});
