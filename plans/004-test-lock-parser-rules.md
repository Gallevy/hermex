# Plan 004: Test coverage — lock-parser adapters and rules evaluators

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**:
> `git diff --stat 36699c4..HEAD -- src/lock-parser/ src/rules/ tests/lock-parser/ tests/rules/`
> If any of these files changed since this plan was written, compare the
> "Current state" excerpts before proceeding.

## Status

- **Priority**: P2
- **Effort**: M
- **Risk**: MED
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `36699c4`, 2026-06-27

## Why this matters

**Lock-parser**: All three lock-file parsing tests are permanently `.skip`'d
with placeholder bodies — they test nothing. Lock-file parsing is how hermex
resolves package versions for the entire package distribution analysis; if it
silently returns `{}`, all version/upgrade data disappears without error.

**Rules evaluator**: `evaluateRules()` and its sub-evaluators have zero tests.
Rules (forbid/require files, scripts, package fields, engine version) are the
compliance enforcement feature — the primary reason a team adopts hermex. Silent
failures here mean users trust output that's wrong.

## Current state

**`tests/lock-parser/lock-parser.test.ts`** — all three tests permanently skipped:
```ts
test.skip('Parse npm lockfile ', () => {
  // code = await readFixture('jsx.tsx');   // wrong API stubs, never implemented
});
```

**`src/lock-parser/patterns/pnpm.ts`** — `PnpmLockfileAdapter.parse()`:
- pnpm v9+: reads `lockData.importers['.'].dependencies[name].version` and `devDependencies`
- pnpm v6-8: reads `lockData.packages` with key format `"/@babel/core/7.22.5"`
- pnpm v5: reads `lockData.dependencies` as flat map

**`src/lock-parser/patterns/npm.ts`** — `NpmLockfileAdapter.parse()`:
- npm v7+ (lockfileVersion 2/3): reads `lockData.packages['node_modules/<name>'].version`
- npm v6: reads `lockData.dependencies` recursively

**`src/lock-parser/patterns/yarn.ts`** — `YarnLockfileAdapter.parse()`:
- Uses `@yarnpkg/lockfile` library: `lockfile.parse(content)` returns `{ type: 'success', object: { 'pkg@^1.0.0': { version: '1.2.3' } } }`
- Key format: `"chalk@^5.0.0"` for regular packages, `"@scope/pkg@^1.0.0"` for scoped

**`src/rules/file-rules.ts`** — `evaluateFileRules(repoPath, rulesConfig, excludes)`:
- `forbid_files`: violation when pattern matches ≥1 file
- `require_files`: violation when pattern matches 0 files
- `allow_files`: violation when pattern matches 0 files

**`src/rules/script-rules.ts`** — `evaluateScriptRules(repoPath, rulesConfig)`:
- `require_scripts`: reads `package.json#scripts`, violation when no script key matches the glob pattern

**`src/rules/package-field-rules.ts`** — `evaluatePackageFieldRules(repoPath, rulesConfig)`:
- `require_package_fields`: reads `package.json` top-level keys, violation when pattern key not found

**`src/rules/engine-version.ts`** — `evaluateEngineVersion(repoPath, rulesConfig)`:
- `engine_version`: reads `package.json#engines.node`, violation when installed range doesn't satisfy required range

**Test pattern to follow** — `tests/e2e/cli.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
// uses describe / it / expect, no snapshots for logic-heavy tests
```

## Commands you will need

| Purpose      | Command                                   | Expected on success              |
|--------------|-------------------------------------------|----------------------------------|
| Typecheck    | `pnpm run typecheck`                      | exit 0, no errors                |
| Tests        | `pnpm run test:ci`                        | all pass, 0 skipped              |
| Test verbose | `pnpm run test:ci -- --reporter=verbose`  | shows individual test names      |
| Lint         | `pnpm run lint`                           | exit 0                           |

## Scope

**In scope** (files to create or rewrite):
- `tests/lock-parser/lock-parser.test.ts` — rewrite (currently stubs)
- `tests/lock-parser/fixtures/pnpm-lock.yaml` — create
- `tests/lock-parser/fixtures/package-lock.json` — create
- `tests/lock-parser/fixtures/yarn.lock` — create
- `tests/rules/evaluator.test.ts` — create

**Out of scope** (do NOT touch):
- Any file under `src/` — no source changes; tests exercise the real adapters
- `tests/helpers/read-fixture.ts` — not used by these tests
- `fixtures/` at the repo root — the E2E fixture dir; don't add lockfiles there

