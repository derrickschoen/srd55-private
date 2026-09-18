# VIS-FIELD B2 r1 — sol BLOCKED (fresh 01a0ad1e…, 150 k tokens): the generated content-pack JSON schema is outside the manifest

OfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
 const TURN_PROPOSAL_RESOLVER = createPureTurnProposalResolver(OFFER_ENVIRONMENT);
 
+function legacyDocument(
+  state: EncounterState,
+  foggedCells: unknown,
+): Record<string, unknown> {
+  return {
+    ...(JSON.parse(JSON.stringify(state)) as Record<string, unknown>),
+    foggedCells,
+  };
+}
+
+function minimalState(key: string, bounds: EncounterState['bounds']): EncounterState {
+  const actor = monsterProfile(key);
+  return createEncounter({
+    bounds,
+    combatants: [actor],
+    tokens: [placedToken(actor, 0)],
+  });
+}
+
 function placedState(
   seed: number,
   positions: ReadonlyMap<CombatantId, GridCell>,
@@ -54,6 +83,191 @@
 }
 
 describe('canonical engine query port', () => {
+  it('ENGINE_QUERY_VISIBILITY_EQUALS_CANONICAL_DETECTOR including located outcomes', () => {
+    const observerBase = monsterProfile('query-visibility-observer');
+    const observer = {
+      ...observerBase,
+      rules: {
+        ...observerBase.rules,
+        senses: [
+          { kind: 'normal_sight' as const },
+          { kind: 'tremorsense' as const, rangeFeet: 5 },
+        ],
+      },
+    };
+    const located = playerProfile('query-visibility-located');
+    const seen = playerProfile('query-visibility-seen');
+    const unseen = playerProfile('query-visibility-unseen');
+    const hidden = playerProfile('query-visibility-hidden');
+    const created = createEncounter({
+      bounds: { columns: 5, rows: 1 },
+      combatants: [observer, located, seen, unseen, hidden],
+      tokens: [
+        placedToken(observer, 0),
+        placedToken(located, 1),
+        placedToken(seen, 2),
+        placedToken(unseen, 3),
+        placedToken(hidden, 4),
+      ],
+    });
+    const state: EncounterState = {
+      ...created,
+      environment: {
+        ...created.environment,
+        lightRegions: [{
+          id: 'query-visibility-darkness',
+          level: 'darkness',
+          cells: [{ column: 1, row: 0 }, { column: 3, row: 0 }],
+        }],
+      },
+      hiddenCombatants: [{ combatant: hidden.id, stealthTotal: 20, edition: '2024' }],
+    };
+
+    expect([
+      located.id,
+      seen.id,
+      unseen.id,
+      hidden.id,
+    ].map((targetId) => {
+      const detection = detectCombatant(state, observer.id, targetId);
+      const reciprocal = detectCombatant(state, targetId, observer.id);
+      return {
+        targetId,
+        canonical: detection,
+        query: OFFER_ENVIRONMENT.queries.visibility(state, observer.id, targetId),
+        expectedQuery: {
+          visible: detection.kind === 'seen',
+          reciprocal: reciprocal.kind === 'seen',
+          sense: detection.kind === 'seen' ? detection.sense : 'unknown',
+          reason: detection.kind === 'undetected' ? detection.reason : null,
+        },
+      };
+    })).toEqual([
+      {
+        targetId: located.id,
+        canonical: { kind: 'located', sense: 'tremorsense' },
+        query: { visible: false, reciprocal: true, sense: 'unknown', reason: null },
+        expectedQuery: { visible: false, reciprocal: true, sense: 'unknown', reason: null },
+      },
+      {
+        targetId: seen.id,
+        canonical: { kind: 'seen', sense: 'normal_sight' },
+        query: { visible: true, reciprocal: true, sense: 'normal_sight', reason: null },
+        expectedQuery: { visible: true, reciprocal: true, sense: 'normal_sight', reason: null },
+      },
+      {
+        targetId: unseen.id,
+        canonical: { kind: 'undetected', reason: 'darkness' },
+        query: { visible: false, reciprocal: true, sense: 'unknown', reason: 'darkness' },
+        expectedQuery: { visible: false, reciprocal: true, sense: 'unknown', reason: 'darkness' },
+      },
+      {
+        targetId: hidden.id,
+        canonical: { kind: 'undetected', reason: 'hidden' },
+        query: { visible: false, reciprocal: true, sense: 'unknown', reason: 'hidden' },
+        expectedQuery: { visible: false, reciprocal: true, sense: 'unknown', reason: 'hidden' },
+      },
+    ]);
+  });
+
+  it('ENGINE_QUERY_IMPORTS_ONLY_CANONICAL_DETECTOR through the encounter visibility field', () => {
+    const path = 'src/vtt/engine-query-port.ts';
+    const source = ts.createSourceFile(
+      path,
+      readFileSync(path, 'utf8'),
+      ts.ScriptTarget.ESNext,
+      true,
+    );
+    const canonicalImports = source.statements.flatMap((statement) => {
+      if (!ts.isImportDeclaration(statement) ||
+        !ts.isStringLiteral(statement.moduleSpecifier) ||
+        statement.moduleSpecifier.text !== '../combat/encounter' ||
+        statement.importClause?.namedBindings === undefined ||
+        !ts.isNamedImports(statement.importClause.namedBindings)) return [];
+      return statement.importClause.namedBindings.elements.map((element) => element.name.text);
+    });
+    const localDetectionFunctions = source.statements.flatMap((statement) =>
+      ts.isFunctionDeclaration(statement) && statement.name?.text === 'detect'
+        ? [statement.name.text]
+        : []);
+    const visibilityMethods: ts.MethodDeclaration[] = [];
+    const visitMethods = (node: ts.Node): void => {
+      if (ts.isMethodDeclaration(node) && node.name.getText(source) === 'visibility') {
+        visibilityMethods.push(node);
+      }
+      ts.forEachChild(node, visitMethods);
+    };
+    ts.forEachChild(source, visitMethods);
+    const directCalls: string[] = [];
+    const visitCalls = (node: ts.Node): void => {
+      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
+        directCalls.push(node.expression.text);
+      }
+      ts.forEachChild(node, visitCalls);
+    };
+    const visibilityMethod = visibilityMethods[0];
+    if (visibilityMethod === undefined) throw new Error('Engine query port has no visibility method.');
+    ts.forEachChild(visibilityMethod, visitCalls);
+
+    expect(visibilityMethods).toHaveLength(1);
+    expect(canonicalImports).toContain('detectCombatant');
+    expect(localDetectionFunctions).toEqual([]);
+    expect(directCalls).toEqual(['detectCombatant', 'detectCombatant']);
+  });
+
+  it('runtime state, setup, and classification omit authored fog', () => {
+    const state = minimalState('fog-shape-actor', { columns: 2, rows: 1 });
+    const path = 'src/combat/encounter.ts';
+    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.ESNext, true);
+    const interfaceFields = new Map<string, readonly string[]>();
+    for (const statement of source.statements) {
+      if (!ts.isInterfaceDeclaration(statement)) continue;
+      interfaceFields.set(statement.name.text, statement.members.flatMap((member) =>
+        member.name === undefined ? [] : [member.name.getText(source)]));
+    }
+
+    expect(Object.keys(state)).not.toContain('foggedCells');
+    expect(Object.keys(ENCOUNTER_VIEW_CLASSIFICATION)).not.toContain('foggedCells');
+    expect(interfaceFields.get('EncounterState')).not.toContain('foggedCells');
+    expect(interfaceFields.get('EncounterSetup')).not.toContain('foggedCells');
+  });
+
+  it('DISTINCT_LEGACY_FOG_DECODES_IDENTICALLY and discards the migration key', () => {
+    const state = minimalState('legacy-fog-actor', { columns: 3, rows: 2 });
+    const first = decodeEncounterStateV1(
+      legacyDocument(state, [{ column: 0, row: 0 }]),
+      'session',
+    );
+    const second = decodeEncounterStateV1(
+      legacyDocument(state, [{ column: 2, row: 1 }]),
+      'session',
+    );
+
+    expect(first).toEqual(second);
+    expect('foggedCells' in first).toBe(false);
+    expect('foggedCells' in second).toBe(false);
+  });
+
+  it.each([
+    ['non-cell entry', [null], 'state.foggedCells[0] must be an object.'],
+    ['out-of-bounds cell', [{ column: 3, row: 0 }], 'Legacy fogged cells must be inside the encounter grid.'],
+    ['duplicate cells', [{ column: 1, row: 1 }, { column: 1, row: 1 }], 'Fogged cells must be unique.'],
+  ] as const)('MALFORMED_LEGACY_FOG_REJECTED: %s', (_case, foggedCells, message) => {
+    const state = minimalState('malformed-legacy-fog-actor', { columns: 3, rows: 2 });
+    expect(() => decodeEncounterStateV1(legacyDocument(state, foggedCells), 'session'))
+      .toThrowError(new TypeError(message));
+  });
+
+  it('fresh encode and decode round trips omit the legacy fog key', () => {
+    const state = minimalState('fresh-state-fog-actor', { columns: 2, rows: 1 });
+    const bytes = JSON.stringify(state);
+    const decoded = decodeEncounterStateV1(JSON.parse(bytes) as unknown, 'session');
+
+    expect(bytes).not.toContain('foggedCells');
+    expect('foggedCells' in decoded).toBe(false);
+    expect(decoded).toEqual(state);
+  });
+
   it('offers a modeled base attack despite an unresolved rider and partitions idle Disengage', () => {
     const generated = placedState(SEED, new Map<CombatantId, GridCell>([
       [ACTOR_ID, { column: 0, row: 0 }],
