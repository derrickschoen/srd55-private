#!/usr/bin/env node

import path from 'node:path';
import process from 'node:process';
import ts from 'typescript';

const ROOT = process.cwd();
const BUILDER_PATH = 'src/vtt/offers/build-offer-environment.ts';
const QUERY_PORT_PATH = 'src/vtt/engine-query-port.ts';
const ENVIRONMENT_PROPERTIES = [
  'queries',
  'familyPolicy',
  'partyThreatCatalog',
  'binding',
  'digest',
];
const TRANSITIONAL_RUNTIME_EXPORTS = new Set([
  `${BUILDER_PATH}:buildOfferEnvironment`,
  'src/vtt/offers/offer-environment.ts:createEngineOptionEnvironment',
  'src/vtt/offers/offer-environment.ts:createLegacyEngineOptionEnvironment',
  'src/vtt/offers/offer-environment.ts:createRevisionBoundEngineOptionEnvironment',
  'src/vtt/offers/offer-environment.ts:engineOptionEnvironmentFromBinding',
  'src/vtt/mcp/entrypoint.ts:reconstructLauncherOfferEnvironment',
]);
const ACTIVE_CJS_ORIGIN_FIXTURES = [
  'canonical-require-direct.cts',
  'canonical-require-destructured.cts',
  'canonical-create-require-computed.mts',
  'canonical-require-computed.cts',
  'canonical-import-equals.cts',
  'canonical-commonjs-reexport.cts',
  'canonical-commonjs-named-reexport.cts',
  'canonical-dynamic-import.mts',
  'canonical-star-export.mts',
];
const STAGED_REAL_SYMBOL_FIXTURES = Object.freeze({
  'required-surfaces': [
    constructorFixture(
      'round-session-missing-environment.ts',
      'src/vtt/engine-round-session',
      'EngineRoundSession',
      'args[0], args[1], args[2]',
    ),
    constructorOptionsFixture(
      'dm-host-missing-environment.ts',
      'src/vtt/dm-encounter-host',
      'DmEncounterHost',
      2,
      'args[0], args[1], withoutEnvironment',
    ),
    callFixture(
      'human-options-missing-environment.ts',
      'src/vtt/encounter-board-projection',
      'projectHumanEngineOptions',
      'args[0], args[1], args[2]',
    ),
    propertyFixture(
      'dm-projector-missing-environment.ts',
      'src/vtt/encounter-projections',
      'projectDmBoard',
      0,
      'withoutEnvironment',
    ),
    callFixture(
      'offered-actors-missing-environment.ts',
      'src/vtt/offered-option-paths',
      'offeredOptionActorsForState',
      'args[0], args[1]',
    ),
    callFixture(
      'offered-paths-missing-environment.ts',
      'src/vtt/offered-option-paths',
      'offeredOptionPaths',
      'args[0], args[1]',
    ),
    propertyFixture(
      'mcp-runtime-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'createEngineMcpRuntime',
      1,
      'args[0], withoutEnvironment',
    ),
    callFixture(
      'mcp-handler-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'createEngineMcpHandler',
      'args[0]',
    ),
    callFixture(
      'mcp-request-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'handleMcpRequest',
      'args[0], args[1]',
    ),
    callFixture(
      'mcp-server-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'runEngineMcpServer',
      'args[0]',
    ),
    callFixture(
      'mcp-lines-missing-environment.ts',
      'src/vtt/mcp/entrypoint',
      'runEngineMcpLines',
      'args[0], args[1]',
    ),
  ],
  resolver: [
    callFixture(
      'available-options-missing-environment.ts',
      'src/vtt/intent-resolver',
      'availableEngineActorOptions',
      'args[0], args[1]',
    ),
    callFixture(
      'resolver-factory-missing-environment.ts',
      'src/vtt/intent-resolver',
      'createPureTurnProposalResolver',
      '',
    ),
    propertyFixture(
      'materiality-context-missing-environment.ts',
      'src/vtt/plan-materiality',
      'createPlanRelevanceRecord',
      0,
      'withoutEnvironment',
    ),
    callFixture(
      'scenario-menu-missing-environment.ts',
      'src/vtt/speculative-planning',
      'buildHostScenarioMenu',
      'args[0], args[1], args[2]',
    ),
    methodFixture(
      'baseline-planner-missing-environment.ts',
      'src/vtt/speculative-planning',
      'hostBaselineProposalPlanner',
      'plan',
      'args[0], args[1]',
    ),
    callFixture(
      'team-score-missing-environment.ts',
      'src/vtt/intel/team-scorer',
      'scoreTeamPlans',
      'args[0], args[1]',
    ),
  ],
  'final-query': [
    callFixture(
      'scenario-fact-missing-queries.ts',
      'src/vtt/speculative-planning',
      'evaluateScenarioFact',
      'args[0], args[1]',
    ),
    callFixture(
      'proposal-facts-missing-queries.ts',
      'src/vtt/speculative-planning',
      'extractProposalFactDependencies',
      'args[0], args[1]',
    ),
    callFixture(
      'player-flip-missing-queries.ts',
      'src/vtt/speculative-planning',
      'canPlayerFlipScenarioFact',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'host-split-missing-queries.ts',
      'src/vtt/speculative-planning',
      'computeHostSplitCandidates',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'host-scenarios-missing-queries.ts',
      'src/vtt/speculative-planning',
      'evaluateHostScenarios',
      'args[0], args[1]',
    ),
    callFixture(
      'allocation-missing-environment.ts',
      'src/vtt/engine-query-port',
      'compareTacticalAllocations',
      'args[0], args[1], args[2], args[3]',
    ),
    callFixture(
      'arena-token-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaTokenPosition',
      'args[0], args[1]',
    ),
    callFixture(
      'arena-combatant-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaCombatant',
      'args[0], args[1]',
    ),
    callFixture(
      'arena-side-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaSameSide',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'arena-target-missing-queries.ts',
      'src/vtt/arena-legality',
      'resolveArenaTarget',
      'args[0], args[1], args[2]',
    ),
    callFixture(
      'arena-actions-missing-queries.ts',
      'src/vtt/arena-legality',
      'arenaMonsterActions',
      'args[0], args[1]',
    ),
    callFixture(
      'arena-plan-missing-queries.ts',
      'src/vtt/arena-legality',
      'validateArenaPlan',
      'args[0], args[1]',
    ),
    propertyFixture(
      'blind-input-missing-environment.ts',
      'src/vtt/blind-intent-resolver',
      'resolveBlindRoundIntents',
      0,
      'withoutEnvironment',
    ),
    propertyFixture(
      'legendary-input-missing-queries.ts',
      'src/vtt/intel/legendary-windows',
      'provideLegendaryWindows',
      0,
      'withoutEnvironment',
      'queries',
    ),
  ],
});
const STAGED_FORMAT_FIXTURES = Object.freeze({
  'offers-format-env-retyped.ts':
    "export type Retyped = 'engine-option-environment-v1'; // RETYPED\n",
  'offers-format-policy-retyped.ts':
    "export type Retyped = 'engine-offer-family-policy-v1'; // RETYPED\n",
  'offers-format-catalog-retyped.ts':
    "export type Retyped = 'party-threat-catalog-v1'; // RETYPED\n",
  'offers-format-imported.ts':
    "import { ENGINE_OFFER_FAMILY_POLICY_FORMAT, ENGINE_OPTION_ENVIRONMENT_FORMAT, " +
    "PARTY_THREAT_CATALOG_FORMAT } from '../src/vtt/offers/offer-codec-primitives';\n" +
    'void ENGINE_OFFER_FAMILY_POLICY_FORMAT;\n' +
    'void ENGINE_OPTION_ENVIRONMENT_FORMAT;\n' +
    'void PARTY_THREAT_CATALOG_FORMAT;\n',
});

