#!/usr/bin/env node
/**
 * Output review: run the real CLI over `fixtures/`, capture everything each
 * case emits, and diff it against a committed baseline.
 *
 * Hermex's value is its output and its verdict, and unit tests do not look
 * at either. This runner does the loop a human was doing by hand — run the
 * command, read what came out, decide whether it is right — and turns the
 * "decide" half into a reviewable diff.
 *
 *   pnpm run test:output              compare against the baselines
 *   pnpm run test:output -- --update  refresh them (a reviewable diff)
 *   pnpm run test:output -- --filter comply
 *
 * The matrix lives in `fixtures/cases.ts`. Nothing here knows the case
 * list, the CI matrix or the PR comment rows — they all read that file.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createServer, type Server } from 'node:http';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// ── The contract fixtures/cases.ts is written against ────────────────────────

export interface FixtureCase {
  /** Artifact directory, job-summary anchor and PR-comment row key. */
  name: string;
  /** What a reviewer is being asked to confirm. Printed next to the output. */
  proves: string;
  /** Working directory to run in, relative to `fixtures/`. */
  cwd: string;
  /** CLI arguments. `{OUT}` is replaced with a scratch dir outside the repo. */
  args: string[];
  /**
   * Environment overrides on top of the pinned base environment. `null`
   * removes a variable — that is how the colour cases escape `NO_COLOR`.
   */
  env?: Record<string, string | null>;
  /** Files the case writes into `{OUT}`, captured as artifacts. */
  writes?: string[];
  /** Serve `fixtures/registry/timelines.ts` instead of reaching the network. */
  registry?: boolean;
  /** Also keep the raw, un-stripped stdout, so escape sequences are diffed. */
  keepAnsi?: boolean;
  /** The exit code this case is asserting. A mismatch fails even with --update. */
  expectExit: number;
}

interface FixtureRelease {
  daysAgo: number;
  deprecated?: string;
}

interface FixtureTimeline {
  latest: string;
  releases: Record<string, FixtureRelease>;
}

/** One captured file: `stdout.txt`, `exit-code.txt`, `summary.md`, … */
type Artifacts = Record<string, string>;

interface CaseResult {
  fixture: FixtureCase;
  artifacts: Artifacts;
  /** Set when the process exit code did not match `expectExit`. */
  exitMismatch?: { expected: number; actual: number };
  changed: string[];
  added: string[];
  removed: string[];
  diff: string;
}

// ── Paths ────────────────────────────────────────────────────────────────────

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'dist', 'cli.mjs');
const FIXTURES = join(ROOT, 'fixtures');
const BASELINES = join(ROOT, 'tests', '__output_baselines__');
const REPORT_DIR = join(ROOT, '.output-review');

// ── Determinism ──────────────────────────────────────────────────────────────

/**
 * The environment every case starts from. Inheriting the caller's
 * environment is what makes "works on my machine" baselines: colour depends
 * on whether a TTY is attached, the release-age cache depends on whatever a
 * previous run left in `~/.hermex`, and a stray `HERMEX_*` variable changes
 * the verdict. Pin all of it, and let a case opt out explicitly.
 */
function baseEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(process.env)) {
    // HERMEX_* is dropped rather than overridden: the set is open-ended, so
    // listing the ones to unset would silently rot as new ones are added.
    if (value === undefined || key.startsWith('HERMEX_')) continue;
    env[key] = value;
  }
  return {
    ...env,
    NO_COLOR: '1',
    FORCE_COLOR: '0',
    CI: '1',
    TERM: 'xterm-256color',
    COLUMNS: '100',
    HERMEX_REGISTRY_CACHE_DISABLED: '1',
  };
}

