import { describe, expect, it } from 'vitest';
import {
  ControllerAssignmentError,
  DmEncounterHost,
  type DmEncounterHostSnapshot,
} from '../../../src/vtt/dm-encounter-host';
import { REFERENCE_FIGHTER_ID } from '../../../src/vtt/reference-encounter';
import { MemoryBrowserSessionStore } from '../../../src/vtt/session-persistence';
import { buildOfferEnvironment } from '../../../src/vtt/offers/build-offer-environment';

const OFFER_ENVIRONMENT = buildOfferEnvironment({
  kind: 'configuration',
  mode: 'legacy_standard',
});

async function settle(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function waitForSnapshot(
  host: DmEncounterHost,
  predicate: (snapshot: DmEncounterHostSnapshot) => boolean,
): Promise<DmEncounterHostSnapshot> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      unsubscribe();
      reject(new Error('Timed out waiting for the controller assignment outcome.'));
    }, 1_000);
    const unsubscribe = host.subscribe((snapshot) => {
      if (!predicate(snapshot)) return;
      clearTimeout(timeout);
      unsubscribe();
      resolve(snapshot);
    });
  });
}

describe('DM controller assignment', () => {
  it('assigns an algorithm controller durably and drives its turn without a human prompt', async () => {
    const host = new DmEncounterHost(
      'session:controller-assignment-algorithm',
      new MemoryBrowserSessionStore(),
      { offerEnvironment: OFFER_ENVIRONMENT },
    );

    void host.start();
    await settle();
    expect(host.snapshot().dm.pendingRequest?.actorId).toBe(REFERENCE_FIGHTER_ID);
    expect(() => host.replaceController(REFERENCE_FIGHTER_ID, 'algorithm')).toThrowError(
      expect.objectContaining<Partial<ControllerAssignmentError>>({
        name: 'ControllerAssignmentError',
        code: 'action_boundary_required',
      }),
    );

    host.interrupt();
    await settle();
    host.replaceController(REFERENCE_FIGHTER_ID, 'algorithm');

    expect(host.snapshot().dm.controllers).toContainEqual(expect.objectContaining({
      combatantId: REFERENCE_FIGHTER_ID,
      kind: 'algorithm',
    }));

    const revisionBeforeResume = host.snapshot().dm.encounter.revision;
    host.resume();
    const driven = await waitForSnapshot(
      host,
      (snapshot) => snapshot.dm.encounter.revision > revisionBeforeResume,
    );

    expect(driven.dm.pendingRequest?.actorId).not.toBe(REFERENCE_FIGHTER_ID);
    host.close();
  });
});
