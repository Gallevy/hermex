import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { DEFAULT_CONFIG, type HermexConfig } from './types';
import { HermexConfigSchema } from './schema';

function deepMerge<T extends object>(base: T, override: Partial<T>): T {
  const result = { ...base };
  for (const key of Object.keys(override) as (keyof T)[]) {
    const val = override[key];
    if (val === undefined) continue;
    if (
      val !== null &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof base[key] === 'object' &&
      !Array.isArray(base[key])
    ) {
      result[key] = deepMerge(base[key] as object, val as object) as T[keyof T];
    } else {
      result[key] = val as T[keyof T];
    }
  }
  return result;
}

function validate(raw: unknown): Partial<HermexConfig> {
  const result = HermexConfigSchema.safeParse(raw);
  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`hermex config validation failed:\n${issues}`);
  }
  return result.data as Partial<HermexConfig>;
}

export async function loadConfig(cwd: string): Promise<HermexConfig> {
  const tsConfigPath = join(cwd, 'hermex.config.ts');
  const mtsConfigPath = join(cwd, 'hermex.config.mts');
  const jsonConfigPath = join(cwd, '.hermex.json');
  const jsonFallbackPath = join(cwd, 'hermex.config.json');

  let raw: Partial<HermexConfig> = {};

  if (existsSync(tsConfigPath) || existsSync(mtsConfigPath)) {
    const configPath = existsSync(tsConfigPath) ? tsConfigPath : mtsConfigPath;
    try {
      const url = pathToFileURL(resolve(configPath)).href;
      const mod = await import(url);
      raw = validate(mod.default ?? mod);
    } catch (error: any) {
      throw new Error(`Failed to load hermex.config.ts: ${error.message}`);
    }
  } else if (existsSync(jsonConfigPath) || existsSync(jsonFallbackPath)) {
    const configPath = existsSync(jsonConfigPath)
      ? jsonConfigPath
      : jsonFallbackPath;
    try {
      const content = readFileSync(configPath, 'utf-8');
      raw = validate(JSON.parse(content));
    } catch (error: any) {
      throw new Error(`Failed to load ${configPath}: ${error.message}`);
    }
  }

  return deepMerge(DEFAULT_CONFIG, raw);
}
