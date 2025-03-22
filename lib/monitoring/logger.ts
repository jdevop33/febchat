/**
 * Production-grade monitoring and logging service for Oak Bay Municipal Bylaw System
 *
 * This module provides structured logging and performance monitoring for production use.
 */

// Timestamp generator for consistent logging
const getTimestamp = () => new Date().toISOString();

// Log event types for categorization and filtering
type LogEventType =
  | 'search'
  | 'error'
  | 'api'
  | 'bylaw_access'
  | 'authentication'
  | 'performance'
  | 'feedback'
  | 'admin'
  | 'security';

// Severity levels for alerts and monitoring
type LogSeverity = 'debug' | 'info' | 'warn' | 'error' | 'critical';

// Log entry structure for consistent format
interface LogEntry {
  timestamp: string;
  eventType: LogEventType;
  severity: LogSeverity;
  message: string;
  data?: any;
  userId?: string;
  bylawNumber?: string;
  section?: string;
  requestId?: string;
  url?: string;
  duration?: number;
}

// Buffer for batched logs (reduces I/O overhead in high-volume scenarios)
const logBuffer: LogEntry[] = [];
const MAX_BUFFER_SIZE = 20;
const FLUSH_INTERVAL_MS = 10000; // 10 seconds

// Set up periodic buffer flush
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    flushLogBuffer();
  }, FLUSH_INTERVAL_MS);
}

/**
 * Flush buffered logs to their destination
 */
function flushLogBuffer(): void {
  if (logBuffer.length === 0) return;

  // In a production setup, this would send logs to a centralized logging service
  if (process.env.NODE_ENV === 'production' && process.env.LOG_ENDPOINT) {
    // This is where you'd send logs to your logging service
    // fetch(process.env.LOG_ENDPOINT, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(logBuffer)
    // }).catch(err => console.error('Error sending logs:', err));
  }

  // For development, just print to console
  if (process.env.NODE_ENV !== 'production') {
    logBuffer.forEach((entry) => {
      const message = `[${entry.timestamp}] [${entry.eventType}] ${entry.message}`;

      switch (entry.severity) {
        case 'debug':
          console.debug(message, entry.data);
          break;
        case 'info':
          console.log(message, entry.data);
          break;
        case 'warn':
          console.warn(message, entry.data);
          break;
        case 'error':
        case 'critical':
          console.error(message, entry.data);
          break;
      }
    });
  }

  // Clear the buffer
  logBuffer.length = 0;
}

/**
 * Format and write a log entry to the appropriate destination
 * Uses buffering for better performance in high-volume scenarios
 */
function writeLog(entry: LogEntry): void {
  // Remove sensitive data in production
  if (process.env.NODE_ENV === 'production') {
    // Sanitize the entry data to remove potentially sensitive information
    if (entry.data) {
      // Remove passwords, tokens, etc.
      const sanitizedData = { ...entry.data };
      ['password', 'token', 'secret', 'key', 'apiKey'].forEach((key) => {
        if (key in sanitizedData) {
          sanitizedData[key] = '[REDACTED]';
        }
      });
      entry.data = sanitizedData;
    }
  }

  // Add entry to buffer
  logBuffer.push(entry);

  // If buffer is full or entry is critical, flush immediately
  if (logBuffer.length >= MAX_BUFFER_SIZE || entry.severity === 'critical') {
    flushLogBuffer();
  }

  // For critical errors in production, also trigger immediate alerts
  if (entry.severity === 'critical' && process.env.NODE_ENV === 'production') {
    // This would integrate with an alerting system
    // sendAlert(entry);
  }
}

/**
 * Log a bylaw search event
 */
export function logSearch(
  query: string,
  resultCount: number,
  duration: number,
  options?: {
    userId?: string;
    filters?: Record<string, any>;
    error?: Error;
  },
): void {
  const severity = options?.error ? 'error' : 'info';

  writeLog({
    timestamp: getTimestamp(),
    eventType: 'search',
    severity,
    message: `Bylaw search: "${query}" (${resultCount} results in ${duration}ms)`,
    data: {
      query,
      resultCount,
      duration,
      filters: options?.filters,
      error: options?.error ? options.error.message : undefined,
    },
    userId: options?.userId,
  });
}

/**
 * Log a bylaw access event (view, download, etc.)
 */
