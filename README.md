# E-Alarm

<p align="center">
  <img src="./assets/images/icon.png" alt="E-Alarm app icon" width="120" />
</p>

E-Alarm is an Expo/React Native alarm clock app focused on earphone-aware alarms, with clock, stopwatch, and timer utilities.

## Features

- **Earphone-gated alarms**: alarm creation is blocked until earphones are detected (native module; dev/production build required).
- **Alarm management**: create/edit alarms, repeat/custom days, ringtone selection, next-alarm countdown, multi-select delete.
- **Clock**: analog clock with live digital time.
- **Stopwatch**: start/pause/reset/laps, continues running across tab navigation.
- **Timer**: scrollable H/M/S picker, circular progress, presets/custom presets, runs across tab navigation.
- **Settings**: theme, system time/sound shortcuts, alarm/timer ringtone, auto silence, snooze, volume button action, lock-screen notification visibility, notification before ringing.
- **Persistence**: alarms, settings, theme, and timer presets saved locally with AsyncStorage.

## License

[MIT](./LICENSE)
