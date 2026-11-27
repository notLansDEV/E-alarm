import { NativeModule, requireNativeModule } from 'expo';

import type { EarphoneDetectorEvents, EarphoneStatus } from './EarphoneDetector.types';

declare class EarphoneDetectorModule extends NativeModule<EarphoneDetectorEvents> {
  getStatus(): EarphoneStatus;
}

let EarphoneDetector: EarphoneDetectorModule | null = null;
try {
  EarphoneDetector = requireNativeModule<EarphoneDetectorModule>('EarphoneDetector');
} catch {
  EarphoneDetector = null;
}

export default EarphoneDetector;
