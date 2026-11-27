import type { ExpoConfig } from 'expo/config';

import pkg from './package.json';

function getVersionFromGitTag(): string | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { execSync } = require('child_process') as { execSync: (cmd: string, opts?: any) => { toString(): string } };
    const tag = execSync('git describe --tags --abbrev=0', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
    if (!tag) return null;
    return tag.startsWith('v') ? tag.slice(1) : tag;
  } catch {
    return null;
  }
}

const version = getVersionFromGitTag() ?? pkg.version ?? '1.0.0';

export default (): ExpoConfig => ({
  name: 'E-Alarm',
  slug: 'earphone-alarm-clock',
  version,
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'earphonealarmclock',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.lansdev.earphonealarmclock',
    icon: './assets/images/icon.png',
    adaptiveIcon: {
      backgroundColor: '#121214',
      foregroundImage: './assets/images/adaptive-icon.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_SPECIAL_USE',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.SCHEDULE_EXACT_ALARM',
      'android.permission.VIBRATE',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.WAKE_LOCK',
    ],
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#121214',
        image: './assets/images/splash-icon.png',
        imageWidth: 200,
      },
    ],
    'expo-audio',
    'expo-image',
    'expo-notifications',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    router: {
      asyncRoutes: {
        web: true,
      },
    },
    eas: {
      projectId: '62c9d99a-8cd2-4bc4-a67f-9e95b8608bcb',
    },
  },
});
