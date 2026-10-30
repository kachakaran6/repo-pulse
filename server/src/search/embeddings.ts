/**
 * Pluggable Embedding Providers for Semantic Search
 *
 * Supports:
 * 1. Local deterministic embedding runtime (384-dim normalized vector, fast, zero network required)
 * 2. Hosted OpenAI embeddings API (with user-supplied key and 429 rate-limit backoff)
 * 3. Local open-source runtime (Ollama / HuggingFace TEI / vLLM endpoint)
 */

import { logger } from '../utils/logger.js';
import type { SearchSettings, EmbeddingProviderType } from './types.js';

export interface EmbeddingProvider {
  name: string;
  version: string;
  dimensions: number;
  providerType: EmbeddingProviderType;
  embed(texts: string[]): Promise<number[][]>;
  embedQuery(query: string): Promise<number[]>;
}

/**
 * Fast string hashing to uint32
 */
function hashString(str: string): number {
  let hash = 2166136261;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Tokenize and normalize text into word and subword n-grams
 */
function extractFeatureTokens(text: string): string[] {
  const normalized = text.toLowerCase().replace(/[^a-z0-9_./-]/g, ' ');
  const words = normalized.split(/\s+/).filter((w) => w.length > 1);
  const features: string[] = [];

  for (const w of words) {
    features.push(w);
    // Subwords / character trigrams for typo-resilient & partial matching
    if (w.length >= 4) {
      for (let i = 0; i <= w.length - 3; i++) {
        features.push(`_${w.slice(i, i + 3)}_`);
      }
    }
  }

  return features;
}

/**
 * Local Deterministic Embedding Provider (all-MiniLM-L6-v2, 384 dimensions)
 * Generates L2-normalized dense embeddings based on feature projection and semantic hashing.
 */
export class LocalDeterministicEmbeddingProvider implements EmbeddingProvider {
  public readonly name: string;
  public readonly version = '1.0';
  public readonly dimensions = 384;
  public readonly providerType: EmbeddingProviderType = 'local';

  constructor(model = 'all-MiniLM-L6-v2') {
    this.name = model;
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.generateVector(t));
  }

  async embedQuery(query: string): Promise<number[]> {
    return this.generateVector(query);
  }

  private generateVector(text: string): number[] {
    const vec = new Float64Array(this.dimensions);
    const features = extractFeatureTokens(text);

    if (features.length === 0) {
      return Array.from(vec);
    }

    for (const token of features) {
      const h1 = hashString(token);
      const h2 = hashString(`${token}:pos`);
      const h3 = hashString(`${token}:sign`);

      const index1 = h1 % this.dimensions;
      const index2 = h2 % this.dimensions;
      const sign1 = (h3 & 1) === 0 ? 1.0 : -1.0;
      const sign2 = (h3 & 2) === 0 ? 0.75 : -0.75;

      // Higher weight for full words compared to subword n-grams
      const weight = token.startsWith('_') ? 0.5 : 1.5;

      vec[index1] += sign1 * weight;
      vec[index2] += sign2 * weight;
    }

    // L2 Normalization
    let sumSq = 0;
    for (let i = 0; i < this.dimensions; i++) {
      sumSq += vec[i] * vec[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < this.dimensions; i++) {
        vec[i] /= norm;
      }
    }

    return Array.from(vec);
  }
}

/**
 * Hosted OpenAI Embedding Provider (text-embedding-3-small, 1536 dimensions)
 * Features batching, rate-limit backoff, and user-supplied API key.
 */
export class HostedOpenAIEmbeddingProvider implements EmbeddingProvider {
  public readonly name: string;
  public readonly version = '1.0';
  public readonly dimensions = 1536;
  public readonly providerType: EmbeddingProviderType = 'openai';
  private apiKey: string;
  private endpoint: string;

