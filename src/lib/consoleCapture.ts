/**
 * Captures console.log, console.error, console.warn and notifies subscribers.
 * Import once at app startup (e.g. main.tsx) so the bottom panel can display logs.
 */

export interface ConsoleLogEntry {
  id: string;
  timestamp: Date;
  type: 'log' | 'error' | 'warn';
  message: string;
  data?: unknown;
}

const MAX_LOGS = 10;

let logs: ConsoleLogEntry[] = [];
const listeners: Array<(entries: ConsoleLogEntry[]) => void> = [];

function notify() {
  listeners.forEach((fn) => fn([...logs]));
}

function addEntry(entry: ConsoleLogEntry) {
  logs = [...logs, entry];
  if (logs.length > MAX_LOGS) {
    logs = logs.slice(-MAX_LOGS);
  }
  notify();
}

const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;

function formatArg(arg: unknown): string {
  if (arg === null) return 'null';
  if (arg === undefined) return 'undefined';
  if (typeof arg === 'object') return JSON.stringify(arg, null, 2);
  return String(arg);
}

console.log = (...args: unknown[]) => {
  originalLog(...args);
  addEntry({
    id: `log-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    type: 'log',
    message: args.map(formatArg).join(' '),
    data: args.length > 1 ? args : args[0],
  });
};

console.error = (...args: unknown[]) => {
  originalError(...args);
  addEntry({
    id: `error-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    type: 'error',
    message: args.map(formatArg).join(' '),
    data: args.length > 1 ? args : args[0],
  });
};

console.warn = (...args: unknown[]) => {
  originalWarn(...args);
  addEntry({
    id: `warn-${Date.now()}-${Math.random()}`,
    timestamp: new Date(),
    type: 'warn',
    message: args.map(formatArg).join(' '),
    data: args.length > 1 ? args : args[0],
  });
};

export function getLogs(): ConsoleLogEntry[] {
  return [...logs];
}

export function subscribeToLogs(fn: (entries: ConsoleLogEntry[]) => void): () => void {
  listeners.push(fn);
  fn([...logs]);
  return () => {
    const i = listeners.indexOf(fn);
    if (i !== -1) listeners.splice(i, 1);
  };
}

export function clearLogs(): void {
  logs = [];
  notify();
}