function sourceImport(modulePath, symbol) {
  return `import { ${symbol} } from '../${modulePath}';\n`;
}

function callFixture(name, modulePath, symbol, omittedArguments) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: Parameters<typeof ${symbol}>;\n` +
      `${symbol}(${omittedArguments}); // OMITTED\n` +
      `${symbol}(...args); // SUPPLIED\n`,
  };
}

function constructorFixture(name, modulePath, symbol, omittedArguments) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: ConstructorParameters<typeof ${symbol}>;\n` +
      `new ${symbol}(${omittedArguments}); // OMITTED\n` +
      `new ${symbol}(...args); // SUPPLIED\n`,
  };
}

function propertyFixture(
  name,
  modulePath,
  symbol,
  parameterIndex,
  omittedArguments,
  property = 'offerEnvironment',
) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: Parameters<typeof ${symbol}>;\n` +
      `const { ${property}: omitted, ...withoutEnvironment } = args[${String(parameterIndex)}];\n` +
      'void omitted;\n' +
      `${symbol}(${omittedArguments}); // OMITTED\n` +
      `${symbol}(...args); // SUPPLIED\n`,
  };
}

function constructorOptionsFixture(
  name,
  modulePath,
  symbol,
  parameterIndex,
  omittedArguments,
) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: ConstructorParameters<typeof ${symbol}>;\n` +
      `const { offerEnvironment: omitted, ...withoutEnvironment } = args[${String(parameterIndex)}];\n` +
      'void omitted;\n' +
      `new ${symbol}(${omittedArguments}); // OMITTED\n` +
      `new ${symbol}(...args); // SUPPLIED\n`,
  };
}

