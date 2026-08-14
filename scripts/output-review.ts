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
  /**
   * Prose for the case dossier that nothing here can derive — what a
   * reviewer should look at first, why the expected output has the shape it
   * has, which issue the case is holding open. Everything else in
   * `fixtures/cases/<name>.md` is generated from the fields above.
   */
  notes?: string;
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
  /** Per-artifact changes, with the line numbers the PR comment links at. */
  fileDiffs: FileDiff[];
  /** The same thing rendered, for the job summary. */
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

// ── Case dossiers ────────────────────────────────────────────────────────────
//
// One committed Markdown page per case, at `fixtures/cases/<name>.md`.
//
// This is the stable half of the review. A diff is per-run and lives in the
// report; a dossier answers "what is this case, what policy did it run
// under, what should it look like?" — which does not change between runs
// and therefore belongs in git, versioned next to the code, reviewable in
// the same PR that changes it.
//
// Generated rather than hand-written: twenty-six hand-maintained pages rot,
// and a rotted dossier is worse than none because it is believed. The only
// hand-written part is `notes` on the case itself, which travels with the
// definition it describes. `case-docs-are-current` fails the run if a
// dossier drifts from the case that generates it.

const CASE_DOCS = join(FIXTURES, 'cases');

function caseDocPath(name: string): string {
  return join(CASE_DOCS, `${name}.md`);
}

/** A repo-relative path, respelled relative to `fixtures/cases/`. */
function fromCaseDoc(repoPath: string): string {
  if (repoPath === 'fixtures') return '..';
  if (repoPath.startsWith('fixtures/')) {
    return `../${repoPath.slice('fixtures/'.length)}`;
  }
  return `../../${repoPath}`;
}

export function caseDoc(fixture: FixtureCase): string {
  const sources = sourcesOf(fixture);
  const cwd = fixture.cwd === '.' ? 'fixtures/' : `fixtures/${fixture.cwd}`;
  const command = fixture.args
    .map((arg) => arg.replace('{OUT}', '$OUT'))
    .join(' ');

  const rows: [string, string][] = [
    ['Command', `\`hermex ${command}\``],
    ['Working directory', `\`${cwd}\``],
    [
      'Config',
      sources.config
        ? `[\`${sources.config}\`](${fromCaseDoc(sources.config)})`
        : '_none — no `hermex.config.ts` in the working directory, so this runs on schema defaults_',
    ],
    [
      'Fixture',
      `[\`${sources.fixture}\`](${fromCaseDoc(sources.fixture)})` +
        (sources.overview
          ? ` — [overview](${fromCaseDoc(sources.overview)})`
          : ''),
    ],
    ['Asserted exit code', `\`${fixture.expectExit}\``],
  ];

  if (fixture.env) {
    rows.push([
      'Environment',
      Object.entries(fixture.env)
        .map(([key, value]) =>
          value === null ? `\`${key}\` unset` : `\`${key}=${value}\``,
        )
        .join(', '),
    ]);
  }
  if (fixture.writes && fixture.writes.length > 0) {
    rows.push([
      'Writes',
      `${fixture.writes.map((name) => `\`${name}\``).join(', ')} into a scratch directory outside the repo`,
    ]);
  }
  if (fixture.registry) {
    rows.push([
      'Registry',
      `offline, served from [\`fixtures/registry/timelines.ts\`](${fromCaseDoc('fixtures/registry/timelines.ts')}) — never the network`,
    ]);
  }
  if (fixture.keepAnsi) {
    rows.push([
      'Colour',
      'captured raw, so escape sequences are part of the recorded output',
    ]);
  }

  const lines = [
    '<!-- Generated by `pnpm run test:output -- --update`. Edit the case in',
    '     fixtures/cases.ts, not this file. -->',
    '',
    `# \`${fixture.name}\``,
    '',
    fixture.proves,
    '',
    '## What runs',
    '',
    '| | |',
    '| --- | --- |',
    ...rows.map(([label, value]) => `| **${label}** | ${value} |`),
    '',
  ];

  if (fixture.absent && fixture.absent.length > 0) {
    lines.push(
      '## Must not appear in stdout',
      '',
      // Stated rather than left to the reader: an absence nobody names is an
      // absence nobody notices in a forty-line baseline.
      ...fixture.absent.map((needle) => `- \`${needle}\``),
      '',
      `Enforced by the \`suppressed-sections-stay-absent\` invariant, not just by the baseline.`,
      '',
    );
  }

  if (fixture.notes) {
    lines.push('## What to look at', '', fixture.notes, '');
  }

  lines.push(
    '## Recorded output',
    '',
    `The committed baseline is [\`tests/__output_baselines__/${fixture.name}/\`](${fromCaseDoc(`tests/__output_baselines__/${fixture.name}`)}), which holds this case's stdout, stderr, exit code and any file it wrote. A change to hermex's output shows up as a diff there, in the same PR that causes it.`,
    '',
    '## Run it locally',
    '',
    '```bash',
    `pnpm run test:output -- --filter ${fixture.name}`,
    '```',
    '',
    `Defined in [\`fixtures/cases.ts\`](${fromCaseDoc('fixtures/cases.ts')}).`,
    '',
  );
  return lines.join('\n');
}

