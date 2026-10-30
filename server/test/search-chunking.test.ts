import { describe, it, expect } from 'vitest';
import {
  chunkReadme,
  chunkMetadata,
  chunkCommits,
  chunkFileTree,
  chunkSourceFile,
  chunkRepository,
  isBinaryFile,
  isEligibleSourceFile,
  estimateTokens,
} from '../src/search/chunker.js';

describe('Search Chunking Engine (Two Passes & Edge Cases)', () => {
  const mockRepo = {
    id: 101,
    full_name: 'test-user/auth-shield',
    description: 'High performance authentication service',
    language: 'TypeScript',
    status: 'active',
    default_branch: 'main',
    is_private: false,
    meta: {
      label: 'Security',
      note: 'Need to review token rotation before launch',
      decision: 'keep' as const,
      goal_date: '2026-12-01',
    },
  };

  describe('Pass 1: README & Metadata Chunking', () => {
    it('splits markdown README by headers and includes repo context header', () => {
      const readme = `
# Auth Shield
High security gateway.

## Features
- JWT refresh token rotation
- RS256 signing
- Rate limiting

## Architecture
Built on Express and PostgreSQL.
      `.trim();

      const chunks = chunkReadme(readme, mockRepo);
      expect(chunks.length).toBeGreaterThanOrEqual(2);
      expect(chunks.every((c) => c.kind === 'readme')).toBe(true);
      expect(chunks[0].text).toContain('test-user/auth-shield');
      expect(chunks[0].text).toContain('README >');
    });

    it('handles README without markdown headers gracefully', () => {
      const plainReadme = 'Simple one line plain text description of this repository.';
      const chunks = chunkReadme(plainReadme, mockRepo);
      expect(chunks.length).toBe(1);
      expect(chunks[0].text).toContain('Simple one line plain text');
    });

    it('chunks metadata, notes, and decisions into structured chunks', () => {
      const chunks = chunkMetadata(mockRepo);
      expect(chunks.length).toBe(3); // metadata + notes + decisions

      const metaChunk = chunks.find((c) => c.kind === 'metadata');
      const noteChunk = chunks.find((c) => c.kind === 'notes');
      const decisionChunk = chunks.find((c) => c.kind === 'decisions');

      expect(metaChunk?.text).toContain('Language: TypeScript');
      expect(noteChunk?.text).toContain('Need to review token rotation');
      expect(decisionChunk?.text).toContain('Decision: keep');
    });

    it('chunks recent commits into chronological summary windows', () => {
      const commits = [
        { message: 'Add JWT refresh token rotation logic', author: 'alice', date: '2026-10-25' },
        { message: 'Fix race condition during concurrent refresh calls', author: 'bob', date: '2026-10-26' },
      ];

      const chunks = chunkCommits(commits, mockRepo);
      expect(chunks.length).toBe(1);
      expect(chunks[0].kind).toBe('commits');
      expect(chunks[0].text).toContain('Add JWT refresh token rotation');
      expect(chunks[0].text).toContain('Fix race condition');
    });

    it('chunks repository file tree summary and filters noisy paths', () => {
      const paths = [
        'src/auth/jwt.ts',
        'src/auth/refresh.ts',
        '.git/config',
        'node_modules/express/index.js',
        'package.json',
      ];

      const chunks = chunkFileTree(paths, mockRepo);
      expect(chunks.length).toBe(1);
      expect(chunks[0].kind).toBe('file_tree');
      expect(chunks[0].text).toContain('src/auth/jwt.ts');
      expect(chunks[0].text).not.toContain('.git/config');
      expect(chunks[0].text).not.toContain('node_modules');
    });
  });

  describe('Pass 2: Selected Source Files & Binary Edge Cases', () => {
    it('detects binary files by extension and skips them', () => {
      expect(isBinaryFile('assets/logo.png')).toBe(true);
      expect(isBinaryFile('docs/manual.pdf')).toBe(true);
      expect(isBinaryFile('release/bundle.zip')).toBe(true);
      expect(isBinaryFile('bin/app.wasm')).toBe(true);
      expect(isBinaryFile('package-lock.json')).toBe(false);
      expect(isBinaryFile('src/index.ts')).toBe(false);
      expect(isBinaryFile('Dockerfile')).toBe(false);
    });

    it('detects binary files by null byte content even if extension looks textual', () => {
      const binaryContent = 'Some text\x00with null bytes';
      expect(isBinaryFile('data.txt', binaryContent)).toBe(true);
    });

    it('identifies eligible source code files across multiple ecosystems', () => {
      expect(isEligibleSourceFile('src/auth.ts')).toBe(true);
      expect(isEligibleSourceFile('main.py')).toBe(true);
      expect(isEligibleSourceFile('server.go')).toBe(true);
      expect(isEligibleSourceFile('lib.rs')).toBe(true);
      expect(isEligibleSourceFile('App.dart')).toBe(true);
      expect(isEligibleSourceFile('schema.sql')).toBe(true);
      expect(isEligibleSourceFile('Dockerfile')).toBe(true);
      expect(isEligibleSourceFile('image.png')).toBe(false);
    });

    it('chunks source file with path header and token estimation', () => {
      const sourceCode = `
export function verifyJwtToken(token: string) {
  return jwt.verify(token, SECRET);
}
      `.trim();

      const chunks = chunkSourceFile({ path: 'src/auth/jwt.ts', content: sourceCode }, mockRepo);
      expect(chunks.length).toBe(1);
      expect(chunks[0].kind).toBe('source_code');
      expect(chunks[0].path).toBe('src/auth/jwt.ts');
      expect(chunks[0].text).toContain('[Repo: test-user/auth-shield | File: src/auth/jwt.ts]');
      expect(chunks[0].tokenCount).toBeGreaterThan(5);
    });
  });

  describe('Edge Cases: Large Repositories & Caps', () => {
    it('enforces max total chunks cap on very large repositories', () => {
      const mockFiles = Array.from({ length: 60 }, (_, i) => ({
        path: `src/module_${i}.ts`,
        content: `export const value_${i} = ${i};\n`.repeat(20),
      }));

      const chunks = chunkRepository(
        mockRepo,
        {
          readme: '# Large Repo\n' + 'Lots of text\n'.repeat(50),
          commits: Array.from({ length: 30 }, (_, i) => ({ message: `commit ${i}` })),
          fileTree: mockFiles.map((f) => f.path),
          sourceFiles: mockFiles,
        },
        { maxTotalChunks: 15, maxSourceFiles: 10 }
      );

      expect(chunks.length).toBeLessThanOrEqual(15);
    });

    it('accurately estimates tokens with estimateTokens', () => {
      expect(estimateTokens('')).toBe(0);
      expect(estimateTokens('abcd')).toBe(1);
      expect(estimateTokens('a'.repeat(400))).toBe(100);
    });
  });
});
