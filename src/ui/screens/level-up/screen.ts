import { matchesLevelUpRoute } from '../../../builder/level-up-wizard';
import { createQueriesClient } from '../../../queries/client';
import { defineScreen, type ScreenContext } from '../../screen';
import { renderLevelUpLoading } from './level-up-shell';
import { createLevelUpWizard } from './level-up-wizard';
import './styles.css';

async function render(context: ScreenContext): Promise<() => void> {
  const characterId = matchesLevelUpRoute(context.route.path);
  if (characterId === null) {
    throw new Error('The level-up route requires a canonical positive character ID.');
  }

  context.root.replaceChildren(renderLevelUpLoading());
  const state = await createQueriesClient(context.rpc).levelUpState(characterId);
  const wizard = createLevelUpWizard({
    state,
    cancel: () => context.router.navigate(
      `/characters/${String(characterId)}/sheet`,
    ),
  });
  context.root.replaceChildren(wizard.element);
  document.title = state.kind === 'not_found'
    ? 'Level up — character not found'
    : `Level up — ${state.character.name}`;

  const cleanups: Array<() => void> = [wizard.cleanup];
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
  cleanups.push(() => context.root.removeEventListener('click', onLinkClick));

  wizard.focusInitial();
  return () => cleanups.forEach((cleanup) => cleanup());
}

export const screen = defineScreen({
  id: 'level-up',
  matches: (route) => matchesLevelUpRoute(route.path) !== null,
  render,
});