## Git workflow

- Branch: `advisor/004-test-lock-parser-rules`
- Commit message: `test: add lock-parser adapter and rules evaluator tests`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Create lock-parser fixture files

Create the directory `tests/lock-parser/fixtures/` and add three files.

**`tests/lock-parser/fixtures/pnpm-lock.yaml`** (pnpm v9 format):
```yaml
lockfileVersion: '9.0'

importers:
  .:
    dependencies:
      chalk:
        specifier: ^5.0.0
        version: 5.3.0
    devDependencies:
      vitest:
        specifier: ^1.0.0
        version: 1.6.0
```

**`tests/lock-parser/fixtures/package-lock.json`** (npm v3 format):
```json
{
  "name": "test-project",
  "version": "1.0.0",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": {
      "name": "test-project",
      "dependencies": { "chalk": "^5.0.0" },
      "devDependencies": { "vitest": "^1.0.0" }
    },
    "node_modules/chalk": {
      "version": "5.3.0",
      "resolved": "https://registry.npmjs.org/chalk/-/chalk-5.3.0.tgz"
    },
    "node_modules/vitest": {
      "version": "1.6.0",
      "resolved": "https://registry.npmjs.org/vitest/-/vitest-1.6.0.tgz",
      "dev": true
    }
  }
}
```

**`tests/lock-parser/fixtures/yarn.lock`** (classic yarn v1 format — the `@yarnpkg/lockfile` library parses this):
```
# yarn lockfile v1

chalk@^5.0.0:
  version "5.3.0"
  resolved "https://registry.npmjs.org/chalk/-/chalk-5.3.0.tgz"

vitest@^1.0.0:
  version "1.6.0"
  resolved "https://registry.npmjs.org/vitest/-/vitest-1.6.0.tgz"
```

**Verify**: The three files exist and contain the content above.

### Step 2: Rewrite tests/lock-parser/lock-parser.test.ts

Replace the entire file:

```ts
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { PnpmLockfileAdapter } from '../../src/lock-parser/patterns/pnpm';
import { NpmLockfileAdapter } from '../../src/lock-parser/patterns/npm';
import { YarnLockfileAdapter } from '../../src/lock-parser/patterns/yarn';

const FIXTURES = join(__dirname, 'fixtures');

describe('PnpmLockfileAdapter', () => {
  const adapter = new PnpmLockfileAdapter();

  it('parses pnpm v9 lockfile and returns dependency and devDependency versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'pnpm-lock.yaml'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.yaml'));
    expect(versions).toEqual({});
  });

  it('detect returns the lockfile path when pnpm-lock.yaml is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'pnpm-lock.yaml'));
  });

  it('detect returns null when no pnpm-lock.yaml is present', () => {
    const result = adapter.detect(join(FIXTURES, 'does-not-exist'));
    expect(result).toBeNull();
  });
});

describe('NpmLockfileAdapter', () => {
  const adapter = new NpmLockfileAdapter();

  it('parses npm v3 lockfile and returns package versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'package-lock.json'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.json'));
    expect(versions).toEqual({});
  });

  it('detect returns the lockfile path when package-lock.json is present', () => {
    const result = adapter.detect(FIXTURES);
    expect(result).toBe(join(FIXTURES, 'package-lock.json'));
  });
});

describe('YarnLockfileAdapter', () => {
  const adapter = new YarnLockfileAdapter();

  it('parses yarn v1 lockfile and returns package versions', () => {
    const versions = adapter.parse(join(FIXTURES, 'yarn.lock'));
    expect(versions['chalk']).toBe('5.3.0');
    expect(versions['vitest']).toBe('1.6.0');
  });

  it('returns empty object when file does not exist', () => {
    const versions = adapter.parse(join(FIXTURES, 'nonexistent.lock'));
    expect(versions).toEqual({});
  });
});
```

**Verify** (some tests may fail if fixture format is wrong — see STOP conditions):
```
pnpm run test:ci -- --reporter=verbose
```
→ all lock-parser tests pass with 0 skipped.

### Step 3: Create tests/rules/evaluator.test.ts

Create the file. Tests use a real temp directory so `globSync` and `readPackageJson` work against actual files:

```ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdirSync, writeFileSync, rmSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { evaluateRules } from '../../src/rules/evaluator';
import { evaluateFileRules } from '../../src/rules/file-rules';
import { evaluateScriptRules } from '../../src/rules/script-rules';
import { evaluatePackageFieldRules } from '../../src/rules/package-field-rules';
import { evaluateEngineVersion } from '../../src/rules/engine-version';

let tempDir: string;

const emptyRules = {
  forbid_files: [],
  require_files: [],
  allow_files: [],
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
  it('no violation when forbid_files pattern matches nothing', () => {
    const result = evaluateFileRules(
      tempDir,
      { ...emptyRules, forbid_files: [{ severity: 'error', patterns: ['**/*.java'] }] },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('violation when forbid_files pattern matches a file', () => {
    const result = evaluateFileRules(
      tempDir,
      { ...emptyRules, forbid_files: [{ severity: 'error', patterns: ['src/legacy.js'] }] },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('forbid_files');
    expect(result[0].severity).toBe('error');
    expect(result[0].matchedFiles.length).toBeGreaterThan(0);
  });

  it('no violation when require_files pattern matches a file', () => {
    const result = evaluateFileRules(
      tempDir,
      { ...emptyRules, require_files: [{ severity: 'error', patterns: ['src/App.tsx'] }] },
      [],
    );
    expect(result).toHaveLength(0);
  });

  it('violation when require_files pattern matches nothing', () => {
    const result = evaluateFileRules(
      tempDir,
      { ...emptyRules, require_files: [{ severity: 'warn', patterns: ['src/missing.ts'] }] },
      [],
    );
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe('require_files');
    expect(result[0].matchedFiles).toHaveLength(0);
  });

  it('excludes files matching the excludes list', () => {
    const result = evaluateFileRules(
      tempDir,
      { ...emptyRules, forbid_files: [{ severity: 'error', patterns: ['src/legacy.js'] }] },
      ['src/legacy.js'],
    );
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
        forbid_files: [{ severity: 'error', patterns: ['src/legacy.js'] }],
        require_scripts: [{ severity: 'warn', patterns: ['typecheck'] }],
      },
      [],
    );
    const types = result.map((v) => v.type);
    expect(types).toContain('forbid_files');
    expect(types).toContain('require_scripts');
  });

  it('returns empty array when no rules configured', () => {
    const result = evaluateRules(tempDir, emptyRules, []);
    expect(result).toHaveLength(0);
  });
});
```

**Verify**:
```
pnpm run test:ci -- --reporter=verbose
```
→ all rules evaluator tests pass.

### Step 4: Typecheck and lint

```
pnpm run typecheck && pnpm run lint
```

Both exit 0.

## Test plan

Summary of new tests:
- Lock-parser: 3 adapters × (happy path + missing file + detect) = ~9 tests
- Rules evaluator: file-rules (5) + script-rules (2) + package-field-rules (2) + engine-version (2) + integration (2) = ~13 tests
- Total new: ~22 tests, 0 skipped

## Done criteria

- [ ] `pnpm run typecheck` exits 0
- [ ] `pnpm run test:ci` exits 0 with 0 skipped tests
- [ ] Lock-parser test file has no `.skip` calls: `grep -n "\.skip" tests/lock-parser/lock-parser.test.ts` → no matches
- [ ] Rules test file exists: `ls tests/rules/evaluator.test.ts`
- [ ] `pnpm run lint` exits 0
- [ ] No files under `src/` modified: `git diff --name-only src/` → empty
- [ ] `plans/README.md` status updated to DONE

## STOP conditions

- A lock-parser adapter test fails because the fixture format doesn't match what the adapter parses. **Do not change the adapter source.** Read the relevant adapter source file, understand what format it expects, and update the fixture. After two fixture-update attempts, if the test still fails, stop and report the specific field mismatch.
- `@yarnpkg/lockfile` rejects the `yarn.lock` fixture. Read `src/lock-parser/patterns/yarn.ts` to see the exact parse call, then adjust the fixture format.
- A rules test fails because `globSync` in `findMatches` doesn't locate files in `tempDir`. Check that the pattern has no leading slash and that `cwd: repoPath` resolves correctly.
- TypeScript raises an import resolution error on any `../../src/...` import. Verify the relative path from `tests/lock-parser/` and `tests/rules/` (two levels up reaches repo root, then `src/`).

## Maintenance notes

- When new lockfile formats are supported (e.g. pnpm v10 importer format), add a fixture and a test case in `tests/lock-parser/fixtures/` and the test file.
- When new rule types are added to `RulesConfig`, add happy-path and violation test cases to `tests/rules/evaluator.test.ts`.
- The `tempDir` approach (real filesystem in OS temp) is intentional — it tests the actual `globSync` behavior without mocking. Do not replace with mocks.
