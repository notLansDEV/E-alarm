import { createAudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { AppState, Platform, Vibration } from 'react-native';

import { useAppSettings } from '@/providers/app-settings';
import TimerForegroundService from '../../modules/timer-foreground-service/src/TimerForegroundServiceModule';

type NotificationsModule = typeof import('expo-notifications');
let notifMod: NotificationsModule | null | undefined;
function getNotif(): NotificationsModule | null {
  if (notifMod !== undefined) return notifMod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notifMod = require('expo-notifications') as NotificationsModule;
  } catch { notifMod = null; }
  return notifMod;
}

const TIMER_NOTIF_ID = 'timer-running';
const TIMER_DONE_NOTIF_ID = 'timer-done';

function hasNativeTimerService() {
  return Platform.OS === 'android' && !!TimerForegroundService;
}

function formatNotifTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

let notifPermGranted: boolean | null = null;
let timerChannelSet = false;

async function ensureNotifPermission(Notifications: NotificationsModule) {
  if (notifPermGranted === true) return true;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') finalStatus = (await Notifications.requestPermissionsAsync()).status;
    notifPermGranted = finalStatus === 'granted';
    return notifPermGranted;
  } catch {
    return false;
  }
}

async function showOrUpdateTimerNotification(secondsLeft: number, isRunning: boolean) {
  const Notifications = getNotif();
  if (!Notifications) return;
  try {
    const ok = await ensureNotifPermission(Notifications);
    if (!ok) return;
    if (Platform.OS === 'android' && !timerChannelSet) {
      await Notifications.setNotificationChannelAsync('timer', {
        name: 'Timer',
        importance: Notifications.AndroidImportance.LOW,
        sound: null,
        vibrationPattern: null,
      });
      timerChannelSet = true;
    }
    await Notifications.scheduleNotificationAsync({
      identifier: TIMER_NOTIF_ID,
      content: {
        title: isRunning ? 'Timer running' : 'Timer paused',
        body: formatNotifTime(secondsLeft),
        sticky: true,
        autoDismiss: false,
        sound: false,
        ...(Platform.OS === 'android' ? { channelId: 'timer' } : {}),
      },
      trigger: null,
    });
  } catch {}
}

async function dismissTimerNotification() {
  const Notifications = getNotif();
  if (!Notifications) return;
  try { await Notifications.dismissNotificationAsync(TIMER_NOTIF_ID); } catch {}
  try { await Notifications.cancelScheduledNotificationAsync(TIMER_NOTIF_ID); } catch {}
}

let timerDoneChannelSet = false;
async function scheduleTimerDoneNotification(endAt: number) {
  const Notifications = getNotif();
  if (!Notifications) return;
  try {
    const ok = await ensureNotifPermission(Notifications);
    if (!ok) return;
    if (Platform.OS === 'android' && !timerDoneChannelSet) {
      await Notifications.setNotificationChannelAsync('timer-done', {
        name: 'Timer finished',
        importance: Notifications.AndroidImportance.HIGH,
        sound: 'default',
        vibrationPattern: [0, 500, 300, 500],
      });
      timerDoneChannelSet = true;
    }
    await Notifications.cancelScheduledNotificationAsync(TIMER_DONE_NOTIF_ID).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier: TIMER_DONE_NOTIF_ID,
      content: {
        title: 'Timer finished',
        body: '00:00:00',
        sound: 'default',
        ...(Platform.OS === 'android' ? { channelId: 'timer-done' } : {}),
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(endAt) },
    });
  } catch {}
}

async function cancelTimerDoneNotification() {
  const Notifications = getNotif();
  if (!Notifications) return;
  try { await Notifications.cancelScheduledNotificationAsync(TIMER_DONE_NOTIF_ID); } catch {}
  try { await Notifications.dismissNotificationAsync(TIMER_DONE_NOTIF_ID); } catch {}
}

type TimerContextValue = {
  remaining: number;
  running: boolean;
  configuredTotal: number;
  start: (totalSeconds?: number) => void;
  pause: () => void;
  reset: () => void;
};

