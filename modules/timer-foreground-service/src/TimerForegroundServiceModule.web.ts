import { NativeModule, registerWebModule } from 'expo';

class TimerForegroundServiceModule extends NativeModule {
  start(_endAtMillis: number) {}
  stop() {}
}

export default registerWebModule(TimerForegroundServiceModule, 'TimerForegroundService');
