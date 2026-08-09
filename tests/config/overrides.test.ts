import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { applyOverrides } from '../../src/config/overrides';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';

/** Parse a partial config through the real schema so all defaults apply. */
function createConfig(input: HermexConfigInput = {}) {
  return HermexConfigSchema.parse(input);
}

function makeRepo(name: string, pkg: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'hermex-overrides-test-'));
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ name, ...pkg }));
  return dir;
}

describe('applyOverrides', () => {
  let dirs: string[];

  beforeAll(() => {
    dirs = [];
  });

  afterAll(() => {
    for (const dir of dirs) rmSync(dir, { recursive: true, force: true });
  });

  function repo(name: string, pkg: Record<string, unknown> = {}): string {
    const dir = makeRepo(name, pkg);
    dirs.push(dir);
    return dir;
  }

  it('merges an override into base rules when the repo name matches', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            require_packages: [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules.require_packages).toEqual([
      { severity: 'error', patterns: ['typescript'] },
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('leaves rules untouched when the repo name does not match', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            require_packages: [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/marketing-site'));

    expect(result.rules.require_packages).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('applies every matching override, in order, when more than one matches', () => {
    const config = createConfig({
      overrides: [
        {
          match: ['@acme/*'],
          rules: {
            require_packages: [{ severity: 'warn', patterns: ['eslint'] }],
          },
        },
        {
          match: ['@acme/checkout'],
          rules: {
            require_packages: [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules.require_packages).toEqual([
      { severity: 'warn', patterns: ['eslint'] },
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('matches via glob patterns, not just exact names', () => {
    const config = createConfig({
      overrides: [
        {
          match: ['@acme/shell-consumer-*'],
          rules: {
            require_packages: [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/shell-consumer-web'));

    expect(result.rules.require_packages).toEqual([
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('is a no-op when there are no overrides configured', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['typescript'] }],
      },
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result).toBe(config);
  });

  it('is a no-op when the repo has no package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hermex-overrides-test-'));
    dirs.push(dir);
    const config = createConfig({
      overrides: [
        {
          match: ['*'],
          rules: {
            require_packages: [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, dir);

    expect(result).toBe(config);
  });

  it('replaces (not merges) the single-value codeowners rule', () => {
    const config = createConfig({
      rules: {
        codeowners: { severity: 'warn' },
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            codeowners: {
              severity: 'error',
              requiredOwners: ['@acme/platform-team'],
            },
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules.codeowners).toEqual({
      severity: 'error',
      requiredOwners: ['@acme/platform-team'],
    });
  });
});
