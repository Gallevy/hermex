import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { tmpdir } from 'node:os';
import type { ResolvedRulesConfig } from '../../src/config/types';
import { evaluateRules } from '../../src/rules/evaluator';
import { evaluateFileRules } from '../../src/rules/file-rules';
import { evaluateScriptRules } from '../../src/rules/script-rules';
import { evaluatePackageFieldRules } from '../../src/rules/package-field-rules';
import { evaluateEngineVersion } from '../../src/rules/engine-version';

let tempDir: string;

// Evaluators only ever receive already-resolved rules (severity 'off' and
// duplicate identities collapsed by applyOverrides/resolveRules before the
// pipeline runs — see src/config/overrides.ts) — this is enforced by
// ResolvedRulesConfig's type, not re-checked here.
const emptyRules: ResolvedRulesConfig = {
  'no-files': [],
  'require-files': [],
  'no-packages': [],
  'require-packages': [],
  'require-scripts': [],
  'require-package-fields': [],
  'no-package-fields': [],
  'require-engine-version': [],
  'require-codeowners': undefined,
  'require-repo-name-match': undefined,
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
  it('no violation when no-files pattern matches nothing', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [{ severity: 'error', patterns: ['**/*.java'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('violation when no-files pattern matches a file', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [{ severity: 'error', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('no-files');
    expect(result[0].severity).toBe('error');
    expect(result[0].matchedFiles.length).toBeGreaterThan(0);
    for (const file of result[0].matchedFiles) {
      expect(isAbsolute(file)).toBe(false);
    }
    expect(result[0].matchedFiles).toContain('src/legacy.js');
  });

  it('no violation when require-files pattern matches a file', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'require-files': [{ severity: 'error', patterns: ['src/App.tsx'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('violation when require-files pattern matches nothing', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'require-files': [{ severity: 'warn', patterns: ['src/missing.ts'] }],
      },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('require-files');
    expect(result[0].matchedFiles).toHaveLength(0);
  });

  it('excludes files matching the excludes list', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [{ severity: 'error', patterns: ['src/legacy.js'] }],
      },
      ['src/legacy.js'],
    );
    expect(result).toHaveLength(0);
  });

  it('no-files with severity info produces an info-severity violation when the file is present', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [
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
    expect(result[0].ruleId).toBe('no-files');
    expect(result[0].severity).toBe('info');
    expect(result[0].matchedFiles).toContain('src/legacy.js');
  });

  it('no-files produces nothing when the file is absent', () => {
    const result = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [{ severity: 'info', patterns: ['src/missing.ts'] }],
      },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('no-files supports warn and error severities', () => {
    const warnResult = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [{ severity: 'warn', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(warnResult[0].severity).toBe('warn');

    const errorResult = evaluateFileRules(
      tempDir,
      {
        ...emptyRules,
        'no-files': [{ severity: 'error', patterns: ['src/legacy.js'] }],
      },
      [],
    );
    expect(errorResult[0].severity).toBe('error');
  });
});

describe('evaluateFileRules — schema defaults', () => {
  it('parses successfully with no-files/require-files defaulting to []', () => {
    const result = evaluateFileRules(tempDir, emptyRules, []);
    expect(result).toHaveLength(0);
  });
});

describe('evaluateScriptRules', () => {
  it('no violation when required script exists', () => {
    const result = evaluateScriptRules(tempDir, {
      ...emptyRules,
      'require-scripts': [{ severity: 'error', patterns: ['build'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when required script is missing', () => {
    const result = evaluateScriptRules(tempDir, {
      ...emptyRules,
      'require-scripts': [{ severity: 'warn', patterns: ['typecheck'] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('require-scripts');
  });

  it('returns nothing when no require-scripts rules are configured', () => {
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
        'require-scripts': [{ severity: 'error', patterns: ['build'] }],
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
      'require-package-fields': [{ severity: 'error', patterns: ['license'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when required field is missing from package.json', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'require-package-fields': [{ severity: 'error', patterns: ['funding'] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('require-package-fields');
  });

  it('no violation when required dot-path field is present', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'require-package-fields': [
        { severity: 'error', patterns: ['engines.node'] },
      ],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when required dot-path field is missing', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'require-package-fields': [
        { severity: 'error', patterns: ['engines.npm'] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('require-package-fields');
  });

  it('no violation when required field value matches the values pattern', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'require-package-fields': [
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
      'require-package-fields': [
        {
          severity: 'error',
          patterns: ['packageManager'],
          values: ['yarn@*'],
        },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('require-package-fields');
    expect(result[0].fieldPath).toBe('packageManager');
    expect(result[0].actualValue).toBe('pnpm@10.12.0');
  });

  it('violation with fieldPath when a forbidden field is present', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'no-package-fields': [{ severity: 'error', patterns: ['jest'] }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('no-package-fields');
    expect(result[0].fieldPath).toBe('jest');
  });

  it('no violation when a forbidden field is absent', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'no-package-fields': [{ severity: 'error', patterns: ['eslintConfig'] }],
    });
    expect(result).toHaveLength(0);
  });

  it('no violation when forbidden field value does not match the values pattern', () => {
    const result = evaluatePackageFieldRules(tempDir, {
      ...emptyRules,
      'no-package-fields': [
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
        'no-package-fields': [
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
        'no-package-fields': [
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
      'no-package-fields': [
        { severity: 'error', patterns: ['license'], values: ['MIT'] },
      ],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('no-package-fields');
  });

  it('require rules violate and forbid rules do not when package.json is absent', () => {
    const emptyDir = mkdtempSync(join(tmpdir(), 'hermex-rules-test-empty-'));
    try {
      const requireResult = evaluatePackageFieldRules(emptyDir, {
        ...emptyRules,
        'require-package-fields': [{ severity: 'error', patterns: ['name'] }],
      });
      expect(requireResult).toHaveLength(1);
      expect(requireResult[0].ruleId).toBe('require-package-fields');

      const forbidResult = evaluatePackageFieldRules(emptyDir, {
        ...emptyRules,
        'no-package-fields': [{ severity: 'error', patterns: ['jest'] }],
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
      'require-engine-version': [{ severity: 'error', range: '>=16.0.0' }],
    });
    expect(result).toHaveLength(0);
  });

  it('violation when installed node range does not satisfy requirement', () => {
    const result = evaluateEngineVersion(tempDir, {
      ...emptyRules,
      'require-engine-version': [{ severity: 'error', range: '>=24.0.0' }],
    });
    expect(result).toHaveLength(1);
    expect(result[0].ruleId).toBe('require-engine-version');
    expect(result[0].installedRange).toBe('>=18.0.0');
    expect(result[0].requiredRange).toBe('>=24.0.0');
  });

  it('returns nothing when no require-engine-version rule is configured', () => {
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
        'require-engine-version': [{ severity: 'error', range: '>=18.0.0' }],
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
        'require-engine-version': [
          {
            severity: 'error',
            range: '>=18.0.0',
            message: 'add an engines.node field',
          },
        ],
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
        'no-files': [{ severity: 'error', patterns: ['src/legacy.js'] }],
        'require-scripts': [{ severity: 'warn', patterns: ['typecheck'] }],
      },
      [],
    );
    const types = result.map((v) => v.ruleId);
    expect(types).toContain('no-files');
    expect(types).toContain('require-scripts');
  });

  it('returns empty array when no rules configured', () => {
    const result = evaluateRules(tempDir, emptyRules, []);
    expect(result).toHaveLength(0);
  });
});

// Evaluators no longer defensively filter severity 'off' themselves — that
// responsibility lives solely in resolveRules/applyOverrides
// (src/config/overrides.ts, tested in tests/config/overrides.test.ts).
// ResolvedRulesConfig's type now makes it a compile error to pass an 'off'
// rule to any evaluator here, which is a strictly stronger guarantee than a
// runtime check could give — see the "isEnabled" discussion in the PR.
