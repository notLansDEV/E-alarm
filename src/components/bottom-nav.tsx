import { Link, usePathname } from 'expo-router';
import { AlarmClock, Clock, Hourglass, Timer } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const tabs = [
  { href: '/', label: 'Alarm', Icon: AlarmClock },
  { href: '/clock', label: 'Clock', Icon: Clock },
  { href: '/stopwatch', label: 'Stopwatch', Icon: Timer },
  { href: '/timer', label: 'Timer', Icon: Hourglass },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom + Spacing.two,
          backgroundColor: theme.background,
          borderTopColor: theme.backgroundSelected,
        },
      ]}
    >
      <View style={styles.row}>
        {tabs.map(({ href, label, Icon }) => {
          const active = href === '/' ? pathname === '/' || pathname === '/index' : pathname === href;
          const color = active ? theme.text : theme.textSecondary;
          return (
            <Link key={href} href={href} asChild>
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                style={StyleSheet.flatten([
                  styles.tab,
                  {
                    backgroundColor: active ? theme.backgroundElement : 'transparent',
                    borderColor: active ? theme.backgroundSelected : 'transparent',
                  },
                ])}
              >
                <Icon color={color} size={18} strokeWidth={2} />
                <ThemedText type="smallBold" style={{ color }}>
                  {label}
                </ThemedText>
              </Pressable>
            </Link>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
