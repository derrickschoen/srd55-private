import {
  buildEngineChildBundle,
  checkEngineChildBundle,
  ENGINE_CHILD_BUNDLE_ENV,
  EngineChildBundleError,
} from '../../tools/engine-child-bundle';

/**
 * Builds the engine child bundle once per Vitest process, before any worker
 * forks, and offers it to every worker through `DND_ENGINE_CHILD_BUNDLE`.
 * `startMcpClient` re-checks it on every spawn (`tools/engine-child-bundle.ts`).
 *
 * A build that fails, or a bundle that does not check valid against the
 * checkout that just built it, stops the run. Degrading here would turn every
 * engine child back into a 5 s vite-node boot behind a green run.
 */
export default async function setup(): Promise<void> {
  const root = process.cwd();
  const started = performance.now();
  const bundle = await buildEngineChildBundle(root);
  const check = checkEngineChildBundle(root, bundle.bundlePath);
  if (check.status !== 'valid') {
    throw new EngineChildBundleError(
      `The engine child bundle just built at ${bundle.bundlePath} checks ${check.status}: ${check.reason}.`,
    );
  }
  process.env[ENGINE_CHILD_BUNDLE_ENV] = bundle.bundlePath;
  console.log(
    `[engine-child-bundle] built ${bundle.bundlePath} in ${String(Math.round(performance.now() - started))} ms`,
  );
}
