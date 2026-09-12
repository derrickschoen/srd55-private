Implemented all four S10 review findings.

### Fixes

- F97: [report.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts) now defines an independent 11-gate inventory:
  - Full typecheck
  - Structural scan
  - Unit gate
  - Production build
  - Node runtime launch probe
  - Dist Worker Playwright
  - Browser gate
  - Cumulative targeted Vitest
  - Dev Worker Playwright
  - Runtime-parity Playwright
  - Top-down smoke Playwright
- Every missing result yields `REQUIRED_GATE_MISSING: <name>`. Tests independently omit all 11, including `node-runtime-launch`.
- F98: repository evidence accepts an injected Git reader. Tests cover exact clean and dirty results without depending on the worktree state.
- F99: supervisor evidence now requires actual UUIDv7 art request records with matching outbox/result paths. Both JSON and Markdown preserve:
  - Request ID: `018f0f23-7b5d-7a11-8abc-1234567890ab`
  - `art/outbox/<id>.request.json`
  - `art/inbox/<id>.result.json`
  Missing evidence emits no invented request IDs; mismatched paths make the input invalid and `PARTIAL`.
- F100: [art-exchange.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/art-exchange.md) now states that the classic renderer uses checked-in starter-art recipes through `starterArtDataUri`. Exchange-frame and `provenance.frameViews` consumption is explicitly future work.
- Updated [security-and-integration.md](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/docs/vtt-handoff/security-and-integration.md) with the fixed inventory and art-evidence input contract.

### Assertions

Baseline: 29 `expect(` calls and 5 tests.  
Current: 37 `expect(` calls and 7 tests.

Replacements:

- Commit-regex and dirty-worktree-dependent assertions were replaced by exact clean and dirty repository objects.
- The not-run expectation now names the inventory gate `full-typecheck`.
- The invalid-input expectation retained its result and now uses deterministic Git evidence.
- No assertion was weakened or deleted; eight assertion sites and two tests were added.

### Gates

- Pre-test `git status --short`: exactly four expected modified files.
- `npx vitest run --configLoader runner tests/unit/vtt/handoff-report.test.ts tests/unit/vtt/handoff-publish.test.ts`
  - Exit 0; 2 files, 12/12 tests.
- `npx vitest run --configLoader runner tests/unit/vtt/handoff-package-contract.test.ts tests/unit/vtt/handoff-contract.test.ts tests/unit/vtt/engine-boundary.test.ts`
  - Exit 0; 3 files, 25/25 tests.
- `VTT_HANDOFF_ROOT="$PWD/.tmp/vtt-handoff-s10" npm run handoff:publish -- --check`
  - Exit 0.
  - Core: 8 verified.
  - Examples: 3 verified.
  - Report: 2 verified.
  - Readiness: `PARTIAL`, correctly caused by `SUPERVISOR_RESULTS_MISSING`.
- `npm run typecheck:fast`
  - Exit 0.
- `sg scan`
  - Exit 0.
- `git diff --check`
  - Exit 0.
- Forbidden-pattern scan: zero matches.
- Frozen contract and all contract/fixture hashes remain unchanged.

HANDOFF S10 R2 DONE
diff --git a/docs/vtt-handoff/art-exchange.md b/docs/vtt-handoff/art-exchange.md
index f70ef198c3255e9ca00e2b5b68c4772b19ea520e..c223d9a5e895ca3bd5168f99f56239814dccb6af
--- a/docs/vtt-handoff/art-exchange.md
+++ b/docs/vtt-handoff/art-exchange.md
@@ -18,6 +18,6 @@
 
 PNG validation checks signature, chunks, dimensions, color model, alpha expectations, pass dimensions, physical scale, pivots, and the requested facing set. The per-file limit is 64 MiB, the whole result limit is 256 MiB, the result JSON limit is 1 MiB, and provenance is limited to 4,096 entries (`tools/vtt-handoff/art-validator.ts`). Files outside the bundle, traversal paths, symlinks, changed files, hash mismatches, scale mismatches, missing facings, and incomplete results are refused.
 