// oxlint-disable-next-line no-control-regex -- matching the ANSI escape byte is the point
const ANSI_ESCAPE_PATTERN = /\u001B\[[0-9;]*m/g;

function stripAnsi(text: string): string {
  return text.replace(ANSI_ESCAPE_PATTERN, '');
}

/**
 * Removes everything that differs between two runs of identical code, so a
 * diff only ever shows a change in behaviour.
 *
 * Anything not pinned here has to be pinned somewhere else: the release-age
 * timeline is recorded in days-before-now rather than dates
 * (`fixtures/registry/timelines.ts`), and file discovery is sorted at the
 * source (`src/utils/file-utils.ts`) rather than sorted after the fact —
 * scrubbing glob order would hide a real ordering regression instead of
 * reporting it.
 */
export function scrub(text: string): string {
  return (
    text
      .replace(/\r\n/g, '\n')
      // Absolute paths, in every spelling Node might print them: a POSIX
      // path, a Windows path, and a file:// URL.
      .split(ROOT)
      .join('<repo>')
      .split(ROOT.replace(/\\/g, '/'))
      .join('<repo>')
      .split(pathToFileURL(ROOT).href)
      .join('<repo>')
      // Path separators, so a baseline recorded on Windows matches one
      // recorded on the Linux runner. Nothing else in the output contains a
      // backslash — table borders are box-drawing characters and colour is
      // real escape bytes, not text.
      .replace(/\\/g, '/')
      // hermex's own version, which changes on every release and would
      // otherwise mark all 19 cases as changed. Package versions in the
      // tables and in `packages[]` are fixture data and stay untouched; the
      // JSON rule matches only the top-level key, at indent two.
      .replace(/hermex v\d+\.\d+\.\d+[^\s]*/g, 'hermex v<version>')
      .replace(/^ {2}"version": "[^"]*"/m, '  "version": "<version>"')
      // A Node warning would otherwise carry the process id.
      .replace(/\(node:\d+\)/g, '(node:<pid>)')
  );
}

// ── Offline registry ─────────────────────────────────────────────────────────

/**
 * Serves `fixtures/registry/timelines.ts` as npm registry documents, with
 * every `daysAgo` resolved against a single "now" captured at startup.
 *
 * Release age is the one part of hermex that reaches the network, so
 * without this the flagged set would change with the calendar and with
 * network weather, and the diff would be noise.
 */
async function startRegistry(): Promise<{ url: string; close: () => void }> {
  const module = (await import(
    pathToFileURL(join(FIXTURES, 'registry', 'timelines.ts')).href
  )) as { RELEASE_TIMELINES: Record<string, FixtureTimeline> };

  const now = Date.now();
  const isoDaysAgo = (days: number) =>
    new Date(now - days * 24 * 60 * 60 * 1000).toISOString();

  const documents: Record<string, unknown> = {};
  for (const [name, timeline] of Object.entries(module.RELEASE_TIMELINES)) {
    const time: Record<string, string> = {};
    const versions: Record<string, { deprecated?: string }> = {};
    let oldest = 0;
    for (const [version, release] of Object.entries(timeline.releases)) {
      time[version] = isoDaysAgo(release.daysAgo);
      versions[version] = release.deprecated
        ? { deprecated: release.deprecated }
        : {};
      oldest = Math.max(oldest, release.daysAgo);
    }
    time['created'] = isoDaysAgo(oldest);
    time['modified'] = isoDaysAgo(0);
    documents[name] = {
      name,
      time,
      versions,
      'dist-tags': { latest: timeline.latest },
    };
  }

  const server: Server = createServer((request, response) => {
    const name = decodeURIComponent((request.url ?? '/').slice(1));
    const document = documents[name];
    if (!document) {
      response.writeHead(404, { 'content-type': 'application/json' });
      response.end('{}');
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify(document));
  });

  await new Promise<void>((done) => server.listen(0, '127.0.0.1', done));
  const address = server.address();
  if (address === null || typeof address === 'string') {
    throw new Error('Fixture registry did not bind to a port');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: () => server.close(),
  };
}

// ── Running one case ─────────────────────────────────────────────────────────

/**
 * Runs the CLI and collects everything it emitted.
 *
 * Asynchronous on purpose: `spawnSync` blocks this process's event loop, so
 * the offline registry — an HTTP server living in this process — could
 * never answer the child, and every release-age lookup would silently come
 * back "registry unreachable".
 */
function spawnCapture(
  args: string[],
  options: { cwd: string; env: Record<string, string> },
): Promise<{ status: number; stdout: string; stderr: string }> {
  return new Promise((settle, fail) => {
    const child = spawn('node', args, {
      ...options,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => (stdout += chunk));
    child.stderr.on('data', (chunk: string) => (stderr += chunk));
    child.on('error', fail);
    child.on('close', (code) => settle({ status: code ?? -1, stdout, stderr }));
  });
}

async function runCase(
  fixture: FixtureCase,
  registryUrl: string | null,
): Promise<{ artifacts: Artifacts; status: number }> {
  const scratch = mkdtempSync(join(tmpdir(), `hermex-output-${fixture.name}-`));
  try {
    const args = fixture.args.map((arg) => arg.replace('{OUT}', scratch));
    const env = baseEnv();
    if (registryUrl) env['HERMEX_FIXTURE_REGISTRY'] = registryUrl;
    for (const [key, value] of Object.entries(fixture.env ?? {})) {
      if (value === null) delete env[key];
      else env[key] = value;
    }

    const result = await spawnCapture([CLI, ...args], {
      cwd: join(FIXTURES, fixture.cwd),
      env,
    });

    const status = result.status;
    const stdout = scrub(result.stdout);
    const stderr = scrub(result.stderr);
    const artifacts: Artifacts = { 'exit-code.txt': `${status}\n` };

    // JSON stdout is kept exactly as the CLI emitted it rather than
    // re-serialized: key order is part of the contract this is reviewing
    // (#80 moved `patterns` under `summary`), and re-serializing with
    // sorted keys would hide exactly that kind of change.
    const plain = stripAnsi(stdout);
    artifacts[isJson(plain) ? 'stdout.json' : 'stdout.txt'] = plain;
    artifacts['stderr.txt'] = stripAnsi(stderr);
    if (fixture.keepAnsi) artifacts['stdout.ansi.txt'] = stdout;

    for (const name of fixture.writes ?? []) {
      const written = join(scratch, name);
      artifacts[name] = existsSync(written)
        ? scrub(readFileSync(written, 'utf8'))
        : '<file was not written>\n';
    }

    return { artifacts, status };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

function isJson(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

// ── Baselines ────────────────────────────────────────────────────────────────

function readBaseline(name: string): Artifacts {
  const directory = join(BASELINES, name);
  if (!existsSync(directory)) return {};
  const artifacts: Artifacts = {};
  for (const file of readdirSync(directory).sort()) {
    artifacts[file] = readFileSync(join(directory, file), 'utf8');
  }
  return artifacts;
}

function writeBaseline(name: string, artifacts: Artifacts): void {
  const directory = join(BASELINES, name);
  rmSync(directory, { recursive: true, force: true });
  mkdirSync(directory, { recursive: true });
  for (const [file, content] of Object.entries(artifacts)) {
    writeFileSync(join(directory, file), content);
  }
}

// ── Diffing ──────────────────────────────────────────────────────────────────

/** Line-level LCS. Inputs here are hundreds of lines, so the table is cheap. */
export function diffLines(
  before: string[],
  after: string[],
): [string, string][] {
  const lengths: number[][] = Array.from({ length: before.length + 1 }, () =>
    Array.from({ length: after.length + 1 }, () => 0),
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i][j] =
        before[i] === after[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }

  const rows: [string, string][] = [];
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      rows.push([' ', before[i]]);
      i++;
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      rows.push(['-', before[i++]]);
    } else {
      rows.push(['+', after[j++]]);
    }
  }
  while (i < before.length) rows.push(['-', before[i++]]);
  while (j < after.length) rows.push(['+', after[j++]]);
  return rows;
}

const CONTEXT = 3;

/** A unified diff, trimmed to `CONTEXT` lines around each change. */
export function unifiedDiff(
  file: string,
  before: string,
  after: string,
): string {
  const rows = diffLines(
    before === '' ? [] : before.split('\n'),
    after === '' ? [] : after.split('\n'),
  );
  const keep = new Set<number>();
  rows.forEach(([sign], index) => {
    if (sign === ' ') return;
    for (let k = index - CONTEXT; k <= index + CONTEXT; k++) {
      if (k >= 0 && k < rows.length) keep.add(k);
    }
  });

  const lines: string[] = [`--- ${file}`, `+++ ${file}`];
  let skipping = false;
  rows.forEach(([sign, text], index) => {
    if (!keep.has(index)) {
      if (!skipping) lines.push('@@');
      skipping = true;
      return;
    }
    skipping = false;
    lines.push(`${sign}${text}`);
  });
  return lines.join('\n');
}

function compare(fixture: FixtureCase, artifacts: Artifacts): CaseResult {
  const baseline = readBaseline(fixture.name);
  const changed: string[] = [];
  const added: string[] = [];
  const removed: string[] = [];
  const diffs: string[] = [];

  for (const [file, content] of Object.entries(artifacts)) {
    if (!(file in baseline)) {
      added.push(file);
      diffs.push(unifiedDiff(file, '', content));
    } else if (baseline[file] !== content) {
      changed.push(file);
      diffs.push(unifiedDiff(file, baseline[file], content));
    }
  }
  for (const file of Object.keys(baseline)) {
    if (!(file in artifacts)) {
      removed.push(file);
      diffs.push(unifiedDiff(file, baseline[file], ''));
    }
  }

  return {
    fixture,
    artifacts,
    changed,
    added,
    removed,
    diff: diffs.join('\n\n'),
  };
}

function isClean(result: CaseResult): boolean {
  return (
    !result.exitMismatch &&
    result.changed.length === 0 &&
    result.added.length === 0 &&
    result.removed.length === 0
  );
}

// ── Lock-file parity ─────────────────────────────────────────────────────────

const LOCKFILE_CASES = ['lockfile-npm', 'lockfile-yarn', 'lockfile-pnpm'];

/**
 * The three lock-file repos describe one resolved tree in three formats, so
 * their payloads should be identical to each other — a claim the per-case
 * baselines cannot make on their own, because updating all three at once
 * would hide the divergence.
 *
 * Reported, not enforced. They currently disagree: npm's lockfile lists
 * hoisted transitive packages at `node_modules/<name>`, and the npm adapter
 * reads that depth as "direct dependency", so an npm repo reports
 * transitive packages as owned while yarn and pnpm do not. That is a
 * pre-existing parser bug with its own fix, and failing this advisory job
 * on it would just make the job something people ignore.
 */
function lockfileParity(results: CaseResult[]): string | null {
  const present = LOCKFILE_CASES.map((name) =>
    results.find((r) => r.fixture.name === name),
  ).filter((r): r is CaseResult => r !== undefined);
  if (present.length < 2) return null;

  const payloadOf = (result: CaseResult) =>
    result.artifacts['stdout.json'] ?? result.artifacts['stdout.txt'] ?? '';
  const reference = present[0];
  const divergent = present
    .slice(1)
    .filter((r) => payloadOf(r) !== payloadOf(reference))
    .map((r) => r.fixture.name);

  if (divergent.length === 0) return null;
  return `${divergent.join(', ')} disagree with ${reference.fixture.name}. The same tree in a different lock format should parse to the same inventory — advisory only, not a failure.`;
}

// ── Reporting ────────────────────────────────────────────────────────────────

function statusOf(result: CaseResult): string {
  if (result.exitMismatch) {
    return `**exit ${result.exitMismatch.actual}**, expected ${result.exitMismatch.expected}`;
  }
  if (isClean(result)) return 'unchanged';
  const parts: string[] = [];
  if (result.changed.length > 0) parts.push(`${result.changed.join(', ')}`);
  if (result.added.length > 0) parts.push(`+${result.added.join(', +')}`);
  if (result.removed.length > 0) parts.push(`-${result.removed.join(', -')}`);
  return `**changed** (${parts.join('; ')})`;
}

function fence(file: string): string {
  if (file.endsWith('.json')) return 'json';
  if (file.endsWith('.md')) return 'markdown';
  return 'text';
}

/**
 * A job summary is capped at 1 MB, and the baselines are the complete
 * record anyway — so long artifacts are trimmed for reading rather than
 * dropped. Diffs are never trimmed: they are the part being reviewed.
 */
const MAX_SUMMARY_LINES = 400;

function forSummary(content: string): string {
  const lines = content.trimEnd().split('\n');
  if (lines.length <= MAX_SUMMARY_LINES) return lines.join('\n');
  return [
    ...lines.slice(0, MAX_SUMMARY_LINES),
    `… ${lines.length - MAX_SUMMARY_LINES} more line(s) — full text in tests/__output_baselines__/`,
  ].join('\n');
}

/** The reviewable surface: every case's output, inline, no download step. */
function buildJobSummary(results: CaseResult[], parity: string | null): string {
  const lines: string[] = ['# Output review', ''];
  lines.push(buildTable(results, null), '');
  if (parity) lines.push(`> [!WARNING]`, `> Lock-file parity: ${parity}`, '');

  for (const result of results) {
    lines.push(`### ${result.fixture.name}`, '');
    lines.push(`${result.fixture.proves}`, '');
    lines.push(
      `\`hermex ${result.fixture.args.join(' ')}\` in \`fixtures/${result.fixture.cwd}\` — exit ${result.artifacts['exit-code.txt']?.trim()}, ${statusOf(result)}`,
      '',
    );

    if (result.diff) {
      lines.push('<details open><summary>Diff against baseline</summary>', '');
      lines.push('```diff', result.diff, '```', '', '</details>', '');
    }

    for (const [file, content] of Object.entries(result.artifacts)) {
      if (file === 'exit-code.txt') continue;
      lines.push(`<details><summary>${file}</summary>`, '');
      lines.push(
        '```' + fence(file),
        forSummary(content),
        '```',
        '',
        '</details>',
        '',
      );
    }
  }

  return lines.join('\n');
}

function buildTable(results: CaseResult[], summaryUrl: string | null): string {
  const lines = ['| Case | Status | Proves |', '| --- | --- | --- |'];
  for (const result of results) {
    // Job-summary headings get GitHub's `user-content-` anchor prefix.
    const link = summaryUrl
      ? `[${result.fixture.name}](${summaryUrl}#user-content-${result.fixture.name})`
      : `\`${result.fixture.name}\``;
    lines.push(`| ${link} | ${statusOf(result)} | ${result.fixture.proves} |`);
  }
  return lines.join('\n');
}

/** The sticky PR comment: one row and one link per case, nothing else. */
function buildComment(results: CaseResult[], parity: string | null): string {
  const changed = results.filter((r) => !isClean(r)).length;
  const summaryUrl =
    process.env['GITHUB_SERVER_URL'] &&
    process.env['GITHUB_REPOSITORY'] &&
    process.env['GITHUB_RUN_ID']
      ? `${process.env['GITHUB_SERVER_URL']}/${process.env['GITHUB_REPOSITORY']}/actions/runs/${process.env['GITHUB_RUN_ID']}`
      : null;

  const lines = [
    '<!-- hermex-output-review -->',
    `**Output review** — ${results.length} cases, ${changed} changed`,
    '',
    buildTable(results, summaryUrl),
    '',
  ];

  if (parity) lines.push(`> [!WARNING]`, `> Lock-file parity: ${parity}`, '');

  lines.push(
    changed === 0
      ? 'Nothing changed. No output review needed.'
      : 'Click a case to read its output in the job summary. Reviewed and correct? Approve the PR. Wrong? The baselines are in `tests/__output_baselines__/`, refreshed with `pnpm run test:output -- --update`.',
  );
  return lines.join('\n');
}

// ── Entry point ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const update = argv.includes('--update');
  const filterIndex = argv.indexOf('--filter');
  const filter = filterIndex === -1 ? null : argv[filterIndex + 1];

  if (!argv.includes('--no-build')) {
    // One command string rather than an argv array: with `shell: true` the
    // array form is concatenated unescaped, which Node deprecates.
    const build = spawnSync('pnpm run build', {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
    });
    if (build.status !== 0) {
      process.stderr.write(`${build.stdout ?? ''}${build.stderr ?? ''}`);
      throw new Error('Build failed — cannot review the output of a stale CLI');
    }
  }

  const module = (await import(
    pathToFileURL(join(FIXTURES, 'cases.ts')).href
  )) as { cases: FixtureCase[] };
  const selected = module.cases.filter(
    (fixture) => !filter || fixture.name.includes(filter),
  );
  if (selected.length === 0) {
    throw new Error(`No cases matched --filter ${String(filter)}`);
  }

  const registry = selected.some((fixture) => fixture.registry)
    ? await startRegistry()
    : null;

  const results: CaseResult[] = [];
  try {
    for (const fixture of selected) {
      const { artifacts, status } = await runCase(
        fixture,
        fixture.registry && registry ? registry.url : null,
      );
      const result = compare(fixture, artifacts);
      if (status !== fixture.expectExit) {
        result.exitMismatch = { expected: fixture.expectExit, actual: status };
      }
      results.push(result);

      if (update && !result.exitMismatch)
        writeBaseline(fixture.name, artifacts);
      process.stdout.write(
        `${isClean(result) ? '  ok  ' : update ? 'update' : ' diff '}  ${fixture.name}\n`,
      );
    }
  } finally {
    registry?.close();
  }

  const parity = lockfileParity(results);
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(join(REPORT_DIR, 'comment.md'), buildComment(results, parity));
  writeFileSync(
    join(REPORT_DIR, 'summary.md'),
    buildJobSummary(results, parity),
  );

  const stepSummary = process.env['GITHUB_STEP_SUMMARY'];
  if (stepSummary) {
    writeFileSync(stepSummary, buildJobSummary(results, parity), { flag: 'a' });
  }

  // An exit-code mismatch is never absorbed by --update: the manifest says
  // what the case is asserting, so a changed exit code has to be an edit to
  // fixtures/cases.ts, where a reviewer will see it.
  const mismatched = results.filter((r) => r.exitMismatch);
  for (const result of mismatched) {
    process.stderr.write(
      `\n${result.fixture.name}: expected exit ${result.exitMismatch?.expected}, got ${result.exitMismatch?.actual}. Update expectExit in fixtures/cases.ts if this is intended.\n`,
    );
  }
  if (parity) process.stderr.write(`\nLock-file parity: ${parity}\n`);

  const differing = results.filter((r) => !isClean(r));
  if (update) {
    process.stdout.write(
      `\n${results.length - mismatched.length} baseline(s) written to tests/__output_baselines__/\n`,
    );
  } else if (differing.length > 0) {
    process.stdout.write(
      `\n${differing.length} of ${results.length} case(s) differ from their baseline. Read .output-review/summary.md, then run\n  pnpm run test:output -- --update\nif the change is intended.\n`,
    );
  } else {
    process.stdout.write(
      `\nAll ${results.length} case(s) match their baseline.\n`,
    );
  }

  // Parity is deliberately absent from this condition — see `lockfileParity`.
  const failed = mismatched.length > 0 || (!update && differing.length > 0);
  process.exitCode = failed ? 1 : 0;
}

// Guarded so the pure helpers above (scrub, diffLines, unifiedDiff) can be
// imported and unit tested without running the whole matrix.
const invokedDirectly =
  process.argv[1] !== undefined &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedDirectly) {
  main().catch((error: unknown) => {
    process.stderr.write(
      `${error instanceof Error ? error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
}
