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
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('leaves rules untouched when the repo name does not match', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/marketing-site'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('applies every matching override, in order, when more than one matches', () => {
    const config = createConfig({
      overrides: [
        {
          match: ['@acme/*'],
          rules: {
            'require-packages': [{ severity: 'warn', patterns: ['eslint'] }],
          },
        },
        {
          match: ['@acme/checkout'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-packages']).toEqual([
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
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/shell-consumer-web'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('leaves rule contents unchanged when there are no overrides configured and nothing to resolve', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    // Not compared via toEqual(config): `rules` is always rebuilt
    // (self-upserted) so a base rule authored with severity 'off' resolves
    // even with zero overrides (see the describe block below) — this also
    // normalizes empty/singleton containers to arrays, which is why we
    // assert the rule contents rather than the raw pre-resolution shape.
    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('leaves rule contents unchanged when the repo has no package.json', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hermex-overrides-test-'));
    dirs.push(dir);
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['*'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, dir);

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('leaves rule contents unchanged when package.json has no "name" field', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hermex-overrides-test-'));
    writeFileSync(
      join(dir, 'package.json'),
      JSON.stringify({ version: '1.0.0' }),
    );
    dirs.push(dir);
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['*'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, dir);

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('merges onto a base rule authored as a single object, not an array', () => {
    const config = createConfig({
      rules: {
        'require-packages': { severity: 'error', patterns: ['typescript'] },
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('merges an override rule authored as an array of multiple rules', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-packages': [
              { severity: 'error', patterns: ['@acme/shell'] },
              { severity: 'warn', patterns: ['@acme/telemetry'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
      { severity: 'error', patterns: ['@acme/shell'] },
      { severity: 'warn', patterns: ['@acme/telemetry'] },
    ]);
  });

  it('merges no-files', () => {
    const config = createConfig({
      rules: {
        'no-files': [{ severity: 'error', patterns: ['jest.config.*'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'no-files': [{ severity: 'warn', patterns: ['.babelrc'] }],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['no-files']).toEqual([
      { severity: 'error', patterns: ['jest.config.*'] },
      { severity: 'warn', patterns: ['.babelrc'] },
    ]);
  });

  // Rules are keyed on an exact, order-independent match of `patterns`. A
  // differing pattern *count* is a different rule, so it is appended rather
  // than replacing the base entry.
  it('appends rather than replaces when the pattern counts differ', () => {
    const config = createConfig({
      rules: { 'no-packages': [{ severity: 'error', patterns: ['moment'] }] },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'no-packages': [
              { severity: 'warn', patterns: ['moment', 'lodash'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['no-packages']).toEqual([
      { severity: 'error', patterns: ['moment'] },
      { severity: 'warn', patterns: ['moment', 'lodash'] },
    ]);
  });

  it('merges require-files', () => {
    const config = createConfig({
      rules: { 'require-files': [{ severity: 'error', patterns: ['.nvmrc'] }] },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-files': [
              { severity: 'warn', patterns: ['.editorconfig'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-files']).toEqual([
      { severity: 'error', patterns: ['.nvmrc'] },
      { severity: 'warn', patterns: ['.editorconfig'] },
    ]);
  });

  it('merges no-packages', () => {
    const config = createConfig({
      rules: { 'no-packages': [{ severity: 'error', patterns: ['moment'] }] },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'no-packages': [{ severity: 'warn', patterns: ['lodash'] }],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['no-packages']).toEqual([
      { severity: 'error', patterns: ['moment'] },
      { severity: 'warn', patterns: ['lodash'] },
    ]);
  });

  it('merges require-scripts', () => {
    const config = createConfig({
      rules: {
        'require-scripts': [{ severity: 'error', patterns: ['build'] }],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-scripts': [{ severity: 'warn', patterns: ['test'] }],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-scripts']).toEqual([
      { severity: 'error', patterns: ['build'] },
      { severity: 'warn', patterns: ['test'] },
    ]);
  });

  it('merges require-package-fields', () => {
    const config = createConfig({
      rules: {
        'require-package-fields': [
          { severity: 'error', patterns: ['license'] },
        ],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-package-fields': [
              { severity: 'warn', patterns: ['repository'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-package-fields']).toEqual([
      { severity: 'error', patterns: ['license'] },
      { severity: 'warn', patterns: ['repository'] },
    ]);
  });

  it('merges no-package-fields', () => {
    const config = createConfig({
      rules: {
        'no-package-fields': [
          { severity: 'error', patterns: ['scripts.preinstall'] },
        ],
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'no-package-fields': [
              { severity: 'warn', patterns: ['scripts.postinstall'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['no-package-fields']).toEqual([
      { severity: 'error', patterns: ['scripts.preinstall'] },
      { severity: 'warn', patterns: ['scripts.postinstall'] },
    ]);
  });

  it('merges require-engine-version', () => {
    const config = createConfig({
      rules: { 'require-engine-version': { severity: 'error', range: '>=18' } },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-engine-version': { severity: 'warn', range: '>=20' },
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-engine-version']).toEqual([
      { severity: 'error', range: '>=18' },
      { severity: 'warn', range: '>=20' },
    ]);
  });

  it('replaces (not merges) the single-value codeowners rule', () => {
    const config = createConfig({
      rules: {
        'require-codeowners': { severity: 'warn' },
      },
      overrides: [
        {
          match: ['@acme/checkout'],
          rules: {
            'require-codeowners': {
              severity: 'error',
              requiredOwners: ['@acme/platform-team'],
            },
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/checkout'));

    expect(result.rules['require-codeowners']).toEqual({
      severity: 'error',
      requiredOwners: ['@acme/platform-team'],
    });
  });
});

describe('applyOverrides — severity "off" and upsert-by-identity (ESLint-like)', () => {
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

  it('cancels a base rule with matching patterns when severity is "off"', () => {
    const config = createConfig({
      rules: {
        'require-packages': [
          { severity: 'error', patterns: ['typescript'] },
          { severity: 'error', patterns: ['@acme/shell'] },
        ],
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-packages': [
              { severity: 'off', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('downgrades a base rule by upserting a rule with the same patterns and a different severity', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['@acme/shell'] }],
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-packages': [
              { severity: 'warn', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'warn', patterns: ['@acme/shell'] },
    ]);
  });

  it('matches patterns regardless of array order', () => {
    const config = createConfig({
      rules: {
        'no-packages': [{ severity: 'error', patterns: ['moment', 'lodash'] }],
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'no-packages': [
              { severity: 'off', patterns: ['lodash', 'moment'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['no-packages']).toEqual([]);
  });

  it('an "off" rule with patterns that match nothing is a no-op (nothing to cancel, nothing added)', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-packages': [
              { severity: 'off', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('a repo not matching the override keeps the org-wide error-severity rule', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['@acme/shell'] }],
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-packages': [
              { severity: 'off', patterns: ['@acme/shell'] },
            ],
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/other-app'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['@acme/shell'] },
    ]);
  });

  it('cancels a base require-engine-version rule with a matching range via "off"', () => {
    const config = createConfig({
      rules: {
        'require-engine-version': { severity: 'error', range: '>=20' },
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-engine-version': { severity: 'off', range: '>=20' },
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['require-engine-version']).toEqual([]);
  });

  it('downgrades a base require-engine-version rule via a matching-range upsert', () => {
    const config = createConfig({
      rules: {
        'require-engine-version': { severity: 'error', range: '>=20' },
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-engine-version': { severity: 'warn', range: '>=20' },
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['require-engine-version']).toEqual([
      { severity: 'warn', range: '>=20' },
    ]);
  });

  it('clears the base codeowners rule when the override severity is "off"', () => {
    const config = createConfig({
      rules: {
        'require-codeowners': { severity: 'error' },
      },
      overrides: [
        {
          match: ['@acme/legacy-app'],
          rules: {
            'require-codeowners': { severity: 'off' },
          },
        },
      ],
    });

    const result = applyOverrides(config, repo('@acme/legacy-app'));

    expect(result.rules['require-codeowners']).toBeUndefined();
  });
});

describe('applyOverrides — resolves severity "off" in the base config, with zero overrides', () => {
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

  it('drops a base require-packages rule authored with severity "off" — no overrides involved', () => {
    const config = createConfig({
      rules: {
        'require-packages': [
          { severity: 'error', patterns: ['typescript'] },
          { severity: 'off', patterns: ['@acme/shell'] },
        ],
      },
    });

    const result = applyOverrides(config, repo('@acme/anything'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
  });

  it('applies even when the repo has no package.json at all (base resolution needs no repo identity)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'hermex-overrides-test-'));
    dirs.push(dir);
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'off', patterns: ['@acme/shell'] }],
      },
    });

    const result = applyOverrides(config, dir);

    expect(result.rules['require-packages']).toEqual([]);
  });

  it('collapses duplicate base rules sharing identical patterns to the last one (last write wins)', () => {
    const config = createConfig({
      rules: {
        'require-packages': [
          { severity: 'error', patterns: ['@acme/shell'] },
          {
            severity: 'warn',
            patterns: ['@acme/shell'],
            message: 'authored later in the same config',
          },
        ],
      },
    });

    const result = applyOverrides(config, repo('@acme/anything'));

    expect(result.rules['require-packages']).toEqual([
      {
        severity: 'warn',
        patterns: ['@acme/shell'],
        message: 'authored later in the same config',
      },
    ]);
  });

  it('drops a base require-engine-version rule authored with severity "off"', () => {
    const config = createConfig({
      rules: { 'require-engine-version': { severity: 'off', range: '>=20' } },
    });

    const result = applyOverrides(config, repo('@acme/anything'));

    expect(result.rules['require-engine-version']).toEqual([]);
  });

  it('drops a base codeowners rule authored with severity "off"', () => {
    const config = createConfig({
      rules: { 'require-codeowners': { severity: 'off' } },
    });

    const result = applyOverrides(config, repo('@acme/anything'));

    expect(result.rules['require-codeowners']).toBeUndefined();
  });

  it('a base rule with an active severity keeps its contents — resolution only normalizes the container, never drops or alters an active rule', () => {
    const config = createConfig({
      rules: {
        'require-packages': [{ severity: 'error', patterns: ['typescript'] }],
        'no-packages': [{ severity: 'warn', patterns: ['moment'] }],
        'require-engine-version': { severity: 'error', range: '>=20' },
        'require-codeowners': { severity: 'error' },
      },
    });

    const result = applyOverrides(config, repo('@acme/anything'));

    expect(result.rules['require-packages']).toEqual([
      { severity: 'error', patterns: ['typescript'] },
    ]);
    expect(result.rules['no-packages']).toEqual([
      { severity: 'warn', patterns: ['moment'] },
    ]);
    // require-engine-version normalizes from a bare object to a singleton array —
    // same rule, same fields, just always list-shaped after resolution.
    expect(result.rules['require-engine-version']).toEqual([
      { severity: 'error', range: '>=20' },
    ]);
    expect(result.rules['require-codeowners']).toEqual({ severity: 'error' });
  });
});

describe('overrides schema validation', () => {
  it('rejects an override with an empty match list', () => {
    expect(() =>
      HermexConfigSchema.parse({
        overrides: [{ match: [], rules: {} }],
      }),
    ).toThrow();
  });

  it('accepts an override with no rules configured (parses to an empty rules object)', () => {
    const config = createConfig({
      overrides: [{ match: ['@acme/checkout'] }],
    });

    expect(config.overrides).toEqual([
      { match: ['@acme/checkout'], rules: {} },
    ]);
  });

  it('accepts severity "off" inside an override rule', () => {
    expect(() =>
      HermexConfigSchema.parse({
        overrides: [
          {
            match: ['@acme/checkout'],
            rules: {
              'require-packages': [
                { severity: 'off', patterns: ['@acme/shell'] },
              ],
            },
          },
        ],
      }),
    ).not.toThrow();
  });

  it('accepts severity "off" directly in the base (non-override) rules too — not override-only', () => {
    expect(() =>
      HermexConfigSchema.parse({
        rules: {
          'require-packages': [{ severity: 'off', patterns: ['@acme/shell'] }],
        },
      }),
    ).not.toThrow();
  });
});
