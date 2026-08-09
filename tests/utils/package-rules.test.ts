import { describe, expect, it } from 'vitest';
import {
  detectBannedPackages,
  detectRequiredPackages,
} from '../../src/utils/package-rules';
import { HermexConfigSchema } from '../../src/config/schema';
import type { HermexConfigInput } from '../../src/config/schema';
import { createMockPackage } from '../helpers/mock-reports';

/** Parse a partial config through the real schema so all defaults apply. */
function createConfig(input: HermexConfigInput = {}) {
  return HermexConfigSchema.parse(input);
}

describe('detectBannedPackages', () => {
  it('flags a package matching a forbid pattern with the rule severity and message', () => {
    const moment = createMockPackage('moment');
    const config = createConfig({
      rules: {
        forbid_packages: [
          { severity: 'error', patterns: ['moment'], message: 'Use dayjs' },
        ],
      },
    });

    const violations = detectBannedPackages([moment], config);

    expect(violations).toEqual([
      { packageName: 'moment', severity: 'error', message: 'Use dayjs' },
    ]);
  });

  it('matches a scoped package against a glob forbid pattern', () => {
    const legacyWidget = createMockPackage('@legacy/widget');
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'warn', patterns: ['@legacy/*'] }],
      },
    });

    const violations = detectBannedPackages([legacyWidget], config);

    expect(violations).toHaveLength(1);
    expect(violations[0].packageName).toBe('@legacy/widget');
  });

  it('uses the first matching rule when a package matches two forbid rules', () => {
    const moment = createMockPackage('moment');
    const config = createConfig({
      rules: {
        forbid_packages: [
          { severity: 'error', patterns: ['moment'], message: 'first rule' },
          { severity: 'warn', patterns: ['moment'], message: 'second rule' },
        ],
      },
    });

    const violations = detectBannedPackages([moment], config);

    expect(violations).toHaveLength(1);
    expect(violations[0].message).toBe('first rule');
    expect(violations[0].severity).toBe('error');
  });

  it('returns an empty array when no config is provided', () => {
    const moment = createMockPackage('moment');

    expect(detectBannedPackages([moment])).toEqual([]);
  });

  it('returns an empty array when there are no forbid_packages rules', () => {
    const moment = createMockPackage('moment');
    const config = createConfig();

    expect(detectBannedPackages([moment], config)).toEqual([]);
  });

  it('ignores an "off" forbid_packages rule even though the package matches (defensive — production resolves "off" away before this runs)', () => {
    const moment = createMockPackage('moment');
    const config = createConfig({
      rules: {
        forbid_packages: [{ severity: 'off', patterns: ['moment'] }],
      },
    });

    expect(detectBannedPackages([moment], config)).toEqual([]);
  });
});

describe('detectRequiredPackages', () => {
  it('is satisfied by a lockfile versions key even when the package is absent from the distribution', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages([], { react: '18.0.0' }, config);

    expect(violations).toEqual([]);
  });

  it('is satisfied by a distribution packageName even when absent from versions', () => {
    const reactPkg = createMockPackage('react');
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'error', patterns: ['react'] }],
      },
    });

    const violations = detectRequiredPackages([reactPkg], {}, config);

    expect(violations).toEqual([]);
  });

  it('yields a require_packages violation with the rule patterns and empty matchedFiles when unsatisfied', () => {
    const config = createConfig({
      rules: {
        require_packages: [
          { severity: 'error', patterns: ['react'], message: 'Need react' },
        ],
      },
    });

    const violations = detectRequiredPackages([], {}, config);

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

    expect(detectRequiredPackages([], {}, config)).toEqual([]);
  });

  it('ignores an "off" require_packages rule even though it is unsatisfied (defensive — production resolves "off" away before this runs)', () => {
    const config = createConfig({
      rules: {
        require_packages: [{ severity: 'off', patterns: ['react'] }],
      },
    });

    expect(detectRequiredPackages([], {}, config)).toEqual([]);
  });
});
