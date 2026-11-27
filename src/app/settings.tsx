import Constants from 'expo-constants';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
import { Check, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react-native';
import { useCallback, useState } from 'react';
import { Linking, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAppSettings } from '@/providers/app-settings';
import { useThemePreference } from '@/providers/theme-preference';

const AUTO_SILENCE_OPTIONS = [1, 5, 10, 15, 20, 30];

function Row({
  label,
  value,
  onPress,
  showChevron = true,
}: {
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      onPress={onPress}
      disabled={!onPress}
      style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
    >
      <ThemedText type="smallBold" style={styles.rowLabel}>{label}</ThemedText>
      <View style={styles.rowRight}>
        {value ? <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>{value}</ThemedText> : null}
        {showChevron && onPress ? <ChevronRight color={theme.textSecondary} size={18} strokeWidth={2} /> : null}
      </View>
    </Pressable>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { settings, updateSettings } = useAppSettings();
  const { preference, setPreference } = useThemePreference();
  const [showAutoSilence, setShowAutoSilence] = useState(false);
  const [showTheme, setShowTheme] = useState(false);

  const openSystemTime = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.DATE_SETTINGS').catch(() => Linking.openSettings());
    } else {
      Linking.openSettings().catch(() => {});
    }
  }, []);

  const openSoundSettings = useCallback(() => {
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.SOUND_SETTINGS').catch(() => Linking.openSettings());
    } else {
      Linking.openSettings().catch(() => {});
    }
  }, []);

  const pickRingtone = useCallback(async (kind: 'alarm' | 'timer') => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    if (kind === 'alarm') updateSettings({ alarmRingtoneName: asset.name, alarmRingtoneUri: asset.uri });
    else updateSettings({ timerRingtoneName: asset.name, timerRingtoneUri: asset.uri });
  }, [updateSettings]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.two }]}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft color={theme.text} size={24} strokeWidth={2} />
        </Pressable>
        <ThemedText type="subtitle" style={styles.title}>Settings</ThemedText>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>Settings</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <Row
            label="Theme"
            value={preference === 'light' ? 'Light' : preference === 'dark' ? 'Dark' : 'System'}
            onPress={() => setShowTheme(true)}
          />
          <Row label="Edit system time" onPress={openSystemTime} />
          <Row label="Alarm ringtone" value={settings.alarmRingtoneName ?? 'Default'} onPress={() => pickRingtone('alarm')} />
          <Row label="Timer ringtone" value={settings.timerRingtoneName ?? 'Default'} onPress={() => pickRingtone('timer')} />
          <Row label="Ringtone volume" onPress={openSoundSettings} />
          <Row label="Auto silence" value={`${settings.autoSilenceMinutes} min`} onPress={() => setShowAutoSilence(true)} />
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push('/additional-alarm-settings')}
            style={[styles.row, { borderBottomWidth: 0 }]}
          >
            <ThemedText type="smallBold" style={styles.rowLabel}>Additional alarm settings</ThemedText>
            <ChevronRight color={theme.textSecondary} size={18} strokeWidth={2} />
          </Pressable>
        </View>

        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionTitle}>About</ThemedText>
        <View style={[styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
          <Pressable
            accessibilityRole="link"
            onPress={() => Linking.openURL('https://github.com/notLansDEV/E-alarm')}
            style={[styles.row, { borderBottomColor: theme.backgroundSelected }]}
          >
            <View style={styles.githubRow}>
              <ExternalLink color={theme.text} size={18} strokeWidth={2} />
              <ThemedText type="smallBold">Project on Github</ThemedText>
            </View>
            <ChevronRight color={theme.textSecondary} size={18} strokeWidth={2} />
          </Pressable>
          <View style={[styles.row, { borderBottomWidth: 0 }]}>
            <ThemedText type="smallBold" style={styles.rowLabel}>App version</ThemedText>
            <ThemedText themeColor="textSecondary" type="small">
              v{Constants.expoConfig?.version ?? Constants.manifest2?.extra?.expoClient?.version ?? '1.0.0'}
            </ThemedText>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showAutoSilence} transparent animationType="fade" onRequestClose={() => setShowAutoSilence(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowAutoSilence(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]} onPress={() => {}}>
            <ThemedText type="default" style={styles.modalTitle}>Auto silence</ThemedText>
            {AUTO_SILENCE_OPTIONS.map((min) => {
              const active = settings.autoSilenceMinutes === min;
              return (
                <Pressable
                  key={min}
                  accessibilityRole="button"
                  onPress={() => updateSettings({ autoSilenceMinutes: min })}
                  style={[styles.optionRow, { borderColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" style={{ color: active ? theme.text : theme.textSecondary }}>{min} minutes</ThemedText>
                  {active ? <View style={[styles.dot, { backgroundColor: theme.text }]} /> : null}
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setShowAutoSilence(false)} style={[styles.modalDone, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>Done</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showTheme} transparent animationType="fade" onRequestClose={() => setShowTheme(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setShowTheme(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]} onPress={() => {}}>
            <ThemedText type="default" style={styles.modalTitle}>Theme</ThemedText>
            {(['light', 'dark', 'system'] as const).map((opt) => {
              const labels = { light: 'Light', dark: 'Dark', system: 'System' } as const;
              const active = preference === opt;
              return (
                <Pressable key={opt} accessibilityRole="button" onPress={() => setPreference(opt)} style={[styles.optionRow, { borderColor: theme.backgroundSelected }]}>
                  <ThemedText type="smallBold" style={{ color: active ? theme.text : theme.textSecondary }}>{labels[opt]}</ThemedText>
                  {active ? <Check color={theme.text} size={16} strokeWidth={2.2} /> : null}
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setShowTheme(false)} style={[styles.modalDone, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>Done</ThemedText>
            </Pressable>
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
  title: { fontSize: 24, lineHeight: 30 },
  content: { padding: Spacing.three, gap: Spacing.two, paddingBottom: Spacing.six },
  sectionTitle: { marginTop: Spacing.one, marginBottom: Spacing.half, marginLeft: Spacing.one },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.three, borderBottomWidth: StyleSheet.hairlineWidth, gap: Spacing.two },
  rowLabel: { flex: 1 },
  rowRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, maxWidth: '55%', justifyContent: 'flex-end' },
  githubRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: Spacing.four },
  modalCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  modalTitle: { fontWeight: '600', marginBottom: Spacing.one },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  dot: { width: 8, height: 8, borderRadius: 4 },
  modalDone: { marginTop: Spacing.two, borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: 'center' },
});
