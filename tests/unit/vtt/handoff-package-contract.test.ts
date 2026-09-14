import { readFileSync } from '../../helpers/test-filesystem';
import { describe, expect, it } from 'vitest';

describe('VTT handoff dependency contract', () => {
  it('declares exact direct dependencies without a Node pin', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8')) as {
      readonly dependencies: Readonly<Record<string, string>>;
      readonly devDependencies: Readonly<Record<string, string>>;
      readonly engines?: unknown;
    };
    expect(manifest.devDependencies.ajv).toBe('8.18.0');
    expect(manifest.dependencies.ws).toBe('8.18.3');
    expect(manifest.devDependencies['@types/ws']).toBe('8.18.1');
    expect(manifest.engines).toBeUndefined();
  });
});
