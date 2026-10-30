/**
 * RepoPulse Design Tokens
 * Single source of truth for design tokens across React components, CSS, and Tailwind.
 */

export interface TokenColor {
  name: string;
  variable: string;
  light: string;
  dark: string;
  description: string;
}

export interface ContrastResult {
  fgColor: string;
  bgColor: string;
  ratio: number;
  normalTextAA: boolean;
  normalTextAAA: boolean;
  largeTextAA: boolean;
  graphicalAA: boolean;
}

/**
 * Calculate relative luminance according to WCAG 2.1 specs
 */
export function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const toLinear = (c: number) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Calculate WCAG contrast ratio between two hex colors
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const ratio = (lighter + 0.05) / (darker + 0.05);
  return Math.round(ratio * 100) / 100;
}

export function evaluateContrast(fgHex: string, bgHex: string): ContrastResult {
  const ratio = getContrastRatio(fgHex, bgHex);
  return {
    fgColor: fgHex,
    bgColor: bgHex,
    ratio,
    normalTextAA: ratio >= 4.5,
    normalTextAAA: ratio >= 7.0,
    largeTextAA: ratio >= 3.0,
    graphicalAA: ratio >= 3.0,
  };
}

/**
 * 12-Step Neutral Scale (Designed Dark Mode with Slate-Charcoal Tint)
 */
export const NEUTRALS: TokenColor[] = [
  { name: 'neutral-1', variable: '--neutral-1', light: '#F9F9F8', dark: '#141517', description: 'Deep canvas background' },
  { name: 'neutral-2', variable: '--neutral-2', light: '#F2F3F1', dark: '#1A1B1E', description: 'Elevated paper surface, table headers' },
  { name: 'neutral-3', variable: '--neutral-3', light: '#FFFFFF', dark: '#222327', description: 'Surface, cards, inputs' },
  { name: 'neutral-4', variable: '--neutral-4', light: '#EAECE9', dark: '#2A2B30', description: 'Row hover, quiet fills' },
  { name: 'neutral-5', variable: '--neutral-5', light: '#DFE2DE', dark: '#34363C', description: 'Active selection, pressed state' },
  { name: 'neutral-6', variable: '--neutral-6', light: '#D4D8D3', dark: '#3E4148', description: 'Hairlines, subtle borders' },
  { name: 'neutral-7', variable: '--neutral-7', light: '#BFC4BE', dark: '#525660', description: 'Strong borders, dividers' },
  { name: 'neutral-8', variable: '--neutral-8', light: '#687067', dark: '#858A98', description: 'Interactive borders, disabled icons' },
  { name: 'neutral-9', variable: '--neutral-9', light: '#575E56', dark: '#9DA4AA', description: 'Tertiary metadata, timestamps' },
  { name: 'neutral-10', variable: '--neutral-10', light: '#474E46', dark: '#B8BEC8', description: 'Secondary text, labels' },
  { name: 'neutral-11', variable: '--neutral-11', light: '#222722', dark: '#DFE2E8', description: 'Primary body text' },
  { name: 'neutral-12', variable: '--neutral-12', light: '#111411', dark: '#F0F2F5', description: 'Headings, high-contrast ink' },
];

/**
 * Curated Accent Palettes
 */
export interface AccentPalette {
  id: 'charcoal' | 'terracotta' | 'sage' | 'cobalt';
  name: string;
  tagline: string;
  light: {
    subtle: string;
    border: string;
    base: string;
    text: string;
  };
  dark: {
    subtle: string;
    border: string;
    base: string;
    text: string;
  };
}

