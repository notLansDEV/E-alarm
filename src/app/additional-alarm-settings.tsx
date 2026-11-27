import { Host, Slider } from '@expo/ui';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppSettings, type SnoozeSettings, type VolumeButtonAction } from '@/providers/app-settings';

const INTERVAL_OPTIONS: SnoozeSettings['intervalMinutes'][] = [1, 5, 10, 15, 20, 25, 30];
const TIMES_OPTIONS: SnoozeSettings['times'][] = [1, 2, 3, 5, 10];
const VOLUME_ACTIONS: { value: VolumeButtonAction; label: string }[] = [
  { value: 'nothing', label: 'Do nothing' },
  { value: 'snooze', label: 'Snooze' },
  { value: 'dismiss', label: 'Dismiss' },
];

function ToggleRow({
  label,
  description,
  value,
  onValueChange,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {description ? <ThemedText themeColor="textSecondary" type="small">{description}</ThemedText> : null}
      </View>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function NavRow({ label, value, onPress }: { label: string; value?: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}>
      <View style={styles.rowText}>
        <ThemedText type="smallBold">{label}</ThemedText>
        {value ? <ThemedText themeColor="textSecondary" type="small">{value}</ThemedText> : null}
      </View>
      <ChevronRight color={theme.textSecondary} size={18} strokeWidth={2} />
    </Pressable>
  );
}

export default function AdditionalAlarmSettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useAppSettings();

  const [showSnooze, setShowSnooze] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [draftIntervalIndex, setDraftIntervalIndex] = useState(0);
  const [draftTimesIndex, setDraftTimesIndex] = useState(0);

  const openSnooze = () => {
    setDraftIntervalIndex(Math.max(0, INTERVAL_OPTIONS.indexOf(settings.snooze.intervalMinutes)));
    setDraftTimesIndex(Math.max(0, TIMES_OPTIONS.indexOf(settings.snooze.times)));
    setShowSnooze(true);
  };

  const saveSnooze = () => {
    updateSettings({
      snooze: {
        intervalMinutes: INTERVAL_OPTIONS[draftIntervalIndex],
        times: TIMES_OPTIONS[draftTimesIndex],
      },
    });
    setShowSnooze(false);
  };

  const volumeLabel = VOLUME_ACTIONS.find((a) => a.value === settings.volumeButtonAction)?.label ?? 'Snooze';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={24} strokeWidth={2} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.title}>Additional settings</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <ToggleRow
            label="Vibrate when alarm goes off"
            value={settings.vibrateOnAlarm}
            onValueChange={(v) => updateSettings({ vibrateOnAlarm: v })}
          />

          <ToggleRow
            label="Ascending volume"
            description="Alarm volume rises gradually."
            value={settings.ascendingVolume}
            onValueChange={(v) => updateSettings({ ascendingVolume: v })}
          />
          <NavRow
            label="Snooze"
            value={`${settings.snooze.intervalMinutes} min, ${settings.snooze.times} times`}
            onPress={openSnooze}
          />
          <NavRow label="Volume buttons" value={volumeLabel} onPress={() => setShowVolume(true)} />
          <ToggleRow
            label="Notification before ringing"
            description="Show notification before alarms go off."
            value={settings.notificationBeforeRinging}
            onValueChange={(v) => updateSettings({ notificationBeforeRinging: v })}
          />
          <View style={{ borderBottomWidth: 0 }}>
            <ToggleRow
              label="Show alarms on Lock screen"
              description="Display alarms set to go off within 12 hours on the lock screen."
              value={settings.showAlarmsOnLockScreen}
              onValueChange={(v) => updateSettings({ showAlarmsOnLockScreen: v })}
            />
          </View>
        </View>
      </ScrollView>

      <Modal visible={showSnooze} transparent animationType="fade" onRequestClose={() => setShowSnooze(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowSnooze(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]} onPress={() => {}}>
            <ThemedText type="default" style={styles.modalTitle}>Snooze</ThemedText>

            <ThemedText type="smallBold">Interval: {INTERVAL_OPTIONS[draftIntervalIndex]} minutes</ThemedText>
            <Host style={styles.sliderHost}>
              <Slider
                value={draftIntervalIndex}
                min={0}
                max={INTERVAL_OPTIONS.length - 1}
                step={1}
                onValueChange={(v) => setDraftIntervalIndex(Math.round(v))}
              />
            </Host>

            <ThemedText type="smallBold" style={{ marginTop: Spacing.two }}>Times: {TIMES_OPTIONS[draftTimesIndex]}</ThemedText>
            <Host style={styles.sliderHost}>
              <Slider
                value={draftTimesIndex}
                min={0}
                max={TIMES_OPTIONS.length - 1}
                step={1}
                onValueChange={(v) => setDraftTimesIndex(Math.round(v))}
              />
            </Host>

            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setShowSnooze(false)} style={[styles.modalAction, { borderColor: theme.backgroundSelected }]}>
                <ThemedText type="smallBold">Cancel</ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={saveSnooze} style={[styles.modalAction, { backgroundColor: theme.text, borderColor: theme.text }]}>
                <ThemedText type="smallBold" style={{ color: theme.background }}>OK</ThemedText>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showVolume} transparent animationType="fade" onRequestClose={() => setShowVolume(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowVolume(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]} onPress={() => {}}>
            <ThemedText type="default" style={styles.modalTitle}>Volume buttons</ThemedText>
            {VOLUME_ACTIONS.map((action) => {
              const active = settings.volumeButtonAction === action.value;
              return (
                <Pressable
                  key={action.value}
                  accessibilityRole="button"
                  onPress={() => { updateSettings({ volumeButtonAction: action.value }); setShowVolume(false); }}
                  style={[styles.optionRow, { borderColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" style={{ color: active ? theme.text : theme.textSecondary }}>{action.label}</ThemedText>
                  {active ? <View style={[styles.dot, { backgroundColor: theme.text }]} /> : null}
                </Pressable>
              );
            })}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.two, paddingBottom: Spacing.two },
  backButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, lineHeight: 28 },
  content: { padding: Spacing.three, paddingBottom: Spacing.six },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.three },
  rowText: { flex: 1, gap: 2 },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: Spacing.four },
  modalCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.two },
  modalTitle: { fontWeight: '600', marginBottom: Spacing.one },
  sliderHost: { height: 44, width: '100%' },
  modalActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: Spacing.two, marginTop: Spacing.two },
  modalAction: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
