import { NativeModule, requireNativeModule } from 'expo';

declare class TimerForegroundServiceModule extends NativeModule {
  start(endAtMillis: number): void;
  stop(): void;
}

let TimerForegroundService: TimerForegroundServiceModule | null = null;
try {
  TimerForegroundService = requireNativeModule<TimerForegroundServiceModule>('TimerForegroundService');
} catch {
  TimerForegroundService = null;
}

export default TimerForegroundService;
