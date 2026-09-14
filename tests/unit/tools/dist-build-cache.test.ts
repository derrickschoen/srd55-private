import { describe, expect, it } from 'vitest';

type ProductionBuildEnv = (
  parentEnv: Readonly<Record<string, string | undefined>>,
) => Record<string, string | undefined>;

function exposesProductionBuildEnv(
  value: unknown,
): value is { productionBuildEnv: ProductionBuildEnv } {
  return typeof value === 'object' && value !== null &&
    'productionBuildEnv' in value &&
    typeof value.productionBuildEnv === 'function';
}

const buildCacheModule: unknown = await import(
  new URL('../../../tools/dist-build-cache.mjs', import.meta.url).href
);
if (!exposesProductionBuildEnv(buildCacheModule)) {
  throw new TypeError('dist-build-cache.mjs does not export productionBuildEnv.');
}
const { productionBuildEnv } = buildCacheModule;

describe('productionBuildEnv', () => {
  it('overrides an inherited NODE_ENV with production', () => {
    expect(productionBuildEnv({ NODE_ENV: 'test' })).toEqual({
      NODE_ENV: 'production',
    });
  });

  it('sets NODE_ENV to production when the parent leaves it unset', () => {
    expect(productionBuildEnv({})).toEqual({ NODE_ENV: 'production' });
  });

  it('preserves every other parent variable', () => {
    const parentEnv = {
      NODE_ENV: 'development',
      PATH: '/example/bin',
      CUSTOM_BUILD_SETTING: 'kept',
    };

    const childEnv = productionBuildEnv(parentEnv);

    expect(childEnv).not.toBe(parentEnv);
    expect(parentEnv.NODE_ENV).toBe('development');
    expect(childEnv).toEqual({
      NODE_ENV: 'production',
      PATH: '/example/bin',
      CUSTOM_BUILD_SETTING: 'kept',
    });
  });
});
