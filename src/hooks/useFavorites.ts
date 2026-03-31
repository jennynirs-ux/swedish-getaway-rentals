import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFavorites = (userId?: string) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFavorites = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('property_id')
        .eq('user_id', userId);

      if (error) throw error;
      setFavorites(data?.map(f => f.property_id) || []);
    } catch (error) {
      console.error('Error fetching favorites:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFavorite = async (propertyId: string) => {
    if (!userId) {
      toast({
        title: "Login required",
        description: "Please log in to save favorites",
        variant: "destructive"
      });
      return;
    }

    const isFavorite = favorites.includes(propertyId);

    try {
      if (isFavorite) {
        const { error } = await supabase
          .from('user_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('property_id', propertyId);

        if (error) throw error;
        setFavorites(prev => prev.filter(id => id !== propertyId));
      } else {
        const { error } = await supabase
          .from('user_favorites')
          .insert({ user_id: userId, property_id: propertyId });

        if (error) throw error;
        setFavorites(prev => [...prev, propertyId]);
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorites",
        variant: "destructive"
      });
    }
  };

  const getFavoriteProperties = async () => {
    if (!userId) return [];
    
    try {
      const { data, error } = await supabase
        .from('user_favorites')
        .select(`
          property_id,
          properties (
            id,
            title,
            description,
            location,
            price_per_night,
            currency,
            bedrooms,
            bathrooms,
            max_guests,
            amenities,
            hero_image_url,
            active,
            host_id,
            review_rating,
            review_count
          )
        `)
        .eq('user_id', userId);

      if (error) throw error;
      return data?.map(f => f.properties).filter(Boolean) || [];
    } catch (error) {
      console.error('Error fetching favorite properties:', error);
      return [];
    }
  };

  useEffect(() => {
    fetchFavorites();
  }, [userId]);

  return {
    favorites,
    loading,
    toggleFavorite,
    getFavoriteProperties,
    isFavorite: (propertyId: string) => favorites.includes(propertyId)
  };
};