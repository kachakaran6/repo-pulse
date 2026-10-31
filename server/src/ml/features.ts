/**
 * Feature extraction per repository at decision time for personalized verdict modeling.
 */

import type { VerdictFeatures, ContributingFeature } from './types.js';

export const FEATURE_NAMES = [
  'days_since_last_commit',
  'twelve_week_trend',
  'age_days',
  'stars',
  'open_issues_prs',
  'hygiene_score',
  'has_finish_line',
  'size_kb',
  'contributors_count',
  'is_user_owner',
  'time_since_last_verdict',
  'lang_typescript',
  'lang_javascript',
  'lang_python',
  'lang_go',
  'lang_rust',
  'lang_java',
  'lang_c_cpp',
  'lang_ruby_php',
  'lang_other',
] as const;

/**
 * Calculates a 12-week commit activity momentum trend (-1.0 to 1.0)
 * Uses ordinary least squares regression over 12 weekly commit sums.
 */
export function calculate12WeekTrend(
  activity: { day: string; commits_mine?: number; commits?: number }[] = [],
  now = Date.now()
): number {
  if (!activity || activity.length === 0) return 0;

  const weeklyCommits = new Array(12).fill(0);
  const oneWeekMs = 7 * 864e5;
  const twelveWeeksAgo = now - 12 * oneWeekMs;

  for (const a of activity) {
    const t = new Date(a.day).getTime();
    if (isNaN(t) || t < twelveWeeksAgo || t > now) continue;
    const weekIdx = Math.min(11, Math.max(0, Math.floor((t - twelveWeeksAgo) / oneWeekMs)));
    const commits = Number(a.commits_mine ?? a.commits ?? 0);
    weeklyCommits[weekIdx] += commits;
  }

  // OLS slope: x in [0..11], mean_x = 5.5, S_xx = 143
  const meanX = 5.5;
  const sXx = 143;
  let sXy = 0;
  for (let i = 0; i < 12; i++) {
    sXy += (i - meanX) * weeklyCommits[i];
  }
  const slope = sXy / sXx;

  // Normalize slope to roughly [-1.0, 1.0] using hyperbolic tangent scaling
  return Math.max(-1, Math.min(1, Math.tanh(slope / 2)));
}

/**
 * Computes composite repository hygiene score (0 to 100)
 */
export function calculateHygieneScore(repo: any, daysSinceLastCommit: number): number {
  let score = 0;
  // Has default branch
  if (repo.default_branch) score += 15;
  // Not a fork
  if (!repo.is_fork) score += 15;
  // Language identified
  if (repo.language) score += 15;
  // Recent activity: commits within last 90 days
  if (daysSinceLastCommit <= 30) score += 30;
  else if (daysSinceLastCommit <= 90) score += 20;
  else if (daysSinceLastCommit <= 180) score += 10;
  // Controlled issues (< 25)
  const openIssues = Number(repo.open_issues ?? repo.open_issues_count ?? 0);
  if (openIssues < 10) score += 15;
  else if (openIssues < 25) score += 10;
  else if (openIssues < 50) score += 5;
  // Finish line or custom goal/note
  if (repo.meta?.goal_date || repo.meta?.note || repo.meta?.label) score += 10;

  return Math.min(100, Math.max(0, score));
}

/**
 * Extracts structured features for a repository at decision time
 */