-At runtime, `src/vtt/handoff/scene-snapshot.ts` maps engine asset provenance to the renderer's logical IDs. Unknown presentation has an explicit role fallback recorded in `assetFallbacks`; it does not add art data to persisted encounter or visibility-domain types. The classic top-down renderer uses the frame view/provenance when available; isometric-only input keeps its existing presentation fallback.
+At runtime, `src/vtt/handoff/scene-snapshot.ts` maps engine asset IDs to the renderer's logical IDs. Unknown presentation has an explicit role fallback recorded in `assetFallbacks`; it does not add art data to persisted encounter or visibility-domain types. The classic top-down renderer does not consume exchange frames or `provenance.frameViews`: `src/vtt/encounter-app.ts` renders checked-in starter-art recipes through `starterArtDataUri` from `src/assets/starter-art-resolver.ts`. Connecting validated exchange frames and their view provenance to that renderer is future integration work.
 
 The Windows probe is separate from art validation. `npm run windows:probe` opts in only with `VTT_WINDOWS_INTEROP=1`; it proves independent Windows-to-Linux and Linux-to-Windows byte/hash paths through the configured handoff root and removes only the named random probes (`tools/vtt-handoff/windows-probe.ts`).
diff --git a/docs/vtt-handoff/security-and-integration.md b/docs/vtt-handoff/security-and-integration.md
index 9828b4b6e8523ed3486bbc047d8660288b1d0bcd..536b734f7b008b019d733fd02a85033ff8787d88
--- a/docs/vtt-handoff/security-and-integration.md
+++ b/docs/vtt-handoff/security-and-integration.md
@@ -16,7 +16,7 @@
 
 Before declaring integration ready, run the explicit bidirectional Windows probe in `tools/vtt-handoff/windows-probe.ts`. A Windows result of `NOT_RUN`, `UNAVAILABLE`, or `FAILED` makes the overall report `PARTIAL`; only `PASSED`, together with all required gate results, permits `READY`.
 
-`npm run handoff:publish` reads supervisor evidence from the absolute or relative file named by `VTT_HANDOFF_REPORT_INPUT` or `--report-input`. That JSON has `schemaVersion:1`, nonempty `tools` entries (`name`, actual `version`, actual `command`), nonempty `gates` entries (`name`, command, required flag, status, summary, and pre-existing failures), and one `windowsProbe` result. Missing or invalid evidence produces a truthful `PARTIAL` report. `--check` compares the expected report bytes and writes nothing.
+`npm run handoff:publish` reads supervisor evidence from the absolute or relative file named by `VTT_HANDOFF_REPORT_INPUT` or `--report-input`. That JSON has `schemaVersion:1`, nonempty `tools` entries (`name`, actual `version`, actual `command`), gate results (`name`, command, status, summary, and pre-existing failures), actual UUIDv7 `artRequests` with matching outbox/result paths, and one `windowsProbe` result. The required gate inventory is fixed in `tools/vtt-handoff/report.ts`; an input cannot make a gate optional, and every omitted inventory result is named in the `PARTIAL` reasons. Missing or invalid evidence also produces `PARTIAL`. `--check` compares the expected report bytes and writes nothing.
 
 ## Future deployment work
 
diff --git a/tests/unit/vtt/handoff-report.test.ts b/tests/unit/vtt/handoff-report.test.ts
index 43d20483d2e428a8ceb9246585d5b1d4a969d285..7216a332a8cd2ed8db61a18169ea6b194739e6ed
--- a/tests/unit/vtt/handoff-report.test.ts
+++ b/tests/unit/vtt/handoff-report.test.ts
@@ -6,9 +6,13 @@
   existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync,
 } from '../../helpers/test-filesystem';
 import {
-  buildHandoffReport, publishHandoffReport, type SupervisorReportInput,
+  buildHandoffReport, publishHandoffReport, REQUIRED_HANDOFF_GATES,
+  type ReportGitReader, type SupervisorReportInput,
 } from '../../../tools/vtt-handoff/report';
 
+const COMMIT = '0123456789abcdef0123456789abcdef01234567';
+const REQUEST_ID = '018f0f23-7b5d-7a11-8abc-1234567890ab';
+
 function root(): string {
   return mkdtempSync(join(tmpdir(), 'vtt-handoff-report-'));
 }
@@ -23,10 +27,17 @@
       { name: 'node', version: process.version, command: 'node --version' },
       { name: 'vitest', version: '4.1.10', command: 'npx vitest run focused.test.ts' },
     ],
