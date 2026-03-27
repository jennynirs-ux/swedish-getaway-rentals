// Error monitoring abstraction layer
// Supports Sentry when installed, falls back to structured console logging.
//
// To enable Sentry:
// 1. npm install @sentry/react
// 2. Set VITE_SENTRY_DSN in your .env
// 3. Sentry auto-initializes on first import of this module

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

// Lazy-loaded Sentry reference (avoids hard dependency)
let Sentry: typeof import('@sentry/react') | null = null;
let sentryInitialized = false;

async function initSentry(): Promise<void> {
  if (sentryInitialized) return;
  sentryInitialized = true;

  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  try {
    Sentry = await import('@sentry/react');
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE,
      enabled: import.meta.env.PROD,
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 1.0,
      beforeSend(event) {
        // Strip PII from breadcrumbs
        if (event.breadcrumbs) {
          event.breadcrumbs = event.breadcrumbs.map((bc) => ({
            ...bc,
            data: bc.data ? { url: bc.data.url } : undefined,
          }));
        }
        return event;
      },
    });
  } catch {
    // @sentry/react not installed -- silent fallback to console
    Sentry = null;
  }
}

// Initialize on module load (non-blocking)
initSentry();

export function captureError(error: Error, context?: ErrorContext): void {
  if (Sentry) {
    Sentry.captureException(error, {
      extra: context as Record<string, unknown>,
    });
  }

  // Always log in development; structured JSON in production for log aggregators
  if (import.meta.env.DEV) {
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
  if (Sentry) {
    Sentry.captureMessage(message, level);
  }

  if (import.meta.env.DEV) {
    console.log(`[Monitor:${level}]`, message);
  }
}

export function setUser(userId: string | null): void {
  if (Sentry) {
    Sentry.setUser(userId ? { id: userId } : null);
  }
}
