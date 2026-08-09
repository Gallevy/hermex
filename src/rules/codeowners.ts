import fs from 'fs';
import path from 'path';
import micromatch from 'micromatch';
import type { ResolvedRulesConfig } from '../config/types';
import type { RuleViolation } from './shared';

const CODEOWNERS_LOCATIONS = [
  '.github/CODEOWNERS',
  'CODEOWNERS',
  'docs/CODEOWNERS',
];

export interface CodeownersEntry {
  /** as written in the CODEOWNERS file */
  pattern: string;
  /** translated micromatch patterns */
  globs: string[];
  /** may be empty — an empty list un-assigns ownership for matching files */
  owners: string[];
}

/** First existing location, GitHub search order. Null if none exist. */
export function findCodeownersFile(repoPath: string): string | null {
  for (const location of CODEOWNERS_LOCATIONS) {
    const full = path.join(repoPath, location);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

/** Parses content into entries; skips blank lines and # comments. */
export function parseCodeowners(content: string): CodeownersEntry[] {
  const entries: CodeownersEntry[] = [];

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const tokens = line.split(/\s+/);
    const pattern = tokens[0];
    const owners = tokens.slice(1);

    entries.push({
      pattern,
      globs: codeownersPatternToGlobs(pattern),
      owners,
    });
  }

  return entries;
}

/**
 * Translates a CODEOWNERS (gitignore-style) pattern into micromatch glob(s).
 *
 * Rules:
 * - `*` alone matches everything.
 * - A leading `/`, or a `/` anywhere in the middle of the pattern, anchors
 *   the match to the repo root (the leading `/` is stripped once anchored).
 * - A pattern with no anchoring gets a `**\/` prefix so it matches at any depth.
 * - A trailing `/` restricts the match to a directory, so `/**` is appended.
 * - A bare name (no glob characters, no slash at all) also matches as a
 *   directory anywhere, so the `/**` directory variant is added alongside
 *   the plain match.
 */
export function codeownersPatternToGlobs(pattern: string): string[] {
  if (pattern === '*') return ['**'];

  let p = pattern;

  const hadLeadingSlash = p.startsWith('/');
  if (hadLeadingSlash) p = p.slice(1);

  const hadTrailingSlash = p.endsWith('/') && p.length > 1;
  if (hadTrailingSlash) p = p.slice(0, -1);

  const hasInternalSlash = p.includes('/');
  const anchored = hadLeadingSlash || hasInternalSlash;
  const hasGlobChars = /[*?[\]{}!()]/.test(p);
  const isBareName = !anchored && !hasGlobChars && !hadTrailingSlash;

  const base = anchored ? p : `**/${p}`;
  const globs = [hadTrailingSlash ? `${base}/**` : base];

  if (isBareName) {
    globs.push(`${base}/**`);
  }

  return globs;
}

// Precompiled-matcher cache, keyed by the entries array identity. Avoids
// re-parsing each entry's glob(s) into a regex on every findOwningEntry()
// call — evaluateCodeowners calls this once per scanned file against the
// same `entries` array (both directly, and via fileIsOwned), so this turns
// an O(files x entries) sequence of fresh `micromatch.isMatch` glob
// evaluations into a one-time compile plus cheap `RegExp.test` calls.
// Entries are treated as static for the lifetime of one `entries` array; a
// WeakMap means a fresh `entries` array (e.g. a new `parseCodeowners` call)
// naturally gets a fresh compiled cache instead of reading stale matchers.
const compiledMatchersCache = new WeakMap<CodeownersEntry[], RegExp[][]>();

function getCompiledMatchers(entries: CodeownersEntry[]): RegExp[][] {
  let compiled = compiledMatchersCache.get(entries);
  if (!compiled) {
    compiled = entries.map((entry) =>
      entry.globs.map((glob) => micromatch.makeRe(glob, { dot: true })),
    );
    compiledMatchersCache.set(entries, compiled);
  }
  return compiled;
}

/** Last matching entry, or null if none match. */
export function findOwningEntry(
  file: string,
  entries: CodeownersEntry[],
): CodeownersEntry | null {
  const compiled = getCompiledMatchers(entries);
  for (let i = entries.length - 1; i >= 0; i--) {
    if (compiled[i].some((re) => re.test(file))) {
      return entries[i];
    }
  }
  return null;
}

/** Last matching entry wins; owned iff that entry has >= 1 owner. */
export function fileIsOwned(file: string, entries: CodeownersEntry[]): boolean {
  const entry = findOwningEntry(file, entries);
  return entry !== null && entry.owners.length > 0;
}

export function evaluateCodeowners(
  repoPath: string,
  rulesConfig: ResolvedRulesConfig,
  scannedFiles: string[],
): RuleViolation[] {
  const rule = rulesConfig.codeowners;
  if (!rule) return [];

  const filePath = findCodeownersFile(repoPath);
  if (!filePath) {
    return [
      {
        type: 'codeowners',
        severity: rule.severity,
        patterns: CODEOWNERS_LOCATIONS,
        message: rule.message,
        matchedFiles: [],
      },
    ];
  }

  const entries = parseCodeowners(fs.readFileSync(filePath, 'utf-8'));
  const relFiles = scannedFiles.map((f) =>
    (path.isAbsolute(f) ? path.relative(repoPath, f) : f).replace(/\\/g, '/'),
  );

  const unowned: string[] = [];
  const wrongOwner: string[] = [];
  const requiredOwners = rule.requiredOwners;

  for (const f of relFiles) {
    const entry = findOwningEntry(f, entries);
    const owned = entry !== null && entry.owners.length > 0;
    if (!owned) {
      unowned.push(f);
      continue;
    }
    if (requiredOwners && requiredOwners.length > 0) {
      const hasRequiredOwner = entry!.owners.some((o) =>
        requiredOwners.includes(o),
      );
      if (!hasRequiredOwner) wrongOwner.push(f);
    }
  }

  const violations: RuleViolation[] = [];
  if (unowned.length > 0) {
    violations.push({
      type: 'codeowners',
      severity: rule.severity,
      patterns: [path.basename(filePath)],
      message: rule.message,
      matchedFiles: unowned,
    });
  }
  if (wrongOwner.length > 0) {
    violations.push({
      type: 'codeowners',
      severity: rule.severity,
      patterns: [path.basename(filePath)],
      message:
        rule.message ??
        `Files must be owned by one of: ${requiredOwners!.join(', ')}`,
      matchedFiles: wrongOwner,
    });
  }
  return violations;
}
