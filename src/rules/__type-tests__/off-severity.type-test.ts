// Compile-time proof that severity 'off' cannot reach evaluators,
// aggregation, or package-rule detection — resolveRules/applyOverrides
// (src/config/overrides.ts) is the one place responsible for stripping it
// away, and every downstream consumer trusts that via ResolvedRulesConfig /
// ResolvedHermexConfig instead of re-checking at runtime.
//
// This file is never imported by src/index.ts or src/cli.ts, so it never
// ships in dist/ — it exists solely for `tsc --noEmit` (pnpm run
// typecheck) to enforce the invariant below on every run. If any
// `@ts-expect-error` line below stops erroring, that guarantee has been
// silently weakened and this file will fail to typecheck (an unused
// `@ts-expect-error` directive is itself a type error).
//
// Every check here is a single short line on purpose: `@ts-expect-error`
// only suppresses/expects an error on the very next line, and a longer
// expression risks an auto-formatter wrapping it across lines, silently
// detaching the check from the error it's meant to catch.

import { evaluateFileRules } from '../file-rules';
import { evaluateScriptRules } from '../script-rules';
import { evaluatePackageFieldRules } from '../package-field-rules';
import { evaluateEngineVersion } from '../engine-version';
import { evaluateCodeowners } from '../codeowners';
import { evaluateRules } from '../evaluator';
import {
  detectForbiddenPackages,
  detectRequiredPackages,
} from '../../utils/package-rules';
import type { RulesConfig } from '../../config/types';
import type { HermexConfig } from '../../config/schema';

declare const resolvedRules: import('../../config/types').ResolvedRulesConfig;
declare const resolvedConfig: import('../../config/types').ResolvedHermexConfig;

// Positive checks: the resolved shape itself is accepted without complaint
// — proves the negative checks below fail because of the resolved-vs-raw
// distinction specifically, not because these calls are wrong some other way.
evaluateFileRules('.', resolvedRules, []);
evaluateScriptRules('.', resolvedRules);
evaluatePackageFieldRules('.', resolvedRules);
evaluateEngineVersion('.', resolvedRules);
evaluateCodeowners('.', resolvedRules, []);
evaluateRules('.', resolvedRules, []);
detectForbiddenPackages([], resolvedConfig);
detectRequiredPackages([], resolvedConfig);

// Per-boundary checks: an unresolved RulesConfig/HermexConfig (which may
// still contain 'off' or bare-object rule fields) must be rejected at every
// evaluator/aggregation entry point, not just accepted structurally.
declare const wideRules: RulesConfig;
declare const wideConfig: HermexConfig;
// @ts-expect-error — evaluateFileRules must require ResolvedRulesConfig
evaluateFileRules('.', wideRules, []);
// @ts-expect-error — evaluateScriptRules must require ResolvedRulesConfig
evaluateScriptRules('.', wideRules);
// @ts-expect-error — evaluatePackageFieldRules must require ResolvedRulesConfig
evaluatePackageFieldRules('.', wideRules);
// @ts-expect-error — evaluateEngineVersion must require ResolvedRulesConfig
evaluateEngineVersion('.', wideRules);
// @ts-expect-error — evaluateCodeowners must require ResolvedRulesConfig
evaluateCodeowners('.', wideRules, []);
// @ts-expect-error — evaluateRules must require ResolvedRulesConfig
evaluateRules('.', wideRules, []);
// @ts-expect-error — detectForbiddenPackages must require ResolvedHermexConfig
detectForbiddenPackages([], wideConfig);
// @ts-expect-error — detectRequiredPackages must require ResolvedHermexConfig
detectRequiredPackages([], wideConfig);
