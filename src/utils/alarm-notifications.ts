import { Platform } from 'react-native';

import type { Alarm } from '@/types/alarm';

type NotificationsModule = typeof import('expo-notifications');

let notificationsModule: NotificationsModule | null | undefined;
let handlerSet = false;

function getNotifications(): NotificationsModule | null {
  if (notificationsModule !== undefined) return notificationsModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    notificationsModule = require('expo-notifications') as NotificationsModule;
  } catch {
    notificationsModule = null;
  }
  return notificationsModule;
}

function ensureHandler() {
  if (handlerSet) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  try {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    handlerSet = true;
  } catch {
    // ignore in unsupported environments
  }
}

function nextOccurrence(alarm: Alarm): Date | null {
  const now = new Date();
  for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
    const d = new Date(now);
    d.setDate(now.getDate() + dayOffset);
    d.setHours(alarm.hour, alarm.minute, 0, 0);
    if (d.getTime() <= now.getTime()) continue;
    const weekday = d.getDay();
    const key = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][weekday];
    if (alarm.repeat === 'once') return d;
    if (alarm.repeat === 'daily') return d;
    if (alarm.repeat === 'mon-fri' && weekday >= 1 && weekday <= 5) return d;
    if (alarm.repeat === 'custom' && alarm.customDays.includes(key as any)) return d;
  }
  return null;
}

export async function syncAlarmNotifications(alarms: Alarm[], showOnLockScreen = true, notifyBefore = false) {
  try {
    const Notifications = getNotifications();
    if (!Notifications) return;
    ensureHandler();

    const { status } = await Notifications.getPermissionsAsync();
    let finalStatus = status;
    if (status !== 'granted') {
      const req = await Notifications.requestPermissionsAsync();
      finalStatus = req.status;
    }
    if (finalStatus !== 'granted') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('alarms', {
        name: 'Alarms',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
        vibrationPattern: [0, 500, 500, 500],
        lockscreenVisibility: showOnLockScreen
          ? Notifications.AndroidNotificationVisibility.PUBLIC
          : Notifications.AndroidNotificationVisibility.PRIVATE,
      });
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const alarm of alarms.filter((a) => a.enabled)) {
      const date = nextOccurrence(alarm);
      if (!date) continue;
      await Notifications.scheduleNotificationAsync({
        content: {
          title: alarm.label?.trim() || 'Alarm',
          body: 'Your alarm is ringing.',
          sound: 'default',
          ...(Platform.OS === 'android' ? { channelId: 'alarms' } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date,
        },
      });

      if (notifyBefore) {
        const beforeDate = new Date(date.getTime() - 10 * 60 * 1000);
        if (beforeDate.getTime() > Date.now()) {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: alarm.label?.trim() || 'Alarm',
              body: 'Alarm will ring in 10 minutes.',
              sound: 'default',
              ...(Platform.OS === 'android' ? { channelId: 'alarms' } : {}),
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.DATE,
              date: beforeDate,
            },
          });
        }
      }
    }
  } catch {
    // notifications may be unavailable in Expo Go or without permissions
  }
}
