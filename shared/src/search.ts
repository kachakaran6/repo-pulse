/**
 * Shared types and interfaces for Semantic & Hybrid Search
 */

export const REPO_CHUNK_KINDS = [
  'readme',
  'metadata',
  'commits',
  'file_tree',
  'source_code',
  'notes',
  'decisions',
] as const;

export type RepoChunkKind = (typeof REPO_CHUNK_KINDS)[number];

export const SEARCH_SCOPES = ['all', 'repos', 'notes', 'decisions', 'code'] as const;
export type SearchScope = (typeof SEARCH_SCOPES)[number];

export type EmbeddingProviderType = 'local' | 'openai' | 'ollama' | 'custom';

export interface RepoChunk {
  id: string | number;
  repoId: string | number;
  userId: string | number;
  kind: RepoChunkKind;
  path?: string | null;
  text: string;
  tokenCount: number;
  embedding?: number[];
  commitSha: string | null;
  modelName: string;
  modelVersion: string;
  createdAt?: string;
}

export interface SearchResult {
  id: string;
  repoId: string | number;
  repoFullName: string;
  repoLanguage: string | null;
  repoStatus: string;
  repoDecision: string | null;
  kind: RepoChunkKind;
  path: string | null;
  snippet: string;
  matchReason: string;
  score: number;
  textScore?: number;
  vectorScore?: number;
}

export interface GroupedSearchResult {
  repo: {
    id: string | number;
    full_name: string;
    language: string | null;
    status: string;
    decision: string | null;
  };
  maxScore: number;
  matches: SearchResult[];
}

export interface SearchIndexStatus {
  totalRepos: number;
  indexedRepos: number;
  totalChunks: number;
  totalTokens: number;
  lastIndexedAt: string | null;
  status: 'idle' | 'indexing' | 'completed' | 'error';
  coveragePercentage: number;
  estimatedCostUsd: number;
  provider: EmbeddingProviderType;
  model: string;
  indexPrivateRepos: boolean;
  isIndexing: boolean;
  error?: string | null;
}

export interface SearchSettings {
  index_private_repos: boolean;
  embedding_provider: EmbeddingProviderType;
  embedding_api_key?: string | null;
  embedding_model: string;
  embedding_endpoint?: string | null;
}

export interface OutboundPreviewSample {
  repoName: string;
  isPrivate: boolean;
  kind: RepoChunkKind;
  path?: string | null;
  previewText: string;
  tokenCount: number;
}

export interface OutboundPreview {
  totalSampleChunks: number;
  sampleTexts: OutboundPreviewSample[];
  totalEstimatedTokens: number;
  targetProvider: string;
  targetModel: string;
  hasPrivateReposIncluded: boolean;
}

export interface SimilarRepo {
  repoId: string | number;
  fullName: string;
  language: string | null;
  status: string;
  similarity: number; // 0 to 1
  sharedSignals: string[];
}
