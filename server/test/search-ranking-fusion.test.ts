import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  reciprocalRankFusion,
  generateMatchReason,
  extractSnippet,
} from '../src/search/fusion.js';

describe('Search Ranking & Reciprocal Rank Fusion (RRF)', () => {
  describe('Cosine Similarity', () => {
    it('returns 1.0 for identical normalized vectors', () => {
      const vec = [0.6, 0.8];
      expect(cosineSimilarity(vec, vec)).toBeCloseTo(1.0, 5);
    });

    it('returns 0.0 for orthogonal vectors', () => {
      const vecA = [1, 0, 0];
      const vecB = [0, 1, 0];
      expect(cosineSimilarity(vecA, vecB)).toBeCloseTo(0.0, 5);
    });

    it('handles null, undefined or empty vectors safely', () => {
      expect(cosineSimilarity(null, [1, 2])).toBe(0);
      expect(cosineSimilarity([1, 2], undefined)).toBe(0);
      expect(cosineSimilarity([], [])).toBe(0);
      expect(cosineSimilarity([1, 2], [1])).toBe(0);
    });
  });

  describe('Reciprocal Rank Fusion (RRF)', () => {
    it('ranks items present in multiple lists higher than items in single lists', () => {
      // List 1: Full text search results
      const list1 = [
        { id: 'chunk_A', name: 'Chunk A' }, // rank 1
        { id: 'chunk_B', name: 'Chunk B' }, // rank 2
        { id: 'chunk_C', name: 'Chunk C' }, // rank 3
      ];

      // List 2: Vector semantic search results
      const list2 = [
        { id: 'chunk_C', name: 'Chunk C' }, // rank 1 in vector search
        { id: 'chunk_A', name: 'Chunk A' }, // rank 2 in vector search
        { id: 'chunk_D', name: 'Chunk D' }, // rank 3 in vector search
      ];

      const fused = reciprocalRankFusion([
        { items: list1, weight: 1.0 },
        { items: list2, weight: 1.0 },
      ], 60);

      expect(fused.length).toBe(4);

      // Chunk A is rank 1 in list1 and rank 2 in list2:
      // score(A) = 1/(60+1) + 1/(60+2) = 1/61 + 1/62 ≈ 0.01639 + 0.01613 = 0.03252
      // score(C) = 1/(60+3) + 1/(60+1) = 1/63 + 1/61 ≈ 0.01587 + 0.01639 = 0.03226
      // score(B) = 1/(60+2) ≈ 0.01613
      // score(D) = 1/(60+3) ≈ 0.01587

      expect(fused[0].item.id).toBe('chunk_A');
      expect(fused[1].item.id).toBe('chunk_C');
      expect(fused[2].item.id).toBe('chunk_B');
      expect(fused[3].item.id).toBe('chunk_D');

      expect(fused[0].rrfScore).toBeGreaterThan(fused[1].rrfScore);
      expect(fused[1].rrfScore).toBeGreaterThan(fused[2].rrfScore);
      expect(fused[2].rrfScore).toBeGreaterThan(fused[3].rrfScore);
    });

    it('respects custom weights per retrieval strategy', () => {
      const listText = [{ id: 'item_1' }];
      const listVector = [{ id: 'item_2' }];

      // Give vector 2x weight
      const fused = reciprocalRankFusion([
        { items: listText, weight: 1.0 },
        { items: listVector, weight: 2.0 },
      ], 60);

      expect(fused[0].item.id).toBe('item_2');
      expect(fused[1].item.id).toBe('item_1');
    });
  });

  describe('Match Reason & Snippet Extraction', () => {
    it('generates clear match explanation for README headers and keywords', () => {
      const reason1 = generateMatchReason(
        'readme',
        'README.md',
        '[Repo: acme/auth | README > Authentication Flow]\nJWT token rotation details',
        'jwt',
        true
      );
      expect(reason1).toBe('Matched README section: "Authentication Flow"');

      const reason2 = generateMatchReason(
        'source_code',
        'src/auth/jwt.ts',
        'export function signToken()',
        'jwt',
        false,
        0.85
      );
      expect(reason2).toContain('Semantic code match (src/auth/jwt.ts) (similarity: 85%)');
    });

    it('extracts contextual snippet centered on matching query terms', () => {
      const longText = 'Prefix text. '.repeat(10) + 'Important keyword JWT refresh is here. ' + 'Suffix text. '.repeat(10);
      const snippet = extractSnippet(longText, 'JWT refresh', 80);

      expect(snippet).toContain('JWT refresh');
      expect(snippet.length).toBeLessThanOrEqual(100);
    });
  });
});
