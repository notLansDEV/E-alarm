import { BottomSheet, RNHostView } from '@expo/ui';
import * as DocumentPicker from 'expo-document-picker';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Switch, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { TimeWheelPicker } from '@/components/time-wheel-picker';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Alarm, RepeatOption, Weekday } from '@/types/alarm';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (alarm: Omit<Alarm, 'id' | 'enabled'>) => void;
  editingAlarm?: Alarm | null;
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);
const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' },
  { key: 'sat', label: 'Saturday' },
  { key: 'sun', label: 'Sunday' },
];

function pad2(n: number) {
  return String(n).padStart(2, '0');
}

function to24Hour(hour12: number, minute: number, period: 'AM' | 'PM') {
  let hour = hour12 % 12;
  if (period === 'PM') hour += 12;
  return { hour, minute };
}

function from24Hour(hour: number) {
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return { hour12, period };
}

function getCountdownLabel(hour12: number, minute: number, period: 'AM' | 'PM', now: Date) {
  const { hour, minute: m } = to24Hour(hour12, minute, period);
  const target = new Date(now);
  target.setHours(hour, m, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  const diffMs = target.getTime() - now.getTime();
  const totalMinutes = Math.max(0, Math.round(diffMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `Alarm in ${hours} hours ${minutes} minutes`;
}

function repeatLabel(repeat: RepeatOption, customDays: Weekday[]) {
  if (repeat === 'once') return 'Once';
  if (repeat === 'daily') return 'Daily';
  if (repeat === 'mon-fri') return 'Mon to Fri';
  if (customDays.length === 0) return 'Customize';
  const map: Record<Weekday, string> = { mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri', sat: 'Sat', sun: 'Sun' };
  return customDays.map((d) => map[d]).join(', ');
}

export function AddAlarmSheet({ isOpen, onClose, onSave, editingAlarm }: Props) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const [period, setPeriod] = useState<'AM' | 'PM'>('AM');
  const [hour12, setHour12] = useState(7);
  const [minute, setMinute] = useState(0);
  const [ringtoneName, setRingtoneName] = useState<string | null>(null);
  const [ringtoneUri, setRingtoneUri] = useState<string | null>(null);
  const [repeat, setRepeat] = useState<RepeatOption>('once');
  const [customDays, setCustomDays] = useState<Weekday[]>([]);
  const [deleteAfterRinging, setDeleteAfterRinging] = useState(false);
  const [label, setLabel] = useState('');
  const [showRepeatModal, setShowRepeatModal] = useState(false);
  const [showCustomDaysModal, setShowCustomDaysModal] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setNow(new Date());
      if (editingAlarm) {
        const { hour12: h12, period: p } = from24Hour(editingAlarm.hour);
        setPeriod(p);
        setHour12(h12);
        setMinute(editingAlarm.minute);
        setRingtoneName(editingAlarm.ringtoneName);
        setRingtoneUri(editingAlarm.ringtoneUri);
        setRepeat(editingAlarm.repeat);
        setCustomDays(editingAlarm.customDays);
        setDeleteAfterRinging(editingAlarm.deleteAfterRinging);
        setLabel(editingAlarm.label);
      } else {
        const d = new Date();
        const h = d.getHours();
        setPeriod(h >= 12 ? 'PM' : 'AM');
        setHour12(h % 12 === 0 ? 12 : h % 12);
        setMinute(d.getMinutes());
        setRingtoneName(null);
        setRingtoneUri(null);
        setRepeat('once');
        setCustomDays([]);
        setDeleteAfterRinging(false);
        setLabel('');
      }
    } else {
      setShowRepeatModal(false);
      setShowCustomDaysModal(false);
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const t = setInterval(() => setNow(new Date()), 15000);
    return () => clearInterval(t);
  }, [isOpen]);

  const countdown = useMemo(() => getCountdownLabel(hour12, minute, period, now), [hour12, minute, period, now]);

  const reset = useCallback(() => {
    const d = new Date();
    const h = d.getHours();
    setPeriod(h >= 12 ? 'PM' : 'AM');
    const h12 = h % 12 === 0 ? 12 : h % 12;
    setHour12(h12);
    setMinute(d.getMinutes());
    setRingtoneName(null);
    setRingtoneUri(null);
    setRepeat('once');
    setCustomDays([]);
    setDeleteAfterRinging(false);
    setLabel('');
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [onClose, reset]);

  const pickRingtone = useCallback(async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setRingtoneName(asset.name);
    setRingtoneUri(asset.uri);
  }, []);

  const toggleDay = useCallback((day: Weekday) => {
    setCustomDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]));
  }, []);

  const save = useCallback(() => {
    const { hour } = to24Hour(hour12, minute, period);
    onSave({
      hour,
      minute,
      label: label.trim(),
      ringtoneName,
      ringtoneUri,
      repeat,
      customDays: repeat === 'custom' ? customDays : [],
      deleteAfterRinging,
    });
    reset();
  }, [customDays, deleteAfterRinging, hour12, label, minute, onSave, period, repeat, reset, ringtoneName, ringtoneUri]);

  const cardStyle = [styles.card, { backgroundColor: theme.backgroundElement, borderColor: theme.backgroundSelected }];
  const rowDivider = [styles.rowDivider, { backgroundColor: theme.backgroundSelected }];

  return (
    <>
      <BottomSheet
        isPresented={isOpen}
        onDismiss={handleClose}
        snapPoints={[{ fraction: 0.92 }]}
        containerColor={theme.background}
      >
        <RNHostView style={{ flex: 1 } as any}>
          <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
            <View style={styles.header}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Cancel"
                onPress={handleClose}
                style={[styles.iconButton, { borderColor: theme.backgroundSelected, backgroundColor: theme.backgroundElement }]}
              >
                <X color={theme.text} size={18} strokeWidth={2} />
              </Pressable>
              <View style={styles.headerCenter}>
                <ThemedText type="subtitle" style={styles.headerTitle}>{editingAlarm ? 'Edit alarm' : 'Add alarm'}</ThemedText>
                <ThemedText themeColor="textSecondary" type="small">{countdown}</ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Save alarm"
                onPress={save}
                style={[styles.iconButton, { borderColor: theme.text, backgroundColor: theme.text }]}
              >
                <Check color={theme.background} size={18} strokeWidth={2.2} />
              </Pressable>
            </View>

            <View style={styles.content}>
              <View style={styles.pickerRow}>
                <View style={styles.periodCol}>
                  {(['AM', 'PM'] as const).map((p) => {
                    const active = period === p;
                    return (
                      <Pressable
                        key={p}
                        accessibilityRole="button"
                        onPress={() => setPeriod(p)}
                        style={[styles.periodButton, { backgroundColor: active ? theme.backgroundElement : 'transparent', borderColor: active ? theme.backgroundSelected : 'transparent' }]}
                      >
                        <ThemedText style={{ fontSize: 20, fontWeight: active ? '700' : '500', color: active ? theme.text : theme.textSecondary }}>
                          {p}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.wheels}>
                  <View style={styles.wheelCol}>
                    <ThemedText themeColor="textSecondary" style={styles.wheelLabel}>H</ThemedText>
                    <TimeWheelPicker values={HOURS} selected={hour12} onChange={setHour12} formatValue={pad2} visibleItems={5} loop />
                  </View>
                  <View style={styles.wheelCol}>
                    <ThemedText themeColor="textSecondary" style={styles.wheelLabel}>M</ThemedText>
                    <TimeWheelPicker values={MINUTES} selected={minute} onChange={setMinute} formatValue={pad2} visibleItems={5} loop />
                  </View>
                </View>
              </View>

              <View style={cardStyle}>
                <Pressable accessibilityRole="button" onPress={pickRingtone} style={styles.row}>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">Ringtone</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
                      {ringtoneName ?? 'Select audio file'}
                    </ThemedText>
                  </View>
                  <ChevronRight color={theme.textSecondary} size={18} strokeWidth={2} />
                </Pressable>
                <View style={rowDivider} />
                <Pressable accessibilityRole="button" onPress={() => setShowRepeatModal(true)} style={styles.row}>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">Repeat</ThemedText>
                    <ThemedText themeColor="textSecondary" type="small" numberOfLines={1}>
                      {repeatLabel(repeat, customDays)}
                    </ThemedText>
                  </View>
                  <ChevronRight color={theme.textSecondary} size={18} strokeWidth={2} />
                </Pressable>
                <View style={rowDivider} />
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <ThemedText type="smallBold">Delete after alarm goes off</ThemedText>
                  </View>
                  <Switch value={deleteAfterRinging} onValueChange={setDeleteAfterRinging} />
                </View>
              </View>

              <View style={cardStyle}>
                <View style={styles.labelRow}>
                  <ThemedText type="smallBold">Label</ThemedText>
                  <TextInput
                    value={label}
                    onChangeText={(t) => setLabel(t.slice(0, 16))}
                    maxLength={16}
                    placeholder="Alarm label"
                    placeholderTextColor={theme.textSecondary}
                    style={[styles.labelInput, { color: theme.text }]}
                  />
                </View>
                <ThemedText themeColor="textSecondary" type="small" style={styles.charCount}>{label.length}/16</ThemedText>
              </View>
            </View>
          </View>
        </RNHostView>
      </BottomSheet>

      <Modal visible={showRepeatModal} transparent animationType="slide" onRequestClose={() => setShowRepeatModal(false)}>
        <Pressable style={styles.modalBackdropBottom} onPress={() => setShowRepeatModal(false)}>
          <Pressable style={[styles.modalCardBottom, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, paddingBottom: insets.bottom + Spacing.three }]} onPress={() => {}}>
            <ThemedText type="default" style={styles.modalTitle}>Repeat</ThemedText>
            {(['once', 'daily', 'mon-fri', 'custom'] as RepeatOption[]).map((opt) => {
              const labels: Record<RepeatOption, string> = { once: 'Once', daily: 'Daily', 'mon-fri': 'Mon to Fri', custom: 'Customize' };
              const active = repeat === opt;
              return (
                <Pressable
                  key={opt}
                  accessibilityRole="button"
                  onPress={() => {
                    setRepeat(opt);
                    if (opt === 'custom') setShowCustomDaysModal(true);
                  }}
                  style={[styles.optionRow, { borderColor: theme.backgroundSelected }]}
                >
                  <ThemedText type="smallBold" style={{ color: active ? theme.text : theme.textSecondary }}>{labels[opt]}</ThemedText>
                  {active ? <Check color={theme.text} size={16} strokeWidth={2.2} /> : null}
                </Pressable>
              );
            })}
            <Pressable accessibilityRole="button" onPress={() => setShowRepeatModal(false)} style={[styles.modalDone, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>Done</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={showCustomDaysModal} transparent animationType="slide" onRequestClose={() => setShowCustomDaysModal(false)}>
        <Pressable style={styles.modalBackdropBottom} onPress={() => setShowCustomDaysModal(false)}>
          <Pressable style={[styles.modalCardBottom, { backgroundColor: theme.background, borderColor: theme.backgroundSelected, paddingBottom: insets.bottom + Spacing.three }]} onPress={() => {}}>
            <ThemedText type="default" style={styles.modalTitle}>Customize days</ThemedText>
            <View style={styles.daysWrap}>
              {WEEKDAYS.map((d) => {
                const active = customDays.includes(d.key);
                return (
                  <Pressable
                    key={d.key}
                    accessibilityRole="button"
                    onPress={() => toggleDay(d.key)}
                    style={[styles.dayChip, { backgroundColor: active ? theme.text : theme.backgroundElement, borderColor: active ? theme.text : theme.backgroundSelected }]}
                  >
                    <ThemedText type="smallBold" style={{ color: active ? theme.background : theme.textSecondary }}>{d.label.slice(0, 3)}</ThemedText>
                  </Pressable>
                );
              })}
            </View>
            <Pressable accessibilityRole="button" onPress={() => setShowCustomDaysModal(false)} style={[styles.modalDone, { backgroundColor: theme.text }]}>
              <ThemedText type="smallBold" style={{ color: theme.background }}>Done</ThemedText>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sheet: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.three },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.three },
  headerCenter: { flex: 1, alignItems: 'center', gap: Spacing.half, paddingHorizontal: Spacing.two },
  headerTitle: { fontSize: 24, lineHeight: 30 },
  iconButton: { width: 36, height: 36, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'space-evenly', gap: Spacing.two, paddingBottom: Spacing.two },
  pickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.four, paddingVertical: Spacing.two },
  periodCol: { gap: Spacing.three, justifyContent: 'center', marginLeft: -Spacing.three },
  periodButton: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center' },
  wheels: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  wheelCol: { alignItems: 'center', gap: Spacing.one },
  wheelLabel: { fontSize: 18, lineHeight: 24, fontWeight: '700', letterSpacing: 1 },
  card: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, gap: Spacing.two },
  rowText: { flex: 1, gap: 1 },
  rowDivider: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  labelRow: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: 0 },
  labelInput: { fontSize: 16, lineHeight: 20, paddingVertical: 2 },
  charCount: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two, textAlign: 'right' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', padding: Spacing.four },
  modalCard: { borderWidth: StyleSheet.hairlineWidth, borderRadius: Spacing.three, padding: Spacing.three, gap: Spacing.one },
  modalBackdropBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  modalCardBottom: { borderTopLeftRadius: Spacing.four, borderTopRightRadius: Spacing.four, borderWidth: StyleSheet.hairlineWidth, borderBottomWidth: 0, padding: Spacing.three, gap: Spacing.one },
  modalTitle: { fontWeight: '600', marginBottom: Spacing.one },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: Spacing.two, borderBottomWidth: StyleSheet.hairlineWidth },
  daysWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two, paddingVertical: Spacing.two },
  dayChip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.one, borderRadius: Spacing.two, borderWidth: StyleSheet.hairlineWidth },
  modalDone: { marginTop: Spacing.two, borderRadius: Spacing.two, paddingVertical: Spacing.two, alignItems: 'center' },
});
