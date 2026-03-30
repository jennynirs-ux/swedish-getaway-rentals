// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';
import type { Property } from '@/types/property';

export interface AvailabilityRecord {
  id: string;
  property_id: string;
  date: string;
  is_available: boolean;
  price_override?: number;
  [key: string]: unknown;
}

export interface NearbyProperty {
  id: string;
  title: string;
  hero_image_url: string;
  latitude: number | null;
  longitude: number | null;
  location: string;
}

interface PropertyListingRow {
  id: string;
  title: string;
  location: string;
  price_per_night: number;
  currency: string;
  review_rating: number | null;
  review_count: number | null;
  hero_image_url: string;
  amenities: string[] | null;
  property_type: string | null;
  max_guests: number;
  latitude: number | null;
  longitude: number | null;
  created_at: string;
  special_amenities?: string[] | null;
  featured_amenities?: Record<string, unknown>[] | null;
  requires_host_approval?: boolean;
}

interface PropertySearchRow extends PropertyListingRow {
  description: string;
  bedrooms: number;
  bathrooms: number;
  active: boolean;
  host_id: string;
}

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
        id, title, location, price_per_night, currency,
        review_rating, review_count, hero_image_url, amenities,
        property_type, max_guests, latitude, longitude, created_at,
        requires_host_approval
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const mappedData = (data || []).map((item: PropertyListingRow) => ({
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
): Promise<AvailabilityRecord[]> {
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

    return (data || []).map((item: PropertySearchRow) => ({
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
): Promise<NearbyProperty[]> {
  try {
    const { data, error } = await supabase
      .from('properties')
      .select('id, title, hero_image_url, latitude, longitude, location')
      .eq('active', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (error) throw error;

    // Filter by radius using Haversine formula (rough approximation in JS)
    const nearby = (data || []).filter((property: NearbyProperty) => {
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

