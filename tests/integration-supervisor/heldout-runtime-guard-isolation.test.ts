import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from '../helpers/test-filesystem';
import {
  runHeldoutIsolationPreflight,
  runHeldoutRuntimeGuard,
  type HeldoutRuntimeGuardReport,
} from '../../tools/heldout-runtime-guard';
import { inspectHeldoutCandidateTree } from '../../tools/heldout-leak-check';

const reserveDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const bindings = {
  reserveDigests: [reserveDigest],
  resultPaths: ['/home/vagrant/dnd-slim-runs/heldout-a-'],
} as const;
const protectedTarget = '/work/src/vtt/heldout-evaluation.ts';
const protectedPackageTarget = './src/vtt/heldout-evaluation.ts';
const runtimeSeedExclusions = new Set([
  'src/vtt/heldout-evaluation.ts',
  'src/vtt/room-generator.ts',
  'tools/generate-heldout-party-basis.ts',
  'tools/generate-arena-basis.ts',
  'tools/ai-dm-arena.ts',
  'tools/ai-dm-heldout-report.ts',
  'tools/ai-dm-heldout-judge-prompt.ts',
  'tools/heldout-leak-check.ts',
  'tools/heldout-runtime-guard.ts',
  'tools/heldout-runtime-guard-worker.mjs',
  'tools/ai-dm-rerun-packet.ts',
]);

function eligibleRuntimeSeedCount(root = '.'): number {
  let count = 0;
  const walk = (directory: string, prefix = ''): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.tmp')) continue;
      const relative = prefix.length === 0 ? entry.name : `${prefix}/${entry.name}`;
      const absolute = join(directory, entry.name);
      if (entry.isDirectory()) walk(absolute, relative);
      else if ((relative.startsWith('src/') || relative.startsWith('tools/')) &&
        /\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/u.test(relative) &&
        !/\.d\.(?:ts|mts|cts)$/u.test(relative) && !runtimeSeedExclusions.has(relative)) count += 1;
    }
  };
  walk(root);
  return count;
}

const realTreeEligibleSeedCount = eligibleRuntimeSeedCount();

const cliArguments = [
  '--protocol', 'heldout-ordinary-v1',
  '--base', 'HEAD',
  '--candidate', 'HEAD',
  '--slice', 'F',
  '--reserve-digest', reserveDigest,
  '--result-path', '/home/vagrant/dnd-slim-runs/heldout-a-',
] as const;

interface RuntimeFixture {
  readonly config: string;
  readonly configFile?: 'vite.config.mjs' | 'vite.config.ts' | 'vitest.config.mjs';
  readonly files?: Readonly<Record<string, string>>;
  readonly consumer?: string;
  readonly packageJson?: string;
  readonly expectedSpecifier?: string;
  readonly aggregateTimeoutMs?: number;
  readonly lockFile?: string;
  readonly symlinks?: Readonly<Record<string, string>>;
}

interface MigratedRuntimeCase extends RuntimeFixture {
  readonly finding: string;
}

let lastFixtureRoot = '';

