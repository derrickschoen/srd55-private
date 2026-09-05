import { describe, expect, it } from 'vitest';
import {
  VTT_ROUTES,
  routedVttLink,
  type VttRoute,
} from '../../../src/vtt/app';
import { installInteractiveDocument } from '../../fixtures/interactive-dom';

function primaryClick(): Event {
  const event = new Event('click', { cancelable: true });
  Reflect.set(event, 'button', 0);
  Reflect.set(event, 'metaKey', false);
  Reflect.set(event, 'ctrlKey', false);
  Reflect.set(event, 'shiftKey', false);
  Reflect.set(event, 'altKey', false);
  return event;
}

describe('VTT route links', () => {
  it('routes every local VTT destination without starting a document navigation', () => {
    const restoreDocument = installInteractiveDocument();
    try {
      const navigated: VttRoute[] = [];
      for (const route of VTT_ROUTES) {
        const link = routedVttLink('Open route', route, (target) => {
          navigated.push(target);
          return true;
        });

        expect(link.href).toBe(route);
        expect(link.dispatchEvent(primaryClick())).toBe(false);
      }
      expect(navigated).toEqual(VTT_ROUTES);
    } finally {
      restoreDocument();
    }
  });
});
