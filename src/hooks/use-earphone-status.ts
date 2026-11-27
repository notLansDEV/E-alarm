import { useCallback, useEffect, useMemo, useState } from 'react';

export type EarphoneRouteType = 'wired' | 'bluetooth' | 'none';

type EarphoneStatus = { connected: boolean; routeType: EarphoneRouteType };

type EarphoneDetectorModuleLike = {
  getStatus: () => EarphoneStatus;
  addListener: (event: 'onChange', listener: (status: EarphoneStatus) => void) => { remove: () => void };
};

function getNativeDetector(): EarphoneDetectorModuleLike | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('../../modules/earphone-detector/src/EarphoneDetectorModule').default as EarphoneDetectorModuleLike | null;
    if (mod && typeof mod.getStatus === 'function') return mod;
    return null;
  } catch {
    return null;
  }
}

export function useEarphoneStatus() {
  const nativeDetector = useMemo(() => getNativeDetector(), []);

  const initialStatus = useMemo<EarphoneStatus>(() => {
    if (!nativeDetector) return { connected: false, routeType: 'none' };
    try {
      return nativeDetector.getStatus();
    } catch {
      return { connected: false, routeType: 'none' };
    }
  }, [nativeDetector]);

  const [isEarphoneConnected, setIsEarphoneConnected] = useState(initialStatus.connected);
  const [routeType, setRouteType] = useState<EarphoneRouteType>(initialStatus.routeType);

  const refreshEarphoneStatus = useCallback(async () => {
    if (!nativeDetector) return;
    try {
      const status = nativeDetector.getStatus();
      setIsEarphoneConnected(status.connected);
      setRouteType(status.routeType);
    } catch {
      setIsEarphoneConnected(false);
      setRouteType('none');
    }
  }, [nativeDetector]);

  useEffect(() => {
    if (!nativeDetector) return;
    const sub = nativeDetector.addListener('onChange', (status) => {
      setIsEarphoneConnected(status.connected);
      setRouteType(status.routeType);
    });
    return () => sub.remove();
  }, [nativeDetector]);

  return useMemo(
    () => ({
      isEarphoneConnected,
      routeType,
      refreshEarphoneStatus,
      hasNativeDetector: nativeDetector != null,
    }),
    [isEarphoneConnected, routeType, refreshEarphoneStatus, nativeDetector]
  );
}
