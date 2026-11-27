import { router } from 'expo-router';
import { MoreVertical } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

export default function ClockScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [now, setNow] = useState(() => new Date());
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();

  const hourDeg = (hours % 12 + minutes / 60) * 30;
  const minuteDeg = (minutes + seconds / 60) * 6;
  const secondDeg = seconds * 6;

  const markers = useMemo(() => Array.from({ length: 12 }, (_, i) => i), []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.four }]}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <ThemedText type="subtitle" style={styles.title}>Clock</ThemedText>
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

      <View style={styles.center}>
        <View style={[styles.clockFace, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}>
          {markers.map((i) => {
            const deg = i * 30;
            const isQuarter = i % 3 === 0;
            return (
              <View key={i} style={[styles.markerWrap, { transform: [{ rotate: `${deg}deg` }] }]}>
                <View
                  style={[
                    styles.marker,
                    {
                      height: isQuarter ? 14 : 8,
                      width: isQuarter ? 3 : 2,
                      backgroundColor: isQuarter ? theme.text : theme.textSecondary,
                    },
                  ]}
                />
              </View>
            );
          })}

          <View style={[styles.hand, styles.hourHand, { transform: [{ rotate: `${hourDeg}deg` }] }]}>
            <View style={[styles.hourHandInner, { backgroundColor: theme.text }]} />
          </View>
          <View style={[styles.hand, styles.minuteHand, { transform: [{ rotate: `${minuteDeg}deg` }] }]}>
            <View style={[styles.minuteHandInner, { backgroundColor: theme.text }]} />
          </View>
          <View style={[styles.hand, styles.secondHand, { transform: [{ rotate: `${secondDeg}deg` }] }]}>
            <View style={[styles.secondHandInner, { backgroundColor: '#E11D48' }]} />
          </View>
          <View style={[styles.centerDot, { backgroundColor: theme.text, borderColor: theme.background }]} />
        </View>

        <ThemedText style={styles.digitalTime}>
          {pad2(hours === 0 ? 24 : hours)}:{pad2(minutes)}:{pad2(seconds)}
        </ThemedText>
      </View>
    </View>
  );
}

const CLOCK_SIZE = 280;
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.four },
  headerSide: { width: 36 },
  headerSideRight: { width: 36, alignItems: 'flex-end' },
  title: { fontSize: 32, lineHeight: 38 },
  iconButton: { width: 36, height: 36, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 100, paddingRight: Spacing.four },
  menu: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.two, minWidth: 140, elevation: 4 },
  menuItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.four, paddingBottom: Spacing.six },
  clockFace: {
    width: CLOCK_SIZE,
    height: CLOCK_SIZE,
    borderRadius: CLOCK_SIZE / 2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerWrap: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: CLOCK_SIZE / 2 - 2,
    width: 4,
    alignItems: 'center',
  },
  marker: { marginTop: 10, borderRadius: 2 },
  hand: { position: 'absolute', width: 4, height: CLOCK_SIZE, alignItems: 'center' },
  hourHand: {},
  hourHandInner: { width: 6, height: 72, borderRadius: 3, marginTop: 62 },
  minuteHand: {},
  minuteHandInner: { width: 4, height: 96, borderRadius: 2, marginTop: 40 },
  secondHand: {},
  secondHandInner: { width: 2, height: 110, borderRadius: 1, marginTop: 30 },
  centerDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  digitalTime: { fontSize: 36, lineHeight: 44, fontWeight: '600', fontVariant: ['tabular-nums'] },
});
