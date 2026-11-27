import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';

export type ThemePreference = 'light' | 'dark' | 'system';

type ThemePreferenceContextValue = {
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
  resolvedScheme: 'light' | 'dark';
};

const STORAGE_KEY = 'theme-preference:v1';
const ThemePreferenceContext = createContext<ThemePreferenceContextValue | null>(null);

export function ThemePreferenceProvider({ children }: PropsWithChildren) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('light');
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw === 'light' || raw === 'dark' || raw === 'system') {
          setPreference(raw);
        }
      } catch {
        // ignore corrupted storage
      } finally {
        loadedRef.current = true;
      }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, preference).catch(() => {});
  }, [preference]);

  const resolvedScheme = useMemo<'light' | 'dark'>(() => {
    if (preference === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return preference;
  }, [preference, systemScheme]);

  const setThemePreference = useCallback((next: ThemePreference) => {
    setPreference(next);
  }, []);

  const value = useMemo(
    () => ({ preference, setPreference: setThemePreference, resolvedScheme }),
    [preference, resolvedScheme, setThemePreference]
  );

  return <ThemePreferenceContext.Provider value={value}>{children}</ThemePreferenceContext.Provider>;
}

export function useThemePreference() {
  const ctx = useContext(ThemePreferenceContext);
  if (!ctx) {
    throw new Error('useThemePreference must be used within ThemePreferenceProvider');
  }
  return ctx;
}

export function useOptionalThemePreference() {
  return useContext(ThemePreferenceContext);
}
