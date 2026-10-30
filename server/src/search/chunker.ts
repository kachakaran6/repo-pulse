/**
 * Repo Chunking Engine for Semantic Search
 *
 * Implements two passes:
 * - Pass 1: README, description, topics, recent commit messages, file tree summary
 * - Pass 2: Selected source files (with binary file detection and token/file capping)
 */

import type { RepoChunkKind } from './types.js';

export interface ChunkOptions {
  maxChunkTokens?: number; // default: 500 tokens (~2000 chars)
  overlapTokens?: number;  // default: 80 tokens (~320 chars)
  maxSourceFiles?: number; // default: 50
  maxTotalChunks?: number; // default: 100
  maxFileSizeKb?: number;  // default: 64 KB
}

export interface RawRepoInfo {
  id: string | number;
  full_name: string;
  description?: string | null;
  language?: string | null;
  topics?: string[];
  status?: string;
  default_branch?: string;
  is_private?: boolean;
  meta?: {
    label?: string | null;
    note?: string | null;
    decision?: string | null;
    goal_date?: string | null;
  } | null;
}

export interface RawCommit {
  message: string;
  date?: string | Date | null;
  author?: string | null;
  sha?: string | null;
}

export interface RawFile {
  path: string;
  content: string;
  size?: number;
}

export interface GeneratedChunk {
  kind: RepoChunkKind;
  path?: string | null;
  text: string;
  tokenCount: number;
}

// Known binary and non-text extensions to skip
const BINARY_EXTENSIONS = new Set([
  'png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'ico', 'bmp', 'tiff',
  'pdf', 'zip', 'tar', 'gz', 'bz2', '7z', 'rar', 'xz',
  'exe', 'dll', 'so', 'dylib', 'bin', 'iso', 'dmg',
  'wasm', 'lock', 'pyc', 'class', 'jar', 'war',
  'mp3', 'mp4', 'mov', 'avi', 'mkv', 'flac', 'wav',
  'woff', 'woff2', 'ttf', 'eot', 'otf',
  'db', 'sqlite', 'sqlite3', 'parquet', 'avro',
]);

// Source extensions allowed in Pass 2
const SOURCE_CODE_EXTENSIONS = new Set([
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'go', 'rs', 'dart', 'java', 'kt', 'kts',
  'c', 'cpp', 'h', 'hpp', 'cs', 'swift', 'rb', 'php',
  'sql', 'sh', 'bash', 'zsh', 'dockerfile',
  'json', 'yaml', 'yml', 'toml', 'xml', 'md', 'mdx',
]);

/**
 * Fast estimation of token count (~4 characters per token)
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Detect if a file is binary based on extension and content bytes
 */
export function isBinaryFile(filePath: string, content?: string): boolean {
  const parts = filePath.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts.pop()! : '';
  if (BINARY_EXTENSIONS.has(ext)) {
    return true;
  }

  // Also check Dockerfile special case
  if (filePath.toLowerCase().endsWith('dockerfile')) {
    return false;
  }

  // Check content for null bytes or control characters
  if (content) {
    const sample = content.slice(0, 1024);
    if (sample.includes('\x00')) {
      return true;
    }
  }

  return false;
}

/**
 * Verify if file extension is an eligible source file
 */
export function isEligibleSourceFile(filePath: string): boolean {
  if (isBinaryFile(filePath)) return false;

  const basename = filePath.split('/').pop() || filePath;
  if (basename.toLowerCase() === 'dockerfile') return true;

  const parts = basename.toLowerCase().split('.');
  if (parts.length <= 1) return false;
  const ext = parts.pop()!;
  return SOURCE_CODE_EXTENSIONS.has(ext);
}

/**
 * Split text into overlapping windows by tokens/chars
 */
