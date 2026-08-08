import {
  GUIDED_BUILD_SCREEN_ID,
  matchesGuidedBuildRoute,
  matchesGuidedNewRoute,
} from '../../../builder/contracts';
import { browserProfileStorage } from '../../../pwa/browser-profile-storage';
import { createQueriesClient } from '../../../queries/client';
import type { Route } from '../../router';
import { defineScreen, type ScreenContext } from '../../screen';
import {
  defaultImportBackupServices,
  ImportBackupController,
} from '../character-list/import-backup-controls';
import { createAbilitiesStep } from './abilities-step';
import { createBackgroundStep } from './background-step';
import { createClassChooser } from './class-chooser';
import { createEquipmentStep } from './equipment-step';
import { createExpertiseStep } from './expertise-step';
import { renderGuidedBuildState } from './guided-builder';
import { createSkillsStep } from './skills-step';
import { createSpeciesStep } from './species-step';
import { createSpellsStep } from './spells-step';
import './styles.css';

/**
 * THE GUIDED-BUILDER SCREEN (dispatches A1 + A3).
 *
 * Shaped after `sheet/screen.ts`, the deliberately simple one: parse, at most
 * one awaited query, one render, composed cleanup. Route matching comes
 * from the seam's `matchesGuidedNewRoute` / `matchesGuidedBuildRoute` — never
 * hand-rolled, because `src/ui/app.ts` renders the FIRST matching screen in
 * module-path order and a loose matcher here would shadow another screen.
 *
 * NO SESSION STORAGE, READ OR WRITTEN. D48 deleted the pre-class draft
 * outright: `/characters/new` persists nothing until the chooser's single
 * `createGuided` call, and the build route derives its step from character
 * state alone via `queries.characters.buildState`, so a reload asks the
 * database and nothing else.
 */
function matches(route: Route): boolean {
  return (
    matchesGuidedNewRoute(route.segments) ||
    matchesGuidedBuildRoute(route.segments) !== null
  );
}

