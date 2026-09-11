export const LOG_TYPES = [
  'crash',
  'exception',
  'error',
  'sync_event',
  'network',
  'app_lifecycle',
  'user_action',
  'app_info',
] as const;

export type LogType = (typeof LOG_TYPES)[number];

export interface DebugLogEntry {
  id: string;
  type: LogType;
  message: string;
  timestamp: number;
  details?: string;
  context?: Record<string, string | number | boolean>;
}

export type DateRangeId =
  | 'today'
  | 'last_3'
  | 'last_7'
  | 'last_14'
  | 'last_30'
  | 'all';

export interface LogTypeMeta {
  id: LogType;
  chipLabel: string;
  badgeLabel: string;
  /** Overflow types live behind the More popover. */
  primary: boolean;
  background: string;
  foreground: string;
}

/**
 * Console-adjacent coloring: fatal/error in the red family, info/network in
 * blue, routine lifecycle in gray, user actions in green.
 */
export const LOG_TYPE_META: Record<LogType, LogTypeMeta> = {
  crash: {
    id: 'crash',
    chipLabel: 'Crashes',
    badgeLabel: 'CRASH',
    primary: true,
    background: '#d32f2f',
    foreground: '#ffffff',
  },
  exception: {
    id: 'exception',
    chipLabel: 'Exceptions',
    badgeLabel: 'EXCEPTION',
    primary: true,
    background: '#8e1b1b',
    foreground: '#ffffff',
  },
  error: {
    id: 'error',
    chipLabel: 'Errors',
    badgeLabel: 'ERROR',
    primary: true,
    background: '#ef6c4c',
    foreground: '#ffffff',
  },
  sync_event: {
    id: 'sync_event',
    chipLabel: 'Sync Events',
    badgeLabel: 'SYNC_EVENT',
    primary: false,
    background: '#1e88e5',
    foreground: '#ffffff',
  },
  network: {
    id: 'network',
    chipLabel: 'Network',
    badgeLabel: 'NETWORK',
    primary: false,
    background: '#1565c0',
    foreground: '#ffffff',
  },
  app_lifecycle: {
    id: 'app_lifecycle',
    chipLabel: 'App Lifecycle',
    badgeLabel: 'APP_LIFECYCLE',
    primary: false,
    background: '#607d8b',
    foreground: '#ffffff',
  },
  user_action: {
    id: 'user_action',
    chipLabel: 'User Actions',
    badgeLabel: 'USER_ACTION',
    primary: false,
    background: '#2e7d32',
    foreground: '#ffffff',
  },
  app_info: {
    id: 'app_info',
    chipLabel: 'App Info',
    badgeLabel: 'APP_INFO',
    primary: false,
    background: '#00838f',
    foreground: '#ffffff',
  },
};

export const PRIMARY_LOG_TYPES = LOG_TYPES.filter(
  type => LOG_TYPE_META[type].primary,
);

export const OVERFLOW_LOG_TYPES = LOG_TYPES.filter(
  type => !LOG_TYPE_META[type].primary,
);

export const DATE_RANGE_OPTIONS: Array<{
  id: DateRangeId;
  label: string;
  primary: boolean;
}> = [
  {id: 'today', label: 'Today', primary: true},
  {id: 'last_3', label: 'Last 3 Days', primary: true},
  {id: 'last_7', label: 'Last 7 Days', primary: true},
  {id: 'last_14', label: 'Last 14 Days', primary: false},
  {id: 'last_30', label: 'Last 30 Days', primary: false},
  {id: 'all', label: 'All Dates', primary: false},
];

export const PRIMARY_DATE_RANGES = DATE_RANGE_OPTIONS.filter(
  option => option.primary,
);

export const OVERFLOW_DATE_RANGES = DATE_RANGE_OPTIONS.filter(
  option => !option.primary,
);
