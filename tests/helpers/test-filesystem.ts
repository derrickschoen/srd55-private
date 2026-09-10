/**
 * Filesystem operations used to exercise filesystem behavior or inspect
 * ephemeral outputs. Stable repository inputs belong in test-inputs.ts.
 */
export {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  symlinkSync,
  statSync,
  truncateSync,
  writeFileSync,
} from 'node:fs';
