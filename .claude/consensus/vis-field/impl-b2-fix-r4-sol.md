# VIS-FIELD B2 fix r4 (B2-F1) — sol report (resumed 01a0ad1e…)

Implemented B2-F1.

- Changed `combatSensesSchema` from `.max(5)` to `.max(6)`.
- Duplicate-kind refinement remains unchanged.
- Monsters, species grants, and background grants all share this schema and therefore the six-sense limit.
- Added a literal all-six-senses test verifying zero diagnostics and exact runtime statblock senses.
- Unknown-sense rejection and byte-for-value schema pin remain unchanged.

Generated schema diff from `npm run schema:content-pack` was exactly:

```diff
- "maxItems": 5,
+ "maxItems": 6,
```

at all three shared schema locations: species, backgrounds, and monsters. No other generated changes.

Evidence:

- Red-first: new test failed 1/1 with `Six-sense monster did not import.`
- Mutant `.max(6)` → `.max(5)`:
  - Before SHA: `ecf57b7227d5ad04faabbfb78306923bf6175994ad02db2dba01817c8cd80f52`
  - Mutant SHA: `1298613c53f740832c3211bff22df7e826cd4cff5cb1a6a00c05e0fb617503a1`
  - Failed exactly the new six-sense assertion.
  - Restored SHA: `ecf57b7227d5ad04faabbfb78306923bf6175994ad02db2dba01817c8cd80f52`
  - Restored baseline: 1/1 passed.
- `npx tsc -p tsconfig.app.json --noEmit`: exit 0.
- `npx tsc -p tsconfig.node.json --noEmit`: exit 0.
- Content-pack suite: 27/27.
- Engine-query-port suite: 17/17.
- Combined: 44/44.
- `git diff --check`: exit 0.
- Added lines over 120 columns: 0.
- Status contains exactly:
  - `src/content/content-pack.ts`
  - `docs/specs/content-pack.schema.json`
  - `tests/unit/vtt/content-pack.test.ts`

VIS-FIELD B2 FIX DONE
diff --git a/tests/unit/vtt/content-pack.test.ts b/tests/unit/vtt/content-pack.test.ts
index 344afbe1d9a00979d432ad06293a485d59dd293e..803dbf320029e1316fa1fb4b2eb12551aa56f1f4
--- a/tests/unit/vtt/content-pack.test.ts
+++ b/tests/unit/vtt/content-pack.test.ts
@@ -157,6 +157,39 @@
     ]);
   });
 
+  it('accepts all six distinct combat senses and carries them into the runtime statblock', () => {
+    const candidate = fixture() as {
+      monsters: Array<{ statblock: { senses: unknown[] } }>;
+    };
+    candidate.monsters[0]!.statblock.senses = [
+      { kind: 'normal_sight' },
+      { kind: 'darkvision', rangeFeet: 60 },
+      { kind: 'blindsight', rangeFeet: 10 },
+      { kind: 'tremorsense', rangeFeet: 30 },
+      { kind: 'truesight', rangeFeet: 120 },
+      { kind: 'devils_sight', rangeFeet: 120 },
+    ];
+    const content = loaded(loadContentPack(candidate));
+    const monster = content.monsters[0];
+    if (monster === undefined) throw new Error('Six-sense monster did not import.');
+    const profile = importedMonsterProfile(monster, {
+      combatantId: 'combatant:six-sense-import',
+      tokenId: 'token:six-sense-import',
+    });
+    const expectedSenses = [
+      { kind: 'normal_sight' },
+      { kind: 'darkvision', rangeFeet: 60 },
+      { kind: 'blindsight', rangeFeet: 10 },
+      { kind: 'tremorsense', rangeFeet: 30 },
+      { kind: 'truesight', rangeFeet: 120 },
+      { kind: 'devils_sight', rangeFeet: 120 },
+    ];
+
+    expect(content.diagnostics).toEqual([]);
+    expect(monster.statblock.senses).toEqual(expectedSenses);
+    expect(profile.rules.senses).toEqual(expectedSenses);
+  });
+
   it('refuses an unknown imported sense with a typed record diagnostic', () => {
     const candidate = fixture() as {
       monsters: Array<{ statblock: { senses: unknown[] } }>;
