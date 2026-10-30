/**
 * Reciprocal Rank Fusion (RRF) and Similarity Functions for Hybrid Search
 */

export interface RankedItem<T> {
  item: T;
  score: number;
}

export interface FusionResult<T> {
  item: T;
  rrfScore: number;
  rankInList: (number | null)[];
}

/**
 * Compute Cosine Similarity between two numerical vectors
 */
export function cosineSimilarity(a?: number[] | null, b?: number[] | null): number {
  if (!a || !b || a.length !== b.length || a.length === 0) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * Reciprocal Rank Fusion (RRF)
 *
 * Combines ranked lists from diverse retrieval strategies (e.g., Full-Text Search and Vector Semantic Search).
 * Formula: RRF_score(d) = SUM_m [ weight_m / (k + rank_m(d)) ]
 * where rank_m(d) is 1-indexed.
 *
 * @param rankedLists Array of ranked items with optional list weight (default: 1.0)
 * @param k Constant smoothing parameter (standard default is 60)
 */
export function reciprocalRankFusion<T extends { id: string | number }>(
  rankedLists: Array<{ items: T[]; weight?: number }>,
  k = 60
): FusionResult<T>[] {
  const itemMap = new Map<string, T>();
  const scoreMap = new Map<string, number>();
  const rankPositionsMap = new Map<string, (number | null)[]>();

  const numLists = rankedLists.length;

  for (let listIdx = 0; listIdx < numLists; listIdx++) {
    const { items, weight = 1.0 } = rankedLists[listIdx];

    for (let rank0 = 0; rank0 < items.length; rank0++) {
      const item = items[rank0];
      const idStr = String(item.id);
      const rank1 = rank0 + 1; // 1-indexed rank

      if (!itemMap.has(idStr)) {
        itemMap.set(idStr, item);
        rankPositionsMap.set(idStr, new Array(numLists).fill(null));
      }

      const currentScore = scoreMap.get(idStr) || 0;
      const rrfIncrement = weight / (k + rank1);
      scoreMap.set(idStr, currentScore + rrfIncrement);

      const ranks = rankPositionsMap.get(idStr)!;
      ranks[listIdx] = rank1;
    }
  }

  const results: FusionResult<T>[] = [];
  for (const [idStr, item] of itemMap.entries()) {
    results.push({
      item,
      rrfScore: scoreMap.get(idStr) || 0,
      rankInList: rankPositionsMap.get(idStr) || [],
    });
  }

  // Sort descending by RRF score
  results.sort((a, b) => b.rrfScore - a.rrfScore);

  return results;
}

/**
 * Generate human-readable match reason for a search result
 */
export function generateMatchReason(
  kind: string,
  path: string | null | undefined,
  text: string,
  query: string,
  isExactTextMatch: boolean,
  vectorSimilarity?: number
): string {
  const qLower = query.toLowerCase().trim();
  const tLower = text.toLowerCase();

  // 1. Semantic match for code without exact text match
  if (kind === 'source_code' && !isExactTextMatch && vectorSimilarity) {
    const fileLabel = path ? ` (${path})` : '';
    const scoreStr = ` (similarity: ${(vectorSimilarity * 100).toFixed(0)}%)`;
    return `Semantic code match${fileLabel}${scoreStr}`;
  }

  // 2. Path-specific exact matching
  if (path && path.toLowerCase().includes(qLower)) {
    return `Matched file name and path: ${path}`;
  }

  // 2. Kind-specific explanations
  if (kind === 'readme') {
    // Check if heading was matched
    const headingMatch = text.match(/\[Repo: [^|]+ \| README > ([^\]]+)\]/);
    if (headingMatch && headingMatch[1]) {
      return `Matched README section: "${headingMatch[1]}"`;
    }
    return isExactTextMatch ? 'Matched README content' : 'Semantic similarity in README';
  }

  if (kind === 'source_code') {
    const fileLabel = path ? ` (${path})` : '';
    if (isExactTextMatch) {
      return `Keyword match in source code${fileLabel}`;
    }
    const scoreStr = vectorSimilarity ? ` (similarity: ${(vectorSimilarity * 100).toFixed(0)}%)` : '';
    return `Semantic code match${fileLabel}${scoreStr}`;
  }

  if (kind === 'commits') {
    return 'Matched recent commit message';
  }

  if (kind === 'file_tree') {
    return 'Matched repository file tree and architecture';
  }

  if (kind === 'notes') {
    return 'Matched personal notes';
  }

  if (kind === 'decisions') {
    return 'Matched triage decision rationale';
  }

  if (kind === 'metadata') {
    if (tLower.includes('description:') && tLower.includes(qLower)) {
      return 'Matched repository description';
    }
    if (tLower.includes('topics:') && tLower.includes(qLower)) {
      return 'Matched repository topic';
    }
    return 'Matched repository metadata';
  }

  return isExactTextMatch ? 'Text match' : 'Semantic match';
}

/**
 * Extract an informative snippet around the best matching context
 */
export function extractSnippet(text: string, query: string, maxLen = 180): string {
  // Strip chunk header prefix like [Repo: ... | ...]
  const clean = text.replace(/^\[Repo: [^\]]+\]\s*/, '').trim();
  if (clean.length <= maxLen) return clean;

  const queryTerms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
  let bestIndex = -1;

  for (const term of queryTerms) {
    const idx = clean.toLowerCase().indexOf(term);
    if (idx !== -1 && (bestIndex === -1 || idx < bestIndex)) {
      bestIndex = idx;
    }
  }

  if (bestIndex === -1) {
    return `${clean.slice(0, maxLen).trim()}...`;
  }

  const start = Math.max(0, bestIndex - Math.floor(maxLen / 3));
  const end = Math.min(clean.length, start + maxLen);

  const prefix = start > 0 ? '...' : '';
  const suffix = end < clean.length ? '...' : '';

  return `${prefix}${clean.slice(start, end).trim()}${suffix}`;
}
