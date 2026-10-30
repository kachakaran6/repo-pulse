/**
 * Hybrid Search Engine
 *
 * Combines full-text ranking and vector semantic similarity with Reciprocal Rank Fusion (RRF).
 * Also computes nearest-neighbor repository similarity for duplicate detection.
 */

import { db } from '../db/index.js';
import { getEmbeddingProvider } from './embeddings.js';
import {
  cosineSimilarity,
  reciprocalRankFusion,
  generateMatchReason,
  extractSnippet,
} from './fusion.js';
import { statusOf, DEFAULT_THRESHOLDS } from '../core/status.js';
import type {
  SearchScope,
  SearchResult,
  GroupedSearchResult,
  SimilarRepo,
  RepoChunkKind,
} from './types.js';

/**
 * Filter allowed chunk kinds based on query scope
 */
function getKindsForScope(scope: SearchScope): Set<RepoChunkKind> {
  switch (scope) {
    case 'repos':
      return new Set(['readme', 'metadata', 'commits', 'file_tree']);
    case 'code':
      return new Set(['source_code']);
    case 'notes':
      return new Set(['notes']);
    case 'decisions':
      return new Set(['decisions']);
    case 'all':
    default:
      return new Set([
        'readme',
        'metadata',
        'commits',
        'file_tree',
        'source_code',
        'notes',
        'decisions',
      ]);
  }
}

/**
 * Score text relevance for full-text search list
 */
function computeTextRelevance(text: string, query: string, path?: string | null): number {
  const qTerms = query.toLowerCase().trim().split(/\s+/).filter((t) => t.length > 0);
  if (qTerms.length === 0) return 0;

  const tLower = text.toLowerCase();
  const pLower = (path || '').toLowerCase();

  let score = 0;

  // Exact phrase match bonus
  if (tLower.includes(query.toLowerCase().trim())) {
    score += 10;
  }

  // Path match bonus
  if (pLower && pLower.includes(query.toLowerCase().trim())) {
    score += 8;
  }

  for (const term of qTerms) {
    if (term.length <= 1) continue;

    // Word boundary match
    const wordRegex = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    const matches = tLower.match(wordRegex);
    if (matches) {
      score += Math.min(matches.length * 2, 8);
    } else if (tLower.includes(term)) {
      score += 1;
    }

    if (pLower.includes(term)) {
      score += 3;
    }
  }

  return score;
}

/**
 * Execute Hybrid Search combining Full-Text and Vector Similarity
 */
export async function performHybridSearch(
  userId: string | number,
  query: string,
  scope: SearchScope = 'all',
  options: { limit?: number } = {}
): Promise<{
  query: string;
  scope: SearchScope;
  totalMatches: number;
  results: SearchResult[];
  groupedByRepo: GroupedSearchResult[];
}> {
  const limit = options.limit || 30;
  const qTrimmed = (query || '').trim();

  if (!qTrimmed) {
    return {
      query: '',
      scope,
      totalMatches: 0,
      results: [],
      groupedByRepo: [],
    };
  }

  // 1. Fetch user repos for repository context
  const userRepos = await db.getUserRepos(userId);
  const repoMap = new Map<string, any>();
  for (const r of userRepos) {
    repoMap.set(String(r.id), r);
  }

  // 2. Fetch search settings and chunks
  const settings = await db.getSearchSettings(userId);
  const allChunks = await db.getRepoChunks(userId);
  const allowedKinds = getKindsForScope(scope);

  const eligibleChunks = allChunks.filter((c) => {
    // Scope filter
    if (!allowedKinds.has(c.kind as RepoChunkKind)) return false;

    // Privacy filter: exclude private repos unless explicitly opted in
    const repo = repoMap.get(String(c.repo_id));
    if (!repo) return false;
    if (repo.is_private && !settings.index_private_repos) return false;

    return true;
  });

  if (eligibleChunks.length === 0) {
    return {
      query: qTrimmed,
      scope,
      totalMatches: 0,
      results: [],
      groupedByRepo: [],
    };
  }

  // 3. Full-Text Search Candidate Ranking
  const textScored: Array<{ chunk: any; score: number }> = [];
  for (const chunk of eligibleChunks) {
    const textScore = computeTextRelevance(chunk.text, qTrimmed, chunk.path);
    if (textScore > 0) {
      textScored.push({ chunk, score: textScore });
    }
  }
  textScored.sort((a, b) => b.score - a.score);

  // 4. Vector Semantic Search Candidate Ranking
  const embeddingProvider = getEmbeddingProvider(settings);
  const queryVector = await embeddingProvider.embedQuery(qTrimmed);

  const vectorScored: Array<{ chunk: any; similarity: number }> = [];
  for (const chunk of eligibleChunks) {
    if (chunk.embedding && Array.isArray(chunk.embedding)) {
      const sim = cosineSimilarity(queryVector, chunk.embedding);
      if (sim > 0.05) {
        vectorScored.push({ chunk, similarity: sim });
      }
    }
  }
  vectorScored.sort((a, b) => b.similarity - a.similarity);

  // 5. Reciprocal Rank Fusion (RRF)
  const fusionInput = [
    { items: textScored.map((x) => ({ id: x.chunk.id, chunk: x.chunk, score: x.score })), weight: 1.0 },
    { items: vectorScored.map((x) => ({ id: x.chunk.id, chunk: x.chunk, score: x.similarity })), weight: 1.2 },
  ];

  const fused = reciprocalRankFusion(fusionInput, 60);

  // Map scores for quick lookup
  const textScoreMap = new Map(textScored.map((x) => [String(x.chunk.id), x.score]));
  const vectorScoreMap = new Map(vectorScored.map((x) => [String(x.chunk.id), x.similarity]));

  // 6. Build enriched SearchResult items
  const results: SearchResult[] = [];
  for (const item of fused.slice(0, limit)) {
    const chunk = (item.item as any).chunk;
    const repo = repoMap.get(String(chunk.repo_id));
    if (!repo) continue;

    const tScore = textScoreMap.get(String(chunk.id));
    const vScore = vectorScoreMap.get(String(chunk.id));
    const isExact = (tScore || 0) > 0;

    const matchReason = generateMatchReason(
      chunk.kind,
      chunk.path,
      chunk.text,
      qTrimmed,
      isExact,
      vScore
    );

    const snippet = extractSnippet(chunk.text, qTrimmed);

    results.push({
      id: String(chunk.id),
      repoId: repo.id,
      repoFullName: repo.full_name,
      repoLanguage: repo.language || null,
      repoStatus: repo.status || 'active',
      repoDecision: repo.meta?.decision || null,
      kind: chunk.kind as RepoChunkKind,
      path: chunk.path || null,
      snippet,
      matchReason,
      score: Number(item.rrfScore.toFixed(5)),
      textScore: tScore,
      vectorScore: vScore ? Number(vScore.toFixed(3)) : undefined,
    });
  }

  // 7. Group by repository
  const groupedMap = new Map<string, GroupedSearchResult>();
  for (const r of results) {
    const rId = String(r.repoId);
    if (!groupedMap.has(rId)) {
      groupedMap.set(rId, {
        repo: {
          id: r.repoId,
          full_name: r.repoFullName,
          language: r.repoLanguage,
          status: r.repoStatus,
          decision: r.repoDecision,
        },
        maxScore: r.score,
        matches: [],
      });
    }

    const group = groupedMap.get(rId)!;
    group.matches.push(r);
    if (r.score > group.maxScore) {
      group.maxScore = r.score;
    }
  }

  const groupedByRepo = Array.from(groupedMap.values()).sort(
    (a, b) => b.maxScore - a.maxScore
  );

  return {
    query: qTrimmed,
    scope,
    totalMatches: results.length,
    results,
    groupedByRepo,
  };
}

