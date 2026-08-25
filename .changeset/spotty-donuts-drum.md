---
"hermex": minor
---

Added a `max-file-size` rule: give it glob `patterns` and a `maxSize`, and any matching file over that ceiling is reported. `maxSize` accepts a plain byte count (`204800`) or a size with a unit (`'200kb'`, `'1.5mb'`, `'500b'`) — units are binary, so 1 KB is 1024 B, and `kib`/`mib`/`gib` are accepted spellings of the same values. A file sitting exactly on the ceiling passes.

```ts
rules: {
  'max-file-size': [
    { severity: 'error', patterns: ['**/*.svg'], maxSize: '200kb' },
  ],
}
```

Each rule produces one violation listing every file over its ceiling, so one pattern is one row in the rules table however many assets it catches. Under `--format json` the violation carries `maxSizeBytes` and an `oversizeFiles` array of `{ file, sizeBytes }`, largest first. The rule participates in `overrides` on the same terms as every other pattern-keyed rule — identity is the pattern list, and severity `'off'` cancels it.
