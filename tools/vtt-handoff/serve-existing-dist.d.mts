import type { Server } from 'node:http';

export interface DistArtifactStamp {
  readonly artifact: 'dist';
  readonly commit: string;
  readonly worker: { readonly url: string; readonly sha256: string };
}

export function validateExistingDist(directory: string): {
  readonly root: string;
  readonly stamp: DistArtifactStamp;
};
export function safeDistPath(root: string, requestPath: string): string | null;
export function createExistingDistServer(directory: string): Server;
