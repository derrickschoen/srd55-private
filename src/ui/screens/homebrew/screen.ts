import { defineScreen } from '../../screen';
import { renderHomebrewLibrary } from './homebrew-library';
import './styles.css';

export const screen = defineScreen({
  id: 'homebrew-library',
  matches: (route) => route.path === '/homebrew' || (
    route.segments.length === 3 &&
    route.segments[0] === 'homebrew' &&
    route.segments[1] === 'drafts'
  ) || route.path === '/homebrew/archive' || (
    route.segments.length === 3 && route.segments[0] === 'homebrew' &&
    route.segments[1] === 'delete'
  ) || (
    route.segments.length === 4 && route.segments[0] === 'homebrew' &&
    route.segments[1] === 'replacements'
  ),
  render: renderHomebrewLibrary,
});
