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
  engine_version: undefined,
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
