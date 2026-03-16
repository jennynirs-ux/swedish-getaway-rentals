import { useQuery } from '@tanstack/react-query';
import { getCurrentUser, getUserProfile } from '@/services/authService';
import { supabase } from "@/integrations/supabase/client";
import { Property } from './useProperties';

/**
 * OPTIMIZED: Uses React Query for efficient caching and state management
 * - Depends on user authentication
 * - Uses React Query's built-in error and loading states
 */
export const useHostProperties = () => {
  const { data: properties = [], isLoading: loading, error, refetch } = useQuery({
    queryKey: ['hostProperties'],
    queryFn: async () => {
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

      return mappedData;
    },
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