const migratedRuntimeCases: readonly MigratedRuntimeCase[] = [
  {
    finding: 'F47',
    config: `const shared={resolve:{alias:{}}}; export default {get resolve(){shared.resolve.alias['@policy']='${protectedTarget}';return shared.resolve;}};`,
  },
  {
    finding: 'F48',
    config: `const shared={resolve:{alias:{'@policy':'${protectedTarget}'}}}; export {shared}; export default shared;`,
  },
  {
    finding: 'F49',
    config: "import bridge from './bridge.mjs'; export {bridge}; export default bridge;",
    files: { 'bridge.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
  },
  {
    finding: 'F50',
    config: `const key='alias';const resolve={};resolve[key]={'@policy':'${protectedTarget}'};export default {resolve};`,
  },
  {
    finding: 'F51',
    config: `const source={alias:{'@policy':'${protectedTarget}'}};const {'alias':alias,...rest}=source;void rest;export default {resolve:{alias}};`,
  },
  {
    finding: 'F52',
    config: `const shared=await Promise.resolve({resolve:{alias:{'@policy':'${protectedTarget}'}}});export default shared;`,
  },
  {
    finding: 'F53',
    config: `import {defineConfig,mergeConfig} from 'vite';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(mergeConfig(base,{}));`,
  },
  {
    finding: 'F54',
    config: `const shared={resolve:{alias:{}}};export default {...shared,plugins:[(shared.resolve.alias['@policy']='${protectedTarget}',false)]};`,
  },
  {
    finding: 'F55',
    config: `const box={value:{alias:{'@policy':'${protectedTarget}'}}};const {'alias':alias,...rest}=box.value;void rest;export default {resolve:{alias}};`,
  },
  {
    finding: 'F56',
    configFile: 'vite.config.ts',
    config: `const key:'alias'='alias';const root:Record<string,unknown>={};root[key]={'@policy':'${protectedTarget}'};export default {resolve:root};`,
  },
  {
    finding: 'F57',
    config: `const moduleApi=await import('node:module');const load=moduleApi.createRequire(import.meta.url);void load;export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
  },
  {
    finding: 'F58',
    config: `const shared={resolve:{alias:{}}};const p=shared.resolve.alias;Object.assign(p,{'@policy':'${protectedTarget}'});export default shared;`,
  },
  {
    finding: 'F59',
    configFile: 'vitest.config.mjs',
    config: `function makeTestConfig(){return {alias:{'@policy':'${protectedTarget}'}}}export default {test:makeTestConfig()};`,
  },
  {
    finding: 'F60',
    config: `const shared={resolve:{alias:{}}};const receiver={[Symbol.hasInstance](value){value.resolve.alias['@policy']='${protectedTarget}';return true}};void(shared instanceof receiver);export default shared;`,
  },
  {
    finding: 'F61',
    config: `const shared={resolve:{alias:{}}};const p=shared;p.resolve.alias['@policy']='${protectedTarget}';export default shared;`,
  },
  {
    finding: 'F62',
    config: `const resolve={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(resolve);export default {resolve};`,
  },
  {
    finding: 'F63',
    config: `const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default {...shared};`,
  },
  {
    finding: 'F64',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(rules[0]);export default {resolve:{alias:rules}};`,
  },
  {
    finding: 'F65',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:rules};function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(shared.plugins[0]);export default {...shared,resolve:{alias:rules}};`,
  },
  {
    finding: 'F66',
    configFile: 'vitest.config.mjs',
    config: `const project={name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}};export default {test:{projects:[project]}};`,
  },
  {
    finding: 'F67',
    config: `const rules=[{find:'@policy',replacement:'${protectedTarget}'}];const overlay={resolve:{alias:rules}};export default {resolve:{alias:[{find:'@policy',replacement:'/work/src/ordinary.ts'}]},...overlay};`,
  },
  {
    finding: 'F68',
    configFile: 'vitest.config.mjs',
    config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
    files: { 'project.config.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
  },
  {
    finding: 'F69',
    config: `const shared={resolve:{alias:{}}};function install(value){value.alias['@policy']='${protectedTarget}'}install(shared.resolve);export default shared;`,
  },
  {
    finding: 'F47-side-effect-property',
    config: `const shared={resolve:{alias:{}}};export default {...shared,sideEffect:(shared.resolve.alias['@policy']='${protectedTarget}')};`,
  },
  {
    finding: 'F53-direct-vitest-alias',
    configFile: 'vitest.config.mjs',
    config: `import {defineConfig} from 'vitest/config';export default defineConfig({resolve:{alias:{'@policy':'${protectedTarget}'}}});`,
  },
  {
    finding: 'F53-vitest-mergeConfig',
    configFile: 'vitest.config.mjs',
    config: `import {defineConfig,mergeConfig} from 'vitest/config';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(mergeConfig(base,{test:{globals:true}}));`,
  },
  {
    finding: 'F58-test-alias-address',
    configFile: 'vitest.config.mjs',
    config: `const shared={test:{alias:{}}};Object.assign(shared.test.alias,{'@policy':'${protectedTarget}'});export default shared;`,
  },
  {
    finding: 'F59-literal-test-alias',
    configFile: 'vitest.config.mjs',
    config: `export default {test:{alias:{'@policy':'${protectedTarget}'}}};`,
  },
  {
    finding: 'F62-shorthand-test',
    configFile: 'vitest.config.mjs',
    config: `const test={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(test);export default {test};`,
  },
  {
    finding: 'F62-resolve-container-spread',
    config: `const parts={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(parts);export default {resolve:{...parts}};`,
  },
  {
    finding: 'F62-test-container-spread',
    configFile: 'vitest.config.mjs',
    config: `const parts={};function install(value){value.alias={'@policy':'${protectedTarget}'}}install(parts);export default {test:{...parts}};`,
  },
  {
    finding: 'F63-direct-root',
    config: `const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default shared;`,
  },
  {
    finding: 'F63-defineConfig-callback-root',
    config: `import {defineConfig} from 'vite';const shared={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(shared);export default defineConfig(()=>({...shared}));`,
  },
  {
    finding: 'F64-const-entry-alias',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const entry=rules[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {resolve:{alias:rules}};`,
  },
  {
    finding: 'F64-test-alias-entry',
    configFile: 'vitest.config.mjs',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {test:{alias:rules}};`,
  },
  {
    finding: 'F64-spread-entry-source',
    config: `const entries=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias:[...entries]}};`,
  },
  {
    finding: 'F64-dual-placement',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];rules[0].find='@policy';rules[0].replacement='${protectedTarget}';export default {plugins:rules,resolve:{alias:rules}};`,
  },
  {
    finding: 'F65-const-indirect-entry',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:rules};const entry=shared.plugins[0];entry.find='@policy';entry.replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
  },
  {
    finding: 'F65-two-level-indirection',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:rules};const outer={inner:shared};outer.inner.plugins[0].find='@policy';outer.inner.plugins[0].replacement='${protectedTarget}';export default {...shared,resolve:{alias:rules}};`,
  },
  {
    finding: 'F66-shorthand-projects',
    configFile: 'vitest.config.mjs',
    config: `const projects=[{name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}}];export default {test:{projects}};`,
  },
  {
    finding: 'F66-referenced-project-entry',
    configFile: 'vitest.config.mjs',
    config: `const project={name:'nested',resolve:{alias:{'@policy':'${protectedTarget}'}}};const projects=[project];export default {test:{projects:projects}};`,
  },
  {
    finding: 'F67-array-spread-index',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'},{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins:[...rules,{name:'safe'}]};export default {...shared,resolve:{alias:rules}};`,
  },
  {
    finding: 'F69-terminal-dual-placement',
    config: `const plugins=[{find:'@policy',replacement:'${protectedTarget}'}];const shared={plugins};export default {...shared,resolve:{alias:plugins}};`,
  },
  {
    finding: 'F68-helper-built-extended-config',
    configFile: 'vitest.config.mjs',
    config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
    files: {
      'project.config.mjs': `const make=()=>({resolve:{alias:{'@policy':'${protectedTarget}'}}});export default make();`,
    },
  },
  {
    finding: 'F68-variable-extends',
    configFile: 'vitest.config.mjs',
    config: "const target='./project.config.mjs';export default {test:{projects:[{name:'extended',extends:target}]}};",
    files: { 'project.config.mjs': `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};` },
  },
  {
    finding: 'plugin-config',
    config: `export default {plugins:[{name:'fixture-config',config(){return {resolve:{alias:{'@policy':'${protectedTarget}'}}}}}]};`,
  },
  {
    finding: 'plugin-resolveId',
    config: `export default {plugins:[{name:'fixture-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]};`,
  },
  {
    finding: 'activated-dependency-plugin',
    config: `import {dynamicImportPlugin} from '@vitest/mocker/node';export default {plugins:[dynamicImportPlugin({globalThisAccessor:"(await import('/src/vtt/heldout-evaluation.ts'))"})]};`,
    consumer: "void import('./ordinary');",
    expectedSpecifier: '/src/vtt/heldout-evaluation.ts',
  },
  {
    finding: 'plugin-configResolved',
    config: `let ready=false;export default {plugins:[{name:'fixture-state',configResolved(){ready=true},resolveId(id){if(ready&&id==='@policy')return '${protectedTarget}'}}]};`,
  },
  {
    finding: 'plugin-project-chain',
    configFile: 'vitest.config.mjs',
    config: "export default {test:{projects:[{name:'chained',extends:'./project.config.mjs'}]}};",
    files: {
      'project.config.mjs': `export default {plugins:[{name:'project-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]};`,
    },
  },
  {
    finding: 'F13-package-import-exact',
    config: 'export default {};',
    consumer: "import value from '#policy';export {value};",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({
      name: 'heldout-runtime-fixture',
      type: 'module',
      imports: { '#policy': protectedPackageTarget },
    }),
  },
  {
    finding: 'F13-package-import-pattern',
    config: 'export default {};',
    consumer: "import value from '#policy/value';export {value};",
    expectedSpecifier: '#policy/value',
    packageJson: JSON.stringify({
      name: 'heldout-runtime-fixture',
      type: 'module',
      imports: { '#policy/*': protectedPackageTarget },
    }),
  },
  {
    finding: 'F19-package-import-conditions',
    config: 'export default {};',
    consumer: "import value from '#policy';export {value};",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({
      name: 'heldout-runtime-fixture',
      type: 'module',
      imports: {
        '#*': './src/ordinary.ts',
        '#policy': { import: protectedPackageTarget, default: './src/ordinary.ts' },
      },
    }),
  },
  {
    finding: 'F21-regex-alias',
    config: `export default {resolve:{alias:[{find:/^@policy$/,replacement:'${protectedTarget}'}]}};`,
  },
  {
    finding: 'RG-F4-direct-require',
    config: 'export default {};',
    consumer: "require('#policy');",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
      imports: { '#policy': protectedPackageTarget } }),
  },
  {
    finding: 'RG-F4-require-alias',
    config: 'export default {};',
    consumer: "const load=require;load('#policy');",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
      imports: { '#policy': protectedPackageTarget } }),
  },
  {
    finding: 'RG-F4-constant-concatenation',
    config: 'export default {};',
    consumer: "import('#'+'policy');",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
      imports: { '#policy': protectedPackageTarget } }),
  },
  {
    finding: 'RG-F4-import-meta-resolve',
    config: 'export default {};',
    consumer: "import.meta.resolve('#policy');",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
      imports: { '#policy': protectedPackageTarget } }),
  },
  {
    finding: 'RG-F4-createRequire-result',
    config: 'export default {};',
    consumer: "import {createRequire} from 'node:module';const load=createRequire(import.meta.url);load('#policy');",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
      imports: { '#policy': { require: protectedPackageTarget, import: './src/ordinary.ts' } } }),
  },
  {
    finding: 'RG-F4-require-condition',
    config: 'export default {};',
    consumer: "require('#policy');",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module',
      imports: { '#policy': { require: protectedPackageTarget, import: './src/ordinary.ts' } } }),
  },
  {
    finding: 'package-exact-before-wildcard',
    config: 'export default {};',
    consumer: "import value from '#policy';void value;",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
      '#*': './src/ordinary.ts', '#policy': protectedPackageTarget,
    } }),
  },
  {
    finding: 'package-overlapping-pattern-order',
    config: 'export default {};',
    consumer: "import value from '#policy/heldout-evaluation';void value;",
    expectedSpecifier: '#policy/heldout-evaluation',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
      '#policy/*': './src/ordinary.ts', '#policy/heldout-*': './src/vtt/heldout-*.ts',
    } }),
  },
  {
    finding: 'package-nested-conditions',
    config: 'export default {};',
    consumer: "import value from '#policy';void value;",
    expectedSpecifier: '#policy',
    packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
      '#policy': { import: { browser: protectedPackageTarget, default: './src/ordinary.ts' },
        default: './src/ordinary.ts' },
    } }),
  },
  {
    finding: 'alias-shorthand-object',
    config: `const alias={'@policy':'${protectedTarget}'};export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-identifier-array',
    config: `const alias=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-array-spread',
    config: `const base=[{find:'@policy',replacement:'${protectedTarget}'}];export default {resolve:{alias:[...base]}};`,
  },
  {
    finding: 'alias-relative-regex',
    config: `export default {resolve:{alias:[{find:/^\\.\\/public-policy$/,replacement:'${protectedTarget}'}]}};`,
    consumer: "import value from './public-policy';void value;",
    expectedSpecifier: './public-policy',
  },
  {
    finding: 'alias-shadowed-spelling',
    config: `const alias={'@policy':'${protectedTarget}'};function shadow(){const alias={};return alias}void shadow;export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-entry-spread-override',
    config: `const alias=[{find:'@safe',replacement:'/safe.ts',...{find:'@policy',replacement:'${protectedTarget}'}}];export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-whole-variable-reassignment',
    config: `let alias={};alias={'@policy':'${protectedTarget}'};export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-array-push',
    config: `const alias=[];alias.push({find:'@policy',replacement:'${protectedTarget}'});export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-called-closure-write',
    config: `const alias={};const write=()=>{alias['@policy']='${protectedTarget}'};write();export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-call-receiver-write',
    config: `const alias={};function get(){return alias}get()['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-class-field-write',
    config: `const alias={};class Box{value=alias}new Box().value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-object-transfer',
    config: `const alias={};const box={value:alias};box.value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-array-transfer',
    config: `const alias=[];const box=[alias];box[0].push({find:'@policy',replacement:'${protectedTarget}'});export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-nested-transfer',
    config: `const alias={};const box={nested:[{value:alias}]};box.nested[0].value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-computed-transfer',
    config: `const alias={};const box={['value']:alias};box.value['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-for-of-head',
    config: `const alias={};for(alias['@policy'] of ['${protectedTarget}']){}export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-for-in-head',
    config: `const alias={};for(alias['@policy'] in {'${protectedTarget}':true}){}export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-constructor-argument',
    config: `const alias={};class Update{constructor(value){value['@policy']='${protectedTarget}'}}new Update(alias);export default {resolve:{alias}};`,
  },
  {
    finding: 'alias-fill-receiver',
    config: `const alias=[{find:'@safe',replacement:'/work/src/ordinary.ts'}];alias.fill({find:'@policy',replacement:'${protectedTarget}'});export default {resolve:{alias}};`,
  },
  {
    finding: 'F67-runtime-index-mutation',
    config: `const rules=[{find:'@a',replacement:'/work/src/ordinary.ts'},{find:'@b',replacement:'/work/src/ordinary.ts'}];const shared={plugins:[...rules,{name:'safe'}]};function install(rule){rule.find='@policy';rule.replacement='${protectedTarget}'}install(shared.plugins[1]);export default {...shared,resolve:{alias:rules}};`,
  },
  {
    finding: 'callback-conditional-config',
    config: `import {defineConfig} from 'vite';const base={resolve:{alias:{'@policy':'${protectedTarget}'}}};export default defineConfig(({command})=>command==='serve'?{...base}:base);`,
  },
  {
    finding: 'locally-defined-defineConfig-execution',
    config: `const alias={};function defineConfig(value){value.ref['@policy']='${protectedTarget}';return {resolve:{alias}}}export default defineConfig({ref:alias});`,
  },
  {
    finding: 'F66-helper-mutated-shorthand-projects',
    configFile: 'vitest.config.mjs',
    config: `const projects=[{}];function install(project){project.resolve={alias:{'@policy':'${protectedTarget}'}}}install(projects[0]);export default {test:{projects}};`,
  },
  {
    finding: 'F66-helper-mutated-inline-project',
    configFile: 'vitest.config.mjs',
    config: `const project={};function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(project);export default {test:{projects:[project]}};`,
  },
  {
    finding: 'F66-helper-mutated-referenced-project',
    configFile: 'vitest.config.mjs',
    config: `const project={};const projects=[project];function install(value){value.resolve={alias:{'@policy':'${protectedTarget}'}}}install(project);export default {test:{projects:projects}};`,
  },
  {
    finding: 'opaque-array-helper-receives-shared',
    config: `const shared={resolve:{alias:{}}};function helper(value){value.resolve.alias['@policy']='${protectedTarget}';return false}export default {...shared,plugins:[helper(shared)]};`,
  },
] as const;

const cleanRuntimeControls: readonly MigratedRuntimeCase[] = [
  {
    finding: 'F54-plain-plugin-calls',
    config: `const helper=()=>({name:'ordinary'});export default {plugins:[helper(),helper({x:1})]};`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F54-property-read',
    config: `const shared={plugins:[]};export default {...shared,plugins:[shared.plugins.length&&false]};`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F54-array-spread-read',
    config: `const shared={plugins:[]};export default {...shared,plugins:[...shared.plugins]};`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'opaque-array-const-subtree-alias',
    config: `const shared={plugins:[]};const p=shared.plugins;export default {...shared,plugins:[...p]};`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F60-strict-equality',
    config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};void(shared===shared);export default shared;`,
  },
  {
    finding: 'F60-nonsemantic-instanceof',
    config: `const shared={plugins:[]};void(shared.plugins instanceof Array);export default shared;`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F61-const-alias-void',
    config: `const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};const p=shared;void p;export default shared;`,
  },
  {
    finding: 'F64-plugin-only-placement',
    config: `const rules=[{name:'ordinary'}];function install(value){value.name='updated'}install(rules[0]);export default {plugins:rules};`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F65-plugin-only-indirection',
    config: `const rules=[{name:'ordinary'}];const shared={plugins:rules};function install(value){value.name='updated'}install(shared.plugins[0]);export default shared;`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F67-later-explicit-property-wins',
    config: `const overlay={plugins:[{name:'mutated'}]};const shared={...overlay,plugins:[{name:'safe'}]};shared.plugins[0].name='still-safe';export default shared;`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F69-terminal-plugin-array',
    config: `const plugins=[];const shared={plugins};function install(value){void value.length}install(shared.plugins);export default shared;`,
    consumer: "import value from './ordinary'; void value;",
  },
  {
    finding: 'F68-extends-true-root-reuse',
    configFile: 'vitest.config.mjs',
    config: `export default {resolve:{alias:{'@policy':'/work/src/ordinary.ts'}},test:{projects:[{name:'reuse',extends:true}]}};`,
  },
  {
    finding: 'F67-leading-safe-array-entry',
    config: `const rules=[{find:'@ordinary',replacement:'/work/src/ordinary.ts'}];const shared={plugins:[{name:'safe'},...rules]};function install(value){value.name='clean'}install(shared.plugins[0]);export default {...shared,resolve:{alias:rules}};`,
    consumer: "import value from './ordinary';void value;",
  },
  {
    finding: 'regex-nonmatching-relative-import',
    config: `export default {resolve:{alias:[{find:/^@policy$/,replacement:'${protectedTarget}'}]}};`,
    consumer: "import value from './ordinary';void value;",
  },
  {
    finding: 'nonsemantic-build-value',
    config: `const build={};function install(value){value.empty=true}install(build);export default {build};`,
    consumer: "import value from './ordinary';void value;",
  },
  {
    finding: 'dormant-dependency-plugin',
    config: "import {dynamicImportPlugin} from '@vitest/mocker/node';const dormant=dynamicImportPlugin({globalThisAccessor:\"(await import('/src/vtt/heldout-evaluation.ts'))\"});void dormant;export default {};",
    consumer: "void import('./ordinary');",
  },
  {
    finding: 'spread-transfer-does-not-mutate-config',
    config: `const alias={'@policy':'/work/src/ordinary.ts'};const edit={...alias};edit['@policy']='${protectedTarget}';export default {resolve:{alias}};`,
  },
  {
    finding: 'returned-reference-without-mutation',
    config: "const alias={'@policy':'/work/src/ordinary.ts'};function expose(){return alias}void expose;export default {resolve:{alias}};",
  },
  {
    finding: 'class-field-storage-without-mutation',
    config: "const alias={'@policy':'/work/src/ordinary.ts'};class Box{value=alias}void Box;export default {resolve:{alias}};",
  },
  {
    finding: 'frozen-readable-configuration',
    config: "const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};Object.freeze(shared);export default shared;",
  },
  {
    finding: 'let-reference-without-mutation',
    config: "const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};let p=shared;void p;export default shared;",
  },
  {
    finding: 'no-op-call-reference',
    config: "const shared={resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};const q=shared.resolve;function use(value){void value}use(q);export default shared;",
  },
  {
    finding: 'stray-alias-object-outside-export',
    config: `const stray={alias:{'@policy':'${protectedTarget}'}};void stray;export default {};`,
    consumer: "import value from './ordinary';void value;",
  },
] as const;

