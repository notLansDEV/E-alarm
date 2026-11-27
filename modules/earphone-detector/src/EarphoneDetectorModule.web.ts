import { NativeModule, registerWebModule } from 'expo';

import type { EarphoneDetectorEvents, EarphoneStatus } from './EarphoneDetector.types';

class EarphoneDetectorModule extends NativeModule<EarphoneDetectorEvents> {
  getStatus(): EarphoneStatus {
    return { connected: false, routeType: 'none' };
  }
}

export default registerWebModule(EarphoneDetectorModule, 'EarphoneDetectorModule');
