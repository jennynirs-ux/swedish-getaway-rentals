import { useRef, useCallback } from 'react';

/**
 * Client-side rate limiter for admin operations.
 * Prevents accidental rapid-fire API calls (e.g., double-clicks, spam).
 * This is NOT a security measure — server-side RLS is the real guard.
 */
export function useRateLimit(maxCalls: number = 10, windowMs: number = 60_000) {
  const callTimestamps = useRef<number[]>([]);

  const checkRateLimit = useCallback((): boolean => {
    const now = Date.now();
    // Remove expired timestamps
    callTimestamps.current = callTimestamps.current.filter(t => now - t < windowMs);

    if (callTimestamps.current.length >= maxCalls) {
      return false; // Rate limited
    }

    callTimestamps.current.push(now);
    return true; // Allowed
  }, [maxCalls, windowMs]);

  const isLimited = useCallback((): boolean => {
    const now = Date.now();
    const recent = callTimestamps.current.filter(t => now - t < windowMs);
    return recent.length >= maxCalls;
  }, [maxCalls, windowMs]);

  return { checkRateLimit, isLimited };
}