function splitIntoWindows(
  text: string,
  maxTokens: number,
  overlapTokens: number,
  prefix = ''
): string[] {
  const maxChars = maxTokens * 4;
  const overlapChars = overlapTokens * 4;

  if (text.length <= maxChars) {
    return [prefix ? `${prefix}\n\n${text}`.trim() : text];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  while (startIndex < text.length) {
    let endIndex = startIndex + maxChars;
    if (endIndex < text.length) {
      // Find nearest newline or sentence break to avoid chopping in the middle of words
      const lastNewline = text.lastIndexOf('\n', endIndex);
      if (lastNewline > startIndex + maxChars * 0.6) {
        endIndex = lastNewline;
      } else {
        const lastSpace = text.lastIndexOf(' ', endIndex);
        if (lastSpace > startIndex + maxChars * 0.6) {
          endIndex = lastSpace;
        }
      }
    }

    const slice = text.slice(startIndex, endIndex).trim();
    if (slice) {
      chunks.push(prefix ? `${prefix}\n\n${slice}`.trim() : slice);
    }

    if (endIndex >= text.length) break;
    startIndex = Math.max(endIndex - overlapChars, startIndex + 1);
  }

  return chunks;
}

/**
 * Pass 1: Chunk repository README by markdown sections
 */
export function chunkReadme(
  readmeContent: string,
  repo: RawRepoInfo,
  options: ChunkOptions = {}
): GeneratedChunk[] {
  if (!readmeContent || !readmeContent.trim()) return [];

  const maxTokens = options.maxChunkTokens || 500;
  const overlapTokens = options.overlapTokens || 80;
  const chunks: GeneratedChunk[] = [];

  // Split markdown by headers (e.g., #, ##, ###)
  const headerRegex = /^(#{1,3}\s+[^\n]+)$/gm;
  const sections: { title: string; content: string }[] = [];
  let lastIndex = 0;
  let currentTitle = 'Overview';

  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(readmeContent)) !== null) {
    if (match.index > lastIndex) {
      const body = readmeContent.substring(lastIndex, match.index).trim();
      if (body) {
        sections.push({ title: currentTitle, content: body });
      }
    }
    currentTitle = match[1].replace(/^#+\s*/, '').trim();
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < readmeContent.length) {
    const tail = readmeContent.substring(lastIndex).trim();
    if (tail) {
      sections.push({ title: currentTitle, content: tail });
    }
  }

  // If no markdown headers were found, treat the whole document as one section
  if (sections.length === 0) {
    sections.push({ title: 'Overview', content: readmeContent.trim() });
  }

  for (const sec of sections) {
    const prefix = `[Repo: ${repo.full_name} | README > ${sec.title}]`;
    const windows = splitIntoWindows(sec.content, maxTokens, overlapTokens, prefix);
    for (const w of windows) {
      chunks.push({
        kind: 'readme',
        path: 'README.md',
        text: w,
        tokenCount: estimateTokens(w),
      });
    }
  }

  return chunks;
}

/**
 * Pass 1: Chunk repository metadata, description, topics, notes, decisions
 */
export function chunkMetadata(repo: RawRepoInfo): GeneratedChunk[] {
  const lines: string[] = [
    `Repository: ${repo.full_name}`,
    `Language: ${repo.language || 'Unspecified'}`,
    `Default Branch: ${repo.default_branch || 'main'}`,
  ];

  if (repo.description) {
    lines.push(`Description: ${repo.description}`);
  }

  if (repo.topics && repo.topics.length > 0) {
    lines.push(`Topics: ${repo.topics.join(', ')}`);
  }

  if (repo.status) {
    lines.push(`Activity Status: ${repo.status}`);
  }

  if (repo.meta?.label) {
    lines.push(`Label / Tag: ${repo.meta.label}`);
  }

  if (repo.meta?.note) {
    lines.push(`Notes: ${repo.meta.note}`);
  }

  if (repo.meta?.decision) {
    lines.push(`Triage Decision: ${repo.meta.decision}`);
  }

  if (repo.meta?.goal_date) {
    lines.push(`Goal Date: ${repo.meta.goal_date}`);
  }

  const text = lines.join('\n');
  const chunks: GeneratedChunk[] = [
    {
      kind: 'metadata',
      path: null,
      text,
      tokenCount: estimateTokens(text),
    },
  ];

  if (repo.meta?.note) {
    chunks.push({
      kind: 'notes',
      path: null,
      text: `[Repo: ${repo.full_name} | User Notes]\n${repo.meta.note}`,
      tokenCount: estimateTokens(repo.meta.note),
    });
  }

  if (repo.meta?.decision) {
    chunks.push({
      kind: 'decisions',
      path: null,
      text: `[Repo: ${repo.full_name} | Decision: ${repo.meta.decision}]\nStatus: ${repo.status || 'unknown'}. Label: ${repo.meta.label || 'none'}. Goal: ${repo.meta.goal_date || 'none'}.`,
      tokenCount: estimateTokens(repo.meta.decision),
    });
  }

  return chunks;
}

/**
 * Pass 1: Chunk recent commit messages
 */
export function chunkCommits(
  commits: RawCommit[],
  repo: RawRepoInfo,
  options: ChunkOptions = {}
): GeneratedChunk[] {
  if (!commits || commits.length === 0) return [];

  const maxTokens = options.maxChunkTokens || 500;
  const commitLines: string[] = [];

  for (const c of commits.slice(0, 50)) {
    const dateStr = c.date ? ` (${new Date(c.date).toISOString().split('T')[0]})` : '';
    const authorStr = c.author ? ` by ${c.author}` : '';
    commitLines.push(`• ${c.message}${authorStr}${dateStr}`);
  }

  const prefix = `[Repo: ${repo.full_name} | Recent Commits]`;
  const combined = commitLines.join('\n');
  const windows = splitIntoWindows(combined, maxTokens, 50, prefix);

  return windows.map((w) => ({
    kind: 'commits',
    path: 'commits',
    text: w,
    tokenCount: estimateTokens(w),
  }));
}

/**
 * Pass 1: Chunk repository file tree summary
 */
export function chunkFileTree(
  filePaths: string[],
  repo: RawRepoInfo,
  options: ChunkOptions = {}
): GeneratedChunk[] {
  if (!filePaths || filePaths.length === 0) return [];

  const maxTokens = options.maxChunkTokens || 500;
  // Clean paths, filter out hidden / node_modules / git paths
  const cleanPaths = filePaths
    .filter((p) => !p.startsWith('.git') && !p.includes('node_modules') && !p.includes('/dist/'))
    .slice(0, 150);

  const prefix = `[Repo: ${repo.full_name} | Repository Structure & File Tree]`;
  const body = cleanPaths.join('\n');
  const windows = splitIntoWindows(body, maxTokens, 40, prefix);

  return windows.map((w) => ({
    kind: 'file_tree',
    path: 'file_tree',
    text: w,
    tokenCount: estimateTokens(w),
  }));
}

/**
 * Pass 2: Chunk an individual source code file
 */
export function chunkSourceFile(
  file: RawFile,
  repo: RawRepoInfo,
  options: ChunkOptions = {}
): GeneratedChunk[] {
  const maxTokens = options.maxChunkTokens || 500;
  const overlapTokens = options.overlapTokens || 80;
  const maxSizeBytes = (options.maxFileSizeKb || 64) * 1024;

  if (!file.content || file.content.length > maxSizeBytes) {
    return [];
  }

  if (isBinaryFile(file.path, file.content) || !isEligibleSourceFile(file.path)) {
    return [];
  }

  const prefix = `[Repo: ${repo.full_name} | File: ${file.path}]`;
  const windows = splitIntoWindows(file.content, maxTokens, overlapTokens, prefix);

  return windows.map((w) => ({
    kind: 'source_code',
    path: file.path,
    text: w,
    tokenCount: estimateTokens(w),
  }));
}

/**
 * Complete Chunking Pipeline for a repository
 * Executes Pass 1 (README, metadata, commits, file tree) and Pass 2 (source files)
 * with strict caps for large repositories.
 */
export function chunkRepository(
  repo: RawRepoInfo,
  data: {
    readme?: string | null;
    commits?: RawCommit[];
    fileTree?: string[];
    sourceFiles?: RawFile[];
  },
  options: ChunkOptions = {}
): GeneratedChunk[] {
  const maxTotalChunks = options.maxTotalChunks || 100;
  const maxSourceFiles = options.maxSourceFiles || 50;

  const allChunks: GeneratedChunk[] = [];

  // ==========================================
  // PASS 1: README & Metadata
  // ==========================================
  const metaChunks = chunkMetadata(repo);
  allChunks.push(...metaChunks);

  if (data.readme) {
    const readmeChunks = chunkReadme(data.readme, repo, options);
    allChunks.push(...readmeChunks);
  }

  if (data.commits && data.commits.length > 0) {
    const commitChunks = chunkCommits(data.commits, repo, options);
    allChunks.push(...commitChunks);
  }

  if (data.fileTree && data.fileTree.length > 0) {
    const treeChunks = chunkFileTree(data.fileTree, repo, options);
    allChunks.push(...treeChunks);
  }

  // ==========================================
  // PASS 2: Selected Source Files
  // ==========================================
  if (data.sourceFiles && data.sourceFiles.length > 0) {
    let sourceFileCount = 0;

    for (const file of data.sourceFiles) {
      if (sourceFileCount >= maxSourceFiles || allChunks.length >= maxTotalChunks) {
        break;
      }

      if (isEligibleSourceFile(file.path) && !isBinaryFile(file.path, file.content)) {
        const fileChunks = chunkSourceFile(file, repo, options);
        for (const fc of fileChunks) {
          if (allChunks.length >= maxTotalChunks) break;
          allChunks.push(fc);
        }
        sourceFileCount++;
      }
    }
  }

  return allChunks.slice(0, maxTotalChunks);
}