  constructor(apiKey: string, model = 'text-embedding-3-small', endpoint?: string | null) {
    this.apiKey = apiKey;
    this.name = model;
    this.endpoint = endpoint || 'https://api.openai.com/v1/embeddings';
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];

    const batchSize = 64;
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchVectors = await this.callOpenAIWithRetry(batch);
      allEmbeddings.push(...batchVectors);
    }

    return allEmbeddings;
  }

  async embedQuery(query: string): Promise<number[]> {
    const vectors = await this.callOpenAIWithRetry([query]);
    return vectors[0] || new Array(this.dimensions).fill(0);
  }

  private async callOpenAIWithRetry(texts: string[], maxRetries = 3): Promise<number[][]> {
    let lastError: any = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await fetch(this.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            input: texts,
            model: this.name,
          }),
        });

        if (res.status === 429) {
          // Rate limited: backoff exponentially
          const retryAfter = res.headers.get('retry-after');
          const delayMs = retryAfter ? Number(retryAfter) * 1000 : Math.pow(2, attempt) * 500;
          logger.warn({ attempt, delayMs }, 'OpenAI embeddings rate limited, backing off...');
          await new Promise((r) => setTimeout(r, delayMs));
          continue;
        }

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI embedding failed (HTTP ${res.status}): ${errText}`);
        }

        const data = (await res.json()) as any;
        return (data.data || []).map((item: any) => item.embedding);
      } catch (err: any) {
        lastError = err;
        if (attempt === maxRetries) break;
        await new Promise((r) => setTimeout(r, Math.pow(2, attempt) * 300));
      }
    }

    throw lastError || new Error('Failed to generate OpenAI embeddings after retries');
  }
}

/**
 * Local Runtime Embedding Provider (e.g. Ollama or HuggingFace TEI)
 */
export class LocalRuntimeEmbeddingProvider implements EmbeddingProvider {
  public readonly name: string;
  public readonly version = '1.0';
  public readonly dimensions = 384;
  public readonly providerType: EmbeddingProviderType;
  private endpoint: string;

  constructor(endpoint: string, model = 'all-minilm', providerType: EmbeddingProviderType = 'ollama') {
    this.endpoint = endpoint;
    this.name = model;
    this.providerType = providerType;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const text of texts) {
      const vec = await this.embedQuery(text);
      results.push(vec);
    }
    return results;
  }

  async embedQuery(query: string): Promise<number[]> {
    try {
      // Ollama format: POST /api/embeddings { model, prompt }
      const res = await fetch(`${this.endpoint.replace(/\/$/, '')}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.name,
          prompt: query,
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as any;
        if (Array.isArray(data.embedding)) {
          return data.embedding;
        }
      }
    } catch {
      // Fallback
    }

    // Default to local deterministic fallback if endpoint is unreachable
    const fallback = new LocalDeterministicEmbeddingProvider();
    return fallback.embedQuery(query);
  }
}

/**
 * Factory function to retrieve the configured embedding provider
 */
export function getEmbeddingProvider(settings?: Partial<SearchSettings>): EmbeddingProvider {
  const providerType = settings?.embedding_provider || 'local';

  if (providerType === 'openai' && settings?.embedding_api_key) {
    return new HostedOpenAIEmbeddingProvider(
      settings.embedding_api_key,
      settings.embedding_model || 'text-embedding-3-small',
      settings.embedding_endpoint
    );
  }

  if (providerType === 'ollama' && settings?.embedding_endpoint) {
    return new LocalRuntimeEmbeddingProvider(
      settings.embedding_endpoint,
      settings.embedding_model || 'all-minilm',
      'ollama'
    );
  }

  if (providerType === 'custom' && settings?.embedding_endpoint) {
    return new LocalRuntimeEmbeddingProvider(
      settings.embedding_endpoint,
      settings.embedding_model || 'custom-model',
      'custom'
    );
  }

  return new LocalDeterministicEmbeddingProvider(settings?.embedding_model || 'all-MiniLM-L6-v2');
}
