export interface WipEligibleRepo {
  id?: string | number;
  full_name?: string;
  is_archived?: boolean;
  archived_on_github?: boolean;
  meta?: {
    decision?: string | null;
    wip_override?: boolean;
    override?: boolean;
  } | null;
  decision?: string | null;
}

/**
 * Filter out archived repositories and check if a repo has an active "keep" verdict.
 * Archived repositories are strictly excluded per design specification.
 */
export function isRepoActiveKeep(repo: WipEligibleRepo): boolean {
  if (repo.is_archived || repo.archived_on_github) {
    return false;
  }
  const decision = repo.meta?.decision !== undefined ? repo.meta.decision : repo.decision;
  return decision === 'keep';
}

/**
 * Counts repositories currently kept active, excluding archived repositories.
 */
export function countActiveKeepRepos<T extends WipEligibleRepo>(repos: T[]): number {
  let count = 0;
  for (const repo of repos) {
    if (isRepoActiveKeep(repo)) {
      count++;
    }
  }
  return count;
}

/**
 * Returns all active "keep" repositories, excluding archived repositories.
 */
export function getActiveKeepRepos<T extends WipEligibleRepo>(repos: T[]): T[] {
  return repos.filter(isRepoActiveKeep);
}

/**
 * Evaluates whether adding another repo to "keep" would exceed the WIP limit.
 * If wipLimit is null, undefined, or <= 0 (off), it will never exceed.
 */
export function wouldExceedWipLimit(
  currentKeepCount: number,
  repoBeingKeptIsAlreadyKeep: boolean,
  wipLimit: number | null | undefined,
): boolean {
  if (wipLimit == null || wipLimit <= 0) {
    return false;
  }
  if (repoBeingKeptIsAlreadyKeep) {
    return false;
  }
  return currentKeepCount + 1 > wipLimit;
}

/**
 * Checks if the limit has been lowered below the current count of active projects.
 * Returns true if user has more active projects than their limit.
 */
export function isLimitLoweredBelowCount(
  currentKeepCount: number,
  wipLimit: number | null | undefined,
): boolean {
  if (wipLimit == null || wipLimit <= 0) {
    return false;
  }
  return currentKeepCount > wipLimit;
}