-    gates: [{
-      name: 'focused-contracts', command: 'npx vitest run focused.test.ts', required: true,
-      status: gateStatus, summary: gateStatus === 'PASSED' ? '2 tests passed' : '1 test failed',
-      preExistingFailures: gateStatus === 'FAILED' ? ['legacy-control: known before handoff'] : [],
+    gates: REQUIRED_HANDOFF_GATES.map((gate, index) => ({
+      name: gate.name, command: gate.command,
+      status: index === 0 ? gateStatus : 'PASSED',
+      summary: index === 0 && gateStatus !== 'PASSED' ? '1 test failed' : 'required gate passed',
+      preExistingFailures: index === 0 && gateStatus === 'FAILED'
+        ? ['legacy-control: known before handoff'] : [],
+    })),
+    artRequests: [{
+      requestId: REQUEST_ID,
+      requestPath: `art/outbox/${REQUEST_ID}.request.json`,
+      resultPath: `art/inbox/${REQUEST_ID}.result.json`,
     }],
     windowsProbe: {
       status: windowsStatus, command: 'VTT_WINDOWS_INTEROP=1 npm run windows:probe',
@@ -35,6 +46,22 @@
   };
 }
 
+function gitReader(options: {
+  readonly tracked?: string;
+  readonly untracked?: string;
+  readonly commit?: string;
+} = {}): ReportGitReader {
+  return {
+    read(_repositoryRoot, args) {
+      const operation = args.join(' ');
+      if (operation === 'diff --name-only HEAD --') return options.tracked ?? '';
+      if (operation === 'ls-files --others --exclude-standard') return options.untracked ?? '';
+      if (operation === 'rev-parse HEAD') return options.commit ?? COMMIT;
+      throw new Error(`Unexpected Git operation: ${operation}`);
+    },
+  };
+}
+
 function inputFile(directory: string, value: SupervisorReportInput): string {
   const path = join(directory, 'supervisor-results.json');
   writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
@@ -48,6 +75,7 @@
     const order: string[] = [];
     const result = publishHandoffReport({
       repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence,
+      gitReader: gitReader(),
       hooks: { nonce: () => 'fixed', afterRename: (path) => order.push(path) },
     });
     expect(result).toMatchObject({ status: 'published', readiness: 'READY', files: 2, reasons: [] });
@@ -57,15 +85,24 @@
 
     const report = JSON.parse(readFileSync(join(handoffRoot, 'reports/claude/handoff.json'), 'utf8')) as {
       readonly readiness: string;
-      readonly repository: { readonly commit: string; readonly changedFiles: readonly string[] };
+      readonly repository: {
+        readonly name: string; readonly root: string;
+        readonly commit: string; readonly changedFiles: readonly string[];
+      };
       readonly digests: readonly { readonly path: string; readonly sha256: string; readonly length: number }[];
       readonly methods: readonly string[];
-      readonly art: { readonly sampleAssetIds: readonly string[] };
+      readonly art: {
+        readonly sampleAssetIds: readonly string[];
+        readonly requests: readonly {
+          readonly requestId: string; readonly requestPath: string; readonly resultPath: string | null;
+        }[];
+      };
       readonly limitations: readonly string[];
     };
     expect(report.readiness).toBe('READY');
-    expect(report.repository.commit).toMatch(/^[a-f0-9]{40}$/u);
-    expect(report.repository.changedFiles).toContain('tools/vtt-handoff/report.ts');
+    expect(report.repository).toEqual({
+      name: 'srd-55', root: process.cwd(), commit: COMMIT, changedFiles: [],
+    });
     expect(report.digests).toHaveLength(6);
     for (const digest of report.digests) {
       const bytes = readFileSync(join(process.cwd(), digest.path));
@@ -77,20 +114,79 @@
     }
     expect(report.methods).toEqual(['session.open', 'scene.snapshot', 'token.move', 'door.set', 'light.set']);
     expect(report.art.sampleAssetIds).toContain('token.adventurer');
+    expect(report.art.requests).toEqual([{
+      requestId: REQUEST_ID,
+      requestPath: `art/outbox/${REQUEST_ID}.request.json`,
+      resultPath: `art/inbox/${REQUEST_ID}.result.json`,
+    }]);
     expect(report.limitations.join('\n')).toContain('F94/F95');
     expect(readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8'))
       .toContain('contract-level contracts/v1/READY.json denotes only the atomic core bundle');
+    expect(readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8'))
+      .toContain(`Request ${REQUEST_ID}: art/outbox/${REQUEST_ID}.request.json`);
     expect(publishHandoffReport({
       repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
+      gitReader: gitReader(),
     })).toMatchObject({ status: 'verified', readiness: 'READY', files: 2 });
   });
 
+  it('records clean and dirty repository evidence through the injected Git reader', () => {
+    const handoffRoot = root();
+    const evidence = inputFile(handoffRoot, input());
+    const clean = buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader() });
+    expect(clean.repository).toEqual({
+      name: 'srd-55', root: process.cwd(), commit: COMMIT, changedFiles: [],
+    });
+    const dirty = buildHandoffReport({
+      repositoryRoot: process.cwd(), inputPath: evidence,
+      gitReader: gitReader({
+        tracked: 'src/changed.ts\ndocs/vtt-handoff/runtime-api.md\n',
+        untracked: 'tools/new-report-input.json\nsrc/changed.ts\n',
+      }),
+    });
+    expect(dirty.repository).toEqual({
+      name: 'srd-55', root: process.cwd(), commit: COMMIT,
+      changedFiles: ['docs/vtt-handoff/runtime-api.md', 'src/changed.ts', 'tools/new-report-input.json'],
+    });
+  });
+
+  it('makes every individually omitted inventory result PARTIAL, including the launch probe', () => {
+    const handoffRoot = root();
+    for (const omitted of REQUIRED_HANDOFF_GATES) {
+      const candidate = input();
+      const evidence = inputFile(handoffRoot, {
+        ...candidate,
+        gates: candidate.gates.filter((gate) => gate.name !== omitted.name),
+      });
+      const report = buildHandoffReport({
+        repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader(),
+      });
+      expect(report.readiness, omitted.name).toBe('PARTIAL');
+      expect(report.reasons, omitted.name).toContain(`REQUIRED_GATE_MISSING: ${omitted.name}`);
+    }
+    expect(REQUIRED_HANDOFF_GATES.map((gate) => gate.name)).toEqual([
+      'full-typecheck',
+      'structural-scan',
+      'unit-gate',
+      'production-build',
+      'node-runtime-launch',
+      'worker-dist-playwright',
+      'browser-gate',
+      'cumulative-targeted-vitest',
+      'worker-dev-playwright',
+      'runtime-parity-playwright',
+      'top-down-smoke-playwright',
+    ]);
+  });
+
   it('reports PARTIAL with failed or not-run required gates instead of planned success', () => {
     const handoffRoot = root();
     const evidence = inputFile(handoffRoot, input('FAILED'));
-    const result = publishHandoffReport({ repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence });
+    const result = publishHandoffReport({
+      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, gitReader: gitReader(),
+    });
     expect(result).toMatchObject({
-      readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_FAILED: focused-contracts'],
+      readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_FAILED: full-typecheck'],
     });
     const markdown = readFileSync(join(handoffRoot, 'reports/claude/READY.md'), 'utf8');
     expect(markdown).toContain('# VTT handoff: PARTIAL');
@@ -98,14 +194,17 @@
     expect(markdown).not.toContain('# VTT handoff: READY\n');
 
     const notRunEvidence = inputFile(handoffRoot, input('NOT_RUN'));
-    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: notRunEvidence }))
-      .toMatchObject({ readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_NOT_RUN: focused-contracts'] });
+    expect(buildHandoffReport({
+      repositoryRoot: process.cwd(), inputPath: notRunEvidence, gitReader: gitReader(),
+    })).toMatchObject({ readiness: 'PARTIAL', reasons: ['REQUIRED_GATE_NOT_RUN: full-typecheck'] });
   });
 
   it('reports PARTIAL when the Windows probe is UNAVAILABLE even though every required gate passed', () => {
     const handoffRoot = root();
     const evidence = inputFile(handoffRoot, input('PASSED', 'UNAVAILABLE'));
-    const report = buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: evidence });
+    const report = buildHandoffReport({
+      repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader(),
+    });
     expect(report.readiness).toBe('PARTIAL');
     expect(report.reasons).toEqual(['WINDOWS_PROBE_UNAVAILABLE']);
     expect(report.evidence?.gates.every((gate) => gate.status === 'PASSED')).toBe(true);
