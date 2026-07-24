import { defineScreen } from '../../screen';
import { renderCharacterList } from './character-list';
import './styles.css';

export const screen = defineScreen({
  id: 'character-list',
  matches: (route) => route.path === '/',
  render: renderCharacterList,
});
