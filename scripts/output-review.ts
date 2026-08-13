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
  /**
   * Strings that must not appear in stdout. An absence a reviewer would
   * have to notice is an absence nobody notices — this states it, and the
   * `suppressed-sections-stay-absent` invariant enforces it.
   */
  absent?: string[];
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

/** Scrubbed but not ANSI-stripped — what the CLI really wrote. */
export interface RawCapture {
  stdout: string;
  stderr: string;
}

export interface CaseResult {
  fixture: FixtureCase;
  artifacts: Artifacts;
  raw: RawCapture;
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

// The escape-sequence pattern, kept as a source string so the global
// (replace) and non-global (test) forms cannot drift. .test() on a /g/
// regex is stateful, so the two genuinely have to be separate objects.
const ANSI_ESCAPE = '\\u001B\\[[0-9;]*m';
const ANSI_ESCAPE_PATTERN = new RegExp(ANSI_ESCAPE, 'g');
const ANSI_ESCAPE_TEST = new RegExp(ANSI_ESCAPE);

function hasAnsi(text: string): boolean {
  return ANSI_ESCAPE_TEST.test(text);
}

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
): Promise<{ artifacts: Artifacts; status: number; raw: RawCapture }> {
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

    // The un-stripped text goes back alongside the artifacts, not into
    // them: the ANSI-purity invariant has to look at what the CLI actually
    // emitted, and by the time a baseline is written the escapes are gone.
    return { artifacts, status, raw: { stdout, stderr } };
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

function compare(
  fixture: FixtureCase,
  artifacts: Artifacts,
  raw: RawCapture,
): CaseResult {
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
    raw,
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

// ── Invariants ───────────────────────────────────────────────────────────────
//
// Claims about the *relationship between* cases, or about properties every
// case must hold, that no single baseline can express.
//
// A baseline records what happened; it cannot record what must never
// happen. Worse, `--update` rewrites every baseline at once, so a rule
// encoded only in the recorded bytes is absorbed silently the moment the
// bytes change together — three lock formats drifting apart in the same
// commit, or a scrubber gap that gets faithfully re-recorded. These checks
// sit outside the baselines for exactly that reason, and are reported
// separately in the job summary and the PR comment.

interface Invariant {
  name: string;
  /** What it guarantees, printed with any breach. */
  guarantees: string;
  /**
   * `false` for a breach that is known, understood and tracked elsewhere —
   * it still gets reported, but does not fail the run. A permanently red
   * advisory job is one nobody reads.
   */
  blocking: boolean;
  check(context: InvariantContext): string[];
}

interface InvariantContext {
  results: CaseResult[];
  /** False under --filter, where whole-matrix claims cannot be judged. */
  full: boolean;
}

interface Breach {
  invariant: Invariant;
  detail: string;
}

const LOCKFILE_CASES = ['lockfile-npm', 'lockfile-yarn', 'lockfile-pnpm'];

function payloadOf(result: CaseResult): string {
  return (
    result.artifacts['stdout.json'] ?? result.artifacts['stdout.txt'] ?? ''
  );
}

function isJsonCase(result: CaseResult): boolean {
  return result.fixture.args.includes('json');
}

function isComplyCase(result: CaseResult): boolean {
  return result.fixture.args[0] === 'comply';
}

export const INVARIANTS: Invariant[] = [
  {
    name: 'lockfile-parity',
    guarantees:
      'the same dependency tree parses to the same inventory whichever lock format records it',
    // Blocking. This was advisory while the npm adapter read hoisting
    // depth as "direct dependency" and the three arms genuinely disagreed;
    // that is fixed (see `declaredRootNames` in the npm adapter), so a
    // divergence now means a parser has regressed and there is nothing to
    // be gained by letting it merge.
    blocking: true,
    check({ results }) {
      const present = LOCKFILE_CASES.map((name) =>
        results.find((r) => r.fixture.name === name),
      ).filter((r): r is CaseResult => r !== undefined);
      if (present.length < 2) return [];

      const reference = present[0];
      return present
        .slice(1)
        .filter((r) => payloadOf(r) !== payloadOf(reference))
        .map(
          (r) =>
            `${r.fixture.name} disagrees with ${reference.fixture.name} on the same tree`,
        );
    },
  },
  {
    name: 'ansi-purity',
    guarantees:
      'nothing but a deliberately coloured case emits escape sequences, so CI logs, summary files and PR comments stay readable',
    blocking: true,
    check({ results }) {
      const breaches: string[] = [];
      for (const result of results) {
        if (!result.fixture.keepAnsi) {
          if (hasAnsi(result.raw.stdout)) {
            breaches.push(`${result.fixture.name}: stdout carries colour`);
          }
          if (hasAnsi(result.raw.stderr)) {
            breaches.push(`${result.fixture.name}: stderr carries colour`);
          }
        }
        // A written file is never a terminal, whatever the colour settings
        // — --summary-file exists to be pasted somewhere that cannot
        // render escapes.
        for (const name of result.fixture.writes ?? []) {
          if (hasAnsi(result.artifacts[name] ?? '')) {
            breaches.push(`${result.fixture.name}: ${name} carries colour`);
          }
        }
      }
      return breaches;
    },
  },
  {
    name: 'exit-code-agrees-with-verdict',
    guarantees:
      'the exit code and the printed verdict never disagree, so a script and a human reading the same run reach the same conclusion',
    blocking: true,
    check({ results }) {
      const breaches: string[] = [];
      for (const result of results.filter(isComplyCase)) {
        const exit = Number(result.artifacts['exit-code.txt']?.trim());
        // Exit 2 is a pipeline failure — no verdict was reached at all, so
        // there is nothing to agree with.
        if (exit === 2) continue;

        if (isJsonCase(result)) {
          const parsed = JSON.parse(payloadOf(result)) as {
            compliance?: { compliant?: boolean };
          };
          const compliant = parsed.compliance?.compliant;
          if (compliant !== (exit === 0)) {
            breaches.push(
              `${result.fixture.name}: compliance.compliant is ${String(compliant)} but the process exited ${exit}`,
            );
          }
          continue;
        }

        const text = payloadOf(result);
        const saysNotCompliant = text.includes('NOT COMPLIANT');
        const saysCompliant = text.includes('COMPLIANT') && !saysNotCompliant;
        if (exit === 0 && !saysCompliant) {
          breaches.push(
            `${result.fixture.name}: exited 0 without printing a compliant verdict`,
          );
        }
        if (exit === 1 && !saysNotCompliant) {
          breaches.push(
            `${result.fixture.name}: exited 1 without printing a non-compliant verdict`,
          );
        }
      }
      return breaches;
    },
  },
  {
    name: 'json-stdout-is-only-json',
    guarantees:
      '--format json puts nothing but the payload on stdout, so a consumer can pipe it straight into a parser (#55)',
    blocking: true,
    check({ results }) {
      return results
        .filter(isJsonCase)
        .filter((result) => !isJson(payloadOf(result)))
        .map(
          (result) =>
            `${result.fixture.name}: stdout is not parseable as a single JSON document — progress chrome belongs on stderr`,
        );
    },
  },
  {
    name: 'no-unscrubbed-volatiles',
    guarantees:
      'no baseline records an absolute path, a process id or a released version — any of which would make the next run differ for reasons that are not code changes',
    blocking: true,
    check({ results }) {
      // Each pattern requires a non-letter before the path so a URL scheme
      // does not read as a drive letter — `https://` ends in `s:/` and
      // matched the naive version of this check.
      const leaks: [RegExp, string][] = [
        [/(?:^|[^A-Za-z])[A-Za-z]:\//, 'an absolute Windows path'],
        [/(?:^|[^\w-])\/(?:home|Users)\//, 'an absolute POSIX path'],
        [/hermex v\d+\.\d+\.\d+/, "hermex's own version"],
        [/\(node:\d+\)/, 'a process id'],
      ];
      const breaches: string[] = [];
      for (const result of results) {
        for (const [file, content] of Object.entries(result.artifacts)) {
          for (const [pattern, what] of leaks) {
            if (pattern.test(content)) {
              breaches.push(
                `${result.fixture.name}/${file} contains ${what} the scrubber missed`,
              );
            }
          }
        }
      }
      return breaches;
    },
  },
  {
    name: 'suppressed-sections-stay-absent',
    guarantees:
      'a section switched off in config leaves no trace in the output at all (#63)',
    blocking: true,
    check({ results }) {
      const breaches: string[] = [];
      for (const result of results) {
        for (const needle of result.fixture.absent ?? []) {
          if (payloadOf(result).includes(needle)) {
            breaches.push(
              `${result.fixture.name}: "${needle}" is still present in stdout`,
            );
          }
        }
      }
      return breaches;
    },
  },
  {
    name: 'no-orphaned-baselines',
    guarantees:
      'every committed baseline belongs to a live case, so a renamed or deleted case cannot leave a directory nobody reads behind',
    blocking: true,
    check({ results, full }) {
      if (!full || !existsSync(BASELINES)) return [];
      const live = new Set(results.map((r) => r.fixture.name));
      return readdirSync(BASELINES, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() && !live.has(entry.name))
        .map(
          (entry) =>
            `tests/__output_baselines__/${entry.name}/ has no case in fixtures/cases.ts`,
        );
    },
  },
];

function checkInvariants(results: CaseResult[], full: boolean): Breach[] {
  const breaches: Breach[] = [];
  for (const invariant of INVARIANTS) {
    for (const detail of invariant.check({ results, full })) {
      breaches.push({ invariant, detail });
    }
  }
  return breaches;
}

/** The Warnings block shared by the job summary and the PR comment. */
function renderBreaches(breaches: Breach[]): string[] {
  if (breaches.length === 0) return [];

  const lines = ['> [!WARNING]', '> **Invariants**'];
  for (const invariant of INVARIANTS) {
    const mine = breaches.filter((b) => b.invariant === invariant);
    if (mine.length === 0) continue;
    lines.push(
      `> - \`${invariant.name}\`${invariant.blocking ? '' : ' _(advisory)_'} — ${invariant.guarantees}.`,
    );
    for (const breach of mine) lines.push(`>   - ${breach.detail}`);
  }
  return [...lines, ''];
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
function buildJobSummary(results: CaseResult[], breaches: Breach[]): string {
  const lines: string[] = ['# Output review', ''];
  lines.push(buildTable(results, null), '');
  lines.push(...renderBreaches(breaches));

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
function buildComment(results: CaseResult[], breaches: Breach[]): string {
  const changed = results.filter((r) => !isClean(r)).length;
  const summaryUrl =
    process.env['GITHUB_SERVER_URL'] &&
    process.env['GITHUB_REPOSITORY'] &&
    process.env['GITHUB_RUN_ID']
      ? `${process.env['GITHUB_SERVER_URL']}/${process.env['GITHUB_REPOSITORY']}/actions/runs/${process.env['GITHUB_RUN_ID']}`
      : null;

  const lines = [
    '<!-- hermex-output-review -->',
    `**Output review** — ${results.length} cases, ${changed} changed, ${breaches.length} invariant breach(es)`,
    '',
    buildTable(results, summaryUrl),
    '',
    ...renderBreaches(breaches),
  ];

  // This job is a required check, so the closing line has to say what it
  // takes to go green — a red run with no instructions is just an obstacle.
  if (breaches.length > 0) {
    lines.push(
      'An invariant above is broken. That is not something a baseline refresh fixes — it describes what must never happen, so the check stays red until the behaviour changes.',
    );
  } else if (changed === 0) {
    lines.push('Output is unchanged. Nothing to review.');
  } else {
    lines.push(
      'Click a case to read its output in the job summary. If every change is intended, run `pnpm run test:output -- --update` and commit the refreshed baselines — that diff is the record of what you approved, and this check goes green once it matches.',
    );
  }
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
      const { artifacts, status, raw } = await runCase(
        fixture,
        fixture.registry && registry ? registry.url : null,
      );
      const result = compare(fixture, artifacts, raw);
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

  const breaches = checkInvariants(results, filter === null);
  mkdirSync(REPORT_DIR, { recursive: true });
  writeFileSync(
    join(REPORT_DIR, 'comment.md'),
    buildComment(results, breaches),
  );
  writeFileSync(
    join(REPORT_DIR, 'summary.md'),
    buildJobSummary(results, breaches),
  );

  const stepSummary = process.env['GITHUB_STEP_SUMMARY'];
  if (stepSummary) {
    writeFileSync(stepSummary, buildJobSummary(results, breaches), {
      flag: 'a',
    });
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
  for (const { invariant, detail } of breaches) {
    process.stderr.write(
      `\n${invariant.blocking ? 'invariant' : 'advisory '} ${invariant.name}: ${detail}\n  guarantees ${invariant.guarantees}\n`,
    );
  }

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

  // A blocking invariant fails the run even under --update, for the same
  // reason an exit-code mismatch does: it describes something no baseline
  // should ever be allowed to record.
  const failed =
    mismatched.length > 0 ||
    breaches.some(({ invariant }) => invariant.blocking) ||
    (!update && differing.length > 0);
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
