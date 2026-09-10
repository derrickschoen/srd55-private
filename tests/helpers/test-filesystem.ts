/**
 * Filesystem operations used to exercise filesystem behavior or inspect
 * ephemeral outputs. Stable repository inputs belong in test-inputs.ts.
 */
export {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  statSync,
  writeFileSync,
} from 'node:fs';
