import '../../../vtt/styles.css';
import { defineScreen } from '../../screen';

export const screen = defineScreen({
  id: 'vtt',
  matches: (route) => route.path === '/vtt',
  render: async ({ root, route, rpc }) => {
    if (route.query.get('encounter') === 'd365') {
      const { mountD365SampleDungeon } = await import(
        '../../../vtt/d365-sample-dungeon-app'
      );
      const mounted = mountD365SampleDungeon(root, rpc);
      return () => mounted.close();
    }
    if (route.query.get('encounter') === 'reference') {
      const { mountEncounterVtt } = await import('../../../vtt/encounter-app');
      const view = route.query.get('view') === 'dm' ? 'dm' : 'player';
      const sessionId = route.query.get('session') ?? 'reference-encounter';
      const mounted = mountEncounterVtt(root, { view, sessionId });
      return () => mounted.close();
    }
    if (route.query.get('compose') === 'stored') {
      const { mountStoredCharacterEncounterComposer } = await import(
        '../../../vtt/stored-character-encounter-app'
      );
      const mounted = await mountStoredCharacterEncounterComposer(root, rpc);
      return () => mounted.close();
    }
    const { mountVtt } = await import('../../../vtt/app');
    const mounted = mountVtt(root);
    return () => mounted.close();
  },
});
