import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HermexConfigSchema } from './schema';
import type { HermexConfig } from './schema';

export async function loadConfig(cwd: string): Promise<HermexConfig> {
  const tsPath = join(cwd, 'hermex.config.ts');
  const jsonPath = join(cwd, '.hermex.json');

  if (existsSync(tsPath)) {
    const mod = await import(pathToFileURL(resolve(tsPath)).href);
    return HermexConfigSchema.parse(mod.default ?? mod);
  }

  if (existsSync(jsonPath)) {
    return HermexConfigSchema.parse(
      JSON.parse(readFileSync(jsonPath, 'utf-8')),
    );
  }

  return HermexConfigSchema.parse({});
}