@@ -115,15 +214,31 @@
   });
 
   it('makes absent or invalid supervisor results PARTIAL and check mode performs no repair', () => {
-    const absent = buildHandoffReport({ repositoryRoot: process.cwd() });
+    const absent = buildHandoffReport({ repositoryRoot: process.cwd(), gitReader: gitReader() });
     expect(absent).toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_MISSING'], evidence: null });
+    expect(absent.art.requests).toEqual([]);
     const handoffRoot = root();
     const invalid = join(handoffRoot, 'invalid-results.json');
     writeFileSync(invalid, '{"schemaVersion":1,"gates":[]}\n');
-    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: invalid }))
+    expect(buildHandoffReport({ repositoryRoot: process.cwd(), inputPath: invalid, gitReader: gitReader() }))
       .toMatchObject({ readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null });
+    const mismatchedArt = input();
+    const mismatchedArtPath = inputFile(handoffRoot, {
+      ...mismatchedArt,
+      artRequests: [{
+        ...mismatchedArt.artRequests[0]!,
+        requestPath: 'art/outbox/invented.request.json',
+      }],
+    });
+    expect(buildHandoffReport({
+      repositoryRoot: process.cwd(), inputPath: mismatchedArtPath, gitReader: gitReader(),
+    })).toMatchObject({
+      readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'],
+      art: { requests: [] },
+    });
     expect(() => publishHandoffReport({
       repositoryRoot: process.cwd(), handoffRoot, inputPath: invalid, check: true,
+      gitReader: gitReader(),
     })).toThrow('HANDOFF_REPORT_MISSING');
     expect(existsSync(join(handoffRoot, 'reports'))).toBe(false);
   });
