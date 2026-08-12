// Minimal, standalone config for this suite. Deliberately does not reach
// outside this directory (no shared root config, no aliasing into the
// repo's src/ or tests/) so it can run both as `tools/sim/` inside the
// srd-55 repo and as a fully self-contained folder anywhere else.
//
// Exports a plain object rather than importing `defineConfig` from
// `vitest/config`: that import must resolve `vitest` from *this file's own*
// location when Vite loads the config, which requires a local `vitest`
// dependency next to it. A plain object needs no such resolution and is
// still validated the same way by vitest's config loader — this keeps the
// suite runnable via bare `npx vitest run` with no local node_modules,
// while behaving identically once vitest is a real devDependency (as it is
// in the repo this ships into).
export default {
  test: {
    include: ['*.test.ts'],
    // The statistical suite runs several thousand-trial Monte Carlo samples
    // per assertion; keep a generous ceiling so a slow CI runner doesn't
    // false-fail on timeout rather than on an actual regression.
    testTimeout: 20_000,
  },
};
