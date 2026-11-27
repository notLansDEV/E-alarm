export type EarphoneRouteType = 'wired' | 'bluetooth' | 'none';

export type EarphoneStatus = {
  connected: boolean;
  routeType: EarphoneRouteType;
};

export type EarphoneDetectorEvents = {
  onChange: (status: EarphoneStatus) => void;
};
