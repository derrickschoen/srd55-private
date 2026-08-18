import { createServer, version as viteVersion } from 'vite';
import { ViteNodeRunner } from 'vite-node/client';
import { ViteNodeServer } from 'vite-node/server';
import { installSourcemapsSupport } from 'vite-node/source-map';

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  cacheDir: '/tmp/dnd-lane-explain-perf-vite-cache',
  logLevel: 'error',
  optimizeDeps: { noDiscovery: true },
  server: { middlewareMode: true, watch: null },
});

try {
  if (Number(viteVersion.split('.')[0]) < 6) {
    await server.pluginContainer.buildStart({});
  } else {
    await server.environments.client.pluginContainer.buildStart({});
  }
  const node = new ViteNodeServer(server);
  installSourcemapsSupport({
    getSourceMap: (source) => node.getSourceMap(source),
  });
  const runner = new ViteNodeRunner({
    root: server.config.root,
    base: server.config.base,
    fetchModule: (id) => node.fetchModule(id),
    resolveId: (id, importer) => node.resolveId(id, importer),
  });
  await runner.executeId('/@vite/env');
  await runner.executeFile('./scripts/perf/explain-queries.mjs');
} finally {
  await server.close();
}
