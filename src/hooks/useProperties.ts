import { useQuery } from '@tanstack/react-query';
import { getProperties } from '@/services/propertyService';
import { CACHE_STALE_TIME, CACHE_GC_TIME } from '@/lib/constants';
import type { Property } from '@/types/property';

// Re-export for backward compatibility
export type { Property } from '@/types/property';

/**
 * OPTIMIZED: Uses React Query for efficient caching and state management
 * - staleTime: 10 minutes
 * - gcTime: 20 minutes
 * - Automatic refetching and error handling
 */
export const useProperties = () => {
  const { data: properties = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
    staleTime: CACHE_STALE_TIME, // 10 minutes
    gcTime: CACHE_GC_TIME, // 20 minutes cache
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const error_message = error instanceof Error ? error.message : (error ? 'Failed to fetch properties' : null);

  return {
    properties,
    loading,
    error: error_message,
    refetch
  };
};