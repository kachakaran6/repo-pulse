import { describe, it, expect } from 'vitest';
import { db } from '../src/db/index.js';
import { statusOf, DEFAULT_THRESHOLDS } from '../src/core/status.js';
import { computeUnifiedStats } from '../src/core/stats.js';

describe('W2: Private Repos and Multi-Installation Access Proof', () => {
  it('stores and preserves 3 private and 3 public repos with accurate is_private flags', async () => {
    const userId = '999222';
    const now = new Date();

    const mockRepos = [
      { id: '101', name: 'user/private-core', isPrivate: true, org: false, daysAgo: 2 },
      { id: '102', name: 'user/private-agent', isPrivate: true, org: false, daysAgo: 5 },
      { id: '103', name: 'user/private-crm', isPrivate: true, org: false, daysAgo: 10 },
      { id: '104', name: 'user/public-docs', isPrivate: false, org: false, daysAgo: 1 },
      { id: '105', name: 'org-team/public-sdk', isPrivate: false, org: true, daysAgo: 3 },
      { id: '106', name: 'partner/collaborator-tool', isPrivate: false, org: false, daysAgo: 8 },
    ];

    for (const r of mockRepos) {
      await db.upsertRepo({
        user_id: userId,
        github_repo_id: r.id,
        full_name: r.name,
        is_private: r.isPrivate,
        is_fork: false,
        is_archived: false,
        owner_login: r.name.split('/')[0],
        owner_type: r.org ? 'Organization' : 'User',
        relationship: r.name.startsWith('user/') ? 'owner' : (r.org ? 'organization' : 'collaborator'),
        permission: 'admin',
        last_commit_at: new Date(now.getTime() - r.daysAgo * 864e5),
      });
    }

    const fetchedRepos = await db.getUserRepos(userId);
    expect(fetchedRepos).toHaveLength(6);

    const privateRepos = fetchedRepos.filter((r) => r.is_private);
    const publicRepos = fetchedRepos.filter((r) => !r.is_private);

    expect(privateRepos).toHaveLength(3);
    expect(publicRepos).toHaveLength(3);

    // Verify stats calculation includes both private and public repos
    const stats = computeUnifiedStats(fetchedRepos as any, DEFAULT_THRESHOLDS, [], now.getTime());
    expect(stats.totalRepos).toBe(6);
    expect(stats.activeCount).toBe(4); // 2d, 5d, 1d, 3d (all <= 7 days)
    expect(stats.coolingCount).toBe(2); // 10d, 8d (8-14 days)

    // Cleanup
    await db.deleteUserAccount(userId);
  });
});