function methodFixture(name, modulePath, symbol, method, omittedArguments) {
  return {
    name,
    source: sourceImport(modulePath, symbol) +
      `declare const args: Parameters<typeof ${symbol}.${method}>;\n` +
      `${symbol}.${method}(${omittedArguments}); // OMITTED\n` +
      `${symbol}.${method}(...args); // SUPPLIED\n`,
  };
}

function relative(fileName) {
  return path.relative(ROOT, fileName).split(path.sep).join('/');
}

function compilerOptions(configName) {
  const configPath = path.join(ROOT, configName);
  const loaded = ts.readConfigFile(configPath, ts.sys.readFile);
  if (loaded.error !== undefined) {
    throw new Error(ts.flattenDiagnosticMessageText(loaded.error.messageText, '\n'));
  }
  const parsed = ts.parseJsonConfigFileContent(loaded.config, ts.sys, ROOT);
  return {
    ...parsed.options,
    incremental: false,
    noEmit: true,
  };
}

function productionFiles() {
  return ts.sys.readDirectory(
    ROOT,
    ['.ts', '.tsx', '.cts', '.mts'],
    ['node_modules', '.git'],
    ['src/**/*', 'tools/**/*', 'tests/**/*'],
  );
}

function createProgram(rootNames, options, virtualSources = new Map()) {
  const normalized = new Map(
    [...virtualSources].map(([fileName, source]) => [path.resolve(fileName), source]),
  );
  const host = ts.createCompilerHost(options);
  const baseFileExists = host.fileExists.bind(host);
  const baseReadFile = host.readFile.bind(host);
  const baseGetSourceFile = host.getSourceFile.bind(host);
  host.fileExists = (fileName) => normalized.has(path.resolve(fileName)) || baseFileExists(fileName);
  host.readFile = (fileName) => normalized.get(path.resolve(fileName)) ?? baseReadFile(fileName);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    const source = normalized.get(path.resolve(fileName));
    if (source !== undefined) {
      return ts.createSourceFile(fileName, source, languageVersion, true);
    }
    return baseGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };
  return ts.createProgram({
    rootNames,
    options,
    host,
  });
}

function isEnvironmentType(checker, type) {
  return ENVIRONMENT_PROPERTIES.every((name) => checker.getPropertyOfType(type, name) !== undefined);
}

function environmentReturningExport(checker, symbol, sourceFile) {
  let target = symbol;
  if ((symbol.flags & ts.SymbolFlags.Alias) !== 0) {
    target = checker.getAliasedSymbol(symbol);
  }
  const declaration = target.valueDeclaration ?? target.declarations?.[0] ?? sourceFile;
  const type = checker.getTypeOfSymbolAtLocation(target, declaration);
  const signatures = [
    ...checker.getSignaturesOfType(type, ts.SignatureKind.Call),
    ...checker.getSignaturesOfType(type, ts.SignatureKind.Construct),
  ];
  return signatures.some((signature) => isEnvironmentType(checker, signature.getReturnType()));
}

