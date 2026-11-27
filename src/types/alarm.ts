export type RepeatOption = 'once' | 'daily' | 'mon-fri' | 'custom';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export type Alarm = {
  id: string;
  hour: number; // 0-23
  minute: number; // 0-59
  enabled: boolean;
  label: string;
  ringtoneName: string | null;
  ringtoneUri: string | null;
  repeat: RepeatOption;
  customDays: Weekday[];
  deleteAfterRinging: boolean;
};
