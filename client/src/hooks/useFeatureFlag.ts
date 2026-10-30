import { useState, useEffect, useCallback } from 'react';

export type UIVersion = 'v3' | 'v4';

export type ScreenFlag =
  | 'shell'
  | 'ledger'
  | 'drawer'
  | 'triage'
  | 'decisions'
  | 'digest'
  | 'analytics'
  | 'settings'
  | 'landing';

const STORAGE_KEY = 'repopulse_ui_version';
const SCREEN_STORAGE_KEY = 'repopulse_screen_flags';

export function useFeatureFlag() {
  const [version, setVersionState] = useState<UIVersion>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlUi = params.get('ui');
      if (urlUi === 'v4' || urlUi === 'v3') {
        localStorage.setItem(STORAGE_KEY, urlUi);
        return urlUi;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'v4' || stored === 'v3') {
        return stored;
      }
    }
    return 'v4';
  });

  const [screenOverrides, setScreenOverrides] = useState<Partial<Record<ScreenFlag, UIVersion>>>(() => {
    if (typeof window !== 'undefined') {
      const overrides: Partial<Record<ScreenFlag, UIVersion>> = {};
      const params = new URLSearchParams(window.location.search);
      const screens: ScreenFlag[] = [
        'shell',
        'ledger',
        'drawer',
        'triage',
        'decisions',
        'digest',
        'analytics',
        'settings',
        'landing',
      ];

      try {
        const stored = localStorage.getItem(SCREEN_STORAGE_KEY);
        if (stored) {
          Object.assign(overrides, JSON.parse(stored));
        }
      } catch {
        // ignore parse error
      }

      for (const s of screens) {
        const paramVal = params.get(`flag:${s}`);
        if (paramVal === 'v4' || paramVal === 'v3') {
          overrides[s] = paramVal;
        }
      }

      return overrides;
    }
    return {};
  });

  const setVersion = useCallback((next: UIVersion) => {
    setVersionState(next);
    localStorage.setItem(STORAGE_KEY, next);
    const url = new URL(window.location.href);
    url.searchParams.set('ui', next);
    window.history.replaceState({}, '', url.toString());
  }, []);

  const setScreenVersion = useCallback((screen: ScreenFlag, next: UIVersion | null) => {
    setScreenOverrides((prev) => {
      const updated = { ...prev };
      if (next === null) {
        delete updated[screen];
      } else {
        updated[screen] = next;
      }
      localStorage.setItem(SCREEN_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const isScreenV4 = useCallback(
    (screen: ScreenFlag): boolean => {
      if (screenOverrides[screen]) {
        return screenOverrides[screen] === 'v4';
      }
      return version === 'v4';
    },
    [screenOverrides, version]
  );

  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'v4' || e.newValue === 'v3')) {
        setVersionState(e.newValue);
      }
      if (e.key === SCREEN_STORAGE_KEY && e.newValue) {
        try {
          setScreenOverrides(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  return {
    version,
    isV4: version === 'v4',
    setVersion,
    isScreenV4,
    setScreenVersion,
    screenOverrides,
  };
}
