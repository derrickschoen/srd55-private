/// <reference lib="webworker" />

import { exerciseSyncAccessHandle } from './browser-capability-opfs-probe';

const scope = self as DedicatedWorkerGlobalScope;

void exerciseSyncAccessHandle(navigator.storage).then((outcome) =>
  scope.postMessage(outcome),
);
