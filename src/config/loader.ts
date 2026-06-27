import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HermexConfigSchema } from './schema';
import type { HermexConfig } from './schema';

export async function loadConfig(cwd: string): Promise<HermexConfig> {
  const configPath = join(cwd, 'hermex.config.ts');

  if (existsSync(configPath)) {
    const mod = await import(pathToFileURL(resolve(configPath)).href);
    return HermexConfigSchema.parse(mod.default ?? mod);
  }

  return HermexConfigSchema.parse({});
}
