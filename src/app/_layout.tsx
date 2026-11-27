import { DarkTheme, DefaultTheme, Slot, ThemeProvider, usePathname } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
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

function AppShell() {
  const theme = useTheme();
  const pathname = usePathname();
  const { resolvedScheme } = useThemePreference();
  const { override } = useBottomBar();
  const hideBottomNav = pathname === '/settings' || pathname === '/additional-alarm-settings';

  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={resolvedScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <View style={StyleSheet.flatten([styles.container, { backgroundColor: theme.background }])}>
        <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
        <View style={styles.content}>
          <Slot />
        </View>
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
