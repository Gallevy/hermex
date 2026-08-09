import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import type { RulesConfig } from '../../src/config/types';
import { evaluateRules } from '../../src/rules/evaluator';
import { evaluateFileRules } from '../../src/rules/file-rules';
import { evaluateScriptRules } from '../../src/rules/script-rules';
import { evaluatePackageFieldRules } from '../../src/rules/package-field-rules';
import { evaluateEngineVersion } from '../../src/rules/engine-version';

let tempDir: string;

const emptyRules: RulesConfig = {
  detect_files: [],
  require_files: [],
  forbid_packages: [],
  require_packages: [],
  require_scripts: [],
  require_package_fields: [],
  forbid_package_fields: [],
  engine_version: undefined,
  codeowners: undefined,
};

beforeAll(() => {
  tempDir = mkdtempSync(join(tmpdir(), 'hermex-rules-test-'));
  mkdirSync(join(tempDir, 'src'));
  writeFileSync(join(tempDir, 'src', 'App.tsx'), '');
  writeFileSync(join(tempDir, 'src', 'legacy.js'), '');
  writeFileSync(
    join(tempDir, 'package.json'),
    JSON.stringify({
      name: 'test-project',
      scripts: { build: 'tsc', test: 'vitest' },
      engines: { node: '>=18.0.0' },
      license: 'MIT',
      packageManager: 'pnpm@10.12.0',
      jest: {},
    }),
  );
});

afterAll(() => {
  rmSync(tempDir, { recursive: true, force: true });
});

describe('evaluateFileRules', () => {
  it('no violation when detect_files pattern matches nothing', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'error', patterns: ['**/*.java'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('violation when detect_files pattern matches a file', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'error', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('detect_files');
    expect(result[0].severity).toBe('error');
    expect(result[0].matchedFiles.length).toBeGreaterThan(0);
    for (const file of result[0].matchedFiles) {
      expect(isAbsolute(file)).toBe(false);
    }
    expect(result[0].matchedFiles).toContain('src/legacy.js');
  });

  it('no violation when require_files pattern matches a file', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        require_files: [{ severity: 'error', patterns: ['src/App.tsx'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('violation when require_files pattern matches nothing', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        require_files: [{ severity: 'warn', patterns: ['src/missing.ts'] }],
      },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('require_files');
    expect(result[0].matchedFiles).toHaveLength(0);
  });

  it('excludes files matching the excludes list', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'error', patterns: ['src/legacy.js'] }],
      },
      ['src/legacy.js'],
    );
    expect(result).toHaveLength(0);
  });

  it('detect_files with severity info produces an info-severity violation when the file is present', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [
          {
            severity: 'info',
            patterns: ['src/legacy.js'],
            message: 'legacy detected',
          },
        ],
      },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('detect_files');
    expect(result[0].severity).toBe('info');
    expect(result[0].matchedFiles).toContain('src/legacy.js');
  });

  it('detect_files produces nothing when the file is absent', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'info', patterns: ['src/missing.ts'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('detect_files supports warn and error severities', () => {
    const warnResult = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'warn', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(warnResult[0].severity).toBe('warn');

    const errorResult = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'error', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(errorResult[0].severity).toBe('error');
  });
});

describe('evaluateFileRules — schema defaults', () => {
  it('parses successfully with detect_files/require_files defaulting to []', () => {
    const result = evaluateFileRules(tempDir, emptyRules, []);
    expect(result).toHaveLength(0);
  });
});

