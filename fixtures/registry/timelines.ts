/**
 * Offline npm registry data for the release-age fixtures.
 *
 * Release ages are recorded as **days before "now"**, never as absolute
 * dates. A recorded date would make every flagged package drift: a version
 * published on a fixed date crosses `releaseAge.thresholds` at some point
 * and the output silently changes, so a diff that was meant to show a code
 * change shows the calendar instead. Expressed relatively, the same
 * package is overdue by the same number of days forever.
 *
 * `scripts/output-review.ts` materializes these into real registry
 * documents (`time`, `versions`, `dist-tags`) and serves them over
 * localhost, so no case touches the network.
 */

export interface FixtureRelease {
  /** Published this many days before the moment the fixture server starts. */
  daysAgo: number;
  /** Deprecation notice, as npm reports it on a specific version. */
  deprecated?: string;
}

export interface FixtureTimeline {
  /** The version `dist-tags.latest` points at. Must exist in `releases`. */
  latest: string;
  releases: Record<string, FixtureRelease>;
}

/**
 * Keyed by package name. Between them these entries cover every branch of
 * the release-age verdict, against the versions the fixture repos actually
 * have installed (see `fixtures/pnpm-lock.yaml`):
 *
 * - `moment` — overdue with no way out. Every candidate, `latest` included,
 *   is past its threshold, so there is no in-window upgrade target and the
 *   verdict falls back to latest (#26). Also carries a deprecation notice
 *   on the installed version.
 * - `react` — overdue with a real target. The tier is breached by an old
 *   major, but a newer major is still inside the window, so hermex has
 *   something concrete to recommend.
 * - `react-dom` — not overdue yet. A fresh patch exists inside its
 *   threshold, which is the "coming due in N days" advisory, not a
 *   violation.
 * - `legacy-widget` — overdue, and owned by `repos/version-conflict/`
 *   without ever being imported. Its only reason to exist is #171: a
 *   package with no measured usage is still a release-age target once
 *   `enforceOn` is set, so it must have a timeline or the case reports a
 *   registry miss instead of the advisory row it is there to show.
 */
export const RELEASE_TIMELINES: Record<string, FixtureTimeline> = {
  moment: {
    latest: '2.30.1',
    releases: {
      '2.29.4': {
        daysAgo: 1200,
        deprecated: 'Moment is in maintenance mode — prefer date-fns or dayjs',
      },
      '2.30.1': { daysAgo: 500 },
    },
  },
  react: {
    latest: '19.1.0',
    releases: {
      // Only reachable from `repos/version-conflict/`, where a nested copy
      // resolves this far back — the version whose enforcement `scope`
      // decides (#57).
      '17.0.2': { daysAgo: 1500 },
      '18.3.1': { daysAgo: 700 },
      '19.0.0': { daysAgo: 400 },
      '19.1.0': { daysAgo: 10 },
    },
  },
  'react-dom': {
    latest: '18.3.2',
    releases: {
      '18.3.1': { daysAgo: 700 },
      '18.3.2': { daysAgo: 10 },
    },
  },
  // Only reachable from `repos/version-conflict/`, which declares it and
  // never imports it. Shaped like `react` — a breaching major plus a newer
  // one still inside its window — so the row reads as a normal advisory
  // recommendation rather than "no compliant release available" (#26).
  'legacy-widget': {
    latest: '2.1.0',
    releases: {
      '1.0.0': { daysAgo: 900 },
      '2.0.0': { daysAgo: 300 },
      '2.1.0': { daysAgo: 20 },
    },
  },
};
