import playerGuideMarkdown from '../../../../docs/guides/player-build-and-share.md?raw';
import { defineScreen, type ScreenContext } from '../../screen';
import { element, listen, type Cleanup } from '../../dom';
import { playerGuideBlocks } from './player-guide';
import './styles.css';

export const PLAYER_BUILD_GUIDE_ROUTE = '/guides/player-build-and-share';

function render(context: ScreenContext): Cleanup {
  const cleanups: Cleanup[] = [];
  const back = element('a', {
    text: 'Back to characters',
    attributes: { href: '/' },
  });
  cleanups.push(listen(back, 'click', (event) => {
    event.preventDefault();
    context.router.navigate('/');
  }));
  const article = element('article', {
    className: 'player-guide-content',
    attributes: { 'data-screen': 'player-build-guide' },
  });
  for (const block of playerGuideBlocks(playerGuideMarkdown)) {
    switch (block.kind) {
      case 'heading':
        article.append(element(`h${String(block.level)}` as 'h1' | 'h2' | 'h3', {
          text: block.text,
        }));
        break;
      case 'paragraph':
        article.append(element('p', { text: block.text }));
        break;
      case 'list': {
        const list = element(block.ordered ? 'ol' : 'ul');
        list.append(...block.items.map((item) => element('li', { text: item })));
        article.append(list);
        break;
      }
    }
  }
  context.root.replaceChildren(
    element('main', { className: 'player-guide-page' }, [back, article]),
  );
  document.title = 'Build and share your character';
  return () => {
    for (const cleanup of cleanups) cleanup();
  };
}

export const screen = defineScreen({
  id: 'player-build-guide',
  matches: (route) => route.path === PLAYER_BUILD_GUIDE_ROUTE,
  render,
});

