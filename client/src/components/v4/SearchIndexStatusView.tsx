import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Trash2,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Server,
  Key,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  DollarSign,
  Database,
  Layers,
  X,
} from 'lucide-react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  fetchSearchIndexStatus,
  triggerSearchIndex,
  deleteSearchIndex,
  fetchOutboundPreview,
  updateSearchSettings,
} from '../../api.js';
import type {
  SearchIndexStatus,
  OutboundPreview,
  EmbeddingProviderType,
} from '@shared';
import { cn } from '@/lib/utils';
import { toast } from './ui/Toast.js';

export const SearchIndexStatusView: React.FC = () => {
  const [status, setStatus] = useState<SearchIndexStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Settings form
  const [provider, setProvider] = useState<EmbeddingProviderType>('local');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('all-MiniLM-L6-v2');
  const [endpoint, setEndpoint] = useState('');
  const [indexPrivate, setIndexPrivate] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Outbound preview modal
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<OutboundPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // Delete index confirmation dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Load index status
  const loadStatus = async () => {
    try {
      const data = await fetchSearchIndexStatus();
      setStatus(data);
      setProvider(data.provider);
      setModel(data.model);
      setIndexPrivate(data.indexPrivateRepos);
    } catch (err: any) {
      toast.error('Failed to load search index status');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  // Save Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await updateSearchSettings({
        embedding_provider: provider,
        embedding_api_key: apiKey.trim() || null,
        embedding_model: model.trim() || 'all-MiniLM-L6-v2',
        embedding_endpoint: endpoint.trim() || null,
        index_private_repos: indexPrivate,
      });
      toast.success('Search & embedding settings saved.');
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Trigger Re-index
  const handleTriggerIndex = async (fullReindex = false) => {
    setIsIndexing(true);
    try {
      toast.info('Starting repository indexing...');
      const res = await triggerSearchIndex(fullReindex);
      if (res.status) {
        setStatus(res.status);
      } else {
        await loadStatus();
      }
      toast.success('Indexing completed successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Indexing failed');
    } finally {
      setIsIndexing(false);
    }
  };

  // Delete Index
  const handleDeleteIndex = async () => {
    setIsDeleting(true);
    try {
      await deleteSearchIndex();
      toast.success('Search index deleted.');
      setDeleteDialogOpen(false);
      await loadStatus();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete index');
    } finally {
      setIsDeleting(false);
    }
  };

  // Open Outbound Preview
  const handleOpenPreview = async () => {
    setIsLoadingPreview(true);
    setPreviewOpen(true);
    try {
      const data = await fetchOutboundPreview();
      setPreviewData(data);
    } catch (err: any) {
      toast.error('Failed to generate outbound preview');
      setPreviewOpen(false);
    } finally {
      setIsLoadingPreview(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs font-mono text-neutral-8 animate-pulse flex items-center justify-center gap-2">
        <Loader2 className="size-4 animate-spin" /> Loading semantic search status...
      </div>
    );
  }

  const coverage = status?.coveragePercentage || 0;
  const isLocalProvider = provider === 'local';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-neutral-5">
        <div>
          <h2 className="text-base font-bold text-neutral-12 flex items-center gap-2">
            <Sparkles className="size-4 text-amber-500" />
            <span>Semantic Search & Vector Index</span>
          </h2>
          <p className="text-xs text-neutral-9 mt-0.5">
            Natural-language repository search, code recall, and nearest-neighbor duplicate detection.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenPreview}
            className="px-3 py-1.5 rounded-xs border border-neutral-6 bg-neutral-2 hover:bg-neutral-3 text-neutral-11 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Eye size={13} />
            <span>Preview Outbound Data</span>
          </button>

          <button
            type="button"
            disabled={isIndexing}
            onClick={() => handleTriggerIndex(false)}
            className="px-3 py-1.5 rounded-xs bg-neutral-12 hover:bg-neutral-11 text-neutral-1 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isIndexing ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
            <span>Re-index Now</span>
          </button>
        </div>
      </div>

      {/* 4 Status Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Coverage */}
        <div className="p-4 rounded-md border border-neutral-5 bg-neutral-2/50 space-y-2">
          <div className="flex items-center justify-between text-2xs font-mono uppercase text-neutral-9">
            <span className="flex items-center gap-1">
              <Database size={12} /> Index Coverage
            </span>
            <span className="font-semibold text-neutral-12">{coverage}%</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-12">
            {status?.indexedRepos || 0} / {status?.totalRepos || 0}{' '}
            <span className="text-xs font-normal text-neutral-9">repos</span>
          </div>
          <div className="w-full h-1.5 bg-neutral-4 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-normal"
              style={{ width: `${coverage}%` }}
            />
          </div>
        </div>

        {/* Card 2: Chunks */}
        <div className="p-4 rounded-md border border-neutral-5 bg-neutral-2/50 space-y-2">
          <div className="flex items-center justify-between text-2xs font-mono uppercase text-neutral-9">
            <span className="flex items-center gap-1">
              <Layers size={12} /> Total Chunks
            </span>
            <span className="text-neutral-9 font-normal">Pass 1 & 2</span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-12">
            {status?.totalChunks || 0}
          </div>
          <p className="text-2xs text-neutral-8 font-mono">
            ~{((status?.totalTokens || 0) / 1000).toFixed(1)}k tokens embedded
          </p>
        </div>

        {/* Card 3: Cost Estimate */}
        <div className="p-4 rounded-md border border-neutral-5 bg-neutral-2/50 space-y-2">
          <div className="flex items-center justify-between text-2xs font-mono uppercase text-neutral-9">
            <span className="flex items-center gap-1">
              <DollarSign size={12} /> Cost Estimate
            </span>
            <span className="text-emerald-500 font-mono text-3xs">
              {isLocalProvider ? 'FREE' : 'API METERED'}
            </span>
          </div>
          <div className="text-lg font-bold font-mono text-neutral-12">
            ${status?.estimatedCostUsd?.toFixed(4) || '0.0000'}
          </div>
          <p className="text-2xs text-neutral-8 font-mono">
            {isLocalProvider ? '100% on-device embeddings' : `$0.02 / 1M tokens (${status?.model})`}
          </p>
        </div>

        {/* Card 4: Last Indexed */}
        <div className="p-4 rounded-md border border-neutral-5 bg-neutral-2/50 space-y-2">
          <div className="flex items-center justify-between text-2xs font-mono uppercase text-neutral-9">
            <span>Last Synced</span>
            <span className="text-neutral-9 font-mono text-3xs">{status?.status}</span>
          </div>
          <div className="text-sm font-semibold text-neutral-12 truncate">
            {status?.lastIndexedAt
              ? new Date(status.lastIndexedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) +
                ' on ' +
                new Date(status.lastIndexedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : 'Never indexed'}
          </div>
          <p className="text-2xs text-neutral-8 font-mono truncate">
            Model: {status?.model || 'all-MiniLM-L6-v2'}
          </p>
        </div>
      </div>

      {/* Embedding Provider & Privacy Configuration */}
      <div className="p-5 rounded-md border border-neutral-5 bg-neutral-2 space-y-5">
        <h3 className="text-sm font-semibold text-neutral-12 flex items-center gap-2">
          <Server size={14} />
          <span>Pluggable Embedding Runtime Settings</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Provider Select */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-11">Embedding Provider</label>
            <select
              value={provider}
              onChange={(e) => {
                const p = e.target.value as EmbeddingProviderType;
                setProvider(p);
                if (p === 'local') setModel('all-MiniLM-L6-v2');
                else if (p === 'openai') setModel('text-embedding-3-small');
              }}
              className="w-full text-xs font-mono px-3 py-2 rounded-xs border border-neutral-6 bg-neutral-3 text-neutral-12 outline-none"
            >
              <option value="local">Local Deterministic Model (Free, Fast, Zero Network)</option>
              <option value="openai">Hosted OpenAI (text-embedding-3-small)</option>
              <option value="ollama">Local Ollama Runtime (http://localhost:11434)</option>
              <option value="custom">Custom Text Embeddings Endpoint (HuggingFace TEI / vLLM)</option>
            </select>
            <p className="text-2xs text-neutral-9">
              {provider === 'local' && 'Runs 384-dimensional dense semantic projections completely on-device.'}
              {provider === 'openai' && 'Uses OpenAI batch embedding API with automatic 429 rate-limit backoff.'}
              {provider === 'ollama' && 'Queries your local Ollama instance on localhost without sending data outside.'}
              {provider === 'custom' && 'Sends chunks to an internal or self-hosted embedding inference server.'}
            </p>
          </div>

          {/* Model Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-neutral-11">Model Name</label>
            <input
              type="text"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="e.g. all-MiniLM-L6-v2, text-embedding-3-small"
              className="w-full text-xs font-mono px-3 py-2 rounded-xs border border-neutral-6 bg-neutral-3 text-neutral-12 outline-none"
            />
            <p className="text-2xs text-neutral-9">
              Changing the model automatically marks existing repository chunks for re-embedding.
            </p>
          </div>

          {/* OpenAI API Key if OpenAI */}
          {provider === 'openai' && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-11 flex items-center gap-1.5">
                <Key size={12} /> OpenAI API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-proj-..."
                className="w-full text-xs font-mono px-3 py-2 rounded-xs border border-neutral-6 bg-neutral-3 text-neutral-12 outline-none"
              />
              <p className="text-2xs text-neutral-9">
                Stored encrypted per tenant. Used solely for generating query and chunk vectors.
              </p>
            </div>
          )}

          {/* Endpoint URL if Ollama or Custom */}
          {(provider === 'ollama' || provider === 'custom') && (
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-neutral-11">Runtime Endpoint URL</label>
              <input
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full text-xs font-mono px-3 py-2 rounded-xs border border-neutral-6 bg-neutral-3 text-neutral-12 outline-none"
              />
            </div>
          )}
        </div>

        {/* Privacy Section: Index Private Repos Opt-In */}
        <div className="pt-4 border-t border-neutral-5 space-y-3">
          <div className="flex items-start justify-between gap-4 p-3 rounded-md border border-neutral-5 bg-neutral-3/60">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                {indexPrivate ? (
                  <ShieldAlert className="size-4 text-amber-500" />
                ) : (
                  <ShieldCheck className="size-4 text-emerald-500" />
                )}
                <span className="text-xs font-semibold text-neutral-12">
                  Index Private Repositories
                </span>
                <span
                  className={cn(
                    'text-3xs font-mono px-1.5 py-0.2 rounded-xs border uppercase',
                    indexPrivate
                      ? 'border-amber-500/40 bg-amber-500/10 text-amber-500 font-semibold'
                      : 'border-emerald-500/40 bg-emerald-500/10 text-emerald-600 font-semibold'
                  )}
                >
                  {indexPrivate ? 'Opted In' : 'Protected (Default)'}
                </span>
              </div>
              <p className="text-2xs text-neutral-9 leading-relaxed">
                By default, RepoPulse only indexes public repositories. If enabled, private repository READMEs,
                metadata, and selected source code will be chunked. If an external hosted API (OpenAI) is configured,
                those chunks will be sent to the external provider.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 mt-1">
              <input
                type="checkbox"
                checked={indexPrivate}
                onChange={(e) => setIndexPrivate(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-neutral-5 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-neutral-12" />
            </label>
          </div>

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              disabled={isSavingSettings}
              onClick={handleSaveSettings}
              className="px-4 py-2 rounded-xs bg-neutral-12 hover:bg-neutral-11 text-neutral-1 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSavingSettings && <Loader2 size={13} className="animate-spin" />}
              <span>Save Settings</span>
            </button>

            {/* Danger Zone: Delete My Index */}
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="px-3 py-1.5 rounded-xs border border-red-500/30 text-red-500 hover:bg-red-500/10 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Trash2 size={13} />
              <span>Delete My Index</span>
            </button>
          </div>
        </div>
      </div>

      {/* Outbound Data Preview Modal */}
      <DialogPrimitive.Root open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-modal-backdrop bg-neutral-12/40 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[10%] z-modal w-full max-w-2xl translate-x-[-50%] rounded-md border border-neutral-6 bg-neutral-2 text-neutral-12 p-6 shadow-modal max-h-[80vh] flex flex-col space-y-4 outline-none">
            <div className="flex items-center justify-between border-b border-neutral-5 pb-3">
              <div className="flex items-center gap-2">
                <Eye className="size-4 text-neutral-11" />
                <h3 className="text-sm font-bold text-neutral-12">Outbound Embedding Data Preview</h3>
              </div>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-neutral-9 hover:text-neutral-12 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="text-xs text-neutral-9 space-y-1">
              <p>
                Below is an exact sample of repository text chunks that leave the server when embedding with{' '}
                <strong className="text-neutral-12 font-mono">{previewData?.targetProvider}</strong> ({previewData?.targetModel}).
              </p>
              <div className="flex items-center gap-4 text-2xs font-mono pt-1 text-neutral-10">
                <span>Total Chunks: {previewData?.totalSampleChunks}</span>
                <span>Estimated Tokens: ~{previewData?.totalEstimatedTokens}</span>
                <span>Private Repos: {previewData?.hasPrivateReposIncluded ? 'Included' : 'Excluded'}</span>
              </div>
            </div>

            {/* Sample Chunk Previews */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {previewData?.sampleTexts.map((sample, idx) => (
                <div key={idx} className="p-3 rounded-xs border border-neutral-5 bg-neutral-3/70 space-y-1">
                  <div className="flex items-center justify-between text-2xs font-mono">
                    <span className="font-semibold text-neutral-12 truncate">{sample.repoName}</span>
                    <span className="text-neutral-9">
                      {sample.kind} {sample.path ? `(${sample.path})` : ''} · ~{sample.tokenCount} tokens
                    </span>
                  </div>
                  <pre className="text-3xs font-mono text-neutral-10 whitespace-pre-wrap bg-neutral-1/60 p-2 rounded-xs border border-neutral-4 leading-relaxed">
                    {sample.previewText}
                  </pre>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-5">
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="px-3.5 py-1.5 rounded-xs bg-neutral-12 text-neutral-1 text-xs font-medium cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {/* Delete Index Confirmation Dialog */}
      <DialogPrimitive.Root open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-modal-backdrop bg-neutral-12/40 backdrop-blur-[2px]" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[25%] z-modal w-full max-w-md translate-x-[-50%] rounded-md border border-neutral-6 bg-neutral-2 text-neutral-12 p-6 shadow-modal space-y-4 outline-none">
            <div className="flex items-center gap-2.5 text-red-500">
              <AlertTriangle className="size-5" />
              <h3 className="text-sm font-bold text-neutral-12">Delete Entire Search Index?</h3>
            </div>

            <p className="text-xs text-neutral-9 leading-relaxed">
              This will permanently delete all stored vector chunks, commit summaries, and code indices from
              the database. You can re-generate the index at any time.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-neutral-5">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="px-3 py-1.5 rounded-xs border border-neutral-6 bg-neutral-3 text-neutral-11 text-xs font-medium hover:bg-neutral-4 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteIndex}
                className="px-3 py-1.5 rounded-xs bg-red-600 hover:bg-red-700 text-white text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {isDeleting && <Loader2 size={13} className="animate-spin" />}
                <span>Yes, Delete Index</span>
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
};