export function extractVerdictFeatures(repo: any, now = Date.now()): VerdictFeatures {
  // 1. Days since last commit
  let daysSinceLastCommit = 365;
  if (repo.last_commit_at) {
    const t = new Date(repo.last_commit_at).getTime();
    if (!isNaN(t)) {
      daysSinceLastCommit = Math.max(0, Math.floor((now - t) / 864e5));
    }
  }

  // 2. 12-week momentum trend
  const twelveWeekTrend = calculate12WeekTrend(repo.activity || [], now);

  // 3. Age in days
  let ageDays = 180;
  const createdAtTime = repo.created_at_github
    ? new Date(repo.created_at_github).getTime()
    : repo.created_at
    ? new Date(repo.created_at).getTime()
    : null;
  if (createdAtTime && !isNaN(createdAtTime)) {
    ageDays = Math.max(0, Math.floor((now - createdAtTime) / 864e5));
  }

  // 4. Primary language
  const language = repo.language || 'Unknown';

  // 5. Stars
  const stars = Number(repo.stars ?? repo.stargazers_count ?? 0);

  // 6. Open issues & PRs
  const openIssuesPrs = Number(repo.open_issues ?? repo.open_issues_count ?? 0);

  // 7. Hygiene score
  const hygieneScore =
    repo.hygiene_score !== null && repo.hygiene_score !== undefined
      ? Number(repo.hygiene_score)
      : calculateHygieneScore(repo, daysSinceLastCommit);

  // 8. Has finish line (goal date)
  const hasFinishLine = Boolean(repo.meta?.goal_date);

  // 9. Size in KB
  const sizeKb = Number(repo.size_kb ?? repo.size ?? 0);

  // 10. Contributors count
  let contributorsCount = 1;
  if (repo.contributors && Array.isArray(repo.contributors)) {
    contributorsCount = Math.max(1, repo.contributors.length);
  } else if (repo.contributors_count) {
    contributorsCount = Math.max(1, Number(repo.contributors_count));
  }

  // 11. Owner type ('User' | 'Organization')
  const ownerType =
    repo.owner_type === 'Organization' ||
    repo.relationship === 'organization' ||
    repo.is_collaborative
      ? 'Organization'
      : 'User';

  // 12. Time since last verdict change
  let timeSinceLastVerdictChangeDays = ageDays;
  if (repo.meta?.decided_at) {
    const t = new Date(repo.meta.decided_at).getTime();
    if (!isNaN(t)) {
      timeSinceLastVerdictChangeDays = Math.max(0, Math.floor((now - t) / 864e5));
    }
  }

  return {
    days_since_last_commit: daysSinceLastCommit,
    twelve_week_trend: Number(twelveWeekTrend.toFixed(3)),
    age_days: ageDays,
    language,
    stars,
    open_issues_prs: openIssuesPrs,
    hygiene_score: hygieneScore,
    has_finish_line: hasFinishLine,
    size_kb: sizeKb,
    contributors_count: contributorsCount,
    owner_type: ownerType,
    time_since_last_verdict_change_days: timeSinceLastVerdictChangeDays,
  };
}

/**
 * Transforms structured features into a normalized numeric vector for model ingestion
 */
export function vectorizeFeatures(features: VerdictFeatures): number[] {
  const lang = (features.language || '').toLowerCase();

  return [
    // 0: Normalized days quiet (0.0 to 1.0, 365 cap)
    Math.min(1, Math.max(0, features.days_since_last_commit / 365)),
    // 1: 12-week trend (-1.0 to 1.0)
    Math.min(1, Math.max(-1, features.twelve_week_trend)),
    // 2: Age in days (0.0 to 1.0, 5-year cap)
    Math.min(1, Math.max(0, features.age_days / 1825)),
    // 3: Log-scaled stars
    Math.min(1, Math.log1p(Math.max(0, features.stars)) / 10),
    // 4: Log-scaled open issues
    Math.min(1, Math.log1p(Math.max(0, features.open_issues_prs)) / 8),
    // 5: Hygiene score (0.0 to 1.0)
    Math.min(1, Math.max(0, features.hygiene_score / 100)),
    // 6: Has finish line (0.0 or 1.0)
    features.has_finish_line ? 1.0 : 0.0,
    // 7: Log-scaled size in KB
    Math.min(1, Math.log1p(Math.max(0, features.size_kb)) / 15),
    // 8: Contributors count (cap at 20)
    Math.min(1, Math.max(0, features.contributors_count / 20)),
    // 9: Is user owner (1.0 = personal user, 0.0 = org)
    features.owner_type === 'User' ? 1.0 : 0.0,
    // 10: Time since last verdict change
    Math.min(1, Math.max(0, features.time_since_last_verdict_change_days / 365)),

    // Language One-Hot Encodings (11 - 19)
    lang.includes('typescript') || lang.includes('tsx') ? 1.0 : 0.0,
    lang.includes('javascript') || lang.includes('jsx') ? 1.0 : 0.0,
    lang.includes('python') ? 1.0 : 0.0,
    lang.includes('go') ? 1.0 : 0.0,
    lang.includes('rust') ? 1.0 : 0.0,
    lang.includes('java') && !lang.includes('script') ? 1.0 : 0.0,
    lang.includes('c++') || lang.includes('c#') || lang === 'c' ? 1.0 : 0.0,
    lang.includes('ruby') || lang.includes('php') || lang.includes('shell') ? 1.0 : 0.0,
    // Other language
    ![
      'typescript',
      'tsx',
      'javascript',
      'jsx',
      'python',
      'go',
      'rust',
      'java',
      'c++',
      'c#',
      'c',
      'ruby',
      'php',
      'shell',
    ].some((k) => lang.includes(k))
      ? 1.0
      : 0.0,
  ];
}

