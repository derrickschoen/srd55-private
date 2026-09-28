import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  classifyDatabaseBootFailure,
} from '../../../src/db/database-worker-boot';
import { degradedBootReasonData } from '../../../src/db/degraded-boot-reason';
import { RpcError } from '../../../src/rpc/protocol';
import {
  LOCAL_DATABASE_RESET_CONFIRMATION,
  localDatabaseExportFilename,
  renderDatabaseRecoveryShell,
  type DatabaseRecoveryServices,
  type LocalDatabaseNeedsReset,
  type SavedDatabaseFile,
} from '../../../src/ui/database-recovery-shell';
import { STALE_CATALOG_MARKER } from '../../fixtures/stale-catalog-marker';
import {
  elementText,
  installInteractiveDocument,
  interactiveElement,
  type InteractiveTestElement,
} from '../../fixtures/interactive-dom';

/**
 * PC-EXPORT-TRUTH fix 2 (codex r2 P1): the owner accepted a local database
 * reset for a stale catalog marker (D923 Q11), so the boot screen must make it
 * COMPLETABLE — name what is stale, save the rescue copy, and reset only on
 * an explicit confirmation. The failure below is the classifier's own output
 * for the worker's wire reason, not a hand-built screen model.
 */
let restoreDocument: (() => void) | undefined;

beforeEach(() => {
  restoreDocument = installInteractiveDocument();
});

afterEach(() => {
  restoreDocument?.();
  restoreDocument = undefined;
});

const MARKER = STALE_CATALOG_MARKER.migrationId;
const WORKER_DETAIL = `The stored database predates this build's catalog data update "${MARKER}", so "system.info" is unavailable.`;
const NOW = new Date('2042-06-07T08:09:10.123Z');

function staleMarkerFailure(): LocalDatabaseNeedsReset {
  const failure = classifyDatabaseBootFailure(new RpcError(
    'schema_mismatch',
    WORKER_DETAIL,
    degradedBootReasonData({
      kind: 'catalog_data_marker_disagreement',
      migrationId: MARKER,
      remedy: 'reset_local_database',
    }),
  ));
  if (failure.kind !== 'local_database_needs_reset') {
    throw new Error(`The stale marker classified as ${failure.kind}.`);
  }
  return failure;
}

interface Harness {
  readonly services: DatabaseRecoveryServices;
  readonly events: string[];
  readonly saved: SavedDatabaseFile[];
  readonly confirmations: string[];
}

function harness(options: {
  readonly confirm?: boolean;
  readonly exportBytes?: Uint8Array | Error;
  readonly reset?: Error;
} = {}): Harness {
  const events: string[] = [];
  const saved: SavedDatabaseFile[] = [];
  const confirmations: string[] = [];
  return {
    events,
    saved,
    confirmations,
    services: {
      exportDatabase: () => {
        events.push('export');
        const bytes = options.exportBytes ?? new Uint8Array([83, 81, 76]);
        return bytes instanceof Error ? Promise.reject(bytes) : Promise.resolve(bytes);
      },
      resetDatabase: () => {
        events.push('reset');
        return options.reset === undefined
          ? Promise.resolve({ reset: true } as const)
          : Promise.reject(options.reset);
      },
      confirm: (message) => {
        events.push('confirm');
        confirmations.push(message);
        return options.confirm ?? false;
      },
      save: (file) => {
        events.push('save');
        saved.push(file);
      },
      now: () => NOW,
      recovered: () => {
        events.push('recovered');
      },
    },
  };
}

function render(services: DatabaseRecoveryServices) {
  const root = document.createElement('div');
  const shell = renderDatabaseRecoveryShell(root, staleMarkerFailure(), services);
  const view = interactiveElement(root);
  const find = (selector: string): InteractiveTestElement => {
    const found = view.querySelector(selector);
    if (found === null) throw new Error(`Nothing matches ${selector}.`);
    return found;
  };
  return {
    shell,
    root,
    view,
    main: find('main'),
    heading: find('h1'),
    status: find('output'),
    exportButton: find('[data-testid="export-local-database"]'),
    resetButton: find('[data-testid="reset-local-database"]'),
    progress: find('[data-testid="database-recovery-progress"]'),
  };
}

