import { describe, expect, it } from 'vitest';
import { serviceWorkerRegistrationUrl } from '../../../src/pwa/register-service-worker';

describe('service worker registration URL', () => {
  it('composes the worker from a root deployment BASE_URL', () => {
    expect(serviceWorkerRegistrationUrl('/')).toBe('/service-worker.js');
  });

  it('composes the worker from a subpath deployment BASE_URL', () => {
    expect(serviceWorkerRegistrationUrl('/srd-55/')).toBe(
      '/srd-55/service-worker.js',
    );
  });

  it('normalizes a BASE_URL without a trailing slash', () => {
    expect(serviceWorkerRegistrationUrl('/preview')).toBe(
      '/preview/service-worker.js',
    );
  });
});
