import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readFileSync } from '../../helpers/test-filesystem';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

function valueImports(contents: string): readonly string[] {
  return [...contents.matchAll(/(?:import|export)\s+(?!type\b)[\s\S]*?from\s+['"]([^'"]+)['"]/gu)]
    .map((match) => match[1])
    .filter((specifier): specifier is string => specifier !== undefined);
}

describe('renderer-neutral engine boundary graph', () => {
  it('keeps the coordinator host and session service free of platform authority', () => {
    const files = [
      'src/combat/coordinator.ts',
      'src/vtt/dm-encounter-host.ts',
      'src/vtt/encounter-session-service.ts',
    ];
    const forbidden = /(?:node:fs|indexedDB|IDB(?:Database|Factory|ObjectStore)|HTMLCanvasElement|CanvasRenderingContext|globalThis\.(?:document|window)\.)/u;
    const violations = files.flatMap((file) => {
      const contents = source(file);
      return forbidden.test(contents) ? [file] : [];
    });

    expect(violations).toEqual([]);
    expect(valueImports(source('src/vtt/encounter-session-service.ts'))).not.toContain(
      './local-session-store',
    );
  });

  it('all runtime entries converge on the session reducer', () => {
    const host = source('src/vtt/dm-encounter-host.ts');
    const service = source('src/vtt/encounter-session-service.ts');
    const sessionReducer = source('src/vtt/session-encounter-reducer.ts');
    const persistence = source('src/vtt/session-persistence.ts');

    expect(service).not.toMatch(/reduce(?:SessionEncounter|VaneWarrenEncounter|Encounter)\s*\(/u);
    expect(host).toContain("import { reduceSessionEncounter } from './session-encounter-reducer';");
    expect(host).toContain('commandReducer: reduceSessionEncounter');
    expect(host).not.toMatch(/\breduceEncounter\s*\(/u);
    expect(sessionReducer).toContain("import { reduceVaneWarrenEncounter } from './vane-warren';");
    expect(sessionReducer).toContain('=> reduceVaneWarrenEncounter(state, command, rng, options);');
    expect(persistence).toContain("import { reduceSessionEncounter } from './session-encounter-reducer';");
    expect(persistence).toMatch(/const replayed = reduceSessionEncounter\(/u);
    expect(persistence.match(/const reduction = reduceEncounter\(/gu)).toHaveLength(1);
  });

  it('keeps player selectors on projection-only inputs', () => {
    const selectors = source('src/vtt/encounter-selectors.ts');
    for (const forbidden of [
      'DmView',
      'EncounterState',
      'dm-encounter-host',
      'session-persistence',
      'local-session-store',
      'document.',
      'window.',
      'HTMLCanvasElement',
      '/transports/',
    ]) {
      expect(selectors, `selector boundary contains ${forbidden}`).not.toContain(forbidden);
    }
    expect(selectors).toContain('projection: PlayerBoardProjection');
    expect(selectors).toContain('projection.visibleCells');
  });
});
