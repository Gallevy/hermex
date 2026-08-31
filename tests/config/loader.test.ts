import { describe, it, expect, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { loadConfig } from '../../src/config/loader';

describe('loadConfig', () => {
  const dirs: string[] = [];

  afterEach(() => {
    for (const dir of dirs.splice(0))
      rmSync(dir, { recursive: true, force: true });
  });

  function scratchDir(): string {
    const dir = mkdtempSync(join(tmpdir(), 'hermex-loader-'));
    dirs.push(dir);
    return dir;
  }

  /** Each test needs a uniquely-named file — Node caches ES modules by URL. */
  function writeConfig(dir: string, contents: string): string {
    const path = join(dir, `config-${randomUUID()}.ts`);
    writeFileSync(path, contents, 'utf8');
    return path;
  }

  it('returns the all-defaults config when no config file exists and no explicitPath is given', async () => {
    const cwd = scratchDir();
    const result = await loadConfig(cwd);
    expect(result.includes).toEqual(['**/*.{tsx,jsx,ts,js}']);
  });

  it('throws when explicitPath points at a missing file', async () => {
    const cwd = scratchDir();
    await expect(
      loadConfig(cwd, join(cwd, 'does-not-exist.ts')),
    ).rejects.toThrow(/Config file not found/);
  });

  it('loads a valid config with a default export', async () => {
    const cwd = scratchDir();
    const configPath = writeConfig(
      cwd,
      `export default { includes: ['a/**'] };`,
    );
    const result = await loadConfig(cwd, configPath);
    expect(result.includes).toEqual(['a/**']);
  });

  it('throws when the config file has only a named export, no default', async () => {
    const cwd = scratchDir();
    const configPath = writeConfig(
      cwd,
      `export const config = { includes: ['a/**'] };`,
    );
    await expect(loadConfig(cwd, configPath)).rejects.toThrow(
      /no default export/,
    );
  });

  it('throws a zod error when the config value fails the schema', async () => {
    const cwd = scratchDir();
    const configPath = writeConfig(
      cwd,
      `export default { includes: 'not-an-array' };`,
    );
    await expect(loadConfig(cwd, configPath)).rejects.toThrow();
  });

  it('throws when the config has an unrecognized key', async () => {
    const cwd = scratchDir();
    const configPath = writeConfig(cwd, `export default { rulez: {} };`);
    await expect(loadConfig(cwd, configPath)).rejects.toThrow(
      /[Uu]nrecognized|unknown/,
    );
  });

  it('defaults parser to swc when the config does not set one', async () => {
    const cwd = scratchDir();
    const result = await loadConfig(cwd);
    expect(result.parser).toBe('swc');
  });

  it('accepts parser: oxc-experimental', async () => {
    const cwd = scratchDir();
    const configPath = writeConfig(
      cwd,
      `export default { parser: 'oxc-experimental' };`,
    );
    const result = await loadConfig(cwd, configPath);
    expect(result.parser).toBe('oxc-experimental');
  });

  it('rejects a parser name that is not a known front-end', async () => {
    const cwd = scratchDir();
    const configPath = writeConfig(cwd, `export default { parser: 'babel' };`);
    await expect(loadConfig(cwd, configPath)).rejects.toThrow();
  });
});
