import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));
const server = await createServer({
  root: projectRoot,
  configLoader: 'runner',
  cacheDir: '/tmp/dnd-relationship-index-vite-cache',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true },
  appType: 'custom',
});

try {
  const node = new ViteNodeServer(server);
  const runner = new ViteNodeRunner({
    root: server.config.root,
    base: server.config.base,
    fetchModule: (id) => node.fetchModule(id),
    resolveId: (id, importer) => node.resolveId(id, importer),
  });
  await runner.executeFile(
    fileURLToPath(new URL('./relationship-index-trials.ts', import.meta.url)),
  );
} finally {
  await server.close();
}
