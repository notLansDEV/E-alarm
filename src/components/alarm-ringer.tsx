/* eslint-disable react-hooks/immutability -- expo-audio player is a mutable native object */
import { useAudioPlayer } from 'expo-audio';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, Vibration, View } from 'react-native';

import VolumeButton from '../../modules/volume-button/src/VolumeButtonModule';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAlarms } from '@/providers/alarms';
import { useAppSettings } from '@/providers/app-settings';
import type { Alarm } from '@/types/alarm';

function formatTime(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function dayKey(d: Date) {
  return ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][d.getDay()];
}

function shouldFire(alarm: Alarm, now: Date) {
  if (!alarm.enabled) return false;
  if (alarm.hour !== now.getHours() || alarm.minute !== now.getMinutes()) return false;
  if (alarm.repeat === 'once') return true;
  if (alarm.repeat === 'daily') return true;
  if (alarm.repeat === 'mon-fri') {
    const day = now.getDay();
    return day >= 1 && day <= 5;
  }
  if (alarm.repeat === 'custom') {
    const k = dayKey(now);
    return alarm.customDays.includes(k as any);
  }
  return false;
}

const defaultAlarmSound = require('../../assets/sounds/alarm.wav');

export function AlarmRinger() {
  const theme = useTheme();
  const { alarms, setAlarms } = useAlarms();
  const { settings } = useAppSettings();
  const player = useAudioPlayer(defaultAlarmSound);
  const [ringingAlarm, setRingingAlarm] = useState<Alarm | null>(null);
  const lastFiredRef = useRef<string>('');
  const snoozeCountsRef = useRef<Record<string, number>>({});
  const autoSilenceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumeRampRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearTimers = useCallback(() => {
    if (autoSilenceRef.current) {
      clearTimeout(autoSilenceRef.current);
      autoSilenceRef.current = null;
    }
    if (volumeRampRef.current) {
      clearInterval(volumeRampRef.current);
      volumeRampRef.current = null;
    }
  }, []);

  useEffect(() => {
    const check = () => {
      if (ringingAlarm) return;
      const now = new Date();
      const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;
      for (const alarm of alarms) {
        const fireKey = `${alarm.id}:${minuteKey}`;
        if (lastFiredRef.current === fireKey) continue;
        if (shouldFire(alarm, now)) {
          lastFiredRef.current = fireKey;
          setRingingAlarm(alarm);
          if (settings.vibrateOnAlarm) {
            Vibration.vibrate([0, 500, 500, 500, 500], true);
          }
          if (alarm.deleteAfterRinging && alarm.repeat === 'once') {
            setAlarms((prev) => prev.filter((a) => a.id !== alarm.id));
          }
          break;
        }
      }
    };

    check();
    const id = setInterval(check, 1000);
    return () => clearInterval(id);
  }, [alarms, ringingAlarm, setAlarms, settings.vibrateOnAlarm]);

  useEffect(() => {
    clearTimers();
    if (ringingAlarm) {
      try {
        const source = ringingAlarm.ringtoneUri
          ? { uri: ringingAlarm.ringtoneUri }
          : settings.alarmRingtoneUri
            ? { uri: settings.alarmRingtoneUri }
            : defaultAlarmSound;
        const startVolume = settings.ascendingVolume ? 0.2 : 1;
        const pl: any = player;
        pl.replace(source);
        pl.loop = true;
        pl.volume = startVolume;
        pl.seekTo(0);
        pl.play();

        if (settings.ascendingVolume) {
          let vol = startVolume;
          volumeRampRef.current = setInterval(() => {
            vol = Math.min(1, vol + 0.1);
            try {
                    pl.volume = vol;
            } catch {}
            if (vol >= 1 && volumeRampRef.current) {
              clearInterval(volumeRampRef.current);
              volumeRampRef.current = null;
            }
          }, 5000);
        }
      } catch {
        // ignore audio playback failures
      }

      const silenceMs = Math.max(1, settings.autoSilenceMinutes) * 60 * 1000;
      autoSilenceRef.current = setTimeout(() => {
        Vibration.cancel();
        setRingingAlarm(null);
      }, silenceMs);
    } else {
      try {
        player.pause();
        player.seekTo(0);
      } catch {
        // ignore
      }
    }

    return () => clearTimers();
     
  }, [ringingAlarm, player, settings.ascendingVolume, settings.autoSilenceMinutes, settings.alarmRingtoneUri, clearTimers]);

  const dismiss = useCallback(() => {
    Vibration.cancel();
    clearTimers();
    if (ringingAlarm) {
      const baseId = ringingAlarm.id.replace(/^snooze-.*?-/, '').replace(/^snooze-/, '');
      Object.keys(snoozeCountsRef.current).forEach((k) => {
        if (k.includes(baseId) || baseId.includes(k)) delete snoozeCountsRef.current[k];
      });
    }
    setRingingAlarm(null);
  }, [clearTimers, ringingAlarm]);

  const snooze = useCallback(() => {
    Vibration.cancel();
    clearTimers();
    if (ringingAlarm) {
      const snoozeKey = ringingAlarm.id;
      const count = (snoozeCountsRef.current[snoozeKey] ?? 0) + 1;
      if (count > settings.snooze.times) {
        setRingingAlarm(null);
        return;
      }
      const now = new Date();
      now.setMinutes(now.getMinutes() + settings.snooze.intervalMinutes);
      const snoozeId = `snooze-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      snoozeCountsRef.current[snoozeId] = count;
      const snoozeAlarm: Alarm = {
        ...ringingAlarm,
        id: snoozeId,
        hour: now.getHours(),
        minute: now.getMinutes(),
        repeat: 'once',
        customDays: [],
        deleteAfterRinging: true,
        label: ringingAlarm.label ? `${ringingAlarm.label} (Snooze)` : 'Snooze',
        enabled: true,
      };
      setAlarms((prev) => [...prev, snoozeAlarm]);
    }
    setRingingAlarm(null);
  }, [clearTimers, ringingAlarm, setAlarms, settings.snooze.intervalMinutes, settings.snooze.times]);

  const actionRef = useRef({ dismiss, snooze, action: settings.volumeButtonAction });
  useEffect(() => {
    actionRef.current = { dismiss, snooze, action: settings.volumeButtonAction };
  }, [dismiss, snooze, settings.volumeButtonAction]);

  useEffect(() => {
    const vb = VolumeButton;
    if (!vb) return;
    const active = !!ringingAlarm && settings.volumeButtonAction !== 'nothing';
    try {
      vb.setEnabled(active);
    } catch {}
    if (!active) return;
    const sub = vb.addListener('onVolumeButton', () => {
      const { action, dismiss: d, snooze: s } = actionRef.current;
      if (action === 'snooze') s();
      else if (action === 'dismiss') d();
    });
    return () => {
      try { sub.remove(); } catch {}
      try { vb.setEnabled(false); } catch {}
    };
  }, [ringingAlarm, settings.volumeButtonAction]);

  return (
    <Modal visible={!!ringingAlarm} transparent animationType="fade" onRequestClose={dismiss}>
      <View style={styles.backdrop}>
        <View style={[styles.card, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
          <ThemedText type="subtitle" style={styles.title}>Alarm</ThemedText>
          <ThemedText style={styles.time}>
            {ringingAlarm ? formatTime(ringingAlarm.hour, ringingAlarm.minute) : ''}
          </ThemedText>
          {ringingAlarm?.label ? (
            <ThemedText themeColor="textSecondary" style={styles.label}>{ringingAlarm.label}</ThemedText>
          ) : null}
          <View style={styles.actions}>
            <Pressable accessibilityRole="button" onPress={snooze} style={[styles.button, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">Snooze</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={dismiss} style={[styles.button, { borderColor: theme.text, backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>Dismiss</ThemedText>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: { fontSize: 24, lineHeight: 30 },
  time: { fontSize: 48, lineHeight: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  label: { textAlign: 'center' },
  actions: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.two, width: '100%' },
  button: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
