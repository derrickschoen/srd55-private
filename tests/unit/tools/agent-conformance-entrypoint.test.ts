import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('agent conformance executable entrypoint', () => {
  it('prints a diagnostic table and exits 2 when agent binaries are unreachable', { timeout: 15_000 }, async () => {
    const child = spawn(process.execPath, [
      resolve('node_modules/vite-node/vite-node.mjs'),
      resolve('tools/agent-conformance.ts'),
      '--cli',
      'codex',
    ], {
      cwd: process.cwd(),
      env: { ...process.env, PATH: '/__dnd_agent_conformance_no_binaries__', VITEST: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: string) => { stdout += chunk; });
    child.stderr.on('data', (chunk: string) => { stderr += chunk; });
    const [exitCode] = await once(child, 'close') as [number | null, NodeJS.Signals | null];

    expect(stdout.length).toBeGreaterThan(0);
    expect(stdout).toContain('AGENT_CONFORMANCE_START');
    expect(stdout).toContain('CLI | PRESENT | VERSION | STATUS | REASON');
    expect(stdout).toContain('codex | no | - | UNVERIFIED | cli_absent');
    expect(stdout).toContain('AGENT_CONFORMANCE_SUMMARY UNVERIFIED exit=2');
    expect(stdout).toContain('REPORT_JSON');
    expect(stderr).toContain('codex | no | - | UNVERIFIED | cli_absent');
    expect(exitCode).toBe(2);
  });
});
