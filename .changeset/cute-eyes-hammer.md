---
"hermex": minor
---

Add the plugin API: run another tool as part of a hermex run and fold its findings into one verdict. A plugin is a plain object with a canonical name and a hooks envelope; the single hook, onRunComplete, runs after the inventory and hermex's own rules and before rendering, and contributes namespaced violations through ctx.violations.add. Granularity and severity belong to the plugin, which configures itself, so hermex.config.ts never becomes a second place to configure the wrapped tool. A plugin that throws aborts the run with exit 2 rather than degrading silently. Includes an oxlint recipe in docs/plugins.md.
  