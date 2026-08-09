import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HermexConfigSchema } from './schema';
import type { HermexConfig } from './schema';
import { applyOverrides } from './overrides';

export async function loadConfig(
  cwd: string,
  explicitPath?: string,
): Promise<HermexConfig> {
  const configPath = explicitPath
    ? resolve(explicitPath)
    : join(cwd, 'hermex.config.ts');

  if (explicitPath && !existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  if (existsSync(configPath)) {
    const mod = await import(pathToFileURL(configPath).href);
    const config = HermexConfigSchema.parse(mod.default ?? mod);
    return applyOverrides(config, cwd);
  }

  return applyOverrides(HermexConfigSchema.parse({}), cwd);
}
