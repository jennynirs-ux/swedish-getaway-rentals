/** Custom error class for API/service errors */
export class AppError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/** Wrap a Supabase query result and throw on error */
export function handleSupabaseError<T>(result: { data: T | null; error: any }, context: string): T {
  if (result.error) {
    console.error(`[${context}]`, result.error);
    throw new AppError(
      result.error.message || `Failed to ${context}`,
      result.error.code || 'UNKNOWN',
      result.error.status
    );
  }
  if (result.data === null) {
    throw new AppError(`No data returned from ${context}`, 'NO_DATA');
  }
  return result.data;
}

/** Safe async wrapper that returns [data, error] tuple */
export async function safeAsync<T>(fn: () => Promise<T>): Promise<[T, null] | [null, Error]> {
  try {
    const data = await fn();
    return [data, null];
  } catch (error) {
    return [null, error instanceof Error ? error : new Error(String(error))];
  }
}
