import { createVttNodeRuntime } from './node-runtime';

interface MainOptions {
  readonly port: number;
  readonly origins: ReadonlySet<string>;
  readonly allowOriginless: boolean;
}

function options(argv: readonly string[], environment: NodeJS.ProcessEnv): MainOptions {
  let rawPort = environment.VTT_RUNTIME_PORT ?? '0';
  const origins = new Set<string>();
  let allowOriginless = environment.VTT_RUNTIME_ALLOW_ORIGINLESS === '1';
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--port' || argument === '--origin') {
      const value = argv[index + 1];
      if (value === undefined) throw new Error(`${argument} requires a value.`);
      index += 1;
      if (argument === '--port') rawPort = value;
      else origins.add(value);
      continue;
    }
    if (argument === '--allow-originless') { allowOriginless = true; continue; }
    throw new Error(`Unknown node-runtime argument ${JSON.stringify(argument)}.`);
  }
  const port = Number(rawPort);
  if (!Number.isSafeInteger(port) || port < 0 || port > 65_535 || port === 4_173) {
    throw new Error(`The runtime port must be an integer from 0 to 65535 other than 4173; received ${JSON.stringify(rawPort)}.`);
  }
  if (origins.size === 0 && !allowOriginless) throw new Error('At least one exact runtime Origin is required.');
  return { port, origins, allowOriginless };
}

async function main(): Promise<void> {
  const parsed = options(process.argv.slice(2), process.env);
  const tokensFile = process.env.VTT_RUNTIME_TOKENS_FILE;
  if (tokensFile === undefined || tokensFile.length === 0) throw new Error('VTT_RUNTIME_TOKENS_FILE is required.');
  const runtime = createVttNodeRuntime({
    tokensFile,
    allowedOrigins: parsed.origins,
    allowOriginless: parsed.allowOriginless,
  });
  const address = await runtime.listen(parsed.port);
  process.stdout.write(`vtt-runtime: listening ${address.websocketUrl}\n`);
  let closing = false;
  const close = (): void => {
    if (closing) return;
    closing = true;
    void runtime.close().then(() => process.exit(0), () => process.exit(1));
  };
  process.once('SIGINT', close);
  process.once('SIGTERM', close);
}

void main().catch((error: unknown) => {
  process.stderr.write(`vtt-runtime: ${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
