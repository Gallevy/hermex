---
"hermex": major
---

Renamed every rule id to kebab-case and standardized the require-x/no-x naming convention (`detect_files` → `no-files`, `require_files` → `require-files`, `require_packages` → `require-packages`, `forbid_packages` → `no-packages`, `require_scripts` → `require-scripts`, `require_package_fields` → `require-package-fields`, `forbid_package_fields` → `no-package-fields`, `engine_version` → `require-engine-version`, `codeowners` → `require-codeowners`).

Config authors must update `hermex.config.ts` to use the new rule keys under `rules` and `overrides[].rules`. The JSON output's `ruleViolations` entries carry a `ruleId` field instead of `type`, using the new ids.