function writeCaseDocs(cases: FixtureCase[]): void {
  mkdirSync(CASE_DOCS, { recursive: true });
  for (const fixture of cases) {
    writeFileSync(caseDocPath(fixture.name), caseDoc(fixture));
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

interface DiffRow {
  sign: string;
  text: string;
  /** 1-based line number on each side. 0 where the row does not exist there. */
  oldLine: number;
  newLine: number;
}

export interface Hunk {
  /** 1-based start line and length on each side, as a `@@` header states. */
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  rows: DiffRow[];
}

/** One artifact's change, in the structured form the report renders from. */
export interface FileDiff {
  file: string;
  hunks: Hunk[];
  additions: number;
  deletions: number;
}

/**
 * The change regions between two texts, each with `CONTEXT` lines around it.
 *
 * Structured rather than pre-rendered, because the line numbers are worth
 * more than the text: they are what lets the PR comment link straight at the
 * changed lines of the committed baseline instead of asking a reviewer to go
 * and find them.
 */
export function diffHunks(before: string, after: string): Hunk[] {
  const rows = diffLines(
    before === '' ? [] : before.split('\n'),
    after === '' ? [] : after.split('\n'),
  );

  let oldLine = 0;
  let newLine = 0;
  const numbered: DiffRow[] = rows.map(([sign, text]) => ({
    sign,
    text,
    oldLine: sign === '+' ? 0 : ++oldLine,
    newLine: sign === '-' ? 0 : ++newLine,
  }));

  const keep = new Set<number>();
  numbered.forEach((row, index) => {
    if (row.sign === ' ') return;
    for (let k = index - CONTEXT; k <= index + CONTEXT; k++) {
      if (k >= 0 && k < numbered.length) keep.add(k);
    }
  });

  const hunks: Hunk[] = [];
  let index = 0;
  while (index < numbered.length) {
    if (!keep.has(index)) {
      index++;
      continue;
    }
    const start = index;
    while (index < numbered.length && keep.has(index)) index++;
    const region = numbered.slice(start, index);

    hunks.push({
      oldCount: region.filter((row) => row.sign !== '+').length,
      newCount: region.filter((row) => row.sign !== '-').length,
      // A hunk with no lines on one side is an added or deleted file. The
      // convention there is a start of 0, not 1 — the position is "before
      // the first line", not "at it".
      oldStart: region.find((row) => row.sign !== '+')?.oldLine ?? 0,
      newStart: region.find((row) => row.sign !== '-')?.newLine ?? 0,
      rows: region,
    });
  }
  return hunks;
}

function fileDiffOf(file: string, before: string, after: string): FileDiff {
  const hunks = diffHunks(before, after);
  const rows = hunks.flatMap((hunk) => hunk.rows);
  return {
    file,
    hunks,
    additions: rows.filter((row) => row.sign === '+').length,
    deletions: rows.filter((row) => row.sign === '-').length,
  };
}

/**
 * A unified diff. Real hunk headers — `@@ -12,7 +12,9 @@` — rather than the
 * bare `@@` this used to emit. The numbers are what make an elision
 * readable: they say the hunk covers 7 lines from line 12 of the baseline
 * and 9 from line 12 of the current output, so a reviewer can find the
 * changed line in the artifact instead of counting from the top. The header
 * lines are labelled `baseline/` and `current/` rather than the conventional
 * `a/` and `b/`, since which side is which is the first thing anyone asks.
 */
export function unifiedDiff(
  file: string,
  before: string,
  after: string,
): string {
  return renderHunks(file, diffHunks(before, after));
}

function renderHunks(file: string, hunks: Hunk[]): string {
  // No changes at all means no hunks, and a header with nothing under it
  // reads as "something changed here" — which is exactly wrong.
  if (hunks.length === 0) return '';
  const lines = [`--- baseline/${file}`, `+++ current/${file}`];
  for (const hunk of hunks) {
    lines.push(
      `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`,
    );
    for (const row of hunk.rows) lines.push(`${row.sign}${row.text}`);
  }
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
  const fileDiffs: FileDiff[] = [];

  for (const [file, content] of Object.entries(artifacts)) {
    if (!(file in baseline)) {
      added.push(file);
      fileDiffs.push(fileDiffOf(file, '', content));
    } else if (baseline[file] !== content) {
      changed.push(file);
      fileDiffs.push(fileDiffOf(file, baseline[file], content));
    }
  }
  for (const file of Object.keys(baseline)) {
    if (!(file in artifacts)) {
      removed.push(file);
      fileDiffs.push(fileDiffOf(file, baseline[file], ''));
    }
  }

  return {
    fixture,
    artifacts,
    raw,
    changed,
    added,
    removed,
    fileDiffs,
    diff: fileDiffs
      .map((entry) => renderHunks(entry.file, entry.hunks))
      .join('\n\n'),
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
    name: 'case-docs-are-current',
    guarantees:
      'every case has a dossier at fixtures/cases/<name>.md that still describes it, so the page a reviewer is sent to cannot quietly stop matching the case it documents',
    // Blocking, and deliberately so. A stale dossier is worse than a missing
    // one: it is believed. `pnpm run test:output -- --update` regenerates
    // them, and the regenerated page lands in the same PR as the case change.
    blocking: true,
    check({ results, full }) {
      const breaches: string[] = [];
      for (const { fixture } of results) {
        const path = caseDocPath(fixture.name);
        if (!existsSync(path)) {
          breaches.push(
            `fixtures/cases/${fixture.name}.md does not exist — run \`pnpm run test:output -- --update\``,
          );
        } else if (readFileSync(path, 'utf8') !== caseDoc(fixture)) {
          breaches.push(
            `fixtures/cases/${fixture.name}.md no longer matches its case in fixtures/cases.ts — run \`pnpm run test:output -- --update\``,
          );
        }
      }
      // Orphans are a whole-matrix claim, so --filter cannot judge them.
      if (full && existsSync(CASE_DOCS)) {
        const live = new Set(results.map((r) => `${r.fixture.name}.md`));
        for (const entry of readdirSync(CASE_DOCS)) {
          if (entry.endsWith('.md') && !live.has(entry)) {
            breaches.push(
              `fixtures/cases/${entry} has no case in fixtures/cases.ts`,
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

/**
 * Plain text, no emphasis. Emphasis is added where it is rendered, because
 * `**bold**` inside a `<summary>` element is markdown inside HTML and does
 * not reliably render — the status would read literally, asterisks and all.
 */
function statusOf(result: CaseResult): string {
  if (result.exitMismatch) {
    return `exit ${result.exitMismatch.actual}, expected ${result.exitMismatch.expected}`;
  }
  if (isClean(result)) return 'unchanged';
  const parts: string[] = [];
  if (result.changed.length > 0) parts.push(`${result.changed.join(', ')}`);
  if (result.added.length > 0) parts.push(`+${result.added.join(', +')}`);
  if (result.removed.length > 0) parts.push(`-${result.removed.join(', -')}`);
  return `changed: ${parts.join('; ')}`;
}

/** The same status, emphasized for a table cell that renders markdown. */
function emphasizedStatus(result: CaseResult): string {
  const status = statusOf(result);
  if (isClean(result)) return status;
  const [head, ...rest] = status.split(':');
  return rest.length > 0 ? `**${head}**:${rest.join(':')}` : `**${status}**`;
}

// ── Linking a case back to the files that produced it ────────────────────────
//
// A diff answers "what changed", never "changed from what, under which
// policy, and why is that the expected shape?". Those answers are in three
// files a reviewer would otherwise go hunting for, so every case carries
// links to them.

/** Repo-relative paths, POSIX-spelled, so they can be pasted into a URL. */
interface CaseSources {
  /** The config the run actually loaded, or `null` for schema defaults. */
  config: string | null;
  /** The directory the CLI ran in. */
  fixture: string;
  /** Its prose overview, when it has one. */
  overview: string | null;
}

function repoRelative(...parts: string[]): string {
  return join('fixtures', ...parts).replace(/\\/g, '/');
}

function sourcesOf(fixture: FixtureCase): CaseSources {
  // Mirrors src/config/loader.ts exactly: an explicit --config, otherwise
  // `hermex.config.ts` in the cwd and nothing else — the loader does not
  // walk up, so the lock-file repos genuinely run on schema defaults and
  // saying "fixtures/hermex.config.ts" there would be a lie.
  const explicit = fixture.args.indexOf('--config');
  const config =
    explicit === -1
      ? existsSync(join(FIXTURES, fixture.cwd, 'hermex.config.ts'))
        ? repoRelative(fixture.cwd, 'hermex.config.ts')
        : null
      : repoRelative(fixture.cwd, fixture.args[explicit + 1]);

  const readme = repoRelative(fixture.cwd, 'README.md');
  return {
    config,
    fixture: repoRelative(fixture.cwd),
    overview: existsSync(join(ROOT, readme)) ? readme : null,
  };
}

/**
 * `blob/<sha>` rather than `blob/<branch>`: the links have to keep pointing
 * at the tree that produced this diff even after the branch moves on.
 */
function blobBase(): string | null {
  const server = process.env['GITHUB_SERVER_URL'];
  const repository = process.env['GITHUB_REPOSITORY'];
  // On a pull_request event GITHUB_SHA is the merge commit, which is what
  // was actually run — so it is also what should be read.
  const sha = process.env['GITHUB_SHA'];
  if (!server || !repository || !sha) return null;
  return `${server}/${repository}/blob/${sha}`;
}

function runUrl(): string | null {
  const server = process.env['GITHUB_SERVER_URL'];
  const repository = process.env['GITHUB_REPOSITORY'];
  const run = process.env['GITHUB_RUN_ID'];
  if (!server || !repository || !run) return null;
  return `${server}/${repository}/actions/runs/${run}`;
}

/** A repo path as a link when running in CI, as plain code when run locally. */
function fileLink(path: string, base: string | null, label?: string): string {
  const text = label ?? `\`${path}\``;
  return base ? `[${text}](${base}/${path})` : text;
}

/**
 * The provenance block printed above every case's diff: the command, the
 * config it ran under, the fixture it ran against, and what the case is
 * asserting. Without it a diff is a wall of text with no stated intent, and
 * "is this change correct?" is unanswerable.
 */
function caseContext(result: CaseResult, base: string | null): string[] {
  const fixture = result.fixture;
  const sources = sourcesOf(fixture);
  const exit = result.artifacts['exit-code.txt']?.trim();

  // `{OUT}` is a per-case scratch directory outside the repo, so printing
  // the resolved path would be both meaningless and a scrubber leak.
  const command = fixture.args
    .map((arg) => arg.replace('{OUT}', '$OUT'))
    .join(' ');
  const cwd = fixture.cwd === '.' ? 'fixtures/' : `fixtures/${fixture.cwd}`;
  const verdict =
    exit === String(fixture.expectExit)
      ? `exit ${exit}, as asserted`
      : `**exit ${exit}, but the case asserts ${fixture.expectExit}**`;

  const lines = [
    `**Asserts** — ${fixture.proves}`,
    '',
    `**Ran** \`hermex ${command}\` in \`${cwd}\` → ${verdict}`,
    '',
    [
      `**Config** ${sources.config ? fileLink(sources.config, base) : '_none — the loader found no `hermex.config.ts` in the cwd, so this ran on schema defaults_'}`,
      `**Fixture** ${fileLink(sources.fixture, base)}${
        sources.overview
          ? ` (${fileLink(sources.overview, base, 'overview')})`
          : ''
      }`,
      `**Case** ${fileLink('fixtures/cases.ts', base, `\`${fixture.name}\``)} (${fileLink(`fixtures/cases/${fixture.name}.md`, base, 'dossier')})`,
    ].join(' · '),
    '',
  ];

  if (fixture.env) {
    const overrides = Object.entries(fixture.env).map(([key, value]) =>
      value === null ? `\`${key}\` unset` : `\`${key}=${value}\``,
    );
    lines.push(`**Environment** ${overrides.join(', ')}`, '');
  }
  if (fixture.writes && fixture.writes.length > 0) {
    lines.push(
      `**Writes** ${fixture.writes.map((name) => `\`${name}\``).join(', ')} into \`$OUT\` — captured and diffed the same as stdout`,
      '',
    );
  }
  if (fixture.absent && fixture.absent.length > 0) {
    lines.push(
      `**Must not appear anywhere in stdout** ${fixture.absent.map((needle) => `\`${needle}\``).join(', ')}`,
      '',
    );
  }
  if (fixture.registry) {
    lines.push(
      '**Registry** offline, served from `fixtures/registry/timelines.ts` — no network',
      '',
    );
  }
  lines.push(
    `<sub>Reproduce locally: \`pnpm run test:output -- --filter ${fixture.name}\`</sub>`,
    '',
  );
  return lines;
}

/**
 * What `@@` means, stated once wherever a diff is shown. It is standard
 * unified-diff syntax, which is exactly why it goes unexplained everywhere
 * else — and why nobody who has not read `diff(1)` can use it.
 */
const DIFF_LEGEND =
  '<sub>Diffs are unified format: `-` is the committed baseline, `+` is this ' +
  'run. `@@ -12,7 +12,9 @@` is a hunk header — unchanged lines were skipped, ' +
  'and the hunk below covers 7 lines from line 12 of the baseline and 9 lines ' +
  'from line 12 of this run — which is where to look in ' +
  '`tests/__output_baselines__/`.</sub>';

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

/**
 * The full matrix: every case, changed or not, with its output inline and
 * no download step.
 *
 * This is the "all cases" view. It lives here rather than in the PR comment
 * because 26 rows of `unchanged` is not a review, it is a wall — and a wall
 * is what people stop reading. The comment carries the cases that changed;
 * this carries everything, for the reviewer who wants to see what a case
 * actually emits rather than only how it moved.
 */
function buildJobSummary(results: CaseResult[], breaches: Breach[]): string {
  const base = blobBase();
  const differing = results.filter((result) => !isClean(result));
  const clean = results.filter(isClean);

  const lines: string[] = [
    '# Output review',
    '',
    `${results.length} cases · ${differing.length} changed · ${breaches.length} invariant breach(es)`,
    '',
  ];
  lines.push(...renderBreaches(breaches));
  lines.push(buildTable(results), '', DIFF_LEGEND, '');

  if (differing.length > 0) {
    lines.push('## Changed', '');
    for (const result of differing) lines.push(...renderCase(result, base));
  }

  // Below the changed ones, and not wrapped in an enclosing `<details>`:
  // each case already collapses its own artifacts, and a `<details>` around
  // cases that each contain a `<details>` is nested HTML whose inner
  // markdown GitHub is not reliable about rendering. The headings stay
  // cheap; the bulk is already behind a toggle.
  if (clean.length > 0) {
    lines.push(
      `## Unchanged (${clean.length})`,
      '',
      'These match their baseline. They are here to be read, not reviewed.',
      '',
    );
    for (const result of clean) lines.push(...renderCase(result, base));
  }

  return lines.join('\n');
}

/**
 * One case in the job summary — the same Markdown the case page uses, so
 * there is one renderer to keep correct rather than two saying the same
 * things in different dialects.
 */
function renderCase(result: CaseResult, base: string | null): string[] {
  return [
    `### ${result.fixture.name}`,
    '',
    `_${statusOf(result)}_`,
    '',
    ...caseBody(result, base),
  ];
}

function buildTable(results: CaseResult[]): string {
  const lines = ['| Case | Status | Proves |', '| --- | --- | --- |'];
  for (const result of results) {
    lines.push(
      `| \`${result.fixture.name}\` | ${emphasizedStatus(result)} | ${result.fixture.proves} |`,
    );
  }
  return lines.join('\n');
}

/** Total change across every artifact a case touched. */
function caseTotals(result: CaseResult): string {
  const additions = result.fileDiffs.reduce((sum, e) => sum + e.additions, 0);
  const deletions = result.fileDiffs.reduce((sum, e) => sum + e.deletions, 0);
  if (result.exitMismatch) {
    return `exit ${result.exitMismatch.actual}, expected ${result.exitMismatch.expected}`;
  }
  return `+${additions} −${deletions}`;
}

/**
 * Where one changed case is read, as exactly one link.
 *
 * A page per case when a site is published, the job summary otherwise. One
 * link and one destination per row is the whole design: the previous version
 * offered a file link plus a link per hunk, which on a real renderer change
 * was seven links in a row and no obvious place to start.
 */
function caseLink(name: string, site: string | null, summary: string | null) {
  if (site) return `[case →](${site}/${encodeURIComponent(name)}.html)`;
  if (summary) return `[case →](${summary})`;
  return `\`.output-review/site/${name}.html\``;
}

/**
 * The sticky PR comment: one row per changed case, one link each.
 *
 * Everything a reviewer needs *about* a case — what it asserts, its config,
 * its fixture, its full diff, its complete output — is on that case's own
 * page. The comment's job is triage: which cases moved, by how much, and is
 * that the set you expected? It carries no diffs, because an output change
 * is rarely one line in one case: a renderer tweak moves every row of
 * sixteen cases at once, which measured 60 KB against GitHub's
 * 65,536-character limit and was unreadable long before it was rejected.
 *
 * The one concession is a preview block when three or fewer cases changed,
 * which is the case where a reviewer can tell from a glance whether the
 * change is the intended one and never needs to click at all.
 */
function buildComment(results: CaseResult[], breaches: Breach[]): string {
  const site = siteUrl();
  const summary = runUrl();
  const differing = results.filter((result) => !isClean(result));

  const index = site
    ? `[all ${results.length} cases](${site}/index.html)`
    : summary
      ? `[all ${results.length} cases](${summary})`
      : `all ${results.length} cases in \`.output-review/\``;

  const lines = [
    '<!-- hermex-output-review -->',
    '### Output review',
    '',
    `**${differing.length} of ${results.length} case(s) changed** · ${breaches.length} invariant breach(es) · ${index}`,
    '',
    ...renderBreaches(breaches),
  ];

  if (differing.length > 0) {
    lines.push('| Case | Change | |', '| --- | --- | --- |');
    for (const result of differing) {
      lines.push(
        `| \`${result.fixture.name}\` | ${caseTotals(result)} | ${caseLink(result.fixture.name, site, summary)} |`,
      );
    }
    lines.push('');
  }

  // This job is a required check, so the closing line has to say what it
  // takes to go green — a red run with no instructions is just an obstacle.
  if (breaches.length > 0) {
    lines.push(
      'An invariant above is broken. That is not something a baseline refresh fixes — it describes what must never happen, so the check stays red until the behaviour changes.',
    );
  } else if (differing.length === 0) {
    lines.push('Output is unchanged. Nothing to review.');
  } else {
    lines.push(
      'Open a case to read its diff, its config and its full output. If every change is intended, run `pnpm run test:output -- --update` and commit the refreshed baselines — that diff is the record of what you approved, and this check goes green once it matches.',
    );
  }
  return lines.join('\n');
}

// ── The per-case site ────────────────────────────────────────────────────────
//
// One Markdown page per case, plus an index, written to
// `.output-review/site/` and rendered by GitHub Pages' own Jekyll build.
//
// Markdown rather than hand-written HTML, and for one reason: it is the same
// language the job summary and the case dossiers are already written in, so
// all three come out of one renderer instead of a Markdown one and an HTML
// one saying the same things in two dialects. The styling problem goes away
// with it — a theme in `_config.yml` is the whole of it, and diff colouring
// comes free from the ```diff fence rather than from a stylesheet nobody
// wants to own.
//
// The cost is that Jekyll processes Liquid before Markdown, so a stray `{{`
// anywhere in captured CLI output would fail the build for every PR at once.
// Every page body is wrapped in `{% raw %}` for that reason. It is the one
// Jekyll sharp edge this design has to know about.

const RAW_OPEN = '{% raw %}';
const RAW_CLOSE = '{% endraw %}';

/**
 * Jekyll needs a theme to render anything but bare text, and pages need a
 * layout to pick it up. `jekyll-theme-primer` is GitHub's own — so a case
 * page looks like the rest of GitHub without a line of CSS here.
 */
export const SITE_CONFIG = ['theme: jekyll-theme-primer', ''].join('\n');

function frontMatter(title: string): string[] {
  // Quoted and escaped: a case name is safe, but `proves` text is not, and a
  // colon in an unquoted YAML scalar breaks the build.
  return [
    '---',
    'layout: default',
    `title: "${title.replace(/"/g, '\\"')}"`,
    '---',
    '',
  ];
}

/** The config a case actually loaded, inlined so the policy is on the page. */
function configBlock(fixture: FixtureCase, base: string | null): string[] {
  const sources = sourcesOf(fixture);
  if (!sources.config) {
    return [
      '## Config',
      '',
      'None. `src/config/loader.ts` looks for `hermex.config.ts` in the working directory and does not walk up, so this case runs on the built-in schema defaults.',
      '',
    ];
  }

  const absolute = join(ROOT, sources.config);
  const contents = existsSync(absolute) ? readFileSync(absolute, 'utf8') : null;
  return [
    '## Config',
    '',
    // Inlined rather than only linked. "What policy produced this output?"
    // is the question a diff cannot answer, and a reviewer who has to open
    // another tab to answer it mostly does not answer it.
    `${fileLink(sources.config, base)}`,
    '',
    ...(contents
      ? ['```ts', contents.trimEnd(), '```', '']
      : ['_Not readable at report time._', '']),
  ];
}

/** Everything about one case, in the Markdown both the site and summary use. */
function caseBody(result: CaseResult, base: string | null): string[] {
  const lines = [...caseContext(result, base)];
  lines.push(...configBlock(result.fixture, base));

  if (result.diff) {
    lines.push(
      '## Diff against the committed baseline',
      '',
      DIFF_LEGEND,
      '',
      '```diff',
      result.diff,
      '```',
      '',
    );
  }

  lines.push('## Full output', '');
  for (const [file, content] of Object.entries(result.artifacts)) {
    if (file === 'exit-code.txt') continue;
    lines.push(
      `<details><summary><code>${file}</code></summary>`,
      '',
      '```' + fence(file),
      forSummary(content),
      '```',
      '',
      '</details>',
      '',
    );
  }
  return lines;
}

function statusTable(results: CaseResult[], link: boolean): string[] {
  const rows = results.map((result) => {
    const name = link
      ? `[\`${result.fixture.name}\`](./${encodeURIComponent(result.fixture.name)}.html)`
      : `\`${result.fixture.name}\``;
    return `| ${name} | ${emphasizedStatus(result)} | ${result.fixture.proves} |`;
  });
  return ['| Case | Status | Proves |', '| --- | --- | --- |', ...rows, ''];
}

/** Every page of the site, keyed by filename. */
export function buildSite(
  results: CaseResult[],
  breaches: Breach[],
  base: string | null = blobBase(),
): Map<string, string> {
  const pages = new Map<string, string>();
  const differing = results.filter((result) => !isClean(result));

  const index = [
    ...frontMatter('Output review'),
    RAW_OPEN,
    '# Output review',
    '',
    `${results.length} cases · ${differing.length} changed · ${breaches.length} invariant breach(es)`,
    '',
    ...renderBreaches(breaches),
    ...(differing.length > 0
      ? ['## Changed', '', ...statusTable(differing, true)]
      : ['Every case matches its baseline.', '']),
    '## All cases',
    '',
    ...statusTable(results, true),
    RAW_CLOSE,
  ];
  pages.set('index.md', index.join('\n'));

  for (const result of results) {
    const body = [
      ...frontMatter(`${result.fixture.name} — output review`),
      RAW_OPEN,
      '[← all cases](./index.html)',
      '',
      `# \`${result.fixture.name}\``,
      '',
      `**${statusOf(result)}**`,
      '',
      ...caseBody(result, base),
      RAW_CLOSE,
    ];
    pages.set(`${result.fixture.name}.md`, body.join('\n'));
  }

  return pages;
}

/**
 * The published base URL for this run's site, when there is one.
 *
 * Set by the workflow from a repository variable, so hosting is opt-in and
 * reversible: with it, the comment links a page per case; without it, the
 * comment links the job summary and nothing breaks.
 */
function siteUrl(): string | null {
  const base = process.env['OUTPUT_REVIEW_SITE_URL'];
  return base ? base.replace(/\/+$/, '') : null;
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

  // Before the run, not after: the dossiers describe the cases, not the
  // results, so regenerating them first means `--update` leaves a tree the
  // `case-docs-are-current` invariant already agrees with.
  if (update) writeCaseDocs(module.cases);

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

  // Always written, even when nothing will publish them: the site is also
  // how the report is read locally, and generating it unconditionally means
  // a hosting change never needs a code change.
  const site = join(REPORT_DIR, 'site');
  rmSync(site, { recursive: true, force: true });
  mkdirSync(site, { recursive: true });
  for (const [name, markdown] of buildSite(results, breaches)) {
    writeFileSync(join(site, name), markdown);
  }
  // Beside the site rather than inside it: Jekyll only reads `_config.yml`
  // from the root of what it builds, which is the branch root, not this
  // PR's directory. The publish step copies it there.
  writeFileSync(join(REPORT_DIR, 'jekyll-config.yml'), SITE_CONFIG);

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
