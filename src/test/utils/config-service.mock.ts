import { ConfigService } from '@nestjs/config';

type ConfigValues = Record<string, string | number | boolean | undefined>;

/**
 * Creates a lightweight mock for Nest's ConfigService.
 * Values can be provided per key, with an optional fallback under `default`.
 */
export const createConfigServiceMock = (
  values: ConfigValues = {},
): ConfigService => {
  const fallback = values.default ?? 'test-value';

  return {
    get: (key: string) => (key in values ? values[key] : fallback),
  } as ConfigService;
};
