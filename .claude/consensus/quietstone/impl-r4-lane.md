Implemented the three remaining probe-harness fixes:

- D611 panel is exactly Fable-high, Astra-high, and Sol-high in both plan commands.
- Claude receives `--effort high`, the actual augmented question schema via `--json-schema`, and its `structured_output` is locally validated.
- Claude runs from a temporary directory containing only `board.png`, with project settings, hooks, MCP, persistence, and unrelated tools disabled.
- PNG dimensions and visible coordinate-label count are verified locally. Failure becomes `blocked:image_unverified` with a null score; schema failures become `schema_rejected`.
- Added transport-contract tests covering argv, cwd, environment, schema delivery, structured decoding, image verification, effort recording, cleanup, and failure classification.
- No model calls were made.

Gate results:

- `npx vitest run --configLoader runner tests/unit/tools/ai-dm-screenshot-probe.test.ts`
  - 1 file passed, 30/30 tests.
- `npx vitest run --configLoader runner tests/unit/assets/*.test.ts`
  - 13 files passed, 214/214 tests.
- `npm run typecheck:fast`
  - Exit 0.
- `sg scan`
  - Exit 0, no findings.
- `git diff --check`
  - Exit 0.
- `npm run art:import -- --check --package art/incoming/01a08cc4-06f0-70ab-86cb-7662bba9f8ba-quietstone-classic --oracle .tmp/runs/quietstone/candidate-rgba-oracle.json`
  - Verified 58 authored assets.
- `claude --help`
  - Exit 0; this was the only Claude invocation.
- Plan SHA-256:
  - `c047a9940c19b4e6bd04eca13d3266ce25d0e7756dfa90de09f50f7aa367c900`
- Frozen contracts SHA-256 remains:
  - `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`

No git write commands were used.

QUIETSTONE R4 DONE
diff --git a/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md b/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md
index 7326219a7a06528bb62a6b27b53ea2b303d52e43..8fa829144b822aaf9089c7eaa3ad0b901953238b
--- a/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md
+++ b/.tmp-plans/2026-09-10-quietstone-classic-art-integration-plan.md
@@ -208,7 +208,7 @@
   from the contact-sheet tool; full gate `gate-wt4.sh wt-quietstone` (4330) in a quiet window.
 - Probe (executable, comparable): baseline = `tools/ai-dm-screenshot-probe.ts` run in a throwaway detached
   worktree at the branch's merge-base 85168bc5 (same application revision, old art); candidate = the same
-  command on the branch head. Identical args: `--models gpt-5.6-luna:low,gpt-5.6-sol:high,claude:claude-fable-5-1:high --states 24 --seed
+  command on the branch head. Identical args: `--models claude:claude-fable-5-1:high,gpt-6-astra:high,gpt-5.6-sol:high --states 24 --seed
   20260910 --primer general --board-glyphs <default> --capture-tile-px 128 --board-input png --generation
   quietstone-eval`, images-root under `dnd-slim-runs/quietstone-probe-{baseline,candidate}-images/` and output
   JSONL under `.tmp/runs/quietstone/probe-{baseline,candidate}.jsonl`; snapshot port 4591; `--simulate`
@@ -261,11 +261,15 @@
    art sources remain at 85168bc5), so both revisions use the same three-seat harness;
    both revisions use `--images-root dnd-slim-runs/quietstone-probe-{baseline,candidate}-images`; Codex seats
    use `model:effort` and the Fable seat uses `claude:claude-fable-5-1:high`, routed through
-   `claude --model claude-fable-5-1 -p`; a transport failure produces a blocked row with no score and blocks
+   `claude --model claude-fable-5-1 --effort high -p`; its question schema is passed with `--json-schema`,
+   structured output is decoded from the JSON result envelope, and its judge runs in a one-PNG scratch
+   directory under safe/restricted mode with settings, hooks, project instructions, slash commands, and MCP
+   disabled. The structured result must echo the PNG dimensions and visible coordinate-label count; a mismatch
+   is `blocked:image_unverified`. A transport failure produces a blocked row with no score and blocks
    comparison rather than contributing a zero;
    the baseline command (from the detached worktree) is
    `BOARD_SNAPSHOT_PREVIEW_PORT=4591 npx vite-node tools/ai-dm-screenshot-probe.ts --models
