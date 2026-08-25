import type { RpcClient } from '../rpc/client';
import { mountEncounterVtt, type EncounterVttMount } from './encounter-app';
import { loadD365SampleParty } from './d365-sample-party';
import { createPartySessionState } from './party-session-state';
import {
  VANE_WARREN_FIGHTS,
  VANE_WARREN_ID,
  composeVaneWarrenFight,
  type VaneWarrenFightId,
} from './vane-warren';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { readonly className?: string; readonly text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
}

export interface VaneWarrenMount {
  close(): void;
}

export function mountVaneWarren(root: HTMLElement, rpc: RpcClient): VaneWarrenMount {
  const shell = element('main', { className: 'vane-warren-loader' });
  shell.append(
    element('p', { className: 'vtt-kicker', text: 'Bundled flagship encounter' }),
    element('h1', { text: 'The Vane Warren' }),
    element('p', {
      text: 'Choose one leader fight. Each selection loads a separate roster, pre-placed tokens, fog, light, surfaces, hazards, and stronghold objects for the representative four-character party.',
    }),
  );
  const choices = element('div', { className: 'vtt-actions' });
  const status = element('output', { className: 'vane-warren-loader-status' });
  status.setAttribute('role', 'status');
  let encounterMount: EncounterVttMount | null = null;
  let closed = false;
  let loading = false;

  const loadFight = (fightId: VaneWarrenFightId): void => {
    if (loading) return;
    loading = true;
    choices.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    status.value = 'Authoring the bundled four-character party through RPC…';
    void loadD365SampleParty(rpc).then((sample) => {
      if (closed) return;
      const encounter = composeVaneWarrenFight(
        fightId,
        sample.party.members,
        sample.displayNames,
        createPartySessionState(sample.party.members),
      );
      encounterMount = mountEncounterVtt(root, {
        view: 'dm',
        sessionId: `${VANE_WARREN_ID}:${fightId}`,
        encounter,
      });
    }).catch((error: unknown) => {
      if (closed) return;
      status.value = error instanceof Error ? error.message : 'The Vane Warren failed to load.';
      loading = false;
      choices.querySelectorAll('button').forEach((button) => { button.disabled = false; });
    });
  };

  for (const fight of VANE_WARREN_FIGHTS) {
    const button = element('button', { text: `Load ${fight.name}` });
    button.type = 'button';
    button.dataset.fightId = fight.id;
    button.addEventListener('click', () => loadFight(fight.id));
    choices.append(button);
  }
  shell.append(choices, status);
  root.replaceChildren(shell);

  return {
    close: () => {
      closed = true;
      encounterMount?.close();
    },
  };
}
