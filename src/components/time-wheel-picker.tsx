import { useCallback, useEffect, useMemo, useRef } from 'react';
import { FlatList, type NativeScrollEvent, type NativeSyntheticEvent, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  values: number[];
  selected: number;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
  width?: number;
  itemHeight?: number;
  visibleItems?: number;
  loop?: boolean;
  fontSize?: number;
};

const LOOP_MULTIPLIER = 20;

export function TimeWheelPicker({
  values,
  selected,
  onChange,
  formatValue,
  width = 88,
  itemHeight = 48,
  visibleItems = 5,
  loop = false,
  fontSize = 28,
}: Props) {
  const theme = useTheme();
  const listRef = useRef<FlatList<number>>(null);
  const selectedIndex = Math.max(0, values.indexOf(selected));
  const padding = useMemo(() => ((visibleItems - 1) / 2) * itemHeight, [itemHeight, visibleItems]);

  const data = useMemo(() => {
    if (!loop) return values;
    const repeated: number[] = [];
    for (let i = 0; i < LOOP_MULTIPLIER; i += 1) repeated.push(...values);
    return repeated;
  }, [loop, values]);

  const middleOffset = useMemo(() => {
    if (!loop) return 0;
    const middleCycle = Math.floor(LOOP_MULTIPLIER / 2);
    return middleCycle * values.length;
  }, [loop, values.length]);

  useEffect(() => {
    const index = (loop ? middleOffset : 0) + selectedIndex;
    listRef.current?.scrollToOffset({ offset: index * itemHeight, animated: false });
  }, [itemHeight, loop, middleOffset, selectedIndex]);

  const onMomentumEnd = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const rawIndex = Math.round(e.nativeEvent.contentOffset.y / itemHeight);
      const clamped = Math.min(data.length - 1, Math.max(0, rawIndex));
      const actualIndex = loop ? ((clamped % values.length) + values.length) % values.length : clamped;
      const value = values[actualIndex];
      if (value !== undefined && value !== selected) onChange(value);

      if (loop) {
        const minSafe = values.length * 3;
        const maxSafe = data.length - values.length * 3;
        if (clamped < minSafe || clamped > maxSafe) {
          const recentered = middleOffset + actualIndex;
          requestAnimationFrame(() => {
            listRef.current?.scrollToOffset({ offset: recentered * itemHeight, animated: false });
          });
        }
      }
    },
    [data.length, itemHeight, loop, middleOffset, onChange, selected, values]
  );

  return (
    <View style={[styles.container, { width, height: itemHeight * visibleItems }]}>
      <View
        pointerEvents="none"
        style={[
          styles.highlight,
          {
            top: padding,
            height: itemHeight,
            backgroundColor: theme.backgroundElement,
            borderColor: theme.backgroundSelected,
          },
        ]}
      />
      <FlatList
        ref={listRef}
        data={data}
        keyExtractor={(item, index) => `${item}-${index}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={itemHeight}
        decelerationRate="fast"
        bounces={!loop}
        nestedScrollEnabled
        windowSize={7}
        maxToRenderPerBatch={15}
        initialNumToRender={15}
        removeClippedSubviews
        getItemLayout={(_, index) => ({ length: itemHeight, offset: itemHeight * index, index })}
        onMomentumScrollEnd={onMomentumEnd}
        onScrollEndDrag={(e) => {
          const vy = Math.abs(e.nativeEvent.velocity?.y ?? 0);
          if (vy < 0.1) onMomentumEnd(e);
        }}
        contentContainerStyle={{ paddingVertical: padding }}
        renderItem={({ item }) => {
          const isSelected = item === selected;
          return (
            <View style={[styles.item, { height: itemHeight }]}>
              <ThemedText
                style={{
                  fontSize,
                  lineHeight: Math.round(fontSize * 1.2),
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? theme.text : theme.textSecondary,
                  opacity: isSelected ? 1 : 0.55,
                }}
              >
                {formatValue ? formatValue(item) : String(item)}
              </ThemedText>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  highlight: {
    position: 'absolute',
    left: 0,
    right: 0,
    borderRadius: Spacing.two,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