export function logBylawAccess(
  bylawNumber: string,
  section: string | undefined,
  action: 'view' | 'download' | 'cite',
  options?: {
    userId?: string;
    error?: Error;
  },
): void {
  const severity = options?.error ? 'error' : 'info';

  writeLog({
    timestamp: getTimestamp(),
    eventType: 'bylaw_access',
    severity,
    message: `Bylaw ${action}: No. ${bylawNumber}${section ? `, Section ${section}` : ''}`,
    data: {
      action,
      error: options?.error ? options.error.message : undefined,
    },
    userId: options?.userId,
    bylawNumber,
    section,
  });
}

/**
 * Log API performance metrics
 */
export function logApiPerformance(
  endpoint: string,
  duration: number,
  options?: {
    userId?: string;
    requestId?: string;
    statusCode?: number;
    method?: string;
  },
): void {
  // Determine severity based on duration thresholds
  let severity: LogSeverity = 'info';
  if (duration > 5000) {
    severity = 'warn';
  } else if (duration > 10000) {
    severity = 'error';
  }

  writeLog({
    timestamp: getTimestamp(),
    eventType: 'performance',
    severity,
    message: `API ${options?.method || 'GET'} ${endpoint} completed in ${duration}ms`,
    data: {
      endpoint,
      duration,
      statusCode: options?.statusCode,
      method: options?.method,
    },
    userId: options?.userId,
    requestId: options?.requestId,
    url: endpoint,
    duration,
  });
}

/**
 * Log error events with context
 */
export function logError(
  error: Error,
  context: string,
  options?: {
    userId?: string;
    bylawNumber?: string;
    critical?: boolean;
    requestId?: string;
  },
): void {
  writeLog({
    timestamp: getTimestamp(),
    eventType: 'error',
    severity: options?.critical ? 'critical' : 'error',
    message: `Error in ${context}: ${error.message}`,
    data: {
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      context,
    },
    userId: options?.userId,
    bylawNumber: options?.bylawNumber,
    requestId: options?.requestId,
  });
}

/**
 * Log user feedback on bylaw citations
 */
export function logFeedback(
  bylawNumber: string,
  section: string | undefined,
  feedbackType: 'correct' | 'incorrect' | 'incomplete' | 'outdated',
  options?: {
    userId?: string;
    comment?: string;
  },
): void {
  writeLog({
    timestamp: getTimestamp(),
    eventType: 'feedback',
    severity: feedbackType === 'correct' ? 'info' : 'warn',
    message: `User feedback: ${feedbackType} for Bylaw No. ${bylawNumber}${section ? `, Section ${section}` : ''}`,
    data: {
      feedbackType,
      comment: options?.comment,
    },
    userId: options?.userId,
    bylawNumber,
    section,
  });
}

/**
 * Create a request logger middleware for Next.js API routes
 */
export function createRequestLogger() {
  return async (req: Request, context: any, next: () => Promise<Response>) => {
    const startTime = Date.now();
    const requestId = Math.random().toString(36).substring(2, 15);
    const url = new URL(req.url).pathname;

    try {
      // Call the next middleware/route handler
      const response = await next();

      // Log API performance
      const duration = Date.now() - startTime;
      logApiPerformance(url, duration, {
        requestId,
        statusCode: response.status,
        method: req.method,
      });

      return response;
    } catch (error) {
      // Log the error
      logError(error as Error, `API Request: ${url}`, {
        requestId,
      });

      // Re-throw to let the error handler middleware deal with it
      throw error;
    }
  };
}

// Export the main logging API
export const logger = {
  search: logSearch,
  bylawAccess: logBylawAccess,
  apiPerformance: logApiPerformance,
  error: logError,
  feedback: logFeedback,
  // Add standard logging methods to match console interface
  info: (message: string, data?: any) => {
    writeLog({
      timestamp: getTimestamp(),
      eventType: 'api',
      severity: 'info',
      message,
      data,
    });
  },
  warn: (message: string, data?: any) => {
    writeLog({
      timestamp: getTimestamp(),
      eventType: 'api',
      severity: 'warn',
      message,
      data,
    });
  },
  debug: (message: string, data?: any) => {
    writeLog({
      timestamp: getTimestamp(),
      eventType: 'api',
      severity: 'debug',
      message,
      data,
    });
  },
};
