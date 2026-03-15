import { useState, useEffect } from 'react';
import { getFavoriteIds, toggleFavorite as toggleFavoriteService, getFavoriteProperties } from '@/services/favoritesService';
import { useToast } from '@/hooks/use-toast';

export const useFavorites = (userId?: string) => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const fetchFavorites = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      const favoriteIds = await getFavoriteIds(userId);
      setFavorites(favoriteIds);
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
      const newFavoritedState = await toggleFavoriteService(userId, propertyId);
      if (newFavoritedState) {
        setFavorites(prev => [...prev, propertyId]);
      } else {
        setFavorites(prev => prev.filter(id => id !== propertyId));
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

  const getFavedProperties = async () => {
    if (!userId) return [];

    try {
      return await getFavoriteProperties(userId);
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
    getFavoriteProperties: getFavedProperties,
    isFavorite: (propertyId: string) => favorites.includes(propertyId)
  };
};