/**
 * Compute the average centroid vector for a repository's chunks
 */
function computeRepoCentroid(chunks: any[]): number[] | null {
  const validVectors: number[][] = [];
  for (const c of chunks) {
    if (c.embedding && Array.isArray(c.embedding) && c.embedding.length > 0) {
      validVectors.push(c.embedding);
    }
  }

  if (validVectors.length === 0) return null;

  const dims = validVectors[0].length;
  const centroid = new Float64Array(dims);

  for (const vec of validVectors) {
    for (let i = 0; i < dims; i++) {
      centroid[i] += vec[i];
    }
  }

  // L2 Normalization
  let sumSq = 0;
  for (let i = 0; i < dims; i++) {
    centroid[i] /= validVectors.length;
    sumSq += centroid[i] * centroid[i];
  }

  const norm = Math.sqrt(sumSq);
  if (norm > 0) {
    for (let i = 0; i < dims; i++) {
      centroid[i] /= norm;
    }
  }

  return Array.from(centroid);
}

/**
 * Find nearest neighbor similar repositories for duplicate detection
 */
export async function findSimilarRepos(
  userId: string | number,
  targetRepoId: string | number,
  limit = 5
): Promise<SimilarRepo[]> {
  const targetIdStr = String(targetRepoId);
  const userRepos = await db.getUserRepos(userId);
  const targetRepo = userRepos.find((r) => String(r.id) === targetIdStr);
  if (!targetRepo) return [];

  const allChunks = await db.getRepoChunks(userId);
  const targetChunks = allChunks.filter((c) => String(c.repo_id) === targetIdStr);
  const targetVector = computeRepoCentroid(targetChunks);

  if (!targetVector) {
    return [];
  }

  // Group other chunks by repo
  const chunksByRepo = new Map<string, any[]>();
  for (const c of allChunks) {
    const rId = String(c.repo_id);
    if (rId === targetIdStr) continue;

    if (!chunksByRepo.has(rId)) {
      chunksByRepo.set(rId, []);
    }
    chunksByRepo.get(rId)!.push(c);
  }

  const similarList: SimilarRepo[] = [];

  for (const otherRepo of userRepos) {
    const oId = String(otherRepo.id);
    if (oId === targetIdStr) continue;

    const otherChunks = chunksByRepo.get(oId) || [];
    const otherVector = computeRepoCentroid(otherChunks);
    if (!otherVector) continue;

    const similarity = cosineSimilarity(targetVector, otherVector);
    if (similarity > 0.25) {
      const sharedSignals: string[] = [];

      if (targetRepo.language && otherRepo.language && targetRepo.language === otherRepo.language) {
        sharedSignals.push(`Both written in ${targetRepo.language}`);
      }

      if (similarity >= 0.85) {
        sharedSignals.push('High content overlap (potential duplicate)');
      } else if (similarity >= 0.6) {
        sharedSignals.push('Similar architectural scope or domain');
      }

      if (targetRepo.meta?.label && otherRepo.meta?.label && targetRepo.meta.label === otherRepo.meta.label) {
        sharedSignals.push(`Shared label: "${targetRepo.meta.label}"`);
      }

      if (sharedSignals.length === 0) {
        sharedSignals.push('Shared keyword and semantic profile');
      }

      similarList.push({
        repoId: otherRepo.id,
        fullName: otherRepo.full_name,
        language: otherRepo.language || null,
        status: (otherRepo as any).status || statusOf(otherRepo.last_commit_at, Date.now(), DEFAULT_THRESHOLDS),
        similarity: Number(similarity.toFixed(3)),
        sharedSignals,
      });
    }
  }

  similarList.sort((a, b) => b.similarity - a.similarity);
  return similarList.slice(0, limit);
}