const timerSound = require('../../assets/sounds/alarm.wav');

const TimerContext = createContext<TimerContextValue | null>(null);

export function TimerProvider({ children }: PropsWithChildren) {
  const { settings } = useAppSettings();
  const [remaining, setRemaining] = useState(0);
  const [running, setRunning] = useState(false);
  const [configuredTotal, setConfiguredTotal] = useState(0);
  const endAtRef = useRef<number | null>(null);
  const playerRef = useRef<ReturnType<typeof createAudioPlayer> | null>(null);
  const lastNotifSecondRef = useRef<number | null>(null);

  const stopSound = useCallback(() => {
    try {
      playerRef.current?.pause();
      playerRef.current?.seekTo(0);
    } catch {}
  }, []);

  const playSound = useCallback(() => {
    try {
      const source = settings.timerRingtoneUri ? { uri: settings.timerRingtoneUri } : timerSound;
      if (!playerRef.current) {
        playerRef.current = createAudioPlayer(source);
      } else {
        playerRef.current.replace(source);
      }
      const p = playerRef.current;
      p.loop = false;
      p.volume = 1;
      p.seekTo(0);
      p.play();
    } catch {}
  }, [settings.timerRingtoneUri]);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (endAtRef.current == null) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (lastNotifSecondRef.current !== left) {
        lastNotifSecondRef.current = left;
        if (!hasNativeTimerService()) {
          showOrUpdateTimerNotification(left, true).catch(() => {});
        }
      }
      if (left <= 0) {
        setRunning(false);
        endAtRef.current = null;
        if (hasNativeTimerService()) {
          try { TimerForegroundService!.stop(); } catch {}
          dismissTimerNotification().catch(() => {});
          cancelTimerDoneNotification().catch(() => {});
        } else {
          dismissTimerNotification().catch(() => {});
          cancelTimerDoneNotification().catch(() => {});
          Vibration.vibrate([0, 500, 300, 500]);
          playSound();
        }
      }
    };
    tick();
    const id = setInterval(tick, 250);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') tick();
    });
    return () => {
      clearInterval(id);
      sub.remove();
    };
  }, [running, playSound]);

  const start = useCallback((totalSeconds?: number) => {
    const total = remaining > 0 ? remaining : (totalSeconds ?? 0);
    if (total <= 0) return;
    stopSound();
    Vibration.cancel();
    if (remaining <= 0) setConfiguredTotal(totalSeconds ?? total);
    setRemaining(total);
    endAtRef.current = Date.now() + total * 1000;
    lastNotifSecondRef.current = total;
    setRunning(true);
    if (hasNativeTimerService()) {
      try { TimerForegroundService!.start(endAtRef.current); } catch {}
    } else {
      showOrUpdateTimerNotification(total, true).catch(() => {});
      scheduleTimerDoneNotification(endAtRef.current).catch(() => {});
    }
  }, [remaining, stopSound]);

  const pause = useCallback(() => {
    let left = remaining;
    if (endAtRef.current != null) {
      left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
    }
    endAtRef.current = null;
    setRunning(false);
    if (hasNativeTimerService()) {
      try { TimerForegroundService!.stop(); } catch {}
    } else {
      cancelTimerDoneNotification().catch(() => {});
      showOrUpdateTimerNotification(left, false).catch(() => {});
    }
  }, [remaining]);

  const reset = useCallback(() => {
    endAtRef.current = null;
    setRunning(false);
    setRemaining(0);
    setConfiguredTotal(0);
    stopSound();
    Vibration.cancel();
    if (hasNativeTimerService()) {
      try { TimerForegroundService!.stop(); } catch {}
    }
    cancelTimerDoneNotification().catch(() => {});
    dismissTimerNotification().catch(() => {});
  }, [stopSound]);

  const value = useMemo(() => ({ remaining, running, configuredTotal, start, pause, reset }), [remaining, running, configuredTotal, start, pause, reset]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
