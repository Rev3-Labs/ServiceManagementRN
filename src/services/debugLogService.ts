import {DebugLogEntry, DateRangeId, LogType} from '../types/debugLogs';

function startOfDay(date: Date): Date {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function atTime(
  daysAgo: number,
  hours: number,
  minutes: number,
  seconds = 0,
  now = new Date(),
): number {
  const date = startOfDay(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hours, minutes, seconds, 0);
  return date.getTime();
}

function buildMockLogs(now = new Date()): DebugLogEntry[] {
  const entries: DebugLogEntry[] = [
    {
      id: 'log-today-1',
      type: 'crash',
      message: 'Native crash on container save',
      timestamp: atTime(0, 8, 12, 41, now),
      details:
        'SIGSEGV in ContainerRepository.save()\n    at native ContainerDao.insert\n    at ContainerEntryScreen.handleSave',
      context: {orderNumber: 'WO-10482', containerId: 'C-2291'},
    },
    {
      id: 'log-today-2',
      type: 'exception',
      message: 'Unhandled promise rejection in sync worker',
      timestamp: atTime(0, 7, 58, 3, now),
      details:
        'TypeError: Cannot read property \'payload\' of undefined\n    at SyncWorker.flushBatch (syncWorker.ts:214)\n    at async SyncService.syncPendingOperations',
      context: {queueSize: 6},
    },
    {
      id: 'log-today-3',
      type: 'error',
      message: 'Container label reprint failed (HTTP 500)',
      timestamp: atTime(0, 7, 40, 12, now),
      details: 'POST /api/labels/reprint returned 500 Internal Server Error',
      context: {status: 500, printer: 'Zebra ZT411'},
    },
    {
      id: 'log-today-4',
      type: 'sync_event',
      message: 'Incremental sync completed',
      timestamp: atTime(0, 7, 12, 8, now),
      details: 'Pushed 4 operations, pulled 12 masterdata records.',
      context: {pushed: 4, pulled: 12, durationMs: 1840},
    },
    {
      id: 'log-today-5',
      type: 'network',
      message: 'Request timeout reaching masterdata service',
      timestamp: atTime(0, 6, 47, 31, now),
      details: 'GET /api/masterdata/streams timed out after 15000ms',
      context: {timeoutMs: 15000, attempt: 2},
    },
    {
      id: 'log-today-6',
      type: 'app_lifecycle',
      message: 'User authenticated',
      timestamp: atTime(0, 6, 15, 2, now),
      context: {username: 'admin'},
    },
    {
      id: 'log-today-7',
      type: 'user_action',
      message: 'Print initiated for manifest',
      timestamp: atTime(0, 6, 5, 44, now),
      context: {orderNumber: 'WO-10482', copies: 1},
    },
    {
      id: 'log-today-8',
      type: 'app_info',
      message: 'App version 0.1.0 started on Zebra ET45',
      timestamp: atTime(0, 6, 4, 11, now),
      context: {platform: 'android', model: 'ET45'},
    },
    {
      id: 'log-today-9',
      type: 'error',
      message: 'Scale reading discarded — unstable weight',
      timestamp: atTime(0, 9, 22, 18, now),
      details: 'Consecutive readings differed by more than 0.2 lb.',
      context: {unit: 'lb', samples: '41.2, 41.6, 41.1'},
    },
    {
      id: 'log-today-10',
      type: 'user_action',
      message: 'Container photo captured',
      timestamp: atTime(0, 9, 18, 2, now),
      context: {containerId: 'C-2291', source: 'camera'},
    },
    {
      id: 'log-1d-1',
      type: 'crash',
      message: 'Native crash on container save',
      timestamp: atTime(1, 8, 12, 41, now),
      details:
        'SIGSEGV in ContainerRepository.save()\n    at native ContainerDao.insert\n    at ContainerEntryScreen.handleSave',
      context: {orderNumber: 'WO-10471', containerId: 'C-2188'},
    },
    {
      id: 'log-1d-2',
      type: 'exception',
      message: 'Unhandled promise rejection in sync worker',
      timestamp: atTime(1, 7, 58, 3, now),
      details:
        'TypeError: Cannot read property \'payload\' of undefined\n    at SyncWorker.flushBatch (syncWorker.ts:214)',
    },
    {
      id: 'log-1d-3',
      type: 'error',
      message: 'Container label reprint failed (HTTP 500)',
      timestamp: atTime(1, 7, 40, 12, now),
      context: {status: 500},
    },
    {
      id: 'log-2d-1',
      type: 'sync_event',
      message: 'Incremental sync completed',
      timestamp: atTime(2, 19, 2, 55, now),
      context: {pushed: 8, pulled: 3},
    },
    {
      id: 'log-2d-2',
      type: 'network',
      message: 'Request timeout reaching masterdata service',
      timestamp: atTime(2, 18, 47, 31, now),
      context: {timeoutMs: 15000},
    },
    {
      id: 'log-2d-3',
      type: 'app_lifecycle',
      message: 'User authenticated',
      timestamp: atTime(2, 6, 15, 2, now),
    },
    {
      id: 'log-2d-4',
      type: 'user_action',
      message: 'Print initiated for manifest',
      timestamp: atTime(2, 6, 5, 44, now),
      context: {orderNumber: 'WO-10455'},
    },
    {
      id: 'log-3d-1',
      type: 'error',
      message: 'Manifest generate failed — missing generator EPA ID',
      timestamp: atTime(3, 14, 11, 9, now),
      context: {orderNumber: 'WO-10440'},
    },
    {
      id: 'log-3d-2',
      type: 'sync_event',
      message: 'Full sync started after 8h offline',
      timestamp: atTime(3, 11, 2, 40, now),
    },
    {
      id: 'log-4d-1',
      type: 'network',
      message: '401 from auth service — token refreshed',
      timestamp: atTime(4, 16, 44, 22, now),
      context: {status: 401},
    },
    {
      id: 'log-5d-1',
      type: 'user_action',
      message: 'Duty started',
      timestamp: atTime(5, 5, 58, 1, now),
    },
    {
      id: 'log-5d-2',
      type: 'app_lifecycle',
      message: 'App resumed from background',
      timestamp: atTime(5, 12, 3, 18, now),
    },
    {
      id: 'log-6d-1',
      type: 'exception',
      message: 'JSON parse failed on work-order payload',
      timestamp: atTime(6, 10, 21, 7, now),
      details: 'SyntaxError: Unexpected token < in JSON at position 0',
    },
    {
      id: 'log-8d-1',
      type: 'error',
      message: 'Printer not found on Bluetooth scan',
      timestamp: atTime(8, 9, 30, 0, now),
      context: {adapter: 'bluetooth'},
    },
    {
      id: 'log-10d-1',
      type: 'sync_event',
      message: 'Pending operations replayed after reconnect',
      timestamp: atTime(10, 15, 4, 51, now),
      context: {count: 11},
    },
    {
      id: 'log-14d-1',
      type: 'app_info',
      message: 'Feature flag offline-v2 enabled',
      timestamp: atTime(14, 8, 0, 0, now),
    },
    {
      id: 'log-18d-1',
      type: 'crash',
      message: 'JNI abort while encoding label ZPL',
      timestamp: atTime(18, 13, 27, 19, now),
    },
    {
      id: 'log-21d-1',
      type: 'network',
      message: 'DNS lookup failed for api.cleanearth.local',
      timestamp: atTime(21, 17, 9, 33, now),
    },
    {
      id: 'log-28d-1',
      type: 'user_action',
      message: 'Truck assignment changed',
      timestamp: atTime(28, 6, 42, 10, now),
      context: {truck: 'T-118'},
    },
  ];

  return entries.sort((a, b) => b.timestamp - a.timestamp);
}

const cachedLogs = buildMockLogs();

export function getDebugLogs(): DebugLogEntry[] {
  return cachedLogs;
}

export function getDateRangeStart(
  range: DateRangeId,
  now = new Date(),
): number | null {
  if (range === 'all') {
    return null;
  }
  const start = startOfDay(now);
  if (range === 'today') {
    return start.getTime();
  }
  const days =
    range === 'last_3' ? 3 : range === 'last_7' ? 7 : range === 'last_14' ? 14 : 30;
  start.setDate(start.getDate() - (days - 1));
  return start.getTime();
}

export function filterDebugLogs(
  logs: DebugLogEntry[],
  types: ReadonlySet<LogType>,
  range: DateRangeId,
  now = new Date(),
): DebugLogEntry[] {
  const rangeStart = getDateRangeStart(range, now);
  return logs.filter(entry => {
    if (types.size > 0 && !types.has(entry.type)) {
      return false;
    }
    if (rangeStart != null && entry.timestamp < rangeStart) {
      return false;
    }
    return true;
  });
}

export function formatLogTimestamp(timestamp: number): string {
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function buildLogFileName(username?: string, now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const slug = (username || 'device').toLowerCase().replace(/[^a-z0-9]+/g, '');
  return `uploaded-logs-${stamp}-${slug || 'device'}.jsonl`;
}
