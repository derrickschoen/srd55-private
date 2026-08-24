import type { RpcClient } from '../rpc/client';
import { mountEncounterVtt, type EncounterVttMount } from './encounter-app';
import { composeD365Room, D365_SAMPLE_DUNGEON } from './d365-sample-dungeon';
import { loadD365SampleParty } from './d365-sample-party';
import { createPartySessionState } from './party-session-state';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { readonly className?: string; readonly text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
}

export interface D365SampleDungeonMount {
  close(): void;
}

export function mountD365SampleDungeon(
  root: HTMLElement,
  rpc: RpcClient,
): D365SampleDungeonMount {
  const shell = element('main', { className: 'd365-sample-loader' });
  shell.append(
    element('p', { className: 'vtt-kicker', text: 'Bundled DM sample' }),
    element('h1', { text: 'D365 sample dungeon' }),
    element('p', {
      text: 'Authors the representative level-5 party through the production RPC surface, then composes room 1 from the registered dungeon manifest.',
    }),
  );
  const load = element('button', { text: 'Load bundled dungeon and party' });
  load.type = 'button';
  const status = element('output', { className: 'd365-sample-loader-status' });
  status.setAttribute('role', 'status');
  shell.append(load, status);
  root.replaceChildren(shell);

  let encounterMount: EncounterVttMount | null = null;
  let closed = false;
  load.addEventListener('click', () => {
    load.disabled = true;
    status.value = 'Authoring four characters through RPC…';
    void loadD365SampleParty(rpc).then((sample) => {
      if (closed) return;
      const partyState = createPartySessionState(sample.party.members);
      const encounter = composeD365Room(
        sample.party.members,
        sample.displayNames,
        partyState,
      );
      encounterMount = mountEncounterVtt(root, {
        view: 'dm',
        sessionId: `${D365_SAMPLE_DUNGEON.dungeonId}-room-1`,
        encounter,
      });
    }).catch((error: unknown) => {
      if (closed) return;
      status.value = error instanceof Error ? error.message : 'D365 sample loading failed.';
      load.disabled = false;
    });
  });

  return {
    close: () => {
      closed = true;
      encounterMount?.close();
    },
  };
}
