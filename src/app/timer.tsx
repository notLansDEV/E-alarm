import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { Check, MoreVertical, Pause, Play, Plus, RotateCcw, Trash2, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { TimeWheelPicker } from '@/components/time-wheel-picker';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useBottomBar } from '@/providers/bottom-bar';
import { useTimer } from '@/providers/timer';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const SECONDS = Array.from({ length: 60 }, (_, i) => i);
const PRESETS_KEY = 'timer-presets:v1';

type Preset = { id: string; seconds: number };

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad2(h)}:${pad2(m)}:${pad2(s)}`;
}

function CircleProgress({ progress, size, strokeWidth, color, trackColor }: { progress: number; size: number; strokeWidth: number; color: string; trackColor: string }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = c * (1 - clamped);
  return (
    <Svg width={size} height={size}>
      <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
      <Circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        strokeDashoffset={offset}
        strokeLinecap="round"
        rotation="-90"
        origin={`${size / 2}, ${size / 2}`}
      />
    </Svg>
  );
}

export default function TimerScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { setOverride } = useBottomBar();

  const { remaining, running, configuredTotal, start: startTimer, pause, reset } = useTimer();
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [customPresets, setCustomPresets] = useState<Preset[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showMenu, setShowMenu] = useState(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PRESETS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Preset[];
          if (Array.isArray(parsed)) setCustomPresets(parsed.filter((p) => p && typeof p.seconds === 'number' && p.seconds > 0));
        }
      } catch {}
      finally { loadedRef.current = true; }
    })();
  }, []);

  useEffect(() => {
    if (!loadedRef.current) return;
    AsyncStorage.setItem(PRESETS_KEY, JSON.stringify(customPresets)).catch(() => {});
  }, [customPresets]);

  const selectedTotal = useMemo(() => hours * 3600 + minutes * 60 + seconds, [hours, minutes, seconds]);

  const start = useCallback(() => {
    if (remaining > 0) {
      startTimer();
      return;
    }
    if (selectedTotal <= 0) return;
    startTimer(selectedTotal);
  }, [remaining, selectedTotal, startTimer]);

  const applyPreset = useCallback((totalSeconds: number) => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    setHours(h);
    setMinutes(m);
    setSeconds(s);
    reset();
  }, [reset]);

  const addPreset = useCallback(() => {
    if (selectedTotal <= 0) return;
    setCustomPresets((prev) => {
      if (prev.some((p) => p.seconds === selectedTotal)) return prev;
      return [...prev, { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, seconds: selectedTotal }];
    });
  }, [selectedTotal]);

  const enterSelectionMode = useCallback((id: string) => {
    setSelectionMode(true);
    setSelectedIds(new Set([id]));
  }, []);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      if (next.size === 0) setSelectionMode(false);
      return next;
    });
  }, []);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

  const deleteSelected = useCallback(() => {
    setCustomPresets((prev) => prev.filter((p) => !selectedIds.has(p.id)));
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds]);

  useEffect(() => {
    if (!selectionMode) {
      setOverride(null);
      return;
    }
    setOverride(
      <View style={[styles.deleteBar, { backgroundColor: theme.backgroundElement, borderTopColor: theme.backgroundSelected, paddingBottom: insets.bottom + Spacing.two }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cancel selection" onPress={cancelSelection} hitSlop={8} style={styles.deleteBarBtn}>
          <X color={theme.text} size={22} strokeWidth={2} />
          <ThemedText type="smallBold">Cancel</ThemedText>
        </Pressable>
        <ThemedText type="smallBold">{selectedIds.size} selected</ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel="Delete selected presets" onPress={deleteSelected} hitSlop={8} style={styles.deleteBarBtn}>
          <Trash2 color="#E11D48" size={22} strokeWidth={2} />
          <ThemedText type="smallBold" style={{ color: '#E11D48' }}>Delete</ThemedText>
        </Pressable>
      </View>
    );
    return () => setOverride(null);
  }, [selectionMode, selectedIds, cancelSelection, deleteSelected, insets.bottom, setOverride, theme.backgroundElement, theme.backgroundSelected, theme.text]);

  const timerActive = running || remaining > 0;
  const total = configuredTotal > 0 ? configuredTotal : selectedTotal;
  const progress = total > 0 ? remaining / total : 0;
  const display = formatTime(timerActive ? remaining : selectedTotal);

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top + Spacing.four }]}>
      <View style={styles.header}>
        <View style={styles.headerSide} />
        <ThemedText type="subtitle" style={styles.title}>Timer</ThemedText>
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

      {timerActive ? (
        <View style={styles.runningContainer}>
          <View style={styles.circleWrap}>
            <CircleProgress progress={progress} size={280} strokeWidth={12} color={theme.text} trackColor={theme.backgroundSelected} />
            <View style={styles.circleCenter}>
              <ThemedText style={styles.circleTime}>{formatTime(remaining)}</ThemedText>
            </View>
          </View>
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Reset" onPress={reset} style={[styles.secondaryButton, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <RotateCcw color={theme.text} size={22} strokeWidth={2} />
              <ThemedText type="smallBold">Reset</ThemedText>
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={running ? 'Pause' : 'Resume'} onPress={running ? pause : start} style={[styles.primaryButton, { backgroundColor: theme.text }]}>
              {running ? <Pause color={theme.background} size={26} strokeWidth={2.2} /> : <Play color={theme.background} size={26} strokeWidth={2.2} />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.setupContainer}>
          <View style={styles.displayArea}>
            <ThemedText style={styles.display}>{display}</ThemedText>
          </View>

          <View style={styles.pickerRow}>
            <View style={styles.pickerCol}>
              <ThemedText themeColor="textSecondary" style={styles.pickerLabel}>Hours</ThemedText>
              <TimeWheelPicker values={HOURS} selected={hours} onChange={setHours} formatValue={pad2} width={96} itemHeight={56} visibleItems={5} loop fontSize={32} />
            </View>
            <ThemedText style={styles.separator}>:</ThemedText>
            <View style={styles.pickerCol}>
              <ThemedText themeColor="textSecondary" style={styles.pickerLabel}>Minutes</ThemedText>
              <TimeWheelPicker values={MINUTES} selected={minutes} onChange={setMinutes} formatValue={pad2} width={96} itemHeight={56} visibleItems={5} loop fontSize={32} />
            </View>
            <ThemedText style={styles.separator}>:</ThemedText>
            <View style={styles.pickerCol}>
              <ThemedText themeColor="textSecondary" style={styles.pickerLabel}>Seconds</ThemedText>
              <TimeWheelPicker values={SECONDS} selected={seconds} onChange={setSeconds} formatValue={pad2} width={96} itemHeight={56} visibleItems={5} loop fontSize={32} />
            </View>
          </View>

          <View style={styles.controls}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Start"
              onPress={start}
              disabled={selectedTotal <= 0}
              style={[styles.primaryButton, { backgroundColor: theme.text, opacity: selectedTotal <= 0 ? 0.4 : 1 }]}
            >
              <Play color={theme.background} size={26} strokeWidth={2.2} />
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={styles.presets} showsVerticalScrollIndicator={false}>
            <Pressable
              accessibilityRole="button"
              onPress={() => applyPreset(300)}
              style={[styles.presetCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}
            >
              <ThemedText type="default" style={{ fontWeight: '600' }}>00:05:00</ThemedText>
              <ThemedText themeColor="textSecondary" type="small">5 minute timer</ThemedText>
            </Pressable>

            {customPresets.map((preset) => {
              const selected = selectedIds.has(preset.id);
              return (
                <Pressable
                  key={preset.id}
                  accessibilityRole="button"
                  delayLongPress={250}
                  onLongPress={() => enterSelectionMode(preset.id)}
                  onPress={() => {
                    if (selectionMode) toggleSelect(preset.id);
                    else applyPreset(preset.seconds);
                  }}
                  style={[
                    styles.presetCard,
                    {
                      backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
                      borderColor: selected ? theme.text : theme.backgroundSelected,
                    },
                  ]}
                >
                  <View style={styles.presetRow}>
                    {selectionMode ? (
                      <View style={[styles.selectCircle, { borderColor: selected ? theme.text : theme.textSecondary, backgroundColor: selected ? theme.text : 'transparent' }]}>
                        {selected ? <Check color={theme.background} size={14} strokeWidth={2.5} /> : null}
                      </View>
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <ThemedText type="default" style={{ fontWeight: '600' }}>{formatTime(preset.seconds)}</ThemedText>
                      <ThemedText themeColor="textSecondary" type="small">Custom timer</ThemedText>
                    </View>
                  </View>
                </Pressable>
              );
            })}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Add custom timer preset"
              onPress={addPreset}
              disabled={selectedTotal <= 0}
              style={[styles.presetCard, styles.addCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected, opacity: selectedTotal <= 0 ? 0.5 : 1 }]}
            >
              <Plus color={theme.text} size={20} strokeWidth={2} />
              <ThemedText type="smallBold">Add timer</ThemedText>
            </Pressable>
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, marginBottom: Spacing.three },
  headerSide: { width: 36 },
  headerSideRight: { width: 36, alignItems: 'flex-end' },
  title: { fontSize: 32, lineHeight: 38 },
  iconButton: { width: 36, height: 36, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 100, paddingRight: Spacing.four },
  menu: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.two, minWidth: 140, elevation: 4 },
  menuItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  setupContainer: { flex: 1, paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, gap: Spacing.three },
  content: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.six, gap: Spacing.four },
  displayArea: { alignItems: 'center', paddingVertical: Spacing.two },
  display: { fontSize: 48, lineHeight: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.one },
  pickerCol: { alignItems: 'center', gap: Spacing.one },
  pickerLabel: { fontSize: 12 },
  separator: { fontSize: 32, lineHeight: 40, fontWeight: '600', marginTop: Spacing.four },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.three, borderWidth: StyleSheet.hairlineWidth },
  primaryButton: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  presets: { gap: Spacing.two },
  presetCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, padding: Spacing.three, gap: 2 },
  addCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.two },
  presetRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  selectCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  runningContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.five, paddingBottom: Spacing.six },
  circleWrap: { width: 280, height: 280, alignItems: 'center', justifyContent: 'center' },
  circleCenter: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  circleTime: { fontSize: 44, lineHeight: 52, fontWeight: '700', fontVariant: ['tabular-nums'] },
  deleteBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.four, paddingTop: Spacing.two, borderTopWidth: StyleSheet.hairlineWidth },
  deleteBarBtn: { alignItems: 'center', justifyContent: 'center', gap: 2, minWidth: 64 },
});
