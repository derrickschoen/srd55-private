import type { RpcClient } from '../rpc/client';
import { createQueriesClient } from '../queries/client';
import { mountEncounterVtt, type EncounterVttMount } from './encounter-app';
import { loadExternalPartyPack } from './party-pack';
import { composeStoredCharacterEncounter } from './stored-character-encounter';

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  options: { readonly className?: string; readonly text?: string } = {},
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (options.className !== undefined) node.className = options.className;
  if (options.text !== undefined) node.textContent = options.text;
  return node;
}

export interface StoredCharacterEncounterComposerMount {
  close(): void;
}

export async function mountStoredCharacterEncounterComposer(
  root: HTMLElement,
  rpc: RpcClient,
): Promise<StoredCharacterEncounterComposerMount> {
  const queries = createQueriesClient(rpc);
  const characters = await queries.listCharacters();
  const shell = element('main', { className: 'encounter-composer' });
  shell.append(
    element('p', { className: 'vtt-kicker', text: 'DM encounter composer' }),
    element('h1', { text: 'Build an encounter from stored characters' }),
    element('p', {
      text: 'Select three to five stored characters. Export refusals name the sheet field that still needs a sourced value.',
    }),
  );
  const form = element('form');
  const list = element('fieldset');
  list.append(element('legend', { text: 'Stored characters' }));
  const selected = new Set<number>();
  const start = element('button', { text: 'Start DM encounter' });
  start.type = 'submit';
  start.disabled = true;
  const status = element('output', { className: 'encounter-composer-status' });
  status.setAttribute('role', 'status');
  const updateStart = (): void => {
    start.disabled = selected.size < 3 || selected.size > 5;
    status.value = `${String(selected.size)} selected; choose three to five.`;
  };
  for (const character of characters) {
    const label = element('label');
    const checkbox = element('input');
    checkbox.type = 'checkbox';
    checkbox.value = String(character.id);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) selected.add(character.id);
      else selected.delete(character.id);
      updateStart();
    });
    const classes = character.classes
      .map((heldClass) => `${heldClass.name} ${String(heldClass.level)}`)
      .join(' / ');
    label.append(
      checkbox,
      document.createTextNode(
        `${character.name} — ${classes || 'no classes recorded'}`,
      ),
    );
    list.append(label);
  }
  if (characters.length === 0) {
    list.append(element('p', { text: 'No stored characters are available.' }));
  }
  updateStart();
  form.append(list, start, status);
  shell.append(form);
  root.replaceChildren(shell);

  let encounterMount: EncounterVttMount | null = null;
  let closed = false;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    if (selected.size < 3 || selected.size > 5) return;
    start.disabled = true;
    status.value = 'Exporting selected character sheets…';
    void Promise.all([...selected].sort((left, right) => left - right).map(
      (characterId) => queries.partyPackMember(characterId),
    )).then((results) => {
      if (closed) return;
      const refusal = results.find((result) => result.status === 'refused');
      if (refusal?.status === 'refused') {
        const character = characters.find(
          (candidate) => candidate.id === [...selected].sort((left, right) => left - right)[results.indexOf(refusal)],
        );
        status.value = `${character?.name ?? 'Selected character'}: ${refusal.refusal.field} — ${refusal.refusal.detail}`;
        start.disabled = false;
        return;
      }
      const exported = results.flatMap((result) =>
        result.status === 'exported' ? [result] : [],
      );
      const loaded = loadExternalPartyPack({
        schemaVersion: 2,
        partyId: 'party:stored-characters',
        allowPartial: false,
        members: exported.map((result) => result.member),
      });
      if (loaded.status !== 'loaded') {
        status.value = `Party import refused: ${loaded.refusal.reason}.`;
        start.disabled = false;
        return;
      }
      const names = new Map(
        exported.map((result) => [result.member.characterId, result.displayName]),
      );
      const encounter = composeStoredCharacterEncounter(loaded.party.members, names);
      encounterMount = mountEncounterVtt(root, {
        view: 'dm',
        sessionId: `stored-${exported.map((result) => result.member.characterId).join('-')}`,
        encounter,
      });
    }).catch((error: unknown) => {
      if (closed) return;
      status.value = error instanceof Error ? error.message : 'Character export failed.';
      start.disabled = false;
    });
  });

  return {
    close: () => {
      closed = true;
      encounterMount?.close();
    },
  };
}