describe('evaluateScriptRules', () => {
  it('no violation when required script exists', () => {
    const result = evaluateScriptRules(tempDir, {
      ...emptyRules,
      require_scripts: [{ severity: 'error', patterns: ['build'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when required script is missing', () => {
    const result = evaluateScriptRules(tempDir, {
      ...emptyRules,
      require_scripts: [{ severity: 'warn', patterns: ['typecheck'] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('require_scripts');
  });

  it('returns nothing when no require_scripts rules are configured', () => {
    const result = evaluateScriptRules(tempDir, emptyRules);
    expect(result).toHaveLength(0);
  });

  it('falls back to an empty script list when package.json has no scripts field', () => {
    const emptyDir = mkdtempSync(
      join(tmpdir(), 'hermex-rules-test-noscripts-'),
    );
    try {
      writeFileSync(
        join(emptyDir, 'package.json'),
        JSON.stringify({ name: 'no-scripts-project' }),
      );
      const result = evaluateScriptRules(emptyDir, {
        ...emptyRules,
        require_scripts: [{ severity: 'error', patterns: ['build'] }],
      });
      expect(result).toHaveLength(1);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

describe('evaluatePackageFieldRules', () => {
  it('no violation when required field exists in package.json', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [{ severity: 'error', patterns: ['license'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when required field is missing from package.json', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [{ severity: 'error', patterns: ['funding'] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('require_package_fields');
  });

  it('no violation when required dot-path field is present', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [
        { severity: 'error', patterns: ['engines.node'] },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when required dot-path field is missing', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [
        { severity: 'error', patterns: ['engines.npm'] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('require_package_fields');
  });

  it('no violation when required field value matches the values pattern', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [
        {
          severity: 'error',
          patterns: ['packageManager'],
          values: ['pnpm@*'],
        },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it('violation with fieldPath and actualValue when required field value does not match the values pattern', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [
        {
          severity: 'error',
          patterns: ['packageManager'],
          values: ['yarn@*'],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('require_package_fields');
    expect(result[0].fieldPath).toBe('packageManager');
    expect(result[0].actualValue).toBe('pnpm@10.12.0');
  });

  it('violation with fieldPath when a forbidden field is present', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      forbid_package_fields: [{ severity: 'error', patterns: ['jest'] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('forbid_package_fields');
    expect(result[0].fieldPath).toBe('jest');
  });

  it('no violation when a forbidden field is absent', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      forbid_package_fields: [
        { severity: 'error', patterns: ['eslintConfig'] },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it('no violation when forbidden field value does not match the values pattern', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      forbid_package_fields: [
        { severity: 'error', patterns: ['license'], values: ['GPL*'] },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it('never matches a values pattern when the forbidden field value is an object', () => {
    const objectFieldDir = mkdtempSync(
      join(tmpdir(), 'hermex-rules-test-objectfield-'),
    );
    try {
      writeFileSync(
        join(objectFieldDir, 'package.json'),
        JSON.stringify({ name: 'x', jest: { testEnvironment: 'node' } }),
      );
      const result = evaluatePackageFieldRules(objectFieldDir, {
        ...emptyRules,
        forbid_package_fields: [
          { severity: 'error', patterns: ['jest'], values: ['*'] },
        ],
      });
      expect(result).toHaveLength(0);
    } finally {
      rmSync(objectFieldDir, { recursive: true, force: true });
    }
  });

  it('never matches a values pattern when the forbidden field value is null', () => {
    const nullFieldDir = mkdtempSync(
      join(tmpdir(), 'hermex-rules-test-nullfield-'),
    );
    try {
      writeFileSync(
        join(nullFieldDir, 'package.json'),
        JSON.stringify({ name: 'x', license: null }),
      );
      const result = evaluatePackageFieldRules(nullFieldDir, {
        ...emptyRules,
        forbid_package_fields: [
          { severity: 'error', patterns: ['license'], values: ['*'] },
        ],
      });
      expect(result).toHaveLength(0);
    } finally {
      rmSync(nullFieldDir, { recursive: true, force: true });
    }
  });

  it('violation when forbidden field value matches the values pattern', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      forbid_package_fields: [
        { severity: 'error', patterns: ['license'], values: ['MIT'] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('forbid_package_fields');
  });

  it('require rules violate and forbid rules do not when package.json is absent', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'hermex-rules-test-empty-'));
    try {
      const requireResult = evaluatePackageFieldRules(emptyDir, {
        ...emptyRules,
        require_package_fields: [{ severity: 'error', patterns: ['name'] }],
      });
      expect(requireResult).toHaveLength(1);
      expect(requireResult[0].type).toBe('require_package_fields');

      const forbidResult = evaluatePackageFieldRules(emptyDir, {
        ...emptyRules,
        forbid_package_fields: [{ severity: 'error', patterns: ['jest'] }],
      });
      expect(forbidResult).toHaveLength(0);
    } finally {
      rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});

describe('evaluateEngineVersion', () => {
  it('no violation when installed node range satisfies requirement', () => {
    const result = evaluateEngineVersion(tempDir, {
      ...emptyRules,
      engine_version: { severity: 'error', range: '>=16.0.0' },
    });
    expect(result).toHaveLength(0);
  });

  it('violation when installed node range does not satisfy requirement', () => {
    const result = evaluateEngineVersion(tempDir, {
      ...emptyRules,
      engine_version: { severity: 'error', range: '>=24.0.0' },
    });
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('engine_version');
    expect(result[0].installedRange).toBe('>=18.0.0');
    expect(result[0].requiredRange).toBe('>=24.0.0');
  });

  it('returns nothing when no engine_version rule is configured', () => {
    const result = evaluateEngineVersion(tempDir, emptyRules);
    expect(result).toHaveLength(0);
  });

  describe('when package.json has no engines field', () => {
    let noEnginesDir: string;

    beforeAll(() => {
      noEnginesDir = mkdtempSync(
        join(tmpdir(), 'hermex-rules-test-noengines-'),
      );
      writeFileSync(
        join(noEnginesDir, 'package.json'),
        JSON.stringify({ name: 'no-engines-project' }),
      );
    });

    afterAll(() => {
      rmSync(noEnginesDir, { recursive: true, force: true });
    });

    it('reports "not specified" with the default message when no message is configured', () => {
      const result = evaluateEngineVersion(noEnginesDir, {
        ...emptyRules,
        engine_version: { severity: 'error', range: '>=18.0.0' },
      });
      expect(result).toHaveLength(1);
      expect(result[0].installedRange).toBeUndefined();
      expect(result[0].requiredRange).toBe('>=18.0.0');
      expect(result[0].message).toBe(
        'engines.node not specified in package.json',
      );
    });

    it('uses a custom message when configured', () => {
      const result = evaluateEngineVersion(noEnginesDir, {
        ...emptyRules,
        engine_version: {
          severity: 'error',
          range: '>=18.0.0',
          message: 'add an engines.node field',
        },
      });
      expect(result[0].message).toBe('add an engines.node field');
    });
  });
});

describe('evaluateRules — integration', () => {
  it('aggregates violations from all sub-evaluators', () => {
    const result = evaluateRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'error', patterns: ['src/legacy.js'] }],
        require_scripts: [{ severity: 'warn', patterns: ['typecheck'] }],
      },
      [],
    );
    const types = result.map((v) => v.type);
    expect(types).toContain('detect_files');
    expect(types).toContain('require_scripts');
  });

  it('returns empty array when no rules configured', () => {
    const result = evaluateRules(tempDir, emptyRules, []);
    expect(result).toHaveLength(0);
  });
});

describe('evaluators defensively ignore severity "off"', () => {
  // Production always resolves 'off' away before evaluators run (see
  // src/config/overrides.ts's resolveRules/applyOverrides). These tests
  // call the evaluators directly with an 'off' rule anyway, to prove each
  // evaluator is independently safe if that invariant is ever bypassed —
  // no violation is emitted, and nothing throws.

  it('evaluateFileRules ignores an "off" detect_files rule even though the file is present', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        detect_files: [{ severity: 'off', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('evaluateFileRules ignores an "off" require_files rule even though the file is absent', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        require_files: [{ severity: 'off', patterns: ['src/missing.ts'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('evaluateScriptRules ignores an "off" require_scripts rule even though the script is missing', () => {
    const result = evaluateScriptRules(tempDir, {
      ...emptyRules,
      require_scripts: [{ severity: 'off', patterns: ['typecheck'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('evaluatePackageFieldRules ignores an "off" require_package_fields rule even though the field is missing', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      require_package_fields: [{ severity: 'off', patterns: ['funding'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('evaluatePackageFieldRules ignores an "off" forbid_package_fields rule even though the field is present', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      forbid_package_fields: [{ severity: 'off', patterns: ['jest'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('evaluateEngineVersion ignores an "off" rule even though the installed range does not satisfy it', () => {
    const result = evaluateEngineVersion(tempDir, {
      ...emptyRules,
      engine_version: { severity: 'off', range: '>=24.0.0' },
    });
    expect(result).toHaveLength(0);
  });
});
