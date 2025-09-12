import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Property } from './useProperties';

export const useHostProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHostProperties = async () => {
    try {
      setLoading(true);
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (profileError) throw profileError;

      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('host_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        gallery_metadata: Array.isArray(item.gallery_metadata) ? item.gallery_metadata : []
      }));
      
      setProperties(mappedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch properties');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHostProperties();
  }, []);

  return { properties, loading, error, refetch: fetchHostProperties };
};