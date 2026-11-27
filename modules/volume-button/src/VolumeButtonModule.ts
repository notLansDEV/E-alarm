import { NativeModule, requireNativeModule } from 'expo';

import type { VolumeButtonEvents } from './VolumeButton.types';

declare class VolumeButtonModule extends NativeModule<VolumeButtonEvents> {
  setEnabled(enabled: boolean): void;
}

let VolumeButton: VolumeButtonModule | null = null;
try {
  VolumeButton = requireNativeModule<VolumeButtonModule>('VolumeButton');
} catch {
  VolumeButton = null;
}

export default VolumeButton;
