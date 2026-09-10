import { createHash, randomBytes as systemRandomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { uncPathFor } from './paths.ts';

export type WindowsProbeStatus = 'PASSED' | 'NOT_RUN' | 'UNAVAILABLE' | 'FAILED';

export interface WindowsProbeCheck {
  readonly name: 'powershell' | 'windows-to-linux' | 'linux-to-windows' | 'cleanup';
  readonly passed: boolean;
  readonly detail: string;
}

export interface WindowsProbeResult {
  readonly status: WindowsProbeStatus;
  readonly linuxPath: string;
  readonly windowsPath: string | null;
  readonly checks: readonly WindowsProbeCheck[];
  readonly reason: string | null;
}

export interface WindowsCommandResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
}

export interface WindowsProbeRunner {
  run(command: string, args: readonly string[]): WindowsCommandResult;
}

const systemRunner: WindowsProbeRunner = {
  run(command, args) {
    const result = spawnSync(command, args, { encoding: 'utf8' });
    return { status: result.status, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
  },
};

function sha256(bytes: Uint8Array): string {
  return createHash('sha256').update(bytes).digest('hex');
}

function configuredRoot(value: string | undefined): string {
  if (value === undefined || !isAbsolute(value)) throw new Error('VTT_HANDOFF_ROOT_ABSOLUTE_REQUIRED');
  return resolve(value);
}

export function windowsInteropProbe(options: {
  readonly handoffRoot?: string;
  readonly environment?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly runner?: WindowsProbeRunner;
  readonly randomBytes?: (size: number) => Uint8Array;
} = {}): WindowsProbeResult {
  const environment = options.environment ?? process.env;
  const linuxPath = configuredRoot(options.handoffRoot ?? environment.VTT_HANDOFF_ROOT);
  const distribution = environment.WSL_DISTRO_NAME?.trim();
  const windowsPath = distribution === undefined || distribution.length === 0 ? null : uncPathFor(linuxPath, distribution);
  if (environment.VTT_WINDOWS_INTEROP !== '1') {
    return { status: 'NOT_RUN', linuxPath, windowsPath, checks: [], reason: 'VTT_WINDOWS_INTEROP_NOT_ENABLED' };
  }
  if ((options.platform ?? process.platform) !== 'linux' || distribution === undefined || distribution.length === 0) {
    return { status: 'UNAVAILABLE', linuxPath, windowsPath: null, checks: [], reason: 'WSL_UNAVAILABLE' };
  }
  const runner = options.runner ?? systemRunner;
  const checks: WindowsProbeCheck[] = [];
  const availability = runner.run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.ToString()']);
  if (availability.status !== 0) {
    return { status: 'UNAVAILABLE', linuxPath, windowsPath, checks: [{ name: 'powershell', passed: false, detail: availability.stderr.trim() || 'powershell.exe unavailable' }], reason: 'POWERSHELL_UNAVAILABLE' };
  }
  checks.push({ name: 'powershell', passed: true, detail: availability.stdout.trim() });
  const randomness = options.randomBytes ?? systemRandomBytes;
  const token = Buffer.from(randomness(16)).toString('hex');
  const windowsName = `.vtt-interop-${token}.windows.bin`;
  const linuxName = `.vtt-interop-${token}.linux.bin`;
  const windowsLinuxFile = join(linuxPath, windowsName);
  const linuxFile = join(linuxPath, linuxName);
  const windowsFile = `${windowsPath}\\${windowsName}`;
  const windowsLinuxView = `${windowsPath}\\${linuxName}`;
  mkdirSync(linuxPath, { recursive: true });
  const fromWindows = Buffer.from(randomness(64));
  const fromLinux = Buffer.from(randomness(64));
  if (fromWindows.equals(fromLinux)) {
    return { status: 'FAILED', linuxPath, windowsPath, checks, reason: 'PROBE_RANDOM_COLLISION' };
  }
  let status: WindowsProbeStatus = 'FAILED';
  let reason: string | null = 'WINDOWS_PROBE_FAILED';
  try {
    const writeResult = runner.run('powershell.exe', [
      '-NoProfile', '-NonInteractive', '-Command',
      '& { param($p,$b) $bytes=[Convert]::FromBase64String($b); $s=[IO.File]::Open($p,[IO.FileMode]::CreateNew,[IO.FileAccess]::Write,[IO.FileShare]::None); try {$s.Write($bytes,0,$bytes.Length); $s.Flush($true)} finally {$s.Dispose()} }',
      windowsFile, fromWindows.toString('base64'),
    ]);
    const windowsToLinux = writeResult.status === 0 && existsSync(windowsLinuxFile) && sha256(readFileSync(windowsLinuxFile)) === sha256(fromWindows);
    checks.push({ name: 'windows-to-linux', passed: windowsToLinux, detail: windowsToLinux ? sha256(fromWindows) : writeResult.stderr.trim() || 'hash mismatch' });
    if (!windowsToLinux) {
      reason = 'WINDOWS_TO_LINUX_FAILED';
    } else {

      writeFileSync(linuxFile, fromLinux, { flag: 'wx', mode: 0o600 });
      const readResult = runner.run('powershell.exe', [
        '-NoProfile', '-NonInteractive', '-Command',
        '& { param($p) $s=[IO.File]::Open($p,[IO.FileMode]::Open,[IO.FileAccess]::Read,[IO.FileShare]::Read); try {$h=[Security.Cryptography.SHA256]::Create(); try {([BitConverter]::ToString($h.ComputeHash($s))).Replace(\'-\',\'\').ToLowerInvariant()} finally {$h.Dispose()}} finally {$s.Dispose()} }',
        windowsLinuxView,
      ]);
      const linuxToWindows = readResult.status === 0 && readResult.stdout.trim().toLowerCase() === sha256(fromLinux);
      checks.push({ name: 'linux-to-windows', passed: linuxToWindows, detail: linuxToWindows ? sha256(fromLinux) : readResult.stderr.trim() || 'hash mismatch' });
      status = linuxToWindows ? 'PASSED' : 'FAILED';
      reason = linuxToWindows ? null : 'LINUX_TO_WINDOWS_FAILED';
    }
  } catch (error) {
    status = 'FAILED';
    reason = error instanceof Error ? error.message : 'WINDOWS_PROBE_FAILED';
  }
  let cleanupPassed = true;
  for (const path of [windowsLinuxFile, linuxFile]) {
    try {
      if (existsSync(path)) unlinkSync(path);
    } catch {
      cleanupPassed = false;
    }
  }
  checks.push({ name: 'cleanup', passed: cleanupPassed, detail: cleanupPassed ? 'named probes removed' : 'named probe cleanup failed' });
  if (!cleanupPassed) return { status: 'FAILED', linuxPath, windowsPath, checks, reason: 'PROBE_CLEANUP_FAILED' };
  return { status, linuxPath, windowsPath, checks, reason };
}

if (process.env.VITEST === undefined && process.argv[1] !== undefined &&
  (fileURLToPath(import.meta.url) === process.argv[1] || process.argv[1].endsWith('/vite-node'))) {
  const report = windowsInteropProbe();
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.status !== 'PASSED') process.exitCode = 1;
}
