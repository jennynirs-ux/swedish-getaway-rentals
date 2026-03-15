// Error monitoring integration point
// Replace with actual Sentry/Datadog/etc. when ready for production

interface ErrorContext {
  component?: string;
  action?: string;
  userId?: string;
  extra?: Record<string, unknown>;
}

export function captureError(error: Error, context?: ErrorContext): void {
  // In production, this would send to Sentry:
  // Sentry.captureException(error, { extra: context });
  console.error('[Error Monitor]', error.message, context);
}

export function captureMessage(message: string, level: 'info' | 'warning' | 'error' = 'info'): void {
  console.log(`[Monitor:${level}]`, message);
}

export function setUser(userId: string | null): void {
  // In production: Sentry.setUser(userId ? { id: userId } : null);
}
