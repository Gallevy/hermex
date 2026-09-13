/**
 * Config keys that hermex still accepts but no longer documents.
 *
 * A deprecated key is migrated onto its replacement *before* the Zod schema
 * ever sees the config, which is what lets `HermexConfigSchema` stay
 * `.strict()`: the schema describes only the current vocabulary, and this
 * module is the single place that knows about the old one. Removing a
 * deprecation is then a one-line deletion here, not a schema change.
 */

/** Legacy rule key → the rule id that replaced it. */
const RENAMED_RULES: Record<string, string> = {
  // Renamed because `release-age` was the only rule id that named the thing
  // being measured rather than the policy, and because `minimumReleaseAge`
  // (Renovate, pnpm) means the *opposite* check — don't install anything
  // younger than N days — so the old name inverted the polarity for anyone
  // arriving from those tools.
  'release-age': 'no-outdated-packages',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Rewrites one `rules` object, returning it unchanged (same reference) when
 * it holds no deprecated keys — so a current config allocates nothing here.
 *
 * Authoring both spellings is an error rather than a silent precedence
 * rule: the two would resolve to one governing entry per package, and
 * quietly picking a winner is exactly the kind of invisible policy decision
 * `resolveReleaseAgeRule`'s last-match-wins ordering exists to make
 * explicit.
 */
function migrateRules(
  rules: Record<string, unknown>,
  where: string,
  warnings: string[],
): Record<string, unknown> {
  const present = Object.keys(RENAMED_RULES).filter((old) => old in rules);
  if (present.length === 0) return rules;

  const migrated = { ...rules };
  for (const old of present) {
    const replacement = RENAMED_RULES[old];
    if (replacement in migrated) {
      throw new Error(
        `Config sets both \`${where}['${old}']\` and \`${where}['${replacement}']\`. ` +
          `\`${old}\` is the old name for \`${replacement}\` — keep one, not both.`,
      );
    }
    migrated[replacement] = migrated[old];
    delete migrated[old];
    warnings.push(
      `\`${where}['${old}']\` is deprecated — rename it to \`${where}['${replacement}']\`. ` +
        `The old key still works for now and behaves identically.`,
    );
  }
  return migrated;
}

/**
 * Applies every rule-key rename to a raw (unparsed) config, covering both
 * the base `rules` block and each `overrides[].rules` block.
 *
 * Returns the input untouched when nothing is deprecated, including for
 * shapes this doesn't understand — anything malformed is the schema's
 * problem to report, not this module's, so a non-object config falls
 * straight through to Zod and gets a real validation error.
 */
export function migrateDeprecatedConfig(config: unknown): {
  config: unknown;
  warnings: string[];
} {
  if (!isRecord(config)) return { config, warnings: [] };

  const warnings: string[] = [];
  let next = config;

  if (isRecord(config['rules'])) {
    const rules = migrateRules(config['rules'], 'rules', warnings);
    if (rules !== config['rules']) next = { ...next, rules };
  }

  if (Array.isArray(config['overrides'])) {
    let changed = false;
    const overrides = config['overrides'].map((override, index) => {
      if (!isRecord(override) || !isRecord(override['rules'])) return override;
      const rules = migrateRules(
        override['rules'],
        `overrides[${index}].rules`,
        warnings,
      );
      if (rules === override['rules']) return override;
      changed = true;
      return { ...override, rules };
    });
    if (changed) next = { ...next, overrides };
  }

  return { config: next, warnings };
}
