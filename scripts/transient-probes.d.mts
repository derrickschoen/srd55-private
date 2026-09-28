/**
 * The one directory below a module inventory root that tests write probes into
 * while they run, each in a directory of its own. The module inventory leaves
 * it out, a module outside it that reaches into it fails closed, test:affected
 * neither runs nor caches a test file in it, and no Vitest suite but
 * tests/helpers/transient-probes.vitest.config.ts includes it.
 */
export const TRANSIENT_PROBES: 'tests/transient-probes';
