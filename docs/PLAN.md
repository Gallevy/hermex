```bash
npx hermex scan
```

### Output

```bash

(verbose only when running with --verbose)
[VERBOSE] Analyzing: path (not absolute path but relative to where current direction is)
[VERBOSE] Found JSX Usage: <Controller>
[VERBOSE] Found import: react-hook-form
[VERBOSE] Found Object mapping with Component: XXX
[VERBOSE] ... <same style of output for other patterns>
[VERBOSE] ---- END OF FILE OR LINEBREAK (LINEBREAK IS CLEANER I THINK) ----

(only when running with --summary=(log default))
[SUMMARY] Analysis completed successfully in 5.7s
[SUMMARY] Files analyzed: 37
[SUMMARY] Total imports: 5,700
[SUMMARY] Total components: 123


(only when running with --details)
[DETAILS] Total function invocations: 5,999
[DETAILS] Total class instantiations: 999
[DETAILS] Total usage patterns: 6,123
[DETAILS] Total side effects: 123
[DETAILS] <extend this to all patterns>

(only when running with --top-components=<log defualt> or <table> or <chart>)
[TOP-COMPONENTS] 🏆 TOP COMPONENTS:
[TOP-COMPONENTS] 🥇 1. Button from @mui/material@5.14.0: 45 uses
[TOP-COMPONENTS] 🥈 2. TextField from @mui/material@5.14.0: 32 uses
[TOP-COMPONENTS] 🥉 3. Grid from @mui/material@5.14.0: 28 uses

(only when running with --components-usage=table(default) OR chart)
[COMPONENTS-USAGE] TABLE (Columns: Component, Version, Count)
[COMPONENTS-USAGE] <table data>
[COMPONENTS-USAGE] <table data>
[COMPONENTS-USAGE] <table data>

(only when running with --patterns=table(default) or chart)
[COMPONENTS-USAGE] TABLE (Columns: Component, Version, Count)
[COMPONENTS-USAGE] <table data>
[COMPONENTS-USAGE] <table data>
[COMPONENTS-USAGE] <table data>

```
