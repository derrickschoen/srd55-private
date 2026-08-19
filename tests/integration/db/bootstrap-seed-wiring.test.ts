import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import type { DatabaseLifecycle } from '../../../src/db/database-lifecycle';
import { getSqlite3, MemoryDatabaseStorage } from '../../helpers/open-db';

const seedHooks = {
  validateSubclassSpellReferences: vi.fn(),
  reconcileLaterSeedStep: vi.fn(),
};

type BootstrapModule = typeof import('../../../src/db/bootstrap');

let createApplicationLifecycle: BootstrapModule['createApplicationLifecycle'];

beforeAll(async () => {
  vi.doMock('../../../src/rules/srd-subclass-content', async (importOriginal) => {
    const actual = await importOriginal<
      typeof import('../../../src/rules/srd-subclass-content')
    >();
    return {
      ...actual,
      assertBundledSrdSubclassSpellReferences:
        seedHooks.validateSubclassSpellReferences,
    };
  });
  vi.doMock(
    '../../../src/rules/legacy-level-feat-choices',
    async (importOriginal) => {
      const actual = await importOriginal<
        typeof import('../../../src/rules/legacy-level-feat-choices')
      >();
      return {
        ...actual,
        reconcileLegacyLevelFeatChoices: seedHooks.reconcileLaterSeedStep,
      };
    },
  );
  // bootstrap is commonly cached by earlier integration files in a shared
  // worker. Reload only this deliberate seed-hook mock boundary.
  vi.resetModules();
  ({ createApplicationLifecycle } = await import('../../../src/db/bootstrap'));
});

afterAll(() => {
  vi.doUnmock('../../../src/rules/srd-subclass-content');
  vi.doUnmock('../../../src/rules/legacy-level-feat-choices');
  // Evict bootstrap compiled against the two hooks before another file uses it.
  vi.resetModules();
});

let lifecycle: DatabaseLifecycle | undefined;

afterEach(() => {
  lifecycle?.close();
  lifecycle = undefined;
  vi.restoreAllMocks();
  seedHooks.validateSubclassSpellReferences.mockReset();
  seedHooks.reconcileLaterSeedStep.mockReset();
});

describe('application seed wiring', () => {
  it('makes an unresolved canonical subclass spell a seed-pass failure and skips later seed steps', async () => {
    const unresolved = new Error(
      'SRD subclass 2024:subclass:life-domain references missing spell 2024:missing-subclass-spell.',
    );
    seedHooks.validateSubclassSpellReferences.mockImplementation(() => {
      throw unresolved;
    });
    const reported = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const sqlite3 = await getSqlite3();
    const openedLifecycle = createApplicationLifecycle(
      sqlite3,
      new MemoryDatabaseStorage(sqlite3),
    );
    lifecycle = openedLifecycle;

    // DatabaseLifecycle.#applySeed catches the seed-pass error: the database
    // still opens, but applicationSeed stops at the validator and does not run
    // reconciliation steps that follow it.
    expect(() => openedLifecycle.open()).not.toThrow();
    expect(openedLifecycle.isOpen).toBe(true);
    expect(seedHooks.validateSubclassSpellReferences).toHaveBeenCalledOnce();
    expect(seedHooks.reconcileLaterSeedStep).not.toHaveBeenCalled();
    expect(
      openedLifecycle.database.scalar('SELECT count(*) FROM class_definitions'),
    ).toBe(0);
    expect(reported).toHaveBeenCalledWith(
      'Bundled content could not be seeded.',
      unresolved,
    );
  });
});