/**
 * Generates human plain language explanation of top contributing features
 */
export function explainTopContributingFeatures(
  features: VerdictFeatures,
  predictedVerdict: 'keep' | 'pause' | 'retire',
  topFeatureWeights: { name: string; score: number }[]
): { explanation: string; contributingFeatures: ContributingFeature[] } {
  const contributing: ContributingFeature[] = [];

  for (const item of topFeatureWeights.slice(0, 3)) {
    const name = item.name;
    const impact: 'positive' | 'negative' = item.score >= 0 ? 'positive' : 'negative';

    if (name === 'days_since_last_commit') {
      const days = features.days_since_last_commit;
      const desc =
        days <= 7
          ? 'Active commits pushed in past week'
          : days <= 30
          ? `${days} days since last commit`
          : `${days}+ days quiet`;
      contributing.push({
        feature: name,
        label: 'Commit Recency',
        impact: days <= 14 ? 'positive' : 'negative',
        description: desc,
        weight: item.score,
      });
    } else if (name === 'twelve_week_trend') {
      const desc =
        features.twelve_week_trend > 0.2
          ? 'Accelerating 12-week momentum'
          : features.twelve_week_trend < -0.2
          ? 'Declining 12-week velocity'
          : 'Steady commit velocity';
      contributing.push({
        feature: name,
        label: '12-Week Velocity',
        impact: features.twelve_week_trend >= 0 ? 'positive' : 'negative',
        description: desc,
        weight: item.score,
      });
    } else if (name === 'stars') {
      const desc = features.stars === 0 ? 'No GitHub stars' : `${features.stars} GitHub stars`;
      contributing.push({
        feature: name,
        label: 'Community Interest',
        impact: features.stars > 5 ? 'positive' : 'negative',
        description: desc,
        weight: item.score,
      });
    } else if (name === 'hygiene_score') {
      const desc = `Hygiene score ${features.hygiene_score}/100`;
      contributing.push({
        feature: name,
        label: 'Repo Hygiene',
        impact: features.hygiene_score >= 50 ? 'positive' : 'negative',
        description: desc,
        weight: item.score,
      });
    } else if (name === 'has_finish_line') {
      const desc = features.has_finish_line
        ? 'Active finish line milestone set'
        : 'No finish line milestone';
      contributing.push({
        feature: name,
        label: 'Milestone Goal',
        impact: features.has_finish_line ? 'positive' : 'negative',
        description: desc,
        weight: item.score,
      });
    } else if (name === 'contributors_count') {
      const desc =
        features.contributors_count > 1
          ? `${features.contributors_count} project contributors`
          : 'Single contributor repo';
      contributing.push({
        feature: name,
        label: 'Collaboration',
        impact: features.contributors_count > 1 ? 'positive' : 'negative',
        description: desc,
        weight: item.score,
      });
    } else if (name === 'is_user_owner') {
      const desc = features.owner_type === 'User' ? 'Personal repository' : 'Organization repository';
      contributing.push({
        feature: name,
        label: 'Ownership',
        impact: 'positive',
        description: desc,
        weight: item.score,
      });
    } else {
      contributing.push({
        feature: name,
        label: 'Repository Profile',
        impact: 'positive',
        description: `${features.language} codebase with ${features.open_issues_prs} open items`,
        weight: item.score,
      });
    }
  }

  // Format summary sentence: "You usually retire repos like this: 200+ days quiet, no stars, low hygiene"
  const summaryDescriptors = contributing.map((c) => c.description.toLowerCase());
  const explanation =
    summaryDescriptors.length > 0
      ? `You usually ${predictedVerdict} repos like this: ${summaryDescriptors.join(', ')}.`
      : `Predicted ${predictedVerdict} based on your past decision patterns.`;

  return { explanation, contributingFeatures: contributing };
}