@@ -131,11 +246,14 @@
   it('detects report drift in check mode without overwriting the supplied bytes', () => {
     const handoffRoot = root();
     const evidence = inputFile(handoffRoot, input());
-    publishHandoffReport({ repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence });
+    publishHandoffReport({
+      repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, gitReader: gitReader(),
+    });
     const ready = join(handoffRoot, 'reports/claude/READY.md');
     writeFileSync(ready, 'pre-existing divergent report\n');
     expect(() => publishHandoffReport({
       repositoryRoot: process.cwd(), handoffRoot, inputPath: evidence, check: true,
+      gitReader: gitReader(),
     })).toThrow('HANDOFF_REPORT_MISMATCH');
     expect(readFileSync(ready, 'utf8')).toBe('pre-existing divergent report\n');
   });
diff --git a/tools/vtt-handoff/report.ts b/tools/vtt-handoff/report.ts
index 5bb7bf976686a3730a410e8007d24f0c55428139..9496db648d6a70804a5915583b882b44213b6826
--- a/tools/vtt-handoff/report.ts
+++ b/tools/vtt-handoff/report.ts
@@ -11,16 +11,64 @@
 import { handoffPaths, type RepositoryIdentityPolicy } from './paths.ts';
 
 const resultStatusSchema = z.enum(['PASSED', 'FAILED', 'UNAVAILABLE', 'NOT_RUN']);
