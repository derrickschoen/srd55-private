/**
 * The one directory below a module inventory root that tests write into while
 * they run (D938). A probe that has to lie in the repository (a test file that
 * Vitest's include or an ast-grep rule's `files` must reach, or a module the
 * closure walker reads) is made here, in a directory of its own, and removed
 * when its test ends. What it holds is never a repository input or a test of
 * any suite:
 *   - the module inventory (scripts/test-affected.mjs) leaves it out, so
 *     probes another test file writes or removes while a verdict is stored and
 *     read back change no salt (the ENV-TRACE witness failed on exactly that
 *     in a parallel gate, D938);
 *   - a module outside it whose import, glob or file read reaches into it
 *     fails closed, so no stored verdict depends on what it holds;
 *   - test:affected neither runs a test file in it nor stores its verdict;
 *   - vitest.config.ts leaves it out, and so does the mutation config that
 *     extends it, so a probe a killed run leaves behind is in no suite; a
 *     probe that must run through Vitest runs under
 *     tests/helpers/transient-probes.vitest.config.ts, which includes this
 *     directory alone.
 * It is gitignored, so a probe a killed run leaves behind is never committed
 * and never listed as an untracked file.
 *
 * This module imports nothing, so vitest.config.ts can read it cheaply.
 */
export const TRANSIENT_PROBES = 'tests/transient-probes';
