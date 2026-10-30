import { describe, expect, it } from 'vitest';
import {
  countActiveKeepRepos,
  getActiveKeepRepos,
  wouldExceedWipLimit,
  isLimitLoweredBelowCount,
  type WipEligibleRepo,
} from '@shared';

describe('Work in progress limit logic', () => {
  const sampleRepos: WipEligibleRepo[] = [
    { id: 1, full_name: 'org/repo-1', meta: { decision: 'keep' } },
    { id: 2, full_name: 'org/repo-2', meta: { decision: 'keep' } },
    { id: 3, full_name: 'org/repo-3', meta: { decision: 'keep' } },
    { id: 4, full_name: 'org/repo-4', meta: { decision: 'keep' } },
    { id: 5, full_name: 'org/repo-5', meta: { decision: 'keep' } },
    { id: 6, full_name: 'org/repo-6', meta: { decision: 'pause' } },
    { id: 7, full_name: 'org/repo-7', meta: { decision: 'retire' } },
    { id: 8, full_name: 'org/repo-8', meta: null },
  ];

  it('counts active keep repos and excludes paused, retired, or undecided', () => {
    const count = countActiveKeepRepos(sampleRepos);
    expect(count).toBe(5);

    const activeKeeps = getActiveKeepRepos(sampleRepos);
    expect(activeKeeps.length).toBe(5);
    expect(activeKeeps.map((r) => r.id)).toEqual([1, 2, 3, 4, 5]);
  });

  it('strictly excludes archived repositories from the active count', () => {
    const reposWithArchived: WipEligibleRepo[] = [
      ...sampleRepos,
      { id: 9, full_name: 'org/archived-1', is_archived: true, meta: { decision: 'keep' } },
      { id: 10, full_name: 'org/archived-2', archived_on_github: true, meta: { decision: 'keep' } },
    ];

    const count = countActiveKeepRepos(reposWithArchived);
    // Still 5, because repos 9 and 10 are archived!
    expect(count).toBe(5);

    const activeKeeps = getActiveKeepRepos(reposWithArchived);
    expect(activeKeeps.some((r) => r.id === 9 || r.id === 10)).toBe(false);
  });

  it('detects when adding another repo would exceed the WIP limit', () => {
    const limit = 5;
    const currentCount = countActiveKeepRepos(sampleRepos); // 5

    // Adding repo-6 (which is currently paused) to keep would exceed 5
    expect(wouldExceedWipLimit(currentCount, false, limit)).toBe(true);

    // If repo is already keep, re-saving it does NOT exceed limit
    expect(wouldExceedWipLimit(currentCount, true, limit)).toBe(false);

    // When under limit (e.g. limit is 7)
    expect(wouldExceedWipLimit(currentCount, false, 7)).toBe(false);

    // When limit is turned off (null or 0)
    expect(wouldExceedWipLimit(currentCount, false, null)).toBe(false);
    expect(wouldExceedWipLimit(currentCount, false, 0)).toBe(false);
  });

  it('detects edge case where limit is lowered below current count', () => {
    const currentCount = 6;
    const loweredLimit = 4;

    // Should indicate limit is lowered below current count (triggering gentle banner)
    expect(isLimitLoweredBelowCount(currentCount, loweredLimit)).toBe(true);

    // When within or at limit
    expect(isLimitLoweredBelowCount(4, 4)).toBe(false);
    expect(isLimitLoweredBelowCount(3, 4)).toBe(false);

    // When limit is off
    expect(isLimitLoweredBelowCount(currentCount, null)).toBe(false);
  });
});