function writeFixtureFile(root: string, path: string, source: string | Uint8Array): void {
  const absolute = join(root, path);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, source);
}

function copyRepositoryPath(source: string, target: string): void {
  if (statSync(source).isDirectory()) {
    mkdirSync(target, { recursive: true });
    for (const entry of readdirSync(source)) {
      copyRepositoryPath(join(source, entry), join(target, entry));
    }
    return;
  }
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readFileSync(source));
}

function prepareFixtureRoot(fixture: RuntimeFixture): string {
  const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-fixture-'));
  lastFixtureRoot = root;
  writeFixtureFile(root, 'package.json', fixture.packageJson ??
    JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module' }));
  if (fixture.lockFile === undefined) copyRepositoryPath('package-lock.json', join(root, 'package-lock.json'));
  else writeFixtureFile(root, 'package-lock.json', fixture.lockFile);
  mkdirSync(join(root, 'node_modules'));
  writeFixtureFile(root, fixture.configFile ?? 'vite.config.mjs', fixture.config);
  writeFixtureFile(root, 'src/consumer.ts', fixture.consumer ?? "import value from '@policy'; export { value };");
  writeFixtureFile(root, 'src/ordinary.ts', 'export default 1;');
  writeFixtureFile(root, 'src/vtt/heldout-evaluation.ts', 'export default 2;');
  for (const [path, source] of Object.entries(fixture.files ?? {})) writeFixtureFile(root, path, source);
  for (const [path, target] of Object.entries(fixture.symlinks ?? {})) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    const linked = spawnSync('/bin/ln', ['-s', target, join(root, path)], { encoding: 'utf8' });
    if (linked.status !== 0) throw new TypeError(`Unable to create fixture symlink: ${linked.stderr}`);
  }
  return root;
}