function builderModuleSpecifier(node) {
  return ts.isStringLiteral(node) && /(?:^|\/)build-offer-environment(?:\.js|\.ts)?$/u.test(node.text);
}

function queryModuleSpecifier(node) {
  return ts.isStringLiteral(node) && /(?:^|\/)engine-query-port(?:\.js|\.ts)?$/u.test(node.text);
}

function exportedEnvironmentDiagnostics(program, sourceFiles, allowlist) {
  const checker = program.getTypeChecker();
  const diagnostics = [];
  for (const sourceFile of sourceFiles) {
    const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
    if (moduleSymbol !== undefined) {
      for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        if (!environmentReturningExport(checker, symbol, sourceFile)) continue;
        const key = `${relative(sourceFile.fileName)}:${symbol.getName()}`;
        if (!allowlist.has(key)) {
          diagnostics.push(`${key}: exported runtime environment constructor is forbidden`);
        }
      }
    }
    for (const statement of sourceFile.statements) {
      if (ts.isExportDeclaration(statement) &&
        statement.moduleSpecifier !== undefined &&
        builderModuleSpecifier(statement.moduleSpecifier) &&
        relative(sourceFile.fileName) !== BUILDER_PATH) {
        diagnostics.push(`${relative(sourceFile.fileName)}: re-exporting the environment builder is forbidden`);
      }
    }
  }
  return diagnostics;
}

