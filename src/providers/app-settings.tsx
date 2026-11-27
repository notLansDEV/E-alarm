import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

export type SnoozeSettings = { intervalMinutes: 1 | 5 | 10 | 15 | 20 | 25 | 30; times: 1 | 2 | 3 | 5 | 10 };
export type VolumeButtonAction = 'nothing' | 'snooze' | 'dismiss';

export type AppSettings = {
  vibrateOnAlarm: boolean;
  ascendingVolume: boolean;
  snooze: SnoozeSettings;
  volumeButtonAction: VolumeButtonAction;
  notificationBeforeRinging: boolean;
  showAlarmsOnLockScreen: boolean;
  autoSilenceMinutes: number;
  alarmRingtoneName: string | null;
  alarmRingtoneUri: string | null;
  timerRingtoneName: string | null;
  timerRingtoneUri: string | null;
};

type AppSettingsContextValue = {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
};

const defaultSettings: AppSettings = {
  vibrateOnAlarm: true,
  ascendingVolume: false,
  snooze: { intervalMinutes: 5, times: 3 },
  volumeButtonAction: 'snooze',
  notificationBeforeRinging: true,
  showAlarmsOnLockScreen: true,
  autoSilenceMinutes: 10,
  alarmRingtoneName: null,
  alarmRingtoneUri: null,
  timerRingtoneName: null,
  timerRingtoneUri: null,
};

const STORAGE_KEY = 'app-settings:v1';
const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: PropsWithChildren) {
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<AppSettings>;
          setSettings({ ...defaultSettings, ...parsed, snooze: { ...defaultSettings.snooze, ...parsed.snooze } });
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
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(settings)).catch(() => {});
  }, [settings]);

  const updateSettings = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(() => ({ settings, updateSettings }), [settings, updateSettings]);
  return <AppSettingsContext.Provider value={value}>{children}</AppSettingsContext.Provider>;
}

export function useAppSettings() {
  const ctx = useContext(AppSettingsContext);
  if (!ctx) throw new Error('useAppSettings must be used within AppSettingsProvider');
  return ctx;
}
