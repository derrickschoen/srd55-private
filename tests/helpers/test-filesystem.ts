/**
 * Filesystem operations used to exercise filesystem behavior or inspect
 * ephemeral outputs. Stable repository inputs belong in test-inputs.ts.
 */
export {
  chmodSync,
  closeSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readFileSync,
  realpathSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  statSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