function builderContractDiagnostics(sourceFile) {
  const diagnostics = [];
  const classes = sourceFile.statements.filter((statement) =>
    ts.isClassDeclaration(statement) && statement.name?.text === 'RuntimeOfferEnvironment');
  const builders = sourceFile.statements.filter((statement) =>
    ts.isFunctionDeclaration(statement) && statement.name?.text === 'buildOfferEnvironment');
  if (classes.length !== 1) {
    diagnostics.push(`${BUILDER_PATH}: expected one module-private RuntimeOfferEnvironment class`);
    return diagnostics;
  }
  const runtimeClass = classes[0];
  if (runtimeClass === undefined) return diagnostics;
  const classIsExported = runtimeClass.modifiers?.some((modifier) =>
    modifier.kind === ts.SyntaxKind.ExportKeyword || modifier.kind === ts.SyntaxKind.DefaultKeyword) ?? false;
  if (classIsExported) {
    diagnostics.push(`${BUILDER_PATH}: RuntimeOfferEnvironment must not be exported`);
  }
  const brand = runtimeClass.members.find((member) =>
    ts.isPropertyDeclaration(member) && ts.isPrivateIdentifier(member.name) && member.name.text === '#brand');
  if (brand === undefined) {
    diagnostics.push(`${BUILDER_PATH}: RuntimeOfferEnvironment requires a real #brand private field`);
  }
  if (builders.length !== 1) {
    diagnostics.push(`${BUILDER_PATH}: expected exactly one buildOfferEnvironment declaration`);
  }
  const builder = builders[0];
  if (builder !== undefined) {
    const exported = builder.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false;
    if (!exported || builder.parameters.length !== 1 || builder.parameters[0]?.questionToken !== undefined ||
      builder.parameters[0]?.initializer !== undefined) {
      diagnostics.push(`${BUILDER_PATH}: builder must export one required input parameter`);
    }
  }
  let canonicalImports = 0;
  let runtimeConstructions = 0;
  function visit(node) {
    if (ts.isImportDeclaration(node) && queryModuleSpecifier(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamedImports(bindings)) {
        canonicalImports += bindings.elements.filter((element) =>
          (element.propertyName ?? element.name).text === 'canonicalEngineQueryPort' && !element.isTypeOnly).length;
      }
    }
    if (ts.isNewExpression(node) && ts.isIdentifier(node.expression) &&
      node.expression.text === 'RuntimeOfferEnvironment') {
      runtimeConstructions += 1;
      if (builder === undefined || node.pos < builder.pos || node.end > builder.end) {
        diagnostics.push(`${BUILDER_PATH}: only buildOfferEnvironment may instantiate the runtime class`);
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  if (canonicalImports !== 1) {
    diagnostics.push(`${BUILDER_PATH}: builder must import the one canonical query port exactly once`);
  }
  if (runtimeConstructions !== 3) {
    diagnostics.push(`${BUILDER_PATH}: each validated builder branch must construct the runtime class directly`);
  }
  return diagnostics;
}

function canonicalOriginDiagnostics(sourceFile, enforcePathAllowances = true) {
  const fileName = relative(sourceFile.fileName);
  if (enforcePathAllowances && (fileName === BUILDER_PATH || fileName === QUERY_PORT_PATH)) return [];
  const diagnostics = [];
  function report(node, message) {
    const position = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile));
    diagnostics.push(`${fileName}:${position.line + 1}: ${message}`);
  }
  function visit(node) {
    if (ts.isImportDeclaration(node) && queryModuleSpecifier(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnly = clause?.isTypeOnly ?? false;
      const bindings = clause?.namedBindings;
      const onlyPortType = bindings !== undefined && ts.isNamedImports(bindings) &&
        bindings.elements.every((element) => element.isTypeOnly &&
          (element.propertyName ?? element.name).text === 'EngineQueryPort');
      if (!typeOnly && !onlyPortType) report(node, 'canonical query-port import is forbidden here');
    }
    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression !== undefined && queryModuleSpecifier(node.moduleReference.expression)) {
      report(node, 'import-equals cannot expose the canonical query port');
    }
    if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined &&
      queryModuleSpecifier(node.moduleSpecifier)) {
      report(node, 'engine-query-port re-export is forbidden');
    }
    if (ts.isCallExpression(node) && node.arguments.length > 0) {
      const first = node.arguments[0];
      if (first !== undefined && queryModuleSpecifier(first)) {
        report(node, 'dynamic/CommonJS access to the canonical query port is forbidden');
      }
    }
    if (ts.isIdentifier(node) && node.text === 'canonicalEngineQueryPort' &&
      !identifierIsTypePosition(node)) {
      report(node, 'canonical query-port value reference is forbidden here');
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return diagnostics;
}

function identifierIsTypePosition(node) {
  for (let current = node.parent; current !== undefined; current = current.parent) {
    if (ts.isTypeNode(current)) return true;
    if (ts.isStatement(current) || ts.isExpression(current)) return false;
  }
  return false;
}

function compileFixtureProgram(name, source) {
  const fileName = path.join(ROOT, '.architecture-fixtures', name);
  const program = createProgram(
    [fileName],
    compilerOptions('tsconfig.app.json'),
    new Map([[fileName, source]]),
  );
  return { fileName, program };
}

function compileFixture(name, source) {
  const { fileName, program } = compileFixtureProgram(name, source);
  return ts.getPreEmitDiagnostics(program).filter((diagnostic) => diagnostic.file !== undefined &&
    path.resolve(diagnostic.file.fileName) === path.resolve(fileName));
}

function privateBrandAssertionLines(program, sourceFiles) {
  const checker = program.getTypeChecker();
  const lines = [];
  for (const sourceFile of sourceFiles) {
    function visit(node) {
      if (ts.isAsExpression(node) || ts.isTypeAssertionExpression(node)) {
        const target = checker.getTypeAtLocation(node.type);
        const hasPrivateBrand = checker.getPropertiesOfType(target).some((property) =>
          property.declarations?.some((declaration) =>
            'name' in declaration &&
            declaration.name !== undefined &&
            ts.isPrivateIdentifier(declaration.name)) ?? false);
        if (isEnvironmentType(checker, target) && hasPrivateBrand) {
          lines.push(sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1);
        }
      }
      ts.forEachChild(node, visit);
    }
    visit(sourceFile);
  }
  return lines;
}

function diagnosticLine(diagnostic) {
  if (diagnostic.file === undefined || diagnostic.start === undefined) return 0;
  return diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
}

function markerLine(source, marker) {
  const index = source.split('\n').findIndex((line) => line.includes(`// ${marker}`));
  if (index < 0) throw new Error(`Missing fixture marker ${marker}.`);
  return index + 1;
}

function privateBrandSelfTest() {
  const source = `
import {
  buildOfferEnvironment,
  type EngineOptionEnvironment,
} from '../src/vtt/offers/build-offer-environment';

const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const objectLiteral: EngineOptionEnvironment = { // OBJECT_LITERAL
  queries: environment.queries,
  familyPolicy: environment.familyPolicy,
  partyThreatCatalog: environment.partyThreatCatalog,
  binding: environment.binding,
  digest: environment.digest,
};
const spread: EngineOptionEnvironment = { ...environment }; // SPREAD
const cast = { ...environment } as EngineOptionEnvironment; // CAST
class OutsideRuntimeOfferEnvironment implements EngineOptionEnvironment { // EXTERNAL_NEW
  readonly queries = environment.queries;
  readonly familyPolicy = environment.familyPolicy;
  readonly partyThreatCatalog = environment.partyThreatCatalog;
  readonly binding = environment.binding;
  readonly digest = environment.digest;
}
const outside = new OutsideRuntimeOfferEnvironment();
void objectLiteral;
void spread;
void cast;
void outside;
`;
  const fixture = compileFixtureProgram('private-brand-negative.ts', source);
  const diagnostics = ts.getPreEmitDiagnostics(fixture.program).filter((diagnostic) =>
    diagnostic.file !== undefined && path.resolve(diagnostic.file.fileName) === path.resolve(fixture.fileName));
  const fixtureSource = fixture.program.getSourceFile(fixture.fileName);
  const assertionLines = fixtureSource === undefined
    ? []
    : privateBrandAssertionLines(fixture.program, [fixtureSource]);
  const failures = [];
  for (const marker of ['OBJECT_LITERAL', 'SPREAD', 'CAST', 'EXTERNAL_NEW']) {
    const line = markerLine(source, marker);
    const rejectedByCompiler = diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === line);
    const rejectedAssertion = marker === 'CAST' && assertionLines.includes(line);
    if (!rejectedByCompiler && !rejectedAssertion) {
      failures.push(`private-brand-negative.ts:${line}: ${marker} unexpectedly compiled`);
    }
  }
  const validSource = `
import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';
const first = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });
const second = buildOfferEnvironment({ kind: 'binding', binding: first.binding });
void first.queries;
void second.binding;
`;
  const validDiagnostics = compileFixture('private-brand-positive.ts', validSource);
  if (validDiagnostics.length !== 0) {
    failures.push('private-brand-positive.ts: real builder calls did not compile');
  }
  return failures;
}

function virtualProgram(sources) {
  const virtualSources = new Map();
  for (const [name, source] of Object.entries(sources)) {
    virtualSources.set(path.join(ROOT, '.architecture-fixtures', name), source);
  }
  return createProgram(
    [...virtualSources.keys()],
    compilerOptions('tsconfig.app.json'),
    virtualSources,
  );
}

function alternativeExportSelfTest() {
  const importLine = "import { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';";
  const sources = {
    'same-builder-positive.ts': `${importLine}\nexport function runRoot(): void {\n` +
      "  const environment = buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n" +
      '  void environment.queries;\n}\n',
    'exported-wrapper.ts': `${importLine}\nexport function secondBuilder() {\n` +
      "  return buildOfferEnvironment({ kind: 'configuration', mode: 'legacy_standard' });\n}\n",
    'exported-alias.ts': `${importLine}\nexport const secondBuilder = buildOfferEnvironment;\n`,
    'exported-computed.ts': "import * as offers from '../src/vtt/offers/build-offer-environment';\n" +
      "export const secondBuilder = offers['buildOfferEnvironment'];\n",
    'builder-named-reexport.ts':
      "export { buildOfferEnvironment } from '../src/vtt/offers/build-offer-environment';\n",
    'builder-star-reexport.ts': "export * from '../src/vtt/offers/build-offer-environment';\n",
    'builder-namespace-reexport.ts':
      "export * as offerEnvironment from '../src/vtt/offers/build-offer-environment';\n",
  };
  const program = virtualProgram(sources);
  const sourceFiles = program.getSourceFiles().filter((sourceFile) =>
    relative(sourceFile.fileName).startsWith('.architecture-fixtures/'));
  const diagnostics = exportedEnvironmentDiagnostics(program, sourceFiles, new Set());
  const failures = [];
  if (diagnostics.some((diagnostic) => diagnostic.includes('same-builder-positive.ts'))) {
    failures.push('same-builder-positive.ts: lifecycle-root builder use was rejected');
  }
  for (const name of Object.keys(sources).filter((name) => name !== 'same-builder-positive.ts')) {
    if (!diagnostics.some((diagnostic) => diagnostic.includes(name))) {
      failures.push(`${name}: alternative exported builder was not rejected`);
    }
  }
  return failures;
}

function canonicalOriginSelfTest() {
  const sources = {
    'canonical-named-import.ts':
      "import { canonicalEngineQueryPort } from '../src/vtt/engine-query-port';\nvoid canonicalEngineQueryPort;\n",
    'canonical-aliased-import.ts':
      "import { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\nvoid queries;\n",
    'canonical-namespace-access.ts':
      "import * as queryPort from '../src/vtt/engine-query-port';\nvoid queryPort.canonicalEngineQueryPort;\n",
    'canonical-named-reexport.ts':
      "export { canonicalEngineQueryPort as queries } from '../src/vtt/engine-query-port';\n",
    'canonical-require-direct.cts':
      "const queries = require('../src/vtt/engine-query-port').canonicalEngineQueryPort;\nvoid queries;\n",
    'canonical-require-destructured.cts':
      "const { canonicalEngineQueryPort: queries } = require('../src/vtt/engine-query-port');\nvoid queries;\n",
    'canonical-create-require-computed.mts':
      "import { createRequire as load } from 'node:module';\n" +
      'const requireModule = load(import.meta.url);\n' +
      "const moduleValue = requireModule('../src/vtt/engine-query-port');\n" +
      "const key = 'canonicalEngineQueryPort';\nvoid moduleValue[key];\n",
    'canonical-require-computed.cts':
      "const moduleValue = require('../src/vtt/engine-query-port');\n" +
      "const key = 'canonicalEngineQueryPort';\nvoid moduleValue[key];\n",
    'canonical-import-equals.cts':
      "import queryPort = require('../src/vtt/engine-query-port');\nvoid queryPort.canonicalEngineQueryPort;\n",
    'canonical-commonjs-reexport.cts':
      "const queryPort = require('../src/vtt/engine-query-port');\nexport = queryPort;\n",
    'canonical-commonjs-named-reexport.cts':
      "exports.queries = require('../src/vtt/engine-query-port').canonicalEngineQueryPort;\n",
    'canonical-dynamic-import.mts':
      "const queryPort = await import('../src/vtt/engine-query-port');\n" +
      "const key = 'canonicalEngineQueryPort';\nvoid queryPort[key];\n",
    'canonical-star-export.mts': "export * from '../src/vtt/engine-query-port';\n",
  };
  const failures = [];
  for (const [name, source] of Object.entries(sources)) {
    const fileName = path.join(ROOT, '.architecture-fixtures', name);
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
    if (canonicalOriginDiagnostics(sourceFile, false).length === 0) {
      failures.push(`${name}: canonical query-port origin was not rejected`);
    }
  }
  const validSources = {
    'environment-queries.ts': 'void environment.queries;\n',
    'query-port-type.ts':
      "import type { EngineQueryPort } from '../src/vtt/engine-query-port';\n" +
      'declare const queries: EngineQueryPort;\nvoid queries;\n',
    'binding-codec.ts':
      "import { decodeEngineOptionEnvironmentBinding } from '../src/vtt/offers/offer-environment';\n" +
      'declare const binding: unknown;\nvoid decodeEngineOptionEnvironmentBinding(binding);\n',
  };
  for (const [name, source] of Object.entries(validSources)) {
    const fileName = path.join(ROOT, '.architecture-fixtures', name);
    const sourceFile = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true);
    if (canonicalOriginDiagnostics(sourceFile, false).length !== 0) {
      failures.push(`${name}: valid query/binding use was rejected`);
    }
  }
  return failures;
}