+const uuidV7Schema = z.string().regex(
+  /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u,
+);
+
+export const REQUIRED_HANDOFF_GATES = [
+  { name: 'full-typecheck', command: 'npx tsc -b --force' },
+  { name: 'structural-scan', command: 'sg scan' },
+  { name: 'unit-gate', command: 'npm run test:gate' },
+  { name: 'production-build', command: 'npm run build' },
+  {
+    name: 'node-runtime-launch',
+    command: 'npx vitest run --configLoader runner --config tests/integration-supervisor/vitest.config.ts tests/integration-supervisor/vtt/node-runtime-launch.launch-test.ts',
+  },
+  {
+    name: 'worker-dist-playwright',
+    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dist npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts',
+  },
+  {
+    name: 'browser-gate',
+    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npm run test:gate:browser',
+  },
+  { name: 'cumulative-targeted-vitest', command: 'npx vitest run --configLoader runner <S0-S10 targeted specs>' },
+  {
+    name: 'worker-dev-playwright',
+    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 VTT_HANDOFF_ARTIFACT=dev npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts worker.spec.ts',
+  },
+  {
+    name: 'runtime-parity-playwright',
+    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts runtime-parity.spec.ts',
+  },
+  {
+    name: 'top-down-smoke-playwright',
+    command: 'PLAYWRIGHT_PORT=4410 PLAYWRIGHT_WORKERS=1 npx playwright test --config=tests/browser/vtt-handoff/playwright.config.ts top-down-smoke.spec.ts',
+  },
+] as const;
+
 const supervisorReportInputSchema = z.strictObject({
   schemaVersion: z.literal(1),
   tools: z.array(z.strictObject({
     name: z.string().min(1), version: z.string().min(1), command: z.string().min(1),
   })).min(1),
   gates: z.array(z.strictObject({
-    name: z.string().min(1), command: z.string().min(1), required: z.boolean(),
+    name: z.string().min(1), command: z.string().min(1),
     status: resultStatusSchema, summary: z.string(),
     preExistingFailures: z.array(z.string()),
   })).min(1),
+  artRequests: z.array(z.strictObject({
+    requestId: uuidV7Schema,
+    requestPath: z.string().min(1),
+    resultPath: z.string().min(1).nullable(),
+  }).superRefine((request, context) => {
+    if (request.requestPath !== `art/outbox/${request.requestId}.request.json`) {
+      context.addIssue({ code: 'custom', message: 'Art request path does not match requestId.' });
+    }
+    if (request.resultPath !== null && request.resultPath !== `art/inbox/${request.requestId}.result.json`) {
+      context.addIssue({ code: 'custom', message: 'Art result path does not match requestId.' });
+    }
+  })).min(1),
   windowsProbe: z.strictObject({
     status: resultStatusSchema, command: z.string().min(1), reason: z.string().nullable(),
   }),
@@ -46,6 +94,7 @@
     readonly changedFiles: readonly string[];
   };
   readonly evidence: SupervisorReportInput | null;
+  readonly requiredGates: typeof REQUIRED_HANDOFF_GATES;
   readonly digests: readonly DigestRecord[];
   readonly adapters: readonly { readonly name: string; readonly path: string }[];
   readonly methods: readonly string[];
@@ -54,6 +103,7 @@
     readonly inbox: 'art/inbox';
     readonly review: 'art/review';
     readonly sampleAssetIds: readonly string[];
+    readonly requests: SupervisorReportInput['artRequests'];
   };
   readonly limitations: readonly string[];
   readonly connectionPoints: readonly string[];
@@ -72,6 +122,10 @@
   readonly afterRename?: (relativePath: string) => void;
 }
 
+export interface ReportGitReader {
+  read(repositoryRoot: string, args: readonly string[]): string;
+}
+
 const DIGEST_PATHS = [
   'contracts/vtt-handoff/v1/protocol.schema.json',
   'contracts/vtt-handoff/v1/art.schema.json',
@@ -107,20 +161,25 @@
   return createHash('sha256').update(bytes).digest('hex');
 }
 
-function git(repositoryRoot: string, args: readonly string[]): string {
-  const result = spawnSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8' });
-  if (result.status !== 0) throw new Error(`REPORT_GIT_FAILED: ${result.stderr.trim()}`);
-  return result.stdout.trim();
-}
+const systemGitReader: ReportGitReader = {
+  read(repositoryRoot, args) {
+    const result = spawnSync('git', ['-C', repositoryRoot, ...args], { encoding: 'utf8' });
+    if (result.status !== 0) throw new Error(`REPORT_GIT_FAILED: ${result.stderr.trim()}`);
+    return result.stdout.trim();
+  },
+};
 
