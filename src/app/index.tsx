import { router } from 'expo-router';
import { AlarmClock, Check, Headphones, MoreVertical, Plus, Trash2, X } from 'lucide-react-native';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AddAlarmSheet } from '@/components/add-alarm-sheet';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useEarphoneStatus } from '@/hooks/use-earphone-status';
import { useTheme } from '@/hooks/use-theme';
import { useAlarms } from '@/providers/alarms';
import { useBottomBar } from '@/providers/bottom-bar';
import type { Alarm, RepeatOption, Weekday } from '@/types/alarm';

function formatTime(hour: number, minute: number) {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
}

function repeatSummary(repeat: RepeatOption, customDays: Weekday[]) {
  if (repeat === 'once') return 'Once';
  if (repeat === 'daily') return 'Daily';
  if (repeat === 'mon-fri') return 'Mon to Fri';
  if (customDays.length === 0) return 'Custom';
  const map: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  return customDays.map((d) => map[d]).join(', ');
}

function createAlarm(data: Omit<Alarm, 'id' | 'enabled'>): Alarm {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    enabled: true,
    ...data,
  };
}

function getNextAlarmLabel(alarms: Alarm[], now: Date) {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0) return null;

  let bestMs: number | null = null;
  for (const alarm of enabled) {
    const target = new Date(now);
    target.setHours(alarm.hour, alarm.minute, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    const diff = target.getTime() - now.getTime();
    if (bestMs === null || diff < bestMs) bestMs = diff;
  }

  if (bestMs === null) return null;
  const totalMinutes = Math.max(0, Math.round(bestMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `Alarm in ${hours} hours ${minutes} minutes`;
}

type AlarmRowProps = {
  alarm: Alarm;
  selected: boolean;
  selectionMode: boolean;
  textColor: string;
  mutedColor: string;
  bg: string;
  selectedBg: string;
  border: string;
  selectedBorder: string;
  checkColor: string;
  onLongPress: (id: string) => void;
  onPress: (alarm: Alarm) => void;
  onToggleSelect: (id: string) => void;
  onToggle: (id: string, enabled: boolean) => void;
};

const AlarmRow = memo(function AlarmRow({
  alarm, selected, selectionMode, textColor, mutedColor, bg, selectedBg, border, selectedBorder, checkColor,
  onLongPress, onPress, onToggleSelect, onToggle,
}: AlarmRowProps) {
  const details = [alarm.label.trim(), repeatSummary(alarm.repeat, alarm.customDays)].filter(Boolean).join(' · ');
  const rowStyle = [styles.alarmRow, { backgroundColor: selected ? selectedBg : bg, borderColor: selected ? selectedBorder : border }];

  const content = (
    <>
      {selectionMode ? (
        <View style={[styles.selectCircle, { borderColor: selected ? selectedBorder : mutedColor, backgroundColor: selected ? selectedBorder : 'transparent' }]}>
          {selected ? <Check color={checkColor} size={14} strokeWidth={2.5} /> : null}
        </View>
      ) : null}
      <View style={styles.alarmInfo}>
        <ThemedText style={[styles.alarmTime, { color: alarm.enabled ? textColor : mutedColor }]}>
          {formatTime(alarm.hour, alarm.minute)}
        </ThemedText>
        <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
          {details || 'Alarm'}
        </ThemedText>
      </View>
    </>
  );

  if (selectionMode) {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel={`Select alarm ${formatTime(alarm.hour, alarm.minute)}`} onPress={() => onToggleSelect(alarm.id)} style={rowStyle}>
        {content}
      </Pressable>
    );
  }

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Edit alarm ${formatTime(alarm.hour, alarm.minute)}`} delayLongPress={250} onLongPress={() => onLongPress(alarm.id)} onPress={() => onPress(alarm)} style={rowStyle}>
      {content}
      <Switch value={alarm.enabled} onValueChange={(value) => onToggle(alarm.id, value)} accessibilityLabel={`Toggle alarm ${formatTime(alarm.hour, alarm.minute)}`} />
    </Pressable>
  );
});

export default function AlarmScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { isEarphoneConnected } = useEarphoneStatus();
  const { setOverride } = useBottomBar();
  const { alarms, setAlarms } = useAlarms();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingAlarm, setEditingAlarm] = useState<Alarm | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, []);

  const canCreate = isEarphoneConnected;

  const sortedAlarms = useMemo(
    () => [...alarms].sort((a, b) => a.hour * 60 + a.minute - (b.hour * 60 + b.minute)),
    [alarms]
  );

  const nextAlarmLabel = useMemo(() => getNextAlarmLabel(alarms, now), [alarms, now]);

  const openSheet = useCallback(() => {
    if (!canCreate) return;
    setEditingAlarm(null);
    setIsSheetOpen(true);
  }, [canCreate]);

  const openEditSheet = useCallback((alarm: Alarm) => {
    if (!canCreate) return;
    setEditingAlarm(alarm);
    setIsSheetOpen(true);
  }, [canCreate]);

  const closeSheet = useCallback(() => {
    setIsSheetOpen(false);
    setEditingAlarm(null);
  }, []);

  const saveAlarm = useCallback((data: Omit<Alarm, 'id' | 'enabled'>) => {
    setAlarms((prev) => {
      if (editingAlarm) {
        return prev.map((a) => (a.id === editingAlarm.id ? { ...a, ...data } : a));
      }
      return [...prev, createAlarm(data)];
    });
    setIsSheetOpen(false);
    setEditingAlarm(null);
  }, [editingAlarm, setAlarms]);

  const toggleAlarm = useCallback((id: string, enabled: boolean) => {
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
  }, [setAlarms]);

  const cancelSelection = useCallback(() => {
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, []);

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

  const deleteSelected = useCallback(() => {
    setAlarms((prev) => prev.filter((a) => !selectedIds.has(a.id)));
    setSelectionMode(false);
    setSelectedIds(new Set());
  }, [selectedIds, setAlarms]);

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
        <Pressable accessibilityRole="button" accessibilityLabel="Delete selected alarms" onPress={deleteSelected} hitSlop={8} style={styles.deleteBarBtn}>
          <Trash2 color="#E11D48" size={22} strokeWidth={2} />
          <ThemedText type="smallBold" style={{ color: '#E11D48' }}>Delete</ThemedText>
        </Pressable>
      </View>
    );
    return () => setOverride(null);
  }, [selectionMode, selectedIds, cancelSelection, deleteSelected, insets.bottom, setOverride, theme.backgroundElement, theme.backgroundSelected, theme.text]);

  return (
    <View style={StyleSheet.flatten([styles.container, { backgroundColor: theme.background }])}>
      <View style={[styles.content, { paddingTop: insets.top + Spacing.two }]}>
        <View style={styles.topArea}>
          <ThemedText type="subtitle" style={styles.title}>Alarm</ThemedText>
          <View style={styles.menuRow}>
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
          {nextAlarmLabel ? (
            <ThemedText themeColor="textSecondary" style={styles.nextAlarm}>
              {nextAlarmLabel}
            </ThemedText>
          ) : null}
        </View>



        {sortedAlarms.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={[styles.iconWrap, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
              <AlarmClock color={theme.text} size={28} strokeWidth={1.8} />
            </View>
            <ThemedText type="subtitle">No alarm created</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.description}>
              {isEarphoneConnected
                ? 'Tap the plus button to create your first alarm.'
                : 'Connect earphones to create an alarm.'}
            </ThemedText>
          </View>
        ) : (
          <FlatList
            data={sortedAlarms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <AlarmRow
                alarm={item}
                selected={selectedIds.has(item.id)}
                selectionMode={selectionMode}
                textColor={theme.text}
                mutedColor={theme.textSecondary}
                bg={theme.backgroundElement}
                selectedBg={theme.backgroundSelected}
                border={theme.backgroundSelected}
                selectedBorder={theme.text}
                checkColor={theme.background}
                onLongPress={enterSelectionMode}
                onPress={openEditSheet}
                onToggleSelect={toggleSelect}
                onToggle={toggleAlarm}
              />
            )}
          />
        )}
      </View>

      {isEarphoneConnected && !selectionMode ? (
        <View style={[styles.fabContainer, { paddingBottom: Spacing.three }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add alarm"
            onPress={openSheet}
            style={[styles.fab, { backgroundColor: theme.text }]}
          >
            <Plus color={theme.background} size={28} strokeWidth={2.2} />
          </Pressable>
        </View>
      ) : null}

      <AddAlarmSheet isOpen={isSheetOpen} onClose={closeSheet} onSave={saveAlarm} editingAlarm={editingAlarm} />

      {!isEarphoneConnected ? (
        <View style={styles.blockOverlay} pointerEvents="auto">
          <View style={[styles.blockCard, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }]}>
            <View style={[styles.blockIconWrap, { backgroundColor: theme.background, borderColor: theme.backgroundSelected }]}>
              <Headphones color={theme.text} size={28} strokeWidth={1.8} />
            </View>
            <ThemedText type="default" style={styles.blockTitle}>No earphone detected</ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.blockDescription}>
              Insert earphone to use the alarm.
            </ThemedText>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, paddingHorizontal: Spacing.three },
  topArea: { alignItems: 'center', marginBottom: Spacing.three, gap: Spacing.one },
  title: { fontSize: 32, lineHeight: 38 },
  menuRow: { width: '100%', alignItems: 'flex-end' },
  nextAlarm: { textAlign: 'center', fontSize: 18, lineHeight: 24, fontWeight: '500' },
  iconButton: { width: 36, height: 36, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  menuBackdrop: { flex: 1, alignItems: 'flex-end', paddingTop: 100, paddingRight: Spacing.four },
  menu: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.two, minWidth: 140, elevation: 4 },
  menuItem: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two },
  blockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    zIndex: 20,
  },
  blockCard: {
    width: '100%',
    maxWidth: 340,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.four,
    padding: Spacing.four,
    alignItems: 'center',
    gap: Spacing.two,
  },
  blockIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
  },
  blockTitle: { fontWeight: '600', textAlign: 'center' },
  blockDescription: { textAlign: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.three,
    paddingBottom: Spacing.six,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: Spacing.four,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  description: { textAlign: 'center' },
  listContent: { gap: Spacing.two, paddingBottom: Spacing.six * 2 },
  alarmRow: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  alarmInfo: { flex: 1, gap: Spacing.half },
  alarmTime: { fontSize: 32, lineHeight: 38, fontWeight: '600' },
  fabContainer: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center' },
  fab: { width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  selectCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  deleteBarBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 64,
  },
});