describe('Bulk operations and WIP limit handling', () => {
  it('gracefully calculates override flags when batch keep exceeds the limit', () => {
    const currentRepos: WipEligibleRepo[] = [
      { id: 1, full_name: 'repo-1', meta: { decision: 'keep' } },
      { id: 2, full_name: 'repo-2', meta: { decision: 'keep' } },
      { id: 3, full_name: 'repo-3', meta: { decision: 'keep' } },
      { id: 4, full_name: 'repo-4', meta: { decision: 'pause' } },
      { id: 5, full_name: 'repo-5', meta: { decision: 'pause' } },
      { id: 6, full_name: 'repo-6', meta: { decision: 'pause' } },
    ];
    const wipLimit = 4;
    const selectedIds = [4, 5, 6];

    let currentActiveCount = countActiveKeepRepos(currentRepos); // 3
    const results: { id: number; decision: string; wip_override: boolean }[] = [];

    // Simulate bulk keep processing without interrupting the user for each repo
    for (const id of selectedIds) {
      const willExceed = wouldExceedWipLimit(currentActiveCount, false, wipLimit);
      results.push({
        id,
        decision: 'keep',
        wip_override: willExceed,
      });
      currentActiveCount++;
    }

    // 1st repo (id: 4) brings count to 4 (limit: 4) -> no override needed
    expect(results[0]).toEqual({ id: 4, decision: 'keep', wip_override: false });
    // 2nd repo (id: 5) brings count to 5 -> exceeds limit, records override
    expect(results[1]).toEqual({ id: 5, decision: 'keep', wip_override: true });
    // 3rd repo (id: 6) brings count to 6 -> exceeds limit, records override
    expect(results[2]).toEqual({ id: 6, decision: 'keep', wip_override: true });
    expect(currentActiveCount).toBe(6);
  });
});

describe('Undo restoring previous state and updating WIP count', () => {
  interface UndoEntry {
    repoId: number;
    previousDecision: 'keep' | 'pause' | 'retire' | null;
  }

  it('restores previous decision and accurately recalculates active keep count upon undo', () => {
    let repos: WipEligibleRepo[] = [
      { id: 1, full_name: 'repo-1', meta: { decision: 'keep' } },
      { id: 2, full_name: 'repo-2', meta: { decision: 'keep' } },
      { id: 3, full_name: 'repo-3', meta: { decision: 'pause' } },
    ];

    expect(countActiveKeepRepos(repos)).toBe(2);

    const undoStack: UndoEntry[] = [];

    // Action 1: User keeps repo 3
    undoStack.push({ repoId: 3, previousDecision: repos[2].meta?.decision as any });
    repos = repos.map((r) =>
      r.id === 3 ? { ...r, meta: { decision: 'keep' } } : r
    );

    expect(countActiveKeepRepos(repos)).toBe(3);

    // Action 2: Undo action 1
    const lastAction = undoStack.pop()!;
    repos = repos.map((r) =>
      r.id === lastAction.repoId ? { ...r, meta: { decision: lastAction.previousDecision } } : r
    );

    // State is restored!
    expect(countActiveKeepRepos(repos)).toBe(2);
    expect(repos.find((r) => r.id === 3)?.meta?.decision).toBe('pause');
  });

  it('restores both swapped repositories when undoing "Pause this instead"', () => {
    let repos: WipEligibleRepo[] = [
      { id: 1, full_name: 'repo-1', meta: { decision: 'keep' } },
      { id: 2, full_name: 'repo-2', meta: { decision: 'keep' } },
      { id: 3, full_name: 'repo-3', meta: { decision: 'pause' } },
    ];

    const undoStack: UndoEntry[] = [];

    // Swap: Pause repo 1, Keep repo 3
    undoStack.push({ repoId: 1, previousDecision: repos[0].meta?.decision as any });
    undoStack.push({ repoId: 3, previousDecision: repos[2].meta?.decision as any });

    repos = repos.map((r) => {
      if (r.id === 1) return { ...r, meta: { decision: 'pause' } };
      if (r.id === 3) return { ...r, meta: { decision: 'keep' } };
      return r;
    });

    expect(repos.find((r) => r.id === 1)?.meta?.decision).toBe('pause');
    expect(repos.find((r) => r.id === 3)?.meta?.decision).toBe('keep');
    expect(countActiveKeepRepos(repos)).toBe(2);

    // Undo action
    while (undoStack.length > 0) {
      const act = undoStack.pop()!;
      repos = repos.map((r) =>
        r.id === act.repoId ? { ...r, meta: { decision: act.previousDecision } } : r
      );
    }

    // Both repos restored to original state
    expect(repos.find((r) => r.id === 1)?.meta?.decision).toBe('keep');
    expect(repos.find((r) => r.id === 3)?.meta?.decision).toBe('pause');
    expect(countActiveKeepRepos(repos)).toBe(2);
  });
});