-   gpt-5.6-luna:low,gpt-5.6-sol:high,claude:claude-fable-5-1:high --states 24 --seed 20260910 --primer
+   claude:claude-fable-5-1:high,gpt-6-astra:high,gpt-5.6-sol:high --states 24 --seed 20260910 --primer
    general --board-glyphs none --capture-tile-px 128 --board-input png --generation quietstone-eval
    --images-root dnd-slim-runs/quietstone-probe-baseline-images --out
    .tmp/runs/quietstone/probe-baseline.jsonl`; after copying and hashing that JSONL, the candidate command is
diff --git a/tests/unit/tools/ai-dm-screenshot-probe.test.ts b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
index a2de05ee552902612d88323ac4a9b055d62cfa28..e697d580146ddf6a2b138e9c750aca6593785b46
--- a/tests/unit/tools/ai-dm-screenshot-probe.test.ts
+++ b/tests/unit/tools/ai-dm-screenshot-probe.test.ts
@@ -69,6 +69,7 @@
 import {
   mkdtemp,
   readFile,
+  readdir,
   rm,
   writeFile,
 } from '../../helpers/test-filesystem-promises';
@@ -449,6 +450,7 @@
       prompt: '',
       schemaPath: '',
       imagePath: '',
+      imageVerification: null,
       truth,
     });
     expect(
@@ -947,13 +949,34 @@
   it('routes Codex and Claude model specifications through their provider CLIs', async () => {
     const invocations: ProbeCommandInvocation[] = [];
     const routingSheet = deriveScreenshotFactSheet(everyClassState());
-    const answerer = providerAwareScreenshotAnswerer((invocation) => {
+    const directory = await mkdtemp(join('/tmp', 'quietstone-provider-contract-'));
+    const schemaPath = join(directory, 'q1.schema.json');
+    await writeFile(schemaPath, JSON.stringify(probeAnswerJsonSchema('Q1')), 'utf8');
+    const imagePath = resolve('public/assets/art/map-floor-stone-v1.png');
+    const imageBytes = await readFile(imagePath);
+    let claudeSchema: unknown = null;
+    const answerer = providerAwareScreenshotAnswerer(async (invocation) => {
       invocations.push(invocation);
       const rawAnswer = JSON.stringify(truthAnswer(routingSheet, 'Q1'));
+      if (invocation.executable === 'claude') {
+        expect(await readdir(invocation.cwd)).toEqual(['board.png']);
+        expect(await readFile(join(invocation.cwd, 'board.png'))).toEqual(imageBytes);
+        const schemaIndex = invocation.args.indexOf('--json-schema');
+        expect(schemaIndex).toBeGreaterThan(0);
+        claudeSchema = JSON.parse(invocation.args[schemaIndex + 1] ?? 'null') as unknown;
+      }
       return Promise.resolve({
         stdout: invocation.executable === 'codex'
           ? `${JSON.stringify({ type: 'item.completed', item: { type: 'agent_message', text: rawAnswer } })}\n`
-          : rawAnswer,
+          : JSON.stringify({
+              type: 'result',
+              subtype: 'success',
+              is_error: false,
+              structured_output: {
+                ...truthAnswer(routingSheet, 'Q1'),
+                imageVerification: { widthPx: 128, heightPx: 128, coordinateLabelCount: 10 },
+              },
+            }),
         stderr: '',
         code: 0,
         signal: null,
@@ -964,32 +987,109 @@
       effort: 'high',
       question: 'Q1',
       prompt: 'answer this fixture',
-      schemaPath: '/tmp/q1.schema.json',
-      imagePath: '/tmp/board.png',
+      schemaPath,
+      imagePath,
+      imageVerification: { widthPx: 128, heightPx: 128, coordinateLabelCount: 10 },
       truth: truthAnswer(routingSheet, 'Q1'),
     } as const;
-    await answerer.answer({ ...baseRequest, provider: 'codex', model: 'gpt-5.6-sol' });
-    await answerer.answer({ ...baseRequest, provider: 'claude', model: 'claude-fable-5-1' });
+    try {
+      const codexResult = await answerer.answer({ ...baseRequest, provider: 'codex', model: 'gpt-5.6-sol' });
+      const claudeResult = await answerer.answer({ ...baseRequest, provider: 'claude', model: 'claude-fable-5-1' });
+      expect(codexResult.error).toBeNull();
+      expect(claudeResult.error).toBeNull();
+      expect(parseProbeAnswer('Q1', claudeResult.rawAnswer)).toEqual(truthAnswer(routingSheet, 'Q1'));
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
 
     expect(invocations.map((invocation) => invocation.executable)).toEqual(['codex', 'claude']);
     expect(invocations[0]?.args).toContain('gpt-5.6-sol');
-    expect(invocations[0]?.args).toContain('/tmp/board.png');
+    expect(invocations[0]?.args).toContain(imagePath);
     expect(invocations[0]?.stdin).toBe('answer this fixture');
-    expect(invocations[1]?.args.slice(0, 3)).toEqual(['--model', 'claude-fable-5-1', '-p']);
-    expect(invocations[1]?.args[3]).toContain('Read the board PNG at /tmp/board.png');
+    expect(invocations[1]?.args.slice(0, 4)).toEqual(['--model', 'claude-fable-5-1', '--effort', 'high']);
+    expect(invocations[1]?.args).toEqual(expect.arrayContaining([
+      '--safe-mode', '--restricted', '--strict-mcp-config', '--disable-slash-commands',
+      '--mcp-config', '{"mcpServers":{}}', '--settings', '{}', '--setting-sources', '',
+      '--system-prompt', 'You are an isolated screenshot evaluator. Use only the supplied prompt, JSON schema, and board.png.',
+      '--no-session-persistence', '--no-chrome', '--tools', 'Read', '--allowedTools', 'Read',
+      '--permission-mode', 'dontAsk', '--permission-prompts', 'none', '--output-format', 'json',
+    ]));
+    expect(invocations[1]?.args[invocations[1]?.args.indexOf('-p') + 1]).toContain('/tmp/quietstone-claude-judge-');
     expect(invocations[1]?.stdin).toBeNull();
+    expect(invocations[1]?.cwd).not.toContain('/home/vagrant/PhpstormProjects');
+    expect(invocations[1]?.env['CLAUDE_CODE_SAFE_MODE']).toBe('1');
+    expect(Object.keys(invocations[1]?.env ?? {}).filter((name) => name.startsWith('CLAUDE_CODE_'))).toEqual(['CLAUDE_CODE_SAFE_MODE']);
+    expect(invocations[1]?.env['CODEX_HOME']).toBeUndefined();
+    expect(claudeSchema).toEqual(expect.objectContaining({
+      additionalProperties: false,
+      required: expect.arrayContaining(['version', 'question', 'creatures', 'imageVerification']),
+      properties: expect.objectContaining({
+        creatures: expect.any(Object),
+        imageVerification: expect.objectContaining({
+          additionalProperties: false,
+          required: ['widthPx', 'heightPx', 'coordinateLabelCount'],
+        }),
+      }),
+    }));
+    await expect(readdir(invocations[1]?.cwd ?? '')).rejects.toThrow();
 
     const parsed = parseScreenshotProbeArgs([
-      '--models', 'gpt-5.6-luna:low,claude:claude-fable-5-1:high',
+      '--models', 'claude:claude-fable-5-1:high,gpt-6-astra:high,gpt-5.6-sol:high',
       '--states', '1', '--seed', '1', '--images-root', 'dnd-slim-runs/provider-images',
       '--out', 'dnd-slim-runs/provider.jsonl', '--generation', 'provider-fixture',
     ]);
     expect(parsed.models).toEqual([
-      { provider: 'codex', model: 'gpt-5.6-luna', effort: 'low' },
       { provider: 'claude', model: 'claude-fable-5-1', effort: 'high' },
+      { provider: 'codex', model: 'gpt-6-astra', effort: 'high' },
+      { provider: 'codex', model: 'gpt-5.6-sol', effort: 'high' },
     ]);
   });
 
+  it('blocks unverifiable Claude images and locally classifies structured schema mismatches', async () => {
+    const directory = await mkdtemp(join('/tmp', 'quietstone-provider-failures-'));
+    const schemaPath = join(directory, 'q1.schema.json');
+    await writeFile(schemaPath, JSON.stringify(probeAnswerJsonSchema('Q1')), 'utf8');
+    const routingSheet = deriveScreenshotFactSheet(everyClassState());
+    const request = {
+      provider: 'claude',
+      model: 'claude-fable-5-1',
+      effort: 'high',
+      question: 'Q1',
+      prompt: 'answer this fixture',
+      schemaPath,
+      imagePath: resolve('public/assets/art/map-floor-stone-v1.png'),
+      imageVerification: { widthPx: 128, heightPx: 128, coordinateLabelCount: 10 },
+      truth: truthAnswer(routingSheet, 'Q1'),
+    } as const;
+    const resultEnvelope = (structuredOutput: unknown): string => JSON.stringify({
+      type: 'result', subtype: 'success', is_error: false, structured_output: structuredOutput,
+    });
+    try {
+      const imageFailure = await providerAwareScreenshotAnswerer(() => Promise.resolve({
+        stdout: resultEnvelope({
+          ...request.truth,
+          imageVerification: { widthPx: 127, heightPx: 128, coordinateLabelCount: 10 },
+        }),
+        stderr: '', code: 0, signal: null, error: null,
+      })).answer(request);
+      expect(imageFailure.errorKind).toBe('blocked');
+      expect(imageFailure.error).toContain('blocked:image_unverified');
+
+      const schemaFailure = await providerAwareScreenshotAnswerer(() => Promise.resolve({
+        stdout: resultEnvelope({
+          version: 'd576-screenshot-comprehension-v2',
+          question: 'Q1',
+          imageVerification: request.imageVerification,
+        }),
+        stderr: '', code: 0, signal: null, error: null,
+      })).answer(request);
+      expect(schemaFailure.errorKind).toBe('schema_rejected');
+      expect(schemaFailure.error).not.toContain('image_unverified');
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
+  });
+
   it('accepts png, semantic and both board inputs, defaults to png, and rejects others', () => {
     const base = [
       '--models',
@@ -1562,7 +1662,7 @@
     ).toThrow();
   });
 
-  it('classifies model transport failures as blocked without assigning zero scores', async () => {
+  it('classifies unverified image access as blocked rows without assigning zero scores', async () => {
     const artifactRoot = resolve('dnd-slim-runs');
     mkdirSync(artifactRoot, { recursive: true });
     const directory = await mkdtemp(join(artifactRoot, 'provider-blocked-test-'));
@@ -1578,12 +1678,15 @@
         snapshotService: new FakeSnapshotService(),
         answerer: {
           answer: () => Promise.resolve({
-            rawAnswer: '', wallMs: 4, tokens: null, error: 'simulated transport failure',
+            rawAnswer: '', wallMs: 4, tokens: null,
+            error: 'blocked:image_unverified: simulated image access failure',
+            errorKind: 'blocked',
           }),
         },
       });
       expect(rows).toHaveLength(14);
       expect(rows.every((row) => row.outcome === 'blocked' && row.score === null)).toBe(true);
+      expect(rows.every((row) => row.effort === 'high')).toBe(true);
       expect(strictProbeGate(rows)).toBe(false);
       expect(await readFile(config.summaryPath, 'utf8')).toContain(
         'BLOCKED — one or more model transports failed; no score is assigned.',
@@ -1596,6 +1699,35 @@
     }
   });
 
+  it('classifies locally validated Claude answer-shape failures as schema_rejected rows', async () => {
+    const artifactRoot = resolve('dnd-slim-runs');
+    mkdirSync(artifactRoot, { recursive: true });
+    const directory = await mkdtemp(join(artifactRoot, 'provider-schema-test-'));
+    try {
+      const config = parseScreenshotProbeArgs([
+        '--models', 'claude:claude-fable-5-1:high', '--states', '1', '--seed', '1',
+        '--images-root', join(directory, 'schema-images'), '--out', join(directory, 'schema.jsonl'),
+        '--generation', 'schema-fixture',
+      ]);
+      const rows = await runScreenshotProbe(config, {
+        candidates: [{ id: 'schema-fixture', state: everyClassState() }],
+        snapshotService: new FakeSnapshotService(),
+        answerer: {
+          answer: () => Promise.resolve({
+            rawAnswer: '', wallMs: 4, tokens: null,
+            error: 'Claude answer failed the supplied question schema.',
+            errorKind: 'schema_rejected',
+          }),
+        },
+      });
+      expect(rows).toHaveLength(14);
+      expect(rows.every((row) => row.outcome === 'schema_rejected' && row.score === 0)).toBe(true);
+      expect(await readFile(config.summaryPath, 'utf8')).not.toContain('**BLOCKED');
+    } finally {
+      await rm(directory, { recursive: true, force: true });
+    }
+  });
+
   it('D576-I5-COMPARISON-IDENTITY separates explicit ablation metadata from exact acceptance pairs', async () => {
     const artifactRoot = resolve('dnd-slim-runs');
     mkdirSync(artifactRoot, { recursive: true });
diff --git a/tools/ai-dm-screenshot-probe.ts b/tools/ai-dm-screenshot-probe.ts
index 20753540bd3758a4fca460abce05372d16a7f90c..db293d9fcc76afa303e3f251cf4bb9f0a7e4bcef
--- a/tools/ai-dm-screenshot-probe.ts
+++ b/tools/ai-dm-screenshot-probe.ts
@@ -1,6 +1,8 @@
 import { spawn } from 'node:child_process';
 import { createHash } from 'node:crypto';
+import { copyFileSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
 import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
+import { tmpdir } from 'node:os';
 import { basename, join, relative, resolve, sep } from 'node:path';
 import { pathToFileURL } from 'node:url';
 import { z } from 'zod';
@@ -458,6 +460,11 @@
   readonly prompt: string;
   readonly schemaPath: string;
   readonly imagePath: string | null;
+  readonly imageVerification: {
+    readonly widthPx: number;
+    readonly heightPx: number;
+    readonly coordinateLabelCount: number;
+  } | null;
   readonly truth: ProbeAnswer;
 }
 
@@ -466,6 +473,7 @@
   readonly wallMs: number;
   readonly tokens: ProbeTokenUsage | null;
   readonly error: string | null;
+  readonly errorKind?: 'blocked' | 'schema_rejected';
 }
 
 export interface ProbeAnswerer {
@@ -2047,6 +2055,44 @@
   return { rawAnswer, tokens };
 }
 
+function decodeClaudeOutput(
+  stdout: string,
+  request: ProbeAnswerRequest,
+):
+  | { readonly kind: 'answered'; readonly rawAnswer: string }
+  | { readonly kind: 'schema_rejected'; readonly error: string } {
+  const envelope = record(JSON.parse(stdout) as unknown);
+  if (envelope === null) throw new TypeError('Claude emitted a non-object JSON result.');
+  if (envelope['is_error'] === true) {
+    throw new Error(`Claude result reported an error: ${String(envelope['result'] ?? 'unknown')}`);
+  }
+  const structured = record(envelope['structured_output']);
+  if (structured === null) {
+    return { kind: 'schema_rejected', error: 'Claude emitted no structured_output object.' };
+  }
+  const expected = request.imageVerification;
+  const verification = record(structured['imageVerification']);
+  if (expected === null || verification === null ||
+      verification['widthPx'] !== expected.widthPx ||
+      verification['heightPx'] !== expected.heightPx ||
+      verification['coordinateLabelCount'] !== expected.coordinateLabelCount) {
+    throw new Error('blocked:image_unverified: Claude did not prove access to the supplied board PNG.');
+  }
+  const answer = Object.fromEntries(
+    Object.entries(structured).filter(([key]) => key !== 'imageVerification'),
+  );
+  const rawAnswer = canonicalJson(answer);
+  try {
+    parseProbeAnswer(request.question, rawAnswer);
+  } catch (error) {
+    return {
+      kind: 'schema_rejected',
+      error: error instanceof Error ? error.message : String(error),
+    };
+  }
+  return { kind: 'answered', rawAnswer };
+}
+
 export interface ProbeCommandInvocation {
   readonly executable: 'codex' | 'claude';
   readonly args: readonly string[];
@@ -2067,17 +2113,102 @@
   invocation: ProbeCommandInvocation,
 ) => Promise<ProbeCommandResult>;
 
-function commandForProbeAnswer(request: ProbeAnswerRequest): ProbeCommandInvocation {
+interface ClaudeProbePreparation {
+  readonly scratchDirectory: string;
+  readonly imagePath: string;
+  readonly schema: string;
+}
+
+function claudeJudgeEnvironment(): NodeJS.ProcessEnv {
+  const exact = new Set([
+    'HOME', 'PATH', 'USER', 'LOGNAME', 'SHELL', 'TMPDIR', 'LANG', 'LC_ALL',
+  ]);
+  const prefixes = ['ANTHROPIC_', 'AWS_', 'GOOGLE_', 'AZURE_', 'HTTP_', 'HTTPS_', 'NO_PROXY', 'SSL_'];
+  const environment = Object.fromEntries(Object.entries(process.env).filter(
+    ([name, value]) => value !== undefined && (exact.has(name) || prefixes.some((prefix) => name.startsWith(prefix))),
+  ));
+  return { ...environment, CLAUDE_CODE_SAFE_MODE: '1' };
+}
+
+function claudeStructuredSchema(schemaPath: string): string {
+  const parsed: unknown = JSON.parse(readFileSync(schemaPath, 'utf8')) as unknown;
+  const schema = record(parsed);
+  const properties = record(schema?.['properties']);
+  const required = schema?.['required'];
+  if (schema === null || properties === null || !Array.isArray(required) ||
+      !required.every((entry) => typeof entry === 'string')) {
+    throw new TypeError(`Question schema ${schemaPath} is not a strict object schema.`);
+  }
+  return canonicalJson({
+    ...schema,
+    properties: {
+      ...properties,
+      imageVerification: {
+        type: 'object',
+        additionalProperties: false,
+        properties: {
+          widthPx: { type: 'integer', minimum: 1 },
+          heightPx: { type: 'integer', minimum: 1 },
+          coordinateLabelCount: { type: 'integer', minimum: 1 },
+        },
+        required: ['widthPx', 'heightPx', 'coordinateLabelCount'],
+      },
+    },
+    required: [...required, 'imageVerification'],
+  });
+}
+
+function prepareClaudeProbe(request: ProbeAnswerRequest): ClaudeProbePreparation {
+  if (request.imagePath === null || request.imageVerification === null) {
+    throw new Error('blocked:image_unverified: Claude screenshot probes require a PNG and verification contract.');
+  }
+  const scratchDirectory = mkdtempSync(join(tmpdir(), 'quietstone-claude-judge-'));
+  const imagePath = join(scratchDirectory, 'board.png');
+  try {
+    copyFileSync(request.imagePath, imagePath);
+    if (readdirSync(scratchDirectory).join('\n') !== 'board.png') {
+      throw new Error('Claude judge scratch directory must contain only board.png.');
+    }
+    return { scratchDirectory, imagePath, schema: claudeStructuredSchema(request.schemaPath) };
+  } catch (error) {
+    rmSync(scratchDirectory, { recursive: true, force: true });
+    throw error;
+  }
+}
+
+function commandForProbeAnswer(
+  request: ProbeAnswerRequest,
+  claude: ClaudeProbePreparation | null,
+): ProbeCommandInvocation {
   if (request.provider === 'claude') {
-    const imageInstruction = request.imagePath === null
-      ? ''
-      : `\n\nRead the board PNG at ${request.imagePath} before answering.`;
+    if (claude === null) throw new Error('Claude probe preparation is missing.');
+    const imageInstruction = `\n\nUse the Read tool on ${claude.imagePath}. Return imageVerification with the exact PNG pixel width and height and the total count of visible numeric coordinate labels along the board's top and left edges. If the PNG cannot be read, do not guess.`;
     return {
       executable: 'claude',
-      args: ['--model', request.model, '-p', `${request.prompt}${imageInstruction}`],
+      args: [
+        '--model', request.model,
+        '--effort', request.effort,
+        '--safe-mode',
+        '--restricted',
+        '--strict-mcp-config',
+        '--mcp-config', '{"mcpServers":{}}',
+        '--settings', '{}',
+        '--setting-sources', '',
+        '--system-prompt', 'You are an isolated screenshot evaluator. Use only the supplied prompt, JSON schema, and board.png.',
+        '--disable-slash-commands',
+        '--no-session-persistence',
+        '--no-chrome',
+        '--tools', 'Read',
+        '--allowedTools', 'Read',
+        '--permission-mode', 'dontAsk',
+        '--permission-prompts', 'none',
+        '--output-format', 'json',
+        '--json-schema', claude.schema,
+        '-p', `${request.prompt}${imageInstruction}`,
+      ],
       stdin: null,
-      cwd: repositoryRoot,
-      env: { ...process.env },
+      cwd: claude.scratchDirectory,
+      env: claudeJudgeEnvironment(),
     };
   }
   const imageArguments = request.imagePath === null ? [] : ['-i', request.imagePath];
