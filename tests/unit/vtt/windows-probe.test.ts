import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
} from '../../helpers/test-filesystem';
import {
  windowsInteropProbe, type WindowsCommandResult, type WindowsProbeRunner,
} from '../../../tools/vtt-handoff/windows-probe';

function root(): string {
  return mkdtempSync(join(tmpdir(), 'vtt-windows-probe-'));
}

function result(status: number | null, stdout = '', stderr = ''): WindowsCommandResult {
  return { status, stdout, stderr };
}

function localName(windowsPath: string): string {
  const name = windowsPath.split('\\').at(-1);
  if (name === undefined || name.length === 0) throw new Error('test path missing');
  return name;
}

function interoperableRunner(handoffRoot: string, wrongReadHash = false): WindowsProbeRunner {
  return {
    run(command, args) {
      expect(command).toBe('powershell.exe');
      const script = args[3] ?? '';
      if (script.includes('PSVersionTable')) return result(0, '7.4.0\n');
      if (script.includes('FromBase64String')) {
        const path = args[4];
        const payload = args[5];
        if (path === undefined || payload === undefined) return result(1, '', 'missing arguments');
        writeFileSync(join(handoffRoot, localName(path)), Buffer.from(payload, 'base64'), { flag: 'wx' });
        return result(0);
      }
      if (script.includes('ComputeHash')) {
        const path = args[4];
        if (path === undefined) return result(1, '', 'missing path');
        const hash = createHash('sha256').update(readFileSync(join(handoffRoot, localName(path)))).digest('hex');
        return result(0, wrongReadHash ? '0'.repeat(64) : `${hash}\n`);
      }
      return result(1, '', 'unexpected command');
    },
  };
}

function collisionRandom(): (size: number) => Uint8Array {
  let payload = 0;
  return (size) => new Uint8Array(size).fill(size === 16 ? 9 : ++payload);
}

describe('real Windows interop probe classification', () => {
  it('returns NOT_RUN without the explicit opt-in and invokes no runner', () => {
    const run = vi.fn(() => result(1));
    const report = windowsInteropProbe({
      handoffRoot: root(), environment: { WSL_DISTRO_NAME: 'Ubuntu' }, runner: { run },
    });
    expect(report).toMatchObject({ status: 'NOT_RUN', reason: 'VTT_WINDOWS_INTEROP_NOT_ENABLED', checks: [] });
    expect(run).not.toHaveBeenCalled();
  });

  it('returns UNAVAILABLE when WSL or PowerShell is absent and never calls either a pass', () => {
    const handoffRoot = root();
    expect(windowsInteropProbe({
      handoffRoot, environment: { VTT_WINDOWS_INTEROP: '1' }, platform: 'linux',
    })).toMatchObject({ status: 'UNAVAILABLE', reason: 'WSL_UNAVAILABLE', windowsPath: null });
    const report = windowsInteropProbe({
      handoffRoot,
      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
      runner: { run: () => result(null, '', 'not found') },
    });
    expect(report).toMatchObject({ status: 'UNAVAILABLE', reason: 'POWERSHELL_UNAVAILABLE' });
    expect(report.checks).toEqual([{ name: 'powershell', passed: false, detail: 'not found' }]);
  });

  it('proves both byte directions, compares independent hashes and removes only named probes', () => {
    const handoffRoot = root();
    const sentinel = join(handoffRoot, 'keep.txt');
    writeFileSync(sentinel, 'keep\n');
    let seed = 0;
    const report = windowsInteropProbe({
      handoffRoot,
      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
      runner: interoperableRunner(handoffRoot),
      randomBytes: (size) => new Uint8Array(size).fill(seed++),
    });
    expect(report.status).toBe('PASSED');
    expect(report.windowsPath).toContain('\\\\wsl.localhost\\Ubuntu\\');
    expect(report.checks.map((check) => [check.name, check.passed])).toEqual([
      ['powershell', true], ['windows-to-linux', true], ['linux-to-windows', true], ['cleanup', true],
    ]);
    expect(readdirSync(handoffRoot)).toEqual(['keep.txt']);
    expect(readFileSync(sentinel, 'utf8')).toBe('keep\n');
  });

  it('returns FAILED for a real cross-boundary hash mismatch and still cleans named probes', () => {
    const handoffRoot = root();
    let seed = 1;
    const report = windowsInteropProbe({
      handoffRoot,
      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
      runner: interoperableRunner(handoffRoot, true),
      randomBytes: (size) => new Uint8Array(size).fill(seed++),
    });
    expect(report).toMatchObject({ status: 'FAILED', reason: 'LINUX_TO_WINDOWS_FAILED' });
    expect(report.checks).toContainEqual({ name: 'linux-to-windows', passed: false, detail: 'hash mismatch' });
    expect(report.checks.at(-1)).toEqual({ name: 'cleanup', passed: true, detail: 'named probes removed' });
    expect(readdirSync(handoffRoot)).toEqual([]);
    expect(existsSync(join(handoffRoot, '.vtt-interop'))).toBe(false);
  });

  it('refuses equal cross-direction random payloads instead of claiming two distinct proofs', () => {
    const handoffRoot = root();
    const report = windowsInteropProbe({
      handoffRoot,
      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
      runner: interoperableRunner(handoffRoot),
      randomBytes: (size) => new Uint8Array(size).fill(7),
    });
    expect(report).toMatchObject({ status: 'FAILED', reason: 'PROBE_RANDOM_COLLISION' });
    expect(report.checks).toEqual([{ name: 'powershell', passed: true, detail: '7.4.0' }]);
    expect(readdirSync(handoffRoot)).toEqual([]);
  });

  it('preserves a pre-existing exact Windows-created probe filename collision', () => {
    const handoffRoot = root();
    const token = '09'.repeat(16);
    const collision = join(handoffRoot, `.vtt-interop-${token}.windows.bin`);
    writeFileSync(collision, 'pre-existing windows bytes\n');
    const report = windowsInteropProbe({
      handoffRoot,
      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
      runner: interoperableRunner(handoffRoot),
      randomBytes: collisionRandom(),
    });
    expect(report.status).toBe('FAILED');
    expect(readFileSync(collision, 'utf8')).toBe('pre-existing windows bytes\n');
  });

  it('preserves a pre-existing exact Linux-created probe filename collision', () => {
    const handoffRoot = root();
    const token = '09'.repeat(16);
    const collision = join(handoffRoot, `.vtt-interop-${token}.linux.bin`);
    writeFileSync(collision, 'pre-existing linux bytes\n');
    const report = windowsInteropProbe({
      handoffRoot,
      environment: { VTT_WINDOWS_INTEROP: '1', WSL_DISTRO_NAME: 'Ubuntu' },
      runner: interoperableRunner(handoffRoot),
      randomBytes: collisionRandom(),
    });
    expect(report.status).toBe('FAILED');
    expect(readFileSync(collision, 'utf8')).toBe('pre-existing linux bytes\n');
    expect(readdirSync(handoffRoot)).toEqual([`.vtt-interop-${token}.linux.bin`]);
  });
});
