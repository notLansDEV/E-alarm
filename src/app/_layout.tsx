import { DarkTheme, DefaultTheme, Slot, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AlarmRinger } from '@/components/alarm-ringer';
import { BottomNav } from '@/components/bottom-nav';
import { useTheme } from '@/hooks/use-theme';
import { AlarmsProvider } from '@/providers/alarms';
import { AppSettingsProvider } from '@/providers/app-settings';
import { BottomBarProvider, useBottomBar } from '@/providers/bottom-bar';
import { StopwatchProvider } from '@/providers/stopwatch';
import { TimerProvider } from '@/providers/timer';
import { ThemePreferenceProvider, useThemePreference } from '@/providers/theme-preference';

SplashScreen.preventAutoHideAsync();

const TAB_ORDER = ['/', '/clock', '/stopwatch', '/timer'];

function getTabIndex(pathname: string) {
  if (pathname === '/' || pathname === '/index') return 0;
  const idx = TAB_ORDER.indexOf(pathname);
  return idx >= 0 ? idx : -1;
}

function AppShell() {
  const theme = useTheme();
  const pathname = usePathname();
  const { resolvedScheme } = useThemePreference();
  const { override } = useBottomBar();
  const hideBottomNav = pathname === '/settings' || pathname === '/additional-alarm-settings';
  const [translateX] = useState(() => new Animated.Value(0));
  const prevIndexRef = useRef(getTabIndex(pathname));

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  useEffect(() => {
    const nextIndex = getTabIndex(pathname);
    const prevIndex = prevIndexRef.current;
    if (nextIndex !== -1 && prevIndex !== -1 && nextIndex !== prevIndex) {
      const direction = nextIndex > prevIndex ? 1 : -1;
      translateX.setValue(direction * 40);
      Animated.timing(translateX, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else if (nextIndex !== prevIndex) {
      translateX.setValue(0);
    }
    prevIndexRef.current = nextIndex;
  }, [pathname, translateX]);

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={StyleSheet.flatten([styles.container, { backgroundColor: theme.background }])}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <Animated.View style={[styles.content, { transform: [{ translateX }] }]}>
          <Slot />
        </Animated.View>
        {!hideBottomNav ? (override ?? <BottomNav />) : null}
        <AlarmRinger />
      </View>
    </ThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemePreferenceProvider>
        <AppSettingsProvider>
          <AlarmsProvider>
            <StopwatchProvider>
              <TimerProvider>
                <BottomBarProvider>
                  <AppShell />
                </BottomBarProvider>
              </TimerProvider>
            </StopwatchProvider>
          </AlarmsProvider>
        </AppSettingsProvider>
      </ThemePreferenceProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