function stagedRealSymbolSelfTest(fixtures) {
  const failures = [];
  for (const fixture of fixtures) {
    const diagnostics = compileFixture(fixture.name, fixture.source);
    const omittedLine = markerLine(fixture.source, 'OMITTED');
    const suppliedLine = markerLine(fixture.source, 'SUPPLIED');
    if (!diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === omittedLine)) {
      failures.push(`${fixture.name}:${omittedLine}: omitted real-symbol dependency compiled`);
    }
    if (diagnostics.some((diagnostic) => diagnosticLine(diagnostic) === suppliedLine)) {
      failures.push(`${fixture.name}:${suppliedLine}: valid real-symbol dependency was rejected`);
    }
    const unrelated = diagnostics.filter((diagnostic) => {
      const line = diagnosticLine(diagnostic);
      return line !== omittedLine && line !== suppliedLine;
    });
    if (unrelated.length > 0) {
      failures.push(`${fixture.name}: ${String(unrelated.length)} unrelated compile diagnostic(s)`);
    }
  }
  return failures;
}

function runSelfTest(stage) {
  const diagnostics = [
    ...privateBrandSelfTest(),
    ...alternativeExportSelfTest(),
    ...canonicalOriginSelfTest(),
  ];
  if (stage !== undefined) {
    const staged = STAGED_REAL_SYMBOL_FIXTURES[stage];
    if (staged === undefined) {
      diagnostics.push(`Unknown architecture fixture stage: ${stage}`);
    } else {
      diagnostics.push(...stagedRealSymbolSelfTest(staged));
    }
  }
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(diagnostic);
    process.exitCode = 1;
    return;
  }
  console.log('offer-environment architecture self-test: 28 active fixtures passed');
  console.log(`active CommonJS/ESM origin fixtures: ${ACTIVE_CJS_ORIGIN_FIXTURES.join(', ')}`);
  const stagedCounts = Object.entries(STAGED_REAL_SYMBOL_FIXTURES)
    .map(([name, fixtures]) => `${name}:${String(fixtures.length)}`)
    .join(', ');
  console.log(`staged real-symbol fixture groups: ${stagedCounts}`);
  console.log(`staged format fixtures: ${Object.keys(STAGED_FORMAT_FIXTURES).join(', ')}`);
}

