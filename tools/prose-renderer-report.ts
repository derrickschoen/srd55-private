import { encounterSessionId } from '../src/combat/values';
import { freshMonsterPlanningState, createEngineMcpRuntime, loadArenaFixture } from '../src/vtt/mcp/entrypoint';
import { TURN_CONTEXT_MAX_BYTES } from '../src/vtt/mcp/engine-server';
import { DEFAULT_RENDERER_PROFILE, type RendererFormat } from '../src/vtt/renderer-profile';

const SEEDS = [6203001, 6203002, 6203003, 6203004, 6203005, 6203006, 6203007, 6203008, 6203009, 6203010] as const;
const FORMATS = ['structured', 'caveman_prose', 'regular_prose'] as const satisfies readonly RendererFormat[];
const encoder = new TextEncoder();

function object(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError('Turn context is not an object.');
  }
  return value as Readonly<Record<string, unknown>>;
}

async function render(seed: number, format: RendererFormat): Promise<Readonly<Record<string, unknown>>> {
  const loaded = await loadArenaFixture(`tests/fixtures/arena-basis-brutal/seed-${String(seed)}.json`);
  const runtime = createEngineMcpRuntime(freshMonsterPlanningState(loaded), {
    runId: encounterSessionId(`encounter:prose-report:${String(seed)}`),
    revision: 1,
    rendererProfile: { ...DEFAULT_RENDERER_PROFILE, format },
    turnContextMaximumBytes: TURN_CONTEXT_MAX_BYTES,
  });
  const capsule = runtime.feed.current();
  return object(runtime.toolSurface.execute('engine.get_turn_context', {
    run_id: capsule.runId,
    expected_revision: capsule.revision,
    scope: 'round',
    granularity: 'full',
    intel_mode: 'full',
  }));
}

const rows: string[] = [];
let cavemanSample = '';
let regularSample = '';
for (const seed of SEEDS) {
  const contexts = await Promise.all(FORMATS.map(async (format) => [format, await render(seed, format)] as const));
  const byFormat = new Map(contexts);
  const structured = byFormat.get('structured');
  const caveman = byFormat.get('caveman_prose');
  const regular = byFormat.get('regular_prose');
  if (structured === undefined || caveman === undefined || regular === undefined) {
    throw new Error(`Seed ${String(seed)} omitted a renderer format.`);
  }
  const structuredBytes = encoder.encode(JSON.stringify(structured)).byteLength;
  const cavemanDocument = String(caveman['document']);
  const regularDocument = String(regular['document']);
  rows.push(`| ${String(seed)} | ${String(structuredBytes)} | ${String(encoder.encode(cavemanDocument).byteLength)} | ${String(encoder.encode(regularDocument).byteLength)} |`);
  if (seed === 6203001) {
    cavemanSample = cavemanDocument;
    regularSample = regularDocument;
  }
}

process.stdout.write([
  '# Caveman prose sample: seed 6203001',
  '',
  cavemanSample,
  '',
  '# Regular prose sample: seed 6203001',
  '',
  regularSample,
  '',
  '# Bytes',
  '',
  '| Seed | Structured JSON | Caveman prose | Regular prose |',
  '|---:|---:|---:|---:|',
  ...rows,
  '',
].join('\n'));