async function inspectFixture(fixture: RuntimeFixture): Promise<HeldoutRuntimeGuardReport> {
  const root = prepareFixtureRoot(fixture);
  try {
    return await runHeldoutRuntimeGuard({
      root,
      slice: 'F',
      bindings,
      ...(fixture.aggregateTimeoutMs === undefined
        ? {}
        : { aggregateTimeoutMs: fixture.aggregateTimeoutMs }),
    });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function inspectRealTree(
  configFile: 'vite.config.ts' | 'vitest.config.ts',
  extraConfig?: { readonly path: string; readonly source: string },
): Promise<HeldoutRuntimeGuardReport> {
  const root = mkdtempSync(join(tmpdir(), 'heldout-runtime-real-tree-'));
  try {
    for (const directory of ['src', 'tools', 'docs', 'drizzle', 'tests', 'public']) {
      copyRepositoryPath(directory, join(root, directory));
    }
    for (const file of ['package.json', 'package-lock.json', 'index.html']) {
      copyRepositoryPath(file, join(root, file));
    }
    copyRepositoryPath(configFile, join(root, extraConfig === undefined ? configFile : 'base-config.ts'));
    if (extraConfig !== undefined) {
      writeFixtureFile(root, extraConfig.path, extraConfig.source);
      writeFixtureFile(root, 'src/injected-runtime-consumer.ts', "import policy from '@policy'; void policy;");
    }
    mkdirSync(join(root, 'node_modules'));
    return await runHeldoutRuntimeGuard({ root, slice: 'F', bindings });
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

describe('held-out runtime resolution guard', () => {
  it('passes the Node 24 bubblewrap isolation preflight', () => {
    const preflight = runHeldoutIsolationPreflight();
    expect(preflight).toMatchObject({
      status: 'passed',
      bubblewrapVersion: 'bubblewrap 0.6.1',
      runtimeVersion: 'v24.13.0',
      checks: expect.arrayContaining([
        'scratch_write_allowed',
        'work_read_only',
        'guard_read_only',
        'external_network_unreachable',
        'new_session_and_die_with_parent_enabled',
      ]),
    });
    expect(preflight.uidTaskCount).toBeGreaterThan(0);
    expect(preflight.nprocLimit).toBeGreaterThan(preflight.uidTaskCount);
    expect(preflight.nprocLimit).toBeGreaterThanOrEqual(2_048);
  });

  it('reports a real Vite alias resolution to the protected module', async () => {
    const report = await inspectFixture({
      config: "export default { resolve: { alias: { '@policy': '/work/src/vtt/heldout-evaluation.ts' } } };",
    });

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'runtime_protocol_resolution',
    }));
    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '@policy',
      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
      status: 'protected',
    }));
  });

  it.each([
    ['virtual module', `export default {plugins:[{name:'virtual-policy',resolveId(id){if(id==='@policy')return '\\0virtual:policy'},load(id){if(id==='\\0virtual:policy')return "export {default} from '${protectedTarget}'"}}]};`, "import value from '@policy';void value;"],
    ['redirected builtin', `export default {plugins:[{name:'builtin-redirect',enforce:'pre',resolveId(id){if(id==='node:path')return '\\0virtual:path'},load(id){if(id==='\\0virtual:path')return "export {default} from '${protectedTarget}'"}}]};`, "import value from 'node:path';void value;"],
  ] as const)('transforms a non-boundary %s before classifying it clean', async (_label, config, consumer) => {
    const report = await inspectFixture({ config, consumer });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
    expect(report.resolution).toContainEqual(expect.objectContaining({
      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
      status: 'protected',
    }));
  });

  it('keeps protected-control traversal separate from an ordinary visit to the same virtual module', async () => {
    const report = await inspectFixture({
      config: `export default {plugins:[{name:'shared-control',resolveId(id){if(id==='@policy'||id==='/src/vtt/heldout-evaluation.ts')return '\\0virtual:shared'},load(id){if(id==='\\0virtual:shared')return "export default '${reserveDigest}'"}}]};`,
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
    expect(report.resolution).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'protected_control', status: 'control' }),
      expect.objectContaining({ status: 'protected' }),
    ]));
  });

  it('canonicalizes a candidate-local symlink before protected identity classification', async () => {
    const leak = await inspectFixture({
      config: "export default {resolve:{preserveSymlinks:true,alias:{'@policy':'/work/src/policy-link.ts'}}};",
      symlinks: { 'src/policy-link.ts': 'vtt/heldout-evaluation.ts' },
    });
    const clean = await inspectFixture({
      config: "export default {resolve:{preserveSymlinks:true,alias:{'@policy':'/work/src/policy-link.ts'}}};",
      symlinks: { 'src/policy-link.ts': 'ordinary.ts' },
    });

    expect(leak.resolution).toContainEqual(expect.objectContaining({
      specifier: '@policy',
      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
      status: 'protected',
    }));
    expect(leak.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
    expect(clean.findings).toEqual([]);
  });

  it('preserves require provenance and selects the require package condition', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "import {createRequire} from 'node:module';const load=createRequire(import.meta.url);load('#policy');",
      packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {
        '#policy': { require: protectedPackageTarget, import: './src/ordinary.ts' },
      } }),
    });

    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '#policy',
      loaderKind: 'require',
      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
      status: 'protected',
    }));
  });

  it.each([
    ['opaque external', "export default {plugins:[{name:'opaque',resolveId(id){if(id==='@policy')return {id:'opaque-policy',external:true}}}]};"],
    ['unloadable virtual result', "export default {plugins:[{name:'unloadable',resolveId(id){if(id==='@policy')return '\\0virtual:missing'} }]};"],
  ] as const)('fails closed for an %s resolver result', async (_label, config) => {
    const report = await inspectFixture({ config });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
    expect(report.resolution).not.toContainEqual(expect.objectContaining({
      specifier: '@policy',
      status: 'clean',
    }));
  });

  it('reports a plugin closeBundle failure instead of swallowing it', async () => {
    const report = await inspectFixture({
      config: "export default {plugins:[{name:'close-failure',closeBundle(){throw new TypeError('close failed')}}]};",
      consumer: "import value from './ordinary';void value;",
    });

    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
      environment: '<close>',
      status: 'failed',
      errorClass: 'TypeError',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'configuration_load_failed',
      detail: 'vite.config.mjs close failed (TypeError)',
    }));
  });

  it('produces deterministic provenance for a delayed diamond graph', async () => {
    const configuration = (aDelay: number, bDelay: number) => `export default {plugins:[{name:'diamond',async resolveId(id,importer){if(id==='virtual:shared'){await new Promise(resolve=>setTimeout(resolve,importer?.endsWith('/a.ts')?${String(aDelay)}:${String(bDelay)}));return '\\0virtual:shared'}},load(id){if(id==='\\0virtual:shared')return 'export default 1'}}]};`;
    const fixture = {
      consumer: "import './a';import './b';",
      files: {
        'src/a.ts': "import value from 'virtual:shared';void value;",
        'src/b.ts': "import value from 'virtual:shared';void value;",
      },
    } as const;
    const first = await inspectFixture({ ...fixture, config: configuration(25, 0) });
    const second = await inspectFixture({ ...fixture, config: configuration(0, 25) });

    expect(first.resolution).toEqual(second.resolution);
    expect(first.findings).toEqual(second.findings);
    expect(first.resolution).toContainEqual(expect.objectContaining({
      seed: 'src/a.ts',
      specifier: 'virtual:shared',
      status: 'clean',
    }));
  });

  it.each(migratedRuntimeCases)('executes $finding through the installed resolver', async (runtimeCase) => {
    const report = await inspectFixture(runtimeCase);

    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'runtime_protocol_resolution',
    }));
    expect(report.resolution).toContainEqual(expect.objectContaining({
      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
      specifier: runtimeCase.expectedSpecifier ?? '@policy',
      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
      status: 'protected',
    }));
    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
      file: runtimeCase.configFile ?? 'vite.config.mjs',
      status: 'loaded',
    }));
  });

  it.each(migratedRuntimeCases)('keeps the $finding ordinary-target mutant clean', async (runtimeCase) => {
    const redirectedFiles = Object.fromEntries(Object.entries(runtimeCase.files ?? {}).map(([path, source]) => [
      path,
      source.replaceAll(protectedTarget, '/work/src/ordinary.ts'),
    ]));
    const report = await inspectFixture({
      ...runtimeCase,
      config: runtimeCase.config.replaceAll(protectedTarget, '/work/src/ordinary.ts')
        .replaceAll('/src/vtt/heldout-evaluation.ts', '/src/ordinary.ts'),
      files: redirectedFiles,
      ...(runtimeCase.packageJson === undefined ? {} : {
        packageJson: runtimeCase.packageJson
          .replaceAll(protectedTarget, '/work/src/ordinary.ts')
          .replaceAll(protectedPackageTarget, './src/ordinary.ts')
          .replaceAll('./src/vtt/heldout-*.ts', './src/ordinary.ts'),
      }),
    });

    expect(report.findings).toEqual([]);
    expect(report.resolution).toContainEqual(expect.objectContaining({
      configuration: runtimeCase.configFile ?? 'vite.config.mjs',
      specifier: (runtimeCase.expectedSpecifier ?? '@policy')
        .replaceAll('/src/vtt/heldout-evaluation.ts', '/src/ordinary.ts'),
      resolvedId: '<candidate>/src/ordinary.ts',
      phase: 'resolve',
      status: 'resolved',
    }));
  });

  it.each(cleanRuntimeControls)('keeps the $finding negative control clean', async (runtimeCase) => {
    const report = await inspectFixture(runtimeCase);

    expect(report.findings).toEqual([]);
    expect(report.resolution).not.toContainEqual(expect.objectContaining({ status: 'protected' }));
  });

  it('fails closed when the alias is removed while the consumer remains', async () => {
    const report = await inspectFixture({ config: 'export default {};' });

    expect(report.findings.length).toBeGreaterThan(0);
    expect(report.findings.every((finding) => finding.kind === 'unresolved_module_edge')).toBe(true);
    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '@policy',
      resolvedId: null,
      status: 'unresolved',
    }));
    expect(report.resolution).not.toContainEqual(expect.objectContaining({
      specifier: '@policy',
      status: 'protected',
    }));
    expect(report.resolution).not.toContainEqual(expect.objectContaining({
      specifier: '@policy',
      status: 'clean',
    }));
  });

  it('fails closed when a package import is not mapped', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "import value from '#not-mapped';void value;",
      packageJson: JSON.stringify({ name: 'heldout-runtime-fixture', type: 'module', imports: {} }),
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '#not-mapped',
      status: 'unresolved',
    }));
  });

  it.each([
    ['nonliteral alias source', 'const alias=loadAliases();export default {resolve:{alias}};'],
    ['nonliteral alias-entry spread', "const extra=loadOverrides();export default {resolve:{alias:[{find:'@safe',replacement:'/work/src/ordinary.ts',...extra}]}};"],
    ['untrackable call-result transfer', 'const alias={nested:{value:loadAliases()}};export default {resolve:{alias}};'],
    ['undefined reachable-const consumer', 'const shared={resolve:{alias:{}}};consume(shared);export default shared;'],
    ['undefined configuration factory', 'const shared=makeConfig();export default shared;'],
  ] as const)('fails closed when executing a %s', async (_label, config) => {
    const report = await inspectFixture({ config });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'configuration_load_failed' }));
    expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('uses the real transform result for import.meta.glob and raw module edges', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: [
        "export const modules = import.meta.glob('./vtt/heldout-*.ts');",
        "import source from './vtt/heldout-evaluation.ts?raw';",
        "export const asset = new URL('./vtt/heldout-evaluation.ts?url', import.meta.url);",
        'export { source };',
      ].join('\n'),
    });

    expect(report.resolution).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'transformed', status: 'protected' }),
      expect.objectContaining({
        source: 'transformed',
        specifier: '/src/vtt/heldout-evaluation.ts?raw',
        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts?raw',
        status: 'protected',
      }),
      expect.objectContaining({
        source: 'transformed',
        specifier: '/src/vtt/heldout-evaluation.ts?url',
        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts?url',
        status: 'protected',
      }),
    ]));
    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
  });

  it('traverses tools-only SSR dynamicDeps generated by import.meta.glob', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "import value from './ordinary';void value;",
      files: {
        'tools/runtime-glob.ts': "export const modules=import.meta.glob('../src/vtt/heldout-*.ts');",
      },
    });

    expect(report.resolution).toContainEqual(expect.objectContaining({
      seed: 'tools/runtime-glob.ts',
      source: 'transformed',
      loaderKind: 'dynamic_import',
      status: 'protected',
    }));
  });

  it('traverses tools-only SSR dynamicDeps generated by an activated plugin', async () => {
    const report = await inspectFixture({
      config: `export default {plugins:[{name:'runtime-generated-import',transform(code,id){return id.endsWith('/tools/runtime-plugin.ts')?code+"\\nvoid import('/src/vtt/heldout-evaluation.ts')":null}}]};`,
      consumer: "import value from './ordinary';void value;",
      files: { 'tools/runtime-plugin.ts': 'export const value=1;' },
    });

    expect(report.resolution).toContainEqual(expect.objectContaining({
      seed: 'tools/runtime-plugin.ts',
      source: 'transformed',
      loaderKind: 'dynamic_import',
      status: 'protected',
    }));
  });

  const runtimeGlobCases = [
    [
      'exact glob',
      "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts');",
      "export const modules=import.meta.glob('./ordinary.ts');",
    ],
    [
      'negative glob ordering',
      "export const modules=import.meta.glob(['./vtt/*.ts','!./vtt/ordinary.ts']);",
      "export const modules=import.meta.glob(['./vtt/*.ts','!./vtt/heldout-evaluation.ts']);",
    ],
    [
      'extglob',
      "export const modules=import.meta.glob('./vtt/@(heldout-evaluation).ts');",
      "export const modules=import.meta.glob('./@(ordinary).ts');",
    ],
    [
      'literal option spread and base',
      "export const modules=import.meta.glob('./heldout-evaluation.ts',{...{base:'./vtt'},eager:true});",
      "export const modules=import.meta.glob('./ordinary.ts',{...{base:'./'},eager:true});",
    ],
    [
      'query option',
      "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts',{query:'?raw',import:'default'});",
      "export const modules=import.meta.glob('./ordinary.ts',{query:'?raw',import:'default'});",
    ],
    [
      'wildcard eager glob',
      "export const modules=import.meta.glob('./vtt/heldout-*.ts',{eager:true});",
      "export const modules=import.meta.glob('./ordinary*.ts',{eager:true});",
    ],
    [
      'array glob with query',
      "export const modules=import.meta.glob(['./ordinary.ts','./vtt/heldout-*.ts'],{query:'?raw'});",
      "export const modules=import.meta.glob(['./ordinary.ts'],{query:'?raw'});",
    ],
    [
      'object-query glob',
      "export const modules=import.meta.glob('./vtt/heldout-*.ts',{query:{raw:'true',worker:false}});",
      "export const modules=import.meta.glob('./ordinary*.ts',{query:{raw:'true',worker:false}});",
    ],
  ] as const;

  it.each(runtimeGlobCases)('delegates %s matching to the installed Vite transform', async (_label, leakConsumer) => {
    const leak = await inspectFixture({ config: 'export default {};', consumer: leakConsumer });

    expect(leak.resolution).toContainEqual(expect.objectContaining({
      status: 'protected',
      source: 'transformed',
    }));
    expect(leak.findings).toContainEqual(expect.objectContaining({ kind: 'runtime_protocol_resolution' }));
  });

  it('retains the exact query suffix in runtime resolution evidence', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "export const modules=import.meta.glob('./vtt/heldout-evaluation.ts',{query:'?raw'});",
    });

    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '/src/vtt/heldout-evaluation.ts?raw',
      resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts?raw',
      status: 'protected',
    }));
  });

  it('fails closed for an aliased import.meta.glob call that Vite cannot macro-expand', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "const discover=import.meta.glob;discover('./vtt/heldout-evaluation.ts');",
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: './vtt/heldout-evaluation.ts',
      status: 'unresolved',
    }));
  });

  it.each([
    ['package glob', "import.meta.glob('#policy/*.ts')"],
    ['alias glob', "import.meta.glob('@policy/*.ts')"],
  ] as const)('fails closed for an unsupported %s', async (_label, consumer) => {
    const report = await inspectFixture({ config: 'export default {};', consumer });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
  });

  it.each(runtimeGlobCases)('keeps the %s transform mutant clean', async (_label, _leakConsumer, cleanConsumer) => {
    const clean = await inspectFixture({ config: 'export default {};', consumer: cleanConsumer });

    expect(clean.findings).toEqual([]);
  });

  it('fails closed before Vite performs an unbounded leading-globstar filesystem scan', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "export const modules=import.meta.glob('**/heldout-evaluation.ts');",
    });

    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '**/heldout-evaluation.ts',
      status: 'unresolved',
      source: 'transformed',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
  });

  it('fails closed before a based leading-globstar can scan the filesystem root', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "export const modules=import.meta.glob('**/heldout-evaluation.ts',{base:'./',eager:true});",
    });

    expect(report.resolution).toContainEqual(expect.objectContaining({
      specifier: '**/heldout-evaluation.ts',
      status: 'unresolved',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
  });

  it('does not misreport an ordinary leading-globstar mutant as protected', async () => {
    const report = await inspectFixture({
      config: 'export default {};',
      consumer: "export const modules=import.meta.glob('**/ordinary-runtime-control.ts');",
      files: { 'src/ordinary-runtime-control.ts': 'export default 3;' },
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'unresolved_module_edge' }));
    expect(report.resolution).not.toContainEqual(expect.objectContaining({ status: 'protected' }));
  });

  it('excludes declaration-only files from runtime seed and transform inspection', async () => {
    const report = await inspectFixture({
      config: "export default {resolve:{alias:{'@policy':'/work/src/ordinary.ts'}}};",
      files: { 'src/runtime-only.d.ts': "import type Value from './vtt/heldout-evaluation';export type Alias=Value;" },
    });

    expect(report.findings).toEqual([]);
    expect(report.eligibleFiles).toBe(2);
    expect(report.astInspectedFiles).toBe(2);
    expect(report.seedAssignments).not.toContainEqual(expect.objectContaining({ seed: 'src/runtime-only.d.ts' }));
  });

  it('records conservative source ownership for every Vitest project and keeps tools server-only', async () => {
    const report = await inspectFixture({
      configFile: 'vitest.config.mjs',
      config: "export default {test:{projects:[{test:{name:'first'}},{test:{name:'second'}}]}};",
      consumer: "import value from './ordinary'; void value;",
      files: { 'tools/tool.ts': "import {join} from 'node:path'; export const value=join('a','b');" },
    });
    const sourceProjects = new Set(report.seedAssignments
      .filter((row) => row.seed === 'src/consumer.ts')
      .map((row) => row.project));
    const toolAssignments = report.seedAssignments.filter((row) => row.seed === 'tools/tool.ts');

    expect(sourceProjects.has('first')).toBe(true);
    expect(sourceProjects.has('second')).toBe(true);
    expect(toolAssignments.length).toBeGreaterThan(0);
    expect(toolAssignments.every((row) => row.environment !== 'client')).toBe(true);
  });

  it('emits byte-identical canonical reports from separate processes', () => {
    const root = prepareFixtureRoot({
      config: `export default {resolve:{alias:{'@policy':'${protectedTarget}'}}};`,
    });
    try {
      const moduleUrl = pathToFileURL(join(process.cwd(), 'tools/heldout-runtime-guard.ts')).href;
      const script = [
        `import {canonicalHeldoutRuntimeReport,runHeldoutRuntimeGuard} from ${JSON.stringify(moduleUrl)};`,
        `const report=await runHeldoutRuntimeGuard({root:process.argv[1],slice:'F',bindings:${JSON.stringify(bindings)}});`,
        'process.stdout.write(JSON.stringify(canonicalHeldoutRuntimeReport(report)));',
      ].join('');
      const run = () => spawnSync(process.execPath, [
        '--no-warnings', '--experimental-strip-types', '--input-type=module', '-e', script, root,
      ], { encoding: 'utf8', timeout: 120_000 });
      const first = run();
      const second = run();

      expect(first.status).toBe(0);
      expect(second.status).toBe(0);
      expect(first.stderr).toBe('');
      expect(second.stderr).toBe('');
      expect(first.stdout).toBe(second.stdout);
      const canonical: unknown = JSON.parse(first.stdout);
      expect(canonical).toEqual(expect.objectContaining({
        resolution: expect.arrayContaining([expect.objectContaining({
          specifier: '@policy',
          loaderKind: 'static_import',
          status: 'protected',
        })]),
        findings: expect.arrayContaining([expect.objectContaining({ kind: 'runtime_protocol_resolution' })]),
      }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('fails closed when configuration execution throws', async () => {
    const report = await inspectFixture({ config: "throw new TypeError('fixture-load-failure');" });

    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
      file: 'vite.config.mjs',
      status: 'failed',
      errorClass: 'TypeError',
    }));
    expect(report.findings).toContainEqual(expect.objectContaining({
      kind: 'configuration_load_failed',
    }));
  });

  it.each([
    ['missing project extends file', "export default {test:{projects:[{name:'missing',extends:'./missing.config.mjs'}]}};", {}],
    ['throwing project extends file', "export default {test:{projects:[{name:'throwing',extends:'./project.config.mjs'}]}};",
      { 'project.config.mjs': "throw new TypeError('extended-config-failure');" }],
    ['outside-repository project extends file', "export default {test:{projects:[{name:'outside',extends:'../outside.config.mjs'}]}};", {}],
  ] as const)('fails closed for a %s', async (_label, config, files) => {
    const report = await inspectFixture({
      configFile: 'vitest.config.mjs',
      config,
      files,
    });

    expect(report.findings).toContainEqual(expect.objectContaining({ kind: 'configuration_load_failed' }));
    expect(report.configurationLoad).toContainEqual(expect.objectContaining({ status: 'failed' }));
  });

  it('documents that installed Vitest does not recursively consume project lists from an extended project config', async () => {
    const report = await inspectFixture({
      configFile: 'vitest.config.mjs',
      config: "export default {test:{projects:[{name:'cycle',extends:'./project.config.mjs'}]}};",
      files: {
        'project.config.mjs': "export default {test:{projects:[{name:'back',extends:'./vitest.config.mjs'}]}};",
      },
      consumer: "import value from './ordinary';void value;",
    });

    expect(report.findings).toEqual([]);
    expect(new Set(report.configurationLoad.filter((row) => row.kind === 'vitest-project')
      .map((row) => row.project))).toEqual(new Set(['0']));
    expect(report.loadedConfigurationFiles).toContain('project.config.mjs');
  });

  it('routes every actually loaded root-level extended configuration through retained Rule N', async () => {
    const fixture: RuntimeFixture = {
      configFile: 'vitest.config.mjs',
      config: "export default {test:{projects:[{name:'extended',extends:'./project.config.mjs'}]}};",
      files: {
        'project.config.mjs': [
          "import {createRequire} from 'node:module';",
          'const box={load:createRequire(import.meta.url)};',
          'export default {};',
        ].join('\n'),
      },
      consumer: "import value from './ordinary';void value;",
    };
    const root = prepareFixtureRoot(fixture);
    try {
      const runtime = await runHeldoutRuntimeGuard({ root, slice: 'F', bindings });
      const staticReport = inspectHeldoutCandidateTree(root, 'F', bindings, runtime.loadedConfigurationFiles);

      expect(runtime.loadedConfigurationFiles).toContain('project.config.mjs');
      expect(staticReport.findings).toContainEqual(expect.objectContaining({
        path: 'project.config.mjs',
        kind: 'loader_reference_escaped',
      }));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it('kills a timed-out configuration process group and removes its scratch directory', async () => {
    const before = new Set(readdirSync(tmpdir()).filter((name) => name.startsWith('heldout-runtime-')));
    await expect(inspectFixture({
      config: 'while (true) {}',
      aggregateTimeoutMs: 250,
    })).rejects.toThrow('aggregate timeout');
    const after = readdirSync(tmpdir()).filter((name) =>
      name.startsWith('heldout-runtime-') && !before.has(name));
    const survivingCommands = readdirSync('/proc', { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && /^\d+$/u.test(entry.name))
      .flatMap((entry) => {
        try {
          return [readFileSync(`/proc/${entry.name}/cmdline`, 'utf8')];
        } catch {
          return [];
        }
      })
      .filter((command) => command.includes(lastFixtureRoot));

    expect(after).toEqual([]);
    expect(survivingCommands).toEqual([]);
  });

  it('rejects a candidate lock that differs from the trusted installation baseline', async () => {
    await expect(inspectFixture({
      config: 'export default {};',
      lockFile: '{}',
    })).rejects.toThrow('candidate lock does not match');
  });

});

describe.each([
  ['Vite', 'vite.config.ts'],
  ['Vitest', 'vitest.config.ts'],
] as const)('actual %s configuration runtime control', (_label, configFile) => {
  let report: HeldoutRuntimeGuardReport;
  beforeAll(async () => {
    report = await inspectRealTree(configFile);
  }, 120_000);

  it('has zero findings after loading and traversing the real tree', () => {
    expect(report.findings).toEqual([]);
    expect(report.eligibleFiles).toBe(realTreeEligibleSeedCount);
    expect(report.astInspectedFiles).toBe(realTreeEligibleSeedCount);
    expect(report.configurationLoad).toContainEqual(expect.objectContaining({
      file: configFile,
      status: 'loaded',
    }));
  });
});

describe('real-tree failure sensitivity', () => {
  let injectedAliasRealTreeReport: HeldoutRuntimeGuardReport;
  let injectedResolverRealTreeReport: HeldoutRuntimeGuardReport;
  beforeAll(async () => {
    [injectedAliasRealTreeReport, injectedResolverRealTreeReport] = await Promise.all([
      inspectRealTree('vite.config.ts', {
        path: 'vite.config.mjs',
        source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,resolve:{...value.resolve,alias:{'@policy':'${protectedTarget}'}}}};`,
      }),
      inspectRealTree('vite.config.ts', {
        path: 'vite.config.mjs',
        source: `import base from './base-config.ts';export default async env=>{const value=typeof base==='function'?await base(env):base;return {...value,plugins:[...(value.plugins??[]),{name:'injected-resolver',resolveId(id){if(id==='@policy')return '${protectedTarget}'}}]}};`,
      }),
    ]);
  }, 120_000);

  it.each([
    ['alias', 'alias', 'vite.config.mjs', 6],
    ['resolveId hook', 'resolver', 'vite.config.mjs', 4],
  ] as const)('reports the injected %s and keeps its canonical configuration identity',
    (_label, reportKind, configuration, expectedFindingCount) => {
      const report = reportKind === 'alias' ? injectedAliasRealTreeReport : injectedResolverRealTreeReport;
      expect(report.findings).toHaveLength(expectedFindingCount);
      expect(report.eligibleFiles).toBe(realTreeEligibleSeedCount + 1);
      expect(report.astInspectedFiles).toBe(realTreeEligibleSeedCount + 1);
      expect(report.findings.every((finding) => finding.kind === 'runtime_protocol_resolution')).toBe(true);
      expect(report.findings).toContainEqual(expect.objectContaining({
        kind: 'runtime_protocol_resolution',
      }));
      expect(report.resolution).toContainEqual(expect.objectContaining({
        configuration,
        specifier: '@policy',
        resolvedId: '<candidate>/src/vtt/heldout-evaluation.ts',
        status: 'protected',
      }));
      expect(report.resolution).toContainEqual(expect.objectContaining({
        seed: 'src/injected-runtime-consumer.ts',
        source: 'transformed',
        loaderKind: 'static_import',
        status: 'protected',
      }));
  });
});

describe('configuration-free held-out CLI', () => {
  it('rejects missing arguments before candidate inspection', () => {
    const result = spawnSync(process.execPath, [
      '--experimental-strip-types', 'tools/heldout-leak-check.ts',
    ], { encoding: 'utf8' });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('--protocol must be heldout-ordinary-v1');
    expect(result.stdout).toBe('');
  });

  it('reports a failed namespace preflight and never reports runtime completion', () => {
    const result = spawnSync(process.execPath, [
      '--experimental-strip-types', 'tools/heldout-leak-check.ts', ...cliArguments,
    ], {
      encoding: 'utf8',
      timeout: 30_000,
      env: { ...process.env, HELDOUT_RUNTIME_BWRAP_PATH: '/missing/heldout-bwrap' },
    });

    expect(result.status).toBe(1);
    const report: unknown = JSON.parse(result.stdout);
    expect(report).toEqual(expect.objectContaining({
      runtimeCompleted: false,
      preflight: expect.objectContaining({ status: 'isolation_failed' }),
    }));
  });

  it('runs a successful real-tree inspection without a configuration-aware parent loader', () => {
    const result = spawnSync(process.execPath, [
      '--experimental-strip-types', 'tools/heldout-leak-check.ts', ...cliArguments,
    ], { encoding: 'utf8', timeout: 120_000, maxBuffer: 128 * 1024 * 1024 });

    expect(result.status).toBe(0);
    const report: unknown = JSON.parse(result.stdout);
    expect(report).toEqual(expect.objectContaining({
      runtimeCompleted: true,
      findings: [],
      preflight: expect.objectContaining({ status: 'passed' }),
    }));
  }, 120_000);
});
