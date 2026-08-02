import { matchesLevelUpRoute } from '../../../builder/level-up-wizard';
import { createCommandsClient } from '../../../commands/client';
import { createQueriesClient } from '../../../queries/client';
import { hasSameOriginInAppHistory } from '../../router';
import { defineScreen, type ScreenContext } from '../../screen';
import { renderLevelUpLoading } from './level-up-shell';
import { createLevelUpWizard } from './level-up-wizard';
import './styles.css';

export function returnToLevelUpLaunchSurface(options: {
  readonly historyState: unknown;
  readonly currentOrigin: string;
  readonly back: () => void;
  readonly fallback: () => void;
}): void {
  if (hasSameOriginInAppHistory(options.historyState, options.currentOrigin)) {
    options.back();
    return;
  }
  options.fallback();
}

async function render(context: ScreenContext): Promise<() => void> {
  const characterId = matchesLevelUpRoute(context.route.path);
  if (characterId === null) {
    throw new Error('The level-up route requires a canonical positive character ID.');
  }

  context.root.replaceChildren(renderLevelUpLoading());
  const queries = createQueriesClient(context.rpc);
  const commands = createCommandsClient(context.rpc);
  let wizardCleanup: (() => void) | null = null;
  let disposed = false;

  const mountFreshState = async (): Promise<void> => {
    context.root.replaceChildren(renderLevelUpLoading());
    const state = await queries.levelUpState(characterId);
    if (disposed) return;
    wizardCleanup?.();
    const wizard = createLevelUpWizard({
      state,
      searchPlannedSpells: (params) =>
        queries.levelUpPlannedEligibleSpells(params),
      preview: (expectedRevision, command) => queries.previewLevelUp({
        character_id: characterId,
        expected_revision: expectedRevision,
        command,
      }),
      submit: (expectedRevision, command, operationUuid) =>
        commands.execute(
          characterId,
          expectedRevision,
          command,
          operationUuid,
        ),
      loadSheet: () => queries.sheet(characterId),
      reloadState: mountFreshState,
      cancel: () => returnToLevelUpLaunchSurface({
        historyState: window.history.state,
        currentOrigin: window.location.origin,
        back: () => window.history.back(),
        fallback: () => context.router.navigate(
          `/characters/${String(characterId)}/sheet`,
        ),
      }),
    });
    wizardCleanup = wizard.cleanup;
    context.root.replaceChildren(wizard.element);
    document.title = state.kind === 'not_found'
      ? 'Level up — character not found'
      : `Level up — ${state.character.name}`;
    wizard.focusInitial();
  };

  const onLinkClick = (event: MouseEvent): void => {
    if (
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    ) {
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>('a[data-router-link]');
    if (link === null || !context.root.contains(link)) {
      return;
    }
    event.preventDefault();
    context.router.navigate(link.href);
  };
  context.root.addEventListener('click', onLinkClick);
  await mountFreshState();
  return () => {
    disposed = true;
    wizardCleanup?.();
    context.root.removeEventListener('click', onLinkClick);
  };
}

export const screen = defineScreen({
  id: 'level-up',
  matches: (route) => matchesLevelUpRoute(route.path) !== null,
  render,
});
