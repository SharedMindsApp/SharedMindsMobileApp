/**
 * Error Logger
 * 
 * Comprehensive error logging system for mobile app debugging.
 * Persists logs to localStorage and provides UI-accessible debug panel.
 */

export interface ErrorLog {
  id: string;
  timestamp: number;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  context?: {
    component?: string;
    action?: string;
    userId?: string;
    url?: string;
    userAgent?: string;
    networkStatus?: 'online' | 'offline';
    [key: string]: unknown;
  };
  metadata?: Record<string, unknown>;
}

const MAX_LOGS = 500; // Keep last 500 logs
const LOG_STORAGE_KEY = 'app_error_logs';
const LOG_LEVEL_KEY = 'app_log_level';

export type LogLevel = 'error' | 'warn' | 'info' | 'debug';

let currentLogLevel: LogLevel = 'info';

// Initialize log level from storage
if (typeof window !== 'undefined') {
  try {
    const stored = localStorage.getItem(LOG_LEVEL_KEY);
    if (stored && ['error', 'warn', 'info', 'debug'].includes(stored)) {
      currentLogLevel = stored as LogLevel;
    }
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Get all stored logs
 */
export function getLogs(): ErrorLog[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(LOG_STORAGE_KEY);
    if (!stored) return [];
    
    const logs = JSON.parse(stored) as ErrorLog[];
    return logs.sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  } catch (error) {
    console.error('[ErrorLogger] Failed to read logs:', error);
    return [];
  }
}

/**
 * Save logs to storage
 */
function saveLogs(logs: ErrorLog[]): void {
  if (typeof window === 'undefined') return;
  
  try {
    // Keep only the most recent logs
    const trimmed = logs.slice(0, MAX_LOGS);
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error('[ErrorLogger] Failed to save logs:', error);
    // If storage is full, clear old logs and try again
    try {
      const oldLogs = logs.slice(0, Math.floor(MAX_LOGS / 2));
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(oldLogs));
    } catch {
      // Last resort: clear all logs
      try {
        localStorage.removeItem(LOG_STORAGE_KEY);
      } catch {
        // Can't do anything more
      }
    }
  }
}

/**
 * Add a log entry
 */
function addLog(log: Omit<ErrorLog, 'id' | 'timestamp'>): void {
  const logs = getLogs();
  
  const newLog: ErrorLog = {
    ...log,
    id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
    timestamp: Date.now(),
    context: {
      ...log.context,
      url: typeof window !== 'undefined' ? window.location.href : undefined,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      networkStatus: typeof navigator !== 'undefined' ? (navigator.onLine ? 'online' : 'offline') : undefined,
    },
  };

  logs.unshift(newLog);
  saveLogs(logs);

  // Also log to console in development
  if (import.meta.env.DEV) {
    const consoleMethod = log.level === 'error' ? 'error' : log.level === 'warn' ? 'warn' : 'log';
    console[consoleMethod](`[${log.level.toUpperCase()}]`, log.message, log.error || log.context);
  }
}

/**
 * Check if log level should be recorded
 */
function shouldLog(level: LogLevel): boolean {
  const levels: LogLevel[] = ['error', 'warn', 'info', 'debug'];
  const currentIndex = levels.indexOf(currentLogLevel);
  const logIndex = levels.indexOf(level);
  return logIndex <= currentIndex;
}

/**
 * Log an error
 */
export function logError(
  message: string,
  error?: Error | unknown,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('error')) return;

  let errorInfo: ErrorLog['error'] | undefined;

  if (error instanceof Error) {
    errorInfo = {
      name: error.name,
      message: error.message,
      stack: error.stack,
    };
  } else if (error) {
    errorInfo = {
      name: 'UnknownError',
      message: String(error),
    };
  }

  addLog({
    level: 'error',
    message,
    error: errorInfo,
    context,
  });
}

/**
 * Log a warning
 */
export function logWarning(
  message: string,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('warn')) return;

  addLog({
    level: 'warn',
    message,
    context,
  });
}

/**
 * Log info
 */
export function logInfo(
  message: string,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('info')) return;

  addLog({
    level: 'info',
    message,
    context,
  });
}

/**
 * Log debug info
 */
export function logDebug(
  message: string,
  context?: ErrorLog['context']
): void {
  if (!shouldLog('debug')) return;

  addLog({
    level: 'debug',
    message,
    context,
  });
}

/**
 * Clear all logs
 */
export function clearLogs(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LOG_STORAGE_KEY);
  } catch (error) {
    console.error('[ErrorLogger] Failed to clear logs:', error);
  }
}

/**
 * Export logs as JSON
 */
export function exportLogs(): string {
  const logs = getLogs();
  return JSON.stringify(logs, null, 2);
}

/**
 * Export logs as text (readable format)
 */
export function exportLogsAsText(): string {
  const logs = getLogs();
  
  return logs.map(log => {
    const date = new Date(log.timestamp).toISOString();
    const level = log.level.toUpperCase().padEnd(5);
    let text = `[${date}] ${level} ${log.message}`;
    
    if (log.context?.component) {
      text += ` | Component: ${log.context.component}`;
    }
    if (log.context?.action) {
      text += ` | Action: ${log.context.action}`;
    }
    if (log.error) {
      text += `\n  Error: ${log.error.name}: ${log.error.message}`;
      if (log.error.stack) {
        text += `\n  Stack: ${log.error.stack}`;
      }
    }
    if (log.context && Object.keys(log.context).length > 0) {
      const contextStr = JSON.stringify(log.context, null, 2);
      if (contextStr.length < 500) {
        text += `\n  Context: ${contextStr}`;
      }
    }
    
    return text;
  }).join('\n\n');
}

/**
 * Set log level
 */
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOG_LEVEL_KEY, level);
    } catch {
      // Ignore storage errors
    }
  }
}

/**
 * Get current log level
 */
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

/**
 * Get error count by level
 */
export function getErrorCounts(): {
  error: number;
  warn: number;
  info: number;
  debug: number;
  total: number;
} {
  const logs = getLogs();
  const counts = {
    error: 0,
    warn: 0,
    info: 0,
    debug: 0,
    total: logs.length,
  };

  logs.forEach(log => {
    counts[log.level]++;
  });

  return counts;
}

/**
 * Get recent errors (last N errors)
 */
export function getRecentErrors(count: number = 10): ErrorLog[] {
  const logs = getLogs();
  return logs.filter(log => log.level === 'error').slice(0, count);
}

