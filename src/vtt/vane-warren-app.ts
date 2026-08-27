import type { RpcClient } from '../rpc/client';
import { mountEncounterVtt, type EncounterVttMount } from './encounter-app';
import { loadD365SampleParty } from './d365-sample-party';
import { createD365SurvivalPartySessionState } from './survival-policy';
import { encounterSeed } from './session-seed';
import {
  VANE_WARREN_SESSION_ID,
  VANE_WARREN_TPK_SCENARIOS,
  composeVaneWarrenSessionEncounter,
  type VaneWarrenRehearsalScenario,
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

export function mountVaneWarren(
  root: HTMLElement,
  rpc: RpcClient,
  scenario: VaneWarrenRehearsalScenario = 'default',
): VaneWarrenMount {
  const scenarioConfig = scenario === 'default' ? null : VANE_WARREN_TPK_SCENARIOS[scenario];
  const shell = element('main', { className: 'vane-warren-loader' });
  shell.append(
    element('p', { className: 'vtt-kicker', text: scenarioConfig === null ? 'Bundled flagship encounter' : 'Doomed rehearsal encounter' }),
    element('h1', { text: scenarioConfig?.sessionName ?? 'The Vane Warren' }),
    element('p', {
      text: 'Play all three leader fights as one continuous session. Party Hit Points and resources carry between encounters, followed by one final session export.',
    }),
  );
  const choices = element('div', { className: 'vtt-actions' });
  const status = element('output', { className: 'vane-warren-loader-status' });
  status.setAttribute('role', 'status');
  let encounterMount: EncounterVttMount | null = null;
  let closed = false;
  let loading = false;

  const loadSession = (): void => {
    if (loading) return;
    loading = true;
    choices.querySelectorAll('button').forEach((button) => { button.disabled = true; });
    status.value = 'Authoring the bundled five-character party through RPC…';
    void loadD365SampleParty(rpc).then((sample) => {
      if (closed) return;
      const encounter = composeVaneWarrenSessionEncounter(
        sample.party.members,
        sample.displayNames,
        createD365SurvivalPartySessionState(sample.party.members).state,
        scenario,
      );
      encounterMount = mountEncounterVtt(root, {
        view: 'dm',
        sessionId: scenarioConfig?.sessionId ?? VANE_WARREN_SESSION_ID,
        encounter,
        ...(scenarioConfig === null ? {} : { initialSeed: encounterSeed(20_260_824) }),
      });
    }).catch((error: unknown) => {
      if (closed) return;
      status.value = error instanceof Error ? error.message : 'The Vane Warren failed to load.';
      loading = false;
      choices.querySelectorAll('button').forEach((button) => { button.disabled = false; });
    });
  };

  const button = element('button', {
    text: scenarioConfig === null ? 'Start the Vane Warren' : 'Start the doomed rehearsal',
  });
  button.type = 'button';
  button.addEventListener('click', loadSession);
  choices.append(button);
  shell.append(choices, status);
  root.replaceChildren(shell);

  return {
    close: () => {
      closed = true;
      encounterMount?.close();
    },
  };
}