-function repositoryEvidence(repositoryRoot: string): HandoffReport['repository'] {
+function repositoryEvidence(
+  repositoryRoot: string,
+  gitReader: ReportGitReader,
+): HandoffReport['repository'] {
   const changed = [
-    ...git(repositoryRoot, ['diff', '--name-only', 'HEAD', '--']).split('\n'),
-    ...git(repositoryRoot, ['ls-files', '--others', '--exclude-standard']).split('\n'),
+    ...gitReader.read(repositoryRoot, ['diff', '--name-only', 'HEAD', '--']).split('\n'),
+    ...gitReader.read(repositoryRoot, ['ls-files', '--others', '--exclude-standard']).split('\n'),
   ].filter((path) => path.length > 0);
   return {
     name: 'srd-55', root: repositoryRoot,
-    commit: git(repositoryRoot, ['rev-parse', 'HEAD']),
+    commit: gitReader.read(repositoryRoot, ['rev-parse', 'HEAD']),
     changedFiles: [...new Set(changed)].sort(),
   };
 }
@@ -149,10 +208,10 @@
   if (input === null) {
     reasons.push(inputReason ?? 'SUPERVISOR_RESULTS_MISSING');
   } else {
-    const required = input.gates.filter((gate) => gate.required);
-    if (required.length === 0) reasons.push('REQUIRED_GATES_MISSING');
-    for (const gate of required) {
-      if (gate.status !== 'PASSED') reasons.push(`REQUIRED_GATE_${gate.status}: ${gate.name}`);
+    for (const required of REQUIRED_HANDOFF_GATES) {
+      const gate = input.gates.find((candidate) => candidate.name === required.name);
+      if (gate === undefined) reasons.push(`REQUIRED_GATE_MISSING: ${required.name}`);
+      else if (gate.status !== 'PASSED') reasons.push(`REQUIRED_GATE_${gate.status}: ${gate.name}`);
     }
     if (input.windowsProbe.status !== 'PASSED') {
       reasons.push(`WINDOWS_PROBE_${input.windowsProbe.status}`);
@@ -164,6 +223,7 @@
 export function buildHandoffReport(options: {
   readonly repositoryRoot: string;
   readonly inputPath?: string;
+  readonly gitReader?: ReportGitReader;
 }): HandoffReport {
   const supplied = readSupervisorInput(options.inputPath);
   const status = readiness(supplied.input, supplied.reason);
@@ -175,14 +235,16 @@
     schemaVersion: 1,
     readiness: status.value,
     reasons: status.reasons,
-    repository: repositoryEvidence(options.repositoryRoot),
+    repository: repositoryEvidence(options.repositoryRoot, options.gitReader ?? systemGitReader),
     evidence: supplied.input,
+    requiredGates: REQUIRED_HANDOFF_GATES,
     digests,
     adapters: ADAPTERS,
     methods: [...HANDOFF_METHODS],
     art: {
       outbox: 'art/outbox', inbox: 'art/inbox', review: 'art/review',
       sampleAssetIds: ART_REQUEST_DEFINITIONS.map((entry) => entry.assetId),
+      requests: supplied.input?.artRequests ?? [],
     },
     limitations: HANDOFF_LIMITATIONS,
     connectionPoints: CONNECTION_POINTS,
@@ -217,9 +279,13 @@
     ...(evidence?.gates.map((gate) => {
       const existing = gate.preExistingFailures.length === 0
         ? 'none' : gate.preExistingFailures.join('; ');
-      return `- ${gate.name}: ${gate.status}; required=${String(gate.required)}; command=${gate.command}; summary=${gate.summary}; pre-existing failures=${existing}`;
+      return `- ${gate.name}: ${gate.status}; command=${gate.command}; summary=${gate.summary}; pre-existing failures=${existing}`;
     }) ?? ['- No supervisor results supplied.']),
     '',
+    '## Required gate inventory',
+    '',
+    ...report.requiredGates.map((gate) => `- ${gate.name}: ${gate.command}`),
+    '',
     '## Windows probe',
     '',
     evidence === null
@@ -239,6 +305,10 @@
     '',
     `- Paths: ${report.art.outbox}, ${report.art.inbox}, ${report.art.review}`,
     `- Sample asset IDs: ${report.art.sampleAssetIds.join(', ')}`,
+    ...(report.art.requests.length === 0
+      ? ['- Request bundles: none supplied.']
+      : report.art.requests.map((request) =>
+        `- Request ${request.requestId}: ${request.requestPath}; result=${request.resultPath ?? 'not supplied'}`)),
     '',
     '## Known limitations',
     '',
@@ -290,6 +360,7 @@
   readonly check?: boolean;
   readonly identityPolicy?: RepositoryIdentityPolicy;
   readonly hooks?: ReportPublishHooks;
+  readonly gitReader?: ReportGitReader;
 } = {}): ReportPublishResult {
   const paths = handoffPaths({
     ...(options.repositoryRoot === undefined ? {} : { repositoryRoot: options.repositoryRoot }),
@@ -299,6 +370,7 @@
   const report = buildHandoffReport({
     repositoryRoot: paths.repositoryRoot,
     ...(options.inputPath === undefined ? {} : { inputPath: options.inputPath }),
+    ...(options.gitReader === undefined ? {} : { gitReader: options.gitReader }),
   });
   const entries = [
     { path: 'reports/claude/handoff.json', bytes: json(report) },
