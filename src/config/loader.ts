import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import chalk from 'chalk';
import { HermexConfigSchema } from './schema';
import { migrateDeprecatedConfig } from './deprecations';
import type { HermexConfig } from './schema';

/**
 * Parses a raw config after migrating any deprecated keys onto their
 * current names, warning once per deprecation. Warnings go to stderr so
 * they never contaminate `--format json` on stdout.
 */
function parseConfig(raw: unknown): HermexConfig {
  const { config, warnings } = migrateDeprecatedConfig(raw);
  for (const warning of warnings) {
    console.error(chalk.yellow(`⚠ ${warning}`));
  }
  return HermexConfigSchema.parse(config);
}

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

    return parseConfig(mod.default);
  }

  return parseConfig({});
}
