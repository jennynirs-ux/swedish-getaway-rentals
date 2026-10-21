import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";

export interface Property {
  id: string;
  title: string;
  description: string;
  location: string;
  price_per_night: number;
  /** "16:00:00"; loaded on the property page */
  check_in_time?: string | null;
  check_out_time?: string | null;
  /** Guest service fee in percent (computed field; 5 during the founding-host offer) */
  service_fee_rate?: number | null;
  currency: string;
  bedrooms: number;
  bathrooms: number;
  max_guests: number;
  amenities: string[];
  hero_image_url: string;
  gallery_images: string[];
  gallery_metadata?: { title: string; description: string; alt: string }[];
  video_urls?: string[];
  video_metadata?: { title: string; description: string }[];
  active: boolean;
  host_id: string;
  what_makes_special?: string;
  get_in_touch_info?: any;
  guidebook_sections?: { title: string; content: string; image_url?: string; icon?: string; id?: string; is_prefilled?: boolean; data?: any }[];
  amenities_descriptions?: Record<string, string>;
  amenities_data?: {
    icon: string;
    title: string;
    tagline: string;
    description: string;
    image_url?: string;
    features?: string[];
  }[];
  review_rating?: number;
  review_count?: number;
  tagline_line1?: string;
  tagline_line2?: string;
  availability_text?: string;
  introduction_text?: string;
  special_highlights?: { title: string; description: string; icon?: string }[];
  featured_amenities?: { icon: string; title: string; tagline: string; description: string; image_url?: string; features?: string[] }[];
  pricing_table?: {
    off_season: { price: number; currency: string };
    peak_season: { price: number; currency: string };
    holiday_periods: { price: number; currency: string };
    cleaning_fee: { price: number; currency: string };
    minimum_stay: number;
    weekly_discount: string;
  };
  contact_response_time?: string;
  footer_quick_links?: string[];
  property_type?: string;
  special_amenities?: string[];
  weekly_discount_percentage?: number;
  monthly_discount_percentage?: number;
  cancellation_policy?: "flexible" | "moderate" | "strict";
  preparation_days?: number;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  country?: string | null;
  slug?: string | null;
  /** For the "New" badge on the cards */
  created_at?: string;
}

export const useProperties = () => {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      // Optimized query: select only needed fields for listing view
      const { data, error } = await supabase
        .from('properties')
        .select(`
          id, slug, title, description, location, price_per_night, currency,
          max_guests, bedrooms, bathrooms, hero_image_url, amenities, 
          active, review_rating, review_count, property_type, 
          special_amenities, featured_amenities, host_id, 
          weekly_discount_percentage, monthly_discount_percentage,
          cancellation_policy, preparation_days, latitude, longitude, city,
          created_at
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      // Guest fee per property (5 % on founding hosts' listings)
      const { data: fees } = await supabase.rpc('property_service_fee_rates');
      const feeById = new Map((fees || []).map((f) => [f.property_id, Number(f.service_fee_rate)]));
      const mappedData = (data || []).map((item: any) => ({
        ...item,
        service_fee_rate: feeById.get(item.id) ?? null,
        amenities: Array.isArray(item.amenities) ? item.amenities : [],
        gallery_metadata: Array.isArray(item.gallery_metadata) ? item.gallery_metadata : [],
        special_amenities: Array.isArray(item.special_amenities) ? item.special_amenities : [],
        featured_amenities: Array.isArray(item.featured_amenities) ? item.featured_amenities : []
      }));
      setProperties(mappedData);
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