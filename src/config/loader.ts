import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HermexConfigSchema } from './schema';
import type { HermexConfig } from './schema';

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
    const mod = (await import(pathToFileURL(configPath).href)) as Record<
      string,
      unknown
    >;

    if (mod.default === undefined) {
      throw new Error(
        `Config file has no default export: ${configPath}\n` +
          `hermex reads the default export. Add \`export default { ... }\`, or ` +
          `\`export default defineConfig({ ... })\` for type inference.`,
      );
    }

    return HermexConfigSchema.parse(mod.default);
  }

  return HermexConfigSchema.parse({});
}
