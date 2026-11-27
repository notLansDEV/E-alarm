import { NativeModule, registerWebModule } from 'expo';

import type { VolumeButtonEvents } from './VolumeButton.types';

class VolumeButtonModule extends NativeModule<VolumeButtonEvents> {
  setEnabled(_enabled: boolean) {}
}

export default registerWebModule(VolumeButtonModule, 'VolumeButtonModule');
