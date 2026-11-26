# Earphone-Only Alarm Clock Specification

## Project Context
- **Framework:** React Native with Expo (`expo-router`, TypeScript, `expo-audio`, `expo-dev-client`).
- **Editor / Environment:** Zed IDE, targeting Android (and iOS where applicable) via a Development Build (`expo-dev-client`).
- **Design Reference:** Inspired by clean mobile alarm clock layouts (`https://dribbble.com/shots/24165710-Alarm-Clock`), adapted into a crisp, minimal, utilitarian interface supporting both **Light** and **Dark** modes.

---

## Core Functional Requirements

### 1. Earphone Gating (Add & Start Alarm)
- **Add Alarm Gate:** Users cannot create or save a new alarm unless earphones (wired headset, USB-C/3.5mm adapter headset, or connected Bluetooth audio headset) are actively detected.
- **Start / Enable Alarm Gate:** Users cannot toggle/start an alarm to active state unless earphones are currently connected.
- **Real-Time State Sync:** Listen to live audio route/device connection changes so the UI updates immediately when earphones are plugged in or unplugged.
- **Strict Validation:** Re-verify earphone connection inside both the `addAlarm` and `toggle/startAlarm` handlers—never rely solely on disabled UI states.

### 2. Earphone-Only Audio Playback
- **Target Output Only:** When an alarm triggers, audio playback must only route to connected earphones.
- **Unplug Behavior (No Speaker Fallback):** If earphones are disconnected/unplugged before or during an alarm:
  - Do **not** fall back to playing loud alarm audio out of the device's built-in speaker.
  - Immediately pause/stop active playback if earphones are unplugged mid-alarm, mark/notify the user that earphones were disconnected, and require re-inserting earphones to resume or start.

### 3. Native Module / Development Build Requirement
- Standard Expo Go cannot reliably inspect live native audio route endpoints on all devices.
- Implement or integrate native audio output detection (iOS `AVAudioSession` / Android `AudioManager` output devices + route/device callbacks) and run via a **Development Build** (`expo-dev-client`).

---

## UI & Visual Direction (No "AI Slop")

### Principles
- **Clean, intentional, high-contrast utility:** Avoid generic gradient cards, over-engineered glassmorphism, floating neon glows, or cluttered marketing badges.
- **Clear visual hierarchy:** Large, legible tabular numerals for times; clear distinction between active and inactive alarms; unambiguous earphone status indicator.
- **Light & Dark Mode First:** Support automatic system theme (`useColorScheme`) plus an optional manual Light / Dark / System toggle.

### Color & Surface Guidance
- **Light Mode:** Crisp light neutral background (`#F8FAFC` / `#FFFFFF`), subtle elevated surfaces (`#F1F5F9` / `#FFFFFF`) with hairline borders (`#E2E8F0`), high-contrast dark text (`#0F172A`), secondary muted text (`#64748B`).
- **Dark Mode:** Deep neutral dark background (`#0B0F17` / `#111827`), elevated surface cards (`#1E293B` / `#1F2937`) with subtle borders (`#334155`), crisp light text (`#F8FAFC`), secondary muted text (`#94A3B8`).
- **Status & Accent:** Use a calm, restrained accent for primary actions/active states and clear muted/locked states when earphones are missing—avoiding loud or gimmicky styling.

### Key Screens & Components
1. **Main Alarm Screen (`src/app/index.tsx`):**
   - **Header & Earphone Status Bar:** Shows whether earphones are connected (`Wired / Bluetooth Ready`) or disconnected (`Earphones Required`), plus theme switcher if desired.
   - **Alarm List:** Clean rows showing time, label/repeat info (if any), and an enable/start switch that is gated when earphones are disconnected.
   - **Add Alarm Action:** Prominent button to open the time picker/creator; disabled/locked with clear helper text when no earphones are connected.
2. **Add / Edit Alarm Modal or Sheet:**
   - Clean time selection (hours/minutes/period or native picker), optional label, and a **Save Alarm** action gated on active earphone connection.
3. **Ringing / Active Alarm View:**
   - Displays ringing time, earphone output status, **Snooze** (if supported), and **Dismiss / Stop**.
   - Automatically stops/mutes audio if earphones are unplugged rather than blasting through speakers.

---

## Suggested Architecture (`src/`)
- `src/types/alarm.ts` — Alarm data model (`id`, `hour`, `minute`, `enabled`, `label`, `days`, `soundUri`).
- `src/hooks/useEarphoneStatus.ts` — Exposes `isEarphoneConnected`, `routeType` (`'wired' | 'bluetooth' | 'none'`), and a `refreshEarphoneStatus()` check.
- `src/services/alarmAudio.ts` — Manages `expo-audio` playback and enforces earphone-only output / stop-on-disconnect rules.
- `src/theme/colors.ts` — Light and dark color tokens.
- `src/app/index.tsx` — Primary alarm list, earphone gate banner, and add/toggle controls.

---

## Implementation Guardrails for the AI
1. Keep TypeScript strict and clean with no unused placeholders or dummy dead buttons.
2. Ensure every add and start/enable action checks `isEarphoneConnected` before mutating state or scheduling/starting an alarm.
3. Ensure audio playback logic explicitly stops or refuses speaker playback when `isEarphoneConnected` is `false`.
4. Style both Light and Dark themes completely so neither mode has unreadable text or broken contrast.
5. Note clearly where native code / `npx expo run:android` or `eas build` is required vs. UI layout testing.