async function render(context: ScreenContext): Promise<() => void> {
  const cleanups: Array<() => void> = [];
  const characterId = matchesGuidedBuildRoute(context.route.segments);
  let view: HTMLElement;
  if (characterId === null) {
    if (!matchesGuidedNewRoute(context.route.segments)) {
      throw new Error('The guided builder requires a valid build route.');
    }
    const client = createQueriesClient(context.rpc);
    const chooser = createClassChooser({
      options: await client.guidedClassOptions(),
      createGuided: (name, classContentKey) =>
        client.createGuided(name, classContentKey),
      navigate: (path) => context.router.navigate(path),
    });
    view = chooser.element;
    cleanups.push(chooser.cleanup);
    document.title = 'Create a character';
  } else {
    const client = createQueriesClient(context.rpc);
    const state = await client.buildState(characterId);
    if (state.kind === 'ready' && state.current_step === 'abilities') {
      // The abilities step (B1). The character row supplies the BASE scores
      // the inputs prefill from (plan §3.5 — never a resolved total) and the
      // revision the atomic allocation command requires.
      const character = await client.getCharacter(characterId);
      const step = createAbilitiesStep({
        characterId,
        character,
        allocateAbilities: (method, scores, operationUuid) =>
          client.allocateAbilities({
            character_id: characterId,
            method,
            scores,
            operation_uuid: operationUuid,
            expected_revision: character.revision,
          }),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else if (state.kind === 'ready' && state.current_step === 'species') {
      // The live post-class steps (A4 species, A5 background). Every other
      // derived step still renders one of the pinned pure panels.
      const step = createSpeciesStep({
        characterId,
        options: await client.originOptions('species'),
        applyOrigin: (contentKey) =>
          client.applyOrigin(characterId, 'species', contentKey),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else if (state.kind === 'ready' && state.current_step === 'skills') {
      // S-C: the skills step. One read supplies everything it renders,
      // including the revision every addressed fill/clear command requires;
      // each successful write re-navigates and this screen re-derives.
      const skillsState = await client.skillsStep(characterId);
      const step = createSkillsStep({
        characterId,
        state: skillsState,
        fillSkillGrant: (grantId, skill, operationUuid) =>
          client.fillSkillGrant({
            character_id: characterId,
            grant_id: grantId,
            skill,
            operation_uuid: operationUuid,
            expected_revision: skillsState.revision,
          }),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else if (state.kind === 'ready' && state.current_step === 'equipment') {
      // E-B: the equipment step — the last step, so it also renders the
      // recorded/complete state (the derivation has no "done" member and a
      // finished character rests here). One read supplies both sources'
      // offerable options, the recorded choices and the completion flag.
      const equipmentState = await client.equipmentStep(characterId);
      const character = equipmentState.complete
        ? await client.getCharacter(characterId)
        : null;
      const backupController =
        character === null
          ? null
          : new ImportBackupController(
              defaultImportBackupServices(context.rpc),
            );
      const hintStorage = browserProfileStorage();
      const step = createEquipmentStep({
        characterId,
        state: equipmentState,
        ...(character === null ||
        backupController === null ||
        hintStorage === null
          ? {}
          : {
              backupHint: {
                storage: hintStorage,
                exportBackup: () =>
                  backupController.exportCharacter(character),
              },
            }),
        applyEquipment: (params) => client.applyEquipment(params),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else if (state.kind === 'ready' && state.current_step === 'expertise') {
      const expertiseState = await client.expertiseStep(characterId);
      const step = createExpertiseStep({
        characterId,
        state: expertiseState,
        fill: (grantId, skill, operationUuid) =>
          client.fillExpertiseGrant({
            character_id: characterId,
            grant_id: grantId,
            skill,
            operation_uuid: operationUuid,
            expected_revision: expertiseState.revision,
          }),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else if (state.kind === 'ready' && state.current_step === 'spells') {
      const spellsState = await client.spellsStep(characterId);
      const step = createSpellsStep({
        characterId,
        state: spellsState,
        search: (address, query) =>
          client.guidedEligibleSpells({
            character_id: characterId,
            address: { kind: address.kind, id: address.id },
            query,
          }),
        assign: (address, spell, operationUuid) =>
          client.assignGuidedSpell({
            character_id: characterId,
            address: { kind: address.kind, id: address.id },
            spell_version_id: spell.id,
            operation_uuid: operationUuid,
            expected_revision: spellsState.revision,
          }),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else if (state.kind === 'ready' && state.current_step === 'background') {
      // B3: the step gathers the whole choice — background, player-assigned
      // increases, player-chosen Origin feat (D61) — and applies it through
      // one `applyBackground` transaction, so its options carry the printed
      // pairings and the Origin feat list rather than bare names.
      const step = createBackgroundStep({
        characterId,
        options: await client.backgroundChoiceOptions(),
        applyBackground: (params) => client.applyBackground(params),
        navigate: (path) => context.router.navigate(path),
      });
      view = step.element;
      cleanups.push(step.cleanup);
    } else {
      view = renderGuidedBuildState(state);
    }
    document.title = 'Guided character builder';
  }
  context.root.replaceChildren(view);
  const stepHeading = view.querySelector<HTMLElement>('h2') ??
    view.querySelector<HTMLElement>('h1');
  stepHeading?.setAttribute('tabindex', '-1');
  stepHeading?.focus();

  const links = Array.from(
    context.root.querySelectorAll<HTMLAnchorElement>('a[data-router-link]'),
  );
  for (const link of links) {
    const onClick = (event: MouseEvent): void => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      event.preventDefault();
      context.router.navigate(link.href);
    };
    link.addEventListener('click', onClick);
    cleanups.push(() => link.removeEventListener('click', onClick));
  }

  return () => {
    for (const cleanup of cleanups) {
      cleanup();
    }
  };
}

export const screen = defineScreen({
  id: GUIDED_BUILD_SCREEN_ID,
  matches,
  render,
});
