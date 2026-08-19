# Stryker vitest-runner misreports import-crashing mutants as Survived

**Status: known upstream bug, open — [stryker-js #6150](https://github.com/stryker-mutator/stryker-js/issues/6150). We run a local patch.**

## The bug

`VitestTestRunner.run()` decides mutant survival from per-test results plus
`ctx.state.errorsSet` ("errors outside of a test run"). A mutant that makes a
source module **throw during import** produces *file-level* errors instead
(`file.result.state === 'fail'`): the crashed file's tests never produce
results, are dropped by `.filter((test) => test.result)`, nothing is marked
Failed, and the mutant is reported **Survived**.

This codebase kills static mutants precisely by import-time throws — the
fail-closed oracle/consistency checks that run at module load. So without the
patch, entire classes of genuinely-killed static mutants are misreported.
Observed here (2026-08-16, core+runner 9.6.1, vitest 3.2.7, threads pool):
run 1 reported 1,172 static Survived; a manual application of one such mutant
failed 22 of 310 test files at import.

It is **not** a caching problem: with default `isolate: true`, each test file
runs in a fresh worker thread and source modules re-execute per file.

## The local patch

`node_modules/@stryker-mutator/vitest-runner/dist/src/vitest-test-runner.js`,
inserted in `run()` before the `errorsSet` check:

```js
const failedFiles = this.ctx.state.getFiles().filter((file) =>
  file.result?.state === 'fail' && (file.result?.errors?.length ?? 0) > 0);
if (!failure && failedFiles.length > 0) {
    const errorText = failedFiles.map((file) =>
      `${file.name}: ${file.result.errors.map((e) => e.message).join('; ')}`).join('\n');
    return { status: DryRunStatus.Error, errorMessage: `Test file(s) failed to load: ${errorText}` };
}
```

A/B proof: identical narrow config (spell-source-reader.ts:880–900, 36
mutants) — stock runner: 16 Survived; patched runner: 7 Survived +
9 RuntimeError (all the module-load-throw cases).

**node_modules is ephemeral**, so the patch is applied automatically:
`npm run test:mutation` runs `scripts/patch-stryker-vitest-runner.mjs` first,
which idempotently inserts the block above and **fails loudly** if the
installed runner's anchor text is missing (version drift) — running the stock
runner would silently produce false Survived verdicts. The Stryker packages
are pinned exactly to 9.6.1 in package.json for this reason. Verify a fresh
apply with the narrow experiment configs `stryker.exp1.json` /
`stryker.exp2.json`.

## Why `tsconfigFile: "tsconfig.json"` is correct here (and only here)

The repo gate rule says never `npx tsc -p tsconfig.json` — the root config is
a solution file (`files: []`, only project references) and `tsc -p` exits 0
checking nothing. Stryker's typescript-checker is different: it uses
`ts.createSolutionBuilder` (see
`node_modules/@stryker-mutator/typescript-checker/dist/src/typescript-compiler.js`),
which walks project references the way `tsc -b` does. Evidence it works: the
2026-08-16 full run reported 1,455 CompileError mutants. Do not "fix" the
Stryker config to point at `tsconfig.app.json`; do not use the root config
with `tsc -p`.

## What NOT to do

- Do not enable `ignoreStatic` — it discards static mutants instead of scoring
  them; with the patch they are scored correctly and cheaply (first failing
  file bails).
- Do not re-add the `Regex` mutator: excluded deliberately (mutating regex
  literals only breaks patterns, it cannot produce a plausible wrong number).
