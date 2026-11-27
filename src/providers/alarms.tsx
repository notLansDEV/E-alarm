import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import type { Alarm } from '@/types/alarm';
import { useAppSettings } from '@/providers/app-settings';
import { syncAlarmNotifications } from '@/utils/alarm-notifications';

const STORAGE_KEY = 'alarms:v1';

type AlarmsContextValue = {
  alarms: Alarm[];
  setAlarms: React.Dispatch<React.SetStateAction<Alarm[]>>;
  loaded: boolean;
};

const AlarmsContext = createContext<AlarmsContextValue | null>(null);

export function AlarmsProvider({ children }: PropsWithChildren) {
  const { settings } = useAppSettings();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Alarm[];
          if (Array.isArray(parsed)) setAlarms(parsed);
        }
      } catch {
        // ignore corrupted storage
      } finally {
        loadedRef.current = true;
        setLoaded(true);
      }
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    syncAlarmNotifications(alarms, settings.showAlarmsOnLockScreen, settings.notificationBeforeRinging).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded]);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(alarms)).catch(() => {});
    syncAlarmNotifications(alarms, settings.showAlarmsOnLockScreen, settings.notificationBeforeRinging).catch(() => {});
  }, [alarms, settings.showAlarmsOnLockScreen, settings.notificationBeforeRinging]);

  const value = useMemo(() => ({ alarms, setAlarms, loaded }), [alarms, loaded]);
  return <AlarmsContext.Provider value={value}>{children}</AlarmsContext.Provider>;
}

export function useAlarms() {
  const ctx = useContext(AlarmsContext);
  if (!ctx) throw new Error('useAlarms must be used within AlarmsProvider');
  return ctx;
}
