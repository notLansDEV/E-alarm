import { router } from 'expo-router';
import { Flag, MoreVertical, Pause, Play, RotateCcw } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useStopwatch } from '@/providers/stopwatch';

function formatElapsed(ms: number) {
  const totalCentis = Math.floor(ms / 10);
  const centis = totalCentis % 100;
  const totalSeconds = Math.floor(totalCentis / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(centis).padStart(2, '0')}`;
}

export default function StopwatchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { elapsedMs, running, laps, start, pause, reset, lap } = useStopwatch();
  const [showMenu, setShowMenu] = useState(false);

  const canLap = running;
  const canReset = !running && elapsedMs > 0;

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.four }]}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <ThemedText type="subtitle" style={styles.title}>Stopwatch</ThemedText>
        <View style={styles.headerSideRight}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="More options"
            onPress={() => setShowMenu((v) => !v)}
            style={[styles.iconButton, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
          >
            <MoreVertical color={theme.text} size={18} strokeWidth={2} />
          </Pressable>
          <Modal visible={showMenu} transparent animationType="fade" onRequestClose={() => setShowMenu(false)}>
            <Pressable style={styles.menuBackdrop} onPress={() => setShowMenu(false)}>
              <View style={[styles.menu, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
                <Pressable
                  accessibilityRole="button"
                  onPress={() => {
                    setShowMenu(false);
                    router.push('/settings');
                  }}
                  style={styles.menuItem}
                >
                  <ThemedText type="smallBold">Settings</ThemedText>
                </Pressable>
              </View>
            </Pressable>
          </Modal>
        </View>
      </View>

      <View style={styles.timerArea}>
        <ThemedText style={styles.time}>{formatElapsed(elapsedMs)}</ThemedText>
      </View>

      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={canReset ? 'Reset' : 'Lap'}
          onPress={canReset ? reset : lap}
          disabled={!canReset && !canLap}
          style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, opacity: !canReset && !canLap ? 0.4 : 1 }]}
        >
          {canReset ? <RotateCcw color={theme.text} size={22} strokeWidth={2} /> : <Flag color={theme.text} size={22} strokeWidth={2} />}
          <ThemedText type="smallBold">{canReset ? 'Reset' : 'Lap'}</ThemedText>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={running ? 'Pause' : 'Start'}
          onPress={running ? pause : start}
          style={[styles.primaryButton, { backgroundColor: theme.text }]}
        >
          {running ? <Pause color={theme.background} size={26} strokeWidth={2.2} /> : <Play color={theme.background} size={26} strokeWidth={2.2} />}
        </Pressable>
      </View>

      <View style={[styles.lapsContainer, { borderTopColor: theme.backgroundSelected }]}>
        <FlatList
          data={laps}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.lapsContent}
          ListEmptyComponent={<ThemedText themeColor="textSecondary" style={styles.emptyLaps}>Laps will appear here</ThemedText>}
          renderItem={({ item, index }) => (
            <View style={[styles.lapRow, { borderBottomColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">Lap {laps.length - index}</ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.lapTime}>{formatElapsed(item.lapMs)}</ThemedText>
              <ThemedText style={styles.lapTime}>{formatElapsed(item.totalMs)}</ThemedText>
            </View>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  headerSide: { width: 36 },
  headerSideRight: { width: 36, alignItems: 'flex-end' },
  title: { fontSize: 32, lineHeight: 38 },
  iconButton: { width: 36, height: 36, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 100, paddingRight: Spacing.four },
  menu: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.two, minWidth: 140, elevation: 4 },
  menuItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  timerArea: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.five },
  time: { fontSize: 56, lineHeight: 64, fontWeight: '600', fontVariant: ['tabular-nums'] },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four, marginBottom: Spacing.four },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.three, borderWidth: StyleSheet.hairlineWidth },
  primaryButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  lapsContainer: { flex: 1, borderTopWidth: StyleSheet.hairlineWidth },
  lapsContent: { paddingVertical: Spacing.two },
  emptyLaps: { textAlign: 'center', paddingVertical: Spacing.four },
  lapRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  lapTime: { fontVariant: ['tabular-nums'] },
});
