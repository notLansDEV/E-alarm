/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOptionalThemePreference } from '@/providers/theme-preference';

export function useTheme() {
  const preference = useOptionalThemePreference();
  const systemScheme = useColorScheme();
  const theme = preference?.resolvedScheme ?? (systemScheme === 'dark' ? 'dark' : 'light');

  return Colors[theme];
}
