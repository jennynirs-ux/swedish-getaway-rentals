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
        .select(`
          id,
          host_id,
          title,
          description,
          location,
          price_per_night,
          currency,
          max_guests,
          bedrooms,
          bathrooms,
          hero_image_url,
          amenities,
          active,
          review_rating,
          review_count,
          property_type,
          special_amenities,
          featured_amenities,
          amenities_data
        `)
        .eq('host_id', profile.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        gallery_metadata: Array.isArray(item.gallery_metadata) ? item.gallery_metadata : [],
        amenities: Array.isArray(item.amenities) ? item.amenities : [],
        special_amenities: Array.isArray(item.special_amenities) ? item.special_amenities : [],
        featured_amenities: Array.isArray(item.featured_amenities) ? item.featured_amenities : [],
        amenities_data: Array.isArray(item.amenities_data) ? item.amenities_data : []
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