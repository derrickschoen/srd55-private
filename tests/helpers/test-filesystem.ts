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
  rmSync,
  symlinkSync,
  statSync,
  writeFileSync,
} from 'node:fs';
