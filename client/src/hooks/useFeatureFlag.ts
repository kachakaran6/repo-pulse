import { useState, useEffect } from 'react';

export type UIVersion = 'v3' | 'v4';

const STORAGE_KEY = 'repopulse_ui_version';

export function useFeatureFlag() {
  const [version, setVersionState] = useState<UIVersion>(() => {
    // 1. Check URL query param ?ui=v4 or ?ui=v3
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlUi = params.get('ui');
      if (urlUi === 'v4' || urlUi === 'v3') {
        localStorage.setItem(STORAGE_KEY, urlUi);
        return urlUi;
      }
      // 2. Check localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'v4' || stored === 'v3') {
        return stored;
      }
    }
    // Default to v4
    return 'v4';
  });

  const setVersion = (next: UIVersion) => {
    setVersionState(next);
    localStorage.setItem(STORAGE_KEY, next);
    // Update URL query param without full reload
    const url = new URL(window.location.href);
    url.searchParams.set('ui', next);
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'v4' || e.newValue === 'v3')) {
        setVersionState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    version,
    isV4: version === 'v4',
    setVersion,
  };
}
