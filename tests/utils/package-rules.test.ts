import { describe, expect, it } from 'vitest';
import {
  detectForbiddenPackages,
  detectRequiredPackages,
} from '../../src/utils/package-rules';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import { applyOverrides } from '../../src/config/overrides';
import { createMockInventoryEntry } from '../helpers/mock-reports';

/**
 * Parse a partial config through the real schema, then resolve it exactly
 * like the real pipeline does — detectForbiddenPackages/detectRequiredPackages
 * only ever receive already-resolved rules (severity 'off' collapsed away),
 * same as every other consumer downstream of applyOverrides. None of these
 * tests configure `overrides`, so the repo path is never actually read.
 */
function createConfig(input: HermexConfigInput = {}) {
  return applyOverrides(HermexConfigSchema.parse(input), process.cwd());
}

/** Imported by scanned source, and declared — the common case. */
const used = (name: string) => createMockInventoryEntry(name);

/** Declared in package.json but never imported — build tooling, hooks, CLIs. */
const declaredOnly = (name: string) =>
  createMockInventoryEntry(name, { usageCount: 0, componentCount: 0 });

/** Installed only as someone else's dependency — this repo cannot remove it. */
const transitiveOnly = (name: string) =>
  createMockInventoryEntry(name, {
    declaredIn: [],
    rootVersion: null,
    usageCount: 0,
    componentCount: 0,
  });

describe('detectForbiddenPackages', () => {
  it('flags a package matching a forbid pattern with the rule severity and message', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [
          { severity: 'error', patterns: ['moment'], message: 'Use dayjs' },
        ],
      },
    });

    const violations = detectForbiddenPackages([used('moment')], config);

    expect(violations).toEqual([
      {
        type: 'forbid_packages',
        severity: 'error',
        patterns: ['moment'],
        message: 'Use dayjs',
        matchedFiles: [],
        packageName: 'moment',
      },
    ]);
  });

  it('matches a scoped package against a glob forbid pattern', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'warn', patterns: ['@legacy/*'] }],
      },
    });

    const violations = detectForbiddenPackages(
      [used('@legacy/widget')],
      config,
    );

    expect(violations).toHaveLength(1);
    expect(violations[0].packageName).toBe('@legacy/widget');
  });

  // `patterns` carries the RULE's globs, never the matched name — same as
  // require_packages, and what lets one glob rule produce several violations
  // that a consumer can still trace back to the rule that fired them.
  it('carries the rule globs in patterns and the matched package in packageName', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['@legacy/*'] }],
      },
    });

    const violations = detectForbiddenPackages(
      [used('@legacy/widget'), used('@legacy/table')],
      config,
    );

    expect(violations.map((v) => v.patterns)).toEqual([
      ['@legacy/*'],
      ['@legacy/*'],
    ]);
    expect(violations.map((v) => v.packageName)).toEqual([
      '@legacy/widget',
      '@legacy/table',
    ]);
  });

  // A package is not a file. The inventory carries no file paths at all, and
  // a declared-but-unimported hit (#75) has none to carry — so matchedFiles
  // stays empty rather than being repurposed to hold the package name.
  it('leaves matchedFiles empty', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['moment'] }],
      },
    });

    const violations = detectForbiddenPackages([used('moment')], config);

    expect(violations[0].matchedFiles).toEqual([]);
  });

  it('uses the first matching rule when a package matches two forbid rules', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [
          { severity: 'error', patterns: ['moment'], message: 'first rule' },
          { severity: 'warn', patterns: ['mom*'], message: 'second rule' },
        ],
      },
    });

    const violations = detectForbiddenPackages([used('moment')], config);

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toBe('first rule');
    expect(violations[0].severity).toBe('error');
  });

  it('returns an empty array when no config is provided', () => {
    expect(detectForbiddenPackages([used('moment')])).toEqual([]);
  });

  it('returns an empty array when there are no forbid_packages rules', () => {
    const config = createConfig();

    expect(detectForbiddenPackages([used('moment')], config)).toEqual([]);
  });

  it('a forbid_packages rule authored with severity "off" resolves away before it ever reaches detectForbiddenPackages', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'off', patterns: ['moment'] }],
      },
    });

    expect(detectForbiddenPackages([used('moment')], config)).toEqual([]);
  });

  // #75: the usage axis is built from component imports, so build-only
  // tooling — run via npx, an npm script or a git hook — is declared but
  // never used, and used to slip past a rule naming it outright.
  it('flags a package declared in package.json but never imported', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [
          {
            severity: 'error',
            patterns: ['@acme/coverager'],
            message: 'Remove deprecated internal package',
          },
        ],
      },
    });

    const violations = detectForbiddenPackages(
      [declaredOnly('@acme/coverager')],
      config,
    );

    expect(violations).toEqual([
      {
        type: 'forbid_packages',
        severity: 'error',
        patterns: ['@acme/coverager'],
        message: 'Remove deprecated internal package',
        matchedFiles: [],
        packageName: '@acme/coverager',
      },
    ]);
  });

  it('flags a package that is imported without being declared (a phantom dependency)', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['moment'] }],
      },
    });

    const violations = detectForbiddenPackages(
      [createMockInventoryEntry('moment', { declaredIn: [] })],
      config,
    );

    expect(violations).toHaveLength(1);
  });

  it('does not flag a purely transitive dependency, which the repo cannot remove', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['moment'] }],
      },
    });

    const violations = detectForbiddenPackages(
      [transitiveOnly('moment')],
      config,
    );

    expect(violations).toEqual([]);
  });

  it('reports a package exactly once however many axes it is present on', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['moment'] }],
      },
    });

    const violations = detectForbiddenPackages([used('moment')], config);

    expect(violations).toHaveLength(1);
  });

  it('does not flag a package excluded by packages.ignore', () => {
    const config = createConfig({
      packages: { ignore: ['@legacy/*'] },
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['@legacy/*'] }],
      },
    });

    const violations = detectForbiddenPackages(
      [createMockInventoryEntry('@legacy/widget', { ignored: true })],
      config,
    );

    expect(violations).toEqual([]);
  });

  it('reports violations in inventory order, which is usage-ranked', () => {
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'error', patterns: ['moment', 'jest'] }],
      },
    });

    const violations = detectForbiddenPackages(
      [used('moment'), declaredOnly('jest')],
      config,
    );

    expect(violations.map((v) => v.packageName)).toEqual(['moment', 'jest']);
  });
});

