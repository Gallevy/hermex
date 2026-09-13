import { describe, expect, it } from 'vitest';
import { migrateDeprecatedConfig } from '../../src/config/deprecations';

const releaseAgeEntry = { severity: 'error' as const, patterns: ['moment'] };

describe('migrateDeprecatedConfig — release-age → no-outdated-packages', () => {
  it('moves a base `release-age` rule onto the new key and warns once', () => {
    const { config, warnings } = migrateDeprecatedConfig({
      rules: { 'release-age': [releaseAgeEntry] },
    });

    const rules = (config as { rules: Record<string, unknown> }).rules;
    expect(rules['no-outdated-packages']).toEqual([releaseAgeEntry]);
    expect(rules).not.toHaveProperty('release-age');
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain("rules['release-age']");
    expect(warnings[0]).toContain("rules['no-outdated-packages']");
  });

  it('migrates the key inside each override, naming the index that used it', () => {
    const { config, warnings } = migrateDeprecatedConfig({
      overrides: [
        { match: ['@acme/*'], rules: { 'no-files': [] } },
        { match: ['@acme/legacy'], rules: { 'release-age': releaseAgeEntry } },
      ],
    });

    const overrides = (
      config as { overrides: { rules: Record<string, unknown> }[] }
    ).overrides;
    expect(overrides[0].rules).toEqual({ 'no-files': [] });
    expect(overrides[1].rules['no-outdated-packages']).toEqual(releaseAgeEntry);
    expect(overrides[1].rules).not.toHaveProperty('release-age');
    expect(warnings[0]).toContain('overrides[1].rules');
  });

  // Both spellings resolve to one governing entry per package, so silently
  // picking a winner would hide a policy decision the user never made.
  it('throws when both the old and new key are authored', () => {
    expect(() =>
      migrateDeprecatedConfig({
        rules: {
          'release-age': [releaseAgeEntry],
          'no-outdated-packages': [releaseAgeEntry],
        },
      }),
    ).toThrow(/keep one, not both/);
  });

  it('returns a config with no deprecated keys untouched, by reference', () => {
    const input = { rules: { 'no-outdated-packages': [releaseAgeEntry] } };
    const { config, warnings } = migrateDeprecatedConfig(input);

    expect(config).toBe(input);
    expect(warnings).toEqual([]);
  });

  // Anything malformed is the schema's error to report, not this module's —
  // it must fall through rather than throwing a less useful error first.
  it('passes non-object and malformed shapes straight through', () => {
    expect(migrateDeprecatedConfig(undefined).config).toBeUndefined();
    expect(migrateDeprecatedConfig('nope').config).toBe('nope');
    expect(migrateDeprecatedConfig({ rules: 'nope' }).warnings).toEqual([]);
    expect(migrateDeprecatedConfig({ overrides: 'nope' }).warnings).toEqual([]);
    expect(migrateDeprecatedConfig({ overrides: [null, 7] }).warnings).toEqual(
      [],
    );
  });
});