export const ACCENT_PALETTES: AccentPalette[] = [
  {
    id: 'charcoal',
    name: 'Charcoal & Ink',
    tagline: 'Default monochromatic precision with quiet slate undertones',
    light: {
      subtle: '#F0F2F5',
      border: '#CCD1D9',
      base: '#1E232A',
      text: '#111418',
    },
    dark: {
      subtle: '#1C2026',
      border: '#303742',
      base: '#8B94A0',
      text: '#D2D8E0',
    },
  },
  {
    id: 'terracotta',
    name: 'Terracotta & Ember',
    tagline: 'Warm earthen warmth inspired by glazed ceramics and autumn leaves',
    light: {
      subtle: '#FDF3EF',
      border: '#E8B9A9',
      base: '#B44622',
      text: '#8C3114',
    },
    dark: {
      subtle: '#2B1812',
      border: '#562E22',
      base: '#E2724D',
      text: '#F3A990',
    },
  },
  {
    id: 'sage',
    name: 'Sage & Pine',
    tagline: 'Calm botanical greens promoting prolonged focus and editorial clarity',
    light: {
      subtle: '#EFF6F1',
      border: '#B7D9C3',
      base: '#2B6244',
      text: '#1C462F',
    },
    dark: {
      subtle: '#14241B',
      border: '#244633',
      base: '#5CA37A',
      text: '#96D1AF',
    },
  },
  {
    id: 'cobalt',
    name: 'Cobalt & Steel',
    tagline: 'Crisp nautical slate blue offering crisp contrast and engineering focus',
    light: {
      subtle: '#EEF4FB',
      border: '#B5CEEB',
      base: '#205493',
      text: '#163C6B',
    },
    dark: {
      subtle: '#142030',
      border: '#223B59',
      base: '#5A93D6',
      text: '#9DC3F2',
    },
  },
];

/**
 * Editorial Accent (Default Charcoal)
 */
export const ACCENT: TokenColor[] = [
  { name: 'accent-subtle', variable: '--accent-subtle', light: '#F0F2F5', dark: '#1C2026', description: 'Quiet accent tint' },
  { name: 'accent-border', variable: '--accent-border', light: '#CCD1D9', dark: '#303742', description: 'Accent hairline border' },
  { name: 'accent-base', variable: '--accent-base', light: '#1E232A', dark: '#8B94A0', description: 'Primary interactive accent' },
  { name: 'accent-text', variable: '--accent-text', light: '#111418', dark: '#D2D8E0', description: 'High-contrast accent text' },
];

/**
 * Verdict Semantic Colors (Desaturated in Dark Mode)
 */
export const VERDICTS = {
  keep: {
    label: 'Keep going',
    code: 'K',
    bg: { variable: '--verdict-keep-bg', light: '#EBF6EE', dark: '#142419' },
    border: { variable: '--verdict-keep-border', light: '#A3D9AE', dark: '#1E4627' },
    base: { variable: '--verdict-keep-base', light: '#227830', dark: '#3FA652' },
    text: { variable: '--verdict-keep-text', light: '#185923', dark: '#76CE85' },
  },
  pause: {
    label: 'Pause',
    code: 'P',
    bg: { variable: '--verdict-pause-bg', light: '#FEF7EB', dark: '#271F12' },
    border: { variable: '--verdict-pause-border', light: '#F6D799', dark: '#4D3B1C' },
    base: { variable: '--verdict-pause-base', light: '#8C4F00', dark: '#D99629' },
    text: { variable: '--verdict-pause-text', light: '#784B00', dark: '#E8BC67' },
  },
  retire: {
    label: 'Retire',
    code: 'R',
    bg: { variable: '--verdict-retire-bg', light: '#FBF0EF', dark: '#261617' },
    border: { variable: '--verdict-retire-border', light: '#E8BEBA', dark: '#4E282B' },
    base: { variable: '--verdict-retire-base', light: '#A84842', dark: '#CF6865' },
    text: { variable: '--verdict-retire-text', light: '#7A2B26', dark: '#E59A97' },
  },
};

/**
 * Activity Heat Ramp (5 steps: Hot to Dormant - Desaturated in Dark Mode)
 */
export const ACTIVITY_SCALE: TokenColor[] = [
  { name: 'activity-5', variable: '--activity-5', light: '#D2382A', dark: '#E86B5A', description: 'Level 5 (Hot / Active, committed < 7d)' },
  { name: 'activity-4', variable: '--activity-4', light: '#D97706', dark: '#E0952C', description: 'Level 4 (Warm, committed 8-14d)' },
  { name: 'activity-3', variable: '--activity-3', light: '#8C4F00', dark: '#D9A948', description: 'Level 3 (Cooling, committed 15-21d)' },
  { name: 'activity-2', variable: '--activity-2', light: '#4A7BA3', dark: '#6E9BBD', description: 'Level 2 (Cold / Stale, committed 22-30d)' },
  { name: 'activity-1', variable: '--activity-1', light: '#7B858D', dark: '#808891', description: 'Level 1 (Dormant / Dead, > 30d inactive)' },
];

/**
 * Density Modes
 */