function runProductionCheck() {
  const files = productionFiles();
  const program = createProgram(files, compilerOptions('tsconfig.node.json'));
  const sourceFiles = program.getSourceFiles().filter((sourceFile) => {
    const fileName = relative(sourceFile.fileName);
    return fileName.startsWith('src/') || fileName.startsWith('tools/') || fileName.startsWith('tests/');
  });
  const builder = sourceFiles.find((sourceFile) => relative(sourceFile.fileName) === BUILDER_PATH);
  const diagnostics = builder === undefined
    ? [`${BUILDER_PATH}: builder module is missing`]
    : builderContractDiagnostics(builder);
  diagnostics.push(...exportedEnvironmentDiagnostics(program, sourceFiles, TRANSITIONAL_RUNTIME_EXPORTS));
  const assertionDiagnostics = privateBrandAssertionLines(program, sourceFiles);
  if (assertionDiagnostics.length > 0) {
    diagnostics.push(`forbidden assertions to EngineOptionEnvironment at ${assertionDiagnostics.join(', ')}`);
  }
  if (diagnostics.length > 0) {
    for (const diagnostic of diagnostics) console.error(diagnostic);
    process.exitCode = 1;
    return;
  }
  console.log(`offer-environment architecture: ${sourceFiles.length} TypeScript files checked`);
  console.log('runtime export allowlist: builder plus exactly five transitional factories/wrappers');
}

const args = process.argv.slice(2);
const selfTest = args.includes('--self-test');
const stageIndex = args.indexOf('--stage');
const stage = stageIndex < 0 ? undefined : args[stageIndex + 1];
const knownArguments = new Set(['--self-test', '--stage', stage]);
const unknownArguments = args.filter((argument) => !knownArguments.has(argument));
if (unknownArguments.length > 0 || (stageIndex >= 0 && stage === undefined)) {
  console.error(`Unknown or incomplete arguments: ${args.join(' ')}`);
  process.exitCode = 1;
} else if (selfTest) {
  runSelfTest(stage);
} else if (stage !== undefined) {
  console.error('--stage requires --self-test.');
  process.exitCode = 1;
} else {
  runProductionCheck();
}
