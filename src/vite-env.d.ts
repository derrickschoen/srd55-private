/// <reference types="vite/client" />

import type { SqlRow } from './db/codecs';
import type { RpcClient } from './rpc/client';
import type { SystemInfo } from './worker/handlers/system';

interface StaticAppApi {
  info(): Promise<SystemInfo>;
  reset(): Promise<{ reset: true }>;
  writeCharacter(name: string): Promise<{ id: number; name: string }>;
  countCharacters(): Promise<number>;
  inspectRows(
    table: string,
    where?: Record<string, string | number | boolean | null>,
  ): Promise<SqlRow[]>;
  exportDatabase(): Promise<Uint8Array>;
  replaceDatabase(bytes: Uint8Array): Promise<{ replaced: true }>;
  attemptTriggerViolation(): Promise<{
    rejected: boolean;
    message: string | null;
  }>;
  attemptForeignKeyViolation(): Promise<{
    rejected: boolean;
    message: string | null;
  }>;
}

declare global {
  interface Window {
    appRpc: RpcClient;
    staticApp: StaticAppApi;
    lifecycleSnapshot: Uint8Array;
  }
}
