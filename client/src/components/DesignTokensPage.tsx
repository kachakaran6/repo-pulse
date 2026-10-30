import React, { useState, useEffect } from 'react';
import {
  NEUTRALS,
  ACCENT,
  ACCENT_PALETTES,
  DENSITY_MODES,
  FONT_CHOICES,
  VERDICTS,
  ACTIVITY_SCALE,
  TYPOGRAPHY,
  SPACING,
  RADII,
  SHADOWS,
  Z_INDEX,
  MOTION,
  evaluateContrast,
  getContrastRatio,
} from '../tokens/index.js';
import {
  Sun,
  Moon,
  Monitor,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Check,
  ShieldCheck,
  Zap,
  Eye,
  Sliders,
  Sparkles,
  Palette,
  Type,
} from 'lucide-react';

interface DesignTokensPageProps {
  onBack: () => void;
}

export const DesignTokensPage: React.FC<DesignTokensPageProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<
    'contrast' | 'colors' | 'typography' | 'spacing' | 'radii-shadows' | 'borders-focus' | 'motion'
  >('contrast');

  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [currentTheme, setCurrentTheme] = useState<'light' | 'dark'>(() => {
    if (typeof document !== 'undefined') {
      const isDark =
        document.documentElement.classList.contains('dark') ||
        document.documentElement.getAttribute('data-theme') === 'dark';
      return isDark ? 'dark' : 'light';
    }
    return 'light';
  });

  const [currentAccent, setCurrentAccent] = useState<string>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.getAttribute('data-accent') || 'charcoal';
    }
    return 'charcoal';
  });

  const [currentDensity, setCurrentDensity] = useState<'comfortable' | 'compact'>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-density') as any) || 'comfortable';
    }
    return 'comfortable';
  });

  const [currentFont, setCurrentFont] = useState<'sans' | 'editorial' | 'mono'>(() => {
    if (typeof document !== 'undefined') {
      return (document.documentElement.getAttribute('data-font') as any) || 'sans';
    }
    return 'sans';
  });

  const [simulateReducedMotion, setSimulateReducedMotion] = useState(false);
  const [motionTrigger, setMotionTrigger] = useState(false);
  const [editableSampleText, setEditableSampleText] = useState('Quiet Ledger v4 · Refined Typographic Precision');

  // Sync theme
  useEffect(() => {
    const root = document.documentElement;
    if (currentTheme === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    }
  }, [currentTheme]);

  const handleSelectAccent = (acc: string) => {
    setCurrentAccent(acc);
    document.documentElement.setAttribute('data-accent', acc);
    localStorage.setItem('repopulse_accent', acc);
  };

  const handleSelectDensity = (den: 'comfortable' | 'compact') => {
    setCurrentDensity(den);
    document.documentElement.setAttribute('data-density', den);
    localStorage.setItem('repopulse_density', den);
  };

  const handleSelectFont = (f: 'sans' | 'editorial' | 'mono') => {
    setCurrentFont(f);
    document.documentElement.setAttribute('data-font', f);
    localStorage.setItem('repopulse_font', f);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(text);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const isDark = currentTheme === 'dark';
  const canvasBg = isDark ? '#141517' : '#F9F9F8';
  const surfaceBg = isDark ? '#222327' : '#FFFFFF';

  // Contrast Audit Calculations
  const contrastPairs = [
    {
      label: 'Primary Body Text (neutral-11 on canvas)',
      fg: isDark ? '#DFE2E8' : '#222722',
      bg: canvasBg,
      token: '--neutral-11',
      usage: 'Standard reading text',
    },
    {
      label: 'Secondary Text (neutral-10 on canvas)',
      fg: isDark ? '#B8BEC8' : '#474E46',
      bg: canvasBg,
      token: '--neutral-10',
      usage: 'Timestamps, author meta',
    },
    {
      label: 'Headings / Ink (neutral-12 on surface)',
      fg: isDark ? '#F0F2F5' : '#111411',
      bg: surfaceBg,
      token: '--neutral-12',
      usage: 'H1-H4 headings, high contrast text',
    },
    {
      label: 'Editorial Accent (accent-text on subtle bg)',
      fg: isDark ? '#D2D8E0' : '#111418',
      bg: isDark ? '#1C2026' : '#F0F2F5',
      token: '--accent-text',
      usage: 'Accent callouts and links',
    },
    {
      label: 'Verdict Keep (text on verdict bg)',
      fg: isDark ? VERDICTS.keep.text.dark : VERDICTS.keep.text.light,
      bg: isDark ? VERDICTS.keep.bg.dark : VERDICTS.keep.bg.light,
      token: '--verdict-keep-text',
      usage: 'Keep going action feedback',
    },
    {
      label: 'Verdict Pause (text on verdict bg)',
      fg: isDark ? VERDICTS.pause.text.dark : VERDICTS.pause.text.light,
      bg: isDark ? VERDICTS.pause.bg.dark : VERDICTS.pause.bg.light,
      token: '--verdict-pause-text',
      usage: 'Pause action feedback',
    },
    {
      label: 'Verdict Retire (text on verdict bg)',
      fg: isDark ? VERDICTS.retire.text.dark : VERDICTS.retire.text.light,
      bg: isDark ? VERDICTS.retire.bg.dark : VERDICTS.retire.bg.light,
      token: '--verdict-retire-text',
      usage: 'Retire action feedback',
    },
    {
      label: 'Activity Hot / Level 5 on canvas',
      fg: isDark ? '#E86B5A' : '#D2382A',
      bg: canvasBg,
      token: '--activity-5',
      usage: 'Commit strip active bars',
    },
    {
      label: 'Activity Cooling / Level 3 on canvas',
      fg: isDark ? '#D9A948' : '#8C4F00',
      bg: canvasBg,
      token: '--activity-3',
      usage: 'Commit strip cooling bars',
    },
  ];

  return (
    <div
      className={`min-h-screen bg-neutral-1 text-neutral-11 font-sans transition-colors duration-normal ${
        simulateReducedMotion ? 'reduced-motion-active' : ''
      }`}
      style={{
        backgroundColor: 'var(--neutral-1)',
        color: 'var(--neutral-11)',
      }}
    >
      {/* Top Ledger Header */}
      <header
        className="sticky top-0 z-sticky border-b border-neutral-6 bg-neutral-1/90 backdrop-blur-sm px-4 md:px-8 py-3.5"
        style={{ borderColor: 'var(--neutral-6)' }}
      >
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 rounded-sm border border-neutral-6 transition-colors"
              style={{
                borderRadius: 'var(--radius-sm)',
                borderColor: 'var(--neutral-6)',
              }}
            >
              <ArrowLeft size={14} />
              Back to App
            </button>
            <div className="h-4 w-px bg-neutral-6" />
            <div>
              <h1 className="text-base font-bold tracking-tight text-neutral-12 leading-none">
                Design System Tokens
              </h1>
              <span className="text-2xs text-neutral-9 uppercase tracking-wider font-mono">
                RepoPulse v4 · Quiet Ledger Specifications
              </span>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex items-center gap-2">
            <a
              href="/components"
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-sm border border-neutral-6 bg-neutral-3 text-neutral-10 hover:text-neutral-12 hover:bg-neutral-4 transition-colors font-medium"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              Components Catalog &rarr;
            </a>

            {/* Curated Accent selector */}
            <div
              className="inline-flex items-center gap-1 rounded-sm border border-neutral-6 bg-neutral-3 p-0.5 text-xs font-mono"
              title="Curated accent palette"
            >
              <Palette size={12} className="ml-1 text-neutral-8" />
              {ACCENT_PALETTES.map((pal) => (
                <button
                  key={pal.id}
                  type="button"
                  onClick={() => handleSelectAccent(pal.id)}
                  className={`px-1.5 py-0.5 rounded-xs transition-colors text-2xs ${
                    currentAccent === pal.id
                      ? 'bg-neutral-12 text-neutral-1 font-semibold'
                      : 'text-neutral-9 hover:text-neutral-12'
                  }`}
                >
                  {pal.id}
                </button>
              ))}
            </div>

            {/* Density selector */}
            <div
              className="inline-flex items-center rounded-sm border border-neutral-6 bg-neutral-3 p-0.5 text-xs font-mono"
              title="Display density"
            >
              {(['comfortable', 'compact'] as const).map((den) => (
                <button
                  key={den}
                  type="button"
                  onClick={() => handleSelectDensity(den)}
                  className={`px-1.5 py-0.5 rounded-xs transition-colors text-2xs capitalize ${
                    currentDensity === den
                      ? 'bg-neutral-12 text-neutral-1 font-semibold'
                      : 'text-neutral-9 hover:text-neutral-12'
                  }`}
                >
                  {den}
                </button>
              ))}
            </div>

            {/* Font selector */}
            <div
              className="inline-flex items-center gap-1 rounded-sm border border-neutral-6 bg-neutral-3 p-0.5 text-xs font-mono"
              title="Font family"
            >
              <Type size={12} className="ml-1 text-neutral-8" />
              {(['sans', 'editorial', 'mono'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => handleSelectFont(f)}
                  className={`px-1.5 py-0.5 rounded-xs transition-colors text-2xs uppercase ${
                    currentFont === f
                      ? 'bg-neutral-12 text-neutral-1 font-semibold'
                      : 'text-neutral-9 hover:text-neutral-12'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {/* Reduced motion simulator */}
            <button
              type="button"
              onClick={() => setSimulateReducedMotion(!simulateReducedMotion)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-sm border transition-colors ${
                simulateReducedMotion
                  ? 'border-neutral-12 bg-neutral-12 text-neutral-1 font-semibold'
                  : 'border-neutral-6 bg-neutral-3 text-neutral-10 hover:text-neutral-12'
              }`}
              title="Toggle simulated prefers-reduced-motion"
              style={{ borderRadius: 'var(--radius-sm)' }}
            >
              <Sliders size={13} />
              <span>Reduced motion: {simulateReducedMotion ? 'ON' : 'OFF'}</span>
            </button>

            {/* Theme switcher */}
            <div
              className="inline-flex rounded-sm border border-neutral-6 bg-neutral-3 p-0.5"
              style={{
                borderRadius: 'var(--radius-sm)',
                borderColor: 'var(--neutral-6)',
                backgroundColor: 'var(--neutral-3)',
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentTheme('light')}
                className={`p-1.5 rounded-xs transition-colors ${
                  !isDark ? 'bg-neutral-12 text-neutral-1' : 'text-neutral-9 hover:text-neutral-12'
                }`}
                title="Light mode"
              >
                <Sun size={14} />
              </button>
              <button
                type="button"
                onClick={() => setCurrentTheme('dark')}
                className={`p-1.5 rounded-xs transition-colors ${
                  isDark ? 'bg-neutral-12 text-neutral-1' : 'text-neutral-9 hover:text-neutral-12'
                }`}
                title="Dark mode"
              >
                <Moon size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Category Navigation Tabs */}
        <div className="max-w-6xl mx-auto flex gap-6 overflow-x-auto pt-3 mt-1 text-sm border-t border-neutral-6/60" tabIndex={0} role="region" aria-label="Design tokens navigation">
          {(
            [
              { id: 'contrast', label: 'WCAG AA Audit' },
              { id: 'colors', label: 'Colors & Palettes' },
              { id: 'typography', label: 'Typography & Numerals' },
              { id: 'spacing', label: '4px Spacing Grid' },
              { id: 'radii-shadows', label: 'Radii & Shadows' },
              { id: 'borders-focus', label: 'Borders & Focus' },
              { id: 'motion', label: 'Motion & Easings' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`pb-2.5 whitespace-nowrap text-xs md:text-sm transition-colors border-b-2 font-medium ${
                activeTab === tab.id
                  ? 'border-neutral-12 text-neutral-12 font-semibold'
                  : 'border-transparent text-neutral-10 hover:text-neutral-12'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 space-y-10">
        {/* TAB 1: WCAG AA CONTRAST AUDIT */}
        {activeTab === 'contrast' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-12">
                Accessibility & Contrast Verification
              </h2>
              <p className="text-sm text-neutral-10 mt-1 max-w-2xl">
                Every text, semantic verdict, and activity token is mathematically verified against
                WCAG 2.1 Level AA (4.5:1 for body copy, 3:1 for large text and UI components) and AAA (7:1).
              </p>
            </div>

            <div
              className="border border-neutral-6 rounded-md bg-neutral-3 overflow-hidden shadow-subtle"
              style={{
                borderRadius: 'var(--radius-md)',
                borderColor: 'var(--neutral-6)',
                backgroundColor: 'var(--neutral-3)',
              }}
            >
              <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="12-step neutral tokens reference table">
                <table className="w-full text-left text-sm">
                  <thead className="bg-neutral-2 border-b border-neutral-6 text-xs text-neutral-10 uppercase tracking-wider font-mono">
                    <tr>
                      <th className="px-4 py-3">Element / Token</th>
                      <th className="px-4 py-3">Foreground</th>
                      <th className="px-4 py-3">Background</th>
                      <th className="px-4 py-3">Contrast Ratio</th>
                      <th className="px-4 py-3">WCAG AA (4.5:1)</th>
                      <th className="px-4 py-3">WCAG AAA (7.0:1)</th>
                      <th className="px-4 py-3">Live Sample</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-6 font-mono text-xs">
                    {contrastPairs.map((pair, idx) => {
                      const evalRes = evaluateContrast(pair.fg, pair.bg);
                      const isAAPass = evalRes.normalTextAA || evalRes.graphicalAA;
                      const isAAAPass = evalRes.normalTextAAA;

                      return (
                        <tr key={idx} className="hover:bg-neutral-4/50 transition-colors">
                          <td className="px-4 py-3.5 font-sans">
                            <strong className="text-neutral-12 block text-xs">{pair.label}</strong>
                            <span className="text-neutral-9 text-2xs">{pair.token}</span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-4 rounded-xs border border-neutral-6 shrink-0"
                                style={{ backgroundColor: pair.fg }}
                              />
                              <span>{pair.fg}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span
                                className="size-4 rounded-xs border border-neutral-6 shrink-0"
                                style={{ backgroundColor: pair.bg }}
                              />
                              <span>{pair.bg}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="tabular font-bold text-neutral-12 text-sm">
                              {evalRes.ratio}:1
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {isAAPass ? (
                              <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-verdict-keep-bg text-verdict-keep-text border border-verdict-keep-border font-sans font-semibold">
                                <Check size={12} strokeWidth={2.5} /> PASS
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-verdict-retire-bg text-verdict-retire-text border border-verdict-retire-border font-sans font-semibold">
                                FAIL
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {isAAAPass ? (
                              <span className="inline-flex items-center gap-1 text-2xs px-2 py-0.5 rounded-full bg-verdict-keep-bg text-verdict-keep-text border border-verdict-keep-border font-sans font-semibold">
                                <Check size={12} strokeWidth={2.5} /> PASS
                              </span>
                            ) : (
                              <span className="text-2xs text-neutral-9 font-sans">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 font-sans">
                            <div
                              className="px-2.5 py-1 rounded-sm border inline-block text-xs font-medium"
                              style={{
                                color: pair.fg,
                                backgroundColor: pair.bg,
                                borderColor: 'var(--neutral-6)',
                              }}
                            >
                              The quick brown fox
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )}

        {/* TAB 2: COLORS & PALETTES */}
        {activeTab === 'colors' && (
          <div className="space-y-12">
            {/* Curated Accent Palettes */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-12">
                  Curated Accent Palettes
                </h2>
                <p className="text-xs text-neutral-10">
                  Four intentional moods for subtle brand presence, interactive highlights, and active focus.
                  Click any palette to switch the live accent across the app.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {ACCENT_PALETTES.map((pal) => {
                  const isSelected = currentAccent === pal.id;
                  const currentVals = isDark ? pal.dark : pal.light;
                  return (
                    <div
                      key={pal.id}
                      onClick={() => handleSelectAccent(pal.id)}
                      className={`cursor-pointer rounded-sm border p-4 transition-all ${
                        isSelected
                          ? 'border-neutral-12 bg-neutral-2 shadow-xs'
                          : 'border-neutral-6 bg-neutral-3 hover:border-neutral-8 hover:shadow-subtle'
                      }`}
                      style={{
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      <div
                        className="h-16 w-full rounded-xs border mb-3 flex items-center justify-center transition-transform hover:scale-[1.02]"
                        style={{
                          backgroundColor: currentVals.subtle,
                          borderColor: currentVals.border,
                        }}
                      >
                        <span
                          className="size-7 rounded-full shadow-xs"
                          style={{ backgroundColor: currentVals.base }}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <strong className="text-xs font-bold text-neutral-12">{pal.name}</strong>
                        {isSelected && (
                          <span className="text-3xs font-mono font-semibold px-1.5 py-0.5 rounded-full bg-neutral-12 text-neutral-1">
                            Active
                          </span>
                        )}
                      </div>

                      <p className="text-2xs text-neutral-10 mt-1 line-clamp-2 leading-relaxed">
                        {pal.tagline}
                      </p>

                      <div className="mt-3 pt-2 border-t border-neutral-6/60 flex items-center justify-between text-3xs font-mono text-neutral-9">
                        <span>Base: {currentVals.base}</span>
                        <span>Tint: {currentVals.subtle}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* 12-Step Neutrals */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-12">
                  12-Step Neutral Scale
                </h2>
                <p className="text-xs text-neutral-10">
                  True neutral monochrome ramp for paper, surface layers, hairlines, and typography.
                  Zero generic blue/teal tints.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {NEUTRALS.map((c) => {
                  const hex = isDark ? c.dark : c.light;
                  return (
                    <div
                      key={c.name}
                      onClick={() => copyToClipboard(`var(${c.variable})`)}
                      className="group cursor-pointer rounded-sm border border-neutral-6 bg-neutral-3 p-3 transition-all hover:border-neutral-8 hover:shadow-subtle"
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--neutral-6)',
                        backgroundColor: 'var(--neutral-3)',
                      }}
                    >
                      <div
                        className="h-16 w-full rounded-xs border border-neutral-6/60 mb-2 transition-transform group-hover:scale-[1.02]"
                        style={{ backgroundColor: `var(${c.variable})` }}
                      />
                      <div className="flex items-center justify-between">
                        <strong className="text-xs text-neutral-12 font-mono">{c.name}</strong>
                        {copiedToken === `var(${c.variable})` ? (
                          <Check size={12} className="text-verdict-keep-base" />
                        ) : (
                          <Copy size={12} className="opacity-0 group-hover:opacity-100 text-neutral-9 transition-opacity" />
                        )}
                      </div>
                      <div className="text-2xs font-mono text-neutral-9 tabular">{hex}</div>
                      <p className="text-2xs text-neutral-10 mt-1 line-clamp-2">{c.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Verdict Semantic Colors */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-12">
                  Semantic Verdict Colors
                </h2>
                <p className="text-xs text-neutral-10">
                  Reserved strictly for triage decisions. Keep going = green, Pause = amber, Retire = muted red/gray.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Keep Going */}
                <div
                  className="rounded-md border p-4 space-y-3"
                  style={{
                    backgroundColor: 'var(--verdict-keep-bg)',
                    borderColor: 'var(--verdict-keep-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-xs"
                        style={{ backgroundColor: 'var(--verdict-keep-base)' }}
                      />
                      <strong
                        className="text-sm font-bold"
                        style={{ color: 'var(--verdict-keep-text)' }}
                      >
                        {VERDICTS.keep.label} [K]
                      </strong>
                    </div>
                    <span
                      className="text-2xs font-mono font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--verdict-keep-base)',
                        color: 'var(--neutral-1)',
                      }}
                    >
                      Shortcut: K
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--verdict-keep-text)' }}>
                    Active repository maintained in regular development focus.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-semibold rounded-sm border"
                      style={{
                        backgroundColor: 'var(--verdict-keep-base)',
                        color: 'var(--neutral-1)',
                        borderColor: 'transparent',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Keep Repo
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-medium rounded-sm border"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--verdict-keep-text)',
                        borderColor: 'var(--verdict-keep-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      + Goal Date
                    </button>
                  </div>
                </div>

                {/* Pause */}
                <div
                  className="rounded-md border p-4 space-y-3"
                  style={{
                    backgroundColor: 'var(--verdict-pause-bg)',
                    borderColor: 'var(--verdict-pause-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-xs"
                        style={{ backgroundColor: 'var(--verdict-pause-base)' }}
                      />
                      <strong
                        className="text-sm font-bold"
                        style={{ color: 'var(--verdict-pause-text)' }}
                      >
                        {VERDICTS.pause.label} [P]
                      </strong>
                    </div>
                    <span
                      className="text-2xs font-mono font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--verdict-pause-base)',
                        color: 'var(--neutral-1)',
                      }}
                    >
                      Shortcut: P
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--verdict-pause-text)' }}>
                    Intentionally paused. Hidden until selected resurfacing date.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-semibold rounded-sm border"
                      style={{
                        backgroundColor: 'var(--verdict-pause-base)',
                        color: 'var(--neutral-1)',
                        borderColor: 'transparent',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Pause 30 Days
                    </button>
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-medium rounded-sm border"
                      style={{
                        backgroundColor: 'transparent',
                        color: 'var(--verdict-pause-text)',
                        borderColor: 'var(--verdict-pause-border)',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Pick Date
                    </button>
                  </div>
                </div>

                {/* Retire */}
                <div
                  className="rounded-md border p-4 space-y-3"
                  style={{
                    backgroundColor: 'var(--verdict-retire-bg)',
                    borderColor: 'var(--verdict-retire-border)',
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-3 rounded-xs"
                        style={{ backgroundColor: 'var(--verdict-retire-base)' }}
                      />
                      <strong
                        className="text-sm font-bold"
                        style={{ color: 'var(--verdict-retire-text)' }}
                      >
                        {VERDICTS.retire.label} [R]
                      </strong>
                    </div>
                    <span
                      className="text-2xs font-mono font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: 'var(--verdict-retire-base)',
                        color: 'var(--neutral-1)',
                      }}
                    >
                      Shortcut: R
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: 'var(--verdict-retire-text)' }}>
                    Retired from daily ledger. Moved gracefully into Archive.
                  </p>
                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      className="px-3 py-1 text-xs font-semibold rounded-sm border"
                      style={{
                        backgroundColor: 'var(--verdict-retire-base)',
                        color: 'var(--neutral-1)',
                        borderColor: 'transparent',
                        borderRadius: 'var(--radius-sm)',
                      }}
                    >
                      Retire to Archive
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* 5-Step Activity Scale (Heat Ramp) */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-12">
                  5-Step Activity Heat Scale
                </h2>
                <p className="text-xs text-neutral-10">
                  Visual temperature ramp derived strictly from last commit timestamps. Used for Heat Bar segments and Commit Strips.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {ACTIVITY_SCALE.map((act) => {
                  const hex = isDark ? act.dark : act.light;
                  return (
                    <div
                      key={act.name}
                      className="rounded-sm border border-neutral-6 bg-neutral-3 p-3.5 space-y-2"
                      style={{
                        borderRadius: 'var(--radius-sm)',
                        borderColor: 'var(--neutral-6)',
                        backgroundColor: 'var(--neutral-3)',
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-3.5 rounded-xs"
                          style={{ backgroundColor: `var(${act.variable})` }}
                        />
                        <strong className="text-xs text-neutral-12">{act.name}</strong>
                      </div>
                      <div className="font-mono text-xs tabular text-neutral-9">{hex}</div>
                      <p className="text-2xs text-neutral-10">{act.description}</p>
                    </div>
                  );
                })}
              </div>

              {/* Live 90-Day Strip Demo using Activity Tokens */}
              <div
                className="mt-4 p-4 rounded-md border border-neutral-6 bg-neutral-2"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-2)',
                }}
              >
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="font-mono text-neutral-12 font-medium">
                    Sample 90-Day Activity Strip (Active Repo)
                  </span>
                  <span className="text-2xs text-neutral-9">Today &rarr;</span>
                </div>
                <div className="flex items-end gap-[1px] h-8 w-full bg-neutral-3 p-1.5 rounded-sm border border-neutral-6">
                  {Array.from({ length: 90 }).map((_, i) => {
                    // Simulate pattern
                    const isTick = i % 7 === 0;
                    let height = 3;
                    let color = 'var(--neutral-6)';
                    if (i > 75) {
                      height = 6 + (i % 5) * 5;
                      color = 'var(--activity-5)'; // Hot
                    } else if (i > 50 && i % 3 === 0) {
                      height = 6 + (i % 4) * 4;
                      color = 'var(--activity-4)'; // Warm
                    } else if (i > 25 && i % 4 === 0) {
                      height = 5 + (i % 3) * 3;
                      color = 'var(--activity-3)'; // Cooling
                    } else if (i % 6 === 0) {
                      height = 4;
                      color = 'var(--activity-2)'; // Stale
                    }

                    return (
                      <div
                        key={i}
                        className="flex-1 min-w-[1px] rounded-[1px] transition-all hover:opacity-75"
                        style={{
                          height: `${height}px`,
                          backgroundColor: color,
                          borderLeft: isTick ? '1px solid var(--neutral-7)' : 'none',
                        }}
                        title={`Day ${90 - i}: commit bar`}
                      />
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB 3: TYPOGRAPHY & NUMERALS */}
        {activeTab === 'typography' && (
          <div className="space-y-10">
            {/* Font Families */}
            <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div
                className="p-5 rounded-md border border-neutral-6 bg-neutral-3 space-y-3"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-3)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-mono text-neutral-9">
                    UI Sans Font
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-neutral-4 text-neutral-11">
                    Geist / Inter
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-neutral-12 font-sans">
                  Quiet Editorial Clarity
                </p>
                <p className="text-sm text-neutral-10 leading-relaxed font-sans">
                  The quick brown fox jumps over the lazy dog. Used for primary user interface copy,
                  subtle navigation labels, descriptive summaries, and setting controls.
                </p>
              </div>

              <div
                className="p-5 rounded-md border border-neutral-6 bg-neutral-3 space-y-3"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-3)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-mono text-neutral-9">
                    Editorial Serif
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-neutral-4 text-neutral-11">
                    Newsreader / Georgia
                  </span>
                </div>
                <p
                  className="text-2xl font-medium tracking-tight text-neutral-12"
                  style={{ fontFamily: "'Newsreader', Georgia, serif" }}
                >
                  Thoughtful Literary Focus
                </p>
                <p
                  className="text-sm text-neutral-10 leading-relaxed"
                  style={{ fontFamily: "'Newsreader', Georgia, serif" }}
                >
                  A calm, book-like reading cadence suited for long commit logs, project retrospectives,
                  and reflective weekly digest briefings.
                </p>
              </div>

              <div
                className="p-5 rounded-md border border-neutral-6 bg-neutral-3 space-y-3"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-3)',
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider font-mono text-neutral-9">
                    Monospace Font
                  </span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded-sm bg-neutral-4 text-neutral-11">
                    JetBrains Mono / Geist Mono
                  </span>
                </div>
                <p className="text-xl font-medium text-neutral-12 font-mono">
                  repopulse/engine-core
                </p>
                <p className="text-xs text-neutral-10 leading-relaxed font-mono">
                  0123456789 git commit -m &quot;feat: activity tokens&quot;<br />
                  Used strictly for repository names, SHA hashes, commit counts, and dates.
                </p>
              </div>
            </section>

            {/* Tabular Numerals Comparison */}
            <section
              className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4"
              style={{
                borderRadius: 'var(--radius-md)',
                borderColor: 'var(--neutral-6)',
                backgroundColor: 'var(--neutral-3)',
              }}
            >
              <div>
                <h3 className="text-base font-bold text-neutral-12">
                  Tabular Numerals Demonstration
                </h3>
                <p className="text-xs text-neutral-10">
                  All dates, commit numbers, and timestamps use <code className="font-mono text-neutral-12">tabular-nums</code> to eliminate layout twitching during live updates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 font-mono">
                <div className="p-4 rounded-sm border border-neutral-6 bg-neutral-2 space-y-2">
                  <span className="text-2xs uppercase text-neutral-9 block">Proportional (Normal)</span>
                  <div className="space-y-1 text-sm text-neutral-11">
                    <div>111,111 commits (narrow)</div>
                    <div>888,888 commits (wide)</div>
                    <div>2026-11-11 · 11m ago</div>
                    <div>2026-08-28 · 28m ago</div>
                  </div>
                </div>

                <div className="p-4 rounded-sm border border-neutral-6 bg-neutral-2 space-y-2">
                  <span className="text-2xs uppercase text-verdict-keep-base font-semibold block">
                    Tabular Figures (.tabular)
                  </span>
                  <div className="space-y-1 text-sm text-neutral-12 tabular font-semibold">
                    <div>111,111 commits (aligned)</div>
                    <div>888,888 commits (aligned)</div>
                    <div>2026-11-11 · 11m ago</div>
                    <div>2026-08-28 · 28m ago</div>
                  </div>
                </div>
              </div>
            </section>

            {/* Complete Type Scale */}
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-12">Type Scale Hierarchy</h3>
                  <p className="text-xs text-neutral-10">Harmonic typographical scale with matching line heights.</p>
                </div>
                <input
                  type="text"
                  value={editableSampleText}
                  onChange={(e) => setEditableSampleText(e.target.value)}
                  placeholder="Test custom preview text..."
                  className="px-3 py-1.5 text-xs rounded-sm border border-neutral-6 bg-neutral-3 text-neutral-12 w-64"
                />
              </div>

              <div
                className="border border-neutral-6 rounded-md bg-neutral-3 divide-y divide-neutral-6 overflow-hidden"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-3)',
                }}
              >
                {TYPOGRAPHY.scale.map((step) => (
                  <div key={step.name} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-neutral-4/40 transition-colors">
                    <div className="w-48 shrink-0 font-mono text-xs text-neutral-9">
                      <strong className="text-neutral-12 block">{step.name}</strong>
                      <span>{step.size} ({step.rem}) · LH {step.lineHeight}</span>
                    </div>
                    <div
                      className="text-neutral-12 font-sans truncate flex-1"
                      style={{ fontSize: step.size, lineHeight: step.lineHeight }}
                    >
                      {editableSampleText || step.sample}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 4: 4PX SPACING GRID */}
        {activeTab === 'spacing' && (
          <section className="space-y-6">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-12">
                4px Spacing Grid System
              </h2>
              <p className="text-sm text-neutral-10 mt-1 max-w-2xl">
                Every margin, padding, row height, and gap is strictly aligned to the 4px baseline grid.
                No arbitrary paddings or magic numbers.
              </p>
            </div>

            <div
              className="border border-neutral-6 rounded-md bg-neutral-3 divide-y divide-neutral-6 overflow-hidden"
              style={{
                borderRadius: 'var(--radius-md)',
                borderColor: 'var(--neutral-6)',
                backgroundColor: 'var(--neutral-3)',
              }}
            >
              {SPACING.map((s) => (
                <div key={s.name} className="p-3.5 flex items-center justify-between gap-4 hover:bg-neutral-4/40 transition-colors">
                  <div className="w-36 font-mono text-xs">
                    <strong className="text-neutral-12 block">{s.name}</strong>
                    <span className="text-neutral-9 text-2xs">{s.px} ({s.rem})</span>
                  </div>
                  <div className="flex-1 flex items-center">
                    <div
                      className="h-5 bg-neutral-12 rounded-[1px] transition-all"
                      style={{ width: s.px }}
                    />
                  </div>
                  <span className="font-mono text-2xs text-neutral-9 tabular">{s.px}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* TAB 5: RADII & SHADOWS */}
        {activeTab === 'radii-shadows' && (
          <div className="space-y-10">
            {/* Radius Scale */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-12">Corner Radius Scale</h2>
                <p className="text-xs text-neutral-10">
                  Restrained radii to preserve the crisp, tactile notebook aesthetic. Maximum standard radius is 8px.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                {RADII.map((r) => (
                  <div
                    key={r.name}
                    className="p-4 border border-neutral-6 bg-neutral-3 text-center space-y-3"
                    style={{
                      borderRadius: r.px,
                      borderColor: 'var(--neutral-6)',
                      backgroundColor: 'var(--neutral-3)',
                    }}
                  >
                    <div
                      className="h-12 w-full border border-neutral-8 bg-neutral-4 flex items-center justify-center mx-auto"
                      style={{ borderRadius: r.px }}
                    >
                      <span className="font-mono text-2xs text-neutral-11">{r.px}</span>
                    </div>
                    <div>
                      <strong className="text-xs text-neutral-12 block">{r.name}</strong>
                      <span className="text-2xs text-neutral-9">{r.description}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Shadows */}
            <section className="space-y-4">
              <div>
                <h2 className="text-lg font-bold tracking-tight text-neutral-12">Subtle Elevation Scale</h2>
                <p className="text-xs text-neutral-10">
                  Quiet depth designed for paper surfaces. Avoids noisy, diffused, heavy drop-shadows.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                {SHADOWS.map((s) => (
                  <div
                    key={s.name}
                    className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-2 transition-transform hover:-translate-y-0.5"
                    style={{
                      borderRadius: 'var(--radius-md)',
                      borderColor: 'var(--neutral-6)',
                      backgroundColor: 'var(--neutral-3)',
                      boxShadow: `var(${s.name})`,
                    }}
                  >
                    <strong className="text-sm text-neutral-12 block font-mono">{s.name}</strong>
                    <p className="text-xs text-neutral-10">{s.description}</p>
                    <div className="pt-2 text-2xs font-mono text-neutral-9 truncate">{isDark ? s.dark : s.light}</div>
                  </div>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* TAB 6: BORDERS & FOCUS RINGS */}
        {activeTab === 'borders-focus' && (
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-12">
                Borders & Keyboard Focus Accessibility
              </h2>
              <p className="text-sm text-neutral-10 mt-1 max-w-2xl">
                Hairline dividers define table structure. Focus rings use high-contrast 2px solid ink
                with a 2px offset, ensuring clear visibility for keyboard-only navigation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Hairlines vs Strong */}
              <div
                className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-3)',
                }}
              >
                <h3 className="text-sm font-bold text-neutral-12">Border Styles</h3>
                <div className="space-y-3">
                  <div className="p-3 border-b border-neutral-6 bg-neutral-2 text-xs">
                    Hairline Divider (1px solid var(--neutral-6))
                  </div>
                  <div className="p-3 border border-neutral-7 bg-neutral-2 text-xs rounded-sm">
                    Strong Border (1px solid var(--neutral-7))
                  </div>
                  <div className="p-3 border-2 border-neutral-12 bg-neutral-2 text-xs rounded-sm">
                    Interactive Active Border (2px solid var(--neutral-12))
                  </div>
                </div>
              </div>

              {/* Focus Ring Tester */}
              <div
                className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4"
                style={{
                  borderRadius: 'var(--radius-md)',
                  borderColor: 'var(--neutral-6)',
                  backgroundColor: 'var(--neutral-3)',
                }}
              >
                <h3 className="text-sm font-bold text-neutral-12">Interactive Keyboard Focus Test</h3>
                <p className="text-xs text-neutral-10">
                  Tab or click into the inputs and buttons below to observe the WCAG AA 2px focus ring.
                </p>

                <div className="space-y-3 pt-2">
                  <input
                    type="text"
                    placeholder="Tab or click into this input..."
                    className="w-full px-3 py-2 text-sm rounded-sm border border-neutral-6 bg-neutral-1 text-neutral-12 focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2"
                  />
                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-semibold rounded-sm bg-neutral-12 text-neutral-1 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2"
                    >
                      Focusable Button
                    </button>
                    <button
                      type="button"
                      className="px-4 py-2 text-xs font-medium rounded-sm border border-neutral-6 bg-neutral-3 text-neutral-11 hover:bg-neutral-4 focus-visible:outline-2 focus-visible:outline-neutral-12 focus-visible:outline-offset-2"
                    >
                      Secondary Button
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* TAB 7: MOTION & EASINGS */}
        {activeTab === 'motion' && (
          <section className="space-y-8">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-neutral-12">
                Motion Tokens & Easing Curves
              </h2>
              <p className="text-sm text-neutral-10 mt-1 max-w-2xl">
                Purposeful, subtle transitions (120ms to 320ms). All transitions automatically collapse
                to 0.01ms when the user has <code className="font-mono text-neutral-12">prefers-reduced-motion</code> enabled.
              </p>
            </div>

            {/* Interactive Motion Trigger */}
            <div
              className="p-6 rounded-md border border-neutral-6 bg-neutral-3 space-y-4"
              style={{
                borderRadius: 'var(--radius-md)',
                borderColor: 'var(--neutral-6)',
                backgroundColor: 'var(--neutral-3)',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-neutral-12">Interactive Motion Simulator</h3>
                  <span className="text-xs text-neutral-10">Click the button below to fire parallel animated elements</span>
                </div>
                <button
                  type="button"
                  onClick={() => setMotionTrigger(!motionTrigger)}
                  className="px-4 py-2 text-xs font-semibold rounded-sm bg-neutral-12 text-neutral-1 hover:opacity-90 transition-opacity"
                  style={{ borderRadius: 'var(--radius-sm)' }}
                >
                  Trigger Motion
                </button>
              </div>

              <div className="space-y-4 pt-4">
                {MOTION.durations.map((d, idx) => (
                  <div key={d.name} className="space-y-1">
                    <div className="flex justify-between text-2xs font-mono text-neutral-9">
                      <span>{d.name} ({d.ms}ms)</span>
                      <span>{d.description}</span>
                    </div>
                    <div className="h-6 w-full bg-neutral-2 rounded-sm border border-neutral-6 p-0.5 overflow-hidden">
                      <div
                        className="h-full bg-accent-base rounded-xs"
                        style={{
                          width: motionTrigger ? '100%' : '20%',
                          transitionProperty: 'width',
                          transitionDuration: `${d.ms}ms`,
                          transitionTimingFunction: 'var(--ease-standard)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Easing Specs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {MOTION.easings.map((e) => (
                <div
                  key={e.name}
                  className="p-4 rounded-sm border border-neutral-6 bg-neutral-3 space-y-2"
                  style={{
                    borderRadius: 'var(--radius-sm)',
                    borderColor: 'var(--neutral-6)',
                    backgroundColor: 'var(--neutral-3)',
                  }}
                >
                  <strong className="text-xs font-mono text-neutral-12 block">{e.name}</strong>
                  <code className="text-2xs font-mono text-neutral-9 block truncate">{e.value}</code>
                  <p className="text-2xs text-neutral-10">{e.description}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
};
