import { useState, useEffect } from 'react';
import { getCurrentUser, getUserProfile } from '@/services/authService';
import { supabase } from "@/integrations/supabase/client";
import { Property } from './useProperties';

export const useHostProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHostProperties = async () => {
    try {
      setLoading(true);
      const user = await getCurrentUser();

      if (!user) {
        throw new Error('User not authenticated');
      }

      const profile = await getUserProfile(user.id);
      if (!profile?.id) {
        throw new Error('User profile not found');
      }

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