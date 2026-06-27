import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HermexConfigSchema } from './schema';
import type { HermexConfig } from './schema';

function parseConfig(raw: unknown): HermexConfig {
  const result = HermexConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`hermex config validation failed:\n${issues}`);
  }
  return result.data;
}

export async function loadConfig(cwd: string): Promise<HermexConfig> {
  const tsConfigPath = join(cwd, 'hermex.config.ts');
  const mtsConfigPath = join(cwd, 'hermex.config.mts');
  const jsonConfigPath = join(cwd, '.hermex.json');
  const jsonFallbackPath = join(cwd, 'hermex.config.json');

  if (existsSync(tsConfigPath) || existsSync(mtsConfigPath)) {
    const configPath = existsSync(tsConfigPath) ? tsConfigPath : mtsConfigPath;
    try {
      const url = pathToFileURL(resolve(configPath)).href;
      const mod = await import(url);
      return parseConfig(mod.default ?? mod);
    } catch (error: any) {
      throw new Error(`Failed to load hermex.config.ts: ${error.message}`);
    }
  }

  if (existsSync(jsonConfigPath) || existsSync(jsonFallbackPath)) {
    const configPath = existsSync(jsonConfigPath)
      ? jsonConfigPath
      : jsonFallbackPath;
    try {
      return parseConfig(JSON.parse(readFileSync(configPath, 'utf-8')));
    } catch (error: any) {
      throw new Error(`Failed to load ${configPath}: ${error.message}`);
    }
  }

  // No config file found — parse empty object to get all defaults
  return parseConfig({});
}
