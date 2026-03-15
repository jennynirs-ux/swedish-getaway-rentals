import { supabase } from '@/integrations/supabase/client';
import type { Property } from '@/hooks/useProperties';

export interface PropertySearchFilters {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  maxGuests?: number;
  amenities?: string[];
  location?: string;
  sortBy?: 'price' | 'rating' | 'newest';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Fetch all active properties with optimized field selection for listing view
 * @returns Promise containing array of active properties
 * @throws Error if query fails
 */
export async function getProperties(): Promise<Property[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id, title, description, location, price_per_night, currency,
        max_guests, bedrooms, bathrooms, hero_image_url, amenities,
        active, review_rating, review_count, property_type,
        special_amenities, featured_amenities, host_id,
        weekly_discount_percentage, monthly_discount_percentage,
        cancellation_policy, preparation_days, latitude, longitude, city
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedData = (data || []).map((item: any) => ({
      ...item,
      amenities: Array.isArray(item.amenities) ? item.amenities : [],
      special_amenities: Array.isArray(item.special_amenities) ? item.special_amenities : [],
      featured_amenities: Array.isArray(item.featured_amenities) ? item.featured_amenities : []
    }));

    return mappedData;
  } catch (error) {
    throw new Error(
      `Failed to fetch properties: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch a single property by ID with light query (basic info)
 * @param id - Property ID
 * @returns Promise containing the property data
 * @throws Error if property not found or query fails
 */
export async function getPropertyById(id: string): Promise<Property> {
  try {
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
        bedrooms,
        bathrooms,
        max_guests,
        amenities,
        hero_image_url,
        tagline_line1,
        tagline_line2,
        review_rating,
        review_count,
        active,
        latitude,
        longitude,
        city
      `)
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Property not found');

    return {
      ...data,
      amenities: Array.isArray(data.amenities) ? data.amenities : []
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch property: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch full property details including heavy data (gallery, video, amenities_data, etc.)
 * Use this for property detail pages that need all data
 * @param id - Property ID
 * @returns Promise containing complete property data
 * @throws Error if query fails
 */
export async function getPropertyFull(id: string): Promise<Partial<Property>> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        gallery_images,
        video_urls,
        amenities_data,
        guidebook_sections,
        special_highlights,
        featured_amenities,
        pricing_table,
        get_in_touch_info,
        footer_quick_links,
        gallery_metadata,
        video_metadata,
        what_makes_special,
        introduction_text,
        availability_text,
        contact_response_time
      `)
      .eq('id', id)
      .eq('active', true)
      .single();

    if (error) throw error;
    if (!data) throw new Error('Property not found');

    return {
      ...data,
      gallery_images: Array.isArray(data.gallery_images) ? data.gallery_images : [],
      video_urls: Array.isArray(data.video_urls) ? data.video_urls : [],
      gallery_metadata: Array.isArray(data.gallery_metadata) ? data.gallery_metadata : [],
      video_metadata: Array.isArray(data.video_metadata) ? data.video_metadata : [],
      amenities_data: Array.isArray(data.amenities_data) ? data.amenities_data : [],
      guidebook_sections: Array.isArray(data.guidebook_sections) ? data.guidebook_sections : [],
      special_highlights: Array.isArray(data.special_highlights) ? data.special_highlights : [],
      featured_amenities: Array.isArray(data.featured_amenities) ? data.featured_amenities : [],
      footer_quick_links: Array.isArray(data.footer_quick_links) ? data.footer_quick_links : []
    };
  } catch (error) {
    throw new Error(
      `Failed to fetch property details: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch property availability for a date range
 * @param propertyId - Property ID
 * @param startDate - Start date (YYYY-MM-DD format, optional)
 * @param endDate - End date (YYYY-MM-DD format, optional)
 * @returns Promise containing availability records
 * @throws Error if query fails
 */
export async function getPropertyAvailability(
  propertyId: string,
  startDate?: string,
  endDate?: string
): Promise<any[]> {
  try {
    let query = supabase
      .from('availability')
      .select('*')
      .eq('property_id', propertyId);

    if (startDate) {
      query = query.gte('date', startDate);
    }
    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query.order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    throw new Error(
      `Failed to fetch availability: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Search properties with filters applied
 * @param filters - Search filters (price, bedrooms, amenities, etc.)
 * @returns Promise containing filtered properties
 * @throws Error if query fails
 */
export async function searchProperties(filters: PropertySearchFilters): Promise<Property[]> {
  try {
    let query = supabase
      .from('properties')
      .select(`
        id, title, description, location, price_per_night, currency,
        max_guests, bedrooms, bathrooms, hero_image_url, amenities,
        active, review_rating, review_count, property_type,
        special_amenities, featured_amenities, host_id
      `)
      .eq('active', true);

    if (filters.minPrice !== undefined) {
      query = query.gte('price_per_night', filters.minPrice);
    }
    if (filters.maxPrice !== undefined) {
      query = query.lte('price_per_night', filters.maxPrice);
    }
    if (filters.bedrooms !== undefined) {
      query = query.gte('bedrooms', filters.bedrooms);
    }
    if (filters.bathrooms !== undefined) {
      query = query.gte('bathrooms', filters.bathrooms);
    }
    if (filters.maxGuests !== undefined) {
      query = query.gte('max_guests', filters.maxGuests);
    }
    if (filters.location) {
      query = query.ilike('location', `%${filters.location}%`);
    }

    const sortColumn = filters.sortBy === 'rating' ? 'review_rating' :
                      filters.sortBy === 'newest' ? 'created_at' : 'price_per_night';
    const sortOrder = filters.sortOrder === 'desc' ? { ascending: false } : { ascending: true };

    const { data, error } = await query.order(sortColumn, sortOrder);

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...item,
      amenities: Array.isArray(item.amenities) ? item.amenities : [],
      special_amenities: Array.isArray(item.special_amenities) ? item.special_amenities : [],
      featured_amenities: Array.isArray(item.featured_amenities) ? item.featured_amenities : []
    }));
  } catch (error) {
    throw new Error(
      `Failed to search properties: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Fetch nearby properties based on coordinates
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @param radiusKm - Search radius in kilometers (optional, default: 50)
 * @returns Promise containing nearby properties
 * @throws Error if query fails
 */
export async function getNearbyProperties(
  latitude: number,
  longitude: number,
  radiusKm: number = 50
): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, hero_image_url, latitude, longitude, location')
      .eq('active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) throw error;

    // Filter by radius using Haversine formula (rough approximation in JS)
    const nearby = (data || []).filter((property: any) => {
      if (!property.latitude || !property.longitude) return false;

      const R = 6371; // Earth's radius in km
      const dLat = ((property.latitude - latitude) * Math.PI) / 180;
      const dLon = ((property.longitude - longitude) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((latitude * Math.PI) / 180) *
          Math.cos((property.latitude * Math.PI) / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      return distance <= radiusKm;
    });

    return nearby;
  } catch (error) {
    throw new Error(
      `Failed to fetch nearby properties: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Resolve legacy property route to actual property ID
 * @param incomingId - Legacy property slug or ID
 * @returns Promise containing resolved property ID
 * @throws Error if property not found
 */
export async function resolvePropertyId(incomingId: string): Promise<string> {
  try {
    if (incomingId === 'villa-hacken') {
      const { data } = await supabase
        .from('properties')
        .select('id')
        .ilike('title', '%villa%')
        .eq('active', true)
        .limit(1)
        .single();
      if (data) return data.id;
    } else if (incomingId === 'lakehouse-getaway') {
      const { data } = await supabase
        .from('properties')
        .select('id')
        .or('title.ilike.%lakehouse%,title.ilike.%lake%')
        .eq('active', true)
        .limit(1)
        .single();
      if (data) return data.id;
    }

    return incomingId;
  } catch (error) {
    throw new Error(
      `Failed to resolve property ID: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
