// Error monitoring abstraction layer
// Currently logs to console. To enable Sentry:
// 1. npm install @sentry/react
// 2. Set VITE_SENTRY_DSN in your .env
// 3. Uncomment the Sentry integration below

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export function captureError(error: Error, context?: ErrorContext): void {
  // Structured JSON in production for log aggregators
  if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    console.error('[Error Monitor]', error.message, context);
  } else {
    console.error(
      JSON.stringify({
        level: 'error',
        message: error.message,
        stack: error.stack,
        ...context,
      })
    );
  }
}

export function captureMessage(
  message: string,
  level: 'info' | 'warning' | 'error' = 'info'
): void {
  if (typeof window !== 'undefined' && import.meta.env?.DEV) {
    console.log(`[Monitor:${level}]`, message);
  }
}

export function setUser(_userId: string | null): void {
  // No-op until Sentry is installed
}
