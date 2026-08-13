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
 * Keyed by package name. Between them the three entries cover every branch
 * of the release-age verdict, against the versions the primary fixture repo
 * actually has installed (see `fixtures/pnpm-lock.yaml`):
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
};
