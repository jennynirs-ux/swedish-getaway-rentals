import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface UseOptimizedQueryOptions {
  cacheTime?: number;
  staleTime?: number;
  enableRealtime?: boolean;
  realtimeFilter?: any;
}

interface QueryResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Simple cache implementation
const queryCache = new Map<string, { data: any; timestamp: number; staleTime: number }>();

export function useOptimizedQuery<T>(
  key: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  options: UseOptimizedQueryOptions = {}
): QueryResult<T> {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutes
    staleTime = 30 * 1000, // 30 seconds
    enableRealtime = false,
    realtimeFilter
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const queryFnRef = useRef(queryFn);

  // Keep queryFnRef in sync
  useEffect(() => {
    queryFnRef.current = queryFn;
  }, [queryFn]);

  const executeQuery = useCallback(async (useCache = true) => {
    // Check cache first
    if (useCache) {
      const cached = queryCache.get(key);
      if (cached && Date.now() - cached.timestamp < cached.staleTime) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      const result = await queryFnRef.current();

      if (result.error) {
        throw result.error;
      }

      // Cache the result
      queryCache.set(key, {
        data: result.data,
        timestamp: Date.now(),
        staleTime
      });

      setData(result.data);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setError(err.message || 'An error occurred');
      }
    } finally {
      setLoading(false);
    }
  }, [key, staleTime]);

  const refetch = useCallback(() => executeQuery(false), [executeQuery]);

  useEffect(() => {
    executeQuery();

    // Set up realtime subscription if enabled
    let channel: any = null;
    if (enableRealtime && realtimeFilter) {
      channel = supabase
        .channel(`realtime-${key}`)
        .on('postgres_changes', realtimeFilter, () => {
          // Invalidate cache and refetch
          queryCache.delete(key);
          executeQuery(false);
        })
        .subscribe();
    }

    // Cleanup cache after cacheTime
    const cacheTimeout = setTimeout(() => {
      queryCache.delete(key);
    }, cacheTime);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (channel) {
        supabase.removeChannel(channel);
      }
      clearTimeout(cacheTimeout);
    };
  }, [key, executeQuery, enableRealtime, realtimeFilter, cacheTime]);

  return { data, loading, error, refetch };
}

// Utility to preload queries
export const preloadQuery = <T>(
  key: string,
  queryFn: () => Promise<{ data: T | null; error: any }>,
  staleTime = 30 * 1000
) => {
  const cached = queryCache.get(key);
  if (!cached || Date.now() - cached.timestamp >= cached.staleTime) {
    queryFn().then(result => {
      if (!result.error) {
        queryCache.set(key, {
          data: result.data,
          timestamp: Date.now(),
          staleTime
        });
      }
    });
  }
};

// Clear all cache
export const clearQueryCache = () => {
  queryCache.clear();
};