export const DENSITY_MODES = [
  {
    id: 'comfortable' as const,
    name: 'Comfortable',
    description: 'Generous padding, spacious cards, standard 14px body text (Default)',
    rowPy: '10px',
    rowPx: '14px',
    cardPadding: '16px',
    fontSize: '14px',
  },
  {
    id: 'compact' as const,
    name: 'Compact',
    description: 'High-density ledger, tight 6px row padding, dense cards, 13px body text',
    rowPy: '6px',
    rowPx: '10px',
    cardPadding: '12px',
    fontSize: '13px',
  },
];

/**
 * Font Choices
 */
export const FONT_CHOICES = [
  {
    id: 'sans' as const,
    name: 'Sans (Geist / Inter)',
    family: "'Geist', 'Inter', -apple-system, sans-serif",
    description: 'Modern, highly legible neo-grotesque UI typography with clean neutral geometry',
    preview: 'RepoPulse ledger activity and triage velocity',
  },
  {
    id: 'editorial' as const,
    name: 'Editorial (Newsreader)',
    family: "'Newsreader', Georgia, serif",
    description: 'Warm, literary serif providing a calm, magazine-like reading atmosphere',
    preview: 'RepoPulse ledger activity and triage velocity',
  },
  {
    id: 'mono' as const,
    name: 'Technical (JetBrains Mono)',
    family: "'JetBrains Mono', 'Geist Mono', monospace",
    description: 'Rigorous monospaced layout designed for codebases, commits, and hash inspection',
    preview: 'RepoPulse ledger activity and triage velocity',
  },
];

/**
 * Typography Tokens
 */
export const TYPOGRAPHY = {
  fonts: {
    sans: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    mono: "'JetBrains Mono', 'Geist Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    editorial: "'Newsreader', Georgia, Cambria, 'Times New Roman', serif",
  },
  scale: [
    { name: 'text-2xs', size: '10px', rem: '0.625rem', lineHeight: '14px', sample: 'Private label' },
    { name: 'text-xs', size: '12px', rem: '0.75rem', lineHeight: '16px', sample: 'Last commit 2 days ago' },
    { name: 'text-sm', size: '13px', rem: '0.8125rem', lineHeight: '18px', sample: 'TypeScript · 42 commits' },
    { name: 'text-base', size: '14px', rem: '0.875rem', lineHeight: '20px', sample: 'repopulse/client-frontend' },
    { name: 'text-md', size: '15px', rem: '0.9375rem', lineHeight: '22px', sample: 'Ledger table description' },
    { name: 'text-lg', size: '16px', rem: '1rem', lineHeight: '24px', sample: 'Section title' },
    { name: 'text-xl', size: '18px', rem: '1.125rem', lineHeight: '26px', sample: 'Modal & Card Subtitle' },
    { name: 'text-2xl', size: '22px', rem: '1.375rem', lineHeight: '28px', sample: 'Screen Headline' },
    { name: 'text-3xl', size: '28px', rem: '1.75rem', lineHeight: '34px', sample: 'Overview Summary Sentence' },
    { name: 'text-4xl', size: '36px', rem: '2.25rem', lineHeight: '42px', sample: 'Triage Focus Name' },
    { name: 'text-5xl', size: '48px', rem: '3rem', lineHeight: '52px', sample: 'Landing Page Hero' },
  ],
};

/**
 * Spacing Scale (4px grid)
 */
export const SPACING = [
  { name: 'space-0.5', px: '2px', rem: '0.125rem' },
  { name: 'space-1', px: '4px', rem: '0.25rem' },
  { name: 'space-1.5', px: '6px', rem: '0.375rem' },
  { name: 'space-2', px: '8px', rem: '0.5rem' },
  { name: 'space-2.5', px: '10px', rem: '0.625rem' },
  { name: 'space-3', px: '12px', rem: '0.75rem' },
  { name: 'space-4', px: '16px', rem: '1rem' },
  { name: 'space-5', px: '20px', rem: '1.25rem' },
  { name: 'space-6', px: '24px', rem: '1.5rem' },
  { name: 'space-8', px: '32px', rem: '2rem' },
  { name: 'space-10', px: '40px', rem: '2.5rem' },
  { name: 'space-12', px: '48px', rem: '3rem' },
  { name: 'space-16', px: '64px', rem: '4rem' },
  { name: 'space-20', px: '80px', rem: '5rem' },
];

/**
 * Radii Scale
 */
