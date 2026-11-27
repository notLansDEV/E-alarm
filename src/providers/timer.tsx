import { createAudioPlayer } from 'expo-audio';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';
import { Vibration } from 'react-native';

import { useAppSettings } from '@/providers/app-settings';

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
    const id = setInterval(() => {
      if (endAtRef.current == null) return;
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
      if (left <= 0) {
        setRunning(false);
        endAtRef.current = null;
        Vibration.vibrate([0, 500, 300, 500]);
        playSound();
      }
    }, 250);
    return () => clearInterval(id);
  }, [running, playSound]);

  const start = useCallback((totalSeconds?: number) => {
    const total = remaining > 0 ? remaining : (totalSeconds ?? 0);
    if (total <= 0) return;
    stopSound();
    Vibration.cancel();
    if (remaining <= 0) setConfiguredTotal(totalSeconds ?? total);
    setRemaining(total);
    endAtRef.current = Date.now() + total * 1000;
    setRunning(true);
  }, [remaining, stopSound]);

  const pause = useCallback(() => {
    if (endAtRef.current != null) {
      const left = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(left);
    }
    endAtRef.current = null;
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    endAtRef.current = null;
    setRunning(false);
    setRemaining(0);
    setConfiguredTotal(0);
    stopSound();
    Vibration.cancel();
  }, [stopSound]);

  const value = useMemo(() => ({ remaining, running, configuredTotal, start, pause, reset }), [remaining, running, configuredTotal, start, pause, reset]);
  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer() {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error('useTimer must be used within TimerProvider');
  return ctx;
}
