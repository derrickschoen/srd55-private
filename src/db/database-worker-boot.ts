import { RpcError } from '../rpc/protocol';

export interface DatabaseWorkerBootPort {
  activate(): void;
  restart(): void;
}

export async function bootDatabaseWorkerWithRetry(
  worker: DatabaseWorkerBootPort,
  info: () => Promise<unknown>,
): Promise<void> {
  worker.activate();
  try {
    await info();
  } catch (error) {
    if (!(error instanceof RpcError) || error.code !== 'transport_error') {
      throw error;
    }
    worker.restart();
    await info();
  }
}

export function databaseBootFailureMessage(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message !== '') {
      return message;
    }
    if (error instanceof RpcError) {
      return `Database worker ${error.code.replaceAll('_', ' ')}; no details were reported.`;
    }
    const name = error.name.trim() || 'Error';
    return `${name}; no details were reported.`;
  }
  const message = String(error).trim();
  return message || 'Unknown database boot failure; no details were reported.';
}
