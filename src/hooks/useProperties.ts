import { useQuery } from '@tanstack/react-query';
import { getProperties } from '@/services/propertyService';
import type { Property } from '@/types/property';

// Re-export for backward compatibility
export type { Property } from '@/types/property';

/**
 * OPTIMIZED: Uses React Query for efficient caching and state management
 * - staleTime: 5 minutes
 * - gcTime: 10 minutes
 * - Automatic refetching and error handling
 */
export const useProperties = () => {
  const { data: properties = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['properties'],
    queryFn: getProperties,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache
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