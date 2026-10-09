import { describe, it, expect } from 'vitest';
import { computeUnifiedStats, type RepoWithActivity } from '../src/core/stats.js';
import { DEFAULT_THRESHOLDS } from '../src/core/status.js';

describe('W3: Data Model and Unified Stats Engine Proof', () => {
  const fixedNow = new Date('2026-10-09T12:00:00.000Z').getTime();

  it('computes exact weekly committed repos, wentColdCount, and summary sentence with fixed dates', () => {
    const repos: RepoWithActivity[] = [
      {
        id: '1',
        github_repo_id: '101',
        full_name: 'testuser/active-repo-1',
        is_private: false,
        default_branch: 'main',
        last_commit_at: '2026-10-08T10:00:00.000Z', // 1 day ago (active)
        archived_on_github: false,
        activity: [
          { day: '2026-10-08', commits_mine: 4, commits_all: 4 },
          { day: '2026-10-07', commits_mine: 2, commits_all: 2 },
        ],
      },
      {
        id: '2',
        github_repo_id: '102',
        full_name: 'testuser/active-repo-2',
        is_private: true,
        default_branch: 'main',
        last_commit_at: '2026-10-05T10:00:00.000Z', // 4 days ago (active)
        archived_on_github: false,
        activity: [
          { day: '2026-10-05', commits_mine: 3, commits_all: 3 },
        ],
      },
      {
        id: '3',
        github_repo_id: '103',
        full_name: 'testuser/cooling-repo',
        is_private: false,
        default_branch: 'main',
        last_commit_at: '2026-09-28T10:00:00.000Z', // 11 days ago (cooling)
        archived_on_github: false,
        activity: [
          { day: '2026-09-28', commits_mine: 1, commits_all: 1 },
        ],
      },
      {
        id: '4',
        github_repo_id: '104',
        full_name: 'testuser/dead-repo',
        is_private: true,
        default_branch: 'main',
        last_commit_at: '2026-08-01T10:00:00.000Z', // 69 days ago (dead)
        archived_on_github: false,
        activity: [],
      },
    ];

    // Status changes: repo 3 transitioned to cooling on 2026-10-05
    const statusChanges = [
      {
        repo_id: '3',
        status: 'cooling',
        created_at: '2026-10-05T14:00:00.000Z',
      },
    ];

    const stats = computeUnifiedStats(repos, DEFAULT_THRESHOLDS, statusChanges, fixedNow);

    expect(stats.totalRepos).toBe(4);
    expect(stats.activeCount).toBe(2);
    expect(stats.coolingCount).toBe(1);
    expect(stats.staleCount).toBe(0);
    expect(stats.deadCount).toBe(1);

    // Weekly metrics (last 7 calendar days: 2026-10-02 to 2026-10-09)
    expect(stats.committedReposThisWeek).toBe(2); // repo 1 and repo 2
    expect(stats.weeklyCommits).toBe(9); // 4 + 2 + 3

    // Went cold from status_changes
    expect(stats.wentColdCount).toBe(1);

    // Verified sentence
    expect(stats.summarySentence).toBe('You committed to 2 repos this week. 1 went cold.');
  });

  it('generates "Nothing went cold this week." when wentColdCount is 0', () => {
    const repos: RepoWithActivity[] = [
      {
        id: '1',
        github_repo_id: '101',
        full_name: 'testuser/fresh-repo',
        is_private: false,
        default_branch: 'main',
        last_commit_at: '2026-10-09T08:00:00.000Z',
        archived_on_github: false,
        activity: [{ day: '2026-10-09', commits_mine: 5 }],
      },
    ];

    const stats = computeUnifiedStats(repos, DEFAULT_THRESHOLDS, [], fixedNow);
    expect(stats.committedReposThisWeek).toBe(1);
    expect(stats.wentColdCount).toBe(0);
    expect(stats.summarySentence).toBe('You committed to 1 repo this week. Nothing went cold this week.');
  });
});
