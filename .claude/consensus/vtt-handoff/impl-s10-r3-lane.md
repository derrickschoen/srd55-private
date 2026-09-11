Implemented F101 only.

Changes:

- Added a `gates.superRefine` uniqueness check in [report.ts](/home/vagrant/PhpstormProjects/dnd-wt-vtt-handoff/tools/vtt-handoff/report.ts).
- Duplicate gate names now invalidate supervisor evidence, yielding:
  - `readiness: PARTIAL`
  - `reasons: ["SUPERVISOR_RESULTS_INVALID"]`
  - `evidence: null`
- Added regressions for both conflicting orders:
  - `PASSED` then `FAILED`
  - `FAILED` then `PASSED`
- Report rendering for valid evidence is unchanged.

Gates:

- `git status --short` before testing: only the two intended files modified.
- `npx vitest run --configLoader runner tests/unit/vtt/handoff-report.test.ts tests/unit/vtt/handoff-publish.test.ts`
  - Exit 0; 2 files, 14/14 tests.
- `npm run typecheck:fast`
  - Exit 0.
- `sg scan`
  - Exit 0.
- `git diff --check`
  - Exit 0.
- Forbidden-pattern scan: zero matches.
- Frozen contract hash remains `0f0e1d8fd8c28a4af74791132ab3536297feb7a60cbe0668827307f9edef18e1`.

Assertions:

- Baseline: 37 `expect(` calls.
- Current: 39.
- Added:
  - Exact `PARTIAL`/`SUPERVISOR_RESULTS_INVALID`/null-evidence assertion.
  - Explicit assertion that neither ordering returns `READY`.
- No existing assertions were changed, removed, or weakened.

HANDOFF S10 R3 DONE
diff --git a/tests/unit/vtt/handoff-report.test.ts b/tests/unit/vtt/handoff-report.test.ts
index 7216a332a8cd2ed8db61a18169ea6b194739e6ed..6fa75182b0cd9938b16b4cc42bb6845da4cb1076
--- a/tests/unit/vtt/handoff-report.test.ts
+++ b/tests/unit/vtt/handoff-report.test.ts
@@ -179,6 +179,30 @@
     ]);
   });
 
+  it.each(['passed-then-failed', 'failed-then-passed'] as const)(
+    'rejects conflicting duplicate gate results ordered %s',
+    (order) => {
+      const handoffRoot = root();
+      const candidate = input();
+      const passed = candidate.gates.find((gate) => gate.name === 'unit-gate');
+      if (passed === undefined) throw new Error('The unit-gate fixture is unavailable.');
+      const failed = {
+        ...passed, status: 'FAILED' as const, summary: 'conflicting duplicate failure',
+      };
+      const gates = order === 'passed-then-failed'
+        ? [...candidate.gates, failed]
+        : [failed, ...candidate.gates];
+      const evidence = inputFile(handoffRoot, { ...candidate, gates });
+      const report = buildHandoffReport({
+        repositoryRoot: process.cwd(), inputPath: evidence, gitReader: gitReader(),
+      });
+      expect(report).toMatchObject({
+        readiness: 'PARTIAL', reasons: ['SUPERVISOR_RESULTS_INVALID'], evidence: null,
+      });
+      expect(report.readiness).not.toBe('READY');
+    },
+  );
+
   it('reports PARTIAL with failed or not-run required gates instead of planned success', () => {
     const handoffRoot = root();
     const evidence = inputFile(handoffRoot, input('FAILED'));
diff --git a/tools/vtt-handoff/report.ts b/tools/vtt-handoff/report.ts
index 9496db648d6a70804a5915583b882b44213b6826..a8111dc68e2f3beff96b0496e0db3eb45811fdbd
--- a/tools/vtt-handoff/report.ts
+++ b/tools/vtt-handoff/report.ts
@@ -56,7 +56,18 @@
     name: z.string().min(1), command: z.string().min(1),
     status: resultStatusSchema, summary: z.string(),
     preExistingFailures: z.array(z.string()),
-  })).min(1),
+  })).min(1).superRefine((gates, context) => {
+    const names = new Set<string>();
+    for (const [index, gate] of gates.entries()) {
+      if (names.has(gate.name)) {
+        context.addIssue({
+          code: 'custom', path: [index, 'name'],
+          message: `Duplicate gate result: ${gate.name}`,
+        });
+      }
+      names.add(gate.name);
+    }
+  }),
   artRequests: z.array(z.strictObject({
     requestId: uuidV7Schema,
     requestPath: z.string().min(1),