@@ -2132,35 +2263,61 @@
   return {
     async answer(request) {
       const started = performance.now();
-      const invocation = commandForProbeAnswer(request);
-      const result = await runner(invocation);
-      const wallMs = performance.now() - started;
-      if (result.error !== null || result.code !== 0) {
-        const exit = result.error ?? (result.code === null
-          ? `exited on signal ${result.signal ?? 'unknown'}`
-          : `exited with code ${String(result.code)}`);
+      let claude: ClaudeProbePreparation | null = null;
+      try {
+        if (request.provider === 'claude') claude = prepareClaudeProbe(request);
+      } catch (error) {
         return {
-          rawAnswer: result.stdout,
-          wallMs,
+          rawAnswer: '',
+          wallMs: performance.now() - started,
           tokens: null,
-          error: `${invocation.executable} ${exit}: ${result.stderr.slice(-4_000)}`,
+          error: error instanceof Error ? error.message : String(error),
+          errorKind: 'blocked',
         };
       }
+      const invocation = commandForProbeAnswer(request, claude);
+      let rawAnswer = '';
       try {
+        const result = await runner(invocation);
+        rawAnswer = result.stdout;
+        const wallMs = performance.now() - started;
+        if (result.error !== null || result.code !== 0) {
+          const exit = result.error ?? (result.code === null
+            ? `exited on signal ${result.signal ?? 'unknown'}`
+            : `exited with code ${String(result.code)}`);
+          return {
+            rawAnswer: result.stdout,
+            wallMs,
+            tokens: null,
+            error: `${invocation.executable} ${exit}: ${result.stderr.slice(-4_000)}`,
+            errorKind: 'blocked',
+          };
+        }
         if (request.provider === 'claude') {
-          const rawAnswer = result.stdout.trim();
-          if (rawAnswer.length === 0) throw new TypeError('Claude emitted no final answer.');
-          return { rawAnswer, wallMs, tokens: null, error: null };
+          const decoded = decodeClaudeOutput(result.stdout, request);
+          if (decoded.kind === 'schema_rejected') {
+            return {
+              rawAnswer: result.stdout,
+              wallMs,
+              tokens: null,
+              error: decoded.error,
+              errorKind: 'schema_rejected',
+            };
+          }
+          return { rawAnswer: decoded.rawAnswer, wallMs, tokens: null, error: null };
         }
         const decoded = decodeCodexOutput(result.stdout);
         return { ...decoded, wallMs, error: null };
       } catch (error) {
         return {
-          rawAnswer: result.stdout,
-          wallMs,
+          rawAnswer,
+          wallMs: performance.now() - started,
           tokens: null,
           error: error instanceof Error ? error.message : String(error),
+          errorKind: 'blocked',
         };
+      } finally {
+        if (claude !== null) rmSync(claude.scratchDirectory, { recursive: true, force: true });
       }
     },
   };
@@ -2787,6 +2944,13 @@
     imagePath: boardInput === 'semantic'
       ? null
       : join(imagesRoot, task.artifact.relativePath),
+    imageVerification: boardInput === 'semantic'
+      ? null
+      : {
+          widthPx: task.artifact.width,
+          heightPx: task.artifact.height,
+          coordinateLabelCount: task.candidate.state.bounds.columns + task.candidate.state.bounds.rows,
+        },
     truth: task.truth,
   });
   const base = {
@@ -2820,6 +2984,18 @@
     rawAnswer: result.rawAnswer,
   } as const;
   if (result.error !== null) {
+    if (result.errorKind === 'schema_rejected') {
+      return {
+        ...base,
+        outcome: 'schema_rejected',
+        score: 0,
+        hallucinations: 0,
+        confusions: ['schema rejected'],
+        answer: null,
+        normalizedAnswer: null,
+        error: result.error,
+      };
+    }
     return {
       ...base,
       outcome: 'blocked',
