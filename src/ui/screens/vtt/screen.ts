import '../../../vtt/styles.css';
import { defineScreen } from '../../screen';

export const screen = defineScreen({
  id: 'vtt',
  matches: (route) => route.path === '/vtt',
  render: async ({ root, route }) => {
    if (route.query.get('encounter') === 'reference') {
      const { mountEncounterVtt } = await import('../../../vtt/encounter-app');
      const view = route.query.get('view') === 'dm' ? 'dm' : 'player';
      const sessionId = route.query.get('session') ?? 'reference-encounter';
      const mounted = mountEncounterVtt(root, { view, sessionId });
      return () => mounted.close();
    }
    const { mountVtt } = await import('../../../vtt/app');
    const mounted = mountVtt(root);
    return () => mounted.close();
  },
});
