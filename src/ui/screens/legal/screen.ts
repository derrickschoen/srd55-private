import { defineScreen, type ScreenContext } from '../../screen';
import { renderLegalPage } from './legal';
import './styles.css';

function render(context: ScreenContext): () => void {
  context.root.innerHTML = renderLegalPage();
  document.title = 'Licences and attribution';

  const cleanups: Array<() => void> = [];
  for (const link of Array.from(
    context.root.querySelectorAll<HTMLAnchorElement>('a[data-router-link]'),
  )) {
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
  id: 'legal',
  matches: (route) => route.path === '/legal',
  render,
});
