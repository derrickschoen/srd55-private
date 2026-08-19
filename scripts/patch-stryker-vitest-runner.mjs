#!/usr/bin/env node
/**
 * Idempotently applies the local fix for stryker-js #6150 to the installed
 * @stryker-mutator/vitest-runner: mutants that make a source module throw at
 * import produce file-level errors that the stock runner drops, misreporting
 * the mutant as Survived. See docs/stryker-vitest-runner-bug.md.
 *
 * Run automatically by `npm run test:mutation`. Fails LOUDLY (exit 1) if the
 * runner file is missing or the anchor text is not found (version drift) —
 * running mutation testing with the stock runner would silently produce
 * false Survived verdicts, so refusing is the only safe behavior.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RUNNER = new URL(
  '../node_modules/@stryker-mutator/vitest-runner/dist/src/vitest-test-runner.js',
  import.meta.url,
);
const MARKER = 'Test file(s) failed to load:';
const ANCHOR = '        if (!failure && this.ctx.state.errorsSet.size > 0) {';
const PATCH = `        // PATCH (stryker-js #6150): file-level import errors land in neither
        // per-test results nor state.errorsSet, so a mutant that makes a source
        // module throw on import would otherwise be misreported as Survived.
        const failedFiles = this.ctx.state.getFiles().filter((file) => file.result?.state === 'fail' && (file.result?.errors?.length ?? 0) > 0);
        if (!failure && failedFiles.length > 0) {
            const errorText = failedFiles
                .map((file) => \`\${file.name}: \${file.result.errors.map((e) => e.message).join('; ')}\`)
                .join('\\n');
            return {
                status: DryRunStatus.Error,
                errorMessage: \`Test file(s) failed to load: \${errorText}\`,
            };
        }
`;

let source;
try {
  source = readFileSync(RUNNER, 'utf8');
} catch {
  console.error('FATAL: vitest-runner not installed at expected path; run npm install first.');
  process.exit(1);
}
if (source.includes(MARKER)) {
  console.log('stryker vitest-runner: patch already applied.');
  process.exit(0);
}
if (!source.includes(ANCHOR)) {
  console.error(
    'FATAL: anchor not found in vitest-test-runner.js — the installed runner ' +
      'version differs from the one this patch targets (9.6.1). Do NOT run ' +
      'mutation testing until the patch is re-derived; the stock runner ' +
      'misreports import-crashing mutants as Survived (stryker-js #6150).',
  );
  process.exit(1);
}
writeFileSync(RUNNER, source.replace(ANCHOR, PATCH + ANCHOR));
console.log('stryker vitest-runner: patch applied.');
