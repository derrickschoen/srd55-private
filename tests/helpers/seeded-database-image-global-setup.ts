import { prepareSeededDatabaseImageCaches } from './seeded-database-image-cache';

/**
 * Builds the immutable seeded database images once, in Vitest's main process,
 * before any worker is forked. Every test restores its own writable clone, so
 * mutations never cross a test boundary.
 */
export default async function setup(): Promise<void> {
  await prepareSeededDatabaseImageCaches(['full', 'test-core']);
}