export const RADII = [
  { name: 'radius-none', px: '0px', description: 'Sharp corners' },
  { name: 'radius-xs', px: '2px', description: 'Commit strip bars, small chips' },
  { name: 'radius-sm', px: '4px', description: 'Inputs, buttons, quiet cards' },
  { name: 'radius-md', px: '6px', description: 'Dropdown menus, popovers' },
  { name: 'radius-lg', px: '8px', description: 'Drawers, dialogs' },
  { name: 'radius-full', px: '9999px', description: 'Avatars, pills' },
];

/**
 * Elevation / Shadow Scale (Light and Dark Luminous Rim Light)
 */
export const SHADOWS = [
  {
    name: 'shadow-none',
    value: 'none',
    light: 'none',
    dark: 'none',
    description: 'Completely flat (default ledger style)',
  },
  {
    name: 'shadow-subtle',
    value: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    light: '0 1px 2px 0 rgba(0, 0, 0, 0.04)',
    dark: '0 1px 2px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.04)',
    description: 'Quiet surface elevation / 1px inset rim',
  },
  {
    name: 'shadow-card',
    value: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    light: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    dark: '0 2px 8px -1px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255, 255, 255, 0.05)',
    description: 'Floating card elevation with 1px luminous rim outline',
  },
  {
    name: 'shadow-popover',
    value: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    light: '0 4px 12px -2px rgba(0, 0, 0, 0.08), 0 2px 6px -1px rgba(0, 0, 0, 0.04)',
    dark: '0 8px 24px -4px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08)',
    description: 'Dropdown menus, tooltips, select pickers',
  },
  {
    name: 'shadow-drawer',
    value: '-4px 0 24px -4px rgba(0, 0, 0, 0.12)',
    light: '-4px 0 24px -4px rgba(0, 0, 0, 0.12)',
    dark: '-8px 0 32px 0 rgba(0, 0, 0, 0.75), inset 1px 0 0 0 rgba(255, 255, 255, 0.06)',
    description: 'Slide-over ledger inspector drawer',
  },
  {
    name: 'shadow-modal',
    value: '0 16px 36px -4px rgba(0, 0, 0, 0.16), 0 6px 12px -2px rgba(0, 0, 0, 0.08)',
    light: '0 16px 36px -4px rgba(0, 0, 0, 0.16), 0 6px 12px -2px rgba(0, 0, 0, 0.08)',
    dark: '0 24px 48px -8px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(255, 255, 255, 0.1)',
    description: 'Dialog overlays and high-elevation modals',
  },
];

/**
 * Z-Index Scale
 */
export const Z_INDEX = [
  { name: 'z-base', value: 0, description: 'Default document flow' },
  { name: 'z-raised', value: 1, description: 'Elevated rows / hover focus' },
  { name: 'z-sticky', value: 10, description: 'Sticky search/filter ledger bar' },
  { name: 'z-popover', value: 20, description: 'Dropdowns, select menus' },
  { name: 'z-drawer-backdrop', value: 30, description: 'Drawer dim overlay' },
  { name: 'z-drawer', value: 40, description: 'Slide-over repo inspection drawer' },
  { name: 'z-modal-backdrop', value: 50, description: 'Modal backdrop' },
  { name: 'z-modal', value: 60, description: 'Confirmation dialogs' },
  { name: 'z-toast', value: 100, description: 'Global sonner toast notifications' },
  { name: 'z-tooltip', value: 110, description: 'High-priority tooltips' },
];

/**
 * Motion Tokens
 */
export const MOTION = {
  durations: [
    { name: 'duration-fast', ms: 120, description: 'Micro-interactions, button presses, focus rings' },
    { name: 'duration-normal', ms: 200, description: 'Dropdowns, row hover, accordion transitions' },
    { name: 'duration-slow', ms: 280, description: 'Drawer slides, modal reveals, tab page fades (< 300ms)' },
  ],
  easings: [
    { name: 'ease-standard', value: 'cubic-bezier(0.16, 1, 0.3, 1)', description: 'Natural quiet movement' },
    { name: 'ease-in', value: 'cubic-bezier(0.3, 0, 1, 1)', description: 'Exits and dismissals' },
    { name: 'ease-out', value: 'cubic-bezier(0, 0, 0.2, 1)', description: 'Entrances and reveals' },
  ],
  reducedMotionFallback: '0.01ms !important (Respects prefers-reduced-motion)',
};
