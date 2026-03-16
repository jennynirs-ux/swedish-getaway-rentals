import { useState, useEffect } from 'react';
import { getProperties } from '@/services/propertyService';
import type { Property } from '@/types/property';

// Re-export for backward compatibility
export type { Property } from '@/types/property';

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const data = await getProperties();
      setProperties(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  return { properties, loading, error, refetch: fetchProperties };
};