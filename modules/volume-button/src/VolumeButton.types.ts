export type VolumeButtonEvent = {
  type: 'up' | 'down';
};

export type VolumeButtonEvents = {
  onVolumeButton: (event: VolumeButtonEvent) => void;
};