describe('the degraded-boot recovery screen', () => {
  it('names the stale catalog data update and offers exactly the export and the reset', () => {
    const screen = render(harness().services);

    expect(screen.main.getAttribute('data-boot-failure')).toBe('local_database_needs_reset');
    expect(screen.main.getAttribute('data-degraded-reason')).toBe('catalog_data_marker_disagreement');
    expect(screen.heading.textContent).toBe('Your local database was made by an earlier build');
    expect(screen.status.value).toContain(`"${MARKER}"`);
    // Never "ready": every route stays behind the database gate.
    expect(screen.status.getAttribute('data-ready')).toBe('false');
    expect(screen.view.querySelectorAll('button').map((button) => button.textContent))
      .toEqual(['Export database', 'Reset local database']);
    expect(elementText(screen.root)).toContain(WORKER_DETAIL);
    expect(elementText(screen.root)).not.toContain('Failed:');
  });

  it('Export database saves the stored bytes, deletes nothing and never resets', async () => {
    const stored = new Uint8Array([0x53, 0x51, 0x4c, 0x69, 0x74, 0x65, 0x00, 0xff]);
    const run = harness({ exportBytes: stored });
    const screen = render(run.services);

    screen.exportButton.click();
    await screen.shell.idle();

    expect(run.events).toEqual(['export', 'save']);
    expect(run.saved).toHaveLength(1);
    const [file] = run.saved;
    if (file === undefined) throw new Error('Nothing was saved.');
    expect(file.filename).toBe('srd-55-local-database-2042-06-07T08-09-10Z.sqlite3');
    expect(file.contents.type).toBe('application/vnd.sqlite3');
    expect([...new Uint8Array(await file.contents.arrayBuffer())]).toEqual([...stored]);
    expect(screen.progress.textContent).toBe(
      'Saved srd-55-local-database-2042-06-07T08-09-10Z.sqlite3 (8 bytes). Nothing was deleted.',
    );
    expect(screen.exportButton.disabled).toBe(false);
    expect(screen.resetButton.disabled).toBe(false);
  });

  it('a failed export says so and saves nothing', async () => {
    const run = harness({ exportBytes: new Error('storage handle closed') });
    const screen = render(run.services);

    screen.exportButton.click();
    await screen.shell.idle();

    expect(run.events).toEqual(['export']);
    expect(screen.progress.textContent).toBe('Export failed: storage handle closed');
  });

  it('Reset local database asks first, and a declined confirmation deletes nothing', async () => {
    const run = harness({ confirm: false });
    const screen = render(run.services);

    screen.resetButton.click();
    await screen.shell.idle();

    expect(run.events).toEqual(['confirm']);
    expect(run.confirmations).toEqual([LOCAL_DATABASE_RESET_CONFIRMATION]);
    expect(LOCAL_DATABASE_RESET_CONFIRMATION).toContain('permanently deletes');
    expect(LOCAL_DATABASE_RESET_CONFIRMATION).toContain('Export database');
    expect(screen.progress.textContent).toBe('Reset cancelled. Nothing was deleted.');
  });

  it('a confirmed reset resets, then hands the boot back exactly once', async () => {
    const run = harness({ confirm: true });
    const screen = render(run.services);

    screen.resetButton.click();
    await screen.shell.idle();

    expect(run.events).toEqual(['confirm', 'reset', 'recovered']);
  });

  it('a failed reset says so, keeps the screen usable and does not claim recovery', async () => {
    const run = harness({ confirm: true, reset: new RpcError('handler_error', 'replace failed') });
    const screen = render(run.services);

    screen.resetButton.click();
    await screen.shell.idle();

    expect(run.events).toEqual(['confirm', 'reset']);
    expect(screen.progress.textContent).toBe('Reset failed: replace failed');
    expect(screen.resetButton.disabled).toBe(false);
    expect(screen.exportButton.disabled).toBe(false);
  });

  it('names the export file by the UTC second it was taken', () => {
    expect(localDatabaseExportFilename(new Date('2026-09-27T21:05:09.999Z')))
      .toBe('srd-55-local-database-2026-09-27T21-05-09Z.sqlite3');
  });
});
