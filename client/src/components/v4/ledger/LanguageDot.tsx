import React from 'react';

const LANGUAGE_COLORS: Record<string, string> = {
  typescript: '#3178c6',
  javascript: '#f1e05a',
  python: '#3572A5',
  rust: '#dea584',
  go: '#00ADD8',
  java: '#b07219',
  'c++': '#f34b7d',
  c: '#555555',
  ruby: '#701516',
  swift: '#F05138',
  php: '#4F5D95',
  html: '#e34c26',
  css: '#563d7c',
  shell: '#89e051',
  bash: '#89e051',
  kotlin: '#A97BFF',
  dart: '#00B4AB',
};

export const LanguageDot: React.FC<{ language: string | null; className?: string }> = ({
  language,
  className = '',
}) => {
  if (!language) return null;

  const color = LANGUAGE_COLORS[language.toLowerCase()] || 'var(--neutral-8)';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs text-neutral-10 font-sans ${className}`}>
      <span
        className="size-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />
      <span>{language}</span>
    </span>
  );
};
