import { supabase } from '@/integrations/supabase/client';
import type { Property } from '@/types/property';

export interface UserFavorite {
  user_id: string;
  property_id: string;
  created_at: string;
}

/**
 * Fetch list of favorite property IDs for a user
 * @param userId - User ID
 * @returns Promise containing array of property IDs
 * @throws Error if query fails
 */
export async function getFavoriteIds(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('property_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map(f => f.property_id) || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch favorites: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch full property details for all user favorites
 * @param userId - User ID
 * @returns Promise containing array of favorite properties
 * @throws Error if query fails
 */
export async function getFavoriteProperties(userId: string): Promise<Property[]> {
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
          review_count,
          property_type,
          special_amenities,
          featured_amenities
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data?.map((f: any) => f.properties).filter(Boolean) || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch favorite properties: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Check if a property is in user favorites (private helper)
 */
async function isFavorited(userId: string, propertyId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('property_id', propertyId)
      .single();

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = not found, which is acceptable
      throw error;
    }

    return !!data;
  } catch (error) {
    throw new Error(
      `Failed to check favorite status: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Remove a property from user favorites (private helper)
 */
async function removeFavorite(userId: string, propertyId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', userId)
      .eq('property_id', propertyId);

    if (error) throw error;
  } catch (error) {
    throw new Error(
      `Failed to remove favorite: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Toggle favorite status for a property (using upsert with atomic operation)
 * @param userId - User ID
 * @param propertyId - Property ID
 * @returns Promise containing new favorite state (true if added, false if removed)
 * @throws Error if operation fails
 */
export async function toggleFavorite(userId: string, propertyId: string): Promise<boolean> {
  try {
    // First, check current state
    const isFav = await isFavorited(userId, propertyId);

    if (isFav) {
      // Remove the favorite
      await removeFavorite(userId, propertyId);
      return false;
    } else {
      // Use upsert with onConflict to handle race conditions atomically
      // If it exists, do nothing; if it doesn't, insert it
      const { error } = await supabase
        .from('user_favorites')
        .upsert(
          { user_id: userId, property_id: propertyId, created_at: new Date().toISOString() },
          { onConflict: 'user_id,property_id' }
        );

      if (error) throw error;
      return true;
    }
  } catch (error) {
    throw new Error(
      `Failed to toggle favorite: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