describe('detectRequiredPackages', () => {
  it('is satisfied by an installed package that is never imported', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages([declaredOnly('react')], config);

    expect(violations).toEqual([]);
  });

  it('is satisfied by an imported package that is absent from the lockfile', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages(
      [
        createMockInventoryEntry('react', {
          version: null,
          rootVersion: null,
          allVersions: [],
        }),
      ],
      config,
    );

    expect(violations).toEqual([]);
  });

  // Unlike forbid_packages, "required" asks whether the package is available
  // to the code — a transitive copy counts, and `packages.ignore` (a
  // reporting filter, not an uninstall) must not make it look missing.
  it('is satisfied by a purely transitive dependency', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages(
      [transitiveOnly('react')],
      config,
    );

    expect(violations).toEqual([]);
  });

  it('is satisfied by an installed package excluded from reporting by packages.ignore', () => {
    const config = createConfig({
      packages: { ignore: ['react'] },
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages(
      [createMockInventoryEntry('react', { ignored: true })],
      config,
    );

    expect(violations).toEqual([]);
  });

  it('is not satisfied by a package that is declared but not installed', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages(
      [
        createMockInventoryEntry('react', {
          version: null,
          rootVersion: null,
          allVersions: [],
          usageCount: 0,
          componentCount: 0,
        }),
      ],
      config,
    );

    expect(violations).toHaveLength(1);
  });

  it('yields a require_packages violation with the rule patterns and empty matchedFiles when unsatisfied', () => {
    const config = createConfig({
      rules: {
        require_packages: [
          { severity: 'error', patterns: ['react'], message: 'Need react' },
        ],
      },
    });

    const violations = detectRequiredPackages([], config);

    expect(violations).toEqual([
      {
        type: 'require_packages',
        severity: 'error',
        patterns: ['react'],
        message: 'Need react',
        matchedFiles: [],
      },
    ]);
  });

  it('returns an empty array when there are no require_packages rules', () => {
    const config = createConfig();

    expect(detectRequiredPackages([], config)).toEqual([]);
  });

  it('a require_packages rule authored with severity "off" resolves away before it ever reaches detectRequiredPackages, even unsatisfied', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'off', patterns: ['react'] }],
      },
    });

    expect(detectRequiredPackages([], config)).toEqual([]);
  });
});
