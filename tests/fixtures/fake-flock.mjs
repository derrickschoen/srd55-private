import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

const argumentsList = process.argv.slice(2);
const logPath = process.env.DND_GATE_STUB_LOG;
if (logPath === undefined) throw new Error('Fake flock received no log path.');
appendFileSync(logPath, `${JSON.stringify({ type: 'flock', arguments: argumentsList })}\n`);

if (argumentsList[0] !== '-w' || argumentsList[1] !== '7200' || argumentsList[2] !== '/tmp/dnd-gate.lock') {
  throw new Error(`Unexpected flock arguments: ${JSON.stringify(argumentsList)}`);
}
const executable = argumentsList[3];
if (executable === undefined) throw new Error('Fake flock received no command.');
const result = spawnSync(executable, argumentsList.slice(4), {
  cwd: process.cwd(),
  env: process.env,
  stdio: 'inherit',
});
if (result.error !== undefined) throw result.error;
process.exitCode = result.status ?? 1;
