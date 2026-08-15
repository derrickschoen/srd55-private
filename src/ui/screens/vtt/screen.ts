import '../../../vtt/styles.css';
import { defineScreen } from '../../screen';

export const screen = defineScreen({
  id: 'vtt',
  matches: (route) => route.path === '/vtt',
  render: async ({ root }) => {
    const { mountVtt } = await import('../../../vtt/app');
    const mounted = mountVtt(root);
    return () => mounted.close();
  },
});
